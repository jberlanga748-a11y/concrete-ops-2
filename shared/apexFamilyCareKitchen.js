export const APEX_FAMILY_CARE_KITCHEN_MODE_POLICY = Object.freeze({
  policyId: "apex-family-care-kitchen-mode-v1",
  phase: "home-device-kitchen-mode",
  localOnly: true,
  familyCareOnly: true,
  apexHqProductWork: false,
  firstDeviceType: "house-tablet-pwa",
  firstDeviceReason: "Lowest-friction first household device: a tablet or old phone running the Family Care PWA.",
  hiddenRecording: false,
  backgroundRecording: false,
  liveMicCaptureEnabled: false,
  rawAudioStored: false,
  rawTranscriptStored: false,
  cameraSurveillanceEnabled: false,
  networkScanningEnabled: false,
  deviceControlEnabled: false,
  emergencyReplacement: false,
  medicalDiagnosis: false,
  cloudUsed: false,
  realDeviceIntegrationDeferredTo: "Phase 6A",
  realVoiceInputDeferredTo: "Phase 4A",
});

export const APEX_FAMILY_CARE_KITCHEN_DEVICE_TYPES = Object.freeze([
  { id: "house-tablet-pwa", label: "House tablet PWA", installTarget: "Install Family Care on a house tablet." },
  { id: "old-phone-pwa", label: "Old phone PWA", installTarget: "Install Family Care on an old phone kept at the house." },
  { id: "raspberry-pi-local-satellite", label: "Raspberry Pi satellite", installTarget: "Later local satellite after hardware is chosen." },
  { id: "other-local-satellite", label: "Other local satellite", installTarget: "Later household device after the family picks hardware." },
]);

const DEVICE_TYPE_BY_ID = new Map(APEX_FAMILY_CARE_KITCHEN_DEVICE_TYPES.map((device) => [device.id, device]));
const KITCHEN_CONTROLS = new Set(["heartbeat", "mute", "resume", "stop", "set-listening", "set-speaking"]);

function cleanText(value, maxLength = 120) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function normalizeNow(value, fallback = new Date()) {
  const date = value instanceof Date ? value : new Date(value || fallback);
  return Number.isNaN(date.getTime()) ? fallback : date;
}

function validIsoOrFallback(value, fallback) {
  const cleaned = cleanText(value, 40);
  if (!cleaned) return fallback;
  const parsed = Date.parse(cleaned);
  return Number.isNaN(parsed) ? fallback : new Date(parsed).toISOString();
}

function minutesBetween(later, earlier) {
  const laterMs = Date.parse(later);
  const earlierMs = Date.parse(earlier);
  if (Number.isNaN(laterMs) || Number.isNaN(earlierMs)) return null;
  return Math.max(0, Math.round(((laterMs - earlierMs) / 60000) * 10) / 10);
}

function statusLabelForState(state, online) {
  if (!online) return "Offline";
  if (state.muted) return "Muted";
  if (state.speaking) return "Speaking";
  if (state.listening) return "Listening";
  return "Ready";
}

function statusToneForState(state, online) {
  if (!online) return "amber";
  if (state.muted) return "slate";
  if (state.speaking || state.listening) return "blue";
  return "green";
}

export function getDefaultApexFamilyCareKitchenDeviceState(now = new Date()) {
  const generatedAt = normalizeNow(now);
  const firstDevice = DEVICE_TYPE_BY_ID.get(APEX_FAMILY_CARE_KITCHEN_MODE_POLICY.firstDeviceType);
  return {
    schemaVersion: 1,
    deviceType: firstDevice.id,
    deviceName: "Kitchen Family Care",
    room: "Kitchen",
    modeEnabled: true,
    bigButtonModeEnabled: true,
    muted: false,
    listening: false,
    speaking: false,
    localPwaMounted: true,
    lastSeenAt: generatedAt.toISOString(),
    lastInteractionAt: "",
    installTarget: firstDevice.installTarget,
  };
}

export function normalizeApexFamilyCareKitchenDeviceState(input = {}, now = new Date()) {
  const defaults = getDefaultApexFamilyCareKitchenDeviceState(now);
  const deviceType = DEVICE_TYPE_BY_ID.has(input.deviceType) ? input.deviceType : defaults.deviceType;
  const device = DEVICE_TYPE_BY_ID.get(deviceType);
  const muted = typeof input.muted === "boolean" ? input.muted : defaults.muted;
  const speaking = muted ? false : Boolean(input.speaking);
  const listening = muted || speaking ? false : Boolean(input.listening);

  return {
    ...defaults,
    deviceType,
    deviceName: cleanText(input.deviceName, 80) || defaults.deviceName,
    room: cleanText(input.room, 60) || defaults.room,
    modeEnabled: typeof input.modeEnabled === "boolean" ? input.modeEnabled : defaults.modeEnabled,
    bigButtonModeEnabled: typeof input.bigButtonModeEnabled === "boolean" ? input.bigButtonModeEnabled : defaults.bigButtonModeEnabled,
    muted,
    listening,
    speaking,
    localPwaMounted: input.localPwaMounted !== false,
    lastSeenAt: validIsoOrFallback(input.lastSeenAt, defaults.lastSeenAt),
    lastInteractionAt: validIsoOrFallback(input.lastInteractionAt, ""),
    installTarget: cleanText(input.installTarget, 120) || device.installTarget,
  };
}

export function applyApexFamilyCareKitchenControl(input = {}, control = "heartbeat", now = new Date()) {
  const state = normalizeApexFamilyCareKitchenDeviceState(input, now);
  const generatedAt = normalizeNow(now);
  const controlId = KITCHEN_CONTROLS.has(control) ? control : "heartbeat";
  const patch = {
    lastSeenAt: generatedAt.toISOString(),
    lastInteractionAt: generatedAt.toISOString(),
  };

  if (controlId === "mute") {
    patch.muted = true;
    patch.listening = false;
    patch.speaking = false;
  }

  if (controlId === "resume") {
    patch.muted = false;
    patch.listening = false;
    patch.speaking = false;
  }

  if (controlId === "stop") {
    patch.listening = false;
    patch.speaking = false;
  }

  if (controlId === "set-listening") {
    patch.muted = false;
    patch.listening = true;
    patch.speaking = false;
  }

  if (controlId === "set-speaking") {
    patch.muted = false;
    patch.listening = false;
    patch.speaking = true;
  }

  if (controlId === "heartbeat") {
    patch.lastInteractionAt = state.lastInteractionAt;
  }

  return normalizeApexFamilyCareKitchenDeviceState({
    ...state,
    ...patch,
  }, generatedAt);
}

export function buildApexFamilyCareKitchenModeStatus(input = {}, options = {}) {
  const generatedAt = normalizeNow(options.now);
  const onlineThresholdMinutes = Math.max(1, Number.parseInt(options.onlineThresholdMinutes || 15, 10) || 15);
  const device = normalizeApexFamilyCareKitchenDeviceState(input, generatedAt);
  const minutesSinceLastSeen = minutesBetween(generatedAt.toISOString(), device.lastSeenAt);
  const online = Boolean(device.modeEnabled && device.localPwaMounted && minutesSinceLastSeen !== null && minutesSinceLastSeen <= onlineThresholdMinutes);
  const deviceType = DEVICE_TYPE_BY_ID.get(device.deviceType);
  const statusLabel = statusLabelForState(device, online);
  const statusTone = statusToneForState(device, online);

  return {
    policy: APEX_FAMILY_CARE_KITCHEN_MODE_POLICY,
    generatedAt: generatedAt.toISOString(),
    device: {
      ...device,
      deviceTypeLabel: deviceType.label,
      firstDeviceDecision: APEX_FAMILY_CARE_KITCHEN_MODE_POLICY.firstDeviceType,
      firstDeviceReason: APEX_FAMILY_CARE_KITCHEN_MODE_POLICY.firstDeviceReason,
      requiresHardwarePurchase: false,
      raspberryPiDeferred: device.deviceType === "raspberry-pi-local-satellite",
    },
    controls: {
      bigButtonModeEnabled: device.bigButtonModeEnabled,
      visibleListeningStatus: device.listening ? "Listening" : "Quiet",
      visibleSpeakingStatus: device.speaking ? "Speaking" : "Quiet",
      muted: device.muted,
      stopAvailable: Boolean(device.listening || device.speaking),
      muteAvailable: true,
      resumeAvailable: device.muted,
      visibleVoiceEntryAvailable: true,
      liveMicCaptureEnabled: false,
    },
    health: {
      status: online ? "online" : "offline",
      statusLabel,
      statusTone,
      checkedAt: generatedAt.toISOString(),
      lastSeenAt: device.lastSeenAt,
      minutesSinceLastSeen,
      onlineThresholdMinutes,
      localPwaMounted: device.localPwaMounted,
      offlineReason: online ? "" : "PWA heartbeat is stale or the local kitchen screen is closed.",
      hiddenRecording: false,
      cameraSurveillanceEnabled: false,
      networkScanningEnabled: false,
      deviceControlEnabled: false,
    },
    receipt: {
      receiptType: "apex-family-care-kitchen-mode",
      schemaVersion: 1,
      generatedAt: generatedAt.toISOString(),
      policyId: APEX_FAMILY_CARE_KITCHEN_MODE_POLICY.policyId,
      ...APEX_FAMILY_CARE_KITCHEN_MODE_POLICY,
      metadata: {
        deviceType: device.deviceType,
        room: device.room,
        status: online ? "online" : "offline",
        muted: device.muted,
        listening: device.listening,
        speaking: device.speaking,
        bigButtonModeEnabled: device.bigButtonModeEnabled,
        liveMicCaptureEnabled: false,
        hiddenRecording: false,
        cameraSurveillanceEnabled: false,
        deviceControlEnabled: false,
      },
    },
  };
}
