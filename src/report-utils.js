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

export function deriveAdvancedReportSummary(reports, {
  proofStateByReportId = new Map(),
  maxBreakdownRows = 3,
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

  visibleReports.forEach((report) => {
    const status = normalizeReportStatus(report.status);
    if (Object.prototype.hasOwnProperty.call(statusCounts, status)) statusCounts[status] += 1;
    if (report.concretePoured) concreteReports += 1;
    if (isReportMissingBasics(report)) missingBasics += 1;
    const proofState = proofStateByReportId?.get?.(report.id) || null;
    const gapCount = Number(proofState?.gapCount || 0);
    if (gapCount > 0) proofGaps += 1;
    if (status === "reviewed" && !isReportMissingBasics(report) && gapCount === 0) closeoutReady += 1;
    if (reportNeedsOfficeAttention(report, proofState)) attentionIds.add(report.id);
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
    missingBasics,
    proofGaps,
    closeoutReady,
    needsAttention: attentionIds.size,
    dateRangeLabel: firstDate && lastDate
      ? firstDate === lastDate ? firstDate : `${firstDate} to ${lastDate}`
      : "No report dates",
    topJobs: topBreakdown(jobBreakdown, maxBreakdownRows),
    topCreators: topBreakdown(creatorBreakdown, maxBreakdownRows),
  };
}
