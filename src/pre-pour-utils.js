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

export function derivePrePourItems(items = [], { includeArchived = false } = {}) {
  return (Array.isArray(items) ? items : [])
    .filter((item) => includeArchived || !item.archivedAt)
    .sort((left, right) => {
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

    const items = Array.isArray(checklist.items) ? checklist.items : [];
    const haystack = [
      checklist.notes,
      checklist.job?.title,
      checklist.job?.customer,
      checklist.createdByName,
      checklist.completedByName,
      ...items.flatMap((item) => [item.label, item.notes]),
    ].filter(Boolean).join(" ").toLowerCase();

    return haystack.includes(query);
  });
}

export function derivePrePourChecklistListState(checklists = [], jobs = []) {
  const rows = Array.isArray(checklists) ? checklists : [];
  const jobOptions = ["All jobs", ...new Set(rows.map((checklist) => checklist.job?.title || checklist.jobTitle).filter(Boolean))];
  const foremanOptions = ["All foremen", ...new Set(rows.map((checklist) => checklist.job?.foremanAssignment?.userName || checklist.assignedForemanName).filter(Boolean))];
  const dateOptions = ["All dates", ...new Set(rows.map((checklist) => String(checklist.createdAt || checklist.completedAt || "").slice(0, 10)).filter(Boolean))];
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
  const items = Array.isArray(checklist?.items) ? checklist.items : [];
  const completedCount = items.filter((item) => item.status === "checked" || item.status === "not_applicable").length;
  const incompleteCount = items.filter((item) => item.status === "unchecked").length;
  return {
    totalCount: items.length,
    completedCount,
    incompleteCount,
  };
}
