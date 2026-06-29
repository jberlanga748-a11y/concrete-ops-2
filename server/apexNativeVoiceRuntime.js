import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";

import {
  buildApexOsVoiceCommandReview,
} from "../shared/apexOsVoice.js";

export const APEX_NATIVE_VOICE_ENV = Object.freeze({
  DISABLED: "APEX_NATIVE_VOICE_DISABLED",
  PROVIDER: "APEX_NATIVE_VOICE_PROVIDER",
  LISTEN_SECONDS: "APEX_NATIVE_VOICE_LISTEN_SECONDS",
  TIMEOUT_MS: "APEX_NATIVE_VOICE_TIMEOUT_MS",
  COMMAND: "APEX_NATIVE_VOICE_COMMAND",
  COMMAND_ARGS_JSON: "APEX_NATIVE_VOICE_COMMAND_ARGS_JSON",
});

export const APEX_NATIVE_VOICE_STATUS = Object.freeze({
  READY: "ready",
  MISSING: "missing",
  DISABLED: "disabled",
  ERROR: "error",
});

const PRIVATE_CONFIG = Symbol("apexNativeVoicePrivateConfig");
const DEFAULT_LISTEN_SECONDS = 8;
const DEFAULT_TIMEOUT_MS = 18_000;
const MAX_TIMEOUT_MS = 30_000;
const MAX_TRANSCRIPT_LENGTH = 1600;
const MAX_STDIO_CHARS = 16_000;
const NATIVE_WAV_PROVIDER_IDS = Object.freeze(["windows-native-wav", "windows-native-wav-gpu", "windows-mci-wav", "native-wav"]);
const WINDOWS_SAPI_PROVIDER_IDS = Object.freeze(["windows-sapi-direct", "windows-sapi"]);

function text(value = "", limit = 240) {
  return String(value ?? "").replace(/\s+\n/g, "\n").replace(/\s+/g, " ").trim().slice(0, limit);
}

function bool(value) {
  return value === true || /^(1|true|yes|on|enabled)$/i.test(String(value || "").trim());
}

function parseListenSeconds(value = DEFAULT_LISTEN_SECONDS) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_LISTEN_SECONDS;
  return Math.max(1, Math.min(8, Math.round(parsed)));
}

function parseTimeoutMs(value = DEFAULT_TIMEOUT_MS) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_TIMEOUT_MS;
  return Math.max(1500, Math.min(MAX_TIMEOUT_MS, Math.round(parsed)));
}

function parseArgsJson(value = "") {
  if (!value) return [];
  try {
    const parsed = JSON.parse(String(value));
    return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
  } catch {
    return [];
  }
}

function parseJsonFromOutput(stdout = "") {
  const raw = String(stdout || "").trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function makeReceipt({
  status = "failed",
  provider = "windows-native-wav-gpu",
  transcript = "",
  confidence = 0,
  listenWindowMs = DEFAULT_LISTEN_SECONDS * 1000,
  startedAt = performance.now(),
  error = "",
  sttProvider = "",
  sttProcessor = "",
  captureProvider = "",
  byteLength = 0,
  captureMs = 0,
  localSttMs = 0,
} = {}) {
  const resolvedSttProvider = sttProvider || (provider === "windows-sapi-direct" ? provider : "local-stt-handoff");
  const resolvedSttProcessor = sttProcessor || (provider === "windows-sapi-direct" ? "cpu" : "gpu");
  return Object.freeze({
    id: `ANV-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    provider: "apex-native-voice",
    status,
    ingressProvider: provider,
    captureProvider: captureProvider || (provider === "windows-sapi-direct" ? "windows-sapi-dictation" : "windows-mci-waveaudio"),
    sttProvider: resolvedSttProvider,
    sttProcessor: resolvedSttProcessor,
    transcriptLength: text(transcript, MAX_TRANSCRIPT_LENGTH).length,
    confidence: Number.isFinite(Number(confidence)) ? Number(confidence) : 0,
    byteLength: Number(byteLength || 0) || 0,
    listenWindowMs,
    nativeListenMs: Math.max(0, Math.round(performance.now() - startedAt)),
    nativeCaptureMs: Number(captureMs || 0) || 0,
    localSttMs: Number(localSttMs || 0) || 0,
    browserMicRequired: false,
    browserAudioConversionUsed: false,
    audioStored: false,
    openAiAudioUsed: false,
    cloudAudioAllowed: false,
    promptsSentToCloud: false,
    audioSentToCloud: false,
    error: text(error, 240),
    createdAt: new Date().toISOString(),
  });
}

function buildWindowsSapiScript(listenSeconds) {
  const seconds = parseListenSeconds(listenSeconds);
  return `
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Speech
$recognizer = New-Object System.Speech.Recognition.SpeechRecognitionEngine
try {
  $grammar = New-Object System.Speech.Recognition.DictationGrammar
  $recognizer.LoadGrammar($grammar)
  $recognizer.SetInputToDefaultAudioDevice()
  $result = $recognizer.Recognize([TimeSpan]::FromSeconds(${seconds}))
  if ($null -eq $result) {
    [pscustomobject]@{ text = ""; confidence = 0; status = "no-match" } | ConvertTo-Json -Compress
  } else {
    [pscustomobject]@{ text = $result.Text; confidence = $result.Confidence; status = "transcribed" } | ConvertTo-Json -Compress
  }
}
finally {
  $recognizer.Dispose()
}
`;
}

function buildWindowsMciWavCaptureScript({ listenSeconds = DEFAULT_LISTEN_SECONDS, outputPath = "" } = {}) {
  const milliseconds = parseListenSeconds(listenSeconds) * 1000;
  const escapedOutputPath = String(outputPath || "").replace(/'/g, "''");
  return `
$ErrorActionPreference = "Stop"
Add-Type -TypeDefinition @"
using System;
using System.Text;
using System.Runtime.InteropServices;
public static class ApexMciWave {
  [DllImport("winmm.dll", CharSet = CharSet.Unicode)]
  private static extern int mciSendString(string command, StringBuilder buffer, int bufferSize, IntPtr hwndCallback);
  [DllImport("winmm.dll", CharSet = CharSet.Unicode)]
  private static extern bool mciGetErrorString(int errorCode, StringBuilder errorText, int errorTextSize);
  public static string Send(string command) {
    var buffer = new StringBuilder(1024);
    int error = mciSendString(command, buffer, buffer.Capacity, IntPtr.Zero);
    if (error != 0) {
      var errorText = new StringBuilder(1024);
      mciGetErrorString(error, errorText, errorText.Capacity);
      throw new Exception(command + " :: " + errorText.ToString());
    }
    return buffer.ToString();
  }
}
"@
$path = '${escapedOutputPath}'
$alias = "apexrec" + [Guid]::NewGuid().ToString("N")
try {
  [ApexMciWave]::Send("open new Type waveaudio Alias " + $alias) | Out-Null
  try { [ApexMciWave]::Send("set " + $alias + " time format milliseconds") | Out-Null } catch {}
  try { [ApexMciWave]::Send("set " + $alias + " channels 1 samplespersec 16000 bitspersample 16") | Out-Null } catch {}
  [ApexMciWave]::Send("record " + $alias) | Out-Null
  Start-Sleep -Milliseconds ${milliseconds}
  [ApexMciWave]::Send("stop " + $alias) | Out-Null
  [ApexMciWave]::Send("save " + $alias + " " + '"' + $path + '"') | Out-Null
  $file = Get-Item -LiteralPath $path
  [pscustomobject]@{
    ok = $true
    status = "captured"
    byteLength = $file.Length
    listenWindowMs = ${milliseconds}
    captureProvider = "windows-mci-waveaudio"
  } | ConvertTo-Json -Compress
}
finally {
  try { [ApexMciWave]::Send("close " + $alias) | Out-Null } catch {}
}
`;
}

function runCommand(command, args = [], { timeoutMs = DEFAULT_TIMEOUT_MS, commandRunner = null } = {}) {
  if (typeof commandRunner === "function") {
    return commandRunner(command, args, { timeoutMs });
  }
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
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
      stdout = `${stdout}${String(chunk || "")}`.slice(-MAX_STDIO_CHARS);
    });
    child.stderr.on("data", (chunk) => {
      stderr = `${stderr}${String(chunk || "")}`.slice(-MAX_STDIO_CHARS);
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
  });
}

async function withTempDir(fn) {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "apex-native-voice-"));
  try {
    return await fn(tempRoot);
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
}

export function readApexNativeVoiceRuntimeConfig(input = {}) {
  const env = input.env || process.env;
  const provider = text(input.provider || env[APEX_NATIVE_VOICE_ENV.PROVIDER] || "windows-native-wav-gpu", 80).toLowerCase();
  const listenSeconds = parseListenSeconds(input.listenSeconds || env[APEX_NATIVE_VOICE_ENV.LISTEN_SECONDS]);
  const timeoutMs = parseTimeoutMs(input.timeoutMs || env[APEX_NATIVE_VOICE_ENV.TIMEOUT_MS]);
  const command = text(input.command || env[APEX_NATIVE_VOICE_ENV.COMMAND] || "", 500);
  const commandArgs = Array.isArray(input.commandArgs)
    ? input.commandArgs.map((item) => String(item))
    : parseArgsJson(env[APEX_NATIVE_VOICE_ENV.COMMAND_ARGS_JSON]);
  const disabled = bool(input.disabled || env[APEX_NATIVE_VOICE_ENV.DISABLED]);

  return Object.freeze({
    provider: "apex-native-voice",
    statusProvider: provider || "windows-sapi-direct",
    disabled,
    listenSeconds,
    listenWindowMs: listenSeconds * 1000,
    timeoutMs,
    commandConfigured: Boolean(command),
    commandArgsConfigured: commandArgs.length > 0,
    envNamesOnly: Object.freeze({ ...APEX_NATIVE_VOICE_ENV }),
    [PRIVATE_CONFIG]: Object.freeze({
      command,
      commandArgs: Object.freeze(commandArgs),
    }),
  });
}

export function getApexNativeVoiceRuntimeStatus(input = {}) {
  const config = input.config?.provider === "apex-native-voice" ? input.config : readApexNativeVoiceRuntimeConfig(input);
  const platform = input.platform || process.platform;
  const isWindows = platform === "win32";
  const provider = config.statusProvider || "windows-sapi-direct";
  const nativeWavConfigured = NATIVE_WAV_PROVIDER_IDS.includes(provider);
  const sapiConfigured = WINDOWS_SAPI_PROVIDER_IDS.includes(provider);
  const customConfigured = provider === "custom-native-command" && config.commandConfigured;
  const windowsReady = (nativeWavConfigured || sapiConfigured) && isWindows;
  const available = !config.disabled && (customConfigured || windowsReady);
  const selectedInputMode = available
    ? nativeWavConfigured
      ? "windows-native-wav-gpu"
      : sapiConfigured
        ? "windows-sapi-direct"
        : provider
    : "browser-audio-worklet-wav";
  const localSttEngine = input.localSttEngine && typeof input.localSttEngine === "object" ? input.localSttEngine : {};
  const sttProvider = nativeWavConfigured
    ? localSttEngine.id || "faster-whisper-cuda"
    : available
      ? selectedInputMode
      : "";
  const sttProcessor = nativeWavConfigured
    ? localSttEngine.processor || "gpu"
    : available
      ? "cpu"
      : "";
  const missing = config.disabled
    ? ["Native Voice Runtime is disabled by local config."]
    : customConfigured || windowsReady
      ? []
      : nativeWavConfigured || sapiConfigured
        ? ["Native Windows mic requires Windows."]
        : ["Configure APEX_NATIVE_VOICE_COMMAND for the custom native mic provider."];

  return Object.freeze({
    provider: "apex-native-voice",
    version: "v1",
    status: config.disabled
      ? APEX_NATIVE_VOICE_STATUS.DISABLED
      : available
        ? APEX_NATIVE_VOICE_STATUS.READY
        : APEX_NATIVE_VOICE_STATUS.MISSING,
    available,
    canListenNatively: available,
    nativeMicAvailable: available,
    selectedInputMode,
    ingressProvider: available ? selectedInputMode : "browser",
    captureProvider: nativeWavConfigured ? "windows-mci-waveaudio" : sapiConfigured ? "windows-sapi-dictation" : "custom-native-command",
    sttProvider,
    sttProcessor,
    localSttHandoff: Boolean(available && nativeWavConfigured),
    gpuSttHandoff: Boolean(available && nativeWavConfigured && /gpu|cuda/i.test(`${sttProvider} ${sttProcessor}`)),
    listenSeconds: config.listenSeconds,
    listenWindowMs: config.listenWindowMs,
    timeoutMs: config.timeoutMs,
    browserMicRequired: !available,
    browserAudioConversionUsed: false,
    browserFallbackAvailable: true,
    preferredOverBrowser: available,
    alwaysListening: false,
    continuousListening: false,
    explicitTurnOnly: true,
    commandConfigured: config.commandConfigured,
    commandArgsConfigured: config.commandArgsConfigured,
    missing: Object.freeze(missing),
    openAiAudioUsed: false,
    cloudAudioAllowed: false,
    audioStored: false,
    promptsSentToCloud: false,
    audioSentToCloud: false,
    secretsExposed: false,
    tokenExposed: false,
    envNamesOnly: config.envNamesOnly,
  });
}

export async function listenWithApexNativeVoice(input = {}) {
  const startedAt = performance.now();
  const config = input.config?.provider === "apex-native-voice" ? input.config : readApexNativeVoiceRuntimeConfig(input);
  const status = getApexNativeVoiceRuntimeStatus({ ...input, config });
  const basePayload = (extra = {}) => ({
    provider: "apex-native-voice",
    ok: false,
    transcript: "",
    commandReview: buildApexOsVoiceCommandReview(""),
    nativeVoice: status,
    audioStored: false,
    openAiAudioUsed: false,
    cloudAudioAllowed: false,
    browserMicRequired: false,
    browserAudioConversionUsed: false,
    executionLocked: true,
    ...extra,
  });

  if (!status.available) {
    const error = status.missing.join(" ") || "Native Voice Runtime is not ready.";
    return basePayload({
      receipt: makeReceipt({
        status: status.status,
        provider: status.selectedInputMode,
        listenWindowMs: status.listenWindowMs,
        startedAt,
        error,
      }),
      error,
    });
  }

  const privateConfig = config[PRIVATE_CONFIG] || {};
  const provider = status.selectedInputMode;
  const usesSapiDirect = provider === "windows-sapi-direct";
  const usesNativeWav = provider === "windows-native-wav-gpu";
  const command = provider === "custom-native-command"
    ? privateConfig.command
    : "powershell.exe";
  if (usesNativeWav) {
    return withTempDir(async (tempRoot) => {
      const audioPath = path.join(tempRoot, "native-turn.wav");
      const captureStartedAt = performance.now();
      const captureResult = await runCommand("powershell.exe", [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        buildWindowsMciWavCaptureScript({
          listenSeconds: config.listenSeconds,
          outputPath: audioPath,
        }),
      ], {
        timeoutMs: config.timeoutMs,
        commandRunner: input.commandRunner,
      });
      const captureMs = Math.max(0, Math.round(performance.now() - captureStartedAt));
      const captureParsed = parseJsonFromOutput(captureResult.stdout);
      const captureAudioDataUrl = text(captureParsed?.audioDataUrl || "", 12_000_000);
      const audioBuffer = captureAudioDataUrl
        ? null
        : await fs.readFile(audioPath).catch(() => null);
      const audioDataUrl = captureAudioDataUrl || (audioBuffer?.length ? `data:audio/wav;base64,${audioBuffer.toString("base64")}` : "");
      const byteLength = Number(captureParsed?.byteLength || audioBuffer?.length || 0) || 0;
      if (!captureResult.ok || !audioDataUrl) {
        const error = text(captureParsed?.error || captureResult.stderr || "Native Windows mic did not produce a WAV turn.", 300);
        return basePayload({
          receipt: makeReceipt({
            status: "failed",
            provider,
            sttProvider: status.sttProvider,
            sttProcessor: status.sttProcessor,
            listenWindowMs: status.listenWindowMs,
            startedAt,
            captureMs,
            byteLength,
            error,
          }),
          error,
        });
      }
      if (typeof input.localTranscriber !== "function") {
        const error = "Native GPU STT handoff is not wired on this route.";
        return basePayload({
          receipt: makeReceipt({
            status: "failed",
            provider,
            sttProvider: status.sttProvider,
            sttProcessor: status.sttProcessor,
            listenWindowMs: status.listenWindowMs,
            startedAt,
            captureMs,
            byteLength,
            error,
          }),
          error,
        });
      }
      const sttStartedAt = performance.now();
      const sttPayload = await input.localTranscriber({
        turnId: input.turnId || "",
        audioDataUrl,
        audioTurn: {
          turnId: input.turnId || "",
          sourceMimeType: "audio/wav",
          sourceByteLength: byteLength,
          convertedMimeType: "audio/wav",
          convertedByteLength: byteLength,
          wavHeaderValid: true,
          readyForTranscription: true,
          nativeCaptureProvider: "windows-mci-waveaudio",
          nativeInputMode: provider,
          browserWavConversionFailed: false,
          fallbackMode: "native-windows-wav-gpu-stt",
          clientTimingMs: {
            captureDurationMs: status.listenWindowMs,
            nativeCaptureMs: captureMs,
            clientWavConversionMs: 0,
            dataUrlCreationMs: 0,
            uploadRequestMs: 0,
          },
        },
      });
      const localSttMs = Math.max(0, Math.round(performance.now() - sttStartedAt));
      const transcript = text(sttPayload?.transcript || "", MAX_TRANSCRIPT_LENGTH);
      const sttReceipt = sttPayload?.audioTurnReceipt || sttPayload?.lastVoiceTurn || sttPayload?.receipt || null;
      const sttProvider = sttReceipt?.engine || status.sttProvider || "faster-whisper-cuda";
      const sttProcessor = sttReceipt?.processor || status.sttProcessor || "gpu";
      const receipt = makeReceipt({
        status: sttPayload?.ok && transcript ? "transcribed" : "failed",
        provider,
        transcript,
        confidence: Number(sttPayload?.confidence || 0) || 0,
        listenWindowMs: status.listenWindowMs,
        startedAt,
        sttProvider,
        sttProcessor,
        captureMs,
        localSttMs,
        byteLength,
        error: sttPayload?.ok ? "" : sttPayload?.error || "Native WAV reached local STT but no transcript was returned.",
      });
      if (!sttPayload?.ok || !transcript) {
        return basePayload({
          receipt,
          lastVoiceTurn: receipt,
          localVoiceStatus: sttPayload?.localVoiceStatus,
          confidence: Number(sttPayload?.confidence || 0) || 0,
          error: sttPayload?.error || "Native WAV reached local STT but no transcript was returned.",
        });
      }
      return basePayload({
        ok: true,
        transcript,
        commandReview: buildApexOsVoiceCommandReview(transcript),
        confidence: Number(sttPayload?.confidence || 0) || 0,
        receipt,
        lastVoiceTurn: receipt,
        audioTurnReceipt: sttReceipt || receipt,
        localVoiceStatus: sttPayload?.localVoiceStatus,
      });
    });
  }

  const args = provider === "custom-native-command"
    ? Array.from(privateConfig.commandArgs || [])
    : [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      buildWindowsSapiScript(config.listenSeconds),
    ];

  const result = await runCommand(command, args, {
    timeoutMs: config.timeoutMs,
    commandRunner: input.commandRunner,
  });
  const parsed = parseJsonFromOutput(result.stdout);
  const transcript = parsed
    ? text(parsed?.text || parsed?.transcript || "", MAX_TRANSCRIPT_LENGTH)
    : text(result.stdout || "", MAX_TRANSCRIPT_LENGTH);
  const confidence = Number(parsed?.confidence || 0);
  if (!result.ok || !transcript) {
    const error = text(
      parsed?.error || result.stderr || (result.ok ? "Native mic heard no clear words." : "Native mic command failed."),
      300,
    );
    return basePayload({
      receipt: makeReceipt({
        status: "failed",
        provider,
        sttProvider: provider,
        sttProcessor: usesSapiDirect ? "cpu" : status.sttProcessor,
        listenWindowMs: status.listenWindowMs,
        startedAt,
        error,
      }),
      confidence: Number.isFinite(confidence) ? confidence : 0,
      error,
    });
  }

  const receipt = makeReceipt({
    status: "transcribed",
    provider,
    transcript,
    confidence,
    sttProvider: provider,
    sttProcessor: usesSapiDirect ? "cpu" : status.sttProcessor,
    listenWindowMs: status.listenWindowMs,
    startedAt,
  });
  return basePayload({
    ok: true,
    transcript,
    commandReview: buildApexOsVoiceCommandReview(transcript),
    confidence: Number.isFinite(confidence) ? confidence : 0,
    receipt,
    lastVoiceTurn: receipt,
  });
}
