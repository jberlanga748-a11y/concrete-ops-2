const TEXT_LIMIT = 1800;
const TITLE_LIMIT = 160;
const SHORT_LIMIT = 140;
const REQUEST_LIMIT = 160;

const REQUEST_TYPE_VALUES = new Set(["pause", "resume", "scoped-run"]);
const REQUEST_STATUS_VALUES = new Set(["requested", "ready", "blocked", "closed", "archived"]);
const BLOCKED_STATUS_VALUES = new Set(["approved", "executed", "running", "queued"]);
const RISK_VALUES = new Set(["low", "medium", "high", "critical"]);

export const APEX_OS_AGENT_CONTROL_ROLES = [
  {
    id: "build",
    label: "Build Agent",
    roleTitle: "Feature Builder Agent",
    currentTask: "Local implementation packages and code changes.",
    nextAction: "Prepare scoped work and validation evidence before handoff.",
  },
  {
    id: "qa",
    label: "QA Agent",
    roleTitle: "QA Agent",
    currentTask: "Focused tests, role checks, browser QA, and mobile checks.",
    nextAction: "Collect validation proof before completion is claimed.",
  },
  {
    id: "release",
    label: "Release Agent",
    roleTitle: "Release Agent",
    currentTask: "Build, backup, deploy, smoke, rollback, and release notes.",
    nextAction: "Wait for approval and complete release evidence before production work.",
  },
  {
    id: "marketing",
    label: "Marketing Agent",
    roleTitle: "Marketing Master Coordinator",
    currentTask: "Launch, demo, positioning, and content drafts.",
    nextAction: "Draft reviewed materials without publishing or spending.",
  },
  {
    id: "sales",
    label: "Sales Agent",
    roleTitle: "Outreach / Sales Agent",
    currentTask: "Lead review, follow-up drafts, and founder-led sales prep.",
    nextAction: "Prepare drafts only; no automatic customer contact.",
  },
  {
    id: "customer-success",
    label: "Customer Success Agent",
    roleTitle: "Customer Success / Launch Agent",
    currentTask: "Onboarding, follow-up, success plans, and account health drafts.",
    nextAction: "Prepare reviewed customer-success work without customer-visible sends.",
  },
  {
    id: "monitoring",
    label: "Monitoring Agent",
    roleTitle: "Monitoring Agent",
    currentTask: "Stalled work, release health, owner alerts, and production smoke notes.",
    nextAction: "Surface signals and keep external provider changes locked.",
  },
];

const SECRET_PATTERNS = [
  /\b(password|passcode|api[_ -]?key|secret[a-z0-9_-]*|token|bearer|cookie|session|mfa|captcha|paywall|portal credential|login)\b/gi,
  /\bsk-[a-z0-9_-]{12,}\b/gi,
];
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;

function rawText(value = "", limit = TEXT_LIMIT) {
  return String(value ?? "").replace(/\s+\n/g, "\n").replace(/\s+/g, " ").trim().slice(0, limit);
}

function list(value) {
  return Array.isArray(value) ? value : [];
}

function parseRequestList(value) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function redactApexOsAgentControlText(value = "", limit = TEXT_LIMIT) {
  let next = rawText(value, limit);
  next = next.replace(EMAIL_PATTERN, "[REDACTED]");
  for (const pattern of SECRET_PATTERNS) {
    next = next.replace(pattern, "[REDACTED]");
  }
  return next.slice(0, limit);
}

export function detectApexOsAgentControlSafetyIssues(value = "", requestedStatus = "") {
  const raw = rawText(value, 6000);
  const issues = [];
  const normalizedStatus = rawText(requestedStatus, 40).toLowerCase();
  if (BLOCKED_STATUS_VALUES.has(normalizedStatus)) {
    issues.push("Apex OS agent control requests can be requested, readied, blocked, closed, or archived here; approval, queueing, running, and execution require a separate gated workflow.");
  }
  if (!raw) return issues;
  if (EMAIL_PATTERN.test(raw)) issues.push("Apex OS agent control requests cannot store customer email addresses.");
  EMAIL_PATTERN.lastIndex = 0;
  if (SECRET_PATTERNS.some((pattern) => pattern.test(raw))) {
    issues.push("Apex OS agent control requests cannot store passwords, tokens, MFA, CAPTCHA, paywall, login, provider keys, or portal credential instructions.");
  }
  for (const pattern of SECRET_PATTERNS) pattern.lastIndex = 0;
  return [...new Set(issues)];
}

function normalizeRequestType(value = "scoped-run") {
  const normalized = rawText(value, 60).toLowerCase();
  return REQUEST_TYPE_VALUES.has(normalized) ? normalized : "scoped-run";
}

function normalizeRequestStatus(value = "requested") {
  const normalized = rawText(value, 60).toLowerCase();
  return REQUEST_STATUS_VALUES.has(normalized) ? normalized : "requested";
}

function normalizeAgentRole(value = "build") {
  const normalized = rawText(value, 80).toLowerCase();
  return APEX_OS_AGENT_CONTROL_ROLES.some((role) => role.id === normalized) ? normalized : "build";
}

function normalizeRisk(value = "medium") {
  const normalized = rawText(value, 40).toLowerCase();
  return RISK_VALUES.has(normalized) ? normalized : "medium";
}

function normalizeRequestedBy(value = "", fallback = "") {
  return rawText(value || fallback, SHORT_LIMIT);
}

function requestIsActive(request = {}) {
  return !["closed", "archived"].includes(request.status);
}

function sortByUpdatedAt(rows = []) {
  return list(rows).slice().sort((left, right) => String(right.updatedAt || right.createdAt || "").localeCompare(String(left.updatedAt || left.createdAt || "")));
}

function requestTypeLabel(requestType = "scoped-run") {
  if (requestType === "pause") return "Pause request";
  if (requestType === "resume") return "Resume request";
  return "Scoped run request";
}

function requestStatusTone(status = "requested") {
  if (status === "ready") return "green";
  if (status === "blocked") return "red";
  if (status === "closed") return "slate";
  if (status === "archived") return "slate";
  return "blue";
}

function agentStatusTone(status = "done") {
  if (status === "running") return "blue";
  if (status === "paused") return "slate";
  if (status === "blocked") return "red";
  if (status === "needs approval") return "amber";
  return "green";
}

function normalizeHandoffRole(handoff = {}) {
  return normalizeAgentRole(handoff.agentRole || handoff.role || "build");
}

function activeHandoffRows(handoffs = []) {
  return list(handoffs)
    .filter((handoff) => handoff && typeof handoff === "object" && handoff.status !== "archived")
    .map((handoff) => ({
      id: rawText(handoff.id, 80),
      title: rawText(handoff.title || "Agent handoff", TITLE_LIMIT),
      agentRole: normalizeHandoffRole(handoff),
      status: rawText(handoff.status || "draft", 60).toLowerCase(),
      objective: rawText(handoff.objective || "", 240),
      updatedAt: rawText(handoff.updatedAt || handoff.createdAt || "", SHORT_LIMIT),
      sourceLabel: rawText(handoff.sourceLabel || "", SHORT_LIMIT),
    }))
    .filter((handoff) => handoff.id && handoff.title);
}

function normalizeRunRole(row = {}) {
  return normalizeAgentRole(row.agentRole || row.role || "build");
}

function normalizeRunStatus(status = "") {
  const normalized = rawText(status, 80).toLowerCase();
  if (["running", "in_progress", "processing"].includes(normalized)) return "running";
  if (["failed", "dead_lettered", "error"].includes(normalized)) return "blocked";
  if (["queued", "pending", "retrying"].includes(normalized)) return "needs approval";
  if (["succeeded", "complete", "completed", "done", "cancelled", "canceled"].includes(normalized)) return "done";
  return "done";
}

export function normalizeApexOsAgentControlRequest(input = {}, { existing = {}, id = "", now = new Date().toISOString(), requestedBy = "" } = {}) {
  const requestedStatus = input.status ?? existing.status;
  const requestType = normalizeRequestType(input.requestType ?? existing.requestType ?? input.type ?? existing.type);
  const title = redactApexOsAgentControlText(input.title ?? existing.title ?? requestTypeLabel(requestType), TITLE_LIMIT);
  const objective = redactApexOsAgentControlText(input.objective ?? existing.objective ?? "", TEXT_LIMIT);
  const scope = redactApexOsAgentControlText(input.scope ?? existing.scope ?? input.affectedScope ?? existing.affectedScope ?? "", TEXT_LIMIT);
  const validationPlan = redactApexOsAgentControlText(input.validationPlan ?? existing.validationPlan ?? "", TEXT_LIMIT);
  const rollbackPlan = redactApexOsAgentControlText(input.rollbackPlan ?? existing.rollbackPlan ?? "", TEXT_LIMIT);
  const sourceLabel = redactApexOsAgentControlText(input.sourceLabel ?? existing.sourceLabel ?? "", SHORT_LIMIT);
  const sourceUri = redactApexOsAgentControlText(input.sourceUri ?? existing.sourceUri ?? "", 260);
  const operatorNote = redactApexOsAgentControlText(input.operatorNote ?? existing.operatorNote ?? "", 420);
  const combinedRaw = [
    input.title,
    input.objective,
    input.scope,
    input.affectedScope,
    input.validationPlan,
    input.rollbackPlan,
    input.sourceLabel,
    input.sourceUri,
    input.operatorNote,
  ].filter(Boolean).join(" ");
  const blockedReasons = detectApexOsAgentControlSafetyIssues(combinedRaw, requestedStatus);
  const status = normalizeRequestStatus(requestedStatus);

  return {
    id: rawText(existing.id || input.id || id, 80),
    requestType,
    agentRole: normalizeAgentRole(input.agentRole ?? existing.agentRole),
    title,
    objective,
    scope,
    riskLevel: normalizeRisk(input.riskLevel ?? existing.riskLevel ?? input.risk ?? existing.risk),
    validationPlan,
    rollbackPlan,
    sourceLabel,
    sourceUri,
    operatorNote,
    status,
    requestedBy: normalizeRequestedBy(existing.requestedBy || input.requestedBy, requestedBy),
    createdBy: rawText(existing.createdBy || input.createdBy || requestedBy, SHORT_LIMIT),
    createdAt: rawText(existing.createdAt || input.createdAt || now, SHORT_LIMIT),
    updatedAt: now,
    closedAt: status === "closed" ? rawText(input.closedAt ?? existing.closedAt ?? now, SHORT_LIMIT) : "",
    archivedAt: status === "archived" ? rawText(input.archivedAt ?? existing.archivedAt ?? now, SHORT_LIMIT) : "",
    blockedReasons,
  };
}

export function normalizeApexOsAgentControlRequests(value = []) {
  return parseRequestList(value)
    .map((request) => normalizeApexOsAgentControlRequest(request))
    .filter((request) => request.id && request.title && request.objective)
    .slice(0, REQUEST_LIMIT);
}

export function summarizeApexOsAgentControlRequests(value = []) {
  const requests = normalizeApexOsAgentControlRequests(value);
  return {
    total: requests.length,
    active: requests.filter(requestIsActive).length,
    requested: requests.filter((request) => request.status === "requested").length,
    ready: requests.filter((request) => request.status === "ready").length,
    blocked: requests.filter((request) => request.status === "blocked").length,
    closed: requests.filter((request) => request.status === "closed").length,
    archived: requests.filter((request) => request.status === "archived").length,
    pause: requests.filter((request) => request.requestType === "pause").length,
    resume: requests.filter((request) => request.requestType === "resume").length,
    scopedRun: requests.filter((request) => request.requestType === "scoped-run").length,
  };
}

export function getApexOsAgentControlRequestMissingFields(request = {}) {
  const normalized = normalizeApexOsAgentControlRequest(request);
  const required = [
    ["title", "Request title"],
    ["objective", "Objective"],
    ["scope", "Scope"],
    ["validationPlan", "Validation plan"],
    ["rollbackPlan", "Rollback plan"],
    ["sourceLabel", "Source label"],
  ];
  return required.filter(([key]) => !normalized[key]).map(([, label]) => label);
}

export function isApexOsAgentControlRequestReady(request = {}) {
  const normalized = normalizeApexOsAgentControlRequest(request);
  return getApexOsAgentControlRequestMissingFields(normalized).length === 0 && normalized.blockedReasons.length === 0;
}

function buildRequestRow(request = {}) {
  return {
    id: request.id,
    title: request.title,
    status: request.status,
    detail: `${requestTypeLabel(request.requestType)} for ${request.agentRole}: ${request.objective}`,
    meta: request.updatedAt || request.createdAt || "",
    tone: requestStatusTone(request.status),
  };
}

function latestReportRows(runRows = [], requests = []) {
  const runReports = list(runRows).slice(0, 6).map((row) => ({
    id: row.runId || row.taskId || row.eventId || row.actionId || row.createdAt || "agent-run",
    title: row.actionLabel || row.actionId || "Agent OS run",
    status: row.status || "Recorded",
    detail: row.summary || row.createdAt || "Audit-backed agent report row.",
    meta: row.createdAt || "",
    tone: agentStatusTone(normalizeRunStatus(row.status)),
  }));
  const requestReports = sortByUpdatedAt(requests).slice(0, 6).map((request) => ({
    id: `request-${request.id}`,
    title: request.title,
    status: requestTypeLabel(request.requestType),
    detail: `${request.status} by ${request.requestedBy || request.createdBy || "operator"}: ${request.scope || request.objective}`,
    meta: request.updatedAt || request.createdAt || "",
    tone: requestStatusTone(request.status),
  }));
  return [...requestReports, ...runReports].slice(0, 6);
}

function deriveAgentStatus({ role, requests, handoffs, runRows }) {
  const roleRequests = sortByUpdatedAt(requests.filter((request) => request.agentRole === role.id && requestIsActive(request)));
  const roleHandoffs = sortByUpdatedAt(handoffs.filter((handoff) => handoff.agentRole === role.id));
  const roleRuns = sortByUpdatedAt(list(runRows).filter((row) => normalizeRunRole(row) === role.id));
  const latestRequest = roleRequests[0];
  const latestRun = roleRuns[0];
  const readyHandoff = roleHandoffs.find((handoff) => handoff.status === "ready");
  const blockedHandoff = roleHandoffs.find((handoff) => handoff.status === "blocked");
  const latestRunStatus = latestRun ? normalizeRunStatus(latestRun.status) : "";

  if (latestRequest?.status === "blocked" || blockedHandoff || latestRunStatus === "blocked") {
    return {
      status: "blocked",
      nextAction: "Review the blocked request or handoff before assigning more work.",
    };
  }
  if (latestRequest?.requestType === "pause" && ["requested", "ready"].includes(latestRequest.status)) {
    return {
      status: "paused",
      nextAction: "Resume can be requested by the operator when the work should continue.",
    };
  }
  if (
    readyHandoff
    || (latestRequest && ["resume", "scoped-run"].includes(latestRequest.requestType) && ["requested", "ready"].includes(latestRequest.status))
    || latestRunStatus === "needs approval"
  ) {
    return {
      status: "needs approval",
      nextAction: "Review the scoped request, handoff, and approval gates before any run or release work.",
    };
  }
  if (latestRunStatus === "running") {
    return {
      status: "running",
      nextAction: "Watch the run report and require validation before closing it.",
    };
  }
  return {
    status: "done",
    nextAction: role.nextAction,
  };
}

export function buildApexOsAgentControlPlane({
  agentTaskOptions = [],
  agentRunRows = [],
  executionHandoffs = [],
  agentControlRequests = [],
} = {}) {
  const requests = normalizeApexOsAgentControlRequests(agentControlRequests);
  const handoffs = activeHandoffRows(executionHandoffs);
  const requestSummary = summarizeApexOsAgentControlRequests(requests);
  const activeRequests = requests.filter(requestIsActive);
  const availableTaskCount = list(agentTaskOptions).filter((option) => !option?.disabled).length;

  const rosterRows = APEX_OS_AGENT_CONTROL_ROLES.map((role) => {
    const roleRequests = sortByUpdatedAt(activeRequests.filter((request) => request.agentRole === role.id));
    const roleHandoffs = sortByUpdatedAt(handoffs.filter((handoff) => handoff.agentRole === role.id));
    const roleRuns = sortByUpdatedAt(list(agentRunRows).filter((row) => normalizeRunRole(row) === role.id));
    const statusState = deriveAgentStatus({ role, requests, handoffs, runRows: agentRunRows });
    const latest = roleRequests[0] || roleHandoffs[0] || roleRuns[0] || null;
    const currentTask = roleRequests[0]?.objective || roleHandoffs[0]?.objective || roleRuns[0]?.summary || role.currentTask;
    return {
      id: role.id,
      title: role.label,
      roleTitle: role.roleTitle,
      status: statusState.status,
      detail: currentTask,
      currentTask,
      lastUpdate: latest?.updatedAt || latest?.createdAt || "No recent request",
      nextAction: statusState.nextAction,
      reportCount: roleRuns.length,
      handoffCount: roleHandoffs.length,
      requestCount: roleRequests.length,
      tone: agentStatusTone(statusState.status),
    };
  });

  return {
    status: requestSummary.active || handoffs.length ? "Control plane active" : "Control plane ready",
    tone: requestSummary.blocked ? "amber" : requestSummary.active || handoffs.length ? "green" : "blue",
    roleCount: APEX_OS_AGENT_CONTROL_ROLES.length,
    availableTaskCount,
    requestSummary,
    activeRequestCount: requestSummary.active,
    readyRequestCount: requestSummary.ready,
    blockedRequestCount: requestSummary.blocked,
    rosterRows,
    requestRows: sortByUpdatedAt(requests).slice(0, 6).map(buildRequestRow),
    reportRows: latestReportRows(agentRunRows, requests),
    handoffRows: sortByUpdatedAt(handoffs).slice(0, 6).map((handoff) => ({
      id: handoff.id,
      title: handoff.title,
      status: handoff.status,
      detail: `${handoff.agentRole}: ${handoff.objective || "Scoped handoff package."}`,
      meta: handoff.updatedAt,
      tone: handoff.status === "ready" ? "green" : handoff.status === "blocked" ? "red" : "blue",
    })),
    safetyRows: [
      {
        id: "scoped-requests-only",
        title: "Scoped requests only",
        status: "Locked",
        detail: "Pause, resume, and scoped-run records prepare operator-approved work; they do not start unmanaged agent loops.",
        tone: "amber",
      },
      {
        id: "external-action-gates",
        title: "External action gates",
        status: "Approval required",
        detail: "Deploy, customer contact, provider setup, billing, spend, publishing, production mutation, deletion, and irreversible actions remain approval-gated.",
        tone: "amber",
      },
      {
        id: "audit-history",
        title: "Audit trail",
        status: "Recorded",
        detail: "Every saved control request is stored in company settings and mirrored to Apex OS audit/activity history.",
        tone: "blue",
      },
    ],
  };
}
