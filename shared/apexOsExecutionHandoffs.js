const TEXT_LIMIT = 1800;
const TITLE_LIMIT = 160;
const SHORT_LIMIT = 140;
const HANDOFF_LIMIT = 120;

const STATUS_VALUES = new Set(["draft", "ready", "blocked", "archived"]);
const BLOCKED_STATUS_VALUES = new Set(["approved", "executed", "running", "queued"]);
const WORKSTREAM_STATUS_VALUES = new Set(["planned", "ready-for-agent", "in-progress", "validating", "finished", "blocked"]);
const AGENT_ROLE_VALUES = new Set([
  "build",
  "qa",
  "release",
  "marketing",
  "sales",
  "customer-success",
  "monitoring",
  "business",
  "general",
]);
const WORK_TYPE_VALUES = new Set([
  "local-code-plan",
  "qa-check",
  "release-packet",
  "business-draft",
  "monitoring-review",
  "docs-update",
  "design-review",
  "general",
]);
const RISK_VALUES = new Set(["low", "medium", "high", "critical"]);
const GATED_ALLOWED_ACTION_PATTERN = /\b(deploy|rollback|production|schema|auth|session|migration|provider|api key|openai|email|sms|text|send|publish|ad spend|ads?|payment|billing|invoice|charge|delete|remove|customer-visible|customer facing|public|irreversible)\b/i;

const SECRET_PATTERNS = [
  /\b(password|passcode|api[_ -]?key|secret[a-z0-9_-]*|token|bearer|cookie|session|mfa|captcha|paywall|portal credential|login)\b/gi,
  /\bsk-[a-z0-9_-]{12,}\b/gi,
];
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;

function rawText(value = "", limit = TEXT_LIMIT) {
  return String(value ?? "").replace(/\s+\n/g, "\n").replace(/\s+/g, " ").trim().slice(0, limit);
}

export function redactApexOsExecutionHandoffText(value = "", limit = TEXT_LIMIT) {
  let next = rawText(value, limit);
  next = next.replace(EMAIL_PATTERN, "[REDACTED]");
  for (const pattern of SECRET_PATTERNS) {
    next = next.replace(pattern, "[REDACTED]");
  }
  return next.slice(0, limit);
}

export function detectApexOsExecutionHandoffSafetyIssues(value = "", requestedStatus = "") {
  const raw = rawText(value, 6000);
  const issues = [];
  const normalizedStatus = rawText(requestedStatus, 40).toLowerCase();
  if (BLOCKED_STATUS_VALUES.has(normalizedStatus)) {
    issues.push("Apex OS execution handoffs can be drafted, readied, blocked, or archived here; approval, queueing, running, and execution require a separate gated workflow.");
  }
  if (!raw) return issues;
  if (EMAIL_PATTERN.test(raw)) issues.push("Apex OS execution handoffs cannot store customer email addresses.");
  EMAIL_PATTERN.lastIndex = 0;
  if (SECRET_PATTERNS.some((pattern) => pattern.test(raw))) {
    issues.push("Apex OS execution handoffs cannot store passwords, tokens, MFA, CAPTCHA, paywall, login, provider keys, or portal credential instructions.");
  }
  for (const pattern of SECRET_PATTERNS) pattern.lastIndex = 0;
  return [...new Set(issues)];
}

function parseHandoffList(value) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function listBlockedReasons(value) {
  return Array.isArray(value) ? value.map((item) => rawText(item, 240)).filter(Boolean) : [];
}

function normalizeStatus(value = "draft") {
  const normalized = rawText(value, 40).toLowerCase();
  return STATUS_VALUES.has(normalized) ? normalized : "draft";
}

function normalizeAgentRole(value = "general") {
  const normalized = rawText(value, 80).toLowerCase();
  return AGENT_ROLE_VALUES.has(normalized) ? normalized : "general";
}

function normalizeWorkType(value = "general") {
  const normalized = rawText(value, 80).toLowerCase();
  return WORK_TYPE_VALUES.has(normalized) ? normalized : "general";
}

function normalizeRisk(value = "medium") {
  const normalized = rawText(value, 40).toLowerCase();
  return RISK_VALUES.has(normalized) ? normalized : "medium";
}

function normalizeWorkstreamStatus(value = "planned") {
  const normalized = rawText(value, 80).toLowerCase();
  return WORKSTREAM_STATUS_VALUES.has(normalized) ? normalized : "planned";
}

function detectApexOsExecutionHandoffApprovalIssues({ allowedActions = "", sourceApprovalPacketId = "" } = {}) {
  if (!GATED_ALLOWED_ACTION_PATTERN.test(rawText(allowedActions, TEXT_LIMIT))) return [];
  if (rawText(sourceApprovalPacketId, SHORT_LIMIT)) return [];
  return ["Production, provider, schema/auth/session, send, spend, billing/payment, customer-visible, deletion, or irreversible work in allowed actions requires a linked approval packet."];
}

export function normalizeApexOsExecutionHandoff(input = {}, { existing = {}, id = "", now = new Date().toISOString() } = {}) {
  const title = redactApexOsExecutionHandoffText(input.title ?? existing.title ?? "", TITLE_LIMIT);
  const objective = redactApexOsExecutionHandoffText(input.objective ?? existing.objective ?? "", TEXT_LIMIT);
  const sourceEvidence = redactApexOsExecutionHandoffText(input.sourceEvidence ?? existing.sourceEvidence ?? "", TEXT_LIMIT);
  const allowedActions = redactApexOsExecutionHandoffText(input.allowedActions ?? existing.allowedActions ?? "", TEXT_LIMIT);
  const blockedActions = redactApexOsExecutionHandoffText(input.blockedActions ?? existing.blockedActions ?? "", TEXT_LIMIT);
  const validationPlan = redactApexOsExecutionHandoffText(input.validationPlan ?? existing.validationPlan ?? "", TEXT_LIMIT);
  const validationResults = redactApexOsExecutionHandoffText(input.validationResults ?? input.validationResult ?? existing.validationResults ?? existing.validationResult ?? "", TEXT_LIMIT);
  const rollbackPlan = redactApexOsExecutionHandoffText(input.rollbackPlan ?? existing.rollbackPlan ?? "", TEXT_LIMIT);
  const resultReport = redactApexOsExecutionHandoffText(input.resultReport ?? existing.resultReport ?? "", TEXT_LIMIT);
  const decisionMemoryUpdate = redactApexOsExecutionHandoffText(input.decisionMemoryUpdate ?? existing.decisionMemoryUpdate ?? "", TEXT_LIMIT);
  const handoffPrompt = redactApexOsExecutionHandoffText(input.handoffPrompt ?? input.operatorInstructions ?? existing.handoffPrompt ?? existing.operatorInstructions ?? "", TEXT_LIMIT);
  const sourceApprovalPacketId = redactApexOsExecutionHandoffText(input.sourceApprovalPacketId ?? existing.sourceApprovalPacketId ?? "", SHORT_LIMIT);
  const sourceChatRequestId = redactApexOsExecutionHandoffText(input.sourceChatRequestId ?? existing.sourceChatRequestId ?? "", SHORT_LIMIT);
  const sourceQuestion = redactApexOsExecutionHandoffText(input.sourceQuestion ?? existing.sourceQuestion ?? "", TEXT_LIMIT);
  const sourceLabel = redactApexOsExecutionHandoffText(input.sourceLabel ?? existing.sourceLabel ?? "", SHORT_LIMIT);
  const sourceUri = redactApexOsExecutionHandoffText(input.sourceUri ?? existing.sourceUri ?? "", 260);
  const operatorNote = redactApexOsExecutionHandoffText(input.operatorNote ?? existing.operatorNote ?? "", 420);
  const requestedStatus = input.status ?? existing.status;
  const status = normalizeStatus(requestedStatus);
  const workstreamStatus = normalizeWorkstreamStatus(input.workstreamStatus ?? existing.workstreamStatus);
  const decisionMemoryId = redactApexOsExecutionHandoffText(input.decisionMemoryId ?? existing.decisionMemoryId ?? "", SHORT_LIMIT);
  const combinedRaw = [
    input.title,
    input.objective,
    input.sourceEvidence,
    input.allowedActions,
    input.blockedActions,
    input.validationPlan,
    input.validationResults,
    input.validationResult,
    input.rollbackPlan,
    input.resultReport,
    input.decisionMemoryUpdate,
    input.handoffPrompt,
    input.operatorInstructions,
    input.sourceApprovalPacketId,
    input.sourceChatRequestId,
    input.sourceQuestion,
    input.sourceLabel,
    input.sourceUri,
    input.operatorNote,
  ].filter(Boolean).join(" ");
  const blockedReasons = [
    ...listBlockedReasons(input.blockedReasons),
    ...listBlockedReasons(existing.blockedReasons),
    ...detectApexOsExecutionHandoffSafetyIssues(combinedRaw, requestedStatus),
    ...detectApexOsExecutionHandoffApprovalIssues({ allowedActions, sourceApprovalPacketId }),
  ];

  return {
    id: rawText(existing.id || input.id || id, 80),
    title,
    agentRole: normalizeAgentRole(input.agentRole ?? existing.agentRole),
    workType: normalizeWorkType(input.workType ?? existing.workType),
    sourceApprovalPacketId,
    objective,
    sourceEvidence,
    allowedActions,
    blockedActions,
    validationPlan,
    validationResults,
    rollbackPlan,
    resultReport,
    decisionMemoryUpdate,
    handoffPrompt,
    sourceChatRequestId,
    sourceQuestion,
    sourceLabel,
    sourceUri,
    riskLevel: normalizeRisk(input.riskLevel ?? existing.riskLevel ?? input.risk ?? existing.risk),
    status,
    workstreamStatus,
    operatorNote,
    decisionMemoryId,
    createdBy: rawText(existing.createdBy || input.createdBy || "", SHORT_LIMIT),
    createdAt: rawText(existing.createdAt || input.createdAt || now, SHORT_LIMIT),
    updatedAt: now,
    archivedAt: status === "archived" ? rawText(input.archivedAt ?? existing.archivedAt ?? now, SHORT_LIMIT) : "",
    blockedReasons: [...new Set(blockedReasons)],
  };
}

export function normalizeApexOsExecutionHandoffs(value = []) {
  return parseHandoffList(value)
    .map((handoff) => normalizeApexOsExecutionHandoff(handoff))
    .filter((handoff) => handoff.id && handoff.title && handoff.objective)
    .slice(0, HANDOFF_LIMIT);
}

export function summarizeApexOsExecutionHandoffs(value = []) {
  const handoffs = normalizeApexOsExecutionHandoffs(value);
  return {
    total: handoffs.length,
    draft: handoffs.filter((handoff) => handoff.status === "draft").length,
    ready: handoffs.filter((handoff) => handoff.status === "ready").length,
    blocked: handoffs.filter((handoff) => handoff.status === "blocked").length,
    archived: handoffs.filter((handoff) => handoff.status === "archived").length,
    planned: handoffs.filter((handoff) => handoff.workstreamStatus === "planned").length,
    inProgress: handoffs.filter((handoff) => handoff.workstreamStatus === "in-progress").length,
    validating: handoffs.filter((handoff) => handoff.workstreamStatus === "validating").length,
    finished: handoffs.filter((handoff) => handoff.workstreamStatus === "finished").length,
  };
}

export function getApexOsExecutionHandoffMissingFields(handoff = {}) {
  const normalized = normalizeApexOsExecutionHandoff(handoff);
  const required = [
    ["title", "Handoff title"],
    ["objective", "Objective"],
    ["sourceEvidence", "Source evidence"],
    ["allowedActions", "Allowed actions"],
    ["blockedActions", "Blocked actions"],
    ["validationPlan", "Validation plan"],
    ["rollbackPlan", "Rollback plan"],
    ["handoffPrompt", "Handoff prompt"],
    ["sourceLabel", "Source label"],
  ];
  if (normalized.workstreamStatus === "finished") {
    required.push(["validationResults", "Validation results"]);
    required.push(["resultReport", "Result report"]);
  }
  return required.filter(([key]) => !normalized[key]).map(([, label]) => label);
}

export function isApexOsExecutionHandoffReady(handoff = {}) {
  const normalized = normalizeApexOsExecutionHandoff(handoff);
  return getApexOsExecutionHandoffMissingFields(normalized).length === 0 && normalized.blockedReasons.length === 0;
}

export function buildApexOsExecutionContract(handoff = {}) {
  const normalized = normalizeApexOsExecutionHandoff(handoff);
  return {
    id: normalized.id,
    title: normalized.title,
    objective: normalized.objective,
    agentRole: normalized.agentRole,
    workType: normalized.workType,
    workstreamStatus: normalized.workstreamStatus,
    allowedActions: normalized.allowedActions,
    blockedActions: normalized.blockedActions,
    validationPlan: normalized.validationPlan,
    validationResults: normalized.validationResults,
    rollbackPlan: normalized.rollbackPlan,
    resultReport: normalized.resultReport,
    sourceEvidence: normalized.sourceEvidence,
    sourceApprovalPacketId: normalized.sourceApprovalPacketId,
    sourceChatRequestId: normalized.sourceChatRequestId,
    decisionMemoryId: normalized.decisionMemoryId,
    decisionMemoryDraftReady: normalized.workstreamStatus === "finished" && Boolean(normalized.decisionMemoryUpdate),
    executionLocked: true,
    canQueue: false,
    canRun: false,
    canExecute: false,
  };
}
