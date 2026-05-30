import { buildPurchasingPrepPacket } from "./material-prep-utils.js";
import { normalizeJobStatus } from "./job-utils.js";
import { getStartupCriticalWarnings, normalizeStartupChecklist } from "../shared/jobStartup.js";

const COMPLETION_STATUSES = new Set(["field_complete", "completed", "billing_ready", "closed"]);
const FIELD_STARTED_STATUSES = new Set(["in_progress", ...COMPLETION_STATUSES]);

export const JOB_OPERATIONS_FINISH_GUARDRAILS = [
  "No automatic scheduling, crew notification, vendor order, customer send, billing action, or provider write.",
  "Field-visible job data stays limited to assigned work, field-safe scope, address, schedule, crew, materials, tools, safety, and proof prompts.",
  "Pricing, margin, profit, payroll, billing, estimates, office notes, private URLs, and hidden metadata stay out of field operations.",
];

function safeArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function text(value) {
  return String(value ?? "").trim();
}

function recordJobId(record = {}) {
  return text(record.jobId || record.linkedJobId || record.job?.id);
}

function activeAssignments(job = {}) {
  return safeArray(job.assignments || [
    job.foremanAssignment,
    ...safeArray(job.crewAssignments),
  ]).filter((assignment) => assignment && !assignment.removedAt);
}

function hasCrew(job = {}) {
  return Boolean(
    text(job.assignedForemanId)
      || text(job.assignedUserId)
      || text(job.crew)
      || activeAssignments(job).length > 0
      || Number(job.crewSizeNeeded || 0) > 0,
  );
}

function fieldVisible(job = {}) {
  const status = normalizeJobStatus(job.status || job.stage);
  return Boolean(job.fieldPlanningVisible || job.visibleToForeman || FIELD_STARTED_STATUSES.has(status));
}

function isLiveJob(job = {}) {
  if (!job || job.archivedAt) return false;
  return normalizeJobStatus(job.status || job.stage) !== "closed";
}

function linkedEstimateForJob(job = {}, estimates = []) {
  const jobId = text(job.id);
  const estimateId = text(job.estimateId || job.sourceEstimateId || job.sourceProposalId);
  return safeArray(estimates).find((estimate) => (
    (jobId && text(estimate.jobId) === jobId)
      || (estimateId && text(estimate.id) === estimateId)
  )) || null;
}

function hasProofRequirement(job = {}, proof = {}) {
  const haystack = [
    job.nextStep,
    job.scopeSummary,
    job.fieldNotes,
    job.materialNotes,
    job.safetyNotes,
  ].map(text).join(" ").toLowerCase();
  return Boolean(
    proof.hasReport
      || proof.hasUpload
      || proof.hasTicket
      || /\b(photo|proof|upload|daily report|report|ticket|delivery|checklist|closeout)\b/.test(haystack),
  );
}

function buildCheckpoint(id, label, ready, helper, route = "jobs", mode = "details") {
  return {
    id,
    label,
    ready: Boolean(ready),
    helper,
    route,
    mode,
  };
}

export function deriveJobOperationsFinishState({
  jobs = [],
  estimates = [],
  customers = [],
  rateBookItems = [],
  dailyReports = [],
  uploads = [],
  deliveryTickets = [],
  safetyIncidents = [],
  toolChecklists = [],
  permissions = {},
} = {}) {
  const canUseOfficeOps = Boolean(permissions?.jobs?.canManageAll);
  if (!canUseOfficeOps) {
    return {
      locked: true,
      guardrails: JOB_OPERATIONS_FINISH_GUARDRAILS,
      kpis: [],
      queue: [],
      rows: [],
      nextAction: {
        label: "Assigned field work only",
        detail: "Job Operations Finish is an owner/admin review surface. Field users stay in assigned job tools.",
        route: "jobs",
        mode: "field",
      },
      counts: {
        total: 0,
        readyForField: 0,
        fieldVisible: 0,
        materialReady: 0,
        completionReview: 0,
        blocked: 0,
      },
    };
  }

  const liveJobs = safeArray(jobs).filter(isLiveJob);
  const reportJobIds = new Set(safeArray(dailyReports).filter((report) => !report.archivedAt).map(recordJobId).filter(Boolean));
  const uploadJobIds = new Set(safeArray(uploads).filter((upload) => !upload.archivedAt).map(recordJobId).filter(Boolean));
  const ticketJobIds = new Set(safeArray(deliveryTickets).filter((ticket) => !ticket.archivedAt).map(recordJobId).filter(Boolean));
  const safetyJobIds = new Set(safeArray(safetyIncidents).filter((incident) => !incident.archivedAt && !/(resolved|closed|reviewed)/i.test(text(incident.status))).map(recordJobId).filter(Boolean));
  const toolRowsByJobId = safeArray(toolChecklists)
    .filter((checklist) => !checklist.archivedAt)
    .reduce((map, checklist) => {
      const jobId = recordJobId(checklist);
      if (!jobId) return map;
      const current = map.get(jobId) || [];
      current.push(checklist);
      map.set(jobId, current);
      return map;
    }, new Map());

  const rows = liveJobs.map((job) => {
    const status = normalizeJobStatus(job.status || job.stage);
    const linkedEstimate = linkedEstimateForJob(job, estimates);
    const materialPacket = linkedEstimate
      ? buildPurchasingPrepPacket(linkedEstimate, { jobs: [job], customers, rateBookItems })
      : null;
    const startupWarnings = getStartupCriticalWarnings(normalizeStartupChecklist(job.startupChecklist));
    const proof = {
      hasReport: reportJobIds.has(job.id),
      hasUpload: uploadJobIds.has(job.id),
      hasTicket: ticketJobIds.has(job.id),
    };
    const toolRows = toolRowsByJobId.get(job.id) || [];
    const toolBlocked = toolRows.some((checklist) => /(missing|damaged|blocked|open|draft|reopened)/i.test(text(checklist.status || checklist.condition || checklist.summary)));
    const completionReview = COMPLETION_STATUSES.has(status);
    const readyForField = Boolean(
      text(job.scheduledStart)
        && hasCrew(job)
        && text(job.scopeSummary)
        && (text(job.address) || text(job.city) || text(job.location))
        && startupWarnings.length === 0
        && fieldVisible(job),
    );
    const materialReady = Boolean(materialPacket?.ready || text(job.materialNotes));
    const proofReady = hasProofRequirement(job, proof);
    const safetyReady = Boolean(text(job.safetyNotes) || !safetyJobIds.has(job.id));
    const checkpoints = [
      buildCheckpoint("source", "Approved work / setup", Boolean(linkedEstimate || text(job.customer) || text(job.customerId)), linkedEstimate ? "Approved estimate is linked to this job." : "Manual job setup is present.", "jobs", "details"),
      buildCheckpoint("schedule", "Schedule", Boolean(text(job.scheduledStart)), text(job.scheduledStart) ? "Scheduled start is set." : "Set scheduled start before field handoff.", "schedule", "details"),
      buildCheckpoint("crew", "Crew", hasCrew(job), hasCrew(job) ? "Foreman, crew, or crew-size context is present." : "Assign a foreman or field crew.", "jobs", "crew"),
      buildCheckpoint("scope", "Scope", Boolean(text(job.scopeSummary)), text(job.scopeSummary) ? "Field-safe scope summary is present." : "Add a field-safe scope summary.", "jobs", "details"),
      buildCheckpoint("jobsite", "Jobsite", Boolean(text(job.address) || text(job.city) || text(job.location)), "Confirm address, access, and site contact before dispatch.", "jobs", "details"),
      buildCheckpoint("startup", "Startup", startupWarnings.length === 0, startupWarnings.length ? `${startupWarnings.length} critical startup item${startupWarnings.length === 1 ? "" : "s"} need review.` : "Startup critical items are ready or marked TBD.", "jobs", "startup"),
      buildCheckpoint("fieldVisibility", "Field visibility", fieldVisible(job), fieldVisible(job) ? "Assigned field users can see safe job context." : "Keep field hidden until office is ready to release.", "jobs", "details"),
      buildCheckpoint("materials", "Materials", materialReady, materialReady ? "Material notes or linked material prep are available." : "Prepare material, delivery, or staging notes.", "materialPrep", "details"),
      buildCheckpoint("tools", "Tools", !toolBlocked, toolBlocked ? "Tool checklist has blockers to review." : "No open tool blockers found.", "toolChecklist", "details"),
      buildCheckpoint("safety", "Safety", safetyReady, safetyJobIds.has(job.id) ? "Open safety item needs office review." : "Safety context is clear for job operations.", "incidents", "details"),
      buildCheckpoint("proof", "Proof path", proofReady, proofReady ? "Reports, photos, tickets, or proof prompt exists." : "Name the first proof action for the field team.", "uploads", "details"),
      buildCheckpoint("completion", "Completion readiness", completionReview || status === "in_progress", completionReview ? "Job is ready for closeout or billing-prep review." : "Completion review starts after field progress.", "jobs", "details"),
    ];
    const blockers = checkpoints.filter((checkpoint) => !checkpoint.ready);
    const firstBlocker = blockers[0] || null;
    const phaseStatus = completionReview
      ? "Completion review"
      : readyForField
        ? "Ready for field"
        : fieldVisible(job)
          ? "Field-visible setup"
          : "Needs setup";

    return {
      id: job.id,
      title: text(job.title || job.job || "Untitled job"),
      customer: text(job.customer || "Customer pending"),
      status,
      phaseStatus,
      tone: blockers.length ? (readyForField ? "amber" : "orange") : "green",
      readyForField,
      fieldVisible: fieldVisible(job),
      materialReady,
      completionReview,
      blockerCount: blockers.length,
      checkpoints,
      blockers: blockers.map((checkpoint) => checkpoint.label),
      nextAction: firstBlocker
        ? {
          label: firstBlocker.label,
          detail: firstBlocker.helper,
          route: firstBlocker.route,
          mode: firstBlocker.mode,
        }
        : {
          label: completionReview ? "Review closeout readiness" : "Open field work",
          detail: completionReview ? "Use closeout and billing-prep workflows for money review." : "Job has enough setup for assigned field work.",
          route: completionReview ? "jobs" : "fieldWorkspace",
          mode: "overview",
        },
      fieldSafeSummary: {
        schedule: text(job.scheduledStart) || "Schedule pending",
        address: text(job.address || job.city || job.location) || "Jobsite pending",
        scope: text(job.scopeSummary) || "Scope pending",
        crew: activeAssignments(job).length || Number(job.crewSizeNeeded || 0) || 0,
        material: materialReady ? "Material context ready" : "Material prep needed",
        proof: proofReady ? "Proof path ready" : "Proof prompt needed",
      },
    };
  });

  const priorityRows = [...rows].sort((left, right) => (
    right.blockerCount - left.blockerCount
      || Number(right.completionReview) - Number(left.completionReview)
      || left.title.localeCompare(right.title)
  ));
  const nextRow = priorityRows.find((row) => row.blockerCount > 0) || priorityRows[0] || null;
  const counts = {
    total: rows.length,
    readyForField: rows.filter((row) => row.readyForField).length,
    fieldVisible: rows.filter((row) => row.fieldVisible).length,
    materialReady: rows.filter((row) => row.materialReady).length,
    completionReview: rows.filter((row) => row.completionReview).length,
    blocked: rows.filter((row) => row.blockerCount > 0).length,
  };

  return {
    locked: false,
    guardrails: JOB_OPERATIONS_FINISH_GUARDRAILS,
    counts,
    rows,
    selectedRowForJobId: (jobId) => rows.find((row) => row.id === jobId) || null,
    queue: priorityRows.slice(0, 6).map((row) => ({
      id: row.id,
      title: row.title,
      eyebrow: row.phaseStatus,
      meta: `${row.customer} / ${row.nextAction.label}`,
      status: row.blockerCount ? `${row.blockerCount} checkpoint${row.blockerCount === 1 ? "" : "s"}` : "Ready",
      tone: row.tone,
      row,
    })),
    kpis: [
      { label: "Job Ops", value: counts.total, helper: "Active setup, schedule, and handoff jobs.", tone: counts.total ? "blue" : "slate" },
      { label: "Ready Field", value: counts.readyForField, helper: "Schedule, crew, scope, startup, and visibility ready.", tone: counts.readyForField ? "green" : "amber" },
      { label: "Material Prep", value: counts.materialReady, helper: "Jobs with material or delivery context.", tone: counts.materialReady ? "orange" : "slate" },
      { label: "Needs Review", value: counts.blocked, helper: "Jobs with setup or proof checkpoints open.", tone: counts.blocked ? "amber" : "green" },
    ],
    nextAction: nextRow
      ? {
        label: nextRow.nextAction.label,
        detail: `${nextRow.title}: ${nextRow.nextAction.detail}`,
        route: nextRow.nextAction.route,
        mode: nextRow.nextAction.mode,
        jobId: nextRow.id,
      }
      : {
        label: "Create or approve work",
        detail: "No active jobs are waiting in Job Operations Finish.",
        route: "jobs",
        mode: "create",
      },
  };
}
