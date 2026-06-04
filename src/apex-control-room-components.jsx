import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.mjs?url";

import {
  askApexOs,
  createApexOsAgentControlRequest,
  createApexOsAutonomyRun,
  createApexOsMemory,
  createApexOsApprovalPacket,
  createApexOsExecutionHandoff,
  draftApexOsAutonomyRunInternalWork,
  getApexOsAgentControl,
  getApexOsAutonomyRuns,
  getApexOsBuildAwareness,
  getApexOsMemory,
  getApexOsApprovalPackets,
  getApexOsDailyBriefing,
  getApexOsExecutionHandoffs,
  getApexOsKnowledgeIntelligence,
  saveApexOsDailyBriefingSnapshot,
  speakApexOsVoice,
  transcribeApexOsVoice,
  updateApexOsAgentControlRequest,
  updateApexOsAutonomyRun,
  updateApexOsMemory,
  updateApexOsApprovalPacket,
  updateApexOsExecutionHandoff,
} from "./api";
import { Badge, Button, Card, Icon, PageHeader, SectionHeader } from "./app-shell-components";
import { buildReleaseDesk, deriveApexControlRoomState } from "./apex-control-room-utils";
import {
  buildApexOsAskApprovalPacketDraft,
  buildApexOsAskDecisionDraft,
  buildApexOsAskExecutionHandoffDraft,
} from "../shared/apexOsAsk.js";
import { redactApexOsMemoryText } from "../shared/apexOsMemory.js";
import { buildApexOsVoiceCommandReview } from "../shared/apexOsVoice.js";
import {
  APEX_OS_KNOWLEDGE_DATE_RANGE_VALUES,
  buildApexOsKnowledgeIntelligence,
} from "../shared/apexOsKnowledgeIntelligence.js";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

function ToneBadge({ children, tone = "slate" }) {
  return <Badge tone={tone}>{children}</Badge>;
}

function stopBrowserVoice(audioRef) {
  if (audioRef?.current) {
    if (typeof audioRef.current.pause === "function") {
      audioRef.current.pause();
    }
    if (typeof audioRef.current.stop === "function") {
      try {
        audioRef.current.stop(0);
      } catch {
        // Already stopped.
      }
    }
    if (typeof audioRef.current.disconnect === "function") {
      try {
        audioRef.current.disconnect();
      } catch {
        // Already disconnected.
      }
    }
    if ("currentTime" in audioRef.current) {
      audioRef.current.currentTime = 0;
    }
    if (audioRef.current.objectUrl && typeof URL !== "undefined") {
      URL.revokeObjectURL(audioRef.current.objectUrl);
    }
    audioRef.current = null;
  }
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

function playSilentUnlockBuffer(audioContext) {
  if (!audioContext || typeof audioContext.createBufferSource !== "function" || typeof audioContext.createBuffer !== "function") return;
  const source = audioContext.createBufferSource();
  source.buffer = audioContext.createBuffer(1, 1, Math.max(1, audioContext.sampleRate || 44100));
  if (typeof audioContext.createGain === "function") {
    const gain = audioContext.createGain();
    gain.gain.value = 0.00001;
    source.connect(gain);
    gain.connect(audioContext.destination);
  } else {
    source.connect(audioContext.destination);
  }
  source.start(0);
}

function unlockBrowserAudio(unlockedRef) {
  if (typeof window === "undefined") return null;
  if (unlockedRef?.current && typeof unlockedRef.current.resume === "function") {
    if (unlockedRef.current.state === "suspended") {
      unlockedRef.current.resume().catch(() => {});
    }
    return unlockedRef.current;
  }
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextCtor) return null;
  try {
    const audioContext = new AudioContextCtor();
    if (audioContext.state === "suspended") {
      audioContext.resume().catch(() => {});
    }
    playSilentUnlockBuffer(audioContext);
    unlockedRef.current = audioContext;
    return audioContext;
  } catch {
    unlockedRef.current = false;
    return null;
  }
}

function closeUnlockedBrowserAudio(unlockedRef) {
  const unlockedAudioContext = unlockedRef?.current;
  if (unlockedAudioContext && typeof unlockedAudioContext.close === "function") {
    unlockedAudioContext.close().catch(() => {});
  }
  if (unlockedRef) unlockedRef.current = false;
}

function apexVoiceBytesFromBase64(audioBase64 = "") {
  if (typeof window === "undefined" || typeof window.atob !== "function") return null;
  const binary = window.atob(String(audioBase64 || "").replace(/\s+/g, ""));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function decodeApexVoiceAudioBuffer(audioContext, audioBytes) {
  return new Promise((resolve, reject) => {
    if (!audioContext || !audioBytes?.byteLength || typeof audioContext.decodeAudioData !== "function") {
      reject(new Error("Audio context cannot decode Apex voice audio."));
      return;
    }
    let settled = false;
    const finish = (audioBuffer) => {
      if (settled) return;
      settled = true;
      resolve(audioBuffer);
    };
    const fail = (error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };
    const decodeResult = audioContext.decodeAudioData(audioBytes.buffer.slice(0), finish, fail);
    if (decodeResult && typeof decodeResult.then === "function") {
      decodeResult.then(finish).catch(fail);
    }
  });
}

async function playApexVoiceAudio({ audioBase64 = "", contentType = "audio/mpeg", audioRef, unlockedRef, onEnd, onPlaybackError } = {}) {
  if (!audioBase64 || typeof window === "undefined") return "";
  const audioBytes = apexVoiceBytesFromBase64(audioBase64);
  if (!audioBytes?.byteLength) return "";

  const audioContext = unlockBrowserAudio(unlockedRef);
  if (audioContext && typeof audioContext.createBufferSource === "function" && typeof audioContext.decodeAudioData === "function") {
    try {
      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }
      const audioBuffer = await decodeApexVoiceAudioBuffer(audioContext, audioBytes);
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.onended = () => {
        if (audioRef?.current === source) audioRef.current = null;
        onEnd?.();
      };
      source.connect(audioContext.destination);
      if (audioRef) audioRef.current = source;
      source.start(0);
      return "web-audio";
    } catch {
      if (audioRef) audioRef.current = null;
    }
  }

  try {
    const audioBlob = new Blob([audioBytes], { type: contentType || "audio/mpeg" });
    const objectUrl = typeof URL !== "undefined" && typeof URL.createObjectURL === "function"
      ? URL.createObjectURL(audioBlob)
      : "";
    const audio = new Audio(objectUrl || `data:${contentType || "audio/mpeg"};base64,${audioBase64}`);
    audio.preload = "auto";
    audio.playsInline = true;
    audio.volume = 1;
    audio.objectUrl = objectUrl;
    if (audioRef) audioRef.current = audio;
    audio.onended = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      if (audioRef?.current === audio) audioRef.current = null;
      onEnd?.();
    };
    audio.onerror = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      if (audioRef?.current === audio) audioRef.current = null;
      onPlaybackError?.();
    };
    await audio.play();
    return "html-audio";
  } catch {
    if (audioRef) audioRef.current = null;
    return "";
  }
}

function speakWithBrowserVoice(text, { onEnd, onError, rate = 0.98, pitch = 1, voiceHint = "" } = {}) {
  if (typeof window === "undefined" || !window.speechSynthesis || typeof SpeechSynthesisUtterance === "undefined") {
    return false;
  }
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = rate;
  utterance.pitch = pitch;
  utterance.volume = 1;
  const voices = typeof window.speechSynthesis.getVoices === "function" ? window.speechSynthesis.getVoices() : [];
  const normalizedHint = String(voiceHint || "").toLowerCase();
  const matchedVoice = normalizedHint
    ? voices.find((voice) => String(voice.name || "").toLowerCase().includes(normalizedHint))
    : null;
  if (matchedVoice) utterance.voice = matchedVoice;
  utterance.onend = () => onEnd?.();
  utterance.onerror = () => onError?.();
  window.speechSynthesis.cancel();
  if (typeof window.speechSynthesis.resume === "function") {
    window.speechSynthesis.resume();
  }
  window.speechSynthesis.speak(utterance);
  return true;
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Voice recording could not be read."));
    reader.readAsDataURL(blob);
  });
}

function getApexCockpitSpeechRecognitionCtor() {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function KpiTile({ item }) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-[0_14px_34px_-30px_rgba(7,17,31,0.5)]">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <p className="min-w-0 break-words text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">{item.label}</p>
        <ToneBadge tone={item.tone}>{item.value}</ToneBadge>
      </div>
      <p className="mt-3 min-w-0 break-words text-sm font-bold leading-5 text-slate-600">{item.detail}</p>
    </div>
  );
}

function StatusRow({ item }) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white px-4 py-3">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="break-words text-sm font-black text-slate-950">{item.title}</p>
          <p className="mt-1 break-words text-xs font-bold leading-5 text-slate-600">{item.detail}</p>
          {item.sourceLabel || item.source || item.confidence ? (
            <p className="mt-2 break-words text-[11px] font-black text-slate-500">
              {item.sourceLabel || item.source ? `Source: ${item.sourceLabel || item.source}` : "Source: Apex OS derived state"}
              {item.confidence ? ` | Confidence: ${item.confidence}%` : ""}
              {item.readOnly ? " | Read-only" : ""}
            </p>
          ) : null}
        </div>
        <ToneBadge tone={item.tone}>{item.status}</ToneBadge>
      </div>
    </div>
  );
}

function ApprovalRow({ item }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 border-b border-slate-100 py-2 last:border-b-0">
      <p className="min-w-0 break-words text-sm font-black text-slate-800">{item.label}</p>
      <span className="max-w-[52%] rounded-lg bg-amber-50 px-2.5 py-1 text-right text-[11px] font-black leading-4 text-amber-800 ring-1 ring-amber-200">{item.status}</span>
    </div>
  );
}

function EvidenceRow({ item }) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="break-words text-sm font-black text-slate-950">{item.title}</p>
      {item.meta ? <p className="mt-1 break-words text-xs font-bold text-slate-500">{item.meta}</p> : null}
    </div>
  );
}

function MemoryRow({ item }) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white px-4 py-3">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="break-words text-[10px] font-black uppercase tracking-[0.16em] text-orange-700">{item.category || "Operating rule"}</p>
          <p className="mt-1 break-words text-sm font-black text-slate-950">{item.title}</p>
          <p className="mt-1 break-words text-xs font-bold leading-5 text-slate-600">{item.detail}</p>
          {item.source || item.sourceLabel ? <p className="mt-2 break-words text-[11px] font-black text-slate-500">Source: {item.sourceLabel || item.source}</p> : null}
          {item.recordedAt ? <p className="mt-1 break-words text-[11px] font-black text-slate-500">Recorded: {item.recordedAt}</p> : null}
          {item.reviewNote ? <p className="mt-1 break-words text-[11px] font-black text-slate-500">Review: {item.reviewNote}</p> : null}
        </div>
        <ToneBadge tone={item.tone}>{item.status}</ToneBadge>
      </div>
    </div>
  );
}

function EmptyPanel({ children }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm font-bold text-slate-600">
      {children}
    </div>
  );
}

function AskApexAnswerPanel({ response, error }) {
  if (error) {
    return (
      <StatusRow item={{
        id: "ask-apex-error",
        title: "Ask Apex response",
        status: "Needs attention",
        detail: error,
        tone: "red",
      }} />
    );
  }
  if (!response?.answer) return null;

  const answer = response.answer;
  const sourceLabels = Array.isArray(answer.sourceLabels) ? answer.sourceLabels : [];
  const approvalWarnings = Array.isArray(answer.approvalWarnings) ? answer.approvalWarnings : [];
  const evidenceRows = Array.isArray(response.evidenceUsed) ? response.evidenceUsed : [];

  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="break-words text-sm font-black text-slate-950">Apex answer</p>
          <p className="mt-1 break-words text-sm font-bold leading-6 text-slate-700">{answer.answer}</p>
        </div>
        <ToneBadge tone={answer.ok === false ? "amber" : "green"}>{answer.mode || "source-backed"}</ToneBadge>
      </div>

      <div className="mt-4 grid min-w-0 gap-3 lg:grid-cols-2">
        <StatusRow item={{
          id: "ask-next-action",
          title: "Next action",
          status: answer.nextAction || "Review",
          detail: answer.providerConfigured ? "Provider was configured server-side for this answer, with local fallback if the provider failed." : "Local source-backed fallback answered because no server-side provider key is configured here.",
          tone: approvalWarnings.length ? "amber" : "green",
        }} />
        <StatusRow item={{
          id: "ask-context-count",
          title: "Evidence count",
          status: `${response.context?.sourceCount || sourceLabels.length || 0} sources`,
          detail: `${response.context?.memoryCount || 0} approved memory rows and ${response.context?.approvalWarningCount || approvalWarnings.length || 0} approval warnings were returned by the private endpoint.`,
          tone: "blue",
        }} />
      </div>

      <div className="mt-4 grid min-w-0 gap-3 lg:grid-cols-2">
        <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Sources</p>
          <div className="mt-2 flex min-w-0 flex-wrap gap-2">
            {sourceLabels.length ? sourceLabels.map((label) => <ToneBadge key={label} tone="slate">{label}</ToneBadge>) : <ToneBadge tone="amber">No source labels</ToneBadge>}
          </div>
        </div>
        <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Approval warnings</p>
          <div className="mt-2 grid min-w-0 gap-2">
            {approvalWarnings.length ? approvalWarnings.map((warning) => (
              <p key={warning} className="break-words rounded-lg bg-amber-50 px-3 py-2 text-xs font-black leading-5 text-amber-800 ring-1 ring-amber-200">{warning}</p>
            )) : <p className="text-xs font-black text-emerald-700">No risky action was requested.</p>}
          </div>
        </div>
      </div>

      <details className="mt-4 min-w-0 rounded-xl border border-slate-200 bg-white p-3">
        <summary className="cursor-pointer break-words text-xs font-black uppercase tracking-[0.16em] text-slate-500">Evidence used</summary>
        <div className="mt-3 grid min-w-0 gap-2">
          {evidenceRows.length ? evidenceRows.map((row) => (
            <StatusRow key={row.id || row.sourceLabel} item={{
              id: row.id,
              title: `#${row.rank || 1} ${row.title || row.sourceLabel}`,
              status: response.context?.contextScope || "all",
              detail: `${row.sourceLabel || "Source"}${row.sourceUri ? ` | ${row.sourceUri}` : ""}`,
              tone: "blue",
            }} />
          )) : <EmptyPanel>No evidence rows were returned for this answer.</EmptyPanel>}
        </div>
      </details>
    </div>
  );
}

function AskApexPanel({ state, sessionToken, question, setQuestion }) {
  const [contextScope, setContextScope] = useState("all");
  const [response, setResponse] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionNotice, setActionNotice] = useState("");
  const [voiceNotice, setVoiceNotice] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [draftingAction, setDraftingAction] = useState("");
  const [draftedActions, setDraftedActions] = useState({});
  const [askedQuestion, setAskedQuestion] = useState("");
  const answerAudioRef = useRef(null);
  const answerAudioUnlockedRef = useRef(false);
  const canAsk = state.canView && Boolean(sessionToken) && question.trim() && !submitting;
  const canDraftFromAnswer = state.canView && Boolean(sessionToken) && Boolean(response?.answer) && !draftingAction;
  const answerText = response?.answer?.answer || "";
  const canSpeakAnswer = state.canView && Boolean(answerText) && !speaking;

  useEffect(() => () => {
    stopBrowserVoice(answerAudioRef);
    closeUnlockedBrowserAudio(answerAudioUnlockedRef);
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!canAsk) return;
    setSubmitting(true);
    setError("");
    setActionNotice("");
    setDraftedActions({});
    try {
      const nextQuestion = question.trim();
      setAskedQuestion(nextQuestion);
      stopBrowserVoice(answerAudioRef);
      setVoiceNotice("");
      const payload = await askApexOs(sessionToken, { question: nextQuestion, contextScope });
      setResponse(payload);
    } catch (requestError) {
      setError(requestError?.message || "Ask Apex could not answer right now.");
    } finally {
      setSubmitting(false);
    }
  }

  async function draftDecision() {
    if (!canDraftFromAnswer) return;
    setDraftingAction("decision");
    setActionNotice("");
    try {
      await createApexOsMemory(sessionToken, buildApexOsAskDecisionDraft({
        question: askedQuestion || question,
        answer: response.answer,
        requestId: response.requestId,
      }));
      setDraftedActions((current) => ({ ...current, decision: true }));
      setActionNotice("Decision draft saved as suggested memory. It is not trusted context until manually approved.");
    } catch (draftError) {
      setActionNotice(draftError?.message || "Decision draft could not be saved right now.");
    } finally {
      setDraftingAction("");
    }
  }

  async function draftTaskPacket() {
    if (!canDraftFromAnswer) return;
    setDraftingAction("task");
    setActionNotice("");
    try {
      await createApexOsExecutionHandoff(sessionToken, buildApexOsAskExecutionHandoffDraft({
        question: askedQuestion || question,
        answer: response.answer,
        requestId: response.requestId,
      }));
      setDraftedActions((current) => ({ ...current, task: true }));
      setActionNotice("Task handoff drafted for manual review. It does not queue or run any work.");
    } catch (draftError) {
      setActionNotice(draftError?.message || "Task handoff could not be drafted right now.");
    } finally {
      setDraftingAction("");
    }
  }

  async function draftApprovalPacket() {
    if (!canDraftFromAnswer) return;
    setDraftingAction("approval");
    setActionNotice("");
    try {
      await createApexOsApprovalPacket(sessionToken, buildApexOsAskApprovalPacketDraft({
        question: askedQuestion || question,
        answer: response.answer,
        requestId: response.requestId,
      }));
      setDraftedActions((current) => ({ ...current, approval: true }));
      setActionNotice("Approval packet drafted for review. Approval and execution remain locked.");
    } catch (draftError) {
      setActionNotice(draftError?.message || "Approval packet could not be drafted right now.");
    } finally {
      setDraftingAction("");
    }
  }

  function stopVoicePlayback() {
    stopBrowserVoice(answerAudioRef);
    setSpeaking(false);
    setVoiceNotice("Voice playback stopped.");
  }

  function speakBrowserFallback(textToSpeak, fallbackMessage = "Apex is speaking with browser voice fallback.") {
    const started = speakWithBrowserVoice(textToSpeak, {
      onEnd: () => {
        setSpeaking(false);
        setVoiceNotice("Voice playback finished.");
      },
      onError: () => {
        setSpeaking(false);
        setVoiceNotice("Browser voice playback could not start.");
      },
    });
    if (!started) {
      setSpeaking(false);
      setVoiceNotice("This browser does not support speech playback here.");
      return;
    }
    setVoiceNotice(fallbackMessage);
  }

  async function speakAnswer() {
    if (!canSpeakAnswer) return;
    unlockBrowserAudio(answerAudioUnlockedRef);
    stopBrowserVoice(answerAudioRef);
    setSpeaking(true);
    setVoiceNotice("");
    try {
      const payload = await speakApexOsVoice(sessionToken, {
        text: answerText,
        voice: "alloy",
      });
      if (payload?.audioBase64 && payload?.contentType) {
        const playbackMode = await playApexVoiceAudio({
          audioBase64: payload.audioBase64,
          contentType: payload.contentType,
          audioRef: answerAudioRef,
          unlockedRef: answerAudioUnlockedRef,
          onEnd: () => {
            setSpeaking(false);
            setVoiceNotice("Voice playback finished.");
          },
          onPlaybackError: () => {
            speakBrowserFallback(answerText, "Apex speech audio stopped, so browser voice fallback is speaking.");
          },
        });
        if (playbackMode) {
          setVoiceNotice(payload.aiDisclosure || "Apex OS voice output is AI-generated.");
          return;
        }
        speakBrowserFallback(answerText, "Apex speech audio could not start, so browser voice fallback is speaking.");
        return;
      }
      speakBrowserFallback(payload?.fallbackText || answerText, payload?.providerConfigured ? "Speech provider fallback is active; browser voice is speaking." : "Server speech is not configured; browser voice is speaking.");
    } catch (speechError) {
      speakBrowserFallback(answerText, speechError?.message ? `Speech endpoint unavailable; browser voice is speaking. ${speechError.message}` : "Speech endpoint unavailable; browser voice is speaking.");
    }
  }

  return (
    <div className="grid min-w-0 gap-4">
      <div className="grid min-w-0 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {state.askApexChat.contexts.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setContextScope(item.id)}
            className={`min-w-0 rounded-xl border px-3 py-3 text-left transition ${contextScope === item.id ? "border-orange-300 bg-orange-50" : "border-slate-200 bg-slate-50 hover:border-slate-300"}`}
            title={`${item.title}: ${item.status}`}
          >
            <span className="block break-words text-sm font-black text-slate-950">{item.title}</span>
            <span className="mt-1 block break-words text-xs font-bold leading-5 text-slate-600">{item.detail}</span>
            <span className="mt-2 inline-flex"><ToneBadge tone={contextScope === item.id ? "orange" : item.tone}>{contextScope === item.id ? "Selected" : item.status}</ToneBadge></span>
          </button>
        ))}
      </div>

      <form className="min-w-0 rounded-xl border border-slate-200 bg-white p-3" onSubmit={handleSubmit}>
        <label className="sr-only" htmlFor="ask-apex-input">Ask Apex</label>
        <textarea
          id="ask-apex-input"
          value={question}
          onChange={(event) => {
            setQuestion(event.target.value);
            setError("");
          }}
          maxLength={1000}
          placeholder={state.askApexChat.placeholder}
          className="min-h-28 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold leading-6 text-slate-700 placeholder:text-slate-500"
          disabled={!state.canView || submitting}
        />
        <div className="mt-3 flex min-w-0 flex-wrap gap-2">
          <Button type="submit" disabled={!canAsk} variant="secondary" size="sm">
            <Icon name="spark" /> {submitting ? "Asking Apex..." : "Ask Apex"}
          </Button>
          <Button type="button" disabled variant="secondary" size="sm">
            <Icon name="clipboard" /> Evidence returned
          </Button>
          <Button type="button" disabled variant="secondary" size="sm">
            <Icon name="lock" /> No execution
          </Button>
        </div>
      </form>

      <AskApexAnswerPanel response={response} error={error} />
      {response?.answer ? (
        <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-3">
          <SectionHeader title="Ask Apex Draft Actions" description="Draft-only outputs from this answer. Nothing approves, executes, sends, spends, or deploys." />
          <div className="mt-3 flex min-w-0 flex-wrap gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={draftDecision} disabled={!canDraftFromAnswer || draftedActions.decision}>
              <Icon name="clipboard" /> {draftingAction === "decision" ? "Saving..." : "Save as decision"}
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={draftTaskPacket} disabled={!canDraftFromAnswer || draftedActions.task}>
              <Icon name="spark" /> {draftingAction === "task" ? "Drafting..." : "Create task draft"}
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={draftApprovalPacket} disabled={!canDraftFromAnswer || draftedActions.approval}>
              <Icon name="lock" /> {draftingAction === "approval" ? "Drafting..." : "Needs approval"}
            </Button>
            <Button type="button" disabled variant="secondary" size="sm">
              <Icon name="lock" /> Execute locked
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={speakAnswer} disabled={!canSpeakAnswer}>
              <Icon name="phone" /> {speaking ? "Speaking..." : "Speak answer"}
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={stopVoicePlayback} disabled={!speaking}>
              <Icon name="lock" /> Stop voice
            </Button>
          </div>
          <p className="mt-3 break-words text-xs font-black leading-5 text-slate-500">{voiceNotice || actionNotice || "Decision drafts stay suggested. Task drafts become safe handoffs. Approval drafts stay review-only packets. Voice playback is AI-generated and does not execute commands."}</p>
        </div>
      ) : null}
      <StatusRow item={state.askApexChat.answerPreview} />
    </div>
  );
}

function VoiceTranscriptPanel({ state, sessionToken, onUseTranscript }) {
  const [transcriptDraft, setTranscriptDraft] = useState("");
  const [confirmedTranscript, setConfirmedTranscript] = useState("");
  const [notice, setNotice] = useState("");
  const [commandReview, setCommandReview] = useState(null);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const recorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const streamRef = useRef(null);
  const canConfirm = state.canView && Boolean(transcriptDraft.trim());
  const canUse = state.canView && Boolean(confirmedTranscript.trim());
  const canUseBrowserRecorder = typeof navigator !== "undefined"
    && Boolean(navigator.mediaDevices?.getUserMedia)
    && typeof MediaRecorder !== "undefined";
  const canStartRecording = state.canView && Boolean(sessionToken) && canUseBrowserRecorder && !recording && !transcribing;
  const canToggleRecording = canStartRecording || recording;

  function cleanupRecordingStream() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }

  useEffect(() => () => {
    if (recorderRef.current) {
      recorderRef.current.ondataavailable = null;
      recorderRef.current.onstop = null;
      if (recorderRef.current.state !== "inactive") {
        recorderRef.current.stop();
      }
      recorderRef.current = null;
    }
    cleanupRecordingStream();
  }, []);

  function preferredVoiceMimeType() {
    if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") return "";
    return ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/wav"].find((candidate) => MediaRecorder.isTypeSupported(candidate)) || "";
  }

  async function transcribeRecordedBlob(blob) {
    if (!blob?.size) {
      setNotice("No voice audio was captured. Use the manual transcript box.");
      return;
    }
    setTranscribing(true);
    setNotice("Transcribing voice session audio through the private server endpoint.");
    try {
      const audioDataUrl = await blobToDataUrl(blob);
      const payload = await transcribeApexOsVoice(sessionToken, { audioDataUrl });
      const transcript = payload?.transcript || "";
      const review = payload?.commandReview || buildApexOsVoiceCommandReview(transcript);
      setTranscriptDraft(transcript);
      setCommandReview(review);
      setConfirmedTranscript("");
      setNotice(transcript ? "Transcript returned. Review and confirm it before using Ask Apex." : "No transcript came back. Use the manual transcript box.");
    } catch (error) {
      setNotice(error?.message || "Speech-to-text could not run. Use the manual transcript box.");
    } finally {
      setTranscribing(false);
    }
  }

  async function openVoiceSession() {
    if (!canStartRecording) return;
    setNotice("");
    setCommandReview(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      recordedChunksRef.current = [];
      const mimeType = preferredVoiceMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data?.size) recordedChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        cleanupRecordingStream();
        setRecording(false);
        transcribeRecordedBlob(blob);
      };
      recorder.start();
      setRecording(true);
      setNotice("Voice is open. Speak naturally, then close voice when you are ready for Apex to transcribe it.");
    } catch (error) {
      cleanupRecordingStream();
      setRecording(false);
      setNotice(error?.message || "Microphone permission was not granted. Use the manual transcript box.");
    }
  }

  function closeVoiceSession() {
    if (!recording || !recorderRef.current) return;
    setNotice("Voice closed. Preparing transcript review.");
    recorderRef.current.stop();
  }

  function confirmTranscript() {
    if (!canConfirm) return;
    const review = buildApexOsVoiceCommandReview(transcriptDraft.trim());
    setCommandReview(review);
    setConfirmedTranscript(transcriptDraft.trim());
    setNotice("Transcript confirmed locally. Review it before sending it to Ask Apex.");
  }

  function useTranscript() {
    if (!canUse) return;
    const review = commandReview || buildApexOsVoiceCommandReview(confirmedTranscript.trim());
    onUseTranscript(review.askQuestion || confirmedTranscript.trim());
    setNotice("Confirmed transcript copied into Ask Apex. Press Ask Apex when ready.");
  }

  return (
    <div className="grid min-w-0 gap-4">
      <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div className="flex min-h-44 min-w-0 flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
          <button
            type="button"
            disabled={!canToggleRecording}
            onClick={recording ? closeVoiceSession : openVoiceSession}
            className={`inline-flex h-20 w-20 items-center justify-center rounded-full border shadow-[0_16px_34px_-28px_rgba(7,17,31,0.5)] transition disabled:cursor-not-allowed ${recording ? "border-orange-300 bg-orange-50 text-orange-700" : "border-slate-300 bg-white text-slate-600 hover:border-orange-300 hover:text-orange-700"}`}
            title={recording ? "Close voice and transcribe" : "Open voice"}
          >
            <Icon name="phone" className="h-8 w-8" />
          </button>
          <p className="mt-3 break-words text-sm font-black text-slate-950">{recording ? "Voice open" : transcribing ? "Transcribing..." : state.voiceInterface.prompt}</p>
          <p className="mt-1 break-words text-xs font-bold leading-5 text-slate-600">{canUseBrowserRecorder ? (recording ? "Mic is open. Close voice when you are done." : state.voiceInterface.providerStatus) : "Browser microphone unavailable"}</p>
        </div>
        <div className="grid min-w-0 gap-3">
          <StatusRow item={{
            id: "voice-transcript-preview",
            title: "Transcript preview",
            status: confirmedTranscript ? "Confirmed locally" : state.voiceInterface.transcriptStatus,
            detail: confirmedTranscript || state.voiceInterface.transcriptPreview,
            tone: confirmedTranscript ? "green" : "blue",
          }} />
          <StatusRow item={{
            id: "voice-answer-preview",
            title: "Spoken answer preview",
            status: state.voiceInterface.answerStatus,
            detail: state.voiceInterface.answerPreview,
            tone: "green",
          }} />
          {commandReview ? <StatusRow item={{
            id: "voice-command-review",
            title: "Voice command review",
            status: commandReview.status,
            detail: `${commandReview.label} ${commandReview.approvalRequired ? "Approval packet required before any later action." : "Ready for source-backed Ask Apex review."}`,
            tone: commandReview.tone,
          }} /> : null}
        </div>
      </div>

      <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-3">
        <label className="sr-only" htmlFor="voice-transcript-input">Voice transcript</label>
        <textarea
          id="voice-transcript-input"
          value={transcriptDraft}
          onChange={(event) => {
            setTranscriptDraft(event.target.value);
            setCommandReview(buildApexOsVoiceCommandReview(event.target.value));
            setConfirmedTranscript("");
            setNotice("");
          }}
          maxLength={1000}
          placeholder="Type what Apex heard before treating it as a command."
          className="min-h-24 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold leading-6 text-slate-700 placeholder:text-slate-500"
          disabled={!state.canView}
        />
        <div className="mt-3 flex min-w-0 flex-wrap gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={recording ? closeVoiceSession : openVoiceSession} disabled={!canToggleRecording}>
            <Icon name="phone" /> {recording ? "Close voice" : "Open voice"}
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={closeVoiceSession} disabled={!recording}>
            <Icon name="lock" /> Close & transcribe
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={confirmTranscript} disabled={!canConfirm}>
            <Icon name="clipboard" /> Confirm transcript
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={useTranscript} disabled={!canUse}>
            <Icon name="spark" /> Use in Ask Apex
          </Button>
          <Button type="button" disabled variant="secondary" size="sm">
            <Icon name="lock" /> Execute locked
          </Button>
        </div>
        <p className="mt-3 break-words text-xs font-black leading-5 text-slate-500">{notice || "Open voice is visible and user-controlled. Apex does not record in the background, store audio, or execute voice commands."}</p>
      </div>
    </div>
  );
}

function DailyBriefingPanel({ state, sessionToken }) {
  const [briefing, setBriefing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const canRefresh = state.canView && Boolean(sessionToken) && !loading && !saving;
  const canSave = state.canView && Boolean(sessionToken) && !loading && !saving;
  const rows = briefing?.briefingRows?.length ? briefing.briefingRows : state.releaseMonitoring.briefingRows;
  const history = briefing?.history || {};
  const changedRows = Array.isArray(briefing?.changedSincePreviousRows) ? briefing.changedSincePreviousRows : history.changedSincePreviousRows || [];
  const historyRows = Array.isArray(briefing?.historyRows) ? briefing.historyRows : history.historyRows || [];

  async function refreshBriefing() {
    if (!canRefresh) return;
    setLoading(true);
    setNotice("");
    try {
      const payload = await getApexOsDailyBriefing(sessionToken);
      setBriefing(payload.dailyBriefing);
      setNotice("Daily briefing refreshed from current Apex HQ workspace state.");
    } catch (error) {
      setNotice(error?.message || "Daily briefing could not refresh right now.");
    } finally {
      setLoading(false);
    }
  }

  async function saveSnapshot() {
    if (!canSave) return;
    setSaving(true);
    setNotice("");
    try {
      const payload = await saveApexOsDailyBriefingSnapshot(sessionToken);
      setBriefing(payload.dailyBriefing);
      setNotice("Daily briefing snapshot saved privately for changed-since-prior review.");
    } catch (error) {
      setNotice(error?.message || "Daily briefing snapshot could not be saved right now.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid min-w-0 gap-3">
      <div className="flex min-w-0 flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="break-words text-sm font-black text-slate-950">{briefing?.summary || "Refresh the briefing for a current private operating snapshot."}</p>
          <p className="mt-1 break-words text-xs font-bold leading-5 text-slate-600">{notice || "Read-only monitoring. Save creates a private Apex OS briefing snapshot only; no alerts are sent."}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={refreshBriefing} disabled={!canRefresh}>
            <Icon name="refresh" /> {loading ? "Refreshing..." : "Refresh"}
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={saveSnapshot} disabled={!canSave}>
            <Icon name="clipboard" /> {saving ? "Saving..." : "Save snapshot"}
          </Button>
        </div>
      </div>
      {rows.map((item) => <StatusRow key={item.id} item={item} />)}
      {changedRows.length ? (
        <div className="grid min-w-0 gap-3">
          <SectionHeader title="Changed Since Last Briefing" description={`${changedRows.length} read-only comparison rows.`} />
          {changedRows.map((item) => <StatusRow key={item.id} item={item} />)}
        </div>
      ) : null}
      {historyRows.length ? (
        <div className="grid min-w-0 gap-3">
          <SectionHeader title="Briefing History" description={`${history.snapshotCount || historyRows.length} private snapshots saved for manual review.`} />
          {historyRows.map((item) => <StatusRow key={item.id} item={item} />)}
        </div>
      ) : null}
      {briefing?.alerts?.length ? (
        <div className="grid min-w-0 gap-3">
          <SectionHeader title="Briefing Locks" description={`${briefing.alerts.length} safety locks returned with the briefing.`} />
          {briefing.alerts.map((item) => <StatusRow key={item.id} item={item} />)}
        </div>
      ) : null}
      {briefing?.sourceLabels?.length ? (
        <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Briefing sources</p>
          <div className="mt-2 flex min-w-0 flex-wrap gap-2">
            {briefing.sourceLabels.map((label) => <ToneBadge key={label} tone="slate">{label}</ToneBadge>)}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function releaseMonitoringRowsWithSnapshot(rows = [], snapshot = null) {
  if (!snapshot) return rows;
  return rows.map((item) => {
    if (item.id === "current-branch-build") {
      return {
        ...item,
        status: snapshot.status || item.status,
        detail: `${snapshot.buildStatus?.status || "Build evidence pending"} build script, ${snapshot.testStatus?.status || "test evidence pending"} verification scripts, and ${snapshot.changedFileCount || 0} changed files are visible.`,
        tone: snapshot.tone || item.tone,
        sourceLabel: "Apex OS build awareness endpoint",
        readOnly: true,
      };
    }
    if (item.id === "production-readiness") {
      const evidence = snapshot.productionReadiness || snapshot.latestDeploy;
      return {
        ...item,
        status: evidence?.status || item.status,
        detail: evidence?.detail || item.detail,
        tone: evidence?.tone || item.tone,
        sourceLabel: evidence?.sourceLabel || item.sourceLabel,
        readOnly: true,
      };
    }
    if (item.id === "demo-readiness") {
      const evidence = snapshot.demoReadiness;
      return {
        ...item,
        status: evidence?.status || item.status,
        detail: evidence?.detail || item.detail,
        tone: evidence?.tone || item.tone,
        sourceLabel: evidence?.sourceLabel || item.sourceLabel,
        readOnly: true,
      };
    }
    if (item.id === "github-actions-smoke") {
      const evidence = snapshot.githubActionsSmoke;
      return {
        ...item,
        status: evidence?.status || item.status,
        detail: evidence?.detail || item.detail,
        tone: evidence?.tone || item.tone,
        sourceLabel: evidence?.sourceLabel || item.sourceLabel,
        readOnly: true,
      };
    }
    if (item.id === "failed-test-build") {
      const evidence = snapshot.failedTestBuild;
      return {
        ...item,
        status: evidence?.status || item.status,
        detail: evidence?.detail || item.detail,
        tone: evidence?.tone || item.tone,
        sourceLabel: evidence?.sourceLabel || item.sourceLabel,
        readOnly: true,
      };
    }
    return item;
  });
}

function ReleaseMonitoringPanel({ state, sessionToken }) {
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const canRefresh = state.canView && Boolean(sessionToken) && !loading;
  const rows = releaseMonitoringRowsWithSnapshot(state.releaseMonitoring.readinessRows, snapshot);

  async function refreshMonitoring() {
    if (!canRefresh) return;
    setLoading(true);
    setNotice("");
    try {
      const payload = await getApexOsBuildAwareness(sessionToken);
      setSnapshot(payload.buildAwareness || null);
      setNotice("Monitoring evidence refreshed from read-only build awareness.");
    } catch (error) {
      setNotice(error?.message || "Monitoring evidence could not refresh right now.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-w-0 gap-3">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <p className="min-w-0 break-words text-xs font-bold leading-5 text-slate-600">{notice || "Refresh reads local source docs, git/runtime metadata, and build-awareness evidence only."}</p>
        <Button type="button" variant="secondary" size="sm" onClick={refreshMonitoring} disabled={!canRefresh}>
          <Icon name="refresh" /> {loading ? "Refreshing..." : "Refresh monitoring"}
        </Button>
      </div>
      <div className="grid min-w-0 gap-3 lg:grid-cols-2">
        {rows.map((item) => <StatusRow key={item.id} item={item} />)}
      </div>
    </div>
  );
}

function ReleaseDeskPanel({ state, sessionToken }) {
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const canRefresh = state.canView && Boolean(sessionToken) && !loading;
  const desk = snapshot ? buildReleaseDesk({ buildAwareness: snapshot }) : state.releaseDesk;
  const productionPreviewRows = Array.isArray(desk.productionPreviewRows) ? desk.productionPreviewRows : [];
  const readinessPacketRows = Array.isArray(desk.readinessPacketRows) ? desk.readinessPacketRows : [];
  const deployHistoryRows = Array.isArray(desk.deployHistoryRows) ? desk.deployHistoryRows : [];
  const deployApprovalFlowRows = Array.isArray(desk.deployApprovalFlowRows) ? desk.deployApprovalFlowRows : [];
  const safetySections = Array.isArray(desk.sections) ? desk.sections : [];

  async function refreshReleaseDesk() {
    if (!canRefresh) return;
    setLoading(true);
    setNotice("");
    try {
      const payload = await getApexOsBuildAwareness(sessionToken);
      setSnapshot(payload.buildAwareness || null);
      setNotice("Release desk refreshed from read-only build awareness.");
    } catch (error) {
      setNotice(error?.message || "Release desk evidence could not refresh right now.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-w-0 gap-4">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="break-words text-sm font-black text-slate-950">{desk.currentVersion ? `Production v${desk.currentVersion}` : "Production evidence pending"}</p>
          <p className="mt-1 break-words text-xs font-bold leading-5 text-slate-600">{notice || "Release desk reads build awareness, deploy log evidence, release safety, and approval boundaries only."}</p>
        </div>
        <div className="flex min-w-0 flex-wrap gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={refreshReleaseDesk} disabled={!canRefresh}>
            <Icon name="refresh" /> {loading ? "Refreshing..." : "Refresh release desk"}
          </Button>
          <Button type="button" disabled variant="secondary" size="sm">
            <Icon name="lock" /> Deploy approved locked
          </Button>
        </div>
      </div>

      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-3">
          <SectionHeader title="Production Preview Status" description={`${productionPreviewRows.length} production evidence rows.`} />
          <div className="grid min-w-0 gap-2">
            {productionPreviewRows.length ? productionPreviewRows.map((item) => <StatusRow key={item.id} item={item} />) : <EmptyPanel>No production preview evidence is visible.</EmptyPanel>}
          </div>
        </div>

        <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-3">
          <SectionHeader title="Release Readiness Packet" description={`${readinessPacketRows.length} release packet gates.`} />
          <div className="grid min-w-0 gap-2">
            {readinessPacketRows.length ? readinessPacketRows.map((item) => <StatusRow key={item.id} item={item} />) : <EmptyPanel>No release readiness packet rows are visible.</EmptyPanel>}
          </div>
        </div>
      </div>

      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-3">
          <SectionHeader title="Deploy History" description={`${deployHistoryRows.length} recent Apex OS release rows.`} />
          <div className="grid min-w-0 gap-2">
            {deployHistoryRows.length ? deployHistoryRows.map((item) => <StatusRow key={item.id} item={item} />) : <EmptyPanel>No deploy history rows were parsed yet.</EmptyPanel>}
          </div>
        </div>

        <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-3">
          <SectionHeader title="Deploy Approved Flow" description={`${deployApprovalFlowRows.length} locked approval steps.`} />
          <div className="grid min-w-0 gap-2">
            {deployApprovalFlowRows.map((item) => <StatusRow key={item.id} item={item} />)}
          </div>
        </div>
      </div>

      <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-3">
        <SectionHeader title="Release Safety Summary" description={`${safetySections.length} release safety rows.`} />
        <div className="grid min-w-0 gap-2 lg:grid-cols-3">
          {safetySections.map((item) => <StatusRow key={item.id} item={item} />)}
        </div>
      </div>
    </div>
  );
}

function BuildAwarenessPanel({ state, sessionToken }) {
  const [snapshot, setSnapshot] = useState(state.buildAwareness || {});
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const canRefresh = state.canView && Boolean(sessionToken) && !loading;
  const activeSnapshot = snapshot || {};
  const changedFiles = Array.isArray(activeSnapshot.changedFiles) ? activeSnapshot.changedFiles : [];
  const frozenPhaseRows = Array.isArray(activeSnapshot.frozenPhaseRows) ? activeSnapshot.frozenPhaseRows : [];
  const sourceLinks = Array.isArray(activeSnapshot.sourceLinks) ? activeSnapshot.sourceLinks : [];
  const lockRows = Array.isArray(activeSnapshot.lockRows) ? activeSnapshot.lockRows : [];
  const knownBlockers = Array.isArray(activeSnapshot.knownBlockers) ? activeSnapshot.knownBlockers : [];
  const recentCommits = Array.isArray(activeSnapshot.recentCommits) ? activeSnapshot.recentCommits : [];

  async function refreshBuildAwareness() {
    if (!canRefresh) return;
    setLoading(true);
    setNotice("");
    try {
      const payload = await getApexOsBuildAwareness(sessionToken);
      setSnapshot(payload.buildAwareness || {});
      setNotice("Build awareness refreshed. Read-only; execution remains locked.");
    } catch (error) {
      setNotice(error?.message || "Build awareness could not be loaded right now.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-w-0 gap-4">
      <div className="grid min-w-0 gap-3 lg:grid-cols-2">
        <StatusRow item={{
          id: "build-awareness-branch",
          title: "Current branch",
          status: activeSnapshot.branch || "Pending refresh",
          detail: `Head: ${activeSnapshot.headSha || "Pending refresh"}. Collected: ${activeSnapshot.collectedAt || "Not loaded"}.`,
          tone: activeSnapshot.tone || "blue",
          sourceLabel: activeSnapshot.gitAvailable ? "git branch + git rev-parse" : "runtime metadata",
        }} />
        <StatusRow item={{
          id: "build-awareness-changes",
          title: "Changed files",
          status: `${activeSnapshot.changedFileCount || 0}`,
          detail: activeSnapshot.changedFileCount ? "Changed files are visible for exact staging review before commit or deploy." : "No changed files are reported by the latest snapshot.",
          tone: activeSnapshot.changedFileCount ? "amber" : "green",
          sourceLabel: "git status --porcelain",
        }} />
        <StatusRow item={activeSnapshot.buildStatus || {
          id: "build-status",
          title: "Build script",
          status: "Pending",
          detail: "Refresh build awareness to read package/build artifact status.",
          tone: "blue",
        }} />
        <StatusRow item={activeSnapshot.testStatus || {
          id: "test-status",
          title: "Verification scripts",
          status: "Pending",
          detail: "Refresh build awareness to read declared test scripts.",
          tone: "blue",
        }} />
        <StatusRow item={activeSnapshot.latestDeploy || {
          id: "latest-deploy",
          title: "Recent deploy evidence",
          status: "Pending",
          detail: "Refresh build awareness to parse release evidence.",
          tone: "blue",
        }} />
        <StatusRow item={activeSnapshot.nextSafeTask || {
          id: "next-safe-task",
          title: "Start next safe task",
          status: "Pending",
          detail: "Refresh build awareness before choosing the next phase action.",
          tone: "blue",
        }} />
      </div>

      <div className="flex min-w-0 flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={refreshBuildAwareness} disabled={!canRefresh}>
          <Icon name="refresh" /> {loading ? "Refreshing..." : "Refresh build status"}
        </Button>
        <Button type="button" disabled variant="secondary" size="sm">
          <Icon name="lock" /> Read-only
        </Button>
        <Button type="button" disabled variant="secondary" size="sm">
          <Icon name="lock" /> No UI file edits
        </Button>
      </div>
      <p className="break-words text-xs font-black leading-5 text-slate-500">{notice || "Build awareness reads branch, status, source docs, and release evidence. It cannot edit files, run tests, deploy, or touch production data."}</p>

      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-3">
          <SectionHeader title="Changed File Map" description={`${changedFiles.length} sanitized file references shown.`} />
          <div className="grid min-w-0 gap-2">
            {changedFiles.length ? changedFiles.slice(0, 10).map((file) => (
              <StatusRow key={file.id} item={{
                id: file.id,
                title: file.path,
                status: file.status,
                detail: `${file.tracked ? "Tracked" : "Untracked"}; staged ${file.staged ? "yes" : "no"}; worktree ${file.worktree ? "yes" : "no"}.`,
                tone: file.tracked ? "amber" : "blue",
                sourceLabel: file.sourceLabel,
              }} />
            )) : <EmptyPanel>No changed files are visible in the latest snapshot.</EmptyPanel>}
          </div>
        </div>

        <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-3">
          <SectionHeader title="Known Blockers" description={`${knownBlockers.length} build/release blockers from source evidence.`} />
          <div className="grid min-w-0 gap-2">
            {knownBlockers.length ? knownBlockers.map((item) => <StatusRow key={item.id} item={item} />) : <EmptyPanel>No build-awareness blockers are visible.</EmptyPanel>}
          </div>
        </div>
      </div>

      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-3">
          <SectionHeader title="Frozen Phase Map" description={`${frozenPhaseRows.filter((row) => row.status === "Deployed").length} deployed phases parsed from the living plan.`} />
          <div className="grid min-w-0 gap-2">
            {frozenPhaseRows.slice(0, 11).map((item) => <StatusRow key={item.id} item={item} />)}
          </div>
        </div>

        <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-3">
          <SectionHeader title="Source Links" description={`${sourceLinks.length} safe file references.`} />
          <div className="grid min-w-0 gap-2">
            {sourceLinks.map((item) => <StatusRow key={item.id} item={{
              id: item.id,
              title: item.title,
              status: item.path,
              detail: item.detail,
              tone: "blue",
              sourceLabel: "Safe repo file reference",
            }} />)}
          </div>
        </div>
      </div>

      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-3">
          <SectionHeader title="Recent Commits" description={`${recentCommits.length} latest git rows when available.`} />
          <div className="grid min-w-0 gap-2">
            {recentCommits.length ? recentCommits.map((item) => <StatusRow key={item.id} item={item} />) : <EmptyPanel>No recent commits are visible in this runtime.</EmptyPanel>}
          </div>
        </div>

        <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-3">
          <SectionHeader title="Build Awareness Locks" description={`${lockRows.length} hard stops.`} />
          <div className="grid min-w-0 gap-2">
            {lockRows.map((item) => <StatusRow key={item.id} item={item} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

const EMPTY_DECISION_MEMORY_FORM = {
  category: "roadmap-decision",
  title: "",
  body: "",
  sourceType: "manual",
  sourceLabel: "Apex Control Room",
  sourceUri: "",
  reviewNote: "",
  status: "suggested",
  confidence: 80,
};

function filterDecisionRows(rows = [], { category, source, status, query } = {}) {
  const normalizedQuery = String(query || "").trim().toLowerCase();
  const normalizedSource = String(source || "all").trim().toLowerCase();
  return rows
    .filter((row) => !category || category === "all" || row.category === category)
    .filter((row) => !status || status === "all" || row.status === status)
    .filter((row) => source === "all" || [row.sourceLabel, row.sourceType, row.sourceUri].some((value) => String(value || "").toLowerCase().includes(normalizedSource)))
    .filter((row) => {
      if (!normalizedQuery) return true;
      return [row.title, row.body, row.sourceLabel, row.sourceUri, row.reviewNote, row.category].some((value) => String(value || "").toLowerCase().includes(normalizedQuery));
    });
}

function decisionDuplicateKeys({ category = "general", title = "", sourceLabel = "", sourceUri = "" } = {}) {
  const normalizedCategory = String(category || "general").trim().toLowerCase();
  return [
    sourceUri ? `${normalizedCategory}|uri|${sourceUri}` : "",
    sourceLabel && title ? `${normalizedCategory}|source-title|${sourceLabel}|${title}` : "",
  ].map((value) => String(value || "").trim().toLowerCase()).filter(Boolean);
}

function formatDecisionExport(rows = []) {
  if (!rows.length) return "No decision memory rows match the current filters.";
  return JSON.stringify(rows.map((row) => ({
    category: row.category,
    title: row.title,
    status: row.status,
    sourceLabel: row.sourceLabel,
    sourceUri: row.sourceUri,
    reviewNote: row.reviewNote,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    approvedAt: row.approvedAt,
    archivedAt: row.archivedAt,
    body: row.body,
  })), null, 2);
}

function DecisionMemoryManager({ state, sessionToken }) {
  const [form, setForm] = useState(EMPTY_DECISION_MEMORY_FORM);
  const [memoryRows, setMemoryRows] = useState(state.decisionMemory?.durableEntries || []);
  const [summary, setSummary] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [queryFilter, setQueryFilter] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const sourceOptions = [
    ...new Set([
      ...(state.decisionMemory?.sourceOptions || []),
      ...memoryRows.map((row) => row.sourceLabel).filter(Boolean),
    ]),
  ].sort((left, right) => left.toLowerCase().localeCompare(right.toLowerCase()));
  const filteredRows = filterDecisionRows(memoryRows, {
    category: categoryFilter,
    source: sourceFilter,
    status: statusFilter,
    query: queryFilter,
  });
  const latestReviewRows = filteredRows
    .slice()
    .sort((left, right) => String(right.updatedAt || right.createdAt || "").localeCompare(String(left.updatedAt || left.createdAt || "")))
    .slice(0, 4);
  const candidateDuplicateKeys = new Set(decisionDuplicateKeys(form));
  const duplicateRow = candidateDuplicateKeys.size
    ? memoryRows.find((row) => row.status !== "archived" && decisionDuplicateKeys(row).some((key) => candidateDuplicateKeys.has(key)))
    : null;
  const canUse = state.canView && Boolean(sessionToken) && !loading;
  const canCreate = canUse && form.title.trim() && form.body.trim() && form.sourceLabel.trim() && !duplicateRow;
  const activeSummary = summary || state.decisionMemory?.memorySummary || { total: memoryRows.length, approved: 0, suggested: 0, archived: 0 };

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setNotice("");
  }

  async function refreshMemory() {
    if (!canUse) return;
    setLoading(true);
    setNotice("");
    try {
      const payload = await getApexOsMemory(sessionToken);
      setMemoryRows(payload.apexOsMemory || []);
      setSummary(payload.summary || null);
      setNotice("Decision memory loaded from private Apex OS storage.");
    } catch (error) {
      setNotice(error?.message || "Decision memory could not load right now.");
    } finally {
      setLoading(false);
    }
  }

  async function submitMemory(event) {
    event.preventDefault();
    if (!canCreate) return;
    setLoading(true);
    setNotice("");
    try {
      const payload = await createApexOsMemory(sessionToken, { ...form, status: "suggested" });
      setMemoryRows((current) => [payload.apexOsMemoryEntry, ...current].filter(Boolean));
      setSummary((current) => ({
        total: (current?.total || 0) + 1,
        approved: current?.approved || 0,
        suggested: (current?.suggested || 0) + 1,
        archived: current?.archived || 0,
      }));
      setForm(EMPTY_DECISION_MEMORY_FORM);
      setNotice("Decision memory drafted as suggested. It is not operating context until approved.");
    } catch (error) {
      setNotice(error?.message || "Decision memory could not be saved right now.");
    } finally {
      setLoading(false);
    }
  }

  async function setMemoryStatus(row, status) {
    if (!canUse || !row?.id) return;
    setLoading(true);
    setNotice("");
    try {
      await updateApexOsMemory(sessionToken, row.id, { ...row, status });
      const payload = await getApexOsMemory(sessionToken);
      setMemoryRows(payload.apexOsMemory || []);
      setSummary(payload.summary || null);
      setNotice(status === "archived" ? "Decision archived. It no longer feeds approved Apex OS context." : "Decision approved for source-backed Apex OS context.");
    } catch (error) {
      setNotice(error?.message || "Decision memory could not be updated right now.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-w-0 gap-4">
      <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatusRow item={{
          id: "decision-memory-saved",
          title: "Saved memory",
          status: `${activeSummary.total || 0}`,
          detail: `${activeSummary.approved || 0} approved, ${activeSummary.suggested || 0} suggested, ${activeSummary.archived || 0} archived.`,
          tone: activeSummary.approved ? "green" : "blue",
        }} />
        <StatusRow item={{
          id: "decision-memory-categories",
          title: "Phase 4 categories",
          status: `${state.decisionMemory.coveredCategoryCount || 0}/${state.decisionMemory.categoryCount || 0}`,
          detail: "Product identity, safety, roadmap, build freeze, business goal, provider/account, and personal preference decisions are covered.",
          tone: "green",
        }} />
        <StatusRow item={{
          id: "decision-memory-sources",
          title: "Source browsing",
          status: `${sourceOptions.length || 0}`,
          detail: `${filteredRows.length || 0} rows match the current source, category, status, and text filters.`,
          tone: sourceOptions.length ? "green" : "blue",
        }} />
        <StatusRow item={{
          id: "decision-memory-duplicates",
          title: "Duplicate guard",
          status: duplicateRow ? "Blocked" : "Ready",
          detail: duplicateRow ? `Active match: ${duplicateRow.title}. Archive it before replacing this source/title.` : "Active source/title duplicates are blocked before draft and by the API.",
          tone: duplicateRow ? "amber" : "green",
        }} />
      </div>

      <form className="grid min-w-0 gap-3 rounded-xl border border-slate-200 bg-white p-3" onSubmit={submitMemory}>
        <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_260px]">
          <input
            value={form.title}
            onChange={(event) => updateField("title", event.target.value)}
            maxLength={140}
            placeholder="Decision title"
            className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700"
            disabled={!state.canView || loading}
          />
          <select
            value={form.category}
            onChange={(event) => updateField("category", event.target.value)}
            className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700"
            disabled={!state.canView || loading}
          >
            {state.decisionMemory.categories.map((category) => (
              <option key={category.id} value={category.id}>{category.label}</option>
            ))}
          </select>
        </div>
        <textarea
          value={form.body}
          onChange={(event) => updateField("body", event.target.value)}
          maxLength={1800}
          placeholder="What did the operator decide?"
          className="min-h-20 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold leading-6 text-slate-700"
          disabled={!state.canView || loading}
        />
        <div className="grid min-w-0 gap-3 lg:grid-cols-3">
          <input value={form.sourceLabel} onChange={(event) => updateField("sourceLabel", event.target.value)} maxLength={120} placeholder="Source label" className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700" disabled={!state.canView || loading} />
          <input value={form.sourceUri} onChange={(event) => updateField("sourceUri", event.target.value)} maxLength={240} placeholder="Source URI or file" className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700" disabled={!state.canView || loading} />
          <input value={form.reviewNote} onChange={(event) => updateField("reviewNote", event.target.value)} maxLength={300} placeholder="Review note" className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700" disabled={!state.canView || loading} />
        </div>
        <div className="flex min-w-0 flex-wrap gap-2">
          <Button type="submit" variant="secondary" size="sm" disabled={!canCreate}>
            <Icon name="clipboard" /> {loading ? "Saving..." : "Draft memory"}
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={refreshMemory} disabled={!canUse}>
            <Icon name="refresh" /> Load decisions
          </Button>
          <Button type="button" disabled variant="secondary" size="sm">
            <Icon name="lock" /> No hidden memory
          </Button>
        </div>
        <p className="break-words text-xs font-black leading-5 text-slate-500">{notice || (duplicateRow ? `Duplicate blocked: ${duplicateRow.title}.` : "Memory requires a source label, stores no secrets, starts as suggested, and becomes operating context only after manual approval.")}</p>
      </form>

      <div className="grid min-w-0 gap-3 rounded-xl border border-slate-200 bg-white p-3 lg:grid-cols-[minmax(0,1fr)_180px_180px_180px]">
        <input
          value={queryFilter}
          onChange={(event) => setQueryFilter(event.target.value)}
          placeholder="Search decisions, sources, notes"
          className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700"
        />
        <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700">
          <option value="all">All categories</option>
          {state.decisionMemory.categories.map((category) => (
            <option key={category.id} value={category.id}>{category.label}</option>
          ))}
        </select>
        <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)} className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700">
          <option value="all">All sources</option>
          {sourceOptions.map((source) => <option key={source} value={source}>{source}</option>)}
        </select>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700">
          <option value="all">All statuses</option>
          <option value="suggested">Suggested</option>
          <option value="approved">Approved</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      <div className="grid min-w-0 gap-3">
        {filteredRows.length ? filteredRows.slice(0, 8).map((row) => (
          <div key={row.id} className="min-w-0 rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="break-words text-[10px] font-black uppercase tracking-[0.16em] text-orange-700">{String(row.category || "general").replace(/-/g, " ")}</p>
                <p className="mt-1 break-words text-sm font-black text-slate-950">{row.title}</p>
                <p className="mt-1 break-words text-xs font-bold leading-5 text-slate-600">{row.body}</p>
                <p className="mt-2 break-words text-[11px] font-black text-slate-500">Source: {row.sourceLabel || "Missing source"}{row.sourceUri ? ` | URI: ${row.sourceUri}` : ""}</p>
                <p className="mt-1 break-words text-[11px] font-black text-slate-500">
                  Created: {row.createdAt || "unknown"}{row.updatedAt ? ` | Updated: ${row.updatedAt}` : ""}{row.approvedAt ? ` | Approved: ${row.approvedAt}` : ""}{row.archivedAt ? ` | Archived: ${row.archivedAt}` : ""}
                </p>
                {row.reviewNote ? <p className="mt-1 break-words text-[11px] font-black text-slate-500">Review: {row.reviewNote}</p> : null}
              </div>
              <ToneBadge tone={row.status === "approved" ? "green" : row.status === "archived" ? "slate" : "blue"}>{row.status}</ToneBadge>
            </div>
            <div className="mt-3 flex min-w-0 flex-wrap gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => setMemoryStatus(row, "approved")} disabled={!canUse || row.status === "approved" || row.status === "archived"}>
                <Icon name="check" /> Approve
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={() => setMemoryStatus(row, "archived")} disabled={!canUse || row.status === "archived"}>
                <Icon name="clock" /> Archive
              </Button>
            </div>
          </div>
        )) : (
          <EmptyPanel>No durable decision memory matches the current filters.</EmptyPanel>
        )}
      </div>

      <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-3">
          <SectionHeader title="Review History" description={`${latestReviewRows.length || 0} latest matching decision rows.`} />
          <div className="grid min-w-0 gap-2">
            {latestReviewRows.length ? latestReviewRows.map((row) => (
              <StatusRow key={`history-${row.id}`} item={{
                id: `history-${row.id}`,
                title: row.title,
                status: row.status,
                detail: `Created ${row.createdAt || "unknown"}${row.updatedAt ? `, updated ${row.updatedAt}` : ""}${row.approvedAt ? `, approved ${row.approvedAt}` : ""}${row.archivedAt ? `, archived ${row.archivedAt}` : ""}. ${row.reviewNote || "No review note."}`,
                tone: row.status === "approved" ? "green" : row.status === "archived" ? "slate" : "blue",
              }} />
            )) : <EmptyPanel>No review history is visible for the current filters.</EmptyPanel>}
          </div>
        </div>

        <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-3">
          <SectionHeader title="Decision Export" description="Copyable private JSON for the matching decision rows." />
          <textarea
            readOnly
            value={formatDecisionExport(filteredRows)}
            className="mt-3 min-h-48 w-full resize-y rounded-xl border border-slate-200 bg-slate-950 px-3 py-3 font-mono text-xs font-bold leading-5 text-slate-100"
          />
        </div>
      </div>
    </div>
  );
}

const EMPTY_PERSONAL_OPERATING_FORM = {
  category: "personal-preference",
  title: "",
  body: "",
  sourceType: "personal-operating-layer",
  sourceLabel: "Personal Operating Layer",
  sourceUri: "apex-os-personal-operating-layer",
  reviewNote: "Explicit preference - manual review required.",
  status: "suggested",
  confidence: 80,
};

function personalPreferenceRows(rows = []) {
  return rows.filter((row) => row.category === "personal-preference");
}

function formatPersonalPreferenceRow(row = {}) {
  return {
    id: `personal-${row.id}`,
    title: row.title || "Personal preference",
    status: row.status === "approved" ? "Approved" : row.status || "Suggested",
    detail: row.body || row.reviewNote || "Explicit Apex OS personal operating preference.",
    tone: row.status === "approved" ? "green" : row.status === "archived" ? "slate" : "blue",
    sourceLabel: row.sourceLabel || "Personal Operating Layer",
  };
}

function PersonalOperatingLayerPanel({ state, sessionToken }) {
  const layer = state.personalOperatingLayer || {};
  const [form, setForm] = useState(EMPTY_PERSONAL_OPERATING_FORM);
  const [memoryRows, setMemoryRows] = useState(layer.preferenceEntries || []);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const canUse = state.canView && Boolean(sessionToken) && !loading;
  const personalRows = personalPreferenceRows(memoryRows);
  const reviewRows = personalRows
    .slice()
    .sort((left, right) => String(right.updatedAt || right.createdAt || right.approvedAt || "").localeCompare(String(left.updatedAt || left.createdAt || left.approvedAt || "")));
  const duplicateKeys = new Set(decisionDuplicateKeys(form));
  const duplicateRow = duplicateKeys.size
    ? personalRows.find((row) => row.status !== "archived" && decisionDuplicateKeys(row).some((key) => duplicateKeys.has(key)))
    : null;
  const approvedRows = personalRows.filter((row) => row.status === "approved").map(formatPersonalPreferenceRow);
  const existingPreferenceIds = new Set((layer.preferenceRows || []).map((row) => row.id));
  const preferenceCards = [
    ...(layer.preferenceRows || []),
    ...approvedRows.filter((row) => !existingPreferenceIds.has(row.id.replace(/^personal-/, ""))),
  ];
  const canCreate = canUse && form.title.trim() && form.body.trim() && form.sourceLabel.trim() && !duplicateRow;
  const approvedCount = personalRows.filter((row) => row.status === "approved").length || layer.approvedCount || 0;
  const suggestedCount = personalRows.filter((row) => row.status === "suggested").length || layer.suggestedCount || 0;
  const archivedCount = personalRows.filter((row) => row.status === "archived").length || layer.archivedCount || 0;

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setNotice("");
  }

  async function refreshPreferences() {
    if (!canUse) return;
    setLoading(true);
    setNotice("");
    try {
      const payload = await getApexOsMemory(sessionToken);
      setMemoryRows(personalPreferenceRows(payload.apexOsMemory || []));
      setNotice("Personal preferences loaded from private Apex OS memory.");
    } catch (error) {
      setNotice(error?.message || "Personal preferences could not load right now.");
    } finally {
      setLoading(false);
    }
  }

  async function submitPreference(event) {
    event.preventDefault();
    if (!canCreate) return;
    setLoading(true);
    setNotice("");
    try {
      const payload = await createApexOsMemory(sessionToken, {
        ...form,
        category: "personal-preference",
        status: "suggested",
      });
      setMemoryRows((current) => [payload.apexOsMemoryEntry, ...current].filter(Boolean));
      setForm(EMPTY_PERSONAL_OPERATING_FORM);
      setNotice("Personal preference drafted as suggested. It is not operating guidance until approved.");
    } catch (error) {
      setNotice(error?.message || "Personal preference could not be saved right now.");
    } finally {
      setLoading(false);
    }
  }

  async function setPreferenceStatus(row, status) {
    if (!canUse || !row?.id) return;
    setLoading(true);
    setNotice("");
    try {
      await updateApexOsMemory(sessionToken, row.id, { ...row, status });
      const payload = await getApexOsMemory(sessionToken);
      setMemoryRows(personalPreferenceRows(payload.apexOsMemory || []));
      setNotice(status === "archived" ? "Personal preference archived." : "Personal preference approved for Apex OS operating guidance.");
    } catch (error) {
      setNotice(error?.message || "Personal preference could not be updated right now.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-w-0 gap-4">
      <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatusRow item={{
          id: "personal-preferences-count",
          title: "John preferences",
          status: `${preferenceCards.length || 0}`,
          detail: `${approvedCount} approved, ${suggestedCount} suggested, ${archivedCount} archived personal-preference memory rows.`,
          tone: approvedCount ? "green" : "blue",
        }} />
        <StatusRow item={{
          id: "personal-daily-focus-count",
          title: "Daily focus",
          status: `${layer.dailyFocusCount || 0}`,
          detail: "Current phase, release evidence, and next-phase boundary stay visible.",
          tone: "green",
        }} />
        <StatusRow item={{
          id: "personal-distraction-count",
          title: "Do not distract unless",
          status: `${layer.distractionRuleCount || 0}`,
          detail: "Interrupt rules are limited to production, validation, approval, and safety changes.",
          tone: "amber",
        }} />
        <StatusRow item={{
          id: "personal-privacy-count",
          title: "Privacy locks",
          status: `${layer.privacyLockCount || 0}`,
          detail: "No hidden tracking, no sensitive personal capture, no background execution.",
          tone: "amber",
        }} />
      </div>

      <form className="grid min-w-0 gap-3 rounded-xl border border-slate-200 bg-white p-3" onSubmit={submitPreference}>
        <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_260px]">
          <input
            value={form.title}
            onChange={(event) => updateField("title", event.target.value)}
            maxLength={140}
            placeholder="Preference title"
            className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700"
            disabled={!state.canView || loading}
          />
          <input
            value={form.sourceLabel}
            onChange={(event) => updateField("sourceLabel", event.target.value)}
            maxLength={120}
            placeholder="Source label"
            className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700"
            disabled={!state.canView || loading}
          />
        </div>
        <textarea
          value={form.body}
          onChange={(event) => updateField("body", event.target.value)}
          maxLength={1800}
          placeholder="What should Apex remember about how John wants to work?"
          className="min-h-20 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold leading-6 text-slate-700"
          disabled={!state.canView || loading}
        />
        <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <input value={form.sourceUri} onChange={(event) => updateField("sourceUri", event.target.value)} maxLength={240} placeholder="Source URI or file" className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700" disabled={!state.canView || loading} />
          <input value={form.reviewNote} onChange={(event) => updateField("reviewNote", event.target.value)} maxLength={300} placeholder="Review note" className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700" disabled={!state.canView || loading} />
        </div>
        <div className="flex min-w-0 flex-wrap gap-2">
          <Button type="submit" variant="secondary" size="sm" disabled={!canCreate}>
            <Icon name="clipboard" /> {loading ? "Saving..." : "Draft preference"}
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={refreshPreferences} disabled={!canUse}>
            <Icon name="refresh" /> Load preferences
          </Button>
          <Button type="button" disabled variant="secondary" size="sm">
            <Icon name="lock" /> No hidden tracking
          </Button>
        </div>
        <p className="break-words text-xs font-black leading-5 text-slate-500">{notice || (duplicateRow ? `Duplicate blocked: ${duplicateRow.title}.` : "Preferences start as suggested memory, require source labels, reject secrets, and become operating guidance only after manual approval.")}</p>
      </form>

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-3">
          <SectionHeader title="John Preferences" description={`${preferenceCards.length || 0} active preference rows.`} />
          <div className="grid min-w-0 gap-2">
            {preferenceCards.length ? preferenceCards.map((item) => <StatusRow key={item.id} item={item} />) : <EmptyPanel>No approved personal preference memory is active yet.</EmptyPanel>}
          </div>
        </div>

        <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-3">
          <SectionHeader title="Work Style Memory" description={`${layer.workStyleCount || 0} remembered work-style rules.`} />
          <div className="grid min-w-0 gap-2">
            {(layer.workStyleRows || []).map((item) => <StatusRow key={item.id} item={item} />)}
          </div>
        </div>
      </div>

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-3">
          <SectionHeader title="Communication Preferences" description={`${layer.communicationCount || 0} communication rows.`} />
          <div className="grid min-w-0 gap-2">
            {(layer.communicationRows || []).map((item) => <StatusRow key={item.id} item={item} />)}
          </div>
        </div>

        <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-3">
          <SectionHeader title="Daily Focus" description={`${layer.dailyFocusCount || 0} daily focus rows.`} />
          <div className="grid min-w-0 gap-2">
            {(layer.dailyFocusRows || []).map((item) => <StatusRow key={item.id} item={item} />)}
          </div>
        </div>
      </div>

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-3">
          <SectionHeader title="Do Not Distract Unless" description={`${layer.distractionRuleCount || 0} interruption rules.`} />
          <div className="grid min-w-0 gap-2">
            {(layer.distractionRows || []).map((item) => <StatusRow key={item.id} item={item} />)}
          </div>
        </div>

        <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-3">
          <SectionHeader title="Background Vs Check-In" description={`${layer.backgroundCount || 0} private allowances and ${layer.checkInCount || 0} check-in rules.`} />
          <div className="grid min-w-0 gap-2">
            {(layer.backgroundRows || []).map((item) => <StatusRow key={item.id} item={item} />)}
            {(layer.checkInRows || []).map((item) => <StatusRow key={item.id} item={item} />)}
          </div>
        </div>
      </div>

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-3">
          <SectionHeader title="Preference Review" description={`${reviewRows.length || 0} personal-preference memory rows.`} />
          <div className="grid min-w-0 gap-2">
            {reviewRows.length ? reviewRows.slice(0, 6).map((row) => (
              <div key={row.id} className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="break-words text-[10px] font-black uppercase tracking-[0.16em] text-orange-700">personal preference</p>
                    <p className="mt-1 break-words text-sm font-black text-slate-950">{row.title}</p>
                    <p className="mt-1 break-words text-xs font-bold leading-5 text-slate-600">{row.body}</p>
                    <p className="mt-2 break-words text-[11px] font-black text-slate-500">Source: {row.sourceLabel || "Missing source"}{row.sourceUri ? ` | URI: ${row.sourceUri}` : ""}</p>
                  </div>
                  <ToneBadge tone={row.status === "approved" ? "green" : row.status === "archived" ? "slate" : "blue"}>{row.status}</ToneBadge>
                </div>
                <div className="mt-3 flex min-w-0 flex-wrap gap-2">
                  <Button type="button" variant="secondary" size="sm" onClick={() => setPreferenceStatus(row, "approved")} disabled={!canUse || row.status === "approved" || row.status === "archived"}>
                    <Icon name="check" /> Approve
                  </Button>
                  <Button type="button" variant="secondary" size="sm" onClick={() => setPreferenceStatus(row, "archived")} disabled={!canUse || row.status === "archived"}>
                    <Icon name="clock" /> Archive
                  </Button>
                </div>
              </div>
            )) : <EmptyPanel>No personal-preference memory rows are waiting for review.</EmptyPanel>}
          </div>
        </div>

        <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-3">
          <SectionHeader title="Personal Privacy Locks" description={`${layer.privacyLockCount || 0} privacy and tracking boundaries.`} />
          <div className="grid min-w-0 gap-2">
            {(layer.privacyRows || []).map((item) => <StatusRow key={item.id} item={item} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

const EMPTY_KNOWLEDGE_VAULT_FORM = {
  category: "app-docs",
  title: "",
  body: "",
  sourceType: "knowledge-upload",
  sourceLabel: "Apex Knowledge Vault",
  sourceUri: "",
  reviewNote: "Summary pending - manual review required.",
  status: "suggested",
  confidence: 70,
};

const KNOWLEDGE_VAULT_BODY_LIMIT = 1800;
const KNOWLEDGE_VAULT_EXTRACT_LIMIT = 6000;
const KNOWLEDGE_VAULT_DEFAULT_SOURCE_LABEL = EMPTY_KNOWLEDGE_VAULT_FORM.sourceLabel;

function categoryTitle(categories = [], id = "") {
  return categories.find((category) => category.id === id)?.title || String(id || "Knowledge").replace(/-/g, " ");
}

function fileSizeLabel(size = 0) {
  const bytes = Number(size) || 0;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} bytes`;
}

async function extractPdfKnowledgeText(file) {
  const data = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjsLib.getDocument({ data, disableWorker: true });
  try {
    const pdf = await loadingTask.promise;
    const pageTexts = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = content.items.map((item) => item.str || "").join(" ").replace(/\s+/g, " ").trim();
      if (text) pageTexts.push(text);
      if (pageTexts.join(" ").length >= KNOWLEDGE_VAULT_EXTRACT_LIMIT) break;
    }
    return {
      text: pageTexts.join("\n\n").slice(0, KNOWLEDGE_VAULT_EXTRACT_LIMIT),
      pageCount: pdf.numPages,
    };
  } finally {
    loadingTask.destroy?.();
  }
}

async function extractKnowledgeFileText(file) {
  if (/\\.pdf$/i.test(file.name) || file.type === "application/pdf") {
    return extractPdfKnowledgeText(file);
  }
  return {
    text: (await file.text()).slice(0, KNOWLEDGE_VAULT_EXTRACT_LIMIT),
    pageCount: 0,
  };
}

function knowledgeRowTimestamp(row = {}) {
  const timestamp = Date.parse(row.updatedAt || row.approvedAt || row.createdAt || "");
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function knowledgeDateRangeStart(dateRange = "all") {
  const now = Date.now();
  if (dateRange === "last-7-days") return now - 7 * 24 * 60 * 60 * 1000;
  if (dateRange === "last-30-days") return now - 30 * 24 * 60 * 60 * 1000;
  if (dateRange === "last-90-days") return now - 90 * 24 * 60 * 60 * 1000;
  return 0;
}

function knowledgeMatchesDateRange(row = {}, dateRange = "all") {
  const timestamp = knowledgeRowTimestamp(row);
  if (dateRange === "missing-date") return !timestamp;
  if (!dateRange || dateRange === "all") return true;
  return timestamp >= knowledgeDateRangeStart(dateRange);
}

function knowledgeDateRangeLabel(value = "all") {
  const labels = {
    all: "All dates",
    "last-7-days": "Last 7 days",
    "last-30-days": "Last 30 days",
    "last-90-days": "Last 90 days",
    "missing-date": "Missing date",
  };
  return labels[value] || "All dates";
}

function filterKnowledgeRows(rows = [], { category, source, status, query, dateRange = "all" } = {}) {
  const normalizedQuery = String(query || "").trim().toLowerCase();
  const normalizedSource = String(source || "all").trim().toLowerCase();
  return rows
    .filter((row) => !category || category === "all" || row.category === category)
    .filter((row) => !status || status === "all" || row.status === status)
    .filter((row) => source === "all" || [row.sourceLabel, row.sourceType, row.sourceUri].some((value) => String(value || "").toLowerCase().includes(normalizedSource)))
    .filter((row) => knowledgeMatchesDateRange(row, dateRange))
    .filter((row) => {
      if (!normalizedQuery) return true;
      return [row.title, row.body, row.sourceLabel, row.sourceUri, row.reviewNote, row.category].some((value) => String(value || "").toLowerCase().includes(normalizedQuery));
    });
}

function knowledgeDuplicateKeys({ category = "", title = "", sourceLabel = "", sourceUri = "" } = {}) {
  const normalizedCategory = String(category || "knowledge").trim().toLowerCase();
  const normalizedTitle = String(title || "").trim();
  const normalizedSourceLabel = String(sourceLabel || "").trim();
  const normalizedSourceUri = String(sourceUri || "").trim();
  return [
    normalizedSourceUri ? `${normalizedCategory}|uri|${normalizedSourceUri}` : "",
    normalizedSourceLabel && normalizedTitle ? `${normalizedCategory}|source-title|${normalizedSourceLabel}|${normalizedTitle}` : "",
  ]
    .map((value) => String(value || "").trim().toLowerCase())
    .filter(Boolean);
}

function formatKnowledgeVaultExport(rows = [], categories = []) {
  return JSON.stringify(rows.slice(0, 24).map((row) => ({
    title: row.title,
    category: categoryTitle(categories, row.category),
    status: row.status === "approved" ? "trusted" : row.status,
    sourceLabel: row.sourceLabel,
    sourceUri: row.sourceUri,
    sourceType: row.sourceType,
    summaryStatus: row.reviewNote,
    updatedAt: row.updatedAt,
  })), null, 2);
}

function KnowledgeVaultManager({ state, sessionToken }) {
  const [form, setForm] = useState(EMPTY_KNOWLEDGE_VAULT_FORM);
  const [vaultRows, setVaultRows] = useState(state.knowledgeVault?.vaultEntries || []);
  const [summary, setSummary] = useState(state.knowledgeVault?.vaultSummary || null);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRangeFilter, setDateRangeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [intelligence, setIntelligence] = useState(null);
  const [providerInsight, setProviderInsight] = useState(null);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const canUse = state.canView && Boolean(sessionToken) && !loading;
  const categoryIds = new Set((state.knowledgeVault?.categories || []).map((category) => category.id));
  const knowledgeRows = vaultRows.filter((row) => categoryIds.has(row.category));
  const duplicateKeys = new Set(knowledgeDuplicateKeys(form));
  const duplicateRow = duplicateKeys.size ? knowledgeRows.find((row) => row.status !== "archived" && knowledgeDuplicateKeys(row).some((key) => duplicateKeys.has(key))) : null;
  const canCreate = canUse && form.category && form.title.trim() && form.body.trim() && form.sourceLabel.trim() && !duplicateRow;
  const sourceOptions = [...new Set([
    ...(state.knowledgeVault?.sourceOptions || []),
    ...knowledgeRows.map((row) => row.sourceLabel).filter(Boolean),
  ])].sort((left, right) => left.toLowerCase().localeCompare(right.toLowerCase()));
  const visibleRows = filterKnowledgeRows(knowledgeRows, {
    category: categoryFilter,
    source: sourceFilter,
    status: statusFilter,
    query: search,
    dateRange: dateRangeFilter,
  });
  const intelligenceRows = [
    ...knowledgeRows,
    ...(state.decisionMemory?.durableEntries || []).filter((row) => row.status === "approved"),
  ];
  const localIntelligence = buildApexOsKnowledgeIntelligence(intelligenceRows, {
    query: search,
    category: categoryFilter,
    source: sourceFilter,
    status: statusFilter,
    dateRange: dateRangeFilter,
    limit: 8,
  });
  const activeIntelligence = intelligence || localIntelligence;
  const activeProviderInsight = providerInsight || {
    providerConfigured: false,
    mode: "local-knowledge-intelligence",
    providerSummary: "Local source ranking, summaries, confidence labels, and conflict warnings are available without provider setup.",
    classifications: [],
  };
  const activeSummary = summary || state.knowledgeVault?.vaultSummary || {
    total: knowledgeRows.length,
    trusted: knowledgeRows.filter((row) => row.status === "approved").length,
    suggested: knowledgeRows.filter((row) => row.status === "suggested").length,
    archived: knowledgeRows.filter((row) => row.status === "archived").length,
  };
  const reviewHistoryRows = (activeSummary.reviewHistory?.length ? activeSummary.reviewHistory : knowledgeRows)
    .filter((row) => categoryIds.has(row.category))
    .slice()
    .sort((left, right) => new Date(right.updatedAt || right.createdAt || 0).getTime() - new Date(left.updatedAt || left.createdAt || 0).getTime())
    .slice(0, 6);
  const exportText = formatKnowledgeVaultExport(visibleRows, state.knowledgeVault?.categories || []);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setNotice("");
  }

  function clearKnowledgeIntelligence() {
    setIntelligence(null);
    setProviderInsight(null);
  }

  function updateFromMemoryPayload(payload, message) {
    const rows = (payload.apexOsMemory || payload.companySettings?.apexOsMemory || []).filter((row) => categoryIds.has(row.category));
    setVaultRows(rows);
    const total = rows.length;
    setSummary({
      total,
      trusted: rows.filter((row) => row.status === "approved").length,
      suggested: rows.filter((row) => row.status === "suggested").length,
      archived: rows.filter((row) => row.status === "archived").length,
      sourceCount: new Set(rows.map((row) => row.sourceLabel).filter(Boolean)).size,
      sourceLabels: [...new Set(rows.map((row) => row.sourceLabel).filter(Boolean))],
      reviewHistory: rows
        .slice()
        .sort((left, right) => new Date(right.updatedAt || right.createdAt || 0).getTime() - new Date(left.updatedAt || left.createdAt || 0).getTime())
        .slice(0, 8),
    });
    clearKnowledgeIntelligence();
    setNotice(message);
  }

  async function refreshVault() {
    if (!canUse) return;
    setLoading(true);
    setNotice("");
    try {
      const payload = await getApexOsMemory(sessionToken);
      updateFromMemoryPayload(payload, "Knowledge vault loaded from private Apex OS memory.");
    } catch (error) {
      setNotice(error?.message || "Knowledge vault could not load right now.");
    } finally {
      setLoading(false);
    }
  }

  async function refreshIntelligence() {
    if (!canUse) return;
    setLoading(true);
    setNotice("");
    try {
      const payload = await getApexOsKnowledgeIntelligence(sessionToken, {
        query: search,
        category: categoryFilter,
        source: sourceFilter,
        status: statusFilter,
        dateRange: dateRangeFilter,
        limit: 8,
      });
      setIntelligence(payload.intelligence || null);
      setProviderInsight(payload.providerInsight || null);
      setNotice(`Knowledge Intelligence refreshed: ${payload.context?.sourceCount || 0} ranked source row${payload.context?.sourceCount === 1 ? "" : "s"} and ${payload.context?.conflictCount || 0} conflict warning${payload.context?.conflictCount === 1 ? "" : "s"}.`);
    } catch (error) {
      setNotice(error?.message || "Knowledge Intelligence could not refresh right now.");
    } finally {
      setLoading(false);
    }
  }

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const allowed = /\.(txt|md|markdown|json|csv|log|html|css|js|jsx|ts|tsx|pdf)$/i.test(file.name) || file.type === "application/pdf";
    if (!allowed) {
      setNotice("Use a text-based source file or PDF for this private vault intake.");
      return;
    }
    try {
      const extracted = await extractKnowledgeFileText(file);
      const body = extracted.text.slice(0, KNOWLEDGE_VAULT_BODY_LIMIT);
      if (!body.trim()) {
        setNotice("Apex could not find readable text in that file.");
        return;
      }
      const extractionSummary = `${file.type === "application/pdf" || /\.pdf$/i.test(file.name) ? `PDF text extracted${extracted.pageCount ? ` from ${extracted.pageCount} page${extracted.pageCount === 1 ? "" : "s"}` : ""}` : "Text file loaded"}; ${fileSizeLabel(file.size)}; ${extracted.text.length} characters read; ${Math.min(body.length, KNOWLEDGE_VAULT_BODY_LIMIT)} saved for review.`;
      setForm((current) => ({
        ...current,
        title: current.title.trim() ? current.title : file.name.replace(/\.[^.]+$/, ""),
        body,
        sourceType: "knowledge-upload",
        sourceLabel: file.name,
        sourceUri: `local-upload:${file.name}`,
        reviewNote: extractionSummary.slice(0, 300),
      }));
      setNotice(`${file.name} loaded locally as suggested knowledge. Review before drafting.`);
    } catch {
      setNotice("Apex could not read that local knowledge file.");
    }
  }

  async function submitKnowledge(event) {
    event.preventDefault();
    if (!canCreate) return;
    setLoading(true);
    setNotice("");
    try {
      const payload = await createApexOsMemory(sessionToken, {
        ...form,
        status: "suggested",
        sourceType: form.sourceType || "knowledge-upload",
      });
      setVaultRows((current) => [payload.apexOsMemoryEntry, ...current].filter(Boolean));
      setSummary((current) => ({
        total: (current?.total || activeSummary.total || 0) + 1,
        trusted: current?.trusted || activeSummary.trusted || 0,
        suggested: (current?.suggested || activeSummary.suggested || 0) + 1,
        archived: current?.archived || activeSummary.archived || 0,
        sourceCount: current?.sourceCount || activeSummary.sourceCount || sourceOptions.length,
        sourceLabels: current?.sourceLabels || activeSummary.sourceLabels || sourceOptions,
      }));
      setForm(EMPTY_KNOWLEDGE_VAULT_FORM);
      clearKnowledgeIntelligence();
      setNotice("Knowledge drafted as suggested. It is not trusted Apex context until manually approved.");
    } catch (error) {
      setNotice(error?.message || "Knowledge could not be saved right now.");
    } finally {
      setLoading(false);
    }
  }

  async function setKnowledgeStatus(row, status) {
    if (!canUse || !row?.id) return;
    setLoading(true);
    setNotice("");
    try {
      await updateApexOsMemory(sessionToken, row.id, { ...row, status });
      const payload = await getApexOsMemory(sessionToken);
      updateFromMemoryPayload(payload, status === "archived" ? "Knowledge archived from trusted context." : "Knowledge approved as trusted Apex OS memory.");
    } catch (error) {
      setNotice(error?.message || "Knowledge could not be updated right now.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-w-0 gap-4">
      <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatusRow item={{
          id: "vault-total",
          title: "Saved knowledge",
          status: `${activeSummary.total || 0}`,
          detail: `${activeSummary.trusted || 0} trusted, ${activeSummary.suggested || 0} suggested, ${activeSummary.archived || 0} archived.`,
          tone: activeSummary.trusted ? "green" : "blue",
        }} />
        <StatusRow item={{
          id: "vault-sources",
          title: "Source metadata",
          status: `${sourceOptions.length || activeSummary.sourceCount || 0}`,
          detail: "Each vault row keeps category, source label, source URI, review status, and summary status.",
          tone: "blue",
        }} />
        <StatusRow item={{
          id: "vault-review",
          title: "Manual review",
          status: "Required",
          detail: "Suggested uploads do not feed trusted Apex context until approved from this panel.",
          tone: "amber",
        }} />
        <StatusRow item={{
          id: "vault-boundary",
          title: "Private boundary",
          status: "Locked",
          detail: "No customer uploads, public publishing, provider calls, embeddings, or binary storage are created here.",
          tone: "amber",
        }} />
      </div>
      {duplicateRow ? (
        <StatusRow item={{
          id: "vault-duplicate-source",
          title: "Duplicate source guard",
          status: "Already saved",
          detail: `${duplicateRow.title || duplicateRow.sourceLabel || "This knowledge source"} is already in the vault. Archive the old row or change the source before drafting another copy.`,
          tone: "amber",
        }} />
      ) : null}

      <div className="grid min-w-0 gap-3 rounded-xl border border-slate-200 bg-white p-3">
        <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <SectionHeader title="Knowledge Intelligence" description="Source-ranked summaries, confidence, and conflict warnings for approved decisions and vault knowledge." />
          <Button type="button" variant="secondary" size="sm" onClick={refreshIntelligence} disabled={!canUse}>
            <Icon name="refresh" /> Refresh intelligence
          </Button>
        </div>
        <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatusRow item={{
            id: "knowledge-intelligence-ranking",
            title: "Source ranking",
            status: `${activeIntelligence.rankedRows?.length || 0} ranked`,
            detail: `${activeIntelligence.searchMode || "local-lexical"} search across category, source, status, date, title, body, and summary fields.`,
            tone: activeIntelligence.rankedRows?.length ? "green" : "amber",
          }} />
          <StatusRow item={{
            id: "knowledge-intelligence-conflicts",
            title: "Conflict warnings",
            status: `${activeIntelligence.conflictWarnings?.length || 0}`,
            detail: activeIntelligence.conflictWarnings?.length ? "Review warnings before approving or relying on matching knowledge." : "No conflicts found against current rules or older active memory.",
            tone: activeIntelligence.conflictWarnings?.length ? "amber" : "green",
          }} />
          <StatusRow item={{
            id: "knowledge-intelligence-provider",
            title: "AI summaries",
            status: activeProviderInsight.providerConfigured ? "Server provider" : "Local fallback",
            detail: activeProviderInsight.providerSummary || "Server-side summaries run only when OPENAI_API_KEY is configured.",
            tone: activeProviderInsight.providerConfigured ? "green" : "blue",
          }} />
          <StatusRow item={{
            id: "knowledge-intelligence-embeddings",
            title: "Vector search",
            status: "Locked",
            detail: activeIntelligence.embeddingStatus || "Embeddings require private storage/schema approval.",
            tone: "amber",
          }} />
        </div>

        {activeIntelligence.conflictWarnings?.length ? (
          <div className="grid min-w-0 gap-2">
            {activeIntelligence.conflictWarnings.slice(0, 3).map((warning) => (
              <StatusRow key={warning.id} item={{
                id: warning.id,
                title: warning.title,
                status: warning.rowStatus === "approved" ? "Trusted conflict" : "Suggested conflict",
                detail: `${warning.rowTitle}: ${warning.detail} ${warning.trustedImpact || ""}`,
                tone: warning.severity === "high" ? "red" : "amber",
              }} />
            ))}
          </div>
        ) : null}

        <div className="grid min-w-0 gap-3 lg:grid-cols-2">
          <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <SectionHeader title="Ranked Evidence" description={`${knowledgeDateRangeLabel(dateRangeFilter)} / ${activeIntelligence.rankedRows?.length || 0} source rows.`} />
            <div className="grid min-w-0 gap-2">
              {activeIntelligence.rankedRows?.length ? activeIntelligence.rankedRows.slice(0, 4).map((row) => (
                <StatusRow key={`knowledge-rank-${row.id}`} item={{
                  id: `knowledge-rank-${row.id}`,
                  title: `${row.rank}. ${row.title}`,
                  status: row.confidenceLabel,
                  detail: `${row.documentSummary?.summary || "No summary yet."} Source: ${row.sourceLabel || "Missing source"}.`,
                  tone: row.confidenceLabel === "High" ? "green" : row.confidenceLabel === "Medium" ? "blue" : "amber",
                }} />
              )) : <EmptyPanel>No ranked knowledge rows match the current filters.</EmptyPanel>}
            </div>
          </div>
          <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <SectionHeader title="Confidence Labels" description="Apex shows why source rows are useful before they influence decisions." />
            <div className="grid min-w-0 gap-2">
              {activeIntelligence.confidenceRows?.length ? activeIntelligence.confidenceRows.map((row) => (
                <StatusRow key={`knowledge-confidence-${row.id}`} item={{
                  id: `knowledge-confidence-${row.id}`,
                  title: row.title,
                  status: `${row.confidenceLabel} ${row.confidence || 0}`,
                  detail: `Source: ${row.sourceLabel || "Missing source"}. Confidence is local source relevance, not automatic truth.`,
                  tone: row.confidenceLabel === "High" ? "green" : row.confidenceLabel === "Medium" ? "blue" : "amber",
                }} />
              )) : <EmptyPanel>No confidence rows are visible yet.</EmptyPanel>}
            </div>
          </div>
        </div>
      </div>

      <form className="grid min-w-0 gap-3 rounded-xl border border-slate-200 bg-white p-3" onSubmit={submitKnowledge}>
        <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_260px]">
          <input
            value={form.title}
            onChange={(event) => updateField("title", event.target.value)}
            maxLength={140}
            placeholder="Knowledge title"
            className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700"
            disabled={!state.canView || loading}
          />
          <select
            value={form.category}
            onChange={(event) => updateField("category", event.target.value)}
            className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700"
            disabled={!state.canView || loading}
          >
            {(state.knowledgeVault?.categories || []).map((category) => (
              <option key={category.id} value={category.id}>{category.title}</option>
            ))}
          </select>
        </div>
        <textarea
          value={form.body}
          onChange={(event) => updateField("body", event.target.value)}
          maxLength={1800}
          placeholder="Knowledge summary or uploaded text"
          className="min-h-24 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold leading-6 text-slate-700"
          disabled={!state.canView || loading}
        />
        <div className="grid min-w-0 gap-3 lg:grid-cols-4">
          <input value={form.sourceLabel} onChange={(event) => updateField("sourceLabel", event.target.value)} maxLength={120} placeholder="Source label" className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700" disabled={!state.canView || loading} />
          <input value={form.sourceUri} onChange={(event) => updateField("sourceUri", event.target.value)} maxLength={240} placeholder="Source URI or file" className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700" disabled={!state.canView || loading} />
          <input value={form.reviewNote} onChange={(event) => updateField("reviewNote", event.target.value)} maxLength={300} placeholder="Summary status" className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700" disabled={!state.canView || loading} />
          <input type="file" accept=".txt,.md,.markdown,.json,.csv,.log,.html,.css,.js,.jsx,.ts,.tsx,.pdf,text/*,application/pdf" onChange={handleFileChange} className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-xs file:font-black file:text-white" disabled={!state.canView || loading} />
        </div>
        <div className="flex min-w-0 flex-wrap gap-2">
          <Button type="submit" variant="secondary" size="sm" disabled={!canCreate}>
            <Icon name="upload" /> {loading ? "Saving..." : "Draft knowledge"}
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={refreshVault} disabled={!canUse}>
            <Icon name="refresh" /> Load vault
          </Button>
          <Button type="button" disabled variant="secondary" size="sm">
            <Icon name="lock" /> Review required
          </Button>
        </div>
        <p className="break-words text-xs font-black leading-5 text-slate-500">{notice || "Text files and PDFs are read locally, saved as suggested Apex OS memory with source metadata, and blocked if they include secrets or customer emails."}</p>
      </form>

      <div className="grid min-w-0 gap-3 rounded-xl border border-slate-200 bg-white p-3">
        <div className="grid min-w-0 gap-3 lg:grid-cols-5">
          <input value={search} onChange={(event) => { setSearch(event.target.value); clearKnowledgeIntelligence(); }} placeholder="Search vault" className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700" />
          <select value={categoryFilter} onChange={(event) => { setCategoryFilter(event.target.value); clearKnowledgeIntelligence(); }} className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700">
            <option value="all">All categories</option>
            {(state.knowledgeVault?.categories || []).map((category) => <option key={category.id} value={category.id}>{category.title}</option>)}
          </select>
          <select value={sourceFilter} onChange={(event) => { setSourceFilter(event.target.value); clearKnowledgeIntelligence(); }} className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700">
            <option value="all">All sources</option>
            {sourceOptions.map((source) => <option key={source} value={source}>{source}</option>)}
          </select>
          <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); clearKnowledgeIntelligence(); }} className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700">
            <option value="all">All review states</option>
            <option value="suggested">Suggested</option>
            <option value="approved">Trusted</option>
            <option value="archived">Archived</option>
          </select>
          <select value={dateRangeFilter} onChange={(event) => { setDateRangeFilter(event.target.value); clearKnowledgeIntelligence(); }} className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700">
            {APEX_OS_KNOWLEDGE_DATE_RANGE_VALUES.map((value) => <option key={value} value={value}>{knowledgeDateRangeLabel(value)}</option>)}
          </select>
        </div>
        <p className="break-words text-xs font-black text-slate-500">Showing {visibleRows.length} of {knowledgeRows.length} vault row{knowledgeRows.length === 1 ? "" : "s"}.</p>
      </div>

      <div className="grid min-w-0 gap-3">
        {visibleRows.length ? visibleRows.slice(0, 8).map((row) => (
          <div key={row.id} className="min-w-0 rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="break-words text-[10px] font-black uppercase tracking-[0.16em] text-orange-700">{categoryTitle(state.knowledgeVault?.categories, row.category)}</p>
                <p className="mt-1 break-words text-sm font-black text-slate-950">{row.title}</p>
                <p className="mt-1 break-words text-xs font-bold leading-5 text-slate-600">{row.body}</p>
                <p className="mt-2 break-words text-[11px] font-black text-slate-500">Source: {row.sourceLabel || "Missing source"}{row.sourceUri ? ` | ${row.sourceUri}` : ""}</p>
                {row.reviewNote ? <p className="mt-1 break-words text-[11px] font-black text-slate-500">Summary: {row.reviewNote}</p> : null}
              </div>
              <ToneBadge tone={row.status === "approved" ? "green" : row.status === "archived" ? "slate" : "blue"}>{row.status === "approved" ? "trusted" : row.status}</ToneBadge>
            </div>
            <div className="mt-3 flex min-w-0 flex-wrap gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => setKnowledgeStatus(row, "approved")} disabled={!canUse || row.status === "approved" || row.status === "archived"}>
                <Icon name="check" /> Approve
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={() => setKnowledgeStatus(row, "archived")} disabled={!canUse || row.status === "archived"}>
                <Icon name="clock" /> Archive
              </Button>
            </div>
          </div>
        )) : (
          <EmptyPanel>No knowledge rows match the current vault filters.</EmptyPanel>
        )}
      </div>

      <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-3">
          <SectionHeader title="Vault Review History" description={`${reviewHistoryRows.length || 0} latest private knowledge review rows.`} />
          <div className="grid min-w-0 gap-2">
            {reviewHistoryRows.length ? reviewHistoryRows.map((row) => (
              <StatusRow key={`vault-history-${row.id}`} item={{
                id: `vault-history-${row.id}`,
                title: row.title,
                status: row.status === "approved" ? "trusted" : row.status,
                detail: `${categoryTitle(state.knowledgeVault?.categories, row.category)} | Source: ${row.sourceLabel || "Missing source"}${row.sourceUri ? ` | ${row.sourceUri}` : ""}. ${row.reviewNote || "No summary status."}`,
                tone: row.status === "approved" ? "green" : row.status === "archived" ? "slate" : "blue",
              }} />
            )) : <EmptyPanel>No vault review history is visible yet.</EmptyPanel>}
          </div>
        </div>

        <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-3">
          <SectionHeader title="Knowledge Export" description="Copyable private JSON for matching vault rows." />
          <textarea
            readOnly
            value={exportText}
            className="mt-3 min-h-48 w-full resize-y rounded-xl border border-slate-200 bg-slate-950 px-3 py-3 font-mono text-xs font-bold leading-5 text-slate-100"
          />
        </div>
      </div>
    </div>
  );
}

const EMPTY_APPROVAL_PACKET_FORM = {
  title: "",
  requestedActionCategory: "deploy",
  riskLevel: "high",
  action: "",
  reason: "",
  affectedScope: "",
  validationPlan: "",
  rollbackPlan: "",
  exactApprovalPhrase: "",
  sourceLabel: "Apex Control Room",
  sourceUri: "",
  status: "draft",
};

function ApprovalPacketDraftPanel({ state, sessionToken }) {
  const [form, setForm] = useState(EMPTY_APPROVAL_PACKET_FORM);
  const [packets, setPackets] = useState([]);
  const [summary, setSummary] = useState(null);
  const [approvalPhrases, setApprovalPhrases] = useState({});
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const canUse = state.canView && Boolean(sessionToken) && !loading;
  const canCreate = canUse && form.title.trim() && form.action.trim() && form.sourceLabel.trim();

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setNotice("");
  }

  async function refreshPackets() {
    if (!canUse) return;
    setLoading(true);
    setNotice("");
    try {
      const payload = await getApexOsApprovalPackets(sessionToken);
      setPackets(payload.apexOsApprovalPackets || []);
      setSummary(payload.summary || null);
      setNotice("Approval packets loaded from private Apex OS storage.");
    } catch (error) {
      setNotice(error?.message || "Approval packets could not load right now.");
    } finally {
      setLoading(false);
    }
  }

  async function submitPacket(event) {
    event.preventDefault();
    if (!canCreate) return;
    setLoading(true);
    setNotice("");
    try {
      const payload = await createApexOsApprovalPacket(sessionToken, form);
      setPackets((current) => [payload.apexOsApprovalPacket, ...current].filter(Boolean));
      setSummary((current) => ({
        total: (current?.total || 0) + 1,
        draft: (current?.draft || 0) + (payload.apexOsApprovalPacket?.status === "draft" ? 1 : 0),
        ready: (current?.ready || 0) + (payload.apexOsApprovalPacket?.status === "ready" ? 1 : 0),
        approved: (current?.approved || 0) + (payload.apexOsApprovalPacket?.status === "approved" ? 1 : 0),
        rejected: (current?.rejected || 0) + (payload.apexOsApprovalPacket?.status === "rejected" ? 1 : 0),
        deferred: (current?.deferred || 0) + (payload.apexOsApprovalPacket?.status === "deferred" ? 1 : 0),
        blocked: (current?.blocked || 0) + (payload.apexOsApprovalPacket?.status === "blocked" ? 1 : 0),
        archived: current?.archived || 0,
      }));
      setForm(EMPTY_APPROVAL_PACKET_FORM);
      setNotice("Approval packet drafted. It does not execute the action.");
    } catch (error) {
      setNotice(error?.message || "Approval packet could not be saved right now.");
    } finally {
      setLoading(false);
    }
  }

  function updateApprovalPhrase(packetId, value) {
    setApprovalPhrases((current) => ({ ...current, [packetId]: value }));
    setNotice("");
  }

  async function setPacketStatus(packet, status, extra = {}) {
    if (!canUse || !packet?.id) return;
    setLoading(true);
    setNotice("");
    try {
      await updateApexOsApprovalPacket(sessionToken, packet.id, { ...packet, ...extra, status });
      const payload = await getApexOsApprovalPackets(sessionToken);
      setPackets(payload.apexOsApprovalPackets || []);
      setSummary(payload.summary || null);
      setApprovalPhrases((current) => ({ ...current, [packet.id]: "" }));
      setNotice(status === "approved" ? "Approval recorded. Execution remains locked." : status === "archived" ? "Packet archived. No action executed." : "Packet decision updated. Execution remains locked.");
    } catch (error) {
      setNotice(error?.message || "Approval packet could not be updated right now.");
    } finally {
      setLoading(false);
    }
  }

  const activeSummary = summary || { total: packets.length, draft: 0, ready: 0, approved: 0, rejected: 0, deferred: 0, blocked: 0, archived: 0 };

  return (
    <div className="grid min-w-0 gap-4">
      <div className="grid min-w-0 gap-3">
        <StatusRow item={{
          id: "approval-packet-total",
          title: "Saved packets",
          status: `${activeSummary.total || 0}`,
          detail: `${activeSummary.ready || 0} ready, ${activeSummary.approved || 0} approved, ${activeSummary.rejected || 0} rejected, ${activeSummary.deferred || 0} deferred.`,
          tone: activeSummary.approved || activeSummary.ready ? "green" : "blue",
        }} />
        <StatusRow item={{
          id: "approval-packet-execution-lock",
          title: "Approval execution",
          status: "Locked",
          detail: "This phase can record approval decisions, but it cannot deploy, send, spend, publish, delete, bill, or mutate production.",
          tone: "amber",
        }} />
        <StatusRow item={{
          id: "approval-packet-risk-score",
          title: "Risk scoring",
          status: "Active",
          detail: "Each packet returns a risk score and band from declared risk, requested category, and missing readiness fields.",
          tone: "blue",
        }} />
      </div>

      <form className="grid min-w-0 gap-3 rounded-xl border border-slate-200 bg-white p-3" onSubmit={submitPacket}>
        <div className="grid min-w-0 gap-3 lg:grid-cols-2">
          <input
            value={form.title}
            onChange={(event) => updateField("title", event.target.value)}
            maxLength={160}
            placeholder="Action title"
            className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700"
            disabled={!state.canView || loading}
          />
          <div className="grid min-w-0 gap-3 sm:grid-cols-3">
            <select
              value={form.requestedActionCategory}
              onChange={(event) => updateField("requestedActionCategory", event.target.value)}
              className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700"
              disabled={!state.canView || loading}
            >
              <option value="deploy">Deploy</option>
              <option value="production-data">Production data</option>
              <option value="schema-auth-session">Schema/auth/session</option>
              <option value="customer-visible">Customer-visible</option>
              <option value="email-sms">Email/SMS</option>
              <option value="billing-payment">Billing/payment</option>
              <option value="ad-spend-publishing">Ads/publishing</option>
              <option value="provider-connection">Provider</option>
              <option value="file-deletion">File deletion</option>
              <option value="business-operations">Business ops</option>
              <option value="general">General</option>
            </select>
            <select
              value={form.riskLevel}
              onChange={(event) => updateField("riskLevel", event.target.value)}
              className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700"
              disabled={!state.canView || loading}
            >
              <option value="low">Low risk</option>
              <option value="medium">Medium risk</option>
              <option value="high">High risk</option>
              <option value="critical">Critical risk</option>
            </select>
            <select
              value={form.status}
              onChange={(event) => updateField("status", event.target.value)}
              className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700"
              disabled={!state.canView || loading}
            >
              <option value="draft">Draft</option>
              <option value="ready">Ready</option>
              <option value="blocked">Blocked</option>
            </select>
          </div>
        </div>
        <textarea
          value={form.action}
          onChange={(event) => updateField("action", event.target.value)}
          maxLength={1800}
          placeholder="What action is being requested?"
          className="min-h-20 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold leading-6 text-slate-700"
          disabled={!state.canView || loading}
        />
        <div className="grid min-w-0 gap-3 lg:grid-cols-2">
          <textarea value={form.reason} onChange={(event) => updateField("reason", event.target.value)} maxLength={1800} placeholder="Why this matters" className="min-h-20 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold leading-6 text-slate-700" disabled={!state.canView || loading} />
          <textarea value={form.affectedScope} onChange={(event) => updateField("affectedScope", event.target.value)} maxLength={1800} placeholder="Affected files, data, users, or systems" className="min-h-20 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold leading-6 text-slate-700" disabled={!state.canView || loading} />
          <textarea value={form.validationPlan} onChange={(event) => updateField("validationPlan", event.target.value)} maxLength={1800} placeholder="Validation plan" className="min-h-20 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold leading-6 text-slate-700" disabled={!state.canView || loading} />
          <textarea value={form.rollbackPlan} onChange={(event) => updateField("rollbackPlan", event.target.value)} maxLength={1800} placeholder="Rollback plan" className="min-h-20 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold leading-6 text-slate-700" disabled={!state.canView || loading} />
        </div>
        <div className="grid min-w-0 gap-3 lg:grid-cols-3">
          <input value={form.exactApprovalPhrase} onChange={(event) => updateField("exactApprovalPhrase", event.target.value)} maxLength={140} placeholder="Exact approval phrase" className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700" disabled={!state.canView || loading} />
          <input value={form.sourceLabel} onChange={(event) => updateField("sourceLabel", event.target.value)} maxLength={140} placeholder="Source label" className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700" disabled={!state.canView || loading} />
          <input value={form.sourceUri} onChange={(event) => updateField("sourceUri", event.target.value)} maxLength={260} placeholder="Source URI or file" className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700" disabled={!state.canView || loading} />
        </div>
        <div className="flex min-w-0 flex-wrap gap-2">
          <Button type="submit" variant="secondary" size="sm" disabled={!canCreate}>
            <Icon name="clipboard" /> {loading ? "Saving..." : "Draft packet"}
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={refreshPackets} disabled={!canUse}>
            <Icon name="refresh" /> Load packets
          </Button>
          <Button type="button" disabled variant="secondary" size="sm">
            <Icon name="lock" /> Execute locked
          </Button>
        </div>
        <p className="break-words text-xs font-black leading-5 text-slate-500">{notice || "Ready packets require source, validation, rollback, affected scope, and exact approval phrase. Approved packets record review only; execution is still separate and locked."}</p>
      </form>

      <div className="grid min-w-0 gap-3">
        {packets.length ? packets.slice(0, 5).map((packet) => (
          <div key={packet.id} className="min-w-0 rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="break-words text-sm font-black text-slate-950">{packet.title}</p>
                <p className="mt-1 break-words text-xs font-bold leading-5 text-slate-600">{packet.action}</p>
                <p className="mt-2 break-words text-[11px] font-black text-slate-500">Source: {packet.sourceLabel || "Missing source"} | Risk: {packet.riskLevel} | Score: {packet.riskAssessment?.score ?? "n/a"} {packet.riskAssessment?.band ? `(${packet.riskAssessment.band})` : ""}</p>
                {packet.status === "approved" && packet.approvedAt ? <p className="mt-2 break-words text-[11px] font-black text-emerald-700">Approved at {packet.approvedAt}. Execution locked.</p> : null}
                {packet.missingFields?.length ? <p className="mt-2 break-words text-[11px] font-black text-amber-700">Missing: {packet.missingFields.join(", ")}</p> : null}
              </div>
              <ToneBadge tone={packet.status === "approved" || packet.status === "ready" ? "green" : packet.status === "blocked" || packet.status === "rejected" ? "red" : packet.status === "archived" || packet.status === "deferred" ? "slate" : "blue"}>{packet.status}</ToneBadge>
            </div>
            <div className="mt-3 grid min-w-0 gap-2 lg:grid-cols-[minmax(0,1fr)_auto]">
              <input
                value={approvalPhrases[packet.id] || ""}
                onChange={(event) => updateApprovalPhrase(packet.id, event.target.value)}
                maxLength={140}
                placeholder="Type exact approval phrase to record approval"
                className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700"
                disabled={!canUse || packet.status === "archived" || packet.status === "approved"}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setPacketStatus(packet, "approved", { approvalPhraseConfirmation: approvalPhrases[packet.id] || "" })}
                disabled={!canUse || packet.status === "archived" || packet.status === "approved" || !(approvalPhrases[packet.id] || "").trim()}
              >
                <Icon name="check" /> Record approval
              </Button>
            </div>
            <div className="mt-3 flex min-w-0 flex-wrap gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => setPacketStatus(packet, "ready")} disabled={!canUse || packet.status === "ready" || packet.status === "archived"}>
                <Icon name="check" /> Mark ready
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={() => setPacketStatus(packet, "blocked")} disabled={!canUse || packet.status === "blocked" || packet.status === "archived"}>
                <Icon name="alert" /> Mark blocked
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={() => setPacketStatus(packet, "rejected")} disabled={!canUse || packet.status === "rejected" || packet.status === "archived"}>
                <Icon name="alert" /> Reject
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={() => setPacketStatus(packet, "deferred")} disabled={!canUse || packet.status === "deferred" || packet.status === "archived"}>
                <Icon name="clock" /> Defer
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={() => setPacketStatus(packet, "archived")} disabled={!canUse || packet.status === "archived"}>
                <Icon name="clock" /> Archive
              </Button>
              <Button type="button" disabled variant="secondary" size="sm">
                <Icon name="lock" /> Execute locked
              </Button>
            </div>
          </div>
        )) : (
          <EmptyPanel>No durable approval packet drafts loaded yet.</EmptyPanel>
        )}
      </div>
    </div>
  );
}

const EMPTY_EXECUTION_HANDOFF_FORM = {
  title: "",
  agentRole: "build",
  workType: "local-code-plan",
  riskLevel: "medium",
  sourceApprovalPacketId: "",
  sourceChatRequestId: "",
  sourceQuestion: "",
  objective: "",
  sourceEvidence: "",
  allowedActions: "Read files, draft local code or docs, run local tests, and report evidence.",
  blockedActions: "No deploy, sends, spend, provider setup, production mutation, customer-visible changes, deletion, or irreversible actions.",
  validationPlan: "",
  validationResults: "",
  rollbackPlan: "",
  resultReport: "",
  decisionMemoryUpdate: "",
  handoffPrompt: "",
  sourceLabel: "Apex Control Room",
  sourceUri: "",
  status: "draft",
  workstreamStatus: "planned",
};

const EMPTY_AGENT_CONTROL_FORM = {
  title: "",
  requestType: "scoped-run",
  agentRole: "build",
  riskLevel: "medium",
  objective: "",
  scope: "Apex OS private operator work only. No customer-visible, provider, billing, spend, production data, deletion, or irreversible action.",
  validationPlan: "Run focused tests, build, and browser/mobile QA before closing this request.",
  rollbackPlan: "Close or archive this request and revert the scoped branch commit if validation fails.",
  sourceLabel: "Apex Control Room",
  sourceUri: "",
  status: "requested",
};

function AgentControlPlanePanel({ state, sessionToken }) {
  const [form, setForm] = useState(EMPTY_AGENT_CONTROL_FORM);
  const [controlPlane, setControlPlane] = useState(null);
  const [requests, setRequests] = useState([]);
  const [summary, setSummary] = useState(null);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const canUse = state.canView && Boolean(sessionToken) && !loading;
  const canCreate = canUse && form.title.trim() && form.objective.trim() && form.sourceLabel.trim();
  const activePlane = controlPlane || state.agentControlPlane || {};
  const activeSummary = summary || activePlane.requestSummary || { total: 0, active: 0, ready: 0, blocked: 0 };

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setNotice("");
  }

  async function refreshControlPlane() {
    if (!canUse) return;
    setLoading(true);
    setNotice("");
    try {
      const payload = await getApexOsAgentControl(sessionToken);
      setControlPlane(payload.controlPlane || null);
      setRequests(payload.apexOsAgentControlRequests || []);
      setSummary(payload.summary || null);
      setNotice("Agent control plane loaded from private Apex OS storage.");
    } catch (error) {
      setNotice(error?.message || "Agent control plane could not load right now.");
    } finally {
      setLoading(false);
    }
  }

  async function submitRequest(event) {
    event.preventDefault();
    if (!canCreate) return;
    setLoading(true);
    setNotice("");
    try {
      const payload = await createApexOsAgentControlRequest(sessionToken, form);
      setRequests((current) => [payload.apexOsAgentControlRequest, ...current].filter(Boolean));
      setSummary((current) => ({
        total: (current?.total || activeSummary.total || 0) + 1,
        active: (current?.active || activeSummary.active || 0) + (payload.apexOsAgentControlRequest?.status === "archived" ? 0 : 1),
        requested: (current?.requested || activeSummary.requested || 0) + (payload.apexOsAgentControlRequest?.status === "requested" ? 1 : 0),
        ready: (current?.ready || activeSummary.ready || 0) + (payload.apexOsAgentControlRequest?.status === "ready" ? 1 : 0),
        blocked: (current?.blocked || activeSummary.blocked || 0) + (payload.apexOsAgentControlRequest?.status === "blocked" ? 1 : 0),
      }));
      setForm(EMPTY_AGENT_CONTROL_FORM);
      setNotice("Agent control request saved. It cannot queue or run agents.");
    } catch (error) {
      setNotice(error?.message || "Agent control request could not be saved right now.");
    } finally {
      setLoading(false);
    }
  }

  async function setRequestStatus(request, status) {
    if (!canUse || !request?.id) return;
    setLoading(true);
    setNotice("");
    try {
      await updateApexOsAgentControlRequest(sessionToken, request.id, { ...request, status });
      const payload = await getApexOsAgentControl(sessionToken);
      setControlPlane(payload.controlPlane || null);
      setRequests(payload.apexOsAgentControlRequests || []);
      setSummary(payload.summary || null);
      setNotice(status === "closed" ? "Request closed. No agent was queued or run." : "Request status updated. Execution remains locked.");
    } catch (error) {
      setNotice(error?.message || "Agent control request could not be updated right now.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-w-0 gap-4">
      <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatusRow item={{
          id: "agent-control-total",
          title: "Control requests",
          status: `${activeSummary.total || 0}`,
          detail: `${activeSummary.active || 0} active, ${activeSummary.ready || 0} ready, ${activeSummary.blocked || 0} blocked.`,
          tone: activeSummary.blocked ? "amber" : activeSummary.active ? "green" : "blue",
        }} />
        <StatusRow item={{
          id: "agent-control-roles",
          title: "Agent roster",
          status: `${activePlane.roleCount || activePlane.rosterRows?.length || 0} roles`,
          detail: "Build, QA, release, marketing, sales, customer success, and monitoring are visible from this control plane.",
          tone: "blue",
        }} />
        <StatusRow item={{
          id: "agent-control-execution",
          title: "Execution",
          status: "Locked",
          detail: "Requests prepare explicit operator work packages; this panel has no queue, run, send, spend, delete, or deploy action.",
          tone: "amber",
        }} />
      </div>

      <div className="grid min-w-0 gap-3 lg:grid-cols-2 xl:grid-cols-4">
        {(activePlane.rosterRows || []).map((item) => (
          <StatusRow key={item.id} item={{
            id: item.id,
            title: item.title,
            status: item.status,
            detail: `${item.currentTask || item.detail} Next: ${item.nextAction || "Review scoped work."}`,
            meta: item.lastUpdate,
            tone: item.tone,
          }} />
        ))}
      </div>

      <form className="grid min-w-0 gap-3 rounded-xl border border-slate-200 bg-white p-3" onSubmit={submitRequest}>
        <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <input
            value={form.title}
            onChange={(event) => updateField("title", event.target.value)}
            maxLength={160}
            placeholder="Control request title"
            className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700"
            disabled={!state.canView || loading}
          />
          <div className="grid min-w-0 gap-3 sm:grid-cols-4">
            <select value={form.requestType} onChange={(event) => updateField("requestType", event.target.value)} className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700" disabled={!state.canView || loading}>
              <option value="scoped-run">Scoped run</option>
              <option value="pause">Pause</option>
              <option value="resume">Resume</option>
            </select>
            <select value={form.agentRole} onChange={(event) => updateField("agentRole", event.target.value)} className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700" disabled={!state.canView || loading}>
              <option value="build">Build</option>
              <option value="qa">QA</option>
              <option value="release">Release</option>
              <option value="marketing">Marketing</option>
              <option value="sales">Sales</option>
              <option value="customer-success">Customer success</option>
              <option value="monitoring">Monitoring</option>
            </select>
            <select value={form.riskLevel} onChange={(event) => updateField("riskLevel", event.target.value)} className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700" disabled={!state.canView || loading}>
              <option value="low">Low risk</option>
              <option value="medium">Medium risk</option>
              <option value="high">High risk</option>
              <option value="critical">Critical risk</option>
            </select>
            <select value={form.status} onChange={(event) => updateField("status", event.target.value)} className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700" disabled={!state.canView || loading}>
              <option value="requested">Requested</option>
              <option value="ready">Ready</option>
              <option value="blocked">Blocked</option>
            </select>
          </div>
        </div>
        <textarea value={form.objective} onChange={(event) => updateField("objective", event.target.value)} maxLength={1800} placeholder="Objective for the agent control request" className="min-h-20 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold leading-6 text-slate-700" disabled={!state.canView || loading} />
        <div className="grid min-w-0 gap-3 lg:grid-cols-2">
          <textarea value={form.scope} onChange={(event) => updateField("scope", event.target.value)} maxLength={1800} placeholder="Allowed scope and blocked boundaries" className="min-h-20 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold leading-6 text-slate-700" disabled={!state.canView || loading} />
          <textarea value={form.validationPlan} onChange={(event) => updateField("validationPlan", event.target.value)} maxLength={1800} placeholder="Validation plan" className="min-h-20 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold leading-6 text-slate-700" disabled={!state.canView || loading} />
          <textarea value={form.rollbackPlan} onChange={(event) => updateField("rollbackPlan", event.target.value)} maxLength={1800} placeholder="Rollback plan" className="min-h-20 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold leading-6 text-slate-700" disabled={!state.canView || loading} />
          <div className="grid min-w-0 gap-3">
            <input value={form.sourceLabel} onChange={(event) => updateField("sourceLabel", event.target.value)} maxLength={140} placeholder="Source label" className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700" disabled={!state.canView || loading} />
            <input value={form.sourceUri} onChange={(event) => updateField("sourceUri", event.target.value)} maxLength={260} placeholder="Source URI or file" className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700" disabled={!state.canView || loading} />
          </div>
        </div>
        <div className="flex min-w-0 flex-wrap gap-2">
          <Button type="submit" variant="secondary" size="sm" disabled={!canCreate}>
            <Icon name="clipboard" /> {loading ? "Saving..." : "Request control"}
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={refreshControlPlane} disabled={!canUse}>
            <Icon name="refresh" /> Load controls
          </Button>
          <Button type="button" disabled variant="secondary" size="sm">
            <Icon name="lock" /> Execute locked
          </Button>
          <Button type="button" disabled variant="secondary" size="sm">
            <Icon name="lock" /> Background loops locked
          </Button>
        </div>
        <p className="break-words text-xs font-black leading-5 text-slate-500">{notice || "Pause, resume, and scoped-run requests are durable operator records only. They do not run agents or perform external actions."}</p>
      </form>

      <div className="grid min-w-0 gap-3 lg:grid-cols-2">
        {requests.length ? requests.slice(0, 6).map((request) => (
          <div key={request.id} className="min-w-0 rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="break-words text-sm font-black text-slate-950">{request.title}</p>
                <p className="mt-1 break-words text-xs font-bold leading-5 text-slate-600">{request.objective}</p>
                <p className="mt-2 break-words text-[11px] font-black text-slate-500">Type: {request.requestType} | Role: {request.agentRole} | Source: {request.sourceLabel || "Missing source"}</p>
                {request.missingFields?.length ? <p className="mt-2 break-words text-[11px] font-black text-amber-700">Missing: {request.missingFields.join(", ")}</p> : null}
              </div>
              <ToneBadge tone={request.status === "ready" ? "green" : request.status === "blocked" ? "red" : request.status === "archived" || request.status === "closed" ? "slate" : "blue"}>{request.status}</ToneBadge>
            </div>
            <div className="mt-3 flex min-w-0 flex-wrap gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => setRequestStatus(request, "ready")} disabled={!canUse || request.status === "ready" || request.status === "archived" || request.status === "closed"}>
                <Icon name="check" /> Mark ready
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={() => setRequestStatus(request, "blocked")} disabled={!canUse || request.status === "blocked" || request.status === "archived" || request.status === "closed"}>
                <Icon name="alert" /> Block
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={() => setRequestStatus(request, "closed")} disabled={!canUse || request.status === "closed" || request.status === "archived"}>
                <Icon name="check" /> Close
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={() => setRequestStatus(request, "archived")} disabled={!canUse || request.status === "archived"}>
                <Icon name="clock" /> Archive
              </Button>
              <Button type="button" disabled variant="secondary" size="sm">
                <Icon name="lock" /> Run locked
              </Button>
            </div>
          </div>
        )) : activePlane.requestRows?.length ? (
          activePlane.requestRows.map((item) => <StatusRow key={item.id} item={item} />)
        ) : (
          <EmptyPanel>No durable agent control requests loaded yet.</EmptyPanel>
        )}
      </div>

      <div className="grid min-w-0 gap-3 lg:grid-cols-3">
        {(activePlane.safetyRows || []).map((item) => <StatusRow key={item.id} item={item} />)}
      </div>
    </div>
  );
}

function ExecutionHandoffDraftPanel({ state, sessionToken }) {
  const [form, setForm] = useState(EMPTY_EXECUTION_HANDOFF_FORM);
  const [editingId, setEditingId] = useState("");
  const [handoffs, setHandoffs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const canUse = state.canView && Boolean(sessionToken) && !loading;
  const canCreate = canUse && form.title.trim() && form.objective.trim() && form.sourceLabel.trim();

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setNotice("");
  }

  async function refreshHandoffs() {
    if (!canUse) return;
    setLoading(true);
    setNotice("");
    try {
      const payload = await getApexOsExecutionHandoffs(sessionToken);
      setHandoffs(payload.apexOsExecutionHandoffs || []);
      setSummary(payload.summary || null);
      setEditingId("");
      setForm(EMPTY_EXECUTION_HANDOFF_FORM);
      setNotice("Agent handoffs loaded from private Apex OS storage.");
    } catch (error) {
      setNotice(error?.message || "Agent handoffs could not load right now.");
    } finally {
      setLoading(false);
    }
  }

  async function submitHandoff(event) {
    event.preventDefault();
    if (!canCreate) return;
    setLoading(true);
    setNotice("");
    try {
      if (editingId) {
        await updateApexOsExecutionHandoff(sessionToken, editingId, form);
      } else {
        await createApexOsExecutionHandoff(sessionToken, form);
      }
      const listed = await getApexOsExecutionHandoffs(sessionToken);
      setHandoffs(listed.apexOsExecutionHandoffs || []);
      setSummary(listed.summary || null);
      setForm(EMPTY_EXECUTION_HANDOFF_FORM);
      setEditingId("");
      setNotice(editingId ? "Agent handoff updated. Finished handoffs only create suggested memory for manual review." : "Agent handoff drafted. It cannot queue or run agents.");
    } catch (error) {
      setNotice(error?.message || "Agent handoff could not be saved right now.");
    } finally {
      setLoading(false);
    }
  }

  function loadHandoff(handoff) {
    setEditingId(handoff.id || "");
    setForm({
      ...EMPTY_EXECUTION_HANDOFF_FORM,
      ...handoff,
      validationResults: handoff.validationResults || "",
      resultReport: handoff.resultReport || "",
      decisionMemoryUpdate: handoff.decisionMemoryUpdate || "",
      workstreamStatus: handoff.workstreamStatus || "planned",
      sourceChatRequestId: handoff.sourceChatRequestId || "",
      sourceQuestion: handoff.sourceQuestion || "",
      status: ["draft", "ready", "blocked"].includes(handoff.status) ? handoff.status : "draft",
    });
    setNotice("Handoff loaded for editing. Save updates after adding validation/results.");
  }

  function clearHandoffForm() {
    setEditingId("");
    setForm(EMPTY_EXECUTION_HANDOFF_FORM);
    setNotice("");
  }

  async function setHandoffStatus(handoff, status) {
    if (!canUse || !handoff?.id) return;
    setLoading(true);
    setNotice("");
    try {
      await updateApexOsExecutionHandoff(sessionToken, handoff.id, { ...handoff, status });
      const payload = await getApexOsExecutionHandoffs(sessionToken);
      setHandoffs(payload.apexOsExecutionHandoffs || []);
      setSummary(payload.summary || null);
      setNotice(status === "archived" ? "Handoff archived. No agent was queued or run." : "Handoff status updated. Queue and run remain locked.");
    } catch (error) {
      setNotice(error?.message || "Agent handoff could not be updated right now.");
    } finally {
      setLoading(false);
    }
  }

  const activeSummary = summary || state.executionHandoffs?.handoffSummary || { total: handoffs.length, draft: 0, ready: 0, blocked: 0, archived: 0 };

  return (
    <div className="grid min-w-0 gap-4">
      <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatusRow item={{
          id: "agent-handoff-total",
          title: "Saved handoffs",
          status: `${activeSummary.total || 0}`,
          detail: `${activeSummary.ready || 0} ready, ${activeSummary.draft || 0} draft, ${activeSummary.finished || 0} finished, ${activeSummary.blocked || 0} blocked, ${activeSummary.archived || 0} archived.`,
          tone: activeSummary.finished || activeSummary.ready ? "green" : "blue",
        }} />
        <StatusRow item={{
          id: "agent-handoff-run-lock",
          title: "Agent execution",
          status: "Run locked",
          detail: "This panel drafts scoped work packages only. It does not call Agent OS queue/run endpoints.",
          tone: "amber",
        }} />
      </div>

      <div className="grid min-w-0 gap-3 lg:grid-cols-3">
        {state.executionHandoffs.sourceRows.map((item) => <StatusRow key={item.id} item={item} />)}
      </div>

      <form className="grid min-w-0 gap-3 rounded-xl border border-slate-200 bg-white p-3" onSubmit={submitHandoff}>
        <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <input
            value={form.title}
            onChange={(event) => updateField("title", event.target.value)}
            maxLength={160}
            placeholder="Handoff title"
            className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700"
            disabled={!state.canView || loading}
          />
          <div className="grid min-w-0 gap-3 sm:grid-cols-4">
            <select value={form.agentRole} onChange={(event) => updateField("agentRole", event.target.value)} className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700" disabled={!state.canView || loading}>
              <option value="build">Build</option>
              <option value="qa">QA</option>
              <option value="release">Release</option>
              <option value="marketing">Marketing</option>
              <option value="sales">Sales</option>
              <option value="customer-success">Customer success</option>
              <option value="monitoring">Monitoring</option>
              <option value="business">Business</option>
              <option value="general">General</option>
            </select>
            <select value={form.workType} onChange={(event) => updateField("workType", event.target.value)} className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700" disabled={!state.canView || loading}>
              <option value="local-code-plan">Local code plan</option>
              <option value="qa-check">QA check</option>
              <option value="release-packet">Release packet</option>
              <option value="business-draft">Business draft</option>
              <option value="monitoring-review">Monitoring review</option>
              <option value="docs-update">Docs update</option>
              <option value="design-review">Design review</option>
              <option value="general">General</option>
            </select>
            <select value={form.riskLevel} onChange={(event) => updateField("riskLevel", event.target.value)} className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700" disabled={!state.canView || loading}>
              <option value="low">Low risk</option>
              <option value="medium">Medium risk</option>
              <option value="high">High risk</option>
              <option value="critical">Critical risk</option>
            </select>
            <select value={form.status} onChange={(event) => updateField("status", event.target.value)} className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700" disabled={!state.canView || loading}>
              <option value="draft">Draft</option>
              <option value="ready">Ready</option>
              <option value="blocked">Blocked</option>
            </select>
          </div>
        </div>
        <div className="grid min-w-0 gap-3 sm:grid-cols-3">
          <select value={form.workstreamStatus} onChange={(event) => updateField("workstreamStatus", event.target.value)} className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700" disabled={!state.canView || loading}>
            <option value="planned">Planned</option>
            <option value="ready-for-agent">Ready for agent</option>
            <option value="in-progress">In progress</option>
            <option value="validating">Validating</option>
            <option value="finished">Finished</option>
            <option value="blocked">Blocked</option>
          </select>
          <input value={form.sourceChatRequestId} onChange={(event) => updateField("sourceChatRequestId", event.target.value)} maxLength={140} placeholder="Ask Apex request ID" className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700" disabled={!state.canView || loading} />
          <input value={form.sourceQuestion} onChange={(event) => updateField("sourceQuestion", event.target.value)} maxLength={1000} placeholder="Source chat question" className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700" disabled={!state.canView || loading} />
        </div>
        <textarea value={form.objective} onChange={(event) => updateField("objective", event.target.value)} maxLength={1800} placeholder="Objective for the agent handoff" className="min-h-20 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold leading-6 text-slate-700" disabled={!state.canView || loading} />
        <div className="grid min-w-0 gap-3 lg:grid-cols-2">
          <textarea value={form.sourceEvidence} onChange={(event) => updateField("sourceEvidence", event.target.value)} maxLength={1800} placeholder="Source evidence and context" className="min-h-20 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold leading-6 text-slate-700" disabled={!state.canView || loading} />
          <textarea value={form.handoffPrompt} onChange={(event) => updateField("handoffPrompt", event.target.value)} maxLength={1800} placeholder="Prompt/instructions for the future agent worker" className="min-h-20 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold leading-6 text-slate-700" disabled={!state.canView || loading} />
          <textarea value={form.allowedActions} onChange={(event) => updateField("allowedActions", event.target.value)} maxLength={1800} placeholder="Allowed actions" className="min-h-20 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold leading-6 text-slate-700" disabled={!state.canView || loading} />
          <textarea value={form.blockedActions} onChange={(event) => updateField("blockedActions", event.target.value)} maxLength={1800} placeholder="Blocked actions" className="min-h-20 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold leading-6 text-slate-700" disabled={!state.canView || loading} />
          <textarea value={form.validationPlan} onChange={(event) => updateField("validationPlan", event.target.value)} maxLength={1800} placeholder="Validation plan" className="min-h-20 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold leading-6 text-slate-700" disabled={!state.canView || loading} />
          <textarea value={form.rollbackPlan} onChange={(event) => updateField("rollbackPlan", event.target.value)} maxLength={1800} placeholder="Rollback plan" className="min-h-20 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold leading-6 text-slate-700" disabled={!state.canView || loading} />
          <textarea value={form.validationResults} onChange={(event) => updateField("validationResults", event.target.value)} maxLength={1800} placeholder="Validation results after work finishes" className="min-h-20 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold leading-6 text-slate-700" disabled={!state.canView || loading} />
          <textarea value={form.resultReport} onChange={(event) => updateField("resultReport", event.target.value)} maxLength={1800} placeholder="Result report after work finishes" className="min-h-20 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold leading-6 text-slate-700" disabled={!state.canView || loading} />
        </div>
        <textarea value={form.decisionMemoryUpdate} onChange={(event) => updateField("decisionMemoryUpdate", event.target.value)} maxLength={1800} placeholder="Decision memory update to save as suggested memory when this handoff is finished" className="min-h-20 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold leading-6 text-slate-700" disabled={!state.canView || loading} />
        <div className="grid min-w-0 gap-3 lg:grid-cols-3">
          <input value={form.sourceApprovalPacketId} onChange={(event) => updateField("sourceApprovalPacketId", event.target.value)} maxLength={140} placeholder="Source approval packet ID" className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700" disabled={!state.canView || loading} />
          <input value={form.sourceLabel} onChange={(event) => updateField("sourceLabel", event.target.value)} maxLength={140} placeholder="Source label" className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700" disabled={!state.canView || loading} />
          <input value={form.sourceUri} onChange={(event) => updateField("sourceUri", event.target.value)} maxLength={260} placeholder="Source URI or file" className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700" disabled={!state.canView || loading} />
        </div>
        <div className="flex min-w-0 flex-wrap gap-2">
          <Button type="submit" variant="secondary" size="sm" disabled={!canCreate}>
            <Icon name="clipboard" /> {loading ? "Saving..." : editingId ? "Save updates" : "Draft handoff"}
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={clearHandoffForm} disabled={!state.canView || loading || (!editingId && form === EMPTY_EXECUTION_HANDOFF_FORM)}>
            <Icon name="clock" /> Clear form
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={refreshHandoffs} disabled={!canUse}>
            <Icon name="refresh" /> Load handoffs
          </Button>
          <Button type="button" disabled variant="secondary" size="sm">
            <Icon name="lock" /> Queue locked
          </Button>
          <Button type="button" disabled variant="secondary" size="sm">
            <Icon name="lock" /> Run locked
          </Button>
        </div>
        <p className="break-words text-xs font-black leading-5 text-slate-500">{notice || "Ready handoffs require source evidence, allowed actions, blocked actions, validation, rollback, and a handoff prompt. Finished handoffs also require validation results and a result report; any memory update stays suggested until approved."}</p>
      </form>

      <div className="grid min-w-0 gap-3">
        {handoffs.length ? handoffs.slice(0, 5).map((handoff) => (
          <div key={handoff.id} className="min-w-0 rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="break-words text-sm font-black text-slate-950">{handoff.title}</p>
                <p className="mt-1 break-words text-xs font-bold leading-5 text-slate-600">{handoff.objective}</p>
                <p className="mt-2 break-words text-[11px] font-black text-slate-500">Role: {handoff.agentRole} | Work: {handoff.workType} | Workstream: {handoff.workstreamStatus || "planned"} | Source: {handoff.sourceLabel || "Missing source"}</p>
                {handoff.sourceChatRequestId ? <p className="mt-1 break-words text-[11px] font-black text-slate-500">Chat source: {handoff.sourceChatRequestId}</p> : null}
                {handoff.missingFields?.length ? <p className="mt-2 break-words text-[11px] font-black text-amber-700">Missing: {handoff.missingFields.join(", ")}</p> : null}
                {handoff.validationResults ? <p className="mt-2 break-words text-[11px] font-black leading-5 text-emerald-700">Validation: {handoff.validationResults}</p> : null}
                {handoff.resultReport ? <p className="mt-1 break-words text-[11px] font-black leading-5 text-slate-600">Result: {handoff.resultReport}</p> : null}
                {handoff.decisionMemoryId ? <p className="mt-1 break-words text-[11px] font-black text-purple-700">Suggested memory: {handoff.decisionMemoryId}</p> : null}
              </div>
              <ToneBadge tone={handoff.workstreamStatus === "finished" ? "green" : handoff.status === "ready" ? "green" : handoff.status === "blocked" || handoff.workstreamStatus === "blocked" ? "red" : handoff.status === "archived" ? "slate" : "blue"}>{handoff.workstreamStatus || handoff.status}</ToneBadge>
            </div>
            <div className="mt-3 flex min-w-0 flex-wrap gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => loadHandoff(handoff)} disabled={!canUse || handoff.status === "archived"}>
                <Icon name="clipboard" /> Load
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={() => setHandoffStatus(handoff, "ready")} disabled={!canUse || handoff.status === "ready" || handoff.status === "archived"}>
                <Icon name="check" /> Mark ready
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={() => setHandoffStatus({ ...handoff, workstreamStatus: "validating" }, handoff.status)} disabled={!canUse || handoff.workstreamStatus === "validating" || handoff.status === "archived"}>
                <Icon name="refresh" /> Validating
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={() => setHandoffStatus({ ...handoff, workstreamStatus: "finished" }, handoff.status)} disabled={!canUse || handoff.workstreamStatus === "finished" || handoff.status === "archived"}>
                <Icon name="check" /> Finished
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={() => setHandoffStatus(handoff, "blocked")} disabled={!canUse || handoff.status === "blocked" || handoff.status === "archived"}>
                <Icon name="alert" /> Mark blocked
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={() => setHandoffStatus(handoff, "archived")} disabled={!canUse || handoff.status === "archived"}>
                <Icon name="clock" /> Archive
              </Button>
              <Button type="button" disabled variant="secondary" size="sm">
                <Icon name="lock" /> Run locked
              </Button>
            </div>
          </div>
        )) : (
          <EmptyPanel>No durable agent handoff drafts loaded yet.</EmptyPanel>
        )}
      </div>
    </div>
  );
}

const APEX_CONTROL_ROOM_SECTIONS = [
  {
    id: "overview",
    label: "Overview",
    helper: "Command state",
    summary: "Private command status, approvals, operating signals, evidence, and next work.",
    icon: "grid",
    lanes: ["KPI strip", "Command board", "Briefing", "Signals", "Evidence"],
  },
  {
    id: "apex",
    label: "Apex",
    helper: "Voice + answers",
    summary: "Apex life screen, open voice posture, answer drafting, sources, and safety boundaries.",
    icon: "spark",
    lanes: ["Voice", "Transcript", "Answer", "Sources", "Boundaries"],
  },
  {
    id: "memory",
    label: "Memory",
    helper: "Decisions + vault",
    summary: "Durable decisions, operating rules, knowledge intake, trusted memory, and vault review.",
    icon: "database",
    lanes: ["Decisions", "Rules", "Vault", "Sources", "Upload"],
  },
  {
    id: "agents",
    label: "Agents",
    helper: "Work control",
    summary: "Agent roster, scoped handoffs, locked tasks, run ledger, and execution boundaries.",
    icon: "layers",
    lanes: ["Control plane", "Queue", "Ledger", "Handoffs", "Locks"],
  },
  {
    id: "approvals",
    label: "Approvals",
    helper: "Risk gates",
    summary: "Owner review packets for risky actions before any deploy, send, spend, or mutation.",
    icon: "lock",
    lanes: ["Queue", "Packets", "Controls", "Templates", "Sources"],
  },
  {
    id: "release",
    label: "Release",
    helper: "Deploy evidence",
    summary: "Release monitoring, build awareness, launch gates, deploy desk, and rollback evidence.",
    icon: "refresh",
    lanes: ["Monitoring", "Briefing", "Build", "Readiness", "Release desk"],
  },
  {
    id: "business",
    label: "Business",
    helper: "Growth ops",
    summary: "Private launch, sales, briefing, business memory, and approval draft queues.",
    icon: "briefcase",
    lanes: ["Command", "Gates", "Launch", "Briefing", "Drafts"],
  },
  {
    id: "trust",
    label: "Trust",
    helper: "QA + finish",
    summary: "Finished capability proof, hardening evidence, blocked action classes, and freeze checks.",
    icon: "check",
    lanes: ["Finished OS", "Run loop", "Freeze", "Hardening", "Audit"],
  },
  {
    id: "personal",
    label: "Personal",
    helper: "Owner layer",
    summary: "Private owner preferences, work style memory, communication posture, and privacy locks.",
    icon: "users",
    lanes: ["Preferences", "Work style", "Communication", "Focus", "Privacy"],
  },
];

function getApexControlRoomSection(sectionId) {
  return APEX_CONTROL_ROOM_SECTIONS.find((section) => section.id === sectionId) || APEX_CONTROL_ROOM_SECTIONS[0];
}

function countMetric(value, noun) {
  const number = Number.isFinite(Number(value)) ? Number(value) : 0;
  return `${number} ${noun}${number === 1 ? "" : "s"}`;
}

function getApexControlRoomSectionMetrics(sectionId, state) {
  if (sectionId === "overview") {
    return [
      { label: "KPIs", value: countMetric(state.kpis?.length, "tile"), tone: "blue" },
      { label: "Actions", value: countMetric(state.nextBestActions?.length, "next"), tone: "amber" },
      { label: "Evidence", value: countMetric(state.evidence?.length, "row"), tone: "green" },
    ];
  }
  if (sectionId === "memory") {
    return [
      { label: "Decisions", value: countMetric(state.decisionMemory?.decisionCount, "row"), tone: "blue" },
      { label: "Approved", value: countMetric(state.decisionMemory?.approvedCount, "memory"), tone: "green" },
      { label: "Vault", value: countMetric(state.knowledgeVault?.categoryCount, "category"), tone: "amber" },
    ];
  }
  if (sectionId === "agents") {
    return [
      { label: "Roster", value: countMetric(state.agentControlPlane?.rosterRows?.length, "agent"), tone: "green" },
      { label: "Tasks", value: countMetric(state.agentWorkQueue?.availableTaskCount, "task"), tone: "blue" },
      { label: "Locked", value: countMetric(state.agentWorkQueue?.lockedTaskCount, "task"), tone: "amber" },
    ];
  }
  if (sectionId === "approvals") {
    return [
      { label: "Queues", value: countMetric(state.approvalCommandCenter?.queueCount, "queue"), tone: "amber" },
      { label: "Packets", value: countMetric(state.approvalCommandCenter?.packetFieldCount, "field"), tone: "blue" },
      { label: "Sources", value: countMetric(state.approvalCommandCenter?.sourceCount, "source"), tone: "slate" },
    ];
  }
  if (sectionId === "release") {
    return [
      { label: "Checks", value: countMetric(state.releaseMonitoring?.readinessCount, "check"), tone: "blue" },
      { label: "Gates", value: `${state.launchReadiness?.readyCount || 0}/${state.launchReadiness?.totalCount || 0}`, tone: state.launchReadiness?.tone || "amber" },
      { label: "Release", value: state.releaseDesk?.status || "Locked", tone: state.releaseDesk?.tone || "amber" },
    ];
  }
  if (sectionId === "business") {
    return [
      { label: "Queues", value: countMetric(state.businessCommandCenter?.queueCount, "queue"), tone: "blue" },
      { label: "Launch", value: countMetric(state.businessCommandCenter?.launchCount, "row"), tone: "green" },
      { label: "Approvals", value: countMetric(state.businessCommandCenter?.approvalDraftCount, "draft"), tone: "amber" },
    ];
  }
  if (sectionId === "trust") {
    return [
      { label: "Finished", value: `${state.finishedApexOs?.readyCount || 0}/${state.finishedApexOs?.capabilityCount || 0}`, tone: state.finishedApexOs?.tone || "blue" },
      { label: "Hardening", value: countMetric(state.qaSecurityHardening?.evidenceCount, "row"), tone: state.qaSecurityHardening?.tone || "amber" },
      { label: "Blocked", value: countMetric(state.finishedApexOs?.blockedActionCount, "class"), tone: "amber" },
    ];
  }
  if (sectionId === "personal") {
    return [
      { label: "Prefs", value: countMetric(state.personalOperatingLayer?.preferenceCount, "row"), tone: "blue" },
      { label: "Style", value: countMetric(state.personalOperatingLayer?.workStyleCount, "row"), tone: "green" },
      { label: "Locks", value: countMetric(state.personalOperatingLayer?.privacyLockCount, "lock"), tone: "amber" },
    ];
  }
  return [
    { label: "Status", value: "Private", tone: "green" },
    { label: "Mode", value: "Review-first", tone: "amber" },
    { label: "Access", value: "Operator", tone: "blue" },
  ];
}

function ApexControlRoomSectionNav({ activeSection, onChange, variant = "light" }) {
  const dark = variant === "dark";
  return (
    <nav className={`sticky top-2 z-20 w-full min-w-0 max-w-full overflow-hidden rounded-xl border p-2 shadow-[0_18px_48px_-42px_rgba(7,17,31,0.6)] ${dark ? "border-slate-800 bg-slate-950/86 backdrop-blur" : "border-slate-200 bg-white/96 backdrop-blur"}`} aria-label="Apex Control Room sections">
      <div className="scrollbar-none flex min-w-0 max-w-full gap-2 overflow-x-auto pb-1">
        {APEX_CONTROL_ROOM_SECTIONS.map((section) => {
          const active = section.id === activeSection;
          const activeClass = dark
            ? "border-orange-400/80 bg-orange-500/14 text-orange-100 shadow-[0_0_24px_rgba(249,115,22,0.16)]"
            : "border-orange-300 bg-orange-50 text-orange-800 shadow-sm shadow-orange-900/10";
          const idleClass = dark
            ? "border-slate-800 bg-white/[0.04] text-slate-200 hover:border-cyan-300/40 hover:bg-white/[0.08] hover:text-cyan-100"
            : "border-slate-200 bg-slate-50 text-slate-700 hover:border-orange-200 hover:bg-white hover:text-orange-700";
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => onChange(section.id)}
              aria-current={active ? "page" : undefined}
              title={`${section.label}: ${section.helper}`}
              className={`co-focus-ring flex min-h-14 w-36 shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-left transition sm:w-40 ${active ? activeClass : idleClass}`}
            >
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${dark ? active ? "border-orange-300/50 bg-slate-950 text-orange-100" : "border-slate-700 bg-slate-900 text-cyan-100" : active ? "border-orange-200 bg-white" : "border-slate-200 bg-white"}`}>
                <Icon name={section.icon} className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block whitespace-normal text-sm font-black leading-4">{section.label}</span>
                <span className={`hidden whitespace-normal text-[11px] font-bold leading-4 sm:block ${dark ? "text-slate-400" : "text-slate-500"}`}>{section.helper}</span>
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function ApexRoomLauncher({ activeSection, onChange, variant = "light", title = "Command rooms", description = "Open the room that matches the work." }) {
  const dark = variant === "dark";
  return (
    <section className={`min-w-0 rounded-lg border p-3 ${dark ? "border-cyan-200/12 bg-slate-950/62 text-white" : "border-slate-200 bg-white text-slate-950 shadow-[0_18px_46px_-40px_rgba(7,17,31,0.72)]"}`} aria-label="Apex Control Room command room launcher">
      <div className="mb-3 flex min-w-0 flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className={`text-[10px] font-black uppercase tracking-[0.14em] ${dark ? "text-orange-200" : "text-orange-700"}`}>{title}</p>
          <p className={`mt-1 break-words text-xs font-bold leading-5 ${dark ? "text-slate-400" : "text-slate-600"}`}>{description}</p>
        </div>
        <ToneBadge tone="amber">Categorized</ToneBadge>
      </div>
      <div className="grid min-w-0 gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {APEX_CONTROL_ROOM_SECTIONS.map((section) => {
          const active = section.id === activeSection;
          return (
            <button
              key={`launcher-${section.id}`}
              type="button"
              onClick={() => onChange(section.id)}
              aria-current={active ? "page" : undefined}
              className={`co-focus-ring group grid min-h-[4.6rem] min-w-0 grid-cols-[2.25rem_minmax(0,1fr)] items-start gap-3 rounded-lg border p-3 text-left transition ${dark ? active ? "border-orange-400/70 bg-orange-500/14 text-white shadow-[0_0_24px_rgba(249,115,22,0.18)]" : "border-slate-800 bg-white/[0.035] text-slate-200 hover:border-cyan-300/38 hover:bg-white/[0.07]" : active ? "border-orange-300 bg-orange-50 text-orange-950 shadow-sm shadow-orange-900/10" : "border-slate-200 bg-slate-50 text-slate-800 hover:border-orange-200 hover:bg-white"}`}
            >
              <span className={`grid h-9 w-9 place-items-center rounded-lg border ${dark ? active ? "border-orange-300/50 bg-slate-950 text-orange-100" : "border-slate-700 bg-slate-900 text-cyan-100" : active ? "border-orange-200 bg-white text-orange-700" : "border-slate-200 bg-white text-slate-700"}`}>
                <Icon name={section.icon} className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block break-words text-sm font-black leading-4">{section.label}</span>
                <span className={`mt-1 block break-words text-[11px] font-bold leading-4 ${dark ? "text-slate-400" : "text-slate-500"}`}>{section.helper}</span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function ControlRoomCategoryShell({ sectionId, state, children }) {
  const section = getApexControlRoomSection(sectionId);
  const metrics = getApexControlRoomSectionMetrics(sectionId, state);

  return (
    <section className="grid min-w-0 gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="min-w-0 xl:sticky xl:top-24 xl:self-start">
        <div className="min-w-0 overflow-hidden rounded-xl border border-slate-800 bg-slate-950 text-white shadow-[0_22px_60px_-44px_rgba(2,6,23,0.96)]">
          <div
            className="min-w-0 p-4"
            style={{
              backgroundImage: "linear-gradient(135deg, rgba(249,115,22,0.18), rgba(14,165,233,0.08) 42%, rgba(2,6,23,0) 100%)",
            }}
          >
            <div className="flex min-w-0 items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-orange-300/30 bg-orange-500/14 text-orange-100">
                <Icon name={section.icon} className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-200">Command Room</p>
                <h2 className="mt-1 break-words text-xl font-black leading-tight text-white">{section.label}</h2>
                <p className="mt-1 break-words text-xs font-bold leading-5 text-slate-300">{section.summary}</p>
              </div>
            </div>

            <div className="mt-4 grid min-w-0 gap-2">
              {metrics.map((metric) => (
                <div key={`${section.id}-${metric.label}`} className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2">
                  <span className="min-w-0 break-words text-[11px] font-black uppercase tracking-[0.08em] text-slate-400">{metric.label}</span>
                  <ToneBadge tone={metric.tone}>{metric.value}</ToneBadge>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-3 min-w-0 rounded-xl border border-slate-200 bg-white p-3 shadow-[0_18px_46px_-40px_rgba(7,17,31,0.72)]">
          <div className="flex min-w-0 items-center gap-2">
            <Icon name="layers" className="h-4 w-4 shrink-0 text-orange-600" />
            <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-600">Category Map</p>
          </div>
          <div className="mt-3 grid min-w-0 gap-2">
            {section.lanes.map((lane, index) => (
              <div key={`${section.id}-${lane}`} className="flex min-w-0 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-slate-950 text-[10px] font-black text-white">{index + 1}</span>
                <span className="min-w-0 break-words text-xs font-black text-slate-700">{lane}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-3 grid min-w-0 gap-2 rounded-xl border border-orange-200 bg-orange-50 p-3">
          <div className="flex min-w-0 items-center gap-2 text-orange-900">
            <Icon name="lock" className="h-4 w-4 shrink-0" />
            <p className="text-xs font-black uppercase tracking-[0.12em]">Review-First</p>
          </div>
          <div className="grid min-w-0 grid-cols-2 gap-2">
            {["No sends", "No deploys", "No billing", "Private"].map((item) => (
              <span key={`${section.id}-${item}`} className="min-w-0 rounded-lg border border-orange-200 bg-white px-2 py-1 text-[11px] font-black text-orange-800">{item}</span>
            ))}
          </div>
        </div>
      </aside>

      <div className="grid min-w-0 content-start gap-4">
        {children}
      </div>
    </section>
  );
}

function ControlRoomRoomTabs({ tabs, label = "Room sections" }) {
  const firstTabId = tabs[0]?.id || "";
  const [activeTabId, setActiveTabId] = useState(firstTabId);
  const activeTab = tabs.find((tab) => tab.id === activeTabId) || tabs[0];

  return (
    <section className="grid min-w-0 gap-3" aria-label={label}>
      <div className="scrollbar-none flex min-w-0 gap-2 overflow-x-auto rounded-xl border border-slate-200 bg-white p-2 shadow-[0_14px_38px_-34px_rgba(7,17,31,0.58)]">
        {tabs.map((tab) => {
          const active = tab.id === activeTab?.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTabId(tab.id)}
              aria-pressed={active}
              className={`co-focus-ring flex min-h-12 w-44 shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-left transition ${active ? "border-orange-300 bg-orange-50 text-orange-900 shadow-sm shadow-orange-900/10" : "border-slate-200 bg-slate-50 text-slate-700 hover:border-orange-200 hover:bg-white hover:text-orange-700"}`}
            >
              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border ${active ? "border-orange-200 bg-white text-orange-700" : "border-slate-200 bg-white text-slate-600"}`}>
                <Icon name={tab.icon || "grid"} className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block break-words text-xs font-black leading-4">{tab.label}</span>
                {tab.helper ? <span className="mt-0.5 block break-words text-[11px] font-bold leading-4 text-slate-500">{tab.helper}</span> : null}
              </span>
            </button>
          );
        })}
      </div>

      <div className="min-w-0" key={activeTab?.id}>
        {activeTab?.content}
      </div>
    </section>
  );
}

function ApexImmersiveHeader({ state }) {
  return (
    <header className="sr-only">
      <p>Apex OS</p>
      <h1>Apex Life Screen</h1>
      <p>Apex Body Screen for {state.operatorName}. Private operator, execution locked, voice and answers ready.</p>
    </header>
  );
}

function ApexDarkPanel({ title, description, action, children }) {
  return (
    <section className="min-w-0 rounded-2xl border border-white/10 bg-slate-950/78 p-4 text-white shadow-[0_26px_64px_-46px_rgba(2,6,23,0.92)] backdrop-blur sm:p-5">
      <div className="mb-4 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="break-words text-base font-black text-white">{title}</h2>
          {description ? <p className="mt-1 break-words text-sm font-bold leading-5 text-slate-300">{description}</p> : null}
        </div>
        {action ? <div className="min-w-0 max-w-full sm:shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

const APEX_COCKPIT_NAV = [
  { key: "overview", id: "overview", label: "Overview", icon: "grid" },
  { key: "apex", id: "apex", label: "Apex", icon: "spark" },
  { key: "agents", id: "agents", label: "Agents", icon: "users" },
  { key: "memory", id: "memory", label: "Memory", icon: "database" },
  { key: "approvals", id: "approvals", label: "Approvals", icon: "check" },
  { key: "release", id: "release", label: "Release", icon: "upload" },
  { key: "business", id: "business", label: "Business", icon: "briefcase" },
  { key: "trust", id: "trust", label: "Trust", icon: "lock" },
  { key: "personal", id: "personal", label: "Personal", icon: "users" },
  { key: "finished", id: "trust", label: "Finished", icon: "check" },
];

function ApexCockpitStatusDot({ tone = "green" }) {
  const tones = {
    green: "bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.82)]",
    blue: "bg-cyan-400 shadow-[0_0_18px_rgba(34,211,238,0.7)]",
    amber: "bg-orange-400 shadow-[0_0_18px_rgba(251,146,60,0.72)]",
    red: "bg-red-400 shadow-[0_0_18px_rgba(248,113,113,0.72)]",
    slate: "bg-slate-400 shadow-[0_0_14px_rgba(148,163,184,0.5)]",
  };
  return <span className={`inline-block h-2 w-2 rounded-full ${tones[tone] || tones.green}`} />;
}

function ApexCockpitCard({ title, action, children, className = "" }) {
  return (
    <section className={`min-w-0 max-w-full rounded-lg border border-cyan-200/12 bg-slate-950/42 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_14px_42px_-34px_rgba(56,189,248,0.72)] backdrop-blur-sm ${className}`}>
      <div className="mb-1.5 flex min-w-0 items-center justify-between gap-3">
        <h3 className="min-w-0 break-words text-[11px] font-black uppercase tracking-[0.12em] text-slate-100">{title}</h3>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

function ApexCockpitControlButton({ children, className = "", disabled = true, onClick, active = false, title, type = "button" }) {
  const interactive = !disabled;
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      title={title}
      className={`co-focus-ring inline-flex min-h-8 min-w-0 max-w-full items-center justify-center gap-2 rounded-lg border px-3 py-1.5 text-center text-[11px] font-black leading-tight shadow-[inset_0_1px_0_rgba(255,255,255,0.045)] transition disabled:opacity-100 ${interactive ? "cursor-pointer border-cyan-200/22 bg-white/[0.055] text-slate-100 hover:border-orange-400/60 hover:bg-orange-500/10 hover:text-white" : "cursor-not-allowed border-cyan-200/14 bg-white/[0.035] text-slate-200 hover:bg-white/[0.035]"} ${active ? "border-orange-400/64 bg-orange-500/12 text-orange-100 shadow-[0_0_22px_rgba(249,115,22,0.18),inset_0_1px_0_rgba(255,255,255,0.06)]" : ""} ${className}`}
    >
      {children}
    </button>
  );
}

function ApexCockpitSidebar({ activeSection, onChange }) {
  return (
    <aside className="relative z-10 hidden min-w-0 border-r border-slate-800/90 bg-slate-950/82 p-4 lg:flex lg:flex-col">
      <div className="border-b border-slate-800 pb-3">
        <img src="/brand/apex-app-logo.png" alt="Apex HQ" className="h-8 w-auto object-contain" />
      </div>
      <nav className="mt-4 grid min-w-0 gap-1" aria-label="Apex cockpit sections">
        {APEX_COCKPIT_NAV.map((item) => {
          const active = item.key === activeSection || (activeSection === "trust" && item.key === "finished");
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onChange(item.id)}
              className={`co-focus-ring flex min-h-9 min-w-0 items-center gap-3 rounded-lg px-3 py-2 text-left text-xs font-black transition ${active ? "bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-[0_0_24px_rgba(249,115,22,0.36)]" : "text-slate-400 hover:bg-white/[0.06] hover:text-white"}`}
            >
              <Icon name={item.icon} className="h-4 w-4 shrink-0" />
              <span className="min-w-0 break-words">{item.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="mt-auto rounded-xl border border-slate-800 bg-slate-900/72 p-3">
        <div className="flex items-center gap-2 text-cyan-100">
          <Icon name="lock" className="h-4 w-4" />
          <p className="text-xs font-black uppercase tracking-[0.1em]">Private</p>
        </div>
        <p className="mt-2 text-[11px] font-bold leading-4 text-slate-400">Operator Command Room</p>
        <p className="text-[11px] font-bold leading-4 text-slate-500">Access: Operator Only</p>
      </div>
    </aside>
  );
}

const APEX_COCKPIT_VOICE_STATES = Object.freeze({
  standby: {
    key: "standby",
    header: "Standby",
    label: "Voice paused",
    headline: "Apex is standing by",
    detail: "Resume voice when you want Apex listening.",
    tone: "slate",
  },
  listening: {
    key: "listening",
    header: "Online",
    label: "Listening",
    headline: "Apex is listening",
    detail: "Voice is open on this page. Speak naturally.",
    tone: "green",
  },
  hearing: {
    key: "hearing",
    header: "Hearing",
    label: "I hear you",
    headline: "Apex hears you",
    detail: "Capturing this turn.",
    tone: "green",
  },
  thinking: {
    key: "thinking",
    header: "Thinking",
    label: "Thinking",
    headline: "Apex is thinking",
    detail: "Reading approved memory and source-backed context.",
    tone: "blue",
  },
  speaking: {
    key: "speaking",
    header: "Speaking",
    label: "Speaking answer",
    headline: "Apex is speaking",
    detail: "Voice output is active and review-first.",
    tone: "amber",
  },
  blocked: {
    key: "blocked",
    header: "Needs permission",
    label: "Mic blocked",
    headline: "Apex needs access",
    detail: "Microphone is blocked or unavailable.",
    tone: "red",
  },
});

const APEX_COCKPIT_SILENCE_MS = 1300;
const APEX_COCKPIT_MIN_TURN_MS = 850;
const APEX_COCKPIT_LEVEL_THRESHOLD = 0.035;
const APEX_COCKPIT_IDLE_LEVEL_THRESHOLD = 0.018;
const APEX_COCKPIT_BARGE_IN_THRESHOLD = 0.066;
const APEX_COCKPIT_BARGE_IN_GRACE_MS = 700;
const APEX_COCKPIT_PREROLL_CHUNKS = 2;

const APEX_COCKPIT_VOICE_PROFILES = Object.freeze([
  { id: "alloy", label: "Alloy", detail: "Balanced operator", rate: 0.98, pitch: 1 },
  { id: "verse", label: "Verse", detail: "Warmer command", rate: 0.96, pitch: 0.98 },
  { id: "ash", label: "Ash", detail: "Lower and direct", rate: 0.94, pitch: 0.92 },
  { id: "sage", label: "Sage", detail: "Calm briefing", rate: 0.96, pitch: 1.03 },
]);

const APEX_COCKPIT_PERSONALITY_MODES = Object.freeze([
  {
    id: "operator",
    label: "Operator",
    detail: "Direct, calm, and action-oriented.",
    prompt: "Answer like Apex HQ's private operator assistant: direct, calm, source-backed, and focused on the next safe move.",
  },
  {
    id: "briefing",
    label: "Briefing",
    detail: "Short executive summary first.",
    prompt: "Answer like an executive briefing: lead with the answer, name blockers, name the next safe action, and avoid filler.",
  },
  {
    id: "builder",
    label: "Builder",
    detail: "Implementation and validation focused.",
    prompt: "Answer like a build operator: identify the route, implementation step, validation, rollback, and permission boundary.",
  },
]);

function findApexCockpitVoiceProfile(profileId = "alloy") {
  return APEX_COCKPIT_VOICE_PROFILES.find((profile) => profile.id === profileId) || APEX_COCKPIT_VOICE_PROFILES[0];
}

function findApexCockpitPersonalityMode(modeId = "operator") {
  return APEX_COCKPIT_PERSONALITY_MODES.find((mode) => mode.id === modeId) || APEX_COCKPIT_PERSONALITY_MODES[0];
}

function resolveApexCockpitAnswerText(response) {
  if (typeof response?.answer === "string") return response.answer;
  return response?.answer?.answer || "";
}

function resolveApexCockpitSources(state, response) {
  const answerSources = Array.isArray(response?.answer?.sourceLabels) ? response.answer.sourceLabels : [];
  if (answerSources.length) return answerSources.slice(0, 4);
  const evidenceSources = Array.isArray(response?.evidenceUsed)
    ? response.evidenceUsed.map((row) => row.sourceLabel || row.title).filter(Boolean)
    : [];
  if (evidenceSources.length) return evidenceSources.slice(0, 4);
  return (state.askApexChat?.contexts || []).slice(0, 4).map((item) => item.title);
}

function buildApexCockpitCommandRoute(question = "", { previousRoute = null } = {}) {
  const normalized = String(question || "").toLowerCase();
  const hasAny = (words) => words.some((word) => normalized.includes(word));
  const isFollowUp = Boolean(previousRoute?.id)
    && /\b(that|it|this|yes|yeah|yep|do it|draft it|make it|create it|open it|show it|go there)\b/i.test(normalized)
    && normalized.length < 90;
  const wantsRouteOpen = hasAny(["open ", "show ", "go to", "take me", "switch to", "pull up", "bring up"]);
  const wantsAgentRequest = hasAny(["create agent", "draft agent", "agent request", "agent task", "ask agent", "have agent", "run agent", "qa this", "build this", "release this"])
    || /\b(ask|have|tell|create|draft|run)\b.*\b(agent|qa|build|release|marketing|sales|monitoring)\b/.test(normalized)
    || /\b(qa|build|release|marketing|sales|monitoring)\b.*\b(agent|check|run|task|request)\b/.test(normalized);
  const base = {
    shouldOpenSection: wantsRouteOpen,
    suggestedActions: ["Answer from memory", "Open matched room"],
  };

  if (isFollowUp) {
    const wantsDraftFollowUp = previousRoute.id === "agent-control" && /\b(yes|yeah|yep|do it|draft it|make it|create it|request it)\b/i.test(normalized);
    return {
      ...base,
      ...previousRoute,
      id: wantsDraftFollowUp ? "agent-control" : previousRoute.id,
      detail: wantsDraftFollowUp
        ? "Apex treated this as a follow-up to the agent request and will draft a locked request only."
        : `Apex treated this as a follow-up to ${previousRoute.label || "the last command"}.`,
      commandAction: wantsDraftFollowUp ? "draft-agent-control-request" : wantsRouteOpen ? "open-section" : "answer",
      suggestedActions: wantsDraftFollowUp ? ["Draft locked request", "Open agents"] : previousRoute.suggestedActions || base.suggestedActions,
    };
  }

  if (hasAny(["approval", "approve", "review", "sign off", "packet"])) {
    return {
      ...base,
      id: "approval-review",
      label: "Approval review",
      section: "approvals",
      detail: "Apex matched this to approval packets, review queues, or owner decisions.",
      actionLabel: "Open approvals",
      commandAction: wantsRouteOpen ? "open-section" : "answer",
      intent: "approval-review",
      tone: "amber",
    };
  }

  if (hasAny(["release", "deploy", "production", "smoke", "rollback"])) {
    return {
      ...base,
      id: "release-desk",
      label: "Release desk",
      section: "release",
      detail: "Apex matched this to release readiness, deployment, smoke tests, or rollback evidence.",
      actionLabel: "Open release",
      commandAction: wantsRouteOpen ? "open-section" : "answer",
      intent: "release-readiness",
      tone: "blue",
    };
  }

  if (hasAny(["agent", "agents", "run", "execute", "handoff", "worker", "qa", "build this", "test this", "check this"])) {
    return {
      ...base,
      id: "agent-control",
      label: "Agent control",
      section: "agents",
      detail: "Apex matched this to agent work, handoffs, safety locks, or QA routing.",
      actionLabel: "Open agents",
      commandAction: wantsAgentRequest ? "draft-agent-control-request" : wantsRouteOpen ? "open-section" : "answer",
      intent: "agent-control",
      suggestedActions: wantsAgentRequest ? ["Draft locked request", "Open agents"] : ["Answer from memory", "Open agents"],
      tone: "green",
    };
  }

  if (hasAny(["business", "launch", "demo", "sales", "marketing", "revenue", "offer", "customer success", "outreach"])) {
    return {
      ...base,
      id: "business-ops",
      label: "Business ops",
      section: "business",
      detail: "Apex matched this to launch, sales, marketing, revenue, demo, or customer-success planning.",
      actionLabel: "Open business",
      commandAction: wantsRouteOpen ? "open-section" : "answer",
      intent: "business-ops",
      tone: "blue",
    };
  }

  if (hasAny(["preference", "personal", "work style", "check in", "daily focus", "how i like", "owner layer"])) {
    return {
      ...base,
      id: "personal-operating-layer",
      label: "Personal operating layer",
      section: "personal",
      detail: "Apex matched this to John's preferences, work style memory, daily focus, or check-in posture.",
      actionLabel: "Open personal",
      commandAction: wantsRouteOpen ? "open-section" : "answer",
      intent: "personal-operating-layer",
      tone: "slate",
    };
  }

  if (hasAny(["trust", "security", "qa", "safe", "permission", "field boundary", "finished", "hardening"])) {
    return {
      ...base,
      id: "trust-hardening",
      label: "Trust and QA",
      section: "trust",
      detail: "Apex matched this to QA hardening, access proof, field boundaries, or finished-system evidence.",
      actionLabel: "Open trust",
      commandAction: wantsRouteOpen ? "open-section" : "answer",
      intent: "trust-hardening",
      tone: "green",
    };
  }

  if (hasAny(["memory", "remember", "decision", "decide", "rule", "source", "vault"])) {
    return {
      ...base,
      id: "decision-memory",
      label: "Decision memory",
      section: "memory",
      detail: "Apex matched this to durable memory, operating rules, or source-backed knowledge.",
      actionLabel: "Open memory",
      commandAction: wantsRouteOpen ? "open-section" : "answer",
      intent: "decision-memory",
      tone: "slate",
    };
  }

  if (hasAny(["blocked", "today", "summary", "brief", "options", "what needs", "next", "priority"])) {
    return {
      ...base,
      id: "command-overview",
      label: "Command overview",
      section: "overview",
      detail: "Apex matched this to the current operating picture and next best actions.",
      actionLabel: "Open overview",
      commandAction: wantsRouteOpen ? "open-section" : "answer",
      intent: "command-overview",
      tone: "blue",
    };
  }

  return {
    ...base,
    id: "ask-apex",
    label: "Ask Apex",
    section: "apex",
    detail: "Apex will answer from the full private command-room context.",
    actionLabel: "Stay with Apex",
    commandAction: "answer",
    intent: "ask-apex",
    suggestedActions: ["Answer from memory", "Brief me"],
    tone: "green",
  };
}

function buildApexCockpitTurnMemory(turns = []) {
  const visibleTurns = Array.isArray(turns) ? turns.filter((turn) => turn?.question).slice(0, 4) : [];
  if (!visibleTurns.length) return "No prior turns in this page session.";
  return visibleTurns
    .map((turn, index) => `${index + 1}. ${turn.source || "typed"} -> ${turn.routeLabel || "Ask Apex"} (${turn.status || "recorded"}): ${String(turn.question || "").slice(0, 140)}`)
    .join("\n");
}

function buildApexCockpitProactiveBriefing(state = {}) {
  const approvalCount = state.approvalCommandCenter?.queueCount || state.approvalCommandCenter?.packetSummary?.total || 0;
  const blockerCount = state.launchReadiness?.blockedCount || state.approvalCommandCenter?.packetSummary?.blocked || 0;
  const agentCount = state.agentControlPlane?.roleCount || state.agentWorkQueue?.availableTaskCount || 0;
  const memoryCount = state.decisionMemory?.durableCount || state.decisionMemory?.decisionCount || 0;
  const releaseStatus = state.releaseDesk?.status || "Healthy";
  const moneyReady = state.kpis?.find((item) => /money/i.test(item.title || ""))?.value || state.todayCommandCenter?.moneyReadyCount || 0;
  return [
    `Apex briefing for ${state.operatorName || "operator"}.`,
    `${moneyReady} money-ready item${Number(moneyReady) === 1 ? "" : "s"} are visible.`,
    `${approvalCount} approval item${approvalCount === 1 ? "" : "s"} need review.`,
    `${blockerCount} blocker${blockerCount === 1 ? "" : "s"} are open.`,
    `${agentCount} agent signal${agentCount === 1 ? "" : "s"} are active.`,
    `${memoryCount} trusted memor${memoryCount === 1 ? "y" : "ies"} are available.`,
    `Release health reads ${releaseStatus}.`,
    "I will answer, route, draft safe requests, and keep execution locked until the gated workflow approves it.",
  ].join(" ");
}

function buildApexCockpitQuestionEnvelope(question, { personalityMode = "operator", route, memoryCount = 0, turns = [], interrupted = false } = {}) {
  const personality = findApexCockpitPersonalityMode(personalityMode);
  return [
    "Apex Life operator mode.",
    personality.prompt,
    `Matched room: ${route?.label || "Ask Apex"}.`,
    `Trusted memory count visible: ${memoryCount}.`,
    `Recent page conversation:\n${buildApexCockpitTurnMemory(turns)}`,
    interrupted ? "The operator interrupted Apex while it was speaking. Stop the prior answer, prioritize this new request, and answer naturally from the updated context." : "",
    `User request: ${String(question || "").trim()}`,
  ].filter(Boolean).join("\n").slice(0, 1100);
}

function inferApexCockpitAgentRole(question = "", route = {}) {
  const normalized = String(question || "").toLowerCase();
  if (/\bqa|test|smoke|verify|browser|mobile|audit\b/.test(normalized)) return "qa";
  if (/\brelease|deploy|production|rollback|backup\b/.test(normalized) || route?.id === "release-desk") return "release";
  if (/\bmarketing|instagram|content|campaign|ad\b/.test(normalized)) return "marketing";
  if (/\bsales|lead|follow up|demo|outreach\b/.test(normalized)) return "sales";
  if (/\bcustomer|onboard|success|account health\b/.test(normalized)) return "customer-success";
  if (/\bmonitor|watch|health|alert|stalled\b/.test(normalized)) return "monitoring";
  return "build";
}

function inferApexCockpitAgentRequestType(question = "") {
  const normalized = String(question || "").toLowerCase();
  if (/\bpause|hold|stop agent\b/.test(normalized)) return "pause";
  if (/\bresume|continue agent|restart agent\b/.test(normalized)) return "resume";
  return "scoped-run";
}

function buildApexCockpitAgentControlDraft(question = "", route = {}) {
  const trimmedQuestion = String(question || "").trim();
  const agentRole = inferApexCockpitAgentRole(trimmedQuestion, route);
  const requestType = inferApexCockpitAgentRequestType(trimmedQuestion);
  const riskLevel = /\bdeploy|production|billing|customer|send|email|sms|delete|payment\b/i.test(trimmedQuestion) ? "high" : "medium";
  const titlePrefix = requestType === "pause" ? "Pause" : requestType === "resume" ? "Resume" : "Scoped";
  return {
    title: `${titlePrefix} ${agentRole} agent request from Apex Life`.slice(0, 150),
    requestType,
    agentRole,
    riskLevel,
    objective: trimmedQuestion || "Review the Apex Life command and prepare the next safe agent step.",
    scope: "Apex HQ private operator work only. No customer-visible sends, provider actions, billing, ad spend, production deploy, production data mutation, deletion, or irreversible external action.",
    validationPlan: "Run focused tests, role/permission checks, build, and browser/mobile QA before closing this request.",
    rollbackPlan: "Close or archive this locked request and revert the scoped branch commit if validation fails.",
    sourceLabel: "Apex Life Voice/Text Command",
    sourceUri: "apex-life://command",
    operatorNote: "Created by Apex Life command routing. Execution remains locked and requires the gated workflow.",
    status: "requested",
  };
}

function apexCockpitMemoryText(value = "", limit = 1800) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, limit);
}

function apexCockpitSafeMemoryText(value = "", limit = 1800) {
  return apexCockpitMemoryText(redactApexOsMemoryText(value, limit), limit);
}

function buildApexCockpitTurnMemoryDraft({ question = "", answer = {}, route = {}, requestId = "" } = {}) {
  const safeQuestion = apexCockpitSafeMemoryText(question || route?.label || "Apex live operator turn", 700);
  const safeAnswer = apexCockpitSafeMemoryText(answer?.answer || "Apex gave a source-backed answer in Live Operator Mode.", 950);
  const sourceLabels = Array.isArray(answer?.sourceLabels)
    ? answer.sourceLabels.map((label) => apexCockpitSafeMemoryText(label, 80)).filter(Boolean)
    : [];
  const sourceKey = apexCockpitMemoryText(requestId || `${Date.now()}`, 90).replace(/[^a-z0-9_-]+/gi, "-");

  return {
    ...buildApexOsAskDecisionDraft({ question: safeQuestion, answer, requestId: sourceKey }),
    title: apexCockpitMemoryText(`Apex live turn: ${safeQuestion}`, 140),
    body: apexCockpitMemoryText([
      `Operator request: ${safeQuestion}`,
      `Apex answer summary: ${safeAnswer}`,
      sourceLabels.length ? `Source labels: ${sourceLabels.join(", ")}` : "Source labels: Apex Live Operator Mode",
      `Next safe action: ${apexCockpitSafeMemoryText(answer?.nextAction || route?.detail || "Review this memory before trusting it.", 240)}`,
    ].join(" "), 1800),
    sourceType: "apex-live-operator-turn",
    sourceLabel: "Apex Live Operator Mode",
    sourceUri: `apex-life://turn/${sourceKey}`,
    status: "suggested",
    reviewNote: "Suggested from Apex Live Operator Mode answer; manual approval required before trusted memory.",
    confidence: 76,
  };
}

function ApexMiniWaveform({ bars = [8, 13, 7, 18, 10, 22, 12, 16, 9, 20, 8, 14], mode = "listening" }) {
  const voiceMode = APEX_COCKPIT_VOICE_STATES[mode] ? mode : "listening";
  return (
    <div className={`co-apex-mini-waveform co-apex-mini-waveform--${voiceMode} flex h-8 min-w-0 items-center gap-1`} data-voice-state={voiceMode} aria-hidden="true">
      {bars.map((height, index) => (
        <span
          key={`${height}-${index}`}
          className="co-apex-mini-waveform-bar w-0.5 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.72)]"
          style={{ height, "--apex-wave-index": index }}
        />
      ))}
    </div>
  );
}

function ApexCockpitAvatar({ voiceMode = "listening", voiceLevel = 0 }) {
  const mode = APEX_COCKPIT_VOICE_STATES[voiceMode] ? voiceMode : "listening";
  const visualState = APEX_COCKPIT_VOICE_STATES[mode];
  const levelNumber = Math.max(0.08, Math.min(1, Number(voiceLevel || 0) * 6));
  const level = levelNumber.toFixed(2);
  return (
    <div
      className={`co-apex-life-body co-apex-life-body--${mode} relative mx-auto flex min-h-[360px] w-full max-w-[540px] items-center justify-center overflow-hidden xl:min-h-[385px]`}
      data-voice-state={mode}
      aria-label="Apex digital body"
      style={{
        "--apex-voice-level": level,
        "--apex-voice-ring-glow": `${Math.round(30 + (30 * levelNumber))}px`,
        "--apex-voice-eye-glow": `${Math.round(16 + (18 * levelNumber))}px`,
        "--apex-voice-core-glow": `${Math.round(24 + (34 * levelNumber))}px`,
        "--apex-voice-level-glow": `${Math.round(16 + (34 * levelNumber))}px`,
        "--apex-voice-scale": (0.84 + (0.42 * levelNumber)).toFixed(2),
        "--apex-voice-low-scale": (0.998 + (0.01 * levelNumber)).toFixed(3),
        "--apex-voice-high-scale": (1.008 + (0.02 * levelNumber)).toFixed(3),
        "--apex-voice-core-low-scale": (0.94 + (0.04 * levelNumber)).toFixed(3),
        "--apex-voice-core-high-scale": (1.06 + (0.22 * levelNumber)).toFixed(3),
        "--apex-voice-opacity": (0.22 + (0.7 * levelNumber)).toFixed(2),
        "--apex-voice-orbit-opacity": (0.38 + (0.34 * levelNumber)).toFixed(2),
      }}
    >
      <span className="co-apex-life-orbit co-apex-life-orbit--one" aria-hidden="true" />
      <span className="co-apex-life-orbit co-apex-life-orbit--two" aria-hidden="true" />
      <span className="co-apex-life-orbit co-apex-life-orbit--three" aria-hidden="true" />
      <span className="co-apex-life-ring co-apex-life-ring--outer" aria-hidden="true" />
      <span className="co-apex-life-ring co-apex-life-ring--inner" aria-hidden="true" />
      <span className="co-apex-life-horizon" aria-hidden="true" />
      <span className="co-apex-life-scan co-apex-life-scan--vertical" aria-hidden="true" />
      <span className="co-apex-life-scan co-apex-life-scan--horizontal" aria-hidden="true" />
      <img
        src="/brand/apex-cockpit-body-reference.png"
        alt={`${visualState.headline} digital body`}
        className="co-apex-life-body-image h-full max-h-[385px] w-full object-contain object-center"
        draggable="false"
      />
      <span className="co-apex-life-eyes" aria-hidden="true" />
      <span className="co-apex-life-core" aria-hidden="true" />
      <span className="co-apex-life-level" aria-hidden="true" />
      <span className="co-apex-life-status" aria-hidden="true">{visualState.headline.toUpperCase()}</span>
      <span className="sr-only">{visualState.detail}</span>
    </div>
  );
}

function ApexCockpitCommandStream({ turns, route, onOpenRoute, onCreateAgentRequest, onBrief, onAnswerCurrent, creatingAgentRequest = false }) {
  const toneClass = {
    green: "border-emerald-400/24 bg-emerald-500/[0.06] text-emerald-200",
    blue: "border-cyan-400/24 bg-cyan-500/[0.06] text-cyan-200",
    amber: "border-orange-400/26 bg-orange-500/[0.08] text-orange-200",
    red: "border-red-400/24 bg-red-500/[0.07] text-red-200",
    slate: "border-slate-700 bg-slate-900/74 text-slate-200",
  };
  const safeRoute = route || buildApexCockpitCommandRoute("");
  const visibleTurns = Array.isArray(turns) ? turns.slice(0, 4) : [];
  return (
    <section className="grid min-w-0 gap-2 rounded-lg border border-cyan-200/12 bg-slate-950/78 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]" aria-label="Apex command stream">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-cyan-400/10 text-cyan-200">
            <Icon name="spark" className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">Command stream</p>
            <p className="min-w-0 break-words text-xs font-black text-slate-100">{safeRoute.label}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onOpenRoute(safeRoute.section)}
          className="co-focus-ring inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-slate-700 bg-slate-900/82 px-2 text-[10px] font-black text-slate-200 transition hover:border-orange-400/70 hover:text-white"
          title={safeRoute.actionLabel}
        >
          <Icon name="arrowUpRight" className="h-3.5 w-3.5" />
          {safeRoute.actionLabel}
        </button>
      </div>
      <div className={`rounded-md border px-3 py-2 ${toneClass[safeRoute.tone] || toneClass.slate}`}>
        <p className="text-[11px] font-bold leading-4">{safeRoute.detail}</p>
      </div>
      <div className="flex min-w-0 flex-wrap gap-1.5">
        {(safeRoute.suggestedActions || []).map((action) => (
          <button
            key={action}
            type="button"
            onClick={() => (action === "Draft locked request" ? onCreateAgentRequest?.() : action === "Brief me" ? onBrief?.() : action === "Answer from memory" ? onAnswerCurrent?.() : action.includes("Open") ? onOpenRoute(safeRoute.section) : null)}
            disabled={action === "Draft locked request" ? creatingAgentRequest : false}
            className="co-focus-ring inline-flex min-h-7 items-center rounded-md border border-slate-800 bg-slate-900/70 px-2 text-[10px] font-black text-slate-300 transition hover:border-cyan-400/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-70"
          >
            {action === "Draft locked request" && creatingAgentRequest ? "Drafting..." : action}
          </button>
        ))}
      </div>
      <div className="grid min-w-0 gap-1.5">
        {visibleTurns.length ? visibleTurns.map((turn) => (
          <div key={turn.id} className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-md border border-slate-800 bg-slate-900/58 px-2.5 py-2">
            <Icon name={turn.source === "memory" ? "database" : turn.source === "interrupt" ? "alert" : turn.source === "voice" ? "phone" : "check"} className="h-3.5 w-3.5 text-cyan-300" />
            <p className="min-w-0 truncate text-[11px] font-bold text-slate-300">{turn.question}</p>
            <span className="text-[9px] font-black uppercase tracking-[0.08em] text-slate-500">{turn.status === "agent-requested" ? "locked" : turn.routeLabel}</span>
          </div>
        )) : (
          <p className="rounded-md border border-dashed border-slate-800 px-3 py-2 text-[11px] font-bold leading-4 text-slate-500">Your voice and typed requests will appear here as Apex routes them.</p>
        )}
      </div>
    </section>
  );
}

function AutonomyRunCenterPanel({
  state,
  route,
  sessionToken = "",
  onOpenAgents,
  onOpenApprovals,
  onCreateAgentRequest,
  creatingAgentRequest = false,
  variant = "light",
}) {
  const center = state.autonomyRunCenter || {};
  const safeRoute = route || buildApexCockpitCommandRoute("");
  const [runRequest, setRunRequest] = useState("");
  const [ledgerRuns, setLedgerRuns] = useState(center.runRows || []);
  const [ledgerSummary, setLedgerSummary] = useState(center.runSummary || null);
  const [selectedRunId, setSelectedRunId] = useState(center.latestRun?.id || center.runRows?.[0]?.id || "");
  const [ledgerBusy, setLedgerBusy] = useState("");
  const [ledgerMessage, setLedgerMessage] = useState("");
  const dark = variant === "dark";
  const shellClass = dark
    ? "border-cyan-200/14 bg-slate-950/72 text-white"
    : "border-slate-200 bg-white text-slate-950";
  const panelClass = dark
    ? "border-slate-800 bg-slate-900/58"
    : "border-slate-200 bg-slate-50";
  const mutedText = dark ? "text-slate-400" : "text-slate-600";
  const strongText = dark ? "text-slate-100" : "text-slate-950";
  const labelText = dark ? "text-cyan-300" : "text-orange-700";
  const buttonClass = dark
    ? "border-cyan-200/16 bg-white/[0.045] text-slate-100 hover:border-orange-400/60 hover:bg-orange-500/10"
    : "border-slate-200 bg-white text-slate-800 hover:border-orange-300 hover:bg-orange-50";
  const visibleRuns = (ledgerRuns?.length ? ledgerRuns : center.runRows || []).slice(0, 6);
  const summary = ledgerSummary || center.runSummary || {};
  const activeRun = visibleRuns.find((run) => run.id === selectedRunId) || visibleRuns[0] || null;
  const displayStatus = summary.active ? "Autonomy runs active" : center.status || "Guarded autonomy ready";
  const displayTone = summary.blocked ? "amber" : summary.active ? "green" : center.tone || "green";
  const metricRows = [
    { label: "Mode", value: center.mode || "Review-first autonomy", tone: displayTone },
    { label: "Runs", value: `${summary.total || 0} saved`, tone: summary.active ? "green" : "blue" },
    { label: "Plan", value: `${center.planStepCount || 0} steps`, tone: "blue" },
    { label: "Routes", value: `${center.routeCount || 0} lanes`, tone: "blue" },
    { label: "Execution", value: center.executionLocked ? "Locked" : "Open", tone: center.executionLocked ? "amber" : "green" },
  ];
  const nextSafeAction = safeRoute.commandAction === "draft-agent-control-request"
    ? "Draft a locked agent request"
    : safeRoute.commandAction === "open-section"
      ? `Open ${safeRoute.label}`
      : "Answer from approved context";

  useEffect(() => {
    let cancelled = false;
    async function loadRuns() {
      if (!sessionToken) {
        setLedgerRuns(center.runRows || []);
        setLedgerSummary(center.runSummary || null);
        return;
      }
      try {
        const payload = await getApexOsAutonomyRuns(sessionToken);
        if (cancelled) return;
        const nextRuns = payload.apexOsAutonomyRuns || [];
        setLedgerRuns(nextRuns);
        setLedgerSummary(payload.summary || null);
        setSelectedRunId((current) => current || nextRuns[0]?.id || "");
      } catch (error) {
        if (!cancelled) setLedgerMessage(error.message || "Could not load the run ledger.");
      }
    }
    loadRuns();
    return () => {
      cancelled = true;
    };
  }, [sessionToken, center.runRows, center.runSummary]);

  async function refreshRuns(nextPayload = null) {
    if (nextPayload?.apexOsAutonomyRuns) {
      setLedgerRuns(nextPayload.apexOsAutonomyRuns || []);
      setLedgerSummary(nextPayload.summary || null);
      return nextPayload;
    }
    if (!sessionToken) return null;
    const payload = await getApexOsAutonomyRuns(sessionToken);
    setLedgerRuns(payload.apexOsAutonomyRuns || []);
    setLedgerSummary(payload.summary || null);
    return payload;
  }

  async function handleCreateRun() {
    if (!sessionToken) return;
    const request = runRequest.trim() || `Prepare ${safeRoute.label}: ${safeRoute.detail}`;
    setLedgerBusy("create");
    setLedgerMessage("");
    try {
      const payload = await createApexOsAutonomyRun(sessionToken, {
        request,
        routeId: safeRoute.id,
        routeLabel: safeRoute.label,
        routeDetail: safeRoute.detail,
        sourceLabel: "Apex Autonomy Run Center",
      });
      await refreshRuns(payload);
      setSelectedRunId(payload.apexOsAutonomyRun?.id || "");
      setRunRequest("");
      setLedgerMessage("Run saved. Apex can now draft internal work against this ledger entry.");
    } catch (error) {
      setLedgerMessage(error.message || "Could not save this run.");
    } finally {
      setLedgerBusy("");
    }
  }

  async function handleDraftInternal(runId = activeRun?.id) {
    if (!sessionToken || !runId) return;
    setLedgerBusy(`draft-${runId}`);
    setLedgerMessage("");
    try {
      const payload = await draftApexOsAutonomyRunInternalWork(sessionToken, runId);
      await refreshRuns(payload);
      setSelectedRunId(payload.apexOsAutonomyRun?.id || runId);
      setLedgerMessage("Internal draft package prepared. Execution, sends, billing, provider work, and production actions stayed locked.");
    } catch (error) {
      setLedgerMessage(error.message || "Could not draft internal work for this run.");
    } finally {
      setLedgerBusy("");
    }
  }

  async function handleUpdateRun(runId, patch) {
    if (!sessionToken || !runId) return;
    setLedgerBusy(`${patch.status || "update"}-${runId}`);
    setLedgerMessage("");
    try {
      const payload = await updateApexOsAutonomyRun(sessionToken, runId, patch);
      await refreshRuns(payload);
      setSelectedRunId(payload.apexOsAutonomyRun?.id || runId);
      setLedgerMessage(patch.status === "done" ? "Run marked done with a result report." : patch.status === "blocked" ? "Run marked blocked for review." : "Run updated.");
    } catch (error) {
      setLedgerMessage(error.message || "Could not update this run.");
    } finally {
      setLedgerBusy("");
    }
  }

  return (
    <section className={`grid min-w-0 gap-3 rounded-lg border p-3 ${shellClass}`} aria-label="Autonomy Run Center">
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className={`text-[10px] font-black uppercase tracking-[0.14em] ${labelText}`}>Autonomy Run Center</p>
          <h3 className={`mt-1 break-words text-base font-black ${strongText}`}>{displayStatus}</h3>
          <p className={`mt-1 break-words text-xs font-bold leading-5 ${mutedText}`}>
            Apex turns your request into a visible run plan, routes it to the right room or agent, tracks evidence, and stops before approval-gated actions.
          </p>
          <p className={`mt-1 break-words text-[11px] font-black leading-4 ${mutedText}`}>
            Autonomy Core: Safe internal drafts are on; customer sends, billing, ads, production changes, and irreversible external actions remain gated.
          </p>
        </div>
        <ToneBadge tone={displayTone}>{center.externalActionsLocked ? "External locked" : "Review-first"}</ToneBadge>
      </div>

      <div className="grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-5">
        {metricRows.map((item) => (
          <div key={item.label} className={`min-w-0 rounded-md border px-3 py-2 ${panelClass}`}>
            <p className={`text-[9px] font-black uppercase tracking-[0.1em] ${dark ? "text-slate-500" : "text-slate-500"}`}>{item.label}</p>
            <p className={`mt-0.5 truncate text-[11px] font-black ${item.tone === "green" ? dark ? "text-emerald-300" : "text-emerald-700" : item.tone === "amber" ? dark ? "text-orange-300" : "text-orange-700" : dark ? "text-cyan-200" : "text-cyan-700"}`}>{item.value}</p>
          </div>
        ))}
      </div>

      <div className={`grid min-w-0 gap-3 rounded-lg border p-3 ${panelClass}`}>
        <div className="grid min-w-0 gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(220px,0.42fr)]">
          <div className="min-w-0">
            <p className={`text-[10px] font-black uppercase tracking-[0.12em] ${labelText}`}>Current command route</p>
            <p className={`mt-1 break-words text-sm font-black ${strongText}`}>{safeRoute.label}</p>
            <p className={`mt-1 break-words text-xs font-bold leading-5 ${mutedText}`}>{safeRoute.detail}</p>
          </div>
          <div className={`min-w-0 rounded-md border px-3 py-2 ${dark ? "border-orange-400/22 bg-orange-500/10" : "border-orange-200 bg-orange-50"}`}>
            <p className={`text-[10px] font-black uppercase tracking-[0.1em] ${dark ? "text-orange-200" : "text-orange-800"}`}>Next safe action</p>
            <p className={`mt-1 break-words text-xs font-black ${dark ? "text-orange-100" : "text-orange-950"}`}>{nextSafeAction}</p>
          </div>
        </div>
        <div className="flex min-w-0 flex-wrap gap-2">
          <button type="button" onClick={onOpenAgents} className={`co-focus-ring min-h-8 rounded-md border px-3 text-[11px] font-black transition ${buttonClass}`}>
            <Icon name="users" className="mr-1.5 inline h-3.5 w-3.5" /> Open agents
          </button>
          <button type="button" onClick={onOpenApprovals} className={`co-focus-ring min-h-8 rounded-md border px-3 text-[11px] font-black transition ${buttonClass}`}>
            <Icon name="lock" className="mr-1.5 inline h-3.5 w-3.5" /> Open approvals
          </button>
          <button
            type="button"
            onClick={onCreateAgentRequest}
            disabled={creatingAgentRequest || safeRoute.id !== "agent-control"}
            className={`co-focus-ring min-h-8 rounded-md border px-3 text-[11px] font-black transition disabled:cursor-not-allowed disabled:opacity-65 ${buttonClass}`}
            title={safeRoute.id === "agent-control" ? "Draft a locked agent request" : "Ask for agent work first"}
          >
            <Icon name="clipboard" className="mr-1.5 inline h-3.5 w-3.5" /> {creatingAgentRequest ? "Drafting..." : "Draft locked run"}
          </button>
        </div>
      </div>

      <div className={`grid min-w-0 gap-3 rounded-lg border p-3 ${panelClass}`}>
        <div className="grid min-w-0 gap-2 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <label className="min-w-0">
            <span className={`text-[10px] font-black uppercase tracking-[0.12em] ${labelText}`}>Save a run</span>
            <textarea
              value={runRequest}
              onChange={(event) => setRunRequest(event.target.value)}
              rows={3}
              className={`co-focus-ring mt-1 w-full resize-none rounded-md border px-3 py-2 text-xs font-bold leading-5 outline-none ${dark ? "border-slate-700 bg-slate-950/60 text-slate-100 placeholder:text-slate-600" : "border-slate-200 bg-white text-slate-950 placeholder:text-slate-400"}`}
              placeholder="Tell Apex what to turn into a saved, review-first run..."
            />
          </label>
          <div className="flex min-w-0 flex-wrap gap-2">
            <button
              type="button"
              onClick={handleCreateRun}
              disabled={!sessionToken || ledgerBusy === "create"}
              className={`co-focus-ring min-h-9 rounded-md border px-3 text-[11px] font-black transition disabled:cursor-not-allowed disabled:opacity-65 ${buttonClass}`}
            >
              <Icon name="plus" className="mr-1.5 inline h-3.5 w-3.5" /> {ledgerBusy === "create" ? "Saving..." : "Save run"}
            </button>
            <button
              type="button"
              onClick={() => handleDraftInternal(activeRun?.id)}
              disabled={!sessionToken || !activeRun || ledgerBusy === `draft-${activeRun?.id}`}
              className={`co-focus-ring min-h-9 rounded-md border px-3 text-[11px] font-black transition disabled:cursor-not-allowed disabled:opacity-65 ${buttonClass}`}
            >
              <Icon name="clipboard" className="mr-1.5 inline h-3.5 w-3.5" /> {ledgerBusy === `draft-${activeRun?.id}` ? "Drafting..." : "Draft internal work"}
            </button>
          </div>
        </div>
        {ledgerMessage ? (
          <p className={`rounded-md border px-3 py-2 text-[11px] font-black leading-4 ${dark ? "border-cyan-200/14 bg-cyan-400/10 text-cyan-100" : "border-cyan-200 bg-cyan-50 text-cyan-900"}`}>{ledgerMessage}</p>
        ) : null}
        <div className="grid min-w-0 gap-2">
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
            <p className={`text-[10px] font-black uppercase tracking-[0.12em] ${labelText}`}>Run ledger</p>
            <ToneBadge tone={summary.active ? "green" : "blue"}>{summary.active || 0} active</ToneBadge>
          </div>
          {visibleRuns.length ? (
            <div className="grid min-w-0 gap-2 lg:grid-cols-2">
              {visibleRuns.map((run) => (
                <div
                  key={run.id}
                  className={`min-w-0 rounded-md border px-3 py-2 ${selectedRunId === run.id ? dark ? "border-cyan-300/45 bg-cyan-400/10" : "border-orange-300 bg-orange-50" : panelClass}`}
                >
                  <button type="button" onClick={() => setSelectedRunId(run.id)} className="co-focus-ring block w-full min-w-0 text-left">
                    <div className="flex min-w-0 items-start justify-between gap-2">
                      <p className={`min-w-0 break-words text-[11px] font-black ${strongText}`}>{run.title}</p>
                      <ToneBadge tone={run.tone || "slate"}>{run.status}</ToneBadge>
                    </div>
                    <p className={`mt-1 line-clamp-2 break-words text-[10px] font-bold leading-4 ${mutedText}`}>{run.request || run.nextSafeAction}</p>
                    <p className={`mt-1 truncate text-[9px] font-black uppercase tracking-[0.08em] ${mutedText}`}>{run.routeLabel || "Apex"} {run.linkedExecutionHandoffId ? " / handoff linked" : ""}</p>
                  </button>
                  <div className="mt-2 flex min-w-0 flex-wrap gap-1.5">
                    <button type="button" onClick={() => handleDraftInternal(run.id)} disabled={!sessionToken || ledgerBusy === `draft-${run.id}`} className={`co-focus-ring min-h-7 rounded-md border px-2 text-[10px] font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${buttonClass}`}>
                      {ledgerBusy === `draft-${run.id}` ? "Drafting..." : "Draft"}
                    </button>
                    <button type="button" onClick={() => handleUpdateRun(run.id, { status: "done", resultReport: run.resultReport || "Operator marked this review-first run done after reviewing available evidence." })} disabled={!sessionToken || ledgerBusy === `done-${run.id}`} className={`co-focus-ring min-h-7 rounded-md border px-2 text-[10px] font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${buttonClass}`}>
                      Done
                    </button>
                    <button type="button" onClick={() => handleUpdateRun(run.id, { status: "blocked", operatorNote: "Operator marked this autonomy run blocked for review." })} disabled={!sessionToken || ledgerBusy === `blocked-${run.id}`} className={`co-focus-ring min-h-7 rounded-md border px-2 text-[10px] font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${buttonClass}`}>
                      Block
                    </button>
                    <button type="button" onClick={() => handleUpdateRun(run.id, { status: "archived" })} disabled={!sessionToken || ledgerBusy === `archived-${run.id}`} className={`co-focus-ring min-h-7 rounded-md border px-2 text-[10px] font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${buttonClass}`}>
                      Archive
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className={`rounded-md border border-dashed px-3 py-3 text-[11px] font-bold leading-4 ${dark ? "border-slate-800 text-slate-500" : "border-slate-200 text-slate-500"}`}>No saved autonomy runs yet. Save a run to give Apex a real history item to plan, draft, validate, and report against.</p>
          )}
        </div>
      </div>

      <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
        <div className="grid min-w-0 gap-2">
          <p className={`text-[10px] font-black uppercase tracking-[0.12em] ${labelText}`}>Run plan</p>
          <div className="grid min-w-0 gap-1.5">
            {(center.planRows || []).map((item, index) => (
              <div key={item.id} className={`grid min-w-0 grid-cols-[1.6rem_minmax(0,1fr)_auto] items-center gap-2 rounded-md border px-2.5 py-2 ${panelClass}`}>
                <span className={`grid h-6 w-6 place-items-center rounded-md text-[10px] font-black ${dark ? "bg-cyan-400/10 text-cyan-200" : "bg-slate-950 text-white"}`}>{index + 1}</span>
                <span className="min-w-0">
                  <span className={`block truncate text-[11px] font-black ${strongText}`}>{item.title}</span>
                  <span className={`block truncate text-[10px] font-bold ${mutedText}`}>{item.detail}</span>
                </span>
                <ToneBadge tone={item.tone}>{item.status}</ToneBadge>
              </div>
            ))}
          </div>
        </div>

        <div className="grid min-w-0 gap-3">
          <div className="grid min-w-0 gap-2">
            <p className={`text-[10px] font-black uppercase tracking-[0.12em] ${labelText}`}>Routing lanes</p>
            {(center.routeRows || []).map((item) => (
              <div key={item.id} className={`min-w-0 rounded-md border px-3 py-2 ${panelClass}`}>
                <div className="flex min-w-0 items-start justify-between gap-2">
                  <p className={`min-w-0 break-words text-[11px] font-black ${strongText}`}>{item.title}</p>
                  <ToneBadge tone={item.tone}>{item.status}</ToneBadge>
                </div>
                <p className={`mt-1 break-words text-[10px] font-bold leading-4 ${mutedText}`}>{item.detail}</p>
              </div>
            ))}
          </div>

          <div className="grid min-w-0 gap-2">
            <p className={`text-[10px] font-black uppercase tracking-[0.12em] ${labelText}`}>Execution gates</p>
            {(center.gateRows || []).map((item) => (
              <div key={item.id} className={`min-w-0 rounded-md border px-3 py-2 ${panelClass}`}>
                <div className="flex min-w-0 items-start justify-between gap-2">
                  <p className={`min-w-0 break-words text-[11px] font-black ${strongText}`}>{item.title}</p>
                  <ToneBadge tone={item.tone}>{item.status}</ToneBadge>
                </div>
                <p className={`mt-1 break-words text-[10px] font-bold leading-4 ${mutedText}`}>{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function AutonomyRunCenterCompactPanel({
  state,
  route,
  onOpenAgents,
  onOpenApprovals,
  onCreateAgentRequest,
  creatingAgentRequest = false,
}) {
  const center = state.autonomyRunCenter || {};
  const safeRoute = route || buildApexCockpitCommandRoute("");
  const gates = center.gateRows || [];
  const primaryGate = gates.find((item) => item.id === "autonomy-private-drafts") || gates[0];
  const savedRunCount = center.savedRunCount || center.runSummary?.total || 0;
  const activeRunCount = center.activeRunCount || center.runSummary?.active || 0;
  const latestRun = center.latestRun || center.runRows?.[0] || null;
  const nextSafeAction = safeRoute.commandAction === "draft-agent-control-request"
    ? "Draft a locked agent request"
    : safeRoute.commandAction === "open-section"
      ? `Open ${safeRoute.label}`
      : "Answer from approved context";

  return (
    <section className="grid min-w-0 gap-3" aria-label="Autonomy Run Center">
      <div className="flex min-w-0 flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-cyan-300">Autonomy Run Center</p>
          <h3 className="mt-1 text-base font-black text-white">{center.status || "Guarded autonomy ready"}</h3>
          <p className="mt-1 max-w-4xl break-words text-[11px] font-bold leading-4 text-slate-400">
            Autonomy Core: Apex plans, routes, drafts, validates, and stops before approval-gated actions.
          </p>
        </div>
        <ToneBadge tone={center.tone || "green"}>{center.externalActionsLocked ? "External locked" : "Review-first"}</ToneBadge>
      </div>

      <div className="grid min-w-0 gap-2 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,0.9fr)]">
        <div className="min-w-0 rounded-md border border-slate-800 bg-slate-900/58 px-3 py-2">
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-cyan-300">Current command route</p>
          <p className="mt-1 truncate text-xs font-black text-slate-100">{safeRoute.label}</p>
          <p className="mt-1 line-clamp-2 break-words text-[11px] font-bold leading-4 text-slate-500">{safeRoute.detail}</p>
        </div>
        <div className="min-w-0 rounded-md border border-orange-400/22 bg-orange-500/10 px-3 py-2">
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-orange-200">Next safe action</p>
          <p className="mt-1 break-words text-xs font-black text-orange-100">{nextSafeAction}</p>
          <p className="mt-1 text-[10px] font-bold text-orange-100/72">{center.planStepCount || 0} plan steps, {center.routeCount || 0} lanes, execution locked.</p>
        </div>
        <div className="min-w-0 rounded-md border border-slate-800 bg-slate-900/58 px-3 py-2">
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-cyan-300">Execution gates</p>
          <p className="mt-1 text-xs font-black text-slate-100">{center.gatedActionCount || 0} approval gates stay manual</p>
          <p className="mt-1 line-clamp-2 text-[10px] font-bold leading-4 text-slate-500">{primaryGate?.title || "Private reversible drafts"}: {primaryGate?.status || "Allowed when asked"}</p>
        </div>
        <div className="min-w-0 rounded-md border border-slate-800 bg-slate-900/58 px-3 py-2">
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-cyan-300">Saved runs</p>
          <p className="mt-1 text-xs font-black text-slate-100">{savedRunCount} saved / {activeRunCount} active</p>
          <p className="mt-1 line-clamp-2 break-words text-[10px] font-bold leading-4 text-slate-500">{latestRun ? latestRun.title : "No saved autonomy run yet."}</p>
        </div>
      </div>

      <div className="flex min-w-0 flex-wrap gap-2">
        <ApexCockpitControlButton className="px-3" disabled={false} onClick={onOpenAgents} active={false} title="Open the full Autonomy Run Center">
          <Icon name="layers" /> Open Run Center
        </ApexCockpitControlButton>
        <ApexCockpitControlButton className="px-3" disabled={false} onClick={onOpenApprovals} active={false} title="Open approval gates">
          <Icon name="lock" /> Open approvals
        </ApexCockpitControlButton>
        <ApexCockpitControlButton className="px-3" disabled={creatingAgentRequest || safeRoute.id !== "agent-control"} onClick={onCreateAgentRequest} active={creatingAgentRequest} title="Draft a locked agent request">
          <Icon name="clipboard" /> {creatingAgentRequest ? "Drafting..." : "Draft locked run"}
        </ApexCockpitControlButton>
      </div>
    </section>
  );
}

function ApexCockpitListItem({ item, value, tone = "slate" }) {
  const textTone = {
    green: "text-emerald-300",
    blue: "text-cyan-300",
    amber: "text-orange-300",
    red: "text-red-300",
    slate: "text-slate-300",
  };
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 py-1">
      <div className="flex min-w-0 items-center gap-2">
        <Icon name={item.icon || "grid"} className="h-3.5 w-3.5 shrink-0 text-slate-500" />
        <span className="min-w-0 break-words text-[11px] font-bold text-slate-300">{item.label}</span>
      </div>
      <span className={`shrink-0 text-xs font-black ${textTone[tone] || textTone.slate}`}>{value}</span>
    </div>
  );
}

function formatApexCockpitClock(date = new Date()) {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatApexCockpitPulseTime(value) {
  if (!value) return "Pending";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Pending";
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function summarizeApexCockpitLivePulse({ state, buildPayload, briefingPayload, runsPayload, checkedAt = new Date() } = {}) {
  const buildAwareness = buildPayload?.buildAwareness || {};
  const dailyBriefing = briefingPayload?.dailyBriefing || {};
  const runSummary = runsPayload?.summary || state?.autonomyRunCenter?.runSummary || {};
  const alertCount = Number(dailyBriefing.alertCount || dailyBriefing.alerts?.length || dailyBriefing.alertRows?.length || 0);
  const rowCount = Number(dailyBriefing.rowCount || dailyBriefing.rows?.length || state?.releaseMonitoring?.briefingCount || 0);
  const blockerCount = Number(
    buildAwareness.knownBlockers?.length
      || buildAwareness.blockers?.length
      || state?.launchReadiness?.blockedCount
      || state?.approvalCommandCenter?.packetSummary?.blocked
      || 0,
  );
  const releaseVersion = state?.releaseDesk?.currentVersion
    ? `v${state.releaseDesk.currentVersion}`
    : state?.releaseDesk?.deployHistoryRows?.[0]?.status || "Live";
  const releaseStatus = buildAwareness.releaseStatus
    || state?.releaseDesk?.status
    || state?.releaseMonitoring?.status
    || "Checked";
  return {
    checkedAt: checkedAt.toISOString(),
    releaseVersion,
    releaseStatus,
    runSummary,
    alertCount,
    rowCount,
    blockerCount,
    buildLabel: buildAwareness.headSha ? `Head ${String(buildAwareness.headSha).slice(0, 7)}` : "Build checked",
    requestIds: [buildPayload?.requestId, briefingPayload?.requestId, runsPayload?.requestId].filter(Boolean),
  };
}

function buildApexCockpitPulseRows({ state, pulse, recording, speaking, conversationMode, bargeInEnabled, captionFallbackEnabled = false, captionStatus = "standby", interruptionCount = 0, rememberedTurnCount = 0 } = {}) {
  const summary = pulse?.runSummary || state?.autonomyRunCenter?.runSummary || {};
  const captionActive = captionStatus === "captioning" || captionStatus === "interim";
  const caughtInterruptions = Number(interruptionCount || 0);
  const rememberedTurns = Number(rememberedTurnCount || 0);
  return [
    { label: "Auto Check", value: formatApexCockpitPulseTime(pulse?.checkedAt), tone: pulse?.checkedAt ? "green" : "slate" },
    { label: "Release", value: pulse?.releaseVersion || (state?.releaseDesk?.currentVersion ? `v${state.releaseDesk.currentVersion}` : "Live"), tone: state?.releaseDesk?.tone || "green" },
    { label: "Runs", value: `${Number(summary.active || 0)} active / ${Number(summary.total || 0)} saved`, tone: Number(summary.active || 0) ? "green" : "slate" },
    { label: "Voice Loop", value: recording ? "Listening" : speaking ? "Talking" : conversationMode ? "Open" : "Manual", tone: recording || conversationMode ? "green" : "slate" },
    { label: "Barge-in", value: caughtInterruptions ? `${caughtInterruptions} caught` : bargeInEnabled ? "Armed" : "Off", tone: caughtInterruptions ? "green" : bargeInEnabled ? "amber" : "slate" },
    { label: "Turn Memory", value: rememberedTurns ? `${rememberedTurns} suggested` : "Manual", tone: rememberedTurns ? "green" : "blue" },
    { label: "Captions", value: captionFallbackEnabled ? (captionActive ? "Live" : "Ready") : "Server", tone: captionFallbackEnabled ? "blue" : "slate" },
    { label: "Alerts", value: `${Number(pulse?.alertCount || 0)} alerts`, tone: Number(pulse?.alertCount || 0) ? "amber" : "green" },
    { label: "Blockers", value: `${Number(pulse?.blockerCount || 0)} blockers`, tone: Number(pulse?.blockerCount || 0) ? "amber" : "green" },
    { label: "Safety", value: state?.liveOperatorMode?.externalActionsLocked === false ? "Open" : "Locked", tone: state?.liveOperatorMode?.externalActionsLocked === false ? "red" : "amber" },
  ];
}

function ApexCockpitScreen({ state, activeSection, onChange, askQuestion, setAskQuestion, sessionToken }) {
  const [cockpitResponse, setCockpitResponse] = useState(null);
  const [cockpitError, setCockpitError] = useState("");
  const [cockpitSubmitting, setCockpitSubmitting] = useState(false);
  const [cockpitSpeaking, setCockpitSpeaking] = useState(false);
  const [cockpitVoiceNotice, setCockpitVoiceNotice] = useState("");
  const [cockpitRecording, setCockpitRecording] = useState(false);
  const [cockpitTranscribing, setCockpitTranscribing] = useState(false);
  const [cockpitLastQuestion, setCockpitLastQuestion] = useState("");
  const [cockpitAutoListening, setCockpitAutoListening] = useState(true);
  const [cockpitSpeechActive, setCockpitSpeechActive] = useState(false);
  const [cockpitMicLevel, setCockpitMicLevel] = useState(0);
  const [cockpitOutputLevel, setCockpitOutputLevel] = useState(0);
  const [cockpitConversationMode, setCockpitConversationMode] = useState(true);
  const [cockpitBargeInEnabled, setCockpitBargeInEnabled] = useState(true);
  const [cockpitVoiceProfile, setCockpitVoiceProfile] = useState("alloy");
  const [cockpitPersonalityMode, setCockpitPersonalityMode] = useState("operator");
  const [cockpitAgentActionNotice, setCockpitAgentActionNotice] = useState("");
  const [cockpitCreatingAgentRequest, setCockpitCreatingAgentRequest] = useState(false);
  const [cockpitLiveRunNotice, setCockpitLiveRunNotice] = useState("");
  const [cockpitCreatingLiveRun, setCockpitCreatingLiveRun] = useState(false);
  const [cockpitRememberingTurn, setCockpitRememberingTurn] = useState(false);
  const [cockpitRememberedTurnKeys, setCockpitRememberedTurnKeys] = useState({});
  const [cockpitRememberedTurnCount, setCockpitRememberedTurnCount] = useState(0);
  const [cockpitLivePulse, setCockpitLivePulse] = useState(null);
  const [cockpitLivePulseBusy, setCockpitLivePulseBusy] = useState(false);
  const [cockpitLivePulseError, setCockpitLivePulseError] = useState("");
  const [cockpitMicPermissionState, setCockpitMicPermissionState] = useState("unknown");
  const [cockpitVoiceWakeAttempted, setCockpitVoiceWakeAttempted] = useState(false);
  const [cockpitBrowserTranscript, setCockpitBrowserTranscript] = useState("");
  const [cockpitRecognitionStatus, setCockpitRecognitionStatus] = useState("standby");
  const [cockpitRecognitionError, setCockpitRecognitionError] = useState("");
  const [cockpitInterruptionCount, setCockpitInterruptionCount] = useState(0);
  const [cockpitLastInterruptionLabel, setCockpitLastInterruptionLabel] = useState("");
  const [cockpitClock, setCockpitClock] = useState(() => formatApexCockpitClock());
  const [cockpitFocusDrawer, setCockpitFocusDrawer] = useState("");
  const [cockpitCommandRoute, setCockpitCommandRoute] = useState(() => buildApexCockpitCommandRoute(""));
  const [cockpitTurns, setCockpitTurns] = useState([]);
  const cockpitAudioRef = useRef(null);
  const cockpitAudioUnlockedRef = useRef(false);
  const cockpitOutputFrameRef = useRef(0);
  const cockpitSpeakingRef = useRef(false);
  const cockpitRecordingRef = useRef(false);
  const cockpitBargeInEnabledRef = useRef(true);
  const cockpitBargeInterruptedRef = useRef(false);
  const cockpitBriefingOfferedRef = useRef(false);
  const cockpitRecorderRef = useRef(null);
  const cockpitRecordedChunksRef = useRef([]);
  const cockpitStreamRef = useRef(null);
  const cockpitVoiceOpeningRef = useRef(false);
  const cockpitVoiceAnalyserRef = useRef(null);
  const cockpitVoiceAudioContextRef = useRef(null);
  const cockpitVoiceSourceRef = useRef(null);
  const cockpitVoiceFrameRef = useRef(0);
  const cockpitSpeechRecognitionRef = useRef(null);
  const cockpitRecognitionRestartTimerRef = useRef(0);
  const cockpitRecognitionStopRequestedRef = useRef(false);
  const cockpitBrowserTranscriptRef = useRef("");
  const cockpitInterruptionCountRef = useRef(0);
  const cockpitLastInterruptionLabelRef = useRef("");
  const cockpitPendingInterruptionRef = useRef(false);
  const cockpitSpeechStartedRef = useRef(false);
  const cockpitVoiceStartedAtRef = useRef(0);
  const cockpitLastSoundAtRef = useRef(0);
  const cockpitLastLevelPaintRef = useRef(0);
  const cockpitDiscardNextCaptureRef = useRef(false);
  const approvalRows = (state.approvalCommandCenter?.queueRows || []).slice(0, 4);
  const agentRows = (state.agentControlPlane?.rosterRows || []).slice(0, 4);
  const boundaryRows = [
    { id: "no-sends", title: "No Sends", detail: "I don't send anything.", icon: "inbox" },
    { id: "no-deploys", title: "No Deploys", detail: "I don't deploy anything.", icon: "alert" },
    { id: "no-production", title: "No Production Changes", detail: "I don't change production.", icon: "settings" },
    { id: "no-billing", title: "No Billing Actions", detail: "I don't process payments.", icon: "clock" },
    { id: "review-first", title: "Review-First", detail: "You stay in control.", icon: "check" },
  ];
  const quickPrompts = [
    "Brief me first",
    "What's blocked?",
    "What needs review?",
    "Ask QA agent to check this",
  ];
  const memoryCount = state.decisionMemory?.durableCount || state.decisionMemory?.decisionCount || 0;
  const cockpitVoiceProfileConfig = findApexCockpitVoiceProfile(cockpitVoiceProfile);
  const cockpitPersonalityConfig = findApexCockpitPersonalityMode(cockpitPersonalityMode);
  const cockpitBriefingText = buildApexCockpitProactiveBriefing(state);
  const canUseCockpitRecorder = typeof navigator !== "undefined"
    && Boolean(navigator.mediaDevices?.getUserMedia)
    && typeof MediaRecorder !== "undefined";
  const canUseCockpitSpeechRecognition = Boolean(getApexCockpitSpeechRecognitionCtor());
  const cockpitMicReady = cockpitMicPermissionState === "granted";
  const cockpitNeedsWake = canUseCockpitRecorder && !cockpitMicReady && !cockpitVoiceWakeAttempted;
  const cockpitWakeButtonLabel = cockpitRecording
    ? "Pause Voice"
    : cockpitTranscribing
      ? "Transcribing"
      : cockpitSubmitting
        ? "Thinking"
        : cockpitSpeaking
          ? "Interrupt Voice"
          : cockpitNeedsWake
            ? "Wake Apex"
            : "Resume Voice";
  const releaseVersion = state.releaseDesk?.currentVersion
    ? `v${state.releaseDesk.currentVersion}`
    : state.releaseDesk?.deployHistoryRows?.[0]?.status || "Evidence required";
  const releaseHealth = state.releaseDesk?.status || "Healthy";
  const liveOperatorMode = state.liveOperatorMode || {};
  const cockpitPulseRunSummary = cockpitLivePulse?.runSummary || {};
  const cockpitVisibleSavedRunCount = Number(cockpitPulseRunSummary.total ?? liveOperatorMode.savedRunCount ?? 0);
  const cockpitVisibleActiveRunCount = Number(cockpitPulseRunSummary.active ?? liveOperatorMode.activeRunCount ?? 0);
  const cockpitVisibleLiveStatus = cockpitVisibleActiveRunCount ? "Live operator running" : liveOperatorMode.status || "Live operator ready";
  const cockpitVisibleLiveTone = cockpitVisibleActiveRunCount ? "green" : liveOperatorMode.tone || "blue";
  const cockpitAnswerText = resolveApexCockpitAnswerText(cockpitResponse);
  const cockpitTurnMemoryKey = apexCockpitMemoryText(cockpitResponse?.requestId || `${cockpitLastQuestion}|${cockpitAnswerText}`, 220);
  const cockpitVoiceMode = cockpitError
    ? "blocked"
    : cockpitSpeaking
      ? "speaking"
      : (cockpitSubmitting || cockpitTranscribing)
        ? "thinking"
        : cockpitSpeechActive
          ? "hearing"
          : cockpitRecording
            ? "listening"
            : cockpitAutoListening
              ? "standby"
              : "standby";
  const cockpitVoiceState = APEX_COCKPIT_VOICE_STATES[cockpitVoiceMode];
  const cockpitSources = resolveApexCockpitSources(state, cockpitResponse);
  const cockpitPromptText = cockpitLastQuestion || askQuestion.trim();
  const canAskCockpit = state.canView && Boolean(sessionToken) && Boolean(askQuestion.trim()) && !cockpitSubmitting;
  const canSpeakCockpitAnswer = state.canView && Boolean(sessionToken) && Boolean(cockpitAnswerText) && !cockpitSpeaking;
  const canCreateCockpitLiveRun = state.canView && Boolean(sessionToken) && !cockpitCreatingLiveRun;
  const canRememberCockpitTurn = state.canView
    && Boolean(sessionToken)
    && Boolean(cockpitResponse?.answer)
    && Boolean(cockpitAnswerText)
    && Boolean(cockpitTurnMemoryKey)
    && !cockpitRememberingTurn
    && !cockpitRememberedTurnKeys[cockpitTurnMemoryKey];
  const cockpitLiveLevel = Math.max(cockpitMicLevel, cockpitOutputLevel);
  const canStartCockpitVoice = state.canView && Boolean(sessionToken) && canUseCockpitRecorder && !cockpitRecording && !cockpitTranscribing && !cockpitSubmitting && (!cockpitSpeaking || cockpitBargeInEnabled) && !cockpitVoiceOpeningRef.current;
  const canToggleCockpitVoice = canStartCockpitVoice || cockpitRecording;
  const cockpitPulseRows = buildApexCockpitPulseRows({
    state,
    pulse: cockpitLivePulse,
    recording: cockpitRecording,
    speaking: cockpitSpeaking,
    conversationMode: cockpitConversationMode,
    bargeInEnabled: cockpitBargeInEnabled,
    captionFallbackEnabled: canUseCockpitSpeechRecognition,
    captionStatus: cockpitRecognitionStatus,
    interruptionCount: cockpitInterruptionCount,
    rememberedTurnCount: cockpitRememberedTurnCount,
  });
  const focusDrawerTabs = [
    { id: "voice", label: "Voice", value: cockpitRecording ? (cockpitRecognitionStatus === "captioning" ? "Captioning" : "Listening") : cockpitSpeaking ? "Talking" : cockpitNeedsWake ? "Wake" : "Ready", tone: cockpitRecording ? "green" : cockpitSpeaking ? "amber" : "slate", icon: "phone" },
    { id: "autonomy", label: "Autonomy", value: cockpitCommandRoute.id === "agent-control" ? "Draft-ready" : "Guarded", tone: "green", icon: "spark" },
    { id: "memory", label: "Memory", value: `${memoryCount} trusted`, tone: "slate", icon: "database" },
    { id: "risk", label: "Risk", value: `${state.approvalCommandCenter?.queueCount || 0} review`, tone: "amber", icon: "alert" },
    { id: "sources", label: "Sources", value: cockpitSources.length ? `${cockpitSources.length} used` : "Ready", tone: "blue", icon: "layers" },
  ];
  const cockpitCaptionStatusLabel = !canUseCockpitSpeechRecognition
    ? "Server transcription"
    : cockpitRecognitionStatus === "captioning"
      ? "Live captions active"
      : cockpitRecognitionStatus === "interim"
        ? "Capturing words"
        : cockpitRecognitionStatus === "blocked"
          ? "Captions blocked"
          : cockpitRecognitionStatus === "limited"
            ? "Captions limited"
            : "Caption fallback ready";

  useEffect(() => () => {
    if (cockpitRecorderRef.current) {
      cockpitRecorderRef.current.ondataavailable = null;
      cockpitRecorderRef.current.onstop = null;
      if (cockpitRecorderRef.current.state !== "inactive") {
        cockpitRecorderRef.current.stop();
      }
      cockpitRecorderRef.current = null;
    }
    cleanupCockpitVoiceStream();
    stopCockpitSpeechRecognition();
    stopCockpitOutputLevelMonitor();
    stopBrowserVoice(cockpitAudioRef);
    closeUnlockedBrowserAudio(cockpitAudioUnlockedRef);
  }, []);

  useEffect(() => {
    cockpitSpeakingRef.current = cockpitSpeaking;
  }, [cockpitSpeaking]);

  useEffect(() => {
    cockpitRecordingRef.current = cockpitRecording;
  }, [cockpitRecording]);

  useEffect(() => {
    cockpitBargeInEnabledRef.current = cockpitBargeInEnabled;
  }, [cockpitBargeInEnabled]);

  useEffect(() => {
    const clockTimer = setInterval(() => {
      setCockpitClock(formatApexCockpitClock());
    }, 30_000);
    return () => clearInterval(clockTimer);
  }, []);

  useEffect(() => {
    if (!canUseCockpitRecorder) {
      setCockpitMicPermissionState("unavailable");
      return undefined;
    }
    if (typeof navigator === "undefined" || typeof navigator.permissions?.query !== "function") return undefined;
    let cancelled = false;
    let permissionStatus = null;
    navigator.permissions.query({ name: "microphone" }).then((status) => {
      if (cancelled) return;
      permissionStatus = status;
      setCockpitMicPermissionState(status.state || "unknown");
      status.onchange = () => {
        setCockpitMicPermissionState(status.state || "unknown");
      };
    }).catch(() => {
      if (!cancelled) setCockpitMicPermissionState("unknown");
    });
    return () => {
      cancelled = true;
      if (permissionStatus) permissionStatus.onchange = null;
    };
  }, [canUseCockpitRecorder]);

  useEffect(() => {
    if (!state.canView || cockpitBriefingOfferedRef.current) return;
    cockpitBriefingOfferedRef.current = true;
    setCockpitResponse({
      answer: {
        answer: cockpitBriefingText,
        sourceLabels: ["Apex command room", "Decision memory", "Release desk", "Agent control"],
      },
    });
    setCockpitLastQuestion("Proactive briefing");
    setCockpitCommandRoute(buildApexCockpitCommandRoute("Summarize today"));
    setCockpitVoiceNotice("Proactive briefing is ready.");
  }, [state.canView, cockpitBriefingText]);

  useEffect(() => {
    if (!state.canView || !sessionToken) return undefined;
    let cancelled = false;
    const runPulse = () => {
      if (!cancelled) refreshCockpitLivePulse({ automatic: true });
    };
    const firstPulse = setTimeout(runPulse, 1_500);
    const pulseTimer = setInterval(runPulse, 60_000);
    return () => {
      cancelled = true;
      clearTimeout(firstPulse);
      clearInterval(pulseTimer);
    };
  }, [state.canView, sessionToken]);

  useEffect(() => {
    if (!cockpitConversationMode || !cockpitAutoListening || !state.canView || !sessionToken || !canUseCockpitRecorder) return undefined;
    if (!cockpitMicReady && !cockpitVoiceWakeAttempted) return undefined;
    if (cockpitRecording || cockpitTranscribing || cockpitSubmitting || (cockpitSpeaking && !cockpitBargeInEnabled) || cockpitVoiceOpeningRef.current) return undefined;
    const openTimer = setTimeout(() => {
      openCockpitVoiceSession({ automatic: true });
    }, 500);
    return () => clearTimeout(openTimer);
  }, [cockpitConversationMode, cockpitAutoListening, state.canView, sessionToken, canUseCockpitRecorder, cockpitMicReady, cockpitVoiceWakeAttempted, cockpitRecording, cockpitTranscribing, cockpitSubmitting, cockpitSpeaking, cockpitBargeInEnabled]);

  function cleanupCockpitVoiceStream() {
    stopCockpitVoiceLevelMonitor();
    stopCockpitSpeechRecognition();
    if (cockpitStreamRef.current) {
      cockpitStreamRef.current.getTracks().forEach((track) => track.stop());
      cockpitStreamRef.current = null;
    }
  }

  function stopCockpitVoiceLevelMonitor() {
    if (cockpitVoiceFrameRef.current) {
      cancelAnimationFrame(cockpitVoiceFrameRef.current);
      cockpitVoiceFrameRef.current = 0;
    }
    if (cockpitVoiceSourceRef.current) {
      try {
        cockpitVoiceSourceRef.current.disconnect();
      } catch {
        // Browser audio nodes can already be detached after permission changes.
      }
      cockpitVoiceSourceRef.current = null;
    }
    cockpitVoiceAnalyserRef.current = null;
    if (cockpitVoiceAudioContextRef.current) {
      const audioContext = cockpitVoiceAudioContextRef.current;
      cockpitVoiceAudioContextRef.current = null;
      if (audioContext.state !== "closed") {
        audioContext.close().catch(() => {});
      }
    }
    cockpitSpeechStartedRef.current = false;
    cockpitLastSoundAtRef.current = 0;
    cockpitLastLevelPaintRef.current = 0;
    setCockpitSpeechActive(false);
    setCockpitMicLevel(0);
  }

  function stopCockpitOutputLevelMonitor() {
    if (cockpitOutputFrameRef.current) {
      cancelAnimationFrame(cockpitOutputFrameRef.current);
      cockpitOutputFrameRef.current = 0;
    }
    setCockpitOutputLevel(0);
  }

  function startCockpitOutputLevelMonitor() {
    stopCockpitOutputLevelMonitor();
    const startedAt = performance.now();
    const paint = () => {
      const elapsed = (performance.now() - startedAt) / 1000;
      const primaryPulse = Math.abs(Math.sin(elapsed * 13.2));
      const secondaryPulse = Math.abs(Math.sin(elapsed * 21.7)) * 0.28;
      setCockpitOutputLevel(Math.min(1, 0.16 + primaryPulse * 0.62 + secondaryPulse));
      cockpitOutputFrameRef.current = requestAnimationFrame(paint);
    };
    cockpitOutputFrameRef.current = requestAnimationFrame(paint);
  }

  function startCockpitVoiceLevelMonitor(stream) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    stopCockpitVoiceLevelMonitor();
    const audioContext = new AudioContextClass();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.78;
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
    const samples = new Uint8Array(analyser.fftSize);
    cockpitVoiceAudioContextRef.current = audioContext;
    cockpitVoiceAnalyserRef.current = analyser;
    cockpitVoiceSourceRef.current = source;
    cockpitVoiceStartedAtRef.current = performance.now();

    const readLevel = () => {
      if (!cockpitVoiceAnalyserRef.current || !cockpitRecorderRef.current || cockpitRecorderRef.current.state !== "recording") return;
      cockpitVoiceAnalyserRef.current.getByteTimeDomainData(samples);
      let sum = 0;
      for (let index = 0; index < samples.length; index += 1) {
        const centered = (samples[index] - 128) / 128;
        sum += centered * centered;
      }
      const level = Math.sqrt(sum / samples.length);
      const now = performance.now();
      const speakingNow = cockpitSpeakingRef.current;
      if (speakingNow && cockpitBargeInEnabledRef.current && !cockpitBargeInterruptedRef.current) {
        if (level > APEX_COCKPIT_BARGE_IN_THRESHOLD && now - cockpitVoiceStartedAtRef.current > APEX_COCKPIT_BARGE_IN_GRACE_MS) {
          handleCockpitVoiceBargeIn(now);
        } else {
          if (now - cockpitLastLevelPaintRef.current > 90) {
            cockpitLastLevelPaintRef.current = now;
            setCockpitMicLevel(level * 0.35);
          }
          cockpitVoiceFrameRef.current = requestAnimationFrame(readLevel);
          return;
        }
      }
      if (level > APEX_COCKPIT_LEVEL_THRESHOLD) {
        cockpitSpeechStartedRef.current = true;
        cockpitLastSoundAtRef.current = now;
        setCockpitSpeechActive(true);
      } else if (level < APEX_COCKPIT_IDLE_LEVEL_THRESHOLD && cockpitSpeechStartedRef.current) {
        const turnDuration = now - cockpitVoiceStartedAtRef.current;
        const silenceDuration = now - cockpitLastSoundAtRef.current;
        if (turnDuration > APEX_COCKPIT_MIN_TURN_MS && silenceDuration > APEX_COCKPIT_SILENCE_MS) {
          finishCockpitVoiceTurn();
          return;
        }
      }

      if (now - cockpitLastLevelPaintRef.current > 90) {
        cockpitLastLevelPaintRef.current = now;
        setCockpitMicLevel(level);
      }
      cockpitVoiceFrameRef.current = requestAnimationFrame(readLevel);
    };

    cockpitVoiceFrameRef.current = requestAnimationFrame(readLevel);
  }

  function preferredCockpitVoiceMimeType() {
    if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") return "";
    return ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/wav"].find((candidate) => MediaRecorder.isTypeSupported(candidate)) || "";
  }

  function stopCockpitSpeechRecognition({ clearTranscript = false } = {}) {
    if (cockpitRecognitionRestartTimerRef.current) {
      clearTimeout(cockpitRecognitionRestartTimerRef.current);
      cockpitRecognitionRestartTimerRef.current = 0;
    }
    cockpitRecognitionStopRequestedRef.current = true;
    if (cockpitSpeechRecognitionRef.current) {
      try {
        cockpitSpeechRecognitionRef.current.onstart = null;
        cockpitSpeechRecognitionRef.current.onresult = null;
        cockpitSpeechRecognitionRef.current.onerror = null;
        cockpitSpeechRecognitionRef.current.onend = null;
        cockpitSpeechRecognitionRef.current.stop();
      } catch {
        // Some browsers throw if recognition was already stopped.
      }
      cockpitSpeechRecognitionRef.current = null;
    }
    if (clearTranscript) {
      cockpitBrowserTranscriptRef.current = "";
      setCockpitBrowserTranscript("");
    }
    setCockpitRecognitionStatus((current) => (current === "unavailable" ? "unavailable" : "standby"));
  }

  function startCockpitSpeechRecognition({ clearTranscript = true } = {}) {
    const SpeechRecognitionCtor = getApexCockpitSpeechRecognitionCtor();
    if (!SpeechRecognitionCtor) {
      setCockpitRecognitionStatus("unavailable");
      setCockpitRecognitionError("");
      return false;
    }
    stopCockpitSpeechRecognition({ clearTranscript });
    cockpitRecognitionStopRequestedRef.current = false;
    setCockpitRecognitionError("");
    try {
      const recognition = new SpeechRecognitionCtor();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";
      recognition.maxAlternatives = 1;
      recognition.onstart = () => {
        setCockpitRecognitionStatus("captioning");
        setCockpitRecognitionError("");
      };
      recognition.onresult = (event) => {
        let finalText = "";
        let interimText = "";
        for (let index = event.resultIndex || 0; index < event.results.length; index += 1) {
          const result = event.results[index];
          const transcript = String(result?.[0]?.transcript || "").trim();
          if (!transcript) continue;
          if (result.isFinal) finalText = `${finalText} ${transcript}`.trim();
          else interimText = `${interimText} ${transcript}`.trim();
        }
        const now = performance.now();
        if ((finalText || interimText) && cockpitSpeakingRef.current && cockpitBargeInEnabledRef.current && !cockpitBargeInterruptedRef.current) {
          handleCockpitVoiceBargeIn(now, finalText ? "caption-final" : "caption-interim");
        }
        if (finalText) {
          const combinedTranscript = `${cockpitBrowserTranscriptRef.current || ""} ${finalText}`.trim();
          cockpitBrowserTranscriptRef.current = combinedTranscript;
          setCockpitBrowserTranscript(combinedTranscript);
          setAskQuestion(combinedTranscript);
          cockpitSpeechStartedRef.current = true;
          cockpitLastSoundAtRef.current = now;
          setCockpitSpeechActive(true);
          setCockpitRecognitionStatus("captioning");
          setCockpitVoiceNotice(cockpitBargeInterruptedRef.current ? `Barge-in captions heard: "${combinedTranscript}"` : `Browser captions heard: "${combinedTranscript}"`);
          if (cockpitRecorderRef.current?.state === "recording") {
            setTimeout(() => finishCockpitVoiceTurn(), 420);
          }
        } else if (interimText) {
          setCockpitBrowserTranscript(interimText);
          setAskQuestion(interimText);
          cockpitSpeechStartedRef.current = true;
          cockpitLastSoundAtRef.current = now;
          setCockpitSpeechActive(true);
          setCockpitRecognitionStatus("interim");
        }
      };
      recognition.onerror = (event) => {
        const errorName = String(event?.error || "speech-error");
        const hardStop = /not-allowed|service-not-allowed|audio-capture/i.test(errorName);
        setCockpitRecognitionError(errorName);
        setCockpitRecognitionStatus(hardStop ? "blocked" : "limited");
        if (hardStop) cockpitRecognitionStopRequestedRef.current = true;
      };
      recognition.onend = () => {
        const shouldRestart = !cockpitRecognitionStopRequestedRef.current
          && cockpitRecorderRef.current?.state === "recording"
          && !cockpitTranscribing
          && !cockpitSubmitting;
        if (!shouldRestart) {
          setCockpitRecognitionStatus((current) => (current === "blocked" || current === "limited" ? current : "standby"));
          return;
        }
        cockpitRecognitionRestartTimerRef.current = setTimeout(() => {
          cockpitRecognitionRestartTimerRef.current = 0;
          if (cockpitRecorderRef.current?.state === "recording") startCockpitSpeechRecognition({ clearTranscript: false });
        }, 450);
      };
      cockpitSpeechRecognitionRef.current = recognition;
      recognition.start();
      return true;
    } catch (error) {
      setCockpitRecognitionStatus("limited");
      setCockpitRecognitionError(error?.message || "recognition-start-failed");
      return false;
    }
  }

  function recordCockpitInterruption(reason = "voice-level") {
    const label = reason === "manual-button"
      ? "Manual interruption"
      : reason.startsWith("caption")
        ? "Caption barge-in"
        : "Voice barge-in";
    cockpitInterruptionCountRef.current += 1;
    cockpitLastInterruptionLabelRef.current = label;
    cockpitPendingInterruptionRef.current = true;
    setCockpitInterruptionCount(cockpitInterruptionCountRef.current);
    setCockpitLastInterruptionLabel(label);
    setCockpitTurns((current) => [
      {
        id: `cockpit-interrupt-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        question: `${label}: Apex stopped speaking and kept listening for the new request.`,
        source: "interrupt",
        routeLabel: "Barge-in",
        status: "listening",
      },
      ...current,
    ].slice(0, 5));
    return label;
  }

  function handleCockpitVoiceBargeIn(now = performance.now(), reason = "voice-level") {
    if (cockpitBargeInterruptedRef.current) return;
    cockpitBargeInterruptedRef.current = true;
    const label = recordCockpitInterruption(reason);
    cockpitRecordedChunksRef.current = cockpitRecordedChunksRef.current.slice(-APEX_COCKPIT_PREROLL_CHUNKS);
    cockpitSpeechStartedRef.current = true;
    cockpitVoiceStartedAtRef.current = now - APEX_COCKPIT_MIN_TURN_MS;
    cockpitLastSoundAtRef.current = now;
    setCockpitSpeechActive(true);
    stopCockpitVoicePlayback(`${label} caught. I stopped talking and I'm listening.`);
  }

  function interruptCockpitVoicePlayback(reason = "manual-button") {
    if (!cockpitSpeakingRef.current && !cockpitSpeaking) {
      setCockpitVoiceNotice("Apex is already listening.");
      return;
    }
    cockpitBargeInterruptedRef.current = true;
    const label = recordCockpitInterruption(reason);
    cockpitSpeechStartedRef.current = true;
    cockpitLastSoundAtRef.current = performance.now();
    setCockpitSpeechActive(true);
    stopCockpitVoicePlayback(`${label} caught. I'm listening.`);
    if (!cockpitRecordingRef.current && cockpitConversationMode && cockpitAutoListening && canUseCockpitRecorder && state.canView && sessionToken) {
      setTimeout(() => openCockpitVoiceSession({ automatic: false }), 80);
    }
  }

  function stopCockpitVoicePlayback(notice = "Voice playback stopped.") {
    stopBrowserVoice(cockpitAudioRef);
    stopCockpitOutputLevelMonitor();
    cockpitSpeakingRef.current = false;
    setCockpitSpeaking(false);
    setCockpitVoiceNotice(notice);
  }

  function speakCockpitBrowserFallback(textToSpeak, fallbackMessage = "Apex is speaking with browser voice fallback.") {
    const started = speakWithBrowserVoice(textToSpeak, {
      rate: cockpitVoiceProfileConfig.rate,
      pitch: cockpitVoiceProfileConfig.pitch,
      voiceHint: cockpitVoiceProfileConfig.label,
      onEnd: () => {
        stopCockpitOutputLevelMonitor();
        cockpitSpeakingRef.current = false;
        setCockpitSpeaking(false);
        setCockpitVoiceNotice("Voice playback finished.");
      },
      onError: () => {
        stopCockpitOutputLevelMonitor();
        cockpitSpeakingRef.current = false;
        setCockpitSpeaking(false);
        setCockpitVoiceNotice("Browser voice playback could not start.");
      },
    });
    if (!started) {
      setCockpitSpeaking(false);
      setCockpitVoiceNotice("This browser does not support speech playback here.");
      return;
    }
    setCockpitVoiceNotice(fallbackMessage);
  }

  async function speakCockpitAnswer(textToSpeak = cockpitAnswerText) {
    const answerToSpeak = textToSpeak.trim();
    if (!answerToSpeak || !sessionToken) return;
    unlockBrowserAudio(cockpitAudioUnlockedRef);
    stopBrowserVoice(cockpitAudioRef);
    cockpitSpeakingRef.current = true;
    setCockpitSpeaking(true);
    startCockpitOutputLevelMonitor();
    setCockpitVoiceNotice("");
    try {
      const payload = await speakApexOsVoice(sessionToken, {
        text: answerToSpeak,
        voice: cockpitVoiceProfile,
      });
      if (payload?.audioBase64 && payload?.contentType) {
        const playbackMode = await playApexVoiceAudio({
          audioBase64: payload.audioBase64,
          contentType: payload.contentType,
          audioRef: cockpitAudioRef,
          unlockedRef: cockpitAudioUnlockedRef,
          onEnd: () => {
            stopCockpitOutputLevelMonitor();
            cockpitSpeakingRef.current = false;
            setCockpitSpeaking(false);
            setCockpitVoiceNotice("Voice playback finished.");
          },
          onPlaybackError: () => {
            speakCockpitBrowserFallback(answerToSpeak, "Apex speech audio stopped, so browser voice fallback is speaking.");
          },
        });
        if (playbackMode) {
          setCockpitVoiceNotice(payload.aiDisclosure || "Apex OS voice output is AI-generated.");
          return;
        }
        speakCockpitBrowserFallback(answerToSpeak, "Apex speech audio could not start, so browser voice fallback is speaking.");
        return;
      }
      speakCockpitBrowserFallback(payload?.fallbackText || answerToSpeak, payload?.providerConfigured ? "Speech provider fallback is active; browser voice is speaking." : "Server speech is not configured; browser voice is speaking.");
    } catch (speechError) {
      speakCockpitBrowserFallback(answerToSpeak, speechError?.message ? `Speech endpoint unavailable; browser voice is speaking. ${speechError.message}` : "Speech endpoint unavailable; browser voice is speaking.");
    }
  }

  async function refreshCockpitLivePulse({ automatic = false } = {}) {
    if (!state.canView || !sessionToken) return null;
    if (!automatic) setCockpitLivePulseBusy(true);
    setCockpitLivePulseError("");
    try {
      const [buildResult, briefingResult, runsResult] = await Promise.allSettled([
        getApexOsBuildAwareness(sessionToken),
        getApexOsDailyBriefing(sessionToken),
        getApexOsAutonomyRuns(sessionToken),
      ]);
      const pulse = summarizeApexCockpitLivePulse({
        state,
        buildPayload: buildResult.status === "fulfilled" ? buildResult.value : null,
        briefingPayload: briefingResult.status === "fulfilled" ? briefingResult.value : null,
        runsPayload: runsResult.status === "fulfilled" ? runsResult.value : null,
      });
      const failureCount = [buildResult, briefingResult, runsResult].filter((result) => result.status === "rejected").length;
      setCockpitLivePulse(pulse);
      if (failureCount) {
        const message = `Live pulse checked with ${failureCount} limited source${failureCount === 1 ? "" : "s"}.`;
        setCockpitLivePulseError(message);
        if (!automatic) setCockpitVoiceNotice(message);
      } else if (!automatic) {
        setCockpitVoiceNotice("Live pulse refreshed from build, briefing, and run status. External actions stayed locked.");
      }
      return pulse;
    } catch (error) {
      const message = error?.message || "Live pulse could not refresh right now.";
      setCockpitLivePulseError(message);
      if (!automatic) setCockpitVoiceNotice(message);
      return null;
    } finally {
      if (!automatic) setCockpitLivePulseBusy(false);
    }
  }

  function deliverCockpitBriefing({ speak = false } = {}) {
    const route = buildApexCockpitCommandRoute("Summarize today");
    setCockpitCommandRoute(route);
    setCockpitResponse({
      answer: {
        answer: cockpitBriefingText,
        sourceLabels: ["Apex command room", "Decision memory", "Release desk", "Agent control"],
      },
    });
    setCockpitLastQuestion("Proactive briefing");
    setCockpitVoiceNotice("Apex briefing loaded.");
    setCockpitTurns((current) => [
      {
        id: `cockpit-briefing-${Date.now()}`,
        question: "Proactive briefing",
        source: "system",
        routeLabel: route.label,
        status: "answered",
      },
      ...current,
    ].slice(0, 5));
    if (speak) speakCockpitAnswer(cockpitBriefingText);
  }

  async function createCockpitAgentRequestFromCommand(question = cockpitLastQuestion || askQuestion || cockpitCommandRoute.label, route = cockpitCommandRoute, { turnId = "" } = {}) {
    if (!state.canView || !sessionToken || cockpitCreatingAgentRequest) return null;
    const draft = buildApexCockpitAgentControlDraft(question, route);
    setCockpitCreatingAgentRequest(true);
    setCockpitAgentActionNotice("Drafting locked agent-control request. No agent will run from this action.");
    try {
      const payload = await createApexOsAgentControlRequest(sessionToken, draft);
      const created = payload?.apexOsAgentControlRequest;
      setCockpitAgentActionNotice(created?.id
        ? `Locked agent-control request ${created.id} saved. Execution remains locked.`
        : "Locked agent-control request saved. Execution remains locked.");
      setCockpitTurns((current) => current.map((turn) => (turn.id === turnId ? { ...turn, status: "agent-requested" } : turn)));
      return created || null;
    } catch (error) {
      setCockpitAgentActionNotice(error?.message || "Agent-control request could not be saved.");
      setCockpitTurns((current) => current.map((turn) => (turn.id === turnId ? { ...turn, status: "blocked" } : turn)));
      return null;
    } finally {
      setCockpitCreatingAgentRequest(false);
    }
  }

  async function createCockpitLiveRunFromCommand(question = cockpitLastQuestion || askQuestion || cockpitBriefingText, route = cockpitCommandRoute, { turnId = "" } = {}) {
    if (!state.canView || !sessionToken || cockpitCreatingLiveRun) return null;
    const request = String(question || "").trim() || `Start Apex live operator run for ${route?.label || "Apex"}.`;
    const runTurnId = turnId || `cockpit-live-run-${Date.now()}`;
    setCockpitCreatingLiveRun(true);
    setCockpitLiveRunNotice("Starting private live run. Saving ledger and drafting internal work only.");
    setCockpitAgentActionNotice("Starting private live run. No external action will execute.");
    if (!turnId) {
      setCockpitTurns((current) => [
        {
          id: runTurnId,
          question: request,
          source: "live-run",
          routeLabel: route?.label || "Apex",
          status: "saving-run",
        },
        ...current,
      ].slice(0, 5));
    }
    try {
      const createPayload = await createApexOsAutonomyRun(sessionToken, {
        request,
        routeId: route?.id || "apex",
        routeLabel: route?.label || "Apex",
        routeDetail: route?.detail || "Apex Live Operator Mode command.",
        sourceLabel: "Apex Live Operator Mode",
        sourceUri: "apex-life://live-operator",
        operatorNote: "Created from the Apex body screen. Save, draft, validate, report, and remember only; execution stays locked.",
      });
      const createdRun = createPayload?.apexOsAutonomyRun;
      let finalRun = createdRun || null;
      if (createdRun?.id) {
        const draftPayload = await draftApexOsAutonomyRunInternalWork(sessionToken, createdRun.id);
        finalRun = draftPayload?.apexOsAutonomyRun || createdRun;
      }
      const finalNotice = finalRun?.id
        ? `Live run ${finalRun.id} saved and internal draft package prepared. Execution stays locked.`
        : "Live run saved and internal draft package prepared. Execution stays locked.";
      setCockpitLiveRunNotice(finalNotice);
      setCockpitAgentActionNotice(finalNotice);
      setCockpitResponse({
        answer: {
          answer: `${finalNotice} Next: review the run ledger, validate evidence, then approve only the gated actions you truly want.`,
          sourceLabels: ["Apex Live Operator Mode", "Autonomy Run Center", "Agent handoff drafts"],
        },
      });
      setCockpitTurns((current) => current.map((turn) => (turn.id === runTurnId ? { ...turn, status: "live-run-drafted" } : turn)));
      refreshCockpitLivePulse({ automatic: true });
      return finalRun;
    } catch (error) {
      const message = error?.message || "Live run could not be saved.";
      setCockpitLiveRunNotice(message);
      setCockpitAgentActionNotice(message);
      setCockpitTurns((current) => current.map((turn) => (turn.id === runTurnId ? { ...turn, status: "blocked" } : turn)));
      return null;
    } finally {
      setCockpitCreatingLiveRun(false);
    }
  }

  async function rememberCockpitTurnFromAnswer() {
    if (!canRememberCockpitTurn) return null;
    const turnKey = cockpitTurnMemoryKey;
    const memoryDraft = buildApexCockpitTurnMemoryDraft({
      question: cockpitLastQuestion || askQuestion || cockpitCommandRoute.label,
      answer: cockpitResponse.answer,
      route: cockpitCommandRoute,
      requestId: cockpitResponse?.requestId || turnKey,
    });
    setCockpitRememberingTurn(true);
    setCockpitAgentActionNotice("Drafting suggested live-turn memory. It will stay untrusted until you approve it.");
    try {
      const payload = await createApexOsMemory(sessionToken, memoryDraft);
      const created = payload?.apexOsMemoryEntry;
      setCockpitRememberedTurnKeys((current) => ({ ...current, [turnKey]: created?.id || "suggested" }));
      setCockpitRememberedTurnCount((current) => current + 1);
      const notice = created?.id
        ? `Suggested memory ${created.id} saved from this live turn. Review it before trusting it.`
        : "Suggested memory saved from this live turn. Review it before trusting it.";
      setCockpitAgentActionNotice(notice);
      setCockpitTurns((current) => [
        {
          id: `cockpit-memory-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          question: `Suggested memory saved: ${created?.title || memoryDraft.title}`,
          source: "memory",
          routeLabel: "Memory",
          status: "suggested",
        },
        ...current,
      ].slice(0, 5));
      return created || null;
    } catch (error) {
      setCockpitAgentActionNotice(error?.message || "Suggested live-turn memory could not be saved.");
      return null;
    } finally {
      setCockpitRememberingTurn(false);
    }
  }

  async function askCockpitQuestion(nextQuestion, { fromVoice = false, interrupted = false } = {}) {
    const previousTurns = cockpitTurns.slice(0, 4);
    const route = buildApexCockpitCommandRoute(nextQuestion, { previousRoute: cockpitCommandRoute });
    const turnId = `cockpit-turn-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setCockpitCommandRoute(route);
    setCockpitAgentActionNotice("");
    setCockpitTurns((current) => [
      {
        id: turnId,
        question: nextQuestion,
        source: interrupted ? "interrupt" : fromVoice ? "voice" : "typed",
        routeLabel: route.label,
        status: interrupted ? "interruption-reading" : "reading",
      },
      ...current,
    ].slice(0, 5));
    setCockpitSubmitting(true);
    setCockpitError("");
    setCockpitVoiceNotice(interrupted ? "Apex heard the interruption. Reading the new context now." : fromVoice ? "Apex heard you. Reading context now." : "");
    setCockpitResponse(null);
    setCockpitLastQuestion(nextQuestion);
    stopBrowserVoice(cockpitAudioRef);
    stopCockpitOutputLevelMonitor();
    cockpitSpeakingRef.current = false;
    setCockpitSpeaking(false);
    try {
      if (route.commandAction === "open-section" && route.section !== "apex") {
        onChange(route.section);
        setCockpitVoiceNotice(`Opened ${route.label}. Reading context now.`);
      }
      const apexQuestion = buildApexCockpitQuestionEnvelope(nextQuestion, {
        personalityMode: cockpitPersonalityMode,
        route,
        memoryCount,
        turns: previousTurns,
        interrupted,
      });
      const payload = await askApexOs(sessionToken, {
        question: apexQuestion,
        contextScope: "all",
        operatorStyle: cockpitPersonalityMode,
        commandRoute: route.id,
      });
      setCockpitResponse(payload);
      setCockpitTurns((current) => current.map((turn) => (turn.id === turnId ? { ...turn, status: "answered" } : turn)));
      if (route.commandAction === "draft-agent-control-request") {
        await createCockpitAgentRequestFromCommand(nextQuestion, route, { turnId });
      }
      const nextAnswerText = resolveApexCockpitAnswerText(payload);
      if (nextAnswerText) {
        await speakCockpitAnswer(nextAnswerText);
      } else {
        setCockpitVoiceNotice("Apex returned no speakable answer text.");
      }
    } catch (requestError) {
      setCockpitError(requestError?.message || "Ask Apex could not answer right now.");
      setCockpitTurns((current) => current.map((turn) => (turn.id === turnId ? { ...turn, status: "blocked" } : turn)));
      setCockpitSpeaking(false);
    } finally {
      setCockpitSubmitting(false);
    }
  }

  async function submitCockpitQuestion(event) {
    event.preventDefault();
    if (!canAskCockpit) return;
    unlockBrowserAudio(cockpitAudioUnlockedRef);
    await askCockpitQuestion(askQuestion.trim());
  }

  async function handleCockpitVoiceTranscript(transcript, { sourceLabel = "Voice transcript" } = {}) {
    const cleanTranscript = String(transcript || "").trim();
    if (!cleanTranscript) {
      setCockpitVoiceNotice("Apex could not hear words clearly. Try again closer to the mic.");
      return;
    }
    const review = buildApexOsVoiceCommandReview(cleanTranscript);
    const nextQuestion = review.askQuestion || cleanTranscript;
    const interrupted = cockpitBargeInterruptedRef.current || cockpitPendingInterruptionRef.current;
    setAskQuestion(nextQuestion);
    setCockpitLastQuestion(cleanTranscript);
    setCockpitBrowserTranscript(cleanTranscript);
    setCockpitVoiceNotice(interrupted ? `${cockpitLastInterruptionLabelRef.current || "Barge-in"} transcript: "${cleanTranscript}"` : `${sourceLabel}: "${cleanTranscript}"`);
    await askCockpitQuestion(nextQuestion, { fromVoice: true, interrupted });
    if (interrupted) cockpitPendingInterruptionRef.current = false;
  }

  async function transcribeCockpitVoiceBlob(blob) {
    if (!blob?.size) {
      setCockpitVoiceNotice("No voice audio was captured. Check microphone permission and try again.");
      return;
    }
    setCockpitTranscribing(true);
    setCockpitVoiceNotice("Apex heard audio. Transcribing through the private server endpoint.");
    try {
      const audioDataUrl = await blobToDataUrl(blob);
      const payload = await transcribeApexOsVoice(sessionToken, { audioDataUrl });
      const transcript = String(payload?.transcript || "").trim();
      const review = payload?.commandReview || buildApexOsVoiceCommandReview(transcript);
      if (!transcript) {
        setCockpitVoiceNotice("Apex could not hear words clearly. Try again closer to the mic.");
        return;
      }
      const nextQuestion = review.askQuestion || transcript;
      const interrupted = cockpitBargeInterruptedRef.current || cockpitPendingInterruptionRef.current;
      setAskQuestion(nextQuestion);
      setCockpitLastQuestion(transcript);
      setCockpitVoiceNotice(interrupted ? `${cockpitLastInterruptionLabelRef.current || "Barge-in"} heard: "${transcript}"` : `Heard: "${transcript}"`);
      await askCockpitQuestion(nextQuestion, { fromVoice: true, interrupted });
      if (interrupted) cockpitPendingInterruptionRef.current = false;
    } catch (error) {
      setCockpitVoiceNotice(error?.message || "Apex could not transcribe that audio. Check microphone permission and voice provider setup.");
    } finally {
      setCockpitTranscribing(false);
    }
  }

  async function openCockpitVoiceSession({ automatic = false } = {}) {
    if (!canStartCockpitVoice) {
      setCockpitVoiceNotice(canUseCockpitRecorder ? "Voice is busy right now." : "This browser cannot open the microphone here.");
      return;
    }
    if (cockpitVoiceOpeningRef.current) return;
    cockpitVoiceOpeningRef.current = true;
    if (!automatic) setCockpitVoiceWakeAttempted(true);
    unlockBrowserAudio(cockpitAudioUnlockedRef);
    setCockpitError("");
    setCockpitVoiceNotice(automatic ? "Opening voice for this Apex page." : "");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      setCockpitMicPermissionState("granted");
      cockpitStreamRef.current = stream;
      cockpitRecordedChunksRef.current = [];
      cockpitSpeechStartedRef.current = false;
      cockpitBargeInterruptedRef.current = false;
      cockpitDiscardNextCaptureRef.current = false;
      cockpitVoiceStartedAtRef.current = performance.now();
      cockpitLastSoundAtRef.current = cockpitVoiceStartedAtRef.current;
      const mimeType = preferredCockpitVoiceMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      cockpitRecorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (!event.data?.size) return;
        cockpitRecordedChunksRef.current.push(event.data);
        if (!cockpitSpeechStartedRef.current && cockpitRecordedChunksRef.current.length > APEX_COCKPIT_PREROLL_CHUNKS) {
          cockpitRecordedChunksRef.current = cockpitRecordedChunksRef.current.slice(-APEX_COCKPIT_PREROLL_CHUNKS);
        }
      };
      recorder.onstop = () => {
        const browserTranscript = String(cockpitBrowserTranscriptRef.current || "").trim();
        const shouldDiscard = cockpitDiscardNextCaptureRef.current || (!cockpitSpeechStartedRef.current && !browserTranscript);
        const blob = new Blob(cockpitRecordedChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        cockpitDiscardNextCaptureRef.current = false;
        cleanupCockpitVoiceStream();
        cockpitRecorderRef.current = null;
        cockpitRecordingRef.current = false;
        setCockpitRecording(false);
        if (browserTranscript) {
          handleCockpitVoiceTranscript(browserTranscript, { sourceLabel: "Browser speech captions" });
          return;
        }
        if (shouldDiscard) {
          setCockpitVoiceNotice("Voice paused.");
          return;
        }
        transcribeCockpitVoiceBlob(blob);
      };
      recorder.start(800);
      startCockpitVoiceLevelMonitor(stream);
      startCockpitSpeechRecognition();
      cockpitRecordingRef.current = true;
      setCockpitRecording(true);
      setCockpitAutoListening(true);
      setCockpitVoiceNotice(cockpitNeedsWake ? "Apex is awake. Voice will stay open on this page." : "Voice is open. I'm listening while this page is open.");
    } catch (error) {
      cleanupCockpitVoiceStream();
      cockpitRecordingRef.current = false;
      setCockpitRecording(false);
      setCockpitAutoListening(false);
      setCockpitMicPermissionState("denied");
      setCockpitError("Microphone access is needed for always-open Apex voice.");
      setCockpitVoiceNotice(error?.message || "Microphone permission was not granted. Allow microphone access for Apex HQ and try again.");
    } finally {
      cockpitVoiceOpeningRef.current = false;
    }
  }

  function finishCockpitVoiceTurn() {
    if (!cockpitRecordingRef.current || !cockpitRecorderRef.current) return;
    if (cockpitRecorderRef.current.state === "inactive") return;
    setCockpitVoiceNotice("Apex heard the turn. Reading it now.");
    setCockpitSpeechActive(false);
    cockpitRecorderRef.current.stop();
  }

  function pauseCockpitVoiceSession() {
    setCockpitAutoListening(false);
    setCockpitSpeechActive(false);
    setCockpitMicLevel(0);
    cockpitRecordingRef.current = false;
    cockpitBargeInterruptedRef.current = false;
    cockpitDiscardNextCaptureRef.current = !cockpitSpeechStartedRef.current;
    setCockpitVoiceNotice("Voice paused.");
    if (cockpitRecorderRef.current && cockpitRecorderRef.current.state !== "inactive") {
      cockpitRecorderRef.current.stop();
      return;
    }
    cleanupCockpitVoiceStream();
    setCockpitRecording(false);
  }

  return (
    <section className="co-apex-cockpit-screen co-apex-cockpit-screen--focus w-full min-w-0 max-w-full overflow-hidden rounded-xl border border-slate-700/70 bg-slate-950 text-white shadow-[0_34px_80px_-40px_rgba(2,6,23,0.95)] ring-1 ring-cyan-300/10 lg:h-[calc(100vh-16px)]">
      <div className="co-apex-cockpit-frame relative grid min-h-[720px] w-full min-w-0 max-w-full bg-slate-950 lg:h-full lg:min-h-0 lg:grid-cols-[190px_minmax(0,1fr)]">
        <div
          className="absolute inset-0 opacity-90"
          style={{
            backgroundImage: "radial-gradient(circle at 47% 23%, rgba(14,165,233,0.22), transparent 26rem), radial-gradient(circle at 78% 75%, rgba(249,115,22,0.13), transparent 20rem), linear-gradient(135deg, #020617 0%, #07111f 48%, #030712 100%)",
          }}
        />
        <div
          className="absolute inset-2 rounded-lg border border-cyan-200/12 shadow-[inset_0_0_32px_rgba(125,211,252,0.12)]"
          aria-hidden="true"
        />
        <ApexCockpitSidebar activeSection={activeSection} onChange={onChange} />

        <div className="relative z-10 grid w-full min-w-0 max-w-full content-start gap-2 overflow-hidden p-3 lg:grid-rows-[auto_minmax(0,1fr)_auto] lg:p-4">
          <header className="flex w-full min-w-0 max-w-full flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <h2 className="text-3xl font-black uppercase leading-none tracking-normal text-white">Apex</h2>
              <span className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.08em] text-slate-300"><ApexCockpitStatusDot tone={cockpitVoiceState.tone} /> {cockpitVoiceState.header}</span>
            </div>
            <div className="flex min-w-0 max-w-full flex-wrap gap-3 text-[11px] font-bold text-slate-300 md:justify-end">
              <span className="inline-flex items-center gap-1"><Icon name="check" className="h-3.5 w-3.5" /> Review-first</span>
              <span className="hidden h-4 w-px bg-slate-700 md:inline-block" />
              <span>Operator: {state.operatorName}</span>
              <span className="hidden h-4 w-px bg-slate-700 md:inline-block" />
              <span>Company: Apex HQ</span>
              <span>{cockpitClock}</span>
            </div>
          </header>

          <div className="w-full min-w-0 max-w-full overflow-hidden lg:hidden">
            <ApexControlRoomSectionNav activeSection={activeSection} onChange={onChange} variant="dark" />
          </div>

          <section className="co-apex-cockpit-focus-bar relative z-30 hidden min-w-0 gap-2 rounded-lg border border-cyan-200/12 bg-slate-950/74 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] xl:grid xl:grid-cols-[auto_minmax(0,1fr)]" aria-label="Apex focus controls">
            <div className="flex min-w-0 items-center gap-2">
              <ApexCockpitControlButton
                className="shrink-0 px-3"
                onClick={cockpitRecording ? pauseCockpitVoiceSession : cockpitSpeaking ? () => interruptCockpitVoicePlayback("manual-button") : () => openCockpitVoiceSession({ automatic: false })}
                disabled={cockpitSpeaking ? false : !canToggleCockpitVoice}
                active={cockpitRecording || cockpitSpeaking}
                title={cockpitRecording ? "Pause Apex voice" : "Wake or resume Apex voice"}
              >
                <Icon name="phone" /> {cockpitWakeButtonLabel}
              </ApexCockpitControlButton>
              <ApexCockpitControlButton className="px-3" disabled={false} onClick={() => deliverCockpitBriefing({ speak: true })} active={false} title="Speak Apex briefing">
                <Icon name="spark" /> Brief
              </ApexCockpitControlButton>
            </div>
            <div className="grid min-w-0 grid-cols-5 gap-2">
              {focusDrawerTabs.map((tab) => {
                const active = cockpitFocusDrawer === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setCockpitFocusDrawer((current) => current === tab.id ? "" : tab.id)}
                    className={`co-focus-ring grid min-h-11 min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-2 rounded-md border px-2.5 text-left transition ${active ? "border-orange-400/70 bg-orange-500/12 text-white" : "border-slate-800 bg-slate-900/66 text-slate-300 hover:border-cyan-400/44 hover:text-white"}`}
                    aria-pressed={active}
                  >
                    <Icon name={tab.icon} className={`h-4 w-4 shrink-0 ${tab.tone === "green" ? "text-emerald-300" : tab.tone === "amber" ? "text-orange-300" : tab.tone === "blue" ? "text-cyan-300" : "text-slate-400"}`} />
                    <span className="min-w-0">
                      <span className="block truncate text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">{tab.label}</span>
                      <span className="block truncate text-[11px] font-black">{tab.value}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            {cockpitFocusDrawer ? (
              <div className="co-apex-cockpit-focus-drawer min-w-0 rounded-lg border border-cyan-200/14 bg-slate-950/86 p-3 xl:col-span-2" aria-label="Apex focus drawer">
                {cockpitFocusDrawer === "voice" ? (
                  <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(240px,0.55fr)]">
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-cyan-300">Voice Core</p>
                      <p className="mt-1 text-sm font-black text-slate-100">{cockpitVoiceState.headline}</p>
                      <p className="mt-1 min-w-0 break-words text-[11px] font-bold leading-4 text-slate-500">{cockpitAgentActionNotice || cockpitVoiceNotice || (cockpitNeedsWake ? "Tap Wake Apex once so the browser can unlock microphone and voice playback; after that the conversation loop stays open." : cockpitVoiceState.detail)}</p>
                    </div>
                    <div className="grid min-w-0 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      <ApexCockpitControlButton disabled={false} onClick={() => setCockpitConversationMode((current) => !current)} active={cockpitConversationMode}>{cockpitConversationMode ? "Conversation On" : "Conversation Off"}</ApexCockpitControlButton>
                      <ApexCockpitControlButton disabled={false} onClick={() => setCockpitBargeInEnabled((current) => !current)} active={cockpitBargeInEnabled}>{cockpitBargeInEnabled ? "Barge-in On" : "Barge-in Off"}</ApexCockpitControlButton>
                      <ApexCockpitControlButton onClick={() => speakCockpitAnswer()} disabled={!canSpeakCockpitAnswer} active={cockpitSpeaking}>Speak Answer</ApexCockpitControlButton>
                      <ApexCockpitControlButton onClick={() => interruptCockpitVoicePlayback("manual-button")} disabled={!cockpitSpeaking}>Interrupt</ApexCockpitControlButton>
                      <ApexCockpitControlButton onClick={() => rememberCockpitTurnFromAnswer()} disabled={!canRememberCockpitTurn} active={cockpitRememberingTurn}>Remember</ApexCockpitControlButton>
                    </div>
                  </div>
                ) : null}
                {cockpitFocusDrawer === "autonomy" ? (
                  <AutonomyRunCenterCompactPanel
                    state={state}
                    route={cockpitCommandRoute}
                    onOpenAgents={() => onChange("agents")}
                    onOpenApprovals={() => onChange("approvals")}
                    onCreateAgentRequest={() => createCockpitAgentRequestFromCommand()}
                    creatingAgentRequest={cockpitCreatingAgentRequest}
                    variant="dark"
                  />
                ) : null}
                {cockpitFocusDrawer === "memory" ? (
                  <div className="grid min-w-0 gap-2 sm:grid-cols-3">
                    <ApexCockpitListItem item={{ label: "Trusted Memories", icon: "database" }} value={memoryCount} tone="slate" />
                    <ApexCockpitListItem item={{ label: "Recent Updates", icon: "refresh" }} value={state.decisionMemory?.durableCount || 0} tone="slate" />
                    <ApexCockpitListItem item={{ label: "Suggested Memories", icon: "spark" }} value={state.decisionMemory?.suggestedCount || 0} tone="slate" />
                  </div>
                ) : null}
                {cockpitFocusDrawer === "risk" ? (
                  <div className="grid min-w-0 gap-2 sm:grid-cols-4">
                    <ApexCockpitListItem item={{ label: "Approvals", icon: "check" }} value={state.approvalCommandCenter?.queueCount || 0} tone="amber" />
                    <ApexCockpitListItem item={{ label: "Blockers", icon: "alert" }} value={state.launchReadiness?.blockedCount || state.approvalCommandCenter?.packetSummary?.blocked || 0} tone="red" />
                    <ApexCockpitListItem item={{ label: "Agent Work", icon: "layers" }} value={state.agentControlPlane?.roleCount || state.agentWorkQueue?.availableTaskCount || 0} tone="blue" />
                    <ApexCockpitListItem item={{ label: "Release", icon: "refresh" }} value={releaseHealth} tone={state.releaseDesk?.tone || "green"} />
                  </div>
                ) : null}
                {cockpitFocusDrawer === "sources" ? (
                  <div className="grid min-w-0 gap-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-cyan-300">Source-backed answer context</p>
                    <ol className="grid min-w-0 gap-1.5 text-[11px] font-bold leading-4 text-slate-400">
                      {cockpitSources.length ? cockpitSources.map((item, index) => <li key={item} className="min-w-0 break-words rounded-md border border-slate-800 bg-slate-900/58 px-2.5 py-2">{index + 1}. {item}</li>) : <li className="rounded-md border border-slate-800 bg-slate-900/58 px-2.5 py-2">Sources appear after Apex answers.</li>}
                    </ol>
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>

          <div className="co-apex-cockpit-main-grid relative z-10 grid w-full min-w-0 max-w-full gap-2 lg:min-h-0 xl:grid-cols-[174px_minmax(0,1fr)_404px]">
            <div className="co-apex-cockpit-side-rail co-apex-cockpit-side-rail--voice order-2 grid w-full min-w-0 max-w-full content-start gap-2 lg:min-h-0 lg:overflow-hidden xl:order-none">
              <ApexCockpitCard title="Voice" action={<span className="text-slate-500">&gt;</span>}>
                <div className="grid min-w-0 grid-cols-[44px_minmax(0,1fr)] gap-3">
                  <div className={`grid h-11 w-11 place-items-center rounded-full ${cockpitRecording ? "bg-emerald-500/16 text-emerald-200 shadow-[0_0_26px_rgba(16,185,129,0.34)]" : cockpitVoiceMode === "speaking" ? "bg-orange-500/14 text-orange-300 shadow-[0_0_24px_rgba(249,115,22,0.28)]" : cockpitVoiceMode === "thinking" ? "bg-cyan-500/12 text-cyan-300 shadow-[0_0_22px_rgba(34,211,238,0.22)]" : cockpitVoiceMode === "blocked" ? "bg-red-500/12 text-red-300 shadow-[0_0_22px_rgba(248,113,113,0.2)]" : "bg-slate-800 text-slate-300"}`}>
                    <Icon name="phone" className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-slate-100">{cockpitRecording ? "Voice Open" : "Voice Paused"}</p>
                    <p className="text-[11px] font-bold text-slate-400">{cockpitRecording ? cockpitVoiceState.label : cockpitTranscribing ? "Transcribing" : cockpitVoiceState.label}</p>
                    <p className="mt-0.5 text-[10px] font-black uppercase tracking-[0.08em] text-cyan-300">{cockpitCaptionStatusLabel}</p>
                    <ApexMiniWaveform mode={cockpitVoiceMode} />
                    <div className="mt-1 h-1 overflow-hidden rounded-full bg-slate-800" aria-hidden="true">
                      <span
                        className="block h-full rounded-full bg-gradient-to-r from-emerald-300 via-cyan-300 to-orange-300 transition-[width] duration-100"
                        style={{ width: `${Math.max(5, Math.min(100, cockpitLiveLevel * 620))}%` }}
                      />
                    </div>
                  </div>
                </div>
                <ApexCockpitControlButton
                  className="mt-2 w-full"
                  onClick={cockpitRecording ? pauseCockpitVoiceSession : cockpitSpeaking ? () => interruptCockpitVoicePlayback("manual-button") : () => openCockpitVoiceSession({ automatic: false })}
                  disabled={cockpitSpeaking ? false : !canToggleCockpitVoice}
                  active={cockpitRecording || cockpitSpeaking}
                  title={cockpitRecording ? "Pause Apex voice" : "Resume Apex voice"}
                >
                  {cockpitWakeButtonLabel}
                </ApexCockpitControlButton>
                <div className="mt-2 grid min-w-0 grid-cols-2 gap-1.5">
                  <ApexCockpitControlButton
                    className="px-2"
                    onClick={() => setCockpitConversationMode((current) => !current)}
                    disabled={false}
                    active={cockpitConversationMode}
                    title="Toggle continuous Apex conversation"
                  >
                    {cockpitConversationMode ? "Conversation On" : "Conversation Off"}
                  </ApexCockpitControlButton>
                  <ApexCockpitControlButton
                    className="px-2"
                    onClick={() => setCockpitBargeInEnabled((current) => !current)}
                    disabled={false}
                    active={cockpitBargeInEnabled}
                    title="Toggle voice barge-in"
                  >
                    {cockpitBargeInEnabled ? "Barge-in On" : "Barge-in Off"}
                  </ApexCockpitControlButton>
                </div>
                <div className="mt-2 grid min-w-0 gap-1.5">
                  <label className="grid min-w-0 gap-1 text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">
                    Voice Identity
                    <select
                      value={cockpitVoiceProfile}
                      onChange={(event) => setCockpitVoiceProfile(event.target.value)}
                      className="co-focus-ring h-8 min-w-0 rounded-md border border-slate-800 bg-slate-950 px-2 text-[11px] font-black normal-case tracking-normal text-slate-200 outline-none"
                    >
                      {APEX_COCKPIT_VOICE_PROFILES.map((profile) => (
                        <option key={profile.id} value={profile.id}>{profile.label} - {profile.detail}</option>
                      ))}
                    </select>
                  </label>
                  <label className="grid min-w-0 gap-1 text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">
                    Personality
                    <select
                      value={cockpitPersonalityMode}
                      onChange={(event) => setCockpitPersonalityMode(event.target.value)}
                      className="co-focus-ring h-8 min-w-0 rounded-md border border-slate-800 bg-slate-950 px-2 text-[11px] font-black normal-case tracking-normal text-slate-200 outline-none"
                    >
                      {APEX_COCKPIT_PERSONALITY_MODES.map((mode) => (
                        <option key={mode.id} value={mode.id}>{mode.label} - {mode.detail}</option>
                      ))}
                    </select>
                  </label>
                </div>
              </ApexCockpitCard>

              <ApexCockpitCard title="Transcript" action={<Icon name="refresh" className="h-3.5 w-3.5 text-slate-500" />}>
                <p className="text-[11px] font-bold leading-5 text-slate-300">{cockpitBrowserTranscript || (cockpitRecording ? "Listening..." : cockpitTranscribing ? "Transcribing voice..." : cockpitSubmitting ? "Reading context..." : cockpitPromptText || "Listening...")}</p>
                <p className="mt-2 text-[11px] font-bold leading-5 text-slate-400" aria-live="polite">{cockpitAgentActionNotice || cockpitVoiceNotice || cockpitRecognitionError || (cockpitNeedsWake ? "Tap Wake Apex once so the browser can unlock microphone and voice playback; after that the conversation loop stays open." : canUseCockpitRecorder ? `${cockpitVoiceState.detail} ${cockpitCaptionStatusLabel}.` : "Microphone is unavailable in this browser or blocked by site permission.")}</p>
              </ApexCockpitCard>

              <ApexCockpitCard title="Apex Response">
                <p className={`co-apex-cockpit-response-copy text-[11px] font-bold leading-5 ${cockpitError ? "text-red-200" : "text-slate-200"}`}>{cockpitError || cockpitAnswerText || "I'm here. What would you like Apex to help you with?"}</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <ApexCockpitControlButton onClick={() => speakCockpitAnswer()} disabled={!canSpeakCockpitAnswer} active={cockpitSpeaking}>
                    <Icon name="spark" /> {cockpitSpeaking ? "Speaking" : "Speak"}
                  </ApexCockpitControlButton>
                  <ApexCockpitControlButton onClick={() => interruptCockpitVoicePlayback("manual-button")} disabled={!cockpitSpeaking}>
                    <Icon name="lock" /> Interrupt
                  </ApexCockpitControlButton>
                </div>
                <div className="mt-3 border-t border-slate-800 pt-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">Sources</p>
                  <ol className="mt-2 grid gap-1 text-[11px] font-bold leading-4 text-slate-400">
                    {cockpitSources.length ? cockpitSources.map((item, index) => <li key={item} className="break-words">{index + 1}. {item}</li>) : <li>Sources appear after Apex answers.</li>}
                  </ol>
                  <p className="mt-3 text-[11px] font-bold text-slate-400">&gt; Show All Sources</p>
                </div>
              </ApexCockpitCard>
            </div>

            <div className="co-apex-cockpit-focus-center order-1 grid w-full min-w-0 max-w-full content-start gap-2 lg:min-h-0 lg:overflow-hidden xl:order-none">
              <div className="grid min-w-0 gap-3 rounded-lg border border-cyan-200/14 bg-slate-950/82 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] xl:hidden">
                <div className="flex min-w-0 items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${cockpitRecording ? "bg-emerald-500/16 text-emerald-200 shadow-[0_0_24px_rgba(16,185,129,0.3)]" : cockpitVoiceMode === "blocked" ? "bg-red-500/12 text-red-300" : "bg-slate-800 text-slate-300"}`}>
                      <Icon name="phone" className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-black text-slate-100">{cockpitRecording ? "Voice Open" : "Voice Paused"}</p>
                      <p className="text-[11px] font-bold text-slate-400">{cockpitVoiceState.label} / {cockpitCaptionStatusLabel}</p>
                    </div>
                  </div>
                  <ApexCockpitControlButton
                    className="shrink-0 px-3"
                    onClick={cockpitRecording ? pauseCockpitVoiceSession : cockpitSpeaking ? () => interruptCockpitVoicePlayback("manual-button") : () => openCockpitVoiceSession({ automatic: false })}
                    disabled={cockpitSpeaking ? false : !canToggleCockpitVoice}
                    active={cockpitRecording || cockpitSpeaking}
                    title={cockpitRecording ? "Pause Apex voice" : "Resume Apex voice"}
                  >
                    {cockpitRecording ? "Pause" : cockpitSpeaking ? "Interrupt" : cockpitNeedsWake ? "Wake" : "Resume"}
                  </ApexCockpitControlButton>
                </div>
                <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_44px] items-center gap-3">
                  <ApexMiniWaveform mode={cockpitVoiceMode} />
                  <span className="h-1 overflow-hidden rounded-full bg-slate-800" aria-hidden="true">
                    <span
                      className="block h-full rounded-full bg-gradient-to-r from-emerald-300 via-cyan-300 to-orange-300 transition-[width] duration-100"
                      style={{ width: `${Math.max(5, Math.min(100, cockpitLiveLevel * 620))}%` }}
                    />
                  </span>
                </div>
              </div>
              <ApexCockpitAvatar voiceMode={cockpitVoiceMode} voiceLevel={cockpitLiveLevel} />
              <section className="co-apex-cockpit-live-console grid min-w-0 gap-2 rounded-lg border border-cyan-200/14 bg-slate-950/76 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]" aria-label="Apex live conversation console">
                <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-cyan-300">Live Conversation</p>
                    <p className="mt-0.5 min-w-0 break-words text-xs font-black text-slate-100">{cockpitVoiceState.headline}</p>
                    <p className="mt-0.5 min-w-0 break-words text-[11px] font-bold leading-4 text-slate-500">{cockpitPersonalityConfig.label} personality, {cockpitVoiceProfileConfig.label} voice, {memoryCount || 0} trusted memories visible.</p>
                  </div>
                  <div className="flex min-w-0 flex-wrap gap-1.5 sm:justify-end">
                    <ApexCockpitControlButton className="px-2" disabled={false} onClick={() => deliverCockpitBriefing({ speak: true })} active={false} title="Speak Apex briefing">
                      <Icon name="spark" /> Brief Me
                    </ApexCockpitControlButton>
                    <ApexCockpitControlButton className="px-2" disabled={cockpitCreatingAgentRequest || cockpitCommandRoute.id !== "agent-control"} onClick={() => createCockpitAgentRequestFromCommand()} active={cockpitCreatingAgentRequest} title="Create locked agent request">
                      <Icon name="lock" /> Agent Draft
                    </ApexCockpitControlButton>
                    <ApexCockpitControlButton className="px-2" disabled={!canCreateCockpitLiveRun} onClick={() => createCockpitLiveRunFromCommand()} active={cockpitCreatingLiveRun} title="Start private live operator run">
                      <Icon name="spark" /> {cockpitCreatingLiveRun ? "Starting" : "Live Run"}
                    </ApexCockpitControlButton>
                    <ApexCockpitControlButton className="px-2" disabled={!canRememberCockpitTurn} onClick={() => rememberCockpitTurnFromAnswer()} active={cockpitRememberingTurn} title="Draft suggested memory from the latest Apex answer">
                      <Icon name="database" /> {cockpitRememberingTurn ? "Saving" : "Remember"}
                    </ApexCockpitControlButton>
                  </div>
                </div>
                <div className="grid min-w-0 gap-1.5 sm:grid-cols-6">
                  {[
                    { label: "Loop", value: cockpitConversationMode ? "Open" : "Manual", tone: cockpitConversationMode ? "green" : "slate" },
                    { label: "Barge-in", value: cockpitInterruptionCount ? `${cockpitInterruptionCount} caught` : cockpitBargeInEnabled ? "Armed" : "Off", tone: cockpitInterruptionCount ? "green" : cockpitBargeInEnabled ? "amber" : "slate" },
                    { label: "Memory", value: cockpitRememberedTurnCount ? `${cockpitRememberedTurnCount} saved` : "Manual", tone: cockpitRememberedTurnCount ? "green" : "blue" },
                    { label: "Input", value: cockpitRecording ? "Listening" : cockpitTranscribing ? "Reading" : "Standby", tone: cockpitRecording ? "green" : cockpitTranscribing ? "blue" : "slate" },
                    { label: "Captions", value: canUseCockpitSpeechRecognition ? (cockpitRecognitionStatus === "captioning" || cockpitRecognitionStatus === "interim" ? "Live" : "Ready") : "Server", tone: canUseCockpitSpeechRecognition ? "blue" : "slate" },
                    { label: "Output", value: cockpitSpeaking ? "Talking" : "Ready", tone: cockpitSpeaking ? "amber" : "green" },
                  ].map((item) => (
                    <div key={item.label} className="min-w-0 rounded-md border border-slate-800 bg-slate-900/58 px-2.5 py-2">
                      <p className="text-[9px] font-black uppercase tracking-[0.1em] text-slate-500">{item.label}</p>
                      <p className={`mt-0.5 text-[11px] font-black ${item.tone === "green" ? "text-emerald-300" : item.tone === "amber" ? "text-orange-300" : item.tone === "blue" ? "text-cyan-300" : "text-slate-300"}`}>{item.value}</p>
                    </div>
                  ))}
                </div>
                <div className="grid min-w-0 gap-2 rounded-lg border border-cyan-200/12 bg-slate-900/46 p-3">
                  <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-cyan-300">Live Operator Mode</p>
                      <p className="mt-0.5 min-w-0 break-words text-xs font-black text-slate-100">{cockpitVisibleLiveStatus}</p>
                      <p className="mt-0.5 min-w-0 break-words text-[11px] font-bold leading-4 text-slate-500">{cockpitLiveRunNotice || cockpitAgentActionNotice || liveOperatorMode.nextAction || "Start a live operator run from the Apex body."}</p>
                    </div>
                    <ToneBadge tone={cockpitVisibleLiveTone}>{liveOperatorMode.mode || "Review-first"}</ToneBadge>
                  </div>
                  <div className="grid min-w-0 gap-1.5 sm:grid-cols-4">
                    {[
                      { label: "Foundation", value: `${liveOperatorMode.foundationPercent || 0}%`, tone: "green" },
                      { label: "Operator", value: `${liveOperatorMode.jarvisBehaviorPercent || 0}%`, tone: "blue" },
                      { label: "Saved runs", value: String(cockpitVisibleSavedRunCount), tone: cockpitVisibleSavedRunCount ? "green" : "slate" },
                      { label: "Gates", value: liveOperatorMode.externalActionsLocked ? "Locked" : "Open", tone: liveOperatorMode.externalActionsLocked ? "amber" : "green" },
                    ].map((item) => (
                      <div key={item.label} className="min-w-0 rounded-md border border-slate-800 bg-slate-950/54 px-2.5 py-2">
                        <p className="text-[9px] font-black uppercase tracking-[0.1em] text-slate-500">{item.label}</p>
                        <p className={`mt-0.5 text-[11px] font-black ${item.tone === "green" ? "text-emerald-300" : item.tone === "amber" ? "text-orange-300" : item.tone === "blue" ? "text-cyan-300" : "text-slate-300"}`}>{item.value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="grid min-w-0 gap-2 rounded-md border border-cyan-200/10 bg-slate-950/48 p-2.5">
                    <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-cyan-300">Proactive Pulse</p>
                        <p className="mt-0.5 min-w-0 break-words text-[10px] font-bold leading-4 text-slate-500">
                          {cockpitLivePulseError || "Auto-checks build, briefing, and live-run status every minute while this page is open."}
                        </p>
                      </div>
                      <ApexCockpitControlButton className="shrink-0 px-2" disabled={cockpitLivePulseBusy || !sessionToken} onClick={() => refreshCockpitLivePulse({ automatic: false })} active={cockpitLivePulseBusy} title="Refresh Apex live pulse">
                        <Icon name="refresh" /> {cockpitLivePulseBusy ? "Checking" : "Check Now"}
                      </ApexCockpitControlButton>
                    </div>
                    <div className="grid min-w-0 gap-1.5 sm:grid-cols-4">
                      {cockpitPulseRows.map((item) => (
                        <div key={item.label} className="min-w-0 rounded-md border border-slate-800 bg-slate-900/48 px-2 py-1.5">
                          <p className="text-[8px] font-black uppercase tracking-[0.08em] text-slate-500">{item.label}</p>
                          <p className={`mt-0.5 truncate text-[10px] font-black ${item.tone === "green" ? "text-emerald-300" : item.tone === "amber" ? "text-orange-300" : item.tone === "red" ? "text-red-300" : "text-slate-300"}`}>{item.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="grid min-w-0 gap-1.5 sm:grid-cols-3">
                    {(liveOperatorMode.operatorLoopRows || []).slice(0, 6).map((item) => (
                      <div key={item.id} className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-md border border-slate-800 bg-slate-950/42 px-2.5 py-2">
                        <Icon name={item.id === "live-loop-validate" ? "check" : item.id === "live-loop-draft" ? "clipboard" : item.id === "live-loop-monitor" ? "refresh" : "spark"} className={`h-3.5 w-3.5 ${item.tone === "green" ? "text-emerald-300" : item.tone === "amber" ? "text-orange-300" : "text-cyan-300"}`} />
                        <span className="min-w-0">
                          <span className="block truncate text-[10px] font-black text-slate-200">{item.title}</span>
                          <span className="block truncate text-[9px] font-bold text-slate-500">{item.detail}</span>
                        </span>
                        <span className={`shrink-0 text-[9px] font-black uppercase tracking-[0.08em] ${item.tone === "green" ? "text-emerald-300" : item.tone === "amber" ? "text-orange-300" : "text-cyan-300"}`}>{item.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
              <section className="co-apex-cockpit-mobile-response grid min-w-0 gap-2 rounded-lg border border-cyan-200/14 bg-slate-950/76 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] xl:hidden" aria-label="Apex mobile response">
                <div className="flex min-w-0 items-center justify-between gap-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-cyan-300">Apex Response</p>
                  <ApexCockpitControlButton className="px-2" onClick={() => speakCockpitAnswer()} disabled={!canSpeakCockpitAnswer} active={cockpitSpeaking}>
                    <Icon name="spark" /> {cockpitSpeaking ? "Speaking" : "Speak"}
                  </ApexCockpitControlButton>
                </div>
                <p className={`min-w-0 break-words text-[11px] font-bold leading-5 ${cockpitError ? "text-red-200" : "text-slate-200"}`}>{cockpitError || cockpitAnswerText || "I'm here. Ask Apex anything, or wake voice once to keep the page listening."}</p>
                <p className="min-w-0 break-words text-[10px] font-bold leading-4 text-slate-500">{cockpitAgentActionNotice || cockpitVoiceNotice || cockpitRecognitionError || (cockpitNeedsWake ? "Mobile browsers may require one visible wake tap before open voice can stay alive." : `Answers stay source-backed and execution locked. ${cockpitCaptionStatusLabel}.`)}</p>
              </section>
              <div className="grid min-w-0 gap-2">
                <form className="relative min-w-0" onSubmit={submitCockpitQuestion}>
                  <label className="sr-only" htmlFor="apex-cockpit-ask">Ask Apex anything</label>
                  <input
                    id="apex-cockpit-ask"
                    value={askQuestion}
                    onChange={(event) => setAskQuestion(event.target.value)}
                    placeholder="Ask Apex anything..."
                    className="h-11 w-full min-w-0 appearance-none rounded-lg border border-orange-500/64 !bg-slate-950/90 px-4 pr-11 text-sm font-bold !text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_0_24px_-18px_rgba(249,115,22,0.95)] outline-none placeholder:!text-slate-500 focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20"
                  />
                  <button
                    type="submit"
                    disabled={!canAskCockpit}
                    className="co-focus-ring absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md text-orange-300 transition hover:bg-orange-500/12 hover:text-orange-100 disabled:cursor-not-allowed disabled:text-slate-600"
                    aria-label={cockpitSubmitting ? "Apex is thinking" : "Ask Apex"}
                    title={sessionToken ? "Ask Apex" : "Sign in required"}
                  >
                    <Icon name={cockpitSubmitting ? "refresh" : "arrowUpRight"} className="h-5 w-5" />
                  </button>
                </form>
                <div className="grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  {quickPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => setAskQuestion(prompt)}
                      className="co-focus-ring min-h-9 rounded-lg border border-slate-800 bg-slate-900/82 px-3 text-[11px] font-black text-slate-300 transition hover:border-orange-500/60 hover:text-white"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
                <ApexCockpitCommandStream
                  turns={cockpitTurns}
                  route={cockpitCommandRoute}
                  onOpenRoute={onChange}
                  onCreateAgentRequest={() => createCockpitAgentRequestFromCommand()}
                  onBrief={() => deliverCockpitBriefing({ speak: true })}
                  onAnswerCurrent={() => {
                    const currentQuestion = askQuestion.trim() || cockpitLastQuestion || "Summarize today";
                    setAskQuestion(currentQuestion);
                    askCockpitQuestion(currentQuestion);
                  }}
                  creatingAgentRequest={cockpitCreatingAgentRequest}
                />
              </div>
            </div>

            <div className="co-apex-cockpit-side-rail co-apex-cockpit-side-rail--status order-3 grid w-full min-w-0 max-w-full gap-2 md:grid-cols-2 xl:grid-cols-2 lg:min-h-0 lg:overflow-hidden xl:order-none">
              <ApexCockpitCard title="Awareness">
                <ApexCockpitListItem item={{ label: "Active Approvals", icon: "check" }} value={state.approvalCommandCenter?.queueCount || 0} tone="amber" />
                <ApexCockpitListItem item={{ label: "Open Blockers", icon: "alert" }} value={state.launchReadiness?.blockedCount || state.approvalCommandCenter?.packetSummary?.blocked || 0} tone="red" />
                <ApexCockpitListItem item={{ label: "Agent Work", icon: "layers" }} value={state.agentControlPlane?.roleCount || state.agentWorkQueue?.availableTaskCount || 0} tone="blue" />
                <ApexCockpitListItem item={{ label: "Release Status", icon: "refresh" }} value={releaseHealth} tone={state.releaseDesk?.tone || "green"} />
                <ApexCockpitControlButton className="mt-2 w-full" disabled={false} onClick={() => onChange("overview")}>View Overview</ApexCockpitControlButton>
              </ApexCockpitCard>

              <ApexCockpitCard title="Approvals" action={<span className="text-slate-500">&gt;</span>}>
                <div className="grid min-w-0 gap-2">
                  {approvalRows.map((item) => (
                    <div key={item.id} className="flex min-w-0 items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="break-words text-[10px] font-black leading-3 text-slate-200">{item.title}</p>
                        <p className="break-words text-[9px] font-bold leading-3 text-slate-500">Need your review</p>
                      </div>
                      <Icon name={item.tone === "blue" ? "help" : "alert"} className={`h-4 w-4 shrink-0 ${item.tone === "blue" ? "text-cyan-300" : "text-orange-400"}`} />
                    </div>
                  ))}
                </div>
                <ApexCockpitControlButton className="mt-2 w-full" disabled={false} onClick={() => onChange("approvals")}>View Approvals</ApexCockpitControlButton>
              </ApexCockpitCard>

              <ApexCockpitCard title="Apex Memory" action={<span className="text-slate-500">&gt;</span>}>
                <ApexCockpitListItem item={{ label: "Trusted Memories", icon: "database" }} value={memoryCount} tone="slate" />
                <ApexCockpitListItem item={{ label: "Recent Updates", icon: "refresh" }} value={state.decisionMemory?.durableCount || 0} tone="slate" />
                <ApexCockpitListItem item={{ label: "Suggested Memories", icon: "spark" }} value={state.decisionMemory?.suggestedCount || 0} tone="slate" />
                <ApexCockpitControlButton className="mt-2 w-full" disabled={false} onClick={() => onChange("memory")}>Review Memory</ApexCockpitControlButton>
              </ApexCockpitCard>

              <ApexCockpitCard title="Agents" action={<span className="text-slate-500">&gt;</span>}>
                <div className="grid min-w-0 gap-2">
                  {agentRows.map((item) => (
                    <div key={item.id} className="flex min-w-0 items-center justify-between gap-2">
                      <p className="min-w-0 break-words text-[10px] font-bold leading-3 text-slate-300">{item.title}</p>
                      <span className="flex shrink-0 items-center gap-1.5 text-[9px] font-black leading-3 text-slate-300">
                        <ApexCockpitStatusDot tone={item.tone === "amber" ? "amber" : item.tone === "red" ? "red" : "green"} />
                        {item.status === "needs_review" ? "Waiting" : item.status || "Working"}
                      </span>
                    </div>
                  ))}
                </div>
                <ApexCockpitControlButton className="mt-2 w-full" disabled={false} onClick={() => onChange("agents")}>View Agents</ApexCockpitControlButton>
              </ApexCockpitCard>

              <ApexCockpitCard title="Release" action={<span className="text-slate-500">&gt;</span>} className="md:col-span-2 xl:col-span-1">
                <div className="grid gap-0.5 text-[10px] font-bold leading-3 text-slate-400">
                  <div className="flex justify-between gap-3"><span>Version</span><span className="text-slate-200">{releaseVersion}</span></div>
                  <div className="flex justify-between gap-3"><span>Environment</span><span className="text-slate-200">Production</span></div>
                  <div className="flex justify-between gap-3"><span>Evidence</span><span className="text-slate-200">{state.releaseDesk?.deployHistoryCount ? `${state.releaseDesk.deployHistoryCount} rows` : "Required"}</span></div>
                  <div className="flex justify-between gap-3"><span>Health</span><span className="text-emerald-300">{releaseHealth}</span></div>
                </div>
                <ApexCockpitControlButton className="mt-2 w-full" disabled={false} onClick={() => onChange("release")}>View Release</ApexCockpitControlButton>
              </ApexCockpitCard>
            </div>
          </div>

          <section className="grid min-w-0 gap-3 rounded-lg border border-slate-800 bg-slate-950/70 p-3 sm:grid-cols-2 xl:grid-cols-5">
            <p className="sm:col-span-2 xl:col-span-5 text-[11px] font-black uppercase tracking-[0.12em] text-slate-300">Apex Boundaries <span className="font-bold normal-case text-slate-500">(Always On)</span></p>
            {boundaryRows.map((item) => (
              <div key={item.id} className="flex min-w-0 items-start gap-3 border-slate-800 xl:border-r xl:pr-3 xl:last:border-r-0">
                <Icon name={item.icon} className="mt-0.5 h-4 w-4 shrink-0 text-orange-400" />
                <div className="min-w-0">
                  <p className="break-words text-xs font-black text-slate-200">{item.title}</p>
                  <p className="break-words text-[11px] font-bold leading-4 text-slate-500">{item.detail}</p>
                </div>
              </div>
            ))}
          </section>
        </div>
      </div>
    </section>
  );
}

function ApexHomePanel({ state, activeSection, onChange, askQuestion, setAskQuestion, sessionToken }) {
  return (
    <section className="grid min-w-0 gap-4">
      <ApexCockpitScreen state={state} activeSection={activeSection} onChange={onChange} askQuestion={askQuestion} setAskQuestion={setAskQuestion} sessionToken={sessionToken} />
      <div className="hidden">
        <ApexRoomLauncher
          activeSection={activeSection}
          onChange={onChange}
          variant="dark"
          title="Room switcher"
          description="The cockpit stays as Apex's home. These buttons open the categorized rooms around it."
        />
      </div>
    </section>
  );
}

function ControlRoomOverviewSection({ state }) {
  return (
    <ControlRoomCategoryShell sectionId="overview" state={state}>
      <ControlRoomRoomTabs
        label="Overview room sections"
        tabs={[
          {
            id: "kpis",
            label: "KPI strip",
            helper: "Current state",
            icon: "grid",
            content: (
              <section className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {state.kpis.map((item) => <KpiTile key={item.id} item={item} />)}
              </section>
            ),
          },
          {
            id: "board",
            label: "Command board",
            helper: "Main panels",
            icon: "layers",
            content: (
              <section className="grid min-w-0 gap-3 lg:grid-cols-2 2xl:grid-cols-5">
                {state.commandBoardPanels.map((item) => (
                  <Card key={item.id} className="min-w-0 p-4">
                    <SectionHeader
                      title={item.title}
                      description={item.detail}
                      action={<ToneBadge tone={item.tone}>{item.status}</ToneBadge>}
                    />
                  </Card>
                ))}
              </section>
            ),
          },
          {
            id: "briefing",
            label: "Briefing",
            helper: "Priorities + gates",
            icon: "spark",
            content: (
              <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)]">
                <Card className="min-w-0 p-4 sm:p-5">
                  <SectionHeader
                    title="Apex Briefing"
                    description={state.summary}
                    action={<span className="inline-flex h-9 items-center rounded-xl bg-slate-950 px-3 text-xs font-black text-white"><Icon name="spark" className="mr-2 h-4 w-4" />Slice 3 memory</span>}
                  />
                  <div className="grid min-w-0 gap-3 lg:grid-cols-2 2xl:grid-cols-4">
                    {state.priorities.map((item) => <StatusRow key={item.id} item={item} />)}
                  </div>
                </Card>

                <Card className="min-w-0 p-4 sm:p-5">
                  <SectionHeader title="Approval Gates" description="Risky actions stay locked behind owner approval." />
                  <div className="min-w-0">
                    {state.approvals.map((item) => <ApprovalRow key={item.id} item={item} />)}
                  </div>
                </Card>
              </section>
            ),
          },
          {
            id: "signals",
            label: "Signals",
            helper: "Read-only state",
            icon: "refresh",
            content: (
              <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <Card className="min-w-0 p-4 sm:p-5">
                  <SectionHeader title="Operating Signals" description="Read-only state pulled from current Apex HQ systems." />
                  {state.phase3Aggregator?.rows?.length ? (
                    <div className="mb-4 rounded-xl border border-orange-200 bg-orange-50/70 p-3">
                      <SectionHeader
                        title="Phase 3 State Packet"
                        description={`${state.phase3Aggregator.rowCount || 0} read-only rows, ${state.phase3Aggregator.sourceCount || 0} source groups, ${state.phase3Aggregator.confidence || 0}% average confidence.`}
                        action={<ToneBadge tone={state.phase3Aggregator.tone}>{state.phase3Aggregator.status}</ToneBadge>}
                      />
                      <div className="mt-3 grid min-w-0 gap-3 lg:grid-cols-2">
                        {state.phase3Aggregator.rows.map((item) => <StatusRow key={item.id} item={item} />)}
                      </div>
                    </div>
                  ) : null}
                  <div className="grid min-w-0 gap-3 lg:grid-cols-2">
                    {state.operatingSignals.map((item) => <StatusRow key={item.id} item={item} />)}
                  </div>
                </Card>

                <Card className="min-w-0 p-4 sm:p-5">
                  <SectionHeader title="Next Best Actions" description="Private owner actions for the next controlled build step." />
                  <div className="grid min-w-0 gap-3">
                    {state.nextBestActions.map((item) => <StatusRow key={item.id} item={item} />)}
                  </div>
                </Card>
              </section>
            ),
          },
          {
            id: "evidence",
            label: "Evidence",
            helper: "Audit rows",
            icon: "clipboard",
            content: (
              <section className="grid min-w-0 gap-4 xl:grid-cols-2">
                <Card className="min-w-0 p-4 sm:p-5">
                  <SectionHeader title="Recent Evidence" description="Current audit signal available to Apex OS." />
                  {state.evidence.length ? (
                    <div className="grid min-w-0 gap-3">
                      {state.evidence.map((item) => <EvidenceRow key={item.id} item={item} />)}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm font-bold text-slate-600">
                      No recent evidence rows are visible for this workspace.
                    </div>
                  )}
                </Card>
              </section>
            ),
          },
        ]}
      />
    </ControlRoomCategoryShell>
  );
}

function ControlRoomApexSection({ state, activeSection, onChange, sessionToken, askQuestion, setAskQuestion }) {
  return (
    <div className="grid min-w-0 gap-4">
      <ApexHomePanel state={state} activeSection={activeSection} onChange={onChange} askQuestion={askQuestion} setAskQuestion={setAskQuestion} sessionToken={sessionToken} />
    </div>
  );
}

function ControlRoomMemorySection({ state, sessionToken }) {
  return (
    <ControlRoomCategoryShell sectionId="memory" state={state}>
      <ControlRoomRoomTabs
        label="Memory room sections"
        tabs={[
          {
            id: "decisions",
            label: "Decisions",
            helper: "What John decided",
            icon: "database",
            content: (
              <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
                <Card className="min-w-0 p-4 sm:p-5">
                  <SectionHeader
                    title="Decision Memory"
                    description={`What John decided. ${state.decisionMemory.decisionCount || 0} plan decisions and ${state.decisionMemory.durableCount || 0} durable memory rows are visible.`}
                    action={<ToneBadge tone={state.decisionMemory.tone}>{state.decisionMemory.status}</ToneBadge>}
                  />
                  <div className="grid min-w-0 gap-3 lg:grid-cols-2">
                    {state.decisionMemory.decisions.map((item) => <MemoryRow key={item.id} item={item} />)}
                  </div>
                </Card>

                <Card className="min-w-0 p-4 sm:p-5">
                  <SectionHeader
                    title="Operating Rules"
                    description="Current Apex OS boundaries before editable memory exists."
                  />
                  <div className="grid min-w-0 gap-3">
                    {state.decisionMemory.rules.map((item) => <MemoryRow key={item.id} item={item} />)}
                  </div>
                </Card>
              </section>
            ),
          },
          {
            id: "review",
            label: "Review",
            helper: "Draft/approve/archive",
            icon: "check",
            content: (
              <section className="grid min-w-0 gap-4">
                <Card className="min-w-0 p-4 sm:p-5">
                  <SectionHeader
                    title="What Did I Decide?"
                    description="Source-backed decision memory with manual draft, approve, and archive controls."
                    action={<ToneBadge tone={state.decisionMemory.approvedCount ? "green" : "blue"}>{state.decisionMemory.approvedCount || 0} approved</ToneBadge>}
                  />
                  <DecisionMemoryManager state={state} sessionToken={sessionToken} />
                </Card>
              </section>
            ),
          },
          {
            id: "vault",
            label: "Vault",
            helper: "Categories + gates",
            icon: "layers",
            content: (
              <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                <Card className="min-w-0 p-4 sm:p-5">
                  <SectionHeader
                    title="Knowledge Vault"
                    description={`${state.knowledgeVault.categoryCount || 0} private knowledge categories are ready for reviewed intake.`}
                    action={<ToneBadge tone={state.knowledgeVault.tone}>{state.knowledgeVault.status}</ToneBadge>}
                  />
                  <div className="grid min-w-0 gap-3 lg:grid-cols-2">
                    {state.knowledgeVault.categories.slice(0, 6).map((item) => <StatusRow key={item.id} item={item} />)}
                  </div>
                </Card>

                <Card className="min-w-0 p-4 sm:p-5">
                  <SectionHeader title="Vault Safety Gates" description="Upload and trusted-memory boundaries." />
                  <div className="grid min-w-0 gap-3">
                    {state.knowledgeVault.safetyRows.map((item) => <StatusRow key={item.id} item={item} />)}
                  </div>
                </Card>
              </section>
            ),
          },
          {
            id: "sources",
            label: "Sources",
            helper: "Intake status",
            icon: "clipboard",
            content: (
              <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
                <Card className="min-w-0 p-4 sm:p-5">
                  <SectionHeader title="Vault Sources" description={`${state.knowledgeVault.sourceCount || 0} current source candidates.`} />
                  <div className="grid min-w-0 gap-3">
                    {state.knowledgeVault.sourceRows.map((item) => <StatusRow key={item.id} item={item} />)}
                  </div>
                </Card>

                <Card className="min-w-0 p-4 sm:p-5">
                  <SectionHeader title="Vault Intake Status" description="Reviewed private knowledge intake." />
                  <div className="grid min-w-0 gap-3 lg:grid-cols-2">
                    <StatusRow item={{
                      id: "durable-apex-os-memory",
                      title: "Durable Apex OS memory",
                      status: state.knowledgeVault.memorySummary?.total ? `${state.knowledgeVault.memorySummary.total} saved` : "Ready",
                      detail: `${state.knowledgeVault.memorySummary?.approved || 0} approved, ${state.knowledgeVault.memorySummary?.suggested || 0} suggested, and ${state.knowledgeVault.memorySummary?.archived || 0} archived memory rows are tracked in private company settings.`,
                      tone: state.knowledgeVault.memorySummary?.total ? "green" : "blue",
                    }} />
                    <StatusRow item={{
                      id: "upload-intake",
                      title: "Upload intake",
                      status: "Text intake active",
                      detail: "Local text files can be read into the vault and saved as suggested knowledge with source metadata.",
                      tone: "green",
                    }} />
                    <StatusRow item={{
                      id: "trusted-memory",
                      title: "Trusted memory",
                      status: "Approval required",
                      detail: "Suggested knowledge does not feed approved Apex context until manually approved.",
                      tone: "amber",
                    }} />
                  </div>
                </Card>
              </section>
            ),
          },
          {
            id: "upload",
            label: "Upload",
            helper: "Knowledge intake",
            icon: "upload",
            content: (
              <section className="min-w-0">
                <Card className="min-w-0 p-4 sm:p-5">
                  <SectionHeader
                    title="Knowledge Upload Vault"
                    description="Classify, draft, review, search, and approve private Apex OS knowledge."
                    action={<ToneBadge tone={state.knowledgeVault.tone}>{state.knowledgeVault.status}</ToneBadge>}
                  />
                  <KnowledgeVaultManager state={state} sessionToken={sessionToken} />
                </Card>
              </section>
            ),
          },
        ]}
      />
    </ControlRoomCategoryShell>
  );
}

function ControlRoomAgentsSection({ state, sessionToken, onChange }) {
  return (
    <ControlRoomCategoryShell sectionId="agents" state={state}>
      <ControlRoomRoomTabs
        label="Agent room sections"
        tabs={[
          {
            id: "run-center",
            label: "Run Center",
            helper: "Plan + gates",
            icon: "spark",
            content: (
              <section className="grid min-w-0 gap-4">
                <Card className="min-w-0 p-4 sm:p-5">
                  <SectionHeader
                    title="Autonomy Run Center"
                    description={`${state.autonomyRunCenter.planStepCount || 0} visible steps turn a request into routed, validated, approval-gated work.`}
                    action={<ToneBadge tone={state.autonomyRunCenter.tone}>{state.autonomyRunCenter.status}</ToneBadge>}
                  />
                  <AutonomyRunCenterPanel
                    state={state}
                    sessionToken={sessionToken}
                    onOpenAgents={() => onChange?.("agents")}
                    onOpenApprovals={() => onChange?.("approvals")}
                    onCreateAgentRequest={() => onChange?.("agents")}
                    variant="light"
                  />
                </Card>
              </section>
            ),
          },
          {
            id: "control-plane",
            label: "Control plane",
            helper: "Roster + requests",
            icon: "users",
            content: (
              <section className="grid min-w-0 gap-4">
                <Card className="min-w-0 p-4 sm:p-5">
                  <SectionHeader
                    title="Agent Control Plane"
                    description={`${state.agentControlPlane.rosterRows?.length || 0} agent roles with durable pause, resume, scoped-run, report, and handoff history.`}
                    action={<ToneBadge tone={state.agentControlPlane.tone}>{state.agentControlPlane.status}</ToneBadge>}
                  />
                  <AgentControlPlanePanel state={state} sessionToken={sessionToken} />
                </Card>
              </section>
            ),
          },
          {
            id: "queue",
            label: "Queue",
            helper: "Work + ledger",
            icon: "layers",
            content: (
              <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                <Card className="min-w-0 p-4 sm:p-5">
                  <SectionHeader
                    title="Agent Work Queue"
                    description={`${state.agentWorkQueue.availableTaskCount || 0} review-only task types across ${state.agentWorkQueue.visibleTargetCount || 0} visible targets.`}
                    action={<ToneBadge tone={state.agentWorkQueue.tone}>{state.agentWorkQueue.status}</ToneBadge>}
                  />
                  {state.agentWorkQueue.taskRows.length ? (
                    <div className="grid min-w-0 gap-3 lg:grid-cols-2">
                      {state.agentWorkQueue.taskRows.map((item) => <StatusRow key={item.id} item={item} />)}
                    </div>
                  ) : (
                    <EmptyPanel>No review-only agent tasks are available for visible records.</EmptyPanel>
                  )}
                </Card>

                <Card className="min-w-0 p-4 sm:p-5">
                  <SectionHeader
                    title="Agent Run Ledger"
                    description={`${state.agentWorkQueue.recentRunCount || 0} recent audit-backed run rows.`}
                  />
                  {state.agentWorkQueue.runRows.length ? (
                    <div className="grid min-w-0 gap-3">
                      {state.agentWorkQueue.runRows.map((item) => <StatusRow key={item.id} item={item} />)}
                    </div>
                  ) : (
                    <EmptyPanel>No recent Agent OS run rows are visible yet.</EmptyPanel>
                  )}
                </Card>
              </section>
            ),
          },
          {
            id: "handoffs",
            label: "Handoffs",
            helper: "Draft packages",
            icon: "clipboard",
            content: (
              <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
                <Card className="min-w-0 p-4 sm:p-5">
                  <SectionHeader title="Agent Safety Locks" description="What this queue still cannot do." />
                  <div className="grid min-w-0 gap-3">
                    {state.agentWorkQueue.safetyRows.map((item) => <StatusRow key={item.id} item={item} />)}
                  </div>
                </Card>

                <Card className="min-w-0 p-4 sm:p-5">
                  <SectionHeader
                    title="Agent Handoff Drafts"
                    description={`${state.executionHandoffs.handoffSummary?.total || 0} durable handoffs prepare scoped agent work packages without running them.`}
                    action={<ToneBadge tone={state.executionHandoffs.tone}>{state.executionHandoffs.status}</ToneBadge>}
                  />
                  <ExecutionHandoffDraftPanel state={state} sessionToken={sessionToken} />
                </Card>
              </section>
            ),
          },
          {
            id: "locked",
            label: "Locked",
            helper: "Tasks + locks",
            icon: "lock",
            content: (
              <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <Card className="min-w-0 p-4 sm:p-5">
                  <SectionHeader
                    title="Locked Agent Tasks"
                    description={`${state.agentWorkQueue.lockedTaskCount || 0} task types are locked or have no visible targets.`}
                  />
                  {state.agentWorkQueue.lockedRows.length ? (
                    <div className="grid min-w-0 gap-3 lg:grid-cols-2">
                      {state.agentWorkQueue.lockedRows.map((item) => <StatusRow key={item.id} item={item} />)}
                    </div>
                  ) : (
                    <EmptyPanel>No locked agent task rows are visible.</EmptyPanel>
                  )}
                </Card>

                <Card className="min-w-0 p-4 sm:p-5">
                  <SectionHeader title="Handoff Execution Locks" description="Prepared handoffs cannot cross approval boundaries by themselves." />
                  <div className="grid min-w-0 gap-3">
                    <StatusRow item={{
                      id: "handoff-no-queue",
                      title: "No agent queueing",
                      status: "Locked",
                      detail: "Handoff drafts do not call Agent OS queue, run, or execution endpoints.",
                      tone: "amber",
                    }} />
                    <StatusRow item={{
                      id: "handoff-no-external",
                      title: "No external actions",
                      status: "Locked",
                      detail: "Deploy, sends, spend, provider setup, customer-visible changes, production mutation, and deletion remain outside this flow.",
                      tone: "amber",
                    }} />
                  </div>
                </Card>
              </section>
            ),
          },
          {
            id: "posture",
            label: "Posture",
            helper: "Agent status",
            icon: "check",
            content: (
              <section className="grid min-w-0 gap-4 xl:grid-cols-2">
                <Card className="min-w-0 p-4 sm:p-5">
                  <SectionHeader title="Agent Control" description="Read-only agent posture for the first slice." />
                  <div className="grid min-w-0 gap-3">
                    {state.agents.map((item) => <StatusRow key={item.id} item={item} />)}
                  </div>
                </Card>
              </section>
            ),
          },
        ]}
      />
    </ControlRoomCategoryShell>
  );
}

function ControlRoomApprovalsSection({ state, sessionToken }) {
  return (
    <ControlRoomCategoryShell sectionId="approvals" state={state}>
      <ControlRoomRoomTabs
        label="Approval room sections"
        tabs={[
          {
            id: "queue",
            label: "Queue",
            helper: "Risk categories",
            icon: "lock",
            content: (
              <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <Card className="min-w-0 p-4 sm:p-5">
                  <SectionHeader
                    title="Approval Command Center"
                    description={`${state.approvalCommandCenter.queueCount || 0} risky-action categories require scoped owner approval packets.`}
                    action={<ToneBadge tone={state.approvalCommandCenter.tone}>{state.approvalCommandCenter.status}</ToneBadge>}
                  />
                  <div className="grid min-w-0 gap-3 lg:grid-cols-2">
                    {state.approvalCommandCenter.queueRows.map((item) => <StatusRow key={item.id} item={item} />)}
                  </div>
                </Card>

                <Card className="min-w-0 p-4 sm:p-5">
                  <SectionHeader title="Approval Packet Drafts" description={`${state.approvalCommandCenter.packetFieldCount || 0} fields guide ready packets before any risky work can be approved.`} />
                  <ApprovalPacketDraftPanel state={state} sessionToken={sessionToken} />
                </Card>
              </section>
            ),
          },
          {
            id: "controls",
            label: "Controls",
            helper: "Decisions only",
            icon: "check",
            content: (
              <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                <Card className="min-w-0 p-4 sm:p-5">
                  <SectionHeader title="Approval Controls" description="Approve, reject, and defer are durable review decisions on packets. Execution remains separate and locked." />
                  <div className="grid min-w-0 gap-3">
                    {state.approvalCommandCenter.controlRows.map((item) => <StatusRow key={item.id} item={item} />)}
                  </div>
                  <div className="mt-4 flex min-w-0 flex-wrap gap-2">
                    <Button type="button" disabled variant="secondary" size="sm">
                      <Icon name="check" /> Packet approval only
                    </Button>
                    <Button type="button" disabled variant="secondary" size="sm">
                      <Icon name="alert" /> Packet reject only
                    </Button>
                    <Button type="button" disabled variant="secondary" size="sm">
                      <Icon name="clock" /> Packet defer only
                    </Button>
                    <Button type="button" disabled variant="secondary" size="sm">
                      <Icon name="lock" /> Execute locked
                    </Button>
                  </div>
                  <div className="mt-4">
                    <SectionHeader title="Approval Templates" description={`${state.approvalCommandCenter.templateCount || 0} packet templates define phrase and evidence expectations.`} />
                    <div className="grid min-w-0 gap-3">
                      {state.approvalCommandCenter.templateRows.map((item) => <StatusRow key={item.id} item={item} />)}
                    </div>
                  </div>
                </Card>

                <Card className="min-w-0 p-4 sm:p-5">
                  <SectionHeader title="Approval Sources" description={`${state.approvalCommandCenter.sourceCount || 0} surfaces feeding approval packets.`} />
                  <div className="grid min-w-0 gap-3">
                    {state.approvalCommandCenter.sourceRows.map((item) => <StatusRow key={item.id} item={item} />)}
                  </div>
                </Card>
              </section>
            ),
          },
        ]}
      />
    </ControlRoomCategoryShell>
  );
}

function ControlRoomReleaseSection({ state, sessionToken }) {
  return (
    <ControlRoomCategoryShell sectionId="release" state={state}>
      <ControlRoomRoomTabs
        label="Release room sections"
        tabs={[
          {
            id: "monitoring",
            label: "Monitoring",
            helper: "Release + briefing",
            icon: "refresh",
            content: (
              <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <Card className="min-w-0 p-4 sm:p-5">
                  <SectionHeader
                    title="Release Monitoring"
                    description={`${state.releaseMonitoring.readinessCount || 0} release and monitoring checks are mapped for private review.`}
                    action={<ToneBadge tone={state.releaseMonitoring.tone}>{state.releaseMonitoring.status}</ToneBadge>}
                  />
                  <ReleaseMonitoringPanel state={state} sessionToken={sessionToken} />
                </Card>

                <Card className="min-w-0 p-4 sm:p-5">
                  <SectionHeader title="Daily Briefing" description={`${state.releaseMonitoring.briefingCount || 0} briefing rows for John-only review.`} />
                  <DailyBriefingPanel state={state} sessionToken={sessionToken} />
                </Card>
              </section>
            ),
          },
          {
            id: "build",
            label: "Build",
            helper: "Code awareness",
            icon: "layers",
            content: (
              <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
                <Card className="min-w-0 p-4 sm:p-5 xl:col-span-2">
                  <SectionHeader
                    title="App Build Awareness"
                    description="Current branch, changed files, build/test signals, release evidence, frozen phases, and next safe task."
                    action={<ToneBadge tone={state.buildAwareness.tone}>{state.buildAwareness.status}</ToneBadge>}
                  />
                  <BuildAwarenessPanel state={state} sessionToken={sessionToken} />
                </Card>
              </section>
            ),
          },
          {
            id: "packet",
            label: "Packet",
            helper: "Readiness + locks",
            icon: "clipboard",
            content: (
              <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
                <Card className="min-w-0 p-4 sm:p-5">
                  <SectionHeader title="Release Readiness Packet" description={`${state.releaseMonitoring.packetCount || 0} packet rows before any release approval.`} />
                  <div className="grid min-w-0 gap-3 lg:grid-cols-2">
                    {state.releaseMonitoring.releasePacketRows.map((item) => <StatusRow key={item.id} item={item} />)}
                  </div>
                </Card>

                <Card className="min-w-0 p-4 sm:p-5">
                  <SectionHeader title="Monitoring Locks" description="Monitoring is read-only until provider and deploy approval exists." />
                  <div className="grid min-w-0 gap-3">
                    {state.releaseMonitoring.lockRows.map((item) => <StatusRow key={item.id} item={item} />)}
                  </div>
                </Card>
              </section>
            ),
          },
          {
            id: "desk",
            label: "Release desk",
            helper: "Launch + deploy desk",
            icon: "upload",
            content: (
              <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                <Card className="min-w-0 p-4 sm:p-5">
                  <SectionHeader
                    title="Launch Readiness"
                    description={`${state.launchReadiness.readyCount || 0} of ${state.launchReadiness.totalCount || 0} gates ready.`}
                    action={<ToneBadge tone={state.launchReadiness.tone}>{state.launchReadiness.status}</ToneBadge>}
                  />
                  <div className="grid min-w-0 gap-3">
                    {state.launchReadiness.gates.map((item) => <StatusRow key={item.id} item={item} />)}
                  </div>
                </Card>

                <Card className="min-w-0 p-4 sm:p-5">
                  <SectionHeader
                    title="Release Desk"
                    description="Production preview, release packet, deploy history, rollback, and locked approval flow."
                    action={<ToneBadge tone={state.releaseDesk.tone}>{state.releaseDesk.status}</ToneBadge>}
                  />
                  <ReleaseDeskPanel state={state} sessionToken={sessionToken} />
                </Card>
              </section>
            ),
          },
        ]}
      />
    </ControlRoomCategoryShell>
  );
}

function ControlRoomBusinessSection({ state }) {
  return (
    <ControlRoomCategoryShell sectionId="business" state={state}>
      <ControlRoomRoomTabs
        label="Business room sections"
        tabs={[
          {
            id: "command",
            label: "Command",
            helper: "Queues + gates",
            icon: "briefcase",
            content: (
              <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                <Card className="min-w-0 p-4 sm:p-5">
                  <SectionHeader
                    title="Business Command Center"
                    description={`${state.businessCommandCenter.queueCount || 0} private business queues for Apex HQ growth and launch work.`}
                    action={<ToneBadge tone={state.businessCommandCenter.tone}>{state.businessCommandCenter.status}</ToneBadge>}
                  />
                  <div className="grid min-w-0 gap-3 lg:grid-cols-2">
                    {state.businessCommandCenter.queueRows.map((item) => <StatusRow key={item.id} item={item} />)}
                  </div>
                </Card>

                <Card className="min-w-0 p-4 sm:p-5">
                  <SectionHeader title="Business Gates" description={`${state.businessCommandCenter.gateCount || 0} gates keep business actions manual.`} />
                  <div className="grid min-w-0 gap-3">
                    {state.businessCommandCenter.gateRows.map((item) => <StatusRow key={item.id} item={item} />)}
                  </div>
                </Card>
              </section>
            ),
          },
          {
            id: "launch",
            label: "Launch",
            helper: "Demo + briefing",
            icon: "spark",
            content: (
              <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                <Card className="min-w-0 p-4 sm:p-5">
                  <SectionHeader title="Launch / Founder Demo" description={`${state.businessCommandCenter.launchCount || 0} launch and founder-led demo readiness rows.`} />
                  <div className="grid min-w-0 gap-3">
                    {state.businessCommandCenter.launchRows.map((item) => <StatusRow key={item.id} item={item} />)}
                  </div>
                </Card>

                <Card className="min-w-0 p-4 sm:p-5">
                  <SectionHeader title="Business Briefing" description={`${state.businessCommandCenter.briefingCount || 0} John-only business briefing rows.`} />
                  <div className="grid min-w-0 gap-3">
                    {state.businessCommandCenter.briefingRows.map((item) => <StatusRow key={item.id} item={item} />)}
                  </div>
                </Card>
              </section>
            ),
          },
          {
            id: "drafts",
            label: "Drafts",
            helper: "Memory + tasks",
            icon: "clipboard",
            content: (
              <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                <Card className="min-w-0 p-4 sm:p-5">
                  <SectionHeader title="Business Source Memory" description={`${state.businessCommandCenter.memorySourceCount || 0} approved business memory rows feeding private planning.`} />
                  <div className="grid min-w-0 gap-3">
                    {state.businessCommandCenter.memoryRows.length
                      ? state.businessCommandCenter.memoryRows.map((item) => <StatusRow key={item.id} item={item} />)
                      : <EmptyPanel>No approved business memory is feeding Phase 10 yet. Approve relevant business strategy, marketing/sales, customer research, legal/risk, or owner-note rows before treating them as source context.</EmptyPanel>}
                  </div>
                </Card>

                <Card className="min-w-0 p-4 sm:p-5">
                  <SectionHeader title="Business Task Drafts" description={`${state.businessCommandCenter.taskDraftCount || 0} private task drafts mapped to existing handoff workflow.`} />
                  <div className="grid min-w-0 gap-3">
                    {state.businessCommandCenter.taskDraftRows.map((item) => <StatusRow key={item.id} item={item} />)}
                  </div>
                </Card>
              </section>
            ),
          },
          {
            id: "approval-drafts",
            label: "Approvals",
            helper: "Packet drafts",
            icon: "lock",
            content: (
              <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)]">
                <Card className="min-w-0 p-4 sm:p-5">
                  <SectionHeader title="Business Approval Drafts" description={`${state.businessCommandCenter.approvalDraftCount || 0} packet drafts for sends, publishing, billing, customer-visible work, and business operations.`} />
                  <div className="grid min-w-0 gap-3 lg:grid-cols-2">
                    {state.businessCommandCenter.approvalDraftRows.map((item) => <StatusRow key={item.id} item={item} />)}
                  </div>
                </Card>
              </section>
            ),
          },
        ]}
      />
    </ControlRoomCategoryShell>
  );
}

function ControlRoomTrustSection({ state }) {
  return (
    <ControlRoomCategoryShell sectionId="trust" state={state}>
      <ControlRoomRoomTabs
        label="Trust room sections"
        tabs={[
          {
            id: "finished",
            label: "Finished OS",
            helper: "Capabilities",
            icon: "check",
            content: (
              <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
                <Card className="min-w-0 p-4 sm:p-5">
                  <SectionHeader
                    title="Finished Apex OS"
                    description={`${state.finishedApexOs.readyCount || 0} of ${state.finishedApexOs.capabilityCount || 0} finished capabilities are assembled for day-to-day Apex HQ operation.`}
                    action={<ToneBadge tone={state.finishedApexOs.tone}>{state.finishedApexOs.status}</ToneBadge>}
                  />
                  <div className="grid min-w-0 gap-3 lg:grid-cols-2 2xl:grid-cols-3">
                    {state.finishedApexOs.capabilityRows.map((item) => <StatusRow key={item.id} item={item} />)}
                  </div>
                </Card>

                <Card className="min-w-0 p-4 sm:p-5">
                  <SectionHeader title="Day-to-Day Run Loop" description={`${state.finishedApexOs.runLoopCount || 0} owner workflows Apex OS can coordinate from the private cockpit.`} />
                  <div className="grid min-w-0 gap-3">
                    {state.finishedApexOs.runLoopRows.map((item) => <StatusRow key={item.id} item={item} />)}
                  </div>
                </Card>
              </section>
            ),
          },
          {
            id: "freeze",
            label: "Freeze",
            helper: "Blocked actions",
            icon: "lock",
            content: (
              <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                <Card className="min-w-0 p-4 sm:p-5">
                  <SectionHeader title="Completion Freeze" description={`${state.finishedApexOs.freezeCount || 0} final freeze rows before closing Apex OS completion.`} />
                  <div className="grid min-w-0 gap-3">
                    {state.finishedApexOs.freezeRows.map((item) => <StatusRow key={item.id} item={item} />)}
                  </div>
                </Card>

                <Card className="min-w-0 p-4 sm:p-5">
                  <SectionHeader title="Still Blocked" description={`${state.finishedApexOs.blockedActionCount || 0} external action classes stay locked after Apex OS completion.`} />
                  <div className="grid min-w-0 gap-3 lg:grid-cols-2">
                    {state.finishedApexOs.blockedActionRows.map((item) => <StatusRow key={item.id} item={item} />)}
                  </div>
                </Card>
              </section>
            ),
          },
          {
            id: "hardening",
            label: "Hardening",
            helper: "QA evidence",
            icon: "alert",
            content: (
              <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
                <Card className="min-w-0 p-4 sm:p-5">
                  <SectionHeader
                    title="QA / Security Hardening"
                    description={`${state.qaSecurityHardening.evidenceCount || 0} final hardening rows before Apex OS is treated as complete.`}
                    action={<ToneBadge tone={state.qaSecurityHardening.tone}>{state.qaSecurityHardening.status}</ToneBadge>}
                  />
                  <div className="grid min-w-0 gap-3 lg:grid-cols-2">
                    {state.qaSecurityHardening.evidenceRows.map((item) => <StatusRow key={item.id} item={item} />)}
                  </div>
                </Card>

                <Card className="min-w-0 p-4 sm:p-5">
                  <SectionHeader title="Hardening Locks" description={`${state.qaSecurityHardening.lockCount || 0} action classes stay approval-locked.`} />
                  <div className="grid min-w-0 gap-3">
                    {state.qaSecurityHardening.lockRows.map((item) => <StatusRow key={item.id} item={item} />)}
                  </div>
                </Card>
              </section>
            ),
          },
          {
            id: "audit",
            label: "Audit",
            helper: "Proof sources",
            icon: "clipboard",
            content: (
              <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                <Card className="min-w-0 p-4 sm:p-5">
                  <SectionHeader title="Completion Audit" description="What has to be proven before the active Apex OS goal can be closed." />
                  <div className="grid min-w-0 gap-3">
                    <StatusRow item={{
                      id: "completion-local",
                      title: "Local completion",
                      status: state.qaSecurityHardening.status,
                      detail: "Phase 17 completion depends on current role tests, route checks, no-secrets proof, source citations, visual QA, production smoke evidence, and docs drift checks.",
                      tone: state.qaSecurityHardening.tone,
                    }} />
                    <StatusRow item={{
                      id: "completion-production",
                      title: "Production / provider boundary",
                      status: "Approval required",
                      detail: "Deploys and rollbacks stay outside the UI and use backup-first manual release evidence; provider setup, live sends, customer-visible changes, and production mutations remain approval-locked.",
                      tone: "amber",
                    }} />
                  </div>
                </Card>

                <Card className="min-w-0 p-4 sm:p-5">
                  <SectionHeader title="Security Proof Sources" description="The private surfaces feeding this hardening pass." />
                  <div className="grid min-w-0 gap-3 lg:grid-cols-2">
                    <StatusRow item={{
                      id: "proof-ask-apex",
                      title: "Ask Apex / Knowledge Vault",
                      status: "Private intake",
                      detail: "Chat, evidence, and vault intake stay private with no provider calls, embeddings, public publishing, or customer upload mixing.",
                      tone: "blue",
                    }} />
                    <StatusRow item={{
                      id: "proof-voice-approval",
                      title: "Voice / Approval Center",
                      status: "Review-only",
                      detail: "Voice can capture local transcripts, but risky spoken or clicked actions cannot execute without approval boundaries.",
                      tone: "amber",
                    }} />
                  </div>
                </Card>
              </section>
            ),
          },
        ]}
      />
    </ControlRoomCategoryShell>
  );
}

function ControlRoomPersonalSection({ state, sessionToken }) {
  return (
    <ControlRoomCategoryShell sectionId="personal" state={state}>
      <section className="grid min-w-0 gap-4">
        <Card className="min-w-0 p-4 sm:p-5">
          <SectionHeader
            title="Personal Operating Layer"
            description={`${state.personalOperatingLayer.preferenceCount || 0} preferences, ${state.personalOperatingLayer.workStyleCount || 0} work-style rows, and ${state.personalOperatingLayer.privacyLockCount || 0} privacy locks for John-only review.`}
            action={<ToneBadge tone={state.personalOperatingLayer.tone}>{state.personalOperatingLayer.status}</ToneBadge>}
          />
          <PersonalOperatingLayerPanel state={state} sessionToken={sessionToken} />
        </Card>
      </section>
    </ControlRoomCategoryShell>
  );
}

export function ApexControlRoomPage(props) {
  const state = deriveApexControlRoomState(props);
  const [askQuestion, setAskQuestion] = useState("");
  const [activeSection, setActiveSection] = useState("apex");
  const isApexSection = activeSection === "apex";

  return (
    <div className={`co-apex-control-room-page min-w-0 max-w-full pb-36 lg:pb-8 ${isApexSection ? "bg-slate-950" : "bg-slate-100"}`}>
      {isApexSection ? (
        <ApexImmersiveHeader state={state} />
      ) : (
        <PageHeader
          eyebrow="Apex OS"
          title="Apex Control Room"
          description={`Private Apex HQ operating center for ${state.operatorName}.`}
          actions={(
            <div className="flex min-w-0 flex-wrap gap-2">
              <ToneBadge tone={state.canView ? "green" : "red"}>{state.canView ? "Private operator" : "Restricted"}</ToneBadge>
              <ToneBadge tone="amber">No deploy</ToneBadge>
              <ToneBadge tone="slate">No provider changes</ToneBadge>
            </div>
          )}
        />
      )}

      <main className={`mx-auto flex w-full flex-col gap-4 ${isApexSection ? "max-w-none px-2 pt-2 sm:px-3" : "max-w-[1520px] px-4 sm:px-6"}`}>
        {isApexSection ? null : <ApexControlRoomSectionNav activeSection={activeSection} onChange={setActiveSection} variant="light" />}

        {activeSection === "overview" ? <ControlRoomOverviewSection state={state} /> : null}
        {activeSection === "apex" ? <ControlRoomApexSection state={state} activeSection={activeSection} onChange={setActiveSection} sessionToken={props.sessionToken} askQuestion={askQuestion} setAskQuestion={setAskQuestion} /> : null}
        {activeSection === "memory" ? <ControlRoomMemorySection state={state} sessionToken={props.sessionToken} /> : null}
        {activeSection === "agents" ? <ControlRoomAgentsSection state={state} sessionToken={props.sessionToken} onChange={setActiveSection} /> : null}
        {activeSection === "approvals" ? <ControlRoomApprovalsSection state={state} sessionToken={props.sessionToken} /> : null}
        {activeSection === "release" ? <ControlRoomReleaseSection state={state} sessionToken={props.sessionToken} /> : null}
        {activeSection === "business" ? <ControlRoomBusinessSection state={state} /> : null}
        {activeSection === "trust" ? <ControlRoomTrustSection state={state} /> : null}
        {activeSection === "personal" ? <ControlRoomPersonalSection state={state} sessionToken={props.sessionToken} /> : null}
      </main>
    </div>
  );
}
