import assert from "node:assert/strict";
import test from "node:test";

import {
  canRenderAgentOsConsole,
  deriveAgentOsActionFilterGroups,
  deriveAgentOsConsoleSummary,
  deriveAgentOsExternalGateExecutionRows,
  deriveAgentOsExternalGateReadinessRows,
  deriveAgentOsInternalTaskOptions,
  deriveAgentOsLearningReviewRows,
  deriveAgentOsOperatorConsoleCards,
  deriveAgentOsProductionEvidenceRows,
  deriveAgentOsQueueIntentsForRecommendations,
  deriveAgentOsRunDetail,
  deriveAgentOsRunLedgerRows,
  filterAgentOsTaskOptions,
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
    opportunitySearchProfiles: [{ id: "OSP-1", name: "Daily public bid scan" }],
    estimates: [{ id: "EST-1", title: "Patio estimate" }],
    jobs: [{ id: "JOB-1", title: "Driveway pour" }],
    dailyReports: [{ id: "REPORT-1", title: "Monday report" }],
    uploads: [{ id: "UPLOAD-1", title: "Finish photo" }],
    deliveryTickets: [{ id: "TICKET-1", title: "Concrete load" }],
    safetyIncidents: [{ id: "INC-1", title: "Near miss" }],
    prePourChecklists: [{ id: "PRE-1", title: "Driveway pre-pour" }],
    postPourChecklists: [{ id: "POST-1", title: "Driveway post-pour" }],
    workflowRows: [
      { actionId: "opportunity_search_prep", modeId: "draft_only", modeLabel: "Draft only" },
      { actionId: "lead_follow_up_draft", modeId: "draft_only", modeLabel: "Draft only" },
      { actionId: "estimate_packet_draft", modeId: "approval_required", modeLabel: "Execute after approval" },
      { actionId: "job_costing_review", modeId: "locked", modeLabel: "Locked" },
    ],
  });

  const leadOption = options.find((option) => option.actionId === "lead_follow_up_draft");
  assert.equal(leadOption.disabled, false);
  assert.equal(leadOption.targets[0].id, "LEAD-1");
  assert.equal(leadOption.targets[0].entityType, "lead");

  const opportunityOption = options.find((option) => option.actionId === "opportunity_search_prep");
  assert.equal(opportunityOption.disabled, false);
  assert.equal(opportunityOption.targets[0].id, "OSP-1");
  assert.equal(opportunityOption.targets[0].entityType, "opportunitySearchProfile");
  assert.match(opportunityOption.helper, /No browsing, contact, lead creation, or bid submission/i);

  const estimateOption = options.find((option) => option.actionId === "estimate_packet_draft");
  assert.equal(estimateOption.disabled, false);
  assert.equal(estimateOption.modeLabel, "Execute after approval");

  const costingOption = options.find((option) => option.actionId === "job_costing_review");
  assert.equal(costingOption.disabled, true);
  assert.match(costingOption.disabledReason, /Locked|No visible/);

  const prePourOption = options.find((option) => option.actionId === "pre_pour_review");
  assert.equal(prePourOption.disabled, false);
  assert.equal(prePourOption.targets[0].entityType, "prePourChecklist");
  assert.match(prePourOption.helper, /No checklist completion/i);

  const safetyOption = options.find((option) => option.actionId === "safety_incident_summary");
  assert.equal(safetyOption.disabled, false);
  assert.equal(safetyOption.targets[0].id, "INC-1");
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

test("Agent OS UI derives operator console cards and rollback rows", () => {
  const consoleState = deriveAgentOsOperatorConsoleCards({
    operatorControlPanel: {
      status: "needs_operator_review",
      stats: {
        internalActionCount: 16,
        openRunCount: 2,
        deadLetterCount: 1,
        externalLockedCount: 7,
        learningSignalCount: 4,
      },
      controlRows: [{
        id: "dead_lettered",
        label: "Dead-lettered runs",
        count: 1,
        operatorAction: "Review failure and retry manually.",
        risk: "needs_operator_review",
      }],
      actionRollbackRows: [{
        actionId: "pre_pour_review",
        label: "Pre-pour review",
        moduleId: "prePour",
        auditEvent: "agent.os.internal.pre_pour_review.prepared",
        rollbackBehavior: "Discard the review packet; no checklist completion occurs.",
        idempotencyKeyFields: ["companyId", "actionId", "prePourChecklistId"],
      }],
      safetyBoundary: "Operator controls only.",
    },
  });

  assert.equal(consoleState.status, "needs_operator_review");
  assert.deepEqual(consoleState.cards.map((card) => card.id), ["internal-actions", "open-runs", "external-locks", "learning-signals"]);
  assert.equal(consoleState.cards.find((card) => card.id === "open-runs").tone, "red");
  assert.equal(consoleState.rollbackRows[0].idempotencyKeyFields.includes("prePourChecklistId"), true);
  assert.equal(consoleState.controlRows[0].count, 1);
});

test("Agent OS UI derives action filters and filtered task options", () => {
  const options = deriveAgentOsInternalTaskOptions({
    leads: [{ id: "LEAD-1", project: "Driveway" }],
    opportunitySearchProfiles: [{ id: "OSP-1", name: "Public bid scan" }],
    estimates: [{ id: "EST-1", title: "Patio estimate" }],
    jobs: [{ id: "JOB-1", title: "Driveway pour" }],
    safetyIncidents: [{ id: "INC-1", title: "Near miss" }],
    workflowRows: [{ actionId: "job_costing_review", modeId: "locked", modeLabel: "Locked" }],
  });

  const groups = deriveAgentOsActionFilterGroups(options);
  const all = groups.find((group) => group.id === "all");
  const leads = groups.find((group) => group.id === "lead_growth");
  const jobs = groups.find((group) => group.id === "jobs");

  assert.equal(all.count, options.length);
  assert.equal(leads.count, 2);
  assert.equal(leads.readyCount, 2);
  assert.equal(jobs.count, 6);
  assert.equal(jobs.blockedCount >= 1, true);
  assert.deepEqual(filterAgentOsTaskOptions(options, "safety").map((option) => option.actionId), ["safety_incident_summary"]);
  assert.deepEqual(filterAgentOsTaskOptions(options, "lead_growth").map((option) => option.actionId), ["opportunity_search_prep", "lead_follow_up_draft"]);
});

test("Agent OS UI derives run detail with rollback, idempotency, and controls", () => {
  const detail = deriveAgentOsRunDetail({
    runId: "RUN-1",
    taskId: "TASK-1",
    actionId: "lead_follow_up_draft",
    status: "failed",
    summary: "Could not prepare packet.",
    createdAt: "2026-05-27T09:00:00.000Z",
    attempt: 2,
    target: { entityType: "lead", entityId: "LEAD-1", title: "Driveway" },
    output: { mode: "agent_os_internal_draft_packet", blockedActions: ["No email send."], safetyBoundary: "Internal only." },
    logs: [{ level: "error", message: "Missing lead context" }],
  }, {
    operatorControlPanel: {
      actionRollbackRows: [{
        actionId: "lead_follow_up_draft",
        label: "Lead follow-up draft",
        moduleId: "leads",
        permissionGate: "leads.canEdit",
        packageGate: "growth.canUseLeads",
        auditEvent: "agent.os.internal.lead_follow_up_draft.prepared",
        rollbackBehavior: "Discard the draft packet; no customer contact occurs.",
        idempotencyKeyFields: ["companyId", "actionId", "leadId"],
      }],
    },
  });

  assert.equal(detail.tone, "red");
  assert.equal(detail.canExecute, true);
  assert.equal(detail.canRetry, true);
  assert.equal(detail.canDeadLetter, true);
  assert.equal(detail.canCancel, true);
  assert.equal(detail.target.entityId, "LEAD-1");
  assert.equal(detail.output.blockedActions[0], "No email send.");
  assert.equal(detail.logs[0].message, "Missing lead context");
  assert.equal(detail.rollbackBehavior, "Discard the draft packet; no customer contact occurs.");
  assert.deepEqual(detail.idempotencyKeyFields, ["companyId", "actionId", "leadId"]);
  assert.equal(detail.auditEvent, "agent.os.internal.lead_follow_up_draft.prepared");
});

test("Agent OS UI derives learning review rows with redaction and company scope", () => {
  const rows = deriveAgentOsLearningReviewRows({
    operatorControlPanel: {
      learningRows: [
        { id: "accepted_edit", label: "Accepted edit", count: 3, latestAt: "2026-05-27T09:00:00.000Z", redaction: "Redacted customer details.", companyScoped: true },
        { id: "bad_scope", label: "Bad scope", count: 1, redaction: "Needs review.", companyScoped: false },
        { id: "empty", label: "Empty", count: 0 },
      ],
    },
  });

  assert.equal(rows.length, 2);
  assert.equal(rows[0].reviewState, "company scoped");
  assert.equal(rows[0].redaction, "Redacted customer details.");
  assert.equal(rows[1].tone, "red");
  assert.equal(rows[1].reviewState, "scope review required");
});

test("Agent OS UI derives production evidence rows and blockers", () => {
  const rows = deriveAgentOsProductionEvidenceRows({
    status: "blocked_until_release_evidence",
    blockers: ["Production readiness evidence has not been recorded."],
    checkRows: [
      { id: "verify_leads", label: "npm.cmd run verify:leads", group: "release_baseline", status: "passed" },
      { id: "verify_auth", label: "npm.cmd run verify:auth", group: "release_baseline", status: "missing_evidence" },
    ],
  });

  assert.equal(rows[0].id, "blocker-1");
  assert.equal(rows[0].tone, "red");
  assert.equal(rows[1].tone, "green");
  assert.equal(rows[2].tone, "amber");
  assert.match(rows[2].nextStep, /Evidence required/i);
});

test("Agent OS UI derives external gate readiness rows without execution affordances", () => {
  const rows = deriveAgentOsExternalGateReadinessRows({
    externalGateReadinessDeck: {
      rows: [
        {
          gateId: "sms_send",
          label: "SMS send",
          status: "blocked_locked",
          blockerCount: 2,
          evidenceCount: 3,
          missingEvidenceIds: ["optOutReviewed"],
          blockedActions: ["No SMS send", "No provider request"],
          preflightEndpoint: "POST /api/agent/os/external-gates/sms_send/readiness",
          safetyBoundary: "Locked SMS send readiness only.",
        },
        {
          gateId: "scheduling",
          label: "Scheduling mutation",
          status: "ready_for_human_confirmed_schedule_review_locked",
          blockerCount: 0,
          evidenceCount: 1,
          blockedActions: ["No schedule mutation"],
          preflightEndpoint: "POST /api/agent/os/external-gates/scheduling/readiness",
        },
      ],
      safetyBoundary: "External gate readiness deck is review-only.",
    },
  });

  assert.equal(rows.length, 2);
  assert.equal(rows[0].gateId, "sms_send");
  assert.equal(rows[0].tone, "red");
  assert.equal(rows[0].statusLabel, "blocked locked");
  assert.equal(rows[0].blockedActions[0], "No SMS send");
  assert.equal(rows[0].missingEvidenceIds[0], "optOutReviewed");
  assert.match(rows[0].preflightEndpoint, /sms_send\/readiness/);
  assert.equal(rows[1].tone, "green");
  assert.match(rows[1].safetyBoundary, /review-only|External gate remains locked|Locked/i);
});

test("Agent OS UI derives external gate execution rows as locked contracts", () => {
  const rows = deriveAgentOsExternalGateExecutionRows({
    externalGateExecutionDeck: {
      rows: [
        {
          gateId: "payment_collection",
          label: "Payment collection",
          status: "prepared_locked",
          blockerCount: 2,
          contractRoute: "POST /api/agent/os/external-gates/payment_collection/execution-contract",
          executionRoute: "POST /api/agent/os/external-gates/payment_collection/execute",
          canExecute: false,
          configuredExecutionEnabled: false,
          futureAdapterBlockers: ["Provider adapter is incomplete."],
          blockedActions: ["No charge", "No payment link send"],
          safetyBoundary: "Locked payment collection execution contract only.",
        },
      ],
    },
  });

  assert.equal(rows.length, 1);
  assert.equal(rows[0].gateId, "payment_collection");
  assert.equal(rows[0].tone, "amber");
  assert.equal(rows[0].canExecute, false);
  assert.match(rows[0].contractRoute, /execution-contract/);
  assert.match(rows[0].executionRoute, /execute/);
  assert.equal(rows[0].blockedActions[0], "No charge");
  assert.match(rows[0].futureAdapterBlockers[0], /adapter/i);
});

test("Agent OS UI derives console summary counts and operator checklist rows", () => {
  const summary = deriveAgentOsConsoleSummary({
    taskOptions: [
      { actionId: "lead_follow_up_draft", disabled: false },
      { actionId: "job_costing_review", disabled: true },
    ],
    runRows: [
      { runId: "RUN-1", status: "succeeded" },
      { runId: "RUN-2", status: "dead_lettered" },
    ],
    consoleCards: {
      cards: [{ id: "external-locks", value: 7 }],
    },
    productionEvidenceRows: [
      { id: "verify", tone: "green", status: "passed" },
      { id: "blocker", tone: "red", status: "blocked" },
    ],
  });

  assert.equal(summary.totalActionCount, 2);
  assert.equal(summary.readyActionCount, 1);
  assert.equal(summary.blockedActionCount, 1);
  assert.equal(summary.recentRunCount, 2);
  assert.equal(summary.deadLetterCount, 1);
  assert.equal(summary.runTone, "red");
  assert.equal(summary.externalLockCount, 7);
  assert.equal(summary.productionEvidenceCount, 2);
  assert.deepEqual(summary.checklistRows.map((row) => row.id), ["queue-ready", "run-review", "external-locks", "production-evidence"]);
  assert.match(summary.checklistRows.find((row) => row.id === "run-review").detail, /dead-lettered/i);
  assert.equal(summary.checklistRows.find((row) => row.id === "production-evidence").tone, "red");
});

test("Agent OS console render gate requires AI Office view permission", () => {
  assert.equal(canRenderAgentOsConsole({ aiOffice: { canView: true } }), true);
  assert.equal(canRenderAgentOsConsole({ aiOffice: { canView: false } }), false);
  assert.equal(canRenderAgentOsConsole({ fieldOps: { canView: true }, leads: { canView: true } }), false);
  assert.equal(canRenderAgentOsConsole({}), false);
});
