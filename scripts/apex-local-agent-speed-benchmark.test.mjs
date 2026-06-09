import assert from "node:assert/strict";
import test from "node:test";

import {
  APEX_LOCAL_AGENT_SPEED_BENCHMARK_PROMPTS,
  buildApexLocalAgentSpeedBenchmarkPlan,
  parseApexLocalAgentSpeedBenchmarkArgs,
  runApexLocalAgentSpeedBenchmark,
} from "./apex-local-agent-speed-benchmark.mjs";

test("local agent speed benchmark args keep 30B manual", () => {
  const defaults = parseApexLocalAgentSpeedBenchmarkArgs([]);
  const manual = parseApexLocalAgentSpeedBenchmarkArgs([
    "--include-30b",
    "--include-fast-coder",
    "--base-url",
    "http://127.0.0.1:11434",
    "--timeout-ms=90000",
    "--write",
  ]);

  assert.equal(defaults.include30b, false);
  assert.equal(defaults.write, false);
  assert.equal(defaults.warmFirst, true);
  assert.equal(manual.include30b, true);
  assert.equal(manual.includeFastCoder, true);
  assert.equal(manual.baseUrl, "http://127.0.0.1:11434");
  assert.equal(manual.timeoutMs, 90000);
  assert.equal(manual.write, true);
});

test("local agent speed benchmark plan compares 14B fast and normal coding by default", () => {
  const plan = buildApexLocalAgentSpeedBenchmarkPlan({
    modelNames: ["qwen3:14b", "qwen3-coder:30b"],
  });
  const models = [...new Set(plan.cases.map((row) => row.model))];
  const laneContextPairs = [...new Set(plan.cases.map((row) => `${row.lane.laneId}:${row.lane.numCtx}:${row.model}`))];
  const patternIds = plan.patterns.map((pattern) => pattern.id);

  assert.equal(plan.version, "apex-local-agent-speed-v1.3");
  assert.equal(plan.include30b, false);
  assert.equal(plan.noCloudFallback, true);
  assert.equal(plan.openAiUsed, false);
  assert.deepEqual(models, ["qwen3:14b"]);
  assert.deepEqual(patternIds, ["stable-2048", "stable-4096", "alternating-2048-4096"]);
  assert.equal(laneContextPairs.includes("fast:2048:qwen3:14b"), true);
  assert.equal(laneContextPairs.includes("coding:4096:qwen3:14b"), true);
  assert.equal(plan.cases.every((row) => row.body.stream === true), true);
  assert.equal(plan.cases.length, 12);
  assert.equal(plan.patterns.find((pattern) => pattern.id === "stable-4096").cases.every((row) => row.lane.numCtx === 4096), true);
});

test("local agent speed benchmark plan includes manual deep only behind explicit flag", () => {
  const plan = buildApexLocalAgentSpeedBenchmarkPlan({
    modelNames: ["qwen3:14b", "gpt-oss:20b"],
    include30b: true,
  });
  const deepCases = plan.cases.filter((row) => row.lane.laneId === "deep");

  assert.equal(plan.include30b, true);
  assert.equal(deepCases.length, Math.min(4, APEX_LOCAL_AGENT_SPEED_BENCHMARK_PROMPTS.length));
  assert.equal(deepCases.every((row) => row.model === "gpt-oss:20b"), true);
  assert.equal(deepCases.every((row) => row.lane.manualOnly === true), true);
  assert.equal(deepCases.every((row) => row.lane.deepAutoPromotionAllowed === false), true);
});

test("local agent speed benchmark run skips missing models and does not call cloud", async () => {
  const result = await runApexLocalAgentSpeedBenchmark({
    include30b: true,
    fetchModelNames: async () => ["qwen3:14b"],
    runCase: async (_baseUrl, benchmarkCase) => ({
      id: benchmarkCase.id,
      status: "mocked",
      model: benchmarkCase.model,
      laneId: benchmarkCase.lane.laneId,
      numCtx: benchmarkCase.lane.numCtx,
      openAiUsed: false,
      cloudUsed: false,
    }),
    warmModel: async () => ({
      provider: "apex-local-agent-speed",
      receiptType: "warm-residency-plan",
      status: "ready",
      targetModel: "qwen3:14b",
      targetNumCtx: 4096,
      keepAlive: "30m",
      residencyPatternId: "stable-4096",
    }),
  });
  const skipped = result.receipts.filter((receipt) => receipt.status === "skipped");

  assert.equal(result.openAiUsed, false);
  assert.equal(result.cloudUsed, false);
  assert.equal(result.warmFirst, true);
  assert.equal(result.warmReceipt.status, "ready");
  assert.equal(result.summary.receiptType, "benchmark-history-summary");
  assert.equal(result.stableResidency.receiptType, "stable-residency-benchmark-summary");
  assert.equal(result.outputFile, "");
  assert.equal(skipped.length, Math.min(4, APEX_LOCAL_AGENT_SPEED_BENCHMARK_PROMPTS.length));
  assert.equal(skipped.every((receipt) => receipt.model === "gpt-oss:20b"), true);
});
