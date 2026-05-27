import { normalizeObjectArray } from "./app-state-utils.js";

export const AGENT_OS_INTERNAL_DRAFT_ACTIONS = Object.freeze([
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
  estimates = [],
  jobs = [],
  workflowRows = [],
} = {}) {
  const collections = {
    leads: normalizeObjectArray(leads).filter((record) => !record.archivedAt),
    estimates: normalizeObjectArray(estimates).filter((record) => !record.archivedAt),
    jobs: normalizeObjectArray(jobs).filter((record) => !record.archivedAt),
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
