import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveChecklistItems,
  deriveToolChecklistListState,
  filterToolChecklists,
  toolChecklistItemStatusLabel,
  toolChecklistStatusLabel,
} from "./tool-checklist-utils.js";

const sampleChecklists = [
  {
    id: "TC-1",
    title: "Crew A pour prep",
    status: "active",
    statusLabel: "Active",
    job: {
      title: "Martinez Front Walk",
      customer: "Martinez",
      foremanAssignment: { userName: "Frank Foreman" },
    },
    items: [
      { id: "I-1", name: "Bull float", status: "loaded", notes: "", missingNotes: "", damagedNotes: "" },
      { id: "I-2", name: "Mag float", status: "missing", notes: "", missingNotes: "Left at shop", damagedNotes: "" },
    ],
    notes: "Ready for morning loadout",
  },
  {
    id: "TC-2",
    title: "Layout check",
    status: "submitted",
    statusLabel: "Submitted",
    archivedAt: "2026-04-20T12:00:00.000Z",
    job: {
      title: "Nguyen Driveway",
      customer: "Nguyen",
      foremanAssignment: { userName: "Paula Planning" },
    },
    items: [
      { id: "I-3", name: "String line", status: "damaged", notes: "", missingNotes: "", damagedNotes: "Frayed line" },
    ],
    notes: "",
  },
];

test("tool checklist status helpers stay human friendly", () => {
  assert.equal(toolChecklistStatusLabel("submitted"), "Submitted");
  assert.equal(toolChecklistItemStatusLabel("on_site"), "On Site");
});

test("checklist filters support status, archive, search, job, foreman, and missing or damaged items", () => {
  assert.equal(filterToolChecklists(sampleChecklists, { archived: "Active" }).length, 1);
  assert.equal(filterToolChecklists(sampleChecklists, { archived: "Archived" }).length, 1);
  assert.equal(filterToolChecklists(sampleChecklists, { status: "Submitted", archived: "All" }).length, 1);
  assert.equal(filterToolChecklists(sampleChecklists, { job: "Martinez Front Walk", archived: "All" }).length, 1);
  assert.equal(filterToolChecklists(sampleChecklists, { foreman: "Frank Foreman", archived: "All" }).length, 1);
  assert.equal(filterToolChecklists(sampleChecklists, { missingDamaged: "Missing only", archived: "All" }).length, 1);
  assert.equal(filterToolChecklists(sampleChecklists, { missingDamaged: "Damaged only", archived: "All" }).length, 1);
  assert.equal(filterToolChecklists(sampleChecklists, { search: "bull float", archived: "All" }).length, 1);
});

test("derived checklist list state tolerates sparse jobs and derives options", () => {
  const state = deriveToolChecklistListState(sampleChecklists, [{ id: "J-1" }]);
  assert.deepEqual(state.jobOptions, ["All jobs", "Martinez Front Walk", "Nguyen Driveway"]);
  assert.deepEqual(state.foremanOptions, ["All foremen", "Frank Foreman", "Paula Planning"]);
  assert.equal(state.defaultJobId, "J-1");
});

test("archived checklist items are hidden by default and missing or damaged sort first", () => {
  const rows = deriveChecklistItems([
    { id: "1", name: "Bull float", status: "loaded", archivedAt: null },
    { id: "2", name: "Mag float", status: "missing", archivedAt: null },
    { id: "3", name: "Old line", status: "damaged", archivedAt: "2026-04-20T12:00:00.000Z" },
  ]);

  assert.deepEqual(rows.map((item) => item.id), ["2", "1"]);
});
