import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveApexAgentCustomerConversationPreview,
  resolveApexAgentCustomerConversationMessage,
} from "./apex-agent-customer-conversation-utils.js";

const ownerPermissions = {
  aiOffice: { canView: true },
  jobs: { canView: true, canManageAll: true },
  leads: { canView: true },
  customers: { canView: true },
  estimates: { canView: true },
  reports: { canView: true },
  uploads: { canView: true },
};

function buildPreview(overrides = {}) {
  return deriveApexAgentCustomerConversationPreview({
    permissions: ownerPermissions,
    companySettings: { companyName: "Ace Concrete" },
    customers: [{ id: "CUST-1", name: "Newco Builders" }],
    jobs: [
      {
        id: "JOB-1",
        customerId: "CUST-1",
        customerName: "Newco Builders",
        title: "Newco sidewalk",
        status: "scheduled",
        scheduledStart: "2026-06-02",
        nextStep: "Office confirms crew window after foreman review.",
      },
    ],
    estimates: [
      {
        id: "EST-1",
        customerId: "CUST-1",
        customerName: "Newco Builders",
        title: "Newco sidewalk estimate",
        status: "approved",
        scopeSummary: "300 SF sidewalk tear-out and replacement.",
      },
    ],
    uploads: [{ id: "UPLOAD-1", jobId: "JOB-1" }],
    dailyReports: [{ id: "REPORT-1", jobId: "JOB-1", status: "submitted" }],
    changeOrderRequests: [{ id: "COR-1", jobId: "JOB-1", status: "approved" }],
    ...overrides,
  });
}

test("Apex Agent customer conversation preview builds owner-safe internal context", () => {
  const preview = buildPreview();

  assert.equal(preview.canView, true);
  assert.equal(preview.modeLabel, "Internal preview");
  assert.match(preview.headline, /Apex Agent customer conversation preview/i);
  assert.equal(preview.context.customerName, "Newco Builders");
  assert.equal(preview.context.jobTitle, "Newco sidewalk");
  assert.equal(preview.context.estimateStatus, "approved");
  assert.equal(preview.context.proofPhotoCount, 1);
  assert.equal(preview.context.progressReportCount, 1);
  assert.equal(preview.context.reviewedChangeOrderCount, 1);
  assert.equal(preview.starterPrompts.some((prompt) => /proof photos/i.test(prompt)), true);
  assert.equal(preview.blockedActions.some((item) => /No customer send/i.test(item)), true);
});

test("Apex Agent customer conversation preview blocks field-only users", () => {
  const preview = buildPreview({
    permissions: {
      aiOffice: { canView: false },
      opportunityScout: { canView: false },
      leads: { canView: false },
      jobs: { canManageField: true, canManageAll: false },
    },
  });
  const reply = resolveApexAgentCustomerConversationMessage("Can I get an update?", preview);

  assert.equal(preview.canView, false);
  assert.equal(preview.modeLabel, "Locked");
  assert.equal(reply.intent, "blocked");
  assert.match(reply.message, /not available/i);
});

test("Apex Agent customer conversation preview obeys contractor automation policy", () => {
  const preview = buildPreview({
    companySettings: {
      companyName: "Ace Concrete",
      apexAgentAutomationPolicy: {
        capabilitySwitches: {
          customerConversationPreview: false,
        },
      },
    },
  });

  assert.equal(preview.canView, false);
  assert.equal(preview.modeLabel, "Off by policy");
  assert.match(preview.summary, /paused by this contractor/i);
});

test("Apex Agent schedule questions escalate without promising crew timing", () => {
  const reply = resolveApexAgentCustomerConversationMessage("When is the crew coming tomorrow?", buildPreview());

  assert.equal(reply.intent, "schedule");
  assert.equal(reply.needsHumanReview, true);
  assert.match(reply.message, /do not want to overpromise crew timing/i);
  assert.doesNotMatch(reply.message, /crew will/i);
  assert.equal(reply.reviewCard.reason, "Customer asked for schedule or crew timing confirmation.");
});

test("Apex Agent approval, payment, and scope requests become review cards", () => {
  const preview = buildPreview();
  const approval = resolveApexAgentCustomerConversationMessage("I approve this estimate, go ahead", preview);
  const payment = resolveApexAgentCustomerConversationMessage("Can I pay the deposit by card?", preview);
  const scope = resolveApexAgentCustomerConversationMessage("Can you add the driveway too?", preview);

  assert.equal(approval.intent, "approval");
  assert.equal(approval.needsHumanReview, true);
  assert.match(approval.message, /cannot accept, sign, or approve/i);
  assert.equal(payment.intent, "money");
  assert.equal(payment.needsHumanReview, true);
  assert.match(payment.reviewCard.reason, /price, billing, payment, or discount/i);
  assert.equal(scope.intent, "scope_change");
  assert.equal(scope.needsHumanReview, true);
  assert.match(scope.message, /office should review the change/i);
});

test("Apex Agent proof questions use proof counts without sending customer updates", () => {
  const reply = resolveApexAgentCustomerConversationMessage("Do you have proof photos or progress updates?", buildPreview());

  assert.equal(reply.intent, "progress");
  assert.equal(reply.needsHumanReview, false);
  assert.match(reply.message, /1 proof photo record/i);
  assert.match(reply.message, /1 progress update/i);
  assert.match(reply.message, /office curation before anything customer-facing is sent/i);
  assert.equal(reply.blockedActions.some((item) => /No customer send/i.test(item)), true);
  assert.equal(reply.contextChips.some((chip) => /Newco Builders/i.test(chip)), true);
});
