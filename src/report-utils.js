import { fieldChecklistNeedsAction, formatJobScheduleDetail } from "./field-format-utils.js";
import { jobTitle, normalizeJobStatus } from "./job-utils.js";

export function normalizeReportStatus(status = "draft") {
  return String(status || "").trim().toLowerCase() || "draft";
}

export function reportStatusLabel(status = "draft") {
  const labels = {
    draft: "Draft",
    submitted: "Submitted",
    reviewed: "Reviewed",
    reopened: "Reopened",
    archived: "Archived",
  };

  return labels[normalizeReportStatus(status)] || "Draft";
}

export function isArchivedReport(report) {
  return Boolean(report?.archivedAt) || normalizeReportStatus(report?.status) === "archived";
}

export function filterDailyReports(reports, {
  status = "All",
  query = "",
  jobId = "All jobs",
  createdBy = "All creators",
  date = "All dates",
} = {}) {
  const normalizedQuery = String(query || "").trim().toLowerCase();

  return (reports || []).filter((report) => {
    const archived = isArchivedReport(report);
    const normalizedStatus = normalizeReportStatus(report.status);
    const matchesArchive = status === "Archived" ? archived : !archived;
    const matchesStatus = status === "All" || status === "Archived"
      ? true
      : normalizedStatus === normalizeReportStatus(status);
    const matchesJob = jobId === "All jobs" ? true : (report.jobId || "") === jobId;
    const matchesCreator = createdBy === "All creators" ? true : (report.createdBy || "") === createdBy;
    const matchesDate = date === "All dates" ? true : (report.reportDate || "") === date;
    const haystack = [
      report.job?.title,
      report.job?.customer,
      report.createdByName,
      report.workPerformed,
      report.crewSummary,
      report.weather,
    ].filter(Boolean).join(" ").toLowerCase();
    const matchesQuery = normalizedQuery ? haystack.includes(normalizedQuery) : true;

    return matchesArchive && matchesStatus && matchesJob && matchesCreator && matchesDate && matchesQuery;
  });
}

export function deriveDailyReportListState(reports) {
  const jobOptions = Array.from(new Map(
    (reports || [])
      .filter((report) => !isArchivedReport(report))
      .map((report) => [report.jobId, { value: report.jobId, label: jobTitle(report.job) }]),
  ).values()).sort((left, right) => left.label.localeCompare(right.label));

  const creatorOptions = Array.from(new Map(
    (reports || [])
      .map((report) => [report.createdBy, { value: report.createdBy, label: report.createdByName || report.createdBy }]),
  ).values()).sort((left, right) => left.label.localeCompare(right.label));

  const dateOptions = Array.from(new Set((reports || []).map((report) => report.reportDate).filter(Boolean))).sort().reverse();

  return {
    jobOptions,
    creatorOptions,
    dateOptions,
  };
}


export function normalizeObjectArray(value, fallback = []) {
  return Array.isArray(value) ? value : fallback;
}

export function todayDateInputValue() {
  return new Date().toISOString().slice(0, 10);
}

export function dailyReportNeedsAction(report) {
  return ["draft", "reopened"].includes(String(report?.status || "").toLowerCase());
}

export function dailyReportNeedsReview(report) {
  return String(report?.status || "").toLowerCase() === "submitted";
}

export function dailyReportConcreteSummary(report) {
  if (report?.concretePoured) {
    const yards = Number(report.yardsPoured || 0);
    return `${yards || 0} yd${yards === 1 ? "" : "s"} poured`;
  }
  return String(report?.materialNotes || "").trim() ? "Materials noted" : "No material notes";
}

export function dailyReportPrimaryNote(report) {
  return report?.workPerformed || report?.crewSummary || report?.delays || report?.safetyNotes || report?.weather || "No field notes yet.";
}

export function dailyReportDateKey(value) {
  if (!value) return "";
  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

export function dailyReportRecordJobId(record = {}) {
  return record.jobId || record.linkedJobId || record.job?.id || "";
}

export function dailyReportRecordDate(record = {}) {
  return dailyReportDateKey(
    record.reportDate
    || record.ticketDate
    || record.deliveredAt
    || record.takenAt
    || record.uploadedAt
    || record.createdAt
    || record.updatedAt
    || record.completedAt
    || record.submittedAt,
  );
}

export function dailyReportIsLiveJob(job = {}) {
  if (!job || job.archivedAt) return false;
  const status = normalizeJobStatus(job.status || job.stage);
  return !["archived", "cancelled", "canceled", "complete", "completed", "closed"].includes(status);
}

export function dailyReportMatchesReport(record = {}, report = {}) {
  const recordReportId = record.reportId || record.dailyReportId;
  if (recordReportId && report.id) return recordReportId === report.id;
  const recordJobId = dailyReportRecordJobId(record);
  const reportJobId = report.jobId || report.job?.id;
  if (!recordJobId || !reportJobId || recordJobId !== reportJobId) return false;
  const recordDate = dailyReportRecordDate(record);
  const reportDate = dailyReportDateKey(report.reportDate || report.createdAt);
  return !recordDate || !reportDate || recordDate === reportDate;
}

export function dailyReportMatchesJobDate(record = {}, job = {}, dateKey = "") {
  const recordJobId = dailyReportRecordJobId(record);
  if (!recordJobId || !job?.id || recordJobId !== job.id) return false;
  const recordDate = dailyReportRecordDate(record);
  return !dateKey || !recordDate || recordDate === dateKey;
}

export function dailyReportCoreMissingItems(report = {}) {
  if (!report) return ["Report"];
  return [
    !report.workPerformed ? "Work notes" : "",
    !report.crewSummary ? "Crew summary" : "",
    !report.weather ? "Weather" : "",
  ].filter(Boolean);
}

export function dailyReportChecklistIsOpen(checklist) {
  if (!checklist) return false;
  return fieldChecklistNeedsAction(checklist);
}

export function deriveDailyReportProofState({
  report,
  job,
  operatingDate,
  uploads = [],
  deliveryTickets = [],
  prePourChecklists = [],
  postPourChecklists = [],
  toolChecklists = [],
  safetyIncidents = [],
}) {
  const targetJob = job || report?.job || {};
  const targetDate = operatingDate || dailyReportDateKey(report?.reportDate || report?.createdAt);
  const photos = normalizeObjectArray(uploads).filter((upload) => (
    report ? dailyReportMatchesReport(upload, report) : dailyReportMatchesJobDate(upload, targetJob, targetDate)
  ));
  const tickets = normalizeObjectArray(deliveryTickets).filter((ticket) => (
    report ? dailyReportMatchesReport(ticket, report) : dailyReportMatchesJobDate(ticket, targetJob, targetDate)
  ));
  const prePour = [
    targetJob?.prePourChecklist,
    ...normalizeObjectArray(prePourChecklists).filter((checklist) => dailyReportMatchesJobDate(checklist, targetJob, "")),
  ].filter(Boolean);
  const postPour = [
    targetJob?.postPourChecklist,
    ...normalizeObjectArray(postPourChecklists).filter((checklist) => dailyReportMatchesJobDate(checklist, targetJob, "")),
  ].filter(Boolean);
  const tools = normalizeObjectArray(toolChecklists).filter((checklist) => dailyReportMatchesJobDate(checklist, targetJob, targetDate));
  const incidents = normalizeObjectArray(safetyIncidents).filter((incident) => dailyReportMatchesJobDate(incident, targetJob, targetDate) && !incident.archivedAt);
  const missingCore = report ? dailyReportCoreMissingItems(report) : ["Daily report"];
  const openChecklistCount = [...prePour, ...postPour, ...tools].filter(dailyReportChecklistIsOpen).length;
  const ticketExpected = Boolean(report?.concretePoured);
  const photoMissing = photos.length === 0;
  const ticketMissing = ticketExpected && tickets.length === 0;
  const gapCount = missingCore.length + (photoMissing ? 1 : 0) + (ticketMissing ? 1 : 0) + openChecklistCount;

  return {
    photoCount: photos.length,
    ticketCount: tickets.length,
    incidentCount: incidents.length,
    missingCore,
    openChecklistCount,
    ticketExpected,
    photoMissing,
    ticketMissing,
    gapCount,
  };
}

export function todayWorkDateKey(value = new Date()) {
  return dailyReportDateKey(value) || todayDateInputValue();
}

export function todayWorkJobDate(job = {}) {
  return dailyReportDateKey(job.scheduledStart || job.startDate || job.startDateTarget || job.dueDate || job.due || "");
}

export function todayWorkTimeValue(job = {}) {
  const parsed = new Date(job.scheduledStart || job.startDate || job.dueDate || "");
  return Number.isNaN(parsed.getTime()) ? Number.MAX_SAFE_INTEGER : parsed.getTime();
}

export function todayWorkCrewAssignments(job = {}) {
  const directAssignments = normalizeObjectArray(job.assignments).filter((assignment) => !assignment.removedAt);
  const crewAssignments = normalizeObjectArray(job.crewAssignments).filter((assignment) => !assignment.removedAt);
  const synthesized = [];
  if (job.assignedForemanId) synthesized.push({ userId: job.assignedForemanId, roleOnJob: "foreman" });
  if (job.assignedUserId) synthesized.push({ userId: job.assignedUserId, roleOnJob: "crew" });
  const byKey = new Map();
  [...directAssignments, ...crewAssignments, ...synthesized].forEach((assignment, index) => {
    const key = assignment.userId || assignment.id || `${assignment.roleOnJob || "crew"}-${index}`;
    if (!byKey.has(key)) byKey.set(key, assignment);
  });
  return Array.from(byKey.values());
}

export function todayWorkCrewCount(job = {}) {
  const assignmentCount = todayWorkCrewAssignments(job).length;
  if (assignmentCount) return assignmentCount;
  const textCrew = String(job.crew || "").trim();
  if (textCrew) return 1;
  return 0;
}

export function todayWorkForemanLabel(job = {}, users = []) {
  if (job.foremanAssignment?.userName) return job.foremanAssignment.userName;
  if (job.assignedForemanName) return job.assignedForemanName;
  if (job.assignedForemanId) {
    const matchedUser = normalizeObjectArray(users).find((user) => user.id === job.assignedForemanId);
    return matchedUser?.name || job.assignedForemanId;
  }
  return "Unassigned";
}

export function todayWorkHasReport(report = {}) {
  return Boolean(report?.id);
}

export function todayWorkChecklistRows(checklists = [], job = {}, dateKey = "", includeDate = true) {
  return normalizeObjectArray(checklists).filter((checklist) => (
    includeDate ? dailyReportMatchesJobDate(checklist, job, dateKey) : dailyReportMatchesJobDate(checklist, job, "")
  ));
}

export function deriveTodayWorkCoordination({
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
  const dateKey = todayWorkDateKey(today);
  const safeJobs = normalizeObjectArray(jobs).filter((job) => dailyReportIsLiveJob(job));
  const safeReports = normalizeObjectArray(dailyReports).filter((report) => !report.archivedAt);
  const safeUploads = normalizeObjectArray(uploads).filter((upload) => !upload.archivedAt);
  const safeTickets = normalizeObjectArray(deliveryTickets).filter((ticket) => !ticket.archivedAt);
  const safeTimeEntries = normalizeObjectArray(timeEntries).filter((entry) => !entry.archivedAt);

  const jobsWithTodayActivity = new Set([
    ...safeReports.filter((report) => dailyReportRecordDate(report) === dateKey).map(dailyReportRecordJobId),
    ...safeUploads.filter((upload) => dailyReportRecordDate(upload) === dateKey).map(dailyReportRecordJobId),
    ...safeTickets.filter((ticket) => dailyReportRecordDate(ticket) === dateKey).map(dailyReportRecordJobId),
    ...safeTimeEntries.filter((entry) => dailyReportRecordDate(entry) === dateKey || (entry.clockInAt && !entry.clockOutAt)).map(dailyReportRecordJobId),
  ].filter(Boolean));

  const todayJobs = safeJobs
    .filter((job) => todayWorkJobDate(job) === dateKey || normalizeJobStatus(job.status || job.stage) === "in_progress" || jobsWithTodayActivity.has(job.id))
    .sort((left, right) => todayWorkTimeValue(left) - todayWorkTimeValue(right));

  const upcomingJobs = safeJobs
    .filter((job) => todayWorkJobDate(job) && todayWorkJobDate(job) > dateKey)
    .sort((left, right) => todayWorkTimeValue(left) - todayWorkTimeValue(right))
    .slice(0, 3);

  const rows = todayJobs.map((job) => {
    const report = safeReports.find((item) => dailyReportMatchesJobDate(item, job, dateKey));
    const proofState = deriveDailyReportProofState({
      report,
      job,
      operatingDate: dateKey,
      uploads: safeUploads,
      deliveryTickets: safeTickets,
      prePourChecklists,
      postPourChecklists,
      toolChecklists,
      safetyIncidents,
    });
    const prePourOpen = [
      job.prePourChecklist,
      ...todayWorkChecklistRows(prePourChecklists, job, dateKey, false),
    ].filter(Boolean).filter(fieldChecklistNeedsAction).length;
    const postPourOpen = [
      job.postPourChecklist,
      ...todayWorkChecklistRows(postPourChecklists, job, dateKey, false),
    ].filter(Boolean).filter(fieldChecklistNeedsAction).length;
    const toolOpen = todayWorkChecklistRows(toolChecklists, job, dateKey).filter(fieldChecklistNeedsAction).length;
    const incidentsOpen = normalizeObjectArray(safetyIncidents).filter((incident) => (
      dailyReportMatchesJobDate(incident, job, dateKey)
      && !incident.archivedAt
      && !/(resolved|closed|reviewed)/i.test(String(incident.status || ""))
    )).length;
    const crewCount = todayWorkCrewCount(job);
    const missing = [
      !job.scheduledStart ? "Schedule" : "",
      !crewCount ? "Crew" : "",
      !todayWorkHasReport(report) ? "Report" : "",
      proofState.photoMissing ? "Photos" : "",
      prePourOpen || postPourOpen || toolOpen ? "Checklist" : "",
      incidentsOpen ? "Incident" : "",
    ].filter(Boolean);

    return {
      job,
      report,
      proofState,
      crewCount,
      foreman: todayWorkForemanLabel(job, users),
      scheduleLabel: formatJobScheduleDetail(job),
      reportLabel: todayWorkHasReport(report) ? reportStatusLabel(report.status) : "Missing report",
      photoCount: proofState.photoCount,
      ticketCount: proofState.ticketCount,
      openWorkflowCount: prePourOpen + postPourOpen + toolOpen + incidentsOpen,
      missing,
      tone: missing.length ? "amber" : "green",
    };
  });

  return {
    dateKey,
    rows,
    upcomingJobs,
    stats: {
      todayJobs: rows.length,
      crewsAssigned: rows.filter((row) => row.crewCount > 0).length,
      missingReports: rows.filter((row) => !todayWorkHasReport(row.report)).length,
      missingPhotos: rows.filter((row) => row.proofState.photoMissing).length,
      openWorkflows: rows.reduce((sum, row) => sum + row.openWorkflowCount, 0),
      activeClocks: safeTimeEntries.filter((entry) => entry.clockInAt && !entry.clockOutAt).length,
    },
  };
}

export function dailyReportProofSummary(proofState) {
  if (!proofState) return "Proof not checked";
  const parts = [`${proofState.photoCount} photo${proofState.photoCount === 1 ? "" : "s"}`];
  if (proofState.ticketExpected || proofState.ticketCount) {
    parts.push(`${proofState.ticketCount} ticket${proofState.ticketCount === 1 ? "" : "s"}`);
  }
  if (proofState.openChecklistCount) {
    parts.push(`${proofState.openChecklistCount} checklist open`);
  }
  return parts.join(" / ");
}

function incrementBreakdown(map, key, label) {
  const normalizedKey = String(key || label || "unknown").trim() || "unknown";
  const normalizedLabel = String(label || key || "Unassigned").trim() || "Unassigned";
  const current = map.get(normalizedKey) || { key: normalizedKey, label: normalizedLabel, count: 0 };
  current.count += 1;
  map.set(normalizedKey, current);
}

function topBreakdown(map, limit) {
  return Array.from(map.values())
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label))
    .slice(0, limit);
}

function isReportMissingBasics(report = {}) {
  return !report.workPerformed || !report.crewSummary || !report.weather;
}

function reportNeedsOfficeAttention(report = {}, proofState = null) {
  const status = normalizeReportStatus(report.status);
  return ["draft", "reopened", "submitted"].includes(status)
    || isReportMissingBasics(report)
    || Number(proofState?.gapCount || 0) > 0;
}

function reportDelayText(report = {}) {
  return String(report.delays || report.delayNotes || report.blockers || "").trim();
}

function reportSafetyText(report = {}) {
  return String(report.safetyNotes || report.safety || report.incidents || "").trim();
}

function reportJobLabel(report = {}) {
  return jobTitle(report.job) || report.jobName || report.jobTitle || report.jobId || "Unassigned job";
}

function reportPriorityItem(report = {}, proofState = null) {
  const status = normalizeReportStatus(report.status);
  const missingBasics = isReportMissingBasics(report);
  const gapCount = Number(proofState?.gapCount || 0);

  if (status === "submitted") {
    return {
      id: report.id,
      label: reportJobLabel(report),
      date: report.reportDate || "",
      creator: report.createdByName || report.createdBy || "Field user",
      reason: "Submitted for office review",
      tone: "orange",
      filter: "Submitted",
      priority: 1,
    };
  }

  if (gapCount > 0) {
    return {
      id: report.id,
      label: reportJobLabel(report),
      date: report.reportDate || "",
      creator: report.createdByName || report.createdBy || "Field user",
      reason: `${gapCount} proof gap${gapCount === 1 ? "" : "s"} before closeout`,
      tone: "amber",
      filter: "All",
      priority: 2,
    };
  }

  if (status === "draft" || status === "reopened") {
    return {
      id: report.id,
      label: reportJobLabel(report),
      date: report.reportDate || "",
      creator: report.createdByName || report.createdBy || "Field user",
      reason: status === "reopened" ? "Reopened for field follow-up" : "Draft still in field completion",
      tone: "amber",
      filter: status === "reopened" ? "Reopened" : "Draft",
      priority: 3,
    };
  }

  if (missingBasics) {
    return {
      id: report.id,
      label: reportJobLabel(report),
      date: report.reportDate || "",
      creator: report.createdByName || report.createdBy || "Field user",
      reason: "Missing work, crew, or weather basics",
      tone: "amber",
      filter: "All",
      priority: 4,
    };
  }

  return null;
}

export function deriveAdvancedReportSummary(reports, {
  proofStateByReportId = new Map(),
  maxBreakdownRows = 3,
  maxReviewQueue = 5,
} = {}) {
  const visibleReports = (reports || []).filter((report) => !isArchivedReport(report));
  const statusCounts = {
    draft: 0,
    submitted: 0,
    reviewed: 0,
    reopened: 0,
  };
  const jobBreakdown = new Map();
  const creatorBreakdown = new Map();
  const dateKeys = [];
  const attentionIds = new Set();
  let concreteReports = 0;
  let missingBasics = 0;
  let proofGaps = 0;
  let closeoutReady = 0;
  let reportsWithDelays = 0;
  let reportsWithSafetyNotes = 0;
  let concreteYards = 0;
  let reportsWithMaterialNotes = 0;
  const reviewQueue = [];

  visibleReports.forEach((report) => {
    const status = normalizeReportStatus(report.status);
    if (Object.prototype.hasOwnProperty.call(statusCounts, status)) statusCounts[status] += 1;
    if (report.concretePoured) {
      concreteReports += 1;
      concreteYards += Number(report.yardsPoured || 0);
    }
    if (String(report.materialNotes || "").trim()) reportsWithMaterialNotes += 1;
    if (reportDelayText(report)) reportsWithDelays += 1;
    if (reportSafetyText(report)) reportsWithSafetyNotes += 1;
    if (isReportMissingBasics(report)) missingBasics += 1;
    const proofState = proofStateByReportId?.get?.(report.id) || null;
    const gapCount = Number(proofState?.gapCount || 0);
    if (gapCount > 0) proofGaps += 1;
    if (status === "reviewed" && !isReportMissingBasics(report) && gapCount === 0) closeoutReady += 1;
    if (reportNeedsOfficeAttention(report, proofState)) attentionIds.add(report.id);
    const priorityItem = reportPriorityItem(report, proofState);
    if (priorityItem) reviewQueue.push(priorityItem);
    if (report.reportDate) dateKeys.push(report.reportDate);
    incrementBreakdown(jobBreakdown, report.jobId || report.job?.id, jobTitle(report.job));
    incrementBreakdown(creatorBreakdown, report.createdBy, report.createdByName || report.createdBy || "Unassigned");
  });

  const sortedDates = Array.from(new Set(dateKeys.filter(Boolean))).sort();
  const firstDate = sortedDates[0] || "";
  const lastDate = sortedDates[sortedDates.length - 1] || "";

  return {
    totalReports: visibleReports.length,
    statusCounts,
    submittedForReview: statusCounts.submitted,
    fieldDrafts: statusCounts.draft + statusCounts.reopened,
    reviewedReports: statusCounts.reviewed,
    concreteReports,
    concreteYards,
    reportsWithMaterialNotes,
    missingBasics,
    proofGaps,
    closeoutReady,
    closeoutReadyRate: visibleReports.length ? Math.round((closeoutReady / visibleReports.length) * 100) : 0,
    needsAttention: attentionIds.size,
    reportsWithDelays,
    reportsWithSafetyNotes,
    dateRangeLabel: firstDate && lastDate
      ? firstDate === lastDate ? firstDate : `${firstDate} to ${lastDate}`
      : "No report dates",
    reviewQueue: reviewQueue
      .sort((left, right) => left.priority - right.priority || String(right.date || "").localeCompare(String(left.date || "")) || left.label.localeCompare(right.label))
      .slice(0, maxReviewQueue),
    topJobs: topBreakdown(jobBreakdown, maxBreakdownRows),
    topCreators: topBreakdown(creatorBreakdown, maxBreakdownRows),
  };
}

function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function reportSupportScopeLabel(user = {}, permissions = {}) {
  if (permissions?.reports?.canManageAll) return "all visible company daily reports";
  if (permissions?.reports?.canReview) return "visible daily reports in this role scope";
  if (permissions?.reports?.canCreate) return "assigned field daily reports";
  return `${String(user?.role || "role").trim() || "role"} visible daily reports`;
}

function proofGapCountForReport(report, proofStateByReportId) {
  if (!report?.id) return 0;
  return Number(proofStateByReportId?.get?.(report.id)?.gapCount || 0);
}

function reportSupportReviewItems(reports = [], proofStateByReportId = new Map(), limit = 3) {
  return (reports || [])
    .map((report) => reportPriorityItem(report, proofStateByReportId?.get?.(report.id) || null))
    .filter(Boolean)
    .sort((left, right) => left.priority - right.priority || String(right.date || "").localeCompare(String(left.date || "")) || left.label.localeCompare(right.label))
    .slice(0, limit);
}

export function buildDailyReportsSupportContext({
  user = {},
  permissions = {},
  visibleRows = [],
  selectedReport = null,
  filters = {},
  proofStateByReportId = new Map(),
} = {}) {
  const safeRows = (Array.isArray(visibleRows) ? visibleRows : []).filter((report) => !isArchivedReport(report));
  const submittedCount = safeRows.filter((report) => normalizeReportStatus(report.status) === "submitted").length;
  const reviewedCount = safeRows.filter((report) => normalizeReportStatus(report.status) === "reviewed").length;
  const draftCount = safeRows.filter((report) => ["draft", "reopened"].includes(normalizeReportStatus(report.status))).length;
  const missingBasicsCount = safeRows.filter(isReportMissingBasics).length;
  const proofGapCount = safeRows.reduce((sum, report) => sum + (proofGapCountForReport(report, proofStateByReportId) > 0 ? 1 : 0), 0);
  const scopeLabel = reportSupportScopeLabel(user, permissions);
  const selectedProofState = selectedReport?.id ? proofStateByReportId?.get?.(selectedReport.id) || null : null;
  const selectedReportText = selectedReport
    ? [
      `${reportJobLabel(selectedReport)} on ${selectedReport.reportDate || "No date"}`,
      `${reportStatusLabel(selectedReport.status)} by ${selectedReport.createdByName || selectedReport.createdBy || "Field user"}`,
      `proof ${pluralize(Number(selectedProofState?.photoCount || 0), "photo")}, ${pluralize(Number(selectedProofState?.ticketCount || 0), "ticket")}, ${pluralize(Number(selectedProofState?.gapCount || 0), "gap")}`,
    ].join("; ")
    : "No report selected.";
  const reviewItems = reportSupportReviewItems(safeRows, proofStateByReportId);
  const reviewQueueText = reviewItems.length
    ? reviewItems.map((item) => `${item.label}: ${item.reason}`).join("; ")
    : "No submitted, draft, reopened, missing-basics, or proof-gap report is visible in this view.";
  const filterText = [
    `status ${filters.status || "All"}`,
    `job ${filters.jobId || "All jobs"}`,
    `creator ${filters.createdBy || "All creators"}`,
    `date ${filters.date || "All dates"}`,
    filters.query ? `search "${filters.query}"` : "",
  ].filter(Boolean).join("; ");

  return {
    workflow: "Daily reports",
    blockerLevel: submittedCount || missingBasicsCount || proofGapCount ? "Slowing work down" : "Not a blocker",
    followUpNeeded: submittedCount || missingBasicsCount || proofGapCount ? "Manual daily report review" : "Daily report workflow question",
    summary: [
      `Daily reports support request for ${String(user?.name || user?.email || "workspace user").trim() || "workspace user"}.`,
      `Scope: ${scopeLabel}.`,
      `Current filters: ${filterText}.`,
      `Visible reports: ${safeRows.length}; submitted for review: ${submittedCount}; draft or reopened: ${draftCount}; reviewed: ${reviewedCount}; missing basics: ${missingBasicsCount}; reports with proof gaps: ${proofGapCount}.`,
      `Selected report: ${selectedReportText}`,
    ].join(" "),
    expected: "Keep daily report capture and review clear using only reports this role can already see, without exposing estimates, pricing, margin, payroll, hidden users, or unrelated jobs.",
    workaround: `Review queue in this view: ${reviewQueueText}`,
  };
}
