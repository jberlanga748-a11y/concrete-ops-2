import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";

import {
  buildApexOsVoiceCommandReview,
  parseApexOsVoiceAudioDataUrl,
  sanitizeApexOsVoiceSpeechText,
} from "../shared/apexOsVoice.js";
import {
  getApexVoiceboxProviderStatus,
  speakWithApexVoicebox,
} from "./apexVoiceboxProvider.js";
import {
  APEX_LIGHTWEIGHT_VOICE_ENV,
  getApexLightweightVoiceProviderStatus,
  speakWithApexLightweightVoice,
} from "./apexLightweightVoiceProvider.js";
import {
  APEX_ALWAYS_OPEN_MIC_STATE,
  buildApexAlwaysOpenMicReceipt,
  buildApexAlwaysOpenMicStatus,
  buildApexAlwaysOpenMicTranscriptionGate,
  normalizeApexAlwaysOpenMicState,
} from "../shared/apexAlwaysOpenMicRuntime.js";
import {
  APEX_VOICE_TURN_FAILURE_REASONS,
  buildApexLatencyProfile,
  buildApexVoiceTurnReceipt,
  createApexVoiceTurnId,
  getApexVoiceTurnFailureLabel,
  validateApexVoiceTurnPayload,
} from "../shared/apexVoiceTurnDiagnostics.js";
import {
  APEX_NATIVE_VOICE_ENV,
  getApexNativeVoiceRuntimeStatus,
} from "./apexNativeVoiceRuntime.js";
import {
  saveApexLiveTurnLatencyReceipt,
} from "./apexLiveTurnLatencyHistory.js";

export const APEX_LOCAL_VOICE_ENV = Object.freeze({
  DISABLED: "APEX_LOCAL_VOICE_DISABLED",
  TIMEOUT_MS: "APEX_LOCAL_VOICE_TIMEOUT_MS",
  STT_PROVIDER: "APEX_LOCAL_STT_PROVIDER",
  STT_COMMAND: "APEX_LOCAL_STT_COMMAND",
  STT_COMMAND_ARGS_JSON: "APEX_LOCAL_STT_COMMAND_ARGS_JSON",
  STT_MODEL: "APEX_LOCAL_STT_MODEL",
  STT_MODEL_PATH: "APEX_LOCAL_STT_MODEL_PATH",
  STT_DEVICE: "APEX_LOCAL_STT_DEVICE",
  STT_COMPUTE_TYPE: "APEX_LOCAL_STT_COMPUTE_TYPE",
  TTS_PROVIDER: "APEX_LOCAL_TTS_PROVIDER",
  TTS_COMMAND: "APEX_LOCAL_TTS_COMMAND",
  TTS_VOICE_PATH: "APEX_LOCAL_TTS_VOICE_PATH",
  TTS_VOICE_NAME: "APEX_LOCAL_TTS_VOICE_NAME",
  LIGHTWEIGHT_VOICE_PROVIDER: APEX_LIGHTWEIGHT_VOICE_ENV.PROVIDER,
  LIGHTWEIGHT_VOICE_NAME: APEX_LIGHTWEIGHT_VOICE_ENV.VOICE_NAME,
  LIGHTWEIGHT_VOICE_COMMAND: APEX_LIGHTWEIGHT_VOICE_ENV.COMMAND,
  LIGHTWEIGHT_VOICE_COMMAND_ARGS_JSON: APEX_LIGHTWEIGHT_VOICE_ENV.COMMAND_ARGS_JSON,
  LIGHTWEIGHT_VOICE_REFERENCE_WAV_PATH: APEX_LIGHTWEIGHT_VOICE_ENV.REFERENCE_WAV_PATH,
  NATIVE_VOICE_DISABLED: APEX_NATIVE_VOICE_ENV.DISABLED,
  NATIVE_VOICE_PROVIDER: APEX_NATIVE_VOICE_ENV.PROVIDER,
  NATIVE_VOICE_LISTEN_SECONDS: APEX_NATIVE_VOICE_ENV.LISTEN_SECONDS,
  NATIVE_VOICE_TIMEOUT_MS: APEX_NATIVE_VOICE_ENV.TIMEOUT_MS,
  NATIVE_VOICE_COMMAND: APEX_NATIVE_VOICE_ENV.COMMAND,
  NATIVE_VOICE_COMMAND_ARGS_JSON: APEX_NATIVE_VOICE_ENV.COMMAND_ARGS_JSON,
});

export const APEX_LOCAL_VOICE_STATUS = Object.freeze({
  READY: "ready",
  PARTIAL: "partial",
  MISSING: "missing",
  DISABLED: "disabled",
  ERROR: "error",
});

const DEFAULT_TIMEOUT_MS = 12_000;
const MAX_TIMEOUT_MS = 60_000;
const MAX_TEXT_LENGTH = 900;
const MAX_TRANSCRIPT_LENGTH = 1600;
const MAX_AUDIO_BYTES = 12 * 1024 * 1024;
const PRIVATE_CONFIG = Symbol("apexLocalVoicePrivateConfig");
const DEFAULT_FASTER_WHISPER_MODEL = "small.en";
const FASTER_WHISPER_WRAPPER_PATH = fileURLToPath(new URL("../scripts/apex-faster-whisper-stt.py", import.meta.url));
const apexLocalVoiceSpeechState = {
  ttsActive: false,
  playbackExpected: false,
  isSpeaking: false,
  lastSpeechStartedAt: "",
  lastSpeechEndedAt: "",
};
const apexLocalVoiceTurnState = {
  lastTurnReceipt: null,
};
const APEX_LOCAL_VOICE_STATUS_CACHE_TTL_MS = 3500;
const apexLocalVoiceStatusCache = {
  key: "",
  createdAtMs: 0,
  status: null,
};

function text(value = "", limit = 240) {
  return String(value ?? "").replace(/\s+\n/g, "\n").replace(/\s+/g, " ").trim().slice(0, limit);
}

function lower(value = "", limit = 240) {
  return text(value, limit).toLowerCase();
}

function list(value = []) {
  return Array.isArray(value) ? value : [];
}

function bool(value) {
  return value === true || /^(1|true|yes|on|enabled)$/i.test(String(value || "").trim());
}

function parseTimeoutMs(value = DEFAULT_TIMEOUT_MS) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_TIMEOUT_MS;
  return Math.max(1000, Math.min(MAX_TIMEOUT_MS, Math.round(parsed)));
}

function publicEngineRow({ id, name, status, available = false, local = true, detail = "", action = "", ...extra }) {
  return Object.freeze({
    id: text(id, 80),
    name: text(name || id, 120),
    status: text(status || (available ? "ready" : "missing"), 80),
    available: Boolean(available),
    local: local !== false,
    detail: text(detail, 220),
    action: text(action, 180),
    ...extra,
  });
}

export function getApexLocalVoiceSpeechState() {
  return Object.freeze({ ...apexLocalVoiceSpeechState });
}

export function getApexLocalVoiceLastTurnReceipt() {
  return apexLocalVoiceTurnState.lastTurnReceipt
    ? Object.freeze({ ...apexLocalVoiceTurnState.lastTurnReceipt })
    : null;
}

function storeApexLocalVoiceTurnReceipt(receipt = null) {
  apexLocalVoiceTurnState.lastTurnReceipt = receipt
    ? Object.freeze({ ...receipt })
    : null;
  return apexLocalVoiceTurnState.lastTurnReceipt;
}

function queueApexLiveTurnLatencyReceiptSave(receipt = null, input = {}) {
  if (!receipt || input.saveLatencyReceipt !== true) return;
  saveApexLiveTurnLatencyReceipt(receipt, {
    outputRoot: input.latencyOutputRoot,
  }).catch(() => {});
}

function elapsedMs(startedAt) {
  return Math.max(0, Math.round(performance.now() - startedAt));
}

function buildLocalVoiceTiming({
  turnStartedAt,
  audioParseMs = 0,
  transcriptionTimingMs = 0,
  providerTimingMs = 0,
  clientTimingMs = {},
  ttsGenerationMs = 0,
  playbackStartDelayMs = 0,
  localVoiceStatusDiscoveryMs = 0,
  localVoiceStatusCacheHit = false,
} = {}) {
  const client = clientTimingMs && typeof clientTimingMs === "object" ? clientTimingMs : {};
  return {
    captureDurationMs: Number(client.captureDurationMs || 0) || 0,
    vadSilenceWaitMs: Number(client.vadSilenceWaitMs || client.sustainedSilenceMs || 0) || 0,
    vadActualSilenceMs: Number(client.vadActualSilenceMs || client.silenceDurationMs || 0) || 0,
    voiceCloseMs: Number(client.voiceCloseMs || client.vadActualSilenceMs || client.silenceDurationMs || client.vadSilenceWaitMs || client.sustainedSilenceMs || 0) || 0,
    clientWavConversionMs: Number(client.clientWavConversionMs || client.wavConversionMs || 0) || 0,
    dataUrlCreationMs: Number(client.dataUrlCreationMs || 0) || 0,
    uploadRequestMs: Number(client.uploadRequestMs || 0) || 0,
    serverAudioParseMs: audioParseMs,
    statusDiscoveryMs: localVoiceStatusDiscoveryMs,
    localVoiceStatusDiscoveryMs,
    localVoiceStatusCacheHit: localVoiceStatusCacheHit ? 1 : 0,
    sttMs: transcriptionTimingMs,
    modelFirstTokenMs: Number(client.modelFirstTokenMs || 0) || 0,
    modelTotalMs: Number(client.modelTotalMs || 0) || 0,
    ttsGenerationMs,
    playbackStartDelayMs,
    providerTimingMs,
    totalTurnMs: elapsedMs(turnStartedAt),
  };
}

function markApexLocalVoiceSpeechStarted() {
  const now = new Date().toISOString();
  apexLocalVoiceSpeechState.ttsActive = true;
  apexLocalVoiceSpeechState.playbackExpected = true;
  apexLocalVoiceSpeechState.isSpeaking = true;
  apexLocalVoiceSpeechState.lastSpeechStartedAt = now;
  apexLocalVoiceSpeechState.lastSpeechEndedAt = "";
  return getApexLocalVoiceSpeechState();
}

function markApexLocalVoiceSpeechEnded() {
  const now = new Date().toISOString();
  apexLocalVoiceSpeechState.ttsActive = false;
  apexLocalVoiceSpeechState.playbackExpected = false;
  apexLocalVoiceSpeechState.isSpeaking = false;
  apexLocalVoiceSpeechState.lastSpeechEndedAt = now;
  return getApexLocalVoiceSpeechState();
}

async function fileExists(filePath = "") {
  if (!String(filePath || "").trim()) return false;
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function parseJsonFromCommandOutput(value = "") {
  const raw = String(value || "").trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(raw.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function normalizePythonProbeRuntime(value = {}) {
  const runtime = value || {};
  return Object.freeze({
    provider: "faster-whisper-python",
    available: Boolean(runtime.available),
    moduleAvailable: Boolean(runtime.moduleAvailable ?? runtime.faster_whisper),
    ctranslate2Available: Boolean(runtime.ctranslate2Available ?? runtime.ctranslate2),
    cudaAvailable: Boolean(runtime.cudaAvailable || Number(runtime.cudaDeviceCount || runtime.cuda_device_count || 0) > 0),
    cudaDeviceCount: Math.max(0, Number(runtime.cudaDeviceCount || runtime.cuda_device_count || 0) || 0),
    supportedComputeTypes: Object.freeze(list(runtime.supportedComputeTypes || runtime.supported_compute_types_cuda0 || [])),
    wrapperAvailable: Boolean(runtime.wrapperAvailable ?? runtime.wrapperExists ?? true),
    pythonCommand: text(runtime.pythonCommand || "python", 120),
    modelName: text(runtime.modelName || DEFAULT_FASTER_WHISPER_MODEL, 120),
    fallbackReason: text(runtime.fallbackReason || runtime.error || "", 220),
  });
}

async function detectFasterWhisperPythonRuntime(input = {}) {
  if (input.fasterWhisperPythonRuntime) {
    return normalizePythonProbeRuntime(input.fasterWhisperPythonRuntime);
  }
  if (input.disableSttAutoDiscovery || input.sttAutoDiscovery === false) {
    return normalizePythonProbeRuntime({
      available: false,
      wrapperAvailable: false,
      fallbackReason: "STT auto-discovery disabled for this check.",
    });
  }
  const platform = input.platform || process.platform;
  if (platform !== "win32" && !input.allowNonWindowsSttAutoDiscovery) {
    return normalizePythonProbeRuntime({
      available: false,
      wrapperAvailable: false,
      fallbackReason: "Apex STT auto-discovery is enabled for John's Windows local runtime first.",
    });
  }
  const wrapperAvailable = await fileExists(FASTER_WHISPER_WRAPPER_PATH);
  if (!wrapperAvailable) {
    return normalizePythonProbeRuntime({
      available: false,
      wrapperAvailable: false,
      fallbackReason: "Apex faster-whisper wrapper script is missing.",
    });
  }
  const pythonCommand = text(input.pythonCommand || "python", 120) || "python";
  const probeScript = [
    "import json, importlib.util",
    "result={}",
    "result['faster_whisper']=bool(importlib.util.find_spec('faster_whisper'))",
    "result['ctranslate2']=bool(importlib.util.find_spec('ctranslate2'))",
    "try:",
    " import ctranslate2",
    " result['cuda_device_count']=ctranslate2.get_cuda_device_count() if hasattr(ctranslate2,'get_cuda_device_count') else 0",
    " result['supported_compute_types_cuda0']=sorted(list(ctranslate2.get_supported_compute_types('cuda',0))) if result['cuda_device_count'] and hasattr(ctranslate2,'get_supported_compute_types') else []",
    "except Exception as exc:",
    " result['cuda_device_count']=0",
    " result['error']='ctranslate2 probe failed'",
    "print(json.dumps(result))",
  ].join("\n");
  const probe = await runCommandWithInput(pythonCommand, ["-c", probeScript], {
    timeoutMs: Math.min(5000, parseTimeoutMs(input.discoveryTimeoutMs || 5000)),
  });
  if (!probe.ok) {
    return normalizePythonProbeRuntime({
      available: false,
      wrapperAvailable,
      pythonCommand,
      fallbackReason: "Python faster-whisper probe failed.",
    });
  }
  const parsed = parseJsonFromCommandOutput(probe.stdout) || {};
  const moduleAvailable = Boolean(parsed.faster_whisper);
  const ctranslate2Available = Boolean(parsed.ctranslate2);
  const cudaDeviceCount = Math.max(0, Number(parsed.cuda_device_count || 0) || 0);
  return normalizePythonProbeRuntime({
    available: wrapperAvailable && moduleAvailable && ctranslate2Available,
    moduleAvailable,
    ctranslate2Available,
    cudaAvailable: cudaDeviceCount > 0,
    cudaDeviceCount,
    supportedComputeTypes: parsed.supported_compute_types_cuda0 || [],
    wrapperAvailable,
    pythonCommand,
    modelName: input.sttModel || input.env?.[APEX_LOCAL_VOICE_ENV.STT_MODEL] || DEFAULT_FASTER_WHISPER_MODEL,
    fallbackReason: moduleAvailable && ctranslate2Available
      ? ""
      : "Install faster-whisper and ctranslate2 in the local Python environment.",
  });
}

function normalizeProvider(value = "", fallback = "") {
  const normalized = lower(value || fallback, 80).replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return normalized || fallback;
}

function parseCommandArgsJson(value = "") {
  if (Array.isArray(value)) return value.map((entry) => text(entry, 500)).filter(Boolean);
  const raw = String(value || "").trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((entry) => text(entry, 500)).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function formatCommandArgs(args = [], replacements = {}) {
  return args.map((arg) => {
    let next = String(arg);
    for (const [key, value] of Object.entries(replacements)) {
      next = next.replaceAll(`{${key}}`, String(value ?? ""));
    }
    return next;
  });
}

function providerMatches(configProvider = "", candidates = []) {
  const normalized = normalizeProvider(configProvider, "");
  return candidates.some((candidate) => normalized === normalizeProvider(candidate, ""));
}

function safeDevice(value = "cuda") {
  const normalized = lower(value || "cuda", 40);
  if (["cuda", "gpu", "cpu", "auto"].includes(normalized)) return normalized === "gpu" ? "cuda" : normalized;
  return "cuda";
}

function safeComputeType(value = "float16") {
  const normalized = lower(value || "float16", 40);
  if (["float16", "int8_float16", "int8", "float32", "auto"].includes(normalized)) return normalized;
  return "float16";
}

export function readApexLocalVoiceRuntimeConfig(input = {}) {
  const env = input.env || process.env || {};
  const disabled = bool(input.disabled ?? env[APEX_LOCAL_VOICE_ENV.DISABLED]);
  const timeoutMs = parseTimeoutMs(input.timeoutMs || env[APEX_LOCAL_VOICE_ENV.TIMEOUT_MS]);
  const sttProviderConfigured = Boolean(input.sttProvider || env[APEX_LOCAL_VOICE_ENV.STT_PROVIDER]);
  const sttProvider = normalizeProvider(input.sttProvider || env[APEX_LOCAL_VOICE_ENV.STT_PROVIDER], "faster-whisper-cuda");
  const ttsProvider = normalizeProvider(input.ttsProvider || env[APEX_LOCAL_VOICE_ENV.TTS_PROVIDER], "windows-sapi");
  const sttCommand = text(input.sttCommand || env[APEX_LOCAL_VOICE_ENV.STT_COMMAND] || "", 240);
  const sttCommandArgs = parseCommandArgsJson(input.sttCommandArgs || env[APEX_LOCAL_VOICE_ENV.STT_COMMAND_ARGS_JSON]);
  const sttModel = text(input.sttModel || env[APEX_LOCAL_VOICE_ENV.STT_MODEL] || "", 180);
  const sttModelPath = text(input.sttModelPath || env[APEX_LOCAL_VOICE_ENV.STT_MODEL_PATH] || "", 500);
  const sttDevice = safeDevice(input.sttDevice || env[APEX_LOCAL_VOICE_ENV.STT_DEVICE] || "cuda");
  const sttComputeType = safeComputeType(input.sttComputeType || env[APEX_LOCAL_VOICE_ENV.STT_COMPUTE_TYPE] || "float16");
  const ttsCommand = text(input.ttsCommand || env[APEX_LOCAL_VOICE_ENV.TTS_COMMAND] || "", 240);
  const ttsVoicePath = text(input.ttsVoicePath || env[APEX_LOCAL_VOICE_ENV.TTS_VOICE_PATH] || "", 500);
  const ttsVoiceName = text(input.ttsVoiceName || env[APEX_LOCAL_VOICE_ENV.TTS_VOICE_NAME] || "", 160);

  return Object.freeze({
    provider: "apex-local-voice",
    disabled,
    timeoutMs,
    sttProvider,
    sttProviderConfigured,
    ttsProvider,
    sttCommandConfigured: Boolean(sttCommand),
    sttCommandArgsConfigured: Boolean(sttCommandArgs.length),
    sttModelConfigured: Boolean(sttModel || sttModelPath),
    sttModelPathConfigured: Boolean(sttModelPath),
    sttDevice,
    sttComputeType,
    preferredSttProcessor: sttDevice === "cuda" ? "gpu" : sttDevice === "auto" ? "mixed" : "cpu",
    ttsCommandConfigured: Boolean(ttsCommand),
    ttsVoicePathConfigured: Boolean(ttsVoicePath),
    ttsVoiceNameConfigured: Boolean(ttsVoiceName),
    envNamesOnly: Object.freeze({ ...APEX_LOCAL_VOICE_ENV }),
    secretsExposed: false,
    tokenExposed: false,
    baseUrlExposed: false,
    [PRIVATE_CONFIG]: Object.freeze({
      sttCommand,
      sttCommandArgs,
      sttModel,
      sttModelPath,
      sttDevice,
      sttComputeType,
      ttsCommand,
      ttsVoicePath,
      ttsVoiceName,
    }),
  });
}

function selectTtsEngine(rows = []) {
  return rows.find((row) => row.available && row.id === "apex-lightweight-kokoro")
    || rows.find((row) => row.available && row.id === "piper")
    || rows.find((row) => row.available && row.id === "windows-sapi")
    || rows.find((row) => row.available)
    || null;
}

function selectPremiumTtsEngine(rows = []) {
  return rows.find((row) => row.available && row.id === "voicebox-apex" && row.premiumEligible)
    || rows.find((row) => row.available && row.id === "voicebox-fallback" && row.premiumEligible)
    || null;
}

function wantsPremiumVoice(input = {}) {
  return /\b(premium|voicebox|heavy)\b/i.test(`${input.voice || ""} ${input.voiceMode || ""} ${input.mode || ""}`);
}

function selectFastLocalTtsEngine(rows = []) {
  return rows.find((row) => row.available && row.id === "windows-sapi")
    || rows.find((row) => row.available && row.id === "piper")
    || rows.find((row) => row.available)
    || null;
}

function wantsFastLocalVoice(input = {}) {
  const voiceHint = `${input.voice || ""} ${input.voiceMode || ""} ${input.mode || ""}`;
  return Boolean(input.preferFastVoice || input.fastVoice || input.lowLatencyVoice)
    || /\b(fast|simple|plain|rough|low[- ]?latency|windows[- ]?sapi|no[- ]?premium)\b/i.test(voiceHint);
}

function selectSttEngine(rows = []) {
  return rows.find((row) => row.available && row.id === "faster-whisper-cuda")
    || rows.find((row) => row.available && row.id === "whisper.cpp-cuda")
    || rows.find((row) => row.available && row.id === "faster-whisper")
    || rows.find((row) => row.available && row.id === "whisper.cpp")
    || rows.find((row) => row.available && row.id === "windows-sapi")
    || rows.find((row) => row.available)
    || null;
}

export async function getApexLocalVoiceRuntimeStatus(input = {}) {
  const config = input.config?.provider === "apex-local-voice" ? input.config : readApexLocalVoiceRuntimeConfig(input);
  const platform = input.platform || process.platform;
  const privateConfig = config[PRIVATE_CONFIG] || {};
  const sttModelExists = await fileExists(privateConfig.sttModelPath);
  const ttsVoiceExists = await fileExists(privateConfig.ttsVoicePath);
  const isWindows = platform === "win32";
  let nativeVoice = input.nativeVoice || getApexNativeVoiceRuntimeStatus({
    env: input.env,
    platform,
    config: input.nativeVoiceConfig,
  });

  if (config.disabled) {
    return Object.freeze({
      provider: "apex-local-voice",
      status: APEX_LOCAL_VOICE_STATUS.DISABLED,
      available: false,
      canHearLocally: false,
      canSpeakLocally: false,
      selectedSttEngine: null,
      selectedTtsEngine: null,
      nativeVoice,
      inputModes: Object.freeze([]),
      nativeInputAvailable: Boolean(nativeVoice.available),
      preferredInputMode: nativeVoice.available ? nativeVoice.selectedInputMode : "browser-audio-worklet-wav",
      browserMicRequired: !nativeVoice.available,
      sttEngines: Object.freeze([]),
      ttsEngines: Object.freeze([]),
      conversionTools: Object.freeze([]),
      missing: Object.freeze(["Local Voice Runtime is disabled by server config."]),
      openAiAudioUsed: false,
      cloudAudioAllowed: false,
      audioStored: false,
      browserPlaybackIsFallbackOnly: true,
      speechState: getApexLocalVoiceSpeechState(),
      alwaysOpenMic: buildApexAlwaysOpenMicStatus(input.alwaysOpenMic || { state: APEX_ALWAYS_OPEN_MIC_STATE.STANDBY }),
      lastVoiceTurn: getApexLocalVoiceLastTurnReceipt(),
      secretsExposed: false,
      tokenExposed: false,
      envNamesOnly: config.envNamesOnly,
    });
  }

  const fasterWhisperRuntime = await detectFasterWhisperPythonRuntime(input);
  const sttModelValue = privateConfig.sttModel || privateConfig.sttModelPath || (fasterWhisperRuntime.available ? fasterWhisperRuntime.modelName : "");
  const sttCommandLooksWhisperCpp = /\b(whisper-cli|whisper-cpp|whisper\.cpp|main(?:\.exe)?)\b/i.test(privateConfig.sttCommand || "");
  const sttCommandLooksFasterWhisper = /\bfaster[-_ ]?whisper\b/i.test(privateConfig.sttCommand || "");
  const configuredFasterWhisperReady = providerMatches(config.sttProvider, ["faster-whisper-cuda", "faster-whisper"])
    && (config.sttProviderConfigured || sttCommandLooksFasterWhisper)
    && config.sttCommandConfigured
    && Boolean(sttModelValue);
  const discoveredFasterWhisperReady = providerMatches(config.sttProvider, ["faster-whisper-cuda", "faster-whisper"])
    && !config.sttCommandConfigured
    && fasterWhisperRuntime.available;
  const fasterWhisperConfigured = configuredFasterWhisperReady || discoveredFasterWhisperReady;
  const fasterWhisperDevice = configuredFasterWhisperReady
    ? config.sttDevice
    : fasterWhisperRuntime.cudaAvailable
      ? "cuda"
      : "cpu";
  const fasterWhisperProcessor = fasterWhisperDevice === "cuda" ? "gpu" : fasterWhisperDevice === "auto" ? "mixed" : "cpu";
  const fasterWhisperComputeType = config.sttComputeType || (fasterWhisperDevice === "cuda" ? "float16" : "int8");
  const fasterWhisperCommandArgs = privateConfig.sttCommandArgs?.length
    ? privateConfig.sttCommandArgs
    : discoveredFasterWhisperReady
      ? [
        FASTER_WHISPER_WRAPPER_PATH,
        "--model",
        "{model}",
        "--device",
        "{device}",
        "--compute_type",
        "{computeType}",
        "--output_dir",
        "{outputDir}",
        "--output_format",
        "txt",
        "{audioPath}",
      ]
      : [];
  const fasterWhisperPrivateConfig = Object.freeze({
    sttCommand: privateConfig.sttCommand || fasterWhisperRuntime.pythonCommand || "python",
    sttCommandArgs: fasterWhisperCommandArgs,
    sttModel: sttModelValue || DEFAULT_FASTER_WHISPER_MODEL,
    sttModelPath: privateConfig.sttModelPath || "",
    sttDevice: fasterWhisperDevice,
    sttComputeType: fasterWhisperComputeType,
  });
  const whisperCppConfigured = providerMatches(config.sttProvider, ["whisper.cpp-cuda", "whisper-cpp-cuda", "whisper.cpp", "whisper-cpp"])
    || (!config.sttProviderConfigured && sttCommandLooksWhisperCpp)
    ? config.sttCommandConfigured && config.sttModelPathConfigured && sttModelExists
    : false;

  const voicebox = await getApexVoiceboxProviderStatus({
    env: input.env,
    fetchImpl: input.voiceboxFetchImpl || input.fetchImpl,
    resourceGuard: input.voiceboxResourceGuard,
    processRows: input.voiceboxProcessRows,
  });
  const lightweightVoice = await getApexLightweightVoiceProviderStatus({
    env: input.env,
    commandAvailable: input.lightweightCommandAvailable,
    config: input.lightweightVoiceConfig,
    loadPersistedConfig: input.loadPersistedConfig,
    persistedVoiceConfig: input.persistedVoiceConfig,
    lockedVoiceConfig: input.lockedVoiceConfig,
    kokoroOnnxPackageAvailable: input.kokoroOnnxPackageAvailable,
    dataDir: input.dataDir,
    configPath: input.configPath,
  });

  const sttRows = [
    publicEngineRow({
      id: "faster-whisper-cuda",
      name: "faster-whisper CUDA",
      available: fasterWhisperConfigured && fasterWhisperDevice === "cuda",
      status: fasterWhisperConfigured && fasterWhisperDevice === "cuda" ? "ready" : fasterWhisperRuntime.available ? "cpu-only" : "config-needed",
      detail: "Preferred local GPU transcription through faster-whisper, Python module discovery, CUDA device, and local model.",
      action: fasterWhisperConfigured && fasterWhisperDevice === "cuda"
        ? "Apex will use local GPU faster-whisper before Windows SAPI. OpenAI audio is not used."
        : fasterWhisperRuntime.fallbackReason || "Install faster-whisper locally, keep CUDA available, or configure APEX_LOCAL_STT_COMMAND and APEX_LOCAL_STT_MODEL.",
      processor: "gpu",
      gpuCapable: true,
      preferred: true,
      device: "cuda",
      computeType: fasterWhisperComputeType,
      modelName: sttModelValue || DEFAULT_FASTER_WHISPER_MODEL,
      autoDiscovered: Boolean(discoveredFasterWhisperReady),
      fallbackReason: fasterWhisperConfigured && fasterWhisperDevice === "cuda" ? "" : fasterWhisperRuntime.fallbackReason,
      [PRIVATE_CONFIG]: fasterWhisperPrivateConfig,
    }),
    publicEngineRow({
      id: "whisper.cpp-cuda",
      name: "whisper.cpp CUDA",
      available: whisperCppConfigured && providerMatches(config.sttProvider, ["whisper.cpp-cuda", "whisper-cpp-cuda"]),
      status: whisperCppConfigured && providerMatches(config.sttProvider, ["whisper.cpp-cuda", "whisper-cpp-cuda"]) ? "ready" : "config-needed",
      detail: "Preferred local GPU transcription through a CUDA-built whisper.cpp command and local model path.",
      action: "Configure APEX_LOCAL_STT_PROVIDER=whisper.cpp-cuda, APEX_LOCAL_STT_COMMAND, and APEX_LOCAL_STT_MODEL_PATH.",
      processor: "gpu",
      gpuCapable: true,
      preferred: true,
      device: "cuda",
    }),
    publicEngineRow({
      id: "whisper.cpp",
      name: "whisper.cpp",
      available: whisperCppConfigured,
      status: whisperCppConfigured ? "ready" : "config-needed",
      detail: "Local transcription through a configured whisper.cpp command and model path. Prefer the CUDA provider when available.",
      action: "Configure APEX_LOCAL_STT_COMMAND and APEX_LOCAL_STT_MODEL_PATH.",
      processor: providerMatches(config.sttProvider, ["whisper.cpp-cuda", "whisper-cpp-cuda"]) ? "gpu" : "cpu",
      gpuCapable: providerMatches(config.sttProvider, ["whisper.cpp-cuda", "whisper-cpp-cuda"]),
    }),
    publicEngineRow({
      id: "faster-whisper",
      name: "faster-whisper",
      available: fasterWhisperConfigured,
      status: fasterWhisperConfigured ? "ready" : "planned",
      detail: "Local faster-whisper can use CUDA or CPU depending on configured device. CUDA is preferred for Apex.",
      action: fasterWhisperConfigured
        ? `Apex can transcribe through faster-whisper on ${fasterWhisperProcessor}.`
        : "Configure APEX_LOCAL_STT_PROVIDER=faster-whisper-cuda with command/model or install faster-whisper for auto-discovery.",
      processor: fasterWhisperProcessor,
      gpuCapable: true,
      device: fasterWhisperDevice,
      computeType: fasterWhisperComputeType,
      modelName: sttModelValue || DEFAULT_FASTER_WHISPER_MODEL,
      autoDiscovered: Boolean(discoveredFasterWhisperReady),
      fallbackReason: fasterWhisperConfigured ? "" : fasterWhisperRuntime.fallbackReason,
      [PRIVATE_CONFIG]: fasterWhisperPrivateConfig,
    }),
    publicEngineRow({
      id: "windows-sapi",
      name: "Windows SAPI",
      available: isWindows,
      status: isWindows ? "ready" : "unavailable",
      detail: "Emergency local CPU dictation fallback for WAV microphone audio. It is not preferred when GPU Whisper is configured and does not call OpenAI.",
      action: isWindows ? "Apex will use this only when configured GPU STT is missing or fails." : "Windows SAPI requires Windows.",
      processor: "cpu",
      gpuCapable: false,
      emergencyFallbackOnly: true,
    }),
    publicEngineRow({
      id: "vosk",
      name: "Vosk",
      available: false,
      status: "planned",
      detail: "Vosk is a future local STT option; no cloud fallback is used.",
      action: "Use whisper.cpp first for this slice.",
    }),
  ];
  const conversionRows = [
    publicEngineRow({
      id: "browser-web-audio-wav",
      name: "Browser Web Audio WAV conversion",
      available: true,
      status: "client-ready",
      detail: "The /apex client converts MediaRecorder audio to local WAV before sending it to server-side STT. No ffmpeg is required for this path.",
      action: "Keep typed fallback available if this browser cannot decode the recorded microphone format.",
    }),
    publicEngineRow({
      id: "ffmpeg",
      name: "ffmpeg",
      available: false,
      status: "optional",
      detail: "ffmpeg is optional for future server-side conversion. It is not required for the Windows SAPI v1 path.",
      action: "Install ffmpeg only if a future provider needs server-side audio conversion.",
    }),
  ];
  const ttsRows = [
    publicEngineRow({
      id: "apex-lightweight-kokoro",
      name: "Kokoro ONNX",
      available: lightweightVoice.canSpeakWithLockedVoice,
      status: lightweightVoice.canSpeakWithLockedVoice ? "ready" : lightweightVoice.status,
      detail: lightweightVoice.canSpeakWithLockedVoice
        ? `Locked Apex lightweight voice is ready through Kokoro ONNX (${lightweightVoice.voiceId || lightweightVoice.voiceName || "am_michael"}) on CPU.`
        : "Locked Apex lightweight voice target is Kokoro ONNX, but local package/model validation still needs attention.",
      action: lightweightVoice.canSpeakWithLockedVoice
        ? "Use the locked Apex lightweight voice by default."
        : lightweightVoice.installSteps.join(" "),
      lockedVoice: true,
      voiceIdentityLocked: true,
      defaultEligible: true,
      provider: "kokoro-onnx",
      modelId: lightweightVoice.modelId || "",
      voiceId: lightweightVoice.voiceId || "",
      dtype: lightweightVoice.dtype || "",
      processor: lightweightVoice.processor || "cpu/onnx",
      sampleRate: lightweightVoice.sampleRate || 24000,
      outputFormat: lightweightVoice.outputFormat || "wav",
      voiceName: lightweightVoice.voiceName || "",
      voiceNameDiscovery: lightweightVoice.voiceNameDiscovery,
      commandName: lightweightVoice.commandName || "",
      providerCompatibility: lightweightVoice.providerCompatibility,
    }),
    publicEngineRow({
      id: "piper",
      name: "Piper",
      available: config.ttsProvider === "piper" && config.ttsCommandConfigured && config.ttsVoicePathConfigured && ttsVoiceExists,
      status: config.ttsProvider === "piper" && config.ttsCommandConfigured && config.ttsVoicePathConfigured && ttsVoiceExists ? "ready" : "config-needed",
      detail: "Piper local TTS is the practical fallback if the locked Kokoro/OfflineTTS-compatible voice is unavailable.",
      action: "Configure APEX_LOCAL_TTS_PROVIDER=piper, APEX_LOCAL_TTS_COMMAND, and APEX_LOCAL_TTS_VOICE_PATH.",
      fallbackFor: "apex-lightweight-kokoro",
    }),
    publicEngineRow({
      id: "windows-sapi",
      name: "Windows SAPI",
      available: isWindows,
      status: isWindows ? "ready" : "unavailable",
      detail: "Windows SAPI is emergency local TTS only. It is not the locked Apex voice, browser speech synthesis, or OpenAI.",
      action: isWindows ? "Temporary fallback when Kokoro/Piper cannot speak." : "Windows SAPI requires Windows.",
      fallbackFor: "apex-lightweight-kokoro",
      emergencyFallbackOnly: true,
    }),
    publicEngineRow({
      id: "voicebox-apex",
      name: "Voicebox Apex premium",
      available: voicebox.canSpeakWithApexProfile,
      status: voicebox.canSpeakWithApexProfile ? voicebox.resourceGuard?.status || "optional-premium" : voicebox.status,
      detail: voicebox.canSpeakWithApexProfile
        ? "Voicebox Apex profile is available only for explicit premium/test mode. It is heavy and not required for normal Apex speech."
        : voicebox.action || "Voicebox Apex profile is not ready and is not required for normal Apex speech.",
      action: voicebox.canSpeakWithApexProfile ? voicebox.resourceGuard?.action || "Use only when John explicitly requests premium voice." : voicebox.manualImportInstruction,
      defaultEligible: false,
      optionalPremium: true,
      premiumEligible: Boolean(voicebox.premiumEligible),
      heavyProvider: true,
    }),
    publicEngineRow({
      id: "voicebox-fallback",
      name: "Voicebox fallback premium",
      available: voicebox.canSpeakWithFallbackProfile,
      status: voicebox.canSpeakWithFallbackProfile ? voicebox.resourceGuard?.status || "optional-premium" : voicebox.status,
      detail: voicebox.canSpeakWithFallbackProfile
        ? "Voicebox fallback is available only for explicit premium/test mode. It is never the normal voice."
        : "Voicebox fallback profile is not ready and is not required for normal Apex speech.",
      action: voicebox.canSpeakWithFallbackProfile ? voicebox.resourceGuard?.action || "Use only when John explicitly requests premium voice." : voicebox.manualImportInstruction,
      defaultEligible: false,
      optionalPremium: true,
      premiumEligible: Boolean(voicebox.premiumEligible),
      heavyProvider: true,
    }),
  ];
  const selectedSttEngine = selectSttEngine(sttRows);
  const selectedTtsEngine = selectTtsEngine(ttsRows);
  nativeVoice = input.nativeVoice || getApexNativeVoiceRuntimeStatus({
    env: input.env,
    platform,
    config: input.nativeVoiceConfig,
    localSttEngine: selectedSttEngine,
  });
  const inputRows = [
    publicEngineRow({
      id: "windows-native-wav-gpu",
      name: "Native Windows mic",
      available: Boolean(nativeVoice.available),
      status: nativeVoice.available ? "ready" : nativeVoice.status || "missing",
      detail: "Native Voice Runtime v1 captures one Windows microphone WAV on the server side, then hands it to local STT so browser audio blob conversion is bypassed for explicit manual voice turns.",
      action: nativeVoice.available
        ? "Use this before browser mic for manual voice turns so bad browser audio data cannot loop the turn."
        : nativeVoice.missing?.join(" ") || "Use browser mic fallback until native mic is ready.",
      ingressProvider: nativeVoice.ingressProvider || "windows-native-wav-gpu",
      captureProvider: nativeVoice.captureProvider || "windows-mci-waveaudio",
      sttProvider: nativeVoice.sttProvider || selectedSttEngine?.id || "",
      sttProcessor: nativeVoice.sttProcessor || selectedSttEngine?.processor || "",
      browserMicRequired: false,
      browserAudioConversionUsed: false,
      preferred: Boolean(nativeVoice.available),
      explicitTurnOnly: true,
      localSttHandoff: Boolean(nativeVoice.localSttHandoff),
    }),
    publicEngineRow({
      id: "browser-audio-worklet-wav",
      name: "Browser mic fallback",
      available: true,
      status: "client-ready",
      detail: "The /apex browser microphone path remains available as a visible fallback with local WAV conversion before server-side STT.",
      action: "Use this when native Windows mic is unavailable or John explicitly wants browser mode.",
      ingressProvider: "browser",
      browserMicRequired: true,
      browserAudioConversionUsed: true,
      preferred: !nativeVoice.available,
      explicitTurnOnly: false,
    }),
  ];
  const canHearLocally = Boolean(selectedSttEngine);
  const canSpeakLocally = Boolean(selectedTtsEngine);
  const lockedLightweightVoiceReady = Boolean(lightweightVoice.canSpeakWithLockedVoice);
  const status = canHearLocally && canSpeakLocally && lockedLightweightVoiceReady
    ? APEX_LOCAL_VOICE_STATUS.READY
    : canHearLocally || canSpeakLocally
      ? APEX_LOCAL_VOICE_STATUS.PARTIAL
      : APEX_LOCAL_VOICE_STATUS.MISSING;
  const missing = [
    !canHearLocally ? "Configure local STT with whisper.cpp or faster-whisper; browser captions are fallback only." : "",
    !lockedLightweightVoiceReady ? lightweightVoice.missing.join(" ") : "",
    !canSpeakLocally ? "Configure local TTS with Kokoro, Piper, or Windows SAPI; browser playback is fallback only." : "",
  ].filter(Boolean);

  return Object.freeze({
    provider: "apex-local-voice",
    status,
    available: status === APEX_LOCAL_VOICE_STATUS.READY || status === APEX_LOCAL_VOICE_STATUS.PARTIAL,
    canHearLocally,
    canSpeakLocally,
    selectedSttEngine,
    selectedTtsEngine,
    sttEngines: Object.freeze(sttRows),
    ttsEngines: Object.freeze(ttsRows),
    conversionTools: Object.freeze(conversionRows),
    inputModes: Object.freeze(inputRows),
    nativeVoice,
    nativeInputAvailable: Boolean(nativeVoice.available),
    nativeMicProvider: nativeVoice.selectedInputMode || "",
    preferredInputMode: nativeVoice.available ? nativeVoice.selectedInputMode : "browser-audio-worklet-wav",
    browserMicRequired: !nativeVoice.available,
    lightweightVoice,
    lockedLightweightVoiceReady,
    voiceIdentityLocked: true,
    voiceIdentity: "apex-lightweight",
    voiceProviderOrder: Object.freeze(["apex-lightweight-kokoro", "piper", "windows-sapi", "voicebox-premium-only"]),
    sttProviderOrder: Object.freeze(["faster-whisper-cuda", "whisper.cpp-cuda", "faster-whisper", "whisper.cpp", "windows-sapi"]),
    sttProcessor: selectedSttEngine?.processor || "unknown",
    sttGpuCapable: Boolean(selectedSttEngine?.gpuCapable),
    sttFallbackActive: Boolean(selectedSttEngine && selectedSttEngine.id === "windows-sapi"),
    sttModelConfigured: Boolean(sttModelValue),
    fallbackActive: Boolean(selectedTtsEngine && selectedTtsEngine.id !== "apex-lightweight-kokoro"),
    fallbackLabel: selectedTtsEngine && selectedTtsEngine.id !== "apex-lightweight-kokoro" ? selectedTtsEngine.name : "",
    voicebox,
    voiceboxDefaultActive: false,
    voiceboxOptionalPremium: true,
    voiceboxNotRequired: true,
    speechState: getApexLocalVoiceSpeechState(),
    alwaysOpenMic: buildApexAlwaysOpenMicStatus(input.alwaysOpenMic || { state: APEX_ALWAYS_OPEN_MIC_STATE.STANDBY }),
    lastVoiceTurn: getApexLocalVoiceLastTurnReceipt(),
    missing: Object.freeze(missing),
    openAiAudioUsed: false,
    cloudAudioAllowed: false,
    audioStored: false,
    browserPlaybackIsFallbackOnly: true,
    promptsSentToCloud: false,
    audioSentToCloud: false,
    noOpenAiAudio: true,
    secretsExposed: false,
    tokenExposed: false,
    envNamesOnly: config.envNamesOnly,
  });
}

function buildLocalVoiceStatusCacheKey(input = {}) {
  const config = input.config?.provider === "apex-local-voice" ? input.config : readApexLocalVoiceRuntimeConfig(input);
  const privateConfig = config[PRIVATE_CONFIG] || {};
  const fingerprint = crypto.createHash("sha1").update(JSON.stringify({
    disabled: config.disabled,
    sttProvider: config.sttProvider,
    sttProviderConfigured: config.sttProviderConfigured,
    sttCommandConfigured: config.sttCommandConfigured,
    sttCommandArgsConfigured: config.sttCommandArgsConfigured,
    sttModelConfigured: config.sttModelConfigured,
    sttModelPathConfigured: config.sttModelPathConfigured,
    sttDevice: config.sttDevice,
    sttComputeType: config.sttComputeType,
    ttsProvider: config.ttsProvider,
    ttsCommandConfigured: config.ttsCommandConfigured,
    ttsVoicePathConfigured: config.ttsVoicePathConfigured,
    ttsVoiceNameConfigured: config.ttsVoiceNameConfigured,
    sttCommand: privateConfig.sttCommand,
    sttCommandArgs: privateConfig.sttCommandArgs,
    sttModel: privateConfig.sttModel,
    sttModelPath: privateConfig.sttModelPath,
    ttsCommand: privateConfig.ttsCommand,
    ttsVoicePath: privateConfig.ttsVoicePath,
    ttsVoiceName: privateConfig.ttsVoiceName,
    disableSttAutoDiscovery: input.disableSttAutoDiscovery,
    sttAutoDiscovery: input.sttAutoDiscovery,
    fasterWhisperPythonRuntime: input.fasterWhisperPythonRuntime || null,
    lightweightVoiceConfig: input.lightweightVoiceConfig || null,
    loadPersistedConfig: input.loadPersistedConfig,
    kokoroOnnxPackageAvailable: input.kokoroOnnxPackageAvailable,
  })).digest("hex").slice(0, 16);
  return [
    input.cacheKey || "default",
    input.platform || process.platform,
    config.disabled ? "disabled" : "enabled",
    fingerprint,
  ].map((part) => text(part, 80)).join("|");
}

export function clearApexLocalVoiceRuntimeStatusCache() {
  apexLocalVoiceStatusCache.key = "";
  apexLocalVoiceStatusCache.createdAtMs = 0;
  apexLocalVoiceStatusCache.status = null;
  return Object.freeze({ provider: "apex-local-voice", cacheCleared: true });
}

export async function getCachedApexLocalVoiceRuntimeStatus(input = {}) {
  const ttlMsRaw = Number(input.cacheTtlMs ?? APEX_LOCAL_VOICE_STATUS_CACHE_TTL_MS);
  const ttlMs = Number.isFinite(ttlMsRaw) && ttlMsRaw > 0 ? Math.max(250, Math.min(30_000, Math.round(ttlMsRaw))) : APEX_LOCAL_VOICE_STATUS_CACHE_TTL_MS;
  const cacheAllowed = input.cache !== false && input.bypassCache !== true && input.forceRefresh !== true;
  const key = buildLocalVoiceStatusCacheKey(input);
  const nowMs = Date.now();
  const cacheAgeMs = Math.max(0, nowMs - apexLocalVoiceStatusCache.createdAtMs);
  if (cacheAllowed && apexLocalVoiceStatusCache.status && apexLocalVoiceStatusCache.key === key && cacheAgeMs <= ttlMs) {
    return Object.freeze({
      ...apexLocalVoiceStatusCache.status,
      cached: true,
      cacheHit: true,
      cacheAgeMs,
      cacheTtlMs: ttlMs,
    });
  }
  const startedAt = performance.now();
  const status = await getApexLocalVoiceRuntimeStatus(input);
  const discoveryTimingMs = Math.max(0, Math.round(performance.now() - startedAt));
  const freshStatus = Object.freeze({
    ...status,
    cached: false,
    cacheHit: false,
    cacheAgeMs: 0,
    cacheTtlMs: ttlMs,
    discoveryTimingMs,
  });
  if (cacheAllowed) {
    apexLocalVoiceStatusCache.key = key;
    apexLocalVoiceStatusCache.createdAtMs = nowMs;
    apexLocalVoiceStatusCache.status = freshStatus;
  }
  return freshStatus;
}

function runCommandWithInput(command, args = [], { input = null, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill("SIGKILL");
      resolve({ ok: false, code: -1, stdout, stderr: "timeout" });
    }, timeoutMs);
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk || "").slice(0, 8000);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk || "").slice(0, 8000);
    });
    child.on("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve({ ok: false, code: -1, stdout, stderr: text(error?.message || "command failed", 500) });
    });
    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve({ ok: code === 0, code, stdout, stderr });
    });
    if (input !== null && input !== undefined) {
      child.stdin.end(input);
    } else {
      child.stdin.end();
    }
  });
}

async function withTempDir(fn) {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "apex-local-voice-"));
  try {
    return await fn(tempRoot);
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
}

async function speakWithWindowsSapi(textToSpeak, config = {}) {
  return withTempDir(async (tempRoot) => {
    const textPath = path.join(tempRoot, "speech.txt");
    const outputPath = path.join(tempRoot, "speech.wav");
    const scriptPath = path.join(tempRoot, "speak.ps1");
    const escapedTextPath = textPath.replace(/'/g, "''");
    const escapedOutputPath = outputPath.replace(/'/g, "''");
    const privateConfig = config[PRIVATE_CONFIG] || {};
    const voiceName = text(privateConfig.ttsVoiceName || "", 160).replace(/'/g, "''");
    const script = [
      "Add-Type -AssemblyName System.Speech",
      "$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer",
      voiceName ? `$synth.SelectVoice('${voiceName}')` : "",
      `$text = Get-Content -LiteralPath '${escapedTextPath}' -Raw`,
      `$synth.SetOutputToWaveFile('${escapedOutputPath}')`,
      "$synth.Speak($text)",
      "$synth.Dispose()",
    ].filter(Boolean).join("\n");
    await fs.writeFile(textPath, textToSpeak, "utf8");
    await fs.writeFile(scriptPath, script, "utf8");
    const result = await runCommandWithInput("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", scriptPath], {
      timeoutMs: config.timeoutMs,
    });
    if (!result.ok) {
      return { ok: false, error: "Windows SAPI local TTS failed." };
    }
    const audio = await fs.readFile(outputPath);
    return {
      ok: true,
      audioBase64: audio.toString("base64"),
      contentType: "audio/wav",
      engine: "windows-sapi",
    };
  });
}

async function speakWithPiper(textToSpeak, config = {}) {
  return withTempDir(async (tempRoot) => {
    const outputPath = path.join(tempRoot, "speech.wav");
    const privateConfig = config[PRIVATE_CONFIG] || {};
    const result = await runCommandWithInput(privateConfig.ttsCommand, [
      "--model",
      privateConfig.ttsVoicePath,
      "--output_file",
      outputPath,
    ], {
      input: textToSpeak,
      timeoutMs: config.timeoutMs,
    });
    if (!result.ok) return { ok: false, error: "Piper local TTS failed." };
    const audio = await fs.readFile(outputPath);
    return {
      ok: true,
      audioBase64: audio.toString("base64"),
      contentType: "audio/wav",
      engine: "piper",
    };
  });
}

export async function speakWithApexLocalVoice(input = {}) {
  const turnId = text(input.turnId || input.voiceTurnId || "", 110);
  const speechText = sanitizeApexOsVoiceSpeechText(input.text || "").slice(0, MAX_TEXT_LENGTH);
  if (!speechText) {
    return {
      ok: false,
      provider: "apex-local-voice",
      providerFallback: true,
      fallbackText: "",
      error: "Apex local voice speech requires text.",
      openAiAudioUsed: false,
      cloudAudioAllowed: false,
      browserPlaybackIsFallbackOnly: true,
      audioStored: false,
    };
  }
  const config = input.config?.provider === "apex-local-voice" ? input.config : readApexLocalVoiceRuntimeConfig(input);
  const statusDiscoveryStarted = performance.now();
  const status = await getCachedApexLocalVoiceRuntimeStatus({
    ...input,
    config,
    cacheTtlMs: input.cacheTtlMs ?? 10_000,
  });
  const localVoiceStatusDiscoveryMs = Number(status.discoveryTimingMs || 0)
    || Math.max(0, Math.round(performance.now() - statusDiscoveryStarted));
  const localVoiceStatusCacheHit = Boolean(status.cacheHit);
  const premiumRequested = wantsPremiumVoice(input);
  const fastVoiceRequested = wantsFastLocalVoice(input) && !premiumRequested;
  const selectedEngine = fastVoiceRequested
    ? selectFastLocalTtsEngine(status.ttsEngines) || status.selectedTtsEngine
    : premiumRequested
    ? selectPremiumTtsEngine(status.ttsEngines) || status.selectedTtsEngine
    : status.selectedTtsEngine;
  if (!selectedEngine) {
    return {
      ok: false,
      provider: "apex-local-voice",
      providerConfigured: false,
      providerFallback: true,
      fallbackText: speechText,
      audioBase64: "",
      contentType: "",
      audioStored: false,
      openAiAudioUsed: false,
      cloudAudioAllowed: false,
      browserPlaybackIsFallbackOnly: true,
      localVoiceStatus: status,
      error: status.missing.join(" ") || "Local TTS is not configured.",
    };
  }

  const selectedId = selectedEngine.id;
  let spoken = null;
  const generationStarted = performance.now();
  const speechStateStarted = markApexLocalVoiceSpeechStarted();
  if ((selectedId === "voicebox-apex" || selectedId === "voicebox-fallback") && premiumRequested) {
    spoken = await speakWithApexVoicebox({
      ...input,
      text: speechText,
      status: status.voicebox,
      fetchImpl: input.voiceboxFetchImpl || input.fetchImpl,
    });
    if (!spoken?.ok && (input.platform === "win32" || (!input.platform && process.platform === "win32"))) {
      const windowsFallback = await speakWithWindowsSapi(speechText, config);
      if (windowsFallback.ok) {
        spoken = {
          ...windowsFallback,
          providerFallback: true,
          fallbackFrom: selectedId,
          fallbackReason: spoken?.error || "Voicebox local TTS failed.",
        };
      }
    }
  } else if (selectedId === "apex-lightweight-kokoro") {
    spoken = await speakWithApexLightweightVoice({
      ...input,
      text: speechText,
      status: status.lightweightVoice,
    });
    if (!spoken?.ok && (input.platform === "win32" || (!input.platform && process.platform === "win32"))) {
      const windowsFallback = await speakWithWindowsSapi(speechText, config);
      if (windowsFallback.ok) {
        spoken = {
          ...windowsFallback,
          providerFallback: true,
          fallbackFrom: selectedId,
          fallbackReason: spoken?.error || "Apex lightweight Kokoro/OfflineTTS-compatible voice failed.",
        };
      }
    }
  } else if (selectedId === "piper") {
    spoken = await speakWithPiper(speechText, config);
    if (spoken.ok) {
      spoken = {
        ...spoken,
        providerFallback: !status.lockedLightweightVoiceReady,
        fallbackFrom: status.lockedLightweightVoiceReady ? "" : "apex-lightweight-kokoro",
        fallbackReason: status.lockedLightweightVoiceReady ? "" : status.lightweightVoice?.missing?.join(" ") || "Apex lightweight Kokoro/OfflineTTS-compatible voice is not ready.",
      };
    }
  } else {
    spoken = await speakWithWindowsSapi(speechText, config);
    if (spoken.ok) {
      spoken = {
        ...spoken,
        providerFallback: !status.lockedLightweightVoiceReady,
        fallbackFrom: status.lockedLightweightVoiceReady ? "" : "apex-lightweight-kokoro",
        fallbackReason: status.lockedLightweightVoiceReady ? "" : status.lightweightVoice?.missing?.join(" ") || "Apex lightweight Kokoro/OfflineTTS-compatible voice is not ready.",
      };
    }
  }
  const speechStateEnded = markApexLocalVoiceSpeechEnded();
  if (!spoken.ok) {
    const generationTimingMs = Math.max(0, Math.round(performance.now() - generationStarted));
    const latencyProfile = buildApexLatencyProfile({
      turnId,
      voiceReceipt: {
        turnId,
        timingMs: {
          statusDiscoveryMs: localVoiceStatusDiscoveryMs,
          localVoiceStatusDiscoveryMs,
          localVoiceStatusCacheHit: localVoiceStatusCacheHit ? 1 : 0,
          ttsGenerationMs: generationTimingMs,
        },
        localVoiceStatusCacheHit,
        localVoiceStatusDiscoveryMs,
      },
      ttsReceipt: {
        generationTimingMs,
        engine: selectedId,
        status: "failed",
      },
      warmRuntime: {
        voice: {
          ready: status.canHearLocally && status.canSpeakLocally,
          canHearLocally: status.canHearLocally,
          canSpeakLocally: status.canSpeakLocally,
        },
      },
    });
    const receipt = {
      id: `ALV-${crypto.randomUUID()}`,
      turnId,
      lastTurnId: turnId,
      status: "failed",
      provider: "apex-local-voice",
      engine: selectedId,
      ttsProvider: selectedId,
      generationTimingMs,
      timingMs: {
        statusDiscoveryMs: localVoiceStatusDiscoveryMs,
        localVoiceStatusDiscoveryMs,
        localVoiceStatusCacheHit: localVoiceStatusCacheHit ? 1 : 0,
        ttsGenerationMs: generationTimingMs,
      },
      localVoiceStatusCacheHit,
      localVoiceStatusDiscoveryMs,
      latencyProfile,
      liveTurnLatency: latencyProfile.liveTurn,
      speechState: speechStateEnded,
      audioStored: false,
      openAiAudioUsed: false,
      cloudAudioAllowed: false,
      createdAt: new Date().toISOString(),
    };
    queueApexLiveTurnLatencyReceiptSave(receipt, input);
    return {
      ok: false,
      provider: "apex-local-voice",
      providerConfigured: true,
      providerFallback: true,
      fallbackText: speechText,
      audioBase64: "",
      contentType: "",
      audioStored: false,
      openAiAudioUsed: false,
      cloudAudioAllowed: false,
      browserPlaybackIsFallbackOnly: true,
      localVoiceStatus: status,
      error: spoken.error || "Local TTS failed.",
      generationTimingMs,
      speechState: speechStateEnded,
      localVoiceStatusCacheHit,
      localVoiceStatusDiscoveryMs,
      latencyProfile,
      liveTurnLatency: latencyProfile.liveTurn,
      receipt,
    };
  }
  const generationTimingMs = Number(spoken.generationTimingMs || 0)
    || Math.max(0, Math.round(performance.now() - generationStarted));
  const latencyProfile = buildApexLatencyProfile({
    turnId,
    voiceReceipt: {
      turnId,
      timingMs: {
        statusDiscoveryMs: localVoiceStatusDiscoveryMs,
        localVoiceStatusDiscoveryMs,
        localVoiceStatusCacheHit: localVoiceStatusCacheHit ? 1 : 0,
        ttsGenerationMs: generationTimingMs,
      },
      localVoiceStatusCacheHit,
      localVoiceStatusDiscoveryMs,
    },
    ttsReceipt: {
      generationTimingMs,
      engine: spoken.engine,
      status: "spoken",
    },
    warmRuntime: {
      voice: {
        ready: status.canHearLocally && status.canSpeakLocally,
        canHearLocally: status.canHearLocally,
        canSpeakLocally: status.canSpeakLocally,
      },
    },
  });
  const receipt = {
    id: `ALV-${crypto.randomUUID()}`,
    turnId,
    lastTurnId: turnId,
    status: "spoken",
    provider: "apex-local-voice",
    engine: spoken.engine,
    profileName: spoken.profileName || "",
    modelId: spoken.modelId || "",
    voiceId: spoken.voiceId || spoken.profileName || "",
    dtype: spoken.dtype || "",
    ttsProcessor: spoken.processor || "",
    sampleRate: spoken.sampleRate || 0,
    outputFormat: spoken.outputFormat || "",
    voiceIdentity: status.voiceIdentity,
    voiceIdentityLocked: status.voiceIdentityLocked,
    locked: selectedId === "apex-lightweight-kokoro" && !spoken.providerFallback,
    providerFallback: Boolean(spoken.providerFallback),
    fallbackFrom: spoken.fallbackFrom || "",
    fallbackReason: spoken.fallbackReason || "",
    selectedTtsEngine: selectedId,
    ttsProvider: spoken.ttsProvider || selectedId,
    ttsEngine: spoken.engine,
    generationTimingMs,
    timingMs: {
      statusDiscoveryMs: localVoiceStatusDiscoveryMs,
      localVoiceStatusDiscoveryMs,
      localVoiceStatusCacheHit: localVoiceStatusCacheHit ? 1 : 0,
      ttsGenerationMs: generationTimingMs,
    },
    localVoiceStatusCacheHit,
    localVoiceStatusDiscoveryMs,
    latencyProfile,
    liveTurnLatency: latencyProfile.liveTurn,
    speechState: speechStateEnded,
    audioStored: false,
    openAiAudioUsed: false,
    cloudAudioAllowed: false,
    createdAt: new Date().toISOString(),
  };
  queueApexLiveTurnLatencyReceiptSave(receipt, input);
  return {
    ok: true,
    provider: "apex-local-voice",
    providerConfigured: true,
    providerFallback: Boolean(spoken.providerFallback),
    fallbackFrom: spoken.fallbackFrom || "",
    fallbackReason: spoken.fallbackReason || "",
    engine: spoken.engine,
    profileName: spoken.profileName || "",
    modelId: spoken.modelId || "",
    voiceId: spoken.voiceId || spoken.profileName || "",
    dtype: spoken.dtype || "",
    ttsProcessor: spoken.processor || "",
    sampleRate: spoken.sampleRate || 0,
    outputFormat: spoken.outputFormat || "",
    voiceIdentity: status.voiceIdentity,
    voiceIdentityLocked: status.voiceIdentityLocked,
    locked: selectedId === "apex-lightweight-kokoro" && !spoken.providerFallback,
    selectedTtsEngine: selectedId,
    ttsProvider: spoken.ttsProvider || selectedId,
    generationTimingMs,
    localVoiceStatusCacheHit,
    localVoiceStatusDiscoveryMs,
    latencyProfile,
    liveTurnLatency: latencyProfile.liveTurn,
    speechState: speechStateEnded,
    speechStateStarted,
    audioBase64: spoken.audioBase64,
    contentType: spoken.contentType,
    audioStored: false,
    openAiAudioUsed: false,
    cloudAudioAllowed: false,
    browserPlaybackIsFallbackOnly: true,
      aiDisclosure: spoken.aiDisclosure || (fastVoiceRequested
      ? `Apex used the fast simple local ${spoken.engine} voice for this test. Kokoro remains available, Voicebox is optional premium only, and OpenAI audio was not used.`
      : spoken.providerFallback
      ? `Apex is locked to the lightweight Kokoro/OfflineTTS-compatible voice, but that path is not ready for this request, so it spoke through local ${spoken.engine} temporary fallback. Voicebox is optional premium only; OpenAI audio was not used.`
      : premiumRequested && /^voicebox/i.test(spoken.engine || "")
        ? `Apex used optional premium Voicebox for this explicit test request. Normal Apex speech remains locked to lightweight Kokoro/OfflineTTS. OpenAI audio was not used.`
        : `Apex spoke through local ${spoken.engine}. OpenAI audio was not used.`),
    localVoiceStatus: status,
    receipt,
  };
}

async function transcribeWithWhisperCpp(parsedAudio, config = {}) {
  return withTempDir(async (tempRoot) => {
    const audioPath = path.join(tempRoot, `voice.${parsedAudio.extension || "webm"}`);
    const outputBase = path.join(tempRoot, "transcript");
    await fs.writeFile(audioPath, Buffer.from(parsedAudio.base64, "base64"));
    const privateConfig = config[PRIVATE_CONFIG] || {};
    const result = await runCommandWithInput(privateConfig.sttCommand, [
      "-m",
      privateConfig.sttModelPath,
      "-f",
      audioPath,
      "-otxt",
      "-of",
      outputBase,
    ], {
      timeoutMs: config.timeoutMs,
    });
    if (!result.ok) return { ok: false, transcript: "", error: "Local whisper.cpp transcription failed." };
    let transcript = "";
    try {
      transcript = text(await fs.readFile(`${outputBase}.txt`, "utf8"), MAX_TRANSCRIPT_LENGTH);
    } catch {
      transcript = text(result.stdout || "", MAX_TRANSCRIPT_LENGTH);
    }
    return { ok: Boolean(transcript), transcript, error: transcript ? "" : "Local whisper.cpp returned no transcript." };
  });
}

async function transcribeWithFasterWhisper(parsedAudio, config = {}, selectedEngine = null) {
  return withTempDir(async (tempRoot) => {
    const audioPath = path.join(tempRoot, `voice.${parsedAudio.extension || "webm"}`);
    const outputDir = path.join(tempRoot, "out");
    await fs.mkdir(outputDir, { recursive: true });
    await fs.writeFile(audioPath, Buffer.from(parsedAudio.base64, "base64"));
    const privateConfig = selectedEngine?.[PRIVATE_CONFIG] || config[PRIVATE_CONFIG] || {};
    const model = privateConfig.sttModel || privateConfig.sttModelPath;
    const defaultArgs = [
      "--model",
      model,
      "--device",
      privateConfig.sttDevice || "cuda",
      "--compute_type",
      privateConfig.sttComputeType || "float16",
      "--output_dir",
      outputDir,
      "--output_format",
      "txt",
      audioPath,
    ];
    const args = privateConfig.sttCommandArgs?.length
      ? formatCommandArgs(privateConfig.sttCommandArgs, {
        model,
        modelPath: privateConfig.sttModelPath || model,
        audio: audioPath,
        audioPath,
        outputDir,
        device: privateConfig.sttDevice || "cuda",
        computeType: privateConfig.sttComputeType || "float16",
      })
      : defaultArgs;
    const result = await runCommandWithInput(privateConfig.sttCommand, args, {
      timeoutMs: config.timeoutMs,
    });
    if (!result.ok) {
      const commandError = parseJsonFromCommandOutput(result.stderr || result.stdout);
      const noTranscript = commandError?.ok === false
        && commandError?.provider === "faster-whisper"
        && commandError?.transcriptFile;
      const detail = commandError?.detail || commandError?.error || "";
      return {
        ok: false,
        transcript: "",
        modelName: model || "",
        processor: privateConfig.sttDevice === "cuda" ? "gpu" : privateConfig.sttDevice || "unknown",
        error: noTranscript
          ? "Local faster-whisper returned no transcript."
          : detail
          ? `Local faster-whisper CUDA transcription failed: ${text(detail, 220)}.`
          : "Local faster-whisper CUDA transcription failed.",
      };
    }
    const commandReceipt = parseJsonFromCommandOutput(result.stdout);
    let transcript = "";
    try {
      const files = await fs.readdir(outputDir);
      const textFile = files.find((file) => /\.txt$/i.test(file));
      if (textFile) transcript = text(await fs.readFile(path.join(outputDir, textFile), "utf8"), MAX_TRANSCRIPT_LENGTH);
    } catch {
      // Keep stdout fallback below.
    }
    if (!transcript && !commandReceipt) transcript = text(result.stdout || "", MAX_TRANSCRIPT_LENGTH);
    return {
      ok: Boolean(transcript),
      transcript,
      confidence: 0,
      modelName: commandReceipt?.model || model || "",
      language: commandReceipt?.language || "",
      processor: commandReceipt?.processor || (privateConfig.sttDevice === "cuda" ? "gpu" : privateConfig.sttDevice || "unknown"),
      providerTimingMs: Number(commandReceipt?.durationMs || 0) || 0,
      error: transcript ? "" : "Local faster-whisper returned no transcript.",
    };
  });
}

async function transcribeWithWindowsSapi(parsedAudio, config = {}) {
  if (parsedAudio.extension !== "wav" && !String(parsedAudio.mimeType || "").includes("wav")) {
    return {
      ok: false,
      transcript: "",
      error: "Windows SAPI local STT requires WAV audio. The /apex client should convert microphone audio to WAV before transcription.",
      conversionRequired: true,
    };
  }
  return withTempDir(async (tempRoot) => {
    const audioPath = path.join(tempRoot, "voice.wav");
    const scriptPath = path.join(tempRoot, "recognize.ps1");
    const escapedAudioPath = audioPath.replace(/'/g, "''");
    const script = [
      "$ErrorActionPreference = 'Stop'",
      "Add-Type -AssemblyName System.Speech",
      "$recognizer = New-Object System.Speech.Recognition.SpeechRecognitionEngine",
      "$grammar = New-Object System.Speech.Recognition.DictationGrammar",
      "$recognizer.LoadGrammar($grammar)",
      `$recognizer.SetInputToWaveFile('${escapedAudioPath}')`,
      "$result = $recognizer.Recognize([TimeSpan]::FromSeconds(12))",
      "if ($result) {",
      "  [pscustomobject]@{ text = $result.Text; confidence = $result.Confidence } | ConvertTo-Json -Compress",
      "} else {",
      "  [pscustomobject]@{ text = ''; confidence = 0 } | ConvertTo-Json -Compress",
      "}",
      "$recognizer.Dispose()",
    ].join("\n");
    await fs.writeFile(audioPath, Buffer.from(parsedAudio.base64, "base64"));
    await fs.writeFile(scriptPath, script, "utf8");
    const result = await runCommandWithInput("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", scriptPath], {
      timeoutMs: config.timeoutMs,
    });
    if (!result.ok) {
      return { ok: false, transcript: "", error: "Windows SAPI local STT failed." };
    }
    const parsed = parseJsonFromCommandOutput(result.stdout);
    const transcript = text(parsed?.text || "", MAX_TRANSCRIPT_LENGTH);
    const confidence = Number(parsed?.confidence || 0);
    return {
      ok: Boolean(transcript),
      transcript,
      confidence: Number.isFinite(confidence) ? confidence : 0,
      error: transcript ? "" : "Windows SAPI local STT returned no transcript.",
    };
  });
}

export async function transcribeWithApexLocalVoice(input = {}) {
  const turnStartedAt = performance.now();
  const audioTurnInput = input.audioTurn && typeof input.audioTurn === "object" ? input.audioTurn : {};
  const turnId = text(input.turnId || audioTurnInput.turnId || createApexVoiceTurnId(), 110);
  const clientTimingMs = audioTurnInput.clientTimingMs || input.clientTimingMs || {};
  const browserTranscript = text(input.browserTranscript || audioTurnInput.browserTranscript || "", MAX_TRANSCRIPT_LENGTH);
  const alwaysOpenMicInput = input.alwaysOpenMic || input.alwaysOpenMicRuntime || null;
  let alwaysOpenMicGate = null;
  let alwaysOpenMicReceipt = null;
  let localVoiceStatusCacheHit = false;
  let localVoiceStatusDiscoveryMs = 0;
  const makeReceipt = ({
    status = "failed",
    failureReason = "",
    audioValidation = null,
    audioParseMs = 0,
    transcriptionTimingMs = 0,
    providerTimingMs = 0,
    engine = "",
    processor = "",
    modelName = "",
    confidence = 0,
  } = {}) => {
    const receipt = storeApexLocalVoiceTurnReceipt(buildApexVoiceTurnReceipt({
      turnId,
      status,
      failureReason,
      audioValidation,
      alwaysOpenMicReceipt,
      timingMs: buildLocalVoiceTiming({
        turnStartedAt,
        audioParseMs,
        transcriptionTimingMs,
        providerTimingMs,
        clientTimingMs,
        localVoiceStatusDiscoveryMs,
        localVoiceStatusCacheHit,
      }),
      engine,
      processor,
      modelName,
      confidence,
      providerTimingMs,
    }));
    queueApexLiveTurnLatencyReceiptSave(receipt, input);
    return receipt;
  };
  const basePayload = (extra = {}) => ({
    provider: "apex-local-voice",
    transcript: "",
    commandReview: buildApexOsVoiceCommandReview(""),
    audioStored: false,
    openAiAudioUsed: false,
    cloudAudioAllowed: false,
    executionLocked: true,
    turnId,
    ...extra,
  });
  if (alwaysOpenMicInput) {
    alwaysOpenMicGate = buildApexAlwaysOpenMicTranscriptionGate(alwaysOpenMicInput);
    const explicitReadyForTranscription = alwaysOpenMicInput.readyForTranscription === true
      || alwaysOpenMicInput.shouldTranscribe === true
      || normalizeApexAlwaysOpenMicState(alwaysOpenMicInput.state) === APEX_ALWAYS_OPEN_MIC_STATE.PROCESSING;
    const blockedByMute = alwaysOpenMicGate.muted || alwaysOpenMicGate.shouldDropFrame;
    const blockedByGate = !blockedByMute && !explicitReadyForTranscription && !alwaysOpenMicGate.readyForTranscription;
    if (blockedByMute || blockedByGate) {
      const audioValidation = validateApexVoiceTurnPayload({
        turnId,
        audioDataUrl: input.audioDataUrl || "",
        audioTurn: audioTurnInput,
        alwaysOpenMic: { ...alwaysOpenMicInput, ...alwaysOpenMicGate },
      });
      alwaysOpenMicReceipt = buildApexAlwaysOpenMicReceipt({
        ...alwaysOpenMicInput,
        ...alwaysOpenMicGate,
        status: blockedByMute ? "muted" : "gated",
        fallbackReason: blockedByMute
          ? alwaysOpenMicGate.reason || "Always-open mic muted this frame before STT."
          : "Always-open mic gate has not reached sustained silence for transcription.",
      });
      const receipt = makeReceipt({
        status: blockedByMute ? "muted" : "gated",
        failureReason: blockedByMute
          ? APEX_VOICE_TURN_FAILURE_REASONS.MUTED_BY_GATE
          : "not-ready-for-transcription",
        audioValidation,
      });
      return basePayload({
        ok: false,
        providerConfigured: true,
        alwaysOpenMic: buildApexAlwaysOpenMicStatus({
          ...alwaysOpenMicInput,
          ...alwaysOpenMicGate,
          state: alwaysOpenMicGate.nextState || alwaysOpenMicGate.state,
        }),
        receipt,
        audioTurnReceipt: receipt,
        lastVoiceTurn: receipt,
        gated: true,
        error: alwaysOpenMicReceipt.fallbackReason,
      });
    }
  }
  const audioParseStarted = performance.now();
  const audioValidation = validateApexVoiceTurnPayload({
    turnId,
    audioDataUrl: input.audioDataUrl || "",
    audioTurn: audioTurnInput,
    alwaysOpenMic: alwaysOpenMicInput || {},
    maxBytes: MAX_AUDIO_BYTES,
  });
  const audioParseMs = elapsedMs(audioParseStarted);
  if (!audioValidation.audioValid) {
    if (browserTranscript) {
      const statusDiscoveryStarted = performance.now();
      const fallbackStatus = await getCachedApexLocalVoiceRuntimeStatus({
        ...input,
        cacheTtlMs: input.cacheTtlMs ?? 10_000,
      });
      localVoiceStatusDiscoveryMs = Number(fallbackStatus.discoveryTimingMs || 0)
        || Math.max(0, Math.round(performance.now() - statusDiscoveryStarted));
      localVoiceStatusCacheHit = Boolean(fallbackStatus.cacheHit);
      const receipt = makeReceipt({
        status: "browser-caption-fallback",
        failureReason: audioValidation.failureReason,
        audioValidation,
        audioParseMs,
        engine: "browser-speech-recognition",
        processor: "browser",
      });
      return basePayload({
        ok: true,
        providerConfigured: true,
        transcript: browserTranscript,
        commandReview: buildApexOsVoiceCommandReview(browserTranscript),
        confidence: 0,
        alwaysOpenMic: alwaysOpenMicInput ? buildApexAlwaysOpenMicStatus(alwaysOpenMicInput) : undefined,
        receipt,
        audioTurnReceipt: receipt,
        lastVoiceTurn: receipt,
        localVoiceStatus: fallbackStatus,
      });
    }
    const receipt = makeReceipt({
      status: "failed",
      failureReason: audioValidation.failureReason,
      audioValidation,
      audioParseMs,
    });
    return basePayload({
      ok: false,
      alwaysOpenMic: alwaysOpenMicInput ? buildApexAlwaysOpenMicStatus(alwaysOpenMicInput) : undefined,
      receipt,
      audioTurnReceipt: receipt,
      lastVoiceTurn: receipt,
      failureReason: audioValidation.failureReason,
      error: `Apex local voice turn failed: ${getApexVoiceTurnFailureLabel(audioValidation.failureReason)}.`,
    });
  }
  const parsedAudio = parseApexOsVoiceAudioDataUrl(input.audioDataUrl || "");
  if (!parsedAudio.ok) {
    const receipt = makeReceipt({
      status: "failed",
      failureReason: APEX_VOICE_TURN_FAILURE_REASONS.INVALID_DATA_URL,
      audioValidation,
      audioParseMs,
    });
    return basePayload({
      ok: false,
      alwaysOpenMic: alwaysOpenMicInput ? buildApexAlwaysOpenMicStatus(alwaysOpenMicInput) : undefined,
      receipt,
      audioTurnReceipt: receipt,
      lastVoiceTurn: receipt,
      failureReason: APEX_VOICE_TURN_FAILURE_REASONS.INVALID_DATA_URL,
      error: parsedAudio.error || "Apex local voice audio is invalid.",
    });
  }
  if (Buffer.byteLength(parsedAudio.base64, "base64") > MAX_AUDIO_BYTES) {
    const receipt = makeReceipt({
      status: "failed",
      failureReason: APEX_VOICE_TURN_FAILURE_REASONS.AUDIO_TOO_LARGE,
      audioValidation,
      audioParseMs,
    });
    return basePayload({
      ok: false,
      alwaysOpenMic: alwaysOpenMicInput ? buildApexAlwaysOpenMicStatus(alwaysOpenMicInput) : undefined,
      receipt,
      audioTurnReceipt: receipt,
      lastVoiceTurn: receipt,
      failureReason: APEX_VOICE_TURN_FAILURE_REASONS.AUDIO_TOO_LARGE,
      error: "Apex local voice audio is too large for this local runtime slice.",
    });
  }
  const config = input.config?.provider === "apex-local-voice" ? input.config : readApexLocalVoiceRuntimeConfig(input);
  const statusDiscoveryStarted = performance.now();
  const status = await getCachedApexLocalVoiceRuntimeStatus({
    ...input,
    config,
    cacheTtlMs: input.cacheTtlMs ?? 10_000,
  });
  localVoiceStatusDiscoveryMs = Number(status.discoveryTimingMs || 0)
    || Math.max(0, Math.round(performance.now() - statusDiscoveryStarted));
  localVoiceStatusCacheHit = Boolean(status.cacheHit);
  if (!status.canHearLocally || !status.selectedSttEngine) {
    const receipt = makeReceipt({
      status: "failed",
      failureReason: APEX_VOICE_TURN_FAILURE_REASONS.STT_UNAVAILABLE,
      audioValidation,
      audioParseMs,
    });
    return basePayload({
      ok: false,
      providerConfigured: false,
      localVoiceStatus: status,
      alwaysOpenMic: alwaysOpenMicInput ? buildApexAlwaysOpenMicStatus(alwaysOpenMicInput) : undefined,
      receipt,
      audioTurnReceipt: receipt,
      lastVoiceTurn: receipt,
      failureReason: APEX_VOICE_TURN_FAILURE_REASONS.STT_UNAVAILABLE,
      error: status.missing.join(" ") || "Local STT is not configured.",
    });
  }
  const transcriptionStarted = performance.now();
  const result = status.selectedSttEngine.id === "windows-sapi"
    ? await transcribeWithWindowsSapi(parsedAudio, config)
    : /^faster-whisper/i.test(status.selectedSttEngine.id)
      ? await transcribeWithFasterWhisper(parsedAudio, config, status.selectedSttEngine)
      : await transcribeWithWhisperCpp(parsedAudio, config);
  const transcriptionTimingMs = Math.max(0, Math.round(performance.now() - transcriptionStarted));
  if (!result.ok) {
    alwaysOpenMicReceipt = alwaysOpenMicInput ? buildApexAlwaysOpenMicReceipt({
      ...(alwaysOpenMicGate || {}),
      ...alwaysOpenMicInput,
      status: "failed",
      sttProvider: status.selectedSttEngine.id,
      sttProcessor: status.selectedSttEngine.processor || "unknown",
      transcriptionTimingMs,
      fallbackReason: result.error || "Local STT failed.",
    }) : null;
    const receipt = makeReceipt({
      status: "failed",
      failureReason: APEX_VOICE_TURN_FAILURE_REASONS.STT_FAILED,
      audioValidation,
      audioParseMs,
      transcriptionTimingMs,
      providerTimingMs: Number(result.providerTimingMs || 0) || 0,
      engine: status.selectedSttEngine.id,
      processor: status.selectedSttEngine.processor || "unknown",
      modelName: status.selectedSttEngine.modelName || result.modelName || "",
    });
    return {
      ok: false,
      provider: "apex-local-voice",
      providerConfigured: true,
      transcript: "",
      commandReview: buildApexOsVoiceCommandReview(""),
      audioStored: false,
      openAiAudioUsed: false,
      cloudAudioAllowed: false,
      executionLocked: true,
      turnId,
      localVoiceStatus: status,
      alwaysOpenMic: alwaysOpenMicInput ? buildApexAlwaysOpenMicStatus({
        ...alwaysOpenMicInput,
        state: APEX_ALWAYS_OPEN_MIC_STATE.PROCESSING,
        speechDetected: true,
      }) : undefined,
      error: result.error || "Local STT failed.",
      conversionRequired: Boolean(result.conversionRequired),
      receipt,
      audioTurnReceipt: receipt,
      lastVoiceTurn: receipt,
      failureReason: APEX_VOICE_TURN_FAILURE_REASONS.STT_FAILED,
    };
  }
  const transcript = text(result.transcript, MAX_TRANSCRIPT_LENGTH);
  alwaysOpenMicReceipt = alwaysOpenMicInput ? buildApexAlwaysOpenMicReceipt({
    ...(alwaysOpenMicGate || {}),
    ...alwaysOpenMicInput,
    status: "transcribed",
    speechDetected: true,
    sttProvider: status.selectedSttEngine.id,
    sttProcessor: result.processor || status.selectedSttEngine.processor || "unknown",
    transcriptionTimingMs,
  }) : null;
  const receipt = makeReceipt({
    status: "transcribed",
    audioValidation,
    audioParseMs,
    transcriptionTimingMs,
    providerTimingMs: Number(result.providerTimingMs || 0) || 0,
    engine: status.selectedSttEngine.id,
    processor: result.processor || status.selectedSttEngine.processor || "unknown",
    modelName: status.selectedSttEngine.modelName || result.modelName || "",
    confidence: Number(result.confidence || 0),
  });
  return {
    ok: true,
    provider: "apex-local-voice",
    providerConfigured: true,
    transcript,
    commandReview: buildApexOsVoiceCommandReview(transcript),
    confidence: Number(result.confidence || 0),
    audioStored: false,
    openAiAudioUsed: false,
    cloudAudioAllowed: false,
    executionLocked: true,
    turnId,
    localVoiceStatus: status,
    alwaysOpenMic: alwaysOpenMicInput ? buildApexAlwaysOpenMicStatus({
      ...alwaysOpenMicInput,
      state: APEX_ALWAYS_OPEN_MIC_STATE.PROCESSING,
      speechDetected: true,
      droppedFramesWhileMuted: alwaysOpenMicInput.droppedFramesWhileMuted,
    }) : undefined,
    receipt,
    audioTurnReceipt: receipt,
    lastVoiceTurn: receipt,
  };
}
