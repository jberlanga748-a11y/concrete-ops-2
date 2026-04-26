import assert from "node:assert/strict";
import test from "node:test";

import {
  derivePostPourChecklistListState,
  derivePostPourItems,
  filterPostPourChecklists,
  postPourChecklistStatusLabel,
  postPourItemStatusLabel,
  summarizePostPourChecklist,
} from "./post-pour-utils.js";

test("post-pour status helpers stay human friendly", () => {
  assert.equal(postPourChecklistStatusLabel("completed"), "Completed");
  assert.equal(postPourChecklistStatusLabel("reopened"), "Reopened");
  assert.equal(postPourItemStatusLabel("not_applicable"), "Not Applicable");
  assert.equal(postPourItemStatusLabel("checked"), "Checked");
});

test("post-pour filters support status job foreman date archive and search", () => {
  const rows = [
    {
      id: "PPST-1",
      status: "draft",
      statusLabel: "Draft",
      notes: "Sawcut reminder ready",
      job: { title: "Martinez Drive", customer: "Martinez" , foremanAssignment: { userName: "Ava Foreman" } },
      createdByName: "Ava Foreman",
      completedByName: "",
      createdAt: "2026-04-20T08:00:00.000Z",
      items: [{ label: "Completion photos taken", notes: "Need upload after broom finish." }],
    },
    {
      id: "PPST-2",
      status: "archived",
      statusLabel: "Archived",
      notes: "Cleanup done",
      job: { title: "South Alley", customer: "City", foremanAssignment: { userName: "Ben Foreman" } },
      createdByName: "Ben Foreman",
      completedByName: "Ben Foreman",
      createdAt: "2026-04-21T08:00:00.000Z",
      archivedAt: "2026-04-22T08:00:00.000Z",
      items: [],
    },
  ];

  assert.equal(filterPostPourChecklists(rows, { status: "Draft" }).length, 1);
  assert.equal(filterPostPourChecklists(rows, { archived: "Archived" }).length, 1);
  assert.equal(filterPostPourChecklists(rows, { job: "Martinez Drive" }).length, 1);
  assert.equal(filterPostPourChecklists(rows, { foreman: "Ben Foreman", archived: "All" }).length, 1);
  assert.equal(filterPostPourChecklists(rows, { date: "2026-04-20" }).length, 1);
  assert.equal(filterPostPourChecklists(rows, { search: "sawcut" }).length, 1);
});

test("post-pour list state and summary tolerate sparse inputs", () => {
  const state = derivePostPourChecklistListState(
    [{ job: { title: "North Lot", foremanAssignment: { userName: "Ava Foreman" } }, createdAt: "2026-04-20T08:00:00.000Z" }],
    [{ id: "J-1" }],
  );

  assert.deepEqual(state.jobOptions, ["All jobs", "North Lot"]);
  assert.deepEqual(state.foremanOptions, ["All foremen", "Ava Foreman"]);
  assert.deepEqual(state.dateOptions, ["All dates", "2026-04-20"]);
  assert.equal(state.defaultJobId, "J-1");

  assert.deepEqual(summarizePostPourChecklist({
    items: [
      { status: "checked" },
      { status: "not_applicable" },
      { status: "unchecked" },
    ],
  }), {
    totalCount: 3,
    completedCount: 2,
    incompleteCount: 1,
  });
});

test("post-pour items hide archived entries by default and sort incomplete first", () => {
  const items = derivePostPourItems([
    { id: "2", label: "Site cleaned", status: "checked" },
    { id: "3", label: "Completion photos taken", status: "unchecked" },
    { id: "1", label: "Cure method applied", status: "not_applicable", archivedAt: "2026-04-20T08:00:00.000Z" },
  ]);

  assert.deepEqual(items.map((item) => item.id), ["3", "2"]);
});
