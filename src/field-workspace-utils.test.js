import assert from "node:assert/strict";
import test from "node:test";

import { buildJobAssignmentNoticeKey } from "../shared/job-assignment-notices.js";
import { deriveEmployeeWorkspace, deriveFieldTradeGuidance, deriveForemanWorkspace, deriveNextAssignedJob } from "./field-workspace-utils.js";

const NOW = new Date("2026-04-25T12:00:00.000Z");

const JOBS = [
  {
    id: "J-2201",
    assignedForemanId: "U-FOREMAN",
    assignedUserId: "U-EMPLOYEE",
    foremanAssignment: { userId: "U-FOREMAN" },
    crewAssignments: [{ userId: "U-EMPLOYEE", roleOnJob: "crew" }],
    scheduledStart: "2026-04-25T08:00:00.000Z",
    archivedAt: null,
    fieldPlanningVisible: false,
    visibleToForeman: false,
  },
  {
    id: "J-2202",
    assignedForemanId: "U-FOREMAN",
    assignedUserId: "U-EMPLOYEE",
    foremanAssignment: { userId: "U-FOREMAN" },
    crewAssignments: [{ userId: "U-EMPLOYEE", roleOnJob: "crew" }],
    scheduledStart: "2026-04-26T07:00:00.000Z",
    archivedAt: null,
    fieldPlanningVisible: false,
    visibleToForeman: false,
  },
  {
    id: "J-2198",
    assignedForemanId: "",
    assignedUserId: "",
    scheduledStart: "2026-04-30T08:00:00.000Z",
    archivedAt: null,
    fieldPlanningVisible: true,
    visibleToForeman: true,
  },
  {
    id: "J-2192",
    assignedForemanId: "U-OTHER",
    assignedUserId: "U-OTHER-EMP",
    scheduledStart: "2026-04-26T08:00:00.000Z",
    archivedAt: null,
    fieldPlanningVisible: false,
    visibleToForeman: false,
  },
];

test("foreman workspace separates assigned jobs from future field-visible jobs", () => {
  const workspace = deriveForemanWorkspace(JOBS, "U-FOREMAN", NOW);

  assert.deepEqual(workspace.assignedJobs.map((job) => job.id), ["J-2201", "J-2202"]);
  assert.deepEqual(workspace.upcomingJobs.map((job) => job.id), ["J-2198"]);
  assert.deepEqual(workspace.assignmentNotices.map((notice) => notice.job.id), ["J-2201", "J-2202"]);
  assert.equal(workspace.primaryJob?.id, "J-2201");
  assert.equal(workspace.nextAssignedJob?.id, "J-2202");
});

test("employee workspace only includes personally assigned jobs", () => {
  const workspace = deriveEmployeeWorkspace(JOBS, "U-EMPLOYEE", NOW);

  assert.deepEqual(workspace.assignedJobs.map((job) => job.id), ["J-2201", "J-2202"]);
  assert.deepEqual(workspace.assignmentNotices.map((notice) => notice.job.id), ["J-2201", "J-2202"]);
  assert.equal(workspace.primaryJob?.id, "J-2201");
  assert.equal(workspace.nextAssignedJob?.id, "J-2202");
});

test("assignment notices clear only for the current schedule and address", () => {
  const assignment = {
    userId: "U-EMPLOYEE",
    roleOnJob: "crew",
    assignedAt: "2026-04-24T08:00:00.000Z",
  };
  const acknowledgedJob = {
    id: "J-ACK",
    assignedUserId: "U-EMPLOYEE",
    assignments: [{
      ...assignment,
      id: "JA-ACK",
      noticeAcknowledgedAt: "2026-04-24T09:00:00.000Z",
      noticeAcknowledgedKey: "",
    }],
    scheduledStart: "2026-04-26T07:00:00.000Z",
    scheduledEnd: "2026-04-26T15:00:00.000Z",
    address: "123 Field Rd",
    archivedAt: null,
  };
  acknowledgedJob.assignments[0].noticeAcknowledgedKey = buildJobAssignmentNoticeKey(acknowledgedJob, acknowledgedJob.assignments[0]);

  assert.deepEqual(deriveEmployeeWorkspace([acknowledgedJob], "U-EMPLOYEE", NOW).assignmentNotices, []);

  const rescheduledJob = {
    ...acknowledgedJob,
    scheduledStart: "2026-04-26T08:00:00.000Z",
  };
  assert.equal(deriveEmployeeWorkspace([rescheduledJob], "U-EMPLOYEE", NOW).assignmentNotices.length, 1);
});

test("next assigned job chooses the nearest future scheduled assigned job", () => {
  const nextJob = deriveNextAssignedJob(JOBS.filter((job) => job.assignedUserId === "U-EMPLOYEE"), NOW);

  assert.equal(nextJob?.id, "J-2202");
});

test("field workspace helpers tolerate missing job arrays", () => {
  const foremanWorkspace = deriveForemanWorkspace(undefined, "U-FOREMAN", NOW);
  const employeeWorkspace = deriveEmployeeWorkspace(undefined, "U-EMPLOYEE");

  assert.deepEqual(foremanWorkspace.assignedJobs, []);
  assert.deepEqual(foremanWorkspace.upcomingJobs, []);
  assert.deepEqual(foremanWorkspace.assignmentNotices, []);
  assert.equal(foremanWorkspace.primaryJob, null);
  assert.equal(foremanWorkspace.nextAssignedJob, null);
  assert.deepEqual(employeeWorkspace.assignedJobs, []);
  assert.deepEqual(employeeWorkspace.assignmentNotices, []);
  assert.equal(employeeWorkspace.primaryJob, null);
  assert.equal(employeeWorkspace.nextAssignedJob, null);
});

test("field trade guidance derives proof prompts from job startup notes", () => {
  const guidance = deriveFieldTradeGuidance({
    title: "North shop fence",
    customer: "North Valley Shop",
    scopeSummary: "Replace yard fence and install double gate.",
    startupNotes: "Trade context: Fencing\nProof photos to collect: Existing fence/line; Post holes; Posts set; Gate hardware",
  });

  assert.equal(guidance.tradeLabel, "Fencing");
  assert.ok(guidance.proofPhotoChecklist.some((item) => /post/i.test(item)));
  assert.ok(guidance.fieldHandoffChecklist.some((item) => /gate/i.test(item)));
  assert.ok(guidance.changeOrderWatchouts.length > 0);
  assert.match(guidance.safetyBoundary, /review-only trade guidance/i);
  assert.match(guidance.safetyBoundary, /Do not invent pricing/i);
});
