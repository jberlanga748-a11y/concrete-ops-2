import assert from "node:assert/strict";
import test from "node:test";

import {
  APEX_VOICE_TURN_FAILURE_REASONS,
  buildApexLatencyProfile,
  summarizeApexLiveTurnLatency,
  buildApexVoiceTurnReceipt,
  parseApexVoiceTurnDataUrl,
  readApexWavMetadata,
  summarizeApexLatencyProfile,
  summarizeApexVoiceTurnFailure,
  summarizeApexVoiceTurnSpeed,
  validateApexVoiceTurnPayload,
} from "./apexVoiceTurnDiagnostics.js";

function writeAscii(view, offset, value) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}

function createPcm16Wav({ sampleRate = 16000, durationMs = 500, channelCount = 1 } = {}) {
  const frameCount = Math.max(1, Math.round((sampleRate * durationMs) / 1000));
  const bytesPerSample = 2;
  const dataSize = frameCount * channelCount * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channelCount, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channelCount * bytesPerSample, true);
  view.setUint16(32, channelCount * bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, dataSize, true);
  return Buffer.from(buffer);
}

function toDataUrl(buffer, mime = "audio/wav") {
  return `data:${mime};base64,${Buffer.from(buffer).toString("base64")}`;
}

test("voice turn diagnostics parses valid 16 kHz mono WAV metadata", () => {
  const wav = createPcm16Wav({ sampleRate: 16000, durationMs: 500, channelCount: 1 });
  const parsed = parseApexVoiceTurnDataUrl(toDataUrl(wav));
  const metadata = readApexWavMetadata(parsed.bytes);

  assert.equal(parsed.ok, true);
  assert.equal(metadata.valid, true);
  assert.equal(metadata.sampleRate, 16000);
  assert.equal(metadata.channelCount, 1);
  assert.equal(metadata.bitsPerSample, 16);
  assert.equal(metadata.durationMs, 500);
});

test("voice turn diagnostics rejects invalid data URL and unsupported MIME", () => {
  const invalid = validateApexVoiceTurnPayload({ audioDataUrl: "not-a-data-url" });
  assert.equal(invalid.audioValid, false);
  assert.equal(invalid.failureReason, APEX_VOICE_TURN_FAILURE_REASONS.INVALID_DATA_URL);

  const unsupported = validateApexVoiceTurnPayload({
    audioDataUrl: `data:text/plain;base64,${Buffer.from("hello").toString("base64")}`,
  });
  assert.equal(unsupported.audioValid, false);
  assert.equal(unsupported.failureReason, APEX_VOICE_TURN_FAILURE_REASONS.UNSUPPORTED_MIME);
});

test("voice turn diagnostics rejects too-short and muted turns before STT", () => {
  const short = validateApexVoiceTurnPayload({
    audioDataUrl: toDataUrl(createPcm16Wav({ durationMs: 60 })),
    minDurationMs: 180,
  });
  assert.equal(short.audioValid, false);
  assert.equal(short.failureReason, APEX_VOICE_TURN_FAILURE_REASONS.TOO_SHORT);

  const muted = validateApexVoiceTurnPayload({
    audioDataUrl: toDataUrl(createPcm16Wav()),
    alwaysOpenMic: { muted: true, state: "muted" },
  });
  assert.equal(muted.audioValid, false);
  assert.equal(muted.failureReason, APEX_VOICE_TURN_FAILURE_REASONS.MUTED_BY_GATE);
});

test("voice turn receipts report timing, slowest step, and safe failure labels", () => {
  const validation = validateApexVoiceTurnPayload({
    turnId: "turn-1",
    audioDataUrl: toDataUrl(createPcm16Wav()),
  });
  const receipt = buildApexVoiceTurnReceipt({
    turnId: "turn-1",
    status: "transcribed",
    audioValidation: validation,
    timingMs: {
      captureDurationMs: 500,
      voiceCloseMs: 520,
      vadActualSilenceMs: 520,
      clientWavConversionMs: 23,
      serverAudioParseMs: 4,
      sttMs: 900,
      modelTotalMs: 320,
      ttsGenerationMs: 180,
      playbackStartDelayMs: 35,
      totalTurnMs: 1500,
    },
    engine: "faster-whisper-cuda",
    processor: "gpu",
    modelName: "small.en",
  });

  assert.equal(receipt.audioValid, true);
  assert.equal(receipt.slowestStep, "sttMs");
  assert.equal(receipt.totalTurnMs, 1500);
  const speedSummary = summarizeApexVoiceTurnSpeed(receipt);
  assert.match(speedSummary, /1500 ms/i);
  assert.match(speedSummary, /close 520 ms/i);
  assert.match(speedSummary, /STT 900 ms/i);
  assert.match(speedSummary, /brain 320 ms/i);
  assert.match(speedSummary, /TTS 180 ms/i);
  assert.match(speedSummary, /playback 35 ms/i);

  const failed = buildApexVoiceTurnReceipt({
    turnId: "turn-2",
    status: "failed",
    failureReason: APEX_VOICE_TURN_FAILURE_REASONS.WAV_CONVERSION_FAILED,
  });
  assert.match(summarizeApexVoiceTurnFailure(failed), /WAV conversion failed/i);
});

test("latency profiler combines voice, queue, model, TTS, and warm-runtime receipts", () => {
  const profile = buildApexLatencyProfile({
    turnId: "turn-speed-1",
    voiceReceipt: {
      timingMs: {
        captureDurationMs: 400,
        voiceCloseMs: 240,
        clientWavConversionMs: 18,
        uploadRequestMs: 25,
        serverAudioParseMs: 5,
        sttMs: 880,
      },
      totalTurnMs: 1800,
    },
    modelReceipt: {
      activeMode: "speed",
      modelId: "qwen3:14b",
      responseTimingMs: 620,
      keepAlive: "60m",
      modelAlreadyLoaded: true,
    },
    modelQueue: {
      queuedMs: 35,
    },
    ttsReceipt: {
      generationTimingMs: 260,
    },
    playbackTimingMs: {
      playbackStartDelayMs: 70,
      recoveryMs: 160,
    },
    warmRuntime: {
      keepWarm: {
        enabled: true,
        targetModel: "qwen3:14b",
        keepAlive: "60m",
      },
      voice: {
        canHearLocally: true,
        canSpeakLocally: true,
      },
    },
  });

  assert.equal(profile.provider, "apex-latency-profiler");
  assert.equal(profile.version, "v1");
  assert.equal(profile.status, "fast");
  assert.equal(profile.fastPathActive, true);
  assert.equal(profile.warmRuntime.enabled, true);
  assert.equal(profile.warmRuntime.ready, true);
  assert.equal(profile.warmRuntime.sttReady, true);
  assert.equal(profile.warmRuntime.ttsReady, true);
  assert.equal(profile.slowestStep, "sttMs");
  assert.equal(profile.slowestStepMs, 880);
  assert.equal(profile.liveTurn.provider, "apex-live-turn-latency");
  assert.equal(profile.liveTurn.version, "v1");
  assert.equal(profile.liveTurn.bottleneckOwner, "voice-pipeline");
  assert.equal(profile.liveTurn.diagnosis, "model-fast-voice-slow");
  assert.equal(profile.liveTurn.modelTotalMs, 620);
  assert.match(summarizeApexLatencyProfile(profile), /fast path on/i);
  assert.match(summarizeApexLiveTurnLatency(profile), /STT 880 ms/i);
  assert.doesNotMatch(JSON.stringify(profile), /rawPromptBody|rawResponseBody|audioBase64|message\.content/i);
});

test("latency profiler names model-fast voice-slow turns without blaming Ollama", () => {
  const profile = buildApexLatencyProfile({
    turnId: "turn-live-v1",
    voiceReceipt: {
      timingMs: {
        voiceCloseMs: 520,
        sttMs: 960,
        modelFirstTokenMs: 160,
        modelTotalMs: 572,
        ttsGenerationMs: 240,
        playbackStartDelayMs: 60,
        recoveryMs: 120,
        totalTurnMs: 2650,
        localVoiceStatusDiscoveryMs: 3,
        localVoiceStatusCacheHit: 1,
      },
      totalTurnMs: 2650,
      localVoiceStatusCacheHit: true,
      localVoiceStatusDiscoveryMs: 3,
    },
  });

  assert.equal(profile.liveTurn.diagnosis, "model-fast-voice-slow");
  assert.equal(profile.liveTurn.modelFast, true);
  assert.equal(profile.liveTurn.voiceDominant, true);
  assert.equal(profile.liveTurn.cachedVoiceReadinessReused, true);
  assert.match(profile.liveTurn.note, /not Ollama/i);

  const receipt = buildApexVoiceTurnReceipt({
    turnId: "turn-live-v1",
    status: "spoken",
    timingMs: {
      voiceCloseMs: 520,
      sttMs: 960,
      modelFirstTokenMs: 160,
      modelTotalMs: 572,
      ttsGenerationMs: 240,
      totalTurnMs: 2650,
      localVoiceStatusCacheHit: 1,
    },
  });

  assert.equal(receipt.liveTurnLatency.provider, "apex-live-turn-latency");
  assert.match(summarizeApexVoiceTurnSpeed(receipt), /not Ollama/i);
});
