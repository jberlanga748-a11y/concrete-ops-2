import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

import {
  APEX_LOCAL_AGENT_EFFORT_ID,
  APEX_LOCAL_AGENT_SPEED_CONTEXT,
  buildApexLocalAgentBenchmarkReceipt,
  buildApexLocalAgentSpeedOllamaOptions,
  parseOllamaTimingStats,
  selectApexLocalAgentSpeedLane,
} from "../shared/apexLocalAgentSpeed.js";
import {
  buildApexOllamaResidencyReceipt,
} from "../server/apexOllamaProvider.js";

const execFileAsync = promisify(execFile);

export const APEX_MOE_REASONING_BENCHMARK_VERSION = "apex-moe-reasoning-benchmark-v1-1";
export const APEX_MOE_REASONING_DEFAULT_BASE_URL = "http://127.0.0.1:11434";
export const APEX_MOE_REASONING_OUTPUT_ROOT = "apex-moe-reasoning-benchmark-v1-1";
export const APEX_MOE_REASONING_BASELINE_MODEL = "qwen3:14b";
export const APEX_MOE_REASONING_APPROVED_PULL_MODELS = Object.freeze([
  "gpt-oss:20b",
  "qwen3:30b-a3b",
]);

const QWEN_BASELINE_TOTAL_MS = 681;
const QWEN_BASELINE_FIRST_TOKEN_MS = 145;
const DEFAULT_CHAT_TIMEOUT_MS = 180_000;
const DEFAULT_PULL_TIMEOUT_MS = 45 * 60 * 1000;

const BENCHMARK_TASKS = Object.freeze([
  Object.freeze({
    id: "quick-status-voice",
    route: "normal-chat",
    text: "Give one compact Apex local speed status answer for voice.",
  }),
  Object.freeze({
    id: "reasoning-planning",
    route: "coding-analysis",
    text: "Choose between two safe local implementation plans and explain the tradeoff briefly.",
  }),
  Object.freeze({
    id: "local-coding-debug",
    route: "coding-analysis",
    text: "Explain a likely JavaScript state-loop bug and the safest focused validation.",
  }),
  Object.freeze({
    id: "long-context-summary",
    route: "source-summary",
    text: [
      "Summarize this compact local operator brief into priorities, risk, and next action.",
      "Apex is private, local-first, voice-driven, and must avoid cloud fallback, hidden mic capture, and broad UI redesign.",
      "The daily resident model should stay fast unless a manual reasoning or MoE lane proves enough quality and headroom.",
    ].join(" "),
  }),
]);

function text(value = "", limit = 300) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, limit);
}

function safeNumber(value = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function nsToMs(value = 0) {
  const parsed = safeNumber(value);
  return parsed ? Math.round(parsed / 1_000_000) : 0;
}

function hasModel(modelNames = [], model = "") {
  const target = text(model, 160).toLowerCase();
  return Boolean(target) && (Array.isArray(modelNames) ? modelNames : [])
    .some((name) => text(name, 160).toLowerCase() === target);
}

function nowStamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

export function parseApexMoeReasoningBenchmarkArgs(args = []) {
  const output = {
    baseUrl: process.env.APEX_OLLAMA_BASE_URL || APEX_MOE_REASONING_DEFAULT_BASE_URL,
    write: true,
    pullMissing: true,
    timeoutMs: DEFAULT_CHAT_TIMEOUT_MS,
    pullTimeoutMs: DEFAULT_PULL_TIMEOUT_MS,
    include16384: false,
    warmupBaseline: true,
    restoreBaselineResident: true,
  };
  for (let index = 0; index < args.length; index += 1) {
    const arg = String(args[index] || "");
    if (arg === "--no-write") output.write = false;
    else if (arg === "--write") output.write = true;
    else if (arg === "--skip-pull" || arg === "--no-pull") output.pullMissing = false;
    else if (arg === "--pull-missing") output.pullMissing = true;
    else if (arg === "--include-16384") output.include16384 = true;
    else if (arg === "--no-warmup") output.warmupBaseline = false;
    else if (arg === "--warmup") output.warmupBaseline = true;
    else if (arg === "--no-restore-baseline") output.restoreBaselineResident = false;
    else if (arg === "--restore-baseline") output.restoreBaselineResident = true;
    else if (arg === "--base-url") {
      output.baseUrl = String(args[index + 1] || output.baseUrl);
      index += 1;
    } else if (arg.startsWith("--base-url=")) output.baseUrl = arg.slice("--base-url=".length);
    else if (arg === "--timeout-ms") {
      output.timeoutMs = Math.max(1000, Math.round(safeNumber(args[index + 1]) || output.timeoutMs));
      index += 1;
    } else if (arg.startsWith("--timeout-ms=")) output.timeoutMs = Math.max(1000, Math.round(safeNumber(arg.slice("--timeout-ms=".length)) || output.timeoutMs));
    else if (arg === "--pull-timeout-ms") {
      output.pullTimeoutMs = Math.max(1000, Math.round(safeNumber(args[index + 1]) || output.pullTimeoutMs));
      index += 1;
    } else if (arg.startsWith("--pull-timeout-ms=")) output.pullTimeoutMs = Math.max(1000, Math.round(safeNumber(arg.slice("--pull-timeout-ms=".length)) || output.pullTimeoutMs));
  }
  return Object.freeze(output);
}

async function fetchJson(url, options = {}, timeoutMs = DEFAULT_CHAT_TIMEOUT_MS) {
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

async function readNvidiaVram() {
  try {
    const { stdout } = await execFileAsync("nvidia-smi", [
      "--query-gpu=memory.used,memory.total",
      "--format=csv,noheader,nounits",
    ], {
      timeout: 10_000,
      windowsHide: true,
      maxBuffer: 128 * 1024,
    });
    const firstLine = String(stdout || "").split(/\r?\n/).find(Boolean) || "";
    const [usedRaw, totalRaw] = firstLine.split(",").map((part) => Math.round(safeNumber(part)));
    const usedMb = Math.max(0, usedRaw || 0);
    const totalMb = Math.max(0, totalRaw || 0);
    return Object.freeze({
      provider: "nvidia-smi",
      status: totalMb ? "available" : "unavailable",
      usedMb,
      totalMb,
      freeMb: totalMb ? Math.max(0, totalMb - usedMb) : 0,
    });
  } catch (error) {
    return Object.freeze({
      provider: "nvidia-smi",
      status: "unavailable",
      reason: text(error?.message || "nvidia-smi-unavailable", 160),
      usedMb: 0,
      totalMb: 0,
      freeMb: 0,
    });
  }
}

async function pullApprovedModel(model, timeoutMs) {
  const startedAt = performance.now();
  try {
    await execFileAsync("ollama", ["pull", model], {
      timeout: Math.max(1000, Math.round(timeoutMs)),
      windowsHide: true,
      maxBuffer: 32 * 1024 * 1024,
    });
    return Object.freeze({
      model,
      status: "completed",
      reason: "ollama-pull-ok",
      durationMs: Math.max(1, Math.round(performance.now() - startedAt)),
      approvedPull: true,
    });
  } catch (error) {
    return Object.freeze({
      model,
      status: error?.killed || error?.signal ? "timeout" : "failed",
      reason: error?.killed || error?.signal ? "ollama-pull-timeout" : "ollama-pull-failed",
      durationMs: Math.max(1, Math.round(performance.now() - startedAt)),
      approvedPull: true,
      message: text(error?.message || "", 220),
    });
  }
}

function laneForCase({ effort, modelNames, numCtx, task }) {
  const lane = selectApexLocalAgentSpeedLane({
    effort,
    route: task.route,
    question: task.text,
    modelNames,
    requestedNumCtx: numCtx,
  });
  if (numCtx <= lane.numCtx) return lane;
  return Object.freeze({
    ...lane,
    numCtx,
    selectedNumCtx: numCtx,
    contextPolicy: Object.freeze({
      ...(lane.contextPolicy || {}),
      requestedNumCtx: numCtx,
      appliedNumCtx: numCtx,
      hardBlockedNumCtx: APEX_LOCAL_AGENT_SPEED_CONTEXT.HARD_BLOCK,
      oversizedContextBlocked: false,
      accidental32768Blocked: false,
    }),
  });
}

function benchmarkBodyForCase(benchmarkCase) {
  const options = buildApexLocalAgentSpeedOllamaOptions({
    laneSelection: benchmarkCase.lane,
    maxOutputTokens: benchmarkCase.lane.maxOutputTokens,
  });
  return Object.freeze({
    model: options.model,
    stream: true,
    think: false,
    keep_alive: options.keepAlive,
    messages: Object.freeze([
      Object.freeze({
        role: "system",
        content: "You are Apex running a private local-only benchmark. Return compact plain text.",
      }),
      Object.freeze({ role: "user", content: benchmarkCase.task.text }),
    ]),
    options: options.options,
  });
}

export function buildApexMoeReasoningBenchmarkPlan({ modelNames = [], include16384 = false } = {}) {
  const manualContexts = include16384
    ? [APEX_LOCAL_AGENT_SPEED_CONTEXT.CODING, APEX_LOCAL_AGENT_SPEED_CONTEXT.EFFORT, 16384]
    : [APEX_LOCAL_AGENT_SPEED_CONTEXT.CODING, APEX_LOCAL_AGENT_SPEED_CONTEXT.EFFORT];
  const efforts = Object.freeze([
    Object.freeze({ effort: APEX_LOCAL_AGENT_EFFORT_ID.NORMAL, contexts: [APEX_LOCAL_AGENT_SPEED_CONTEXT.CODING] }),
    Object.freeze({ effort: APEX_LOCAL_AGENT_EFFORT_ID.REASONING, contexts: manualContexts }),
    Object.freeze({ effort: APEX_LOCAL_AGENT_EFFORT_ID.MOE, contexts: manualContexts }),
  ]);
  const cases = efforts.flatMap((entry) => entry.contexts.flatMap((numCtx) => BENCHMARK_TASKS.map((task) => {
    const lane = laneForCase({ effort: entry.effort, modelNames, numCtx, task });
    const benchmarkCase = {
      id: `${entry.effort}-${numCtx}-${task.id}`,
      benchmarkType: "moe-reasoning-benchmark",
      effort: entry.effort,
      taskId: task.id,
      route: task.route,
      model: lane.modelId,
      numCtx: lane.numCtx,
      keepAlive: lane.keepAlive,
      lane,
      task,
      installed: hasModel(modelNames, lane.modelId),
    };
    return Object.freeze({
      ...benchmarkCase,
      body: benchmarkBodyForCase(benchmarkCase),
    });
  })));
  return Object.freeze({
    provider: "apex-moe-reasoning-benchmark",
    version: APEX_MOE_REASONING_BENCHMARK_VERSION,
    benchmarkType: "moe-reasoning-benchmark",
    approvedPullModels: APEX_MOE_REASONING_APPROVED_PULL_MODELS,
    taskIds: Object.freeze(BENCHMARK_TASKS.map((task) => task.id)),
    cases: Object.freeze(cases),
    includesCoder: false,
    no32768: true,
    openAiUsed: false,
    cloudUsed: false,
    rawPromptStored: false,
    rawResponseStored: false,
    rawAudioStored: false,
    secretsExposed: false,
  });
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
  return lines.length ? parseStreamLinePayloads(lines, firstTokenLatencyMs) : { message: { content: "" }, firstTokenLatencyMs: 0 };
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
  } catch {
    return buildApexOllamaResidencyReceipt({
      status: "unavailable",
      reason: "ollama-ps-unavailable",
      activeLane: benchmarkCase.lane.laneId,
      activeLaneNumCtx: benchmarkCase.lane.numCtx,
      targetModel: benchmarkCase.model,
      stableResidency: benchmarkCase.lane.stableResidency,
    });
  }
}

function buildSpillAssessment({ receipt = {}, vramAfter = {} } = {}) {
  const reasons = [];
  const model = text(receipt.modelUsed || receipt.selectedModel || "", 160).toLowerCase();
  const largeManualModel = /30b|20b|moe|gpt-oss/.test(model);
  if (largeManualModel && Number(receipt.loadDurationMs || 0) >= 8_000) reasons.push("large-load-duration");
  if (largeManualModel && Number(receipt.firstTokenLatencyMs || 0) >= 10_000) reasons.push("high-first-token-latency");
  if (largeManualModel && /tight|reload|spill/i.test(String(receipt.vramStatus || ""))) reasons.push(`residency-${receipt.vramStatus}`);
  if (largeManualModel && Number(vramAfter.freeMb || 0) > 0 && Number(vramAfter.freeMb || 0) < 1_200) reasons.push("low-free-vram-after");
  if (receipt.residencyReloadNeeded) reasons.push("ollama-residency-reload-needed");
  return Object.freeze({
    cpuSpillSuspected: reasons.length > 0,
    cpuSpillReason: reasons.length ? [...new Set(reasons)].join(",") : "no-spill-signal",
  });
}

function tokensPerSecond(receipt = {}) {
  const count = safeNumber(receipt.generationEvalCount);
  const durationMs = safeNumber(receipt.generationDurationMs);
  if (!count || !durationMs) return 0;
  return Math.round((count / (durationMs / 1000)) * 100) / 100;
}

async function runBenchmarkCase(baseUrl, benchmarkCase, timeoutMs) {
  const beforeResidency = await readBenchmarkResidency(baseUrl, benchmarkCase, timeoutMs);
  const vramBefore = await readNvidiaVram();
  const startedAt = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response = null;
  let payload = {};
  let wallMs = 0;
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
    wallMs = Math.max(1, Math.round(performance.now() - startedAt));
    if (!response.ok) {
      throw new Error(`ollama-chat-http-${response.status}`);
    }
  } catch (error) {
    wallMs = Math.max(1, Math.round(performance.now() - startedAt));
    const vramAfter = await readNvidiaVram();
    clearTimeout(timer);
    return Object.freeze({
      id: benchmarkCase.id,
      benchmarkType: "moe-reasoning-benchmark",
      status: error?.name === "AbortError" ? "timeout" : "failed",
      reason: error?.name === "AbortError" ? "ollama-chat-timeout" : text(error?.message || "ollama-chat-failed", 160),
      effortId: benchmarkCase.effort,
      taskId: benchmarkCase.taskId,
      route: benchmarkCase.route,
      model: benchmarkCase.model,
      modelUsed: benchmarkCase.model,
      numCtx: benchmarkCase.numCtx,
      keepAlive: benchmarkCase.keepAlive,
      totalDurationMs: wallMs,
      vramBefore,
      vramAfter,
      openAiUsed: false,
      cloudUsed: false,
      rawPromptStored: false,
      rawResponseStored: false,
      rawAudioStored: false,
      secretsExposed: false,
    });
  } finally {
    clearTimeout(timer);
  }
  const timingStats = parseOllamaTimingStats(payload);
  const residency = await readBenchmarkResidency(baseUrl, benchmarkCase, timeoutMs);
  const vramAfter = await readNvidiaVram();
  const receipt = buildApexLocalAgentBenchmarkReceipt({
    laneSelection: benchmarkCase.lane,
    route: benchmarkCase.route,
    modelUsed: benchmarkCase.model,
    responsePayload: payload,
    timingStats,
    responseTimingMs: wallMs,
    beforeResidency,
    residency,
  });
  const enriched = {
    ...receipt,
    id: benchmarkCase.id,
    benchmarkType: "moe-reasoning-benchmark",
    taskId: benchmarkCase.taskId,
    installed: true,
    knownWarmBaselineTotalMs: QWEN_BASELINE_TOTAL_MS,
    knownWarmBaselineFirstTokenMs: QWEN_BASELINE_FIRST_TOKEN_MS,
    loadOrReloadPenaltyMs: Math.round(safeNumber(receipt.loadDurationMs)),
    tokensPerSecond: tokensPerSecond(receipt),
    vramBefore,
    vramAfter,
    rawAudioStored: false,
  };
  return Object.freeze({
    ...enriched,
    ...buildSpillAssessment({ receipt: enriched, vramAfter }),
  });
}

function buildInstallStatus({ initialModelNames = [], finalModelNames = [], pullResults = [] } = {}) {
  const models = [
    APEX_MOE_REASONING_BASELINE_MODEL,
    ...APEX_MOE_REASONING_APPROVED_PULL_MODELS,
  ].map((model) => {
    const pull = pullResults.find((row) => text(row?.model || "", 160).toLowerCase() === model.toLowerCase()) || {};
    return Object.freeze({
      model,
      installedBefore: hasModel(initialModelNames, model),
      installedAfter: hasModel(finalModelNames, model),
      approvedForPull: APEX_MOE_REASONING_APPROVED_PULL_MODELS.includes(model),
      pullAttempted: Boolean(pull.status),
      pullStatus: text(pull.status || "", 80),
      pullDurationMs: Math.round(safeNumber(pull.durationMs)),
      reason: text(pull.reason || "", 160),
    });
  });
  return Object.freeze({
    provider: "apex-moe-reasoning-benchmark",
    receiptType: "model-install-status",
    version: APEX_MOE_REASONING_BENCHMARK_VERSION,
    status: models.some((row) => !row.installedAfter && row.model !== APEX_MOE_REASONING_BASELINE_MODEL)
      ? "candidate-missing"
      : "ready",
    approvedPullModels: APEX_MOE_REASONING_APPROVED_PULL_MODELS,
    models: Object.freeze(models),
    installedModelCount: finalModelNames.length,
    openAiUsed: false,
    cloudUsed: false,
    rawPromptStored: false,
    rawResponseStored: false,
    rawAudioStored: false,
    secretsExposed: false,
  });
}

function average(rows, field) {
  const values = rows.map((row) => safeNumber(row[field])).filter((value) => value > 0);
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
}

function groupKey(receipt) {
  return `${receipt.effortId || receipt.effort}:${receipt.modelUsed || receipt.model}:${receipt.numCtx}`;
}

function summarizeBenchmark(receipts = []) {
  const completed = receipts.filter((receipt) => receipt.status === "completed" && safeNumber(receipt.totalDurationMs) > 0);
  const groups = completed.reduce((acc, receipt) => {
    const key = groupKey(receipt);
    if (!acc[key]) acc[key] = [];
    acc[key].push(receipt);
    return acc;
  }, {});
  const rows = Object.entries(groups).map(([key, group]) => {
    const fastest = group.reduce((best, row) => (!best || safeNumber(row.totalDurationMs) < safeNumber(best.totalDurationMs) ? row : best), null);
    return Object.freeze({
      key,
      effortId: text(fastest?.effortId || fastest?.effort || "", 40),
      model: text(fastest?.modelUsed || fastest?.model || "", 160),
      numCtx: Math.round(safeNumber(fastest?.numCtx)),
      taskCount: group.length,
      averageTotalDurationMs: average(group, "totalDurationMs"),
      averageFirstTokenLatencyMs: average(group, "firstTokenLatencyMs"),
      averageLoadDurationMs: average(group, "loadDurationMs"),
      averagePromptEvalDurationMs: average(group, "promptEvalDurationMs"),
      averageGenerationDurationMs: average(group, "generationDurationMs"),
      averageTokensPerSecond: average(group, "tokensPerSecond"),
      fastestTotalDurationMs: Math.round(safeNumber(fastest?.totalDurationMs)),
      fastestFirstTokenLatencyMs: Math.round(safeNumber(fastest?.firstTokenLatencyMs)),
      cpuSpillSuspected: group.some((row) => row.cpuSpillSuspected || row.reloadOrSpillSuspected),
      spillReasons: Object.freeze([...new Set(group.map((row) => row.cpuSpillReason).filter(Boolean))]),
      vramStatus: text(fastest?.vramStatus || "", 80),
    });
  }).sort((left, right) => (
    left.effortId === right.effortId
      ? left.numCtx - right.numCtx
      : ["normal", "reasoning", "moe"].indexOf(left.effortId) - ["normal", "reasoning", "moe"].indexOf(right.effortId)
  ));
  const candidates = rows.filter((row) => ["reasoning", "moe"].includes(row.effortId));
  const healthyCandidates = candidates.filter((row) => !row.cpuSpillSuspected && row.averageTotalDurationMs && row.averageFirstTokenLatencyMs <= 5_000);
  const bestReasoning = rows.filter((row) => row.effortId === "reasoning")
    .sort((a, b) => (a.cpuSpillSuspected - b.cpuSpillSuspected) || a.averageTotalDurationMs - b.averageTotalDurationMs)[0] || null;
  const bestMoe = rows.filter((row) => row.effortId === "moe")
    .sort((a, b) => (a.cpuSpillSuspected - b.cpuSpillSuspected) || a.averageTotalDurationMs - b.averageTotalDurationMs)[0] || null;
  const maxSafeContext = healthyCandidates.reduce((max, row) => Math.max(max, row.numCtx), APEX_LOCAL_AGENT_SPEED_CONTEXT.CODING);
  return Object.freeze({
    provider: "apex-moe-reasoning-benchmark",
    receiptType: "moe-reasoning-benchmark-summary",
    version: APEX_MOE_REASONING_BENCHMARK_VERSION,
    status: rows.length ? "ready" : "empty",
    knownWarmBaseline: Object.freeze({
      model: APEX_MOE_REASONING_BASELINE_MODEL,
      numCtx: APEX_LOCAL_AGENT_SPEED_CONTEXT.CODING,
      totalDurationMs: QWEN_BASELINE_TOTAL_MS,
      firstTokenLatencyMs: QWEN_BASELINE_FIRST_TOKEN_MS,
    }),
    rows: Object.freeze(rows),
    bestReasoning,
    bestMoe,
    recommendedDailyDefault: Object.freeze({
      effort: "fast-normal",
      model: APEX_MOE_REASONING_BASELINE_MODEL,
      numCtx: APEX_LOCAL_AGENT_SPEED_CONTEXT.CODING,
      reason: "qwen3-14b-remains-the-proven-low-latency-stable-resident-lane",
    }),
    maxSafeContext,
    warmRecommendation: Object.freeze({
      reasoningShouldWarm: false,
      moeShouldWarm: false,
      reason: "manual-lanes-require-quality-review-and-must-not-auto-warm-30b-or-MoE-by-default",
    }),
    manualOnly: Object.freeze({
      reasoning: true,
      moe: true,
      coder30b: true,
    }),
    no30BAutoWarm: true,
    no32768: true,
    noCloudFallback: true,
    openAiUsed: false,
    cloudUsed: false,
    rawPromptStored: false,
    rawResponseStored: false,
    rawAudioStored: false,
    secretsExposed: false,
  });
}

async function writeBenchmarkResult(result) {
  const folder = path.join(process.cwd(), "outputs", APEX_MOE_REASONING_OUTPUT_ROOT, nowStamp());
  await fs.mkdir(folder, { recursive: true });
  await fs.writeFile(path.join(folder, "summary.json"), `${JSON.stringify(result.summary, null, 2)}\n`, "utf8");
  await fs.writeFile(path.join(folder, "install-status.json"), `${JSON.stringify(result.installStatus, null, 2)}\n`, "utf8");
  await fs.writeFile(path.join(folder, "pull-results.json"), `${JSON.stringify(result.pullResults, null, 2)}\n`, "utf8");
  await fs.writeFile(path.join(folder, "receipts.jsonl"), `${result.receipts.map((receipt) => JSON.stringify(receipt)).join("\n")}\n`, "utf8");
  return folder;
}

async function runCaseAsMetadata(runCase, baseUrl, benchmarkCase, timeoutMs, label) {
  try {
    const receipt = await runCase(baseUrl, benchmarkCase, timeoutMs);
    return Object.freeze({
      label,
      status: receipt.status || "completed",
      model: benchmarkCase.model,
      numCtx: benchmarkCase.numCtx,
      totalDurationMs: Math.round(safeNumber(receipt.totalDurationMs)),
      firstTokenLatencyMs: Math.round(safeNumber(receipt.firstTokenLatencyMs)),
      rawPromptStored: false,
      rawResponseStored: false,
      rawAudioStored: false,
      openAiUsed: false,
      cloudUsed: false,
    });
  } catch (error) {
    return Object.freeze({
      label,
      status: "failed",
      reason: text(error?.message || "warmup-failed", 160),
      rawPromptStored: false,
      rawResponseStored: false,
      rawAudioStored: false,
      openAiUsed: false,
      cloudUsed: false,
    });
  }
}

export async function runApexMoeReasoningBenchmark({
  baseUrl = APEX_MOE_REASONING_DEFAULT_BASE_URL,
  write = true,
  pullMissing = true,
  timeoutMs = DEFAULT_CHAT_TIMEOUT_MS,
  pullTimeoutMs = DEFAULT_PULL_TIMEOUT_MS,
  include16384 = false,
  warmupBaseline = true,
  restoreBaselineResident = true,
  fetchModelNames = readModelNames,
  pullModel = pullApprovedModel,
  runCase = runBenchmarkCase,
} = {}) {
  const initialModelNames = await fetchModelNames(baseUrl, timeoutMs);
  const missingApproved = APEX_MOE_REASONING_APPROVED_PULL_MODELS
    .filter((model) => !hasModel(initialModelNames, model));
  const pullResults = [];
  if (pullMissing) {
    for (const model of missingApproved) {
      pullResults.push(await pullModel(model, pullTimeoutMs));
    }
  }
  const finalModelNames = pullMissing && missingApproved.length ? await fetchModelNames(baseUrl, timeoutMs) : initialModelNames;
  const installStatus = buildInstallStatus({ initialModelNames, finalModelNames, pullResults });
  const plan = buildApexMoeReasoningBenchmarkPlan({ modelNames: finalModelNames, include16384 });
  const baselineWarmupCase = plan.cases.find((row) => row.effort === APEX_LOCAL_AGENT_EFFORT_ID.NORMAL && row.taskId === "quick-status-voice");
  const baselineWarmup = warmupBaseline && baselineWarmupCase && hasModel(finalModelNames, baselineWarmupCase.model)
    ? await runCaseAsMetadata(runCase, baseUrl, { ...baselineWarmupCase, id: "warmup-qwen3-14b-4096" }, timeoutMs, "baseline-warmup")
    : Object.freeze({ label: "baseline-warmup", status: "skipped", reason: "baseline-not-installed-or-disabled" });
  const receipts = [];
  for (const benchmarkCase of plan.cases) {
    if (!hasModel(finalModelNames, benchmarkCase.model)) {
      receipts.push(Object.freeze({
        id: benchmarkCase.id,
        benchmarkType: "moe-reasoning-benchmark",
        status: "skipped",
        reason: "model-not-installed",
        effortId: benchmarkCase.effort,
        taskId: benchmarkCase.taskId,
        route: benchmarkCase.route,
        model: benchmarkCase.model,
        modelUsed: benchmarkCase.model,
        numCtx: benchmarkCase.numCtx,
        keepAlive: benchmarkCase.keepAlive,
        openAiUsed: false,
        cloudUsed: false,
        rawPromptStored: false,
        rawResponseStored: false,
        rawAudioStored: false,
        secretsExposed: false,
      }));
      continue;
    }
    receipts.push(await runCase(baseUrl, benchmarkCase, timeoutMs));
  }
  const baselineRestoreCase = baselineWarmupCase && hasModel(finalModelNames, baselineWarmupCase.model)
    ? { ...baselineWarmupCase, id: "restore-qwen3-14b-4096" }
    : null;
  const baselineRestore = restoreBaselineResident && baselineRestoreCase
    ? await runCaseAsMetadata(runCase, baseUrl, baselineRestoreCase, timeoutMs, "baseline-restore")
    : Object.freeze({ label: "baseline-restore", status: "skipped", reason: "restore-disabled-or-baseline-missing" });
  const summary = summarizeBenchmark(receipts);
  const result = {
    provider: "apex-moe-reasoning-benchmark",
    version: APEX_MOE_REASONING_BENCHMARK_VERSION,
    benchmarkType: "moe-reasoning-benchmark",
    baseUrl: "localhost-ollama",
    approvedPullModels: APEX_MOE_REASONING_APPROVED_PULL_MODELS,
    pullMissing: Boolean(pullMissing),
    pullTimeoutMs: Math.round(safeNumber(pullTimeoutMs)),
    timeoutMs: Math.round(safeNumber(timeoutMs)),
    include16384: Boolean(include16384),
    initialModelNames: Object.freeze(initialModelNames.map((model) => text(model, 160))),
    finalModelNames: Object.freeze(finalModelNames.map((model) => text(model, 160))),
    pullResults: Object.freeze(pullResults),
    installStatus,
    baselineWarmup,
    baselineRestore,
    caseCount: plan.cases.length,
    receipts: Object.freeze(receipts),
    summary,
    includesCoder: false,
    no30BAutoWarm: true,
    no32768: true,
    openAiUsed: false,
    cloudUsed: false,
    rawPromptStored: false,
    rawResponseStored: false,
    rawAudioStored: false,
    secretsExposed: false,
  };
  const outputFolder = write ? await writeBenchmarkResult(result) : "";
  return Object.freeze({ ...result, outputFolder });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = parseApexMoeReasoningBenchmarkArgs(process.argv.slice(2));
  runApexMoeReasoningBenchmark(args)
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
    })
    .catch((error) => {
      console.error(JSON.stringify({
        provider: "apex-moe-reasoning-benchmark",
        status: "failed",
        reason: error?.name === "AbortError" ? "ollama-moe-reasoning-benchmark-timeout" : "ollama-moe-reasoning-benchmark-failed",
        message: text(error?.message || "Benchmark failed.", 260),
        openAiUsed: false,
        cloudUsed: false,
        rawPromptStored: false,
        rawResponseStored: false,
        rawAudioStored: false,
      }, null, 2));
      process.exitCode = 1;
    });
}
