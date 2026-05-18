import { jobTitle } from "./job-utils.js";

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
  const reviewQueue = [];

  visibleReports.forEach((report) => {
    const status = normalizeReportStatus(report.status);
    if (Object.prototype.hasOwnProperty.call(statusCounts, status)) statusCounts[status] += 1;
    if (report.concretePoured) {
      concreteReports += 1;
      concreteYards += Number(report.yardsPoured || 0);
    }
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
