import assert from "node:assert/strict";
import test from "node:test";

import { buildApexOsDailyBriefing } from "./apexOsDailyBriefing.js";

test("Apex OS daily briefing summarizes local state with safety locks", () => {
  const briefing = buildApexOsDailyBriefing({
    now: "2026-06-02T12:00:00.000Z",
    user: { name: "John Berlanga" },
    state: {
      jobs: [{ id: "J1" }, { id: "J2", archivedAt: "2026-01-01" }],
      leads: [{ id: "L1" }],
      estimates: [{ id: "E1" }],
      queueItems: [{ id: "Q1", status: "Blocked" }, { id: "Q2", done: true }],
      dailyReports: [{ id: "DR1", status: "Draft" }],
      auditEvents: [{ id: "A1", summary: "Build passed", createdAt: "2026-06-02T11:00:00.000Z" }],
      companySettings: {
        apexOsMemory: [
          {
            id: "M1",
            status: "approved",
            title: "Private command center",
            body: "Apex OS is private.",
            sourceLabel: "Apex OS plan",
          },
        ],
      },
    },
  });

  assert.equal(briefing.operatorName, "John Berlanga");
  assert.equal(briefing.status, "Review needed");
  assert.equal(briefing.briefingRows.some((row) => row.id === "workspace-pulse" && row.status === "1 jobs"), true);
  assert.equal(briefing.briefingRows.some((row) => row.id === "john-action-alerts" && row.status === "1 blocked"), true);
  assert.equal(briefing.briefingRows.some((row) => row.id === "memory-context" && row.status === "1 approved"), true);
  assert.equal(briefing.alerts.some((row) => row.id === "no-execution" && row.status === "Locked"), true);
  assert.equal(briefing.sourceLabels.includes("AGENTS.md field-role protection rules"), true);
});

test("Apex OS daily briefing handles empty state without overclaiming", () => {
  const briefing = buildApexOsDailyBriefing({
    now: "2026-06-02T12:00:00.000Z",
    user: { name: "Apex Operator" },
    state: {},
  });

  assert.equal(briefing.status, "Ready");
  assert.equal(briefing.briefingRows.some((row) => row.id === "workspace-pulse" && row.status === "0 jobs"), true);
  assert.equal(briefing.briefingRows.some((row) => row.id === "release-posture" && row.status === "Approval gated"), true);
  assert.equal(briefing.nextActions.some((item) => item.includes("read-only")), true);
});
