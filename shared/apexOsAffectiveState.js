export const APEX_OS_AFFECTIVE_MODE = Object.freeze({
  STEADY: "steady",
  FOCUSED: "focused",
  OVERLOADED: "overloaded",
  FRUSTRATED: "frustrated",
  URGENT: "urgent",
  STUCK: "stuck",
  EXPLORING: "exploring",
  DECISIVE: "decisive",
  RECOVERING: "recovering",
});

export const APEX_OS_AFFECTIVE_MODES = Object.freeze(Object.values(APEX_OS_AFFECTIVE_MODE));

export const APEX_OS_AFFECTIVE_TONE = Object.freeze({
  CALM: "calm",
  DIRECT: "direct",
  SUPPORTIVE: "supportive",
  PRACTICAL: "practical",
  STRATEGIC: "strategic",
  ENCOURAGING: "encouraging",
});

export const APEX_OS_AFFECTIVE_TONES = Object.freeze(Object.values(APEX_OS_AFFECTIVE_TONE));

export const APEX_OS_AFFECTIVE_LEVEL = Object.freeze({
  UNKNOWN: "unknown",
  LOW: "low",
  NORMAL: "normal",
  MEDIUM: "medium",
  HIGH: "high",
});

export const APEX_OS_AFFECTIVE_LEVELS = Object.freeze(Object.values(APEX_OS_AFFECTIVE_LEVEL));

export const APEX_OS_AFFECTIVE_FOCUS = Object.freeze({
  CLEAR: "clear",
  SCATTERED: "scattered",
  BLOCKED: "blocked",
  EXPLORATORY: "exploratory",
  EXECUTION: "execution",
});

export const APEX_OS_AFFECTIVE_FOCUS_VALUES = Object.freeze(Object.values(APEX_OS_AFFECTIVE_FOCUS));

export const APEX_OS_RESPONSE_STYLE = Object.freeze({
  CONCISE: "concise",
  STEP_BY_STEP: "step-by-step",
  DECISIVE: "decisive",
  EXPLAINER: "explainer",
  CALM_DIRECT: "calm-direct",
  COLLABORATIVE: "collaborative",
});

export const APEX_OS_RESPONSE_STYLES = Object.freeze(Object.values(APEX_OS_RESPONSE_STYLE));

export const APEX_OS_AFFECTIVE_SIGNAL = Object.freeze({
  DIRECT_STYLE_REQUEST: "direct-style-request",
  CONCISE_STYLE_REQUEST: "concise-style-request",
  STEP_BY_STEP_REQUEST: "step-by-step-request",
  EXPLAINER_REQUEST: "explainer-request",
  URGENCY: "urgency",
  HIGH_URGENCY: "high-urgency",
  FRUSTRATION: "frustration",
  HIGH_FRUSTRATION: "high-frustration",
  OVERWHELMED: "overwhelmed",
  LOW_ENERGY: "low-energy",
  HIGH_ENERGY: "high-energy",
  FOCUS_CLEAR: "focus-clear",
  FOCUS_SCATTERED: "focus-scattered",
  STUCK_OR_CONFUSED: "stuck-or-confused",
  EXPLORATORY: "exploratory",
  EXECUTION_READY: "execution-ready",
  RECOVERY: "recovery",
});

export const APEX_OS_AFFECTIVE_SIGNALS = Object.freeze(Object.values(APEX_OS_AFFECTIVE_SIGNAL));

const TEXT_LIMIT = 1800;
const SUMMARY_LIMIT = 420;

function text(value = "", limit = TEXT_LIMIT) {
  return String(value ?? "").replace(/\s+\n/g, "\n").replace(/\s+/g, " ").trim().slice(0, limit);
}

function lower(value = "") {
  return text(value).toLowerCase();
}

function normalizeEnum(value = "", values = [], fallback = "") {
  const normalized = lower(value).replace(/_/g, "-");
  return values.includes(normalized) ? normalized : fallback;
}

function matchesAny(value = "", patterns = []) {
  return patterns.some((pattern) => pattern.test(value));
}

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function scoreFromSignals(signalIds = []) {
  const count = unique(signalIds).length;
  if (!count) return 35;
  return Math.min(88, 45 + (count * 8));
}

function countSignal(signalIds = [], ids = []) {
  const set = new Set(signalIds);
  return ids.filter((id) => set.has(id)).length;
}

export function normalizeApexOsAffectiveMode(value = APEX_OS_AFFECTIVE_MODE.STEADY) {
  return normalizeEnum(value, APEX_OS_AFFECTIVE_MODES, APEX_OS_AFFECTIVE_MODE.STEADY);
}

export function normalizeApexOsAffectiveTone(value = APEX_OS_AFFECTIVE_TONE.PRACTICAL) {
  return normalizeEnum(value, APEX_OS_AFFECTIVE_TONES, APEX_OS_AFFECTIVE_TONE.PRACTICAL);
}

export function normalizeApexOsAffectiveLevel(value = APEX_OS_AFFECTIVE_LEVEL.NORMAL) {
  return normalizeEnum(value, APEX_OS_AFFECTIVE_LEVELS, APEX_OS_AFFECTIVE_LEVEL.NORMAL);
}

export function normalizeApexOsAffectiveFocus(value = APEX_OS_AFFECTIVE_FOCUS.CLEAR) {
  return normalizeEnum(value, APEX_OS_AFFECTIVE_FOCUS_VALUES, APEX_OS_AFFECTIVE_FOCUS.CLEAR);
}

export function normalizeApexOsResponseStyle(value = APEX_OS_RESPONSE_STYLE.COLLABORATIVE) {
  return normalizeEnum(value, APEX_OS_RESPONSE_STYLES, APEX_OS_RESPONSE_STYLE.COLLABORATIVE);
}

export function detectApexOsAffectiveSignals(value = "") {
  const normalized = lower(value);
  const signals = [];

  if (matchesAny(normalized, [/\b(short|quick|brief|concise|straight to it|bottom line|no long answer)\b/])) {
    signals.push(APEX_OS_AFFECTIVE_SIGNAL.CONCISE_STYLE_REQUEST);
  }
  if (matchesAny(normalized, [/\b(step by step|walk me through|how do i|how should i|explain the steps|one clear next step|single next step)\b/])) {
    signals.push(APEX_OS_AFFECTIVE_SIGNAL.STEP_BY_STEP_REQUEST);
  }
  if (matchesAny(normalized, [/\b(explain|why|how does|help me understand|i don't know how|i dont know how)\b/])) {
    signals.push(APEX_OS_AFFECTIVE_SIGNAL.EXPLAINER_REQUEST);
  }
  if (matchesAny(normalized, [/\b(be direct|be honest|tell me straight|no sugarcoating|real answer|serious)\b/])) {
    signals.push(APEX_OS_AFFECTIVE_SIGNAL.DIRECT_STYLE_REQUEST);
  }
  if (matchesAny(normalized, [/\b(now|right now|asap|urgent|today|tonight|immediately|do it|let's do it|lets do it)\b/])) {
    signals.push(APEX_OS_AFFECTIVE_SIGNAL.URGENCY);
  }
  if (matchesAny(normalized, [/\bemergency|critical|can't wait|cannot wait|right this second|drop everything\b/])) {
    signals.push(APEX_OS_AFFECTIVE_SIGNAL.HIGH_URGENCY);
  }
  if (matchesAny(normalized, [/\b(frustrated|annoyed|mad|angry|pissed|not happy|unhappy|this sucks|looks like shit|terrible|awful|basic blob|worse than|hate this)\b/])) {
    signals.push(APEX_OS_AFFECTIVE_SIGNAL.FRUSTRATION);
  }
  if (matchesAny(normalized, [/\bfurious|rage|i'm done|im done|this is garbage|completely wrong|nothing works|shit|wtf\b/])) {
    signals.push(APEX_OS_AFFECTIVE_SIGNAL.HIGH_FRUSTRATION);
  }
  if (matchesAny(normalized, [/\boverwhelmed|too much|stressed|drowning|can't keep up|cannot keep up|all over the place\b/])) {
    signals.push(APEX_OS_AFFECTIVE_SIGNAL.OVERWHELMED);
  }
  if (matchesAny(normalized, [/\btired|exhausted|burnt out|burned out|drained|low energy|worn out\b/])) {
    signals.push(APEX_OS_AFFECTIVE_SIGNAL.LOW_ENERGY);
  }
  if (matchesAny(normalized, [/\bexcited|ready|locked in|let's go|lets go|full send|i'm ready|im ready\b/])) {
    signals.push(APEX_OS_AFFECTIVE_SIGNAL.HIGH_ENERGY);
  }
  if (matchesAny(normalized, [/\bfocus|focused|lock in|one thing|single next step|clear next step\b/])) {
    signals.push(APEX_OS_AFFECTIVE_SIGNAL.FOCUS_CLEAR);
  }
  if (matchesAny(normalized, [/\bscattered|all over|random|too many options|not sure where to start|where do we start\b/])) {
    signals.push(APEX_OS_AFFECTIVE_SIGNAL.FOCUS_SCATTERED);
  }
  if (matchesAny(normalized, [/\bstuck|confused|lost|don't understand|dont understand|not sure|i don't know|i dont know|why can't|why cant\b/])) {
    signals.push(APEX_OS_AFFECTIVE_SIGNAL.STUCK_OR_CONFUSED);
  }
  if (matchesAny(normalized, [/\bcurious|what do you think|ideas?|options?|show me|explore|visual direction|concept\b/])) {
    signals.push(APEX_OS_AFFECTIVE_SIGNAL.EXPLORATORY);
  }
  if (matchesAny(normalized, [/\b(start|build|implement|finish|fix|make it|do it|continue|next phase|let's start|lets start)\b/])) {
    signals.push(APEX_OS_AFFECTIVE_SIGNAL.EXECUTION_READY);
  }
  if (matchesAny(normalized, [/\b(calm|slow down|reset|regroup|safe point|checkpoint|pause and review)\b/])) {
    signals.push(APEX_OS_AFFECTIVE_SIGNAL.RECOVERY);
  }

  return Object.freeze(unique(signals));
}

function urgencyFromSignals(signalIds = []) {
  if (signalIds.includes(APEX_OS_AFFECTIVE_SIGNAL.HIGH_URGENCY)) return APEX_OS_AFFECTIVE_LEVEL.HIGH;
  if (signalIds.includes(APEX_OS_AFFECTIVE_SIGNAL.URGENCY)) return APEX_OS_AFFECTIVE_LEVEL.MEDIUM;
  return APEX_OS_AFFECTIVE_LEVEL.NORMAL;
}

function frustrationFromSignals(signalIds = []) {
  if (signalIds.includes(APEX_OS_AFFECTIVE_SIGNAL.HIGH_FRUSTRATION)) return APEX_OS_AFFECTIVE_LEVEL.HIGH;
  if (signalIds.includes(APEX_OS_AFFECTIVE_SIGNAL.FRUSTRATION)) return APEX_OS_AFFECTIVE_LEVEL.MEDIUM;
  return APEX_OS_AFFECTIVE_LEVEL.LOW;
}

function energyFromSignals(signalIds = []) {
  if (signalIds.includes(APEX_OS_AFFECTIVE_SIGNAL.LOW_ENERGY) || signalIds.includes(APEX_OS_AFFECTIVE_SIGNAL.OVERWHELMED)) return APEX_OS_AFFECTIVE_LEVEL.LOW;
  if (signalIds.includes(APEX_OS_AFFECTIVE_SIGNAL.HIGH_ENERGY)) return APEX_OS_AFFECTIVE_LEVEL.HIGH;
  return APEX_OS_AFFECTIVE_LEVEL.NORMAL;
}

function focusFromSignals(signalIds = []) {
  if (signalIds.includes(APEX_OS_AFFECTIVE_SIGNAL.STUCK_OR_CONFUSED)) return APEX_OS_AFFECTIVE_FOCUS.BLOCKED;
  if (signalIds.includes(APEX_OS_AFFECTIVE_SIGNAL.FOCUS_SCATTERED) || signalIds.includes(APEX_OS_AFFECTIVE_SIGNAL.OVERWHELMED)) return APEX_OS_AFFECTIVE_FOCUS.SCATTERED;
  if (signalIds.includes(APEX_OS_AFFECTIVE_SIGNAL.EXPLORATORY)) return APEX_OS_AFFECTIVE_FOCUS.EXPLORATORY;
  if (signalIds.includes(APEX_OS_AFFECTIVE_SIGNAL.EXECUTION_READY)) return APEX_OS_AFFECTIVE_FOCUS.EXECUTION;
  return APEX_OS_AFFECTIVE_FOCUS.CLEAR;
}

function modeFromSignals(signalIds = [], { urgency = "", frustration = "", focus = "", energy = "" } = {}) {
  if (signalIds.includes(APEX_OS_AFFECTIVE_SIGNAL.RECOVERY)) return APEX_OS_AFFECTIVE_MODE.RECOVERING;
  if (frustration === APEX_OS_AFFECTIVE_LEVEL.HIGH || frustration === APEX_OS_AFFECTIVE_LEVEL.MEDIUM) return APEX_OS_AFFECTIVE_MODE.FRUSTRATED;
  if (energy === APEX_OS_AFFECTIVE_LEVEL.LOW || signalIds.includes(APEX_OS_AFFECTIVE_SIGNAL.OVERWHELMED)) return APEX_OS_AFFECTIVE_MODE.OVERLOADED;
  if (focus === APEX_OS_AFFECTIVE_FOCUS.BLOCKED) return APEX_OS_AFFECTIVE_MODE.STUCK;
  if (urgency === APEX_OS_AFFECTIVE_LEVEL.HIGH || urgency === APEX_OS_AFFECTIVE_LEVEL.MEDIUM) return APEX_OS_AFFECTIVE_MODE.URGENT;
  if (focus === APEX_OS_AFFECTIVE_FOCUS.EXPLORATORY) return APEX_OS_AFFECTIVE_MODE.EXPLORING;
  if (focus === APEX_OS_AFFECTIVE_FOCUS.EXECUTION) return APEX_OS_AFFECTIVE_MODE.DECISIVE;
  if (focus === APEX_OS_AFFECTIVE_FOCUS.CLEAR || signalIds.includes(APEX_OS_AFFECTIVE_SIGNAL.FOCUS_CLEAR)) return APEX_OS_AFFECTIVE_MODE.FOCUSED;
  return APEX_OS_AFFECTIVE_MODE.STEADY;
}

function toneFromState({ mode = "", frustration = "", energy = "", focus = "" } = {}) {
  if (frustration === APEX_OS_AFFECTIVE_LEVEL.HIGH || mode === APEX_OS_AFFECTIVE_MODE.FRUSTRATED) return APEX_OS_AFFECTIVE_TONE.CALM;
  if (energy === APEX_OS_AFFECTIVE_LEVEL.LOW || mode === APEX_OS_AFFECTIVE_MODE.OVERLOADED) return APEX_OS_AFFECTIVE_TONE.SUPPORTIVE;
  if (focus === APEX_OS_AFFECTIVE_FOCUS.EXPLORATORY) return APEX_OS_AFFECTIVE_TONE.STRATEGIC;
  if (mode === APEX_OS_AFFECTIVE_MODE.URGENT || mode === APEX_OS_AFFECTIVE_MODE.DECISIVE) return APEX_OS_AFFECTIVE_TONE.DIRECT;
  return APEX_OS_AFFECTIVE_TONE.PRACTICAL;
}

function responseStyleFromSignals(signalIds = [], { mode = "", frustration = "", focus = "" } = {}) {
  if (signalIds.includes(APEX_OS_AFFECTIVE_SIGNAL.CONCISE_STYLE_REQUEST)) return APEX_OS_RESPONSE_STYLE.CONCISE;
  if (signalIds.includes(APEX_OS_AFFECTIVE_SIGNAL.STEP_BY_STEP_REQUEST)) return APEX_OS_RESPONSE_STYLE.STEP_BY_STEP;
  if (signalIds.includes(APEX_OS_AFFECTIVE_SIGNAL.EXPLAINER_REQUEST) && focus === APEX_OS_AFFECTIVE_FOCUS.BLOCKED) return APEX_OS_RESPONSE_STYLE.EXPLAINER;
  if (frustration === APEX_OS_AFFECTIVE_LEVEL.HIGH || mode === APEX_OS_AFFECTIVE_MODE.FRUSTRATED) return APEX_OS_RESPONSE_STYLE.CALM_DIRECT;
  if (mode === APEX_OS_AFFECTIVE_MODE.URGENT || mode === APEX_OS_AFFECTIVE_MODE.DECISIVE) return APEX_OS_RESPONSE_STYLE.DECISIVE;
  if (signalIds.includes(APEX_OS_AFFECTIVE_SIGNAL.EXPLORATORY)) return APEX_OS_RESPONSE_STYLE.COLLABORATIVE;
  return APEX_OS_RESPONSE_STYLE.COLLABORATIVE;
}

function guidanceForState(state = {}) {
  if (state.responseStyle === APEX_OS_RESPONSE_STYLE.CONCISE) return "Keep the answer short, concrete, and action-oriented.";
  if (state.responseStyle === APEX_OS_RESPONSE_STYLE.STEP_BY_STEP) return "Use simple ordered steps and avoid jumping ahead.";
  if (state.responseStyle === APEX_OS_RESPONSE_STYLE.EXPLAINER) return "Explain the mechanism plainly before recommending the next step.";
  if (state.responseStyle === APEX_OS_RESPONSE_STYLE.CALM_DIRECT) return "Be calm, direct, and specific; acknowledge friction without dramatizing it.";
  if (state.responseStyle === APEX_OS_RESPONSE_STYLE.DECISIVE) return "Lead with the next safe move and keep approval boundaries explicit.";
  return "Use a collaborative practical tone and adapt to the request.";
}

export function classifyApexOsAffectiveState(value = "", options = {}) {
  const signalIds = detectApexOsAffectiveSignals(value);
  const urgency = urgencyFromSignals(signalIds);
  const frustration = frustrationFromSignals(signalIds);
  const energy = energyFromSignals(signalIds);
  const focus = focusFromSignals(signalIds);
  const mode = modeFromSignals(signalIds, { urgency, frustration, focus, energy });
  const tone = toneFromState({ mode, frustration, energy, focus });
  const responseStyle = responseStyleFromSignals(signalIds, { mode, frustration, focus });
  const confidence = scoreFromSignals(signalIds);
  const source = text(options.source || "ask-apex-operator-turn", 80);
  const summary = {
    mode,
    tone,
    urgency,
    energy,
    frustration,
    focus,
    responseStyle,
    confidence,
    signalIds,
    source,
    safeGuidance: guidanceForState({ mode, tone, urgency, energy, frustration, focus, responseStyle }),
    reason: signalIds.length
      ? "Deterministic conversation cues suggest a response adaptation."
      : "No strong affective cues were detected; use the normal practical response style.",
    diagnostic: false,
    clinical: false,
    storesRawText: false,
    storesPsychProfile: false,
    safeToUseAsContext: true,
    safeToStoreDurably: false,
    requiresMemoryReview: true,
    operatorOnly: true,
    canExecuteNow: false,
  };

  return Object.freeze({
    ...summary,
    safeSummary: text(`Affective state: mode=${mode}; tone=${tone}; urgency=${urgency}; energy=${energy}; frustration=${frustration}; focus=${focus}; style=${responseStyle}; diagnosis=false; durableProfile=false; canExecuteNow=false.`, SUMMARY_LIMIT),
    metadata: Object.freeze({
      mode,
      tone,
      urgency,
      energy,
      frustration,
      focus,
      responseStyle,
      confidence,
      signalIds: signalIds.slice(0, 14),
      signalCount: signalIds.length,
      urgencySignalCount: countSignal(signalIds, [APEX_OS_AFFECTIVE_SIGNAL.URGENCY, APEX_OS_AFFECTIVE_SIGNAL.HIGH_URGENCY]),
      frustrationSignalCount: countSignal(signalIds, [APEX_OS_AFFECTIVE_SIGNAL.FRUSTRATION, APEX_OS_AFFECTIVE_SIGNAL.HIGH_FRUSTRATION]),
      source,
      diagnostic: false,
      clinical: false,
      storesRawText: false,
      storesPsychProfile: false,
      safeToUseAsContext: true,
      safeToStoreDurably: false,
      requiresMemoryReview: true,
      operatorOnly: true,
      canExecuteNow: false,
    }),
  });
}

export function buildApexOsAffectiveStateSummary(value = {}, options = {}) {
  const state = value?.metadata ? value : classifyApexOsAffectiveState(value?.text || "", options);
  const signalIds = Array.isArray(state.signalIds) ? state.signalIds : state.metadata?.signalIds || [];
  return Object.freeze({
    mode: normalizeApexOsAffectiveMode(state.mode),
    tone: normalizeApexOsAffectiveTone(state.tone),
    urgency: normalizeApexOsAffectiveLevel(state.urgency),
    energy: normalizeApexOsAffectiveLevel(state.energy),
    frustration: normalizeApexOsAffectiveLevel(state.frustration),
    focus: normalizeApexOsAffectiveFocus(state.focus),
    responseStyle: normalizeApexOsResponseStyle(state.responseStyle),
    confidence: Math.max(0, Math.min(100, Math.round(Number(state.confidence) || 0))),
    signalIds: unique(signalIds).slice(0, 14),
    signalCount: unique(signalIds).length,
    safeGuidance: text(state.safeGuidance || guidanceForState(state), SUMMARY_LIMIT),
    diagnostic: false,
    clinical: false,
    storesRawText: false,
    storesPsychProfile: false,
    safeToUseAsContext: true,
    safeToStoreDurably: false,
    requiresMemoryReview: true,
    operatorOnly: true,
    canExecuteNow: false,
    safeSummary: text(state.safeSummary || `Affective state: mode=${state.mode || APEX_OS_AFFECTIVE_MODE.STEADY}; diagnosis=false; durableProfile=false; canExecuteNow=false.`, SUMMARY_LIMIT),
  });
}
