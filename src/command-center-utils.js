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
const CLOSED_SAFETY_STATUSES = new Set(["resolved", "closed", "reviewed", "archived"]);
const CLOSED_FOUND_OPPORTUNITY_STATUSES = new Set(["converted", "converted to lead", "dismissed", "rejected", "no fit", "archived"]);
const ROUTEABLE_COMMAND_MODULES = new Set([
  "appHealth",
  "changeOrders",
  "communications",
  "deliveryTickets",
  "estimates",
  "incidents",
  "jobDraftImports",
  "jobs",
  "leads",
  "materialPrep",
  "postPour",
  "prePour",
  "reports",
  "schedule",
  "settings",
  "time",
  "toolChecklist",
  "uploads",
]);

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
  const safetyIncidents = asArray(source.safetyIncidents).filter((incident) => !isArchived(incident));
  const toolChecklists = asArray(source.toolChecklists).filter((checklist) => !isArchived(checklist));
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
  const openSafetyIncidents = safetyIncidents.filter((incident) => !CLOSED_SAFETY_STATUSES.has(normalizeStatus(incident.status)));
  const openToolChecklists = toolChecklists.filter(toolChecklistNeedsAction);

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
    + pendingPostPour.length
    + openSafetyIncidents.length
    + openToolChecklists.length;
  const reviewQueueItems = dailyReportsNeedingReview.length
    + openChangeOrders.length
    + importedDraftsNeedingReview.length
    + allTimeIssues.length
    + pendingPostPour.length
    + openSafetyIncidents.length
    + openToolChecklists.length;
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
      openSafetyIncidents: openSafetyIncidents.length,
      openToolChecklists: openToolChecklists.length,
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
      openSafetyIncidents,
      openToolChecklists,
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
    proofChainSummary: deriveProofChainSummary(result),
    watchtowerActions: deriveWatchtowerActions(result),
    watchtowerQueue: deriveWatchtowerQueue(result),
  };
}

export function deriveProofChainSummary(commandCenter = {}) {
  const stats = commandCenter.stats || {};
  const setupBlockers = Number(stats.jobsNeedingStartupReview || 0)
    + Number(stats.jobsMissingCrew || 0)
    + Number(stats.jobsMissingStartDate || 0);
  const fieldProofBlockers = Number(stats.openDailyReports || 0)
    + Number(stats.dailyReportsNeedingReview || 0)
    + Number(stats.jobsMissingPhotos || 0);
  const materialsBlockers = Number(stats.pendingDeliveryTickets || 0)
    + Number(stats.pendingPrePourChecklists || 0)
    + Number(stats.pendingPostPourChecklists || 0);
  const safetyToolBlockers = Number(stats.openSafetyIncidents || 0)
    + Number(stats.openToolChecklists || 0);
  const timeBlockers = Number(stats.timeIssues || 0);
  const readyForOffice = Number(stats.jobsReadyToBill || 0)
    + Number(stats.approvedEstimatesReadyToConvert || 0);

  const rows = [
    {
      id: "setup",
      label: "Setup",
      value: setupBlockers,
      helper: "Startup, crew, and start-date blockers",
      moduleId: "jobs",
      actionLabel: "Open jobs",
      tone: setupBlockers > 0 ? "amber" : "green",
    },
    {
      id: "field-proof",
      label: "Field proof",
      value: fieldProofBlockers,
      helper: "Daily reports, review items, and photos",
      moduleId: fieldProofBlockers > 0 && Number(stats.jobsMissingPhotos || 0) > Number(stats.dailyReportsNeedingReview || 0) ? "uploads" : "reports",
      actionLabel: "Open proof",
      tone: fieldProofBlockers > 0 ? "amber" : "green",
    },
    {
      id: "materials",
      label: "Tickets / checklists",
      value: materialsBlockers,
      helper: "Delivery tickets plus job prep and closeout checklists",
      moduleId: "deliveryTickets",
      actionLabel: "Open tickets",
      tone: materialsBlockers > 0 ? "blue" : "green",
    },
    {
      id: "safety-tools",
      label: "Safety / tools",
      value: safetyToolBlockers,
      helper: "Safety incidents and tool accountability",
      moduleId: Number(stats.openSafetyIncidents || 0) > 0 ? "incidents" : "toolChecklist",
      actionLabel: Number(stats.openSafetyIncidents || 0) > 0 ? "Open safety" : "Open tools",
      tone: Number(stats.openSafetyIncidents || 0) > 0 ? "red" : safetyToolBlockers > 0 ? "amber" : "green",
    },
    {
      id: "time",
      label: "Time",
      value: timeBlockers,
      helper: "Active clocks and unassigned time entries",
      moduleId: "time",
      actionLabel: "Open time",
      tone: timeBlockers > 0 ? "blue" : "green",
    },
    {
      id: "ready-to-bill",
      label: "Ready",
      value: readyForOffice,
      helper: "Manual ready-to-bill or approved handoff work",
      moduleId: Number(stats.jobsReadyToBill || 0) > 0 ? "jobs" : "estimates",
      actionLabel: Number(stats.jobsReadyToBill || 0) > 0 ? "Open jobs" : "Open estimates",
      tone: readyForOffice > 0 ? "green" : "slate",
    },
  ];
  const blockerRows = rows.filter((row) => row.id !== "ready-to-bill" && Number(row.value || 0) > 0);
  const nextRow = blockerRows[0] || rows.find((row) => row.id === "ready-to-bill") || rows[0];
  const blockerCount = blockerRows.reduce((sum, row) => sum + Number(row.value || 0), 0);

  return {
    status: blockerCount > 0 ? "needs-review" : readyForOffice > 0 ? "ready" : "clear",
    statusLabel: blockerCount > 0 ? "Proof chain needs review" : readyForOffice > 0 ? "Ready work available" : "Proof chain clear",
    blockerCount,
    readyCount: readyForOffice,
    nextAction: nextRow?.actionLabel || "Review chain",
    nextModuleId: nextRow?.moduleId || "jobs",
    rows,
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
    title: "Review job readiness",
    description: "Tickets or job checklists are still incomplete and need field or office follow-up.",
    moduleId: "deliveryTickets",
    tone: "blue",
    icon: "clipboard",
    actionLabel: "Open tickets",
  });
  addAction({
    id: "safety-tool-accountability",
    count: Number(stats.openSafetyIncidents || 0) + Number(stats.openToolChecklists || 0),
    priority: 45,
    title: "Resolve safety and tool issues",
    description: "Safety incidents or tool accountability records need review before closeout.",
    moduleId: stats.openSafetyIncidents ? "incidents" : "toolChecklist",
    tone: stats.openSafetyIncidents ? "red" : "amber",
    icon: "alert",
    actionLabel: stats.openSafetyIncidents ? "Open safety" : "Open tools",
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

export function deriveWatchtowerQueue(commandCenter = {}) {
  const jobsById = new Map(asArray(commandCenter.jobsNeedingStartupReview)
    .concat(asArray(commandCenter.jobsReadyForField))
    .concat(asArray(commandCenter.jobsMissingCrewOrStartDate))
    .concat(asArray(commandCenter.dailyReports?.activeJobsMissingTodayReport))
    .concat(asArray(commandCenter.uploads?.jobsMissingPhotos))
    .filter((job) => job?.id)
    .map((job) => [job.id, job]));
  const rows = [];

  function jobLabel(jobId, fallback = "Job") {
    const job = jobsById.get(jobId) || {};
    return jobTitle(job) || fallback;
  }

  function addRow({ id, priority, title, description, moduleId, tone = "amber", actionLabel = "Review", sourceLabel = "" }) {
    if (!id || !title) return;
    rows.push({
      id,
      priority: Number(priority || 99),
      title,
      description,
      moduleId,
      tone,
      actionLabel,
      sourceLabel,
    });
  }

  for (const job of asArray(commandCenter.jobsMissingCrewOrStartDate)) {
    addRow({
      id: `job:${job.id}:startup`,
      priority: 10,
      title: jobTitle(job),
      description: [job.missingCrew ? "Assign crew" : "", job.missingStartDate ? "Set start date" : ""].filter(Boolean).join(" / ") || "Job startup needs review.",
      moduleId: "jobs",
      tone: "amber",
      actionLabel: "Open job",
      sourceLabel: "Startup",
    });
  }

  for (const report of asArray(commandCenter.dailyReports?.dailyReportsNeedingReview)) {
    addRow({
      id: `report:${report.id}:review`,
      priority: 20,
      title: jobLabel(recordJobId(report), report.title || "Daily report"),
      description: `Daily report is ${report.status || "submitted"} and needs office review.`,
      moduleId: "reports",
      tone: "orange",
      actionLabel: "Review report",
      sourceLabel: "Report",
    });
  }

  for (const job of asArray(commandCenter.dailyReports?.activeJobsMissingTodayReport)) {
    addRow({
      id: `job:${job.id}:missing-report`,
      priority: 30,
      title: jobTitle(job),
      description: "Missing today's daily report.",
      moduleId: "reports",
      tone: "amber",
      actionLabel: "Open reports",
      sourceLabel: "Missing report",
    });
  }

  for (const job of asArray(commandCenter.uploads?.jobsMissingPhotos)) {
    addRow({
      id: `job:${job.id}:missing-photos`,
      priority: 35,
      title: jobTitle(job),
      description: "No photo evidence is attached to this active job.",
      moduleId: "uploads",
      tone: "amber",
      actionLabel: "Open uploads",
      sourceLabel: "Photo proof",
    });
  }

  for (const incident of asArray(commandCenter.fieldRecords?.openSafetyIncidents)) {
    addRow({
      id: `safety:${incident.id}:open`,
      priority: 40,
      title: incident.title || incident.incidentType || jobLabel(recordJobId(incident), "Safety item"),
      description: `Safety status: ${incident.status || "open"}.`,
      moduleId: "incidents",
      tone: "red",
      actionLabel: "Open safety",
      sourceLabel: "Safety",
    });
  }

  for (const checklist of asArray(commandCenter.fieldRecords?.openToolChecklists)) {
    const issueCount = Number(checklist.missingItemCount || 0) + Number(checklist.damagedItemCount || 0);
    addRow({
      id: `tool:${checklist.id}:open`,
      priority: 45,
      title: checklist.title || checklist.name || jobLabel(recordJobId(checklist), "Tool checklist"),
      description: issueCount > 0 ? `${issueCount} missing or damaged tool item${issueCount === 1 ? "" : "s"}.` : `Tool checklist is ${checklist.status || "open"}.`,
      moduleId: "toolChecklist",
      tone: issueCount > 0 ? "amber" : "blue",
      actionLabel: "Open tools",
      sourceLabel: "Tools",
    });
  }

  for (const ticket of asArray(commandCenter.fieldRecords?.pendingDeliveryTickets)) {
    addRow({
      id: `ticket:${ticket.id}:pending`,
      priority: 50,
      title: ticket.ticketNumber || ticket.supplier || jobLabel(recordJobId(ticket), "Delivery ticket"),
      description: `Delivery ticket is ${ticket.status || "pending"} and needs review or completion.`,
      moduleId: "deliveryTickets",
      tone: "blue",
      actionLabel: "Open tickets",
      sourceLabel: "Ticket",
    });
  }

  for (const checklist of asArray(commandCenter.fieldRecords?.pendingPrePour)) {
    addRow({
      id: `prepour:${checklist.id}:pending`,
      priority: 55,
      title: checklist.title || jobLabel(recordJobId(checklist), "Job prep checklist"),
      description: `Job prep status: ${checklist.status || "open"}.`,
      moduleId: "prePour",
      tone: "blue",
      actionLabel: "Open pre-pour",
      sourceLabel: "Job prep",
    });
  }

  for (const checklist of asArray(commandCenter.fieldRecords?.pendingPostPour)) {
    addRow({
      id: `postpour:${checklist.id}:pending`,
      priority: 60,
      title: checklist.title || jobLabel(recordJobId(checklist), "Closeout checklist"),
      description: `Closeout status: ${checklist.status || "open"}.`,
      moduleId: "postPour",
      tone: "blue",
      actionLabel: "Open post-pour",
      sourceLabel: "Closeout",
    });
  }

  for (const entry of asArray(commandCenter.timeIssues?.allTimeIssues)) {
    addRow({
      id: `time:${entry.id || rows.length}:issue`,
      priority: 70,
      title: jobLabel(recordJobId(entry), entry.userName || "Time entry"),
      description: recordJobId(entry) ? "Active clock needs review." : "Time entry is not tied to a job.",
      moduleId: "time",
      tone: "blue",
      actionLabel: "Open time",
      sourceLabel: "Time",
    });
  }

  return rows.sort((left, right) => left.priority - right.priority || left.title.localeCompare(right.title) || left.id.localeCompare(right.id));
}

export function deriveCommandCenterFinishState(source = {}, options = {}) {
  const permissions = source.permissions || {};
  const hasOfficeCommandAccess = Boolean(
    permissions?.jobs?.canManageAll
      || permissions?.leads?.canView
      || permissions?.estimates?.canView
      || permissions?.settings?.canView,
  );
  const isFieldOnly = Boolean(
    permissions?.jobs?.canManageField
      && !permissions?.jobs?.canManageAll
      && !permissions?.leads?.canView
      && !permissions?.estimates?.canView
      && !permissions?.settings?.canView,
  );

  if (!hasOfficeCommandAccess || isFieldOnly) {
    return {
      mode: "command_center_finish_locked",
      canView: false,
      status: "Locked",
      tone: "slate",
      headline: "Command Center is owner/admin only",
      summary: "Field users stay in assigned field workflows and cannot access leads, estimates, pricing, billing, provider setup, AI office tools, or company setup.",
      lanes: [],
      nextActions: [],
      providerSetupNeeds: [],
      guardrails: commandCenterFinishGuardrails(),
    };
  }

  const commandCenter = source.commandCenter || deriveCommandCenterState(source, options);
  const stats = commandCenter.stats || {};
  const canViewEstimates = Boolean(permissions?.estimates?.canView);
  const canViewSettings = Boolean(permissions?.settings?.canView);
  const providerSetupNeeds = deriveProviderSetupNeeds(source, { canViewSettings });
  const liveFoundOpportunities = asArray(source.foundOpportunities)
    .filter((opportunity) => !isArchived(opportunity) && !CLOSED_FOUND_OPPORTUNITY_STATUSES.has(normalizeStatus(opportunity.status || opportunity.reviewStatus)));
  const activeSearchProfiles = asArray(source.opportunitySearchProfiles)
    .filter((profile) => !isArchived(profile) && !["inactive", "paused", "archived"].includes(normalizeStatus(profile.status)));
  const activeLeadSources = asArray(source.leadSources)
    .filter((sourceRecord) => !isArchived(sourceRecord) && !["inactive", "paused", "archived"].includes(normalizeStatus(sourceRecord.status)));

  const salesCount = safeCount(stats.followUpsDueToday)
    + safeCount(stats.overdueFollowUps)
    + safeCount(stats.leadsNotContacted)
    + safeCount(stats.sourceChecksNeeded);
  const operatingCount = safeCount(stats.scheduledTodayJobs)
    + safeCount(stats.scheduledTomorrowJobs)
    + safeCount(stats.jobsMissingCrew)
    + safeCount(stats.jobsMissingStartDate)
    + safeCount(stats.jobsNeedingStartupReview);
  const proofCount = safeCount(stats.fieldProofGaps);
  const billingReadyCount = safeCount(stats.jobsReadyToBill)
    + (canViewEstimates ? safeCount(stats.approvedEstimatesReadyToConvert) : 0);
  const growthCount = safeCount(stats.sourceChecksNeeded)
    + liveFoundOpportunities.length
    + (activeLeadSources.length || activeSearchProfiles.length ? 0 : 1);
  const blockerCount = safeCount(commandCenter.proofChainSummary?.blockerCount)
    + safeCount(stats.openChangeOrders)
    + safeCount(stats.timeIssues);
  const providerSetupCount = providerSetupNeeds.length;
  const totalAttention = salesCount
    + operatingCount
    + proofCount
    + safeCount(stats.reviewQueueItems)
    + billingReadyCount
    + growthCount
    + providerSetupCount;

  const lanes = [
    commandLane({
      id: "attention-today",
      label: "Today",
      value: totalAttention,
      helper: totalAttention ? "Owner/admin decisions to move the day" : "No command blockers waiting",
      moduleId: firstRouteableModule([
        stats.overdueFollowUps || stats.followUpsDueToday || stats.sourceChecksNeeded ? "leads" : "",
        operatingCount ? "schedule" : "",
        proofCount ? commandCenter.proofChainSummary?.nextModuleId : "",
        billingReadyCount ? (stats.jobsReadyToBill ? "jobs" : "estimates") : "",
        providerSetupCount ? providerSetupNeeds[0]?.moduleId : "",
      ], "commandCenter"),
      actionLabel: "Open next",
      tone: totalAttention ? "orange" : "green",
    }),
    commandLane({
      id: "jobs-crew",
      label: "Jobs / crew",
      value: operatingCount,
      helper: `${safeCount(stats.scheduledTodayJobs)} today / ${safeCount(stats.jobsMissingCrew)} crew gaps`,
      moduleId: stats.jobsMissingCrew || stats.jobsMissingStartDate ? "jobs" : "schedule",
      actionLabel: stats.jobsMissingCrew || stats.jobsMissingStartDate ? "Open jobs" : "Open schedule",
      tone: operatingCount ? "blue" : "slate",
    }),
    commandLane({
      id: "proof-report-gaps",
      label: "Proof gaps",
      value: proofCount,
      helper: `${safeCount(stats.dailyReportsNeedingReview)} reports / ${safeCount(stats.jobsMissingPhotos)} photo gaps`,
      moduleId: commandCenter.proofChainSummary?.nextModuleId || "reports",
      actionLabel: "Open proof",
      tone: proofCount ? "amber" : "green",
    }),
    commandLane({
      id: "sales-follow-up",
      label: "Sales follow-up",
      value: salesCount,
      helper: `${safeCount(stats.overdueFollowUps)} overdue / ${safeCount(stats.leadsNotContacted)} not contacted`,
      moduleId: "leads",
      actionLabel: "Open follow-up",
      tone: salesCount ? "orange" : "green",
    }),
    commandLane({
      id: "billing-ready",
      label: "Billing-ready",
      value: billingReadyCount,
      helper: `${safeCount(stats.jobsReadyToBill)} jobs / ${canViewEstimates ? safeCount(stats.approvedEstimatesReadyToConvert) : 0} approved estimates`,
      moduleId: stats.jobsReadyToBill || !canViewEstimates ? "jobs" : "estimates",
      actionLabel: stats.jobsReadyToBill || !canViewEstimates ? "Review jobs" : "Review estimates",
      tone: billingReadyCount ? "green" : "slate",
    }),
    commandLane({
      id: "growth-client-finder",
      label: "Growth / client finder",
      value: growthCount,
      helper: `${liveFoundOpportunities.length} opportunities / ${safeCount(stats.sourceChecksNeeded)} source checks`,
      moduleId: "leads",
      actionLabel: "Open growth work",
      tone: growthCount ? "blue" : "slate",
    }),
    commandLane({
      id: "blockers",
      label: "Blockers",
      value: blockerCount,
      helper: `${safeCount(stats.openChangeOrders)} changes / ${safeCount(stats.timeIssues)} time issues`,
      moduleId: stats.openChangeOrders ? "changeOrders" : commandCenter.proofChainSummary?.nextModuleId || "jobs",
      actionLabel: "Review blockers",
      tone: blockerCount ? "red" : "green",
    }),
    commandLane({
      id: "provider-setup",
      label: "Provider setup",
      value: providerSetupCount,
      helper: providerSetupCount ? providerSetupNeeds[0].title : "Provider-dependent actions are locked",
      moduleId: providerSetupNeeds[0]?.moduleId || "settings",
      actionLabel: providerSetupCount ? providerSetupNeeds[0].actionLabel : "Review setup",
      tone: providerSetupCount ? "amber" : "green",
      setupState: true,
    }),
  ];

  const nextActions = [
    stats.overdueFollowUps || stats.overdueLeadSources ? commandAction({
      id: "clear-overdue-followups",
      priority: 10,
      title: "Clear overdue sales follow-ups",
      description: `${safeCount(stats.overdueFollowUps) + safeCount(stats.overdueLeadSources)} lead, customer, estimate, or source follow-up item${safeCount(stats.overdueFollowUps) + safeCount(stats.overdueLeadSources) === 1 ? "" : "s"} are overdue.`,
      moduleId: "leads",
      actionLabel: "Open Leads",
      tone: "red",
      group: "Sales",
    }) : null,
    stats.sourceChecksNeeded ? commandAction({
      id: "review-client-finder-sources",
      priority: 15,
      title: "Review growth source checks",
      description: `${safeCount(stats.sourceChecksNeeded)} Client Finder source check${safeCount(stats.sourceChecksNeeded) === 1 ? "" : "s"} due or overdue.`,
      moduleId: "leads",
      actionLabel: "Open Client Finder",
      tone: "amber",
      group: "Growth",
    }) : null,
    stats.importedDraftsNeedingReview ? commandAction({
      id: "review-imported-drafts",
      priority: 20,
      title: "Review imported drafts",
      description: `${safeCount(stats.importedDraftsNeedingReview)} imported draft${safeCount(stats.importedDraftsNeedingReview) === 1 ? "" : "s"} need owner/admin review before becoming jobs.`,
      moduleId: "jobDraftImports",
      actionLabel: "Open Drafts",
      tone: "blue",
      group: "Office review",
    }) : null,
    stats.jobsNeedingStartupReview || stats.jobsMissingCrew || stats.jobsMissingStartDate ? commandAction({
      id: "unblock-jobs-and-crew",
      priority: 30,
      title: "Unblock jobs and crew status",
      description: `${safeCount(stats.jobsNeedingStartupReview) + safeCount(stats.jobsMissingCrew) + safeCount(stats.jobsMissingStartDate)} startup, crew, or schedule blocker${safeCount(stats.jobsNeedingStartupReview) + safeCount(stats.jobsMissingCrew) + safeCount(stats.jobsMissingStartDate) === 1 ? "" : "s"} need review.`,
      moduleId: "jobs",
      actionLabel: "Open Jobs",
      tone: "amber",
      group: "Operations",
    }) : null,
    proofCount ? commandAction({
      id: "close-proof-report-gaps",
      priority: 40,
      title: "Close proof and report gaps",
      description: `${proofCount} report, photo, ticket, checklist, safety, or time proof item${proofCount === 1 ? "" : "s"} need attention.`,
      moduleId: commandCenter.proofChainSummary?.nextModuleId || "reports",
      actionLabel: "Open Proof",
      tone: "amber",
      group: "Field proof",
    }) : null,
    stats.openChangeOrders ? commandAction({
      id: "review-change-orders",
      priority: 50,
      title: "Review change orders",
      description: `${safeCount(stats.openChangeOrders)} change order${safeCount(stats.openChangeOrders) === 1 ? "" : "s"} need approval, rejection, pricing, or follow-up review.`,
      moduleId: "changeOrders",
      actionLabel: "Open Changes",
      tone: "orange",
      group: "Blockers",
    }) : null,
    billingReadyCount ? commandAction({
      id: "review-billing-ready-work",
      priority: 60,
      title: "Review billing-ready work",
      description: `${billingReadyCount} job or approved estimate item${billingReadyCount === 1 ? "" : "s"} can move toward manual closeout or job handoff review.`,
      moduleId: stats.jobsReadyToBill || !canViewEstimates ? "jobs" : "estimates",
      actionLabel: stats.jobsReadyToBill || !canViewEstimates ? "Open Jobs" : "Open Estimates",
      tone: "green",
      group: "Money",
    }) : null,
    growthCount && !stats.sourceChecksNeeded ? commandAction({
      id: "review-growth-actions",
      priority: 70,
      title: liveFoundOpportunities.length ? "Review found opportunities" : "Set up client-finder coverage",
      description: liveFoundOpportunities.length
        ? `${liveFoundOpportunities.length} found opportunit${liveFoundOpportunities.length === 1 ? "y" : "ies"} need review-first lead decisions.`
        : "Add lead sources or search profiles so the daily command has client-finder work to review.",
      moduleId: "leads",
      actionLabel: "Open Growth Work",
      tone: liveFoundOpportunities.length ? "blue" : "amber",
      group: "Growth",
    }) : null,
    providerSetupNeeds[0] ? commandAction({
      id: `provider-${providerSetupNeeds[0].id}`,
      priority: 80,
      title: providerSetupNeeds[0].title,
      description: providerSetupNeeds[0].description,
      moduleId: providerSetupNeeds[0].moduleId,
      settingsSectionId: providerSetupNeeds[0].settingsSectionId,
      actionLabel: providerSetupNeeds[0].actionLabel,
      tone: providerSetupNeeds[0].tone,
      group: "Provider setup",
      setupState: true,
    }) : null,
  ].filter(Boolean).sort((left, right) => left.priority - right.priority || left.title.localeCompare(right.title));

  return {
    mode: "command_center_finish_v1",
    canView: true,
    status: totalAttention ? "Needs action" : "Command clear",
    tone: nextActions.some((action) => action.tone === "red") ? "red" : totalAttention ? "amber" : "green",
    headline: nextActions[0]?.title || "Command Center is clear",
    summary: nextActions[0]?.description || "Today, crews, proof, follow-up, billing readiness, growth, blockers, and provider setup are all represented by routed actions.",
    lanes,
    nextActions,
    providerSetupNeeds,
    guardrails: commandCenterFinishGuardrails(),
    metrics: {
      totalAttention,
      salesCount,
      operatingCount,
      proofCount,
      billingReadyCount,
      growthCount,
      blockerCount,
      providerSetupCount,
      routeableActionCount: nextActions.filter((action) => ROUTEABLE_COMMAND_MODULES.has(action.moduleId)).length,
    },
  };
}

function deriveProviderSetupNeeds(source = {}, { canViewSettings = false } = {}) {
  const permissions = source.permissions || {};
  const settings = source.companySettings || {};
  const needs = [];
  const billingProvider = settings.billingProvider || settings.billingProviderSettings || settings.stripeBilling || settings.stripe || settings.paymentProvider || {};
  const billingConfigured = Boolean(billingProvider.configured || billingProvider.connected || billingProvider.accountConnected || billingProvider.accountReference || billingProvider.accountId || billingProvider.connectedAccountId);
  const marketing = settings.marketingProviders || settings.adProviders || settings.ads || settings.advertising || {};
  const adsConfigured = Boolean(marketing.googleAds?.connected || marketing.googleLocalServices?.connected || marketing.metaAds?.connected || marketing.providerConnected || marketing.reportingConnected);
  const communicationProvider = settings.communicationProvider || settings.communicationProviders || settings.emailProvider || {};
  const emailConfigured = Boolean(source.emailSendingConfigured || communicationProvider.emailConfigured || communicationProvider.email?.configured || settings.emailSendingConfigured);
  const integrationsEnabled = Boolean(permissions?.integrations?.canUse);
  const integrations = settings.integrations || settings.integrationProviderSettings || settings.providerIntegrations || {};
  const integrationConfigured = Object.values(integrations || {}).some((value) => value && typeof value === "object" && (value.configured || value.connected || value.enabled || value.accountReference || value.credentialRef));

  function addNeed(need) {
    if (!canViewSettings && need.moduleId === "settings") return;
    needs.push(commandAction({
      priority: need.priority,
      id: need.id,
      title: need.title,
      description: need.description,
      moduleId: need.moduleId,
      settingsSectionId: need.settingsSectionId,
      actionLabel: need.actionLabel,
      tone: need.tone || "amber",
      group: "Provider setup",
      setupState: true,
    }));
  }

  if (!emailConfigured && (permissions?.contactHistory?.canView || permissions?.leads?.canView)) {
    addNeed({
      id: "communications",
      priority: 10,
      title: "Email/SMS provider needs setup",
      description: "Customer messages stay draft/manual until provider, consent, suppression, and human-review gates are configured.",
      moduleId: "communications",
      actionLabel: "Open Communications",
    });
  }

  if (!billingConfigured && canViewSettings) {
    addNeed({
      id: "billing",
      priority: 20,
      title: "Payment provider needs setup",
      description: "Billing-ready work routes to manual review until Stripe or the chosen provider is configured server-side.",
      moduleId: "settings",
      settingsSectionId: "settings-plan-readiness",
      actionLabel: "Open Billing Setup",
    });
  }

  if (!adsConfigured && (permissions?.opportunityScout?.canView || permissions?.leads?.canView)) {
    addNeed({
      id: "ads",
      priority: 30,
      title: "Ad/source provider setup is locked",
      description: "Client Finder can plan sources and budgets, but live ad reporting, publishing, and spend need provider setup.",
      moduleId: "leads",
      actionLabel: "Open Growth Setup",
      tone: "blue",
    });
  }

  if (integrationsEnabled && !integrationConfigured && canViewSettings) {
    addNeed({
      id: "integrations",
      priority: 40,
      title: "Integration providers need setup",
      description: "QuickBooks, Gmail, Calendar, Drive, SMS, maps/weather, e-signature, and ads writes stay locked until configured.",
      moduleId: "settings",
      settingsSectionId: "settings-integrations-command",
      actionLabel: "Open Integrations",
      tone: "slate",
    });
  }

  return needs.sort((left, right) => left.priority - right.priority || left.title.localeCompare(right.title));
}

function commandCenterFinishGuardrails() {
  return [
    "Every action opens an existing Apex HQ tool or a setup state.",
    "Provider-dependent work stays locked until setup and human approval are complete.",
    "No sends, spend, billing, payments, provider writes, job mutation, or hidden GPS runs from Command Center.",
    "Field users remain blocked from office, growth, pricing, billing, settings, provider, and AI office context.",
  ];
}

function commandLane(lane = {}) {
  const action = commandAction({
    id: lane.id,
    title: lane.label,
    description: lane.helper,
    moduleId: lane.moduleId,
    actionLabel: lane.actionLabel,
    tone: lane.tone,
    setupState: lane.setupState,
  });

  return {
    ...lane,
    value: safeCount(lane.value),
    status: safeCount(lane.value) > 0 ? "Needs review" : lane.setupState ? "Locked until setup" : "Clear",
    moduleId: action.moduleId,
    actionLabel: action.actionLabel,
    routeLabel: action.routeLabel,
  };
}

function commandAction(action = {}) {
  const moduleId = ROUTEABLE_COMMAND_MODULES.has(action.moduleId) ? action.moduleId : "jobs";
  return {
    priority: safeCount(action.priority),
    id: action.id || `${moduleId}-${action.title || "action"}`,
    title: action.title || "Open command action",
    description: action.description || "Open the full Apex HQ tool to continue.",
    moduleId,
    settingsSectionId: action.settingsSectionId || "",
    actionLabel: action.actionLabel || "Open",
    routeLabel: routeLabel(moduleId, action.settingsSectionId),
    tone: action.tone || "slate",
    group: action.group || "Command",
    setupState: action.setupState === true,
  };
}

function firstRouteableModule(moduleIds = [], fallback = "jobs") {
  const moduleId = moduleIds.find((candidate) => ROUTEABLE_COMMAND_MODULES.has(candidate));
  return moduleId || (ROUTEABLE_COMMAND_MODULES.has(fallback) ? fallback : "jobs");
}

function routeLabel(moduleId = "", settingsSectionId = "") {
  if (moduleId === "settings" && settingsSectionId === "settings-plan-readiness") return "Settings / Plan Readiness";
  if (moduleId === "settings" && settingsSectionId === "settings-integrations-command") return "Settings / Integrations";
  const labels = {
    appHealth: "App Health",
    changeOrders: "Change Orders",
    communications: "Communications",
    deliveryTickets: "Delivery Tickets",
    estimates: "Estimates",
    incidents: "Safety Incidents",
    jobDraftImports: "Imported Drafts",
    jobs: "Jobs",
    leads: "Leads / Client Finder",
    materialPrep: "Material Prep",
    postPour: "Closeout",
    prePour: "Job Prep",
    reports: "Reports",
    schedule: "Schedule",
    settings: "Settings",
    time: "Time",
    toolChecklist: "Tool Checklist",
    uploads: "Photo Evidence",
  };
  return labels[moduleId] || "Apex HQ";
}

function safeCount(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
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

function jobTitle(job = {}) {
  return job.title || job.name || job.projectName || job.customer || job.customerName || job.address || job.id || "Job";
}

function toolChecklistNeedsAction(checklist = {}) {
  if (!checklist || isArchived(checklist)) return false;
  const status = normalizeStatus(checklist.status);
  if (Number(checklist.missingItemCount || 0) > 0 || Number(checklist.damagedItemCount || 0) > 0) return true;
  if (!status) return false;
  return !CLOSED_CHECKLIST_STATUSES.has(status) && !["submitted", "not applicable"].includes(status);
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
