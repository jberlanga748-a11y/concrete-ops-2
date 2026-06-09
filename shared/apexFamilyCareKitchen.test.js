import assert from "node:assert/strict";
import test from "node:test";

import {
  APEX_FAMILY_CARE_KITCHEN_MODE_POLICY,
  applyApexFamilyCareKitchenControl,
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
