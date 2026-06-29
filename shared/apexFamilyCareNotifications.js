import {
  buildApexFamilyCareDoctorSummary,
  buildApexFamilyCareFamilySummary,
  buildApexFamilyCareTodaySummary,
  listApexFamilyCareNotes,
} from "./apexFamilyCare.js";

export const APEX_FAMILY_CARE_NOTIFICATION_POLICY = Object.freeze({
  policyId: "apex-family-care-notifications-v1",
  phase: "notification-decisions",
  localOnly: true,
  familyCareOnly: true,
  apexHqProductWork: false,
  liveDeliveryEnabled: false,
  providerSendsEnabled: false,
  pushEnabled: false,
  smsEnabled: false,
  emailEnabled: false,
  cloudUsed: false,
  rawAudioStored: false,
  rawTranscriptStored: false,
  rawPromptStored: false,
  rawResponseStored: false,
  rawNoteStored: false,
  secretsStored: false,
  customerDataStored: false,
  medicalDiagnosis: false,
  emergencyReplacement: false,
  lockScreenSensitiveDetailsAllowed: false,
  quietHoursSupported: true,
  realDeliveryDeferredTo: "Phase 5A",
});

export const APEX_FAMILY_CARE_NOTIFICATION_DELIVERY_POLICY = Object.freeze({
  policyId: "apex-family-care-notification-delivery-v1",
  phase: "phase-5a-real-local-notification-delivery",
  localOnly: true,
  familyCareOnly: true,
  apexHqProductWork: false,
  defaultDeliveryMethod: "local-house-device",
  localHouseDeviceDeliveryEnabled: true,
  inAppHouseDeviceOnly: true,
  deviceTrustRequired: true,
  recipientControlsRequired: true,
  pwaPushEnabled: false,
  browserNotificationEnabled: false,
  serviceWorkerPushEnabled: false,
  smsEnabled: false,
  emailEnabled: false,
  cloudUsed: false,
  providerSendsEnabled: false,
  providerPayloadStored: false,
  externalSendApprovalRequired: true,
  lockScreenSensitiveDetailsAllowed: false,
  rawAudioStored: false,
  rawTranscriptStored: false,
  rawPromptStored: false,
  rawResponseStored: false,
  rawNoteStored: false,
  secretsStored: false,
  customerDataStored: false,
  medicalDiagnosis: false,
  emergencyReplacement: false,
});

export const APEX_FAMILY_CARE_EXTERNAL_NOTIFICATION_APPROVAL_POLICY = Object.freeze({
  policyId: "apex-family-care-external-notification-approval-v1",
  phase: "phase-5b-approved-external-notification-delivery",
  localOnly: true,
  familyCareOnly: true,
  apexHqProductWork: false,
  humanApprovalRequired: true,
  externalChannelApproved: false,
  approvedChannel: "not-chosen",
  providerBoundaryApproved: false,
  providerConfigured: false,
  providerPayloadCreated: false,
  providerPayloadTested: false,
  liveDeliveryEnabled: false,
  readyForProviderSetup: false,
  readyForLiveSend: false,
  pwaPushEnabled: false,
  browserNotificationEnabled: false,
  serviceWorkerPushEnabled: false,
  deviceNotificationEnabled: false,
  smsEnabled: false,
  emailEnabled: false,
  smsSent: false,
  emailSent: false,
  pushSent: false,
  browserNotificationSent: false,
  notificationApiPermissionRequested: false,
  serviceWorkerPushRegistered: false,
  rawNoteTextStoredInReceipt: false,
  sensitiveMedicalDetailInProviderPayload: false,
  lockScreenSensitiveDetailsAllowed: false,
  rawAudioStored: false,
  rawTranscriptStored: false,
  rawPromptStored: false,
  rawResponseStored: false,
  secretsStored: false,
  customerDataStored: false,
  cloudUsed: false,
  schemaChanged: false,
  authSessionChanged: false,
  deployChanged: false,
  publicAccess: false,
  customerAccess: false,
  fieldAccess: false,
});

export const APEX_FAMILY_CARE_NOTIFICATION_DELIVERY_METHODS = Object.freeze([
  { id: "local-house-device", label: "Local house device", requiresProviderApproval: false },
  { id: "pwa-push", label: "PWA push", requiresProviderApproval: true },
  { id: "device-notification", label: "Device notification", requiresProviderApproval: true },
  { id: "sms", label: "SMS", requiresProviderApproval: true },
  { id: "email", label: "Email", requiresProviderApproval: true },
]);

const EXTERNAL_NOTIFICATION_CHANNELS = Object.freeze(
  APEX_FAMILY_CARE_NOTIFICATION_DELIVERY_METHODS.filter((method) => method.requiresProviderApproval),
);

export const APEX_FAMILY_CARE_NOTIFICATION_TYPES = Object.freeze([
  "family-digest",
  "concern-marked",
  "missing-update",
  "doctor-summary-ready",
  "repeated-pattern",
]);

export const APEX_FAMILY_CARE_SAFE_NOTIFICATION_COPY = Object.freeze({
  familyDigest: "Family care summary is ready.",
  concernMarked: "Concern was marked.",
  missingUpdate: "No update today. Check when convenient.",
  doctorSummaryReady: "Doctor summary is ready.",
  repeatedPattern: "Repeated care pattern noticed.",
  newUpdate: "New Grandma update.",
});

const DEFAULT_NOTIFICATION_PREFERENCES = Object.freeze({
  schemaVersion: 1,
  familyDigestEnabled: true,
  concernNotificationsEnabled: true,
  missingUpdateNotificationsEnabled: true,
  doctorSummaryNotificationsEnabled: true,
  repeatedPatternNotificationsEnabled: true,
  quietHoursEnabled: true,
  quietHoursStart: "20:00",
  quietHoursEnd: "08:00",
  lowNoiseMode: true,
  lockScreenSensitiveDetails: false,
  liveDeliveryEnabled: false,
  recipientGroup: "family",
  deliveryMethod: APEX_FAMILY_CARE_NOTIFICATION_DELIVERY_POLICY.defaultDeliveryMethod,
  localHouseDeviceDeliveryEnabled: true,
  houseDeviceTrusted: false,
  recipientDadEnabled: true,
  recipientBrotherEnabled: true,
  recipientJohnEnabled: true,
  recipientFamilyEnabled: true,
});

const SENSITIVE_LOCK_SCREEN_PATTERNS = [
  /\bpain\b/i,
  /\bhurt(?:s|ing)?\b/i,
  /\bach(?:e|es|ing)\b/i,
  /\bsore\b/i,
  /\bmeds?\b/i,
  /\bmedicine\b/i,
  /\bmedication\b/i,
  /\bpills?\b/i,
  /\bdose\b/i,
  /\bfell\b/i,
  /\bfall(?:en|ing)?\b/i,
  /\bsevere\b/i,
  /\bknee\b/i,
  /\bhip\b/i,
  /\bback\b/i,
  /\bchest\b/i,
  /\bstomach\b/i,
  /\bhead\b/i,
  /\bbathroom\b/i,
  /\bconfus(?:ed|ion)\b/i,
];

function cleanText(value, maxLength = 180) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function normalizeBoolean(value, fallback) {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeTime(value, fallback) {
  const text = cleanText(value, 8);
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(text) ? text : fallback;
}

function normalizeDeliveryMethod(value) {
  const text = cleanText(value, 40);
  const method = APEX_FAMILY_CARE_NOTIFICATION_DELIVERY_METHODS.find((item) => item.id === text);
  return method?.id || APEX_FAMILY_CARE_NOTIFICATION_DELIVERY_POLICY.defaultDeliveryMethod;
}

function normalizeExternalNotificationChannel(value) {
  const text = cleanText(value, 40);
  const method = EXTERNAL_NOTIFICATION_CHANNELS.find((item) => item.id === text);
  return method?.id || "not-chosen";
}

function getDeliveryMethodLabel(methodId) {
  if (methodId === "not-chosen") return "Not chosen";
  const method = APEX_FAMILY_CARE_NOTIFICATION_DELIVERY_METHODS.find((item) => item.id === methodId);
  return method?.label || "Not chosen";
}

function timeToMinutes(value) {
  const [hours, minutes] = normalizeTime(value, "00:00").split(":").map((part) => Number.parseInt(part, 10));
  return hours * 60 + minutes;
}

function isQuietHoursActive(now, preferences) {
  if (!preferences.quietHoursEnabled) return false;
  const date = now instanceof Date ? now : new Date(now);
  if (Number.isNaN(date.getTime())) return false;
  const currentMinutes = date.getHours() * 60 + date.getMinutes();
  const start = timeToMinutes(preferences.quietHoursStart);
  const end = timeToMinutes(preferences.quietHoursEnd);
  if (start === end) return false;
  if (start < end) return currentMinutes >= start && currentMinutes < end;
  return currentMinutes >= start || currentMinutes < end;
}

function countActive(decisions) {
  return decisions.filter((decision) => decision.shouldNotify && decision.enabled).length;
}

function countSelectedRecipients(preferences) {
  return [
    preferences.recipientDadEnabled,
    preferences.recipientBrotherEnabled,
    preferences.recipientJohnEnabled,
    preferences.recipientFamilyEnabled,
  ].filter(Boolean).length;
}

function buildDeliveryContext(preferences, kitchenStatus = {}) {
  const deliveryMethod = normalizeDeliveryMethod(preferences.deliveryMethod);
  const providerMethod = deliveryMethod !== APEX_FAMILY_CARE_NOTIFICATION_DELIVERY_POLICY.defaultDeliveryMethod;
  const recipientCount = countSelectedRecipients(preferences);
  const houseDeviceReady = Boolean(
    kitchenStatus?.device?.localPwaMounted
    && kitchenStatus?.device?.modeEnabled !== false
    && kitchenStatus?.health?.status !== "offline"
  );
  return {
    deliveryMethod,
    providerMethod,
    recipientCount,
    localHouseDeviceDeliveryEnabled: preferences.localHouseDeviceDeliveryEnabled === true,
    houseDeviceTrusted: preferences.houseDeviceTrusted === true,
    houseDeviceReady,
    externalSendApprovalRequired: true,
    providerSendsEnabled: false,
  };
}

function attachLocalDelivery(decision, deliveryContext) {
  const candidate = Boolean(decision.enabled && decision.shouldNotify && !decision.quietHoursHold);
  let localDeliveryStatus = "quiet";
  let localDeliveryStatusLabel = "Quiet";

  if (decision.quietHoursHold) {
    localDeliveryStatus = "held-quiet-hours";
    localDeliveryStatusLabel = "Held for quiet hours";
  } else if (candidate && deliveryContext.providerMethod) {
    localDeliveryStatus = "blocked-provider-approval";
    localDeliveryStatusLabel = "Provider approval required";
  } else if (candidate && !deliveryContext.localHouseDeviceDeliveryEnabled) {
    localDeliveryStatus = "blocked-opt-in";
    localDeliveryStatusLabel = "Local delivery opt-in off";
  } else if (candidate && deliveryContext.recipientCount < 1) {
    localDeliveryStatus = "blocked-no-recipients";
    localDeliveryStatusLabel = "No family recipients selected";
  } else if (candidate && !deliveryContext.houseDeviceTrusted) {
    localDeliveryStatus = "blocked-device-trust";
    localDeliveryStatusLabel = "Trust the house screen first";
  } else if (candidate && !deliveryContext.houseDeviceReady) {
    localDeliveryStatus = "blocked-device-offline";
    localDeliveryStatusLabel = "House screen not ready";
  } else if (candidate) {
    localDeliveryStatus = "ready-local-house-device";
    localDeliveryStatusLabel = "Ready on house screen";
  }

  return {
    ...decision,
    deliveryMethod: deliveryContext.deliveryMethod,
    localDeliveryCandidate: candidate,
    localDeliveryReady: localDeliveryStatus === "ready-local-house-device",
    localDeliveryStatus,
    localDeliveryStatusLabel,
    providerApprovalRequired: deliveryContext.providerMethod,
    externalSendApprovalRequired: true,
    providerPayloadStored: false,
  };
}

function buildDeliverySummary(decisions, deliveryContext) {
  const readyLocalDecisions = decisions.filter((decision) => decision.localDeliveryReady);
  const blockedLocalDecisions = decisions.filter((decision) => decision.localDeliveryCandidate && !decision.localDeliveryReady);
  const heldLocalDecisions = decisions.filter((decision) => decision.localDeliveryStatus === "held-quiet-hours");
  const firstReadyLocalDecision = readyLocalDecisions[0] || null;
  const statusLabel = firstReadyLocalDecision
    ? `${readyLocalDecisions.length} local house notice${readyLocalDecisions.length === 1 ? "" : "s"} ready`
    : blockedLocalDecisions[0]?.localDeliveryStatusLabel || heldLocalDecisions[0]?.localDeliveryStatusLabel || "No local notice ready";

  return {
    policy: APEX_FAMILY_CARE_NOTIFICATION_DELIVERY_POLICY,
    deliveryMethod: deliveryContext.deliveryMethod,
    localHouseDeviceDeliveryEnabled: deliveryContext.localHouseDeviceDeliveryEnabled,
    houseDeviceTrusted: deliveryContext.houseDeviceTrusted,
    houseDeviceReady: deliveryContext.houseDeviceReady,
    recipientCount: deliveryContext.recipientCount,
    readyLocalNoticeCount: readyLocalDecisions.length,
    blockedLocalNoticeCount: blockedLocalDecisions.length,
    heldLocalNoticeCount: heldLocalDecisions.length,
    firstReadyLocalDecisionId: firstReadyLocalDecision?.id || "",
    nextSafeHouseScreenCopy: firstReadyLocalDecision?.lockScreenCopy || "",
    statusLabel,
    externalSendApprovalRequired: true,
    providerSendsEnabled: false,
    providerPayloadStored: false,
    liveExternalSendsEnabled: false,
    pwaPushEnabled: false,
    smsEnabled: false,
    emailEnabled: false,
    cloudUsed: false,
  };
}

function buildDecision(input, preferences, quietHoursActive) {
  const shouldNotify = Boolean(input.enabled && input.shouldNotify);
  const quietHoursHold = Boolean(
    shouldNotify
    && quietHoursActive
    && preferences.lowNoiseMode
    && !input.allowDuringQuietHours
  );
  const lockScreenCopy = cleanText(input.lockScreenCopy || APEX_FAMILY_CARE_SAFE_NOTIFICATION_COPY.newUpdate, 96);
  const lockScreenCopySafe = isApexFamilyCareLockScreenCopySafe(lockScreenCopy);
  const reason = !input.enabled
    ? "disabled-by-preference"
    : !input.shouldNotify
      ? input.inactiveReason || "nothing-to-notify"
      : quietHoursHold
        ? "quiet-hours-hold"
        : "ready-for-in-app-notice";

  return {
    id: input.id,
    type: input.type,
    label: input.label,
    enabled: Boolean(input.enabled),
    shouldNotify,
    priority: input.priority || "normal",
    recipientGroup: preferences.recipientGroup,
    reason,
    quietHoursActive,
    quietHoursHold,
    lockScreenTitle: input.lockScreenTitle || "Apex Family Care",
    lockScreenCopy,
    lockScreenCopySafe,
    inAppCopy: cleanText(input.inAppCopy, 180),
    sourceCount: Math.max(0, Number.parseInt(input.sourceCount || 0, 10) || 0),
    sendNow: false,
    liveDeliveryEnabled: false,
    providerSendQueued: false,
    deliveryDeferred: shouldNotify,
    realDeliveryDeferredTo: APEX_FAMILY_CARE_NOTIFICATION_POLICY.realDeliveryDeferredTo,
    sensitiveDetailsIncluded: !lockScreenCopySafe,
  };
}

function buildReceipt(now, decisions, preferences, quietHoursActive, deliverySummary) {
  const activeDecisions = decisions.filter((decision) => decision.shouldNotify);
  return {
    receiptType: "apex-family-care-notifications",
    schemaVersion: 1,
    generatedAt: now.toISOString(),
    policyId: APEX_FAMILY_CARE_NOTIFICATION_POLICY.policyId,
    ...APEX_FAMILY_CARE_NOTIFICATION_POLICY,
    explicitUserStarted: false,
    rawPromptStored: false,
    rawResponseStored: false,
    rawAudioStored: false,
    rawTranscriptStored: false,
    rawNoteStored: false,
    metadata: {
      decisionCount: decisions.length,
      activeDecisionCount: activeDecisions.length,
      quietHoursActive,
      lowNoiseMode: preferences.lowNoiseMode,
      liveDeliveryEnabled: false,
      providerSendsQueued: false,
      safeCopiesOnly: decisions.every((decision) => decision.lockScreenCopySafe),
      activeTypes: activeDecisions.map((decision) => decision.type),
      deliveryMethod: deliverySummary.deliveryMethod,
      localHouseDeviceDeliveryEnabled: deliverySummary.localHouseDeviceDeliveryEnabled,
      houseDeviceTrusted: deliverySummary.houseDeviceTrusted,
      houseDeviceReady: deliverySummary.houseDeviceReady,
      recipientCount: deliverySummary.recipientCount,
      readyLocalNoticeCount: deliverySummary.readyLocalNoticeCount,
      blockedLocalNoticeCount: deliverySummary.blockedLocalNoticeCount,
      providerPayloadStored: false,
      externalSendApprovalRequired: true,
    },
  };
}

export function getDefaultApexFamilyCareNotificationPreferences() {
  return { ...DEFAULT_NOTIFICATION_PREFERENCES };
}

export function normalizeApexFamilyCareNotificationPreferences(input = {}) {
  const base = getDefaultApexFamilyCareNotificationPreferences();
  return {
    ...base,
    familyDigestEnabled: normalizeBoolean(input.familyDigestEnabled, base.familyDigestEnabled),
    concernNotificationsEnabled: normalizeBoolean(input.concernNotificationsEnabled, base.concernNotificationsEnabled),
    missingUpdateNotificationsEnabled: normalizeBoolean(input.missingUpdateNotificationsEnabled, base.missingUpdateNotificationsEnabled),
    doctorSummaryNotificationsEnabled: normalizeBoolean(input.doctorSummaryNotificationsEnabled, base.doctorSummaryNotificationsEnabled),
    repeatedPatternNotificationsEnabled: normalizeBoolean(input.repeatedPatternNotificationsEnabled, base.repeatedPatternNotificationsEnabled),
    quietHoursEnabled: normalizeBoolean(input.quietHoursEnabled, base.quietHoursEnabled),
    quietHoursStart: normalizeTime(input.quietHoursStart, base.quietHoursStart),
    quietHoursEnd: normalizeTime(input.quietHoursEnd, base.quietHoursEnd),
    lowNoiseMode: normalizeBoolean(input.lowNoiseMode, base.lowNoiseMode),
    lockScreenSensitiveDetails: false,
    liveDeliveryEnabled: false,
    recipientGroup: cleanText(input.recipientGroup || base.recipientGroup, 40) || base.recipientGroup,
    deliveryMethod: normalizeDeliveryMethod(input.deliveryMethod || base.deliveryMethod),
    localHouseDeviceDeliveryEnabled: normalizeBoolean(input.localHouseDeviceDeliveryEnabled, base.localHouseDeviceDeliveryEnabled),
    houseDeviceTrusted: normalizeBoolean(input.houseDeviceTrusted, base.houseDeviceTrusted),
    recipientDadEnabled: normalizeBoolean(input.recipientDadEnabled, base.recipientDadEnabled),
    recipientBrotherEnabled: normalizeBoolean(input.recipientBrotherEnabled, base.recipientBrotherEnabled),
    recipientJohnEnabled: normalizeBoolean(input.recipientJohnEnabled, base.recipientJohnEnabled),
    recipientFamilyEnabled: normalizeBoolean(input.recipientFamilyEnabled, base.recipientFamilyEnabled),
  };
}

export function buildApexFamilyCareExternalNotificationApprovalPacket(input = {}) {
  const now = input.now instanceof Date ? input.now : new Date(input.now || Date.now());
  const generatedAt = Number.isNaN(now.getTime()) ? new Date() : now;
  const selectedChannel = normalizeExternalNotificationChannel(input.selectedChannel || input.channel || input.deliveryMethod);
  const requestedApprovedChannel = normalizeExternalNotificationChannel(input.approvedChannel || selectedChannel);
  const externalChannelApproved = Boolean(input.externalChannelApproved === true && requestedApprovedChannel !== "not-chosen");
  const approvedChannel = externalChannelApproved ? requestedApprovedChannel : "not-chosen";
  const providerBoundaryApproved = Boolean(externalChannelApproved && input.providerBoundaryApproved === true);
  const familyAccessModelApproved = input.familyAccessModelApproved === true;
  const recipientsOptedIn = input.recipientsOptedIn === true;
  const recipientCount = Math.max(0, Number.parseInt(input.recipientCount || 0, 10) || 0);
  const quietHoursReady = input.quietHoursReady !== false;
  const lockScreenCopySafe = input.lockScreenCopySafe !== false;
  const providerPayloadTestsReady = input.providerPayloadTestsReady === true;
  const readyForProviderSetup = Boolean(
    externalChannelApproved
    && providerBoundaryApproved
    && familyAccessModelApproved
    && recipientsOptedIn
    && quietHoursReady
    && lockScreenCopySafe
  );
  const approvalStatus = readyForProviderSetup ? "provider-setup-ready" : "approval-required";
  const checks = [
    {
      id: "external-channel-approved",
      label: "External channel approved",
      passed: externalChannelApproved,
      detail: externalChannelApproved ? getDeliveryMethodLabel(approvedChannel) : "Choose and approve SMS, email, PWA push, or device notification.",
    },
    {
      id: "provider-device-boundary-approved",
      label: "Provider/device boundary approved",
      passed: providerBoundaryApproved,
      detail: providerBoundaryApproved ? "Exact provider or device boundary approved." : "Do not create provider setup or payloads until the boundary is approved.",
    },
    {
      id: "family-access-approved",
      label: "Family access model approved",
      passed: familyAccessModelApproved,
      detail: familyAccessModelApproved ? "Family access model approved." : "Family access model must be approved before external delivery.",
    },
    {
      id: "recipients-opted-in",
      label: "Family recipients opted in",
      passed: recipientsOptedIn,
      detail: recipientsOptedIn ? `${recipientCount} recipient control${recipientCount === 1 ? "" : "s"} selected.` : "Recipients stay local-only until family opt-in is approved.",
    },
    {
      id: "quiet-hours-ready",
      label: "Quiet hours ready",
      passed: quietHoursReady,
      detail: quietHoursReady ? "Quiet hours guard ready." : "Quiet hours must stay configured before external delivery.",
    },
    {
      id: "lock-screen-copy-safe",
      label: "Lock-screen copy safe",
      passed: lockScreenCopySafe,
      detail: lockScreenCopySafe ? "Generic lock-screen copy only." : "Sensitive medical detail is blocked from provider and lock-screen payloads.",
    },
    {
      id: "provider-payload-tests",
      label: "Provider payload tests",
      passed: providerPayloadTestsReady,
      detail: providerPayloadTestsReady ? "Provider payload tests are ready for Phase 5C." : "Payload tests are required before live sends in Phase 5C.",
    },
    {
      id: "live-sends-blocked",
      label: "Live sends blocked",
      passed: true,
      detail: "Phase 5B creates approval metadata only.",
    },
  ];
  const nextApprovalNeeded = checks.find((check) => !check.passed)?.detail || "Provider setup can be designed next, but live sends remain blocked until Phase 5C.";

  return {
    policy: APEX_FAMILY_CARE_EXTERNAL_NOTIFICATION_APPROVAL_POLICY,
    generatedAt: generatedAt.toISOString(),
    approvalStatus,
    selectedChannel,
    selectedChannelLabel: getDeliveryMethodLabel(selectedChannel),
    approvedChannel,
    approvedChannelLabel: getDeliveryMethodLabel(approvedChannel),
    externalChannelApproved,
    providerBoundaryApproved,
    familyAccessModelApproved,
    recipientsOptedIn,
    recipientCount,
    quietHoursReady,
    lockScreenCopySafe,
    providerPayloadTestsReady,
    readyForProviderSetup,
    readyForLiveSend: false,
    providerConfigured: false,
    providerPayloadCreated: false,
    providerPayloadStored: false,
    liveDeliveryEnabled: false,
    pwaPushEnabled: false,
    browserNotificationEnabled: false,
    serviceWorkerPushEnabled: false,
    deviceNotificationEnabled: false,
    smsEnabled: false,
    emailEnabled: false,
    cloudUsed: false,
    nextApprovalNeeded,
    checks,
    approvalInstructions: [
      "Choose the exact external channel.",
      "Approve the provider or device boundary.",
      "Approve family access and recipient opt-in.",
      "Add provider payload tests before any live delivery.",
    ],
    receipt: {
      receiptType: "apex-family-care-external-notification-approval",
      schemaVersion: 1,
      generatedAt: generatedAt.toISOString(),
      policyId: APEX_FAMILY_CARE_EXTERNAL_NOTIFICATION_APPROVAL_POLICY.policyId,
      phase: APEX_FAMILY_CARE_EXTERNAL_NOTIFICATION_APPROVAL_POLICY.phase,
      localOnly: true,
      familyCareOnly: true,
      apexHqProductWork: false,
      rawPromptStored: false,
      rawResponseStored: false,
      rawAudioStored: false,
      rawTranscriptStored: false,
      rawNoteTextStoredInReceipt: false,
      secretsStored: false,
      customerDataStored: false,
      cloudUsed: false,
      metadata: {
        approvalStatus,
        selectedChannel,
        approvedChannel,
        externalChannelApproved,
        providerBoundaryApproved,
        familyAccessModelApproved,
        recipientsOptedIn,
        recipientCount,
        readyForProviderSetup,
        readyForLiveSend: false,
        providerConfigured: false,
        providerPayloadCreated: false,
        liveDeliveryEnabled: false,
        smsSent: false,
        emailSent: false,
        pushSent: false,
        browserNotificationSent: false,
        notificationApiPermissionRequested: false,
        serviceWorkerPushRegistered: false,
        rawNoteTextStoredInReceipt: false,
        sensitiveMedicalDetailInProviderPayload: false,
        lockScreenSensitiveDetailsAllowed: false,
      },
    },
  };
}

export function isApexFamilyCareLockScreenCopySafe(copy = "") {
  const text = cleanText(copy, 180);
  if (!text) return false;
  return !SENSITIVE_LOCK_SCREEN_PATTERNS.some((pattern) => pattern.test(text));
}

export function buildApexFamilyCareNotificationState(notes = [], options = {}) {
  const now = options.now instanceof Date ? options.now : new Date(options.now || Date.now());
  const generatedAt = Number.isNaN(now.getTime()) ? new Date() : now;
  const preferences = normalizeApexFamilyCareNotificationPreferences(options.preferences);
  const normalizedNotes = listApexFamilyCareNotes(notes, { limit: Number.POSITIVE_INFINITY });
  const todaySummary = buildApexFamilyCareTodaySummary(normalizedNotes, generatedAt);
  const doctorSummary = buildApexFamilyCareDoctorSummary(normalizedNotes, generatedAt);
  const familySummary = buildApexFamilyCareFamilySummary(normalizedNotes, generatedAt);
  const quietHoursActive = isQuietHoursActive(generatedAt, preferences);
  const repeatedPatternCount = familySummary.patternSummary?.patterns?.length || 0;
  const deliveryContext = buildDeliveryContext(preferences, options.kitchenStatus);

  const decisions = [
    buildDecision({
      id: "family-digest",
      type: "family-digest",
      label: "Family digest",
      enabled: preferences.familyDigestEnabled,
      shouldNotify: familySummary.visibleCount > 0,
      sourceCount: familySummary.visibleCount,
      lockScreenCopy: APEX_FAMILY_CARE_SAFE_NOTIFICATION_COPY.familyDigest,
      inAppCopy: `${familySummary.visibleCount} family-visible update${familySummary.visibleCount === 1 ? "" : "s"} ready for the digest.`,
      inactiveReason: "no-family-visible-notes",
    }, preferences, quietHoursActive),
    buildDecision({
      id: "concern-marked",
      type: "concern-marked",
      label: "Concern marked",
      enabled: preferences.concernNotificationsEnabled,
      shouldNotify: familySummary.concernCount > 0 || todaySummary.openConcernCount > 0,
      priority: "elevated",
      allowDuringQuietHours: true,
      sourceCount: Math.max(familySummary.concernCount, todaySummary.openConcernCount),
      lockScreenCopy: APEX_FAMILY_CARE_SAFE_NOTIFICATION_COPY.concernMarked,
      inAppCopy: `${Math.max(familySummary.concernCount, todaySummary.openConcernCount)} concern${Math.max(familySummary.concernCount, todaySummary.openConcernCount) === 1 ? "" : "s"} marked for family attention.`,
      inactiveReason: "no-marked-concerns",
    }, preferences, quietHoursActive),
    buildDecision({
      id: "missing-update",
      type: "missing-update",
      label: "Missing update",
      enabled: preferences.missingUpdateNotificationsEnabled,
      shouldNotify: Boolean(todaySummary.missingUpdate?.missing),
      priority: todaySummary.missingUpdate?.concern ? "elevated" : "normal",
      sourceCount: todaySummary.missingUpdate?.missing ? 1 : 0,
      lockScreenCopy: APEX_FAMILY_CARE_SAFE_NOTIFICATION_COPY.missingUpdate,
      inAppCopy: todaySummary.missingUpdate?.missing ? "The family care loop is due for a simple check-in." : "The family care loop is current.",
      inactiveReason: "care-loop-current",
    }, preferences, quietHoursActive),
    buildDecision({
      id: "doctor-summary-ready",
      type: "doctor-summary-ready",
      label: "Doctor summary",
      enabled: preferences.doctorSummaryNotificationsEnabled,
      shouldNotify: doctorSummary.itemCount > 0,
      sourceCount: doctorSummary.itemCount,
      lockScreenCopy: APEX_FAMILY_CARE_SAFE_NOTIFICATION_COPY.doctorSummaryReady,
      inAppCopy: `${doctorSummary.itemCount} doctor-prep item${doctorSummary.itemCount === 1 ? "" : "s"} ready.`,
      inactiveReason: "no-doctor-prep-items",
    }, preferences, quietHoursActive),
    buildDecision({
      id: "repeated-pattern",
      type: "repeated-pattern",
      label: "Repeated pattern",
      enabled: preferences.repeatedPatternNotificationsEnabled,
      shouldNotify: Boolean(familySummary.patternSummary?.hasRepeatedConcerns),
      priority: "elevated",
      sourceCount: repeatedPatternCount,
      lockScreenCopy: APEX_FAMILY_CARE_SAFE_NOTIFICATION_COPY.repeatedPattern,
      inAppCopy: `${repeatedPatternCount} repeated care pattern${repeatedPatternCount === 1 ? "" : "s"} ready for review.`,
      inactiveReason: "no-repeated-pattern",
    }, preferences, quietHoursActive),
  ].map((decision) => attachLocalDelivery(decision, deliveryContext));

  const activeDecisions = decisions.filter((decision) => decision.shouldNotify);
  const firstReadyDecision = activeDecisions.find((decision) => !decision.quietHoursHold) || activeDecisions[0] || null;
  const nextSafeLockScreenCopy = firstReadyDecision?.lockScreenCopy || APEX_FAMILY_CARE_SAFE_NOTIFICATION_COPY.newUpdate;
  const deliverySummary = buildDeliverySummary(decisions, deliveryContext);

  return {
    policy: APEX_FAMILY_CARE_NOTIFICATION_POLICY,
    deliveryPolicy: APEX_FAMILY_CARE_NOTIFICATION_DELIVERY_POLICY,
    preferences,
    generatedAt: generatedAt.toISOString(),
    quietHoursActive,
    decisions,
    delivery: deliverySummary,
    summary: {
      activeDecisionCount: countActive(decisions),
      heldForQuietHoursCount: decisions.filter((decision) => decision.quietHoursHold).length,
      providerSendQueuedCount: 0,
      liveDeliveryEnabled: false,
      readyLocalNoticeCount: deliverySummary.readyLocalNoticeCount,
      blockedLocalNoticeCount: deliverySummary.blockedLocalNoticeCount,
      localDeliveryStatusLabel: deliverySummary.statusLabel,
      deliveryMethod: deliverySummary.deliveryMethod,
      houseDeviceTrusted: deliverySummary.houseDeviceTrusted,
      houseDeviceReady: deliverySummary.houseDeviceReady,
      recipientCount: deliverySummary.recipientCount,
      nextDecisionId: firstReadyDecision?.id || "",
      nextSafeLockScreenCopy,
      nextSafeLockScreenCopySafe: isApexFamilyCareLockScreenCopySafe(nextSafeLockScreenCopy),
      realDeliveryDeferredTo: APEX_FAMILY_CARE_NOTIFICATION_POLICY.realDeliveryDeferredTo,
    },
    receipt: buildReceipt(generatedAt, decisions, preferences, quietHoursActive, deliverySummary),
  };
}
