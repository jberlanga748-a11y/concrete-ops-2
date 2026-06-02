const TEXT_LIMIT = 1800;
const TITLE_LIMIT = 160;
const SHORT_LIMIT = 140;
const PACKET_LIMIT = 120;

const STATUS_VALUES = new Set(["draft", "ready", "blocked", "archived"]);
const CATEGORY_VALUES = new Set([
  "deploy",
  "production-data",
  "schema-auth-session",
  "customer-visible",
  "email-sms",
  "billing-payment",
  "ad-spend-publishing",
  "provider-connection",
  "file-deletion",
  "release",
  "business-operations",
  "general",
]);
const RISK_VALUES = new Set(["low", "medium", "high", "critical"]);

const SECRET_PATTERNS = [
  /\b(password|passcode|api[_ -]?key|secret[a-z0-9_-]*|token|bearer|cookie|session|mfa|captcha|paywall|portal credential|login)\b/gi,
  /\bsk-[a-z0-9_-]{12,}\b/gi,
];
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;

function rawText(value = "", limit = TEXT_LIMIT) {
  return String(value ?? "").replace(/\s+\n/g, "\n").replace(/\s+/g, " ").trim().slice(0, limit);
}

export function redactApexOsApprovalPacketText(value = "", limit = TEXT_LIMIT) {
  let next = rawText(value, limit);
  next = next.replace(EMAIL_PATTERN, "[REDACTED]");
  for (const pattern of SECRET_PATTERNS) {
    next = next.replace(pattern, "[REDACTED]");
  }
  return next.slice(0, limit);
}

export function detectApexOsApprovalPacketSafetyIssues(value = "") {
  const raw = rawText(value, 5000);
  const issues = [];
  if (!raw) return issues;
  if (EMAIL_PATTERN.test(raw)) issues.push("Apex OS approval packets cannot store customer email addresses.");
  EMAIL_PATTERN.lastIndex = 0;
  if (SECRET_PATTERNS.some((pattern) => pattern.test(raw))) {
    issues.push("Apex OS approval packets cannot store passwords, tokens, MFA, CAPTCHA, paywall, login, provider keys, or portal credential instructions.");
  }
  for (const pattern of SECRET_PATTERNS) pattern.lastIndex = 0;
  return [...new Set(issues)];
}

function parsePacketList(value) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeStatus(value = "draft") {
  const normalized = rawText(value, 40).toLowerCase();
  return STATUS_VALUES.has(normalized) ? normalized : "draft";
}

function normalizeCategory(value = "general") {
  const normalized = rawText(value, 80).toLowerCase();
  return CATEGORY_VALUES.has(normalized) ? normalized : "general";
}

function normalizeRisk(value = "medium") {
  const normalized = rawText(value, 40).toLowerCase();
  return RISK_VALUES.has(normalized) ? normalized : "medium";
}

export function normalizeApexOsApprovalPacket(input = {}, { existing = {}, id = "", now = new Date().toISOString() } = {}) {
  const title = redactApexOsApprovalPacketText(input.title ?? existing.title ?? input.actionTitle ?? existing.actionTitle ?? "", TITLE_LIMIT);
  const action = redactApexOsApprovalPacketText(input.action ?? existing.action ?? input.actionSummary ?? existing.actionSummary ?? "", TEXT_LIMIT);
  const reason = redactApexOsApprovalPacketText(input.reason ?? existing.reason ?? "", TEXT_LIMIT);
  const affectedScope = redactApexOsApprovalPacketText(input.affectedScope ?? existing.affectedScope ?? "", TEXT_LIMIT);
  const validationPlan = redactApexOsApprovalPacketText(input.validationPlan ?? existing.validationPlan ?? "", TEXT_LIMIT);
  const validationResult = redactApexOsApprovalPacketText(input.validationResult ?? existing.validationResult ?? "", TEXT_LIMIT);
  const rollbackPlan = redactApexOsApprovalPacketText(input.rollbackPlan ?? existing.rollbackPlan ?? "", TEXT_LIMIT);
  const exactApprovalPhrase = redactApexOsApprovalPacketText(input.exactApprovalPhrase ?? existing.exactApprovalPhrase ?? "", SHORT_LIMIT);
  const sourceLabel = redactApexOsApprovalPacketText(input.sourceLabel ?? existing.sourceLabel ?? "", SHORT_LIMIT);
  const sourceUri = redactApexOsApprovalPacketText(input.sourceUri ?? existing.sourceUri ?? "", 260);
  const operatorNote = redactApexOsApprovalPacketText(input.operatorNote ?? existing.operatorNote ?? "", 420);
  const status = normalizeStatus(input.status ?? existing.status);
  const combinedRaw = [
    input.title,
    input.actionTitle,
    input.action,
    input.actionSummary,
    input.reason,
    input.affectedScope,
    input.validationPlan,
    input.validationResult,
    input.rollbackPlan,
    input.exactApprovalPhrase,
    input.sourceLabel,
    input.sourceUri,
    input.operatorNote,
  ].filter(Boolean).join(" ");
  const blockedReasons = detectApexOsApprovalPacketSafetyIssues(combinedRaw);

  return {
    id: rawText(existing.id || input.id || id, 80),
    title,
    action,
    requestedActionCategory: normalizeCategory(input.requestedActionCategory ?? existing.requestedActionCategory ?? input.category ?? existing.category),
    reason,
    affectedScope,
    riskLevel: normalizeRisk(input.riskLevel ?? existing.riskLevel ?? input.risk ?? existing.risk),
    validationPlan,
    validationResult,
    rollbackPlan,
    exactApprovalPhrase,
    sourceLabel,
    sourceUri,
    status,
    operatorNote,
    createdBy: rawText(existing.createdBy || input.createdBy || "", SHORT_LIMIT),
    createdAt: rawText(existing.createdAt || input.createdAt || now, SHORT_LIMIT),
    updatedAt: now,
    archivedAt: status === "archived" ? rawText(input.archivedAt ?? existing.archivedAt ?? now, SHORT_LIMIT) : "",
    blockedReasons,
  };
}

export function normalizeApexOsApprovalPackets(value = []) {
  return parsePacketList(value)
    .map((packet) => normalizeApexOsApprovalPacket(packet))
    .filter((packet) => packet.id && packet.title && packet.action)
    .slice(0, PACKET_LIMIT);
}

export function summarizeApexOsApprovalPackets(value = []) {
  const packets = normalizeApexOsApprovalPackets(value);
  return {
    total: packets.length,
    draft: packets.filter((packet) => packet.status === "draft").length,
    ready: packets.filter((packet) => packet.status === "ready").length,
    blocked: packets.filter((packet) => packet.status === "blocked").length,
    archived: packets.filter((packet) => packet.status === "archived").length,
  };
}

export function getApexOsApprovalPacketMissingFields(packet = {}) {
  const normalized = normalizeApexOsApprovalPacket(packet);
  const required = [
    ["title", "Action title"],
    ["action", "Action details"],
    ["reason", "Reason"],
    ["affectedScope", "Affected scope"],
    ["validationPlan", "Validation plan"],
    ["rollbackPlan", "Rollback plan"],
    ["exactApprovalPhrase", "Exact approval phrase"],
    ["sourceLabel", "Source label"],
  ];
  return required.filter(([key]) => !normalized[key]).map(([, label]) => label);
}

export function isApexOsApprovalPacketReady(packet = {}) {
  return getApexOsApprovalPacketMissingFields(packet).length === 0 && normalizeApexOsApprovalPacket(packet).blockedReasons.length === 0;
}
