function includesQuery(values, query) {
  const normalizedQuery = String(query || "").trim().toLowerCase();
  if (!normalizedQuery) return true;
  return values.some((value) => String(value || "").toLowerCase().includes(normalizedQuery));
}

export function deriveActivePpeItems(items = []) {
  return (Array.isArray(items) ? items : [])
    .filter((item) => item && !item.archivedAt && String(item.status || "active").toLowerCase() !== "archived")
    .sort((left, right) => {
      const requiredCompare = Number(Boolean(right.requiredByDefault)) - Number(Boolean(left.requiredByDefault));
      if (requiredCompare !== 0) return requiredCompare;
      return String(left.label || "").localeCompare(String(right.label || ""));
    });
}

export function deriveVisibleSafetyPolicies(policies = [], { includeArchived = false } = {}) {
  return (Array.isArray(policies) ? policies : [])
    .filter((policy) => policy && (includeArchived || !policy.archivedAt))
    .sort((left, right) => new Date(right.updatedAt || right.createdAt || 0).getTime() - new Date(left.updatedAt || left.createdAt || 0).getTime());
}

export function filterSafetyIncidents(incidents = [], filters = {}) {
  const rows = Array.isArray(incidents) ? incidents : [];
  const {
    status = "All",
    type = "All types",
    severity = "All severities",
    jobId = "All jobs",
    submittedBy = "All reporters",
    archived = "Active only",
    query = "",
  } = filters;

  return rows.filter((incident) => {
    const isArchived = Boolean(incident.archivedAt) || String(incident.status || "").toLowerCase() === "archived";
    if (archived === "Active only" && isArchived) return false;
    if (archived === "Archived only" && !isArchived) return false;
    if (status !== "All" && String(incident.status || "") !== String(status || "").toLowerCase()) return false;
    if (type !== "All types" && String(incident.type || "") !== String(type || "").toLowerCase()) return false;
    if (severity !== "All severities" && String(incident.severity || "") !== String(severity || "").toLowerCase()) return false;
    if (jobId !== "All jobs" && String(incident.jobId || "") !== String(jobId || "")) return false;
    if (submittedBy !== "All reporters" && String(incident.submittedBy || "") !== String(submittedBy || "")) return false;
    return includesQuery(
      [
        incident.title,
        incident.description,
        incident.immediateAction,
        incident.job?.title,
        incident.job?.customer,
        incident.submittedByName,
      ],
      query,
    );
  });
}

export function deriveSafetyIncidentListState(incidents = []) {
  const rows = Array.isArray(incidents) ? incidents : [];
  const jobs = new Map();
  const reporters = new Map();

  rows.forEach((incident) => {
    if (incident.jobId && incident.job) {
      jobs.set(incident.jobId, incident.job.title || incident.job.customer || incident.jobId);
    }
    if (incident.submittedBy) {
      reporters.set(incident.submittedBy, incident.submittedByName || incident.submittedBy);
    }
  });

  return {
    jobOptions: [...jobs.entries()].map(([value, label]) => ({ value, label })).sort((left, right) => left.label.localeCompare(right.label)),
    reporterOptions: [...reporters.entries()].map(([value, label]) => ({ value, label })).sort((left, right) => left.label.localeCompare(right.label)),
  };
}

export function deriveSafetyWorkspaceJobs(jobs = []) {
  return (Array.isArray(jobs) ? jobs : []).map((job) => ({
    id: job.id,
    label: job.title || job.customer || job.id,
    customer: job.customer || "",
    address: job.address || "",
  }));
}

export function deriveAcknowledgmentState(acknowledgments = [], userId = "") {
  const rows = (Array.isArray(acknowledgments) ? acknowledgments : []).filter((entry) => entry.userId === userId);
  const latest = rows[0] || null;
  return {
    latest,
    count: rows.length,
    hasAcknowledged: Boolean(latest),
  };
}
