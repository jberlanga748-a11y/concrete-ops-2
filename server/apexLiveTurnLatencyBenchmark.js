import { performance } from "node:perf_hooks";

import {
  APEX_OLLAMA_DEFAULT_CHAT_MODEL,
  chatWithOllamaForApexOs,
} from "./apexOllamaProvider.js";
import {
  APEX_LIVE_TURN_LATENCY_BENCHMARK_VERSION,
  readApexLiveTurnLatencyHistory,
  sanitizeApexLiveTurnLatencyReceipt,
  saveApexLiveTurnLatencyReceipt,
} from "./apexLiveTurnLatencyHistory.js";
import {
  buildApexLatencyProfile,
} from "../shared/apexVoiceTurnDiagnostics.js";

function text(value = "", limit = 220) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, limit);
}

function number(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.round(parsed));
}

function safeObject(value = {}) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function statusFromMs(totalTurnMs = 0) {
  const total = number(totalTurnMs);
  if (!total) return "partial";
  if (total <= 1800) return "fast";
  if (total <= 4200) return "usable";
  return "slow";
}

export function buildApexTypedLiveTurnBenchmarkReceipt({
  turnId = "",
  localAnswer = {},
  wallTimingMs = 0,
  createdAt = new Date().toISOString(),
} = {}) {
  const answer = safeObject(localAnswer);
  const agentSpeed = safeObject(answer.agentSpeed);
  const benchmark = safeObject(answer.benchmarkReceipt);
  const queue = safeObject(answer.queueReceipt || answer.modelQueue);
  const processor = safeObject(answer.modelProcessor);
  const modelTotalMs = number(
    benchmark.totalDurationMs
    || answer.responseTimingMs
    || processor.responseTimingMs
    || answer.latencyProfile?.liveTurn?.modelTotalMs,
  );
  const firstTokenMs = number(
    benchmark.firstTokenLatencyMs
    || answer.latencyProfile?.liveTurn?.modelFirstTokenMs
    || processor.firstTokenLatencyMs
    || answer.timeToFirstTokenMs,
  );
  const queueMs = number(queue.queuedMs || queue.lastQueuedMs);
  const totalTurnMs = number(wallTimingMs || (queueMs + modelTotalMs));
  const model = text(answer.modelUsed || answer.model || benchmark.modelUsed || APEX_OLLAMA_DEFAULT_CHAT_MODEL, 160);
  const numCtx = number(benchmark.numCtx || agentSpeed.numCtx || answer.brainReceipt?.numCtx || 4096);
  const latencyProfile = buildApexLatencyProfile({
    turnId,
    voiceReceipt: {
      turnId,
      status: "typed-benchmark",
      totalTurnMs,
      timingMs: {
        modelQueueMs: queueMs,
        modelFirstTokenMs: firstTokenMs,
        modelTotalMs,
        totalTurnMs,
      },
    },
    modelReceipt: {
      ...benchmark,
      turnId,
      modelUsed: model,
      firstTokenLatencyMs: firstTokenMs,
      responseTimingMs: modelTotalMs,
      totalDurationMs: modelTotalMs,
      numCtx,
    },
    modelProcessor: processor,
    modelQueue: queue,
    warmRuntime: {
      fastPathActive: true,
      keepWarm: {
        enabled: true,
        targetModel: model,
        targetNumCtx: numCtx,
        keepAlive: benchmark.keepAlive || agentSpeed.keepAlive || "30m",
      },
    },
    createdAt,
  });
  const liveTurn = latencyProfile.liveTurn || {};

  return Object.freeze({
    provider: "apex-live-turn-latency-benchmark",
    receiptType: "live-turn-latency-benchmark",
    benchmarkVersion: APEX_LIVE_TURN_LATENCY_BENCHMARK_VERSION,
    benchmarkType: "typed",
    explicitUserStarted: true,
    visibleUserStarted: true,
    noHiddenMicCapture: true,
    inputMode: "typed",
    turnId,
    status: statusFromMs(totalTurnMs),
    diagnosis: liveTurn.diagnosis || "model-bound",
    bottleneckOwner: liveTurn.bottleneckOwner || "model",
    lane: benchmark.laneId || agentSpeed.laneId || "",
    laneLabel: benchmark.laneLabel || agentSpeed.laneLabel || "",
    model,
    numCtx,
    modelQueueMs: queueMs,
    modelFirstTokenMs: firstTokenMs,
    firstTokenLatencyMs: firstTokenMs,
    modelTotalMs,
    totalTurnMs,
    loadDurationMs: number(benchmark.loadDurationMs),
    promptEvalDurationMs: number(benchmark.promptEvalDurationMs),
    generationDurationMs: number(benchmark.generationDurationMs),
    promptEvalCount: number(benchmark.promptEvalCount),
    generationEvalCount: number(benchmark.generationEvalCount),
    slowestStep: liveTurn.slowestStep || "modelTotalMs",
    slowestStepLabel: liveTurn.slowestStepLabel || "brain",
    slowestStepMs: liveTurn.slowestStepMs || modelTotalMs,
    tuningCandidate: liveTurn.slowestStep || "modelTotalMs",
    tuningApplied: false,
    tuningReason: "typed-benchmark-measured-first-no-voice-tuning-without-visible-voice-benchmark",
    timingMs: Object.freeze({
      modelQueueMs: queueMs,
      modelFirstTokenMs: firstTokenMs,
      modelTotalMs,
      totalTurnMs,
    }),
    latencyProfile,
    liveTurnLatency: liveTurn,
    warmResidencyReused: Boolean(benchmark.warmResidencyReused || benchmark.contextSwitchAvoided || answer.modelAlreadyLoaded),
    contextSwitchHappened: Boolean(benchmark.contextSwitchHappened || benchmark.reloadNeeded),
    residencyReloadNeeded: Boolean(benchmark.residencyReloadNeeded || benchmark.reloadNeeded),
    residentNumCtx: number(benchmark.residentNumCtx || benchmark.currentResidentNumCtx || numCtx),
    vramStatus: text(benchmark.vramStatus || "", 80),
    modelVramUsedMb: number(benchmark.modelVramUsedMb || answer.vramUsedMb || processor.vramUsedMb),
    rawAudioStored: false,
    rawPromptStored: false,
    rawResponseStored: false,
    transcriptStored: false,
    secretsExposed: false,
    openAiUsed: false,
    cloudUsed: false,
    createdAt,
  });
}

export async function runApexTypedLiveTurnLatencyBenchmark(input = {}) {
  if (input.explicitUserStarted !== true) {
    return Object.freeze({
      ok: false,
      status: "blocked",
      reason: "explicit-visible-user-start-required",
      benchmarkVersion: APEX_LIVE_TURN_LATENCY_BENCHMARK_VERSION,
      noHiddenMicCapture: true,
      rawAudioStored: false,
      rawPromptStored: false,
      rawResponseStored: false,
      transcriptStored: false,
      openAiUsed: false,
      cloudUsed: false,
    });
  }

  const chatFn = typeof input.chatFn === "function" ? input.chatFn : chatWithOllamaForApexOs;
  const turnId = text(input.turnId || `ALT-TYPED-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, 120);
  const createdAt = new Date().toISOString();
  const startedAt = performance.now();
  const localAnswer = await chatFn({
    model: input.model || APEX_OLLAMA_DEFAULT_CHAT_MODEL,
    route: "normal-chat",
    maxOutputTokens: number(input.maxOutputTokens, 48) || 48,
    stream: true,
    stableResidencyEnabled: true,
    residentNumCtx: number(input.residentNumCtx, 4096) || 4096,
    messages: [
      {
        role: "system",
        content: "You are Apex, John's private local operator. This is a local latency benchmark. Return compact JSON only.",
      },
      {
        role: "user",
        content: "Private local typed latency benchmark. Reply with {\"answer\":\"ready\"}.",
      },
    ],
  });
  const wallTimingMs = Math.max(0, Math.round(performance.now() - startedAt));
  const receipt = buildApexTypedLiveTurnBenchmarkReceipt({
    turnId,
    localAnswer,
    wallTimingMs,
    createdAt,
  });
  const saved = input.save === false
    ? sanitizeApexLiveTurnLatencyReceipt(receipt)
    : await saveApexLiveTurnLatencyReceipt(receipt, { outputRoot: input.outputRoot });
  const history = input.includeHistory === false
    ? null
    : await readApexLiveTurnLatencyHistory({ outputRoot: input.outputRoot }).catch(() => null);

  return Object.freeze({
    ok: localAnswer?.available !== false && localAnswer?.status !== "blocked",
    status: saved.status || receipt.status,
    benchmarkVersion: APEX_LIVE_TURN_LATENCY_BENCHMARK_VERSION,
    typedBenchmark: saved,
    liveTurnBenchmark: saved,
    liveTurnBenchmarkHistory: history,
    localOnly: true,
    noHiddenMicCapture: true,
    rawAudioStored: false,
    rawPromptStored: false,
    rawResponseStored: false,
    transcriptStored: false,
    openAiUsed: false,
    cloudUsed: false,
  });
}
