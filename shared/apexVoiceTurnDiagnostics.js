export const APEX_VOICE_TURN_TARGET_AUDIO = Object.freeze({
  mimeType: "audio/wav",
  container: "wav",
  encoding: "pcm_s16le",
  sampleRate: 16000,
  channelCount: 1,
  bitDepth: 16,
});

export const APEX_VOICE_TURN_FAILURE_REASONS = Object.freeze({
  EMPTY_AUDIO: "empty-audio",
  INVALID_DATA_URL: "invalid-data-url",
  UNSUPPORTED_MIME: "unsupported-mime",
  WAV_CONVERSION_FAILED: "wav-conversion-failed",
  WAV_HEADER_INVALID: "wav-header-invalid",
  TOO_SHORT: "too-short",
  MUTED_BY_GATE: "muted-by-gate",
  STT_FAILED: "stt-failed",
  STT_UNAVAILABLE: "stt-unavailable",
  AUDIO_TOO_LARGE: "audio-too-large",
});

export const APEX_LIVE_TURN_LATENCY_VERSION = "v1";

const SUPPORTED_AUDIO_MIME_TYPES = Object.freeze([
  "audio/aac",
  "audio/flac",
  "audio/m4a",
  "audio/mp3",
  "audio/mp4",
  "audio/mpeg",
  "audio/mpga",
  "audio/ogg",
  "audio/opus",
  "audio/wav",
  "audio/webm",
]);

const FAILURE_LABELS = Object.freeze({
  [APEX_VOICE_TURN_FAILURE_REASONS.EMPTY_AUDIO]: "empty audio",
  [APEX_VOICE_TURN_FAILURE_REASONS.INVALID_DATA_URL]: "invalid data URL",
  [APEX_VOICE_TURN_FAILURE_REASONS.UNSUPPORTED_MIME]: "unsupported MIME",
  [APEX_VOICE_TURN_FAILURE_REASONS.WAV_CONVERSION_FAILED]: "WAV conversion failed",
  [APEX_VOICE_TURN_FAILURE_REASONS.WAV_HEADER_INVALID]: "WAV header invalid",
  [APEX_VOICE_TURN_FAILURE_REASONS.TOO_SHORT]: "too short",
  [APEX_VOICE_TURN_FAILURE_REASONS.MUTED_BY_GATE]: "muted by gate",
  [APEX_VOICE_TURN_FAILURE_REASONS.STT_FAILED]: "STT failed",
  [APEX_VOICE_TURN_FAILURE_REASONS.STT_UNAVAILABLE]: "STT unavailable",
  [APEX_VOICE_TURN_FAILURE_REASONS.AUDIO_TOO_LARGE]: "audio too large",
});

function text(value = "", limit = 240) {
  return String(value ?? "").replace(/\s+\n/g, "\n").replace(/\s+/g, " ").trim().slice(0, limit);
}

function number(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.round(parsed));
}

function timingNumber(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.max(1, Math.round(parsed));
}

function firstTimingNumber(...values) {
  for (const value of values) {
    const parsed = timingNumber(value, 0);
    if (parsed > 0) return parsed;
  }
  return 0;
}

function safeObject(value = {}) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function ascii(bytes, start, length) {
  if (!bytes || bytes.length < start + length) return "";
  let value = "";
  for (let index = start; index < start + length; index += 1) {
    value += String.fromCharCode(bytes[index]);
  }
  return value;
}

function readUint16Le(bytes, offset) {
  if (!bytes || bytes.length < offset + 2) return 0;
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function readUint32Le(bytes, offset) {
  if (!bytes || bytes.length < offset + 4) return 0;
  return (bytes[offset]
    | (bytes[offset + 1] << 8)
    | (bytes[offset + 2] << 16)
    | (bytes[offset + 3] << 24)) >>> 0;
}

function decodeBase64ToBytes(base64 = "") {
  const raw = String(base64 || "").trim();
  if (!raw) return new Uint8Array();
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(raw, "base64"));
  }
  if (typeof atob === "function") {
    const binary = atob(raw);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  }
  return new Uint8Array();
}

export function createApexVoiceTurnId(prefix = "AVT") {
  const random = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `${text(prefix, 12).replace(/[^a-z0-9_-]/gi, "") || "AVT"}-${Date.now()}-${random}`;
}

export function getApexVoiceTurnFailureLabel(reason = "") {
  return FAILURE_LABELS[text(reason, 80)] || text(reason, 80) || "unknown voice turn failure";
}

export function parseApexVoiceTurnDataUrl(value = "") {
  const raw = String(value || "").trim();
  if (!raw) {
    return {
      ok: false,
      failureReason: APEX_VOICE_TURN_FAILURE_REASONS.EMPTY_AUDIO,
      failureLabel: getApexVoiceTurnFailureLabel(APEX_VOICE_TURN_FAILURE_REASONS.EMPTY_AUDIO),
      mimeType: "",
      byteLength: 0,
      bytes: new Uint8Array(),
    };
  }
  const match = raw.match(/^data:([^;,]+)(?:;[^,]*)?;base64,([A-Za-z0-9+/=\s]+)$/);
  if (!match) {
    return {
      ok: false,
      failureReason: APEX_VOICE_TURN_FAILURE_REASONS.INVALID_DATA_URL,
      failureLabel: getApexVoiceTurnFailureLabel(APEX_VOICE_TURN_FAILURE_REASONS.INVALID_DATA_URL),
      mimeType: "",
      byteLength: 0,
      bytes: new Uint8Array(),
    };
  }
  const mimeType = text(match[1], 80).toLowerCase();
  const base64 = String(match[2] || "").replace(/\s+/g, "");
  if (!SUPPORTED_AUDIO_MIME_TYPES.includes(mimeType)) {
    return {
      ok: false,
      failureReason: APEX_VOICE_TURN_FAILURE_REASONS.UNSUPPORTED_MIME,
      failureLabel: getApexVoiceTurnFailureLabel(APEX_VOICE_TURN_FAILURE_REASONS.UNSUPPORTED_MIME),
      mimeType,
      byteLength: 0,
      bytes: new Uint8Array(),
    };
  }
  const bytes = decodeBase64ToBytes(base64);
  if (!bytes.length) {
    return {
      ok: false,
      failureReason: APEX_VOICE_TURN_FAILURE_REASONS.EMPTY_AUDIO,
      failureLabel: getApexVoiceTurnFailureLabel(APEX_VOICE_TURN_FAILURE_REASONS.EMPTY_AUDIO),
      mimeType,
      byteLength: 0,
      bytes,
    };
  }
  return {
    ok: true,
    mimeType,
    base64,
    byteLength: bytes.length,
    bytes,
  };
}

export function readApexWavMetadata(bytes = new Uint8Array()) {
  if (!bytes || bytes.length < 44) {
    return {
      valid: false,
      reason: APEX_VOICE_TURN_FAILURE_REASONS.TOO_SHORT,
      sampleRate: 0,
      channelCount: 0,
      bitsPerSample: 0,
      durationMs: 0,
      dataBytes: 0,
    };
  }
  if (ascii(bytes, 0, 4) !== "RIFF" || ascii(bytes, 8, 4) !== "WAVE") {
    return {
      valid: false,
      reason: APEX_VOICE_TURN_FAILURE_REASONS.WAV_HEADER_INVALID,
      sampleRate: 0,
      channelCount: 0,
      bitsPerSample: 0,
      durationMs: 0,
      dataBytes: 0,
    };
  }
  let offset = 12;
  let fmt = null;
  let dataBytes = 0;
  while (offset + 8 <= bytes.length) {
    const chunkId = ascii(bytes, offset, 4);
    const chunkSize = readUint32Le(bytes, offset + 4);
    const chunkStart = offset + 8;
    if (chunkId === "fmt " && chunkSize >= 16 && chunkStart + 16 <= bytes.length) {
      fmt = {
        audioFormat: readUint16Le(bytes, chunkStart),
        channelCount: readUint16Le(bytes, chunkStart + 2),
        sampleRate: readUint32Le(bytes, chunkStart + 4),
        byteRate: readUint32Le(bytes, chunkStart + 8),
        bitsPerSample: readUint16Le(bytes, chunkStart + 14),
      };
    } else if (chunkId === "data") {
      dataBytes = Math.min(chunkSize, Math.max(0, bytes.length - chunkStart));
    }
    offset = chunkStart + chunkSize + (chunkSize % 2);
  }
  if (!fmt || fmt.audioFormat !== 1 || !fmt.sampleRate || !fmt.channelCount || !fmt.bitsPerSample || !dataBytes) {
    return {
      valid: false,
      reason: APEX_VOICE_TURN_FAILURE_REASONS.WAV_HEADER_INVALID,
      sampleRate: fmt?.sampleRate || 0,
      channelCount: fmt?.channelCount || 0,
      bitsPerSample: fmt?.bitsPerSample || 0,
      durationMs: 0,
      dataBytes,
    };
  }
  const bytesPerSecond = fmt.byteRate || fmt.sampleRate * fmt.channelCount * (fmt.bitsPerSample / 8);
  const durationMs = bytesPerSecond ? Math.round((dataBytes / bytesPerSecond) * 1000) : 0;
  return {
    valid: true,
    reason: "",
    audioFormat: fmt.audioFormat,
    sampleRate: fmt.sampleRate,
    channelCount: fmt.channelCount,
    bitsPerSample: fmt.bitsPerSample,
    durationMs,
    dataBytes,
  };
}

export function validateApexVoiceTurnPayload({
  turnId = "",
  audioDataUrl = "",
  audioTurn = {},
  alwaysOpenMic = {},
  minDurationMs = 180,
  maxBytes = 12 * 1024 * 1024,
} = {}) {
  const safeTurn = safeObject(audioTurn);
  const gate = safeObject(alwaysOpenMic);
  const normalizedTurnId = text(turnId || safeTurn.turnId || createApexVoiceTurnId(), 100);
  if (gate.muted === true || gate.shouldDropFrame === true || /muted/i.test(`${gate.status || ""} ${gate.state || ""}`)) {
    return {
      turnId: normalizedTurnId,
      audioValid: false,
      readyForTranscription: false,
      failureReason: APEX_VOICE_TURN_FAILURE_REASONS.MUTED_BY_GATE,
      failureLabel: getApexVoiceTurnFailureLabel(APEX_VOICE_TURN_FAILURE_REASONS.MUTED_BY_GATE),
      metadata: {
        turnId: normalizedTurnId,
        alwaysOpenMicState: text(gate.state || gate.status || "", 80),
      },
    };
  }
  const parsed = parseApexVoiceTurnDataUrl(audioDataUrl);
  if (!parsed.ok) {
    return {
      turnId: normalizedTurnId,
      audioValid: false,
      readyForTranscription: false,
      failureReason: parsed.failureReason,
      failureLabel: parsed.failureLabel,
      metadata: {
        turnId: normalizedTurnId,
        sourceMimeType: text(safeTurn.sourceMimeType || "", 80),
        convertedMimeType: text(safeTurn.convertedMimeType || parsed.mimeType || "", 80),
        byteLength: parsed.byteLength || number(safeTurn.convertedByteLength || safeTurn.blobSize),
      },
    };
  }
  if (parsed.byteLength > maxBytes) {
    return {
      turnId: normalizedTurnId,
      audioValid: false,
      readyForTranscription: false,
      failureReason: APEX_VOICE_TURN_FAILURE_REASONS.AUDIO_TOO_LARGE,
      failureLabel: getApexVoiceTurnFailureLabel(APEX_VOICE_TURN_FAILURE_REASONS.AUDIO_TOO_LARGE),
      metadata: {
        turnId: normalizedTurnId,
        convertedMimeType: parsed.mimeType,
        byteLength: parsed.byteLength,
      },
    };
  }
  if (safeTurn.browserWavConversionFailed === true && parsed.mimeType !== "audio/wav") {
    return {
      turnId: normalizedTurnId,
      audioValid: false,
      readyForTranscription: false,
      failureReason: APEX_VOICE_TURN_FAILURE_REASONS.WAV_CONVERSION_FAILED,
      failureLabel: getApexVoiceTurnFailureLabel(APEX_VOICE_TURN_FAILURE_REASONS.WAV_CONVERSION_FAILED),
      metadata: {
        turnId: normalizedTurnId,
        sourceMimeType: text(safeTurn.sourceMimeType || "", 80),
        convertedMimeType: parsed.mimeType,
        byteLength: parsed.byteLength,
        sourceByteLength: number(safeTurn.sourceByteLength || safeTurn.blobSize),
        convertedByteLength: parsed.byteLength,
        browserWavConversionFailed: true,
        clientConversionFailureReason: text(safeTurn.clientConversionFailureReason || APEX_VOICE_TURN_FAILURE_REASONS.WAV_CONVERSION_FAILED, 120),
        clientConversionFailureMessage: text(safeTurn.clientConversionFailureMessage || "Browser audio was not converted to local WAV.", 220),
        fallbackMode: text(safeTurn.fallbackMode || "client-wav-required", 120),
        readyForTranscription: false,
      },
    };
  }
  const wav = parsed.mimeType === "audio/wav" ? readApexWavMetadata(parsed.bytes) : null;
  const durationMs = wav?.durationMs || number(safeTurn.durationEstimateMs || safeTurn.durationMs);
  if (wav && !wav.valid) {
    return {
      turnId: normalizedTurnId,
      audioValid: false,
      readyForTranscription: false,
      failureReason: wav.reason === APEX_VOICE_TURN_FAILURE_REASONS.TOO_SHORT
        ? APEX_VOICE_TURN_FAILURE_REASONS.TOO_SHORT
        : APEX_VOICE_TURN_FAILURE_REASONS.WAV_HEADER_INVALID,
      failureLabel: getApexVoiceTurnFailureLabel(wav.reason === APEX_VOICE_TURN_FAILURE_REASONS.TOO_SHORT
        ? APEX_VOICE_TURN_FAILURE_REASONS.TOO_SHORT
        : APEX_VOICE_TURN_FAILURE_REASONS.WAV_HEADER_INVALID),
      metadata: {
        turnId: normalizedTurnId,
        sourceMimeType: text(safeTurn.sourceMimeType || "", 80),
        convertedMimeType: parsed.mimeType,
        byteLength: parsed.byteLength,
        wavHeaderValid: false,
        sampleRate: wav.sampleRate,
        channelCount: wav.channelCount,
        bitsPerSample: wav.bitsPerSample,
        durationMs: wav.durationMs,
      },
    };
  }
  if ((durationMs && durationMs < minDurationMs) || parsed.byteLength <= 44) {
    return {
      turnId: normalizedTurnId,
      audioValid: false,
      readyForTranscription: false,
      failureReason: APEX_VOICE_TURN_FAILURE_REASONS.TOO_SHORT,
      failureLabel: getApexVoiceTurnFailureLabel(APEX_VOICE_TURN_FAILURE_REASONS.TOO_SHORT),
      metadata: {
        turnId: normalizedTurnId,
        sourceMimeType: text(safeTurn.sourceMimeType || "", 80),
        convertedMimeType: parsed.mimeType,
        byteLength: parsed.byteLength,
        wavHeaderValid: wav ? wav.valid : undefined,
        sampleRate: wav?.sampleRate || number(safeTurn.sampleRate),
        channelCount: wav?.channelCount || number(safeTurn.channelCount),
        bitsPerSample: wav?.bitsPerSample || number(safeTurn.bitDepth),
        durationMs,
      },
    };
  }
  return {
    turnId: normalizedTurnId,
    audioValid: true,
    readyForTranscription: true,
    failureReason: "",
    failureLabel: "",
    metadata: {
      turnId: normalizedTurnId,
      sourceMimeType: text(safeTurn.sourceMimeType || "", 80),
      convertedMimeType: parsed.mimeType,
      byteLength: parsed.byteLength,
      sourceByteLength: number(safeTurn.sourceByteLength || safeTurn.blobSize),
      convertedByteLength: parsed.byteLength,
      wavHeaderValid: wav ? wav.valid : undefined,
      sampleRate: wav?.sampleRate || number(safeTurn.sampleRate),
      channelCount: wav?.channelCount || number(safeTurn.channelCount),
      bitsPerSample: wav?.bitsPerSample || number(safeTurn.bitDepth),
      durationMs,
      target: parsed.mimeType === "audio/wav" ? APEX_VOICE_TURN_TARGET_AUDIO : null,
      browserWavConversionFailed: safeTurn.browserWavConversionFailed === true,
      clientConversionFailureReason: text(safeTurn.clientConversionFailureReason || "", 120),
      clientConversionFailureMessage: text(safeTurn.clientConversionFailureMessage || "", 220),
      fallbackMode: text(safeTurn.fallbackMode || "", 120),
      alwaysOpenMicState: text(gate.state || "", 80),
      readyForTranscription: true,
    },
  };
}

export function findApexVoiceTurnSlowestStep(timingMs = {}) {
  const rows = Object.entries(safeObject(timingMs))
    .filter(([key]) => !/^(total|totalVoiceTurnMs|totalTurnMs|totalClientTurnMs)$/i.test(String(key || "")))
    .filter(([, value]) => Number.isFinite(Number(value)) && Number(value) >= 0)
    .map(([key, value]) => ({ step: key, ms: Math.round(Number(value)) }))
    .filter((row) => row.ms > 0)
    .sort((a, b) => b.ms - a.ms);
  return rows[0] || { step: "", ms: 0 };
}

export function buildApexVoiceTurnReceipt({
  turnId = "",
  status = "failed",
  failureReason = "",
  audioValidation = null,
  timingMs = {},
  engine = "",
  processor = "",
  modelName = "",
  confidence = 0,
  providerTimingMs = 0,
  alwaysOpenMicReceipt = null,
  createdAt = new Date().toISOString(),
} = {}) {
  const safeTiming = Object.fromEntries(
    Object.entries(safeObject(timingMs)).map(([key, value]) => [key, number(value)]),
  );
  const slowest = findApexVoiceTurnSlowestStep(safeTiming);
  const validation = audioValidation || {};
  const reason = text(failureReason || validation.failureReason || "", 120);
  const totalTurnMs = number(safeTiming.totalTurnMs || safeTiming.totalVoiceTurnMs);
  const latencyProfile = buildApexLatencyProfile({
    turnId: text(turnId || validation.turnId || "", 110),
    voiceReceipt: {
      turnId: text(turnId || validation.turnId || "", 110),
      timingMs: safeTiming,
      totalTurnMs,
      transcriptionTimingMs: number(safeTiming.sttMs || safeTiming.transcriptionTimingMs),
      captureDurationMs: number(alwaysOpenMicReceipt?.captureDurationMs || safeTiming.captureDurationMs),
      silenceDurationMs: number(alwaysOpenMicReceipt?.silenceDurationMs || safeTiming.vadActualSilenceMs),
      localVoiceStatusCacheHit: Boolean(safeTiming.localVoiceStatusCacheHit),
      localVoiceStatusDiscoveryMs: number(safeTiming.localVoiceStatusDiscoveryMs || safeTiming.statusDiscoveryMs),
    },
    createdAt,
  });
  return Object.freeze({
    id: `AVR-${text(turnId || validation.turnId || createApexVoiceTurnId(), 110)}`,
    turnId: text(turnId || validation.turnId || "", 110),
    lastTurnId: text(turnId || validation.turnId || "", 110),
    status: text(status, 80),
    provider: "apex-local-voice",
    engine: text(engine, 80),
    processor: text(processor, 80),
    modelName: text(modelName, 120),
    confidence: Number(confidence || 0) || 0,
    providerTimingMs: number(providerTimingMs),
    transcriptionTimingMs: number(safeTiming.sttMs || safeTiming.transcriptionTimingMs),
    timingMs: Object.freeze(safeTiming),
    slowestStep: slowest.step,
    slowestStepMs: slowest.ms,
    totalTurnMs,
    failureReason: reason,
    failureLabel: reason ? getApexVoiceTurnFailureLabel(reason) : "",
    audioValid: validation.audioValid === true,
    readyForTranscription: validation.readyForTranscription === true,
    audio: Object.freeze(safeObject(validation.metadata)),
    ingressProvider: alwaysOpenMicReceipt?.ingressProvider || "",
    vadProvider: alwaysOpenMicReceipt?.vadProvider || "",
    micState: alwaysOpenMicReceipt?.state || alwaysOpenMicReceipt?.micState || "",
    speechDetected: Boolean(alwaysOpenMicReceipt?.speechDetected),
    captureDurationMs: number(alwaysOpenMicReceipt?.captureDurationMs || safeTiming.captureDurationMs),
    silenceDurationMs: number(alwaysOpenMicReceipt?.silenceDurationMs || safeTiming.vadActualSilenceMs),
    voiceCloseMs: number(safeTiming.voiceCloseMs || safeTiming.vadActualSilenceMs || alwaysOpenMicReceipt?.silenceDurationMs),
    sustainedSilenceMs: number(alwaysOpenMicReceipt?.sustainedSilenceMs),
    feedbackSuppressionActive: Boolean(alwaysOpenMicReceipt?.feedbackSuppressionActive),
    droppedFramesWhileMuted: number(alwaysOpenMicReceipt?.droppedFramesWhileMuted),
    alwaysOpenMic: alwaysOpenMicReceipt || undefined,
    latencyProfile,
    liveTurnLatency: latencyProfile.liveTurn,
    audioStored: false,
    openAiAudioUsed: false,
    cloudAudioAllowed: false,
    createdAt,
  });
}

export function summarizeApexVoiceTurnSpeed(receipt = {}) {
  const safeReceipt = safeObject(receipt);
  const timing = safeObject(safeReceipt.timingMs);
  const liveTurn = safeObject(safeReceipt.liveTurnLatency || safeReceipt.latencyProfile?.liveTurn);
  const total = number(liveTurn.totalTurnMs || safeReceipt.totalTurnMs || timing.totalTurnMs);
  const computedSlowest = findApexVoiceTurnSlowestStep(timing);
  const slowStep = text(liveTurn.slowestStepLabel || safeReceipt.slowestStep || computedSlowest.step || "", 120);
  const slowMs = number(liveTurn.slowestStepMs || safeReceipt.slowestStepMs || computedSlowest.ms);
  if (!total && !slowStep) return "I do not have a voice timing receipt yet.";
  const totalText = total ? `last voice turn took ${total} ms` : "last voice turn timing is partial";
  const slowText = slowStep ? `slowest step was ${slowStep}${slowMs ? ` at ${slowMs} ms` : ""}` : "slowest step was not recorded";
  const diagnosisText = liveTurn.diagnosis === "model-fast-voice-slow"
    ? "The local model was fast; the delay is in the voice pipeline, not Ollama."
    : liveTurn.diagnosis === "model-bound"
      ? "The local model path was the slowest recorded piece."
      : liveTurn.diagnosis === "voice-bound"
        ? "The voice pipeline was the slowest recorded piece."
        : "";
  const segments = [
    ["close", timing.voiceCloseMs || timing.vadActualSilenceMs || safeReceipt.silenceDurationMs],
    ["mic capture", timing.captureDurationMs],
    ["WAV", timing.clientWavConversionMs],
    ["upload", timing.uploadRequestMs],
    ["STT", timing.sttMs || timing.transcriptionTimingMs],
    ["first token", liveTurn.modelFirstTokenMs || timing.modelFirstTokenMs],
    ["brain", liveTurn.modelTotalMs || timing.modelTotalMs || timing.modelRequestMs],
    ["TTS", liveTurn.ttsMs || timing.ttsGenerationMs || timing.ttsRequestMs],
    ["playback", liveTurn.playbackRecoveryMs || timing.playbackStartDelayMs],
  ]
    .map(([label, value]) => [label, number(value)])
    .filter(([, value]) => value > 0)
    .map(([label, value]) => `${label} ${value} ms`);
  return `${totalText}; ${slowText}.${diagnosisText ? ` ${diagnosisText}` : ""}${segments.length ? ` Breakdown: ${segments.join(", ")}.` : ""}`;
}

export function summarizeApexLiveTurnLatency(profile = {}) {
  const safeProfile = safeObject(profile);
  const liveTurn = safeObject(safeProfile.liveTurn || safeProfile.liveTurnLatency || safeProfile);
  if (liveTurn.provider !== "apex-live-turn-latency") return "No live turn latency receipt has been recorded yet.";
  const modelText = liveTurn.modelFirstTokenMs || liveTurn.modelTotalMs
    ? `model ${liveTurn.modelFirstTokenMs || 0}/${liveTurn.modelTotalMs || 0} ms`
    : "model timing partial";
  return `Live turn ${liveTurn.totalTurnMs || 0} ms; close ${liveTurn.closeMs || 0} ms; STT ${liveTurn.sttMs || 0} ms; ${modelText}; TTS ${liveTurn.ttsMs || 0} ms; playback/recovery ${liveTurn.playbackRecoveryMs || 0} ms; slowest ${liveTurn.slowestStepLabel || "unknown"} ${liveTurn.slowestStepMs || 0} ms.`;
}

export function summarizeApexVoiceTurnFailure(receipt = {}) {
  const safeReceipt = safeObject(receipt);
  const reason = text(safeReceipt.failureReason || "", 120);
  if (!reason && safeReceipt.status && safeReceipt.status !== "failed") {
    return `Last voice turn status was ${text(safeReceipt.status, 80)}.`;
  }
  return `Last audio turn failed: ${getApexVoiceTurnFailureLabel(reason)}.`;
}

const APEX_LATENCY_STEP_LABELS = Object.freeze({
  statusDiscoveryMs: "voice status",
  micCaptureMs: "mic capture",
  vadCloseMs: "voice close",
  wavConversionMs: "WAV conversion",
  dataUrlCreationMs: "audio packaging",
  uploadMs: "upload",
  serverParseMs: "server parse",
  sttMs: "STT",
  modelQueueMs: "model queue",
  modelFirstTokenMs: "first token",
  modelTotalMs: "brain",
  answerReadyMs: "answer ready",
  ttsGenerationMs: "TTS",
  ttsRequestMs: "TTS request",
  playbackStartDelayMs: "playback start",
  playbackDurationMs: "playback",
  recoveryMs: "recovery",
  duplicateSpeechHoldMs: "duplicate hold",
  nativeListenMs: "native listen",
});

const APEX_LATENCY_STEP_CATEGORIES = Object.freeze({
  statusDiscoveryMs: "voice-readiness",
  micCaptureMs: "capture",
  vadCloseMs: "voice",
  wavConversionMs: "voice",
  dataUrlCreationMs: "voice",
  uploadMs: "voice",
  serverParseMs: "voice",
  sttMs: "voice",
  modelQueueMs: "model",
  modelFirstTokenMs: "model",
  modelTotalMs: "model",
  answerReadyMs: "model",
  ttsGenerationMs: "voice",
  ttsRequestMs: "voice",
  playbackStartDelayMs: "voice",
  playbackDurationMs: "voice",
  recoveryMs: "voice",
  duplicateSpeechHoldMs: "voice",
  nativeListenMs: "voice",
});

function latencyStep(id = "", ms = 0, extra = {}) {
  const value = timingNumber(ms);
  return Object.freeze({
    id: text(id, 80),
    label: APEX_LATENCY_STEP_LABELS[id] || text(id, 80),
    category: APEX_LATENCY_STEP_CATEGORIES[id] || "unknown",
    ms: value,
    recorded: value > 0,
    ...extra,
  });
}

function sumStepMs(steps = [], ids = []) {
  const allowed = new Set(ids);
  return steps
    .filter((step) => allowed.has(step.id) && step.recorded)
    .reduce((sum, step) => sum + step.ms, 0);
}

function slowestRecordedStep(steps = [], { exclude = [] } = {}) {
  const excluded = new Set(exclude);
  return steps
    .filter((step) => step.recorded && !excluded.has(step.id))
    .slice()
    .sort((a, b) => b.ms - a.ms)[0]
    || Object.freeze({ id: "", label: "", category: "", ms: 0, recorded: false });
}

export function buildApexLiveTurnLatencySummary({
  turnId = "",
  steps = [],
  totalTurnMs = 0,
  warmRuntime = {},
  voiceReceipt = {},
  modelReceipt = {},
  createdAt = new Date().toISOString(),
} = {}) {
  const safeSteps = Array.isArray(steps) ? steps : [];
  const closeMs = firstTimingNumber(
    safeSteps.find((step) => step.id === "vadCloseMs")?.ms,
    voiceReceipt?.voiceCloseMs,
    voiceReceipt?.silenceDurationMs,
  );
  const sttMs = firstTimingNumber(
    safeSteps.find((step) => step.id === "sttMs")?.ms,
    voiceReceipt?.transcriptionTimingMs,
  );
  const modelQueueMs = firstTimingNumber(safeSteps.find((step) => step.id === "modelQueueMs")?.ms);
  const modelFirstTokenMs = firstTimingNumber(
    safeSteps.find((step) => step.id === "modelFirstTokenMs")?.ms,
    modelReceipt?.firstTokenLatencyMs,
    modelReceipt?.timeToFirstTokenMs,
  );
  const modelTotalMs = firstTimingNumber(
    safeSteps.find((step) => step.id === "modelTotalMs")?.ms,
    modelReceipt?.totalDurationMs,
    modelReceipt?.responseTimingMs,
  );
  const ttsMs = firstTimingNumber(
    safeSteps.find((step) => step.id === "ttsGenerationMs")?.ms,
    safeSteps.find((step) => step.id === "ttsRequestMs")?.ms,
  );
  const playbackRecoveryMs = sumStepMs(safeSteps, ["playbackStartDelayMs", "playbackDurationMs", "recoveryMs"]);
  const statusDiscoveryMs = firstTimingNumber(safeSteps.find((step) => step.id === "statusDiscoveryMs")?.ms);
  const audioPrepMs = sumStepMs(safeSteps, ["wavConversionMs", "dataUrlCreationMs", "uploadMs", "serverParseMs"]);
  const modelDelayMs = sumStepMs(safeSteps, ["modelQueueMs", "modelTotalMs"]);
  const voiceDelayMs = sumStepMs(safeSteps, [
    "statusDiscoveryMs",
    "vadCloseMs",
    "wavConversionMs",
    "dataUrlCreationMs",
    "uploadMs",
    "serverParseMs",
    "sttMs",
    "ttsGenerationMs",
    "ttsRequestMs",
    "playbackStartDelayMs",
    "playbackDurationMs",
    "recoveryMs",
    "duplicateSpeechHoldMs",
    "nativeListenMs",
  ]);
  const slowest = slowestRecordedStep(safeSteps, { exclude: ["micCaptureMs"] });
  const modelFast = Boolean(
    (modelFirstTokenMs && modelFirstTokenMs <= 700 && (!modelTotalMs || modelTotalMs <= 1800))
    || (!modelFirstTokenMs && modelTotalMs && modelTotalMs <= 1800),
  );
  const voiceDominant = Boolean(voiceDelayMs && (!modelDelayMs || voiceDelayMs > modelDelayMs) && slowest.category !== "model");
  const modelDominant = Boolean(modelDelayMs && (!voiceDelayMs || modelDelayMs >= voiceDelayMs) && slowest.category === "model");
  const bottleneckOwner = voiceDominant
    ? "voice-pipeline"
    : modelDominant
      ? "model"
      : slowest.category === "voice" || slowest.category === "voice-readiness"
        ? "voice-pipeline"
        : slowest.category === "model"
          ? "model"
          : "unknown";
  const diagnosis = modelFast && bottleneckOwner === "voice-pipeline"
    ? "model-fast-voice-slow"
    : bottleneckOwner === "model"
      ? "model-bound"
      : bottleneckOwner === "voice-pipeline"
        ? "voice-bound"
        : "partial";
  const total = number(totalTurnMs);
  const status = total && total <= 1800
    ? "fast"
    : total && total <= 4200
      ? "usable"
      : total
        ? "slow"
        : "partial";
  const warm = safeObject(warmRuntime);
  const keepWarm = safeObject(warm.keepWarm || warm.keepWarmReceipt);

  return Object.freeze({
    provider: "apex-live-turn-latency",
    version: APEX_LIVE_TURN_LATENCY_VERSION,
    status,
    diagnosis,
    bottleneckOwner,
    turnId: text(turnId || voiceReceipt?.turnId || voiceReceipt?.lastTurnId || modelReceipt?.turnId || "", 120),
    closeMs,
    sttMs,
    modelQueueMs,
    modelFirstTokenMs,
    modelTotalMs,
    ttsMs,
    playbackRecoveryMs,
    audioPrepMs,
    statusDiscoveryMs,
    voiceDelayMs,
    modelDelayMs,
    totalTurnMs: total,
    slowestStep: slowest.id,
    slowestStepLabel: slowest.label,
    slowestStepMs: slowest.ms,
    modelFast,
    voiceDominant,
    cachedVoiceReadinessReused: Boolean(voiceReceipt?.localVoiceStatusCacheHit || voiceReceipt?.voiceStatusCacheHit),
    voiceStatusDiscoveryMs: number(voiceReceipt?.localVoiceStatusDiscoveryMs || voiceReceipt?.voiceStatusDiscoveryMs || statusDiscoveryMs),
    residentModel: text(keepWarm.targetModel || warm.targetModel || modelReceipt?.modelId || modelReceipt?.modelUsed || "", 160),
    residentNumCtx: number(keepWarm.targetNumCtx || modelReceipt?.residentNumCtx || modelReceipt?.numCtx),
    note: diagnosis === "model-fast-voice-slow"
      ? `Local model timing is fast; this is not Ollama. Focus on ${slowest.label || "the voice pipeline"} first.`
      : diagnosis === "model-bound"
        ? "The local model path is the slowest recorded piece for this turn."
        : diagnosis === "voice-bound"
          ? "The voice pipeline is the slowest recorded piece for this turn."
          : "The live turn timing receipt is partial.",
    rawPromptStored: false,
    rawResponseStored: false,
    audioStored: false,
    openAiUsed: false,
    cloudUsed: false,
    createdAt,
  });
}

export function buildApexLatencyProfile({
  turnId = "",
  voiceReceipt = null,
  modelReceipt = null,
  modelProcessor = null,
  modelQueue = null,
  ttsReceipt = null,
  warmRuntime = null,
  playbackTimingMs = {},
  createdAt = new Date().toISOString(),
} = {}) {
  const voice = safeObject(voiceReceipt);
  const voiceTiming = safeObject(voice.timingMs);
  const model = safeObject(modelReceipt);
  const processor = safeObject(modelProcessor || model.modelProcessor);
  const queue = safeObject(modelQueue || model.queue || model.queueReceipt || model.modelQueue);
  const tts = safeObject(ttsReceipt);
  const warm = safeObject(warmRuntime);
  const playback = safeObject(playbackTimingMs);
  const keepWarm = safeObject(warm.keepWarm || warm.keepWarmReceipt);
  const voiceWarm = safeObject(warm.voice || warm.localVoice);
  const modelBenchmark = safeObject(model.benchmarkReceipt || model.localAgentBenchmarkReceipt);
  const modelTotalMs = firstTimingNumber(
    model.totalDurationMs,
    modelBenchmark.totalDurationMs,
    model.responseTimingMs,
    processor.responseTimingMs,
    voiceTiming.modelTotalMs,
    voiceTiming.modelRequestMs,
  );
  const modelFirstTokenMs = firstTimingNumber(
    voiceTiming.modelFirstTokenMs,
    model.timeToFirstTokenMs,
    model.firstTokenLatencyMs,
    modelBenchmark.firstTokenLatencyMs,
    processor.timeToFirstTokenMs,
    processor.firstTokenLatencyMs,
  );
  const steps = [
    latencyStep("statusDiscoveryMs", voiceTiming.statusDiscoveryMs || voiceTiming.localVoiceStatusDiscoveryMs || voice.localVoiceStatusDiscoveryMs || voice.voiceStatusDiscoveryMs),
    latencyStep("micCaptureMs", voiceTiming.captureDurationMs || voice.captureDurationMs),
    latencyStep("vadCloseMs", voiceTiming.voiceCloseMs || voiceTiming.vadActualSilenceMs || voice.voiceCloseMs || voice.silenceDurationMs),
    latencyStep("wavConversionMs", voiceTiming.clientWavConversionMs),
    latencyStep("dataUrlCreationMs", voiceTiming.dataUrlCreationMs),
    latencyStep("uploadMs", voiceTiming.uploadRequestMs),
    latencyStep("serverParseMs", voiceTiming.serverAudioParseMs),
    latencyStep("sttMs", voiceTiming.sttMs || voiceTiming.transcriptionTimingMs || voice.transcriptionTimingMs),
    latencyStep("modelQueueMs", queue.queuedMs || queue.lastQueuedMs || model.queueReceipt?.queuedMs),
    latencyStep("modelFirstTokenMs", modelFirstTokenMs, {
      available: Boolean(modelFirstTokenMs),
      reason: modelFirstTokenMs ? "" : "not-streamed-yet",
    }),
    latencyStep("modelTotalMs", modelTotalMs),
    latencyStep("answerReadyMs", voiceTiming.answerReadyMs),
    latencyStep("ttsGenerationMs", tts.generationTimingMs || voiceTiming.ttsGenerationMs),
    latencyStep("ttsRequestMs", voiceTiming.ttsRequestMs),
    latencyStep("playbackStartDelayMs", playback.playbackStartDelayMs || voiceTiming.playbackStartDelayMs),
    latencyStep("playbackDurationMs", playback.playbackDurationMs || voiceTiming.playbackDurationMs),
    latencyStep("recoveryMs", playback.recoveryMs || voiceTiming.recoveryMs),
    latencyStep("duplicateSpeechHoldMs", voiceTiming.duplicateSpeechHoldMs),
    latencyStep("nativeListenMs", voiceTiming.nativeListenMs),
  ];
  const recordedSteps = steps.filter((step) => step.recorded);
  const slowest = slowestRecordedStep(recordedSteps, { exclude: ["micCaptureMs"] });
  const totalTurnMs = number(
    voice.totalTurnMs
    || voiceTiming.totalTurnMs
    || model.totalTurnMs
    || (recordedSteps.length ? recordedSteps.reduce((sum, step) => sum + step.ms, 0) : 0),
  );
  const fastPathActive = Boolean(
    model.speedLane
    || model.activeMode === "speed"
    || model.brainMode === "speed"
    || model.profileId === "speed"
    || warm.fastPathActive
    || keepWarm.enabled
  );
  const warmReady = Boolean(
    keepWarm.enabled
    || keepWarm.status === "ready"
    || model.modelAlreadyLoaded
    || processor.modelAlreadyLoaded
  );
  const status = totalTurnMs && totalTurnMs <= 1800
    ? "fast"
    : totalTurnMs && totalTurnMs <= 4200
      ? "usable"
      : totalTurnMs
        ? "slow"
        : "partial";
  const liveTurn = buildApexLiveTurnLatencySummary({
    turnId: text(turnId || voice.turnId || voice.lastTurnId || model.turnId || "", 120),
    steps,
    totalTurnMs,
    warmRuntime: warm,
    voiceReceipt: voice,
    modelReceipt: model,
    createdAt,
  });

  return Object.freeze({
    provider: "apex-latency-profiler",
    version: APEX_LIVE_TURN_LATENCY_VERSION,
    status,
    turnId: text(turnId || voice.turnId || voice.lastTurnId || model.turnId || "", 120),
    fastPathActive,
    slowestStep: slowest.id,
    slowestStepLabel: slowest.label,
    slowestStepMs: slowest.ms,
    totalTurnMs,
    liveTurn,
    steps: Object.freeze(steps),
    warmRuntime: Object.freeze({
      enabled: Boolean(keepWarm.enabled || warm.keepWarmEnabled),
      ready: warmReady,
      targetModel: text(keepWarm.targetModel || warm.targetModel || model.modelId || model.modelUsed || "", 160),
      keepAlive: text(keepWarm.keepAlive || model.keepAlive || "", 40),
      modelAlreadyLoaded: Boolean(model.modelAlreadyLoaded || processor.modelAlreadyLoaded),
      sttReady: Boolean(voiceWarm.canHearLocally || voiceWarm.sttReady || voiceWarm.ready),
      ttsReady: Boolean(voiceWarm.canSpeakLocally || voiceWarm.ttsReady || voiceWarm.ready),
      firstTokenAvailable: Boolean(steps.find((step) => step.id === "modelFirstTokenMs")?.available),
    }),
    bottleneck: Object.freeze({
      id: slowest.id,
      label: slowest.label,
      ms: slowest.ms,
      owner: liveTurn.bottleneckOwner,
      diagnosis: liveTurn.diagnosis,
      action: slowest.id === "modelQueueMs"
        ? "Another local model turn was ahead of this one."
        : slowest.id === "sttMs"
          ? "STT is the slowest piece."
          : slowest.id === "modelTotalMs"
            ? "The local brain response is the slowest piece."
            : slowest.id === "ttsGenerationMs"
              ? "Local speech generation is the slowest piece."
              : slowest.id
                ? liveTurn.diagnosis === "model-fast-voice-slow"
                  ? "The local model is already fast; tune the voice pipeline before blaming Ollama."
                  : "This is the current slowest recorded piece."
                : "No complete latency receipt yet.",
    }),
    rawPromptStored: false,
    rawResponseStored: false,
    audioStored: false,
    openAiUsed: false,
    cloudUsed: false,
    createdAt,
  });
}

export function summarizeApexLatencyProfile(profile = {}) {
  const safeProfile = safeObject(profile);
  if (!safeProfile.provider) return "No Apex latency profile has been recorded yet.";
  const total = number(safeProfile.totalTurnMs);
  const slow = text(safeProfile.slowestStepLabel || safeProfile.slowestStep || "", 80);
  const slowMs = number(safeProfile.slowestStepMs);
  const warm = safeObject(safeProfile.warmRuntime);
  return `${total ? `Last turn ${total} ms` : "Last turn timing is partial"}; slowest ${slow || "unknown"}${slowMs ? ` at ${slowMs} ms` : ""}; fast path ${safeProfile.fastPathActive ? "on" : "off"}; warm runtime ${warm.enabled ? "on" : "off"}.`;
}
