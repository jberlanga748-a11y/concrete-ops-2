import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";

import {
  APEX_LOCAL_AGENT_EFFORT_ID,
  buildApexLocalAgentBenchmarkReceipt,
  selectApexLocalAgentSpeedLane,
} from "../shared/apexLocalAgentSpeed.js";
import {
  APEX_OLLAMA_PROVIDER_STATUS,
  parseOllamaApexOsAskPayload,
} from "./apexOllamaProvider.js";

export const APEX_LLAMA_CPP_ENV = Object.freeze({
  BASE_URL: "APEX_LLAMA_CPP_BASE_URL",
  GPT_OSS_GGUF: "APEX_LLAMA_CPP_GPT_OSS_GGUF",
  QWEN3_4B_GGUF: "APEX_LLAMA_CPP_QWEN3_4B_GGUF",
  QWEN3_14B_GGUF: "APEX_LLAMA_CPP_QWEN3_14B_GGUF",
});

export const APEX_LLAMA_CPP_DEFAULT_BASE_URL = "http://127.0.0.1:8081";
export const APEX_LLAMA_CPP_PROVIDER = "llama.cpp";

export const APEX_LLAMA_CPP_MODEL_ID = Object.freeze({
  GPT_OSS_20B: "gpt-oss:20b",
  QWEN3_4B_INSTRUCT: "qwen3:4b-instruct",
  QWEN3_14B: "qwen3:14b",
});

const PRIVATE_CONFIG = Symbol("llamaCppPrivateConfig");
const SHORT_LIMIT = 180;
const DEFAULT_TIMEOUT_MS = 1200;
const DEFAULT_CHAT_TIMEOUT_MS = 60_000;
const MAX_OUTPUT_TOKENS = 2400;
const LOCAL_HOSTNAMES = Object.freeze(new Set(["127.0.0.1", "localhost", "::1", "[::1]"]));

const DEFAULT_LLAMA_CPP_MODELS = Object.freeze({
  [APEX_LLAMA_CPP_MODEL_ID.GPT_OSS_20B]: Object.freeze({
    model: APEX_LLAMA_CPP_MODEL_ID.GPT_OSS_20B,
    label: "GPT-OSS 20B",
    adapter: "harmony",
    envPath: APEX_LLAMA_CPP_ENV.GPT_OSS_GGUF,
    manualOnly: false,
    effortIds: Object.freeze(Object.values(APEX_LOCAL_AGENT_EFFORT_ID)),
    defaultPaths: Object.freeze([
      path.join(os.homedir(), ".cache", "huggingface", "hub", "models--ggml-org--gpt-oss-20b-GGUF", "snapshots", "e1dc459feff949ff451ce107337a2026daa80df8", "gpt-oss-20b-mxfp4.gguf"),
    ]),
    stop: Object.freeze(["<|end|>", "<|start|>"]),
  }),
  [APEX_LLAMA_CPP_MODEL_ID.QWEN3_4B_INSTRUCT]: Object.freeze({
    model: APEX_LLAMA_CPP_MODEL_ID.QWEN3_4B_INSTRUCT,
    label: "Qwen3 4B Instruct",
    adapter: "chatml",
    envPath: APEX_LLAMA_CPP_ENV.QWEN3_4B_GGUF,
    manualOnly: true,
    effortIds: Object.freeze([]),
    defaultPaths: Object.freeze([
      path.join(os.homedir(), ".ollama", "models", "blobs", "sha256-85e4a5b7b8ef0e48af0e8658f5aaab9c2324c76c1641493f4d1e25fce54b18b9"),
    ]),
    stop: Object.freeze(["<|im_end|>", "<|im_start|>"]),
  }),
  [APEX_LLAMA_CPP_MODEL_ID.QWEN3_14B]: Object.freeze({
    model: APEX_LLAMA_CPP_MODEL_ID.QWEN3_14B,
    label: "Qwen3 14B",
    adapter: "chatml",
    envPath: APEX_LLAMA_CPP_ENV.QWEN3_14B_GGUF,
    manualOnly: true,
    effortIds: Object.freeze([]),
    defaultPaths: Object.freeze([
      path.join(os.homedir(), ".ollama", "models", "blobs", "sha256-a8cc1361f3145dc01f6d77c6c82c9116b9ffe3c97b34716fe20418455876c40e"),
    ]),
    stop: Object.freeze(["<|im_end|>", "<|im_start|>"]),
  }),
});

export function getLlamaCppModelFileStatus(input = {}) {
  const model = text(input.model || APEX_LLAMA_CPP_MODEL_ID.GPT_OSS_20B, 160);
  const spec = DEFAULT_LLAMA_CPP_MODELS[model] || DEFAULT_LLAMA_CPP_MODELS[APEX_LLAMA_CPP_MODEL_ID.GPT_OSS_20B];
  return resolveModelFile(spec, input.env || process.env || {});
}

function text(value = "", limit = SHORT_LIMIT) {
  return String(value ?? "").replace(/\s+\n/g, "\n").replace(/\s+/g, " ").trim().slice(0, limit);
}

function safeNumber(value = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function parseTimeoutMs(value = DEFAULT_TIMEOUT_MS) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_TIMEOUT_MS;
  return Math.max(50, Math.min(10_000, Math.round(parsed)));
}

function parseChatTimeoutMs(value = DEFAULT_CHAT_TIMEOUT_MS) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_CHAT_TIMEOUT_MS;
  return Math.max(1000, Math.min(180_000, Math.round(parsed)));
}

function safeOutputTokens(value = 900) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 900;
  return Math.max(80, Math.min(MAX_OUTPUT_TOKENS, Math.round(parsed)));
}

async function sleepMs(ms = 0) {
  await new Promise((resolve) => setTimeout(resolve, Math.max(0, Number(ms) || 0)));
}

async function readHttpErrorHint(response) {
  try {
    const body = await response.text();
    return text(body, 360);
  } catch {
    return "";
  }
}

function isLoopbackHostname(hostname = "") {
  const normalized = String(hostname || "").trim().toLowerCase();
  if (LOCAL_HOSTNAMES.has(normalized)) return true;
  if (/^127(?:\.\d{1,3}){3}$/.test(normalized)) return true;
  return false;
}

function blockedStatus(reason = "", config = null, extra = {}) {
  return Object.freeze({
    provider: APEX_LLAMA_CPP_PROVIDER,
    status: extra.status || APEX_OLLAMA_PROVIDER_STATUS.BLOCKED,
    available: false,
    reason: text(reason || "llama-cpp-provider-blocked"),
    configured: Boolean(config?.configured),
    baseUrlConfigured: Boolean(config?.baseUrlConfigured),
    baseUrlValid: Boolean(config?.baseUrlValid),
    baseUrlIsLocal: Boolean(config?.baseUrlIsLocal),
    models: Object.freeze([]),
    modelCount: 0,
    loadedModelKnown: false,
    loadedModel: null,
    readOnly: true,
    healthCheckOnly: true,
    promptSent: false,
    completionCalled: false,
    chatCalled: false,
    canGenerateNow: false,
    canChatNow: false,
    canExecuteNow: false,
    noPromptBody: true,
    baseUrlExposed: false,
    tokenExposed: false,
    secretsExposed: false,
    openAiUsed: false,
    cloudUsed: false,
    ...extra,
  });
}

export function readLlamaCppProviderConfig(input = {}) {
  const env = input.env || process.env || {};
  const rawBaseUrl = input.baseUrl || env[APEX_LLAMA_CPP_ENV.BASE_URL] || APEX_LLAMA_CPP_DEFAULT_BASE_URL;
  const configured = Boolean(String(rawBaseUrl || "").trim());
  const baseUrlConfigured = Boolean(env[APEX_LLAMA_CPP_ENV.BASE_URL] || input.baseUrl);
  const disabledReasons = [];
  let baseUrlValid = false;
  let baseUrlIsLocal = false;
  let normalizedUrl = "";

  try {
    const parsed = new URL(String(rawBaseUrl || "").trim());
    baseUrlValid = parsed.protocol === "http:" && !parsed.username && !parsed.password;
    baseUrlIsLocal = baseUrlValid && isLoopbackHostname(parsed.hostname);
    if (!baseUrlValid) disabledReasons.push("llama-cpp-base-url-invalid");
    if (baseUrlValid && !baseUrlIsLocal) disabledReasons.push("llama-cpp-non-local-url-blocked");
    normalizedUrl = baseUrlValid ? parsed.origin : "";
  } catch {
    disabledReasons.push("llama-cpp-base-url-invalid");
  }

  return Object.freeze({
    provider: APEX_LLAMA_CPP_PROVIDER,
    configured,
    baseUrlConfigured,
    baseUrlValid,
    baseUrlIsLocal,
    disabledReasons: Object.freeze([...new Set(disabledReasons)]),
    requestTimeoutMs: parseTimeoutMs(input.timeoutMs || env.APEX_LLAMA_CPP_REQUEST_TIMEOUT_MS || DEFAULT_TIMEOUT_MS),
    chatTimeoutMs: parseChatTimeoutMs(input.chatTimeoutMs || env.APEX_LLAMA_CPP_CHAT_TIMEOUT_MS || DEFAULT_CHAT_TIMEOUT_MS),
    baseUrlExposed: false,
    tokenExposed: false,
    secretsExposed: false,
    [PRIVATE_CONFIG]: Object.freeze({
      baseUrl: normalizedUrl,
    }),
  });
}

function resolveModelFile(spec = {}, env = process.env || {}) {
  const configuredPath = text(env[spec.envPath] || "", 600);
  const candidates = [
    configuredPath,
    ...(Array.isArray(spec.defaultPaths) ? spec.defaultPaths : []),
  ].filter(Boolean);
  const foundPath = candidates.find((candidate) => {
    try {
      return fs.existsSync(candidate);
    } catch {
      return false;
    }
  });
  return Object.freeze({
    model: spec.model,
    label: spec.label,
    adapter: spec.adapter,
    manualOnly: Boolean(spec.manualOnly),
    configuredPath: Boolean(configuredPath),
    fileAvailable: Boolean(foundPath),
    fileName: foundPath ? path.basename(foundPath) : "",
    resolvedPath: foundPath || configuredPath || "",
  });
}

function normalizePath(value = "") {
  if (!value) return "";
  try {
    return path.resolve(String(value)).toLowerCase();
  } catch {
    return String(value || "").trim().toLowerCase();
  }
}

function detectLoadedModel(propsPayload = {}, modelFiles = []) {
  const loadedPath = text(
    propsPayload.model_path
      || propsPayload.modelPath
      || propsPayload.model
      || propsPayload.default_generation_settings?.model
      || "",
    600,
  );
  const normalizedLoadedPath = normalizePath(loadedPath);
  const matched = normalizedLoadedPath
    ? modelFiles.find((modelFile) => modelFile.resolvedPath && normalizePath(modelFile.resolvedPath) === normalizedLoadedPath)
    : null;
  if (matched) {
    return Object.freeze({
      known: true,
      model: matched.model,
      label: matched.label,
      adapter: matched.adapter,
      fileName: matched.fileName,
      matchedKnownFile: true,
    });
  }
  const alias = text(propsPayload.model_alias || propsPayload.modelAlias || propsPayload.name || "", 160);
  return Object.freeze({
    known: Boolean(alias || loadedPath),
    model: alias,
    label: alias,
    adapter: "",
    fileName: loadedPath ? path.basename(loadedPath) : "",
    matchedKnownFile: false,
  });
}

async function fetchWithTimeout(fetchImpl, url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function readJsonIfOk(response) {
  if (!response?.ok) return null;
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function getLlamaCppProviderStatus(input = {}) {
  const config = input.connectorConfig?.provider === APEX_LLAMA_CPP_PROVIDER
    ? input.connectorConfig
    : readLlamaCppProviderConfig(input);

  if (!config.baseUrlValid) {
    return blockedStatus("llama-cpp-base-url-invalid", config, { status: APEX_OLLAMA_PROVIDER_STATUS.BLOCKED });
  }
  if (!config.baseUrlIsLocal) {
    return blockedStatus("llama-cpp-non-local-url-blocked", config, { status: APEX_OLLAMA_PROVIDER_STATUS.BLOCKED });
  }

  const env = input.env || process.env || {};
  const modelFiles = Object.values(DEFAULT_LLAMA_CPP_MODELS).map((spec) => resolveModelFile(spec, env));
  const fetchImpl = input.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    return blockedStatus("fetch-unavailable", config, {
      status: APEX_OLLAMA_PROVIDER_STATUS.ERROR,
      models: Object.freeze(modelFiles.map(publicModelFile)),
      modelCount: modelFiles.length,
    });
  }

  const privateConfig = config[PRIVATE_CONFIG] || {};
  try {
    const health = await fetchWithTimeout(fetchImpl, `${privateConfig.baseUrl}/health`, {
      method: "GET",
      headers: { Accept: "application/json" },
    }, config.requestTimeoutMs);
    if (!health?.ok) {
      return blockedStatus("llama-cpp-health-unavailable", config, {
        status: APEX_OLLAMA_PROVIDER_STATUS.UNAVAILABLE,
        httpStatus: Number(health?.status || 0) || 0,
        models: Object.freeze(modelFiles.map(publicModelFile)),
        modelCount: modelFiles.length,
      });
    }

    let propsPayload = null;
    try {
      const props = await fetchWithTimeout(fetchImpl, `${privateConfig.baseUrl}/props`, {
        method: "GET",
        headers: { Accept: "application/json" },
      }, config.requestTimeoutMs);
      propsPayload = await readJsonIfOk(props);
    } catch {
      propsPayload = null;
    }
    const loadedModel = detectLoadedModel(propsPayload || {}, modelFiles);
    const publicModels = modelFiles.map((modelFile) => publicModelFile({
      ...modelFile,
      loaded: Boolean(loadedModel.model && loadedModel.model === modelFile.model && loadedModel.matchedKnownFile),
    }));

    return Object.freeze({
      provider: APEX_LLAMA_CPP_PROVIDER,
      status: APEX_OLLAMA_PROVIDER_STATUS.AVAILABLE,
      available: true,
      reason: "llama-cpp-health-ok",
      configured: config.configured,
      baseUrlConfigured: config.baseUrlConfigured,
      baseUrlValid: config.baseUrlValid,
      baseUrlIsLocal: config.baseUrlIsLocal,
      models: Object.freeze(publicModels),
      modelCount: publicModels.length,
      modelNames: Object.freeze(publicModels.map((model) => model.model)),
      loadedModelKnown: Boolean(loadedModel.known),
      loadedModel: loadedModel.known ? Object.freeze({
        model: text(loadedModel.model, 160),
        label: text(loadedModel.label, 160),
        adapter: text(loadedModel.adapter, 80),
        fileName: text(loadedModel.fileName, 220),
        matchedKnownFile: Boolean(loadedModel.matchedKnownFile),
      }) : null,
      readOnly: true,
      healthCheckOnly: true,
      promptSent: false,
      completionCalled: false,
      chatCalled: false,
      canGenerateNow: true,
      canChatNow: true,
      canExecuteNow: false,
      noPromptBody: true,
      baseUrlExposed: false,
      tokenExposed: false,
      secretsExposed: false,
      openAiUsed: false,
      cloudUsed: false,
    });
  } catch (error) {
    return blockedStatus(error?.name === "AbortError" ? "llama-cpp-health-timeout" : "llama-cpp-unavailable", config, {
      status: APEX_OLLAMA_PROVIDER_STATUS.UNAVAILABLE,
      models: Object.freeze(modelFiles.map(publicModelFile)),
      modelCount: modelFiles.length,
    });
  }
}

function publicModelFile(modelFile = {}) {
  return Object.freeze({
    model: text(modelFile.model, 160),
    label: text(modelFile.label, 160),
    adapter: text(modelFile.adapter, 80),
    manualOnly: Boolean(modelFile.manualOnly),
    configuredPath: Boolean(modelFile.configuredPath),
    fileAvailable: Boolean(modelFile.fileAvailable),
    fileName: text(modelFile.fileName, 220),
    loaded: Boolean(modelFile.loaded),
  });
}

export function selectLlamaCppModelForApexLane(laneSelection = {}) {
  return DEFAULT_LLAMA_CPP_MODELS[APEX_LLAMA_CPP_MODEL_ID.GPT_OSS_20B];
}

export function isLlamaCppReadyForApexLane(input = {}) {
  const status = input.status?.provider === APEX_LLAMA_CPP_PROVIDER ? input.status : null;
  const spec = input.modelSpec || selectLlamaCppModelForApexLane(input.laneSelection || {});
  if (!status?.available || !spec) return false;
  const model = (Array.isArray(status.models) ? status.models : []).find((row) => row.model === spec.model);
  if (!model?.fileAvailable) return false;
  return Boolean(model.loaded && status.loadedModel?.matchedKnownFile);
}

function sanitizePromptText(value = "") {
  return String(value ?? "")
    .replace(/<\|/g, "< |")
    .replace(/\|>/g, "| >")
    .slice(0, 12_000);
}

function normalizedMessages(messages = []) {
  return (Array.isArray(messages) ? messages : [])
    .map((message) => {
      const role = text(message?.role || "user", 40).toLowerCase();
      const normalizedRole = ["system", "developer", "user", "assistant"].includes(role) ? role : "user";
      const content = sanitizePromptText(message?.content || "");
      return content ? Object.freeze({ role: normalizedRole, content }) : null;
    })
    .filter(Boolean)
    .slice(-16);
}

export function buildApexLlamaCppPrompt(input = {}) {
  const spec = input.modelSpec || DEFAULT_LLAMA_CPP_MODELS[input.model] || DEFAULT_LLAMA_CPP_MODELS[APEX_LLAMA_CPP_MODEL_ID.GPT_OSS_20B];
  const messages = normalizedMessages(input.messages);
  if (spec.adapter === "chatml") return buildChatMlPrompt(messages);
  return buildHarmonyPrompt(messages);
}

function buildHarmonyPrompt(messages = []) {
  const prepared = messages.length ? messages : [Object.freeze({ role: "user", content: "Answer directly." })];
  const hasSystem = prepared.some((message) => message.role === "system");
  const baseMessages = hasSystem
    ? prepared
    : [Object.freeze({ role: "system", content: "You are Apex running local-only through llama.cpp.\nReasoning: low\n# Valid channels: analysis, final\nChannel must be included for every message." }), ...prepared];
  const blocks = baseMessages.map((message) => {
    const content = message.role === "system" && !/Reasoning:/i.test(message.content)
      ? `${message.content}\nReasoning: low\n# Valid channels: analysis, final\nChannel must be included for every message.`
      : message.content;
    const role = message.role === "assistant" ? "assistant<|channel|>final" : message.role;
    return `<|start|>${role}<|message|>${content}<|end|>`;
  });
  blocks.push("<|start|>developer<|message|># Instructions\nAnswer only in the final channel. Return the exact response format requested by the prior messages. Do not include hidden reasoning.<|end|>");
  blocks.push("<|start|>assistant<|channel|>final<|message|>");
  return blocks.join("\n");
}

function buildChatMlPrompt(messages = []) {
  const prepared = messages.length ? messages : [Object.freeze({ role: "user", content: "Answer directly." })];
  const hasSystem = prepared.some((message) => message.role === "system");
  const baseMessages = hasSystem
    ? prepared
    : [Object.freeze({ role: "system", content: "You are Apex running local-only through llama.cpp. Answer directly and do not include hidden reasoning. /no_think" }), ...prepared];
  const blocks = baseMessages.map((message) => {
    const role = message.role === "developer" ? "system" : message.role;
    return `<|im_start|>${role}\n${message.content}<|im_end|>`;
  });
  blocks.push("<|im_start|>assistant\n");
  return blocks.join("\n");
}

function parseLlamaCppKnowledgePayload(responsePayload = {}) {
  const rawContent = String(responsePayload?.message?.content || responsePayload?.response || "").trim();
  if (!rawContent) throw new Error("llama-cpp-knowledge-summary-empty");

  let parsed = null;
  try {
    parsed = JSON.parse(rawContent);
  } catch {
    const start = rawContent.indexOf("{");
    const end = rawContent.lastIndexOf("}");
    if (start >= 0 && end > start) parsed = JSON.parse(rawContent.slice(start, end + 1));
  }
  if (!parsed || typeof parsed !== "object") throw new Error("llama-cpp-knowledge-json-malformed");

  const classifications = (Array.isArray(parsed.classifications) ? parsed.classifications : [])
    .map((row) => Object.freeze({
      title: text(row?.title, 180),
      sourceLabel: text(row?.sourceLabel, 180),
      category: text(row?.category, 80),
      confidenceLabel: text(row?.confidenceLabel, 40),
      reason: text(row?.reason, 260),
    }))
    .filter((row) => row.title)
    .slice(0, 8);
  const providerSummary = text(parsed.providerSummary || parsed.summary || parsed.answer || "", 900);
  if (!providerSummary && !classifications.length) throw new Error("llama-cpp-knowledge-summary-empty");

  return Object.freeze({
    ok: true,
    providerSummary,
    classifications: Object.freeze(classifications),
  });
}

async function readLlamaCppCompletionResponse(response, startedAt = performance.now()) {
  let firstTokenLatencyMs = 0;
  let content = "";
  if (!response.body || typeof response.body.getReader !== "function") {
    const payload = await response.json().catch(() => ({}));
    content = text(payload.content || payload.response || payload.choices?.[0]?.text || payload.choices?.[0]?.message?.content || "", 12_000);
    return Object.freeze({
      content,
      firstTokenLatencyMs: 0,
      firstTokenLatencyAvailable: false,
      firstTokenLatencyReason: "llama-cpp-non-stream-response",
    });
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || "";
    for (const raw of lines) {
      const line = raw.trim();
      if (!line || line === "data: [DONE]") continue;
      const jsonText = line.startsWith("data:") ? line.slice(5).trim() : line;
      try {
        const chunk = JSON.parse(jsonText);
        const piece = chunk.content || chunk.response || chunk.choices?.[0]?.text || chunk.choices?.[0]?.delta?.content || "";
        if (piece) {
          if (!firstTokenLatencyMs) firstTokenLatencyMs = Math.max(1, Math.round(performance.now() - startedAt));
          content += piece;
        }
      } catch {
        // Ignore partial non-JSON stream lines.
      }
    }
  }
  return Object.freeze({
    content: text(content, 12_000),
    firstTokenLatencyMs,
    firstTokenLatencyAvailable: Boolean(firstTokenLatencyMs),
    firstTokenLatencyReason: firstTokenLatencyMs ? "llama-cpp-stream-first-token" : "llama-cpp-stream-no-token",
  });
}

export async function chatWithLlamaCppForApexOs(input = {}) {
  const config = input.connectorConfig?.provider === APEX_LLAMA_CPP_PROVIDER
    ? input.connectorConfig
    : readLlamaCppProviderConfig(input);
  if (!config.baseUrlValid) return blockedStatus("llama-cpp-base-url-invalid", config);
  if (!config.baseUrlIsLocal) return blockedStatus("llama-cpp-non-local-url-blocked", config);

  const laneSelection = input.laneSelection?.provider === "apex-local-agent-speed"
    ? input.laneSelection
    : selectApexLocalAgentSpeedLane(input);
  const modelSpec = selectLlamaCppModelForApexLane(laneSelection);
  if (!modelSpec) {
    return blockedStatus("llama-cpp-manual-gpt-lane-required", config, {
      status: APEX_OLLAMA_PROVIDER_STATUS.BLOCKED,
    });
  }

  const fetchImpl = input.fetchImpl || globalThis.fetch;
  const providerStatus = input.providerStatus?.provider === APEX_LLAMA_CPP_PROVIDER
    ? input.providerStatus
    : await getLlamaCppProviderStatus({ ...input, connectorConfig: config, fetchImpl });
  if (!isLlamaCppReadyForApexLane({ status: providerStatus, laneSelection, modelSpec })) {
    return blockedStatus("llama-cpp-sidecar-not-ready-for-selected-lane", config, {
      status: APEX_OLLAMA_PROVIDER_STATUS.UNAVAILABLE,
      providerStatus,
    });
  }

  const privateConfig = config[PRIVATE_CONFIG] || {};
  const maxOutputTokens = safeOutputTokens(input.maxOutputTokens || laneSelection.maxOutputTokens);
  const request = Object.freeze({
    prompt: buildApexLlamaCppPrompt({
      modelSpec,
      messages: input.messages,
    }),
    stream: true,
    n_predict: Math.min(maxOutputTokens, laneSelection.maxOutputTokens || maxOutputTokens),
    temperature: laneSelection.effortId === APEX_LOCAL_AGENT_EFFORT_ID.REASONING ? 0.08 : 0.1,
    cache_prompt: true,
    stop: modelSpec.stop,
  });

  try {
    const startedAt = performance.now();
    let response = null;
    for (let attempt = 0; attempt < 6; attempt += 1) {
      response = await fetchWithTimeout(fetchImpl, `${privateConfig.baseUrl}/completion`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      }, config.chatTimeoutMs);
      if (response?.ok) break;
      if (attempt < 5) await sleepMs(500 * (attempt + 1));
    }
    if (!response?.ok) {
      const httpBodyHint = response ? await readHttpErrorHint(response) : "";
      return blockedStatus("llama-cpp-completion-request-failed", config, {
        status: APEX_OLLAMA_PROVIDER_STATUS.UNAVAILABLE,
        httpStatus: Number(response?.status || 0) || 0,
        httpBodyHint,
      });
    }
    const completion = await readLlamaCppCompletionResponse(response, startedAt);
    const responseTimingMs = Math.max(1, Math.round(performance.now() - startedAt));
    const responsePayload = {
      message: { content: completion.content },
      firstTokenLatencyMs: completion.firstTokenLatencyMs,
      firstTokenLatencyAvailable: completion.firstTokenLatencyAvailable,
      firstTokenLatencyReason: completion.firstTokenLatencyReason,
    };
    const parsePayload = typeof input.parsePayload === "function" ? input.parsePayload : parseOllamaApexOsAskPayload;
    const parsed = parsePayload(responsePayload);
    const timingStats = Object.freeze({
      totalDurationMs: responseTimingMs,
      loadDurationMs: 0,
      promptEvalDurationMs: 0,
      generationDurationMs: Math.max(0, responseTimingMs - completion.firstTokenLatencyMs),
      promptEvalCount: 0,
      generationEvalCount: 0,
      firstTokenLatencyMs: completion.firstTokenLatencyMs,
      firstTokenLatencyAvailable: completion.firstTokenLatencyAvailable,
      firstTokenLatencyReason: completion.firstTokenLatencyReason,
    });
    const benchmarkReceipt = buildApexLocalAgentBenchmarkReceipt({
      laneSelection,
      route: input.route || laneSelection.route || "manual-reasoning",
      modelUsed: modelSpec.model,
      timingStats,
      responseTimingMs,
    });

    return Object.freeze({
      ...parsed,
      provider: APEX_LLAMA_CPP_PROVIDER,
      status: APEX_OLLAMA_PROVIDER_STATUS.AVAILABLE,
      available: true,
      reason: "llama-cpp-completion-ok",
      providerConfigured: true,
      providerFallback: false,
      mode: input.responseMode || "local-llama-cpp-source-backed",
      model: modelSpec.model,
      modelUsed: modelSpec.model,
      modelAdapter: modelSpec.adapter,
      agentSpeed: laneSelection,
      agentSpeedLane: laneSelection.laneId,
      agentSpeedLabel: laneSelection.laneLabel,
      agentEffort: laneSelection.effortId,
      agentEffortLabel: laneSelection.effortLabel,
      effortModel: modelSpec.model,
      effortNumCtx: laneSelection.numCtx,
      effortManualOnly: Boolean(laneSelection.effortManualOnly || laneSelection.manualOnly || modelSpec.manualOnly),
      responseTimingMs,
      firstTokenLatencyMs: completion.firstTokenLatencyMs,
      benchmarkReceipt,
      modelProcessor: Object.freeze({
        provider: APEX_LLAMA_CPP_PROVIDER,
        model: modelSpec.model,
        processor: "gpu",
        responseTimingMs,
        firstTokenLatencyMs: completion.firstTokenLatencyMs,
        status: "completed",
        reason: "llama-cpp-completion-ok",
        openAiUsed: false,
        cloudUsed: false,
      }),
      sourceLabels: Object.freeze([...new Set(["llama.cpp local sidecar", ...(parsed.sourceLabels || [])])].slice(0, 8)),
      promptSent: true,
      completionCalled: true,
      chatCalled: false,
      noPromptBody: false,
      storesRawPrompt: false,
      storesRawResponse: false,
      baseUrlExposed: false,
      tokenExposed: false,
      secretsExposed: false,
      openAiUsed: false,
      cloudUsed: false,
      metadataSafeForTrace: true,
    });
  } catch (error) {
    return blockedStatus(error?.name === "AbortError" ? "llama-cpp-completion-timeout" : "llama-cpp-completion-unavailable", config, {
      status: APEX_OLLAMA_PROVIDER_STATUS.UNAVAILABLE,
    });
  }
}

export async function chatWithLlamaCppForApexOsKnowledge(input = {}) {
  return chatWithLlamaCppForApexOs({
    ...input,
    parsePayload: parseLlamaCppKnowledgePayload,
    responseMode: "local-llama-cpp-knowledge-summary",
  });
}
