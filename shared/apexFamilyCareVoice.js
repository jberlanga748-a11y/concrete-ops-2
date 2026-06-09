import {
  APEX_FAMILY_CARE_CATEGORIES,
  APEX_FAMILY_CARE_REPORTERS,
} from "./apexFamilyCare.js";

export const APEX_FAMILY_CARE_VOICE_POLICY = Object.freeze({
  policyId: "apex-family-care-voice-first-v1",
  phase: "voice-first-entry",
  localOnly: true,
  familyCareOnly: true,
  apexHqProductWork: false,
  explicitUserStartedRequired: true,
  visibleListeningModeRequired: true,
  hiddenRecording: false,
  backgroundRecording: false,
  rawAudioStored: false,
  rawTranscriptStored: false,
  cloudUsed: false,
  cloudSttAllowed: false,
  browserSpeechRecognitionAllowed: false,
  maxFollowUps: 1,
});

const CATEGORY_LABEL_BY_ID = new Map(APEX_FAMILY_CARE_CATEGORIES.map((category) => [category.id, category.label]));
const CATEGORY_DOCTOR_DEFAULT_BY_ID = new Map(APEX_FAMILY_CARE_CATEGORIES.map((category) => [category.id, Boolean(category.doctorDefault)]));
const REPORTER_SET = new Set(APEX_FAMILY_CARE_REPORTERS);

const CATEGORY_RULES = [
  { id: "pain", patterns: [/\bpain\b/i, /\bhurt(?:s|ing)?\b/i, /\bach(?:e|es|ing)\b/i, /\bsore\b/i, /\btender\b/i] },
  { id: "meds", patterns: [/\bmeds?\b/i, /\bmedicine\b/i, /\bmedication\b/i, /\bpills?\b/i, /\bdose\b/i, /\btook\b/i, /\bconfirmed\b/i] },
  { id: "mobility", patterns: [/\bwalk(?:ed|ing)?\b/i, /\bstand(?:ing)?\b/i, /\bstood\b/i, /\bmove(?:d|ment|ing)?\b/i, /\bfall(?:en)?\b/i, /\bfell\b/i, /\bstumble(?:d)?\b/i, /\bcane\b/i, /\bwalker\b/i, /\bchair\b/i] },
  { id: "food", patterns: [/\bate\b/i, /\beat(?:ing)?\b/i, /\bfood\b/i, /\bappetite\b/i, /\bbreakfast\b/i, /\blunch\b/i, /\bdinner\b/i, /\bwater\b/i, /\bdrink(?:ing)?\b/i] },
  { id: "sleep", patterns: [/\bslept\b/i, /\bsleep(?:ing)?\b/i, /\bnap\b/i, /\btired\b/i, /\bawake\b/i, /\brest(?:ed|ing)?\b/i, /\bnight\b/i] },
  { id: "mood", patterns: [/\bmood\b/i, /\bhappy\b/i, /\bsad\b/i, /\bupset\b/i, /\bcalm\b/i, /\bconfused\b/i, /\banxious\b/i, /\bfrustrated\b/i, /\bagitated\b/i] },
  { id: "appointment", patterns: [/\bdoctor\b/i, /\bappointment\b/i, /\bclinic\b/i, /\bnurse\b/i, /\bvisit\b/i, /\bquestions?\b/i] },
  { id: "concern", patterns: [/\bconcern(?:ed)?\b/i, /\bworried\b/i, /\bworry\b/i, /\bunusual\b/i, /\bworse\b/i, /\bnot right\b/i, /\bcheck\b/i] },
  { id: "normal", patterns: [/\bgood\b/i, /\bok(?:ay)?\b/i, /\bfine\b/i, /\bnormal\b/i, /\bsteady\b/i, /\ball right\b/i] },
];

const SEVERITY_RULES = [
  { id: "severe", patterns: [/\bsevere\b/i, /\bterrible\b/i, /\bawful\b/i, /\bvery bad\b/i, /\breally bad\b/i, /\bworse\b/i, /\bcannot\b/i, /\bcan't\b/i, /\bfell\b/i] },
  { id: "medium", patterns: [/\bmedium\b/i, /\bmoderate\b/i, /\bpretty\b/i, /\bbother(?:s|ing)?\b/i, /\bnoticeable\b/i] },
  { id: "mild", patterns: [/\bmild\b/i, /\blittle\b/i, /\bslight(?:ly)?\b/i, /\bminor\b/i] },
];

const BODY_AREAS = [
  "knee",
  "leg",
  "hip",
  "back",
  "shoulder",
  "chest",
  "head",
  "arm",
  "hand",
  "foot",
  "feet",
  "stomach",
  "neck",
  "ankle",
  "wrist",
];

const VAGUE_PATTERNS = [
  /^\s*(bad|not good|hurts|pain|concern)\s*$/i,
  /\bsomething(?: is|'s)? wrong\b/i,
  /\bnot feeling good\b/i,
  /\bdoesn't feel good\b/i,
  /\bnot right\b/i,
];

function cleanText(value, maxLength = 240) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function normalizeNow(value, fallback = new Date()) {
  const resolved = typeof value === "function" ? value() : value;
  const date = resolved instanceof Date ? resolved : new Date(resolved || fallback);
  return Number.isNaN(date.getTime()) ? fallback : date;
}

function matchesAny(text, patterns = []) {
  return patterns.some((pattern) => pattern.test(text));
}

function sentenceCase(value) {
  const cleaned = cleanText(value, 220);
  if (!cleaned) return "";
  const first = cleaned.slice(0, 1).toUpperCase();
  const rest = cleaned.slice(1);
  return `${first}${rest}${/[.!?]$/.test(cleaned) ? "" : "."}`;
}

function stripVoiceCommand(value) {
  return cleanText(value, 420)
    .replace(/^(apex[, ]+)?(please\s+)?(log|record|note|tell the family|tell family|save)(\s+that)?\s+/i, "")
    .replace(/^(grandma|grandma's|she)\s+(said\s+)?/i, "")
    .trim();
}

function classifyCategory(text) {
  for (const rule of CATEGORY_RULES) {
    if (matchesAny(text, rule.patterns)) return rule.id;
  }
  return "general";
}

function classifySeverity(text) {
  for (const rule of SEVERITY_RULES) {
    if (matchesAny(text, rule.patterns)) return rule.id;
  }
  return "unknown";
}

function extractBodyArea(text) {
  return BODY_AREAS.find((area) => new RegExp(`\\b${area}\\b`, "i").test(text)) || "";
}

function buildTags({ category, severity, bodyArea, followUpLimitReached }) {
  const tags = ["voice-entry", category];
  if (severity !== "unknown") tags.push(severity);
  if (bodyArea) tags.push(bodyArea);
  if (followUpLimitReached) tags.push("needs-review");
  return Array.from(new Set(tags)).slice(0, 8);
}

function countWords(text) {
  return (text.toLowerCase().match(/[a-z0-9']+/g) || []).length;
}

function buildFollowUpPrompt({ category, bodyArea }) {
  if (category === "pain") return bodyArea ? "How bad was the pain, and should it go on the doctor summary?" : "Where did it hurt, and how bad was it?";
  if (category === "meds") return "Was this just a medication note or a confirmed medication taken?";
  if (category === "food") return "Was appetite normal, low, or better than usual?";
  if (category === "mobility") return "Was walking or standing harder than usual?";
  if (category === "sleep") return "Was sleep better, worse, or about normal?";
  return "What is the one detail the family should know?";
}

function buildNoteSummary({ category, transcript, followUpAnswer, followUpLimitReached }) {
  const categoryLabel = CATEGORY_LABEL_BY_ID.get(category) || "General";
  const compactPrimary = stripVoiceCommand(transcript);
  const compactFollowUp = stripVoiceCommand(followUpAnswer);
  const combined = cleanText([compactPrimary, compactFollowUp].filter(Boolean).join(" "), 220);
  if (!combined) return "Voice update needs family review.";
  const suffix = followUpLimitReached ? " Needs family review." : "";
  return cleanText(`${categoryLabel} update: ${sentenceCase(combined)}${suffix}`, 260);
}

export function buildApexFamilyCareVoiceReceipt(parseResult = {}, options = {}) {
  const now = normalizeNow(options.now || parseResult.generatedAt);
  return {
    receiptType: "apex-family-care-voice",
    schemaVersion: 1,
    generatedAt: now.toISOString(),
    policyId: APEX_FAMILY_CARE_VOICE_POLICY.policyId,
    phase: APEX_FAMILY_CARE_VOICE_POLICY.phase,
    localOnly: true,
    familyCareOnly: true,
    apexHqProductWork: false,
    explicitUserStarted: parseResult.explicitUserStarted === true,
    visibleListeningMode: true,
    hiddenRecording: false,
    backgroundRecording: false,
    rawAudioStored: false,
    rawTranscriptStored: false,
    rawPromptStored: false,
    rawResponseStored: false,
    cloudUsed: false,
    cloudSttAllowed: false,
    browserSpeechRecognitionAllowed: false,
    secretsStored: false,
    customerDataStored: false,
    medicalDiagnosis: false,
    emergencyReplacement: false,
    metadata: {
      inputMode: cleanText(parseResult.inputMode || "visible-transcript", 48),
      noteReady: Boolean(parseResult.noteReady),
      category: cleanText(parseResult.category || "general", 32),
      severity: cleanText(parseResult.severity || "unknown", 32),
      bodyAreaDetected: Boolean(parseResult.bodyArea),
      followUpCount: Math.max(0, Number.parseInt(parseResult.followUpCount || 0, 10) || 0),
      followUpAsked: Boolean(parseResult.followUpAsked),
      followUpLimitReached: Boolean(parseResult.followUpLimitReached),
      needsFollowUp: Boolean(parseResult.needsFollowUp),
      confidence: Number(parseResult.confidence || 0),
      summaryLength: Math.max(0, Number.parseInt(parseResult.summaryLength || 0, 10) || 0),
    },
  };
}

export function parseApexFamilyCareVoiceNote(transcript = "", options = {}) {
  const now = normalizeNow(options.now);
  const primaryTranscript = cleanText(transcript, 420);
  const followUpAnswer = cleanText(options.followUpAnswer, 220);
  const combinedForClassification = cleanText([primaryTranscript, followUpAnswer].filter(Boolean).join(" "), 520);
  const lower = combinedForClassification.toLowerCase();
  const followUpCount = Math.max(0, Number.parseInt(options.followUpCount || 0, 10) || 0);
  const category = classifyCategory(lower);
  const severity = classifySeverity(lower);
  const bodyArea = extractBodyArea(lower);
  const wordCount = countWords(combinedForClassification);
  const vague = VAGUE_PATTERNS.some((pattern) => pattern.test(combinedForClassification));
  const unclear = !combinedForClassification || wordCount < 4 || (category === "general" && wordCount < 8) || vague;
  const followUpAllowed = followUpCount < APEX_FAMILY_CARE_VOICE_POLICY.maxFollowUps;
  const needsFollowUp = Boolean(unclear && followUpAllowed);
  const followUpLimitReached = Boolean(unclear && !followUpAllowed);
  const urgent = category === "concern" || severity === "severe" || /\bfell\b|\bchest\b|\bnot right\b/i.test(lower);
  const addToDoctorSummary = Boolean(
    CATEGORY_DOCTOR_DEFAULT_BY_ID.get(category)
    || severity === "severe"
    || category === "concern"
    || bodyArea,
  );
  const reporter = REPORTER_SET.has(options.reporter) ? options.reporter : "Family";
  const summary = buildNoteSummary({
    category,
    transcript: primaryTranscript,
    followUpAnswer,
    followUpLimitReached,
  });
  const confidence = !combinedForClassification
    ? 0
    : needsFollowUp
      ? 0.36
      : followUpLimitReached
        ? 0.42
        : category === "general"
          ? 0.58
          : 0.82;
  const noteReady = Boolean(combinedForClassification) && !needsFollowUp;

  const result = {
    generatedAt: now.toISOString(),
    inputMode: cleanText(options.inputMode || "visible-transcript", 48),
    explicitUserStarted: options.explicitUserStarted === true,
    category,
    categoryLabel: CATEGORY_LABEL_BY_ID.get(category) || "General",
    severity,
    bodyArea,
    reporter,
    familyVisible: options.familyVisible !== false,
    addToDoctorSummary,
    urgent,
    needsFollowUp,
    followUpAllowed,
    followUpAsked: needsFollowUp || followUpCount > 0,
    followUpCount,
    followUpLimitReached,
    followUpPrompt: needsFollowUp ? buildFollowUpPrompt({ category, bodyArea }) : "",
    noteReady,
    confidence,
    summaryLength: summary.length,
    noteInput: {
      category,
      reporter,
      timestamp: now.toISOString(),
      summary,
      severity,
      bodyArea,
      tags: buildTags({ category, severity, bodyArea, followUpLimitReached }),
      addToDoctorSummary,
      familyVisible: options.familyVisible !== false,
      urgent,
      source: "voice",
    },
  };

  return {
    ...result,
    receipt: buildApexFamilyCareVoiceReceipt(result, { now }),
  };
}

export function createApexFamilyCareVoiceNoteDraft(input = {}, now = new Date()) {
  return parseApexFamilyCareVoiceNote(input.transcript, {
    now: input.now || now,
    followUpAnswer: input.followUpAnswer,
    followUpCount: input.followUpCount,
    reporter: input.reporter,
    inputMode: input.inputMode,
    explicitUserStarted: input.explicitUserStarted,
    familyVisible: input.familyVisible,
  });
}
