import assert from "node:assert/strict";
import test from "node:test";

import { deriveApexAgentOperatorState } from "./apex-agent-operator-utils.js";

test("Apex Agent Operator exposes the full contractor command loop for owner/admin users", () => {
  const state = deriveApexAgentOperatorState({
    permissions: {
      aiOffice: { canView: true },
      opportunityScout: { canView: true },
      leads: { canView: true },
      estimates: { canView: true },
      jobs: { canManageAll: true },
      reports: { canReview: true },
      uploads: { canManageAll: true },
    },
    agentCommandCenter: {
      canView: true,
      counts: {
        openFoundOpportunities: 2,
        scoutChecksNeeded: 1,
        growthFollowUpDrafts: 3,
        newLeads: 2,
        highPriorityLeads: 1,
        approvedLeads: 1,
        draftEstimateReviews: 2,
        packetEstimateReviews: 1,
        jobHandoffEstimateReviews: 1,
        startupWatchJobs: 2,
        proofCloseoutReview: 4,
        readyToBill: 2,
      },
    },
    growthCommandCenter: {
      lanes: [
        { id: "client-finder", value: 2, status: "Built" },
        { id: "follow-up", value: 1, status: "Partial" },
      ],
      ads: {
        status: "Needs account/API key",
        tone: "amber",
        recommendedDailyBudgetRange: "$35-$58",
      },
    },
    reputationPortfolioEngine: {
      canView: true,
      stats: {
        storyCandidates: 2,
        reviewAskDrafts: 1,
        referralAskDrafts: 1,
      },
    },
  });

  const commandIds = state.commands.map((command) => command.id);

  assert.equal(state.canView, true);
  assert.equal(state.headline, "Apex Agent Operator");
  assert.deepEqual(commandIds, [
    "find_new_work",
    "plan_ads",
    "follow_up",
    "draft_estimates",
    "prepare_proposals",
    "prep_handoffs",
    "review_closeout",
    "billing_readiness",
    "reviews_referrals",
  ]);
  assert.equal(state.nextCommand.id, "find_new_work");
  assert.equal(state.commands.find((command) => command.id === "plan_ads").providerState, "Needs account/API key");
  assert.match(state.commands.find((command) => command.id === "plan_ads").externalBoundary, /No autonomous ad publishing/i);
  assert.match(state.commands.find((command) => command.id === "billing_readiness").externalBoundary, /No invoice, payment link, charge/i);
  assert.match(state.commands.find((command) => command.id === "reviews_referrals").externalBoundary, /No review request/i);
  assert.equal(state.commands.find((command) => command.id === "follow_up").moduleId, "leads");
  assert.equal(state.commands.find((command) => command.id === "prepare_proposals").moduleId, "estimates");
  assert.equal(state.commands.find((command) => command.id === "prep_handoffs").moduleId, "jobs");
  assert.equal(state.commands.find((command) => command.id === "review_closeout").moduleId, "reports");
  assert.equal(state.counts.totalCommands, 9);
  assert.ok(state.counts.blockedExternalActions >= 30);
  assert.equal(state.boundaryRows.some((row) => /Existing workflows/i.test(row.label)), true);
  assert.equal(state.blockedActions.some((action) => /No autonomous ad spend/i.test(action)), true);
});

test("Apex Agent Operator stays blocked for field-only users", () => {
  const state = deriveApexAgentOperatorState({
    permissions: {
      aiOffice: { canView: false },
      leads: { canView: false },
      estimates: { canView: false },
      jobs: { canView: true, canManageField: true, canManageAll: false },
      reports: { canCreate: true, canReview: false },
      uploads: { canCreate: true, canManageAll: false },
    },
    agentCommandCenter: {
      canView: false,
    },
  });

  assert.equal(state.canView, false);
  assert.deepEqual(state.commands, []);
  assert.match(state.summary, /office-only/i);
  assert.equal(state.blockedActions.some((action) => /Field users cannot open Apex Agent Operator/i.test(action)), true);
  assert.doesNotMatch(JSON.stringify(state), /profit|margin|payroll|pricing/i);
});

test("Apex Agent Operator keeps quiet days useful and provider-ready", () => {
  const state = deriveApexAgentOperatorState({
    permissions: {
      aiOffice: { canView: true },
      leads: { canView: true },
      jobs: { canManageAll: true },
    },
    agentCommandCenter: {
      canView: true,
      counts: {},
    },
    growthCommandCenter: {
      lanes: [],
      ads: { status: "Provider-ready", tone: "green", recommendedDailyBudgetRange: "$10-$20" },
    },
    reputationPortfolioEngine: {
      canView: true,
      stats: {},
    },
  });

  assert.equal(state.canView, true);
  assert.equal(state.nextCommand.id, "plan_ads");
  assert.equal(state.commands.find((command) => command.id === "find_new_work").status, "Provider-ready");
  assert.equal(state.commands.find((command) => command.id === "reviews_referrals").status, "Needs proof");
  assert.match(state.summary, /growth, sales, estimates, proposals/i);
});
