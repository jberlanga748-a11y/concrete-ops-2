import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

export const APEX_VOICEBOX_ENV = Object.freeze({
  ENABLED: "APEX_VOICEBOX_ENABLED",
  BASE_URL: "APEX_VOICEBOX_BASE_URL",
  PROFILE_NAME: "APEX_VOICEBOX_PROFILE_NAME",
  REFERENCE_WAV_PATH: "APEX_VOICEBOX_REFERENCE_WAV_PATH",
  TIMEOUT_MS: "APEX_VOICEBOX_TIMEOUT_MS",
  IMPORT_ENABLED: "APEX_VOICEBOX_IMPORT_ENABLED",
});

export const APEX_VOICEBOX_STATUS = Object.freeze({
  DISABLED: "disabled",
  BLOCKED: "blocked",
  UNAVAILABLE: "unavailable",
  PROFILE_READY: "profile-ready",
  FALLBACK_READY: "fallback-ready",
  PROFILE_NEEDED: "profile-needed",
  API_LIMITED: "api-limited",
});

const DEFAULT_BASE_URL = "http://127.0.0.1:17493";
const DEFAULT_PROFILE_NAME = "Apex";
const DEFAULT_TIMEOUT_MS = 3500;
const MAX_TIMEOUT_MS = 30_000;
const MAX_TEXT_LENGTH = 900;
const VOICEBOX_HIGH_MEMORY_BYTES = 4 * 1024 * 1024 * 1024;
const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);
const PRIVATE_CONFIG = Symbol("apexVoiceboxPrivateConfig");

const HEALTH_ENDPOINTS = Object.freeze([
  "/api/health",
  "/health",
  "/api/ready",
  "/ready",
]);

const PROFILE_ENDPOINTS = Object.freeze([
  "/api/profiles",
  "/profiles",
  "/api/voices",
  "/voices",
  "/v1/profiles",
  "/v1/voices",
]);

const SPEECH_ENDPOINTS = Object.freeze([
  "/speak",
  "/generate",
  "/api/tts",
  "/api/speech",
  "/api/synthesize",
  "/synthesize",
  "/v1/audio/speech",
]);

function text(value = "", limit = 240) {
  return String(value ?? "").replace(/\s+\n/g, "\n").replace(/\s+/g, " ").trim().slice(0, limit);
}

function lower(value = "", limit = 240) {
  return text(value, limit).toLowerCase();
}

function bool(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  return /^(1|true|yes|on|enabled)$/i.test(String(value || "").trim());
}

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseTimeoutMs(value = DEFAULT_TIMEOUT_MS) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_TIMEOUT_MS;
  return Math.max(750, Math.min(MAX_TIMEOUT_MS, Math.round(parsed)));
}

function defaultReferenceWavPath() {
  return path.join(os.homedir(), "Documents", "apex voice.wav");
}

function safeUrl(value = DEFAULT_BASE_URL) {
  try {
    return new URL(String(value || DEFAULT_BASE_URL));
  } catch {
    return new URL(DEFAULT_BASE_URL);
  }
}

function isLocalVoiceboxUrl(url) {
  return url.protocol === "http:" && LOCAL_HOSTS.has(lower(url.hostname, 120));
}

function publicBaseLabel(url) {
  return isLocalVoiceboxUrl(url) ? `${url.hostname}:${url.port || "80"}` : "blocked-non-local";
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

function normalizeVoiceboxProcessRows(rows = []) {
  return (Array.isArray(rows) ? rows : [rows]).map((row) => {
    if (!row) return null;
    return {
      id: text(row.id || row.Id || row.pid || row.PID || "", 80),
      name: text(row.name || row.Name || row.ProcessName || row.processName || "", 120),
      workingSetBytes: number(row.workingSetBytes || row.WorkingSet64 || row.WorkingSet || row.memoryBytes, 0),
      cpuPercent: number(row.cpuPercent || row.CpuPercent || row.cpu || row.CPU, 0),
    };
  }).filter((row) => /voicebox/i.test(`${row.name} ${row.id}`));
}

export function buildApexVoiceboxResourceGuard(input = {}) {
  const processRows = normalizeVoiceboxProcessRows(input.processRows || []);
  const totalWorkingSetBytes = processRows.reduce((sum, row) => sum + row.workingSetBytes, 0);
  const highMemoryThresholdBytes = number(input.highMemoryThresholdBytes, VOICEBOX_HIGH_MEMORY_BYTES);
  const highMemory = totalWorkingSetBytes >= highMemoryThresholdBytes;
  const hot = Boolean(input.hot) || processRows.some((row) => row.cpuPercent >= 50);
  const running = processRows.length > 0;
  const premiumEligible = running && !highMemory && !hot;

  return Object.freeze({
    provider: "voicebox",
    status: running ? (premiumEligible ? "optional-premium-ready" : "optional-heavy-guarded") : "not-running",
    running,
    processCount: processRows.length,
    totalWorkingSetBytes,
    totalWorkingSetMb: Math.round(totalWorkingSetBytes / 1024 / 1024),
    highMemory,
    hot,
    defaultEligible: false,
    premiumEligible,
    optionalPremium: true,
    notRequiredForNormalVoice: true,
    action: running
      ? premiumEligible
        ? "Voicebox is running and may be used only for explicit premium/test voice mode."
        : "Voicebox is running hot or heavy, so Apex will avoid it as the daily/default voice."
      : "Voicebox is not running; Apex normal speech does not require it.",
    processes: Object.freeze(processRows.map((row) => Object.freeze({
      id: row.id,
      name: row.name,
      workingSetMb: Math.round(row.workingSetBytes / 1024 / 1024),
      cpuPercent: row.cpuPercent,
    }))),
    secretsExposed: false,
    tokenExposed: false,
  });
}

function runPowerShellJson(script, { timeoutMs = 1200 } = {}) {
  return new Promise((resolve) => {
    const child = spawn("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script], {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill("SIGKILL");
      resolve(null);
    }, timeoutMs);
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk || "").slice(0, 20_000);
    });
    child.on("error", () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve(null);
    });
    child.on("close", () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      try {
        resolve(stdout.trim() ? JSON.parse(stdout) : null);
      } catch {
        resolve(null);
      }
    });
  });
}

export async function getApexVoiceboxResourceGuard(input = {}) {
  if (input.resourceGuard) return input.resourceGuard;
  if (input.processRows) return buildApexVoiceboxResourceGuard(input);
  if ((input.platform || process.platform) !== "win32") return buildApexVoiceboxResourceGuard({ processRows: [] });
  const rows = await runPowerShellJson(
    "Get-Process | Where-Object { $_.ProcessName -match 'voicebox' } | Select-Object Id,ProcessName,WorkingSet64,CPU | ConvertTo-Json -Compress",
    { timeoutMs: input.timeoutMs || 1200 },
  );
  return buildApexVoiceboxResourceGuard({ processRows: rows ? (Array.isArray(rows) ? rows : [rows]) : [] });
}

async function readWavMetadata(filePath = "") {
  const exists = await fileExists(filePath);
  if (!exists) {
    return Object.freeze({
      exists: false,
      fileName: path.basename(filePath || "apex voice.wav"),
      sizeBytes: 0,
      durationSeconds: 0,
      sampleMayBeShort: true,
    });
  }

  const stat = await fs.stat(filePath);
  let durationSeconds = 0;
  try {
    const buffer = await fs.readFile(filePath);
    if (buffer.length >= 44 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WAVE") {
      const byteRate = buffer.readUInt32LE(28);
      let offset = 12;
      let dataSize = 0;
      while (offset + 8 <= buffer.length) {
        const chunkId = buffer.toString("ascii", offset, offset + 4);
        const chunkSize = buffer.readUInt32LE(offset + 4);
        if (chunkId === "data") {
          dataSize = chunkSize;
          break;
        }
        offset += 8 + chunkSize + (chunkSize % 2);
      }
      if (byteRate > 0 && dataSize > 0) {
        durationSeconds = Math.round((dataSize / byteRate) * 10) / 10;
      }
    }
  } catch {
    durationSeconds = 0;
  }

  return Object.freeze({
    exists: true,
    fileName: path.basename(filePath),
    sizeBytes: stat.size,
    durationSeconds,
    sampleMayBeShort: durationSeconds > 0 ? durationSeconds < 10 : stat.size < 500_000,
  });
}

export function readApexVoiceboxProviderConfig(input = {}) {
  const env = input.env || process.env || {};
  const enabled = bool(input.enabled ?? env[APEX_VOICEBOX_ENV.ENABLED], true);
  const baseUrl = safeUrl(input.baseUrl || env[APEX_VOICEBOX_ENV.BASE_URL] || DEFAULT_BASE_URL);
  const profileName = text(input.profileName || env[APEX_VOICEBOX_ENV.PROFILE_NAME] || DEFAULT_PROFILE_NAME, 120) || DEFAULT_PROFILE_NAME;
  const referenceWavPath = text(input.referenceWavPath || env[APEX_VOICEBOX_ENV.REFERENCE_WAV_PATH] || defaultReferenceWavPath(), 800);
  const timeoutMs = parseTimeoutMs(input.timeoutMs || env[APEX_VOICEBOX_ENV.TIMEOUT_MS]);
  const importEnabled = bool(input.importEnabled ?? env[APEX_VOICEBOX_ENV.IMPORT_ENABLED], false);

  return Object.freeze({
    provider: "voicebox",
    enabled,
    baseUrlIsLocal: isLocalVoiceboxUrl(baseUrl),
    baseUrlLabel: publicBaseLabel(baseUrl),
    profileName,
    referenceVoiceFileName: path.basename(referenceWavPath),
    referenceVoiceConfigured: Boolean(referenceWavPath),
    importEnabled,
    timeoutMs,
    envNamesOnly: Object.freeze({ ...APEX_VOICEBOX_ENV }),
    secretsExposed: false,
    tokenExposed: false,
    cloudAudioAllowed: false,
    openAiAudioUsed: false,
    [PRIVATE_CONFIG]: Object.freeze({
      baseUrl,
      referenceWavPath,
    }),
  });
}

function endpointUrl(baseUrl, endpoint) {
  const next = new URL(baseUrl.toString());
  next.pathname = endpoint;
  next.search = "";
  return next.toString();
}

async function fetchJson(fetchImpl, url, options = {}) {
  const response = await fetchImpl(url, options);
  if (!response?.ok) return { ok: false, status: response?.status || 0, json: null, contentType: "" };
  const contentType = typeof response.headers?.get === "function" ? response.headers.get("content-type") || "" : "";
  if (!/json/i.test(contentType) && typeof response.json !== "function") {
    return { ok: true, status: response.status || 200, json: null, contentType };
  }
  try {
    return { ok: true, status: response.status || 200, json: await response.json(), contentType };
  } catch {
    return { ok: true, status: response.status || 200, json: null, contentType };
  }
}

async function fetchWithTimeout(fetchImpl, url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function probeHealth(config, fetchImpl) {
  const privateConfig = config[PRIVATE_CONFIG] || {};
  for (const endpoint of HEALTH_ENDPOINTS) {
    try {
      const result = await fetchJson(
        (url, options) => fetchWithTimeout(fetchImpl, url, options, config.timeoutMs),
        endpointUrl(privateConfig.baseUrl, endpoint),
        { method: "GET" },
      );
      if (result.ok) return { ok: true, endpoint, status: result.status };
    } catch {
      // Keep probing local endpoints.
    }
  }
  return { ok: false, endpoint: "", status: 0 };
}

function profileName(profile = {}) {
  return text(profile.name || profile.profileName || profile.displayName || profile.label || profile.id || profile.voice_id || profile.voiceId || "", 160);
}

function profileId(profile = {}) {
  return text(profile.id || profile.profileId || profile.voice_id || profile.voiceId || profile.uuid || profile.name || "", 180);
}

function normalizeProfile(profile = {}) {
  const name = profileName(profile);
  const id = profileId(profile);
  if (!name && !id) return null;
  return Object.freeze({
    id,
    name: name || id,
    source: text(profile.source || profile.provider || "voicebox", 80),
  });
}

function unwrapProfiles(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.profiles)) return payload.profiles;
  if (Array.isArray(payload?.voices)) return payload.voices;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

export function selectApexVoiceboxProfiles(profiles = [], profileNameToMatch = DEFAULT_PROFILE_NAME) {
  const normalized = profiles.map(normalizeProfile).filter(Boolean);
  const desired = lower(profileNameToMatch || DEFAULT_PROFILE_NAME, 120);
  const apexProfile = normalized.find((profile) => lower(profile.name, 160) === desired)
    || normalized.find((profile) => lower(profile.name, 160).includes(desired));
  const fallbackProfile = normalized.find((profile) => {
    const haystack = `${profile.id} ${profile.name} ${profile.source}`.toLowerCase();
    return !apexProfile && /(kokoro|qwen|voicebox|default|local)/i.test(haystack);
  }) || null;
  return Object.freeze({
    profiles: Object.freeze(normalized),
    apexProfile: apexProfile || null,
    fallbackProfile,
  });
}

async function listVoiceboxProfiles(config, fetchImpl) {
  const privateConfig = config[PRIVATE_CONFIG] || {};
  for (const endpoint of PROFILE_ENDPOINTS) {
    try {
      const result = await fetchJson(
        (url, options) => fetchWithTimeout(fetchImpl, url, options, config.timeoutMs),
        endpointUrl(privateConfig.baseUrl, endpoint),
        { method: "GET" },
      );
      if (!result.ok) continue;
      const profiles = unwrapProfiles(result.json).map(normalizeProfile).filter(Boolean);
      return { ok: true, endpoint, profiles };
    } catch {
      // Keep probing local endpoints.
    }
  }
  return { ok: false, endpoint: "", profiles: [] };
}

function manualImportInstruction(config, referenceVoice) {
  const fileLabel = referenceVoice.exists
    ? `${referenceVoice.fileName}${referenceVoice.sampleMayBeShort ? " (short sample)" : ""}`
    : referenceVoice.fileName;
  return `Open Voicebox locally, create or import a profile named ${config.profileName}, and use ${fileLabel} as the reference voice.`;
}

export async function getApexVoiceboxProviderStatus(input = {}) {
  const config = input.config?.provider === "voicebox" ? input.config : readApexVoiceboxProviderConfig(input);
  const fetchImpl = input.fetchImpl || globalThis.fetch;
  const privateConfig = config[PRIVATE_CONFIG] || {};
  const referenceVoice = await readWavMetadata(privateConfig.referenceWavPath || "");
  const resourceGuard = await getApexVoiceboxResourceGuard(input);
  const installed = await fileExists("C:\\Program Files\\Voicebox\\voicebox.exe")
    || await fileExists("C:\\Program Files\\Voicebox\\voicebox-server.exe");

  if (!config.enabled) {
    return Object.freeze({
      provider: "voicebox",
      status: APEX_VOICEBOX_STATUS.DISABLED,
      available: false,
      installed,
      apiAvailable: false,
      baseUrlIsLocal: config.baseUrlIsLocal,
      baseUrlLabel: config.baseUrlLabel,
      profileName: config.profileName,
      profiles: Object.freeze([]),
      apexProfile: null,
      fallbackProfile: null,
      canSpeakWithApexProfile: false,
      canSpeakWithFallbackProfile: false,
      resourceGuard,
      referenceVoice,
      action: "Voicebox is disabled by server config.",
      manualImportInstruction: manualImportInstruction(config, referenceVoice),
      envNamesOnly: config.envNamesOnly,
      secretsExposed: false,
      tokenExposed: false,
      cloudAudioAllowed: false,
      openAiAudioUsed: false,
    });
  }

  if (!config.baseUrlIsLocal || !privateConfig.baseUrl) {
    return Object.freeze({
      provider: "voicebox",
      status: APEX_VOICEBOX_STATUS.BLOCKED,
      available: false,
      installed,
      apiAvailable: false,
      baseUrlIsLocal: false,
      baseUrlLabel: "blocked-non-local",
      profileName: config.profileName,
      profiles: Object.freeze([]),
      apexProfile: null,
      fallbackProfile: null,
      canSpeakWithApexProfile: false,
      canSpeakWithFallbackProfile: false,
      resourceGuard,
      referenceVoice,
      action: "Voicebox base URL must stay on localhost for this private voice slice.",
      manualImportInstruction: manualImportInstruction(config, referenceVoice),
      envNamesOnly: config.envNamesOnly,
      secretsExposed: false,
      tokenExposed: false,
      cloudAudioAllowed: false,
      openAiAudioUsed: false,
    });
  }

  if (typeof fetchImpl !== "function") {
    return Object.freeze({
      provider: "voicebox",
      status: APEX_VOICEBOX_STATUS.UNAVAILABLE,
      available: false,
      installed,
      apiAvailable: false,
      baseUrlIsLocal: true,
      baseUrlLabel: config.baseUrlLabel,
      profileName: config.profileName,
      profiles: Object.freeze([]),
      apexProfile: null,
      fallbackProfile: null,
      canSpeakWithApexProfile: false,
      canSpeakWithFallbackProfile: false,
      resourceGuard,
      referenceVoice,
      action: "Voicebox status cannot be checked because fetch is unavailable.",
      manualImportInstruction: manualImportInstruction(config, referenceVoice),
      envNamesOnly: config.envNamesOnly,
      secretsExposed: false,
      tokenExposed: false,
      cloudAudioAllowed: false,
      openAiAudioUsed: false,
    });
  }

  const profilesResult = await listVoiceboxProfiles(config, fetchImpl);
  const health = profilesResult.ok ? { ok: true, endpoint: profilesResult.endpoint, status: 200 } : await probeHealth(config, fetchImpl);
  const selected = selectApexVoiceboxProfiles(profilesResult.profiles, config.profileName);
  const apiAvailable = Boolean(health.ok || profilesResult.ok);
  const status = selected.apexProfile
    ? APEX_VOICEBOX_STATUS.PROFILE_READY
    : selected.fallbackProfile
      ? APEX_VOICEBOX_STATUS.FALLBACK_READY
      : apiAvailable && profilesResult.ok
        ? APEX_VOICEBOX_STATUS.PROFILE_NEEDED
        : apiAvailable
          ? APEX_VOICEBOX_STATUS.API_LIMITED
          : APEX_VOICEBOX_STATUS.UNAVAILABLE;
  const action = status === APEX_VOICEBOX_STATUS.PROFILE_READY
    ? "Voicebox Apex profile is ready."
    : status === APEX_VOICEBOX_STATUS.FALLBACK_READY
      ? "Voicebox is running with a fallback local profile. Import or rename the saved profile to Apex for the chosen voice."
      : status === APEX_VOICEBOX_STATUS.PROFILE_NEEDED
        ? "Voicebox is running, but the Apex profile is not listed."
        : status === APEX_VOICEBOX_STATUS.API_LIMITED
          ? "Voicebox answered locally, but profile listing was not available."
          : installed
            ? "Voicebox is installed but its local API is not running."
            : "Voicebox is not installed or not reachable on the local API.";

  return Object.freeze({
    provider: "voicebox",
    status,
    available: status === APEX_VOICEBOX_STATUS.PROFILE_READY || status === APEX_VOICEBOX_STATUS.FALLBACK_READY,
    installed,
    apiAvailable,
    profileEndpointAvailable: profilesResult.ok,
    profileEndpoint: profilesResult.endpoint,
    healthEndpoint: health.endpoint,
    baseUrlIsLocal: true,
    baseUrlLabel: config.baseUrlLabel,
    profileName: config.profileName,
    profiles: selected.profiles,
    apexProfile: selected.apexProfile,
    fallbackProfile: selected.fallbackProfile,
    canSpeakWithApexProfile: Boolean(selected.apexProfile),
    canSpeakWithFallbackProfile: Boolean(!selected.apexProfile && selected.fallbackProfile),
    resourceGuard,
    defaultEligible: false,
    optionalPremium: true,
    premiumEligible: Boolean(resourceGuard.premiumEligible),
    notRequiredForNormalVoice: true,
    referenceVoice,
    action,
    manualImportInstruction: manualImportInstruction(config, referenceVoice),
    envNamesOnly: config.envNamesOnly,
    secretsExposed: false,
    tokenExposed: false,
    cloudAudioAllowed: false,
    openAiAudioUsed: false,
  });
}

function stripDataUrl(value = "") {
  const raw = String(value || "");
  const match = raw.match(/^data:([^;,]+);base64,(.+)$/i);
  if (!match) return { contentType: "", base64: raw.replace(/\s+/g, "") };
  return { contentType: match[1], base64: match[2].replace(/\s+/g, "") };
}

async function responseToDirectAudio(response) {
  const contentType = typeof response.headers?.get === "function" ? response.headers.get("content-type") || "" : "";
  if (/audio|octet-stream/i.test(contentType) && typeof response.arrayBuffer === "function") {
    const audio = Buffer.from(await response.arrayBuffer());
    return { ok: Boolean(audio.length), audioBase64: audio.toString("base64"), contentType: contentType || "audio/wav", generationId: "" };
  }
  if (typeof response.json === "function") {
    const payload = await response.json().catch(() => null);
    const audioValue = payload?.audioBase64 || payload?.audio || payload?.base64 || payload?.data || "";
    if (audioValue) {
      const parsed = stripDataUrl(audioValue);
      return {
        ok: Boolean(parsed.base64),
        audioBase64: parsed.base64,
        contentType: parsed.contentType || payload?.contentType || payload?.mimeType || "audio/wav",
        generationId: text(payload?.id || payload?.generation_id || "", 120),
      };
    }
    return {
      ok: false,
      audioBase64: "",
      contentType: "",
      generationId: text(payload?.id || payload?.generation_id || payload?.generationId || "", 120),
      status: text(payload?.status || "", 80),
      error: text(payload?.error || "", 180),
    };
  }
  return { ok: false, audioBase64: "", contentType: "", generationId: "" };
}

async function fetchGenerationAudio({ fetchImpl, baseUrl, generationId, timeoutMs }) {
  if (!generationId) return { ok: false, audioBase64: "", contentType: "" };
  const encodedId = encodeURIComponent(generationId);
  const statusEndpoint = `/generate/${encodedId}/status`;
  const audioEndpoints = [`/audio/${encodedId}`, `/history/${encodedId}/export-audio`];

  for (let attempt = 0; attempt < 8; attempt += 1) {
    for (const endpoint of audioEndpoints) {
      try {
        const audioResponse = await fetchWithTimeout(fetchImpl, endpointUrl(baseUrl, endpoint), { method: "GET" }, timeoutMs);
        if (!audioResponse?.ok) continue;
        const audio = await responseToDirectAudio(audioResponse);
        if (audio.ok) return { ...audio, generationId };
      } catch {
        // Keep polling briefly.
      }
    }
    try {
      const statusResponse = await fetchWithTimeout(fetchImpl, endpointUrl(baseUrl, statusEndpoint), { method: "GET" }, timeoutMs);
      if (statusResponse?.ok) {
        const status = await responseToDirectAudio(statusResponse);
        if (status.error) return { ok: false, audioBase64: "", contentType: "", generationId, error: status.error };
      }
    } catch {
      // Continue to the short sleep below.
    }
    await new Promise((resolve) => setTimeout(resolve, 350));
  }

  return { ok: false, audioBase64: "", contentType: "", generationId };
}

async function responseToAudio(response, fetchOptions = {}) {
  const direct = await responseToDirectAudio(response);
  if (direct.ok) return direct;
  if (direct.generationId && fetchOptions.fetchImpl && fetchOptions.baseUrl) {
    return fetchGenerationAudio({
      fetchImpl: fetchOptions.fetchImpl,
      baseUrl: fetchOptions.baseUrl,
      generationId: direct.generationId,
      timeoutMs: fetchOptions.timeoutMs || DEFAULT_TIMEOUT_MS,
    });
  }
  return direct;
}

function voiceboxSpeechPayloads(textToSpeak, profile, endpoint = "") {
  const voice = profile?.id || profile?.name || DEFAULT_PROFILE_NAME;
  if (endpoint === "/speak") {
    return [
      { text: textToSpeak, profile: voice, language: "en", personality: false },
      { text: textToSpeak, profile: profile?.name || voice, language: "en", personality: false },
    ];
  }
  if (endpoint === "/generate") {
    return [
      { profile_id: profile?.id || voice, text: textToSpeak, language: "en", personality: false, normalize: true },
    ];
  }
  return [
    { text: textToSpeak, profileId: profile?.id || "", profileName: profile?.name || "", voice },
    { input: textToSpeak, voice, response_format: "wav" },
  ];
}

export async function speakWithApexVoicebox(input = {}) {
  const speechText = text(input.text || "", MAX_TEXT_LENGTH);
  if (!speechText) {
    return { ok: false, provider: "voicebox", error: "Voicebox speech requires text.", openAiAudioUsed: false };
  }
  const config = input.config?.provider === "voicebox" ? input.config : readApexVoiceboxProviderConfig(input);
  const fetchImpl = input.fetchImpl || globalThis.fetch;
  const status = input.status?.provider === "voicebox"
    ? input.status
    : await getApexVoiceboxProviderStatus({ ...input, config, fetchImpl });

  const profile = status.apexProfile || status.fallbackProfile || null;
  if (!status.available || !profile || typeof fetchImpl !== "function") {
    return {
      ok: false,
      provider: "voicebox",
      status,
      error: status.action || "Voicebox is not ready.",
      fallbackRecommended: true,
      openAiAudioUsed: false,
      cloudAudioAllowed: false,
    };
  }

  const privateConfig = config[PRIVATE_CONFIG] || {};
  for (const endpoint of SPEECH_ENDPOINTS) {
    for (const payload of voiceboxSpeechPayloads(speechText, profile, endpoint)) {
      try {
        const response = await fetchWithTimeout(fetchImpl, endpointUrl(privateConfig.baseUrl, endpoint), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }, config.timeoutMs);
        if (!response?.ok) continue;
        const audio = await responseToAudio(response, {
          fetchImpl,
          baseUrl: privateConfig.baseUrl,
          timeoutMs: config.timeoutMs,
        });
        if (audio.ok) {
          const usedApexProfile = Boolean(status.apexProfile);
          return {
            ok: true,
            provider: "voicebox",
            engine: usedApexProfile ? "voicebox-apex" : "voicebox-fallback",
            profileName: profile.name,
            profileId: profile.id,
            endpoint,
            generationId: audio.generationId || "",
            audioBase64: audio.audioBase64,
            contentType: audio.contentType,
            audioStored: false,
            openAiAudioUsed: false,
            cloudAudioAllowed: false,
            aiDisclosure: usedApexProfile
              ? "Apex spoke through the saved Apex Voicebox profile. OpenAI audio was not used."
              : "Apex spoke through a local Voicebox fallback profile. OpenAI audio was not used.",
          };
        }
      } catch {
        // Try the next local Voicebox endpoint shape.
      }
    }
  }

  return {
    ok: false,
    provider: "voicebox",
    status,
    error: "Voicebox was reachable, but no local speech endpoint returned playable audio.",
    fallbackRecommended: true,
    openAiAudioUsed: false,
    cloudAudioAllowed: false,
  };
}
