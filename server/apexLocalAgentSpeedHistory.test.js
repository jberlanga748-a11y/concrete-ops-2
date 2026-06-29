import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  readApexLocalAgentSpeedBenchmarkHistory,
} from "./apexLocalAgentSpeedHistory.js";

test("local agent speed history summarizes recent local benchmark receipts without running benchmarks", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "apex-speed-history-"));
  const folder = path.join(root, "apex-local-agent-speed-v1-3", "2026-06-08T01-00-00-000Z");
  await fs.mkdir(folder, { recursive: true });
  await fs.writeFile(path.join(folder, "receipts.json"), JSON.stringify({
    receipts: [
      {
        provider: "apex-local-agent-speed",
        receiptType: "local-agent-benchmark",
        status: "completed",
        laneId: "fast",
        modelUsed: "qwen3:14b",
        numCtx: 2048,
        totalDurationMs: 2400,
        loadDurationMs: 200,
        promptEvalDurationMs: 80,
        generationDurationMs: 400,
        firstTokenLatencyMs: 350,
        adaptiveLaneNotes: { deepLaneSuggested: false },
        rawPromptStored: false,
        rawResponseStored: false,
      },
      {
        provider: "apex-local-agent-speed",
        receiptType: "local-agent-benchmark",
        status: "completed",
        laneId: "coding",
        residencyPatternId: "stable-4096",
        modelUsed: "qwen3:14b",
        numCtx: 4096,
        totalDurationMs: 4200,
        loadDurationMs: 300,
        promptEvalDurationMs: 120,
        generationDurationMs: 600,
        adaptiveLaneNotes: { deepLaneSuggested: false },
        rawPromptStored: false,
        rawResponseStored: false,
      },
    ],
  }, null, 2), "utf8");

  try {
    const history = await readApexLocalAgentSpeedBenchmarkHistory({ outputRoot: root });

    assert.equal(history.receiptType, "benchmark-history-summary");
    assert.equal(history.version, "v1.3");
    assert.equal(history.status, "ready");
    assert.equal(history.completedCount, 2);
    assert.equal(history.averageTotalDurationMs, 3300);
    assert.equal(history.averageFirstTokenLatencyMs, 350);
    assert.equal(history.firstTokenSamples, 1);
    assert.equal(history.latest.laneId, "coding");
    assert.equal(history.latest.modelUsed, "qwen3:14b");
    assert.equal(history.latest.numCtx, 4096);
    assert.equal(history.stableResidency.chosenResidentNumCtx, 4096);
    assert.equal(history.autoPromoteTo30B, false);
    assert.equal(history.benchmarksRunAutomatically, false);
    assert.equal(history.outputRootExposed, false);
    assert.doesNotMatch(JSON.stringify(history), /sk-|raw prompt|raw response/i);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("local agent speed history returns empty summary when no receipts exist", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "apex-speed-history-empty-"));
  try {
    const history = await readApexLocalAgentSpeedBenchmarkHistory({ outputRoot: root });

    assert.equal(history.status, "empty");
    assert.equal(history.receiptCount, 0);
    assert.equal(history.summary, "No local benchmark history yet. Apex will not run benchmarks unless John asks.");
    assert.equal(history.benchmarksRunAutomatically, false);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
