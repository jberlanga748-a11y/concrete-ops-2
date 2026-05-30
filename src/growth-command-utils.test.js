import assert from "node:assert/strict";
import test from "node:test";

import { deriveGrowthCommandCenterState } from "./growth-command-utils.js";

const TODAY = "2026-05-29";

test("growth command center combines client finder, ads, follow-up, and reputation lanes", () => {
  const state = deriveGrowthCommandCenterState({
    today: TODAY,
    permissions: { opportunityScout: { canView: true }, aiOffice: { canView: true }, leads: { canView: true } },
    opportunityScout: {
      stats: {
        activeProfiles: 2,
        activeSources: 4,
        openFoundOpportunities: 3,
        checksNeeded: 1,
      },
    },
    dailyReviewInbox: {
      rows: [{ id: "review-1" }, { id: "review-2" }],
    },
    leads: [
      { id: "lead-1", status: "New", followUpDueAt: TODAY },
      { id: "lead-2", status: "Won" },
    ],
    estimates: [
      { id: "estimate-1", status: "Sent", total: 12000, sentAt: "2026-05-20" },
    ],
    jobs: [
      { id: "job-1", status: "Completed", contractValue: 9000 },
    ],
    uploads: [{ id: "upload-1" }],
    dailyReports: [{ id: "report-1" }],
  });

  assert.equal(state.ownerOnly, true);
  assert.equal(state.status, "Active");
  assert.deepEqual(state.lanes.map((lane) => lane.id), ["client-finder", "ads", "follow-up", "reputation"]);
  assert.equal(state.lanes.find((lane) => lane.id === "client-finder").status, "Built");
  assert.equal(state.lanes.find((lane) => lane.id === "ads").status, "Needs account/API key");
  assert.equal(state.lanes.find((lane) => lane.id === "follow-up").value, 2);
  assert.equal(state.lanes.find((lane) => lane.id === "reputation").value, 1);
  assert.equal(state.sourceCoverage.includes("Plan rooms"), true);
});

test("ads advisor is provider-ready but blocks autonomous spend", () => {
  const state = deriveGrowthCommandCenterState({
    today: TODAY,
    permissions: { opportunityScout: { canView: true } },
    companySettings: {
      advertising: {
        ownerMonthlyMaxSpend: 600,
      },
    },
    leads: [
      { id: "lead-1", status: "Won" },
      { id: "lead-2", status: "Lost" },
    ],
    estimates: [
      { id: "estimate-1", total: 10000 },
    ],
  });

  assert.equal(state.ads.status, "Needs account/API key");
  assert.equal(state.ads.recommendedMonthlyLimit, "$600");
  assert.equal(state.ads.ownerMaxSpendLabel, "$600");
  assert.equal(state.ads.channels.some((channel) => channel.label === "Google Local Services Ads"), true);
  assert.equal(state.ads.guardrails.some((item) => /No autonomous ad publishing or spend/i.test(item)), true);
  assert.equal(state.guardrails.some((item) => /No autonomous ad spend/i.test(item)), true);
});

test("field-restricted users cannot access growth controls", () => {
  const state = deriveGrowthCommandCenterState({
    today: TODAY,
    permissions: { opportunityScout: { canView: false }, aiOffice: { canView: false }, leads: { canView: false } },
  });

  assert.equal(state.status, "Locked");
  assert.equal(state.ownerOnly, true);
  assert.deepEqual(state.lanes, []);
  assert.equal(state.guardrails.some((item) => /Field users do not see leads/i.test(item)), true);
});
