import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveAgentOsInternalTaskOptions,
  deriveAgentOsQueueIntentsForRecommendations,
  deriveAgentOsRunLedgerRows,
} from "./agent-os-ui-utils.js";

test("Agent OS UI ledger rows are derived from audit-backed run events", () => {
  const rows = deriveAgentOsRunLedgerRows([
    {
      id: "AUDIT-1",
      entityType: "agentOsRun",
      entityId: "RUN-1",
      action: "agent.os.task.queued",
      summary: "Queued lead follow-up draft",
      createdAt: "2026-05-27T09:00:00.000Z",
      detail: JSON.stringify({
        actionId: "lead_follow_up_draft",
        status: "queued",
        task: {
          id: "TASK-1",
          actionId: "lead_follow_up_draft",
          status: "queued",
          target: { entityType: "lead", entityId: "LEAD-1", title: "Driveway" },
        },
        run: {
          id: "RUN-1",
          taskId: "TASK-1",
          actionId: "lead_follow_up_draft",
          status: "queued",
          output: {
            mode: "agent_os_internal_draft_packet",
            safetyBoundary: "Internal review packet only.",
            blockedActions: ["No customer email."],
          },
          logs: [{ level: "info", message: "Queued" }],
        },
      }),
    },
    {
      id: "AUDIT-2",
      entityType: "lead",
      action: "updated",
      summary: "Unrelated",
      detail: "not json",
    },
  ]);

  assert.equal(rows.length, 1);
  assert.equal(rows[0].runId, "RUN-1");
  assert.equal(rows[0].taskId, "TASK-1");
  assert.equal(rows[0].actionId, "lead_follow_up_draft");
  assert.equal(rows[0].actionLabel, "lead follow up draft");
  assert.equal(rows[0].status, "queued");
  assert.equal(rows[0].logCount, 1);
  assert.equal(rows[0].target.entityId, "LEAD-1");
  assert.equal(rows[0].output.blockedActions[0], "No customer email.");
  assert.equal(rows[0].logs[0].message, "Queued");
  assert.equal(rows[0].canExecute, true);
  assert.equal(rows[0].canCancel, true);
  assert.equal(rows[0].canRetry, false);
  assert.equal(rows[0].canDeadLetter, true);
});

test("Agent OS UI derives safe internal task options from visible records and workflow policy", () => {
  const options = deriveAgentOsInternalTaskOptions({
    leads: [{ id: "LEAD-1", project: "Driveway" }],
    estimates: [{ id: "EST-1", title: "Patio estimate" }],
    jobs: [],
    workflowRows: [
      { actionId: "lead_follow_up_draft", modeId: "draft_only", modeLabel: "Draft only" },
      { actionId: "estimate_packet_draft", modeId: "approval_required", modeLabel: "Execute after approval" },
      { actionId: "job_costing_review", modeId: "locked", modeLabel: "Locked" },
    ],
  });

  const leadOption = options.find((option) => option.actionId === "lead_follow_up_draft");
  assert.equal(leadOption.disabled, false);
  assert.equal(leadOption.targets[0].id, "LEAD-1");
  assert.equal(leadOption.targets[0].entityType, "lead");

  const estimateOption = options.find((option) => option.actionId === "estimate_packet_draft");
  assert.equal(estimateOption.disabled, false);
  assert.equal(estimateOption.modeLabel, "Execute after approval");

  const costingOption = options.find((option) => option.actionId === "job_costing_review");
  assert.equal(costingOption.disabled, true);
  assert.match(costingOption.disabledReason, /Locked|No visible/);
});

test("Agent OS UI derives queue intents from visible recommendations", () => {
  const taskOptions = deriveAgentOsInternalTaskOptions({
    leads: [{ id: "LEAD-1", project: "Driveway" }],
    estimates: [{ id: "EST-1", title: "Patio estimate" }],
    jobs: [{ id: "JOB-1", title: "Stamped patio" }],
  });

  const intents = deriveAgentOsQueueIntentsForRecommendations([
    { id: "rec-1", recordType: "lead", title: "Follow up Driveway", record: { id: "LEAD-1" } },
    { id: "rec-2", recordType: "estimate", actionMode: "packet", title: "Review Patio estimate", record: { id: "EST-1" } },
    { id: "rec-3", recordType: "job", title: "Review costing", record: { id: "JOB-1" } },
    { id: "rec-4", recordType: "lead", title: "Missing target", record: { id: "LEAD-404" } },
  ], taskOptions);

  assert.deepEqual(intents.map((intent) => intent.actionId), [
    "lead_follow_up_draft",
    "estimate_packet_draft",
    "job_costing_review",
  ]);
  assert.equal(intents[0].target.entityType, "lead");
  assert.match(intents[1].label, /Estimate packet/i);
});
