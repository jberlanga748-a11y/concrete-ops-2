import assert from "node:assert/strict";
import test from "node:test";

import { buildTimeTrackingSupportContext, deriveCrewWeeklySummary, deriveTimeJobCostingReadiness, deriveTimeWorkspace, deriveWeeklySummary, findActiveTimeEntry, formatMinutes, sortTimeEntries, timeLocationEvidencePayload, timeLocationStatusLabel, timeStatusTone } from "./time-utils.js";

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

test("deriveTimeJobCostingReadiness marks completed job time proof-ready", () => {
  const readiness = deriveTimeJobCostingReadiness([
    { id: "T-1", jobId: "J-1", jobTitle: "North Patio", status: "completed", totalMinutes: 480 },
  ], [
    { id: "J-1", title: "North Patio" },
  ], {
    reports: [{ id: "R-1", jobId: "J-1", status: "reviewed" }],
    uploads: [{ id: "U-1", jobId: "J-1", caption: "Finished slab" }],
    deliveryTickets: [{ id: "D-1", jobId: "J-1", ticketNumber: "123" }],
  });

  assert.equal(readiness.status, "Time proof-ready");
  assert.equal(readiness.proofReadyJobs, 1);
  assert.equal(readiness.jobsWithGaps, 0);
  assert.equal(readiness.topJobs[0].gaps.length, 0);
});

test("deriveTimeJobCostingReadiness flags missing reports and proof", () => {
  const readiness = deriveTimeJobCostingReadiness([
    { id: "T-1", jobId: "J-1", jobTitle: "North Patio", status: "completed", totalMinutes: 240 },
    { id: "T-2", jobId: "J-2", jobTitle: "Shop Slab", status: "completed", totalMinutes: 180 },
  ], [], {
    reports: [{ id: "R-2", jobId: "J-2", status: "submitted" }],
    uploads: [],
  });

  assert.equal(readiness.status, "Proof review needed");
  assert.equal(readiness.jobsWithGaps, 2);
  assert.match(readiness.topJobs.find((job) => job.jobId === "J-1").gaps.join(" "), /No daily report linked/);
  assert.match(readiness.topJobs.find((job) => job.jobId === "J-2").gaps.join(" "), /No photo proof linked/);
  assert.match(readiness.topJobs.find((job) => job.jobId === "J-2").gaps.join(" "), /Report not reviewed/);
});

test("deriveTimeJobCostingReadiness keeps active and unlinked time out of ready state", () => {
  const readiness = deriveTimeJobCostingReadiness([
    { id: "T-1", jobId: "J-1", jobTitle: "North Patio", status: "active", totalMinutes: 0 },
    { id: "T-2", status: "completed", totalMinutes: 120 },
  ], [{ id: "J-1", title: "North Patio" }], {
    reports: [{ id: "R-1", jobId: "J-1", status: "reviewed" }],
    uploads: [{ id: "U-1", jobId: "J-1" }],
  });

  assert.equal(readiness.status, "Unlinked time needs review");
  assert.equal(readiness.unlinkedEntries, 1);
  assert.equal(readiness.activeEntries, 1);
  assert.match(readiness.topJobs[0].gaps.join(" "), /Active time still running/);
});

test("time tracking support context uses role-scoped visible time without pay data", () => {
  const workspace = deriveTimeWorkspace(
    SAMPLE_ENTRIES,
    [{ id: "J-1", title: "North Patio", archivedAt: null }],
    "U-1",
    ["job", "travel"],
    { now: new Date("2026-04-24T12:00:00.000Z") },
  );
  const context = buildTimeTrackingSupportContext({
    user: { id: "U-1", name: "Sam Field", role: "Employee" },
    permissions: { time: { canViewAll: false, canViewCrew: false } },
    workspace,
    boardRows: workspace.ownEntries,
    boardSummary: workspace.weeklySummary,
  });

  assert.equal(context.workflow, "Time tracking");
  assert.match(context.summary, /Scope: my own time/);
  assert.match(context.summary, /Visible entries: 2/);
  assert.match(context.summary, /Week total: 9h 30m/);
  assert.match(context.workaround, /Allowed self clock categories: Job, Travel/);
  assert.equal(context.summary.includes("payRate"), false);
  assert.equal(context.summary.includes("grossPay"), false);
  assert.equal(context.expected.includes("payroll rates"), true);
});

test("time tracking support context summarizes crew scope without naming hidden payroll fields", () => {
  const summary = deriveCrewWeeklySummary(SAMPLE_ENTRIES, {
    excludeUserId: "U-1",
    now: new Date("2026-04-24T12:00:00.000Z"),
  });
  const context = buildTimeTrackingSupportContext({
    user: { id: "U-1", name: "Frank Foreman", role: "Foreman" },
    permissions: { time: { canViewAll: false, canViewCrew: true } },
    workspace: { allowedCategories: ["job"], availableJobs: [{ id: "J-1" }] },
    boardRows: SAMPLE_ENTRIES.filter((entry) => entry.userId !== "U-1"),
    boardSummary: summary,
  });

  assert.match(context.summary, /Scope: assigned crew time/);
  assert.match(context.summary, /Active visible clocks: 1/);
  assert.match(context.summary, /Week total: 4h/);
  assert.equal(context.summary.includes("payRate"), false);
  assert.equal(context.summary.includes("grossPay"), false);
});

test("formatMinutes and timeStatusTone provide compact field-friendly labels", () => {
  assert.equal(formatMinutes(0), "0m");
  assert.equal(formatMinutes(75), "1h 15m");
  assert.equal(timeStatusTone("active"), "blue");
  assert.equal(timeStatusTone("on_break"), "amber");
  assert.equal(timeStatusTone("completed"), "green");
});

test("time location helpers label captured, denied, unavailable, and payload evidence", () => {
  assert.equal(timeLocationStatusLabel({
    clockInLatitude: 44.94,
    clockInLongitude: -123.03,
  }, "clockIn"), "Location captured");
  assert.equal(timeLocationStatusLabel({
    clockOutLocationUnavailableReason: "Location permission denied by user.",
  }, "clockOut"), "Location denied");
  assert.equal(timeLocationStatusLabel({
    clockOutLocationUnavailableReason: "Location request timed out.",
  }, "clockOut"), "Location timed out");
  assert.equal(timeLocationStatusLabel({
    clockInLocationUnavailableReason: "Location unavailable on this device.",
  }, "clockIn"), "Location unavailable");
  assert.equal(timeLocationStatusLabel({}, "clockIn"), "Not requested");

  assert.deepEqual(timeLocationEvidencePayload("clockIn", {
    latitude: 44.94,
    longitude: -123.03,
    locationAccuracy: 9,
    locationCapturedAt: "2026-05-29T15:00:00.000Z",
  }), {
    clockInLatitude: 44.94,
    clockInLongitude: -123.03,
    clockInLocationAccuracy: 9,
    clockInLocationCapturedAt: "2026-05-29T15:00:00.000Z",
    clockInLocationUnavailableReason: "",
  });
});
