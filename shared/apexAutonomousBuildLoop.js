export const APEX_BUILD_LOOP_VERSION = "apex-build-loop-v0";
export const APEX_BUILD_LOOP_CODER_MODEL = "qwen3:14b";
export const APEX_BUILD_LOOP_CODER_NUM_CTX = 4096;
export const APEX_BUILD_LOOP_DEEP_CODER_MODEL = "qwen3-coder:30b";

export const APEX_BUILD_LOOP_ACTION = Object.freeze({
  NOT_DETECTED: "not-detected",
  START_CODING: "start-coding",
  STOP_CODING: "stop-coding",
  STATUS: "status",
  CHANGES: "changes",
  FAILURES: "failures",
  WORK_ON_SELF: "work-on-self",
  FIX_SCREEN: "fix-screen",
  IMPROVE_VOICE_STATUS: "improve-voice-status",
  CLEAN_RUNTIME: "clean-runtime",
  CLEAR_SCREEN: "clear-screen",
});

export const APEX_BUILD_LOOP_OUTCOME = Object.freeze({
  FIXED: "fixed",
  BLOCKED: "blocked",
  NEEDS_JOHN: "needs-john",
  RUNNING: "running",
  IDLE: "idle",
});

export const APEX_BUILD_LOOP_ALLOWED_PROFILES = Object.freeze([
  Object.freeze({
    id: "apex-self-improvement",
    label: "Apex self-improvement",
    taskType: "local-ui-helper-repair",
    builderFixId: "apex-home-copy-polish",
    validationCommandId: "apex-home-focused-tests",
    likelyFiles: Object.freeze([
      "src/apex-control-room-components.jsx",
      "src/apex-control-room-utils.js",
      "src/apex-control-room-utils.test.js",
    ]),
    description: "Improve a small Apex Home/Builder/Self-Fix behavior through the existing controlled Builder profile.",
  }),
  Object.freeze({
    id: "apex-screen-repair",
    label: "Apex screen repair",
    taskType: "focused-screen-repair",
    builderFixId: "",
    validationCommandId: "apex-home-focused-tests",
    likelyFiles: Object.freeze([
      "src/apex-control-room-components.jsx",
      "src/apex-control-room-utils.js",
      "src/apex-control-room-components-import.test.js",
    ]),
    description: "Repair a focused Apex Home screen issue through Self-Fix/Builder classification.",
  }),
  Object.freeze({
    id: "apex-voice-status-polish",
    label: "Apex voice status polish",
    taskType: "voice-status-ui",
    builderFixId: "builder-status-label-repair",
    validationCommandId: "apex-home-focused-tests",
    likelyFiles: Object.freeze([
      "src/apex-control-room-components.jsx",
      "src/apex-control-room-utils.js",
      "src/apex-control-room-utils.test.js",
    ]),
    description: "Polish the compact local voice/status surface without changing STT/TTS providers.",
  }),
  Object.freeze({
    id: "apex-runtime-cleanup",
    label: "Apex local runtime cleanup",
    taskType: "runtime-launcher-polish",
    builderFixId: "utility-test-repair",
    validationCommandId: "git-diff-check",
    likelyFiles: Object.freeze([
      "scripts/apex-local-operator-runtime.mjs",
      "scripts/apex-local-operator-runtime.test.mjs",
      "src/apex-control-room-utils.js",
    ]),
    description: "Scope runtime cleanup work without killing unrelated processes or adding background services.",
  }),
  Object.freeze({
    id: "apex-coding-mode",
    label: "Apex coding mode",
    taskType: "coding-mode-control",
    builderFixId: "",
    validationCommandId: "git-diff-check",
    likelyFiles: Object.freeze([
      "shared/apexWorkstationBrainMode.js",
      "server/apexOllamaProvider.js",
      "server/apex-os-builder-mode.js",
    ]),
    description: "Start or stop the serialized local coding lane for Apex-owned build work.",
  }),
]);

const HARD_STOP_PATTERN = /\b(deploy|production|prod data|schema|auth|session|\.env|secret|token|password|api[_ -]?key|cookie|permission|role|delete|remove\s+file|destroy|drop\s+table|send|email|sms|spend|payment|charge|order|book(?:ing)?|appointment|customer-visible|customer visible|publish|post|git\s+(?:commit|push|checkout|reset|clean)|kill\s+(?:all|process)|taskkill)\b/i;
const SECRET_PATTERN = /\b(sk-[a-z0-9_-]+|bearer\s+[a-z0-9._~+/=-]+|(?:password|api[_ -]?key|token|cookie|session)\s*[:=]\s*[^,\s]+)\b/i;

function text(value = "", limit = 240) {
  return String(value ?? "")
    .replace(/\s+\n/g, "\n")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit);
}

function slug(value = "build-loop") {
  return text(value, 80)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    || "build-loop";
}

function uniqueList(values = [], limit = 10) {
  const seen = new Set();
  const output = [];
  for (const value of values) {
    const normalized = text(value, 180);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    output.push(normalized);
    if (output.length >= limit) break;
  }
  return Object.freeze(output);
}

export function sanitizeApexBuildLoopText(value = "", limit = 240) {
  return text(value, limit)
    .replace(SECRET_PATTERN, "[redacted]")
    .replace(/\.env\b/gi, "[env-file]");
}

export function inferApexBuildLoopCommand(question = "") {
  const normalized = text(question, 800).toLowerCase();
  if (!normalized) return Object.freeze({ detected: false, action: APEX_BUILD_LOOP_ACTION.NOT_DETECTED, profileId: "", reason: "" });
  if (/\b(clear the screen|hide everything|clean screen|minimal mode|go quiet|quiet down)\b/i.test(normalized)) {
    return Object.freeze({ detected: true, action: APEX_BUILD_LOOP_ACTION.CLEAR_SCREEN, profileId: "", reason: "clear-screen" });
  }
  if (/\b(stop coding|pause coding|stop building|pause building|stop working on yourself|cancel build loop|stop autonomous build)\b/i.test(normalized)) {
    return Object.freeze({ detected: true, action: APEX_BUILD_LOOP_ACTION.STOP_CODING, profileId: "apex-coding-mode", reason: "stop-apex-owned-coding" });
  }
  if (/\b(what are you building|what are you coding|what is apex building|build loop status|coding status)\b/i.test(normalized)) {
    return Object.freeze({ detected: true, action: APEX_BUILD_LOOP_ACTION.STATUS, profileId: "", reason: "status-request" });
  }
  if (/\b(what did you change|show what you changed|what did apex change)\b/i.test(normalized)) {
    return Object.freeze({ detected: true, action: APEX_BUILD_LOOP_ACTION.CHANGES, profileId: "", reason: "changes-request" });
  }
  if (/\b(what failed|what broke|what blocked|why did it fail|build loop failure)\b/i.test(normalized)) {
    return Object.freeze({ detected: true, action: APEX_BUILD_LOOP_ACTION.FAILURES, profileId: "", reason: "failure-request" });
  }
  if (/\b(start coding|start building|start the build loop|start autonomous build)\b/i.test(normalized)) {
    return Object.freeze({ detected: true, action: APEX_BUILD_LOOP_ACTION.START_CODING, profileId: "apex-coding-mode", reason: "start-coding-lane" });
  }
  if (/\b(work on yourself|improve yourself|make yourself better|work on apex itself)\b/i.test(normalized)) {
    return Object.freeze({ detected: true, action: APEX_BUILD_LOOP_ACTION.WORK_ON_SELF, profileId: "apex-self-improvement", reason: "self-improvement-request" });
  }
  if (/\b(improve your voice status|fix your voice status|voice status|local voice status)\b/i.test(normalized)) {
    return Object.freeze({ detected: true, action: APEX_BUILD_LOOP_ACTION.IMPROVE_VOICE_STATUS, profileId: "apex-voice-status-polish", reason: "voice-status-request" });
  }
  if (/\b(clean up your runtime|clean up apex runtime|clean up apex build loop|clean up coding runtime)\b/i.test(normalized)) {
    return Object.freeze({ detected: true, action: APEX_BUILD_LOOP_ACTION.CLEAN_RUNTIME, profileId: "apex-runtime-cleanup", reason: "runtime-cleanup-request" });
  }
  if (/\b(fix this screen|fix this page|fix this ui|fix this local|repair this screen|repair this page)\b/i.test(normalized)) {
    return Object.freeze({ detected: true, action: APEX_BUILD_LOOP_ACTION.FIX_SCREEN, profileId: "apex-screen-repair", reason: "screen-repair-request" });
  }
  return Object.freeze({ detected: false, action: APEX_BUILD_LOOP_ACTION.NOT_DETECTED, profileId: "", reason: "" });
}

export function findApexBuildLoopProfile(profileId = "") {
  const normalized = text(profileId, 120);
  return APEX_BUILD_LOOP_ALLOWED_PROFILES.find((profile) => profile.id === normalized) || null;
}

export function listApexBuildLoopProfiles() {
  return APEX_BUILD_LOOP_ALLOWED_PROFILES.map((profile) => Object.freeze({
    id: profile.id,
    label: profile.label,
    taskType: profile.taskType,
    builderFixId: profile.builderFixId,
    validationCommandId: profile.validationCommandId,
    likelyFiles: [...profile.likelyFiles],
    model: APEX_BUILD_LOOP_CODER_MODEL,
    numCtx: APEX_BUILD_LOOP_CODER_NUM_CTX,
    deepModel: APEX_BUILD_LOOP_DEEP_CODER_MODEL,
    deepManualOnly: true,
  }));
}

export function buildApexBuildLoopTaskPlan({
  request = "",
  command = null,
  now = new Date().toISOString(),
  activeState = {},
} = {}) {
  const inferred = command?.detected || command?.action ? command : inferApexBuildLoopCommand(request);
  const sanitizedRequest = sanitizeApexBuildLoopText(request, 420);
  const profile = findApexBuildLoopProfile(inferred.profileId);
  const blockedByHardStop = HARD_STOP_PATTERN.test(String(request || ""));
  const taskId = `${APEX_BUILD_LOOP_VERSION}-${slug(inferred.action || "task")}-${Date.now().toString(36)}`;
  const statusActions = new Set([
    APEX_BUILD_LOOP_ACTION.STATUS,
    APEX_BUILD_LOOP_ACTION.CHANGES,
    APEX_BUILD_LOOP_ACTION.FAILURES,
    APEX_BUILD_LOOP_ACTION.CLEAR_SCREEN,
  ]);

  if (blockedByHardStop) {
    return Object.freeze({
      version: APEX_BUILD_LOOP_VERSION,
      taskId,
      status: "blocked",
      action: inferred.action,
      outcome: APEX_BUILD_LOOP_OUTCOME.BLOCKED,
      requested: true,
      blocked: true,
      reason: "That request crossed a hard stop for autonomous build work.",
      request: "[blocked hard-stop request omitted]",
      title: "Blocked Apex build-loop request",
      taskType: "blocked",
      allowedProfileId: "",
      allowedProfileLabel: "",
      likelyFiles: Object.freeze([]),
      filesConsidered: Object.freeze([]),
      validationPlan: Object.freeze([]),
      rollbackPlan: "No local build-loop work ran.",
      blockedActions: hardStopActions(),
      canEditFilesDirectly: false,
      canUseRawFilesystemWrites: false,
      canRunGit: false,
      canDeploy: false,
      createdAt: text(now, 80),
    });
  }

  if (!inferred.detected) {
    return Object.freeze({
      version: APEX_BUILD_LOOP_VERSION,
      taskId,
      status: "not-detected",
      action: APEX_BUILD_LOOP_ACTION.NOT_DETECTED,
      outcome: APEX_BUILD_LOOP_OUTCOME.IDLE,
      requested: false,
      blocked: false,
      reason: "No Apex autonomous build-loop command was detected.",
      createdAt: text(now, 80),
    });
  }

  if (statusActions.has(inferred.action)) {
    return Object.freeze({
      version: APEX_BUILD_LOOP_VERSION,
      taskId,
      status: "status-only",
      action: inferred.action,
      outcome: APEX_BUILD_LOOP_OUTCOME.IDLE,
      requested: true,
      blocked: false,
      reason: inferred.reason,
      request: sanitizedRequest,
      title: "Apex build-loop status",
      taskType: "status",
      allowedProfileId: "",
      allowedProfileLabel: "",
      activeTaskId: text(activeState.activeTaskId || "", 120),
      activeTaskTitle: text(activeState.activeTaskTitle || "", 180),
      activeStatus: text(activeState.status || "idle", 80),
      createdAt: text(now, 80),
    });
  }

  if (!profile) {
    return Object.freeze({
      version: APEX_BUILD_LOOP_VERSION,
      taskId,
      status: "blocked",
      action: inferred.action,
      outcome: APEX_BUILD_LOOP_OUTCOME.BLOCKED,
      requested: true,
      blocked: true,
      reason: "No allowlisted Apex build-loop profile matched that request.",
      request: sanitizedRequest,
      title: "Blocked Apex build-loop request",
      taskType: "blocked",
      allowedProfileId: "",
      allowedProfileLabel: "",
      likelyFiles: Object.freeze([]),
      filesConsidered: Object.freeze([]),
      validationPlan: Object.freeze([]),
      rollbackPlan: "No local build-loop work ran.",
      blockedActions: hardStopActions(),
      canEditFilesDirectly: false,
      canUseRawFilesystemWrites: false,
      canRunGit: false,
      canDeploy: false,
      createdAt: text(now, 80),
    });
  }

  const titleByAction = {
    [APEX_BUILD_LOOP_ACTION.START_CODING]: "Start Apex coding mode",
    [APEX_BUILD_LOOP_ACTION.STOP_CODING]: "Stop Apex coding mode",
    [APEX_BUILD_LOOP_ACTION.WORK_ON_SELF]: "Work on Apex itself",
    [APEX_BUILD_LOOP_ACTION.FIX_SCREEN]: "Fix the current Apex screen",
    [APEX_BUILD_LOOP_ACTION.IMPROVE_VOICE_STATUS]: "Improve Apex voice status",
    [APEX_BUILD_LOOP_ACTION.CLEAN_RUNTIME]: "Clean up Apex local runtime",
  };
  const shouldDispatchCoder = ![APEX_BUILD_LOOP_ACTION.STOP_CODING].includes(inferred.action);
  const shouldRunControlledBuilder = ![APEX_BUILD_LOOP_ACTION.START_CODING, APEX_BUILD_LOOP_ACTION.STOP_CODING].includes(inferred.action);

  return Object.freeze({
    version: APEX_BUILD_LOOP_VERSION,
    taskId,
    status: "planned",
    action: inferred.action,
    outcome: APEX_BUILD_LOOP_OUTCOME.RUNNING,
    requested: true,
    blocked: false,
    reason: inferred.reason,
    request: sanitizedRequest,
    title: titleByAction[inferred.action] || profile.label,
    taskType: profile.taskType,
    allowedProfileId: profile.id,
    allowedProfileLabel: profile.label,
    builderFixId: profile.builderFixId,
    validationCommandId: profile.validationCommandId,
    likelyFiles: profile.likelyFiles,
    filesConsidered: profile.likelyFiles,
    validationPlan: Object.freeze([profile.validationCommandId, "git-diff-check"].filter(Boolean)),
    rollbackPlan: "Rollback only Apex-owned controlled patches through Builder undo/auto-revert receipts. Do not use git reset, checkout, clean, deletion, deploy rollback, or production rollback.",
    blockedActions: hardStopActions(),
    coderDispatch: buildApexBuildLoopCoderDispatch({ taskId, route: "coding-analysis", status: shouldDispatchCoder ? "queued" : "not-needed" }),
    shouldDispatchCoder,
    shouldRunControlledBuilder,
    canApplyControlledPatches: shouldRunControlledBuilder,
    canEditFilesDirectly: false,
    canUseRawFilesystemWrites: false,
    canRunGit: false,
    canDeploy: false,
    createdAt: text(now, 80),
  });
}

export function buildApexBuildLoopCoderDispatch({
  taskId = "",
  route = "coding-analysis",
  status = "queued",
  queueReceipt = null,
  model = APEX_BUILD_LOOP_CODER_MODEL,
  numCtx = APEX_BUILD_LOOP_CODER_NUM_CTX,
} = {}) {
  return Object.freeze({
    provider: "ollama",
    model,
    numCtx,
    route: text(route, 120),
    status: text(status, 80),
    async: true,
    serialized: true,
    deepModel: APEX_BUILD_LOOP_DEEP_CODER_MODEL,
    deepManualOnly: true,
    autoPromoteTo30B: false,
    taskId: text(taskId, 140),
    queueReceipt: queueReceipt ? {
      serialized: Boolean(queueReceipt.serialized),
      activeModel: text(queueReceipt.activeModel || model, 160),
      activeMode: text(queueReceipt.activeMode || "coding", 80),
      route: text(queueReceipt.route || route, 120),
      status: text(queueReceipt.status || status, 80),
      queuedMs: Number(queueReceipt.queuedMs || 0) || 0,
      runMs: Number(queueReceipt.runMs || 0) || 0,
      priorityStopCommand: Boolean(queueReceipt.priorityStopCommand),
      nonUrgentQueuedWhileCoding: Boolean(queueReceipt.nonUrgentQueuedWhileCoding),
    } : null,
    rawPromptStored: false,
    rawResponseStored: false,
    openAiUsed: false,
    cloudUsed: false,
    secretsExposed: false,
  });
}

export function buildApexBuildLoopReceipt({
  plan = {},
  coderDispatch = null,
  builderFixRun = null,
  validationRuns = [],
  status = "",
  outcome = "",
  receiptFolder = "",
  selfFixIterationCount = 0,
  rollbackStatus = "",
  reason = "",
  now = new Date().toISOString(),
} = {}) {
  const effectiveOutcome = outcome || outcomeFromBuilderFix(builderFixRun, plan);
  const effectiveStatus = status || (effectiveOutcome === APEX_BUILD_LOOP_OUTCOME.FIXED
    ? "completed"
    : effectiveOutcome === APEX_BUILD_LOOP_OUTCOME.BLOCKED
      ? "blocked"
      : effectiveOutcome === APEX_BUILD_LOOP_OUTCOME.NEEDS_JOHN
        ? "needs-john"
        : "recorded");
  const patchHandoffStatus = builderFixRun?.selfFixAutoDispatch?.handoffStatus
    || (builderFixRun?.patchPreviews?.length ? "controlled-builder-profile" : "not-needed");
  const filesChanged = uniqueList([
    ...((Array.isArray(builderFixRun?.filesTouched) ? builderFixRun.filesTouched : [])),
    ...((Array.isArray(builderFixRun?.patchResults) ? builderFixRun.patchResults : []).filter((patch) => patch.changed || patch.reverted).map((patch) => patch.file)),
  ], 12);
  const filesConsidered = uniqueList([
    ...((Array.isArray(plan.filesConsidered) ? plan.filesConsidered : [])),
    ...((Array.isArray(builderFixRun?.scopedFiles) ? builderFixRun.scopedFiles : [])),
  ], 12);
  const validationSummaries = [
    ...((Array.isArray(validationRuns) ? validationRuns : [])),
    builderFixRun?.validationSummary || builderFixRun?.validationRun || null,
  ].filter(Boolean).slice(0, 8).map((run) => Object.freeze({
    commandId: sanitizeApexBuildLoopText(run.commandId || run.id || "", 120),
    label: sanitizeApexBuildLoopText(run.label || "", 180),
    status: sanitizeApexBuildLoopText(run.status || (run.ok ? "passed" : "recorded"), 80),
    ok: Boolean(run.ok),
  }));
  return Object.freeze({
    version: APEX_BUILD_LOOP_VERSION,
    taskId: sanitizeApexBuildLoopText(plan.taskId || "", 140),
    action: sanitizeApexBuildLoopText(plan.action || "", 80),
    taskTitle: sanitizeApexBuildLoopText(plan.title || "Apex build-loop task", 180),
    taskProfile: sanitizeApexBuildLoopText(plan.allowedProfileId || "", 120),
    taskProfileLabel: sanitizeApexBuildLoopText(plan.allowedProfileLabel || "", 160),
    status: effectiveStatus,
    outcome: effectiveOutcome,
    reason: sanitizeApexBuildLoopText(reason || builderFixRun?.receipt || plan.reason || "", 620),
    request: plan.blocked ? "[blocked hard-stop request omitted]" : sanitizeApexBuildLoopText(plan.request || "", 420),
    filesConsidered,
    filesChanged,
    patchHandoffId: sanitizeApexBuildLoopText(builderFixRun?.selfFixAutoDispatch?.id || builderFixRun?.id || "", 140),
    patchHandoffStatus,
    validationCommands: validationSummaries,
    selfFixIterationCount: Number(selfFixIterationCount || 0) || 0,
    rollbackStatus: sanitizeApexBuildLoopText(rollbackStatus || rollbackStatusFromBuilderFix(builderFixRun), 160),
    finalOutcome: effectiveOutcome,
    shortAnswer: shortAnswerForApexBuildLoopOutcome(effectiveOutcome, builderFixRun),
    coderDispatch: coderDispatch || plan.coderDispatch || null,
    builderFixRun: builderFixRun ? sanitizeBuilderFixRunForReceipt(builderFixRun) : null,
    receiptFolder: sanitizeApexBuildLoopText(receiptFolder, 260),
    permissionsPrivacyImpact: "Operator-only local Apex build loop. No deploy, production, schema/auth/session, secrets, sends, spend, orders, bookings, customer-visible changes, arbitrary desktop control, unrelated process killing, or permission weakening.",
    canEditFilesDirectly: false,
    canUseRawFilesystemWrites: false,
    canRunGit: false,
    canDeploy: false,
    controlledBuilderOnly: true,
    createdAt: sanitizeApexBuildLoopText(now, 80),
  });
}

export function buildApexBuildLoopConversationResponse({
  question = "",
  receipt = null,
  state = {},
} = {}) {
  const command = inferApexBuildLoopCommand(question);
  if (!command.detected || command.action === APEX_BUILD_LOOP_ACTION.CLEAR_SCREEN) {
    return Object.freeze({ handled: false });
  }
  const latest = receipt || state.lastReceipt || null;
  if ((command.action === APEX_BUILD_LOOP_ACTION.CHANGES || command.action === APEX_BUILD_LOOP_ACTION.FAILURES) && !latest) {
    return Object.freeze({ handled: false });
  }
  if (command.action === APEX_BUILD_LOOP_ACTION.STATUS) {
    const active = state.activeTaskTitle || latest?.taskTitle || "";
    const status = state.status || latest?.status || "idle";
    const statusLabel = status === "needs-john" ? "blocked safely" : status;
    return Object.freeze({
      handled: true,
      intent: "apex-build-loop-status",
      answer: active
        ? `Coding is ${statusLabel}. Current build task: ${active}. I route normal scoped work to ${APEX_BUILD_LOOP_CODER_MODEL} at ${APEX_BUILD_LOOP_CODER_NUM_CTX} context; ${APEX_BUILD_LOOP_DEEP_CODER_MODEL} stays manual-only for explicit deep work. Changes still pass controlled Builder/Self-Fix tooling.`
        : `Coding is ${statusLabel}. I do not have an active Apex-owned build task right now.`,
      sourceLabels: Object.freeze(["Apex Autonomous Build Loop v0", "Builder Mode", "Local Ollama"]),
      buildLoopCommand: command,
    });
  }
  if (command.action === APEX_BUILD_LOOP_ACTION.CHANGES) {
    const changed = latest?.filesChanged?.length ? latest.filesChanged.join(", ") : "no Apex build-loop file changes are recorded yet";
    return Object.freeze({
      handled: true,
      intent: "apex-build-loop-changes",
      answer: `Latest build-loop change summary: ${changed}. ${latest?.shortAnswer || "No controlled build-loop fix has completed yet."}`,
      sourceLabels: Object.freeze(["Apex Autonomous Build Loop v0", "Builder Receipts"]),
      buildLoopCommand: command,
    });
  }
  if (command.action === APEX_BUILD_LOOP_ACTION.FAILURES) {
    const failure = latest?.outcome === APEX_BUILD_LOOP_OUTCOME.BLOCKED || latest?.outcome === APEX_BUILD_LOOP_OUTCOME.NEEDS_JOHN
      ? latest.reason || latest.rollbackStatus || "The last build-loop task stopped before a safe patch could be proven."
      : "No build-loop failure is recorded in the latest receipt.";
    return Object.freeze({
      handled: true,
      intent: "apex-build-loop-failures",
      answer: failure,
      sourceLabels: Object.freeze(["Apex Autonomous Build Loop v0", "Builder Receipts"]),
      buildLoopCommand: command,
    });
  }
  return Object.freeze({
    handled: true,
    intent: `apex-build-loop-${command.action}`,
    answer: command.action === APEX_BUILD_LOOP_ACTION.STOP_CODING
      ? "Stopping Apex-owned coding. I will not kill unrelated processes."
      : `Working. I’m creating a scoped local build task and routing normal coding through ${APEX_BUILD_LOOP_CODER_MODEL} at ${APEX_BUILD_LOOP_CODER_NUM_CTX} context; any patch still has to pass controlled Builder/Self-Fix safeguards. ${APEX_BUILD_LOOP_DEEP_CODER_MODEL} stays manual-only.`,
    sourceLabels: Object.freeze(["Apex Autonomous Build Loop v0", "Builder Mode", "Local Ollama"]),
    buildLoopCommand: command,
    autoBuildLoopEligible: true,
  });
}

export function summarizeApexBuildLoopReceipt(receipt = null) {
  if (!receipt) {
    return Object.freeze({
      status: "idle",
      outcome: APEX_BUILD_LOOP_OUTCOME.IDLE,
      label: "Coding idle",
      detail: "No Apex-owned build-loop task is active.",
      pulse: "",
    });
  }
  const outcome = receipt.outcome || receipt.finalOutcome || APEX_BUILD_LOOP_OUTCOME.IDLE;
  return Object.freeze({
    status: receipt.status || "recorded",
    outcome,
    label: outcome === APEX_BUILD_LOOP_OUTCOME.FIXED
      ? "Fixed"
      : outcome === APEX_BUILD_LOOP_OUTCOME.BLOCKED
        ? "Blocked"
        : outcome === APEX_BUILD_LOOP_OUTCOME.NEEDS_JOHN
          ? "Needs John"
          : outcome === APEX_BUILD_LOOP_OUTCOME.RUNNING
            ? "Coding"
            : "Coding idle",
    detail: sanitizeApexBuildLoopText(receipt.shortAnswer || receipt.reason || receipt.taskTitle || "", 220),
    pulse: sanitizeApexBuildLoopText(receipt.taskTitle || receipt.taskProfileLabel || "", 120),
  });
}

function hardStopActions() {
  return Object.freeze([
    "deploy",
    "production changes",
    "schema/auth/session changes",
    "secrets access/exposure",
    "permission weakening",
    "destructive deletion",
    "git reset/checkout/clean/commit/push",
    "sends/spend/orders/bookings",
    "customer-visible changes",
    "arbitrary desktop control",
    "unrelated process killing",
  ]);
}

function outcomeFromBuilderFix(builderFixRun = null, plan = {}) {
  if (plan.blocked || builderFixRun?.status === "blocked") return APEX_BUILD_LOOP_OUTCOME.BLOCKED;
  if (["fixed", "already-fixed", "scoped"].includes(String(builderFixRun?.status || "")) && builderFixRun?.ok !== false) return APEX_BUILD_LOOP_OUTCOME.FIXED;
  if (["needs-attention", "reverted", "failed"].includes(String(builderFixRun?.status || ""))) return APEX_BUILD_LOOP_OUTCOME.NEEDS_JOHN;
  if (plan.action === APEX_BUILD_LOOP_ACTION.START_CODING || plan.action === APEX_BUILD_LOOP_ACTION.STOP_CODING) return APEX_BUILD_LOOP_OUTCOME.FIXED;
  if (plan.blocked) return APEX_BUILD_LOOP_OUTCOME.BLOCKED;
  return APEX_BUILD_LOOP_OUTCOME.NEEDS_JOHN;
}

function rollbackStatusFromBuilderFix(builderFixRun = null) {
  if (!builderFixRun) return "not-needed";
  if (builderFixRun.status === "reverted") return "auto-reverted-after-validation-failure";
  if (builderFixRun.undoAvailable) return "local-undo-available";
  if (builderFixRun.status === "blocked") return "no-write";
  return "not-needed";
}

function shortAnswerForApexBuildLoopOutcome(outcome = "", builderFixRun = null) {
  if (outcome === APEX_BUILD_LOOP_OUTCOME.FIXED) {
    if (builderFixRun?.validationSummary?.ok || builderFixRun?.validationRun?.ok) return "Fixed.";
    return "Handled.";
  }
  if (outcome === APEX_BUILD_LOOP_OUTCOME.BLOCKED) return "Blocked.";
  if (outcome === APEX_BUILD_LOOP_OUTCOME.NEEDS_JOHN) return "Stopped before a safe patch could be proven.";
  if (outcome === APEX_BUILD_LOOP_OUTCOME.RUNNING) return "Working.";
  return "Idle.";
}

function sanitizeBuilderFixRunForReceipt(fixRun = {}) {
  return Object.freeze({
    id: sanitizeApexBuildLoopText(fixRun.id || "", 140),
    fixId: sanitizeApexBuildLoopText(fixRun.fixId || "", 140),
    status: sanitizeApexBuildLoopText(fixRun.status || "", 80),
    ok: Boolean(fixRun.ok),
    label: sanitizeApexBuildLoopText(fixRun.label || "", 180),
    filesTouched: uniqueList(fixRun.filesTouched || [], 10),
    scopedFiles: uniqueList(fixRun.scopedFiles || [], 10),
    validationSummary: fixRun.validationSummary ? {
      commandId: sanitizeApexBuildLoopText(fixRun.validationSummary.commandId || "", 120),
      label: sanitizeApexBuildLoopText(fixRun.validationSummary.label || "", 180),
      status: sanitizeApexBuildLoopText(fixRun.validationSummary.status || "", 80),
      ok: Boolean(fixRun.validationSummary.ok),
    } : null,
    undoAvailable: Boolean(fixRun.undoAvailable),
    autoRevertOnValidationFailure: Boolean(fixRun.autoRevertOnValidationFailure),
    receipt: sanitizeApexBuildLoopText(fixRun.receipt || "", 620),
    canExecuteExternalActions: false,
    canApplyBroadPatches: false,
    controlledPatchOnly: true,
  });
}
