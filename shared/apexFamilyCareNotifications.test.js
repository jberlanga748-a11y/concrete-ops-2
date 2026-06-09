import assert from "node:assert/strict";
import test from "node:test";

import { createApexFamilyCareNote } from "./apexFamilyCare.js";
import {
  APEX_FAMILY_CARE_EXTERNAL_NOTIFICATION_APPROVAL_POLICY,
  APEX_FAMILY_CARE_NOTIFICATION_DELIVERY_POLICY,
  APEX_FAMILY_CARE_NOTIFICATION_POLICY,
  APEX_FAMILY_CARE_SAFE_NOTIFICATION_COPY,
  buildApexFamilyCareExternalNotificationApprovalPacket,
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
  assert.equal(APEX_FAMILY_CARE_NOTIFICATION_DELIVERY_POLICY.localHouseDeviceDeliveryEnabled, true);
  assert.equal(APEX_FAMILY_CARE_NOTIFICATION_DELIVERY_POLICY.inAppHouseDeviceOnly, true);
  assert.equal(APEX_FAMILY_CARE_NOTIFICATION_DELIVERY_POLICY.deviceTrustRequired, true);
  assert.equal(APEX_FAMILY_CARE_NOTIFICATION_DELIVERY_POLICY.recipientControlsRequired, true);
  assert.equal(APEX_FAMILY_CARE_NOTIFICATION_DELIVERY_POLICY.pwaPushEnabled, false);
  assert.equal(APEX_FAMILY_CARE_NOTIFICATION_DELIVERY_POLICY.browserNotificationEnabled, false);
  assert.equal(APEX_FAMILY_CARE_NOTIFICATION_DELIVERY_POLICY.serviceWorkerPushEnabled, false);
  assert.equal(APEX_FAMILY_CARE_NOTIFICATION_DELIVERY_POLICY.smsEnabled, false);
  assert.equal(APEX_FAMILY_CARE_NOTIFICATION_DELIVERY_POLICY.emailEnabled, false);
  assert.equal(APEX_FAMILY_CARE_NOTIFICATION_DELIVERY_POLICY.providerPayloadStored, false);
  assert.equal(APEX_FAMILY_CARE_NOTIFICATION_DELIVERY_POLICY.externalSendApprovalRequired, true);
  assert.equal(APEX_FAMILY_CARE_EXTERNAL_NOTIFICATION_APPROVAL_POLICY.humanApprovalRequired, true);
  assert.equal(APEX_FAMILY_CARE_EXTERNAL_NOTIFICATION_APPROVAL_POLICY.liveDeliveryEnabled, false);
  assert.equal(APEX_FAMILY_CARE_EXTERNAL_NOTIFICATION_APPROVAL_POLICY.providerPayloadCreated, false);
  assert.equal(APEX_FAMILY_CARE_EXTERNAL_NOTIFICATION_APPROVAL_POLICY.notificationApiPermissionRequested, false);
});

test("notification preferences normalize to safe defaults and force live delivery off", () => {
  const defaults = getDefaultApexFamilyCareNotificationPreferences();
  const normalized = normalizeApexFamilyCareNotificationPreferences({
    ...defaults,
    quietHoursStart: "bad",
    quietHoursEnd: "99:99",
    lockScreenSensitiveDetails: true,
    liveDeliveryEnabled: true,
    deliveryMethod: "sms",
    houseDeviceTrusted: true,
    recipientBrotherEnabled: false,
    recipientGroup: "family",
  });

  assert.equal(defaults.familyDigestEnabled, true);
  assert.equal(normalized.quietHoursStart, defaults.quietHoursStart);
  assert.equal(normalized.quietHoursEnd, defaults.quietHoursEnd);
  assert.equal(normalized.lockScreenSensitiveDetails, false);
  assert.equal(normalized.liveDeliveryEnabled, false);
  assert.equal(normalized.deliveryMethod, "sms");
  assert.equal(normalized.localHouseDeviceDeliveryEnabled, true);
  assert.equal(normalized.houseDeviceTrusted, true);
  assert.equal(normalized.recipientDadEnabled, true);
  assert.equal(normalized.recipientBrotherEnabled, false);
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

test("local house-device delivery becomes ready only after opt-in, trust, recipients, and ready device", () => {
  const note = createApexFamilyCareNote({
    id: "visible-concern",
    category: "concern",
    reporter: "Dad",
    timestamp: "2026-06-09T12:00:00.000Z",
    summary: "Concern marked for family review.",
    familyVisible: true,
  });
  const state = buildApexFamilyCareNotificationState([note], {
    now: new Date("2026-06-09T12:30:00.000Z"),
    preferences: {
      deliveryMethod: "local-house-device",
      localHouseDeviceDeliveryEnabled: true,
      houseDeviceTrusted: true,
      recipientDadEnabled: true,
      recipientBrotherEnabled: true,
      recipientJohnEnabled: true,
      recipientFamilyEnabled: true,
    },
    kitchenStatus: {
      device: { localPwaMounted: true, modeEnabled: true },
      health: { status: "online" },
    },
  });
  const concern = state.decisions.find((decision) => decision.type === "concern-marked");

  assert.equal(state.delivery.deliveryMethod, "local-house-device");
  assert.equal(state.delivery.houseDeviceTrusted, true);
  assert.equal(state.delivery.houseDeviceReady, true);
  assert.equal(state.delivery.readyLocalNoticeCount >= 1, true);
  assert.equal(state.summary.readyLocalNoticeCount, state.delivery.readyLocalNoticeCount);
  assert.equal(concern.localDeliveryReady, true);
  assert.equal(concern.localDeliveryStatus, "ready-local-house-device");
  assert.equal(concern.localDeliveryStatusLabel, "Ready on house screen");
  assert.equal(concern.sendNow, false);
  assert.equal(concern.providerSendQueued, false);
  assert.equal(concern.providerPayloadStored, false);
  assert.equal(state.delivery.providerSendsEnabled, false);
  assert.equal(state.delivery.providerPayloadStored, false);
  assert.equal(state.delivery.cloudUsed, false);
  assert.equal(state.receipt.metadata.readyLocalNoticeCount, state.delivery.readyLocalNoticeCount);
  assert.equal(state.receipt.metadata.providerPayloadStored, false);
});

test("provider delivery methods stay blocked behind approval and store no payload", () => {
  const note = createApexFamilyCareNote({
    id: "visible-normal",
    category: "normal",
    reporter: "Brother",
    timestamp: "2026-06-09T12:00:00.000Z",
    summary: "Normal check-in.",
    familyVisible: true,
  });
  const state = buildApexFamilyCareNotificationState([note], {
    now: new Date("2026-06-09T12:30:00.000Z"),
    preferences: {
      deliveryMethod: "sms",
      houseDeviceTrusted: true,
      quietHoursEnabled: false,
    },
    kitchenStatus: {
      device: { localPwaMounted: true, modeEnabled: true },
      health: { status: "online" },
    },
  });
  const digest = state.decisions.find((decision) => decision.type === "family-digest");

  assert.equal(state.delivery.deliveryMethod, "sms");
  assert.equal(state.delivery.readyLocalNoticeCount, 0);
  assert.equal(state.delivery.externalSendApprovalRequired, true);
  assert.equal(state.delivery.providerSendsEnabled, false);
  assert.equal(state.delivery.smsEnabled, false);
  assert.equal(digest.localDeliveryReady, false);
  assert.equal(digest.localDeliveryStatus, "blocked-provider-approval");
  assert.equal(digest.providerApprovalRequired, true);
  assert.equal(digest.sendNow, false);
  assert.equal(digest.providerSendQueued, false);
  assert.equal(digest.providerPayloadStored, false);
  assert.equal(state.receipt.metadata.providerSendsQueued, false);
  assert.equal(state.receipt.metadata.providerPayloadStored, false);
});

test("external notification approval packet blocks provider setup until John approves the channel boundary", () => {
  const rawPrivateText = "Grandma's knee hurt after lunch and she took a pill.";
  const packet = buildApexFamilyCareExternalNotificationApprovalPacket({
    now: new Date("2026-06-09T12:30:00.000Z"),
    selectedChannel: "sms",
    recipientCount: 4,
    recipientsOptedIn: true,
    quietHoursReady: true,
    lockScreenCopySafe: true,
    rawPrivateText,
  });

  assert.equal(packet.policy.policyId, APEX_FAMILY_CARE_EXTERNAL_NOTIFICATION_APPROVAL_POLICY.policyId);
  assert.equal(packet.approvalStatus, "approval-required");
  assert.equal(packet.selectedChannel, "sms");
  assert.equal(packet.approvedChannel, "not-chosen");
  assert.equal(packet.externalChannelApproved, false);
  assert.equal(packet.providerBoundaryApproved, false);
  assert.equal(packet.readyForProviderSetup, false);
  assert.equal(packet.readyForLiveSend, false);
  assert.equal(packet.providerConfigured, false);
  assert.equal(packet.providerPayloadCreated, false);
  assert.equal(packet.liveDeliveryEnabled, false);
  assert.equal(packet.smsEnabled, false);
  assert.equal(packet.emailEnabled, false);
  assert.equal(packet.pwaPushEnabled, false);
  assert.equal(packet.browserNotificationEnabled, false);
  assert.equal(packet.serviceWorkerPushEnabled, false);
  assert.equal(packet.receipt.cloudUsed, false);
  assert.equal(packet.receipt.rawNoteTextStoredInReceipt, false);
  assert.equal(packet.receipt.metadata.smsSent, false);
  assert.equal(packet.receipt.metadata.notificationApiPermissionRequested, false);
  assert.equal(packet.receipt.metadata.serviceWorkerPushRegistered, false);
  assert.equal(JSON.stringify(packet.receipt).includes(rawPrivateText), false);
  assert.equal(JSON.stringify(packet.receipt).includes("knee"), false);
});

test("approved external notification packet can become provider-setup-ready while live sends stay blocked", () => {
  const packet = buildApexFamilyCareExternalNotificationApprovalPacket({
    now: new Date("2026-06-09T12:30:00.000Z"),
    selectedChannel: "email",
    approvedChannel: "email",
    externalChannelApproved: true,
    providerBoundaryApproved: true,
    familyAccessModelApproved: true,
    recipientsOptedIn: true,
    recipientCount: 3,
    quietHoursReady: true,
    lockScreenCopySafe: true,
  });

  assert.equal(packet.approvalStatus, "provider-setup-ready");
  assert.equal(packet.approvedChannel, "email");
  assert.equal(packet.readyForProviderSetup, true);
  assert.equal(packet.readyForLiveSend, false);
  assert.equal(packet.providerConfigured, false);
  assert.equal(packet.providerPayloadCreated, false);
  assert.equal(packet.providerPayloadTestsReady, false);
  assert.equal(packet.liveDeliveryEnabled, false);
  assert.equal(packet.receipt.metadata.readyForProviderSetup, true);
  assert.equal(packet.receipt.metadata.readyForLiveSend, false);
  assert.equal(packet.receipt.metadata.providerPayloadCreated, false);
  assert.equal(packet.receipt.metadata.emailSent, false);
});
