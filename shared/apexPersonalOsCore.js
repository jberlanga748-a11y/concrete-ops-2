import {
  buildApexOsSkillRegistrySummary,
  buildDefaultApexOsSkillRegistry,
} from "./apexOsSkillRegistry.js";

export const APEX_PERSONAL_OS_ROUTE_CATEGORY = Object.freeze({
  LOCAL_CHAT: "local-chat",
  LOCAL_VOICE: "local-voice",
  APEX_HQ: "apex-hq",
  BUILDER: "builder",
  SELF_FIX: "self-fix",
  RESEARCH: "research",
  FILES: "files",
  DESKTOP_CONTROL_PLANNED: "desktop-control-planned",
  LIFE_TASK_PLANNED: "life-task-planned",
});

export const APEX_PERSONAL_OS_ROUTE_CATEGORIES = Object.freeze(Object.values(APEX_PERSONAL_OS_ROUTE_CATEGORY));

export const APEX_PERSONAL_OS_VOICE_LOOP_STATE = Object.freeze({
  IDLE: "idle",
  QUIET: "quiet",
  LISTENING: "listening",
  TRANSCRIBING: "transcribing",
  THINKING: "thinking",
  SPEAKING: "speaking",
  FAILED: "failed",
});

export const APEX_PERSONAL_OS_VOICE_LOOP_STATES = Object.freeze(Object.values(APEX_PERSONAL_OS_VOICE_LOOP_STATE));

const ROUTE_CATEGORY_VALUES = new Set(APEX_PERSONAL_OS_ROUTE_CATEGORIES);
const VOICE_LOOP_STATE_VALUES = new Set(APEX_PERSONAL_OS_VOICE_LOOP_STATES);
const LOCAL_STT_HINTS = Object.freeze(["whisper.cpp", "faster-whisper", "windows-sapi", "windows-speech-local", "vosk"]);
const LOCAL_TTS_HINTS = Object.freeze(["apex-lightweight-kokoro", "apex lightweight", "kokoro onnx", "kokoro", "offlinetts", "offline-tts", "piper", "windows-sapi", "sapi"]);

function list(value) {
  return Array.isArray(value) ? value : [];
}

function text(value = "", limit = 320) {
  return String(value ?? "").replace(/\s+\n/g, "\n").replace(/\s+/g, " ").trim().slice(0, limit);
}

function lower(value = "") {
  return text(value, 1000).toLowerCase();
}

function bool(value) {
  return value === true || value === "true" || value === "available" || value === "ready" || value === "granted";
}

function safeRouteCategory(value = APEX_PERSONAL_OS_ROUTE_CATEGORY.LOCAL_CHAT) {
  const normalized = text(value, 80).toLowerCase();
  return ROUTE_CATEGORY_VALUES.has(normalized) ? normalized : APEX_PERSONAL_OS_ROUTE_CATEGORY.LOCAL_CHAT;
}

export function normalizeApexPersonalOsVoiceLoopState(value = APEX_PERSONAL_OS_VOICE_LOOP_STATE.IDLE) {
  const normalized = lower(value);
  if (VOICE_LOOP_STATE_VALUES.has(normalized)) return normalized;
  if (["quiet", "calm-standby", "go-quiet"].includes(normalized)) return APEX_PERSONAL_OS_VOICE_LOOP_STATE.QUIET;
  if (["standby", "paused"].includes(normalized)) return APEX_PERSONAL_OS_VOICE_LOOP_STATE.IDLE;
  if (["hearing", "recording", "captioning", "capturing"].includes(normalized)) return APEX_PERSONAL_OS_VOICE_LOOP_STATE.LISTENING;
  if (["submitting", "reading", "processing", "recovering"].includes(normalized)) return APEX_PERSONAL_OS_VOICE_LOOP_STATE.THINKING;
  if (["blocked", "error", "unavailable", "missing"].includes(normalized)) return APEX_PERSONAL_OS_VOICE_LOOP_STATE.FAILED;
  return APEX_PERSONAL_OS_VOICE_LOOP_STATE.IDLE;
}

function normalizeEngineRows(value = []) {
  return list(value).map((entry) => {
    if (typeof entry === "string") {
      return {
        id: lower(entry),
        name: text(entry, 80),
        available: true,
        local: true,
      };
    }
    return {
      id: lower(entry?.id || entry?.name || ""),
      name: text(entry?.name || entry?.id || "", 80),
      available: bool(entry?.available ?? entry?.ready ?? entry?.status),
      local: entry?.local !== false,
      status: text(entry?.status || "", 80),
      detail: text(entry?.detail || "", 200),
      lockedVoice: Boolean(entry?.lockedVoice),
      voiceIdentityLocked: Boolean(entry?.voiceIdentityLocked),
      defaultEligible: entry?.defaultEligible,
      optionalPremium: Boolean(entry?.optionalPremium),
      premiumEligible: Boolean(entry?.premiumEligible),
      emergencyFallbackOnly: Boolean(entry?.emergencyFallbackOnly),
      provider: text(entry?.provider || "", 80),
      modelId: text(entry?.modelId || "", 180),
      voiceId: text(entry?.voiceId || entry?.voiceName || "", 80),
      voiceName: text(entry?.voiceName || entry?.voiceId || "", 80),
      dtype: text(entry?.dtype || "", 20),
      processor: text(entry?.processor || "", 40),
      sampleRate: Number(entry?.sampleRate || 0) || 0,
      outputFormat: text(entry?.outputFormat || "", 20),
      gpuCapable: Boolean(entry?.gpuCapable),
      preferred: Boolean(entry?.preferred),
    };
  }).filter((entry) => entry.id || entry.name);
}

function findLocalEngine(rows = [], hints = []) {
  return normalizeEngineRows(rows).find((entry) => {
    const haystack = `${entry.id} ${entry.name}`.toLowerCase();
    return entry.available && entry.local && hints.some((hint) => haystack.includes(hint));
  }) || null;
}

export function buildApexPersonalOsLocalVoiceReadiness({
  loopState = APEX_PERSONAL_OS_VOICE_LOOP_STATE.IDLE,
  microphoneSupported = false,
  microphonePermission = "unknown",
  recording = false,
  transcribing = false,
  thinking = false,
  speaking = false,
  failed = false,
  browserSpeechRecognitionSupported = false,
  browserSpeechSynthesisSupported = false,
  browserAudioUnlocked = false,
  sttEngines = [],
  ttsEngines = [],
  lastVoiceTurn = null,
} = {}) {
  const normalizedLoopState = failed
    ? APEX_PERSONAL_OS_VOICE_LOOP_STATE.FAILED
    : transcribing
      ? APEX_PERSONAL_OS_VOICE_LOOP_STATE.TRANSCRIBING
      : thinking
        ? APEX_PERSONAL_OS_VOICE_LOOP_STATE.THINKING
        : speaking
          ? APEX_PERSONAL_OS_VOICE_LOOP_STATE.SPEAKING
          : recording
            ? APEX_PERSONAL_OS_VOICE_LOOP_STATE.LISTENING
            : normalizeApexPersonalOsVoiceLoopState(loopState);
  const micPermission = lower(microphonePermission || "unknown") || "unknown";
  const micSupported = Boolean(microphoneSupported);
  const micGranted = micSupported && (micPermission === "granted" || recording);
  const micBlocked = micPermission === "denied" || micPermission === "blocked";
  const localStt = findLocalEngine(sttEngines, LOCAL_STT_HINTS);
  const localTts = findLocalEngine(ttsEngines, LOCAL_TTS_HINTS);
  const normalizedTtsRows = normalizeEngineRows(ttsEngines);
  const lockedLightweightVoice = normalizedTtsRows.find((entry) => entry.id === "apex-lightweight-kokoro" || /apex lightweight|kokoro|offlinetts|offline-tts/i.test(`${entry.id} ${entry.name}`));
  const voiceboxApex = normalizedTtsRows.find((entry) => entry.id === "voicebox-apex");
  const voiceboxFallback = normalizedTtsRows.find((entry) => entry.id === "voicebox-fallback");
  const usingLightweightVoice = Boolean(lockedLightweightVoice?.available);
  const usingVoiceboxApex = Boolean(voiceboxApex?.available && voiceboxApex.defaultEligible !== false && !voiceboxApex.optionalPremium);
  const usingVoiceboxFallback = !usingVoiceboxApex && Boolean(voiceboxFallback?.available && voiceboxFallback.defaultEligible !== false && !voiceboxFallback.optionalPremium);
  const usingPiperFallback = Boolean(localTts) && /piper/i.test(`${localTts.id} ${localTts.name}`) && !usingLightweightVoice;
  const usingWindowsFallback = Boolean(localTts) && /windows|sapi/i.test(`${localTts.id} ${localTts.name}`) && !usingLightweightVoice;
  const voiceboxPremiumAvailable = Boolean((voiceboxApex?.available || voiceboxFallback?.available) && (voiceboxApex?.premiumEligible || voiceboxFallback?.premiumEligible));
  const browserCaptions = Boolean(browserSpeechRecognitionSupported);
  const browserPlayback = Boolean(browserSpeechSynthesisSupported || browserAudioUnlocked);
  const canHearLocally = micGranted && Boolean(localStt);
  const canSpeakLocally = Boolean(localTts);
  const lightweightVoiceId = lockedLightweightVoice?.voiceId || lockedLightweightVoice?.voiceName || "";
  const lightweightProcessor = lockedLightweightVoice?.processor || "";
  const partial = micSupported || browserCaptions || browserPlayback || micGranted;
  const status = canHearLocally && canSpeakLocally
    ? "ready"
    : partial
      ? "partial"
      : "missing";
  const tone = status === "ready" ? "green" : status === "partial" ? "amber" : "red";
  const microphoneStatus = !micSupported
    ? "unsupported"
    : micBlocked
      ? "blocked"
      : micGranted
        ? "granted"
        : micPermission === "prompt"
          ? "prompt"
          : "unknown";
  const sttStatus = localStt
    ? "local-ready"
    : browserCaptions
      ? "browser-caption-fallback"
      : "missing";
  const ttsStatus = localTts
    ? "local-ready"
    : browserPlayback
      ? "browser-playback-fallback"
      : "missing";
  const missing = [
    !micSupported ? "browser microphone support" : "",
    micSupported && !micGranted ? "microphone permission" : "",
    !localStt ? "local STT engine such as whisper.cpp or faster-whisper" : "",
    !localTts ? "local TTS engine such as Kokoro, Piper, or Windows SAPI" : "",
    localTts && !usingLightweightVoice ? "locked Apex lightweight Kokoro/OfflineTTS voice configuration" : "",
  ].filter(Boolean);
  const voiceProviderSummary = usingLightweightVoice
    ? `Voice: Kokoro ONNX${lightweightVoiceId ? ` (${lightweightVoiceId})` : ""}${lightweightProcessor ? ` on ${lightweightProcessor}` : ""}. Voice identity locked. Cloud audio is off.`
    : usingPiperFallback
      ? "Voice: Kokoro ONNX locked; currently Piper temporary fallback while Kokoro cannot generate. Cloud audio is off."
      : usingWindowsFallback
        ? "Voice: Kokoro ONNX locked; currently Windows SAPI emergency fallback while Kokoro cannot generate. Cloud audio is off."
        : "Voice: Kokoro ONNX locked; local model/package readiness is still needed before the normal voice can speak. Cloud audio is off.";
  const providerSummary = status === "ready"
    ? `${voiceProviderSummary || `Local voice is ready with ${localStt.name || localStt.id} STT and ${localTts.name || localTts.id} TTS.`}`
    : status === "partial"
      ? `${voiceProviderSummary || `Local voice is not fully wired yet. Mic: ${microphoneStatus}; STT: ${sttStatus}; TTS: ${ttsStatus}. Typed Apex stays ready.`}`
      : "Local voice is missing. Typed Apex stays ready until local microphone, STT, and TTS are configured.";
  const lastTiming = lastVoiceTurn && typeof lastVoiceTurn === "object"
    ? (lastVoiceTurn.timingMs && typeof lastVoiceTurn.timingMs === "object" ? lastVoiceTurn.timingMs : {})
    : {};
  const liveTurnLatency = lastVoiceTurn?.liveTurnLatency || lastVoiceTurn?.latencyProfile?.liveTurn || {};
  const lastTurnTiming = {
    provider: "apex-live-turn-latency",
    version: "v1",
    closeMs: Number(liveTurnLatency.closeMs || lastVoiceTurn?.voiceCloseMs || lastTiming.voiceCloseMs || lastTiming.vadActualSilenceMs || 0) || 0,
    sttMs: Number(liveTurnLatency.sttMs || lastTiming.sttMs || lastTiming.transcriptionTimingMs || 0) || 0,
    modelFirstTokenMs: Number(liveTurnLatency.modelFirstTokenMs || lastTiming.modelFirstTokenMs || 0) || 0,
    modelTotalMs: Number(liveTurnLatency.modelTotalMs || lastTiming.modelTotalMs || lastTiming.modelRequestMs || 0) || 0,
    ttsMs: Number(liveTurnLatency.ttsMs || lastTiming.ttsGenerationMs || lastTiming.ttsRequestMs || 0) || 0,
    playbackRecoveryMs: Number(liveTurnLatency.playbackRecoveryMs || lastTiming.playbackStartDelayMs || 0) + Number(lastTiming.recoveryMs || 0) + Number(lastTiming.playbackDurationMs || 0),
    totalTurnMs: Number(liveTurnLatency.totalTurnMs || lastVoiceTurn?.totalTurnMs || lastTiming.totalTurnMs || 0) || 0,
    slowestStep: text(liveTurnLatency.slowestStep || lastVoiceTurn?.slowestStep || "", 100),
    slowestStepLabel: text(liveTurnLatency.slowestStepLabel || lastVoiceTurn?.slowestStepLabel || lastVoiceTurn?.slowestStep || "", 120),
    slowestStepMs: Number(liveTurnLatency.slowestStepMs || lastVoiceTurn?.slowestStepMs || 0) || 0,
    diagnosis: text(liveTurnLatency.diagnosis || "", 80),
    bottleneckOwner: text(liveTurnLatency.bottleneckOwner || "", 80),
    modelFast: Boolean(liveTurnLatency.modelFast),
    cachedVoiceReadinessReused: Boolean(liveTurnLatency.cachedVoiceReadinessReused || lastVoiceTurn?.localVoiceStatusCacheHit),
  };
  return {
    status,
    tone,
    loopState: normalizedLoopState,
    microphoneStatus,
    sttStatus,
    ttsStatus,
    sttEngine: localStt?.name || localStt?.id || "",
    ttsEngine: localTts?.name || localTts?.id || "",
    sttProcessor: localStt?.processor || "unknown",
    sttGpuCapable: Boolean(localStt?.gpuCapable),
    usingLightweightVoice,
    usingVoiceboxApex,
    usingVoiceboxFallback,
    voiceboxDefaultActive: usingVoiceboxApex || usingVoiceboxFallback,
    voiceboxOptionalPremium: true,
    voiceboxPremiumAvailable,
    usingWindowsVoiceFallback: usingWindowsFallback,
    usingPiperVoiceFallback: usingPiperFallback,
    voiceIdentityLocked: true,
    lightweightVoiceTarget: `Kokoro ONNX${lightweightVoiceId ? ` / ${lightweightVoiceId}` : ""}`,
    lightweightVoiceId,
    lightweightVoiceModelId: lockedLightweightVoice?.modelId || "",
    lightweightVoiceDtype: lockedLightweightVoice?.dtype || "",
    lightweightVoiceProcessor: lightweightProcessor,
    preferredVoiceStatus: usingLightweightVoice ? "apex-lightweight-kokoro" : usingPiperFallback ? "piper-fallback" : usingWindowsFallback ? "windows-sapi-fallback" : "kokoro-config-needed",
    canHearLocally,
    canSpeakLocally,
    browserCaptionFallbackAvailable: browserCaptions,
    browserPlaybackFallbackAvailable: browserPlayback,
    typedFallbackAvailable: true,
    openAiAudioUsed: false,
    cloudAudioAllowed: false,
    lastVoiceTurn,
    lastTurnId: lastVoiceTurn?.lastTurnId || lastVoiceTurn?.turnId || "",
    lastTurnStatus: lastVoiceTurn?.status || "",
    lastTurnTotalMs: Number(lastVoiceTurn?.totalTurnMs || 0) || 0,
    lastTurnSlowestStep: lastVoiceTurn?.slowestStep || "",
    lastTurnSlowestStepLabel: lastTurnTiming.slowestStepLabel,
    lastTurnSlowestStepMs: lastTurnTiming.slowestStepMs,
    lastTurnTiming,
    lastTurnFailureReason: lastVoiceTurn?.failureReason || "",
    lastTurnAudioValid: lastVoiceTurn?.audioValid === true,
    providerSummary,
    missing,
    rows: [
      { id: "voice-loop", title: "Voice loop", status: normalizedLoopState, detail: "idle/listening/transcribing/thinking/speaking/failed state for the visible Apex page.", tone: status === "ready" ? "green" : "blue" },
      { id: "voice-identity", title: "Voice identity", status: "locked", detail: "Apex uses one persistent lightweight Kokoro ONNX voice target. No rotation or random provider switching.", tone: usingLightweightVoice ? "green" : "amber" },
      { id: "microphone", title: "Microphone", status: microphoneStatus, detail: micSupported ? "Browser microphone support is present; permission controls whether Apex can listen." : "This browser cannot open a microphone here.", tone: micGranted ? "green" : micBlocked ? "red" : "amber" },
      { id: "local-stt", title: "Local STT", status: sttStatus, detail: localStt ? `${localStt.name || localStt.id} detected on ${localStt.processor || "unknown"} processor.` : "No local transcription engine is wired yet. Browser captions are fallback only when available.", tone: localStt ? "green" : browserCaptions ? "amber" : "red" },
      { id: "local-tts", title: "Local TTS", status: ttsStatus, detail: localTts ? `${localTts.name || localTts.id} detected.` : "No local TTS engine is wired yet. Browser playback is fallback only when available.", tone: localTts ? "green" : browserPlayback ? "amber" : "red" },
      { id: "voicebox", title: "Voicebox", status: "premium-optional", detail: voiceboxPremiumAvailable ? "Voicebox premium/test mode is available only when explicitly requested." : "Voicebox is optional premium mode and is not required for normal Apex speech.", tone: voiceboxPremiumAvailable ? "amber" : "green" },
      { id: "cloud-audio", title: "Cloud audio", status: "disabled", detail: "OpenAI audio/cloud STT/TTS is not part of Local Voice Runtime v4.", tone: "green" },
    ],
  };
}

const PERSONAL_OS_ROUTES = Object.freeze([
  {
    id: "local-chat",
    category: APEX_PERSONAL_OS_ROUTE_CATEGORY.LOCAL_CHAT,
    label: "Local Chat",
    status: "available",
    detail: "Answer through local-first Apex using Ollama and private operator context.",
    canAnswerNow: true,
    canExecuteNow: false,
  },
  {
    id: "local-voice",
    category: APEX_PERSONAL_OS_ROUTE_CATEGORY.LOCAL_VOICE,
    label: "Local Voice",
    status: "setup-needed",
    detail: "Visible microphone/speech state exists; GPU STT and locked local TTS depend on the Local Voice Runtime provider slice.",
    canAnswerNow: true,
    canExecuteNow: false,
  },
  {
    id: "apex-hq-domain",
    category: APEX_PERSONAL_OS_ROUTE_CATEGORY.APEX_HQ,
    label: "Apex HQ Domain",
    status: "available",
    detail: "Route to existing Apex HQ business modules and summaries without duplicating workflows.",
    canAnswerNow: true,
    canExecuteNow: false,
  },
  {
    id: "builder",
    category: APEX_PERSONAL_OS_ROUTE_CATEGORY.BUILDER,
    label: "Builder",
    status: "available",
    detail: "Use Builder Mode for local build status, fixed safe checks, controlled local fixes, receipts, and undo.",
    canAnswerNow: true,
    canExecuteNow: false,
  },
  {
    id: "self-fix",
    category: APEX_PERSONAL_OS_ROUTE_CATEGORY.SELF_FIX,
    label: "Self-Fix",
    status: "available",
    detail: "Prepare or dispatch scoped local repair requests through controlled Builder tooling.",
    canAnswerNow: true,
    canExecuteNow: false,
  },
  {
    id: "research",
    category: APEX_PERSONAL_OS_ROUTE_CATEGORY.RESEARCH,
    label: "Research",
    status: "planned",
    detail: "Local research planning and source-aware summaries are available; live web research/search is not wired here yet.",
    canAnswerNow: true,
    canExecuteNow: false,
  },
  {
    id: "files",
    category: APEX_PERSONAL_OS_ROUTE_CATEGORY.FILES,
    label: "Files",
    status: "planned",
    detail: "Build-awareness/file summaries exist; arbitrary desktop file control is planned only.",
    canAnswerNow: true,
    canExecuteNow: false,
  },
  {
    id: "desktop-control-planned",
    category: APEX_PERSONAL_OS_ROUTE_CATEGORY.DESKTOP_CONTROL_PLANNED,
    label: "Desktop Control",
    status: "planned",
    detail: "Desktop/browser/app control is planned only. No click, type, app control, screenshots, or hidden capture is active.",
    canAnswerNow: true,
    canExecuteNow: false,
  },
  {
    id: "life-task-planned",
    category: APEX_PERSONAL_OS_ROUTE_CATEGORY.LIFE_TASK_PLANNED,
    label: "Life Tasks",
    status: "planned",
    detail: "Private internal tasks/reminders are available through existing Apex state; external life automation is planned only.",
    canAnswerNow: true,
    canExecuteNow: false,
  },
]);

const PERSONAL_OS_AGENTS = Object.freeze([
  { id: "apex-core", label: "Apex Core", category: "local-chat", status: "active", detail: "Receives the command first, answers directly, or routes to a skill/tool." },
  { id: "local-intelligence", label: "Local Intelligence", category: "local-chat", status: "active", detail: "Uses qwen3:14b by default, qwen3:14b at 4096 for normal coding, and qwen3-coder:30b only for explicit manual deep work." },
  { id: "builder", label: "Builder", category: "builder", status: "active", detail: "Handles local build checks, controlled fixes, patch previews, receipts, and undo." },
  { id: "self-fix", label: "Self-Fix", category: "self-fix", status: "active", detail: "Turns a broken-screen request into a scoped Builder handoff or controlled local fix." },
  { id: "apex-hq-domain", label: "Apex HQ Domain", category: "apex-hq", status: "active", detail: "Routes to the existing business workspace modules John already built." },
  { id: "research", label: "Research", category: "research", status: "planned", detail: "Can plan research locally; live web/search provider wiring is a future slice." },
  { id: "files", label: "Files", category: "files", status: "planned", detail: "Can use build-awareness summaries; broader local file/workstation control is planned only." },
  { id: "desktop-control", label: "Desktop Control", category: "desktop-control-planned", status: "planned", detail: "Future explicit visible desktop/browser control. Not active in v0." },
]);

export function buildApexPersonalOsCoreState({
  skillRegistry = buildDefaultApexOsSkillRegistry(),
  voiceReadiness = null,
} = {}) {
  const voice = voiceReadiness || buildApexPersonalOsLocalVoiceReadiness();
  const routes = PERSONAL_OS_ROUTES.map((route) => {
    if (route.id !== "local-voice") return { ...route };
    return {
      ...route,
      status: voice.status === "ready" ? "available" : "setup-needed",
      detail: voice.providerSummary,
    };
  });
  const skillSummary = buildApexOsSkillRegistrySummary(skillRegistry, { limit: 8 });
  const agentRows = PERSONAL_OS_AGENTS.map((agent) => ({ ...agent }));
  const activeAgents = agentRows.filter((agent) => agent.status === "active");
  const plannedAgents = agentRows.filter((agent) => agent.status !== "active");
  return {
    productName: "Apex",
    layerName: "Apex Personal OS",
    desktopName: "Apex Desktop",
    operatorName: "Apex Operator",
    cockpitRoute: "/apex",
    legacyCockpitRoute: "/apex-control-room",
    businessDomainName: "Apex HQ",
    identitySummary: "Apex is John's top-level private operator. Apex HQ is one business domain Apex can operate.",
    operatorOnly: true,
    fieldCustomerDemoVisible: false,
    routeCategories: [...APEX_PERSONAL_OS_ROUTE_CATEGORIES],
    routes,
    routeCount: routes.length,
    availableRouteCount: routes.filter((route) => route.status === "available").length,
    plannedRouteCount: routes.filter((route) => route.status !== "available").length,
    skillSummary,
    skillRows: [
      ...skillSummary.availableSkills,
      ...skillSummary.plannedSkills.slice(0, Math.max(0, 8 - skillSummary.availableSkills.length)),
    ].slice(0, 8),
    agentRows,
    activeAgentCount: activeAgents.length,
    plannedAgentCount: plannedAgents.length,
    canExecuteExternalActions: false,
    canControlDesktopNow: false,
    canSendSpendOrderBookNow: false,
    hardStops: [
      "deploy",
      "production mutation",
      "schema/auth/session",
      "deletion",
      "secrets",
      "permission weakening",
      "sends/email/SMS",
      "spend",
      "orders/bookings",
      "customer-visible changes",
      "hidden tracking",
    ],
  };
}

function responseShape(route, fields = {}) {
  return {
    handled: true,
    intent: route.intent,
    category: route.category,
    routeId: route.id,
    routeStatus: route.status,
    canExecuteNow: false,
    sourceLabels: fields.sourceLabels || ["Apex Personal OS", "Apex Operator"],
    shouldClearScreen: false,
    shouldStopListening: false,
    ...fields,
  };
}

export function routeApexPersonalOsCommand(command = "") {
  const normalized = lower(command);
  const route = (id, intent, category = "") => {
    const matched = PERSONAL_OS_ROUTES.find((entry) => entry.id === id || entry.category === category) || PERSONAL_OS_ROUTES[0];
    return {
      ...matched,
      intent,
      category: safeRouteCategory(category || matched.category),
    };
  };

  if (!normalized) return route("local-chat", "local-chat", APEX_PERSONAL_OS_ROUTE_CATEGORY.LOCAL_CHAT);
  if (/\b(are you my desktop apex|desktop apex|personal apex|are you apex hq or my personal apex|are you apex hq|who are you)\b/i.test(normalized)
    || /^apex,?\s*what are you[?.!]*$/i.test(normalized)
    || /^what are you[?.!]*$/i.test(normalized)) {
    return route("local-chat", "identity", APEX_PERSONAL_OS_ROUTE_CATEGORY.LOCAL_CHAT);
  }
  if (/\b(what can you control right now|what can you control|what can you do right now|what is wired right now)\b/i.test(normalized)) {
    return route("local-chat", "current-control", APEX_PERSONAL_OS_ROUTE_CATEGORY.LOCAL_CHAT);
  }
  if (/\b(what skills do you have|skills do you have|show skills|available skills|what can you use)\b/i.test(normalized)) {
    return route("local-chat", "skills", APEX_PERSONAL_OS_ROUTE_CATEGORY.LOCAL_CHAT);
  }
  if (/\b(what agents work under you|agents work under you|what agents do you have|who can help you with this|what are your agents doing|agents under you)\b/i.test(normalized)) {
    return route("local-chat", "agents", APEX_PERSONAL_OS_ROUTE_CATEGORY.LOCAL_CHAT);
  }
  if (/\b(can you hear(?: me| a| this| that| us)?|are you listening|test your voice|test your ears|test my mic|test the mic|mic test|microphone test|calibrate my mic|calibrate the mic|check my mic|check the microphone|why can't you hear me|why cant you hear me|listen to this|say something|what voice are you using|are you using windows voice|are you using gpu stt|gpu stt|use your apex voice|use the voice i saved|use your lightweight voice|use your normal voice|try the next male voice|next male voice|lock this voice|are you using voicebox|stop using voicebox by default|use premium voice|go back to your normal voice|go back to normal voice|why is voice slow|why do you sound different|why can't you talk|why cant you talk|fall back to windows voice|fallback to windows voice|stop listening|start listening|wake up|go quiet)\b/i.test(normalized)) {
    const voiceIntent = /\bstop listening\b|\bgo quiet\b/i.test(normalized)
      ? "voice-stop-listening"
      : /\bwake up\b|\bstart listening\b/i.test(normalized)
        ? "voice-start-listening"
      : /\b(test my mic|test the mic|mic test|microphone test|calibrate my mic|calibrate the mic|check my mic|check the microphone|why can't you hear me|why cant you hear me)\b/i.test(normalized)
        ? "voice-mic-test"
      : /\btry the next male voice\b|\bnext male voice\b/i.test(normalized)
        ? "voice-next-male"
        : /\block this voice\b/i.test(normalized)
          ? "voice-lock-current"
      : /\bare you using gpu stt\b|\bgpu stt\b/i.test(normalized)
        ? "voice-gpu-stt"
        : /\bare you using windows voice\b|\bwhy is voice slow\b/i.test(normalized)
          ? "voice-runtime-truth"
      : /\bare you using voicebox\b|\bstop using voicebox by default\b/i.test(normalized)
        ? "voicebox-status"
        : /\buse premium voice\b/i.test(normalized)
          ? "voice-premium"
          : /\buse your lightweight voice\b|\bgo back to (your )?normal voice\b|\buse your apex voice\b|\buse the voice i saved\b/i.test(normalized)
            ? "voice-lightweight"
      : /\bfall back to windows voice\b|\bfallback to windows voice\b/i.test(normalized)
        ? "voice-windows-fallback"
        : "voice-status";
    return route("local-voice", voiceIntent, APEX_PERSONAL_OS_ROUTE_CATEGORY.LOCAL_VOICE);
  }
  if (/\b(check apex hq|open apex hq|show apex hq|business workspace|apex hq)\b/i.test(normalized)) {
    return route("apex-hq-domain", "apex-hq", APEX_PERSONAL_OS_ROUTE_CATEGORY.APEX_HQ);
  }
  if (/\b(use builder|builder|work on the app|check the app|build status)\b/i.test(normalized)) {
    return route("builder", "builder", APEX_PERSONAL_OS_ROUTE_CATEGORY.BUILDER);
  }
  if (/\b(fix the app|fix this screen|fix this page|repair this|self[- ]?fix|prepare a patch)\b/i.test(normalized)) {
    return route("self-fix", "self-fix", APEX_PERSONAL_OS_ROUTE_CATEGORY.SELF_FIX);
  }
  if (/\b(research this|research|look this up|source-aware|knowledge)\b/i.test(normalized)) {
    return route("research", "research", APEX_PERSONAL_OS_ROUTE_CATEGORY.RESEARCH);
  }
  if (/\b(file|folder|local files|documents|desktop files)\b/i.test(normalized)) {
    return route("files", "files", APEX_PERSONAL_OS_ROUTE_CATEGORY.FILES);
  }
  if (/\b(control my computer|desktop control|browser control|open app|click|type for me|screen control)\b/i.test(normalized)) {
    return route("desktop-control-planned", "desktop-control-planned", APEX_PERSONAL_OS_ROUTE_CATEGORY.DESKTOP_CONTROL_PLANNED);
  }
  if (/\b(remind me|task|life plan|personal logistics|order|book|pizza|reservation)\b/i.test(normalized)) {
    return route("life-task-planned", "life-task-planned", APEX_PERSONAL_OS_ROUTE_CATEGORY.LIFE_TASK_PLANNED);
  }
  return route("local-chat", "local-chat", APEX_PERSONAL_OS_ROUTE_CATEGORY.LOCAL_CHAT);
}

export function buildApexPersonalOsCommandResponse({
  command = "",
  coreState = null,
  voiceReadiness = null,
} = {}) {
  const route = routeApexPersonalOsCommand(command);
  const voice = voiceReadiness || coreState?.voiceReadiness || buildApexPersonalOsLocalVoiceReadiness();
  const core = coreState || buildApexPersonalOsCoreState({ voiceReadiness: voice });
  const availableRoutes = core.routes.filter((entry) => entry.status === "available").map((entry) => entry.label);
  const plannedRoutes = core.routes.filter((entry) => entry.status !== "available").map((entry) => entry.label);
  const activeAgents = core.agentRows.filter((entry) => entry.status === "active").map((entry) => `${entry.label}: ${entry.detail}`);
  const plannedAgents = core.agentRows.filter((entry) => entry.status !== "active").map((entry) => `${entry.label}: ${entry.detail}`);

  if (route.intent === "identity") {
    return responseShape(route, {
      answer: "Yes. I am Apex, your private desktop operator. Apex HQ is one business workspace I can operate for you, but it is not my whole identity. You talk to Apex first; I answer directly or route to Builder, Self-Fix, Apex HQ, local intelligence, memory/tasks, research planning, or future agents when the request calls for it.",
    });
  }

  if (route.intent === "current-control") {
    return responseShape(route, {
      answer: `Right now I can use: ${availableRoutes.join(", ")}. Planned but not live yet: ${plannedRoutes.join(", ")}. I cannot control the desktop/browser/apps, send messages, spend money, order, book, deploy, change production, change schema/auth/session, delete data, expose secrets, weaken permissions, or affect other people without the proper future gated flow.`,
    });
  }

  if (route.intent === "skills") {
    const skillNames = core.skillSummary.topAvailableSkillNames.length
      ? core.skillSummary.topAvailableSkillNames.join(", ")
      : availableRoutes.join(", ");
    return responseShape(route, {
      answer: `My available skills are ${skillNames}. At the Personal OS level I can route local chat, Apex HQ, Builder, Self-Fix, memory/tasks, local intelligence, and source-aware planning. Planned skills stay honest: research/search, files, desktop/browser control, life automation, music/second screen, ordering, booking, and messaging are not live execution paths yet.`,
      sourceLabels: ["Apex Personal OS", "Skill Registry"],
    });
  }

  if (route.intent === "agents") {
    return responseShape(route, {
      answer: `The active agents under me are ${activeAgents.join(" ")} Planned agents are ${plannedAgents.join(" ")} I will not claim a planned agent is doing real work until it is actually wired.`,
      sourceLabels: ["Apex Personal OS", "Agent Router"],
    });
  }

  if (route.intent === "voice-stop-listening") {
    return responseShape(route, {
      shouldClearScreen: true,
      shouldStopListening: true,
      answer: "I stopped listening and moved the voice loop to quiet. Typed Apex stays ready.",
      sourceLabels: ["Apex Personal OS", "Always-Open Mic Runtime v0"],
    });
  }

  if (route.intent === "voice-start-listening") {
    return responseShape(route, {
      shouldStartListening: true,
      answer: "I am in standby listening mode. The mic gate stays local, drops frames while I speak, and only sends a completed voice turn to GPU STT after sustained silence.",
      sourceLabels: ["Apex Personal OS", "Always-Open Mic Runtime v0"],
    });
  }

  if (route.intent === "voice-next-male") {
    return responseShape(route, {
      answer: "I can try the next Kokoro ONNX male voice and keep it local. I will cycle the safe audition voice id, then speak the next test through the local lightweight path if Kokoro is ready.",
      sourceLabels: ["Apex Personal OS", "Kokoro ONNX TTS v4"],
    });
  }

  if (route.intent === "voice-lock-current") {
    return responseShape(route, {
      answer: `I can lock the current Kokoro ONNX voice for daily Apex speech. I only persist provider, model id, voice id, dtype, and processor. I do not store generated audio, the reference WAV, secrets, or cloud credentials.`,
      sourceLabels: ["Apex Personal OS", "Kokoro ONNX TTS v4"],
    });
  }

  if (route.intent === "voice-mic-test") {
    return responseShape(route, {
      answer: "I can test the visible browser microphone path locally. I will open or read the mic calibration lane, measure whether PCM frames are arriving, track peak level, noise floor, and the calibrated speech gate, then keep STT idle until the gate sees a completed turn. OpenAI audio is not used.",
      sourceLabels: ["Apex Personal OS", "Apex Real Mic Calibration v1", "Always-Open Mic Runtime"],
    });
  }

  if (route.intent === "voice-status" || route.intent === "voice-gpu-stt" || route.intent === "voice-runtime-truth") {
    const canHearText = voice.canHearLocally
      ? "Yes, local STT is ready. With the page microphone open, I can hear through browser mic input, the local amplitude gate, and faster-whisper CUDA after a completed voice turn."
      : `Not through a full local STT path yet. Mic is ${voice.microphoneStatus}; STT is ${voice.sttStatus}.`;
    const sttTruth = route.intent === "voice-gpu-stt"
      ? voice.sttProcessor === "gpu"
        ? `Yes. Local STT is using ${voice.sttEngine || "the configured local engine"} on GPU, and Windows SAPI is not the active STT path.`
        : `Not yet. Local STT is ${voice.sttEngine || voice.sttStatus || "unknown"} on ${voice.sttProcessor || "unknown"}; Windows SAPI stays emergency fallback only.`
      : `STT is ${voice.sttEngine || voice.sttStatus || "unknown"} on ${voice.sttProcessor || "unknown"}${voice.sttGpuCapable ? " and is GPU-capable" : ""}.`;
    const windowsTruth = route.intent === "voice-runtime-truth"
      ? voice.usingWindowsVoiceFallback
        ? "Windows SAPI is active only as emergency TTS fallback because Kokoro ONNX could not generate the locked voice yet."
        : "Windows SAPI is not my active normal voice path."
      : "";
    const canSpeakText = voice.usingLightweightVoice
      ? `I am using my locked normal voice: ${voice.lightweightVoiceTarget}.`
      : voice.usingPiperVoiceFallback
        ? "My locked normal voice is Kokoro ONNX, but Kokoro could not generate right now, so I am temporarily using Piper fallback."
        : voice.usingWindowsVoiceFallback
          ? "My locked normal voice is Kokoro ONNX, but Kokoro could not generate right now, so I am temporarily using Windows SAPI emergency fallback."
          : voice.canSpeakLocally
            ? `I can speak locally through ${voice.ttsEngine}.`
            : `Local TTS is ${voice.ttsStatus}. Browser playback can be a fallback, but OpenAI audio is not used for Local Voice Runtime v4.`;
    return responseShape(route, {
      answer: `${canHearText} ${sttTruth} ${canSpeakText} ${windowsTruth} Voice identity is locked; I do not rotate voices. Voicebox is premium optional only and is not my default. Voice loop is ${voice.loopState}; STT stays idle until the v0 mic gate reaches sustained silence. OpenAI audio is not used. Typed fallback is always available. Missing: ${voice.missing.length ? voice.missing.join(", ") : "nothing"}.`,
      sourceLabels: ["Apex Personal OS", "Always-Open Mic Runtime v0", "Local Voice Runtime v4"],
    });
  }

  if (route.intent === "voice-lightweight") {
    return responseShape(route, {
      answer: voice.usingLightweightVoice
        ? `Already there. My normal voice is locked to ${voice.lightweightVoiceTarget}, and I am not using Voicebox by default.`
        : `My normal voice is still locked to Kokoro ONNX. I will use ${voice.usingPiperVoiceFallback ? "Piper" : voice.usingWindowsVoiceFallback ? "Windows SAPI" : "typed fallback"} only as a labeled fallback if Kokoro cannot generate.`,
      sourceLabels: ["Apex Personal OS", "Local Voice Runtime v4"],
    });
  }

  if (route.intent === "voicebox-status") {
    return responseShape(route, {
      answer: `No. Voicebox is not my default voice path. My normal voice target is locked to Kokoro ONNX. Voicebox stays optional premium/test mode only${voice.voiceboxPremiumAvailable ? ", and it is available only when you explicitly ask for premium voice." : ", and it is not needed for normal Apex speech."}`,
      sourceLabels: ["Apex Personal OS", "Voicebox Resource Guard"],
    });
  }

  if (route.intent === "voice-premium") {
    return responseShape(route, {
      answer: voice.voiceboxPremiumAvailable
        ? "Premium voice can use Voicebox for an explicit test, but it will not replace my normal voice. After the test I return to Kokoro ONNX."
        : "Premium Voicebox is not available right now or is guarded as heavy. I will stay on the locked Kokoro ONNX path and use only labeled local fallback if Kokoro cannot generate.",
      sourceLabels: ["Apex Personal OS", "Voicebox Resource Guard"],
    });
  }

  if (route.intent === "voice-windows-fallback") {
    return responseShape(route, {
      answer: "Windows SAPI stays available only as my emergency local fallback. My normal voice remains locked to Kokoro ONNX, and Voicebox is optional premium/test mode only.",
      sourceLabels: ["Apex Personal OS", "Local Voice Runtime v4"],
    });
  }

  if (route.intent === "apex-hq") {
    return responseShape(route, {
      answer: "I can check Apex HQ as the business workspace under Apex. I can summarize leads, jobs, customers, estimates/proposals, reports/uploads, and build status from existing app state and routes. I will not duplicate Apex HQ workflows or perform customer-visible actions from this command.",
      sourceLabels: ["Apex Personal OS", "Apex HQ Domain"],
    });
  }

  if (route.intent === "builder") {
    return responseShape(route, {
      answer: "I can use Builder underneath Apex for private local app work: build awareness, dirty-file summaries, fixed safe checks, controlled local fixes, receipts, patch previews, and Apex-owned undo. Deploy, production, schema/auth/session, deletion, secrets, permission weakening, sends, spend, orders, and customer-visible changes stay stopped.",
      sourceLabels: ["Apex Personal OS", "Builder"],
    });
  }

  if (route.intent === "self-fix") {
    return responseShape(route, {
      answer: "I can route this to Self-Fix and Builder for a scoped local repair path. The Apex home surface will stay conversational; the build tooling owns any controlled patch execution and validation.",
      sourceLabels: ["Apex Personal OS", "Self-Fix", "Builder"],
    });
  }

  if (route.intent === "research") {
    return responseShape(route, {
      answer: "I can plan the research and summarize source-aware local/project context. Live web research/search is not wired into Apex Personal OS yet, so I will name the missing provider instead of pretending I searched.",
      sourceLabels: ["Apex Personal OS", "Research Planner"],
    });
  }

  if (route.intent === "files") {
    return responseShape(route, {
      answer: "I can use existing build-awareness and source summaries when the app has them, but broad desktop file control is not active yet. The next needed capability is a local file provider with explicit scope and secret redaction.",
      sourceLabels: ["Apex Personal OS", "Files Planned"],
    });
  }

  if (route.intent === "desktop-control-planned") {
    return responseShape(route, {
      answer: "Desktop/browser control is planned, not active. I cannot click, type, browse authenticated pages, capture hidden screens, or control apps from Apex yet. The next capability is an explicit visible desktop session with watch mode, kill switch, and approval gates.",
      sourceLabels: ["Apex Personal OS", "Desktop Control Planned"],
    });
  }

  if (route.intent === "life-task-planned") {
    return responseShape(route, {
      answer: "Private internal tasks and reminders can live inside Apex, but external life logistics are not live yet. I cannot order, book, spend, send, or affect other people's time/data from this route.",
      sourceLabels: ["Apex Personal OS", "Life Tasks Planned"],
    });
  }

  return {
    handled: false,
    intent: route.intent,
    category: route.category,
    routeId: route.id,
    routeStatus: route.status,
    canExecuteNow: false,
  };
}
