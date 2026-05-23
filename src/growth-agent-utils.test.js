import assert from "node:assert/strict";
import test from "node:test";

import { deriveGrowthAgentState } from "./growth-agent-utils.js";

const OFFICE_PERMISSIONS = {
  aiOffice: { canView: true },
  leads: { canView: true },
  estimates: { canView: true },
  jobs: { canManageAll: true },
};

test("Growth Agent builds review-only stale estimate and lead follow-up drafts", () => {
  const state = deriveGrowthAgentState({
    permissions: OFFICE_PERMISSIONS,
    now: new Date("2026-05-23T12:00:00Z"),
    leads: [
      {
        id: "L-1",
        customer: "ABC Builders",
        project: "Commercial gate repair",
        status: "New",
        followUpDueAt: "2026-05-18",
      },
    ],
    estimates: [
      {
        id: "EST-1",
        title: "West fence replacement",
        customerName: "Northwest Retail",
        status: "sent",
        total: 48750,
        sentAt: "2026-05-08",
      },
    ],
    jobs: [],
  });

  assert.equal(state.canView, true);
  assert.equal(state.mode, "review_first_growth_agent");
  assert.equal(state.followUpDrafts.length, 2);
  assert.equal(state.followUpDrafts[0].type, "estimate_follow_up");
  assert.match(state.followUpDrafts[0].draft.subject, /West fence replacement/);
  assert.match(state.followUpDrafts[0].reason, /15 days/);
  assert.ok(state.followUpDrafts[0].blockedActions.some((item) => /No email, SMS, call/i.test(item)));
  assert.ok(state.followUpDrafts[1].requiredReview.some((item) => /Confirm consent/i.test(item)));
  assert.equal(state.scorecard.openEstimates, 1);
  assert.equal(state.scorecard.openEstimateValue, 48750);
});

test("Growth Agent blocks field-only users from growth, estimates, and follow-up drafts", () => {
  const state = deriveGrowthAgentState({
    permissions: {
      jobs: { canManageField: true, canManageAll: false },
      leads: { canView: false },
      estimates: { canView: false },
      aiOffice: { canView: false },
    },
    leads: [{ id: "L-1", status: "New" }],
    estimates: [{ id: "EST-1", status: "sent", total: 12000 }],
  });

  assert.equal(state.canView, false);
  assert.deepEqual(state.followUpDrafts, []);
  assert.match(state.summary, /Field users cannot access/i);
});

test("Growth Agent never returns auto-send, bid, invoice, or payment outcomes", () => {
  const state = deriveGrowthAgentState({
    permissions: OFFICE_PERMISSIONS,
    now: new Date("2026-05-23T12:00:00Z"),
    estimates: [
      {
        id: "EST-2",
        title: "Stamped patio",
        customerName: "Salem School",
        status: "sent",
        total: 25000,
        sentAt: "2026-05-01",
      },
    ],
  });

  const draftText = JSON.stringify(state.followUpDrafts.map((draft) => draft.draft));
  assert.doesNotMatch(draftText, /send now|auto.?send|submit bid|create invoice|collect payment/i);
  assert.ok(state.followUpDrafts[0].blockedActions.some((item) => /No email, SMS, call/i.test(item)));
  assert.ok(state.followUpDrafts[0].blockedActions.some((item) => /No bid/i.test(item)));
  assert.match(state.safetyBoundary, /No customer contact/i);
  assert.match(state.safetyBoundary, /bid submission/i);
  assert.match(state.safetyBoundary, /payment/i);
});
