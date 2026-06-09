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

export const APEX_OS_DESKTOP_WATCH_PHASE = "Phase 7A";

export const APEX_OS_DESKTOP_WATCH_MODE = Object.freeze({
  NOT_REQUESTED: "not-requested",
  DESKTOP_WATCH_PLAN: "desktop-watch-plan",
  BROWSER_WATCH_PLAN: "browser-watch-plan",
  SCREEN_REVIEW_PLAN: "screen-review-plan",
  BLOCKED_BY_PRIVACY: "blocked-by-privacy",
  BLOCKED_BY_UNTRUSTED_CONTENT: "blocked-by-untrusted-content",
  BLOCKED_BY_APPROVAL: "blocked-by-approval",
  FORBIDDEN: "forbidden",
});

export const APEX_OS_DESKTOP_WATCH_MODES = Object.freeze(Object.values(APEX_OS_DESKTOP_WATCH_MODE));

export const APEX_OS_DESKTOP_WATCH_SESSION_STATE = Object.freeze({
  DISABLED: "disabled",
  PLANNED: "planned",
  WAITING_OPERATOR_CONSENT: "waiting-operator-consent",
  BLOCKED: "blocked",
});

export const APEX_OS_DESKTOP_WATCH_SESSION_STATES = Object.freeze(Object.values(APEX_OS_DESKTOP_WATCH_SESSION_STATE));

export const APEX_OS_DESKTOP_WATCH_RISK_TIER = Object.freeze({
  OBSERVE_PLAN_ONLY: "observe-plan-only",
  INTERNAL_APP_NAVIGATION_PLAN: "internal-app-navigation-plan",
  FORM_DRAFT_PLAN: "form-draft-plan",
  EXTERNAL_ACCOUNT_PLAN: "external-account-plan",
  DOWNLOAD_UPLOAD_PLAN: "download-upload-plan",
  MESSAGE_SEND_PLAN: "message-send-plan",
  MONEY_ORDER_BOOKING_PLAN: "money-order-booking-plan",
  PRODUCTION_DEPLOY_PLAN: "production-deploy-plan",
  FORBIDDEN: "forbidden",
});

export const APEX_OS_DESKTOP_WATCH_RISK_TIERS = Object.freeze(Object.values(APEX_OS_DESKTOP_WATCH_RISK_TIER));

const TEXT_LIMIT = 1000;
const SUMMARY_LIMIT = 420;

const ALLOWED_INPUTS = Object.freeze([
  "john-explicit-session-request",
  "john-provided-screen-summary",
  "john-selected-redacted-snippet",
  "coarse-app-window-label",
  "operator-approved-screenshot-metadata-future",
]);

const FORBIDDEN_INPUTS = Object.freeze([
  "hidden-screen-capture",
  "always-on-background-watching",
  "credentials-passwords-cookies-sessions-mfa",
  "payment-card-or-bank-details",
  "unredacted-private-message-bodies",
  "unredacted-customer-or-field-private-data",
  "persistent-screenshots-or-recordings",
]);

const ALLOWED_OUTPUTS = Object.freeze([
  "private-observation-summary",
  "next-step-checklist",
  "blocked-state-explanation",
  "task-draft",
  "memory-suggestion-draft",
  "approval-packet-draft",
]);

const REQUIRED_OPERATOR_CONTROLS = Object.freeze([
  "explicit-start",
  "visible-active-session-indicator",
  "pause",
  "cancel",
  "end",
  "safe-log-review",
]);

const FORBIDDEN_ACTIONS = Object.freeze([
  "screen-capture-start",
  "hidden-surveillance",
  "keyboard-or-mouse-control",
  "browser-navigation",
  "click-type-submit-or-login",
  "authenticated-session-use",
  "page-scraping",
  "download-or-upload",
  "file-write",
  "connector-plugin-or-tool-execution",
  "send-message-email-or-sms",
  "spend-money-order-or-book",
  "calendar-write",
  "deploy-or-touch-production",
  "schema-auth-session-or-permission-change",
  "field-customer-demo-apex-os-access",
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
    targetContext: input.targetContext || APEX_OS_PRIVACY_CONTEXT.DESKTOP_TOOL,
  });
  return buildApexOsPrivacySummary([privacyResult]);
}

function untrustedContentSummaryFromInput(input = {}) {
  if (input.untrustedContentFirewallSummary?.highestRiskLevel) return input.untrustedContentFirewallSummary;
  if (input.untrustedContentResult?.metadata) return buildApexOsUntrustedContentSummary([input.untrustedContentResult]);
  return buildApexOsUntrustedContentSummary([]);
}

function normalizeApexOsDesktopWatchMode(value = APEX_OS_DESKTOP_WATCH_MODE.NOT_REQUESTED) {
  return normalizeEnum(value, APEX_OS_DESKTOP_WATCH_MODES, APEX_OS_DESKTOP_WATCH_MODE.NOT_REQUESTED);
}

function normalizeApexOsDesktopWatchSessionState(value = APEX_OS_DESKTOP_WATCH_SESSION_STATE.DISABLED) {
  return normalizeEnum(value, APEX_OS_DESKTOP_WATCH_SESSION_STATES, APEX_OS_DESKTOP_WATCH_SESSION_STATE.DISABLED);
}

function normalizeApexOsDesktopWatchRiskTier(value = APEX_OS_DESKTOP_WATCH_RISK_TIER.OBSERVE_PLAN_ONLY) {
  return normalizeEnum(value, APEX_OS_DESKTOP_WATCH_RISK_TIERS, APEX_OS_DESKTOP_WATCH_RISK_TIER.OBSERVE_PLAN_ONLY);
}

function intentSignals(description = "") {
  const normalized = lower(description);
  const desktop = matchesAny(normalized, [/\b(desktop|computer|screen|window|second screen|monitor|app window|screenshare|screen share|screenshot)\b/]);
  const browser = matchesAny(normalized, [/\b(browser|chrome|edge|website|web ?page|tab|dom|portal|external account)\b/]);
  const observe = matchesAny(normalized, [/\b(watch|look at|see|view|inspect|read|review|observe|monitor|what(?:'s| is) on)\b/]);
  const negatedControl = matchesAny(normalized, [/\b(do not|don't|dont|never|no)\b.{0,36}\b(control|click|type|press|tap|select|submit|login|log in|navigate|open|scroll|download|upload|fill|change|post|publish)\b/]);
  const control = !negatedControl && matchesAny(normalized, [/\b(control|click|type|press|tap|select|submit|login|log in|navigate|open|scroll|download|upload|fill|change|post|publish)\b/]);
  const hidden = matchesAny(normalized, [
    /\b(hidden|silent|secret|spy|without (?:telling|asking|consent|approval|permission)|don't tell|do not tell)\b/,
    /\b(always|background)\b.{0,30}\b(watch|record|capture|monitor)\b/,
    /\b(record|capture)\b.{0,30}\b(screen|desktop|computer|window)\b/,
  ]);
  const credential = matchesAny(normalized, [/\b(password|passcode|credential|cookie|session|mfa|2fa|otp|api[_ -]?key|secret|token|cvv|card number|bank account)\b/]);
  const money = matchesAny(normalized, [/\b(order|buy|purchase|pay|spend|checkout|pizza|food delivery|book|booking|reservation|appointment)\b/]);
  const message = matchesAny(normalized, [/\b(send|text|sms|message|dm|email|reply|forward|notify|call)\b/]);
  const transfer = matchesAny(normalized, [/\b(download|upload|attach|export|import)\b/]);
  const production = matchesAny(normalized, [/\b(deploy|rollback|release|production|prod|schema|auth|session|provider|billing)\b/]);
  const form = matchesAny(normalized, [/\b(form|fill|field|submit|login|log in|portal|external account)\b/]);
  const requested = (desktop || browser) && (observe || control || hidden || credential || money || message || transfer || production || form);

  return Object.freeze({
    requested,
    desktop,
    browser,
    observe,
    control,
    hidden,
    credential,
    negatedControl,
    money,
    message,
    transfer,
    production,
    form,
  });
}

export function detectApexOsDesktopWatchIntent(description = "") {
  const signals = intentSignals(description);
  let riskTier = APEX_OS_DESKTOP_WATCH_RISK_TIER.OBSERVE_PLAN_ONLY;

  if (!signals.requested) {
    return Object.freeze({
      requested: false,
      primarySurface: "none",
      riskTier,
      signals,
    });
  }

  if (signals.hidden || signals.credential) riskTier = APEX_OS_DESKTOP_WATCH_RISK_TIER.FORBIDDEN;
  else if (signals.production) riskTier = APEX_OS_DESKTOP_WATCH_RISK_TIER.PRODUCTION_DEPLOY_PLAN;
  else if (signals.money) riskTier = APEX_OS_DESKTOP_WATCH_RISK_TIER.MONEY_ORDER_BOOKING_PLAN;
  else if (signals.message) riskTier = APEX_OS_DESKTOP_WATCH_RISK_TIER.MESSAGE_SEND_PLAN;
  else if (signals.transfer) riskTier = APEX_OS_DESKTOP_WATCH_RISK_TIER.DOWNLOAD_UPLOAD_PLAN;
  else if (signals.form) riskTier = APEX_OS_DESKTOP_WATCH_RISK_TIER.FORM_DRAFT_PLAN;
  else if (signals.control && signals.browser) riskTier = APEX_OS_DESKTOP_WATCH_RISK_TIER.EXTERNAL_ACCOUNT_PLAN;
  else if (signals.control) riskTier = APEX_OS_DESKTOP_WATCH_RISK_TIER.INTERNAL_APP_NAVIGATION_PLAN;

  return Object.freeze({
    requested: true,
    primarySurface: signals.browser ? "browser" : signals.desktop ? "desktop" : "screen",
    riskTier,
    signals,
  });
}

function riskNeedsApproval(riskTier = APEX_OS_DESKTOP_WATCH_RISK_TIER.OBSERVE_PLAN_ONLY) {
  return [
    APEX_OS_DESKTOP_WATCH_RISK_TIER.INTERNAL_APP_NAVIGATION_PLAN,
    APEX_OS_DESKTOP_WATCH_RISK_TIER.FORM_DRAFT_PLAN,
    APEX_OS_DESKTOP_WATCH_RISK_TIER.EXTERNAL_ACCOUNT_PLAN,
    APEX_OS_DESKTOP_WATCH_RISK_TIER.DOWNLOAD_UPLOAD_PLAN,
    APEX_OS_DESKTOP_WATCH_RISK_TIER.MESSAGE_SEND_PLAN,
    APEX_OS_DESKTOP_WATCH_RISK_TIER.MONEY_ORDER_BOOKING_PLAN,
    APEX_OS_DESKTOP_WATCH_RISK_TIER.PRODUCTION_DEPLOY_PLAN,
  ].includes(riskTier);
}

function modeForIntent(intent = {}) {
  if (!intent.requested) return APEX_OS_DESKTOP_WATCH_MODE.NOT_REQUESTED;
  if (intent.primarySurface === "browser") return APEX_OS_DESKTOP_WATCH_MODE.BROWSER_WATCH_PLAN;
  if (intent.primarySurface === "desktop") return APEX_OS_DESKTOP_WATCH_MODE.DESKTOP_WATCH_PLAN;
  return APEX_OS_DESKTOP_WATCH_MODE.SCREEN_REVIEW_PLAN;
}

function blockedModeFromSafety({ intent = {}, actionPermissionSummary = {}, privacyFirewallSummary = {}, untrustedContentFirewallSummary = {} } = {}) {
  const untrustedRiskLevel = normalizeApexOsPromptInjectionRisk(untrustedContentFirewallSummary.highestRiskLevel || APEX_OS_PROMPT_INJECTION_RISK.NONE);
  const untrustedBlocked = shouldBlockApexOsUntrustedRoute({
    ...untrustedContentFirewallSummary,
    highestRiskLevel: untrustedRiskLevel,
  });

  if (!intent.requested) return "";
  if (intent.riskTier === APEX_OS_DESKTOP_WATCH_RISK_TIER.FORBIDDEN || actionPermissionSummary.forbidden) return APEX_OS_DESKTOP_WATCH_MODE.FORBIDDEN;
  if (privacyFirewallSummary.blockedCount > 0 || privacyFirewallSummary.actions?.includes(APEX_OS_PRIVACY_ACTION.BLOCK)) return APEX_OS_DESKTOP_WATCH_MODE.BLOCKED_BY_PRIVACY;
  if (privacyFirewallSummary.approvalRequiredCount > 0 || privacyFirewallSummary.actions?.includes(APEX_OS_PRIVACY_ACTION.APPROVAL_REQUIRED)) return APEX_OS_DESKTOP_WATCH_MODE.BLOCKED_BY_PRIVACY;
  if (untrustedBlocked) return APEX_OS_DESKTOP_WATCH_MODE.BLOCKED_BY_UNTRUSTED_CONTENT;
  const safeNegatedObserveOnly = intent.riskTier === APEX_OS_DESKTOP_WATCH_RISK_TIER.OBSERVE_PLAN_ONLY
    && intent.signals?.negatedControl
    && [APEX_OS_ACTION_DOMAIN.DESKTOP, APEX_OS_ACTION_DOMAIN.BROWSER].includes(actionPermissionSummary.domain);
  if (
    riskNeedsApproval(intent.riskTier)
    || (actionPermissionSummary.requiresApproval && !safeNegatedObserveOnly)
    || [
      APEX_OS_ACTION_RISK_TIER.APPROVAL_REQUIRED,
      APEX_OS_ACTION_RISK_TIER.EXTERNAL_ACTION,
      APEX_OS_ACTION_RISK_TIER.HIGH_RISK,
    ].includes(actionPermissionSummary.riskTier) && !safeNegatedObserveOnly
    || [
      APEX_OS_ACTION_DOMAIN.DESKTOP,
      APEX_OS_ACTION_DOMAIN.BROWSER,
    ].includes(actionPermissionSummary.domain) && !safeNegatedObserveOnly
  ) {
    return APEX_OS_DESKTOP_WATCH_MODE.BLOCKED_BY_APPROVAL;
  }
  return "";
}

function statusForMode(mode = APEX_OS_DESKTOP_WATCH_MODE.NOT_REQUESTED) {
  if (mode === APEX_OS_DESKTOP_WATCH_MODE.NOT_REQUESTED) return APEX_OS_TRACE_STATUS.SKIPPED;
  if (mode === APEX_OS_DESKTOP_WATCH_MODE.FORBIDDEN) return APEX_OS_TRACE_STATUS.FORBIDDEN;
  if ([APEX_OS_DESKTOP_WATCH_MODE.BLOCKED_BY_PRIVACY, APEX_OS_DESKTOP_WATCH_MODE.BLOCKED_BY_UNTRUSTED_CONTENT].includes(mode)) return APEX_OS_TRACE_STATUS.BLOCKED;
  if (mode === APEX_OS_DESKTOP_WATCH_MODE.BLOCKED_BY_APPROVAL) return APEX_OS_TRACE_STATUS.APPROVAL_REQUIRED;
  return APEX_OS_TRACE_STATUS.COMPLETED;
}

function sessionStateForMode(mode = APEX_OS_DESKTOP_WATCH_MODE.NOT_REQUESTED) {
  if (mode === APEX_OS_DESKTOP_WATCH_MODE.NOT_REQUESTED) return APEX_OS_DESKTOP_WATCH_SESSION_STATE.DISABLED;
  if ([APEX_OS_DESKTOP_WATCH_MODE.FORBIDDEN, APEX_OS_DESKTOP_WATCH_MODE.BLOCKED_BY_PRIVACY, APEX_OS_DESKTOP_WATCH_MODE.BLOCKED_BY_UNTRUSTED_CONTENT, APEX_OS_DESKTOP_WATCH_MODE.BLOCKED_BY_APPROVAL].includes(mode)) {
    return APEX_OS_DESKTOP_WATCH_SESSION_STATE.BLOCKED;
  }
  return APEX_OS_DESKTOP_WATCH_SESSION_STATE.WAITING_OPERATOR_CONSENT;
}

export function planApexOsDesktopWatchSession(input = {}) {
  const description = text(input.description || input.question || input.request || "", TEXT_LIMIT);
  const intent = detectApexOsDesktopWatchIntent(description);
  const actionPermissionSummary = actionPermissionSummaryFromInput(description, input);
  const privacyFirewallSummary = privacySummaryFromInput(description, input);
  const untrustedContentFirewallSummary = untrustedContentSummaryFromInput(input);
  const blockedMode = blockedModeFromSafety({
    intent,
    actionPermissionSummary,
    privacyFirewallSummary,
    untrustedContentFirewallSummary,
  });
  const watchMode = normalizeApexOsDesktopWatchMode(blockedMode || modeForIntent(intent));
  const sessionState = normalizeApexOsDesktopWatchSessionState(sessionStateForMode(watchMode));
  const riskTier = normalizeApexOsDesktopWatchRiskTier(intent.riskTier);
  const blocked = [APEX_OS_DESKTOP_WATCH_MODE.BLOCKED_BY_PRIVACY, APEX_OS_DESKTOP_WATCH_MODE.BLOCKED_BY_UNTRUSTED_CONTENT, APEX_OS_DESKTOP_WATCH_MODE.BLOCKED_BY_APPROVAL, APEX_OS_DESKTOP_WATCH_MODE.FORBIDDEN].includes(watchMode);
  const approvalRequired = watchMode === APEX_OS_DESKTOP_WATCH_MODE.BLOCKED_BY_APPROVAL;
  const forbidden = watchMode === APEX_OS_DESKTOP_WATCH_MODE.FORBIDDEN;
  const traceMetadata = createApexOsTraceEntry({
    eventType: APEX_OS_TRACE_EVENT_TYPE.TOOL_ROUTE,
    source: APEX_OS_TRACE_SOURCE.TOOL_ROUTER,
    status: statusForMode(watchMode),
    route: "desktop-watch-sandbox-plan",
    modelTier: "deterministic",
    actionDomain: intent.primarySurface === "browser" ? APEX_OS_ACTION_DOMAIN.BROWSER : APEX_OS_ACTION_DOMAIN.DESKTOP,
    riskTier,
    approvalRequired,
    forbidden,
    canExecuteNow: false,
    skillId: "desktop-watch-sandbox",
    reasonCode: `desktop-watch-${watchMode}`,
    safeMessage: "Phase 7A desktop sandbox/watch mode planned as content-free metadata; no screen capture, control, or execution path was created.",
  });

  return Object.freeze({
    phase: APEX_OS_DESKTOP_WATCH_PHASE,
    plannerId: "apex-os-desktop-watch-sandbox",
    requested: Boolean(intent.requested),
    watchMode,
    riskTier,
    primarySurface: intent.primarySurface,
    sessionState,
    operatorOnly: true,
    manualSessionOnly: true,
    requiresExplicitStart: true,
    visibleSessionIndicatorRequired: true,
    watchModeEnabled: false,
    desktopControlEnabled: false,
    browserControlEnabled: false,
    keyboardMouseControlEnabled: false,
    authenticatedSessionUseEnabled: false,
    screenCaptureEnabled: false,
    screenshotPersistenceEnabled: false,
    hiddenSurveillanceEnabled: false,
    connectorExecutionEnabled: false,
    endpointEnabled: false,
    uiActivationEnabled: false,
    canExecuteNow: false,
    executionLocked: true,
    approvalRequired,
    blocked,
    forbidden,
    privacyFirewallRequired: true,
    untrustedContentFirewallRequired: true,
    allowedInputs: ALLOWED_INPUTS,
    forbiddenInputs: FORBIDDEN_INPUTS,
    allowedOutputs: ALLOWED_OUTPUTS,
    requiredOperatorControls: REQUIRED_OPERATOR_CONTROLS,
    forbiddenActions: FORBIDDEN_ACTIONS,
    traceMetadata,
  });
}

export function buildApexOsDesktopWatchSummary(value = {}, options = {}) {
  const plan = value?.plannerId ? value : planApexOsDesktopWatchSession(value);
  const includeLists = Boolean(options.includeLists);
  const watchMode = normalizeApexOsDesktopWatchMode(plan.watchMode);
  const riskTier = normalizeApexOsDesktopWatchRiskTier(plan.riskTier);
  const requested = Boolean(plan.requested);
  const blocked = Boolean(plan.blocked);
  const summaryText = requested
    ? `${watchMode}; risk=${riskTier}; sessionState=${plan.sessionState}; watchModeEnabled=false; desktopControlEnabled=false; browserControlEnabled=false; canExecuteNow=false; executionLocked=true`
    : "not-requested; watchModeEnabled=false; desktopControlEnabled=false; browserControlEnabled=false; canExecuteNow=false; executionLocked=true";

  return Object.freeze({
    phase: APEX_OS_DESKTOP_WATCH_PHASE,
    plannerId: "apex-os-desktop-watch-sandbox",
    requested,
    watchMode,
    riskTier,
    primarySurface: text(plan.primarySurface || "none", 40),
    sessionState: normalizeApexOsDesktopWatchSessionState(plan.sessionState),
    operatorOnly: true,
    manualSessionOnly: true,
    requiresExplicitStart: true,
    visibleSessionIndicatorRequired: true,
    watchModeEnabled: false,
    desktopControlEnabled: false,
    browserControlEnabled: false,
    keyboardMouseControlEnabled: false,
    authenticatedSessionUseEnabled: false,
    screenCaptureEnabled: false,
    screenshotPersistenceEnabled: false,
    hiddenSurveillanceEnabled: false,
    connectorExecutionEnabled: false,
    endpointEnabled: false,
    uiActivationEnabled: false,
    approvalRequired: Boolean(plan.approvalRequired),
    blocked,
    forbidden: Boolean(plan.forbidden),
    canExecuteNow: false,
    executionLocked: true,
    privacyFirewallRequired: true,
    untrustedContentFirewallRequired: true,
    storesRawPrompt: false,
    storesRawResponse: false,
    storesRawMessages: false,
    storesScreenContent: false,
    storesScreenshots: false,
    ...(includeLists ? {
      allowedInputs: plan.allowedInputs || ALLOWED_INPUTS,
      forbiddenInputs: plan.forbiddenInputs || FORBIDDEN_INPUTS,
      allowedOutputs: plan.allowedOutputs || ALLOWED_OUTPUTS,
      requiredOperatorControls: plan.requiredOperatorControls || REQUIRED_OPERATOR_CONTROLS,
      forbiddenActions: plan.forbiddenActions || FORBIDDEN_ACTIONS,
    } : {}),
    safeSummary: text(requested
      ? `Phase 7A desktop/watch request classified as ${watchMode}. It is operator-only, explicit-session-only, and non-executing; no screen capture, keyboard/mouse, browser control, authenticated-session use, or hidden watching is enabled.`
      : "Phase 7A desktop/watch sandbox is available for explicit planning only; no watch session, screen capture, control, or execution is enabled.",
    SUMMARY_LIMIT),
    summaryText: text(summaryText, SUMMARY_LIMIT),
  });
}
