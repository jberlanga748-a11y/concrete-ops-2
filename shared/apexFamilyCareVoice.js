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

export const APEX_FAMILY_CARE_LOCAL_VOICE_INPUT_POLICY = Object.freeze({
  policyId: "apex-family-care-local-voice-input-v1",
  phase: "phase-4a-real-local-voice-input",
  localOnly: true,
  familyCareOnly: true,
  apexHqProductWork: false,
  explicitUserStartedRequired: true,
  visiblePushToTalkRequired: true,
  visibleStopRequired: true,
  visibleMuteRequired: true,
  visibleRecoverRequired: true,
  localSttOnly: true,
  localSttProviderTarget: "approved-local-stt-bridge",
  localSttEndpointEnabled: false,
  endpointApprovalRequired: true,
  hiddenRecording: false,
  backgroundRecording: false,
  autoListening: false,
  rawAudioStored: false,
  rawAudioUploaded: false,
  rawTranscriptStored: false,
  rawTranscriptStoredInReceipt: false,
  cloudUsed: false,
  cloudSttAllowed: false,
  browserSpeechRecognitionAllowed: false,
  openAiUsed: false,
  groqUsed: false,
  medicalDiagnosis: false,
  emergencyReplacement: false,
});

export const APEX_FAMILY_CARE_LOCAL_STT_BRIDGE_APPROVAL_POLICY = Object.freeze({
  policyId: "apex-family-care-local-stt-bridge-approval-v1",
  phase: "phase-4b-approved-family-local-stt-bridge",
  localOnly: true,
  familyCareOnly: true,
  apexHqProductWork: false,
  humanApprovalRequired: true,
  bridgeApprovalGranted: false,
  endpointEnabled: false,
  endpointImplemented: false,
  endpointTestEnabled: false,
  explicitUserStartedRequired: true,
  visiblePushToTalkRequired: true,
  visibleStopRequired: true,
  visibleMuteRequired: true,
  visibleRecoverRequired: true,
  autoListening: false,
  hiddenRecording: false,
  backgroundRecording: false,
  rawAudioStored: false,
  rawAudioUploaded: false,
  rawTranscriptStored: false,
  rawTranscriptStoredInReceipt: false,
  cloudUsed: false,
  cloudSttAllowed: false,
  browserSpeechRecognitionAllowed: false,
  openAiUsed: false,
  groqUsed: false,
  apexHqDependency: false,
  medicalDiagnosis: false,
  emergencyReplacement: false,
});

const LOCAL_VOICE_SESSION_STATES = new Set(["quiet", "listening", "stopped", "muted", "recovering", "blocked"]);

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

function normalizeSessionState(value) {
  const state = cleanText(value, 32);
  return LOCAL_VOICE_SESSION_STATES.has(state) ? state : "quiet";
}

function localVoiceStatusForState(state, localSttBridgeReady) {
  if (state === "blocked") return "Explicit start required";
  if (state === "listening") return localSttBridgeReady ? "Visible local STT session" : "Visible session; local STT bridge pending";
  if (state === "muted") return "Muted";
  if (state === "stopped") return "Stopped";
  if (state === "recovering") return "Recovered to quiet";
  return "Quiet";
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

export function buildApexFamilyCareLocalVoiceInputSession(input = {}, nowInput = new Date()) {
  const now = normalizeNow(input.now || nowInput);
  const explicitUserStarted = input.explicitUserStarted === true;
  const requestedState = normalizeSessionState(input.state);
  const state = requestedState === "listening" && !explicitUserStarted ? "blocked" : requestedState;
  const localSttBridgeReady = input.localSttBridgeReady === true && input.localSttEndpointEnabled === true;
  const muted = input.muted === true || state === "muted";
  const sessionActive = state === "listening" && explicitUserStarted && !muted;
  const statusLabel = localVoiceStatusForState(state, localSttBridgeReady);

  return {
    sessionType: "apex-family-care-local-voice-input-session",
    generatedAt: now.toISOString(),
    state,
    statusLabel,
    explicitUserStarted,
    sessionActive,
    muted,
    localSttBridgeReady,
    localSttEndpointEnabled: false,
    endpointApprovalRequired: true,
    inputMode: localSttBridgeReady ? "local-stt-bridge" : "visible-transcript",
    controls: {
      startVisible: true,
      stopVisible: true,
      muteVisible: true,
      recoverVisible: true,
      doneVisible: true,
    },
    policy: APEX_FAMILY_CARE_LOCAL_VOICE_INPUT_POLICY,
    receipt: {
      receiptType: "apex-family-care-local-voice-input-session",
      schemaVersion: 1,
      generatedAt: now.toISOString(),
      policyId: APEX_FAMILY_CARE_LOCAL_VOICE_INPUT_POLICY.policyId,
      ...APEX_FAMILY_CARE_LOCAL_VOICE_INPUT_POLICY,
      explicitUserStarted,
      visibleListeningMode: true,
      sessionActive,
      muted,
      metadata: {
        state,
        statusLabel,
        inputMode: localSttBridgeReady ? "local-stt-bridge" : "visible-transcript",
        localSttBridgeReady,
        localSttEndpointEnabled: false,
        endpointApprovalRequired: true,
        stopVisible: true,
        muteVisible: true,
        recoverVisible: true,
        doneVisible: true,
      },
    },
  };
}

export function buildApexFamilyCareLocalSttBridgeApprovalPacket(input = {}) {
  const now = normalizeNow(input.now || input.generatedAt);
  const requestedBridge = cleanText(input.requestedBridge, 80) || "existing-apex-local-faster-whisper-bridge";
  const approvalStatus = input.bridgeApprovalGranted === true ? "approved" : "approval-required";
  const endpointBoundary = cleanText(input.endpointBoundary, 120) || "family-care-specific-local-stt-endpoint";
  const explicitStartReady = input.explicitStartReady !== false;
  const visibleControlsReady = input.visibleControlsReady !== false;
  const noRawStorage = input.noRawStorage !== false;
  const localOnly = input.localOnly !== false;
  const noCloud = input.noCloud !== false;
  const noBrowserSpeech = input.noBrowserSpeech !== false;
  const noApexHqDependency = input.noApexHqDependency !== false;
  const approvalChecks = [
    {
      id: "explicit-user-start",
      label: "Explicit user start",
      status: explicitStartReady ? "ready" : "needs-control",
      ready: explicitStartReady,
      detail: "Every voice session must start from the visible Family Care Voice Update control.",
    },
    {
      id: "visible-stop-mute-recover",
      label: "Visible stop/mute/recover",
      status: visibleControlsReady ? "ready" : "needs-controls",
      ready: visibleControlsReady,
      detail: "Stop Listening, Mute Voice Input, Recover To Quiet, and Done Talking controls stay visible.",
    },
    {
      id: "local-only-stt",
      label: "Local-only STT",
      status: localOnly && noCloud ? "local-only" : "blocked",
      ready: localOnly && noCloud,
      detail: "No OpenAI, Groq, cloud STT, or provider fallback is allowed for Family Care voice.",
    },
    {
      id: "no-raw-audio-transcript-storage",
      label: "No raw audio/transcript storage",
      status: noRawStorage ? "blocked-by-policy" : "needs-privacy-fix",
      ready: noRawStorage,
      detail: "Receipts stay metadata-only and do not store raw audio, uploaded audio, or raw transcript text.",
    },
    {
      id: "no-browser-speech-recognition",
      label: "No browser speech recognition",
      status: noBrowserSpeech ? "blocked-by-policy" : "needs-boundary-fix",
      ready: noBrowserSpeech,
      detail: "Do not add browser SpeechRecognition or hidden microphone APIs for this bridge.",
    },
    {
      id: "family-care-boundary",
      label: "Family Care boundary",
      status: noApexHqDependency ? "separate" : "needs-separation",
      ready: noApexHqDependency,
      detail: "Bridge must be Family Care-specific and not depend on Apex HQ navigation or the private cockpit.",
    },
    {
      id: "john-approval",
      label: "John approval",
      status: approvalStatus,
      ready: approvalStatus === "approved",
      detail: approvalStatus === "approved"
        ? `Approved bridge boundary: ${endpointBoundary}.`
        : "John must approve the Family Care STT bridge boundary before endpoint wiring or live STT tests.",
    },
  ];
  const readyForEndpointWork = approvalStatus === "approved" && approvalChecks.every((check) => check.ready);

  return {
    packetType: "apex-family-care-local-stt-bridge-approval",
    generatedAt: now.toISOString(),
    policy: APEX_FAMILY_CARE_LOCAL_STT_BRIDGE_APPROVAL_POLICY,
    requestedBridge,
    endpointBoundary,
    approvalStatus,
    readyForEndpointWork,
    endpointEnabled: false,
    endpointImplemented: false,
    endpointTestEnabled: false,
    approvalChecks,
    implementationRules: [
      "Use the existing local STT runtime only after John approves the Family Care boundary.",
      "Require visible push-to-talk or visible one-turn listening for every session.",
      "Keep stop, mute, recover, and done controls visible during every voice state.",
      "Store no raw audio, uploaded audio, raw transcripts, prompts, responses, secrets, or provider payloads.",
      "Keep cloud STT, browser SpeechRecognition, auto-listening, hidden recording, Apex HQ dependency, schema/auth/session changes, deploys, and sends blocked.",
    ],
    nextApprovalNeeded: readyForEndpointWork
      ? "Bridge boundary is approved; the next slice may add endpoint tests before live STT wiring."
      : "Approve the Family Care local STT bridge boundary before endpoint wiring or real speech recognition.",
    receipt: {
      receiptType: "apex-family-care-local-stt-bridge-approval",
      schemaVersion: 1,
      generatedAt: now.toISOString(),
      policyId: APEX_FAMILY_CARE_LOCAL_STT_BRIDGE_APPROVAL_POLICY.policyId,
      ...APEX_FAMILY_CARE_LOCAL_STT_BRIDGE_APPROVAL_POLICY,
      metadata: {
        requestedBridge,
        endpointBoundary,
        approvalStatus,
        readyForEndpointWork,
        approvalCheckCount: approvalChecks.length,
        readyApprovalCheckCount: approvalChecks.filter((check) => check.ready).length,
        endpointEnabled: false,
        endpointImplemented: false,
        endpointTestEnabled: false,
        explicitUserStartedRequired: true,
        visibleControlsReady,
        localOnly,
        noRawStorage,
        noCloud,
        noBrowserSpeech,
        noApexHqDependency,
        rawAudioStored: false,
        rawAudioUploaded: false,
        rawTranscriptStored: false,
        rawTranscriptStoredInReceipt: false,
      },
    },
  };
}

export function applyApexFamilyCareLocalVoiceInputControl(current = {}, control = "", now = new Date()) {
  const normalizedControl = cleanText(control, 40);
  const localSttBridgeReady = current.localSttBridgeReady === true && current.localSttEndpointEnabled === true;
  if (normalizedControl === "start") {
    return buildApexFamilyCareLocalVoiceInputSession({
      state: "listening",
      explicitUserStarted: true,
      localSttBridgeReady,
      localSttEndpointEnabled: false,
    }, now);
  }
  if (normalizedControl === "mute") {
    return buildApexFamilyCareLocalVoiceInputSession({
      state: "muted",
      explicitUserStarted: current.explicitUserStarted === true,
      muted: true,
      localSttBridgeReady,
      localSttEndpointEnabled: false,
    }, now);
  }
  if (normalizedControl === "stop") {
    return buildApexFamilyCareLocalVoiceInputSession({
      state: "stopped",
      explicitUserStarted: current.explicitUserStarted === true,
      localSttBridgeReady,
      localSttEndpointEnabled: false,
    }, now);
  }
  return buildApexFamilyCareLocalVoiceInputSession({
    state: "recovering",
    explicitUserStarted: false,
    muted: false,
    localSttBridgeReady,
    localSttEndpointEnabled: false,
  }, now);
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
