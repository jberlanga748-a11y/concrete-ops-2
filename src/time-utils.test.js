import assert from "node:assert/strict";
import test from "node:test";

import { deriveTimeWorkspace, findActiveTimeEntry, formatMinutes, sortTimeEntries, timeStatusTone } from "./time-utils.js";

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

test("deriveTimeWorkspace returns only live jobs as available clock-in options", () => {
  const workspace = deriveTimeWorkspace(
    [{ id: "T-1", userId: "U-1", status: "active", clockInAt: "2026-04-25T09:00:00.000Z" }],
    [{ id: "J-1", archivedAt: null }, { id: "J-2", archivedAt: "2026-04-24T08:00:00.000Z" }],
    "U-1",
  );

  assert.equal(workspace.activeEntry?.id, "T-1");
  assert.deepEqual(workspace.availableJobs.map((job) => job.id), ["J-1"]);
});

test("formatMinutes and timeStatusTone provide compact field-friendly labels", () => {
  assert.equal(formatMinutes(0), "0m");
  assert.equal(formatMinutes(75), "1h 15m");
  assert.equal(timeStatusTone("active"), "blue");
  assert.equal(timeStatusTone("on_break"), "amber");
  assert.equal(timeStatusTone("completed"), "green");
});
