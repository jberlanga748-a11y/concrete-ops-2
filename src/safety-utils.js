function includesQuery(values, query) {
  const normalizedQuery = String(query || "").trim().toLowerCase();
  if (!normalizedQuery) return true;
  return values.some((value) => String(value || "").toLowerCase().includes(normalizedQuery));
}

function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function safetyIncidentJobLabel(incident = {}) {
  return incident?.job?.title || incident?.jobTitle || incident?.jobId || "Job unavailable";
}

function safetyIncidentReporterLabel(incident = {}) {
  return incident?.submittedByName || incident?.submittedBy || "Field user";
}

function safetyIncidentDateLabel(incident = {}) {
  return String(incident?.updatedAt || incident?.reviewedAt || incident?.resolvedAt || incident?.createdAt || "").slice(0, 10) || "No date";
}

function safetyIncidentSupportScopeLabel(user = {}, permissions = {}) {
  if (permissions?.safety?.canManage || permissions?.safety?.canReviewIncidents) return "all visible company safety incidents";
  if (permissions?.safety?.canSubmitIncidents) return "assigned or submitted field safety incidents";
  return `${String(user?.role || "role").trim() || "role"} visible safety incidents`;
}

function safetyIncidentNeedsAttention(incident = {}) {
  const status = String(incident?.status || "").trim().toLowerCase();
  const severity = String(incident?.severity || "").trim().toLowerCase();
  if (incident?.archivedAt || status === "archived" || status === "resolved") return false;
  return status === "open" || status === "reviewed" || ["critical", "high"].includes(severity) || !incident?.immediateAction;
}

function safetyIncidentSupportPriorityItems(incidents = [], limit = 3) {
  return (Array.isArray(incidents) ? incidents : [])
    .filter((incident) => safetyIncidentNeedsAttention(incident))
    .map((incident) => {
      const status = String(incident?.status || "").trim().toLowerCase();
      const severity = String(incident?.severity || "").trim().toLowerCase();
      if (["critical", "high"].includes(severity) && status !== "resolved") {
        return { label: incident?.title || safetyIncidentJobLabel(incident), reason: `${severity} severity follow-up is still visible`, priority: 1 };
      }
      if (status === "open") {
        return { label: incident?.title || safetyIncidentJobLabel(incident), reason: "Open incident needs review or resolution", priority: 2 };
      }
      if (!incident?.immediateAction) {
        return { label: incident?.title || safetyIncidentJobLabel(incident), reason: "Immediate action is not logged", priority: 3 };
      }
      if (status === "reviewed") {
        return { label: incident?.title || safetyIncidentJobLabel(incident), reason: "Reviewed incident is not resolved yet", priority: 4 };
      }
      return null;
    })
    .filter(Boolean)
    .sort((left, right) => left.priority - right.priority || left.label.localeCompare(right.label))
    .slice(0, limit);
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

export function buildSafetyIncidentSupportContext({
  user = {},
  permissions = {},
  visibleRows = [],
  selectedIncident = null,
  filters = {},
  visibleJobs = [],
} = {}) {
  const safeRows = Array.isArray(visibleRows) ? visibleRows : [];
  const activeRows = safeRows.filter((incident) => !incident?.archivedAt && String(incident?.status || "").toLowerCase() !== "archived");
  const openCount = safeRows.filter((incident) => String(incident?.status || "").toLowerCase() === "open").length;
  const reviewedCount = safeRows.filter((incident) => String(incident?.status || "").toLowerCase() === "reviewed").length;
  const resolvedCount = safeRows.filter((incident) => String(incident?.status || "").toLowerCase() === "resolved").length;
  const highSeverityCount = safeRows.filter((incident) => ["critical", "high"].includes(String(incident?.severity || "").toLowerCase())).length;
  const missingImmediateActionCount = safeRows.filter((incident) => !incident?.immediateAction).length;
  const archivedCount = safeRows.filter((incident) => incident?.archivedAt || String(incident?.status || "").toLowerCase() === "archived").length;
  const needsAttentionCount = safeRows.filter(safetyIncidentNeedsAttention).length;
  const selectedText = selectedIncident
    ? [
      `${selectedIncident.title || "Untitled safety item"} for ${safetyIncidentJobLabel(selectedIncident)}`,
      `status ${selectedIncident.statusLabel || selectedIncident.status || "open"}`,
      `severity ${selectedIncident.severity || "low"}`,
      `type ${selectedIncident.type || "concern"}`,
      `reported by ${safetyIncidentReporterLabel(selectedIncident)} on ${safetyIncidentDateLabel(selectedIncident)}`,
      `immediate action ${selectedIncident.immediateAction ? "logged" : "not logged"}`,
    ].join("; ")
    : "No safety incident selected.";
  const priorityItems = safetyIncidentSupportPriorityItems(activeRows);
  const priorityText = priorityItems.length
    ? priorityItems.map((item) => `${item.label}: ${item.reason}`).join("; ")
    : "No visible safety incident has high severity, open review, missing immediate action, or unresolved follow-up in this view.";
  const filterText = [
    `status ${filters.status || "All"}`,
    `type ${filters.type || "All types"}`,
    `severity ${filters.severity || "All severities"}`,
    `archive ${filters.archived || "Active only"}`,
    `job ${filters.jobId || "All jobs"}`,
    `reporter ${filters.submittedBy || "All reporters"}`,
    filters.query ? `search "${filters.query}"` : "",
  ].filter(Boolean).join("; ");

  return {
    workflow: "Safety / tools",
    blockerLevel: highSeverityCount ? "Blocking field work" : openCount || missingImmediateActionCount || reviewedCount ? "Slowing work down" : "Not a blocker",
    followUpNeeded: needsAttentionCount ? "Manual safety incident review" : "Safety incident workflow question",
    summary: [
      `Safety / Incidents support request for ${String(user?.name || user?.email || "workspace user").trim() || "workspace user"}.`,
      `Scope: ${safetyIncidentSupportScopeLabel(user, permissions)}.`,
      `Current filters: ${filterText}.`,
      `Visible incidents: ${safeRows.length}; active: ${activeRows.length}; open: ${openCount}; reviewed: ${reviewedCount}; resolved: ${resolvedCount}; high or critical severity: ${highSeverityCount}; missing immediate action: ${missingImmediateActionCount}; needing attention: ${needsAttentionCount}; archived in view: ${archivedCount}.`,
      `Selected incident: ${selectedText}`,
    ].join(" "),
    expected: "Keep Safety / Incidents support tied to the current role's visible incident scope only, without exposing pricing, margin, payroll, office-only job notes, hidden users, unrelated jobs, customer notifications, or automation.",
    workaround: `Visible job options: ${pluralize(Array.isArray(visibleJobs) ? visibleJobs.length : 0, "job")}. Safety review queue in this view: ${priorityText}`,
  };
}
