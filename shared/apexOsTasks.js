export const APEX_OS_TASK_TYPES = Object.freeze(["task", "reminder"]);
export const APEX_OS_TASK_CATEGORIES = Object.freeze(["life", "business", "apex-hq", "customer", "personal", "general"]);
export const APEX_OS_TASK_STATUSES = Object.freeze(["open", "in-progress", "done", "archived"]);
export const APEX_OS_TASK_PRIORITIES = Object.freeze(["low", "normal", "high", "critical"]);
export const APEX_OS_TASK_SOURCES = Object.freeze(["voice", "chat", "system", "manual"]);

export const APEX_OS_TASK_TITLE_LIMIT = 140;
export const APEX_OS_TASK_NOTES_LIMIT = 1800;
export const APEX_OS_TASK_LIMIT = 300;

const TEXT_LIMIT = 1800;
const SHORT_LIMIT = 180;
const TYPE_VALUES = new Set(APEX_OS_TASK_TYPES);
const CATEGORY_VALUES = new Set(APEX_OS_TASK_CATEGORIES);
const STATUS_VALUES = new Set(APEX_OS_TASK_STATUSES);
const PRIORITY_VALUES = new Set(APEX_OS_TASK_PRIORITIES);
const SOURCE_VALUES = new Set(APEX_OS_TASK_SOURCES);
const ACTIVE_STATUSES = new Set(["open", "in-progress"]);

const SECRET_PATTERNS = [
  /\b(password|passcode|api[_ -]?key|secret[a-z0-9_-]*|token|bearer|cookie|session|mfa|captcha|paywall|portal credential|login)\b/gi,
  /\bsk-[a-z0-9_-]{12,}\b/gi,
];
const SECRET_VALUE_PATTERNS = [
  /\b(password|passcode|api[_ -]?key|secret[a-z0-9_-]*|token|bearer|cookie|mfa|captcha|portal credential)\s*[:=]?\s*[^\s,;.]+/gi,
  /\bsk-[a-z0-9_-]{12,}\b/gi,
];
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;

const PRIORITY_WEIGHT = {
  low: 1,
  normal: 2,
  high: 3,
  critical: 4,
};

function rawText(value = "", limit = TEXT_LIMIT) {
  return String(value ?? "").replace(/\s+\n/g, "\n").replace(/\s+/g, " ").trim().slice(0, limit);
}

function parseTaskList(value) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeEnum(value, values, fallback, limit = 80) {
  const normalized = rawText(value, limit)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return values.has(normalized) ? normalized : fallback;
}

function normalizeDueAt(value = "") {
  const raw = rawText(value, SHORT_LIMIT);
  if (!raw) return "";
  return Number.isFinite(Date.parse(raw)) ? raw : "";
}

export function redactApexOsTaskText(value = "", limit = TEXT_LIMIT) {
  let next = rawText(value, limit);
  next = next.replace(EMAIL_PATTERN, "[REDACTED]");
  for (const pattern of SECRET_VALUE_PATTERNS) next = next.replace(pattern, "[REDACTED]");
  for (const pattern of SECRET_PATTERNS) next = next.replace(pattern, "[REDACTED]");
  for (const pattern of SECRET_VALUE_PATTERNS) pattern.lastIndex = 0;
  for (const pattern of SECRET_PATTERNS) pattern.lastIndex = 0;
  EMAIL_PATTERN.lastIndex = 0;
  return next.slice(0, limit);
}

export function detectApexOsTaskSafetyIssues(value = "") {
  const raw = rawText(value, 6000);
  const issues = [];
  if (!raw) return issues;
  if (EMAIL_PATTERN.test(raw)) issues.push("Apex OS tasks and reminders cannot store email addresses.");
  EMAIL_PATTERN.lastIndex = 0;
  if (SECRET_PATTERNS.some((pattern) => pattern.test(raw))) {
    issues.push("Apex OS tasks and reminders cannot store passwords, tokens, MFA, CAPTCHA, paywall, login, provider keys, cookies, sessions, or portal credential instructions.");
  }
  for (const pattern of SECRET_PATTERNS) pattern.lastIndex = 0;
  return [...new Set(issues)];
}

export function normalizeApexOsTaskType(value = "task") {
  return normalizeEnum(value, TYPE_VALUES, "task", 40);
}

export function normalizeApexOsTaskCategory(value = "general") {
  const aliases = {
    apex: "apex-hq",
    "apex-os": "apex-hq",
    "apexhq": "apex-hq",
    work: "business",
    owner: "personal",
  };
  const normalized = rawText(value, 80)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return aliases[normalized] || (CATEGORY_VALUES.has(normalized) ? normalized : "general");
}

export function normalizeApexOsTaskStatus(value = "open") {
  return normalizeEnum(value, STATUS_VALUES, "open", 60);
}

export function normalizeApexOsTaskPriority(value = "normal") {
  return normalizeEnum(value, PRIORITY_VALUES, "normal", 60);
}

export function normalizeApexOsTaskSource(value = "manual") {
  return normalizeEnum(value, SOURCE_VALUES, "manual", 60);
}

export function normalizeApexOsTaskRecord(input = {}, {
  existing = {},
  id = "",
  now = new Date().toISOString(),
  createdBy = "",
} = {}) {
  const title = redactApexOsTaskText(input.title ?? existing.title ?? "", APEX_OS_TASK_TITLE_LIMIT);
  const notes = redactApexOsTaskText(input.notes ?? existing.notes ?? input.body ?? existing.body ?? "", APEX_OS_TASK_NOTES_LIMIT);
  const safetyInput = [
    input.title ?? existing.title,
    input.notes ?? existing.notes,
    input.body ?? existing.body,
  ].filter(Boolean).join(" ");
  const safetyFlags = [
    ...(Array.isArray(existing.safetyFlags) ? existing.safetyFlags : []),
    ...detectApexOsTaskSafetyIssues(safetyInput),
  ].filter(Boolean);

  return {
    id: rawText(existing.id || input.id || id, 90),
    type: normalizeApexOsTaskType(input.type ?? existing.type),
    title,
    notes,
    category: normalizeApexOsTaskCategory(input.category ?? existing.category),
    status: normalizeApexOsTaskStatus(input.status ?? existing.status),
    priority: normalizeApexOsTaskPriority(input.priority ?? existing.priority),
    dueText: redactApexOsTaskText(input.dueText ?? existing.dueText ?? "", SHORT_LIMIT),
    dueAt: normalizeDueAt(input.dueAt ?? existing.dueAt ?? ""),
    source: normalizeApexOsTaskSource(input.source ?? existing.source),
    safetyFlags: [...new Set(safetyFlags)],
    createdBy: rawText(existing.createdBy || input.createdBy || createdBy, 90),
    createdAt: rawText(existing.createdAt || input.createdAt || now, SHORT_LIMIT),
    updatedAt: rawText(input.updatedAt ?? existing.updatedAt ?? now, SHORT_LIMIT),
  };
}

export function createApexOsTaskRecord(input = {}, options = {}) {
  return normalizeApexOsTaskRecord(
    {
      ...input,
      status: input.status || "open",
      priority: input.priority || "normal",
      category: input.category || "general",
      source: input.source || "manual",
    },
    options,
  );
}

export function updateApexOsTaskRecord(existing = {}, input = {}, {
  now = new Date().toISOString(),
} = {}) {
  const updated = normalizeApexOsTaskRecord(
    {
      ...input,
      type: existing.type,
      source: existing.source,
    },
    { existing, now },
  );
  return {
    ...updated,
    id: existing.id || updated.id,
    type: existing.type || updated.type,
    source: existing.source || updated.source,
    createdBy: existing.createdBy || updated.createdBy,
    createdAt: existing.createdAt || updated.createdAt,
    updatedAt: now,
  };
}

export function normalizeApexOsTasks(value = []) {
  return parseTaskList(value)
    .map((entry) => normalizeApexOsTaskRecord(entry))
    .filter((entry) => entry.id && entry.title)
    .slice(0, APEX_OS_TASK_LIMIT);
}

export function filterApexOsTasksByType(value = [], type = "task") {
  const normalizedType = normalizeApexOsTaskType(type);
  return normalizeApexOsTasks(value).filter((entry) => entry.type === normalizedType);
}

function sortTaskContext(left = {}, right = {}) {
  const priorityDiff = (PRIORITY_WEIGHT[right.priority] || 0) - (PRIORITY_WEIGHT[left.priority] || 0);
  if (priorityDiff !== 0) return priorityDiff;
  const leftDue = Date.parse(left.dueAt || "");
  const rightDue = Date.parse(right.dueAt || "");
  if (Number.isFinite(leftDue) && Number.isFinite(rightDue) && leftDue !== rightDue) return leftDue - rightDue;
  if (Number.isFinite(leftDue)) return -1;
  if (Number.isFinite(rightDue)) return 1;
  return String(right.updatedAt || right.createdAt || "").localeCompare(String(left.updatedAt || left.createdAt || ""));
}

function compactTaskItem(entry = {}) {
  return {
    id: entry.id,
    type: entry.type,
    title: entry.title,
    category: entry.category,
    status: entry.status,
    priority: entry.priority,
    dueText: entry.dueText,
    dueAt: entry.dueAt,
  };
}

export function summarizeApexOsTasks(value = [], {
  now = new Date().toISOString(),
  limit = 5,
} = {}) {
  const rows = normalizeApexOsTasks(value);
  const activeRows = rows.filter((entry) => ACTIVE_STATUSES.has(entry.status));
  const taskRows = rows.filter((entry) => entry.type === "task");
  const reminderRows = rows.filter((entry) => entry.type === "reminder");
  const activeTaskRows = taskRows.filter((entry) => ACTIVE_STATUSES.has(entry.status));
  const activeReminderRows = reminderRows.filter((entry) => ACTIVE_STATUSES.has(entry.status));
  const safeLimit = Math.max(1, Math.min(12, Number(limit) || 5));
  const nowMs = Date.parse(now);
  const dueSoonCutoffMs = Number.isFinite(nowMs) ? nowMs + (7 * 24 * 60 * 60 * 1000) : Number.POSITIVE_INFINITY;
  const dueSoonRows = activeRows
    .filter((entry) => {
      const dueMs = Date.parse(entry.dueAt || "");
      return Number.isFinite(dueMs) && dueMs <= dueSoonCutoffMs;
    })
    .slice()
    .sort((left, right) => Date.parse(left.dueAt || "") - Date.parse(right.dueAt || ""))
    .slice(0, safeLimit);
  const overdueRows = activeRows.filter((entry) => {
    const dueMs = Date.parse(entry.dueAt || "");
    return Number.isFinite(nowMs) && Number.isFinite(dueMs) && dueMs < nowMs;
  });
  const highestPriorityItems = activeRows
    .filter((entry) => entry.priority === "critical" || entry.priority === "high")
    .slice()
    .sort(sortTaskContext)
    .slice(0, safeLimit);
  const activePriorities = (highestPriorityItems.length ? highestPriorityItems : activeRows.slice().sort(sortTaskContext))
    .slice(0, safeLimit);

  return {
    total: rows.length,
    activeCount: activeRows.length,
    openTaskCount: activeTaskRows.length,
    openReminderCount: activeReminderRows.length,
    doneCount: rows.filter((entry) => entry.status === "done").length,
    archivedCount: rows.filter((entry) => entry.status === "archived").length,
    overdueCount: overdueRows.length,
    byStatus: Object.fromEntries(APEX_OS_TASK_STATUSES.map((status) => [
      status,
      rows.filter((entry) => entry.status === status).length,
    ])),
    byCategory: Object.fromEntries(APEX_OS_TASK_CATEGORIES.map((category) => [
      category,
      rows.filter((entry) => entry.category === category).length,
    ])),
    byPriority: Object.fromEntries(APEX_OS_TASK_PRIORITIES.map((priority) => [
      priority,
      rows.filter((entry) => entry.priority === priority).length,
    ])),
    highestPriorityItems: highestPriorityItems.map(compactTaskItem),
    dueSoonItems: dueSoonRows.map(compactTaskItem),
    activePriorities: activePriorities.map(compactTaskItem),
    summaryText: `${activeTaskRows.length} open task${activeTaskRows.length === 1 ? "" : "s"}, ${activeReminderRows.length} open reminder${activeReminderRows.length === 1 ? "" : "s"}, ${highestPriorityItems.length} high-priority item${highestPriorityItems.length === 1 ? "" : "s"}, ${dueSoonRows.length} due-soon item${dueSoonRows.length === 1 ? "" : "s"}.`,
  };
}
