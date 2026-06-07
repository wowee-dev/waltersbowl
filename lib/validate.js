import {
  DIETARY_OPTIONS,
  MAX_LENGTHS,
  SECTION_IDS,
  SECTION_LABELS,
} from "./constants.js";

function isNonEmptyString(value, maxLength) {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maxLength;
}

function isOptionalString(value, maxLength) {
  return value === undefined || value === null || (typeof value === "string" && value.length <= maxLength);
}

const allowedDietary = new Set(DIETARY_OPTIONS.map((option) => option.value));

export function validateMenu(menu) {
  const errors = [];

  if (!menu || typeof menu !== "object") {
    return { ok: false, errors: ["Menu must be an object."] };
  }

  if (!menu.meta || typeof menu.meta !== "object") {
    errors.push("Missing meta object.");
  } else {
    if (!isNonEmptyString(menu.meta.title, MAX_LENGTHS.title)) {
      errors.push("meta.title is required and must be under 120 characters.");
    }
    if (!isNonEmptyString(menu.meta.hostName, MAX_LENGTHS.hostName)) {
      errors.push("meta.hostName is required and must be under 80 characters.");
    }
    if (!isNonEmptyString(menu.meta.date, MAX_LENGTHS.date)) {
      errors.push("meta.date is required and must be under 80 characters.");
    }
    if (!isOptionalString(menu.meta.welcomeMessage, MAX_LENGTHS.welcomeMessage)) {
      errors.push("meta.welcomeMessage must be under 500 characters.");
    }
  }

  if (!Array.isArray(menu.sections)) {
    errors.push("sections must be an array.");
    return { ok: false, errors };
  }

  if (menu.sections.length !== SECTION_IDS.length) {
    errors.push("sections must contain exactly four sections.");
  }

  const seenIds = new Set();

  menu.sections.forEach((section, sectionIndex) => {
    if (!section || typeof section !== "object") {
      errors.push(`Section ${sectionIndex + 1} must be an object.`);
      return;
    }

    if (!SECTION_IDS.includes(section.id)) {
      errors.push(`Section ${sectionIndex + 1} has an invalid id.`);
    }

    if (seenIds.has(section.id)) {
      errors.push(`Duplicate section id: ${section.id}`);
    }
    seenIds.add(section.id);

    if (section.label !== SECTION_LABELS[section.id]) {
      errors.push(`Section ${section.id} has an invalid label.`);
    }

    if (!Array.isArray(section.items)) {
      errors.push(`Section ${section.id} items must be an array.`);
      return;
    }

    section.items.forEach((item, itemIndex) => {
      if (!item || typeof item !== "object") {
        errors.push(`Item ${itemIndex + 1} in ${section.id} must be an object.`);
        return;
      }

      if (!isNonEmptyString(item.id, 80)) {
        errors.push(`Item ${itemIndex + 1} in ${section.id} needs a valid id.`);
      }

      if (!isNonEmptyString(item.name, MAX_LENGTHS.name)) {
        errors.push(`Item ${itemIndex + 1} in ${section.id} needs a name.`);
      }

      if (!isOptionalString(item.description, MAX_LENGTHS.description)) {
        errors.push(`Item ${itemIndex + 1} in ${section.id} description is too long.`);
      }

      if (!isOptionalString(item.note, MAX_LENGTHS.note)) {
        errors.push(`Item ${itemIndex + 1} in ${section.id} note is too long.`);
      }

      if (!Array.isArray(item.dietary)) {
        errors.push(`Item ${itemIndex + 1} in ${section.id} dietary must be an array.`);
      } else {
        item.dietary.forEach((tag) => {
          if (!allowedDietary.has(tag)) {
            errors.push(`Item ${itemIndex + 1} in ${section.id} has invalid dietary tag: ${tag}`);
          }
        });
      }
    });
  });

  SECTION_IDS.forEach((id) => {
    if (!seenIds.has(id)) {
      errors.push(`Missing required section: ${id}`);
    }
  });

  return { ok: errors.length === 0, errors };
}

export function normalizeMenu(menu) {
  return {
    meta: {
      title: menu.meta.title.trim(),
      hostName: menu.meta.hostName.trim(),
      date: menu.meta.date.trim(),
      welcomeMessage: (menu.meta.welcomeMessage || "").trim(),
    },
    sections: SECTION_IDS.map((id) => {
      const section = menu.sections.find((entry) => entry.id === id);
      return {
        id,
        label: SECTION_LABELS[id],
        items: (section?.items || []).map((item) => ({
          id: item.id.trim(),
          name: item.name.trim(),
          description: (item.description || "").trim(),
          dietary: [...new Set(item.dietary || [])],
          note: (item.note || "").trim(),
        })),
      };
    }),
  };
}
