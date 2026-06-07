import {
  escapeHtml,
  fetchMenu,
  renderDietaryBadges,
} from "./shared.js";

const titleEl = document.getElementById("menu-title");
const dateEl = document.getElementById("menu-date");
const welcomeEl = document.getElementById("menu-welcome");
const sectionsEl = document.getElementById("menu-sections");
const fallbackEl = document.getElementById("menu-fallback");
const heroEl = document.getElementById("hero");

function renderItem(item) {
  const noteMarkup = item.note
    ? `<p class="item-note">${escapeHtml(item.note)}</p>`
    : "";

  return `
    <article class="menu-item">
      <div class="item-heading">
        <h3 class="item-name">${escapeHtml(item.name)}</h3>
        <div class="item-badges">${renderDietaryBadges(item.dietary)}</div>
      </div>
      ${
        item.description
          ? `<p class="item-description">${escapeHtml(item.description)}</p>`
          : ""
      }
      ${noteMarkup}
    </article>
  `;
}

function renderSection(section) {
  const itemsMarkup = section.items.length
    ? section.items.map(renderItem).join("")
    : `<p class="section-empty">Details coming soon.</p>`;

  return `
    <section class="menu-section">
      <div class="section-header">
        <h2>${escapeHtml(section.label)}</h2>
        <span class="section-rule" aria-hidden="true"></span>
      </div>
      <div class="section-items">${itemsMarkup}</div>
    </section>
  `;
}

function renderMenu(menu) {
  titleEl.textContent = menu.meta.title;
  dateEl.textContent = `${menu.meta.date} · hosted by ${menu.meta.hostName}`;
  welcomeEl.textContent = menu.meta.welcomeMessage || "";
  welcomeEl.hidden = !menu.meta.welcomeMessage;
  sectionsEl.innerHTML = menu.sections.map(renderSection).join("");
}

function showFallback() {
  heroEl.hidden = true;
  sectionsEl.hidden = true;
  fallbackEl.hidden = false;
}

async function init() {
  try {
    const menu = await fetchMenu();
    renderMenu(menu);
  } catch {
    showFallback();
  }
}

init();
