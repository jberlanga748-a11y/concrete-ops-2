import assert from "node:assert/strict";
import test from "node:test";

import { deriveEmployeeWorkspace, deriveForemanWorkspace } from "./field-workspace-utils.js";

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

  assert.deepEqual(workspace.assignedJobs.map((job) => job.id), ["J-2201"]);
  assert.deepEqual(workspace.upcomingJobs.map((job) => job.id), ["J-2198"]);
  assert.equal(workspace.primaryJob?.id, "J-2201");
});

test("employee workspace only includes personally assigned jobs", () => {
  const workspace = deriveEmployeeWorkspace(JOBS, "U-EMPLOYEE");

  assert.deepEqual(workspace.assignedJobs.map((job) => job.id), ["J-2201"]);
  assert.equal(workspace.primaryJob?.id, "J-2201");
});
