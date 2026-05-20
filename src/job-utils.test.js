import assert from "node:assert/strict";
import test from "node:test";

import { deriveJobListState, deriveJobPilotHandoffReadiness, filterJobs, jobStatusLabel, matchesJobDateFilter, normalizeJobStatus } from "./job-utils.js";

const FIXTURE_JOBS = [
  {
    id: "J-1",
    title: "North Salem Patio",
    customerId: "C-1",
    customer: "Rob Jenkins",
    assignedForemanId: "U-FOREMAN",
    status: "in_progress",
    scheduledStart: "2026-04-25T07:30",
    nextStep: "Pour finish photos",
  },
  {
    id: "J-2",
    title: "Carter Driveway",
    customerId: "C-2",
    customer: "Megan Carter",
    assignedForemanId: "U-FOREMAN",
    status: "scheduled",
    scheduledStart: "2999-04-28T08:00",
    nextStep: "Confirm concrete order",
  },
  {
    id: "J-3",
    title: "Lebanon Shop Pad",
    customerId: "C-3",
    customer: "Harris Auto",
    assignedForemanId: "",
    status: "planned",
    scheduledStart: "2026-05-01T07:00",
    nextStep: "Ticket upload",
    archivedAt: "2026-04-24T09:00:00.000Z",
  },
];

test("job status helpers normalize legacy labels", () => {
  assert.equal(normalizeJobStatus("In Progress"), "in_progress");
  assert.equal(normalizeJobStatus("Ready to Bill"), "billing_ready");
  assert.equal(jobStatusLabel("field_complete"), "Field Complete");
});

test("job filters honor status, archived, customer, foreman, date, and search together", () => {
  const jobs = filterJobs(FIXTURE_JOBS, {
    status: "scheduled",
    customer: "C-2",
    foremanId: "U-FOREMAN",
    date: "Upcoming",
    query: "driveway",
  });

  assert.deepEqual(jobs.map((job) => job.id), ["J-2"]);
});

test("job filters can isolate archived records", () => {
  const jobs = filterJobs(FIXTURE_JOBS, {
    status: "Archived",
    query: "harris",
  });

  assert.deepEqual(jobs.map((job) => job.id), ["J-3"]);
});

test("job list state derives customer and foreman filter options", () => {
  const state = deriveJobListState(FIXTURE_JOBS, {}, [{ id: "U-FOREMAN", name: "Miguel Foreman" }]);

  assert.equal(state.customerOptions.length, 2);
  assert.deepEqual(state.foremanOptions, [{ value: "U-FOREMAN", label: "Miguel Foreman" }]);
  assert.equal(state.filteredJobs.length, 2);
});

test("job list helpers tolerate missing job arrays", () => {
  assert.deepEqual(filterJobs(undefined, { status: "All" }), []);

  const state = deriveJobListState(undefined, {}, undefined);
  assert.deepEqual(state.filteredJobs, []);
  assert.deepEqual(state.customerOptions, []);
  assert.deepEqual(state.foremanOptions, []);
});

test("job pilot handoff readiness highlights missing field workflow setup", () => {
  const readiness = deriveJobPilotHandoffReadiness({
    title: "M2 Mini slab",
    customer: "M2 Mini",
    status: "planned",
    scheduledStart: "2026-05-22T07:00",
    address: "Salem, OR",
    scopeSummary: "",
    assignedForemanId: "",
    fieldPlanningVisible: false,
    notes: "",
    safetyNotes: "",
  });

  assert.equal(readiness.status, "Needs handoff");
  assert.equal(readiness.readyCount, 2);
  assert.equal(readiness.nextAction, "Add scope");
  assert.deepEqual(
    readiness.steps.filter((step) => step.complete).map((step) => step.id),
    ["schedule", "location"],
  );
});

test("job pilot handoff readiness marks proof-ready jobs ready", () => {
  const readiness = deriveJobPilotHandoffReadiness({
    title: "Shop slab",
    status: "field_complete",
    scheduledStart: "2026-05-22T07:00",
    address: "123 Jobsite Rd",
    scopeSummary: "Prep and pour shop slab.",
    assignedForemanId: "U-FOREMAN",
    fieldPlanningVisible: true,
    notes: "Upload closeout proof and ticket before owner follow-up.",
    safetyNotes: "Review access and PPE before pour.",
  });

  assert.equal(readiness.status, "Field-ready");
  assert.equal(readiness.readyCount, readiness.totalCount);
  assert.equal(readiness.nextAction, "Start field work");
  assert.match(readiness.summary, /enough context/i);
});

test("job date helpers support This Week", () => {
  const now = new Date("2026-04-20T09:00:00Z");

  assert.equal(matchesJobDateFilter({ scheduledStart: "2026-04-20T16:00:00Z", status: "scheduled" }, "This Week", now), true);
  assert.equal(matchesJobDateFilter({ scheduledStart: "2026-04-25T16:00:00Z", status: "in_progress" }, "This Week", now), true);
  assert.equal(matchesJobDateFilter({ scheduledStart: "2026-04-28T16:00:00Z", status: "scheduled" }, "This Week", now), false);
});
