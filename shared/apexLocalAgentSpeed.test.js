import assert from "node:assert/strict";
import test from "node:test";

import {
  APEX_LOCAL_AGENT_EFFORT_ID,
  APEX_LOCAL_AGENT_EFFORT_MODEL,
  APEX_LOCAL_AGENT_SPEED_CONTEXT,
  APEX_LOCAL_AGENT_SPEED_LANE_ID,
  APEX_LOCAL_AGENT_SPEED_MODEL,
  buildApexEffortModelBenchmarkSummary,
  buildApexEffortModelInstallStatus,
  buildApexLocalAgentBenchmarkReceipt,
  buildApexLocalAgentBenchmarkHistorySummary,
  buildApexLocalAgentSpeedOllamaOptions,
  buildApexLocalAgentWarmResidencyPlan,
  buildApexLocalAgentAdaptiveLaneNotes,
  buildApexLocalCodingSpeedPrepReceipt,
  selectApexLocalAgentSpeedLane,
} from "./apexLocalAgentSpeed.js";

test("local agent speed selects fast lane for normal Apex work", () => {
  const lane = selectApexLocalAgentSpeedLane({
    route: "normal-chat",
    question: "Apex, what changed?",
  });
  const options = buildApexLocalAgentSpeedOllamaOptions({ laneSelection: lane, maxOutputTokens: 900 });

  assert.equal(lane.laneId, APEX_LOCAL_AGENT_SPEED_LANE_ID.FAST);
  assert.equal(lane.effortId, APEX_LOCAL_AGENT_EFFORT_ID.FAST);
  assert.equal(lane.modelId, APEX_LOCAL_AGENT_SPEED_MODEL.FAST);
  assert.equal(lane.numCtx, APEX_LOCAL_AGENT_SPEED_CONTEXT.CODING);
  assert.equal(lane.stable4096Active, true);
  assert.equal(lane.stableResidentContext, true);
  assert.equal(lane.keepAlive, "30m");
  assert.equal(lane.coderAutoWarm, false);
  assert.equal(lane.noCloudFallback, true);
  assert.equal(options.options.num_ctx, 4096);
  assert.equal(options.options.num_predict, 240);
});

test("local agent speed auto effort expands detailed turns without manual dropdowns", () => {
  const detailed = selectApexLocalAgentSpeedLane({
    route: "normal-chat",
    effort: "auto",
    question: "Apex, give me the full answer and break down the plan step by step.",
  });
  const short = selectApexLocalAgentSpeedLane({
    route: "voice-command",
    effort: "auto",
    question: "Are you ready?",
  });

  assert.equal(detailed.laneId, APEX_LOCAL_AGENT_SPEED_LANE_ID.NORMAL);
  assert.equal(detailed.effortId, APEX_LOCAL_AGENT_EFFORT_ID.NORMAL);
  assert.equal(detailed.modelId, APEX_LOCAL_AGENT_SPEED_MODEL.FAST);
  assert.equal(detailed.numCtx, 4096);
  assert.equal(detailed.maxOutputTokens, 1400);
  assert.equal(detailed.routeSelectionMode, "automatic");
  assert.equal(detailed.effortAutoSelected, true);
  assert.equal(detailed.manualOnly, false);
  assert.equal(detailed.reasons.includes("auto-normal-effort-for-full-answer"), true);
  assert.equal(short.laneId, APEX_LOCAL_AGENT_SPEED_LANE_ID.FAST);
  assert.equal(short.maxOutputTokens, 240);
  assert.equal(short.effortAutoSelected, true);
});

test("local agent speed ignores system persona coding words for normal turns", () => {
  const lane = selectApexLocalAgentSpeedLane({
    route: "normal-chat",
    messages: [
      { role: "system", content: "Apex may help with coding tasks through controlled tooling." },
      { role: "user", content: "Plan my day." },
    ],
  });

  assert.equal(lane.laneId, APEX_LOCAL_AGENT_SPEED_LANE_ID.FAST);
  assert.equal(lane.effortId, APEX_LOCAL_AGENT_EFFORT_ID.FAST);
  assert.equal(lane.modelId, APEX_LOCAL_AGENT_SPEED_MODEL.FAST);
  assert.equal(lane.numCtx, 4096);
  assert.equal(lane.stable4096Active, true);
});

test("local agent speed keeps manual deep models explicit without dropdown UI", () => {
  const reasoning = selectApexLocalAgentSpeedLane({
    route: "normal-chat",
    question: "Apex, use the reasoning lane for this local comparison.",
    modelNames: ["gpt-oss:20b"],
  });
  const moe = selectApexLocalAgentSpeedLane({
    route: "normal-chat",
    question: "Apex, explicitly run the MoE lane for this test.",
    modelNames: ["qwen3:30b-a3b"],
  });

  assert.equal(reasoning.laneId, APEX_LOCAL_AGENT_SPEED_LANE_ID.REASONING);
  assert.equal(reasoning.effortId, APEX_LOCAL_AGENT_EFFORT_ID.REASONING);
  assert.equal(reasoning.manualOnly, true);
  assert.equal(reasoning.routeSelectionMode, "manual");
  assert.equal(reasoning.reasons.includes("explicit-reasoning-lane-request"), true);
  assert.equal(moe.laneId, APEX_LOCAL_AGENT_SPEED_LANE_ID.MOE);
  assert.equal(moe.effortId, APEX_LOCAL_AGENT_EFFORT_ID.MOE);
  assert.equal(moe.manualOnly, true);
  assert.equal(moe.routeSelectionMode, "manual");
});

test("local agent speed selects coding lane for code and builder work", () => {
  const lane = selectApexLocalAgentSpeedLane({
    route: "coding-analysis",
    question: "Fix this bug and explain the failing test.",
  });

  assert.equal(lane.laneId, APEX_LOCAL_AGENT_SPEED_LANE_ID.CODING);
  assert.equal(lane.effortId, APEX_LOCAL_AGENT_EFFORT_ID.NORMAL);
  assert.equal(lane.modelId, APEX_LOCAL_AGENT_SPEED_MODEL.FAST);
  assert.equal(lane.numCtx, APEX_LOCAL_AGENT_SPEED_CONTEXT.CODING);
  assert.equal(lane.keepAlive, "30m");
  assert.equal(lane.manualOnly, false);
  assert.equal(lane.routeSelectionMode, "automatic");
  assert.equal(lane.coderAutoWarm, false);
});

test("local agent speed uses deep coding only when explicitly requested", () => {
  const normalCoding = selectApexLocalAgentSpeedLane({
    route: "coding-analysis",
    question: "Review this component.",
  });
  const explicitDeep = selectApexLocalAgentSpeedLane({
    route: "coding-analysis",
    question: "Apex, use deep coding with 8192 context for this repo analysis.",
  });

  assert.equal(normalCoding.laneId, APEX_LOCAL_AGENT_SPEED_LANE_ID.CODING);
  assert.equal(normalCoding.modelId, APEX_LOCAL_AGENT_SPEED_MODEL.CODING);
  assert.equal(normalCoding.numCtx, 4096);
  assert.equal(explicitDeep.laneId, APEX_LOCAL_AGENT_SPEED_LANE_ID.DEEP);
  assert.equal(explicitDeep.effortId, APEX_LOCAL_AGENT_EFFORT_ID.DEEP);
  assert.equal(explicitDeep.modelId, APEX_LOCAL_AGENT_SPEED_MODEL.REASONING);
  assert.equal(explicitDeep.numCtx, 8192);
  assert.equal(explicitDeep.manualOnly, true);
  assert.equal(explicitDeep.explicitDeepRequested, true);
  assert.equal(explicitDeep.routeSelectionMode, "manual");
});

test("local agent effort lanes route manual model choices only when selected", () => {
  const reasoning = selectApexLocalAgentSpeedLane({
    effort: "reasoning",
    modelNames: ["qwen3:14b", "gpt-oss:20b"],
  });
  const moe = selectApexLocalAgentSpeedLane({
    effort: "moe",
    modelNames: ["qwen3:14b", "qwen3:30b-a3b"],
  });
  const coder = selectApexLocalAgentSpeedLane({
    effort: "coder",
    modelNames: ["qwen3:14b", "qwen3-coder:30b-a3b-q4_K_M"],
  });
  const normal = selectApexLocalAgentSpeedLane({
    effort: "normal",
    route: "coding-analysis",
    question: "Fix a bug.",
  });

  assert.equal(normal.effortId, APEX_LOCAL_AGENT_EFFORT_ID.NORMAL);
  assert.equal(normal.modelId, APEX_LOCAL_AGENT_SPEED_MODEL.FAST);
  assert.equal(normal.numCtx, 4096);
  assert.equal(normal.manualOnly, false);
  assert.equal(reasoning.effortId, APEX_LOCAL_AGENT_EFFORT_ID.REASONING);
  assert.equal(reasoning.modelId, APEX_LOCAL_AGENT_EFFORT_MODEL.reasoning);
  assert.equal(reasoning.manualOnly, true);
  assert.equal(reasoning.routeSelectionMode, "manual");
  assert.equal(reasoning.reasoningOptionRequested, true);
  assert.equal(reasoning.reasoningOptionSupported, false);
  assert.equal(moe.modelId, APEX_LOCAL_AGENT_EFFORT_MODEL.moe);
  assert.equal(moe.manualOnly, true);
  assert.equal(coder.modelId, APEX_LOCAL_AGENT_EFFORT_MODEL.coder);
  assert.equal(coder.coderAutoWarm, false);
  assert.equal(coder.deepAutoPromotionAllowed, false);
});

test("local agent speed keeps fast coder manual and measurement gated", () => {
  const fallback = selectApexLocalAgentSpeedLane({
    requestedLane: "fast-coder",
    modelNames: ["qwen3:14b", "qwen2.5-coder:7b"],
  });
  const measured = selectApexLocalAgentSpeedLane({
    requestedLane: "fast-coder",
    modelNames: ["qwen3:14b", "qwen2.5-coder:7b"],
    fastCoderMeasured: true,
  });

  assert.equal(fallback.laneId, APEX_LOCAL_AGENT_SPEED_LANE_ID.CODING);
  assert.equal(fallback.modelId, APEX_LOCAL_AGENT_SPEED_MODEL.CODING);
  assert.equal(fallback.blockedReasons.includes("fast-coder-lane-requires-installed-measured-model"), true);
  assert.equal(measured.laneId, APEX_LOCAL_AGENT_SPEED_LANE_ID.FAST_CODER);
  assert.equal(measured.modelId, APEX_LOCAL_AGENT_SPEED_MODEL.FAST_CODER);
  assert.equal(measured.numCtx, 4096);
  assert.equal(measured.manualOnly, true);
});

test("local agent speed blocks accidental 32768 context for normal work", () => {
  const lane = selectApexLocalAgentSpeedLane({
    route: "normal-chat",
    requestedNumCtx: 32768,
  });

  assert.equal(lane.laneId, APEX_LOCAL_AGENT_SPEED_LANE_ID.FAST);
  assert.equal(lane.requestedNumCtx, 32768);
  assert.equal(lane.numCtx, 4096);
  assert.equal(lane.contextPolicy.oversizedContextBlocked, true);
  assert.equal(lane.blockedReasons.includes("32768-context-blocked"), true);
});

test("local agent benchmark receipt records safe timing and residency metadata", () => {
  const lane = selectApexLocalAgentSpeedLane({ route: "normal-chat" });
  const receipt = buildApexLocalAgentBenchmarkReceipt({
    laneSelection: lane,
    route: "normal-chat",
    modelUsed: "qwen3:14b",
    responsePayload: {
      total_duration: 4_000_000_000,
      load_duration: 100_000_000,
      prompt_eval_duration: 900_000_000,
      eval_duration: 2_000_000_000,
      prompt_eval_count: 120,
      eval_count: 80,
      message: { content: "raw response should not appear" },
    },
    residency: {
      vramStatus: "healthy",
      numCtx: 2048,
      reloadNeeded: false,
      vramUsedMb: 8900,
    },
    queueReceipt: {
      queuedMs: 12,
      runMs: 4000,
    },
  });

  assert.equal(receipt.receiptType, "local-agent-benchmark");
  assert.equal(receipt.laneId, "fast");
  assert.equal(receipt.effortId, "fast");
  assert.equal(receipt.numCtx, 4096);
  assert.equal(receipt.stable4096Active, true);
  assert.equal(receipt.contextSwitchAvoided, true);
  assert.equal(receipt.totalDurationMs, 4000);
  assert.equal(receipt.promptEvalDurationMs, 900);
  assert.equal(receipt.generationDurationMs, 2000);
  assert.equal(receipt.promptEvalCount, 120);
  assert.equal(receipt.generationEvalCount, 80);
  assert.equal(receipt.modelVramUsedMb, 8900);
  assert.equal(receipt.rawPromptStored, false);
  assert.equal(receipt.rawResponseStored, false);
  assert.equal(receipt.openAiUsed, false);
  assert.equal(receipt.outputCap, 240);
  assert.equal(receipt.routeSelectionMode, "automatic");
  assert.equal(receipt.adaptiveLaneNotes.status, "lane-likely-enough");
  assert.equal(receipt.adaptiveLaneNotes.autoPromoteTo30B, false);
  assert.doesNotMatch(JSON.stringify(receipt), /raw response should not appear/i);
});

test("local agent warm residency keeps only 14B bounded and clamps context", () => {
  const fastWarm = buildApexLocalAgentWarmResidencyPlan({
    keepWarmEnabled: true,
    activeLane: "fast",
    keepAlive: "-1",
  });
  const codingWarm = buildApexLocalAgentWarmResidencyPlan({
    keepWarmEnabled: true,
    activeLane: "coding",
    requestedNumCtx: 32768,
  });
  const deepBlocked = buildApexLocalAgentWarmResidencyPlan({
    keepWarmEnabled: true,
    activeLane: "deep",
    keepWarmModel: "qwen3-coder:30b",
    question: "Use deep coding with 8192 context.",
  });

  assert.equal(fastWarm.status, "ready");
  assert.equal(fastWarm.targetModel, "qwen3:14b");
  assert.equal(fastWarm.targetNumCtx, 4096);
  assert.equal(fastWarm.stable4096Active, true);
  assert.equal(fastWarm.keepAlive, "30m");
  assert.equal(fastWarm.keepAlivePermanent, false);
  assert.equal(fastWarm.keepAliveMinusOneBlocked, true);
  assert.equal(codingWarm.status, "ready");
  assert.equal(codingWarm.targetNumCtx, 4096);
  assert.equal(codingWarm.contextPolicy.accidental32768Blocked, true);
  assert.equal(deepBlocked.status, "blocked");
  assert.equal(deepBlocked.deepModelWarmAllowed, false);
  assert.equal(deepBlocked.blockedReasons.includes("only-qwen3-14b-can-be-kept-warm"), true);
  assert.equal(deepBlocked.blockedReasons.includes("deep-30b-is-manual-only-not-kept-warm"), true);
});

test("local agent adaptive notes suggest deep lane only as manual follow-up", () => {
  const codingLane = selectApexLocalAgentSpeedLane({
    route: "coding-analysis",
    question: "Debug this failing component.",
  });
  const notes = buildApexLocalAgentAdaptiveLaneNotes({
    laneSelection: codingLane,
    route: "coding-analysis",
    timingStats: {
      totalDurationMs: 31_000,
      promptEvalDurationMs: 13_000,
      generationDurationMs: 19_000,
      promptEvalCount: 900,
      generationEvalCount: 600,
    },
  });

  assert.equal(notes.receiptType, "adaptive-lane-notes");
  assert.equal(notes.status, "suggest-deep-manual");
  assert.equal(notes.deepLaneSuggested, true);
  assert.equal(notes.suggestedModel, APEX_LOCAL_AGENT_SPEED_MODEL.REASONING);
  assert.equal(notes.autoPromoteTo30B, false);
  assert.equal(notes.deepManualOnly, true);
});

test("local coding speed prep summarizes dirty files without building a graph", () => {
  const receipt = buildApexLocalCodingSpeedPrepReceipt({
    changedFiles: [
      { path: "src/apex-control-room-components.jsx", status: "modified" },
      { path: "server/apexOllamaProvider.js", status: "modified" },
      { path: "shared/apexLocalAgentSpeed.js", status: "added" },
    ],
  });

  assert.equal(receipt.receiptType, "local-coding-speed-prep");
  assert.equal(receipt.status, "ready");
  assert.equal(receipt.changedFileCount, 3);
  assert.equal(receipt.recommendedLane, "coding");
  assert.equal(receipt.recommendedModel, "qwen3:14b");
  assert.equal(receipt.recommendedNumCtx, 4096);
  assert.equal(receipt.deepModel, "qwen3-coder:30b");
  assert.equal(receipt.deepLaneManualOnly, true);
  assert.equal(receipt.autoPromoteTo30B, false);
  assert.equal(receipt.noKnowledgeGraphBuilt, true);
  assert.equal(receipt.noFileCrawlerAdded, true);
  assert.equal(receipt.fieldDataIncluded, false);
  assert.equal(receipt.noCloudFallback, true);
});

test("local benchmark history summary keeps compact timing without raw content", () => {
  const summary = buildApexLocalAgentBenchmarkHistorySummary({
    receipts: [
      {
        provider: "apex-local-agent-speed",
        receiptType: "local-agent-benchmark",
        status: "completed",
        laneId: "fast",
        modelUsed: "qwen3:14b",
        numCtx: 2048,
        totalDurationMs: 3000,
        loadDurationMs: 200,
        promptEvalDurationMs: 100,
        generationDurationMs: 400,
        firstTokenLatencyMs: 250,
        adaptiveLaneNotes: { deepLaneSuggested: false },
        answer: "raw response should not be kept",
      },
      {
        provider: "apex-local-agent-speed",
        receiptType: "local-agent-benchmark",
        status: "completed",
        laneId: "coding",
        modelUsed: "qwen3:14b",
        numCtx: 4096,
        totalDurationMs: 5000,
        loadDurationMs: 250,
        promptEvalDurationMs: 150,
        generationDurationMs: 900,
        adaptiveLaneNotes: { deepLaneSuggested: true },
      },
    ],
  });

  assert.equal(summary.receiptType, "benchmark-history-summary");
  assert.equal(summary.version, "v1.3");
  assert.equal(summary.status, "ready");
  assert.equal(summary.completedCount, 2);
  assert.equal(summary.averageTotalDurationMs, 4000);
  assert.equal(summary.averageFirstTokenLatencyMs, 250);
  assert.equal(summary.firstTokenSamples, 1);
  assert.equal(summary.latest.laneId, "coding");
  assert.equal(summary.deepSuggestedCount, 1);
  assert.equal(summary.autoPromoteTo30B, false);
  assert.equal(summary.stableResidency.receiptType, "stable-residency-benchmark-summary");
  assert.doesNotMatch(JSON.stringify(summary), /raw response should not be kept/i);
});

test("effort model install status and benchmark summary stay local-only", () => {
  const installStatus = buildApexEffortModelInstallStatus({
    modelNames: ["qwen3:14b", "gpt-oss:20b"],
    pullResults: [{ model: "qwen3:30b-a3b", status: "failed", reason: "mock-timeout" }],
  });
  const benchmarkSummary = buildApexEffortModelBenchmarkSummary({
    receipts: [
      {
        provider: "apex-local-agent-speed",
        receiptType: "local-agent-benchmark",
        status: "completed",
        effortId: "fast",
        modelUsed: "qwen3:14b",
        numCtx: 4096,
        totalDurationMs: 430,
        firstTokenLatencyMs: 220,
      },
      {
        provider: "apex-local-agent-speed",
        receiptType: "local-agent-benchmark",
        status: "completed",
        effortId: "reasoning",
        modelUsed: "gpt-oss:20b",
        numCtx: 8192,
        totalDurationMs: 1800,
        firstTokenLatencyMs: 550,
      },
    ],
  });

  assert.equal(installStatus.receiptType, "effort-model-install-status");
  assert.equal(installStatus.openAiUsed, false);
  assert.equal(installStatus.cloudUsed, false);
  assert.equal(installStatus.missingModels.includes("qwen3:30b-a3b"), true);
  assert.equal(benchmarkSummary.receiptType, "effort-model-benchmark-summary");
  assert.equal(benchmarkSummary.recommendedDefaultEffort, "fast");
  assert.equal(benchmarkSummary.recommendedDailyModel, "qwen3:14b");
  assert.equal(benchmarkSummary.no30BWarm, true);
  assert.equal(benchmarkSummary.no32768, true);
  assert.equal(benchmarkSummary.noCloudFallback, true);
  assert.equal(benchmarkSummary.openAiUsed, false);
});
