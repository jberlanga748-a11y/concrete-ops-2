import fs from "node:fs/promises";
import path from "node:path";

import {
  APEX_BUILD_LOOP_ACTION,
  APEX_BUILD_LOOP_CODER_MODEL,
  APEX_BUILD_LOOP_CODER_NUM_CTX,
  APEX_BUILD_LOOP_OUTCOME,
  APEX_BUILD_LOOP_VERSION,
  buildApexBuildLoopCoderDispatch,
  buildApexBuildLoopReceipt,
  buildApexBuildLoopTaskPlan,
  inferApexBuildLoopCommand,
  sanitizeApexBuildLoopText,
  summarizeApexBuildLoopReceipt,
} from "../shared/apexAutonomousBuildLoop.js";
import {
  applyApexWorkstationBrainCommand,
} from "../shared/apexWorkstationBrainMode.js";
import {
  runApexBuilderControlledFix,
} from "./apex-os-builder-mode.js";

const RECEIPT_OUTPUT_PREFIX = "apex-build-loop-v0";
const RECEIPT_FILE_NAME = "receipt.json";
const MAX_RECENT_RECEIPTS = 8;

const buildLoopState = {
  status: "idle",
  activeTaskId: "",
  activeTaskTitle: "",
  activeProfileId: "",
  activeStartedAt: "",
  stoppedAt: "",
  lastReceipt: null,
  recentReceipts: [],
};

function text(value = "", limit = 240) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, limit);
}

function safeTimestamp(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
  return safeDate.toISOString();
}

function timestampForFolder(value = new Date()) {
  return safeTimestamp(value).replace(/[:.]/g, "-");
}

function clone(value) {
  return value && typeof value === "object" ? JSON.parse(JSON.stringify(value)) : value;
}

function rememberReceipt(receipt = null) {
  if (!receipt) return;
  buildLoopState.lastReceipt = receipt;
  buildLoopState.recentReceipts = [receipt, ...buildLoopState.recentReceipts.filter((entry) => entry?.taskId !== receipt.taskId)].slice(0, MAX_RECENT_RECEIPTS);
  buildLoopState.status = receipt.outcome === APEX_BUILD_LOOP_OUTCOME.BLOCKED
    ? "blocked"
    : receipt.outcome === APEX_BUILD_LOOP_OUTCOME.NEEDS_JOHN
      ? "needs-john"
      : "idle";
  buildLoopState.activeTaskId = "";
  buildLoopState.activeTaskTitle = "";
  buildLoopState.activeProfileId = "";
  buildLoopState.activeStartedAt = "";
}

async function saveReceipt(receipt = {}, input = {}) {
  const repoRoot = path.resolve(input.repoRoot || process.cwd());
  const now = input.now || receipt.createdAt || new Date().toISOString();
  const outputRoot = input.outputRoot
    ? path.resolve(input.outputRoot)
    : path.join(repoRoot, "outputs", `${RECEIPT_OUTPUT_PREFIX}-${timestampForFolder(now)}`);
  const repoPrefix = repoRoot.endsWith(path.sep) ? repoRoot : `${repoRoot}${path.sep}`;
  if (outputRoot !== repoRoot && !outputRoot.startsWith(repoPrefix)) {
    throw new Error("Apex build-loop receipt output path escaped the repo root.");
  }
  await fs.mkdir(outputRoot, { recursive: true });
  const finalReceipt = {
    ...receipt,
    receiptFolder: outputRoot,
  };
  await fs.writeFile(path.join(outputRoot, RECEIPT_FILE_NAME), `${JSON.stringify(finalReceipt, null, 2)}\n`, "utf8");
  return Object.freeze(finalReceipt);
}

function buildStatusOnlyReceipt(plan = {}, input = {}) {
  const now = safeTimestamp(input.now);
  const latest = buildLoopState.lastReceipt || null;
  const statusSummary = summarizeApexBuildLoopReceipt(latest);
  const answerByAction = {
    [APEX_BUILD_LOOP_ACTION.STATUS]: buildLoopState.activeTaskTitle
      ? `Apex is ${buildLoopState.status} on ${buildLoopState.activeTaskTitle}.`
      : `Apex coding is ${buildLoopState.status || "idle"}.`,
    [APEX_BUILD_LOOP_ACTION.CHANGES]: latest?.filesChanged?.length
      ? `Latest files changed: ${latest.filesChanged.join(", ")}.`
      : "No Apex build-loop file changes are recorded yet.",
    [APEX_BUILD_LOOP_ACTION.FAILURES]: latest?.outcome === APEX_BUILD_LOOP_OUTCOME.BLOCKED || latest?.outcome === APEX_BUILD_LOOP_OUTCOME.NEEDS_JOHN
      ? latest.reason || "The latest build-loop task stopped before a safe patch could be proven."
      : "No build-loop failure is recorded in the latest receipt.",
    [APEX_BUILD_LOOP_ACTION.CLEAR_SCREEN]: "Screen cleared.",
  };
  return buildApexBuildLoopReceipt({
    plan,
    status: "status-only",
    outcome: statusSummary.outcome || APEX_BUILD_LOOP_OUTCOME.IDLE,
    reason: answerByAction[plan.action] || statusSummary.detail || "Apex build-loop status checked.",
    rollbackStatus: "not-needed",
    now,
  });
}

async function maybeDispatchCoder(plan = {}, input = {}) {
  if (!plan.shouldDispatchCoder) {
    return buildApexBuildLoopCoderDispatch({
      taskId: plan.taskId,
      status: "not-needed",
    });
  }
  const runner = input.coderRunner;
  if (typeof runner !== "function") {
    return buildApexBuildLoopCoderDispatch({
      taskId: plan.taskId,
      status: "queued-for-controlled-builder",
    });
  }
  const startedAt = Date.now();
  const result = await runner({
    taskId: plan.taskId,
    model: APEX_BUILD_LOOP_CODER_MODEL,
    numCtx: APEX_BUILD_LOOP_CODER_NUM_CTX,
    route: "coding-analysis",
    profileId: plan.allowedProfileId,
    title: plan.title,
    filesConsidered: plan.filesConsidered || [],
    request: plan.request,
  });
  return buildApexBuildLoopCoderDispatch({
    taskId: plan.taskId,
    status: result?.status || "completed",
    queueReceipt: {
      serialized: true,
      activeModel: APEX_BUILD_LOOP_CODER_MODEL,
      activeMode: "coding",
      route: "coding-analysis",
      status: result?.status || "completed",
      queuedMs: Number(result?.queuedMs || 0) || 0,
      runMs: Number(result?.runMs || (Date.now() - startedAt)) || 0,
      priorityStopCommand: false,
      nonUrgentQueuedWhileCoding: true,
    },
  });
}

async function runControlledBuilderForPlan(plan = {}, input = {}) {
  if (!plan.shouldRunControlledBuilder) return null;
  return runApexBuilderControlledFix({
    request: plan.request || input.request || "",
    fixId: plan.builderFixId || "",
    source: APEX_BUILD_LOOP_VERSION,
    applyPatch: input.applyPatch !== false,
    runValidation: input.runValidation !== false,
    repoRoot: input.repoRoot || process.cwd(),
    runner: input.runner,
    readFile: input.readFile,
    writeFile: input.writeFile,
  });
}

export function getApexAutonomousBuildLoopState() {
  return Object.freeze({
    provider: APEX_BUILD_LOOP_VERSION,
    status: text(buildLoopState.status || "idle", 80),
    activeTaskId: text(buildLoopState.activeTaskId || "", 140),
    activeTaskTitle: text(buildLoopState.activeTaskTitle || "", 180),
    activeProfileId: text(buildLoopState.activeProfileId || "", 120),
    activeStartedAt: text(buildLoopState.activeStartedAt || "", 80),
    stoppedAt: text(buildLoopState.stoppedAt || "", 80),
    lastReceipt: clone(buildLoopState.lastReceipt),
    recentReceipts: clone(buildLoopState.recentReceipts),
    codingModel: APEX_BUILD_LOOP_CODER_MODEL,
    localOnly: true,
    operatorOnly: true,
    controlledBuilderOnly: true,
    rawFilesystemWritesEnabled: false,
    gitAutomationEnabled: false,
    deployEnabled: false,
    secretsExposed: false,
  });
}

export async function runApexAutonomousBuildLoop(input = {}) {
  const now = safeTimestamp(input.now);
  const request = sanitizeApexBuildLoopText(input.request || input.question || "", 420);
  const command = input.command?.action ? input.command : inferApexBuildLoopCommand(request);
  const plan = buildApexBuildLoopTaskPlan({
    request,
    command,
    now,
    activeState: getApexAutonomousBuildLoopState(),
  });

  if (plan.status === "not-detected") {
    return Object.freeze({
      buildLoop: {
        plan,
        receipt: null,
        state: getApexAutonomousBuildLoopState(),
      },
    });
  }

  if (plan.status === "blocked" || plan.status === "status-only") {
    const receipt = plan.status === "status-only"
      ? buildStatusOnlyReceipt(plan, { now })
      : buildApexBuildLoopReceipt({
          plan,
          status: "blocked",
          outcome: APEX_BUILD_LOOP_OUTCOME.BLOCKED,
          reason: plan.reason,
          rollbackStatus: "no-write",
          now,
        });
    const savedReceipt = input.skipReceiptSave ? receipt : await saveReceipt(receipt, input);
    if (plan.status === "blocked") rememberReceipt(savedReceipt);
    return Object.freeze({
      buildLoop: {
        plan,
        receipt: savedReceipt,
        state: getApexAutonomousBuildLoopState(),
      },
    });
  }

  if (plan.action === APEX_BUILD_LOOP_ACTION.STOP_CODING) {
    applyApexWorkstationBrainCommand({ question: "Apex, stop coding.", now });
    buildLoopState.status = "idle";
    buildLoopState.stoppedAt = now;
    const receipt = buildApexBuildLoopReceipt({
      plan,
      coderDispatch: buildApexBuildLoopCoderDispatch({ taskId: plan.taskId, status: "priority-stop" }),
      status: "stopped",
      outcome: APEX_BUILD_LOOP_OUTCOME.FIXED,
      reason: "Apex stopped Apex-owned coding mode routing. It did not kill unrelated processes.",
      rollbackStatus: "not-needed",
      now,
    });
    const savedReceipt = input.skipReceiptSave ? receipt : await saveReceipt(receipt, input);
    rememberReceipt(savedReceipt);
    return Object.freeze({
      buildLoop: {
        plan,
        receipt: savedReceipt,
        state: getApexAutonomousBuildLoopState(),
      },
    });
  }

  buildLoopState.status = "running";
  buildLoopState.activeTaskId = plan.taskId;
  buildLoopState.activeTaskTitle = plan.title;
  buildLoopState.activeProfileId = plan.allowedProfileId;
  buildLoopState.activeStartedAt = now;
  if (plan.action === APEX_BUILD_LOOP_ACTION.START_CODING) {
    applyApexWorkstationBrainCommand({ question: "Apex, start coding mode.", now });
  }

  let coderDispatch = null;
  let builderFixRun = null;
  let receipt = null;
  try {
    coderDispatch = await maybeDispatchCoder(plan, input);
    builderFixRun = await runControlledBuilderForPlan(plan, input);
    receipt = buildApexBuildLoopReceipt({
      plan,
      coderDispatch,
      builderFixRun,
      status: "",
      outcome: "",
      selfFixIterationCount: builderFixRun?.selfFixAutoDispatch ? 1 : 0,
      rollbackStatus: "",
      now,
    });
  } catch (error) {
    receipt = buildApexBuildLoopReceipt({
      plan,
      coderDispatch: coderDispatch || plan.coderDispatch,
      builderFixRun,
      status: "needs-john",
      outcome: APEX_BUILD_LOOP_OUTCOME.NEEDS_JOHN,
      reason: error?.message || "Apex build-loop task failed safely.",
      rollbackStatus: builderFixRun?.status === "reverted" ? "auto-reverted-after-validation-failure" : "no-unsafe-write",
      now,
    });
  }

  const savedReceipt = input.skipReceiptSave ? receipt : await saveReceipt(receipt, input);
  rememberReceipt(savedReceipt);
  return Object.freeze({
    buildLoop: {
      plan,
      receipt: savedReceipt,
      state: getApexAutonomousBuildLoopState(),
    },
  });
}

export function resetApexAutonomousBuildLoopStateForTests() {
  buildLoopState.status = "idle";
  buildLoopState.activeTaskId = "";
  buildLoopState.activeTaskTitle = "";
  buildLoopState.activeProfileId = "";
  buildLoopState.activeStartedAt = "";
  buildLoopState.stoppedAt = "";
  buildLoopState.lastReceipt = null;
  buildLoopState.recentReceipts = [];
}
