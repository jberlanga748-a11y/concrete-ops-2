import assert from "node:assert/strict";
import test from "node:test";

import {
  APEX_MOE_REASONING_APPROVED_PULL_MODELS,
  APEX_MOE_REASONING_BENCHMARK_VERSION,
  APEX_MOE_REASONING_OUTPUT_ROOT,
  buildApexMoeReasoningBenchmarkPlan,
  parseApexMoeReasoningBenchmarkArgs,
  runApexMoeReasoningBenchmark,
} from "./apex-moe-reasoning-benchmark-v1-1.mjs";

test("MoE reasoning benchmark args default to long bounded local pulls", () => {
  const defaults = parseApexMoeReasoningBenchmarkArgs([]);
  const custom = parseApexMoeReasoningBenchmarkArgs([
    "--skip-pull",
    "--no-write",
    "--include-16384",
    "--no-warmup",
    "--no-restore-baseline",
    "--timeout-ms=90000",
    "--pull-timeout-ms",
    "1200000",
  ]);

  assert.equal(defaults.write, true);
  assert.equal(defaults.pullMissing, true);
  assert.equal(defaults.warmupBaseline, true);
  assert.equal(defaults.restoreBaselineResident, true);
  assert.equal(defaults.pullTimeoutMs, 45 * 60 * 1000);
  assert.equal(custom.write, false);
  assert.equal(custom.pullMissing, false);
  assert.equal(custom.include16384, true);
  assert.equal(custom.warmupBaseline, false);
  assert.equal(custom.restoreBaselineResident, false);
  assert.equal(custom.timeoutMs, 90000);
  assert.equal(custom.pullTimeoutMs, 1200000);
});

test("MoE reasoning benchmark plan excludes coder and covers approved candidates", () => {
  const plan = buildApexMoeReasoningBenchmarkPlan({
    modelNames: ["qwen3:14b", "gpt-oss:20b", "qwen3:30b-a3b", "qwen3-coder:30b-a3b-q4_K_M"],
  });
  const pairs = [...new Set(plan.cases.map((row) => `${row.effort}:${row.model}:${row.numCtx}`))];

  assert.equal(plan.version, APEX_MOE_REASONING_BENCHMARK_VERSION);
  assert.deepEqual(plan.approvedPullModels, APEX_MOE_REASONING_APPROVED_PULL_MODELS);
  assert.equal(plan.includesCoder, false);
  assert.equal(plan.openAiUsed, false);
  assert.equal(plan.cloudUsed, false);
  assert.equal(plan.rawPromptStored, false);
  assert.equal(plan.rawResponseStored, false);
  assert.equal(pairs.includes("normal:qwen3:14b:4096"), true);
  assert.equal(pairs.includes("reasoning:gpt-oss:20b:4096"), true);
  assert.equal(pairs.includes("reasoning:gpt-oss:20b:8192"), true);
  assert.equal(pairs.includes("moe:qwen3:30b-a3b:4096"), true);
  assert.equal(pairs.includes("moe:qwen3:30b-a3b:8192"), true);
  assert.equal(plan.cases.some((row) => /coder/i.test(row.effort) || /coder/i.test(row.model)), false);
  assert.equal(plan.cases.some((row) => row.numCtx >= 32768), false);
  assert.equal(plan.cases.every((row) => row.body.stream === true && row.body.think === false), true);
});

test("MoE reasoning benchmark continues when one approved pull fails", async () => {
  const pullAttempts = [];
  const result = await runApexMoeReasoningBenchmark({
    write: false,
    pullMissing: true,
    warmupBaseline: false,
    restoreBaselineResident: false,
    fetchModelNames: async () => ["qwen3:14b", "gpt-oss:20b"],
    pullModel: async (model) => {
      pullAttempts.push(model);
      return { model, status: "failed", reason: "mock-timeout", durationMs: 1200 };
    },
    runCase: async (_baseUrl, benchmarkCase) => ({
      id: benchmarkCase.id,
      benchmarkType: "moe-reasoning-benchmark",
      status: "completed",
      effortId: benchmarkCase.effort,
      modelUsed: benchmarkCase.model,
      numCtx: benchmarkCase.numCtx,
      totalDurationMs: benchmarkCase.effort === "normal" ? 680 : 2400,
      firstTokenLatencyMs: benchmarkCase.effort === "normal" ? 145 : 900,
      loadDurationMs: 0,
      tokensPerSecond: 42,
      openAiUsed: false,
      cloudUsed: false,
      rawPromptStored: false,
      rawResponseStored: false,
      rawAudioStored: false,
      secretsExposed: false,
    }),
  });
  const skipped = result.receipts.filter((receipt) => receipt.status === "skipped");

  assert.equal(result.version, APEX_MOE_REASONING_BENCHMARK_VERSION);
  assert.equal(result.outputFolder, "");
  assert.deepEqual(pullAttempts, ["qwen3:30b-a3b"]);
  assert.equal(result.includesCoder, false);
  assert.equal(result.installStatus.models.some((row) => /coder/i.test(row.model)), false);
  assert.equal(result.installStatus.models.find((row) => row.model === "qwen3:30b-a3b").pullAttempted, true);
  assert.equal(result.summary.recommendedDailyDefault.model, "qwen3:14b");
  assert.equal(result.summary.manualOnly.moe, true);
  assert.equal(skipped.some((receipt) => receipt.effortId === "moe"), true);
  assert.equal(result.openAiUsed, false);
  assert.equal(result.cloudUsed, false);
  assert.equal(result.rawPromptStored, false);
  assert.equal(result.rawResponseStored, false);
});

test("MoE reasoning benchmark write root uses the requested receipt folder name", () => {
  assert.equal(APEX_MOE_REASONING_OUTPUT_ROOT, "apex-moe-reasoning-benchmark-v1-1");
});
