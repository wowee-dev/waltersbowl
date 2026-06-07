export const DIETARY_OPTIONS = [
  { value: "vegetarian", label: "Vegetarian", short: "V" },
  { value: "vegan", label: "Vegan", short: "VG" },
  { value: "gluten-free", label: "Gluten-Free", short: "GF" },
  { value: "dairy-free", label: "Dairy-Free", short: "DF" },
];

export const SECTION_ORDER = [
  "small-bites",
  "big-bites",
  "sweet-treat",
  "sipping",
];

const TOKEN_KEY = "dinner-menu-token";
const EXPIRES_KEY = "dinner-menu-token-exp";

export function dietaryLabel(value) {
  const match = DIETARY_OPTIONS.find((option) => option.value === value);
  return match ? match.label : value;
}

export function dietaryShort(value) {
  const match = DIETARY_OPTIONS.find((option) => option.value === value);
  return match ? match.short : value;
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function renderDietaryBadges(dietary) {
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

export function getStoredToken() {
  const token = sessionStorage.getItem(TOKEN_KEY);
  const expiresAt = Number(sessionStorage.getItem(EXPIRES_KEY) || 0);
  if (!token || !expiresAt || Date.now() > expiresAt) {
    clearStoredToken();
    return null;
  }
  return token;
}

export function storeToken(token, expiresAt) {
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(EXPIRES_KEY, String(expiresAt));
}

export function clearStoredToken() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(EXPIRES_KEY);
}

export async function fetchMenu() {
  const response = await fetch("/api/menu");
  if (!response.ok) {
    throw new Error("Unable to load menu.");
  }
  return response.json();
}

export async function saveMenu(menu, token) {
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

export async function login(password) {
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

export function createEmptyItem() {
  return {
    id: crypto.randomUUID(),
    name: "",
    description: "",
    dietary: [],
    note: "",
  };
}

export function formatSavedTime(isoString) {
  return new Date(isoString).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}
