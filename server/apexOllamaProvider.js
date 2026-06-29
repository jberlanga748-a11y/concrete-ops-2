import { performance } from "node:perf_hooks";

import {
  buildOllamaModelProcessorReceipt,
} from "./apexGpuSpeedCore.js";
import {
  applyApexWorkstationDirectPersonaMessages,
  buildApexWorkstationBrainOllamaOptions,
  buildApexWorkstationBrainTelemetry,
  APEX_WORKSTATION_BRAIN_BALANCED_CTX,
  getApexWorkstationBrainRuntimeState,
  APEX_WORKSTATION_BRAIN_NORMAL_CTX,
  registerApexWorkstationBrainModelReceipt,
} from "../shared/apexWorkstationBrainMode.js";
import {
  buildApexLatencyProfile,
} from "../shared/apexVoiceTurnDiagnostics.js";
import {
  APEX_LOCAL_AGENT_SPEED_CONTEXT,
  APEX_LOCAL_AGENT_SPEED_KEEP_ALIVE,
  APEX_LOCAL_AGENT_SPEED_LANE_ID,
  buildApexStableResidencyPolicy,
  buildApexLocalAgentBenchmarkReceipt,
  buildApexLocalAgentSpeedOllamaOptions,
  selectApexLocalAgentSpeedLane,
} from "../shared/apexLocalAgentSpeed.js";

export const APEX_OLLAMA_ENV = Object.freeze({
  BASE_URL: "APEX_OLLAMA_BASE_URL",
});

export const APEX_OLLAMA_DEFAULT_BASE_URL = "http://127.0.0.1:11434";
export const APEX_OLLAMA_DEFAULT_CHAT_MODEL = "qwen3:14b";
export const APEX_OLLAMA_CODING_CHAT_MODEL = "qwen3-coder:30b";

export const APEX_OLLAMA_PROVIDER_STATUS = Object.freeze({
  AVAILABLE: "available",
  UNAVAILABLE: "unavailable",
  BLOCKED: "blocked",
  ERROR: "error",
});

const PRIVATE_CONFIG = Symbol("ollamaPrivateConfig");
const SHORT_LIMIT = 180;
const ASK_ANSWER_TEXT_LIMIT = 4000;
const DEFAULT_TIMEOUT_MS = 1200;
const DEFAULT_CHAT_TIMEOUT_MS = 60_000;
const DEFAULT_CHAT_MAX_OUTPUT_TOKENS = 900;
const DEFAULT_CHAT_STREAMING = true;
const MAX_CHAT_OUTPUT_TOKENS = 2400;
const MAX_MODELS = 100;
const APEX_OLLAMA_RESIDENCY_RELOAD_CONFIRMATION = "reload apex brain";
const ollamaRequestQueueState = {
  active: false,
  activeModel: "",
  activeMode: "",
  activeRoute: "",
  activeStartedAt: "",
  queuedCount: 0,
  lastQueuedMs: 0,
  lastReceipt: null,
};
let ollamaRequestQueueTail = Promise.resolve();

const LOCAL_HOSTNAMES = Object.freeze(new Set([
  "127.0.0.1",
  "localhost",
  "::1",
  "[::1]",
]));

function text(value = "", limit = SHORT_LIMIT) {
  return String(value ?? "").replace(/\s+\n/g, "\n").replace(/\s+/g, " ").trim().slice(0, limit);
}

function parseTimeoutMs(value = DEFAULT_TIMEOUT_MS) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_TIMEOUT_MS;
  return Math.max(50, Math.min(10_000, Math.round(parsed)));
}

function isLoopbackHostname(hostname = "") {
  const normalized = String(hostname || "").trim().toLowerCase();
  if (LOCAL_HOSTNAMES.has(normalized)) return true;
  if (/^127(?:\.\d{1,3}){3}$/.test(normalized)) return true;
  return false;
}

function normalizeModelName(value = "") {
  return text(value, 160)
    .replace(/[^a-zA-Z0-9._:@/-]+/g, "")
    .slice(0, 160);
}

function modelTagFromName(name = "") {
  const normalized = normalizeModelName(name);
  const parts = normalized.split(":");
  return parts.length > 1 ? parts.slice(1).join(":") : "latest";
}

function safeNumber(value = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function recommendedMissingModelHints(modelCount = 0) {
  if (modelCount > 0) {
    return Object.freeze([
      "Ollama is reachable as a legacy fallback/status provider. Ask Apex uses llama.cpp first when the primary sidecar is ready.",
    ]);
  }
  return Object.freeze([
    "Ollama is optional legacy fallback/status for Ask Apex; install it only if you still want the fallback path.",
    `Pull ${APEX_OLLAMA_DEFAULT_CHAT_MODEL} only for legacy fallback/status checks.`,
    `Pull ${APEX_OLLAMA_CODING_CHAT_MODEL} only for manual legacy deep Apex HQ coding work after the primary llama.cpp path works.`,
    "Apex OS will not download models automatically.",
  ]);
}

function safeChatTokenCap(value = DEFAULT_CHAT_MAX_OUTPUT_TOKENS) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_CHAT_MAX_OUTPUT_TOKENS;
  return Math.max(80, Math.min(MAX_CHAT_OUTPUT_TOKENS, Math.round(parsed)));
}

function parseChatTimeoutMs(value = DEFAULT_CHAT_TIMEOUT_MS) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_CHAT_TIMEOUT_MS;
  return Math.max(1000, Math.min(180_000, Math.round(parsed)));
}

function blockedStatus(reason = "", config = null, extra = {}) {
  const modelCount = Number(extra.modelCount || 0);
  return Object.freeze({
    provider: "ollama",
    status: extra.status || APEX_OLLAMA_PROVIDER_STATUS.BLOCKED,
    available: false,
    reason: text(reason || "ollama-provider-blocked"),
    configured: Boolean(config?.configured),
    baseUrlConfigured: Boolean(config?.baseUrlConfigured),
    baseUrlValid: Boolean(config?.baseUrlValid),
    baseUrlIsLocal: Boolean(config?.baseUrlIsLocal),
    modelCount,
    modelNames: Object.freeze([]),
    models: Object.freeze([]),
    recommendedMissingModelHints: recommendedMissingModelHints(modelCount),
    readOnly: true,
    healthCheckOnly: true,
    promptSent: false,
    chatCalled: false,
    generateCalled: false,
    canGenerateNow: false,
    canChatNow: false,
    canExecuteNow: false,
    noPromptBody: true,
    baseUrlExposed: false,
    tokenExposed: false,
    secretsExposed: false,
    ...extra,
  });
}

export function readOllamaProviderConfig(input = {}) {
  const env = input.env || process.env || {};
  const rawBaseUrl = input.baseUrl || env[APEX_OLLAMA_ENV.BASE_URL] || APEX_OLLAMA_DEFAULT_BASE_URL;
  const configured = Boolean(String(rawBaseUrl || "").trim());
  const baseUrlConfigured = Boolean(env[APEX_OLLAMA_ENV.BASE_URL] || input.baseUrl);
  const disabledReasons = [];
  let baseUrlValid = false;
  let baseUrlIsLocal = false;
  let normalizedUrl = "";

  try {
    const parsed = new URL(String(rawBaseUrl || "").trim());
    const hostname = parsed.hostname;
    baseUrlValid = parsed.protocol === "http:" && !parsed.username && !parsed.password;
    baseUrlIsLocal = baseUrlValid && isLoopbackHostname(hostname);
    if (!baseUrlValid) disabledReasons.push("ollama-base-url-invalid");
    if (baseUrlValid && !baseUrlIsLocal) disabledReasons.push("ollama-non-local-url-blocked");
    normalizedUrl = baseUrlValid ? parsed.origin : "";
  } catch {
    disabledReasons.push("ollama-base-url-invalid");
  }

  return Object.freeze({
    provider: "ollama",
    configured,
    baseUrlConfigured,
    baseUrlValid,
    baseUrlIsLocal,
    disabledReasons: Object.freeze([...new Set(disabledReasons)]),
    requestTimeoutMs: parseTimeoutMs(input.timeoutMs || env.APEX_OLLAMA_REQUEST_TIMEOUT_MS || DEFAULT_TIMEOUT_MS),
    chatTimeoutMs: parseChatTimeoutMs(input.chatTimeoutMs || env.APEX_OLLAMA_CHAT_TIMEOUT_MS || DEFAULT_CHAT_TIMEOUT_MS),
    baseUrlExposed: false,
    tokenExposed: false,
    secretsExposed: false,
    [PRIVATE_CONFIG]: Object.freeze({
      baseUrl: normalizedUrl,
    }),
  });
}

export function parseOllamaModelList(payload = {}) {
  const rawModels = Array.isArray(payload?.models) ? payload.models : [];
  const models = rawModels
    .map((model) => {
      const name = normalizeModelName(model?.name || model?.model || "");
      if (!name) return null;
      return Object.freeze({
        name,
        tag: modelTagFromName(name),
        sizeBytes: safeNumber(model?.size),
        modifiedAt: text(model?.modified_at || "", 80),
      });
    })
    .filter(Boolean)
    .slice(0, MAX_MODELS);
  const modelNames = [...new Set(models.map((model) => model.name))].slice(0, MAX_MODELS);
  return Object.freeze({
    modelCount: models.length,
    modelNames: Object.freeze(modelNames),
    models: Object.freeze(models),
  });
}

async function fetchWithTimeout(fetchImpl, url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timeout = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    return await fetchImpl(url, {
      ...options,
      signal: controller?.signal,
    });
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export async function getOllamaProviderStatus(input = {}) {
  const config = input.connectorConfig?.provider === "ollama" ? input.connectorConfig : readOllamaProviderConfig(input);

  if (!config.baseUrlValid) {
    return blockedStatus("ollama-base-url-invalid", config, { status: APEX_OLLAMA_PROVIDER_STATUS.BLOCKED });
  }
  if (!config.baseUrlIsLocal) {
    return blockedStatus("ollama-non-local-url-blocked", config, { status: APEX_OLLAMA_PROVIDER_STATUS.BLOCKED });
  }

  const fetchImpl = input.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    return blockedStatus("fetch-unavailable", config, { status: APEX_OLLAMA_PROVIDER_STATUS.ERROR });
  }

  const privateConfig = config[PRIVATE_CONFIG] || {};
  const tagsUrl = `${privateConfig.baseUrl}/api/tags`;

  try {
    const response = await fetchWithTimeout(fetchImpl, tagsUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    }, config.requestTimeoutMs);

    if (!response?.ok) {
      return blockedStatus("ollama-tags-read-failed", config, {
        status: APEX_OLLAMA_PROVIDER_STATUS.UNAVAILABLE,
        httpStatus: Number(response?.status || 0) || 0,
      });
    }

    const parsed = parseOllamaModelList(await response.json());
    return Object.freeze({
      provider: "ollama",
      status: APEX_OLLAMA_PROVIDER_STATUS.AVAILABLE,
      available: true,
      reason: "ollama-tags-read-ok",
      configured: config.configured,
      baseUrlConfigured: config.baseUrlConfigured,
      baseUrlValid: config.baseUrlValid,
      baseUrlIsLocal: config.baseUrlIsLocal,
      modelCount: parsed.modelCount,
      modelNames: parsed.modelNames,
      models: parsed.models,
      recommendedMissingModelHints: recommendedMissingModelHints(parsed.modelCount),
      readOnly: true,
      healthCheckOnly: true,
      promptSent: false,
      chatCalled: false,
      generateCalled: false,
      canGenerateNow: false,
      canChatNow: parsed.modelCount > 0,
      canExecuteNow: false,
      noPromptBody: true,
      baseUrlExposed: false,
      tokenExposed: false,
      secretsExposed: false,
    });
  } catch (error) {
    const reason = error?.name === "AbortError" ? "ollama-tags-read-timeout" : "ollama-unavailable";
    return blockedStatus(reason, config, { status: APEX_OLLAMA_PROVIDER_STATUS.UNAVAILABLE });
  }
}

function blocksProviderWithPrivacy(summary = {}) {
  return Boolean(summary?.blockedCount || summary?.approvalRequiredCount || summary?.blocked || summary?.requiresApproval);
}

function blocksProviderWithUntrustedContent(summary = {}) {
  return Boolean(summary?.blocked || summary?.requiresOperatorReview || summary?.blockedCount || summary?.requiresOperatorReviewCount);
}

function safeOllamaMessage(message = {}) {
  const role = ["system", "user", "assistant"].includes(String(message?.role || "").toLowerCase())
    ? String(message.role).toLowerCase()
    : "user";
  return Object.freeze({
    role,
    content: text(message?.content || "", 12_000),
  });
}

function appendOllamaJsonOnlyInstruction(messages = [], model = APEX_OLLAMA_DEFAULT_CHAT_MODEL) {
  const safeMessages = (Array.isArray(messages) ? messages : []).map(safeOllamaMessage).filter((message) => message.content);
  if (!safeMessages.length) return safeMessages;
  const first = safeMessages[0];
  const localModel = normalizeModelName(model) || APEX_OLLAMA_DEFAULT_CHAT_MODEL;
  const localJsonInstruction = ` Local Ollama mode: you are responding through local Ollama model ${localModel}. If asked what model or provider is being used, say local Ollama ${localModel}, not any route alias from context. Return one JSON object only when you can. Do not include markdown, code fences, hidden reasoning, <think> blocks, "read the rest", or "I can provide the rest" endings.`;
  return Object.freeze([
    Object.freeze({
      ...first,
      content: text(`${first.content}${localJsonInstruction}`, 12_000),
    }),
    ...safeMessages.slice(1),
  ]);
}

function stripLocalReasoningArtifacts(value = "") {
  return text(value, 12_000)
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/```(?:json)?/gi, "")
    .replace(/```/g, "")
    .trim();
}

function parseJsonObjectFromText(value = "") {
  const cleaned = stripLocalReasoningArtifacts(value);
  if (!cleaned) throw new Error("ollama-empty-chat-response");
  try {
    return JSON.parse(cleaned);
  } catch {
    const first = cleaned.indexOf("{");
    const last = cleaned.lastIndexOf("}");
    if (first < 0 || last <= first) throw new Error("ollama-chat-json-missing");
    try {
      return JSON.parse(cleaned.slice(first, last + 1));
    } catch {
      throw new Error("ollama-chat-json-invalid");
    }
  }
}

function mergeOllamaStreamLinePayloads(lines = [], firstTokenLatencyMs = 0) {
  let content = "";
  let lastPayload = {};
  let firstContentSeen = Boolean(firstTokenLatencyMs);
  for (const line of lines) {
    const trimmed = String(line || "").trim();
    if (!trimmed) continue;
    const payload = JSON.parse(trimmed);
    lastPayload = payload && typeof payload === "object" ? payload : lastPayload;
    const chunk = typeof payload?.message?.content === "string"
      ? payload.message.content
      : typeof payload?.response === "string"
        ? payload.response
        : "";
    if (chunk) {
      content += chunk;
      firstContentSeen = true;
    }
  }
  return Object.freeze({
    ...lastPayload,
    message: Object.freeze({
      ...(lastPayload.message || {}),
      content,
    }),
    response: content || lastPayload.response || "",
    firstTokenLatencyMs: firstContentSeen ? firstTokenLatencyMs : 0,
    firstTokenLatencyAvailable: Boolean(firstContentSeen && firstTokenLatencyMs),
    firstTokenLatencyReason: firstContentSeen && firstTokenLatencyMs ? "ollama-stream-first-token" : "ollama-stream-no-content-token",
  });
}

async function readOllamaChatResponsePayload(response, startedAt = performance.now(), { streamRequested = false } = {}) {
  if (!streamRequested) return response.json();
  if (!response.body || typeof response.body.getReader !== "function") {
    const payload = await response.json();
    return Object.freeze({
      ...payload,
      firstTokenLatencyMs: 0,
      firstTokenLatencyAvailable: false,
      firstTokenLatencyReason: "ollama-stream-body-unavailable",
    });
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
    if (!firstTokenLatencyMs && chunk.trim()) {
      firstTokenLatencyMs = Math.max(1, Math.round(performance.now() - startedAt));
    }
    buffer += chunk;
    const parts = buffer.split(/\r?\n/);
    buffer = parts.pop() || "";
    lines.push(...parts.filter(Boolean));
  }
  const tail = `${buffer}${decoder.decode()}`.trim();
  if (tail) lines.push(tail);
  if (!lines.length) {
    return Object.freeze({
      message: { content: "" },
      firstTokenLatencyMs: 0,
      firstTokenLatencyAvailable: false,
      firstTokenLatencyReason: "ollama-stream-empty",
    });
  }
  if (lines.length === 1) {
    const payload = JSON.parse(lines[0]);
    const content = typeof payload?.message?.content === "string" ? payload.message.content : typeof payload?.response === "string" ? payload.response : "";
    return Object.freeze({
      ...payload,
      firstTokenLatencyMs: content && firstTokenLatencyMs ? firstTokenLatencyMs : 0,
      firstTokenLatencyAvailable: Boolean(content && firstTokenLatencyMs),
      firstTokenLatencyReason: content && firstTokenLatencyMs ? "ollama-stream-first-token" : "ollama-stream-no-content-token",
    });
  }
  return mergeOllamaStreamLinePayloads(lines, firstTokenLatencyMs);
}

async function readOllamaRuntimeProcessPayload(config = {}, fetchImpl = globalThis.fetch) {
  if (typeof fetchImpl !== "function") {
    return Object.freeze({ ok: false, reason: "fetch-unavailable", payload: { models: [] } });
  }
  const privateConfig = config[PRIVATE_CONFIG] || {};
  if (!privateConfig.baseUrl) {
    return Object.freeze({ ok: false, reason: "ollama-base-url-unavailable", payload: { models: [] } });
  }
  try {
    const response = await fetchWithTimeout(fetchImpl, `${privateConfig.baseUrl}/api/ps`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    }, config.requestTimeoutMs);
    if (!response?.ok) {
      return Object.freeze({ ok: false, reason: "ollama-runtime-process-read-failed", payload: { models: [] } });
    }
    const payload = await response.json().catch(() => ({ models: [] }));
    return Object.freeze({ ok: true, reason: "ollama-runtime-process-read-ok", payload });
  } catch (error) {
    return Object.freeze({
      ok: false,
      reason: error?.name === "AbortError" ? "ollama-runtime-process-read-timeout" : "ollama-runtime-process-unavailable",
      payload: { models: [] },
    });
  }
}

function bytesToMb(value = 0) {
  const bytes = safeNumber(value);
  return bytes ? Math.round(bytes / 1024 / 1024) : 0;
}

function parseOllamaContextLength(model = {}) {
  const candidates = [
    model?.context_length,
    model?.contextLength,
    model?.num_ctx,
    model?.numCtx,
    model?.options?.num_ctx,
    model?.options?.numCtx,
    model?.details?.context_length,
    model?.details?.contextLength,
    model?.details?.num_ctx,
    model?.details?.numCtx,
  ];
  for (const candidate of candidates) {
    const parsed = Math.round(safeNumber(candidate));
    if (parsed > 0) return parsed;
  }
  return 0;
}

export function parseOllamaResidencyModels(payload = {}) {
  const rawModels = Array.isArray(payload?.models) ? payload.models : [];
  const models = rawModels
    .map((model) => {
      const name = normalizeModelName(model?.name || model?.model || "");
      if (!name) return null;
      const numCtx = parseOllamaContextLength(model);
      return Object.freeze({
        name,
        model: normalizeModelName(model?.model || name),
        sizeMb: bytesToMb(model?.size),
        vramUsedMb: bytesToMb(model?.size_vram ?? model?.sizeVram),
        numCtx,
        numCtxDiscoverable: numCtx > 0,
        keepAlive: text(model?.expires_at || model?.expiresAt || "", 120),
      });
    })
    .filter(Boolean)
    .slice(0, MAX_MODELS);
  return Object.freeze({
    modelCount: models.length,
    models: Object.freeze(models),
    totalVramUsedMb: models.reduce((sum, model) => sum + safeNumber(model.vramUsedMb), 0),
  });
}

export function buildApexOllamaResidencyReceipt(input = {}) {
  const parsed = input.parsedResidency?.models ? input.parsedResidency : parseOllamaResidencyModels(input.payload || {});
  const activeLane = text(input.activeLane || input.lane || "normal", 40) || "normal";
  const stableResidency = input.stableResidency?.provider
    ? input.stableResidency
    : buildApexStableResidencyPolicy(input);
  const activeLaneNumCtx = Math.round(safeNumber(
    input.activeLaneNumCtx
    || (activeLane === "balanced" ? APEX_WORKSTATION_BRAIN_BALANCED_CTX : stableResidency.residentNumCtx)
  ) || APEX_LOCAL_AGENT_SPEED_CONTEXT.DAILY_RESIDENT);
  const targetModel = normalizeModelName(input.targetModel || APEX_OLLAMA_DEFAULT_CHAT_MODEL);
  const loadedModel = parsed.models.find((model) => normalizeModelName(model.name) === targetModel) || null;
  const loadedNumCtx = Math.round(safeNumber(loadedModel?.numCtx));
  const contextExceedsActiveLane = Boolean(loadedNumCtx && loadedNumCtx > activeLaneNumCtx);
  const contextTooLarge = Boolean(loadedNumCtx && loadedNumCtx >= 32768);
  const vramUsedMb = Math.round(safeNumber(loadedModel?.vramUsedMb || parsed.totalVramUsedMb));
  const reloadNeeded = Boolean(loadedModel && (contextExceedsActiveLane || contextTooLarge));
  const controlledReloadAvailable = targetModel === APEX_OLLAMA_DEFAULT_CHAT_MODEL;
  const vramStatus = reloadNeeded
    ? "reload-needed"
    : vramUsedMb >= 14_500
      ? "tight"
      : vramUsedMb >= 13_500
        ? "tight"
        : loadedModel
          ? "healthy"
          : "cold";
  return Object.freeze({
    provider: "apex-ollama-residency",
    status: input.status || (loadedModel ? "loaded" : parsed.modelCount ? "loaded-other-models" : "cold"),
    reason: input.reason || (reloadNeeded ? "brain-reload-needed" : loadedModel ? "brain-residency-stable" : "brain-not-resident"),
    targetModel,
    loadedModel: loadedModel?.name || "",
    loadedModels: Object.freeze(parsed.models.map((model) => Object.freeze({
      name: model.name,
      numCtx: model.numCtx,
      numCtxDiscoverable: model.numCtxDiscoverable,
      vramUsedMb: model.vramUsedMb,
      keepAlive: model.keepAlive,
    }))),
    numCtx: loadedNumCtx,
    numCtxDiscoverable: Boolean(loadedModel?.numCtxDiscoverable),
    activeLane,
    activeLaneNumCtx,
    contextExceedsActiveLane,
    contextTooLarge,
    vramUsedMb,
    keepAlive: loadedModel?.keepAlive || "",
    vramStatus,
    reloadNeeded,
    reloadPath: controlledReloadAvailable ? Object.freeze({
      method: "POST",
      endpoint: "/api/apex-os/local-providers/reload-brain",
      targetModel,
      confirmationPhrase: APEX_OLLAMA_RESIDENCY_RELOAD_CONFIRMATION,
      processKilling: false,
    }) : null,
    controlledReloadAvailable,
    randomProcessesTouched: false,
    noProcessKilled: true,
    openAiUsed: false,
    cloudUsed: false,
    rawPromptStored: false,
    rawResponseStored: false,
    secretsExposed: false,
  });
}

export async function getApexOllamaResidencyStatus(input = {}) {
  const config = input.connectorConfig?.provider === "ollama" ? input.connectorConfig : readOllamaProviderConfig(input);
  if (!config.baseUrlValid) {
    return buildApexOllamaResidencyReceipt({ status: "blocked", reason: "ollama-base-url-invalid" });
  }
  if (!config.baseUrlIsLocal) {
    return buildApexOllamaResidencyReceipt({ status: "blocked", reason: "ollama-non-local-url-blocked" });
  }
  const runtime = await readOllamaRuntimeProcessPayload(config, input.fetchImpl || globalThis.fetch);
  return buildApexOllamaResidencyReceipt({
    payload: runtime.payload,
    status: runtime.ok ? "" : "unavailable",
    reason: runtime.ok ? "" : runtime.reason,
    activeLane: input.activeLane,
    activeLaneNumCtx: input.activeLaneNumCtx,
    targetModel: input.targetModel || APEX_OLLAMA_DEFAULT_CHAT_MODEL,
  });
}

export async function reloadApexOllamaBrainResidency(input = {}) {
  const confirmation = text(input.confirmation || input.confirm || input.phrase || "", 80).toLowerCase();
  const lane = text(input.lane || input.activeLane || "normal", 40).toLowerCase() === "balanced" ? "balanced" : "normal";
  const stableResidency = buildApexStableResidencyPolicy(input);
  const targetNumCtx = lane === "balanced" ? APEX_WORKSTATION_BRAIN_BALANCED_CTX : stableResidency.residentNumCtx;
  const keepAlive = text(input.keepAlive || (lane === "balanced" ? "15m" : APEX_LOCAL_AGENT_SPEED_KEEP_ALIVE.FAST), 24) || APEX_LOCAL_AGENT_SPEED_KEEP_ALIVE.FAST;
  const targetModel = normalizeModelName(input.targetModel || APEX_OLLAMA_DEFAULT_CHAT_MODEL);
  const config = input.connectorConfig?.provider === "ollama" ? input.connectorConfig : readOllamaProviderConfig(input);

  const baseReceipt = {
    provider: "apex-ollama-brain-reload",
    targetModel,
    lane,
    targetNumCtx,
    keepAlive,
    stableResidency,
    randomProcessesTouched: false,
    processKilled: false,
    broadRuntimeReset: false,
    openAiUsed: false,
    cloudUsed: false,
    rawPromptStored: false,
    rawResponseStored: false,
    secretsExposed: false,
    createdAt: new Date().toISOString(),
  };

  if (targetModel !== APEX_OLLAMA_DEFAULT_CHAT_MODEL) {
    return Object.freeze({ ...baseReceipt, status: "blocked", reason: "only-apex-main-brain-model-can-reload" });
  }
  if (confirmation !== APEX_OLLAMA_RESIDENCY_RELOAD_CONFIRMATION) {
    return Object.freeze({ ...baseReceipt, status: "blocked", reason: "missing-confirmation-phrase", requiredConfirmation: APEX_OLLAMA_RESIDENCY_RELOAD_CONFIRMATION });
  }
  if (!config.baseUrlValid || !config.baseUrlIsLocal) {
    return Object.freeze({ ...baseReceipt, status: "blocked", reason: !config.baseUrlValid ? "ollama-base-url-invalid" : "ollama-non-local-url-blocked" });
  }
  const fetchImpl = input.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    return Object.freeze({ ...baseReceipt, status: "blocked", reason: "fetch-unavailable" });
  }

  const privateConfig = config[PRIVATE_CONFIG] || {};
  const before = await readOllamaRuntimeProcessPayload(config, fetchImpl);
  try {
    const unloadResponse = await fetchWithTimeout(fetchImpl, `${privateConfig.baseUrl}/api/generate`, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({
        model: targetModel,
        prompt: "",
        stream: false,
        keep_alive: 0,
      }),
    }, config.chatTimeoutMs);
    if (!unloadResponse?.ok) {
      return Object.freeze({ ...baseReceipt, status: "failed", reason: `ollama-unload-http-${Number(unloadResponse?.status || 0) || 0}` });
    }
    const reloadResponse = input.reload === false
      ? null
      : await fetchWithTimeout(fetchImpl, `${privateConfig.baseUrl}/api/generate`, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          model: targetModel,
          prompt: "",
          stream: false,
          keep_alive: keepAlive,
          options: {
            num_ctx: targetNumCtx,
            num_predict: 1,
          },
        }),
      }, config.chatTimeoutMs);
    if (reloadResponse && !reloadResponse.ok) {
      return Object.freeze({ ...baseReceipt, status: "failed", reason: `ollama-reload-http-${Number(reloadResponse.status || 0) || 0}` });
    }
    const after = await readOllamaRuntimeProcessPayload(config, fetchImpl);
    return Object.freeze({
      ...baseReceipt,
      status: "completed",
      reason: "apex-main-brain-residency-reloaded",
      before: buildApexOllamaResidencyReceipt({ payload: before.payload, activeLane: lane, activeLaneNumCtx: targetNumCtx }),
      after: buildApexOllamaResidencyReceipt({ payload: after.payload, activeLane: lane, activeLaneNumCtx: targetNumCtx }),
      unloadCalled: true,
      reloadCalled: input.reload !== false,
      executionScope: "ollama-main-brain-residency-only",
    });
  } catch (error) {
    return Object.freeze({
      ...baseReceipt,
      status: "failed",
      reason: error?.name === "AbortError" ? "ollama-brain-reload-timeout" : "ollama-brain-reload-failed",
    });
  }
}

function parseJsonStringFieldFromText(value = "", fieldNames = []) {
  const cleaned = stripLocalReasoningArtifacts(value);
  for (const fieldName of fieldNames) {
    const safeField = String(fieldName || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = cleaned.match(new RegExp(`"${safeField}"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"`, "i"));
    if (!match) continue;
    try {
      return JSON.parse(`"${match[1]}"`);
    } catch {
      return match[1].replace(/\\"/g, "\"").replace(/\\n/g, " ").replace(/\\r/g, " ").replace(/\\t/g, " ").trim();
    }
  }
  return "";
}

export function selectOllamaModelForApexOsRoute(route = "", input = {}) {
  return selectApexLocalAgentSpeedLane({ ...input, route }).modelId;
}

function routeForLocalAgentSelection(input = {}, model = "") {
  const selectedModel = normalizeModelName(model || input.model || "");
  return input.route || (selectedModel === APEX_OLLAMA_CODING_CHAT_MODEL ? "coding-analysis" : "");
}

function selectLocalAgentSpeedForChatInput(input = {}, model = "") {
  const routeForSelection = routeForLocalAgentSelection(input, model);
  return selectApexLocalAgentSpeedLane({
    route: routeForSelection,
    requestedLane: input.agentLane || input.localAgentLane,
    effort: input.effort || input.requestedEffort || input.agentEffort || input.selectedEffort,
    modelNames: input.modelNames || input.availableModels || input.installedModels,
    brainMode: input.brainMode,
    numCtx: input.numCtx || input.requestedNumCtx,
    messages: routeForSelection ? [] : input.messages,
    question: input.question || input.prompt || "",
    stableResidency: input.stableResidency,
    stableResidencyEnabled: input.stableResidencyEnabled,
    residentNumCtx: input.residentNumCtx,
    benchmarkSummary: input.benchmarkSummary,
    residency: input.residency,
    gpu: input.gpu,
    vramStatus: input.vramStatus,
    vramTotalMb: input.vramTotalMb,
    vramUsedMb: input.vramUsedMb,
  });
}

function workstationProfileSelectionFromAgentLane(laneSelection = {}, route = "") {
  const speedLane = laneSelection.laneId === APEX_LOCAL_AGENT_SPEED_LANE_ID.FAST;
  return Object.freeze({
    provider: "apex-workstation-brain",
    profileId: speedLane ? "speed" : "coding",
    activeProfileId: getApexWorkstationBrainRuntimeState().activeProfileId,
    requestedProfileId: laneSelection.manualOnly ? laneSelection.laneId : "",
    route,
    label: laneSelection.laneLabel || (speedLane ? "Fast" : "Coding"),
    modelId: laneSelection.modelId || (speedLane ? APEX_OLLAMA_DEFAULT_CHAT_MODEL : APEX_OLLAMA_CODING_CHAT_MODEL),
    numCtx: laneSelection.numCtx || (speedLane ? APEX_WORKSTATION_BRAIN_NORMAL_CTX : APEX_WORKSTATION_BRAIN_BALANCED_CTX),
    keepAlive: laneSelection.keepAlive || (speedLane ? "10m" : "5m"),
    keepAlivePermanent: false,
    taskScoped: true,
    speedLane,
    maxOutputTokens: laneSelection.maxOutputTokens || (speedLane ? 320 : 1400),
    promotionTargetNumCtx: 0,
    dedicatedEnabled: false,
    allowPermanentKeepAlive: false,
    fallbackReasons: Object.freeze(laneSelection.blockedReasons || []),
  });
}

export function isOllamaModelAvailable(modelNames = [], model = "") {
  const selected = normalizeModelName(model);
  if (!selected) return false;
  return (Array.isArray(modelNames) ? modelNames : [])
    .map(normalizeModelName)
    .some((name) => name === selected);
}

export function buildOllamaChatRequest({
  model = APEX_OLLAMA_DEFAULT_CHAT_MODEL,
  messages = [],
  maxOutputTokens = DEFAULT_CHAT_MAX_OUTPUT_TOKENS,
  route = "",
  effort = "",
  requestedEffort = "",
  agentEffort = "",
  selectedEffort = "",
  modelNames = [],
  brainMode = "",
  agentLane = "",
  numCtx = 0,
  stream = DEFAULT_CHAT_STREAMING,
  stableResidency = null,
  stableResidencyEnabled = undefined,
  residentNumCtx = 0,
  benchmarkSummary = null,
  residency = null,
  gpu = null,
  vramStatus = "",
  vramTotalMb = 0,
  vramUsedMb = 0,
} = {}) {
  const routeForSelection = route || (normalizeModelName(model) === APEX_OLLAMA_CODING_CHAT_MODEL ? "coding-analysis" : "");
  const agentSpeed = selectLocalAgentSpeedForChatInput({
    route: routeForSelection,
    model,
    messages,
    brainMode,
    agentLane,
    effort: effort || requestedEffort || agentEffort || selectedEffort,
    modelNames,
    numCtx,
    stableResidency,
    stableResidencyEnabled,
    residentNumCtx,
    benchmarkSummary,
    residency,
    gpu,
    vramStatus,
    vramTotalMb,
    vramUsedMb,
  }, model);
  const profileSelection = workstationProfileSelectionFromAgentLane(agentSpeed, routeForSelection);
  const agentOptions = buildApexLocalAgentSpeedOllamaOptions({
    laneSelection: agentSpeed,
    maxOutputTokens: safeChatTokenCap(maxOutputTokens),
  });
  const brainOptions = buildApexWorkstationBrainOllamaOptions({
    profileSelection,
    maxOutputTokens: safeChatTokenCap(maxOutputTokens),
  });
  const selectedModel = normalizeModelName(agentOptions.model || brainOptions.model || model) || normalizeModelName(model) || APEX_OLLAMA_DEFAULT_CHAT_MODEL;
  const personaMessages = applyApexWorkstationDirectPersonaMessages(messages, { route: routeForSelection });
  return Object.freeze({
    model: selectedModel,
    stream: stream !== false,
    think: false,
    keep_alive: agentOptions.keepAlive || brainOptions.keepAlive,
    messages: appendOllamaJsonOnlyInstruction(personaMessages, selectedModel),
    options: Object.freeze({
      ...brainOptions.options,
      ...agentOptions.options,
      temperature: agentOptions.options.temperature ?? brainOptions.options.temperature ?? 0.2,
      num_predict: agentOptions.options.num_predict ?? brainOptions.options.num_predict ?? safeChatTokenCap(maxOutputTokens),
    }),
  });
}

export function parseOllamaApexOsAskPayload(payload = {}) {
  const content = typeof payload?.message?.content === "string"
    ? payload.message.content
    : typeof payload?.response === "string"
      ? payload.response
      : "";
  let parsed = null;
  try {
    parsed = parseJsonObjectFromText(content);
  } catch {
    const extractedAnswer = parseJsonStringFieldFromText(content, ["answer", "response", "message", "summary"]);
    parsed = { answer: extractedAnswer || stripLocalReasoningArtifacts(content) };
  }
  const answer = text(parsed.answer || parsed.response || parsed.message || parsed.summary, ASK_ANSWER_TEXT_LIMIT);
  if (!answer) {
    throw new Error("ollama-chat-answer-empty");
  }
  return Object.freeze({
    ok: true,
    provider: "ollama",
    providerConfigured: true,
    providerFallback: false,
    mode: "local-ollama-source-backed",
    answer,
    sourceLabels: Object.freeze((Array.isArray(parsed.sourceLabels) ? parsed.sourceLabels : [parsed.sourceLabel]).map((entry) => text(entry, 180)).filter(Boolean).slice(0, 8)),
    approvalWarnings: Object.freeze((Array.isArray(parsed.approvalWarnings) ? parsed.approvalWarnings : []).map((entry) => text(entry, 260)).filter(Boolean).slice(0, 8)),
    nextAction: text(parsed.nextAction || "Review local answer", 240),
    storesRawPrompt: false,
    storesRawResponse: false,
  });
}

export function parseOllamaApexOsKnowledgePayload(payload = {}) {
  const content = typeof payload?.message?.content === "string"
    ? payload.message.content
    : typeof payload?.response === "string"
      ? payload.response
      : "";
  const parsed = parseJsonObjectFromText(content);
  return Object.freeze({
    ok: true,
    provider: "ollama",
    providerConfigured: true,
    providerFallback: false,
    mode: "local-ollama-knowledge-summary",
    providerSummary: text(parsed.providerSummary, 900),
    classifications: Object.freeze((Array.isArray(parsed.classifications) ? parsed.classifications : []).map((row) => Object.freeze({
      title: text(row.title, SHORT_LIMIT),
      sourceLabel: text(row.sourceLabel, SHORT_LIMIT),
      category: text(row.category, 80),
      confidenceLabel: text(row.confidenceLabel, 40),
      reason: text(row.reason, 260),
    })).filter((row) => row.title).slice(0, 8)),
    storesRawPrompt: false,
    storesRawResponse: false,
  });
}

function sanitizeQueueReceipt(receipt = {}) {
  return Object.freeze({
    provider: "apex-ollama-serialized-queue",
    serialized: true,
    activeMode: text(receipt.activeMode || "", 80),
    activeModel: text(receipt.activeModel || "", 160),
    route: text(receipt.route || "", 120),
    status: text(receipt.status || "completed", 80),
    queuedMs: Math.max(0, Math.round(safeNumber(receipt.queuedMs))),
    runMs: Math.max(0, Math.round(safeNumber(receipt.runMs))),
    queuedCountAfterStart: Math.max(0, Math.round(safeNumber(receipt.queuedCountAfterStart))),
    startedAt: text(receipt.startedAt || "", 80),
    finishedAt: text(receipt.finishedAt || "", 80),
    nonUrgentQueuedWhileCoding: Boolean(receipt.nonUrgentQueuedWhileCoding),
    priorityStopCommand: Boolean(receipt.priorityStopCommand),
    rawPromptStored: false,
    rawResponseStored: false,
    secretsExposed: false,
  });
}

export function getApexOllamaRequestQueueState() {
  return Object.freeze({
    provider: "apex-ollama-serialized-queue",
    serialized: true,
    active: Boolean(ollamaRequestQueueState.active),
    activeModel: text(ollamaRequestQueueState.activeModel, 160),
    activeMode: text(ollamaRequestQueueState.activeMode, 80),
    activeRoute: text(ollamaRequestQueueState.activeRoute, 120),
    activeStartedAt: text(ollamaRequestQueueState.activeStartedAt, 80),
    queuedCount: Math.max(0, Math.round(safeNumber(ollamaRequestQueueState.queuedCount))),
    lastQueuedMs: Math.max(0, Math.round(safeNumber(ollamaRequestQueueState.lastQueuedMs))),
    lastReceipt: ollamaRequestQueueState.lastReceipt,
    priorityStopCommands: true,
    noUnrelatedProcessKilled: true,
    openAiUsed: false,
    secretsExposed: false,
  });
}

async function runSerializedOllamaRequest(metadata = {}, task) {
  const queuedAt = performance.now();
  ollamaRequestQueueState.queuedCount += 1;
  const previous = ollamaRequestQueueTail.catch(() => {});
  const runPromise = previous.then(async () => {
    const startedAt = performance.now();
    const startedAtIso = new Date().toISOString();
    const queuedMs = startedAt - queuedAt;
    ollamaRequestQueueState.queuedCount = Math.max(0, ollamaRequestQueueState.queuedCount - 1);
    ollamaRequestQueueState.active = true;
    ollamaRequestQueueState.activeModel = text(metadata.model || "", 160);
    ollamaRequestQueueState.activeMode = text(metadata.mode || "", 80);
    ollamaRequestQueueState.activeRoute = text(metadata.route || "", 120);
    ollamaRequestQueueState.activeStartedAt = startedAtIso;
    ollamaRequestQueueState.lastQueuedMs = queuedMs;
    try {
      const result = await task({ queuedMs });
      const runMs = performance.now() - startedAt;
      const queueReceipt = sanitizeQueueReceipt({
        activeMode: metadata.mode,
        activeModel: metadata.model,
        route: metadata.route,
        status: "completed",
        queuedMs,
        runMs,
        queuedCountAfterStart: ollamaRequestQueueState.queuedCount,
        startedAt: startedAtIso,
        finishedAt: new Date().toISOString(),
        nonUrgentQueuedWhileCoding: metadata.nonUrgentQueuedWhileCoding,
        priorityStopCommand: metadata.priorityStopCommand,
      });
      ollamaRequestQueueState.lastReceipt = queueReceipt;
      return Object.freeze({ result, queueReceipt });
    } catch (error) {
      const runMs = performance.now() - startedAt;
      const queueReceipt = sanitizeQueueReceipt({
        activeMode: metadata.mode,
        activeModel: metadata.model,
        route: metadata.route,
        status: "failed",
        queuedMs,
        runMs,
        queuedCountAfterStart: ollamaRequestQueueState.queuedCount,
        startedAt: startedAtIso,
        finishedAt: new Date().toISOString(),
        nonUrgentQueuedWhileCoding: metadata.nonUrgentQueuedWhileCoding,
        priorityStopCommand: metadata.priorityStopCommand,
      });
      ollamaRequestQueueState.lastReceipt = queueReceipt;
      throw error;
    } finally {
      ollamaRequestQueueState.active = false;
      ollamaRequestQueueState.activeModel = "";
      ollamaRequestQueueState.activeMode = "";
      ollamaRequestQueueState.activeRoute = "";
      ollamaRequestQueueState.activeStartedAt = "";
    }
  });
  ollamaRequestQueueTail = runPromise.then(() => {}, () => {});
  return runPromise;
}

async function chatWithOllamaJson(input = {}, parsePayload = parseOllamaApexOsAskPayload) {
  const config = input.connectorConfig?.provider === "ollama" ? input.connectorConfig : readOllamaProviderConfig(input);

  if (!config.baseUrlValid) {
    return blockedStatus("ollama-base-url-invalid", config, { status: APEX_OLLAMA_PROVIDER_STATUS.BLOCKED });
  }
  if (!config.baseUrlIsLocal) {
    return blockedStatus("ollama-non-local-url-blocked", config, { status: APEX_OLLAMA_PROVIDER_STATUS.BLOCKED });
  }
  if (blocksProviderWithPrivacy(input.privacyFirewallSummary)) {
    return blockedStatus("privacy-firewall-blocked-local-model", config, { status: APEX_OLLAMA_PROVIDER_STATUS.BLOCKED });
  }
  if (blocksProviderWithUntrustedContent(input.promptInjectionFirewallSummary) || blocksProviderWithUntrustedContent(input.untrustedContentFirewallSummary)) {
    return blockedStatus("prompt-injection-firewall-blocked-local-model", config, { status: APEX_OLLAMA_PROVIDER_STATUS.BLOCKED });
  }

  const fetchImpl = input.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    return blockedStatus("fetch-unavailable", config, { status: APEX_OLLAMA_PROVIDER_STATUS.ERROR });
  }

  const privateConfig = config[PRIVATE_CONFIG] || {};
  const chatUrl = `${privateConfig.baseUrl}/api/chat`;
  const request = buildOllamaChatRequest({
    ...input,
    stream: input.stream !== false,
  });
  const routeForSelection = input.route || (request.model === APEX_OLLAMA_CODING_CHAT_MODEL ? "coding-analysis" : "");
  const agentSpeed = selectLocalAgentSpeedForChatInput({
    ...input,
    route: routeForSelection,
    model: request.model,
  }, request.model);
  const profileSelection = workstationProfileSelectionFromAgentLane(agentSpeed, routeForSelection);
  const userMessageText = (Array.isArray(input.messages) ? input.messages : [])
    .filter((message) => String(message?.role || "").toLowerCase() === "user")
    .map((message) => String(message?.content || ""))
    .join(" ")
    .slice(-800);
  const priorityStopCommand = /\b(stop coding|pause building|go quiet|quiet down)\b/i.test(userMessageText);
  const nonUrgentQueuedWhileCoding = Boolean(
    getApexWorkstationBrainRuntimeState().codingActive
    && profileSelection.profileId !== "coding"
    && !priorityStopCommand,
  );

  try {
    const queued = await runSerializedOllamaRequest({
      model: request.model,
      mode: profileSelection.profileId,
      route: routeForSelection,
      priorityStopCommand,
      nonUrgentQueuedWhileCoding,
    }, async () => {
      const beforeRuntime = await readOllamaRuntimeProcessPayload(config, fetchImpl);
      const beforeResidency = buildApexOllamaResidencyReceipt({
        payload: beforeRuntime.payload,
        activeLane: agentSpeed.laneId,
        activeLaneNumCtx: agentSpeed.numCtx,
        targetModel: request.model,
        stableResidency: agentSpeed.stableResidency,
      });
      const startedAt = performance.now();
      let response = await fetchWithTimeout(fetchImpl, chatUrl, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      }, config.chatTimeoutMs);

      if (!response?.ok) {
        return blockedStatus("ollama-chat-request-failed", config, {
          status: APEX_OLLAMA_PROVIDER_STATUS.UNAVAILABLE,
          httpStatus: Number(response?.status || 0) || 0,
        });
      }

      let responsePayload;
      try {
        responsePayload = await readOllamaChatResponsePayload(response, startedAt, { streamRequested: request.stream });
      } catch (streamError) {
        if (!request.stream) throw streamError;
        response = await fetchWithTimeout(fetchImpl, chatUrl, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ...request, stream: false }),
        }, config.chatTimeoutMs);
        if (!response?.ok) {
          return blockedStatus("ollama-chat-request-failed", config, {
            status: APEX_OLLAMA_PROVIDER_STATUS.UNAVAILABLE,
            httpStatus: Number(response?.status || 0) || 0,
          });
        }
        responsePayload = {
          ...await response.json(),
          firstTokenLatencyMs: 0,
          firstTokenLatencyAvailable: false,
          firstTokenLatencyReason: "ollama-stream-parse-fallback-to-non-stream",
        };
      }
      const responseTimingMs = performance.now() - startedAt;
      const parsed = parsePayload(responsePayload);
      const afterRuntime = await readOllamaRuntimeProcessPayload(config, fetchImpl);
      const residency = buildApexOllamaResidencyReceipt({
        payload: afterRuntime.payload,
        activeLane: agentSpeed.laneId,
        activeLaneNumCtx: agentSpeed.numCtx,
        targetModel: request.model,
        stableResidency: agentSpeed.stableResidency,
      });
      const modelProcessor = buildOllamaModelProcessorReceipt({
        provider: "ollama",
        model: request.model,
        beforePayload: beforeRuntime.payload,
        afterPayload: afterRuntime.payload,
        timingMs: responseTimingMs,
        status: "completed",
        reason: afterRuntime.ok ? afterRuntime.reason : beforeRuntime.reason || afterRuntime.reason,
      });
      const brainTelemetry = buildApexWorkstationBrainTelemetry({
        profileSelection,
        modelProcessor,
        responseTimingMs: modelProcessor.responseTimingMs,
      });
      const benchmarkReceipt = buildApexLocalAgentBenchmarkReceipt({
        laneSelection: agentSpeed,
        route: routeForSelection,
        modelUsed: request.model,
        responsePayload,
        responseTimingMs: modelProcessor.responseTimingMs,
        beforeResidency,
        residency,
        modelVramUsedMb: modelProcessor.vramUsedMb,
      });
      return Object.freeze({
        ...parsed,
        provider: "ollama",
        status: APEX_OLLAMA_PROVIDER_STATUS.AVAILABLE,
        available: true,
        reason: "ollama-chat-ok",
        configured: config.configured,
        baseUrlConfigured: config.baseUrlConfigured,
        baseUrlValid: config.baseUrlValid,
        baseUrlIsLocal: config.baseUrlIsLocal,
        model: request.model,
        modelUsed: request.model,
        brainMode: profileSelection.profileId,
        brainProfile: profileSelection,
        agentSpeed,
        stableResidency: agentSpeed.stableResidency,
        agentSpeedLane: agentSpeed.laneId,
        agentSpeedLabel: agentSpeed.laneLabel,
        agentEffort: agentSpeed.effortId,
        agentEffortLabel: agentSpeed.effortLabel,
        effortModel: agentSpeed.modelId,
        effortNumCtx: agentSpeed.numCtx,
        effortManualOnly: Boolean(agentSpeed.effortManualOnly || agentSpeed.manualOnly),
        residency,
        beforeResidency,
        processor: modelProcessor.processor,
        vramUsedMb: modelProcessor.vramUsedMb,
        responseTimingMs: modelProcessor.responseTimingMs,
        modelAlreadyLoaded: modelProcessor.modelAlreadyLoaded,
        modelProcessor,
        brainTelemetry,
        benchmarkReceipt,
        promptSent: true,
        chatCalled: true,
        generateCalled: false,
        canGenerateNow: false,
        canChatNow: true,
        noPromptBody: false,
        baseUrlExposed: false,
        tokenExposed: false,
        secretsExposed: false,
        metadataSafeForTrace: true,
      });
    });
    const brainReceipt = queued.result?.brainTelemetry
      ? registerApexWorkstationBrainModelReceipt({
          ...queued.result.brainTelemetry,
          queue: queued.queueReceipt,
        })
      : null;
    const latencyProfile = buildApexLatencyProfile({
      modelReceipt: brainReceipt || queued.result?.brainTelemetry || profileSelection,
      modelProcessor: queued.result?.modelProcessor,
      modelQueue: queued.queueReceipt,
      warmRuntime: {
        fastPathActive: profileSelection.speedLane,
        keepWarm: {
          enabled: profileSelection.speedLane,
          targetModel: request.model,
          keepAlive: request.keep_alive,
        },
      },
    });
    const benchmarkReceipt = queued.result?.benchmarkReceipt
      ? buildApexLocalAgentBenchmarkReceipt({
          laneSelection: queued.result.agentSpeed,
          route: routeForSelection,
          modelUsed: queued.result.modelUsed || queued.result.model,
          timingStats: queued.result.benchmarkReceipt,
          responseTimingMs: queued.result.responseTimingMs,
          beforeResidency: queued.result.beforeResidency,
          residency: queued.result.residency,
          modelVramUsedMb: queued.result.modelProcessor?.vramUsedMb,
          queueReceipt: queued.queueReceipt,
        })
      : null;
    return Object.freeze({
      ...queued.result,
      queueReceipt: queued.queueReceipt,
      modelQueue: queued.queueReceipt,
      brainReceipt,
      brainTelemetry: brainReceipt || queued.result?.brainTelemetry || null,
      benchmarkReceipt,
      latencyProfile,
    });
  } catch (error) {
    const reason = error?.name === "AbortError" ? "ollama-chat-timeout" : "ollama-chat-unavailable";
    return blockedStatus(reason, config, { status: APEX_OLLAMA_PROVIDER_STATUS.UNAVAILABLE });
  }
}

export async function chatWithOllamaForApexOs(input = {}) {
  return chatWithOllamaJson(input, parseOllamaApexOsAskPayload);
}

export async function chatWithOllamaForApexOsKnowledge(input = {}) {
  return chatWithOllamaJson(input, parseOllamaApexOsKnowledgePayload);
}
