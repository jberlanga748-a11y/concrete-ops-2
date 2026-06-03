const TEXT_LIMIT = 1800;
const TITLE_LIMIT = 140;
const SHORT_LIMIT = 120;
const MEMORY_LIMIT = 200;

const STATUS_VALUES = new Set(["suggested", "approved", "archived"]);
export const APEX_OS_DECISION_CATEGORY_VALUES = Object.freeze([
  "product-identity",
  "safety-rule",
  "roadmap-decision",
  "build-freeze",
  "business-goal",
  "provider-account-decision",
  "personal-preference",
  "decision",
  "operating-rule",
  "general",
]);
export const APEX_OS_KNOWLEDGE_CATEGORY_VALUES = Object.freeze([
  "app-docs",
  "business-strategy",
  "marketing-sales",
  "customer-research",
  "legal-risk",
  "brand-design",
  "product-ideas",
  "private-owner-notes",
]);

const CATEGORY_VALUES = new Set([
  ...APEX_OS_DECISION_CATEGORY_VALUES,
  "app-docs",
  "business-strategy",
  "marketing-sales",
  "customer-research",
  "legal-risk",
  "brand-design",
  "product-ideas",
  "private-owner-notes",
]);

const SECRET_PATTERNS = [
  /\b(password|passcode|api[_ -]?key|secret[a-z0-9_-]*|token|bearer|cookie|session|mfa|captcha|paywall|portal credential|login)\b/gi,
  /\bsk-[a-z0-9_-]{12,}\b/gi,
];

const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;

function rawText(value = "", limit = TEXT_LIMIT) {
  return String(value ?? "").replace(/\s+\n/g, "\n").replace(/\s+/g, " ").trim().slice(0, limit);
}

export function redactApexOsMemoryText(value = "", limit = TEXT_LIMIT) {
  let next = rawText(value, limit);
  next = next.replace(EMAIL_PATTERN, "[REDACTED]");
  for (const pattern of SECRET_PATTERNS) {
    next = next.replace(pattern, "[REDACTED]");
  }
  return next.slice(0, limit);
}

export function detectApexOsMemorySafetyIssues(value = "") {
  const raw = rawText(value, 5000);
  const issues = [];
  if (!raw) return issues;
  if (EMAIL_PATTERN.test(raw)) issues.push("Apex OS memory cannot store customer email addresses.");
  EMAIL_PATTERN.lastIndex = 0;
  if (SECRET_PATTERNS.some((pattern) => pattern.test(raw))) {
    issues.push("Apex OS memory cannot store passwords, tokens, MFA, CAPTCHA, paywall, login, provider keys, or portal credential instructions.");
  }
  return [...new Set(issues)];
}

function parseMemoryList(value) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeStatus(value = "suggested") {
  const normalized = rawText(value, 40).toLowerCase();
  return STATUS_VALUES.has(normalized) ? normalized : "suggested";
}

function normalizeCategory(value = "general") {
  const normalized = rawText(value, 80).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const aliases = {
    "apex-hq-app-docs": "app-docs",
    "legal-risk-review-notes": "legal-risk",
    "brand-design-assets": "brand-design",
  };
  if (aliases[normalized]) return aliases[normalized];
  return CATEGORY_VALUES.has(normalized) ? normalized : "general";
}

export function normalizeApexOsMemoryEntry(input = {}, { existing = {}, id = "", now = new Date().toISOString() } = {}) {
  const title = redactApexOsMemoryText(input.title ?? existing.title ?? "", TITLE_LIMIT);
  const body = redactApexOsMemoryText(input.body ?? existing.body ?? input.detail ?? existing.detail ?? "", TEXT_LIMIT);
  const sourceLabel = redactApexOsMemoryText(input.sourceLabel ?? existing.sourceLabel ?? "", SHORT_LIMIT);
  const sourceUri = redactApexOsMemoryText(input.sourceUri ?? existing.sourceUri ?? "", 240);
  const reviewNote = redactApexOsMemoryText(input.reviewNote ?? existing.reviewNote ?? "", 300);
  const combinedRaw = [
    input.title,
    input.body,
    input.detail,
    input.sourceLabel,
    input.sourceUri,
    input.reviewNote,
  ].filter(Boolean).join(" ");
  const blockedReasons = detectApexOsMemorySafetyIssues(combinedRaw);

  return {
    id: rawText(existing.id || input.id || id, 80),
    category: normalizeCategory(input.category ?? existing.category),
    title,
    body,
    sourceType: rawText(input.sourceType ?? existing.sourceType ?? "manual", SHORT_LIMIT) || "manual",
    sourceLabel,
    sourceUri,
    status: normalizeStatus(input.status ?? existing.status),
    confidence: Math.max(0, Math.min(100, Number(input.confidence ?? existing.confidence ?? 70) || 0)),
    reviewNote,
    createdBy: rawText(existing.createdBy || input.createdBy || "", SHORT_LIMIT),
    createdAt: rawText(existing.createdAt || input.createdAt || now, SHORT_LIMIT),
    approvedBy: rawText(input.approvedBy ?? existing.approvedBy ?? "", SHORT_LIMIT),
    approvedAt: rawText(input.approvedAt ?? existing.approvedAt ?? "", SHORT_LIMIT),
    archivedAt: rawText(input.archivedAt ?? existing.archivedAt ?? "", SHORT_LIMIT),
    updatedAt: now,
    blockedReasons,
  };
}

export function normalizeApexOsMemory(value = []) {
  return parseMemoryList(value)
    .map((entry) => normalizeApexOsMemoryEntry(entry))
    .filter((entry) => entry.id && entry.title && entry.body)
    .slice(0, MEMORY_LIMIT);
}

export function summarizeApexOsMemory(value = []) {
  const memory = normalizeApexOsMemory(value);
  return {
    total: memory.length,
    approved: memory.filter((entry) => entry.status === "approved").length,
    suggested: memory.filter((entry) => entry.status === "suggested").length,
    archived: memory.filter((entry) => entry.status === "archived").length,
  };
}

export function isApexOsKnowledgeCategory(value = "") {
  return APEX_OS_KNOWLEDGE_CATEGORY_VALUES.includes(normalizeCategory(value));
}

export function isApexOsDecisionCategory(value = "") {
  return APEX_OS_DECISION_CATEGORY_VALUES.includes(normalizeCategory(value));
}

export function summarizeApexOsDecisionMemory(value = []) {
  const rows = normalizeApexOsMemory(value).filter((entry) => isApexOsDecisionCategory(entry.category));
  const sourceLabels = [...new Set(rows.map((entry) => entry.sourceLabel).filter(Boolean))]
    .sort((left, right) => left.toLowerCase().localeCompare(right.toLowerCase()));
  const reviewHistory = rows
    .slice()
    .sort((left, right) => String(right.updatedAt || right.createdAt || "").localeCompare(String(left.updatedAt || left.createdAt || "")))
    .slice(0, 6)
    .map((entry) => ({
      id: entry.id,
      title: entry.title,
      status: entry.status,
      category: entry.category,
      sourceLabel: entry.sourceLabel,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      approvedAt: entry.approvedAt,
      archivedAt: entry.archivedAt,
      reviewNote: entry.reviewNote,
    }));
  return {
    total: rows.length,
    approved: rows.filter((entry) => entry.status === "approved").length,
    suggested: rows.filter((entry) => entry.status === "suggested").length,
    archived: rows.filter((entry) => entry.status === "archived").length,
    sourceCount: sourceLabels.length,
    sourceLabels,
    byCategory: Object.fromEntries(APEX_OS_DECISION_CATEGORY_VALUES.map((category) => [
      category,
      rows.filter((entry) => entry.category === category).length,
    ])),
    reviewHistory,
  };
}

export function filterApexOsDecisionMemory(value = [], {
  category = "all",
  source = "all",
  status = "all",
  query = "",
} = {}) {
  const normalizedCategory = normalizeCategory(category);
  const normalizedStatus = normalizeStatus(status);
  const normalizedSource = rawText(source, SHORT_LIMIT).toLowerCase();
  const normalizedQuery = rawText(query, 300).toLowerCase();

  return normalizeApexOsMemory(value)
    .filter((entry) => isApexOsDecisionCategory(entry.category))
    .filter((entry) => category === "all" || entry.category === normalizedCategory)
    .filter((entry) => status === "all" || entry.status === normalizedStatus)
    .filter((entry) => {
      if (source === "all") return true;
      return [entry.sourceLabel, entry.sourceType, entry.sourceUri]
        .some((value) => String(value || "").toLowerCase().includes(normalizedSource));
    })
    .filter((entry) => {
      if (!normalizedQuery) return true;
      return [entry.title, entry.body, entry.sourceLabel, entry.sourceUri, entry.reviewNote, entry.category]
        .some((value) => String(value || "").toLowerCase().includes(normalizedQuery));
    });
}

function memoryDuplicateKeys(entry = {}) {
  const normalized = normalizeApexOsMemoryEntry(entry);
  const category = normalized.category || "general";
  return [
    normalized.sourceUri ? `${category}|uri|${normalized.sourceUri}` : "",
    normalized.sourceLabel && normalized.title ? `${category}|source-title|${normalized.sourceLabel}|${normalized.title}` : "",
  ].map((value) => value.trim().toLowerCase()).filter(Boolean);
}

export function findApexOsMemoryDuplicate(candidate = {}, value = []) {
  const candidateKeys = new Set(memoryDuplicateKeys(candidate));
  if (!candidateKeys.size) return null;
  return normalizeApexOsMemory(value)
    .filter((entry) => entry.status !== "archived")
    .find((entry) => memoryDuplicateKeys(entry).some((key) => candidateKeys.has(key))) || null;
}

export function summarizeApexOsKnowledgeVault(value = []) {
  const rows = normalizeApexOsMemory(value).filter((entry) => isApexOsKnowledgeCategory(entry.category));
  const sourceLabels = [...new Set(rows.map((entry) => entry.sourceLabel).filter(Boolean))]
    .sort((left, right) => left.toLowerCase().localeCompare(right.toLowerCase()));
  const reviewHistory = rows
    .slice()
    .sort((left, right) => new Date(right.updatedAt || right.createdAt || 0).getTime() - new Date(left.updatedAt || left.createdAt || 0).getTime())
    .slice(0, 8)
    .map((entry) => ({
      id: entry.id,
      title: entry.title,
      category: entry.category,
      status: entry.status,
      sourceLabel: entry.sourceLabel,
      sourceUri: entry.sourceUri,
      sourceType: entry.sourceType,
      reviewNote: entry.reviewNote,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      approvedAt: entry.approvedAt,
      archivedAt: entry.archivedAt,
    }));
  return {
    total: rows.length,
    trusted: rows.filter((entry) => entry.status === "approved").length,
    suggested: rows.filter((entry) => entry.status === "suggested").length,
    archived: rows.filter((entry) => entry.status === "archived").length,
    sourceCount: sourceLabels.length,
    sourceLabels,
    byCategory: Object.fromEntries(APEX_OS_KNOWLEDGE_CATEGORY_VALUES.map((category) => [
      category,
      rows.filter((entry) => entry.category === category).length,
    ])),
    reviewHistory,
  };
}

export function filterApexOsKnowledgeVault(value = [], {
  category = "all",
  source = "all",
  status = "all",
  query = "",
} = {}) {
  const normalizedCategory = normalizeCategory(category);
  const normalizedStatus = normalizeStatus(status);
  const normalizedSource = rawText(source, SHORT_LIMIT).toLowerCase();
  const normalizedQuery = rawText(query, 300).toLowerCase();

  return normalizeApexOsMemory(value)
    .filter((entry) => isApexOsKnowledgeCategory(entry.category))
    .filter((entry) => category === "all" || entry.category === normalizedCategory)
    .filter((entry) => status === "all" || entry.status === normalizedStatus)
    .filter((entry) => {
      if (source === "all") return true;
      return [entry.sourceLabel, entry.sourceType, entry.sourceUri]
        .some((value) => String(value || "").toLowerCase().includes(normalizedSource));
    })
    .filter((entry) => {
      if (!normalizedQuery) return true;
      return [entry.title, entry.body, entry.sourceLabel, entry.sourceUri, entry.reviewNote, entry.category]
        .some((value) => String(value || "").toLowerCase().includes(normalizedQuery));
    });
}

export function buildApexOsMemoryContext(value = [], { limit = 12 } = {}) {
  return normalizeApexOsMemory(value)
    .filter((entry) => entry.status === "approved")
    .map((entry) => ({
      category: entry.category,
      title: entry.title,
      body: entry.body,
      sourceLabel: entry.sourceLabel,
      sourceUri: entry.sourceUri,
      confidence: entry.confidence,
    }))
    .slice(0, Math.max(1, Math.min(24, Number(limit) || 12)));
}
