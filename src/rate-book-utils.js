export const RATE_BOOK_CATEGORIES = [
  "labor",
  "material",
  "equipment",
  "subcontractor",
  "other",
];

export const RATE_BOOK_CATEGORY_LABELS = {
  labor: "Labor",
  material: "Material",
  equipment: "Equipment",
  subcontractor: "Subcontractor",
  other: "Other",
};

function roundCurrency(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function textValue(value) {
  return String(value ?? "").trim();
}

function numberValue(value, fallback = 0) {
  if (value == null || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export function normalizeRateBookCategory(value) {
  const normalized = textValue(value).toLowerCase();
  return RATE_BOOK_CATEGORIES.includes(normalized) ? normalized : "other";
}

export function calculateRateBookUnitPrice({ unitCost = 0, markupPercent = 0, unitPrice = null } = {}) {
  if (unitPrice != null && unitPrice !== "") {
    return roundCurrency(numberValue(unitPrice, 0));
  }
  const cost = numberValue(unitCost, 0);
  const markup = numberValue(markupPercent, 0);
  return roundCurrency(cost * (1 + markup / 100));
}

export function createRateBookDraft(item = {}) {
  const unitCost = item.unitCost ?? "";
  const markupPercent = item.markupPercent ?? "";
  const unitPrice = item.unitPrice ?? calculateRateBookUnitPrice({ unitCost, markupPercent });

  return {
    id: item.id || "",
    category: normalizeRateBookCategory(item.category),
    trade: item.trade || "",
    title: item.title || "",
    description: item.description || "",
    unit: item.unit || "ea",
    unitCost,
    markupPercent,
    unitPrice,
    taxable: item.taxable !== false,
    status: item.status || "active",
  };
}

export function normalizeRateBookDraft(draft = {}) {
  return {
    category: normalizeRateBookCategory(draft.category),
    trade: textValue(draft.trade),
    title: textValue(draft.title),
    description: textValue(draft.description),
    unit: textValue(draft.unit) || "ea",
    unitCost: numberValue(draft.unitCost, 0),
    markupPercent: numberValue(draft.markupPercent, 0),
    unitPrice: calculateRateBookUnitPrice(draft),
    taxable: draft.taxable !== false,
    status: draft.status === "archived" ? "archived" : "active",
  };
}

export function validateRateBookDraft(draft = {}) {
  const normalized = normalizeRateBookDraft(draft);
  const errors = [];
  if (!normalized.title) errors.push("Title is required.");
  if (!normalized.unit) errors.push("Unit is required.");
  if (normalized.unitPrice < 0) errors.push("Unit price must be zero or greater.");
  return { ok: errors.length === 0, errors, normalized };
}

export function deriveRateBookState(items = []) {
  const rows = (Array.isArray(items) ? items : []).filter(Boolean);
  const activeItems = rows.filter((item) => !item.archivedAt && item.status !== "archived");
  const byCategory = Object.fromEntries(RATE_BOOK_CATEGORIES.map((category) => [
    category,
    activeItems.filter((item) => normalizeRateBookCategory(item.category) === category),
  ]));

  return {
    rows,
    activeItems,
    archivedItems: rows.filter((item) => item.archivedAt || item.status === "archived"),
    byCategory,
    counts: {
      total: rows.length,
      active: activeItems.length,
      labor: byCategory.labor.length,
      material: byCategory.material.length,
      equipment: byCategory.equipment.length,
      subcontractor: byCategory.subcontractor.length,
    },
  };
}

export function buildEstimateLineItemFromRateBookItem(item = {}) {
  return {
    description: textValue(item.description) || textValue(item.title),
    quantity: 1,
    unit: textValue(item.unit) || "ea",
    unitPrice: calculateRateBookUnitPrice(item),
  };
}
