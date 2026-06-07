(function () {
  const DIETARY_OPTIONS = [
    { value: "vegetarian", label: "Vegetarian", short: "V" },
    { value: "vegan", label: "Vegan", short: "VG" },
    { value: "gluten-free", label: "Gluten-Free", short: "GF" },
    { value: "dairy-free", label: "Dairy-Free", short: "DF" },
  ];

  const SECTION_ORDER = [
    "small-bites",
    "big-bites",
    "sweet-treat",
    "sipping",
  ];

  const TOKEN_KEY = "dinner-menu-token";
  const EXPIRES_KEY = "dinner-menu-token-exp";

  function dietaryLabel(value) {
    const match = DIETARY_OPTIONS.find((option) => option.value === value);
    return match ? match.label : value;
  }

  function dietaryShort(value) {
    const match = DIETARY_OPTIONS.find((option) => option.value === value);
    return match ? match.short : value;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function renderDietaryBadges(dietary) {
    if (!Array.isArray(dietary) || dietary.length === 0) {
      return "";
    }

    return dietary
      .map(
        (tag) =>
          `<span class="dietary-badge" title="${escapeHtml(dietaryLabel(tag))}">${escapeHtml(
            dietaryShort(tag)
          )}</span>`
      )
      .join("");
  }

  function getStoredToken() {
    const token = sessionStorage.getItem(TOKEN_KEY);
    const expiresAt = Number(sessionStorage.getItem(EXPIRES_KEY) || 0);
    if (!token || !expiresAt || Date.now() > expiresAt) {
      clearStoredToken();
      return null;
    }
    return token;
  }

  function storeToken(token, expiresAt) {
    sessionStorage.setItem(TOKEN_KEY, token);
    sessionStorage.setItem(EXPIRES_KEY, String(expiresAt));
  }

  function clearStoredToken() {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(EXPIRES_KEY);
  }

  async function fetchMenu() {
    const response = await fetch("/api/menu");
    if (!response.ok) {
      throw new Error("Unable to load menu.");
    }
    return response.json();
  }

  async function saveMenu(menu, token) {
    const response = await fetch("/api/menu", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(menu),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = payload.details?.join(" ") || payload.error || "Unable to save menu.";
      throw new Error(detail);
    }

    return payload;
  }

  async function login(password) {
    const response = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || "Login failed.");
    }

    return payload;
  }

  function createEmptyItem() {
    return {
      id: crypto.randomUUID(),
      name: "",
      description: "",
      dietary: [],
      note: "",
    };
  }

  function formatSavedTime(isoString) {
    return new Date(isoString).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  window.MenuShared = {
    DIETARY_OPTIONS,
    SECTION_ORDER,
    dietaryLabel,
    dietaryShort,
    escapeHtml,
    renderDietaryBadges,
    getStoredToken,
    storeToken,
    clearStoredToken,
    fetchMenu,
    saveMenu,
    login,
    createEmptyItem,
    formatSavedTime,
  };
})();
