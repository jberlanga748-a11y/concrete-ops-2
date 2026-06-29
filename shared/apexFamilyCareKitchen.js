import { APEX_FAMILY_CARE_LOCAL_VOICE_INPUT_POLICY } from "./apexFamilyCareVoice.js";

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

export const APEX_FAMILY_CARE_HOUSEHOLD_DEVICE_PRESENCE_POLICY = Object.freeze({
  policyId: "apex-family-care-household-device-presence-v1",
  phase: "phase-6a-household-device-voice-and-presence",
  localOnly: true,
  familyCareOnly: true,
  apexHqProductWork: false,
  firstDeviceType: "house-tablet-pwa",
  backupDeviceType: "old-phone-pwa",
  raspberryPiDeferred: true,
  hardwarePurchaseRequired: false,
  localPwaPresenceOnly: true,
  heartbeatOnly: true,
  alwaysVisibleMuteRequired: true,
  alwaysVisibleStopRequired: true,
  alwaysVisibleRecoverRequired: true,
  explicitVoiceStartRequired: true,
  visibleVoiceSessionOnly: true,
  localVoiceInputPhaseReady: true,
  localSttEndpointEnabled: false,
  localSttBridgeApprovalRequired: true,
  hiddenRecording: false,
  backgroundRecording: false,
  autoListening: false,
  liveMicCaptureEnabled: false,
  rawAudioStored: false,
  rawTranscriptStored: false,
  cameraSurveillanceEnabled: false,
  networkScanningEnabled: false,
  deviceControlEnabled: false,
  cloudUsed: false,
  smsEnabled: false,
  emailEnabled: false,
  pushEnabled: false,
  emergencyReplacement: false,
  medicalDiagnosis: false,
});

export const APEX_FAMILY_CARE_HOUSEHOLD_DEVICE_BRIDGE_APPROVAL_POLICY = Object.freeze({
  policyId: "apex-family-care-household-device-bridge-approval-v1",
  phase: "phase-6b-approved-household-device-integration",
  localOnly: true,
  familyCareOnly: true,
  apexHqProductWork: false,
  currentSafePath: "house-tablet-or-old-phone-pwa",
  currentPwaPathAllowed: true,
  bridgeBeyondPwaApproved: false,
  deviceBoundaryApproved: false,
  familyAccessModelApproved: false,
  localDeviceBridgeConfigured: false,
  localDeviceBridgeActive: false,
  raspberryPiEnabled: false,
  localSatelliteEnabled: false,
  deviceOsControlEnabled: false,
  networkScanningEnabled: false,
  cameraSurveillanceEnabled: false,
  hiddenRecording: false,
  backgroundRecording: false,
  autoListening: false,
  liveMicCaptureEnabled: false,
  localSttBridgeApproved: false,
  localSttEndpointEnabled: false,
  rawAudioStored: false,
  rawTranscriptStored: false,
  cloudUsed: false,
  smsEnabled: false,
  emailEnabled: false,
  pushEnabled: false,
  schemaChanged: false,
  authSessionChanged: false,
  deployChanged: false,
  apexHqExposure: false,
  publicAccess: false,
  customerAccess: false,
  fieldAccess: false,
  emergencyReplacement: false,
  medicalDiagnosis: false,
});

export const APEX_FAMILY_CARE_KITCHEN_DEVICE_TYPES = Object.freeze([
  { id: "house-tablet-pwa", label: "House tablet PWA", installTarget: "Install Family Care on a house tablet." },
  { id: "old-phone-pwa", label: "Old phone PWA", installTarget: "Install Family Care on an old phone kept at the house." },
  { id: "raspberry-pi-local-satellite", label: "Raspberry Pi satellite", installTarget: "Later local satellite after hardware is chosen." },
  { id: "other-local-satellite", label: "Other local satellite", installTarget: "Later household device after the family picks hardware." },
]);

const DEVICE_TYPE_BY_ID = new Map(APEX_FAMILY_CARE_KITCHEN_DEVICE_TYPES.map((device) => [device.id, device]));
const KITCHEN_CONTROLS = new Set(["heartbeat", "mute", "resume", "stop", "set-listening", "set-speaking"]);
const HOUSE_DEVICE_PRIMARY = DEVICE_TYPE_BY_ID.get(APEX_FAMILY_CARE_HOUSEHOLD_DEVICE_PRESENCE_POLICY.firstDeviceType);
const HOUSE_DEVICE_BACKUP = DEVICE_TYPE_BY_ID.get(APEX_FAMILY_CARE_HOUSEHOLD_DEVICE_PRESENCE_POLICY.backupDeviceType);

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

function normalizeDeviceType(value, fallback = APEX_FAMILY_CARE_KITCHEN_MODE_POLICY.firstDeviceType) {
  const text = cleanText(value, 80);
  return DEVICE_TYPE_BY_ID.has(text) ? text : fallback;
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

export function buildApexFamilyCareHouseholdDeviceBridgeApprovalPacket(input = {}) {
  const now = normalizeNow(input.now);
  const selectedDevicePath = normalizeDeviceType(input.selectedDevicePath || input.devicePath);
  const selectedDevice = DEVICE_TYPE_BY_ID.get(selectedDevicePath);
  const currentPwaEnough = input.currentPwaEnough !== false;
  const bridgeBeyondPwaApproved = input.bridgeBeyondPwaApproved === true;
  const deviceBoundaryApproved = Boolean(bridgeBeyondPwaApproved && input.deviceBoundaryApproved === true);
  const familyAccessModelApproved = input.familyAccessModelApproved === true;
  const visibleControlsReady = input.visibleControlsReady !== false;
  const explicitVoiceStartReady = input.explicitVoiceStartReady !== false;
  const localSttBridgeApproved = input.localSttBridgeApproved === true;
  const noSurveillanceReady = input.noSurveillanceReady !== false;
  const readyForBridgeWork = Boolean(
    bridgeBeyondPwaApproved
    && deviceBoundaryApproved
    && familyAccessModelApproved
    && visibleControlsReady
    && explicitVoiceStartReady
    && localSttBridgeApproved
    && noSurveillanceReady
  );
  const approvalStatus = readyForBridgeWork
    ? "bridge-setup-ready"
    : currentPwaEnough
      ? "pwa-enough"
      : "approval-required";
  const checks = [
    {
      id: "pwa-path-enough",
      label: "Tablet or old phone PWA enough",
      passed: currentPwaEnough,
      detail: currentPwaEnough ? "Keep using the house tablet or old phone PWA." : "Approve a real device bridge before moving beyond the PWA.",
    },
    {
      id: "bridge-beyond-pwa-approved",
      label: "Bridge beyond PWA approved",
      passed: bridgeBeyondPwaApproved,
      detail: bridgeBeyondPwaApproved ? "A real bridge path was approved." : "Raspberry Pi or local satellite stays deferred.",
    },
    {
      id: "device-boundary-approved",
      label: "Device boundary approved",
      passed: deviceBoundaryApproved,
      detail: deviceBoundaryApproved ? "Exact device boundary approved." : "No device OS control, network scan, camera, or background mic.",
    },
    {
      id: "family-access-approved",
      label: "Family access model approved",
      passed: familyAccessModelApproved,
      detail: familyAccessModelApproved ? "Family access model approved." : "Family access must be approved before a real household bridge.",
    },
    {
      id: "visible-controls-ready",
      label: "Visible controls ready",
      passed: visibleControlsReady,
      detail: "Mute, stop/recover, and visible voice entry stay required.",
    },
    {
      id: "explicit-voice-start-ready",
      label: "Explicit voice start ready",
      passed: explicitVoiceStartReady,
      detail: "No always-on or hidden listening path is approved.",
    },
    {
      id: "local-stt-bridge-approved",
      label: "Local STT bridge approved",
      passed: localSttBridgeApproved,
      detail: localSttBridgeApproved ? "Family Care local STT bridge approved." : "Local STT bridge remains gated by Phase 4C.",
    },
    {
      id: "no-surveillance-device-control",
      label: "No surveillance or device control",
      passed: noSurveillanceReady,
      detail: "Camera, network scanning, and device OS control stay off.",
    },
    {
      id: "bridge-active-blocked",
      label: "Bridge activation blocked",
      passed: true,
      detail: "Phase 6B creates approval metadata only.",
    },
  ];
  const nextApprovalNeeded = checks.find((check) => !check.passed && check.id !== "bridge-beyond-pwa-approved")?.detail
    || checks.find((check) => !check.passed)?.detail
    || "Bridge setup can be designed next, but activation remains blocked until Phase 6C.";

  return {
    policy: APEX_FAMILY_CARE_HOUSEHOLD_DEVICE_BRIDGE_APPROVAL_POLICY,
    generatedAt: now.toISOString(),
    approvalStatus,
    currentPwaEnough,
    currentSafePath: APEX_FAMILY_CARE_HOUSEHOLD_DEVICE_BRIDGE_APPROVAL_POLICY.currentSafePath,
    selectedDevicePath,
    selectedDeviceLabel: selectedDevice.label,
    selectedDeviceInstallTarget: selectedDevice.installTarget,
    bridgeBeyondPwaApproved,
    deviceBoundaryApproved,
    familyAccessModelApproved,
    visibleControlsReady,
    explicitVoiceStartReady,
    localSttBridgeApproved,
    noSurveillanceReady,
    readyForBridgeWork,
    readyForActivation: false,
    localDeviceBridgeConfigured: false,
    localDeviceBridgeActive: false,
    raspberryPiEnabled: false,
    localSatelliteEnabled: false,
    deviceOsControlEnabled: false,
    networkScanningEnabled: false,
    cameraSurveillanceEnabled: false,
    hiddenRecording: false,
    backgroundRecording: false,
    autoListening: false,
    liveMicCaptureEnabled: false,
    rawAudioStored: false,
    rawTranscriptStored: false,
    cloudUsed: false,
    smsEnabled: false,
    emailEnabled: false,
    pushEnabled: false,
    schemaChanged: false,
    authSessionChanged: false,
    deployChanged: false,
    apexHqExposure: false,
    nextApprovalNeeded,
    checks,
    approvalInstructions: [
      "Keep the tablet or old-phone PWA as the default house device.",
      "Approve a bridge only if the PWA is not enough.",
      "Choose the exact hardware and boundary before any wiring.",
      "Keep mute, stop/recover, and explicit voice start visible on every device path.",
    ],
    receipt: {
      receiptType: "apex-family-care-household-device-bridge-approval",
      schemaVersion: 1,
      generatedAt: now.toISOString(),
      policyId: APEX_FAMILY_CARE_HOUSEHOLD_DEVICE_BRIDGE_APPROVAL_POLICY.policyId,
      phase: APEX_FAMILY_CARE_HOUSEHOLD_DEVICE_BRIDGE_APPROVAL_POLICY.phase,
      localOnly: true,
      familyCareOnly: true,
      apexHqProductWork: false,
      rawPromptStored: false,
      rawResponseStored: false,
      rawAudioStored: false,
      rawTranscriptStored: false,
      secretsStored: false,
      customerDataStored: false,
      cloudUsed: false,
      metadata: {
        approvalStatus,
        currentPwaEnough,
        selectedDevicePath,
        bridgeBeyondPwaApproved,
        deviceBoundaryApproved,
        familyAccessModelApproved,
        localSttBridgeApproved,
        readyForBridgeWork,
        readyForActivation: false,
        localDeviceBridgeConfigured: false,
        localDeviceBridgeActive: false,
        raspberryPiEnabled: false,
        localSatelliteEnabled: false,
        deviceOsControlEnabled: false,
        networkScanningEnabled: false,
        cameraSurveillanceEnabled: false,
        hiddenRecording: false,
        rawAudioStored: false,
        rawTranscriptStored: false,
      },
    },
  };
}

function voicePresenceStatus(localVoicePolicy) {
  const safeVisibleVoice = Boolean(
    localVoicePolicy?.localOnly
    && localVoicePolicy?.explicitUserStartedRequired
    && localVoicePolicy?.visibleStopRequired
    && localVoicePolicy?.visibleMuteRequired
    && localVoicePolicy?.visibleRecoverRequired
    && localVoicePolicy?.hiddenRecording === false
    && localVoicePolicy?.backgroundRecording === false
    && localVoicePolicy?.autoListening === false
    && localVoicePolicy?.cloudSttAllowed === false
  );
  if (!safeVisibleVoice) {
    return {
      status: "blocked",
      statusLabel: "Voice blocked",
      statusTone: "red",
      detail: "Visible voice controls are not safe yet.",
      visibleVoiceSessionOnly: false,
      localSttEndpointEnabled: false,
      bridgeApprovalRequired: true,
    };
  }
  if (localVoicePolicy.localSttEndpointEnabled) {
    return {
      status: "local-stt-ready",
      statusLabel: "Local STT ready",
      statusTone: "green",
      detail: "Use explicit visible voice turns only.",
      visibleVoiceSessionOnly: true,
      localSttEndpointEnabled: true,
      bridgeApprovalRequired: false,
    };
  }
  return {
    status: "visible-session-ready",
    statusLabel: "Visible voice ready",
    statusTone: "amber",
    detail: "Typed/visible transcript fallback stays on until the local STT bridge is approved.",
    visibleVoiceSessionOnly: true,
    localSttEndpointEnabled: false,
    bridgeApprovalRequired: true,
  };
}

export function buildApexFamilyCareHouseholdDevicePresence(input = {}, options = {}) {
  const status = input?.health && input?.device && input?.controls
    ? input
    : buildApexFamilyCareKitchenModeStatus(input, options);
  const localVoicePolicy = options.localVoicePolicy || APEX_FAMILY_CARE_LOCAL_VOICE_INPUT_POLICY;
  const voice = voicePresenceStatus(localVoicePolicy);
  const online = status.health.status === "online";
  const controlsAlwaysVisible = Boolean(
    status.controls.muteAvailable
    && status.controls.stopAvailable !== undefined
    && status.controls.visibleVoiceEntryAvailable
  );
  const readyForHouse = Boolean(
    online
    && status.device.localPwaMounted
    && status.device.modeEnabled
    && controlsAlwaysVisible
  );

  return {
    policy: APEX_FAMILY_CARE_HOUSEHOLD_DEVICE_PRESENCE_POLICY,
    generatedAt: status.generatedAt,
    device: {
      selectedType: status.device.deviceType,
      selectedLabel: status.device.deviceTypeLabel,
      selectedRoom: status.device.room,
      primaryType: HOUSE_DEVICE_PRIMARY.id,
      primaryLabel: HOUSE_DEVICE_PRIMARY.label,
      backupType: HOUSE_DEVICE_BACKUP.id,
      backupLabel: HOUSE_DEVICE_BACKUP.label,
      installTarget: status.device.installTarget,
      hardwarePurchaseRequired: false,
      raspberryPiDeferred: status.device.raspberryPiDeferred || status.device.deviceType === "raspberry-pi-local-satellite",
      localPwaMounted: status.device.localPwaMounted,
    },
    presence: {
      status: status.health.status,
      statusLabel: status.health.statusLabel,
      statusTone: status.health.statusTone,
      readyForHouse,
      lastSeenAt: status.health.lastSeenAt,
      minutesSinceLastSeen: status.health.minutesSinceLastSeen,
      onlineThresholdMinutes: status.health.onlineThresholdMinutes,
      offlineReason: status.health.offlineReason,
      heartbeatOnly: true,
      localPwaPresenceOnly: true,
      networkScanningEnabled: false,
    },
    controls: {
      alwaysVisible: controlsAlwaysVisible,
      muteVisible: true,
      stopVisible: true,
      recoverVisible: true,
      voiceEntryVisible: status.controls.visibleVoiceEntryAvailable,
      muted: status.controls.muted,
      listening: status.device.listening,
      speaking: status.device.speaking,
    },
    voice,
    safety: {
      hiddenRecording: false,
      backgroundRecording: false,
      autoListening: false,
      liveMicCaptureEnabled: false,
      rawAudioStored: false,
      rawTranscriptStored: false,
      cameraSurveillanceEnabled: false,
      networkScanningEnabled: false,
      deviceControlEnabled: false,
      cloudUsed: false,
      smsEnabled: false,
      emailEnabled: false,
      pushEnabled: false,
      emergencyReplacement: false,
      medicalDiagnosis: false,
    },
    receipt: {
      receiptType: "apex-family-care-household-device-presence",
      schemaVersion: 1,
      generatedAt: status.generatedAt,
      policyId: APEX_FAMILY_CARE_HOUSEHOLD_DEVICE_PRESENCE_POLICY.policyId,
      ...APEX_FAMILY_CARE_HOUSEHOLD_DEVICE_PRESENCE_POLICY,
      metadata: {
        selectedDeviceType: status.device.deviceType,
        room: status.device.room,
        presenceStatus: status.health.status,
        readyForHouse,
        controlsAlwaysVisible,
        muted: status.controls.muted,
        voiceStatus: voice.status,
        localSttEndpointEnabled: voice.localSttEndpointEnabled,
        bridgeApprovalRequired: voice.bridgeApprovalRequired,
      },
    },
  };
}
