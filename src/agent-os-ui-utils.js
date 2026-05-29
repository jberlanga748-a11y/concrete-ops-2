import { normalizeObjectArray } from "./app-state-utils.js";

export const AGENT_OS_INTERNAL_DRAFT_ACTIONS = Object.freeze([
  {
    actionId: "opportunity_search_prep",
    label: "Opportunity search prep",
    helper: "Prepare today's public/private source checklist. No browsing, contact, lead creation, or bid submission.",
    targetEntityType: "opportunitySearchProfile",
    targetCollection: "opportunitySearchProfiles",
  },
  {
    actionId: "lead_follow_up_draft",
    label: "Lead follow-up draft",
    helper: "Prepare follow-up talking points. No email, SMS, call, note, or status change.",
    targetEntityType: "lead",
    targetCollection: "leads",
  },
  {
    actionId: "estimate_packet_draft",
    label: "Estimate packet draft",
    helper: "Prepare an estimate send-review packet. No send, print, or mark-sent.",
    targetEntityType: "estimate",
    targetCollection: "estimates",
  },
  {
    actionId: "change_order_draft",
    label: "Change order draft",
    helper: "Prepare scope-change review notes. No pricing, approval, billing, or customer send.",
    targetEntityType: "job",
    targetCollection: "jobs",
  },
  {
    actionId: "invoice_payment_prep",
    label: "Invoice/payment prep",
    helper: "Prepare billing readiness. No invoice, payment link, charge, or mark-paid.",
    targetEntityType: "job",
    targetCollection: "jobs",
  },
  {
    actionId: "material_list_prep",
    label: "Material list prep",
    helper: "Prepare material checklist. No purchase order, vendor message, supplier order, or payment.",
    targetEntityType: "estimate",
    targetCollection: "estimates",
  },
  {
    actionId: "job_costing_review",
    label: "Job costing review",
    helper: "Prepare costing review. No profit/loss finalization, billing state, or accounting export.",
    targetEntityType: "job",
    targetCollection: "jobs",
  },
  {
    actionId: "warranty_follow_up_draft",
    label: "Warranty follow-up draft",
    helper: "Prepare warranty talking points. No customer message, service appointment, warranty status, or contact history entry.",
    targetEntityType: "job",
    targetCollection: "jobs",
  },
  {
    actionId: "permit_checklist_prep",
    label: "Permit checklist prep",
    helper: "Prepare permit readiness. No permit filing, inspection request, schedule change, or jurisdiction contact.",
    targetEntityType: "job",
    targetCollection: "jobs",
  },
  {
    actionId: "crew_handoff_prep",
    label: "Crew handoff prep",
    helper: "Prepare scope, access, material, and hazard handoff notes. No crew assignment or notification.",
    targetEntityType: "job",
    targetCollection: "jobs",
  },
  {
    actionId: "daily_report_review",
    label: "Daily report review",
    helper: "Prepare report completeness review. No approval, rejection, reopen, or billing change.",
    targetEntityType: "dailyReport",
    targetCollection: "dailyReports",
  },
  {
    actionId: "upload_photo_review",
    label: "Photo evidence review",
    helper: "Prepare proof review prompts. No archive, restore, customer share, or proof approval.",
    targetEntityType: "upload",
    targetCollection: "uploads",
  },
  {
    actionId: "delivery_ticket_review",
    label: "Delivery ticket review",
    helper: "Prepare reconciliation prompts. No material cost posting, vendor contact, or job cost mutation.",
    targetEntityType: "deliveryTicket",
    targetCollection: "deliveryTickets",
  },
  {
    actionId: "safety_incident_summary",
    label: "Safety incident summary",
    helper: "Prepare internal incident facts. No resolution, claim, compliance filing, or customer notice.",
    targetEntityType: "safetyIncident",
    targetCollection: "safetyIncidents",
  },
  {
    actionId: "pre_pour_review",
    label: "Pre-pour review",
    helper: "Prepare pour readiness prompts. No checklist completion, pour approval, schedule mutation, or crew notification.",
    targetEntityType: "prePourChecklist",
    targetCollection: "prePourChecklists",
  },
  {
    actionId: "post_pour_review",
    label: "Post-pour review",
    helper: "Prepare closeout and punch-list prompts. No job closeout, warranty note, customer message, or billing change.",
    targetEntityType: "postPourChecklist",
    targetCollection: "postPourChecklists",
  },
]);

function text(value = "", maxLength = 180) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function parseAuditDetail(detail) {
  if (detail && typeof detail === "object") return detail;
  if (!detail || typeof detail !== "string") return {};
  try {
    const parsed = JSON.parse(detail);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function deriveAgentOsRunLedgerRows(auditEvents = [], { limit = 8 } = {}) {
  return normalizeObjectArray(auditEvents)
    .filter((event) => event.entityType === "agentOsRun" || text(event.action, 120).startsWith("agent.os."))
    .map((event) => {
      const detail = parseAuditDetail(event.detail);
      const run = detail.run && typeof detail.run === "object" ? detail.run : {};
      const task = detail.task && typeof detail.task === "object" ? detail.task : {};
      const status = text(detail.status || run.status || task.status || event.action?.replace(/^agent\.os\.run\./, "") || "queued", 80);
      const actionId = text(detail.actionId || run.actionId || task.actionId || "", 120);
      const target = task.target && typeof task.target === "object" ? task.target : {};
      const output = run.output && typeof run.output === "object" ? run.output : {};
      const logs = Array.isArray(run.logs) ? run.logs.slice(-5).map((entry) => ({
        at: text(entry?.at, 80),
        level: text(entry?.level || "info", 40),
        message: text(entry?.message, 260),
      })).filter((entry) => entry.message) : [];
      const isClosed = ["succeeded", "cancelled"].includes(status);
      const isRetryable = ["failed", "dead_lettered"].includes(status);
      return {
        eventId: text(event.id || `${event.createdAt || ""}-${actionId}-${status}`, 160),
        runId: text(run.id || detail.runId || event.entityId || "", 120),
        taskId: text(task.id || detail.taskId || run.taskId || "", 120),
        actionId,
        actionLabel: text(task.actionLabel || run.actionLabel || actionId.replace(/_/g, " ") || "Agent OS action", 160),
        status,
        summary: text(event.summary || run.summary || task.summary || "Agent OS run event", 220),
        createdAt: text(event.createdAt || run.updatedAt || task.updatedAt || "", 80),
        attempt: Number(run.attempt || task.attempt || 0) || 0,
        target: {
          entityType: text(target.entityType, 80),
          entityId: text(target.entityId, 160),
          title: text(target.title, 180),
        },
        output: {
          mode: text(output.mode, 120),
          safetyBoundary: text(output.safetyBoundary, 260),
          blockedActions: Array.isArray(output.blockedActions) ? output.blockedActions.slice(0, 5).map((item) => text(item, 220)).filter(Boolean) : [],
        },
        logs,
        logCount: logs.length,
        canExecute: Boolean(run.id) && !isClosed && status !== "dead_lettered",
        canCancel: Boolean(run.id) && !isClosed,
        canRetry: Boolean(run.id) && isRetryable,
        canDeadLetter: Boolean(run.id) && !isClosed && status !== "dead_lettered",
      };
    })
    .filter((row) => row.runId || row.taskId || row.actionId)
    .slice(0, Math.max(1, Number(limit) || 8));
}

function recordLabel(record = {}, fallback = "Untitled record") {
  return text(
    record.title
      || record.project
      || record.jobName
      || record.customer
      || record.customerName
      || record.name
      || fallback,
    180,
  );
}

export function deriveAgentOsInternalTaskOptions({
  leads = [],
  opportunitySearchProfiles = [],
  estimates = [],
  jobs = [],
  dailyReports = [],
  uploads = [],
  deliveryTickets = [],
  safetyIncidents = [],
  prePourChecklists = [],
  postPourChecklists = [],
  workflowRows = [],
} = {}) {
  const collections = {
    leads: normalizeObjectArray(leads).filter((record) => !record.archivedAt),
    opportunitySearchProfiles: normalizeObjectArray(opportunitySearchProfiles).filter((record) => !record.archivedAt),
    estimates: normalizeObjectArray(estimates).filter((record) => !record.archivedAt),
    jobs: normalizeObjectArray(jobs).filter((record) => !record.archivedAt),
    dailyReports: normalizeObjectArray(dailyReports).filter((record) => !record.archivedAt),
    uploads: normalizeObjectArray(uploads).filter((record) => !record.archivedAt),
    deliveryTickets: normalizeObjectArray(deliveryTickets).filter((record) => !record.archivedAt),
    safetyIncidents: normalizeObjectArray(safetyIncidents).filter((record) => !record.archivedAt),
    prePourChecklists: normalizeObjectArray(prePourChecklists).filter((record) => !record.archivedAt),
    postPourChecklists: normalizeObjectArray(postPourChecklists).filter((record) => !record.archivedAt),
  };
  const workflowByActionId = new Map(normalizeObjectArray(workflowRows).map((row) => [row.actionId, row]));
  return AGENT_OS_INTERNAL_DRAFT_ACTIONS.map((action) => {
    const workflow = workflowByActionId.get(action.actionId) || {};
    const targets = (collections[action.targetCollection] || []).slice(0, 12).map((record) => ({
      id: text(record.id || record.leadId || record.estimateId || record.jobId, 160),
      label: recordLabel(record, action.label),
      entityType: action.targetEntityType,
    })).filter((target) => target.id);
    return {
      ...action,
      modeId: text(workflow.modeId || "draft_only", 80),
      modeLabel: text(workflow.modeLabel || "Draft only", 120),
      disabled: workflow.modeId === "locked" || workflow.externalLocked || targets.length === 0,
      disabledReason: workflow.modeId === "locked"
        ? "Locked by contractor policy."
        : workflow.externalLocked
          ? "External gates are locked."
          : targets.length === 0
            ? "No visible target records."
            : "",
      targets,
    };
  });
}

export function deriveAgentOsOperatorConsoleCards(agentOs = {}) {
  const panel = agentOs.operatorControlPanel && typeof agentOs.operatorControlPanel === "object"
    ? agentOs.operatorControlPanel
    : {};
  const stats = panel.stats && typeof panel.stats === "object" ? panel.stats : {};
  const cards = [
    {
      id: "internal-actions",
      label: "Internal actions",
      value: Number(stats.internalActionCount || 0),
      tone: Number(stats.internalActionCount || 0) ? "green" : "slate",
      helper: "Review-only draft/prep actions available to Apex Agent.",
    },
    {
      id: "open-runs",
      label: "Open runs",
      value: Number(stats.openRunCount || 0),
      tone: Number(stats.deadLetterCount || 0) ? "red" : Number(stats.openRunCount || 0) ? "amber" : "green",
      helper: Number(stats.deadLetterCount || 0) ? "Dead-letter review needed." : "Queue, retry, cancel, and run logs stay audit-backed.",
    },
    {
      id: "external-locks",
      label: "External locks",
      value: Number(stats.externalLockedCount || 0),
      tone: "slate",
      helper: "Customer contact, payment, portal, schedule, bid, and integration gates remain explicit.",
    },
    {
      id: "learning-signals",
      label: "Learning signals",
      value: Number(stats.learningSignalCount || 0),
      tone: Number(stats.learningSignalCount || 0) ? "blue" : "slate",
      helper: "Company-scoped, redacted signals only.",
    },
  ];
  return {
    status: text(panel.status || "ready", 120),
    cards,
    rollbackRows: normalizeObjectArray(panel.actionRollbackRows).slice(0, 12).map((row) => ({
      actionId: text(row.actionId, 120),
      label: text(row.label, 160),
      moduleId: text(row.moduleId, 120),
      auditEvent: text(row.auditEvent, 180),
      rollbackBehavior: text(row.rollbackBehavior, 260),
      idempotencyKeyFields: Array.isArray(row.idempotencyKeyFields) ? row.idempotencyKeyFields.map((field) => text(field, 80)).filter(Boolean) : [],
      externalLocked: Boolean(row.externalLocked),
    })),
    controlRows: normalizeObjectArray(panel.controlRows).slice(0, 6).map((row) => ({
      id: text(row.id, 120),
      label: text(row.label, 160),
      count: Number(row.count || 0),
      operatorAction: text(row.operatorAction, 220),
      risk: text(row.risk, 120),
    })),
    safetyBoundary: text(panel.safetyBoundary, 320),
  };
}

const AGENT_OS_ACTION_FILTERS = Object.freeze([
  { id: "all", label: "All" },
  { id: "lead_growth", label: "Leads", targetCollections: ["leads", "opportunitySearchProfiles"] },
  { id: "estimates", label: "Estimates", targetCollections: ["estimates"] },
  { id: "jobs", label: "Jobs", targetCollections: ["jobs"] },
  { id: "reports", label: "Reports", targetCollections: ["dailyReports"] },
  { id: "uploads", label: "Uploads", targetCollections: ["uploads"] },
  { id: "tickets", label: "Tickets", targetCollections: ["deliveryTickets"] },
  { id: "safety", label: "Safety", targetCollections: ["safetyIncidents"] },
  { id: "pour", label: "Pour", targetCollections: ["prePourChecklists", "postPourChecklists"] },
]);

function filterIdForTaskOption(option = {}) {
  const collection = text(option.targetCollection, 120);
  const match = AGENT_OS_ACTION_FILTERS.find((group) => (group.targetCollections || []).includes(collection));
  return match?.id || "all";
}

export function deriveAgentOsActionFilterGroups(taskOptions = []) {
  const options = normalizeObjectArray(taskOptions);
  return AGENT_OS_ACTION_FILTERS.map((group) => {
    const groupOptions = group.id === "all"
      ? options
      : options.filter((option) => filterIdForTaskOption(option) === group.id);
    return {
      id: group.id,
      label: group.label,
      count: groupOptions.length,
      readyCount: groupOptions.filter((option) => !option.disabled).length,
      blockedCount: groupOptions.filter((option) => option.disabled).length,
    };
  }).filter((group) => group.id === "all" || group.count > 0);
}

export function filterAgentOsTaskOptions(taskOptions = [], filterId = "all") {
  const options = normalizeObjectArray(taskOptions);
  const normalizedFilterId = text(filterId || "all", 80);
  if (!normalizedFilterId || normalizedFilterId === "all") return options;
  return options.filter((option) => filterIdForTaskOption(option) === normalizedFilterId);
}

function detailToneForStatus(status = "") {
  const value = text(status || "queued", 80);
  if (value === "succeeded") return "green";
  if (["dead_lettered", "failed", "cancelled"].includes(value)) return "red";
  if (["running", "retrying", "queued"].includes(value)) return "amber";
  return "slate";
}

export function deriveAgentOsRunDetail(row = {}, agentOs = {}) {
  const runRow = row && typeof row === "object" ? row : {};
  const actionId = text(runRow.actionId, 120);
  const actionRows = normalizeObjectArray(agentOs?.operatorControlPanel?.actionRollbackRows);
  const registryActionRows = normalizeObjectArray(agentOs?.actions);
  const actionRow = actionRows.find((entry) => entry.actionId === actionId)
    || registryActionRows.find((entry) => entry.actionId === actionId)
    || {};
  const status = text(runRow.status || "queued", 80);
  const isClosed = ["succeeded", "cancelled"].includes(status);
  const blockedActions = Array.isArray(runRow.output?.blockedActions)
    ? runRow.output.blockedActions
    : Array.isArray(runRow.blockedActions)
      ? runRow.blockedActions
      : [];
  const target = runRow.target && typeof runRow.target === "object" ? runRow.target : {};
  return {
    runId: text(runRow.runId || runRow.id, 120),
    taskId: text(runRow.taskId, 120),
    actionId,
    actionLabel: text(runRow.actionLabel || actionRow.label || actionId.replace(/_/g, " ") || "Agent OS run", 160),
    status,
    tone: detailToneForStatus(status),
    summary: text(runRow.summary || "Agent OS run event", 240),
    createdAt: text(runRow.createdAt || runRow.updatedAt, 80),
    attempt: Number(runRow.attempt || 0) || 0,
    moduleId: text(actionRow.moduleId, 120),
    permissionGate: text(actionRow.permissionGate, 160),
    packageGate: text(actionRow.packageGate, 160),
    auditEvent: text(actionRow.auditEvent, 180),
    rollbackBehavior: text(actionRow.rollbackBehavior, 320),
    idempotencyKeyFields: Array.isArray(actionRow.idempotencyKeyFields) ? actionRow.idempotencyKeyFields.map((field) => text(field, 80)).filter(Boolean) : [],
    externalLocked: Boolean(actionRow.externalLocked || actionRow.externalGate),
    target: {
      entityType: text(target.entityType, 80),
      entityId: text(target.entityId || target.id, 160),
      title: text(target.title || target.label, 180),
    },
    output: {
      mode: text(runRow.output?.mode || runRow.outputMode, 120),
      safetyBoundary: text(runRow.output?.safetyBoundary || runRow.safetyBoundary || agentOs?.safetyBoundary, 320),
      blockedActions: blockedActions.slice(0, 6).map((item) => text(item, 220)).filter(Boolean),
    },
    logs: normalizeObjectArray(runRow.logs).slice(-5).map((entry) => ({
      at: text(entry.at, 80),
      level: text(entry.level || "info", 40),
      message: text(entry.message, 260),
    })).filter((entry) => entry.message),
    canExecute: Boolean(runRow.runId || runRow.id) && !["succeeded", "dead_lettered", "cancelled"].includes(status),
    canRetry: Boolean(runRow.runId || runRow.id) && ["failed", "dead_lettered"].includes(status),
    canDeadLetter: Boolean(runRow.runId || runRow.id) && !["succeeded", "dead_lettered", "cancelled"].includes(status),
    canCancel: Boolean(runRow.runId || runRow.id) && !isClosed && status !== "dead_lettered",
  };
}

export function deriveAgentOsLearningReviewRows(agentOs = {}) {
  return normalizeObjectArray(agentOs?.operatorControlPanel?.learningRows)
    .filter((row) => Number(row.count || 0) > 0)
    .map((row) => ({
      id: text(row.id, 120),
      label: text(row.label, 160),
      count: Number(row.count || 0),
      latestAt: text(row.latestAt, 80),
      redaction: text(row.redaction || "Redacted before memory use.", 260),
      companyScoped: row.companyScoped !== false,
      tone: row.companyScoped === false ? "red" : "blue",
      reviewState: row.companyScoped === false ? "scope review required" : "company scoped",
    }))
    .slice(0, 8);
}

export function deriveAgentOsProductionEvidenceRows(productionReadinessGate = {}) {
  const gate = productionReadinessGate && typeof productionReadinessGate === "object" ? productionReadinessGate : {};
  const checkRows = normalizeObjectArray(gate.checkRows);
  const blockers = (Array.isArray(gate.blockers) ? gate.blockers : []).map((blocker, index) => ({
    id: `blocker-${index + 1}`,
    label: text(typeof blocker === "object" ? blocker.label || blocker.message || blocker.id : blocker, 240),
    status: "blocked",
    group: "blocker",
    tone: "red",
    nextStep: "Record evidence or keep the production gate closed.",
  }));
  const evidenceRows = checkRows.map((row) => {
    const status = text(row.status || "missing_evidence", 80);
    return {
      id: text(row.id || row.label, 120),
      label: text(row.label || row.id, 180),
      status,
      group: text(row.group || "release", 80),
      tone: status === "passed" ? "green" : "amber",
      nextStep: status === "passed" ? "Evidence recorded." : "Evidence required before production release.",
    };
  });
  if (!evidenceRows.length && !blockers.length) {
    return [{
      id: "production-gate",
      label: "Production gate",
      status: text(gate.status || "blocked_until_release_evidence", 120),
      group: "release",
      tone: gate.readyForFounderSupportedProduction ? "green" : "amber",
      nextStep: "Load or record release evidence before changing production posture.",
    }];
  }
  return [...blockers, ...evidenceRows].slice(0, 12);
}

export function deriveAgentOsExternalGateReadinessRows(agentOs = {}) {
  const rows = normalizeObjectArray(agentOs?.externalGateReadinessDeck?.rows);
  return rows.map((row) => {
    const status = text(row.status || "blocked_locked", 120);
    const blockerCount = Number(row.blockerCount || 0);
    const evidenceCount = Number(row.evidenceCount || 0);
    const ready = status !== "blocked_locked" && blockerCount === 0;
    return {
      gateId: text(row.gateId, 120),
      label: text(row.label || row.gateId || "External gate", 160),
      status,
      statusLabel: status.replace(/_/g, " "),
      tone: ready ? "green" : blockerCount > 0 ? "red" : "amber",
      blockerCount,
      evidenceCount,
      preflightEndpoint: text(row.preflightEndpoint, 220),
      missingEvidenceIds: (Array.isArray(row.missingEvidenceIds) ? row.missingEvidenceIds : []).map((id) => text(id, 120)).filter(Boolean).slice(0, 8),
      blockedActions: (Array.isArray(row.blockedActions) ? row.blockedActions : []).map((item) => text(item, 160)).filter(Boolean).slice(0, 5),
      safetyBoundary: text(row.safetyBoundary || agentOs?.externalGateReadinessDeck?.safetyBoundary || "External gate remains locked.", 280),
    };
  }).slice(0, 10);
}

export function deriveAgentOsExternalGateExecutionRows(agentOs = {}) {
  return normalizeObjectArray(agentOs?.externalGateExecutionDeck?.rows)
    .map((row) => {
      const blockerCount = Number(row.blockerCount || 0);
      const canExecute = row.canExecute === true;
      return {
        gateId: text(row.gateId, 120),
        label: text(row.label || row.gateId || "External gate", 160),
        status: text(row.status || "locked", 120),
        statusLabel: text(row.status || "locked", 120).replace(/_/g, " "),
        tone: canExecute ? "green" : "amber",
        blockerCount,
        contractRoute: text(row.contractRoute, 220),
        executionRoute: text(row.executionRoute, 220),
        configuredExecutionEnabled: row.configuredExecutionEnabled === true,
        canExecute,
        futureAdapterBlockers: (Array.isArray(row.futureAdapterBlockers) ? row.futureAdapterBlockers : []).map((item) => text(item, 180)).filter(Boolean).slice(0, 4),
        blockedActions: (Array.isArray(row.blockedActions) ? row.blockedActions : []).map((item) => text(item, 160)).filter(Boolean).slice(0, 5),
        safetyBoundary: text(row.safetyBoundary || agentOs?.externalGateExecutionDeck?.safetyBoundary || "External execution remains locked.", 280),
      };
    })
    .slice(0, 10);
}

export function deriveAgentOsExternalGateSandboxAdapterRows(agentOs = {}) {
  return normalizeObjectArray(agentOs?.externalGateSandboxAdapterDeck?.rows)
    .map((row) => ({
      gateId: text(row.gateId, 120),
      adapterId: text(row.adapterId, 140),
      label: text(row.label || row.gateId || "Sandbox adapter", 160),
      status: text(row.status || "available_locked", 120),
      statusLabel: text(row.status || "available_locked", 120).replace(/_/g, " "),
      tone: row.canExecute === true ? "green" : "amber",
      runEndpoint: text(row.runEndpoint, 220),
      executeEndpoint: text(row.executeEndpoint, 220),
      canExecute: row.canExecute === true,
      blockedActions: (Array.isArray(row.blockedActions) ? row.blockedActions : []).map((item) => text(item, 160)).filter(Boolean).slice(0, 5),
      safetyBoundary: text(row.safetyBoundary || agentOs?.externalGateSandboxAdapterDeck?.safetyBoundary || "Sandbox adapter remains locked.", 280),
    }))
    .slice(0, 10);
}

export function deriveAgentOsConsoleSummary({
  taskOptions = [],
  runRows = [],
  consoleCards = {},
  productionEvidenceRows = [],
} = {}) {
  const options = normalizeObjectArray(taskOptions);
  const runs = normalizeObjectArray(runRows);
  const cards = normalizeObjectArray(consoleCards?.cards);
  const evidenceRows = normalizeObjectArray(productionEvidenceRows);
  const readyActionCount = options.filter((option) => !option.disabled).length;
  const blockedActionCount = options.filter((option) => option.disabled).length;
  const deadLetterCount = runs.filter((row) => row.status === "dead_lettered").length;
  const externalLockCard = cards.find((card) => card.id === "external-locks") || {};
  const externalLockCount = Number(externalLockCard.value || 0) || 0;
  const evidenceHasBlocker = evidenceRows.some((row) => row.tone === "red" || row.status === "blocked");
  return {
    totalActionCount: options.length,
    readyActionCount,
    blockedActionCount,
    recentRunCount: runs.length,
    deadLetterCount,
    hasDeadLetteredRun: deadLetterCount > 0,
    runTone: deadLetterCount ? "red" : runs.length ? "amber" : "green",
    externalLockCount,
    productionEvidenceCount: evidenceRows.length,
    checklistRows: [
      {
        id: "queue-ready",
        label: "Queue-ready actions",
        tone: readyActionCount ? "green" : "amber",
        detail: `${readyActionCount} internal draft/prep action${readyActionCount === 1 ? "" : "s"} ready.`,
      },
      {
        id: "run-review",
        label: "Run review",
        tone: deadLetterCount ? "red" : runs.length ? "green" : "amber",
        detail: deadLetterCount
          ? `${deadLetterCount} dead-lettered run${deadLetterCount === 1 ? "" : "s"} need review.`
          : runs.length
            ? `${runs.length} recent run event${runs.length === 1 ? "" : "s"} visible.`
            : "No run events yet.",
      },
      {
        id: "external-locks",
        label: "External locks",
        tone: "slate",
        detail: `${externalLockCount} external gate${externalLockCount === 1 ? "" : "s"} require normal confirmation.`,
      },
      {
        id: "production-evidence",
        label: "Production evidence",
        tone: evidenceHasBlocker ? "red" : evidenceRows.length ? "blue" : "amber",
        detail: evidenceRows.length
          ? `${evidenceRows.length} evidence row${evidenceRows.length === 1 ? "" : "s"} loaded.`
          : "No production evidence rows loaded.",
      },
    ],
  };
}

export function canRenderAgentOsConsole(permissions = {}) {
  return permissions?.aiOffice?.canView === true;
}

function actionIdForRecommendation(recommendation = {}) {
  const recordType = text(recommendation.recordType, 80).toLowerCase();
  const actionMode = text(recommendation.actionMode, 80);
  if (recordType === "lead") return "lead_follow_up_draft";
  if (recordType === "estimate" && actionMode === "packet") return "estimate_packet_draft";
  if (recordType === "estimate" && actionMode === "jobHandoff") return "material_list_prep";
  if (recordType === "job") return "job_costing_review";
  if (recordType === "dailycloseout") return "invoice_payment_prep";
  if (recordType === "changeorder") return "change_order_draft";
  return "";
}

function recommendationTargetId(recommendation = {}) {
  const record = recommendation.record && typeof recommendation.record === "object" ? recommendation.record : {};
  const recordType = text(recommendation.recordType, 80).toLowerCase();
  if (recordType === "changeorder") return text(record.jobId || record.linkedJobId || record.relatedJobId || record.id, 160);
  return text(record.id || record.leadId || record.estimateId || record.jobId || recommendation.recordId, 160);
}

export function deriveAgentOsQueueIntentForRecommendation(recommendation = {}, taskOptions = []) {
  const actionId = actionIdForRecommendation(recommendation);
  if (!actionId) return null;
  const option = normalizeObjectArray(taskOptions).find((entry) => entry.actionId === actionId);
  if (!option || option.disabled) return null;
  const targetId = recommendationTargetId(recommendation);
  const targets = normalizeObjectArray(option.targets);
  const target = targets.find((entry) => entry.id === targetId);
  if (!target) return null;
  return {
    id: `${actionId}:${target.id}`,
    actionId,
    label: `Queue ${option.label}`,
    helper: option.helper,
    sourceTitle: text(recommendation.title || target.label, 180),
    target,
  };
}

export function deriveAgentOsQueueIntentsForRecommendations(recommendations = [], taskOptions = [], { limit = 4 } = {}) {
  const seen = new Set();
  return normalizeObjectArray(recommendations)
    .map((recommendation) => deriveAgentOsQueueIntentForRecommendation(recommendation, taskOptions))
    .filter((intent) => {
      if (!intent || seen.has(intent.id)) return false;
      seen.add(intent.id);
      return true;
    })
    .slice(0, Math.max(1, Number(limit) || 4));
}
