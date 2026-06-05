const TEXT_LIMIT = 1800;
const TITLE_LIMIT = 160;
const SHORT_LIMIT = 140;
const RUN_LIMIT = 120;

const STATUS_VALUES = new Set(["planned", "drafting", "validating", "waiting-approval", "blocked", "done", "archived"]);
const BLOCKED_STATUS_VALUES = new Set(["approved", "executed", "running", "queued"]);
const STEP_STATUS_VALUES = new Set(["todo", "ready", "drafted", "validating", "waiting-approval", "blocked", "done"]);
const RISK_VALUES = new Set(["low", "medium", "high", "critical"]);

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

function parseRunList(value) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function redactApexOsAutonomyRunText(value = "", limit = TEXT_LIMIT) {
  let next = rawText(value, limit);
  next = next.replace(EMAIL_PATTERN, "[REDACTED]");
  for (const pattern of SECRET_PATTERNS) {
    next = next.replace(pattern, "[REDACTED]");
  }
  return next.slice(0, limit);
}

export function detectApexOsAutonomyRunSafetyIssues(value = "", requestedStatus = "") {
  const raw = rawText(value, 6000);
  const issues = [];
  const normalizedStatus = rawText(requestedStatus, 60).toLowerCase();
  if (BLOCKED_STATUS_VALUES.has(normalizedStatus)) {
    issues.push("Apex autonomy runs can be planned, drafted, validated, blocked, completed, or archived here; approval, queueing, running, and execution require a separate gated workflow.");
  }
  if (!raw) return issues;
  if (EMAIL_PATTERN.test(raw)) issues.push("Apex autonomy runs cannot store customer email addresses.");
  EMAIL_PATTERN.lastIndex = 0;
  if (SECRET_PATTERNS.some((pattern) => pattern.test(raw))) {
    issues.push("Apex autonomy runs cannot store passwords, tokens, MFA, CAPTCHA, paywall, login, provider keys, or portal credential instructions.");
  }
  for (const pattern of SECRET_PATTERNS) pattern.lastIndex = 0;
  return [...new Set(issues)];
}

function normalizeStatus(value = "planned") {
  const normalized = rawText(value, 60).toLowerCase();
  return STATUS_VALUES.has(normalized) ? normalized : "planned";
}

function normalizeStepStatus(value = "todo") {
  const normalized = rawText(value, 60).toLowerCase();
  return STEP_STATUS_VALUES.has(normalized) ? normalized : "todo";
}

function normalizeRisk(value = "medium") {
  const normalized = rawText(value, 60).toLowerCase();
  return RISK_VALUES.has(normalized) ? normalized : "medium";
}

function statusTone(status = "planned") {
  if (status === "done") return "green";
  if (status === "blocked") return "red";
  if (status === "waiting-approval") return "amber";
  if (status === "drafting" || status === "validating") return "blue";
  return "slate";
}

function stepTone(status = "todo") {
  if (status === "done" || status === "drafted") return "green";
  if (status === "blocked") return "red";
  if (status === "waiting-approval" || status === "validating") return "amber";
  if (status === "ready") return "blue";
  return "slate";
}

function routeToAgentRole(routeId = "") {
  const route = rawText(routeId, 100).toLowerCase();
  if (route.includes("release")) return "release";
  if (route.includes("trust") || route.includes("qa") || route.includes("security")) return "qa";
  if (route.includes("sales")) return "sales";
  if (route.includes("marketing")) return "marketing";
  if (route.includes("customer") || route.includes("launch")) return "customer-success";
  if (route.includes("business")) return "monitoring";
  if (route.includes("approval")) return "release";
  if (route.includes("memory") || route.includes("monitor")) return "monitoring";
  return "build";
}

function routeToWorkType(routeId = "") {
  const route = rawText(routeId, 100).toLowerCase();
  if (route.includes("release")) return "release-packet";
  if (route.includes("trust") || route.includes("qa") || route.includes("security")) return "qa-check";
  if (route.includes("business") || route.includes("sales") || route.includes("marketing")) return "business-draft";
  if (route.includes("memory") || route.includes("monitor")) return "monitoring-review";
  return "local-code-plan";
}

function normalizeRunStep(input = {}, index = 0, now = "") {
  const status = normalizeStepStatus(input.status || (index === 0 ? "done" : index <= 2 ? "ready" : "todo"));
  return {
    id: rawText(input.id || `step-${index + 1}`, 80),
    title: redactApexOsAutonomyRunText(input.title || `Step ${index + 1}`, SHORT_LIMIT),
    detail: redactApexOsAutonomyRunText(input.detail || "", 360),
    status,
    tone: stepTone(status),
    evidence: redactApexOsAutonomyRunText(input.evidence || "", 420),
    updatedAt: rawText(input.updatedAt || now, SHORT_LIMIT),
  };
}

function defaultRunSteps(routeLabel = "Apex request", now = "") {
  return [
    {
      id: "hear-request",
      title: "Hear the request",
      detail: "Capture what the operator asked Apex to do.",
      status: "done",
    },
    {
      id: "route-work",
      title: "Route the work",
      detail: `Match the request to ${routeLabel || "the right Apex room"} and agent lane.`,
      status: "ready",
    },
    {
      id: "plan-steps",
      title: "Build the run plan",
      detail: "Break the work into internal draft, validation, approval gate, report, and memory steps.",
      status: "ready",
    },
    {
      id: "draft-internal",
      title: "Draft internal work",
      detail: "Prepare private scoped agent request and execution handoff drafts only.",
      status: "todo",
    },
    {
      id: "validate-evidence",
      title: "Validate evidence",
      detail: "Collect tests, role checks, browser/mobile proof, build proof, rollback notes, and results.",
      status: "todo",
    },
    {
      id: "approval-gate",
      title: "Stop at approval gates",
      detail: "Hold customer-visible, money, provider, production, deletion, and irreversible work for approval.",
      status: "waiting-approval",
    },
    {
      id: "report-memory",
      title: "Report and remember",
      detail: "Return the result and suggest decision memory only after review.",
      status: "todo",
    },
  ].map((step, index) => normalizeRunStep(step, index, now));
}

function normalizeStringList(value = [], fallback = []) {
  const source = Array.isArray(value) && value.length ? value : fallback;
  return source.map((item) => redactApexOsAutonomyRunText(item, 260)).filter(Boolean).slice(0, 12);
}

export function buildApexOsAutonomyRunPlan(input = {}, { id = "", now = new Date().toISOString(), createdBy = "" } = {}) {
  const request = redactApexOsAutonomyRunText(input.request || input.objective || input.title || "Apex autonomy request", TEXT_LIMIT);
  const routeId = redactApexOsAutonomyRunText(input.routeId || input.roomId || "apex", 100);
  const routeLabel = redactApexOsAutonomyRunText(input.routeLabel || input.roomLabel || "Apex", SHORT_LIMIT);
  const title = redactApexOsAutonomyRunText(input.title || `Run: ${request.slice(0, 96)}`, TITLE_LIMIT);
  return normalizeApexOsAutonomyRun({
    ...input,
    id,
    title,
    request,
    routeId,
    routeLabel,
    status: input.status || "planned",
    sourceLabel: input.sourceLabel || "Apex Autonomy Run Center",
    createdBy,
    createdAt: input.createdAt || now,
    updatedAt: now,
    rawRequestForSafety: [
      input.request,
      input.objective,
      input.title,
      input.routeDetail,
      input.sourceLabel,
      input.sourceUri,
      input.operatorNote,
    ].filter(Boolean).join(" "),
    steps: input.steps?.length ? input.steps : defaultRunSteps(routeLabel, now),
    evidence: input.evidence?.length ? input.evidence : [
      "Request captured in private Apex OS.",
      "Run remains review-first and execution locked.",
    ],
  }, { id, now, createdBy });
}

export function normalizeApexOsAutonomyRun(input = {}, { existing = {}, id = "", now = new Date().toISOString(), createdBy = "" } = {}) {
  const requestedStatus = input.status ?? existing.status;
  const request = redactApexOsAutonomyRunText(input.request ?? existing.request ?? input.objective ?? existing.objective ?? "", TEXT_LIMIT);
  const routeId = redactApexOsAutonomyRunText(input.routeId ?? existing.routeId ?? "apex", 100);
  const routeLabel = redactApexOsAutonomyRunText(input.routeLabel ?? existing.routeLabel ?? "Apex", SHORT_LIMIT);
  const routeDetail = redactApexOsAutonomyRunText(input.routeDetail ?? existing.routeDetail ?? "", 420);
  const title = redactApexOsAutonomyRunText(input.title ?? existing.title ?? (request ? `Run: ${request.slice(0, 96)}` : "Apex autonomy run"), TITLE_LIMIT);
  const sourceLabel = redactApexOsAutonomyRunText(input.sourceLabel ?? existing.sourceLabel ?? "Apex Autonomy Run Center", SHORT_LIMIT);
  const sourceUri = redactApexOsAutonomyRunText(input.sourceUri ?? existing.sourceUri ?? "", 260);
  const operatorNote = redactApexOsAutonomyRunText(input.operatorNote ?? existing.operatorNote ?? "", 420);
  const resultReport = redactApexOsAutonomyRunText(input.resultReport ?? existing.resultReport ?? "", TEXT_LIMIT);
  const nextSafeAction = redactApexOsAutonomyRunText(input.nextSafeAction ?? existing.nextSafeAction ?? "Review the run plan, then draft internal work when ready.", 360);
  const status = normalizeStatus(requestedStatus);
  const steps = list(input.steps?.length ? input.steps : existing.steps?.length ? existing.steps : defaultRunSteps(routeLabel, now))
    .map((step, index) => normalizeRunStep(step, index, now))
    .slice(0, 12);
  const evidence = normalizeStringList(input.evidence ?? existing.evidence, []);
  const approvalGates = normalizeStringList(input.approvalGates ?? existing.approvalGates, [
    "Customer-visible sends and notifications",
    "Billing, payment, invoice, discount, or ad spend",
    "Production deploy, rollback, schema, auth, session, provider, deletion, or irreversible work",
  ]);
  const blockedActions = normalizeStringList(input.blockedActions ?? existing.blockedActions, [
    "No external sends or customer-visible changes.",
    "No billing, payments, ad spend, or publishing.",
    "No production mutation, provider setup, deletion, or irreversible work.",
    "No queue, run, execute, deploy, or rollback from this ledger.",
  ]);
  const combinedRaw = [
    input.title,
    input.request,
    input.objective,
    input.rawRequestForSafety,
    input.routeLabel,
    input.routeDetail,
    input.sourceLabel,
    input.sourceUri,
    input.operatorNote,
    input.resultReport,
    input.nextSafeAction,
    ...(Array.isArray(input.evidence) ? input.evidence : []),
    ...(Array.isArray(input.approvalGates) ? input.approvalGates : []),
  ].filter(Boolean).join(" ");
  const blockedReasons = [
    ...normalizeStringList(input.blockedReasons, []),
    ...normalizeStringList(existing.blockedReasons, []),
    ...detectApexOsAutonomyRunSafetyIssues(combinedRaw, requestedStatus),
  ];

  return {
    id: rawText(existing.id || input.id || id, 80),
    title,
    request,
    routeId,
    routeLabel,
    routeDetail,
    agentRole: rawText(input.agentRole ?? existing.agentRole ?? routeToAgentRole(routeId), 80),
    workType: rawText(input.workType ?? existing.workType ?? routeToWorkType(routeId), 80),
    riskLevel: normalizeRisk(input.riskLevel ?? existing.riskLevel ?? input.risk ?? existing.risk),
    status,
    tone: statusTone(status),
    priority: rawText(input.priority ?? existing.priority ?? "normal", 40),
    sourceLabel,
    sourceUri,
    operatorNote,
    steps,
    evidence,
    approvalGates,
    blockedActions,
    nextSafeAction,
    resultReport,
    linkedAgentControlRequestId: rawText(input.linkedAgentControlRequestId ?? existing.linkedAgentControlRequestId ?? "", SHORT_LIMIT),
    linkedExecutionHandoffId: rawText(input.linkedExecutionHandoffId ?? existing.linkedExecutionHandoffId ?? "", SHORT_LIMIT),
    linkedApprovalPacketId: rawText(input.linkedApprovalPacketId ?? existing.linkedApprovalPacketId ?? "", SHORT_LIMIT),
    decisionMemoryId: rawText(input.decisionMemoryId ?? existing.decisionMemoryId ?? "", SHORT_LIMIT),
    createdBy: rawText(existing.createdBy || input.createdBy || createdBy, SHORT_LIMIT),
    createdAt: rawText(existing.createdAt || input.createdAt || now, SHORT_LIMIT),
    updatedAt: existing.id ? now : rawText(input.updatedAt ?? existing.updatedAt ?? now, SHORT_LIMIT),
    archivedAt: status === "archived" ? rawText(input.archivedAt ?? existing.archivedAt ?? now, SHORT_LIMIT) : "",
    completedAt: status === "done" ? rawText(input.completedAt ?? existing.completedAt ?? now, SHORT_LIMIT) : "",
    blockedReasons: [...new Set(blockedReasons)],
  };
}

export function normalizeApexOsAutonomyRuns(value = []) {
  return parseRunList(value)
    .map((run) => normalizeApexOsAutonomyRun(run))
    .filter((run) => run.id && run.title && run.request)
    .slice(0, RUN_LIMIT);
}

export function summarizeApexOsAutonomyRuns(value = []) {
  const runs = normalizeApexOsAutonomyRuns(value);
  return {
    total: runs.length,
    active: runs.filter((run) => !["done", "archived"].includes(run.status)).length,
    planned: runs.filter((run) => run.status === "planned").length,
    drafting: runs.filter((run) => run.status === "drafting").length,
    validating: runs.filter((run) => run.status === "validating").length,
    waitingApproval: runs.filter((run) => run.status === "waiting-approval").length,
    blocked: runs.filter((run) => run.status === "blocked").length,
    done: runs.filter((run) => run.status === "done").length,
    archived: runs.filter((run) => run.status === "archived").length,
  };
}

function formatApexOsRunAge(minutes = 0) {
  const safeMinutes = Math.max(0, Math.floor(Number(minutes) || 0));
  if (safeMinutes < 1) return "just now";
  if (safeMinutes < 60) return `${safeMinutes}m ago`;
  const hours = Math.floor(safeMinutes / 60);
  const remainingMinutes = safeMinutes % 60;
  if (hours < 24) return remainingMinutes ? `${hours}h ${remainingMinutes}m ago` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function summarizeApexOsAutonomyRunProgress(run = {}) {
  const normalized = normalizeApexOsAutonomyRun(run);
  const steps = list(normalized.steps);
  const totalCount = steps.length;
  const doneCount = steps.filter((step) => ["done", "drafted"].includes(step.status)).length;
  const blockedCount = steps.filter((step) => step.status === "blocked").length;
  const waitingCount = steps.filter((step) => step.status === "waiting-approval").length;
  const activeStep = steps.find((step) => !["done", "drafted"].includes(step.status)) || steps[steps.length - 1] || null;
  const progressPercent = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;
  return {
    doneCount,
    blockedCount,
    waitingCount,
    totalCount,
    progressPercent,
    activeStepTitle: activeStep?.title || "",
    activeStepStatus: activeStep?.status || "",
    activeStepDetail: activeStep?.detail || "",
    evidenceCount: list(normalized.evidence).length,
    linkedDraftCount: [normalized.linkedAgentControlRequestId, normalized.linkedExecutionHandoffId].filter(Boolean).length,
  };
}

export function buildApexOsAutonomyRunHeartbeat(run = {}, { now = new Date().toISOString(), pulse = {} } = {}) {
  const normalized = run?.id ? normalizeApexOsAutonomyRun(run, { now }) : null;
  if (!normalized?.id) {
    return {
      id: "apex-run-heartbeat-ready",
      status: "Standing by",
      tone: "blue",
      title: "No active private run",
      ageLabel: "ready",
      progressLabel: "0% / 0 steps",
      pulseLabel: pulse?.checkedAt ? `Pulse ${formatApexOsRunAge((Date.parse(now) - Date.parse(pulse.checkedAt)) / 60000)}` : "Pulse ready",
      detail: "Apex has no active private run to check in on. Start a Live Run when there is real work to track.",
      recommendation: "Start a private run from the Apex body, or ask Apex for the next safe options.",
      executionLocked: true,
      externalActionsLocked: true,
      canExecute: false,
    };
  }

  const progress = summarizeApexOsAutonomyRunProgress(normalized);
  const status = String(normalized.status || "").toLowerCase();
  const updatedAt = normalized.updatedAt || normalized.createdAt || now;
  const updatedMs = Date.parse(updatedAt);
  const nowMs = Date.parse(now);
  const ageMinutes = Number.isFinite(updatedMs) && Number.isFinite(nowMs)
    ? Math.max(0, Math.floor((nowMs - updatedMs) / 60000))
    : 0;
  const ageLabel = formatApexOsRunAge(ageMinutes);
  const terminal = ["done", "archived", "blocked"].includes(status);
  const checkInDue = !terminal && ageMinutes >= 20;
  const waitingApproval = status === "waiting-approval";
  const blocked = status === "blocked" || progress.blockedCount > 0;
  const tone = blocked ? "amber" : waitingApproval || checkInDue ? "amber" : terminal ? "green" : "green";
  const heartbeatStatus = blocked
    ? "Needs review"
    : waitingApproval
      ? "Manual review"
      : checkInDue
        ? "Check-in due"
        : terminal
          ? "Reported"
          : "On pace";
  const recommendation = blocked
    ? "Review the blocked step and decide whether to keep waiting, fix proof gaps, or mark the run blocked."
    : waitingApproval
      ? "Review evidence, then report done, keep waiting approval, or block the run."
      : checkInDue
        ? "Ask Apex for a status check, run private proof, or update the active run before starting new work."
        : terminal
          ? "Review the result and suggested memory before trusting it long term."
          : normalized.nextSafeAction || "Keep monitoring the active run and only advance private prep/proof when asked.";

  return {
    id: `apex-run-heartbeat-${normalized.id}`,
    runId: normalized.id,
    status: heartbeatStatus,
    tone,
    title: normalized.title,
    ageMinutes,
    ageLabel,
    progress,
    progressLabel: `${progress.progressPercent}% / ${progress.doneCount} of ${progress.totalCount}`,
    pulseLabel: pulse?.checkedAt ? `Pulse ${formatApexOsRunAge((Date.parse(now) - Date.parse(pulse.checkedAt)) / 60000)}` : "Pulse ready",
    currentStep: progress.activeStepTitle || normalized.nextSafeAction || "Review run",
    detail: `${normalized.title} is ${status || "planned"}, ${progress.progressPercent}% complete, updated ${ageLabel}. Next safe action: ${normalized.nextSafeAction || "review the run ledger"}.`,
    recommendation,
    executionLocked: true,
    externalActionsLocked: true,
    canExecute: false,
  };
}

export function getApexOsAutonomyRunMissingFields(run = {}) {
  const normalized = normalizeApexOsAutonomyRun(run);
  const required = [
    ["title", "Run title"],
    ["request", "Request"],
    ["routeLabel", "Route label"],
    ["sourceLabel", "Source label"],
  ];
  const missing = required.filter(([key]) => !normalized[key]).map(([, label]) => label);
  if (normalized.status === "done" && !normalized.resultReport) {
    missing.push("Result report");
  }
  return missing;
}

export function isApexOsAutonomyRunReady(run = {}) {
  const normalized = normalizeApexOsAutonomyRun(run);
  return getApexOsAutonomyRunMissingFields(normalized).length === 0 && normalized.blockedReasons.length === 0;
}

export function markApexOsAutonomyRunInternalDrafted(run = {}, { agentControlRequestId = "", executionHandoffId = "", now = new Date().toISOString() } = {}) {
  const nextSteps = list(run.steps).map((step) => {
    if (step.id === "draft-internal") {
      return normalizeRunStep({
        ...step,
        status: "drafted",
        evidence: "Linked private agent request and execution handoff drafts were created.",
        updatedAt: now,
      });
    }
    if (step.id === "validate-evidence") {
      return normalizeRunStep({ ...step, status: "ready", updatedAt: now });
    }
    return normalizeRunStep(step, 0, now);
  });
  return normalizeApexOsAutonomyRun({
    ...run,
    status: "drafting",
    steps: nextSteps,
    linkedAgentControlRequestId: agentControlRequestId || run.linkedAgentControlRequestId,
    linkedExecutionHandoffId: executionHandoffId || run.linkedExecutionHandoffId,
    evidence: [
      ...list(run.evidence),
      "Internal draft package created. No queue, run, execute, send, billing, provider, or production action was performed.",
    ].slice(-12),
    nextSafeAction: "Review the linked agent request and execution handoff, then validate evidence before any approval-gated work.",
  }, {
    existing: run,
    now,
  });
}

export function advanceApexOsAutonomyRunPrivatePrep(run = {}, { now = new Date().toISOString(), operatorNote = "" } = {}) {
  const normalized = normalizeApexOsAutonomyRun(run, { now });
  if (["done", "archived", "blocked"].includes(normalized.status)) {
    return normalized;
  }

  const hasLinkedDrafts = Boolean(normalized.linkedAgentControlRequestId && normalized.linkedExecutionHandoffId);
  const nextSteps = list(normalized.steps).map((step, index) => {
    if (step.id === "hear-request") {
      return normalizeRunStep({
        ...step,
        status: "done",
        evidence: step.evidence || "Operator request is captured in the private Apex run ledger.",
        updatedAt: now,
      }, index, now);
    }
    if (step.id === "route-work") {
      return normalizeRunStep({
        ...step,
        status: "done",
        evidence: "Apex routed the request to the current private command-room lane.",
        updatedAt: now,
      }, index, now);
    }
    if (step.id === "plan-steps") {
      return normalizeRunStep({
        ...step,
        status: "done",
        evidence: "Apex built the review-first run path and kept execution locked.",
        updatedAt: now,
      }, index, now);
    }
    if (step.id === "draft-internal") {
      return normalizeRunStep({
        ...step,
        status: hasLinkedDrafts ? "drafted" : "ready",
        evidence: hasLinkedDrafts
          ? "Private agent-control and execution handoff drafts are linked for operator review."
          : "A private internal draft package is required before prep can advance further.",
        updatedAt: now,
      }, index, now);
    }
    if (step.id === "validate-evidence") {
      return normalizeRunStep({
        ...step,
        status: hasLinkedDrafts ? "ready" : "todo",
        evidence: hasLinkedDrafts
          ? "Validation is ready for operator-directed tests, role checks, browser/mobile proof, build proof, and rollback notes."
          : step.evidence,
        updatedAt: now,
      }, index, now);
    }
    if (step.id === "approval-gate") {
      return normalizeRunStep({
        ...step,
        status: "waiting-approval",
        evidence: "Apex stopped before customer-visible, money, provider, production, deletion, or irreversible work.",
        updatedAt: now,
      }, index, now);
    }
    return normalizeRunStep(step, index, now);
  });

  const nextEvidence = [
    ...list(normalized.evidence),
    hasLinkedDrafts
      ? "Apex auto-advanced private run prep through routing, planning, and internal draft linkage; validation still requires operator-directed proof."
      : "Apex auto-advanced safe routing and planning, then stopped because internal draft links are still required.",
  ].slice(-12);

  return normalizeApexOsAutonomyRun({
    ...normalized,
    status: hasLinkedDrafts ? "validating" : "drafting",
    operatorNote: operatorNote || "Apex advanced private-only run prep and stopped before approval-gated work.",
    steps: nextSteps,
    evidence: nextEvidence,
    nextSafeAction: hasLinkedDrafts
      ? "Run prep is validation-ready. Run operator-directed proof checks, then decide whether this run is done, blocked, or waiting for approval."
      : "Create the private internal draft package before Apex can continue prep.",
  }, {
    existing: normalized,
    now,
  });
}

export function validateApexOsAutonomyRunPrivateProof(run = {}, { now = new Date().toISOString(), operatorNote = "" } = {}) {
  const normalized = normalizeApexOsAutonomyRun(run, { now });
  if (["done", "archived", "blocked"].includes(normalized.status)) {
    return normalized;
  }

  const stepById = new Map(list(normalized.steps).map((step) => [step.id, step]));
  const hasAgentDraft = Boolean(normalized.linkedAgentControlRequestId);
  const hasHandoffDraft = Boolean(normalized.linkedExecutionHandoffId);
  const routeDone = stepById.get("route-work")?.status === "done";
  const planDone = stepById.get("plan-steps")?.status === "done";
  const draftLinked = hasAgentDraft && hasHandoffDraft && stepById.get("draft-internal")?.status === "drafted";
  const approvalStopped = ["waiting-approval", "done"].includes(stepById.get("approval-gate")?.status || "");
  const proofGaps = [
    hasAgentDraft ? "" : "linked agent-control draft is missing",
    hasHandoffDraft ? "" : "linked execution handoff is missing",
    routeDone ? "" : "route-work step is not done",
    planDone ? "" : "plan-steps step is not done",
    draftLinked ? "" : "internal draft linkage is not drafted",
    approvalStopped ? "" : "approval gate is not stopped",
  ].filter(Boolean);
  const proofPassed = proofGaps.length === 0;

  const proofEvidence = proofPassed
    ? "Apex private proof check passed: linked internal drafts, route, plan, validation readiness, and approval-stop posture were verified while execution stayed locked."
    : `Apex private proof check found ${proofGaps.length} gap${proofGaps.length === 1 ? "" : "s"}: ${proofGaps.join("; ")}.`;

  const nextSteps = list(normalized.steps).map((step, index) => {
    if (step.id === "validate-evidence") {
      return normalizeRunStep({
        ...step,
        status: proofPassed ? "done" : "blocked",
        evidence: proofEvidence,
        updatedAt: now,
      }, index, now);
    }
    if (step.id === "approval-gate") {
      return normalizeRunStep({
        ...step,
        status: "waiting-approval",
        evidence: "Apex proof check stopped before customer-visible, money, provider, production, deletion, queue/run, deploy/rollback, or irreversible work.",
        updatedAt: now,
      }, index, now);
    }
    return normalizeRunStep(step, index, now);
  });

  const nextEvidence = [
    ...list(normalized.evidence),
    proofEvidence,
  ].slice(-12);

  return normalizeApexOsAutonomyRun({
    ...normalized,
    status: proofPassed ? "waiting-approval" : "validating",
    operatorNote: operatorNote || (proofPassed
      ? "Apex ran a private proof check and stopped at the manual approval gate."
      : "Apex ran a private proof check and found proof gaps that need operator review."),
    steps: nextSteps,
    evidence: nextEvidence,
    nextSafeAction: proofPassed
      ? "Proof check is complete. Review the evidence, then choose Report Done, keep waiting approval, or block the run."
      : `Fix proof gaps before completion: ${proofGaps.join("; ")}.`,
  }, {
    existing: normalized,
    now,
  });
}

export function runApexOsAutonomyRunPrivateOperatorCycle(run = {}, { now = new Date().toISOString(), operatorNote = "" } = {}) {
  const normalized = normalizeApexOsAutonomyRun(run, { now });
  if (["done", "archived", "blocked"].includes(normalized.status)) {
    return normalized;
  }

  const preparedRun = advanceApexOsAutonomyRunPrivatePrep(normalized, {
    now,
    operatorNote: operatorNote || "Apex started a private operator cycle and kept execution locked.",
  });
  const proofRun = validateApexOsAutonomyRunPrivateProof(preparedRun, {
    now,
    operatorNote: operatorNote || "Apex completed a private operator cycle and stopped at manual review.",
  });
  const proofPassed = proofRun.status === "waiting-approval"
    && proofRun.steps?.find((step) => step.id === "validate-evidence")?.status === "done";
  const cycleEvidence = proofPassed
    ? "Apex private operator cycle completed: request heard, routed, planned, internal drafts linked, proof checked, approval gate held, and report/memory review prepared. No external action executed."
    : "Apex private operator cycle stopped with validation gaps. No external action executed.";
  const nextSteps = list(proofRun.steps).map((step, index) => {
    if (step.id === "report-memory") {
      return normalizeRunStep({
        ...step,
        status: proofPassed ? "ready" : "todo",
        evidence: proofPassed
          ? "Result report and suggested memory can be prepared after operator review; nothing becomes trusted automatically."
          : step.evidence,
        updatedAt: now,
      }, index, now);
    }
    return normalizeRunStep(step, index, now);
  });

  return normalizeApexOsAutonomyRun({
    ...proofRun,
    status: proofPassed ? "waiting-approval" : proofRun.status,
    operatorNote: operatorNote || (proofPassed
      ? "Apex ran the private operator cycle from the body screen and stopped at manual approval/report review."
      : "Apex ran the private operator cycle from the body screen and found validation gaps."),
    steps: nextSteps,
    evidence: [
      ...list(proofRun.evidence),
      cycleEvidence,
    ].slice(-12),
    nextSafeAction: proofPassed
      ? "Operator cycle is complete through private proof. Review the evidence, then choose Report Done, keep waiting approval, block it, or draft reviewed memory."
      : proofRun.nextSafeAction,
  }, {
    existing: proofRun,
    now,
  });
}
