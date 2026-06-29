export const APEX_OS_MODEL_TIER = Object.freeze({
  NANO: "nano",
  MINI: "mini",
  STANDARD: "standard",
  FLAGSHIP: "flagship",
});

export const APEX_OS_MODEL_TIERS = Object.freeze(Object.values(APEX_OS_MODEL_TIER));

export const APEX_OS_MODEL_ROUTE = Object.freeze({
  INTENT_CLASSIFICATION: "intent-classification",
  MEMORY_SUGGESTION: "memory-suggestion",
  TASK_SUMMARY: "task-summary",
  SAFE_SUMMARY: "safe-summary",
  NORMAL_CHAT: "normal-chat",
  PLANNING: "planning",
  RESEARCH: "research",
  KNOWLEDGE_SYNTHESIS: "knowledge-synthesis",
  TOOL_ROUTING: "tool-routing",
  PERMISSION_CLASSIFICATION: "permission-classification",
  COMPLEX_REASONING: "complex-reasoning",
  CODING_ANALYSIS: "coding-analysis",
  RISK_REVIEW: "risk-review",
  AFFECTIVE_STATE: "affective-state",
  BACKGROUND_LOOP: "background-loop",
});

export const APEX_OS_MODEL_ROUTES = Object.freeze(Object.values(APEX_OS_MODEL_ROUTE));

export const APEX_OS_MODEL_BUDGET_LEVEL = Object.freeze({
  TINY: "tiny",
  SMALL: "small",
  NORMAL: "normal",
  DEEP: "deep",
});

export const APEX_OS_MODEL_BUDGET_LEVELS = Object.freeze(Object.values(APEX_OS_MODEL_BUDGET_LEVEL));

export const APEX_OS_MODEL_ALIAS_BY_TIER = Object.freeze({
  [APEX_OS_MODEL_TIER.NANO]: "gpt-4o-mini",
  [APEX_OS_MODEL_TIER.MINI]: "gpt-4o-mini",
  [APEX_OS_MODEL_TIER.STANDARD]: "gpt-4o",
  [APEX_OS_MODEL_TIER.FLAGSHIP]: "gpt-4o",
});

const ROUTE_CONFIG = Object.freeze({
  [APEX_OS_MODEL_ROUTE.INTENT_CLASSIFICATION]: {
    tier: APEX_OS_MODEL_TIER.NANO,
    budgetLevel: APEX_OS_MODEL_BUDGET_LEVEL.TINY,
    routeMaxOutputTokens: 180,
    escalationAllowed: false,
    reason: "Fast intent labels should use the cheapest compact tier.",
  },
  [APEX_OS_MODEL_ROUTE.MEMORY_SUGGESTION]: {
    tier: APEX_OS_MODEL_TIER.NANO,
    budgetLevel: APEX_OS_MODEL_BUDGET_LEVEL.TINY,
    routeMaxOutputTokens: 220,
    escalationAllowed: false,
    reason: "Simple memory suggestion extraction should stay tiny and cheap.",
  },
  [APEX_OS_MODEL_ROUTE.TASK_SUMMARY]: {
    tier: APEX_OS_MODEL_TIER.NANO,
    budgetLevel: APEX_OS_MODEL_BUDGET_LEVEL.SMALL,
    routeMaxOutputTokens: 280,
    escalationAllowed: false,
    reason: "Task summaries need compact output and do not need deep reasoning.",
  },
  [APEX_OS_MODEL_ROUTE.SAFE_SUMMARY]: {
    tier: APEX_OS_MODEL_TIER.NANO,
    budgetLevel: APEX_OS_MODEL_BUDGET_LEVEL.SMALL,
    routeMaxOutputTokens: 520,
    escalationAllowed: false,
    reason: "Safe summaries should prefer the cheapest capable tier.",
  },
  [APEX_OS_MODEL_ROUTE.NORMAL_CHAT]: {
    tier: APEX_OS_MODEL_TIER.MINI,
    budgetLevel: APEX_OS_MODEL_BUDGET_LEVEL.SMALL,
    routeMaxOutputTokens: 650,
    escalationAllowed: false,
    reason: "Normal private conversation should use a compact fast-answer tier.",
  },
  [APEX_OS_MODEL_ROUTE.PLANNING]: {
    tier: APEX_OS_MODEL_TIER.MINI,
    budgetLevel: APEX_OS_MODEL_BUDGET_LEVEL.NORMAL,
    routeMaxOutputTokens: 1600,
    escalationAllowed: true,
    reason: "Planning drafts usually fit the low-cost tier with optional escalation.",
  },
  [APEX_OS_MODEL_ROUTE.RESEARCH]: {
    tier: APEX_OS_MODEL_TIER.MINI,
    budgetLevel: APEX_OS_MODEL_BUDGET_LEVEL.NORMAL,
    routeMaxOutputTokens: 1200,
    escalationAllowed: true,
    reason: "Research summaries start on the low-cost tier and may escalate when complex.",
  },
  [APEX_OS_MODEL_ROUTE.KNOWLEDGE_SYNTHESIS]: {
    tier: APEX_OS_MODEL_TIER.STANDARD,
    budgetLevel: APEX_OS_MODEL_BUDGET_LEVEL.NORMAL,
    routeMaxOutputTokens: 1300,
    escalationAllowed: true,
    reason: "Knowledge synthesis can need stronger multi-source reasoning.",
  },
  [APEX_OS_MODEL_ROUTE.TOOL_ROUTING]: {
    tier: APEX_OS_MODEL_TIER.STANDARD,
    budgetLevel: APEX_OS_MODEL_BUDGET_LEVEL.SMALL,
    routeMaxOutputTokens: 700,
    escalationAllowed: true,
    reason: "Tool routing decisions should be stronger than simple labels but still compact.",
  },
  [APEX_OS_MODEL_ROUTE.PERMISSION_CLASSIFICATION]: {
    tier: APEX_OS_MODEL_TIER.NANO,
    budgetLevel: APEX_OS_MODEL_BUDGET_LEVEL.TINY,
    routeMaxOutputTokens: 220,
    escalationAllowed: false,
    reason: "Deterministic permission classification should stay small and cheap.",
  },
  [APEX_OS_MODEL_ROUTE.COMPLEX_REASONING]: {
    tier: APEX_OS_MODEL_TIER.FLAGSHIP,
    budgetLevel: APEX_OS_MODEL_BUDGET_LEVEL.DEEP,
    routeMaxOutputTokens: 2600,
    escalationAllowed: true,
    reason: "Ambiguous multi-step strategy can use the strongest tier.",
  },
  [APEX_OS_MODEL_ROUTE.CODING_ANALYSIS]: {
    tier: APEX_OS_MODEL_TIER.FLAGSHIP,
    budgetLevel: APEX_OS_MODEL_BUDGET_LEVEL.DEEP,
    routeMaxOutputTokens: 2600,
    escalationAllowed: true,
    reason: "Coding architecture and bug analysis can use the strongest tier.",
  },
  [APEX_OS_MODEL_ROUTE.RISK_REVIEW]: {
    tier: APEX_OS_MODEL_TIER.FLAGSHIP,
    budgetLevel: APEX_OS_MODEL_BUDGET_LEVEL.NORMAL,
    routeMaxOutputTokens: 1300,
    escalationAllowed: true,
    reason: "High-risk review benefits from stronger reasoning while execution stays locked.",
  },
  [APEX_OS_MODEL_ROUTE.AFFECTIVE_STATE]: {
    tier: APEX_OS_MODEL_TIER.MINI,
    budgetLevel: APEX_OS_MODEL_BUDGET_LEVEL.SMALL,
    routeMaxOutputTokens: 420,
    escalationAllowed: false,
    reason: "Affective-state reflection should stay compact and private.",
  },
  [APEX_OS_MODEL_ROUTE.BACKGROUND_LOOP]: {
    tier: APEX_OS_MODEL_TIER.STANDARD,
    budgetLevel: APEX_OS_MODEL_BUDGET_LEVEL.SMALL,
    routeMaxOutputTokens: 760,
    escalationAllowed: true,
    reason: "Background loops should be budgeted compactly with explicit escalation only.",
  },
});

const BUDGET_MAX_OUTPUT_TOKENS = Object.freeze({
  [APEX_OS_MODEL_BUDGET_LEVEL.TINY]: 240,
  [APEX_OS_MODEL_BUDGET_LEVEL.SMALL]: 650,
  [APEX_OS_MODEL_BUDGET_LEVEL.NORMAL]: 1300,
  [APEX_OS_MODEL_BUDGET_LEVEL.DEEP]: 2600,
});

const TEXT_LIMIT = 260;

function text(value = "", limit = TEXT_LIMIT) {
  return String(value ?? "").replace(/\s+\n/g, "\n").replace(/\s+/g, " ").trim().slice(0, limit);
}

function lower(value = "") {
  return text(value, TEXT_LIMIT).toLowerCase();
}

function matchesAny(value = "", patterns = []) {
  return patterns.some((pattern) => pattern.test(value));
}

export function normalizeApexOsModelTier(value = APEX_OS_MODEL_TIER.MINI, fallback = APEX_OS_MODEL_TIER.MINI) {
  const normalized = lower(value);
  return APEX_OS_MODEL_TIERS.includes(normalized) ? normalized : fallback;
}

export function normalizeApexOsModelRoute(value = APEX_OS_MODEL_ROUTE.NORMAL_CHAT, fallback = APEX_OS_MODEL_ROUTE.NORMAL_CHAT) {
  const normalized = lower(value);
  return APEX_OS_MODEL_ROUTES.includes(normalized) ? normalized : fallback;
}

export function normalizeApexOsModelBudgetLevel(value = APEX_OS_MODEL_BUDGET_LEVEL.NORMAL, fallback = APEX_OS_MODEL_BUDGET_LEVEL.NORMAL) {
  const normalized = lower(value);
  return APEX_OS_MODEL_BUDGET_LEVELS.includes(normalized) ? normalized : fallback;
}

export function getApexOsModelRouteConfig(route = APEX_OS_MODEL_ROUTE.NORMAL_CHAT) {
  const normalizedRoute = normalizeApexOsModelRoute(route);
  return Object.freeze({
    route: normalizedRoute,
    ...ROUTE_CONFIG[normalizedRoute],
  });
}

export function getApexOsModelAliasForTier(tier = APEX_OS_MODEL_TIER.MINI, modelAliases = {}) {
  const normalizedTier = normalizeApexOsModelTier(tier);
  const configuredAlias = text(modelAliases?.[normalizedTier] || "", 120);
  return configuredAlias || APEX_OS_MODEL_ALIAS_BY_TIER[normalizedTier] || APEX_OS_MODEL_ALIAS_BY_TIER[APEX_OS_MODEL_TIER.MINI];
}

export function getApexOsModelAliasForRoute(route = APEX_OS_MODEL_ROUTE.NORMAL_CHAT, options = {}) {
  const config = getApexOsModelRouteConfig(route);
  return getApexOsModelAliasForTier(config.tier, options.modelAliases);
}

export function getApexOsMaxOutputTokens({ route = APEX_OS_MODEL_ROUTE.NORMAL_CHAT, budgetLevel = "", maxOutputTokens = 0 } = {}) {
  if (Number.isFinite(Number(maxOutputTokens)) && Number(maxOutputTokens) > 0) {
    return Math.max(80, Math.min(4000, Math.round(Number(maxOutputTokens))));
  }
  const config = getApexOsModelRouteConfig(route);
  const normalizedBudget = normalizeApexOsModelBudgetLevel(budgetLevel || config.budgetLevel);
  const budgetCap = BUDGET_MAX_OUTPUT_TOKENS[normalizedBudget] || BUDGET_MAX_OUTPUT_TOKENS[APEX_OS_MODEL_BUDGET_LEVEL.NORMAL];
  return Math.max(80, Math.min(config.routeMaxOutputTokens, budgetCap));
}

export function getApexOsModelEscalationPolicy({ route = APEX_OS_MODEL_ROUTE.NORMAL_CHAT, budgetLevel = "", riskTier = "", ambiguity = false } = {}) {
  const config = getApexOsModelRouteConfig(route);
  const normalizedBudget = normalizeApexOsModelBudgetLevel(budgetLevel || config.budgetLevel);
  const highRisk = /\b(high-risk|forbidden|external-action|approval-required)\b/i.test(String(riskTier || ""));
  const strongerRoutes = new Set([
    APEX_OS_MODEL_ROUTE.KNOWLEDGE_SYNTHESIS,
    APEX_OS_MODEL_ROUTE.TOOL_ROUTING,
    APEX_OS_MODEL_ROUTE.COMPLEX_REASONING,
    APEX_OS_MODEL_ROUTE.CODING_ANALYSIS,
    APEX_OS_MODEL_ROUTE.RISK_REVIEW,
    APEX_OS_MODEL_ROUTE.BACKGROUND_LOOP,
  ]);
  const escalationAllowed = Boolean(config.escalationAllowed || strongerRoutes.has(config.route) || highRisk || ambiguity);
  const maxTier = normalizedBudget === APEX_OS_MODEL_BUDGET_LEVEL.DEEP || highRisk || ambiguity
    ? APEX_OS_MODEL_TIER.FLAGSHIP
    : strongerRoutes.has(config.route)
      ? APEX_OS_MODEL_TIER.STANDARD
      : config.tier;
  return Object.freeze({
    escalationAllowed,
    maxTier,
    reason: escalationAllowed
      ? "Escalation is allowed only for complexity, ambiguity, high-risk review, or explicitly approved deeper budget."
      : "Escalation is not allowed for compact classification or safe summary routes.",
  });
}

export function buildApexOsSafeModelRouteFallback({ requestedRoute = "", modelAliases = {}, now = new Date() } = {}) {
  const route = APEX_OS_MODEL_ROUTE.NORMAL_CHAT;
  const config = getApexOsModelRouteConfig(route);
  const escalationPolicy = getApexOsModelEscalationPolicy({ route });
  return Object.freeze({
    route,
    requestedRoute: text(requestedRoute, 80),
    selectedTier: config.tier,
    selectedModelAlias: getApexOsModelAliasForTier(config.tier, modelAliases),
    budgetLevel: config.budgetLevel,
    maxOutputTokens: getApexOsMaxOutputTokens({ route, budgetLevel: config.budgetLevel }),
    escalationAllowed: escalationPolicy.escalationAllowed,
    routeReason: "Unknown Apex OS model routes fall back to normal-chat on the mini tier, never flagship.",
    timestamp: new Date(now).toISOString(),
    storesRawPrompt: false,
    storesRawResponse: false,
    estimatedCost: null,
  });
}

export function resolveApexOsModelRoute({
  route = APEX_OS_MODEL_ROUTE.NORMAL_CHAT,
  budgetLevel = "",
  modelAliases = {},
  riskTier = "",
  ambiguity = false,
  routeReason = "",
  now = new Date(),
} = {}) {
  const requestedRoute = text(route, 80);
  if (!APEX_OS_MODEL_ROUTES.includes(lower(route))) {
    return buildApexOsSafeModelRouteFallback({ requestedRoute, modelAliases, now });
  }

  const config = getApexOsModelRouteConfig(route);
  const normalizedBudget = normalizeApexOsModelBudgetLevel(budgetLevel || config.budgetLevel);
  const escalationPolicy = getApexOsModelEscalationPolicy({
    route: config.route,
    budgetLevel: normalizedBudget,
    riskTier,
    ambiguity,
  });

  return Object.freeze({
    route: config.route,
    requestedRoute: config.route,
    selectedTier: config.tier,
    selectedModelAlias: getApexOsModelAliasForTier(config.tier, modelAliases),
    budgetLevel: normalizedBudget,
    maxOutputTokens: getApexOsMaxOutputTokens({ route: config.route, budgetLevel: normalizedBudget }),
    escalationAllowed: escalationPolicy.escalationAllowed,
    maxEscalationTier: escalationPolicy.maxTier,
    routeReason: text(routeReason || config.reason, 220),
    timestamp: new Date(now).toISOString(),
    storesRawPrompt: false,
    storesRawResponse: false,
    estimatedCost: null,
  });
}

export function buildApexOsModelUsageMetadata(input = {}) {
  const resolved = resolveApexOsModelRoute(input);
  return Object.freeze({
    route: resolved.route,
    selectedTier: resolved.selectedTier,
    selectedModelAlias: resolved.selectedModelAlias,
    budgetLevel: resolved.budgetLevel,
    maxOutputTokens: resolved.maxOutputTokens,
    escalationAllowed: resolved.escalationAllowed,
    maxEscalationTier: resolved.maxEscalationTier || resolved.selectedTier,
    routeReason: resolved.routeReason,
    timestamp: resolved.timestamp,
    storesRawPrompt: false,
    storesRawResponse: false,
    estimatedCost: null,
  });
}

export function inferApexOsModelRouteFromRequest({ question = "", actionPermissionSummary = {}, assistantMode = "" } = {}) {
  const normalized = lower(question);
  const riskTier = lower(actionPermissionSummary?.riskTier || "");
  const domain = lower(actionPermissionSummary?.domain || "");
  const mode = lower(assistantMode);

  if (["high-risk", "forbidden", "external-action"].includes(riskTier)) {
    return APEX_OS_MODEL_ROUTE.RISK_REVIEW;
  }
  if (matchesAny(normalized, [/\b(code|coding|bug|fix|build|implement|architecture|refactor|test failure|debug)\b/])) {
    return APEX_OS_MODEL_ROUTE.CODING_ANALYSIS;
  }
  if (matchesAny(normalized, [/\b(complex|strategy|multi[- ]step|ambiguous|hard decision|tradeoff|risk review|deep dive|detailed|detail|full answer|long answer|walk me through|step[- ]by[- ]step|breakdown)\b/])) {
    return APEX_OS_MODEL_ROUTE.COMPLEX_REASONING;
  }
  if (matchesAny(normalized, [/\b(research|look up|sources?|what changed|current facts?|latest)\b/]) || domain === "research") {
    return APEX_OS_MODEL_ROUTE.RESEARCH;
  }
  if (matchesAny(normalized, [/\b(memory suggestion|remember this|save this|preference|routine|goal)\b/]) || domain === "memory") {
    return APEX_OS_MODEL_ROUTE.MEMORY_SUGGESTION;
  }
  if (matchesAny(normalized, [/\b(task|reminder|summarize today|brief|daily brief)\b/]) || domain === "tasks") {
    return APEX_OS_MODEL_ROUTE.TASK_SUMMARY;
  }
  if (matchesAny(normalized, [/\b(plan|planning|priority|priorities|roadmap|what should|next step|handle today)\b/]) || mode === "life-planner") {
    return APEX_OS_MODEL_ROUTE.PLANNING;
  }
  if (riskTier === "approval-required") {
    return APEX_OS_MODEL_ROUTE.PERMISSION_CLASSIFICATION;
  }
  return APEX_OS_MODEL_ROUTE.NORMAL_CHAT;
}
