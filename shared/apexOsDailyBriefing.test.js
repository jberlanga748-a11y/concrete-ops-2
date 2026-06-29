import assert from "node:assert/strict";
import test from "node:test";

import {
  buildApexOsBriefingChangeRows,
  buildApexOsDailyBriefing,
  buildApexOsDailyBriefingHistorySnapshot,
  normalizeApexOsDailyBriefingHistory,
} from "./apexOsDailyBriefing.js";

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
  assert.equal(briefing.history.status, "Baseline needed");
  assert.equal(briefing.changedSincePreviousRows.some((row) => row.id === "briefing-baseline-needed"), true);
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

test("Apex OS daily briefing saves private history snapshots and compares changes", () => {
  const baseline = buildApexOsDailyBriefing({
    now: "2026-06-02T12:00:00.000Z",
    user: { name: "John Berlanga" },
    state: {
      jobs: [{ id: "J1" }],
      companySettings: {},
    },
  });
  const snapshot = buildApexOsDailyBriefingHistorySnapshot(baseline, {
    id: "ADB-1",
    now: "2026-06-02T12:05:00.000Z",
    savedBy: "USER-1",
  });
  const history = normalizeApexOsDailyBriefingHistory([snapshot]);
  assert.equal(history.length, 1);
  assert.equal(history[0].rowCount, baseline.briefingRows.length);
  assert.equal(history[0].savedBy, "USER-1");

  const updated = buildApexOsDailyBriefing({
    now: "2026-06-03T12:00:00.000Z",
    user: { name: "John Berlanga" },
    state: {
      jobs: [{ id: "J1" }, { id: "J2" }],
      companySettings: {
        apexOsDailyBriefingHistory: history,
      },
    },
  });

  assert.equal(updated.history.status, "History active");
  assert.equal(updated.history.snapshotCount, 1);
  assert.equal(updated.historyRows.length, 1);
  assert.equal(updated.changedSincePreviousRows.some((row) => row.id === "changed-workspace-pulse" && row.status === "1 jobs -> 2 jobs"), true);
  assert.equal(updated.externalAlertsEnabled, false);
  assert.equal(updated.canExecute, false);
});

test("Apex OS daily briefing comparison reports no change against the latest snapshot", () => {
  const briefing = buildApexOsDailyBriefing({
    now: "2026-06-02T12:00:00.000Z",
    user: { name: "John Berlanga" },
    state: { companySettings: {} },
  });
  const snapshot = buildApexOsDailyBriefingHistorySnapshot(briefing, {
    id: "ADB-2",
    now: "2026-06-02T12:05:00.000Z",
    savedBy: "USER-1",
  });
  const changes = buildApexOsBriefingChangeRows(briefing, [snapshot]);
  assert.equal(changes.length, 1);
  assert.equal(changes[0].id, "briefing-no-change");
  assert.equal(changes[0].status, "No change");
});
