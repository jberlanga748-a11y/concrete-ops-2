import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

import {
  APEX_LOCAL_AGENT_EFFORT_APPROVED_PULL_MODELS,
  APEX_LOCAL_AGENT_EFFORT_ID,
  APEX_LOCAL_AGENT_EFFORT_MODEL,
  APEX_LOCAL_AGENT_EFFORT_VERSION,
  APEX_LOCAL_AGENT_SPEED_CONTEXT,
  buildApexEffortModelBenchmarkSummary,
  buildApexEffortModelInstallStatus,
  buildApexLocalAgentBenchmarkReceipt,
  buildApexLocalAgentSpeedOllamaOptions,
  parseOllamaTimingStats,
  selectApexLocalAgentSpeedLane,
} from "../shared/apexLocalAgentSpeed.js";
import {
  buildApexOllamaResidencyReceipt,
} from "../server/apexOllamaProvider.js";

const execFileAsync = promisify(execFile);

export const APEX_EFFORT_MODEL_LANE_BENCHMARK_VERSION = APEX_LOCAL_AGENT_EFFORT_VERSION;
export const APEX_EFFORT_MODEL_LANE_DEFAULT_BASE_URL = "http://127.0.0.1:11434";

const BENCHMARK_PROMPTS = Object.freeze({
  fast: Object.freeze({ id: "fast-status", route: "normal-chat", text: "Answer in one short sentence with current local speed posture." }),
  normal: Object.freeze({ id: "normal-coding", route: "coding-analysis", text: "Summarize the safest local code-review plan in three compact bullets." }),
  reasoning: Object.freeze({ id: "reasoning-plan", route: "coding-analysis", text: "Compare two local implementation choices and choose one with a short reason." }),
  moe: Object.freeze({ id: "moe-plan", route: "coding-analysis", text: "Draft a compact local debugging plan with risks and validation." }),
  coder: Object.freeze({ id: "coder-fix", route: "coding-analysis", text: "Explain a small JavaScript guard-clause fix and one focused test." }),
  deep: Object.freeze({ id: "deep-choice", route: "coding-analysis", text: "Choose the safest local deep-analysis model lane from compact timing evidence." }),
});

function text(value = "", limit = 300) {
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

export function parseApexEffortModelLaneBenchmarkArgs(args = []) {
  const output = {
    baseUrl: process.env.APEX_OLLAMA_BASE_URL || APEX_EFFORT_MODEL_LANE_DEFAULT_BASE_URL,
    write: true,
    pullMissing: true,
    timeoutMs: 120_000,
    pullTimeoutMs: 180_000,
    include16384: false,
  };
  for (let index = 0; index < args.length; index += 1) {
    const arg = String(args[index] || "");
    if (arg === "--no-write") output.write = false;
    else if (arg === "--write") output.write = true;
    else if (arg === "--skip-pull" || arg === "--no-pull") output.pullMissing = false;
    else if (arg === "--pull-missing") output.pullMissing = true;
    else if (arg === "--include-16384") output.include16384 = true;
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

async function pullApprovedModel(model, timeoutMs) {
  const startedAt = performance.now();
  try {
    await execFileAsync("ollama", ["pull", model], {
      timeout: Math.max(1000, Math.round(timeoutMs)),
      windowsHide: true,
      maxBuffer: 1024 * 1024,
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

export function buildApexEffortModelLaneBenchmarkPlan({ modelNames = [], include16384 = false } = {}) {
  const contextChoices = include16384
    ? [APEX_LOCAL_AGENT_SPEED_CONTEXT.CODING, APEX_LOCAL_AGENT_SPEED_CONTEXT.EFFORT, 16384]
    : [APEX_LOCAL_AGENT_SPEED_CONTEXT.CODING, APEX_LOCAL_AGENT_SPEED_CONTEXT.EFFORT];
  const efforts = [
    APEX_LOCAL_AGENT_EFFORT_ID.FAST,
    APEX_LOCAL_AGENT_EFFORT_ID.NORMAL,
    APEX_LOCAL_AGENT_EFFORT_ID.REASONING,
    APEX_LOCAL_AGENT_EFFORT_ID.MOE,
    APEX_LOCAL_AGENT_EFFORT_ID.CODER,
  ];
  const cases = efforts.flatMap((effort) => {
    const model = APEX_LOCAL_AGENT_EFFORT_MODEL[effort];
    const prompt = BENCHMARK_PROMPTS[effort] || BENCHMARK_PROMPTS.normal;
    const contexts = effort === APEX_LOCAL_AGENT_EFFORT_ID.FAST || effort === APEX_LOCAL_AGENT_EFFORT_ID.NORMAL
      ? [APEX_LOCAL_AGENT_SPEED_CONTEXT.CODING]
      : contextChoices;
    return contexts.map((numCtx) => {
      const lane = selectApexLocalAgentSpeedLane({
        effort,
        route: prompt.route,
        question: prompt.text,
        modelNames,
        requestedNumCtx: numCtx,
      });
      const options = buildApexLocalAgentSpeedOllamaOptions({ laneSelection: lane, maxOutputTokens: lane.maxOutputTokens });
      return Object.freeze({
        id: `${effort}-${numCtx}`,
        benchmarkType: "effort-model-lane",
        effort,
        promptId: prompt.id,
        route: prompt.route,
        model: options.model,
        numCtx: options.options.num_ctx,
        keepAlive: options.keepAlive,
        lane,
        installed: hasModel(modelNames, options.model),
        body: Object.freeze({
          model: options.model,
          stream: true,
          think: false,
          keep_alive: options.keepAlive,
          messages: Object.freeze([
            Object.freeze({ role: "system", content: "You are Apex running a private local-only effort benchmark. Return compact plain text." }),
            Object.freeze({ role: "user", content: prompt.text }),
          ]),
          options: options.options,
        }),
      });
    });
  });
  return Object.freeze({
    provider: "apex-effort-model-lane-benchmark",
    version: APEX_EFFORT_MODEL_LANE_BENCHMARK_VERSION,
    cases: Object.freeze(cases),
    approvedPullModels: APEX_LOCAL_AGENT_EFFORT_APPROVED_PULL_MODELS,
    openAiUsed: false,
    cloudUsed: false,
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

async function runBenchmarkCase(baseUrl, benchmarkCase, timeoutMs) {
  const beforeResidency = await readBenchmarkResidency(baseUrl, benchmarkCase, timeoutMs);
  const startedAt = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response;
  let payload;
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
  } finally {
    clearTimeout(timer);
  }
  if (!response.ok) {
    return Object.freeze({
      id: benchmarkCase.id,
      benchmarkType: "effort-model-lane",
      status: "failed",
      reason: `ollama-chat-http-${response.status}`,
      effortId: benchmarkCase.effort,
      model: benchmarkCase.model,
      numCtx: benchmarkCase.numCtx,
      totalDurationMs: wallMs,
      openAiUsed: false,
      cloudUsed: false,
      rawPromptStored: false,
      rawResponseStored: false,
      secretsExposed: false,
    });
  }
  const timingStats = parseOllamaTimingStats(payload);
  const residency = await readBenchmarkResidency(baseUrl, benchmarkCase, timeoutMs);
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
  return Object.freeze({
    ...receipt,
    id: benchmarkCase.id,
    benchmarkType: "effort-model-lane",
    promptId: benchmarkCase.promptId,
    installed: true,
  });
}

async function writeBenchmarkResult(result) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const folder = path.join(process.cwd(), "outputs", "apex-effort-model-lane-v1", stamp);
  await fs.mkdir(folder, { recursive: true });
  await fs.writeFile(path.join(folder, "summary.json"), `${JSON.stringify(result.summary, null, 2)}\n`, "utf8");
  await fs.writeFile(path.join(folder, "install-status.json"), `${JSON.stringify(result.installStatus, null, 2)}\n`, "utf8");
  await fs.writeFile(path.join(folder, "receipts.jsonl"), `${result.receipts.map((receipt) => JSON.stringify(receipt)).join("\n")}\n`, "utf8");
  return folder;
}

export async function runApexEffortModelLaneBenchmark({
  baseUrl = APEX_EFFORT_MODEL_LANE_DEFAULT_BASE_URL,
  write = true,
  pullMissing = true,
  timeoutMs = 120_000,
  pullTimeoutMs = 180_000,
  include16384 = false,
  fetchModelNames = readModelNames,
  pullModel = pullApprovedModel,
  runCase = runBenchmarkCase,
} = {}) {
  const initialModelNames = await fetchModelNames(baseUrl, timeoutMs);
  const missingApproved = APEX_LOCAL_AGENT_EFFORT_APPROVED_PULL_MODELS
    .filter((model) => !hasModel(initialModelNames, model));
  const pullResults = [];
  if (pullMissing) {
    for (const model of missingApproved) {
      pullResults.push(await pullModel(model, pullTimeoutMs));
    }
  }
  const modelNames = pullMissing && missingApproved.length ? await fetchModelNames(baseUrl, timeoutMs) : initialModelNames;
  const installStatus = buildApexEffortModelInstallStatus({ modelNames, pullResults });
  const plan = buildApexEffortModelLaneBenchmarkPlan({ modelNames, include16384 });
  const receipts = [];
  for (const benchmarkCase of plan.cases) {
    if (!hasModel(modelNames, benchmarkCase.model)) {
      receipts.push(Object.freeze({
        id: benchmarkCase.id,
        benchmarkType: "effort-model-lane",
        status: "skipped",
        reason: "model-not-installed",
        effortId: benchmarkCase.effort,
        model: benchmarkCase.model,
        numCtx: benchmarkCase.numCtx,
        openAiUsed: false,
        cloudUsed: false,
        rawPromptStored: false,
        rawResponseStored: false,
        secretsExposed: false,
      }));
      continue;
    }
    receipts.push(await runCase(baseUrl, benchmarkCase, timeoutMs));
  }
  const summary = buildApexEffortModelBenchmarkSummary({ receipts });
  const result = {
    provider: "apex-effort-model-lane-benchmark",
    version: APEX_EFFORT_MODEL_LANE_BENCHMARK_VERSION,
    baseUrl: "localhost-ollama",
    pullMissing: Boolean(pullMissing),
    pullResults: Object.freeze(pullResults),
    installStatus,
    caseCount: plan.cases.length,
    receipts: Object.freeze(receipts),
    summary,
    openAiUsed: false,
    cloudUsed: false,
    rawPromptStored: false,
    rawResponseStored: false,
    secretsExposed: false,
  };
  const outputFolder = write ? await writeBenchmarkResult(result) : "";
  return Object.freeze({ ...result, outputFolder });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = parseApexEffortModelLaneBenchmarkArgs(process.argv.slice(2));
  runApexEffortModelLaneBenchmark(args)
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
    })
    .catch((error) => {
      console.error(JSON.stringify({
        provider: "apex-effort-model-lane-benchmark",
        status: "failed",
        reason: error?.name === "AbortError" ? "ollama-effort-benchmark-timeout" : "ollama-effort-benchmark-failed",
        message: text(error?.message || "Benchmark failed.", 260),
        openAiUsed: false,
        cloudUsed: false,
      }, null, 2));
      process.exitCode = 1;
    });
}
