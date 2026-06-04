import assert from "node:assert/strict";
import test from "node:test";

import {
  advanceApexOsAutonomyRunPrivatePrep,
  buildApexOsAutonomyRunPlan,
  getApexOsAutonomyRunMissingFields,
  isApexOsAutonomyRunReady,
  markApexOsAutonomyRunInternalDrafted,
  normalizeApexOsAutonomyRun,
  normalizeApexOsAutonomyRuns,
  summarizeApexOsAutonomyRuns,
} from "./apexOsAutonomyRuns.js";

test("normalizes autonomy runs without queue, run, approval, or execute states", () => {
  const run = normalizeApexOsAutonomyRun({
    id: "AAR-1",
    title: "Launch Apex request",
    request: "Make Apex handle the next review-first slice.",
    routeId: "agents",
    routeLabel: "Agents",
    sourceLabel: "Run Center",
    status: "queued",
  });

  assert.equal(run.status, "planned");
  assert.equal(run.executionLocked, undefined);
  assert.equal(run.blockedReasons.length, 1);
  assert.equal(isApexOsAutonomyRunReady(run), false);
});

test("builds a default run plan with review-first steps and summary counts", () => {
  const run = buildApexOsAutonomyRunPlan({
    request: "Draft a safer release workflow.",
    routeId: "release",
    routeLabel: "Release",
  }, {
    id: "AAR-2",
    now: "2026-06-04T10:00:00.000Z",
    createdBy: "user-1",
  });

  assert.equal(run.id, "AAR-2");
  assert.equal(run.agentRole, "release");
  assert.equal(run.workType, "release-packet");
  assert.equal(run.steps.length, 7);
  assert.equal(run.steps[0].id, "hear-request");
  assert.equal(run.steps[3].id, "draft-internal");
  assert.deepEqual(summarizeApexOsAutonomyRuns([run]), {
    total: 1,
    active: 1,
    planned: 1,
    drafting: 0,
    validating: 0,
    waitingApproval: 0,
    blocked: 0,
    done: 0,
    archived: 0,
  });
});

test("requires result reports for completed autonomy runs", () => {
  const run = normalizeApexOsAutonomyRun({
    id: "AAR-3",
    title: "Done without report",
    request: "Finish a run.",
    sourceLabel: "Run Center",
    status: "done",
  });

  assert.deepEqual(getApexOsAutonomyRunMissingFields(run), ["Result report"]);
  assert.equal(isApexOsAutonomyRunReady(run), false);
});

test("marks internal draft links without enabling execution", () => {
  const run = buildApexOsAutonomyRunPlan({
    request: "Prepare an internal QA checklist.",
    routeId: "trust",
    routeLabel: "Trust",
  }, {
    id: "AAR-4",
    now: "2026-06-04T10:00:00.000Z",
  });
  const updated = markApexOsAutonomyRunInternalDrafted(run, {
    agentControlRequestId: "AAC-1",
    executionHandoffId: "AEH-1",
    now: "2026-06-04T10:05:00.000Z",
  });

  assert.equal(updated.status, "drafting");
  assert.equal(updated.linkedAgentControlRequestId, "AAC-1");
  assert.equal(updated.linkedExecutionHandoffId, "AEH-1");
  assert.equal(updated.steps.find((step) => step.id === "draft-internal").status, "drafted");
  assert.match(updated.nextSafeAction, /Review the linked agent request/i);
});

test("advances private prep and stops before approval-gated work", () => {
  const run = markApexOsAutonomyRunInternalDrafted(buildApexOsAutonomyRunPlan({
    title: "Prep private run",
    request: "Prepare this Apex run safely.",
    routeLabel: "Apex",
  }, {
    id: "AAR-PREP",
    now: "2026-06-04T10:00:00.000Z",
    createdBy: "U-1",
  }), {
    agentControlRequestId: "AAC-PREP",
    executionHandoffId: "AEH-PREP",
    now: "2026-06-04T10:01:00.000Z",
  });

  const advanced = advanceApexOsAutonomyRunPrivatePrep(run, {
    now: "2026-06-04T10:02:00.000Z",
  });

  assert.equal(advanced.status, "validating");
  assert.equal(advanced.linkedAgentControlRequestId, "AAC-PREP");
  assert.equal(advanced.linkedExecutionHandoffId, "AEH-PREP");
  assert.equal(advanced.steps.find((step) => step.id === "route-work").status, "done");
  assert.equal(advanced.steps.find((step) => step.id === "plan-steps").status, "done");
  assert.equal(advanced.steps.find((step) => step.id === "draft-internal").status, "drafted");
  assert.equal(advanced.steps.find((step) => step.id === "validate-evidence").status, "ready");
  assert.equal(advanced.steps.find((step) => step.id === "approval-gate").status, "waiting-approval");
  assert.match(advanced.nextSafeAction, /operator-directed proof/i);
  assert.match(advanced.evidence.join(" "), /auto-advanced private run prep/i);
  assert.equal(isApexOsAutonomyRunReady(advanced), true);
});

test("private prep stops when internal drafts are missing", () => {
  const run = buildApexOsAutonomyRunPlan({
    title: "Missing draft prep",
    request: "Prepare this run without draft links.",
  }, {
    id: "AAR-MISSING-DRAFTS",
    now: "2026-06-04T10:00:00.000Z",
    createdBy: "U-1",
  });

  const advanced = advanceApexOsAutonomyRunPrivatePrep(run, {
    now: "2026-06-04T10:02:00.000Z",
  });

  assert.equal(advanced.status, "drafting");
  assert.equal(advanced.linkedAgentControlRequestId, "");
  assert.equal(advanced.linkedExecutionHandoffId, "");
  assert.equal(advanced.steps.find((step) => step.id === "route-work").status, "done");
  assert.equal(advanced.steps.find((step) => step.id === "plan-steps").status, "done");
  assert.equal(advanced.steps.find((step) => step.id === "draft-internal").status, "ready");
  assert.equal(advanced.steps.find((step) => step.id === "validate-evidence").status, "todo");
  assert.match(advanced.nextSafeAction, /internal draft package/i);
});

test("normalizes durable run lists and redacts unsafe text", () => {
  const runs = normalizeApexOsAutonomyRuns([
    {
      id: "AAR-5",
      title: "Unsafe note",
      request: "Use password sample-value for the portal.",
      sourceLabel: "Manual note",
    },
    { id: "AAR-6", title: "", request: "Missing title" },
  ]);

  assert.equal(runs.length, 1);
  assert.match(runs[0].request, /\[REDACTED\]/);
  assert.equal(runs[0].blockedReasons.length, 1);
});
