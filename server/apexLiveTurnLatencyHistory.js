import fs from "node:fs/promises";
import path from "node:path";

import {
  APEX_LIVE_TURN_LATENCY_VERSION,
  buildApexLiveTurnLatencySummary,
} from "../shared/apexVoiceTurnDiagnostics.js";

export const APEX_LIVE_TURN_LATENCY_OUTPUT_DIR = "apex-live-turn-latency-v1";
export const APEX_LIVE_TURN_LATENCY_BENCHMARK_VERSION = "v1.1";

function text(value = "", limit = 240) {
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

function safeOutputRoot(value = "") {
  return path.resolve(value || path.join(process.cwd(), "outputs"));
}

function dateFolderName(value = new Date().toISOString()) {
  return text(value, 80).slice(0, 10) || new Date().toISOString().slice(0, 10);
}

function timingFromReceipt(receipt = {}) {
  const safeReceipt = safeObject(receipt);
  const timing = safeObject(safeReceipt.timingMs);
  const liveTurn = safeObject(
    safeReceipt.liveTurnLatency
    || safeReceipt.latencyProfile?.liveTurn
    || (safeReceipt.provider === "apex-live-turn-latency" ? safeReceipt : null),
  );
  return Object.freeze({
    closeMs: number(liveTurn.closeMs || safeReceipt.closeMs || safeReceipt.voiceCloseMs || timing.voiceCloseMs || timing.vadActualSilenceMs),
    sttMs: number(liveTurn.sttMs || safeReceipt.sttMs || timing.sttMs || timing.transcriptionTimingMs || safeReceipt.transcriptionTimingMs),
    modelQueueMs: number(liveTurn.modelQueueMs || safeReceipt.modelQueueMs || timing.modelQueueMs),
    modelFirstTokenMs: number(liveTurn.modelFirstTokenMs || safeReceipt.modelFirstTokenMs || timing.modelFirstTokenMs),
    modelTotalMs: number(liveTurn.modelTotalMs || safeReceipt.modelTotalMs || timing.modelTotalMs || timing.modelRequestMs),
    ttsMs: number(liveTurn.ttsMs || safeReceipt.ttsMs || timing.ttsGenerationMs || timing.ttsRequestMs),
    playbackRecoveryMs: number(liveTurn.playbackRecoveryMs || safeReceipt.playbackRecoveryMs || timing.playbackStartDelayMs || 0)
      + number(timing.recoveryMs)
      + number(timing.playbackDurationMs),
    totalTurnMs: number(liveTurn.totalTurnMs || safeReceipt.totalTurnMs || timing.totalTurnMs || timing.totalClientTurnMs),
    statusDiscoveryMs: number(liveTurn.statusDiscoveryMs || safeReceipt.statusDiscoveryMs || timing.statusDiscoveryMs || timing.localVoiceStatusDiscoveryMs),
    audioPrepMs: number(liveTurn.audioPrepMs || safeReceipt.audioPrepMs || timing.clientWavConversionMs)
      + number(timing.dataUrlCreationMs)
      + number(timing.uploadRequestMs)
      + number(timing.serverAudioParseMs),
  });
}

export function sanitizeApexLiveTurnLatencyReceipt(receipt = {}) {
  const safeReceipt = safeObject(receipt);
  const benchmarkType = /^(typed|voice)$/i.test(String(safeReceipt.benchmarkType || safeReceipt.inputMode || ""))
    ? text(safeReceipt.benchmarkType || safeReceipt.inputMode, 24).toLowerCase()
    : "";
  const liveTurn = safeObject(
    safeReceipt.liveTurnLatency
    || safeReceipt.latencyProfile?.liveTurn
    || (safeReceipt.provider === "apex-live-turn-latency" ? safeReceipt : null),
  );
  const timing = timingFromReceipt(safeReceipt);
  const summary = liveTurn.provider === "apex-live-turn-latency"
    ? liveTurn
    : buildApexLiveTurnLatencySummary({
        turnId: safeReceipt.turnId || safeReceipt.lastTurnId || "",
        steps: safeReceipt.latencyProfile?.steps || [],
        totalTurnMs: timing.totalTurnMs,
        voiceReceipt: safeReceipt,
        modelReceipt: safeObject(safeReceipt.modelReceipt || safeReceipt.modelProcessor),
        createdAt: safeReceipt.createdAt || new Date().toISOString(),
      });

  return Object.freeze({
    provider: "apex-live-turn-latency",
    receiptType: "live-turn-latency",
    version: APEX_LIVE_TURN_LATENCY_VERSION,
    benchmarkVersion: benchmarkType ? text(safeReceipt.benchmarkVersion || APEX_LIVE_TURN_LATENCY_BENCHMARK_VERSION, 40) : "",
    benchmarkType,
    explicitUserStarted: benchmarkType ? safeReceipt.explicitUserStarted === true : false,
    visibleUserStarted: benchmarkType ? safeReceipt.visibleUserStarted === true || safeReceipt.explicitUserStarted === true : false,
    visibleUserActionRequired: Boolean(safeReceipt.visibleUserActionRequired || safeReceipt.voiceBenchmarkRequiresVisibleAction),
    inputMode: text(safeReceipt.inputMode || benchmarkType || "", 40),
    benchmarkId: text(safeReceipt.benchmarkId || "", 100),
    status: text(summary.status || safeReceipt.status || "partial", 80),
    diagnosis: text(summary.diagnosis || "partial", 80),
    bottleneckOwner: text(summary.bottleneckOwner || "unknown", 80),
    turnId: text(summary.turnId || safeReceipt.turnId || safeReceipt.lastTurnId || "", 120),
    lane: text(safeReceipt.lane || safeReceipt.laneId || safeReceipt.agentSpeedLane || safeReceipt.benchmarkReceipt?.laneId || "", 80),
    laneLabel: text(safeReceipt.laneLabel || safeReceipt.agentSpeedLabel || safeReceipt.benchmarkReceipt?.laneLabel || "", 100),
    model: text(safeReceipt.model || safeReceipt.modelUsed || safeReceipt.modelId || safeReceipt.residentModel || safeReceipt.benchmarkReceipt?.modelUsed || "", 160),
    numCtx: number(safeReceipt.numCtx || safeReceipt.residentNumCtx || safeReceipt.selectedNumCtx || safeReceipt.benchmarkReceipt?.numCtx || summary.residentNumCtx),
    residentNumCtx: number(safeReceipt.residentNumCtx || safeReceipt.benchmarkReceipt?.residentNumCtx || summary.residentNumCtx),
    contextSwitchHappened: Boolean(safeReceipt.contextSwitchHappened || safeReceipt.benchmarkReceipt?.contextSwitchHappened),
    warmResidencyReused: Boolean(safeReceipt.warmResidencyReused || safeReceipt.benchmarkReceipt?.warmResidencyReused),
    residencyReloadNeeded: Boolean(safeReceipt.residencyReloadNeeded || safeReceipt.reloadNeeded || safeReceipt.benchmarkReceipt?.residencyReloadNeeded),
    vramStatus: text(safeReceipt.vramStatus || safeReceipt.benchmarkReceipt?.vramStatus || "", 80),
    modelVramUsedMb: number(safeReceipt.modelVramUsedMb || safeReceipt.vramUsedMb || safeReceipt.benchmarkReceipt?.modelVramUsedMb),
    ingressProvider: text(safeReceipt.ingressProvider || "", 80),
    micState: text(safeReceipt.micState || "", 80),
    sttProvider: text(safeReceipt.engine || safeReceipt.sttProvider || "", 100),
    sttProcessor: text(safeReceipt.processor || safeReceipt.sttProcessor || "", 80),
    ttsProvider: text(safeReceipt.ttsProvider || safeReceipt.ttsEngine || "", 100),
    closeMs: number(summary.closeMs || timing.closeMs),
    sttMs: number(summary.sttMs || timing.sttMs),
    modelQueueMs: number(summary.modelQueueMs || timing.modelQueueMs),
    modelFirstTokenMs: number(summary.modelFirstTokenMs || timing.modelFirstTokenMs),
    modelTotalMs: number(summary.modelTotalMs || timing.modelTotalMs),
    ttsMs: number(summary.ttsMs || timing.ttsMs),
    playbackRecoveryMs: number(summary.playbackRecoveryMs || timing.playbackRecoveryMs),
    audioPrepMs: number(summary.audioPrepMs || timing.audioPrepMs),
    statusDiscoveryMs: number(summary.statusDiscoveryMs || timing.statusDiscoveryMs),
    totalTurnMs: number(summary.totalTurnMs || timing.totalTurnMs),
    firstTokenLatencyMs: number(summary.modelFirstTokenMs || timing.modelFirstTokenMs || safeReceipt.firstTokenLatencyMs),
    loadDurationMs: number(safeReceipt.loadDurationMs || safeReceipt.benchmarkReceipt?.loadDurationMs),
    promptEvalDurationMs: number(safeReceipt.promptEvalDurationMs || safeReceipt.benchmarkReceipt?.promptEvalDurationMs),
    generationDurationMs: number(safeReceipt.generationDurationMs || safeReceipt.benchmarkReceipt?.generationDurationMs),
    promptEvalCount: number(safeReceipt.promptEvalCount || safeReceipt.benchmarkReceipt?.promptEvalCount),
    generationEvalCount: number(safeReceipt.generationEvalCount || safeReceipt.benchmarkReceipt?.generationEvalCount),
    slowestStep: text(summary.slowestStep || safeReceipt.slowestStep || "", 100),
    slowestStepLabel: text(summary.slowestStepLabel || safeReceipt.slowestStepLabel || safeReceipt.slowestStep || "", 120),
    slowestStepMs: number(summary.slowestStepMs || safeReceipt.slowestStepMs),
    tuningCandidate: text(safeReceipt.tuningCandidate || summary.slowestStep || safeReceipt.slowestStep || "", 120),
    tuningApplied: Boolean(safeReceipt.tuningApplied),
    tuningReason: text(safeReceipt.tuningReason || "", 180),
    beforeTotalTurnMs: number(safeReceipt.beforeTotalTurnMs || safeReceipt.before?.totalTurnMs),
    afterTotalTurnMs: number(safeReceipt.afterTotalTurnMs || safeReceipt.after?.totalTurnMs),
    beforeSlowestStepMs: number(safeReceipt.beforeSlowestStepMs || safeReceipt.before?.slowestStepMs),
    afterSlowestStepMs: number(safeReceipt.afterSlowestStepMs || safeReceipt.after?.slowestStepMs),
    modelFast: Boolean(summary.modelFast),
    voiceDominant: Boolean(summary.voiceDominant),
    cachedVoiceReadinessReused: Boolean(summary.cachedVoiceReadinessReused || safeReceipt.localVoiceStatusCacheHit),
    voiceStatusDiscoveryMs: number(summary.voiceStatusDiscoveryMs || safeReceipt.localVoiceStatusDiscoveryMs),
    audioStored: false,
    rawAudioStored: false,
    rawPromptStored: false,
    rawResponseStored: false,
    transcriptStored: false,
    secretsExposed: false,
    openAiUsed: false,
    cloudUsed: false,
    createdAt: text(safeReceipt.createdAt || new Date().toISOString(), 80),
  });
}

function latestBenchmarkReceipt(rows = [], type = "") {
  return rows
    .filter((row) => row.benchmarkType === type && row.explicitUserStarted === true)
    .slice()
    .sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)))[0] || null;
}

function buildBenchmarkComparison({ latestTypedBenchmark = null, latestVoiceBenchmark = null } = {}) {
  const typed = latestTypedBenchmark;
  const voice = latestVoiceBenchmark;
  const voiceBenchmarkRequiresVisibleAction = Boolean(typed && !voice);
  const slowestSource = voice?.slowestStepMs ? voice : null;
  const voiceMinusTypedMs = voice?.totalTurnMs && typed?.totalTurnMs
    ? Math.max(0, number(voice.totalTurnMs) - number(typed.totalTurnMs))
    : 0;
  const modelFastVoiceSlow = voice?.diagnosis === "model-fast-voice-slow";
  const diagnosis = voice
    ? text(voice.diagnosis || "pending", 80)
    : voiceBenchmarkRequiresVisibleAction
      ? "pending-visible-voice-benchmark"
      : typed
        ? "typed-only"
        : "pending";
  return Object.freeze({
    provider: "apex-live-turn-latency",
    receiptType: "live-turn-latency-benchmark-comparison",
    version: APEX_LIVE_TURN_LATENCY_BENCHMARK_VERSION,
    status: typed && voice ? "ready" : typed ? "voice-visible-action-required" : "typed-benchmark-needed",
    typedTotalMs: number(typed?.totalTurnMs),
    typedFirstTokenMs: number(typed?.modelFirstTokenMs || typed?.firstTokenLatencyMs),
    typedModelTotalMs: number(typed?.modelTotalMs),
    voiceTotalMs: number(voice?.totalTurnMs),
    voiceCloseMs: number(voice?.closeMs),
    voiceSttMs: number(voice?.sttMs),
    voiceModelFirstTokenMs: number(voice?.modelFirstTokenMs || voice?.firstTokenLatencyMs),
    voiceModelTotalMs: number(voice?.modelTotalMs),
    voiceTtsMs: number(voice?.ttsMs),
    voicePlaybackRecoveryMs: number(voice?.playbackRecoveryMs),
    voiceMinusTypedMs,
    slowestStep: text(slowestSource?.slowestStep || "", 100),
    slowestStepLabel: text(slowestSource?.slowestStepLabel || "", 120),
    slowestStepMs: number(slowestSource?.slowestStepMs),
    diagnosis,
    modelFastVoiceSlow,
    biggestRealBottleneck: text(voice?.slowestStepLabel || "", 120),
    tuningCandidate: text(voice?.tuningCandidate || voice?.slowestStep || "", 120),
    tuningApplied: Boolean(voice?.tuningApplied),
    voiceBenchmarkRequiresVisibleAction,
    noHiddenMicCapture: true,
    rawAudioStored: false,
    rawPromptStored: false,
    rawResponseStored: false,
    transcriptStored: false,
    openAiUsed: false,
    cloudUsed: false,
  });
}

export function buildApexLiveTurnLatencyHistorySummary({ receipts = [] } = {}) {
  const rows = (Array.isArray(receipts) ? receipts : [])
    .map((receipt) => sanitizeApexLiveTurnLatencyReceipt(receipt))
    .filter((receipt) => receipt.turnId || receipt.totalTurnMs || receipt.slowestStepMs);
  const latest = rows.slice().sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)))[0] || null;
  const latestTypedBenchmark = latestBenchmarkReceipt(rows, "typed");
  const latestVoiceBenchmark = latestBenchmarkReceipt(rows, "voice");
  const benchmarkComparison = buildBenchmarkComparison({ latestTypedBenchmark, latestVoiceBenchmark });
  const timed = rows.filter((row) => row.totalTurnMs > 0);
  const avg = (field) => {
    const values = rows.map((row) => number(row[field])).filter((value) => value > 0);
    return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
  };
  const slowest = rows
    .filter((row) => row.slowestStepMs > 0)
    .slice()
    .sort((left, right) => right.slowestStepMs - left.slowestStepMs)[0] || null;

  return Object.freeze({
    provider: "apex-live-turn-latency",
    receiptType: "live-turn-latency-history-summary",
    version: APEX_LIVE_TURN_LATENCY_VERSION,
    status: rows.length ? "ready" : "empty",
    receiptCount: rows.length,
    completedCount: timed.length,
    latest,
    averageTotalTurnMs: avg("totalTurnMs"),
    averageCloseMs: avg("closeMs"),
    averageSttMs: avg("sttMs"),
    averageModelFirstTokenMs: avg("modelFirstTokenMs"),
    averageModelTotalMs: avg("modelTotalMs"),
    averageTtsMs: avg("ttsMs"),
    averagePlaybackRecoveryMs: avg("playbackRecoveryMs"),
    latestTypedBenchmark,
    latestVoiceBenchmark,
    benchmarkComparison,
    typedBenchmarkTotalMs: latestTypedBenchmark?.totalTurnMs || 0,
    typedBenchmarkFirstTokenMs: latestTypedBenchmark?.modelFirstTokenMs || latestTypedBenchmark?.firstTokenLatencyMs || 0,
    typedBenchmarkModelTotalMs: latestTypedBenchmark?.modelTotalMs || 0,
    voiceBenchmarkTotalMs: latestVoiceBenchmark?.totalTurnMs || 0,
    voiceBenchmarkCloseMs: latestVoiceBenchmark?.closeMs || 0,
    voiceBenchmarkSttMs: latestVoiceBenchmark?.sttMs || 0,
    voiceBenchmarkTtsMs: latestVoiceBenchmark?.ttsMs || 0,
    voiceBenchmarkPlaybackRecoveryMs: latestVoiceBenchmark?.playbackRecoveryMs || 0,
    voiceBenchmarkRequiresVisibleAction: benchmarkComparison.voiceBenchmarkRequiresVisibleAction,
    slowestStepLabel: slowest?.slowestStepLabel || "",
    slowestStepMs: slowest?.slowestStepMs || 0,
    modelFastVoiceSlowCount: rows.filter((row) => row.diagnosis === "model-fast-voice-slow").length,
    summary: rows.length
      ? `Latest live turn ${latest?.totalTurnMs || 0} ms; slowest ${latest?.slowestStepLabel || "unknown"} ${latest?.slowestStepMs || 0} ms.`
      : "No live turn latency receipts yet.",
    localOnly: true,
    rawAudioStored: false,
    rawPromptStored: false,
    rawResponseStored: false,
    transcriptStored: false,
    secretsExposed: false,
    openAiUsed: false,
    cloudUsed: false,
  });
}

export async function saveApexLiveTurnLatencyReceipt(receipt = {}, input = {}) {
  const sanitized = sanitizeApexLiveTurnLatencyReceipt(receipt);
  const outputRoot = safeOutputRoot(input.outputRoot);
  const folder = path.join(outputRoot, APEX_LIVE_TURN_LATENCY_OUTPUT_DIR, dateFolderName(sanitized.createdAt));
  await fs.mkdir(folder, { recursive: true });
  const file = path.join(folder, "receipts.jsonl");
  await fs.appendFile(file, `${JSON.stringify(sanitized)}\n`, "utf8");
  return Object.freeze({
    ...sanitized,
    saved: true,
    outputRootExposed: false,
    receiptFileExposed: false,
  });
}

async function readJsonlFile(file) {
  const content = await fs.readFile(file, "utf8");
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

export async function readApexLiveTurnLatencyHistory(input = {}) {
  const outputRoot = safeOutputRoot(input.outputRoot);
  const dir = path.join(outputRoot, APEX_LIVE_TURN_LATENCY_OUTPUT_DIR);
  const maxFiles = Math.max(1, Math.min(14, Math.round(Number(input.maxFiles || 5) || 5)));
  const maxReceipts = Math.max(1, Math.min(200, Math.round(Number(input.maxReceipts || 80) || 80)));
  let children = [];
  try {
    children = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return Object.freeze({
      ...buildApexLiveTurnLatencyHistorySummary({ receipts: [] }),
      sourceCount: 0,
      sources: Object.freeze([]),
      outputRootExposed: false,
    });
  }

  const files = [];
  for (const child of children) {
    if (!child.isDirectory()) continue;
    const file = path.join(dir, child.name, "receipts.jsonl");
    try {
      const stat = await fs.stat(file);
      files.push(Object.freeze({ file, mtimeMs: stat.mtimeMs }));
    } catch {
      // Ignore incomplete live-turn receipt folders.
    }
  }
  files.sort((left, right) => right.mtimeMs - left.mtimeMs);

  const receipts = [];
  const sources = [];
  for (const row of files.slice(0, maxFiles)) {
    try {
      receipts.push(...await readJsonlFile(row.file));
      sources.push(text(path.relative(outputRoot, row.file).replace(/\\/g, "/"), 240));
    } catch {
      // Corrupt local latency receipts should not break Apex status.
    }
    if (receipts.length >= maxReceipts) break;
  }

  return Object.freeze({
    ...buildApexLiveTurnLatencyHistorySummary({ receipts: receipts.slice(-maxReceipts) }),
    sourceCount: sources.length,
    sources: Object.freeze(sources.slice(0, maxFiles)),
    outputRootExposed: false,
  });
}
