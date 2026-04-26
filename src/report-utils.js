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
