const TEXT_LIMIT = 600;
const TITLE_LIMIT = 120;
const SHORT_LIMIT = 80;
const LIST_LIMIT = 8;
const MEMORY_LIMIT = 80;

const STATUS_VALUES = new Set(["suggested", "approved", "archived"]);
const CATEGORY_VALUES = new Set([
  "trade-defaults",
  "estimate-style",
  "proposal-language",
  "schedule",
  "crew",
  "proof",
  "closeout",
  "safety",
  "lead-qualification",
  "general",
]);

const SECRET_PATTERNS = [
  /\b(password|passcode|api[_ -]?key|secret[a-z0-9_-]*|token|bearer|cookie|session|mfa|captcha|paywall|portal credential|login)\b/gi,
  /\bsk-[a-z0-9_-]{12,}\b/gi,
];

const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;

function rawText(value = "", limit = TEXT_LIMIT) {
  return String(value ?? "").replace(/\s+\n/g, "\n").replace(/\s+/g, " ").trim().slice(0, limit);
}

export function redactAgentLearningText(value = "", limit = TEXT_LIMIT) {
  let next = rawText(value, limit);
  next = next.replace(EMAIL_PATTERN, "[REDACTED]");
  for (const pattern of SECRET_PATTERNS) {
    next = next.replace(pattern, "[REDACTED]");
  }
  return next.slice(0, limit);
}

export function detectAgentLearningSafetyIssues(value = "") {
  const raw = rawText(value, 3000);
  const issues = [];
  if (!raw) return issues;
  if (EMAIL_PATTERN.test(raw)) issues.push("Learning memory cannot store customer email addresses.");
  EMAIL_PATTERN.lastIndex = 0;
  if (SECRET_PATTERNS.some((pattern) => pattern.test(raw))) {
    issues.push("Learning memory cannot store passwords, tokens, MFA, CAPTCHA, paywall, login, or portal credential instructions.");
  }
  return [...new Set(issues)];
}

function parsePreferenceList(value) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeList(value = []) {
  return (Array.isArray(value) ? value : String(value ?? "").split(","))
    .map((entry) => redactAgentLearningText(entry, SHORT_LIMIT))
    .filter(Boolean)
    .slice(0, LIST_LIMIT);
}

function normalizeStatus(value = "suggested") {
  const normalized = rawText(value, 40).toLowerCase();
  return STATUS_VALUES.has(normalized) ? normalized : "suggested";
}

function normalizeCategory(value = "general") {
  const normalized = rawText(value, 60).toLowerCase();
  return CATEGORY_VALUES.has(normalized) ? normalized : "general";
}

export function normalizeAgentLearningPreference(input = {}, { existing = {}, id = "", now = new Date().toISOString() } = {}) {
  const title = redactAgentLearningText(input.title ?? existing.title ?? "", TITLE_LIMIT);
  const preference = redactAgentLearningText(input.preference ?? existing.preference ?? "", TEXT_LIMIT);
  const sourceNote = redactAgentLearningText(input.sourceNote ?? existing.sourceNote ?? "", 240);
  const combinedRaw = [
    input.title,
    input.preference,
    input.sourceNote,
    ...(Array.isArray(input.appliesTo) ? input.appliesTo : []),
  ].filter(Boolean).join(" ");
  const blockedReasons = detectAgentLearningSafetyIssues(combinedRaw);

  return {
    id: rawText(existing.id || input.id || id, 80),
    category: normalizeCategory(input.category ?? existing.category),
    title,
    preference,
    appliesTo: normalizeList(input.appliesTo ?? existing.appliesTo ?? []),
    sourceType: rawText(input.sourceType ?? existing.sourceType ?? "manual", SHORT_LIMIT) || "manual",
    sourceEntityType: rawText(input.sourceEntityType ?? existing.sourceEntityType ?? "", SHORT_LIMIT),
    sourceEntityId: rawText(input.sourceEntityId ?? existing.sourceEntityId ?? "", SHORT_LIMIT),
    sourceNote,
    status: normalizeStatus(input.status ?? existing.status),
    confidence: Math.max(0, Math.min(100, Number(input.confidence ?? existing.confidence ?? 50) || 0)),
    createdBy: rawText(existing.createdBy || input.createdBy || "", SHORT_LIMIT),
    createdAt: rawText(existing.createdAt || input.createdAt || now, SHORT_LIMIT),
    approvedBy: rawText(input.approvedBy ?? existing.approvedBy ?? "", SHORT_LIMIT),
    approvedAt: rawText(input.approvedAt ?? existing.approvedAt ?? "", SHORT_LIMIT),
    archivedAt: rawText(input.archivedAt ?? existing.archivedAt ?? "", SHORT_LIMIT),
    updatedAt: now,
    blockedReasons,
  };
}

export function normalizeAgentLearningPreferences(value = []) {
  return parsePreferenceList(value)
    .map((entry) => normalizeAgentLearningPreference(entry))
    .filter((entry) => entry.id && entry.title && entry.preference)
    .slice(0, MEMORY_LIMIT);
}

export function buildAgentLearningContext(value = []) {
  return normalizeAgentLearningPreferences(value)
    .filter((entry) => entry.status === "approved")
    .map((entry) => ({
      category: entry.category,
      title: entry.title,
      preference: entry.preference,
      appliesTo: entry.appliesTo,
      confidence: entry.confidence,
    }))
    .slice(0, 12);
}

export function summarizeAgentLearningPreferences(value = []) {
  const preferences = normalizeAgentLearningPreferences(value);
  return {
    total: preferences.length,
    approved: preferences.filter((entry) => entry.status === "approved").length,
    suggested: preferences.filter((entry) => entry.status === "suggested").length,
    archived: preferences.filter((entry) => entry.status === "archived").length,
  };
}

function normalizeComparableText(value = "") {
  return rawText(value, 240).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function estimateText(estimate = {}) {
  return [
    estimate.title,
    estimate.scopeSummary,
    estimate.customerNotes,
    estimate.proposalSummary,
    estimate.projectType,
    ...(Array.isArray(estimate.items) ? estimate.items.map((item) => item.description) : []),
    ...(Array.isArray(estimate.estimateItems) ? estimate.estimateItems.map((item) => item.description) : []),
  ].filter(Boolean).join(" ");
}

function inferTradeTags(estimate = {}) {
  const textValue = normalizeComparableText(estimateText(estimate));
  const tags = [];
  if (/\bfence|fencing|gate|post|picket|cedar|chain link|vinyl\b/.test(textValue)) tags.push("fence");
  if (/\bconcrete|slab|driveway|patio|broom|stamped|aggregate|pour|forms?\b/.test(textValue)) tags.push("concrete");
  if (/\bdeck|framing|roof|siding|remodel|drywall|flooring|paint|plumb|electrical\b/.test(textValue)) tags.push("general construction");
  return tags.length ? tags : ["construction"];
}

function estimateLineDescriptions(estimate = {}) {
  const rows = [
    ...(Array.isArray(estimate.items) ? estimate.items : []),
    ...(Array.isArray(estimate.estimateItems) ? estimate.estimateItems : []),
  ];
  return rows
    .map((item) => rawText(item.description || item.name || item.label, 72))
    .filter(Boolean)
    .slice(0, 5);
}

function estimateProposalText(estimate = {}) {
  const source = rawText(estimate.proposalSummary || estimate.customerNotes || estimate.scopeSummary, 360);
  if (!source) return "";
  return source.split(/(?<=[.!?])\s+/).slice(0, 2).join(" ").slice(0, 260);
}

function isReviewedEstimate(estimate = {}) {
  const status = rawText(estimate.status, 40).toLowerCase();
  return !estimate.archivedAt && ["approved", "sent"].includes(status);
}

function suggestionKey(entry = {}) {
  return [
    normalizeComparableText(entry.category),
    normalizeComparableText(entry.title),
    normalizeComparableText(entry.preference),
  ].join("|");
}

export function buildAgentLearningSuggestionsFromEstimates(estimates = [], existingPreferences = [], { now = new Date().toISOString() } = {}) {
  const existingKeys = new Set(normalizeAgentLearningPreferences(existingPreferences).map(suggestionKey));
  const reviewed = (Array.isArray(estimates) ? estimates : [])
    .filter(isReviewedEstimate)
    .slice(0, 20);
  const candidates = [];

  for (const estimate of reviewed) {
    const tags = inferTradeTags(estimate);
    const primaryTrade = tags[0] || "construction";
    const lineDescriptions = estimateLineDescriptions(estimate);
    if (lineDescriptions.length >= 2) {
      candidates.push({
        category: "estimate-style",
        title: `${primaryTrade[0].toUpperCase()}${primaryTrade.slice(1)} estimate structure`,
        preference: `For ${primaryTrade} estimates, use this reviewed structure as a starting point: ${lineDescriptions.join("; ")}. Keep prices and final scope human-reviewed.`,
        appliesTo: tags,
        sourceType: "approved-estimate-pattern",
        sourceEntityType: "estimate",
        sourceEntityId: estimate.id || "",
        sourceNote: `Suggested from reviewed estimate ${estimate.title || estimate.id || "estimate"}.`,
        status: "suggested",
        confidence: 72,
      });
    }

    const proposalText = estimateProposalText(estimate);
    if (proposalText.length >= 40) {
      candidates.push({
        category: "proposal-language",
        title: `${primaryTrade[0].toUpperCase()}${primaryTrade.slice(1)} proposal tone`,
        preference: `When drafting ${primaryTrade} proposals, keep language close to this reviewed style: ${proposalText}`,
        appliesTo: tags,
        sourceType: "approved-estimate-pattern",
        sourceEntityType: "estimate",
        sourceEntityId: estimate.id || "",
        sourceNote: `Suggested from reviewed estimate ${estimate.title || estimate.id || "estimate"}.`,
        status: "suggested",
        confidence: 68,
      });
    }
  }

  const suggestions = [];
  const seen = new Set(existingKeys);
  for (const candidate of candidates) {
    const normalized = normalizeAgentLearningPreference(candidate, {
      id: `ALP-SUGGEST-${suggestions.length + 1}-${rawText(candidate.sourceEntityId || "estimate", 20)}`,
      now,
    });
    if (normalized.blockedReasons.length || !normalized.title || !normalized.preference) continue;
    const key = suggestionKey(normalized);
    if (seen.has(key)) continue;
    seen.add(key);
    suggestions.push(normalized);
    if (suggestions.length >= 6) break;
  }
  return suggestions;
}
