import assert from "node:assert/strict";
import test from "node:test";

import {
  APEX_FAMILY_CARE_HOUSEHOLD_DEVICE_PRESENCE_POLICY,
  APEX_FAMILY_CARE_KITCHEN_MODE_POLICY,
  applyApexFamilyCareKitchenControl,
  buildApexFamilyCareHouseholdDevicePresence,
  buildApexFamilyCareKitchenModeStatus,
  getDefaultApexFamilyCareKitchenDeviceState,
  normalizeApexFamilyCareKitchenDeviceState,
} from "./apexFamilyCareKitchen.js";

test("Family Care kitchen policy chooses house tablet PWA first and avoids device surveillance", () => {
  assert.equal(APEX_FAMILY_CARE_KITCHEN_MODE_POLICY.localOnly, true);
  assert.equal(APEX_FAMILY_CARE_KITCHEN_MODE_POLICY.familyCareOnly, true);
  assert.equal(APEX_FAMILY_CARE_KITCHEN_MODE_POLICY.apexHqProductWork, false);
  assert.equal(APEX_FAMILY_CARE_KITCHEN_MODE_POLICY.firstDeviceType, "house-tablet-pwa");
  assert.equal(APEX_FAMILY_CARE_KITCHEN_MODE_POLICY.hiddenRecording, false);
  assert.equal(APEX_FAMILY_CARE_KITCHEN_MODE_POLICY.backgroundRecording, false);
  assert.equal(APEX_FAMILY_CARE_KITCHEN_MODE_POLICY.liveMicCaptureEnabled, false);
  assert.equal(APEX_FAMILY_CARE_KITCHEN_MODE_POLICY.cameraSurveillanceEnabled, false);
  assert.equal(APEX_FAMILY_CARE_KITCHEN_MODE_POLICY.networkScanningEnabled, false);
  assert.equal(APEX_FAMILY_CARE_KITCHEN_MODE_POLICY.deviceControlEnabled, false);
  assert.equal(APEX_FAMILY_CARE_KITCHEN_MODE_POLICY.realDeviceIntegrationDeferredTo, "Phase 6A");
  assert.equal(APEX_FAMILY_CARE_KITCHEN_MODE_POLICY.realVoiceInputDeferredTo, "Phase 4A");
  assert.equal(APEX_FAMILY_CARE_HOUSEHOLD_DEVICE_PRESENCE_POLICY.phase, "phase-6a-household-device-voice-and-presence");
  assert.equal(APEX_FAMILY_CARE_HOUSEHOLD_DEVICE_PRESENCE_POLICY.firstDeviceType, "house-tablet-pwa");
  assert.equal(APEX_FAMILY_CARE_HOUSEHOLD_DEVICE_PRESENCE_POLICY.backupDeviceType, "old-phone-pwa");
  assert.equal(APEX_FAMILY_CARE_HOUSEHOLD_DEVICE_PRESENCE_POLICY.raspberryPiDeferred, true);
  assert.equal(APEX_FAMILY_CARE_HOUSEHOLD_DEVICE_PRESENCE_POLICY.hardwarePurchaseRequired, false);
  assert.equal(APEX_FAMILY_CARE_HOUSEHOLD_DEVICE_PRESENCE_POLICY.localPwaPresenceOnly, true);
  assert.equal(APEX_FAMILY_CARE_HOUSEHOLD_DEVICE_PRESENCE_POLICY.heartbeatOnly, true);
  assert.equal(APEX_FAMILY_CARE_HOUSEHOLD_DEVICE_PRESENCE_POLICY.alwaysVisibleMuteRequired, true);
  assert.equal(APEX_FAMILY_CARE_HOUSEHOLD_DEVICE_PRESENCE_POLICY.alwaysVisibleStopRequired, true);
  assert.equal(APEX_FAMILY_CARE_HOUSEHOLD_DEVICE_PRESENCE_POLICY.alwaysVisibleRecoverRequired, true);
  assert.equal(APEX_FAMILY_CARE_HOUSEHOLD_DEVICE_PRESENCE_POLICY.explicitVoiceStartRequired, true);
  assert.equal(APEX_FAMILY_CARE_HOUSEHOLD_DEVICE_PRESENCE_POLICY.localSttEndpointEnabled, false);
  assert.equal(APEX_FAMILY_CARE_HOUSEHOLD_DEVICE_PRESENCE_POLICY.hiddenRecording, false);
  assert.equal(APEX_FAMILY_CARE_HOUSEHOLD_DEVICE_PRESENCE_POLICY.cameraSurveillanceEnabled, false);
  assert.equal(APEX_FAMILY_CARE_HOUSEHOLD_DEVICE_PRESENCE_POLICY.networkScanningEnabled, false);
  assert.equal(APEX_FAMILY_CARE_HOUSEHOLD_DEVICE_PRESENCE_POLICY.deviceControlEnabled, false);
});

test("kitchen device defaults to a simple local tablet mode", () => {
  const state = getDefaultApexFamilyCareKitchenDeviceState(new Date("2026-06-09T12:00:00.000Z"));
  const status = buildApexFamilyCareKitchenModeStatus(state, {
    now: new Date("2026-06-09T12:05:00.000Z"),
  });

  assert.equal(state.deviceType, "house-tablet-pwa");
  assert.equal(state.room, "Kitchen");
  assert.equal(state.bigButtonModeEnabled, true);
  assert.equal(state.muted, false);
  assert.equal(status.health.status, "online");
  assert.equal(status.health.statusLabel, "Ready");
  assert.equal(status.controls.bigButtonModeEnabled, true);
  assert.equal(status.controls.liveMicCaptureEnabled, false);
  assert.equal(status.device.requiresHardwarePurchase, false);
});

test("mute, resume, and stop controls are local state changes only", () => {
  const base = normalizeApexFamilyCareKitchenDeviceState({
    listening: true,
    speaking: false,
  }, new Date("2026-06-09T12:00:00.000Z"));
  const muted = applyApexFamilyCareKitchenControl(base, "mute", new Date("2026-06-09T12:01:00.000Z"));
  const resumed = applyApexFamilyCareKitchenControl(muted, "resume", new Date("2026-06-09T12:02:00.000Z"));
  const speaking = applyApexFamilyCareKitchenControl(resumed, "set-speaking", new Date("2026-06-09T12:03:00.000Z"));
  const stopped = applyApexFamilyCareKitchenControl(speaking, "stop", new Date("2026-06-09T12:04:00.000Z"));

  assert.equal(muted.muted, true);
  assert.equal(muted.listening, false);
  assert.equal(muted.speaking, false);
  assert.equal(resumed.muted, false);
  assert.equal(resumed.listening, false);
  assert.equal(speaking.speaking, true);
  assert.equal(speaking.listening, false);
  assert.equal(stopped.speaking, false);
  assert.equal(stopped.listening, false);
});

test("stale kitchen heartbeat reports offline without scanning the network", () => {
  const status = buildApexFamilyCareKitchenModeStatus({
    lastSeenAt: "2026-06-09T09:00:00.000Z",
  }, {
    now: new Date("2026-06-09T12:00:00.000Z"),
    onlineThresholdMinutes: 15,
  });

  assert.equal(status.health.status, "offline");
  assert.equal(status.health.statusLabel, "Offline");
  assert.equal(status.health.networkScanningEnabled, false);
  assert.match(status.health.offlineReason, /PWA heartbeat/i);
});

test("kitchen mode receipts store compact metadata only", () => {
  const status = buildApexFamilyCareKitchenModeStatus({
    deviceName: "Kitchen Family Care",
    room: "Kitchen",
    listening: true,
    lastSeenAt: "2026-06-09T12:00:00.000Z",
  }, {
    now: new Date("2026-06-09T12:01:00.000Z"),
  });

  assert.equal(status.receipt.rawAudioStored, false);
  assert.equal(status.receipt.rawTranscriptStored, false);
  assert.equal(status.receipt.cloudUsed, false);
  assert.equal(status.receipt.cameraSurveillanceEnabled, false);
  assert.equal(status.receipt.deviceControlEnabled, false);
  assert.equal(status.receipt.metadata.deviceType, "house-tablet-pwa");
  assert.equal(status.receipt.metadata.room, "Kitchen");
  assert.equal(JSON.stringify(status.receipt).includes("Grandma's knee hurt after lunch"), false);
});

test("household device presence chooses tablet or old phone and keeps voice visible-only", () => {
  const status = buildApexFamilyCareKitchenModeStatus({
    lastSeenAt: "2026-06-09T12:00:00.000Z",
  }, {
    now: new Date("2026-06-09T12:05:00.000Z"),
  });
  const presence = buildApexFamilyCareHouseholdDevicePresence(status);

  assert.equal(presence.device.primaryType, "house-tablet-pwa");
  assert.equal(presence.device.backupType, "old-phone-pwa");
  assert.equal(presence.device.hardwarePurchaseRequired, false);
  assert.equal(presence.device.raspberryPiDeferred, false);
  assert.equal(presence.presence.status, "online");
  assert.equal(presence.presence.readyForHouse, true);
  assert.equal(presence.presence.heartbeatOnly, true);
  assert.equal(presence.presence.networkScanningEnabled, false);
  assert.equal(presence.controls.alwaysVisible, true);
  assert.equal(presence.controls.muteVisible, true);
  assert.equal(presence.controls.stopVisible, true);
  assert.equal(presence.controls.recoverVisible, true);
  assert.equal(presence.voice.status, "visible-session-ready");
  assert.equal(presence.voice.visibleVoiceSessionOnly, true);
  assert.equal(presence.voice.localSttEndpointEnabled, false);
  assert.equal(presence.voice.bridgeApprovalRequired, true);
});

test("household presence reports offline without device control or surveillance", () => {
  const presence = buildApexFamilyCareHouseholdDevicePresence({
    lastSeenAt: "2026-06-09T09:00:00.000Z",
  }, {
    now: new Date("2026-06-09T12:00:00.000Z"),
  });

  assert.equal(presence.presence.status, "offline");
  assert.equal(presence.presence.readyForHouse, false);
  assert.match(presence.presence.offlineReason, /PWA heartbeat/i);
  assert.equal(presence.safety.hiddenRecording, false);
  assert.equal(presence.safety.backgroundRecording, false);
  assert.equal(presence.safety.autoListening, false);
  assert.equal(presence.safety.liveMicCaptureEnabled, false);
  assert.equal(presence.safety.cameraSurveillanceEnabled, false);
  assert.equal(presence.safety.networkScanningEnabled, false);
  assert.equal(presence.safety.deviceControlEnabled, false);
  assert.equal(presence.safety.emergencyReplacement, false);
  assert.equal(presence.receipt.rawAudioStored, false);
  assert.equal(presence.receipt.rawTranscriptStored, false);
  assert.equal(presence.receipt.cloudUsed, false);
  assert.equal(presence.receipt.metadata.presenceStatus, "offline");
  assert.equal(JSON.stringify(presence.receipt).includes("Grandma's knee hurt after lunch"), false);
});
