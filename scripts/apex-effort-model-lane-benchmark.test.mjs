import assert from "node:assert/strict";
import test from "node:test";

import {
  APEX_EFFORT_MODEL_LANE_BENCHMARK_VERSION,
  buildApexEffortModelLaneBenchmarkPlan,
  parseApexEffortModelLaneBenchmarkArgs,
  runApexEffortModelLaneBenchmark,
} from "./apex-effort-model-lane-benchmark.mjs";

test("effort model lane benchmark args default to approved local pulls and writes", () => {
  const defaults = parseApexEffortModelLaneBenchmarkArgs([]);
  const custom = parseApexEffortModelLaneBenchmarkArgs([
    "--skip-pull",
    "--no-write",
    "--include-16384",
    "--base-url=http://127.0.0.1:11434",
    "--timeout-ms=90000",
    "--pull-timeout-ms",
    "45000",
  ]);

  assert.equal(defaults.write, true);
  assert.equal(defaults.pullMissing, true);
  assert.equal(defaults.include16384, false);
  assert.equal(custom.write, false);
  assert.equal(custom.pullMissing, false);
  assert.equal(custom.include16384, true);
  assert.equal(custom.timeoutMs, 90000);
  assert.equal(custom.pullTimeoutMs, 45000);
});

test("effort model lane benchmark plan covers daily and manual local efforts", () => {
  const plan = buildApexEffortModelLaneBenchmarkPlan({
    modelNames: ["qwen3:14b", "gpt-oss:20b", "qwen3:30b-a3b", "qwen3-coder:30b-a3b-q4_K_M"],
  });
  const effortContextPairs = [...new Set(plan.cases.map((row) => `${row.effort}:${row.model}:${row.numCtx}`))];

  assert.equal(plan.version, APEX_EFFORT_MODEL_LANE_BENCHMARK_VERSION);
  assert.equal(plan.openAiUsed, false);
  assert.equal(plan.cloudUsed, false);
  assert.equal(effortContextPairs.includes("fast:qwen3:14b:4096"), true);
  assert.equal(effortContextPairs.includes("normal:qwen3:14b:4096"), true);
  assert.equal(effortContextPairs.includes("reasoning:gpt-oss:20b:4096"), true);
  assert.equal(effortContextPairs.includes("reasoning:gpt-oss:20b:8192"), true);
  assert.equal(effortContextPairs.includes("moe:qwen3:30b-a3b:8192"), true);
  assert.equal(effortContextPairs.includes("coder:qwen3-coder:30b-a3b-q4_K_M:8192"), true);
  assert.equal(plan.cases.every((row) => row.body.stream === true), true);
  assert.equal(plan.cases.every((row) => row.body.think === false), true);
});

test("effort benchmark run skips missing manual models and never calls cloud", async () => {
  const pullAttempts = [];
  const result = await runApexEffortModelLaneBenchmark({
    write: false,
    pullMissing: true,
    fetchModelNames: async () => ["qwen3:14b"],
    pullModel: async (model) => {
      pullAttempts.push(model);
      return { model, status: "failed", reason: "mock-no-download" };
    },
    runCase: async (_baseUrl, benchmarkCase) => ({
      id: benchmarkCase.id,
      benchmarkType: "effort-model-lane",
      status: "completed",
      effortId: benchmarkCase.effort,
      modelUsed: benchmarkCase.model,
      numCtx: benchmarkCase.numCtx,
      totalDurationMs: benchmarkCase.effort === "fast" ? 430 : 520,
      firstTokenLatencyMs: 210,
      openAiUsed: false,
      cloudUsed: false,
    }),
  });
  const skipped = result.receipts.filter((receipt) => receipt.status === "skipped");

  assert.equal(result.version, APEX_EFFORT_MODEL_LANE_BENCHMARK_VERSION);
  assert.equal(result.openAiUsed, false);
  assert.equal(result.cloudUsed, false);
  assert.deepEqual(pullAttempts, ["gpt-oss:20b", "qwen3:30b-a3b", "qwen3-coder:30b-a3b-q4_K_M"]);
  assert.equal(result.installStatus.status, "missing-approved-models");
  assert.equal(result.outputFolder, "");
  assert.equal(result.summary.receiptType, "effort-model-benchmark-summary");
  assert.equal(result.summary.recommendedDefaultEffort, "fast");
  assert.equal(skipped.length > 0, true);
  assert.equal(skipped.every((receipt) => receipt.openAiUsed === false && receipt.cloudUsed === false), true);
});
