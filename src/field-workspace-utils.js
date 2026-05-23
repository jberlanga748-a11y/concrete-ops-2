import { deriveJobAssignmentNotices } from "../shared/job-assignment-notices.js";
import { buildConstructionAgentTradeContext } from "../shared/constructionTrades.js";

function activeAssignments(job) {
  if (Array.isArray(job?.assignments) && job.assignments.length > 0) {
    return job.assignments.filter((assignment) => !assignment.removedAt);
  }

  const synthesized = [];
  if (job?.assignedForemanId) {
    synthesized.push({ userId: job.assignedForemanId, roleOnJob: "foreman" });
  }
  if (job?.assignedUserId) {
    synthesized.push({ userId: job.assignedUserId, roleOnJob: "crew" });
  }
  return synthesized;
}

function isFutureScheduled(job, now = new Date()) {
  if (!job?.scheduledStart) return false;
  const scheduled = new Date(job.scheduledStart);
  if (Number.isNaN(scheduled.getTime())) return false;
  return scheduled.getTime() > now.getTime();
}

function scheduledTime(job) {
  if (!job?.scheduledStart) return Number.POSITIVE_INFINITY;
  const scheduled = new Date(job.scheduledStart).getTime();
  return Number.isNaN(scheduled) ? Number.POSITIVE_INFINITY : scheduled;
}

export function deriveNextAssignedJob(jobs, now = new Date()) {
  const nowTime = now instanceof Date ? now.getTime() : new Date(now).getTime();
  const safeNowTime = Number.isNaN(nowTime) ? Date.now() : nowTime;
  const safeJobs = Array.isArray(jobs) ? jobs : [];

  return safeJobs
    .filter((job) => !job?.archivedAt && job?.scheduledStart && scheduledTime(job) >= safeNowTime)
    .sort((left, right) => scheduledTime(left) - scheduledTime(right))[0] || null;
}

function isAssignedForeman(job, userId) {
  if (!job || !userId) return false;
  if (job.foremanAssignment?.userId === userId) return true;
  if (job.assignedForemanId === userId) return true;
  return activeAssignments(job).some((assignment) => assignment.userId === userId && assignment.roleOnJob === "foreman");
}

function isAssignedCrew(job, userId) {
  if (!job || !userId) return false;
  if (job.assignedUserId === userId) return true;
  if (Array.isArray(job.crewAssignments) && job.crewAssignments.some((assignment) => assignment.userId === userId && !assignment.removedAt)) {
    return true;
  }
  return activeAssignments(job).some((assignment) => assignment.userId === userId);
}

export function deriveForemanWorkspace(jobs, userId, now = new Date()) {
  const safeJobs = Array.isArray(jobs) ? jobs : [];
  const assignedJobs = safeJobs.filter((job) => !job.archivedAt && isAssignedForeman(job, userId));
  const upcomingJobs = safeJobs.filter((job) => (
    !job.archivedAt
    && !isAssignedForeman(job, userId)
    && (Boolean(job.fieldPlanningVisible) || Boolean(job.visibleToForeman))
    && isFutureScheduled(job, now)
  ));

  return {
    assignedJobs,
    upcomingJobs,
    assignmentNotices: deriveJobAssignmentNotices(assignedJobs, userId),
    nextAssignedJob: deriveNextAssignedJob(assignedJobs, now),
    primaryJob: assignedJobs[0] || upcomingJobs[0] || null,
  };
}

export function deriveEmployeeWorkspace(jobs, userId, now = new Date()) {
  const safeJobs = Array.isArray(jobs) ? jobs : [];
  const assignedJobs = safeJobs.filter((job) => !job.archivedAt && isAssignedCrew(job, userId));

  return {
    assignedJobs,
    assignmentNotices: deriveJobAssignmentNotices(assignedJobs, userId),
    nextAssignedJob: deriveNextAssignedJob(assignedJobs, now),
    primaryJob: assignedJobs[0] || null,
  };
}

export function deriveFieldTradeGuidance(job = {}, companySettings = {}) {
  if (!job) return null;
  const context = buildConstructionAgentTradeContext({
    trade: job.trade || job.tradeId || job.projectType || companySettings.primaryTrade,
    companySettings,
    estimate: {
      trade: job.estimateTrade || "",
      title: job.estimateTitle || "",
      scopeSummary: job.scopeSummary || "",
      internalNotes: "",
    },
    lead: {
      trade: job.leadTrade || "",
      project: job.title || job.job || "",
      notes: job.fieldNotes || job.notes || "",
    },
    roughNotes: [
      job.title,
      job.customer,
      job.scopeSummary,
      job.fieldNotes,
      job.materialNotes,
      job.equipmentNotes,
      job.safetyNotes,
      job.startupNotes,
      job.notes,
    ].filter(Boolean).join("\n"),
  });

  return {
    tradeId: context.tradeId,
    tradeLabel: context.tradeLabel,
    fieldHandoffChecklist: context.fieldHandoffChecklist,
    proofPhotoChecklist: context.proofPhotoChecklist,
    changeOrderWatchouts: context.changeOrderWatchouts,
    closeoutChecks: context.closeoutChecks,
    safetyBoundary: context.safetyBoundary,
  };
}
