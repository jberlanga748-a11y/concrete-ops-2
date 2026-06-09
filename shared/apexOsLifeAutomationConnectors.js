import {
  APEX_OS_ACTION_DOMAIN,
  APEX_OS_ACTION_RISK_TIER,
  buildApexOsActionPermissionSummary,
  classifyApexOsAction,
} from "./apexOsActionPermissions.js";
import {
  APEX_OS_PRIVACY_ACTION,
  APEX_OS_PRIVACY_CONTEXT,
  buildApexOsPrivacySummary,
  classifyApexOsPrivacy,
} from "./apexOsPrivacyFirewall.js";
import {
  APEX_OS_PROMPT_INJECTION_RISK,
  buildApexOsUntrustedContentSummary,
  normalizeApexOsPromptInjectionRisk,
  shouldBlockApexOsUntrustedRoute,
} from "./apexOsUntrustedContentFirewall.js";
import {
  APEX_OS_TRACE_EVENT_TYPE,
  APEX_OS_TRACE_SOURCE,
  APEX_OS_TRACE_STATUS,
  createApexOsTraceEntry,
} from "./apexOsTraceLog.js";

export const APEX_OS_LIFE_AUTOMATION_CONNECTOR_PHASE = "Phase 9";

export const APEX_OS_LIFE_AUTOMATION_CONNECTOR_PLAN_STATE = Object.freeze({
  NOT_REQUESTED: "not-requested",
  PLANNED: "planned",
  APPROVAL_REQUIRED: "approval-required",
  BLOCKED_BY_PRIVACY: "blocked-by-privacy",
  BLOCKED_BY_UNTRUSTED_CONTENT: "blocked-by-untrusted-content",
  FORBIDDEN: "forbidden",
});

export const APEX_OS_LIFE_AUTOMATION_CONNECTOR_PLAN_STATES = Object.freeze(Object.values(APEX_OS_LIFE_AUTOMATION_CONNECTOR_PLAN_STATE));

export const APEX_OS_LIFE_AUTOMATION_CONNECTOR_INTENT = Object.freeze({
  NOT_REQUESTED: "not-requested",
  CONNECTOR_READINESS_PLAN: "connector-readiness-plan",
  ACCOUNT_CONNECTION_PLAN: "account-connection-plan",
  ORDERING_CONNECTOR_PLAN: "ordering-connector-plan",
  BOOKING_CONNECTOR_PLAN: "booking-connector-plan",
  MESSAGING_CONNECTOR_PLAN: "messaging-connector-plan",
  EMAIL_CONNECTOR_PLAN: "email-connector-plan",
  CALENDAR_CONNECTOR_PLAN: "calendar-connector-plan",
  PAYMENT_CONNECTOR_PLAN: "payment-connector-plan",
  DOCUMENT_CONNECTOR_PLAN: "document-connector-plan",
  MULTI_CONNECTOR_PLAN: "multi-connector-plan",
  FORBIDDEN: "forbidden",
});

export const APEX_OS_LIFE_AUTOMATION_CONNECTOR_INTENTS = Object.freeze(Object.values(APEX_OS_LIFE_AUTOMATION_CONNECTOR_INTENT));

export const APEX_OS_LIFE_AUTOMATION_CONNECTOR_RISK_TIER = Object.freeze({
  READINESS_PLAN: "readiness-plan",
  DATA_ACCESS_PLAN: "data-access-plan",
  EXTERNAL_ACCOUNT_PLAN: "external-account-plan",
  EXTERNAL_ACTION_PLAN: "external-action-plan",
  MESSAGE_SEND_PLAN: "message-send-plan",
  MONEY_OR_PAYMENT_PLAN: "money-or-payment-plan",
  CALENDAR_WRITE_PLAN: "calendar-write-plan",
  PRODUCTION_DEPLOY_PLAN: "production-deploy-plan",
  FORBIDDEN: "forbidden",
});

export const APEX_OS_LIFE_AUTOMATION_CONNECTOR_RISK_TIERS = Object.freeze(Object.values(APEX_OS_LIFE_AUTOMATION_CONNECTOR_RISK_TIER));

export const APEX_OS_LIFE_AUTOMATION_CONNECTOR_SURFACE = Object.freeze({
  NONE: "none",
  CONNECTOR: "connector",
  ACCOUNT: "account",
  ORDERING: "ordering",
  BOOKING: "booking",
  MESSAGING: "messaging",
  EMAIL: "email",
  CALENDAR: "calendar",
  PAYMENT: "payment",
  DOCUMENTS: "documents",
  MULTI: "multi",
});

const TEXT_LIMIT = 1000;
const SUMMARY_LIMIT = 560;

const REQUIRED_PRECONDITIONS = Object.freeze([
  "operator-confirms-connector-purpose",
  "operator-confirms-account-and-scope",
  "oauth-or-api-auth-plan-reviewed-without-secrets",
  "privacy-firewall-cleared-or-redacted",
  "untrusted-content-firewall-cleared",
  "approval-boundary-reviewed",
  "revoke-disconnect-and-cancel-path-known",
]);

const PLAN_STEP_IDS = Object.freeze([
  "classify-connector-intent",
  "map-required-connector-type",
  "identify-minimum-scopes-without-connecting",
  "redact-sensitive-inputs-and-credentials",
  "draft-approval-and-revocation-checklist",
  "prepare-approval-packet-if-needed",
  "stop-before-connection-or-execution",
]);

const BLOCKED_ACTION_IDS = Object.freeze([
  "connect-or-authorize-account",
  "start-oauth-flow",
  "store-api-key-token-cookie-or-password",
  "read-inbox-calendar-drive-or-private-account-data",
  "send-email-sms-dm-call-or-notification",
  "place-order-purchase-or-payment",
  "book-reserve-or-schedule-appointment",
  "write-create-update-or-delete-calendar-event",
  "install-plugin-connector-or-webhook",
  "run-connector-sync-import-export-or-automation",
  "deploy-touch-production-or-change-auth-schema",
  "expose-apex-os-to-field-customer-demo-users",
]);

function text(value = "", limit = TEXT_LIMIT) {
  return String(value ?? "").replace(/\s+\n/g, "\n").replace(/\s+/g, " ").trim().slice(0, limit);
}

function lower(value = "") {
  return text(value).toLowerCase();
}

function normalizeEnum(value = "", allowed = [], fallback = "") {
  const normalized = lower(value);
  return allowed.includes(normalized) ? normalized : fallback;
}

function matchesAny(value = "", patterns = []) {
  return patterns.some((pattern) => pattern.test(value));
}

function actionPermissionSummaryFromInput(description = "", input = {}) {
  if (input.actionPermissionSummary?.riskTier) return input.actionPermissionSummary;
  if (input.actionPermission?.riskTier) return buildApexOsActionPermissionSummary(input.actionPermission);
  return buildApexOsActionPermissionSummary(classifyApexOsAction({ description }));
}

function privacySummaryFromInput(description = "", input = {}) {
  if (input.privacyFirewallSummary?.actions) return input.privacyFirewallSummary;
  if (input.privacyResult?.metadata) return buildApexOsPrivacySummary([input.privacyResult]);
  const privacyResult = classifyApexOsPrivacy(description, {
    sourceContext: input.sourceContext || APEX_OS_PRIVACY_CONTEXT.OPERATOR_PRIVATE,
    targetContext: input.targetContext || APEX_OS_PRIVACY_CONTEXT.EXTERNAL_CONNECTOR,
  });
  return buildApexOsPrivacySummary([privacyResult]);
}

function untrustedContentSummaryFromInput(input = {}) {
  if (input.untrustedContentFirewallSummary?.highestRiskLevel) return input.untrustedContentFirewallSummary;
  if (input.untrustedContentResult?.metadata) return buildApexOsUntrustedContentSummary([input.untrustedContentResult]);
  return buildApexOsUntrustedContentSummary([]);
}

function normalizeApexOsLifeAutomationConnectorPlanState(value = APEX_OS_LIFE_AUTOMATION_CONNECTOR_PLAN_STATE.NOT_REQUESTED) {
  return normalizeEnum(value, APEX_OS_LIFE_AUTOMATION_CONNECTOR_PLAN_STATES, APEX_OS_LIFE_AUTOMATION_CONNECTOR_PLAN_STATE.NOT_REQUESTED);
}

function normalizeApexOsLifeAutomationConnectorIntent(value = APEX_OS_LIFE_AUTOMATION_CONNECTOR_INTENT.NOT_REQUESTED) {
  return normalizeEnum(value, APEX_OS_LIFE_AUTOMATION_CONNECTOR_INTENTS, APEX_OS_LIFE_AUTOMATION_CONNECTOR_INTENT.NOT_REQUESTED);
}

function normalizeApexOsLifeAutomationConnectorRiskTier(value = APEX_OS_LIFE_AUTOMATION_CONNECTOR_RISK_TIER.READINESS_PLAN) {
  return normalizeEnum(value, APEX_OS_LIFE_AUTOMATION_CONNECTOR_RISK_TIERS, APEX_OS_LIFE_AUTOMATION_CONNECTOR_RISK_TIER.READINESS_PLAN);
}

function connectorSignals(description = "") {
  const normalized = lower(description);
  const connector = matchesAny(normalized, [/\b(connector|connectors|integration|integrations|api|oauth|webhook|zapier|plugin|adapter|sync|import|export|authorize|authorization)\b/]);
  const accountConnection = matchesAny(normalized, [/\b(connect|link|authorize|grant access|log in|login|sign in|oauth|api key|token|cookie|session|password|mfa|2fa|otp)\b/]);
  const ordering = matchesAny(normalized, [/\b(order|pizza|food delivery|delivery app|buy|purchase|shopping|cart|checkout|merchant|store)\b/]);
  const booking = matchesAny(normalized, [/\b(book|booking|reserve|reservation|appointment|doctor|dentist|hotel|flight|restaurant|venue|provider)\b/]);
  const messaging = matchesAny(normalized, [/\b(text|sms|message|dm|notify|notification|twilio|whatsapp|slack)\b/]);
  const email = matchesAny(normalized, [/\b(email|gmail|mail|inbox|reply|forward|sendgrid)\b/]);
  const calendar = matchesAny(normalized, [/\b(calendar|google calendar|outlook calendar|schedule|meeting|event|invite)\b/]);
  const payment = matchesAny(normalized, [/\b(pay|payment|payments|charge|billing|invoice|refund|subscription|card|bank|checkout)\b/]);
  const documents = matchesAny(normalized, [/\b(google drive|drive|docs|sheets|document|file|folder|dropbox|onedrive)\b/]);
  const planningOnly = matchesAny(normalized, [/\b(plan|draft|design|requirements?|readiness|architecture|checklist|what would|what connector|how would|prepare|future)\b/]);
  const negatedExecution = matchesAny(normalized, [/\b(do not|don't|dont|never|no|without)\b.{0,100}\b(connect|authorize|run|sync|import|export|send|text|email|order|buy|purchase|pay|book|reserve|schedule|write|execute|install|use)\b/]);
  const sendOrWrite = matchesAny(normalized, [/\b(send|reply|forward|text|sms|message|dm|notify|call|invite|write|create|update|delete|schedule)\b/]);
  const orderBookPay = matchesAny(normalized, [/\b(order|buy|purchase|pay|charge|checkout|book|reserve|reservation|appointment)\b/]);
  const connectorRun = matchesAny(normalized, [/\b(run|sync|import|export|install|enable|turn on|activate|execute|use)\b.{0,80}\b(connector|integration|plugin|webhook|api|automation|account|gmail|calendar|drive|twilio|zapier)\b/]);
  const production = matchesAny(normalized, [/\b(deploy|production|prod|rollback|release|schema|auth|session provider|billing provider)\b/]);
  const forbidden = matchesAny(normalized, [
    /\b(hidden|silent|secret|without (?:telling|asking|consent|approval|permission)|don't tell|do not tell)\b/,
    /\b(bypass|skip|circumvent)\b.{0,60}\b(oauth|mfa|2fa|captcha|paywall|approval|permission|login|auth)\b/,
    /\b(capture|extract|steal|copy|save|store|show|reveal|send|use)\b.{0,70}\b(password|cookie|session|token|secret|mfa|2fa|otp|api[_ -]?key|authorization)\b/,
  ]);
  const requested = connector || accountConnection || ordering || booking || messaging || email || calendar || payment || documents;

  return Object.freeze({
    requested,
    connector,
    accountConnection,
    ordering,
    booking,
    messaging,
    email,
    calendar,
    payment,
    documents,
    planningOnly,
    negatedExecution,
    sendOrWrite,
    orderBookPay,
    connectorRun,
    production,
    forbidden,
  });
}

function connectorTypesForSignals(signals = {}) {
  return [
    signals.ordering ? "ordering" : "",
    signals.booking ? "booking" : "",
    signals.messaging ? "messaging" : "",
    signals.email ? "email" : "",
    signals.calendar ? "calendar" : "",
    signals.payment ? "payment" : "",
    signals.documents ? "documents" : "",
    signals.accountConnection ? "account-auth" : "",
  ].filter(Boolean).slice(0, 8);
}

function surfaceForSignals(signals = {}) {
  const connectorTypes = connectorTypesForSignals(signals).filter((entry) => entry !== "account-auth");
  if (!signals.requested) return APEX_OS_LIFE_AUTOMATION_CONNECTOR_SURFACE.NONE;
  if (connectorTypes.length > 1) return APEX_OS_LIFE_AUTOMATION_CONNECTOR_SURFACE.MULTI;
  if (signals.ordering) return APEX_OS_LIFE_AUTOMATION_CONNECTOR_SURFACE.ORDERING;
  if (signals.booking) return APEX_OS_LIFE_AUTOMATION_CONNECTOR_SURFACE.BOOKING;
  if (signals.messaging) return APEX_OS_LIFE_AUTOMATION_CONNECTOR_SURFACE.MESSAGING;
  if (signals.email) return APEX_OS_LIFE_AUTOMATION_CONNECTOR_SURFACE.EMAIL;
  if (signals.calendar) return APEX_OS_LIFE_AUTOMATION_CONNECTOR_SURFACE.CALENDAR;
  if (signals.payment) return APEX_OS_LIFE_AUTOMATION_CONNECTOR_SURFACE.PAYMENT;
  if (signals.documents) return APEX_OS_LIFE_AUTOMATION_CONNECTOR_SURFACE.DOCUMENTS;
  if (signals.accountConnection) return APEX_OS_LIFE_AUTOMATION_CONNECTOR_SURFACE.ACCOUNT;
  return APEX_OS_LIFE_AUTOMATION_CONNECTOR_SURFACE.CONNECTOR;
}

export function detectApexOsLifeAutomationConnectorIntent(description = "") {
  const signals = connectorSignals(description);
  const connectorTypes = connectorTypesForSignals(signals);
  let intent = APEX_OS_LIFE_AUTOMATION_CONNECTOR_INTENT.NOT_REQUESTED;
  let riskTier = APEX_OS_LIFE_AUTOMATION_CONNECTOR_RISK_TIER.READINESS_PLAN;
  const surface = surfaceForSignals(signals);

  if (!signals.requested) {
    return Object.freeze({
      requested: false,
      intent,
      riskTier,
      surface,
      connectorTypes,
      signals,
    });
  }

  if (signals.forbidden) {
    intent = APEX_OS_LIFE_AUTOMATION_CONNECTOR_INTENT.FORBIDDEN;
    riskTier = APEX_OS_LIFE_AUTOMATION_CONNECTOR_RISK_TIER.FORBIDDEN;
  } else if (signals.production) {
    intent = APEX_OS_LIFE_AUTOMATION_CONNECTOR_INTENT.CONNECTOR_READINESS_PLAN;
    riskTier = APEX_OS_LIFE_AUTOMATION_CONNECTOR_RISK_TIER.PRODUCTION_DEPLOY_PLAN;
  } else if (surface === APEX_OS_LIFE_AUTOMATION_CONNECTOR_SURFACE.MULTI) {
    intent = APEX_OS_LIFE_AUTOMATION_CONNECTOR_INTENT.MULTI_CONNECTOR_PLAN;
    riskTier = signals.orderBookPay || signals.payment
      ? APEX_OS_LIFE_AUTOMATION_CONNECTOR_RISK_TIER.MONEY_OR_PAYMENT_PLAN
      : APEX_OS_LIFE_AUTOMATION_CONNECTOR_RISK_TIER.EXTERNAL_ACTION_PLAN;
  } else if (signals.payment) {
    intent = APEX_OS_LIFE_AUTOMATION_CONNECTOR_INTENT.PAYMENT_CONNECTOR_PLAN;
    riskTier = APEX_OS_LIFE_AUTOMATION_CONNECTOR_RISK_TIER.MONEY_OR_PAYMENT_PLAN;
  } else if (signals.ordering) {
    intent = APEX_OS_LIFE_AUTOMATION_CONNECTOR_INTENT.ORDERING_CONNECTOR_PLAN;
    riskTier = APEX_OS_LIFE_AUTOMATION_CONNECTOR_RISK_TIER.MONEY_OR_PAYMENT_PLAN;
  } else if (signals.booking) {
    intent = APEX_OS_LIFE_AUTOMATION_CONNECTOR_INTENT.BOOKING_CONNECTOR_PLAN;
    riskTier = APEX_OS_LIFE_AUTOMATION_CONNECTOR_RISK_TIER.EXTERNAL_ACTION_PLAN;
  } else if (signals.messaging) {
    intent = APEX_OS_LIFE_AUTOMATION_CONNECTOR_INTENT.MESSAGING_CONNECTOR_PLAN;
    riskTier = APEX_OS_LIFE_AUTOMATION_CONNECTOR_RISK_TIER.MESSAGE_SEND_PLAN;
  } else if (signals.email) {
    intent = APEX_OS_LIFE_AUTOMATION_CONNECTOR_INTENT.EMAIL_CONNECTOR_PLAN;
    riskTier = APEX_OS_LIFE_AUTOMATION_CONNECTOR_RISK_TIER.MESSAGE_SEND_PLAN;
  } else if (signals.calendar) {
    intent = APEX_OS_LIFE_AUTOMATION_CONNECTOR_INTENT.CALENDAR_CONNECTOR_PLAN;
    riskTier = APEX_OS_LIFE_AUTOMATION_CONNECTOR_RISK_TIER.CALENDAR_WRITE_PLAN;
  } else if (signals.documents) {
    intent = APEX_OS_LIFE_AUTOMATION_CONNECTOR_INTENT.DOCUMENT_CONNECTOR_PLAN;
    riskTier = APEX_OS_LIFE_AUTOMATION_CONNECTOR_RISK_TIER.DATA_ACCESS_PLAN;
  } else if (signals.accountConnection) {
    intent = APEX_OS_LIFE_AUTOMATION_CONNECTOR_INTENT.ACCOUNT_CONNECTION_PLAN;
    riskTier = APEX_OS_LIFE_AUTOMATION_CONNECTOR_RISK_TIER.EXTERNAL_ACCOUNT_PLAN;
  } else {
    intent = APEX_OS_LIFE_AUTOMATION_CONNECTOR_INTENT.CONNECTOR_READINESS_PLAN;
    riskTier = APEX_OS_LIFE_AUTOMATION_CONNECTOR_RISK_TIER.READINESS_PLAN;
  }

  return Object.freeze({
    requested: true,
    intent,
    riskTier,
    surface,
    connectorTypes,
    signals,
  });
}

function riskNeedsApproval(riskTier = APEX_OS_LIFE_AUTOMATION_CONNECTOR_RISK_TIER.READINESS_PLAN) {
  return [
    APEX_OS_LIFE_AUTOMATION_CONNECTOR_RISK_TIER.DATA_ACCESS_PLAN,
    APEX_OS_LIFE_AUTOMATION_CONNECTOR_RISK_TIER.EXTERNAL_ACCOUNT_PLAN,
    APEX_OS_LIFE_AUTOMATION_CONNECTOR_RISK_TIER.EXTERNAL_ACTION_PLAN,
    APEX_OS_LIFE_AUTOMATION_CONNECTOR_RISK_TIER.MESSAGE_SEND_PLAN,
    APEX_OS_LIFE_AUTOMATION_CONNECTOR_RISK_TIER.MONEY_OR_PAYMENT_PLAN,
    APEX_OS_LIFE_AUTOMATION_CONNECTOR_RISK_TIER.CALENDAR_WRITE_PLAN,
    APEX_OS_LIFE_AUTOMATION_CONNECTOR_RISK_TIER.PRODUCTION_DEPLOY_PLAN,
  ].includes(riskTier);
}

function planStateFromSafety({ intent = {}, actionPermissionSummary = {}, privacyFirewallSummary = {}, untrustedContentFirewallSummary = {} } = {}) {
  const untrustedRiskLevel = normalizeApexOsPromptInjectionRisk(untrustedContentFirewallSummary.highestRiskLevel || APEX_OS_PROMPT_INJECTION_RISK.NONE);
  const untrustedBlocked = shouldBlockApexOsUntrustedRoute({
    ...untrustedContentFirewallSummary,
    highestRiskLevel: untrustedRiskLevel,
  });

  if (!intent.requested) return APEX_OS_LIFE_AUTOMATION_CONNECTOR_PLAN_STATE.NOT_REQUESTED;
  if (intent.riskTier === APEX_OS_LIFE_AUTOMATION_CONNECTOR_RISK_TIER.FORBIDDEN || actionPermissionSummary.forbidden) return APEX_OS_LIFE_AUTOMATION_CONNECTOR_PLAN_STATE.FORBIDDEN;
  if (privacyFirewallSummary.blockedCount > 0 || privacyFirewallSummary.actions?.includes(APEX_OS_PRIVACY_ACTION.BLOCK)) return APEX_OS_LIFE_AUTOMATION_CONNECTOR_PLAN_STATE.BLOCKED_BY_PRIVACY;
  if (privacyFirewallSummary.approvalRequiredCount > 0 || privacyFirewallSummary.actions?.includes(APEX_OS_PRIVACY_ACTION.APPROVAL_REQUIRED)) return APEX_OS_LIFE_AUTOMATION_CONNECTOR_PLAN_STATE.BLOCKED_BY_PRIVACY;
  if (untrustedBlocked) return APEX_OS_LIFE_AUTOMATION_CONNECTOR_PLAN_STATE.BLOCKED_BY_UNTRUSTED_CONTENT;
  const safeReadinessOnly = intent.signals?.planningOnly
    && intent.signals?.negatedExecution
    && !intent.signals?.connectorRun;
  if (
    riskNeedsApproval(intent.riskTier) && !safeReadinessOnly
    || (actionPermissionSummary.requiresApproval && !safeReadinessOnly)
    || [
      APEX_OS_ACTION_RISK_TIER.APPROVAL_REQUIRED,
      APEX_OS_ACTION_RISK_TIER.EXTERNAL_ACTION,
      APEX_OS_ACTION_RISK_TIER.HIGH_RISK,
    ].includes(actionPermissionSummary.riskTier) && !safeReadinessOnly
    || [
      APEX_OS_ACTION_DOMAIN.ORDERING,
      APEX_OS_ACTION_DOMAIN.BOOKING,
      APEX_OS_ACTION_DOMAIN.MESSAGING,
      APEX_OS_ACTION_DOMAIN.EMAIL,
      APEX_OS_ACTION_DOMAIN.CALENDAR,
      APEX_OS_ACTION_DOMAIN.BILLING,
      APEX_OS_ACTION_DOMAIN.AUTH,
      APEX_OS_ACTION_DOMAIN.SCHEMA,
      APEX_OS_ACTION_DOMAIN.PRODUCTION,
      APEX_OS_ACTION_DOMAIN.DEPLOYMENT,
      APEX_OS_ACTION_DOMAIN.BROWSER,
      APEX_OS_ACTION_DOMAIN.DESKTOP,
      APEX_OS_ACTION_DOMAIN.MUSIC,
      APEX_OS_ACTION_DOMAIN.FILES,
    ].includes(actionPermissionSummary.domain) && !safeReadinessOnly
  ) {
    return APEX_OS_LIFE_AUTOMATION_CONNECTOR_PLAN_STATE.APPROVAL_REQUIRED;
  }
  return APEX_OS_LIFE_AUTOMATION_CONNECTOR_PLAN_STATE.PLANNED;
}

function traceStatusForPlanState(planState = APEX_OS_LIFE_AUTOMATION_CONNECTOR_PLAN_STATE.NOT_REQUESTED) {
  if (planState === APEX_OS_LIFE_AUTOMATION_CONNECTOR_PLAN_STATE.NOT_REQUESTED) return APEX_OS_TRACE_STATUS.SKIPPED;
  if (planState === APEX_OS_LIFE_AUTOMATION_CONNECTOR_PLAN_STATE.FORBIDDEN) return APEX_OS_TRACE_STATUS.FORBIDDEN;
  if ([APEX_OS_LIFE_AUTOMATION_CONNECTOR_PLAN_STATE.BLOCKED_BY_PRIVACY, APEX_OS_LIFE_AUTOMATION_CONNECTOR_PLAN_STATE.BLOCKED_BY_UNTRUSTED_CONTENT].includes(planState)) return APEX_OS_TRACE_STATUS.BLOCKED;
  if (planState === APEX_OS_LIFE_AUTOMATION_CONNECTOR_PLAN_STATE.APPROVAL_REQUIRED) return APEX_OS_TRACE_STATUS.APPROVAL_REQUIRED;
  return APEX_OS_TRACE_STATUS.COMPLETED;
}

function actionDomainForSurface(surface = APEX_OS_LIFE_AUTOMATION_CONNECTOR_SURFACE.NONE) {
  if (surface === APEX_OS_LIFE_AUTOMATION_CONNECTOR_SURFACE.ORDERING) return APEX_OS_ACTION_DOMAIN.ORDERING;
  if (surface === APEX_OS_LIFE_AUTOMATION_CONNECTOR_SURFACE.BOOKING) return APEX_OS_ACTION_DOMAIN.BOOKING;
  if (surface === APEX_OS_LIFE_AUTOMATION_CONNECTOR_SURFACE.MESSAGING) return APEX_OS_ACTION_DOMAIN.MESSAGING;
  if (surface === APEX_OS_LIFE_AUTOMATION_CONNECTOR_SURFACE.EMAIL) return APEX_OS_ACTION_DOMAIN.EMAIL;
  if (surface === APEX_OS_LIFE_AUTOMATION_CONNECTOR_SURFACE.CALENDAR) return APEX_OS_ACTION_DOMAIN.CALENDAR;
  if (surface === APEX_OS_LIFE_AUTOMATION_CONNECTOR_SURFACE.PAYMENT) return APEX_OS_ACTION_DOMAIN.BILLING;
  if (surface === APEX_OS_LIFE_AUTOMATION_CONNECTOR_SURFACE.DOCUMENTS) return APEX_OS_ACTION_DOMAIN.FILES;
  if (surface === APEX_OS_LIFE_AUTOMATION_CONNECTOR_SURFACE.ACCOUNT) return APEX_OS_ACTION_DOMAIN.AUTH;
  if (surface === APEX_OS_LIFE_AUTOMATION_CONNECTOR_SURFACE.MULTI) return APEX_OS_ACTION_DOMAIN.SYSTEM;
  return APEX_OS_ACTION_DOMAIN.PLANNING;
}

export function planApexOsLifeAutomationConnectors(input = {}) {
  const description = text(input.description || input.question || input.request || "", TEXT_LIMIT);
  const intent = detectApexOsLifeAutomationConnectorIntent(description);
  const actionPermissionSummary = actionPermissionSummaryFromInput(description, input);
  const privacyFirewallSummary = privacySummaryFromInput(description, input);
  const untrustedContentFirewallSummary = untrustedContentSummaryFromInput(input);
  const planState = normalizeApexOsLifeAutomationConnectorPlanState(planStateFromSafety({
    intent,
    actionPermissionSummary,
    privacyFirewallSummary,
    untrustedContentFirewallSummary,
  }));
  const approvalRequired = planState === APEX_OS_LIFE_AUTOMATION_CONNECTOR_PLAN_STATE.APPROVAL_REQUIRED;
  const blocked = [
    APEX_OS_LIFE_AUTOMATION_CONNECTOR_PLAN_STATE.BLOCKED_BY_PRIVACY,
    APEX_OS_LIFE_AUTOMATION_CONNECTOR_PLAN_STATE.BLOCKED_BY_UNTRUSTED_CONTENT,
  ].includes(planState);
  const forbidden = planState === APEX_OS_LIFE_AUTOMATION_CONNECTOR_PLAN_STATE.FORBIDDEN;
  const traceMetadata = createApexOsTraceEntry({
    eventType: APEX_OS_TRACE_EVENT_TYPE.TOOL_ROUTE,
    source: APEX_OS_TRACE_SOURCE.TOOL_ROUTER,
    status: traceStatusForPlanState(planState),
    route: "life-automation-connectors-planning",
    modelTier: "deterministic",
    actionDomain: actionDomainForSurface(intent.surface),
    riskTier: intent.riskTier,
    approvalRequired,
    forbidden,
    canExecuteNow: false,
    skillId: "life-automation-connectors",
    reasonCode: `life-automation-connectors-${planState}`,
    safeMessage: "Phase 9 life automation connector plan created as content-free metadata; no account connection, OAuth, connector run, external action, send, spend, booking, calendar write, or execution path was created.",
  });

  return Object.freeze({
    phase: APEX_OS_LIFE_AUTOMATION_CONNECTOR_PHASE,
    plannerId: "apex-os-life-automation-connectors-planning",
    requested: Boolean(intent.requested),
    planState,
    intent: normalizeApexOsLifeAutomationConnectorIntent(intent.intent),
    riskTier: normalizeApexOsLifeAutomationConnectorRiskTier(intent.riskTier),
    surface: text(intent.surface || APEX_OS_LIFE_AUTOMATION_CONNECTOR_SURFACE.NONE, 60),
    connectorTypes: (intent.connectorTypes || []).map((entry) => text(entry, 40)).filter(Boolean).slice(0, 8),
    operatorOnly: true,
    planningOnly: true,
    reviewFirst: true,
    canPlanNow: [APEX_OS_LIFE_AUTOMATION_CONNECTOR_PLAN_STATE.PLANNED, APEX_OS_LIFE_AUTOMATION_CONNECTOR_PLAN_STATE.APPROVAL_REQUIRED].includes(planState),
    canConnectNow: false,
    connectorExecutionEnabled: false,
    accountConnectionEnabled: false,
    oauthFlowEnabled: false,
    credentialStorageEnabled: false,
    privateDataReadEnabled: false,
    messageSendEnabled: false,
    emailSendEnabled: false,
    calendarWriteEnabled: false,
    orderingEnabled: false,
    bookingEnabled: false,
    paymentEnabled: false,
    notificationEnabled: false,
    pluginExecutionEnabled: false,
    webhookEnabled: false,
    endpointEnabled: false,
    uiActivationEnabled: false,
    canExecuteNow: false,
    executionLocked: true,
    approvalRequired,
    blocked,
    forbidden,
    privacyFirewallRequired: true,
    untrustedContentFirewallRequired: true,
    requiredPreconditions: REQUIRED_PRECONDITIONS,
    planStepIds: PLAN_STEP_IDS,
    blockedActionIds: BLOCKED_ACTION_IDS,
    safeAlternative: text(approvalRequired
      ? "I can draft the connector requirements, scopes, approval packet, and manual checklist, then wait before any account connection, connector run, send, spend, order, booking, calendar write, or external action."
      : "I can prepare a private connector-readiness plan and stop before account authorization, connector execution, sends, spending, bookings, calendar writes, plugins, or external systems.",
    SUMMARY_LIMIT),
    traceMetadata,
  });
}

export function buildApexOsLifeAutomationConnectorSummary(value = {}, options = {}) {
  const plan = value?.plannerId ? value : planApexOsLifeAutomationConnectors(value);
  const includeLists = Boolean(options.includeLists);
  const requested = Boolean(plan.requested);
  const planState = normalizeApexOsLifeAutomationConnectorPlanState(plan.planState);
  const intent = normalizeApexOsLifeAutomationConnectorIntent(plan.intent);
  const riskTier = normalizeApexOsLifeAutomationConnectorRiskTier(plan.riskTier);
  const connectorTypes = (Array.isArray(plan.connectorTypes) ? plan.connectorTypes : []).map((entry) => text(entry, 40)).filter(Boolean).slice(0, 8);
  const summaryText = requested
    ? `${planState}; intent=${intent}; risk=${riskTier}; surface=${plan.surface}; connectorTypes=${connectorTypes.join("|") || "none"}; canConnectNow=false; connectorExecutionEnabled=false; messageSendEnabled=false; orderingEnabled=false; bookingEnabled=false; calendarWriteEnabled=false; canExecuteNow=false; executionLocked=true`
    : "not-requested; canConnectNow=false; connectorExecutionEnabled=false; messageSendEnabled=false; orderingEnabled=false; bookingEnabled=false; calendarWriteEnabled=false; canExecuteNow=false; executionLocked=true";

  return Object.freeze({
    phase: APEX_OS_LIFE_AUTOMATION_CONNECTOR_PHASE,
    plannerId: "apex-os-life-automation-connectors-planning",
    requested,
    planState,
    intent,
    riskTier,
    surface: text(plan.surface || APEX_OS_LIFE_AUTOMATION_CONNECTOR_SURFACE.NONE, 60),
    connectorTypes,
    operatorOnly: true,
    planningOnly: true,
    reviewFirst: true,
    canPlanNow: Boolean(plan.canPlanNow),
    canConnectNow: false,
    connectorExecutionEnabled: false,
    accountConnectionEnabled: false,
    oauthFlowEnabled: false,
    credentialStorageEnabled: false,
    privateDataReadEnabled: false,
    messageSendEnabled: false,
    emailSendEnabled: false,
    calendarWriteEnabled: false,
    orderingEnabled: false,
    bookingEnabled: false,
    paymentEnabled: false,
    notificationEnabled: false,
    pluginExecutionEnabled: false,
    webhookEnabled: false,
    endpointEnabled: false,
    uiActivationEnabled: false,
    approvalRequired: Boolean(plan.approvalRequired),
    blocked: Boolean(plan.blocked),
    forbidden: Boolean(plan.forbidden),
    canExecuteNow: false,
    executionLocked: true,
    privacyFirewallRequired: true,
    untrustedContentFirewallRequired: true,
    storesRawPrompt: false,
    storesRawResponse: false,
    storesRawMessages: false,
    storesCredentials: false,
    storesOAuthTokens: false,
    storesAccountSessionData: false,
    storesPrivateConnectorData: false,
    ...(includeLists ? {
      requiredPreconditions: plan.requiredPreconditions || REQUIRED_PRECONDITIONS,
      planStepIds: plan.planStepIds || PLAN_STEP_IDS,
      blockedActionIds: plan.blockedActionIds || BLOCKED_ACTION_IDS,
    } : {}),
    safeSummary: text(requested
      ? `Phase 9 life automation connector request classified as ${planState}/${intent}. It is operator-only, review-first, and non-executing; no account connection, OAuth flow, connector run, private data read, send, spend, order, booking, calendar write, plugin, webhook, endpoint, or external action is enabled.`
      : "Phase 9 life automation connector planning is available for private readiness plans only; no account connection, OAuth flow, connector run, send, spend, order, booking, calendar write, plugin, webhook, endpoint, or execution is enabled.",
    SUMMARY_LIMIT),
    summaryText: text(summaryText, SUMMARY_LIMIT),
  });
}
