import { getStartupCriticalWarnings, normalizeJobStartupFields } from "../shared/jobStartup.js";
import { deriveDailySourceCheckState } from "../shared/leadSources.js";
import { deriveFollowUpQueueState } from "./follow-up-queue-utils.js";

const CLOSED_JOB_STATUSES = new Set(["archived", "cancelled", "canceled", "complete", "completed", "closed"]);
const REVIEW_DRAFT_STATUSES = new Set(["imported", "needs review", "ready to create job"]);
const OPEN_REPORT_STATUSES = new Set(["draft", "reopened"]);
const REVIEW_REPORT_STATUSES = new Set(["submitted", "pending review", "needs review"]);
const CLOSED_CHECKLIST_STATUSES = new Set(["archived", "complete", "completed", "done", "reviewed"]);
const CLOSED_CHANGE_ORDER_STATUSES = new Set(["approved", "rejected", "declined", "cancelled", "canceled", "closed", "completed", "archived"]);
const CUSTOMER_MATCH_REVIEW_STATUSES = new Set(["not checked", "possible match", "review required", "new customer needed"]);

export function deriveCommandCenterState(source = {}, options = {}) {
  const todayKey = dateKey(options.today || new Date());
  const tomorrowKey = addDaysKey(todayKey, 1);
  const jobs = asArray(source.jobs).filter(isLiveJob);
  const estimates = asArray(source.estimates).filter((estimate) => !isArchived(estimate));
  const reports = asArray(source.dailyReports).filter((report) => !isArchived(report));
  const uploads = asArray(source.uploads).filter((upload) => !isArchived(upload));
  const prePourChecklists = asArray(source.prePourChecklists).filter((checklist) => !isArchived(checklist));
  const postPourChecklists = asArray(source.postPourChecklists).filter((checklist) => !isArchived(checklist));
  const deliveryTickets = asArray(source.deliveryTickets).filter((ticket) => !isArchived(ticket));
  const timeEntries = asArray(source.timeEntries).filter((entry) => !isArchived(entry));
  const changeOrderRequests = asArray(source.changeOrderRequests).filter((request) => !isArchived(request));
  const leadSourceChecks = deriveDailySourceCheckState(source.leadSources || [], { today: todayKey });
  const followUpQueue = deriveFollowUpQueueState({
    leads: source.leads || [],
    customers: source.customers || [],
    estimates: source.estimates || [],
    leadSources: source.leadSources || [],
    contactHistory: source.contactHistory || [],
  }, { today: todayKey, companyId: options.companyId || source.currentCompanyId || "" });

  const importedDraftsNeedingReview = asArray(source.jobDraftImports)
    .filter((draft) => !draft.createdJobId && REVIEW_DRAFT_STATUSES.has(normalizeStatus(draft.importStatus || draft.status)))
    .map((draft) => ({
      ...draft,
      actionPath: draft.id ? `/imported-drafts/${encodeURIComponent(draft.id)}` : "/imported-drafts",
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
  const scheduledTodayJobs = jobs.filter((job) => dateKey(scheduledDateValue(job)) === todayKey);
  const scheduledTomorrowJobs = jobs.filter((job) => dateKey(scheduledDateValue(job)) === tomorrowKey);
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
  const jobsReadyToBill = jobs.filter((job) => normalizeStatus(job.status || job.stage) === "billing ready");
  const approvedEstimatesReadyToConvert = estimates.filter((estimate) => normalizeStatus(estimate.status) === "approved" && !recordJobId(estimate));
  const sentEstimatesWaiting = estimates.filter((estimate) => normalizeStatus(estimate.status) === "sent");
  const draftEstimates = estimates.filter((estimate) => normalizeStatus(estimate.status) === "draft");
  const fieldProofGaps = openDailyReports.length
    + dailyReportsNeedingReview.length
    + activeJobsMissingTodayReport.length
    + jobsMissingPhotos.length
    + pendingDeliveryTickets.length
    + pendingPrePour.length
    + pendingPostPour.length;
  const reviewQueueItems = dailyReportsNeedingReview.length
    + openChangeOrders.length
    + importedDraftsNeedingReview.length
    + allTimeIssues.length
    + pendingPostPour.length;
  const moneyReadyItems = jobsReadyToBill.length + approvedEstimatesReadyToConvert.length;

  const result = {
    generatedForDate: todayKey,
    stats: {
      importedDraftsNeedingReview: importedDraftsNeedingReview.length,
      importedDraftsNeedingCustomerMatch: importedDraftsNeedingCustomerMatch.length,
      leadSourcesDueToday: leadSourceChecks.stats.dueToday,
      overdueLeadSources: leadSourceChecks.stats.overdue,
      sourceChecksNeeded: leadSourceChecks.stats.checksNeeded,
      followUpsDueToday: followUpQueue.stats.dueToday,
      overdueFollowUps: followUpQueue.stats.overdue,
      waitingFollowUps: followUpQueue.stats.waiting,
      leadsNotContacted: followUpQueue.stats.notContacted,
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
      jobsReadyToBill: jobsReadyToBill.length,
      approvedEstimatesReadyToConvert: approvedEstimatesReadyToConvert.length,
      sentEstimatesWaiting: sentEstimatesWaiting.length,
      draftEstimates: draftEstimates.length,
      fieldProofGaps,
      reviewQueueItems,
      moneyReadyItems,
      scheduledTodayJobs: scheduledTodayJobs.length,
      scheduledTomorrowJobs: scheduledTomorrowJobs.length,
    },
    importedDraftsNeedingReview,
    importedDraftsNeedingCustomerMatch,
    schedule: {
      scheduledTodayJobs,
      scheduledTomorrowJobs,
    },
    leadSourceChecks,
    followUpQueue,
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
  return {
    ...result,
    watchtowerActions: deriveWatchtowerActions(result),
  };
}

export function deriveWatchtowerActions(commandCenter = {}) {
  const stats = commandCenter.stats || {};
  const actions = [];

  function addAction({ id, count, priority, title, description, moduleId, tone = "amber", icon = "alert", actionLabel = "Review" }) {
    const numericCount = Number(count || 0);
    if (numericCount <= 0) return;
    actions.push({
      id,
      count: numericCount,
      priority,
      title,
      description,
      moduleId,
      tone,
      icon,
      actionLabel,
    });
  }

  addAction({
    id: "overdue-follow-ups",
    count: Number(stats.overdueFollowUps || 0) + Number(stats.overdueLeadSources || 0),
    priority: 10,
    title: "Clear overdue follow-ups",
    description: "Leads, customers, estimates, or lead sources are past due and can stall revenue.",
    moduleId: "leads",
    tone: "red",
    icon: "clock",
    actionLabel: "Open follow-ups",
  });
  addAction({
    id: "job-startup-blockers",
    count: Number(stats.jobsNeedingStartupReview || 0) + Number(stats.jobsMissingCrew || 0) + Number(stats.jobsMissingStartDate || 0),
    priority: 20,
    title: "Unblock job startup",
    description: "Jobs need startup review, crew assignment, or a start date before field work is clean.",
    moduleId: "jobs",
    tone: "amber",
    icon: "briefcase",
    actionLabel: "Open jobs",
  });
  addAction({
    id: "field-proof-gaps",
    count: Number(stats.openDailyReports || 0) + Number(stats.dailyReportsNeedingReview || 0) + Number(stats.jobsMissingPhotos || 0),
    priority: 30,
    title: "Close proof-of-work gaps",
    description: "Daily reports, review items, or photos need attention before the office can trust the day.",
    moduleId: "reports",
    tone: "amber",
    icon: "document",
    actionLabel: "Open reports",
  });
  addAction({
    id: "concrete-closeout-gaps",
    count: Number(stats.pendingDeliveryTickets || 0) + Number(stats.pendingPrePourChecklists || 0) + Number(stats.pendingPostPourChecklists || 0),
    priority: 40,
    title: "Review concrete readiness",
    description: "Tickets or pour checklists are still incomplete and need field or office follow-up.",
    moduleId: "deliveryTickets",
    tone: "blue",
    icon: "clipboard",
    actionLabel: "Open tickets",
  });
  addAction({
    id: "time-issues",
    count: stats.timeIssues,
    priority: 50,
    title: "Review crew time issues",
    description: "Active clocks or time entries without a job need owner review before payroll or job costing later.",
    moduleId: "time",
    tone: "blue",
    icon: "clock",
    actionLabel: "Open time",
  });
  addAction({
    id: "change-orders",
    count: stats.openChangeOrders,
    priority: 60,
    title: "Review change orders",
    description: "Open change requests need approval, rejection, or follow-up before scope drifts.",
    moduleId: "changeOrders",
    tone: "amber",
    icon: "refresh",
    actionLabel: "Open change orders",
  });
  addAction({
    id: "imported-drafts",
    count: Number(stats.importedDraftsNeedingReview || 0) + Number(stats.importedDraftsNeedingCustomerMatch || 0),
    priority: 70,
    title: "Review imported drafts",
    description: "Imported work needs office review or customer matching before it becomes a real job.",
    moduleId: "jobDraftImports",
    tone: "slate",
    icon: "database",
    actionLabel: "Open drafts",
  });

  return actions.sort((left, right) => left.priority - right.priority || left.title.localeCompare(right.title)).slice(0, 5);
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

function addDaysKey(value, days = 0) {
  if (!value) return "";
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return "";
  parsed.setUTCDate(parsed.getUTCDate() + Number(days || 0));
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
