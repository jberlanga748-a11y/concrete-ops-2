import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.mjs?url";

import {
  askApexOs,
  advanceApexOsAutonomyRunPrivateMove,
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
  getApexOsBackgroundStatus,
  getApexOsLocalProvidersStatus,
  getApexOsLocalVoiceStatus,
  listenApexOsNativeVoice,
  runApexOsBuilderFix,
  runApexOsTypedLiveTurnBenchmark,
  runApexOsBuilderUndo,
  runApexOsBuilderValidation,
  runApexOsBuildLoop,
  saveApexOsDailyBriefingSnapshot,
  saveApexOsLocalVoiceLiveTurnReceipt,
  speakApexOsLocalVoice,
  transcribeApexOsLocalVoice,
  transcribeApexOsVoice,
  updateApexOsLocalVoiceSelection,
  updateApexOsAgentControlRequest,
  updateApexOsAutonomyRun,
  updateApexOsMemory,
  updateApexOsApprovalPacket,
  updateApexOsExecutionHandoff,
} from "./api";
import { Badge, Button, Card, Icon, PageHeader, SectionHeader } from "./app-shell-components";
import {
  buildApexBuilderModeState,
  buildApexTalkToApexResponse,
  buildApexWhatChangedFeedState,
  buildReleaseDesk,
  deriveApexControlRoomState,
} from "./apex-control-room-utils";
import {
  buildApexOsAskApprovalPacketDraft,
  buildApexOsAskDecisionDraft,
  buildApexOsAskExecutionHandoffDraft,
} from "../shared/apexOsAsk.js";
import {
  APEX_OS_ASSISTANT_MODES,
  DEFAULT_APEX_OS_ASSISTANT_MODE_ID,
} from "../shared/apexOsAssistantModes.js";
import {
  redactApexOsMemoryText,
  summarizeApexOsLiveOperatorMemory,
} from "../shared/apexOsMemory.js";
import {
  advanceApexOsAutonomyRunPrivatePrep,
  buildApexOsAutonomyRunHeartbeat,
  buildApexOsAutonomyRunHandback,
  buildApexOsAutonomyRunNextPrivateMove,
  buildApexOsAutonomyRunProactiveCheckIn,
  buildApexOsAutonomyRunProactiveMemoryDraft,
  runApexOsAutonomyRunPrivateOperatorCycle,
  validateApexOsAutonomyRunPrivateProof,
} from "../shared/apexOsAutonomyRuns.js";
import { buildApexOsVoiceCommandReview } from "../shared/apexOsVoice.js";
import {
  APEX_OS_KNOWLEDGE_DATE_RANGE_VALUES,
  buildApexOsKnowledgeIntelligence,
} from "../shared/apexOsKnowledgeIntelligence.js";
import {
  buildApexPersonalOsCoreState,
  buildApexPersonalOsLocalVoiceReadiness,
} from "../shared/apexPersonalOsCore.js";
import {
  APEX_ALWAYS_OPEN_MIC_STATE,
  buildApexAlwaysOpenMicReceipt,
  buildApexAlwaysOpenMicStatus,
  buildApexAlwaysOpenMicTranscriptionGate,
} from "../shared/apexAlwaysOpenMicRuntime.js";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

function ToneBadge({ children, tone = "slate" }) {
  return <Badge tone={tone}>{children}</Badge>;
}

function resolveApexPrivateOperatorDisplayName(operatorName = "") {
  const trimmed = String(operatorName || "").trim();
  if (!trimmed || /\b(demo admin|demo user|demo operator|restricted user)\b/i.test(trimmed)) return "John";
  if (/\b(jordan berl|josh berlanga|josh)\b/i.test(trimmed)) return "John";
  if (/john berlanga/i.test(trimmed)) return "John";
  return trimmed;
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

function speakWithBrowserVoice(text, { onStart, onEnd, onError, rate = 0.98, pitch = 1, voiceHint = "" } = {}) {
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
  utterance.onstart = () => onStart?.();
  utterance.onend = () => onEnd?.();
  utterance.onerror = () => onError?.();
  window.speechSynthesis.cancel();
  if (typeof window.speechSynthesis.resume === "function") {
    window.speechSynthesis.resume();
  }
  try {
    window.speechSynthesis.speak(utterance);
  } catch {
    onError?.();
    return false;
  }
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

function writeAscii(view, offset, value) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}

function readAscii(view, offset, length) {
  let value = "";
  for (let index = 0; index < length; index += 1) {
    value += String.fromCharCode(view.getUint8(offset + index));
  }
  return value;
}

function readApexCockpitWavMetadata(buffer) {
  if (!buffer || buffer.byteLength < 44) return { wavHeaderValid: false };
  const view = new DataView(buffer);
  const riff = readAscii(view, 0, 4);
  const wave = readAscii(view, 8, 4);
  const dataSize = view.getUint32(40, true);
  const sampleRate = view.getUint32(24, true);
  const channelCount = view.getUint16(22, true);
  const bitDepth = view.getUint16(34, true);
  const bytesPerSecond = view.getUint32(28, true);
  const durationEstimateMs = bytesPerSecond ? Math.round((dataSize / bytesPerSecond) * 1000) : 0;
  return {
    wavHeaderValid: riff === "RIFF" && wave === "WAVE",
    sampleRate,
    channelCount,
    bitDepth,
    durationEstimateMs,
    encoding: "pcm_s16le",
  };
}

function readMixedAudioSample(audioBuffer, sourcePosition, channelCount) {
  const lowerFrame = Math.max(0, Math.min(audioBuffer.length - 1, Math.floor(sourcePosition)));
  const upperFrame = Math.max(0, Math.min(audioBuffer.length - 1, lowerFrame + 1));
  const mix = sourcePosition - lowerFrame;
  let sample = 0;
  for (let channel = 0; channel < channelCount; channel += 1) {
    const channelData = audioBuffer.getChannelData(channel);
    const lowerValue = channelData[lowerFrame] || 0;
    const upperValue = channelData[upperFrame] || lowerValue;
    sample += lowerValue + ((upperValue - lowerValue) * mix);
  }
  return sample / channelCount;
}

function mergeApexCockpitPcmChunks(chunks = []) {
  const safeChunks = Array.isArray(chunks) ? chunks.filter((chunk) => chunk?.length) : [];
  const totalLength = safeChunks.reduce((sum, chunk) => sum + chunk.length, 0);
  if (!totalLength) return new Float32Array(0);
  const merged = new Float32Array(totalLength);
  let offset = 0;
  for (const chunk of safeChunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }
  return merged;
}

function encodeFloat32PcmToWav(samples, { sourceSampleRate = 16000, targetSampleRate = 16000 } = {}) {
  const sourceRate = Math.max(1, Math.round(sourceSampleRate || targetSampleRate || 16000));
  const outputSampleRate = Math.max(8000, Math.round(targetSampleRate || sourceRate));
  const sourceSamples = samples instanceof Float32Array ? samples : new Float32Array(0);
  const frameCount = Math.max(1, Math.round((sourceSamples.length * outputSampleRate) / sourceRate));
  const bytesPerSample = 2;
  const dataSize = frameCount * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, outputSampleRate, true);
  view.setUint32(28, outputSampleRate * bytesPerSample, true);
  view.setUint16(32, bytesPerSample, true);
  view.setUint16(34, 8 * bytesPerSample, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, dataSize, true);
  let offset = 44;
  for (let frame = 0; frame < frameCount; frame += 1) {
    const sourcePosition = (frame * sourceRate) / outputSampleRate;
    const lowerFrame = Math.max(0, Math.min(sourceSamples.length - 1, Math.floor(sourcePosition)));
    const upperFrame = Math.max(0, Math.min(sourceSamples.length - 1, lowerFrame + 1));
    const mix = sourcePosition - lowerFrame;
    const sample = (sourceSamples[lowerFrame] || 0) + (((sourceSamples[upperFrame] || sourceSamples[lowerFrame] || 0) - (sourceSamples[lowerFrame] || 0)) * mix);
    const clamped = Math.max(-1, Math.min(1, sample));
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
    offset += bytesPerSample;
  }
  return {
    buffer,
    metadata: {
      sourceSampleRate: sourceRate,
      sourceChannelCount: 1,
      sampleRate: outputSampleRate,
      channelCount: 1,
      bitDepth: 16,
      durationEstimateMs: Math.max(0, Math.round((frameCount / outputSampleRate) * 1000)),
      wavHeaderValid: true,
      encoding: "pcm_s16le",
    },
  };
}

function encodeAudioBufferToWav(audioBuffer, { targetSampleRate = 16000 } = {}) {
  const sourceSampleRate = Math.max(1, audioBuffer.sampleRate || targetSampleRate);
  const channelCount = Math.max(1, audioBuffer.numberOfChannels || 1);
  const outputSampleRate = Math.max(8000, Math.round(targetSampleRate || sourceSampleRate));
  const frameCount = Math.max(1, Math.round((audioBuffer.length * outputSampleRate) / sourceSampleRate));
  const bytesPerSample = 2;
  const dataSize = frameCount * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, outputSampleRate, true);
  view.setUint32(28, outputSampleRate * bytesPerSample, true);
  view.setUint16(32, bytesPerSample, true);
  view.setUint16(34, 8 * bytesPerSample, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, dataSize, true);
  let offset = 44;
  for (let frame = 0; frame < frameCount; frame += 1) {
    const sourcePosition = (frame * sourceSampleRate) / outputSampleRate;
    const sample = readMixedAudioSample(audioBuffer, sourcePosition, channelCount);
    const clamped = Math.max(-1, Math.min(1, sample));
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
    offset += bytesPerSample;
  }
  return {
    buffer,
    metadata: {
      sourceSampleRate,
      sourceChannelCount: channelCount,
      sampleRate: outputSampleRate,
      channelCount: 1,
      bitDepth: 16,
      durationEstimateMs: Math.max(0, Math.round((frameCount / outputSampleRate) * 1000)),
      wavHeaderValid: true,
      encoding: "pcm_s16le",
    },
  };
}

async function convertVoiceBlobToLocalWav(blob) {
  if (!blob?.size) {
    return {
      blob,
      metadata: {
        sourceMimeType: blob?.type || "",
        sourceByteLength: blob?.size || 0,
        convertedMimeType: blob?.type || "",
        convertedByteLength: blob?.size || 0,
        wavHeaderValid: false,
        failureReason: "empty-audio",
      },
    };
  }
  if (String(blob.type || "").toLowerCase() === "audio/wav") {
    const audioBytes = await blob.arrayBuffer();
    const wavMetadata = readApexCockpitWavMetadata(audioBytes);
    if (wavMetadata.wavHeaderValid) {
      return {
        blob,
        metadata: {
          ...wavMetadata,
          sourceMimeType: blob.type || "audio/wav",
          sourceByteLength: blob.size || 0,
          convertedMimeType: "audio/wav",
          convertedByteLength: blob.size || 0,
          readyForTranscription: true,
          captureProvider: "browser-pcm",
        },
      };
    }
  }
  if (typeof window === "undefined") throw new Error("Browser audio conversion is unavailable.");
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextCtor) {
    throw new Error("This browser cannot convert microphone audio to WAV for local STT.");
  }
  const context = new AudioContextCtor();
  try {
    const audioBuffer = await context.decodeAudioData(await blob.arrayBuffer());
    const encoded = encodeAudioBufferToWav(audioBuffer, { targetSampleRate: 16000 });
    const wavBlob = new Blob([encoded.buffer], { type: "audio/wav" });
    return {
      blob: wavBlob,
      metadata: {
        ...encoded.metadata,
        sourceMimeType: blob.type || "",
        sourceByteLength: blob.size || 0,
        convertedMimeType: wavBlob.type || "audio/wav",
        convertedByteLength: wavBlob.size || 0,
        readyForTranscription: true,
      },
    };
  } catch (error) {
    return {
      blob,
      metadata: {
        sourceMimeType: blob.type || "",
        sourceByteLength: blob.size || 0,
        convertedMimeType: blob.type || "",
        convertedByteLength: blob.size || 0,
        wavHeaderValid: false,
        browserWavConversionFailed: true,
        clientConversionFailureReason: "wav-conversion-failed",
        clientConversionFailureMessage: String(error?.message || "Browser could not decode microphone audio.").slice(0, 180),
        fallbackMode: "client-wav-required",
        readyForTranscription: false,
      },
    };
  } finally {
    if (typeof context.close === "function") {
      try {
        await context.close();
      } catch {
        // Closing AudioContext is best effort.
      }
    }
  }
}

function getApexCockpitSpeechRecognitionCtor() {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function buildApexCockpitVoiceHealth({
  canUseRecorder = false,
  canUseNativeVoice = false,
  canUseSpeechRecognition = false,
  micPermissionState = "unknown",
  wakeAttempted = false,
  recording = false,
  autoListening = false,
  speaking = false,
  transcribing = false,
  submitting = false,
  recognitionStatus = "standby",
  recognitionError = "",
  needsWake = false,
  audioUnlocked = false,
  conversationMode = true,
  bargeInEnabled = true,
  retryCount = 0,
  retryReason = "",
  alwaysOpenMic = null,
  localVoiceReadiness = null,
  backgroundStatus = null,
  micCalibration = null,
} = {}) {
  const micRuntimeState = String(alwaysOpenMic?.state || (autoListening ? "standby" : "quiet"));
  const backgroundRuntimeStatus = String(backgroundStatus?.status || "unknown");
  const vadProvider = String(alwaysOpenMic?.vadProvider || "amplitude-gate");
  const micCal = createApexCockpitMicCalibrationState(micCalibration || {});
  const micCaptureProvider = micCal.captureProvider || "none";
  const micFrameCount = Number(micCal.frameCount || 0);
  const micSignalLive = micCal.status === "signal" || micCal.signalDetected === true;
  const sttLabel = localVoiceReadiness?.sttEngine
    ? `${localVoiceReadiness.sttEngine}${localVoiceReadiness.sttProcessor ? ` / ${localVoiceReadiness.sttProcessor}` : ""}`
    : "faster-whisper CUDA / GPU";
  const ttsLabel = APEX_COCKPIT_USE_FAST_SIMPLE_VOICE
    ? "Windows SAPI fast test"
    : localVoiceReadiness?.usingLightweightVoice
    ? `Kokoro ONNX${localVoiceReadiness.lightweightVoiceId ? ` / ${localVoiceReadiness.lightweightVoiceId}` : ""}`
    : localVoiceReadiness?.ttsEngine || "Kokoro ONNX / am_michael";
  const hasLocalVoiceInput = canUseRecorder || canUseNativeVoice;
  const browserMicBlocked = micPermissionState === "denied";
  const hardMicBlock = (browserMicBlocked && !canUseNativeVoice) || (recognitionStatus === "blocked" && !canUseNativeVoice);
  const captionRecovering = recognitionStatus === "recovering";
  const captionLimited = recognitionStatus === "limited" || Boolean(recognitionError);
  const captionLive = recording && ["captioning", "interim"].includes(recognitionStatus);
  const voiceRetryCount = Number(retryCount || 0);
  const retryDetail = retryReason || "Apex missed the last voice turn";
  let status = "Voice ready";
  let tone = "blue";
  let actionLabel = "Start voice";
  let notice = "Apex is trying to keep the visible page microphone open for natural turns.";

  if (!hasLocalVoiceInput) {
    status = "Voice unavailable";
    tone = "red";
    actionLabel = "Use text";
    notice = "No local microphone input is ready here. Type the request while Apex checks voice.";
  } else if (speaking) {
    status = "Talking";
    tone = "amber";
    actionLabel = bargeInEnabled ? "Interrupt voice" : "Wait";
    notice = bargeInEnabled ? "Apex is speaking and can be interrupted." : "Apex is speaking; barge-in is off.";
  } else if (transcribing || submitting) {
    status = "Processing";
    tone = "blue";
    actionLabel = "Hold";
    notice = transcribing ? "Apex is reading your voice through local transcription." : "Apex is reading private context for the answer.";
  } else if (browserMicBlocked && canUseNativeVoice) {
    status = autoListening ? "Native mic ready" : "Voice ready";
    tone = autoListening ? "green" : "blue";
    actionLabel = autoListening ? "Speak naturally" : "Resume Voice";
    notice = "Browser mic permission is blocked, so Apex is using the visible native Windows mic path locally.";
  } else if (hardMicBlock) {
    status = "Mic blocked";
    tone = "red";
    actionLabel = "Allow mic";
    notice = "Microphone or browser captions are blocked. Allow microphone access, then recover voice.";
  } else if (needsWake && !wakeAttempted) {
    status = "Needs mic permission";
    tone = "amber";
    actionLabel = "Allow mic";
    notice = "Choose Allow when the browser asks for microphone access on this visible Apex page.";
  } else if (captionRecovering) {
    status = "Recovering captions";
    tone = "amber";
    actionLabel = "Recover Voice";
    notice = "Browser captions are reconnecting; the recorder stays live with server transcription fallback.";
  } else if (captionLive) {
    status = "Hearing live";
    tone = "green";
    actionLabel = "Speak naturally";
    notice = "Voice health is green. Apex is listening, captioning, and ready for interruption.";
  } else if (recording && micSignalLive) {
    status = "Mic signal live";
    tone = "green";
    actionLabel = "Speak naturally";
    notice = `Apex sees microphone signal through ${micCaptureProvider}. Gate ${formatApexCockpitMicPercent(micCal.calibratedLevelThreshold)}; peak ${formatApexCockpitMicPercent(micCal.peakLevel)}.`;
  } else if (recording && micFrameCount > 0 && micCal.status === "calibrating") {
    status = "Calibrating mic";
    tone = "blue";
    actionLabel = "Speak normally";
    notice = "Apex is measuring local mic frames, room noise, and the speech gate.";
  } else if (recording && micFrameCount > 0) {
    status = "Mic frames live";
    tone = "amber";
    actionLabel = "Speak closer";
    notice = `Mic frames are arriving through ${micCaptureProvider}, but speech has not crossed the gate yet.`;
  } else if (voiceRetryCount && recording) {
    status = "Manual voice active";
    tone = "green";
    actionLabel = "Done Talking";
    notice = `${retryDetail}. Apex is in one visible voice turn and will pause when it settles.`;
  } else if (recording && captionLimited) {
    status = "Recorder live";
    tone = "amber";
    actionLabel = "Recover Voice";
    notice = "Browser captions are limited; Apex keeps the recorder live with server transcription fallback.";
  } else if (recording) {
    status = "Listening";
    tone = "green";
    actionLabel = "Speak";
    notice = "Apex is listening on this visible page.";
  } else if (autoListening && conversationMode) {
    status = voiceRetryCount ? "Retry ready" : "Standing by";
    tone = voiceRetryCount ? "amber" : "green";
    actionLabel = voiceRetryCount ? "Speak again" : "Resume Voice";
    notice = voiceRetryCount
      ? `${retryDetail}. Apex is ready to reopen listening from the visible control.`
      : "Open voice is standing by and can resume from the visible control.";
  }

  const captionValue = !canUseSpeechRecognition
    ? "Server fallback"
    : recognitionStatus === "captioning"
      ? "Live"
      : recognitionStatus === "interim"
        ? "Capturing"
        : recognitionStatus === "recovering"
          ? "Recovering"
          : recognitionStatus === "blocked"
            ? "Blocked"
            : recognitionStatus === "limited"
              ? "Limited"
              : "Ready";

  return {
    status,
    tone,
    actionLabel,
    notice,
    rows: [
      {
        label: "Mic",
        value: !canUseRecorder ? "Unavailable" : hardMicBlock ? "Blocked" : recording ? "Open" : needsWake ? "Allow" : "Ready",
        tone: !canUseRecorder || hardMicBlock ? "red" : recording ? "green" : needsWake ? "amber" : "blue",
      },
      {
        label: "Mode",
        value: micRuntimeState,
        tone: micRuntimeState === "quiet" ? "slate" : micRuntimeState === "recovering" || micRuntimeState === "speaking" ? "amber" : micRuntimeState === "capturing" ? "green" : "blue",
      },
      {
        label: "Runtime",
        value: backgroundRuntimeStatus,
        tone: backgroundRuntimeStatus === "healthy" ? "green" : backgroundRuntimeStatus === "degraded" ? "amber" : "blue",
      },
      {
        label: "VAD",
        value: micCal.calibratedLevelThreshold ? `Gate ${formatApexCockpitMicPercent(micCal.calibratedLevelThreshold)}` : vadProvider,
        tone: "green",
      },
      {
        label: "Capture",
        value: micCaptureProvider,
        tone: micCal.audioWorkletActive ? "green" : micCal.fallbackCaptureUsed ? "amber" : micCaptureProvider === "none" ? "slate" : "blue",
      },
      {
        label: "Signal",
        value: micFrameCount ? `${formatApexCockpitMicPercent(micCal.peakLevel)} peak` : "No frames",
        tone: micSignalLive ? "green" : micFrameCount ? "amber" : "slate",
      },
      {
        label: "STT",
        value: sttLabel,
        tone: localVoiceReadiness?.sttProcessor === "gpu" || /gpu|cuda/i.test(sttLabel) ? "green" : "amber",
      },
      {
        label: "TTS",
        value: ttsLabel,
        tone: localVoiceReadiness?.usingLightweightVoice ? "green" : "amber",
      },
      {
        label: "Cloud",
        value: "Off",
        tone: "green",
      },
      {
        label: "Captions",
        value: captionValue,
        tone: recognitionStatus === "blocked" ? "red" : captionLimited || captionRecovering ? "amber" : captionLive ? "green" : "blue",
      },
      {
        label: "Speaker",
        value: speaking ? "Talking" : audioUnlocked ? "Unlocked" : needsWake ? "Allow" : "Ready",
        tone: speaking ? "amber" : audioUnlocked ? "green" : needsWake ? "amber" : "blue",
      },
      {
        label: "Recovery",
        value: actionLabel,
        tone,
      },
      {
        label: "Retry",
        value: voiceRetryCount ? `${voiceRetryCount} reopened` : "Ready",
        tone: voiceRetryCount ? "amber" : "green",
      },
    ],
  };
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

function ApexActivityReceiptRow({ item }) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-[0_12px_34px_-32px_rgba(15,23,42,0.8)]">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="break-words text-[10px] font-black uppercase tracking-[0.14em] text-orange-700">{item.actionLabel || "Apex internal action"}</p>
          <p className="mt-1 break-words text-sm font-black text-slate-950">{item.reason || "Apex OS internal action evaluated."}</p>
          <div className="mt-2 flex min-w-0 flex-wrap gap-2">
            <span className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-black text-slate-600">{item.affectedRecordType || "internal record"}</span>
            {item.affectedRecordId ? <span className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-black text-slate-600">{item.affectedRecordId}</span> : null}
            {item.timestamp ? <span className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-black text-slate-600">{item.timestamp}</span> : null}
          </div>
          <p className="mt-2 break-words text-[11px] font-bold leading-4 text-slate-500">{item.undoHint || "Archive, edit, or reset the private record where supported."}</p>
        </div>
        <ToneBadge tone={item.tone || "slate"}>{item.statusLabel || item.status || "Recorded"}</ToneBadge>
      </div>
    </div>
  );
}

function ApexActivityReceiptsPanel({ state }) {
  const activity = state.apexActivity || {};
  if (activity.loading) {
    return <EmptyPanel>Loading recent Apex internal action receipts.</EmptyPanel>;
  }
  if (activity.error) {
    return <EmptyPanel>{activity.error}</EmptyPanel>;
  }
  return (
    <div className="grid min-w-0 gap-3">
      <div className="grid min-w-0 gap-2 rounded-xl border border-orange-200 bg-orange-50 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div className="min-w-0">
          <p className="break-words text-sm font-black text-orange-950">{activity.summaryText || "Recent Level 2 receipts are shown here."}</p>
          <p className="mt-1 break-words text-xs font-bold leading-5 text-orange-800">External actions remain locked: no sends, spend, orders, bookings, desktop/browser/music control, deploys, schema/auth changes, or customer-visible work.</p>
        </div>
        <div className="flex min-w-0 flex-wrap gap-2 sm:justify-end">
          <ToneBadge tone={activity.performedCount ? "green" : "slate"}>{activity.performedCount || 0} done</ToneBadge>
          <ToneBadge tone={activity.blockedCount ? "red" : "slate"}>{activity.blockedCount || 0} stopped</ToneBadge>
          <ToneBadge tone={activity.escalatedCount ? "amber" : "slate"}>{activity.escalatedCount || 0} review</ToneBadge>
        </div>
      </div>

      {activity.rows?.length ? (
        <div className="grid min-w-0 gap-3">
          {activity.rows.map((item) => <ApexActivityReceiptRow key={item.id} item={item} />)}
        </div>
      ) : (
        <EmptyPanel>No Apex Level 2 internal action receipts are visible yet. When Apex saves a private task, reminder, memory suggestion, preference, planning note, or research note, the receipt will appear here.</EmptyPanel>
      )}
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

function findOllamaStatusPayload(payload = {}) {
  if (payload?.localProviders?.ollama) return payload.localProviders.ollama;
  if (payload?.localProviders?.legacyFallbackProvider?.provider === "ollama") return payload.localProviders.legacyFallbackProvider;
  if (Array.isArray(payload?.providers)) {
    return payload.providers.find((provider) => String(provider?.provider || "").toLowerCase() === "ollama") || {};
  }
  return {};
}

function findLlamaCppStatusPayload(payload = {}) {
  if (payload?.localProviders?.llamaCpp) return payload.localProviders.llamaCpp;
  if (payload?.localProviders?.primaryProvider?.provider === "llama.cpp") return payload.localProviders.primaryProvider;
  if (payload?.primaryProvider?.provider === "llama.cpp") return payload.primaryProvider;
  if (Array.isArray(payload?.providers)) {
    return payload.providers.find((provider) => String(provider?.provider || "").toLowerCase() === "llama.cpp") || {};
  }
  if (String(payload?.provider || "").toLowerCase() === "llama.cpp") return payload;
  return {};
}

function findGpuStatusPayload(payload = {}) {
  if (payload?.localProviders?.gpu) return payload.localProviders.gpu;
  if (payload?.gpu) return payload.gpu;
  if (payload?.speedCore?.gpu) return payload.speedCore.gpu;
  return {};
}

function findBrainStatusPayload(payload = {}) {
  if (payload?.brain?.provider === "apex-workstation-brain") return payload.brain;
  if (payload?.background?.brain?.provider === "apex-workstation-brain") return payload.background.brain;
  if (payload?.localProviders?.brain?.provider === "apex-workstation-brain") return payload.localProviders.brain;
  return {};
}

function findAgentSpeedPayload(payload = {}) {
  if (payload?.agentSpeed?.provider === "apex-local-agent-speed") return payload.agentSpeed;
  if (payload?.background?.agentSpeed?.provider === "apex-local-agent-speed") return payload.background.agentSpeed;
  if (payload?.localProviders?.agentSpeed?.provider === "apex-local-agent-speed") return payload.localProviders.agentSpeed;
  return {};
}

const APEX_LOCAL_TALK_MODEL = "gpt-oss:20b";
const APEX_LOCAL_OLLAMA_FALLBACK_MODEL = "qwen3:14b";
const APEX_LOCAL_FAST_CODER_MODEL = "qwen2.5-coder:7b";
const APEX_LOCAL_DEEP_CODING_MODEL = "qwen3-coder:30b";
const APEX_LOCAL_REASONING_MODEL = "gpt-oss:20b";
const APEX_LOCAL_MOE_MODEL = "qwen3:30b-a3b";
const APEX_LOCAL_CODER_MODEL = "qwen3-coder:30b-a3b-q4_K_M";
const APEX_LOCAL_CODING_MODEL = APEX_LOCAL_DEEP_CODING_MODEL;
const APEX_LOCAL_EFFORT_OPTIONS = Object.freeze([
  Object.freeze({ id: "auto", label: "Auto", model: APEX_LOCAL_TALK_MODEL, numCtx: 4096, manualOnly: false, output: "adaptive" }),
  Object.freeze({ id: "fast", label: "Fast", model: APEX_LOCAL_TALK_MODEL, numCtx: 4096, manualOnly: false, output: "short" }),
  Object.freeze({ id: "normal", label: "Normal", model: APEX_LOCAL_TALK_MODEL, numCtx: 4096, manualOnly: false, output: "full" }),
  Object.freeze({ id: "reasoning", label: "Reasoning", model: APEX_LOCAL_REASONING_MODEL, numCtx: 8192, manualOnly: true, output: "reason" }),
  Object.freeze({ id: "moe", label: "MoE", model: APEX_LOCAL_MOE_MODEL, numCtx: 8192, manualOnly: true, output: "wide" }),
  Object.freeze({ id: "coder", label: "Coder", model: APEX_LOCAL_CODER_MODEL, numCtx: 8192, manualOnly: true, output: "code" }),
  Object.freeze({ id: "deep", label: "Deep", model: APEX_LOCAL_REASONING_MODEL, numCtx: 8192, manualOnly: true, output: "best" }),
]);

function hasApexLocalModel(modelNames = [], model = "") {
  const target = String(model || "").trim().toLowerCase();
  return (Array.isArray(modelNames) ? modelNames : [])
    .some((name) => String(name || "").trim().toLowerCase() === target);
}

function apexLocalModelStatusLabel(available, known) {
  if (available) return "Ready";
  return known ? "Missing" : "Checking";
}

function normalizeApexCockpitEffortId(value = "", fallback = "auto") {
  const normalized = String(value || "").trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
  return APEX_LOCAL_EFFORT_OPTIONS.some((option) => option.id === normalized) ? normalized : fallback;
}

function apexCockpitEffortOption(value = "") {
  const effortId = normalizeApexCockpitEffortId(value);
  return APEX_LOCAL_EFFORT_OPTIONS.find((option) => option.id === effortId) || APEX_LOCAL_EFFORT_OPTIONS[0];
}

function buildApexLocalIntelligenceStatus({ response = null, providerStatusPayload = null, selectedEffort = "auto" } = {}) {
  const answer = response?.answer && typeof response.answer === "object" ? response.answer : {};
  const responseStatus = response?.context?.localProviderStatus || {};
  const primaryStatusFromPayload = findLlamaCppStatusPayload(providerStatusPayload || {});
  const providerStatus = String(responseStatus.provider || "").toLowerCase() === "llama.cpp"
    ? responseStatus
    : primaryStatusFromPayload;
  const legacyOllamaStatus = findOllamaStatusPayload(providerStatusPayload || {});
  const gpuStatus = findGpuStatusPayload(providerStatusPayload || {});
  const brainStatus = answer.brainStatus || answer.brainTelemetry || findBrainStatusPayload(providerStatusPayload || {});
  const responseAgentSpeed = answer.agentSpeed || answer.benchmarkReceipt || responseStatus.agentSpeed || findAgentSpeedPayload(providerStatusPayload || {});
  const benchmarkReceipt = answer.benchmarkReceipt || responseStatus.benchmarkReceipt || (responseAgentSpeed.receiptType === "local-agent-benchmark" ? responseAgentSpeed : {});
  const benchmarkHistory = answer.benchmarkHistory
    || responseStatus.benchmarkHistory
    || providerStatusPayload?.agentSpeedBenchmarkHistory
    || providerStatusPayload?.background?.agentSpeedBenchmarkHistory
    || providerStatusPayload?.localIntelligence?.benchmarkHistory
    || {};
  const residencyStatus = providerStatusPayload?.residency
    || providerStatusPayload?.localProviders?.residency
    || providerStatusPayload?.background?.residency
    || answer.residency
    || responseStatus.residency
    || {};
  const modelProcessor = answer.modelProcessor || responseStatus.modelProcessor || providerStatus.modelProcessor || {};
  const provider = answer.provider || responseStatus.provider || providerStatus.provider || "llama.cpp";
  const providerLabel = String(provider || "llama.cpp").toLowerCase() === "ollama" ? "Ollama" : String(provider || "llama.cpp");
  const selectedModel = answer.model || responseStatus.selectedModel || providerStatus.selectedModel || providerStatus.loadedModel?.model || APEX_LOCAL_TALK_MODEL;
  const selectedEffortId = normalizeApexCockpitEffortId(selectedEffort);
  const effortOption = apexCockpitEffortOption(answer.agentEffort || answer.effort || responseStatus.selectedEffort || responseAgentSpeed.effortId || benchmarkReceipt?.effortId || selectedEffortId);
  const effortId = effortOption.id;
  const effortLabel = answer.agentEffortLabel || responseStatus.effortLabel || responseAgentSpeed.effortLabel || benchmarkReceipt?.effortLabel || effortOption.label;
  const effortModel = responseAgentSpeed.modelId || answer.effortModel || benchmarkReceipt?.modelUsed || effortOption.model;
  const effortNumCtx = Number(answer.effortNumCtx || responseAgentSpeed.numCtx || benchmarkReceipt?.numCtx || effortOption.numCtx) || effortOption.numCtx;
  const deepModelActive = String(selectedModel).toLowerCase() === APEX_LOCAL_DEEP_CODING_MODEL;
  const agentLaneId = String(responseAgentSpeed.laneId || responseStatus.agentSpeedLane || answer.agentSpeedLane || (deepModelActive ? "deep" : "fast")).toLowerCase();
  const agentLaneLabel = responseAgentSpeed.laneLabel || responseStatus.agentSpeedLabel || answer.agentSpeedLabel || (agentLaneId === "coding" ? "Coding" : agentLaneId === "deep" ? "Deep coding" : "Fast");
  const agentNumCtx = Number(responseAgentSpeed.numCtx || benchmarkReceipt?.numCtx || 2048) || 2048;
  const agentKeepAlive = responseAgentSpeed.keepAlive || benchmarkReceipt?.keepAlive || (agentLaneId === "fast" || agentLaneId === "coding" ? "30m" : "5m");
  const activeBrainMode = String(brainStatus.activeMode || answer.brainMode || "speed").toLowerCase();
  const brainModel = brainStatus.modelId || answer.model || selectedModel;
  const brainNumCtx = Number(brainStatus.numCtx || residencyStatus.activeLaneNumCtx || agentNumCtx || 2048) || 2048;
  const residencyNumCtx = Number(residencyStatus.numCtx || 0) || 0;
  const brainVramUsedMb = Number(residencyStatus.vramUsedMb || brainStatus.vramUsedMb || answer.vramUsedMb || modelProcessor.vramUsedMb || 0) || 0;
  const brainVramTotalMb = Number(brainStatus.vramTotalMb || gpuStatus.vramTotalMb || 0) || 0;
  const brainReloadNeeded = Boolean(residencyStatus.reloadNeeded || residencyStatus.contextExceedsActiveLane || residencyStatus.contextTooLarge);
  const modelNames = Array.isArray(responseStatus.modelNames) ? responseStatus.modelNames : Array.isArray(providerStatus.modelNames) ? providerStatus.modelNames : [];
  const hasModelData = modelNames.length > 0;
  const selectedModelAvailable = Boolean(responseStatus.selectedModelAvailable ?? (modelNames.length ? modelNames.some((model) => String(model).toLowerCase() === String(selectedModel).toLowerCase()) : providerStatus.available));
  const talkModelAvailable = hasApexLocalModel(modelNames, APEX_LOCAL_TALK_MODEL) || (String(selectedModel).toLowerCase() === APEX_LOCAL_TALK_MODEL && selectedModelAvailable);
  const codingModelAvailable = hasApexLocalModel(modelNames, APEX_LOCAL_CODING_MODEL) || (String(selectedModel).toLowerCase() === APEX_LOCAL_CODING_MODEL && selectedModelAvailable);
  const fastCoderModelAvailable = hasApexLocalModel(modelNames, APEX_LOCAL_FAST_CODER_MODEL);
  const effortModelAvailable = hasApexLocalModel(modelNames, effortOption.model) || (String(selectedModel).toLowerCase() === String(effortOption.model).toLowerCase() && selectedModelAvailable);
  const providerAvailable = Boolean(responseStatus.available ?? providerStatus.available);
  const cloudDecision = response?.context?.localFirstProviderPolicy?.decision || "block-cloud";
  const openAiUsed = /openai/i.test(String(answer.provider || answer.mode || ""));
  const localOllamaUsed = /ollama/i.test(String(answer.provider || answer.mode || provider));
  const localLlamaCppUsed = /llama\.cpp|llama-cpp/i.test(String(answer.provider || answer.mode || provider));
  const fallback = Boolean(answer.providerFallback);
  const processor = String(modelProcessor.processor || answer.processor || responseStatus.processor || "unknown").toLowerCase();
  const gpuAvailable = Boolean(gpuStatus.available);
  const gpuLabel = gpuAvailable
    ? processor === "gpu" || processor === "mixed"
      ? processor === "mixed" ? "GPU mixed" : "GPU active"
      : "GPU ready"
    : "GPU checking";
  const processorLine = processor && processor !== "unknown"
    ? ` Processor: ${processor}${modelProcessor.vramUsedMb ? `, ${modelProcessor.vramUsedMb} MB VRAM` : ""}.`
    : gpuAvailable
      ? " GPU is detected; the next model turn will receipt actual GPU/CPU use."
      : "";
  const brainOutputCap = Number(brainStatus.maxOutputTokens || answer.brainProfile?.maxOutputTokens || answer.brainTelemetry?.maxOutputTokens || 0) || 0;
  const brainLine = ` Brain: ${activeBrainMode} on ${brainModel}, ctx ${brainNumCtx}${residencyNumCtx ? `, resident ctx ${residencyNumCtx}` : ""}${brainStatus.speedLane && brainOutputCap ? `, speed cap ${brainOutputCap}` : ""}, threshold ${brainReloadNeeded ? "reload-needed" : brainStatus.thresholdStatus || "stable"}.`;
  const thirtyBActive = agentLaneId === "deep" || deepModelActive;
  const timingMs = Number(benchmarkReceipt.totalDurationMs || answer.responseTimingMs || responseStatus.responseTimingMs || 0) || 0;
  const timingLabel = timingMs ? `${Math.round(timingMs)} ms` : "waiting for turn";
  const lastBenchmarkMs = Number(benchmarkHistory.latest?.totalDurationMs || 0) || 0;
  const lastBenchmarkLabel = lastBenchmarkMs
    ? `${Math.round(lastBenchmarkMs)} ms`
    : benchmarkHistory.status === "ready" && benchmarkHistory.averageTotalDurationMs
      ? `avg ${Math.round(Number(benchmarkHistory.averageTotalDurationMs || 0))} ms`
      : "not run";
  const warmStatus = providerStatusPayload?.background?.keepWarm || providerStatusPayload?.keepWarm || {};
  const warmLabel = warmStatus.enabled
    ? `${warmStatus.targetModel || APEX_LOCAL_TALK_MODEL} / ctx ${warmStatus.lastReceipt?.targetNumCtx || residencyStatus.activeLaneNumCtx || agentNumCtx} / warm`
    : "off";
  const receivingActive = Boolean(brainStatus.queue?.active || providerStatusPayload?.background?.brain?.queue?.active);
  const adaptiveNotes = benchmarkReceipt.adaptiveLaneNotes || answer.adaptiveLaneNotes || responseStatus.adaptiveLaneNotes || {};
  const adaptiveLine = adaptiveNotes.deepLaneSuggested
    ? " Adaptive note: manual 30B deep lane may be worth trying next; Apex will not auto-promote."
    : adaptiveNotes.timingObserved
      ? " Adaptive note: current lane looks sufficient."
      : "";
  const effortLine = ` Effort: ${effortLabel} on ${effortModel}, ctx ${effortNumCtx}, ${effortOption.manualOnly ? "manual-only" : "resident"}, installed ${apexLocalModelStatusLabel(effortModelAvailable, hasModelData || selectedModelAvailable)}.`;
  const agentLine = ` Lane: ${agentLaneLabel} on ${selectedModel}, ctx ${agentNumCtx}, keep-alive ${agentKeepAlive}; warm ${warmLabel}; 30B is ${thirtyBActive ? "active for this manual deep turn" : "idle/manual-only"}. Timing: ${timingLabel}. Last benchmark: ${lastBenchmarkLabel}.${receivingActive ? " Apex is receiving a local model response now." : ""}${adaptiveLine}${effortLine}`;
  const status = (localOllamaUsed || localLlamaCppUsed) && !fallback
    ? "Answering locally"
    : providerAvailable && selectedModelAvailable
      ? "Local ready"
      : providerAvailable
        ? "Model check"
        : providerStatusPayload
          ? "llama.cpp offline"
          : "Local-first";
  const tone = openAiUsed ? "amber" : localOllamaUsed || localLlamaCppUsed || selectedModelAvailable ? "green" : providerAvailable ? "blue" : "amber";
  const summary = openAiUsed
      ? "This answer used a cloud override. Everyday Apex remains local-first and cloud-disabled by default."
    : fallback
      ? `${providerLabel} stayed local-first, but this turn used a deterministic local fallback. OpenAI was not used.`
    : localOllamaUsed
        ? `Ollama answered this legacy fallback turn on the ${agentLaneLabel} lane with ${selectedModel}. Primary chat/coding is llama.cpp/${APEX_LOCAL_TALK_MODEL}; ${APEX_LOCAL_DEEP_CODING_MODEL} is manual-only. OpenAI was not used.`
        : `${providerLabel} is the primary local provider. ${APEX_LOCAL_TALK_MODEL}: ${apexLocalModelStatusLabel(talkModelAvailable, hasModelData || selectedModelAvailable)}. Ollama fallback ${APEX_LOCAL_OLLAMA_FALLBACK_MODEL}: ${apexLocalModelStatusLabel(hasApexLocalModel(legacyOllamaStatus.modelNames, APEX_LOCAL_OLLAMA_FALLBACK_MODEL), Array.isArray(legacyOllamaStatus.modelNames) && legacyOllamaStatus.modelNames.length > 0)}. OpenAI stays disabled unless John explicitly asks for cloud and server policy allows it.`;
  const summaryWithProcessor = `${summary}${processorLine}${agentLine}${brainLine}`;
  return {
    providerLabel,
    selectedModel,
    effortId,
    effortLabel,
    effortAutoSelected: selectedEffortId === "auto" || Boolean(responseAgentSpeed.effortAutoSelected || responseAgentSpeed.automaticSelection),
    effortModel,
    effortNumCtx,
    effortManualOnly: Boolean(effortOption.manualOnly),
    effortModelStatus: apexLocalModelStatusLabel(effortModelAvailable, hasModelData || selectedModelAvailable),
    agentLaneId,
    agentLaneLabel,
    agentNumCtx,
    agentKeepAlive,
    coderManualOnly: true,
    coderStatusLabel: thirtyBActive
      ? "Active"
      : codingModelAvailable
        ? "Manual-only"
        : apexLocalModelStatusLabel(codingModelAvailable, hasModelData || selectedModelAvailable),
    activeBrainMode,
    brainModel,
    brainNumCtx,
    brainKeepAlive: brainStatus.keepAlive || "10m",
    brainSpeedLane: Boolean(brainStatus.speedLane || answer.brainProfile?.speedLane || answer.brainTelemetry?.speedLane),
    brainMaxOutputTokens: Number(brainStatus.maxOutputTokens || answer.brainProfile?.maxOutputTokens || answer.brainTelemetry?.maxOutputTokens || 0) || 0,
    brainVramLabel: brainReloadNeeded ? "reload needed" : brainVramTotalMb ? `${brainVramUsedMb}/${brainVramTotalMb} MB` : brainVramUsedMb ? `${brainVramUsedMb} MB` : "VRAM checking",
    brainThresholdStatus: brainReloadNeeded ? "reload-needed" : brainStatus.thresholdStatus || "stable",
    brainReloadNeeded,
    brainResidentNumCtx: residencyNumCtx,
    talkModelStatus: apexLocalModelStatusLabel(talkModelAvailable, hasModelData || selectedModelAvailable),
    codingModelStatus: apexLocalModelStatusLabel(codingModelAvailable, hasModelData || selectedModelAvailable),
    fastCoderModelStatus: apexLocalModelStatusLabel(fastCoderModelAvailable, hasModelData || selectedModelAvailable),
    timingLabel,
    lastBenchmarkLabel,
    warmLabel,
    receivingActive,
    status,
    tone,
    summary: summaryWithProcessor,
    cloudDecision,
    openAiUsed,
    rows: [
      { label: "Provider", value: providerLabel, tone: providerAvailable || localOllamaUsed || localLlamaCppUsed ? "green" : "blue" },
      { label: "Effort", value: `${effortLabel} / ${effortOption.manualOnly ? "manual" : "resident"}`, tone: effortOption.manualOnly ? "blue" : "green" },
      { label: "Lane", value: `${agentLaneLabel} / ctx ${agentNumCtx}`, tone: agentLaneId === "fast" ? "green" : "blue" },
      { label: "Timing", value: timingLabel, tone: timingMs ? "green" : "blue" },
      { label: "Benchmark", value: lastBenchmarkLabel, tone: lastBenchmarkMs ? "green" : "blue" },
      { label: "Warm", value: warmLabel, tone: warmStatus.enabled ? "green" : "blue" },
      { label: "Brain", value: `${brainModel} / ctx ${brainNumCtx}${brainReloadNeeded ? " / reload needed" : ""}`, tone: brainReloadNeeded ? "amber" : activeBrainMode === "speed" ? "green" : "blue" },
      { label: "Talk", value: `${APEX_LOCAL_TALK_MODEL} ${apexLocalModelStatusLabel(talkModelAvailable, hasModelData || selectedModelAvailable)}`, tone: talkModelAvailable || localLlamaCppUsed ? "green" : hasModelData ? "amber" : "blue" },
      { label: "Legacy", value: `${APEX_LOCAL_OLLAMA_FALLBACK_MODEL} ${apexLocalModelStatusLabel(hasApexLocalModel(legacyOllamaStatus.modelNames, APEX_LOCAL_OLLAMA_FALLBACK_MODEL), Array.isArray(legacyOllamaStatus.modelNames) && legacyOllamaStatus.modelNames.length > 0)}`, tone: hasApexLocalModel(legacyOllamaStatus.modelNames, APEX_LOCAL_OLLAMA_FALLBACK_MODEL) ? "green" : "blue" },
      { label: "30B", value: `${APEX_LOCAL_DEEP_CODING_MODEL} ${thirtyBActive ? "active" : codingModelAvailable ? "manual-only" : apexLocalModelStatusLabel(codingModelAvailable, hasModelData || selectedModelAvailable)}`, tone: thirtyBActive || codingModelAvailable ? "green" : hasModelData ? "amber" : "blue" },
      { label: "GPU", value: gpuLabel, tone: gpuAvailable ? "green" : "blue" },
      { label: "Cloud", value: "Disabled default", tone: openAiUsed ? "amber" : "green" },
      { label: "OpenAI", value: openAiUsed ? "Manual override" : "Not used", tone: openAiUsed ? "amber" : "green" },
    ],
  };
}

function LocalIntelligenceStatusRow({ intelligence }) {
  const status = intelligence || buildApexLocalIntelligenceStatus();
  return (
    <StatusRow item={{
      id: "local-intelligence-status",
      title: "Local Intelligence",
      status: `${status.providerLabel} / ${status.selectedModel}`,
      detail: status.summary,
      tone: status.tone,
    }} />
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
  const localIntelligence = buildApexLocalIntelligenceStatus({ response });
  const sourceLabels = Array.isArray(answer.sourceLabels) ? answer.sourceLabels : [];
  const approvalWarnings = Array.isArray(answer.approvalWarnings) ? answer.approvalWarnings : [];
  const evidenceRows = Array.isArray(response.evidenceUsed) ? response.evidenceUsed : [];
  const memoryRetrieval = response.context?.memoryRetrievalSummary || {};

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
          detail: "Apex can act privately for reversible internal work and will ask before consequential actions.",
          tone: approvalWarnings.length ? "amber" : "green",
        }} />
        <LocalIntelligenceStatusRow intelligence={localIntelligence} />
      </div>

      <div className="mt-4 grid min-w-0 gap-3 lg:grid-cols-2">
        <StatusRow item={{
          id: "ask-context-count",
          title: "Evidence count",
          status: `${response.context?.sourceCount || sourceLabels.length || 0} sources`,
          detail: `${response.context?.memoryCount || 0} approved memory rows, ${memoryRetrieval.retrievedCount || 0} retrieved memories, ${memoryRetrieval.compaction?.compactCharacterCount || 0} compacted turn characters, and ${response.context?.approvalWarningCount || approvalWarnings.length || 0} approval warnings were returned by the private endpoint.`,
          tone: "blue",
        }} />
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
        toolRouteSummary: response.context?.toolRouteSummary,
        externalActionApprovalSummary: response.context?.externalActionApprovalSummary,
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
      const payload = await speakApexOsLocalVoice(sessionToken, {
        text: answerText,
        voice: "apex",
        voiceMode: APEX_COCKPIT_USE_FAST_SIMPLE_VOICE ? "fast-fallback" : "apex",
        preferFastVoice: APEX_COCKPIT_USE_FAST_SIMPLE_VOICE,
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
          setVoiceNotice(payload.aiDisclosure || "Apex local voice output is ready. The typed answer stays visible.");
          return;
        }
        speakBrowserFallback(answerText, "Apex speech audio could not start, so browser voice fallback is speaking.");
        return;
      }
      speakBrowserFallback(payload?.fallbackText || answerText, payload?.providerConfigured ? "Speech provider fallback is active; browser voice is speaking. The typed answer stays visible." : "Server speech is not configured; browser voice is speaking. The typed answer stays visible.");
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
      setNotice("Build awareness refreshed. Read-only; consequential actions remain gated.");
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
          title: "Memory lanes",
          status: `${state.decisionMemory.coveredCategoryCount || 0}/${state.decisionMemory.categoryCount || 0}`,
          detail: "Legacy decision categories and Phase 3 John/business/life/preference/priority/idea/do-not-do memory lanes stay suggested until approved.",
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

function memoryReviewSort(left = {}, right = {}) {
  const sortValue = (row = {}) => (row.status === "approved"
    ? String(row.approvedAt || row.updatedAt || row.createdAt || "")
    : String(row.createdAt || row.updatedAt || row.approvedAt || ""));
  return sortValue(right).localeCompare(sortValue(left));
}

function suggestedMemoryRows(rows = []) {
  return rows
    .filter((row) => row?.status === "suggested")
    .slice()
    .sort(memoryReviewSort);
}

function recentApprovedMemoryRows(rows = []) {
  return rows
    .filter((row) => row?.status === "approved")
    .slice()
    .sort(memoryReviewSort)
    .slice(0, 4);
}

function formatMemoryLaneLabel(value = "apex-project") {
  return String(value || "apex-project")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function memoryReviewSummaryCount(summary = {}, key = "") {
  if (key === "approved") return summary.approvedCount ?? summary.approved ?? 0;
  if (key === "suggested") return summary.suggestedCount ?? summary.suggested ?? 0;
  if (key === "archived") return summary.archivedCount ?? summary.archived ?? 0;
  return summary.total ?? 0;
}

function MemorySuggestionsReviewPanel({ state, sessionToken }) {
  const suggestionState = state.memorySuggestions || {};
  const [suggestionRows, setSuggestionRows] = useState(suggestionState.rows || []);
  const [approvedRows, setApprovedRows] = useState(suggestionState.recentApprovedRows || []);
  const [summary, setSummary] = useState(suggestionState.summary || null);
  const [editingId, setEditingId] = useState("");
  const [editDraft, setEditDraft] = useState(null);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const categoryOptions = state.decisionMemory?.categories?.length
    ? state.decisionMemory.categories
    : [{ id: "apex-project", label: "Apex project" }];
  const canUse = state.canView && Boolean(sessionToken) && !loading;
  const activeSummary = summary || suggestionState.summary || {};
  const suggestedCount = suggestionRows.length || memoryReviewSummaryCount(activeSummary, "suggested") || suggestionState.suggestedCount || 0;
  const approvedCount = memoryReviewSummaryCount(activeSummary, "approved") || suggestionState.approvedCount || approvedRows.length || 0;
  const archivedCount = memoryReviewSummaryCount(activeSummary, "archived") || suggestionState.archivedCount || 0;
  const totalCount = memoryReviewSummaryCount(activeSummary, "total") || suggestionState.totalCount || (suggestedCount + approvedCount + archivedCount);

  function hydrateFromMemoryRows(rows = [], nextSummary = null) {
    setSuggestionRows(suggestedMemoryRows(rows));
    setApprovedRows(recentApprovedMemoryRows(rows));
    setSummary(nextSummary);
  }

  function startEdit(row = {}) {
    const lane = row.category || row.type || "apex-project";
    setEditingId(row.id || "");
    setEditDraft({
      category: lane,
      type: row.type || lane,
      title: row.title || "",
      body: row.body || row.detail || "",
      sourceLabel: row.sourceLabel || "",
      sourceUri: row.sourceUri || "",
      reviewNote: row.reviewNote || "",
    });
    setNotice("");
  }

  function updateEditField(field, value) {
    setEditDraft((current) => {
      const next = { ...(current || {}), [field]: value };
      if (field === "category") {
        next.type = value;
      }
      return next;
    });
    setNotice("");
  }

  function cancelEdit() {
    setEditingId("");
    setEditDraft(null);
    setNotice("");
  }

  async function refreshSuggestions() {
    if (!canUse) return;
    setLoading(true);
    setNotice("");
    try {
      const payload = await getApexOsMemory(sessionToken);
      hydrateFromMemoryRows(payload.apexOsMemory || [], payload.summary || null);
      setNotice("Memory suggestions loaded from private Apex OS storage.");
    } catch (error) {
      setNotice(error?.message || "Memory suggestions could not load right now.");
    } finally {
      setLoading(false);
    }
  }

  async function setSuggestionStatus(row, status) {
    if (!canUse || !row?.id) return;
    const editingThisRow = editingId === row.id;
    const payload = editingThisRow
      ? {
        ...row,
        ...editDraft,
        category: editDraft?.category || row.category || row.type || "apex-project",
        type: editDraft?.type || editDraft?.category || row.type || row.category || "apex-project",
        status,
      }
      : { ...row, status };
    const canApprove = status !== "approved" || (payload.title || "").trim() && (payload.body || "").trim() && (payload.sourceLabel || "").trim();
    if (!canApprove) {
      setNotice("Approve needs a title, content, and source label.");
      return;
    }
    setLoading(true);
    setNotice("");
    try {
      await updateApexOsMemory(sessionToken, row.id, payload);
      const refreshed = await getApexOsMemory(sessionToken);
      hydrateFromMemoryRows(refreshed.apexOsMemory || [], refreshed.summary || null);
      setEditingId("");
      setEditDraft(null);
      setNotice(status === "archived" ? "Memory suggestion archived/rejected. It will not feed approved Apex OS context." : "Memory suggestion approved and separated into approved Apex OS memory.");
    } catch (error) {
      setNotice(error?.message || "Memory suggestion could not be updated right now.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-w-0 gap-4">
      <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatusRow item={{
          id: "memory-suggestions-waiting",
          title: "Waiting review",
          status: `${suggestedCount}`,
          detail: "Suggested memory stays out of approved Apex OS context until John/operator approval succeeds.",
          tone: suggestedCount ? "amber" : "green",
        }} />
        <StatusRow item={{
          id: "memory-approved-count",
          title: "Approved memory",
          status: `${approvedCount}`,
          detail: `${totalCount} total private Apex OS memory rows are tracked; approved rows stay separate from suggestions.`,
          tone: approvedCount ? "green" : "blue",
        }} />
        <StatusRow item={{
          id: "memory-archived-count",
          title: "Archived/rejected",
          status: `${archivedCount}`,
          detail: "Archive marks a suggestion rejected without deleting the private auditable memory row.",
          tone: archivedCount ? "slate" : "blue",
        }} />
        <StatusRow item={{
          id: "memory-suggestion-boundary",
          title: "Operator boundary",
          status: state.canView ? "Private" : "Restricted",
          detail: "This review surface uses the existing Apex OS memory permission gate.",
          tone: state.canView ? "green" : "slate",
        }} />
      </div>

      <div className="flex min-w-0 flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={refreshSuggestions} disabled={!canUse}>
          <Icon name="refresh" /> {loading ? "Loading..." : "Load suggestions"}
        </Button>
        <Button type="button" disabled variant="secondary" size="sm">
          <Icon name="lock" /> Review gated
        </Button>
      </div>
      <p className="break-words text-xs font-black leading-5 text-slate-500">
        {notice || (activeSummary.summaryText || "Review suggestions from Ask Apex before they become durable assistant memory.")}
      </p>

      <div className="grid min-w-0 gap-3">
        {suggestionRows.length ? suggestionRows.map((row) => {
          const isEditing = editingId === row.id;
          const lane = row.category || row.type || "apex-project";
          return (
            <div key={row.id} className="min-w-0 rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="break-words text-[10px] font-black uppercase tracking-[0.16em] text-orange-700">{formatMemoryLaneLabel(lane)}</p>
                  <p className="mt-1 break-words text-sm font-black text-slate-950">{row.title || "Memory suggestion"}</p>
                  <p className="mt-1 break-words text-xs font-bold leading-5 text-slate-600">{row.body || row.detail || "No suggestion content is available."}</p>
                  <p className="mt-2 break-words text-[11px] font-black text-slate-500">
                    Source: {row.sourceLabel || "Missing source"}{row.sourceType ? ` | Type: ${row.sourceType}` : ""}{row.sourceUri ? ` | URI: ${row.sourceUri}` : ""}
                  </p>
                  {row.reviewNote ? <p className="mt-1 break-words text-[11px] font-black text-slate-500">Review: {row.reviewNote}</p> : null}
                </div>
                <ToneBadge tone="amber">{row.status || "suggested"}</ToneBadge>
              </div>

              {isEditing ? (
                <div className="mt-3 grid min-w-0 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
                    <input
                      value={editDraft?.title || ""}
                      onChange={(event) => updateEditField("title", event.target.value)}
                      maxLength={140}
                      className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold text-slate-700"
                      disabled={loading}
                    />
                    <select
                      value={editDraft?.category || lane}
                      onChange={(event) => updateEditField("category", event.target.value)}
                      className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold text-slate-700"
                      disabled={loading}
                    >
                      {categoryOptions.map((category) => (
                        <option key={category.id} value={category.id}>{category.label}</option>
                      ))}
                    </select>
                  </div>
                  <textarea
                    value={editDraft?.body || ""}
                    onChange={(event) => updateEditField("body", event.target.value)}
                    maxLength={1800}
                    className="min-h-24 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold leading-6 text-slate-700"
                    disabled={loading}
                  />
                  <div className="grid min-w-0 gap-3 lg:grid-cols-3">
                    <input value={editDraft?.sourceLabel || ""} onChange={(event) => updateEditField("sourceLabel", event.target.value)} maxLength={120} className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold text-slate-700" disabled={loading} />
                    <input value={editDraft?.sourceUri || ""} onChange={(event) => updateEditField("sourceUri", event.target.value)} maxLength={240} className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold text-slate-700" disabled={loading} />
                    <input value={editDraft?.reviewNote || ""} onChange={(event) => updateEditField("reviewNote", event.target.value)} maxLength={300} className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold text-slate-700" disabled={loading} />
                  </div>
                  <div className="flex min-w-0 flex-wrap gap-2">
                    <Button type="button" variant="secondary" size="sm" onClick={() => setSuggestionStatus(row, "approved")} disabled={!canUse}>
                      <Icon name="check" /> Save edits and approve
                    </Button>
                    <Button type="button" variant="secondary" size="sm" onClick={cancelEdit} disabled={loading}>
                      Cancel edit
                    </Button>
                  </div>
                </div>
              ) : null}

              <div className="mt-3 flex min-w-0 flex-wrap gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => setSuggestionStatus(row, "approved")} disabled={!canUse || isEditing}>
                  <Icon name="check" /> Approve suggestion
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => startEdit(row)} disabled={!canUse || isEditing}>
                  <Icon name="clipboard" /> Edit before approve
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => setSuggestionStatus(row, "archived")} disabled={!canUse}>
                  <Icon name="clock" /> Archive / reject
                </Button>
              </div>
            </div>
          );
        }) : (
          <EmptyPanel>No memory suggestions are waiting for review.</EmptyPanel>
        )}
      </div>

      <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-3">
        <SectionHeader title="Recent Approved Memory" description={`${approvedRows.length || 0} compact approved rows stay separate from pending suggestions.`} />
        <div className="grid min-w-0 gap-2 lg:grid-cols-2">
          {approvedRows.length ? approvedRows.map((row) => (
            <StatusRow key={`approved-memory-${row.id}`} item={{
              id: `approved-memory-${row.id}`,
              title: row.title || "Approved memory",
              status: formatMemoryLaneLabel(row.category || row.type),
              detail: row.body || row.detail || row.reviewNote || "Approved Apex OS memory.",
              tone: "green",
              sourceLabel: row.sourceLabel || "Apex OS memory",
            }} />
          )) : <EmptyPanel>No approved memory rows are visible yet.</EmptyPanel>}
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
      <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-6">
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
        <StatusRow item={{
          id: "personal-open-task-count",
          title: "Internal tasks",
          status: `${layer.openTaskCount || 0}`,
          detail: "Private Apex OS records only. No external notifications, calendar writes, SMS, email, plugins, or desktop control.",
          tone: layer.openTaskCount ? "blue" : "slate",
        }} />
        <StatusRow item={{
          id: "personal-open-reminder-count",
          title: "Internal reminders",
          status: `${layer.openReminderCount || 0}`,
          detail: "Stored for Ask Apex planning context only until a reviewed UI command flow is added.",
          tone: layer.openReminderCount ? "amber" : "slate",
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
          <SectionHeader title="Tasks / Reminders" description={layer.taskReminderSummary?.summaryText || "0 open tasks, 0 open reminders."} />
          <div className="grid min-w-0 gap-2">
            {(layer.taskReminderRows || []).length
              ? layer.taskReminderRows.map((item) => <StatusRow key={item.id} item={item} />)
              : <EmptyPanel>No internal Apex OS tasks or reminders are saved yet.</EmptyPanel>}
          </div>
        </div>

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
            status: activeProviderInsight.provider === "ollama" ? `Ollama ${activeProviderInsight.model || "local"}` : activeProviderInsight.providerConfigured ? "Local-first provider" : "Local-first fallback",
            detail: activeProviderInsight.providerSummary || "Knowledge summaries use local-first intelligence by default; OpenAI is not used unless John explicitly requests cloud and policy allows it.",
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
      setNotice(status === "approved" ? "Approval recorded. Live execution remains a separate gated step." : status === "archived" ? "Packet archived. No action executed." : "Packet decision updated. Consequential actions remain gated.");
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
              <option value="email">Email</option>
              <option value="messaging">Messaging</option>
              <option value="calendar">Calendar</option>
              <option value="ordering">Ordering</option>
              <option value="booking">Booking</option>
              <option value="billing-payment">Billing/payment</option>
              <option value="ad-spend-publishing">Ads/publishing</option>
              <option value="provider-connection">Provider</option>
              <option value="file-deletion">File deletion</option>
              <option value="file-write">File write</option>
              <option value="browser-desktop">Browser/desktop</option>
              <option value="music">Music</option>
              <option value="external-action">External action</option>
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
                {packet.status === "approved" && packet.approvedAt ? <p className="mt-2 break-words text-[11px] font-black text-emerald-700">Approved at {packet.approvedAt}. Live execution remains a separate gated step.</p> : null}
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
      setNotice(status === "closed" ? "Request closed. No agent was queued or run." : "Request status updated. Agent execution remains gated.");
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
    { label: "Mode", value: "Private Apex", tone: "green" },
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
            <p className="text-xs font-black uppercase tracking-[0.12em]">Private Apex</p>
          </div>
          <div className="grid min-w-0 grid-cols-2 gap-2">
            {["Local-first", "Acts privately", "Asks on risk", "Operator only"].map((item) => (
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
  const operatorName = resolveApexPrivateOperatorDisplayName(state.operatorName);
  return (
    <header className="sr-only">
      <p>Apex</p>
      <h1>Apex Life Screen</h1>
      <p>Apex Body Screen for {operatorName}. Private Apex, local-first intelligence, voice and typed answers ready.</p>
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

function ApexCockpitLocalIntelligencePanel({ intelligence, notice = "" }) {
  const status = intelligence || buildApexLocalIntelligenceStatus();
  return (
    <div className="co-apex-cockpit-local-intelligence-panel grid min-w-0 gap-2 rounded-md border border-emerald-300/16 bg-emerald-400/8 px-2.5 py-2" aria-label="Apex local intelligence status">
      <div className="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[9px] font-black uppercase tracking-[0.12em] text-emerald-300">Local Intelligence</p>
          <p className="mt-0.5 min-w-0 break-words text-[11px] font-black leading-4 text-slate-100">{status.status}</p>
          <p className="mt-0.5 min-w-0 break-words text-[9px] font-bold leading-4 text-emerald-100">{notice || status.summary}</p>
        </div>
        <span className={`shrink-0 rounded-md border px-2 py-1 text-[8px] font-black uppercase tracking-[0.08em] ${status.openAiUsed ? "border-orange-300/18 bg-orange-500/10 text-orange-200" : "border-emerald-300/18 bg-emerald-500/10 text-emerald-200"}`}>
          {status.openAiUsed ? "Cloud override" : "Local-first"}
        </span>
      </div>
      <div className="grid min-w-0 gap-1.5 sm:grid-cols-6">
        {status.rows.map((row) => (
          <div key={row.label} className="min-w-0 rounded-md border border-slate-800 bg-slate-950/46 px-2 py-1.5">
            <p className="truncate text-[8px] font-black uppercase tracking-[0.08em] text-slate-500">{row.label}</p>
            <p className={`mt-0.5 truncate text-[10px] font-black ${row.tone === "green" ? "text-emerald-300" : row.tone === "amber" ? "text-orange-300" : "text-cyan-300"}`}>{row.value}</p>
          </div>
        ))}
      </div>
    </div>
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
    label: "Mic standby",
    headline: "Apex is standing by",
    detail: "The local mic gate is open; GPU STT waits for a completed voice turn.",
    tone: "slate",
  },
  quiet: {
    key: "quiet",
    header: "Quiet",
    label: "Quiet",
    headline: "Apex is quiet",
    detail: "Voice routing and STT are suppressed until you resume voice.",
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
  capturing: {
    key: "capturing",
    header: "Capturing",
    label: "Capturing",
    headline: "Apex hears you",
    detail: "Speech is being buffered locally until sustained silence.",
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
  processing: {
    key: "processing",
    header: "Processing",
    label: "Processing",
    headline: "Apex is transcribing",
    detail: "The completed local turn is moving through faster-whisper CUDA.",
    tone: "blue",
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
    detail: "Voice output is optional; typed answers remain visible.",
    tone: "amber",
  },
  recovering: {
    key: "recovering",
    header: "Recovering",
    label: "Echo guard",
    headline: "Apex is clearing room echo",
    detail: "Mic frames are dropped briefly after speech playback.",
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

const APEX_COCKPIT_SILENCE_MS = 2800;
const APEX_COCKPIT_MIN_TURN_MS = 1500;
const APEX_COCKPIT_LEVEL_THRESHOLD = 0.018;
const APEX_COCKPIT_IDLE_LEVEL_THRESHOLD = 0.009;
const APEX_COCKPIT_BARGE_IN_THRESHOLD = 0.066;
const APEX_COCKPIT_BARGE_IN_GRACE_MS = 700;
const APEX_COCKPIT_RECOVERY_DROP_MS = 620;
const APEX_COCKPIT_PREROLL_CHUNKS = 2;
const APEX_COCKPIT_CAPTION_FINAL_TURN_MS = 1800;
const APEX_COCKPIT_DUPLICATE_TURN_MS = 2800;
const APEX_COCKPIT_DUPLICATE_SPEECH_MS = 9000;
const APEX_COCKPIT_DUPLICATE_STATUS_SPEECH_MS = 60000;
const APEX_COCKPIT_ECHO_SUPPRESSION_MS = 18000;
const APEX_COCKPIT_NO_VOICE_NOTICE_MS = 3800;
const APEX_COCKPIT_STT_TURN_TIMEOUT_MS = 30000;
const APEX_COCKPIT_NATIVE_LISTEN_SECONDS = 8;
const APEX_COCKPIT_NATIVE_TIMEOUT_MS = 18000;
const APEX_COCKPIT_USE_FAST_SIMPLE_VOICE = true;
const APEX_COCKPIT_FAST_SPEECH_MAX_CHARS = 120;
const APEX_COCKPIT_FAST_SPEECH_SUFFIX = "Full answer is on screen.";
const APEX_COCKPIT_SPEECH_SAFETY_MIN_MS = 16_000;
const APEX_COCKPIT_SPEECH_SAFETY_PER_CHAR_MS = 92;
const APEX_COCKPIT_SPEECH_SAFETY_MAX_MS = 45_000;
const APEX_COCKPIT_RECORDER_SLICE_MS = 250;
const APEX_COCKPIT_MIC_CALIBRATION_MS = 1800;
const APEX_COCKPIT_MIC_MAX_FRAME_AGE_MS = 2400;
const APEX_COCKPIT_MIC_MIN_THRESHOLD = 0.01;
const APEX_COCKPIT_MIC_MAX_THRESHOLD = 0.045;
const APEX_COCKPIT_LISTENING_HANDOFF_NOTICE = "Apex finished speaking and is listening for the next visible local turn.";
const APEX_COCKPIT_NATIVE_PAUSED_NOTICE = "Apex answered. Voice is paused to avoid hearing its own answer.";
const APEX_COCKPIT_VOICE_RETRY_NOTICE = "I missed that. Say it again when the visible local voice loop is ready.";
const APEX_COCKPIT_VOICE_RETRY_OPEN_MS = 420;

function normalizeApexCockpitLoopText(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const APEX_COCKPIT_DONE_TALKING_PATTERN = /\b(?:done talking|i(?:'m| am|m)? done talking|finished talking|i(?:'m| am|m)? finished talking|that'?s it|that is it|send it|go ahead apex)\b/i;
const APEX_COCKPIT_DONE_TALKING_STRIP_PATTERN = /\b(?:done talking|i(?:'m| am|m)? done talking|finished talking|i(?:'m| am|m)? finished talking|that'?s it|that is it|send it|go ahead apex)\b[.!,;:\s]*/gi;

function hasApexCockpitDoneTalkingCue(value = "") {
  return APEX_COCKPIT_DONE_TALKING_PATTERN.test(String(value || ""));
}

function stripApexCockpitDoneTalkingCue(value = "") {
  return String(value || "")
    .replace(APEX_COCKPIT_DONE_TALKING_STRIP_PATTERN, " ")
    .replace(/\s+([?.!,])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function isLikelyApexCockpitEcho(transcript = "", spokenText = "") {
  const transcriptKey = normalizeApexCockpitLoopText(transcript);
  const spokenKey = normalizeApexCockpitLoopText(spokenText);
  if (!transcriptKey || !spokenKey) return false;
  if (transcriptKey === spokenKey) return true;
  if (transcriptKey.length >= 28 && spokenKey.includes(transcriptKey)) return true;
  if (spokenKey.length >= 28 && transcriptKey.includes(spokenKey.slice(0, Math.min(spokenKey.length, 140)))) return true;
  const transcriptWords = transcriptKey.split(" ").filter((word) => word.length > 2);
  if (transcriptWords.length < 5) return false;
  const spokenWordSet = new Set(spokenKey.split(" ").filter((word) => word.length > 2));
  const sharedCount = transcriptWords.filter((word) => spokenWordSet.has(word)).length;
  return sharedCount / transcriptWords.length >= 0.74;
}

function findApexCockpitSlowestTimingStep(timingMs = {}) {
  const rows = Object.entries(timingMs && typeof timingMs === "object" ? timingMs : {})
    .filter(([key]) => !/^(total|totalturnms|totalvoiceturnms|totalclientturnms)$/i.test(String(key || "")))
    .map(([key, value]) => ({ step: key, ms: Math.max(0, Math.round(Number(value) || 0)) }))
    .filter((row) => row.ms > 0)
    .sort((a, b) => b.ms - a.ms);
  return rows[0] || { step: "", ms: 0 };
}

function clampApexCockpitMicThreshold(value, fallback = APEX_COCKPIT_LEVEL_THRESHOLD) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.max(APEX_COCKPIT_MIC_MIN_THRESHOLD, Math.min(APEX_COCKPIT_MIC_MAX_THRESHOLD, parsed));
}

function clampApexCockpitMicLevel(value = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.max(0, Math.min(1, parsed));
}

function createApexCockpitMicCalibrationState(patch = {}) {
  return {
    status: "not-started",
    inputProvider: "browser",
    captureProvider: "none",
    audioWorkletSupported: false,
    audioWorkletActive: false,
    fallbackCaptureUsed: false,
    frameCount: 0,
    peakLevel: 0,
    noiseFloor: 0,
    averageLevel: 0,
    calibratedLevelThreshold: APEX_COCKPIT_LEVEL_THRESHOLD,
    calibratedIdleLevelThreshold: APEX_COCKPIT_IDLE_LEVEL_THRESHOLD,
    lastFrameAtMs: 0,
    lastSignalAtMs: 0,
    startedAtMs: 0,
    completedAtMs: 0,
    signalDetected: false,
    reason: "",
    micDeviceLabel: "",
    sampleRate: 0,
    ...patch,
  };
}

function buildApexCockpitMicCalibrationThreshold({ peakLevel = 0, noiseFloor = 0, averageLevel = 0 } = {}) {
  const peak = Math.max(0, Number(peakLevel || 0) || 0);
  const floor = Math.max(0, Number(noiseFloor || 0) || 0);
  const average = Math.max(0, Number(averageLevel || 0) || 0);
  const spread = Math.max(0, peak - floor);
  const adaptive = floor + Math.max(APEX_COCKPIT_MIC_MIN_THRESHOLD, spread * 0.28, average * 1.7);
  const levelThreshold = clampApexCockpitMicThreshold(adaptive);
  return {
    levelThreshold,
    idleLevelThreshold: Math.max(0.004, Math.min(levelThreshold * 0.55, APEX_COCKPIT_IDLE_LEVEL_THRESHOLD)),
  };
}

function formatApexCockpitMicPercent(value = 0) {
  return `${Math.round(Math.max(0, Math.min(1, Number(value || 0) || 0)) * 100)}%`;
}

function formatApexCockpitTimingMs(value = 0, fallback = "--") {
  const parsed = Math.max(0, Math.round(Number(value || 0) || 0));
  return parsed ? `${parsed}ms` : fallback;
}

function buildApexCockpitVoiceTimingSummary(receipt = null, alwaysOpenMic = {}) {
  const safeReceipt = receipt && typeof receipt === "object" ? receipt : {};
  const timing = safeReceipt.timingMs && typeof safeReceipt.timingMs === "object" ? safeReceipt.timingMs : {};
  const totalTurnMs = Math.max(0, Math.round(Number(safeReceipt.totalTurnMs || timing.totalTurnMs || 0) || 0));
  const closeMs = Math.max(0, Math.round(Number(
    safeReceipt.voiceCloseMs
    || timing.voiceCloseMs
    || timing.vadActualSilenceMs
    || safeReceipt.silenceDurationMs
    || alwaysOpenMic.silenceDurationMs
    || alwaysOpenMic.sustainedSilenceMs
    || APEX_COCKPIT_SILENCE_MS,
  ) || 0));
  const slowest = findApexCockpitSlowestTimingStep(timing);
  const slowStep = safeReceipt.slowestStep || slowest.step || "";
  const slowMs = Math.max(0, Math.round(Number(safeReceipt.slowestStepMs || slowest.ms || 0) || 0));
  const sttMs = Math.max(0, Math.round(Number(timing.sttMs || timing.transcriptionTimingMs || safeReceipt.transcriptionTimingMs || 0) || 0));
  const modelFirstTokenMs = Math.max(0, Math.round(Number(timing.modelFirstTokenMs || safeReceipt.liveTurnLatency?.modelFirstTokenMs || 0) || 0));
  const modelTotalMs = Math.max(0, Math.round(Number(timing.modelTotalMs || timing.modelRequestMs || safeReceipt.liveTurnLatency?.modelTotalMs || 0) || 0));
  const ttsMs = Math.max(0, Math.round(Number(timing.ttsGenerationMs || timing.ttsRequestMs || safeReceipt.liveTurnLatency?.ttsMs || 0) || 0));
  const playbackMs = Math.max(0, Math.round(Number(
    timing.playbackStartDelayMs
    || timing.playbackDurationMs
    || timing.recoveryMs
    || safeReceipt.liveTurnLatency?.playbackRecoveryMs
    || 0,
  ) || 0));
  return {
    totalTurnMs,
    closeMs,
    sttMs,
    modelFirstTokenMs,
    modelTotalMs,
    ttsMs,
    playbackMs,
    slowStep,
    slowMs,
    turnLabel: formatApexCockpitTimingMs(totalTurnMs),
    closeLabel: formatApexCockpitTimingMs(closeMs),
    sttLabel: formatApexCockpitTimingMs(sttMs),
    modelLabel: modelFirstTokenMs || modelTotalMs
      ? `${modelFirstTokenMs ? `${modelFirstTokenMs}ms` : "--"}/${modelTotalMs ? `${modelTotalMs}ms` : "--"}`
      : "--",
    ttsLabel: formatApexCockpitTimingMs(ttsMs),
    playbackLabel: formatApexCockpitTimingMs(playbackMs),
    slowLabel: slowStep ? `${slowStep} ${formatApexCockpitTimingMs(slowMs)}` : "--",
  };
}

function buildApexCockpitLiveBenchmarkStatus(history = null) {
  const safeHistory = history && typeof history === "object" ? history : {};
  const typed = safeHistory.latestTypedBenchmark || safeHistory.typedBenchmark || null;
  const voice = safeHistory.latestVoiceBenchmark || safeHistory.voiceBenchmark || null;
  const comparison = safeHistory.benchmarkComparison || {};
  const typedTotal = Number(typed?.totalTurnMs || 0) || 0;
  const typedFirst = Number(typed?.modelFirstTokenMs || typed?.firstTokenLatencyMs || 0) || 0;
  const typedModel = Number(typed?.modelTotalMs || 0) || 0;
  const voiceTotal = Number(voice?.totalTurnMs || 0) || 0;
  const voiceClose = Number(voice?.closeMs || 0) || 0;
  const voiceStt = Number(voice?.sttMs || 0) || 0;
  const voiceModel = Number(voice?.modelTotalMs || 0) || 0;
  const voiceTts = Number(voice?.ttsMs || 0) || 0;
  const voicePlay = Number(voice?.playbackRecoveryMs || 0) || 0;
  const diagnosis = comparison.diagnosis || voice?.diagnosis || typed?.diagnosis || "pending";
  const slowestStep = comparison.slowestStepLabel || voice?.slowestStepLabel || typed?.slowestStepLabel || "";
  const slowestMs = Number(comparison.slowestStepMs || voice?.slowestStepMs || typed?.slowestStepMs || 0) || 0;
  return {
    typed,
    voice,
    comparison,
    status: typed && voice ? "compared" : typed ? "voice-needed" : "ready",
    tone: typed && voice ? "green" : typed ? "amber" : "blue",
    typedLabel: typed ? `${typedTotal}ms / ${typedFirst || "--"}/${typedModel || "--"}ms` : "--",
    voiceLabel: voice ? `${voiceTotal}ms` : "visible turn needed",
    voiceBreakdownLabel: voice ? `close ${voiceClose || "--"} / STT ${voiceStt || "--"} / model ${voiceModel || "--"} / TTS ${voiceTts || "--"} / play ${voicePlay || "--"}` : "voice benchmark waits for a visible user-started mic turn",
    slowLabel: slowestStep ? `${slowestStep} ${slowestMs || "--"}ms` : "--",
    diagnosis,
  };
}

function buildApexCockpitMicCalibrationPatch({
  current = null,
  level = 0,
  nowMs = 0,
  captureProvider = "",
  audioWorkletSupported = false,
  audioWorkletActive = false,
  fallbackCaptureUsed = false,
  micDeviceLabel = "",
  sampleRate = 0,
  frameReceived = true,
  muted = false,
} = {}) {
  const base = createApexCockpitMicCalibrationState(current || {});
  const now = Math.max(0, Number(nowMs || 0) || 0);
  const startedAtMs = base.startedAtMs || now;
  const cleanLevel = clampApexCockpitMicLevel(muted ? 0 : level);
  const frameCount = frameReceived ? Number(base.frameCount || 0) + 1 : Number(base.frameCount || 0);
  const peakLevel = frameReceived ? Math.max((Number(base.peakLevel || 0) * 0.985), cleanLevel) : Number(base.peakLevel || 0);
  const averageLevel = frameReceived
    ? Number(base.averageLevel || 0)
      ? (Number(base.averageLevel || 0) * 0.88) + (cleanLevel * 0.12)
      : cleanLevel
    : Number(base.averageLevel || 0);
  const previousFloor = Number(base.noiseFloor || 0) || (cleanLevel || 0);
  const quietCandidate = cleanLevel && cleanLevel < Math.max(base.calibratedLevelThreshold || APEX_COCKPIT_LEVEL_THRESHOLD, APEX_COCKPIT_MIC_MIN_THRESHOLD)
    ? cleanLevel
    : previousFloor;
  const noiseFloor = frameReceived
    ? Math.max(0, Math.min(peakLevel || quietCandidate || 0, previousFloor ? (previousFloor * 0.94) + (quietCandidate * 0.06) : quietCandidate))
    : previousFloor;
  const thresholds = buildApexCockpitMicCalibrationThreshold({ peakLevel, noiseFloor, averageLevel });
  const speechSignal = !muted && cleanLevel >= thresholds.levelThreshold;
  const signalDetected = Boolean(base.signalDetected || speechSignal || peakLevel >= thresholds.levelThreshold);
  const calibrating = now && startedAtMs ? now - startedAtMs < APEX_COCKPIT_MIC_CALIBRATION_MS : true;
  const lastFrameAtMs = frameReceived ? now : Number(base.lastFrameAtMs || 0);
  const lastSignalAtMs = speechSignal ? now : Number(base.lastSignalAtMs || 0);
  let status = base.status || "not-started";
  let reason = base.reason || "";
  if (!frameCount) {
    status = "open-no-frames";
    reason = "Mic permission may be open, but Apex has not received PCM frames yet.";
  } else if (muted) {
    status = "muted";
    reason = "Apex is dropping mic frames during speech or echo recovery.";
  } else if (speechSignal || (lastSignalAtMs && now - lastSignalAtMs < APEX_COCKPIT_MIC_MAX_FRAME_AGE_MS)) {
    status = "signal";
    reason = "Mic frames are crossing the calibrated speech gate.";
  } else if (calibrating) {
    status = "calibrating";
    reason = "Apex is measuring the room noise floor and speech gate.";
  } else {
    status = "quiet";
    reason = "Mic frames are arriving, but speech has not crossed the calibrated gate yet.";
  }

  return createApexCockpitMicCalibrationState({
    ...base,
    status,
    reason,
    inputProvider: "browser",
    captureProvider: captureProvider || base.captureProvider || "media-recorder",
    audioWorkletSupported: Boolean(audioWorkletSupported || base.audioWorkletSupported),
    audioWorkletActive: Boolean(audioWorkletActive),
    fallbackCaptureUsed: Boolean(fallbackCaptureUsed || base.fallbackCaptureUsed),
    frameCount,
    peakLevel,
    noiseFloor,
    averageLevel,
    calibratedLevelThreshold: thresholds.levelThreshold,
    calibratedIdleLevelThreshold: thresholds.idleLevelThreshold,
    lastFrameAtMs,
    lastSignalAtMs,
    startedAtMs,
    completedAtMs: !calibrating && frameCount ? (base.completedAtMs || now) : Number(base.completedAtMs || 0),
    signalDetected,
    micDeviceLabel: micDeviceLabel || base.micDeviceLabel || "",
    sampleRate: Number(sampleRate || base.sampleRate || 0) || 0,
  });
}

function buildApexCockpitMicTestSummary({
  calibration = null,
  canUseRecorder = false,
  canUseNativeVoice = false,
  micPermissionState = "unknown",
  recording = false,
} = {}) {
  if (!canUseRecorder && !canUseNativeVoice) return "No local microphone input is ready here. Type the request while Apex checks voice.";
  const mic = createApexCockpitMicCalibrationState(calibration || {});
  if (micPermissionState === "denied" && canUseNativeVoice) return "Browser mic permission is blocked, but Apex can still listen through the visible native Windows mic path.";
  if (micPermissionState === "denied") return "The microphone is blocked for this Apex window. Allow mic access for localhost:5173, then run the mic test again.";
  if (!recording) return "Mic test is ready. Speak normally once voice opens; I will measure frames, peak level, and the local speech gate.";
  const capture = mic.captureProvider || "media-recorder";
  const gate = formatApexCockpitMicPercent(mic.calibratedLevelThreshold || APEX_COCKPIT_LEVEL_THRESHOLD);
  const peak = formatApexCockpitMicPercent(mic.peakLevel || 0);
  const floor = formatApexCockpitMicPercent(mic.noiseFloor || 0);
  if (!mic.frameCount) return `Mic is open, but Apex has not received PCM frames yet. Capture path: ${capture}. Check the Windows input device and browser mic permission.`;
  if (mic.status === "signal" || mic.signalDetected) {
    return `Mic frames are arriving and your voice crossed the local gate. Peak ${peak}, room floor ${floor}, gate ${gate}, capture ${capture}.`;
  }
  return `Mic frames are arriving, but speech has not crossed the local gate yet. Peak ${peak}, room floor ${floor}, gate ${gate}, capture ${capture}. Speak closer or check the selected Windows input.`;
}

function isApexCockpitMicCalibrationCommand(value = "") {
  return /\b(test my mic|test the mic|mic test|microphone test|calibrate my mic|calibrate the mic|check my mic|check the microphone|why can't you hear me|why cant you hear me)\b/i.test(String(value || ""));
}

function mergeApexCockpitVoiceReceipt(current = null, patch = {}) {
  const base = current && typeof current === "object" ? current : {};
  const nextTiming = {
    ...(base.timingMs && typeof base.timingMs === "object" ? base.timingMs : {}),
    ...(patch.timingMs && typeof patch.timingMs === "object" ? patch.timingMs : {}),
  };
  const slowest = findApexCockpitSlowestTimingStep(nextTiming);
  const totalTurnMs = Math.max(
    0,
    Math.round(Number(patch.totalTurnMs || nextTiming.totalTurnMs || base.totalTurnMs || 0) || 0),
  );
  return {
    ...base,
    ...patch,
    id: patch.id || base.id || (patch.turnId || base.turnId ? `AVR-${patch.turnId || base.turnId}` : `AVR-${Date.now()}`),
    turnId: patch.turnId || base.turnId || base.lastTurnId || "",
    lastTurnId: patch.lastTurnId || patch.turnId || base.lastTurnId || base.turnId || "",
    status: patch.status || base.status || "tracked",
    provider: patch.provider || base.provider || "apex-local-voice",
    timingMs: nextTiming,
    slowestStep: patch.slowestStep || slowest.step || base.slowestStep || "",
    slowestStepMs: Math.max(0, Math.round(Number(patch.slowestStepMs || slowest.ms || base.slowestStepMs || 0) || 0)),
    totalTurnMs,
    audioStored: false,
    openAiAudioUsed: false,
    cloudAudioAllowed: false,
  };
}

function isApexCockpitLoopProneSpeech(value = "") {
  return /\b(needs review|blocked for review|stopped at review|manual review|approval gate|progress \d+|current step|recommendation:|audio data|voice turn failed|audio turn failed|local stt timed out|same thing|retry listening)\b/i.test(String(value || ""));
}

function isApexCockpitReviewGateCheckIn(checkIn = {}) {
  const combined = [
    checkIn.trigger,
    checkIn.title,
    checkIn.status,
    checkIn.detail,
    checkIn.recommendation,
  ].join(" ");
  return /\b(attention|manual review|needs review|approval|blocked|gate)\b/i.test(combined);
}

function buildApexCockpitFastSpeechText(value = "", { maxChars = APEX_COCKPIT_FAST_SPEECH_MAX_CHARS } = {}) {
  const raw = String(value || "")
    .replace(/https?:\/\/\S+/gi, "link")
    .replace(/\b[A-Z]:\\[^\s]+/g, "file path")
    .replace(/\s*[-*]\s+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (raw.length <= maxChars) return raw;
  const sentences = raw.match(/[^.!?]+[.!?]+/g) || [];
  let spoken = "";
  for (const sentence of sentences) {
    const next = `${spoken} ${sentence}`.trim();
    if (next.length > maxChars) break;
    spoken = next;
  }
  if (!spoken) {
    spoken = raw.slice(0, maxChars).replace(/\s+\S*$/, "").trim();
  }
  const clipped = (spoken || raw.slice(0, maxChars))
    .replace(/\s+\S*$/, "")
    .trim()
    .replace(/[,:;]+$/, "");
  const punctuation = /[.!?]$/.test(clipped) ? "" : ".";
  return `${clipped}${punctuation} ${APEX_COCKPIT_FAST_SPEECH_SUFFIX}`;
}

function isApexCockpitAuthRequiredError(error = {}) {
  const message = String(error?.payload?.error || error?.message || "").trim();
  return Number(error?.status || 0) === 401 || /authentication required|session expired|not authenticated/i.test(message);
}

function apexCockpitLocalVoiceAuthRecoveryText() {
  return "This Apex desktop voice window needs John's private operator session before local voice can use STT or TTS. Sign in in this window, or relaunch Apex after signing in with Chrome. The typed answer stays visible and no cloud audio was used.";
}

function resolveApexCockpitMicFailureMessage(error = {}) {
  const name = String(error?.name || "").trim();
  const message = String(error?.message || "").trim();
  if (/notallowed|permissiondenied|security/i.test(`${name} ${message}`)) {
    return "Chrome has not allowed the microphone for this Apex window. Choose Allow when prompted, or set Microphone to Allow for localhost:5173 in Chrome site settings, then press Recover Voice.";
  }
  if (/notfound|devicesnotfound/i.test(`${name} ${message}`)) {
    return "Chrome cannot find an input microphone. Check the Windows input device, then press Recover Voice.";
  }
  if (/notreadable|trackstart/i.test(`${name} ${message}`)) {
    return "Chrome can see the microphone, but Windows or another app has it busy. Close the other mic app or switch the Windows input device, then press Recover Voice.";
  }
  if (/overconstrained|constraint/i.test(`${name} ${message}`)) {
    return "Chrome could not start the microphone with the requested local voice settings. Press Recover Voice and Apex will try again.";
  }
  return "Apex could not open the microphone in this window. Allow microphone access for localhost:5173, then press Recover Voice.";
}
const APEX_COCKPIT_AUDIO_CHECK_TEXT = "Apex audio is on. I can talk back on this desktop.";

const APEX_COCKPIT_VOICE_PROFILES = Object.freeze([
  { id: "alloy", label: "Alloy", detail: "Balanced operator", rate: 0.98, pitch: 1 },
  { id: "verse", label: "Verse", detail: "Warmer command", rate: 0.96, pitch: 0.98 },
  { id: "ash", label: "Ash", detail: "Lower and direct", rate: 0.94, pitch: 0.92 },
  { id: "sage", label: "Sage", detail: "Calm briefing", rate: 0.96, pitch: 1.03 },
]);

const APEX_COCKPIT_PERSONALITY_MODES = Object.freeze(APEX_OS_ASSISTANT_MODES.map((mode) => ({
  id: mode.id,
  label: mode.label,
  detail: mode.description,
  prompt: mode.promptGuidance,
})));

function findApexCockpitVoiceProfile(profileId = "alloy") {
  return APEX_COCKPIT_VOICE_PROFILES.find((profile) => profile.id === profileId) || APEX_COCKPIT_VOICE_PROFILES[0];
}

function findApexCockpitPersonalityMode(modeId = DEFAULT_APEX_OS_ASSISTANT_MODE_ID) {
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

const APEX_HQ_DOMAIN_COMMAND_ROUTES = [
  {
    id: "apex-hq-leads",
    label: "Apex HQ Leads",
    detail: "Apex matched this to the existing Apex HQ Leads workspace. It can open/show leads and summarize current lead state without sending anything.",
    actionLabel: "Open leads",
    moduleId: "leads",
    intent: "apex-hq-leads",
    tone: "green",
    patterns: [/\b(leads?|lead pipeline|lead board|lead workspace|prospects?)\b/i],
  },
  {
    id: "apex-hq-jobs",
    label: "Apex HQ Jobs",
    detail: "Apex matched this to the existing Apex HQ Jobs workspace. It can open/show jobs and summarize active work from current state.",
    actionLabel: "Open jobs",
    moduleId: "jobs",
    intent: "apex-hq-jobs",
    tone: "green",
    patterns: [/\b(jobs?|job board|active work|work orders?|projects?)\b/i],
  },
  {
    id: "apex-hq-customers",
    label: "Apex HQ Customers",
    detail: "Apex matched this to the existing Apex HQ Customers workspace. It can open/show customers without exposing private Apex state to field users.",
    actionLabel: "Open customers",
    moduleId: "customers",
    intent: "apex-hq-customers",
    tone: "green",
    patterns: [/\b(customers?|clients?|customer list|client list)\b/i],
  },
  {
    id: "apex-hq-estimates",
    label: "Apex HQ Estimates",
    detail: "Apex matched this to existing Apex HQ estimate workflows. It can open/show estimates; sending and pricing approvals stay gated.",
    actionLabel: "Open estimates",
    moduleId: "estimates",
    intent: "apex-hq-estimates",
    tone: "green",
    patterns: [/\b(estimates?|quote|quotes|bids?)\b/i],
  },
  {
    id: "apex-hq-proposals",
    label: "Apex HQ Proposals",
    detail: "Apex matched this to the existing Apex HQ Proposals workspace. It can open/show proposals; sending and customer-visible delivery stay gated.",
    actionLabel: "Open proposals",
    moduleId: "proposals",
    intent: "apex-hq-proposals",
    tone: "green",
    patterns: [/\b(proposals?|proposal workspace|proposal packet)\b/i],
  },
  {
    id: "apex-hq-reports",
    label: "Apex HQ Reports",
    detail: "Apex matched this to existing Apex HQ report workflows. It can open/show reports without changing customer-visible records.",
    actionLabel: "Open reports",
    moduleId: "reports",
    intent: "apex-hq-reports",
    tone: "green",
    patterns: [/\b(reports?|daily reports?)\b/i],
  },
  {
    id: "apex-hq-uploads",
    label: "Apex HQ Uploads",
    detail: "Apex matched this to existing Apex HQ upload/evidence workflows. It can open/show uploads and proof without changing customer-visible records.",
    actionLabel: "Open uploads",
    moduleId: "uploads",
    intent: "apex-hq-uploads",
    tone: "green",
    patterns: [/\b(uploads?|photos?|evidence|proof)\b/i],
  },
  {
    id: "apex-hq-today",
    label: "Apex HQ Today",
    detail: "Apex matched this to today's Apex HQ business state. It can answer from current dashboard, leads, jobs, reports, memory, tasks, and build awareness.",
    actionLabel: "Use Apex home",
    section: "apex",
    intent: "apex-hq-today-summary",
    tone: "blue",
    patterns: [/\b(today's apex hq|today in apex hq|what should i handle today|business state|apex hq state|apex hq today)\b/i],
  },
  {
    id: "apex-hq-domain",
    label: "Apex HQ Domain",
    detail: "Apex matched this to the Apex HQ business workspace summary. It can show what business modules it can route to without duplicating workflows.",
    actionLabel: "Show Apex HQ",
    section: "apex",
    intent: "apex-hq-domain",
    commandAction: "show-panel-apex-hq",
    tone: "blue",
    patterns: [/\b(show apex hq|open apex hq|check apex hq|show business workspace|open business workspace|pull up apex hq|apex hq domain)\b/i],
  },
  {
    id: "apex-hq-build-status",
    label: "Build Status",
    detail: "Apex matched this to build awareness. It can summarize local app/build status while deploy, production, schema, auth, and deletion remain gated.",
    actionLabel: "Open build status",
    section: "release",
    intent: "apex-hq-build-status",
    tone: "blue",
    patterns: [/\b(build status|app status|what changed in (the )?(app|repo|build)|repo status|phase status|local build)\b/i],
  },
  {
    id: "apex-private-task",
    label: "Private Apex Tasks",
    detail: "Apex matched this to private internal tasks/reminders/notes. It can use existing operator-only Apex state for reversible private records.",
    actionLabel: "Open tasks",
    section: "personal",
    intent: "apex-private-task",
    tone: "green",
    patterns: [/\b(remind me|reminder|task|to-do|todo|note|save this)\b/i],
  },
];

const APEX_BUILDER_COMMAND_ROUTES = [
  {
    id: "apex-clear-screen",
    label: "Clear screen",
    detail: "Apex matched this to the home surface router. It will hide detailed panels and return to the conversation-first home.",
    actionLabel: "Clear screen",
    section: "apex",
    intent: "clear-screen",
    commandAction: "clear-apex-panels",
    tone: "slate",
    patterns: [/\b(clear the screen|hide panels|close panels|conversation first|back to apex home|hide everything|clean screen|go quiet|quiet down|calm standby|show me only if i need to see it|only show me if i need to see it|keep (it|the interface) minimal)\b/i],
  },
  {
    id: "apex-builder-check-app",
    label: "Apex Builder Mode",
    detail: "Apex matched this to Builder Mode. It can refresh local build awareness, summarize dirty files, run fixed local checks, and report what changed without deploying.",
    actionLabel: "Open Builder Mode",
    section: "apex",
    intent: "builder-check-app",
    commandAction: "builder-status",
    tone: "blue",
    patterns: [/\b(use builder|check the app|check app|app check|inspect the app|inspect app|work on the app|work the app|build the app|builder mode|builder status|show builder|show me what builder is doing|what builder is doing)\b/i],
  },
  {
    id: "apex-builder-hide",
    label: "Hide Builder",
    detail: "Apex matched this to the home surface router. It will hide Builder Mode and keep the conversation-first feed visible.",
    actionLabel: "Hide builder",
    section: "apex",
    intent: "builder-hide",
    commandAction: "hide-builder-panel",
    tone: "slate",
    patterns: [/\b(hide builder|close builder|hide builder mode|close builder mode)\b/i],
  },
  {
    id: "apex-builder-what-changed",
    label: "What changed",
    detail: "Apex matched this to local build awareness. It can summarize current changed files and validation posture from the private workspace.",
    actionLabel: "Summarize changes",
    section: "apex",
    intent: "builder-what-changed",
    commandAction: "show-what-changed",
    tone: "amber",
    patterns: [/\b(show what changed|what changed|what's changed|what did we change|what did you change|dirty files|changed files|repo changes|local changes)\b/i],
  },
  {
    id: "apex-autonomous-build-loop",
    label: "Apex Build Loop",
    detail: "Apex matched this to the controlled local build loop. It can create an Apex-owned scoped build task, route normal coding through qwen3:14b at 4096 context, keep 30B manual-only, save a receipt, and use controlled Builder/Self-Fix tooling only.",
    actionLabel: "Run build loop",
    section: "apex",
    intent: "apex-autonomous-build-loop",
    commandAction: "run-autonomous-build-loop",
    tone: "green",
    patterns: [/\b(work on yourself|improve yourself|work on apex itself|start coding|start building|start the build loop|stop coding|pause coding|stop building|pause building|what are you building|what are you coding|build loop status|improve your voice status|fix your voice status|clean up your runtime|clean up local runtime|cleanup local runtime)\b/i],
  },
  {
    id: "apex-builder-controlled-fix",
    label: "Self-Fix",
    detail: "Apex matched this to Self-Fix v2. It can prepare the repair context, dispatch the existing controlled Builder tooling, validate, learn, and report back without turning Home into a dashboard.",
    actionLabel: "Handle fix",
    section: "apex",
    intent: "self-fix-auto-dispatch",
    commandAction: "self-fix-auto-dispatch",
    tone: "green",
    patterns: [/\b(fix this screen|fix this page|fix this small ui issue|fix small ui|fix stale copy|repair this screen|repair this page|repair a focused test|repair this test|fix this status label|fix status label|clean up this small layout issue|small layout issue|check and fix the local app|run the focused fix|focused fix|controlled fix|fix this bug|work on this bug|repair this|fix this local|fix the app|fix the local app|what's broken here|what is broken here|what would you change|what would change|prepare a patch|show me the patch|hand this to the build thread|handoff to the build thread|what tests would you run|what tests should run|stop fixing)\b/i],
  },
  {
    id: "apex-builder-fix-history",
    label: "Fix history",
    detail: "Apex matched this to Builder Mode history. It can show recent controlled fix receipts, patch previews, touched files, validation results, and What Apex Did rows.",
    actionLabel: "Show fix history",
    section: "apex",
    intent: "builder-fix-history",
    commandAction: "show-patch-panel",
    tone: "blue",
    patterns: [/\b(show fix history|fix history|what apex did|what did apex do|show what apex did|show what you changed|recent fixes|fix receipts)\b/i],
  },
  {
    id: "apex-builder-patch-preview",
    label: "Patch preview",
    detail: "Apex matched this to Builder Mode patch preview. It can show exact before/after snippets, target files, validation command, and expected result for Apex-prepared fixes.",
    actionLabel: "Show patch",
    section: "apex",
    intent: "builder-patch-preview",
    commandAction: "builder-status",
    tone: "blue",
    patterns: [/\b(show the patch|show patch|pull up patch preview|patch preview|before after patch|what patch|show the diff|exact patch)\b/i],
  },
  {
    id: "apex-builder-local-undo",
    label: "Local undo",
    detail: "Apex matched this to Builder Mode local undo. It can undo Apex's own last successful scoped patch when the file still matches the Apex-applied baseline.",
    actionLabel: "Undo last Apex patch",
    section: "apex",
    intent: "builder-local-undo",
    commandAction: "show-undo-panel",
    tone: "amber",
    patterns: [/\b(undo your last fix|undo last fix|revert your local patch|undo apex patch|local undo|undo the patch|revert your patch)\b/i],
  },
  {
    id: "apex-builder-task",
    label: "Builder task",
    detail: "Apex matched this to a private builder task. It can create a private Builder Mode task in the existing autonomy ledger and keep consequential actions gated.",
    actionLabel: "Create builder task",
    section: "apex",
    intent: "builder-task",
    commandAction: "create-builder-task",
    tone: "green",
    patterns: [/\b(make this a builder task|create (a )?builder task|track this bug|track (this )?(issue|bug)|builder task)\b/i],
  },
];

function matchApexHqDomainCommandRoute(normalized = "") {
  return APEX_HQ_DOMAIN_COMMAND_ROUTES.find((route) => route.patterns.some((pattern) => pattern.test(normalized))) || null;
}

function matchApexBuilderCommandRoute(normalized = "") {
  return APEX_BUILDER_COMMAND_ROUTES.find((route) => route.patterns.some((pattern) => pattern.test(normalized))) || null;
}

function buildApexCockpitCommandRoute(question = "", { previousRoute = null, activeRun = null, nextPrivateMove = null } = {}) {
  const normalized = String(question || "").toLowerCase();
  const hasAny = (words) => words.some((word) => normalized.includes(word));
  const isFollowUp = Boolean(previousRoute?.id)
    && /\b(that|it|this|yes|yeah|yep|do it|draft it|make it|create it|open it|show it|go there)\b/i.test(normalized)
    && normalized.length < 90;
  const wantsRouteOpen = hasAny(["open ", "show ", "go to", "take me", "switch to", "pull up", "bring up"]);
  const wantsLiveRun = hasAny(["live run", "operator run", "autonomy run", "start a run", "start the run", "get this done", "get it done", "handle this", "handle it", "work this", "work on this", "make this happen", "take care of this", "take care of it"])
    || /\b(do|run|work|handle|finish|complete|execute)\b.*\b(this|it|task|work|for me|done)\b/i.test(normalized);
  const wantsAgentRequest = hasAny(["create agent", "draft agent", "agent request", "agent task", "ask agent", "have agent", "run agent", "qa this", "build this", "release this"])
    || /\b(ask|have|tell|create|draft|run)\b.*\b(agent|qa|build|release|marketing|sales|monitoring)\b/.test(normalized)
    || /\b(qa|build|release|marketing|sales|monitoring)\b.*\b(agent|check|run|task|request)\b/.test(normalized);
  const base = {
    shouldOpenSection: wantsRouteOpen,
    suggestedActions: wantsLiveRun ? ["Start private run", "Answer from memory", "Open matched room"] : ["Answer from memory", "Open matched room"],
  };
  const builderRoute = matchApexBuilderCommandRoute(normalized);
  if (builderRoute && !wantsAgentRequest && !wantsLiveRun && !isFollowUp) {
    return {
      ...base,
      ...builderRoute,
      section: "apex",
      suggestedActions: builderRoute.commandAction === "self-fix-prep"
        ? ["Prepare patch handoff", "Show patch", "Validation plan"]
        : builderRoute.commandAction === "run-builder-fix"
          ? ["Run focused fix", "Show receipt", "Run focused check"]
        : builderRoute.commandAction === "create-builder-task"
        ? ["Create builder task", "Run focused check", "Summarize changes"]
        : ["Refresh build awareness", "Run focused check", "Create builder task"],
    };
  }
  const apexHqRoute = matchApexHqDomainCommandRoute(normalized);
  if (apexHqRoute && !wantsAgentRequest && !wantsLiveRun && !isFollowUp) {
    return {
      ...base,
      ...apexHqRoute,
      section: apexHqRoute.section || "apex",
      commandAction: apexHqRoute.commandAction || (apexHqRoute.moduleId ? "open-apex-hq-module" : wantsRouteOpen ? "open-section" : "answer"),
      suggestedActions: apexHqRoute.moduleId
        ? [apexHqRoute.actionLabel, "Answer from memory", "Summarize state"]
        : [apexHqRoute.actionLabel, "Answer from memory", "Open matched room"],
    };
  }
  const activeRunStatus = String(activeRun?.status || "").toLowerCase();
  const hasActiveRun = Boolean(activeRun?.id) && !["archived"].includes(activeRunStatus);
  const activeRunTitle = String(activeRun?.title || activeRun?.request || "the active private run").trim();
  const moveTitle = String(nextPrivateMove?.title || nextPrivateMove?.buttonLabel || "next private safe move").trim();
  const wantsMissionBrief = hasAny(["mission brief", "mission status", "mission report", "operator report", "status report", "full status", "brief the mission", "give me the mission", "what's the mission", "what is the mission"])
    || /\b(give|show|speak|read|brief)\b.*\b(mission|status report|operator report|full status)\b/i.test(normalized);
  if (wantsMissionBrief) {
    return {
      ...base,
      id: "mission-brief",
      label: "Mission brief",
      section: "apex",
      detail: hasActiveRun
        ? `Apex will brief ${activeRunTitle}, the heartbeat, top signal, run memory, and next private move: ${moveTitle}.`
        : "Apex will brief the current operator signal, trusted run memory, and next safe private move.",
      actionLabel: "Mission Brief",
      commandAction: "speak-mission-brief",
      intent: "mission-brief",
      suggestedActions: hasActiveRun ? ["Mission Brief", "Next safe move", "Speak handback", "Report done"] : ["Mission Brief", "Start private run", "Brief me"],
      tone: hasActiveRun ? "green" : "blue",
    };
  }
  const wantsWatchOfficer = hasAny([
    "watch officer",
    "watch report",
    "standing watch",
    "keep watch",
    "what changed",
    "anything changed",
    "what did you notice",
    "what are you watching",
    "what do you see",
    "what needs attention",
    "what needs my attention",
    "what should i watch",
  ]) || /\b(what|anything|something)\b.*\b(changed|new|noticed|watching|attention)\b/i.test(normalized);
  if (wantsWatchOfficer) {
    return {
      ...base,
      id: "watch-officer",
      label: "Watch officer",
      section: "apex",
      detail: hasActiveRun
        ? `Apex will report what changed around ${activeRunTitle}, why it matters, and the next safe private move: ${moveTitle}.`
        : "Apex will report the current standing watch, top signal, memory posture, and next safe private move.",
      actionLabel: "Watch Report",
      commandAction: "speak-watch-officer",
      intent: "watch-officer",
      suggestedActions: hasActiveRun ? ["Watch Report", "Speak handback", "Next safe move", "Draft memory"] : ["Watch Report", "Mission Brief", "Start private run"],
      tone: hasActiveRun ? "green" : "blue",
    };
  }
  const wantsActiveRunClosingReport = hasActiveRun && (
    hasAny(["closing report", "closeout report", "close out report", "final report", "operator closing", "operator closeout", "run closing", "run closeout", "closing handback", "what did you finish", "what is finished", "what got finished"])
    || /\b(give|show|speak|read|tell)\b.*\b(closing|closeout|close out|final)\b.*\b(report|handback|run)\b/i.test(normalized)
    || /\bwhat\b.*\b(finished|completed|closed|wrapped)\b/i.test(normalized)
  );
  const wantsActiveRunHandback = hasActiveRun && (
    hasAny(["handback", "speak handback", "run handback", "active run check-in", "run check-in", "check-in", "check in", "heartbeat", "live run progress", "what did you do", "what have you done", "report back", "status of this run", "where is this run"])
    || /\b(tell|show|speak|give)\b.*\b(handback|status|check-?in|heartbeat|progress|what you did|run report)\b/i.test(normalized)
  );
  const wantsActiveRunReportDone = hasActiveRun && (
    hasAny(["report done", "mark done", "mark it done", "mark this done", "finish the run", "close the run"])
    || /\b(mark|report|call|set)\b.*\b(done|complete|completed|finished)\b/i.test(normalized)
  );
  const wantsActiveRunBlocked = hasActiveRun && (
    hasAny(["block this run", "mark blocked", "mark it blocked", "this is blocked", "keep it blocked", "hold this run"])
    || /\b(block|blocked|hold)\b.*\b(run|it|this)\b/i.test(normalized)
  );
  const wantsActiveRunWaitingApproval = hasActiveRun && (
    hasAny(["waiting approval", "wait for approval", "hold for approval", "manual review", "approval gate", "wait at review"])
    || /\b(wait|hold|stop)\b.*\b(approval|manual review|review gate)\b/i.test(normalized)
  );
  const wantsActiveRunProof = hasActiveRun && (
    hasAny(["proof check", "check proof", "verify this run", "validate this run", "proof this run"])
    || /\b(proof|verify|validate|check)\b.*\b(run|it|this|evidence)\b/i.test(normalized)
  );
  const wantsActiveRunAutoDrive = hasActiveRun && (
    hasAny(["auto drive", "auto-drive", "drive it", "work it forward", "let apex work", "let it work"])
    || /\b(auto|drive|work)\b.*\b(next|run|step|move|forward)\b/i.test(normalized)
  );
  const wantsActiveRunAdvance = hasActiveRun && (
    hasAny(["continue", "keep going", "next safe move", "next private move", "next step", "advance", "move forward", "work the next step"])
    || /\b(continue|advance|work|do|run)\b.*\b(next|safe|move|step)\b/i.test(normalized)
  );

  if (wantsActiveRunClosingReport || wantsActiveRunHandback || wantsActiveRunReportDone || wantsActiveRunBlocked || wantsActiveRunWaitingApproval || wantsActiveRunProof || wantsActiveRunAutoDrive || wantsActiveRunAdvance) {
    const commandAction = wantsActiveRunClosingReport
      ? "speak-closing-report"
      : wantsActiveRunReportDone
      ? "report-active-run-done"
      : wantsActiveRunBlocked
        ? "block-active-run"
        : wantsActiveRunWaitingApproval
          ? "wait-active-run-approval"
          : wantsActiveRunHandback
            ? "speak-active-run-handback"
            : wantsActiveRunAutoDrive
              ? "auto-drive-active-run"
              : wantsActiveRunProof
                ? "proof-active-run"
                : "advance-active-run";
    const actionLabel = commandAction === "speak-closing-report"
      ? "Closing Report"
      : commandAction === "report-active-run-done"
      ? "Report Done"
      : commandAction === "block-active-run"
        ? "Block Run"
        : commandAction === "wait-active-run-approval"
          ? "Hold Review"
          : commandAction === "speak-active-run-handback"
            ? "Speak Handback"
            : commandAction === "auto-drive-active-run"
              ? "Auto Drive"
              : commandAction === "proof-active-run"
                ? "Proof Check"
                : "Next Safe Move";
    return {
      ...base,
      id: "active-run-follow-up",
      label: "Active run",
      section: "apex",
      detail: `Apex matched this to ${activeRunTitle}. Next private move: ${moveTitle}. It will use the saved run ledger and stop before consequential actions.`,
      actionLabel,
      commandAction,
      intent: "active-run-follow-up",
      suggestedActions: ["Next safe move", "Closing report", "Report done", "Block run"],
      tone: commandAction === "block-active-run" ? "red" : commandAction === "wait-active-run-approval" ? "amber" : "green",
    };
  }

  if (isFollowUp) {
    const wantsDraftFollowUp = previousRoute.id === "agent-control" && /\b(yes|yeah|yep|do it|draft it|make it|create it|request it)\b/i.test(normalized);
    const wantsLiveRunFollowUp = wantsLiveRun || /\b(do it|get it done|handle it|work it|start it|run it|make it happen)\b/i.test(normalized);
    return {
      ...base,
      ...previousRoute,
      id: wantsDraftFollowUp && !wantsLiveRunFollowUp ? "agent-control" : previousRoute.id,
      detail: wantsLiveRunFollowUp
        ? `Apex treated this as a follow-up to ${previousRoute.label || "the last command"} and will start a private live run, cycle safe internal prep/proof, and stop at manual review.`
        : wantsDraftFollowUp
        ? "Apex treated this as a follow-up to the agent request and will draft a locked request only."
        : `Apex treated this as a follow-up to ${previousRoute.label || "the last command"}.`,
      commandAction: wantsLiveRunFollowUp ? "start-live-operator-run" : wantsDraftFollowUp ? "draft-agent-control-request" : wantsRouteOpen ? "open-section" : "answer",
      suggestedActions: wantsLiveRunFollowUp ? ["Start private run", "Open matched room"] : wantsDraftFollowUp ? ["Draft locked request", "Open agents"] : previousRoute.suggestedActions || base.suggestedActions,
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
      commandAction: wantsLiveRun ? "start-live-operator-run" : wantsRouteOpen ? "open-section" : "answer",
      intent: "approval-review",
      suggestedActions: wantsLiveRun ? ["Start private run", "Open approvals"] : base.suggestedActions,
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
      commandAction: wantsLiveRun ? "start-live-operator-run" : wantsRouteOpen ? "open-section" : "answer",
      intent: "release-readiness",
      suggestedActions: wantsLiveRun ? ["Start private run", "Open release"] : base.suggestedActions,
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
      commandAction: wantsLiveRun ? "start-live-operator-run" : wantsAgentRequest ? "draft-agent-control-request" : wantsRouteOpen ? "open-section" : "answer",
      intent: "agent-control",
      suggestedActions: wantsLiveRun ? ["Start private run", "Draft locked request", "Open agents"] : wantsAgentRequest ? ["Draft locked request", "Open agents"] : ["Answer from memory", "Open agents"],
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
      commandAction: wantsLiveRun ? "start-live-operator-run" : wantsRouteOpen ? "open-section" : "answer",
      intent: "business-ops",
      suggestedActions: wantsLiveRun ? ["Start private run", "Open business"] : base.suggestedActions,
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
      commandAction: wantsLiveRun ? "start-live-operator-run" : wantsRouteOpen ? "open-section" : "answer",
      intent: "personal-operating-layer",
      suggestedActions: wantsLiveRun ? ["Start private run", "Open personal"] : base.suggestedActions,
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
      commandAction: wantsLiveRun ? "start-live-operator-run" : wantsRouteOpen ? "open-section" : "answer",
      intent: "trust-hardening",
      suggestedActions: wantsLiveRun ? ["Start private run", "Open trust"] : base.suggestedActions,
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
      commandAction: wantsLiveRun ? "start-live-operator-run" : wantsRouteOpen ? "open-section" : "answer",
      intent: "decision-memory",
      suggestedActions: wantsLiveRun ? ["Start private run", "Open memory"] : base.suggestedActions,
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
      commandAction: wantsLiveRun ? "start-live-operator-run" : wantsRouteOpen ? "open-section" : "answer",
      intent: "command-overview",
      suggestedActions: wantsLiveRun ? ["Start private run", "Open overview"] : base.suggestedActions,
      tone: "blue",
    };
  }

  return {
    ...base,
    id: "ask-apex",
    label: "Ask Apex",
    section: "apex",
    detail: wantsLiveRun
      ? "Apex will start a private live run, cycle safe internal prep/proof, and stop at manual review."
      : "Apex will answer from the full private command-room context.",
    actionLabel: "Stay with Apex",
    commandAction: wantsLiveRun ? "start-live-operator-run" : "answer",
    intent: "ask-apex",
    suggestedActions: wantsLiveRun ? ["Start private run", "Brief me"] : ["Answer from memory", "Brief me"],
    tone: "green",
  };
}

function buildApexCockpitTurnMemory(turns = []) {
  const visibleTurns = Array.isArray(turns) ? turns.filter((turn) => turn?.question).slice(0, 4) : [];
  if (!visibleTurns.length) return "No prior turns in this page session.";
  return visibleTurns
    .map((turn, index) => {
      const question = apexCockpitMemoryText(turn.question || "", 140);
      const answer = turn.answerSnippet ? ` Apex answered: ${apexCockpitMemoryText(turn.answerSnippet, 150)}` : "";
      return `${index + 1}. ${turn.source || "typed"} -> ${turn.routeLabel || "Ask Apex"} (${turn.status || "recorded"}): ${question}${answer}`;
    })
    .join("\n");
}

function buildApexCockpitLiveRunMemoryContext(liveOperatorMemory = {}) {
  const rows = Array.isArray(liveOperatorMemory.latestRows) ? liveOperatorMemory.latestRows.slice(0, 4) : [];
  if (!rows.length) return "No reviewed live-run memory yet.";
  return rows
    .map((row, index) => `${index + 1}. ${row.status || "memory"} -> ${row.title}: ${String(row.detail || "").slice(0, 160)}`)
    .join("\n");
}

function resolveApexCockpitLatestTrustedRunMemory(liveOperatorMemory = {}) {
  const rows = Array.isArray(liveOperatorMemory.latestRows) ? liveOperatorMemory.latestRows : [];
  return rows.find((row) => row?.title) || null;
}

function buildApexCockpitConversationContext({
  turns = [],
  lastQuestion = "",
  lastAnswerText = "",
  lastRoute = {},
  activeRun = null,
  nextPrivateMove = null,
  interrupted = false,
  retryCount = 0,
  retryReason = "",
} = {}) {
  const safeLastQuestion = apexCockpitMemoryText(lastQuestion, 260);
  const safeLastAnswer = apexCockpitMemoryText(lastAnswerText, 360);
  const routeLabel = apexCockpitMemoryText(lastRoute?.label || "", 120);
  const routeDetail = apexCockpitMemoryText(lastRoute?.detail || "", 260);
  const activeRunTitle = apexCockpitMemoryText(activeRun?.title || activeRun?.request || "", 180);
  const activeRunStatus = apexCockpitMemoryText(activeRun?.status || "", 80);
  const moveTitle = apexCockpitMemoryText(nextPrivateMove?.title || nextPrivateMove?.buttonLabel || "", 160);
  const moveDetail = apexCockpitMemoryText(nextPrivateMove?.detail || nextPrivateMove?.description || nextPrivateMove?.nextSafeAction || "", 240);
  return [
    "Live conversation continuity:",
    "Treat short follow-ups like yes, do it, that, it, keep going, what about that, and go ahead as referring to the last Apex answer, matched room, and active private run unless the operator clearly redirects.",
    safeLastQuestion ? `Last operator request: ${safeLastQuestion}` : "Last operator request: none yet in this page session.",
    safeLastAnswer ? `Last Apex answer summary: ${safeLastAnswer}` : "Last Apex answer summary: none yet.",
    routeLabel ? `Last matched room/action: ${routeLabel}${routeDetail ? ` - ${routeDetail}` : ""}` : "Last matched room/action: Ask Apex.",
    activeRunTitle ? `Active private run: ${activeRunTitle} (${activeRunStatus || "review"}).` : "Active private run: none selected.",
    moveTitle ? `Next private move: ${moveTitle}${moveDetail ? ` - ${moveDetail}` : ""}` : "Next private move: none.",
    interrupted ? "Continuity event: the operator interrupted Apex; answer the new request first and do not continue the prior speech." : "",
    retryCount ? `Voice retry context: ${retryCount} retry turn${Number(retryCount) === 1 ? "" : "s"} reopened. Latest reason: ${apexCockpitMemoryText(retryReason || "Apex retried the last voice turn.", 180)}` : "",
    `Recent page conversation:\n${buildApexCockpitTurnMemory(turns)}`,
  ].filter(Boolean).join("\n").slice(0, 2400);
}

function buildApexCockpitVisibleConversationContext({
  turns = [],
  lastQuestion = "",
  answerText = "",
  route = {},
  activeRun = null,
  nextPrivateMove = null,
  interruptionCount = 0,
  retryCount = 0,
  retryReason = "",
} = {}) {
  const latestTurn = Array.isArray(turns) ? turns[0] || null : null;
  const routeLabel = route?.label || latestTurn?.routeLabel || "Ask Apex";
  const routeDetail = route?.detail || "";
  const question = lastQuestion || latestTurn?.question || "";
  const answer = answerText || latestTurn?.answerSnippet || "";
  const activeRunTitle = activeRun?.title || activeRun?.request || "";
  const moveTitle = nextPrivateMove?.title || nextPrivateMove?.buttonLabel || "";
  const hasContinuity = Boolean(question || answer || latestTurn || activeRunTitle);
  const status = retryCount
    ? "Retry-aware"
    : interruptionCount
      ? "Interrupt-aware"
      : hasContinuity
        ? "Following"
        : "Ready";
  const tone = retryCount ? "amber" : interruptionCount ? "green" : hasContinuity ? "blue" : "slate";
  return {
    status,
    tone,
    title: hasContinuity ? `Following ${routeLabel}` : "Ready for the first turn",
    detail: question
      ? `Last turn: ${apexCockpitMemoryText(question, 160)}`
      : "Apex will carry the last answer, matched room, and active run into the next short follow-up.",
    answer: answer ? `Last answer: ${apexCockpitMemoryText(answer, 180)}` : "No prior answer loaded yet.",
    rows: [
      { label: "Thread", value: status, tone },
      { label: "Route", value: routeLabel, tone: routeLabel === "Ask Apex" ? "slate" : "blue" },
      { label: "Run", value: activeRunTitle ? "Active" : "None", tone: activeRunTitle ? "green" : "slate" },
      { label: "Move", value: moveTitle || "Review", tone: moveTitle ? "amber" : "slate" },
    ],
    routeDetail,
    retryReason: retryCount ? apexCockpitMemoryText(retryReason || "Apex retried the last voice turn.", 180) : "",
  };
}

function buildApexCockpitProactiveBriefing(state = {}) {
  const blockerCount = state.launchReadiness?.blockedCount || state.approvalCommandCenter?.packetSummary?.blocked || 0;
  const agentCount = state.agentControlPlane?.roleCount || state.agentWorkQueue?.availableTaskCount || 0;
  const memoryCount = state.decisionMemory?.durableCount || state.decisionMemory?.decisionCount || 0;
  const trustedRunMemoryCount = state.liveOperatorMemory?.trustedCount || state.liveOperatorMode?.trustedRunMemoryCount || 0;
  const pendingRunMemoryCount = state.liveOperatorMemory?.suggestedCount || state.liveOperatorMode?.pendingRunMemoryCount || 0;
  const latestRunMemory = resolveApexCockpitLatestTrustedRunMemory(state.liveOperatorMemory || state.liveOperatorMode?.runMemory || {});
  const releaseStatus = state.releaseDesk?.status || "Healthy";
  const moneyReady = state.kpis?.find((item) => /money/i.test(item.title || ""))?.value || state.todayCommandCenter?.moneyReadyCount || 0;
  const operatorName = resolveApexPrivateOperatorDisplayName(state.operatorName);
  return [
    `Apex briefing for ${operatorName}.`,
    `${moneyReady} money-ready item${Number(moneyReady) === 1 ? "" : "s"} are visible.`,
    `${blockerCount} blocker${blockerCount === 1 ? "" : "s"} are open.`,
    `${agentCount} agent signal${agentCount === 1 ? "" : "s"} are active.`,
    `${memoryCount} trusted memor${memoryCount === 1 ? "y" : "ies"} are available.`,
    `${trustedRunMemoryCount} trusted live-run memor${trustedRunMemoryCount === 1 ? "y" : "ies"} and ${pendingRunMemoryCount} suggested run memor${pendingRunMemoryCount === 1 ? "y" : "ies"} are visible.`,
    latestRunMemory ? `Latest trusted run history: ${latestRunMemory.title}. I can continue from that reviewed outcome when you ask.` : "",
    `Release health reads ${releaseStatus}.`,
    "I act privately for reversible internal work and interrupt only for consequential actions like sends, spend, orders, booking, deploys, production, schema/auth/session, deletion, secrets, permission changes, or customer-visible work.",
  ].filter(Boolean).join(" ");
}

function buildApexCockpitQuestionEnvelope(question, {
  personalityMode = "operator",
  route,
  memoryCount = 0,
  liveOperatorMemory = {},
  turns = [],
  lastQuestion = "",
  lastAnswerText = "",
  lastRoute = {},
  activeRun = null,
  nextPrivateMove = null,
  interrupted = false,
  retryCount = 0,
  retryReason = "",
} = {}) {
  const personality = findApexCockpitPersonalityMode(personalityMode);
  return [
    "Apex Life operator mode.",
    personality.prompt,
    `Matched room: ${route?.label || "Ask Apex"}.`,
    `Trusted memory count visible: ${memoryCount}.`,
    `Reviewed live-run memory:\n${buildApexCockpitLiveRunMemoryContext(liveOperatorMemory)}`,
    buildApexCockpitConversationContext({
      turns,
      lastQuestion,
      lastAnswerText,
      lastRoute,
      activeRun,
      nextPrivateMove,
      interrupted,
      retryCount,
      retryReason,
    }),
    interrupted ? "The operator interrupted Apex while it was speaking. Stop the prior answer, prioritize this new request, and answer naturally from the updated context." : "",
    `User request: ${String(question || "").trim()}`,
  ].filter(Boolean).join("\n").slice(0, 2600);
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
    operatorNote: "Created by Apex Life command routing. Consequential actions require the gated workflow.",
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

function buildApexCockpitRunMemoryDraft({ run = {}, resultReport = "" } = {}) {
  const safeTitle = apexCockpitSafeMemoryText(run.title || run.request || "Apex live operator run", 120);
  const safeRequest = apexCockpitSafeMemoryText(run.request || safeTitle, 650);
  const safeResult = apexCockpitSafeMemoryText(resultReport || run.resultReport || "Apex completed a private operator run and stopped at manual review.", 800);
  const evidenceRows = (Array.isArray(run.evidence) ? run.evidence : [])
    .map((item) => apexCockpitSafeMemoryText(item, 180))
    .filter(Boolean)
    .slice(0, 5);
  const stepRows = (Array.isArray(run.steps) ? run.steps : [])
    .map((step) => `${apexCockpitSafeMemoryText(step?.title || step?.id || "Step", 80)}: ${apexCockpitSafeMemoryText(step?.status || "review", 60)}`)
    .filter(Boolean)
    .slice(0, 7);
  const sourceKey = apexCockpitMemoryText(run.id || `${Date.now()}`, 90).replace(/[^a-z0-9_-]+/gi, "-");

  return {
    category: "decision",
    title: apexCockpitMemoryText(`Apex run result: ${safeTitle}`, 140),
    body: apexCockpitMemoryText([
      `Operator run: ${safeTitle}`,
      `Request: ${safeRequest}`,
      `Route: ${apexCockpitSafeMemoryText(run.routeLabel || "Apex", 100)}`,
      `Result report: ${safeResult}`,
      stepRows.length ? `Run steps: ${stepRows.join("; ")}` : "Run steps: Not captured.",
      evidenceRows.length ? `Evidence: ${evidenceRows.join("; ")}` : "Evidence: No extra evidence captured.",
      `Next safe action: ${apexCockpitSafeMemoryText(run.nextSafeAction || "Review this run memory before trusting it.", 240)}`,
      "Safety: Suggested memory only; nothing external was executed.",
    ].join(" "), 1800),
    sourceType: "apex-live-operator-run",
    sourceLabel: "Apex Live Operator Mode",
    sourceUri: `apex-life://run/${sourceKey}`,
    status: "suggested",
    reviewNote: "Suggested from Apex Live Operator Mode run result; manual approval required before trusted memory.",
    confidence: 80,
  };
}

function buildApexCockpitLiveOperatorMemorySnapshot(memoryRows = []) {
  const summary = summarizeApexOsLiveOperatorMemory(memoryRows, { limit: 8 });
  const toReviewRow = (entry, tone = "amber") => ({
    id: entry.id,
    title: entry.title,
    status: entry.status,
    detail: apexCockpitMemoryText(entry.body, 260),
    body: entry.body,
    tone,
    sourceLabel: entry.sourceLabel,
    source: entry.sourceUri,
    sourceUri: entry.sourceUri,
    sourceType: entry.sourceType,
    reviewedAt: entry.reviewedAt,
    reviewNote: entry.reviewNote,
  });

  return {
    status: summary.approved ? "Trusted run history" : summary.suggested ? "Run memory review" : "Run memory ready",
    tone: summary.approved ? "green" : summary.suggested ? "amber" : "blue",
    totalCount: summary.total,
    trustedCount: summary.approved,
    suggestedCount: summary.suggested,
    archivedCount: summary.archived,
    turnCount: summary.turnCount,
    runCount: summary.runCount,
    proactiveCheckInCount: summary.proactiveCheckInCount,
    sourceCount: summary.sourceCount,
    latestTrustedAt: summary.latestTrustedAt,
    latestSuggestedAt: summary.latestSuggestedAt,
    sourceOptions: summary.sourceLabels,
    latestRows: summary.trustedRows.map((entry) => ({
      id: entry.id,
      title: entry.title,
      status: entry.kind,
      detail: apexCockpitMemoryText(entry.body, 260),
      body: entry.body,
      tone: "green",
      sourceLabel: entry.sourceLabel,
      source: entry.sourceUri,
      sourceUri: entry.sourceUri,
      sourceType: entry.sourceType,
      reviewedAt: entry.reviewedAt,
      reviewNote: entry.reviewNote,
    })),
    reviewRows: [
      ...summary.pendingRows.map((entry) => toReviewRow(entry, "amber")),
      ...summary.trustedRows.map((entry) => toReviewRow(entry, "green")),
    ].slice(0, 10),
  };
}

function findApexCockpitRunMemoryReviewRow(run = {}, liveOperatorMemory = {}) {
  if (!run?.id) return null;
  const sourceKey = `apex-life://run/${apexCockpitMemoryText(run.id, 90).replace(/[^a-z0-9_-]+/gi, "-")}`;
  const rows = [
    ...(Array.isArray(liveOperatorMemory.reviewRows) ? liveOperatorMemory.reviewRows : []),
    ...(Array.isArray(liveOperatorMemory.latestRows) ? liveOperatorMemory.latestRows : []),
  ].filter(Boolean);
  return rows.find((row) => (
    row.id === run.decisionMemoryId
    || row.source === sourceKey
    || row.sourceUri === sourceKey
    || String(row.source || row.sourceUri || "").endsWith(`/${run.id}`)
  )) || null;
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

const APEX_LIFE_MOUTH_BARS = Object.freeze([6, 11, 16, 9, 18, 12, 7]);
const APEX_LIFE_SPECTRUM_BARS = Object.freeze([9, 15, 10, 22, 13, 28, 16, 24, 12, 20, 14, 26, 11, 18]);
const APEX_LIFE_DATA_STREAMS = Object.freeze(["one", "two", "three", "four", "five", "six"]);
const APEX_COCKPIT_INTELLIGENCE_MODEL_URL = "/assets/apex-avatar/apex-intelligence-live-web-1536.glb";
const APEX_COCKPIT_INTELLIGENCE_MOBILE_MODEL_URL = "/assets/apex-avatar/apex-intelligence-live-web-1024.glb";
const APEX_COCKPIT_INTELLIGENCE_MASTER_MODEL_URL = "/assets/apex-avatar/apex-intelligence-idle-app-ready.glb";
const APEX_COCKPIT_INTELLIGENCE_FALLBACK_MODEL_URL = "/assets/apex-avatar/apex-assistant.glb";
const APEX_COCKPIT_INTELLIGENCE_STATES = Object.freeze({
  standby: { color: 0x94a3b8, accent: 0x38bdf8, energy: 0.14, speed: 0.68, motion: 0.16 },
  listening: { color: 0x67e8f9, accent: 0xfb923c, energy: 0.28, speed: 0.82, motion: 0.28 },
  hearing: { color: 0x6ee7b7, accent: 0x67e8f9, energy: 0.58, speed: 1.05, motion: 0.72 },
  thinking: { color: 0x38bdf8, accent: 0xa5f3fc, energy: 0.44, speed: 0.96, motion: 0.5 },
  speaking: { color: 0xfb923c, accent: 0x67e8f9, energy: 0.74, speed: 1.18, motion: 0.9 },
  blocked: { color: 0xf87171, accent: 0xfca5a5, energy: 0.24, speed: 0.55, motion: 0.18 },
});
const APEX_COCKPIT_INTELLIGENCE_CLIP_BY_STATE = Object.freeze({
  standby: "Idle",
  listening: "Listening",
  hearing: "Hearing",
  thinking: "Thinking",
  speaking: "Speaking",
  blocked: "Alert",
});
const APEX_COCKPIT_INTELLIGENCE_REQUIRED_CLIPS = Object.freeze([
  "Idle",
  "Listening",
  "Hearing",
  "Thinking",
  "Speaking",
  "Blocked",
  "Alert",
]);

function clampApexCockpitUnit(value, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.min(1, number));
}

function createApexCockpitGlowMaterial(color = 0x67e8f9, opacity = 0.42) {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
}

function createApexCockpitRing(radius, color, opacity = 0.22) {
  const geometry = new THREE.TorusGeometry(radius, 0.007, 8, 120);
  return new THREE.Mesh(geometry, createApexCockpitGlowMaterial(color, opacity));
}

function cloneApexCockpitModelMaterial(material, { preserveTexture = true } = {}) {
  const cloned = material?.clone ? material.clone() : new THREE.MeshStandardMaterial({ color: 0x101827, metalness: 0.72, roughness: 0.38 });
  cloned.side = THREE.DoubleSide;
  if (cloned.map && THREE.SRGBColorSpace) cloned.map.colorSpace = THREE.SRGBColorSpace;
  if ("metalness" in cloned) cloned.metalness = Math.max(cloned.metalness ?? 0, preserveTexture ? 0.58 : 0.2);
  if ("roughness" in cloned) cloned.roughness = Math.min(Math.max(cloned.roughness ?? 0.42, 0.24), 0.62);
  if ("emissive" in cloned) {
    cloned.emissive = cloned.emissive || new THREE.Color(0x000000);
    cloned.emissiveIntensity = Math.max(cloned.emissiveIntensity ?? 0, preserveTexture ? 0.08 : 0.16);
  }
  if (!preserveTexture) {
    cloned.transparent = true;
    cloned.opacity = 0.28;
    cloned.blending = THREE.AdditiveBlending;
    cloned.depthWrite = false;
  } else {
    cloned.transparent = false;
    cloned.opacity = 1;
    cloned.depthWrite = true;
  }
  cloned.userData.apexCockpitBaseColor = cloned.color?.clone?.() || new THREE.Color(0x101827);
  cloned.userData.apexCockpitBaseEmissive = cloned.emissive?.clone?.() || new THREE.Color(0x000000);
  cloned.userData.apexCockpitBaseOpacity = typeof cloned.opacity === "number" ? cloned.opacity : 1;
  cloned.needsUpdate = true;
  return cloned;
}

function disposeApexCockpitThreeObject(object) {
  object.traverse((node) => {
    if (node.geometry) node.geometry.dispose();
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.filter(Boolean).forEach((material) => {
      ["map", "emissiveMap", "normalMap", "roughnessMap", "metalnessMap", "aoMap", "alphaMap"].forEach((key) => {
        if (material[key]?.dispose) material[key].dispose();
      });
      material.dispose();
    });
  });
}

function ApexCockpitIntelligenceAvatar({ voiceMode = "listening", voiceLevel = 0 }) {
  const canvasRef = useRef(null);
  const modeRef = useRef(APEX_COCKPIT_VOICE_STATES[voiceMode] ? voiceMode : "listening");
  const levelRef = useRef(clampApexCockpitUnit(voiceLevel));

  useEffect(() => {
    modeRef.current = APEX_COCKPIT_VOICE_STATES[voiceMode] ? voiceMode : "listening";
    levelRef.current = clampApexCockpitUnit(voiceLevel);
  }, [voiceLevel, voiceMode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof window === "undefined") return undefined;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
      });
    } catch {
      return undefined;
    }

    if (THREE.SRGBColorSpace) renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setClearColor(0x020617, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 80);
    camera.position.set(0, 0.18, 6.55);

    const root = new THREE.Group();
    root.position.y = -0.12;
    root.userData.mobile = false;
    scene.add(root);

    const assetRigGroup = new THREE.Group();
    assetRigGroup.name = "ApexCockpitIntelligenceGLB";
    assetRigGroup.visible = false;
    root.add(assetRigGroup);

    const overlayGroup = new THREE.Group();
    overlayGroup.name = "ApexCockpitIntelligenceLiveOverlay";
    overlayGroup.visible = false;
    root.add(overlayGroup);

    const ambient = new THREE.AmbientLight(0x67e8f9, 0.8);
    scene.add(ambient);
    const keyLight = new THREE.PointLight(0xfb923c, 3.4, 14);
    keyLight.position.set(1.9, 2.25, 3.7);
    scene.add(keyLight);
    const cyanLight = new THREE.PointLight(0x67e8f9, 2.7, 14);
    cyanLight.position.set(-2.1, 1.35, 2.9);
    scene.add(cyanLight);
    const backLight = new THREE.PointLight(0x38bdf8, 1.2, 10);
    backLight.position.set(0, 1.1, -3.2);
    scene.add(backLight);

    const awarenessLine = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.022, 0.018), createApexCockpitGlowMaterial(0x67e8f9, 0.72));
    awarenessLine.position.set(0, 1.15, 0.73);
    overlayGroup.add(awarenessLine);
    const awarenessGlow = new THREE.Mesh(new THREE.PlaneGeometry(1.08, 0.07), createApexCockpitGlowMaterial(0x67e8f9, 0.04));
    awarenessGlow.position.set(0, 1.15, 0.725);
    overlayGroup.add(awarenessGlow);

    const coreRing = createApexCockpitRing(0.2, 0x67e8f9, 0.36);
    coreRing.position.set(0, 0.02, 0.74);
    overlayGroup.add(coreRing);
    const coreInnerRing = createApexCockpitRing(0.105, 0xfb923c, 0.3);
    coreInnerRing.position.copy(coreRing.position);
    overlayGroup.add(coreInnerRing);
    const coreDot = new THREE.Mesh(new THREE.SphereGeometry(0.038, 16, 8), createApexCockpitGlowMaterial(0x67e8f9, 0.82));
    coreDot.position.set(0, 0.02, 0.765);
    overlayGroup.add(coreDot);

    const baseRingGroup = new THREE.Group();
    baseRingGroup.position.set(0, -1.2, 0.02);
    overlayGroup.add(baseRingGroup);
    const baseRings = [0.74, 1.08, 1.42].map((radius, index) => {
      const ring = createApexCockpitRing(radius, index === 1 ? 0xfb923c : 0x67e8f9, 0.11);
      ring.rotation.x = Math.PI / 2;
      baseRingGroup.add(ring);
      return ring;
    });

    const shoulderScan = new THREE.Mesh(new THREE.TorusGeometry(1.18, 0.006, 8, 128, Math.PI * 1.04), createApexCockpitGlowMaterial(0x67e8f9, 0.18));
    shoulderScan.position.set(0, 0.34, 0.58);
    shoulderScan.rotation.set(Math.PI, 0, 0);
    shoulderScan.scale.set(1, 0.24, 1);
    overlayGroup.add(shoulderScan);

    let disposed = false;
    let modelReady = false;
    let assetMixer = null;
    let animationFrame = 0;
    let lastFrameElapsed = 0;
    let smoothedEnergy = levelRef.current;
    const assetMaterials = [];
    const assetActions = new Map();
    let activeAssetAction = null;
    let activeAssetClipName = "";
    const assetLoader = new GLTFLoader();

    function resolveAssetClipName(currentMode) {
      const preferred = APEX_COCKPIT_INTELLIGENCE_CLIP_BY_STATE[currentMode] || "Idle";
      if (assetActions.has(preferred)) return preferred;
      if (currentMode === "blocked" && assetActions.has("Blocked")) return "Blocked";
      if (assetActions.has("Idle")) return "Idle";
      return assetActions.keys().next().value || "";
    }

    function playAssetStateClip(currentMode, { immediate = false } = {}) {
      if (!assetMixer || !assetActions.size) return;
      const nextClipName = resolveAssetClipName(currentMode);
      if (!nextClipName || nextClipName === activeAssetClipName) return;
      const nextAction = assetActions.get(nextClipName);
      if (!nextAction) return;

      nextAction.enabled = true;
      nextAction.reset();
      nextAction.setEffectiveTimeScale(1);
      nextAction.setEffectiveWeight(1);
      nextAction.play();

      if (activeAssetAction && activeAssetAction !== nextAction) {
        activeAssetAction.enabled = true;
        activeAssetAction.crossFadeTo(nextAction, immediate ? 0 : 0.36, false);
      } else {
        nextAction.setEffectiveWeight(1);
      }

      activeAssetAction = nextAction;
      activeAssetClipName = nextClipName;
    }

    function loadAvatarModel(url, { fallback = "runtime", preserveTexture = true } = {}) {
      assetLoader.load(
        url,
        (gltf) => {
          if (disposed) return;
          const model = gltf.scene;
          model.name = fallback ? "ApexCockpitFallbackGLBModel" : "ApexCockpitIntelligenceMeshyGLBModel";
          const modelBox = new THREE.Box3().setFromObject(model);
          const modelSize = modelBox.getSize(new THREE.Vector3());
          const modelCenter = modelBox.getCenter(new THREE.Vector3());
          const modelHeight = preserveTexture ? 3.48 : 2.55;
          const modelScale = modelSize.y > 0 ? modelHeight / modelSize.y : 1;
          model.scale.setScalar(modelScale);
          model.position.set(-modelCenter.x * modelScale, -modelBox.min.y * modelScale - 1.33, -modelCenter.z * modelScale + (preserveTexture ? 0.02 : 0.05));

          model.traverse((node) => {
            if (!node.isMesh) return;
            node.castShadow = false;
            node.receiveShadow = false;
            node.frustumCulled = false;
            const sourceMaterialNames = (Array.isArray(node.material) ? node.material : [node.material])
              .filter(Boolean)
              .map((material) => material.name || "")
              .join(" ");
            const materialSignature = `${node.name || ""} ${sourceMaterialNames}`;
            const isEnergySurface = /Visor|Mouth|Jaw|Core|Halo|Ring|Panel|Signal|Line|Emit|Glow|Light/i.test(materialSignature);
            const preparedMaterials = (Array.isArray(node.material) ? node.material : [node.material]).map((material) => {
              const prepared = cloneApexCockpitModelMaterial(material, { preserveTexture });
              prepared.userData.apexCockpitSurface = preserveTexture
                ? isEnergySurface ? "textured-energy" : "textured"
                : isEnergySurface ? "energy" : "armor";
              assetMaterials.push(prepared);
              return prepared;
            });
            node.material = Array.isArray(node.material) ? preparedMaterials : preparedMaterials[0];
          });

          assetRigGroup.add(model);
          assetMixer = gltf.animations?.length ? new THREE.AnimationMixer(model) : null;
          assetActions.clear();
          activeAssetAction = null;
          activeAssetClipName = "";
          if (assetMixer) {
            gltf.animations.forEach((clip) => {
              const clipName = clip.name || `clip-${assetActions.size}`;
              const action = assetMixer.clipAction(clip);
              action.enabled = true;
              action.clampWhenFinished = false;
              action.setLoop(THREE.LoopRepeat, Infinity);
              action.setEffectiveWeight(0);
              assetActions.set(clipName, action);
            });
            playAssetStateClip(modeRef.current, { immediate: true });
          }
          modelReady = true;
          assetRigGroup.visible = true;
          overlayGroup.visible = true;
        },
        undefined,
        () => {
          if (fallback === "runtime" && APEX_COCKPIT_INTELLIGENCE_MASTER_MODEL_URL) {
            loadAvatarModel(APEX_COCKPIT_INTELLIGENCE_MASTER_MODEL_URL, { fallback: "master", preserveTexture: true });
            return;
          }
          if (fallback !== "procedural" && APEX_COCKPIT_INTELLIGENCE_FALLBACK_MODEL_URL) {
            loadAvatarModel(APEX_COCKPIT_INTELLIGENCE_FALLBACK_MODEL_URL, { fallback: "procedural", preserveTexture: false });
          }
        },
      );
    }

    function resize() {
      const parent = canvas.parentElement || canvas;
      const rect = parent.getBoundingClientRect();
      const width = Math.max(1, Math.floor(rect.width));
      const height = Math.max(1, Math.floor(rect.height));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      const mobileFrame = width < 560;
      root.userData.mobile = mobileFrame;
      camera.position.z = mobileFrame ? 7.55 : 6.55;
      camera.position.y = mobileFrame ? 0.08 : 0.18;
      camera.updateProjectionMatrix();
    }

    let resizeObserver = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(canvas.parentElement || canvas);
    } else {
      window.addEventListener("resize", resize);
    }
    resize();
    const initialWidth = Math.max(
      canvas.parentElement?.getBoundingClientRect?.().width || 0,
      window.innerWidth || 0,
    );
    const runtimeModelUrl = initialWidth > 0 && initialWidth < 560
      ? APEX_COCKPIT_INTELLIGENCE_MOBILE_MODEL_URL
      : APEX_COCKPIT_INTELLIGENCE_MODEL_URL;
    loadAvatarModel(runtimeModelUrl, { preserveTexture: true });

    const startTime = performance.now();
    function animate() {
      if (disposed) return;
      const elapsed = (performance.now() - startTime) / 1000;
      const delta = Math.max(0.001, Math.min(0.05, elapsed - lastFrameElapsed || 0.016));
      lastFrameElapsed = elapsed;
      const currentMode = APEX_COCKPIT_VOICE_STATES[modeRef.current] ? modeRef.current : "listening";
      const modeConfig = APEX_COCKPIT_INTELLIGENCE_STATES[currentMode] || APEX_COCKPIT_INTELLIGENCE_STATES.listening;
      const color = new THREE.Color(modeConfig.color);
      const accent = new THREE.Color(modeConfig.accent);
      const speechMode = currentMode === "speaking" || currentMode === "hearing";
      const thinkingMode = currentMode === "thinking";
      const signalPulse = 0.5 + (Math.sin(elapsed * (2.8 + modeConfig.energy * 3.6)) * 0.5);
      const voicePulse = 0.5 + (Math.sin(elapsed * (speechMode ? 9.4 : thinkingMode ? 4.4 : 2.4)) * 0.5);
      const targetEnergy = clampApexCockpitUnit(Math.max(modeConfig.energy, levelRef.current) + signalPulse * (speechMode ? 0.12 : 0.06));
      smoothedEnergy += (targetEnergy - smoothedEnergy) * 0.09;
      const finalEnergy = smoothedEnergy;
      const mobileFrame = Boolean(root.userData.mobile);
      const motion = modeConfig.motion * (0.7 + finalEnergy * 0.65);

      const rootScale = mobileFrame ? 0.74 : 1;
      root.scale.setScalar(rootScale * (1 + voicePulse * motion * 0.008));
      root.rotation.y = Math.sin(elapsed * (0.34 + motion * 0.18)) * (assetMixer ? 0.026 + motion * 0.014 : 0.12 + finalEnergy * 0.05);
      root.rotation.x = Math.sin(elapsed * 0.28) * (0.022 + motion * 0.012);
      root.position.y = (mobileFrame ? 0.2 : -0.12) + Math.sin(elapsed * (1.08 + motion * 0.5)) * (assetMixer ? 0.01 + motion * 0.012 : 0.034 + motion * 0.02);

      if (modelReady) {
        playAssetStateClip(currentMode);
        assetRigGroup.rotation.y = Math.sin(elapsed * (0.46 + motion * 0.24)) * (assetMixer ? 0.024 + motion * 0.012 : 0.12 + finalEnergy * 0.06);
        assetRigGroup.rotation.z = Math.sin(elapsed * (speechMode ? 2.25 : 0.78)) * (0.004 + motion * 0.012);
        assetRigGroup.position.y = Math.sin(elapsed * (1.2 + motion * 0.7)) * (assetMixer ? 0.008 + motion * 0.016 : 0.032 + motion * 0.018);
        assetRigGroup.scale.set(
          1 + voicePulse * motion * 0.012,
          1 + signalPulse * motion * 0.016,
          1 + voicePulse * motion * 0.006,
        );
        if (assetMixer) {
          assetMixer.update(delta * (modeConfig.speed + finalEnergy * 0.34 + (speechMode ? voicePulse * 0.18 : 0)));
        }
      }

      overlayGroup.rotation.copy(assetRigGroup.rotation);
      overlayGroup.position.y = assetRigGroup.position.y;
      overlayGroup.scale.copy(assetRigGroup.scale);
      awarenessLine.material.color.copy(accent);
      awarenessLine.material.opacity = 0.18 + finalEnergy * 0.18 + signalPulse * 0.04 + (speechMode ? voicePulse * 0.08 : 0);
      awarenessLine.scale.x = 0.82 + finalEnergy * 0.12 + (speechMode ? voicePulse * 0.12 : thinkingMode ? signalPulse * 0.08 : 0);
      awarenessGlow.material.color.copy(accent);
      awarenessGlow.material.opacity = 0.008 + finalEnergy * 0.026 + signalPulse * 0.01 + (speechMode ? voicePulse * 0.018 : 0);
      awarenessGlow.scale.set(1 + finalEnergy * 0.06 + motion * 0.04, 1 + signalPulse * 0.08 + voicePulse * motion * 0.18, 1);
      coreRing.material.color.copy(color);
      coreRing.material.opacity = 0.2 + finalEnergy * 0.32 + (speechMode ? voicePulse * 0.08 : 0);
      coreRing.rotation.z += 0.012 + finalEnergy * 0.026 + motion * 0.018;
      coreRing.scale.setScalar(1 + signalPulse * (0.08 + finalEnergy * 0.1) + voicePulse * motion * 0.12);
      coreInnerRing.material.color.copy(accent);
      coreInnerRing.material.opacity = 0.2 + finalEnergy * 0.3 + (speechMode ? voicePulse * 0.06 : 0);
      coreInnerRing.rotation.z -= 0.009 + finalEnergy * 0.02 + motion * 0.014;
      coreDot.material.color.copy(accent);
      coreDot.material.opacity = 0.46 + finalEnergy * 0.38;
      coreDot.scale.setScalar(0.82 + signalPulse * 0.42 + finalEnergy * 0.16 + voicePulse * motion * 0.28);
      shoulderScan.material.color.copy(color);
      shoulderScan.material.opacity = 0.06 + finalEnergy * 0.2 + (speechMode ? voicePulse * 0.06 : 0);
      shoulderScan.rotation.z = Math.sin(elapsed * (0.68 + motion * 0.5)) * (0.06 + motion * 0.08);
      shoulderScan.scale.set(1 + voicePulse * motion * 0.04, 0.24 + signalPulse * motion * 0.035, 1);
      baseRingGroup.rotation.y = Math.sin(elapsed * (0.22 + motion * 0.12)) * (0.08 + motion * 0.06);
      baseRings.forEach((ring, index) => {
        ring.material.color.copy(index === 1 ? accent : color);
        ring.material.opacity = 0.045 + finalEnergy * (0.16 - index * 0.018) + (speechMode ? voicePulse * 0.05 : 0);
        ring.rotation.z += (0.004 + finalEnergy * 0.014 + motion * 0.012) * (index % 2 ? -1 : 1);
        ring.scale.setScalar(1 + Math.sin(elapsed * (1.1 + index * 0.28)) * 0.025 + voicePulse * motion * (0.045 - index * 0.008));
      });

      assetMaterials.forEach((material, index) => {
        const surface = material.userData.apexCockpitSurface || "textured";
        const baseColor = material.userData.apexCockpitBaseColor || new THREE.Color(0x101827);
        const baseEmissive = material.userData.apexCockpitBaseEmissive || new THREE.Color(0x000000);
        if (surface === "textured" || surface === "textured-energy") {
          if (material.color) material.color.copy(baseColor).lerp(surface === "textured-energy" ? accent : color, 0.026 + finalEnergy * 0.044);
          if (material.emissive) {
            material.emissive.copy(baseEmissive).lerp(surface === "textured-energy" ? accent : color, 0.04 + finalEnergy * 0.1 + signalPulse * 0.032);
            material.emissiveIntensity = surface === "textured-energy"
              ? 0.2 + finalEnergy * 0.55 + voicePulse * motion * 0.18
              : 0.08 + finalEnergy * 0.24 + voicePulse * motion * 0.05;
          }
          material.opacity = material.userData.apexCockpitBaseOpacity || 1;
        } else {
          if (material.color) material.color.copy(index % 2 ? accent : color);
          material.opacity = surface === "energy" ? 0.2 + finalEnergy * 0.34 : 0.12 + finalEnergy * 0.22;
        }
      });
      keyLight.color.copy(accent);
      keyLight.intensity = 1.2 + finalEnergy * 4.4 + signalPulse * 0.4 + voicePulse * motion * 1.1;
      cyanLight.color.copy(color);
      cyanLight.intensity = 1.1 + finalEnergy * 3.6 + (thinkingMode ? signalPulse * 0.8 : 0);
      backLight.color.copy(color);
      backLight.intensity = currentMode === "blocked" ? 0.7 : 0.8 + finalEnergy * 1.2;

      renderer.render(scene, camera);
      animationFrame = window.requestAnimationFrame(animate);
    }

    animate();

    return () => {
      disposed = true;
      window.cancelAnimationFrame(animationFrame);
      if (resizeObserver) resizeObserver.disconnect();
      else window.removeEventListener("resize", resize);
      disposeApexCockpitThreeObject(scene);
      renderer.dispose();
    };
  }, []);

  const renderedMode = APEX_COCKPIT_VOICE_STATES[voiceMode] ? voiceMode : "listening";
  const renderedClip = APEX_COCKPIT_INTELLIGENCE_CLIP_BY_STATE[renderedMode] || "Idle";

  return (
    <div
      className="co-apex-life-glb-shell"
      data-apex-intelligence-model="apex-intelligence-live-web"
      data-apex-intelligence-state-clip={renderedClip}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="co-apex-life-glb-canvas" />
    </div>
  );
}

function ApexCockpitAvatar({ voiceMode = "listening", voiceLevel = 0 }) {
  const mode = APEX_COCKPIT_VOICE_STATES[voiceMode] ? voiceMode : "listening";
  const visualState = APEX_COCKPIT_VOICE_STATES[mode];
  const rawLevel = Math.max(0, Math.min(1, Number(voiceLevel || 0) * 6));
  const modeIntensity = {
    standby: 0.08,
    listening: 0.18,
    hearing: 0.52,
    thinking: 0.34,
    speaking: 0.68,
    blocked: 0.12,
  }[mode] || 0.18;
  const levelNumber = Math.max(modeIntensity, rawLevel);
  const level = levelNumber.toFixed(2);
  return (
    <div
      className={`co-apex-life-body co-apex-life-body--${mode} relative mx-auto flex min-h-[360px] w-full max-w-[540px] items-center justify-center overflow-hidden xl:min-h-[385px]`}
      data-voice-state={mode}
      data-intensity={level}
      data-renderer="glb"
      data-model="apex-intelligence-live-web"
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
      <span className="co-apex-life-aura" aria-hidden="true" />
      <span className="co-apex-life-ring co-apex-life-ring--outer" aria-hidden="true" />
      <span className="co-apex-life-ring co-apex-life-ring--inner" aria-hidden="true" />
      <span className="co-apex-life-horizon" aria-hidden="true" />
      <span className="co-apex-life-neural-grid" aria-hidden="true" />
      <ApexCockpitIntelligenceAvatar voiceMode={mode} voiceLevel={levelNumber} />
      <span className="co-apex-life-scan co-apex-life-scan--vertical" aria-hidden="true" />
      <span className="co-apex-life-scan co-apex-life-scan--horizontal" aria-hidden="true" />
      <span className="co-apex-life-data-rain" aria-hidden="true">
        {APEX_LIFE_DATA_STREAMS.map((stream, index) => (
          <span key={stream} className={`co-apex-life-data-stream co-apex-life-data-stream--${stream}`} style={{ "--apex-stream-index": index }} />
        ))}
      </span>
      <span className="co-apex-life-holo-shell" aria-hidden="true" />
      <span className="co-apex-life-humanoid" aria-hidden="true">
        <span className="co-apex-life-head">
          <span className="co-apex-life-head-lines" />
          <span className="co-apex-life-head-mask" />
        </span>
        <span className="co-apex-life-neck" />
        <span className="co-apex-life-shoulders" />
        <span className="co-apex-life-torso">
          <span className="co-apex-life-torso-grid" />
          <span className="co-apex-life-spine" />
          <span className="co-apex-life-core-mount" />
        </span>
        <span className="co-apex-life-arm co-apex-life-arm--left" />
        <span className="co-apex-life-arm co-apex-life-arm--right" />
      </span>
      <span className="co-apex-life-shoulder-trace co-apex-life-shoulder-trace--left" aria-hidden="true" />
      <span className="co-apex-life-shoulder-trace co-apex-life-shoulder-trace--right" aria-hidden="true" />
      <span className="co-apex-life-face-rig" aria-hidden="true">
        <span className="co-apex-life-face-rig__brow" />
        <span className="co-apex-life-face-rig__jaw" />
        <span className="co-apex-life-face-rig__cheek co-apex-life-face-rig__cheek--left" />
        <span className="co-apex-life-face-rig__cheek co-apex-life-face-rig__cheek--right" />
      </span>
      <span className="co-apex-life-eyes" aria-hidden="true" />
      <span className="co-apex-life-mouth" aria-hidden="true">
        {APEX_LIFE_MOUTH_BARS.map((height, index) => (
          <span key={`${height}-${index}`} style={{ "--apex-mouth-index": index, "--apex-mouth-height": `${height}px` }} />
        ))}
      </span>
      <span className="co-apex-life-voice-band" aria-hidden="true" />
      <span className="co-apex-life-core" aria-hidden="true" />
      <span className="co-apex-life-reactor" aria-hidden="true" />
      <span className="co-apex-life-level" aria-hidden="true" />
      <span className="co-apex-life-spectrum" aria-hidden="true">
        {APEX_LIFE_SPECTRUM_BARS.map((height, index) => (
          <span key={`${height}-${index}`} style={{ "--apex-spectrum-index": index, "--apex-spectrum-height": `${height}px` }} />
        ))}
      </span>
      <span className="co-apex-life-status" aria-hidden="true">{visualState.headline.toUpperCase()}</span>
      <span className="sr-only">{visualState.detail}</span>
    </div>
  );
}

function ApexCockpitStageHud({
  voiceMode = "listening",
  voiceHealth = {},
  nowState = {},
  activeRun = null,
  nextPrivateMove = {},
  liveStatus = "",
  liveTone = "blue",
  savedRunCount = 0,
  trustedRunMemoryCount = 0,
  pendingRunMemoryCount = 0,
  releaseHealth = "Healthy",
  onBrief,
  onWatch,
  onPrimaryRunAction,
  onOpenConsole,
  primaryRunDisabled = false,
  primaryRunBusy = false,
}) {
  const safeVoiceMode = APEX_COCKPIT_VOICE_STATES[voiceMode] ? voiceMode : "listening";
  const voiceLabel = voiceHealth?.status || APEX_COCKPIT_VOICE_STATES[safeVoiceMode]?.label || "Listening";
  const runTitle = activeRun?.title || nextPrivateMove?.title || "Private run ready";
  const runStatus = activeRun?.status || nextPrivateMove?.status || "Ready";
  const primaryLabel = primaryRunBusy
    ? "Working"
    : activeRun?.id
      ? nextPrivateMove?.buttonLabel || "Work Next"
      : "Start Run";
  const metricRows = [
    { label: "Voice", value: voiceLabel, tone: voiceHealth?.tone || "blue" },
    { label: "Live Run", value: activeRun?.id ? runStatus : `${savedRunCount || 0} saved`, tone: activeRun?.id ? apexCockpitRunStatusTone(activeRun.status) : savedRunCount ? "green" : "slate" },
    { label: "Memory", value: trustedRunMemoryCount ? `${trustedRunMemoryCount} trusted` : pendingRunMemoryCount ? `${pendingRunMemoryCount} review` : "Ready", tone: trustedRunMemoryCount ? "green" : pendingRunMemoryCount ? "amber" : "slate" },
    { label: "Release", value: releaseHealth || "Healthy", tone: String(releaseHealth || "").toLowerCase().includes("block") ? "red" : "green" },
    { label: "Gate", value: "Consequential", tone: "amber" },
  ];

  return (
    <section className="co-apex-cockpit-stage-hud hidden min-w-0 gap-2 rounded-lg border border-cyan-200/14 bg-slate-950/70 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] xl:grid" aria-label="Apex body-first stage HUD">
      <div className="grid min-w-0 gap-1">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-md border border-orange-300/20 bg-orange-500/10 px-2 py-1 text-[9px] font-black uppercase tracking-[0.1em] text-orange-200">
            <Icon name="spark" className="h-3 w-3" /> Stage View
          </span>
          <ToneBadge tone={nowState?.tone || liveTone}>{nowState?.status || liveStatus || "Online"}</ToneBadge>
          <ApexCockpitStatusDot tone={voiceHealth?.tone || "green"} />
        </div>
        <p className="min-w-0 truncate text-sm font-black text-slate-100">{nowState?.title || "Apex is online"}</p>
        <p className="min-w-0 truncate text-[10px] font-bold leading-4 text-cyan-100">{runTitle}</p>
      </div>
      <div className="co-apex-cockpit-stage-metrics grid min-w-0 gap-1.5" aria-label="Apex stage status chips">
        {metricRows.map((item) => (
          <div key={item.label} className="min-w-0 rounded-md border border-slate-800 bg-slate-900/54 px-2 py-1.5">
            <p className="truncate text-[8px] font-black uppercase tracking-[0.08em] text-slate-500">{item.label}</p>
            <p className={`mt-0.5 truncate text-[10px] font-black ${item.tone === "green" ? "text-emerald-300" : item.tone === "amber" ? "text-orange-300" : item.tone === "red" ? "text-red-300" : item.tone === "blue" ? "text-cyan-300" : "text-slate-300"}`}>{item.value}</p>
          </div>
        ))}
      </div>
      <div className="co-apex-cockpit-stage-command-dock flex min-w-0 flex-wrap items-center justify-end gap-1.5" aria-label="Apex stage command dock">
        <ApexCockpitControlButton className="px-2" disabled={false} onClick={onBrief} active={false} title="Speak Apex briefing from stage view">
          <Icon name="spark" /> Brief
        </ApexCockpitControlButton>
        <ApexCockpitControlButton className="px-2" disabled={false} onClick={onWatch} active={false} title="Speak Apex watch officer from stage view">
          <Icon name="phone" /> Watch
        </ApexCockpitControlButton>
        <ApexCockpitControlButton className="co-apex-cockpit-stage-primary-action px-2" disabled={primaryRunDisabled} onClick={onPrimaryRunAction} active={primaryRunBusy} title="Work the next private safe move from stage view">
          <Icon name={activeRun?.id ? "refresh" : "spark"} /> {primaryLabel}
        </ApexCockpitControlButton>
        <ApexCockpitControlButton className="px-2" disabled={false} onClick={onOpenConsole} active={false} title="Open the full Apex operator console">
          <Icon name="layers" /> Console
        </ApexCockpitControlButton>
      </div>
    </section>
  );
}

function ApexCockpitCommandStream({ turns, route, onOpenRoute, onOpenModule, onCreateAgentRequest, onCreateLiveRun, onBrief, onAnswerCurrent, creatingAgentRequest = false, creatingLiveRun = false }) {
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
          onClick={() => (safeRoute.moduleId ? onOpenModule?.(safeRoute.moduleId) : onOpenRoute(safeRoute.section))}
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
            onClick={() => (action === "Start private run" ? onCreateLiveRun?.() : action === "Draft locked request" ? onCreateAgentRequest?.() : action === "Brief me" ? onBrief?.() : action === "Answer from memory" ? onAnswerCurrent?.() : action.includes("Open") ? (safeRoute.moduleId ? onOpenModule?.(safeRoute.moduleId) : onOpenRoute(safeRoute.section)) : null)}
            disabled={action === "Draft locked request" ? creatingAgentRequest : action === "Start private run" ? creatingLiveRun : false}
            className="co-focus-ring inline-flex min-h-7 items-center rounded-md border border-slate-800 bg-slate-900/70 px-2 text-[10px] font-black text-slate-300 transition hover:border-cyan-400/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-70"
          >
            {action === "Draft locked request" && creatingAgentRequest ? "Drafting..." : action === "Start private run" && creatingLiveRun ? "Starting..." : action}
          </button>
        ))}
      </div>
      <div className="grid min-w-0 gap-1.5">
        {visibleTurns.length ? visibleTurns.map((turn) => (
          <div key={turn.id} className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-md border border-slate-800 bg-slate-900/58 px-2.5 py-2">
            <Icon name={turn.source === "memory" ? "database" : turn.source === "interrupt" ? "alert" : turn.source === "voice" ? "phone" : turn.source === "proactive" ? "refresh" : "check"} className="h-3.5 w-3.5 text-cyan-300" />
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
    { label: "Mode", value: center.mode || "Private act-by-default", tone: displayTone },
    { label: "Runs", value: `${summary.total || 0} saved`, tone: summary.active ? "green" : "blue" },
    { label: "Plan", value: `${center.planStepCount || 0} steps`, tone: "blue" },
    { label: "Routes", value: `${center.routeCount || 0} lanes`, tone: "blue" },
    { label: "Execution", value: center.executionLocked ? "Locked" : "Open", tone: center.executionLocked ? "amber" : "green" },
  ];
  const nextSafeAction = safeRoute.commandAction === "draft-agent-control-request"
    ? "Draft a locked agent request"
    : safeRoute.commandAction === "start-live-operator-run"
      ? "Start a private live run"
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
      setLedgerMessage("Internal draft package prepared. Money, sends, billing, provider work, and production actions stayed gated.");
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
        <ToneBadge tone={displayTone}>{center.externalActionsLocked ? "Consequential gated" : "Private Apex"}</ToneBadge>
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
              placeholder="Tell Apex what to turn into a saved private run..."
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
                    <button type="button" onClick={() => handleUpdateRun(run.id, { status: "done", resultReport: run.resultReport || "Operator marked this private run done after reviewing available evidence." })} disabled={!sessionToken || ledgerBusy === `done-${run.id}`} className={`co-focus-ring min-h-7 rounded-md border px-2 text-[10px] font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${buttonClass}`}>
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
    : safeRoute.commandAction === "start-live-operator-run"
      ? "Start a private live run"
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
        <ToneBadge tone={center.tone || "green"}>{center.externalActionsLocked ? "Consequential gated" : "Private Apex"}</ToneBadge>
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
          <p className="mt-1 text-[10px] font-bold text-orange-100/72">{center.planStepCount || 0} plan steps, {center.routeCount || 0} lanes, consequential actions gated.</p>
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

function listApexCockpitRunRows(value = []) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function isApexCockpitQuietReviewGateRun(run = {}) {
  const status = String(run?.status || run?.statusLabel || "").toLowerCase();
  const combined = [
    run?.title,
    run?.request,
    run?.nextSafeAction,
    run?.resultReport,
    ...(Array.isArray(run?.steps) ? run.steps.map((step) => `${step?.title || ""} ${step?.status || ""} ${step?.detail || ""}`) : []),
  ].join(" ");
  return ["blocked", "waiting-approval", "needs-review", "needs_review"].includes(status)
    || /\b(needs review|blocked for review|stopped at (a )?(review|approval) gate|waiting for (review|approval))\b/i.test(combined);
}

function listApexCockpitHomeRunRows(value = []) {
  return listApexCockpitRunRows(value).filter((run) => !isApexCockpitQuietReviewGateRun(run));
}

function apexCockpitRunStatusTone(status = "") {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "done") return "green";
  if (normalized === "blocked") return "red";
  if (normalized === "waiting-approval") return "amber";
  if (normalized === "drafting" || normalized === "validating") return "blue";
  return "slate";
}

function summarizeApexCockpitRunProgress(run = {}) {
  if (run.progress) return run.progress;
  const steps = listApexCockpitRunRows(run.steps);
  const completeStatuses = new Set(["done", "drafted"]);
  const runStatus = String(run.status || "").toLowerCase();
  const stepDoneCount = steps.filter((step) => completeStatuses.has(String(step?.status || "").toLowerCase())).length;
  const activeStep = steps.find((step) => !completeStatuses.has(String(step?.status || "").toLowerCase())) || steps[steps.length - 1] || null;
  const totalCount = steps.length;
  const doneCount = runStatus === "done" ? totalCount : stepDoneCount;
  const activeStepTitle = runStatus === "done" ? "Run reported complete" : activeStep?.title || "";
  const activeStepStatus = runStatus === "done" ? "done" : activeStep?.status || "";
  const activeStepDetail = runStatus === "done"
    ? "Apex saved a result report for the operator review trail."
    : activeStep?.detail || "";
  return {
    doneCount,
    totalCount,
    progressPercent: totalCount ? Math.round((doneCount / totalCount) * 100) : 0,
    activeStepTitle,
    activeStepStatus,
    activeStepDetail,
    evidenceCount: listApexCockpitRunRows(run.evidence).length,
    approvalGateCount: listApexCockpitRunRows(run.approvalGates).length,
    linkedDraftCount: [run.linkedAgentControlRequestId, run.linkedExecutionHandoffId].filter(Boolean).length,
    hasResultReport: Boolean(run.resultReport),
  };
}

function buildApexCockpitRunTimelineRows(run = {}, progress = {}, nextPrivateMove = {}) {
  if (!run?.id) return [];
  const steps = listApexCockpitRunRows(run.steps);
  const runStatus = String(run.status || "").toLowerCase();
  const completeStatuses = new Set(["done", "drafted"]);
  const activeStepId = steps.find((step) => !completeStatuses.has(String(step?.status || "").toLowerCase()))?.id
    || steps[steps.length - 1]?.id
    || "";
  const normalizedRows = steps.map((step, index) => {
    const status = String(step?.status || "").toLowerCase();
    const done = runStatus === "done" || completeStatuses.has(status);
    const blocked = status === "blocked" || (runStatus === "blocked" && step.id === activeStepId);
    const waiting = status === "waiting-approval" || (runStatus === "waiting-approval" && step.id === activeStepId);
    const active = !done && !blocked && !waiting && step.id === activeStepId;
    const queued = !done && !blocked && !waiting && !active;
    const statusLabel = done
      ? "Done"
      : blocked
        ? "Blocked"
        : waiting
          ? "Manual review"
          : active
            ? "Now"
            : "Queued";
    const detail = step.detail || step.evidence || (active ? nextPrivateMove.detail : "") || "Private Apex step.";
    return {
      id: step.id || `run-step-${index}`,
      number: index + 1,
      title: apexCockpitMemoryText(step.title || `Step ${index + 1}`, 80),
      statusLabel,
      detail: apexCockpitMemoryText(detail, 180),
      tone: done ? "green" : blocked ? "red" : waiting ? "amber" : active ? "blue" : "slate",
      state: done ? "done" : blocked ? "blocked" : waiting ? "waiting" : active ? "active" : queued ? "queued" : "queued",
    };
  });
  if (normalizedRows.length) return normalizedRows.slice(0, 8);
  return [{
    id: "run-timeline-ledger",
    number: 1,
    title: "Private run ledger",
    statusLabel: runStatus === "done" ? "Done" : nextPrivateMove.status || "Ready",
    detail: apexCockpitMemoryText(run.nextSafeAction || nextPrivateMove.detail || "Apex is tracking this private run with consequential actions gated.", 180),
    tone: apexCockpitRunStatusTone(runStatus || nextPrivateMove.tone),
    state: runStatus === "done" ? "done" : "active",
  }];
}

function buildApexCockpitRunResultReport({ run = {}, question = "", answer = "" } = {}) {
  const subject = apexCockpitMemoryText(run.title || run.request || question || "Apex live operator run", 180);
  const answerSummary = apexCockpitMemoryText(answer, 320);
  return [
    `Apex reported back on ${subject}.`,
    answerSummary ? `Latest answer: ${answerSummary}` : "Latest answer: reviewed from the live operator session.",
    "Internal draft/evidence review only. No external send, billing, ad, provider, production, deletion, or irreversible action executed.",
  ].join(" ");
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

function buildApexCockpitPulseRows({ state, pulse, recording, speaking, conversationMode, bargeInEnabled, captionFallbackEnabled = false, captionStatus = "standby", interruptionCount = 0, rememberedTurnCount = 0, voiceRetryCount = 0 } = {}) {
  const summary = pulse?.runSummary || state?.autonomyRunCenter?.runSummary || {};
  const captionActive = captionStatus === "captioning" || captionStatus === "interim";
  const caughtInterruptions = Number(interruptionCount || 0);
  const rememberedTurns = Number(rememberedTurnCount || 0);
  const retries = Number(voiceRetryCount || 0);
  return [
    { label: "Auto Check", value: formatApexCockpitPulseTime(pulse?.checkedAt), tone: pulse?.checkedAt ? "green" : "slate" },
    { label: "Release", value: pulse?.releaseVersion || (state?.releaseDesk?.currentVersion ? `v${state.releaseDesk.currentVersion}` : "Live"), tone: state?.releaseDesk?.tone || "green" },
    { label: "Runs", value: `${Number(summary.active || 0)} active / ${Number(summary.total || 0)} saved`, tone: Number(summary.active || 0) ? "green" : "slate" },
    { label: "Voice Loop", value: recording ? "Listening" : speaking ? "Talking" : conversationMode ? "Open" : "Manual", tone: recording || conversationMode ? "green" : "slate" },
    { label: "Barge-in", value: caughtInterruptions ? `${caughtInterruptions} caught` : bargeInEnabled ? "Armed" : "Off", tone: caughtInterruptions ? "green" : bargeInEnabled ? "amber" : "slate" },
    { label: "Retry", value: retries ? `${retries} reopened` : "Ready", tone: retries ? "amber" : "green" },
    { label: "Turn Memory", value: rememberedTurns ? `${rememberedTurns} suggested` : "Manual", tone: rememberedTurns ? "green" : "blue" },
    { label: "Captions", value: captionFallbackEnabled ? (captionActive ? "Live" : "Ready") : "Server", tone: captionFallbackEnabled ? "blue" : "slate" },
    { label: "Alerts", value: `${Number(pulse?.alertCount || 0)} alerts`, tone: Number(pulse?.alertCount || 0) ? "amber" : "green" },
    { label: "Blockers", value: `${Number(pulse?.blockerCount || 0)} blockers`, tone: Number(pulse?.blockerCount || 0) ? "amber" : "green" },
    { label: "Safety", value: state?.liveOperatorMode?.externalActionsLocked === false ? "Open" : "Locked", tone: state?.liveOperatorMode?.externalActionsLocked === false ? "red" : "amber" },
  ];
}

function normalizeApexCockpitJudgmentRow(row = {}) {
  return {
    id: String(row.id || `judgment-${row.title || "item"}`).trim(),
    title: apexCockpitMemoryText(row.title || "Operator judgment", 80),
    status: apexCockpitMemoryText(row.status || "Review", 80),
    detail: apexCockpitMemoryText(row.detail || "Review the current Apex context before taking action.", 260),
    tone: row.tone || "blue",
    actionLabel: apexCockpitMemoryText(row.actionLabel || "Review", 80),
  };
}

function buildApexCockpitOperatorJudgmentRows({ state, pulse, activeRun, activeRunProgress } = {}) {
  const rows = [];
  const runStatus = String(activeRun?.status || "").toLowerCase();
  if (activeRun?.id) {
    rows.push(normalizeApexCockpitJudgmentRow({
      id: runStatus === "waiting-approval" ? "judgment-review-active-run" : "judgment-finish-active-run",
      title: runStatus === "waiting-approval" ? "Review active run" : "Advance active run",
      status: runStatus === "waiting-approval" ? "Manual review" : `${Number(activeRunProgress?.progressPercent || 0)}% done`,
      detail: runStatus === "waiting-approval"
        ? "Apex proof-checked the active private run and is stopped at manual review. Report done, block it, or keep waiting."
        : "Apex sees an unfinished private run. Cycle prep/proof, attach evidence, then stop at approval or report back.",
      tone: runStatus === "waiting-approval" ? "amber" : "green",
      actionLabel: runStatus === "waiting-approval" ? "Review run" : "Cycle run",
    }));
  }

  if (Number(pulse?.blockerCount || 0) > 0) {
    rows.push(normalizeApexCockpitJudgmentRow({
      id: "judgment-pulse-blockers",
      title: "Clear live blockers",
      status: `${Number(pulse.blockerCount || 0)} blockers`,
      detail: "Apex sees blocker pressure in the live pulse. Ask what is blocked or start a private run to triage it.",
      tone: "amber",
      actionLabel: "Review blockers",
    }));
  }

  if (Number(pulse?.alertCount || 0) > 0) {
    rows.push(normalizeApexCockpitJudgmentRow({
      id: "judgment-pulse-alerts",
      title: "Review live alerts",
      status: `${Number(pulse.alertCount || 0)} alerts`,
      detail: "Apex sees alert rows in the daily briefing. Review them before trusting new execution or release work.",
      tone: "amber",
      actionLabel: "Open briefing",
    }));
  }

  const baseRows = Array.isArray(state?.liveOperatorMode?.operatorJudgmentRows)
    ? state.liveOperatorMode.operatorJudgmentRows.map(normalizeApexCockpitJudgmentRow)
    : [];
  const merged = [...rows, ...baseRows];
  const seen = new Set();
  return merged.filter((row) => {
    if (!row.id || seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  }).slice(0, 4);
}

function buildApexCockpitOperatorJudgmentText(rows = []) {
  const safeRows = rows.map(normalizeApexCockpitJudgmentRow).slice(0, 4);
  if (!safeRows.length) {
    return "Operator judgment is clear: keep monitoring, act privately when useful, and ask before consequential action.";
  }
  const [first, ...rest] = safeRows;
  const restText = rest.length
    ? ` Other signals: ${rest.map((row) => `${row.title}: ${row.status}`).join("; ")}.`
    : "";
  return `Operator judgment: ${first.title}. ${first.detail} Next safe action: ${first.actionLabel}. ${restText} Money, sends, billing, provider work, production changes, deletion, deploy, rollback, and irreversible actions stay gated.`;
}

function normalizeApexCockpitMissionBriefRow(row = {}) {
  return {
    id: String(row.id || `mission-${row.label || "row"}`).trim(),
    label: apexCockpitMemoryText(row.label || "Signal", 48),
    value: apexCockpitMemoryText(row.value || "Ready", 70),
    detail: apexCockpitMemoryText(row.detail || "Review before acting.", 190),
    tone: row.tone || "blue",
  };
}

function buildApexCockpitMissionBrief({
  activeRun,
  activeRunProgress = {},
  heartbeat = {},
  proactiveCheckIn = {},
  nextPrivateMove = {},
  operatorJudgmentRows = [],
  liveOperatorMemory = {},
  pulse = {},
} = {}) {
  const hasRun = Boolean(activeRun?.id);
  const runStatus = apexCockpitMemoryText(activeRun?.status || heartbeat.status || "Ready", 64);
  const progressPercent = Number(activeRunProgress?.progressPercent || 0);
  const doneCount = Number(activeRunProgress?.doneCount || 0);
  const totalCount = Number(activeRunProgress?.totalCount || 0);
  const progressLabel = hasRun
    ? `${progressPercent}% / ${doneCount} of ${totalCount || "?"}`
    : `${Number(pulse?.runSummary?.active || 0)} active / ${Number(pulse?.runSummary?.total || 0)} saved`;
  const topJudgment = Array.isArray(operatorJudgmentRows) && operatorJudgmentRows.length
    ? normalizeApexCockpitJudgmentRow(operatorJudgmentRows[0])
    : null;
  const latestRunMemory = resolveApexCockpitLatestTrustedRunMemory(liveOperatorMemory);
  const pendingRunMemoryCount = Number(liveOperatorMemory?.suggestedCount || 0);
  const trustedRunMemoryCount = Number(liveOperatorMemory?.trustedCount || 0);
  const checkInSurface = Boolean(proactiveCheckIn?.shouldSurface);
  const title = hasRun
    ? `Mission Brief: ${apexCockpitMemoryText(activeRun.title || activeRun.request || "active private run", 120)}`
    : "Mission Brief: Apex is standing by";
  const status = hasRun
    ? runStatus
    : topJudgment
      ? topJudgment.status
      : latestRunMemory
        ? "Trusted history"
        : "Ready";
  const tone = hasRun
    ? apexCockpitRunStatusTone(activeRun.status)
    : topJudgment?.tone || (latestRunMemory ? "green" : "blue");
  const nextMoveTitle = nextPrivateMove?.title || (hasRun ? "Review active run" : "Start private run when ready");
  const nextMoveDetail = nextPrivateMove?.recommendation || nextPrivateMove?.detail || heartbeat.recommendation || "Review the current context before taking action.";
  const summary = hasRun
    ? `${apexCockpitMemoryText(activeRun.title || activeRun.request || "The active private run", 140)} is ${progressLabel}. Current step: ${apexCockpitMemoryText(activeRunProgress.activeStepTitle || heartbeat.currentStep || "review the run", 90)}. Next safe move: ${apexCockpitMemoryText(nextMoveTitle, 120)}.`
    : `${topJudgment ? `Top signal: ${topJudgment.title}.` : "No active private run is live."} ${latestRunMemory ? `Latest trusted run memory: ${latestRunMemory.title}.` : "Apex is ready to start a private run when there is real work to track."}`;
  const rows = [
    normalizeApexCockpitMissionBriefRow({
      id: "mission-run",
      label: "Run",
      value: hasRun ? runStatus : "No active run",
      detail: hasRun ? progressLabel : "Start a private run to give Apex real work to track.",
      tone: hasRun ? apexCockpitRunStatusTone(activeRun.status) : "slate",
    }),
    normalizeApexCockpitMissionBriefRow({
      id: "mission-current",
      label: "Current",
      value: hasRun ? activeRunProgress.activeStepTitle || heartbeat.currentStep || "Review" : topJudgment?.title || "Standing by",
      detail: hasRun ? activeRunProgress.activeStepDetail || heartbeat.detail || "Review active run evidence." : topJudgment?.detail || "No live run is waiting for action.",
      tone: hasRun ? heartbeat.tone || "blue" : topJudgment?.tone || "slate",
    }),
    normalizeApexCockpitMissionBriefRow({
      id: "mission-next",
      label: "Next",
      value: nextMoveTitle,
      detail: nextMoveDetail,
      tone: nextPrivateMove?.tone || (hasRun ? "green" : "blue"),
    }),
    normalizeApexCockpitMissionBriefRow({
      id: "mission-pulse",
      label: "Pulse",
      value: checkInSurface ? "Check-in" : heartbeat.pulseLabel || "Watching",
      detail: proactiveCheckIn?.recommendation || heartbeat.recommendation || "Apex is watching for meaningful changes.",
      tone: checkInSurface ? "amber" : pulse?.checkedAt ? "green" : "blue",
    }),
    normalizeApexCockpitMissionBriefRow({
      id: "mission-memory",
      label: "Memory",
      value: trustedRunMemoryCount ? `${trustedRunMemoryCount} trusted` : pendingRunMemoryCount ? `${pendingRunMemoryCount} review` : "Ready",
      detail: latestRunMemory?.title || (pendingRunMemoryCount ? "Suggested run memory is waiting for manual review." : "Reviewed outcomes can become trusted memory after approval."),
      tone: trustedRunMemoryCount ? "green" : pendingRunMemoryCount ? "amber" : "blue",
    }),
  ];
  const spokenText = [
    "Apex mission brief.",
    summary,
    topJudgment ? `Operator judgment: ${topJudgment.title}. ${topJudgment.detail}` : "",
    `Next safe action: ${apexCockpitMemoryText(nextMoveTitle, 140)}. ${apexCockpitMemoryText(nextMoveDetail, 220)}`,
    latestRunMemory ? `Trusted run memory available: ${latestRunMemory.title}.` : "",
    "Consequential actions remain gated. No sends, billing, provider work, production changes, deploys, rollbacks, agent runs, automatic trusted memory, or irreversible actions.",
  ].filter(Boolean).join(" ");

  return {
    title,
    status,
    tone,
    summary: apexCockpitMemoryText(summary, 420),
    spokenText: apexCockpitMemoryText(spokenText, 1200),
    sourceLabels: ["Apex Mission Brief", "Live Session Heartbeat", "Autonomy Run Center", "Proactive Pulse", "Reviewed Run Memory"],
    rows,
  };
}

function buildApexCockpitHeartbeatText(heartbeat = {}) {
  if (!heartbeat?.runId) {
    return "Apex heartbeat: no active private run is live. I am standing by. Start a private run when there is real work to track. Consequential actions, sends, billing, provider work, production changes, deletion, deploy, rollback, and irreversible actions stay gated.";
  }
  return `Apex heartbeat: ${heartbeat.title || "active private run"} is ${heartbeat.status || "active"}. Progress is ${heartbeat.progressLabel || "unknown"}, updated ${heartbeat.ageLabel || "recently"}. Current step: ${heartbeat.currentStep || "review the run"}. Recommendation: ${heartbeat.recommendation || "review the run ledger"}. Consequential actions, sends, billing, provider work, production changes, deletion, deploy, rollback, and irreversible actions stay gated.`;
}

function buildApexCockpitProactiveCheckInText(checkIn = {}) {
  if (checkIn?.answer) return checkIn.answer;
  return "Apex proactive check-in: I am watching the live run heartbeat and will surface meaningful changes here. Consequential actions, sends, billing, provider work, production changes, deletion, deploy, rollback, and irreversible actions stay gated.";
}

function buildApexCockpitSpokenProactiveCheckInText(checkIn = {}) {
  const title = apexCockpitMemoryText(checkIn.title || "Proactive check-in", 120);
  const status = apexCockpitMemoryText(checkIn.status || checkIn.trigger || "New live-run signal", 80);
  const detail = apexCockpitMemoryText(checkIn.detail || "I noticed a meaningful live-run change.", 220);
  const recommendation = apexCockpitMemoryText(checkIn.recommendation || "Review this check-in before trusting or acting on it.", 220);
  return [
    "Apex proactive check-in.",
    `${title}.`,
    status ? `Status: ${status}.` : "",
    detail,
    `Next safe action: ${recommendation}.`,
    "Consequential actions remain gated. No sends, billing, provider work, production changes, deploys, rollbacks, agent runs, or irreversible actions.",
  ].filter(Boolean).join(" ");
}

function normalizeApexCockpitWatchOfficerRow(row = {}) {
  return {
    id: String(row.id || `watch-${row.label || "row"}`).trim(),
    label: apexCockpitMemoryText(row.label || "Signal", 48),
    value: apexCockpitMemoryText(row.value || "Watching", 74),
    detail: apexCockpitMemoryText(row.detail || "Apex is keeping this under review.", 190),
    tone: row.tone || "blue",
  };
}

function buildApexCockpitWatchOfficer({
  activeRun,
  activeRunProgress = {},
  heartbeat = {},
  proactiveCheckIn = {},
  missionBrief = {},
  nextPrivateMove = {},
  operatorJudgmentRows = [],
  liveOperatorMemory = {},
  pulse = {},
  proactiveVoiceStatus = "Watching",
  proactiveMemoryId = "",
  proactiveMemoryCount = 0,
} = {}) {
  const hasRun = Boolean(activeRun?.id || heartbeat?.runId);
  const surfacedSignal = Boolean(proactiveCheckIn?.shouldSurface);
  const topJudgment = Array.isArray(operatorJudgmentRows) && operatorJudgmentRows.length
    ? normalizeApexCockpitJudgmentRow(operatorJudgmentRows[0])
    : null;
  const latestRunMemory = resolveApexCockpitLatestTrustedRunMemory(liveOperatorMemory);
  const runTitle = apexCockpitMemoryText(activeRun?.title || activeRun?.request || heartbeat.title || "private run", 110);
  const progressLabel = hasRun
    ? apexCockpitMemoryText(heartbeat.progressLabel || `${Number(activeRunProgress?.progressPercent || 0)}% / ${Number(activeRunProgress?.doneCount || 0)} of ${Number(activeRunProgress?.totalCount || 0) || "?"}`, 80)
    : `${Number(pulse?.runSummary?.active || 0)} active / ${Number(pulse?.runSummary?.total || 0)} saved`;
  const trigger = apexCockpitMemoryText(proactiveCheckIn?.trigger || (hasRun ? "watching-run" : "standing-watch"), 70);
  const title = surfacedSignal
    ? `Watch Officer: ${apexCockpitMemoryText(proactiveCheckIn.title || "new signal surfaced", 130)}`
    : hasRun
      ? `Watch Officer: watching ${runTitle}`
      : "Watch Officer: standing by";
  const status = surfacedSignal
    ? "Signal surfaced"
    : hasRun
      ? heartbeat.status || activeRun?.status || "Watching run"
      : topJudgment?.status || missionBrief.status || "Standing watch";
  const tone = surfacedSignal
    ? "amber"
    : hasRun
      ? heartbeat.tone || apexCockpitRunStatusTone(activeRun?.status)
      : topJudgment?.tone || missionBrief.tone || "blue";
  const detail = surfacedSignal
    ? proactiveCheckIn.detail || "Apex noticed a meaningful change in the live run heartbeat."
    : hasRun
      ? `${runTitle} is ${progressLabel}. Current step: ${apexCockpitMemoryText(activeRunProgress.activeStepTitle || heartbeat.currentStep || "review the run", 90)}.`
      : topJudgment?.detail || latestRunMemory?.title || "No active private run is live; Apex is ready to start one when you ask.";
  const whyItMatters = surfacedSignal
    ? `This changed since the last heartbeat: ${trigger}. Apex is surfacing it now so you can review before anything moves.`
    : hasRun
      ? "Apex has a saved private run in progress, so it can keep the next safe move and review gate visible without executing outside the app."
      : latestRunMemory
        ? `Apex has trusted run history available: ${latestRunMemory.title}.`
        : "Apex is not inventing work while idle; it is waiting for a real private run or operator question.";
  const nextAction = surfacedSignal
    ? proactiveCheckIn.recommendation || nextPrivateMove.recommendation || "Review the surfaced signal before trusting it or moving the run forward."
    : hasRun
      ? nextPrivateMove.recommendation || heartbeat.recommendation || "Review the active run heartbeat and next safe private move."
      : topJudgment?.actionLabel || nextPrivateMove.title || "Ask Apex for the next private run when there is work to track.";
  const memoryValue = proactiveMemoryId
    ? "Drafted"
    : proactiveMemoryCount
      ? `${proactiveMemoryCount} draft${proactiveMemoryCount === 1 ? "" : "s"}`
      : latestRunMemory
        ? "Trusted"
        : surfacedSignal
          ? "Suggested"
          : "Quiet";
  const rows = [
    normalizeApexCockpitWatchOfficerRow({
      id: "watch-signal",
      label: "Signal",
      value: surfacedSignal ? "New" : "Quiet",
      detail: surfacedSignal ? trigger : "No new heartbeat change needs interruption.",
      tone: surfacedSignal ? "amber" : "slate",
    }),
    normalizeApexCockpitWatchOfficerRow({
      id: "watch-run",
      label: "Run",
      value: hasRun ? progressLabel : "No live run",
      detail: hasRun ? runTitle : "Apex is waiting for a private run or direct question.",
      tone: hasRun ? "green" : "slate",
    }),
    normalizeApexCockpitWatchOfficerRow({
      id: "watch-voice",
      label: "Voice",
      value: proactiveVoiceStatus || "Watching",
      detail: proactiveVoiceStatus === "Queued"
        ? "The latest proactive report will speak when the voice loop is clear."
        : proactiveVoiceStatus === "Spoken"
          ? "The latest proactive report was spoken in this session."
          : "Apex will speak meaningful updates when voice is open.",
      tone: proactiveVoiceStatus === "Spoken" ? "green" : proactiveVoiceStatus === "Queued" ? "amber" : proactiveVoiceStatus === "Manual" ? "blue" : "slate",
    }),
    normalizeApexCockpitWatchOfficerRow({
      id: "watch-memory",
      label: "Memory",
      value: memoryValue,
      detail: proactiveMemoryId
        ? "A suggested memory draft exists; it is not trusted automatically."
        : surfacedSignal
          ? "This surfaced signal can become suggested memory for manual review."
          : latestRunMemory?.title || "Nothing new needs memory yet.",
      tone: proactiveMemoryId || latestRunMemory ? "green" : surfacedSignal ? "amber" : "slate",
    }),
    normalizeApexCockpitWatchOfficerRow({
      id: "watch-locks",
      label: "Locks",
      value: "Hard gates",
      detail: "No sends, billing, provider work, production changes, deploys, rollbacks, agent runs, or irreversible actions.",
      tone: "amber",
    }),
  ];
  const spokenText = [
    "Apex watch officer report.",
    title,
    `Status: ${apexCockpitMemoryText(status, 90)}.`,
    apexCockpitMemoryText(detail, 260),
    `Why it matters: ${apexCockpitMemoryText(whyItMatters, 280)}`,
    `Next safe action: ${apexCockpitMemoryText(nextAction, 260)}`,
    `Voice status: ${apexCockpitMemoryText(proactiveVoiceStatus || "Watching", 80)}.`,
    "Consequential actions remain gated. No sends, billing, provider work, production changes, deploys, rollbacks, agent runs, automatic trusted memory, or irreversible actions.",
  ].filter(Boolean).join(" ");

  return {
    title: apexCockpitMemoryText(title, 150),
    status: apexCockpitMemoryText(status, 86),
    tone,
    detail: apexCockpitMemoryText(detail, 330),
    whyItMatters: apexCockpitMemoryText(whyItMatters, 330),
    nextAction: apexCockpitMemoryText(nextAction, 330),
    spokenText: apexCockpitMemoryText(spokenText, 1250),
    sourceLabels: ["Apex Watch Officer", "Live Session Heartbeat", "Proactive Check-In", "Autonomy Run Center", "Reviewed Run Memory"],
    rows,
  };
}

function normalizeApexCockpitClosingReportRow(row = {}) {
  return {
    id: String(row.id || `closing-${row.label || "row"}`).trim(),
    label: apexCockpitMemoryText(row.label || "Signal", 48),
    value: apexCockpitMemoryText(row.value || "Review", 76),
    detail: apexCockpitMemoryText(row.detail || "Review the run before trusting or acting.", 210),
    tone: row.tone || "blue",
  };
}

function buildApexCockpitClosingReport({
  activeRun,
  activeRunProgress = {},
  handback = {},
  nextPrivateMove = {},
  memoryReviewRow = null,
  memoryReviewStatus = "",
  latestAnswer = "",
} = {}) {
  const hasRun = Boolean(activeRun?.id);
  const status = String(activeRun?.status || "ready").toLowerCase();
  const runTitle = apexCockpitMemoryText(activeRun?.title || activeRun?.request || "Apex private run", 130);
  const progressLabel = hasRun
    ? `${Number(activeRunProgress?.progressPercent || 0)}% / ${Number(activeRunProgress?.doneCount || 0)} of ${Number(activeRunProgress?.totalCount || 0) || "?"}`
    : "No live run";
  const evidenceCount = Number(activeRunProgress?.evidenceCount || 0);
  const linkedDraftCount = Number(activeRunProgress?.linkedDraftCount || 0);
  const hasResultReport = Boolean(activeRunProgress?.hasResultReport || activeRun?.resultReport);
  const memoryStatus = memoryReviewStatus === "approved"
    ? "Trusted"
    : memoryReviewStatus === "suggested"
      ? "Needs review"
      : memoryReviewStatus === "archived"
        ? "Archived"
        : activeRun?.decisionMemoryId
          ? "Missing loaded memory"
          : "Not drafted";
  const decisionLabel = !hasRun
    ? "Start a run"
    : status === "done"
      ? (memoryReviewStatus === "approved" ? "Closed and trusted" : "Review memory")
      : status === "waiting-approval"
        ? "Manual approval review"
        : status === "blocked"
          ? "Review blocker"
          : hasResultReport
            ? "Review result report"
            : nextPrivateMove?.title || "Work next private move";
  const summary = hasRun
    ? `${runTitle} is ${status || "tracking"} with ${progressLabel} complete. ${hasResultReport ? "Apex saved a result report." : "Apex has not saved a result report yet."} ${memoryReviewRow?.title ? `Memory posture: ${memoryReviewRow.title}.` : `Memory posture: ${memoryStatus}.`}`
    : "No active private run is live. Start a saved run when there is real work for Apex to track and report back on.";
  const evidenceDetail = hasRun
    ? `${evidenceCount} evidence row${evidenceCount === 1 ? "" : "s"} and ${linkedDraftCount} linked draft${linkedDraftCount === 1 ? "" : "s"} are attached to the run ledger.`
    : "No run evidence exists until a private run is started.";
  const memoryDetail = memoryReviewRow?.detail
    || (memoryReviewStatus === "approved"
      ? "The operator trusted the run memory for future Apex answers."
      : memoryReviewStatus === "suggested"
        ? "Suggested run memory is waiting for manual trust or archive review."
        : memoryReviewStatus === "archived"
          ? "The suggested run memory was archived and will not become trusted context."
          : hasResultReport
            ? "A result report exists, but matching memory is not trusted yet."
            : "Report done to create suggested memory for manual review.");
  const rows = [
    normalizeApexCockpitClosingReportRow({
      id: "closing-work",
      label: "Work",
      value: hasRun ? status || "tracking" : "No run",
      detail: hasRun ? handback.summary || activeRun?.nextSafeAction || "Apex is tracking this private run." : "Start a private run to create a reportable work trail.",
      tone: hasRun ? apexCockpitRunStatusTone(status) : "slate",
    }),
    normalizeApexCockpitClosingReportRow({
      id: "closing-evidence",
      label: "Evidence",
      value: hasRun ? `${evidenceCount} / ${linkedDraftCount}` : "None",
      detail: evidenceDetail,
      tone: evidenceCount || linkedDraftCount ? "green" : hasRun ? "amber" : "slate",
    }),
    normalizeApexCockpitClosingReportRow({
      id: "closing-memory",
      label: "Memory",
      value: memoryStatus,
      detail: memoryDetail,
      tone: memoryReviewStatus === "approved" ? "green" : memoryReviewStatus === "suggested" ? "amber" : memoryReviewStatus === "archived" ? "slate" : hasResultReport ? "amber" : "slate",
    }),
    normalizeApexCockpitClosingReportRow({
      id: "closing-decision",
      label: "Decision",
      value: decisionLabel,
      detail: nextPrivateMove?.recommendation || activeRun?.nextSafeAction || "Review the run ledger before deciding the next move.",
      tone: status === "done" && memoryReviewStatus === "approved" ? "green" : status === "blocked" ? "red" : "amber",
    }),
    normalizeApexCockpitClosingReportRow({
      id: "closing-locks",
      label: "Locks",
      value: "Hard gates",
      detail: "No sends, billing, provider work, production changes, deploys, rollbacks, agent runs, automatic trusted memory, or irreversible actions.",
      tone: "amber",
    }),
  ];
  const spokenText = [
    "Apex live operator closing report.",
    summary,
    hasRun ? `Current run status: ${status || "tracking"}. Progress: ${progressLabel}.` : "",
    evidenceDetail,
    `Memory: ${memoryStatus}. ${memoryDetail}`,
    latestAnswer ? `Latest spoken answer: ${apexCockpitMemoryText(latestAnswer, 260)}` : "",
    `Next decision: ${apexCockpitMemoryText(decisionLabel, 120)}. ${apexCockpitMemoryText(nextPrivateMove?.recommendation || activeRun?.nextSafeAction || "Review before acting.", 260)}`,
    "Consequential actions remain gated. No sends, billing, provider work, production changes, deploys, rollbacks, agent runs, automatic trusted memory, or irreversible actions.",
  ].filter(Boolean).join(" ");

  return {
    title: hasRun ? `Closing Report: ${runTitle}` : "Closing Report: no active run",
    status: hasRun ? decisionLabel : "Standing by",
    tone: hasRun ? (status === "done" && memoryReviewStatus === "approved" ? "green" : apexCockpitRunStatusTone(status || "amber")) : "slate",
    summary: apexCockpitMemoryText(summary, 420),
    spokenText: apexCockpitMemoryText(spokenText, 1400),
    sourceLabels: ["Apex Live Operator Closing Report", "Autonomy Run Center", "Operator Handback", "Run Memory Review"],
    rows,
  };
}

function buildApexCockpitRunHandbackText(handback = {}) {
  if (handback?.answer) return handback.answer;
  return "Apex operator handback: no active private run is live. Start a private run when there is real work to track. Money, sends, billing, provider work, production changes, deletion, deploy, rollback, and irreversible actions stay gated.";
}

function buildApexCockpitAutoDriveNarration({ advance = {}, updatedRun = {}, autoDrive = false } = {}) {
  const title = String(advance.title || updatedRun.title || "the private run").trim();
  const nextTitle = String(advance.nextTitle || "manual review").trim();
  const status = String(updatedRun.status || advance.status || "").trim();
  const stopAtReview = advance.canContinue === false;
  return [
    autoDrive ? "Auto Drive voice handback." : "Private run voice handback.",
    stopAtReview
      ? `I advanced ${title} and I am holding at ${nextTitle}.`
      : `I advanced ${title}. Next safe move is ${nextTitle}.`,
    status ? `Run status is ${status}.` : "",
    stopAtReview
      ? "I need manual review before I go further."
      : "I will continue safe private prep after this handback if Auto Drive stays on.",
    "Consequential actions stay gated. No sends, billing, provider work, production changes, deploys, rollbacks, agent runs, or irreversible actions.",
  ].filter(Boolean).join(" ");
}

function normalizeApexCockpitFollowUpPrompt(prompt = {}) {
  return {
    id: String(prompt.id || `follow-up-${prompt.label || "prompt"}`).trim(),
    label: apexCockpitMemoryText(prompt.label || "Ask next", 42),
    question: apexCockpitMemoryText(prompt.question || "What should I do next?", 180),
    detail: apexCockpitMemoryText(prompt.detail || "Load this next turn into Apex without executing anything.", 160),
    tone: prompt.tone || "blue",
  };
}

function buildApexCockpitFollowUpPrompts({
  answerText = "",
  route,
  activeRun,
  activeRunProgress,
  liveOperatorMemory = {},
  operatorJudgmentRows = [],
} = {}) {
  const prompts = [];
  const runStatus = String(activeRun?.status || "").toLowerCase();
  const hasActiveRun = Boolean(activeRun?.id) && !["done", "archived"].includes(runStatus);
  const firstJudgment = Array.isArray(operatorJudgmentRows) ? operatorJudgmentRows[0] : null;
  const latestRunMemory = resolveApexCockpitLatestTrustedRunMemory(liveOperatorMemory);

  if (hasActiveRun) {
    prompts.push(normalizeApexCockpitFollowUpPrompt({
      id: runStatus === "waiting-approval" ? "follow-up-review-run" : "follow-up-advance-run",
      label: runStatus === "waiting-approval" ? "Review Run" : "Next Run Step",
      question: runStatus === "waiting-approval"
        ? "What should I review before I report this run done?"
        : "What is the next safe step on this active run?",
      detail: runStatus === "waiting-approval"
        ? "Ask Apex to explain the approval stop before you mark the run done or blocked."
        : `Ask Apex to explain the current ${Number(activeRunProgress?.progressPercent || 0)}% run state.`,
      tone: runStatus === "waiting-approval" ? "amber" : "green",
    }));
  } else if (latestRunMemory) {
    prompts.push(normalizeApexCockpitFollowUpPrompt({
      id: "follow-up-continue-memory",
      label: "Continue Memory",
      question: `Continue from trusted run memory: ${latestRunMemory.title}. What is the next safe move?`,
      detail: "Use reviewed live-run history as the starting point for the next Apex turn.",
      tone: "green",
    }));
  }

  if (!hasActiveRun && firstJudgment) {
    prompts.push(normalizeApexCockpitFollowUpPrompt({
      id: "follow-up-top-judgment",
      label: firstJudgment.actionLabel || "Top Signal",
      question: /start private run/i.test(firstJudgment.actionLabel || "")
        ? "Get this done as a private run"
        : `What should I do about ${firstJudgment.title || "the top Apex signal"}?`,
      detail: firstJudgment.detail || "Use Apex judgment as the next natural turn.",
      tone: firstJudgment.tone || "blue",
    }));
  }

  if (answerText) {
    prompts.push(normalizeApexCockpitFollowUpPrompt({
      id: "follow-up-make-run",
      label: "Make It A Run",
      question: "Get this done as a private run",
      detail: "Turn the current answer into a saved private run with evidence and approval stop.",
      tone: "green",
    }));
    prompts.push(normalizeApexCockpitFollowUpPrompt({
      id: "follow-up-remember-answer",
      label: "Remember This",
      question: "What part of this answer should become suggested memory?",
      detail: "Ask Apex what is worth saving before you use the visible Remember control.",
      tone: "slate",
    }));
  }

  prompts.push(normalizeApexCockpitFollowUpPrompt({
    id: "follow-up-next-options",
    label: "Options",
    question: "Give me the next safe options",
    detail: route?.detail || "Ask for the next safe choices from the matched room.",
    tone: route?.tone || "blue",
  }));
  prompts.push(normalizeApexCockpitFollowUpPrompt({
    id: "follow-up-blocked",
    label: "Blocked",
    question: "What's blocked right now?",
    detail: "Ask Apex to look across approvals, release, run, and business blockers.",
    tone: "amber",
  }));

  const seen = new Set();
  return prompts.filter((prompt) => {
    if (!prompt.id || seen.has(prompt.id)) return false;
    seen.add(prompt.id);
    return true;
  }).slice(0, 4);
}

function buildApexCockpitNowState({
  voiceState = {},
  error = "",
  submitting = false,
  transcribing = false,
  speaking = false,
  speechActive = false,
  recording = false,
  autoListening = false,
  conversationMode = false,
  activeRun = null,
  activeRunProgress = {},
  heartbeat = {},
  proactiveCheckIn = {},
  latestRunMemory = null,
  commandRoute = {},
  answerText = "",
  voiceNotice = "",
  agentActionNotice = "",
  liveRunNotice = "",
  captionStatusLabel = "",
} = {}) {
  const routeLabel = commandRoute?.label || "Apex";
  const safeVoiceLabel = voiceState?.label || voiceState?.headline || "Standby";
  const safeNextAction = liveRunNotice || agentActionNotice || proactiveCheckIn?.recommendation || activeRun?.nextSafeAction || heartbeat?.recommendation || commandRoute?.detail || "Ask Apex naturally or start a private run.";
  let stage = "standby";
  let title = "Standing by";
  let status = conversationMode || autoListening ? "Open loop" : "Manual";
  let detail = conversationMode || autoListening
    ? "Apex is listening on this visible page when microphone permission is available."
    : "Apex is ready for a typed command or manual voice resume.";
  let nextSafeAction = safeNextAction;
  let tone = conversationMode || autoListening ? "green" : "slate";
  let icon = "spark";

  if (error) {
    stage = "blocked";
    title = "Needs review";
    status = "Blocked";
    detail = String(error);
    nextSafeAction = "Resolve the visible issue, then ask Apex again.";
    tone = "red";
    icon = "alert";
  } else if (submitting) {
    stage = "thinking";
    title = "Reading context";
    status = routeLabel;
    detail = "Apex is checking approved memory, sources, recent turns, and the matched command room.";
    nextSafeAction = "Let Apex finish the source-backed answer.";
    tone = "blue";
    icon = "refresh";
  } else if (transcribing) {
    stage = "hearing";
    title = "Transcribing voice";
    status = "Reading audio";
    detail = "Apex heard audio and is turning it into a reviewed command before answering.";
    nextSafeAction = "Wait for the transcript, or type the request if the mic is unclear.";
    tone = "blue";
    icon = "phone";
  } else if (speaking) {
    stage = "reporting";
    title = "Talking back";
    status = safeVoiceLabel;
    detail = voiceNotice || "Apex is speaking the current source-backed answer.";
    nextSafeAction = "Interrupt at any time, or let Apex finish and keep listening.";
    tone = "amber";
    icon = "phone";
  } else if (speechActive) {
    stage = "hearing";
    title = "Hearing you";
    status = "Live input";
    detail = "Apex detects your voice. When you pause, it will close the turn and route the request.";
    nextSafeAction = "Keep talking naturally. Apex will answer when the turn is complete.";
    tone = "green";
    icon = "phone";
  } else if (recording) {
    stage = "hearing";
    title = "Listening";
    status = captionStatusLabel || "Voice open";
    detail = "Voice is open on this page with visible controls, caption fallback, and no hidden recording.";
    nextSafeAction = "Ask Apex naturally. Silence closes the turn.";
    tone = "green";
    icon = "phone";
  } else if (activeRun?.id && !["done", "archived"].includes(String(activeRun.status || "").toLowerCase())) {
    stage = "acting";
    title = "Working private run";
    status = activeRun.status || "Active";
    detail = activeRunProgress?.activeStepTitle
      ? `${activeRun.title || "Private run"}: ${activeRunProgress.activeStepTitle}.`
      : activeRun.title || "Apex is tracking a private run with evidence and approval stops.";
    nextSafeAction = activeRun.nextSafeAction || heartbeat?.recommendation || "Advance the private run, proof-check it, or stop at manual approval.";
    tone = apexCockpitRunStatusTone(activeRun.status);
    icon = "spark";
  } else if (proactiveCheckIn?.shouldSurface) {
    stage = "monitoring";
    title = "Noticed a live change";
    status = proactiveCheckIn.trigger || "Check-in";
    detail = proactiveCheckIn.detail || "Apex surfaced a meaningful live-run change for review.";
    nextSafeAction = proactiveCheckIn.recommendation || "Review the check-in before trusting or saving it.";
    tone = "amber";
    icon = "refresh";
  } else if (latestRunMemory?.title) {
    stage = "memory";
    title = "Ready to continue";
    status = "Trusted run history";
    detail = `Latest reviewed run memory: ${latestRunMemory.title}.`;
    nextSafeAction = "Use Continue Memory when you want Apex to pick up from the reviewed outcome.";
    tone = "green";
    icon = "database";
  } else if (answerText) {
    stage = "reporting";
    title = "Answer ready";
    status = "Answered";
    detail = apexCockpitMemoryText(answerText, 420);
    nextSafeAction = "Choose a next-turn prompt, remember the answer, or make it a private run.";
    tone = "blue";
    icon = "check";
  }

  const stageRows = [
    {
      id: "hear",
      label: "Hear",
      value: stage === "hearing" ? "Active" : recording ? "Open" : "Ready",
      tone: stage === "hearing" || recording ? "green" : "slate",
    },
    {
      id: "think",
      label: "Think",
      value: stage === "thinking" ? "Reading" : routeLabel,
      tone: stage === "thinking" ? "blue" : "slate",
    },
    {
      id: "act",
      label: "Act Privately",
      value: stage === "acting" ? "Run live" : activeRun?.id ? "Run ready" : "Guarded",
      tone: stage === "acting" || activeRun?.id ? "green" : "slate",
    },
    {
      id: "report",
      label: "Report Back",
      value: stage === "reporting" ? (speaking ? "Talking" : "Ready") : answerText ? "Ready" : "Waiting",
      tone: stage === "reporting" || answerText ? "amber" : "slate",
    },
    {
      id: "memory",
      label: "Memory",
      value: latestRunMemory?.title ? "Trusted" : "Ready",
      tone: latestRunMemory?.title ? "green" : "blue",
    },
    {
      id: "safety",
      label: "Safety",
      value: "Hard gates",
      tone: "amber",
    },
  ];

  return { stage, title, status, detail, nextSafeAction, tone, icon, stageRows };
}

function ApexCockpitScreen({ state, activeSection, onChange, askQuestion, setAskQuestion, sessionToken, onOpenAvatarLab, onOpenModule, onPanelCommand, onBuilderFixReceipt, talkToApexContext = null, conversationFirst = false }) {
  const [cockpitResponse, setCockpitResponse] = useState(null);
  const [cockpitBackgroundStatus, setCockpitBackgroundStatus] = useState(null);
  const [cockpitLocalProviderStatus, setCockpitLocalProviderStatus] = useState(null);
  const [cockpitLocalProviderNotice, setCockpitLocalProviderNotice] = useState("");
  const [cockpitSelectedEffort] = useState("auto");
  const [cockpitLocalVoiceStatus, setCockpitLocalVoiceStatus] = useState(null);
  const [cockpitLiveBenchmarkSummary, setCockpitLiveBenchmarkSummary] = useState(null);
  const [cockpitLiveBenchmarkBusy, setCockpitLiveBenchmarkBusy] = useState("");
  const [cockpitVoiceBenchmarkArmed, setCockpitVoiceBenchmarkArmed] = useState(false);
  const [cockpitLearningMode, setCockpitLearningMode] = useState(false);
  const [cockpitLastLearningMemory, setCockpitLastLearningMemory] = useState(null);
  const [cockpitLastLocalTranscript, setCockpitLastLocalTranscript] = useState("");
  const [cockpitError, setCockpitError] = useState("");
  const [cockpitSubmitting, setCockpitSubmitting] = useState(false);
  const [cockpitSpeaking, setCockpitSpeaking] = useState(false);
  const [cockpitVoiceNotice, setCockpitVoiceNotice] = useState("");
  const [cockpitRecording, setCockpitRecording] = useState(false);
  const [cockpitTranscribing, setCockpitTranscribing] = useState(false);
  const [cockpitLastQuestion, setCockpitLastQuestion] = useState("");
  const [cockpitAutoListening, setCockpitAutoListening] = useState(() => Boolean(conversationFirst));
  const [cockpitPageVisible, setCockpitPageVisible] = useState(() => (typeof document === "undefined" ? true : document.visibilityState !== "hidden"));
  const [cockpitSpeechActive, setCockpitSpeechActive] = useState(false);
  const [cockpitMicLevel, setCockpitMicLevel] = useState(0);
  const [cockpitMicCalibration, setCockpitMicCalibration] = useState(() => createApexCockpitMicCalibrationState());
  const [cockpitOutputLevel, setCockpitOutputLevel] = useState(0);
  const [cockpitAudioReady, setCockpitAudioReady] = useState(false);
  const [cockpitConversationMode, setCockpitConversationMode] = useState(() => Boolean(conversationFirst));
  const [cockpitBargeInEnabled, setCockpitBargeInEnabled] = useState(false);
  const [cockpitAlwaysOpenMic, setCockpitAlwaysOpenMic] = useState(() => buildApexAlwaysOpenMicStatus({
    state: APEX_ALWAYS_OPEN_MIC_STATE.QUIET,
    ingressProvider: "browser",
    vadProvider: "amplitude-gate",
  }));
  const [cockpitLastLocalVoiceReceipt, setCockpitLastLocalVoiceReceipt] = useState(null);
  const [cockpitVoiceProfile, setCockpitVoiceProfile] = useState("alloy");
  const [cockpitPersonalityMode, setCockpitPersonalityMode] = useState(DEFAULT_APEX_OS_ASSISTANT_MODE_ID);
  const [cockpitAgentActionNotice, setCockpitAgentActionNotice] = useState("");
  const [cockpitCreatingAgentRequest, setCockpitCreatingAgentRequest] = useState(false);
  const [cockpitLiveRunNotice, setCockpitLiveRunNotice] = useState("");
  const [cockpitCreatingLiveRun, setCockpitCreatingLiveRun] = useState(false);
  const [cockpitLiveRuns, setCockpitLiveRuns] = useState(() => state.autonomyRunCenter?.runRows || []);
  const [cockpitLiveRunSummary, setCockpitLiveRunSummary] = useState(() => state.autonomyRunCenter?.runSummary || {});
  const [cockpitActiveRunId, setCockpitActiveRunId] = useState(() => state.autonomyRunCenter?.latestRun?.id || state.autonomyRunCenter?.runRows?.[0]?.id || "");
  const [cockpitUpdatingRun, setCockpitUpdatingRun] = useState("");
  const [cockpitAutoDriveEnabled, setCockpitAutoDriveEnabled] = useState(false);
  const [cockpitAutoDriveNotice, setCockpitAutoDriveNotice] = useState("");
  const [cockpitRememberingTurn, setCockpitRememberingTurn] = useState(false);
  const [cockpitRememberedTurnKeys, setCockpitRememberedTurnKeys] = useState({});
  const [cockpitRememberedTurnCount, setCockpitRememberedTurnCount] = useState(0);
  const [cockpitLiveOperatorMemory, setCockpitLiveOperatorMemory] = useState(() => state.liveOperatorMemory || state.liveOperatorMode?.runMemory || {});
  const [cockpitRunMemoryReviewNotice, setCockpitRunMemoryReviewNotice] = useState("");
  const [cockpitRunMemoryReviewBusy, setCockpitRunMemoryReviewBusy] = useState("");
  const [cockpitLivePulse, setCockpitLivePulse] = useState(null);
  const [cockpitLivePulseBusy, setCockpitLivePulseBusy] = useState(false);
  const [cockpitLivePulseError, setCockpitLivePulseError] = useState("");
  const [cockpitProactiveCheckIn, setCockpitProactiveCheckIn] = useState(null);
  const [cockpitProactiveMemoryNotice, setCockpitProactiveMemoryNotice] = useState("");
  const [cockpitProactiveMemoryBusy, setCockpitProactiveMemoryBusy] = useState(false);
  const [cockpitProactiveMemoryIds, setCockpitProactiveMemoryIds] = useState({});
  const [cockpitProactiveMemoryCount, setCockpitProactiveMemoryCount] = useState(0);
  const [cockpitProactiveVoiceStatus, setCockpitProactiveVoiceStatus] = useState("Watching");
  const [cockpitProactiveVoiceQueueKey, setCockpitProactiveVoiceQueueKey] = useState(0);
  const [cockpitListeningHandoffKey, setCockpitListeningHandoffKey] = useState(0);
  const [cockpitMicPermissionState, setCockpitMicPermissionState] = useState("unknown");
  const [cockpitVoiceWakeAttempted, setCockpitVoiceWakeAttempted] = useState(true);
  const [cockpitBrowserTranscript, setCockpitBrowserTranscript] = useState("");
  const [cockpitRecognitionStatus, setCockpitRecognitionStatus] = useState("standby");
  const [cockpitRecognitionError, setCockpitRecognitionError] = useState("");
  const [cockpitInterruptionCount, setCockpitInterruptionCount] = useState(0);
  const [cockpitLastInterruptionLabel, setCockpitLastInterruptionLabel] = useState("");
  const [cockpitVoiceRetryCount, setCockpitVoiceRetryCount] = useState(0);
  const [cockpitVoiceRetryReason, setCockpitVoiceRetryReason] = useState("");
  const [cockpitClock, setCockpitClock] = useState(() => formatApexCockpitClock());
  const [cockpitFocusDrawer, setCockpitFocusDrawer] = useState("");
  const [cockpitImmersiveMode, setCockpitImmersiveMode] = useState(true);
  const [cockpitSpotlightMode, setCockpitSpotlightMode] = useState(true);
  const [cockpitConsoleTab, setCockpitConsoleTab] = useState("live");
  const [cockpitCommandRoute, setCockpitCommandRoute] = useState(() => buildApexCockpitCommandRoute(""));
  const [cockpitTurns, setCockpitTurns] = useState([]);
  const [cockpitSelfFixDispatchReceipt, setCockpitSelfFixDispatchReceipt] = useState(null);
  const [cockpitBuildLoopReceipt, setCockpitBuildLoopReceipt] = useState(null);
  const cockpitAudioRef = useRef(null);
  const cockpitAudioUnlockedRef = useRef(false);
  const cockpitAudioReadyRef = useRef(false);
  const cockpitOutputFrameRef = useRef(0);
  const cockpitSpeakingRef = useRef(false);
  const cockpitSpeechJobIdRef = useRef(0);
  const cockpitTranscribingRef = useRef(false);
  const cockpitSubmittingRef = useRef(false);
  const cockpitSpeechSafetyTimerRef = useRef(0);
  const cockpitNoVoiceTimerRef = useRef(0);
  const cockpitTranscriptionTimeoutRef = useRef(0);
  const cockpitActiveTranscriptionTurnRef = useRef("");
  const cockpitResumeListeningTimerRef = useRef(0);
  const cockpitCaptionFinalTurnTimerRef = useRef(0);
  const cockpitListeningHandoffPendingRef = useRef(false);
  const cockpitRecordingRef = useRef(false);
  const cockpitBargeInEnabledRef = useRef(false);
  const cockpitAutoListeningRef = useRef(Boolean(conversationFirst));
  const cockpitVisibleAutoVoiceOpenPendingRef = useRef(false);
  const cockpitAlwaysOpenMicRef = useRef(cockpitAlwaysOpenMic);
  const cockpitRecoveringUntilRef = useRef(0);
  const cockpitDroppedMicFrameCountRef = useRef(0);
  const cockpitLastAlwaysOpenGateRef = useRef(null);
  const cockpitBargeInterruptedRef = useRef(false);
  const cockpitBriefingOfferedRef = useRef(false);
  const cockpitRunLaneOpenedRef = useRef("");
  const cockpitRecorderRef = useRef(null);
  const cockpitRecordedChunksRef = useRef([]);
  const cockpitPcmChunksRef = useRef([]);
  const cockpitPcmSampleRateRef = useRef(0);
  const cockpitPcmProcessorRef = useRef(null);
  const cockpitPcmMuteGainRef = useRef(null);
  const cockpitPcmWorkletUrlRef = useRef("");
  const cockpitMicCalibrationRef = useRef(cockpitMicCalibration);
  const cockpitMicCalibrationPaintRef = useRef(0);
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
  const cockpitCurrentCaptureIdRef = useRef("");
  const cockpitBrowserTranscriptCaptureIdRef = useRef("");
  const cockpitLastVoiceInputModeRef = useRef("");
  const cockpitCurrentSpeechInputModeRef = useRef("");
  const cockpitInterruptionCountRef = useRef(0);
  const cockpitLastInterruptionLabelRef = useRef("");
  const cockpitVoiceRetryCountRef = useRef(0);
  const cockpitPendingInterruptionRef = useRef(false);
  const cockpitSpeechStartedRef = useRef(false);
  const cockpitVoiceStartedAtRef = useRef(0);
  const cockpitLastSoundAtRef = useRef(0);
  const cockpitLastLevelPaintRef = useRef(0);
  const cockpitDiscardNextCaptureRef = useRef(false);
  const cockpitLastHandledVoiceTurnRef = useRef({ key: "", at: 0 });
  const cockpitLastSpokenAnswerRef = useRef({ key: "", text: "", at: 0 });
  const cockpitVoiceTurnTimingRef = useRef({ turnId: "", startedAt: 0 });
  const cockpitLastLocalVoiceReceiptRef = useRef(cockpitLastLocalVoiceReceipt);
  const cockpitLiveVoiceBenchmarkRef = useRef({ armed: false, benchmarkId: "" });
  const cockpitSavedLiveTurnReceiptRef = useRef({ key: "" });
  const cockpitLastHeartbeatRef = useRef(null);
  const cockpitLastProactiveSignatureRef = useRef("");
  const cockpitLastSpokenProactiveSignatureRef = useRef("");
  const cockpitPendingProactiveVoiceRef = useRef(null);
  const cockpitProactiveMemorySavingRef = useRef(false);
  const cockpitAutoDriveRunningRef = useRef(false);
  const cockpitLastAutoDriveHandbackAtRef = useRef(0);
  const approvalRows = (state.approvalCommandCenter?.queueRows || []).slice(0, 4);
  const agentRows = (state.agentControlPlane?.rosterRows || []).slice(0, 4);
  const boundaryRows = [
    { id: "no-sends", title: "No Sends", detail: "I don't send anything.", icon: "inbox" },
    { id: "no-deploys", title: "No Deploys", detail: "I don't deploy anything.", icon: "alert" },
    { id: "no-production", title: "No Production Changes", detail: "I don't change production.", icon: "settings" },
    { id: "no-billing", title: "No Billing Actions", detail: "I don't process payments.", icon: "clock" },
    { id: "private-apex", title: "Private Apex", detail: "I act privately for reversible work and ask before consequential actions.", icon: "check" },
  ];
  const quickPrompts = [
    "Brief me first",
    "What's blocked?",
    "What needs review?",
    "Get this done as a private run",
  ];
  const memoryCount = state.decisionMemory?.durableCount || state.decisionMemory?.decisionCount || 0;
  const cockpitOperatorName = resolveApexPrivateOperatorDisplayName(state.operatorName);
  const cockpitVoiceProfileConfig = findApexCockpitVoiceProfile(cockpitVoiceProfile);
  const cockpitPersonalityConfig = findApexCockpitPersonalityMode(cockpitPersonalityMode);
  const cockpitBriefingText = buildApexCockpitProactiveBriefing(state);
  const canUseCockpitRecorder = typeof navigator !== "undefined"
    && Boolean(navigator.mediaDevices?.getUserMedia)
    && typeof MediaRecorder !== "undefined";
  const canUseCockpitSpeechRecognition = Boolean(getApexCockpitSpeechRecognitionCtor());
  const cockpitMicReady = cockpitMicPermissionState === "granted";
  const cockpitNeedsWake = canUseCockpitRecorder && !cockpitMicReady && cockpitMicPermissionState !== "denied";
  const releaseVersion = state.releaseDesk?.currentVersion
    ? `v${state.releaseDesk.currentVersion}`
    : state.releaseDesk?.deployHistoryRows?.[0]?.status || "Evidence required";
  const releaseHealth = state.releaseDesk?.status || "Healthy";
  const liveOperatorMode = state.liveOperatorMode || {};
  const liveOperatorMemory = cockpitLiveOperatorMemory || state.liveOperatorMemory || liveOperatorMode.runMemory || {};
  const trustedRunMemoryCount = Number(liveOperatorMemory.trustedCount || liveOperatorMode.trustedRunMemoryCount || 0);
  const pendingRunMemoryCount = Number(liveOperatorMemory.suggestedCount || liveOperatorMode.pendingRunMemoryCount || 0);
  const latestRunMemory = (Array.isArray(liveOperatorMemory.latestRows) ? liveOperatorMemory.latestRows : [])[0] || null;
  const cockpitPulseRunSummary = cockpitLivePulse?.runSummary || {};
  const cockpitAllRunRows = listApexCockpitRunRows(cockpitLiveRuns.length ? cockpitLiveRuns : state.autonomyRunCenter?.runRows || []);
  const cockpitVisibleRunRows = listApexCockpitHomeRunRows(cockpitAllRunRows);
  const cockpitActiveRun = cockpitVisibleRunRows.find((run) => run.id === cockpitActiveRunId)
    || cockpitVisibleRunRows.find((run) => !["done", "archived"].includes(String(run.status || "").toLowerCase()))
    || cockpitVisibleRunRows[0]
    || null;
  const cockpitActiveRunProgress = summarizeApexCockpitRunProgress(cockpitActiveRun || {});
  const cockpitSessionHeartbeat = buildApexOsAutonomyRunHeartbeat(cockpitActiveRun, {
    now: new Date().toISOString(),
    pulse: cockpitLivePulse,
  });
  const cockpitSessionHeartbeatText = buildApexCockpitHeartbeatText(cockpitSessionHeartbeat);
  const cockpitVisibleProactiveCheckIn = cockpitProactiveCheckIn || buildApexOsAutonomyRunProactiveCheckIn(null, cockpitSessionHeartbeat, {
    now: new Date().toISOString(),
    suppressReviewGateCheckIns: true,
  });
  const cockpitProactiveCheckInText = buildApexCockpitProactiveCheckInText(cockpitVisibleProactiveCheckIn);
  const cockpitProactiveMemorySignature = cockpitVisibleProactiveCheckIn?.signature || "";
  const cockpitVisibleProactiveMemoryId = cockpitProactiveMemoryIds[cockpitProactiveMemorySignature] || "";
  const canDraftCockpitProactiveMemory = state.canView
    && Boolean(sessionToken)
    && Boolean(cockpitVisibleProactiveCheckIn?.shouldSurface)
    && !cockpitVisibleProactiveMemoryId
    && !cockpitProactiveMemoryBusy;
  const cockpitOperatorJudgmentRows = buildApexCockpitOperatorJudgmentRows({
    state,
    pulse: cockpitLivePulse,
    activeRun: cockpitActiveRun,
    activeRunProgress: cockpitActiveRunProgress,
  });
  const cockpitOperatorJudgmentText = buildApexCockpitOperatorJudgmentText(cockpitOperatorJudgmentRows);
  const cockpitVisibleSavedRunCount = Number(cockpitLiveRunSummary.total ?? cockpitPulseRunSummary.total ?? liveOperatorMode.savedRunCount ?? cockpitAllRunRows.length ?? 0);
  const cockpitVisibleActiveRunCount = cockpitVisibleRunRows.length
    ? Number(cockpitLiveRunSummary.active ?? cockpitPulseRunSummary.active ?? liveOperatorMode.activeRunCount ?? cockpitVisibleRunRows.length ?? 0)
    : 0;
  const cockpitVisibleLiveStatus = cockpitVisibleActiveRunCount ? "Live operator running" : liveOperatorMode.status || "Live operator ready";
  const cockpitVisibleLiveTone = cockpitVisibleActiveRunCount ? "green" : liveOperatorMode.tone || "blue";
  const cockpitVisibleOperatorPercent = cockpitVisibleActiveRunCount
    ? Math.max(Number(liveOperatorMode.jarvisBehaviorPercent || 0), 92)
    : Number(liveOperatorMode.jarvisBehaviorPercent || 0);
  const cockpitAnswerText = resolveApexCockpitAnswerText(cockpitResponse);
  const cockpitBackgroundPayload = cockpitBackgroundStatus?.background || cockpitBackgroundStatus || {};
  const cockpitLocalIntelligence = buildApexLocalIntelligenceStatus({
    response: cockpitResponse,
    selectedEffort: cockpitSelectedEffort,
    providerStatusPayload: {
      ...(cockpitLocalProviderStatus || {}),
      background: cockpitBackgroundPayload,
      brain: cockpitBackgroundPayload?.brain || {},
      gpu: cockpitBackgroundPayload?.gpu || {},
    },
  });
  const cockpitBuildLoopOutcome = String(cockpitBuildLoopReceipt?.outcome || cockpitBuildLoopReceipt?.finalOutcome || "").toLowerCase();
  const cockpitBuildLoopStatusLabel = cockpitBuildLoopOutcome === "fixed"
    ? "Fixed"
    : cockpitBuildLoopOutcome === "blocked"
      ? "Blocked"
      : cockpitBuildLoopOutcome === "needs-john"
        ? "Needs John"
        : cockpitCreatingLiveRun && cockpitCommandRoute.commandAction === "run-autonomous-build-loop"
          ? "Running"
          : "Idle";
  const cockpitBuildLoopToneClass = cockpitBuildLoopStatusLabel === "Fixed"
    ? "border-emerald-300/18 bg-emerald-500/10 text-emerald-200"
    : cockpitBuildLoopStatusLabel === "Blocked" || cockpitBuildLoopStatusLabel === "Needs John"
      ? "border-orange-300/18 bg-orange-500/10 text-orange-200"
      : cockpitBuildLoopStatusLabel === "Running"
        ? "border-cyan-300/16 bg-cyan-500/10 text-cyan-100"
        : "border-slate-700 bg-slate-950/60 text-slate-300";
  const cockpitActiveRunHandback = buildApexOsAutonomyRunHandback(cockpitActiveRun, {
    latestAnswer: cockpitAnswerText,
    now: new Date().toISOString(),
  });
  const cockpitActiveRunHandbackText = buildApexCockpitRunHandbackText(cockpitActiveRunHandback);
  const cockpitNextPrivateMove = buildApexOsAutonomyRunNextPrivateMove(cockpitActiveRun, {
    now: new Date().toISOString(),
  });
  const cockpitRunTimelineRows = buildApexCockpitRunTimelineRows(cockpitActiveRun, cockpitActiveRunProgress, cockpitNextPrivateMove);
  const cockpitMissionBrief = buildApexCockpitMissionBrief({
    activeRun: cockpitActiveRun,
    activeRunProgress: cockpitActiveRunProgress,
    heartbeat: cockpitSessionHeartbeat,
    proactiveCheckIn: cockpitVisibleProactiveCheckIn,
    nextPrivateMove: cockpitNextPrivateMove,
    operatorJudgmentRows: cockpitOperatorJudgmentRows,
    liveOperatorMemory,
    pulse: cockpitLivePulse,
  });
  const cockpitWatchOfficer = buildApexCockpitWatchOfficer({
    activeRun: cockpitActiveRun,
    activeRunProgress: cockpitActiveRunProgress,
    heartbeat: cockpitSessionHeartbeat,
    proactiveCheckIn: cockpitVisibleProactiveCheckIn,
    missionBrief: cockpitMissionBrief,
    nextPrivateMove: cockpitNextPrivateMove,
    operatorJudgmentRows: cockpitOperatorJudgmentRows,
    liveOperatorMemory,
    pulse: cockpitLivePulse,
    proactiveVoiceStatus: cockpitProactiveVoiceStatus,
    proactiveMemoryId: cockpitVisibleProactiveMemoryId,
    proactiveMemoryCount: cockpitProactiveMemoryCount,
  });
  const canAutoDriveCockpitRun = state.canView
    && Boolean(sessionToken)
    && Boolean(cockpitActiveRun?.id)
    && Boolean(cockpitNextPrivateMove?.canAdvance)
    && !["done", "archived", "blocked"].includes(String(cockpitActiveRun?.status || "").toLowerCase())
    && !["operator-review", "review-blocker", "review-result"].includes(String(cockpitNextPrivateMove?.actionId || ""))
    && !cockpitUpdatingRun
    && !cockpitCreatingLiveRun;
  const cockpitRunMemoryReviewRow = findApexCockpitRunMemoryReviewRow(cockpitActiveRun, liveOperatorMemory);
  const cockpitRunMemoryReviewStatus = cockpitRunMemoryReviewRow?.status || (cockpitActiveRun?.decisionMemoryId ? "missing" : "not-drafted");
  const canTrustCockpitRunMemory = state.canView
    && Boolean(sessionToken)
    && Boolean(cockpitRunMemoryReviewRow?.id)
    && cockpitRunMemoryReviewRow.status === "suggested"
    && !cockpitRunMemoryReviewBusy;
  const cockpitRunMemoryReviewNoticeText = cockpitRunMemoryReviewNotice || (
    cockpitRunMemoryReviewStatus === "approved"
      ? "Run memory is trusted. Apex can use this reviewed run outcome in future answers. No external action was executed."
      : cockpitRunMemoryReviewStatus === "archived"
        ? "Run memory is archived. Apex will not trust this run outcome in future answers."
        : cockpitRunMemoryReviewStatus === "suggested"
          ? "Memory stays suggested until you trust it. Trusting memory changes only Apex's reviewed context; it does not send, bill, deploy, publish, or execute anything."
          : "Report the run done to draft suggested memory for manual trust or archive review."
  );
  const cockpitClosingReport = buildApexCockpitClosingReport({
    activeRun: cockpitActiveRun,
    activeRunProgress: cockpitActiveRunProgress,
    handback: cockpitActiveRunHandback,
    nextPrivateMove: cockpitNextPrivateMove,
    memoryReviewRow: cockpitRunMemoryReviewRow,
    memoryReviewStatus: cockpitRunMemoryReviewStatus,
    latestAnswer: cockpitAnswerText,
  });
  const cockpitFollowUpPrompts = buildApexCockpitFollowUpPrompts({
    answerText: cockpitAnswerText,
    route: cockpitCommandRoute,
    activeRun: cockpitActiveRun,
    activeRunProgress: cockpitActiveRunProgress,
    liveOperatorMemory,
    operatorJudgmentRows: cockpitOperatorJudgmentRows,
  });
  const cockpitVisibleConversationContext = buildApexCockpitVisibleConversationContext({
    turns: cockpitTurns,
    lastQuestion: cockpitLastQuestion,
    answerText: cockpitAnswerText,
    route: cockpitCommandRoute,
    activeRun: cockpitActiveRun,
    nextPrivateMove: cockpitNextPrivateMove,
    interruptionCount: cockpitInterruptionCount,
    retryCount: cockpitVoiceRetryCount,
    retryReason: cockpitVoiceRetryReason,
  });
  const cockpitTurnMemoryKey = apexCockpitMemoryText(cockpitResponse?.requestId || `${cockpitLastQuestion}|${cockpitAnswerText}`, 220);
  const cockpitAlwaysOpenMicMode = cockpitAlwaysOpenMic?.state || APEX_ALWAYS_OPEN_MIC_STATE.STANDBY;
  const cockpitVoiceMode = cockpitError
    ? "blocked"
    : cockpitSpeaking
      ? "speaking"
      : cockpitAlwaysOpenMicMode === APEX_ALWAYS_OPEN_MIC_STATE.RECOVERING
        ? "recovering"
      : (cockpitSubmitting || cockpitTranscribing)
        ? "processing"
      : cockpitSpeechActive
          ? "capturing"
          : !cockpitAutoListening
            ? "quiet"
          : cockpitRecording
            ? "standby"
            : cockpitAutoListening
              ? "standby"
              : "quiet";
  const cockpitVoiceState = APEX_COCKPIT_VOICE_STATES[cockpitVoiceMode];
  const cockpitLocalVoicePayload = cockpitLocalVoiceStatus?.localVoice || cockpitLocalVoiceStatus || {};
  const cockpitBackgroundRuntimeStatus = String(cockpitBackgroundPayload?.status || "checking");
  const cockpitBackgroundRuntimeToneClass = cockpitBackgroundRuntimeStatus === "healthy"
    ? "border-emerald-300/18 bg-emerald-500/10 text-emerald-200"
    : cockpitBackgroundRuntimeStatus === "degraded"
      ? "border-orange-300/18 bg-orange-500/10 text-orange-200"
      : "border-cyan-300/14 bg-cyan-500/10 text-cyan-200";
  const cockpitBackgroundVoice = cockpitBackgroundPayload?.voice || {};
  const cockpitNativeVoiceStatus = cockpitLocalVoicePayload.nativeVoice || cockpitBackgroundVoice.nativeVoice || {};
  const cockpitNativeVoiceReady = Boolean(cockpitNativeVoiceStatus.available || cockpitNativeVoiceStatus.canListenNatively || cockpitLocalVoicePayload.nativeInputAvailable);
  const cockpitCanUseBrowserAutoVoice = canUseCockpitRecorder && cockpitMicPermissionState !== "denied";
  const cockpitCanUseNativeAutoVoice = cockpitNativeVoiceReady;
  const cockpitWakeButtonLabel = cockpitRecording
    ? "Pause Voice"
    : cockpitTranscribing
      ? "Stop Voice"
      : cockpitSubmitting
        ? "Thinking"
        : cockpitSpeaking
          ? "Interrupt Voice"
          : cockpitNeedsWake || (canUseCockpitRecorder && cockpitMicPermissionState === "denied" && !cockpitNativeVoiceReady)
            ? "Allow Mic"
            : "Resume Voice";
  const cockpitNativeVoiceProvider = cockpitNativeVoiceStatus.selectedInputMode || cockpitLocalVoicePayload.nativeMicProvider || "windows-sapi-direct";
  const cockpitPreferredVoiceInputMode = cockpitNativeVoiceReady
    ? cockpitNativeVoiceProvider
    : cockpitLocalVoicePayload.preferredInputMode || "browser-audio-worklet-wav";
  const cockpitLatestLocalVoiceReceipt = cockpitLastLocalVoiceReceipt || cockpitLocalVoicePayload.lastVoiceTurn || cockpitBackgroundVoice.lastVoiceTurn || null;
  const cockpitRuntimeSttEngines = Array.isArray(cockpitLocalVoicePayload.sttEngines) && cockpitLocalVoicePayload.sttEngines.length
    ? cockpitLocalVoicePayload.sttEngines
    : cockpitBackgroundVoice.sttProvider
      ? [{
          id: cockpitBackgroundVoice.sttProvider,
          name: cockpitBackgroundVoice.sttName || cockpitBackgroundVoice.sttProvider,
          available: cockpitBackgroundVoice.ready !== false,
          local: true,
          processor: cockpitBackgroundVoice.sttProcessor || "unknown",
          gpuCapable: /gpu|cuda/i.test(`${cockpitBackgroundVoice.sttProvider || ""} ${cockpitBackgroundVoice.sttProcessor || ""}`),
        }]
      : state.apexPersonalOsCore?.localVoice?.sttEngines || [];
  const cockpitRuntimeTtsEngines = Array.isArray(cockpitLocalVoicePayload.ttsEngines) && cockpitLocalVoicePayload.ttsEngines.length
    ? cockpitLocalVoicePayload.ttsEngines
    : cockpitBackgroundVoice.ttsProvider
      ? [{
          id: /kokoro/i.test(cockpitBackgroundVoice.ttsProvider) ? "apex-lightweight-kokoro" : cockpitBackgroundVoice.ttsProvider,
          name: cockpitBackgroundVoice.ttsProvider,
          available: cockpitBackgroundVoice.ready !== false,
          local: true,
          processor: cockpitBackgroundVoice.ttsProcessor || "",
          voiceId: cockpitBackgroundVoice.ttsVoice || "",
          voiceName: cockpitBackgroundVoice.ttsVoice || "",
        }]
      : state.apexPersonalOsCore?.localVoice?.ttsEngines || [];
  const cockpitLocalVoiceReadiness = buildApexPersonalOsLocalVoiceReadiness({
    loopState: cockpitVoiceMode,
    microphoneSupported: canUseCockpitRecorder,
    microphonePermission: cockpitMicPermissionState,
    recording: cockpitRecording,
    transcribing: cockpitTranscribing,
    thinking: cockpitSubmitting,
    speaking: cockpitSpeaking,
    failed: Boolean(cockpitError || cockpitRecognitionError),
    browserSpeechRecognitionSupported: !conversationFirst && canUseCockpitSpeechRecognition,
    browserSpeechSynthesisSupported: typeof window !== "undefined" && Boolean(window.speechSynthesis) && typeof SpeechSynthesisUtterance !== "undefined",
    browserAudioUnlocked: cockpitAudioReady,
    sttEngines: cockpitRuntimeSttEngines,
    ttsEngines: cockpitRuntimeTtsEngines,
    lastVoiceTurn: cockpitLatestLocalVoiceReceipt,
  });
  const cockpitLocalVoiceTtsLabel = APEX_COCKPIT_USE_FAST_SIMPLE_VOICE
    ? "Windows SAPI fast test"
    : cockpitLocalVoiceReadiness.usingLightweightVoice
    ? `Kokoro ONNX${cockpitLocalVoiceReadiness.lightweightVoiceId ? ` / ${cockpitLocalVoiceReadiness.lightweightVoiceId}` : ""}${cockpitLocalVoiceReadiness.lightweightVoiceProcessor ? " / CPU" : ""}`
    : cockpitLocalVoiceReadiness.usingPiperVoiceFallback
      ? "Piper fallback"
      : cockpitLocalVoiceReadiness.usingWindowsVoiceFallback
        ? "Windows SAPI emergency"
        : cockpitLocalVoiceReadiness.ttsEngine || cockpitLocalVoiceReadiness.ttsStatus || "config needed";
  const cockpitMicCalibrationSummary = buildApexCockpitMicTestSummary({
    calibration: cockpitMicCalibration,
    canUseRecorder: canUseCockpitRecorder,
    canUseNativeVoice: cockpitNativeVoiceReady,
    micPermissionState: cockpitMicPermissionState,
    recording: cockpitRecording,
  });
  const cockpitMicCaptureLabel = cockpitMicCalibration.captureProvider || "none";
  const cockpitMicGateLabel = formatApexCockpitMicPercent(cockpitMicCalibration.calibratedLevelThreshold || APEX_COCKPIT_LEVEL_THRESHOLD);
  const cockpitMicPeakLabel = formatApexCockpitMicPercent(cockpitMicCalibration.peakLevel || 0);
  const cockpitVoiceTimingSummary = buildApexCockpitVoiceTimingSummary(cockpitLocalVoiceReadiness.lastVoiceTurn || cockpitLatestLocalVoiceReceipt, cockpitAlwaysOpenMic);
  const cockpitLatencyProfile = cockpitResponse?.answer?.latencyProfile || cockpitLatestLocalVoiceReceipt?.latencyProfile || cockpitBackgroundPayload?.latency?.profile || null;
  const cockpitLatencyLabel = cockpitLatencyProfile?.slowestStepLabel
    ? `${cockpitLatencyProfile.status || "timing"} / ${cockpitLatencyProfile.slowestStepLabel} ${cockpitLatencyProfile.slowestStepMs || 0}ms`
    : cockpitBackgroundPayload?.latency?.slowestStepLabel
      ? `${cockpitBackgroundPayload.latency.status || "timing"} / ${cockpitBackgroundPayload.latency.slowestStepLabel} ${cockpitBackgroundPayload.latency.slowestStepMs || 0}ms`
      : "profiling";
  const cockpitLiveBenchmarkStatus = buildApexCockpitLiveBenchmarkStatus(
    cockpitLiveBenchmarkSummary
    || cockpitBackgroundPayload?.liveTurnBenchmarkHistory
    || cockpitBackgroundPayload?.latency?.benchmarkHistory
    || null,
  );
  const cockpitShouldShowLastVoiceTurn = Boolean(cockpitLocalVoiceReadiness.lastTurnStatus)
    && !(cockpitMicCalibration.signalDetected && /\b(failed|error)\b/i.test(cockpitLocalVoiceReadiness.lastTurnStatus));
  const cockpitPersonalOsCore = buildApexPersonalOsCoreState({
    voiceReadiness: cockpitLocalVoiceReadiness,
  });
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
  const canUseCockpitVoiceInput = canUseCockpitRecorder || cockpitNativeVoiceReady;
  const canStartCockpitVoice = state.canView && Boolean(sessionToken) && cockpitPageVisible && canUseCockpitVoiceInput && !cockpitRecording && !cockpitTranscribing && !cockpitSubmitting && !cockpitSpeaking && cockpitAlwaysOpenMicMode !== APEX_ALWAYS_OPEN_MIC_STATE.RECOVERING && !cockpitVoiceOpeningRef.current;
  const cockpitVoiceBusy = cockpitRecording || cockpitTranscribing || cockpitVoiceOpeningRef.current;
  const canToggleCockpitVoice = canStartCockpitVoice || cockpitVoiceBusy;
  const cockpitCaptionStatusLabel = !canUseCockpitSpeechRecognition
    ? "Server transcription"
    : cockpitRecognitionStatus === "captioning"
      ? "Live captions active"
      : cockpitRecognitionStatus === "interim"
        ? "Capturing words"
        : cockpitRecognitionStatus === "recovering"
          ? "Captions recovering"
          : cockpitRecognitionStatus === "blocked"
            ? "Captions blocked"
            : cockpitRecognitionStatus === "limited"
              ? "Captions limited"
              : "Caption fallback ready";
  const cockpitVoiceHealth = buildApexCockpitVoiceHealth({
    canUseRecorder: canUseCockpitRecorder,
    canUseNativeVoice: cockpitNativeVoiceReady,
    canUseSpeechRecognition: canUseCockpitSpeechRecognition,
    micPermissionState: cockpitMicPermissionState,
    wakeAttempted: cockpitVoiceWakeAttempted,
    recording: cockpitRecording,
    autoListening: cockpitAutoListening,
    speaking: cockpitSpeaking,
    transcribing: cockpitTranscribing,
    submitting: cockpitSubmitting,
    recognitionStatus: cockpitRecognitionStatus,
    recognitionError: cockpitRecognitionError,
    needsWake: cockpitNeedsWake,
    audioUnlocked: cockpitAudioReady,
    conversationMode: cockpitConversationMode,
    bargeInEnabled: cockpitBargeInEnabled,
    retryCount: cockpitVoiceRetryCount,
    retryReason: cockpitVoiceRetryReason,
    alwaysOpenMic: cockpitAlwaysOpenMic,
    localVoiceReadiness: cockpitLocalVoiceReadiness,
    backgroundStatus: cockpitBackgroundPayload,
    micCalibration: cockpitMicCalibration,
  });
  const cockpitVoiceHealthSummary = cockpitVoiceHealth.rows.map((item) => `${item.label}: ${item.value}`).join(" / ");
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
    voiceRetryCount: cockpitVoiceRetryCount,
  });
  const focusDrawerTabs = [
    { id: "voice", label: "Voice", value: cockpitVoiceHealth.status, tone: cockpitVoiceHealth.tone, icon: "phone" },
    { id: "autonomy", label: "Autonomy", value: cockpitCommandRoute.id === "agent-control" ? "Draft-ready" : "Guarded", tone: "green", icon: "spark" },
    { id: "memory", label: "Memory", value: trustedRunMemoryCount ? `${trustedRunMemoryCount} run history` : `${memoryCount} trusted`, tone: trustedRunMemoryCount ? "green" : "slate", icon: "database" },
    { id: "risk", label: "Risk", value: `${state.approvalCommandCenter?.queueCount || 0} review`, tone: "amber", icon: "alert" },
    { id: "sources", label: "Sources", value: cockpitSources.length ? `${cockpitSources.length} used` : "Ready", tone: "blue", icon: "layers" },
  ];
  const cockpitVisiblePromptRows = cockpitFollowUpPrompts.length
    ? cockpitFollowUpPrompts
    : quickPrompts.map((prompt) => normalizeApexCockpitFollowUpPrompt({
      id: `quick-${prompt.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      label: prompt,
      question: prompt,
      detail: "Load this prompt into Apex.",
      tone: /blocked|review/i.test(prompt) ? "amber" : /private run/i.test(prompt) ? "green" : "blue",
    }));
  const cockpitConsoleTabs = [
    {
      id: "live",
      label: "Live",
      value: cockpitSessionHeartbeat.status || "Ready",
      detail: cockpitSessionHeartbeat.recommendation || "Heartbeat and private Apex status.",
      tone: cockpitSessionHeartbeat.tone || "blue",
      icon: "phone",
    },
    {
      id: "run",
      label: "Run",
      value: cockpitActiveRun ? cockpitActiveRun.status || "Active" : `${cockpitVisibleSavedRunCount} saved`,
      detail: cockpitActiveRun?.title || "Private run ledger and safe run controls.",
      tone: cockpitActiveRun ? apexCockpitRunStatusTone(cockpitActiveRun.status) : cockpitVisibleSavedRunCount ? "green" : "slate",
      icon: "spark",
    },
    {
      id: "pulse",
      label: "Pulse",
      value: cockpitVisibleProactiveCheckIn.shouldSurface ? "Check-in" : cockpitLivePulse?.checkedAt ? "Fresh" : "Ready",
      detail: cockpitVisibleProactiveCheckIn.recommendation || cockpitLivePulseError || "Proactive checks and operator judgment.",
      tone: cockpitVisibleProactiveCheckIn.shouldSurface ? "amber" : cockpitLivePulse?.checkedAt ? "green" : "blue",
      icon: "refresh",
    },
    {
      id: "loop",
      label: "Loop",
      value: `${(liveOperatorMode.operatorLoopRows || []).length || 0} lanes`,
      detail: "Operator loop lanes and locked action boundaries.",
      tone: "green",
      icon: "layers",
    },
  ];
  const cockpitNowState = buildApexCockpitNowState({
    voiceState: cockpitVoiceState,
    error: cockpitError,
    submitting: cockpitSubmitting,
    transcribing: cockpitTranscribing,
    speaking: cockpitSpeaking,
    speechActive: cockpitSpeechActive,
    recording: cockpitRecording,
    autoListening: cockpitAutoListening,
    conversationMode: cockpitConversationMode,
    activeRun: cockpitActiveRun,
    activeRunProgress: cockpitActiveRunProgress,
    heartbeat: cockpitSessionHeartbeat,
    proactiveCheckIn: cockpitVisibleProactiveCheckIn,
    latestRunMemory,
    commandRoute: cockpitCommandRoute,
    answerText: cockpitAnswerText,
    voiceNotice: cockpitVoiceNotice,
    agentActionNotice: cockpitAgentActionNotice,
    liveRunNotice: cockpitLiveRunNotice,
    captionStatusLabel: cockpitCaptionStatusLabel,
  });

  useEffect(() => {
    let cancelled = false;
    async function loadBackgroundStatus() {
      if (!sessionToken) {
        setCockpitBackgroundStatus(null);
        return;
      }
      try {
        const payload = await getApexOsBackgroundStatus(sessionToken);
        if (cancelled) return;
        setCockpitBackgroundStatus(payload?.background || payload);
      } catch {
        if (cancelled) return;
        setCockpitBackgroundStatus(null);
      }
    }
    loadBackgroundStatus();
    return () => {
      cancelled = true;
    };
  }, [sessionToken]);

  useEffect(() => {
    cockpitLastLocalVoiceReceiptRef.current = cockpitLastLocalVoiceReceipt;
  }, [cockpitLastLocalVoiceReceipt]);

  useEffect(() => {
    let cancelled = false;
    async function loadLocalProviderStatus() {
      if (!state.canView || !sessionToken) {
        setCockpitLocalProviderStatus(null);
        setCockpitLocalProviderNotice("");
        return;
      }
      try {
        const payload = await getApexOsLocalProvidersStatus(sessionToken);
        if (cancelled) return;
        setCockpitLocalProviderStatus(payload);
        setCockpitLocalProviderNotice("");
      } catch (error) {
        if (cancelled) return;
        setCockpitLocalProviderStatus(null);
        setCockpitLocalProviderNotice(error?.message || "Local provider status is unavailable right now.");
      }
    }
    loadLocalProviderStatus();
    return () => {
      cancelled = true;
    };
  }, [state.canView, sessionToken]);

  useEffect(() => {
    let cancelled = false;
    async function loadLocalVoiceStatus() {
      if (!state.canView || !sessionToken) {
        setCockpitLocalVoiceStatus(null);
        return;
      }
      try {
        const payload = await getApexOsLocalVoiceStatus(sessionToken);
        if (cancelled) return;
        setCockpitLocalVoiceStatus(payload?.localVoice || payload);
      } catch {
        if (cancelled) return;
        setCockpitLocalVoiceStatus(null);
      }
    }
    loadLocalVoiceStatus();
    return () => {
      cancelled = true;
    };
  }, [state.canView, sessionToken]);

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
    clearCockpitResumeListeningTimer();
    clearCockpitCaptionFinalTurnTimer();
    clearCockpitNoVoiceTimer();
    clearCockpitTranscriptionTimeout();
    stopBrowserVoice(cockpitAudioRef);
    closeUnlockedBrowserAudio(cockpitAudioUnlockedRef);
  }, []);

  useEffect(() => {
    cockpitSpeakingRef.current = cockpitSpeaking;
  }, [cockpitSpeaking]);

  useEffect(() => {
    cockpitTranscribingRef.current = cockpitTranscribing;
  }, [cockpitTranscribing]);

  useEffect(() => {
    cockpitSubmittingRef.current = cockpitSubmitting;
  }, [cockpitSubmitting]);

  useEffect(() => {
    cockpitRecordingRef.current = cockpitRecording;
  }, [cockpitRecording]);

  useEffect(() => {
    cockpitBargeInEnabledRef.current = cockpitBargeInEnabled;
  }, [cockpitBargeInEnabled]);

  useEffect(() => {
    cockpitAutoListeningRef.current = cockpitAutoListening;
  }, [cockpitAutoListening]);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const syncPageVisibility = () => {
      setCockpitPageVisible(document.visibilityState !== "hidden");
    };
    syncPageVisibility();
    document.addEventListener("visibilitychange", syncPageVisibility);
    return () => document.removeEventListener("visibilitychange", syncPageVisibility);
  }, []);

  useEffect(() => {
    if (cockpitPageVisible) return undefined;
    if (!cockpitRecordingRef.current && !cockpitVoiceOpeningRef.current) return undefined;
    pauseCockpitVoiceSession();
    return undefined;
  }, [cockpitPageVisible]);

  useEffect(() => {
    if (!conversationFirst || cockpitVisibleAutoVoiceOpenPendingRef.current) return undefined;
    if (!state.canView || !sessionToken || !cockpitConversationMode || !cockpitAutoListening || !cockpitPageVisible || !canStartCockpitVoice) return undefined;
    if (!cockpitNativeVoiceReady && cockpitMicPermissionState !== "granted") return undefined;
    if (cockpitRecording || cockpitTranscribing || cockpitSubmitting || cockpitSpeaking || cockpitAlwaysOpenMicMode === APEX_ALWAYS_OPEN_MIC_STATE.RECOVERING) return undefined;
    cockpitVisibleAutoVoiceOpenPendingRef.current = true;
    const openTimer = setTimeout(() => {
      if (!cockpitRecordingRef.current && !cockpitTranscribingRef.current && !cockpitSpeakingRef.current && !cockpitVoiceOpeningRef.current) {
        openCockpitVoiceSession({ automatic: true });
      }
      cockpitVisibleAutoVoiceOpenPendingRef.current = false;
    }, 450);
    return () => {
      clearTimeout(openTimer);
      cockpitVisibleAutoVoiceOpenPendingRef.current = false;
    };
  }, [
    conversationFirst,
    state.canView,
    sessionToken,
    cockpitConversationMode,
    cockpitAutoListening,
    cockpitPageVisible,
    canStartCockpitVoice,
    cockpitNativeVoiceReady,
    cockpitMicPermissionState,
    cockpitRecording,
    cockpitTranscribing,
    cockpitSubmitting,
    cockpitSpeaking,
    cockpitAlwaysOpenMicMode,
  ]);

  useEffect(() => {
    cockpitAlwaysOpenMicRef.current = cockpitAlwaysOpenMic;
  }, [cockpitAlwaysOpenMic]);

  useEffect(() => {
    cockpitMicCalibrationRef.current = cockpitMicCalibration;
  }, [cockpitMicCalibration]);

  useEffect(() => {
    const runId = cockpitActiveRun?.id || "";
    const runStatus = String(cockpitActiveRun?.status || "").toLowerCase();
    if (!runId || ["done", "archived"].includes(runStatus)) return;
    if (cockpitRunLaneOpenedRef.current === runId) return;
    cockpitRunLaneOpenedRef.current = runId;
    setCockpitConsoleTab("run");
  }, [cockpitActiveRun?.id, cockpitActiveRun?.status]);

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
      const nextState = status.state || "unknown";
      setCockpitMicPermissionState(nextState);
      if (nextState === "denied") {
        setCockpitVoiceNotice(resolveApexCockpitMicFailureMessage({ name: "NotAllowedError" }));
      } else if (nextState === "prompt") {
        setCockpitVoiceNotice("Chrome is waiting for microphone permission. Choose Allow for localhost:5173 so Apex can hear you.");
      }
      status.onchange = () => {
        const changedState = status.state || "unknown";
        setCockpitMicPermissionState(changedState);
        if (changedState === "granted") setCockpitVoiceNotice("Microphone is allowed for this Apex window. Talk naturally.");
        if (changedState === "denied") setCockpitVoiceNotice(resolveApexCockpitMicFailureMessage({ name: "NotAllowedError" }));
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
    setCockpitLiveOperatorMemory(state.liveOperatorMemory || state.liveOperatorMode?.runMemory || {});
  }, [state.liveOperatorMemory, state.liveOperatorMode?.runMemory]);

  useEffect(() => {
    if (!state.canView) return;
    const checkIn = buildApexOsAutonomyRunProactiveCheckIn(cockpitLastHeartbeatRef.current, cockpitSessionHeartbeat, {
      now: new Date().toISOString(),
      suppressReviewGateCheckIns: true,
    });
    cockpitLastHeartbeatRef.current = cockpitSessionHeartbeat;
    setCockpitProactiveCheckIn(checkIn);
    if (!checkIn.shouldSurface) {
      setCockpitProactiveVoiceStatus((current) => (current === "Watching" ? current : "Watching"));
      return;
    }
    if (cockpitLastProactiveSignatureRef.current === checkIn.signature) return;
    cockpitLastProactiveSignatureRef.current = checkIn.signature;
    const recentAutoDriveHandback = cockpitLastAutoDriveHandbackAtRef.current
      && Date.now() - cockpitLastAutoDriveHandbackAtRef.current < 12_000;
    if (!recentAutoDriveHandback) {
      const route = buildApexCockpitCommandRoute("Give me the active run check-in", {
        previousRoute: cockpitCommandRoute,
        activeRun: cockpitActiveRun,
        nextPrivateMove: cockpitNextPrivateMove,
      });
      const answer = buildApexCockpitProactiveCheckInText(checkIn);
      setCockpitCommandRoute(route);
      setCockpitError("");
      setCockpitResponse({
        answer: {
          answer,
          sourceLabels: checkIn.sourceLabels || ["Apex Proactive Check-In", "Live Session Heartbeat", "Autonomy Run Center"],
        },
      });
      setCockpitLastQuestion("Proactive check-in");
      setCockpitVoiceNotice(checkIn.voiceNotice || "Apex surfaced a proactive live-run check-in. Consequential actions stayed gated.");
    } else {
      setCockpitLiveRunNotice(checkIn.recommendation || "Apex noticed live-run progress while keeping the Auto Drive handback visible.");
    }
    speakCockpitProactiveCheckIn(checkIn, { reason: recentAutoDriveHandback ? "auto-drive-handback" : "automatic" });
    setCockpitTurns((current) => [
      {
        id: `cockpit-proactive-check-in-${Date.now()}`,
        question: checkIn.title || "Proactive check-in",
        source: "proactive",
        routeLabel: "Live heartbeat",
        status: checkIn.trigger || "noticed",
      },
      ...current,
    ].slice(0, 5));
    void saveCockpitProactiveCheckInMemory(checkIn, { automatic: true });
  }, [
    state.canView,
    cockpitSessionHeartbeat.signature,
    cockpitLivePulse?.checkedAt,
    cockpitCommandRoute?.id,
    cockpitActiveRun?.id,
    cockpitActiveRun?.status,
    cockpitNextPrivateMove?.actionId,
  ]);

  useEffect(() => {
    if (!cockpitAutoDriveEnabled) return undefined;
    if (cockpitUpdatingRun || cockpitCreatingLiveRun) return undefined;
    if (cockpitSpeaking || cockpitRecording || cockpitTranscribing || cockpitSubmitting) return undefined;
    if (!canAutoDriveCockpitRun) {
      if (cockpitActiveRun?.id && cockpitNextPrivateMove?.actionId) {
        setCockpitAutoDriveNotice(`Auto Drive is holding at ${cockpitNextPrivateMove.title || "manual review"}. Apex will not advance past review gates.`);
      }
      return undefined;
    }
    const autoDriveTimer = setTimeout(() => {
      if (cockpitAutoDriveRunningRef.current) return;
      cockpitAutoDriveRunningRef.current = true;
      advanceCockpitActiveRunWithServer({ autoDrive: true }).finally(() => {
        cockpitAutoDriveRunningRef.current = false;
      });
    }, 1_800);
    return () => clearTimeout(autoDriveTimer);
  }, [
    cockpitAutoDriveEnabled,
    canAutoDriveCockpitRun,
    cockpitActiveRun?.id,
    cockpitActiveRun?.updatedAt,
    cockpitNextPrivateMove?.actionId,
    cockpitNextPrivateMove?.title,
    cockpitUpdatingRun,
    cockpitCreatingLiveRun,
    cockpitSpeaking,
    cockpitRecording,
    cockpitTranscribing,
    cockpitSubmitting,
  ]);

  useEffect(() => {
    const pendingCheckIn = cockpitPendingProactiveVoiceRef.current;
    if (!pendingCheckIn?.shouldSurface) return undefined;
    if (!state.canView || !sessionToken || !cockpitConversationMode || !cockpitAutoListening) return undefined;
    if (cockpitNeedsWake && !cockpitMicReady && cockpitMicPermissionState === "denied") return undefined;
    if (cockpitSpeaking || cockpitRecording || cockpitTranscribing || cockpitSubmitting || cockpitAlwaysOpenMicMode === APEX_ALWAYS_OPEN_MIC_STATE.RECOVERING || cockpitVoiceOpeningRef.current) return undefined;
    if (cockpitLastAutoDriveHandbackAtRef.current && Date.now() - cockpitLastAutoDriveHandbackAtRef.current < 12_000) return undefined;
    const queuedVoiceTimer = setTimeout(() => {
      speakCockpitProactiveCheckIn(pendingCheckIn, { reason: "queued" });
    }, 450);
    return () => clearTimeout(queuedVoiceTimer);
  }, [
    state.canView,
    sessionToken,
    cockpitConversationMode,
    cockpitAutoListening,
    cockpitNeedsWake,
    cockpitMicReady,
    cockpitMicPermissionState,
    cockpitSpeaking,
    cockpitAlwaysOpenMicMode,
    cockpitRecording,
    cockpitTranscribing,
    cockpitSubmitting,
    cockpitProactiveVoiceQueueKey,
    cockpitLivePulse?.checkedAt,
    cockpitSessionHeartbeat.signature,
  ]);

  function cleanupCockpitVoiceStream() {
    clearCockpitCaptionFinalTurnTimer();
    clearCockpitNoVoiceTimer();
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
    if (cockpitPcmProcessorRef.current) {
      try {
        if (cockpitPcmProcessorRef.current.port) cockpitPcmProcessorRef.current.port.onmessage = null;
        cockpitPcmProcessorRef.current.onaudioprocess = null;
        cockpitPcmProcessorRef.current.disconnect();
      } catch {
        // Browser audio nodes can already be detached after permission changes.
      }
      cockpitPcmProcessorRef.current = null;
    }
    if (cockpitPcmMuteGainRef.current) {
      try {
        cockpitPcmMuteGainRef.current.disconnect();
      } catch {
        // Browser audio nodes can already be detached after permission changes.
      }
      cockpitPcmMuteGainRef.current = null;
    }
    if (cockpitPcmWorkletUrlRef.current && typeof URL !== "undefined" && typeof URL.revokeObjectURL === "function") {
      try {
        URL.revokeObjectURL(cockpitPcmWorkletUrlRef.current);
      } catch {
        // Blob URL cleanup is best effort after browser audio teardown.
      }
      cockpitPcmWorkletUrlRef.current = "";
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
    cockpitMicCalibrationPaintRef.current = 0;
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

  function buildCockpitPcmWavBlob() {
    const samples = mergeApexCockpitPcmChunks(cockpitPcmChunksRef.current);
    const sourceSampleRate = cockpitPcmSampleRateRef.current || 0;
    if (!samples.length || !sourceSampleRate) return null;
    const encoded = encodeFloat32PcmToWav(samples, { sourceSampleRate, targetSampleRate: 16000 });
    const blob = new Blob([encoded.buffer], { type: "audio/wav" });
    return {
      blob,
      metadata: {
        ...encoded.metadata,
        sourceMimeType: "audio/pcm",
        sourceByteLength: samples.length * 4,
        convertedMimeType: "audio/wav",
        convertedByteLength: blob.size,
        readyForTranscription: true,
        captureProvider: "browser-pcm",
      },
    };
  }

  function shouldPersistCockpitLiveTurnReceipt(receipt = {}) {
    const status = String(receipt?.status || "").toLowerCase();
    return Boolean(receipt?.turnId)
      && /\b(spoken|failed|error|fallback|duplicate-speech-held|playback-failed)\b/i.test(status)
      && Number(receipt?.timingMs?.totalTurnMs || receipt?.totalTurnMs || 0) > 0;
  }

  function persistCockpitLiveTurnReceipt(receipt = {}) {
    if (!sessionToken || !shouldPersistCockpitLiveTurnReceipt(receipt)) return;
    const key = `${receipt.turnId}|${receipt.status}|${receipt.totalTurnMs || receipt.timingMs?.totalTurnMs || 0}`;
    if (cockpitSavedLiveTurnReceiptRef.current.key === key) return;
    cockpitSavedLiveTurnReceiptRef.current = { key };
    void saveApexOsLocalVoiceLiveTurnReceipt(sessionToken, {
      receipt,
    }).catch(() => {});
  }

  function cockpitLiveBenchmarkMetadataForPatch(patch = {}, turnId = "") {
    const activeBenchmark = cockpitLiveVoiceBenchmarkRef.current || {};
    const explicitBenchmarkType = /^(typed|voice)$/i.test(String(patch.benchmarkType || "")) ? String(patch.benchmarkType).toLowerCase() : "";
    const inputMode = String(patch.inputMode || patch.source || cockpitLastVoiceInputModeRef.current || "").toLowerCase();
    const voiceBenchmarkActive = Boolean(activeBenchmark.armed) && inputMode !== "typed";
    if (!explicitBenchmarkType && !voiceBenchmarkActive) return {};
    const benchmarkType = explicitBenchmarkType || "voice";
    return {
      benchmarkVersion: "v1.1",
      benchmarkType,
      benchmarkId: patch.benchmarkId || activeBenchmark.benchmarkId || (turnId ? `ALB-${turnId}` : ""),
      explicitUserStarted: patch.explicitUserStarted === true || voiceBenchmarkActive,
      visibleUserStarted: true,
      noHiddenMicCapture: true,
      inputMode: patch.inputMode || benchmarkType,
    };
  }

  function updateCockpitLiveBenchmarkFromReceipt(receipt = {}) {
    if (!receipt?.benchmarkType) return;
    setCockpitLiveBenchmarkSummary((current) => {
      const previous = current && typeof current === "object" ? current : {};
      const latestTypedBenchmark = receipt.benchmarkType === "typed"
        ? receipt
        : previous.latestTypedBenchmark || cockpitBackgroundPayload?.liveTurnBenchmarkHistory?.latestTypedBenchmark || cockpitBackgroundPayload?.latency?.latestTypedBenchmark || null;
      const latestVoiceBenchmark = receipt.benchmarkType === "voice"
        ? receipt
        : previous.latestVoiceBenchmark || cockpitBackgroundPayload?.liveTurnBenchmarkHistory?.latestVoiceBenchmark || cockpitBackgroundPayload?.latency?.latestVoiceBenchmark || null;
      return {
        ...previous,
        latestTypedBenchmark,
        latestVoiceBenchmark,
        benchmarkComparison: previous.benchmarkComparison || cockpitBackgroundPayload?.liveTurnBenchmarkHistory?.benchmarkComparison || cockpitBackgroundPayload?.latency?.benchmarkComparison || {},
      };
    });
  }

  function updateCockpitVoiceTimingReceipt(patch = {}) {
    const activeTiming = cockpitVoiceTurnTimingRef.current || {};
    const currentReceipt = cockpitLastLocalVoiceReceiptRef.current || cockpitLastLocalVoiceReceipt || null;
    const turnId = patch.turnId || activeTiming.turnId || currentReceipt?.turnId || "";
    const startedAt = Number(patch.startedAt || activeTiming.startedAt || 0) || 0;
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    const totalTurnMs = startedAt ? Math.max(0, Math.round(now - startedAt)) : Number(patch.totalTurnMs || 0) || 0;
    const benchmarkMetadata = cockpitLiveBenchmarkMetadataForPatch(patch, turnId);
    const nextReceipt = mergeApexCockpitVoiceReceipt(currentReceipt, {
      ...patch,
      ...benchmarkMetadata,
      turnId,
      lastTurnId: turnId,
      totalTurnMs: Math.max(totalTurnMs, Number(patch.totalTurnMs || 0) || 0),
      timingMs: {
        ...(patch.timingMs || {}),
        totalTurnMs: Math.max(totalTurnMs, Number(patch.timingMs?.totalTurnMs || 0) || 0),
      },
    });
    cockpitLastLocalVoiceReceiptRef.current = nextReceipt;
    setCockpitLastLocalVoiceReceipt(nextReceipt);
    updateCockpitLiveBenchmarkFromReceipt(nextReceipt);
    persistCockpitLiveTurnReceipt(nextReceipt);
    if (nextReceipt.benchmarkType === "voice" && shouldPersistCockpitLiveTurnReceipt(nextReceipt)) {
      cockpitLiveVoiceBenchmarkRef.current = { armed: false, benchmarkId: "" };
      setCockpitVoiceBenchmarkArmed(false);
    }
  }

  function setCockpitAudioReadyState(ready) {
    const nextReady = Boolean(ready);
    cockpitAudioReadyRef.current = nextReady;
    setCockpitAudioReady(nextReady);
  }

  function primeCockpitAudioOutput({ speakCheck = false, notice = "" } = {}) {
    const audioContext = unlockBrowserAudio(cockpitAudioUnlockedRef);
    const hasBrowserSpeech = typeof window !== "undefined" && Boolean(window.speechSynthesis) && typeof SpeechSynthesisUtterance !== "undefined";
    if (typeof window !== "undefined" && window.speechSynthesis?.resume) {
      try {
        const resumeResult = window.speechSynthesis.resume();
        if (resumeResult && typeof resumeResult.catch === "function") resumeResult.catch(() => {});
      } catch {
        // Some browsers throw while site audio is still blocked.
      }
    }
    setCockpitAudioReadyState(Boolean(audioContext || hasBrowserSpeech));

    if (!speakCheck) {
      if (notice) setCockpitVoiceNotice(notice);
      return Boolean(audioContext || hasBrowserSpeech);
    }

    if (!hasBrowserSpeech) {
      setCockpitAudioReadyState(Boolean(audioContext));
      setCockpitVoiceNotice("This browser cannot play Apex's desktop voice. Use a supported desktop browser or allow site sound.");
      return false;
    }

    stopBrowserVoice(cockpitAudioRef);
    stopCockpitOutputLevelMonitor();
    clearCockpitSpeechSafetyTimer();
    cockpitSpeakingRef.current = true;
    setCockpitSpeaking(true);
    updateCockpitAlwaysOpenMicStatus({
      state: APEX_ALWAYS_OPEN_MIC_STATE.SPEAKING,
      speechDetected: false,
      feedbackSuppressionActive: true,
      fallbackReason: "Apex is speaking.",
    });
    startCockpitOutputLevelMonitor();
    armCockpitSpeechSafetyTimer(APEX_COCKPIT_AUDIO_CHECK_TEXT, {
      minimumMs: 3_200,
      recoveryNotice: "Sound check started but did not finish cleanly. If you did not hear Apex, allow site sound and run Sound Check again.",
      resumeListening: false,
    });
    setCockpitVoiceNotice("Running Apex desktop sound check.");

    const started = speakWithBrowserVoice(APEX_COCKPIT_AUDIO_CHECK_TEXT, {
      rate: cockpitVoiceProfileConfig.rate,
      pitch: cockpitVoiceProfileConfig.pitch,
      voiceHint: cockpitVoiceProfileConfig.label,
      onStart: () => {
        setCockpitAudioReadyState(true);
        setCockpitVoiceNotice("Apex desktop voice is audible.");
      },
      onEnd: () => {
        stopCockpitOutputLevelMonitor();
        clearCockpitSpeechSafetyTimer();
        cockpitSpeakingRef.current = false;
        setCockpitSpeaking(false);
        setCockpitAudioReadyState(true);
        scheduleCockpitListeningAfterSpeech("Sound check passed. Apex is clearing echo, then listening.");
        setCockpitVoiceNotice("Sound check passed. Talk naturally; Apex will keep the visible mic loop open when permission allows.");
      },
      onError: () => {
        stopCockpitOutputLevelMonitor();
        clearCockpitSpeechSafetyTimer();
        cockpitSpeakingRef.current = false;
        setCockpitSpeaking(false);
        setCockpitAudioReadyState(false);
        setCockpitVoiceNotice("Browser blocked Apex desktop voice. Allow sound for this site, then run Sound Check again.");
      },
    });

    if (!started) {
      stopCockpitOutputLevelMonitor();
      clearCockpitSpeechSafetyTimer();
      cockpitSpeakingRef.current = false;
      setCockpitSpeaking(false);
      setCockpitAudioReadyState(false);
      setCockpitVoiceNotice("Apex desktop voice could not start. Allow site sound, then run Sound Check again.");
    }
    return started;
  }

  function clearCockpitSpeechSafetyTimer() {
    if (!cockpitSpeechSafetyTimerRef.current) return;
    clearTimeout(cockpitSpeechSafetyTimerRef.current);
    cockpitSpeechSafetyTimerRef.current = 0;
  }

  function clearCockpitResumeListeningTimer() {
    if (!cockpitResumeListeningTimerRef.current) return;
    clearTimeout(cockpitResumeListeningTimerRef.current);
    cockpitResumeListeningTimerRef.current = 0;
  }

  function clearCockpitCaptionFinalTurnTimer() {
    if (!cockpitCaptionFinalTurnTimerRef.current) return;
    clearTimeout(cockpitCaptionFinalTurnTimerRef.current);
    cockpitCaptionFinalTurnTimerRef.current = 0;
  }

  function clearCockpitNoVoiceTimer() {
    if (!cockpitNoVoiceTimerRef.current) return;
    clearTimeout(cockpitNoVoiceTimerRef.current);
    cockpitNoVoiceTimerRef.current = 0;
  }

  function armCockpitNoVoiceTimer() {
    clearCockpitNoVoiceTimer();
    cockpitNoVoiceTimerRef.current = setTimeout(() => {
      cockpitNoVoiceTimerRef.current = 0;
      if (!cockpitRecordingRef.current || cockpitSpeechStartedRef.current || cockpitTranscribingRef.current || cockpitSpeakingRef.current) return;
      updateCockpitAlwaysOpenMicStatus({
        state: APEX_ALWAYS_OPEN_MIC_STATE.STANDBY,
        speechDetected: false,
        feedbackSuppressionActive: false,
        fallbackReason: "Mic stream is open, but no voice level crossed the local detection gate yet.",
      });
      setCockpitVoiceNotice(buildApexCockpitMicTestSummary({
        calibration: cockpitMicCalibrationRef.current,
        canUseRecorder: canUseCockpitRecorder,
        canUseNativeVoice: cockpitNativeVoiceReady,
        micPermissionState: cockpitMicPermissionState,
        recording: true,
      }));
    }, APEX_COCKPIT_NO_VOICE_NOTICE_MS);
  }

  function clearCockpitTranscriptionTimeout() {
    if (!cockpitTranscriptionTimeoutRef.current) return;
    clearTimeout(cockpitTranscriptionTimeoutRef.current);
    cockpitTranscriptionTimeoutRef.current = 0;
  }

  function armCockpitTranscriptionTimeout(turnId = "") {
    clearCockpitTranscriptionTimeout();
    cockpitActiveTranscriptionTurnRef.current = turnId;
    cockpitTranscriptionTimeoutRef.current = setTimeout(() => {
      cockpitTranscriptionTimeoutRef.current = 0;
      if (cockpitActiveTranscriptionTurnRef.current !== turnId) return;
      cockpitActiveTranscriptionTurnRef.current = "";
      cockpitTranscribingRef.current = false;
      setCockpitTranscribing(false);
      updateCockpitAlwaysOpenMicStatus({
        state: APEX_ALWAYS_OPEN_MIC_STATE.STANDBY,
        speechDetected: false,
        feedbackSuppressionActive: false,
        fallbackReason: "Local STT turn timed out and was reset.",
      });
      setCockpitVoiceNotice("That local voice turn took too long, so Apex reset the mic loop. Say it again; no OpenAI audio was used.");
      scheduleCockpitVoiceRetry("Local STT timed out and Apex reset the mic loop", { speakPrompt: false });
    }, APEX_COCKPIT_STT_TURN_TIMEOUT_MS);
  }

  function resetCockpitBrowserCaptionTurn({ clearDisplay = true } = {}) {
    clearCockpitCaptionFinalTurnTimer();
    cockpitBrowserTranscriptRef.current = "";
    cockpitBrowserTranscriptCaptureIdRef.current = "";
    if (clearDisplay) setCockpitBrowserTranscript("");
  }

  function currentCockpitBrowserCaptionTranscript() {
    if (!cockpitBrowserTranscriptRef.current) return "";
    if (!cockpitCurrentCaptureIdRef.current) return "";
    if (cockpitBrowserTranscriptCaptureIdRef.current !== cockpitCurrentCaptureIdRef.current) return "";
    return String(cockpitBrowserTranscriptRef.current || "").trim();
  }

  function updateCockpitAlwaysOpenMicStatus(patch = {}) {
    const micCalibration = cockpitMicCalibrationRef.current || {};
    const levelThreshold = patch.levelThreshold ?? micCalibration.calibratedLevelThreshold ?? APEX_COCKPIT_LEVEL_THRESHOLD;
    const idleLevelThreshold = patch.idleLevelThreshold ?? micCalibration.calibratedIdleLevelThreshold ?? APEX_COCKPIT_IDLE_LEVEL_THRESHOLD;
    const nextStatus = buildApexAlwaysOpenMicStatus({
      ...cockpitAlwaysOpenMicRef.current,
      ...patch,
      ingressProvider: "browser",
      vadProvider: "amplitude-gate",
      sustainedSilenceMs: APEX_COCKPIT_SILENCE_MS,
      minCaptureMs: APEX_COCKPIT_MIN_TURN_MS,
      levelThreshold,
      idleLevelThreshold,
      droppedFramesWhileMuted: patch.droppedFramesWhileMuted ?? cockpitDroppedMicFrameCountRef.current,
    });
    cockpitAlwaysOpenMicRef.current = nextStatus;
    setCockpitAlwaysOpenMic(nextStatus);
    return nextStatus;
  }

  function resolveCockpitAlwaysOpenMicState() {
    const now = performance.now();
    if (!cockpitAutoListeningRef.current) return APEX_ALWAYS_OPEN_MIC_STATE.QUIET;
    if (cockpitSpeakingRef.current) return APEX_ALWAYS_OPEN_MIC_STATE.SPEAKING;
    if (cockpitRecoveringUntilRef.current && now < cockpitRecoveringUntilRef.current) return APEX_ALWAYS_OPEN_MIC_STATE.RECOVERING;
    if (cockpitTranscribingRef.current || cockpitSubmittingRef.current) return APEX_ALWAYS_OPEN_MIC_STATE.PROCESSING;
    if (cockpitSpeechStartedRef.current) return APEX_ALWAYS_OPEN_MIC_STATE.CAPTURING;
    return APEX_ALWAYS_OPEN_MIC_STATE.STANDBY;
  }

  function buildCockpitAlwaysOpenMicPacket(overrides = {}) {
    const micCalibration = cockpitMicCalibrationRef.current || {};
    const levelThreshold = overrides.levelThreshold ?? micCalibration.calibratedLevelThreshold ?? APEX_COCKPIT_LEVEL_THRESHOLD;
    const idleLevelThreshold = overrides.idleLevelThreshold ?? micCalibration.calibratedIdleLevelThreshold ?? APEX_COCKPIT_IDLE_LEVEL_THRESHOLD;
    return {
      ...cockpitAlwaysOpenMicRef.current,
      ...overrides,
      ingressProvider: "browser",
      vadProvider: "amplitude-gate",
      sustainedSilenceMs: APEX_COCKPIT_SILENCE_MS,
      minCaptureMs: APEX_COCKPIT_MIN_TURN_MS,
      levelThreshold,
      idleLevelThreshold,
      silenceDurationMs: overrides.silenceDurationMs ?? cockpitAlwaysOpenMicRef.current?.silenceDurationMs ?? 0,
      micCalibration: {
        status: micCalibration.status || "",
        captureProvider: micCalibration.captureProvider || "",
        frameCount: micCalibration.frameCount || 0,
        peakLevel: micCalibration.peakLevel || 0,
        noiseFloor: micCalibration.noiseFloor || 0,
        calibratedLevelThreshold: levelThreshold,
        calibratedIdleLevelThreshold: idleLevelThreshold,
      },
      droppedFramesWhileMuted: overrides.droppedFramesWhileMuted ?? cockpitDroppedMicFrameCountRef.current,
      cloudAudioAllowed: false,
      openAiAudioUsed: false,
      audioStored: false,
    };
  }

  function recordCockpitMutedMicFrame(reason = "feedback suppression") {
    cockpitDroppedMicFrameCountRef.current += 1;
    return updateCockpitAlwaysOpenMicStatus({
      state: resolveCockpitAlwaysOpenMicState(),
      feedbackSuppressionActive: true,
      fallbackReason: reason,
      droppedFramesWhileMuted: cockpitDroppedMicFrameCountRef.current,
    });
  }

  function markCockpitVoiceRecovering(notice = APEX_COCKPIT_LISTENING_HANDOFF_NOTICE) {
    cockpitRecoveringUntilRef.current = performance.now() + APEX_COCKPIT_RECOVERY_DROP_MS;
    updateCockpitAlwaysOpenMicStatus({
      state: APEX_ALWAYS_OPEN_MIC_STATE.RECOVERING,
      feedbackSuppressionActive: true,
      fallbackReason: "Dropping mic frames briefly after Apex speech playback.",
    });
    if (notice) setCockpitVoiceNotice(notice);
  }

  function scheduleCockpitCaptionFinalTurn(transcript) {
    const cleanTranscript = stripApexCockpitDoneTalkingCue(transcript);
    if (!cleanTranscript) return false;
    clearCockpitCaptionFinalTurnTimer();
    cockpitCaptionFinalTurnTimerRef.current = setTimeout(() => {
      cockpitCaptionFinalTurnTimerRef.current = 0;
      finishCockpitVoiceTurn({ fallbackTranscript: cleanTranscript });
    }, APEX_COCKPIT_CAPTION_FINAL_TURN_MS);
    return true;
  }

  function reserveCockpitVoiceTranscript(cleanTranscript) {
    const transcriptKey = String(cleanTranscript || "").trim().toLowerCase().replace(/\s+/g, " ").slice(0, 260);
    const now = Date.now();
    const lastTurn = cockpitLastHandledVoiceTurnRef.current || { key: "", at: 0 };
    if (transcriptKey && lastTurn.key === transcriptKey && now - lastTurn.at < APEX_COCKPIT_DUPLICATE_TURN_MS) {
      setCockpitVoiceNotice("Apex already picked up that voice turn.");
      return false;
    }
    const lastSpoken = cockpitLastSpokenAnswerRef.current || { text: "", at: 0 };
    if (
      lastSpoken.text
      && now - Number(lastSpoken.at || 0) < APEX_COCKPIT_ECHO_SUPPRESSION_MS
      && isLikelyApexCockpitEcho(cleanTranscript, lastSpoken.text)
    ) {
      setCockpitVoiceNotice("Apex ignored its own spoken audio and kept listening.");
      updateCockpitAlwaysOpenMicStatus({
        state: APEX_ALWAYS_OPEN_MIC_STATE.STANDBY,
        speechDetected: false,
        feedbackSuppressionActive: true,
        fallbackReason: "Echo suppression dropped Apex's own spoken answer.",
      });
      return false;
    }
    cockpitLastHandledVoiceTurnRef.current = { key: transcriptKey, at: now };
    return true;
  }

  function scheduleCockpitListeningAfterSpeech(notice = APEX_COCKPIT_LISTENING_HANDOFF_NOTICE, { force = false } = {}) {
    clearCockpitResumeListeningTimer();
    markCockpitVoiceRecovering(notice);
    if (!force && cockpitCurrentSpeechInputModeRef.current === "native" && (!cockpitConversationMode || !cockpitAutoListeningRef.current)) {
      cockpitListeningHandoffPendingRef.current = false;
      setCockpitAutoListening(false);
      cockpitAutoListeningRef.current = false;
      cockpitResumeListeningTimerRef.current = setTimeout(() => {
        cockpitResumeListeningTimerRef.current = 0;
        cockpitRecoveringUntilRef.current = 0;
        updateCockpitAlwaysOpenMicStatus({
          state: APEX_ALWAYS_OPEN_MIC_STATE.QUIET,
          speechDetected: false,
          feedbackSuppressionActive: false,
          fallbackReason: "Native voice is paused until John starts the next turn.",
        });
        setCockpitVoiceNotice(APEX_COCKPIT_NATIVE_PAUSED_NOTICE);
      }, APEX_COCKPIT_RECOVERY_DROP_MS);
      return false;
    }
    if (!state.canView || !sessionToken || !cockpitConversationMode || !cockpitAutoListening || !cockpitPageVisible || (!cockpitCanUseBrowserAutoVoice && !cockpitCanUseNativeAutoVoice)) return false;
    if (!cockpitMicReady && cockpitMicPermissionState === "denied" && !cockpitCanUseNativeAutoVoice) {
      setCockpitVoiceNotice("Apex finished speaking. Microphone permission is blocked, so voice cannot reopen yet.");
      return false;
    }
    if (cockpitRecordingRef.current) {
      cockpitListeningHandoffPendingRef.current = false;
      cockpitResumeListeningTimerRef.current = setTimeout(() => {
        cockpitResumeListeningTimerRef.current = 0;
        if (!cockpitSpeakingRef.current && cockpitAutoListeningRef.current) {
          cockpitRecoveringUntilRef.current = 0;
          updateCockpitAlwaysOpenMicStatus({
            state: APEX_ALWAYS_OPEN_MIC_STATE.STANDBY,
            speechDetected: false,
            feedbackSuppressionActive: false,
            fallbackReason: "",
          });
          setCockpitVoiceNotice(notice);
        }
      }, APEX_COCKPIT_RECOVERY_DROP_MS);
      return true;
    }
    if (cockpitTranscribingRef.current || cockpitSubmittingRef.current || cockpitVoiceOpeningRef.current) return false;
    cockpitListeningHandoffPendingRef.current = true;
    setCockpitVoiceNotice(notice);
    cockpitResumeListeningTimerRef.current = setTimeout(() => {
      cockpitResumeListeningTimerRef.current = 0;
      if (
        state.canView
        && sessionToken
        && cockpitConversationMode
        && cockpitAutoListeningRef.current
        && cockpitPageVisible
        && !cockpitRecordingRef.current
        && !cockpitTranscribingRef.current
        && !cockpitSubmittingRef.current
        && !cockpitSpeakingRef.current
        && !cockpitVoiceOpeningRef.current
      ) {
        cockpitRecoveringUntilRef.current = 0;
        openCockpitVoiceSession({ automatic: true, handoff: true });
        return;
      }
      cockpitRecoveringUntilRef.current = 0;
      updateCockpitAlwaysOpenMicStatus({
        state: APEX_ALWAYS_OPEN_MIC_STATE.QUIET,
        speechDetected: false,
        feedbackSuppressionActive: false,
        fallbackReason: "Voice is quiet until John starts the next turn.",
      });
      if (!cockpitConversationMode) {
        setCockpitAutoListening(false);
        cockpitAutoListeningRef.current = false;
      }
    }, APEX_COCKPIT_RECOVERY_DROP_MS);
    return true;
  }

  function scheduleCockpitVoiceRetry(reason = "Apex missed the last voice turn", _options = {}) {
    const retryReason = apexCockpitMemoryText(reason || "Apex missed the last voice turn", 180);
    cockpitVoiceRetryCountRef.current += 1;
    setCockpitVoiceRetryCount(cockpitVoiceRetryCountRef.current);
    setCockpitVoiceRetryReason(retryReason);
    setCockpitAutoListening(false);
    cockpitAutoListeningRef.current = false;
    setCockpitVoiceNotice(`${retryReason}. Voice paused instead of looping; no action was taken.`);
    setCockpitTurns((current) => [
      {
        id: `cockpit-voice-retry-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        question: `${retryReason}. Apex paused voice without taking action.`,
        source: "voice-retry",
        routeLabel: "Voice retry",
        status: "paused",
      },
      ...current,
    ].slice(0, 5));

    clearCockpitResumeListeningTimer();
    cockpitListeningHandoffPendingRef.current = false;
    updateCockpitAlwaysOpenMicStatus({
      state: APEX_ALWAYS_OPEN_MIC_STATE.QUIET,
      speechDetected: false,
      feedbackSuppressionActive: false,
      fallbackReason: retryReason,
    });
    return false;
  }

  function armCockpitSpeechSafetyTimer(
    textToSpeak = "",
    {
      minimumMs = APEX_COCKPIT_SPEECH_SAFETY_MIN_MS,
      perCharMs = APEX_COCKPIT_SPEECH_SAFETY_PER_CHAR_MS,
      maxMs = APEX_COCKPIT_SPEECH_SAFETY_MAX_MS,
      recoveryNotice = "Apex voice safety recovered after playback did not finish cleanly.",
      resumeListening = true,
    } = {},
  ) {
    clearCockpitSpeechSafetyTimer();
    const timeoutMs = Math.min(maxMs, Math.max(minimumMs, String(textToSpeak || "").length * perCharMs));
    cockpitSpeechSafetyTimerRef.current = setTimeout(() => {
      if (!cockpitSpeakingRef.current) return;
      if (!resumeListening) setCockpitAudioReadyState(false);
      stopCockpitVoicePlayback(recoveryNotice, { resumeListening });
    }, timeoutMs);
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
    cockpitPcmSampleRateRef.current = audioContext.sampleRate || 0;
    cockpitPcmChunksRef.current = [];
    const audioWorkletSupported = Boolean(audioContext.audioWorklet) && typeof AudioWorkletNode !== "undefined";
    const audioTrack = stream?.getAudioTracks?.()[0] || null;
    const micDeviceLabel = audioTrack?.label || "";
    const setMicCalibration = (patch = {}) => {
      const nextCalibration = createApexCockpitMicCalibrationState({
        ...cockpitMicCalibrationRef.current,
        ...patch,
        inputProvider: "browser",
        micDeviceLabel: patch.micDeviceLabel || micDeviceLabel || cockpitMicCalibrationRef.current?.micDeviceLabel || "",
        sampleRate: patch.sampleRate || audioContext.sampleRate || cockpitPcmSampleRateRef.current || 0,
        audioWorkletSupported,
      });
      cockpitMicCalibrationRef.current = nextCalibration;
      setCockpitMicCalibration(nextCalibration);
      return nextCalibration;
    };
    const appendPcmFrame = (input) => {
      if (!cockpitRecorderRef.current || cockpitRecorderRef.current.state !== "recording") return;
      if (!input?.length) return;
      cockpitPcmChunksRef.current.push(new Float32Array(input));
      if (!cockpitSpeechStartedRef.current && cockpitPcmChunksRef.current.length > 80) {
        cockpitPcmChunksRef.current = cockpitPcmChunksRef.current.slice(-80);
      }
    };
    const startScriptProcessorFallback = (reason = "audio-worklet-unavailable") => {
      if (cockpitPcmProcessorRef.current || typeof audioContext.createScriptProcessor !== "function") {
        setMicCalibration({
          status: "fallback",
          captureProvider: "media-recorder",
          fallbackCaptureUsed: true,
          reason: "AudioWorklet and ScriptProcessor PCM capture are unavailable; MediaRecorder remains active.",
        });
        return false;
      }
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      const muteGain = typeof audioContext.createGain === "function" ? audioContext.createGain() : null;
      if (muteGain) muteGain.gain.value = 0;
      processor.onaudioprocess = (event) => {
        const input = event.inputBuffer?.getChannelData?.(0);
        appendPcmFrame(input);
      };
      source.connect(processor);
      if (muteGain) {
        processor.connect(muteGain);
        muteGain.connect(audioContext.destination);
      } else {
        processor.connect(audioContext.destination);
      }
      cockpitPcmProcessorRef.current = processor;
      cockpitPcmMuteGainRef.current = muteGain;
      setMicCalibration({
        status: "calibrating",
        captureProvider: "script-processor-fallback",
        fallbackCaptureUsed: true,
        reason,
      });
      return true;
    };
    const samples = new Uint8Array(analyser.fftSize);
    cockpitVoiceAudioContextRef.current = audioContext;
    cockpitVoiceAnalyserRef.current = analyser;
    cockpitVoiceSourceRef.current = source;
    cockpitVoiceStartedAtRef.current = performance.now();
    setMicCalibration({
      status: "calibrating",
      captureProvider: audioWorkletSupported ? "audio-worklet-starting" : "media-recorder",
      audioWorkletSupported,
      audioWorkletActive: false,
      fallbackCaptureUsed: false,
      frameCount: 0,
      peakLevel: 0,
      noiseFloor: 0,
      averageLevel: 0,
      calibratedLevelThreshold: APEX_COCKPIT_LEVEL_THRESHOLD,
      calibratedIdleLevelThreshold: APEX_COCKPIT_IDLE_LEVEL_THRESHOLD,
      lastFrameAtMs: 0,
      lastSignalAtMs: 0,
      startedAtMs: performance.now(),
      completedAtMs: 0,
      signalDetected: false,
      reason: "Apex is calibrating the browser microphone gate.",
    });

    if (audioWorkletSupported) {
      const workletSource = `
        class ApexPcmCaptureProcessor extends AudioWorkletProcessor {
          process(inputs) {
            const input = inputs && inputs[0] && inputs[0][0];
            if (input && input.length) this.port.postMessage(Float32Array.from(input));
            return true;
          }
        }
        registerProcessor("apex-pcm-capture", ApexPcmCaptureProcessor);
      `;
      const workletUrl = URL.createObjectURL(new Blob([workletSource], { type: "application/javascript" }));
      cockpitPcmWorkletUrlRef.current = workletUrl;
      audioContext.audioWorklet.addModule(workletUrl).then(() => {
        if (cockpitPcmWorkletUrlRef.current === workletUrl) {
          URL.revokeObjectURL(workletUrl);
          cockpitPcmWorkletUrlRef.current = "";
        }
        if (cockpitVoiceAudioContextRef.current !== audioContext || audioContext.state === "closed") return;
        const processor = new AudioWorkletNode(audioContext, "apex-pcm-capture");
        const muteGain = typeof audioContext.createGain === "function" ? audioContext.createGain() : null;
        if (muteGain) muteGain.gain.value = 0;
        processor.port.onmessage = (event) => appendPcmFrame(event.data);
        source.connect(processor);
        if (muteGain) {
          processor.connect(muteGain);
          muteGain.connect(audioContext.destination);
        } else {
          processor.connect(audioContext.destination);
        }
        cockpitPcmProcessorRef.current = processor;
        cockpitPcmMuteGainRef.current = muteGain;
        setMicCalibration({
          status: "calibrating",
          captureProvider: "audio-worklet",
          audioWorkletActive: true,
          fallbackCaptureUsed: false,
          reason: "AudioWorklet PCM capture is active.",
        });
      }).catch((error) => {
        if (cockpitPcmWorkletUrlRef.current === workletUrl) {
          URL.revokeObjectURL(workletUrl);
          cockpitPcmWorkletUrlRef.current = "";
        }
        if (cockpitVoiceAudioContextRef.current !== audioContext || audioContext.state === "closed") return;
        startScriptProcessorFallback(error?.message || "audio-worklet-failed");
      });
    } else {
      startScriptProcessorFallback("audio-worklet-unavailable");
    }

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
      const runtimeState = resolveCockpitAlwaysOpenMicState();
      const calibration = buildApexCockpitMicCalibrationPatch({
        current: cockpitMicCalibrationRef.current,
        level,
        nowMs: now,
        captureProvider: cockpitMicCalibrationRef.current?.captureProvider || (audioWorkletSupported ? "audio-worklet-starting" : "media-recorder"),
        audioWorkletSupported,
        audioWorkletActive: cockpitMicCalibrationRef.current?.audioWorkletActive === true,
        fallbackCaptureUsed: cockpitMicCalibrationRef.current?.fallbackCaptureUsed === true,
        micDeviceLabel,
        sampleRate: audioContext.sampleRate || 0,
        frameReceived: true,
        muted: [APEX_ALWAYS_OPEN_MIC_STATE.SPEAKING, APEX_ALWAYS_OPEN_MIC_STATE.RECOVERING, APEX_ALWAYS_OPEN_MIC_STATE.QUIET].includes(runtimeState),
      });
      cockpitMicCalibrationRef.current = calibration;
      const calibratedLevelThreshold = calibration.calibratedLevelThreshold || APEX_COCKPIT_LEVEL_THRESHOLD;
      const calibratedIdleLevelThreshold = calibration.calibratedIdleLevelThreshold || APEX_COCKPIT_IDLE_LEVEL_THRESHOLD;
      const gate = buildApexAlwaysOpenMicTranscriptionGate({
        state: runtimeState,
        level,
        nowMs: now,
        captureStartedAtMs: cockpitSpeechStartedRef.current ? cockpitVoiceStartedAtRef.current : 0,
        lastSpeechAtMs: cockpitLastSoundAtRef.current,
        isSpeaking: cockpitSpeakingRef.current,
        ttsActive: cockpitSpeakingRef.current,
        playbackExpected: cockpitSpeakingRef.current || runtimeState === APEX_ALWAYS_OPEN_MIC_STATE.RECOVERING,
        sustainedSilenceMs: APEX_COCKPIT_SILENCE_MS,
        minCaptureMs: APEX_COCKPIT_MIN_TURN_MS,
        levelThreshold: calibratedLevelThreshold,
        idleLevelThreshold: calibratedIdleLevelThreshold,
        ingressProvider: "browser",
        vadProvider: "amplitude-gate",
      });
      cockpitLastAlwaysOpenGateRef.current = gate;

      if (gate.muted || gate.shouldDropFrame) {
        recordCockpitMutedMicFrame(gate.reason || "Apex voice feedback suppression");
        if (now - cockpitLastLevelPaintRef.current > 90) {
          cockpitLastLevelPaintRef.current = now;
          setCockpitMicLevel(0);
        }
        cockpitVoiceFrameRef.current = requestAnimationFrame(readLevel);
        return;
      }

      if (gate.speechDetected) {
        clearCockpitNoVoiceTimer();
        if (!cockpitSpeechStartedRef.current) {
          cockpitVoiceStartedAtRef.current = now;
          cockpitDroppedMicFrameCountRef.current = 0;
        }
        cockpitSpeechStartedRef.current = true;
        cockpitLastSoundAtRef.current = now;
        setCockpitSpeechActive(true);
        updateCockpitAlwaysOpenMicStatus({
          state: APEX_ALWAYS_OPEN_MIC_STATE.CAPTURING,
          speechDetected: true,
          captureDurationMs: gate.captureDurationMs,
          silenceDurationMs: gate.silenceDurationMs,
          feedbackSuppressionActive: false,
          fallbackReason: "",
          levelThreshold: calibratedLevelThreshold,
          idleLevelThreshold: calibratedIdleLevelThreshold,
        });
      } else if (gate.shouldTranscribe || gate.readyForTranscription) {
        clearCockpitNoVoiceTimer();
        updateCockpitAlwaysOpenMicStatus({
          state: APEX_ALWAYS_OPEN_MIC_STATE.PROCESSING,
          speechDetected: true,
          captureDurationMs: gate.captureDurationMs,
          silenceDurationMs: gate.silenceDurationMs,
          feedbackSuppressionActive: false,
          fallbackReason: "Sustained silence reached; sending completed turn to local STT.",
          levelThreshold: calibratedLevelThreshold,
          idleLevelThreshold: calibratedIdleLevelThreshold,
        });
        const alwaysOpenMicReceipt = buildApexAlwaysOpenMicReceipt({
          ...buildCockpitAlwaysOpenMicPacket(gate),
          state: APEX_ALWAYS_OPEN_MIC_STATE.PROCESSING,
          status: "processing",
          speechDetected: true,
          captureDurationMs: gate.captureDurationMs,
          silenceDurationMs: gate.silenceDurationMs,
          droppedFramesWhileMuted: cockpitDroppedMicFrameCountRef.current,
        });
        finishCockpitVoiceTurn({ alwaysOpenMic: alwaysOpenMicReceipt });
        return;
      } else if (cockpitSpeechStartedRef.current) {
        updateCockpitAlwaysOpenMicStatus({
          state: APEX_ALWAYS_OPEN_MIC_STATE.CAPTURING,
          speechDetected: true,
          captureDurationMs: gate.captureDurationMs,
          silenceDurationMs: gate.silenceDurationMs,
          feedbackSuppressionActive: false,
          levelThreshold: calibratedLevelThreshold,
          idleLevelThreshold: calibratedIdleLevelThreshold,
        });
      } else {
        updateCockpitAlwaysOpenMicStatus({
          state: APEX_ALWAYS_OPEN_MIC_STATE.STANDBY,
          speechDetected: false,
          feedbackSuppressionActive: false,
          fallbackReason: "",
          levelThreshold: calibratedLevelThreshold,
          idleLevelThreshold: calibratedIdleLevelThreshold,
        });
      }

      if (now - cockpitLastLevelPaintRef.current > 90) {
        cockpitLastLevelPaintRef.current = now;
        setCockpitMicLevel(level);
      }
      if (now - cockpitMicCalibrationPaintRef.current > 120) {
        cockpitMicCalibrationPaintRef.current = now;
        setCockpitMicCalibration(calibration);
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
      resetCockpitBrowserCaptionTurn();
    }
    setCockpitRecognitionStatus((current) => (current === "unavailable" ? "unavailable" : "standby"));
  }

  function startCockpitSpeechRecognition({ clearTranscript = true } = {}) {
    if (conversationFirst) {
      setCockpitRecognitionStatus("unavailable");
      setCockpitRecognitionError("");
      return false;
    }
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
        const runtimeState = resolveCockpitAlwaysOpenMicState();
        const captionGate = buildApexAlwaysOpenMicTranscriptionGate({
          state: runtimeState,
          isSpeaking: cockpitSpeakingRef.current,
          ttsActive: cockpitSpeakingRef.current,
          playbackExpected: cockpitSpeakingRef.current || runtimeState === APEX_ALWAYS_OPEN_MIC_STATE.RECOVERING,
          ingressProvider: "browser",
          vadProvider: "browser-caption-gate",
          sustainedSilenceMs: APEX_COCKPIT_SILENCE_MS,
        });
        if (captionGate.muted || captionGate.shouldDropFrame) {
          recordCockpitMutedMicFrame(captionGate.reason || "Apex voice feedback suppression");
          return;
        }
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
          const doneTalking = hasApexCockpitDoneTalkingCue(combinedTranscript);
          const cleanCombinedTranscript = stripApexCockpitDoneTalkingCue(combinedTranscript) || combinedTranscript;
          cockpitBrowserTranscriptRef.current = cleanCombinedTranscript;
          cockpitBrowserTranscriptCaptureIdRef.current = cockpitCurrentCaptureIdRef.current;
          setCockpitBrowserTranscript(cleanCombinedTranscript);
          setAskQuestion(cleanCombinedTranscript);
          cockpitSpeechStartedRef.current = true;
          cockpitLastSoundAtRef.current = now;
          setCockpitSpeechActive(true);
          setCockpitRecognitionStatus("captioning");
          setCockpitVoiceNotice(cockpitBargeInterruptedRef.current ? `Barge-in captions heard: "${cleanCombinedTranscript}"` : `Browser captions heard: "${cleanCombinedTranscript}"`);
          if (doneTalking) finishCockpitVoiceTurn({ fallbackTranscript: cleanCombinedTranscript });
          else scheduleCockpitCaptionFinalTurn(cleanCombinedTranscript);
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
        setCockpitVoiceNotice(hardStop
          ? "Browser speech captions are blocked. Allow microphone access, then recover voice."
          : "Browser captions are limited; Apex will keep recording and use server transcription fallback.");
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
        setCockpitRecognitionStatus("recovering");
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

  function stopCockpitVoicePlayback(notice = "Voice playback stopped.", { resumeListening = false } = {}) {
    stopBrowserVoice(cockpitAudioRef);
    stopCockpitOutputLevelMonitor();
    clearCockpitSpeechSafetyTimer();
    cockpitSpeakingRef.current = false;
    setCockpitSpeaking(false);
    setCockpitVoiceNotice(notice);
    if (resumeListening) {
      scheduleCockpitListeningAfterSpeech(notice || APEX_COCKPIT_LISTENING_HANDOFF_NOTICE);
    } else if (cockpitAutoListeningRef.current) {
      markCockpitVoiceRecovering(notice);
    }
  }

  function speakCockpitBrowserFallback(textToSpeak, fallbackMessage = "Apex is speaking with browser voice fallback.") {
    const started = speakWithBrowserVoice(textToSpeak, {
      rate: cockpitVoiceProfileConfig.rate,
      pitch: cockpitVoiceProfileConfig.pitch,
      voiceHint: cockpitVoiceProfileConfig.label,
      onStart: () => {
        setCockpitAudioReadyState(true);
        updateCockpitAlwaysOpenMicStatus({
          state: APEX_ALWAYS_OPEN_MIC_STATE.SPEAKING,
          feedbackSuppressionActive: true,
          fallbackReason: "Browser fallback voice is speaking.",
        });
      },
      onEnd: () => {
        setCockpitAudioReadyState(true);
        stopCockpitOutputLevelMonitor();
        clearCockpitSpeechSafetyTimer();
        cockpitSpeakingRef.current = false;
        setCockpitSpeaking(false);
        scheduleCockpitListeningAfterSpeech();
      },
      onError: () => {
        stopCockpitOutputLevelMonitor();
        clearCockpitSpeechSafetyTimer();
        cockpitSpeakingRef.current = false;
        setCockpitSpeaking(false);
        setCockpitAudioReadyState(false);
        if (!scheduleCockpitListeningAfterSpeech("Browser voice playback could not start. Apex is quiet until John starts the next turn.")) {
          setCockpitVoiceNotice("Browser voice playback could not start. Run Sound Check and allow site sound.");
        }
      },
    });
    if (!started) {
      clearCockpitSpeechSafetyTimer();
      setCockpitSpeaking(false);
      setCockpitAudioReadyState(false);
      if (!scheduleCockpitListeningAfterSpeech("This browser does not support speech playback here. Apex is quiet until John starts the next turn.")) {
        setCockpitVoiceNotice("This browser does not support speech playback here.");
      }
      return;
    }
    setCockpitVoiceNotice(fallbackMessage);
  }

  async function speakCockpitAnswer(textToSpeak = cockpitAnswerText, { voiceTurnId = "", voiceTurnStartedAt = 0, voiceInputMode = "" } = {}) {
    const fullAnswerText = String(textToSpeak || "").trim();
    const answerToSpeak = buildApexCockpitFastSpeechText(fullAnswerText);
    if (!answerToSpeak) return;
    cockpitCurrentSpeechInputModeRef.current = voiceInputMode || (voiceTurnId ? cockpitLastVoiceInputModeRef.current : "") || "";
    const speechKey = normalizeApexCockpitLoopText(answerToSpeak).slice(0, 520);
    const lastSpoken = cockpitLastSpokenAnswerRef.current || { key: "", at: 0 };
    const now = Date.now();
    const duplicateWindowMs = isApexCockpitLoopProneSpeech(answerToSpeak)
      ? APEX_COCKPIT_DUPLICATE_STATUS_SPEECH_MS
      : APEX_COCKPIT_DUPLICATE_SPEECH_MS;
    if (speechKey && lastSpoken.key === speechKey && now - Number(lastSpoken.at || 0) < duplicateWindowMs) {
      setCockpitVoiceNotice("Apex held a duplicate spoken answer and is listening.");
      if (voiceTurnId) {
        updateCockpitVoiceTimingReceipt({
          turnId: voiceTurnId,
          startedAt: voiceTurnStartedAt,
          status: "duplicate-speech-held",
          timingMs: {
            duplicateSpeechHoldMs: Math.max(0, now - Number(lastSpoken.at || 0)),
          },
        });
      }
      scheduleCockpitListeningAfterSpeech("Apex held a duplicate spoken answer and is listening.");
      return;
    }
    cockpitLastSpokenAnswerRef.current = {
      key: speechKey,
      text: answerToSpeak,
      at: now,
    };
    primeCockpitAudioOutput();
    stopBrowserVoice(cockpitAudioRef);
    cockpitSpeakingRef.current = true;
    setCockpitSpeaking(true);
    updateCockpitAlwaysOpenMicStatus({
      state: APEX_ALWAYS_OPEN_MIC_STATE.SPEAKING,
      speechDetected: false,
      feedbackSuppressionActive: true,
      fallbackReason: "Apex is speaking.",
    });
    startCockpitOutputLevelMonitor();
    armCockpitSpeechSafetyTimer(answerToSpeak);
    setCockpitVoiceNotice("");
    if (conversationFirst) {
      if (!sessionToken) {
        speakCockpitBrowserFallback(answerToSpeak, "Local voice needs the private operator session. Browser playback is fallback-only; OpenAI audio was not used.");
        return;
      }
      try {
        const ttsRequestStartedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
        const payload = await speakApexOsLocalVoice(sessionToken, {
          turnId: voiceTurnId,
          text: answerToSpeak,
          voice: cockpitVoiceProfile,
          voiceMode: APEX_COCKPIT_USE_FAST_SIMPLE_VOICE ? "fast-fallback" : "apex",
          preferFastVoice: APEX_COCKPIT_USE_FAST_SIMPLE_VOICE,
        });
        const ttsRequestMs = Math.max(0, Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - ttsRequestStartedAt));
        if (voiceTurnId) {
          updateCockpitVoiceTimingReceipt({
            turnId: voiceTurnId,
            startedAt: voiceTurnStartedAt,
            status: "tts-ready",
            engine: payload?.engine || payload?.selectedTtsEngine || "",
            timingMs: {
              ttsRequestMs,
              ttsGenerationMs: Number(payload?.generationTimingMs || payload?.receipt?.generationTimingMs || 0) || 0,
            },
            ttsProvider: payload?.ttsProvider || payload?.selectedTtsEngine || "",
            ttsEngine: payload?.engine || "",
          });
        }
        if (payload?.localVoiceStatus) setCockpitLocalVoiceStatus(payload.localVoiceStatus);
        if (payload?.audioBase64 && payload?.contentType) {
          const playbackAttemptStartedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
          let playbackStartedAt = 0;
          const playbackMode = await playApexVoiceAudio({
            audioBase64: payload.audioBase64,
            contentType: payload.contentType,
            audioRef: cockpitAudioRef,
            unlockedRef: cockpitAudioUnlockedRef,
            onEnd: () => {
              if (voiceTurnId) {
                updateCockpitVoiceTimingReceipt({
                  turnId: voiceTurnId,
                  startedAt: voiceTurnStartedAt,
                  status: "spoken",
                  timingMs: {
                    playbackDurationMs: playbackStartedAt ? Math.max(0, Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - playbackStartedAt)) : 0,
                  },
                });
              }
              setCockpitAudioReadyState(true);
              stopCockpitOutputLevelMonitor();
              clearCockpitSpeechSafetyTimer();
              cockpitSpeakingRef.current = false;
              setCockpitSpeaking(false);
              scheduleCockpitListeningAfterSpeech();
            },
            onPlaybackError: () => {
              if (voiceTurnId) {
                updateCockpitVoiceTimingReceipt({
                  turnId: voiceTurnId,
                  startedAt: voiceTurnStartedAt,
                  status: "playback-failed",
                  failureReason: "playback-failed",
                });
              }
              setCockpitAudioReadyState(false);
              speakCockpitBrowserFallback(answerToSpeak, "Local TTS produced audio but playback failed. Browser playback is fallback-only; OpenAI audio was not used.");
            },
          });
          if (playbackMode) {
            playbackStartedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
            armCockpitSpeechSafetyTimer(answerToSpeak, {
              recoveryNotice: "Apex voice playback took too long, so I stopped it before it could loop.",
            });
            if (voiceTurnId) {
              updateCockpitVoiceTimingReceipt({
                turnId: voiceTurnId,
                startedAt: voiceTurnStartedAt,
                status: "playing",
                timingMs: {
                  playbackStartDelayMs: Math.max(0, Math.round(playbackStartedAt - playbackAttemptStartedAt)),
                },
                playbackMode,
              });
            }
            setCockpitAudioReadyState(true);
            setCockpitVoiceNotice(payload.aiDisclosure || "Apex spoke with local TTS. OpenAI audio was not used.");
            return;
          }
        }
        const missing = payload?.error || payload?.localVoiceStatus?.missing?.join(" ") || "Local TTS is not ready yet.";
        if (voiceTurnId) {
          updateCockpitVoiceTimingReceipt({
            turnId: voiceTurnId,
            startedAt: voiceTurnStartedAt,
            status: "tts-fallback",
            failureReason: "tts-fallback",
          });
        }
        speakCockpitBrowserFallback(payload?.fallbackText || answerToSpeak, `${missing} Browser playback is fallback-only; OpenAI audio was not used. The typed answer stays visible.`);
        return;
      } catch (speechError) {
        const missing = isApexCockpitAuthRequiredError(speechError)
          ? apexCockpitLocalVoiceAuthRecoveryText()
          : speechError?.payload?.error || speechError?.message || "Local TTS endpoint is unavailable.";
        if (voiceTurnId) {
          updateCockpitVoiceTimingReceipt({
            turnId: voiceTurnId,
            startedAt: voiceTurnStartedAt,
            status: "tts-error",
            failureReason: "tts-error",
          });
        }
        speakCockpitBrowserFallback(answerToSpeak, `${missing} Browser playback is fallback-only; OpenAI audio was not used. The typed answer stays visible.`);
      }
      return;
    }
    if (!sessionToken) {
      speakCockpitBrowserFallback(answerToSpeak, "Server speech is not available in this session; browser voice is speaking.");
      return;
    }
    try {
      const ttsRequestStartedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
      const payload = await speakApexOsLocalVoice(sessionToken, {
        turnId: voiceTurnId,
        text: answerToSpeak,
        voice: cockpitVoiceProfile,
        voiceMode: APEX_COCKPIT_USE_FAST_SIMPLE_VOICE ? "fast-fallback" : "apex",
        preferFastVoice: APEX_COCKPIT_USE_FAST_SIMPLE_VOICE,
      });
      const ttsRequestMs = Math.max(0, Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - ttsRequestStartedAt));
      if (voiceTurnId) {
        updateCockpitVoiceTimingReceipt({
          turnId: voiceTurnId,
          startedAt: voiceTurnStartedAt,
          status: "tts-ready",
          engine: payload?.engine || payload?.selectedTtsEngine || "",
          timingMs: {
            ttsRequestMs,
            ttsGenerationMs: Number(payload?.generationTimingMs || payload?.receipt?.generationTimingMs || 0) || 0,
          },
          ttsProvider: payload?.ttsProvider || payload?.selectedTtsEngine || "",
          ttsEngine: payload?.engine || "",
        });
      }
      if (payload?.audioBase64 && payload?.contentType) {
        const playbackAttemptStartedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
        let playbackStartedAt = 0;
        const playbackMode = await playApexVoiceAudio({
          audioBase64: payload.audioBase64,
          contentType: payload.contentType,
          audioRef: cockpitAudioRef,
          unlockedRef: cockpitAudioUnlockedRef,
          onEnd: () => {
            if (voiceTurnId) {
              updateCockpitVoiceTimingReceipt({
                turnId: voiceTurnId,
                startedAt: voiceTurnStartedAt,
                status: "spoken",
                timingMs: {
                  playbackDurationMs: playbackStartedAt ? Math.max(0, Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - playbackStartedAt)) : 0,
                },
              });
            }
            setCockpitAudioReadyState(true);
            stopCockpitOutputLevelMonitor();
            clearCockpitSpeechSafetyTimer();
            cockpitSpeakingRef.current = false;
            setCockpitSpeaking(false);
            scheduleCockpitListeningAfterSpeech();
          },
          onPlaybackError: () => {
            if (voiceTurnId) {
              updateCockpitVoiceTimingReceipt({
                turnId: voiceTurnId,
                startedAt: voiceTurnStartedAt,
                status: "playback-failed",
                failureReason: "playback-failed",
              });
            }
            setCockpitAudioReadyState(false);
            speakCockpitBrowserFallback(answerToSpeak, "Apex speech audio stopped, so browser voice fallback is speaking.");
          },
        });
          if (playbackMode) {
            playbackStartedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
            armCockpitSpeechSafetyTimer(answerToSpeak, {
              recoveryNotice: "Apex voice playback took too long, so I stopped it before it could loop.",
            });
            if (voiceTurnId) {
              updateCockpitVoiceTimingReceipt({
              turnId: voiceTurnId,
              startedAt: voiceTurnStartedAt,
              status: "playing",
              timingMs: {
                playbackStartDelayMs: Math.max(0, Math.round(playbackStartedAt - playbackAttemptStartedAt)),
              },
              playbackMode,
            });
          }
          setCockpitAudioReadyState(true);
          setCockpitVoiceNotice(payload.aiDisclosure || "Apex OS voice output is AI-generated.");
          return;
        }
        speakCockpitBrowserFallback(answerToSpeak, "Apex speech audio could not start, so browser voice fallback is speaking.");
        return;
      }
      speakCockpitBrowserFallback(payload?.fallbackText || answerToSpeak, payload?.providerConfigured ? "Speech provider fallback is active; browser voice is speaking. The typed answer stays visible." : "Server speech is not configured; browser voice is speaking. The typed answer stays visible.");
    } catch (speechError) {
      const missing = isApexCockpitAuthRequiredError(speechError)
        ? apexCockpitLocalVoiceAuthRecoveryText()
        : speechError?.message ? `Speech endpoint unavailable; browser voice is speaking. ${speechError.message}` : "Speech endpoint unavailable; browser voice is speaking.";
      speakCockpitBrowserFallback(answerToSpeak, missing);
    }
  }

  function queueCockpitProactiveVoice(checkIn = {}, reason = "busy") {
    if (!checkIn?.shouldSurface) return false;
    const signature = checkIn.signature || "";
    if (signature && cockpitLastSpokenProactiveSignatureRef.current === signature) return false;
    cockpitPendingProactiveVoiceRef.current = checkIn;
    setCockpitProactiveVoiceStatus("Queued");
    setCockpitProactiveVoiceQueueKey((current) => current + 1);
    const reasonText = reason === "wake-required"
      ? "Allow microphone access and I will speak this proactive check-in."
      : reason === "auto-drive-handback"
        ? "Apex queued the proactive check-in until the Auto Drive handback clears."
        : "Apex queued the proactive check-in until the live voice turn is clear.";
    setCockpitVoiceNotice(reasonText);
    return true;
  }

  function speakCockpitProactiveCheckIn(checkIn = cockpitVisibleProactiveCheckIn, { reason = "automatic" } = {}) {
    if (!checkIn?.shouldSurface || !state.canView || !sessionToken) return false;
    const signature = checkIn.signature || "";
    if (signature && cockpitLastSpokenProactiveSignatureRef.current === signature) return false;
    if (reason !== "manual" && isApexCockpitReviewGateCheckIn(checkIn)) {
      if (signature) cockpitLastSpokenProactiveSignatureRef.current = signature;
      cockpitPendingProactiveVoiceRef.current = null;
      setCockpitProactiveVoiceStatus("Manual");
      setCockpitVoiceNotice("Apex surfaced the review-gate state silently and kept listening.");
      return false;
    }
    if (!cockpitConversationMode || !cockpitAutoListening) {
      setCockpitProactiveVoiceStatus("Manual");
      return false;
    }
    if (cockpitNeedsWake && cockpitMicPermissionState === "denied" && !cockpitMicReady) {
      return queueCockpitProactiveVoice(checkIn, "wake-required");
    }
    const recentAutoDriveHandback = cockpitLastAutoDriveHandbackAtRef.current
      && Date.now() - cockpitLastAutoDriveHandbackAtRef.current < 12_000;
    const voiceBusy = cockpitSpeakingRef.current
      || cockpitSpeaking
      || cockpitRecording
      || cockpitTranscribing
      || cockpitSubmitting
      || cockpitVoiceOpeningRef.current
      || recentAutoDriveHandback;
    if (voiceBusy) return queueCockpitProactiveVoice(checkIn, reason);

    cockpitPendingProactiveVoiceRef.current = null;
    if (signature) cockpitLastSpokenProactiveSignatureRef.current = signature;
    const spokenCheckIn = buildApexCockpitSpokenProactiveCheckInText(checkIn);
    setCockpitProactiveVoiceStatus("Spoken");
    setCockpitVoiceNotice("Apex is speaking a proactive live-run check-in.");
    void speakCockpitAnswer(spokenCheckIn);
    return true;
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
      if (runsResult.status === "fulfilled") {
        syncCockpitLiveRunsFromPayload(runsResult.value);
      }
      const failureCount = [buildResult, briefingResult, runsResult].filter((result) => result.status === "rejected").length;
      setCockpitLivePulse(pulse);
      if (failureCount) {
        const message = `Live pulse checked with ${failureCount} limited source${failureCount === 1 ? "" : "s"}.`;
        setCockpitLivePulseError(message);
        if (!automatic) setCockpitVoiceNotice(message);
      } else if (!automatic) {
        setCockpitVoiceNotice("Live pulse refreshed from build, briefing, and run status. Consequential external actions stayed gated.");
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

  function syncCockpitLiveRunsFromPayload(payload = {}, preferredRunId = "") {
    const nextRuns = listApexCockpitRunRows(payload.apexOsAutonomyRuns);
    if (!nextRuns.length) return;
    const nextHomeRuns = listApexCockpitHomeRunRows(nextRuns);
    setCockpitLiveRuns(nextRuns);
    setCockpitLiveRunSummary(payload.summary || {});
    setCockpitActiveRunId((current) => {
      if (preferredRunId && nextHomeRuns.some((run) => run.id === preferredRunId)) return preferredRunId;
      if (current && nextHomeRuns.some((run) => run.id === current)) return current;
      return nextHomeRuns.find((run) => !["done", "archived"].includes(String(run.status || "").toLowerCase()))?.id || "";
    });
  }

  function syncCockpitLiveOperatorMemoryFromPayload(payload = {}) {
    const memoryRows = Array.isArray(payload.apexOsMemory)
      ? payload.apexOsMemory
      : Array.isArray(payload.companySettings?.apexOsMemory)
        ? payload.companySettings.apexOsMemory
        : [];
    if (!memoryRows.length) return;
    setCockpitLiveOperatorMemory(buildApexCockpitLiveOperatorMemorySnapshot(memoryRows));
  }

  function clearCockpitHomeSurface({ notice = "Screen cleared to the calm Apex conversation surface." } = {}) {
    setCockpitError("");
    setCockpitAgentActionNotice("");
    setCockpitLiveRunNotice("");
    setCockpitFocusDrawer("");
    setCockpitConsoleTab("live");
    setCockpitSpotlightMode(true);
    setCockpitProactiveCheckIn(null);
    setCockpitActiveRunId("");
    setCockpitVoiceRetryReason("");
    setCockpitVoiceRetryCount(0);
    cockpitVoiceRetryCountRef.current = 0;
    cockpitLastProactiveSignatureRef.current = "";
    cockpitPendingProactiveVoiceRef.current = null;
    setCockpitProactiveVoiceStatus("Watching");
    setCockpitVoiceNotice(notice);
  }

  async function reviewCockpitRunMemory(status) {
    if (!state.canView || !sessionToken || !cockpitRunMemoryReviewRow?.id || cockpitRunMemoryReviewBusy) return null;
    const normalizedStatus = status === "approved" ? "approved" : "archived";
    setCockpitRunMemoryReviewBusy(normalizedStatus);
    setCockpitRunMemoryReviewNotice(normalizedStatus === "approved"
      ? "Trusting this run memory after operator review."
      : "Archiving this suggested run memory.");
    try {
      const payload = await updateApexOsMemory(sessionToken, cockpitRunMemoryReviewRow.id, {
        status: normalizedStatus,
        reviewNote: normalizedStatus === "approved"
          ? "Operator reviewed this Apex Live Operator Mode run memory from the handback gate and trusted it for future Apex answers."
          : "Operator archived this Apex Live Operator Mode run memory from the handback gate.",
      });
      syncCockpitLiveOperatorMemoryFromPayload(payload);
      const updated = payload?.apexOsMemoryEntry || {};
      const notice = normalizedStatus === "approved"
        ? "Run memory trusted. Apex can use this reviewed run outcome in future answers."
        : "Suggested run memory archived. Apex will not trust this run outcome.";
      setCockpitRunMemoryReviewNotice(notice);
      setCockpitAgentActionNotice(notice);
      setCockpitResponse({
        answer: {
          answer: `${notice} No external send, billing, provider work, production change, deletion, deploy, rollback, or irreversible action executed.`,
          sourceLabels: ["Apex Live Operator Mode", "Run Memory Review", updated.sourceLabel || "Apex OS memory"],
        },
      });
      refreshCockpitLivePulse({ automatic: true });
      return updated;
    } catch (error) {
      const message = error?.message || "Run memory review could not be saved.";
      setCockpitRunMemoryReviewNotice(message);
      setCockpitAgentActionNotice(message);
      return null;
    } finally {
      setCockpitRunMemoryReviewBusy("");
    }
  }

  function deliverCockpitBriefing({ speak = false } = {}) {
    const route = buildApexCockpitCommandRoute("Summarize today");
    setCockpitCommandRoute(route);
    setCockpitError("");
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

  function deliverCockpitOperatorJudgment({ speak = false } = {}) {
    const route = buildApexCockpitCommandRoute("What should I do next?");
    setCockpitCommandRoute(route);
    setCockpitError("");
    setCockpitResponse({
      answer: {
        answer: cockpitOperatorJudgmentText,
        sourceLabels: ["Apex Live Operator Mode", "Proactive Pulse", "Autonomy Run Center"],
      },
    });
    setCockpitLastQuestion("Operator judgment");
    setCockpitVoiceNotice("Apex operator judgment is ready. Consequential actions stayed gated.");
    setCockpitTurns((current) => [
      {
        id: `cockpit-judgment-${Date.now()}`,
        question: "Operator judgment",
        source: "system",
        routeLabel: route.label,
        status: "answered",
      },
      ...current,
    ].slice(0, 5));
    if (speak) speakCockpitAnswer(cockpitOperatorJudgmentText);
  }

  function deliverCockpitWatchOfficer({ speak = false } = {}) {
    const route = buildApexCockpitCommandRoute("Give me the watch officer report", {
      previousRoute: cockpitCommandRoute,
      activeRun: cockpitActiveRun,
      nextPrivateMove: cockpitNextPrivateMove,
    });
    setCockpitCommandRoute(route);
    setCockpitError("");
    setCockpitResponse({
      answer: {
        answer: cockpitWatchOfficer.spokenText,
        sourceLabels: cockpitWatchOfficer.sourceLabels,
      },
    });
    setCockpitLastQuestion("Watch officer");
    setCockpitVoiceNotice("Apex watch officer report is ready. Consequential actions stayed gated.");
    setCockpitTurns((current) => [
      {
        id: `cockpit-watch-officer-${Date.now()}`,
        question: cockpitWatchOfficer.title,
        source: "watch-officer",
        routeLabel: route.label,
        status: cockpitWatchOfficer.status || "watching",
      },
      ...current,
    ].slice(0, 5));
    if (speak) speakCockpitAnswer(cockpitWatchOfficer.spokenText);
  }

  function deliverCockpitMissionBrief({ speak = false } = {}) {
    const route = buildApexCockpitCommandRoute("Give me the mission brief", {
      previousRoute: cockpitCommandRoute,
      activeRun: cockpitActiveRun,
      nextPrivateMove: cockpitNextPrivateMove,
    });
    setCockpitCommandRoute(route);
    setCockpitError("");
    setCockpitResponse({
      answer: {
        answer: cockpitMissionBrief.spokenText,
        sourceLabels: cockpitMissionBrief.sourceLabels,
      },
    });
    setCockpitLastQuestion("Mission brief");
    setCockpitVoiceNotice("Apex mission brief is ready. Consequential actions stayed gated.");
    setCockpitTurns((current) => [
      {
        id: `cockpit-mission-brief-${Date.now()}`,
        question: cockpitMissionBrief.title,
        source: "mission-brief",
        routeLabel: route.label,
        status: cockpitMissionBrief.status || "reviewed",
      },
      ...current,
    ].slice(0, 5));
    if (speak) speakCockpitAnswer(cockpitMissionBrief.spokenText);
  }

  function deliverCockpitSessionHeartbeat({ speak = false } = {}) {
    const route = buildApexCockpitCommandRoute("Give me the active run check-in", {
      previousRoute: cockpitCommandRoute,
      activeRun: cockpitActiveRun,
      nextPrivateMove: cockpitNextPrivateMove,
    });
    setCockpitCommandRoute(route);
    setCockpitError("");
    setCockpitResponse({
      answer: {
        answer: cockpitSessionHeartbeatText,
        sourceLabels: ["Apex Live Session Heartbeat", "Autonomy Run Center", "Proactive Pulse"],
      },
    });
    setCockpitLastQuestion("Live session heartbeat");
    setCockpitVoiceNotice("Apex live session heartbeat is ready. Consequential actions stayed gated.");
    setCockpitTurns((current) => [
      {
        id: `cockpit-heartbeat-${Date.now()}`,
        question: "Live session heartbeat",
        source: "system",
        routeLabel: route.label,
        status: "answered",
      },
      ...current,
    ].slice(0, 5));
    if (speak) speakCockpitAnswer(cockpitSessionHeartbeatText);
  }

  function deliverCockpitRunHandback({ speak = false } = {}) {
    const route = buildApexCockpitCommandRoute("Give me the active run handback", {
      previousRoute: cockpitCommandRoute,
      activeRun: cockpitActiveRun,
      nextPrivateMove: cockpitNextPrivateMove,
    });
    const handback = cockpitActiveRunHandback;
    const answer = cockpitActiveRunHandbackText;
    setCockpitCommandRoute(route);
    setCockpitError("");
    setCockpitResponse({
      answer: {
        answer,
        sourceLabels: handback.sourceLabels || ["Apex Operator Handback", "Autonomy Run Center", "Active run session"],
      },
    });
    setCockpitLastQuestion("Operator handback");
    setCockpitVoiceNotice("Apex operator handback is ready. Consequential actions stayed gated.");
    setCockpitTurns((current) => [
      {
        id: `cockpit-handback-${Date.now()}`,
        question: handback.title || "Operator handback",
        source: "handback",
        routeLabel: route.label,
        status: handback.status || "reviewed",
      },
      ...current,
    ].slice(0, 5));
    if (speak) speakCockpitAnswer(answer);
  }

  function deliverCockpitClosingReport({ speak = false } = {}) {
    const route = buildApexCockpitCommandRoute("Give me the active run closing report", {
      previousRoute: cockpitCommandRoute,
      activeRun: cockpitActiveRun,
      nextPrivateMove: cockpitNextPrivateMove,
    });
    setCockpitCommandRoute(route);
    setCockpitError("");
    setCockpitResponse({
      answer: {
        answer: cockpitClosingReport.spokenText,
        sourceLabels: cockpitClosingReport.sourceLabels,
      },
    });
    setCockpitLastQuestion("Closing report");
    setCockpitVoiceNotice("Apex live operator closing report is ready. Consequential actions stayed gated.");
    setCockpitTurns((current) => [
      {
        id: `cockpit-closing-report-${Date.now()}`,
        question: cockpitClosingReport.title,
        source: "closing-report",
        routeLabel: route.label,
        status: cockpitClosingReport.status || "review",
      },
      ...current,
    ].slice(0, 5));
    if (speak) speakCockpitAnswer(cockpitClosingReport.spokenText);
  }

  function deliverCockpitProactiveCheckIn({ speak = false } = {}) {
    const route = buildApexCockpitCommandRoute("Give me the active run check-in", {
      previousRoute: cockpitCommandRoute,
      activeRun: cockpitActiveRun,
      nextPrivateMove: cockpitNextPrivateMove,
    });
    const checkIn = cockpitVisibleProactiveCheckIn;
    const answer = buildApexCockpitProactiveCheckInText(checkIn);
    setCockpitCommandRoute(route);
    setCockpitError("");
    setCockpitResponse({
      answer: {
        answer,
        sourceLabels: checkIn.sourceLabels || ["Apex Proactive Check-In", "Live Session Heartbeat", "Autonomy Run Center"],
      },
    });
    setCockpitLastQuestion("Proactive check-in");
    setCockpitVoiceNotice(checkIn.voiceNotice || "Apex proactive check-in is ready. Consequential actions stayed gated.");
    setCockpitTurns((current) => [
      {
        id: `cockpit-proactive-manual-${Date.now()}`,
        question: checkIn.title || "Proactive check-in",
        source: "proactive",
        routeLabel: "Live heartbeat",
        status: checkIn.trigger || "reviewed",
      },
      ...current,
    ].slice(0, 5));
    if (speak) speakCockpitAnswer(answer);
  }

  async function saveCockpitProactiveCheckInMemory(checkIn = cockpitVisibleProactiveCheckIn, { automatic = false } = {}) {
    const signature = checkIn?.signature || "";
    if (!state.canView || !sessionToken || !checkIn?.shouldSurface) {
      if (!automatic) setCockpitProactiveMemoryNotice("Only surfaced proactive check-ins become suggested memory.");
      return null;
    }
    if (signature && cockpitProactiveMemoryIds[signature]) {
      if (!automatic) setCockpitProactiveMemoryNotice("This proactive check-in is already captured as suggested memory.");
      return null;
    }
    if (cockpitProactiveMemorySavingRef.current) return null;
    const memoryDraft = buildApexOsAutonomyRunProactiveMemoryDraft(checkIn, cockpitSessionHeartbeat, {
      now: new Date().toISOString(),
    });
    if (!memoryDraft) {
      if (!automatic) setCockpitProactiveMemoryNotice("Apex is still watching. No meaningful check-in is ready for memory yet.");
      return null;
    }

    cockpitProactiveMemorySavingRef.current = true;
    setCockpitProactiveMemoryBusy(true);
    setCockpitProactiveMemoryNotice(automatic
      ? "Drafting suggested memory from the proactive check-in."
      : "Drafting suggested proactive memory. It stays untrusted until reviewed.");
    try {
      const payload = await createApexOsMemory(sessionToken, memoryDraft);
      syncCockpitLiveOperatorMemoryFromPayload(payload);
      const created = payload?.apexOsMemoryEntry;
      const memoryId = created?.id || "suggested";
      setCockpitProactiveMemoryIds((current) => ({ ...current, [signature || memoryDraft.sourceUri]: memoryId }));
      setCockpitProactiveMemoryCount((current) => current + 1);
      const notice = created?.id
        ? `Suggested proactive memory ${created.id} drafted for manual review.`
        : "Suggested proactive memory drafted for manual review.";
      setCockpitProactiveMemoryNotice(notice);
      setCockpitAgentActionNotice(`${notice} It is not trusted automatically.`);
      setCockpitTurns((current) => [
        {
          id: `cockpit-proactive-memory-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          question: `Suggested memory saved: ${created?.title || memoryDraft.title}`,
          source: "memory",
          routeLabel: "Memory",
          status: "suggested",
        },
        ...current,
      ].slice(0, 5));
      return created || null;
    } catch (error) {
      if (error?.status === 409) {
        setCockpitProactiveMemoryIds((current) => ({ ...current, [signature || memoryDraft.sourceUri]: "duplicate" }));
        setCockpitProactiveMemoryNotice("Suggested proactive memory already exists for this check-in.");
      } else {
        setCockpitProactiveMemoryNotice(error?.message || "Suggested proactive memory could not be saved.");
      }
      return null;
    } finally {
      cockpitProactiveMemorySavingRef.current = false;
      setCockpitProactiveMemoryBusy(false);
    }
  }

  function loadCockpitFollowUpPrompt(prompt = {}) {
    const safePrompt = normalizeApexCockpitFollowUpPrompt(prompt);
    const route = buildApexCockpitCommandRoute(safePrompt.question, {
      previousRoute: cockpitCommandRoute,
      activeRun: cockpitActiveRun,
      nextPrivateMove: cockpitNextPrivateMove,
    });
    setAskQuestion(safePrompt.question);
    setCockpitCommandRoute(route);
    setCockpitVoiceNotice(`Next turn loaded: ${safePrompt.label}. Press Ask or say it out loud; consequential actions stay gated.`);
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
        ? `Locked agent-control request ${created.id} saved. Agent execution remains gated.`
        : "Locked agent-control request saved. Agent execution remains gated.");
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

  async function createCockpitBuilderTaskFromCommand(question = cockpitLastQuestion || askQuestion || "Check the Apex HQ app", route = cockpitCommandRoute, { turnId = "" } = {}) {
    if (!state.canView || !sessionToken || cockpitCreatingLiveRun) return null;
    const request = String(question || "").trim() || "Track the next Apex HQ builder task.";
    const runTurnId = turnId || `cockpit-builder-task-${Date.now()}`;
    setCockpitCreatingLiveRun(true);
    setCockpitLiveRunNotice("Creating private builder task. Apex will track this locally and keep consequential actions gated.");
    setCockpitAgentActionNotice("Creating private builder task in Apex's existing run ledger. No deploy or file edit will run from this action.");
    if (!turnId) {
      setCockpitTurns((current) => [
        {
          id: runTurnId,
          question: request,
          source: "builder-task",
          routeLabel: "Apex Builder Mode",
          status: "saving-builder-task",
        },
        ...current,
      ].slice(0, 5));
    }
    try {
      const payload = await createApexOsAutonomyRun(sessionToken, {
        request,
        routeId: "apex-builder-mode",
        routeLabel: "Apex Builder Mode",
        routeDetail: route?.detail || "Private Apex Builder Mode task for local app work.",
        sourceLabel: "Apex Builder Mode",
        sourceUri: "apex://builder-mode",
        operatorNote: "Created from Apex Home Builder Mode. Safe local checks and private tracking are allowed; deploy, production mutation, schema/auth/session, deletion, sends, spend, orders, booking, permission weakening, and uncontrolled file edits stay blocked.",
      });
      const created = payload?.apexOsAutonomyRun;
      syncCockpitLiveRunsFromPayload(payload, created?.id || "");
      const notice = created?.id
        ? `Builder task ${created.id} saved. Apex can track it, run fixed local checks, and report progress from Builder Mode.`
        : "Builder task saved. Apex can track it, run fixed local checks, and report progress from Builder Mode.";
      setCockpitLiveRunNotice(notice);
      setCockpitAgentActionNotice(`${notice} Consequential actions stayed gated.`);
      setCockpitResponse({
        answer: {
          answer: `${notice} Next: refresh build awareness or run a focused local validation check.`,
          sourceLabels: ["Apex Builder Mode", "Autonomy Run Center", "Build awareness"],
        },
      });
      setCockpitTurns((current) => current.map((turn) => (turn.id === runTurnId ? { ...turn, status: "builder-task-created" } : turn)));
      refreshCockpitLivePulse({ automatic: true });
      return created || null;
    } catch (error) {
      const message = error?.message || "Builder task could not be saved.";
      setCockpitLiveRunNotice(message);
      setCockpitAgentActionNotice(message);
      setCockpitTurns((current) => current.map((turn) => (turn.id === runTurnId ? { ...turn, status: "blocked" } : turn)));
      return null;
    } finally {
      setCockpitCreatingLiveRun(false);
    }
  }

  async function runCockpitBuilderFixFromCommand(question = cockpitLastQuestion || askQuestion || "Run a focused Apex Builder fix", route = cockpitCommandRoute, { turnId = "", selfFixPatchHandoff = null, selfFixAutoDispatch = false } = {}) {
    if (!state.canView || !sessionToken || cockpitCreatingLiveRun) return null;
    const request = String(question || "").trim() || "Run a controlled local Builder Mode fix.";
    const fixTurnId = turnId || `cockpit-builder-fix-${Date.now()}`;
    setCockpitCreatingLiveRun(true);
    setCockpitLiveRunNotice(selfFixAutoDispatch
      ? "Dispatching Self-Fix to controlled Builder tooling. Apex will report the short result first."
      : "Running controlled local fix. Apex will stay inside allowlisted local Builder Mode profiles.");
    setCockpitAgentActionNotice(selfFixAutoDispatch
      ? "Apex is auto-dispatching a private local fix through controlled Builder tooling. Consequential actions stay stopped."
      : "Apex is attempting a controlled local fix. Deploy, production, schema/auth/session, deletion, sends, spend, orders, booking, permission changes, and broad rewrites stay blocked.");
    if (!turnId) {
      setCockpitTurns((current) => [
        {
          id: fixTurnId,
          question: request,
          source: selfFixAutoDispatch ? "self-fix-v2" : "builder-fix",
          routeLabel: selfFixAutoDispatch ? "Apex Self-Fix v2" : "Apex Builder Mode",
          status: selfFixAutoDispatch ? "self-fix-dispatching" : "running-controlled-fix",
        },
        ...current,
      ].slice(0, 5));
    }
    try {
      const payload = await runApexOsBuilderFix(sessionToken, {
        request,
        selfFixPatchHandoff: selfFixPatchHandoff || undefined,
        source: selfFixAutoDispatch ? "apex-home-self-fix-v2" : "apex-home-builder-mode",
        applyPatch: true,
        runValidation: true,
      });
      const fixRun = payload?.fixRun;
      const dispatchReceipt = fixRun?.selfFixAutoDispatch || null;
      if (dispatchReceipt) setCockpitSelfFixDispatchReceipt(dispatchReceipt);
      const notice = selfFixAutoDispatch
        ? (dispatchReceipt?.shortAnswer || fixRun?.receipt || "Handled. Result recorded.")
        : (fixRun?.receipt || "Controlled local fix finished.");
      if (fixRun && typeof onBuilderFixReceipt === "function") onBuilderFixReceipt(fixRun);
      setCockpitLiveRunNotice(notice);
      setCockpitAgentActionNotice(dispatchReceipt?.receipt || notice);
      setCockpitResponse({
        answer: {
          answer: selfFixAutoDispatch
            ? notice
            : `${notice} ${fixRun?.scopedFiles?.length ? `Scoped files: ${fixRun.scopedFiles.join(", ")}.` : ""}`.trim(),
          sourceLabels: [
            selfFixAutoDispatch ? "Apex Self-Fix v2" : "Apex Builder Mode v1.2",
            "Controlled Local Fixes",
            fixRun?.fixId || "local-fix",
          ].filter(Boolean),
          selfFixAutoDispatch: dispatchReceipt,
        },
        context: dispatchReceipt ? { selfFixAutoDispatch: dispatchReceipt } : undefined,
      });
      setCockpitTurns((current) => current.map((turn) => (turn.id === fixTurnId ? {
        ...turn,
        status: selfFixAutoDispatch ? (dispatchReceipt?.status || fixRun?.status || "self-fix-finished") : (fixRun?.status || "fix-finished"),
        answerSnippet: apexCockpitMemoryText(notice, 220),
        sourceLabels: [
          selfFixAutoDispatch ? "Apex Self-Fix v2" : "Apex Builder Mode v1.2",
          fixRun?.fixId || "controlled-local-fix",
        ].filter(Boolean),
        routeDetail: route?.detail,
      } : turn)));
      refreshCockpitLivePulse({ automatic: true });
      return fixRun || null;
    } catch (error) {
      const message = error?.message || "Controlled local fix could not run.";
      setCockpitLiveRunNotice(message);
      setCockpitAgentActionNotice(message);
      setCockpitTurns((current) => current.map((turn) => (turn.id === fixTurnId ? { ...turn, status: "blocked" } : turn)));
      return null;
    } finally {
      setCockpitCreatingLiveRun(false);
    }
  }

  async function runCockpitBuildLoopFromCommand(question = cockpitLastQuestion || askQuestion || "Apex, work on yourself.", route = cockpitCommandRoute, { turnId = "" } = {}) {
    if (!state.canView || !sessionToken || cockpitCreatingLiveRun) return null;
    const request = String(question || "").trim() || "Apex, work on yourself.";
    const buildTurnId = turnId || `cockpit-build-loop-${Date.now()}`;
    setCockpitCreatingLiveRun(true);
    setCockpitLiveRunNotice("Apex Build Loop is starting a scoped local task through controlled Builder/Self-Fix tooling.");
    setCockpitAgentActionNotice("Apex is routing normal controlled Builder work through qwen3:14b at 4096 context. qwen3-coder:30b stays manual-only unless John explicitly asks for deep coding. No raw file writes, git, deploy, production, schema/auth/session, secrets, or external actions.");
    if (!turnId) {
      setCockpitTurns((current) => [
        {
          id: buildTurnId,
          question: request,
          source: "apex-build-loop-v0",
          routeLabel: "Apex Build Loop",
          status: "starting-build-loop",
        },
        ...current,
      ].slice(0, 5));
    }
    try {
      const payload = await runApexOsBuildLoop(sessionToken, {
        request,
        applyPatch: true,
        runValidation: true,
      });
      const receipt = payload?.buildLoop?.receipt || null;
      if (receipt) setCockpitBuildLoopReceipt(receipt);
      const answer = receipt?.shortAnswer
        ? `${receipt.shortAnswer} ${receipt.reason ? apexCockpitMemoryText(receipt.reason, 180) : ""}`.trim()
        : "Apex Build Loop recorded the task.";
      const notice = receipt?.receiptFolder
        ? `${answer} Receipt saved.`
        : answer;
      setCockpitResponse({
        answer: {
          answer: notice,
          sourceLabels: ["Apex Autonomous Build Loop v0", "qwen3:14b coding lane", "30B manual-only", "Controlled Builder"].filter(Boolean),
          buildLoopReceipt: receipt,
        },
        context: {
          buildLoop: payload?.buildLoop || null,
        },
      });
      setCockpitLiveRunNotice(notice);
      setCockpitAgentActionNotice(receipt?.permissionsPrivacyImpact || notice);
      setCockpitTurns((current) => current.map((turn) => (turn.id === buildTurnId ? {
        ...turn,
        status: receipt?.outcome || receipt?.status || "build-loop-recorded",
        answerSnippet: apexCockpitMemoryText(notice, 220),
        sourceLabels: ["Apex Build Loop", receipt?.taskProfile || "controlled-builder"].filter(Boolean),
        routeDetail: route?.detail,
      } : turn)));
      refreshCockpitLivePulse({ automatic: true });
      return receipt;
    } catch (error) {
      const message = error?.message || "Apex Build Loop could not run.";
      setCockpitLiveRunNotice(message);
      setCockpitAgentActionNotice(message);
      setCockpitTurns((current) => current.map((turn) => (turn.id === buildTurnId ? { ...turn, status: "blocked" } : turn)));
      return null;
    } finally {
      setCockpitCreatingLiveRun(false);
    }
  }

  async function runCockpitTypedLiveLatencyBenchmark() {
    if (!state.canView || !sessionToken || cockpitLiveBenchmarkBusy) return null;
    setCockpitLiveBenchmarkBusy("typed");
    setCockpitVoiceNotice("Running visible typed latency benchmark through the local resident llama.cpp/GPT-OSS lane. No mic, raw prompt, or raw response will be stored.");
    try {
      const payload = await runApexOsTypedLiveTurnBenchmark(sessionToken, {
        explicitUserStarted: true,
        residentNumCtx: 4096,
      });
      const history = payload?.liveTurnBenchmarkHistory || {
        latestTypedBenchmark: payload?.typedBenchmark || payload?.liveTurnBenchmark || null,
        latestVoiceBenchmark: cockpitLiveBenchmarkSummary?.latestVoiceBenchmark || cockpitBackgroundPayload?.liveTurnBenchmarkHistory?.latestVoiceBenchmark || null,
      };
      setCockpitLiveBenchmarkSummary(history);
      const typed = history.latestTypedBenchmark || payload?.typedBenchmark || payload?.liveTurnBenchmark || {};
      setCockpitVoiceNotice(`Typed benchmark recorded: ${typed.totalTurnMs || 0}ms total, first token ${typed.modelFirstTokenMs || typed.firstTokenLatencyMs || 0}ms, model ${typed.modelTotalMs || 0}ms.`);
      setCockpitAgentActionNotice("Apex Live Turn Latency v1.1 typed benchmark ran locally. Voice comparison still requires a visible user-started mic turn.");
      return payload;
    } catch (error) {
      const message = error?.message || "Typed latency benchmark could not run.";
      setCockpitVoiceNotice(message);
      setCockpitAgentActionNotice(message);
      return null;
    } finally {
      setCockpitLiveBenchmarkBusy("");
    }
  }

  function armCockpitVoiceLiveLatencyBenchmark() {
    if (!state.canView || !sessionToken || cockpitLiveBenchmarkBusy) return false;
    const benchmarkId = `ALB-VOICE-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    cockpitLiveVoiceBenchmarkRef.current = {
      armed: true,
      benchmarkId,
      startedAt: Date.now(),
      explicitUserStarted: true,
    };
    setCockpitVoiceBenchmarkArmed(true);
    setCockpitLiveBenchmarkSummary((current) => current || cockpitBackgroundPayload?.liveTurnBenchmarkHistory || cockpitBackgroundPayload?.latency?.benchmarkHistory || null);
    setCockpitVoiceNotice("Voice benchmark armed. Speak into the visible local mic loop; Apex will store compact timing metadata only.");
    setCockpitAgentActionNotice("Apex will benchmark exactly the next visible voice turn. No hidden mic, no background recording, no raw audio, no transcript storage, and no cloud STT/TTS.");
    return true;
  }

  async function createCockpitLiveRunFromCommand(question = cockpitLastQuestion || askQuestion || cockpitBriefingText, route = cockpitCommandRoute, { turnId = "", autoCycle = false } = {}) {
    if (!state.canView || !sessionToken || cockpitCreatingLiveRun) return null;
    const request = String(question || "").trim() || `Start Apex live operator run for ${route?.label || "Apex"}.`;
    const runTurnId = turnId || `cockpit-live-run-${Date.now()}`;
    setCockpitCreatingLiveRun(true);
    setCockpitLiveRunNotice(autoCycle
      ? "Starting private live run. Apex will cycle safe internal prep/proof and stop at manual review."
      : "Starting private live run. Saving ledger and drafting internal work only.");
    setCockpitAgentActionNotice(autoCycle
      ? "Starting private live run from command. No external action will execute."
      : "Starting private live run. No external action will execute.");
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
        operatorNote: "Created from the Apex body screen. Save, draft, validate, report, and remember privately; consequential actions stay gated.",
      });
      const createdRun = createPayload?.apexOsAutonomyRun;
      let finalRun = createdRun || null;
      if (createdRun?.id) {
        const draftPayload = await draftApexOsAutonomyRunInternalWork(sessionToken, createdRun.id);
        finalRun = draftPayload?.apexOsAutonomyRun || createdRun;
        syncCockpitLiveRunsFromPayload(draftPayload, finalRun?.id || createdRun.id);
      } else {
        syncCockpitLiveRunsFromPayload(createPayload, createdRun?.id || "");
      }
      let autoCycleNotice = "";
      if (autoCycle && finalRun?.id && !["done", "archived", "blocked"].includes(String(finalRun.status || "").toLowerCase())) {
        setCockpitLiveRunNotice("Apex is cycling the new private run through prep and proof before manual review.");
        const cycleRun = runApexOsAutonomyRunPrivateOperatorCycle(finalRun, {
          now: new Date().toISOString(),
          operatorNote: "Apex started this from a natural command, cycled private prep/proof, and stopped at manual approval/report review.",
        });
        const cyclePayload = await updateApexOsAutonomyRun(sessionToken, finalRun.id, {
          status: cycleRun.status,
          operatorNote: cycleRun.operatorNote,
          steps: cycleRun.steps,
          evidence: cycleRun.evidence,
          nextSafeAction: cycleRun.nextSafeAction,
        });
        finalRun = cyclePayload?.apexOsAutonomyRun || cycleRun;
        syncCockpitLiveRunsFromPayload(cyclePayload, finalRun.id);
        autoCycleNotice = finalRun.status === "waiting-approval"
          ? " Apex also cycled private prep/proof and stopped at manual review."
          : " Apex started the private cycle and found validation gaps for review.";
      }
      const finalNotice = finalRun?.id
        ? `Live run ${finalRun.id} saved and internal draft package prepared.${autoCycleNotice} Consequential actions stayed gated.`
        : "Live run saved and internal draft package prepared. Consequential actions stayed gated.";
      setCockpitLiveRunNotice(finalNotice);
      setCockpitAgentActionNotice(finalNotice);
      setCockpitResponse({
        answer: {
          answer: `${finalNotice} Next: review the run ledger, validate evidence, then approve only the gated actions you truly want.`,
          sourceLabels: ["Apex Live Operator Mode", "Autonomy Run Center", "Agent handoff drafts"],
        },
      });
      setCockpitTurns((current) => current.map((turn) => (turn.id === runTurnId ? { ...turn, status: autoCycle ? "live-run-cycled" : "live-run-drafted" } : turn)));
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

  async function updateCockpitActiveRunStatus(status, { resultReport = "", operatorNote = "" } = {}) {
    if (!state.canView || !sessionToken || !cockpitActiveRun?.id || cockpitUpdatingRun) return null;
    const isDoneStatus = status === "done";
    const doneResultReport = isDoneStatus
      ? resultReport || cockpitActiveRun.resultReport || buildApexCockpitRunResultReport({
        run: cockpitActiveRun,
        question: cockpitLastQuestion || askQuestion,
        answer: cockpitAnswerText,
      })
      : "";
    const patch = {
      status,
      operatorNote: operatorNote || cockpitActiveRun.operatorNote || "",
    };
    if (isDoneStatus) {
      patch.resultReport = doneResultReport;
      patch.nextSafeAction = "Review the suggested run memory before trusting it, or reopen/block the run if evidence is incomplete.";
      patch.steps = (Array.isArray(cockpitActiveRun.steps) ? cockpitActiveRun.steps : []).map((step) => (
        step.id === "report-memory"
          ? {
            ...step,
            status: "done",
            evidence: "Apex reported the run outcome and prepared the result for suggested memory review.",
            updatedAt: new Date().toISOString(),
          }
          : step
      ));
    }
    if (status === "validating") {
      patch.nextSafeAction = "Validate evidence, review linked drafts, then report whether this run is done, blocked, or waiting for approval.";
    }
    if (status === "waiting-approval") {
      patch.nextSafeAction = "Review the gated actions manually. Approval does not execute anything from this cockpit.";
      patch.operatorNote = operatorNote || "Apex marked this live operator run waiting for manual approval review.";
    }
    if (status === "blocked") {
      patch.operatorNote = operatorNote || "Apex marked this live operator run blocked for operator review.";
      patch.nextSafeAction = "Review the blocker, adjust the request, or keep the run blocked.";
    }
    setCockpitUpdatingRun(`${status}-${cockpitActiveRun.id}`);
    setCockpitLiveRunNotice(`Updating active run to ${status}.`);
    try {
      const payload = await updateApexOsAutonomyRun(sessionToken, cockpitActiveRun.id, patch);
      let updated = payload?.apexOsAutonomyRun;
      syncCockpitLiveRunsFromPayload(payload, updated?.id || cockpitActiveRun.id);
      let memoryNotice = "";
      if (isDoneStatus && updated?.id && !updated.decisionMemoryId) {
        try {
          const memoryPayload = await createApexOsMemory(sessionToken, buildApexCockpitRunMemoryDraft({
            run: updated,
            resultReport: doneResultReport,
          }));
          syncCockpitLiveOperatorMemoryFromPayload(memoryPayload);
          const memoryId = memoryPayload?.apexOsMemoryEntry?.id || "";
          if (memoryId) {
            const memorySteps = (Array.isArray(updated.steps) ? updated.steps : []).map((step) => (
              step.id === "report-memory"
                ? {
                  ...step,
                  status: "done",
                  evidence: `Suggested run memory ${memoryId} drafted for manual review; it is not trusted automatically.`,
                  updatedAt: new Date().toISOString(),
                }
                : step
            ));
            const memoryRunPayload = await updateApexOsAutonomyRun(sessionToken, updated.id, {
              decisionMemoryId: memoryId,
              steps: memorySteps,
              evidence: [
                ...(Array.isArray(updated.evidence) ? updated.evidence : []),
                `Suggested run memory ${memoryId} drafted for manual review. No automatic trusted memory created.`,
              ].slice(-12),
              nextSafeAction: "Review the suggested run memory before trusting it, or reopen/block the run if evidence is incomplete.",
            });
            updated = memoryRunPayload?.apexOsAutonomyRun || updated;
            syncCockpitLiveRunsFromPayload(memoryRunPayload, updated.id);
            setCockpitRememberedTurnCount((current) => current + 1);
            memoryNotice = " Suggested run memory was drafted for manual review.";
          }
        } catch (memoryError) {
          memoryNotice = memoryError?.status === 409
            ? " Suggested run memory already exists for this run."
            : " Suggested run memory could not be drafted; the result report is still saved.";
        }
      }
      const notice = status === "done"
        ? "Apex reported back and marked the active run done with a result report."
        : status === "waiting-approval"
          ? "Apex moved the active run to waiting approval. Consequential actions remain gated."
          : status === "blocked"
            ? "Apex marked the active run blocked for review."
            : "Apex marked the active run validating with evidence review next.";
      const finalNotice = `${notice}${memoryNotice}`;
      setCockpitLiveRunNotice(finalNotice);
      setCockpitAgentActionNotice(finalNotice);
      setCockpitResponse({
        answer: {
          answer: `${finalNotice} No external send, billing, ad, provider, production, deletion, automatic trusted memory, or irreversible action executed.`,
          sourceLabels: ["Apex Live Operator Mode", "Autonomy Run Center", updated?.sourceLabel || "Active run session"],
        },
      });
      refreshCockpitLivePulse({ automatic: true });
      return updated || null;
    } catch (error) {
      const message = error?.message || "Apex could not update the active live run.";
      setCockpitLiveRunNotice(message);
      setCockpitAgentActionNotice(message);
      return null;
    } finally {
      setCockpitUpdatingRun("");
    }
  }

  async function draftCockpitActiveRunInternalWork() {
    if (!state.canView || !sessionToken || !cockpitActiveRun?.id || cockpitUpdatingRun) return null;
    setCockpitUpdatingRun(`draft-${cockpitActiveRun.id}`);
    setCockpitLiveRunNotice("Drafting internal work for the active live run.");
    try {
      const payload = await draftApexOsAutonomyRunInternalWork(sessionToken, cockpitActiveRun.id);
      const updated = payload?.apexOsAutonomyRun;
      syncCockpitLiveRunsFromPayload(payload, updated?.id || cockpitActiveRun.id);
      const notice = updated?.linkedExecutionHandoffId
        ? `Internal draft package linked to ${updated.linkedExecutionHandoffId}. Consequential actions stayed gated.`
        : "Internal draft package prepared. Consequential actions stayed gated.";
      setCockpitLiveRunNotice(notice);
      setCockpitAgentActionNotice(notice);
      refreshCockpitLivePulse({ automatic: true });
      return updated || null;
    } catch (error) {
      const message = error?.message || "Apex could not draft internal work for this run.";
      setCockpitLiveRunNotice(message);
      setCockpitAgentActionNotice(message);
      return null;
    } finally {
      setCockpitUpdatingRun("");
    }
  }

  async function continueCockpitActiveRunPrivately() {
    if (!state.canView || !sessionToken || !cockpitActiveRun?.id || cockpitUpdatingRun) return null;
    if (["done", "archived", "blocked"].includes(String(cockpitActiveRun.status || "").toLowerCase())) return null;
    setCockpitUpdatingRun(`private-prep-${cockpitActiveRun.id}`);
    setCockpitLiveRunNotice("Apex is advancing private prep and will stop before approval-gated work.");
    try {
      let workingRun = cockpitActiveRun;
      if (!workingRun.linkedAgentControlRequestId || !workingRun.linkedExecutionHandoffId) {
        const draftPayload = await draftApexOsAutonomyRunInternalWork(sessionToken, workingRun.id);
        workingRun = draftPayload?.apexOsAutonomyRun || workingRun;
        syncCockpitLiveRunsFromPayload(draftPayload, workingRun?.id || cockpitActiveRun.id);
      }

      const advancedRun = advanceApexOsAutonomyRunPrivatePrep(workingRun, {
        now: new Date().toISOString(),
        operatorNote: "Apex auto-advanced private-only prep from the body screen and stopped before approval-gated work.",
      });
      const payload = await updateApexOsAutonomyRun(sessionToken, workingRun.id, {
        status: advancedRun.status,
        operatorNote: advancedRun.operatorNote,
        steps: advancedRun.steps,
        evidence: advancedRun.evidence,
        nextSafeAction: advancedRun.nextSafeAction,
      });
      const updated = payload?.apexOsAutonomyRun;
      syncCockpitLiveRunsFromPayload(payload, updated?.id || workingRun.id);
      const notice = "Apex advanced private prep to validation-ready and stopped before approval-gated work.";
      setCockpitLiveRunNotice(notice);
      setCockpitAgentActionNotice(notice);
      setCockpitResponse({
        answer: {
          answer: `${notice} Linked drafts and step evidence were updated. No external send, billing, ad, provider, production, deletion, queue, run, deploy, rollback, or irreversible action executed.`,
          sourceLabels: ["Apex Live Operator Mode", "Autonomy Run Center", updated?.sourceLabel || "Private prep autopilot"],
        },
      });
      refreshCockpitLivePulse({ automatic: true });
      return updated || null;
    } catch (error) {
      const message = error?.message || "Apex could not advance private prep for this run.";
      setCockpitLiveRunNotice(message);
      setCockpitAgentActionNotice(message);
      return null;
    } finally {
      setCockpitUpdatingRun("");
    }
  }

  async function proofCheckCockpitActiveRunPrivately() {
    if (!state.canView || !sessionToken || !cockpitActiveRun?.id || cockpitUpdatingRun) return null;
    if (["done", "archived", "blocked"].includes(String(cockpitActiveRun.status || "").toLowerCase())) return null;
    setCockpitUpdatingRun(`proof-${cockpitActiveRun.id}`);
    setCockpitLiveRunNotice("Apex is proof-checking the private run and will stop at manual review.");
    try {
      let workingRun = cockpitActiveRun;
      if (!workingRun.linkedAgentControlRequestId || !workingRun.linkedExecutionHandoffId) {
        const draftPayload = await draftApexOsAutonomyRunInternalWork(sessionToken, workingRun.id);
        workingRun = draftPayload?.apexOsAutonomyRun || workingRun;
        syncCockpitLiveRunsFromPayload(draftPayload, workingRun?.id || cockpitActiveRun.id);
      }

      const preparedRun = advanceApexOsAutonomyRunPrivatePrep(workingRun, {
        now: new Date().toISOString(),
        operatorNote: "Apex prepared this private run for proof checking from the body screen.",
      });
      const proofRun = validateApexOsAutonomyRunPrivateProof(preparedRun, {
        now: new Date().toISOString(),
        operatorNote: "Apex ran a private proof check from the body screen and stopped at the manual review gate.",
      });
      const payload = await updateApexOsAutonomyRun(sessionToken, workingRun.id, {
        status: proofRun.status,
        operatorNote: proofRun.operatorNote,
        steps: proofRun.steps,
        evidence: proofRun.evidence,
        nextSafeAction: proofRun.nextSafeAction,
      });
      const updated = payload?.apexOsAutonomyRun;
      syncCockpitLiveRunsFromPayload(payload, updated?.id || workingRun.id);
      const proofPassed = (updated?.status || proofRun.status) === "waiting-approval";
      const notice = proofPassed
        ? "Apex proof-checked the private run and moved it to manual approval review."
        : "Apex proof-checked the private run and found validation gaps for review.";
      setCockpitLiveRunNotice(notice);
      setCockpitAgentActionNotice(notice);
      setCockpitResponse({
        answer: {
          answer: `${notice} The proof summary is saved on the run evidence. No external send, billing, ad, provider, production, deletion, queue, run, deploy, rollback, or irreversible action executed.`,
          sourceLabels: ["Apex Live Operator Mode", "Autonomy Run Center", updated?.sourceLabel || "Private proof check"],
        },
      });
      refreshCockpitLivePulse({ automatic: true });
      return updated || null;
    } catch (error) {
      const message = error?.message || "Apex could not proof-check this live run.";
      setCockpitLiveRunNotice(message);
      setCockpitAgentActionNotice(message);
      return null;
    } finally {
      setCockpitUpdatingRun("");
    }
  }

  async function cycleCockpitActiveRunPrivately() {
    if (!state.canView || !sessionToken || !cockpitActiveRun?.id || cockpitUpdatingRun) return null;
    if (["done", "archived", "blocked"].includes(String(cockpitActiveRun.status || "").toLowerCase())) return null;
    setCockpitUpdatingRun(`cycle-${cockpitActiveRun.id}`);
    setCockpitLiveRunNotice("Apex is running a private operator cycle and will stop at manual review.");
    try {
      let workingRun = cockpitActiveRun;
      if (!workingRun.linkedAgentControlRequestId || !workingRun.linkedExecutionHandoffId) {
        const draftPayload = await draftApexOsAutonomyRunInternalWork(sessionToken, workingRun.id);
        workingRun = draftPayload?.apexOsAutonomyRun || workingRun;
        syncCockpitLiveRunsFromPayload(draftPayload, workingRun?.id || cockpitActiveRun.id);
      }

      const cycleRun = runApexOsAutonomyRunPrivateOperatorCycle(workingRun, {
        now: new Date().toISOString(),
        operatorNote: "Apex ran a private operator cycle from the body screen and stopped at manual approval/report review.",
      });
      const payload = await updateApexOsAutonomyRun(sessionToken, workingRun.id, {
        status: cycleRun.status,
        operatorNote: cycleRun.operatorNote,
        steps: cycleRun.steps,
        evidence: cycleRun.evidence,
        nextSafeAction: cycleRun.nextSafeAction,
      });
      const updated = payload?.apexOsAutonomyRun;
      syncCockpitLiveRunsFromPayload(payload, updated?.id || workingRun.id);
      const cyclePassed = (updated?.status || cycleRun.status) === "waiting-approval";
      const notice = cyclePassed
        ? "Apex worked the private run through draft, prep, proof, and report-memory readiness, then stopped at manual review."
        : "Apex ran the private operator cycle and found validation gaps for review.";
      setCockpitLiveRunNotice(notice);
      setCockpitAgentActionNotice(notice);
      setCockpitResponse({
        answer: {
          answer: `${notice} No external send, billing, ad, provider, production, deletion, queue, run, deploy, rollback, or irreversible action executed.`,
          sourceLabels: ["Apex Live Operator Mode", "Autonomy Run Center", updated?.sourceLabel || "Private operator cycle"],
        },
      });
      setCockpitTurns((current) => [
        {
          id: `cockpit-cycle-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          question: updated?.title || workingRun.title || "Private operator cycle",
          source: "operator-cycle",
          routeLabel: updated?.routeLabel || workingRun.routeLabel || "Apex",
          status: cyclePassed ? "cycle-waiting-approval" : "cycle-needs-review",
        },
        ...current,
      ].slice(0, 5));
      refreshCockpitLivePulse({ automatic: true });
      return updated || null;
    } catch (error) {
      const message = error?.message || "Apex could not run the private operator cycle.";
      setCockpitLiveRunNotice(message);
      setCockpitAgentActionNotice(message);
      return null;
    } finally {
      setCockpitUpdatingRun("");
    }
  }

  function toggleCockpitAutoDrive() {
    const nextEnabled = !cockpitAutoDriveEnabled;
    const notice = nextEnabled
      ? "Auto Drive is on. I will narrate each safe private step, wait for the handback to finish, and stop at manual review."
      : "Auto Drive is off. I will wait for your next command.";
    setCockpitAutoDriveEnabled(nextEnabled);
    setCockpitAutoDriveNotice(notice);
    setCockpitLiveRunNotice(notice);
    setCockpitAgentActionNotice(notice);
    setCockpitResponse({
      answer: {
        answer: `${notice} Consequential actions stay gated. No sends, billing, provider work, production changes, deploys, rollbacks, agent runs, or irreversible actions.`,
      sourceLabels: ["Apex Live Operator Mode", "Auto Drive voice handback", "Consequential action gates"],
      },
    });
    cockpitLastAutoDriveHandbackAtRef.current = Date.now();
    if (nextEnabled) {
      void speakCockpitAnswer(notice);
    } else if (cockpitSpeakingRef.current || cockpitSpeaking) {
      stopCockpitVoicePlayback(notice);
    }
  }

  async function advanceCockpitActiveRunWithServer({ autoDrive = false } = {}) {
    if (!state.canView || !sessionToken || !cockpitActiveRun?.id || cockpitUpdatingRun || cockpitCreatingLiveRun) return null;
    const runId = cockpitActiveRun.id;
    const busyKey = autoDrive ? `auto-drive-${runId}` : `advance-${runId}`;
    setCockpitUpdatingRun(busyKey);
    const openingNotice = autoDrive
      ? "Apex Auto Drive is advancing the next private safe move from the server-backed run ledger."
      : "Apex is advancing the next private safe move from the server-backed run ledger.";
    setCockpitLiveRunNotice(openingNotice);
    setCockpitAutoDriveNotice(openingNotice);
    try {
      const payload = await advanceApexOsAutonomyRunPrivateMove(sessionToken, runId, {
        sourceLabel: autoDrive ? "Apex Auto Drive" : "Apex Next Private Move",
      });
      const updated = payload?.apexOsAutonomyRun;
      const advance = payload?.privateAdvance || {};
      syncCockpitLiveRunsFromPayload(payload, updated?.id || runId);
      const stopAtReview = Boolean(advance.handbackRequired || !advance.canContinue);
      const notice = stopAtReview
        ? `Apex advanced ${advance.title || "the private run"} and stopped at ${advance.nextTitle || "manual review"}. Consequential actions stayed gated.`
        : `Apex advanced ${advance.title || "the private run"}; next safe move is ${advance.nextTitle || "continue private work"}. Consequential actions stayed gated.`;
      const narration = buildApexCockpitAutoDriveNarration({ advance, updatedRun: updated, autoDrive });
      const reviewHandback = stopAtReview
        ? buildApexOsAutonomyRunHandback(updated, {
          latestAnswer: narration,
          now: new Date().toISOString(),
        })
        : null;
      const spokenHandback = stopAtReview ? buildApexCockpitRunHandbackText(reviewHandback) : narration;
      setCockpitLiveRunNotice(notice);
      setCockpitAgentActionNotice(notice);
      setCockpitAutoDriveNotice(autoDrive && stopAtReview ? "Auto Drive stopped at manual review and gave the full operator handback." : autoDrive ? notice : "Server-backed private advance is ready when Auto Drive is on.");
      if (autoDrive && stopAtReview) {
        setCockpitAutoDriveEnabled(false);
      }
      setCockpitResponse({
        answer: {
          answer: `${spokenHandback} ${notice} No external send, billing, ad, provider, production, deletion, queue, run, deploy, rollback, automatic trusted memory, or irreversible action executed.`,
          sourceLabels: stopAtReview
            ? ["Apex Live Operator Mode", "Server-backed Auto Drive", "Auto Drive operator handback", "Autonomy Run Center", updated?.sourceLabel || "Review gate"]
            : ["Apex Live Operator Mode", "Server-backed Auto Drive", "Auto Drive voice handback", updated?.sourceLabel || "Autonomy Run Center"],
        },
      });
      if (autoDrive) {
        cockpitLastAutoDriveHandbackAtRef.current = Date.now();
      }
      if (autoDrive) {
        void speakCockpitAnswer(spokenHandback);
      }
      setCockpitTurns((current) => [
        {
          id: `cockpit-auto-drive-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          question: updated?.title || cockpitActiveRun.title || "Server-backed private advance",
          source: autoDrive ? "auto-drive" : "next-private-move",
          routeLabel: updated?.routeLabel || cockpitActiveRun.routeLabel || "Apex",
          status: stopAtReview ? "operator-handback" : "private-advanced",
        },
        ...current,
      ].slice(0, 5));
      refreshCockpitLivePulse({ automatic: true });
      return updated || null;
    } catch (error) {
      const message = error?.message || "Apex could not advance the private run from the server.";
      setCockpitLiveRunNotice(message);
      setCockpitAgentActionNotice(message);
      setCockpitAutoDriveNotice(message);
      if (autoDrive) setCockpitAutoDriveEnabled(false);
      return null;
    } finally {
      setCockpitUpdatingRun("");
    }
  }

  async function workCockpitActiveRunNextMove() {
    const move = cockpitNextPrivateMove || {};
    if (!state.canView || !sessionToken || cockpitUpdatingRun || cockpitCreatingLiveRun) return null;

    if (!cockpitActiveRun?.id || move.actionId === "start-private-run") {
      return createCockpitLiveRunFromCommand(askQuestion.trim() || cockpitLastQuestion || cockpitCommandRoute.label, cockpitCommandRoute, { autoCycle: true });
    }

    if (["draft-internal", "private-prep", "proof-check", "private-cycle"].includes(move.actionId)) {
      return advanceCockpitActiveRunWithServer();
    }

    deliverCockpitRunHandback({ speak: true });
    setCockpitLiveRunNotice(`${move.title || "Apex private run"} is at a review gate. Apex spoke the handback and stopped before consequential action.`);
    setCockpitAgentActionNotice("Apex reported the next safe move. Manual approval is still required before any gated work.");
    return cockpitActiveRun;
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
      syncCockpitLiveOperatorMemoryFromPayload(payload);
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

  async function askCockpitQuestion(nextQuestion, {
    fromVoice = false,
    interrupted = false,
    localVoiceReadinessOverride = null,
    voiceTurnId = "",
    voiceTurnStartedAt = 0,
    voiceInputMode = "",
  } = {}) {
    if (fromVoice) cockpitLastVoiceInputModeRef.current = voiceInputMode || cockpitLastVoiceInputModeRef.current || "voice";
    else cockpitLastVoiceInputModeRef.current = "typed";
    const questionStartedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
    const turnId = `cockpit-turn-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const liveTurnId = voiceTurnId || turnId;
    const liveTurnStartedAt = voiceTurnStartedAt || questionStartedAt;
    const liveTurnInputMode = fromVoice ? (voiceInputMode || cockpitLastVoiceInputModeRef.current || "voice") : "typed";
    const markVoiceAnswerTiming = (patch = {}) => {
      if (!liveTurnId) return;
      const now = typeof performance !== "undefined" ? performance.now() : Date.now();
      const answerReadyMs = Math.max(0, Math.round(now - questionStartedAt));
      updateCockpitVoiceTimingReceipt({
        turnId: liveTurnId,
        startedAt: liveTurnStartedAt,
        status: patch.status || "answer-ready",
        inputMode: liveTurnInputMode,
        source: fromVoice ? "voice" : "typed",
        ...patch,
        timingMs: {
          modelTotalMs: answerReadyMs,
          answerReadyMs,
          inputMode: liveTurnInputMode,
          ...(patch.timingMs || {}),
        },
      });
    };
    const previousTurns = cockpitTurns.slice(0, 4);
    const previousQuestion = cockpitLastQuestion;
    const previousAnswerText = cockpitAnswerText;
    const previousRoute = cockpitCommandRoute;
    const route = buildApexCockpitCommandRoute(nextQuestion, {
      previousRoute,
      activeRun: cockpitActiveRun,
      nextPrivateMove: cockpitNextPrivateMove,
    });
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
      let effectiveLocalVoiceReadiness = localVoiceReadinessOverride || cockpitLocalVoiceReadiness;
      if (!localVoiceReadinessOverride && sessionToken && /\b(voice|hear|listen|quiet|sapi|kokoro|piper|voicebox|premium|stt|gpu|mic|microphone)\b/i.test(nextQuestion || "")) {
        try {
          const localVoicePayload = await getApexOsLocalVoiceStatus(sessionToken);
          const nextLocalVoicePayload = localVoicePayload?.localVoice || localVoicePayload || {};
          setCockpitLocalVoiceStatus(nextLocalVoicePayload);
          effectiveLocalVoiceReadiness = buildApexPersonalOsLocalVoiceReadiness({
            loopState: cockpitVoiceMode,
            microphoneSupported: canUseCockpitRecorder,
            microphonePermission: cockpitMicPermissionState,
            recording: cockpitRecording,
            transcribing: cockpitTranscribing,
            thinking: true,
            speaking: false,
            failed: false,
            browserSpeechRecognitionSupported: !conversationFirst && canUseCockpitSpeechRecognition,
            browserSpeechSynthesisSupported: typeof window !== "undefined" && Boolean(window.speechSynthesis) && typeof SpeechSynthesisUtterance !== "undefined",
            browserAudioUnlocked: cockpitAudioReady,
            sttEngines: nextLocalVoicePayload.sttEngines || [],
            ttsEngines: nextLocalVoicePayload.ttsEngines || [],
            lastVoiceTurn: nextLocalVoicePayload.lastVoiceTurn || cockpitLatestLocalVoiceReceipt,
          });
        } catch {
          // Keep the existing page-local voice readiness; typed Apex still answers.
        }
      }
      if (conversationFirst && isApexCockpitMicCalibrationCommand(nextQuestion)) {
        const calibrationSummary = buildApexCockpitMicTestSummary({
          calibration: cockpitMicCalibrationRef.current,
          canUseRecorder: canUseCockpitRecorder,
          canUseNativeVoice: cockpitNativeVoiceReady,
          micPermissionState: cockpitMicPermissionState,
          recording: cockpitRecordingRef.current || cockpitRecording,
        });
        const shouldOpenMicForTest = state.canView
          && Boolean(sessionToken)
          && canUseCockpitRecorder
          && !cockpitRecordingRef.current
          && !cockpitTranscribingRef.current
          && !cockpitSpeakingRef.current
          && !cockpitVoiceOpeningRef.current;
        const resolvedTalkAnswer = shouldOpenMicForTest
          ? `${calibrationSummary} I am opening the mic calibration now. Speak normally for two seconds.`
          : calibrationSummary;
        const resolvedSourceLabels = ["Apex Real Mic Calibration v1", "Always-Open Mic Runtime", "Browser AudioWorklet"];
        setCockpitResponse({
          requestId: turnId,
          answer: {
            answer: resolvedTalkAnswer,
            sourceLabels: resolvedSourceLabels,
            provider: "local-mic-calibration",
            model: "browser-audio-worklet",
            localVoiceReadiness: effectiveLocalVoiceReadiness,
            micCalibration: cockpitMicCalibrationRef.current,
          },
          context: {
            localVoiceReadiness: effectiveLocalVoiceReadiness,
            micCalibration: cockpitMicCalibrationRef.current,
          },
        });
        setCockpitAgentActionNotice("Apex checked the visible local mic calibration path.");
        setCockpitVoiceNotice(shouldOpenMicForTest
          ? "Mic test started. Speak normally while Apex measures frames, peak, and gate."
          : "Mic test readout is visible.");
        setCockpitTurns((current) => current.map((turn) => (turn.id === turnId ? {
          ...turn,
          status: "mic-calibration",
          answerSnippet: apexCockpitMemoryText(resolvedTalkAnswer, 220),
          sourceLabels: resolvedSourceLabels,
          routeDetail: route.detail,
        } : turn)));
        markVoiceAnswerTiming({ source: "mic-calibration", intent: "voice-mic-test" });
        if (shouldOpenMicForTest) setTimeout(() => openCockpitVoiceSession({ automatic: false }), 140);
        return;
      }
      const effectivePersonalOsCore = effectiveLocalVoiceReadiness
        ? buildApexPersonalOsCoreState({ voiceReadiness: effectiveLocalVoiceReadiness })
        : cockpitPersonalOsCore;
      const voiceSelectionAction = /\btry the next male voice\b|\bnext male voice\b/i.test(nextQuestion || "")
        ? "next-male"
        : /\block this voice\b/i.test(nextQuestion || "")
          ? "lock-current"
          : "";
      if (conversationFirst && voiceSelectionAction && sessionToken) {
        const selectionPayload = await updateApexOsLocalVoiceSelection(sessionToken, { action: voiceSelectionAction });
        const nextLocalVoicePayload = selectionPayload?.localVoice || {};
        setCockpitLocalVoiceStatus(nextLocalVoicePayload);
        const selectedVoiceId = selectionPayload?.voiceSelection?.voiceId || nextLocalVoicePayload?.lightweightVoice?.voiceId || "";
        const nextVoiceReadiness = buildApexPersonalOsLocalVoiceReadiness({
          loopState: cockpitVoiceMode,
          microphoneSupported: canUseCockpitRecorder,
          microphonePermission: cockpitMicPermissionState,
          recording: cockpitRecording,
          transcribing: cockpitTranscribing,
          thinking: false,
          speaking: false,
          failed: false,
          browserSpeechRecognitionSupported: !conversationFirst && canUseCockpitSpeechRecognition,
          browserSpeechSynthesisSupported: typeof window !== "undefined" && Boolean(window.speechSynthesis) && typeof SpeechSynthesisUtterance !== "undefined",
          browserAudioUnlocked: cockpitAudioReady,
          sttEngines: nextLocalVoicePayload.sttEngines || [],
          ttsEngines: nextLocalVoicePayload.ttsEngines || [],
          lastVoiceTurn: nextLocalVoicePayload.lastVoiceTurn || cockpitLatestLocalVoiceReceipt,
        });
        const resolvedTalkAnswer = voiceSelectionAction === "next-male"
          ? `I switched the Kokoro ONNX audition voice to ${selectedVoiceId || "the next male voice"}. I’ll use that voice for this local test if Kokoro can generate it here.`
          : `I locked ${selectedVoiceId || "the current Kokoro ONNX voice"} as the daily Apex voice. I only saved provider, model id, voice id, dtype, and processor.`;
        const resolvedSourceLabels = ["Kokoro ONNX TTS v4", "Apex Local Voice"];
        setCockpitResponse({
          requestId: turnId,
          answer: {
            answer: resolvedTalkAnswer,
            sourceLabels: resolvedSourceLabels,
            provider: "local-voice",
            model: nextLocalVoicePayload?.lightweightVoice?.modelId || "onnx-community/Kokoro-82M-v1.0-ONNX",
            localVoiceReadiness: nextVoiceReadiness,
            voiceSelection: selectionPayload?.voiceSelection || null,
          },
          context: {
            localVoiceReadiness: nextVoiceReadiness,
            voiceSelection: selectionPayload?.voiceSelection || null,
          },
        });
        setCockpitAgentActionNotice("Apex updated the safe local Kokoro ONNX voice selection.");
        setCockpitVoiceNotice("Apex updated the local voice selection.");
        setCockpitTurns((current) => current.map((turn) => (turn.id === turnId ? {
          ...turn,
          status: "answered",
          answerSnippet: apexCockpitMemoryText(resolvedTalkAnswer, 220),
          sourceLabels: resolvedSourceLabels,
          routeDetail: route.detail,
        } : turn)));
        markVoiceAnswerTiming({ source: "local-voice-selection" });
        void speakCockpitAnswer(resolvedTalkAnswer, { voiceTurnId: liveTurnId, voiceTurnStartedAt: liveTurnStartedAt, voiceInputMode: liveTurnInputMode });
        return;
      }
      const talkResponse = conversationFirst ? buildApexTalkToApexResponse({
        question: nextQuestion,
        state,
        builderMode: talkToApexContext?.builderMode,
        whatChangedFeed: talkToApexContext?.whatChangedFeed,
        validationReceipts: talkToApexContext?.validationReceipts,
        fixReceipts: talkToApexContext?.fixReceipts,
        undoReceipts: talkToApexContext?.undoReceipts,
        commandEvents: talkToApexContext?.commandEvents,
        buildLoopReceipt: cockpitBuildLoopReceipt,
        selfFixDispatchReceipt: cockpitSelfFixDispatchReceipt,
        localProviderStatus: cockpitLocalProviderStatus,
        localVoiceReadiness: effectiveLocalVoiceReadiness,
        personalOsCore: effectivePersonalOsCore,
        learningMode: cockpitLearningMode,
        lastVoiceTranscript: cockpitLastLocalTranscript,
        lastLocalVoiceReceipt: cockpitLatestLocalVoiceReceipt,
        memoryRows: [
          ...(Array.isArray(state.decisionMemory?.durableEntries) ? state.decisionMemory.durableEntries : []),
          ...(Array.isArray(state.memorySuggestions?.recentApprovedRows) ? state.memorySuggestions.recentApprovedRows : []),
          cockpitLastLearningMemory,
        ].filter(Boolean),
      }) : null;
      const selfFixReadyHandoff = talkResponse?.patchHandoff?.status === "ready-for-build-thread";
      const shouldAutoDispatchSelfFix = talkResponse?.handled
        && route.commandAction === "self-fix-auto-dispatch"
        && talkResponse.autoDispatchEligible === true
        && (talkResponse.intent === "repair-plan" || (["repair-patch", "patch-handoff"].includes(talkResponse.intent) && selfFixReadyHandoff));
      const shouldRunBuildLoop = talkResponse?.handled
        && route.commandAction === "run-autonomous-build-loop"
        && talkResponse.autoBuildLoopEligible === true;
      if (shouldRunBuildLoop) {
        const receipt = await runCockpitBuildLoopFromCommand(nextQuestion, route, { turnId });
        const buildLoopAnswer = receipt?.shortAnswer
          ? `${receipt.shortAnswer} ${receipt.reason ? apexCockpitMemoryText(receipt.reason, 180) : ""}`.trim()
          : talkResponse.answer || "Apex Build Loop recorded the task.";
        setCockpitTurns((current) => current.map((turn) => (turn.id === turnId ? {
          ...turn,
          status: receipt?.outcome || receipt?.status || "build-loop-recorded",
          answerSnippet: apexCockpitMemoryText(buildLoopAnswer, 220),
          sourceLabels: ["Apex Build Loop", receipt?.taskProfile || "controlled-builder"].filter(Boolean),
          routeDetail: route.detail,
        } : turn)));
        markVoiceAnswerTiming({ source: "build-loop", status: receipt?.outcome || receipt?.status || "answer-ready" });
        if (buildLoopAnswer) void speakCockpitAnswer(buildLoopAnswer, { voiceTurnId: liveTurnId, voiceTurnStartedAt: liveTurnStartedAt, voiceInputMode: liveTurnInputMode });
        return;
      }
      if (shouldAutoDispatchSelfFix) {
        const fixRun = await runCockpitBuilderFixFromCommand(nextQuestion, route, {
          turnId,
          selfFixPatchHandoff: talkResponse.patchHandoff || null,
          selfFixAutoDispatch: true,
        });
        const dispatchReceipt = fixRun?.selfFixAutoDispatch || null;
        const dispatchAnswer = dispatchReceipt?.shortAnswer
          || (fixRun?.ok ? "Handled. Result recorded." : "I checked it and recorded what needs attention.");
        setCockpitTurns((current) => current.map((turn) => (turn.id === turnId ? {
          ...turn,
          status: dispatchReceipt?.status || fixRun?.status || "self-fix-finished",
          answerSnippet: apexCockpitMemoryText(dispatchAnswer, 220),
          sourceLabels: ["Apex Self-Fix v2", "Builder Mode", fixRun?.fixId || "controlled-local-fix"].filter(Boolean),
          routeDetail: route.detail,
        } : turn)));
        markVoiceAnswerTiming({ source: "self-fix", status: dispatchReceipt?.status || fixRun?.status || "answer-ready" });
        if (dispatchAnswer) void speakCockpitAnswer(dispatchAnswer, { voiceTurnId: liveTurnId, voiceTurnStartedAt: liveTurnStartedAt, voiceInputMode: liveTurnInputMode });
        return;
      }
      if (talkResponse?.handled && route.commandAction !== "run-builder-fix" && route.commandAction !== "create-builder-task" && route.commandAction !== "open-apex-hq-module" && route.commandAction !== "open-section") {
        if (talkResponse.shouldClearScreen) {
          onPanelCommand?.("", route);
          clearCockpitHomeSurface();
        }
        if (talkResponse.shouldStopListening) {
          cockpitAutoListeningRef.current = false;
          setCockpitAutoListening(false);
          cockpitRecoveringUntilRef.current = 0;
          updateCockpitAlwaysOpenMicStatus({
            state: APEX_ALWAYS_OPEN_MIC_STATE.QUIET,
            speechDetected: false,
            feedbackSuppressionActive: true,
            fallbackReason: "Apex is quiet.",
          });
          if (cockpitRecordingRef.current) pauseCockpitVoiceSession();
        }
        if (talkResponse.shouldStartListening) {
          cockpitAutoListeningRef.current = true;
          setCockpitAutoListening(true);
          updateCockpitAlwaysOpenMicStatus({
            state: APEX_ALWAYS_OPEN_MIC_STATE.STANDBY,
            speechDetected: false,
            feedbackSuppressionActive: false,
            fallbackReason: "",
          });
        }
        let resolvedTalkAnswer = talkResponse.answer || "";
        let resolvedTalkNotice = talkResponse.notice || "Apex answered from the private local home context.";
        let resolvedSourceLabels = talkResponse.sourceLabels || ["Apex Home", "Private local state"];
        let learningMemoryId = "";
        if (talkResponse.intent === "learning-start") {
          setCockpitLearningMode(true);
        }
        if (talkResponse.intent === "learning-stop") {
          setCockpitLearningMode(false);
        }
        if (talkResponse.learningMemoryBlocked) {
          setCockpitLearningMode(true);
        }
        if (talkResponse.learningMemoryDraft) {
          if (!sessionToken) {
            resolvedTalkAnswer = "I caught the durable part, but I cannot save it without the private operator session. The typed answer stays here so you can try again once Apex is connected.";
            resolvedTalkNotice = "Apex could not save learning memory without a session.";
            setCockpitLearningMode(true);
          } else {
            try {
              const memoryPayload = await createApexOsMemory(sessionToken, talkResponse.learningMemoryDraft);
              const createdMemory = memoryPayload?.apexOsMemoryEntry || null;
              if (createdMemory?.id) {
                learningMemoryId = createdMemory.id;
                setCockpitLastLearningMemory(createdMemory);
                setCockpitLearningMode(false);
                syncCockpitLiveOperatorMemoryFromPayload(memoryPayload);
                resolvedTalkAnswer = `I learned it and saved it to private Apex memory: ${createdMemory.title || "Learning memory"}. ${createdMemory.body || ""}`;
                resolvedTalkNotice = "Apex saved a compact private learning memory.";
                resolvedSourceLabels = ["Apex Learning Conversation", "Private Memory", createdMemory.id].filter(Boolean);
              } else {
                setCockpitLearningMode(true);
                resolvedTalkAnswer = "I prepared the learning memory, but the save did not return a created record. I did not claim it was saved.";
                resolvedTalkNotice = "Apex learning memory save did not return a record.";
              }
            } catch (memoryError) {
              setCockpitLearningMode(true);
              resolvedTalkAnswer = memoryError?.message
                ? `I caught it, but I could not save that memory: ${memoryError.message}`
                : "I caught it, but I could not save that memory.";
              resolvedTalkNotice = "Apex could not persist learning memory.";
            }
          }
        }
        const localStatus = findLlamaCppStatusPayload(cockpitLocalProviderStatus || {});
        const localTalkPayload = {
          requestId: turnId,
          answer: {
            answer: resolvedTalkAnswer,
            sourceLabels: resolvedSourceLabels,
            provider: "llama.cpp",
            model: APEX_LOCAL_TALK_MODEL,
            providerFallback: true,
            selfFixPatchHandoff: talkResponse.patchHandoff || null,
            selfFixHandoffReceipt: talkResponse.handoffReceipt || "",
            selfFixAutoDispatch: cockpitSelfFixDispatchReceipt,
            buildLoopReceipt: cockpitBuildLoopReceipt,
            localVoiceReadiness: effectiveLocalVoiceReadiness,
            personalOsRoute: talkResponse.personalOsRoute || null,
            learningMemoryId,
          },
          context: {
            selfFixPatchHandoff: talkResponse.patchHandoff || null,
            selfFixHandoffReceipt: talkResponse.handoffReceipt || "",
            selfFixAutoDispatch: cockpitSelfFixDispatchReceipt,
            buildLoopReceipt: cockpitBuildLoopReceipt,
            localVoiceReadiness: effectiveLocalVoiceReadiness,
            personalOsRoute: talkResponse.personalOsRoute || null,
            learningMode: talkResponse.learningMode,
            learningMemoryId,
            localProviderStatus: {
              provider: "llama.cpp",
              selectedModel: APEX_LOCAL_TALK_MODEL,
              available: Boolean(cockpitLocalProviderStatus) ? localStatus.available !== false : true,
              modelNames: Array.isArray(localStatus.modelNames) ? localStatus.modelNames : [],
              selectedModelAvailable: Array.isArray(localStatus.modelNames)
                ? localStatus.modelNames.some((model) => String(model).toLowerCase() === APEX_LOCAL_TALK_MODEL)
                : Boolean(cockpitLocalProviderStatus) ? localStatus.available !== false : true,
            },
            localFirstProviderPolicy: { decision: "use-local-fallback" },
          },
        };
        setCockpitResponse(localTalkPayload);
        setCockpitAgentActionNotice(resolvedTalkNotice || "");
        setCockpitVoiceNotice(resolvedTalkNotice || "Apex answered from the private local home context.");
        setCockpitTurns((current) => current.map((turn) => (turn.id === turnId ? {
          ...turn,
          status: "answered",
          answerSnippet: apexCockpitMemoryText(resolvedTalkAnswer, 220),
          sourceLabels: resolvedSourceLabels,
          routeDetail: route.detail,
        } : turn)));
        markVoiceAnswerTiming({ source: "talk-to-apex", intent: talkResponse.intent || "" });
        if (resolvedTalkAnswer && !talkResponse.shouldStopListening) {
          void speakCockpitAnswer(resolvedTalkAnswer, { voiceTurnId: liveTurnId, voiceTurnStartedAt: liveTurnStartedAt, voiceInputMode: liveTurnInputMode });
        } else if (talkResponse.shouldStartListening && !cockpitRecordingRef.current && canUseCockpitRecorder) {
          setTimeout(() => openCockpitVoiceSession({ automatic: false }), 80);
        }
        return;
      }
      if (route.commandAction === "open-section" && route.section !== "apex") {
        onChange(route.section);
        setCockpitVoiceNotice(`Opened ${route.label}. Reading context now.`);
      }
      if (route.commandAction === "open-apex-hq-module" && route.moduleId) {
        onPanelCommand?.("apex-hq", route);
        onOpenModule?.(route.moduleId);
        setCockpitVoiceNotice(`Opened ${route.label}. Reading context now.`);
      }
      if (route.commandAction === "show-panel-apex-hq") {
        onPanelCommand?.("apex-hq", route);
        setCockpitVoiceNotice("Apex HQ workspace panel is open.");
      }
      if (route.commandAction === "show-what-changed") {
        setCockpitVoiceNotice("Apex will summarize What Changed in the conversation.");
      }
      if (route.commandAction === "show-patch-panel") {
        setCockpitVoiceNotice("Apex will summarize Patch Preview in the conversation.");
      }
      if (route.commandAction === "show-undo-panel") {
        setCockpitVoiceNotice("Apex will summarize Local Undo in the conversation.");
      }
      if (route.commandAction === "hide-builder-panel") {
        onPanelCommand?.("", route);
        setCockpitVoiceNotice("Builder panel hidden. Apex is back to the conversation-first surface.");
      }
      if (route.commandAction === "clear-apex-panels") {
        onPanelCommand?.("", route);
        clearCockpitHomeSurface();
      }
      const apexConversationContext = buildApexCockpitQuestionEnvelope(nextQuestion, {
        personalityMode: cockpitPersonalityMode,
        route,
        memoryCount,
        liveOperatorMemory,
        turns: previousTurns,
        lastQuestion: previousQuestion,
        lastAnswerText: previousAnswerText,
        lastRoute: previousRoute,
        activeRun: cockpitActiveRun,
        nextPrivateMove: cockpitNextPrivateMove,
        interrupted,
        retryCount: cockpitVoiceRetryCountRef.current,
        retryReason: cockpitVoiceRetryReason,
      });
      const modelRequestStartedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
      const payload = await askApexOs(sessionToken, {
        question: nextQuestion,
        liveConversationContext: apexConversationContext,
        contextScope: "all",
        assistantMode: cockpitPersonalityMode,
        operatorStyle: cockpitPersonalityMode,
        commandRoute: route.id,
        effort: cockpitSelectedEffort === "auto" ? undefined : cockpitSelectedEffort,
      });
      const modelRequestMs = Math.max(0, Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - modelRequestStartedAt));
      const payloadAnswerText = resolveApexCockpitAnswerText(payload);
      const payloadSources = resolveApexCockpitSources(state, payload);
      const payloadAnswer = payload?.answer || {};
      const responseTimingMs = Number(payloadAnswer.responseTimingMs || payloadAnswer.modelProcessor?.responseTimingMs || payload.responseTimingMs || payload.modelProcessor?.responseTimingMs || 0) || 0;
      const payloadBenchmark = payloadAnswer.benchmarkReceipt || payload.benchmarkReceipt || {};
      const payloadQueue = payloadAnswer.queueReceipt || payloadAnswer.modelQueue || payload.queueReceipt || payload.modelQueue || {};
      const payloadLiveTurn = payloadAnswer.latencyProfile?.liveTurn || payload.latencyProfile?.liveTurn || {};
      const modelFirstTokenMs = Number(payloadLiveTurn.modelFirstTokenMs || payloadBenchmark.firstTokenLatencyMs || payloadAnswer.modelProcessor?.firstTokenLatencyMs || payload.modelProcessor?.firstTokenLatencyMs || 0) || 0;
      const modelQueueMs = Number(payloadLiveTurn.modelQueueMs || payloadQueue.queuedMs || 0) || 0;
      markVoiceAnswerTiming({
        source: "ask-apex",
        provider: payloadAnswer.provider || payload.provider || "",
        modelName: payloadAnswer.model || payload.model || "",
        processor: payloadAnswer.processor || payloadAnswer.modelProcessor?.processor || payload.processor || "",
        timingMs: {
          modelQueueMs,
          modelFirstTokenMs,
          modelRequestMs,
          modelTotalMs: responseTimingMs || modelRequestMs,
        },
      });
      setCockpitResponse(payload);
      setCockpitTurns((current) => current.map((turn) => (turn.id === turnId ? {
        ...turn,
        status: "answered",
        answerSnippet: apexCockpitMemoryText(payloadAnswerText, 220),
        sourceLabels: payloadSources,
        routeDetail: route.detail,
      } : turn)));
      if (route.commandAction === "draft-agent-control-request") {
        await createCockpitAgentRequestFromCommand(nextQuestion, route, { turnId });
      }
      let commandSpokenSuffix = "";
      let commandHandledSpeech = false;
      if (route.commandAction === "builder-status") {
        setCockpitAgentActionNotice("Apex routed this to Builder internally. It can refresh build awareness, track private builder tasks, and run fixed local checks without turning Home into a panel wall.");
        setCockpitLiveRunNotice("Builder Mode is ready. Deploy, production, schema/auth/session, deletion, sends, spend, orders, booking, and permission changes stay blocked.");
      }
      if (route.commandAction === "create-builder-task") {
        const run = await createCockpitBuilderTaskFromCommand(nextQuestion, route, { turnId });
        commandSpokenSuffix = run?.id
          ? " I saved that as a private builder task and kept consequential actions gated."
          : " I tried to save that as a private builder task, but it needs review.";
      }
      if (route.commandAction === "run-builder-fix") {
        const fixRun = await runCockpitBuilderFixFromCommand(nextQuestion, route, { turnId });
        commandSpokenSuffix = fixRun?.ok
          ? " I ran the controlled local fix, recorded the receipt, and kept consequential actions gated."
          : fixRun?.status === "blocked"
            ? " I blocked that fix request because it crossed a hard stop."
            : " I scoped the controlled local fix and recorded what still needs attention.";
      }
      if (route.commandAction === "speak-mission-brief") {
        deliverCockpitMissionBrief({ speak: true });
        commandHandledSpeech = true;
      }
      if (route.commandAction === "speak-watch-officer") {
        deliverCockpitWatchOfficer({ speak: true });
        commandHandledSpeech = true;
      }
      if (route.commandAction === "start-live-operator-run") {
        const run = await createCockpitLiveRunFromCommand(nextQuestion, route, { turnId, autoCycle: true });
        commandSpokenSuffix = run?.status === "waiting-approval"
          ? " I started the private run, prepared internal drafts, checked proof, and stopped at manual review."
          : run?.id
            ? " I started the private run and kept external/consequential action gated."
            : " I tried to start the private run, but it needs review.";
      }
      if (route.commandAction === "advance-active-run") {
        const reviewMove = ["operator-review", "review-result", "review-blocker"].includes(String(cockpitNextPrivateMove?.actionId || ""));
        const run = await workCockpitActiveRunNextMove();
        commandHandledSpeech = reviewMove;
        commandSpokenSuffix = run?.id && !reviewMove
          ? " I advanced the active private run through its next safe move and kept consequential action gated."
          : reviewMove
            ? ""
            : " I checked the active private run, but it needs review.";
      }
      if (route.commandAction === "auto-drive-active-run") {
        setCockpitAutoDriveEnabled(true);
        const run = await advanceCockpitActiveRunWithServer({ autoDrive: true });
        commandHandledSpeech = true;
        commandSpokenSuffix = run?.id ? "" : " I tried to Auto Drive the active private run, but it needs review.";
      }
      if (route.commandAction === "proof-active-run") {
        const run = await proofCheckCockpitActiveRunPrivately();
        commandSpokenSuffix = run?.status === "waiting-approval"
          ? " I proof-checked the active private run and stopped at manual review."
          : run?.id
            ? " I proof-checked the active private run and found review items."
            : " I tried to proof-check the active private run, but it needs review.";
      }
      if (route.commandAction === "speak-active-run-handback") {
        deliverCockpitRunHandback({ speak: true });
        commandHandledSpeech = true;
      }
      if (route.commandAction === "speak-closing-report") {
        deliverCockpitClosingReport({ speak: true });
        commandHandledSpeech = true;
      }
      if (route.commandAction === "report-active-run-done") {
        const run = await updateCockpitActiveRunStatus("done", {
          operatorNote: "Operator used a natural Apex command to report this private run done after review.",
        });
        commandSpokenSuffix = run?.id
          ? " I reported the active private run done and drafted suggested run memory for review when available."
          : " I tried to report the active private run done, but it needs review.";
      }
      if (route.commandAction === "block-active-run") {
        const run = await updateCockpitActiveRunStatus("blocked", {
          operatorNote: "Operator used a natural Apex command to block this private run for review.",
        });
        commandSpokenSuffix = run?.id
          ? " I marked the active private run blocked for review."
          : " I tried to block the active private run, but it needs review.";
      }
      if (route.commandAction === "wait-active-run-approval") {
        const run = await updateCockpitActiveRunStatus("waiting-approval", {
          operatorNote: "Operator used a natural Apex command to hold this private run at manual approval review.",
        });
        commandSpokenSuffix = run?.id
          ? " I held the active private run at manual approval review. Consequential actions stay gated."
          : " I tried to hold the active private run at manual review, but it needs review.";
      }
      const nextAnswerText = `${commandHandledSpeech ? "" : payloadAnswerText}${commandSpokenSuffix}`.trim();
      if (!commandHandledSpeech && nextAnswerText) {
        void speakCockpitAnswer(nextAnswerText, { voiceTurnId: liveTurnId, voiceTurnStartedAt: liveTurnStartedAt, voiceInputMode: liveTurnInputMode });
      } else if (!commandHandledSpeech) {
        setCockpitVoiceNotice("Apex returned no speakable answer text.");
      }
    } catch (requestError) {
      const authRequired = isApexCockpitAuthRequiredError(requestError);
      const recoveryMessage = authRequired
        ? apexCockpitLocalVoiceAuthRecoveryText()
        : requestError?.message || "Ask Apex could not answer right now.";
      setCockpitError(recoveryMessage);
      if (authRequired) setCockpitVoiceNotice(recoveryMessage);
      setCockpitTurns((current) => current.map((turn) => (turn.id === turnId ? { ...turn, status: "blocked" } : turn)));
      setCockpitSpeaking(false);
    } finally {
      setCockpitSubmitting(false);
    }
  }

  async function submitCockpitQuestion(event) {
    event.preventDefault();
    if (!canAskCockpit) return;
    primeCockpitAudioOutput();
    await askCockpitQuestion(askQuestion.trim());
  }

  async function handleCockpitVoiceTranscript(transcript, { sourceLabel = "Voice transcript", voiceInputMode = "browser", voiceTurnId = "", voiceTurnStartedAt = 0, localVoiceReadinessOverride = null } = {}) {
    const rawTranscript = String(transcript || "").trim();
    const cleanTranscript = stripApexCockpitDoneTalkingCue(rawTranscript);
    if (!cleanTranscript) {
      if (hasApexCockpitDoneTalkingCue(rawTranscript)) {
        setCockpitVoiceNotice("Apex closed that voice turn. Say the message first, then say done talking.");
        return;
      }
      scheduleCockpitVoiceRetry("Apex could not hear clear words from that turn", { speakPrompt: true });
      return;
    }
    if (!reserveCockpitVoiceTranscript(cleanTranscript)) return;
    cockpitLastVoiceInputModeRef.current = voiceInputMode || "browser";
    const review = buildApexOsVoiceCommandReview(cleanTranscript);
    const nextQuestion = review.askQuestion || cleanTranscript;
    const interrupted = cockpitBargeInterruptedRef.current || cockpitPendingInterruptionRef.current;
    if (cockpitVoiceRetryCountRef.current) setCockpitVoiceRetryReason(`Recovered with ${String(sourceLabel || "voice transcript").toLowerCase()}.`);
    setAskQuestion(nextQuestion);
    setCockpitLastQuestion(cleanTranscript);
    setCockpitBrowserTranscript(cleanTranscript);
    setCockpitVoiceNotice(interrupted ? `${cockpitLastInterruptionLabelRef.current || "Barge-in"} transcript: "${cleanTranscript}"` : `${sourceLabel}: "${cleanTranscript}"`);
    await askCockpitQuestion(nextQuestion, { fromVoice: true, interrupted, voiceInputMode, voiceTurnId, voiceTurnStartedAt, localVoiceReadinessOverride });
    if (interrupted) cockpitPendingInterruptionRef.current = false;
  }

  async function transcribeCockpitVoiceBlob(blob, { alwaysOpenMic = null } = {}) {
    const turnId = `AVT-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const turnStartedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
    cockpitVoiceTurnTimingRef.current = { turnId, startedAt: turnStartedAt };
    const closeMs = Number(alwaysOpenMic?.silenceDurationMs || alwaysOpenMic?.sustainedSilenceMs || APEX_COCKPIT_SILENCE_MS) || APEX_COCKPIT_SILENCE_MS;
    updateCockpitVoiceTimingReceipt({
      turnId,
      startedAt: turnStartedAt,
      status: "closing",
      inputMode: "voice",
      voiceCloseMs: closeMs,
      silenceDurationMs: Number(alwaysOpenMic?.silenceDurationMs || 0) || 0,
      sustainedSilenceMs: Number(alwaysOpenMic?.sustainedSilenceMs || APEX_COCKPIT_SILENCE_MS) || APEX_COCKPIT_SILENCE_MS,
      timingMs: {
        voiceCloseMs: closeMs,
        vadActualSilenceMs: Number(alwaysOpenMic?.silenceDurationMs || 0) || 0,
        sustainedSilenceMs: Number(alwaysOpenMic?.sustainedSilenceMs || APEX_COCKPIT_SILENCE_MS) || APEX_COCKPIT_SILENCE_MS,
      },
    });
    clearCockpitNoVoiceTimer();
    if (!blob?.size) {
      setCockpitLastLocalVoiceReceipt({
        id: `AVR-${turnId}`,
        turnId,
        lastTurnId: turnId,
        status: "failed",
        failureReason: "empty-audio",
        failureLabel: "empty audio",
        audioValid: false,
        readyForTranscription: false,
        totalTurnMs: 0,
        openAiAudioUsed: false,
        cloudAudioAllowed: false,
        audioStored: false,
      });
      scheduleCockpitVoiceRetry("No voice audio was captured from that turn", { speakPrompt: true });
      return;
    }
    if (conversationFirst) {
      if (!sessionToken) {
        scheduleCockpitVoiceRetry("Local STT needs the private operator session; sign in here before using mic voice", { speakPrompt: false, authRequired: true });
        return;
      }
      setCockpitTranscribing(true);
      cockpitTranscribingRef.current = true;
      armCockpitTranscriptionTimeout(turnId);
      setCockpitVoiceNotice("Apex heard audio. Transcribing through local STT only; OpenAI audio is not used.");
      try {
        setCockpitVoiceNotice("Apex heard audio. Converting it to local WAV for STT; OpenAI audio is not used.");
        const conversionStartedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
        const localConversion = await convertVoiceBlobToLocalWav(blob);
        const conversionTimingMs = Math.max(0, Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - conversionStartedAt));
        const localSttBlob = localConversion?.blob || localConversion;
        const conversionMetadata = localConversion?.metadata || {};
        const localSttMimeType = String(localSttBlob?.type || conversionMetadata.convertedMimeType || "").toLowerCase();
        const conversionReady = conversionMetadata.readyForTranscription === true
          && conversionMetadata.wavHeaderValid === true
          && localSttMimeType === "audio/wav";
        if (!conversionReady) {
          clearCockpitTranscriptionTimeout();
          cockpitActiveTranscriptionTurnRef.current = "";
          const failureLabel = conversionMetadata.browserWavConversionFailed
            ? "browser WAV conversion failed"
            : "local WAV was not ready";
          const receipt = {
            id: `AVR-${turnId}`,
            turnId,
            lastTurnId: turnId,
            status: "failed",
            failureReason: conversionMetadata.clientConversionFailureReason || "wav-conversion-failed",
            failureLabel,
            audioValid: false,
            readyForTranscription: false,
            audio: {
              sourceMimeType: blob.type || "",
              sourceByteLength: blob.size || 0,
              convertedMimeType: localSttMimeType || conversionMetadata.convertedMimeType || "",
              convertedByteLength: localSttBlob?.size || conversionMetadata.convertedByteLength || 0,
              browserWavConversionFailed: conversionMetadata.browserWavConversionFailed === true,
              clientConversionFailureReason: conversionMetadata.clientConversionFailureReason || "wav-conversion-failed",
              clientConversionFailureMessage: conversionMetadata.clientConversionFailureMessage || "",
              fallbackMode: conversionMetadata.fallbackMode || "client-wav-required",
            },
            timingMs: {
              captureDurationMs: Number(alwaysOpenMic?.captureDurationMs || conversionMetadata.durationEstimateMs || 0) || 0,
              clientWavConversionMs: conversionTimingMs,
              totalClientTurnMs: Math.max(0, Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - turnStartedAt)),
              totalTurnMs: Math.max(0, Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - turnStartedAt)),
            },
            openAiAudioUsed: false,
            cloudAudioAllowed: false,
            audioStored: false,
          };
          updateCockpitVoiceTimingReceipt({
            ...receipt,
            turnId,
            startedAt: turnStartedAt,
            inputMode: "voice",
          });
          updateCockpitAlwaysOpenMicStatus({
            state: APEX_ALWAYS_OPEN_MIC_STATE.QUIET,
            speechDetected: false,
            feedbackSuppressionActive: false,
            fallbackReason: "Local WAV conversion failed before STT.",
          });
          setCockpitAutoListening(false);
          cockpitAutoListeningRef.current = false;
          setCockpitVoiceNotice("Apex heard audio, but this browser turn could not become local WAV. The visible local voice loop will retry when it is ready.");
          return;
        }
        const dataUrlStartedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
        const audioDataUrl = await blobToDataUrl(localSttBlob);
        const dataUrlCreationMs = Math.max(0, Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - dataUrlStartedAt));
        const micPacket = alwaysOpenMic
          ? buildCockpitAlwaysOpenMicPacket({
            ...alwaysOpenMic,
            state: APEX_ALWAYS_OPEN_MIC_STATE.PROCESSING,
            readyForTranscription: true,
            shouldTranscribe: true,
            speechDetected: true,
            droppedFramesWhileMuted: cockpitDroppedMicFrameCountRef.current,
          })
          : null;
        const clientTimingMs = {
          captureDurationMs: Number(alwaysOpenMic?.captureDurationMs || conversionMetadata.durationEstimateMs || 0) || 0,
          vadSilenceWaitMs: Number(alwaysOpenMic?.sustainedSilenceMs || 0) || 0,
          sustainedSilenceMs: Number(alwaysOpenMic?.sustainedSilenceMs || 0) || 0,
          vadActualSilenceMs: Number(alwaysOpenMic?.silenceDurationMs || 0) || 0,
          silenceDurationMs: Number(alwaysOpenMic?.silenceDurationMs || 0) || 0,
          voiceCloseMs: Number(alwaysOpenMic?.silenceDurationMs || alwaysOpenMic?.sustainedSilenceMs || APEX_COCKPIT_SILENCE_MS) || APEX_COCKPIT_SILENCE_MS,
          clientWavConversionMs: conversionTimingMs,
          dataUrlCreationMs,
          uploadRequestMs: 0,
          recorderSliceMs: APEX_COCKPIT_RECORDER_SLICE_MS,
        };
        const requestStartedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
        const payload = await transcribeApexOsLocalVoice(sessionToken, {
          turnId,
          audioDataUrl,
          audioTurn: {
            turnId,
            sourceMimeType: blob.type || "",
            sourceByteLength: blob.size || 0,
            convertedMimeType: localSttBlob?.type || conversionMetadata.convertedMimeType || "audio/wav",
            convertedByteLength: localSttBlob?.size || conversionMetadata.convertedByteLength || 0,
            wavHeaderValid: conversionMetadata.wavHeaderValid === true,
            durationEstimateMs: conversionMetadata.durationEstimateMs || 0,
            sampleRate: conversionMetadata.sampleRate || 16000,
            channelCount: conversionMetadata.channelCount || 1,
            bitDepth: conversionMetadata.bitDepth || 16,
            targetSampleRate: 16000,
            targetChannelCount: 1,
            targetBitDepth: 16,
            readyForTranscription: true,
            browserWavConversionFailed: conversionMetadata.browserWavConversionFailed === true,
            clientConversionFailureReason: conversionMetadata.clientConversionFailureReason || "",
            clientConversionFailureMessage: conversionMetadata.clientConversionFailureMessage || "",
            fallbackMode: conversionMetadata.fallbackMode || "",
            alwaysOpenMicState: micPacket?.state || alwaysOpenMic?.state || "",
            clientTimingMs,
          },
          ...(micPacket ? { alwaysOpenMic: micPacket } : {}),
        });
        if (cockpitActiveTranscriptionTurnRef.current !== turnId) return;
        clearCockpitTranscriptionTimeout();
        cockpitActiveTranscriptionTurnRef.current = "";
        const uploadRequestMs = Math.max(0, Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - requestStartedAt));
        const localVoiceReceipt = payload?.audioTurnReceipt || payload?.lastVoiceTurn || payload?.receipt || payload?.alwaysOpenMic || null;
        if (localVoiceReceipt) {
          const totalClientTurnMs = Math.max(0, Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - turnStartedAt));
          updateCockpitVoiceTimingReceipt({
            ...localVoiceReceipt,
            turnId,
            lastTurnId: turnId,
            startedAt: turnStartedAt,
            inputMode: "voice",
            status: localVoiceReceipt.status || "transcribed",
            timingMs: {
              ...(localVoiceReceipt.timingMs || {}),
              uploadRequestMs,
              totalClientTurnMs,
              totalTurnMs: totalClientTurnMs,
            },
            totalTurnMs: totalClientTurnMs,
          });
        }
        if (payload?.alwaysOpenMic) {
          updateCockpitAlwaysOpenMicStatus({
            ...payload.alwaysOpenMic,
            state: APEX_ALWAYS_OPEN_MIC_STATE.PROCESSING,
          });
        }
        let localVoiceReadinessOverride = null;
        if (payload?.localVoiceStatus) {
          setCockpitLocalVoiceStatus(payload.localVoiceStatus);
          const localVoicePayload = payload.localVoiceStatus?.localVoice || payload.localVoiceStatus || {};
          localVoiceReadinessOverride = buildApexPersonalOsLocalVoiceReadiness({
            loopState: "idle",
            microphoneSupported: canUseCockpitRecorder,
            microphonePermission: cockpitMicPermissionState,
            recording: false,
            transcribing: false,
            thinking: false,
            speaking: false,
            failed: false,
            browserSpeechRecognitionSupported: !conversationFirst && canUseCockpitSpeechRecognition,
            browserSpeechSynthesisSupported: typeof window !== "undefined" && Boolean(window.speechSynthesis) && typeof SpeechSynthesisUtterance !== "undefined",
            browserAudioUnlocked: cockpitAudioReady,
            sttEngines: localVoicePayload.sttEngines || [],
            ttsEngines: localVoicePayload.ttsEngines || [],
            lastVoiceTurn: payload?.lastVoiceTurn || localVoiceReceipt,
          });
        }
        const transcript = String(payload?.transcript || "").trim();
        if (!stripApexCockpitDoneTalkingCue(transcript)) {
          if (payload?.gated) {
            setCockpitVoiceNotice(payload.error || "Apex muted that local audio before STT.");
            return;
          }
          if (hasApexCockpitDoneTalkingCue(transcript)) {
            setCockpitVoiceNotice("Apex closed that voice turn. Say the message first, then say done talking.");
            return;
          }
          const failureLabel = payload?.audioTurnReceipt?.failureLabel || payload?.receipt?.failureLabel || payload?.failureReason || "STT failed";
          scheduleCockpitVoiceRetry(`Audio turn failed: ${failureLabel}. OpenAI transcription was not used.`, { speakPrompt: true });
          return;
        }
        if (cockpitVoiceRetryCountRef.current) setCockpitVoiceRetryReason("Recovered with local STT.");
        setCockpitLastLocalTranscript(stripApexCockpitDoneTalkingCue(transcript));
        await handleCockpitVoiceTranscript(transcript, {
          sourceLabel: "Browser mic -> amplitude gate -> GPU STT",
          voiceInputMode: "browser",
          voiceTurnId: turnId,
          voiceTurnStartedAt: turnStartedAt,
          localVoiceReadinessOverride,
        });
      } catch (error) {
        if (cockpitActiveTranscriptionTurnRef.current !== turnId) return;
        clearCockpitTranscriptionTimeout();
        cockpitActiveTranscriptionTurnRef.current = "";
        if (error?.payload?.localVoiceStatus) setCockpitLocalVoiceStatus(error.payload.localVoiceStatus);
        const localVoiceReceipt = error.payload?.audioTurnReceipt || error.payload?.lastVoiceTurn || error.payload?.receipt || error.payload?.alwaysOpenMic || null;
        if (localVoiceReceipt) {
          updateCockpitVoiceTimingReceipt({
            ...localVoiceReceipt,
            turnId,
            lastTurnId: turnId,
            startedAt: turnStartedAt,
            inputMode: "voice",
            totalTurnMs: Math.max(0, Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - turnStartedAt)),
            timingMs: {
              ...(localVoiceReceipt.timingMs || {}),
              totalTurnMs: Math.max(0, Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - turnStartedAt)),
            },
          });
        }
        if (error?.payload?.gated) {
          setCockpitVoiceNotice(error.payload.error || "Apex muted that local audio before STT.");
          return;
        }
        const authRequired = isApexCockpitAuthRequiredError(error);
        const missing = authRequired
          ? apexCockpitLocalVoiceAuthRecoveryText()
          : error?.payload?.receipt?.failureLabel
          || error?.payload?.failureReason
          || error?.payload?.error
          || error?.message
          || "Local STT is not configured yet.";
        scheduleCockpitVoiceRetry(`${missing}. OpenAI transcription was not used.`, { speakPrompt: true, authRequired });
      } finally {
        if (cockpitActiveTranscriptionTurnRef.current === turnId) {
          clearCockpitTranscriptionTimeout();
          cockpitActiveTranscriptionTurnRef.current = "";
        }
        cockpitTranscribingRef.current = false;
        setCockpitTranscribing(false);
      }
      return;
    }
    setCockpitTranscribing(true);
    cockpitTranscribingRef.current = true;
    armCockpitTranscriptionTimeout(turnId);
    setCockpitVoiceNotice("Apex heard audio. Transcribing through the private server endpoint.");
    try {
      const audioDataUrl = await blobToDataUrl(blob);
      const payload = await transcribeApexOsVoice(sessionToken, { audioDataUrl });
      if (cockpitActiveTranscriptionTurnRef.current !== turnId) return;
      clearCockpitTranscriptionTimeout();
      cockpitActiveTranscriptionTurnRef.current = "";
      const transcript = String(payload?.transcript || "").trim();
      if (!stripApexCockpitDoneTalkingCue(transcript)) {
        if (hasApexCockpitDoneTalkingCue(transcript)) {
          setCockpitVoiceNotice("Apex closed that voice turn. Say the message first, then say done talking.");
          return;
        }
        scheduleCockpitVoiceRetry("Apex heard audio but could not turn it into clear words", { speakPrompt: true });
        return;
      }
      if (cockpitVoiceRetryCountRef.current) setCockpitVoiceRetryReason("Recovered with private server transcription.");
      await handleCockpitVoiceTranscript(transcript, {
        sourceLabel: "Private server voice transcript",
        voiceInputMode: "browser",
        voiceTurnId: turnId,
        voiceTurnStartedAt: turnStartedAt,
      });
    } catch (error) {
      if (cockpitActiveTranscriptionTurnRef.current !== turnId) return;
      clearCockpitTranscriptionTimeout();
      cockpitActiveTranscriptionTurnRef.current = "";
      const retryReason = /not configured|speech-to-text|provider|transcription/i.test(String(error?.message || ""))
        ? "Private transcription is limited; Apex will retry with browser captions when this browser allows it"
        : "Apex could not transcribe that audio turn";
      scheduleCockpitVoiceRetry(retryReason, { speakPrompt: true });
    } finally {
      if (cockpitActiveTranscriptionTurnRef.current === turnId) {
        clearCockpitTranscriptionTimeout();
        cockpitActiveTranscriptionTurnRef.current = "";
      }
      cockpitTranscribingRef.current = false;
      setCockpitTranscribing(false);
    }
  }

  async function openCockpitNativeVoiceTurn({ automatic = false, handoff = false, captureId = "" } = {}) {
    const turnId = `ANVT-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const turnStartedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
    cockpitVoiceTurnTimingRef.current = { turnId, startedAt: turnStartedAt };
    cockpitActiveTranscriptionTurnRef.current = turnId;
    clearCockpitNoVoiceTimer();
    clearCockpitTranscriptionTimeout();
    setCockpitTranscribing(true);
    cockpitTranscribingRef.current = true;
    setCockpitRecording(false);
    cockpitRecordingRef.current = false;
    if (cockpitConversationMode) {
      setCockpitAutoListening(true);
      cockpitAutoListeningRef.current = true;
    } else {
      setCockpitAutoListening(false);
      cockpitAutoListeningRef.current = false;
    }
    setCockpitError("");
    resetCockpitBrowserCaptionTurn();
    updateCockpitAlwaysOpenMicStatus({
      state: APEX_ALWAYS_OPEN_MIC_STATE.PROCESSING,
      speechDetected: false,
      feedbackSuppressionActive: false,
      ingressProvider: cockpitNativeVoiceProvider,
      vadProvider: "native-windows-wav-gpu-stt",
      fallbackReason: "",
    });
    setCockpitMicCalibration(createApexCockpitMicCalibrationState({
      status: "native-listening",
      inputProvider: "native-windows",
      captureProvider: cockpitNativeVoiceProvider,
      audioWorkletSupported: false,
      audioWorkletActive: false,
      fallbackCaptureUsed: false,
      micDeviceLabel: "Windows default microphone",
      startedAtMs: turnStartedAt,
      reason: "Apex is listening through Native Voice Runtime v1, not browser audio blob conversion.",
    }));
    setCockpitVoiceNotice(automatic || handoff
      ? "Apex is listening through the native Windows mic and local GPU STT."
      : "Listening through native Windows mic to local GPU STT. Browser audio conversion is bypassed for this turn.");

    try {
      const payload = await listenApexOsNativeVoice(sessionToken, {
        listenSeconds: Math.max(APEX_COCKPIT_NATIVE_LISTEN_SECONDS, Number(cockpitNativeVoiceStatus.listenSeconds || 0) || 0),
        timeoutMs: Math.max(APEX_COCKPIT_NATIVE_TIMEOUT_MS, Number(cockpitNativeVoiceStatus.timeoutMs || 0) || 0),
        provider: cockpitNativeVoiceProvider,
        captureId,
      });
      if (cockpitActiveTranscriptionTurnRef.current !== turnId) return true;
      clearCockpitTranscriptionTimeout();
      cockpitActiveTranscriptionTurnRef.current = "";
      if (payload?.nativeVoice) {
        setCockpitLocalVoiceStatus((current) => ({
          ...(current || {}),
          nativeVoice: payload.nativeVoice,
          nativeInputAvailable: Boolean(payload.nativeVoice.available),
          preferredInputMode: payload.nativeVoice.available ? payload.nativeVoice.selectedInputMode : "browser-audio-worklet-wav",
        }));
      }
      if (payload?.receipt) {
        const totalTurnMs = Math.max(0, Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - turnStartedAt));
        setCockpitLastLocalVoiceReceipt((current) => mergeApexCockpitVoiceReceipt(current || payload.receipt, {
          ...payload.receipt,
          turnId,
          lastTurnId: turnId,
          status: payload.receipt.status || (payload.ok ? "transcribed" : "failed"),
          timingMs: {
            ...(payload.receipt.timingMs || {}),
            nativeListenMs: payload.receipt.nativeListenMs || totalTurnMs,
            totalTurnMs,
          },
          totalTurnMs,
        }));
      }
      const transcript = String(payload?.transcript || "").trim();
      if (!payload?.ok || !transcript) {
        const reason = payload?.error || "Native mic heard no clear words.";
        updateCockpitAlwaysOpenMicStatus({
          state: APEX_ALWAYS_OPEN_MIC_STATE.QUIET,
          speechDetected: false,
          feedbackSuppressionActive: false,
          ingressProvider: cockpitNativeVoiceProvider,
          fallbackReason: reason,
        });
        setCockpitVoiceNotice(`${reason} Native voice stopped cleanly; no browser audio was sent to STT.`);
        return true;
      }
      updateCockpitAlwaysOpenMicStatus({
        state: APEX_ALWAYS_OPEN_MIC_STATE.PROCESSING,
        speechDetected: true,
        feedbackSuppressionActive: false,
        ingressProvider: cockpitNativeVoiceProvider,
      });
      if (cockpitVoiceRetryCountRef.current) setCockpitVoiceRetryReason("Recovered with native Windows mic.");
      setCockpitLastLocalTranscript(transcript);
      setCockpitVoiceNotice(`Heard locally through native Windows mic -> GPU STT: "${transcript}"`);
      await handleCockpitVoiceTranscript(transcript, {
        sourceLabel: "Native Windows mic -> GPU STT",
        voiceInputMode: "native",
        voiceTurnId: turnId,
        voiceTurnStartedAt: turnStartedAt,
      });
      return true;
    } catch (error) {
      if (cockpitActiveTranscriptionTurnRef.current !== turnId) return true;
      clearCockpitTranscriptionTimeout();
      cockpitActiveTranscriptionTurnRef.current = "";
      const nativeVoicePayload = error?.payload?.nativeVoice || null;
      const nativeStillAvailable = Boolean(nativeVoicePayload?.available || nativeVoicePayload?.canListenNatively || (!nativeVoicePayload && cockpitNativeVoiceReady));
      if (error?.payload?.nativeVoice) {
        setCockpitLocalVoiceStatus((current) => ({
          ...(current || {}),
          nativeVoice: error.payload.nativeVoice,
          nativeInputAvailable: nativeStillAvailable,
          preferredInputMode: nativeStillAvailable ? error.payload.nativeVoice.selectedInputMode : "browser-audio-worklet-wav",
        }));
      }
      const reason = error?.payload?.error || error?.message || "Native Voice Runtime could not listen on this turn.";
      updateCockpitAlwaysOpenMicStatus({
        state: APEX_ALWAYS_OPEN_MIC_STATE.QUIET,
        speechDetected: false,
        feedbackSuppressionActive: false,
        ingressProvider: cockpitNativeVoiceProvider,
        fallbackReason: reason,
      });
      setCockpitAutoListening(false);
      cockpitAutoListeningRef.current = false;
      setCockpitVoiceNotice(`${reason} Native voice stopped cleanly; browser mic fallback is still available.`);
      return true;
    } finally {
      if (cockpitActiveTranscriptionTurnRef.current === turnId) {
        clearCockpitTranscriptionTimeout();
        cockpitActiveTranscriptionTurnRef.current = "";
      }
      cockpitTranscribingRef.current = false;
      setCockpitTranscribing(false);
    }
  }

  async function openCockpitVoiceSession({ automatic = false, handoff = false } = {}) {
    clearCockpitResumeListeningTimer();
    if (!handoff) cockpitListeningHandoffPendingRef.current = false;
    if (!canStartCockpitVoice) {
      setCockpitVoiceNotice(canUseCockpitVoiceInput ? "Voice is busy right now." : "No local voice input is ready here.");
      return;
    }
    if (cockpitVoiceOpeningRef.current) return;
    cockpitVoiceOpeningRef.current = true;
    if (!automatic) setCockpitVoiceWakeAttempted(true);
    primeCockpitAudioOutput();
    const captureId = `AVC-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    cockpitCurrentCaptureIdRef.current = captureId;
    resetCockpitBrowserCaptionTurn();
    setCockpitError("");
    setCockpitVoiceNotice(automatic
      ? (handoff ? "Apex finished speaking. Voice is ready for a visible turn." : "Opening one visible voice turn for this Apex page.")
      : cockpitNativeVoiceReady
        ? "Opening patient local voice for this Apex turn."
      : cockpitMicPermissionState === "prompt" || cockpitMicPermissionState === "unknown"
        ? "Chrome may ask for microphone now. Choose Allow for localhost:5173 so Apex can hear you."
        : "");
    try {
      const shouldUseNativeVoice = cockpitNativeVoiceReady;
      if (shouldUseNativeVoice) {
        await openCockpitNativeVoiceTurn({ automatic, handoff, captureId });
        return;
      }
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
      cockpitPcmChunksRef.current = [];
      cockpitPcmSampleRateRef.current = 0;
      cockpitSpeechStartedRef.current = false;
      cockpitBargeInterruptedRef.current = false;
      cockpitDiscardNextCaptureRef.current = false;
      cockpitDroppedMicFrameCountRef.current = 0;
      cockpitLastAlwaysOpenGateRef.current = null;
      cockpitVoiceStartedAtRef.current = 0;
      cockpitLastSoundAtRef.current = 0;
      const audioTrack = stream.getAudioTracks?.()[0] || null;
      const nextMicCalibration = createApexCockpitMicCalibrationState({
        status: "calibrating",
        inputProvider: "browser",
        captureProvider: "media-recorder",
        audioWorkletSupported: false,
        audioWorkletActive: false,
        fallbackCaptureUsed: false,
        micDeviceLabel: audioTrack?.label || "",
        startedAtMs: performance.now(),
        reason: "Apex is opening the local mic calibration path.",
      });
      cockpitMicCalibrationRef.current = nextMicCalibration;
      setCockpitMicCalibration(nextMicCalibration);
      resetCockpitBrowserCaptionTurn();
      updateCockpitAlwaysOpenMicStatus({
        state: APEX_ALWAYS_OPEN_MIC_STATE.STANDBY,
        speechDetected: false,
        feedbackSuppressionActive: false,
        fallbackReason: "",
        droppedFramesWhileMuted: 0,
      });
      const mimeType = preferredCockpitVoiceMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      cockpitRecorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (!event.data?.size) return;
        const runtimeState = resolveCockpitAlwaysOpenMicState();
        const gate = buildApexAlwaysOpenMicTranscriptionGate({
          state: runtimeState,
          isSpeaking: cockpitSpeakingRef.current,
          ttsActive: cockpitSpeakingRef.current,
          playbackExpected: cockpitSpeakingRef.current || runtimeState === APEX_ALWAYS_OPEN_MIC_STATE.RECOVERING,
          ingressProvider: "browser",
          vadProvider: "amplitude-gate",
          sustainedSilenceMs: APEX_COCKPIT_SILENCE_MS,
        });
        if (gate.muted || gate.shouldDropFrame) {
          recordCockpitMutedMicFrame(gate.reason || "Apex voice feedback suppression");
          return;
        }
        cockpitRecordedChunksRef.current.push(event.data);
        if (!cockpitSpeechStartedRef.current && cockpitRecordedChunksRef.current.length > APEX_COCKPIT_PREROLL_CHUNKS) {
          cockpitRecordedChunksRef.current = cockpitRecordedChunksRef.current.slice(-APEX_COCKPIT_PREROLL_CHUNKS);
        }
      };
      recorder.onstop = () => {
        const browserTranscript = currentCockpitBrowserCaptionTranscript();
        const shouldDiscard = cockpitDiscardNextCaptureRef.current || (!cockpitSpeechStartedRef.current && !browserTranscript);
        const pcmWav = buildCockpitPcmWavBlob();
        const blob = pcmWav?.blob || new Blob(cockpitRecordedChunksRef.current, { type: recorder.mimeType || "audio/webm" });
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
        transcribeCockpitVoiceBlob(blob, { alwaysOpenMic: cockpitLastAlwaysOpenGateRef.current });
      };
      recorder.start(APEX_COCKPIT_RECORDER_SLICE_MS);
      startCockpitVoiceLevelMonitor(stream);
      startCockpitSpeechRecognition();
      cockpitRecordingRef.current = true;
      setCockpitRecording(true);
      setCockpitAutoListening(true);
      armCockpitNoVoiceTimer();
      updateCockpitAlwaysOpenMicStatus({
        state: APEX_ALWAYS_OPEN_MIC_STATE.STANDBY,
        speechDetected: false,
        feedbackSuppressionActive: false,
      });
      setCockpitVoiceNotice(handoff ? APEX_COCKPIT_LISTENING_HANDOFF_NOTICE : "Voice is open. Speak normally while I calibrate the mic gate.");
    } catch (error) {
      cleanupCockpitVoiceStream();
      cockpitRecordingRef.current = false;
      setCockpitRecording(false);
      setCockpitAutoListening(false);
      setCockpitMicPermissionState("denied");
      setCockpitError("Microphone access is needed for always-open Apex voice.");
      setCockpitVoiceNotice(resolveApexCockpitMicFailureMessage(error));
    } finally {
      cockpitVoiceOpeningRef.current = false;
    }
  }

  function recoverCockpitVoice() {
    setCockpitRecognitionError("");
    if (cockpitSpeakingRef.current || cockpitSpeaking) {
      interruptCockpitVoicePlayback("manual-button");
    }
    pauseCockpitVoiceSession("Voice recovered to quiet/manual mode.");
  }

  function toggleCockpitConversationMode() {
    const nextConversationMode = !cockpitConversationMode;
    setCockpitConversationMode(nextConversationMode);
    if (!nextConversationMode) {
      setCockpitAutoListening(false);
      cockpitAutoListeningRef.current = false;
      pauseCockpitVoiceSession("Conversation off. Voice is quiet.");
      return;
    }
    setCockpitAutoListening(true);
    cockpitAutoListeningRef.current = true;
    setCockpitVoiceNotice("Conversation on. Apex will keep the visible local listening loop open while this window is active.");
    if (!cockpitRecordingRef.current && !cockpitTranscribingRef.current && !cockpitSpeakingRef.current) {
      setTimeout(() => openCockpitVoiceSession({ automatic: false }), 80);
    }
  }

  function finishCockpitVoiceTurn({ fallbackTranscript = "", alwaysOpenMic = null } = {}) {
    clearCockpitCaptionFinalTurnTimer();
    const cleanFallbackTranscript = String(fallbackTranscript || currentCockpitBrowserCaptionTranscript()).trim();
    const routeCaptionTranscript = () => {
      if (!cleanFallbackTranscript) return false;
      cleanupCockpitVoiceStream();
      cockpitRecorderRef.current = null;
      cockpitRecordingRef.current = false;
      setCockpitRecording(false);
      setCockpitSpeechActive(false);
      setCockpitVoiceNotice("Apex heard the turn. Reading it now.");
      handleCockpitVoiceTranscript(cleanFallbackTranscript, { sourceLabel: "Browser speech captions" });
      return true;
    };
    if (cockpitTranscribingRef.current && !cockpitRecorderRef.current) {
      setCockpitVoiceNotice(cockpitConversationMode ? "Done talking noted. Apex is finishing this local turn." : "Voice turn settled. Apex is quiet until John starts the next turn.");
      return;
    }
    if (!cockpitRecordingRef.current || !cockpitRecorderRef.current) {
      routeCaptionTranscript();
      return;
    }
    if (cockpitRecorderRef.current.state === "inactive") {
      routeCaptionTranscript();
      return;
    }
    if (cleanFallbackTranscript) {
      cockpitBrowserTranscriptRef.current = cleanFallbackTranscript;
      cockpitBrowserTranscriptCaptureIdRef.current = cockpitCurrentCaptureIdRef.current;
      setCockpitBrowserTranscript(cleanFallbackTranscript);
    }
    updateCockpitAlwaysOpenMicStatus({
      state: APEX_ALWAYS_OPEN_MIC_STATE.PROCESSING,
      speechDetected: true,
      feedbackSuppressionActive: false,
    });
    setCockpitVoiceNotice("Apex heard the turn. Reading it now.");
    setCockpitSpeechActive(false);
    if (alwaysOpenMic) cockpitLastAlwaysOpenGateRef.current = alwaysOpenMic;
    cockpitRecorderRef.current.stop();
  }

  function pauseCockpitVoiceSession(notice = "Voice paused.") {
    clearCockpitResumeListeningTimer();
    clearCockpitCaptionFinalTurnTimer();
    clearCockpitNoVoiceTimer();
    clearCockpitTranscriptionTimeout();
    cockpitActiveTranscriptionTurnRef.current = "";
    cockpitListeningHandoffPendingRef.current = false;
    setCockpitAutoListening(false);
    cockpitAutoListeningRef.current = false;
    cockpitRecoveringUntilRef.current = 0;
    updateCockpitAlwaysOpenMicStatus({
      state: APEX_ALWAYS_OPEN_MIC_STATE.QUIET,
      speechDetected: false,
      feedbackSuppressionActive: true,
      fallbackReason: "Voice routing is quiet.",
    });
    setCockpitSpeechActive(false);
    setCockpitMicLevel(0);
    cockpitRecordingRef.current = false;
    cockpitTranscribingRef.current = false;
    cockpitBargeInterruptedRef.current = false;
    cockpitDiscardNextCaptureRef.current = true;
    setCockpitTranscribing(false);
    setCockpitVoiceNotice(notice);
    if (cockpitRecorderRef.current && cockpitRecorderRef.current.state !== "inactive") {
      cockpitRecorderRef.current.stop();
      return;
    }
    cleanupCockpitVoiceStream();
    setCockpitRecording(false);
  }

  const cockpitScreenClassName = `co-apex-cockpit-screen co-apex-cockpit-screen--focus ${conversationFirst ? "co-apex-cockpit-screen--conversation-first" : ""} ${cockpitImmersiveMode ? "co-apex-cockpit-screen--immersive" : "co-apex-cockpit-screen--console"} ${cockpitSpotlightMode ? "co-apex-cockpit-screen--spotlight" : "co-apex-cockpit-screen--full-console"} w-full min-w-0 max-w-full overflow-hidden rounded-xl border border-slate-700/70 bg-slate-950 text-white shadow-[0_34px_80px_-40px_rgba(2,6,23,0.95)] ring-1 ring-cyan-300/10 lg:h-[calc(100vh-16px)]`;

  return (
    <section className={cockpitScreenClassName}>
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

        <div className="co-apex-cockpit-content-shell relative z-10 grid w-full min-w-0 max-w-full content-start gap-2 overflow-hidden p-3 lg:grid-rows-[auto_minmax(0,1fr)_auto] lg:p-4">
          <header className="flex w-full min-w-0 max-w-full flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <h2 className="text-3xl font-black uppercase leading-none tracking-normal text-white">Apex</h2>
              <span className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.08em] text-slate-300"><ApexCockpitStatusDot tone={cockpitVoiceHealth.tone} /> {cockpitVoiceHealth.status}</span>
            </div>
            <div className="flex min-w-0 max-w-full flex-wrap gap-3 text-[11px] font-bold text-slate-300 md:justify-end">
              <span className="inline-flex items-center gap-1"><Icon name="check" className="h-3.5 w-3.5" /> Private Apex</span>
              <span className="inline-flex items-center gap-1"><Icon name="spark" className="h-3.5 w-3.5" /> Local-first</span>
              <span className="hidden h-4 w-px bg-slate-700 md:inline-block" />
              <span>Operator: {cockpitOperatorName}</span>
              <span className="hidden h-4 w-px bg-slate-700 md:inline-block" />
              <span>Company: Apex HQ</span>
              <span>{cockpitClock}</span>
            </div>
          </header>

          <div className="co-apex-cockpit-mobile-section-nav w-full min-w-0 max-w-full overflow-hidden lg:hidden">
            <ApexControlRoomSectionNav activeSection={activeSection} onChange={onChange} variant="dark" />
          </div>

          <section className="co-apex-cockpit-focus-bar relative z-30 hidden min-w-0 gap-2 rounded-lg border border-cyan-200/12 bg-slate-950/74 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] xl:grid xl:grid-cols-[auto_minmax(0,1fr)]" aria-label="Apex focus controls">
            <div className="flex min-w-0 items-center gap-2">
              <ApexCockpitControlButton
                className="shrink-0 px-3"
                onClick={cockpitRecording || cockpitTranscribing ? () => pauseCockpitVoiceSession() : cockpitSpeaking ? () => interruptCockpitVoicePlayback("manual-button") : () => openCockpitVoiceSession({ automatic: false })}
                disabled={cockpitSpeaking ? false : !canToggleCockpitVoice}
                active={cockpitRecording || cockpitSpeaking}
                title={cockpitRecording ? "Pause Apex voice" : "Resume Apex voice"}
              >
                <Icon name="phone" /> {cockpitWakeButtonLabel}
              </ApexCockpitControlButton>
              <ApexCockpitControlButton
                className="shrink-0 px-3"
                onClick={() => primeCockpitAudioOutput({ speakCheck: true })}
                disabled={cockpitSpeaking}
                active={cockpitAudioReady}
                title="Play an Apex desktop voice sound check"
              >
                <Icon name="spark" /> Sound Check
              </ApexCockpitControlButton>
              <ApexCockpitControlButton className="px-3" disabled={false} onClick={() => deliverCockpitBriefing({ speak: true })} active={false} title="Speak Apex briefing">
                <Icon name="spark" /> Brief
              </ApexCockpitControlButton>
              <ApexCockpitControlButton
                className="px-3"
                disabled={false}
                onClick={() => setCockpitImmersiveMode((current) => !current)}
                active={cockpitImmersiveMode}
                title={cockpitImmersiveMode ? "Show denser Apex console" : "Return to immersive Apex body"}
              >
                <Icon name="layers" /> {cockpitImmersiveMode ? "Immersive" : "Console"}
              </ApexCockpitControlButton>
              <ApexCockpitControlButton
                className="px-3"
                disabled={false}
                onClick={() => setCockpitSpotlightMode((current) => !current)}
                active={cockpitSpotlightMode}
                title={cockpitSpotlightMode ? "Open full operator console dock" : "Return to Apex spotlight"}
              >
                <Icon name="spark" /> {cockpitSpotlightMode ? "Stage View" : "Full Console"}
              </ApexCockpitControlButton>
              <ApexCockpitControlButton
                className="px-3"
                disabled={false}
                onClick={onOpenAvatarLab}
                active={false}
                title="Open Apex Avatar Lab"
              >
                <Icon name="spark" /> Avatar Lab
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
                      <p className="mt-1 min-w-0 break-words text-[11px] font-bold leading-4 text-slate-500">{cockpitAgentActionNotice || cockpitVoiceNotice || cockpitVoiceHealth.notice}</p>
                    </div>
                    <div className="grid min-w-0 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      <ApexCockpitControlButton disabled={false} onClick={toggleCockpitConversationMode} active={cockpitConversationMode}>{cockpitConversationMode ? "Conversation On" : "Conversation Off"}</ApexCockpitControlButton>
                      <ApexCockpitControlButton disabled={false} onClick={() => setCockpitBargeInEnabled((current) => !current)} active={cockpitBargeInEnabled}>{cockpitBargeInEnabled ? "Barge-in On" : "Barge-in Off"}</ApexCockpitControlButton>
                      <ApexCockpitControlButton onClick={() => primeCockpitAudioOutput({ speakCheck: true })} disabled={cockpitSpeaking} active={cockpitAudioReady}>Sound Check</ApexCockpitControlButton>
                      <ApexCockpitControlButton onClick={() => speakCockpitAnswer()} disabled={!canSpeakCockpitAnswer} active={cockpitSpeaking}>Speak Answer</ApexCockpitControlButton>
                      <ApexCockpitControlButton onClick={() => interruptCockpitVoicePlayback("manual-button")} disabled={!cockpitSpeaking}>Interrupt</ApexCockpitControlButton>
                      <ApexCockpitControlButton onClick={() => recoverCockpitVoice()} disabled={!canUseCockpitVoiceInput && !cockpitSpeaking && !cockpitRecording && !cockpitTranscribing}>Recover Voice</ApexCockpitControlButton>
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
                    <ApexCockpitListItem item={{ label: "Run History", icon: "database" }} value={trustedRunMemoryCount || "Review"} tone={trustedRunMemoryCount ? "green" : pendingRunMemoryCount ? "amber" : "slate"} />
                    <ApexCockpitListItem item={{ label: "Trusted Memories", icon: "database" }} value={memoryCount} tone="slate" />
                    <ApexCockpitListItem item={{ label: "Suggested Run", icon: "spark" }} value={pendingRunMemoryCount || 0} tone={pendingRunMemoryCount ? "amber" : "slate"} />
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
                    <p className="text-xs font-black text-slate-100">{cockpitRecording ? "Voice Open" : "Voice Ready"}</p>
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
                  onClick={cockpitRecording || cockpitTranscribing ? () => pauseCockpitVoiceSession() : cockpitSpeaking ? () => interruptCockpitVoicePlayback("manual-button") : () => openCockpitVoiceSession({ automatic: false })}
                  disabled={cockpitSpeaking ? false : !canToggleCockpitVoice}
                  active={cockpitRecording || cockpitSpeaking}
                  title={cockpitRecording ? "Pause Apex voice" : "Resume Apex voice"}
                >
                  {cockpitWakeButtonLabel}
                </ApexCockpitControlButton>
                <div className="mt-2 grid min-w-0 grid-cols-2 gap-1.5">
                  <ApexCockpitControlButton
                    className="px-2"
                    onClick={toggleCockpitConversationMode}
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
                  <ApexCockpitControlButton
                    className="px-2"
                    onClick={() => primeCockpitAudioOutput({ speakCheck: true })}
                    disabled={cockpitSpeaking}
                    active={cockpitAudioReady}
                    title="Play an Apex desktop voice sound check"
                  >
                    Sound Check
                  </ApexCockpitControlButton>
                </div>
                <div className="mt-2 grid min-w-0 gap-1.5 rounded-md border border-cyan-200/10 bg-slate-950/56 p-2" aria-label="Apex voice health and recovery">
                  <div className="flex min-w-0 items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-cyan-300">Voice Health</p>
                      <p className={`mt-0.5 truncate text-[11px] font-black ${cockpitVoiceHealth.tone === "green" ? "text-emerald-300" : cockpitVoiceHealth.tone === "amber" ? "text-orange-300" : cockpitVoiceHealth.tone === "red" ? "text-red-300" : "text-cyan-300"}`}>{cockpitVoiceHealth.status}</p>
                    </div>
                    <ApexCockpitControlButton
                      className="shrink-0 px-2"
                      onClick={() => recoverCockpitVoice()}
                      disabled={!canUseCockpitVoiceInput && !cockpitSpeaking && !cockpitRecording && !cockpitTranscribing}
                      active={cockpitVoiceHealth.status === "Recovering captions"}
                      title="Recover Apex voice health"
                    >
                      Recover Voice
                    </ApexCockpitControlButton>
                  </div>
                  <div className="grid min-w-0 grid-cols-2 gap-1.5">
                    {cockpitVoiceHealth.rows.map((item) => (
                      <div key={item.label} className="min-w-0 rounded-md border border-slate-800 bg-slate-900/58 px-2 py-1.5">
                        <p className="truncate text-[8px] font-black uppercase tracking-[0.08em] text-slate-500">{item.label}</p>
                        <p className={`mt-0.5 truncate text-[10px] font-black ${item.tone === "green" ? "text-emerald-300" : item.tone === "amber" ? "text-orange-300" : item.tone === "red" ? "text-red-300" : "text-slate-300"}`}>{item.value}</p>
                      </div>
                    ))}
                  </div>
                  <p className="min-w-0 break-words text-[10px] font-bold leading-4 text-slate-500">{cockpitVoiceHealth.notice}</p>
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
                    Assistant Mode
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
                <p className="mt-2 text-[11px] font-bold leading-5 text-slate-400" aria-live="polite">{cockpitAgentActionNotice || cockpitVoiceNotice || cockpitRecognitionError || cockpitVoiceHealth.notice}</p>
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
              <div className="co-apex-cockpit-mobile-voice-card grid min-w-0 gap-3 rounded-lg border border-cyan-200/14 bg-slate-950/82 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] xl:hidden">
                <div className="flex min-w-0 items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${cockpitRecording ? "bg-emerald-500/16 text-emerald-200 shadow-[0_0_24px_rgba(16,185,129,0.3)]" : cockpitVoiceMode === "blocked" ? "bg-red-500/12 text-red-300" : "bg-slate-800 text-slate-300"}`}>
                      <Icon name="phone" className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-black text-slate-100">{cockpitRecording ? "Voice Open" : "Voice Ready"}</p>
                      <p className="text-[11px] font-bold text-slate-400">{cockpitVoiceState.label} / {cockpitCaptionStatusLabel}</p>
                    </div>
                  </div>
                  <ApexCockpitControlButton
                    className="shrink-0 px-3"
                    onClick={cockpitRecording || cockpitTranscribing ? () => pauseCockpitVoiceSession() : cockpitSpeaking ? () => interruptCockpitVoicePlayback("manual-button") : () => openCockpitVoiceSession({ automatic: false })}
                    disabled={cockpitSpeaking ? false : !canToggleCockpitVoice}
                    active={cockpitRecording || cockpitSpeaking}
                    title={cockpitRecording ? "Pause Apex voice" : "Resume Apex voice"}
                  >
                    {cockpitRecording ? "Pause" : cockpitSpeaking ? "Interrupt" : cockpitNeedsWake ? "Allow Mic" : "Resume"}
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
              <section className="co-apex-cockpit-primary-voice-control relative z-30 mx-auto grid w-full max-w-2xl min-w-0 gap-2 rounded-lg border border-cyan-200/16 bg-slate-950/72 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center" aria-label="Apex primary voice control">
                <div className="grid min-w-0 grid-cols-[36px_minmax(0,1fr)] items-center gap-2">
                  <span className={`grid h-9 w-9 place-items-center rounded-full ${cockpitRecording ? "bg-emerald-500/16 text-emerald-200 shadow-[0_0_24px_rgba(16,185,129,0.28)]" : cockpitSpeaking ? "bg-orange-500/14 text-orange-200 shadow-[0_0_22px_rgba(249,115,22,0.24)]" : cockpitVoiceMode === "blocked" ? "bg-red-500/12 text-red-200" : "bg-cyan-500/10 text-cyan-200"}`}>
                    <Icon name="phone" className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-black uppercase tracking-[0.1em] text-cyan-200">
                      {cockpitRecording
                        ? "Voice is listening"
                        : cockpitTranscribing
                          ? "Reading your voice"
                          : cockpitSubmitting
                            ? "Thinking"
                            : cockpitSpeaking
                              ? "Speaking"
                              : "Voice ready"}
                    </p>
                    <p className="line-clamp-1 min-w-0 break-words text-[10px] font-bold leading-4 text-slate-400">{cockpitVoiceNotice || cockpitRecognitionError || cockpitVoiceHealth.notice}</p>
                  </div>
                </div>
                <div className="flex min-w-0 flex-wrap items-center gap-1.5 sm:justify-end">
                  <ApexCockpitControlButton
                    className="shrink-0 px-3"
                    onClick={cockpitRecording || cockpitTranscribing ? () => pauseCockpitVoiceSession() : cockpitSpeaking ? () => interruptCockpitVoicePlayback("manual-button") : () => openCockpitVoiceSession({ automatic: false })}
                    disabled={cockpitSpeaking ? false : !canToggleCockpitVoice}
                    active={cockpitRecording || cockpitSpeaking}
                    title={cockpitRecording ? "Pause Apex voice" : cockpitSpeaking ? "Interrupt Apex voice" : "Resume Apex voice"}
                  >
                    <Icon name="phone" /> {cockpitWakeButtonLabel}
                  </ApexCockpitControlButton>
                  <ApexCockpitControlButton
                    className="shrink-0 px-3"
                    onClick={toggleCockpitConversationMode}
                    disabled={false}
                    active={cockpitConversationMode}
                    title={cockpitConversationMode ? "Turn Apex conversation off and force quiet" : "Turn Apex conversation on for one visible voice turn"}
                  >
                    {cockpitConversationMode ? "Conversation On" : "Conversation Off"}
                  </ApexCockpitControlButton>
                  <ApexCockpitControlButton
                    className="shrink-0 px-3"
                    onClick={() => finishCockpitVoiceTurn()}
                    disabled={!cockpitRecording && !cockpitTranscribing && !cockpitBrowserTranscript}
                    active={cockpitRecording || cockpitTranscribing}
                    title="Finish the current Apex voice turn"
                  >
                    <Icon name="check" /> Done Talking
                  </ApexCockpitControlButton>
                  <ApexCockpitControlButton
                    className="shrink-0 px-3"
                    onClick={() => recoverCockpitVoice()}
                    disabled={!canUseCockpitVoiceInput && !cockpitSpeaking && !cockpitRecording && !cockpitTranscribing}
                    active={cockpitVoiceHealth.status === "Recovering captions"}
                    title="Recover Apex voice"
                  >
                    <Icon name="refresh" /> Recover
                  </ApexCockpitControlButton>
                  <ApexCockpitControlButton
                    className="co-apex-cockpit-debug-control shrink-0 px-3"
                    onClick={() => runCockpitTypedLiveLatencyBenchmark()}
                    disabled={!state.canView || !sessionToken || Boolean(cockpitLiveBenchmarkBusy)}
                    active={cockpitLiveBenchmarkBusy === "typed"}
                    title="Run Apex typed live latency benchmark locally"
                  >
                    <Icon name="clock" /> {cockpitLiveBenchmarkBusy === "typed" ? "Typed..." : "Bench Typed"}
                  </ApexCockpitControlButton>
                  <ApexCockpitControlButton
                    className="co-apex-cockpit-debug-control shrink-0 px-3"
                    onClick={() => armCockpitVoiceLiveLatencyBenchmark()}
                    disabled={!state.canView || !sessionToken || Boolean(cockpitLiveBenchmarkBusy) || (!canUseCockpitVoiceInput && !cockpitRecording)}
                    active={cockpitVoiceBenchmarkArmed}
                    title="Arm the next visible voice turn as the Apex latency benchmark"
                  >
                    <Icon name="phone" /> {cockpitVoiceBenchmarkArmed ? "Voice Armed" : "Bench Voice"}
                  </ApexCockpitControlButton>
                </div>
              </section>
              <ApexCockpitStageHud
                voiceMode={cockpitVoiceMode}
                voiceHealth={cockpitVoiceHealth}
                nowState={cockpitNowState}
                activeRun={cockpitActiveRun}
                nextPrivateMove={cockpitNextPrivateMove}
                liveStatus={cockpitVisibleLiveStatus}
                liveTone={cockpitVisibleLiveTone}
                savedRunCount={cockpitVisibleSavedRunCount}
                trustedRunMemoryCount={trustedRunMemoryCount}
                pendingRunMemoryCount={pendingRunMemoryCount}
                releaseHealth={releaseHealth}
                onBrief={() => deliverCockpitBriefing({ speak: true })}
                onWatch={() => deliverCockpitWatchOfficer({ speak: true })}
                onPrimaryRunAction={() => workCockpitActiveRunNextMove()}
                onOpenConsole={() => setCockpitSpotlightMode(false)}
                primaryRunDisabled={Boolean(cockpitUpdatingRun) || cockpitCreatingLiveRun || !state.canView || !sessionToken}
                primaryRunBusy={Boolean(cockpitUpdatingRun) || cockpitCreatingLiveRun}
              />
              <section className="co-apex-cockpit-mobile-dock grid min-w-0 gap-2 rounded-lg border border-cyan-200/14 bg-slate-950/78 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] xl:hidden" aria-label="Apex mobile operator dock">
                <div className="flex min-w-0 items-center justify-between gap-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-cyan-300">Apex Dock</p>
                  <span className="truncate rounded-md border border-orange-300/18 bg-orange-500/10 px-2 py-1 text-[9px] font-black uppercase tracking-[0.08em] text-orange-200">{cockpitConsoleTabs.find((tab) => tab.id === cockpitConsoleTab)?.label || "Live"}</span>
                </div>
                <div className="grid min-w-0 grid-cols-4 gap-1.5">
                  {cockpitConsoleTabs.map((tab) => {
                    const active = cockpitConsoleTab === tab.id;
                    return (
                      <button
                        key={`mobile-${tab.id}`}
                        type="button"
                        onClick={() => setCockpitConsoleTab(tab.id)}
                        className={`co-apex-cockpit-mobile-dock-tab co-focus-ring grid min-h-[3.35rem] min-w-0 place-items-center rounded-md border px-1.5 py-1.5 text-center transition ${active ? "border-orange-400/70 bg-orange-500/14 text-white shadow-[0_0_18px_-13px_rgba(249,115,22,0.95)]" : "border-slate-800 bg-slate-900/58 text-slate-400 hover:border-cyan-300/45 hover:bg-cyan-500/8 hover:text-white"}`}
                        aria-pressed={active}
                        title={`Open ${tab.label} mobile dock lane`}
                      >
                        <Icon name={tab.icon} className={`h-3.5 w-3.5 ${active ? "text-orange-200" : tab.tone === "green" ? "text-emerald-300" : tab.tone === "amber" ? "text-orange-300" : tab.tone === "red" ? "text-red-300" : tab.tone === "blue" ? "text-cyan-300" : "text-slate-400"}`} />
                        <span className="mt-0.5 block max-w-full truncate text-[9px] font-black uppercase tracking-[0.06em]">{tab.label}</span>
                        <span className={`mt-0.5 block max-w-full truncate text-[8px] font-black ${active ? "text-white" : "text-slate-500"}`}>{tab.value}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
              <section className={`co-apex-cockpit-live-console ${cockpitSpotlightMode ? "co-apex-cockpit-live-console--dock" : "co-apex-cockpit-live-console--full"} grid min-w-0 gap-2 rounded-lg border border-cyan-200/14 bg-slate-950/76 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]`} aria-label="Apex live conversation console">
                <div className="co-apex-cockpit-now-shell flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-cyan-300">Apex Now</p>
                    <p className="mt-0.5 min-w-0 break-words text-xs font-black text-slate-100">{cockpitNowState.title}</p>
                    <p className="mt-0.5 min-w-0 break-words text-[11px] font-bold leading-4 text-slate-500">{cockpitNowState.detail}</p>
                    <div className="mt-2 grid min-w-0 gap-1.5 rounded-md border border-emerald-300/16 bg-emerald-400/8 px-2 py-1.5" aria-label="Apex local intelligence status">
                      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                        <span className="shrink-0 rounded-md border border-emerald-300/18 bg-emerald-500/10 px-2 py-1 text-[8px] font-black uppercase tracking-[0.08em] text-emerald-200">Local Intelligence</span>
                        <span className="min-w-0 break-words text-[10px] font-black text-emerald-100">{cockpitLocalIntelligence.providerLabel} / {cockpitLocalIntelligence.selectedModel}</span>
                        <span className={`shrink-0 rounded-md border px-2 py-1 text-[8px] font-black uppercase tracking-[0.08em] ${cockpitLocalIntelligence.effortManualOnly ? "border-cyan-300/16 bg-cyan-500/10 text-cyan-100" : "border-emerald-300/18 bg-emerald-500/10 text-emerald-200"}`} title="Apex picks the local effort automatically for normal turns. Manual reasoning, MoE, coder, or deep lanes must be explicitly requested in the prompt.">{cockpitLocalIntelligence.effortAutoSelected ? (cockpitLocalIntelligence.effortLabel === "Auto" ? "Auto effort" : `Auto picked ${cockpitLocalIntelligence.effortLabel}`) : `Effort ${cockpitLocalIntelligence.effortLabel}`} / ctx {cockpitLocalIntelligence.effortNumCtx} / {cockpitLocalIntelligence.effortModelStatus}</span>
                        <span className="shrink-0 rounded-md border border-cyan-300/16 bg-cyan-500/10 px-2 py-1 text-[8px] font-black uppercase tracking-[0.08em] text-cyan-100">Lane {cockpitLocalIntelligence.agentLaneLabel} / {cockpitLocalIntelligence.agentNumCtx}</span>
                        <span className={`shrink-0 rounded-md border px-2 py-1 text-[8px] font-black uppercase tracking-[0.08em] ${cockpitLocalIntelligence.coderStatusLabel === "Active" || cockpitLocalIntelligence.coderStatusLabel === "Manual-only" ? "border-emerald-300/18 bg-emerald-500/10 text-emerald-200" : cockpitLocalIntelligence.coderStatusLabel === "Missing" ? "border-orange-300/18 bg-orange-500/10 text-orange-200" : "border-cyan-300/14 bg-cyan-500/10 text-cyan-200"}`}>30B {cockpitLocalIntelligence.coderStatusLabel}</span>
                        <span className={`shrink-0 rounded-md border px-2 py-1 text-[8px] font-black uppercase tracking-[0.08em] ${cockpitBuildLoopToneClass}`}>Coding {cockpitBuildLoopStatusLabel}</span>
                        <span className={`shrink-0 rounded-md border px-2 py-1 text-[8px] font-black uppercase tracking-[0.08em] ${cockpitBackgroundRuntimeToneClass}`}>Runtime {cockpitBackgroundRuntimeStatus}</span>
                        <span className={`shrink-0 rounded-md border px-2 py-1 text-[8px] font-black uppercase tracking-[0.08em] ${cockpitLatencyProfile?.status === "slow" ? "border-orange-300/18 bg-orange-500/10 text-orange-200" : cockpitLatencyProfile?.status === "fast" ? "border-emerald-300/18 bg-emerald-500/10 text-emerald-200" : "border-cyan-300/14 bg-cyan-500/10 text-cyan-200"}`}>Latency {cockpitLatencyLabel}</span>
                        <span className="shrink-0 rounded-md border border-emerald-300/18 bg-emerald-500/10 px-2 py-1 text-[8px] font-black uppercase tracking-[0.08em] text-emerald-200">{cockpitLocalIntelligence.rows.find((row) => row.label === "GPU")?.value || "GPU checking"}</span>
                        <span className={`shrink-0 rounded-md border px-2 py-1 text-[8px] font-black uppercase tracking-[0.08em] ${cockpitLocalIntelligence.brainThresholdStatus === "hard-rollback" || cockpitLocalIntelligence.brainThresholdStatus === "reload-needed" ? "border-red-300/20 bg-red-500/10 text-red-200" : cockpitLocalIntelligence.brainThresholdStatus === "soft-threshold" ? "border-orange-300/18 bg-orange-500/10 text-orange-200" : "border-emerald-300/18 bg-emerald-500/10 text-emerald-200"}`}>VRAM {cockpitLocalIntelligence.brainVramLabel}</span>
                        <span className="shrink-0 rounded-md border border-cyan-300/14 bg-cyan-500/10 px-2 py-1 text-[8px] font-black uppercase tracking-[0.08em] text-cyan-200">Cloud disabled</span>
                        <span className={`shrink-0 rounded-md border px-2 py-1 text-[8px] font-black uppercase tracking-[0.08em] ${cockpitBackgroundPayload?.primaryRuntime?.ready || cockpitBackgroundPayload?.keepWarm?.enabled ? "border-emerald-300/18 bg-emerald-500/10 text-emerald-200" : "border-slate-700 bg-slate-950/60 text-slate-300"}`}>Warm {cockpitBackgroundPayload?.primaryRuntime?.ready ? "GPT" : cockpitBackgroundPayload?.keepWarm?.enabled ? "legacy" : "off"}</span>
                        <span className="shrink-0 rounded-md border border-cyan-300/14 bg-cyan-500/10 px-2 py-1 text-[8px] font-black uppercase tracking-[0.08em] text-cyan-200">Bench {cockpitLocalIntelligence.lastBenchmarkLabel}</span>
                        <span className="shrink-0 rounded-md border border-slate-700 bg-slate-950/60 px-2 py-1 text-[8px] font-black uppercase tracking-[0.08em] text-slate-300">OpenAI not used</span>
                      </div>
                      <p className="min-w-0 break-words text-[9px] font-bold leading-4 text-emerald-100">{cockpitLocalIntelligence.summary}</p>
                    </div>
                    <div className="mt-2 grid min-w-0 gap-1.5 sm:grid-cols-2">
                      <div className="grid min-w-0 gap-1 rounded-md border border-cyan-300/14 bg-cyan-400/8 px-2 py-1.5" aria-label="Apex local voice status">
                        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                          <span className="shrink-0 rounded-md border border-cyan-300/18 bg-cyan-500/10 px-2 py-1 text-[8px] font-black uppercase tracking-[0.08em] text-cyan-200">Local Voice</span>
                          <span className={`shrink-0 rounded-md border px-2 py-1 text-[8px] font-black uppercase tracking-[0.08em] ${cockpitLocalVoiceReadiness.tone === "green" ? "border-emerald-300/18 bg-emerald-500/10 text-emerald-200" : cockpitLocalVoiceReadiness.tone === "red" ? "border-red-300/18 bg-red-500/10 text-red-200" : "border-orange-300/18 bg-orange-500/10 text-orange-200"}`}>{cockpitLocalVoiceReadiness.status}</span>
                          <span className="min-w-0 break-words text-[9px] font-black text-cyan-100">{cockpitLocalVoiceReadiness.loopState}</span>
                          <span className={`shrink-0 rounded-md border px-2 py-1 text-[8px] font-black uppercase tracking-[0.08em] ${cockpitNativeVoiceReady ? "border-emerald-300/18 bg-emerald-500/10 text-emerald-200" : "border-slate-700 bg-slate-950/60 text-slate-300"}`}>Input {cockpitNativeVoiceReady ? "Native" : "Browser"} / {cockpitPreferredVoiceInputMode}</span>
                          <span className="shrink-0 rounded-md border border-cyan-300/14 bg-cyan-500/10 px-2 py-1 text-[8px] font-black uppercase tracking-[0.08em] text-cyan-100">STT {cockpitLocalVoiceReadiness.sttEngine || cockpitLocalVoiceReadiness.sttStatus} / {cockpitLocalVoiceReadiness.sttProcessor || "unknown"}</span>
                          <span className={`shrink-0 rounded-md border px-2 py-1 text-[8px] font-black uppercase tracking-[0.08em] ${cockpitLocalVoiceReadiness.usingLightweightVoice && !APEX_COCKPIT_USE_FAST_SIMPLE_VOICE ? "border-emerald-300/18 bg-emerald-500/10 text-emerald-200" : "border-orange-300/18 bg-orange-500/10 text-orange-200"}`}>TTS {cockpitLocalVoiceTtsLabel}</span>
                          <span className={`shrink-0 rounded-md border px-2 py-1 text-[8px] font-black uppercase tracking-[0.08em] ${cockpitMicCalibration.signalDetected ? "border-emerald-300/18 bg-emerald-500/10 text-emerald-200" : cockpitMicCalibration.frameCount ? "border-orange-300/18 bg-orange-500/10 text-orange-200" : "border-slate-700 bg-slate-950/60 text-slate-300"}`}>Mic {cockpitMicCalibration.status || "standby"}</span>
                          <span className="shrink-0 rounded-md border border-slate-700 bg-slate-950/60 px-2 py-1 text-[8px] font-black uppercase tracking-[0.08em] text-slate-300">Capture {cockpitMicCaptureLabel}</span>
                          <span className="shrink-0 rounded-md border border-slate-700 bg-slate-950/60 px-2 py-1 text-[8px] font-black uppercase tracking-[0.08em] text-slate-300">Peak {cockpitMicPeakLabel}</span>
                          <span className="shrink-0 rounded-md border border-slate-700 bg-slate-950/60 px-2 py-1 text-[8px] font-black uppercase tracking-[0.08em] text-slate-300">Gate {cockpitMicGateLabel}</span>
                          <span className="shrink-0 rounded-md border border-emerald-300/18 bg-emerald-500/10 px-2 py-1 text-[8px] font-black uppercase tracking-[0.08em] text-emerald-200">Close {cockpitVoiceTimingSummary.closeLabel}</span>
                          <span className="shrink-0 rounded-md border border-cyan-300/14 bg-cyan-500/10 px-2 py-1 text-[8px] font-black uppercase tracking-[0.08em] text-cyan-100">STT {cockpitVoiceTimingSummary.sttLabel}</span>
                          <span className="shrink-0 rounded-md border border-cyan-300/14 bg-cyan-500/10 px-2 py-1 text-[8px] font-black uppercase tracking-[0.08em] text-cyan-100">Model {cockpitVoiceTimingSummary.modelLabel}</span>
                          <span className="shrink-0 rounded-md border border-cyan-300/14 bg-cyan-500/10 px-2 py-1 text-[8px] font-black uppercase tracking-[0.08em] text-cyan-100">TTS {cockpitVoiceTimingSummary.ttsLabel}</span>
                          <span className="shrink-0 rounded-md border border-cyan-300/14 bg-cyan-500/10 px-2 py-1 text-[8px] font-black uppercase tracking-[0.08em] text-cyan-100">Play {cockpitVoiceTimingSummary.playbackLabel}</span>
                          <span className={`shrink-0 rounded-md border px-2 py-1 text-[8px] font-black uppercase tracking-[0.08em] ${cockpitVoiceTimingSummary.totalTurnMs && cockpitVoiceTimingSummary.totalTurnMs > 4500 ? "border-orange-300/18 bg-orange-500/10 text-orange-200" : "border-slate-700 bg-slate-950/60 text-slate-300"}`}>Turn {cockpitVoiceTimingSummary.turnLabel}</span>
                          <span className="shrink-0 rounded-md border border-slate-700 bg-slate-950/60 px-2 py-1 text-[8px] font-black uppercase tracking-[0.08em] text-slate-300">Slow {cockpitVoiceTimingSummary.slowLabel}</span>
                          <span className="shrink-0 rounded-md border border-cyan-300/14 bg-cyan-500/10 px-2 py-1 text-[8px] font-black uppercase tracking-[0.08em] text-cyan-100">Typed bench {cockpitLiveBenchmarkStatus.typedLabel}</span>
                          <span className={`shrink-0 rounded-md border px-2 py-1 text-[8px] font-black uppercase tracking-[0.08em] ${cockpitVoiceBenchmarkArmed ? "border-orange-300/18 bg-orange-500/10 text-orange-200" : cockpitLiveBenchmarkStatus.voice ? "border-emerald-300/18 bg-emerald-500/10 text-emerald-200" : "border-slate-700 bg-slate-950/60 text-slate-300"}`}>Voice bench {cockpitVoiceBenchmarkArmed ? "armed" : cockpitLiveBenchmarkStatus.voiceLabel}</span>
                          <span className="shrink-0 rounded-md border border-slate-700 bg-slate-950/60 px-2 py-1 text-[8px] font-black uppercase tracking-[0.08em] text-slate-300">Diag {cockpitLiveBenchmarkStatus.diagnosis}</span>
                          {cockpitShouldShowLastVoiceTurn ? (
                            <span className="shrink-0 rounded-md border border-slate-700 bg-slate-950/60 px-2 py-1 text-[8px] font-black uppercase tracking-[0.08em] text-slate-200">Last {cockpitLocalVoiceReadiness.lastTurnStatus}{cockpitLocalVoiceReadiness.lastTurnTotalMs ? ` / ${cockpitLocalVoiceReadiness.lastTurnTotalMs}ms` : ""}</span>
                          ) : null}
                          <span className="shrink-0 rounded-md border border-slate-700 bg-slate-950/60 px-2 py-1 text-[8px] font-black uppercase tracking-[0.08em] text-slate-300">Cloud off</span>
                        </div>
                        <p className="line-clamp-2 min-w-0 break-words text-[9px] font-bold leading-4 text-cyan-100">{cockpitMicCalibrationSummary} Bench: typed {cockpitLiveBenchmarkStatus.typedLabel}; voice {cockpitLiveBenchmarkStatus.voiceBreakdownLabel}; slow {cockpitLiveBenchmarkStatus.slowLabel}.</p>
                      </div>
                      <div className="grid min-w-0 gap-1 rounded-md border border-violet-300/14 bg-violet-400/8 px-2 py-1.5" aria-label="Apex Personal OS skills status">
                        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                          <span className="shrink-0 rounded-md border border-violet-300/18 bg-violet-500/10 px-2 py-1 text-[8px] font-black uppercase tracking-[0.08em] text-violet-100">Skills / Agents</span>
                          <span className="shrink-0 rounded-md border border-emerald-300/18 bg-emerald-500/10 px-2 py-1 text-[8px] font-black uppercase tracking-[0.08em] text-emerald-200">{cockpitPersonalOsCore.availableRouteCount} active</span>
                          <span className="shrink-0 rounded-md border border-slate-700 bg-slate-950/60 px-2 py-1 text-[8px] font-black uppercase tracking-[0.08em] text-slate-300">{cockpitPersonalOsCore.plannedRouteCount} planned</span>
                        </div>
                        <p className="line-clamp-2 min-w-0 break-words text-[9px] font-bold leading-4 text-violet-100">Apex receives the command first, then routes to Builder, Self-Fix, Apex HQ, memory/tasks, local intelligence, or planned agents when appropriate.</p>
                      </div>
                    </div>
                    {(cockpitAnswerText || cockpitError) ? (
                      <div className="mt-2 grid min-w-0 gap-1.5 rounded-md border border-cyan-300/16 bg-cyan-400/8 px-2 py-1.5" aria-label="Apex latest typed answer">
                        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                          <span className="shrink-0 rounded-md border border-cyan-300/18 bg-cyan-500/10 px-2 py-1 text-[8px] font-black uppercase tracking-[0.08em] text-cyan-200">Apex Answer</span>
                          <span className="min-w-0 break-words text-[9px] font-bold leading-4 text-slate-400">{cockpitLastQuestion || "Typed answer"}</span>
                        </div>
                        <p className={`max-h-44 min-w-0 overflow-y-auto break-words pr-1 text-[10px] font-bold leading-4 ${cockpitError ? "text-red-200" : "text-slate-100"}`}>{cockpitError || cockpitAnswerText}</p>
                        {(cockpitVoiceNotice || cockpitRecognitionError) ? (
                          <p className="min-w-0 break-words text-[9px] font-bold leading-4 text-cyan-100">{cockpitVoiceNotice || cockpitRecognitionError}</p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  <div className="co-apex-cockpit-now-actions flex min-w-0 flex-wrap gap-1.5 sm:justify-end">
                    <ToneBadge tone={cockpitNowState.tone}>{cockpitNowState.status}</ToneBadge>
                    <ApexCockpitControlButton className="px-2" disabled={false} onClick={() => deliverCockpitBriefing({ speak: true })} active={false} title="Speak Apex briefing">
                      <Icon name="spark" /> Brief Me
                    </ApexCockpitControlButton>
                    <ApexCockpitControlButton className="px-2" disabled={false} onClick={() => deliverCockpitOperatorJudgment({ speak: true })} active={false} title="Speak Apex operator judgment">
                      <Icon name="check" /> Judgment
                    </ApexCockpitControlButton>
                    <ApexCockpitControlButton className="px-2" disabled={false} onClick={() => deliverCockpitWatchOfficer({ speak: true })} active={false} title="Speak Apex watch officer report">
                      <Icon name="spark" /> Watch
                    </ApexCockpitControlButton>
                    <ApexCockpitControlButton className="px-2" disabled={false} onClick={() => deliverCockpitMissionBrief({ speak: true })} active={false} title="Speak Apex mission brief">
                      <Icon name="layers" /> Mission
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
                <ApexCockpitLocalIntelligencePanel intelligence={cockpitLocalIntelligence} notice={cockpitLocalProviderNotice} />
                <div className="grid min-w-0 gap-2 rounded-md border border-cyan-300/16 bg-cyan-400/8 px-2.5 py-2" aria-label="Apex watch officer">
                  <div className="grid min-w-0 gap-1.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                    <div className="min-w-0">
                      <p className="text-[9px] font-black uppercase tracking-[0.12em] text-cyan-300">Watch Officer</p>
                      <p className="mt-0.5 min-w-0 break-words text-[11px] font-black leading-4 text-slate-100">{cockpitWatchOfficer.title}</p>
                      <p className="mt-0.5 line-clamp-2 min-w-0 break-words text-[9px] font-bold leading-4 text-cyan-100">{cockpitWatchOfficer.detail}</p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-1.5 sm:justify-end">
                      <ToneBadge tone={cockpitWatchOfficer.tone}>{cockpitWatchOfficer.status}</ToneBadge>
                      <ApexCockpitControlButton className="px-2" disabled={false} onClick={() => deliverCockpitWatchOfficer({ speak: true })} active={false} title="Speak Apex watch officer report">
                        <Icon name="phone" /> Speak Watch
                      </ApexCockpitControlButton>
                      <ApexCockpitControlButton className="px-2" disabled={cockpitLivePulseBusy} onClick={() => refreshCockpitLivePulse()} active={cockpitLivePulseBusy} title="Refresh Apex watch officer pulse">
                        <Icon name="refresh" /> {cockpitLivePulseBusy ? "Checking" : "Check Now"}
                      </ApexCockpitControlButton>
                    </div>
                  </div>
                  <div className="hidden min-w-0 gap-1.5">
                    {cockpitWatchOfficer.rows.map((row) => (
                      <div key={row.id} className="min-w-0 rounded-md border border-slate-800 bg-slate-950/46 px-2 py-1.5">
                        <p className="truncate text-[8px] font-black uppercase tracking-[0.08em] text-slate-500">{row.label}</p>
                        <p className={`mt-0.5 truncate text-[10px] font-black ${row.tone === "green" ? "text-emerald-300" : row.tone === "amber" ? "text-orange-300" : row.tone === "red" ? "text-red-300" : row.tone === "blue" ? "text-cyan-300" : "text-slate-300"}`}>{row.value}</p>
                        <p className="mt-0.5 line-clamp-2 min-w-0 break-words text-[8px] font-bold leading-3 text-slate-500">{row.detail}</p>
                      </div>
                    ))}
                  </div>
                  <p className="min-w-0 break-words rounded-md border border-orange-300/12 bg-slate-950/44 px-2 py-1.5 text-[9px] font-bold leading-4 text-orange-100">
                    Consequential actions gated: no sends, billing, provider work, production changes, deploys, rollbacks, agent runs, or irreversible actions.
                  </p>
                  <div className="grid min-w-0 gap-1.5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                    <p className="min-w-0 break-words rounded-md border border-cyan-200/10 bg-slate-950/44 px-2 py-1.5 text-[9px] font-bold leading-4 text-cyan-100">{cockpitWatchOfficer.whyItMatters}</p>
                    <p className="min-w-0 break-words rounded-md border border-orange-300/12 bg-orange-500/8 px-2 py-1.5 text-[9px] font-bold leading-4 text-orange-100">{cockpitWatchOfficer.nextAction}</p>
                  </div>
                </div>
                <div className="grid min-w-0 gap-2 rounded-md border border-orange-300/16 bg-orange-500/8 px-2.5 py-2" aria-label="Apex mission brief">
                  <div className="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-[9px] font-black uppercase tracking-[0.12em] text-orange-300">Mission Brief</p>
                      <p className="mt-0.5 min-w-0 break-words text-[11px] font-black leading-4 text-slate-100">{cockpitMissionBrief.title}</p>
                      <p className="mt-0.5 line-clamp-2 min-w-0 break-words text-[9px] font-bold leading-4 text-orange-100">{cockpitMissionBrief.summary}</p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-1.5 sm:justify-end">
                      <ToneBadge tone={cockpitMissionBrief.tone}>{cockpitMissionBrief.status}</ToneBadge>
                      <ApexCockpitControlButton className="px-2" disabled={false} onClick={() => deliverCockpitMissionBrief({ speak: true })} active={false} title="Speak the current Apex mission brief">
                        <Icon name="phone" /> Speak
                      </ApexCockpitControlButton>
                    </div>
                  </div>
                  <div className="grid min-w-0 gap-1.5 sm:grid-cols-5">
                    {cockpitMissionBrief.rows.map((row) => (
                      <div key={row.id} className="min-w-0 rounded-md border border-slate-800 bg-slate-950/46 px-2 py-1.5">
                        <p className="truncate text-[8px] font-black uppercase tracking-[0.08em] text-slate-500">{row.label}</p>
                        <p className={`mt-0.5 truncate text-[10px] font-black ${row.tone === "green" ? "text-emerald-300" : row.tone === "amber" ? "text-orange-300" : row.tone === "red" ? "text-red-300" : row.tone === "slate" ? "text-slate-300" : "text-cyan-300"}`}>{row.value}</p>
                        <p className="mt-0.5 line-clamp-2 min-w-0 break-words text-[8px] font-bold leading-3 text-slate-500">{row.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
                {cockpitActiveRun?.id ? (
                  <div className="grid min-w-0 gap-2 rounded-md border border-cyan-300/14 bg-cyan-400/8 px-2.5 py-2" aria-label="Apex visible run timeline strip">
                    <div className="flex min-w-0 items-center justify-between gap-2">
                      <p className="text-[9px] font-black uppercase tracking-[0.12em] text-cyan-300">Live Run Spine</p>
                      <span className="shrink-0 rounded-md border border-orange-300/18 bg-orange-500/10 px-2 py-1 text-[8px] font-black uppercase tracking-[0.08em] text-orange-200">Actions gated</span>
                    </div>
                    <div className="grid min-w-0 gap-1.5 sm:grid-cols-5">
                      {cockpitRunTimelineRows.slice(0, 5).map((row) => (
                        <div key={`strip-${row.id}`} className={`co-apex-run-timeline-step co-apex-run-timeline-step--${row.state} min-w-0 rounded-md border px-2 py-1.5`}>
                          <p className={`truncate text-[8px] font-black uppercase tracking-[0.08em] ${row.tone === "green" ? "text-emerald-300" : row.tone === "amber" ? "text-orange-300" : row.tone === "red" ? "text-red-300" : row.tone === "blue" ? "text-cyan-300" : "text-slate-500"}`}>{row.statusLabel}</p>
                          <p className="mt-0.5 truncate text-[10px] font-black text-slate-100">{row.number}. {row.title}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                <div className="grid min-w-0 gap-1.5 rounded-md border border-emerald-300/16 bg-emerald-400/8 px-2.5 py-2 xl:hidden" aria-label="Apex mobile private work loop">
                  <div className="grid min-w-0 gap-1.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                    <div className="min-w-0">
                      <p className="text-[9px] font-black uppercase tracking-[0.12em] text-emerald-300">Apex Work Loop</p>
                      <p className="mt-0.5 min-w-0 break-words text-[11px] font-black leading-4 text-slate-100">{cockpitNextPrivateMove.title}</p>
                    </div>
                    <div className="flex min-w-0 flex-wrap items-center gap-1.5 sm:justify-end">
                      <ToneBadge tone={cockpitNextPrivateMove.tone || "blue"}>{cockpitNextPrivateMove.status || "Ready"}</ToneBadge>
                      <ApexCockpitControlButton
                        className="px-2"
                        disabled={Boolean(cockpitUpdatingRun) || cockpitCreatingLiveRun}
                        onClick={() => workCockpitActiveRunNextMove()}
                        active={Boolean(cockpitUpdatingRun) || cockpitCreatingLiveRun}
                        title="Let Apex work the next private safe move from the server-backed run ledger"
                      >
                        <Icon name={cockpitNextPrivateMove.actionId === "operator-review" || cockpitNextPrivateMove.actionId === "review-result" || cockpitNextPrivateMove.actionId === "review-blocker" ? "phone" : cockpitNextPrivateMove.actionId === "draft-internal" ? "clipboard" : cockpitNextPrivateMove.actionId === "proof-check" ? "check" : "refresh"} />
                        {cockpitUpdatingRun || cockpitCreatingLiveRun ? "Working" : cockpitNextPrivateMove.buttonLabel || "Work Next"}
                      </ApexCockpitControlButton>
                      <ApexCockpitControlButton
                        className="px-2"
                        disabled={!cockpitActiveRun?.id || (!canAutoDriveCockpitRun && !cockpitAutoDriveEnabled)}
                        onClick={() => toggleCockpitAutoDrive()}
                        active={cockpitAutoDriveEnabled}
                        title="Toggle Apex Auto Drive for server-backed private steps only"
                      >
                        <Icon name={cockpitAutoDriveEnabled ? "refresh" : "spark"} /> {cockpitAutoDriveEnabled ? "Auto On" : "Auto Drive"}
                      </ApexCockpitControlButton>
                    </div>
                  </div>
                  <div className="grid min-w-0 gap-1">
                    <p className="line-clamp-1 min-w-0 text-[9px] font-bold leading-4 text-emerald-100">{cockpitAutoDriveNotice || cockpitNextPrivateMove.recommendation || cockpitNextPrivateMove.detail}</p>
                    <p className="line-clamp-1 min-w-0 break-words text-[9px] font-bold leading-4 text-orange-100" title={cockpitNextPrivateMove.safetyNote}>External actions locked. Private prep/proof only.</p>
                  </div>
                </div>
                {cockpitActiveRun?.id ? (
                  <div className="grid min-w-0 gap-1.5 rounded-md border border-cyan-300/14 bg-cyan-400/8 px-2.5 py-2 xl:hidden" aria-label="Apex mobile run memory review">
                    <div className="grid min-w-0 gap-1.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                      <div className="min-w-0">
                        <p className="text-[9px] font-black uppercase tracking-[0.12em] text-cyan-300">Run Memory Review</p>
                        <p className="mt-0.5 line-clamp-1 min-w-0 break-words text-[11px] font-black leading-4 text-slate-100">
                          {cockpitRunMemoryReviewRow?.title || (cockpitActiveRun.status === "done" ? "Run result memory needs review" : "Report done to draft run memory")}
                        </p>
                      </div>
                      <div className="flex min-w-0 flex-wrap items-center gap-1.5 sm:justify-end">
                        <ToneBadge tone={cockpitRunMemoryReviewRow?.tone || (cockpitRunMemoryReviewStatus === "missing" ? "amber" : "slate")}>
                          {cockpitRunMemoryReviewStatus === "approved" ? "trusted" : cockpitRunMemoryReviewStatus === "suggested" ? "review" : cockpitRunMemoryReviewStatus === "archived" ? "archived" : "not drafted"}
                        </ToneBadge>
                        <ApexCockpitControlButton className="px-2" disabled={!canTrustCockpitRunMemory} onClick={() => reviewCockpitRunMemory("approved")} active={cockpitRunMemoryReviewBusy === "approved"} title="Trust reviewed Apex run memory from mobile">
                          <Icon name="database" /> {cockpitRunMemoryReviewBusy === "approved" ? "Trusting" : "Trust Memory"}
                        </ApexCockpitControlButton>
                        <ApexCockpitControlButton className="px-2" disabled={!canTrustCockpitRunMemory} onClick={() => reviewCockpitRunMemory("archived")} active={cockpitRunMemoryReviewBusy === "archived"} title="Archive suggested Apex run memory from mobile">
                          <Icon name="inbox" /> {cockpitRunMemoryReviewBusy === "archived" ? "Archiving" : "Archive"}
                        </ApexCockpitControlButton>
                      </div>
                    </div>
                    <p className="line-clamp-2 min-w-0 break-words text-[9px] font-bold leading-4 text-cyan-100">
                      {cockpitRunMemoryReviewRow?.detail
                        || (cockpitActiveRun.status === "done"
                          ? "Apex has a completed run, but no matching suggested memory is loaded in this cockpit yet."
                          : "Report done to draft suggested run memory for manual trust or archive review.")}
                    </p>
                    <p className="line-clamp-2 min-w-0 break-words rounded-md border border-orange-300/12 bg-orange-500/8 px-2 py-1.5 text-[9px] font-bold leading-4 text-orange-100">
                      {cockpitRunMemoryReviewNoticeText}
                    </p>
                  </div>
                ) : null}
                <div className="grid min-w-0 gap-2 rounded-md border border-cyan-200/10 bg-slate-950/52 px-2.5 py-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center" aria-label="Apex live voice health">
                  <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-[0.12em] text-cyan-300">Voice Health</p>
                    <p className={`mt-0.5 truncate text-[11px] font-black ${cockpitVoiceHealth.tone === "green" ? "text-emerald-300" : cockpitVoiceHealth.tone === "amber" ? "text-orange-300" : cockpitVoiceHealth.tone === "red" ? "text-red-300" : "text-cyan-300"}`}>{cockpitVoiceHealth.status}</p>
                    <p className="mt-0.5 min-w-0 break-words text-[9px] font-bold leading-4 text-slate-500">{cockpitVoiceHealthSummary}</p>
                  </div>
                  <ApexCockpitControlButton
                    className="shrink-0 px-2"
                    onClick={() => recoverCockpitVoice()}
                    disabled={!canUseCockpitVoiceInput && !cockpitSpeaking && !cockpitRecording && !cockpitTranscribing}
                    active={cockpitVoiceHealth.status === "Recovering captions"}
                    title="Recover Apex voice health from the live console"
                  >
                    Recover Voice
                  </ApexCockpitControlButton>
                </div>
                <div className="grid min-w-0 gap-1.5 sm:grid-cols-6" aria-label="Apex live operator state">
                  {cockpitNowState.stageRows.map((item) => (
                    <div key={item.label} className="min-w-0 rounded-md border border-slate-800 bg-slate-900/58 px-2.5 py-2">
                      <p className="text-[9px] font-black uppercase tracking-[0.1em] text-slate-500">{item.label}</p>
                      <p className={`mt-0.5 truncate text-[11px] font-black ${item.tone === "green" ? "text-emerald-300" : item.tone === "amber" ? "text-orange-300" : item.tone === "red" ? "text-red-300" : item.tone === "blue" ? "text-cyan-300" : "text-slate-300"}`}>{item.value}</p>
                    </div>
                  ))}
                </div>
                <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-start gap-2 rounded-md border border-cyan-200/10 bg-slate-950/52 px-2.5 py-2" aria-label="Apex next safe move">
                  <Icon name={cockpitNowState.icon} className={`mt-0.5 h-3.5 w-3.5 ${cockpitNowState.tone === "green" ? "text-emerald-300" : cockpitNowState.tone === "amber" ? "text-orange-300" : cockpitNowState.tone === "red" ? "text-red-300" : cockpitNowState.tone === "blue" ? "text-cyan-300" : "text-slate-400"}`} />
                  <p className="min-w-0 break-words text-[10px] font-bold leading-4 text-cyan-100"><span className="font-black uppercase tracking-[0.08em] text-cyan-300">Next Safe Move:</span> {cockpitNowState.nextSafeAction}</p>
                </div>
                {(cockpitAnswerText || cockpitError) ? (
                  <div className="co-apex-cockpit-visible-response grid min-w-0 gap-2 rounded-lg border border-cyan-200/12 bg-slate-950/64 p-3" aria-label="Apex visible response">
                    <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-cyan-300">Apex Response</p>
                        <p className="mt-0.5 min-w-0 break-words text-[10px] font-bold leading-4 text-slate-500">{cockpitLastQuestion || "Live operator answer"}</p>
                      </div>
                      <span className="shrink-0 rounded-md border border-cyan-300/20 bg-cyan-300/8 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.08em] text-cyan-200">{cockpitSources.length || 0} sources</span>
                    </div>
                    <p className={`min-w-0 break-words text-[11px] font-bold leading-5 ${cockpitError ? "text-red-200" : "text-slate-200"}`}>{cockpitError || cockpitAnswerText}</p>
                    {(cockpitAgentActionNotice || cockpitVoiceNotice || cockpitRecognitionError) ? (
                      <p className="min-w-0 break-words rounded-md border border-cyan-200/10 bg-slate-900/58 px-2.5 py-2 text-[10px] font-bold leading-4 text-cyan-100">{cockpitAgentActionNotice || cockpitVoiceNotice || cockpitRecognitionError}</p>
                    ) : null}
                    <div className="grid min-w-0 gap-1.5 rounded-md border border-cyan-200/10 bg-cyan-400/8 px-2.5 py-2" aria-label="Apex live conversation context">
                      <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-[9px] font-black uppercase tracking-[0.12em] text-cyan-300">Conversation Context</p>
                          <p className={`mt-0.5 min-w-0 break-words text-[10px] font-black ${cockpitVisibleConversationContext.tone === "green" ? "text-emerald-300" : cockpitVisibleConversationContext.tone === "amber" ? "text-orange-300" : cockpitVisibleConversationContext.tone === "blue" ? "text-cyan-200" : "text-slate-300"}`}>{cockpitVisibleConversationContext.title}</p>
                        </div>
                        <span className="shrink-0 rounded-md border border-cyan-300/18 bg-slate-950/52 px-2 py-1 text-[8px] font-black uppercase tracking-[0.08em] text-cyan-200">{cockpitVisibleConversationContext.status}</span>
                      </div>
                      <p className="min-w-0 break-words text-[10px] font-bold leading-4 text-slate-400">{cockpitVisibleConversationContext.detail}</p>
                      <p className="min-w-0 break-words text-[10px] font-bold leading-4 text-slate-500">{cockpitVisibleConversationContext.answer}</p>
                      {cockpitVisibleConversationContext.retryReason ? (
                        <p className="min-w-0 break-words rounded-md border border-orange-300/12 bg-orange-500/8 px-2 py-1.5 text-[9px] font-bold leading-4 text-orange-100">{cockpitVisibleConversationContext.retryReason}</p>
                      ) : null}
                      <div className="grid min-w-0 gap-1 sm:grid-cols-4">
                        {cockpitVisibleConversationContext.rows.map((row) => (
                          <div key={row.label} className="min-w-0 rounded-md border border-slate-800 bg-slate-950/46 px-2 py-1.5">
                            <p className="truncate text-[8px] font-black uppercase tracking-[0.08em] text-slate-500">{row.label}</p>
                            <p className={`mt-0.5 truncate text-[10px] font-black ${row.tone === "green" ? "text-emerald-300" : row.tone === "amber" ? "text-orange-300" : row.tone === "blue" ? "text-cyan-300" : "text-slate-300"}`}>{row.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="grid min-w-0 gap-1.5" aria-label="Apex next turn prompts">
                      <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">Next Turn</p>
                      <div className="grid min-w-0 gap-1.5 sm:grid-cols-2">
                        {cockpitFollowUpPrompts.map((prompt) => (
                          <button
                            key={prompt.id}
                            type="button"
                            onClick={() => loadCockpitFollowUpPrompt(prompt)}
                            className="co-focus-ring min-w-0 rounded-md border border-slate-800 bg-slate-900/64 px-2.5 py-2 text-left transition hover:border-orange-500/50 hover:bg-orange-500/10"
                          >
                            <span className={`block truncate text-[10px] font-black ${prompt.tone === "green" ? "text-emerald-300" : prompt.tone === "amber" ? "text-orange-300" : prompt.tone === "slate" ? "text-slate-300" : "text-cyan-300"}`}>{prompt.label}</span>
                            <span className="mt-0.5 block line-clamp-2 text-[9px] font-bold leading-4 text-slate-500">{prompt.question}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}
                <div className="co-apex-cockpit-operator-stack grid min-w-0 gap-2 rounded-lg border border-cyan-200/12 bg-slate-900/46 p-3">
                  <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-cyan-300">Live Operator Mode</p>
                      <p className="mt-0.5 min-w-0 break-words text-xs font-black text-slate-100">{cockpitVisibleLiveStatus}</p>
                      <p className="mt-0.5 min-w-0 break-words text-[11px] font-bold leading-4 text-slate-500">{cockpitLiveRunNotice || cockpitAgentActionNotice || liveOperatorMode.nextAction || "Start a live operator run from the Apex body."}</p>
                    </div>
                    <ToneBadge tone={cockpitVisibleLiveTone}>{liveOperatorMode.mode || "Private Apex"}</ToneBadge>
                  </div>
                  <div className="co-apex-cockpit-operator-metrics grid min-w-0 gap-1.5 sm:grid-cols-5">
                    {[
                      { label: "Foundation", value: `${liveOperatorMode.foundationPercent || 0}%`, tone: "green" },
                      { label: "Operator", value: `${cockpitVisibleOperatorPercent || 0}%`, tone: "blue" },
                      { label: "Saved runs", value: String(cockpitVisibleSavedRunCount), tone: cockpitVisibleSavedRunCount ? "green" : "slate" },
                      { label: "Run memory", value: trustedRunMemoryCount ? `${trustedRunMemoryCount} trusted` : pendingRunMemoryCount ? `${pendingRunMemoryCount} review` : "Ready", tone: trustedRunMemoryCount ? "green" : pendingRunMemoryCount ? "amber" : "slate" },
                      { label: "Gates", value: liveOperatorMode.externalActionsLocked ? "Locked" : "Open", tone: liveOperatorMode.externalActionsLocked ? "amber" : "green" },
                    ].map((item) => (
                      <div key={item.label} className="min-w-0 rounded-md border border-slate-800 bg-slate-950/54 px-2.5 py-2">
                        <p className="text-[9px] font-black uppercase tracking-[0.1em] text-slate-500">{item.label}</p>
                        <p className={`mt-0.5 text-[11px] font-black ${item.tone === "green" ? "text-emerald-300" : item.tone === "amber" ? "text-orange-300" : item.tone === "blue" ? "text-cyan-300" : "text-slate-300"}`}>{item.value}</p>
                      </div>
                    ))}
                  </div>
                  {(latestRunMemory || pendingRunMemoryCount) ? (
                    <p className="min-w-0 break-words rounded-md border border-emerald-300/12 bg-emerald-400/8 px-2.5 py-2 text-[10px] font-bold leading-4 text-emerald-100">
                      {latestRunMemory
                        ? `Trusted run history: ${latestRunMemory.title}. Apex can use reviewed run outcomes in later answers.`
                        : `${pendingRunMemoryCount} suggested run memor${pendingRunMemoryCount === 1 ? "y is" : "ies are"} waiting for manual review before Apex can trust them.`}
                    </p>
                  ) : null}
                  <div className="co-apex-cockpit-console-tabs grid min-w-0 gap-2 rounded-md border border-cyan-200/10 bg-slate-950/52 p-2.5" aria-label="Apex operator console tabs">
                    <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-cyan-300">Operator Console</p>
                        <p className="mt-0.5 min-w-0 break-words text-[10px] font-bold leading-4 text-slate-500">Choose the live lane without turning the Apex body into a long wall of panels.</p>
                      </div>
                      <span className="shrink-0 rounded-md border border-emerald-300/18 bg-emerald-500/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.08em] text-emerald-200">Private Apex</span>
                    </div>
                    <div className="grid min-w-0 gap-1.5 sm:grid-cols-4">
                      {cockpitConsoleTabs.map((tab) => {
                        const active = cockpitConsoleTab === tab.id;
                        return (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setCockpitConsoleTab(tab.id)}
                            className={`co-focus-ring grid min-h-[4.2rem] min-w-0 grid-cols-[auto_minmax(0,1fr)] items-start gap-2 rounded-md border px-2.5 py-2 text-left transition ${active ? "border-orange-400/70 bg-orange-500/12 text-white shadow-[0_0_22px_-14px_rgba(249,115,22,0.95)]" : "border-slate-800 bg-slate-900/52 text-slate-300 hover:border-cyan-300/50 hover:bg-cyan-500/8 hover:text-white"}`}
                            aria-pressed={active}
                            title={`Open ${tab.label} console lane`}
                          >
                            <Icon name={tab.icon} className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${tab.tone === "green" ? "text-emerald-300" : tab.tone === "amber" ? "text-orange-300" : tab.tone === "red" ? "text-red-300" : tab.tone === "blue" ? "text-cyan-300" : "text-slate-400"}`} />
                            <span className="min-w-0">
                              <span className="block truncate text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">Console tab: {tab.label}</span>
                              <span className={`mt-0.5 block truncate text-[11px] font-black ${active ? "text-white" : tab.tone === "green" ? "text-emerald-300" : tab.tone === "amber" ? "text-orange-300" : tab.tone === "red" ? "text-red-300" : tab.tone === "blue" ? "text-cyan-300" : "text-slate-300"}`}>{tab.value}</span>
                              <span className="mt-0.5 block line-clamp-2 text-[9px] font-bold leading-4 text-slate-500">{tab.detail}</span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {cockpitConsoleTab === "live" ? (
                  <div className="grid min-w-0 gap-2 rounded-md border border-cyan-200/10 bg-slate-950/52 p-2.5" aria-label="Apex live session heartbeat">
                    <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-cyan-300">Live Session Heartbeat</p>
                        <p className="mt-0.5 min-w-0 break-words text-xs font-black text-slate-100">{cockpitSessionHeartbeat.status}</p>
                        <p className="mt-0.5 min-w-0 break-words text-[10px] font-bold leading-4 text-slate-500">{cockpitSessionHeartbeat.detail}</p>
                      </div>
                      <ApexCockpitControlButton className="shrink-0 px-2" disabled={false} onClick={() => deliverCockpitSessionHeartbeat({ speak: true })} active={false} title="Speak Apex live session heartbeat">
                        <Icon name="phone" /> Speak Check-In
                      </ApexCockpitControlButton>
                    </div>
                    <div className="grid min-w-0 gap-1.5 sm:grid-cols-4">
                      {[
                        { label: "Progress", value: cockpitSessionHeartbeat.progressLabel, tone: cockpitSessionHeartbeat.tone },
                        { label: "Updated", value: cockpitSessionHeartbeat.ageLabel, tone: cockpitSessionHeartbeat.tone },
                        { label: "Pulse", value: cockpitSessionHeartbeat.pulseLabel, tone: cockpitLivePulse?.checkedAt ? "green" : "slate" },
                        { label: "Gate", value: cockpitSessionHeartbeat.executionLocked ? "Consequential" : "Open", tone: cockpitSessionHeartbeat.executionLocked ? "amber" : "red" },
                      ].map((item) => (
                        <div key={item.label} className="min-w-0 rounded-md border border-slate-800 bg-slate-900/48 px-2.5 py-2">
                          <p className="text-[8px] font-black uppercase tracking-[0.08em] text-slate-500">{item.label}</p>
                          <p className={`mt-0.5 truncate text-[10px] font-black ${item.tone === "green" ? "text-emerald-300" : item.tone === "amber" ? "text-orange-300" : item.tone === "red" ? "text-red-300" : "text-slate-300"}`}>{item.value}</p>
                        </div>
                      ))}
                    </div>
                    <p className="min-w-0 break-words rounded-md border border-cyan-200/10 bg-slate-900/44 px-2.5 py-2 text-[10px] font-bold leading-4 text-cyan-100">{cockpitSessionHeartbeat.recommendation}</p>
                  </div>
                  ) : null}
                  {cockpitConsoleTab === "pulse" ? (
                  <div className="grid min-w-0 gap-2 rounded-md border border-orange-300/16 bg-slate-950/52 p-2.5" aria-label="Apex proactive check-in">
                    <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-orange-300">Proactive Check-In</p>
                        <p className="mt-0.5 min-w-0 break-words text-xs font-black text-slate-100">{cockpitVisibleProactiveCheckIn.title || "Apex is watching the live run"}</p>
                        <p className="mt-0.5 min-w-0 break-words text-[10px] font-bold leading-4 text-slate-500">{cockpitVisibleProactiveCheckIn.detail || "Apex will surface meaningful live-run changes here."}</p>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-1.5">
                        <ApexCockpitControlButton className="px-2" disabled={false} onClick={() => deliverCockpitProactiveCheckIn({ speak: true })} active={false} title="Speak Apex proactive check-in">
                          <Icon name="phone" /> Speak Latest
                        </ApexCockpitControlButton>
                        <ApexCockpitControlButton className="px-2" disabled={!canDraftCockpitProactiveMemory} onClick={() => saveCockpitProactiveCheckInMemory(cockpitVisibleProactiveCheckIn)} active={cockpitProactiveMemoryBusy} title="Draft suggested memory from this proactive check-in">
                          <Icon name="database" /> {cockpitProactiveMemoryBusy ? "Saving" : "Draft Memory"}
                        </ApexCockpitControlButton>
                      </div>
                    </div>
                    <div className="grid min-w-0 gap-1.5 sm:grid-cols-6">
                      {[
                        { label: "Status", value: cockpitVisibleProactiveCheckIn.status || "Watching", tone: cockpitVisibleProactiveCheckIn.shouldSurface ? "green" : "slate" },
                        { label: "Trigger", value: cockpitVisibleProactiveCheckIn.trigger || "watching", tone: cockpitVisibleProactiveCheckIn.shouldSurface ? "green" : "blue" },
                        { label: "Surface", value: cockpitVisibleProactiveCheckIn.shouldSurface ? "New" : "Quiet", tone: cockpitVisibleProactiveCheckIn.shouldSurface ? "amber" : "slate" },
                        { label: "Voice", value: cockpitProactiveVoiceStatus, tone: cockpitProactiveVoiceStatus === "Spoken" ? "green" : cockpitProactiveVoiceStatus === "Queued" ? "amber" : cockpitProactiveVoiceStatus === "Manual" ? "blue" : "slate" },
                        { label: "Memory", value: cockpitVisibleProactiveMemoryId ? "Drafted" : cockpitVisibleProactiveCheckIn.shouldSurface ? "Suggested" : "Quiet", tone: cockpitVisibleProactiveMemoryId ? "green" : cockpitVisibleProactiveCheckIn.shouldSurface ? "amber" : "slate" },
                        { label: "Gate", value: cockpitVisibleProactiveCheckIn.executionLocked ? "Consequential" : "Review", tone: cockpitVisibleProactiveCheckIn.executionLocked ? "amber" : "red" },
                      ].map((item) => (
                        <div key={item.label} className="min-w-0 rounded-md border border-slate-800 bg-slate-900/48 px-2.5 py-2">
                          <p className="text-[8px] font-black uppercase tracking-[0.08em] text-slate-500">{item.label}</p>
                          <p className={`mt-0.5 truncate text-[10px] font-black ${item.tone === "green" ? "text-emerald-300" : item.tone === "amber" ? "text-orange-300" : item.tone === "red" ? "text-red-300" : item.tone === "blue" ? "text-cyan-300" : "text-slate-300"}`}>{item.value}</p>
                        </div>
                      ))}
                    </div>
                    <p className="min-w-0 break-words rounded-md border border-orange-200/10 bg-orange-500/8 px-2.5 py-2 text-[10px] font-bold leading-4 text-orange-100">{cockpitVisibleProactiveCheckIn.recommendation || "Keep monitoring. Consequential actions remain gated."}</p>
                    <p className="min-w-0 break-words rounded-md border border-cyan-200/10 bg-cyan-500/8 px-2.5 py-2 text-[10px] font-bold leading-4 text-cyan-100">
                      {cockpitProactiveMemoryNotice || (cockpitProactiveMemoryCount
                        ? `${cockpitProactiveMemoryCount} proactive check-in memory draft${cockpitProactiveMemoryCount === 1 ? "" : "s"} created this session; manual approval is still required.`
                        : "Surfaced check-ins can draft suggested memory, but nothing becomes trusted until you review it.")}
                    </p>
                  </div>
                  ) : null}
                  {cockpitConsoleTab === "run" ? (
                  <div className="grid min-w-0 gap-2 rounded-md border border-cyan-200/10 bg-slate-950/48 p-2.5" aria-label="Active Apex run session">
                    <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-cyan-300">Active Run Session</p>
                        <p className="mt-0.5 min-w-0 break-words text-xs font-black text-slate-100">{cockpitActiveRun?.title || "No active live run yet"}</p>
                        <p className="mt-0.5 min-w-0 break-words text-[10px] font-bold leading-4 text-slate-500">
                          {cockpitActiveRun
                            ? cockpitActiveRun.request || cockpitActiveRun.nextSafeAction || "Apex is tracking this private run."
                            : "Start a Live Run and Apex will track steps, evidence, linked drafts, status, and result report here."}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-1.5 sm:justify-end">
                        <ApexCockpitControlButton className="px-2" disabled={false} onClick={() => deliverCockpitRunHandback({ speak: true })} active={false} title="Speak Apex operator handback">
                          <Icon name="phone" /> Speak Handback
                        </ApexCockpitControlButton>
                        <ApexCockpitControlButton className="px-2" disabled={!cockpitActiveRun?.id} onClick={() => deliverCockpitClosingReport({ speak: true })} active={false} title="Speak Apex live operator closing report">
                          <Icon name="check" /> Speak Closing
                        </ApexCockpitControlButton>
                        <ToneBadge tone={apexCockpitRunStatusTone(cockpitActiveRun?.status)}>{cockpitActiveRun?.status || "ready"}</ToneBadge>
                      </div>
                    </div>
                    {cockpitActiveRun ? (
                      <>
                        <div className="grid min-w-0 gap-2 rounded-md border border-emerald-300/16 bg-emerald-400/8 p-2.5" aria-label="Apex private work loop">
                          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-emerald-300">Apex Work Loop</p>
                              <p className="mt-0.5 min-w-0 break-words text-xs font-black text-slate-100">{cockpitNextPrivateMove.title}</p>
                              <p className="mt-0.5 min-w-0 break-words text-[10px] font-bold leading-4 text-emerald-100">{cockpitNextPrivateMove.detail}</p>
                            </div>
                            <div className="flex shrink-0 flex-wrap items-center gap-1.5 sm:justify-end">
                              <ToneBadge tone={cockpitNextPrivateMove.tone || "blue"}>{cockpitNextPrivateMove.status || "Ready"}</ToneBadge>
                              <ApexCockpitControlButton
                                className="px-2"
                                disabled={Boolean(cockpitUpdatingRun) || cockpitCreatingLiveRun}
                                onClick={() => workCockpitActiveRunNextMove()}
                                active={Boolean(cockpitUpdatingRun) || cockpitCreatingLiveRun}
                                title="Let Apex work the next private safe move from the server-backed run ledger"
                              >
                                <Icon name={cockpitNextPrivateMove.actionId === "operator-review" || cockpitNextPrivateMove.actionId === "review-result" || cockpitNextPrivateMove.actionId === "review-blocker" ? "phone" : cockpitNextPrivateMove.actionId === "draft-internal" ? "clipboard" : cockpitNextPrivateMove.actionId === "proof-check" ? "check" : "refresh"} />
                                {cockpitUpdatingRun || cockpitCreatingLiveRun ? "Working" : cockpitNextPrivateMove.buttonLabel || "Work Next"}
                              </ApexCockpitControlButton>
                              <ApexCockpitControlButton
                                className="px-2"
                                disabled={!cockpitActiveRun?.id || (!canAutoDriveCockpitRun && !cockpitAutoDriveEnabled)}
                                onClick={() => toggleCockpitAutoDrive()}
                                active={cockpitAutoDriveEnabled}
                                title="Toggle Apex Auto Drive for server-backed private steps only"
                              >
                                <Icon name={cockpitAutoDriveEnabled ? "refresh" : "spark"} /> {cockpitAutoDriveEnabled ? "Auto On" : "Auto Drive"}
                              </ApexCockpitControlButton>
                            </div>
                          </div>
                          <div className="grid min-w-0 gap-1.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
                            <p className="min-w-0 break-words rounded-md border border-emerald-300/12 bg-slate-950/46 px-2.5 py-2 text-[10px] font-bold leading-4 text-emerald-100">{cockpitAutoDriveNotice || cockpitNextPrivateMove.recommendation}</p>
                            <p className="min-w-0 break-words rounded-md border border-orange-300/12 bg-orange-500/8 px-2.5 py-2 text-[10px] font-bold leading-4 text-orange-100">{cockpitNextPrivateMove.safetyNote}</p>
                          </div>
                        </div>
                        <div className="grid min-w-0 gap-2 rounded-md border border-cyan-300/14 bg-cyan-400/8 p-2.5" aria-label="Apex run mission timeline">
                          <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-cyan-300">Mission Timeline</p>
                              <p className="mt-0.5 min-w-0 break-words text-[10px] font-bold leading-4 text-cyan-100">
                                Live run spine: done, now, review gate, and locked next moves stay visible before Apex reports back.
                              </p>
                            </div>
                            <ToneBadge tone={cockpitActiveRunProgress.hasResultReport ? "green" : cockpitNextPrivateMove.tone || "blue"}>
                              {cockpitActiveRunProgress.hasResultReport ? "report saved" : cockpitNextPrivateMove.status || "tracking"}
                            </ToneBadge>
                          </div>
                          <div className="co-apex-run-timeline grid min-w-0 gap-1.5 sm:grid-cols-2 xl:grid-cols-4">
                            {cockpitRunTimelineRows.map((row) => (
                              <div key={row.id} className={`co-apex-run-timeline-step co-apex-run-timeline-step--${row.state} min-w-0 rounded-md border px-2.5 py-2`}>
                                <div className="flex min-w-0 items-start gap-2">
                                  <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[10px] font-black ${row.tone === "green" ? "border-emerald-300/50 bg-emerald-400/14 text-emerald-200" : row.tone === "amber" ? "border-orange-300/50 bg-orange-500/14 text-orange-200" : row.tone === "red" ? "border-red-300/50 bg-red-500/14 text-red-200" : row.tone === "blue" ? "border-cyan-300/50 bg-cyan-400/14 text-cyan-200" : "border-slate-700 bg-slate-900 text-slate-400"}`}>{row.number}</span>
                                  <span className="min-w-0">
                                    <span className={`block truncate text-[8px] font-black uppercase tracking-[0.08em] ${row.tone === "green" ? "text-emerald-300" : row.tone === "amber" ? "text-orange-300" : row.tone === "red" ? "text-red-300" : row.tone === "blue" ? "text-cyan-300" : "text-slate-500"}`}>{row.statusLabel}</span>
                                    <span className="mt-0.5 block truncate text-[11px] font-black text-slate-100">{row.title}</span>
                                    <span className="mt-0.5 block line-clamp-2 text-[9px] font-bold leading-4 text-slate-500">{row.detail}</span>
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="grid min-w-0 gap-1.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.9fr)]">
                          <div className="min-w-0 rounded-md border border-slate-800 bg-slate-900/48 px-2.5 py-2">
                            <p className="text-[8px] font-black uppercase tracking-[0.08em] text-slate-500">Progress</p>
                            <p className="mt-0.5 text-[11px] font-black text-emerald-300">{cockpitActiveRunProgress.progressPercent || 0}% / {cockpitActiveRunProgress.doneCount || 0} of {cockpitActiveRunProgress.totalCount || 0}</p>
                            <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-slate-800" aria-hidden="true">
                              <span className="block h-full rounded-full bg-gradient-to-r from-emerald-300 via-cyan-300 to-orange-300" style={{ width: `${Math.max(4, Math.min(100, cockpitActiveRunProgress.progressPercent || 0))}%` }} />
                            </span>
                          </div>
                          <div className="min-w-0 rounded-md border border-slate-800 bg-slate-900/48 px-2.5 py-2">
                            <p className="text-[8px] font-black uppercase tracking-[0.08em] text-slate-500">Current Step</p>
                            <p className="mt-0.5 truncate text-[11px] font-black text-cyan-300">{cockpitActiveRunProgress.activeStepTitle || "Review run"}</p>
                            <p className="mt-0.5 line-clamp-2 text-[10px] font-bold leading-4 text-slate-500">{cockpitActiveRunProgress.activeStepDetail || cockpitActiveRun.nextSafeAction || "Review evidence before changing status."}</p>
                          </div>
                          <div className="min-w-0 rounded-md border border-slate-800 bg-slate-900/48 px-2.5 py-2">
                            <p className="text-[8px] font-black uppercase tracking-[0.08em] text-slate-500">Evidence Links</p>
                            <p className="mt-0.5 text-[11px] font-black text-slate-200">{cockpitActiveRunProgress.evidenceCount || 0} evidence / {cockpitActiveRunProgress.linkedDraftCount || 0} linked</p>
                            <p className="mt-0.5 line-clamp-2 text-[10px] font-bold leading-4 text-slate-500">
                              {cockpitActiveRun.linkedExecutionHandoffId || cockpitActiveRun.linkedAgentControlRequestId || cockpitActiveRun.evidence?.[0] || "Draft internal work to attach handoff evidence."}
                            </p>
                          </div>
                        </div>
                        <div className="grid min-w-0 gap-2 rounded-md border border-orange-300/16 bg-orange-500/8 p-2.5" aria-label="Apex operator handback">
                          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-orange-300">Operator Handback</p>
                              <p className="mt-0.5 min-w-0 break-words text-[10px] font-bold leading-4 text-orange-100">{cockpitActiveRunHandback.summary}</p>
                            </div>
                            <ToneBadge tone={cockpitActiveRunHandback.tone || "amber"}>{cockpitActiveRunHandback.status || "review"}</ToneBadge>
                          </div>
                          <div className="grid min-w-0 gap-1.5 sm:grid-cols-2 xl:grid-cols-4">
                            {[
                              { label: "What I Did", rows: cockpitActiveRunHandback.did || [], tone: "green" },
                              { label: "Proof I Have", rows: cockpitActiveRunHandback.proof || [], tone: "blue" },
                              { label: "What I Need", rows: cockpitActiveRunHandback.needs || [], tone: "amber" },
                              { label: "Still Locked", rows: cockpitActiveRunHandback.locks || [], tone: "slate" },
                            ].map((item) => (
                              <div key={item.label} className="min-w-0 rounded-md border border-slate-800 bg-slate-950/56 px-2.5 py-2">
                                <p className={`text-[8px] font-black uppercase tracking-[0.08em] ${item.tone === "green" ? "text-emerald-300" : item.tone === "amber" ? "text-orange-300" : item.tone === "blue" ? "text-cyan-300" : "text-slate-400"}`}>{item.label}</p>
                                <div className="mt-1 grid min-w-0 gap-1">
                                  {(item.rows.length ? item.rows : ["Review the active run."]).slice(0, 4).map((row, index) => (
                                    <p key={`${item.label}-${index}`} className="min-w-0 break-words text-[9px] font-bold leading-4 text-slate-400">{row}</p>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="grid min-w-0 gap-2 rounded-md border border-emerald-300/16 bg-emerald-400/8 p-2.5" aria-label="Apex live operator closing report">
                          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-emerald-300">Closing Report</p>
                              <p className="mt-0.5 min-w-0 break-words text-xs font-black text-slate-100">{cockpitClosingReport.title}</p>
                              <p className="mt-0.5 min-w-0 break-words text-[10px] font-bold leading-4 text-emerald-100">{cockpitClosingReport.summary}</p>
                            </div>
                            <div className="flex shrink-0 flex-wrap items-center gap-1.5 sm:justify-end">
                              <ToneBadge tone={cockpitClosingReport.tone}>{cockpitClosingReport.status}</ToneBadge>
                              <ApexCockpitControlButton className="px-2" disabled={false} onClick={() => deliverCockpitClosingReport({ speak: true })} active={false} title="Speak Apex live operator closing report">
                                <Icon name="phone" /> Speak Closing
                              </ApexCockpitControlButton>
                            </div>
                          </div>
                          <div className="grid min-w-0 gap-1.5 sm:grid-cols-5">
                            {cockpitClosingReport.rows.map((row) => (
                              <div key={row.id} className="min-w-0 rounded-md border border-slate-800 bg-slate-950/56 px-2.5 py-2">
                                <p className={`truncate text-[8px] font-black uppercase tracking-[0.08em] ${row.tone === "green" ? "text-emerald-300" : row.tone === "amber" ? "text-orange-300" : row.tone === "red" ? "text-red-300" : row.tone === "blue" ? "text-cyan-300" : "text-slate-400"}`}>{row.label}</p>
                                <p className="mt-0.5 truncate text-[10px] font-black text-slate-100">{row.value}</p>
                                <p className="mt-0.5 line-clamp-2 min-w-0 break-words text-[9px] font-bold leading-4 text-slate-500">{row.detail}</p>
                              </div>
                            ))}
                          </div>
                          <p className="min-w-0 break-words rounded-md border border-orange-300/12 bg-orange-500/8 px-2.5 py-2 text-[10px] font-bold leading-4 text-orange-100">
                            Closing reports summarize private work only. No sends, billing, provider work, production changes, deploys, rollbacks, agent runs, automatic trusted memory, or irreversible actions.
                          </p>
                        </div>
                        <div className="grid min-w-0 gap-2 rounded-md border border-cyan-300/14 bg-cyan-400/8 p-2.5" aria-label="Apex run memory review">
                          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-cyan-300">Run Memory Review</p>
                              <p className="mt-0.5 min-w-0 break-words text-xs font-black text-slate-100">
                                {cockpitRunMemoryReviewRow?.title || (cockpitActiveRun.status === "done" ? "Run result memory needs review" : "Report done to draft run memory")}
                              </p>
                              <p className="mt-0.5 min-w-0 break-words text-[10px] font-bold leading-4 text-cyan-100">
                                {cockpitRunMemoryReviewRow?.detail
                                  || (cockpitActiveRun.status === "done"
                                    ? "Apex has a completed run, but no matching suggested memory is loaded in this cockpit yet."
                                    : "When this run is reported done, Apex drafts suggested run memory here for manual trust or archive review.")}
                              </p>
                            </div>
                            <div className="flex shrink-0 flex-wrap items-center gap-1.5 sm:justify-end">
                              <ToneBadge tone={cockpitRunMemoryReviewRow?.tone || (cockpitRunMemoryReviewStatus === "missing" ? "amber" : "slate")}>
                                {cockpitRunMemoryReviewStatus === "approved" ? "trusted" : cockpitRunMemoryReviewStatus === "suggested" ? "review" : cockpitRunMemoryReviewStatus === "archived" ? "archived" : "not drafted"}
                              </ToneBadge>
                              <ApexCockpitControlButton className="px-2" disabled={!canTrustCockpitRunMemory} onClick={() => reviewCockpitRunMemory("approved")} active={cockpitRunMemoryReviewBusy === "approved"} title="Trust reviewed Apex run memory">
                                <Icon name="database" /> {cockpitRunMemoryReviewBusy === "approved" ? "Trusting" : "Trust Memory"}
                              </ApexCockpitControlButton>
                              <ApexCockpitControlButton className="px-2" disabled={!canTrustCockpitRunMemory} onClick={() => reviewCockpitRunMemory("archived")} active={cockpitRunMemoryReviewBusy === "archived"} title="Archive suggested Apex run memory">
                                <Icon name="inbox" /> {cockpitRunMemoryReviewBusy === "archived" ? "Archiving" : "Archive"}
                              </ApexCockpitControlButton>
                            </div>
                          </div>
                          <p className="min-w-0 break-words rounded-md border border-orange-300/12 bg-orange-500/8 px-2.5 py-2 text-[10px] font-bold leading-4 text-orange-100">
                            {cockpitRunMemoryReviewNoticeText}
                          </p>
                        </div>
                        <div className="grid min-w-0 gap-1.5 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
                          <ApexCockpitControlButton className="px-2" disabled={Boolean(cockpitUpdatingRun) || cockpitActiveRun.status === "done" || cockpitActiveRun.status === "archived" || cockpitActiveRun.status === "blocked"} onClick={() => cycleCockpitActiveRunPrivately()} active={cockpitUpdatingRun === `cycle-${cockpitActiveRun.id}`} title="Run the private operator cycle and stop at manual review">
                            <Icon name="refresh" /> {cockpitUpdatingRun === `cycle-${cockpitActiveRun.id}` ? "Cycling" : "Cycle"}
                          </ApexCockpitControlButton>
                          <ApexCockpitControlButton className="px-2" disabled={Boolean(cockpitUpdatingRun) || cockpitActiveRun.status === "done" || cockpitActiveRun.status === "archived" || cockpitActiveRun.status === "blocked"} onClick={() => continueCockpitActiveRunPrivately()} active={cockpitUpdatingRun === `private-prep-${cockpitActiveRun.id}`} title="Let Apex advance private prep and stop before gated work">
                            <Icon name="spark" /> {cockpitUpdatingRun === `private-prep-${cockpitActiveRun.id}` ? "Prepping" : "Auto Prep"}
                          </ApexCockpitControlButton>
                          <ApexCockpitControlButton className="px-2" disabled={Boolean(cockpitUpdatingRun) || cockpitActiveRun.status === "done" || cockpitActiveRun.status === "archived" || cockpitActiveRun.status === "blocked"} onClick={() => proofCheckCockpitActiveRunPrivately()} active={cockpitUpdatingRun === `proof-${cockpitActiveRun.id}`} title="Run private proof checks and stop at manual review">
                            <Icon name="check" /> {cockpitUpdatingRun === `proof-${cockpitActiveRun.id}` ? "Checking" : "Proof"}
                          </ApexCockpitControlButton>
                          <ApexCockpitControlButton className="px-2" disabled={Boolean(cockpitUpdatingRun) || Boolean(cockpitActiveRun.linkedExecutionHandoffId)} onClick={() => draftCockpitActiveRunInternalWork()} active={cockpitUpdatingRun === `draft-${cockpitActiveRun.id}`} title="Prepare linked internal draft package">
                            <Icon name="clipboard" /> {cockpitUpdatingRun === `draft-${cockpitActiveRun.id}` ? "Drafting" : "Draft"}
                          </ApexCockpitControlButton>
                          <ApexCockpitControlButton className="px-2" disabled={Boolean(cockpitUpdatingRun) || cockpitActiveRun.status === "done" || cockpitActiveRun.status === "archived"} onClick={() => updateCockpitActiveRunStatus("validating")} active={cockpitUpdatingRun === `validating-${cockpitActiveRun.id}`} title="Mark active run as validating">
                            <Icon name="check" /> Validate
                          </ApexCockpitControlButton>
                          <ApexCockpitControlButton className="px-2" disabled={Boolean(cockpitUpdatingRun) || cockpitActiveRun.status === "done" || cockpitActiveRun.status === "archived"} onClick={() => updateCockpitActiveRunStatus("waiting-approval")} active={cockpitUpdatingRun === `waiting-approval-${cockpitActiveRun.id}`} title="Move active run to manual approval review">
                            <Icon name="lock" /> Approval
                          </ApexCockpitControlButton>
                          <ApexCockpitControlButton className="px-2" disabled={Boolean(cockpitUpdatingRun) || cockpitActiveRun.status === "done" || cockpitActiveRun.status === "archived"} onClick={() => updateCockpitActiveRunStatus("done")} active={cockpitUpdatingRun === `done-${cockpitActiveRun.id}`} title="Report back, mark active run done, and draft suggested run memory">
                            <Icon name="spark" /> {cockpitUpdatingRun === `done-${cockpitActiveRun.id}` ? "Reporting" : "Report Done"}
                          </ApexCockpitControlButton>
                          <ApexCockpitControlButton className="px-2" disabled={Boolean(cockpitUpdatingRun) || cockpitActiveRun.status === "done" || cockpitActiveRun.status === "archived"} onClick={() => updateCockpitActiveRunStatus("blocked")} active={cockpitUpdatingRun === `blocked-${cockpitActiveRun.id}`} title="Mark active run blocked">
                            <Icon name="alert" /> Block
                          </ApexCockpitControlButton>
                        </div>
                      </>
                    ) : (
                      <div className="grid min-w-0 gap-2 rounded-md border border-emerald-300/16 bg-emerald-400/8 p-2.5" aria-label="Apex private work loop">
                        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-emerald-300">Apex Work Loop</p>
                            <p className="mt-0.5 min-w-0 break-words text-xs font-black text-slate-100">{cockpitNextPrivateMove.title}</p>
                            <p className="mt-0.5 min-w-0 break-words text-[10px] font-bold leading-4 text-emerald-100">{cockpitNextPrivateMove.detail}</p>
                          </div>
                          <div className="flex shrink-0 flex-wrap items-center gap-1.5 sm:justify-end">
                            <ToneBadge tone={cockpitNextPrivateMove.tone || "blue"}>{cockpitNextPrivateMove.status || "Ready"}</ToneBadge>
                            <ApexCockpitControlButton
                              className="px-2"
                              disabled={Boolean(cockpitUpdatingRun) || cockpitCreatingLiveRun}
                              onClick={() => workCockpitActiveRunNextMove()}
                              active={Boolean(cockpitUpdatingRun) || cockpitCreatingLiveRun}
                              title="Let Apex start the next private safe move"
                            >
                              <Icon name="refresh" />
                              {cockpitUpdatingRun || cockpitCreatingLiveRun ? "Working" : cockpitNextPrivateMove.buttonLabel || "Start Run"}
                            </ApexCockpitControlButton>
                          </div>
                        </div>
                        <p className="min-w-0 break-words rounded-md border border-orange-300/12 bg-orange-500/8 px-2.5 py-2 text-[10px] font-bold leading-4 text-orange-100">{cockpitNextPrivateMove.safetyNote}</p>
                      </div>
                    )}
                  </div>
                  ) : null}
                  {cockpitConsoleTab === "pulse" ? (
                  <div className="grid min-w-0 gap-2 rounded-md border border-cyan-200/10 bg-slate-950/48 p-2.5">
                    <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-cyan-300">Proactive Pulse</p>
                        <p className="mt-0.5 min-w-0 break-words text-[10px] font-bold leading-4 text-slate-500">
                          {cockpitLivePulseError || "Auto-checks build, briefing, and live-run status every minute while this page is open."}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-1.5 sm:justify-end">
                        <ApexCockpitControlButton className="px-2" disabled={false} onClick={() => deliverCockpitWatchOfficer({ speak: true })} active={false} title="Speak Apex watch officer report from pulse">
                          <Icon name="phone" /> Speak Watch
                        </ApexCockpitControlButton>
                        <ApexCockpitControlButton className="px-2" disabled={false} onClick={() => deliverCockpitMissionBrief({ speak: true })} active={false} title="Speak Apex mission brief">
                          <Icon name="layers" /> Mission Brief
                        </ApexCockpitControlButton>
                        <ApexCockpitControlButton className="px-2" disabled={false} onClick={() => deliverCockpitOperatorJudgment({ speak: true })} active={false} title="Speak Apex operator judgment">
                          <Icon name="check" /> Speak Judgment
                        </ApexCockpitControlButton>
                        <ApexCockpitControlButton className="px-2" disabled={cockpitLivePulseBusy || !sessionToken} onClick={() => refreshCockpitLivePulse({ automatic: false })} active={cockpitLivePulseBusy} title="Refresh Apex live pulse">
                          <Icon name="refresh" /> {cockpitLivePulseBusy ? "Checking" : "Check Now"}
                        </ApexCockpitControlButton>
                      </div>
                    </div>
                    <div className="grid min-w-0 gap-2 rounded-md border border-cyan-300/14 bg-cyan-400/8 p-2.5" aria-label="Apex watch officer pulse detail">
                      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-cyan-300">Watch Officer Detail</p>
                          <p className="mt-0.5 min-w-0 break-words text-xs font-black text-slate-100">{cockpitWatchOfficer.title}</p>
                          <p className="mt-0.5 min-w-0 break-words text-[10px] font-bold leading-4 text-cyan-100">{cockpitWatchOfficer.detail}</p>
                        </div>
                        <ToneBadge tone={cockpitWatchOfficer.tone}>{cockpitWatchOfficer.status}</ToneBadge>
                      </div>
                      <div className="grid min-w-0 gap-1.5 sm:grid-cols-5">
                        {cockpitWatchOfficer.rows.map((row) => (
                          <div key={`pulse-${row.id}`} className="min-w-0 rounded-md border border-slate-800 bg-slate-950/46 px-2 py-1.5">
                            <p className="truncate text-[8px] font-black uppercase tracking-[0.08em] text-slate-500">{row.label}</p>
                            <p className={`mt-0.5 truncate text-[10px] font-black ${row.tone === "green" ? "text-emerald-300" : row.tone === "amber" ? "text-orange-300" : row.tone === "red" ? "text-red-300" : row.tone === "blue" ? "text-cyan-300" : "text-slate-300"}`}>{row.value}</p>
                            <p className="mt-0.5 line-clamp-2 min-w-0 break-words text-[8px] font-bold leading-3 text-slate-500">{row.detail}</p>
                          </div>
                        ))}
                      </div>
                      <div className="grid min-w-0 gap-1.5 sm:grid-cols-2">
                        <p className="min-w-0 break-words rounded-md border border-cyan-200/10 bg-slate-950/44 px-2.5 py-2 text-[10px] font-bold leading-4 text-cyan-100">{cockpitWatchOfficer.whyItMatters}</p>
                        <p className="min-w-0 break-words rounded-md border border-orange-300/12 bg-orange-500/8 px-2.5 py-2 text-[10px] font-bold leading-4 text-orange-100">{cockpitWatchOfficer.nextAction}</p>
                      </div>
                    </div>
                    <div className="grid min-w-0 gap-1.5 sm:grid-cols-4">
                      {cockpitPulseRows.map((item) => (
                        <div key={item.label} className="min-w-0 rounded-md border border-slate-800 bg-slate-900/48 px-2 py-1.5">
                          <p className="text-[8px] font-black uppercase tracking-[0.08em] text-slate-500">{item.label}</p>
                          <p className={`mt-0.5 truncate text-[10px] font-black ${item.tone === "green" ? "text-emerald-300" : item.tone === "amber" ? "text-orange-300" : item.tone === "red" ? "text-red-300" : "text-slate-300"}`}>{item.value}</p>
                        </div>
                      ))}
                    </div>
                    <div className="grid min-w-0 gap-1.5 sm:grid-cols-2">
                      {cockpitOperatorJudgmentRows.map((item) => (
                        <div key={item.id} className="grid min-w-0 gap-1 rounded-md border border-cyan-200/10 bg-slate-950/52 px-2.5 py-2">
                          <div className="flex min-w-0 items-start justify-between gap-2">
                            <span className="min-w-0">
                              <span className="block truncate text-[10px] font-black text-slate-200">{item.title}</span>
                              <span className="block truncate text-[9px] font-black uppercase tracking-[0.08em] text-cyan-300">{item.status}</span>
                            </span>
                            <span className={`shrink-0 text-[9px] font-black ${item.tone === "green" ? "text-emerald-300" : item.tone === "amber" ? "text-orange-300" : item.tone === "red" ? "text-red-300" : "text-cyan-300"}`}>{item.actionLabel}</span>
                          </div>
                          <p className="line-clamp-2 min-w-0 text-[9px] font-bold leading-4 text-slate-500">{item.detail}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  ) : null}
                  {cockpitConsoleTab === "loop" ? (
                  <div className="grid min-w-0 gap-2 rounded-md border border-cyan-200/10 bg-slate-950/48 p-2.5" aria-label="Apex operator loop lanes">
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-cyan-300">Operator Loop</p>
                      <p className="mt-0.5 min-w-0 break-words text-[10px] font-bold leading-4 text-slate-500">Apex can hear, follow up, act privately, judge the next move, and keep every external action locked.</p>
                    </div>
                    <div className="grid min-w-0 gap-1.5 sm:grid-cols-3">
                    {(liveOperatorMode.operatorLoopRows || []).slice(0, 6).map((item) => (
                      <div key={item.id} className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-md border border-slate-800 bg-slate-950/42 px-2.5 py-2">
                        <Icon name={item.id === "live-loop-validate" || item.id === "live-loop-proof-check" ? "check" : item.id === "live-loop-draft" ? "clipboard" : item.id === "live-loop-monitor" || item.id === "live-loop-cycle" ? "refresh" : "spark"} className={`h-3.5 w-3.5 ${item.tone === "green" ? "text-emerald-300" : item.tone === "amber" ? "text-orange-300" : "text-cyan-300"}`} />
                        <span className="min-w-0">
                          <span className="block truncate text-[10px] font-black text-slate-200">{item.title}</span>
                          <span className="block truncate text-[9px] font-bold text-slate-500">{item.detail}</span>
                        </span>
                        <span className={`shrink-0 text-[9px] font-black uppercase tracking-[0.08em] ${item.tone === "green" ? "text-emerald-300" : item.tone === "amber" ? "text-orange-300" : "text-cyan-300"}`}>{item.status}</span>
                      </div>
                    ))}
                    </div>
                  </div>
                  ) : null}
                </div>
              </section>
              <section className="co-apex-cockpit-mobile-response grid min-w-0 gap-2 rounded-lg border border-cyan-200/14 bg-slate-950/76 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] xl:hidden" aria-label="Apex mobile response">
                <div className="flex min-w-0 items-center justify-between gap-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-cyan-300">Apex Response</p>
                  <ApexCockpitControlButton className="px-2" onClick={() => speakCockpitAnswer()} disabled={!canSpeakCockpitAnswer} active={cockpitSpeaking}>
                    <Icon name="spark" /> {cockpitSpeaking ? "Speaking" : "Speak"}
                  </ApexCockpitControlButton>
                </div>
                <p className={`min-w-0 break-words text-[11px] font-bold leading-5 ${cockpitError ? "text-red-200" : "text-slate-200"}`}>{cockpitError || cockpitAnswerText || "I'm here. Talk to Apex or type if the browser is still waiting on microphone permission."}</p>
                <p className="min-w-0 break-words text-[10px] font-bold leading-4 text-slate-500">{cockpitAgentActionNotice || cockpitVoiceNotice || cockpitRecognitionError || cockpitVoiceHealth.notice}</p>
                {(cockpitAnswerText || cockpitError) ? (
                  <div className="grid min-w-0 gap-1.5 rounded-md border border-cyan-200/10 bg-cyan-400/8 px-2.5 py-2" aria-label="Apex mobile live conversation context">
                    <div className="flex min-w-0 items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[9px] font-black uppercase tracking-[0.12em] text-cyan-300">Conversation Context</p>
                        <p className={`mt-0.5 min-w-0 break-words text-[10px] font-black ${cockpitVisibleConversationContext.tone === "green" ? "text-emerald-300" : cockpitVisibleConversationContext.tone === "amber" ? "text-orange-300" : cockpitVisibleConversationContext.tone === "blue" ? "text-cyan-200" : "text-slate-300"}`}>{cockpitVisibleConversationContext.title}</p>
                      </div>
                      <span className="shrink-0 rounded-md border border-cyan-300/18 bg-slate-950/52 px-2 py-1 text-[8px] font-black uppercase tracking-[0.08em] text-cyan-200">{cockpitVisibleConversationContext.status}</span>
                    </div>
                    <p className="min-w-0 break-words text-[10px] font-bold leading-4 text-slate-400">{cockpitVisibleConversationContext.detail}</p>
                    <p className="min-w-0 break-words text-[10px] font-bold leading-4 text-slate-500">{cockpitVisibleConversationContext.answer}</p>
                    <div className="grid min-w-0 grid-cols-2 gap-1">
                      {cockpitVisibleConversationContext.rows.map((row) => (
                        <div key={`mobile-${row.label}`} className="min-w-0 rounded-md border border-slate-800 bg-slate-950/46 px-2 py-1.5">
                          <p className="truncate text-[8px] font-black uppercase tracking-[0.08em] text-slate-500">{row.label}</p>
                          <p className={`mt-0.5 truncate text-[10px] font-black ${row.tone === "green" ? "text-emerald-300" : row.tone === "amber" ? "text-orange-300" : row.tone === "blue" ? "text-cyan-300" : "text-slate-300"}`}>{row.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                <div className="grid min-w-0 gap-1.5" aria-label="Apex mobile next turn prompts">
                  <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">Next Turn</p>
                  <div className="grid min-w-0 grid-cols-2 gap-1.5">
                    {cockpitFollowUpPrompts.slice(0, 4).map((prompt) => (
                      <button
                        key={prompt.id}
                        type="button"
                        onClick={() => loadCockpitFollowUpPrompt(prompt)}
                        className="co-focus-ring min-h-9 min-w-0 rounded-md border border-slate-800 bg-slate-900/72 px-2 text-left transition hover:border-orange-500/50 hover:bg-orange-500/10"
                      >
                        <span className={`block truncate text-[9px] font-black ${prompt.tone === "green" ? "text-emerald-300" : prompt.tone === "amber" ? "text-orange-300" : prompt.tone === "slate" ? "text-slate-300" : "text-cyan-300"}`}>{prompt.label}</span>
                        <span className="block truncate text-[8px] font-bold text-slate-500">{prompt.question}</span>
                      </button>
                    ))}
                  </div>
                </div>
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
                <div className="grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-4" aria-label="Apex quick next turns">
                  {cockpitVisiblePromptRows.map((prompt) => (
                    <button
                      key={prompt.id}
                      type="button"
                      onClick={() => loadCockpitFollowUpPrompt(prompt)}
                      className="co-focus-ring min-h-9 rounded-lg border border-slate-800 bg-slate-900/82 px-3 text-[11px] font-black text-slate-300 transition hover:border-orange-500/60 hover:text-white"
                    >
                      {prompt.label}
                    </button>
                  ))}
                </div>
                <ApexCockpitCommandStream
                  turns={cockpitTurns}
                  route={cockpitCommandRoute}
                  onOpenRoute={onChange}
                  onOpenModule={onOpenModule}
                  onCreateAgentRequest={() => createCockpitAgentRequestFromCommand()}
                  onCreateLiveRun={() => createCockpitLiveRunFromCommand(askQuestion.trim() || cockpitLastQuestion || cockpitCommandRoute.label, cockpitCommandRoute, { autoCycle: true })}
                  onBrief={() => deliverCockpitBriefing({ speak: true })}
                  onAnswerCurrent={() => {
                    const currentQuestion = askQuestion.trim() || cockpitLastQuestion || "Summarize today";
                    setAskQuestion(currentQuestion);
                    askCockpitQuestion(currentQuestion);
                  }}
                  creatingAgentRequest={cockpitCreatingAgentRequest}
                  creatingLiveRun={cockpitCreatingLiveRun}
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
                <ApexCockpitListItem item={{ label: "Run History", icon: "database" }} value={trustedRunMemoryCount || "Review"} tone={trustedRunMemoryCount ? "green" : pendingRunMemoryCount ? "amber" : "slate"} />
                <ApexCockpitListItem item={{ label: "Trusted Memories", icon: "database" }} value={memoryCount} tone="slate" />
                <ApexCockpitListItem item={{ label: "Suggested Run", icon: "spark" }} value={pendingRunMemoryCount || 0} tone={pendingRunMemoryCount ? "amber" : "slate"} />
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

          <section className="co-apex-cockpit-boundaries grid min-w-0 gap-3 rounded-lg border border-slate-800 bg-slate-950/70 p-3 sm:grid-cols-2 xl:grid-cols-5">
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

function ApexHqDomainBridgePanel({ state, onChange, onOpenModule }) {
  const domain = state.apexHqDomain || {};
  const rows = Array.isArray(domain.rows) ? domain.rows : [];
  const commandRows = Array.isArray(domain.commandRows) ? domain.commandRows : [];
  const blockedRows = Array.isArray(domain.blockedRows) ? domain.blockedRows : [];
  const openTarget = (row = {}) => {
    if (row.moduleId) {
      onOpenModule?.(row.moduleId);
      return;
    }
    if (row.sectionId) onChange?.(row.sectionId);
  };

  return (
    <section className="grid min-w-0 gap-3 rounded-xl border border-cyan-200/12 bg-slate-950/78 p-3 text-white shadow-[0_26px_64px_-46px_rgba(2,6,23,0.92)] sm:p-4" aria-label="Apex HQ Domain bridge">
      <div className="flex min-w-0 flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-cyan-300">Apex HQ Domain</p>
          <h2 className="mt-1 break-words text-lg font-black text-white">Business Workspace</h2>
          <p className="mt-1 max-w-4xl break-words text-[12px] font-bold leading-5 text-slate-300">
            {domain.summary || "Apex can route to Apex HQ business workspaces using existing modules, state, and permissions."}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <ToneBadge tone={domain.tone || "green"}>{domain.status || "Ready"}</ToneBadge>
          <ToneBadge tone="amber">Consequential actions gated</ToneBadge>
        </div>
      </div>

      <div className="grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {rows.length ? rows.map((row) => (
          <button
            key={row.id}
            type="button"
            onClick={() => openTarget(row)}
            disabled={!row.moduleId && !row.sectionId}
            className="co-focus-ring group grid min-w-0 gap-2 rounded-lg border border-slate-800 bg-slate-900/68 p-3 text-left transition hover:border-cyan-300/45 hover:bg-slate-900 disabled:cursor-default disabled:hover:border-slate-800"
          >
            <div className="flex min-w-0 items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-cyan-400/10 text-cyan-200">
                  <Icon name={row.icon || "spark"} className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0">
                  <p className="break-words text-[12px] font-black text-slate-100">{row.title}</p>
                  <p className="break-words text-[10px] font-black uppercase tracking-[0.08em] text-cyan-300">{row.status}</p>
                </div>
              </div>
              {row.moduleId || row.sectionId ? <Icon name="arrowUpRight" className="h-3.5 w-3.5 shrink-0 text-slate-500 transition group-hover:text-cyan-200" /> : null}
            </div>
            <p className="break-words text-[11px] font-bold leading-4 text-slate-400">{row.detail}</p>
            <p className="break-words text-[9px] font-black uppercase tracking-[0.08em] text-slate-500">{(row.examples || []).join(" / ")}</p>
          </button>
        )) : (
          <p className="rounded-lg border border-dashed border-slate-800 p-3 text-[12px] font-bold text-slate-500 sm:col-span-2 xl:col-span-4">Apex HQ domain access is not visible for this user.</p>
        )}
      </div>

      <div className="grid min-w-0 gap-2 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="min-w-0 rounded-lg border border-slate-800 bg-slate-900/54 p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">Command Bridge v0</p>
          <div className="mt-2 flex min-w-0 flex-wrap gap-1.5">
            {commandRows.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => openTarget(row)}
                className="co-focus-ring inline-flex min-h-7 items-center rounded-md border border-slate-800 bg-slate-950/70 px-2 text-[10px] font-black text-slate-300 transition hover:border-cyan-400/50 hover:text-white"
              >
                {row.title}
              </button>
            ))}
          </div>
        </div>
        <div className="min-w-0 rounded-lg border border-orange-300/16 bg-orange-500/[0.06] p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-orange-200">Still asks first</p>
          <div className="mt-2 flex min-w-0 flex-wrap gap-1.5">
            {blockedRows.map((row) => (
              <span key={row.id} className="rounded-md border border-orange-300/16 bg-slate-950/48 px-2 py-1 text-[10px] font-black text-orange-100">
                {row.title}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function BuilderFixHistoryRow({ row }) {
  const files = Array.isArray(row.filesTouched) ? row.filesTouched.slice(0, 5) : [];
  const actions = Array.isArray(row.actionTaken) ? row.actionTaken.slice(0, 4) : [];
  return (
    <div className="grid min-w-0 gap-2 rounded-md border border-slate-800 bg-slate-950/72 p-2.5">
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="break-words text-[12px] font-black text-slate-100">{row.title || "Controlled local fix"}</p>
          <p className="mt-1 break-words text-[11px] font-bold leading-4 text-slate-400">{row.whatApexDid || row.detail}</p>
        </div>
        <ToneBadge tone={row.tone}>{row.status || "recorded"}</ToneBadge>
      </div>
      {row.request ? (
        <p className="break-words text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">Request: {row.request}</p>
      ) : null}
      <div className="grid min-w-0 gap-2 sm:grid-cols-2">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">Files</p>
          <div className="mt-1 flex min-w-0 flex-wrap gap-1">
            {(files.length ? files : ["No patch applied"]).map((file) => (
              <span key={file} className="max-w-full truncate rounded-md border border-emerald-300/12 bg-emerald-400/[0.06] px-2 py-1 text-[10px] font-black text-emerald-100">{file}</span>
            ))}
          </div>
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">Validation</p>
          <p className="mt-1 break-words text-[11px] font-bold text-slate-300">
            {row.validationCommandId ? `${row.validationCommandId}: ${row.validationStatus || "recorded"}` : "No validation command returned."}
          </p>
        </div>
      </div>
      {actions.length ? (
        <div className="flex min-w-0 flex-wrap gap-1">
          {actions.map((action) => (
            <span key={action} className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] font-black text-slate-300">{action}</span>
          ))}
        </div>
      ) : null}
      {row.undoHint ? (
        <p className="break-words text-[10px] font-bold leading-4 text-slate-500">Undo: {row.undoHint}</p>
      ) : null}
    </div>
  );
}

function ApexBuilderModePanel({
  state,
  sessionToken,
  validationReceipts: sharedValidationReceipts = null,
  setValidationReceipts: setSharedValidationReceipts = null,
  fixReceipts: sharedFixReceipts = null,
  setFixReceipts: setSharedFixReceipts = null,
  undoReceipts: sharedUndoReceipts = null,
  setUndoReceipts: setSharedUndoReceipts = null,
}) {
  const [runtimeBuildAwareness, setRuntimeBuildAwareness] = useState(null);
  const [builderRuns, setBuilderRuns] = useState(() => state.autonomyRunCenter?.runRows || []);
  const [localValidationReceipts, setLocalValidationReceipts] = useState([]);
  const [localFixReceipts, setLocalFixReceipts] = useState([]);
  const [localUndoReceipts, setLocalUndoReceipts] = useState([]);
  const validationReceipts = Array.isArray(sharedValidationReceipts) ? sharedValidationReceipts : localValidationReceipts;
  const fixReceipts = Array.isArray(sharedFixReceipts) ? sharedFixReceipts : localFixReceipts;
  const undoReceipts = Array.isArray(sharedUndoReceipts) ? sharedUndoReceipts : localUndoReceipts;
  const pushValidationReceipt = (receipt) => {
    const updater = (current) => [receipt, ...current].slice(0, 6);
    if (typeof setSharedValidationReceipts === "function") setSharedValidationReceipts(updater);
    else setLocalValidationReceipts(updater);
  };
  const pushFixReceipt = (receipt) => {
    const updater = (current) => [receipt, ...current].slice(0, 6);
    if (typeof setSharedFixReceipts === "function") setSharedFixReceipts(updater);
    else setLocalFixReceipts(updater);
  };
  const updateFixReceipts = (updater) => {
    if (typeof setSharedFixReceipts === "function") setSharedFixReceipts(updater);
    else setLocalFixReceipts(updater);
  };
  const pushUndoReceipt = (receipt) => {
    const updater = (current) => [receipt, ...current].slice(0, 6);
    if (typeof setSharedUndoReceipts === "function") setSharedUndoReceipts(updater);
    else setLocalUndoReceipts(updater);
  };
  const [taskDraft, setTaskDraft] = useState("");
  const [fixDraft, setFixDraft] = useState("");
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const taskRowsForState = builderRuns.length ? builderRuns : state.autonomyRunCenter?.runRows || [];
  const builder = buildApexBuilderModeState({
    buildAwareness: runtimeBuildAwareness || state.buildAwareness,
    autonomyRunCenter: { ...(state.autonomyRunCenter || {}), runRows: taskRowsForState },
    executionHandoffs: state.executionHandoffs,
    agentControlPlane: state.agentControlPlane,
    apexActivity: state.apexActivity,
    validationReceipts,
    fixReceipts,
    undoReceipts,
  });
  const canAct = state.canView && Boolean(sessionToken) && !busy;

  function syncBuilderRun(row = {}) {
    if (!row?.id) return;
    setBuilderRuns((current) => {
      const source = current.length ? current : state.autonomyRunCenter?.runRows || [];
      const filtered = source.filter((item) => item.id !== row.id);
      return [row, ...filtered].slice(0, 12);
    });
  }

  async function refreshBuildAwareness() {
    if (!canAct) return;
    setBusy("refresh-build");
    setNotice("Refreshing local build awareness.");
    try {
      const payload = await getApexOsBuildAwareness(sessionToken);
      setRuntimeBuildAwareness(payload?.buildAwareness || null);
      setNotice("Build awareness refreshed from local git, docs, package scripts, runtime metadata, and dist artifacts.");
    } catch (error) {
      setNotice(error?.message || "Build awareness could not refresh.");
    } finally {
      setBusy("");
    }
  }

  async function createBuilderTask() {
    const request = String(taskDraft || "").trim();
    if (!canAct || !request) return;
    setBusy("create-builder-task");
    setNotice("Creating a private builder task.");
    try {
      const payload = await createApexOsAutonomyRun(sessionToken, {
        request,
        routeId: "apex-builder-mode",
        routeLabel: "Apex Builder Mode",
        routeDetail: "Private local app builder task from Apex Home.",
        sourceLabel: "Apex Builder Mode",
        sourceUri: "apex://builder-mode",
        operatorNote: "Private builder task. Apex can track status and run fixed local validation checks; deploy, production, schema/auth/session, deletion, customer-visible writes, sends, spend, orders, booking, permission weakening, and uncontrolled file editing stay blocked.",
      });
      const created = payload?.apexOsAutonomyRun;
      syncBuilderRun(created);
      setTaskDraft("");
      setNotice(created?.id ? `Builder task ${created.id} created.` : "Builder task created.");
    } catch (error) {
      setNotice(error?.message || "Builder task could not be created.");
    } finally {
      setBusy("");
    }
  }

  async function updateBuilderTask(row, status) {
    if (!canAct || !row?.id) return;
    setBusy(`${status}-${row.id}`);
    setNotice(`Updating builder task to ${status}.`);
    try {
      const payload = await updateApexOsAutonomyRun(sessionToken, row.id, {
        status,
        operatorNote: `Apex Builder Mode marked this private builder task ${status}.`,
        nextSafeAction: status === "done"
          ? "Review validation evidence and decide whether to archive or create the next private builder task."
          : status === "blocked"
            ? "Review the blocker, adjust the task, or leave it blocked."
            : "Run scoped local validation, update progress, then report the result.",
      });
      const updated = payload?.apexOsAutonomyRun || row;
      syncBuilderRun(updated);
      setNotice(`Builder task ${updated.id || row.id} marked ${status}.`);
    } catch (error) {
      setNotice(error?.message || "Builder task status could not update.");
    } finally {
      setBusy("");
    }
  }

  async function runValidation(commandId) {
    if (!canAct || !commandId) return;
    setBusy(`validation-${commandId}`);
    setNotice("Running fixed local validation. Custom shell commands are blocked.");
    try {
      const payload = await runApexOsBuilderValidation(sessionToken, { commandId });
      const receipt = payload?.validationRun;
      if (receipt) {
        pushValidationReceipt(receipt);
        setNotice(receipt.receipt || "Local validation finished.");
      } else {
        setNotice("Local validation finished without a receipt.");
      }
    } catch (error) {
      setNotice(error?.message || "Local validation could not run.");
    } finally {
      setBusy("");
    }
  }

  async function runControlledFix({ request = "", fixId = "" } = {}) {
    const safeRequest = String(request || fixDraft || "").trim();
    if (!canAct || (!safeRequest && !fixId)) return;
    const busyId = fixId ? `fix-${fixId}` : "fix-custom";
    setBusy(busyId);
    setNotice("Running controlled local fix. Apex will only use allowlisted local profiles and exact patch rules.");
    try {
      const payload = await runApexOsBuilderFix(sessionToken, {
        request: safeRequest,
        fixId,
        applyPatch: true,
        runValidation: true,
      });
      const receipt = payload?.fixRun;
      if (receipt) {
        pushFixReceipt(receipt);
        setNotice(receipt.receipt || "Controlled local fix finished.");
        if (receipt.ok && safeRequest === fixDraft) setFixDraft("");
      } else {
        setNotice("Controlled local fix finished without a receipt.");
      }
    } catch (error) {
      setNotice(error?.message || "Controlled local fix could not run.");
    } finally {
      setBusy("");
    }
  }

  async function runUndoLastFix() {
    if (!canAct) return;
    const latestFix = fixReceipts.find((receipt) => receipt?.undoAvailable === true && receipt?.status === "fixed" && receipt?.ok === true);
    if (!latestFix) {
      setNotice("No Apex-owned successful local patch is available to undo.");
      return;
    }
    setBusy("undo-last-fix");
    setNotice("Checking the local undo baseline before touching files.");
    try {
      const payload = await runApexOsBuilderUndo(sessionToken, {
        fixRun: latestFix,
        runValidation: true,
      });
      const receipt = payload?.undoRun;
      if (receipt) {
        pushUndoReceipt(receipt);
        if (receipt.ok) {
          updateFixReceipts((current) => current.map((item) => (
            item.id === latestFix.id
              ? { ...item, undoAvailable: false, undoHint: "Apex completed the local undo for this fix receipt." }
              : item
          )));
        }
        setNotice(receipt.receipt || "Local undo finished.");
      } else {
        setNotice("Local undo finished without a receipt.");
      }
    } catch (error) {
      setNotice(error?.message || "Local undo could not run.");
    } finally {
      setBusy("");
    }
  }

  return (
    <section className="grid min-w-0 gap-3 rounded-xl border border-emerald-300/12 bg-slate-950/82 p-3 text-white shadow-[0_26px_64px_-46px_rgba(2,6,23,0.92)] sm:p-4" aria-label="Apex Builder Mode">
      <div className="flex min-w-0 flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-emerald-300">Apex Builder Mode v1.2</p>
          <h2 className="mt-1 break-words text-lg font-black text-white">Build The App With Apex</h2>
          <p className="mt-1 max-w-4xl break-words text-[12px] font-bold leading-5 text-slate-300">{builder.summary}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <ToneBadge tone={builder.tone}>{builder.status}</ToneBadge>
          <ToneBadge tone="green">Patch preview</ToneBadge>
          <ToneBadge tone="green">Local undo</ToneBadge>
          <ToneBadge tone="green">Local checks allowed</ToneBadge>
          <ToneBadge tone="amber">Deploy blocked</ToneBadge>
        </div>
      </div>

      <div className="grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {builder.summaryRows.map((row) => <StatusRow key={row.id} item={row} />)}
      </div>

      <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="grid min-w-0 gap-3 rounded-lg border border-slate-800 bg-slate-900/58 p-3">
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">App State</p>
              <p className="break-words text-sm font-black text-slate-100">{builder.nextAction?.title || "Next useful local action"}</p>
              <p className="mt-1 break-words text-[11px] font-bold leading-4 text-slate-400">{builder.nextAction?.detail}</p>
            </div>
            <Button type="button" variant="secondary" size="sm" onClick={refreshBuildAwareness} disabled={!canAct}>
              <Icon name="refresh" /> {busy === "refresh-build" ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
          <div className="grid min-w-0 gap-1.5">
            {builder.dirtyFileRows.length ? builder.dirtyFileRows.map((row) => (
              <div key={row.id || row.path} className="grid min-w-0 gap-1 rounded-md border border-slate-800 bg-slate-950/62 px-2.5 py-2">
                <p className="break-words text-[11px] font-black text-slate-200">{row.path}</p>
                <p className="break-words text-[10px] font-bold uppercase tracking-[0.08em] text-amber-200">{row.status || row.statusCode || "changed"}</p>
              </div>
            )) : <p className="rounded-md border border-dashed border-slate-800 px-3 py-3 text-[11px] font-bold text-slate-500">No dirty files reported by current build awareness.</p>}
          </div>
        </div>

        <div className="grid min-w-0 gap-3 rounded-lg border border-slate-800 bg-slate-900/58 p-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">Builder Tasks</p>
            <p className="break-words text-sm font-black text-slate-100">{builder.activeTaskCount || 0} active / {builder.taskCount || 0} tracked</p>
          </div>
          <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <label className="sr-only" htmlFor="apex-builder-task">Create builder task</label>
            <input
              id="apex-builder-task"
              value={taskDraft}
              onChange={(event) => setTaskDraft(event.target.value)}
              maxLength={240}
              placeholder="Track a bug or local build step..."
              className="min-h-10 min-w-0 rounded-lg border border-slate-800 bg-slate-950 px-3 text-[12px] font-bold text-slate-100 placeholder:text-slate-500"
              disabled={!state.canView || Boolean(busy)}
            />
            <Button type="button" variant="secondary" size="sm" onClick={createBuilderTask} disabled={!canAct || !taskDraft.trim()}>
              <Icon name="spark" /> {busy === "create-builder-task" ? "Saving..." : "Create"}
            </Button>
          </div>
          <div className="grid min-w-0 gap-2">
            {builder.builderTaskRows.length ? builder.builderTaskRows.map((row) => (
              <div key={row.id} className="grid min-w-0 gap-2 rounded-md border border-slate-800 bg-slate-950/62 p-2.5">
                <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="break-words text-[12px] font-black text-slate-100">{row.title || row.request || "Builder task"}</p>
                    <p className="break-words text-[10px] font-black uppercase tracking-[0.08em] text-cyan-300">{row.status || "planned"}</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-1.5">
                    <button type="button" onClick={() => updateBuilderTask(row, "validating")} disabled={!canAct} className="co-focus-ring min-h-7 rounded-md border border-slate-700 px-2 text-[10px] font-black text-slate-200 disabled:opacity-50">Active</button>
                    <button type="button" onClick={() => updateBuilderTask(row, "done")} disabled={!canAct} className="co-focus-ring min-h-7 rounded-md border border-emerald-400/30 px-2 text-[10px] font-black text-emerald-200 disabled:opacity-50">Done</button>
                    <button type="button" onClick={() => updateBuilderTask(row, "blocked")} disabled={!canAct} className="co-focus-ring min-h-7 rounded-md border border-amber-400/30 px-2 text-[10px] font-black text-amber-200 disabled:opacity-50">Blocked</button>
                  </div>
                </div>
                <p className="break-words text-[11px] font-bold leading-4 text-slate-500">{row.nextSafeAction || row.detail || "Apex can track progress and run local checks, then report the result."}</p>
              </div>
            )) : <p className="rounded-md border border-dashed border-slate-800 px-3 py-3 text-[11px] font-bold text-slate-500">No private builder tasks yet. Create one from a bug, app issue, or next build step.</p>}
          </div>
        </div>
      </div>

      <div className="grid min-w-0 gap-3 rounded-lg border border-emerald-300/14 bg-emerald-400/[0.05] p-3">
        <div className="flex min-w-0 flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-emerald-300">Controlled Local Fixes</p>
            <p className="break-words text-sm font-black text-slate-100">Small scoped app repairs</p>
            <p className="mt-1 break-words text-[11px] font-bold leading-4 text-slate-400">Apex can act inside fixed local profiles for stale copy, import/render, status labels, receipt history, helper/test issues, and scoped layout overflow. Broad rewrites and consequential work stay blocked.</p>
          </div>
          <ToneBadge tone={builder.canApplyControlledLocalFixes ? "green" : "slate"}>{builder.canApplyControlledLocalFixes ? "Fix runner ready" : "Fix runner locked"}</ToneBadge>
        </div>
        <div className="grid min-w-0 gap-2 lg:grid-cols-[minmax(0,1fr)_auto]">
          <label className="sr-only" htmlFor="apex-builder-fix">Controlled fix request</label>
          <input
            id="apex-builder-fix"
            value={fixDraft}
            onChange={(event) => setFixDraft(event.target.value)}
            maxLength={280}
            placeholder="Describe a small local UI/test/helper/layout issue..."
            className="min-h-10 min-w-0 rounded-lg border border-emerald-300/18 bg-slate-950 px-3 text-[12px] font-bold text-slate-100 placeholder:text-slate-500"
            disabled={!state.canView || Boolean(busy)}
          />
          <Button type="button" variant="secondary" size="sm" onClick={() => runControlledFix()} disabled={!canAct || !fixDraft.trim()}>
            <Icon name="spark" /> {busy === "fix-custom" ? "Fixing..." : "Run focused fix"}
          </Button>
        </div>
        <div className="grid min-w-0 gap-2 md:grid-cols-2 xl:grid-cols-4">
          {builder.fixActionRows.map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={() => runControlledFix({ request: fixDraft || row.detail, fixId: row.id })}
              disabled={!canAct}
              className="co-focus-ring grid min-w-0 gap-1 rounded-md border border-emerald-300/12 bg-slate-950/70 p-2.5 text-left transition hover:border-emerald-300/45 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="break-words text-[11px] font-black text-slate-100">{busy === `fix-${row.id}` ? "Fixing..." : row.title}</span>
              <span className="break-words text-[10px] font-bold uppercase tracking-[0.08em] text-emerald-300">{row.status}</span>
              <span className="break-words text-[10px] font-bold leading-4 text-slate-500">{row.detail}</span>
            </button>
          ))}
        </div>
        <div className="grid min-w-0 gap-2 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="grid min-w-0 gap-2 rounded-md border border-slate-800 bg-slate-950/58 p-2.5">
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">Latest Fix History</p>
            {builder.recentFixRows.map((row) => <BuilderFixHistoryRow key={row.id} row={row} />)}
          </div>
          <div className="grid min-w-0 gap-2 rounded-md border border-slate-800 bg-slate-950/58 p-2.5">
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">Fix Boundaries</p>
            <div className="flex min-w-0 flex-wrap gap-1.5">
              {["exact patches only", "baseline checked", "allowlisted files", "focused validation", "auto-revert on failed validation", "no broad rewrites", "no secrets", "no deploy"].map((label) => (
                <span key={label} className="rounded-md border border-emerald-300/12 bg-emerald-400/[0.06] px-2 py-1 text-[10px] font-black text-emerald-100">{label}</span>
              ))}
            </div>
            <p className="break-words text-[11px] font-bold leading-4 text-slate-500">Fix receipts show the request, files touched, action taken, validation result, what Apex did, and undo/revert guidance.</p>
          </div>
        </div>
        <div className="grid min-w-0 gap-2 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <div className="grid min-w-0 gap-2 rounded-md border border-cyan-300/14 bg-cyan-400/[0.045] p-2.5">
            <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-cyan-200">Patch Preview</p>
                <p className="break-words text-[11px] font-bold leading-4 text-slate-400">
                  {builder.latestPatchPreviewSource?.label ? `Latest from ${builder.latestPatchPreviewSource.label}.` : "Exact before/after snippets appear after Apex prepares or applies a controlled fix."}
                </p>
              </div>
              <ToneBadge tone={builder.patchPreviewRows.length ? "green" : "slate"}>{builder.patchPreviewRows.length ? `${builder.patchPreviewRows.length} previewed` : "Waiting"}</ToneBadge>
            </div>
            <div className="grid min-w-0 gap-2">
              {builder.patchPreviewRows.length ? builder.patchPreviewRows.map((row) => (
                <div key={row.id} className="grid min-w-0 gap-2 rounded-md border border-cyan-300/12 bg-slate-950/70 p-2.5">
                  <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                    <p className="break-words text-[11px] font-black text-slate-100">{row.targetFile}</p>
                    <span className="rounded-md border border-cyan-300/16 bg-cyan-400/[0.06] px-2 py-1 text-[10px] font-black text-cyan-100">{row.validationCommand || "Focused validation"}</span>
                  </div>
                  <div className="grid min-w-0 gap-2 md:grid-cols-2">
                    <div className="min-w-0 rounded-md border border-slate-800 bg-slate-950/76 p-2">
                      <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">Search snippet</p>
                      <p className="mt-1 break-words font-mono text-[10px] leading-4 text-slate-300">{row.searchSnippet || "No search snippet."}</p>
                    </div>
                    <div className="min-w-0 rounded-md border border-emerald-300/12 bg-emerald-400/[0.05] p-2">
                      <p className="text-[9px] font-black uppercase tracking-[0.12em] text-emerald-300">Replacement snippet</p>
                      <p className="mt-1 break-words font-mono text-[10px] leading-4 text-emerald-100">{row.replacementSnippet || "No replacement snippet."}</p>
                    </div>
                  </div>
                  <p className="break-words text-[10px] font-bold leading-4 text-slate-400">{row.explanation}</p>
                  <p className="break-words text-[10px] font-bold leading-4 text-cyan-100">{row.expectedResult}</p>
                </div>
              )) : (
                <p className="rounded-md border border-dashed border-cyan-300/14 px-3 py-3 text-[11px] font-bold text-slate-500">Run a controlled local fix or ask Apex to show the patch to populate this preview.</p>
              )}
            </div>
          </div>

          <div className="grid min-w-0 gap-2 rounded-md border border-violet-300/14 bg-violet-400/[0.045] p-2.5">
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-violet-200">Local Undo</p>
                <p className="break-words text-[11px] font-bold leading-4 text-slate-400">Undo only Apex's own last successful scoped patch after a baseline check. No git reset, checkout, deletion, or broad rollback.</p>
              </div>
              <ToneBadge tone={builder.latestSuccessfulFix ? "green" : builder.recentUndoRows.length ? "blue" : "slate"}>
                {builder.latestSuccessfulFix ? "Undo available" : builder.recentUndoRows.length ? "Undo recorded" : "No patch"}
              </ToneBadge>
            </div>
            {builder.latestSuccessfulFix ? (
              <div className="grid min-w-0 gap-2 rounded-md border border-violet-300/12 bg-slate-950/70 p-2.5">
                <p className="break-words text-[12px] font-black text-slate-100">{builder.latestSuccessfulFix.label}</p>
                <p className="break-words text-[10px] font-bold uppercase tracking-[0.08em] text-violet-200">{builder.latestSuccessfulFix.status}</p>
                {builder.latestSuccessfulFix.filesTouched?.length ? (
                  <div className="flex min-w-0 flex-wrap gap-1">
                    {builder.latestSuccessfulFix.filesTouched.map((file) => (
                      <span key={file} className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] font-black text-slate-300">{file}</span>
                    ))}
                  </div>
                ) : null}
                <p className="break-words text-[10px] font-bold leading-4 text-slate-500">{builder.latestSuccessfulFix.undoHint}</p>
              </div>
            ) : (
              <p className="rounded-md border border-dashed border-violet-300/14 px-3 py-3 text-[11px] font-bold text-slate-500">No Apex-owned successful patch is currently undoable. Failed validation patches still auto-revert immediately.</p>
            )}
            <Button type="button" variant="secondary" size="sm" onClick={runUndoLastFix} disabled={!canAct || !builder.latestSuccessfulFix}>
              <Icon name="refresh" /> {busy === "undo-last-fix" ? "Undoing..." : "Undo last Apex patch"}
            </Button>
            <div className="grid min-w-0 gap-2">
              {builder.recentUndoRows.length ? builder.recentUndoRows.map((row) => <BuilderFixHistoryRow key={row.id} row={row} />) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="grid min-w-0 gap-2 rounded-lg border border-slate-800 bg-slate-900/54 p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">Safe Local Checks</p>
          <div className="grid min-w-0 gap-2 sm:grid-cols-2">
            {builder.actionRows.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => runValidation(row.id)}
                disabled={!canAct}
                className="co-focus-ring grid min-w-0 gap-1 rounded-md border border-slate-800 bg-slate-950/70 p-2.5 text-left transition hover:border-emerald-300/45 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="break-words text-[11px] font-black text-slate-100">{busy === `validation-${row.id}` ? "Running..." : row.title}</span>
                <span className="break-words text-[10px] font-bold leading-4 text-slate-500">{row.detail}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid min-w-0 gap-2 rounded-lg border border-slate-800 bg-slate-900/54 p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">Recent Validation / Activity</p>
          <div className="grid min-w-0 gap-2">
            {builder.recentValidationRows.map((row) => <StatusRow key={row.id} item={row} />)}
            {builder.activityRows.length ? builder.activityRows.map((row) => <StatusRow key={row.id} item={row} />) : null}
          </div>
          <p className="break-words text-[11px] font-bold leading-4 text-slate-500">{notice || "Validation receipts appear here after Apex runs a fixed local check."}</p>
        </div>
      </div>

      <div className="rounded-lg border border-orange-300/16 bg-orange-500/[0.06] p-3">
        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-orange-200">Hard Stops</p>
        <div className="mt-2 flex min-w-0 flex-wrap gap-1.5">
          {builder.blockedRows.map((row) => (
            <span key={row.id} className="rounded-md border border-orange-300/16 bg-slate-950/48 px-2 py-1 text-[10px] font-black text-orange-100">{row.title}</span>
          ))}
        </div>
      </div>
    </section>
  );
}

const APEX_HOME_DETAIL_PANELS = Object.freeze([
  { id: "builder", label: "Builder Mode", helper: "Fixes + checks", tone: "green" },
  { id: "patch", label: "Patch Preview", helper: "Before / after", tone: "blue" },
  { id: "undo", label: "Local Undo", helper: "Apex-owned only", tone: "amber" },
  { id: "apex-hq", label: "Apex HQ", helper: "Business workspace", tone: "green" },
  { id: "memory", label: "Memory / Tasks", helper: "Private state", tone: "blue" },
  { id: "voice", label: "Voice", helper: "Live controls", tone: "blue" },
  { id: "activity", label: "Activity", helper: "What changed", tone: "slate" },
]);

function ApexWhatChangedFeedPanel({ feed = {}, activePanel = "", onOpenPanel = () => {} }) {
  const entries = Array.isArray(feed.entries) ? feed.entries : [];
  return (
    <section className="grid min-w-0 gap-3 rounded-xl border border-cyan-300/14 bg-slate-950/88 p-3 text-white shadow-[0_26px_64px_-48px_rgba(2,6,23,0.96)] sm:p-4" aria-label="Apex What Changed Feed">
      <div className="flex min-w-0 flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-cyan-300">What Changed</p>
          <h2 className="mt-1 break-words text-lg font-black text-white">Apex Feed</h2>
          <p className="mt-1 max-w-4xl break-words text-[12px] font-bold leading-5 text-slate-400">{feed.summary || "Apex summarizes recent private/local work here."}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <ToneBadge tone={feed.tone || "slate"}>{feed.status || "Standing by"}</ToneBadge>
          <ToneBadge tone="green">Conversation-first</ToneBadge>
          <ToneBadge tone="amber">Hard stops kept</ToneBadge>
        </div>
      </div>
      <div className="grid min-w-0 gap-2 md:grid-cols-2 xl:grid-cols-4">
        {entries.length ? entries.map((entry) => (
          <div key={entry.id} className="grid min-w-0 gap-2 rounded-lg border border-slate-800 bg-slate-900/70 p-3">
            <div className="flex min-w-0 items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="break-words text-[10px] font-black uppercase tracking-[0.1em] text-cyan-300">{entry.domain}</p>
                <p className="mt-0.5 break-words text-[12px] font-black text-slate-100">{entry.title}</p>
              </div>
              <ToneBadge tone={entry.tone}>{entry.status}</ToneBadge>
            </div>
            <p className="break-words text-[11px] font-bold leading-4 text-slate-400">{entry.detail}</p>
            <div className="flex min-w-0 items-center justify-between gap-2">
              <span className="truncate text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">{entry.createdAt || "Now"}</span>
              {entry.panelId ? (
                <button
                  type="button"
                  onClick={() => onOpenPanel(entry.panelId)}
                  className={`co-focus-ring shrink-0 rounded-md border px-2 py-1 text-[10px] font-black transition ${activePanel === entry.panelId ? "border-orange-300/50 bg-orange-500/14 text-orange-100" : "border-slate-700 bg-slate-950/68 text-slate-300 hover:border-cyan-300/45 hover:text-white"}`}
                >
                  {entry.actionLabel || "Open details"}
                </button>
              ) : null}
            </div>
          </div>
        )) : (
          <p className="rounded-lg border border-dashed border-slate-700 px-3 py-4 text-[12px] font-bold text-slate-500 md:col-span-2 xl:col-span-4">No changes yet. Ask Apex to check the app, run a focused local fix, create a private task, or show Apex HQ.</p>
        )}
      </div>
      <div className="grid min-w-0 gap-2 rounded-lg border border-slate-800 bg-slate-900/54 p-3">
        <div className="flex min-w-0 flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">Summon Details</p>
            <p className="break-words text-[11px] font-bold leading-4 text-slate-400">Detailed panels stay tucked away until John asks for them.</p>
          </div>
          <button type="button" onClick={() => onOpenPanel("")} className="co-focus-ring shrink-0 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-[11px] font-black text-slate-200 hover:border-cyan-300/45">
            Clear the screen
          </button>
        </div>
        <div className="flex min-w-0 flex-wrap gap-1.5">
          {APEX_HOME_DETAIL_PANELS.map((panel) => (
            <button
              key={panel.id}
              type="button"
              onClick={() => onOpenPanel(activePanel === panel.id ? "" : panel.id)}
              className={`co-focus-ring rounded-md border px-2.5 py-2 text-left transition ${activePanel === panel.id ? "border-orange-300/60 bg-orange-500/14 text-white" : "border-slate-800 bg-slate-950/72 text-slate-300 hover:border-cyan-300/45 hover:text-white"}`}
              aria-pressed={activePanel === panel.id}
            >
              <span className="block text-[10px] font-black">{panel.label}</span>
              <span className="block text-[9px] font-bold uppercase tracking-[0.08em] text-slate-500">{panel.helper}</span>
            </button>
          ))}
        </div>
      </div>
      {feed.surfaceRows?.length ? (
        <div className="grid min-w-0 gap-2 rounded-lg border border-violet-300/12 bg-violet-400/[0.04] p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-violet-200">Surface Router v0</p>
          <div className="grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {feed.surfaceRows.map((row) => <StatusRow key={row.id} item={row} />)}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function ApexTalkToApexPulse({ feed = {} }) {
  const entries = Array.isArray(feed.entries) ? feed.entries : [];
  const latest = entries[0] || null;
  const count = Number(feed.entryCount || entries.length || 0);
  return (
    <section className="co-apex-talk-pulse flex min-w-0 flex-col gap-2 rounded-lg border border-cyan-300/14 bg-slate-950/72 px-3 py-2 text-white shadow-[0_18px_54px_-44px_rgba(2,6,23,0.92)] sm:flex-row sm:items-center sm:justify-between" aria-label="Apex what changed pulse">
      <div className="min-w-0">
        <p className="text-[9px] font-black uppercase tracking-[0.12em] text-cyan-300">What Changed Pulse</p>
        <p className="mt-0.5 min-w-0 break-words text-[11px] font-black text-slate-100">
          {count ? `${count} private update${count === 1 ? "" : "s"} tracked` : "Calm standby"}
        </p>
      </div>
      <p className="min-w-0 break-words text-[10px] font-bold leading-4 text-slate-400 sm:max-w-[34rem] sm:text-right">
        {latest ? `${latest.domain}: ${latest.title}` : "Apex will summarize details in conversation when you ask."}
      </p>
    </section>
  );
}

function ApexPatchPreviewDetailPanel({ builder = {}, onOpenBuilder = () => {} }) {
  const rows = Array.isArray(builder.patchPreviewRows) ? builder.patchPreviewRows : [];
  return (
    <section className="grid min-w-0 gap-3 rounded-xl border border-cyan-300/14 bg-slate-950/84 p-3 text-white sm:p-4" aria-label="Apex Patch Preview Detail">
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-cyan-300">Patch Preview</p>
          <h3 className="mt-1 break-words text-base font-black text-white">Exact local patch details</h3>
          <p className="mt-1 break-words text-[11px] font-bold leading-4 text-slate-400">Apex shows target files and before/after snippets before or after controlled local fixes. No free-form patching or external execution is active.</p>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={onOpenBuilder}>Open Builder</Button>
      </div>
      <div className="grid min-w-0 gap-2">
        {rows.length ? rows.map((row) => (
          <div key={row.id} className="grid min-w-0 gap-2 rounded-lg border border-slate-800 bg-slate-900/70 p-3">
            <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
              <p className="break-words text-[12px] font-black text-slate-100">{row.targetFile}</p>
              <ToneBadge tone="blue">{row.validationCommand || "Focused validation"}</ToneBadge>
            </div>
            <div className="grid min-w-0 gap-2 md:grid-cols-2">
              <div className="rounded-md border border-slate-800 bg-slate-950/70 p-2">
                <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">Search snippet</p>
                <p className="mt-1 break-words font-mono text-[10px] leading-4 text-slate-300">{row.searchSnippet}</p>
              </div>
              <div className="rounded-md border border-emerald-300/12 bg-emerald-400/[0.05] p-2">
                <p className="text-[9px] font-black uppercase tracking-[0.12em] text-emerald-300">Replacement snippet</p>
                <p className="mt-1 break-words font-mono text-[10px] leading-4 text-emerald-100">{row.replacementSnippet}</p>
              </div>
            </div>
            <p className="break-words text-[10px] font-bold leading-4 text-slate-400">{row.explanation}</p>
          </div>
        )) : (
          <p className="rounded-lg border border-dashed border-slate-700 px-3 py-4 text-[12px] font-bold text-slate-500">No patch preview yet. Ask Apex to run a controlled local fix or open Builder Mode.</p>
        )}
      </div>
    </section>
  );
}

function ApexLocalUndoDetailPanel({ builder = {}, onOpenBuilder = () => {} }) {
  return (
    <section className="grid min-w-0 gap-3 rounded-xl border border-violet-300/14 bg-slate-950/84 p-3 text-white sm:p-4" aria-label="Apex Local Undo Detail">
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-violet-200">Local Undo</p>
          <h3 className="mt-1 break-words text-base font-black text-white">Apex-owned patch rollback only</h3>
          <p className="mt-1 break-words text-[11px] font-bold leading-4 text-slate-400">Undo only reverses Apex's own last successful scoped patch after a baseline check. It never uses git reset, checkout, deletion, or broad rollback.</p>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={onOpenBuilder}>Open Builder</Button>
      </div>
      {builder.latestSuccessfulFix ? (
        <StatusRow item={{
          id: "latest-undoable-fix",
          title: builder.latestSuccessfulFix.label,
          status: "Undo available",
          detail: builder.latestSuccessfulFix.undoHint,
          tone: "green",
        }} />
      ) : (
        <p className="rounded-lg border border-dashed border-slate-700 px-3 py-4 text-[12px] font-bold text-slate-500">No Apex-owned successful patch is currently undoable. Failed validation patches still auto-revert immediately.</p>
      )}
      <div className="grid min-w-0 gap-2">
        {builder.recentUndoRows?.length ? builder.recentUndoRows.map((row) => <BuilderFixHistoryRow key={row.id} row={row} />) : null}
      </div>
    </section>
  );
}

function ApexMemoryTasksDetailPanel({ state }) {
  const rows = [
    ...(state.personalOperatingLayer?.taskReminderRows || []),
    ...(state.memorySuggestions?.rows || []).slice(0, 4),
  ].slice(0, 8);
  return (
    <section className="grid min-w-0 gap-3 rounded-xl border border-blue-300/14 bg-slate-950/84 p-3 text-white sm:p-4" aria-label="Apex Memory Tasks Detail">
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-cyan-300">Memory / Tasks</p>
        <h3 className="mt-1 break-words text-base font-black text-white">Private state shortcuts</h3>
        <p className="mt-1 break-words text-[11px] font-bold leading-4 text-slate-400">Private memory, task, and reminder signals stay operator-only. Detailed review still lives in the Memory and Personal rooms.</p>
      </div>
      <div className="grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {rows.length ? rows.map((row) => <StatusRow key={row.id || row.title} item={row} />) : (
          <p className="rounded-lg border border-dashed border-slate-700 px-3 py-4 text-[12px] font-bold text-slate-500 sm:col-span-2 xl:col-span-4">No compact memory/task rows are available yet.</p>
        )}
      </div>
    </section>
  );
}

function ApexVoiceDetailPanel({ state }) {
  return (
    <section className="grid min-w-0 gap-3 rounded-xl border border-cyan-300/14 bg-slate-950/84 p-3 text-white sm:p-4" aria-label="Apex Voice Detail">
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-cyan-300">Voice</p>
        <h3 className="mt-1 break-words text-base font-black text-white">{state.voiceInterface?.status || "Voice ready"}</h3>
        <p className="mt-1 break-words text-[11px] font-bold leading-4 text-slate-400">Live voice remains visible in the main cockpit. Typed answers stay visible even if voice playback fails.</p>
      </div>
      <div className="grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {(state.voiceInterface?.modes || []).slice(0, 4).map((row) => <StatusRow key={row.id} item={row} />)}
        {(state.voiceInterface?.safetyRows || []).slice(0, 4).map((row) => <StatusRow key={row.id} item={row} />)}
      </div>
    </section>
  );
}

function ApexHomePanel({ state, activeSection, onChange, askQuestion, setAskQuestion, sessionToken, onOpenAvatarLab, onOpenModule }) {
  const [activeDetailPanel, setActiveDetailPanel] = useState("");
  const [validationReceipts, setValidationReceipts] = useState([]);
  const [fixReceipts, setFixReceipts] = useState([]);
  const [undoReceipts, setUndoReceipts] = useState([]);
  const [commandEvents, setCommandEvents] = useState([]);
  const builderFeedState = buildApexBuilderModeState({
    buildAwareness: state.buildAwareness,
    autonomyRunCenter: state.autonomyRunCenter,
    executionHandoffs: state.executionHandoffs,
    agentControlPlane: state.agentControlPlane,
    apexActivity: state.apexActivity,
    validationReceipts,
    fixReceipts,
    undoReceipts,
  });
  const whatChangedFeed = buildApexWhatChangedFeedState({
    state,
    builderMode: builderFeedState,
    validationReceipts,
    fixReceipts,
    undoReceipts,
    commandEvents,
  });
  function openDetailPanel(panelId = "", route = null) {
    const normalizedPanel = String(panelId || "").trim();
    setActiveDetailPanel(normalizedPanel);
    if (route?.id) {
      setCommandEvents((current) => [{
        id: `${route.id}-${Date.now()}`,
        domain: route.intent?.includes("apex-hq") ? "Apex HQ" : "System",
        title: route.label || "Command routed",
        detail: route.detail || "Apex routed a natural command to a private home surface.",
        status: normalizedPanel ? "active" : "done",
        tone: route.tone || "blue",
        actionLabel: normalizedPanel ? "Open details" : "Show what changed",
        panelId: normalizedPanel || "activity",
        createdAt: "Now",
      }, ...current].slice(0, 6));
    }
  }

  return (
    <section className="grid min-w-0 gap-4">
      <ApexCockpitScreen
        state={state}
        activeSection={activeSection}
        onChange={onChange}
        askQuestion={askQuestion}
        setAskQuestion={setAskQuestion}
        sessionToken={sessionToken}
        onOpenAvatarLab={onOpenAvatarLab}
        onOpenModule={onOpenModule}
        onPanelCommand={openDetailPanel}
        onBuilderFixReceipt={(receipt) => setFixReceipts((current) => [receipt, ...current].slice(0, 6))}
        talkToApexContext={{
          builderMode: builderFeedState,
          whatChangedFeed,
          validationReceipts,
          fixReceipts,
          undoReceipts,
          commandEvents,
        }}
        conversationFirst
      />
      {activeDetailPanel === "activity" ? <ApexTalkToApexPulse feed={whatChangedFeed} /> : null}
      {activeDetailPanel ? (
        <section className="grid min-w-0 gap-3" aria-label="Apex summoned detail panel">
          <div className="flex min-w-0 flex-col gap-2 rounded-xl border border-slate-800 bg-slate-950/86 p-3 text-white sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">Summoned Panel</p>
              <p className="break-words text-sm font-black text-slate-100">{APEX_HOME_DETAIL_PANELS.find((panel) => panel.id === activeDetailPanel)?.label || "Apex details"}</p>
            </div>
            <Button type="button" variant="secondary" size="sm" onClick={() => openDetailPanel("")}>Hide panel</Button>
          </div>
          {activeDetailPanel === "builder" ? (
            <ApexBuilderModePanel
              state={state}
              sessionToken={sessionToken}
              validationReceipts={validationReceipts}
              setValidationReceipts={setValidationReceipts}
              fixReceipts={fixReceipts}
              setFixReceipts={setFixReceipts}
              undoReceipts={undoReceipts}
              setUndoReceipts={setUndoReceipts}
            />
          ) : null}
          {activeDetailPanel === "patch" ? <ApexPatchPreviewDetailPanel builder={builderFeedState} onOpenBuilder={() => openDetailPanel("builder")} /> : null}
          {activeDetailPanel === "undo" ? <ApexLocalUndoDetailPanel builder={builderFeedState} onOpenBuilder={() => openDetailPanel("builder")} /> : null}
          {activeDetailPanel === "apex-hq" ? <ApexHqDomainBridgePanel state={state} onChange={onChange} onOpenModule={onOpenModule} /> : null}
          {activeDetailPanel === "memory" ? <ApexMemoryTasksDetailPanel state={state} /> : null}
          {activeDetailPanel === "voice" ? <ApexVoiceDetailPanel state={state} /> : null}
          {activeDetailPanel === "activity" ? (
            <section className="grid min-w-0 gap-3 rounded-xl border border-slate-800 bg-slate-950/84 p-3 text-white sm:p-4" aria-label="Apex Activity Detail">
              <SectionHeader
                title="Activity / What Changed"
                description="Private internal receipts and compact feed entries."
                action={<ToneBadge tone={whatChangedFeed.tone}>{whatChangedFeed.status}</ToneBadge>}
              />
              <ApexActivityReceiptsPanel state={state} />
            </section>
          ) : null}
        </section>
      ) : null}
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
          {
            id: "activity",
            label: "Activity",
            helper: "What Apex did",
            icon: "check",
            content: (
              <section className="grid min-w-0 gap-4">
                <Card className="min-w-0 p-4 sm:p-5">
                  <SectionHeader
                    title="What Apex Did"
                    description="Recent Level 2 private/internal receipts. Apex acts by default only inside safe private state and reports what changed."
                    action={<ToneBadge tone={state.apexActivity?.tone || "slate"}>{state.apexActivity?.status || "No receipts yet"}</ToneBadge>}
                  />
                  <ApexActivityReceiptsPanel state={state} />
                </Card>
              </section>
            ),
          },
        ]}
      />
    </ControlRoomCategoryShell>
  );
}

function ControlRoomApexSection({ state, activeSection, onChange, sessionToken, askQuestion, setAskQuestion, onOpenAvatarLab, onOpenModule }) {
  return (
    <div className="grid min-w-0 gap-4">
      <ApexHomePanel state={state} activeSection={activeSection} onChange={onChange} askQuestion={askQuestion} setAskQuestion={setAskQuestion} sessionToken={sessionToken} onOpenAvatarLab={onOpenAvatarLab} onOpenModule={onOpenModule} />
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
            id: "suggestions",
            label: "Suggestions",
            helper: "Review memories",
            icon: "spark",
            content: (
              <section className="grid min-w-0 gap-4">
                <Card className="min-w-0 p-4 sm:p-5">
                  <SectionHeader
                    title="Memory Suggestions"
                    description="Review suggested Apex OS memory before it becomes approved private context."
                    action={<ToneBadge tone={state.memorySuggestions?.tone || "blue"}>Review gated</ToneBadge>}
                  />
                  <MemorySuggestionsReviewPanel state={state} sessionToken={sessionToken} />
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
  const openAvatarLab = () => {
    if (typeof props.setActive === "function") props.setActive("apexAvatarLab");
  };
  const openModule = (moduleId) => {
    if (typeof props.setActive === "function" && moduleId) props.setActive(moduleId);
  };

  return (
    <div className={`co-apex-control-room-page min-w-0 max-w-full pb-36 lg:pb-8 ${isApexSection ? "bg-slate-950" : "bg-slate-100"}`}>
      {isApexSection ? (
        <ApexImmersiveHeader state={state} />
      ) : (
        <PageHeader
          eyebrow="Apex"
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
        {activeSection === "apex" ? <ControlRoomApexSection state={state} activeSection={activeSection} onChange={setActiveSection} sessionToken={props.sessionToken} askQuestion={askQuestion} setAskQuestion={setAskQuestion} onOpenAvatarLab={openAvatarLab} onOpenModule={openModule} /> : null}
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
