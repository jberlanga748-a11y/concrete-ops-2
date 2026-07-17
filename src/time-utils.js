function startOfWeek(date) {
  const local = new Date(date);
  const day = local.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  local.setHours(0, 0, 0, 0);
  local.setDate(local.getDate() + offset);
  return local;
}

function endOfWeek(date) {
  const start = startOfWeek(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

function isWithinRange(value, start, end) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.getTime() >= start.getTime() && parsed.getTime() <= end.getTime();
}

function dateInputValue(date) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function parseDateKey(value) {
  const normalized = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return null;
  const parsed = new Date(`${normalized}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  if (parsed.toISOString().slice(0, 10) !== normalized) return null;
  return { key: normalized, date: parsed };
}

function labelForEntry(entry) {
  if (entry.jobTitle) return entry.jobTitle;
  return timeWorkCategoryLabel(entry.workCategory);
}

function recordJobId(record = {}) {
  return String(record?.jobId || record?.job?.id || "").trim();
}

function jobLabel(job = {}, fallback = "Unassigned job") {
  return String(job?.title || job?.job || job?.jobTitle || fallback).trim() || fallback;
}

function timeWorkCategoryLabel(category) {
  return String(category || "other")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function prefixedLocationValue(item = {}, prefix = "", field = "") {
  const prefixedKey = prefix ? `${prefix}${field}` : field.charAt(0).toLowerCase() + field.slice(1);
  return item?.[prefixedKey];
}

export function timeLocationStatusLabel(item = {}, prefix = "") {
  const latitude = prefixedLocationValue(item, prefix, "Latitude");
  const longitude = prefixedLocationValue(item, prefix, "Longitude");
  if (latitude != null && longitude != null) return "Location captured";

  const reason = String(prefixedLocationValue(item, prefix, "LocationUnavailableReason") || "").trim().toLowerCase();
  if (!reason) return "Not requested";
  if (reason.includes("denied")) return "Location denied";
  if (reason.includes("timeout") || reason.includes("timed out")) return "Location timed out";
  return "Location unavailable";
}

export function timeLocationEvidencePayload(prefix, evidence = {}) {
  return {
    [`${prefix}Latitude`]: evidence.latitude ?? null,
    [`${prefix}Longitude`]: evidence.longitude ?? null,
    [`${prefix}LocationAccuracy`]: evidence.locationAccuracy ?? null,
    [`${prefix}LocationCapturedAt`]: evidence.locationCapturedAt || "",
    [`${prefix}LocationUnavailableReason`]: evidence.locationUnavailableReason || "",
  };
}

export function sortTimeEntries(entries) {
  return [...(entries || [])].sort((left, right) => new Date(right.clockInAt).getTime() - new Date(left.clockInAt).getTime());
}

export function findActiveTimeEntry(entries, userId) {
  if (!userId) return null;
  return sortTimeEntries(entries).find((entry) => entry.userId === userId && entry.status !== "completed") || null;
}

export function deriveWeeklySummary(entries, {
  now = new Date(),
  activeEntry = null,
} = {}) {
  const weekStart = startOfWeek(now);
  const weekEnd = endOfWeek(now);
  const weekEntries = sortTimeEntries(entries).filter((entry) => isWithinRange(entry.clockInAt, weekStart, weekEnd));
  const totalMinutes = weekEntries.reduce((sum, entry) => sum + Number(entry.totalMinutes || 0), 0);
  const breakMinutes = weekEntries.reduce((sum, entry) => sum + Number(entry.breakMinutes || 0), 0);

  const dailyMap = new Map();
  const groupMap = new Map();

  weekEntries.forEach((entry) => {
    const date = new Date(entry.clockInAt);
    const dayKey = date.toLocaleDateString("en-US", { weekday: "short" });
    dailyMap.set(dayKey, (dailyMap.get(dayKey) || 0) + Number(entry.totalMinutes || 0));

    const key = labelForEntry(entry);
    groupMap.set(key, (groupMap.get(key) || 0) + Number(entry.totalMinutes || 0));
  });

  const orderedDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label) => ({
    label,
    minutes: dailyMap.get(label) || 0,
  }));

  const grouped = [...groupMap.entries()]
    .map(([label, minutes]) => ({ label, minutes }))
    .sort((left, right) => right.minutes - left.minutes);

  return {
    weekStart,
    weekEnd,
    entries: weekEntries,
    totalMinutes,
    breakMinutes,
    activeEntry,
    dayBreakdown: orderedDays,
    groupedBreakdown: grouped,
  };
}

export function deriveTimeWorkspace(entries, jobs, userId, allowedCategories = [], { now = new Date() } = {}) {
  const safeAllowedCategories = Array.isArray(allowedCategories) ? allowedCategories : [];
  const sortedEntries = sortTimeEntries(entries);
  const ownEntries = sortedEntries.filter((entry) => entry.userId === userId);
  const activeEntry = findActiveTimeEntry(sortedEntries, userId);
  const availableJobs = (jobs || []).filter((job) => !job.archivedAt);
  const allowJobCategory = safeAllowedCategories.includes("job");

  return {
    sortedEntries,
    ownEntries,
    activeEntry,
    availableJobs: allowJobCategory ? availableJobs : [],
    allowedCategories: safeAllowedCategories,
    weeklySummary: deriveWeeklySummary(ownEntries, { activeEntry, now }),
  };
}

export function deriveCrewWeeklySummary(entries, {
  excludeUserId = "",
  now = new Date(),
} = {}) {
  const relevantEntries = (entries || []).filter((entry) => entry.userId !== excludeUserId);
  const weekly = deriveWeeklySummary(relevantEntries, { now });
  const activeUsers = new Set(relevantEntries.filter((entry) => entry.status !== "completed").map((entry) => entry.userId));

  return {
    ...weekly,
    activeUserCount: activeUsers.size,
  };
}

export function deriveTimeJobCostingReadiness(entries = [], jobs = [], {
  reports = [],
  uploads = [],
  deliveryTickets = [],
  maxJobs = 4,
} = {}) {
  const safeEntries = Array.isArray(entries) ? entries : [];
  const safeJobs = Array.isArray(jobs) ? jobs : [];
  const safeReports = Array.isArray(reports) ? reports : [];
  const safeUploads = Array.isArray(uploads) ? uploads : [];
  const safeTickets = Array.isArray(deliveryTickets) ? deliveryTickets : [];
  const jobMap = new Map(safeJobs.map((job) => [String(job?.id || "").trim(), job]));
  const jobSummaries = new Map();
  let unlinkedEntries = 0;
  let activeEntries = 0;
  let completedEntries = 0;
  let totalMinutes = 0;

  safeEntries.forEach((entry) => {
    const jobId = recordJobId(entry);
    const isActive = entry?.status !== "completed";
    const minutes = Number(entry?.totalMinutes || 0);
    if (isActive) activeEntries += 1;
    if (!isActive) completedEntries += 1;
    totalMinutes += minutes;
    if (!jobId) {
      unlinkedEntries += 1;
      return;
    }

    const job = jobMap.get(jobId) || entry?.job || {};
    const summary = jobSummaries.get(jobId) || {
      jobId,
      label: entry?.jobTitle || jobLabel(job, jobId),
      entries: 0,
      activeEntries: 0,
      completedEntries: 0,
      minutes: 0,
      reportCount: 0,
      reviewedReportCount: 0,
      uploadCount: 0,
      ticketCount: 0,
      proofCount: 0,
      gaps: [],
      tone: "slate",
    };

    summary.entries += 1;
    summary.minutes += minutes;
    if (isActive) summary.activeEntries += 1;
    if (!isActive) summary.completedEntries += 1;
    jobSummaries.set(jobId, summary);
  });

  const summaries = Array.from(jobSummaries.values());
  summaries.forEach((summary) => {
    summary.reportCount = safeReports.filter((report) => !report?.archivedAt && recordJobId(report) === summary.jobId).length;
    summary.reviewedReportCount = safeReports.filter((report) => !report?.archivedAt && recordJobId(report) === summary.jobId && String(report?.status || "").toLowerCase() === "reviewed").length;
    summary.uploadCount = safeUploads.filter((upload) => !upload?.archivedAt && recordJobId(upload) === summary.jobId).length;
    summary.ticketCount = safeTickets.filter((ticket) => !ticket?.archivedAt && recordJobId(ticket) === summary.jobId).length;
    summary.proofCount = summary.reportCount + summary.uploadCount + summary.ticketCount;

    if (summary.activeEntries > 0) summary.gaps.push("Active time still running");
    if (summary.completedEntries > 0 && summary.reportCount === 0) summary.gaps.push("No daily report linked");
    if (summary.completedEntries > 0 && summary.uploadCount === 0) summary.gaps.push("No photo proof linked");
    if (summary.completedEntries > 0 && summary.reviewedReportCount === 0) summary.gaps.push("Report not reviewed");
    summary.tone = summary.gaps.length ? (summary.activeEntries ? "blue" : "amber") : "green";
  });

  const proofReadyJobs = summaries.filter((summary) => summary.entries > 0 && summary.gaps.length === 0).length;
  const jobsWithGaps = summaries.filter((summary) => summary.gaps.length > 0).length;
  const topJobs = summaries
    .sort((left, right) => right.gaps.length - left.gaps.length || right.activeEntries - left.activeEntries || right.minutes - left.minutes)
    .slice(0, maxJobs);

  return {
    linkedJobs: summaries.length,
    proofReadyJobs,
    jobsWithGaps,
    activeEntries,
    completedEntries,
    unlinkedEntries,
    totalMinutes,
    topJobs,
    status: unlinkedEntries
      ? "Unlinked time needs review"
      : jobsWithGaps
        ? "Proof review needed"
        : summaries.length
          ? "Time proof-ready"
          : "No job time yet",
    tone: unlinkedEntries ? "amber" : jobsWithGaps ? "blue" : summaries.length ? "green" : "slate",
    nextAction: unlinkedEntries
      ? "Link time to jobs"
      : jobsWithGaps
        ? "Review proof gaps"
        : summaries.length
          ? "Ready for office review"
          : "Clock into a job",
  };
}

export function defaultPayrollPrepPeriod(now = new Date()) {
  const end = new Date(now);
  if (Number.isNaN(end.getTime())) {
    return defaultPayrollPrepPeriod(new Date());
  }
  end.setUTCHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 13);
  return {
    periodStart: dateInputValue(start),
    periodEnd: dateInputValue(end),
  };
}

export function payrollPrepPeriodEntityId(periodStart, periodEnd) {
  return `payroll-prep:${periodStart}:${periodEnd}`;
}

export function normalizePayrollPrepPeriod(input = {}, { now = new Date() } = {}) {
  const defaults = defaultPayrollPrepPeriod(now);
  const startDate = parseDateKey(input.periodStart || defaults.periodStart);
  const endDate = parseDateKey(input.periodEnd || defaults.periodEnd);
  const errors = [];

  if (!startDate) errors.push("Pay period start must be a valid YYYY-MM-DD date.");
  if (!endDate) errors.push("Pay period end must be a valid YYYY-MM-DD date.");
  if (startDate && endDate && startDate.date.getTime() > endDate.date.getTime()) {
    errors.push("Pay period start cannot be after pay period end.");
  }

  if (errors.length) {
    return {
      ok: false,
      errors,
      periodStart: startDate?.key || "",
      periodEnd: endDate?.key || "",
      startAt: "",
      endAt: "",
      entityId: "",
    };
  }

  const endAt = new Date(endDate.date);
  endAt.setUTCHours(23, 59, 59, 999);

  return {
    ok: true,
    errors: [],
    periodStart: startDate.key,
    periodEnd: endDate.key,
    startAt: startDate.date.toISOString(),
    endAt: endAt.toISOString(),
    entityId: payrollPrepPeriodEntityId(startDate.key, endDate.key),
  };
}

function payrollPrepExceptionForEntry(entry = {}) {
  const status = entry.status || "";
  const presenceStatus = entry.jobsitePresenceReview?.status || entry.jobsitePresenceReviewStatus || "";

  if (status !== "completed") {
    return "Clock still active or on break";
  }
  if (!entry.clockOutAt) {
    return "Missing clock-out";
  }
  if (Number(entry.totalMinutes || 0) <= 0) {
    return "Zero-hour entry";
  }
  if ((entry.workCategory || "job") === "job" && !recordJobId(entry)) {
    return "Job time is not linked to a job";
  }
  if (presenceStatus === "needs_review" && entry.jobsitePresenceReviewStatus !== "reviewed") {
    return "Presence review still open";
  }
  return "";
}

function latestPayrollPrepApproval(auditEvents = [], entityId = "") {
  return (auditEvents || [])
    .filter((event) => event?.entityType === "payrollPrep" && event?.entityId === entityId && event?.action === "payroll_ready_approved")
    .sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime())[0] || null;
}

export function derivePayrollPrepState(entries = [], auditEvents = [], input = {}) {
  const period = normalizePayrollPrepPeriod(input);
  if (!period.ok) {
    return {
      period,
      entries: [],
      readyEntries: [],
      exceptions: [],
      employeeSummaries: [],
      readyMinutes: 0,
      breakMinutes: 0,
      approved: false,
      approvalStatus: "invalid_period",
      approvalEvent: null,
      canApprove: false,
      canExport: false,
    };
  }

  const start = new Date(period.startAt);
  const end = new Date(period.endAt);
  const periodEntries = sortTimeEntries(entries)
    .filter((entry) => isWithinRange(entry.clockInAt, start, end))
    .sort((left, right) => {
      const userCompare = String(left.userName || left.userId || "").localeCompare(String(right.userName || right.userId || ""));
      if (userCompare !== 0) return userCompare;
      return new Date(left.clockInAt || 0).getTime() - new Date(right.clockInAt || 0).getTime();
    });

  const exceptions = [];
  const readyEntries = [];
  periodEntries.forEach((entry) => {
    const reason = payrollPrepExceptionForEntry(entry);
    if (reason) {
      exceptions.push({
        id: entry.id,
        userId: entry.userId || "",
        userName: entry.userName || entry.userId || "Field user",
        jobTitle: entry.jobTitle || timeWorkCategoryLabel(entry.workCategory),
        reason,
        clockInAt: entry.clockInAt || "",
        status: entry.status || "",
        // An open (still-clocked-in) entry can be resolved by clocking the worker
        // out; completed-but-flagged entries (zero-hour, unlinked job, presence) cannot.
        active: (entry.status || "") !== "completed",
      });
    } else {
      readyEntries.push(entry);
    }
  });

  // Surface still-clocked-in (clockable) exceptions first so the office can always
  // resolve a stuck clock from the visible list, even when other exceptions exist.
  exceptions.sort((left, right) => Number(Boolean(right.active)) - Number(Boolean(left.active)));

  const employeeMap = new Map();
  readyEntries.forEach((entry) => {
    const key = entry.userId || entry.userName || "unknown";
    const summary = employeeMap.get(key) || {
      userId: entry.userId || "",
      userName: entry.userName || entry.userId || "Field user",
      userRole: entry.userRole || "",
      entries: 0,
      totalMinutes: 0,
      breakMinutes: 0,
    };
    summary.entries += 1;
    summary.totalMinutes += Number(entry.totalMinutes || 0);
    summary.breakMinutes += Number(entry.breakMinutes || 0);
    employeeMap.set(key, summary);
  });

  const latestApproval = latestPayrollPrepApproval(auditEvents, period.entityId);
  const lastEntryUpdate = periodEntries.reduce((latest, entry) => {
    const updatedAt = new Date(entry.updatedAt || entry.createdAt || entry.clockInAt || 0).getTime();
    return Number.isFinite(updatedAt) ? Math.max(latest, updatedAt) : latest;
  }, 0);
  const approvalTime = latestApproval ? new Date(latestApproval.createdAt || 0).getTime() : 0;
  const approvalFresh = Boolean(latestApproval && approvalTime >= lastEntryUpdate);
  const approved = Boolean(approvalFresh && exceptions.length === 0 && readyEntries.length > 0);
  const readyMinutes = readyEntries.reduce((sum, entry) => sum + Number(entry.totalMinutes || 0), 0);
  const breakMinutes = readyEntries.reduce((sum, entry) => sum + Number(entry.breakMinutes || 0), 0);
  const canApprove = readyEntries.length > 0 && readyMinutes > 0 && exceptions.length === 0;

  return {
    period,
    entries: periodEntries,
    readyEntries,
    exceptions,
    employeeSummaries: Array.from(employeeMap.values()).sort((left, right) => left.userName.localeCompare(right.userName)),
    readyMinutes,
    breakMinutes,
    approved,
    approvalStatus: approved
      ? "approved"
      : exceptions.length
        ? "exceptions"
        : latestApproval && !approvalFresh
          ? "stale_after_changes"
          : readyEntries.length
            ? "ready_for_approval"
            : "no_ready_hours",
    approvalEvent: latestApproval,
    canApprove,
    canExport: approved,
  };
}

function csvValue(value) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

function hoursDecimal(minutes) {
  return (Math.round((Number(minutes || 0) / 60) * 100) / 100).toFixed(2);
}

export function buildPayrollPrepCsv(prepState = {}) {
  const period = prepState.period || {};
  const rows = Array.isArray(prepState.readyEntries) ? prepState.readyEntries : [];
  const headers = [
    "pay_period_start",
    "pay_period_end",
    "employee_name",
    "employee_id",
    "employee_role",
    "work_date",
    "work_category",
    "job_id",
    "job_title",
    "clock_in_at",
    "clock_out_at",
    "break_minutes",
    "total_hours",
    "review_status",
    "time_entry_id",
  ];
  const lines = [headers.join(",")];

  rows.forEach((entry) => {
    lines.push([
      period.periodStart || "",
      period.periodEnd || "",
      entry.userName || "",
      entry.userId || "",
      entry.userRole || "",
      dateInputValue(entry.clockInAt),
      timeWorkCategoryLabel(entry.workCategory),
      entry.jobId || "",
      entry.jobTitle || "",
      entry.clockInAt || "",
      entry.clockOutAt || "",
      Number(entry.breakMinutes || 0),
      hoursDecimal(entry.totalMinutes),
      "payroll_ready_reviewed",
      entry.id || "",
    ].map(csvValue).join(","));
  });

  return `${lines.join("\n")}\n`;
}

export function payrollPrepCsvFileName(prepState = {}) {
  const period = prepState.period || {};
  const start = period.periodStart || "period-start";
  const end = period.periodEnd || "period-end";
  return `apex-hq-payroll-prep-${start}-to-${end}.csv`;
}

export function buildTimeTrackingSupportContext({
  user = {},
  permissions = {},
  workspace = {},
  boardRows = [],
  boardSummary = {},
} = {}) {
  const safeRows = Array.isArray(boardRows) ? boardRows : [];
  const safeWorkspace = workspace || {};
  const activeRows = safeRows.filter((entry) => entry.status !== "completed");
  const onBreakRows = safeRows.filter((entry) => entry.status === "on_break");
  const ownActiveEntry = safeWorkspace.activeEntry || null;
  const allowedCategories = Array.isArray(safeWorkspace.allowedCategories) ? safeWorkspace.allowedCategories : [];
  const availableJobs = Array.isArray(safeWorkspace.availableJobs) ? safeWorkspace.availableJobs : [];
  const canViewAll = Boolean(permissions?.time?.canViewAll);
  const canViewCrew = Boolean(permissions?.time?.canViewCrew && !canViewAll);
  const scopeLabel = canViewAll ? "all visible company time" : canViewCrew ? "assigned crew time" : "my own time";
  const totalMinutes = Number(boardSummary?.totalMinutes || 0);
  const breakMinutes = Number(boardSummary?.breakMinutes || 0);
  const allowedCategoryLabel = allowedCategories.length ? allowedCategories.map(timeWorkCategoryLabel).join(", ") : "No self clock categories";
  const activeLabel = ownActiveEntry
    ? `${ownActiveEntry.jobTitle || timeWorkCategoryLabel(ownActiveEntry.workCategory)} (${ownActiveEntry.status || "active"})`
    : "No active personal clock";

  return {
    workflow: "Time tracking",
    blockerLevel: ownActiveEntry ? "Slowing work down" : "Not a blocker",
    followUpNeeded: ownActiveEntry ? "Review active clock if help is needed" : "Manual time tracking review",
    summary: [
      `Time tracking support request for ${String(user?.name || user?.email || "workspace user").trim() || "workspace user"}.`,
      `Scope: ${scopeLabel}.`,
      `Visible entries: ${safeRows.length}. Active visible clocks: ${activeRows.length}. On break: ${onBreakRows.length}.`,
      `Week total: ${formatMinutes(totalMinutes)} worked with ${formatMinutes(breakMinutes)} breaks.`,
      `My active clock: ${activeLabel}.`,
    ].join(" "),
    expected: "Keep the time entry accurate without exposing payroll rates, pricing, margin, or other users outside this role scope.",
    workaround: `Allowed self clock categories: ${allowedCategoryLabel}. Available job options: ${availableJobs.length}. If the right job is missing, contact the office instead of clocking into unrelated work.`,
  };
}

export function formatMinutes(totalMinutes) {
  const normalized = Math.max(0, Number(totalMinutes || 0));
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

export function timeStatusTone(status) {
  if (status === "completed") return "green";
  if (status === "on_break") return "amber";
  return "blue";
}
