import assert from "node:assert/strict";
import test from "node:test";

import {
  APEX_OS_PROVIDER_DECISION,
  APEX_OS_PROVIDER_MODE,
  buildApexOsCloudBudgetGuardFromEnv,
  buildApexOsLocalFirstProviderDecision,
  getApexOsRouteProviderBehavior,
  hasApexOsCloudOverridePhrase,
} from "./apexOsLocalFirstProviderPolicy.js";

test("Apex OS local-first policy defaults to local-first and local provider", () => {
  const decision = buildApexOsLocalFirstProviderDecision({
    route: "normal-chat",
    now: new Date("2026-06-06T12:00:00.000Z"),
  });

  assert.equal(decision.providerMode, APEX_OS_PROVIDER_MODE.LOCAL_FIRST);
  assert.equal(decision.decision, APEX_OS_PROVIDER_DECISION.USE_LOCAL);
  assert.equal(decision.providerFamily, "local");
  assert.equal(decision.cloudAllowedForRequest, false);
  assert.equal(decision.paidCloudAutomatic, false);
});

test("OpenAI key alone does not allow Apex OS cloud calls", () => {
  const decision = buildApexOsLocalFirstProviderDecision({
    route: "coding-analysis",
    localProviderAvailable: false,
    cloudProviderConfigured: true,
    serverCloudEnabled: false,
    cloudOverrideText: "Apex, use cloud for this request",
    privacyFirewallSummary: {},
    promptInjectionFirewallSummary: {},
    budgetGuard: { cloudAllowed: true },
  });

  assert.equal(decision.decision, APEX_OS_PROVIDER_DECISION.BLOCK_CLOUD);
  assert.equal(decision.cloudAllowedForRequest, false);
  assert.equal(decision.reasonCodes.includes("server-cloud-disabled"), true);
});

test("local provider unavailable never automatically falls back to paid cloud", () => {
  const decision = buildApexOsLocalFirstProviderDecision({
    route: "research",
    localProviderAvailable: false,
    cloudProviderConfigured: true,
    serverCloudEnabled: true,
    privacyFirewallSummary: {},
    promptInjectionFirewallSummary: {},
    budgetGuard: { cloudAllowed: true },
  });

  assert.equal(decision.decision, APEX_OS_PROVIDER_DECISION.ASK_BEFORE_CLOUD);
  assert.equal(decision.cloudAllowedForRequest, false);
  assert.equal(decision.reasonCodes.includes("manual-cloud-override-missing"), true);
});

test("explicit cloud phrase without server flag still blocks cloud", () => {
  const decision = buildApexOsLocalFirstProviderDecision({
    route: "complex-reasoning",
    localProviderAvailable: false,
    cloudProviderConfigured: true,
    serverCloudEnabled: false,
    cloudOverrideText: "Apex, use cloud for this request",
    privacyFirewallSummary: {},
    promptInjectionFirewallSummary: {},
    budgetGuard: { cloudAllowed: true },
  });

  assert.equal(decision.decision, APEX_OS_PROVIDER_DECISION.BLOCK_CLOUD);
  assert.equal(decision.explicitCloudOverride, true);
  assert.equal(decision.cloudAllowedForRequest, false);
  assert.equal(decision.reasonCodes.includes("server-cloud-disabled"), true);
});

test("server cloud flag without explicit phrase still blocks the cloud call and asks first", () => {
  const decision = buildApexOsLocalFirstProviderDecision({
    route: "risk-review",
    localProviderAvailable: false,
    cloudProviderConfigured: true,
    serverCloudEnabled: true,
    privacyFirewallSummary: {},
    promptInjectionFirewallSummary: {},
    budgetGuard: { cloudAllowed: true },
  });

  assert.equal(decision.decision, APEX_OS_PROVIDER_DECISION.ASK_BEFORE_CLOUD);
  assert.equal(decision.cloudAllowedForRequest, false);
  assert.equal(decision.reasonCodes.includes("manual-cloud-override-missing"), true);
});

test("routes that disallow cloud remain local even with override inputs", () => {
  const decision = buildApexOsLocalFirstProviderDecision({
    route: "normal-chat",
    localProviderAvailable: false,
    cloudProviderConfigured: true,
    serverCloudEnabled: true,
    cloudOverrideText: "Apex, use cloud for this request",
    privacyFirewallSummary: {},
    promptInjectionFirewallSummary: {},
    budgetGuard: { cloudAllowed: true },
  });

  assert.equal(decision.decision, APEX_OS_PROVIDER_DECISION.BLOCK_CLOUD);
  assert.equal(decision.routeAllowsCloud, false);
  assert.equal(decision.cloudAllowedForRequest, false);
  assert.equal(decision.reasonCodes.includes("route-cloud-disallowed"), true);
});

test("privacy and prompt-injection blocks prevent cloud use", () => {
  const privacyBlocked = buildApexOsLocalFirstProviderDecision({
    route: "research",
    localProviderAvailable: false,
    cloudProviderConfigured: true,
    serverCloudEnabled: true,
    cloudOverrideText: "Apex, use cloud for this request",
    privacyFirewallSummary: { blockedCount: 1 },
    promptInjectionFirewallSummary: {},
    budgetGuard: { cloudAllowed: true },
  });
  const injectionBlocked = buildApexOsLocalFirstProviderDecision({
    route: "research",
    localProviderAvailable: false,
    cloudProviderConfigured: true,
    serverCloudEnabled: true,
    cloudOverrideText: "Apex, use cloud for this request",
    privacyFirewallSummary: {},
    promptInjectionFirewallSummary: { highestRiskLevel: "critical" },
    budgetGuard: { cloudAllowed: true },
  });

  assert.equal(privacyBlocked.decision, APEX_OS_PROVIDER_DECISION.BLOCK_CLOUD);
  assert.equal(privacyBlocked.reasonCodes.includes("privacy-firewall-blocked-cloud"), true);
  assert.equal(injectionBlocked.decision, APEX_OS_PROVIDER_DECISION.BLOCK_CLOUD);
  assert.equal(injectionBlocked.reasonCodes.includes("prompt-injection-firewall-blocked-cloud"), true);
});

test("full approved override allows one cloud decision", () => {
  const decision = buildApexOsLocalFirstProviderDecision({
    route: "coding-analysis",
    providerMode: "cloud-override",
    localProviderAvailable: false,
    cloudProviderConfigured: true,
    serverCloudEnabled: true,
    cloudOverrideText: "Apex, use cloud for this request",
    privacyFirewallSummary: {},
    promptInjectionFirewallSummary: {},
    budgetGuard: { cloudAllowed: true },
  });

  assert.equal(decision.decision, APEX_OS_PROVIDER_DECISION.ALLOW_CLOUD_ONCE);
  assert.equal(decision.effectiveMode, APEX_OS_PROVIDER_MODE.CLOUD_ALLOWED_FOR_REQUEST);
  assert.equal(decision.cloudAllowedForRequest, true);
  assert.equal(decision.paidCloudAutomatic, false);
  assert.equal(decision.providerFamily, "cloud");
});

test("policy metadata excludes prompts, responses, and private content", () => {
  const privateText = "John private payment card 4111 1111 1111 1111";
  const decision = buildApexOsLocalFirstProviderDecision({
    route: "coding-analysis",
    cloudProviderConfigured: true,
    serverCloudEnabled: true,
    cloudOverrideText: `Apex, use cloud for this request. ${privateText}`,
    prompt: privateText,
    response: privateText,
    messages: [{ content: privateText }],
    privateContent: privateText,
    privacyFirewallSummary: {},
    promptInjectionFirewallSummary: {},
    budgetGuard: { cloudAllowed: true },
  });

  const serialized = JSON.stringify(decision);
  assert.equal(decision.storesRawPrompt, false);
  assert.equal(decision.storesRawResponse, false);
  assert.equal(decision.storesPrivateContent, false);
  assert.equal(serialized.includes(privateText), false);
  assert.equal(serialized.includes("4111"), false);
});

test("unknown route defaults to local and blocks cloud override", () => {
  const behavior = getApexOsRouteProviderBehavior("mystery-provider-route");
  const decision = buildApexOsLocalFirstProviderDecision({
    route: "mystery-provider-route",
    localProviderAvailable: false,
    cloudProviderConfigured: true,
    serverCloudEnabled: true,
    cloudOverrideText: "Apex, use cloud for this request",
    privacyFirewallSummary: {},
    promptInjectionFirewallSummary: {},
    budgetGuard: { cloudAllowed: true },
  });

  assert.equal(behavior.route, "unknown");
  assert.equal(behavior.cloudOverrideEligible, false);
  assert.equal(decision.decision, APEX_OS_PROVIDER_DECISION.BLOCK_CLOUD);
  assert.equal(decision.reasonCodes.includes("unknown-route-cloud-blocked"), true);
});

test("cloud override phrase detection and env budget guard are explicit", () => {
  assert.equal(hasApexOsCloudOverridePhrase("Apex, use cloud for this request"), true);
  assert.equal(hasApexOsCloudOverridePhrase("Use the better model if needed"), false);

  assert.equal(buildApexOsCloudBudgetGuardFromEnv({}).cloudAllowed, false);
  assert.equal(buildApexOsCloudBudgetGuardFromEnv({ APEX_OS_CLOUD_DAILY_CALL_LIMIT: "1" }).cloudAllowed, true);
});
