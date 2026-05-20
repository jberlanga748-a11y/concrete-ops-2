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

function recordJobId(record = {}) {
  return String(record?.jobId || record?.job?.id || "").trim();
}

function jobLabel(job = {}, fallback = "General checklist") {
  return String(job?.title || job?.label || job?.job || job?.jobTitle || job?.customer || fallback).trim() || fallback;
}

function checklistIssueCounts(checklist = {}) {
  const items = Array.isArray(checklist.items) ? checklist.items : [];
  const missingFromItems = items.filter((item) => String(item?.status || "").toLowerCase() === "missing").length;
  const damagedFromItems = items.filter((item) => String(item?.status || "").toLowerCase() === "damaged").length;

  return {
    missing: Number(checklist.missingItemCount || 0) || missingFromItems,
    damaged: Number(checklist.damagedItemCount || 0) || damagedFromItems,
    totalItems: items.filter((item) => !item?.archivedAt).length,
  };
}

export function deriveToolChecklistJobReadiness(checklists = [], jobs = [], { maxJobs = 4 } = {}) {
  const safeChecklists = Array.isArray(checklists) ? checklists : [];
  const safeJobs = Array.isArray(jobs) ? jobs : [];
  const jobMap = new Map(safeJobs.map((job) => [String(job?.id || "").trim(), job]));
  const jobSummaries = new Map();
  let activeChecklists = 0;
  let submittedChecklists = 0;
  let reviewedChecklists = 0;
  let unlinkedChecklists = 0;
  let missingItems = 0;
  let damagedItems = 0;
  let emptyChecklists = 0;

  safeChecklists.forEach((checklist) => {
    const status = String(checklist?.status || "draft").trim().toLowerCase();
    if (checklist?.archivedAt || status === "archived") return;

    activeChecklists += 1;
    if (status === "submitted") submittedChecklists += 1;
    if (status === "reviewed") reviewedChecklists += 1;
    const counts = checklistIssueCounts(checklist);
    missingItems += counts.missing;
    damagedItems += counts.damaged;
    if (!counts.totalItems) emptyChecklists += 1;

    const jobId = recordJobId(checklist);
    if (!jobId) {
      unlinkedChecklists += 1;
      return;
    }

    const job = jobMap.get(jobId) || checklist?.job || {};
    const summary = jobSummaries.get(jobId) || {
      jobId,
      label: checklist?.jobTitle || jobLabel(job, jobId),
      checklists: 0,
      submitted: 0,
      reviewed: 0,
      missing: 0,
      damaged: 0,
      empty: 0,
      blockers: [],
      tone: "slate",
    };

    summary.checklists += 1;
    if (status === "submitted") summary.submitted += 1;
    if (status === "reviewed") summary.reviewed += 1;
    summary.missing += counts.missing;
    summary.damaged += counts.damaged;
    if (!counts.totalItems) summary.empty += 1;
    jobSummaries.set(jobId, summary);
  });

  const jobRows = Array.from(jobSummaries.values()).map((summary) => {
    if (summary.damaged) summary.blockers.push(`${summary.damaged} damaged item${summary.damaged === 1 ? "" : "s"}`);
    if (summary.missing) summary.blockers.push(`${summary.missing} missing item${summary.missing === 1 ? "" : "s"}`);
    if (summary.empty) summary.blockers.push(`${summary.empty} empty checklist${summary.empty === 1 ? "" : "s"}`);
    if (summary.submitted && summary.reviewed < summary.submitted) summary.blockers.push(`${summary.submitted - summary.reviewed} awaiting review`);
    return {
      ...summary,
      tone: summary.damaged ? "red" : summary.missing || summary.empty ? "amber" : summary.submitted > summary.reviewed ? "blue" : "green",
    };
  }).sort((left, right) => right.damaged - left.damaged || right.missing - left.missing || right.empty - left.empty || right.submitted - left.submitted || left.label.localeCompare(right.label));

  const blockedJobs = jobRows.filter((row) => row.blockers.length > 0).length;

  return {
    activeChecklists,
    submittedChecklists,
    reviewedChecklists,
    unlinkedChecklists,
    missingItems,
    damagedItems,
    emptyChecklists,
    blockedJobs,
    topJobs: jobRows.slice(0, maxJobs),
    status: unlinkedChecklists
      ? "Unlinked loadouts need review"
      : damagedItems
        ? "Damaged tools blocking dispatch"
        : missingItems
          ? "Missing tools blocking dispatch"
          : emptyChecklists
            ? "Loadout items needed"
            : submittedChecklists > reviewedChecklists
              ? "Loadouts awaiting review"
              : activeChecklists
                ? "Tool loadouts ready"
                : "No active loadouts",
    tone: unlinkedChecklists || missingItems || emptyChecklists ? "amber" : damagedItems ? "red" : submittedChecklists > reviewedChecklists ? "blue" : activeChecklists ? "green" : "slate",
    nextAction: unlinkedChecklists
      ? "Link loadouts to jobs"
      : damagedItems
        ? "Resolve damaged tools"
        : missingItems
          ? "Resolve missing tools"
          : emptyChecklists
            ? "Add checklist items"
            : submittedChecklists > reviewedChecklists
              ? "Review submitted loadouts"
              : activeChecklists
                ? "Ready for dispatch review"
                : "Create a loadout",
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
