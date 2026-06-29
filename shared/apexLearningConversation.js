import {
  detectApexOsMemorySafetyIssues,
  normalizeApexOsMemory,
  redactApexOsMemoryText,
} from "./apexOsMemory.js";

export const APEX_LEARNING_CONVERSATION_SOURCE_TYPE = "apex-personal-learning-conversation";

export const APEX_LEARNING_CONVERSATION_INTENT = Object.freeze({
  NONE: "none",
  START: "learning-start",
  LEARN_STATEMENT: "learning-save",
  QUERY: "learning-query",
  STOP: "learning-stop",
  UPDATE: "learning-update",
  FORGET: "learning-forget",
});

const TITLE_LIMIT = 96;
const BODY_LIMIT = 700;

function text(value = "", limit = 1000) {
  return String(value ?? "").replace(/\s+\n/g, "\n").replace(/\s+/g, " ").trim().slice(0, limit);
}

function lower(value = "", limit = 1000) {
  return text(value, limit).toLowerCase();
}

function learningSignal(value = "") {
  const normalized = lower(value);
  if (!normalized) return false;
  return /\b(learn from this|learn this|learn from what i'?m about to say|remember what i'?m about to say|remember this about me|remember this|this is important|save this as memory|that'?s how i want you to act|that is how i want you to act|don'?t do that again|do not do that again|never do that again)\b/i.test(normalized);
}

function learningQuery(value = "") {
  return /\b(what did you learn|what have you learned|what do you remember about me|what do you know about me|what have you saved|what did apex learn)\b/i.test(lower(value));
}

function learningStop(value = "") {
  return /\b(stop learning|stop learning mode|done learning|that'?s enough learning|exit learning mode)\b/i.test(lower(value));
}

function learningUpdate(value = "") {
  return /\b(update that memory|update what you learned|change that memory|correct that memory|replace that memory)\b/i.test(lower(value));
}

function learningForget(value = "") {
  return /\b(forget that|forget this|delete that memory|remove that memory|don'?t remember that)\b/i.test(lower(value));
}

export function classifyApexLearningConversationTurn({ text: rawText = "", learningMode = false } = {}) {
  const normalizedText = text(rawText, 1800);
  if (!normalizedText) {
    return { intent: APEX_LEARNING_CONVERSATION_INTENT.NONE, learningMode: Boolean(learningMode), statement: "" };
  }
  if (learningQuery(normalizedText)) {
    return { intent: APEX_LEARNING_CONVERSATION_INTENT.QUERY, learningMode: Boolean(learningMode), statement: normalizedText };
  }
  if (learningStop(normalizedText)) {
    return { intent: APEX_LEARNING_CONVERSATION_INTENT.STOP, learningMode: false, statement: "" };
  }
  if (learningForget(normalizedText)) {
    return { intent: APEX_LEARNING_CONVERSATION_INTENT.FORGET, learningMode: Boolean(learningMode), statement: normalizedText };
  }
  if (learningUpdate(normalizedText)) {
    return { intent: APEX_LEARNING_CONVERSATION_INTENT.UPDATE, learningMode: Boolean(learningMode), statement: normalizedText };
  }
  if (learningSignal(normalizedText)) {
    const futureLearningCue = /\b(i want you to learn from what i'?m about to say|learn from what i'?m about to say|remember what i'?m about to say)\b[\s.!?]*$/i.test(normalizedText);
    const cleaned = normalizedText
      .replace(/\b(apex,?\s*)/i, "")
      .replace(/^[,\s]+/, "")
      .replace(/\b(i want you to learn from what i'?m about to say|learn from what i'?m about to say|learn from this|learn this|remember what i'?m about to say|remember this about me|remember this|this is important|save this as memory)\b[:\s-]*/i, "")
      .trim();
    return {
      intent: cleaned && !futureLearningCue ? APEX_LEARNING_CONVERSATION_INTENT.LEARN_STATEMENT : APEX_LEARNING_CONVERSATION_INTENT.START,
      learningMode: true,
      statement: cleaned,
    };
  }
  if (learningMode) {
    return {
      intent: APEX_LEARNING_CONVERSATION_INTENT.LEARN_STATEMENT,
      learningMode: true,
      statement: normalizedText,
    };
  }
  return { intent: APEX_LEARNING_CONVERSATION_INTENT.NONE, learningMode: false, statement: normalizedText };
}

function inferCategory(statement = "") {
  const normalized = lower(statement, 1800);
  if (/\b(don'?t|do not|never|again|avoid|stop doing|shouldn'?t|should not)\b/i.test(normalized)) return "do-not-do";
  if (/\b(tone|style|answer|respond|talk|speak|personality|act|operator|short|direct|warm|calm|confidence|emotionally intelligent)\b/i.test(normalized)) return "assistant-preference";
  if (/\b(apex hq|apex os|apex home|apex|app|build|builder|self-fix|screen|local voice|ollama|qwen|jarvis)\b/i.test(normalized)) return "apex-project";
  if (/\b(priority|focus|today|tonight|next|urgent|important|handle first)\b/i.test(normalized)) return "active-priority";
  if (/\b(business|growth|lead|customer|revenue|sale|estimate|proposal|contractor)\b/i.test(normalized)) return "john-business";
  if (/\b(routine|morning|evening|daily|habit|schedule|energy|sleep|workout)\b/i.test(normalized)) return "life-routine";
  if (/\b(goal|target|north star|objective|plan)\b/i.test(normalized)) return "business-goal";
  if (/\b(idea|maybe|someday|save this idea)\b/i.test(normalized)) return "saved-idea";
  if (/\b(mike|person|people|family|friend|team|customer)\b/i.test(normalized)) return "people-context";
  return "john-personal";
}

function titleForCategory(category = "john-personal", statement = "") {
  const cleaned = text(statement, TITLE_LIMIT);
  const firstPhrase = cleaned.split(/[.!?;]/)[0]?.trim() || cleaned;
  const label = {
    "do-not-do": "Do-not-do rule",
    "assistant-preference": "Assistant preference",
    "apex-project": "Apex project memory",
    "active-priority": "Active priority",
    "john-business": "John business memory",
    "life-routine": "Life routine",
    "business-goal": "Business goal",
    "saved-idea": "Saved idea",
    "people-context": "People context",
    "john-personal": "John personal memory",
  }[category] || "John personal memory";
  return text(firstPhrase ? `${label}: ${firstPhrase}` : label, TITLE_LIMIT);
}

function compactStatement(statement = "") {
  const cleaned = redactApexOsMemoryText(statement, BODY_LIMIT);
  return cleaned.replace(/\b(apex,?\s*)/i, "").trim();
}

export function buildApexLearningMemoryDraft({
  text: rawText = "",
  sourceLabel = "Apex learning conversation",
  now = new Date().toISOString(),
} = {}) {
  const statement = compactStatement(rawText);
  const safetyIssues = detectApexOsMemorySafetyIssues(rawText);
  if (!statement) {
    return {
      ok: false,
      status: "blocked",
      blocked: true,
      reason: "Nothing durable was stated yet.",
      safetyIssues: [],
      memoryDraft: null,
    };
  }
  if (safetyIssues.length) {
    return {
      ok: false,
      status: "blocked",
      blocked: true,
      reason: safetyIssues.join(" "),
      safetyIssues,
      memoryDraft: null,
    };
  }
  const category = inferCategory(statement);
  const title = titleForCategory(category, statement);
  const memoryDraft = {
    title,
    body: statement,
    category,
    type: category,
    sourceType: APEX_LEARNING_CONVERSATION_SOURCE_TYPE,
    sourceLabel,
    status: "approved",
    confidence: 0.72,
    reviewNote: `Learned conversationally on ${now}. Compact private memory only; no external action was executed.`,
  };
  return {
    ok: true,
    status: "ready",
    blocked: false,
    reason: "",
    safetyIssues: [],
    memoryDraft,
    summary: `${title}: ${statement}`,
  };
}

function approvedLearningRows(memoryRows = []) {
  const memory = normalizeApexOsMemory(memoryRows);
  return memory
    .filter((entry) => entry.status === "approved")
    .filter((entry) => String(entry.sourceType || "").toLowerCase() === APEX_LEARNING_CONVERSATION_SOURCE_TYPE)
    .slice()
    .sort((left, right) => String(right.updatedAt || right.createdAt || "").localeCompare(String(left.updatedAt || left.createdAt || "")));
}

export function summarizeApexLearningMemory(memoryRows = [], { limit = 5 } = {}) {
  const rows = approvedLearningRows(memoryRows).slice(0, Math.max(1, limit));
  if (!rows.length) {
    return {
      count: 0,
      rows: [],
      answer: "I have not saved a learning-conversation memory yet. Tell me, “Apex, I want you to learn from what I’m about to say,” and I’ll listen for durable signal.",
    };
  }
  const formatted = rows
    .map((entry) => `${text(entry.title || entry.category || "Memory", 90)}: ${text(entry.body || entry.detail || "", 180)}`)
    .filter(Boolean);
  return {
    count: rows.length,
    rows,
    answer: `Here is what I learned from our private learning conversations: ${formatted.join(" ")}.`,
  };
}

export function buildApexLearningConversationResponse({
  text: rawText = "",
  learningMode = false,
  memoryRows = [],
  now = new Date().toISOString(),
} = {}) {
  const classified = classifyApexLearningConversationTurn({ text: rawText, learningMode });
  if (classified.intent === APEX_LEARNING_CONVERSATION_INTENT.NONE) {
    return { handled: false, intent: classified.intent, learningMode: Boolean(learningMode) };
  }
  if (classified.intent === APEX_LEARNING_CONVERSATION_INTENT.START) {
    return {
      handled: true,
      intent: classified.intent,
      learningMode: true,
      answer: "I’m listening. Say it naturally, and I’ll extract the durable part, keep it compact, and save it only if it is safe private memory.",
      sourceLabels: ["Apex Learning Conversation", "Private Memory"],
      notice: "Apex learning conversation is listening.",
    };
  }
  if (classified.intent === APEX_LEARNING_CONVERSATION_INTENT.STOP) {
    return {
      handled: true,
      intent: classified.intent,
      learningMode: false,
      answer: "Learning mode is off. I’ll keep listening normally.",
      sourceLabels: ["Apex Learning Conversation"],
      notice: "Apex stopped learning mode.",
    };
  }
  if (classified.intent === APEX_LEARNING_CONVERSATION_INTENT.QUERY) {
    const summary = summarizeApexLearningMemory(memoryRows);
    return {
      handled: true,
      intent: classified.intent,
      learningMode: Boolean(learningMode),
      answer: summary.answer,
      learningSummary: summary,
      sourceLabels: ["Apex Learning Conversation", "Private Memory"],
      notice: "Apex summarized learned memories.",
    };
  }
  if (classified.intent === APEX_LEARNING_CONVERSATION_INTENT.FORGET) {
    return {
      handled: true,
      intent: classified.intent,
      learningMode: Boolean(learningMode),
      answer: "I can help clean that up, but I will not silently delete memory from this voice turn. Tell me exactly which memory to archive, and I’ll use the existing private memory review path.",
      sourceLabels: ["Apex Learning Conversation", "Memory Safety"],
      notice: "Apex did not delete memory.",
    };
  }
  if (classified.intent === APEX_LEARNING_CONVERSATION_INTENT.UPDATE) {
    return {
      handled: true,
      intent: classified.intent,
      learningMode: Boolean(learningMode),
      answer: "Tell me the replacement plainly. I’ll save the corrected version as compact private memory if it passes safety checks, without deleting anything silently.",
      sourceLabels: ["Apex Learning Conversation", "Memory Safety"],
      notice: "Apex is waiting for the corrected memory.",
    };
  }
  const draft = buildApexLearningMemoryDraft({
    text: classified.statement || rawText,
    sourceLabel: "Apex learning conversation",
    now,
  });
  if (!draft.ok) {
    return {
      handled: true,
      intent: classified.intent,
      learningMode: true,
      answer: `I caught that, but I did not save it. ${draft.reason}`,
      learningMemoryDraft: null,
      learningMemoryBlocked: true,
      sourceLabels: ["Apex Learning Conversation", "Memory Safety"],
      notice: "Apex blocked unsafe learning memory.",
    };
  }
  return {
    handled: true,
    intent: classified.intent,
    learningMode: false,
    answer: "I caught the durable part. I’m saving the compact private memory now.",
    learningMemoryDraft: draft.memoryDraft,
    learningMemoryPreview: draft.summary,
    sourceLabels: ["Apex Learning Conversation", "Private Memory"],
    notice: "Apex prepared a safe learning memory.",
  };
}
