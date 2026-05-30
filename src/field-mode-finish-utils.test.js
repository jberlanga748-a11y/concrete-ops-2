import assert from "node:assert/strict";
import test from "node:test";

import { deriveFieldModeFinishState } from "./field-mode-finish-utils.js";

const FIELD_PERMISSIONS = {
  jobs: { canManageField: true },
  time: { canView: true, canManageOwn: true },
  uploads: { canView: true },
  reports: { canView: true },
  deliveryTickets: { canView: true },
  prePour: { canView: true },
  postPour: { canView: true },
  toolChecklist: { canUse: true },
  safety: { canView: true },
  changeOrders: { canRequest: true },
};

const JOB = {
  id: "J-1",
  title: "Martinez fence",
  customer: "Martinez Residence",
  scheduledStart: "2026-05-30T14:00:00.000Z",
  prePourChecklist: { statusLabel: "Complete" },
  postPourChecklist: { statusLabel: "Not started" },
};

test("field mode finish state gives foremen one field-safe day checklist", () => {
  const state = deriveFieldModeFinishState({
    role: "foreman",
    permissions: FIELD_PERMISSIONS,
    workspace: {
      nextAssignedJob: JOB,
      assignedJobs: [JOB],
      assignmentNotices: [{ id: "N-1", job: JOB }],
    },
    timeWorkspace: { activeEntry: { id: "T-1", jobId: "J-1", jobTitle: "Martinez fence" } },
    focusJob: JOB,
    dailyReports: [{ id: "R-1", jobId: "J-1", reportDate: "2026-05-30", status: "submitted" }],
    uploads: [{ id: "U-1", jobId: "J-1", uploadedAt: "2026-05-30T18:00:00.000Z" }],
    deliveryTickets: [{ id: "D-1", jobId: "J-1", ticketDate: "2026-05-30" }],
    changeOrderRequests: [{ id: "CR-1", jobId: "J-1", status: "requested" }],
    safetyIncidents: [],
    toolChecklists: [{ id: "TC-1", jobId: "J-1", status: "reviewed" }],
  }, { today: "2026-05-30" });

  assert.equal(state.mode, "field_mode_finish");
  assert.equal(state.role, "foreman");
  assert.equal(state.title, "Field Execution Finish");
  assert.equal(state.items.find((item) => item.id === "arrival_start").status, "Notice first");
  assert.equal(state.items.find((item) => item.id === "daily_report").status, "Submitted today");
  assert.equal(state.items.some((item) => item.id === "change_request"), true);
  assert.equal(state.items.find((item) => item.id === "change_request").status, "1 in review");
  assert.equal(state.items.find((item) => item.id === "end_of_day_handoff").status, "Needs wrap-up");
  assert.equal(state.items.some((item) => item.id === "pwa_install"), true);
  assert.equal(state.metrics.todayUploads, 1);
  assert.equal(state.metrics.todayReports, 1);
  assert.equal(state.metrics.todayTickets, 1);
  assert.equal(state.metrics.openChangeRequests, 1);
  assert.doesNotMatch(JSON.stringify(state), /lead|estimate|pricing|billing|payroll|margin|profit|provider|AI office|office notes/i);
  assert.match(state.safetyBoundary, /GPS is optional/i);
});

test("field mode finish state keeps employees field-safe and without change pricing controls", () => {
  const state = deriveFieldModeFinishState({
    role: "employee",
    permissions: {
      ...FIELD_PERMISSIONS,
      reports: { canView: false },
      changeOrders: { canRequest: false, canManage: false },
    },
    workspace: {
      assignedJobs: [JOB],
      assignmentNotices: [],
    },
    focusJob: JOB,
    timeWorkspace: { activeEntry: null },
    uploads: [],
    deliveryTickets: [],
    safetyIncidents: [{ id: "S-1", jobId: "J-1", status: "open" }],
  }, { today: "2026-05-30" });

  assert.equal(state.role, "employee");
  assert.equal(state.items.some((item) => item.id === "daily_report"), false);
  assert.equal(state.items.some((item) => item.id === "change_request"), false);
  assert.equal(state.items.some((item) => /lead|estimate|pricing|margin|profit|payroll|billing|provider|AI office|office notes/i.test(`${item.label} ${item.helper}`)), false);
  assert.equal(state.metrics.openSafetyIncidents, 1);
  assert.equal(state.nextAction.id, "arrival_start");
});

test("field mode finish state drives end-of-day handoff from proof, report, checklist, safety, and clock state", () => {
  const state = deriveFieldModeFinishState({
    role: "foreman",
    permissions: FIELD_PERMISSIONS,
    workspace: {
      assignedJobs: [JOB],
      assignmentNotices: [],
    },
    focusJob: JOB,
    timeWorkspace: { activeEntry: null },
    dailyReports: [{ id: "R-2", jobId: "J-1", reportDate: "2026-05-30", status: "draft" }],
    uploads: [{ id: "U-2", jobId: "J-1", uploadedAt: "2026-05-30T18:00:00.000Z" }],
    deliveryTickets: [],
    safetyIncidents: [],
    toolChecklists: [{ id: "TC-2", jobId: "J-1", statusLabel: "Complete" }],
  }, { today: "2026-05-30" });

  assert.equal(state.items.find((item) => item.id === "daily_report").status, "Draft today");
  assert.equal(state.items.find((item) => item.id === "daily_report").ready, false);
  assert.equal(state.items.find((item) => item.id === "end_of_day_handoff").helper, "Submit the daily report for review.");
  assert.equal(state.items.find((item) => item.id === "end_of_day_handoff").moduleId, "reports");
  assert.equal(state.metrics.endOfDayReady, 0);

  const submittedState = deriveFieldModeFinishState({
    role: "foreman",
    permissions: FIELD_PERMISSIONS,
    workspace: {
      assignedJobs: [JOB],
      assignmentNotices: [],
    },
    focusJob: { ...JOB, postPourChecklist: { statusLabel: "Complete" } },
    timeWorkspace: { activeEntry: null },
    dailyReports: [{ id: "R-3", jobId: "J-1", reportDate: "2026-05-30", status: "submitted" }],
    uploads: [{ id: "U-3", jobId: "J-1", uploadedAt: "2026-05-30T18:00:00.000Z" }],
    deliveryTickets: [{ id: "D-3", jobId: "J-1", ticketDate: "2026-05-30" }],
    safetyIncidents: [],
    toolChecklists: [{ id: "TC-3", jobId: "J-1", statusLabel: "Complete" }],
  }, { today: "2026-05-30" });

  assert.equal(submittedState.items.find((item) => item.id === "end_of_day_handoff").status, "Ready");
  assert.equal(submittedState.metrics.endOfDayReady, 1);
});

test("field mode finish state names install readiness without claiming offline editing", () => {
  const state = deriveFieldModeFinishState({
    role: "employee",
    permissions: FIELD_PERMISSIONS,
    workspace: { assignedJobs: [] },
    pwaInstallReady: true,
  }, { today: "2026-05-30" });

  const installItem = state.items.find((item) => item.id === "pwa_install");
  assert.equal(installItem.status, "Install-ready");
  assert.match(installItem.helper, /Offline drafts remain planned/i);
  assert.doesNotMatch(JSON.stringify(state), /works offline|offline editing is enabled|cache API responses/i);
});
