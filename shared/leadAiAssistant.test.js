import assert from "node:assert/strict";
import test from "node:test";

import {
  buildLeadAssistantContext,
  buildLeadAssistantOpenAiRequest,
  generateLeadAssistantDrafts,
  notConfiguredLeadAssistantResponse,
  sanitizeLeadAssistantResponse,
} from "./leadAiAssistant.js";

test("lead assistant returns configured false safely without an API key", async () => {
  const result = await generateLeadAssistantDrafts({
    context: buildLeadAssistantContext({ lead: { customer: "Acme", project: "Sidewalk" } }),
    apiKey: "",
    fetchImpl: () => {
      throw new Error("fetch should not be called without a key");
    },
  });

  assert.deepEqual(result, notConfiguredLeadAssistantResponse());
});

test("lead assistant context only includes safe lead, source, score, missing info, and company fields", () => {
  const context = buildLeadAssistantContext({
    lead: {
      id: "L-1",
      customer: "Benton County",
      trade: "roofing",
      project: "Sidewalk replacement",
      city: "Albany",
      source: "Lead Finder",
      notes: "Lead source: Oregon public bids\nPhone: 541-555-0123",
      fitScore: 88,
      fitLabel: "Strong Fit",
      fitRisks: ["Confirm timeline"],
      missingInfoStatus: "Needs Info",
      missingInfoCount: 1,
      missingInfoItems: [{ label: "Project address", severity: "recommended", reason: "Confirm site." }],
    },
    leadSources: [{ name: "Oregon public bids", type: "public bid portal", url: "https://example.test/private", notes: "Public portal only." }],
    companySettings: {
      companyName: "Apex HQ",
      businessEmail: "office@example.test",
      serviceArea: "Willamette Valley",
      agentLearningPreferences: [{
        id: "MEM-1",
        title: "Lead qualification",
        preference: "Ask for site access before estimating.",
        status: "approved",
      }],
    },
  });

  assert.equal(context.lead.customer, "Benton County");
  assert.equal(context.lead.trade, "roofing");
  assert.equal(context.leadScore.fitLabel, "Strong Fit");
  assert.equal(context.missingInfo.items[0].label, "Project address");
  assert.equal(context.leadSource.name, "Oregon public bids");
  assert.equal(context.constructionTrade.tradeId, "roofing");
  assert.ok(context.constructionTrade.optionFamilies.some((option) => /shingle/i.test(option)));
  assert.equal(context.company.name, "Apex HQ");
  assert.equal(context.agentLearning[0].title, "Lead qualification");
  assert.equal(Object.hasOwn(context, "customers"), false);
  assert.equal(Object.hasOwn(context, "jobs"), false);
});

test("lead assistant request asks OpenAI for strict structured JSON", () => {
  const request = buildLeadAssistantOpenAiRequest(buildLeadAssistantContext({ lead: { customer: "Acme" } }), "test-model");

  assert.equal(request.model, "test-model");
  assert.equal(request.response_format.type, "json_schema");
  assert.equal(request.response_format.json_schema.strict, true);
  assert.ok(request.response_format.json_schema.schema.required.includes("followUpEmailDraft"));
  assert.match(request.messages[0].content, /review-only drafts/i);
  assert.match(request.messages[0].content, /constructionTrade context/i);
});

test("lead assistant sanitizes AI output and avoids extra fields", () => {
  const result = sanitizeLeadAssistantResponse({
    leadSummary: "A".repeat(1200),
    recommendedNextStep: "Call the lead.",
    missingInfoQuestions: ["What is the site address?", 123, "", "When do you want work done?"],
    followUpEmailDraft: "Subject: Follow-up\n\nHello.",
    followUpSmsDraft: "Hi, following up on your project.",
    callScript: "Ask about scope.",
    estimatingHandoffNotes: "Office notes for estimating.",
    riskNotes: ["Missing address", ""],
    suggestedStatus: "Contacted",
    suggestedFollowUpTiming: "Today",
    secret: "do not return",
  });

  assert.equal(result.ok, true);
  assert.equal(result.configured, true);
  assert.equal(result.leadSummary.length, 900);
  assert.deepEqual(result.missingInfoQuestions, ["What is the site address?", "123", "When do you want work done?"]);
  assert.equal(Object.hasOwn(result, "secret"), false);
});

test("lead assistant uses mocked OpenAI response without real API calls", async () => {
  let captured = null;
  const result = await generateLeadAssistantDrafts({
    context: buildLeadAssistantContext({ lead: { customer: "Acme", project: "Driveway" } }),
    apiKey: "test-key",
    fetchImpl: async (url, options) => {
      captured = { url, options };
      return {
        ok: true,
        async json() {
          return {
            choices: [{
              message: {
                content: JSON.stringify({
                  leadSummary: "Acme needs driveway follow-up.",
                  recommendedNextStep: "Ask for site address and timing.",
                  missingInfoQuestions: ["What is the project address?"],
                  followUpEmailDraft: "Subject: Driveway follow-up\n\nCan you share the address?",
                  followUpSmsDraft: "Hi, following up on your driveway project. What is the site address?",
                  callScript: "Confirm scope, address, and timing.",
                  estimatingHandoffNotes: "Estimate after address is confirmed.",
                  riskNotes: ["Missing address"],
                  suggestedStatus: "Contacted",
                  suggestedFollowUpTiming: "Today",
                }),
              },
            }],
          };
        },
      };
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.configured, true);
  assert.equal(result.recommendedNextStep, "Ask for site address and timing.");
  assert.equal(captured.options.headers.Authorization, "Bearer test-key");
  assert.match(captured.options.body, /json_schema/);
});

test("lead assistant handles invalid AI JSON without exposing raw response", async () => {
  const result = await generateLeadAssistantDrafts({
    context: buildLeadAssistantContext({ lead: { customer: "Acme" } }),
    apiKey: "test-key",
    fetchImpl: async () => ({
      ok: true,
      async json() {
        return { choices: [{ message: { content: "{not json" } }] };
      },
    }),
  });

  assert.equal(result.ok, false);
  assert.equal(result.configured, true);
  assert.match(result.message, /could not read/i);
  assert.equal(result.followUpSmsDraft, "");
});
