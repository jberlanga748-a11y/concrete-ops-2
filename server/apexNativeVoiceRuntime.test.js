import assert from "node:assert/strict";
import test from "node:test";

import {
  APEX_NATIVE_VOICE_ENV,
  getApexNativeVoiceRuntimeStatus,
  listenWithApexNativeVoice,
  readApexNativeVoiceRuntimeConfig,
} from "./apexNativeVoiceRuntime.js";

const SECRET_VALUE = "sk-native-voice-secret-should-not-leak";

function assertNoSecretValues(value) {
  assert.doesNotMatch(JSON.stringify(value), /sk-native-voice-secret-should-not-leak/i);
}

test("native voice config exposes env names only", () => {
  const config = readApexNativeVoiceRuntimeConfig({
    env: {
      [APEX_NATIVE_VOICE_ENV.COMMAND]: SECRET_VALUE,
      [APEX_NATIVE_VOICE_ENV.COMMAND_ARGS_JSON]: JSON.stringify(["--secret", SECRET_VALUE]),
    },
    provider: "custom-native-command",
  });

  assert.equal(config.provider, "apex-native-voice");
  assert.equal(config.commandConfigured, true);
  assert.equal(config.envNamesOnly.COMMAND, "APEX_NATIVE_VOICE_COMMAND");
  assertNoSecretValues(config);
});

test("native voice status reports Windows native WAV to GPU STT as explicit local input", () => {
  const status = getApexNativeVoiceRuntimeStatus({
    platform: "win32",
    localSttEngine: {
      id: "faster-whisper-cuda",
      processor: "gpu",
    },
    env: {
      APEX_FAKE_NATIVE_VOICE_SECRET: SECRET_VALUE,
    },
  });

  assert.equal(status.provider, "apex-native-voice");
  assert.equal(status.version, "v1");
  assert.equal(status.status, "ready");
  assert.equal(status.available, true);
  assert.equal(status.canListenNatively, true);
  assert.equal(status.selectedInputMode, "windows-native-wav-gpu");
  assert.equal(status.captureProvider, "windows-mci-waveaudio");
  assert.equal(status.localSttHandoff, true);
  assert.equal(status.gpuSttHandoff, true);
  assert.equal(status.sttProvider, "faster-whisper-cuda");
  assert.equal(status.sttProcessor, "gpu");
  assert.equal(status.browserMicRequired, false);
  assert.equal(status.browserAudioConversionUsed, false);
  assert.equal(status.openAiAudioUsed, false);
  assert.equal(status.cloudAudioAllowed, false);
  assert.equal(status.audioStored, false);
  assert.equal(status.explicitTurnOnly, true);
  assert.equal(status.listenSeconds, 8);
  assert.equal(status.listenWindowMs, 8000);
  assertNoSecretValues(status);
});

test("native voice listen captures WAV then hands off to local GPU STT without storing audio", async () => {
  let transcriberInput = null;
  const payload = await listenWithApexNativeVoice({
    platform: "win32",
    listenSeconds: 2,
    commandRunner: async (command, args) => {
      assert.equal(command, "powershell.exe");
      assert.equal(args.includes("-Command"), true);
      return {
        ok: true,
        code: 0,
        stdout: JSON.stringify({
          ok: true,
          audioDataUrl: `data:audio/wav;base64,${Buffer.from("RIFFfake-wave").toString("base64")}`,
          byteLength: 13,
        }),
        stderr: "",
      };
    },
    localTranscriber: async (input) => {
      transcriberInput = input;
      return {
        ok: true,
        transcript: "Apex can hear me through GPU STT",
        confidence: 0,
        receipt: {
          status: "transcribed",
          engine: "faster-whisper-cuda",
          processor: "gpu",
        },
      };
    },
  });

  assert.equal(payload.ok, true);
  assert.equal(payload.provider, "apex-native-voice");
  assert.equal(payload.transcript, "Apex can hear me through GPU STT");
  assert.equal(payload.commandReview.askQuestion, "Apex can hear me through GPU STT");
  assert.equal(payload.receipt.status, "transcribed");
  assert.equal(payload.receipt.ingressProvider, "windows-native-wav-gpu");
  assert.equal(payload.receipt.captureProvider, "windows-mci-waveaudio");
  assert.equal(payload.receipt.sttProvider, "faster-whisper-cuda");
  assert.equal(payload.receipt.sttProcessor, "gpu");
  assert.equal(payload.receipt.browserMicRequired, false);
  assert.equal(payload.receipt.browserAudioConversionUsed, false);
  assert.equal(payload.receipt.openAiAudioUsed, false);
  assert.equal(payload.receipt.cloudAudioAllowed, false);
  assert.equal(payload.receipt.audioStored, false);
  assert.equal(transcriberInput.audioDataUrl.startsWith("data:audio/wav;base64,"), true);
  assert.equal(transcriberInput.audioTurn.fallbackMode, "native-windows-wav-gpu-stt");
  assertNoSecretValues(payload);
});

test("native voice listen still supports explicit Windows SAPI direct transcript mode", async () => {
  const payload = await listenWithApexNativeVoice({
    platform: "win32",
    provider: "windows-sapi-direct",
    listenSeconds: 2,
    commandRunner: async (command, args) => {
      assert.equal(command, "powershell.exe");
      assert.equal(args.includes("-Command"), true);
      return {
        ok: true,
        code: 0,
        stdout: JSON.stringify({ text: "Apex can hear me natively", confidence: 0.82 }),
        stderr: "",
      };
    },
  });

  assert.equal(payload.ok, true);
  assert.equal(payload.provider, "apex-native-voice");
  assert.equal(payload.transcript, "Apex can hear me natively");
  assert.equal(payload.commandReview.askQuestion, "Apex can hear me natively");
  assert.equal(payload.receipt.status, "transcribed");
  assert.equal(payload.receipt.ingressProvider, "windows-sapi-direct");
  assert.equal(payload.receipt.browserMicRequired, false);
  assert.equal(payload.receipt.browserAudioConversionUsed, false);
  assert.equal(payload.receipt.openAiAudioUsed, false);
  assert.equal(payload.receipt.cloudAudioAllowed, false);
  assert.equal(payload.receipt.audioStored, false);
  assertNoSecretValues(payload);
});

test("native voice listen fails cleanly when no transcript is heard", async () => {
  const payload = await listenWithApexNativeVoice({
    platform: "win32",
    provider: "windows-sapi-direct",
    commandRunner: async () => ({
      ok: true,
      code: 0,
      stdout: JSON.stringify({ text: "", confidence: 0 }),
      stderr: "",
    }),
  });

  assert.equal(payload.ok, false);
  assert.match(payload.error, /no clear words/i);
  assert.equal(payload.receipt.status, "failed");
  assert.equal(payload.browserAudioConversionUsed, false);
  assert.equal(payload.openAiAudioUsed, false);
  assert.equal(payload.cloudAudioAllowed, false);
  assert.equal(payload.audioStored, false);
});

test("native voice status can be disabled", () => {
  const status = getApexNativeVoiceRuntimeStatus({
    platform: "win32",
    env: {
      [APEX_NATIVE_VOICE_ENV.DISABLED]: "true",
    },
  });

  assert.equal(status.status, "disabled");
  assert.equal(status.available, false);
  assert.equal(status.browserFallbackAvailable, true);
  assert.equal(status.openAiAudioUsed, false);
});
