import { getStartupCriticalWarnings, normalizeJobStartupFields } from "../shared/jobStartup.js";
import { deriveDailySourceCheckState } from "../shared/leadSources.js";

const CLOSED_JOB_STATUSES = new Set(["archived", "cancelled", "canceled", "complete", "completed", "closed"]);
const REVIEW_DRAFT_STATUSES = new Set(["imported", "needs review", "ready to create job"]);
const OPEN_REPORT_STATUSES = new Set(["draft", "reopened"]);
const REVIEW_REPORT_STATUSES = new Set(["submitted", "pending review", "needs review"]);
const CLOSED_CHECKLIST_STATUSES = new Set(["archived", "complete", "completed", "done", "reviewed"]);
const CLOSED_CHANGE_ORDER_STATUSES = new Set(["approved", "rejected", "declined", "cancelled", "canceled", "closed", "completed", "archived"]);
const CUSTOMER_MATCH_REVIEW_STATUSES = new Set(["not checked", "possible match", "review required", "new customer needed"]);

export function deriveCommandCenterState(source = {}, options = {}) {
  const todayKey = dateKey(options.today || new Date());
  const jobs = asArray(source.jobs).filter(isLiveJob);
  const reports = asArray(source.dailyReports).filter((report) => !isArchived(report));
  const uploads = asArray(source.uploads).filter((upload) => !isArchived(upload));
  const prePourChecklists = asArray(source.prePourChecklists).filter((checklist) => !isArchived(checklist));
  const postPourChecklists = asArray(source.postPourChecklists).filter((checklist) => !isArchived(checklist));
  const deliveryTickets = asArray(source.deliveryTickets).filter((ticket) => !isArchived(ticket));
  const timeEntries = asArray(source.timeEntries).filter((entry) => !isArchived(entry));
  const changeOrderRequests = asArray(source.changeOrderRequests).filter((request) => !isArchived(request));
  const leadSourceChecks = deriveDailySourceCheckState(source.leadSources || [], { today: todayKey });

  const importedDraftsNeedingReview = asArray(source.jobDraftImports)
    .filter((draft) => !draft.createdJobId && REVIEW_DRAFT_STATUSES.has(normalizeStatus(draft.importStatus || draft.status)))
    .map((draft) => ({
      ...draft,
      actionPath: draft.id ? `/job-draft-imports/${encodeURIComponent(draft.id)}` : "/job-draft-imports",
    }));
  const importedDraftsNeedingCustomerMatch = importedDraftsNeedingReview.filter((draft) => (
    CUSTOMER_MATCH_REVIEW_STATUSES.has(normalizeStatus(draft.customerMatchStatus))
  ));

  const startupJobs = jobs.map((job) => {
    const startup = normalizeJobStartupFields(job);
    const startupWarnings = getStartupCriticalWarnings(startup.startupChecklist);
    return {
      ...job,
      startupChecklist: startup.startupChecklist,
      startupStatus: startup.startupStatus,
      startupWarnings,
      actionPath: job.id ? `/jobs/${encodeURIComponent(job.id)}` : "/jobs",
    };
  });

  const jobsNeedingStartupReview = startupJobs.filter((job) => (
    ["Not Started", "In Progress", "Needs Review"].includes(job.startupStatus) || job.startupWarnings.length > 0
  ));
  const jobsReadyForField = startupJobs.filter((job) => job.startupStatus === "Ready for Field");
  const jobsMissingCrew = jobs.filter((job) => !hasCrewAssignment(job));
  const jobsMissingStartDate = jobs.filter((job) => !scheduledDateValue(job));
  const jobsMissingCrewOrStartDate = uniqueById([...jobsMissingCrew, ...jobsMissingStartDate]).map((job) => ({
    ...job,
    missingCrew: !hasCrewAssignment(job),
    missingStartDate: !scheduledDateValue(job),
  }));

  const openDailyReports = reports.filter((report) => OPEN_REPORT_STATUSES.has(normalizeStatus(report.status)));
  const dailyReportsNeedingReview = reports.filter((report) => REVIEW_REPORT_STATUSES.has(normalizeStatus(report.status)));
  const todaysReportJobIds = new Set(reports.filter((report) => dateKey(report.reportDate || report.date || report.createdAt) === todayKey).map(recordJobId).filter(Boolean));
  const activeJobsMissingTodayReport = jobs.filter((job) => !todaysReportJobIds.has(job.id));

  const uploadedJobIds = new Set(uploads.map(recordJobId).filter(Boolean));
  const jobsMissingPhotos = jobs.filter((job) => !uploadedJobIds.has(job.id));
  const recentUploads = uploads
    .slice()
    .sort((left, right) => timeValue(right.uploadedAt || right.createdAt || right.updatedAt) - timeValue(left.uploadedAt || left.createdAt || left.updatedAt));

  const pendingPrePour = prePourChecklists.filter((checklist) => !CLOSED_CHECKLIST_STATUSES.has(normalizeStatus(checklist.status)));
  const pendingPostPour = postPourChecklists.filter((checklist) => !CLOSED_CHECKLIST_STATUSES.has(normalizeStatus(checklist.status)));
  const pendingDeliveryTickets = deliveryTickets.filter((ticket) => {
    const status = normalizeStatus(ticket.status);
    if (!status) return true;
    return !CLOSED_CHECKLIST_STATUSES.has(status) && status !== "delivered";
  });

  const activeTimeEntries = timeEntries.filter((entry) => normalizeStatus(entry.status) === "active" || Boolean(entry.clockInAt && !entry.clockOutAt));
  const timeEntriesWithoutJob = timeEntries.filter((entry) => !recordJobId(entry));
  const allTimeIssues = uniqueById([...activeTimeEntries, ...timeEntriesWithoutJob]);
  const openChangeOrders = changeOrderRequests.filter((request) => !CLOSED_CHANGE_ORDER_STATUSES.has(normalizeStatus(request.status)));

  return {
    generatedForDate: todayKey,
    stats: {
      importedDraftsNeedingReview: importedDraftsNeedingReview.length,
      importedDraftsNeedingCustomerMatch: importedDraftsNeedingCustomerMatch.length,
      leadSourcesDueToday: leadSourceChecks.stats.dueToday,
      overdueLeadSources: leadSourceChecks.stats.overdue,
      sourceChecksNeeded: leadSourceChecks.stats.checksNeeded,
      jobsNeedingStartupReview: jobsNeedingStartupReview.length,
      jobsReadyForField: jobsReadyForField.length,
      jobsMissingCrew: jobsMissingCrew.length,
      jobsMissingStartDate: jobsMissingStartDate.length,
      openDailyReports: openDailyReports.length,
      dailyReportsNeedingReview: dailyReportsNeedingReview.length,
      jobsMissingPhotos: jobsMissingPhotos.length,
      pendingPrePourChecklists: pendingPrePour.length,
      pendingPostPourChecklists: pendingPostPour.length,
      pendingDeliveryTickets: pendingDeliveryTickets.length,
      openChangeOrders: openChangeOrders.length,
      timeIssues: allTimeIssues.length,
      activeJobs: jobs.length,
    },
    importedDraftsNeedingReview,
    importedDraftsNeedingCustomerMatch,
    leadSourceChecks,
    jobsNeedingStartupReview,
    jobsReadyForField,
    jobsMissingCrew,
    jobsMissingStartDate,
    jobsMissingCrewOrStartDate,
    dailyReports: {
      openDailyReports,
      dailyReportsNeedingReview,
      activeJobsMissingTodayReport,
    },
    uploads: {
      jobsMissingPhotos,
      recentUploads,
    },
    fieldRecords: {
      pendingPrePour,
      pendingPostPour,
      pendingDeliveryTickets,
    },
    timeIssues: {
      activeTimeEntries,
      timeEntriesWithoutJob,
      allTimeIssues,
    },
    changeOrders: {
      openChangeOrders,
    },
  };
}

export function isLiveJob(job = {}) {
  if (!job || isArchived(job)) return false;
  const status = normalizeStatus(job.status || job.stage);
  return !CLOSED_JOB_STATUSES.has(status);
}

function hasCrewAssignment(job = {}) {
  const activeAssignments = asArray(job.assignments).filter((assignment) => !assignment.removedAt);
  return Boolean(
    activeAssignments.length > 0
    || job.assignedForemanId
    || job.assignedUserId
    || job.foremanId
    || asArray(job.crewIds).length > 0
    || asArray(job.assignedCrewIds).length > 0
    || toText(job.crew)
  );
}

function scheduledDateValue(job = {}) {
  return job.scheduledStart || job.scheduledDate || job.startDate || job.startDateTarget || job.due || job.dueDate || "";
}

function recordJobId(record = {}) {
  return record.jobId || record.linkedJobId || record.job?.id || "";
}

function uniqueById(records = []) {
  const seen = new Set();
  return records.filter((record, index) => {
    const key = record?.id || `${record?.jobId || "record"}-${index}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function dateKey(value) {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function timeValue(value) {
  if (!value) return 0;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

function normalizeStatus(value) {
  return toText(value).toLowerCase().replace(/_/g, " ");
}

function isArchived(record = {}) {
  return Boolean(record.archivedAt || record.deletedAt);
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function toText(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}
