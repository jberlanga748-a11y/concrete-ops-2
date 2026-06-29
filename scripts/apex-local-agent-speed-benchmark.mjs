import fs from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { pathToFileURL } from "node:url";

import {
  APEX_LOCAL_AGENT_SPEED_CONTEXT,
  APEX_LOCAL_AGENT_SPEED_LANE_ID,
  APEX_LOCAL_AGENT_SPEED_MODEL,
  buildApexLocalAgentAdaptiveLaneNotes,
  buildApexLocalAgentBenchmarkHistorySummary,
  buildApexLocalAgentBenchmarkReceipt,
  buildApexStableResidencyBenchmarkSummary,
  buildApexStableResidencyPolicy,
  buildApexLocalAgentWarmResidencyPlan,
  buildApexLocalAgentSpeedOllamaOptions,
  parseOllamaTimingStats,
  selectApexLocalAgentSpeedLane,
} from "../shared/apexLocalAgentSpeed.js";
import {
  buildApexOllamaResidencyReceipt,
} from "../server/apexOllamaProvider.js";

export const APEX_LOCAL_AGENT_SPEED_BENCHMARK_VERSION = "apex-local-agent-speed-v1.3";
export const APEX_LOCAL_AGENT_SPEED_BENCHMARK_DEFAULT_BASE_URL = "http://127.0.0.1:11434";

export const APEX_LOCAL_AGENT_SPEED_BENCHMARK_PROMPTS = Object.freeze([
  Object.freeze({
    id: "simple-chat",
    route: "normal-chat",
    prompt: "Answer in one sentence: what changed in Apex local speed mode?",
  }),
  Object.freeze({
    id: "file-summary",
    route: "safe-summary",
    prompt: "Summarize this local file list: shared/apexLocalAgentSpeed.js, server/apexOllamaProvider.js, src/apex-control-room-utils.js.",
  }),
  Object.freeze({
    id: "small-code-explanation",
    route: "coding-analysis",
    prompt: "Explain this small JavaScript bug in two bullets: Number(undefined) becomes NaN and should fall back to 0.",
  }),
  Object.freeze({
    id: "bug-fix-prompt",
    route: "coding-analysis",
    prompt: "Propose the smallest safe local fix for a stale UI label that says 30B active during normal coding.",
  }),
  Object.freeze({
    id: "deep-debug-prompt",
    route: "coding-analysis",
    prompt: "Given a local provider routing regression, outline the evidence needed before asking John to use the deep 30B lane.",
  }),
]);

export const APEX_LOCAL_AGENT_STABLE_RESIDENCY_BENCHMARK_PATTERNS = Object.freeze([
  Object.freeze({
    id: "stable-2048",
    label: "Stable 2048 repeated turns",
    residentNumCtx: APEX_LOCAL_AGENT_SPEED_CONTEXT.FAST,
    stableResidencyEnabled: true,
    contexts: Object.freeze([
      APEX_LOCAL_AGENT_SPEED_CONTEXT.FAST,
      APEX_LOCAL_AGENT_SPEED_CONTEXT.FAST,
      APEX_LOCAL_AGENT_SPEED_CONTEXT.FAST,
      APEX_LOCAL_AGENT_SPEED_CONTEXT.FAST,
    ]),
  }),
  Object.freeze({
    id: "stable-4096",
    label: "Stable 4096 repeated turns",
    residentNumCtx: APEX_LOCAL_AGENT_SPEED_CONTEXT.CODING,
    stableResidencyEnabled: true,
    contexts: Object.freeze([
      APEX_LOCAL_AGENT_SPEED_CONTEXT.CODING,
      APEX_LOCAL_AGENT_SPEED_CONTEXT.CODING,
      APEX_LOCAL_AGENT_SPEED_CONTEXT.CODING,
      APEX_LOCAL_AGENT_SPEED_CONTEXT.CODING,
    ]),
  }),
  Object.freeze({
    id: "alternating-2048-4096",
    label: "Alternating 2048/4096 repeated turns",
    residentNumCtx: 0,
    stableResidencyEnabled: false,
    contexts: Object.freeze([
      APEX_LOCAL_AGENT_SPEED_CONTEXT.FAST,
      APEX_LOCAL_AGENT_SPEED_CONTEXT.CODING,
      APEX_LOCAL_AGENT_SPEED_CONTEXT.FAST,
      APEX_LOCAL_AGENT_SPEED_CONTEXT.CODING,
    ]),
  }),
]);

function text(value = "", limit = 400) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, limit);
}

function safeNumber(value = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function hasModel(modelNames = [], model = "") {
  const target = text(model, 160).toLowerCase();
  return Boolean(target) && (Array.isArray(modelNames) ? modelNames : [])
    .some((name) => text(name, 160).toLowerCase() === target);
}

export function parseApexLocalAgentSpeedBenchmarkArgs(args = []) {
  const output = {
    baseUrl: process.env.APEX_OLLAMA_BASE_URL || APEX_LOCAL_AGENT_SPEED_BENCHMARK_DEFAULT_BASE_URL,
    include30b: false,
    includeFastCoder: false,
    write: false,
    warmFirst: true,
    timeoutMs: 120_000,
  };
  for (let index = 0; index < args.length; index += 1) {
    const arg = String(args[index] || "");
    if (arg === "--include-30b" || arg === "--manual-30b") output.include30b = true;
    else if (arg === "--include-fast-coder") output.includeFastCoder = true;
    else if (arg === "--write") output.write = true;
    else if (arg === "--warm-first") output.warmFirst = true;
    else if (arg === "--no-warm-first") output.warmFirst = false;
    else if (arg === "--base-url") {
      output.baseUrl = String(args[index + 1] || output.baseUrl);
      index += 1;
    }
    else if (arg.startsWith("--base-url=")) output.baseUrl = arg.slice("--base-url=".length);
    else if (arg === "--timeout-ms") {
      output.timeoutMs = Math.max(1000, Math.round(safeNumber(args[index + 1]) || output.timeoutMs));
      index += 1;
    }
    else if (arg.startsWith("--timeout-ms=")) output.timeoutMs = Math.max(1000, Math.round(safeNumber(arg.slice("--timeout-ms=".length)) || output.timeoutMs));
  }
  return Object.freeze(output);
}

export function buildApexLocalAgentSpeedBenchmarkPlan({
  modelNames = [],
  include30b = false,
  includeFastCoder = false,
  fastCoderMeasured = false,
} = {}) {
  const prompts = APEX_LOCAL_AGENT_SPEED_BENCHMARK_PROMPTS.slice(0, 4);
  const patterns = APEX_LOCAL_AGENT_STABLE_RESIDENCY_BENCHMARK_PATTERNS.map((pattern) => {
    const cases = pattern.contexts.map((numCtx, index) => {
      const prompt = prompts[index % prompts.length];
      const requestedLane = pattern.stableResidencyEnabled
        ? prompt.route === "coding-analysis"
          ? APEX_LOCAL_AGENT_SPEED_LANE_ID.CODING
          : APEX_LOCAL_AGENT_SPEED_LANE_ID.FAST
        : numCtx >= APEX_LOCAL_AGENT_SPEED_CONTEXT.CODING
          ? APEX_LOCAL_AGENT_SPEED_LANE_ID.CODING
          : APEX_LOCAL_AGENT_SPEED_LANE_ID.FAST;
      const stableResidency = buildApexStableResidencyPolicy({
        stableResidencyEnabled: pattern.stableResidencyEnabled,
        residentNumCtx: pattern.residentNumCtx || numCtx,
      });
      const lane = selectApexLocalAgentSpeedLane({
        requestedLane,
        route: requestedLane === APEX_LOCAL_AGENT_SPEED_LANE_ID.CODING ? "coding-analysis" : prompt.route,
        question: prompt.prompt,
        modelNames,
        requestedNumCtx: numCtx,
        stableResidencyEnabled: pattern.stableResidencyEnabled,
        residentNumCtx: pattern.residentNumCtx || numCtx,
        stableResidency,
      });
      const options = buildApexLocalAgentSpeedOllamaOptions({ laneSelection: lane, maxOutputTokens: 260 });
      return Object.freeze({
        id: `${pattern.id}-turn-${index + 1}-${prompt.id}`,
        promptId: prompt.id,
        prompt: prompt.prompt,
        route: prompt.route,
        residencyPatternId: pattern.id,
        residencyPatternLabel: pattern.label,
        turnIndex: index + 1,
        expectedContext: numCtx,
        lane,
        model: options.model,
        keepAlive: options.keepAlive,
        body: Object.freeze({
          model: options.model,
          stream: true,
          think: false,
          keep_alive: options.keepAlive,
          messages: Object.freeze([
            Object.freeze({ role: "system", content: "You are Apex running a local-only stable residency benchmark. Return compact plain text." }),
            Object.freeze({ role: "user", content: prompt.prompt }),
          ]),
          options: options.options,
        }),
      });
    });
    return Object.freeze({ ...pattern, cases: Object.freeze(cases) });
  });
  const variants = [];
  if (includeFastCoder) {
    variants.push({
      id: "qwen2-5-coder-7b-fast-coder-4096",
      requestedLane: APEX_LOCAL_AGENT_SPEED_LANE_ID.FAST_CODER,
      route: "coding-analysis",
      modelNames,
      fastCoderMeasured,
      requestedNumCtx: APEX_LOCAL_AGENT_SPEED_CONTEXT.CODING,
    });
  }
  if (include30b) {
    variants.push({
      id: "qwen3-coder-30b-deep-manual-8192",
      requestedLane: APEX_LOCAL_AGENT_SPEED_LANE_ID.DEEP,
      route: "coding-analysis",
      question: "Use deep coding with 8192 context.",
      modelNames,
      requestedNumCtx: APEX_LOCAL_AGENT_SPEED_CONTEXT.DEEP,
    });
  }

  const manualCases = [];
  for (const prompt of prompts) {
    for (const variant of variants) {
      const lane = selectApexLocalAgentSpeedLane({
        ...variant,
        route: variant.requestedLane === APEX_LOCAL_AGENT_SPEED_LANE_ID.FAST ? prompt.route : variant.route,
        question: `${variant.question || ""} ${prompt.prompt}`.trim(),
      });
      const options = buildApexLocalAgentSpeedOllamaOptions({ laneSelection: lane, maxOutputTokens: 260 });
      manualCases.push(Object.freeze({
        id: `${prompt.id}-${variant.id}`,
        promptId: prompt.id,
        prompt: prompt.prompt,
        route: prompt.route,
        residencyPatternId: "manual-extra",
        residencyPatternLabel: "Manual extra lane",
        turnIndex: 0,
        lane,
        model: options.model,
        keepAlive: options.keepAlive,
        body: Object.freeze({
          model: options.model,
          stream: true,
          think: false,
          keep_alive: options.keepAlive,
          messages: Object.freeze([
            Object.freeze({ role: "system", content: "You are Apex running a local-only timing benchmark. Return compact plain text." }),
            Object.freeze({ role: "user", content: prompt.prompt }),
          ]),
          options: options.options,
        }),
      }));
    }
  }
  const cases = Object.freeze([
    ...patterns.flatMap((pattern) => pattern.cases),
    ...manualCases,
  ]);
  return Object.freeze({
    provider: "apex-local-agent-speed-benchmark",
    version: APEX_LOCAL_AGENT_SPEED_BENCHMARK_VERSION,
    include30b: Boolean(include30b),
    includeFastCoder: Boolean(includeFastCoder),
    fastCoderMeasured: Boolean(fastCoderMeasured),
    patterns: Object.freeze(patterns),
    cases,
    noCloudFallback: true,
    openAiUsed: false,
  });
}

async function fetchJson(url, options = {}, timeoutMs = 120_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const payload = await response.json().catch(() => ({}));
    return { response, payload };
  } finally {
    clearTimeout(timer);
  }
}

function parseStreamLinePayloads(lines = [], firstTokenLatencyMs = 0) {
  let content = "";
  let lastPayload = {};
  for (const line of lines) {
    const trimmed = String(line || "").trim();
    if (!trimmed) continue;
    const payload = JSON.parse(trimmed);
    if (payload && typeof payload === "object") lastPayload = payload;
    const chunk = typeof payload?.message?.content === "string" ? payload.message.content : typeof payload?.response === "string" ? payload.response : "";
    if (chunk) content += chunk;
  }
  return {
    ...lastPayload,
    message: { ...(lastPayload.message || {}), content },
    response: content || lastPayload.response || "",
    firstTokenLatencyMs: content && firstTokenLatencyMs ? firstTokenLatencyMs : 0,
  };
}

async function readChatPayload(response, startedAt) {
  if (!response.body || typeof response.body.getReader !== "function") {
    return response.json();
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const lines = [];
  let buffer = "";
  let firstTokenLatencyMs = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    if (!firstTokenLatencyMs && chunk.trim()) firstTokenLatencyMs = Math.max(1, Math.round(performance.now() - startedAt));
    buffer += chunk;
    const parts = buffer.split(/\r?\n/);
    buffer = parts.pop() || "";
    lines.push(...parts.filter(Boolean));
  }
  const tail = `${buffer}${decoder.decode()}`.trim();
  if (tail) lines.push(tail);
  if (lines.length > 1) return parseStreamLinePayloads(lines, firstTokenLatencyMs);
  if (lines.length === 1) {
    const payload = JSON.parse(lines[0]);
    const content = typeof payload?.message?.content === "string" ? payload.message.content : typeof payload?.response === "string" ? payload.response : "";
    return { ...payload, firstTokenLatencyMs: content && firstTokenLatencyMs ? firstTokenLatencyMs : 0 };
  }
  return { message: { content: "" }, firstTokenLatencyMs: 0 };
}

async function readModelNames(baseUrl, timeoutMs) {
  const { response, payload } = await fetchJson(`${baseUrl}/api/tags`, {
    method: "GET",
    headers: { Accept: "application/json" },
  }, Math.min(timeoutMs, 10_000));
  if (!response.ok) return [];
  return (Array.isArray(payload.models) ? payload.models : [])
    .map((model) => text(model.name || model.model, 160))
    .filter(Boolean);
}

async function readBenchmarkResidency(baseUrl, benchmarkCase, timeoutMs) {
  try {
    const { response, payload } = await fetchJson(`${baseUrl}/api/ps`, {
      method: "GET",
      headers: { Accept: "application/json" },
    }, Math.min(timeoutMs, 10_000));
    return buildApexOllamaResidencyReceipt({
      payload: response.ok ? payload : { models: [] },
      status: response.ok ? "" : "unavailable",
      reason: response.ok ? "" : `ollama-ps-http-${response.status}`,
      activeLane: benchmarkCase.lane.laneId,
      activeLaneNumCtx: benchmarkCase.lane.numCtx,
      targetModel: benchmarkCase.model,
      stableResidency: benchmarkCase.lane.stableResidency,
    });
  } catch (error) {
    return buildApexOllamaResidencyReceipt({
      status: "unavailable",
      reason: error?.name === "AbortError" ? "ollama-ps-timeout" : "ollama-ps-unavailable",
      activeLane: benchmarkCase.lane.laneId,
      activeLaneNumCtx: benchmarkCase.lane.numCtx,
      targetModel: benchmarkCase.model,
      stableResidency: benchmarkCase.lane.stableResidency,
    });
  }
}

async function runBenchmarkCase(baseUrl, benchmarkCase, timeoutMs) {
  if (!hasModel([benchmarkCase.model], benchmarkCase.model)) {
    return Object.freeze({
      id: benchmarkCase.id,
      status: "skipped",
      reason: "model-name-empty",
      model: benchmarkCase.model,
    });
  }
  const startedAt = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response;
  let payload;
  let wallMs = 0;
  const beforeResidency = await readBenchmarkResidency(baseUrl, benchmarkCase, timeoutMs);
  try {
    response = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(benchmarkCase.body),
      signal: controller.signal,
    });
    payload = await readChatPayload(response, startedAt);
    wallMs = Math.round(performance.now() - startedAt);
  } finally {
    clearTimeout(timer);
  }
  if (!response.ok) {
    return Object.freeze({
      id: benchmarkCase.id,
      status: "failed",
      reason: `ollama-chat-http-${response.status}`,
      model: benchmarkCase.model,
      laneId: benchmarkCase.lane.laneId,
      numCtx: benchmarkCase.lane.numCtx,
      totalDurationMs: wallMs,
      openAiUsed: false,
      cloudUsed: false,
    });
  }
  const timingStats = parseOllamaTimingStats(payload);
  const residency = await readBenchmarkResidency(baseUrl, benchmarkCase, timeoutMs);
  const adaptiveLaneNotes = buildApexLocalAgentAdaptiveLaneNotes({
    laneSelection: benchmarkCase.lane,
    route: benchmarkCase.route,
    timingStats,
    totalDurationMs: wallMs,
  });
  return buildApexLocalAgentBenchmarkReceipt({
    laneSelection: benchmarkCase.lane,
    route: benchmarkCase.route,
    modelUsed: benchmarkCase.model,
    responsePayload: payload,
    timingStats,
    responseTimingMs: wallMs,
    adaptiveLaneNotes,
    beforeResidency,
    residency,
    residencyPatternId: benchmarkCase.residencyPatternId,
    residencyPatternLabel: benchmarkCase.residencyPatternLabel,
    turnIndex: benchmarkCase.turnIndex,
  });
}

async function warmBenchmarkModel(baseUrl, timeoutMs, pattern = {}) {
  const warmPlan = buildApexLocalAgentWarmResidencyPlan({
    keepWarmEnabled: true,
    activeLane: pattern.id || "stable-4096",
    keepWarmModel: APEX_LOCAL_AGENT_SPEED_MODEL.FAST,
    stableResidencyEnabled: pattern.stableResidencyEnabled !== false,
    residentNumCtx: pattern.residentNumCtx || APEX_LOCAL_AGENT_SPEED_CONTEXT.CODING,
  });
  if (warmPlan.status !== "ready") return warmPlan;
  const startedAt = performance.now();
  const { response } = await fetchJson(`${baseUrl}/api/generate`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: warmPlan.targetModel,
      prompt: "",
      stream: false,
      keep_alive: warmPlan.keepAlive,
      options: {
        num_ctx: warmPlan.targetNumCtx,
        num_predict: 1,
      },
    }),
  }, Math.min(timeoutMs, 120_000));
  return Object.freeze({
    ...warmPlan,
    status: response.ok ? "ready" : "failed",
    success: Boolean(response.ok),
    warmTimingMs: Math.max(1, Math.round(performance.now() - startedAt)),
    reason: response.ok ? "benchmark-warm-first-ok" : `benchmark-warm-first-http-${response.status}`,
    residencyPatternId: pattern.id || "",
    residencyPatternLabel: pattern.label || "",
    benchmarksRunAutomatically: false,
  });
}

async function writeReceipts(receipts) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const folder = path.join(process.cwd(), "outputs", "apex-local-agent-speed-v1-3", stamp);
  await fs.mkdir(folder, { recursive: true });
  const file = path.join(folder, "receipts.json");
  await fs.writeFile(file, `${JSON.stringify(receipts, null, 2)}\n`, "utf8");
  const summaryFile = path.join(folder, "summary.json");
  await fs.writeFile(summaryFile, `${JSON.stringify(receipts.summary || {}, null, 2)}\n`, "utf8");
  return file;
}

export async function runApexLocalAgentSpeedBenchmark({
  baseUrl = APEX_LOCAL_AGENT_SPEED_BENCHMARK_DEFAULT_BASE_URL,
  include30b = false,
  includeFastCoder = false,
  write = false,
  warmFirst = true,
  timeoutMs = 120_000,
  fetchModelNames = readModelNames,
  runCase = runBenchmarkCase,
  warmModel = warmBenchmarkModel,
} = {}) {
  const modelNames = await fetchModelNames(baseUrl, timeoutMs);
  const plan = buildApexLocalAgentSpeedBenchmarkPlan({
    modelNames,
    include30b,
    includeFastCoder,
    fastCoderMeasured: includeFastCoder && hasModel(modelNames, APEX_LOCAL_AGENT_SPEED_MODEL.FAST_CODER),
  });
  const warmSkippedReceipt = Object.freeze({
    provider: "apex-local-agent-speed",
    receiptType: "warm-residency-plan",
    version: "v1.3",
    status: warmFirst ? "skipped" : "disabled",
    reason: warmFirst ? "qwen3-14b-not-installed" : "warm-first-disabled",
    benchmarksRunAutomatically: false,
    openAiUsed: false,
    cloudUsed: false,
    secretsExposed: false,
  });
  const warmReceipts = [];
  const receipts = [];
  for (const pattern of plan.patterns) {
    if (warmFirst && hasModel(modelNames, APEX_LOCAL_AGENT_SPEED_MODEL.FAST)) {
      warmReceipts.push(await warmModel(baseUrl, timeoutMs, pattern));
    }
    for (const benchmarkCase of pattern.cases) {
      if (!hasModel(modelNames, benchmarkCase.model)) {
        receipts.push(Object.freeze({
          id: benchmarkCase.id,
          status: "skipped",
          reason: "model-not-installed",
          model: benchmarkCase.model,
          laneId: benchmarkCase.lane.laneId,
          numCtx: benchmarkCase.lane.numCtx,
          residencyPatternId: benchmarkCase.residencyPatternId,
          turnIndex: benchmarkCase.turnIndex,
          openAiUsed: false,
          cloudUsed: false,
        }));
        continue;
      }
      receipts.push(await runCase(baseUrl, benchmarkCase, timeoutMs));
    }
  }
  for (const benchmarkCase of plan.cases.filter((row) => row.residencyPatternId === "manual-extra")) {
    if (!hasModel(modelNames, benchmarkCase.model)) {
      receipts.push(Object.freeze({
        id: benchmarkCase.id,
        status: "skipped",
        reason: "model-not-installed",
        model: benchmarkCase.model,
        laneId: benchmarkCase.lane.laneId,
        numCtx: benchmarkCase.lane.numCtx,
        residencyPatternId: benchmarkCase.residencyPatternId,
        turnIndex: benchmarkCase.turnIndex,
        openAiUsed: false,
        cloudUsed: false,
      }));
      continue;
    }
    receipts.push(await runCase(baseUrl, benchmarkCase, timeoutMs));
  }
  const summary = buildApexLocalAgentBenchmarkHistorySummary({ receipts });
  const stableResidency = buildApexStableResidencyBenchmarkSummary({ receipts });
  const warmReceipt = warmReceipts[0] || warmSkippedReceipt;
  const result = Object.freeze({
    provider: "apex-local-agent-speed-benchmark",
    version: APEX_LOCAL_AGENT_SPEED_BENCHMARK_VERSION,
    baseUrl: "localhost-ollama",
    modelNames,
    include30b,
    includeFastCoder,
    warmFirst: Boolean(warmFirst),
    warmReceipt,
    warmReceipts: Object.freeze(warmReceipts),
    caseCount: plan.cases.length,
    receipts,
    summary,
    stableResidency,
    chosenResidentLane: stableResidency.chosenResidentLane,
    chosenResidentNumCtx: stableResidency.chosenResidentNumCtx,
    openAiUsed: false,
    cloudUsed: false,
    outputFile: write ? await writeReceipts({ plan, receipts, summary }) : "",
  });
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = parseApexLocalAgentSpeedBenchmarkArgs(process.argv.slice(2));
  runApexLocalAgentSpeedBenchmark(args)
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
    })
    .catch((error) => {
      console.error(JSON.stringify({
        provider: "apex-local-agent-speed-benchmark",
        status: "failed",
        reason: error?.name === "AbortError" ? "ollama-benchmark-timeout" : "ollama-benchmark-failed",
        message: error?.message || "Benchmark failed.",
        openAiUsed: false,
        cloudUsed: false,
      }, null, 2));
      process.exitCode = 1;
    });
}
