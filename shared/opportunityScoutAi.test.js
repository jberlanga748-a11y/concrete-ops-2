import assert from "node:assert/strict";
import test from "node:test";

import {
  buildOpportunityAssistantContext,
  buildOpportunityAssistantOpenAiRequest,
  generateOpportunityAssistantReview,
  sanitizeOpportunityAssistantResponse,
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
