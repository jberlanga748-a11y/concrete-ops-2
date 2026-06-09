import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildApexTypedLiveTurnBenchmarkReceipt,
  runApexTypedLiveTurnLatencyBenchmark,
} from "./apexLiveTurnLatencyBenchmark.js";

test("typed live latency benchmark blocks unless explicitly user-started", async () => {
  let chatCalled = false;
  const result = await runApexTypedLiveTurnLatencyBenchmark({
    chatFn: async () => {
      chatCalled = true;
      return {};
    },
    save: false,
  });

  assert.equal(result.status, "blocked");
  assert.equal(result.reason, "explicit-visible-user-start-required");
  assert.equal(chatCalled, false);
  assert.equal(result.noHiddenMicCapture, true);
  assert.equal(result.openAiUsed, false);
  assert.equal(result.cloudUsed, false);
});

test("typed live latency benchmark stores compact local timing metadata only", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "apex-typed-live-benchmark-"));
  try {
    const result = await runApexTypedLiveTurnLatencyBenchmark({
      explicitUserStarted: true,
      outputRoot: root,
      chatFn: async () => ({
        available: true,
        status: "available",
        answer: "raw answer should not be returned in benchmark receipt",
        modelUsed: "qwen3:14b",
        agentSpeed: {
          laneId: "fast",
          laneLabel: "Fast",
          numCtx: 4096,
          keepAlive: "30m",
        },
        benchmarkReceipt: {
          laneId: "fast",
          laneLabel: "Fast",
          modelUsed: "qwen3:14b",
          numCtx: 4096,
          firstTokenLatencyMs: 155,
          totalDurationMs: 540,
          warmResidencyReused: true,
          contextSwitchHappened: false,
        },
        queueReceipt: {
          queuedMs: 12,
        },
        responseTimingMs: 540,
        modelProcessor: {
          processor: "gpu",
          responseTimingMs: 540,
          modelAlreadyLoaded: true,
        },
      }),
    });

    assert.equal(result.ok, true);
    assert.equal(result.typedBenchmark.benchmarkType, "typed");
    assert.equal(result.typedBenchmark.explicitUserStarted, true);
    assert.equal(result.typedBenchmark.model, "qwen3:14b");
    assert.equal(result.typedBenchmark.numCtx, 4096);
    assert.equal(result.typedBenchmark.modelFirstTokenMs, 155);
    assert.equal(result.typedBenchmark.modelTotalMs, 540);
    assert.equal(result.typedBenchmark.rawPromptStored, false);
    assert.equal(result.typedBenchmark.rawResponseStored, false);
    assert.equal(result.typedBenchmark.transcriptStored, false);
    assert.equal(result.liveTurnBenchmarkHistory.latestTypedBenchmark.turnId, result.typedBenchmark.turnId);
    assert.equal(result.liveTurnBenchmarkHistory.voiceBenchmarkRequiresVisibleAction, true);
    assert.equal(result.liveTurnBenchmarkHistory.benchmarkComparison.diagnosis, "pending-visible-voice-benchmark");
    assert.equal(result.liveTurnBenchmarkHistory.benchmarkComparison.biggestRealBottleneck, "");
    assert.equal(result.liveTurnBenchmarkHistory.benchmarkComparison.tuningCandidate, "");
    assert.doesNotMatch(JSON.stringify(result), /raw answer should not be returned|Private local typed latency benchmark/i);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("typed benchmark receipt can be built without raw prompt or response fields", () => {
  const receipt = buildApexTypedLiveTurnBenchmarkReceipt({
    turnId: "typed-build-1",
    wallTimingMs: 620,
    localAnswer: {
      response: "raw local response",
      benchmarkReceipt: {
        firstTokenLatencyMs: 160,
        totalDurationMs: 580,
        numCtx: 4096,
      },
      queueReceipt: { queuedMs: 5 },
    },
  });

  assert.equal(receipt.benchmarkType, "typed");
  assert.equal(receipt.totalTurnMs, 620);
  assert.equal(receipt.modelFirstTokenMs, 160);
  assert.equal(receipt.rawPromptStored, false);
  assert.equal(receipt.rawResponseStored, false);
  assert.doesNotMatch(JSON.stringify(receipt), /raw local response/i);
});
