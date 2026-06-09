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

function buildReceipt(now, decisions, preferences, quietHoursActive) {
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
  ];

  const activeDecisions = decisions.filter((decision) => decision.shouldNotify);
  const firstReadyDecision = activeDecisions.find((decision) => !decision.quietHoursHold) || activeDecisions[0] || null;
  const nextSafeLockScreenCopy = firstReadyDecision?.lockScreenCopy || APEX_FAMILY_CARE_SAFE_NOTIFICATION_COPY.newUpdate;

  return {
    policy: APEX_FAMILY_CARE_NOTIFICATION_POLICY,
    preferences,
    generatedAt: generatedAt.toISOString(),
    quietHoursActive,
    decisions,
    summary: {
      activeDecisionCount: countActive(decisions),
      heldForQuietHoursCount: decisions.filter((decision) => decision.quietHoursHold).length,
      providerSendQueuedCount: 0,
      liveDeliveryEnabled: false,
      nextDecisionId: firstReadyDecision?.id || "",
      nextSafeLockScreenCopy,
      nextSafeLockScreenCopySafe: isApexFamilyCareLockScreenCopySafe(nextSafeLockScreenCopy),
      realDeliveryDeferredTo: APEX_FAMILY_CARE_NOTIFICATION_POLICY.realDeliveryDeferredTo,
    },
    receipt: buildReceipt(generatedAt, decisions, preferences, quietHoursActive),
  };
}
