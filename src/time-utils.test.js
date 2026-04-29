import assert from "node:assert/strict";
import test from "node:test";

import { deriveCrewWeeklySummary, deriveTimeWorkspace, deriveWeeklySummary, findActiveTimeEntry, formatMinutes, sortTimeEntries, timeStatusTone } from "./time-utils.js";

const SAMPLE_ENTRIES = [
  {
    id: "T-1",
    userId: "U-1",
    jobTitle: "North Patio",
    workCategory: "job",
    clockInAt: "2026-04-20T15:00:00.000Z",
    totalMinutes: 480,
    breakMinutes: 30,
    status: "completed",
  },
  {
    id: "T-2",
    userId: "U-1",
    workCategory: "travel",
    clockInAt: "2026-04-21T16:00:00.000Z",
    totalMinutes: 90,
    breakMinutes: 0,
    status: "completed",
  },
  {
    id: "T-3",
    userId: "U-2",
    workCategory: "job",
    jobTitle: "North Patio",
    clockInAt: "2026-04-22T17:00:00.000Z",
    totalMinutes: 240,
    breakMinutes: 15,
    status: "active",
  },
];

test("sortTimeEntries orders newest clock-in first", () => {
  const sorted = sortTimeEntries([
    { id: "T-1", clockInAt: "2026-04-25T08:00:00.000Z" },
    { id: "T-2", clockInAt: "2026-04-25T10:00:00.000Z" },
  ]);

  assert.deepEqual(sorted.map((entry) => entry.id), ["T-2", "T-1"]);
});

test("findActiveTimeEntry returns the newest non-completed entry for the user", () => {
  const active = findActiveTimeEntry([
    { id: "T-1", userId: "U-1", status: "completed", clockInAt: "2026-04-25T08:00:00.000Z" },
    { id: "T-2", userId: "U-1", status: "active", clockInAt: "2026-04-25T09:00:00.000Z" },
    { id: "T-3", userId: "U-2", status: "active", clockInAt: "2026-04-25T10:00:00.000Z" },
  ], "U-1");

  assert.equal(active?.id, "T-2");
});

test("deriveWeeklySummary groups daily and category totals for the current week", () => {
  const summary = deriveWeeklySummary(SAMPLE_ENTRIES.filter((entry) => entry.userId === "U-1"), {
    now: new Date("2026-04-24T12:00:00.000Z"),
  });

  assert.equal(summary.totalMinutes, 570);
  assert.equal(summary.breakMinutes, 30);
  assert.equal(summary.dayBreakdown.find((day) => day.label === "Mon")?.minutes, 480);
  assert.equal(summary.dayBreakdown.find((day) => day.label === "Tue")?.minutes, 90);
  assert.equal(summary.groupedBreakdown.find((group) => group.label === "North Patio")?.minutes, 480);
  assert.equal(summary.groupedBreakdown.find((group) => group.label === "travel")?.minutes, undefined);
  assert.equal(summary.groupedBreakdown.find((group) => group.label === "Travel")?.minutes, 90);
});

test("deriveTimeWorkspace returns allowed job options and a weekly summary", () => {
  const workspace = deriveTimeWorkspace(
    SAMPLE_ENTRIES,
    [{ id: "J-1", archivedAt: null }, { id: "J-2", archivedAt: "2026-04-24T08:00:00.000Z" }],
    "U-1",
    ["job", "travel"],
    { now: new Date("2026-04-24T12:00:00.000Z") },
  );

  assert.equal(workspace.activeEntry, null);
  assert.deepEqual(workspace.availableJobs.map((job) => job.id), ["J-1"]);
  assert.equal(workspace.weeklySummary.totalMinutes, 570);
});

test("deriveTimeWorkspace tolerates missing jobs and categories", () => {
  const workspace = deriveTimeWorkspace(SAMPLE_ENTRIES, undefined, "U-1", undefined, {
    now: new Date("2026-04-24T12:00:00.000Z"),
  });

  assert.deepEqual(workspace.availableJobs, []);
  assert.deepEqual(workspace.allowedCategories, []);
  assert.equal(workspace.weeklySummary.totalMinutes, 570);
});

test("deriveCrewWeeklySummary excludes the foreman self entry and counts active crew", () => {
  const summary = deriveCrewWeeklySummary(SAMPLE_ENTRIES, {
    excludeUserId: "U-1",
    now: new Date("2026-04-24T12:00:00.000Z"),
  });

  assert.equal(summary.totalMinutes, 240);
  assert.equal(summary.activeUserCount, 1);
});

test("formatMinutes and timeStatusTone provide compact field-friendly labels", () => {
  assert.equal(formatMinutes(0), "0m");
  assert.equal(formatMinutes(75), "1h 15m");
  assert.equal(timeStatusTone("active"), "blue");
  assert.equal(timeStatusTone("on_break"), "amber");
  assert.equal(timeStatusTone("completed"), "green");
});
