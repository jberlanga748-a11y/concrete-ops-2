const TEXT_LIMIT = 1800;
const TITLE_LIMIT = 160;
const SHORT_LIMIT = 140;
const PACKET_LIMIT = 120;

const STATUS_VALUES = new Set(["draft", "ready", "approved", "rejected", "deferred", "blocked", "archived"]);
const BLOCKED_STATUS_VALUES = new Set(["executed", "running", "queued"]);
const CATEGORY_VALUES = new Set([
  "deploy",
  "production-data",
  "schema-auth-session",
  "customer-visible",
  "email-sms",
  "email",
  "messaging",
  "calendar",
  "ordering",
  "booking",
  "billing-payment",
  "ad-spend-publishing",
  "provider-connection",
  "file-deletion",
  "file-write",
  "browser-desktop",
  "music",
  "external-action",
  "release",
  "business-operations",
  "general",
]);
const RISK_VALUES = new Set(["low", "medium", "high", "critical"]);
const RISK_BASE_SCORES = {
  low: 20,
  medium: 45,
  high: 70,
  critical: 90,
};
const CATEGORY_RISK_WEIGHTS = {
  deploy: 15,
  "production-data": 20,
  "schema-auth-session": 20,
  "customer-visible": 18,
  "email-sms": 16,
  email: 16,
  messaging: 16,
  calendar: 14,
  ordering: 18,
  booking: 16,
  "billing-payment": 20,
  "ad-spend-publishing": 18,
  "provider-connection": 15,
  "file-deletion": 20,
  "file-write": 14,
  "browser-desktop": 16,
  music: 10,
  "external-action": 16,
  release: 14,
  "business-operations": 8,
  general: 5,
};

export const APEX_OS_APPROVAL_PACKET_TEMPLATES = [
  {
    id: "deploy",
    title: "Production Deploy",
    requestedActionCategory: "deploy",
    riskLevel: "high",
    exactApprovalPhrase: "BACKUP_FIRST_PRODUCTION_RELEASE_APPROVED",
    requiredEvidence: ["tests", "build", "backup", "rollback", "hosted smoke"],
  },
  {
    id: "schema-auth-session",
    title: "Schema/Auth/Session Change",
    requestedActionCategory: "schema-auth-session",
    riskLevel: "critical",
    exactApprovalPhrase: "SCHEMA_AUTH_SESSION_CHANGE_APPROVED",
    requiredEvidence: ["migration plan", "role tests", "rollback", "data boundary proof"],
  },
  {
    id: "email-sms",
    title: "Email/SMS Send",
    requestedActionCategory: "email-sms",
    riskLevel: "high",
    exactApprovalPhrase: "CUSTOMER_MESSAGE_SEND_APPROVED",
    requiredEvidence: ["recipient scope", "message copy", "provider readiness", "opt-out/compliance check"],
  },
  {
    id: "ordering",
    title: "External Order Or Purchase",
    requestedActionCategory: "ordering",
    riskLevel: "high",
    exactApprovalPhrase: "EXTERNAL_ORDER_APPROVED",
    requiredEvidence: ["vendor/merchant", "item details", "cost/fees/tip", "delivery or pickup details", "cancellation/refund path"],
  },
  {
    id: "booking",
    title: "External Booking Or Appointment",
    requestedActionCategory: "booking",
    riskLevel: "high",
    exactApprovalPhrase: "EXTERNAL_BOOKING_APPROVED",
    requiredEvidence: ["provider/venue", "date/time", "party or attendee scope", "cost/cancellation policy", "confirmation plan"],
  },
  {
    id: "messaging",
    title: "External Message Send",
    requestedActionCategory: "messaging",
    riskLevel: "high",
    exactApprovalPhrase: "EXTERNAL_MESSAGE_SEND_APPROVED",
    requiredEvidence: ["recipient scope", "message copy", "channel", "compliance/consent check", "send timing"],
  },
  {
    id: "email",
    title: "External Email Send",
    requestedActionCategory: "email",
    riskLevel: "high",
    exactApprovalPhrase: "EXTERNAL_EMAIL_SEND_APPROVED",
    requiredEvidence: ["recipient scope", "subject/body copy", "attachments", "compliance/consent check", "send timing"],
  },
  {
    id: "calendar",
    title: "External Calendar Write",
    requestedActionCategory: "calendar",
    riskLevel: "high",
    exactApprovalPhrase: "EXTERNAL_CALENDAR_WRITE_APPROVED",
    requiredEvidence: ["calendar account/scope", "event title", "date/time", "attendees", "notification behavior"],
  },
  {
    id: "billing-payment",
    title: "Billing/Payment Action",
    requestedActionCategory: "billing-payment",
    riskLevel: "critical",
    exactApprovalPhrase: "LIVE_MONEY_ACTION_APPROVED",
    requiredEvidence: ["amount/scope", "provider readiness", "tax/receipt plan", "rollback/refund path"],
  },
  {
    id: "provider-connection",
    title: "Provider Connection",
    requestedActionCategory: "provider-connection",
    riskLevel: "high",
    exactApprovalPhrase: "PROVIDER_CONNECTION_APPROVED",
    requiredEvidence: ["server-side secret plan", "health check", "permission scope", "disconnect plan"],
  },
  {
    id: "browser-desktop",
    title: "Browser/Desktop Control",
    requestedActionCategory: "browser-desktop",
    riskLevel: "high",
    exactApprovalPhrase: "EXTERNAL_BROWSER_DESKTOP_CONTROL_APPROVED",
    requiredEvidence: ["target app/site", "allowed clicks/inputs", "blocked account actions", "privacy review", "stop/cancel path"],
  },
  {
    id: "music",
    title: "Music Or Device Control",
    requestedActionCategory: "music",
    riskLevel: "medium",
    exactApprovalPhrase: "EXTERNAL_MUSIC_CONTROL_APPROVED",
    requiredEvidence: ["service/device", "requested playback action", "volume/environment safety", "stop/cancel path"],
  },
  {
    id: "file-write",
    title: "File Write Outside Approved Scope",
    requestedActionCategory: "file-write",
    riskLevel: "high",
    exactApprovalPhrase: "EXTERNAL_FILE_WRITE_APPROVED",
    requiredEvidence: ["target path", "write/change summary", "backup/checkpoint", "validation plan", "rollback path"],
  },
];

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

export function detectApexOsApprovalPacketSafetyIssues(value = "", requestedStatus = "") {
  const raw = rawText(value, 5000);
  const issues = [];
  const normalizedStatus = rawText(requestedStatus, 40).toLowerCase();
  if (BLOCKED_STATUS_VALUES.has(normalizedStatus)) {
    issues.push("Apex OS approval packets can record draft, ready, approved, rejected, deferred, blocked, or archived review states here; queueing, running, execution, and irreversible action still require a separate gated workflow.");
  }
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

function normalizeDecisionNote(input = {}, existing = {}) {
  return redactApexOsApprovalPacketText(input.decisionNote ?? existing.decisionNote ?? input.operatorNote ?? existing.operatorNote ?? "", 420);
}

export function scoreApexOsApprovalPacketRisk(packet = {}) {
  const normalized = {
    requestedActionCategory: normalizeCategory(packet.requestedActionCategory ?? packet.category),
    riskLevel: normalizeRisk(packet.riskLevel ?? packet.risk),
  };
  const missingCount = getApexOsApprovalPacketMissingFields(packet).length;
  const score = Math.min(
    100,
    (RISK_BASE_SCORES[normalized.riskLevel] || RISK_BASE_SCORES.medium)
      + (CATEGORY_RISK_WEIGHTS[normalized.requestedActionCategory] || CATEGORY_RISK_WEIGHTS.general)
      + (missingCount ? 8 : 0),
  );
  return {
    score,
    band: score >= 90 ? "critical" : score >= 70 ? "high" : score >= 40 ? "medium" : "low",
    reasons: [
      `${normalized.riskLevel} declared risk`,
      `${normalized.requestedActionCategory} category`,
      missingCount ? `${missingCount} missing readiness fields` : "readiness fields complete",
    ],
  };
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
  const sourceRouteId = redactApexOsApprovalPacketText(input.sourceRouteId ?? existing.sourceRouteId ?? input.routeId ?? existing.routeId ?? "", SHORT_LIMIT);
  const sourceRouteStatus = redactApexOsApprovalPacketText(input.sourceRouteStatus ?? existing.sourceRouteStatus ?? input.routeStatus ?? existing.routeStatus ?? "", SHORT_LIMIT);
  const sourceActionDomain = redactApexOsApprovalPacketText(input.sourceActionDomain ?? existing.sourceActionDomain ?? input.actionDomain ?? existing.actionDomain ?? "", SHORT_LIMIT);
  const operatorNote = redactApexOsApprovalPacketText(input.operatorNote ?? existing.operatorNote ?? "", 420);
  const requestedStatus = input.status ?? existing.status;
  const status = normalizeStatus(requestedStatus);
  const decisionNote = normalizeDecisionNote(input, existing);
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
    input.sourceRouteId,
    input.sourceRouteStatus,
    input.sourceActionDomain,
    input.routeId,
    input.routeStatus,
    input.actionDomain,
    input.operatorNote,
    input.decisionNote,
  ].filter(Boolean).join(" ");
  const blockedReasons = detectApexOsApprovalPacketSafetyIssues(combinedRaw, requestedStatus);

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
    sourceRouteId,
    sourceRouteStatus,
    sourceActionDomain,
    approvalSystemPhase: redactApexOsApprovalPacketText(input.approvalSystemPhase ?? existing.approvalSystemPhase ?? "", SHORT_LIMIT),
    executionGate: redactApexOsApprovalPacketText(input.executionGate ?? existing.executionGate ?? "review-only-no-execution", SHORT_LIMIT),
    status,
    operatorNote,
    decisionNote,
    approvedBy: rawText(existing.approvedBy || input.approvedBy || "", SHORT_LIMIT),
    approvedAt: status === "approved" ? rawText(input.approvedAt ?? existing.approvedAt ?? now, SHORT_LIMIT) : "",
    rejectedBy: rawText(existing.rejectedBy || input.rejectedBy || "", SHORT_LIMIT),
    rejectedAt: status === "rejected" ? rawText(input.rejectedAt ?? existing.rejectedAt ?? now, SHORT_LIMIT) : "",
    deferredBy: rawText(existing.deferredBy || input.deferredBy || "", SHORT_LIMIT),
    deferredAt: status === "deferred" ? rawText(input.deferredAt ?? existing.deferredAt ?? now, SHORT_LIMIT) : "",
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
    approved: packets.filter((packet) => packet.status === "approved").length,
    rejected: packets.filter((packet) => packet.status === "rejected").length,
    deferred: packets.filter((packet) => packet.status === "deferred").length,
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

export function isApexOsApprovalPacketApprovalConfirmed(packet = {}, confirmation = "") {
  const normalized = normalizeApexOsApprovalPacket(packet);
  const expected = rawText(normalized.exactApprovalPhrase, SHORT_LIMIT);
  const provided = rawText(confirmation, SHORT_LIMIT);
  return isApexOsApprovalPacketReady(normalized) && Boolean(expected) && expected === provided;
}
