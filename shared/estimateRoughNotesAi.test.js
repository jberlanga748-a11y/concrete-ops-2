import assert from "node:assert/strict";
import test from "node:test";

import {
  buildEstimateRoughNotesContext,
  buildEstimateRoughNotesOpenAiRequest,
  generateEstimateRoughNotesDrafts,
  notConfiguredEstimateRoughNotesResponse,
  sanitizeEstimateRoughNotesResponse,
} from "./estimateRoughNotesAi.js";

test("estimate rough notes helper returns configured false safely without an API key", async () => {
  const result = await generateEstimateRoughNotesDrafts({
    context: buildEstimateRoughNotesContext({ roughNotes: "300 sf broom finish sidewalk." }),
    apiKey: "",
    fetchImpl: () => {
      throw new Error("fetch should not be called without a key");
    },
  });

  assert.deepEqual(result, notConfiguredEstimateRoughNotesResponse());
});

test("estimate rough notes context only includes safe proposal context", () => {
  const context = buildEstimateRoughNotesContext({
    roughNotes: "demo old walk, pour 4 inch broom finish, 300 sf, exclude permits",
    estimate: {
      id: "E-1",
      title: "Sidewalk replacement",
      status: "draft",
      scopeSummary: "Existing notes",
      internalNotes: "Office-only pricing strategy should not be included.",
      items: [{ description: "Concrete sidewalk", quantity: 300, unit: "sf", unitPrice: 12 }],
      customer: { name: "Martinez Residence", city: "Salem", email: "private@example.test" },
      lead: { customer: "Martinez Residence", project: "Driveway and sidewalk", notes: "Private lead notes" },
    },
    companySettings: { companyName: "Apex HQ", businessEmail: "office@example.test", serviceArea: "Willamette Valley" },
  });

  assert.equal(context.roughNotes.includes("broom finish"), true);
  assert.equal(context.estimate.title, "Sidewalk replacement");
  assert.equal(context.estimate.lineItems[0].description, "Concrete sidewalk");
  assert.equal(Object.hasOwn(context.estimate.lineItems[0], "unitPrice"), false);
  assert.equal(Object.hasOwn(context.estimate.customer, "email"), false);
  assert.equal(Object.hasOwn(context.estimate, "internalNotes"), false);
  assert.equal(context.company.name, "Apex HQ");
});

test("estimate rough notes request asks OpenAI for strict structured JSON", () => {
  const request = buildEstimateRoughNotesOpenAiRequest(buildEstimateRoughNotesContext({ roughNotes: "Sidewalk repair" }), "test-model");

  assert.equal(request.model, "test-model");
  assert.equal(request.response_format.type, "json_schema");
  assert.equal(request.response_format.json_schema.strict, true);
  assert.ok(request.response_format.json_schema.schema.required.includes("scopeOfWork"));
  assert.match(request.messages[0].content, /review-only/i);
  assert.match(request.messages[0].content, /Do not send/i);
});

test("estimate rough notes helper sanitizes AI output and avoids extra fields", () => {
  const result = sanitizeEstimateRoughNotesResponse({
    suggestedTitle: "A".repeat(300),
    scopeOfWork: "Demo and replace existing sidewalk.",
    inclusions: ["Demolition", 123, "", "Broom finish"],
    exclusions: ["Permits"],
    assumptions: ["Normal access"],
    scheduleNotes: "Coordinate before pour.",
    clarificationNotes: ["Confirm depth."],
    customerNotes: "Customer-ready terms.",
    gcProposalSummary: "GC summary.",
    gcCoverNote: "Cover note.",
    gcQualifications: "Qualifications.",
    internalReviewNotes: "Estimator should verify quantity.",
    reviewWarnings: ["No price was generated."],
    secret: "do not return",
  });

  assert.equal(result.ok, true);
  assert.equal(result.configured, true);
  assert.equal(result.suggestedTitle.length, 180);
  assert.deepEqual(result.inclusions, ["Demolition", "123", "Broom finish"]);
  assert.equal(Object.hasOwn(result, "secret"), false);
});

test("estimate rough notes helper uses mocked OpenAI response without real API calls", async () => {
  let captured = null;
  const result = await generateEstimateRoughNotesDrafts({
    context: buildEstimateRoughNotesContext({ roughNotes: "300 sf sidewalk replacement" }),
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
                  suggestedTitle: "Sidewalk Replacement Proposal",
                  scopeOfWork: "Remove existing sidewalk and place new broom-finished concrete sidewalk.",
                  inclusions: ["Demolition of existing sidewalk", "Placement of 4-inch broom-finished concrete"],
                  exclusions: ["Permits", "Unmarked utilities"],
                  assumptions: ["Normal access to work area"],
                  scheduleNotes: "Schedule to be coordinated after approval.",
                  clarificationNotes: ["Confirm final square footage before pricing."],
                  customerNotes: "Proposal is based on the listed scope and assumptions.",
                  gcProposalSummary: "Concrete sidewalk replacement with broom finish.",
                  gcCoverNote: "Please review the attached proposal for the sidewalk replacement scope.",
                  gcQualifications: "Excludes permits and unforeseen subgrade repairs.",
                  internalReviewNotes: "Estimator should verify base rock depth.",
                  reviewWarnings: ["No pricing was generated by AI."],
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
  assert.equal(result.scopeOfWork.includes("broom-finished"), true);
  assert.equal(captured.options.headers.Authorization, "Bearer test-key");
  assert.match(captured.options.body, /json_schema/);
});

test("estimate rough notes helper handles invalid AI JSON without exposing raw response", async () => {
  const result = await generateEstimateRoughNotesDrafts({
    context: buildEstimateRoughNotesContext({ roughNotes: "Sidewalk" }),
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
  assert.equal(result.scopeOfWork, "");
});
