import {
  APEX_OS_MODEL_ROUTE,
  buildApexOsModelUsageMetadata,
} from "./apexOsModelRouter.js";
import {
  APEX_OS_TRACE_EVENT_TYPE,
  APEX_OS_TRACE_SOURCE,
  APEX_OS_TRACE_STATUS,
  createApexOsTraceEntry,
} from "./apexOsTraceLog.js";

export const APEX_OS_ACTIVE_LOOP_ID = Object.freeze({
  MORNING_PLANNING: "morning-planning",
  EVENING_REVIEW: "evening-review",
  PRIORITY_MONITORING: "priority-monitoring",
  MEMORY_SUGGESTION_REVIEW: "memory-suggestion-review",
  RESEARCH_WATCH_QUEUE: "research-watch-queue",
  APEX_HQ_BUILD_PROGRESS: "apex-hq-build-progress",
  OPPORTUNITY_RISK_DETECTION: "opportunity-risk-detection",
  COST_TOKEN_MONITORING: "cost-token-monitoring",
  MOOD_ENERGY_SUGGESTIONS: "mood-energy-suggestions",
  WHAT_CHANGED: "what-changed",
});

export const APEX_OS_ACTIVE_LOOP_IDS = Object.freeze(Object.values(APEX_OS_ACTIVE_LOOP_ID));

export const APEX_OS_ACTIVE_LOOP_TRIGGER_TYPE = Object.freeze({
  MANUAL_REQUEST: "manual-request",
  APP_OPEN_PREVIEW: "app-open-preview",
  SESSION_HEARTBEAT_PREVIEW: "session-heartbeat-preview",
  SCHEDULED_HEARTBEAT_PLANNED: "scheduled-heartbeat-planned",
  WATCH_QUEUE_CHECK_PLANNED: "watch-queue-check-planned",
});

export const APEX_OS_ACTIVE_LOOP_TRIGGER_TYPES = Object.freeze(Object.values(APEX_OS_ACTIVE_LOOP_TRIGGER_TYPE));

export const APEX_OS_ACTIVE_LOOP_STATE = Object.freeze({
  DISABLED: "disabled",
  PLANNED: "planned",
  MANUAL_PREVIEW_READY: "manual-preview-ready",
  WAITING_OPERATOR_REVIEW: "waiting-operator-review",
  PAUSED: "paused",
  BLOCKED_BY_BUDGET: "blocked-by-budget",
  BLOCKED_BY_PRIVACY: "blocked-by-privacy",
  BLOCKED_BY_UNTRUSTED_CONTENT: "blocked-by-untrusted-content",
  BLOCKED_BY_APPROVAL: "blocked-by-approval",
  COMPLETED_REVIEW_ONLY: "completed-review-only",
});

export const APEX_OS_ACTIVE_LOOP_STATES = Object.freeze(Object.values(APEX_OS_ACTIVE_LOOP_STATE));

export const APEX_OS_ACTIVE_LOOP_OUTPUT_TYPE = Object.freeze({
  PRIVATE_BRIEF: "private-brief",
  PRIVATE_DIGEST: "private-digest",
  SUGGESTED_TASK_DRAFT: "suggested-task-draft",
  SUGGESTED_MEMORY_DRAFT: "suggested-memory-draft",
  RESEARCH_NOTE_DRAFT: "research-note-draft",
  APPROVAL_PACKET_DRAFT: "approval-packet-draft",
  NEXT_SAFE_ACTION_RECOMMENDATION: "next-safe-action-recommendation",
  BLOCKED_STATE_EXPLANATION: "blocked-state-explanation",
});

export const APEX_OS_ACTIVE_LOOP_OUTPUT_TYPES = Object.freeze(Object.values(APEX_OS_ACTIVE_LOOP_OUTPUT_TYPE));

const TEXT_LIMIT = 1000;
const SUMMARY_LIMIT = 360;
const DEFAULT_FORBIDDEN_ACTIONS = Object.freeze([
  "spend-money",
  "order-or-book",
  "send-message-email-or-sms",
  "write-calendar",
  "publish-publicly",
  "change-accounts-providers-or-billing",
  "deploy-or-touch-production",
  "change-schema-auth-session-or-permissions",
  "delete-files-or-records",
  "control-desktop-browser-or-music",
  "run-tools-connectors-plugins-code-or-shell",
  "expose-apex-os-to-field-customer-demo-users",
  "obey-untrusted-content",
  "hidden-surveillance-or-emotional-profiling",
]);

function text(value = "", limit = TEXT_LIMIT) {
  return String(value ?? "").replace(/\s+\n/g, "\n").replace(/\s+/g, " ").trim().slice(0, limit);
}

function lower(value = "") {
  return text(value).toLowerCase();
}

function normalizeEnum(value = "", allowed = [], fallback = "") {
  const normalized = lower(value);
  return allowed.includes(normalized) ? normalized : fallback;
}

function matchesAny(value = "", patterns = []) {
  return patterns.some((pattern) => pattern.test(value));
}

function safeCount(value = 0, max = 1000) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return 0;
  return Math.min(max, Math.round(number));
}

function loopSpec(input = {}) {
  return Object.freeze({
    loopId: normalizeApexOsActiveLoopId(input.loopId),
    label: text(input.label, 120),
    description: text(input.description, SUMMARY_LIMIT),
    triggerType: normalizeApexOsActiveLoopTriggerType(input.triggerType),
    enabledDefault: false,
    triggersEnabled: false,
    backgroundExecutionEnabled: false,
    operatorOnly: true,
    canExecuteNow: false,
    executionLocked: true,
    privacyFirewallRequired: true,
    untrustedContentFirewallRequired: true,
    modelRoute: APEX_OS_MODEL_ROUTE.BACKGROUND_LOOP,
    suggestedModelTier: text(input.suggestedModelTier || "nano", 40),
    tokenBudget: safeCount(input.tokenBudget || 320, 4000),
    timeBudgetMs: safeCount(input.timeBudgetMs || 1500, 120000),
    cooldownMinutes: safeCount(input.cooldownMinutes || 60, 1440),
    maxRunsPerDay: safeCount(input.maxRunsPerDay || 1, 24),
    outputType: normalizeApexOsActiveLoopOutputType(input.outputType),
    approvalNeeds: text(input.approvalNeeds || "Operator review required before any durable change or external action.", SUMMARY_LIMIT),
    allowedInputSources: Object.freeze((Array.isArray(input.allowedInputSources) ? input.allowedInputSources : [])
      .map((entry) => text(entry, 90))
      .filter(Boolean)
      .slice(0, 12)),
    safeTraceMetadata: Object.freeze({
      eventType: APEX_OS_TRACE_EVENT_TYPE.BACKGROUND_LOOP_PLANNED,
      source: APEX_OS_TRACE_SOURCE.BACKGROUND_LOOP,
      storesRawPrompt: false,
      storesRawResponse: false,
      storesRawMessages: false,
    }),
    pauseCancelBehavior: text(input.pauseCancelBehavior || "Pause the loop or global active intelligence; archive stale previews.", SUMMARY_LIMIT),
    forbiddenActions: Object.freeze([
      ...new Set([
        ...DEFAULT_FORBIDDEN_ACTIONS,
        ...(Array.isArray(input.forbiddenActions) ? input.forbiddenActions : []),
      ].map((entry) => text(entry, 120)).filter(Boolean)),
    ]),
  });
}

export function normalizeApexOsActiveLoopId(value = APEX_OS_ACTIVE_LOOP_ID.PRIORITY_MONITORING, fallback = APEX_OS_ACTIVE_LOOP_ID.PRIORITY_MONITORING) {
  return normalizeEnum(value, APEX_OS_ACTIVE_LOOP_IDS, fallback);
}

export function normalizeApexOsActiveLoopTriggerType(value = APEX_OS_ACTIVE_LOOP_TRIGGER_TYPE.MANUAL_REQUEST, fallback = APEX_OS_ACTIVE_LOOP_TRIGGER_TYPE.MANUAL_REQUEST) {
  return normalizeEnum(value, APEX_OS_ACTIVE_LOOP_TRIGGER_TYPES, fallback);
}

export function normalizeApexOsActiveLoopState(value = APEX_OS_ACTIVE_LOOP_STATE.PLANNED, fallback = APEX_OS_ACTIVE_LOOP_STATE.PLANNED) {
  return normalizeEnum(value, APEX_OS_ACTIVE_LOOP_STATES, fallback);
}

export function normalizeApexOsActiveLoopOutputType(value = APEX_OS_ACTIVE_LOOP_OUTPUT_TYPE.PRIVATE_BRIEF, fallback = APEX_OS_ACTIVE_LOOP_OUTPUT_TYPE.PRIVATE_BRIEF) {
  return normalizeEnum(value, APEX_OS_ACTIVE_LOOP_OUTPUT_TYPES, fallback);
}

export function buildDefaultApexOsActiveIntelligenceLoopSpecs() {
  return Object.freeze([
    loopSpec({
      loopId: APEX_OS_ACTIVE_LOOP_ID.MORNING_PLANNING,
      label: "Morning Planning",
      description: "Prepare a private daily priority brief from reviewed memory, tasks, reminders, active priorities, and Apex HQ build state.",
      tokenBudget: 420,
      timeBudgetMs: 2500,
      cooldownMinutes: 720,
      maxRunsPerDay: 1,
      outputType: APEX_OS_ACTIVE_LOOP_OUTPUT_TYPE.PRIVATE_BRIEF,
      approvalNeeds: "No approval for a private brief; approval required for sends, bookings, purchases, calendar writes, or account changes.",
      allowedInputSources: ["approved-memory", "reviewed-tasks-reminders", "active-priorities", "apex-hq-build-state", "affective-summary"],
    }),
    loopSpec({
      loopId: APEX_OS_ACTIVE_LOOP_ID.EVENING_REVIEW,
      label: "Evening Review",
      description: "Summarize the day privately, identify unfinished items, and draft review-first memory or tomorrow-priority suggestions.",
      tokenBudget: 420,
      timeBudgetMs: 2500,
      cooldownMinutes: 720,
      maxRunsPerDay: 1,
      outputType: APEX_OS_ACTIVE_LOOP_OUTPUT_TYPE.PRIVATE_DIGEST,
      approvalNeeds: "John reviews any suggested memory or task before it becomes durable.",
      allowedInputSources: ["completed-tasks", "open-tasks", "run-reports", "approved-memory", "apex-hq-progress"],
    }),
    loopSpec({
      loopId: APEX_OS_ACTIVE_LOOP_ID.PRIORITY_MONITORING,
      label: "Priority Monitoring",
      description: "Rank stale, urgent, or blocked private priorities and recommend the next safe move without executing it.",
      tokenBudget: 260,
      timeBudgetMs: 1500,
      cooldownMinutes: 120,
      maxRunsPerDay: 3,
      outputType: APEX_OS_ACTIVE_LOOP_OUTPUT_TYPE.NEXT_SAFE_ACTION_RECOMMENDATION,
      approvalNeeds: "No approval for private recommendations; approval required before any external action.",
      allowedInputSources: ["active-priorities", "reviewed-tasks-reminders", "blocked-runs", "trace-summary"],
    }),
    loopSpec({
      loopId: APEX_OS_ACTIVE_LOOP_ID.MEMORY_SUGGESTION_REVIEW,
      label: "Memory Suggestion Review",
      description: "Prepare a review queue for suggested memories, duplicate hints, and conflict hints without auto-approving memory.",
      tokenBudget: 220,
      timeBudgetMs: 1200,
      cooldownMinutes: 240,
      maxRunsPerDay: 4,
      outputType: APEX_OS_ACTIVE_LOOP_OUTPUT_TYPE.SUGGESTED_MEMORY_DRAFT,
      approvalNeeds: "John must explicitly approve, edit, archive, or reject every suggested memory.",
      allowedInputSources: ["suggested-memory", "approved-memory", "review-actions"],
    }),
    loopSpec({
      loopId: APEX_OS_ACTIVE_LOOP_ID.RESEARCH_WATCH_QUEUE,
      label: "Research Watch Queue",
      description: "Plan a source-aware research/watch preview and produce private research-note drafts only.",
      tokenBudget: 650,
      timeBudgetMs: 5000,
      cooldownMinutes: 1440,
      maxRunsPerDay: 2,
      outputType: APEX_OS_ACTIVE_LOOP_OUTPUT_TYPE.RESEARCH_NOTE_DRAFT,
      approvalNeeds: "Approval required before publishing, messaging, buying, booking, submitting forms, or changing accounts.",
      allowedInputSources: ["saved-research-question", "approved-context", "trusted-source-results", "prior-notes"],
      forbiddenActions: ["scrape-gated-private-sites-without-approval", "follow-untrusted-web-instructions"],
    }),
    loopSpec({
      loopId: APEX_OS_ACTIVE_LOOP_ID.APEX_HQ_BUILD_PROGRESS,
      label: "Apex HQ Build Progress",
      description: "Summarize build phase status, blockers, validation evidence, and next safe private build move.",
      tokenBudget: 520,
      timeBudgetMs: 3500,
      cooldownMinutes: 180,
      maxRunsPerDay: 4,
      outputType: APEX_OS_ACTIVE_LOOP_OUTPUT_TYPE.PRIVATE_DIGEST,
      approvalNeeds: "Approval required before deploys, production changes, schema/auth changes, deletion, or provider changes.",
      allowedInputSources: ["active-docs", "git-status-metadata", "test-evidence", "phase-reports", "trace-summary"],
    }),
    loopSpec({
      loopId: APEX_OS_ACTIVE_LOOP_ID.OPPORTUNITY_RISK_DETECTION,
      label: "Opportunity / Risk Detection",
      description: "Prepare a private opportunity/risk brief from approved business goals, roadmap, and research notes.",
      tokenBudget: 520,
      timeBudgetMs: 3500,
      cooldownMinutes: 720,
      maxRunsPerDay: 2,
      outputType: APEX_OS_ACTIVE_LOOP_OUTPUT_TYPE.PRIVATE_BRIEF,
      approvalNeeds: "Approval required for outreach, ad spend, public claims, pricing changes, legal or financial commitments.",
      allowedInputSources: ["business-goals", "sales-notes", "marketing-notes", "roadmap", "approved-research-notes"],
    }),
    loopSpec({
      loopId: APEX_OS_ACTIVE_LOOP_ID.COST_TOKEN_MONITORING,
      label: "Cost / Token Monitoring",
      description: "Summarize model route, token budget, latency, and throttle recommendations using safe metadata only.",
      tokenBudget: 140,
      timeBudgetMs: 800,
      cooldownMinutes: 240,
      maxRunsPerDay: 4,
      outputType: APEX_OS_ACTIVE_LOOP_OUTPUT_TYPE.PRIVATE_DIGEST,
      approvalNeeds: "Approval required before changing providers, accounts, billing settings, or credentials.",
      allowedInputSources: ["trace-summary", "model-routing-summary", "safe-usage-metadata"],
    }),
    loopSpec({
      loopId: APEX_OS_ACTIVE_LOOP_ID.MOOD_ENERGY_SUGGESTIONS,
      label: "Mood / Energy-Aware Suggestions",
      description: "Use explicit self-report and workload signals to adjust private planning style without diagnosis or profiling.",
      tokenBudget: 220,
      timeBudgetMs: 1200,
      cooldownMinutes: 720,
      maxRunsPerDay: 2,
      outputType: APEX_OS_ACTIVE_LOOP_OUTPUT_TYPE.NEXT_SAFE_ACTION_RECOMMENDATION,
      approvalNeeds: "Approval required before sharing personal state, booking, ordering, messaging, or changing calendars.",
      allowedInputSources: ["explicit-self-report", "affective-summary", "routine-preferences", "workload-summary"],
      forbiddenActions: ["diagnose-emotions-or-medical-state", "store-durable-psychological-profile"],
    }),
    loopSpec({
      loopId: APEX_OS_ACTIVE_LOOP_ID.WHAT_CHANGED,
      label: "What Changed Since Last Time",
      description: "Compare safe source snapshots and return a private change digest with confidence and next safe move.",
      tokenBudget: 420,
      timeBudgetMs: 3000,
      cooldownMinutes: 240,
      maxRunsPerDay: 4,
      outputType: APEX_OS_ACTIVE_LOOP_OUTPUT_TYPE.PRIVATE_DIGEST,
      approvalNeeds: "Approval required before acting on changes externally or mutating production.",
      allowedInputSources: ["last-snapshot-id", "current-source-snapshot", "docs-delta", "task-delta", "memory-delta"],
    }),
  ]);
}

export function getApexOsActiveIntelligenceLoopSpec(loopId = APEX_OS_ACTIVE_LOOP_ID.PRIORITY_MONITORING, specs = buildDefaultApexOsActiveIntelligenceLoopSpecs()) {
  const normalizedId = normalizeApexOsActiveLoopId(loopId);
  return (Array.isArray(specs) ? specs : []).find((entry) => entry.loopId === normalizedId)
    || buildDefaultApexOsActiveIntelligenceLoopSpecs().find((entry) => entry.loopId === APEX_OS_ACTIVE_LOOP_ID.PRIORITY_MONITORING);
}

export function inferApexOsActiveIntelligenceLoopIds(value = "", options = {}) {
  const normalized = lower(value);
  const requestedLoopId = normalizeEnum(options.requestedLoopId || "", APEX_OS_ACTIVE_LOOP_IDS, "");
  if (requestedLoopId) return Object.freeze([requestedLoopId]);
  if (!normalized) return Object.freeze([]);

  const ids = [];
  const add = (loopId) => {
    if (!ids.includes(loopId)) ids.push(loopId);
  };

  if (matchesAny(normalized, [/\b(morning|start my day|daily plan|plan my day|what should i handle today|what do i need to handle today|today's plan)\b/])) add(APEX_OS_ACTIVE_LOOP_ID.MORNING_PLANNING);
  if (matchesAny(normalized, [/\b(evening|review today|close out today|wrap up|what did i finish|end of day)\b/])) add(APEX_OS_ACTIVE_LOOP_ID.EVENING_REVIEW);
  if (matchesAny(normalized, [/\b(priorit(?:y|ies)|next safe move|what should i do next|needs attention|focus on next|handle next|stuck)\b/])) add(APEX_OS_ACTIVE_LOOP_ID.PRIORITY_MONITORING);
  if (matchesAny(normalized, [/\b(memory suggestions?|review memor(?:y|ies)|approve memor(?:y|ies)|what should you remember|learn from this)\b/])) add(APEX_OS_ACTIVE_LOOP_ID.MEMORY_SUGGESTION_REVIEW);
  if (matchesAny(normalized, [/\b(research|watch queue|watch this|monitor this|track this|freshness|latest|source-aware|look into)\b/])) add(APEX_OS_ACTIVE_LOOP_ID.RESEARCH_WATCH_QUEUE);
  if (matchesAny(normalized, [/\b(apex hq|build progress|build phase|roadmap|repo|code|bug|where are we|phase status)\b/])) add(APEX_OS_ACTIVE_LOOP_ID.APEX_HQ_BUILD_PROGRESS);
  if (matchesAny(normalized, [/\b(opportunit(?:y|ies)|risk|growth|sales|lead|market|demo target|business threat)\b/])) add(APEX_OS_ACTIVE_LOOP_ID.OPPORTUNITY_RISK_DETECTION);
  if (matchesAny(normalized, [/\b(token|tokens|cost|budget|model usage|latency|spend on ai|usage)\b/])) add(APEX_OS_ACTIVE_LOOP_ID.COST_TOKEN_MONITORING);
  if (matchesAny(normalized, [/\b(energy|mood|tired|overwhelmed|burned out|frustrated|focus music|low energy|mental load)\b/])) add(APEX_OS_ACTIVE_LOOP_ID.MOOD_ENERGY_SUGGESTIONS);
  if (matchesAny(normalized, [/\b(what changed|since last time|new since|delta|diff|changed since)\b/])) add(APEX_OS_ACTIVE_LOOP_ID.WHAT_CHANGED);

  return Object.freeze(ids.slice(0, 4));
}

function blockedStateFrom(input = {}) {
  const privacy = input.privacyFirewallSummary || {};
  const untrusted = input.untrustedContentFirewallSummary || {};
  const action = input.actionPermissionSummary || {};
  if (privacy.blockedCount || privacy.blocked) return APEX_OS_ACTIVE_LOOP_STATE.BLOCKED_BY_PRIVACY;
  if (untrusted.blocked || ["high", "critical"].includes(untrusted.highestRiskLevel)) return APEX_OS_ACTIVE_LOOP_STATE.BLOCKED_BY_UNTRUSTED_CONTENT;
  if (action.forbidden || action.riskTier === "forbidden") return APEX_OS_ACTIVE_LOOP_STATE.BLOCKED_BY_APPROVAL;
  if (action.requiresApproval && ["external-action", "high-risk"].includes(action.riskTier)) return APEX_OS_ACTIVE_LOOP_STATE.BLOCKED_BY_APPROVAL;
  return "";
}

export function planApexOsActiveIntelligenceLoops(input = {}) {
  const triggerType = normalizeApexOsActiveLoopTriggerType(input.triggerType);
  const selectedLoopIds = inferApexOsActiveIntelligenceLoopIds(input.description || input.question || "", {
    requestedLoopId: input.requestedLoopId,
  });
  const selectedLoops = selectedLoopIds
    .map((loopId) => getApexOsActiveIntelligenceLoopSpec(loopId))
    .filter(Boolean);
  const modelRoutingSummary = buildApexOsModelUsageMetadata({
    route: APEX_OS_MODEL_ROUTE.BACKGROUND_LOOP,
    riskTier: input.actionPermissionSummary?.riskTier || "safe-read",
    routeReason: "Phase 6B active-intelligence loops use compact model budget metadata only; no loop is executed.",
  });
  const blockedState = blockedStateFrom(input);
  const state = blockedState
    || (selectedLoops.length
      ? APEX_OS_ACTIVE_LOOP_STATE.MANUAL_PREVIEW_READY
      : APEX_OS_ACTIVE_LOOP_STATE.PLANNED);
  const approvalRequired = state === APEX_OS_ACTIVE_LOOP_STATE.BLOCKED_BY_APPROVAL || Boolean(input.actionPermissionSummary?.requiresApproval);
  const forbidden = state === APEX_OS_ACTIVE_LOOP_STATE.BLOCKED_BY_APPROVAL && Boolean(input.actionPermissionSummary?.forbidden);

  const maxTokenBudget = selectedLoops.reduce((total, loop) => total + safeCount(loop.tokenBudget, 4000), 0);
  const maxTimeBudgetMs = selectedLoops.reduce((total, loop) => total + safeCount(loop.timeBudgetMs, 120000), 0);
  const outputTypes = [...new Set(selectedLoops.map((loop) => loop.outputType))];

  const traceMetadata = createApexOsTraceEntry({
    eventType: APEX_OS_TRACE_EVENT_TYPE.BACKGROUND_LOOP_PLANNED,
    source: APEX_OS_TRACE_SOURCE.BACKGROUND_LOOP,
    status: [
      APEX_OS_ACTIVE_LOOP_STATE.BLOCKED_BY_PRIVACY,
      APEX_OS_ACTIVE_LOOP_STATE.BLOCKED_BY_UNTRUSTED_CONTENT,
      APEX_OS_ACTIVE_LOOP_STATE.BLOCKED_BY_APPROVAL,
      APEX_OS_ACTIVE_LOOP_STATE.BLOCKED_BY_BUDGET,
    ].includes(state)
      ? APEX_OS_TRACE_STATUS.BLOCKED
      : selectedLoops.length
        ? APEX_OS_TRACE_STATUS.COMPLETED
        : APEX_OS_TRACE_STATUS.SKIPPED,
    route: "active-intelligence-loop-planner",
    modelTier: modelRoutingSummary.selectedTier,
    modelAlias: modelRoutingSummary.selectedModelAlias,
    budgetLevel: modelRoutingSummary.budgetLevel,
    maxOutputTokens: modelRoutingSummary.maxOutputTokens,
    actionDomain: "planning",
    riskTier: state,
    approvalRequired,
    forbidden,
    canExecuteNow: false,
    skillId: "active-intelligence-loops",
    reasonCode: `active-intelligence-${state}`,
    safeMessage: "Active intelligence loop preview planned as operator-only metadata; no scheduler or execution path was created.",
  });

  return Object.freeze({
    phase: "Phase 6B",
    plannerId: "apex-os-active-intelligence-loop-planner",
    selectedLoopIds,
    selectedLoops: Object.freeze(selectedLoops),
    state,
    triggerType,
    triggerSource: triggerType === APEX_OS_ACTIVE_LOOP_TRIGGER_TYPE.MANUAL_REQUEST
      ? "operator-manual-request"
      : "planned-disabled-trigger",
    triggerDisabledByDefault: true,
    triggersEnabled: false,
    schedulerCreated: false,
    backgroundExecutionEnabled: false,
    operatorOnly: true,
    manualReviewFirst: true,
    requiresOperatorReview: true,
    approvalRequired,
    forbidden,
    canExecuteNow: false,
    executionLocked: true,
    outputTypes: Object.freeze(outputTypes),
    maxTokenBudget,
    maxTimeBudgetMs,
    modelRoutingSummary,
    safeTraceMetadata: traceMetadata,
    traceMetadata,
    privacyFirewallRequired: true,
    untrustedContentFirewallRequired: true,
    usesActionPermissionMatrix: true,
    usesToolRouterNoExecutionLock: true,
    usesExternalActionApprovalSystem: true,
    allowedOutputs: Object.freeze(APEX_OS_ACTIVE_LOOP_OUTPUT_TYPES),
    forbiddenActions: DEFAULT_FORBIDDEN_ACTIONS,
  });
}

export function buildApexOsActiveIntelligenceLoopSummary(value = {}, options = {}) {
  const plan = value?.plannerId ? value : planApexOsActiveIntelligenceLoops(value);
  const limit = Math.max(1, Math.min(8, Number(options.limit) || 4));
  const selectedLoops = (Array.isArray(plan.selectedLoops) ? plan.selectedLoops : []).slice(0, limit);
  const selectedLoopIds = (Array.isArray(plan.selectedLoopIds) ? plan.selectedLoopIds : []).slice(0, limit);
  const selectedLoopNames = selectedLoops.map((loop) => loop.label).filter(Boolean);
  const outputTypes = (Array.isArray(plan.outputTypes) ? plan.outputTypes : []).slice(0, limit);
  const blocked = /^blocked-by-/.test(plan.state || "");

  return Object.freeze({
    phase: "Phase 6B",
    plannerId: "apex-os-active-intelligence-loop-planner",
    state: normalizeApexOsActiveLoopState(plan.state),
    triggerType: normalizeApexOsActiveLoopTriggerType(plan.triggerType),
    triggerDisabledByDefault: true,
    triggersEnabled: false,
    schedulerCreated: false,
    backgroundExecutionEnabled: false,
    operatorOnly: true,
    manualReviewFirst: true,
    requiresOperatorReview: true,
    selectedLoopCount: selectedLoopIds.length,
    selectedLoopIds,
    selectedLoopNames,
    outputTypes,
    approvalRequired: Boolean(plan.approvalRequired),
    blocked,
    forbidden: Boolean(plan.forbidden),
    canExecuteNow: false,
    executionLocked: true,
    modelRoute: plan.modelRoutingSummary?.route || APEX_OS_MODEL_ROUTE.BACKGROUND_LOOP,
    selectedTier: plan.modelRoutingSummary?.selectedTier || "",
    budgetLevel: plan.modelRoutingSummary?.budgetLevel || "",
    maxOutputTokens: safeCount(plan.modelRoutingSummary?.maxOutputTokens || 0, 20_000),
    maxTokenBudget: safeCount(plan.maxTokenBudget || 0, 20_000),
    maxTimeBudgetMs: safeCount(plan.maxTimeBudgetMs || 0, 120_000),
    privacyFirewallRequired: true,
    untrustedContentFirewallRequired: true,
    storesRawPrompt: false,
    storesRawResponse: false,
    storesRawMessages: false,
    safeSummary: text(selectedLoopIds.length
      ? `Active intelligence preview selected ${selectedLoopIds.length} manual review-first loop${selectedLoopIds.length === 1 ? "" : "s"}: ${selectedLoopNames.join(", ")}. canExecuteNow=false; executionLocked=true; triggersEnabled=false.`
      : `Active intelligence planner is available for manual review-first loop previews. canExecuteNow=false; executionLocked=true; triggersEnabled=false.`,
    SUMMARY_LIMIT),
    summaryText: text(`${plan.state || APEX_OS_ACTIVE_LOOP_STATE.PLANNED}; loops=${selectedLoopIds.join(",") || "none"}; triggersEnabled=false; canExecuteNow=false; executionLocked=true`, SUMMARY_LIMIT),
  });
}
