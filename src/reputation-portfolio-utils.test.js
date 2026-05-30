import assert from "node:assert/strict";
import test from "node:test";

import { deriveReputationPortfolioEngineState } from "./reputation-portfolio-utils.js";

const OFFICE_PERMISSIONS = {
  aiOffice: { canView: true },
  jobs: { canManageAll: true },
  reports: { canReview: true },
  uploads: { canManageAll: true },
  estimates: { canView: true },
};

test("reputation portfolio engine turns completed proof into review, referral, social, and proposal drafts", () => {
  const state = deriveReputationPortfolioEngineState({
    permissions: OFFICE_PERMISSIONS,
    companyName: "Apex HQ Demo",
    primaryTrade: "fencing",
    jobs: [
      {
        id: "job-1",
        customerId: "customer-1",
        title: "Cedar Fence Replacement",
        customer: "Martinez Residence",
        address: "Salem, OR",
        status: "completed",
        scopeSummary: "Replaced a failing backyard fence and restored gate access.",
      },
    ],
    customers: [{ id: "customer-1", name: "Martinez Residence" }],
    uploads: [
      { id: "upload-1", jobId: "job-1", caption: "Before photo - failing cedar fence" },
      { id: "upload-2", jobId: "job-1", caption: "Finished gate alignment" },
    ],
    dailyReports: [
      {
        id: "report-1",
        jobId: "job-1",
        status: "reviewed",
        workPerformed: "Removed failing sections, set posts, installed rails, and completed gate alignment.",
      },
    ],
    estimates: [{ id: "estimate-1", jobId: "job-1", total: 12000 }],
  });

  assert.equal(state.canView, true);
  assert.equal(state.mode, "review_first_reputation_portfolio_engine");
  assert.equal(state.stats.storyCandidates, 1);
  assert.equal(state.stats.proofReady, 1);
  assert.equal(state.stats.reviewAskDrafts, 1);
  assert.equal(state.stats.referralAskDrafts, 1);
  assert.equal(state.stats.socialDrafts, 1);
  assert.equal(state.stats.proposalProofBlocks, 1);
  assert.equal(state.storyCandidates[0].beforeAfterStatus, "Before/after photo pair ready for owner selection");
  assert.match(state.storyCandidates[0].storyBody, /Apex HQ Demo/);
  assert.match(state.reviewReferralQueue[0].boundary, /No review request/i);
  assert.match(state.socialWebsiteDrafts[0].boundary, /Manual publish only/i);
  assert.match(state.proposalProofBlocks[0].proofBlock, /Permission required/i);
  assert.equal(state.blockedActions.some((item) => /No social post/i.test(item)), true);
});

test("completed jobs without reviewed proof become proof blockers", () => {
  const state = deriveReputationPortfolioEngineState({
    permissions: OFFICE_PERMISSIONS,
    jobs: [
      { id: "job-1", title: "Closeout Job", status: "billing_ready" },
    ],
    uploads: [],
    dailyReports: [
      { id: "report-1", jobId: "job-1", status: "submitted", workPerformed: "Work was submitted for review." },
    ],
  });

  assert.equal(state.stats.proofBlockers, 1);
  assert.deepEqual(state.proofBlockers[0].missing, ["photo/proof upload", "reviewed daily report"]);
  assert.equal(state.reviewReferralQueue.length, 0);
  assert.match(state.proofBlockers[0].nextAction, /before asking for reviews/i);
});

test("field roles cannot see reputation or portfolio proof queues", () => {
  const state = deriveReputationPortfolioEngineState({
    permissions: {
      jobs: { canManageField: true, canManageAll: false },
      aiOffice: { canView: false },
      leads: { canView: false },
    },
    jobs: [{ id: "job-1", title: "Completed Job", status: "completed" }],
    uploads: [{ id: "upload-1", jobId: "job-1", caption: "Finished photo" }],
    dailyReports: [{ id: "report-1", jobId: "job-1", status: "reviewed" }],
  });

  assert.equal(state.canView, false);
  assert.equal(state.mode, "blocked_reputation_portfolio_engine");
  assert.deepEqual(state.storyCandidates, []);
  assert.deepEqual(state.reviewReferralQueue, []);
  assert.match(state.safetyBoundary, /Field users cannot access reputation/i);
});

test("engine does not invent testimonials or public claims", () => {
  const state = deriveReputationPortfolioEngineState({
    permissions: OFFICE_PERMISSIONS,
    jobs: [{ id: "job-1", title: "Proof Job", status: "completed" }],
    uploads: [{ id: "upload-1", jobId: "job-1", caption: "Finished work photo" }],
    dailyReports: [{ id: "report-1", jobId: "job-1", status: "reviewed", workPerformed: "Finished the work." }],
  });

  const combinedDrafts = [
    state.storyCandidates[0].storyBody,
    state.storyCandidates[0].reviewRequestDraft,
    state.storyCandidates[0].referralAskDraft,
    state.storyCandidates[0].socialDraft,
    state.storyCandidates[0].websiteDraft,
    ...state.blockedActions,
  ].join(" ");

  assert.doesNotMatch(combinedDrafts, /testimonial:/i);
  assert.doesNotMatch(combinedDrafts, /guaranteed leads/i);
  assert.match(combinedDrafts, /permission/i);
  assert.match(combinedDrafts, /No fake testimonial/i);
});
