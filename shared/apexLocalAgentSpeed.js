export const APEX_LOCAL_AGENT_SPEED_LANE_ID = Object.freeze({
  FAST: "fast",
  NORMAL: "normal",
  CODING: "coding",
  FAST_CODER: "fast-coder",
  REASONING: "reasoning",
  MOE: "moe",
  CODER: "coder",
  DEEP: "deep",
});

export const APEX_LOCAL_AGENT_EFFORT_ID = Object.freeze({
  FAST: "fast",
  NORMAL: "normal",
  REASONING: "reasoning",
  MOE: "moe",
  CODER: "coder",
  DEEP: "deep",
});

export const APEX_LOCAL_AGENT_SPEED_VERSION = "v1.3";
export const APEX_LOCAL_AGENT_EFFORT_VERSION = "apex-effort-model-lane-v1";
export const APEX_LOCAL_AGENT_STABLE_RESIDENCY_PROVIDER = "apex-local-agent-stable-residency";

export const APEX_LOCAL_AGENT_SPEED_MODEL = Object.freeze({
  FAST: "qwen3:14b",
  CODING: "qwen3:14b",
  FAST_CODER: "qwen2.5-coder:7b",
  DEEP_CODING: "qwen3-coder:30b",
  REASONING: "gpt-oss:20b",
  MOE: "qwen3:30b-a3b",
  CODER_A3B: "qwen3-coder:30b-a3b-q4_K_M",
});

export const APEX_LOCAL_AGENT_EFFORT_MODEL = Object.freeze({
  [APEX_LOCAL_AGENT_EFFORT_ID.FAST]: APEX_LOCAL_AGENT_SPEED_MODEL.FAST,
  [APEX_LOCAL_AGENT_EFFORT_ID.NORMAL]: APEX_LOCAL_AGENT_SPEED_MODEL.CODING,
  [APEX_LOCAL_AGENT_EFFORT_ID.REASONING]: APEX_LOCAL_AGENT_SPEED_MODEL.REASONING,
  [APEX_LOCAL_AGENT_EFFORT_ID.MOE]: APEX_LOCAL_AGENT_SPEED_MODEL.MOE,
  [APEX_LOCAL_AGENT_EFFORT_ID.CODER]: APEX_LOCAL_AGENT_SPEED_MODEL.CODER_A3B,
  [APEX_LOCAL_AGENT_EFFORT_ID.DEEP]: APEX_LOCAL_AGENT_SPEED_MODEL.REASONING,
});

export const APEX_LOCAL_AGENT_EFFORT_APPROVED_PULL_MODELS = Object.freeze([
  APEX_LOCAL_AGENT_SPEED_MODEL.REASONING,
  APEX_LOCAL_AGENT_SPEED_MODEL.MOE,
  APEX_LOCAL_AGENT_SPEED_MODEL.CODER_A3B,
]);

export const APEX_LOCAL_AGENT_SPEED_CONTEXT = Object.freeze({
  FAST: 2048,
  CODING: 4096,
  DAILY_RESIDENT: 4096,
  DEEP: 8192,
  EFFORT: 8192,
  HARD_BLOCK: 32768,
});

export const APEX_LOCAL_AGENT_SPEED_KEEP_ALIVE = Object.freeze({
  FAST: "30m",
  CODING: "30m",
  FAST_CODER: "5m",
  DEEP: "5m",
  REASONING: "5m",
  MOE: "5m",
  CODER: "5m",
  FALLBACK: "30m",
});

export const APEX_LOCAL_AGENT_SPEED_LANES = Object.freeze({
  [APEX_LOCAL_AGENT_SPEED_LANE_ID.FAST]: Object.freeze({
    id: APEX_LOCAL_AGENT_SPEED_LANE_ID.FAST,
    label: "Fast",
    modelId: APEX_LOCAL_AGENT_SPEED_MODEL.FAST,
    numCtx: APEX_LOCAL_AGENT_SPEED_CONTEXT.FAST,
    maxNumCtx: APEX_LOCAL_AGENT_SPEED_CONTEXT.FAST,
    keepAlive: APEX_LOCAL_AGENT_SPEED_KEEP_ALIVE.FAST,
    maxOutputTokens: 240,
    autoSelectable: true,
    manualOnly: false,
    coderModel: false,
  }),
  [APEX_LOCAL_AGENT_SPEED_LANE_ID.NORMAL]: Object.freeze({
    id: APEX_LOCAL_AGENT_SPEED_LANE_ID.NORMAL,
    label: "Normal",
    modelId: APEX_LOCAL_AGENT_SPEED_MODEL.CODING,
    numCtx: APEX_LOCAL_AGENT_SPEED_CONTEXT.CODING,
    maxNumCtx: APEX_LOCAL_AGENT_SPEED_CONTEXT.CODING,
    keepAlive: APEX_LOCAL_AGENT_SPEED_KEEP_ALIVE.CODING,
    maxOutputTokens: 1400,
    autoSelectable: true,
    manualOnly: false,
    coderModel: false,
  }),
  [APEX_LOCAL_AGENT_SPEED_LANE_ID.CODING]: Object.freeze({
    id: APEX_LOCAL_AGENT_SPEED_LANE_ID.CODING,
    label: "Coding",
    modelId: APEX_LOCAL_AGENT_SPEED_MODEL.CODING,
    numCtx: APEX_LOCAL_AGENT_SPEED_CONTEXT.CODING,
    maxNumCtx: APEX_LOCAL_AGENT_SPEED_CONTEXT.CODING,
    keepAlive: APEX_LOCAL_AGENT_SPEED_KEEP_ALIVE.CODING,
    maxOutputTokens: 1400,
    autoSelectable: true,
    manualOnly: false,
    coderModel: false,
  }),
  [APEX_LOCAL_AGENT_SPEED_LANE_ID.FAST_CODER]: Object.freeze({
    id: APEX_LOCAL_AGENT_SPEED_LANE_ID.FAST_CODER,
    label: "Fast coder",
    modelId: APEX_LOCAL_AGENT_SPEED_MODEL.FAST_CODER,
    numCtx: APEX_LOCAL_AGENT_SPEED_CONTEXT.CODING,
    maxNumCtx: APEX_LOCAL_AGENT_SPEED_CONTEXT.CODING,
    keepAlive: APEX_LOCAL_AGENT_SPEED_KEEP_ALIVE.FAST_CODER,
    maxOutputTokens: 1200,
    autoSelectable: false,
    manualOnly: true,
    coderModel: true,
  }),
  [APEX_LOCAL_AGENT_SPEED_LANE_ID.REASONING]: Object.freeze({
    id: APEX_LOCAL_AGENT_SPEED_LANE_ID.REASONING,
    label: "Reasoning",
    modelId: APEX_LOCAL_AGENT_SPEED_MODEL.REASONING,
    numCtx: APEX_LOCAL_AGENT_SPEED_CONTEXT.EFFORT,
    maxNumCtx: APEX_LOCAL_AGENT_SPEED_CONTEXT.EFFORT,
    keepAlive: APEX_LOCAL_AGENT_SPEED_KEEP_ALIVE.REASONING,
    maxOutputTokens: 1800,
    autoSelectable: false,
    manualOnly: true,
    coderModel: false,
  }),
  [APEX_LOCAL_AGENT_SPEED_LANE_ID.MOE]: Object.freeze({
    id: APEX_LOCAL_AGENT_SPEED_LANE_ID.MOE,
    label: "MoE",
    modelId: APEX_LOCAL_AGENT_SPEED_MODEL.MOE,
    numCtx: APEX_LOCAL_AGENT_SPEED_CONTEXT.EFFORT,
    maxNumCtx: APEX_LOCAL_AGENT_SPEED_CONTEXT.EFFORT,
    keepAlive: APEX_LOCAL_AGENT_SPEED_KEEP_ALIVE.MOE,
    maxOutputTokens: 1800,
    autoSelectable: false,
    manualOnly: true,
    coderModel: false,
  }),
  [APEX_LOCAL_AGENT_SPEED_LANE_ID.CODER]: Object.freeze({
    id: APEX_LOCAL_AGENT_SPEED_LANE_ID.CODER,
    label: "Coder",
    modelId: APEX_LOCAL_AGENT_SPEED_MODEL.CODER_A3B,
    numCtx: APEX_LOCAL_AGENT_SPEED_CONTEXT.EFFORT,
    maxNumCtx: APEX_LOCAL_AGENT_SPEED_CONTEXT.EFFORT,
    keepAlive: APEX_LOCAL_AGENT_SPEED_KEEP_ALIVE.CODER,
    maxOutputTokens: 2200,
    autoSelectable: false,
    manualOnly: true,
    coderModel: true,
  }),
  [APEX_LOCAL_AGENT_SPEED_LANE_ID.DEEP]: Object.freeze({
    id: APEX_LOCAL_AGENT_SPEED_LANE_ID.DEEP,
    label: "Deep",
    modelId: APEX_LOCAL_AGENT_SPEED_MODEL.REASONING,
    numCtx: APEX_LOCAL_AGENT_SPEED_CONTEXT.DEEP,
    maxNumCtx: APEX_LOCAL_AGENT_SPEED_CONTEXT.DEEP,
    keepAlive: APEX_LOCAL_AGENT_SPEED_KEEP_ALIVE.DEEP,
    maxOutputTokens: 2200,
    autoSelectable: false,
    manualOnly: true,
    coderModel: true,
  }),
});

const TEXT_LIMIT = 420;

function text(value = "", limit = TEXT_LIMIT) {
  return String(value ?? "").replace(/\s+\n/g, "\n").replace(/\s+/g, " ").trim().slice(0, limit);
}

function number(value = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function nsToMs(value = 0) {
  const parsed = number(value);
  return parsed ? Math.max(1, Math.round(parsed / 1_000_000)) : 0;
}

function normalizeKeepAlive(value = "", fallback = APEX_LOCAL_AGENT_SPEED_KEEP_ALIVE.FALLBACK) {
  const normalized = text(value || fallback, 24).toLowerCase();
  if (normalized === "-1") return fallback;
  if (/^\d+\s*(ms|s|m|h)$/.test(normalized)) return normalized.replace(/\s+/g, "");
  if (/^\d+$/.test(normalized)) return `${Math.max(1, Math.min(120, Math.round(number(normalized))))}m`;
  return fallback;
}

function normalizeLaneId(value = "") {
  const normalized = text(value, 80).toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
  if (["fast", "speed", "chat", "voice", "summary", "routing"].includes(normalized)) return APEX_LOCAL_AGENT_SPEED_LANE_ID.FAST;
  if (["normal", "standard", "daily", "full", "default"].includes(normalized)) return APEX_LOCAL_AGENT_SPEED_LANE_ID.NORMAL;
  if (["fast-coder", "fast-code", "small-coder", "qwen2-5-coder", "qwen2-5-coder-7b", "qwen25-coder", "qwen25-coder-7b", "7b-coder", "coder-7b"].includes(normalized)) return APEX_LOCAL_AGENT_SPEED_LANE_ID.FAST_CODER;
  if (["coding", "code", "builder", "build", "debug", "review"].includes(normalized)) return APEX_LOCAL_AGENT_SPEED_LANE_ID.CODING;
  if (["reasoning", "reason", "gpt-oss", "gpt-oss-20b", "gpt-oss-20"].includes(normalized)) return APEX_LOCAL_AGENT_SPEED_LANE_ID.REASONING;
  if (["moe", "qwen3-30b-a3b", "qwen-30b-a3b", "30b-a3b"].includes(normalized)) return APEX_LOCAL_AGENT_SPEED_LANE_ID.MOE;
  if (["coder", "coder-a3b", "qwen3-coder-30b-a3b", "qwen3-coder-30b-a3b-q4-k-m"].includes(normalized)) return APEX_LOCAL_AGENT_SPEED_LANE_ID.CODER;
  if (["deep", "deep-coding", "manual-deep", "long-coding", "8192", "coder-deep"].includes(normalized)) return APEX_LOCAL_AGENT_SPEED_LANE_ID.DEEP;
  return "";
}

function normalizeEffortId(value = "") {
  const normalized = text(value, 80).toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
  if (["auto", "automatic", "adaptive", "decide", "you-decide", "apex-decide"].includes(normalized)) return "";
  if (["fast", "speed", "quick", "voice", "short", "status"].includes(normalized)) return APEX_LOCAL_AGENT_EFFORT_ID.FAST;
  if (["normal", "standard", "daily", "full", "chat", "coding", "code", "builder"].includes(normalized)) return APEX_LOCAL_AGENT_EFFORT_ID.NORMAL;
  if (["reasoning", "reason", "gpt-oss", "gpt-oss-20b", "20b"].includes(normalized)) return APEX_LOCAL_AGENT_EFFORT_ID.REASONING;
  if (["moe", "qwen3-30b-a3b", "qwen-30b-a3b", "30b-a3b"].includes(normalized)) return APEX_LOCAL_AGENT_EFFORT_ID.MOE;
  if (["coder", "coding-deep", "qwen3-coder-30b-a3b", "qwen3-coder-30b-a3b-q4-k-m"].includes(normalized)) return APEX_LOCAL_AGENT_EFFORT_ID.CODER;
  if (["deep", "deep-local", "best-local", "best-proven", "manual-deep"].includes(normalized)) return APEX_LOCAL_AGENT_EFFORT_ID.DEEP;
  return "";
}

function rawEffortText(input = {}) {
  return text(input.effort || input.requestedEffort || input.agentEffort || input.selectedEffort || "", 120).toLowerCase();
}

function autoEffortRequested(input = {}) {
  const normalized = rawEffortText(input).replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
  return ["auto", "automatic", "adaptive", "decide", "you-decide", "apex-decide"].includes(normalized);
}

function matchesAny(value = "", patterns = []) {
  return patterns.some((pattern) => pattern.test(value));
}

function messageText(messages = []) {
  return (Array.isArray(messages) ? messages : [])
    .filter((message) => typeof message === "string" || !["system", "developer", "assistant"].includes(String(message?.role || "").toLowerCase()))
    .map((message) => typeof message === "string" ? message : message?.content || "")
    .join(" ");
}

function explicitDeepRequested(input = {}) {
  const combined = text([
    input.requestedLane,
    input.lane,
    input.brainMode,
    input.route,
    input.question,
    input.requestText,
    messageText(input.messages),
  ].filter(Boolean).join(" "), 2000).toLowerCase();
  if (normalizeLaneId(input.requestedLane || input.lane || input.brainMode) === APEX_LOCAL_AGENT_SPEED_LANE_ID.DEEP) return true;
  return matchesAny(combined, [
    /\b(use|switch to|run|manual|explicit)\b.{0,40}\b(deep|long|8192|larger context|big context)\b/i,
    /\b(deep coding|deep coder|coder deep|long coding|8192 context)\b/i,
    /\bqwen3-coder:30b\b.{0,80}\b(deep|8192|longer context|manual|explicit)\b/i,
  ]);
}

function fastCoderRequested(input = {}) {
  const combined = text([
    input.requestedLane,
    input.lane,
    input.brainMode,
    input.route,
    input.question,
    input.requestText,
    messageText(input.messages),
  ].filter(Boolean).join(" "), 2000).toLowerCase();
  if (normalizeLaneId(input.requestedLane || input.lane || input.brainMode) === APEX_LOCAL_AGENT_SPEED_LANE_ID.FAST_CODER) return true;
  return matchesAny(combined, [
    /\b(qwen2\.?5-coder:7b|qwen2\.?5 coder 7b|fast coder|small coder|7b coder)\b/i,
    /\b(use|switch to|run|manual|explicit)\b.{0,40}\b(fast coder|small coder|qwen2\.?5-coder|7b coder)\b/i,
  ]);
}

function explicitReasoningRequested(input = {}) {
  const combined = text([
    input.requestedLane,
    input.lane,
    input.brainMode,
    input.route,
    input.question,
    input.requestText,
    messageText(input.messages),
  ].filter(Boolean).join(" "), 2000).toLowerCase();
  if (normalizeLaneId(input.requestedLane || input.lane || input.brainMode) === APEX_LOCAL_AGENT_SPEED_LANE_ID.REASONING) return true;
  return matchesAny(combined, [
    /\b(use|switch to|run|manual|explicit)\b.{0,48}\b(reasoning|gpt-oss|gpt oss|gpt-oss:20b|20b reasoning)\b/i,
    /\b(reasoning lane|gpt-oss lane|gpt oss lane)\b/i,
  ]);
}

function explicitMoeRequested(input = {}) {
  const combined = text([
    input.requestedLane,
    input.lane,
    input.brainMode,
    input.route,
    input.question,
    input.requestText,
    messageText(input.messages),
  ].filter(Boolean).join(" "), 2000).toLowerCase();
  if (normalizeLaneId(input.requestedLane || input.lane || input.brainMode) === APEX_LOCAL_AGENT_SPEED_LANE_ID.MOE) return true;
  return matchesAny(combined, [
    /\b(use|switch to|run|manual|explicit)\b.{0,48}\b(moe|qwen3:30b-a3b|qwen3 30b a3b|30b-a3b)\b/i,
    /\b(moe lane|30b-a3b lane)\b/i,
  ]);
}

function explicitCoderRequested(input = {}) {
  const combined = text([
    input.requestedLane,
    input.lane,
    input.brainMode,
    input.route,
    input.question,
    input.requestText,
    messageText(input.messages),
  ].filter(Boolean).join(" "), 2000).toLowerCase();
  if (normalizeLaneId(input.requestedLane || input.lane || input.brainMode) === APEX_LOCAL_AGENT_SPEED_LANE_ID.CODER) return true;
  return matchesAny(combined, [
    /\b(use|switch to|run|manual|explicit)\b.{0,48}\b(coder-a3b|qwen3-coder:30b-a3b|qwen3 coder 30b a3b|30b coder)\b/i,
    /\b(coder lane|coder-a3b lane|30b coder lane)\b/i,
  ]);
}

function inputModelNames(input = {}) {
  return [
    ...(Array.isArray(input.modelNames) ? input.modelNames : []),
    ...(Array.isArray(input.availableModels) ? input.availableModels : []),
    ...(Array.isArray(input.installedModels) ? input.installedModels : []),
    ...(Array.isArray(input.localModels) ? input.localModels : []),
  ].map((model) => text(model, 160).toLowerCase()).filter(Boolean);
}

function hasInputModel(input = {}, model = "") {
  const target = text(model, 160).toLowerCase();
  return Boolean(target) && inputModelNames(input).some((name) => name === target);
}

export function normalizeApexLocalAgentEffortId(value = "", fallback = APEX_LOCAL_AGENT_EFFORT_ID.FAST) {
  return normalizeEffortId(value) || fallback;
}

function effortIdFromLaneId(laneId = "") {
  if (laneId === APEX_LOCAL_AGENT_SPEED_LANE_ID.FAST) return APEX_LOCAL_AGENT_EFFORT_ID.FAST;
  if (laneId === APEX_LOCAL_AGENT_SPEED_LANE_ID.NORMAL || laneId === APEX_LOCAL_AGENT_SPEED_LANE_ID.CODING) return APEX_LOCAL_AGENT_EFFORT_ID.NORMAL;
  if (laneId === APEX_LOCAL_AGENT_SPEED_LANE_ID.REASONING) return APEX_LOCAL_AGENT_EFFORT_ID.REASONING;
  if (laneId === APEX_LOCAL_AGENT_SPEED_LANE_ID.MOE) return APEX_LOCAL_AGENT_EFFORT_ID.MOE;
  if (laneId === APEX_LOCAL_AGENT_SPEED_LANE_ID.CODER || laneId === APEX_LOCAL_AGENT_SPEED_LANE_ID.FAST_CODER) return APEX_LOCAL_AGENT_EFFORT_ID.CODER;
  if (laneId === APEX_LOCAL_AGENT_SPEED_LANE_ID.DEEP) return APEX_LOCAL_AGENT_EFFORT_ID.DEEP;
  return APEX_LOCAL_AGENT_EFFORT_ID.FAST;
}

function laneIdFromEffortId(effortId = "") {
  if (effortId === APEX_LOCAL_AGENT_EFFORT_ID.FAST) return APEX_LOCAL_AGENT_SPEED_LANE_ID.FAST;
  if (effortId === APEX_LOCAL_AGENT_EFFORT_ID.NORMAL) return APEX_LOCAL_AGENT_SPEED_LANE_ID.NORMAL;
  if (effortId === APEX_LOCAL_AGENT_EFFORT_ID.REASONING) return APEX_LOCAL_AGENT_SPEED_LANE_ID.REASONING;
  if (effortId === APEX_LOCAL_AGENT_EFFORT_ID.MOE) return APEX_LOCAL_AGENT_SPEED_LANE_ID.MOE;
  if (effortId === APEX_LOCAL_AGENT_EFFORT_ID.CODER) return APEX_LOCAL_AGENT_SPEED_LANE_ID.CODER;
  if (effortId === APEX_LOCAL_AGENT_EFFORT_ID.DEEP) return APEX_LOCAL_AGENT_SPEED_LANE_ID.DEEP;
  return "";
}

function effortLabel(effortId = "") {
  if (effortId === APEX_LOCAL_AGENT_EFFORT_ID.FAST) return "Fast";
  if (effortId === APEX_LOCAL_AGENT_EFFORT_ID.NORMAL) return "Normal";
  if (effortId === APEX_LOCAL_AGENT_EFFORT_ID.REASONING) return "Reasoning";
  if (effortId === APEX_LOCAL_AGENT_EFFORT_ID.MOE) return "MoE";
  if (effortId === APEX_LOCAL_AGENT_EFFORT_ID.CODER) return "Coder";
  if (effortId === APEX_LOCAL_AGENT_EFFORT_ID.DEEP) return "Deep";
  return "Fast";
}

function effortModelInstalled(input = {}, effortId = "") {
  const model = APEX_LOCAL_AGENT_EFFORT_MODEL[effortId] || "";
  return Boolean(model && hasInputModel(input, model));
}

function deepEffortModel(input = {}) {
  const summary = input.benchmarkSummary || input.agentSpeedBenchmarkHistory || input.historySummary || {};
  const recommended = normalizeEffortId(summary.recommendedEffort || summary.effortRecommendation?.recommendedEffort || "");
  if (recommended && recommended !== APEX_LOCAL_AGENT_EFFORT_ID.DEEP && APEX_LOCAL_AGENT_EFFORT_MODEL[recommended]) {
    return {
      effortId: recommended,
      modelId: APEX_LOCAL_AGENT_EFFORT_MODEL[recommended],
      provisional: false,
      reason: `benchmark-recommended-${recommended}`,
    };
  }
  if (hasInputModel(input, APEX_LOCAL_AGENT_SPEED_MODEL.REASONING)) {
    return {
      effortId: APEX_LOCAL_AGENT_EFFORT_ID.REASONING,
      modelId: APEX_LOCAL_AGENT_SPEED_MODEL.REASONING,
      provisional: true,
      reason: "deep-provisional-reasoning-installed",
    };
  }
  if (hasInputModel(input, APEX_LOCAL_AGENT_SPEED_MODEL.MOE)) {
    return {
      effortId: APEX_LOCAL_AGENT_EFFORT_ID.MOE,
      modelId: APEX_LOCAL_AGENT_SPEED_MODEL.MOE,
      provisional: true,
      reason: "deep-provisional-moe-installed",
    };
  }
  return {
    effortId: APEX_LOCAL_AGENT_EFFORT_ID.REASONING,
    modelId: APEX_LOCAL_AGENT_SPEED_MODEL.REASONING,
    provisional: true,
    reason: "deep-provisional-reasoning-model-not-confirmed",
  };
}

function selectedEffortContext(input = {}, effortId = "", stableResidency = null) {
  const requested = Math.round(number(input.numCtx || input.requestedNumCtx));
  const manualEffort = ![APEX_LOCAL_AGENT_EFFORT_ID.FAST, APEX_LOCAL_AGENT_EFFORT_ID.NORMAL].includes(effortId);
  if (!manualEffort) return stableResidency?.residentNumCtx || APEX_LOCAL_AGENT_SPEED_CONTEXT.DAILY_RESIDENT;
  const fallbackCtx = vramLooksTight(input) ? APEX_LOCAL_AGENT_SPEED_CONTEXT.CODING : APEX_LOCAL_AGENT_SPEED_CONTEXT.EFFORT;
  if (requested >= APEX_LOCAL_AGENT_SPEED_CONTEXT.HARD_BLOCK) return fallbackCtx;
  if (requested >= APEX_LOCAL_AGENT_SPEED_CONTEXT.EFFORT && !vramLooksTight(input)) return APEX_LOCAL_AGENT_SPEED_CONTEXT.EFFORT;
  if (requested >= APEX_LOCAL_AGENT_SPEED_CONTEXT.CODING) return APEX_LOCAL_AGENT_SPEED_CONTEXT.CODING;
  return fallbackCtx;
}

export function selectApexLocalAgentEffort(input = {}) {
  const laneId = normalizeLaneId(input.selectedLaneId || input.laneId || input.requestedLane || input.lane || "");
  const requestedEffort = normalizeEffortId(input.effort || input.requestedEffort || input.agentEffort || input.selectedEffort || "");
  const effortId = requestedEffort || effortIdFromLaneId(laneId);
  const stableResidency = input.stableResidency?.provider === APEX_LOCAL_AGENT_STABLE_RESIDENCY_PROVIDER
    ? input.stableResidency
    : buildApexStableResidencyPolicy(input);
  const deepModel = effortId === APEX_LOCAL_AGENT_EFFORT_ID.DEEP ? deepEffortModel(input) : null;
  const resolvedEffortId = effortId === APEX_LOCAL_AGENT_EFFORT_ID.DEEP ? APEX_LOCAL_AGENT_EFFORT_ID.DEEP : effortId;
  const resolvedModel = deepModel?.modelId || APEX_LOCAL_AGENT_EFFORT_MODEL[resolvedEffortId] || APEX_LOCAL_AGENT_SPEED_MODEL.FAST;
  const manualOnly = ![APEX_LOCAL_AGENT_EFFORT_ID.FAST, APEX_LOCAL_AGENT_EFFORT_ID.NORMAL].includes(resolvedEffortId);
  const numCtx = selectedEffortContext(input, resolvedEffortId, stableResidency);
  const modelInstalled = effortId === APEX_LOCAL_AGENT_EFFORT_ID.DEEP
    ? Boolean(deepModel?.modelId && hasInputModel(input, deepModel.modelId))
    : effortModelInstalled(input, resolvedEffortId);
  return Object.freeze({
    provider: "apex-local-agent-effort",
    version: APEX_LOCAL_AGENT_EFFORT_VERSION,
    effortId: resolvedEffortId,
    effortLabel: effortLabel(resolvedEffortId),
    requestedEffort: requestedEffort || "",
    modelId: resolvedModel,
    numCtx,
    keepAlive: manualOnly ? APEX_LOCAL_AGENT_SPEED_KEEP_ALIVE.DEEP : APEX_LOCAL_AGENT_SPEED_KEEP_ALIVE.CODING,
    maxOutputTokens: resolvedEffortId === APEX_LOCAL_AGENT_EFFORT_ID.FAST
      ? 240
      : resolvedEffortId === APEX_LOCAL_AGENT_EFFORT_ID.NORMAL
        ? 1400
        : resolvedEffortId === APEX_LOCAL_AGENT_EFFORT_ID.CODER
          ? 2200
          : 1800,
    temperature: resolvedEffortId === APEX_LOCAL_AGENT_EFFORT_ID.FAST ? 0.12 : 0.16,
    manualOnly,
    autoSelectable: !manualOnly,
    modelInstalled,
    fallback4096Active: manualOnly && numCtx === APEX_LOCAL_AGENT_SPEED_CONTEXT.CODING,
    stableResidentContext: !manualOnly && resolvedModel === APEX_LOCAL_AGENT_SPEED_MODEL.FAST,
    provisionalDeepChoice: Boolean(deepModel?.provisional),
    deepChoiceReason: text(deepModel?.reason || "", 120),
    reasoningOptionRequested: resolvedEffortId === APEX_LOCAL_AGENT_EFFORT_ID.REASONING || resolvedEffortId === APEX_LOCAL_AGENT_EFFORT_ID.DEEP,
    reasoningOptionSupported: false,
    approvedPullModel: APEX_LOCAL_AGENT_EFFORT_APPROVED_PULL_MODELS.includes(resolvedModel),
    noCloudFallback: true,
    openAiUsed: false,
    cloudUsed: false,
  });
}

function requestedResidentNumCtx(input = {}) {
  const requested = Math.round(number(
    input.residentNumCtx
    || input.stableResidentNumCtx
    || input.targetResidentNumCtx
    || input.stableResidency?.residentNumCtx
    || input.stableResidency?.targetNumCtx,
  ));
  if (requested >= APEX_LOCAL_AGENT_SPEED_CONTEXT.HARD_BLOCK) return 0;
  if (requested >= APEX_LOCAL_AGENT_SPEED_CONTEXT.CODING) return APEX_LOCAL_AGENT_SPEED_CONTEXT.CODING;
  if (requested >= APEX_LOCAL_AGENT_SPEED_CONTEXT.FAST) return APEX_LOCAL_AGENT_SPEED_CONTEXT.FAST;
  return 0;
}

function vramLooksTight(input = {}) {
  const statusText = text([
    input.vramStatus,
    input.thresholdStatus,
    input.gpu?.status,
    input.gpu?.thresholdStatus,
    input.residency?.vramStatus,
    input.benchmarkSummary?.stableResidency?.vramStatus,
  ].filter(Boolean).join(" "), 400).toLowerCase();
  if (/\b(tight|overloaded|reload-needed|low-vram|vram-tight|cpu-only)\b/i.test(statusText)) return true;
  const totalMb = number(input.vramTotalMb || input.gpu?.vramTotalMb);
  const usedMb = number(input.vramUsedMb || input.gpu?.vramUsedMb || input.residency?.vramUsedMb);
  if (totalMb && totalMb < 12_000) return true;
  if (totalMb && usedMb && totalMb - usedMb < 1_200) return true;
  return false;
}

function benchmarkRecommendedResidentNumCtx(input = {}) {
  const summary = input.benchmarkSummary || input.agentSpeedBenchmarkHistory || input.historySummary || {};
  if (summary.stableResidency?.status !== "ready") return 0;
  const recommended = Math.round(number(
    summary.recommendedResidentNumCtx
    || summary.stableResidency?.recommendedResidentNumCtx
    || summary.stableResidency?.chosenResidentNumCtx
    || summary.stableResidency?.residentNumCtx,
  ));
  if (recommended >= APEX_LOCAL_AGENT_SPEED_CONTEXT.CODING && recommended < APEX_LOCAL_AGENT_SPEED_CONTEXT.HARD_BLOCK) {
    return APEX_LOCAL_AGENT_SPEED_CONTEXT.CODING;
  }
  if (recommended >= APEX_LOCAL_AGENT_SPEED_CONTEXT.FAST && recommended < APEX_LOCAL_AGENT_SPEED_CONTEXT.CODING) {
    return APEX_LOCAL_AGENT_SPEED_CONTEXT.FAST;
  }
  return 0;
}

export function buildApexStableResidencyPolicy(input = {}) {
  const enabled = input.stableResidencyEnabled !== false;
  const overrideNumCtx = requestedResidentNumCtx(input);
  const benchmarkNumCtx = benchmarkRecommendedResidentNumCtx(input);
  const vramTight = vramLooksTight(input);
  const residentNumCtx = !enabled
    ? APEX_LOCAL_AGENT_SPEED_CONTEXT.FAST
    : overrideNumCtx
      || (vramTight ? APEX_LOCAL_AGENT_SPEED_CONTEXT.FAST : benchmarkNumCtx || APEX_LOCAL_AGENT_SPEED_CONTEXT.DAILY_RESIDENT);
  const residentLane = residentNumCtx >= APEX_LOCAL_AGENT_SPEED_CONTEXT.CODING ? "stable-4096" : "stable-2048";
  const reason = !enabled
    ? "stable-residency-disabled-for-comparison"
    : overrideNumCtx
      ? `operator-resident-context-${overrideNumCtx}`
      : vramTight
        ? "vram-tight-fallback-stable-2048"
        : benchmarkNumCtx
          ? `benchmark-recommended-stable-${benchmarkNumCtx}`
          : "daily-stable-4096-default";

  return Object.freeze({
    provider: APEX_LOCAL_AGENT_STABLE_RESIDENCY_PROVIDER,
    version: APEX_LOCAL_AGENT_SPEED_VERSION,
    enabled,
    residentLane,
    residentModel: APEX_LOCAL_AGENT_SPEED_MODEL.FAST,
    residentNumCtx,
    stable4096Active: enabled && residentNumCtx === APEX_LOCAL_AGENT_SPEED_CONTEXT.CODING,
    fallback2048Active: !enabled || residentNumCtx === APEX_LOCAL_AGENT_SPEED_CONTEXT.FAST,
    fastModeUsesResidentContext: true,
    codingModeUsesResidentContext: true,
    contextSwitchPerTurn: false,
    noPerTurn2048To4096Flip: enabled,
    reason,
    vramTight,
    benchmarkRecommendedNumCtx: benchmarkNumCtx,
    keepAlive: normalizeKeepAlive(input.keepAlive || APEX_LOCAL_AGENT_SPEED_KEEP_ALIVE.FAST),
    keepAlivePermanent: false,
    keepAliveMinusOneBlocked: text(input.keepAlive || "", 24) === "-1",
    no32768: true,
    no30BWarm: true,
    deepModelManualOnly: true,
    openAiUsed: false,
    cloudUsed: false,
    secretsExposed: false,
  });
}

function fastCoderMeasured(input = {}) {
  return Boolean(
    input.fastCoderMeasured
    || input.fastCoderMeasurement?.measured
    || input.fastCoderBenchmark?.measured
    || input.fastCoderBenchmark?.status === "measured"
    || input.fastCoderMeasurement?.status === "measured",
  );
}

function routeIsCoding(input = {}) {
  const combined = text([
    input.route,
    input.question,
    input.requestText,
    messageText(input.messages),
  ].filter(Boolean).join(" "), 2000).toLowerCase();
  return matchesAny(combined, [
    /\b(coding-analysis|source-code|self-fix|builder|build-loop|code-review|repo-analysis)\b/i,
    /\b(code|coding|bug|debug|test failure|failing test|fix this screen|fix this bug|repair this test|patch|diff|refactor|component|endpoint|import error)\b/i,
  ]);
}

function routeIsFast(input = {}) {
  const combined = text([input.route, input.question, input.requestText].filter(Boolean).join(" "), 1000).toLowerCase();
  return !routeIsCoding(input) || matchesAny(combined, [
    /\b(normal-chat|local-chat|safe-summary|task-summary|intent-classification|permission-classification|affective-state|tool-routing|voice-command|readiness|status|summary|summarize|route)\b/i,
  ]);
}

function routeNeedsNormalEffort(input = {}) {
  const combined = text([
    input.route,
    input.question,
    input.requestText,
    messageText(input.messages),
  ].filter(Boolean).join(" "), 2400).toLowerCase();
  if (!combined) return false;
  if (matchesAny(combined, [
    /\b(full answer|complete answer|detailed answer|full detail|all details|all the details|everything you know|tell me everything)\b/i,
    /\b(do not summarize|don't summarize|dont summarize|do not truncate|don't truncate|dont truncate|no short answer)\b/i,
    /\b(explain|break down|breakdown|walk me through|step by step|compare|audit|strategy|architecture|diagnosis)\b/i,
    /\b(detailed plan|full plan|complete plan|show me a plan|make a plan)\b/i,
    /\b(what should we do|what do we do next|how do we|how would we|what's the plan|what is the plan)\b/i,
  ])) return true;
  return combined.length > 420;
}

export function normalizeApexLocalAgentSpeedLaneId(value = "", fallback = APEX_LOCAL_AGENT_SPEED_LANE_ID.FAST) {
  return normalizeLaneId(value) || fallback;
}

export function selectApexLocalAgentSpeedLane(input = {}) {
  const requested = normalizeLaneId(input.requestedLane || input.lane || input.brainMode || "");
  const effortAutoSelected = autoEffortRequested(input);
  const requestedEffort = effortAutoSelected ? "" : normalizeEffortId(input.effort || input.requestedEffort || input.agentEffort || input.selectedEffort || "");
  let laneId = requestedEffort ? laneIdFromEffortId(requestedEffort) : requested || APEX_LOCAL_AGENT_SPEED_LANE_ID.FAST;
  const reasons = [];
  const blockedReasons = [];

  if (effortAutoSelected) {
    reasons.push("auto-effort-selected");
  }

  if (requestedEffort) {
    reasons.push(`manual-${requestedEffort}-effort-selected`);
  } else if (!requested && explicitDeepRequested(input)) {
    laneId = APEX_LOCAL_AGENT_SPEED_LANE_ID.DEEP;
    reasons.push("explicit-deep-coding-request");
  } else if (!requested && explicitReasoningRequested(input)) {
    laneId = APEX_LOCAL_AGENT_SPEED_LANE_ID.REASONING;
    reasons.push("explicit-reasoning-lane-request");
  } else if (!requested && explicitMoeRequested(input)) {
    laneId = APEX_LOCAL_AGENT_SPEED_LANE_ID.MOE;
    reasons.push("explicit-moe-lane-request");
  } else if (!requested && explicitCoderRequested(input)) {
    laneId = APEX_LOCAL_AGENT_SPEED_LANE_ID.CODER;
    reasons.push("explicit-coder-lane-request");
  } else if (requested === APEX_LOCAL_AGENT_SPEED_LANE_ID.DEEP) {
    reasons.push("manual-deep-lane-selected");
  } else if (requested === APEX_LOCAL_AGENT_SPEED_LANE_ID.REASONING) {
    reasons.push("manual-reasoning-lane-selected");
  } else if (requested === APEX_LOCAL_AGENT_SPEED_LANE_ID.MOE) {
    reasons.push("manual-moe-lane-selected");
  } else if (requested === APEX_LOCAL_AGENT_SPEED_LANE_ID.CODER) {
    reasons.push("manual-coder-lane-selected");
  } else if (requested === APEX_LOCAL_AGENT_SPEED_LANE_ID.NORMAL) {
    reasons.push("manual-normal-effort-selected");
  } else if (requested === APEX_LOCAL_AGENT_SPEED_LANE_ID.FAST_CODER || (!requested && fastCoderRequested(input))) {
    if (hasInputModel(input, APEX_LOCAL_AGENT_SPEED_MODEL.FAST_CODER) && fastCoderMeasured(input)) {
      laneId = APEX_LOCAL_AGENT_SPEED_LANE_ID.FAST_CODER;
      reasons.push("manual-fast-coder-lane-selected");
    } else {
      laneId = APEX_LOCAL_AGENT_SPEED_LANE_ID.CODING;
      reasons.push("fast-coder-request-fell-back-to-normal-coding");
      blockedReasons.push("fast-coder-lane-requires-installed-measured-model");
    }
  } else if (requested === APEX_LOCAL_AGENT_SPEED_LANE_ID.CODING) {
    reasons.push("manual-coding-lane-selected");
  } else if (!requested && routeIsCoding(input)) {
    laneId = APEX_LOCAL_AGENT_SPEED_LANE_ID.CODING;
    reasons.push("coding-route-selected");
  } else if (!requested && routeNeedsNormalEffort(input)) {
    laneId = APEX_LOCAL_AGENT_SPEED_LANE_ID.NORMAL;
    reasons.push("auto-normal-effort-for-full-answer");
  } else if (!requested && routeIsFast(input)) {
    laneId = APEX_LOCAL_AGENT_SPEED_LANE_ID.FAST;
    reasons.push("fast-route-selected");
  }

  const lane = APEX_LOCAL_AGENT_SPEED_LANES[laneId] || APEX_LOCAL_AGENT_SPEED_LANES[APEX_LOCAL_AGENT_SPEED_LANE_ID.FAST];
  const stableResidency = input.stableResidency?.provider === APEX_LOCAL_AGENT_STABLE_RESIDENCY_PROVIDER
    ? input.stableResidency
    : buildApexStableResidencyPolicy(input);
  const effort = selectApexLocalAgentEffort({
    ...input,
    selectedLaneId: laneId,
    stableResidency,
  });
  const preserveFastCoderLane = lane.id === APEX_LOCAL_AGENT_SPEED_LANE_ID.FAST_CODER && !requestedEffort;
  const selectedModelId = preserveFastCoderLane ? lane.modelId : effort.modelId;
  const selectedKeepAlive = preserveFastCoderLane ? lane.keepAlive : effort.keepAlive;
  const selectedMaxOutputTokens = preserveFastCoderLane ? lane.maxOutputTokens : effort.maxOutputTokens;
  const selectedManualOnly = Boolean(preserveFastCoderLane ? lane.manualOnly : effort.manualOnly || lane.manualOnly);
  const selectedAutoSelectable = Boolean(preserveFastCoderLane ? lane.autoSelectable : effort.autoSelectable && !lane.manualOnly);
  const selectedCoderModel = Boolean(preserveFastCoderLane ? lane.coderModel : lane.coderModel || effort.effortId === APEX_LOCAL_AGENT_EFFORT_ID.CODER);
  const usesStableResidentContext = Boolean(
    stableResidency.enabled
    && !selectedManualOnly
    && selectedModelId === APEX_LOCAL_AGENT_SPEED_MODEL.FAST
  );
  const effortNumCtx = preserveFastCoderLane ? lane.numCtx : effort.numCtx;
  const defaultRequestedNumCtx = usesStableResidentContext ? stableResidency.residentNumCtx : effortNumCtx;
  const requestedNumCtx = Math.round(number(input.numCtx || input.requestedNumCtx || defaultRequestedNumCtx)) || defaultRequestedNumCtx;
  const oversizedRequested = requestedNumCtx >= APEX_LOCAL_AGENT_SPEED_CONTEXT.HARD_BLOCK;
  const oldLaneNumCtx = oversizedRequested
    ? effortNumCtx
    : Math.max(APEX_LOCAL_AGENT_SPEED_CONTEXT.FAST, Math.min(preserveFastCoderLane ? lane.maxNumCtx : effortNumCtx, requestedNumCtx || effortNumCtx));
  const appliedNumCtx = usesStableResidentContext
    ? stableResidency.residentNumCtx
    : preserveFastCoderLane ? oldLaneNumCtx : effortNumCtx;
  const contextClamped = appliedNumCtx !== requestedNumCtx;
  blockedReasons.push(...[
    selectedManualOnly && !requestedEffort && lane.id === APEX_LOCAL_AGENT_SPEED_LANE_ID.DEEP && !explicitDeepRequested(input) && requested !== APEX_LOCAL_AGENT_SPEED_LANE_ID.DEEP
      ? "deep-lane-requires-explicit-manual-selection"
      : "",
    oversizedRequested ? "32768-context-blocked" : "",
    selectedManualOnly && !effort.modelInstalled && !preserveFastCoderLane ? "selected-effort-model-not-installed" : "",
  ].filter(Boolean));
  const routeSelectionMode = (
    requested
    || requestedEffort
    || explicitDeepRequested(input)
    || explicitReasoningRequested(input)
    || explicitMoeRequested(input)
    || explicitCoderRequested(input)
    || fastCoderRequested(input)
  ) ? "manual" : "automatic";

  return Object.freeze({
    provider: "apex-local-agent-speed",
    version: APEX_LOCAL_AGENT_SPEED_VERSION,
    laneId: lane.id,
    laneLabel: lane.label,
    effortId: effort.effortId,
    effortLabel: effort.effortLabel,
    requestedEffort: requestedEffort || "",
    selectedEffort: effort.effortId,
    effortVersion: effort.version,
    route: text(input.route || "", 120),
    modelId: selectedModelId,
    numCtx: appliedNumCtx,
    behaviorDefaultNumCtx: lane.numCtx,
    residentNumCtx: stableResidency.residentNumCtx,
    residentLane: stableResidency.residentLane,
    stableResidency,
    stableResidentContext: usesStableResidentContext,
    stable4096Active: Boolean(stableResidency.stable4096Active),
    fallback2048Active: Boolean(stableResidency.fallback2048Active),
    contextSwitchPerTurn: !usesStableResidentContext,
    requestedNumCtx,
    maxNumCtx: usesStableResidentContext ? APEX_LOCAL_AGENT_SPEED_CONTEXT.CODING : Math.max(appliedNumCtx, effortNumCtx),
    keepAlive: selectedKeepAlive,
    maxOutputTokens: selectedMaxOutputTokens,
    autoSelectable: selectedAutoSelectable,
    manualOnly: selectedManualOnly,
    modelInstalled: effort.modelInstalled,
    explicitDeepRequested: explicitDeepRequested(input),
    routeSelectionMode,
    effortAutoSelected,
    manualSelection: routeSelectionMode === "manual",
    automaticSelection: routeSelectionMode !== "manual",
    coderModel: selectedCoderModel,
    coderManualOnly: true,
    coderAutoWarm: false,
    deepLaneManualOnly: true,
    deepAutoPromotionAllowed: false,
    effortManualOnly: Boolean(effort.manualOnly),
    effortModelInstalled: effort.modelInstalled,
    provisionalDeepChoice: effort.provisionalDeepChoice,
    deepChoiceReason: effort.deepChoiceReason,
    reasoningOptionRequested: effort.reasoningOptionRequested,
    reasoningOptionSupported: effort.reasoningOptionSupported,
    approvedPullModel: effort.approvedPullModel,
    fastCoderModel: APEX_LOCAL_AGENT_SPEED_MODEL.FAST_CODER,
    fastCoderInstalled: hasInputModel(input, APEX_LOCAL_AGENT_SPEED_MODEL.FAST_CODER),
    fastCoderMeasured: fastCoderMeasured(input),
    noCloudFallback: true,
    reasons: Object.freeze(reasons.length ? reasons : ["default-fast-lane"]),
    blockedReasons: Object.freeze([...new Set(blockedReasons)]),
    contextPolicy: Object.freeze({
      fastDefaultNumCtx: APEX_LOCAL_AGENT_SPEED_CONTEXT.FAST,
      codingDefaultNumCtx: APEX_LOCAL_AGENT_SPEED_CONTEXT.CODING,
      dailyResidentNumCtx: APEX_LOCAL_AGENT_SPEED_CONTEXT.DAILY_RESIDENT,
      residentNumCtx: stableResidency.residentNumCtx,
      stableResidentContext: usesStableResidentContext,
      stable4096Active: Boolean(stableResidency.stable4096Active),
      fallback2048Active: Boolean(stableResidency.fallback2048Active),
      deepExplicitNumCtx: APEX_LOCAL_AGENT_SPEED_CONTEXT.DEEP,
      effortManualNumCtx: APEX_LOCAL_AGENT_SPEED_CONTEXT.EFFORT,
      hardBlockedNumCtx: APEX_LOCAL_AGENT_SPEED_CONTEXT.HARD_BLOCK,
      requestedNumCtx,
      appliedNumCtx,
      contextClamped,
      oversizedContextBlocked: oversizedRequested,
      normalVoiceChatMaxNumCtx: stableResidency.residentNumCtx,
      normalCodingDefaultModel: APEX_LOCAL_AGENT_SPEED_MODEL.CODING,
      reasoningManualModel: APEX_LOCAL_AGENT_SPEED_MODEL.REASONING,
      moeManualModel: APEX_LOCAL_AGENT_SPEED_MODEL.MOE,
      coderManualModel: APEX_LOCAL_AGENT_SPEED_MODEL.CODER_A3B,
      deepCodingManualModel: APEX_LOCAL_AGENT_SPEED_MODEL.DEEP_CODING,
      accidental32768Blocked: oversizedRequested,
    }),
  });
}

export function buildApexLocalAgentSpeedOllamaOptions(input = {}) {
  const lane = input.laneSelection?.provider === "apex-local-agent-speed"
    ? input.laneSelection
    : selectApexLocalAgentSpeedLane(input);
  const maxOutputTokens = Math.max(80, Math.min(2400, Math.round(number(input.maxOutputTokens || lane.maxOutputTokens) || lane.maxOutputTokens)));
  return Object.freeze({
    provider: "apex-local-agent-speed",
    model: lane.modelId,
    laneId: lane.laneId,
    laneLabel: lane.laneLabel,
    effortId: lane.effortId,
    effortLabel: lane.effortLabel,
    keepAlive: lane.keepAlive,
    options: Object.freeze({
      temperature: lane.effortId === APEX_LOCAL_AGENT_EFFORT_ID.FAST ? 0.12 : 0.16,
      num_ctx: lane.numCtx,
      num_predict: Math.min(maxOutputTokens, lane.maxOutputTokens),
    }),
    contextPolicy: lane.contextPolicy,
    noCloudFallback: true,
    coderAutoWarm: false,
    routeSelectionMode: lane.routeSelectionMode,
    deepAutoPromotionAllowed: false,
    reasoningOptionRequested: Boolean(lane.reasoningOptionRequested),
    reasoningOptionSupported: Boolean(lane.reasoningOptionSupported),
  });
}

export function buildApexLocalAgentWarmResidencyPlan(input = {}) {
  const keepWarmEnabled = input.keepWarmEnabled !== undefined ? Boolean(input.keepWarmEnabled) : Boolean(input.apexOpen || input.runtimeActive);
  const stableResidency = input.stableResidency?.provider === APEX_LOCAL_AGENT_STABLE_RESIDENCY_PROVIDER
    ? input.stableResidency
    : buildApexStableResidencyPolicy({
        ...input,
        keepAlive: input.keepAlive,
      });
  const lane = selectApexLocalAgentSpeedLane({
    route: input.route || "",
    requestedLane: input.activeLane || input.lane || input.requestedLane || "",
    numCtx: input.numCtx || input.requestedNumCtx,
    question: input.question || "",
    modelNames: input.modelNames,
    fastCoderMeasured: input.fastCoderMeasured,
    stableResidency,
  });
  const requestedModel = text(input.keepWarmModel || input.model || APEX_LOCAL_AGENT_SPEED_MODEL.FAST, 160);
  const requestedKeepAlive = normalizeKeepAlive(input.keepAlive || stableResidency.keepAlive || lane.keepAlive);
  const blockedReasons = [];
  if (!keepWarmEnabled) blockedReasons.push("keep-warm-disabled");
  if (requestedModel && requestedModel !== APEX_LOCAL_AGENT_SPEED_MODEL.FAST) blockedReasons.push("only-qwen3-14b-can-be-kept-warm");
  if (lane.laneId === APEX_LOCAL_AGENT_SPEED_LANE_ID.DEEP) blockedReasons.push("deep-30b-is-manual-only-not-kept-warm");
  if (lane.laneId === APEX_LOCAL_AGENT_SPEED_LANE_ID.FAST_CODER) blockedReasons.push("fast-coder-is-manual-only-not-kept-warm");
  if (lane.contextPolicy.oversizedContextBlocked) blockedReasons.push("32768-context-blocked");
  const warmLaneId = stableResidency.residentLane;
  const warmNumCtx = stableResidency.residentNumCtx;
  const blocked = blockedReasons.some((reason) => !["32768-context-blocked"].includes(reason));
  return Object.freeze({
    provider: "apex-local-agent-speed",
    receiptType: "warm-residency-plan",
    version: APEX_LOCAL_AGENT_SPEED_VERSION,
    status: !keepWarmEnabled ? "disabled" : blocked ? "blocked" : "ready",
    enabled: keepWarmEnabled && !blocked,
    targetModel: APEX_LOCAL_AGENT_SPEED_MODEL.FAST,
    targetNumCtx: warmNumCtx,
    activeLane: warmLaneId,
    requestedLane: lane.laneId,
    stableResidency,
    stable4096Active: Boolean(stableResidency.stable4096Active),
    fallback2048Active: Boolean(stableResidency.fallback2048Active),
    contextSwitchPerTurn: false,
    requestedModel,
    keepAlive: requestedKeepAlive,
    keepAlivePermanent: false,
    keepAliveMinusOneBlocked: requestedKeepAlive !== text(input.keepAlive || lane.keepAlive, 24).toLowerCase() && text(input.keepAlive || "", 24) === "-1",
    deepModel: APEX_LOCAL_AGENT_SPEED_MODEL.DEEP_CODING,
    deepModelWarmAllowed: false,
    coderAutoWarm: false,
    deepAutoPromotionAllowed: false,
    noCloudFallback: true,
    blockedReasons: Object.freeze([...new Set(blockedReasons)]),
    contextPolicy: Object.freeze({
      defaultWarmNumCtx: APEX_LOCAL_AGENT_SPEED_CONTEXT.FAST,
      codingWarmNumCtx: APEX_LOCAL_AGENT_SPEED_CONTEXT.CODING,
      dailyResidentNumCtx: APEX_LOCAL_AGENT_SPEED_CONTEXT.DAILY_RESIDENT,
      residentNumCtx: stableResidency.residentNumCtx,
      hardBlockedNumCtx: APEX_LOCAL_AGENT_SPEED_CONTEXT.HARD_BLOCK,
      requestedNumCtx: lane.requestedNumCtx,
      appliedNumCtx: warmNumCtx,
      oversizedContextBlocked: Boolean(lane.contextPolicy.oversizedContextBlocked),
      accidental32768Blocked: Boolean(lane.contextPolicy.accidental32768Blocked),
    }),
    openAiUsed: false,
    cloudUsed: false,
    rawPromptStored: false,
    rawResponseStored: false,
    secretsExposed: false,
  });
}

export function parseOllamaTimingStats(payload = {}) {
  const totalDurationMs = nsToMs(payload.total_duration ?? payload.totalDuration);
  const loadDurationMs = nsToMs(payload.load_duration ?? payload.loadDuration);
  const promptEvalDurationMs = nsToMs(payload.prompt_eval_duration ?? payload.promptEvalDuration);
  const generationDurationMs = nsToMs(payload.eval_duration ?? payload.evalDuration);
  const firstTokenLatencyMs = Math.round(number(
    payload.first_token_latency_ms
    ?? payload.firstTokenLatencyMs
    ?? payload.first_token_latency
    ?? payload.firstTokenLatency,
  ));
  return Object.freeze({
    totalDurationMs,
    loadDurationMs,
    promptEvalDurationMs,
    generationDurationMs,
    promptEvalCount: Math.round(number(payload.prompt_eval_count ?? payload.promptEvalCount)),
    generationEvalCount: Math.round(number(payload.eval_count ?? payload.evalCount)),
    firstTokenLatencyMs,
    firstTokenLatencyAvailable: Boolean(firstTokenLatencyMs),
    firstTokenLatencyReason: firstTokenLatencyMs ? "ollama-stream-first-token" : "ollama-non-stream-response",
  });
}

export function buildApexLocalAgentAdaptiveLaneNotes(input = {}) {
  const lane = input.laneSelection?.provider === "apex-local-agent-speed"
    ? input.laneSelection
    : selectApexLocalAgentSpeedLane(input);
  const stats = input.timingStats?.totalDurationMs !== undefined
    ? input.timingStats
    : parseOllamaTimingStats(input.responsePayload || {});
  const totalDurationMs = Math.round(number(stats.totalDurationMs || input.totalDurationMs || input.responseTimingMs));
  const promptEvalDurationMs = Math.round(number(stats.promptEvalDurationMs));
  const generationDurationMs = Math.round(number(stats.generationDurationMs));
  const hasTiming = Boolean(totalDurationMs || promptEvalDurationMs || generationDurationMs || stats.promptEvalCount || stats.generationEvalCount);
  const codingSignal = lane.laneId === APEX_LOCAL_AGENT_SPEED_LANE_ID.CODING || lane.laneId === APEX_LOCAL_AGENT_SPEED_LANE_ID.FAST_CODER || routeIsCoding(input);
  const deepLaneActive = lane.laneId === APEX_LOCAL_AGENT_SPEED_LANE_ID.DEEP;
  const deepLaneSuggested = Boolean(
    !deepLaneActive
    && codingSignal
    && hasTiming
    && (
      totalDurationMs >= 25_000
      || promptEvalDurationMs >= 12_000
      || generationDurationMs >= 18_000
    ),
  );
  const likelyEnough = Boolean(hasTiming && !deepLaneSuggested && totalDurationMs <= 20_000);
  return Object.freeze({
    provider: "apex-local-agent-speed",
    receiptType: "adaptive-lane-notes",
    version: APEX_LOCAL_AGENT_SPEED_VERSION,
    status: hasTiming ? deepLaneSuggested ? "suggest-deep-manual" : "lane-likely-enough" : "insufficient-timing-data",
    selectedLane: lane.laneId,
    selectedEffort: lane.effortId,
    selectedModel: lane.modelId,
    numCtx: lane.numCtx,
    routeSelectionMode: lane.routeSelectionMode || "automatic",
    automaticRoute: lane.automaticSelection !== false,
    manualRoute: Boolean(lane.manualSelection),
    timingObserved: hasTiming,
    likelyEnough,
    deepLaneSuggested,
    suggestedLane: deepLaneSuggested ? APEX_LOCAL_AGENT_SPEED_LANE_ID.DEEP : lane.laneId,
    suggestedModel: deepLaneSuggested ? APEX_LOCAL_AGENT_SPEED_MODEL.REASONING : lane.modelId,
    suggestionReason: deepLaneSuggested
      ? "normal-coding-lane-was-slow-enough-to-suggest-manual-deep-effort-next-time"
      : hasTiming
        ? "current-lane-timing-does-not-justify-manual-deep-coding"
        : "timing-data-needed-before-tuning",
    autoPromoteTo30B: false,
    deepManualOnly: true,
    noCloudFallback: true,
    totalDurationMs,
    promptEvalDurationMs,
    generationDurationMs,
    promptEvalCount: Math.round(number(stats.promptEvalCount)),
    generationEvalCount: Math.round(number(stats.generationEvalCount)),
  });
}

export function buildApexLocalAgentBenchmarkReceipt(input = {}) {
  const lane = input.laneSelection?.provider === "apex-local-agent-speed"
    ? input.laneSelection
    : selectApexLocalAgentSpeedLane(input);
  const stats = input.timingStats?.totalDurationMs !== undefined
    ? input.timingStats
    : parseOllamaTimingStats(input.responsePayload || {});
  const residency = input.residency || {};
  const beforeResidency = input.beforeResidency || input.previousResidency || {};
  const totalDurationMs = Math.round(number(stats.totalDurationMs || input.totalDurationMs || input.responseTimingMs));
  const previousResidentNumCtx = Math.round(number(beforeResidency.numCtx || beforeResidency.residentNumCtx));
  const currentResidentNumCtx = Math.round(number(residency.numCtx || input.residentNumCtx || lane.numCtx));
  const contextSwitchHappened = input.contextSwitchHappened !== undefined
    ? Boolean(input.contextSwitchHappened)
    : Boolean(previousResidentNumCtx && currentResidentNumCtx && previousResidentNumCtx !== currentResidentNumCtx);
  const warmResidencyReused = input.warmResidencyReused !== undefined
    ? Boolean(input.warmResidencyReused)
    : Boolean(previousResidentNumCtx && previousResidentNumCtx === lane.numCtx && !contextSwitchHappened && !residency.reloadNeeded);
  const adaptiveLaneNotes = input.adaptiveLaneNotes?.provider === "apex-local-agent-speed"
    ? input.adaptiveLaneNotes
    : buildApexLocalAgentAdaptiveLaneNotes({
        ...input,
        laneSelection: lane,
        timingStats: stats,
        totalDurationMs,
      });
  return Object.freeze({
    provider: "apex-local-agent-speed",
    receiptType: "local-agent-benchmark",
    version: APEX_LOCAL_AGENT_SPEED_VERSION,
    status: input.status || "completed",
    route: text(input.route || lane.route || "", 120),
    laneId: lane.laneId,
    laneLabel: lane.laneLabel,
    selectedLane: lane.laneId,
    effortId: lane.effortId,
    effort: lane.effortId,
    effortLabel: lane.effortLabel,
    selectedEffort: lane.effortId,
    effortManualOnly: Boolean(lane.effortManualOnly || lane.manualOnly),
    effortModelInstalled: Boolean(lane.effortModelInstalled),
    modelUsed: text(input.modelUsed || lane.modelId, 160),
    selectedModel: text(input.modelUsed || lane.modelId, 160),
    numCtx: lane.numCtx,
    selectedNumCtx: lane.numCtx,
    residentLane: text(input.residentLane || lane.residentLane || lane.stableResidency?.residentLane || "", 80),
    residentNumCtx: Math.round(number(input.residentNumCtx || lane.residentNumCtx || lane.stableResidency?.residentNumCtx || lane.numCtx)),
    stable4096Active: Boolean(input.stable4096Active ?? lane.stable4096Active),
    fallback2048Active: Boolean(input.fallback2048Active ?? lane.fallback2048Active),
    stableResidentContext: Boolean(lane.stableResidentContext),
    residencyPatternId: text(input.residencyPatternId || input.patternId || "", 80),
    residencyPatternLabel: text(input.residencyPatternLabel || input.patternLabel || "", 120),
    turnIndex: Math.round(number(input.turnIndex)),
    contextSwitchHappened,
    contextSwitchAvoided: Boolean(!contextSwitchHappened && lane.stableResidentContext),
    warmResidencyReused,
    previousResidentNumCtx,
    currentResidentNumCtx,
    keepAlive: lane.keepAlive,
    routeSelectionMode: lane.routeSelectionMode || "automatic",
    laneChoiceReason: text((lane.reasons || []).join(", ") || "default-fast-lane", 220),
    laneChoiceReasons: Object.freeze([...(lane.reasons || [])]),
    manualSelection: Boolean(lane.manualSelection),
    automaticSelection: lane.automaticSelection !== false,
    vramStatus: text(residency.vramStatus || input.vramStatus || "", 80),
    runtimeResidentNumCtx: Math.round(number(residency.numCtx)),
    residencyReloadNeeded: Boolean(residency.reloadNeeded),
    modelVramUsedMb: Math.round(number(residency.vramUsedMb || input.modelVramUsedMb)),
    firstTokenLatencyMs: Math.round(number(stats.firstTokenLatencyMs)),
    firstTokenLatencyAvailable: Boolean(stats.firstTokenLatencyAvailable),
    firstTokenLatencyReason: text(stats.firstTokenLatencyReason || "", 120),
    totalDurationMs,
    loadDurationMs: Math.round(number(stats.loadDurationMs)),
    promptEvalDurationMs: Math.round(number(stats.promptEvalDurationMs)),
    generationDurationMs: Math.round(number(stats.generationDurationMs)),
    promptEvalCount: Math.round(number(stats.promptEvalCount)),
    generationEvalCount: Math.round(number(stats.generationEvalCount)),
    adaptiveLaneNotes,
    queueMs: Math.round(number(input.queueReceipt?.queuedMs)),
    runMs: Math.round(number(input.queueReceipt?.runMs)),
    contextPolicy: lane.contextPolicy,
    outputCap: Math.round(number(lane.maxOutputTokens)),
    maxOutputTokens: Math.round(number(lane.maxOutputTokens)),
    reasoningOptionRequested: Boolean(lane.reasoningOptionRequested),
    reasoningOptionSupported: Boolean(lane.reasoningOptionSupported),
    provisionalDeepChoice: Boolean(lane.provisionalDeepChoice),
    deepChoiceReason: text(lane.deepChoiceReason || "", 120),
    reloadOrSpillSuspected: Boolean(residency.reloadNeeded || residency.contextTooLarge || residency.contextExceedsActiveLane || /spill|reload|tight/i.test(String(residency.vramStatus || input.vramStatus || ""))),
    coderAutoWarm: false,
    deepAutoPromotionAllowed: false,
    deepManualOnly: true,
    noCloudFallback: true,
    openAiUsed: false,
    cloudUsed: false,
    rawPromptStored: false,
    rawResponseStored: false,
    secretsExposed: false,
    createdAt: text(input.createdAt || new Date().toISOString(), 80),
  });
}

function benchmarkGroupStats(receipts = [], patternId = "") {
  const rows = receipts.filter((receipt) => text(receipt.residencyPatternId || "", 80) === patternId && receipt.status === "completed");
  const values = (field) => rows.map((row) => number(row[field])).filter((value) => value > 0);
  const avg = (field) => {
    const rowsForField = values(field);
    return rowsForField.length
      ? Math.round(rowsForField.reduce((sum, value) => sum + value, 0) / rowsForField.length)
      : 0;
  };
  const contextSwitchCount = rows.filter((row) => row.contextSwitchHappened).length;
  const reloadNeededCount = rows.filter((row) => row.residencyReloadNeeded).length;
  const tightCount = rows.filter((row) => /tight|reload-needed|overloaded/i.test(text(row.vramStatus || "", 80))).length;
  return Object.freeze({
    patternId,
    completedCount: rows.length,
    averageTotalDurationMs: avg("totalDurationMs"),
    averageFirstTokenLatencyMs: avg("firstTokenLatencyMs"),
    averageLoadDurationMs: avg("loadDurationMs"),
    averagePromptEvalDurationMs: avg("promptEvalDurationMs"),
    averageGenerationDurationMs: avg("generationDurationMs"),
    contextSwitchCount,
    reloadNeededCount,
    vramTightCount: tightCount,
    vramHealthy: rows.length > 0 && tightCount === 0,
  });
}

export function buildApexStableResidencyBenchmarkSummary(input = {}) {
  const receipts = (Array.isArray(input.receipts) ? input.receipts : [])
    .filter((receipt) => receipt && typeof receipt === "object");
  const stable2048 = benchmarkGroupStats(receipts, "stable-2048");
  const stable4096 = benchmarkGroupStats(receipts, "stable-4096");
  const alternating = benchmarkGroupStats(receipts, "alternating-2048-4096");
  const stable4096Supported = Boolean(stable4096.completedCount && stable4096.vramHealthy);
  const chosenResidentNumCtx = stable4096Supported
    ? APEX_LOCAL_AGENT_SPEED_CONTEXT.CODING
    : APEX_LOCAL_AGENT_SPEED_CONTEXT.FAST;
  const chosenResidentLane = chosenResidentNumCtx === APEX_LOCAL_AGENT_SPEED_CONTEXT.CODING
    ? "stable-4096"
    : "stable-2048";
  const alternatingPenaltyMs = alternating.averageTotalDurationMs && stable4096.averageTotalDurationMs
    ? Math.max(0, alternating.averageTotalDurationMs - stable4096.averageTotalDurationMs)
    : 0;
  return Object.freeze({
    provider: APEX_LOCAL_AGENT_STABLE_RESIDENCY_PROVIDER,
    receiptType: "stable-residency-benchmark-summary",
    version: APEX_LOCAL_AGENT_SPEED_VERSION,
    status: stable2048.completedCount || stable4096.completedCount || alternating.completedCount ? "ready" : "empty",
    stable2048,
    stable4096,
    alternating2048And4096: alternating,
    stable4096Supported,
    chosenResidentLane,
    chosenResidentNumCtx,
    recommendedResidentNumCtx: chosenResidentNumCtx,
    alternatingPenaltyMs,
    contextSwitchingReduced: Boolean(stable4096Supported || stable2048.completedCount),
    reason: stable4096Supported
      ? "stable-4096-completed-with-healthy-vram"
      : stable4096.completedCount
        ? "stable-4096-vram-tight-fallback-2048"
        : "stable-4096-not-measured-yet-fallback-2048",
    no30BWarm: true,
    deepManualOnly: true,
    noCloudFallback: true,
    rawPromptStored: false,
    rawResponseStored: false,
    secretsExposed: false,
    summary: stable4096Supported
      ? `Stable 4096 is the selected resident context. Alternating context penalty observed: ${alternatingPenaltyMs || 0} ms average.`
      : "Stable 2048 remains the fallback resident context until stable 4096 has healthy local evidence.",
  });
}

function surfaceFromPath(path = "") {
  const normalized = text(path, 240).toLowerCase();
  if (normalized.startsWith("src/")) return "frontend";
  if (normalized.startsWith("server/")) return "server";
  if (normalized.startsWith("shared/")) return "shared";
  if (normalized.startsWith("docs/")) return "docs";
  if (normalized.startsWith("scripts/")) return "scripts";
  if (/test\./i.test(normalized) || /\.test\./i.test(normalized)) return "tests";
  return "repo";
}

export function buildApexLocalCodingSpeedPrepReceipt(input = {}) {
  const changedFiles = (Array.isArray(input.changedFiles) ? input.changedFiles : [])
    .map((file) => ({
      path: text(file?.path || file, 240),
      status: text(file?.status || file?.statusCode || "changed", 80),
    }))
    .filter((file) => file.path)
    .slice(0, 24);
  const surfaceCounts = changedFiles.reduce((counts, file) => {
    const surface = surfaceFromPath(file.path);
    counts[surface] = (counts[surface] || 0) + 1;
    return counts;
  }, {});
  const topSurfaces = Object.entries(surfaceCounts)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([surface, count]) => `${surface}:${count}`)
    .slice(0, 6);
  return Object.freeze({
    provider: "apex-local-agent-speed",
    receiptType: "local-coding-speed-prep",
    version: "v1",
    status: changedFiles.length ? "ready" : "idle",
    changedFileCount: changedFiles.length,
    topSurfaces: Object.freeze(topSurfaces),
    fileRows: Object.freeze(changedFiles.slice(0, 8).map((file) => Object.freeze({
      path: file.path,
      status: file.status,
      surface: surfaceFromPath(file.path),
    }))),
    recommendedLane: changedFiles.length ? APEX_LOCAL_AGENT_SPEED_LANE_ID.CODING : APEX_LOCAL_AGENT_SPEED_LANE_ID.FAST,
    recommendedModel: changedFiles.length ? APEX_LOCAL_AGENT_SPEED_MODEL.CODING : APEX_LOCAL_AGENT_SPEED_MODEL.FAST,
    recommendedNumCtx: changedFiles.length ? APEX_LOCAL_AGENT_SPEED_CONTEXT.CODING : APEX_LOCAL_AGENT_SPEED_CONTEXT.FAST,
    deepModel: APEX_LOCAL_AGENT_SPEED_MODEL.DEEP_CODING,
    deepLaneManualOnly: true,
    autoPromoteTo30B: false,
    noKnowledgeGraphBuilt: true,
    noFileCrawlerAdded: true,
    fieldDataIncluded: false,
    noCloudFallback: true,
    secretsExposed: false,
    summary: changedFiles.length
      ? `${changedFiles.length} changed local file${changedFiles.length === 1 ? "" : "s"} can be summarized with a compact coding lane receipt before any deeper analysis.`
      : "No changed local files are reported; fast lane is enough unless John asks for coding work.",
  });
}

export function buildApexLocalAgentBenchmarkHistorySummary(input = {}) {
  const receipts = (Array.isArray(input.receipts) ? input.receipts : [])
    .filter((receipt) => receipt && typeof receipt === "object")
    .filter((receipt) => receipt.receiptType === "local-agent-benchmark" || receipt.provider === "apex-local-agent-speed")
    .slice(-50);
  const completed = receipts.filter((receipt) => receipt.status === "completed");
  const timed = completed.filter((receipt) => number(receipt.totalDurationMs) > 0);
  const avg = (field) => {
    const values = timed.map((receipt) => number(receipt[field])).filter((value) => value > 0);
    if (!values.length) return 0;
    return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
  };
  const latest = receipts[receipts.length - 1] || {};
  const fastest = timed.reduce((best, receipt) => {
    if (!best || number(receipt.totalDurationMs) < number(best.totalDurationMs)) return receipt;
    return best;
  }, null);
  const slowest = timed.reduce((best, receipt) => {
    if (!best || number(receipt.totalDurationMs) > number(best.totalDurationMs)) return receipt;
    return best;
  }, null);
  const laneCounts = completed.reduce((counts, receipt) => {
    const laneId = text(receipt.laneId || "unknown", 40) || "unknown";
    counts[laneId] = (counts[laneId] || 0) + 1;
    return counts;
  }, {});
  const effortCounts = completed.reduce((counts, receipt) => {
    const effortId = text(receipt.effortId || receipt.effort || "unknown", 40) || "unknown";
    counts[effortId] = (counts[effortId] || 0) + 1;
    return counts;
  }, {});
  const deepSuggestedCount = completed.filter((receipt) => receipt.adaptiveLaneNotes?.deepLaneSuggested).length;
  const latestTimingLabel = number(latest.totalDurationMs) ? `${Math.round(number(latest.totalDurationMs))} ms` : "no timing yet";
  const stableResidency = buildApexStableResidencyBenchmarkSummary({ receipts });
  return Object.freeze({
    provider: "apex-local-agent-speed",
    receiptType: "benchmark-history-summary",
    version: APEX_LOCAL_AGENT_SPEED_VERSION,
    status: receipts.length ? "ready" : "empty",
    receiptCount: receipts.length,
    completedCount: completed.length,
    skippedCount: receipts.filter((receipt) => receipt.status === "skipped").length,
    failedCount: receipts.filter((receipt) => receipt.status === "failed").length,
    averageTotalDurationMs: avg("totalDurationMs"),
    averageLoadDurationMs: avg("loadDurationMs"),
    averagePromptEvalDurationMs: avg("promptEvalDurationMs"),
    averageGenerationDurationMs: avg("generationDurationMs"),
    averageFirstTokenLatencyMs: avg("firstTokenLatencyMs"),
    firstTokenSamples: timed.filter((receipt) => number(receipt.firstTokenLatencyMs) > 0).length,
    latest: Object.freeze({
      laneId: text(latest.laneId || "", 40),
      effortId: text(latest.effortId || latest.effort || "", 40),
      modelUsed: text(latest.modelUsed || "", 160),
      numCtx: Math.round(number(latest.numCtx)),
      totalDurationMs: Math.round(number(latest.totalDurationMs)),
      loadDurationMs: Math.round(number(latest.loadDurationMs)),
      promptEvalDurationMs: Math.round(number(latest.promptEvalDurationMs)),
      generationDurationMs: Math.round(number(latest.generationDurationMs)),
      firstTokenLatencyMs: Math.round(number(latest.firstTokenLatencyMs)),
      createdAt: text(latest.createdAt || "", 80),
    }),
    fastest: fastest ? Object.freeze({
      laneId: text(fastest.laneId || "", 40),
      modelUsed: text(fastest.modelUsed || "", 160),
      numCtx: Math.round(number(fastest.numCtx)),
      totalDurationMs: Math.round(number(fastest.totalDurationMs)),
    }) : null,
    slowest: slowest ? Object.freeze({
      laneId: text(slowest.laneId || "", 40),
      modelUsed: text(slowest.modelUsed || "", 160),
      numCtx: Math.round(number(slowest.numCtx)),
      totalDurationMs: Math.round(number(slowest.totalDurationMs)),
    }) : null,
    laneCounts: Object.freeze(laneCounts),
    effortCounts: Object.freeze(effortCounts),
    deepSuggestedCount,
    stableResidency,
    recommendedResidentNumCtx: stableResidency.recommendedResidentNumCtx,
    chosenResidentLane: stableResidency.chosenResidentLane,
    autoPromoteTo30B: false,
    deepManualOnly: true,
    noCloudFallback: true,
    summary: receipts.length
      ? `Last local benchmark: ${text(latest.laneId || "lane", 40)} on ${text(latest.modelUsed || "local model", 120)} at ctx ${Math.round(number(latest.numCtx)) || "unknown"} finished in ${latestTimingLabel}. Average total ${avg("totalDurationMs") || 0} ms over ${timed.length} timed run${timed.length === 1 ? "" : "s"}.`
      : "No local benchmark history yet. Apex will not run benchmarks unless John asks.",
    rawPromptStored: false,
    rawResponseStored: false,
    secretsExposed: false,
  });
}

function effortOrderValue(effortId = "") {
  const order = [
    APEX_LOCAL_AGENT_EFFORT_ID.FAST,
    APEX_LOCAL_AGENT_EFFORT_ID.NORMAL,
    APEX_LOCAL_AGENT_EFFORT_ID.REASONING,
    APEX_LOCAL_AGENT_EFFORT_ID.MOE,
    APEX_LOCAL_AGENT_EFFORT_ID.CODER,
    APEX_LOCAL_AGENT_EFFORT_ID.DEEP,
  ];
  const index = order.indexOf(effortId);
  return index === -1 ? 99 : index;
}

export function buildApexEffortModelInstallStatus(input = {}) {
  const modelNames = inputModelNames(input);
  const pullResults = Array.isArray(input.pullResults) ? input.pullResults : [];
  const models = APEX_LOCAL_AGENT_EFFORT_APPROVED_PULL_MODELS.map((model) => {
    const pull = pullResults.find((row) => text(row?.model || "", 160).toLowerCase() === model.toLowerCase()) || {};
    return Object.freeze({
      model,
      installed: modelNames.includes(model.toLowerCase()),
      approvedForPull: true,
      pullStatus: text(pull.status || "", 80),
      pullAttempted: Boolean(pull.status),
      reason: text(pull.reason || "", 160),
    });
  });
  const missingModels = models.filter((row) => !row.installed).map((row) => row.model);
  return Object.freeze({
    provider: "apex-local-agent-effort",
    receiptType: "effort-model-install-status",
    version: APEX_LOCAL_AGENT_EFFORT_VERSION,
    status: missingModels.length ? "missing-approved-models" : "ready",
    modelCount: modelNames.length,
    models: Object.freeze(models),
    missingModels: Object.freeze(missingModels),
    approvedPullModels: APEX_LOCAL_AGENT_EFFORT_APPROVED_PULL_MODELS,
    openAiUsed: false,
    cloudUsed: false,
    rawPromptStored: false,
    rawResponseStored: false,
    secretsExposed: false,
  });
}

export function buildApexEffortModelBenchmarkSummary(input = {}) {
  const receipts = (Array.isArray(input.receipts) ? input.receipts : [])
    .filter((receipt) => receipt && typeof receipt === "object");
  const completed = receipts.filter((receipt) => receipt.status === "completed" && number(receipt.totalDurationMs) > 0);
  const byEffort = completed.reduce((groups, receipt) => {
    const effortId = normalizeEffortId(receipt.effortId || receipt.effort || "") || text(receipt.laneId || "unknown", 40);
    if (!groups[effortId]) groups[effortId] = [];
    groups[effortId].push(receipt);
    return groups;
  }, {});
  const effortRows = Object.entries(byEffort)
    .map(([effortId, rows]) => {
      const avg = (field) => {
        const values = rows.map((row) => number(row[field])).filter((value) => value > 0);
        return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
      };
      const fastest = rows.reduce((best, row) => {
        if (!best || number(row.totalDurationMs) < number(best.totalDurationMs)) return row;
        return best;
      }, null);
      return Object.freeze({
        effortId,
        effortLabel: effortLabel(effortId),
        model: text(fastest?.modelUsed || fastest?.selectedModel || "", 160),
        numCtx: Math.round(number(fastest?.numCtx)),
        completedCount: rows.length,
        averageTotalDurationMs: avg("totalDurationMs"),
        averageFirstTokenLatencyMs: avg("firstTokenLatencyMs"),
        averageLoadDurationMs: avg("loadDurationMs"),
        fastestTotalDurationMs: Math.round(number(fastest?.totalDurationMs)),
        reloadOrSpillSuspected: rows.some((row) => row.reloadOrSpillSuspected || row.residencyReloadNeeded),
        manualOnly: ![APEX_LOCAL_AGENT_EFFORT_ID.FAST, APEX_LOCAL_AGENT_EFFORT_ID.NORMAL].includes(effortId),
      });
    })
    .sort((left, right) => effortOrderValue(left.effortId) - effortOrderValue(right.effortId));
  const localManualRows = effortRows.filter((row) => row.manualOnly && !row.reloadOrSpillSuspected && row.completedCount);
  const recommendedManual = localManualRows.reduce((best, row) => {
    if (!best) return row;
    if (!row.averageTotalDurationMs) return best;
    if (!best.averageTotalDurationMs || row.averageTotalDurationMs < best.averageTotalDurationMs) return row;
    return best;
  }, null);
  const recommendedEffort = recommendedManual?.effortId || APEX_LOCAL_AGENT_EFFORT_ID.REASONING;
  return Object.freeze({
    provider: "apex-local-agent-effort",
    receiptType: "effort-model-benchmark-summary",
    version: APEX_LOCAL_AGENT_EFFORT_VERSION,
    status: effortRows.length ? "ready" : "empty",
    completedCount: completed.length,
    effortRows: Object.freeze(effortRows),
    recommendedEffort,
    recommendedModel: APEX_LOCAL_AGENT_EFFORT_MODEL[recommendedEffort] || APEX_LOCAL_AGENT_SPEED_MODEL.REASONING,
    recommendedDefaultEffort: APEX_LOCAL_AGENT_EFFORT_ID.FAST,
    recommendedDailyModel: APEX_LOCAL_AGENT_SPEED_MODEL.FAST,
    recommendedDailyNumCtx: APEX_LOCAL_AGENT_SPEED_CONTEXT.DAILY_RESIDENT,
    deepManualOnly: true,
    no30BWarm: true,
    no32768: true,
    noCloudFallback: true,
    openAiUsed: false,
    cloudUsed: false,
    rawPromptStored: false,
    rawResponseStored: false,
    secretsExposed: false,
    summary: effortRows.length
      ? `Daily default remains ${APEX_LOCAL_AGENT_SPEED_MODEL.FAST} at ctx ${APEX_LOCAL_AGENT_SPEED_CONTEXT.DAILY_RESIDENT}. Manual deep recommendation: ${recommendedEffort}.`
      : "No effort benchmark rows yet; Reasoning remains the provisional manual deep effort.",
  });
}
