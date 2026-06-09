import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildApexLiveTurnLatencyHistorySummary,
  readApexLiveTurnLatencyHistory,
  sanitizeApexLiveTurnLatencyReceipt,
  saveApexLiveTurnLatencyReceipt,
} from "./apexLiveTurnLatencyHistory.js";

test("live turn latency receipts sanitize compact metadata only", () => {
  const receipt = sanitizeApexLiveTurnLatencyReceipt({
    turnId: "turn-live-1",
    status: "spoken",
    transcript: "do not store this transcript",
    audioBase64: "RIFF-secret-audio",
    prompt: "raw prompt body",
    response: "raw response body",
    timingMs: {
      voiceCloseMs: 520,
      sttMs: 940,
      modelFirstTokenMs: 160,
      modelTotalMs: 572,
      ttsGenerationMs: 180,
      playbackStartDelayMs: 45,
      recoveryMs: 120,
      totalTurnMs: 2470,
      localVoiceStatusDiscoveryMs: 4,
    },
    liveTurnLatency: {
      provider: "apex-live-turn-latency",
      status: "usable",
      diagnosis: "model-fast-voice-slow",
      bottleneckOwner: "voice-pipeline",
      slowestStepLabel: "STT",
      slowestStepMs: 940,
      modelFast: true,
      voiceDominant: true,
      totalTurnMs: 2470,
    },
    localVoiceStatusCacheHit: true,
    benchmarkType: "voice",
    explicitUserStarted: true,
    promptText: "do not store raw prompt text",
    responseText: "do not store raw response text",
  });

  assert.equal(receipt.provider, "apex-live-turn-latency");
  assert.equal(receipt.receiptType, "live-turn-latency");
  assert.equal(receipt.version, "v1");
  assert.equal(receipt.benchmarkVersion, "v1.1");
  assert.equal(receipt.benchmarkType, "voice");
  assert.equal(receipt.explicitUserStarted, true);
  assert.equal(receipt.diagnosis, "model-fast-voice-slow");
  assert.equal(receipt.bottleneckOwner, "voice-pipeline");
  assert.equal(receipt.modelFast, true);
  assert.equal(receipt.cachedVoiceReadinessReused, true);
  assert.equal(receipt.totalTurnMs, 2470);
  assert.equal(receipt.audioStored, false);
  assert.equal(receipt.rawAudioStored, false);
  assert.equal(receipt.rawPromptStored, false);
  assert.equal(receipt.rawResponseStored, false);
  assert.equal(receipt.transcriptStored, false);
  assert.doesNotMatch(JSON.stringify(receipt), /do not store|RIFF-secret|raw prompt|raw response/i);
});

test("live turn latency history writes and summarizes local JSONL receipts", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "apex-live-turn-latency-"));
  try {
    await saveApexLiveTurnLatencyReceipt({
      turnId: "turn-live-1",
      createdAt: "2026-06-08T01:00:00.000Z",
      timingMs: {
        voiceCloseMs: 520,
        sttMs: 900,
        modelFirstTokenMs: 160,
        modelTotalMs: 572,
        ttsGenerationMs: 180,
        playbackStartDelayMs: 40,
        totalTurnMs: 2212,
      },
    }, { outputRoot: root });
    await saveApexLiveTurnLatencyReceipt({
      turnId: "turn-live-2",
      createdAt: "2026-06-08T01:02:00.000Z",
      benchmarkType: "voice",
      explicitUserStarted: true,
      liveTurnLatency: {
        provider: "apex-live-turn-latency",
        status: "usable",
        diagnosis: "model-fast-voice-slow",
        bottleneckOwner: "voice-pipeline",
        totalTurnMs: 2500,
        closeMs: 520,
        sttMs: 1100,
        modelFirstTokenMs: 150,
        modelTotalMs: 560,
        ttsMs: 220,
        playbackRecoveryMs: 100,
        slowestStepLabel: "STT",
        slowestStepMs: 1100,
        modelFast: true,
        voiceDominant: true,
      },
    }, { outputRoot: root });
    await saveApexLiveTurnLatencyReceipt({
      turnId: "turn-typed-1",
      createdAt: "2026-06-08T01:01:00.000Z",
      benchmarkType: "typed",
      explicitUserStarted: true,
      model: "qwen3:14b",
      numCtx: 4096,
      timingMs: {
        modelFirstTokenMs: 155,
        modelTotalMs: 540,
        totalTurnMs: 580,
      },
    }, { outputRoot: root });

    const history = await readApexLiveTurnLatencyHistory({ outputRoot: root });

    assert.equal(history.status, "ready");
    assert.equal(history.receiptCount, 3);
    assert.equal(history.latest.turnId, "turn-live-2");
    assert.equal(history.averageTotalTurnMs, 1764);
    assert.equal(history.averageSttMs, 1000);
    assert.equal(history.modelFastVoiceSlowCount, 1);
    assert.equal(history.latestTypedBenchmark.turnId, "turn-typed-1");
    assert.equal(history.latestVoiceBenchmark.turnId, "turn-live-2");
    assert.equal(history.benchmarkComparison.status, "ready");
    assert.equal(history.benchmarkComparison.voiceMinusTypedMs, 1920);
    assert.equal(history.voiceBenchmarkRequiresVisibleAction, false);
    assert.equal(history.rawAudioStored, false);
    assert.equal(history.outputRootExposed, false);
    assert.doesNotMatch(JSON.stringify(history), /audioBase64|rawTranscript|transcriptText|do not store|RIFF-secret|raw prompt|raw response/i);

    const summary = buildApexLiveTurnLatencyHistorySummary({ receipts: [history.latest] });
    assert.equal(summary.receiptType, "live-turn-latency-history-summary");
    assert.match(summary.summary, /Latest live turn/i);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
