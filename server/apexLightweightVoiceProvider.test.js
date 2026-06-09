import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import test from "node:test";

import {
  APEX_LIGHTWEIGHT_VOICE_ENV,
  discoverApexLightweightVoiceProviderCandidates,
  generateApexKokoroVoiceAuditions,
  getApexLightweightVoiceProviderStatus,
  readApexLightweightVoiceProviderConfig,
  speakWithApexLightweightVoice,
} from "./apexLightweightVoiceProvider.js";

const SECRET_VALUE = "sk-lightweight-voice-secret-should-not-leak";

function assertNoSecrets(value) {
  const serialized = JSON.stringify(value);
  assert.doesNotMatch(serialized, /sk-lightweight-voice-secret-should-not-leak/i);
  assert.doesNotMatch(serialized, /C:\/private/i);
}

async function createApexAnchorWav() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "apex-lightweight-voice-test-"));
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

test("readApexLightweightVoiceProviderConfig exposes env names only", () => {
  const config = readApexLightweightVoiceProviderConfig({
    env: {
      [APEX_LIGHTWEIGHT_VOICE_ENV.PROVIDER]: "kokoro",
      [APEX_LIGHTWEIGHT_VOICE_ENV.VOICE_NAME]: "private-apex-voice",
      [APEX_LIGHTWEIGHT_VOICE_ENV.COMMAND]: "C:/private/kokoro.exe",
      APEX_FAKE_LIGHTWEIGHT_VOICE_SECRET: SECRET_VALUE,
    },
  });

  assert.equal(config.provider, "apex-lightweight-voice");
  assert.equal(config.preferredProvider, "kokoro");
  assert.equal(config.voiceIdentityLocked, true);
  assert.equal(config.voiceRotationAllowed, false);
  assert.equal(config.envNamesOnly.VOICE_NAME, APEX_LIGHTWEIGHT_VOICE_ENV.VOICE_NAME);
  assert.equal(config.secretsExposed, false);
  assertNoSecrets(config);
});

test("default Kokoro ONNX voice is ready without CLI command and never needs cloud audio", async () => {
  const { tempRoot, wavPath } = await createApexAnchorWav();
  try {
    const status = await getApexLightweightVoiceProviderStatus({
      env: {
        [APEX_LIGHTWEIGHT_VOICE_ENV.REFERENCE_WAV_PATH]: wavPath,
      },
      loadPersistedConfig: false,
      kokoroOnnxPackageAvailable: true,
    });

    assert.equal(status.status, "ready");
    assert.equal(status.available, true);
    assert.equal(status.preferredProvider, "kokoro");
    assert.equal(status.providerCompatibility, "kokoro-onnx");
    assert.equal(status.modelId, "onnx-community/Kokoro-82M-v1.0-ONNX");
    assert.equal(status.voiceId, "am_michael");
    assert.equal(status.dtype, "q8");
    assert.equal(status.processor, "cpu/onnx");
    assert.equal(status.voiceIdentityLocked, true);
    assert.equal(status.voiceNameDiscovery, "default");
    assert.equal(status.referenceVoice.matchesApexLightweightAnchor, true);
    assert.equal(status.missing.length, 0);
    assert.match(status.installSteps.join(" "), /kokoro-onnx/i);
    assert.equal(status.openAiAudioUsed, false);
    assert.equal(status.cloudAudioAllowed, false);
    assertNoSecrets(status);
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test("lightweight voice discovery reports safe command names only", async () => {
  const discovery = await discoverApexLightweightVoiceProviderCandidates({
    env: {
      [APEX_LIGHTWEIGHT_VOICE_ENV.COMMAND]: process.execPath,
      [APEX_LIGHTWEIGHT_VOICE_ENV.VOICE_NAME]: "private-apex-voice",
      APEX_FAKE_LIGHTWEIGHT_VOICE_SECRET: SECRET_VALUE,
    },
  });

  assert.equal(discovery.provider, "apex-lightweight-voice-discovery");
  assert.equal(discovery.configuredCommandName, path.basename(process.execPath));
  assert.equal(discovery.configuredCommandAvailable, true);
  assert.equal(discovery.voiceNameDiscovery, "configured");
  assert.equal(discovery.secretsExposed, false);
  assertNoSecrets(discovery);
});

test("configured Kokoro ONNX voice id marks locked lightweight voice ready", async () => {
  const { tempRoot, wavPath } = await createApexAnchorWav();
  try {
    const status = await getApexLightweightVoiceProviderStatus({
      env: {
        [APEX_LIGHTWEIGHT_VOICE_ENV.REFERENCE_WAV_PATH]: wavPath,
        [APEX_LIGHTWEIGHT_VOICE_ENV.PROVIDER]: "kokoro-onnx",
        [APEX_LIGHTWEIGHT_VOICE_ENV.VOICE_NAME]: "am_adam",
      },
      loadPersistedConfig: false,
      kokoroOnnxPackageAvailable: true,
    });

    assert.equal(status.status, "ready");
    assert.equal(status.canSpeakWithLockedVoice, true);
    assert.equal(status.voiceName, "am_adam");
    assert.equal(status.voiceId, "am_adam");
    assert.equal(status.referenceVoice.sampleRate, 24000);
    assert.equal(status.referenceVoice.channels, 1);
    assert.equal(status.referenceVoice.bitsPerSample, 16);
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test("configured OfflineTTS-compatible command marks locked lightweight voice ready", async () => {
  const { tempRoot, wavPath } = await createApexAnchorWav();
  try {
    const status = await getApexLightweightVoiceProviderStatus({
      env: {
        [APEX_LIGHTWEIGHT_VOICE_ENV.REFERENCE_WAV_PATH]: wavPath,
        [APEX_LIGHTWEIGHT_VOICE_ENV.PROVIDER]: "offlinetts",
        [APEX_LIGHTWEIGHT_VOICE_ENV.VOICE_NAME]: "apex-offlinetts",
        [APEX_LIGHTWEIGHT_VOICE_ENV.COMMAND]: process.execPath,
      },
      loadPersistedConfig: false,
    });

    assert.equal(status.status, "ready");
    assert.equal(status.canSpeakWithLockedVoice, true);
    assert.equal(status.preferredProvider, "offlinetts");
    assert.equal(status.providerCompatibility, "kokoro-compatible-cli");
    assert.equal(status.voiceName, "apex-offlinetts");
    assert.equal(status.commandAvailable, true);
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test("speakWithApexLightweightVoice uses Kokoro ONNX and writes valid local WAV", async () => {
  const { tempRoot, wavPath } = await createApexAnchorWav();
  const outputPath = path.join(tempRoot, "kokoro.wav");
  try {
    const payload = await speakWithApexLightweightVoice({
      text: "Apex test voice.",
      outputPath,
      loadPersistedConfig: false,
      env: {
        [APEX_LIGHTWEIGHT_VOICE_ENV.REFERENCE_WAV_PATH]: wavPath,
        [APEX_LIGHTWEIGHT_VOICE_ENV.PROVIDER]: "kokoro-onnx",
        [APEX_LIGHTWEIGHT_VOICE_ENV.VOICE_NAME]: "am_michael",
      },
      kokoroTtsInstance: {
        async generate(textValue, options) {
          assert.equal(textValue, "Apex test voice.");
          assert.equal(options.voice, "am_michael");
          return { data: new Float32Array([0, 0.5, -0.5, 0.25]), sampleRate: 24000 };
        },
      },
    });
    const wav = await fs.readFile(outputPath);

    assert.equal(payload.ok, true);
    assert.equal(payload.engine, "kokoro-onnx");
    assert.equal(payload.ttsProvider, "kokoro-onnx");
    assert.equal(payload.profileName, "am_michael");
    assert.equal(payload.voiceId, "am_michael");
    assert.equal(payload.modelId, "onnx-community/Kokoro-82M-v1.0-ONNX");
    assert.equal(payload.dtype, "q8");
    assert.equal(payload.processor, "cpu/onnx");
    assert.equal(payload.sampleRate, 24000);
    assert.equal(payload.outputFormat, "wav");
    assert.equal(payload.voiceIdentityLocked, true);
    assert.equal(payload.locked, true);
    assert.equal(payload.fallbackUsed, false);
    assert.equal(Number.isFinite(payload.generationTimingMs), true);
    assert.equal(wav.toString("ascii", 0, 4), "RIFF");
    assert.equal(wav.toString("ascii", 8, 12), "WAVE");
    assert.equal(payload.openAiAudioUsed, false);
    assert.equal(payload.cloudAudioAllowed, false);
    assert.match(payload.aiDisclosure, /Kokoro ONNX/i);
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test("speakWithApexLightweightVoice still supports configured legacy local command", async () => {
  const { tempRoot, wavPath } = await createApexAnchorWav();
  const scriptPath = path.join(tempRoot, "fake-kokoro.mjs");
  await fs.writeFile(scriptPath, `
    import fs from "node:fs";
    const outputIndex = process.argv.indexOf("--output_file");
    const outputPath = process.argv[outputIndex + 1];
    process.stdin.resume();
    process.stdin.on("end", () => fs.writeFileSync(outputPath, Buffer.from("RIFFfake-kokoro-audio")));
  `, "utf8");
  try {
    const payload = await speakWithApexLightweightVoice({
      text: "Apex test voice.",
      env: {
        [APEX_LIGHTWEIGHT_VOICE_ENV.REFERENCE_WAV_PATH]: wavPath,
        [APEX_LIGHTWEIGHT_VOICE_ENV.PROVIDER]: "offlinetts",
        [APEX_LIGHTWEIGHT_VOICE_ENV.VOICE_NAME]: "apex-kokoro",
        [APEX_LIGHTWEIGHT_VOICE_ENV.COMMAND]: process.execPath,
        [APEX_LIGHTWEIGHT_VOICE_ENV.COMMAND_ARGS_JSON]: JSON.stringify([scriptPath, "--voice", "{voice}", "--output_file", "{output}"]),
      },
      loadPersistedConfig: false,
    });

    assert.equal(payload.ok, true);
    assert.equal(payload.engine, "apex-lightweight-kokoro");
    assert.equal(payload.profileName, "apex-kokoro");
    assert.equal(payload.voiceIdentityLocked, true);
    assert.equal(payload.locked, true);
    assert.equal(payload.fallbackUsed, false);
    assert.equal(Number.isFinite(payload.generationTimingMs), true);
    assert.equal(payload.audioBase64, Buffer.from("RIFFfake-kokoro-audio").toString("base64"));
    assert.equal(payload.openAiAudioUsed, false);
    assert.equal(payload.cloudAudioAllowed, false);
    assert.match(payload.aiDisclosure, /Voicebox were not used/i);
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test("generateApexKokoroVoiceAuditions writes requested male samples and manifest without secrets", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "apex-kokoro-audition-test-"));
  try {
    const manifest = await generateApexKokoroVoiceAuditions({
      outputDir: tempRoot,
      voiceIds: ["am_michael", "bm_george"],
      text: "Apex audition.",
      kokoroTtsInstance: {
        async generate(_textValue, options) {
          return { data: new Float32Array(options.voice === "am_michael" ? [0, 0.1] : [0, -0.1]), sampleRate: 24000 };
        },
      },
    });

    const michael = await fs.readFile(path.join(tempRoot, "audition_am_michael.wav"));
    const george = await fs.readFile(path.join(tempRoot, "audition_bm_george.wav"));
    assert.equal(manifest.provider, "kokoro-onnx");
    assert.equal(manifest.voices.length, 2);
    assert.equal(manifest.voices.every((row) => row.ok), true);
    assert.equal(michael.toString("ascii", 0, 4), "RIFF");
    assert.equal(george.toString("ascii", 0, 4), "RIFF");
    assert.equal(Boolean(await fs.stat(path.join(tempRoot, "apex-kokoro-onnx-tts-v4-manifest.json"))), true);
    assertNoSecrets(manifest);
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});
