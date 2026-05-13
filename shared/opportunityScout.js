export const OPPORTUNITY_SEARCH_PROFILE_STATUSES = ["active", "paused", "archived"];

export const OPPORTUNITY_SEARCH_CADENCES = ["manual", "daily", "weekly", "monthly"];

export const FOUND_OPPORTUNITY_STATUSES = [
  "new",
  "reviewing",
  "watching",
  "bidding",
  "skipped",
  "converted_to_lead",
  "archived",
];

const DEFAULT_TRADES = [
  "concrete",
  "fencing",
  "decking",
  "siding",
  "excavation",
  "remodel",
  "gc",
  "landscaping",
  "sitework",
  "exterior repair",
];

function text(value) {
  return String(value || "").trim();
}

function collapseSpaces(value) {
  return text(value).replace(/\s+/g, " ");
}

function normalizeList(value) {
  const entries = Array.isArray(value)
    ? value
    : text(value).split(",");
  return [...new Set(entries.map((entry) => collapseSpaces(entry)).filter(Boolean))];
}

function normalizeOption(value, options, fallback) {
  const candidate = collapseSpaces(value).toLowerCase();
  return options.find((option) => option.toLowerCase() === candidate) || fallback;
}

function normalizeScore(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(100, Math.round(number)));
}

function normalizeNonNegativeNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return 0;
  return Math.round(number);
}

export function normalizeOpportunityScoutDate(value) {
  const candidate = text(value);
  if (!candidate) return "";
  const parsed = new Date(candidate);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString();
}

export function validateOpportunitySearchProfilePayload(payload = {}, { existing = null } = {}) {
  const errors = [];
  const hasName = Object.hasOwn(payload || {}, "name") ? Boolean(collapseSpaces(payload.name)) : Boolean(existing?.name);
  if (!hasName) errors.push("Search profile name is required.");

  const radiusProvided = Object.hasOwn(payload || {}, "radiusMiles");
  if (radiusProvided && Number(payload.radiusMiles) < 0) {
    errors.push("Service radius must be zero or higher.");
  }

  return errors;
}

export function normalizeOpportunitySearchProfilePayload(payload = {}, {
  existing = null,
  id = "",
  changedAt = new Date().toISOString(),
  createdBy = "",
} = {}) {
  const source = existing || {};
  const pick = (key, fallback = "") => (Object.hasOwn(payload || {}, key) ? payload[key] : source[key] ?? fallback);
  const status = normalizeOption(pick("status", "active"), OPPORTUNITY_SEARCH_PROFILE_STATUSES, "active");

  return {
    id: source.id || id,
    companyId: source.companyId || "",
    name: collapseSpaces(pick("name")),
    trades: normalizeList(pick("trades", source.trades?.length ? source.trades : DEFAULT_TRADES)),
    serviceAreas: normalizeList(pick("serviceAreas", source.serviceAreas || [])),
    radiusMiles: normalizeNonNegativeNumber(pick("radiusMiles", source.radiusMiles || 0)),
    sourceTypes: normalizeList(pick("sourceTypes", source.sourceTypes || [])),
    keywords: normalizeList(pick("keywords", source.keywords || [])),
    excludedKeywords: normalizeList(pick("excludedKeywords", source.excludedKeywords || [])),
    cadence: normalizeOption(pick("cadence", "daily"), OPPORTUNITY_SEARCH_CADENCES, "daily"),
    status,
    notes: text(pick("notes")),
    lastRunAt: normalizeOpportunityScoutDate(pick("lastRunAt", source.lastRunAt || "")),
    nextRunAt: normalizeOpportunityScoutDate(pick("nextRunAt", source.nextRunAt || "")),
    createdBy: source.createdBy || createdBy || "",
    createdAt: source.createdAt || changedAt,
    updatedAt: changedAt,
    archivedAt: status === "archived" ? (source.archivedAt || changedAt) : null,
  };
}

export function validateFoundOpportunityPayload(payload = {}, { existing = null } = {}) {
  const errors = [];
  const hasTitle = Object.hasOwn(payload || {}, "title") ? Boolean(collapseSpaces(payload.title)) : Boolean(existing?.title);
  if (!hasTitle) errors.push("Opportunity title is required.");
  return errors;
}

export function normalizeFoundOpportunityPayload(payload = {}, {
  existing = null,
  id = "",
  changedAt = new Date().toISOString(),
  createdBy = "",
} = {}) {
  const source = existing || {};
  const pick = (key, fallback = "") => (Object.hasOwn(payload || {}, key) ? payload[key] : source[key] ?? fallback);
  const status = normalizeOption(pick("status", "new"), FOUND_OPPORTUNITY_STATUSES, "new");

  return {
    id: source.id || id,
    companyId: source.companyId || "",
    searchProfileId: text(pick("searchProfileId")),
    leadSourceId: text(pick("leadSourceId")),
    title: collapseSpaces(pick("title")),
    agency: collapseSpaces(pick("agency")),
    sourceName: collapseSpaces(pick("sourceName")),
    sourceUrl: text(pick("sourceUrl")),
    city: collapseSpaces(pick("city")),
    state: collapseSpaces(pick("state")),
    trade: collapseSpaces(pick("trade")),
    projectType: collapseSpaces(pick("projectType")),
    status,
    fitScore: normalizeScore(pick("fitScore", source.fitScore || 0)),
    urgencyScore: normalizeScore(pick("urgencyScore", source.urgencyScore || 0)),
    distanceScore: normalizeScore(pick("distanceScore", source.distanceScore || 0)),
    tradeMatchScore: normalizeScore(pick("tradeMatchScore", source.tradeMatchScore || 0)),
    bidDueAt: normalizeOpportunityScoutDate(pick("bidDueAt", source.bidDueAt || "")),
    jobWalkAt: normalizeOpportunityScoutDate(pick("jobWalkAt", source.jobWalkAt || "")),
    estimatedValue: normalizeNonNegativeNumber(pick("estimatedValue", source.estimatedValue || 0)),
    contactName: collapseSpaces(pick("contactName")),
    contactEmail: text(pick("contactEmail")).toLowerCase(),
    contactPhone: collapseSpaces(pick("contactPhone")),
    scopeSummary: text(pick("scopeSummary")),
    planUrl: text(pick("planUrl")),
    reasonToBid: text(pick("reasonToBid")),
    reasonToSkip: text(pick("reasonToSkip")),
    riskFlags: normalizeList(pick("riskFlags", source.riskFlags || [])),
    missingInfoItems: normalizeList(pick("missingInfoItems", source.missingInfoItems || [])),
    assignedEstimatorId: text(pick("assignedEstimatorId")),
    notes: text(pick("notes")),
    convertedLeadId: text(pick("convertedLeadId")),
    createdBy: source.createdBy || createdBy || "",
    createdAt: source.createdAt || changedAt,
    updatedAt: changedAt,
    archivedAt: status === "archived" ? (source.archivedAt || changedAt) : null,
  };
}

export function changedOpportunityFields(previous = {}, next = {}, fields = []) {
  return fields.filter((field) => JSON.stringify(previous[field] ?? "") !== JSON.stringify(next[field] ?? ""));
}
