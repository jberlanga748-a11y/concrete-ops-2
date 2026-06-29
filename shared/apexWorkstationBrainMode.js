export const APEX_WORKSTATION_BRAIN_PROFILE_ID = Object.freeze({
  SPEED: "speed",
  BALANCED: "balanced",
  WORKSTATION: "workstation",
  DEEP: "deep",
  CODING: "coding",
  DEDICATED: "dedicated",
});

export const APEX_WORKSTATION_BRAIN_ENV = Object.freeze({
  MODE: "APEX_WORKSTATION_BRAIN_MODE",
  DEDICATED_ENABLED: "APEX_WORKSTATION_BRAIN_DEDICATED_ENABLED",
  ALLOW_PERMANENT_KEEP_ALIVE: "APEX_WORKSTATION_BRAIN_ALLOW_PERMANENT_KEEP_ALIVE",
});

export const APEX_WORKSTATION_BRAIN_MODE_DECISION = Object.freeze({
  STABLE: "stable",
  HOLD_CURRENT_PROFILE: "hold-current-profile",
  ELIGIBLE_FOR_PROMOTION_TEST: "eligible-for-measured-promotion-test",
  ROLLBACK_TO_PREVIOUS_STABLE: "rollback-to-previous-stable-tier",
});

export const APEX_WORKSTATION_BRAIN_SOFT_VRAM_MB = 13_500;
export const APEX_WORKSTATION_BRAIN_HARD_VRAM_MB = 14_500;
export const APEX_WORKSTATION_BRAIN_DEFAULT_MODEL = "qwen3:14b";
export const APEX_WORKSTATION_BRAIN_CODING_MODEL = "qwen3-coder:30b";
export const APEX_WORKSTATION_BRAIN_NORMAL_CTX = 2048;
export const APEX_WORKSTATION_BRAIN_BALANCED_CTX = 4096;
export const APEX_WORKSTATION_BRAIN_MAX_QWEN3_CTX = 4096;

export const APEX_WORKSTATION_BRAIN_DIRECT_OPERATOR_PERSONA = [
  "Apex is John's private local workstation operator.",
  "Apex should be direct, action-first, and practical.",
  "Apex should not use review-first language, generic AI disclaimers, corporate tone, or unnecessary caution.",
  "Apex may execute local reversible Apex-owned tasks, coding tasks, diagnostics, cleanup, and repairs through existing controlled Builder/Self-Fix/tooling paths.",
  "Apex must still pause before irreversible or external actions: deletion, deploy, production, schema/auth/session, secrets, permission weakening, sends, spend, orders, bookings, or customer-visible actions.",
].join(" ");

const SHORT_LIMIT = 220;
const PROFILE_ALIASES = Object.freeze({
  speed: APEX_WORKSTATION_BRAIN_PROFILE_ID.SPEED,
  quick: APEX_WORKSTATION_BRAIN_PROFILE_ID.SPEED,
  light: APEX_WORKSTATION_BRAIN_PROFILE_ID.SPEED,
  fast: APEX_WORKSTATION_BRAIN_PROFILE_ID.SPEED,
  normal: APEX_WORKSTATION_BRAIN_PROFILE_ID.SPEED,
  chat: APEX_WORKSTATION_BRAIN_PROFILE_ID.SPEED,
  voice: APEX_WORKSTATION_BRAIN_PROFILE_ID.SPEED,
  turbo: APEX_WORKSTATION_BRAIN_PROFILE_ID.SPEED,
  instant: APEX_WORKSTATION_BRAIN_PROFILE_ID.SPEED,
  baseline: APEX_WORKSTATION_BRAIN_PROFILE_ID.BALANCED,
  balanced: APEX_WORKSTATION_BRAIN_PROFILE_ID.BALANCED,
  balance: APEX_WORKSTATION_BRAIN_PROFILE_ID.BALANCED,
  warm: APEX_WORKSTATION_BRAIN_PROFILE_ID.WORKSTATION,
  workstation: APEX_WORKSTATION_BRAIN_PROFILE_ID.WORKSTATION,
  work: APEX_WORKSTATION_BRAIN_PROFILE_ID.WORKSTATION,
  deep: APEX_WORKSTATION_BRAIN_PROFILE_ID.DEEP,
  reasoning: APEX_WORKSTATION_BRAIN_PROFILE_ID.DEEP,
  coding: APEX_WORKSTATION_BRAIN_PROFILE_ID.CODING,
  coder: APEX_WORKSTATION_BRAIN_PROFILE_ID.CODING,
  build: APEX_WORKSTATION_BRAIN_PROFILE_ID.CODING,
  builder: APEX_WORKSTATION_BRAIN_PROFILE_ID.CODING,
  dedicated: APEX_WORKSTATION_BRAIN_PROFILE_ID.DEDICATED,
});

export const APEX_WORKSTATION_BRAIN_PROFILES = Object.freeze({
  [APEX_WORKSTATION_BRAIN_PROFILE_ID.SPEED]: Object.freeze({
    id: APEX_WORKSTATION_BRAIN_PROFILE_ID.SPEED,
    label: "Normal",
    aliases: Object.freeze(["speed", "quick", "light", "fast", "normal", "chat", "voice", "turbo", "instant"]),
    modelId: APEX_WORKSTATION_BRAIN_DEFAULT_MODEL,
    numCtx: APEX_WORKSTATION_BRAIN_NORMAL_CTX,
    keepAlive: "10m",
    defaultProfile: true,
    taskScoped: true,
    speedLane: true,
    maxOutputTokens: 240,
    promotionTargetNumCtx: 4096,
    preparedOnly: false,
  }),
  [APEX_WORKSTATION_BRAIN_PROFILE_ID.BALANCED]: Object.freeze({
    id: APEX_WORKSTATION_BRAIN_PROFILE_ID.BALANCED,
    label: "Balanced",
    aliases: Object.freeze(["baseline", "balanced"]),
    modelId: APEX_WORKSTATION_BRAIN_DEFAULT_MODEL,
    numCtx: APEX_WORKSTATION_BRAIN_BALANCED_CTX,
    keepAlive: "15m",
    defaultProfile: false,
    taskScoped: false,
    promotionTargetNumCtx: 0,
    preparedOnly: false,
  }),
  [APEX_WORKSTATION_BRAIN_PROFILE_ID.WORKSTATION]: Object.freeze({
    id: APEX_WORKSTATION_BRAIN_PROFILE_ID.WORKSTATION,
    label: "Workstation",
    aliases: Object.freeze(["workstation", "warm"]),
    modelId: APEX_WORKSTATION_BRAIN_DEFAULT_MODEL,
    numCtx: APEX_WORKSTATION_BRAIN_BALANCED_CTX,
    keepAlive: "15m",
    defaultProfile: false,
    taskScoped: false,
    promotionTargetNumCtx: 16384,
    preparedOnly: false,
  }),
  [APEX_WORKSTATION_BRAIN_PROFILE_ID.DEEP]: Object.freeze({
    id: APEX_WORKSTATION_BRAIN_PROFILE_ID.DEEP,
    label: "Deep",
    aliases: Object.freeze(["deep", "reasoning"]),
    modelId: APEX_WORKSTATION_BRAIN_DEFAULT_MODEL,
    numCtx: APEX_WORKSTATION_BRAIN_BALANCED_CTX,
    keepAlive: "15m",
    defaultProfile: false,
    taskScoped: true,
    promotionTargetNumCtx: 16384,
    preparedOnly: false,
  }),
  [APEX_WORKSTATION_BRAIN_PROFILE_ID.CODING]: Object.freeze({
    id: APEX_WORKSTATION_BRAIN_PROFILE_ID.CODING,
    label: "Coding",
    aliases: Object.freeze(["coding", "coder", "build", "builder"]),
    modelId: APEX_WORKSTATION_BRAIN_CODING_MODEL,
    numCtx: APEX_WORKSTATION_BRAIN_BALANCED_CTX,
    keepAlive: "5m",
    defaultProfile: false,
    taskScoped: true,
    promotionTargetNumCtx: 0,
    preparedOnly: false,
  }),
  [APEX_WORKSTATION_BRAIN_PROFILE_ID.DEDICATED]: Object.freeze({
    id: APEX_WORKSTATION_BRAIN_PROFILE_ID.DEDICATED,
    label: "Dedicated",
    aliases: Object.freeze(["dedicated"]),
    modelId: APEX_WORKSTATION_BRAIN_DEFAULT_MODEL,
    numCtx: APEX_WORKSTATION_BRAIN_BALANCED_CTX,
    keepAlive: "15m",
    defaultProfile: false,
    taskScoped: false,
    promotionTargetNumCtx: 0,
    preparedOnly: true,
  }),
});

const apexWorkstationBrainState = {
  activeProfileId: APEX_WORKSTATION_BRAIN_PROFILE_ID.SPEED,
  previousStableProfileId: APEX_WORKSTATION_BRAIN_PROFILE_ID.SPEED,
  dedicatedEnabled: false,
  allowPermanentKeepAlive: false,
  codingActive: false,
  lastModeReceipt: null,
  lastModelReceipt: null,
  lastRollbackReason: "",
  lastPromotionDecision: APEX_WORKSTATION_BRAIN_MODE_DECISION.STABLE,
};

function text(value = "", limit = SHORT_LIMIT) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, limit);
}

function bool(value) {
  return value === true || /^(1|true|yes|on|enabled)$/i.test(String(value || "").trim());
}

function number(value = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function nowIso(value = "") {
  return text(value || new Date().toISOString(), 80);
}

function freeze(value) {
  if (Array.isArray(value)) return Object.freeze(value.map(freeze));
  if (value && typeof value === "object") {
    return Object.freeze(Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, freeze(entry)])));
  }
  return value;
}

export function normalizeApexWorkstationBrainProfileId(value = "", fallback = APEX_WORKSTATION_BRAIN_PROFILE_ID.SPEED) {
  const normalized = text(value, 80).toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
  return PROFILE_ALIASES[normalized] || APEX_WORKSTATION_BRAIN_PROFILES[normalized]?.id || fallback;
}

export function getApexWorkstationBrainProfile(profileId = APEX_WORKSTATION_BRAIN_PROFILE_ID.SPEED, options = {}) {
  const normalized = normalizeApexWorkstationBrainProfileId(profileId);
  const profile = APEX_WORKSTATION_BRAIN_PROFILES[normalized] || APEX_WORKSTATION_BRAIN_PROFILES[APEX_WORKSTATION_BRAIN_PROFILE_ID.SPEED];
  if (profile.id !== APEX_WORKSTATION_BRAIN_PROFILE_ID.DEDICATED) return profile;
  const dedicatedEnabled = bool(options.dedicatedEnabled);
  const allowPermanentKeepAlive = bool(options.allowPermanentKeepAlive);
  return Object.freeze({
    ...profile,
    canUseNow: dedicatedEnabled,
    keepAlive: dedicatedEnabled && allowPermanentKeepAlive ? "-1" : profile.keepAlive,
    keepAlivePermanent: dedicatedEnabled && allowPermanentKeepAlive,
  });
}

export function readApexWorkstationBrainConfig(input = {}) {
  const env = input.env || {};
  const activeProfileId = normalizeApexWorkstationBrainProfileId(
    input.mode || env[APEX_WORKSTATION_BRAIN_ENV.MODE] || apexWorkstationBrainState.activeProfileId,
  );
  const dedicatedEnabled = bool(input.dedicatedEnabled ?? env[APEX_WORKSTATION_BRAIN_ENV.DEDICATED_ENABLED] ?? apexWorkstationBrainState.dedicatedEnabled);
  const allowPermanentKeepAlive = bool(input.allowPermanentKeepAlive ?? env[APEX_WORKSTATION_BRAIN_ENV.ALLOW_PERMANENT_KEEP_ALIVE] ?? apexWorkstationBrainState.allowPermanentKeepAlive);
  return Object.freeze({
    provider: "apex-workstation-brain",
    activeProfileId,
    dedicatedEnabled,
    allowPermanentKeepAlive: dedicatedEnabled && allowPermanentKeepAlive,
    softVramThresholdMb: APEX_WORKSTATION_BRAIN_SOFT_VRAM_MB,
    hardVramThresholdMb: APEX_WORKSTATION_BRAIN_HARD_VRAM_MB,
    openAiUsed: false,
    cloudDefault: "disabled",
    secretsExposed: false,
  });
}

function routeSuggestsCoding(route = "") {
  return /\b(coding-analysis|coding|coder|builder|build|self-fix|repair|repo|source-code)\b/i.test(String(route || ""));
}

function routeSuggestsDeep(route = "") {
  return /\b(deep|research|synthesis|document|planning|knowledge|complex-reasoning|risk-review)\b/i.test(String(route || ""));
}

function routeSuggestsSpeed(route = "") {
  return /\b(normal-chat|local-chat|safe-summary|task-summary|intent-classification|permission-classification|affective-state|tool-routing|voice-command|readiness|status)\b/i.test(String(route || ""));
}

export function selectApexWorkstationBrainProfileForRoute(input = {}) {
  const config = input.config?.provider === "apex-workstation-brain"
    ? input.config
    : readApexWorkstationBrainConfig(input);
  const requestedProfileId = input.requestedProfile
    ? normalizeApexWorkstationBrainProfileId(input.requestedProfile)
    : "";
  const activeProfileId = normalizeApexWorkstationBrainProfileId(input.activeProfileId || config.activeProfileId);
  let selectedProfileId = requestedProfileId || activeProfileId || APEX_WORKSTATION_BRAIN_PROFILE_ID.SPEED;
  const route = text(input.route || "", 120);
  const fallbackReasons = [];

  if (!requestedProfileId && routeSuggestsCoding(route)) {
    selectedProfileId = APEX_WORKSTATION_BRAIN_PROFILE_ID.CODING;
  } else if (!requestedProfileId && activeProfileId === APEX_WORKSTATION_BRAIN_PROFILE_ID.CODING) {
    fallbackReasons.push("coding-active-non-coding-route-stays-on-main-brain");
    selectedProfileId = routeSuggestsDeep(route)
      ? APEX_WORKSTATION_BRAIN_PROFILE_ID.DEEP
      : routeSuggestsSpeed(route)
        ? APEX_WORKSTATION_BRAIN_PROFILE_ID.SPEED
        : APEX_WORKSTATION_BRAIN_PROFILE_ID.SPEED;
  } else if (!requestedProfileId && activeProfileId !== APEX_WORKSTATION_BRAIN_PROFILE_ID.CODING && routeSuggestsDeep(route)) {
    selectedProfileId = APEX_WORKSTATION_BRAIN_PROFILE_ID.DEEP;
  } else if (
    !requestedProfileId
    && routeSuggestsSpeed(route)
    && [APEX_WORKSTATION_BRAIN_PROFILE_ID.BALANCED, APEX_WORKSTATION_BRAIN_PROFILE_ID.SPEED].includes(activeProfileId)
  ) {
    selectedProfileId = APEX_WORKSTATION_BRAIN_PROFILE_ID.SPEED;
  }

  if (selectedProfileId === APEX_WORKSTATION_BRAIN_PROFILE_ID.DEDICATED && !config.dedicatedEnabled) {
    fallbackReasons.push("dedicated-mode-prepared-but-not-enabled");
    selectedProfileId = APEX_WORKSTATION_BRAIN_PROFILE_ID.BALANCED;
  }

  const profile = getApexWorkstationBrainProfile(selectedProfileId, config);
  return Object.freeze({
    provider: "apex-workstation-brain",
    profileId: profile.id,
    activeProfileId,
    requestedProfileId,
    route,
    label: profile.label,
    modelId: profile.modelId,
    numCtx: profile.numCtx,
    keepAlive: profile.keepAlive,
    keepAlivePermanent: Boolean(profile.keepAlivePermanent),
    taskScoped: Boolean(profile.taskScoped),
    speedLane: Boolean(profile.speedLane),
    maxOutputTokens: number(profile.maxOutputTokens),
    promotionTargetNumCtx: number(profile.promotionTargetNumCtx),
    dedicatedEnabled: Boolean(config.dedicatedEnabled),
    allowPermanentKeepAlive: Boolean(config.allowPermanentKeepAlive),
    fallbackReasons: Object.freeze(fallbackReasons),
  });
}

export function buildApexWorkstationBrainOllamaOptions(input = {}) {
  const selection = input.profileSelection?.provider === "apex-workstation-brain"
    ? input.profileSelection
    : selectApexWorkstationBrainProfileForRoute(input);
  const maxOutputTokens = number(input.maxOutputTokens || input.numPredict || 0);
  const profileMaxOutputTokens = number(selection.maxOutputTokens);
  const requestedNumCtx = Math.max(APEX_WORKSTATION_BRAIN_NORMAL_CTX, Math.round(number(selection.numCtx) || APEX_WORKSTATION_BRAIN_NORMAL_CTX));
  const qwen3MainBrain = selection.modelId === APEX_WORKSTATION_BRAIN_DEFAULT_MODEL;
  const boundedNumCtx = qwen3MainBrain
    ? Math.min(requestedNumCtx, APEX_WORKSTATION_BRAIN_MAX_QWEN3_CTX)
    : requestedNumCtx;
  const boundedOutputTokens = maxOutputTokens
    ? Math.max(80, Math.min(profileMaxOutputTokens || 2400, 2400, Math.round(maxOutputTokens)))
    : profileMaxOutputTokens
      ? Math.max(80, Math.min(2400, Math.round(profileMaxOutputTokens)))
      : 0;
  return Object.freeze({
    model: selection.modelId,
    keepAlive: selection.keepAlive,
    options: Object.freeze({
      temperature: selection.speedLane ? 0.15 : 0.2,
      num_ctx: boundedNumCtx,
      ...(boundedOutputTokens ? { num_predict: boundedOutputTokens } : {}),
    }),
    contextClamp: Object.freeze({
      requestedNumCtx,
      appliedNumCtx: boundedNumCtx,
      clamped: boundedNumCtx !== requestedNumCtx,
      maxQwen3NumCtx: APEX_WORKSTATION_BRAIN_MAX_QWEN3_CTX,
    }),
  });
}

export function buildApexWorkstationBrainTelemetry(input = {}) {
  const profileSelection = input.profileSelection?.provider === "apex-workstation-brain"
    ? input.profileSelection
    : selectApexWorkstationBrainProfileForRoute(input);
  const modelProcessor = input.modelProcessor || {};
  const gpu = input.gpu || {};
  const vramUsedMb = number(input.vramUsedMb || gpu.vramUsedMb || modelProcessor.vramUsedMb);
  const vramTotalMb = number(input.vramTotalMb || gpu.vramTotalMb || modelProcessor.vramTotalMb);
  const processor = text(input.processor || modelProcessor.processor || gpu.processor || (gpu.available ? "gpu" : "unknown"), 80) || "unknown";
  const thresholdStatus = vramUsedMb >= APEX_WORKSTATION_BRAIN_HARD_VRAM_MB
    ? "hard-rollback"
    : vramUsedMb >= APEX_WORKSTATION_BRAIN_SOFT_VRAM_MB
      ? "soft-threshold"
      : "stable";
  const lastPromotionDecision = thresholdStatus === "hard-rollback"
    ? APEX_WORKSTATION_BRAIN_MODE_DECISION.ROLLBACK_TO_PREVIOUS_STABLE
    : thresholdStatus === "soft-threshold"
      ? APEX_WORKSTATION_BRAIN_MODE_DECISION.HOLD_CURRENT_PROFILE
      : profileSelection.promotionTargetNumCtx
        ? APEX_WORKSTATION_BRAIN_MODE_DECISION.ELIGIBLE_FOR_PROMOTION_TEST
        : APEX_WORKSTATION_BRAIN_MODE_DECISION.STABLE;
  const rollbackReason = thresholdStatus === "hard-rollback"
    ? `VRAM ${Math.round(vramUsedMb)} MB crossed the ${APEX_WORKSTATION_BRAIN_HARD_VRAM_MB} MB hard threshold; reduce context to previous stable tier and compact only through an existing helper.`
    : "";

  return Object.freeze({
    provider: "apex-workstation-brain",
    activeMode: profileSelection.profileId,
    modelId: profileSelection.modelId,
    numCtx: profileSelection.numCtx,
    keepAlive: profileSelection.keepAlive,
    keepAlivePermanent: Boolean(profileSelection.keepAlivePermanent),
    speedLane: Boolean(profileSelection.speedLane),
    maxOutputTokens: number(profileSelection.maxOutputTokens),
    processor,
    vramUsedMb: Math.round(vramUsedMb),
    vramTotalMb: Math.round(vramTotalMb),
    softVramThresholdMb: APEX_WORKSTATION_BRAIN_SOFT_VRAM_MB,
    hardVramThresholdMb: APEX_WORKSTATION_BRAIN_HARD_VRAM_MB,
    thresholdStatus,
    timeToFirstTokenMs: number(input.timeToFirstTokenMs),
    responseTimingMs: Math.round(number(input.responseTimingMs || modelProcessor.responseTimingMs)),
    modelAlreadyLoaded: Boolean(input.modelAlreadyLoaded || modelProcessor.modelAlreadyLoaded),
    modelLoaded: Boolean(input.modelLoaded || modelProcessor.modelLoaded || modelProcessor.modelAlreadyLoaded || modelProcessor.processor),
    lastPromotionDecision,
    rollbackReason,
    compactionStatus: thresholdStatus === "hard-rollback" ? "compaction-needed" : "not-needed",
    conversationDeleted: false,
    broadRuntimeReset: false,
    openAiUsed: false,
    cloudUsed: false,
    rawPromptStored: false,
    rawResponseStored: false,
    metadataSafeForTrace: true,
  });
}

export function registerApexWorkstationBrainModelReceipt(receipt = {}) {
  const safeReceipt = freeze({
    provider: "apex-workstation-brain",
    ...receipt,
    rawPromptStored: false,
    rawResponseStored: false,
    openAiUsed: false,
    cloudUsed: false,
    recordedAt: nowIso(receipt.recordedAt),
  });
  apexWorkstationBrainState.lastModelReceipt = safeReceipt;
  apexWorkstationBrainState.lastPromotionDecision = safeReceipt.lastPromotionDecision || apexWorkstationBrainState.lastPromotionDecision;
  if (safeReceipt.thresholdStatus === "hard-rollback") {
    apexWorkstationBrainState.lastRollbackReason = safeReceipt.rollbackReason || "hard-vram-threshold";
    apexWorkstationBrainState.activeProfileId = apexWorkstationBrainState.previousStableProfileId || APEX_WORKSTATION_BRAIN_PROFILE_ID.SPEED;
  } else if (safeReceipt.thresholdStatus === "stable" && safeReceipt.activeMode && safeReceipt.activeMode !== APEX_WORKSTATION_BRAIN_PROFILE_ID.CODING) {
    apexWorkstationBrainState.previousStableProfileId = safeReceipt.activeMode;
  }
  return safeReceipt;
}

export function inferApexWorkstationBrainCommand(question = "") {
  const normalized = text(question, 500).toLowerCase();
  if (!normalized) return Object.freeze({ action: "", profileId: "", status: "not-detected" });
  if (/\b(clear the screen|go quiet|quiet down)\b/i.test(normalized)) {
    return Object.freeze({ action: "screen-or-voice", profileId: "", status: "not-brain-command" });
  }
  if (/\b(what brain are you using|check your brain status|brain status|what model are you using|what model is running)\b/i.test(normalized)) {
    return Object.freeze({ action: "status", profileId: "", status: "detected" });
  }
  if (/\b(are you using (your )?gpu|gpu status|vram|local gpu)\b/i.test(normalized)) {
    return Object.freeze({ action: "gpu-status", profileId: "", status: "detected" });
  }
  if (/\b(use speed mode|speed mode|use fast mode|fast mode|use quick mode|quick mode|turbo mode|instant mode|max speed|maximum speed)\b/i.test(normalized)) {
    return Object.freeze({ action: "set-profile", profileId: APEX_WORKSTATION_BRAIN_PROFILE_ID.SPEED, status: "detected" });
  }
  if (/\b(use balanced mode|balanced mode|baseline mode|use baseline)\b/i.test(normalized)) {
    return Object.freeze({ action: "set-profile", profileId: APEX_WORKSTATION_BRAIN_PROFILE_ID.BALANCED, status: "detected" });
  }
  if (/\b(use workstation mode|workstation mode|warm mode|use warm mode)\b/i.test(normalized)) {
    return Object.freeze({ action: "set-profile", profileId: APEX_WORKSTATION_BRAIN_PROFILE_ID.WORKSTATION, status: "detected" });
  }
  if (/\b(use deep mode|deep mode)\b/i.test(normalized)) {
    return Object.freeze({ action: "set-profile", profileId: APEX_WORKSTATION_BRAIN_PROFILE_ID.DEEP, status: "detected" });
  }
  if (/\b(start coding mode|use coding mode|coding mode|start coder mode)\b/i.test(normalized)) {
    return Object.freeze({ action: "start-coding", profileId: APEX_WORKSTATION_BRAIN_PROFILE_ID.CODING, status: "detected" });
  }
  if (/\b(stop coding|pause building|stop building|pause coding)\b/i.test(normalized)) {
    return Object.freeze({ action: "stop-coding", profileId: APEX_WORKSTATION_BRAIN_PROFILE_ID.SPEED, status: "detected" });
  }
  if (/\b(enable dedicated mode|use dedicated mode|dedicated mode on)\b/i.test(normalized)) {
    return Object.freeze({ action: "enable-dedicated", profileId: APEX_WORKSTATION_BRAIN_PROFILE_ID.DEDICATED, status: "detected" });
  }
  if (/\b(disable dedicated mode|dedicated mode off|leave dedicated mode)\b/i.test(normalized)) {
    return Object.freeze({ action: "disable-dedicated", profileId: APEX_WORKSTATION_BRAIN_PROFILE_ID.SPEED, status: "detected" });
  }
  return Object.freeze({ action: "", profileId: "", status: "not-detected" });
}

export function applyApexWorkstationBrainCommand(input = {}) {
  const command = input.command?.status === "detected" || input.command?.status === "not-brain-command"
    ? input.command
    : inferApexWorkstationBrainCommand(input.question || input.text || "");
  const previousProfileId = apexWorkstationBrainState.activeProfileId || APEX_WORKSTATION_BRAIN_PROFILE_ID.SPEED;
  let changed = false;
  let status = command.status === "detected" ? "recorded" : "ignored";
  let profileId = previousProfileId;
  let summary = "No workstation brain mode change was requested.";

  if (command.action === "set-profile") {
    profileId = normalizeApexWorkstationBrainProfileId(command.profileId);
    apexWorkstationBrainState.activeProfileId = profileId;
    apexWorkstationBrainState.codingActive = profileId === APEX_WORKSTATION_BRAIN_PROFILE_ID.CODING;
    changed = profileId !== previousProfileId;
    summary = `Apex switched local brain mode to ${getApexWorkstationBrainProfile(profileId, apexWorkstationBrainState).label}.`;
  } else if (command.action === "start-coding") {
    profileId = APEX_WORKSTATION_BRAIN_PROFILE_ID.CODING;
    apexWorkstationBrainState.activeProfileId = profileId;
    apexWorkstationBrainState.codingActive = true;
    changed = profileId !== previousProfileId;
    summary = "Apex prepared Coding Mode with qwen3-coder:30b for scoped Builder/Self-Fix work. It did not edit files or kill processes.";
  } else if (command.action === "stop-coding") {
    profileId = APEX_WORKSTATION_BRAIN_PROFILE_ID.SPEED;
    apexWorkstationBrainState.activeProfileId = profileId;
    apexWorkstationBrainState.codingActive = false;
    changed = previousProfileId !== profileId;
    summary = "Apex stopped Apex-owned Coding Mode routing and returned to Normal. No unrelated process was killed.";
  } else if (command.action === "enable-dedicated") {
    profileId = APEX_WORKSTATION_BRAIN_PROFILE_ID.DEDICATED;
    apexWorkstationBrainState.dedicatedEnabled = true;
    apexWorkstationBrainState.activeProfileId = profileId;
    apexWorkstationBrainState.codingActive = false;
    changed = previousProfileId !== profileId;
    summary = "Apex enabled Dedicated Mode for this local server process only. Permanent keep-alive still requires explicit local config.";
  } else if (command.action === "disable-dedicated") {
    profileId = APEX_WORKSTATION_BRAIN_PROFILE_ID.SPEED;
    apexWorkstationBrainState.dedicatedEnabled = false;
    apexWorkstationBrainState.activeProfileId = profileId;
    apexWorkstationBrainState.codingActive = false;
    changed = previousProfileId !== profileId;
    summary = "Apex disabled Dedicated Mode and returned to Normal.";
  } else if (command.action === "status" || command.action === "gpu-status") {
    status = "status-only";
    summary = "Apex checked workstation brain status without changing mode.";
  }

  const selection = selectApexWorkstationBrainProfileForRoute({
    activeProfileId: apexWorkstationBrainState.activeProfileId,
    requestedProfile: ["set-profile", "start-coding", "enable-dedicated", "disable-dedicated", "stop-coding"].includes(command.action)
      ? profileId
      : "",
    dedicatedEnabled: apexWorkstationBrainState.dedicatedEnabled,
    allowPermanentKeepAlive: apexWorkstationBrainState.allowPermanentKeepAlive,
  });
  const receipt = freeze({
    provider: "apex-workstation-brain",
    status,
    action: command.action || "",
    changed,
    previousProfileId,
    activeProfileId: selection.profileId,
    modelId: selection.modelId,
    numCtx: selection.numCtx,
    keepAlive: selection.keepAlive,
    dedicatedEnabled: apexWorkstationBrainState.dedicatedEnabled,
    codingActive: apexWorkstationBrainState.codingActive,
    summary,
    stoppedApexOwnedCodingOnly: command.action === "stop-coding",
    noUnrelatedProcessKilled: true,
    externalActionsExecuted: false,
    openAiUsed: false,
    cloudUsed: false,
    secretsExposed: false,
    createdAt: nowIso(input.now),
  });
  apexWorkstationBrainState.lastModeReceipt = receipt;
  return receipt;
}

export function getApexWorkstationBrainRuntimeState() {
  return freeze({
    provider: "apex-workstation-brain",
    activeProfileId: apexWorkstationBrainState.activeProfileId,
    previousStableProfileId: apexWorkstationBrainState.previousStableProfileId,
    dedicatedEnabled: apexWorkstationBrainState.dedicatedEnabled,
    allowPermanentKeepAlive: apexWorkstationBrainState.allowPermanentKeepAlive,
    codingActive: apexWorkstationBrainState.codingActive,
    lastModeReceipt: apexWorkstationBrainState.lastModeReceipt,
    lastModelReceipt: apexWorkstationBrainState.lastModelReceipt,
    lastRollbackReason: apexWorkstationBrainState.lastRollbackReason,
    lastPromotionDecision: apexWorkstationBrainState.lastPromotionDecision,
  });
}

export function buildApexWorkstationBrainStatus(input = {}) {
  const runtimeState = input.runtimeState?.provider === "apex-workstation-brain"
    ? input.runtimeState
    : getApexWorkstationBrainRuntimeState();
  const config = input.config?.provider === "apex-workstation-brain"
    ? input.config
    : readApexWorkstationBrainConfig({
      ...input,
      mode: runtimeState.activeProfileId,
      dedicatedEnabled: runtimeState.dedicatedEnabled,
      allowPermanentKeepAlive: runtimeState.allowPermanentKeepAlive,
    });
  const selection = selectApexWorkstationBrainProfileForRoute({
    ...input,
    config,
    activeProfileId: runtimeState.activeProfileId,
  });
  const telemetry = buildApexWorkstationBrainTelemetry({
    ...input,
    profileSelection: selection,
    modelProcessor: input.modelProcessor || runtimeState.lastModelReceipt || {},
    responseTimingMs: input.responseTimingMs || runtimeState.lastModelReceipt?.responseTimingMs,
  });
  const modelNames = Array.isArray(input.modelNames) ? input.modelNames : [];
  const modelInstalled = modelNames.length
    ? modelNames.map((name) => text(name, 160).toLowerCase()).includes(selection.modelId.toLowerCase())
    : false;
  const queueState = input.queueState || {};
  return freeze({
    provider: "apex-workstation-brain",
    version: "v1",
    status: modelInstalled || !modelNames.length ? "ready" : "missing-model",
    activeMode: selection.profileId,
    activeProfileId: selection.profileId,
    label: selection.label,
    modelId: selection.modelId,
    numCtx: selection.numCtx,
    keepAlive: selection.keepAlive,
    keepAlivePermanent: Boolean(selection.keepAlivePermanent),
    speedLane: Boolean(selection.speedLane),
    maxOutputTokens: number(selection.maxOutputTokens),
    modelInstalled,
    processor: telemetry.processor,
    vramUsedMb: telemetry.vramUsedMb,
    vramTotalMb: telemetry.vramTotalMb,
    thresholdStatus: telemetry.thresholdStatus,
    softVramThresholdMb: telemetry.softVramThresholdMb,
    hardVramThresholdMb: telemetry.hardVramThresholdMb,
    timeToFirstTokenMs: telemetry.timeToFirstTokenMs,
    responseTimingMs: telemetry.responseTimingMs,
    modelAlreadyLoaded: telemetry.modelAlreadyLoaded,
    modelLoaded: telemetry.modelLoaded,
    lastPromotionDecision: telemetry.lastPromotionDecision || runtimeState.lastPromotionDecision,
    rollbackReason: telemetry.rollbackReason || runtimeState.lastRollbackReason || "",
    compactionStatus: telemetry.compactionStatus,
    dedicatedMode: {
      prepared: true,
      enabled: Boolean(runtimeState.dedicatedEnabled),
      active: selection.profileId === APEX_WORKSTATION_BRAIN_PROFILE_ID.DEDICATED,
      permanentKeepAlive: Boolean(selection.keepAlivePermanent),
      defaultEnabled: false,
    },
    queue: {
      serialized: true,
      active: Boolean(queueState.active),
      activeModel: text(queueState.activeModel || "", 160),
      activeMode: text(queueState.activeMode || "", 80),
      queuedCount: number(queueState.queuedCount),
      lastQueuedMs: number(queueState.lastQueuedMs),
      priorityStopCommands: true,
    },
    lastModeReceipt: runtimeState.lastModeReceipt || null,
    lastModelReceipt: runtimeState.lastModelReceipt || null,
    directOperatorPersonaScoped: true,
    openAiUsed: false,
    cloudUsed: false,
    externalExecutionAdded: false,
    noUnrelatedProcessKilled: true,
    secretsExposed: false,
  });
}

export function shouldApplyApexWorkstationDirectPersona(route = "") {
  const normalized = text(route, 120).toLowerCase();
  if (/\b(customer|field|demo|public|contractor-facing|lead-ai|estimate-ai)\b/i.test(normalized)) return false;
  if (!normalized) return true;
  return /\b(apex|local|personal|operator|normal-chat|planning|memory|task|reminder|device|builder|self-fix|coding|knowledge|research)\b/i.test(normalized);
}

export function applyApexWorkstationDirectPersonaMessages(messages = [], input = {}) {
  if (!shouldApplyApexWorkstationDirectPersona(input.route || input.contextScope || "")) {
    return Object.freeze((Array.isArray(messages) ? messages : []).map((message) => freeze(message)));
  }
  const safeMessages = Array.isArray(messages) ? messages : [];
  if (!safeMessages.length) {
    return Object.freeze([{ role: "system", content: APEX_WORKSTATION_BRAIN_DIRECT_OPERATOR_PERSONA }]);
  }
  const [first, ...rest] = safeMessages;
  const role = String(first?.role || "system").toLowerCase() === "system" ? "system" : first?.role || "user";
  return Object.freeze([
    freeze({
      ...first,
      role,
      content: text(`${first?.content || ""}\n\n${APEX_WORKSTATION_BRAIN_DIRECT_OPERATOR_PERSONA}`, 12_000),
    }),
    ...rest.map((message) => freeze(message)),
  ]);
}

export function buildApexWorkstationBrainCommandAnswer(input = {}) {
  const command = input.command?.status ? input.command : inferApexWorkstationBrainCommand(input.question || "");
  const brain = input.brainStatus?.provider === "apex-workstation-brain"
    ? input.brainStatus
    : buildApexWorkstationBrainStatus(input);
  if (command.status !== "detected") return Object.freeze({ handled: false });

  const modeLine = `${brain.label || brain.activeMode} mode is active on ${brain.modelId} with ${brain.numCtx} context and keep_alive ${brain.keepAlive}.`;
  const gpuLine = `Processor ${brain.processor || "unknown"}, VRAM ${brain.vramUsedMb || 0}/${brain.vramTotalMb || 0} MB, threshold ${brain.thresholdStatus || "stable"}.`;
  const decisionLine = `Last decision: ${brain.lastPromotionDecision || "stable"}${brain.rollbackReason ? `; ${brain.rollbackReason}` : ""}.`;
  let answer = `${modeLine} ${gpuLine} ${decisionLine} OpenAI/cloud is disabled by default.`;
  if (command.action === "set-profile") {
    const profile = getApexWorkstationBrainProfile(command.profileId, { dedicatedEnabled: true });
    answer = `Done. Apex will use ${profile.label} mode for local Personal OS routing: ${profile.modelId}, context ${profile.numCtx}, keep_alive ${profile.keepAlive}. Consequential actions still stop at the hard gates.`;
  } else if (command.action === "start-coding") {
    answer = `Coding Mode is prepared. Apex routes scoped Builder/Self-Fix coding work to ${APEX_WORKSTATION_BRAIN_CODING_MODEL} with serialized Ollama requests, and it will not claim file changes unless Builder actually records them.`;
  } else if (command.action === "stop-coding") {
    answer = "Coding Mode is stopped for Apex-owned build routing. I did not kill unrelated processes, and Normal mode is ready for talk.";
  } else if (command.action === "enable-dedicated") {
    answer = "Dedicated Mode is enabled for this local operator session. It is still not a permanent VRAM lock unless local config explicitly allows permanent keep-alive.";
  } else if (command.action === "disable-dedicated") {
    answer = "Dedicated Mode is disabled. Apex is back on Normal local mode.";
  } else if (command.action === "gpu-status") {
    answer = `${gpuLine} ${decisionLine} I only use local Ollama here; OpenAI/cloud remains off unless John explicitly overrides policy.`;
  }

  return Object.freeze({
    handled: true,
    intent: command.action === "gpu-status" ? "workstation-brain-gpu-status" : "workstation-brain-mode",
    action: command.action,
    profileId: command.profileId || brain.activeMode,
    answer,
    sourceLabels: Object.freeze(["Apex Workstation Brain Mode", "Local Ollama", "GPU Telemetry"]),
    notice: "Apex updated workstation brain status conversationally.",
  });
}
