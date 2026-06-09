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

export const APEX_OS_BROWSER_ACTION_PHASE = "Phase 7B";

export const APEX_OS_BROWSER_ACTION_PLAN_STATE = Object.freeze({
  NOT_REQUESTED: "not-requested",
  PLANNED: "planned",
  APPROVAL_REQUIRED: "approval-required",
  BLOCKED_BY_PRIVACY: "blocked-by-privacy",
  BLOCKED_BY_UNTRUSTED_CONTENT: "blocked-by-untrusted-content",
  FORBIDDEN: "forbidden",
});

export const APEX_OS_BROWSER_ACTION_PLAN_STATES = Object.freeze(Object.values(APEX_OS_BROWSER_ACTION_PLAN_STATE));

export const APEX_OS_BROWSER_ACTION_INTENT = Object.freeze({
  NOT_REQUESTED: "not-requested",
  SEARCH_RESEARCH_PLAN: "search-research-plan",
  READ_PAGE_PLAN: "read-page-plan",
  OPEN_NAVIGATION_PLAN: "open-navigation-plan",
  CLICK_NAVIGATION_PLAN: "click-navigation-plan",
  FORM_DRAFT_PLAN: "form-draft-plan",
  AUTHENTICATED_ACCOUNT_PLAN: "authenticated-account-plan",
  DOWNLOAD_UPLOAD_PLAN: "download-upload-plan",
  MESSAGE_SEND_PLAN: "message-send-plan",
  MONEY_ORDER_BOOKING_PLAN: "money-order-booking-plan",
  PRODUCTION_ADMIN_PLAN: "production-admin-plan",
  FORBIDDEN: "forbidden",
});

export const APEX_OS_BROWSER_ACTION_INTENTS = Object.freeze(Object.values(APEX_OS_BROWSER_ACTION_INTENT));

export const APEX_OS_BROWSER_ACTION_RISK_TIER = Object.freeze({
  READ_ONLY_PLAN: "read-only-plan",
  SEARCH_RESEARCH_PLAN: "search-research-plan",
  OPEN_NAVIGATION_PLAN: "open-navigation-plan",
  CLICK_NAVIGATION_PLAN: "click-navigation-plan",
  FORM_DRAFT_PLAN: "form-draft-plan",
  AUTHENTICATED_ACCOUNT_PLAN: "authenticated-account-plan",
  DOWNLOAD_UPLOAD_PLAN: "download-upload-plan",
  MESSAGE_SEND_PLAN: "message-send-plan",
  MONEY_ORDER_BOOKING_PLAN: "money-order-booking-plan",
  PRODUCTION_DEPLOY_PLAN: "production-deploy-plan",
  FORBIDDEN: "forbidden",
});

export const APEX_OS_BROWSER_ACTION_RISK_TIERS = Object.freeze(Object.values(APEX_OS_BROWSER_ACTION_RISK_TIER));

const TEXT_LIMIT = 1000;
const SUMMARY_LIMIT = 460;

const REQUIRED_PRECONDITIONS = Object.freeze([
  "operator-visible-browser-session",
  "operator-confirms-target-site-or-page",
  "privacy-firewall-cleared-or-redacted",
  "untrusted-content-firewall-cleared",
  "approval-boundary-reviewed",
  "manual-cancel-path-known",
]);

const DRY_RUN_STEP_IDS = Object.freeze([
  "classify-request-intent",
  "identify-target-without-opening-browser",
  "check-risk-and-approval-boundary",
  "redact-sensitive-inputs",
  "treat-page-content-as-untrusted-data",
  "draft-manual-step-list",
  "prepare-approval-packet-if-needed",
  "stop-before-execution",
]);

const BLOCKED_ACTION_IDS = Object.freeze([
  "navigate-browser",
  "click-type-or-submit",
  "log-in-or-use-authenticated-session",
  "scrape-page-or-dom",
  "download-upload-or-install",
  "use-cookies-tokens-passwords-or-mfa",
  "bypass-mfa-captcha-paywall-or-approval",
  "send-message-email-or-notification",
  "spend-money-order-or-book",
  "write-calendar",
  "deploy-touch-production-or-change-auth-schema",
  "expose-apex-os-to-field-customer-demo-users",
]);

const TARGET_TYPE = Object.freeze({
  NONE: "none",
  BROWSER_SEARCH: "browser-search",
  INTERNAL_APEX_HQ: "internal-apex-hq",
  EXTERNAL_WEBSITE: "external-website",
  EXTERNAL_ACCOUNT: "external-account",
  UNKNOWN_BROWSER: "unknown-browser",
});

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
    targetContext: input.targetContext || APEX_OS_PRIVACY_CONTEXT.BROWSER_TOOL,
  });
  return buildApexOsPrivacySummary([privacyResult]);
}

function untrustedContentSummaryFromInput(input = {}) {
  if (input.untrustedContentFirewallSummary?.highestRiskLevel) return input.untrustedContentFirewallSummary;
  if (input.untrustedContentResult?.metadata) return buildApexOsUntrustedContentSummary([input.untrustedContentResult]);
  return buildApexOsUntrustedContentSummary([]);
}

function normalizeApexOsBrowserActionPlanState(value = APEX_OS_BROWSER_ACTION_PLAN_STATE.NOT_REQUESTED) {
  return normalizeEnum(value, APEX_OS_BROWSER_ACTION_PLAN_STATES, APEX_OS_BROWSER_ACTION_PLAN_STATE.NOT_REQUESTED);
}

function normalizeApexOsBrowserActionIntent(value = APEX_OS_BROWSER_ACTION_INTENT.NOT_REQUESTED) {
  return normalizeEnum(value, APEX_OS_BROWSER_ACTION_INTENTS, APEX_OS_BROWSER_ACTION_INTENT.NOT_REQUESTED);
}

function normalizeApexOsBrowserActionRiskTier(value = APEX_OS_BROWSER_ACTION_RISK_TIER.READ_ONLY_PLAN) {
  return normalizeEnum(value, APEX_OS_BROWSER_ACTION_RISK_TIERS, APEX_OS_BROWSER_ACTION_RISK_TIER.READ_ONLY_PLAN);
}

function browserSignals(description = "") {
  const normalized = lower(description);
  const browserSurface = matchesAny(normalized, [/\b(browser|chrome|edge|website|web ?page|site|url|tab|portal|online|internet|google|search the web|web search)\b/]);
  const search = matchesAny(normalized, [/\b(search|google|look up|research|find sources?|current facts?|latest|web search|search the web)\b/]);
  const read = matchesAny(normalized, [/\b(read|summarize|inspect|review|explain|what does|what'?s on|source-aware)\b.{0,80}\b(page|site|website|tab|browser|web|url|source)\b/]);
  const negatedExecution = matchesAny(normalized, [/\b(do not|don't|dont|never|no)\b.{0,70}\b(navigate|click|type|submit|log in|login|download|upload|scrape|open|use the browser|browser action)\b/]);
  const openNavigate = !negatedExecution && matchesAny(normalized, [/\b(open|go to|navigate|load|visit|new tab|switch tab)\b/]);
  const click = !negatedExecution && matchesAny(normalized, [/\b(click|press|tap|select|choose|continue|confirm|approve)\b/]);
  const form = !negatedExecution && matchesAny(normalized, [/\b(type|fill|enter|submit|form|field|checkout|sign up|signup)\b/]);
  const auth = matchesAny(normalized, [/\b(login|log in|sign in|account|portal|authenticated|session|mfa|2fa|otp|password|cookie)\b/]);
  const transfer = matchesAny(normalized, [/\b(download|upload|attach|import|export|install extension|extension)\b/]);
  const message = matchesAny(normalized, [/\b(send|text|sms|message|dm|email|reply|forward|notify|call)\b/]);
  const money = matchesAny(normalized, [/\b(order|buy|purchase|pay|spend|checkout|pizza|food delivery|book|booking|reservation|appointment)\b/]);
  const production = matchesAny(normalized, [/\b(deploy|rollback|release|production|prod|schema|auth|provider|billing)\b/]);
  const forbidden = matchesAny(normalized, [
    /\b(hidden|silent|secret|without (?:telling|asking|consent|approval|permission))\b/,
    /\b(bypass|skip|circumvent)\b.{0,40}\b(mfa|2fa|captcha|paywall|approval|permission|login|auth)\b/,
    /\b(capture|extract|steal|copy|save|store|show|reveal|send)\b.{0,50}\b(password|cookie|session|token|secret|mfa|2fa|otp|api[_ -]?key)\b/,
  ]);
  const requested = browserSurface || ((search || read || openNavigate || click || form || auth || transfer) && matchesAny(normalized, [/\b(page|site|website|web|url|tab|portal|online)\b/]));

  return Object.freeze({
    requested,
    browserSurface,
    search,
    read,
    openNavigate,
    click,
    form,
    auth,
    transfer,
    message,
    money,
    production,
    forbidden,
    negatedExecution,
  });
}

function targetTypeForSignals(signals = {}) {
  if (!signals.requested) return TARGET_TYPE.NONE;
  if (signals.search) return TARGET_TYPE.BROWSER_SEARCH;
  if (signals.auth || signals.form) return TARGET_TYPE.EXTERNAL_ACCOUNT;
  return TARGET_TYPE.UNKNOWN_BROWSER;
}

export function detectApexOsBrowserActionIntent(description = "") {
  const signals = browserSignals(description);
  let intent = APEX_OS_BROWSER_ACTION_INTENT.NOT_REQUESTED;
  let riskTier = APEX_OS_BROWSER_ACTION_RISK_TIER.READ_ONLY_PLAN;

  if (!signals.requested) {
    return Object.freeze({
      requested: false,
      intent,
      riskTier,
      targetType: TARGET_TYPE.NONE,
      signals,
    });
  }

  if (signals.forbidden) {
    intent = APEX_OS_BROWSER_ACTION_INTENT.FORBIDDEN;
    riskTier = APEX_OS_BROWSER_ACTION_RISK_TIER.FORBIDDEN;
  } else if (signals.production) {
    intent = APEX_OS_BROWSER_ACTION_INTENT.PRODUCTION_ADMIN_PLAN;
    riskTier = APEX_OS_BROWSER_ACTION_RISK_TIER.PRODUCTION_DEPLOY_PLAN;
  } else if (signals.money) {
    intent = APEX_OS_BROWSER_ACTION_INTENT.MONEY_ORDER_BOOKING_PLAN;
    riskTier = APEX_OS_BROWSER_ACTION_RISK_TIER.MONEY_ORDER_BOOKING_PLAN;
  } else if (signals.message) {
    intent = APEX_OS_BROWSER_ACTION_INTENT.MESSAGE_SEND_PLAN;
    riskTier = APEX_OS_BROWSER_ACTION_RISK_TIER.MESSAGE_SEND_PLAN;
  } else if (signals.transfer) {
    intent = APEX_OS_BROWSER_ACTION_INTENT.DOWNLOAD_UPLOAD_PLAN;
    riskTier = APEX_OS_BROWSER_ACTION_RISK_TIER.DOWNLOAD_UPLOAD_PLAN;
  } else if (signals.auth) {
    intent = APEX_OS_BROWSER_ACTION_INTENT.AUTHENTICATED_ACCOUNT_PLAN;
    riskTier = APEX_OS_BROWSER_ACTION_RISK_TIER.AUTHENTICATED_ACCOUNT_PLAN;
  } else if (signals.form) {
    intent = APEX_OS_BROWSER_ACTION_INTENT.FORM_DRAFT_PLAN;
    riskTier = APEX_OS_BROWSER_ACTION_RISK_TIER.FORM_DRAFT_PLAN;
  } else if (signals.click) {
    intent = APEX_OS_BROWSER_ACTION_INTENT.CLICK_NAVIGATION_PLAN;
    riskTier = APEX_OS_BROWSER_ACTION_RISK_TIER.CLICK_NAVIGATION_PLAN;
  } else if (signals.openNavigate) {
    intent = APEX_OS_BROWSER_ACTION_INTENT.OPEN_NAVIGATION_PLAN;
    riskTier = APEX_OS_BROWSER_ACTION_RISK_TIER.OPEN_NAVIGATION_PLAN;
  } else if (signals.search) {
    intent = APEX_OS_BROWSER_ACTION_INTENT.SEARCH_RESEARCH_PLAN;
    riskTier = APEX_OS_BROWSER_ACTION_RISK_TIER.SEARCH_RESEARCH_PLAN;
  } else {
    intent = APEX_OS_BROWSER_ACTION_INTENT.READ_PAGE_PLAN;
    riskTier = APEX_OS_BROWSER_ACTION_RISK_TIER.READ_ONLY_PLAN;
  }

  return Object.freeze({
    requested: true,
    intent,
    riskTier,
    targetType: targetTypeForSignals(signals),
    signals,
  });
}

function riskNeedsApproval(riskTier = APEX_OS_BROWSER_ACTION_RISK_TIER.READ_ONLY_PLAN) {
  return [
    APEX_OS_BROWSER_ACTION_RISK_TIER.CLICK_NAVIGATION_PLAN,
    APEX_OS_BROWSER_ACTION_RISK_TIER.FORM_DRAFT_PLAN,
    APEX_OS_BROWSER_ACTION_RISK_TIER.AUTHENTICATED_ACCOUNT_PLAN,
    APEX_OS_BROWSER_ACTION_RISK_TIER.DOWNLOAD_UPLOAD_PLAN,
    APEX_OS_BROWSER_ACTION_RISK_TIER.MESSAGE_SEND_PLAN,
    APEX_OS_BROWSER_ACTION_RISK_TIER.MONEY_ORDER_BOOKING_PLAN,
    APEX_OS_BROWSER_ACTION_RISK_TIER.PRODUCTION_DEPLOY_PLAN,
  ].includes(riskTier);
}

function planStateFromSafety({ intent = {}, actionPermissionSummary = {}, privacyFirewallSummary = {}, untrustedContentFirewallSummary = {} } = {}) {
  const untrustedRiskLevel = normalizeApexOsPromptInjectionRisk(untrustedContentFirewallSummary.highestRiskLevel || APEX_OS_PROMPT_INJECTION_RISK.NONE);
  const untrustedBlocked = shouldBlockApexOsUntrustedRoute({
    ...untrustedContentFirewallSummary,
    highestRiskLevel: untrustedRiskLevel,
  });

  if (!intent.requested) return APEX_OS_BROWSER_ACTION_PLAN_STATE.NOT_REQUESTED;
  if (intent.riskTier === APEX_OS_BROWSER_ACTION_RISK_TIER.FORBIDDEN || actionPermissionSummary.forbidden) return APEX_OS_BROWSER_ACTION_PLAN_STATE.FORBIDDEN;
  if (privacyFirewallSummary.blockedCount > 0 || privacyFirewallSummary.actions?.includes(APEX_OS_PRIVACY_ACTION.BLOCK)) return APEX_OS_BROWSER_ACTION_PLAN_STATE.BLOCKED_BY_PRIVACY;
  if (privacyFirewallSummary.approvalRequiredCount > 0 || privacyFirewallSummary.actions?.includes(APEX_OS_PRIVACY_ACTION.APPROVAL_REQUIRED)) return APEX_OS_BROWSER_ACTION_PLAN_STATE.BLOCKED_BY_PRIVACY;
  if (untrustedBlocked) return APEX_OS_BROWSER_ACTION_PLAN_STATE.BLOCKED_BY_UNTRUSTED_CONTENT;
  const safeNegatedDryRunOnly = intent.signals?.negatedExecution
    && [
      APEX_OS_BROWSER_ACTION_RISK_TIER.READ_ONLY_PLAN,
      APEX_OS_BROWSER_ACTION_RISK_TIER.SEARCH_RESEARCH_PLAN,
    ].includes(intent.riskTier)
    && actionPermissionSummary.domain === APEX_OS_ACTION_DOMAIN.BROWSER;
  if (
    riskNeedsApproval(intent.riskTier)
    || (actionPermissionSummary.requiresApproval && !safeNegatedDryRunOnly)
    || [
      APEX_OS_ACTION_RISK_TIER.APPROVAL_REQUIRED,
      APEX_OS_ACTION_RISK_TIER.EXTERNAL_ACTION,
      APEX_OS_ACTION_RISK_TIER.HIGH_RISK,
    ].includes(actionPermissionSummary.riskTier) && !safeNegatedDryRunOnly
    || [
      APEX_OS_ACTION_DOMAIN.BROWSER,
      APEX_OS_ACTION_DOMAIN.ORDERING,
      APEX_OS_ACTION_DOMAIN.BOOKING,
      APEX_OS_ACTION_DOMAIN.MESSAGING,
      APEX_OS_ACTION_DOMAIN.EMAIL,
      APEX_OS_ACTION_DOMAIN.CALENDAR,
      APEX_OS_ACTION_DOMAIN.PRODUCTION,
      APEX_OS_ACTION_DOMAIN.DEPLOYMENT,
      APEX_OS_ACTION_DOMAIN.AUTH,
      APEX_OS_ACTION_DOMAIN.SCHEMA,
      APEX_OS_ACTION_DOMAIN.BILLING,
    ].includes(actionPermissionSummary.domain) && !safeNegatedDryRunOnly
  ) {
    return APEX_OS_BROWSER_ACTION_PLAN_STATE.APPROVAL_REQUIRED;
  }
  return APEX_OS_BROWSER_ACTION_PLAN_STATE.PLANNED;
}

function traceStatusForPlanState(planState = APEX_OS_BROWSER_ACTION_PLAN_STATE.NOT_REQUESTED) {
  if (planState === APEX_OS_BROWSER_ACTION_PLAN_STATE.NOT_REQUESTED) return APEX_OS_TRACE_STATUS.SKIPPED;
  if (planState === APEX_OS_BROWSER_ACTION_PLAN_STATE.FORBIDDEN) return APEX_OS_TRACE_STATUS.FORBIDDEN;
  if ([APEX_OS_BROWSER_ACTION_PLAN_STATE.BLOCKED_BY_PRIVACY, APEX_OS_BROWSER_ACTION_PLAN_STATE.BLOCKED_BY_UNTRUSTED_CONTENT].includes(planState)) return APEX_OS_TRACE_STATUS.BLOCKED;
  if (planState === APEX_OS_BROWSER_ACTION_PLAN_STATE.APPROVAL_REQUIRED) return APEX_OS_TRACE_STATUS.APPROVAL_REQUIRED;
  return APEX_OS_TRACE_STATUS.COMPLETED;
}

export function planApexOsBrowserAction(input = {}) {
  const description = text(input.description || input.question || input.request || "", TEXT_LIMIT);
  const intent = detectApexOsBrowserActionIntent(description);
  const actionPermissionSummary = actionPermissionSummaryFromInput(description, input);
  const privacyFirewallSummary = privacySummaryFromInput(description, input);
  const untrustedContentFirewallSummary = untrustedContentSummaryFromInput(input);
  const planState = normalizeApexOsBrowserActionPlanState(planStateFromSafety({
    intent,
    actionPermissionSummary,
    privacyFirewallSummary,
    untrustedContentFirewallSummary,
  }));
  const approvalRequired = planState === APEX_OS_BROWSER_ACTION_PLAN_STATE.APPROVAL_REQUIRED;
  const blocked = [
    APEX_OS_BROWSER_ACTION_PLAN_STATE.BLOCKED_BY_PRIVACY,
    APEX_OS_BROWSER_ACTION_PLAN_STATE.BLOCKED_BY_UNTRUSTED_CONTENT,
  ].includes(planState);
  const forbidden = planState === APEX_OS_BROWSER_ACTION_PLAN_STATE.FORBIDDEN;
  const traceMetadata = createApexOsTraceEntry({
    eventType: APEX_OS_TRACE_EVENT_TYPE.TOOL_ROUTE,
    source: APEX_OS_TRACE_SOURCE.TOOL_ROUTER,
    status: traceStatusForPlanState(planState),
    route: "browser-action-planning",
    modelTier: "deterministic",
    actionDomain: APEX_OS_ACTION_DOMAIN.BROWSER,
    riskTier: intent.riskTier,
    approvalRequired,
    forbidden,
    canExecuteNow: false,
    skillId: "browser-action-planning",
    reasonCode: `browser-action-${planState}`,
    safeMessage: "Phase 7B browser action plan created as content-free metadata; no navigation, click, typing, authenticated session use, scraping, or execution path was created.",
  });

  return Object.freeze({
    phase: APEX_OS_BROWSER_ACTION_PHASE,
    plannerId: "apex-os-browser-action-planning",
    requested: Boolean(intent.requested),
    planState,
    intent: normalizeApexOsBrowserActionIntent(intent.intent),
    riskTier: normalizeApexOsBrowserActionRiskTier(intent.riskTier),
    targetType: text(intent.targetType || TARGET_TYPE.UNKNOWN_BROWSER, 60),
    operatorOnly: true,
    planningOnly: true,
    reviewFirst: true,
    canPlanNow: [APEX_OS_BROWSER_ACTION_PLAN_STATE.PLANNED, APEX_OS_BROWSER_ACTION_PLAN_STATE.APPROVAL_REQUIRED].includes(planState),
    browserControlEnabled: false,
    browserNavigationEnabled: false,
    clickTypeSubmitEnabled: false,
    authenticatedSessionUseEnabled: false,
    pageScrapingEnabled: false,
    downloadUploadEnabled: false,
    extensionInstallEnabled: false,
    sessionCookieUseEnabled: false,
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
    requiredPreconditions: REQUIRED_PRECONDITIONS,
    dryRunStepIds: DRY_RUN_STEP_IDS,
    blockedActionIds: BLOCKED_ACTION_IDS,
    safeAlternative: text(approvalRequired
      ? "I can draft the browser workflow and approval packet, then wait before any external account, send, spend, booking, download/upload, or production action."
      : "I can draft a private browser plan and stop before navigation, clicks, typing, scraping, downloads, or authenticated session use.",
    SUMMARY_LIMIT),
    traceMetadata,
  });
}

export function buildApexOsBrowserActionSummary(value = {}, options = {}) {
  const plan = value?.plannerId ? value : planApexOsBrowserAction(value);
  const includeLists = Boolean(options.includeLists);
  const requested = Boolean(plan.requested);
  const planState = normalizeApexOsBrowserActionPlanState(plan.planState);
  const intent = normalizeApexOsBrowserActionIntent(plan.intent);
  const riskTier = normalizeApexOsBrowserActionRiskTier(plan.riskTier);
  const summaryText = requested
    ? `${planState}; intent=${intent}; risk=${riskTier}; browserControlEnabled=false; navigation=false; clickTypeSubmit=false; authenticatedSessionUse=false; canExecuteNow=false; executionLocked=true`
    : "not-requested; browserControlEnabled=false; navigation=false; clickTypeSubmit=false; authenticatedSessionUse=false; canExecuteNow=false; executionLocked=true";

  return Object.freeze({
    phase: APEX_OS_BROWSER_ACTION_PHASE,
    plannerId: "apex-os-browser-action-planning",
    requested,
    planState,
    intent,
    riskTier,
    targetType: text(plan.targetType || TARGET_TYPE.UNKNOWN_BROWSER, 60),
    operatorOnly: true,
    planningOnly: true,
    reviewFirst: true,
    canPlanNow: Boolean(plan.canPlanNow),
    browserControlEnabled: false,
    browserNavigationEnabled: false,
    clickTypeSubmitEnabled: false,
    authenticatedSessionUseEnabled: false,
    pageScrapingEnabled: false,
    downloadUploadEnabled: false,
    extensionInstallEnabled: false,
    sessionCookieUseEnabled: false,
    connectorExecutionEnabled: false,
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
    storesRawDom: false,
    storesRawPageText: false,
    storesCookiesTokensCredentials: false,
    ...(includeLists ? {
      requiredPreconditions: plan.requiredPreconditions || REQUIRED_PRECONDITIONS,
      dryRunStepIds: plan.dryRunStepIds || DRY_RUN_STEP_IDS,
      blockedActionIds: plan.blockedActionIds || BLOCKED_ACTION_IDS,
    } : {}),
    safeSummary: text(requested
      ? `Phase 7B browser action request classified as ${planState}/${intent}. It is operator-only, review-first, and non-executing; no browser control, navigation, click/type/submit, authenticated session use, page scraping, download/upload, or connector execution is enabled.`
      : "Phase 7B browser action planning is available for deterministic dry-run plans only; no browser control, navigation, click/type/submit, authenticated session use, scraping, or execution is enabled.",
    SUMMARY_LIMIT),
    summaryText: text(summaryText, SUMMARY_LIMIT),
  });
}
