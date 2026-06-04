export const APEX_OS_VOICE_SPEECH_OPENAI_URL = "https://api.openai.com/v1/audio/speech";
export const APEX_OS_VOICE_TRANSCRIPTION_OPENAI_URL = "https://api.openai.com/v1/audio/transcriptions";
export const APEX_OS_VOICE_SPEECH_MODEL = "gpt-4o-mini-tts";
export const APEX_OS_VOICE_TRANSCRIPTION_MODEL = "gpt-4o-mini-transcribe";

export const APEX_OS_VOICE_MAX_SPEECH_TEXT_LENGTH = 1800;
export const APEX_OS_VOICE_MAX_TRANSCRIPT_LENGTH = 1000;
export const APEX_OS_VOICE_MAX_AUDIO_BYTES = 10 * 1024 * 1024;

export const APEX_OS_VOICE_OPTIONS = Object.freeze([
  "alloy",
  "ash",
  "ballad",
  "coral",
  "echo",
  "fable",
  "onyx",
  "nova",
  "sage",
  "shimmer",
  "verse",
  "marin",
  "cedar",
]);

export const APEX_OS_VOICE_AUDIO_MIME_TYPES = Object.freeze([
  "audio/aac",
  "audio/flac",
  "audio/m4a",
  "audio/mp3",
  "audio/mp4",
  "audio/mpeg",
  "audio/mpga",
  "audio/ogg",
  "audio/opus",
  "audio/wav",
  "audio/webm",
]);

const COMMANDS = Object.freeze([
  {
    id: "needs-approval",
    label: "What needs my approval?",
    status: "Review approvals",
    tone: "green",
    patterns: [/\bwhat(?:'s| is)? needs? my approval\b/i, /\bwhat do i need to approve\b/i, /\bapproval queue\b/i],
    askQuestion: "What needs my approval in Apex OS right now? Summarize approval packets, risky locks, and next safe review steps. Do not execute anything.",
  },
  {
    id: "pause-agents",
    label: "Pause agents.",
    status: "Approval review required",
    tone: "amber",
    risky: true,
    patterns: [/\bpause agents?\b/i, /\bstop agents?\b/i, /\bhold agent work\b/i],
    askQuestion: "Review a draft-only request to pause agents. Show which agent controls would need approval, but do not pause, run, or execute any agent work.",
  },
  {
    id: "summarize-today",
    label: "Summarize today.",
    status: "Briefing request",
    tone: "green",
    patterns: [/\bsummarize today\b/i, /\btoday'?s summary\b/i, /\bdaily brief(?:ing)?\b/i],
    askQuestion: "Summarize today from Apex OS daily briefing, monitoring, blockers, agents, approvals, and business queues. Keep it read-only.",
  },
  {
    id: "show-blockers",
    label: "Show blockers.",
    status: "Blocker review",
    tone: "green",
    patterns: [/\bshow blockers?\b/i, /\bwhat(?:'s| is)? blocking\b/i, /\blaunch blockers?\b/i],
    askQuestion: "Show the current Apex OS blockers and the next safe manual step for each blocker. Do not execute anything.",
  },
  {
    id: "save-decision",
    label: "Save this as a decision.",
    status: "Draft decision only",
    tone: "amber",
    risky: true,
    patterns: [/\bsave (?:this|that) as (?:a )?decision\b/i, /\bremember this decision\b/i, /\bmake this memory\b/i],
    askQuestion: "Prepare a suggested decision-memory draft from the confirmed voice transcript. Do not approve trusted memory automatically.",
  },
  {
    id: "start-next-safe-task",
    label: "Start the next safe task.",
    status: "Task review required",
    tone: "amber",
    risky: true,
    patterns: [/\bstart the next safe task\b/i, /\bstart next task\b/i, /\bdo the next safe thing\b/i],
    askQuestion: "Identify the next safe Apex OS task and prepare a review-only plan. Do not start agents, run code, deploy, send, spend, or mutate production.",
  },
]);

function text(value = "", limit = 1000) {
  return String(value ?? "").replace(/\s+\n/g, "\n").replace(/\s+/g, " ").trim().slice(0, limit);
}

function lower(value = "") {
  return text(value, APEX_OS_VOICE_MAX_TRANSCRIPT_LENGTH).toLowerCase();
}

function hasRiskyExternalAction(value = "") {
  const normalized = lower(value);
  return /\b(deploy|rollback|production|schema|auth|session|provider|api key|openai|email|sms|text|send|publish|ad spend|ads?|payment|billing|invoice|charge|delete|remove|customer-visible|customer facing)\b/i.test(normalized);
}

export function sanitizeApexOsVoiceSpeechText(value = "") {
  return text(value, APEX_OS_VOICE_MAX_SPEECH_TEXT_LENGTH);
}

export function detectApexOsVoiceCommand(transcript = "") {
  const normalized = text(transcript, APEX_OS_VOICE_MAX_TRANSCRIPT_LENGTH);
  const matched = COMMANDS.find((command) => command.patterns.some((pattern) => pattern.test(normalized)));
  if (matched) {
    return {
      id: matched.id,
      label: matched.label,
      status: matched.status,
      tone: matched.tone,
      risky: Boolean(matched.risky),
      askQuestion: matched.askQuestion,
    };
  }

  return {
    id: "ask-apex",
    label: "Ask Apex.",
    status: "Source-backed question",
    tone: hasRiskyExternalAction(normalized) ? "amber" : "blue",
    risky: hasRiskyExternalAction(normalized),
    askQuestion: normalized
      ? `${normalized} Keep the answer source-backed and do not execute any external, irreversible, customer-visible, production, provider, send, spend, billing, deletion, schema, auth, or session action.`
      : "",
  };
}

export function buildApexOsVoiceCommandReview(transcript = "") {
  const normalizedTranscript = text(transcript, APEX_OS_VOICE_MAX_TRANSCRIPT_LENGTH);
  const command = detectApexOsVoiceCommand(normalizedTranscript);
  const approvalRequired = Boolean(command.risky || hasRiskyExternalAction(normalizedTranscript));
  const reasons = [
    "Transcript confirmation is required before Ask Apex can use the command.",
    "Voice commands cannot execute actions directly.",
  ];
  if (approvalRequired) {
    reasons.push("Risky voice intent requires a visible approval packet before any later action.");
  }

  return {
    transcript: normalizedTranscript,
    commandId: command.id,
    label: command.label,
    status: command.status,
    tone: approvalRequired ? "amber" : command.tone,
    askQuestion: command.askQuestion,
    approvalRequired,
    confirmationRequired: true,
    executionLocked: true,
    canExecute: false,
    audioStored: false,
    reasons,
  };
}

export function buildApexOsVoiceSpeechRequest({ text: inputText = "", voice = "alloy" } = {}) {
  const sanitizedText = sanitizeApexOsVoiceSpeechText(inputText);
  const normalizedVoice = APEX_OS_VOICE_OPTIONS.includes(String(voice || "").trim().toLowerCase())
    ? String(voice || "").trim().toLowerCase()
    : "alloy";
  return {
    model: APEX_OS_VOICE_SPEECH_MODEL,
    voice: normalizedVoice,
    input: sanitizedText,
    instructions: "Speak as Apex OS: calm, concise, practical, and clearly AI-generated. Do not sound like a human caller.",
    response_format: "mp3",
  };
}

export function parseApexOsVoiceTranscriptionPayload(payload = {}) {
  return text(payload?.text || payload?.transcript || "", APEX_OS_VOICE_MAX_TRANSCRIPT_LENGTH);
}

export function parseApexOsVoiceAudioDataUrl(value = "") {
  const input = String(value || "").trim();
  const match = input.match(/^data:([^,]+),([a-z0-9+/=\s]+)$/i);
  if (!match) {
    return {
      ok: false,
      error: "Voice audio must be a base64 data URL.",
    };
  }
  const mediaTypeParts = match[1]
    .split(";")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
  const mimeType = mediaTypeParts[0] || "";
  const isBase64Encoded = mediaTypeParts.slice(1).some((part) => part === "base64");
  if (!mimeType || !isBase64Encoded) {
    return {
      ok: false,
      error: "Voice audio must be a base64 data URL.",
    };
  }
  const base64 = match[2].replace(/\s+/g, "");
  if (!APEX_OS_VOICE_AUDIO_MIME_TYPES.includes(mimeType)) {
    return {
      ok: false,
      error: "Voice audio type is not supported.",
      mimeType,
    };
  }
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  const byteLength = Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
  if (byteLength > APEX_OS_VOICE_MAX_AUDIO_BYTES) {
    return {
      ok: false,
      error: "Voice audio is too large.",
      mimeType,
      byteLength,
    };
  }
  const extension = mimeType.includes("webm")
    ? "webm"
    : mimeType.includes("wav")
      ? "wav"
      : mimeType.includes("mp4") || mimeType.includes("m4a")
        ? "m4a"
        : mimeType.includes("ogg") || mimeType.includes("opus")
          ? "ogg"
          : "mp3";
  return {
    ok: true,
    mimeType,
    base64,
    byteLength,
    extension,
  };
}
