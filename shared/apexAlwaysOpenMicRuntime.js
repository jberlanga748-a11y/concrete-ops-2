export const APEX_ALWAYS_OPEN_MIC_STATE = Object.freeze({
  STANDBY: "standby",
  CAPTURING: "capturing",
  PROCESSING: "processing",
  SPEAKING: "speaking",
  RECOVERING: "recovering",
  QUIET: "quiet",
  ERROR: "error",
});

export const APEX_ALWAYS_OPEN_MIC_STATES = Object.freeze(Object.values(APEX_ALWAYS_OPEN_MIC_STATE));

export const APEX_ALWAYS_OPEN_MIC_DEFAULTS = Object.freeze({
  ingressProvider: "browser",
  vadProvider: "amplitude-gate",
  sustainedSilenceMs: 1800,
  minCaptureMs: 1200,
  levelThreshold: 0.035,
  idleLevelThreshold: 0.018,
  recoveryDropMs: 220,
});

const STATE_VALUES = new Set(APEX_ALWAYS_OPEN_MIC_STATES);

function text(value = "", limit = 240) {
  return String(value ?? "").replace(/\s+\n/g, "\n").replace(/\s+/g, " ").trim().slice(0, limit);
}

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function integer(value, fallback = 0) {
  return Math.max(0, Math.round(number(value, fallback)));
}

function clamp(value, min, max, fallback = min) {
  const parsed = number(value, fallback);
  return Math.max(min, Math.min(max, parsed));
}

function bool(value) {
  return value === true || /^(1|true|yes|on|enabled)$/i.test(String(value || "").trim());
}

function safeProvider(value = "", fallback = "") {
  return text(value || fallback, 120).replace(/[^a-z0-9._/ -]+/gi, "").trim() || fallback;
}

function scrubSensitiveText(value = "", limit = 220) {
  return text(value, limit)
    .replace(/\bsk-[a-z0-9_-]{6,}\b/gi, "[redacted-key]")
    .replace(/\b(api[_-]?key|authorization|bearer|token|secret|password|cookie)\b\s*[:=]?\s*[^,\s;]+/gi, "$1 [redacted]");
}

export function normalizeApexAlwaysOpenMicState(value = APEX_ALWAYS_OPEN_MIC_STATE.STANDBY) {
  const normalized = text(value, 60).toLowerCase();
  if (STATE_VALUES.has(normalized)) return normalized;
  if (["idle", "listening", "online", "ready", "paused"].includes(normalized)) return APEX_ALWAYS_OPEN_MIC_STATE.STANDBY;
  if (["hearing", "recording", "speech", "speech-detected"].includes(normalized)) return APEX_ALWAYS_OPEN_MIC_STATE.CAPTURING;
  if (["transcribing", "thinking", "submitting", "reading"].includes(normalized)) return APEX_ALWAYS_OPEN_MIC_STATE.PROCESSING;
  if (["talking", "playing", "tts"].includes(normalized)) return APEX_ALWAYS_OPEN_MIC_STATE.SPEAKING;
  if (["muted", "stopped", "stop-listening", "go-quiet"].includes(normalized)) return APEX_ALWAYS_OPEN_MIC_STATE.QUIET;
  if (["blocked", "failed", "unavailable"].includes(normalized)) return APEX_ALWAYS_OPEN_MIC_STATE.ERROR;
  return APEX_ALWAYS_OPEN_MIC_STATE.STANDBY;
}

export function normalizeApexAlwaysOpenMicConfig(input = {}) {
  const sustainedSilenceMs = integer(input.sustainedSilenceMs, APEX_ALWAYS_OPEN_MIC_DEFAULTS.sustainedSilenceMs);
  return Object.freeze({
    ingressProvider: safeProvider(input.ingressProvider, APEX_ALWAYS_OPEN_MIC_DEFAULTS.ingressProvider),
    vadProvider: safeProvider(input.vadProvider, APEX_ALWAYS_OPEN_MIC_DEFAULTS.vadProvider),
    sustainedSilenceMs: Math.max(700, Math.min(5000, sustainedSilenceMs || APEX_ALWAYS_OPEN_MIC_DEFAULTS.sustainedSilenceMs)),
    minCaptureMs: Math.max(220, Math.min(4000, integer(input.minCaptureMs, APEX_ALWAYS_OPEN_MIC_DEFAULTS.minCaptureMs))),
    levelThreshold: clamp(input.levelThreshold, 0.005, 0.4, APEX_ALWAYS_OPEN_MIC_DEFAULTS.levelThreshold),
    idleLevelThreshold: clamp(input.idleLevelThreshold, 0.001, 0.35, APEX_ALWAYS_OPEN_MIC_DEFAULTS.idleLevelThreshold),
    recoveryDropMs: Math.max(100, Math.min(1600, integer(input.recoveryDropMs, APEX_ALWAYS_OPEN_MIC_DEFAULTS.recoveryDropMs))),
  });
}

export function shouldMuteApexAlwaysOpenMic(input = {}) {
  const state = normalizeApexAlwaysOpenMicState(input.state);
  const reasons = [];
  if (state === APEX_ALWAYS_OPEN_MIC_STATE.SPEAKING) reasons.push("state-speaking");
  if (state === APEX_ALWAYS_OPEN_MIC_STATE.RECOVERING) reasons.push("state-recovering");
  if (state === APEX_ALWAYS_OPEN_MIC_STATE.QUIET) reasons.push("state-quiet");
  if (bool(input.isSpeaking)) reasons.push("is-speaking");
  if (bool(input.ttsActive)) reasons.push("tts-active");
  if (bool(input.playbackExpected)) reasons.push("playback-expected");
  if (bool(input.feedbackSuppressionActive)) reasons.push("feedback-suppression");
  const muted = reasons.length > 0;
  return Object.freeze({
    muted,
    shouldBuffer: !muted,
    shouldTranscribe: false,
    reason: reasons[0] || "",
    reasons: Object.freeze(reasons),
    state,
    feedbackSuppressionActive: muted,
  });
}

export function buildApexAlwaysOpenMicTranscriptionGate(input = {}) {
  const config = normalizeApexAlwaysOpenMicConfig(input);
  const state = normalizeApexAlwaysOpenMicState(input.state);
  const mute = shouldMuteApexAlwaysOpenMic(input);
  const nowMs = number(input.nowMs ?? input.now, 0);
  const captureStartedAtMs = number(input.captureStartedAtMs ?? input.captureStartedAt, 0);
  const lastSpeechAtMs = number(input.lastSpeechAtMs ?? input.lastSpeechAt, captureStartedAtMs || nowMs);
  const level = Math.max(0, number(input.level, 0));
  const alreadyCapturing = state === APEX_ALWAYS_OPEN_MIC_STATE.CAPTURING || bool(input.capturing) || captureStartedAtMs > 0;

  if (mute.muted) {
    return Object.freeze({
      ...mute,
      nextState: state,
      speechDetected: false,
      readyForTranscription: false,
      shouldFinalize: false,
      shouldDropFrame: true,
      captureDurationMs: 0,
      silenceDurationMs: 0,
      sustainedSilenceMs: config.sustainedSilenceMs,
      ingressProvider: config.ingressProvider,
      vadProvider: config.vadProvider,
    });
  }

  const speechDetected = level >= config.levelThreshold;
  const idle = level <= config.idleLevelThreshold;
  const nextCaptureStartedAtMs = speechDetected && !alreadyCapturing ? nowMs : captureStartedAtMs;
  const captureDurationMs = alreadyCapturing || speechDetected
    ? Math.max(0, nowMs - (nextCaptureStartedAtMs || nowMs))
    : 0;
  const silenceDurationMs = alreadyCapturing && idle
    ? Math.max(0, nowMs - (lastSpeechAtMs || nowMs))
    : 0;
  const readyForTranscription = Boolean(
    alreadyCapturing
    && idle
    && captureDurationMs >= config.minCaptureMs
    && silenceDurationMs >= config.sustainedSilenceMs,
  );
  const nextState = readyForTranscription
    ? APEX_ALWAYS_OPEN_MIC_STATE.PROCESSING
    : speechDetected || alreadyCapturing
      ? APEX_ALWAYS_OPEN_MIC_STATE.CAPTURING
      : APEX_ALWAYS_OPEN_MIC_STATE.STANDBY;

  return Object.freeze({
    muted: false,
    shouldBuffer: speechDetected || alreadyCapturing,
    shouldTranscribe: readyForTranscription,
    readyForTranscription,
    shouldFinalize: readyForTranscription,
    shouldDropFrame: false,
    reason: readyForTranscription ? "sustained-silence" : speechDetected ? "speech-detected" : alreadyCapturing ? "capturing" : "standby",
    reasons: Object.freeze([]),
    state,
    nextState,
    speechDetected,
    captureDurationMs: integer(captureDurationMs, 0),
    silenceDurationMs: integer(silenceDurationMs, 0),
    sustainedSilenceMs: config.sustainedSilenceMs,
    minCaptureMs: config.minCaptureMs,
    level,
    ingressProvider: config.ingressProvider,
    vadProvider: config.vadProvider,
    feedbackSuppressionActive: false,
  });
}

export function reduceApexAlwaysOpenMicRuntime(state = {}, event = {}) {
  const currentState = normalizeApexAlwaysOpenMicState(state.state);
  const type = text(event.type, 80).toLowerCase();
  const now = event.now || new Date().toISOString();
  const droppedFrames = integer(state.droppedFramesWhileMuted ?? state.droppedFrames, 0);

  if (["go-quiet", "stop-listening", "quiet"].includes(type)) {
    return Object.freeze({
      ...state,
      state: APEX_ALWAYS_OPEN_MIC_STATE.QUIET,
      listening: false,
      speechDetected: false,
      updatedAt: now,
    });
  }
  if (["wake-up", "start-listening", "standby"].includes(type)) {
    return Object.freeze({
      ...state,
      state: APEX_ALWAYS_OPEN_MIC_STATE.STANDBY,
      listening: true,
      speechDetected: false,
      updatedAt: now,
    });
  }
  if (["speech-start", "speech-detected"].includes(type)) {
    return Object.freeze({
      ...state,
      state: APEX_ALWAYS_OPEN_MIC_STATE.CAPTURING,
      listening: true,
      speechDetected: true,
      captureStartedAt: event.captureStartedAt || now,
      updatedAt: now,
    });
  }
  if (["silence-complete", "process", "processing"].includes(type)) {
    return Object.freeze({
      ...state,
      state: APEX_ALWAYS_OPEN_MIC_STATE.PROCESSING,
      listening: false,
      speechDetected: true,
      updatedAt: now,
    });
  }
  if (["speaking", "tts-start"].includes(type)) {
    return Object.freeze({
      ...state,
      state: APEX_ALWAYS_OPEN_MIC_STATE.SPEAKING,
      listening: false,
      feedbackSuppressionActive: true,
      updatedAt: now,
    });
  }
  if (["recovery", "recovering", "tts-end"].includes(type)) {
    return Object.freeze({
      ...state,
      state: APEX_ALWAYS_OPEN_MIC_STATE.RECOVERING,
      listening: false,
      feedbackSuppressionActive: true,
      updatedAt: now,
    });
  }
  if (["drop-frame", "muted-frame"].includes(type)) {
    return Object.freeze({
      ...state,
      state: currentState,
      droppedFramesWhileMuted: droppedFrames + 1,
      feedbackSuppressionActive: true,
      updatedAt: now,
    });
  }
  if (["error", "failed"].includes(type)) {
    return Object.freeze({
      ...state,
      state: APEX_ALWAYS_OPEN_MIC_STATE.ERROR,
      fallbackReason: scrubSensitiveText(event.reason || event.error || state.fallbackReason || "Always-open mic runtime error.", 220),
      updatedAt: now,
    });
  }
  return Object.freeze({
    ...state,
    state: currentState,
    updatedAt: now,
  });
}

export function buildApexAlwaysOpenMicStatus(input = {}) {
  const config = normalizeApexAlwaysOpenMicConfig(input);
  const state = normalizeApexAlwaysOpenMicState(input.state);
  const mute = shouldMuteApexAlwaysOpenMic(input);
  return Object.freeze({
    provider: "apex-always-open-mic",
    version: "v0",
    mode: "always-open-local",
    ingressProvider: config.ingressProvider,
    vadProvider: config.vadProvider,
    state,
    listening: state !== APEX_ALWAYS_OPEN_MIC_STATE.QUIET && state !== APEX_ALWAYS_OPEN_MIC_STATE.ERROR,
    speechDetected: Boolean(input.speechDetected),
    sustainedSilenceMs: config.sustainedSilenceMs,
    minCaptureMs: config.minCaptureMs,
    silenceDurationMs: integer(input.silenceDurationMs, 0),
    levelThreshold: config.levelThreshold,
    idleLevelThreshold: config.idleLevelThreshold,
    feedbackSuppressionActive: mute.feedbackSuppressionActive || Boolean(input.feedbackSuppressionActive),
    droppedFramesWhileMuted: integer(input.droppedFramesWhileMuted ?? input.droppedFrames, 0),
    fallbackReason: scrubSensitiveText(input.fallbackReason || "", 220),
    openAiAudioUsed: false,
    cloudAudioAllowed: false,
    audioStored: false,
  });
}

export function buildApexAlwaysOpenMicReceipt(input = {}) {
  const state = normalizeApexAlwaysOpenMicState(input.state);
  const config = normalizeApexAlwaysOpenMicConfig(input);
  const receiptId = text(input.id || input.receiptId || "", 120) || `AOM-${Date.now().toString(36)}`;
  return Object.freeze({
    id: receiptId,
    provider: "apex-always-open-mic",
    status: text(input.status || (input.shouldTranscribe || input.readyForTranscription ? "processing" : "gated"), 80),
    ingressProvider: config.ingressProvider,
    vadProvider: config.vadProvider,
    state,
    speechDetected: Boolean(input.speechDetected),
    captureDurationMs: integer(input.captureDurationMs, 0),
    silenceDurationMs: integer(input.silenceDurationMs, 0),
    sustainedSilenceMs: config.sustainedSilenceMs,
    sttProvider: safeProvider(input.sttProvider || input.engine || "", ""),
    sttProcessor: safeProvider(input.sttProcessor || input.processor || "", ""),
    transcriptionTimingMs: integer(input.transcriptionTimingMs, 0),
    feedbackSuppressionActive: Boolean(input.feedbackSuppressionActive),
    droppedFramesWhileMuted: integer(input.droppedFramesWhileMuted ?? input.droppedFrames, 0),
    fallbackReason: scrubSensitiveText(input.fallbackReason || input.reason || "", 220),
    openAiAudioUsed: false,
    cloudAudioAllowed: false,
    audioStored: false,
    createdAt: text(input.createdAt || new Date().toISOString(), 60),
  });
}
