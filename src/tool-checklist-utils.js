export function toolChecklistStatusLabel(status = "draft") {
  const labels = {
    draft: "Draft",
    active: "Active",
    submitted: "Submitted",
    reviewed: "Reviewed",
    archived: "Archived",
  };
  return labels[String(status || "draft").trim().toLowerCase()] || "Draft";
}

export function toolChecklistItemStatusLabel(status = "needed") {
  const labels = {
    needed: "Needed",
    loaded: "Loaded",
    on_site: "On Site",
    missing: "Missing",
    damaged: "Damaged",
    returned: "Returned",
    not_needed: "Not Needed",
  };
  return labels[String(status || "needed").trim().toLowerCase()] || "Needed";
}

export function filterToolChecklists(checklists = [], {
  status = "All",
  job = "All jobs",
  foreman = "All foremen",
  archived = "Active",
  missingDamaged = "All items",
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

    const items = Array.isArray(checklist.items) ? checklist.items : [];
    const hasMissing = items.some((item) => item.status === "missing");
    const hasDamaged = items.some((item) => item.status === "damaged");
    if (missingDamaged === "Missing only" && !hasMissing) return false;
    if (missingDamaged === "Damaged only" && !hasDamaged) return false;
    if (missingDamaged === "Missing or damaged" && !hasMissing && !hasDamaged) return false;

    if (!query) return true;

    const haystack = [
      checklist.title,
      checklist.notes,
      checklist.job?.title,
      checklist.job?.customer,
      checklist.createdByName,
      checklist.assignedForemanName,
      ...items.flatMap((item) => [item.name, item.notes, item.missingNotes, item.damagedNotes]),
    ].join(" ").toLowerCase();

    return haystack.includes(query);
  });
}

export function deriveToolChecklistListState(checklists = [], jobs = []) {
  const rows = Array.isArray(checklists) ? checklists : [];
  const jobOptions = ["All jobs", ...new Set(rows.map((checklist) => checklist.job?.title || checklist.jobTitle).filter(Boolean))];
  const foremanOptions = ["All foremen", ...new Set(rows.map((checklist) => checklist.job?.foremanAssignment?.userName || checklist.assignedForemanName).filter(Boolean))];
  const defaultJobId = (Array.isArray(jobs) ? jobs : []).length === 1 ? jobs[0].id : "";

  return {
    rows,
    jobOptions,
    foremanOptions,
    defaultJobId,
  };
}

export function deriveChecklistItems(items = [], { includeArchived = false } = {}) {
  return (Array.isArray(items) ? items : [])
    .filter((item) => includeArchived || !item.archivedAt)
    .sort((left, right) => {
      const statusCompare = Number(right.status === "missing" || right.status === "damaged") - Number(left.status === "missing" || left.status === "damaged");
      if (statusCompare !== 0) return statusCompare;
      return String(left.name || "").localeCompare(String(right.name || ""));
    });
}
