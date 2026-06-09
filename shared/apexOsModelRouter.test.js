import assert from "node:assert/strict";
import test from "node:test";

import {
  APEX_OS_MODEL_BUDGET_LEVEL,
  APEX_OS_MODEL_ROUTE,
  APEX_OS_MODEL_ROUTES,
  APEX_OS_MODEL_TIER,
  buildApexOsModelUsageMetadata,
  buildApexOsSafeModelRouteFallback,
  getApexOsMaxOutputTokens,
  getApexOsModelAliasForRoute,
  getApexOsModelEscalationPolicy,
  inferApexOsModelRouteFromRequest,
  normalizeApexOsModelBudgetLevel,
  normalizeApexOsModelRoute,
  normalizeApexOsModelTier,
  resolveApexOsModelRoute,
} from "./apexOsModelRouter.js";

test("Apex OS model router exposes all Phase 4.5 routes", () => {
  assert.equal(APEX_OS_MODEL_ROUTES.includes(APEX_OS_MODEL_ROUTE.INTENT_CLASSIFICATION), true);
  assert.equal(APEX_OS_MODEL_ROUTES.includes(APEX_OS_MODEL_ROUTE.BACKGROUND_LOOP), true);
  assert.equal(APEX_OS_MODEL_ROUTES.length, 15);
});

test("Apex OS model router normalizes unknown values safely", () => {
  assert.equal(normalizeApexOsModelTier("FLAGSHIP"), APEX_OS_MODEL_TIER.FLAGSHIP);
  assert.equal(normalizeApexOsModelTier("unknown"), APEX_OS_MODEL_TIER.MINI);
  assert.equal(normalizeApexOsModelRoute("Research"), APEX_OS_MODEL_ROUTE.RESEARCH);
  assert.equal(normalizeApexOsModelRoute("not-real"), APEX_OS_MODEL_ROUTE.NORMAL_CHAT);
  assert.equal(normalizeApexOsModelBudgetLevel("DEEP"), APEX_OS_MODEL_BUDGET_LEVEL.DEEP);
  assert.equal(normalizeApexOsModelBudgetLevel("bottomless"), APEX_OS_MODEL_BUDGET_LEVEL.NORMAL);
});

test("each Apex OS model route maps to the expected tier", () => {
  const expected = new Map([
    [APEX_OS_MODEL_ROUTE.INTENT_CLASSIFICATION, APEX_OS_MODEL_TIER.NANO],
    [APEX_OS_MODEL_ROUTE.MEMORY_SUGGESTION, APEX_OS_MODEL_TIER.NANO],
    [APEX_OS_MODEL_ROUTE.TASK_SUMMARY, APEX_OS_MODEL_TIER.NANO],
    [APEX_OS_MODEL_ROUTE.SAFE_SUMMARY, APEX_OS_MODEL_TIER.NANO],
    [APEX_OS_MODEL_ROUTE.NORMAL_CHAT, APEX_OS_MODEL_TIER.MINI],
    [APEX_OS_MODEL_ROUTE.PLANNING, APEX_OS_MODEL_TIER.MINI],
    [APEX_OS_MODEL_ROUTE.RESEARCH, APEX_OS_MODEL_TIER.MINI],
    [APEX_OS_MODEL_ROUTE.KNOWLEDGE_SYNTHESIS, APEX_OS_MODEL_TIER.STANDARD],
    [APEX_OS_MODEL_ROUTE.TOOL_ROUTING, APEX_OS_MODEL_TIER.STANDARD],
    [APEX_OS_MODEL_ROUTE.PERMISSION_CLASSIFICATION, APEX_OS_MODEL_TIER.NANO],
    [APEX_OS_MODEL_ROUTE.COMPLEX_REASONING, APEX_OS_MODEL_TIER.FLAGSHIP],
    [APEX_OS_MODEL_ROUTE.CODING_ANALYSIS, APEX_OS_MODEL_TIER.FLAGSHIP],
    [APEX_OS_MODEL_ROUTE.RISK_REVIEW, APEX_OS_MODEL_TIER.FLAGSHIP],
    [APEX_OS_MODEL_ROUTE.AFFECTIVE_STATE, APEX_OS_MODEL_TIER.MINI],
    [APEX_OS_MODEL_ROUTE.BACKGROUND_LOOP, APEX_OS_MODEL_TIER.STANDARD],
  ]);

  for (const [route, tier] of expected) {
    const resolved = resolveApexOsModelRoute({ route, now: new Date("2026-06-06T12:00:00.000Z") });
    assert.equal(resolved.selectedTier, tier, route);
    assert.equal(resolved.storesRawPrompt, false, route);
    assert.equal(resolved.storesRawResponse, false, route);
  }
});

test("cheap and simple routes do not select flagship", () => {
  const cheapRoutes = [
    APEX_OS_MODEL_ROUTE.INTENT_CLASSIFICATION,
    APEX_OS_MODEL_ROUTE.MEMORY_SUGGESTION,
    APEX_OS_MODEL_ROUTE.TASK_SUMMARY,
    APEX_OS_MODEL_ROUTE.SAFE_SUMMARY,
    APEX_OS_MODEL_ROUTE.PERMISSION_CLASSIFICATION,
  ];

  for (const route of cheapRoutes) {
    const resolved = resolveApexOsModelRoute({ route });
    assert.notEqual(resolved.selectedTier, APEX_OS_MODEL_TIER.FLAGSHIP, route);
    assert.equal(resolved.escalationAllowed, false, route);
  }
});

test("complex, coding, and risk routes select stronger tiers", () => {
  assert.equal(resolveApexOsModelRoute({ route: APEX_OS_MODEL_ROUTE.COMPLEX_REASONING }).selectedTier, APEX_OS_MODEL_TIER.FLAGSHIP);
  assert.equal(resolveApexOsModelRoute({ route: APEX_OS_MODEL_ROUTE.CODING_ANALYSIS }).selectedTier, APEX_OS_MODEL_TIER.FLAGSHIP);
  assert.equal(resolveApexOsModelRoute({ route: APEX_OS_MODEL_ROUTE.RISK_REVIEW }).selectedTier, APEX_OS_MODEL_TIER.FLAGSHIP);
  assert.equal(resolveApexOsModelRoute({ route: APEX_OS_MODEL_ROUTE.KNOWLEDGE_SYNTHESIS }).selectedTier, APEX_OS_MODEL_TIER.STANDARD);
});

test("unknown routes fall back safely and never select flagship", () => {
  const resolved = resolveApexOsModelRoute({
    route: "telepathy-router",
    now: new Date("2026-06-06T12:00:00.000Z"),
  });

  assert.equal(resolved.route, APEX_OS_MODEL_ROUTE.NORMAL_CHAT);
  assert.equal(resolved.requestedRoute, "telepathy-router");
  assert.equal(resolved.selectedTier, APEX_OS_MODEL_TIER.MINI);
  assert.equal(resolved.budgetLevel, APEX_OS_MODEL_BUDGET_LEVEL.SMALL);
  assert.equal(resolved.maxOutputTokens, 420);
  assert.match(resolved.routeReason, /never flagship/i);

  const fallback = buildApexOsSafeModelRouteFallback({ requestedRoute: "unknown" });
  assert.equal(fallback.selectedTier, APEX_OS_MODEL_TIER.MINI);
});

test("max output token caps honor route and budget", () => {
  assert.equal(getApexOsMaxOutputTokens({ route: APEX_OS_MODEL_ROUTE.INTENT_CLASSIFICATION }), 180);
  assert.equal(getApexOsMaxOutputTokens({ route: APEX_OS_MODEL_ROUTE.COMPLEX_REASONING, budgetLevel: APEX_OS_MODEL_BUDGET_LEVEL.TINY }), 240);
  assert.equal(getApexOsMaxOutputTokens({ route: APEX_OS_MODEL_ROUTE.CODING_ANALYSIS, budgetLevel: APEX_OS_MODEL_BUDGET_LEVEL.DEEP }), 2000);
  assert.equal(getApexOsMaxOutputTokens({ maxOutputTokens: 5000 }), 4000);
  assert.equal(getApexOsMaxOutputTokens({ maxOutputTokens: 12 }), 80);
});

test("escalation policy is explicit and bounded", () => {
  const classification = getApexOsModelEscalationPolicy({
    route: APEX_OS_MODEL_ROUTE.INTENT_CLASSIFICATION,
  });
  const riskReview = getApexOsModelEscalationPolicy({
    route: APEX_OS_MODEL_ROUTE.NORMAL_CHAT,
    riskTier: "high-risk",
  });
  const ambiguous = getApexOsModelEscalationPolicy({
    route: APEX_OS_MODEL_ROUTE.PLANNING,
    ambiguity: true,
  });

  assert.equal(classification.escalationAllowed, false);
  assert.equal(riskReview.escalationAllowed, true);
  assert.equal(riskReview.maxTier, APEX_OS_MODEL_TIER.FLAGSHIP);
  assert.equal(ambiguous.escalationAllowed, true);
});

test("model aliases can be overridden without changing credentials or env", () => {
  const selected = resolveApexOsModelRoute({
    route: APEX_OS_MODEL_ROUTE.NORMAL_CHAT,
    modelAliases: { [APEX_OS_MODEL_TIER.MINI]: "custom-mini-model" },
  });

  assert.equal(selected.selectedModelAlias, "custom-mini-model");
  assert.equal(getApexOsModelAliasForRoute(APEX_OS_MODEL_ROUTE.KNOWLEDGE_SYNTHESIS), "gpt-4o");
});

test("usage metadata excludes prompt, response, messages, and private content", () => {
  const metadata = buildApexOsModelUsageMetadata({
    route: APEX_OS_MODEL_ROUTE.RESEARCH,
    budgetLevel: APEX_OS_MODEL_BUDGET_LEVEL.SMALL,
    prompt: "private prompt body",
    response: "private response body",
    messages: [{ content: "private conversation" }],
    rawContent: "secret body",
    now: new Date("2026-06-06T12:00:00.000Z"),
  });

  assert.equal(metadata.route, APEX_OS_MODEL_ROUTE.RESEARCH);
  assert.equal(metadata.selectedTier, APEX_OS_MODEL_TIER.MINI);
  assert.equal(metadata.maxOutputTokens, 650);
  assert.equal(metadata.storesRawPrompt, false);
  assert.equal(metadata.storesRawResponse, false);
  assert.equal(metadata.estimatedCost, null);
  assert.equal(Object.hasOwn(metadata, "prompt"), false);
  assert.equal(Object.hasOwn(metadata, "response"), false);
  assert.equal(Object.hasOwn(metadata, "messages"), false);
  assert.equal(Object.hasOwn(metadata, "rawContent"), false);
});

test("request inference selects practical routes from private Ask Apex context", () => {
  assert.equal(inferApexOsModelRouteFromRequest({
    question: "Deploy this to production",
    actionPermissionSummary: { riskTier: "high-risk" },
  }), APEX_OS_MODEL_ROUTE.RISK_REVIEW);
  assert.equal(inferApexOsModelRouteFromRequest({
    question: "Fix this bug in the app",
  }), APEX_OS_MODEL_ROUTE.CODING_ANALYSIS);
  assert.equal(inferApexOsModelRouteFromRequest({
    question: "Give me the detailed breakdown step by step",
  }), APEX_OS_MODEL_ROUTE.COMPLEX_REASONING);
  assert.equal(inferApexOsModelRouteFromRequest({
    question: "Research this and summarize sources",
  }), APEX_OS_MODEL_ROUTE.RESEARCH);
  assert.equal(inferApexOsModelRouteFromRequest({
    question: "Help me plan my week",
    assistantMode: "life-planner",
  }), APEX_OS_MODEL_ROUTE.PLANNING);
  assert.equal(inferApexOsModelRouteFromRequest({
    question: "What can you do?",
  }), APEX_OS_MODEL_ROUTE.NORMAL_CHAT);
});
