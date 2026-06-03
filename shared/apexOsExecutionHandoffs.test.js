import assert from "node:assert/strict";
import test from "node:test";

import {
  buildApexOsExecutionContract,
  getApexOsExecutionHandoffMissingFields,
  isApexOsExecutionHandoffReady,
  normalizeApexOsExecutionHandoff,
  normalizeApexOsExecutionHandoffs,
  summarizeApexOsExecutionHandoffs,
} from "./apexOsExecutionHandoffs.js";

test("normalizes execution handoffs without approval, queue, run, or execute states", () => {
  const handoff = normalizeApexOsExecutionHandoff({
    id: "AEH-1",
    title: "Build Apex OS handoff",
    agentRole: "build",
    workType: "local-code-plan",
    status: "queued",
    objective: "Prepare a local code plan for Apex OS Slice 18.",
    sourceEvidence: "Apex OS master plan and living finish plan.",
    allowedActions: "Read files, draft code, run local tests.",
    blockedActions: "No deploy, sends, spend, provider setup, production mutation, or customer-visible changes.",
    validationPlan: "Run focused unit tests, build, role checks, and browser QA.",
    rollbackPlan: "Revert the branch commit.",
    handoffPrompt: "Act as Apex feature builder and prepare the local-only handoff slice.",
    sourceLabel: "docs/APEX_HQ_LIVING_FINISH_PLAN.md",
  });

  assert.equal(handoff.status, "draft");
  assert.equal(handoff.agentRole, "build");
  assert.equal(handoff.workType, "local-code-plan");
  assert.equal(handoff.blockedReasons.length, 1);
  assert.equal(isApexOsExecutionHandoffReady(handoff), false);
  assert.equal(buildApexOsExecutionContract(handoff).canRun, false);
});

test("summarizes only valid durable execution handoffs", () => {
  const handoffs = normalizeApexOsExecutionHandoffs([
    {
      id: "AEH-1",
      title: "Ready handoff",
      status: "ready",
      objective: "Prepare QA evidence.",
      sourceLabel: "QA plan",
      sourceEvidence: "Focused tests and browser QA notes.",
      allowedActions: "Run local tests.",
      blockedActions: "No production mutation.",
      validationPlan: "Record test results.",
      rollbackPlan: "Revert local changes.",
      handoffPrompt: "Run the QA checklist.",
    },
    { id: "AEH-2", title: "", objective: "Missing title" },
    {
      id: "AEH-3",
      title: "Archived handoff",
      objective: "Old local package.",
      status: "archived",
    },
  ]);

  assert.equal(handoffs.length, 2);
  assert.deepEqual(summarizeApexOsExecutionHandoffs(handoffs), {
    total: 2,
    draft: 0,
    ready: 1,
    blocked: 0,
    archived: 1,
    planned: 2,
    inProgress: 0,
    validating: 0,
    finished: 0,
  });
});

test("flags missing readiness fields and unsafe handoff text", () => {
  const handoff = normalizeApexOsExecutionHandoff({
    id: "AEH-UNSAFE",
    title: "Unsafe handoff",
    objective: "Use API key sk-test-123456789abc for provider setup.",
    sourceLabel: "Manual note",
  });

  assert.deepEqual(getApexOsExecutionHandoffMissingFields(handoff), [
    "Source evidence",
    "Allowed actions",
    "Blocked actions",
    "Validation plan",
    "Rollback plan",
    "Handoff prompt",
  ]);
  assert.equal(isApexOsExecutionHandoffReady(handoff), false);
  assert.equal(handoff.blockedReasons.length, 1);
  assert.match(handoff.objective, /\[REDACTED\]/);
});

test("requires approval packet links for risky allowed actions", () => {
  const handoff = normalizeApexOsExecutionHandoff({
    id: "AEH-RISKY",
    title: "Risky allowed action",
    objective: "Prepare a production action.",
    sourceEvidence: "Release plan.",
    allowedActions: "Deploy production.",
    blockedActions: "No customer sends.",
    validationPlan: "Run release checks.",
    rollbackPlan: "Rollback to previous release.",
    handoffPrompt: "Prepare release.",
    sourceLabel: "Release Desk",
  });

  assert.equal(isApexOsExecutionHandoffReady(handoff), false);
  assert.match(handoff.blockedReasons[0], /requires a linked approval packet/i);
});

test("captures finished workstream results and decision memory draft intent", () => {
  const handoff = normalizeApexOsExecutionHandoff({
    id: "AEH-FINISHED",
    title: "Finished Phase 14 package",
    objective: "Finish a local private Apex OS package.",
    sourceEvidence: "Apex OS master plan.",
    allowedActions: "Read files, edit docs, run local tests.",
    blockedActions: "No deploy, sends, spend, provider setup, production mutation, customer-visible changes, deletion, or irreversible actions.",
    validationPlan: "Run focused tests and browser QA.",
    validationResults: "Focused tests passed.",
    rollbackPlan: "Revert the branch commit.",
    resultReport: "Phase 14 local package finished.",
    decisionMemoryUpdate: "Apex OS Phase 14 should keep execution handoffs gated and memory suggested until approved.",
    handoffPrompt: "Report final results.",
    sourceLabel: "Apex OS plan",
    sourceChatRequestId: "REQ-42",
    sourceQuestion: "What should Apex do next?",
    workstreamStatus: "finished",
    status: "ready",
  });
  const contract = buildApexOsExecutionContract(handoff);

  assert.equal(isApexOsExecutionHandoffReady(handoff), true);
  assert.equal(contract.workstreamStatus, "finished");
  assert.equal(contract.decisionMemoryDraftReady, true);
  assert.equal(contract.executionLocked, true);
  assert.equal(contract.canExecute, false);
});
