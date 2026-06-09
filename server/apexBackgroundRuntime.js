import process from "node:process";

import {
  APEX_OLLAMA_CODING_CHAT_MODEL,
  APEX_OLLAMA_DEFAULT_BASE_URL,
  APEX_OLLAMA_DEFAULT_CHAT_MODEL,
  APEX_OLLAMA_ENV,
  getOllamaProviderStatus,
  getApexOllamaRequestQueueState,
  getApexOllamaResidencyStatus,
} from "./apexOllamaProvider.js";
import {
  getApexGpuStatus,
} from "./apexGpuSpeedCore.js";
import {
  getCachedApexLocalVoiceRuntimeStatus,
} from "./apexLocalVoiceRuntime.js";
import {
  readApexLocalAgentSpeedBenchmarkHistory,
} from "./apexLocalAgentSpeedHistory.js";
import {
  readApexLiveTurnLatencyHistory,
} from "./apexLiveTurnLatencyHistory.js";
import {
  buildApexAlwaysOpenMicStatus,
} from "../shared/apexAlwaysOpenMicRuntime.js";
import {
  buildApexWorkstationBrainStatus,
  getApexWorkstationBrainRuntimeState,
  readApexWorkstationBrainConfig,
} from "../shared/apexWorkstationBrainMode.js";
import {
  buildApexLatencyProfile,
} from "../shared/apexVoiceTurnDiagnostics.js";
import {
  APEX_LOCAL_AGENT_SPEED_KEEP_ALIVE,
  selectApexLocalAgentSpeedLane,
  buildApexStableResidencyPolicy,
  buildApexLocalAgentWarmResidencyPlan,
} from "../shared/apexLocalAgentSpeed.js";

export const APEX_BACKGROUND_RUNTIME_ENV = Object.freeze({
  KEEP_WARM_ENABLED: "APEX_BACKGROUND_KEEP_WARM_ENABLED",
  KEEP_WARM_MODEL: "APEX_BACKGROUND_KEEP_WARM_MODEL",
  KEEP_WARM_KEEP_ALIVE: "APEX_BACKGROUND_KEEP_WARM_KEEP_ALIVE",
  HEARTBEAT_INTERVAL_MS: "APEX_BACKGROUND_HEARTBEAT_INTERVAL_MS",
  SUPERVISOR_PID: "APEX_LOCAL_SUPERVISOR_PID",
  SUPERVISOR_STARTED_AT: "APEX_LOCAL_SUPERVISOR_STARTED_AT",
});

const DEFAULT_HEARTBEAT_INTERVAL_MS = 60_000;
const DEFAULT_KEEP_WARM_KEEP_ALIVE = APEX_LOCAL_AGENT_SPEED_KEEP_ALIVE.FAST;
const MIN_HEARTBEAT_INTERVAL_MS = 15_000;
const MAX_HEARTBEAT_INTERVAL_MS = 15 * 60_000;
const backgroundRuntimeStartedAt = new Date().toISOString();
const backgroundRuntimeState = {
  timer: null,
  lastHeartbeat: null,
  lastKeepWarmReceipt: null,
};

function text(value = "", limit = 220) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, limit);
}

function bool(value) {
  return value === true || /^(1|true|yes|on|enabled)$/i.test(String(value || "").trim());
}

function positiveInt(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function clampMs(value, fallback = DEFAULT_HEARTBEAT_INTERVAL_MS) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.max(MIN_HEARTBEAT_INTERVAL_MS, Math.min(MAX_HEARTBEAT_INTERVAL_MS, Math.round(parsed)));
}

function normalizeLocalOllamaBaseUrl(value = APEX_OLLAMA_DEFAULT_BASE_URL) {
  try {
    const parsed = new URL(String(value || APEX_OLLAMA_DEFAULT_BASE_URL).trim());
    const host = parsed.hostname.toLowerCase();
    const isLocal = parsed.protocol === "http:"
      && !parsed.username
      && !parsed.password
      && (host === "localhost" || host === "127.0.0.1" || host === "::1" || /^127(?:\.\d{1,3}){3}$/.test(host));
    if (!isLocal) return "";
    parsed.pathname = "";
    parsed.search = "";
    parsed.hash = "";
    return parsed.origin;
  } catch {
    return "";
  }
}

function modelReadiness(modelNames = [], model = "") {
  const target = text(model, 160).toLowerCase();
  const installed = (Array.isArray(modelNames) ? modelNames : [])
    .map((name) => text(name, 160).toLowerCase())
    .includes(target);
  return Object.freeze({
    model,
    installed,
    status: installed ? "ready" : "missing",
  });
}

export function readApexBackgroundRuntimeConfig(input = {}) {
  const env = input.env || process.env || {};
  const keepWarmRaw = input.keepWarmEnabled ?? env[APEX_BACKGROUND_RUNTIME_ENV.KEEP_WARM_ENABLED];
  const keepWarmEnabled = keepWarmRaw === undefined ? false : bool(keepWarmRaw);
  const requestedKeepAlive = text(input.keepAlive || env[APEX_BACKGROUND_RUNTIME_ENV.KEEP_WARM_KEEP_ALIVE] || DEFAULT_KEEP_WARM_KEEP_ALIVE, 24);
  const keepAlive = requestedKeepAlive === "-1" ? DEFAULT_KEEP_WARM_KEEP_ALIVE : requestedKeepAlive || DEFAULT_KEEP_WARM_KEEP_ALIVE;
  const model = text(input.keepWarmModel || env[APEX_BACKGROUND_RUNTIME_ENV.KEEP_WARM_MODEL] || APEX_OLLAMA_DEFAULT_CHAT_MODEL, 160) || APEX_OLLAMA_DEFAULT_CHAT_MODEL;
  return Object.freeze({
    provider: "apex-background-runtime",
    keepWarmEnabled,
    keepWarmModel: model,
    keepAlive,
    keepAlivePermanent: false,
    heartbeatIntervalMs: clampMs(input.heartbeatIntervalMs || env[APEX_BACKGROUND_RUNTIME_ENV.HEARTBEAT_INTERVAL_MS]),
    supervisorPid: positiveInt(input.supervisorPid || env[APEX_BACKGROUND_RUNTIME_ENV.SUPERVISOR_PID], 0),
    supervisorStartedAt: text(input.supervisorStartedAt || env[APEX_BACKGROUND_RUNTIME_ENV.SUPERVISOR_STARTED_AT] || "", 80),
    secretsExposed: false,
  });
}

export async function runApexBackgroundKeepWarmPing(input = {}) {
  const config = input.config?.provider === "apex-background-runtime"
    ? input.config
    : readApexBackgroundRuntimeConfig(input);
  const warmPlan = buildApexLocalAgentWarmResidencyPlan({
    keepWarmEnabled: config.keepWarmEnabled,
    keepWarmModel: config.keepWarmModel,
    keepAlive: config.keepAlive,
    activeLane: input.activeLane || input.lane || "fast",
    route: input.route || "normal-chat",
    requestedNumCtx: input.numCtx || input.requestedNumCtx,
    stableResidency: input.stableResidency,
    residentNumCtx: input.residentNumCtx,
    benchmarkSummary: input.benchmarkSummary,
    gpu: input.gpu,
    residency: input.residency,
  });
  if (!config.keepWarmEnabled) {
    return Object.freeze({
      provider: "ollama",
      receiptType: "background-keep-warm",
      version: "v1.3",
      status: "disabled",
      enabled: false,
      targetModel: config.keepWarmModel,
      keepAlive: config.keepAlive,
      keepAlivePermanent: false,
      activeLane: warmPlan.activeLane,
      targetNumCtx: warmPlan.targetNumCtx,
      stable4096Active: Boolean(warmPlan.stable4096Active),
      fallback2048Active: Boolean(warmPlan.fallback2048Active),
      warmPlan,
      lastPingAt: "",
      success: false,
      textGenerated: false,
      generatedTextLength: 0,
      reason: "keep-warm-disabled",
      promptStored: false,
      memoryWritten: false,
      userVisibleAnswerCreated: false,
      openAiUsed: false,
      secretsExposed: false,
    });
  }
  if (warmPlan.status === "blocked" || config.keepWarmModel === APEX_OLLAMA_CODING_CHAT_MODEL) {
    return Object.freeze({
      provider: "ollama",
      receiptType: "background-keep-warm",
      version: "v1.3",
      status: "blocked",
      enabled: true,
      targetModel: config.keepWarmModel,
      keepAlive: config.keepAlive,
      keepAlivePermanent: false,
      activeLane: warmPlan.activeLane,
      targetNumCtx: warmPlan.targetNumCtx,
      stable4096Active: Boolean(warmPlan.stable4096Active),
      fallback2048Active: Boolean(warmPlan.fallback2048Active),
      warmPlan,
      lastPingAt: new Date().toISOString(),
      success: false,
      textGenerated: false,
      generatedTextLength: 0,
      reason: config.keepWarmModel === APEX_OLLAMA_CODING_CHAT_MODEL
        ? "coding-model-not-kept-warm-by-default"
        : warmPlan.blockedReasons[0] || "keep-warm-blocked",
      promptStored: false,
      memoryWritten: false,
      userVisibleAnswerCreated: false,
      openAiUsed: false,
      secretsExposed: false,
    });
  }

  const env = input.env || process.env || {};
  const baseUrl = normalizeLocalOllamaBaseUrl(input.baseUrl || env[APEX_OLLAMA_ENV.BASE_URL] || APEX_OLLAMA_DEFAULT_BASE_URL);
  if (!baseUrl) {
    return Object.freeze({
      provider: "ollama",
      receiptType: "background-keep-warm",
      version: "v1.3",
      status: "blocked",
      enabled: true,
      targetModel: config.keepWarmModel,
      keepAlive: config.keepAlive,
      keepAlivePermanent: false,
      activeLane: warmPlan.activeLane,
      targetNumCtx: warmPlan.targetNumCtx,
      stable4096Active: Boolean(warmPlan.stable4096Active),
      fallback2048Active: Boolean(warmPlan.fallback2048Active),
      warmPlan,
      lastPingAt: new Date().toISOString(),
      success: false,
      textGenerated: false,
      generatedTextLength: 0,
      reason: "ollama-base-url-not-local",
      promptStored: false,
      memoryWritten: false,
      userVisibleAnswerCreated: false,
      openAiUsed: false,
      secretsExposed: false,
    });
  }

  const fetchImpl = input.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    return Object.freeze({
      provider: "ollama",
      receiptType: "background-keep-warm",
      version: "v1.3",
      status: "error",
      enabled: true,
      targetModel: config.keepWarmModel,
      keepAlive: config.keepAlive,
      keepAlivePermanent: false,
      activeLane: warmPlan.activeLane,
      targetNumCtx: warmPlan.targetNumCtx,
      stable4096Active: Boolean(warmPlan.stable4096Active),
      fallback2048Active: Boolean(warmPlan.fallback2048Active),
      warmPlan,
      lastPingAt: new Date().toISOString(),
      success: false,
      textGenerated: false,
      generatedTextLength: 0,
      reason: "fetch-unavailable",
      promptStored: false,
      memoryWritten: false,
      userVisibleAnswerCreated: false,
      openAiUsed: false,
      secretsExposed: false,
    });
  }

  try {
    const response = await fetchImpl(`${baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: config.keepWarmModel,
        prompt: "",
        stream: false,
        keep_alive: warmPlan.keepAlive,
        options: {
          num_ctx: warmPlan.targetNumCtx,
          num_predict: 1,
        },
      }),
    });
    const payload = await response.json().catch(() => ({}));
    const generatedText = text(payload?.response || "", 80);
    return Object.freeze({
      provider: "ollama",
      receiptType: "background-keep-warm",
      version: "v1.3",
      status: response.ok ? "ready" : "failed",
      enabled: true,
      targetModel: config.keepWarmModel,
      keepAlive: warmPlan.keepAlive,
      keepAlivePermanent: false,
      activeLane: warmPlan.activeLane,
      targetNumCtx: warmPlan.targetNumCtx,
      stable4096Active: Boolean(warmPlan.stable4096Active),
      fallback2048Active: Boolean(warmPlan.fallback2048Active),
      warmPlan,
      lastPingAt: new Date().toISOString(),
      success: Boolean(response.ok),
      textGenerated: Boolean(generatedText),
      generatedTextLength: generatedText.length,
      reason: response.ok ? "ollama-keep-warm-ping-ok" : `ollama-http-${response.status}`,
      promptStored: false,
      memoryWritten: false,
      userVisibleAnswerCreated: false,
      openAiUsed: false,
      secretsExposed: false,
    });
  } catch (error) {
    return Object.freeze({
      provider: "ollama",
      receiptType: "background-keep-warm",
      version: "v1.3",
      status: "failed",
      enabled: true,
      targetModel: config.keepWarmModel,
      keepAlive: warmPlan.keepAlive,
      keepAlivePermanent: false,
      activeLane: warmPlan.activeLane,
      targetNumCtx: warmPlan.targetNumCtx,
      stable4096Active: Boolean(warmPlan.stable4096Active),
      fallback2048Active: Boolean(warmPlan.fallback2048Active),
      warmPlan,
      lastPingAt: new Date().toISOString(),
      success: false,
      textGenerated: false,
      generatedTextLength: 0,
      reason: text(error?.name === "AbortError" ? "timeout" : error?.message || "keep-warm-failed", 120),
      promptStored: false,
      memoryWritten: false,
      userVisibleAnswerCreated: false,
      openAiUsed: false,
      secretsExposed: false,
    });
  }
}

export function buildApexBackgroundRuntimeStatus({
  config = readApexBackgroundRuntimeConfig(),
  api = {},
  client = {},
  ollama = {},
  gpu = {},
  localVoice = {},
  alwaysOpenMic = null,
  brain = null,
  residency = null,
  brainQueue = null,
  keepWarm = null,
  agentSpeedBenchmarkHistory = null,
  liveTurnLatencyHistory = null,
  now = new Date().toISOString(),
  serverPid = process.pid,
  serverStartedAt = backgroundRuntimeStartedAt,
  lastHeartbeat = null,
} = {}) {
  const modelNames = Array.isArray(ollama.modelNames) ? ollama.modelNames : [];
  const defaultModel = modelReadiness(modelNames, APEX_OLLAMA_DEFAULT_CHAT_MODEL);
  const codingModel = modelReadiness(modelNames, APEX_OLLAMA_CODING_CHAT_MODEL);
  const voiceReady = Boolean(localVoice?.canHearLocally && localVoice?.canSpeakLocally);
  const micStatus = buildApexAlwaysOpenMicStatus(alwaysOpenMic || {});
  const brainStatus = brain?.provider === "apex-workstation-brain"
    ? brain
    : buildApexWorkstationBrainStatus({
        config: readApexWorkstationBrainConfig(),
        runtimeState: getApexWorkstationBrainRuntimeState(),
        queueState: brainQueue || getApexOllamaRequestQueueState(),
        gpu,
        modelNames,
      });
  const residencyStatus = residency?.provider === "apex-ollama-residency"
    ? residency
    : null;
  const stableResidency = buildApexStableResidencyPolicy({
    gpu,
    residency: residencyStatus,
    benchmarkSummary: agentSpeedBenchmarkHistory,
  });
  const agentSpeed = selectApexLocalAgentSpeedLane({
    route: "normal-chat",
    stableResidency,
  });
  const degradedReasons = [
    api.ok === false ? "api-not-ready" : "",
    client.ok === false ? "client-not-ready" : "",
    !ollama.available ? "ollama-not-ready" : "",
    !defaultModel.installed ? `${APEX_OLLAMA_DEFAULT_CHAT_MODEL}-missing` : "",
    !gpu.available ? "gpu-not-ready" : "",
    !voiceReady ? "voice-not-ready" : "",
  ].filter(Boolean);
  const status = degradedReasons.length ? "degraded" : "healthy";
  const keepWarmReceipt = keepWarm || backgroundRuntimeState.lastKeepWarmReceipt || {
    provider: "ollama",
    status: config.keepWarmEnabled ? "pending" : "disabled",
    enabled: Boolean(config.keepWarmEnabled),
    targetModel: config.keepWarmModel,
    keepAlive: config.keepAlive,
    keepAlivePermanent: false,
    lastPingAt: "",
    success: false,
    textGenerated: false,
    generatedTextLength: 0,
    reason: config.keepWarmEnabled ? "keep-warm-pending" : "keep-warm-disabled",
    promptStored: false,
    memoryWritten: false,
    userVisibleAnswerCreated: false,
    openAiUsed: false,
    secretsExposed: false,
  };
  const latencyProfile = buildApexLatencyProfile({
    voiceReceipt: localVoice.lastVoiceTurn || null,
    modelReceipt: brainStatus.lastModelReceipt || brainStatus,
    modelQueue: brainStatus.queue,
    warmRuntime: {
      fastPathActive: brainStatus.activeMode === "speed",
      keepWarm: keepWarmReceipt,
      voice: {
        ready: voiceReady,
        canHearLocally: Boolean(localVoice?.canHearLocally),
        canSpeakLocally: Boolean(localVoice?.canSpeakLocally),
      },
    },
  });
  const liveTurnLatency = latencyProfile.liveTurn || {};

  return Object.freeze({
    provider: "apex-background-runtime",
    version: "v0",
    status,
    generatedAt: now,
    supervisor: Object.freeze({
      status: config.supervisorPid ? "reported" : "unknown",
      pid: config.supervisorPid || 0,
      startedAt: config.supervisorStartedAt || "",
      hiddenDaemon: false,
      windowsServiceRegistered: false,
      startupRegistration: false,
    }),
    server: Object.freeze({
      status: api.ok === false ? "degraded" : "ready",
      pid: positiveInt(serverPid, 0),
      startedAt: serverStartedAt,
      uptimeSeconds: Math.max(0, Math.round(process.uptime?.() || 0)),
    }),
    api: Object.freeze({
      status: api.status || (api.ok === false ? "degraded" : "ready"),
      ok: api.ok !== false,
      readyCheck: "/api/ready",
      reason: text(api.reason || "server-runtime-ready", 120),
    }),
    client: Object.freeze({
      status: client.status || "unknown",
      ok: client.ok === true,
      url: text(client.url || "http://localhost:5173/apex", 160),
      reason: text(client.reason || "client-status-not-polled-by-server", 140),
    }),
    ollama: Object.freeze({
      status: ollama.status || "unknown",
      available: Boolean(ollama.available),
      defaultModel,
      codingModel,
      modelCount: Number(ollama.modelCount || modelNames.length || 0),
      modelNames: Object.freeze(modelNames.slice(0, 8)),
      openAiUsed: false,
      cloudDefault: "disabled",
    }),
    brain: brainStatus,
    agentSpeed,
    stableResidency,
    agentSpeedBenchmarkHistory: agentSpeedBenchmarkHistory || Object.freeze({
      provider: "apex-local-agent-speed",
      receiptType: "benchmark-history-summary",
      version: "v1.3",
      status: "empty",
      receiptCount: 0,
      completedCount: 0,
      summary: "No local benchmark history yet. Apex will not run benchmarks unless John asks.",
      autoPromoteTo30B: false,
      deepManualOnly: true,
      noCloudFallback: true,
      benchmarksRunAutomatically: false,
      secretsExposed: false,
    }),
    liveTurnBenchmarkHistory: liveTurnLatencyHistory || Object.freeze({
      provider: "apex-live-turn-latency",
      receiptType: "live-turn-latency-history-summary",
      version: "v1",
      status: "empty",
      receiptCount: 0,
      completedCount: 0,
      latestTypedBenchmark: null,
      latestVoiceBenchmark: null,
      voiceBenchmarkRequiresVisibleAction: true,
      summary: "No live turn latency benchmark history yet.",
      localOnly: true,
      rawAudioStored: false,
      rawPromptStored: false,
      rawResponseStored: false,
      transcriptStored: false,
      secretsExposed: false,
      openAiUsed: false,
      cloudUsed: false,
    }),
    residency: residencyStatus || Object.freeze({
      provider: "apex-ollama-residency",
      status: "unknown",
      reloadNeeded: false,
      contextExceedsActiveLane: false,
      noProcessKilled: true,
      openAiUsed: false,
      secretsExposed: false,
    }),
    gpu: Object.freeze({
      provider: gpu.provider || "nvidia-smi",
      status: gpu.status || "unknown",
      available: Boolean(gpu.available),
      computeReady: Boolean(gpu.available),
      gpuName: text(gpu.gpuName || "", 120),
      vramTotalMb: Number(gpu.vramTotalMb || 0),
      vramUsedMb: Number(gpu.vramUsedMb || 0),
      gpuUtilizationPercent: Number(gpu.gpuUtilizationPercent || 0),
    }),
    voice: Object.freeze({
      status: localVoice.status || "unknown",
      ready: voiceReady,
      sttProvider: localVoice.selectedSttEngine?.id || "",
      sttName: localVoice.selectedSttEngine?.name || "",
      sttProcessor: localVoice.selectedSttEngine?.processor || "",
      sttModel: localVoice.selectedSttEngine?.modelName || "",
      nativeVoice: localVoice.nativeVoice || null,
      nativeInputAvailable: Boolean(localVoice.nativeInputAvailable || localVoice.nativeVoice?.available),
      preferredInputMode: localVoice.preferredInputMode || localVoice.nativeVoice?.selectedInputMode || "browser-audio-worklet-wav",
      browserMicRequired: localVoice.browserMicRequired !== false,
      ttsProvider: localVoice.selectedTtsEngine?.provider || localVoice.selectedTtsEngine?.id || "",
      ttsVoice: localVoice.selectedTtsEngine?.voiceId || localVoice.selectedTtsEngine?.voiceName || "",
      ttsProcessor: localVoice.selectedTtsEngine?.processor || "",
      lastVoiceTurn: localVoice.lastVoiceTurn || null,
      latestTypedBenchmark: liveTurnLatencyHistory?.latestTypedBenchmark || null,
      latestVoiceBenchmark: liveTurnLatencyHistory?.latestVoiceBenchmark || null,
      benchmarkComparison: liveTurnLatencyHistory?.benchmarkComparison || null,
      voiceBenchmarkRequiresVisibleAction: Boolean(liveTurnLatencyHistory?.voiceBenchmarkRequiresVisibleAction),
      lastTurnId: localVoice.lastVoiceTurn?.lastTurnId || localVoice.lastVoiceTurn?.turnId || "",
      lastTurnStatus: localVoice.lastVoiceTurn?.status || "",
      slowestStep: localVoice.lastVoiceTurn?.slowestStep || "",
      liveTurnLatency,
      latestLiveTurnTiming: Object.freeze({
        closeMs: Number(liveTurnLatency.closeMs || 0) || 0,
        sttMs: Number(liveTurnLatency.sttMs || 0) || 0,
        modelFirstTokenMs: Number(liveTurnLatency.modelFirstTokenMs || 0) || 0,
        modelTotalMs: Number(liveTurnLatency.modelTotalMs || 0) || 0,
        ttsMs: Number(liveTurnLatency.ttsMs || 0) || 0,
        playbackRecoveryMs: Number(liveTurnLatency.playbackRecoveryMs || 0) || 0,
        slowestStepLabel: liveTurnLatency.slowestStepLabel || localVoice.lastVoiceTurn?.slowestStep || "",
        slowestStepMs: Number(liveTurnLatency.slowestStepMs || localVoice.lastVoiceTurn?.slowestStepMs || 0) || 0,
        diagnosis: liveTurnLatency.diagnosis || "",
        bottleneckOwner: liveTurnLatency.bottleneckOwner || "",
      }),
      totalTurnMs: Number(localVoice.lastVoiceTurn?.totalTurnMs || 0) || 0,
      failureReason: localVoice.lastVoiceTurn?.failureReason || "",
      audioValid: localVoice.lastVoiceTurn?.audioValid === true,
      openAiAudioUsed: false,
      cloudAudioAllowed: false,
    }),
    mic: Object.freeze({
      mode: micStatus.state,
      ingressProvider: micStatus.ingressProvider,
      vadProvider: micStatus.vadProvider,
      sustainedSilenceMs: micStatus.sustainedSilenceMs,
      feedbackSuppressionActive: micStatus.feedbackSuppressionActive,
      audioStored: false,
    }),
    keepWarm: Object.freeze({
      enabled: Boolean(config.keepWarmEnabled),
      targetModel: config.keepWarmModel,
      keepAlive: config.keepAlive,
      keepAlivePermanent: false,
      lastReceipt: keepWarmReceipt,
      residentLane: stableResidency.residentLane,
      residentNumCtx: stableResidency.residentNumCtx,
      stable4096Active: stableResidency.stable4096Active,
      fallback2048Active: stableResidency.fallback2048Active,
    }),
    duplicateProcesses: Object.freeze({
      status: "not-scanned",
      warningOnly: true,
      automaticKilling: false,
      plannedStopCount: 0,
      reason: "duplicate-dev-api-process-detection-runs-in-local-supervisor-warning-mode",
    }),
    latency: Object.freeze({
      profile: latencyProfile,
      status: latencyProfile.status,
      fastPathActive: latencyProfile.fastPathActive,
      slowestStep: latencyProfile.slowestStep,
      slowestStepLabel: latencyProfile.slowestStepLabel,
      slowestStepMs: latencyProfile.slowestStepMs,
      totalTurnMs: latencyProfile.totalTurnMs,
      liveTurn: liveTurnLatency,
      diagnosis: liveTurnLatency.diagnosis || "",
      bottleneckOwner: liveTurnLatency.bottleneckOwner || "",
      warmRuntimeReady: latencyProfile.warmRuntime.ready,
      benchmarkHistory: liveTurnLatencyHistory || null,
      latestTypedBenchmark: liveTurnLatencyHistory?.latestTypedBenchmark || null,
      latestVoiceBenchmark: liveTurnLatencyHistory?.latestVoiceBenchmark || null,
      benchmarkComparison: liveTurnLatencyHistory?.benchmarkComparison || null,
    }),
    heartbeat: Object.freeze({
      status: "active",
      intervalMs: config.heartbeatIntervalMs,
      lastHeartbeatAt: lastHeartbeat?.generatedAt || backgroundRuntimeState.lastHeartbeat?.generatedAt || "",
      noisyLogs: false,
      crashesServerOnProviderDrop: false,
    }),
    degradedReasons: Object.freeze(degradedReasons),
    safety: Object.freeze({
      operatorOnly: true,
      openAiUsed: false,
      cloudUsed: false,
      voiceboxDefault: false,
      externalExecutionAdded: false,
      desktopControlAdded: false,
      windowsServiceRegistered: false,
      startupRegistration: false,
      trayAppAdded: false,
      productionTouched: false,
      schemaAuthSessionChanged: false,
      secretsExposed: false,
    }),
  });
}

export async function collectApexBackgroundRuntimeStatus(input = {}) {
  const config = input.config?.provider === "apex-background-runtime"
    ? input.config
    : readApexBackgroundRuntimeConfig(input);
  const [ollama, gpu, localVoice, residency] = await Promise.all([
    input.ollama || getOllamaProviderStatus(input.ollamaInput || {}),
    input.gpu || getApexGpuStatus(input.gpuInput || {}),
    input.localVoice || getCachedApexLocalVoiceRuntimeStatus(input.localVoiceInput || {}),
    input.residency || getApexOllamaResidencyStatus(input.residencyInput || {}),
  ]);
  const agentSpeedBenchmarkHistory = input.agentSpeedBenchmarkHistory
    || await readApexLocalAgentSpeedBenchmarkHistory(input.agentSpeedBenchmarkHistoryInput || {}).catch(() => null);
  const liveTurnLatencyHistory = input.liveTurnLatencyHistory
    || await readApexLiveTurnLatencyHistory(input.liveTurnLatencyHistoryInput || {}).catch(() => null);
  const stableResidency = buildApexStableResidencyPolicy({
    gpu,
    residency,
    benchmarkSummary: agentSpeedBenchmarkHistory,
  });
  const keepWarm = input.keepWarm || await runApexBackgroundKeepWarmPing({
    ...input.keepWarmInput,
    config,
    gpu,
    residency,
    benchmarkSummary: agentSpeedBenchmarkHistory,
    stableResidency,
  });
  if (keepWarm?.enabled) backgroundRuntimeState.lastKeepWarmReceipt = keepWarm;
  const status = buildApexBackgroundRuntimeStatus({
    config,
    api: input.api || { ok: true, status: "ready" },
    client: input.client || {},
    ollama,
    gpu,
    localVoice,
    residency,
    alwaysOpenMic: input.alwaysOpenMic,
    keepWarm,
    brain: input.brain,
    agentSpeedBenchmarkHistory,
    liveTurnLatencyHistory,
    now: input.now || new Date().toISOString(),
    serverPid: input.serverPid || process.pid,
    serverStartedAt: input.serverStartedAt || backgroundRuntimeStartedAt,
    lastHeartbeat: backgroundRuntimeState.lastHeartbeat,
  });
  backgroundRuntimeState.lastHeartbeat = status;
  return status;
}

export function getApexBackgroundRuntimeHeartbeatState() {
  return Object.freeze({
    startedAt: backgroundRuntimeStartedAt,
    lastHeartbeat: backgroundRuntimeState.lastHeartbeat,
    lastKeepWarmReceipt: backgroundRuntimeState.lastKeepWarmReceipt,
    running: Boolean(backgroundRuntimeState.timer),
  });
}

export function startApexBackgroundRuntimeHeartbeat(input = {}) {
  const config = input.config?.provider === "apex-background-runtime"
    ? input.config
    : readApexBackgroundRuntimeConfig(input);
  if (backgroundRuntimeState.timer) return getApexBackgroundRuntimeHeartbeatState();
  const interval = clampMs(input.intervalMs || config.heartbeatIntervalMs);
  backgroundRuntimeState.timer = setInterval(() => {
    collectApexBackgroundRuntimeStatus({ config }).catch(() => {});
  }, interval);
  if (typeof backgroundRuntimeState.timer.unref === "function") backgroundRuntimeState.timer.unref();
  return getApexBackgroundRuntimeHeartbeatState();
}

export function stopApexBackgroundRuntimeHeartbeat() {
  if (backgroundRuntimeState.timer) clearInterval(backgroundRuntimeState.timer);
  backgroundRuntimeState.timer = null;
  return getApexBackgroundRuntimeHeartbeatState();
}
