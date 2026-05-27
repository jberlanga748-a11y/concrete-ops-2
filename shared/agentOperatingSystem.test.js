import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAgentOsInternalDraftPacket,
  buildAgentOsSummary,
  createAgentOsRunForTask,
  deriveAgentOsAutonomyPlan,
  deriveAgentOsLearningSignals,
  deriveAgentOsLedgerFromAuditEvents,
  deriveAgentOsTaskPayloadFromAdvisorRecommendation,
  getAgentOsExternalGateApprovalPlan,
  getAgentOsAction,
  listAgentOsAdvisorTaskMappings,
  listAgentOsActionRegistry,
  listAgentOsExternalGates,
  listAgentOsExternalGateApprovalPlans,
  normalizeAgentOsTask,
  normalizeAgentOsWorkflowSettings,
  transitionAgentOsRun,
} from "./agentOperatingSystem.js";

test("Agent OS registry defines safe internal actions and locked external gates", () => {
  const registry = listAgentOsActionRegistry();
  const actionIds = registry.map((action) => action.actionId);
  const leadDraft = getAgentOsAction("lead_follow_up_draft");
  const payment = getAgentOsAction("payment_collection");

  assert.ok(actionIds.includes("lead_follow_up_draft"));
  assert.ok(actionIds.includes("estimate_packet_draft"));
  assert.ok(actionIds.includes("change_order_draft"));
  assert.ok(actionIds.includes("invoice_payment_prep"));
  assert.ok(actionIds.includes("material_list_prep"));
  assert.ok(actionIds.includes("job_costing_review"));
  assert.equal(leadDraft.externalGate, null);
  assert.equal(leadDraft.auditEvent, "agent.os.internal.lead_follow_up_draft.prepared");
  assert.equal(payment.externalGate, "payment_collection");
  assert.match(payment.requiredInputs.join(" "), /approvedPaymentBoundary/);
  assert.equal(listAgentOsExternalGates().every((gate) => gate.status === "locked"), true);
});

test("Agent OS maps selected contractor advisor recommendations into visible safe internal task payloads", () => {
  const leadPayload = deriveAgentOsTaskPayloadFromAdvisorRecommendation({
    recommendation: {
      id: "marketing-lead-sources",
      label: "Rank lead sources by jobs won",
      moduleId: "leads",
    },
    target: { entityType: "lead", entityId: "LEAD-1" },
  }, {
    workspace: { leads: [{ id: "LEAD-1", project: "Driveway lead" }] },
  });
  const estimatePayload = deriveAgentOsTaskPayloadFromAdvisorRecommendation({
    recommendation: { id: "estimate-draft-queue", label: "Turn drafts into packets" },
    target: { entityType: "estimate", entityId: "EST-1" },
  }, {
    workspace: { estimates: [{ id: "EST-1", title: "Patio estimate" }] },
  });
  const jobPayload = deriveAgentOsTaskPayloadFromAdvisorRecommendation({
    recommendation: { id: "money-time", label: "Check time leakage" },
    target: { entityType: "job", entityId: "JOB-1" },
  }, {
    workspace: { jobs: [{ id: "JOB-1", title: "Stamped patio" }] },
  });

  assert.equal(leadPayload.ok, true);
  assert.equal(leadPayload.taskPayload.actionId, "lead_follow_up_draft");
  assert.equal(leadPayload.taskPayload.leadId, "LEAD-1");
  assert.match(leadPayload.source.safetyBoundary, /internal Agent OS draft\/prep/i);
  assert.equal(estimatePayload.taskPayload.actionId, "estimate_packet_draft");
  assert.equal(estimatePayload.taskPayload.estimateId, "EST-1");
  assert.equal(jobPayload.taskPayload.actionId, "job_costing_review");
  assert.equal(jobPayload.taskPayload.jobId, "JOB-1");
  assert.ok(listAgentOsAdvisorTaskMappings().some((mapping) => mapping.recommendationId === "money-proof"));
});

test("Agent OS advisor queue mapping fails closed for unsupported recommendations and invisible targets", () => {
  const unsupported = deriveAgentOsTaskPayloadFromAdvisorRecommendation({
    recommendation: { id: "unknown-action", label: "Do something" },
    target: { entityType: "lead", entityId: "LEAD-1" },
  }, {
    workspace: { leads: [{ id: "LEAD-1" }] },
  });
  const wrongTarget = deriveAgentOsTaskPayloadFromAdvisorRecommendation({
    recommendation: { id: "marketing-lead-sources", label: "Follow up lead" },
    target: { entityType: "job", entityId: "JOB-1" },
  }, {
    workspace: { jobs: [{ id: "JOB-1" }] },
  });
  const invisible = deriveAgentOsTaskPayloadFromAdvisorRecommendation({
    recommendation: { id: "marketing-lead-sources", label: "Follow up lead" },
    target: { entityType: "lead", entityId: "LEAD-404" },
  }, {
    workspace: { leads: [{ id: "LEAD-1" }] },
  });

  assert.equal(unsupported.ok, false);
  assert.match(unsupported.error, /cannot queue/i);
  assert.equal(wrongTarget.ok, false);
  assert.match(wrongTarget.error, /visible lead/i);
  assert.equal(invisible.ok, false);
  assert.match(invisible.error, /visible, company-scoped/i);
});

test("Agent OS workflow settings normalize per-workflow autonomy without opening external gates", () => {
  const settings = normalizeAgentOsWorkflowSettings({
    leadFollowUpDraft: "approval-required",
    emailSend: "approval_required",
    paymentCollection: "draft_only",
    unknown: "ignored",
  });
  const plan = deriveAgentOsAutonomyPlan(settings);

  assert.equal(settings.leadFollowUpDraft, "approval_required");
  assert.equal(settings.emailSend, "approval_required");
  assert.equal(settings.paymentCollection, "draft_only");
  assert.equal(plan.rows.find((row) => row.workflowId === "emailSend").externalLocked, true);
  assert.equal(plan.rows.find((row) => row.workflowId === "emailSend").modeId, "locked");
  assert.equal(plan.rows.find((row) => row.workflowId === "leadFollowUpDraft").externalLocked, false);
  assert.equal(plan.rows.find((row) => row.workflowId === "leadFollowUpDraft").externalActionsLocked, true);
  assert.equal(plan.rows.find((row) => row.workflowId === "leadFollowUpDraft").mayExecuteInternal, true);
  assert.match(plan.safetyBoundary, /External\/customer-contact gates stay locked/i);
});

test("Agent OS task and run models include retries, cancellation, dead-letter, and log shape", () => {
  const normalized = normalizeAgentOsTask({
    actionId: "lead_follow_up_draft",
    target: { entityType: "lead", entityId: "LEAD-1", title: "Patio lead" },
    followUpGoal: "Confirm site walk",
  }, {
    id: "TASK-1",
    companyId: "COMPANY-1",
    actorUserId: "USER-1",
    now: "2026-05-27T08:00:00.000Z",
  });
  assert.equal(normalized.ok, true);
  assert.equal(normalized.task.status, "queued");
  assert.equal(normalized.task.maxAttempts, 2);
  assert.equal(normalized.task.cancellation.killSwitch, "company_policy_or_user_cancel");
  assert.equal(normalized.task.inputs.leadId, "LEAD-1");
  assert.match(normalized.task.inputs.followUpGoal, /Confirm site walk/);
  assert.match(normalized.task.idempotencyKey, /company-1:lead_follow_up_draft/i);

  const queuedRun = createAgentOsRunForTask(normalized.task, {
    id: "RUN-1",
    now: "2026-05-27T08:00:00.000Z",
  });
  const running = transitionAgentOsRun(queuedRun, "running", {
    now: "2026-05-27T08:01:00.000Z",
  });
  const retrying = transitionAgentOsRun(running, "retrying", {
    now: "2026-05-27T08:02:00.000Z",
  });
  const dead = transitionAgentOsRun(retrying, "dead_lettered", {
    message: "Max attempts reached",
    now: "2026-05-27T08:03:00.000Z",
  });

  assert.equal(running.startedAt, "2026-05-27T08:01:00.000Z");
  assert.equal(retrying.status, "retrying");
  assert.ok(retrying.nextRetryAt);
  assert.equal(dead.status, "dead_lettered");
  assert.equal(dead.deadLetteredAt, "2026-05-27T08:03:00.000Z");
  assert.match(dead.logs.at(-1).message, /Max attempts/);
});

test("Agent OS learning signals cover accepted edits, rejected drafts, estimates, closeouts, follow-ups, and preferences", () => {
  const signals = deriveAgentOsLearningSignals({
    estimates: [
      { id: "EST-WON", status: "approved", updatedAt: "2026-05-27T08:00:00.000Z" },
      { id: "EST-LOST", status: "lost", updatedAt: "2026-05-27T08:01:00.000Z" },
    ],
    jobs: [{ id: "JOB-1", status: "billing_ready", updatedAt: "2026-05-27T08:02:00.000Z" }],
    contactHistory: [{ id: "CONTACT-1", outcome: "Follow-up scheduled", createdAt: "2026-05-27T08:03:00.000Z" }],
    agentLearningPreferences: [{ id: "PREF-1", title: "Proof photos", status: "approved" }],
    auditEvents: [
      { action: "agent.proposal.draft_created", createdAt: "2026-05-27T08:04:00.000Z" },
      { action: "agent.proposal.rejected", createdAt: "2026-05-27T08:05:00.000Z" },
    ],
  });

  assert.equal(signals.activeSignalCount, 7);
  assert.equal(signals.rows.every((row) => row.companyScoped), true);
  assert.equal(signals.rows.find((row) => row.id === "won_estimate").count, 1);
  assert.equal(signals.rows.find((row) => row.id === "rejected_draft").count, 1);
  assert.match(signals.safetyBoundary, /review-first/i);
});

test("Agent OS summary derives durable ledger rows from audit events", () => {
  const auditEvents = [{
    id: "AUDIT-1",
    companyId: "COMPANY-1",
    entityType: "agentOsRun",
    action: "agent.os.task.queued",
    summary: "Queued",
    createdAt: "2026-05-27T08:00:00.000Z",
    detail: JSON.stringify({
      task: { id: "TASK-1", actionId: "lead_follow_up_draft", status: "queued" },
      run: { id: "RUN-1", actionId: "lead_follow_up_draft", status: "queued" },
    }),
  }];
  const ledger = deriveAgentOsLedgerFromAuditEvents(auditEvents);
  const summary = buildAgentOsSummary({ auditEvents });

  assert.equal(ledger.rows.length, 1);
  assert.equal(ledger.queuedCount, 1);
  assert.equal(summary.version, "apex-agent-os-v1");
  assert.equal(summary.ledger.rows[0].runId, "RUN-1");
  assert.match(summary.safetyBoundary, /External sends/);
});

test("Agent OS builds executable internal draft packets while keeping external gate approval plans locked", () => {
  const normalized = normalizeAgentOsTask({
    actionId: "change_order_draft",
    target: { entityType: "job", entityId: "JOB-1", title: "Driveway pour" },
  }, {
    id: "TASK-CHANGE",
    companyId: "COMPANY-1",
    actorUserId: "USER-1",
    now: "2026-05-27T08:00:00.000Z",
  });
  const packet = buildAgentOsInternalDraftPacket(normalized.task, {
    workspace: { jobs: [{ id: "JOB-1", title: "Driveway pour" }] },
    now: "2026-05-27T08:01:00.000Z",
  });
  const plans = listAgentOsExternalGateApprovalPlans();

  assert.equal(packet.ok, true);
  assert.equal(packet.agentProposal.proposalType, "change-order-review");
  assert.match(packet.agentProposal.blockedReasons.join(" "), /No customer email/i);
  assert.match(packet.agentProposal.draftPrepSummary[0].fieldPreview[1].currentValue, /No pricing/);
  assert.equal(plans.length, listAgentOsExternalGates().length);
  assert.equal(plans.every((plan) => plan.status === "locked" && plan.blockedUntilExplicitApproval), true);
  assert.match(getAgentOsExternalGateApprovalPlan("payment_collection").approvalBoundary, /sandbox payment/i);
});
