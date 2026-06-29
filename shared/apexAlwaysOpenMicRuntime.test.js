import assert from "node:assert/strict";
import test from "node:test";

import {
  APEX_ALWAYS_OPEN_MIC_STATE,
  buildApexAlwaysOpenMicReceipt,
  buildApexAlwaysOpenMicStatus,
  buildApexAlwaysOpenMicTranscriptionGate,
  reduceApexAlwaysOpenMicRuntime,
  shouldMuteApexAlwaysOpenMic,
} from "./apexAlwaysOpenMicRuntime.js";

test("always-open mic state transitions through standby, capturing, processing, quiet, and wake", () => {
  const standby = reduceApexAlwaysOpenMicRuntime({}, { type: "start-listening", now: "2026-06-07T00:00:00.000Z" });
  assert.equal(standby.state, APEX_ALWAYS_OPEN_MIC_STATE.STANDBY);
  assert.equal(standby.listening, true);

  const capturing = reduceApexAlwaysOpenMicRuntime(standby, { type: "speech-detected", now: "2026-06-07T00:00:01.000Z" });
  assert.equal(capturing.state, APEX_ALWAYS_OPEN_MIC_STATE.CAPTURING);
  assert.equal(capturing.speechDetected, true);

  const processing = reduceApexAlwaysOpenMicRuntime(capturing, { type: "silence-complete", now: "2026-06-07T00:00:02.000Z" });
  assert.equal(processing.state, APEX_ALWAYS_OPEN_MIC_STATE.PROCESSING);
  assert.equal(processing.listening, false);

  const quiet = reduceApexAlwaysOpenMicRuntime(processing, { type: "go-quiet", now: "2026-06-07T00:00:03.000Z" });
  assert.equal(quiet.state, APEX_ALWAYS_OPEN_MIC_STATE.QUIET);
  assert.equal(quiet.listening, false);

  const awake = reduceApexAlwaysOpenMicRuntime(quiet, { type: "wake-up", now: "2026-06-07T00:00:04.000Z" });
  assert.equal(awake.state, APEX_ALWAYS_OPEN_MIC_STATE.STANDBY);
  assert.equal(awake.listening, true);
});

test("mute gate blocks quiet, speaking, recovering, TTS-active, and playback-expected frames", () => {
  for (const state of [
    APEX_ALWAYS_OPEN_MIC_STATE.QUIET,
    APEX_ALWAYS_OPEN_MIC_STATE.SPEAKING,
    APEX_ALWAYS_OPEN_MIC_STATE.RECOVERING,
  ]) {
    const gate = shouldMuteApexAlwaysOpenMic({ state });
    assert.equal(gate.muted, true);
    assert.equal(gate.shouldBuffer, false);
    assert.equal(gate.shouldTranscribe, false);
  }

  assert.equal(shouldMuteApexAlwaysOpenMic({ state: "standby", isSpeaking: true }).muted, true);
  assert.equal(shouldMuteApexAlwaysOpenMic({ state: "standby", ttsActive: true }).muted, true);
  assert.equal(shouldMuteApexAlwaysOpenMic({ state: "standby", playbackExpected: true }).muted, true);
});

test("STT is only allowed after gating detects speech and sustained silence", () => {
  const startedAt = 1000;
  const lastSpeechAt = 1760;
  const tooEarly = buildApexAlwaysOpenMicTranscriptionGate({
    state: "capturing",
    level: 0.002,
    captureStartedAtMs: startedAt,
    lastSpeechAtMs: lastSpeechAt,
    nowMs: 2300,
    sustainedSilenceMs: 800,
    minCaptureMs: 850,
  });

  assert.equal(tooEarly.readyForTranscription, false);
  assert.equal(tooEarly.shouldTranscribe, false);
  assert.equal(tooEarly.nextState, APEX_ALWAYS_OPEN_MIC_STATE.CAPTURING);

  const ready = buildApexAlwaysOpenMicTranscriptionGate({
    state: "capturing",
    level: 0.002,
    captureStartedAtMs: startedAt,
    lastSpeechAtMs: lastSpeechAt,
    nowMs: 2601,
    sustainedSilenceMs: 800,
    minCaptureMs: 850,
  });

  assert.equal(ready.readyForTranscription, true);
  assert.equal(ready.shouldTranscribe, true);
  assert.equal(ready.nextState, APEX_ALWAYS_OPEN_MIC_STATE.PROCESSING);
  assert.equal(ready.sustainedSilenceMs, 800);
});

test("single silent frame in standby does not trigger transcription", () => {
  const gate = buildApexAlwaysOpenMicTranscriptionGate({
    state: "standby",
    level: 0.001,
    nowMs: 1000,
  });

  assert.equal(gate.speechDetected, false);
  assert.equal(gate.shouldTranscribe, false);
  assert.equal(gate.nextState, APEX_ALWAYS_OPEN_MIC_STATE.STANDBY);
});

test("always-open mic defaults use patient local turn boundaries", () => {
  const status = buildApexAlwaysOpenMicStatus({ state: "standby" });

  assert.equal(status.sustainedSilenceMs, 1800);
  assert.equal(status.minCaptureMs, 1200);
  assert.equal(status.openAiAudioUsed, false);
});

test("STT gate waits for the patient silence target before closing a spoken turn", () => {
  const tooEarly = buildApexAlwaysOpenMicTranscriptionGate({
    state: "capturing",
    level: 0.002,
    captureStartedAtMs: 1000,
    lastSpeechAtMs: 1500,
    nowMs: 2020,
    sustainedSilenceMs: 1800,
    minCaptureMs: 1200,
  });

  assert.equal(tooEarly.readyForTranscription, false);
  assert.equal(tooEarly.shouldTranscribe, false);

  const ready = buildApexAlwaysOpenMicTranscriptionGate({
    state: "capturing",
    level: 0.002,
    captureStartedAtMs: 1000,
    lastSpeechAtMs: 1500,
    nowMs: 3300,
    sustainedSilenceMs: 1800,
    minCaptureMs: 1200,
  });

  assert.equal(ready.readyForTranscription, true);
  assert.equal(ready.shouldTranscribe, true);
  assert.equal(ready.nextState, APEX_ALWAYS_OPEN_MIC_STATE.PROCESSING);
  assert.equal(ready.silenceDurationMs, 1800);
  assert.equal(ready.sustainedSilenceMs, 1800);
});

test("receipts are compact, local, and secret-free", () => {
  const receipt = buildApexAlwaysOpenMicReceipt({
    state: "processing",
    status: "transcribed",
    speechDetected: true,
    captureDurationMs: 1610,
    sttProvider: "faster-whisper-cuda",
    sttProcessor: "gpu",
    transcriptionTimingMs: 742,
    droppedFramesWhileMuted: 6,
    fallbackReason: "sk-secret-should-not-leak",
  });

  assert.equal(receipt.provider, "apex-always-open-mic");
  assert.equal(receipt.ingressProvider, "browser");
  assert.equal(receipt.vadProvider, "amplitude-gate");
  assert.equal(receipt.state, APEX_ALWAYS_OPEN_MIC_STATE.PROCESSING);
  assert.equal(receipt.sttProvider, "faster-whisper-cuda");
  assert.equal(receipt.sttProcessor, "gpu");
  assert.equal(receipt.openAiAudioUsed, false);
  assert.equal(receipt.cloudAudioAllowed, false);
  assert.equal(receipt.audioStored, false);
  assert.doesNotMatch(JSON.stringify(receipt), /sk-secret-should-not-leak/i);
  assert.doesNotMatch(JSON.stringify(receipt), /api[_-]?key|authorization|bearer/i);

  const status = buildApexAlwaysOpenMicStatus({
    state: "standby",
    droppedFramesWhileMuted: 2,
  });
  assert.equal(status.mode, "always-open-local");
  assert.equal(status.openAiAudioUsed, false);
  assert.equal(status.droppedFramesWhileMuted, 2);
});
