import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

import {
  APEX_LIGHTWEIGHT_VOICE_ENV,
} from "./apexLightweightVoiceProvider.js";
import {
  APEX_LOCAL_VOICE_ENV,
  clearApexLocalVoiceRuntimeStatusCache,
  getCachedApexLocalVoiceRuntimeStatus,
  getApexLocalVoiceRuntimeStatus,
  readApexLocalVoiceRuntimeConfig,
  speakWithApexLocalVoice,
  transcribeWithApexLocalVoice,
} from "./apexLocalVoiceRuntime.js";
import {
  APEX_NATIVE_VOICE_ENV,
} from "./apexNativeVoiceRuntime.js";
import {
  APEX_ALWAYS_OPEN_MIC_STATE,
} from "../shared/apexAlwaysOpenMicRuntime.js";
import {
  APEX_VOICE_TURN_FAILURE_REASONS,
} from "../shared/apexVoiceTurnDiagnostics.js";
import { createUserRecord } from "./store.js";

const SECRET_VALUE = "sk-local-voice-secret-should-not-leak";

function assertNoSecretValues(value) {
  const serialized = JSON.stringify(value);
  assert.doesNotMatch(serialized, /sk-local-voice-secret-should-not-leak/i);
}

function createMockResponse(body, { status = 200, contentType = "application/json" } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get(name) {
        return String(name || "").toLowerCase() === "content-type" ? contentType : "";
      },
    },
    async json() {
      if (typeof body === "string") return JSON.parse(body);
      return body;
    },
    async arrayBuffer() {
      if (Buffer.isBuffer(body)) return body;
      return Buffer.from(String(body || ""), "utf8");
    },
  };
}

function createVoiceboxFetch(routes = {}) {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url: String(url), method: options.method || "GET", body: options.body || "" });
    const pathname = new URL(String(url)).pathname;
    const route = routes[`${options.method || "GET"} ${pathname}`] || routes[pathname];
    if (!route) return createMockResponse({ error: "not found" }, { status: 404 });
    if (typeof route === "function") return route(url, options);
    return route;
  };
  fetchImpl.calls = calls;
  return fetchImpl;
}

function createPort() {
  return 20100 + Math.floor(Math.random() * 700);
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(baseUrl, serverOutput) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/ready`);
      if (response.ok) return;
    } catch {
      // Poll until ready.
    }
    await sleep(250);
  }
  throw new Error(`Apex local voice test server did not become ready.\n${serverOutput()}`);
}

async function startApexServer(extraEnv = {}) {
  const tempDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "apex-local-voice-server-"));
  const sqliteFile = path.join(tempDataDir, "app-data.sqlite");
  const port = createPort();
  const baseUrl = `http://localhost:${port}`;
  let output = "";
  const server = spawn(process.execPath, ["server/index.js"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(port),
      DATA_DIR: tempDataDir,
      LOG_LEVEL: "warn",
      OPENAI_API_KEY: "",
      ...extraEnv,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  server.stdout.on("data", (chunk) => {
    output += String(chunk);
  });
  server.stderr.on("data", (chunk) => {
    output += String(chunk);
  });
  await waitForServer(baseUrl, () => output);
  async function stop() {
    server.kill("SIGTERM");
    await new Promise((resolve) => server.once("exit", resolve));
    await fs.rm(tempDataDir, { recursive: true, force: true });
  }
  return { baseUrl, sqliteFile, stop };
}

async function requestJson(baseUrl, pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, options);
  const payload = response.status === 204 ? null : await response.json().catch(() => null);
  return { response, payload };
}

async function login(baseUrl, credentials) {
  const { response, payload } = await requestJson(baseUrl, "/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Apex-Auth-Mode": "bearer",
    },
    body: JSON.stringify({ ...credentials, returnToken: true }),
  });
  assert.equal(response.ok, true, payload?.error || "Login should succeed.");
  return payload;
}

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function writeAscii(view, offset, value) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}

function createSilentWavDataUrl({ sampleRate = 16000, durationMs = 500 } = {}) {
  const frameCount = Math.max(1, Math.round((sampleRate * durationMs) / 1000));
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
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerSample, true);
  view.setUint16(32, bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, dataSize, true);
  return `data:audio/wav;base64,${Buffer.from(buffer).toString("base64")}`;
}

function setOperatorAccess(sqliteFile, email, enabled) {
  const database = new DatabaseSync(sqliteFile);
  try {
    database.prepare("UPDATE users SET operator_access = ? WHERE email = ?").run(enabled ? 1 : 0, email);
  } finally {
    database.close();
  }
}

function insertUser(sqliteFile, user) {
  const database = new DatabaseSync(sqliteFile);
  try {
    database.prepare(`
      INSERT INTO users (id, email, name, role, phone, status, company_id, operator_access, created_at, updated_at, last_login_at, password_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      user.id,
      user.email,
      user.name,
      user.role,
      user.phone,
      user.status,
      user.companyId,
      user.operatorAccess ? 1 : 0,
      user.createdAt,
      user.updatedAt,
      user.lastLoginAt,
      user.passwordHash,
    );
  } finally {
    database.close();
  }
}

async function runPowerShellScript(script, { timeoutMs = 30_000 } = {}) {
  return new Promise((resolve) => {
    const child = spawn("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script], {
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
      resolve({ ok: false, stdout, stderr: "timeout" });
    }, timeoutMs);
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk || "");
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk || "");
    });
    child.on("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve({ ok: false, stdout, stderr: error?.message || "powershell failed" });
    });
    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve({ ok: code === 0, stdout, stderr });
    });
  });
}

async function createSapiSpeechWavDataUrl(phrase = "Apex can you hear me") {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "apex-local-sapi-wav-"));
  const wavPath = path.join(tempRoot, "speech.wav");
  const escapedWavPath = wavPath.replace(/'/g, "''");
  const escapedPhrase = phrase.replace(/'/g, "''");
  const script = [
    "$ErrorActionPreference='Stop'",
    "Add-Type -AssemblyName System.Speech",
    "$synth=New-Object System.Speech.Synthesis.SpeechSynthesizer",
    `$synth.SetOutputToWaveFile('${escapedWavPath}')`,
    `$synth.Speak('${escapedPhrase}')`,
    "$synth.Dispose()",
  ].join("; ");
  const result = await runPowerShellScript(script);
  assert.equal(result.ok, true, result.stderr);
  const wav = await fs.readFile(wavPath);
  await fs.rm(tempRoot, { recursive: true, force: true });
  return `data:audio/wav;base64,${wav.toString("base64")}`;
}

async function createApexAnchorWav() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "apex-local-lightweight-anchor-"));
  const wavPath = path.join(tempRoot, "offlinetts-output.wav");
  const dataSize = 289200;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write("RIFF", 0, "ascii");
  buffer.writeUInt32LE(buffer.length - 8, 4);
  buffer.write("WAVE", 8, "ascii");
  buffer.write("fmt ", 12, "ascii");
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(24000, 24);
  buffer.writeUInt32LE(48000, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36, "ascii");
  buffer.writeUInt32LE(dataSize, 40);
  await fs.writeFile(wavPath, buffer);
  return { tempRoot, wavPath };
}

test("readApexLocalVoiceRuntimeConfig exposes env names only, not values", () => {
  const config = readApexLocalVoiceRuntimeConfig({
    env: {
      [APEX_LOCAL_VOICE_ENV.STT_COMMAND]: "C:/private/whisper.exe",
      [APEX_LOCAL_VOICE_ENV.STT_MODEL_PATH]: "C:/private/model.bin",
      [APEX_LOCAL_VOICE_ENV.TTS_COMMAND]: "C:/private/piper.exe",
      APEX_FAKE_SECRET_FOR_LOCAL_VOICE_TEST: SECRET_VALUE,
    },
  });

  assert.equal(config.provider, "apex-local-voice");
  assert.equal(config.secretsExposed, false);
  assert.equal(config.envNamesOnly.STT_COMMAND, APEX_LOCAL_VOICE_ENV.STT_COMMAND);
  assert.equal(config.envNamesOnly.LIGHTWEIGHT_VOICE_NAME, APEX_LIGHTWEIGHT_VOICE_ENV.VOICE_NAME);
  assertNoSecretValues(config);
  assert.doesNotMatch(JSON.stringify(config), /C:\/private/i);
});

test("missing config returns partial or missing status without OpenAI/browser-as-local claims", async () => {
  const status = await getApexLocalVoiceRuntimeStatus({
    env: {},
    platform: "linux",
    loadPersistedConfig: false,
    kokoroOnnxPackageAvailable: true,
    voiceboxFetchImpl: async () => {
      throw new Error("voicebox offline for isolated test");
    },
  });

  assert.equal(status.provider, "apex-local-voice");
  assert.equal(status.canHearLocally, false);
  assert.equal(status.canSpeakLocally, true);
  assert.equal(status.selectedTtsEngine.id, "apex-lightweight-kokoro");
  assert.equal(status.lockedLightweightVoiceReady, true);
  assert.equal(status.openAiAudioUsed, false);
  assert.equal(status.cloudAudioAllowed, false);
  assert.equal(status.browserPlaybackIsFallbackOnly, true);
  assert.match(status.missing.join(" "), /local STT/i);
  assert.doesNotMatch(status.missing.join(" "), /local TTS/i);
  assert.equal(status.nativeVoice.available, false);
  assert.equal(status.nativeInputAvailable, false);
  assert.equal(status.preferredInputMode, "browser-audio-worklet-wav");
  assert.equal(status.inputModes.some((row) => row.id === "windows-native-wav-gpu"), true);
});

test("Kokoro ONNX is preferred over Windows SAPI when local package is available", async () => {
  const status = await getApexLocalVoiceRuntimeStatus({
    env: {},
    platform: "win32",
    loadPersistedConfig: false,
    kokoroOnnxPackageAvailable: true,
    voiceboxFetchImpl: async () => {
      throw new Error("voicebox offline for isolated test");
    },
  });

  assert.equal(status.canSpeakLocally, true);
  assert.equal(status.selectedTtsEngine.id, "apex-lightweight-kokoro");
  assert.equal(status.selectedTtsEngine.provider, "kokoro-onnx");
  assert.equal(status.selectedTtsEngine.voiceId, "am_michael");
  assert.equal(status.lockedLightweightVoiceReady, true);
  assert.equal(status.fallbackActive, false);
  assert.equal(status.voiceIdentityLocked, true);
  assert.equal(status.voiceboxDefaultActive, false);
  assert.equal(status.selectedTtsEngine.local, true);
  assert.equal(status.browserPlaybackIsFallbackOnly, true);
  assert.equal(status.openAiAudioUsed, false);
  assert.equal(status.nativeVoice.available, true);
  assert.equal(status.nativeInputAvailable, true);
  assert.equal(status.preferredInputMode, "windows-native-wav-gpu");
  assert.equal(status.nativeVoice.sttProvider, "faster-whisper-cuda");
  assert.equal(status.nativeVoice.sttProcessor, "gpu");
  assert.equal(status.browserMicRequired, false);
});

test("Voicebox Apex profile is not preferred over locked lightweight fallback by default", async () => {
  const voiceboxFetch = createVoiceboxFetch({
    "/api/profiles": createMockResponse({ profiles: [{ id: "apex-id", name: "Apex" }] }),
  });
  const status = await getApexLocalVoiceRuntimeStatus({
    env: {},
    platform: "win32",
    loadPersistedConfig: false,
    kokoroOnnxPackageAvailable: true,
    voiceboxFetchImpl: voiceboxFetch,
    voiceboxResourceGuard: {
      provider: "voicebox",
      status: "optional-premium-ready",
      running: true,
      premiumEligible: true,
      defaultEligible: false,
      optionalPremium: true,
      notRequiredForNormalVoice: true,
    },
  });

  assert.equal(status.canSpeakLocally, true);
  assert.equal(status.selectedTtsEngine.id, "apex-lightweight-kokoro");
  assert.equal(status.voicebox.canSpeakWithApexProfile, true);
  assert.equal(status.voiceboxDefaultActive, false);
  assert.equal(status.voiceboxOptionalPremium, true);
  assert.equal(status.openAiAudioUsed, false);
  assert.equal(status.cloudAudioAllowed, false);
});

test("Voicebox local speech is premium-only and requires explicit request", async () => {
  const audio = Buffer.from("RIFFvoicebox-local-audio", "utf8");
  const voiceboxFetch = createVoiceboxFetch({
    "/api/profiles": createMockResponse({ profiles: [{ id: "apex-id", name: "Apex" }] }),
    "POST /api/tts": createMockResponse(audio, { contentType: "audio/wav" }),
  });
  const payload = await speakWithApexLocalVoice({
    text: "Apex, test your voice",
    voice: "premium",
    platform: "win32",
    voiceboxFetchImpl: voiceboxFetch,
    voiceboxResourceGuard: {
      provider: "voicebox",
      status: "optional-premium-ready",
      running: true,
      premiumEligible: true,
      defaultEligible: false,
      optionalPremium: true,
      notRequiredForNormalVoice: true,
    },
  });

  assert.equal(payload.ok, true);
  assert.equal(payload.engine, "voicebox-apex");
  assert.equal(payload.profileName, "Apex");
  assert.equal(payload.providerFallback, false);
  assert.equal(payload.audioBase64, audio.toString("base64"));
  assert.equal(payload.openAiAudioUsed, false);
  assert.equal(payload.cloudAudioAllowed, false);
  assert.match(payload.aiDisclosure, /saved Apex Voicebox profile|optional premium Voicebox/i);
});

test("Windows SAPI is detected as local STT on Windows", async () => {
  const status = await getApexLocalVoiceRuntimeStatus({
    env: {},
    platform: "win32",
    disableSttAutoDiscovery: true,
    voiceboxFetchImpl: async () => {
      throw new Error("voicebox offline for isolated test");
    },
  });

  assert.equal(status.canHearLocally, true);
  assert.equal(status.selectedSttEngine.id, "windows-sapi");
  assert.equal(status.selectedSttEngine.processor, "cpu");
  assert.equal(status.sttFallbackActive, true);
  assert.equal(status.sttGpuCapable, false);
  assert.equal(status.conversionTools.some((tool) => tool.id === "browser-web-audio-wav" && tool.available), true);
  assert.equal(status.audioSentToCloud, false);
  assert.equal(status.openAiAudioUsed, false);
});

test("auto-discovered faster-whisper CUDA is preferred over Windows SAPI", async () => {
  const status = await getApexLocalVoiceRuntimeStatus({
    env: {},
    platform: "win32",
    fasterWhisperPythonRuntime: {
      available: true,
      moduleAvailable: true,
      ctranslate2Available: true,
      cudaAvailable: true,
      cudaDeviceCount: 1,
      supportedComputeTypes: ["float16", "int8_float16"],
      wrapperAvailable: true,
      pythonCommand: "python",
      modelName: "small.en",
    },
    voiceboxFetchImpl: async () => {
      throw new Error("voicebox offline for isolated test");
    },
  });

  assert.equal(status.canHearLocally, true);
  assert.equal(status.selectedSttEngine.id, "faster-whisper-cuda");
  assert.equal(status.selectedSttEngine.processor, "gpu");
  assert.equal(status.selectedSttEngine.modelName, "small.en");
  assert.equal(status.selectedSttEngine.autoDiscovered, true);
  assert.equal(status.sttFallbackActive, false);
  assert.equal(status.sttProcessor, "gpu");
  assert.equal(status.openAiAudioUsed, false);
  assert.equal(status.audioSentToCloud, false);
  assertNoSecretValues(status);
});

test("cached local voice status avoids repeated expensive discovery within TTL", async () => {
  clearApexLocalVoiceRuntimeStatusCache();
  let voiceboxCalls = 0;
  const input = {
    cacheKey: "voice-cache-test",
    cacheTtlMs: 30_000,
    env: {},
    platform: "win32",
    loadPersistedConfig: false,
    kokoroOnnxPackageAvailable: true,
    fasterWhisperPythonRuntime: {
      available: true,
      moduleAvailable: true,
      ctranslate2Available: true,
      cudaAvailable: true,
      cudaDeviceCount: 1,
      supportedComputeTypes: ["float16"],
      wrapperAvailable: true,
      pythonCommand: "python",
      modelName: "small.en",
    },
    voiceboxFetchImpl: async () => {
      voiceboxCalls += 1;
      throw new Error("voicebox offline for isolated test");
    },
  };

  const first = await getCachedApexLocalVoiceRuntimeStatus(input);
  const callsAfterFirst = voiceboxCalls;
  const second = await getCachedApexLocalVoiceRuntimeStatus(input);

  assert.equal(first.cached, false);
  assert.equal(first.cacheHit, false);
  assert.equal(second.cached, true);
  assert.equal(second.cacheHit, true);
  assert.equal(second.selectedSttEngine.id, "faster-whisper-cuda");
  assert.equal(voiceboxCalls, callsAfterFirst);
  clearApexLocalVoiceRuntimeStatusCache();
});

test("configured faster-whisper CUDA is preferred over Windows SAPI fallback", async () => {
  const status = await getApexLocalVoiceRuntimeStatus({
    env: {
      [APEX_LOCAL_VOICE_ENV.STT_PROVIDER]: "faster-whisper-cuda",
      [APEX_LOCAL_VOICE_ENV.STT_COMMAND]: "faster-whisper",
      [APEX_LOCAL_VOICE_ENV.STT_MODEL]: "small.en",
      [APEX_LOCAL_VOICE_ENV.STT_DEVICE]: "cuda",
      [APEX_LOCAL_VOICE_ENV.STT_COMPUTE_TYPE]: "float16",
    },
    platform: "win32",
    voiceboxFetchImpl: async () => {
      throw new Error("voicebox offline for isolated test");
    },
  });

  assert.equal(status.canHearLocally, true);
  assert.equal(status.selectedSttEngine.id, "faster-whisper-cuda");
  assert.equal(status.selectedSttEngine.processor, "gpu");
  assert.equal(status.selectedSttEngine.gpuCapable, true);
  assert.equal(status.sttFallbackActive, false);
  assert.equal(status.sttProcessor, "gpu");
  assert.equal(status.sttGpuCapable, true);
  assert.equal(status.openAiAudioUsed, false);
  assert.equal(status.audioSentToCloud, false);
});

test("faster-whisper transcription records GPU receipt metadata without OpenAI", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "apex-local-fast-whisper-command-"));
  try {
    const fakeCommandPath = path.join(tempRoot, "fake-faster-whisper.cjs");
    await fs.writeFile(fakeCommandPath, [
      "const fs = require('fs');",
      "const path = require('path');",
      "const outputDir = process.argv[2];",
      "fs.mkdirSync(outputDir, { recursive: true });",
      "fs.writeFileSync(path.join(outputDir, 'transcript.txt'), 'Apex can hear locally.');",
      "console.log(JSON.stringify({ ok: true, model: 'small.en', processor: 'gpu', durationMs: 123 }));",
    ].join("\n"), "utf8");
    const payload = await transcribeWithApexLocalVoice({
      audioDataUrl: createSilentWavDataUrl(),
      env: {
        [APEX_LOCAL_VOICE_ENV.STT_PROVIDER]: "faster-whisper-cuda",
        [APEX_LOCAL_VOICE_ENV.STT_COMMAND]: process.execPath,
        [APEX_LOCAL_VOICE_ENV.STT_COMMAND_ARGS_JSON]: JSON.stringify([fakeCommandPath, "{outputDir}"]),
        [APEX_LOCAL_VOICE_ENV.STT_MODEL]: "small.en",
        [APEX_LOCAL_VOICE_ENV.STT_DEVICE]: "cuda",
        [APEX_LOCAL_VOICE_ENV.STT_COMPUTE_TYPE]: "float16",
      },
      platform: "win32",
      disableSttAutoDiscovery: true,
    });

    assert.equal(payload.ok, true);
    assert.equal(payload.transcript, "Apex can hear locally.");
    assert.equal(payload.receipt.engine, "faster-whisper-cuda");
    assert.equal(payload.receipt.processor, "gpu");
    assert.equal(payload.receipt.modelName, "small.en");
    assert.equal(payload.receipt.providerTimingMs, 123);
    assert.equal(payload.receipt.audioValid, true);
    assert.equal(payload.receipt.audio.sampleRate, 16000);
    assert.equal(payload.receipt.audio.channelCount, 1);
    assert.equal(payload.audioStored, false);
    assert.equal(payload.openAiAudioUsed, false);
    assertNoSecretValues(payload);
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test("local voice diagnostics reject invalid and too-short audio with exact receipts", async () => {
  const invalid = await transcribeWithApexLocalVoice({
    turnId: "turn-invalid-url",
    audioDataUrl: "not-a-data-url",
    env: {},
    platform: "win32",
    disableSttAutoDiscovery: true,
  });

  assert.equal(invalid.ok, false);
  assert.equal(invalid.failureReason, APEX_VOICE_TURN_FAILURE_REASONS.INVALID_DATA_URL);
  assert.equal(invalid.receipt.audioValid, false);
  assert.equal(invalid.receipt.failureReason, APEX_VOICE_TURN_FAILURE_REASONS.INVALID_DATA_URL);
  assert.match(invalid.error, /invalid data URL/i);
  assert.equal(invalid.openAiAudioUsed, false);

  const short = await transcribeWithApexLocalVoice({
    turnId: "turn-too-short",
    audioDataUrl: createSilentWavDataUrl({ durationMs: 60 }),
    env: {
      [APEX_LOCAL_VOICE_ENV.STT_PROVIDER]: "faster-whisper-cuda",
      [APEX_LOCAL_VOICE_ENV.STT_COMMAND]: process.execPath,
      [APEX_LOCAL_VOICE_ENV.STT_COMMAND_ARGS_JSON]: JSON.stringify(["-e", "process.exit(1)"]),
      [APEX_LOCAL_VOICE_ENV.STT_MODEL]: "small.en",
      [APEX_LOCAL_VOICE_ENV.STT_DEVICE]: "cuda",
    },
    platform: "win32",
    disableSttAutoDiscovery: true,
  });

  assert.equal(short.ok, false);
  assert.equal(short.failureReason, APEX_VOICE_TURN_FAILURE_REASONS.TOO_SHORT);
  assert.equal(short.receipt.audioValid, false);
  assert.match(short.error, /too short/i);
  assert.equal(short.openAiAudioUsed, false);
});

test("local voice diagnostics use browser caption fallback instead of bad audio when available", async () => {
  const payload = await transcribeWithApexLocalVoice({
    turnId: "turn-browser-caption",
    audioDataUrl: "not-a-data-url",
    browserTranscript: "Apex can hear me from browser captions",
    env: {},
    platform: "win32",
    disableSttAutoDiscovery: true,
  });

  assert.equal(payload.ok, true);
  assert.equal(payload.transcript, "Apex can hear me from browser captions");
  assert.equal(payload.receipt.status, "browser-caption-fallback");
  assert.equal(payload.receipt.audioValid, false);
  assert.equal(payload.openAiAudioUsed, false);
});

test("local voice diagnostics block original MediaRecorder audio when browser WAV conversion fails", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "apex-local-webm-fallback-"));
  try {
    const fakeCommandPath = path.join(tempRoot, "fake-faster-whisper-webm.cjs");
    const markerPath = path.join(tempRoot, "stt-called.txt");
    await fs.writeFile(fakeCommandPath, [
      "const fs = require('fs');",
      "const path = require('path');",
      "const outputDir = process.argv[2];",
      `fs.writeFileSync(${JSON.stringify(markerPath)}, 'called');`,
      "fs.mkdirSync(outputDir, { recursive: true });",
      "fs.writeFileSync(path.join(outputDir, 'transcript.txt'), 'Apex heard the source audio.');",
      "console.log(JSON.stringify({ ok: true, model: 'small.en', processor: 'gpu', durationMs: 222 }));",
    ].join("\n"), "utf8");

    const payload = await transcribeWithApexLocalVoice({
      turnId: "turn-webm-fallback",
      audioDataUrl: `data:audio/webm;codecs=opus;base64,${Buffer.alloc(5000).toString("base64")}`,
      audioTurn: {
        turnId: "turn-webm-fallback",
        sourceMimeType: "audio/webm;codecs=opus",
        sourceByteLength: 5000,
        convertedMimeType: "audio/webm;codecs=opus",
        convertedByteLength: 5000,
        browserWavConversionFailed: true,
        clientConversionFailureReason: "wav-conversion-failed",
        fallbackMode: "server-local-stt-source-audio",
      },
      env: {
        [APEX_LOCAL_VOICE_ENV.STT_PROVIDER]: "faster-whisper-cuda",
        [APEX_LOCAL_VOICE_ENV.STT_COMMAND]: process.execPath,
        [APEX_LOCAL_VOICE_ENV.STT_COMMAND_ARGS_JSON]: JSON.stringify([fakeCommandPath, "{outputDir}"]),
        [APEX_LOCAL_VOICE_ENV.STT_MODEL]: "small.en",
        [APEX_LOCAL_VOICE_ENV.STT_DEVICE]: "cuda",
        [APEX_LOCAL_VOICE_ENV.STT_COMPUTE_TYPE]: "float16",
      },
      platform: "win32",
      disableSttAutoDiscovery: true,
    });

    assert.equal(payload.ok, false);
    assert.equal(payload.transcript, "");
    assert.equal(payload.failureReason, APEX_VOICE_TURN_FAILURE_REASONS.WAV_CONVERSION_FAILED);
    assert.equal(payload.receipt.audioValid, false);
    assert.equal(payload.receipt.readyForTranscription, false);
    assert.equal(payload.receipt.audio.convertedMimeType, "audio/webm");
    assert.equal(payload.receipt.audio.browserWavConversionFailed, true);
    assert.equal(payload.receipt.audio.clientConversionFailureReason, "wav-conversion-failed");
    assert.equal(payload.receipt.openAiAudioUsed, false);
    await assert.rejects(fs.access(markerPath));
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test("always-open mic gate blocks STT command while quiet, speaking, or recovering", async () => {
  for (const state of [
    APEX_ALWAYS_OPEN_MIC_STATE.QUIET,
    APEX_ALWAYS_OPEN_MIC_STATE.SPEAKING,
    APEX_ALWAYS_OPEN_MIC_STATE.RECOVERING,
  ]) {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), `apex-always-open-${state}-`));
    try {
      const markerPath = path.join(tempRoot, "stt-called.txt");
      const fakeCommandPath = path.join(tempRoot, "fake-faster-whisper.cjs");
      await fs.writeFile(fakeCommandPath, [
        "const fs = require('fs');",
        `fs.writeFileSync(${JSON.stringify(markerPath)}, 'called');`,
        "console.log(JSON.stringify({ ok: true, model: 'small.en', processor: 'gpu' }));",
      ].join("\n"), "utf8");

      const payload = await transcribeWithApexLocalVoice({
        audioDataUrl: createSilentWavDataUrl(),
        alwaysOpenMic: {
          state,
          ingressProvider: "browser",
          vadProvider: "amplitude-gate",
          speechDetected: true,
          readyForTranscription: true,
          captureDurationMs: 1500,
          sustainedSilenceMs: 800,
        },
        env: {
          [APEX_LOCAL_VOICE_ENV.STT_PROVIDER]: "faster-whisper-cuda",
          [APEX_LOCAL_VOICE_ENV.STT_COMMAND]: process.execPath,
          [APEX_LOCAL_VOICE_ENV.STT_COMMAND_ARGS_JSON]: JSON.stringify([fakeCommandPath, "{outputDir}"]),
          [APEX_LOCAL_VOICE_ENV.STT_MODEL]: "small.en",
          [APEX_LOCAL_VOICE_ENV.STT_DEVICE]: "cuda",
          [APEX_LOCAL_VOICE_ENV.STT_COMPUTE_TYPE]: "float16",
        },
        platform: "win32",
        disableSttAutoDiscovery: true,
      });

      assert.equal(payload.ok, false);
      assert.equal(payload.gated, true);
      assert.equal(payload.transcript, "");
      assert.equal(payload.receipt.status, "muted");
      assert.equal(payload.receipt.micState, state);
      assert.equal(payload.receipt.openAiAudioUsed, false);
      await assert.rejects(fs.access(markerPath));
      assertNoSecretValues(payload);
    } finally {
      await fs.rm(tempRoot, { recursive: true, force: true });
    }
  }
});

test("always-open mic ready turn transcribes after sustained silence and records gate receipt", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "apex-always-open-ready-"));
  try {
    const fakeCommandPath = path.join(tempRoot, "fake-faster-whisper.cjs");
    await fs.writeFile(fakeCommandPath, [
      "const fs = require('fs');",
      "const path = require('path');",
      "const outputDir = process.argv[2];",
      "fs.mkdirSync(outputDir, { recursive: true });",
      "fs.writeFileSync(path.join(outputDir, 'transcript.txt'), 'Apex can you hear me');",
      "console.log(JSON.stringify({ ok: true, model: 'small.en', processor: 'gpu', durationMs: 321 }));",
    ].join("\n"), "utf8");

    const payload = await transcribeWithApexLocalVoice({
      audioDataUrl: createSilentWavDataUrl(),
      alwaysOpenMic: {
        state: APEX_ALWAYS_OPEN_MIC_STATE.PROCESSING,
        ingressProvider: "browser",
        vadProvider: "amplitude-gate",
        speechDetected: true,
        readyForTranscription: true,
        captureDurationMs: 1610,
        silenceDurationMs: 700,
        sustainedSilenceMs: 700,
        droppedFramesWhileMuted: 4,
      },
      env: {
        [APEX_LOCAL_VOICE_ENV.STT_PROVIDER]: "faster-whisper-cuda",
        [APEX_LOCAL_VOICE_ENV.STT_COMMAND]: process.execPath,
        [APEX_LOCAL_VOICE_ENV.STT_COMMAND_ARGS_JSON]: JSON.stringify([fakeCommandPath, "{outputDir}"]),
        [APEX_LOCAL_VOICE_ENV.STT_MODEL]: "small.en",
        [APEX_LOCAL_VOICE_ENV.STT_DEVICE]: "cuda",
        [APEX_LOCAL_VOICE_ENV.STT_COMPUTE_TYPE]: "float16",
      },
      platform: "win32",
      disableSttAutoDiscovery: true,
    });

    assert.equal(payload.ok, true);
    assert.equal(payload.transcript, "Apex can you hear me");
    assert.equal(payload.receipt.engine, "faster-whisper-cuda");
    assert.equal(payload.receipt.processor, "gpu");
    assert.equal(payload.receipt.ingressProvider, "browser");
    assert.equal(payload.receipt.vadProvider, "amplitude-gate");
    assert.equal(payload.receipt.micState, APEX_ALWAYS_OPEN_MIC_STATE.PROCESSING);
    assert.equal(payload.receipt.speechDetected, true);
    assert.equal(payload.receipt.captureDurationMs, 1610);
    assert.equal(payload.receipt.silenceDurationMs, 700);
    assert.equal(payload.receipt.voiceCloseMs, 700);
    assert.equal(payload.receipt.sustainedSilenceMs, 700);
    assert.equal(payload.receipt.droppedFramesWhileMuted, 4);
    assert.equal(payload.receipt.alwaysOpenMic.openAiAudioUsed, false);
    assert.equal(payload.openAiAudioUsed, false);
    assertNoSecretValues(payload);
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test("configured whisper.cpp CUDA is preferred when faster-whisper is not configured", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "apex-local-voice-cuda-test-"));
  try {
    const modelPath = path.join(tempRoot, "ggml-model.bin");
    await fs.writeFile(modelPath, "fake model");
    const status = await getApexLocalVoiceRuntimeStatus({
      env: {
        [APEX_LOCAL_VOICE_ENV.STT_PROVIDER]: "whisper.cpp-cuda",
        [APEX_LOCAL_VOICE_ENV.STT_COMMAND]: "whisper-cli",
        [APEX_LOCAL_VOICE_ENV.STT_MODEL_PATH]: modelPath,
      },
      platform: "win32",
      voiceboxFetchImpl: async () => {
        throw new Error("voicebox offline for isolated test");
      },
    });

    assert.equal(status.canHearLocally, true);
    assert.equal(status.selectedSttEngine.id, "whisper.cpp-cuda");
    assert.equal(status.selectedSttEngine.processor, "gpu");
    assert.equal(status.sttFallbackActive, false);
    assert.equal(status.sttGpuCapable, true);
    assert.equal(status.openAiAudioUsed, false);
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test("configured whisper model marks local STT ready", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "apex-local-voice-test-"));
  try {
    const modelPath = path.join(tempRoot, "ggml-model.bin");
    await fs.writeFile(modelPath, "fake model");
    const status = await getApexLocalVoiceRuntimeStatus({
      env: {
        [APEX_LOCAL_VOICE_ENV.STT_COMMAND]: "whisper-cli",
        [APEX_LOCAL_VOICE_ENV.STT_MODEL_PATH]: modelPath,
      },
      platform: "linux",
      voiceboxFetchImpl: async () => {
        throw new Error("voicebox offline for isolated test");
      },
    });

    assert.equal(status.canHearLocally, true);
    assert.equal(status.selectedSttEngine.id, "whisper.cpp");
    assert.equal(status.audioSentToCloud, false);
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test("Windows SAPI local STT requires WAV after client conversion", async () => {
  const audioDataUrl = `data:audio/webm;base64,${Buffer.alloc(5000).toString("base64")}`;
  const payload = await transcribeWithApexLocalVoice({
    audioDataUrl,
    env: {},
    platform: "win32",
    disableSttAutoDiscovery: true,
  });

  assert.equal(payload.ok, false);
  assert.equal(payload.conversionRequired, true);
  assert.equal(payload.transcript, "");
  assert.equal(payload.openAiAudioUsed, false);
  assert.match(payload.error, /requires WAV/i);
});

test("Windows SAPI local STT transcribes a local WAV without OpenAI", { skip: process.platform !== "win32" }, async () => {
  const audioDataUrl = await createSapiSpeechWavDataUrl("Apex can you hear me");
  const payload = await transcribeWithApexLocalVoice({
    audioDataUrl,
    env: {},
    platform: "win32",
    disableSttAutoDiscovery: true,
  });

  assert.equal(payload.ok, true);
  assert.match(payload.transcript, /can you hear me/i);
  assert.equal(payload.receipt.engine, "windows-sapi");
  assert.equal(payload.audioStored, false);
  assert.equal(payload.openAiAudioUsed, false);
  assert.equal(payload.cloudAudioAllowed, false);
});

test("local speech missing returns fallback data without fake success", async () => {
  const payload = await speakWithApexLocalVoice({
    text: "Apex test response.",
    env: {},
    platform: "linux",
    loadPersistedConfig: false,
    kokoroOnnxPackageAvailable: false,
    voiceboxFetchImpl: async () => {
      throw new Error("voicebox offline for isolated test");
    },
  });

  assert.equal(payload.ok, false);
  assert.equal(payload.providerFallback, true);
  assert.equal(payload.audioBase64, "");
  assert.equal(payload.openAiAudioUsed, false);
  assert.equal(payload.browserPlaybackIsFallbackOnly, true);
  assert.match(payload.error, /Local TTS/i);
});

test("Windows SAPI local TTS returns local audio without OpenAI", { skip: process.platform !== "win32" }, async () => {
  const payload = await speakWithApexLocalVoice({
    text: "Apex can speak locally.",
    env: {},
    platform: "win32",
    loadPersistedConfig: false,
    kokoroOnnxPackageAvailable: false,
    voiceboxFetchImpl: async () => {
      throw new Error("voicebox offline for isolated test");
    },
  });

  assert.equal(payload.ok, true);
  assert.equal(payload.provider, "apex-local-voice");
  assert.equal(payload.contentType, "audio/wav");
  assert.equal(Boolean(payload.audioBase64), true);
  assert.equal(payload.receipt.engine, "windows-sapi");
  assert.equal(payload.receipt.voiceIdentity, "apex-lightweight");
  assert.equal(payload.providerFallback, true);
  assert.equal(payload.fallbackFrom, "apex-lightweight-kokoro");
  assert.equal(payload.receipt.status, "spoken");
  assert.equal(payload.receipt.locked, false);
  assert.equal(Number.isFinite(payload.receipt.generationTimingMs), true);
  assert.match(payload.receipt.fallbackReason, /kokoro-js|Kokoro ONNX|could not be imported/i);
  assert.equal(payload.audioStored, false);
  assert.equal(payload.openAiAudioUsed, false);
  assert.equal(payload.cloudAudioAllowed, false);
});

test("locked lightweight TTS is preferred and records timing receipt without Windows fallback", async () => {
  const { tempRoot, wavPath } = await createApexAnchorWav();
  const scriptPath = path.join(tempRoot, "fake-offlinetts.mjs");
  await fs.writeFile(scriptPath, `
    import fs from "node:fs";
    const outputIndex = process.argv.indexOf("--output_file");
    const outputPath = process.argv[outputIndex + 1];
    process.stdin.resume();
    process.stdin.on("end", () => fs.writeFileSync(outputPath, Buffer.from("RIFFfake-locked-apex-voice")));
  `, "utf8");
  try {
    const payload = await speakWithApexLocalVoice({
      text: "Apex, test your voice.",
      env: {
        [APEX_LIGHTWEIGHT_VOICE_ENV.REFERENCE_WAV_PATH]: wavPath,
        [APEX_LIGHTWEIGHT_VOICE_ENV.PROVIDER]: "offlinetts",
        [APEX_LIGHTWEIGHT_VOICE_ENV.VOICE_NAME]: "apex-offlinetts",
        [APEX_LIGHTWEIGHT_VOICE_ENV.COMMAND]: process.execPath,
        [APEX_LIGHTWEIGHT_VOICE_ENV.COMMAND_ARGS_JSON]: JSON.stringify([scriptPath, "--voice", "{voice}", "--output_file", "{output}"]),
      },
      platform: "win32",
      disableSttAutoDiscovery: true,
      voiceboxFetchImpl: async () => {
        throw new Error("voicebox offline for isolated test");
      },
    });

    assert.equal(payload.ok, true);
    assert.equal(payload.engine, "apex-lightweight-kokoro");
    assert.equal(payload.ttsProvider, "offlinetts");
    assert.equal(payload.profileName, "apex-offlinetts");
    assert.equal(payload.providerFallback, false);
    assert.equal(payload.locked, true);
    assert.equal(payload.receipt.locked, true);
    assert.equal(payload.receipt.providerFallback, false);
    assert.equal(Number.isFinite(payload.receipt.generationTimingMs), true);
    assert.equal(payload.latencyProfile.provider, "apex-latency-profiler");
    assert.equal(payload.receipt.latencyProfile.provider, "apex-latency-profiler");
    assert.equal(payload.receipt.latencyProfile.steps.some((step) => step.id === "ttsGenerationMs"), true);
    assert.equal(payload.audioBase64, Buffer.from("RIFFfake-locked-apex-voice").toString("base64"));
    assert.equal(payload.openAiAudioUsed, false);
    assert.equal(payload.cloudAudioAllowed, false);
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test("fast simple voice request bypasses locked lightweight TTS for low-latency testing", { skip: process.platform !== "win32" }, async () => {
  const { tempRoot, wavPath } = await createApexAnchorWav();
  const scriptPath = path.join(tempRoot, "fake-offlinetts.mjs");
  await fs.writeFile(scriptPath, `
    import fs from "node:fs";
    const outputIndex = process.argv.indexOf("--output_file");
    const outputPath = process.argv[outputIndex + 1];
    process.stdin.resume();
    process.stdin.on("end", () => fs.writeFileSync(outputPath, Buffer.from("RIFFfake-locked-apex-voice")));
  `, "utf8");
  try {
    const payload = await speakWithApexLocalVoice({
      text: "Fast local voice test.",
      voiceMode: "fast-fallback",
      preferFastVoice: true,
      env: {
        [APEX_LIGHTWEIGHT_VOICE_ENV.REFERENCE_WAV_PATH]: wavPath,
        [APEX_LIGHTWEIGHT_VOICE_ENV.PROVIDER]: "offlinetts",
        [APEX_LIGHTWEIGHT_VOICE_ENV.VOICE_NAME]: "apex-offlinetts",
        [APEX_LIGHTWEIGHT_VOICE_ENV.COMMAND]: process.execPath,
        [APEX_LIGHTWEIGHT_VOICE_ENV.COMMAND_ARGS_JSON]: JSON.stringify([scriptPath, "--voice", "{voice}", "--output_file", "{output}"]),
      },
      platform: "win32",
      disableSttAutoDiscovery: true,
      voiceboxFetchImpl: async () => {
        throw new Error("voicebox offline for isolated test");
      },
    });

    assert.equal(payload.ok, true);
    assert.equal(payload.engine, "windows-sapi");
    assert.equal(payload.selectedTtsEngine, "windows-sapi");
    assert.equal(payload.locked, false);
    assert.match(payload.aiDisclosure, /fast simple local windows-sapi voice/i);
    assert.equal(payload.openAiAudioUsed, false);
    assert.equal(payload.cloudAudioAllowed, false);
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test("local transcription missing fails closed without OpenAI", async () => {
  const audioDataUrl = createSilentWavDataUrl();
  const payload = await transcribeWithApexLocalVoice({
    audioDataUrl,
    env: {},
    platform: "linux",
  });

  assert.equal(payload.ok, false);
  assert.equal(payload.transcript, "");
  assert.equal(payload.audioStored, false);
  assert.equal(payload.openAiAudioUsed, false);
  assert.equal(payload.cloudAudioAllowed, false);
  assert.equal(payload.executionLocked, true);
  assert.match(payload.error, /Local STT/i);
});

test("local voice status endpoint is operator-only and safe", async () => {
  const fixture = await startApexServer({
    APEX_FAKE_SECRET_FOR_LOCAL_VOICE_TEST: SECRET_VALUE,
    [APEX_LOCAL_VOICE_ENV.DISABLED]: "true",
  });

  try {
    setOperatorAccess(fixture.sqliteFile, "demo.ops@apexhq.app", true);
    const operatorLogin = await login(fixture.baseUrl, {
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
    });

    const adminUser = createUserRecord({
      id: "U-LOCAL-VOICE-ADMIN",
      email: "local-voice-admin@apexhq.test",
      password: "apexdemo123",
      name: "Local Voice Admin",
      role: "Administrator",
    });
    const fieldUser = createUserRecord({
      id: "U-LOCAL-VOICE-FIELD",
      email: "local-voice-field@apexhq.test",
      password: "apexdemo123",
      name: "Local Voice Field",
      role: "Foreman",
      operatorAccess: true,
    });
    insertUser(fixture.sqliteFile, adminUser);
    insertUser(fixture.sqliteFile, fieldUser);

    const adminLogin = await login(fixture.baseUrl, {
      email: adminUser.email,
      password: "apexdemo123",
    });
    const fieldLogin = await login(fixture.baseUrl, {
      email: fieldUser.email,
      password: "apexdemo123",
    });

    const operatorStatus = await requestJson(fixture.baseUrl, "/api/apex-os/local-voice/status", {
      headers: authHeaders(operatorLogin.token),
    });
    assert.equal(operatorStatus.response.status, 200);
    assert.equal(operatorStatus.payload.localVoice.provider, "apex-local-voice");
    assert.equal(operatorStatus.payload.localVoice.status, "disabled");
    assert.equal(operatorStatus.payload.execution.openAiAudioUsed, false);
    assert.equal(operatorStatus.payload.execution.browserPlaybackIsFallbackOnly, true);
    assertNoSecretValues(operatorStatus.payload);

    const operatorVoiceSelection = await requestJson(fixture.baseUrl, "/api/apex-os/local-voice/voice-selection", {
      method: "POST",
      headers: authHeaders(operatorLogin.token),
      body: JSON.stringify({ action: "next-male" }),
    });
    assert.equal(operatorVoiceSelection.response.status, 200);
    assert.equal(operatorVoiceSelection.payload.voiceSelection.provider, "kokoro-onnx");
    assert.equal(operatorVoiceSelection.payload.voiceSelection.locked, true);
    assert.equal(operatorVoiceSelection.payload.voiceSelection.persisted, true);
    assert.equal(operatorVoiceSelection.payload.execution.openAiAudioUsed, false);
    assert.equal(operatorVoiceSelection.payload.execution.cloudAudioAllowed, false);
    assertNoSecretValues(operatorVoiceSelection.payload);

    for (const blockedLogin of [adminLogin, fieldLogin]) {
      const blocked = await requestJson(fixture.baseUrl, "/api/apex-os/local-voice/status", {
        headers: authHeaders(blockedLogin.token),
      });
      assert.equal(blocked.response.status, 403);

      const blockedVoiceSelection = await requestJson(fixture.baseUrl, "/api/apex-os/local-voice/voice-selection", {
        method: "POST",
        headers: authHeaders(blockedLogin.token),
        body: JSON.stringify({ action: "next-male" }),
      });
      assert.equal(blockedVoiceSelection.response.status, 403);
    }
  } finally {
    await fixture.stop();
  }
});

test("native listen endpoint is operator-only and uses local command without cloud audio", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "apex-native-voice-endpoint-"));
  const fakeScript = path.join(tempRoot, "fake-native-listen.cjs");
  await fs.writeFile(
    fakeScript,
    "process.stdout.write(JSON.stringify({ text: 'Apex native endpoint works', confidence: 0.91 }));\n",
  );
  const fixture = await startApexServer({
    APEX_FAKE_SECRET_FOR_NATIVE_VOICE_ENDPOINT_TEST: SECRET_VALUE,
    [APEX_NATIVE_VOICE_ENV.PROVIDER]: "custom-native-command",
    [APEX_NATIVE_VOICE_ENV.COMMAND]: process.execPath,
    [APEX_NATIVE_VOICE_ENV.COMMAND_ARGS_JSON]: JSON.stringify([fakeScript]),
  });

  try {
    setOperatorAccess(fixture.sqliteFile, "demo.ops@apexhq.app", true);
    const operatorLogin = await login(fixture.baseUrl, {
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
    });

    const fieldUser = createUserRecord({
      id: "U-NATIVE-VOICE-FIELD",
      email: "native-voice-field@apexhq.test",
      password: "apexdemo123",
      name: "Native Voice Field",
      role: "Foreman",
      operatorAccess: true,
    });
    insertUser(fixture.sqliteFile, fieldUser);
    const fieldLogin = await login(fixture.baseUrl, {
      email: fieldUser.email,
      password: "apexdemo123",
    });

    const operatorListen = await requestJson(fixture.baseUrl, "/api/apex-os/local-voice/native-listen", {
      method: "POST",
      headers: authHeaders(operatorLogin.token),
      body: JSON.stringify({ listenSeconds: 2 }),
    });
    assert.equal(operatorListen.response.status, 200);
    assert.equal(operatorListen.payload.provider, "apex-native-voice");
    assert.equal(operatorListen.payload.ok, true);
    assert.equal(operatorListen.payload.transcript, "Apex native endpoint works");
    assert.equal(operatorListen.payload.receipt.browserAudioConversionUsed, false);
    assert.equal(operatorListen.payload.receipt.openAiAudioUsed, false);
    assert.equal(operatorListen.payload.receipt.cloudAudioAllowed, false);
    assert.equal(operatorListen.payload.receipt.audioStored, false);
    assertNoSecretValues(operatorListen.payload);

    const blockedListen = await requestJson(fixture.baseUrl, "/api/apex-os/local-voice/native-listen", {
      method: "POST",
      headers: authHeaders(fieldLogin.token),
      body: JSON.stringify({ listenSeconds: 2 }),
    });
    assert.equal(blockedListen.response.status, 403);
  } finally {
    await fixture.stop();
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test("local voice speech endpoint forwards fast simple voice preference", { skip: process.platform !== "win32" }, async () => {
  const fixture = await startApexServer({
    APEX_FAKE_SECRET_FOR_LOCAL_VOICE_SPEECH_TEST: SECRET_VALUE,
  });

  try {
    setOperatorAccess(fixture.sqliteFile, "demo.ops@apexhq.app", true);
    const operatorLogin = await login(fixture.baseUrl, {
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
    });

    const speech = await requestJson(fixture.baseUrl, "/api/apex-os/local-voice/speech", {
      method: "POST",
      headers: authHeaders(operatorLogin.token),
      body: JSON.stringify({
        text: "Fast route voice test.",
        voice: "apex",
        voiceMode: "fast-fallback",
        preferFastVoice: true,
      }),
    });

    assert.equal(speech.response.status, 200);
    assert.equal(speech.payload.ok, true);
    assert.equal(speech.payload.engine, "windows-sapi");
    assert.equal(speech.payload.selectedTtsEngine, "windows-sapi");
    assert.match(speech.payload.aiDisclosure, /fast simple local windows-sapi voice/i);
    assert.equal(speech.payload.openAiAudioUsed, false);
    assert.equal(speech.payload.cloudAudioAllowed, false);
    assertNoSecretValues(speech.payload);
  } finally {
    await fixture.stop();
  }
});

test("background runtime status endpoint is operator-only and safe", async () => {
  const fixture = await startApexServer({
    APEX_FAKE_SECRET_FOR_BACKGROUND_TEST: SECRET_VALUE,
    [APEX_LOCAL_VOICE_ENV.DISABLED]: "true",
  });

  try {
    setOperatorAccess(fixture.sqliteFile, "demo.ops@apexhq.app", true);
    const operatorLogin = await login(fixture.baseUrl, {
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
    });

    const adminUser = createUserRecord({
      id: "U-BACKGROUND-ADMIN",
      email: "background-admin@apexhq.test",
      password: "apexdemo123",
      name: "Background Admin",
      role: "Administrator",
    });
    const fieldUser = createUserRecord({
      id: "U-BACKGROUND-FIELD",
      email: "background-field@apexhq.test",
      password: "apexdemo123",
      name: "Background Field",
      role: "Foreman",
      operatorAccess: true,
    });
    insertUser(fixture.sqliteFile, adminUser);
    insertUser(fixture.sqliteFile, fieldUser);

    const adminLogin = await login(fixture.baseUrl, {
      email: adminUser.email,
      password: "apexdemo123",
    });
    const fieldLogin = await login(fixture.baseUrl, {
      email: fieldUser.email,
      password: "apexdemo123",
    });

    const operatorStatus = await requestJson(fixture.baseUrl, "/api/apex-os/background/status", {
      headers: authHeaders(operatorLogin.token),
    });
    assert.equal(operatorStatus.response.status, 200);
    assert.equal(operatorStatus.payload.background.provider, "apex-background-runtime");
    assert.equal(operatorStatus.payload.background.version, "v0");
    assert.equal(operatorStatus.payload.background.safety.operatorOnly, true);
    assert.equal(operatorStatus.payload.background.safety.windowsServiceRegistered, false);
    assert.equal(operatorStatus.payload.background.safety.startupRegistration, false);
    assert.equal(operatorStatus.payload.background.safety.externalExecutionAdded, false);
    assert.equal(operatorStatus.payload.execution.canExecuteNow, false);
    assert.equal(operatorStatus.payload.execution.windowsServiceRegistered, false);
    assert.equal(operatorStatus.payload.execution.startupRegistration, false);
    assertNoSecretValues(operatorStatus.payload);

    for (const blockedLogin of [adminLogin, fieldLogin]) {
      const blocked = await requestJson(fixture.baseUrl, "/api/apex-os/background/status", {
        headers: authHeaders(blockedLogin.token),
      });
      assert.equal(blocked.response.status, 403);
    }
  } finally {
    await fixture.stop();
  }
});
