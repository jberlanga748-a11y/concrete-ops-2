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

function toText(value) {
  return String(value || "").trim();
}

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

function hasJobHandoffIntent(job = {}) {
  const haystack = [
    job.nextStep,
    job.scopeSummary,
    job.fieldNotes,
    job.notes,
    job.prePourChecklist?.statusLabel,
    job.postPourChecklist?.statusLabel,
  ].map(toText).join(" ").toLowerCase();

  return /\b(handoff|field|crew|foreman|photo|proof|report|upload|ticket|checklist|ready to bill|ready-to-bill)\b/.test(haystack);
}

function hasAssignedCrew(job = {}) {
  return Boolean(
    toText(job.assignedForemanId)
      || toText(job.crew)
      || Number(job.crewSizeNeeded || 0) > 0
      || (Array.isArray(job.assignments) && job.assignments.length > 0),
  );
}

export function deriveJobPilotHandoffReadiness(job = {}) {
  const normalizedStatus = normalizeJobStatus(job.status || job.stage);
  const proofReadyStatuses = new Set(["field_complete", "completed", "billing_ready", "closed"]);
  const fieldStartedStatuses = new Set(["in_progress", "field_complete", "completed", "billing_ready", "closed"]);
  const hasLocation = Boolean(toText(job.address) || toText(job.city) || toText(job.location));
  const hasSchedule = Boolean(toText(job.scheduledStart));
  const hasScope = Boolean(toText(job.scopeSummary));
  const hasCrew = hasAssignedCrew(job);
  const fieldVisible = Boolean(job.fieldPlanningVisible || job.visibleToForeman || toText(job.fieldNotes) || fieldStartedStatuses.has(normalizedStatus));
  const proofPath = proofReadyStatuses.has(normalizedStatus) || hasJobHandoffIntent(job);
  const safetyContext = Boolean(toText(job.safetyNotes) || job.prePourChecklist?.statusLabel || fieldStartedStatuses.has(normalizedStatus));

  const steps = [
    {
      id: "schedule",
      label: "Schedule",
      complete: hasSchedule,
      helper: hasSchedule ? "Start time is set for dispatch." : "Set the scheduled start before field handoff.",
      nextAction: "Set schedule",
    },
    {
      id: "location",
      label: "Jobsite",
      complete: hasLocation,
      helper: hasLocation ? "Jobsite location is visible." : "Add address, city, or site location.",
      nextAction: "Add jobsite",
    },
    {
      id: "scope",
      label: "Scope",
      complete: hasScope,
      helper: hasScope ? "Scope summary is ready for office and field review." : "Add the concrete scope summary.",
      nextAction: "Add scope",
    },
    {
      id: "crew",
      label: "Crew",
      complete: hasCrew,
      helper: hasCrew ? "Crew or foreman assignment context is present." : "Assign a foreman, crew, or crew size.",
      nextAction: "Assign crew",
    },
    {
      id: "field-handoff",
      label: "Field handoff",
      complete: fieldVisible,
      helper: fieldVisible ? "Field-facing planning context is visible." : "Add field notes or make planning visible to foreman.",
      nextAction: "Prepare field handoff",
    },
    {
      id: "proof",
      label: "Proof path",
      complete: proofPath,
      helper: proofPath ? "Photo/report/proof path is visible." : "Name the first photo, report, ticket, or proof action.",
      nextAction: "Name proof action",
    },
    {
      id: "safety",
      label: "Safety",
      complete: safetyContext,
      helper: safetyContext ? "Safety or pre-pour context is present." : "Add safety notes or pre-pour context.",
      nextAction: "Add safety context",
    },
  ];

  const readyCount = steps.filter((step) => step.complete).length;
  const nextStep = steps.find((step) => !step.complete) || null;
  const statusLabel = readyCount === steps.length
    ? "Field-ready"
    : readyCount >= 5
      ? "Nearly ready"
      : "Needs handoff";

  return {
    status: statusLabel,
    tone: statusLabel === "Field-ready" ? "green" : statusLabel === "Nearly ready" ? "amber" : "blue",
    readyCount,
    totalCount: steps.length,
    steps,
    nextAction: nextStep?.nextAction || "Start field work",
    summary: nextStep
      ? `${readyCount} of ${steps.length} field handoff checkpoints are ready. ${nextStep.helper}`
      : "Job has enough context for schedule, field handoff, proof capture, and owner follow-up.",
  };
}
