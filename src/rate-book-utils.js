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

export const RATE_BOOK_COST_LIBRARY_REQUIRED_CATEGORIES = [
  "labor",
  "material",
  "equipment",
  "subcontractor",
];

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

export function buildJobCostingReviewLineFromRateBookItem(item = {}, quantity = 1) {
  const normalizedQuantity = numberValue(quantity, 1) || 1;
  const unitCost = numberValue(item.unitCost, 0);
  const markupPercent = numberValue(item.markupPercent, 0);
  const unitPrice = calculateRateBookUnitPrice(item);

  return {
    sourceRateBookItemId: textValue(item.id),
    category: normalizeRateBookCategory(item.category),
    trade: textValue(item.trade),
    description: textValue(item.description) || textValue(item.title),
    quantity: normalizedQuantity,
    unit: textValue(item.unit) || "ea",
    unitCost,
    markupPercent,
    unitPrice,
    estimatedCost: roundCurrency(unitCost * normalizedQuantity),
    estimatedSell: roundCurrency(unitPrice * normalizedQuantity),
    internalOnly: true,
  };
}

export function deriveRateBookCostLibraryCoverage(items = []) {
  const state = deriveRateBookState(items);
  const categoryCoverage = Object.fromEntries(RATE_BOOK_COST_LIBRARY_REQUIRED_CATEGORIES.map((category) => {
    const rows = state.byCategory[category] || [];
    return [category, {
      count: rows.length,
      hasCost: rows.some((item) => numberValue(item.unitCost, 0) > 0),
      hasMarkup: rows.some((item) => numberValue(item.markupPercent, 0) > 0 || numberValue(item.unitPrice, 0) > numberValue(item.unitCost, 0)),
    }];
  }));
  const missingCategories = RATE_BOOK_COST_LIBRARY_REQUIRED_CATEGORIES.filter((category) => categoryCoverage[category].count === 0);
  const missingCostDefaults = RATE_BOOK_COST_LIBRARY_REQUIRED_CATEGORIES.filter((category) => !categoryCoverage[category].hasCost);

  return {
    ready: missingCategories.length === 0 && missingCostDefaults.length === 0,
    requiredCategories: RATE_BOOK_COST_LIBRARY_REQUIRED_CATEGORIES,
    missingCategories,
    missingCostDefaults,
    categoryCoverage,
    activeCount: state.counts.active,
  };
}
