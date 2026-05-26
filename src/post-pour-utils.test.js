import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPostPourSupportContext,
  derivePostPourChecklistListState,
  derivePostPourItems,
  filterPostPourChecklists,
  postPourChecklistOwner,
  postPourChecklistStatusLabel,
  postPourChecklistUpdated,
  postPourItemTone,
  postPourItemStatusLabel,
  summarizePostPourChecklist,
} from "./post-pour-utils.js";

test("post-pour status helpers stay human friendly", () => {
  assert.equal(postPourChecklistStatusLabel("completed"), "Completed");
  assert.equal(postPourChecklistStatusLabel("reopened"), "Reopened");
  assert.equal(postPourItemStatusLabel("not_applicable"), "Not Applicable");
  assert.equal(postPourItemStatusLabel("checked"), "Checked");
});

test("post-pour display helpers preserve App checklist labels", () => {
  assert.equal(postPourChecklistOwner({ job: { foremanAssignment: { userName: "Field Lead" } }, assignedForemanName: "Assigned" }), "Field Lead");
  assert.equal(postPourChecklistOwner({ completedByName: "Completed By", createdByName: "Created By" }), "Completed By");
  assert.equal(postPourChecklistOwner({}), "Unassigned");
  assert.equal(postPourChecklistUpdated({ completedAt: "2026-04-27", updatedAt: "2026-04-26", createdAt: "2026-04-25" }), "2026-04-27");
  assert.equal(postPourItemTone("checked"), "green");
  assert.equal(postPourItemTone("not_applicable"), "slate");
  assert.equal(postPourItemTone("unchecked"), "amber");
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

test("post-pour support context summarizes office-visible closeout without sensitive data", () => {
  const context = buildPostPourSupportContext({
    user: { name: "Ops Owner", role: "Owner" },
    permissions: { postPour: { canManageAll: true } },
    visibleRows: [
      {
        id: "POST-1",
        status: "completed",
        createdAt: "2026-04-25T12:00:00.000Z",
        updatedAt: "2026-04-25T14:00:00.000Z",
        notes: "Internal closeout sequencing note.",
        job: {
          title: "Martinez Walk",
          customer: "Martinez",
          internalNotes: "Hidden margin concern",
          estimateTotal: 12500,
          grossMargin: 4200,
        },
        createdByName: "Fran",
        items: [
          { label: "Site cleaned", status: "checked", notes: "Do not leak item note." },
          { label: "Cure method confirmed", status: "unchecked", notes: "Sensitive closeout note." },
        ],
        payRate: 42,
        grossPay: 336,
        latitude: 44.9,
        longitude: -123.0,
      },
      {
        id: "POST-2",
        status: "reviewed",
        archivedAt: "2026-04-26T12:00:00.000Z",
        job: { title: "Lopez Drive", customer: "Lopez" },
        items: [{ label: "Punch list checked", status: "checked" }],
      },
    ],
    selectedChecklist: {
      id: "POST-1",
      status: "completed",
      createdAt: "2026-04-25T12:00:00.000Z",
      updatedAt: "2026-04-25T14:00:00.000Z",
      notes: "Internal closeout sequencing note.",
      job: {
        title: "Martinez Walk",
        customer: "Martinez",
        internalNotes: "Hidden margin concern",
        estimateTotal: 12500,
        grossMargin: 4200,
      },
      createdByName: "Fran",
      items: [
        { label: "Site cleaned", status: "checked", notes: "Do not leak item note." },
        { label: "Cure method confirmed", status: "unchecked", notes: "Sensitive closeout note." },
      ],
      payRate: 42,
      grossPay: 336,
      latitude: 44.9,
      longitude: -123.0,
    },
    filters: {
      status: "Completed",
      archived: "All",
      job: "Martinez Walk",
      foreman: "Fran",
      date: "2026-04-25",
      search: "cleanup",
    },
    visibleJobs: [{ id: "J-1" }, { id: "J-2" }],
  });

  assert.equal(context.workflow, "Tickets / checklists");
  assert.match(context.summary, /Scope: all visible company Post-Pour checklists/);
  assert.match(context.summary, /Visible checklists: 2; active: 1; completed for review: 1; reviewed accepted: 1; draft or reopened: 0; open closeout items: 1; needing attention: 1; archived in view: 1/);
  assert.match(context.summary, /Selected checklist: Martinez Walk is Completed; owner Fran; updated 2026-04-25; 1\/2 closeout items clear; 1 open/);
  assert.match(context.workaround, /Visible job options: 2 jobs/);
  const serialized = JSON.stringify(context);
  assert.doesNotMatch(serialized, /Internal closeout|Do not leak item note|Sensitive closeout note|internalNotes|estimateTotal|grossMargin|payRate|grossPay/);
  assert.doesNotMatch(serialized, /44\.9|-123|12500|4200|336/);
});

test("post-pour support context stays limited to field-visible checklist rows", () => {
  const context = buildPostPourSupportContext({
    user: { id: "U-FIELD", name: "Post-Pour Foreman", role: "Foreman" },
    permissions: { postPour: { canView: true, canManage: true, canComplete: true, canManageAll: false } },
    visibleRows: [
      {
        id: "POST-FIELD",
        status: "draft",
        createdAt: "2026-04-26T10:00:00.000Z",
        jobId: "J-FIELD",
        job: { title: "Assigned Patio", customer: "Visible Customer" },
        createdBy: "U-FIELD",
        createdByName: "Post-Pour Foreman",
        items: [
          { label: "Cleanup complete", status: "checked" },
          { label: "Completion photos uploaded", status: "unchecked" },
        ],
      },
    ],
    selectedChecklist: {
      id: "POST-FIELD",
      status: "draft",
      createdAt: "2026-04-26T10:00:00.000Z",
      jobId: "J-FIELD",
      job: { title: "Assigned Patio", customer: "Visible Customer" },
      createdBy: "U-FIELD",
      createdByName: "Post-Pour Foreman",
      items: [
        { label: "Cleanup complete", status: "checked" },
        { label: "Completion photos uploaded", status: "unchecked" },
      ],
    },
    visibleJobs: [{ id: "J-FIELD" }],
  });

  assert.match(context.summary, /Scope: assigned job Post-Pour checklists/);
  assert.match(context.summary, /Visible checklists: 1/);
  assert.match(context.summary, /Selected checklist: Assigned Patio is Draft/);
  assert.match(context.workaround, /Assigned Patio: 1 closeout item still open/);
  assert.doesNotMatch(context.summary, /Office Only|Unrelated Job|Hidden Customer|pricing|payroll|margin|grossPay/);
});
