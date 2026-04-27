function safeChecklistItems(items) {
  return Array.isArray(items) ? items : [];
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
