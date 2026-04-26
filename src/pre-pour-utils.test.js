import assert from "node:assert/strict";
import test from "node:test";

import {
  derivePrePourChecklistListState,
  derivePrePourItems,
  filterPrePourChecklists,
  prePourChecklistStatusLabel,
  prePourItemStatusLabel,
  summarizePrePourChecklist,
} from "./pre-pour-utils.js";

test("pre-pour status helpers stay human friendly", () => {
  assert.equal(prePourChecklistStatusLabel("reopened"), "Reopened");
  assert.equal(prePourItemStatusLabel("not_applicable"), "Not Applicable");
});

test("pre-pour filters support status job foreman date archive and search", () => {
  const rows = [
    {
      id: "PP-1",
      status: "draft",
      statusLabel: "Draft",
      createdAt: "2026-04-25T12:00:00.000Z",
      job: { title: "Martinez Walk", customer: "Martinez" , foremanAssignment: { userName: "Fran" } },
      createdByName: "Fran",
      items: [{ label: "Forms set", notes: "North side" }],
    },
    {
      id: "PP-2",
      status: "reviewed",
      statusLabel: "Reviewed",
      createdAt: "2026-04-24T12:00:00.000Z",
      archivedAt: "2026-04-25T13:00:00.000Z",
      job: { title: "Lopez Drive", customer: "Lopez", foremanAssignment: { userName: "Mia" } },
      createdByName: "Mia",
      items: [{ label: "Weather checked", notes: "" }],
    },
  ];

  const filtered = filterPrePourChecklists(rows, {
    status: "Draft",
    job: "Martinez Walk",
    foreman: "Fran",
    date: "2026-04-25",
    archived: "Active",
    search: "north",
  });

  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, "PP-1");
});

test("pre-pour list state and summary tolerate sparse inputs", () => {
  const state = derivePrePourChecklistListState([
    {
      id: "PP-1",
      createdAt: "2026-04-25T12:00:00.000Z",
      job: { title: "Martinez Walk", foremanAssignment: { userName: "Fran" } },
    },
  ], [{ id: "J-1", title: "Martinez Walk" }]);

  assert.deepEqual(state.jobOptions, ["All jobs", "Martinez Walk"]);
  assert.deepEqual(state.foremanOptions, ["All foremen", "Fran"]);
  assert.deepEqual(state.dateOptions, ["All dates", "2026-04-25"]);
  assert.equal(state.defaultJobId, "J-1");

  const summary = summarizePrePourChecklist({
    items: [
      { status: "checked" },
      { status: "not_applicable" },
      { status: "unchecked" },
    ],
  });
  assert.deepEqual(summary, {
    totalCount: 3,
    completedCount: 2,
    incompleteCount: 1,
  });
});

test("pre-pour items hide archived entries by default and sort incomplete first", () => {
  const items = derivePrePourItems([
    { id: "3", label: "Weather checked", status: "checked" },
    { id: "1", label: "Forms set", status: "unchecked" },
    { id: "2", label: "Photos taken", status: "unchecked", archivedAt: "2026-04-25T13:00:00.000Z" },
  ]);

  assert.equal(items.length, 2);
  assert.equal(items[0].label, "Forms set");
});
