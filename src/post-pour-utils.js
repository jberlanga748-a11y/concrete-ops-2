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

export function postPourChecklistStatusLabel(status = "draft") {
  const labels = {
    draft: "Draft",
    completed: "Completed",
    reviewed: "Reviewed",
    reopened: "Reopened",
    archived: "Archived",
  };
  return labels[String(status || "draft").trim().toLowerCase()] || "Draft";
}

export function postPourItemStatusLabel(status = "unchecked") {
  const labels = {
    unchecked: "Unchecked",
    checked: "Checked",
    not_applicable: "Not Applicable",
  };
  return labels[String(status || "unchecked").trim().toLowerCase()] || "Unchecked";
}

export function derivePostPourItems(items = [], { includeArchived = false } = {}) {
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

export function filterPostPourChecklists(checklists = [], {
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

export function derivePostPourChecklistListState(checklists = [], jobs = []) {
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

export function summarizePostPourChecklist(checklist) {
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

function postPourJobLabel(checklist = {}) {
  return checklist?.job?.title || checklist?.jobTitle || checklist?.jobId || "Job unavailable";
}

function postPourOwnerLabel(checklist = {}) {
  return checklist?.job?.foremanAssignment?.userName
    || checklist?.assignedForemanName
    || checklist?.createdByName
    || checklist?.createdBy
    || "Field user";
}

function postPourDateLabel(checklist = {}) {
  return String(checklist?.updatedAt || checklist?.completedAt || checklist?.reviewedAt || checklist?.createdAt || "").slice(0, 10) || "No date";
}

function postPourSupportScopeLabel(user = {}, permissions = {}) {
  if (permissions?.postPour?.canManageAll) return "all visible company Post-Pour checklists";
  if (permissions?.postPour?.canManage || permissions?.postPour?.canComplete) return "assigned job Post-Pour checklists";
  return `${String(user?.role || "role").trim() || "role"} visible Post-Pour checklists`;
}

function postPourNeedsAttention(checklist = {}) {
  const status = String(checklist?.status || "").trim().toLowerCase();
  const summary = summarizePostPourChecklist(checklist);
  return status === "completed" || status === "draft" || status === "reopened" || summary.incompleteCount > 0;
}

function postPourSupportPriorityItems(checklists = [], limit = 3) {
  return (Array.isArray(checklists) ? checklists : [])
    .filter((checklist) => !checklist?.archivedAt && String(checklist?.status || "").toLowerCase() !== "archived")
    .map((checklist) => {
      const status = String(checklist?.status || "").trim().toLowerCase();
      const summary = summarizePostPourChecklist(checklist);
      if (status === "completed") {
        return { label: postPourJobLabel(checklist), reason: "Completed by field and waiting for office closeout review", priority: 1 };
      }
      if (summary.incompleteCount > 0) {
        return { label: postPourJobLabel(checklist), reason: `${summary.incompleteCount} closeout item${summary.incompleteCount === 1 ? "" : "s"} still open`, priority: 2 };
      }
      if (status === "reopened") {
        return { label: postPourJobLabel(checklist), reason: "Reopened for field follow-up", priority: 3 };
      }
      if (status === "draft") {
        return { label: postPourJobLabel(checklist), reason: "Draft closeout checklist still in field completion", priority: 4 };
      }
      return null;
    })
    .filter(Boolean)
    .sort((left, right) => left.priority - right.priority || left.label.localeCompare(right.label))
    .slice(0, limit);
}

export function buildPostPourSupportContext({
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
  const openItemCount = safeRows.reduce((sum, checklist) => sum + summarizePostPourChecklist(checklist).incompleteCount, 0);
  const needsAttentionCount = safeRows.filter(postPourNeedsAttention).length;
  const selectedSummary = summarizePostPourChecklist(selectedChecklist);
  const selectedText = selectedChecklist
    ? [
      `${postPourJobLabel(selectedChecklist)} is ${postPourChecklistStatusLabel(selectedChecklist.status)}`,
      `owner ${postPourOwnerLabel(selectedChecklist)}`,
      `updated ${postPourDateLabel(selectedChecklist)}`,
      `${selectedSummary.completedCount}/${selectedSummary.totalCount} closeout items clear`,
      `${selectedSummary.incompleteCount} open`,
    ].join("; ")
    : "No Post-Pour checklist selected.";
  const reviewItems = postPourSupportPriorityItems(activeRows);
  const reviewText = reviewItems.length
    ? reviewItems.map((item) => `${item.label}: ${item.reason}`).join("; ")
    : "No visible Post-Pour checklist has completed, draft, reopened, or open-closeout follow-up in this view.";
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
    followUpNeeded: completedCount || openItemCount || draftOrReopenedCount ? "Manual Post-Pour closeout review" : "Post-Pour checklist workflow question",
    summary: [
      `Post-Pour support request for ${String(user?.name || user?.email || "workspace user").trim() || "workspace user"}.`,
      `Scope: ${postPourSupportScopeLabel(user, permissions)}.`,
      `Current filters: ${filterText}.`,
      `Visible checklists: ${safeRows.length}; active: ${activeRows.length}; completed for review: ${completedCount}; reviewed accepted: ${reviewedCount}; draft or reopened: ${draftOrReopenedCount}; open closeout items: ${openItemCount}; needing attention: ${needsAttentionCount}; archived in view: ${archivedCount}.`,
      `Selected checklist: ${selectedText}`,
    ].join(" "),
    expected: "Keep Post-Pour closeout review tied to visible jobs only, including cleanup, cure, photo, punch, and closeout follow-up without exposing estimate pricing, margins, payroll, internal job notes, hidden users, unrelated jobs, GPS coordinates, customer notifications, automatic messages, or customer data mutation.",
    workaround: `Visible job options: ${pluralize(Array.isArray(visibleJobs) ? visibleJobs.length : 0, "job")}. Review queue in this view: ${reviewText}`,
  };
}
