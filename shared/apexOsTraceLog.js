export const APEX_OS_TRACE_EVENT_TYPE = Object.freeze({
  ASK_REQUEST: "ask-request",
  MODEL_ROUTE: "model-route",
  AFFECTIVE_STATE: "affective-state",
  SKILL_REGISTRY_CONTEXT: "skill-registry-context",
  ACTION_PERMISSION_CLASSIFICATION: "action-permission-classification",
  MEMORY_SUGGESTION: "memory-suggestion",
  MEMORY_REVIEW: "memory-review",
  TASK_REMINDER_CONTEXT: "task-reminder-context",
  KNOWLEDGE_SUMMARY: "knowledge-summary",
  TOOL_ROUTE: "tool-route",
  UNTRUSTED_CONTENT_FIREWALL: "untrusted-content-firewall",
  BACKGROUND_LOOP_PLANNED: "background-loop-planned",
  APPROVAL_REQUIRED: "approval-required",
  FORBIDDEN_ACTION: "forbidden-action",
  ERROR: "error",
});

export const APEX_OS_TRACE_EVENT_TYPES = Object.freeze(Object.values(APEX_OS_TRACE_EVENT_TYPE));

export const APEX_OS_TRACE_STATUS = Object.freeze({
  STARTED: "started",
  COMPLETED: "completed",
  SKIPPED: "skipped",
  BLOCKED: "blocked",
  APPROVAL_REQUIRED: "approval-required",
  FORBIDDEN: "forbidden",
  ERROR: "error",
});

export const APEX_OS_TRACE_STATUSES = Object.freeze(Object.values(APEX_OS_TRACE_STATUS));

export const APEX_OS_TRACE_SOURCE = Object.freeze({
  ASK_APEX: "ask-apex",
  KNOWLEDGE_INTELLIGENCE: "knowledge-intelligence",
  MODEL_ROUTER: "model-router",
  AFFECTIVE_STATE: "affective-state",
  ACTION_PERMISSION_MATRIX: "action-permission-matrix",
  SKILL_REGISTRY: "skill-registry",
  MEMORY: "memory",
  TASKS_REMINDERS: "tasks-reminders",
  TOOL_ROUTER: "tool-router",
  UNTRUSTED_CONTENT_FIREWALL: "untrusted-content-firewall",
  APPROVAL_GATE: "approval-gate",
  BACKGROUND_LOOP: "background-loop",
  SYSTEM: "system",
});

export const APEX_OS_TRACE_SOURCES = Object.freeze(Object.values(APEX_OS_TRACE_SOURCE));

export const APEX_OS_TRACE_UNSAFE_FIELD_PATTERNS = Object.freeze([
  /prompt/i,
  /question/i,
  /answer/i,
  /instruction/i,
  /messages?/i,
  /response/i,
  /completion/i,
  /content/i,
  /^body$/i,
  /transcript/i,
  /headers?/i,
  /cookies?/i,
  /(?:^|[_-])tokens?(?:$|[_-])/i,
  /api[_-]?keys?/i,
  /passwords?/i,
  /credentials?/i,
  /secrets?/i,
  /authorization/i,
  /auth[_-]?header/i,
  /bearer/i,
  /db[_-]?url/i,
  /database[_-]?url/i,
  /session/i,
  /private[_-]?message/i,
  /conversation/i,
  /raw[_-]?/i,
]);

const SAFE_TRACE_FIELD_NAMES = Object.freeze(new Set([
  "maxOutputTokens",
  "inputTokenEstimate",
  "outputTokenEstimate",
  "safeMessage",
]));
const UNSAFE_VALUE_PATTERNS = Object.freeze([
  /\bbearer\s+[a-z0-9._~+/=-]{8,}/gi,
  /\bsk-[a-z0-9_-]{12,}\b/gi,
  /\b(?:api[_ -]?key|token|secret|password|credential|authorization|cookie|session)\s*[:=]\s*[^\s,;.]+/gi,
  /\b(?:postgres|postgresql|mysql|mongodb|redis):\/\/[^\s]+/gi,
]);
const TEXT_LIMIT = 220;
const SHORT_LIMIT = 90;
const TRACE_LIMIT_DEFAULT = 80;
const TRACE_MAX_AGE_DAYS_DEFAULT = 30;

function text(value = "", limit = TEXT_LIMIT) {
  return String(value ?? "").replace(/\s+\n/g, "\n").replace(/\s+/g, " ").trim().slice(0, limit);
}

export function redactUnsafeApexOsTraceValue(value = "", limit = TEXT_LIMIT) {
  let next = text(value, limit);
  for (const pattern of UNSAFE_VALUE_PATTERNS) {
    next = next.replace(pattern, "[REDACTED]");
    pattern.lastIndex = 0;
  }
  return next.slice(0, limit);
}

function lower(value = "") {
  return text(value, TEXT_LIMIT).toLowerCase();
}

function slug(value = "", fallback = "trace") {
  const normalized = lower(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return normalized || fallback;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function isUnsafeApexOsTraceFieldName(key = "") {
  const normalizedKey = String(key || "");
  if (SAFE_TRACE_FIELD_NAMES.has(normalizedKey)) return false;
  return APEX_OS_TRACE_UNSAFE_FIELD_PATTERNS.some((pattern) => pattern.test(normalizedKey));
}

function boundedNumber(value = 0, max = 1_000_000) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return 0;
  return Math.min(max, Math.round(number));
}

function createdAtIso(value = "", now = new Date()) {
  const parsed = Date.parse(value || "");
  if (Number.isFinite(parsed)) return new Date(parsed).toISOString();
  return new Date(now).toISOString();
}

export function normalizeApexOsTraceEventType(value = APEX_OS_TRACE_EVENT_TYPE.ERROR, fallback = APEX_OS_TRACE_EVENT_TYPE.ERROR) {
  const normalized = lower(value);
  return APEX_OS_TRACE_EVENT_TYPES.includes(normalized) ? normalized : fallback;
}

export function normalizeApexOsTraceStatus(value = APEX_OS_TRACE_STATUS.SKIPPED, fallback = APEX_OS_TRACE_STATUS.SKIPPED) {
  const normalized = lower(value);
  return APEX_OS_TRACE_STATUSES.includes(normalized) ? normalized : fallback;
}

export function normalizeApexOsTraceSource(value = APEX_OS_TRACE_SOURCE.SYSTEM, fallback = APEX_OS_TRACE_SOURCE.SYSTEM) {
  const normalized = lower(value);
  return APEX_OS_TRACE_SOURCES.includes(normalized) ? normalized : fallback;
}

export function collectUnsafeApexOsTraceFields(value = {}, path = "", depth = 0) {
  if (depth > 5) return [];
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) => collectUnsafeApexOsTraceFields(entry, `${path}[${index}]`, depth + 1)).slice(0, 40);
  }
  if (!isPlainObject(value)) return [];
  return Object.entries(value).flatMap(([key, entry]) => {
    const fieldPath = path ? `${path}.${key}` : key;
    return [
      ...(isUnsafeApexOsTraceFieldName(key) ? [fieldPath] : []),
      ...collectUnsafeApexOsTraceFields(entry, fieldPath, depth + 1),
    ];
  }).slice(0, 40);
}

export function hasUnsafeApexOsTraceFields(value = {}) {
  return collectUnsafeApexOsTraceFields(value).length > 0;
}

export const hasUnsafeApexOsTraceField = hasUnsafeApexOsTraceFields;

export function stripUnsafeApexOsTraceFields(value = {}, depth = 0) {
  if (depth > 5) return undefined;
  if (Array.isArray(value)) {
    return value.slice(0, 16).map((entry) => stripUnsafeApexOsTraceFields(entry, depth + 1)).filter((entry) => entry !== undefined);
  }
  if (!isPlainObject(value)) {
    if (typeof value === "string") return redactUnsafeApexOsTraceValue(value, TEXT_LIMIT);
    if (typeof value === "number") return boundedNumber(value);
    if (typeof value === "boolean") return value;
    return undefined;
  }

  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !isUnsafeApexOsTraceFieldName(key))
    .slice(0, 32)
    .map(([key, entry]) => [key, stripUnsafeApexOsTraceFields(entry, depth + 1)])
    .filter(([, entry]) => entry !== undefined));
}

export function sanitizeApexOsTraceMetadata(value = {}) {
  const stripped = stripUnsafeApexOsTraceFields(value);
  if (!isPlainObject(stripped)) return {};

  return Object.fromEntries(Object.entries(stripped)
    .map(([key, entry]) => {
      const safeKey = slug(key, "metadata-key");
      if (isPlainObject(entry) || Array.isArray(entry)) return [safeKey, stripUnsafeApexOsTraceFields(entry)];
      if (typeof entry === "boolean") return [safeKey, entry];
      if (typeof entry === "number") return [safeKey, boundedNumber(entry)];
      return [safeKey, redactUnsafeApexOsTraceValue(entry, SHORT_LIMIT)];
    })
    .slice(0, 24));
}

export function rejectUnsafeApexOsTraceMetadata(value = {}) {
  const unsafeFields = collectUnsafeApexOsTraceFields(value);
  return Object.freeze({
    ok: unsafeFields.length === 0,
    unsafeFields,
    safeMetadata: sanitizeApexOsTraceMetadata(value),
  });
}

export function createApexOsTraceEntry(input = {}, { now = new Date() } = {}) {
  const eventType = normalizeApexOsTraceEventType(input.eventType);
  const source = normalizeApexOsTraceSource(input.source);
  const status = normalizeApexOsTraceStatus(input.status);
  const createdAt = createdAtIso(input.createdAt, now);
  const id = redactUnsafeApexOsTraceValue(input.id, SHORT_LIMIT) || `trace-${Date.parse(createdAt) || 0}-${slug(eventType)}-${slug(source)}`;

  return Object.freeze({
    id,
    eventType,
    source,
    status,
    route: redactUnsafeApexOsTraceValue(input.route, SHORT_LIMIT),
    modelTier: redactUnsafeApexOsTraceValue(input.modelTier, SHORT_LIMIT),
    modelAlias: redactUnsafeApexOsTraceValue(input.modelAlias, SHORT_LIMIT),
    budgetLevel: redactUnsafeApexOsTraceValue(input.budgetLevel, SHORT_LIMIT),
    maxOutputTokens: boundedNumber(input.maxOutputTokens, 20_000),
    actionDomain: redactUnsafeApexOsTraceValue(input.actionDomain, SHORT_LIMIT),
    riskTier: redactUnsafeApexOsTraceValue(input.riskTier, SHORT_LIMIT),
    approvalRequired: Boolean(input.approvalRequired),
    forbidden: Boolean(input.forbidden),
    canExecuteNow: false,
    skillId: redactUnsafeApexOsTraceValue(input.skillId, SHORT_LIMIT),
    memorySuggestionCreated: Boolean(input.memorySuggestionCreated),
    errorCode: redactUnsafeApexOsTraceValue(input.errorCode, SHORT_LIMIT),
    reasonCode: slug(input.reasonCode || status || eventType, "trace-reason"),
    safeMessage: redactUnsafeApexOsTraceValue(input.safeMessage, TEXT_LIMIT),
    durationMs: boundedNumber(input.durationMs, 120_000),
    inputTokenEstimate: boundedNumber(input.inputTokenEstimate, 1_000_000),
    outputTokenEstimate: boundedNumber(input.outputTokenEstimate, 1_000_000),
    createdAt,
  });
}

export function pruneApexOsTraceLog(entries = [], {
  limit = TRACE_LIMIT_DEFAULT,
  maxAgeDays = TRACE_MAX_AGE_DAYS_DEFAULT,
  now = new Date(),
} = {}) {
  const boundedLimit = Math.max(1, Math.min(500, Number(limit) || TRACE_LIMIT_DEFAULT));
  const maxAgeMs = Math.max(0, Math.min(365, Number(maxAgeDays) || TRACE_MAX_AGE_DAYS_DEFAULT)) * 24 * 60 * 60 * 1000;
  const cutoff = new Date(now).getTime() - maxAgeMs;
  return (Array.isArray(entries) ? entries : [])
    .map((entry) => createApexOsTraceEntry(entry, { now }))
    .filter((entry) => {
      const timestamp = Date.parse(entry.createdAt);
      return !maxAgeMs || !Number.isFinite(timestamp) || timestamp >= cutoff;
    })
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
    .slice(0, boundedLimit);
}

export function buildApexOsTraceSummary(entries = [], { limit = 8 } = {}) {
  const safeEntries = pruneApexOsTraceLog(entries, { limit: Math.max(limit, 1) });
  const byStatus = Object.fromEntries(APEX_OS_TRACE_STATUSES.map((status) => [status, 0]));
  const byEventType = Object.fromEntries(APEX_OS_TRACE_EVENT_TYPES.map((eventType) => [eventType, 0]));
  const sourceCount = Object.fromEntries(APEX_OS_TRACE_SOURCES.map((source) => [source, 0]));

  for (const entry of safeEntries) {
    byStatus[entry.status] = (byStatus[entry.status] || 0) + 1;
    byEventType[entry.eventType] = (byEventType[entry.eventType] || 0) + 1;
    sourceCount[entry.source] = (sourceCount[entry.source] || 0) + 1;
  }

  const approvalRequiredCount = safeEntries.filter((entry) => entry.approvalRequired || entry.status === APEX_OS_TRACE_STATUS.APPROVAL_REQUIRED).length;
  const forbiddenCount = safeEntries.filter((entry) => entry.forbidden || entry.status === APEX_OS_TRACE_STATUS.FORBIDDEN).length;
  const errorCount = safeEntries.filter((entry) => entry.status === APEX_OS_TRACE_STATUS.ERROR).length;
  const latestCreatedAt = safeEntries[0]?.createdAt || "";

  return Object.freeze({
    totalCount: safeEntries.length,
    latestCreatedAt,
    latestAt: latestCreatedAt,
    byStatus,
    byEventType,
    statuses: byStatus,
    eventTypes: byEventType,
    sourceCount,
    approvalRequiredCount,
    forbiddenCount,
    errorCount,
    storesRawPrompt: false,
    storesRawResponse: false,
    storesRawMessages: false,
    recentEntries: safeEntries.slice(0, Math.max(1, Math.min(12, Number(limit) || 8))),
    summaryText: text(`${safeEntries.length} safe metadata trace event${safeEntries.length === 1 ? "" : "s"} recorded in memory for this operator-only packet; ${approvalRequiredCount} approval-gated, ${forbiddenCount} forbidden, ${errorCount} error.`, 320),
  });
}
