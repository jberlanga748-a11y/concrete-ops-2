export const APEX_OS_ACTION_RISK_TIER = Object.freeze({
  SAFE_ANSWER: "safe-answer",
  SAFE_READ: "safe-read",
  INTERNAL_WRITE: "internal-write",
  APPROVAL_REQUIRED: "approval-required",
  EXTERNAL_ACTION: "external-action",
  HIGH_RISK: "high-risk",
  FORBIDDEN: "forbidden",
});

export const APEX_OS_ACTION_RISK_TIERS = Object.freeze(Object.values(APEX_OS_ACTION_RISK_TIER));

export const APEX_OS_ACTION_DOMAIN = Object.freeze({
  CONVERSATION: "conversation",
  MEMORY: "memory",
  TASKS: "tasks",
  RESEARCH: "research",
  PLANNING: "planning",
  APEX_HQ: "apex-hq",
  FILES: "files",
  DESKTOP: "desktop",
  BROWSER: "browser",
  MUSIC: "music",
  ORDERING: "ordering",
  BOOKING: "booking",
  MESSAGING: "messaging",
  EMAIL: "email",
  CALENDAR: "calendar",
  BILLING: "billing",
  AUTH: "auth",
  SCHEMA: "schema",
  PRODUCTION: "production",
  DEPLOYMENT: "deployment",
  SYSTEM: "system",
});

export const APEX_OS_ACTION_DOMAINS = Object.freeze(Object.values(APEX_OS_ACTION_DOMAIN));

export const APEX_OS_APPROVAL_REQUIREMENT = Object.freeze({
  NONE: "none",
  OPERATOR_ENDPOINT: "operator-endpoint",
  EXPLICIT_APPROVAL: "explicit-approval",
  APPROVAL_PACKET: "approval-packet",
  FORBIDDEN: "forbidden",
});

export const APEX_OS_APPROVAL_REQUIREMENTS = Object.freeze(Object.values(APEX_OS_APPROVAL_REQUIREMENT));

export const APEX_OS_FORBIDDEN_ACTIONS = Object.freeze([
  "hidden-gps-or-location-tracking",
  "secret-or-credential-exposure",
  "permission-or-approval-gate-weakening",
  "field-customer-demo-apex-os-access",
  "automatic-sms-or-email-without-approval",
  "automatic-spend-or-order-without-approval",
  "production-destructive-action-without-approval",
  "approval-gate-bypass",
  "raw-secret-memory-storage",
  "contractor-facing-apex-os-without-explicit-phase",
]);

const TEXT_LIMIT = 1000;
const REASON_LIMIT = 320;

function text(value = "", limit = TEXT_LIMIT) {
  return String(value ?? "").replace(/\s+\n/g, "\n").replace(/\s+/g, " ").trim().slice(0, limit);
}

function lower(value = "") {
  return text(value).toLowerCase();
}

function matchesAny(value = "", patterns = []) {
  return patterns.some((pattern) => pattern.test(value));
}

function labelForApprovalRequirement(value = APEX_OS_APPROVAL_REQUIREMENT.EXPLICIT_APPROVAL) {
  const requirement = normalizeApexOsApprovalRequirement(value);
  if (requirement === APEX_OS_APPROVAL_REQUIREMENT.NONE) return "No extra approval needed";
  if (requirement === APEX_OS_APPROVAL_REQUIREMENT.OPERATOR_ENDPOINT) return "Existing operator-only internal endpoint required";
  if (requirement === APEX_OS_APPROVAL_REQUIREMENT.APPROVAL_PACKET) return "Approval packet and gated workflow required";
  if (requirement === APEX_OS_APPROVAL_REQUIREMENT.FORBIDDEN) return "Forbidden in Apex OS";
  return "John's explicit approval required";
}

function actionIdFrom(value = "", fallback = "apex-os-action") {
  const normalized = lower(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
  return normalized || fallback;
}

function buildClassification({
  actionId = "",
  domain = APEX_OS_ACTION_DOMAIN.SYSTEM,
  riskTier = APEX_OS_ACTION_RISK_TIER.APPROVAL_REQUIRED,
  allowed = false,
  requiresApproval = true,
  forbidden = false,
  reason = "",
  approvalRequirement = APEX_OS_APPROVAL_REQUIREMENT.EXPLICIT_APPROVAL,
  requiredApprovalLabel = "",
  safeAlternative = "",
} = {}) {
  const normalizedApprovalRequirement = forbidden
    ? APEX_OS_APPROVAL_REQUIREMENT.FORBIDDEN
    : normalizeApexOsApprovalRequirement(approvalRequirement);
  return Object.freeze({
    actionId: actionIdFrom(actionId, "apex-os-action-approval-required"),
    domain: normalizeApexOsActionDomain(domain),
    riskTier: normalizeApexOsActionRiskTier(riskTier),
    allowed: Boolean(allowed) && !forbidden,
    requiresApproval: Boolean(requiresApproval) && !forbidden,
    forbidden: Boolean(forbidden),
    approvalRequirement: normalizedApprovalRequirement,
    reason: text(reason, REASON_LIMIT),
    requiredApprovalLabel: text(requiredApprovalLabel || labelForApprovalRequirement(normalizedApprovalRequirement), 160),
    safeAlternative: text(safeAlternative || "I can draft a private plan, explain the boundary, or prepare an approval packet instead.", REASON_LIMIT),
    canExecuteNow: false,
  });
}

export function normalizeApexOsActionRiskTier(value = APEX_OS_ACTION_RISK_TIER.APPROVAL_REQUIRED, fallback = APEX_OS_ACTION_RISK_TIER.APPROVAL_REQUIRED) {
  const normalized = lower(value);
  return APEX_OS_ACTION_RISK_TIERS.includes(normalized) ? normalized : fallback;
}

export function normalizeApexOsActionDomain(value = APEX_OS_ACTION_DOMAIN.SYSTEM, fallback = APEX_OS_ACTION_DOMAIN.SYSTEM) {
  const normalized = lower(value);
  return APEX_OS_ACTION_DOMAINS.includes(normalized) ? normalized : fallback;
}

export function normalizeApexOsApprovalRequirement(value = APEX_OS_APPROVAL_REQUIREMENT.EXPLICIT_APPROVAL, fallback = APEX_OS_APPROVAL_REQUIREMENT.EXPLICIT_APPROVAL) {
  const normalized = lower(value);
  return APEX_OS_APPROVAL_REQUIREMENTS.includes(normalized) ? normalized : fallback;
}

export function normalizeApexOsActionDescription(input = {}) {
  if (typeof input === "string") return text(input);
  return text([
    input.action,
    input.description,
    input.intent,
    input.title,
    input.prompt,
    input.question,
  ].filter(Boolean).join(" "));
}

export function isApexOsActionAllowed(action = {}) {
  return Boolean(action?.allowed) && action?.canExecuteNow === false && !action?.forbidden;
}

export function isApexOsActionApprovalGated(action = {}) {
  return Boolean(action?.requiresApproval) && action?.canExecuteNow === false && !action?.forbidden;
}

export function isApexOsActionForbidden(action = {}) {
  return Boolean(action?.forbidden) || action?.riskTier === APEX_OS_ACTION_RISK_TIER.FORBIDDEN;
}

export function classifyApexOsAction(input = {}) {
  const description = normalizeApexOsActionDescription(input);
  const normalized = lower(description);
  const explicitId = typeof input === "object" && input ? text(input.actionId || input.id || "", 90) : "";
  const explicitDomain = typeof input === "object" && input ? normalizeApexOsActionDomain(input.domain || "") : "";

  const classificationBase = (values = {}) => buildClassification({
    actionId: explicitId || values.actionId,
    ...values,
  });

  if (!normalized) {
    return classificationBase({
      actionId: "unknown-action-approval-required",
      domain: explicitDomain || APEX_OS_ACTION_DOMAIN.SYSTEM,
      riskTier: APEX_OS_ACTION_RISK_TIER.APPROVAL_REQUIRED,
      allowed: false,
      requiresApproval: true,
      reason: "No action text was supplied, so Apex OS cannot safely treat it as a safe action.",
      safeAlternative: "Ask Apex to clarify the intended action before any tool or workflow is considered.",
    });
  }

  if (
    matchesAny(normalized, [
      /\b(hidden|silent|secret|without (?:consent|approval|asking|permission))\b.*\b(gps|location|tracking|track)\b/,
      /\btrack\b.*\b(location|gps)\b.*\b(hidden|silent|secret|without (?:consent|approval|asking|permission))\b/,
    ])
  ) {
    return classificationBase({
      actionId: "forbidden-hidden-location-tracking",
      domain: APEX_OS_ACTION_DOMAIN.SYSTEM,
      riskTier: APEX_OS_ACTION_RISK_TIER.FORBIDDEN,
      allowed: false,
      requiresApproval: false,
      forbidden: true,
      reason: "Hidden GPS or location tracking is forbidden for Apex OS.",
      safeAlternative: "I can help draft an explicit, consent-based location/privacy policy for review.",
    });
  }

  if (
    matchesAny(normalized, [
      /\b(open|read|show|print|display|reveal|expose|leak|share|send)\b.*\b(?:\.env|env file|api[_ -]?key|secret|token|cookie|session|database url|db url|credential|password|private key)\b/,
      /\b(store|save|remember)\b.*\b(raw )?(?:api[_ -]?key|secret|token|cookie|session|credential|password|private key)\b.*\b(memory|apex os memory|durable memory)\b/,
      /\braw (?:credential|credentials|secret|secrets|token|tokens|password|passwords)\b/,
    ])
  ) {
    return classificationBase({
      actionId: "forbidden-secret-exposure-or-storage",
      domain: APEX_OS_ACTION_DOMAIN.SYSTEM,
      riskTier: APEX_OS_ACTION_RISK_TIER.FORBIDDEN,
      allowed: false,
      requiresApproval: false,
      forbidden: true,
      reason: "Exposing secrets or storing raw credentials in Apex OS memory is forbidden.",
      safeAlternative: "I can describe the secret-handling boundary or use redacted placeholders instead.",
    });
  }

  if (
    matchesAny(normalized, [
      /\b(bypass|skip|disable|remove|turn off|weaken|loosen)\b.*\b(approval|approval gate|permissions?|security|auth|role|operator-only|access control)\b/,
      /\bmake\b.*\b(apex os|private assistant|jarvis)\b.*\b(field|customer|demo|contractor|contractor-facing|customer-facing)\b/,
      /\b(fields?|customers?|demos?|contractors?|contractor-facing|customer-facing)\b.*\b(access|visible|show|enable|allow)\b.*\b(apex os|operator|private assistant|jarvis|memory|tasks?|reminders?|agent control)\b/,
    ])
  ) {
    return classificationBase({
      actionId: "forbidden-permission-boundary-change",
      domain: APEX_OS_ACTION_DOMAIN.AUTH,
      riskTier: APEX_OS_ACTION_RISK_TIER.FORBIDDEN,
      allowed: false,
      requiresApproval: false,
      forbidden: true,
      reason: "Weakening approval gates or exposing Apex OS to field/customer/demo users is forbidden in the current plan.",
      safeAlternative: "I can document the boundary or prepare a separate future phase proposal for review.",
    });
  }

  if (
    matchesAny(normalized, [
      /\b(auto|automatic|automatically|autonomous|autonomously|without (?:approval|asking))\b.*\b(send|sms|text|email|message|spend|buy|purchase|order|charge|pay)\b/,
      /\b(send|sms|text|email|message|spend|buy|purchase|order|charge|pay)\b.*\b(auto|automatic|automatically|autonomous|autonomously|without (?:approval|asking))\b/,
      /\b(bypass|skip)\b.*\bapproval\b.*\b(send|spend|deploy|delete|production|payment|booking|order)\b/,
      /\b(delete|destroy|wipe|drop)\b.*\b(production|prod)\b.*\b(without approval|automatically|autonomous|bypass)\b/,
    ])
  ) {
    return classificationBase({
      actionId: "forbidden-automatic-external-action",
      domain: APEX_OS_ACTION_DOMAIN.SYSTEM,
      riskTier: APEX_OS_ACTION_RISK_TIER.FORBIDDEN,
      allowed: false,
      requiresApproval: false,
      forbidden: true,
      reason: "Automatic sends, spending, approval bypass, or production destruction without approval is forbidden.",
      safeAlternative: "I can prepare a draft, checklist, or approval packet and wait for John's explicit approval.",
    });
  }

  if (matchesAny(normalized, [/\b(deploy|rollback|release to production|ship to prod|ship to production|production release)\b/])) {
    return classificationBase({
      actionId: "high-risk-deployment",
      domain: APEX_OS_ACTION_DOMAIN.DEPLOYMENT,
      riskTier: APEX_OS_ACTION_RISK_TIER.HIGH_RISK,
      allowed: false,
      requiresApproval: true,
      approvalRequirement: APEX_OS_APPROVAL_REQUIREMENT.APPROVAL_PACKET,
      reason: "Deploys, rollbacks, and production releases are high-risk and require the release gate.",
      safeAlternative: "I can prepare the release checklist, validation plan, rollback plan, and approval packet.",
    });
  }

  if (
    matchesAny(normalized, [
      /\b(change|modify|update|create|delete|remove|reset|rotate|disable|enable|configure|setup|set up)\b.*\b(auth|session|security|password|role|permission|operator access|access gate|login)\b/,
      /\b(auth|session|security|password|role|permission|operator access|access gate|login)\b.*\b(change|modify|update|reset|rotate|disable|enable|configure|setup|set up)\b/,
    ])
  ) {
    return classificationBase({
      actionId: "high-risk-auth-security",
      domain: APEX_OS_ACTION_DOMAIN.AUTH,
      riskTier: APEX_OS_ACTION_RISK_TIER.HIGH_RISK,
      allowed: false,
      requiresApproval: true,
      approvalRequirement: APEX_OS_APPROVAL_REQUIREMENT.APPROVAL_PACKET,
      reason: "Auth, session, role, permission, and security changes are high-risk and require scoped approval.",
      safeAlternative: "I can audit the current boundary and draft an approval packet without changing access.",
    });
  }

  if (matchesAny(normalized, [/\b(schema|database migration|db migration|migration|alter table|drop table|production database structure)\b/])) {
    return classificationBase({
      actionId: "high-risk-schema",
      domain: APEX_OS_ACTION_DOMAIN.SCHEMA,
      riskTier: APEX_OS_ACTION_RISK_TIER.HIGH_RISK,
      allowed: false,
      requiresApproval: true,
      approvalRequirement: APEX_OS_APPROVAL_REQUIREMENT.APPROVAL_PACKET,
      reason: "Schema and database migration work is high-risk and requires scoped approval.",
      safeAlternative: "I can draft the migration plan, risk review, and rollback plan first.",
    });
  }

  if (
    matchesAny(normalized, [
      /\b(production|prod)\b.*\b(change|mutate|write|edit|delete|destroy|wipe|touch|modify|update)\b/,
      /\b(change|mutate|write|edit|delete|destroy|wipe|modify|update)\b.*\b(production|prod)\b/,
      /\bproduction data\b/,
    ])
  ) {
    return classificationBase({
      actionId: "high-risk-production-data",
      domain: APEX_OS_ACTION_DOMAIN.PRODUCTION,
      riskTier: APEX_OS_ACTION_RISK_TIER.HIGH_RISK,
      allowed: false,
      requiresApproval: true,
      approvalRequirement: APEX_OS_APPROVAL_REQUIREMENT.APPROVAL_PACKET,
      reason: "Production data/config changes are high-risk and require explicit approval and rollback planning.",
      safeAlternative: "I can prepare a production impact review and approval packet instead.",
    });
  }

  if (matchesAny(normalized, [/\b(delete|remove|destroy|wipe|drop)\b.*\b(file|folder|data|record|upload|user|history|database|table)\b/])) {
    return classificationBase({
      actionId: "high-risk-deletion",
      domain: APEX_OS_ACTION_DOMAIN.FILES,
      riskTier: APEX_OS_ACTION_RISK_TIER.HIGH_RISK,
      allowed: false,
      requiresApproval: true,
      approvalRequirement: APEX_OS_APPROVAL_REQUIREMENT.APPROVAL_PACKET,
      reason: "Deletion or destructive data/file changes are high-risk and require explicit approval.",
      safeAlternative: "I can identify candidates, draft a cleanup plan, or archive where an existing safe workflow supports it.",
    });
  }

  if (matchesAny(normalized, [/\b(billing|payment|payments|invoice|invoices|subscription|charge|refund|checkout)\b/])) {
    return classificationBase({
      actionId: "approval-required-billing-payment",
      domain: APEX_OS_ACTION_DOMAIN.BILLING,
      riskTier: APEX_OS_ACTION_RISK_TIER.EXTERNAL_ACTION,
      allowed: false,
      requiresApproval: true,
      approvalRequirement: APEX_OS_APPROVAL_REQUIREMENT.APPROVAL_PACKET,
      reason: "Billing, payment, invoice, charge, refund, and subscription actions require approval.",
      safeAlternative: "I can draft the billing note, invoice copy, or approval packet without charging or sending.",
    });
  }

  if (matchesAny(normalized, [/\b(order|buy|purchase|pay for|spend|pizza|food delivery|product order|checkout)\b/])) {
    return classificationBase({
      actionId: "approval-required-ordering-spend",
      domain: APEX_OS_ACTION_DOMAIN.ORDERING,
      riskTier: APEX_OS_ACTION_RISK_TIER.EXTERNAL_ACTION,
      allowed: false,
      requiresApproval: true,
      approvalRequirement: APEX_OS_APPROVAL_REQUIREMENT.EXPLICIT_APPROVAL,
      reason: "Ordering, purchasing, and spending money require John's explicit approval before execution.",
      safeAlternative: "I can compare options, build the order draft, and ask for approval before any purchase.",
    });
  }

  if (matchesAny(normalized, [/\b(book|booking|reserve|reservation|appointment)\b/])) {
    return classificationBase({
      actionId: "approval-required-booking",
      domain: APEX_OS_ACTION_DOMAIN.BOOKING,
      riskTier: APEX_OS_ACTION_RISK_TIER.EXTERNAL_ACTION,
      allowed: false,
      requiresApproval: true,
      approvalRequirement: APEX_OS_APPROVAL_REQUIREMENT.EXPLICIT_APPROVAL,
      reason: "Bookings, reservations, and appointments affect external systems or people and require approval.",
      safeAlternative: "I can research availability or draft the booking details for review.",
    });
  }

  if (
    matchesAny(normalized, [
      /\b(calendar|google calendar|outlook calendar)\b.*\b(create|add|update|write|schedule|invite|move|delete)\b/,
      /\b(create|add|update|write|schedule|invite|move|delete)\b.*\b(calendar|google calendar|outlook calendar)\b/,
    ])
  ) {
    return classificationBase({
      actionId: "approval-required-calendar-write",
      domain: APEX_OS_ACTION_DOMAIN.CALENDAR,
      riskTier: APEX_OS_ACTION_RISK_TIER.EXTERNAL_ACTION,
      allowed: false,
      requiresApproval: true,
      approvalRequirement: APEX_OS_APPROVAL_REQUIREMENT.EXPLICIT_APPROVAL,
      reason: "Calendar writes require approval before Apex OS changes an external calendar.",
      safeAlternative: "I can draft the calendar event details or reminder text privately.",
    });
  }

  if (matchesAny(normalized, [/\b(email)\b/]) && matchesAny(normalized, [/\b(send|reply|forward|notify|deliver)\b/]) && !matchesAny(normalized, [/\b(draft|write a draft|compose a draft|prepare a draft)\b/])) {
    return classificationBase({
      actionId: "approval-required-email",
      domain: APEX_OS_ACTION_DOMAIN.EMAIL,
      riskTier: APEX_OS_ACTION_RISK_TIER.EXTERNAL_ACTION,
      allowed: false,
      requiresApproval: true,
      approvalRequirement: APEX_OS_APPROVAL_REQUIREMENT.EXPLICIT_APPROVAL,
      reason: "Email sends and replies require approval and a gated workflow.",
      safeAlternative: "I can draft the email privately and wait for approval.",
    });
  }

  if (matchesAny(normalized, [/\b(send|text|sms|message|dm|notify|call)\b/]) && !matchesAny(normalized, [/\b(email|remind me|create reminder|add reminder)\b/]) && !matchesAny(normalized, [/\b(draft|write a draft|compose a draft|prepare a draft)\b/])) {
    return classificationBase({
      actionId: "approval-required-messaging",
      domain: APEX_OS_ACTION_DOMAIN.MESSAGING,
      riskTier: APEX_OS_ACTION_RISK_TIER.EXTERNAL_ACTION,
      allowed: false,
      requiresApproval: true,
      approvalRequirement: APEX_OS_APPROVAL_REQUIREMENT.EXPLICIT_APPROVAL,
      reason: "Sending messages, SMS, calls, or notifications requires approval and a gated workflow.",
      safeAlternative: "I can draft the message and wait for explicit approval before any send workflow exists.",
    });
  }

  if (
    matchesAny(normalized, [
      /\b(browser|chrome|desktop|computer|screen|external account|website|portal)\b.*\b(click|type|login|log in|submit|post|publish|change|buy|order|book|send)\b/,
      /\b(click|type|login|log in|submit|post|publish)\b.*\b(browser|chrome|desktop|computer|external account|website|portal)\b/,
    ])
  ) {
    return classificationBase({
      actionId: "approval-required-browser-desktop-external-account",
      domain: matchesAny(normalized, [/\b(desktop|computer|screen)\b/]) ? APEX_OS_ACTION_DOMAIN.DESKTOP : APEX_OS_ACTION_DOMAIN.BROWSER,
      riskTier: APEX_OS_ACTION_RISK_TIER.EXTERNAL_ACTION,
      allowed: false,
      requiresApproval: true,
      approvalRequirement: APEX_OS_APPROVAL_REQUIREMENT.EXPLICIT_APPROVAL,
      reason: "Browser/desktop actions that affect external accounts require approval and future gated tooling.",
      safeAlternative: "I can give step-by-step guidance or prepare a plan without controlling the account.",
    });
  }

  if (matchesAny(normalized, [/\b(play|pause|skip|start)\b.*\b(music|playlist|song|spotify|apple music|focus music)\b/])) {
    return classificationBase({
      actionId: "approval-required-music-control",
      domain: APEX_OS_ACTION_DOMAIN.MUSIC,
      riskTier: APEX_OS_ACTION_RISK_TIER.APPROVAL_REQUIRED,
      allowed: false,
      requiresApproval: true,
      approvalRequirement: APEX_OS_APPROVAL_REQUIREMENT.EXPLICIT_APPROVAL,
      reason: "Music/device control is a future tool layer and cannot execute in Phase 4A.",
      safeAlternative: "I can suggest a focus playlist or write the future control plan.",
    });
  }

  if (matchesAny(normalized, [/\b(write|edit|create|modify|move|rename)\b.*\b(file|folder|downloads|desktop|system path|outside workspace)\b/])) {
    return classificationBase({
      actionId: "approval-required-file-write",
      domain: APEX_OS_ACTION_DOMAIN.FILES,
      riskTier: APEX_OS_ACTION_RISK_TIER.APPROVAL_REQUIRED,
      allowed: false,
      requiresApproval: true,
      approvalRequirement: APEX_OS_APPROVAL_REQUIREMENT.EXPLICIT_APPROVAL,
      reason: "File writes outside a clearly approved workspace scope require approval.",
      safeAlternative: "I can draft the file contents or prepare a scoped implementation plan first.",
    });
  }

  if (matchesAny(normalized, [/\b(create|add|save|update|edit|approve|archive|reject|review)\b.*\b(memory|memories|memory suggestion|suggested memory)\b/])) {
    return classificationBase({
      actionId: "internal-write-memory",
      domain: APEX_OS_ACTION_DOMAIN.MEMORY,
      riskTier: APEX_OS_ACTION_RISK_TIER.INTERNAL_WRITE,
      allowed: true,
      requiresApproval: false,
      approvalRequirement: APEX_OS_APPROVAL_REQUIREMENT.OPERATOR_ENDPOINT,
      reason: "Apex OS memory writes are allowed only through existing operator-only review endpoints.",
      safeAlternative: "I can create or edit a suggested memory for review, not silently treat it as approved truth.",
    });
  }

  if (matchesAny(normalized, [/\b(remind me|create reminder|add reminder|update reminder|create task|add task|update task|complete task|archive task|todo|to-do)\b/])) {
    return classificationBase({
      actionId: "internal-write-tasks-reminders",
      domain: APEX_OS_ACTION_DOMAIN.TASKS,
      riskTier: APEX_OS_ACTION_RISK_TIER.INTERNAL_WRITE,
      allowed: true,
      requiresApproval: false,
      approvalRequirement: APEX_OS_APPROVAL_REQUIREMENT.OPERATOR_ENDPOINT,
      reason: "Private Apex OS task/reminder writes are allowed only through existing operator-only internal endpoints.",
      safeAlternative: "I can draft the task/reminder details for confirmation if the endpoint is not available.",
    });
  }

  if (matchesAny(normalized, [/\b(create|add|save|update|edit|archive)\b.*\b(private plan|internal plan|planning record|priority|note)\b/])) {
    return classificationBase({
      actionId: "internal-write-planning",
      domain: APEX_OS_ACTION_DOMAIN.PLANNING,
      riskTier: APEX_OS_ACTION_RISK_TIER.INTERNAL_WRITE,
      allowed: true,
      requiresApproval: false,
      approvalRequirement: APEX_OS_APPROVAL_REQUIREMENT.OPERATOR_ENDPOINT,
      reason: "Private planning writes are allowed only inside operator-only internal workflows.",
      safeAlternative: "I can draft or organize the plan in chat if no persistence endpoint is available.",
    });
  }

  if (matchesAny(normalized, [/\b(research|look up|find sources|source-aware|what changed since last time)\b/])) {
    return classificationBase({
      actionId: "safe-read-research",
      domain: APEX_OS_ACTION_DOMAIN.RESEARCH,
      riskTier: APEX_OS_ACTION_RISK_TIER.SAFE_READ,
      allowed: true,
      requiresApproval: false,
      approvalRequirement: APEX_OS_APPROVAL_REQUIREMENT.NONE,
      reason: "Research and source-aware answering are safe read/planning work when no external action is executed.",
      safeAlternative: "I can summarize sources and save useful findings as reviewable notes later.",
    });
  }

  if (
    matchesAny(normalized, [
      /\bwhat\s+(?:do|did|have)\s+you\s+(?:remember|know|learn|remembered|learned)\b/,
      /\bwhat\s+(?:are|is)\s+my\s+(?:preferences?|priorit(?:y|ies)|memories|memory|context)\b/,
      /\b(?:tell me|summarize|show me|read)\b.*\b(?:approved memory|memory|memories|what you remember|what you learned|my preferences?)\b/,
    ])
  ) {
    return classificationBase({
      actionId: "safe-read-approved-memory",
      domain: APEX_OS_ACTION_DOMAIN.MEMORY,
      riskTier: APEX_OS_ACTION_RISK_TIER.SAFE_READ,
      allowed: true,
      requiresApproval: false,
      approvalRequirement: APEX_OS_APPROVAL_REQUIREMENT.NONE,
      reason: "Reading approved operator-only Apex memory is safe when no new memory, file, external action, or mutation is requested.",
      safeAlternative: "I can answer from approved memory and ignore unapproved draft memory.",
    });
  }

  if (matchesAny(normalized, [/\b(status|state|summary|summarize|review|read)\b.*\b(apex hq|apex os|internal|operator|tasks?|reminders?|memory|project|docs?|files?)\b/])) {
    return classificationBase({
      actionId: "safe-read-internal-status",
      domain: APEX_OS_ACTION_DOMAIN.APEX_HQ,
      riskTier: APEX_OS_ACTION_RISK_TIER.SAFE_READ,
      allowed: true,
      requiresApproval: false,
      approvalRequirement: APEX_OS_APPROVAL_REQUIREMENT.NONE,
      reason: "Reading already-authorized operator-only internal context is safe when no mutation is requested.",
      safeAlternative: "I can summarize only the authorized internal context provided to Apex OS.",
    });
  }

  if (
    matchesAny(normalized, [
      /\b(answer|tell me|explain|what is|what's|why|how|summarize|classify|intent|draft|write|plan|make a plan|help me think)\b/,
      /\b(suggest)\b.*\b(memory draft|plan|next step|priority)\b/,
    ])
  ) {
    return classificationBase({
      actionId: "safe-answer-or-draft",
      domain: matchesAny(normalized, [/\b(plan|priority|next step)\b/]) ? APEX_OS_ACTION_DOMAIN.PLANNING : APEX_OS_ACTION_DOMAIN.CONVERSATION,
      riskTier: APEX_OS_ACTION_RISK_TIER.SAFE_ANSWER,
      allowed: true,
      requiresApproval: false,
      approvalRequirement: APEX_OS_APPROVAL_REQUIREMENT.NONE,
      reason: "Answering, drafting, summarizing, classifying intent, and planning are safe when Apex OS does not execute external actions.",
      safeAlternative: "I can keep this as a private draft or plan.",
    });
  }

  return classificationBase({
    actionId: "unknown-action-approval-required",
    domain: explicitDomain || APEX_OS_ACTION_DOMAIN.SYSTEM,
    riskTier: APEX_OS_ACTION_RISK_TIER.APPROVAL_REQUIRED,
    allowed: false,
    requiresApproval: true,
    approvalRequirement: APEX_OS_APPROVAL_REQUIREMENT.EXPLICIT_APPROVAL,
    reason: "Unknown or unclear Apex OS actions default to approval-required instead of safe.",
    safeAlternative: "I can ask for clarification, draft a plan, or classify the request before any execution path is considered.",
  });
}

export function buildApexOsActionPermissionSummary(action = {}) {
  const classification = action?.riskTier ? action : classifyApexOsAction(action);
  const status = classification.forbidden
    ? "forbidden"
    : classification.requiresApproval
      ? "approval required"
      : classification.allowed
        ? "allowed for private preparation"
        : "not allowed";
  return Object.freeze({
    actionId: classification.actionId,
    domain: classification.domain,
    riskTier: classification.riskTier,
    allowed: classification.allowed,
    requiresApproval: classification.requiresApproval,
    forbidden: classification.forbidden,
    approvalRequirement: classification.approvalRequirement,
    requiredApprovalLabel: classification.requiredApprovalLabel,
    canExecuteNow: false,
    safeAlternative: classification.safeAlternative,
    summaryText: text(`Action classified as ${classification.riskTier} in ${classification.domain}: ${status}. ${classification.requiredApprovalLabel}. ${classification.reason} canExecuteNow=false.`, 420),
  });
}
