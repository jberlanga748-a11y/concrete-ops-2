import assert from "node:assert/strict";
import test from "node:test";

import {
  buildApexOsAgentControlPlane,
  detectApexOsAgentControlSafetyIssues,
  getApexOsAgentControlRequestMissingFields,
  isApexOsAgentControlRequestReady,
  normalizeApexOsAgentControlRequest,
  normalizeApexOsAgentControlRequests,
  summarizeApexOsAgentControlRequests,
} from "./apexOsAgentControl.js";

test("normalizes Apex OS agent control requests and blocks execution statuses", () => {
  const request = normalizeApexOsAgentControlRequest({
    id: "AAC-1",
    title: "Pause release work",
    requestType: "pause",
    agentRole: "release",
    objective: "Pause production release work until QA evidence is ready.",
    scope: "Apex OS release work only.",
    validationPlan: "Confirm QA evidence before resuming.",
    rollbackPlan: "Close the pause request.",
    sourceLabel: "Phase 7 audit",
    status: "requested",
  }, { now: "2026-06-03T12:00:00.000Z", requestedBy: "U-1" });

  assert.equal(request.agentRole, "release");
  assert.equal(request.requestType, "pause");
  assert.equal(request.requestedBy, "U-1");
  assert.equal(request.blockedReasons.length, 0);
  assert.equal(isApexOsAgentControlRequestReady(request), true);

  const unsafe = normalizeApexOsAgentControlRequest({
    id: "AAC-2",
    title: "Run now",
    objective: "Queue the agent with API key sk-test-123456789abc.",
    sourceLabel: "Unsafe",
    status: "queued",
  });

  assert.equal(unsafe.status, "requested");
  assert.equal(unsafe.blockedReasons.some((reason) => reason.includes("approval, queueing, running, and execution")), true);
  assert.equal(unsafe.blockedReasons.some((reason) => reason.includes("passwords, tokens")), true);
  assert.equal(detectApexOsAgentControlSafetyIssues("email test@example.com").some((reason) => reason.includes("customer email")), true);
});

test("summarizes durable pause resume and scoped-run requests", () => {
  const requests = normalizeApexOsAgentControlRequests([
    {
      id: "AAC-1",
      title: "Pause QA",
      requestType: "pause",
      agentRole: "qa",
      objective: "Pause QA while fixtures are updated.",
      sourceLabel: "QA plan",
      status: "requested",
    },
    {
      id: "AAC-2",
      title: "Resume QA",
      requestType: "resume",
      agentRole: "qa",
      objective: "Resume QA after fixtures are updated.",
      sourceLabel: "QA plan",
      status: "ready",
    },
    {
      id: "AAC-3",
      title: "Build Phase 7",
      requestType: "scoped-run",
      agentRole: "build",
      objective: "Build the Phase 7 local UI and tests.",
      sourceLabel: "Master plan",
      status: "blocked",
    },
  ]);

  const summary = summarizeApexOsAgentControlRequests(requests);
  assert.equal(summary.total, 3);
  assert.equal(summary.pause, 1);
  assert.equal(summary.resume, 1);
  assert.equal(summary.scopedRun, 1);
  assert.equal(summary.ready, 1);
  assert.equal(summary.blocked, 1);
  assert.equal(summary.active, 3);
});

test("builds the Phase 7 agent roster with status current task next action reports and handoffs", () => {
  const controlPlane = buildApexOsAgentControlPlane({
    agentRunRows: [
      {
        runId: "RUN-QA-1",
        agentRole: "qa",
        actionLabel: "QA sweep",
        status: "running",
        summary: "Focused QA is running.",
        createdAt: "2026-06-03T11:00:00.000Z",
      },
    ],
    executionHandoffs: [
      {
        id: "AEH-1",
        agentRole: "release",
        title: "Production release handoff",
        objective: "Prepare deployment after approval.",
        status: "ready",
        sourceLabel: "Release Desk",
        updatedAt: "2026-06-03T10:00:00.000Z",
      },
    ],
    agentControlRequests: [
      {
        id: "AAC-1",
        title: "Pause marketing",
        requestType: "pause",
        agentRole: "marketing",
        objective: "Pause launch content work.",
        scope: "Apex OS launch content only.",
        validationPlan: "Confirm content scope.",
        rollbackPlan: "Resume request.",
        sourceLabel: "Operator",
        status: "requested",
        updatedAt: "2026-06-03T12:00:00.000Z",
      },
      {
        id: "AAC-2",
        title: "Build blocked",
        requestType: "scoped-run",
        agentRole: "build",
        objective: "Build with missing source.",
        scope: "Local work only.",
        validationPlan: "Run tests.",
        rollbackPlan: "Revert commit.",
        sourceLabel: "Operator",
        status: "blocked",
      },
    ],
  });

  assert.equal(controlPlane.roleCount, 7);
  assert.equal(controlPlane.status, "Control plane active");
  assert.equal(controlPlane.rosterRows.find((row) => row.id === "qa").status, "running");
  assert.equal(controlPlane.rosterRows.find((row) => row.id === "release").status, "needs approval");
  assert.equal(controlPlane.rosterRows.find((row) => row.id === "marketing").status, "paused");
  assert.equal(controlPlane.rosterRows.find((row) => row.id === "build").status, "blocked");
  assert.equal(controlPlane.reportRows.length >= 2, true);
  assert.equal(controlPlane.handoffRows[0].title, "Production release handoff");
  assert.equal(controlPlane.safetyRows.some((row) => row.id === "external-action-gates"), true);
});

test("requires complete ready fields before ready review", () => {
  const request = normalizeApexOsAgentControlRequest({
    id: "AAC-READY",
    title: "Incomplete ready",
    objective: "Run the scoped task.",
    sourceLabel: "Operator",
    status: "ready",
  });

  assert.equal(isApexOsAgentControlRequestReady(request), false);
  assert.deepEqual(getApexOsAgentControlRequestMissingFields(request), ["Scope", "Validation plan", "Rollback plan"]);
});
