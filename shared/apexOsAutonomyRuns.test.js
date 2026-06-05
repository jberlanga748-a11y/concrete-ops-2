import assert from "node:assert/strict";
import test from "node:test";

import {
  advanceApexOsAutonomyRunPrivatePrep,
  buildApexOsAutonomyRunHeartbeat,
  buildApexOsAutonomyRunProactiveCheckIn,
  buildApexOsAutonomyRunProactiveMemoryDraft,
  buildApexOsAutonomyRunPlan,
  getApexOsAutonomyRunMissingFields,
  isApexOsAutonomyRunReady,
  markApexOsAutonomyRunInternalDrafted,
  normalizeApexOsAutonomyRun,
  normalizeApexOsAutonomyRuns,
  runApexOsAutonomyRunPrivateOperatorCycle,
  summarizeApexOsAutonomyRunProgress,
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

test("summarizes private run progress for live operator heartbeat", () => {
  const run = runApexOsAutonomyRunPrivateOperatorCycle(markApexOsAutonomyRunInternalDrafted(buildApexOsAutonomyRunPlan({
    title: "Heartbeat run",
    request: "Keep this run alive like an operator.",
    routeLabel: "Apex",
  }, {
    id: "AAR-HEARTBEAT",
    now: "2026-06-05T10:00:00.000Z",
    createdBy: "U-1",
  }), {
    agentControlRequestId: "AAC-HEARTBEAT",
    executionHandoffId: "AEH-HEARTBEAT",
    now: "2026-06-05T10:01:00.000Z",
  }), {
    now: "2026-06-05T10:04:00.000Z",
  });

  const progress = summarizeApexOsAutonomyRunProgress(run);
  assert.equal(progress.totalCount, 7);
  assert.equal(progress.doneCount, 5);
  assert.equal(progress.waitingCount, 1);
  assert.equal(progress.linkedDraftCount, 2);
  assert.equal(progress.progressPercent, 71);
});

test("builds a live session heartbeat without enabling execution", () => {
  const run = runApexOsAutonomyRunPrivateOperatorCycle(markApexOsAutonomyRunInternalDrafted(buildApexOsAutonomyRunPlan({
    title: "Heartbeat check-in",
    request: "Report on this private run.",
    routeLabel: "Apex",
  }, {
    id: "AAR-HEARTBEAT-CHECK",
    now: "2026-06-05T10:00:00.000Z",
    createdBy: "U-1",
  }), {
    agentControlRequestId: "AAC-HEARTBEAT-CHECK",
    executionHandoffId: "AEH-HEARTBEAT-CHECK",
    now: "2026-06-05T10:01:00.000Z",
  }), {
    now: "2026-06-05T10:04:00.000Z",
  });

  const heartbeat = buildApexOsAutonomyRunHeartbeat(run, {
    now: "2026-06-05T10:31:00.000Z",
    pulse: { checkedAt: "2026-06-05T10:30:00.000Z" },
  });

  assert.equal(heartbeat.runId, "AAR-HEARTBEAT-CHECK");
  assert.equal(heartbeat.status, "Manual review");
  assert.equal(heartbeat.tone, "amber");
  assert.equal(heartbeat.ageLabel, "27m ago");
  assert.match(heartbeat.progressLabel, /71%/);
  assert.match(heartbeat.pulseLabel, /Pulse 1m ago/);
  assert.equal(heartbeat.executionLocked, true);
  assert.equal(heartbeat.externalActionsLocked, true);
  assert.equal(heartbeat.canExecute, false);
  assert.match(heartbeat.recommendation, /Review evidence/i);
});

test("heartbeat stands by when no private run is active", () => {
  const heartbeat = buildApexOsAutonomyRunHeartbeat(null, {
    now: "2026-06-05T10:31:00.000Z",
  });

  assert.equal(heartbeat.status, "Standing by");
  assert.equal(heartbeat.tone, "blue");
  assert.equal(heartbeat.executionLocked, true);
  assert.equal(heartbeat.canExecute, false);
  assert.match(heartbeat.recommendation, /Start a private run/i);
});

test("proactive check-in stays quiet when no run has started", () => {
  const heartbeat = buildApexOsAutonomyRunHeartbeat(null, {
    now: "2026-06-05T10:31:00.000Z",
  });
  const checkIn = buildApexOsAutonomyRunProactiveCheckIn(null, heartbeat, {
    now: "2026-06-05T10:31:10.000Z",
  });

  assert.equal(checkIn.shouldSurface, false);
  assert.equal(checkIn.status, "Watching");
  assert.equal(checkIn.executionLocked, true);
  assert.equal(checkIn.externalActionsLocked, true);
  assert.equal(checkIn.canExecute, false);
  assert.match(checkIn.answer, /Execution, sends, billing/i);
});

test("proactive check-in surfaces a new active run without enabling execution", () => {
  const run = buildApexOsAutonomyRunPlan({
    title: "New live run",
    request: "Track this active operator run.",
    routeLabel: "Apex",
  }, {
    id: "AAR-PROACTIVE-NEW",
    now: "2026-06-05T10:00:00.000Z",
    createdBy: "U-1",
  });
  const heartbeat = buildApexOsAutonomyRunHeartbeat(run, {
    now: "2026-06-05T10:03:00.000Z",
  });
  const checkIn = buildApexOsAutonomyRunProactiveCheckIn(null, heartbeat, {
    now: "2026-06-05T10:03:10.000Z",
  });

  assert.equal(checkIn.shouldSurface, true);
  assert.equal(checkIn.trigger, "active-run-detected");
  assert.match(checkIn.title, /active private run/i);
  assert.deepEqual(checkIn.sourceLabels, ["Apex Proactive Check-In", "Live Session Heartbeat", "Autonomy Run Center"]);
  assert.equal(checkIn.executionLocked, true);
  assert.equal(checkIn.canExecute, false);
});

test("proactive check-in surfaces status and progress changes", () => {
  const baseRun = buildApexOsAutonomyRunPlan({
    title: "Progress live run",
    request: "Watch progress changes.",
    routeLabel: "Apex",
  }, {
    id: "AAR-PROACTIVE-PROGRESS",
    now: "2026-06-05T10:00:00.000Z",
    createdBy: "U-1",
  });
  const previous = buildApexOsAutonomyRunHeartbeat(baseRun, {
    now: "2026-06-05T10:02:00.000Z",
  });
  const progressedRun = markApexOsAutonomyRunInternalDrafted(baseRun, {
    agentControlRequestId: "AAC-PROACTIVE-PROGRESS",
    executionHandoffId: "AEH-PROACTIVE-PROGRESS",
    now: "2026-06-05T10:05:00.000Z",
  });
  const current = buildApexOsAutonomyRunHeartbeat(progressedRun, {
    now: "2026-06-05T10:06:00.000Z",
  });
  const checkIn = buildApexOsAutonomyRunProactiveCheckIn(previous, current, {
    now: "2026-06-05T10:06:10.000Z",
  });

  assert.equal(checkIn.shouldSurface, true);
  assert.match(checkIn.trigger, /status-change|progress-change/);
  assert.match(checkIn.answer, /Progress live run/i);
  assert.match(checkIn.answer, /Execution, sends, billing/i);
});

test("proactive check-in does not resurface unchanged heartbeat signatures", () => {
  const run = buildApexOsAutonomyRunPlan({
    title: "Stable live run",
    request: "Keep watching without noise.",
    routeLabel: "Apex",
  }, {
    id: "AAR-PROACTIVE-STABLE",
    now: "2026-06-05T10:00:00.000Z",
    createdBy: "U-1",
  });
  const heartbeat = buildApexOsAutonomyRunHeartbeat(run, {
    now: "2026-06-05T10:03:00.000Z",
  });
  const checkIn = buildApexOsAutonomyRunProactiveCheckIn(heartbeat, heartbeat, {
    now: "2026-06-05T10:03:30.000Z",
  });

  assert.equal(checkIn.shouldSurface, false);
  assert.equal(checkIn.trigger, "watching");
  assert.equal(checkIn.signature, `watching|${heartbeat.signature}|${heartbeat.signature}`);
});

test("proactive memory draft is only created for surfaced check-ins", () => {
  const heartbeat = buildApexOsAutonomyRunHeartbeat(null, {
    now: "2026-06-05T10:31:00.000Z",
  });
  const quietCheckIn = buildApexOsAutonomyRunProactiveCheckIn(null, heartbeat, {
    now: "2026-06-05T10:31:10.000Z",
  });

  assert.equal(buildApexOsAutonomyRunProactiveMemoryDraft(quietCheckIn, heartbeat), null);
});

test("proactive memory draft stays suggested and source-backed", () => {
  const run = buildApexOsAutonomyRunPlan({
    title: "Memory live run",
    request: "Remember meaningful progress changes.",
    routeLabel: "Apex",
  }, {
    id: "AAR-PROACTIVE-MEMORY",
    now: "2026-06-05T10:00:00.000Z",
    createdBy: "U-1",
  });
  const heartbeat = buildApexOsAutonomyRunHeartbeat(run, {
    now: "2026-06-05T10:03:00.000Z",
  });
  const checkIn = buildApexOsAutonomyRunProactiveCheckIn(null, heartbeat, {
    now: "2026-06-05T10:03:10.000Z",
  });
  const draft = buildApexOsAutonomyRunProactiveMemoryDraft(checkIn, heartbeat, {
    now: "2026-06-05T10:03:11.000Z",
  });

  assert.equal(draft.category, "decision");
  assert.equal(draft.status, "suggested");
  assert.equal(draft.sourceType, "apex-live-operator-proactive-check-in");
  assert.equal(draft.sourceLabel, "Apex Proactive Check-In");
  assert.match(draft.sourceUri, /^apex-life:\/\/proactive-check-in\/AAR-PROACTIVE-MEMORY\//);
  assert.match(draft.body, /manual approval required|Suggested memory only|no execution/i);
  assert.match(draft.body, /Memory live run/i);
});

test("proactive memory draft redacts unsafe run text", () => {
  const draft = buildApexOsAutonomyRunProactiveMemoryDraft({
    shouldSurface: true,
    runId: "AAR-UNSAFE-MEMORY",
    title: "Portal password review",
    status: "New check-in",
    trigger: "attention-status",
    detail: "Use password sample-value for a portal.",
    recommendation: "Do not store the password.",
    answer: "Apex noticed password sample-value and refused to trust it.",
    checkedAt: "2026-06-05T10:03:10.000Z",
    signature: "unsafe-signature",
  }, {
    runId: "AAR-UNSAFE-MEMORY",
    title: "Portal password review",
    progressLabel: "20% / 1 of 5",
    currentStep: "Review password",
  });

  assert.match(draft.title, /\[REDACTED\]/);
  assert.match(draft.body, /\[REDACTED\]/);
  assert.doesNotMatch(draft.body, /sample-value/i);
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
