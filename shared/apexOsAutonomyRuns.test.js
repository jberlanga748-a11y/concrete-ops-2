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
  runApexOsAutonomyRunPrivateOperatorCycle,
  summarizeApexOsAutonomyRuns,
  validateApexOsAutonomyRunPrivateProof,
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

test("private proof check verifies linked drafts and stops at approval", () => {
  const run = advanceApexOsAutonomyRunPrivatePrep(markApexOsAutonomyRunInternalDrafted(buildApexOsAutonomyRunPlan({
    title: "Proof check private run",
    request: "Check the internal run proof.",
    routeLabel: "Apex",
  }, {
    id: "AAR-PROOF",
    now: "2026-06-04T10:00:00.000Z",
    createdBy: "U-1",
  }), {
    agentControlRequestId: "AAC-PROOF",
    executionHandoffId: "AEH-PROOF",
    now: "2026-06-04T10:01:00.000Z",
  }), {
    now: "2026-06-04T10:02:00.000Z",
  });

  const checked = validateApexOsAutonomyRunPrivateProof(run, {
    now: "2026-06-04T10:03:00.000Z",
  });

  assert.equal(checked.status, "waiting-approval");
  assert.equal(checked.steps.find((step) => step.id === "validate-evidence").status, "done");
  assert.equal(checked.steps.find((step) => step.id === "approval-gate").status, "waiting-approval");
  assert.match(checked.steps.find((step) => step.id === "validate-evidence").evidence, /proof check passed/i);
  assert.match(checked.evidence.join(" "), /proof check passed/i);
  assert.match(checked.nextSafeAction, /Proof check is complete/i);
  assert.equal(isApexOsAutonomyRunReady(checked), true);
});

test("private proof check keeps incomplete proof in validation", () => {
  const run = buildApexOsAutonomyRunPlan({
    title: "Incomplete proof",
    request: "Check proof before drafts exist.",
  }, {
    id: "AAR-PROOF-GAPS",
    now: "2026-06-04T10:00:00.000Z",
    createdBy: "U-1",
  });

  const checked = validateApexOsAutonomyRunPrivateProof(run, {
    now: "2026-06-04T10:03:00.000Z",
  });

  assert.equal(checked.status, "validating");
  assert.equal(checked.steps.find((step) => step.id === "validate-evidence").status, "blocked");
  assert.match(checked.evidence.join(" "), /linked agent-control draft is missing/i);
  assert.match(checked.nextSafeAction, /Fix proof gaps/i);
});

test("private operator cycle prepares proof, report memory, and waits for review", () => {
  const run = markApexOsAutonomyRunInternalDrafted(buildApexOsAutonomyRunPlan({
    title: "Cycle private run",
    request: "Work this Apex run up for review.",
    routeLabel: "Apex",
  }, {
    id: "AAR-CYCLE",
    now: "2026-06-04T10:00:00.000Z",
    createdBy: "U-1",
  }), {
    agentControlRequestId: "AAC-CYCLE",
    executionHandoffId: "AEH-CYCLE",
    now: "2026-06-04T10:01:00.000Z",
  });

  const cycled = runApexOsAutonomyRunPrivateOperatorCycle(run, {
    now: "2026-06-04T10:04:00.000Z",
  });

  assert.equal(cycled.status, "waiting-approval");
  assert.equal(cycled.steps.find((step) => step.id === "route-work").status, "done");
  assert.equal(cycled.steps.find((step) => step.id === "plan-steps").status, "done");
  assert.equal(cycled.steps.find((step) => step.id === "draft-internal").status, "drafted");
  assert.equal(cycled.steps.find((step) => step.id === "validate-evidence").status, "done");
  assert.equal(cycled.steps.find((step) => step.id === "approval-gate").status, "waiting-approval");
  assert.equal(cycled.steps.find((step) => step.id === "report-memory").status, "ready");
  assert.match(cycled.evidence.join(" "), /private operator cycle completed/i);
  assert.match(cycled.blockedActions.join(" "), /No external sends/i);
  assert.match(cycled.blockedActions.join(" "), /No billing/i);
  assert.match(cycled.blockedActions.join(" "), /No queue, run, execute, deploy, or rollback/i);
  assert.match(cycled.nextSafeAction, /Operator cycle is complete/i);
  assert.equal(isApexOsAutonomyRunReady(cycled), true);
});

test("private operator cycle reports proof gaps without executing", () => {
  const run = buildApexOsAutonomyRunPlan({
    title: "Cycle gaps",
    request: "Try to work this run without linked drafts.",
  }, {
    id: "AAR-CYCLE-GAPS",
    now: "2026-06-04T10:00:00.000Z",
    createdBy: "U-1",
  });

  const cycled = runApexOsAutonomyRunPrivateOperatorCycle(run, {
    now: "2026-06-04T10:04:00.000Z",
  });

  assert.equal(cycled.status, "validating");
  assert.equal(cycled.steps.find((step) => step.id === "validate-evidence").status, "blocked");
  assert.equal(cycled.steps.find((step) => step.id === "report-memory").status, "todo");
  assert.match(cycled.evidence.join(" "), /validation gaps/i);
  assert.match(cycled.nextSafeAction, /Fix proof gaps/i);
});

test("private operator cycle leaves terminal runs unchanged", () => {
  const doneRun = normalizeApexOsAutonomyRun({
    id: "AAR-CYCLE-DONE",
    title: "Already done",
    request: "Do not reopen this run.",
    status: "done",
    resultReport: "Completed after review.",
  }, {
    now: "2026-06-04T10:00:00.000Z",
  });

  const cycled = runApexOsAutonomyRunPrivateOperatorCycle(doneRun, {
    now: "2026-06-04T10:05:00.000Z",
  });

  assert.equal(cycled.status, "done");
  assert.equal(cycled.resultReport, "Completed after review.");
  assert.equal(cycled.nextSafeAction, doneRun.nextSafeAction);
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
