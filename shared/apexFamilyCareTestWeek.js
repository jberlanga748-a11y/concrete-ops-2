import { listApexFamilyCareNotes } from "./apexFamilyCare.js";

export const APEX_FAMILY_CARE_TEST_WEEK_POLICY = Object.freeze({
  policyId: "apex-family-care-test-week-v1",
  phase: "family-test-week",
  localOnly: true,
  familyCareOnly: true,
  apexHqProductWork: false,
  actualFamilyWeekRequired: true,
  canAutoCompletePhase: false,
  completionRequiresHumanReview: true,
  rawAudioStored: false,
  rawTranscriptStored: false,
  rawPromptStored: false,
  rawResponseStored: false,
  rawFeedbackStoredInReceipt: false,
  cloudUsed: false,
  smsSent: false,
  emailSent: false,
  pushSent: false,
  medicalDiagnosis: false,
  emergencyReplacement: false,
});

export const APEX_FAMILY_CARE_TEST_WEEK_FRICTION_CATEGORIES = Object.freeze([
  "status-texts",
  "doctor-prep",
  "too-much-work",
  "privacy",
  "speed",
  "useful",
  "other",
]);

const FRICTION_CATEGORY_SET = new Set(APEX_FAMILY_CARE_TEST_WEEK_FRICTION_CATEGORIES);
const REPORTERS = new Set(["Dad", "Brother", "Grandma", "Family", "John"]);
const UPDATE_SPEED_VALUES = new Set(["unknown", "yes", "no"]);

function cleanText(value, maxLength = 240) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function normalizeNow(value, fallback = new Date()) {
  const date = value instanceof Date ? value : new Date(value || fallback);
  return Number.isNaN(date.getTime()) ? fallback : date;
}

function normalizeIso(value, fallback = "") {
  const cleaned = cleanText(value, 40);
  if (!cleaned) return fallback;
  const parsed = new Date(cleaned);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed.toISOString();
}

function normalizeNonNegativeNumber(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.round(numeric));
}

function normalizeRating(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(5, Math.round(numeric)));
}

function daysBetween(start, end) {
  const startMs = Date.parse(start);
  const endMs = Date.parse(end);
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs < startMs) return 0;
  return Math.floor((endMs - startMs) / 86400000) + 1;
}

function localDateKey(value) {
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function noteDays(notes) {
  return new Set(listApexFamilyCareNotes(notes, { limit: Number.POSITIVE_INFINITY }).map((note) => localDateKey(note.timestamp)).filter(Boolean)).size;
}

export function createApexFamilyCareTestWeekFrictionNote(input = {}, now = new Date()) {
  const generatedAt = normalizeNow(now);
  const category = FRICTION_CATEGORY_SET.has(input.category) ? input.category : "other";
  const reporter = REPORTERS.has(input.reporter) ? input.reporter : "Family";
  const text = cleanText(input.text, 260);
  const suggestion = cleanText(input.suggestion, 180);

  return {
    id: cleanText(input.id, 96) || `family-care-test-week-${generatedAt.getTime()}`,
    createdAt: normalizeIso(input.createdAt, generatedAt.toISOString()),
    reporter,
    category,
    text,
    suggestion,
    extraWork: Boolean(input.extraWork),
    shouldSimplify: Boolean(input.shouldSimplify || input.extraWork || category === "too-much-work"),
    shouldFreeze: Boolean(input.shouldFreeze || category === "useful"),
  };
}

export function getDefaultApexFamilyCareTestWeekState(now = new Date()) {
  const generatedAt = normalizeNow(now);
  return {
    schemaVersion: 1,
    status: "prep",
    createdAt: generatedAt.toISOString(),
    updatedAt: generatedAt.toISOString(),
    startedAt: "",
    completedAt: "",
    realWeekStarted: false,
    realWeekCompleted: false,
    baselineStatusTextsPerDay: 0,
    afterStatusTextsPerDay: 0,
    doctorPrepBeforeRating: 0,
    doctorPrepAfterRating: 0,
    familyInformedBeforeRating: 0,
    familyInformedAfterRating: 0,
    dadExplanationBurdenBeforeRating: 0,
    dadExplanationBurdenAfterRating: 0,
    grandmaDignityRating: 0,
    updatesUnder10Seconds: "unknown",
    frictionNotes: [],
  };
}

export function normalizeApexFamilyCareTestWeekState(input = {}, now = new Date()) {
  const defaults = getDefaultApexFamilyCareTestWeekState(now);
  const startedAt = normalizeIso(input.startedAt, "");
  const completedAt = normalizeIso(input.completedAt, "");
  const realWeekStarted = Boolean(input.realWeekStarted || startedAt);
  const realWeekCompleted = Boolean(input.realWeekCompleted && realWeekStarted && completedAt);

  return {
    ...defaults,
    status: realWeekCompleted ? "review" : realWeekStarted ? "running" : "prep",
    createdAt: normalizeIso(input.createdAt, defaults.createdAt),
    updatedAt: normalizeIso(input.updatedAt, defaults.updatedAt),
    startedAt,
    completedAt,
    realWeekStarted,
    realWeekCompleted,
    baselineStatusTextsPerDay: normalizeNonNegativeNumber(input.baselineStatusTextsPerDay),
    afterStatusTextsPerDay: normalizeNonNegativeNumber(input.afterStatusTextsPerDay),
    doctorPrepBeforeRating: normalizeRating(input.doctorPrepBeforeRating),
    doctorPrepAfterRating: normalizeRating(input.doctorPrepAfterRating),
    familyInformedBeforeRating: normalizeRating(input.familyInformedBeforeRating),
    familyInformedAfterRating: normalizeRating(input.familyInformedAfterRating),
    dadExplanationBurdenBeforeRating: normalizeRating(input.dadExplanationBurdenBeforeRating),
    dadExplanationBurdenAfterRating: normalizeRating(input.dadExplanationBurdenAfterRating),
    grandmaDignityRating: normalizeRating(input.grandmaDignityRating),
    updatesUnder10Seconds: UPDATE_SPEED_VALUES.has(input.updatesUnder10Seconds) ? input.updatesUnder10Seconds : "unknown",
    frictionNotes: Array.isArray(input.frictionNotes)
      ? input.frictionNotes.map((note) => createApexFamilyCareTestWeekFrictionNote(note)).slice(0, 80)
      : [],
  };
}

export function startApexFamilyCareTestWeek(input = {}, now = new Date()) {
  const generatedAt = normalizeNow(now);
  const state = normalizeApexFamilyCareTestWeekState(input, generatedAt);
  return normalizeApexFamilyCareTestWeekState({
    ...state,
    status: "running",
    realWeekStarted: true,
    startedAt: state.startedAt || generatedAt.toISOString(),
    updatedAt: generatedAt.toISOString(),
  }, generatedAt);
}

export function markApexFamilyCareTestWeekComplete(input = {}, now = new Date()) {
  const generatedAt = normalizeNow(now);
  const state = normalizeApexFamilyCareTestWeekState(input, generatedAt);
  return normalizeApexFamilyCareTestWeekState({
    ...state,
    status: "review",
    realWeekStarted: true,
    startedAt: state.startedAt || generatedAt.toISOString(),
    realWeekCompleted: true,
    completedAt: state.completedAt || generatedAt.toISOString(),
    updatedAt: generatedAt.toISOString(),
  }, generatedAt);
}

export function addApexFamilyCareTestWeekFrictionNote(input = {}, noteInput = {}, now = new Date()) {
  const generatedAt = normalizeNow(now);
  const state = normalizeApexFamilyCareTestWeekState(input, generatedAt);
  const note = createApexFamilyCareTestWeekFrictionNote(noteInput, generatedAt);
  return normalizeApexFamilyCareTestWeekState({
    ...state,
    frictionNotes: [note, ...state.frictionNotes].slice(0, 80),
    updatedAt: generatedAt.toISOString(),
  }, generatedAt);
}

export function buildApexFamilyCareTestWeekSummary(input = {}, notes = [], options = {}) {
  const generatedAt = normalizeNow(options.now);
  const state = normalizeApexFamilyCareTestWeekState(input, generatedAt);
  const trackedDays = state.realWeekStarted
    ? daysBetween(state.startedAt, state.completedAt || generatedAt.toISOString())
    : 0;
  const statusTextDelta = state.baselineStatusTextsPerDay - state.afterStatusTextsPerDay;
  const statusTextsReduced = state.baselineStatusTextsPerDay > 0 && statusTextDelta > 0;
  const doctorPrepImproved = state.doctorPrepBeforeRating > 0 && state.doctorPrepAfterRating > state.doctorPrepBeforeRating;
  const familyInformedImproved = state.familyInformedBeforeRating > 0 && state.familyInformedAfterRating > state.familyInformedBeforeRating;
  const dadExplainedLess = state.dadExplanationBurdenBeforeRating > 0 && state.dadExplanationBurdenAfterRating < state.dadExplanationBurdenBeforeRating;
  const grandmaRespected = state.grandmaDignityRating >= 4;
  const quickUpdates = state.updatesUnder10Seconds === "yes";
  const usefulSignals = noteDays(notes) > 0;
  const simplifyCount = state.frictionNotes.filter((note) => note.shouldSimplify).length;
  const freezeCount = state.frictionNotes.filter((note) => note.shouldFreeze).length;
  const successChecks = [
    { id: "status-texts-reduced", label: "Repeated status texts decreased", passed: statusTextsReduced },
    { id: "doctor-prep-improved", label: "Doctor prep improved", passed: doctorPrepImproved },
    { id: "family-informed", label: "Family felt more informed", passed: familyInformedImproved },
    { id: "dad-explained-less", label: "Dad had to explain less", passed: dadExplainedLess },
    { id: "grandma-respected", label: "Grandma stayed respected", passed: grandmaRespected },
    { id: "fast-updates", label: "Updates stayed under 10 seconds", passed: quickUpdates },
    { id: "useful-signals", label: "Apex noticed useful care signals", passed: usefulSignals },
  ];
  const passedCount = successChecks.filter((check) => check.passed).length;
  const evidenceReady = Boolean(
    state.realWeekCompleted
    && trackedDays >= 7
    && state.baselineStatusTextsPerDay > 0
    && state.afterStatusTextsPerDay >= 0
    && state.frictionNotes.length > 0
  );

  return {
    policy: APEX_FAMILY_CARE_TEST_WEEK_POLICY,
    generatedAt: generatedAt.toISOString(),
    state,
    trackedDays,
    noteDayCount: noteDays(notes),
    statusTextDelta,
    successChecks,
    passedCount,
    simplifyCount,
    freezeCount,
    evidenceReady,
    phaseClosureStatus: evidenceReady ? "human-review-required" : "real-week-evidence-missing",
    recommendedNextStep: evidenceReady
      ? "Review real family feedback, simplify friction, then freeze what worked."
      : "Run the real family test week before closing Phase 7.",
    receipt: {
      receiptType: "apex-family-care-test-week",
      schemaVersion: 1,
      generatedAt: generatedAt.toISOString(),
      policyId: APEX_FAMILY_CARE_TEST_WEEK_POLICY.policyId,
      ...APEX_FAMILY_CARE_TEST_WEEK_POLICY,
      metadata: {
        status: state.status,
        trackedDays,
        realWeekStarted: state.realWeekStarted,
        realWeekCompleted: state.realWeekCompleted,
        evidenceReady,
        phaseClosureStatus: evidenceReady ? "human-review-required" : "real-week-evidence-missing",
        frictionNoteCount: state.frictionNotes.length,
        simplifyCount,
        freezeCount,
        passedCount,
        statusTextsReduced,
        doctorPrepImproved,
        familyInformedImproved,
        dadExplainedLess,
        grandmaRespected,
        quickUpdates,
        noteDayCount: noteDays(notes),
      },
    },
  };
}
