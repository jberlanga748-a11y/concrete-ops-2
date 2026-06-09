import assert from "node:assert/strict";
import test from "node:test";

import {
  APEX_FAMILY_CARE_VOICE_POLICY,
  createApexFamilyCareVoiceNoteDraft,
  parseApexFamilyCareVoiceNote,
} from "./apexFamilyCareVoice.js";

const FIXED_NOW = new Date("2026-06-09T19:00:00.000Z");

function assertPrivateVoiceReceipt(receipt, rawText = "Grandma knee hurt after lunch") {
  assert.equal(receipt.receiptType, "apex-family-care-voice");
  assert.equal(receipt.localOnly, true);
  assert.equal(receipt.familyCareOnly, true);
  assert.equal(receipt.apexHqProductWork, false);
  assert.equal(receipt.explicitUserStarted, true);
  assert.equal(receipt.visibleListeningMode, true);
  assert.equal(receipt.hiddenRecording, false);
  assert.equal(receipt.backgroundRecording, false);
  assert.equal(receipt.rawAudioStored, false);
  assert.equal(receipt.rawTranscriptStored, false);
  assert.equal(receipt.rawPromptStored, false);
  assert.equal(receipt.rawResponseStored, false);
  assert.equal(receipt.cloudUsed, false);
  assert.equal(receipt.cloudSttAllowed, false);
  assert.equal(receipt.browserSpeechRecognitionAllowed, false);
  assert.equal(receipt.secretsStored, false);
  assert.equal(receipt.customerDataStored, false);
  assert.equal(receipt.medicalDiagnosis, false);
  assert.equal(receipt.emergencyReplacement, false);
  assert.doesNotMatch(JSON.stringify(receipt), new RegExp(rawText, "i"));
}

test("Family Care voice policy is explicit, local, and non-recording by default", () => {
  assert.equal(APEX_FAMILY_CARE_VOICE_POLICY.policyId, "apex-family-care-voice-first-v1");
  assert.equal(APEX_FAMILY_CARE_VOICE_POLICY.explicitUserStartedRequired, true);
  assert.equal(APEX_FAMILY_CARE_VOICE_POLICY.visibleListeningModeRequired, true);
  assert.equal(APEX_FAMILY_CARE_VOICE_POLICY.hiddenRecording, false);
  assert.equal(APEX_FAMILY_CARE_VOICE_POLICY.backgroundRecording, false);
  assert.equal(APEX_FAMILY_CARE_VOICE_POLICY.rawAudioStored, false);
  assert.equal(APEX_FAMILY_CARE_VOICE_POLICY.rawTranscriptStored, false);
  assert.equal(APEX_FAMILY_CARE_VOICE_POLICY.cloudUsed, false);
  assert.equal(APEX_FAMILY_CARE_VOICE_POLICY.browserSpeechRecognitionAllowed, false);
  assert.equal(APEX_FAMILY_CARE_VOICE_POLICY.maxFollowUps, 1);
});

test("voice parser turns a spoken pain update into a compact care note", () => {
  const result = parseApexFamilyCareVoiceNote("Apex, log that Grandma's knee hurt after lunch.", {
    now: FIXED_NOW,
    reporter: "Dad",
    explicitUserStarted: true,
  });

  assert.equal(result.noteReady, true);
  assert.equal(result.needsFollowUp, false);
  assert.equal(result.category, "pain");
  assert.equal(result.severity, "unknown");
  assert.equal(result.bodyArea, "knee");
  assert.equal(result.noteInput.source, "voice");
  assert.equal(result.noteInput.reporter, "Dad");
  assert.equal(result.noteInput.addToDoctorSummary, true);
  assert.equal(result.noteInput.familyVisible, true);
  assert.equal(result.noteInput.tags.includes("voice-entry"), true);
  assert.equal(result.noteInput.tags.includes("knee"), true);
  assert.match(result.noteInput.summary, /Pain update:/);
  assertPrivateVoiceReceipt(result.receipt);
  assert.equal(result.receipt.metadata.category, "pain");
  assert.equal(result.receipt.metadata.bodyAreaDetected, true);
});

test("voice parser asks only one follow-up for unclear updates", () => {
  const unclear = parseApexFamilyCareVoiceNote("not good", {
    now: FIXED_NOW,
    reporter: "Brother",
    explicitUserStarted: true,
  });

  assert.equal(unclear.needsFollowUp, true);
  assert.equal(unclear.noteReady, false);
  assert.equal(unclear.followUpCount, 0);
  assert.match(unclear.followUpPrompt, /family should know/i);
  assertPrivateVoiceReceipt(unclear.receipt, "not good");
  assert.equal(unclear.receipt.metadata.needsFollowUp, true);
  assert.equal(unclear.receipt.metadata.followUpAsked, true);

  const afterFollowUp = parseApexFamilyCareVoiceNote("not good", {
    now: FIXED_NOW,
    reporter: "Brother",
    explicitUserStarted: true,
    followUpCount: 1,
    followUpAnswer: "Her stomach hurt before dinner.",
  });

  assert.equal(afterFollowUp.needsFollowUp, false);
  assert.equal(afterFollowUp.noteReady, true);
  assert.equal(afterFollowUp.followUpCount, 1);
  assert.equal(afterFollowUp.category, "pain");
  assert.equal(afterFollowUp.bodyArea, "stomach");
  assert.equal(afterFollowUp.receipt.metadata.followUpCount, 1);
  assert.equal(afterFollowUp.receipt.metadata.followUpLimitReached, false);
  assertPrivateVoiceReceipt(afterFollowUp.receipt, "Her stomach hurt before dinner");
});

test("voice parser saves a needs-review note after the follow-up limit is reached", () => {
  const result = parseApexFamilyCareVoiceNote("bad", {
    now: FIXED_NOW,
    reporter: "Family",
    explicitUserStarted: true,
    followUpCount: 1,
  });

  assert.equal(result.needsFollowUp, false);
  assert.equal(result.noteReady, true);
  assert.equal(result.followUpLimitReached, true);
  assert.equal(result.noteInput.tags.includes("needs-review"), true);
  assert.match(result.noteInput.summary, /Needs family review/i);
  assert.equal(result.receipt.metadata.followUpLimitReached, true);
  assertPrivateVoiceReceipt(result.receipt, "bad");
});

test("voice note draft helper keeps receipt metadata compact", () => {
  const result = createApexFamilyCareVoiceNoteDraft({
    transcript: "Grandma ate a normal lunch and drank water.",
    reporter: "Dad",
    explicitUserStarted: true,
    inputMode: "visible-transcript",
  }, FIXED_NOW);

  assert.equal(result.category, "food");
  assert.equal(result.noteInput.source, "voice");
  assert.equal(result.receipt.metadata.inputMode, "visible-transcript");
  assert.equal(typeof result.receipt.metadata.summaryLength, "number");
  assert.doesNotMatch(JSON.stringify(result.receipt), /ate a normal lunch|drank water/i);
});
