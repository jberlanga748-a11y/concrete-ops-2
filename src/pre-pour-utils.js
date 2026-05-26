function safeChecklistItems(items) {
  return Array.isArray(items) ? items : [];
}

function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function buildChecklistSearchText(checklist) {
  const fragments = [
    checklist?.notes,
    checklist?.job?.title,
    checklist?.job?.customer,
    checklist?.createdByName,
    checklist?.completedByName,
  ];

  for (const item of safeChecklistItems(checklist?.items)) {
    if (item?.label) fragments.push(item.label);
    if (item?.notes) fragments.push(item.notes);
  }

  return fragments.filter(Boolean).join(" ").toLowerCase();
}

export function prePourChecklistStatusLabel(status = "draft") {
  const labels = {
    draft: "Draft",
    completed: "Completed",
    reviewed: "Reviewed",
    reopened: "Reopened",
    archived: "Archived",
  };
  return labels[String(status || "draft").trim().toLowerCase()] || "Draft";
}

export function prePourItemStatusLabel(status = "unchecked") {
  const labels = {
    unchecked: "Unchecked",
    checked: "Checked",
    not_applicable: "Not Applicable",
  };
  return labels[String(status || "unchecked").trim().toLowerCase()] || "Unchecked";
}

export function prePourChecklistOwner(checklist) {
  return checklist?.job?.foremanAssignment?.userName || checklist?.assignedForemanName || checklist?.completedByName || checklist?.createdByName || "Unassigned";
}

export function prePourChecklistUpdated(checklist) {
  return checklist?.completedAt || checklist?.updatedAt || checklist?.createdAt;
}

export function prePourItemTone(status) {
  if (status === "checked") return "green";
  if (status === "not_applicable") return "slate";
  return "amber";
}

export function derivePrePourItems(items = [], { includeArchived = false } = {}) {
  const visibleItems = [];
  for (const item of safeChecklistItems(items)) {
    if (includeArchived || !item.archivedAt) {
      visibleItems.push(item);
    }
  }

  return visibleItems.sort((left, right) => {
      const leftChecked = left.status === "checked" || left.status === "not_applicable";
      const rightChecked = right.status === "checked" || right.status === "not_applicable";
      if (leftChecked !== rightChecked) return Number(leftChecked) - Number(rightChecked);
      return String(left.label || left.key || "").localeCompare(String(right.label || right.key || ""));
    });
}

export function filterPrePourChecklists(checklists = [], {
  status = "All",
  job = "All jobs",
  foreman = "All foremen",
  date = "All dates",
  archived = "Active",
  search = "",
} = {}) {
  const query = String(search || "").trim().toLowerCase();

  return (Array.isArray(checklists) ? checklists : []).filter((checklist) => {
    const isArchived = Boolean(checklist.archivedAt) || String(checklist.status || "").toLowerCase() === "archived";
    if (archived === "Active" && isArchived) return false;
    if (archived === "Archived" && !isArchived) return false;
    if (status !== "All" && String(checklist.statusLabel || checklist.status || "") !== status) return false;
    if (job !== "All jobs" && String(checklist.job?.title || checklist.jobTitle || checklist.jobId || "") !== job) return false;
    if (foreman !== "All foremen" && String(checklist.job?.foremanAssignment?.userName || checklist.assignedForemanName || checklist.assignedForemanId || "") !== foreman) return false;
    if (date !== "All dates" && String(checklist.createdAt || checklist.completedAt || "").slice(0, 10) !== date) return false;

    if (!query) return true;

    return buildChecklistSearchText(checklist).includes(query);
  });
}

export function derivePrePourChecklistListState(checklists = [], jobs = []) {
  const rows = Array.isArray(checklists) ? checklists : [];
  const jobOptionSet = new Set();
  const foremanOptionSet = new Set();
  const dateOptionSet = new Set();

  for (const checklist of rows) {
    const jobName = checklist?.job?.title || checklist?.jobTitle;
    const foremanName = checklist?.job?.foremanAssignment?.userName || checklist?.assignedForemanName;
    const dateValue = String(checklist?.createdAt || checklist?.completedAt || "").slice(0, 10);
    if (jobName) jobOptionSet.add(jobName);
    if (foremanName) foremanOptionSet.add(foremanName);
    if (dateValue) dateOptionSet.add(dateValue);
  }

  const jobOptions = ["All jobs", ...jobOptionSet];
  const foremanOptions = ["All foremen", ...foremanOptionSet];
  const dateOptions = ["All dates", ...dateOptionSet];
  const defaultJobId = (Array.isArray(jobs) ? jobs : []).length === 1 ? jobs[0].id : "";

  return {
    rows,
    jobOptions,
    foremanOptions,
    dateOptions,
    defaultJobId,
  };
}

export function summarizePrePourChecklist(checklist) {
  let totalCount = 0;
  let completedCount = 0;
  let incompleteCount = 0;

  for (const item of safeChecklistItems(checklist?.items)) {
    totalCount += 1;
    if (item.status === "checked" || item.status === "not_applicable") {
      completedCount += 1;
    } else if (item.status === "unchecked") {
      incompleteCount += 1;
    }
  }

  return {
    totalCount,
    completedCount,
    incompleteCount,
  };
}

function prePourJobLabel(checklist = {}) {
  return checklist?.job?.title || checklist?.jobTitle || checklist?.jobId || "Job unavailable";
}

function prePourOwnerLabel(checklist = {}) {
  return checklist?.job?.foremanAssignment?.userName
    || checklist?.assignedForemanName
    || checklist?.createdByName
    || checklist?.createdBy
    || "Field user";
}

function prePourDateLabel(checklist = {}) {
  return String(checklist?.updatedAt || checklist?.completedAt || checklist?.reviewedAt || checklist?.createdAt || "").slice(0, 10) || "No date";
}

function prePourSupportScopeLabel(user = {}, permissions = {}) {
  if (permissions?.prePour?.canManageAll) return "all visible company Pre-Pour checklists";
  if (permissions?.prePour?.canManage || permissions?.prePour?.canComplete) return "assigned job Pre-Pour checklists";
  return `${String(user?.role || "role").trim() || "role"} visible Pre-Pour checklists`;
}

function prePourNeedsAttention(checklist = {}) {
  const status = String(checklist?.status || "").trim().toLowerCase();
  const summary = summarizePrePourChecklist(checklist);
  return status === "completed" || status === "draft" || status === "reopened" || summary.incompleteCount > 0;
}

function prePourSupportPriorityItems(checklists = [], limit = 3) {
  return (Array.isArray(checklists) ? checklists : [])
    .filter((checklist) => !checklist?.archivedAt && String(checklist?.status || "").toLowerCase() !== "archived")
    .map((checklist) => {
      const status = String(checklist?.status || "").trim().toLowerCase();
      const summary = summarizePrePourChecklist(checklist);
      if (status === "completed") {
        return { label: prePourJobLabel(checklist), reason: "Completed by field and waiting for office review", priority: 1 };
      }
      if (summary.incompleteCount > 0) {
        return { label: prePourJobLabel(checklist), reason: `${summary.incompleteCount} readiness item${summary.incompleteCount === 1 ? "" : "s"} still open`, priority: 2 };
      }
      if (status === "reopened") {
        return { label: prePourJobLabel(checklist), reason: "Reopened for field follow-up", priority: 3 };
      }
      if (status === "draft") {
        return { label: prePourJobLabel(checklist), reason: "Draft checklist still in field completion", priority: 4 };
      }
      return null;
    })
    .filter(Boolean)
    .sort((left, right) => left.priority - right.priority || left.label.localeCompare(right.label))
    .slice(0, limit);
}

export function buildPrePourSupportContext({
  user = {},
  permissions = {},
  visibleRows = [],
  selectedChecklist = null,
  filters = {},
  visibleJobs = [],
} = {}) {
  const safeRows = Array.isArray(visibleRows) ? visibleRows : [];
  const activeRows = safeRows.filter((checklist) => !checklist?.archivedAt && String(checklist?.status || "").toLowerCase() !== "archived");
  const completedCount = safeRows.filter((checklist) => String(checklist?.status || "").toLowerCase() === "completed").length;
  const reviewedCount = safeRows.filter((checklist) => String(checklist?.status || "").toLowerCase() === "reviewed").length;
  const draftOrReopenedCount = safeRows.filter((checklist) => ["draft", "reopened"].includes(String(checklist?.status || "").toLowerCase())).length;
  const archivedCount = safeRows.filter((checklist) => checklist?.archivedAt || String(checklist?.status || "").toLowerCase() === "archived").length;
  const openItemCount = safeRows.reduce((sum, checklist) => sum + summarizePrePourChecklist(checklist).incompleteCount, 0);
  const needsAttentionCount = safeRows.filter(prePourNeedsAttention).length;
  const selectedSummary = summarizePrePourChecklist(selectedChecklist);
  const selectedText = selectedChecklist
    ? [
      `${prePourJobLabel(selectedChecklist)} is ${prePourChecklistStatusLabel(selectedChecklist.status)}`,
      `owner ${prePourOwnerLabel(selectedChecklist)}`,
      `updated ${prePourDateLabel(selectedChecklist)}`,
      `${selectedSummary.completedCount}/${selectedSummary.totalCount} readiness items clear`,
      `${selectedSummary.incompleteCount} open`,
    ].join("; ")
    : "No Pre-Pour checklist selected.";
  const reviewItems = prePourSupportPriorityItems(activeRows);
  const reviewText = reviewItems.length
    ? reviewItems.map((item) => `${item.label}: ${item.reason}`).join("; ")
    : "No visible Pre-Pour checklist has completed, draft, reopened, or open-readiness follow-up in this view.";
  const filterText = [
    `status ${filters.status || "All"}`,
    `archive ${filters.archived || "Active"}`,
    `job ${filters.job || "All jobs"}`,
    `foreman ${filters.foreman || "All foremen"}`,
    `date ${filters.date || "All dates"}`,
    filters.search ? `search "${filters.search}"` : "",
  ].filter(Boolean).join("; ");

  return {
    workflow: "Tickets / checklists",
    blockerLevel: completedCount || openItemCount || draftOrReopenedCount ? "Slowing work down" : "Not a blocker",
    followUpNeeded: completedCount || openItemCount || draftOrReopenedCount ? "Manual Pre-Pour readiness review" : "Pre-Pour checklist workflow question",
    summary: [
      `Pre-Pour support request for ${String(user?.name || user?.email || "workspace user").trim() || "workspace user"}.`,
      `Scope: ${prePourSupportScopeLabel(user, permissions)}.`,
      `Current filters: ${filterText}.`,
      `Visible checklists: ${safeRows.length}; active: ${activeRows.length}; completed for review: ${completedCount}; reviewed ready: ${reviewedCount}; draft or reopened: ${draftOrReopenedCount}; open readiness items: ${openItemCount}; needing attention: ${needsAttentionCount}; archived in view: ${archivedCount}.`,
      `Selected checklist: ${selectedText}`,
    ].join(" "),
    expected: "Keep Pre-Pour readiness review tied to visible jobs only, without exposing estimate pricing, margin, payroll, internal job notes, hidden users, unrelated jobs, GPS coordinates, customer notifications, or automation.",
    workaround: `Visible job options: ${pluralize(Array.isArray(visibleJobs) ? visibleJobs.length : 0, "job")}. Review queue in this view: ${reviewText}`,
  };
}
