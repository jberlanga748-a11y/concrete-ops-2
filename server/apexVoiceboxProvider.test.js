import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  APEX_VOICEBOX_ENV,
  buildApexVoiceboxResourceGuard,
  getApexVoiceboxProviderStatus,
  readApexVoiceboxProviderConfig,
  selectApexVoiceboxProfiles,
  speakWithApexVoicebox,
} from "./apexVoiceboxProvider.js";

const SECRET_VALUE = "sk-voicebox-secret-should-not-leak";

function assertNoSecrets(value) {
  const serialized = JSON.stringify(value);
  assert.doesNotMatch(serialized, /sk-voicebox-secret-should-not-leak/i);
  assert.doesNotMatch(serialized, /Authorization/i);
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

function createFetch(routes = {}) {
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

async function createTinyWav() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "apex-voicebox-test-"));
  const wavPath = path.join(tempRoot, "apex voice.wav");
  const buffer = Buffer.alloc(44 + 8000);
  buffer.write("RIFF", 0, "ascii");
  buffer.writeUInt32LE(buffer.length - 8, 4);
  buffer.write("WAVE", 8, "ascii");
  buffer.write("fmt ", 12, "ascii");
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(16000, 24);
  buffer.writeUInt32LE(32000, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36, "ascii");
  buffer.writeUInt32LE(8000, 40);
  await fs.writeFile(wavPath, buffer);
  return { tempRoot, wavPath };
}

test("readApexVoiceboxProviderConfig exposes env names only", () => {
  const config = readApexVoiceboxProviderConfig({
    env: {
      [APEX_VOICEBOX_ENV.BASE_URL]: "http://127.0.0.1:17493",
      [APEX_VOICEBOX_ENV.PROFILE_NAME]: "Apex",
      APEX_FAKE_VOICEBOX_SECRET: SECRET_VALUE,
    },
  });

  assert.equal(config.provider, "voicebox");
  assert.equal(config.baseUrlIsLocal, true);
  assert.equal(config.envNamesOnly.BASE_URL, APEX_VOICEBOX_ENV.BASE_URL);
  assert.equal(config.secretsExposed, false);
  assert.equal(config.openAiAudioUsed, false);
  assertNoSecrets(config);
});

test("Voicebox blocks non-local base URLs by default", async () => {
  const status = await getApexVoiceboxProviderStatus({
    baseUrl: "https://voicebox.example.com",
    fetchImpl: async () => {
      throw new Error("should not call non-local URL");
    },
  });

  assert.equal(status.status, "blocked");
  assert.equal(status.baseUrlIsLocal, false);
  assert.equal(status.available, false);
  assert.equal(status.openAiAudioUsed, false);
});

test("Voicebox missing API returns safe unavailable status", async () => {
  const status = await getApexVoiceboxProviderStatus({
    resourceGuard: buildApexVoiceboxResourceGuard({ processRows: [] }),
    fetchImpl: async () => {
      throw new Error("connection refused");
    },
  });

  assert.equal(status.status, "unavailable");
  assert.equal(status.available, false);
  assert.equal(status.canSpeakWithApexProfile, false);
  assert.equal(status.cloudAudioAllowed, false);
  assert.equal(status.resourceGuard.defaultEligible, false);
  assertNoSecrets(status);
});

test("Voicebox resource guard marks heavy process optional and not default", () => {
  const guard = buildApexVoiceboxResourceGuard({
    processRows: [
      { id: 10, name: "voicebox-server", workingSetBytes: 9 * 1024 * 1024 * 1024, cpuPercent: 4 },
    ],
  });

  assert.equal(guard.running, true);
  assert.equal(guard.highMemory, true);
  assert.equal(guard.defaultEligible, false);
  assert.equal(guard.premiumEligible, false);
  assert.equal(guard.optionalPremium, true);
  assert.equal(guard.notRequiredForNormalVoice, true);
  assert.match(guard.action, /avoid it as the daily\/default voice/i);
  assertNoSecrets(guard);
});

test("Voicebox resource guard allows premium test only when light enough", () => {
  const guard = buildApexVoiceboxResourceGuard({
    processRows: [
      { id: 11, name: "Voicebox", workingSetBytes: 850 * 1024 * 1024, cpuPercent: 4 },
    ],
  });

  assert.equal(guard.running, true);
  assert.equal(guard.highMemory, false);
  assert.equal(guard.hot, false);
  assert.equal(guard.defaultEligible, false);
  assert.equal(guard.premiumEligible, true);
});

test("Voicebox parses profiles and selects Apex profile", async () => {
  const { tempRoot, wavPath } = await createTinyWav();
  try {
    const fetchImpl = createFetch({
      "/api/profiles": createMockResponse({ profiles: [{ id: "voice-1", name: "Apex" }, { id: "voice-2", name: "Kokoro" }] }),
    });
    const status = await getApexVoiceboxProviderStatus({
      referenceWavPath: wavPath,
      resourceGuard: buildApexVoiceboxResourceGuard({ processRows: [{ name: "Voicebox", workingSetBytes: 1000 }] }),
      fetchImpl,
    });

    assert.equal(status.status, "profile-ready");
    assert.equal(status.canSpeakWithApexProfile, true);
    assert.equal(status.apexProfile.name, "Apex");
    assert.equal(status.referenceVoice.exists, true);
    assert.equal(status.referenceVoice.sampleMayBeShort, true);
    assert.equal(fetchImpl.calls.some((call) => call.url.includes("/api/profiles")), true);
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test("Voicebox selects Kokoro/Qwen fallback only when Apex profile is missing", () => {
  const selected = selectApexVoiceboxProfiles([
    { id: "qwen-local", name: "Qwen Voice" },
    { id: "other", name: "Narrator" },
  ], "Apex");

  assert.equal(selected.apexProfile, null);
  assert.equal(selected.fallbackProfile.name, "Qwen Voice");
});

test("Voicebox speech uses local profile endpoint and returns audio", async () => {
  const wavAudio = Buffer.from("RIFFfake-audio", "utf8");
  const fetchImpl = createFetch({
    "/api/profiles": createMockResponse({ profiles: [{ id: "apex-id", name: "Apex" }] }),
    "POST /api/tts": createMockResponse(wavAudio, { contentType: "audio/wav" }),
  });

  const spoken = await speakWithApexVoicebox({
    text: "Apex voice test",
    fetchImpl,
  });

  assert.equal(spoken.ok, true);
  assert.equal(spoken.engine, "voicebox-apex");
  assert.equal(spoken.profileName, "Apex");
  assert.equal(spoken.contentType, "audio/wav");
  assert.equal(spoken.audioBase64, wavAudio.toString("base64"));
  assert.equal(spoken.openAiAudioUsed, false);
  assert.equal(fetchImpl.calls.some((call) => call.method === "POST" && call.url.includes("/api/tts")), true);
  assertNoSecrets(spoken);
});

test("Voicebox speech supports real /speak generation then /audio fetch flow", async () => {
  const wavAudio = Buffer.from("RIFFvoicebox-generated-audio", "utf8");
  const fetchImpl = createFetch({
    "/profiles": createMockResponse([{ id: "apex-id", name: "Apex" }]),
    "POST /speak": createMockResponse({ id: "generation-1", profile_id: "apex-id", text: "redacted", language: "en", created_at: "2026-06-07T00:00:00.000Z" }),
    "GET /audio/generation-1": createMockResponse(wavAudio, { contentType: "audio/wav" }),
  });

  const spoken = await speakWithApexVoicebox({
    text: "Apex voice test",
    fetchImpl,
  });

  assert.equal(spoken.ok, true);
  assert.equal(spoken.engine, "voicebox-apex");
  assert.equal(spoken.endpoint, "/speak");
  assert.equal(spoken.generationId, "generation-1");
  assert.equal(spoken.audioBase64, wavAudio.toString("base64"));
  assert.equal(fetchImpl.calls.some((call) => call.method === "GET" && call.url.includes("/audio/generation-1")), true);
  assert.equal(spoken.openAiAudioUsed, false);
});

test("Voicebox speech fails safely when profile is unavailable", async () => {
  const spoken = await speakWithApexVoicebox({
    text: "Apex voice test",
    fetchImpl: createFetch({}),
  });

  assert.equal(spoken.ok, false);
  assert.equal(spoken.fallbackRecommended, true);
  assert.equal(spoken.openAiAudioUsed, false);
});
