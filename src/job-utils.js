export const JOB_STATUS_OPTIONS = ["draft", "planned", "scheduled", "in_progress", "field_complete", "completed", "billing_ready", "closed"];

const LEGACY_STATUS_MAP = {
  scheduled: "scheduled",
  "in progress": "in_progress",
  "field complete": "field_complete",
  waiting: "planned",
  "billing ready": "billing_ready",
  "ready to bill": "billing_ready",
  complete: "completed",
};

export function normalizeJobStatus(status) {
  const normalized = String(status || "").trim().toLowerCase();
  return LEGACY_STATUS_MAP[normalized] || normalized || "scheduled";
}

export function jobStatusLabel(status) {
  const labels = {
    draft: "Draft",
    planned: "Planned",
    scheduled: "Scheduled",
    in_progress: "In Progress",
    field_complete: "Field Complete",
    completed: "Completed",
    billing_ready: "Billing Ready",
    closed: "Closed",
    archived: "Archived",
  };

  return labels[normalizeJobStatus(status)] || "Scheduled";
}

export function jobTitle(job) {
  return job?.title || job?.job || "Untitled job";
}

export function jobNextStep(job) {
  return job?.nextStep || job?.next || "No next step";
}

export function jobScheduleLabel(job) {
  if (!job?.scheduledStart) return "Unscheduled";
  return job.scheduledStart;
}

export function isArchivedJob(job) {
  return Boolean(job?.archivedAt) || normalizeJobStatus(job?.status) === "archived";
}

function startOfToday(now = new Date()) {
  const next = new Date(now);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfToday(now = new Date()) {
  const next = startOfToday(now);
  next.setDate(next.getDate() + 1);
  next.setMilliseconds(-1);
  return next;
}

function endOfThisWeek(now = new Date()) {
  const next = endOfToday(now);
  next.setDate(next.getDate() + 6);
  next.setHours(23, 59, 59, 999);
  return next;
}

export function matchesJobDateFilter(job, dateFilter, now = new Date()) {
  if (dateFilter === "All dates") return true;
  if (!job?.scheduledStart) {
    return dateFilter === "Unscheduled";
  }

  const scheduled = new Date(job.scheduledStart);
  if (Number.isNaN(scheduled.getTime())) {
    return dateFilter === "Unscheduled";
  }

  const dayStart = startOfToday(now);
  const dayEnd = endOfToday(now);
  const weekEnd = endOfThisWeek(now);
  const closedStatuses = new Set(["completed", "billing_ready", "closed"]);

  if (dateFilter === "Today") {
    return scheduled >= dayStart && scheduled <= dayEnd;
  }

  if (dateFilter === "This Week") {
    return scheduled >= dayStart && scheduled <= weekEnd;
  }

  if (dateFilter === "Upcoming") {
    return scheduled > dayEnd;
  }

  if (dateFilter === "Overdue") {
    return scheduled < dayStart && !closedStatuses.has(normalizeJobStatus(job.status));
  }

  return true;
}

export function filterJobs(jobs, {
  status = "All",
  query = "",
  customer = "All customers",
  foremanId = "All foremen",
  date = "All dates",
} = {}) {
  const safeJobs = Array.isArray(jobs) ? jobs : [];
  const normalizedQuery = String(query || "").trim().toLowerCase();

  return safeJobs.filter((job) => {
    const archived = isArchivedJob(job);
    const normalizedStatus = normalizeJobStatus(job.status || job.stage);
    const matchesArchive = status === "Archived" ? archived : !archived;
    const matchesStatus = status === "All" || status === "Archived"
      ? true
      : normalizedStatus === normalizeJobStatus(status);
    const matchesCustomer = customer === "All customers"
      ? true
      : (job.customerId || job.customer) === customer;
    const matchesForeman = foremanId === "All foremen"
      ? true
      : (job.assignedForemanId || "") === foremanId;
    const matchesDate = matchesJobDateFilter(job, date);
    const haystack = [
      jobTitle(job),
      job.customer,
      job.address,
      job.siteContact,
      job.scopeSummary,
      jobNextStep(job),
    ].filter(Boolean).join(" ").toLowerCase();
    const matchesQuery = normalizedQuery ? haystack.includes(normalizedQuery) : true;

    return matchesArchive && matchesStatus && matchesCustomer && matchesForeman && matchesDate && matchesQuery;
  });
}

export function deriveJobListState(jobs, filters = {}, users = []) {
  const safeJobs = Array.isArray(jobs) ? jobs : [];
  const safeUsers = Array.isArray(users) ? users : [];
  const filteredJobs = filterJobs(safeJobs, filters);
  const customerOptions = Array.from(new Map(
    safeJobs
      .filter((job) => !isArchivedJob(job))
      .map((job) => [(job.customerId || job.customer), { value: job.customerId || job.customer, label: job.customer }]),
  ).values()).sort((left, right) => left.label.localeCompare(right.label));

  const foremanOptions = Array.from(new Map(
    safeJobs
      .filter((job) => job.assignedForemanId)
      .map((job) => {
        const matchedUser = safeUsers.find((user) => user.id === job.assignedForemanId);
        return [job.assignedForemanId, { value: job.assignedForemanId, label: matchedUser?.name || job.assignedForemanId }];
      }),
  ).values()).sort((left, right) => left.label.localeCompare(right.label));

  return {
    filteredJobs,
    customerOptions,
    foremanOptions,
  };
}
