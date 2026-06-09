import assert from "node:assert/strict";
import test from "node:test";

import { createApexFamilyCareNote } from "./apexFamilyCare.js";
import {
  APEX_FAMILY_CARE_NOTIFICATION_POLICY,
  APEX_FAMILY_CARE_SAFE_NOTIFICATION_COPY,
  buildApexFamilyCareNotificationState,
  getDefaultApexFamilyCareNotificationPreferences,
  isApexFamilyCareLockScreenCopySafe,
  normalizeApexFamilyCareNotificationPreferences,
} from "./apexFamilyCareNotifications.js";

test("Family Care notification policy is local-only and sends nothing live", () => {
  assert.equal(APEX_FAMILY_CARE_NOTIFICATION_POLICY.localOnly, true);
  assert.equal(APEX_FAMILY_CARE_NOTIFICATION_POLICY.familyCareOnly, true);
  assert.equal(APEX_FAMILY_CARE_NOTIFICATION_POLICY.apexHqProductWork, false);
  assert.equal(APEX_FAMILY_CARE_NOTIFICATION_POLICY.liveDeliveryEnabled, false);
  assert.equal(APEX_FAMILY_CARE_NOTIFICATION_POLICY.providerSendsEnabled, false);
  assert.equal(APEX_FAMILY_CARE_NOTIFICATION_POLICY.pushEnabled, false);
  assert.equal(APEX_FAMILY_CARE_NOTIFICATION_POLICY.smsEnabled, false);
  assert.equal(APEX_FAMILY_CARE_NOTIFICATION_POLICY.emailEnabled, false);
  assert.equal(APEX_FAMILY_CARE_NOTIFICATION_POLICY.cloudUsed, false);
  assert.equal(APEX_FAMILY_CARE_NOTIFICATION_POLICY.realDeliveryDeferredTo, "Phase 5A");
});

test("notification preferences normalize to safe defaults and force live delivery off", () => {
  const defaults = getDefaultApexFamilyCareNotificationPreferences();
  const normalized = normalizeApexFamilyCareNotificationPreferences({
    ...defaults,
    quietHoursStart: "bad",
    quietHoursEnd: "99:99",
    lockScreenSensitiveDetails: true,
    liveDeliveryEnabled: true,
    recipientGroup: "family",
  });

  assert.equal(defaults.familyDigestEnabled, true);
  assert.equal(normalized.quietHoursStart, defaults.quietHoursStart);
  assert.equal(normalized.quietHoursEnd, defaults.quietHoursEnd);
  assert.equal(normalized.lockScreenSensitiveDetails, false);
  assert.equal(normalized.liveDeliveryEnabled, false);
  assert.equal(normalized.recipientGroup, "family");
});

test("notification decisions cover digest, concern, missing update, doctor summary, and quiet hours", () => {
  const notes = [
    createApexFamilyCareNote({
      id: "concern-1",
      category: "concern",
      reporter: "Dad",
      timestamp: "2026-06-09T18:30:00.000Z",
      summary: "Concern marked for review.",
      familyVisible: true,
      addToDoctorSummary: true,
    }, new Date("2026-06-09T18:30:00.000Z")),
  ];
  const state = buildApexFamilyCareNotificationState(notes, {
    now: new Date("2026-06-09T21:00:00"),
    preferences: {
      quietHoursEnabled: true,
      quietHoursStart: "20:00",
      quietHoursEnd: "08:00",
      lowNoiseMode: true,
    },
  });

  assert.equal(state.quietHoursActive, true);
  assert.equal(state.summary.liveDeliveryEnabled, false);
  assert.equal(state.summary.providerSendQueuedCount, 0);
  assert.equal(state.decisions.length, 5);
  assert.equal(state.decisions.find((decision) => decision.type === "family-digest").shouldNotify, true);
  assert.equal(state.decisions.find((decision) => decision.type === "family-digest").quietHoursHold, true);
  assert.equal(state.decisions.find((decision) => decision.type === "concern-marked").shouldNotify, true);
  assert.equal(state.decisions.find((decision) => decision.type === "concern-marked").quietHoursHold, false);
  assert.equal(state.decisions.find((decision) => decision.type === "doctor-summary-ready").shouldNotify, true);
  assert.equal(state.decisions.every((decision) => decision.sendNow === false), true);
  assert.equal(state.decisions.every((decision) => decision.providerSendQueued === false), true);
  assert.equal(state.decisions.every((decision) => decision.lockScreenCopySafe), true);
});

test("missing-update notification uses private-safe copy and stores only compact metadata", () => {
  const rawPrivateText = "Grandma's knee hurt after lunch and she took a pill.";
  const oldNote = createApexFamilyCareNote({
    id: "old-private-note",
    category: "pain",
    reporter: "Brother",
    timestamp: "2026-06-07T09:00:00.000Z",
    summary: rawPrivateText,
    bodyArea: "knee",
    familyVisible: true,
  }, new Date("2026-06-07T09:00:00.000Z"));

  const state = buildApexFamilyCareNotificationState([oldNote], {
    now: new Date("2026-06-09T12:00:00.000Z"),
  });
  const missing = state.decisions.find((decision) => decision.type === "missing-update");

  assert.equal(missing.shouldNotify, true);
  assert.equal(missing.lockScreenCopy, APEX_FAMILY_CARE_SAFE_NOTIFICATION_COPY.missingUpdate);
  assert.equal(isApexFamilyCareLockScreenCopySafe(missing.lockScreenCopy), true);
  assert.equal(isApexFamilyCareLockScreenCopySafe(rawPrivateText), false);
  assert.equal(JSON.stringify(state.receipt).includes(rawPrivateText), false);
  assert.equal(JSON.stringify(state.receipt).includes("knee"), false);
  assert.equal(state.receipt.rawNoteStored, false);
  assert.equal(state.receipt.rawAudioStored, false);
  assert.equal(state.receipt.rawTranscriptStored, false);
  assert.equal(state.receipt.cloudUsed, false);
});

test("disabled notification preferences suppress only the matching decision", () => {
  const note = createApexFamilyCareNote({
    id: "visible-1",
    category: "normal",
    reporter: "Dad",
    timestamp: "2026-06-09T12:00:00.000Z",
    summary: "Normal check-in.",
    familyVisible: true,
  });
  const state = buildApexFamilyCareNotificationState([note], {
    now: new Date("2026-06-09T12:30:00.000Z"),
    preferences: {
      familyDigestEnabled: false,
      doctorSummaryNotificationsEnabled: false,
    },
  });

  const digest = state.decisions.find((decision) => decision.type === "family-digest");
  const doctor = state.decisions.find((decision) => decision.type === "doctor-summary-ready");

  assert.equal(digest.enabled, false);
  assert.equal(digest.shouldNotify, false);
  assert.equal(digest.reason, "disabled-by-preference");
  assert.equal(doctor.enabled, false);
  assert.equal(doctor.shouldNotify, false);
  assert.equal(state.receipt.metadata.providerSendsQueued, false);
});
