import {
  APEX_OS_MODEL_ROUTE,
  APEX_OS_MODEL_ROUTES,
  normalizeApexOsModelRoute,
} from "./apexOsModelRouter.js";

export const APEX_OS_PROVIDER_MODE = Object.freeze({
  LOCAL_ONLY: "local-only",
  LOCAL_FIRST: "local-first",
  CLOUD_DISABLED: "cloud-disabled",
  CLOUD_OVERRIDE: "cloud-override",
  CLOUD_ALLOWED_FOR_REQUEST: "cloud-allowed-for-request",
});

export const APEX_OS_PROVIDER_MODES = Object.freeze(Object.values(APEX_OS_PROVIDER_MODE));

export const APEX_OS_PROVIDER_DECISION = Object.freeze({
  USE_LOCAL: "use-local",
  USE_LOCAL_FALLBACK: "use-local-fallback",
  BLOCK_CLOUD: "block-cloud",
  ASK_BEFORE_CLOUD: "ask-before-cloud",
  ALLOW_CLOUD_ONCE: "allow-cloud-once",
});

export const APEX_OS_PROVIDER_DECISIONS = Object.freeze(Object.values(APEX_OS_PROVIDER_DECISION));

export const APEX_OS_CLOUD_OVERRIDE_PHRASE = "apex, use cloud for this request";

const TEXT_LIMIT = 260;

const LOCAL_DEFAULT_ROUTES = Object.freeze(new Set([
  APEX_OS_MODEL_ROUTE.INTENT_CLASSIFICATION,
  APEX_OS_MODEL_ROUTE.MEMORY_SUGGESTION,
  APEX_OS_MODEL_ROUTE.TASK_SUMMARY,
  APEX_OS_MODEL_ROUTE.SAFE_SUMMARY,
  APEX_OS_MODEL_ROUTE.NORMAL_CHAT,
  APEX_OS_MODEL_ROUTE.PLANNING,
  APEX_OS_MODEL_ROUTE.TOOL_ROUTING,
  APEX_OS_MODEL_ROUTE.PERMISSION_CLASSIFICATION,
  APEX_OS_MODEL_ROUTE.AFFECTIVE_STATE,
  APEX_OS_MODEL_ROUTE.BACKGROUND_LOOP,
  "memory",
  "tasks",
  "reminders",
  "device-command",
  "device-commands",
  "voice-stt",
  "voice-tts",
]));

const CLOUD_OVERRIDE_ELIGIBLE_ROUTES = Object.freeze(new Set([
  APEX_OS_MODEL_ROUTE.RESEARCH,
  APEX_OS_MODEL_ROUTE.KNOWLEDGE_SYNTHESIS,
  APEX_OS_MODEL_ROUTE.COMPLEX_REASONING,
  APEX_OS_MODEL_ROUTE.CODING_ANALYSIS,
  APEX_OS_MODEL_ROUTE.RISK_REVIEW,
  "hard-research",
  "hard-reasoning",
  "hard-coding",
]));

function text(value = "", limit = TEXT_LIMIT) {
  return String(value ?? "").replace(/\s+\n/g, "\n").replace(/\s+/g, " ").trim().slice(0, limit);
}

function lower(value = "") {
  return text(value, TEXT_LIMIT).toLowerCase();
}

export function isApexOsProviderFlagEnabled(value = false) {
  if (typeof value === "boolean") return value;
  const normalized = lower(value);
  return ["1", "true", "yes", "on", "enabled", "allow", "allowed"].includes(normalized);
}

export function normalizeApexOsProviderMode(value = APEX_OS_PROVIDER_MODE.LOCAL_FIRST) {
  const normalized = lower(value || APEX_OS_PROVIDER_MODE.LOCAL_FIRST);
  return APEX_OS_PROVIDER_MODES.includes(normalized) ? normalized : APEX_OS_PROVIDER_MODE.LOCAL_FIRST;
}

export function normalizeApexOsProviderRoute(value = APEX_OS_MODEL_ROUTE.NORMAL_CHAT) {
  const normalized = lower(value || APEX_OS_MODEL_ROUTE.NORMAL_CHAT);
  if (APEX_OS_MODEL_ROUTES.includes(normalized)) return normalizeApexOsModelRoute(normalized);
  if (LOCAL_DEFAULT_ROUTES.has(normalized) || CLOUD_OVERRIDE_ELIGIBLE_ROUTES.has(normalized)) return normalized;
  return "unknown";
}

export function hasApexOsCloudOverridePhrase(value = "") {
  const normalized = lower(value).replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
  return /\bapex\s+use\s+cloud\s+for\s+this\s+request\b/.test(normalized)
    || /\buse\s+cloud\s+for\s+this\s+request\b/.test(normalized);
}

export function getApexOsRouteProviderBehavior(route = APEX_OS_MODEL_ROUTE.NORMAL_CHAT) {
  const normalizedRoute = normalizeApexOsProviderRoute(route);
  const cloudOverrideEligible = CLOUD_OVERRIDE_ELIGIBLE_ROUTES.has(normalizedRoute);
  const localDefault = cloudOverrideEligible || LOCAL_DEFAULT_ROUTES.has(normalizedRoute);
  return Object.freeze({
    route: normalizedRoute,
    localDefault,
    cloudOverrideEligible,
    voiceCurrentCloudDependency: normalizedRoute === "voice-stt" || normalizedRoute === "voice-tts",
    unknownRoute: normalizedRoute === "unknown",
  });
}

function privacyAllowsCloud(summary = {}) {
  if (!summary || typeof summary !== "object") return true;
  if (summary.cloudAllowed === false || summary.allowsCloud === false) return false;
  if (Number(summary.blockedCount || 0) > 0) return false;
  if (Number(summary.approvalRequiredCount || 0) > 0) return false;
  if (/\b(block|blocked|approval-required)\b/i.test(String(summary.action || summary.privacyAction || ""))) return false;
  return true;
}

function promptInjectionAllowsCloud(summary = {}) {
  if (!summary || typeof summary !== "object") return true;
  if (summary.cloudAllowed === false || summary.allowsCloud === false) return false;
  if (summary.blocked === true || summary.requiresOperatorReview === true) return false;
  const highestRisk = lower(summary.highestRiskLevel || summary.highestRisk || summary.riskLevel || "");
  if (["high", "critical"].includes(highestRisk)) return false;
  return true;
}

function budgetAllowsCloud(guard = {}) {
  if (guard === true) return true;
  if (!guard || typeof guard !== "object") return false;
  if (guard.cloudAllowed === true || guard.allowed === true || guard.allowsCloud === true) return true;
  if (Number(guard.remainingCloudCalls || 0) > 0 && Number(guard.maxCloudCalls || 0) > 0) return true;
  return false;
}

export function buildApexOsCloudBudgetGuardFromEnv(env = {}) {
  const maxCalls = Math.max(0, Math.floor(Number(env.APEX_OS_CLOUD_DAILY_CALL_LIMIT || 0)));
  const budgetEnabled = isApexOsProviderFlagEnabled(env.APEX_OS_CLOUD_BUDGET_ENABLED);
  return Object.freeze({
    cloudAllowed: Boolean(budgetEnabled || maxCalls > 0),
    maxCloudCalls: maxCalls,
    remainingCloudCalls: maxCalls,
    reasonCode: budgetEnabled || maxCalls > 0 ? "cloud-budget-configured" : "cloud-budget-not-enabled",
  });
}

export function buildApexOsLocalFirstProviderDecision({
  route = APEX_OS_MODEL_ROUTE.NORMAL_CHAT,
  providerMode = APEX_OS_PROVIDER_MODE.LOCAL_FIRST,
  localProviderAvailable = true,
  cloudProviderConfigured = false,
  serverCloudEnabled = false,
  cloudKillSwitch = false,
  cloudOverrideText = "",
  explicitCloudOverride = false,
  privacyFirewallSummary = {},
  promptInjectionFirewallSummary = {},
  budgetGuard = {},
  now = new Date(),
} = {}) {
  const normalizedMode = normalizeApexOsProviderMode(providerMode);
  const routeBehavior = getApexOsRouteProviderBehavior(route);
  const privacyAllowed = privacyAllowsCloud(privacyFirewallSummary);
  const promptInjectionAllowed = promptInjectionAllowsCloud(promptInjectionFirewallSummary);
  const budgetAllowed = budgetAllowsCloud(budgetGuard);
  const overridePhrasePresent = Boolean(explicitCloudOverride || hasApexOsCloudOverridePhrase(cloudOverrideText));
  const localAvailable = Boolean(localProviderAvailable);
  const cloudConfigured = Boolean(cloudProviderConfigured);
  const cloudEnabled = Boolean(isApexOsProviderFlagEnabled(serverCloudEnabled));
  const killSwitchOn = Boolean(isApexOsProviderFlagEnabled(cloudKillSwitch));
  const modeAllowsCloud = ![
    APEX_OS_PROVIDER_MODE.LOCAL_ONLY,
    APEX_OS_PROVIDER_MODE.CLOUD_DISABLED,
  ].includes(normalizedMode);

  const reasonCodes = [];
  if (!localAvailable) reasonCodes.push("local-provider-unavailable");
  if (!cloudConfigured) reasonCodes.push("cloud-provider-not-configured");
  if (!cloudEnabled) reasonCodes.push("server-cloud-disabled");
  if (killSwitchOn) reasonCodes.push("cloud-kill-switch-on");
  if (!overridePhrasePresent) reasonCodes.push("manual-cloud-override-missing");
  if (!routeBehavior.cloudOverrideEligible) reasonCodes.push(routeBehavior.unknownRoute ? "unknown-route-cloud-blocked" : "route-cloud-disallowed");
  if (!privacyAllowed) reasonCodes.push("privacy-firewall-blocked-cloud");
  if (!promptInjectionAllowed) reasonCodes.push("prompt-injection-firewall-blocked-cloud");
  if (!budgetAllowed) reasonCodes.push("budget-guard-blocked-cloud");
  if (!modeAllowsCloud) reasonCodes.push("provider-mode-cloud-disabled");

  const cloudAllowedForRequest = Boolean(
    cloudConfigured
    && cloudEnabled
    && !killSwitchOn
    && overridePhrasePresent
    && routeBehavior.cloudOverrideEligible
    && privacyAllowed
    && promptInjectionAllowed
    && budgetAllowed
    && modeAllowsCloud
  );

  const cloudAttempted = Boolean(
    overridePhrasePresent
    || normalizedMode === APEX_OS_PROVIDER_MODE.CLOUD_OVERRIDE
    || normalizedMode === APEX_OS_PROVIDER_MODE.CLOUD_ALLOWED_FOR_REQUEST
  );

  const cloudReadyExceptPhrase = Boolean(
    cloudConfigured
    && cloudEnabled
    && !killSwitchOn
    && routeBehavior.cloudOverrideEligible
    && privacyAllowed
    && promptInjectionAllowed
    && budgetAllowed
    && modeAllowsCloud
  );

  let decision = APEX_OS_PROVIDER_DECISION.USE_LOCAL;
  if (cloudAllowedForRequest) {
    decision = APEX_OS_PROVIDER_DECISION.ALLOW_CLOUD_ONCE;
  } else if (cloudAttempted) {
    decision = APEX_OS_PROVIDER_DECISION.BLOCK_CLOUD;
  } else if (localAvailable) {
    decision = APEX_OS_PROVIDER_DECISION.USE_LOCAL;
  } else if (cloudReadyExceptPhrase) {
    decision = APEX_OS_PROVIDER_DECISION.ASK_BEFORE_CLOUD;
  } else {
    decision = APEX_OS_PROVIDER_DECISION.USE_LOCAL_FALLBACK;
  }

  const effectiveMode = cloudAllowedForRequest
    ? APEX_OS_PROVIDER_MODE.CLOUD_ALLOWED_FOR_REQUEST
    : normalizedMode;

  return Object.freeze({
    ok: true,
    providerMode: normalizedMode,
    effectiveMode,
    decision,
    route: routeBehavior.route,
    localDefault: routeBehavior.localDefault,
    localProviderAvailable: localAvailable,
    cloudProviderConfigured: cloudConfigured,
    serverCloudEnabled: cloudEnabled,
    cloudKillSwitch: killSwitchOn,
    explicitCloudOverride: overridePhrasePresent,
    routeAllowsCloud: routeBehavior.cloudOverrideEligible,
    privacyAllowsCloud: privacyAllowed,
    promptInjectionAllowsCloud: promptInjectionAllowed,
    budgetAllowsCloud: budgetAllowed,
    cloudAllowedForRequest,
    paidCloudAutomatic: false,
    providerFamily: decision === APEX_OS_PROVIDER_DECISION.ALLOW_CLOUD_ONCE
      ? "cloud"
      : decision === APEX_OS_PROVIDER_DECISION.USE_LOCAL
        ? "local"
        : "deterministic-fallback",
    fallbackMode: decision === APEX_OS_PROVIDER_DECISION.USE_LOCAL_FALLBACK || decision === APEX_OS_PROVIDER_DECISION.BLOCK_CLOUD
      ? "deterministic-local"
      : "",
    voiceCurrentCloudDependency: routeBehavior.voiceCurrentCloudDependency,
    reasonCodes: Object.freeze([...new Set(reasonCodes)]),
    metadataSafeForTrace: true,
    storesRawPrompt: false,
    storesRawResponse: false,
    storesPrivateContent: false,
    timestamp: new Date(now).toISOString(),
  });
}
