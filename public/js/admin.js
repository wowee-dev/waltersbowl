import {
  clearStoredToken,
  createEmptyItem,
  DIETARY_OPTIONS,
  fetchMenu,
  formatSavedTime,
  getStoredToken,
  login,
  saveMenu,
  storeToken,
} from "./shared.js";

const loginPanel = document.getElementById("login-panel");
const editorPanel = document.getElementById("editor-panel");
const loginForm = document.getElementById("login-form");
const loginMessage = document.getElementById("login-message");
const logoutButton = document.getElementById("logout-button");
const saveButton = document.getElementById("save-button");
const saveStatus = document.getElementById("save-status");
const sectionTabs = document.getElementById("section-tabs");
const sectionPanels = document.getElementById("section-panels");

const metaFields = {
  title: document.getElementById("meta-title"),
  hostName: document.getElementById("meta-host"),
  date: document.getElementById("meta-date"),
  welcomeMessage: document.getElementById("meta-welcome"),
};

let menuState = null;
let activeSectionId = "small-bites";
let dragSourceIndex = null;

function showLogin(message = "") {
  editorPanel.hidden = true;
  loginPanel.hidden = false;
  loginMessage.hidden = !message;
  loginMessage.textContent = message;
}

function showEditor() {
  loginPanel.hidden = true;
  editorPanel.hidden = false;
}

function setSaveStatus(message, isError = false) {
  saveStatus.textContent = message;
  saveStatus.classList.toggle("is-error", isError);
}

function buildMenuFromForm() {
  return {
    meta: {
      title: metaFields.title.value,
      hostName: metaFields.hostName.value,
      date: metaFields.date.value,
      welcomeMessage: metaFields.welcomeMessage.value,
    },
    sections: menuState.sections.map((section) => ({
      id: section.id,
      label: section.label,
      items: section.items.map((item) => ({ ...item })),
    })),
  };
}

function renderDietaryCheckboxes(item, sectionId, itemIndex) {
  return DIETARY_OPTIONS.map((option) => {
    const checked = item.dietary.includes(option.value) ? "checked" : "";
    return `
      <label class="dietary-option">
        <input
          type="checkbox"
          data-section="${sectionId}"
          data-index="${itemIndex}"
          data-dietary="${option.value}"
          ${checked}
        />
        ${option.label}
      </label>
    `;
  }).join("");
}

function renderItemRow(sectionId, item, index) {
  return `
    <li
      class="item-row"
      draggable="true"
      data-section="${sectionId}"
      data-index="${index}"
    >
      <div class="item-row-toolbar">
        <button type="button" class="drag-handle" aria-label="Drag to reorder">⋮⋮</button>
        <button
          type="button"
          class="delete-item"
          data-section="${sectionId}"
          data-index="${index}"
        >
          Delete
        </button>
      </div>
      <label>
        Name
        <input
          type="text"
          data-field="name"
          data-section="${sectionId}"
          data-index="${index}"
          value="${escapeAttribute(item.name)}"
          required
        />
      </label>
      <label>
        Description
        <input
          type="text"
          data-field="description"
          data-section="${sectionId}"
          data-index="${index}"
          value="${escapeAttribute(item.description)}"
        />
      </label>
      <fieldset class="dietary-fieldset">
        <legend>Dietary tags</legend>
        <div class="dietary-options">${renderDietaryCheckboxes(item, sectionId, index)}</div>
      </fieldset>
      <label>
        Note <span class="label-hint">(optional, visible to guests)</span>
        <textarea
          data-field="note"
          data-section="${sectionId}"
          data-index="${index}"
          rows="2"
        >${escapeHtml(item.note)}</textarea>
      </label>
    </li>
  `;
}

function escapeAttribute(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function renderSectionPanel(section) {
  const itemsMarkup = section.items.length
    ? `<ul class="item-list">${section.items
        .map((item, index) => renderItemRow(section.id, item, index))
        .join("")}</ul>`
    : `<p class="empty-section">No items yet. Add your first dish or drink.</p>`;

  return `
    <section
      class="section-panel"
      id="panel-${section.id}"
      role="tabpanel"
      aria-labelledby="tab-${section.id}"
      ${section.id === activeSectionId ? "" : "hidden"}
    >
      <div class="section-panel-header">
        <h2>${section.label}</h2>
        <button type="button" class="button-secondary add-item" data-section="${section.id}">
          Add item
        </button>
      </div>
      ${itemsMarkup}
    </section>
  `;
}

function renderTabsAndPanels() {
  sectionTabs.innerHTML = menuState.sections
    .map(
      (section) => `
        <button
          type="button"
          class="section-tab ${section.id === activeSectionId ? "is-active" : ""}"
          id="tab-${section.id}"
          role="tab"
          aria-selected="${section.id === activeSectionId}"
          aria-controls="panel-${section.id}"
          data-section="${section.id}"
        >
          ${section.label}
        </button>
      `
    )
    .join("");

  sectionPanels.innerHTML = menuState.sections.map(renderSectionPanel).join("");
  bindPanelEvents();
}

function populateMetaFields() {
  metaFields.title.value = menuState.meta.title;
  metaFields.hostName.value = menuState.meta.hostName;
  metaFields.date.value = menuState.meta.date;
  metaFields.welcomeMessage.value = menuState.meta.welcomeMessage || "";
}

function getSection(sectionId) {
  return menuState.sections.find((section) => section.id === sectionId);
}

function syncFormToState() {
  menuState.meta = {
    title: metaFields.title.value,
    hostName: metaFields.hostName.value,
    date: metaFields.date.value,
    welcomeMessage: metaFields.welcomeMessage.value,
  };

  sectionPanels.querySelectorAll("[data-field]").forEach((input) => {
    const sectionId = input.dataset.section;
    const index = Number(input.dataset.index);
    const field = input.dataset.field;
    const section = getSection(sectionId);
    if (!section || !section.items[index]) {
      return;
    }
    section.items[index][field] = input.value;
  });

  sectionPanels.querySelectorAll('input[type="checkbox"][data-dietary]').forEach((checkbox) => {
    const sectionId = checkbox.dataset.section;
    const index = Number(checkbox.dataset.index);
    const tag = checkbox.dataset.dietary;
    const section = getSection(sectionId);
    const item = section?.items[index];
    if (!item) {
      return;
    }

    if (checkbox.checked && !item.dietary.includes(tag)) {
      item.dietary.push(tag);
    }
    if (!checkbox.checked) {
      item.dietary = item.dietary.filter((value) => value !== tag);
    }
  });
}

function bindPanelEvents() {
  sectionTabs.querySelectorAll(".section-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      syncFormToState();
      activeSectionId = tab.dataset.section;
      renderTabsAndPanels();
    });
  });

  sectionPanels.querySelectorAll(".add-item").forEach((button) => {
    button.addEventListener("click", () => {
      syncFormToState();
      const section = getSection(button.dataset.section);
      section.items.push(createEmptyItem());
      renderTabsAndPanels();
    });
  });

  sectionPanels.querySelectorAll(".delete-item").forEach((button) => {
    button.addEventListener("click", () => {
      syncFormToState();
      const section = getSection(button.dataset.section);
      const index = Number(button.dataset.index);
      const item = section.items[index];
      const label = item.name || "this item";
      if (!window.confirm(`Delete ${label}?`)) {
        return;
      }
      section.items.splice(index, 1);
      renderTabsAndPanels();
    });
  });

  sectionPanels.querySelectorAll(".item-row").forEach((row) => {
    row.addEventListener("dragstart", (event) => {
      dragSourceIndex = Number(row.dataset.index);
      row.classList.add("is-dragging");
      event.dataTransfer.effectAllowed = "move";
    });

    row.addEventListener("dragend", () => {
      dragSourceIndex = null;
      row.classList.remove("is-dragging");
      sectionPanels.querySelectorAll(".item-row").forEach((itemRow) => {
        itemRow.classList.remove("is-drop-target");
      });
    });

    row.addEventListener("dragover", (event) => {
      event.preventDefault();
      row.classList.add("is-drop-target");
    });

    row.addEventListener("dragleave", () => {
      row.classList.remove("is-drop-target");
    });

    row.addEventListener("drop", (event) => {
      event.preventDefault();
      row.classList.remove("is-drop-target");
      if (dragSourceIndex === null) {
        return;
      }

      syncFormToState();
      const sectionId = row.dataset.section;
      const targetIndex = Number(row.dataset.index);
      const section = getSection(sectionId);
      const [moved] = section.items.splice(dragSourceIndex, 1);
      section.items.splice(targetIndex, 0, moved);
      dragSourceIndex = null;
      renderTabsAndPanels();
    });
  });
}

async function loadMenu() {
  menuState = await fetchMenu();
  populateMetaFields();
  renderTabsAndPanels();
  setSaveStatus("Loaded. Remember to save your changes.");
}

async function handleSave() {
  syncFormToState();
  const token = getStoredToken();
  if (!token) {
    showLogin("Your session expired. Please sign in again.");
    return;
  }

  saveButton.disabled = true;
  setSaveStatus("Saving…");

  try {
    const payload = await saveMenu(buildMenuFromForm(), token);
    setSaveStatus(`Saved at ${formatSavedTime(payload.updatedAt)}`);
  } catch (error) {
    setSaveStatus(error.message, true);
  } finally {
    saveButton.disabled = false;
  }
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginMessage.hidden = true;
  const password = loginForm.password.value;

  try {
    const { token, expiresAt } = await login(password);
    storeToken(token, expiresAt);
  } catch (error) {
    loginMessage.hidden = false;
    loginMessage.textContent = error.message;
    return;
  }

  showEditor();
  try {
    await loadMenu();
  } catch (error) {
    setSaveStatus(error.message, true);
  }
});

logoutButton.addEventListener("click", () => {
  clearStoredToken();
  menuState = null;
  loginForm.reset();
  showLogin();
});

saveButton.addEventListener("click", handleSave);

async function init() {
  const token = getStoredToken();
  if (!token) {
    showLogin();
    return;
  }

  showEditor();
  try {
    await loadMenu();
  } catch (error) {
    clearStoredToken();
    showLogin(error.message);
  }
}

init();
