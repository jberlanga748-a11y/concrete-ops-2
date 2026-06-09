import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

import {
  APEX_LLAMA_CPP_DEFAULT_BASE_URL,
  APEX_LLAMA_CPP_ENV,
  APEX_LLAMA_CPP_MODEL_ID,
  getLlamaCppModelFileStatus,
  getLlamaCppProviderStatus,
  isLlamaCppReadyForApexLane,
  selectLlamaCppModelForApexLane,
} from "./apexLlamaCppProvider.js";
import {
  reloadApexOllamaBrainResidency,
} from "./apexOllamaProvider.js";
import {
  APEX_LOCAL_AGENT_EFFORT_ID,
  selectApexLocalAgentSpeedLane,
} from "../shared/apexLocalAgentSpeed.js";

export const APEX_LLAMA_CPP_RUNTIME_ENV = Object.freeze({
  EXE_PATH: "APEX_LLAMA_CPP_EXE",
  PORT: "APEX_LLAMA_CPP_PORT",
});

export const APEX_LLAMA_CPP_DEFAULT_EXE_PATH = path.join(
  os.homedir(),
  "tools",
  "llama.cpp-b9568-cuda13.3",
  "llama-server.exe",
);

const APEX_OLLAMA_RELOAD_CONFIRMATION = "reload apex brain";
const DEFAULT_PORT = 8081;
const DEFAULT_CTX = 8192;
const DEFAULT_WAIT_MS = 180_000;
const POLL_MS = 1_000;
const SHORT_LIMIT = 180;

const runtimeState = {
  child: null,
  pid: 0,
  model: "",
  modelFileName: "",
  port: DEFAULT_PORT,
  startedAt: "",
  lastAction: null,
};

function text(value = "", limit = SHORT_LIMIT) {
  return String(value ?? "").replace(/\s+\n/g, "\n").replace(/\s+/g, " ").trim().slice(0, limit);
}

function safeNumber(value = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function safePort(value = DEFAULT_PORT) {
  const parsed = Math.round(safeNumber(value));
  if (!parsed) return DEFAULT_PORT;
  return Math.max(1024, Math.min(65_535, parsed));
}

function safeWaitMs(value = DEFAULT_WAIT_MS) {
  const parsed = Math.round(safeNumber(value));
  if (!parsed) return DEFAULT_WAIT_MS;
  return Math.max(1_000, Math.min(300_000, parsed));
}

function publicPathStatus(filePath = "", exists = false) {
  return Object.freeze({
    fileName: text(filePath ? path.basename(filePath) : "", 220),
    available: Boolean(exists),
  });
}

function defaultSleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function childStillRunning(child = null) {
  if (!child) return false;
  if (child.exitCode !== null && child.exitCode !== undefined) return false;
  if (child.killed) return false;
  return true;
}

function publicRuntimeState() {
  const running = childStillRunning(runtimeState.child);
  if (!running && runtimeState.child) {
    runtimeState.child = null;
    runtimeState.pid = 0;
  }
  return Object.freeze({
    provider: "apex-llama-cpp-runtime",
    ownedProcessActive: running,
    ownedPid: running ? runtimeState.pid : 0,
    model: running ? runtimeState.model : "",
    modelFileName: running ? runtimeState.modelFileName : "",
    port: runtimeState.port,
    startedAt: running ? runtimeState.startedAt : "",
    lastAction: runtimeState.lastAction,
    broadProcessKill: false,
    randomProcessesTouched: false,
    openAiUsed: false,
    cloudUsed: false,
    secretsExposed: false,
  });
}

function runtimeReceipt(input = {}) {
  const receipt = Object.freeze({
    provider: "apex-llama-cpp-runtime",
    receiptType: "llama-cpp-runtime-action",
    action: text(input.action || "", 80),
    status: text(input.status || "completed", 80),
    reason: text(input.reason || "", 180),
    model: text(input.model || APEX_LLAMA_CPP_MODEL_ID.GPT_OSS_20B, 160),
    runtime: publicRuntimeState(),
    providerStatus: input.providerStatus || null,
    ollamaUnload: input.ollamaUnload || null,
    ollamaRestore: input.ollamaRestore || null,
    processStarted: Boolean(input.processStarted),
    processStopped: Boolean(input.processStopped),
    processOwned: Boolean(input.processOwned),
    canChatNow: Boolean(input.canChatNow),
    manualOnly: false,
    primaryProvider: true,
    noCloudFallback: true,
    noHiddenStartup: true,
    noStartupRegistration: true,
    noDeploy: true,
    schemaChanged: false,
    authChanged: false,
    sessionChanged: false,
    secretsExposed: false,
    rawPromptStored: false,
    rawResponseStored: false,
    createdAt: new Date().toISOString(),
  });
  runtimeState.lastAction = receipt;
  return receipt;
}

export function resolveApexLlamaCppRuntimeConfig(input = {}) {
  const env = input.env || process.env || {};
  const exePath = text(input.exePath || env[APEX_LLAMA_CPP_RUNTIME_ENV.EXE_PATH] || APEX_LLAMA_CPP_DEFAULT_EXE_PATH, 800);
  const port = safePort(input.port || env[APEX_LLAMA_CPP_RUNTIME_ENV.PORT] || DEFAULT_PORT);
  const model = text(input.model || APEX_LLAMA_CPP_MODEL_ID.GPT_OSS_20B, 160);
  const fileExists = input.fileExistsImpl || fs.existsSync;
  const modelFile = getLlamaCppModelFileStatus({ model, env });
  const exeAvailable = Boolean(exePath && fileExists(exePath));
  const modelAvailable = Boolean(modelFile.resolvedPath && fileExists(modelFile.resolvedPath));
  return Object.freeze({
    provider: "apex-llama-cpp-runtime",
    model,
    port,
    baseUrl: `http://127.0.0.1:${port}`,
    exePath,
    modelPath: modelFile.resolvedPath,
    exe: publicPathStatus(exePath, exeAvailable),
    modelFile: publicPathStatus(modelFile.resolvedPath, modelAvailable),
    exeAvailable,
    modelAvailable,
    args: Object.freeze([
      "-m", modelFile.resolvedPath,
      "--host", "127.0.0.1",
      "--port", String(port),
      "--ctx-size", String(DEFAULT_CTX),
      "--n-gpu-layers", "999",
      "--parallel", "1",
      "--ubatch-size", "512",
      "--jinja",
    ]),
    localOnly: true,
    secretsExposed: false,
  });
}

async function stopOwnedRuntime(input = {}) {
  const child = runtimeState.child;
  if (!childStillRunning(child)) {
    runtimeState.child = null;
    runtimeState.pid = 0;
    return Object.freeze({ stopped: false, reason: "no-owned-llama-cpp-process-running" });
  }
  try {
    child.kill(input.signal || "SIGTERM");
    runtimeState.child = null;
    runtimeState.pid = 0;
    return Object.freeze({ stopped: true, reason: "owned-llama-cpp-process-stopped" });
  } catch {
    return Object.freeze({ stopped: false, reason: "owned-llama-cpp-process-stop-failed" });
  }
}

async function readProviderStatus(input = {}) {
  if (typeof input.providerStatusImpl === "function") {
    return input.providerStatusImpl(input);
  }
  return getLlamaCppProviderStatus({
    ...input,
    baseUrl: input.baseUrl || APEX_LLAMA_CPP_DEFAULT_BASE_URL,
    timeoutMs: input.timeoutMs || 750,
  });
}

async function waitForReady(input = {}) {
  const waitMs = safeWaitMs(input.waitMs);
  const sleepImpl = input.sleepImpl || defaultSleep;
  const started = Date.now();
  let latest = null;
  while (Date.now() - started <= waitMs) {
    latest = await readProviderStatus(input).catch((error) => ({
      provider: "llama.cpp",
      available: false,
      reason: error?.message || "llama-cpp-status-failed",
    }));
    if (isLlamaCppReadyForApexLane({
      status: latest,
      laneSelection: input.laneSelection,
      modelSpec: input.modelSpec,
    })) {
      return Object.freeze({ ready: true, status: latest });
    }
    if (runtimeState.child && !childStillRunning(runtimeState.child)) {
      return Object.freeze({ ready: false, status: latest, reason: "owned-llama-cpp-process-exited" });
    }
    await sleepImpl(Math.min(POLL_MS, waitMs));
  }
  return Object.freeze({ ready: false, status: latest, reason: "llama-cpp-runtime-ready-timeout" });
}

async function unloadOllamaIfRequested(input = {}) {
  if (input.unloadOllama === false) return null;
  const reloadImpl = input.reloadOllamaImpl || reloadApexOllamaBrainResidency;
  return reloadImpl({
    confirmation: APEX_OLLAMA_RELOAD_CONFIRMATION,
    lane: "normal",
    reload: false,
    fetchImpl: input.ollamaFetchImpl || input.fetchImpl,
  }).catch((error) => Object.freeze({
    provider: "apex-ollama-brain-reload",
    status: "failed",
    reason: error?.message || "ollama-unload-failed",
  }));
}

async function restoreOllama(input = {}) {
  const reloadImpl = input.reloadOllamaImpl || reloadApexOllamaBrainResidency;
  return reloadImpl({
    confirmation: APEX_OLLAMA_RELOAD_CONFIRMATION,
    lane: "normal",
    reload: true,
    fetchImpl: input.ollamaFetchImpl || input.fetchImpl,
  }).catch((error) => Object.freeze({
    provider: "apex-ollama-brain-reload",
    status: "failed",
    reason: error?.message || "ollama-restore-failed",
  }));
}

export async function runApexLlamaCppRuntimeAction(input = {}) {
  const action = text(input.action || "status", 80).toLowerCase().replace(/[^a-z0-9-]+/g, "-");
  const model = text(input.model || APEX_LLAMA_CPP_MODEL_ID.GPT_OSS_20B, 160);
  const config = resolveApexLlamaCppRuntimeConfig(input);
  const laneSelection = selectApexLocalAgentSpeedLane({
    effort: input.effort || APEX_LOCAL_AGENT_EFFORT_ID.REASONING,
    modelNames: ["qwen3:14b", "gpt-oss:20b"],
  });
  const modelSpec = selectLlamaCppModelForApexLane(laneSelection);

  if (action === "status") {
    const providerStatus = await readProviderStatus({
      ...input,
      baseUrl: config.baseUrl,
      modelSpec,
      laneSelection,
    }).catch(() => null);
    return runtimeReceipt({
      action,
      status: "completed",
      reason: "llama-cpp-runtime-status-read",
      model,
      providerStatus,
      canChatNow: Boolean(providerStatus && isLlamaCppReadyForApexLane({ status: providerStatus, laneSelection, modelSpec })),
    });
  }

  if (action === "stop") {
    const stopped = await stopOwnedRuntime(input);
    const providerStatus = await readProviderStatus({
      ...input,
      baseUrl: config.baseUrl,
      modelSpec,
      laneSelection,
    }).catch(() => null);
    return runtimeReceipt({
      action,
      status: stopped.stopped ? "completed" : "noop",
      reason: stopped.reason,
      model,
      providerStatus,
      processStopped: stopped.stopped,
      processOwned: stopped.stopped,
      canChatNow: Boolean(providerStatus && isLlamaCppReadyForApexLane({ status: providerStatus, laneSelection, modelSpec })),
    });
  }

  if (action === "restore-ollama") {
    const stopped = await stopOwnedRuntime(input);
    const ollamaRestore = await restoreOllama(input);
    return runtimeReceipt({
      action,
      status: ollamaRestore?.status === "completed" ? "completed" : "failed",
      reason: ollamaRestore?.status === "completed" ? "ollama-fallback-restored" : "ollama-fallback-restore-failed",
      model,
      ollamaRestore,
      processStopped: stopped.stopped,
      processOwned: stopped.stopped,
      canChatNow: false,
    });
  }

  if (!["prepare-gpt", "start-gpt", "prepare", "prepare-primary", "start-primary"].includes(action)) {
    return runtimeReceipt({
      action,
      status: "blocked",
      reason: "unsupported-llama-cpp-runtime-action",
      model,
    });
  }

  if (!config.exeAvailable) {
    return runtimeReceipt({
      action,
      status: "blocked",
      reason: "llama-cpp-server-exe-missing",
      model,
    });
  }
  if (!config.modelAvailable) {
    return runtimeReceipt({
      action,
      status: "blocked",
      reason: "llama-cpp-model-file-missing",
      model,
    });
  }

  const initialStatus = await readProviderStatus({
    ...input,
    baseUrl: config.baseUrl,
    modelSpec,
    laneSelection,
  }).catch(() => null);
  if (initialStatus && isLlamaCppReadyForApexLane({ status: initialStatus, laneSelection, modelSpec })) {
    return runtimeReceipt({
      action,
      status: "completed",
      reason: "llama-cpp-sidecar-already-ready",
      model,
      providerStatus: initialStatus,
      processOwned: childStillRunning(runtimeState.child),
      canChatNow: true,
    });
  }
  if (initialStatus?.available) {
    return runtimeReceipt({
      action,
      status: "blocked",
      reason: "llama-cpp-port-owned-by-nonmatching-server",
      model,
      providerStatus: initialStatus,
      processOwned: false,
    });
  }

  const stopped = await stopOwnedRuntime(input);
  const ollamaUnload = await unloadOllamaIfRequested(input);
  const spawnImpl = input.spawnImpl || spawn;
  let child = null;
  try {
    child = spawnImpl(config.exePath, config.args, {
      cwd: path.dirname(config.exePath),
      windowsHide: true,
      detached: false,
      stdio: "ignore",
    });
  } catch {
    return runtimeReceipt({
      action,
      status: "failed",
      reason: "llama-cpp-spawn-failed",
      model,
      ollamaUnload,
      processStopped: stopped.stopped,
      processOwned: false,
    });
  }

  runtimeState.child = child;
  runtimeState.pid = Math.round(safeNumber(child?.pid));
  runtimeState.model = model;
  runtimeState.modelFileName = config.modelFile.fileName;
  runtimeState.port = config.port;
  runtimeState.startedAt = new Date().toISOString();

  const ready = await waitForReady({
    ...input,
    baseUrl: config.baseUrl,
    modelSpec,
    laneSelection,
  });
  if (!ready.ready) {
    return runtimeReceipt({
      action,
      status: "failed",
      reason: ready.reason || "llama-cpp-runtime-not-ready",
      model,
      providerStatus: ready.status,
      ollamaUnload,
      processStarted: true,
      processStopped: stopped.stopped,
      processOwned: true,
      canChatNow: false,
    });
  }

  return runtimeReceipt({
    action,
    status: "completed",
    reason: "llama-cpp-gpt-sidecar-ready",
    model,
    providerStatus: ready.status,
    ollamaUnload,
    processStarted: true,
    processStopped: stopped.stopped,
    processOwned: true,
    canChatNow: true,
  });
}

export function getApexLlamaCppRuntimeState() {
  return publicRuntimeState();
}

export function resetApexLlamaCppRuntimeStateForTests() {
  runtimeState.child = null;
  runtimeState.pid = 0;
  runtimeState.model = "";
  runtimeState.modelFileName = "";
  runtimeState.port = DEFAULT_PORT;
  runtimeState.startedAt = "";
  runtimeState.lastAction = null;
}
