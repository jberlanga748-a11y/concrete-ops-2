import { fieldChecklistNeedsAction, humanizeAssignmentRole } from "./field-format-utils";
import { normalizeJobStatus } from "./job-utils";
import { dailyReportDateKey, dailyReportIsLiveJob, dailyReportMatchesJobDate, dailyReportRecordDate, dailyReportRecordJobId, deriveDailyReportProofState, todayWorkChecklistRows, todayWorkCrewAssignments, todayWorkDateKey, todayWorkForemanLabel, todayWorkJobDate, todayWorkTimeValue } from "./report-utils";
import { getStartupCriticalWarnings, normalizeStartupChecklist } from "../shared/jobStartup.js";

function normalizeObjectArray(value, fallback = []) {
  if (Array.isArray(value)) {
    return value.filter((item) => item && typeof item === "object");
  }
  if (Array.isArray(fallback)) {
    return fallback.filter((item) => item && typeof item === "object");
  }
  return [];
}
function scheduleDateKeyOffset(value = new Date(), offset = 0) {
  const parsed = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  const base = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  base.setDate(base.getDate() + offset);
  return dailyReportDateKey(base);
}

export function scheduleDateLabel(dateKey = "") {
  if (!dateKey) return "Unscheduled";
  const parsed = new Date(`${dateKey}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return dateKey;
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(parsed);
}

function scheduleCrewLabels(job = {}, users = []) {
  const usersById = new Map(normalizeObjectArray(users).map((user) => [user.id, user]));
  const labels = todayWorkCrewAssignments(job)
    .map((assignment) => assignment.userName || assignment.name || usersById.get(assignment.userId)?.name || assignment.userId || humanizeAssignmentRole(assignment.roleOnJob))
    .filter(Boolean);

  if (labels.length) return Array.from(new Set(labels));
  return String(job.crew || "").trim() ? [String(job.crew).trim()] : [];
}

function scheduleActivityJobIdsForDate({ dateKey, dailyReports = [], uploads = [], deliveryTickets = [], timeEntries = [] } = {}) {
  return new Set([
    ...normalizeObjectArray(dailyReports).filter((report) => !report.archivedAt && dailyReportRecordDate(report) === dateKey).map(dailyReportRecordJobId),
    ...normalizeObjectArray(uploads).filter((upload) => !upload.archivedAt && dailyReportRecordDate(upload) === dateKey).map(dailyReportRecordJobId),
    ...normalizeObjectArray(deliveryTickets).filter((ticket) => !ticket.archivedAt && dailyReportRecordDate(ticket) === dateKey).map(dailyReportRecordJobId),
    ...normalizeObjectArray(timeEntries).filter((entry) => !entry.archivedAt && (dailyReportRecordDate(entry) === dateKey || (entry.clockInAt && !entry.clockOutAt))).map(dailyReportRecordJobId),
  ].filter(Boolean));
}

function scheduleWorkflowOpenCounts({ job, dateKey, prePourChecklists = [], postPourChecklists = [], toolChecklists = [], safetyIncidents = [] } = {}) {
  const prePourOpen = [
    job?.prePourChecklist,
    ...todayWorkChecklistRows(prePourChecklists, job, dateKey, false),
  ].filter(Boolean).filter(fieldChecklistNeedsAction).length;
  const postPourOpen = [
    job?.postPourChecklist,
    ...todayWorkChecklistRows(postPourChecklists, job, dateKey, false),
  ].filter(Boolean).filter(fieldChecklistNeedsAction).length;
  const toolOpen = todayWorkChecklistRows(toolChecklists, job, dateKey).filter(fieldChecklistNeedsAction).length;
  const incidentsOpen = normalizeObjectArray(safetyIncidents).filter((incident) => (
    dailyReportMatchesJobDate(incident, job, dateKey)
    && !incident.archivedAt
    && !/(resolved|closed|reviewed)/i.test(String(incident.status || ""))
  )).length;

  return {
    prePourOpen,
    postPourOpen,
    toolOpen,
    incidentsOpen,
    total: prePourOpen + postPourOpen + toolOpen + incidentsOpen,
  };
}

function buildScheduleJobRow(job, context = {}) {
  const {
    todayKey,
    dateKey: requestedDateKey = "",
    users = [],
    dailyReports = [],
    uploads = [],
    deliveryTickets = [],
    prePourChecklists = [],
    postPourChecklists = [],
    toolChecklists = [],
    safetyIncidents = [],
  } = context;
  const jobDateKey = todayWorkJobDate(job);
  const dateKey = requestedDateKey || jobDateKey || "";
  const report = normalizeObjectArray(dailyReports).find((item) => !item.archivedAt && dailyReportMatchesJobDate(item, job, dateKey));
  const proofState = deriveDailyReportProofState({
    report,
    job,
    operatingDate: dateKey || todayKey,
    uploads,
    deliveryTickets,
    prePourChecklists,
    postPourChecklists,
    toolChecklists,
    safetyIncidents,
  });
  const workflowCounts = scheduleWorkflowOpenCounts({
    job,
    dateKey: dateKey || todayKey,
    prePourChecklists,
    postPourChecklists,
    toolChecklists,
    safetyIncidents,
  });
  const crewLabels = scheduleCrewLabels(job, users);
  const startupWarnings = getStartupCriticalWarnings(normalizeStartupChecklist(job.startupChecklist));
  const dueNow = Boolean(dateKey && todayKey && dateKey <= todayKey) || normalizeJobStatus(job.status || job.stage) === "in_progress";
  const missing = [
    !job.scheduledStart ? "Schedule" : "",
    crewLabels.length === 0 ? "Crew" : "",
    dueNow && !report ? "Report" : "",
    dueNow && proofState.photoMissing ? "Photos" : "",
    dueNow && proofState.ticketMissing ? "Ticket" : "",
    workflowCounts.total ? "Checklist" : "",
    startupWarnings.length ? "Startup" : "",
  ].filter(Boolean);
  const severe = dueNow && missing.some((item) => ["Report", "Photos", "Crew", "Schedule"].includes(item));

  return {
    job,
    dateKey,
    report,
    proofState,
    workflowCounts,
    crewLabels,
    foreman: todayWorkForemanLabel(job, users),
    startupWarnings,
    missing,
    hasActivity: Boolean(report?.id || proofState.photoCount || proofState.ticketCount || workflowCounts.total),
    tone: severe ? "red" : missing.length ? "amber" : "green",
  };
}

export function deriveScheduleCoordinationState({
  jobs = [],
  dailyReports = [],
  uploads = [],
  deliveryTickets = [],
  prePourChecklists = [],
  postPourChecklists = [],
  toolChecklists = [],
  safetyIncidents = [],
  timeEntries = [],
  users = [],
  today = new Date(),
} = {}) {
  const todayKey = todayWorkDateKey(today);
  const tomorrowKey = scheduleDateKeyOffset(today, 1);
  const weekEndKey = scheduleDateKeyOffset(today, 6);
  const safeJobs = normalizeObjectArray(jobs).filter((job) => dailyReportIsLiveJob(job));
  const todayActivityJobIds = scheduleActivityJobIdsForDate({ dateKey: todayKey, dailyReports, uploads, deliveryTickets, timeEntries });
  const baseContext = { todayKey, users, dailyReports, uploads, deliveryTickets, prePourChecklists, postPourChecklists, toolChecklists, safetyIncidents };

  const allRows = safeJobs
    .map((job) => buildScheduleJobRow(job, baseContext))
    .sort((left, right) => todayWorkTimeValue(left.job) - todayWorkTimeValue(right.job));

  const todayRows = safeJobs
    .filter((job) => todayWorkJobDate(job) === todayKey || normalizeJobStatus(job.status || job.stage) === "in_progress" || todayActivityJobIds.has(job.id))
    .map((job) => buildScheduleJobRow(job, { ...baseContext, dateKey: todayKey }))
    .sort((left, right) => todayWorkTimeValue(left.job) - todayWorkTimeValue(right.job));
  const tomorrowRows = safeJobs
    .filter((job) => todayWorkJobDate(job) === tomorrowKey)
    .map((job) => buildScheduleJobRow(job, { ...baseContext, dateKey: tomorrowKey }))
    .sort((left, right) => todayWorkTimeValue(left.job) - todayWorkTimeValue(right.job));
  const weekRows = allRows.filter((row) => row.dateKey && row.dateKey >= todayKey && row.dateKey <= weekEndKey);
  const unassignedRows = allRows.filter((row) => !row.job.scheduledStart || row.crewLabels.length === 0);
  const missingRows = allRows.filter((row) => {
    const isDueOrActive = Boolean(row.dateKey && row.dateKey <= tomorrowKey) || normalizeJobStatus(row.job.status || row.job.stage) === "in_progress";
    return row.missing.length > 0 && isDueOrActive;
  });

  return {
    todayKey,
    tomorrowKey,
    weekEndKey,
    todayRows,
    tomorrowRows,
    weekRows,
    unassignedRows,
    missingRows,
    stats: {
      today: todayRows.length,
      tomorrow: tomorrowRows.length,
      thisWeek: weekRows.length,
      unassigned: unassignedRows.length,
      missingActivity: missingRows.length,
      activeClocks: normalizeObjectArray(timeEntries).filter((entry) => !entry.archivedAt && entry.clockInAt && !entry.clockOutAt).length,
    },
  };
}

export function scheduleUniqueRows(rows = []) {
  const seen = new Set();
  return normalizeObjectArray(rows).filter((row) => {
    const key = scheduleRowKey(row);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function scheduleRowKey(row = {}) {
  return `${row.job?.id || "job"}-${row.dateKey || "unscheduled"}`;
}

export function scheduleRowTone(row) {
  if (row?.tone === "red") return "red";
  if (row?.tone === "amber") return "amber";
  const status = normalizeJobStatus(row?.job?.status || row?.job?.stage);
  if (status === "in_progress") return "blue";
  if (status === "scheduled" || status === "planned") return "blue";
  return "green";
}
