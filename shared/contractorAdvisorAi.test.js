import assert from "node:assert/strict";
import test from "node:test";

import {
  buildContractorAdvisorContext,
  buildContractorAdvisorOpenAiRequest,
  buildLocalContractorAdvisorAnswer,
  generateContractorAdvisorAnswer,
  sanitizeContractorAdvisorResponse,
} from "./contractorAdvisorAi.js";

const workspace = {
  user: { id: "U-1", name: "Owner", role: "Owner" },
  currentCompanyId: "COMPANY-1",
  companySettings: { companyName: "Apex Concrete", serviceArea: "Salem", primaryTrade: "concrete" },
  permissions: {
    leads: { canView: true },
    estimates: { canView: true },
    jobs: { canView: true },
    reports: { canView: true },
    uploads: { canView: true },
    time: { canView: true },
    changeOrders: { canView: true },
    deliveryTickets: { canView: true },
    prePour: { canView: true },
    postPour: { canView: true },
  },
  leads: [
    { id: "L-1", customer: "Westview", project: "Shop slab", status: "new", source: "Referral" },
    { id: "L-2", customer: "ABC Builders", project: "Driveway", status: "contacted", source: "Website", followUpDueAt: "2026-05-27" },
  ],
  leadSources: [{ id: "LS-1", name: "Referral", type: "partner" }],
  estimates: [
    { id: "E-1", title: "Westview slab", status: "sent", total: 12000 },
    { id: "E-2", title: "ABC driveway", status: "draft", total: 8000 },
  ],
  jobs: [{ id: "J-1", title: "Shop slab", status: "in_progress" }],
  dailyReports: [{ id: "DR-1", title: "Shop slab report", status: "submitted" }],
  uploads: [{ id: "UP-1", title: "Before photo", status: "uploaded" }],
  timeEntries: [{ id: "TE-1", employeeName: "Luis", status: "active", clockInAt: "2026-05-27T15:00:00.000Z" }],
  changeOrderRequests: [{ id: "CO-1", title: "Extra base rock", status: "pending" }],
  deliveryTickets: [{ id: "DT-1", title: "Concrete ticket", status: "submitted" }],
  prePourChecklists: [{ id: "PP-1", title: "Shop pre-pour", status: "submitted" }],
  postPourChecklists: [],
};

test("contractor advisor builds marketing context and local answer", () => {
  const context = buildContractorAdvisorContext({
    question: "How do we market better?",
    workspace,
  });

  assert.equal(context.category, "marketing");
  assert.equal(context.summary.leads.open, 2);
  assert.equal(context.summary.estimates.sent, 1);

  const answer = buildLocalContractorAdvisorAnswer(context);
  assert.equal(answer.configured, false);
  assert.equal(answer.category, "marketing");
  assert.match(answer.answer, /conversion|marketing/i);
  assert.equal(answer.recommendedActions.some((action) => action.moduleId === "leads"), true);
});

test("contractor advisor answers where money is leaking from proof, time, and change orders", () => {
  const context = buildContractorAdvisorContext({
    question: "Where am I losing money?",
    workspace,
  });
  const answer = buildLocalContractorAdvisorAnswer(context);

  assert.equal(context.category, "profit_leak");
  assert.match(answer.answer, /change order|proof|time/i);
  assert.equal(answer.recommendedActions.some((action) => action.moduleId === "changeOrders"), true);
  assert.equal(answer.recommendedActions.some((action) => action.moduleId === "time"), true);
});

test("contractor advisor redacts secret-like prompt and response content", () => {
  const context = buildContractorAdvisorContext({
    question: "Check marketing. email owner@example.com password=secret123",
    workspace,
  });
  const response = sanitizeContractorAdvisorResponse({
    answer: "Send to owner@example.com with token=abc123",
    diagnosis: ["password=secret123"],
    recommendedActions: [{ label: "Review", reason: "api_key=abc123", moduleId: "leads", actionLabel: "Open Leads" }],
  });

  assert.doesNotMatch(JSON.stringify(context), /owner@example\.com|secret123/i);
  assert.doesNotMatch(JSON.stringify(response), /owner@example\.com|secret123|abc123/i);
  assert.match(JSON.stringify(response), /\[REDACTED\]/);
});

test("contractor advisor request asks OpenAI for strict structured contractor JSON", () => {
  const context = buildContractorAdvisorContext({
    question: "Where are margins leaking?",
    workspace,
  });
  const request = buildContractorAdvisorOpenAiRequest(context);

  assert.equal(request.model, "gpt-4o-mini");
  assert.equal(request.response_format.type, "json_schema");
  assert.equal(request.response_format.json_schema.name, "apex_contractor_advisor_answer");
  assert.match(request.messages[0].content, /contractor business operator/i);
  assert.match(request.messages[0].content, /Do not claim you sent emails/i);
});

test("contractor advisor uses local answer when OpenAI key is not configured", async () => {
  const context = buildContractorAdvisorContext({
    question: "How do we market better?",
    workspace,
  });
  const answer = await generateContractorAdvisorAnswer({ context, apiKey: "" });

  assert.equal(answer.configured, false);
  assert.equal(answer.ok, true);
  assert.match(answer.answer, /conversion|marketing/i);
});
