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

export const APEX_OS_MUSIC_SECOND_SCREEN_PHASE = "Phase 8";

export const APEX_OS_MUSIC_SECOND_SCREEN_PLAN_STATE = Object.freeze({
  NOT_REQUESTED: "not-requested",
  PLANNED: "planned",
  APPROVAL_REQUIRED: "approval-required",
  BLOCKED_BY_PRIVACY: "blocked-by-privacy",
  BLOCKED_BY_UNTRUSTED_CONTENT: "blocked-by-untrusted-content",
  FORBIDDEN: "forbidden",
});

export const APEX_OS_MUSIC_SECOND_SCREEN_PLAN_STATES = Object.freeze(Object.values(APEX_OS_MUSIC_SECOND_SCREEN_PLAN_STATE));

export const APEX_OS_MUSIC_SECOND_SCREEN_INTENT = Object.freeze({
  NOT_REQUESTED: "not-requested",
  FOCUS_MUSIC_PLAN: "focus-music-plan",
  PLAYLIST_SUGGESTION_PLAN: "playlist-suggestion-plan",
  MUSIC_CONTROL_PLAN: "music-control-plan",
  AUDIO_DEVICE_PLAN: "audio-device-plan",
  SECOND_SCREEN_LAYOUT_PLAN: "second-screen-layout-plan",
  MOVE_WINDOW_PLAN: "move-window-plan",
  DASHBOARD_DISPLAY_PLAN: "dashboard-display-plan",
  COMBINED_ENVIRONMENT_PLAN: "combined-environment-plan",
  FORBIDDEN: "forbidden",
});

export const APEX_OS_MUSIC_SECOND_SCREEN_INTENTS = Object.freeze(Object.values(APEX_OS_MUSIC_SECOND_SCREEN_INTENT));

export const APEX_OS_MUSIC_SECOND_SCREEN_RISK_TIER = Object.freeze({
  PREFERENCE_SUGGESTION_PLAN: "preference-suggestion-plan",
  ENVIRONMENT_LAYOUT_PLAN: "environment-layout-plan",
  DEVICE_CONTROL_PLAN: "device-control-plan",
  DESKTOP_WINDOW_CONTROL_PLAN: "desktop-window-control-plan",
  EXTERNAL_ACCOUNT_PLAN: "external-account-plan",
  MONEY_OR_SUBSCRIPTION_PLAN: "money-or-subscription-plan",
  PRODUCTION_DEPLOY_PLAN: "production-deploy-plan",
  FORBIDDEN: "forbidden",
});

export const APEX_OS_MUSIC_SECOND_SCREEN_RISK_TIERS = Object.freeze(Object.values(APEX_OS_MUSIC_SECOND_SCREEN_RISK_TIER));

export const APEX_OS_MUSIC_SECOND_SCREEN_SURFACE_TYPE = Object.freeze({
  NONE: "none",
  MUSIC: "music",
  SECOND_SCREEN: "second-screen",
  COMBINED: "combined",
});

const TEXT_LIMIT = 1000;
const SUMMARY_LIMIT = 520;

const REQUIRED_PRECONDITIONS = Object.freeze([
  "operator-visible-session",
  "operator-confirms-target-app-device-or-display",
  "privacy-firewall-cleared-or-redacted",
  "untrusted-content-firewall-cleared",
  "approval-boundary-reviewed",
  "manual-stop-path-known",
]);

const PLAN_STEP_IDS = Object.freeze([
  "classify-environment-intent",
  "identify-preferences-without-control",
  "check-device-window-account-risk",
  "draft-manual-setup-steps",
  "prepare-approval-packet-if-needed",
  "stop-before-execution",
]);

const BLOCKED_ACTION_IDS = Object.freeze([
  "play-pause-skip-music",
  "change-volume-output-device",
  "open-or-move-window",
  "control-second-screen",
  "use-music-account-session",
  "use-cookies-tokens-passwords-or-mfa",
  "install-connectors-or-plugins",
  "spend-money-or-subscribe",
  "send-message-email-or-notification",
  "order-book-or-write-calendar",
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
    targetContext: input.targetContext || APEX_OS_PRIVACY_CONTEXT.DESKTOP_TOOL,
  });
  return buildApexOsPrivacySummary([privacyResult]);
}

function untrustedContentSummaryFromInput(input = {}) {
  if (input.untrustedContentFirewallSummary?.highestRiskLevel) return input.untrustedContentFirewallSummary;
  if (input.untrustedContentResult?.metadata) return buildApexOsUntrustedContentSummary([input.untrustedContentResult]);
  return buildApexOsUntrustedContentSummary([]);
}

function normalizeApexOsMusicSecondScreenPlanState(value = APEX_OS_MUSIC_SECOND_SCREEN_PLAN_STATE.NOT_REQUESTED) {
  return normalizeEnum(value, APEX_OS_MUSIC_SECOND_SCREEN_PLAN_STATES, APEX_OS_MUSIC_SECOND_SCREEN_PLAN_STATE.NOT_REQUESTED);
}

function normalizeApexOsMusicSecondScreenIntent(value = APEX_OS_MUSIC_SECOND_SCREEN_INTENT.NOT_REQUESTED) {
  return normalizeEnum(value, APEX_OS_MUSIC_SECOND_SCREEN_INTENTS, APEX_OS_MUSIC_SECOND_SCREEN_INTENT.NOT_REQUESTED);
}

function normalizeApexOsMusicSecondScreenRiskTier(value = APEX_OS_MUSIC_SECOND_SCREEN_RISK_TIER.PREFERENCE_SUGGESTION_PLAN) {
  return normalizeEnum(value, APEX_OS_MUSIC_SECOND_SCREEN_RISK_TIERS, APEX_OS_MUSIC_SECOND_SCREEN_RISK_TIER.PREFERENCE_SUGGESTION_PLAN);
}

function environmentSignals(description = "") {
  const normalized = lower(description);
  const music = matchesAny(normalized, [/\b(music|playlist|song|spotify|apple music|focus music|sound|audio|speaker|headphones|volume|mute|unmute)\b/]);
  const secondScreen = matchesAny(normalized, [/\b(second screen|second monitor|monitor|display|screen|dashboard|split screen|workspace layout|focus setup|work setup|command center)\b/]);
  const suggestion = matchesAny(normalized, [/\b(suggest|recommend|plan|draft|idea|options?|setup|workflow)\b/]);
  const negatedExecution = matchesAny(normalized, [/\b(do not|don't|dont|never|no|without)\b.{0,80}\b(play|pause|skip|start|stop|control|change volume|mute|unmute|open|move|put|place|send|spend|buy|subscribe|book|order|execute)\b/]);
  const musicControl = !negatedExecution && matchesAny(normalized, [/\b(play|pause|skip|start|stop|resume)\b.{0,80}\b(music|playlist|song|spotify|apple music|focus music|audio|sound)\b/]);
  const audioDevice = !negatedExecution && matchesAny(normalized, [/\b(change|set|switch|route|mute|unmute|turn up|turn down)\b.{0,80}\b(volume|speaker|headphones|audio|sound|output device)\b/]);
  const windowControl = !negatedExecution && matchesAny(normalized, [
    /\b(move|open|put|place|show|launch|resize|snap|maximize)\b.{0,100}\b(window|app|browser|dashboard|screen|monitor|display|second screen|second monitor)\b/,
    /\b(second screen|second monitor|monitor|display)\b.{0,80}\b(move|open|put|place|show|launch|resize|snap|maximize)\b/,
  ]);
  const dashboardDisplay = matchesAny(normalized, [/\b(dashboard|control room|apex dashboard|apex hq|command center)\b.{0,80}\b(screen|monitor|display|second screen|second monitor|layout)\b/]);
  const externalAccount = matchesAny(normalized, [/\b(spotify|apple music|youtube music|account|login|log in|sign in|authenticated|session|cookie|password|mfa|2fa|otp)\b/]);
  const money = matchesAny(normalized, [/\b(subscribe|upgrade|premium|pay|buy|purchase|spend|checkout)\b/]);
  const production = matchesAny(normalized, [/\b(deploy|production|prod|rollback|release|schema|auth|provider|billing)\b/]);
  const forbidden = matchesAny(normalized, [
    /\b(hidden|silent|secret|spy|without (?:telling|asking|consent|approval|permission)|don't tell|do not tell)\b/,
    /\b(bypass|skip|circumvent)\b.{0,50}\b(mfa|2fa|captcha|paywall|approval|permission|login|auth)\b/,
    /\b(capture|extract|steal|copy|save|store|show|reveal|send|use)\b.{0,60}\b(password|cookie|session|token|secret|mfa|2fa|otp|api[_ -]?key)\b/,
  ]);
  const requested = music || secondScreen || ((suggestion || windowControl || musicControl || audioDevice) && matchesAny(normalized, [/\b(focus|work|dashboard|screen|monitor|music|audio|playlist)\b/]));

  return Object.freeze({
    requested,
    music,
    secondScreen,
    suggestion,
    negatedExecution,
    musicControl,
    audioDevice,
    windowControl,
    dashboardDisplay,
    externalAccount,
    money,
    production,
    forbidden,
  });
}

function surfaceTypeForSignals(signals = {}) {
  if (!signals.requested) return APEX_OS_MUSIC_SECOND_SCREEN_SURFACE_TYPE.NONE;
  if (signals.music && signals.secondScreen) return APEX_OS_MUSIC_SECOND_SCREEN_SURFACE_TYPE.COMBINED;
  if (signals.music) return APEX_OS_MUSIC_SECOND_SCREEN_SURFACE_TYPE.MUSIC;
  if (signals.secondScreen) return APEX_OS_MUSIC_SECOND_SCREEN_SURFACE_TYPE.SECOND_SCREEN;
  return APEX_OS_MUSIC_SECOND_SCREEN_SURFACE_TYPE.NONE;
}

export function detectApexOsMusicSecondScreenIntent(description = "") {
  const signals = environmentSignals(description);
  let intent = APEX_OS_MUSIC_SECOND_SCREEN_INTENT.NOT_REQUESTED;
  let riskTier = APEX_OS_MUSIC_SECOND_SCREEN_RISK_TIER.PREFERENCE_SUGGESTION_PLAN;

  if (!signals.requested) {
    return Object.freeze({
      requested: false,
      intent,
      riskTier,
      surfaceType: APEX_OS_MUSIC_SECOND_SCREEN_SURFACE_TYPE.NONE,
      signals,
    });
  }

  if (signals.forbidden) {
    intent = APEX_OS_MUSIC_SECOND_SCREEN_INTENT.FORBIDDEN;
    riskTier = APEX_OS_MUSIC_SECOND_SCREEN_RISK_TIER.FORBIDDEN;
  } else if (signals.production) {
    intent = APEX_OS_MUSIC_SECOND_SCREEN_INTENT.DASHBOARD_DISPLAY_PLAN;
    riskTier = APEX_OS_MUSIC_SECOND_SCREEN_RISK_TIER.PRODUCTION_DEPLOY_PLAN;
  } else if (signals.money) {
    intent = APEX_OS_MUSIC_SECOND_SCREEN_INTENT.MUSIC_CONTROL_PLAN;
    riskTier = APEX_OS_MUSIC_SECOND_SCREEN_RISK_TIER.MONEY_OR_SUBSCRIPTION_PLAN;
  } else if (signals.audioDevice) {
    intent = APEX_OS_MUSIC_SECOND_SCREEN_INTENT.AUDIO_DEVICE_PLAN;
    riskTier = APEX_OS_MUSIC_SECOND_SCREEN_RISK_TIER.DEVICE_CONTROL_PLAN;
  } else if (signals.musicControl) {
    intent = APEX_OS_MUSIC_SECOND_SCREEN_INTENT.MUSIC_CONTROL_PLAN;
    riskTier = signals.externalAccount
      ? APEX_OS_MUSIC_SECOND_SCREEN_RISK_TIER.EXTERNAL_ACCOUNT_PLAN
      : APEX_OS_MUSIC_SECOND_SCREEN_RISK_TIER.DEVICE_CONTROL_PLAN;
  } else if (signals.windowControl) {
    intent = APEX_OS_MUSIC_SECOND_SCREEN_INTENT.MOVE_WINDOW_PLAN;
    riskTier = APEX_OS_MUSIC_SECOND_SCREEN_RISK_TIER.DESKTOP_WINDOW_CONTROL_PLAN;
  } else if (signals.music && signals.secondScreen) {
    intent = APEX_OS_MUSIC_SECOND_SCREEN_INTENT.COMBINED_ENVIRONMENT_PLAN;
    riskTier = APEX_OS_MUSIC_SECOND_SCREEN_RISK_TIER.ENVIRONMENT_LAYOUT_PLAN;
  } else if (signals.dashboardDisplay || signals.secondScreen) {
    intent = signals.dashboardDisplay
      ? APEX_OS_MUSIC_SECOND_SCREEN_INTENT.DASHBOARD_DISPLAY_PLAN
      : APEX_OS_MUSIC_SECOND_SCREEN_INTENT.SECOND_SCREEN_LAYOUT_PLAN;
    riskTier = APEX_OS_MUSIC_SECOND_SCREEN_RISK_TIER.ENVIRONMENT_LAYOUT_PLAN;
  } else if (signals.suggestion) {
    intent = APEX_OS_MUSIC_SECOND_SCREEN_INTENT.PLAYLIST_SUGGESTION_PLAN;
    riskTier = APEX_OS_MUSIC_SECOND_SCREEN_RISK_TIER.PREFERENCE_SUGGESTION_PLAN;
  } else {
    intent = APEX_OS_MUSIC_SECOND_SCREEN_INTENT.FOCUS_MUSIC_PLAN;
    riskTier = APEX_OS_MUSIC_SECOND_SCREEN_RISK_TIER.PREFERENCE_SUGGESTION_PLAN;
  }

  return Object.freeze({
    requested: true,
    intent,
    riskTier,
    surfaceType: surfaceTypeForSignals(signals),
    signals,
  });
}

function riskNeedsApproval(riskTier = APEX_OS_MUSIC_SECOND_SCREEN_RISK_TIER.PREFERENCE_SUGGESTION_PLAN) {
  return [
    APEX_OS_MUSIC_SECOND_SCREEN_RISK_TIER.DEVICE_CONTROL_PLAN,
    APEX_OS_MUSIC_SECOND_SCREEN_RISK_TIER.DESKTOP_WINDOW_CONTROL_PLAN,
    APEX_OS_MUSIC_SECOND_SCREEN_RISK_TIER.EXTERNAL_ACCOUNT_PLAN,
    APEX_OS_MUSIC_SECOND_SCREEN_RISK_TIER.MONEY_OR_SUBSCRIPTION_PLAN,
    APEX_OS_MUSIC_SECOND_SCREEN_RISK_TIER.PRODUCTION_DEPLOY_PLAN,
  ].includes(riskTier);
}

function planStateFromSafety({ intent = {}, actionPermissionSummary = {}, privacyFirewallSummary = {}, untrustedContentFirewallSummary = {} } = {}) {
  const untrustedRiskLevel = normalizeApexOsPromptInjectionRisk(untrustedContentFirewallSummary.highestRiskLevel || APEX_OS_PROMPT_INJECTION_RISK.NONE);
  const untrustedBlocked = shouldBlockApexOsUntrustedRoute({
    ...untrustedContentFirewallSummary,
    highestRiskLevel: untrustedRiskLevel,
  });

  if (!intent.requested) return APEX_OS_MUSIC_SECOND_SCREEN_PLAN_STATE.NOT_REQUESTED;
  if (intent.riskTier === APEX_OS_MUSIC_SECOND_SCREEN_RISK_TIER.FORBIDDEN || actionPermissionSummary.forbidden) return APEX_OS_MUSIC_SECOND_SCREEN_PLAN_STATE.FORBIDDEN;
  if (privacyFirewallSummary.blockedCount > 0 || privacyFirewallSummary.actions?.includes(APEX_OS_PRIVACY_ACTION.BLOCK)) return APEX_OS_MUSIC_SECOND_SCREEN_PLAN_STATE.BLOCKED_BY_PRIVACY;
  if (privacyFirewallSummary.approvalRequiredCount > 0 || privacyFirewallSummary.actions?.includes(APEX_OS_PRIVACY_ACTION.APPROVAL_REQUIRED)) return APEX_OS_MUSIC_SECOND_SCREEN_PLAN_STATE.BLOCKED_BY_PRIVACY;
  if (untrustedBlocked) return APEX_OS_MUSIC_SECOND_SCREEN_PLAN_STATE.BLOCKED_BY_UNTRUSTED_CONTENT;
  const safeSuggestionOnly = [
    APEX_OS_MUSIC_SECOND_SCREEN_RISK_TIER.PREFERENCE_SUGGESTION_PLAN,
    APEX_OS_MUSIC_SECOND_SCREEN_RISK_TIER.ENVIRONMENT_LAYOUT_PLAN,
  ].includes(intent.riskTier) && ![
    APEX_OS_ACTION_DOMAIN.MUSIC,
    APEX_OS_ACTION_DOMAIN.DESKTOP,
    APEX_OS_ACTION_DOMAIN.BROWSER,
  ].includes(actionPermissionSummary.domain);

  if (
    riskNeedsApproval(intent.riskTier)
    || (actionPermissionSummary.requiresApproval && !safeSuggestionOnly)
    || [
      APEX_OS_ACTION_RISK_TIER.APPROVAL_REQUIRED,
      APEX_OS_ACTION_RISK_TIER.EXTERNAL_ACTION,
      APEX_OS_ACTION_RISK_TIER.HIGH_RISK,
    ].includes(actionPermissionSummary.riskTier) && !safeSuggestionOnly
    || [
      APEX_OS_ACTION_DOMAIN.MUSIC,
      APEX_OS_ACTION_DOMAIN.DESKTOP,
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
    ].includes(actionPermissionSummary.domain) && !safeSuggestionOnly
  ) {
    return APEX_OS_MUSIC_SECOND_SCREEN_PLAN_STATE.APPROVAL_REQUIRED;
  }
  return APEX_OS_MUSIC_SECOND_SCREEN_PLAN_STATE.PLANNED;
}

function traceStatusForPlanState(planState = APEX_OS_MUSIC_SECOND_SCREEN_PLAN_STATE.NOT_REQUESTED) {
  if (planState === APEX_OS_MUSIC_SECOND_SCREEN_PLAN_STATE.NOT_REQUESTED) return APEX_OS_TRACE_STATUS.SKIPPED;
  if (planState === APEX_OS_MUSIC_SECOND_SCREEN_PLAN_STATE.FORBIDDEN) return APEX_OS_TRACE_STATUS.FORBIDDEN;
  if ([APEX_OS_MUSIC_SECOND_SCREEN_PLAN_STATE.BLOCKED_BY_PRIVACY, APEX_OS_MUSIC_SECOND_SCREEN_PLAN_STATE.BLOCKED_BY_UNTRUSTED_CONTENT].includes(planState)) return APEX_OS_TRACE_STATUS.BLOCKED;
  if (planState === APEX_OS_MUSIC_SECOND_SCREEN_PLAN_STATE.APPROVAL_REQUIRED) return APEX_OS_TRACE_STATUS.APPROVAL_REQUIRED;
  return APEX_OS_TRACE_STATUS.COMPLETED;
}

function actionDomainForSurface(surfaceType = APEX_OS_MUSIC_SECOND_SCREEN_SURFACE_TYPE.NONE) {
  if (surfaceType === APEX_OS_MUSIC_SECOND_SCREEN_SURFACE_TYPE.MUSIC) return APEX_OS_ACTION_DOMAIN.MUSIC;
  if (surfaceType === APEX_OS_MUSIC_SECOND_SCREEN_SURFACE_TYPE.SECOND_SCREEN) return APEX_OS_ACTION_DOMAIN.DESKTOP;
  if (surfaceType === APEX_OS_MUSIC_SECOND_SCREEN_SURFACE_TYPE.COMBINED) return APEX_OS_ACTION_DOMAIN.MUSIC;
  return APEX_OS_ACTION_DOMAIN.PLANNING;
}

export function planApexOsMusicSecondScreen(input = {}) {
  const description = text(input.description || input.question || input.request || "", TEXT_LIMIT);
  const intent = detectApexOsMusicSecondScreenIntent(description);
  const actionPermissionSummary = actionPermissionSummaryFromInput(description, input);
  const privacyFirewallSummary = privacySummaryFromInput(description, input);
  const untrustedContentFirewallSummary = untrustedContentSummaryFromInput(input);
  const planState = normalizeApexOsMusicSecondScreenPlanState(planStateFromSafety({
    intent,
    actionPermissionSummary,
    privacyFirewallSummary,
    untrustedContentFirewallSummary,
  }));
  const approvalRequired = planState === APEX_OS_MUSIC_SECOND_SCREEN_PLAN_STATE.APPROVAL_REQUIRED;
  const blocked = [
    APEX_OS_MUSIC_SECOND_SCREEN_PLAN_STATE.BLOCKED_BY_PRIVACY,
    APEX_OS_MUSIC_SECOND_SCREEN_PLAN_STATE.BLOCKED_BY_UNTRUSTED_CONTENT,
  ].includes(planState);
  const forbidden = planState === APEX_OS_MUSIC_SECOND_SCREEN_PLAN_STATE.FORBIDDEN;
  const traceMetadata = createApexOsTraceEntry({
    eventType: APEX_OS_TRACE_EVENT_TYPE.TOOL_ROUTE,
    source: APEX_OS_TRACE_SOURCE.TOOL_ROUTER,
    status: traceStatusForPlanState(planState),
    route: "music-second-screen-planning",
    modelTier: "deterministic",
    actionDomain: actionDomainForSurface(intent.surfaceType),
    riskTier: intent.riskTier,
    approvalRequired,
    forbidden,
    canExecuteNow: false,
    skillId: "music-second-screen",
    reasonCode: `music-second-screen-${planState}`,
    safeMessage: "Phase 8 music and second-screen plan created as content-free metadata; no music, device, window, screen, connector, account, or execution path was created.",
  });

  return Object.freeze({
    phase: APEX_OS_MUSIC_SECOND_SCREEN_PHASE,
    plannerId: "apex-os-music-second-screen-planning",
    requested: Boolean(intent.requested),
    planState,
    intent: normalizeApexOsMusicSecondScreenIntent(intent.intent),
    riskTier: normalizeApexOsMusicSecondScreenRiskTier(intent.riskTier),
    surfaceType: text(intent.surfaceType || APEX_OS_MUSIC_SECOND_SCREEN_SURFACE_TYPE.NONE, 60),
    operatorOnly: true,
    planningOnly: true,
    reviewFirst: true,
    canPlanNow: [APEX_OS_MUSIC_SECOND_SCREEN_PLAN_STATE.PLANNED, APEX_OS_MUSIC_SECOND_SCREEN_PLAN_STATE.APPROVAL_REQUIRED].includes(planState),
    musicControlEnabled: false,
    audioDeviceControlEnabled: false,
    desktopWindowControlEnabled: false,
    secondScreenControlEnabled: false,
    browserControlEnabled: false,
    connectorExecutionEnabled: false,
    endpointEnabled: false,
    uiActivationEnabled: false,
    accountSessionUseEnabled: false,
    playbackHistoryAccessEnabled: false,
    screenLayoutReadEnabled: false,
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
      ? "I can draft the focus environment setup and approval packet, then wait before any music app, device, desktop, browser, window, account, spend, order, booking, or external action."
      : "I can suggest a private focus-music and second-screen setup plan, then stop before device, app, window, account, connector, or browser control.",
    SUMMARY_LIMIT),
    traceMetadata,
  });
}

export function buildApexOsMusicSecondScreenSummary(value = {}, options = {}) {
  const plan = value?.plannerId ? value : planApexOsMusicSecondScreen(value);
  const includeLists = Boolean(options.includeLists);
  const requested = Boolean(plan.requested);
  const planState = normalizeApexOsMusicSecondScreenPlanState(plan.planState);
  const intent = normalizeApexOsMusicSecondScreenIntent(plan.intent);
  const riskTier = normalizeApexOsMusicSecondScreenRiskTier(plan.riskTier);
  const summaryText = requested
    ? `${planState}; intent=${intent}; risk=${riskTier}; surface=${plan.surfaceType}; musicControlEnabled=false; secondScreenControlEnabled=false; desktopWindowControlEnabled=false; canExecuteNow=false; executionLocked=true`
    : "not-requested; musicControlEnabled=false; secondScreenControlEnabled=false; desktopWindowControlEnabled=false; canExecuteNow=false; executionLocked=true";

  return Object.freeze({
    phase: APEX_OS_MUSIC_SECOND_SCREEN_PHASE,
    plannerId: "apex-os-music-second-screen-planning",
    requested,
    planState,
    intent,
    riskTier,
    surfaceType: text(plan.surfaceType || APEX_OS_MUSIC_SECOND_SCREEN_SURFACE_TYPE.NONE, 60),
    operatorOnly: true,
    planningOnly: true,
    reviewFirst: true,
    canPlanNow: Boolean(plan.canPlanNow),
    musicControlEnabled: false,
    audioDeviceControlEnabled: false,
    desktopWindowControlEnabled: false,
    secondScreenControlEnabled: false,
    browserControlEnabled: false,
    connectorExecutionEnabled: false,
    endpointEnabled: false,
    uiActivationEnabled: false,
    accountSessionUseEnabled: false,
    playbackHistoryAccessEnabled: false,
    screenLayoutReadEnabled: false,
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
    storesDeviceState: false,
    storesPlaybackHistory: false,
    storesScreenLayoutContent: false,
    storesAccountSessionData: false,
    ...(includeLists ? {
      requiredPreconditions: plan.requiredPreconditions || REQUIRED_PRECONDITIONS,
      planStepIds: plan.planStepIds || PLAN_STEP_IDS,
      blockedActionIds: plan.blockedActionIds || BLOCKED_ACTION_IDS,
    } : {}),
    safeSummary: text(requested
      ? `Phase 8 music/second-screen request classified as ${planState}/${intent}. It is operator-only, review-first, and non-executing; no music playback, audio device control, desktop/window movement, second-screen control, browser control, account/session use, spend, or connector execution is enabled.`
      : "Phase 8 music/second-screen planning is available for private setup plans only; no music playback, audio device control, desktop/window movement, second-screen control, browser control, account/session use, or execution is enabled.",
    SUMMARY_LIMIT),
    summaryText: text(summaryText, SUMMARY_LIMIT),
  });
}
