import assert from "node:assert/strict";
import test from "node:test";

import { createApexFamilyCareNote } from "./apexFamilyCare.js";
import {
  APEX_FAMILY_CARE_TEST_WEEK_POLICY,
  addApexFamilyCareTestWeekFrictionNote,
  buildApexFamilyCareTestWeekSummary,
  getDefaultApexFamilyCareTestWeekState,
  markApexFamilyCareTestWeekComplete,
  startApexFamilyCareTestWeek,
} from "./apexFamilyCareTestWeek.js";

test("Family Care test week policy requires real family evidence and cannot auto-complete", () => {
  assert.equal(APEX_FAMILY_CARE_TEST_WEEK_POLICY.localOnly, true);
  assert.equal(APEX_FAMILY_CARE_TEST_WEEK_POLICY.familyCareOnly, true);
  assert.equal(APEX_FAMILY_CARE_TEST_WEEK_POLICY.apexHqProductWork, false);
  assert.equal(APEX_FAMILY_CARE_TEST_WEEK_POLICY.actualFamilyWeekRequired, true);
  assert.equal(APEX_FAMILY_CARE_TEST_WEEK_POLICY.canAutoCompletePhase, false);
  assert.equal(APEX_FAMILY_CARE_TEST_WEEK_POLICY.completionRequiresHumanReview, true);
  assert.equal(APEX_FAMILY_CARE_TEST_WEEK_POLICY.rawFeedbackStoredInReceipt, false);
  assert.equal(APEX_FAMILY_CARE_TEST_WEEK_POLICY.cloudUsed, false);
  assert.equal(APEX_FAMILY_CARE_TEST_WEEK_POLICY.smsSent, false);
  assert.equal(APEX_FAMILY_CARE_TEST_WEEK_POLICY.emailSent, false);
});

test("test week summary stays missing until a real seven-day week is complete", () => {
  const state = startApexFamilyCareTestWeek(getDefaultApexFamilyCareTestWeekState(new Date("2026-06-09T08:00:00.000Z")), new Date("2026-06-09T08:00:00.000Z"));
  const summary = buildApexFamilyCareTestWeekSummary(state, [], {
    now: new Date("2026-06-11T08:00:00.000Z"),
  });

  assert.equal(summary.state.realWeekStarted, true);
  assert.equal(summary.state.realWeekCompleted, false);
  assert.equal(summary.trackedDays, 3);
  assert.equal(summary.evidenceReady, false);
  assert.equal(summary.phaseClosureStatus, "real-week-evidence-missing");
  assert.match(summary.recommendedNextStep, /Run the real family test week/i);
});

test("real-week evidence summary can become review-ready but still requires human review", () => {
  const notes = [
    createApexFamilyCareNote({
      id: "day-1",
      category: "normal",
      timestamp: "2026-06-09T09:00:00.000Z",
      summary: "Normal check-in.",
      familyVisible: true,
    }),
    createApexFamilyCareNote({
      id: "day-2",
      category: "appointment",
      timestamp: "2026-06-10T09:00:00.000Z",
      summary: "Doctor question saved.",
      familyVisible: true,
    }),
  ];
  let state = startApexFamilyCareTestWeek({
    baselineStatusTextsPerDay: 8,
    afterStatusTextsPerDay: 3,
    doctorPrepBeforeRating: 2,
    doctorPrepAfterRating: 5,
    familyInformedBeforeRating: 2,
    familyInformedAfterRating: 4,
    dadExplanationBurdenBeforeRating: 5,
    dadExplanationBurdenAfterRating: 2,
    grandmaDignityRating: 5,
    updatesUnder10Seconds: "yes",
  }, new Date("2026-06-09T08:00:00.000Z"));
  state = addApexFamilyCareTestWeekFrictionNote(state, {
    reporter: "Dad",
    category: "useful",
    text: "The doctor summary helped.",
    suggestion: "Freeze doctor summary.",
    shouldFreeze: true,
  }, new Date("2026-06-12T08:00:00.000Z"));
  state = markApexFamilyCareTestWeekComplete(state, new Date("2026-06-16T08:00:00.000Z"));

  const summary = buildApexFamilyCareTestWeekSummary(state, notes, {
    now: new Date("2026-06-16T08:00:00.000Z"),
  });

  assert.equal(summary.trackedDays, 8);
  assert.equal(summary.evidenceReady, true);
  assert.equal(summary.phaseClosureStatus, "human-review-required");
  assert.equal(summary.passedCount >= 6, true);
  assert.equal(summary.freezeCount, 1);
  assert.equal(summary.receipt.canAutoCompletePhase, false);
  assert.equal(summary.receipt.metadata.evidenceReady, true);
});

test("test week receipts do not store raw friction text", () => {
  const privateFeedback = "Grandma said the knee note felt too detailed on the family screen.";
  const state = addApexFamilyCareTestWeekFrictionNote(getDefaultApexFamilyCareTestWeekState(new Date("2026-06-09T08:00:00.000Z")), {
    reporter: "John",
    category: "privacy",
    text: privateFeedback,
    suggestion: "Make family summaries shorter.",
    shouldSimplify: true,
  }, new Date("2026-06-09T09:00:00.000Z"));
  const summary = buildApexFamilyCareTestWeekSummary(state, [], {
    now: new Date("2026-06-09T10:00:00.000Z"),
  });

  assert.equal(state.frictionNotes[0].text, privateFeedback);
  assert.equal(summary.simplifyCount, 1);
  assert.equal(summary.receipt.rawFeedbackStoredInReceipt, false);
  assert.equal(JSON.stringify(summary.receipt).includes(privateFeedback), false);
  assert.equal(JSON.stringify(summary.receipt).includes("knee"), false);
  assert.equal(summary.receipt.rawAudioStored, false);
  assert.equal(summary.receipt.rawTranscriptStored, false);
});
