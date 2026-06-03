import assert from "node:assert/strict";
import test from "node:test";

import {
  APEX_OS_VOICE_SPEECH_MODEL,
  APEX_OS_VOICE_TRANSCRIPTION_MODEL,
  buildApexOsVoiceCommandReview,
  buildApexOsVoiceSpeechRequest,
  detectApexOsVoiceCommand,
  parseApexOsVoiceAudioDataUrl,
  parseApexOsVoiceTranscriptionPayload,
} from "./apexOsVoice.js";

test("Apex OS voice command parser recognizes the original Phase 12 commands", () => {
  assert.equal(detectApexOsVoiceCommand("What needs my approval?").id, "needs-approval");
  assert.equal(detectApexOsVoiceCommand("Pause agents.").id, "pause-agents");
  assert.equal(detectApexOsVoiceCommand("Summarize today.").id, "summarize-today");
  assert.equal(detectApexOsVoiceCommand("Show blockers.").id, "show-blockers");
  assert.equal(detectApexOsVoiceCommand("Save this as a decision.").id, "save-decision");
  assert.equal(detectApexOsVoiceCommand("Start the next safe task.").id, "start-next-safe-task");
});

test("Apex OS voice command review keeps risky commands locked", () => {
  const review = buildApexOsVoiceCommandReview("Pause agents and deploy production.");

  assert.equal(review.commandId, "pause-agents");
  assert.equal(review.approvalRequired, true);
  assert.equal(review.confirmationRequired, true);
  assert.equal(review.executionLocked, true);
  assert.equal(review.canExecute, false);
  assert.match(review.askQuestion, /do not pause, run, or execute/i);
  assert.equal(review.reasons.some((reason) => /approval packet/i.test(reason)), true);
});

test("Apex OS general voice question is source-backed and non-executing", () => {
  const review = buildApexOsVoiceCommandReview("What is blocking launch today?");

  assert.equal(review.commandId, "show-blockers");
  assert.equal(review.confirmationRequired, true);
  assert.equal(review.executionLocked, true);
  assert.equal(review.canExecute, false);
  assert.equal(review.audioStored, false);
});

test("Apex OS speech request uses server-side TTS shape and clamps voice", () => {
  const request = buildApexOsVoiceSpeechRequest({
    text: "Apex can talk back after a source-backed answer.",
    voice: "not-a-real-voice",
  });

  assert.equal(request.model, APEX_OS_VOICE_SPEECH_MODEL);
  assert.equal(request.voice, "alloy");
  assert.equal(request.response_format, "mp3");
  assert.match(request.instructions, /AI-generated/i);
});

test("Apex OS voice audio and transcription helpers validate safe inputs", () => {
  const parsedAudio = parseApexOsVoiceAudioDataUrl("data:audio/webm;base64,AAAA");
  assert.equal(parsedAudio.ok, true);
  assert.equal(parsedAudio.mimeType, "audio/webm");
  assert.equal(parsedAudio.extension, "webm");

  const rejectedAudio = parseApexOsVoiceAudioDataUrl("data:text/plain;base64,AAAA");
  assert.equal(rejectedAudio.ok, false);

  const transcript = parseApexOsVoiceTranscriptionPayload({ text: "Summarize today." });
  assert.equal(transcript, "Summarize today.");
  assert.equal(APEX_OS_VOICE_TRANSCRIPTION_MODEL, "gpt-4o-mini-transcribe");
});
