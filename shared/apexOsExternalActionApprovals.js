import {
  APEX_OS_ACTION_DOMAIN,
  APEX_OS_ACTION_RISK_TIER,
} from "./apexOsActionPermissions.js";
import {
  getApexOsApprovalPacketMissingFields,
  isApexOsApprovalPacketReady,
  normalizeApexOsApprovalPacket,
  redactApexOsApprovalPacketText,
  scoreApexOsApprovalPacketRisk,
} from "./apexOsApprovalPackets.js";
import { APEX_OS_PRIVACY_ACTION } from "./apexOsPrivacyFirewall.js";
import {
  APEX_OS_TOOL_ROUTE,
  APEX_OS_TOOL_ROUTE_STATUS,
  buildApexOsToolRouteSummary,
  enforceApexOsToolRouteNoExecution,
  planApexOsToolRoute,
} from "./apexOsToolRouter.js";
import {
  APEX_OS_TRACE_EVENT_TYPE,
  APEX_OS_TRACE_SOURCE,
  APEX_OS_TRACE_STATUS,
  createApexOsTraceEntry,
} from "./apexOsTraceLog.js";
import { buildApexOsUntrustedContentSummary } from "./apexOsUntrustedContentFirewall.js";

export const APEX_OS_EXTERNAL_APPROVAL_STATUS = Object.freeze({
  NOT_REQUIRED: "not-required",
  DRAFT_AVAILABLE: "draft-available",
  FUTURE_TOOL_PLANNED: "future-tool-planned",
  BLOCKED: "blocked",
  FORBIDDEN: "forbidden",
  UNAVAILABLE: "unavailable",
});

export const APEX_OS_EXTERNAL_APPROVAL_STATUSES = Object.freeze(Object.values(APEX_OS_EXTERNAL_APPROVAL_STATUS));

export const APEX_OS_EXTERNAL_APPROVAL_SCOPE = Object.freeze({
  INTERNAL_ONLY: "internal-only",
  EXTERNAL_ACTION: "external-action",
  HIGH_RISK: "high-risk",
  FUTURE_TOOL: "future-tool",
  BLOCKED: "blocked",
});

export const APEX_OS_EXTERNAL_APPROVAL_SCOPES = Object.freeze(Object.values(APEX_OS_EXTERNAL_APPROVAL_SCOPE));

const TEXT_LIMIT = 1000;
const SHORT_LIMIT = 160;

const ROUTE_TO_CATEGORY = Object.freeze({
  [APEX_OS_TOOL_ROUTE.ORDERING_PLAN]: "ordering",
  [APEX_OS_TOOL_ROUTE.BOOKING_PLAN]: "booking",
  [APEX_OS_TOOL_ROUTE.MESSAGING_PLAN]: "messaging",
  [APEX_OS_TOOL_ROUTE.EMAIL_PLAN]: "email",
  [APEX_OS_TOOL_ROUTE.CALENDAR_PLAN]: "calendar",
  [APEX_OS_TOOL_ROUTE.DEPLOYMENT_PLAN]: "deploy",
  [APEX_OS_TOOL_ROUTE.PRODUCTION_PLAN]: "production-data",
  [APEX_OS_TOOL_ROUTE.FILE_WRITE_PLAN]: "file-write",
  [APEX_OS_TOOL_ROUTE.BROWSER_PLAN]: "browser-desktop",
  [APEX_OS_TOOL_ROUTE.DESKTOP_PLAN]: "browser-desktop",
  [APEX_OS_TOOL_ROUTE.MUSIC_PLAN]: "music",
});

const DOMAIN_TO_CATEGORY = Object.freeze({
  [APEX_OS_ACTION_DOMAIN.ORDERING]: "ordering",
  [APEX_OS_ACTION_DOMAIN.BOOKING]: "booking",
  [APEX_OS_ACTION_DOMAIN.MESSAGING]: "messaging",
  [APEX_OS_ACTION_DOMAIN.EMAIL]: "email",
  [APEX_OS_ACTION_DOMAIN.CALENDAR]: "calendar",
  [APEX_OS_ACTION_DOMAIN.DEPLOYMENT]: "deploy",
  [APEX_OS_ACTION_DOMAIN.PRODUCTION]: "production-data",
  [APEX_OS_ACTION_DOMAIN.AUTH]: "schema-auth-session",
  [APEX_OS_ACTION_DOMAIN.SCHEMA]: "schema-auth-session",
  [APEX_OS_ACTION_DOMAIN.BILLING]: "billing-payment",
  [APEX_OS_ACTION_DOMAIN.FILES]: "file-write",
  [APEX_OS_ACTION_DOMAIN.BROWSER]: "browser-desktop",
  [APEX_OS_ACTION_DOMAIN.DESKTOP]: "browser-desktop",
  [APEX_OS_ACTION_DOMAIN.MUSIC]: "music",
});

const CATEGORY_APPROVAL_PHRASES = Object.freeze({
  deploy: "BACKUP_FIRST_PRODUCTION_RELEASE_APPROVED",
  "production-data": "PRODUCTION_DATA_ACTION_APPROVED",
  "schema-auth-session": "SCHEMA_AUTH_SESSION_CHANGE_APPROVED",
  "customer-visible": "CUSTOMER_VISIBLE_ACTION_APPROVED",
  "email-sms": "CUSTOMER_MESSAGE_SEND_APPROVED",
  email: "EXTERNAL_EMAIL_SEND_APPROVED",
  messaging: "EXTERNAL_MESSAGE_SEND_APPROVED",
  calendar: "EXTERNAL_CALENDAR_WRITE_APPROVED",
  ordering: "EXTERNAL_ORDER_APPROVED",
  booking: "EXTERNAL_BOOKING_APPROVED",
  "billing-payment": "LIVE_MONEY_ACTION_APPROVED",
  "ad-spend-publishing": "AD_SPEND_OR_PUBLICATION_APPROVED",
  "provider-connection": "PROVIDER_CONNECTION_APPROVED",
  "file-deletion": "FILE_DELETION_APPROVED",
  "file-write": "EXTERNAL_FILE_WRITE_APPROVED",
  "browser-desktop": "EXTERNAL_BROWSER_DESKTOP_CONTROL_APPROVED",
  music: "EXTERNAL_MUSIC_CONTROL_APPROVED",
  "external-action": "EXTERNAL_ACTION_APPROVED",
  release: "BACKUP_FIRST_PRODUCTION_RELEASE_APPROVED",
  "business-operations": "PRIVATE_BUSINESS_OPERATION_APPROVED",
  general: "APEX_OS_ACTION_APPROVED",
});

const CATEGORY_EVIDENCE = Object.freeze({
  deploy: ["tests/build", "backup", "rollback", "hosted smoke"],
  "production-data": ["affected records/config", "backup/export", "rollback", "operator confirmation"],
  "schema-auth-session": ["migration plan", "role tests", "rollback", "permission boundary proof"],
  "customer-visible": ["audience/scope", "copy/preview", "review owner", "reversal path"],
  email: ["recipient scope", "subject/body copy", "attachments", "send timing"],
  messaging: ["recipient scope", "message copy", "channel", "send timing"],
  calendar: ["calendar scope", "event details", "attendees", "notification behavior"],
  ordering: ["merchant", "item details", "total cost", "delivery/pickup", "cancel/refund path"],
  booking: ["provider/venue", "date/time", "party/attendees", "cost/cancellation"],
  "billing-payment": ["amount/scope", "provider readiness", "receipt/tax plan", "refund path"],
  "ad-spend-publishing": ["budget", "audience", "creative/copy", "stop condition"],
  "provider-connection": ["secret plan", "scopes", "health check", "disconnect path"],
  "file-deletion": ["target path/data", "backup", "validation", "rollback"],
  "file-write": ["target path", "change summary", "checkpoint/backup", "validation", "rollback"],
  "browser-desktop": ["target app/site", "allowed inputs", "blocked actions", "stop path"],
  music: ["service/device", "playback action", "volume/context", "stop path"],
  "external-action": ["target system", "allowed action", "blocked action", "rollback/cancel path"],
  "business-operations": ["scope", "owner review", "validation", "rollback"],
  general: ["scope", "validation", "rollback", "approval phrase"],
});

function text(value = "", limit = TEXT_LIMIT) {
  return String(value ?? "").replace(/\s+\n/g, "\n").replace(/\s+/g, " ").trim().slice(0, limit);
}

function lower(value = "") {
  return text(value).toLowerCase();
}

function normalizeEnum(value = "", values = [], fallback = "") {
  const normalized = lower(value).replace(/_/g, "-");
  return values.includes(normalized) ? normalized : fallback;
}

export function normalizeApexOsExternalApprovalStatus(value = APEX_OS_EXTERNAL_APPROVAL_STATUS.UNAVAILABLE) {
  return normalizeEnum(value, APEX_OS_EXTERNAL_APPROVAL_STATUSES, APEX_OS_EXTERNAL_APPROVAL_STATUS.UNAVAILABLE);
}

export function normalizeApexOsExternalApprovalScope(value = APEX_OS_EXTERNAL_APPROVAL_SCOPE.INTERNAL_ONLY) {
  return normalizeEnum(value, APEX_OS_EXTERNAL_APPROVAL_SCOPES, APEX_OS_EXTERNAL_APPROVAL_SCOPE.INTERNAL_ONLY);
}

export function enforceApexOsExternalApprovalNoExecution(plan = {}) {
  return Object.freeze({
    ...plan,
    canExecuteNow: false,
    canExecuteAfterApproval: false,
    executionLocked: true,
    executionStatus: "approval-record-only-no-execution",
  });
}

function routePlanFromInput(input = {}) {
  if (input.toolRoutePlan?.routeId) return enforceApexOsToolRouteNoExecution(input.toolRoutePlan);
  if (input.routePlan?.routeId) return enforceApexOsToolRouteNoExecution(input.routePlan);
  if (input.toolRouteSummary?.routeId) return enforceApexOsToolRouteNoExecution({
    routeId: input.toolRouteSummary.routeId,
    routeCategory: input.toolRouteSummary.routeCategory,
    routeStatus: input.toolRouteSummary.routeStatus,
    skillId: input.toolRouteSummary.skillId,
    actionDomain: input.toolRouteSummary.actionDomain,
    riskTier: input.toolRouteSummary.riskTier,
    privacyAction: input.toolRouteSummary.privacyAction,
    modelRoute: input.toolRouteSummary.modelRoute,
    requiresApproval: Boolean(input.toolRouteSummary.requiresApproval),
    forbidden: Boolean(input.toolRouteSummary.forbidden),
    blocked: Boolean(input.toolRouteSummary.blocked),
    untrustedContentRiskLevel: input.toolRouteSummary.untrustedContentRiskLevel,
    untrustedContentBlocked: Boolean(input.toolRouteSummary.untrustedContentBlocked),
    untrustedContentRequiresReview: Boolean(input.toolRouteSummary.untrustedContentRequiresReview),
    untrustedContentFirewallSummary: input.toolRouteSummary.untrustedContentFirewallSummary || input.untrustedContentFirewallSummary,
    nextStepLabel: input.toolRouteSummary.nextStepLabel,
    safeAlternative: input.toolRouteSummary.safeAlternative,
    reason: input.toolRouteSummary.summaryText || "",
  });
  if (input.externalActionApprovalSummary?.routeId) return enforceApexOsToolRouteNoExecution({
    routeId: input.externalActionApprovalSummary.routeId,
    routeStatus: input.externalActionApprovalSummary.routeStatus,
    actionDomain: input.externalActionApprovalSummary.actionDomain || "",
    riskTier: input.externalActionApprovalSummary.riskTier || "",
    requiresApproval: Boolean(input.externalActionApprovalSummary.approvalRequired || input.externalActionApprovalSummary.approvalPacketRecommended),
    forbidden: input.externalActionApprovalSummary.approvalStatus === APEX_OS_EXTERNAL_APPROVAL_STATUS.FORBIDDEN,
    blocked: input.externalActionApprovalSummary.approvalStatus === APEX_OS_EXTERNAL_APPROVAL_STATUS.BLOCKED,
    untrustedContentRiskLevel: input.externalActionApprovalSummary.untrustedContentRiskLevel,
    untrustedContentBlocked: Boolean(input.externalActionApprovalSummary.untrustedContentBlocked),
    untrustedContentRequiresReview: Boolean(input.externalActionApprovalSummary.untrustedContentRequiresReview),
    untrustedContentFirewallSummary: input.externalActionApprovalSummary.untrustedContentFirewallSummary || input.untrustedContentFirewallSummary,
    nextStepLabel: input.externalActionApprovalSummary.nextStepLabel,
    safeAlternative: input.externalActionApprovalSummary.safeAlternative,
    reason: input.externalActionApprovalSummary.summaryText || "",
  });
  return planApexOsToolRoute({
    description: input.requestSummary || input.description || input.question || "",
    assistantMode: input.assistantMode || "",
    actionPermissionSummary: input.actionPermissionSummary,
    modelRoutingSummary: input.modelRoutingSummary,
    privacyFirewallSummary: input.privacyFirewallSummary,
    skillRegistrySummary: input.skillRegistrySummary,
    untrustedContentFirewallSummary: input.untrustedContentFirewallSummary,
  });
}

function untrustedContentSummaryFromInput(input = {}, routePlan = {}) {
  if (input.untrustedContentFirewallSummary?.highestRiskLevel) return input.untrustedContentFirewallSummary;
  if (routePlan.untrustedContentFirewallSummary?.highestRiskLevel) return routePlan.untrustedContentFirewallSummary;
  return buildApexOsUntrustedContentSummary([]);
}

function untrustedContentApprovalWarning(summary = {}) {
  if (!summary?.totalCount) return "";
  if (summary.blocked || summary.blockedCount > 0) {
    return `Untrusted Content Firewall blocked source context. highestRisk=${summary.highestRiskLevel}; patterns=${summary.detectedPatternCount || 0}; canExecuteNow=false.`;
  }
  if (summary.requiresOperatorReview || summary.requiresOperatorReviewCount > 0) {
    return `Untrusted Content Firewall requires operator review before using source context. highestRisk=${summary.highestRiskLevel}; patterns=${summary.detectedPatternCount || 0}; canExecuteNow=false.`;
  }
  if (summary.untrustedCount > 0) {
    return `Route used sanitized untrusted context as data only. highestRisk=${summary.highestRiskLevel}; tools=${summary.safeToRouteTools}; canExecuteNow=false.`;
  }
  return "";
}

function approvalCategoryForRoute(routePlan = {}) {
  if (routePlan.actionDomain && DOMAIN_TO_CATEGORY[routePlan.actionDomain]) return DOMAIN_TO_CATEGORY[routePlan.actionDomain];
  if (routePlan.routeId && ROUTE_TO_CATEGORY[routePlan.routeId]) return ROUTE_TO_CATEGORY[routePlan.routeId];
  return routePlan.requiresApproval ? "external-action" : "general";
}

function riskLevelForRoute(routePlan = {}, requestedActionCategory = "general") {
  if (routePlan.riskTier === APEX_OS_ACTION_RISK_TIER.HIGH_RISK) return "critical";
  if (["deploy", "production-data", "schema-auth-session", "billing-payment", "file-deletion"].includes(requestedActionCategory)) return "critical";
  if ([
    APEX_OS_ACTION_RISK_TIER.EXTERNAL_ACTION,
    APEX_OS_ACTION_RISK_TIER.APPROVAL_REQUIRED,
  ].includes(routePlan.riskTier)) return requestedActionCategory === "music" ? "medium" : "high";
  return "medium";
}

function approvalStatusForRoute(routePlan = {}) {
  if (routePlan.forbidden || routePlan.routeStatus === APEX_OS_TOOL_ROUTE_STATUS.FORBIDDEN) {
    return APEX_OS_EXTERNAL_APPROVAL_STATUS.FORBIDDEN;
  }
  if (routePlan.blocked || routePlan.privacyAction === APEX_OS_PRIVACY_ACTION.BLOCK || routePlan.routeStatus === APEX_OS_TOOL_ROUTE_STATUS.BLOCKED) {
    return APEX_OS_EXTERNAL_APPROVAL_STATUS.BLOCKED;
  }
  if (routePlan.routeStatus === APEX_OS_TOOL_ROUTE_STATUS.PLANNED && routePlan.requiresApproval) {
    return APEX_OS_EXTERNAL_APPROVAL_STATUS.FUTURE_TOOL_PLANNED;
  }
  if (routePlan.requiresApproval || routePlan.routeStatus === APEX_OS_TOOL_ROUTE_STATUS.APPROVAL_REQUIRED) {
    return APEX_OS_EXTERNAL_APPROVAL_STATUS.DRAFT_AVAILABLE;
  }
  return APEX_OS_EXTERNAL_APPROVAL_STATUS.NOT_REQUIRED;
}

function approvalScopeForStatus(status = "", routePlan = {}) {
  const normalized = normalizeApexOsExternalApprovalStatus(status);
  if ([APEX_OS_EXTERNAL_APPROVAL_STATUS.BLOCKED, APEX_OS_EXTERNAL_APPROVAL_STATUS.FORBIDDEN].includes(normalized)) {
    return APEX_OS_EXTERNAL_APPROVAL_SCOPE.BLOCKED;
  }
  if (normalized === APEX_OS_EXTERNAL_APPROVAL_STATUS.FUTURE_TOOL_PLANNED) {
    return APEX_OS_EXTERNAL_APPROVAL_SCOPE.FUTURE_TOOL;
  }
  if (routePlan.riskTier === APEX_OS_ACTION_RISK_TIER.HIGH_RISK) return APEX_OS_EXTERNAL_APPROVAL_SCOPE.HIGH_RISK;
  if (routePlan.requiresApproval || routePlan.routeStatus === APEX_OS_TOOL_ROUTE_STATUS.APPROVAL_REQUIRED) {
    return APEX_OS_EXTERNAL_APPROVAL_SCOPE.EXTERNAL_ACTION;
  }
  return APEX_OS_EXTERNAL_APPROVAL_SCOPE.INTERNAL_ONLY;
}

function traceStatusForApproval(status = "") {
  if (status === APEX_OS_EXTERNAL_APPROVAL_STATUS.FORBIDDEN) return APEX_OS_TRACE_STATUS.FORBIDDEN;
  if (status === APEX_OS_EXTERNAL_APPROVAL_STATUS.BLOCKED) return APEX_OS_TRACE_STATUS.BLOCKED;
  if ([APEX_OS_EXTERNAL_APPROVAL_STATUS.DRAFT_AVAILABLE, APEX_OS_EXTERNAL_APPROVAL_STATUS.FUTURE_TOOL_PLANNED].includes(status)) return APEX_OS_TRACE_STATUS.APPROVAL_REQUIRED;
  return APEX_OS_TRACE_STATUS.SKIPPED;
}

function sourceUriFromRequest(requestId = "", routeId = "") {
  const id = text(requestId, 90) || "manual";
  const route = text(routeId, 90) || "external-action";
  return `ask-apex:${id}:${route}:external-approval`;
}

function routeTitle(routePlan = {}) {
  const routeId = text(routePlan.routeId, SHORT_LIMIT) || "external action";
  return routeId
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function buildApexOsExternalActionApprovalDraft(input = {}) {
  const routePlan = routePlanFromInput(input);
  const approvalStatus = approvalStatusForRoute(routePlan);
  if ([
    APEX_OS_EXTERNAL_APPROVAL_STATUS.NOT_REQUIRED,
    APEX_OS_EXTERNAL_APPROVAL_STATUS.BLOCKED,
    APEX_OS_EXTERNAL_APPROVAL_STATUS.FORBIDDEN,
    APEX_OS_EXTERNAL_APPROVAL_STATUS.UNAVAILABLE,
  ].includes(approvalStatus)) return null;
  const requestedActionCategory = approvalCategoryForRoute(routePlan);
  const riskLevel = riskLevelForRoute(routePlan, requestedActionCategory);
  const requestSummary = redactApexOsApprovalPacketText(input.requestSummary || input.question || input.description || input.answerSummary || "", 700);
  const routeSummary = buildApexOsToolRouteSummary(routePlan);
  const status = "draft";
  const exactApprovalPhrase = CATEGORY_APPROVAL_PHRASES[requestedActionCategory] || CATEGORY_APPROVAL_PHRASES["external-action"];
  const evidence = CATEGORY_EVIDENCE[requestedActionCategory] || CATEGORY_EVIDENCE.general;
  const untrustedContentFirewallSummary = untrustedContentSummaryFromInput(input, routePlan);
  const untrustedContentWarning = untrustedContentApprovalWarning(untrustedContentFirewallSummary);
  return normalizeApexOsApprovalPacket({
    title: text(`External approval: ${routeTitle(routePlan)}`, 140),
    requestedActionCategory,
    riskLevel,
    status,
    action: text([
      `Review-only external action approval draft for route ${routePlan.routeId}.`,
      requestSummary ? `Request summary: ${requestSummary}.` : "",
      `Tool route status: ${routePlan.routeStatus}.`,
      untrustedContentWarning,
      "This packet does not execute the action, queue work, send messages, spend money, control devices, mutate production, or touch external systems.",
    ].filter(Boolean).join(" "), 1800),
    reason: text(routePlan.reason || routeSummary.summaryText || "Tool Router marked this request as approval-gated.", 1800),
    affectedScope: text(`Route category: ${routePlan.routeCategory || "unknown"}. Action domain: ${routePlan.actionDomain || "unknown"}. Approval scope: ${approvalScopeForStatus(approvalStatus, routePlan)}. Execution remains locked even if this packet is approved.`, 1800),
    validationPlan: text(`Before any later execution-capable phase, verify: ${evidence.join(", ")}. Confirm no secrets, raw credentials, hidden tracking, customer-visible action, send, spend, deploy, production mutation, account/provider change, or unreviewed untrusted-source instruction occurs outside the approved scope.`, 1800),
    rollbackPlan: "Archive or reject this packet if approval is not granted. If a later separate execution phase is approved, require a tool-specific cancel/reversal path before execution.",
    exactApprovalPhrase,
    sourceLabel: input.sourceLabel || "Apex OS Tool Router",
    sourceUri: input.sourceUri || sourceUriFromRequest(input.requestId, routePlan.routeId),
    sourceRouteId: routePlan.routeId,
    sourceRouteStatus: routePlan.routeStatus,
    sourceActionDomain: routePlan.actionDomain,
    approvalSystemPhase: "phase-5b-external-action-approval",
    executionGate: "approval-record-only-no-execution",
    operatorNote: text(`Phase 5B/5C can prepare and record approval review only. canExecuteNow=false; canExecuteAfterApproval=false. ${untrustedContentWarning ? `${untrustedContentWarning} ` : ""}Safe alternative: ${routePlan.safeAlternative || "prepare a private plan."}`, 420),
  });
}

export function buildApexOsExternalActionApprovalSummary(input = {}) {
  const routePlan = routePlanFromInput(input);
  const approvalStatus = approvalStatusForRoute(routePlan);
  const approvalScope = approvalScopeForStatus(approvalStatus, routePlan);
  const untrustedContentFirewallSummary = untrustedContentSummaryFromInput(input, routePlan);
  const untrustedContentWarning = untrustedContentApprovalWarning(untrustedContentFirewallSummary);
  const approvalPacketDraft = buildApexOsExternalActionApprovalDraft({ ...input, toolRoutePlan: routePlan });
  const approvalPacketRecommended = Boolean(approvalPacketDraft);
  const traceMetadata = createApexOsTraceEntry({
    eventType: APEX_OS_TRACE_EVENT_TYPE.APPROVAL_REQUIRED,
    source: APEX_OS_TRACE_SOURCE.APPROVAL_GATE,
    status: traceStatusForApproval(approvalStatus),
    route: routePlan.routeId,
    actionDomain: routePlan.actionDomain,
    riskTier: routePlan.riskTier,
    approvalRequired: approvalPacketRecommended,
    forbidden: approvalStatus === APEX_OS_EXTERNAL_APPROVAL_STATUS.FORBIDDEN,
    canExecuteNow: false,
    reasonCode: `external-approval-${approvalStatus}`,
    safeMessage: approvalPacketRecommended
      ? "External action approval draft is available without execution."
      : "External action approval draft is not required for this route.",
  });
  const missingFields = approvalPacketDraft ? getApexOsApprovalPacketMissingFields(approvalPacketDraft) : [];
  const riskAssessment = approvalPacketDraft ? scoreApexOsApprovalPacketRisk(approvalPacketDraft) : null;
  const readyToReview = approvalPacketDraft ? isApexOsApprovalPacketReady(approvalPacketDraft) : false;
  return enforceApexOsExternalApprovalNoExecution({
    approvalStatus,
    approvalScope,
    routeId: routePlan.routeId,
    routeStatus: routePlan.routeStatus,
    actionDomain: routePlan.actionDomain,
    riskTier: routePlan.riskTier,
    requestedActionCategory: approvalPacketDraft?.requestedActionCategory || approvalCategoryForRoute(routePlan),
    riskLevel: approvalPacketDraft?.riskLevel || riskLevelForRoute(routePlan, approvalCategoryForRoute(routePlan)),
    untrustedContentRiskLevel: untrustedContentFirewallSummary.highestRiskLevel || routePlan.untrustedContentRiskLevel || "none",
    untrustedContentBlocked: Boolean(untrustedContentFirewallSummary.blocked || routePlan.untrustedContentBlocked),
    untrustedContentRequiresReview: Boolean(untrustedContentFirewallSummary.requiresOperatorReview || routePlan.untrustedContentRequiresReview),
    untrustedContentWarning,
    untrustedContentFirewallSummary,
    approvalRequired: approvalPacketRecommended,
    approvalPacketRecommended,
    approvalPacketDraftAvailable: approvalPacketRecommended,
    exactApprovalPhraseRequired: Boolean(approvalPacketDraft?.exactApprovalPhrase),
    exactApprovalPhrase: approvalPacketDraft?.exactApprovalPhrase || "",
    requiredEvidence: CATEGORY_EVIDENCE[approvalPacketDraft?.requestedActionCategory || approvalCategoryForRoute(routePlan)] || CATEGORY_EVIDENCE.general,
    missingFields,
    readyToReview,
    riskAssessment,
    reason: approvalPacketRecommended
      ? "Apex OS can prepare an approval packet record, but approval still does not execute the action."
      : approvalStatus === APEX_OS_EXTERNAL_APPROVAL_STATUS.NOT_REQUIRED
        ? "This route does not need an external action approval packet."
        : "This route is blocked or unavailable for approval packet drafting.",
    nextStepLabel: approvalPacketRecommended ? "Review approval packet draft" : routePlan.nextStepLabel || "Continue privately",
    safeAlternative: routePlan.safeAlternative || "I can prepare a private plan and stop before execution.",
    summaryText: text(approvalPacketRecommended
      ? `External approval ${approvalStatus} for route ${routePlan.routeId}; category=${approvalPacketDraft.requestedActionCategory}; risk=${approvalPacketDraft.riskLevel}; untrusted=${untrustedContentFirewallSummary.highestRiskLevel || "none"}; canExecuteNow=false; canExecuteAfterApproval=false.`
      : `External approval ${approvalStatus} for route ${routePlan.routeId}; untrusted=${untrustedContentFirewallSummary.highestRiskLevel || "none"}; canExecuteNow=false; canExecuteAfterApproval=false.`,
    520),
    traceMetadata,
  });
}
