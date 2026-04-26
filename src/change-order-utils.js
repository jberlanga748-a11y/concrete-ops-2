export function changeOrderStatusLabel(status = "requested") {
  const labels = {
    requested: "Requested",
    under_review: "Under Review",
    approved_for_pricing: "Approved for Pricing",
    rejected: "Rejected",
    archived: "Archived",
  };
  return labels[String(status || "").trim().toLowerCase()] || "Requested";
}

export function filterChangeOrderRequests(requests = [], {
  status = "All",
  job = "All jobs",
  requestedBy = "All requesters",
  date = "All dates",
  archived = "Active",
  search = "",
} = {}) {
  const query = String(search || "").trim().toLowerCase();
  return (requests || []).filter((request) => {
    const isArchived = Boolean(request.archivedAt);
    if (archived === "Active" && isArchived) return false;
    if (archived === "Archived" && !isArchived) return false;
    if (status !== "All" && changeOrderStatusLabel(request.status) !== status) return false;
    if (job !== "All jobs" && (request.job?.title || "") !== job) return false;
    if (requestedBy !== "All requesters" && (request.requestedByName || "") !== requestedBy) return false;
    if (date !== "All dates" && String(request.createdAt || "").slice(0, 10) !== date) return false;
    if (!query) return true;

    const haystack = [
      request.reason,
      request.scopeDescription,
      request.fieldNotes,
      request.officeNotes,
      request.job?.title,
      request.job?.customer,
      request.requestedByName,
    ].join(" ").toLowerCase();

    return haystack.includes(query);
  });
}

export function deriveChangeOrderListState(requests = [], jobs = []) {
  const safeRequests = Array.isArray(requests) ? requests : [];
  const safeJobs = Array.isArray(jobs) ? jobs : [];
  return {
    jobOptions: ["All jobs", ...new Set([
      ...safeRequests.map((request) => request.job?.title).filter(Boolean),
      ...safeJobs.map((job) => job.title).filter(Boolean),
    ])],
    requesterOptions: ["All requesters", ...new Set(safeRequests.map((request) => request.requestedByName).filter(Boolean))],
    dateOptions: ["All dates", ...new Set(safeRequests.map((request) => String(request.createdAt || "").slice(0, 10)).filter(Boolean))],
  };
}
