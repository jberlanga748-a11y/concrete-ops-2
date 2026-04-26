import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveAcknowledgmentState,
  deriveActivePpeItems,
  deriveSafetyIncidentListState,
  deriveSafetyWorkspaceJobs,
  deriveVisibleSafetyPolicies,
  filterSafetyIncidents,
} from "./safety-utils.js";

test("deriveActivePpeItems hides archived items and keeps required items first", () => {
  const rows = deriveActivePpeItems([
    { id: "2", label: "Gloves", requiredByDefault: false, status: "active" },
    { id: "3", label: "Archived", requiredByDefault: true, status: "archived", archivedAt: "2026-04-25T00:00:00.000Z" },
    { id: "1", label: "Hard hat", requiredByDefault: true, status: "active" },
  ]);

  assert.deepEqual(rows.map((item) => item.id), ["1", "2"]);
});

test("filterSafetyIncidents filters by status type severity job reporter and archive state", () => {
  const incidents = [
    { id: "A", status: "open", type: "hazard", severity: "high", jobId: "J-1", submittedBy: "U-1", submittedByName: "Ada", title: "Trip hazard", description: "", immediateAction: "", job: { title: "Martinez" } },
    { id: "B", status: "resolved", type: "concern", severity: "low", jobId: "J-2", submittedBy: "U-2", submittedByName: "Ben", title: "Loose board", description: "", immediateAction: "", job: { title: "Rivera" }, archivedAt: "2026-04-25T00:00:00.000Z" },
  ];

  assert.deepEqual(filterSafetyIncidents(incidents, { status: "open" }).map((row) => row.id), ["A"]);
  assert.deepEqual(filterSafetyIncidents(incidents, { type: "hazard" }).map((row) => row.id), ["A"]);
  assert.deepEqual(filterSafetyIncidents(incidents, { severity: "low", archived: "Archived only" }).map((row) => row.id), ["B"]);
  assert.deepEqual(filterSafetyIncidents(incidents, { jobId: "J-1" }).map((row) => row.id), ["A"]);
  assert.deepEqual(filterSafetyIncidents(incidents, { submittedBy: "U-2", archived: "Archived only" }).map((row) => row.id), ["B"]);
});

test("deriveVisibleSafetyPolicies tolerates missing arrays and hides archived by default", () => {
  assert.deepEqual(deriveVisibleSafetyPolicies(undefined), []);
  assert.equal(deriveVisibleSafetyPolicies([{ id: "1", archivedAt: null }, { id: "2", archivedAt: "x" }]).length, 1);
  assert.equal(deriveVisibleSafetyPolicies([{ id: "1", archivedAt: null }, { id: "2", archivedAt: "x" }], { includeArchived: true }).length, 2);
});

test("deriveSafetyIncidentListState and workspace helpers tolerate sparse data", () => {
  const listState = deriveSafetyIncidentListState([
    { id: "I-1", jobId: "J-1", job: { title: "Martinez Front Walk" }, submittedBy: "U-1", submittedByName: "Ada" },
  ]);

  assert.deepEqual(listState.jobOptions, [{ value: "J-1", label: "Martinez Front Walk" }]);
  assert.deepEqual(listState.reporterOptions, [{ value: "U-1", label: "Ada" }]);
  assert.deepEqual(deriveSafetyWorkspaceJobs([{ id: "J-1", title: "Martinez Front Walk", customer: "Martinez" }]), [
    { id: "J-1", label: "Martinez Front Walk", customer: "Martinez", address: "" },
  ]);
});

test("deriveAcknowledgmentState reports latest acknowledgment for the current user", () => {
  const state = deriveAcknowledgmentState([
    { id: "A-1", userId: "U-2", acknowledgedAt: "2026-04-23T10:00:00.000Z" },
    { id: "A-2", userId: "U-1", acknowledgedAt: "2026-04-24T10:00:00.000Z" },
  ], "U-1");

  assert.equal(state.hasAcknowledged, true);
  assert.equal(state.count, 1);
  assert.equal(state.latest?.id, "A-2");
});
