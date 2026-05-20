import assert from "node:assert/strict";
import test from "node:test";

import {
  buildOpportunityAssistantContext,
  buildOpportunityAssistantOpenAiRequest,
  buildLocalOpportunitySearchPlanResponse,
  buildOpportunitySearchPlanContext,
  buildOpportunitySearchPlanOpenAiRequest,
  generateOpportunityAssistantReview,
  generateOpportunitySearchPlan,
  sanitizeOpportunityAssistantResponse,
  sanitizeOpportunitySearchPlanResponse,
} from "./opportunityScoutAi.js";

test("opportunity assistant context keeps only safe opportunity fields", () => {
  const context = buildOpportunityAssistantContext({
    opportunity: {
      id: "FO-1",
      title: "School sidewalk repair",
      agency: "Albany School District",
      trade: "Concrete",
      fitScore: 84,
      bidDueAt: "2026-06-01T17:00:00Z",
      reasonToBid: "Local public work.",
      riskFlags: ["prevailing wage"],
      privateToken: "secret",
    },
    companySettings: { companyName: "Apex HQ", serviceArea: "Albany Oregon" },
  });

  assert.equal(context.opportunity.title, "School sidewalk repair");
  assert.equal(context.opportunity.fitScore, 84);
  assert.deepEqual(context.opportunity.riskFlags, ["prevailing wage"]);
  assert.equal(Object.hasOwn(context.opportunity, "privateToken"), false);
  assert.equal(context.company.name, "Apex HQ");
});

test("opportunity assistant request uses strict JSON and review-only instructions", () => {
  const request = buildOpportunityAssistantOpenAiRequest(buildOpportunityAssistantContext({
    opportunity: { title: "Library sidewalk bid" },
  }), "test-model");

  assert.equal(request.model, "test-model");
  assert.equal(request.response_format.type, "json_schema");
  assert.equal(request.response_format.json_schema.strict, true);
  assert.match(request.messages[0].content, /Do not send messages/i);
  assert.match(request.messages[0].content, /do not approve bids/i);
});

test("opportunity assistant sanitizes AI output", () => {
  const result = sanitizeOpportunityAssistantResponse({
    opportunitySummary: "Good local fit.",
    bidNoBidRecommendation: "Bid, pending documents.",
    recommendedNextStep: "Confirm addenda.",
    missingInfoQuestions: ["Where are the plans?", "", "Is there a walk-through?"],
    riskNotes: ["Prevailing wage"],
    estimatorHandoffNotes: "Check specs.",
    suggestedLeadNextStep: "Qualify bid package.",
    suggestedFollowUpTiming: "Today",
    unexpected: "ignored",
  });

  assert.equal(result.ok, true);
  assert.equal(result.opportunitySummary, "Good local fit.");
  assert.deepEqual(result.missingInfoQuestions, ["Where are the plans?", "Is there a walk-through?"]);
  assert.equal(Object.hasOwn(result, "unexpected"), false);
});

test("opportunity assistant returns configured false without an API key", async () => {
  const result = await generateOpportunityAssistantReview({
    context: buildOpportunityAssistantContext({ opportunity: { title: "Bid" } }),
    apiKey: "",
  });

  assert.equal(result.ok, true);
  assert.equal(result.configured, false);
  assert.match(result.message, /OPENAI_API_KEY/);
});

test("opportunity assistant uses mocked OpenAI response without real calls", async () => {
  const result = await generateOpportunityAssistantReview({
    context: buildOpportunityAssistantContext({ opportunity: { title: "Bid" } }),
    apiKey: "test-key",
    fetchImpl: async (_url, request) => {
      assert.equal(request.headers.Authorization, "Bearer test-key");
      return {
        ok: true,
        async json() {
          return {
            choices: [{
              message: {
                content: JSON.stringify({
                  opportunitySummary: "Good fit.",
                  bidNoBidRecommendation: "Bid after addenda review.",
                  recommendedNextStep: "Open plans and confirm deadline.",
                  missingInfoQuestions: ["Are drawings current?"],
                  riskNotes: ["Confirm wage rules."],
                  estimatorHandoffNotes: "Scope sidewalk repair.",
                  suggestedLeadNextStep: "Create lead and assign estimator.",
                  suggestedFollowUpTiming: "Today",
                }),
              },
            }],
          };
        },
      };
    },
  });

  assert.equal(result.configured, true);
  assert.equal(result.bidNoBidRecommendation, "Bid after addenda review.");
  assert.deepEqual(result.riskNotes, ["Confirm wage rules."]);
});

test("opportunity search plan context strips unsafe profile and source fields", () => {
  const context = buildOpportunitySearchPlanContext({
    searchProfile: {
      id: "OSP-1",
      name: "Daily public scan",
      trades: ["concrete"],
      keywords: ["sidewalk"],
      secretToken: "hidden",
    },
    leadSources: [{
      name: "Public portal",
      type: "Plan room",
      url: "https://example.com/bids",
      notes: "[2026-05-20 source check] Result: Missing Docs | Next: Request or locate documents manually | Source: Public portal | Note: Plans missing token=secret.",
      privateKey: "hidden",
    }],
    companySettings: { companyName: "Apex HQ", serviceArea: "Albany Oregon" },
  });

  assert.equal(context.searchProfile.name, "Daily public scan");
  assert.equal(Object.hasOwn(context.searchProfile, "secretToken"), false);
  assert.equal(context.leadSources[0].url, "https://example.com/bids");
  assert.equal(Object.hasOwn(context.leadSources[0], "privateKey"), false);
  assert.equal(context.recentSourceOutcomes[0].result, "missing_docs");
  assert.equal(context.recentSourceOutcomes[0].note.includes("secret"), false);
});

test("opportunity search plan request is strict and manual-only", () => {
  const request = buildOpportunitySearchPlanOpenAiRequest(buildOpportunitySearchPlanContext({
    searchProfile: { name: "Daily scan" },
  }), "test-model");

  assert.equal(request.model, "test-model");
  assert.equal(request.response_format.json_schema.strict, true);
  assert.match(request.messages[0].content, /Do not browse the web/i);
  assert.match(request.messages[0].content, /do not create leads/i);
});

test("opportunity search plan sanitizes output", () => {
  const result = sanitizeOpportunitySearchPlanResponse({
    searchSummary: "Check public sources first.",
    prioritySources: ["City portal"],
    searchQueries: ["Albany sidewalk RFP"],
    qualificationChecklist: ["Confirm bid date"],
    riskFilters: ["Out of area"],
    nextOfficeStep: "Open saved source.",
    unexpected: "ignored",
  });

  assert.equal(result.searchSummary, "Check public sources first.");
  assert.deepEqual(result.searchQueries, ["Albany sidewalk RFP"]);
  assert.equal(Object.hasOwn(result, "unexpected"), false);
});

test("local opportunity search plan fallback is deterministic and review-only", () => {
  const result = buildLocalOpportunitySearchPlanResponse(buildOpportunitySearchPlanContext({
    searchProfile: {
      name: "Daily public scan",
      trades: ["concrete"],
      serviceAreas: ["Salem"],
      sourceTypes: ["City bid page"],
      keywords: ["sidewalk", "ADA"],
      excludedKeywords: ["roofing"],
    },
    leadSources: [
      { name: "City bids", type: "Public bid portal" },
      {
        name: "County bids",
        type: "Public bid portal",
        notes: "[2026-05-20 source check] Result: Found Work | Next: Save found opportunity | Source: County bids | Note: ADA ramp packet found.",
      },
    ],
    companySettings: { companyName: "Apex HQ", serviceArea: "Salem Oregon" },
  }));

  assert.equal(result.ok, true);
  assert.equal(result.configured, false);
  assert.equal(result.localFallback, true);
  assert.equal(result.prioritySources[0], "County bids");
  assert.match(result.searchQueries.join(" "), /Salem concrete sidewalk/i);
  assert.match(result.qualificationChecklist.join(" "), /Create a lead only after Approve For Lead/i);
  assert.match(result.riskFilters.join(" "), /CAPTCHA/i);
  assert.match(result.riskFilters.join(" "), /Exclude: roofing/i);
  assert.match(result.nextOfficeStep, /recent Found Work/i);
});

test("opportunity search plan returns a local review-only plan without an API key", async () => {
  const result = await generateOpportunitySearchPlan({
    context: buildOpportunitySearchPlanContext({
      searchProfile: {
        name: "Daily scan",
        trades: ["concrete"],
        serviceAreas: ["Albany"],
        keywords: ["sidewalk"],
      },
    }),
    apiKey: "",
  });

  assert.equal(result.ok, true);
  assert.equal(result.configured, false);
  assert.equal(result.localFallback, true);
  assert.match(result.searchSummary, /Daily scan/);
  assert.match(result.nextOfficeStep, /paste real evidence/i);
});

test("opportunity search plan uses mocked OpenAI response without real calls", async () => {
  const result = await generateOpportunitySearchPlan({
    context: buildOpportunitySearchPlanContext({ searchProfile: { name: "Daily scan" } }),
    apiKey: "test-key",
    fetchImpl: async (_url, request) => {
      assert.equal(request.headers.Authorization, "Bearer test-key");
      return {
        ok: true,
        async json() {
          return {
            choices: [{
              message: {
                content: JSON.stringify({
                  searchSummary: "Start with public bid portals.",
                  prioritySources: ["City portal", "GC inbox"],
                  searchQueries: ["Albany sidewalk bid invite"],
                  qualificationChecklist: ["Bid date", "Plan access"],
                  riskFilters: ["Out of area"],
                  nextOfficeStep: "Open the top portal and save real matches.",
                }),
              },
            }],
          };
        },
      };
    },
  });

  assert.equal(result.configured, true);
  assert.equal(result.searchQueries[0], "Albany sidewalk bid invite");
  assert.deepEqual(result.prioritySources, ["City portal", "GC inbox"]);
});
