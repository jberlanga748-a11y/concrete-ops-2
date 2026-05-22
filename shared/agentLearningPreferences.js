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
