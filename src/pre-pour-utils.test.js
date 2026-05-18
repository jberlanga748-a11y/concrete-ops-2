import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPrePourSupportContext,
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

test("pre-pour support context summarizes office-visible readiness without sensitive data", () => {
  const context = buildPrePourSupportContext({
    user: { name: "Ops Owner", role: "Owner" },
    permissions: { prePour: { canManageAll: true } },
    visibleRows: [
      {
        id: "PP-1",
        status: "completed",
        createdAt: "2026-04-25T12:00:00.000Z",
        updatedAt: "2026-04-25T14:00:00.000Z",
        notes: "Internal office-only sequencing note.",
        job: {
          title: "Martinez Walk",
          customer: "Martinez",
          internalNotes: "Hidden margin concern",
          estimateTotal: 12500,
          grossMargin: 4200,
        },
        createdByName: "Fran",
        items: [
          { label: "Forms set", status: "checked", notes: "Do not leak item note." },
          { label: "Base compacted", status: "unchecked", notes: "Sensitive prep note." },
        ],
        payRate: 42,
        grossPay: 336,
        latitude: 44.9,
        longitude: -123.0,
      },
      {
        id: "PP-2",
        status: "reviewed",
        archivedAt: "2026-04-26T12:00:00.000Z",
        job: { title: "Lopez Drive", customer: "Lopez" },
        items: [{ label: "Weather checked", status: "checked" }],
      },
    ],
    selectedChecklist: {
      id: "PP-1",
      status: "completed",
      createdAt: "2026-04-25T12:00:00.000Z",
      updatedAt: "2026-04-25T14:00:00.000Z",
      notes: "Internal office-only sequencing note.",
      job: {
        title: "Martinez Walk",
        customer: "Martinez",
        internalNotes: "Hidden margin concern",
        estimateTotal: 12500,
        grossMargin: 4200,
      },
      createdByName: "Fran",
      items: [
        { label: "Forms set", status: "checked", notes: "Do not leak item note." },
        { label: "Base compacted", status: "unchecked", notes: "Sensitive prep note." },
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
      search: "forms",
    },
    visibleJobs: [{ id: "J-1" }, { id: "J-2" }],
  });

  assert.equal(context.workflow, "Tickets / checklists");
  assert.match(context.summary, /Scope: all visible company Pre-Pour checklists/);
  assert.match(context.summary, /Visible checklists: 2; active: 1; completed for review: 1; reviewed ready: 1; draft or reopened: 0; open readiness items: 1; needing attention: 1; archived in view: 1/);
  assert.match(context.summary, /Selected checklist: Martinez Walk is Completed; owner Fran; updated 2026-04-25; 1\/2 readiness items clear; 1 open/);
  assert.match(context.workaround, /Visible job options: 2 jobs/);
  const serialized = JSON.stringify(context);
  assert.doesNotMatch(serialized, /Internal office-only|Do not leak item note|Sensitive prep note|internalNotes|estimateTotal|grossMargin|payRate|grossPay/);
  assert.doesNotMatch(serialized, /44\.9|-123|12500|4200|336/);
});

test("pre-pour support context stays limited to field-visible checklist rows", () => {
  const context = buildPrePourSupportContext({
    user: { id: "U-FIELD", name: "Pre-Pour Foreman", role: "Foreman" },
    permissions: { prePour: { canView: true, canManage: true, canComplete: true, canManageAll: false } },
    visibleRows: [
      {
        id: "PP-FIELD",
        status: "draft",
        createdAt: "2026-04-26T10:00:00.000Z",
        jobId: "J-FIELD",
        job: { title: "Assigned Patio", customer: "Visible Customer" },
        createdBy: "U-FIELD",
        createdByName: "Pre-Pour Foreman",
        items: [
          { label: "Forms set", status: "checked" },
          { label: "Access lane ready", status: "unchecked" },
        ],
      },
    ],
    selectedChecklist: {
      id: "PP-FIELD",
      status: "draft",
      createdAt: "2026-04-26T10:00:00.000Z",
      jobId: "J-FIELD",
      job: { title: "Assigned Patio", customer: "Visible Customer" },
      createdBy: "U-FIELD",
      createdByName: "Pre-Pour Foreman",
      items: [
        { label: "Forms set", status: "checked" },
        { label: "Access lane ready", status: "unchecked" },
      ],
    },
    visibleJobs: [{ id: "J-FIELD" }],
  });

  assert.match(context.summary, /Scope: assigned job Pre-Pour checklists/);
  assert.match(context.summary, /Visible checklists: 1/);
  assert.match(context.summary, /Selected checklist: Assigned Patio is Draft/);
  assert.match(context.workaround, /Assigned Patio: 1 readiness item still open/);
  assert.doesNotMatch(context.summary, /Office Only|Unrelated Job|Hidden Customer|pricing|payroll|margin|grossPay/);
});
