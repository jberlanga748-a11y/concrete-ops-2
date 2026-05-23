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
  assert.deepEqual(state.reviewRequestDrafts, []);
  assert.deepEqual(state.sourceInsights, []);
  assert.match(state.summary, /Field users cannot access/i);
});

test("Growth Agent builds copy-only review request drafts from completed jobs", () => {
  const state = deriveGrowthAgentState({
    permissions: OFFICE_PERMISSIONS,
    now: new Date("2026-05-23T12:00:00Z"),
    jobs: [
      {
        id: "JOB-1",
        title: "Back patio replacement",
        customerName: "Salem Homeowner",
        status: "Completed",
        completedAt: "2026-05-16",
      },
      {
        id: "JOB-2",
        title: "Warehouse curb",
        customer: "Repeat GC",
        status: "Closed",
        completedAt: "2026-05-01",
        reviewRequestedAt: "2026-05-02",
      },
    ],
  });

  assert.equal(state.reviewRequestDrafts.length, 1);
  assert.equal(state.reviewRequestDrafts[0].type, "review_request");
  assert.equal(state.reviewRequestDrafts[0].sourceModule, "jobs");
  assert.match(state.reviewRequestDrafts[0].draft.subject, /Back patio replacement/);
  assert.match(state.reviewRequestDrafts[0].reason, /7 days/);
  assert.ok(state.reviewRequestDrafts[0].requiredReview.some((item) => /permission/i.test(item)));
  assert.ok(state.reviewRequestDrafts[0].blockedActions.some((item) => /No email, SMS, survey, review request/i.test(item)));
  assert.ok(state.reviewRequestDrafts[0].blockedActions.some((item) => /No testimonial, case study, public review/i.test(item)));
  assert.equal(state.scorecard.reviewCandidateJobs, 1);
  assert.ok(state.recommendations.some((item) => item.id === "review-request-drafts"));
});

test("Growth Agent derives lead-source intelligence without taking external action", () => {
  const state = deriveGrowthAgentState({
    permissions: OFFICE_PERMISSIONS,
    now: new Date("2026-05-23T12:00:00Z"),
    leads: [
      {
        id: "L-1",
        customer: "Warm GC",
        project: "School sidewalk",
        status: "Converted",
        source: "Referral",
      },
      {
        id: "L-2",
        customer: "Repeat Builder",
        project: "Warehouse apron",
        status: "New",
        source: "Referral",
        followUpDueAt: "2026-05-20",
      },
      {
        id: "L-3",
        customer: "City buyer",
        project: "Park path",
        status: "New",
        sourceName: "City bids",
      },
    ],
    estimates: [
      {
        id: "EST-1",
        leadId: "L-2",
        title: "Warehouse apron",
        customerName: "Repeat Builder",
        status: "sent",
        total: 62000,
        sentAt: "2026-05-10",
      },
      {
        id: "EST-2",
        title: "Park path",
        customerName: "City buyer",
        status: "draft",
        source: "City bids",
        total: 18000,
        createdAt: "2026-05-22",
      },
    ],
  });

  assert.equal(state.scorecard.leadSourcesTracked, 2);
  assert.equal(state.sourceInsights.length, 2);
  assert.equal(state.sourceInsights[0].source, "Referral");
  assert.equal(state.sourceInsights[0].leads, 2);
  assert.equal(state.sourceInsights[0].convertedLeads, 1);
  assert.equal(state.sourceInsights[0].conversionRate, 50);
  assert.equal(state.sourceInsights[0].overdueLeads, 1);
  assert.equal(state.sourceInsights[0].staleEstimates, 1);
  assert.equal(state.sourceInsights[0].openEstimateValue, 62000);
  assert.match(state.sourceInsights[0].detail, /manual review signal/i);
  assert.ok(state.sourceInsights[0].blockedActions.some((item) => /No outreach, ads, source contact/i.test(item)));
  assert.ok(state.recommendations.some((item) => item.id === "lead-source-intelligence" && /Referral/i.test(item.detail)));
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
  const reviewRequestText = JSON.stringify(state.reviewRequestDrafts);
  const sourceInsightText = JSON.stringify(state.sourceInsights);
  assert.doesNotMatch(draftText, /send now|auto.?send|submit bid|create invoice|collect payment/i);
  assert.doesNotMatch(reviewRequestText, /send now|auto.?send|publish now|post review|create invoice|collect payment/i);
  assert.doesNotMatch(sourceInsightText, /send now|auto.?send|submit bid|create invoice|collect payment|launch ad|buy/i);
  assert.ok(state.followUpDrafts[0].blockedActions.some((item) => /No email, SMS, call/i.test(item)));
  assert.ok(state.followUpDrafts[0].blockedActions.some((item) => /No bid/i.test(item)));
  assert.match(state.safetyBoundary, /No customer contact/i);
  assert.match(state.safetyBoundary, /bid submission/i);
  assert.match(state.safetyBoundary, /payment/i);
});
