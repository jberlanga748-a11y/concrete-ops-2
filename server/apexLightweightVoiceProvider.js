import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { performance } from "node:perf_hooks";

export const APEX_LIGHTWEIGHT_VOICE_ENV = Object.freeze({
  PROVIDER: "APEX_LIGHTWEIGHT_VOICE_PROVIDER",
  VOICE_NAME: "APEX_LIGHTWEIGHT_VOICE_NAME",
  COMMAND: "APEX_LIGHTWEIGHT_VOICE_COMMAND",
  COMMAND_ARGS_JSON: "APEX_LIGHTWEIGHT_VOICE_COMMAND_ARGS_JSON",
  MODEL_ID: "APEX_LIGHTWEIGHT_VOICE_MODEL_ID",
  DTYPE: "APEX_LIGHTWEIGHT_VOICE_DTYPE",
  PROCESSOR: "APEX_LIGHTWEIGHT_VOICE_PROCESSOR",
  CONFIG_PATH: "APEX_LIGHTWEIGHT_VOICE_CONFIG_PATH",
  REFERENCE_WAV_PATH: "APEX_LIGHTWEIGHT_VOICE_REFERENCE_WAV_PATH",
  TIMEOUT_MS: "APEX_LIGHTWEIGHT_VOICE_TIMEOUT_MS",
});

export const APEX_LIGHTWEIGHT_VOICE_STATUS = Object.freeze({
  READY: "ready",
  CONFIG_NEEDED: "config-needed",
  MISSING: "missing",
  BLOCKED: "blocked",
});

const DEFAULT_PROVIDER = "kokoro";
const DEFAULT_TIMEOUT_MS = 12_000;
const MAX_TIMEOUT_MS = 60_000;
const MAX_TEXT_LENGTH = 900;
const PRIVATE_CONFIG = Symbol("apexLightweightVoicePrivateConfig");
export const APEX_KOKORO_ONNX_MODEL_ID = "onnx-community/Kokoro-82M-v1.0-ONNX";
export const APEX_KOKORO_ONNX_DEFAULT_DTYPE = "q8";
export const APEX_KOKORO_ONNX_DEFAULT_PROCESSOR = "cpu/onnx";
export const APEX_KOKORO_ONNX_SAMPLE_RATE = 24_000;
export const APEX_KOKORO_ONNX_OUTPUT_FORMAT = "wav";
export const APEX_KOKORO_ONNX_DEFAULT_VOICE_ID = "am_michael";
export const APEX_KOKORO_ONNX_MALE_VOICE_IDS = Object.freeze([
  "am_adam",
  "am_michael",
  "am_echo",
  "am_eric",
  "am_fenrir",
  "am_liam",
  "am_onyx",
  "bm_daniel",
  "bm_george",
  "bm_lewis",
]);
const KOKORO_ONNX_PROVIDERS = new Set(["kokoro", "kokoro-onnx", "kokoro-js", "apex-lightweight-kokoro", "apex-lightweight"]);
const KOKORO_CLI_PROVIDERS = new Set(["offlinetts", "offline-tts", "offline_tts", "kokoro-cli", "kokoro-tts", "kokoro_tts"]);
const KOKORO_COMPATIBLE_PROVIDERS = new Set([...KOKORO_ONNX_PROVIDERS, ...KOKORO_CLI_PROVIDERS]);
const COMMON_LIGHTWEIGHT_TTS_COMMANDS = Object.freeze(["offlinetts", "offline-tts", "kokoro", "kokoro-tts", "kokoro_tts"]);
const kokoroModelCache = new Map();

function text(value = "", limit = 240) {
  return String(value ?? "").replace(/\s+\n/g, "\n").replace(/\s+/g, " ").trim().slice(0, limit);
}

function lower(value = "", limit = 240) {
  return text(value, limit).toLowerCase();
}

function normalizeProvider(value = DEFAULT_PROVIDER) {
  return lower(value || DEFAULT_PROVIDER, 80).replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || DEFAULT_PROVIDER;
}

function isKokoroCompatibleProvider(value = "") {
  return KOKORO_COMPATIBLE_PROVIDERS.has(normalizeProvider(value || DEFAULT_PROVIDER));
}

function isKokoroOnnxProvider(value = "") {
  return KOKORO_ONNX_PROVIDERS.has(normalizeProvider(value || DEFAULT_PROVIDER));
}

function isKokoroCliProvider(value = "") {
  return KOKORO_CLI_PROVIDERS.has(normalizeProvider(value || DEFAULT_PROVIDER));
}

function safeKokoroVoiceId(value = APEX_KOKORO_ONNX_DEFAULT_VOICE_ID) {
  const normalized = lower(value || APEX_KOKORO_ONNX_DEFAULT_VOICE_ID, 80).replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "");
  return APEX_KOKORO_ONNX_MALE_VOICE_IDS.includes(normalized) ? normalized : APEX_KOKORO_ONNX_DEFAULT_VOICE_ID;
}

function safeKokoroDtype(value = APEX_KOKORO_ONNX_DEFAULT_DTYPE) {
  const normalized = lower(value || APEX_KOKORO_ONNX_DEFAULT_DTYPE, 20);
  return ["fp32", "fp16", "q8", "q4", "q4f16"].includes(normalized) ? normalized : APEX_KOKORO_ONNX_DEFAULT_DTYPE;
}

function safeKokoroProcessor(value = APEX_KOKORO_ONNX_DEFAULT_PROCESSOR) {
  const normalized = lower(value || APEX_KOKORO_ONNX_DEFAULT_PROCESSOR, 40);
  if (["cpu", "cpu/onnx", "onnx", "wasm"].includes(normalized)) return APEX_KOKORO_ONNX_DEFAULT_PROCESSOR;
  return APEX_KOKORO_ONNX_DEFAULT_PROCESSOR;
}

function safeKokoroModelId(value = APEX_KOKORO_ONNX_MODEL_ID) {
  const normalized = text(value || APEX_KOKORO_ONNX_MODEL_ID, 180);
  return normalized || APEX_KOKORO_ONNX_MODEL_ID;
}

function parseTimeoutMs(value = DEFAULT_TIMEOUT_MS) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_TIMEOUT_MS;
  return Math.max(1000, Math.min(MAX_TIMEOUT_MS, Math.round(parsed)));
}

function defaultReferenceWavPath() {
  return path.join(os.homedir(), "Downloads", "offlinetts-output.wav");
}

function defaultVoiceConfigPath(input = {}) {
  const env = input.env || process.env || {};
  const explicitPath = text(input.configPath || env[APEX_LIGHTWEIGHT_VOICE_ENV.CONFIG_PATH] || "", 800);
  if (explicitPath) return explicitPath;
  const dataDir = text(input.dataDir || env.DATA_DIR || path.join(process.cwd(), "data"), 800);
  return path.join(dataDir, "apex-local-voice-config.json");
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

function cleanCommand(value = "") {
  return text(value, 500).replace(/^["']|["']$/g, "");
}

function commandDisplayName(command = "") {
  const cleaned = cleanCommand(command);
  if (!cleaned) return "";
  return path.basename(cleaned);
}

async function commandExists(command = "", { platform = process.platform, timeoutMs = 1500 } = {}) {
  const cleaned = cleanCommand(command);
  if (!cleaned) return false;
  if (cleaned.includes("/") || cleaned.includes("\\") || path.isAbsolute(cleaned)) {
    return fileExists(cleaned);
  }
  const probe = platform === "win32"
    ? await runCommandWithInput("where.exe", [cleaned], { timeoutMs })
    : await runCommandWithInput("sh", ["-lc", `command -v ${JSON.stringify(cleaned)}`], { timeoutMs });
  return Boolean(probe.ok && String(probe.stdout || "").trim());
}

function parseCommandArgsJson(value = "") {
  if (Array.isArray(value)) return value.map((entry) => text(entry, 400)).filter(Boolean);
  const raw = String(value || "").trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((entry) => text(entry, 400)).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function formatCommandArgs(args = [], { voiceName = "", outputPath = "" } = {}) {
  if (!args.length) {
    return ["--voice", voiceName, "--output_file", outputPath];
  }
  return args.map((arg) => String(arg)
    .replaceAll("{voice}", voiceName)
    .replaceAll("{output}", outputPath)
    .replaceAll("{outputPath}", outputPath));
}

async function isKokoroOnnxPackageAvailable(input = {}) {
  if (input.kokoroModule?.KokoroTTS || input.kokoroTtsFactory || input.kokoroTtsInstance) return true;
  try {
    const module = await import("kokoro-js");
    return Boolean(module?.KokoroTTS?.from_pretrained);
  } catch {
    return false;
  }
}

async function getKokoroTtsInstance(config, input = {}) {
  if (input.kokoroTtsInstance) return input.kokoroTtsInstance;
  const privateConfig = config[PRIVATE_CONFIG] || {};
  const modelId = privateConfig.modelId || APEX_KOKORO_ONNX_MODEL_ID;
  const dtype = privateConfig.dtype || APEX_KOKORO_ONNX_DEFAULT_DTYPE;
  const device = "cpu";
  const cacheKey = `${modelId}::${dtype}::${device}`;
  if (!input.disableKokoroCache && kokoroModelCache.has(cacheKey)) return kokoroModelCache.get(cacheKey);
  if (input.kokoroTtsFactory) {
    const instance = await input.kokoroTtsFactory({ modelId, dtype, device });
    if (!input.disableKokoroCache) kokoroModelCache.set(cacheKey, instance);
    return instance;
  }
  const module = input.kokoroModule || await import("kokoro-js");
  const instance = await module.KokoroTTS.from_pretrained(modelId, {
    dtype,
    device,
    progress_callback: input.progressCallback || null,
  });
  if (!input.disableKokoroCache) kokoroModelCache.set(cacheKey, instance);
  return instance;
}

function encodeMonoFloat32ToWav(samples, sampleRate = APEX_KOKORO_ONNX_SAMPLE_RATE) {
  const floatSamples = samples instanceof Float32Array ? samples : new Float32Array(samples || []);
  const dataSize = floatSamples.length * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write("RIFF", 0, "ascii");
  buffer.writeUInt32LE(buffer.length - 8, 4);
  buffer.write("WAVE", 8, "ascii");
  buffer.write("fmt ", 12, "ascii");
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36, "ascii");
  buffer.writeUInt32LE(dataSize, 40);
  for (let index = 0; index < floatSamples.length; index += 1) {
    const clamped = Math.max(-1, Math.min(1, Number(floatSamples[index]) || 0));
    buffer.writeInt16LE(Math.round(clamped < 0 ? clamped * 32768 : clamped * 32767), 44 + index * 2);
  }
  return buffer;
}

async function saveKokoroAudioToWav(audio, outputPath) {
  if (audio?.save && typeof audio.save === "function") {
    await audio.save(outputPath);
    return fs.readFile(outputPath);
  }
  const samples = audio?.data || audio?.samples || audio?.waveform || audio;
  const buffer = encodeMonoFloat32ToWav(samples, Number(audio?.sample_rate || audio?.sampleRate || APEX_KOKORO_ONNX_SAMPLE_RATE));
  await fs.writeFile(outputPath, buffer);
  return buffer;
}

async function readWavMetadata(filePath = "") {
  const exists = await fileExists(filePath);
  const fileName = path.basename(filePath || "offlinetts-output.wav");
  if (!exists) {
    return Object.freeze({
      exists: false,
      fileName,
      sizeBytes: 0,
      durationSeconds: 0,
      sampleRate: 0,
      channels: 0,
      bitsPerSample: 0,
      audioFormat: 0,
      matchesApexLightweightAnchor: false,
    });
  }

  const stat = await fs.stat(filePath);
  const metadata = {
    exists: true,
    fileName,
    sizeBytes: stat.size,
    durationSeconds: 0,
    sampleRate: 0,
    channels: 0,
    bitsPerSample: 0,
    audioFormat: 0,
    matchesApexLightweightAnchor: false,
  };

  try {
    const buffer = await fs.readFile(filePath);
    if (buffer.length >= 44 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WAVE") {
      let offset = 12;
      let byteRate = 0;
      let dataSize = 0;
      while (offset + 8 <= buffer.length) {
        const chunkId = buffer.toString("ascii", offset, offset + 4);
        const chunkSize = buffer.readUInt32LE(offset + 4);
        if (chunkId === "fmt " && offset + 24 <= buffer.length) {
          metadata.audioFormat = buffer.readUInt16LE(offset + 8);
          metadata.channels = buffer.readUInt16LE(offset + 10);
          metadata.sampleRate = buffer.readUInt32LE(offset + 12);
          byteRate = buffer.readUInt32LE(offset + 16);
          metadata.bitsPerSample = buffer.readUInt16LE(offset + 22);
        }
        if (chunkId === "data") {
          dataSize = chunkSize;
          break;
        }
        offset += 8 + chunkSize + (chunkSize % 2);
      }
      if (byteRate > 0 && dataSize > 0) {
        metadata.durationSeconds = Math.round((dataSize / byteRate) * 100) / 100;
      }
    }
  } catch {
    // Keep safe metadata only.
  }

  metadata.matchesApexLightweightAnchor = metadata.audioFormat === 1
    && metadata.channels === 1
    && metadata.sampleRate === 24_000
    && metadata.bitsPerSample === 16
    && metadata.durationSeconds >= 5.5
    && metadata.durationSeconds <= 6.5
    && metadata.sizeBytes >= 250_000
    && metadata.sizeBytes <= 330_000;

  return Object.freeze(metadata);
}

function sanitizePersistedVoiceConfig(value = {}) {
  const raw = value || {};
  return Object.freeze({
    provider: normalizeProvider(raw.provider || "kokoro-onnx"),
    modelId: safeKokoroModelId(raw.modelId || raw.model_id || APEX_KOKORO_ONNX_MODEL_ID),
    voiceId: safeKokoroVoiceId(raw.voiceId || raw.voice_id || raw.voiceName || raw.voice_name || APEX_KOKORO_ONNX_DEFAULT_VOICE_ID),
    dtype: safeKokoroDtype(raw.dtype || APEX_KOKORO_ONNX_DEFAULT_DTYPE),
    processor: safeKokoroProcessor(raw.processor || APEX_KOKORO_ONNX_DEFAULT_PROCESSOR),
    locked: raw.locked !== false,
    updatedAt: text(raw.updatedAt || raw.updated_at || "", 80),
  });
}

export async function readApexLightweightVoiceLockConfig(input = {}) {
  const configPath = defaultVoiceConfigPath(input);
  try {
    const raw = await fs.readFile(configPath, "utf8");
    const parsed = JSON.parse(raw);
    const config = sanitizePersistedVoiceConfig(parsed);
    return Object.freeze({
      ...config,
      provider: "kokoro-onnx",
      source: "local-config",
      configFileName: path.basename(configPath),
      secretsExposed: false,
      tokenExposed: false,
    });
  } catch {
    return Object.freeze({
      provider: "kokoro-onnx",
      source: "default",
      modelId: APEX_KOKORO_ONNX_MODEL_ID,
      voiceId: APEX_KOKORO_ONNX_DEFAULT_VOICE_ID,
      dtype: APEX_KOKORO_ONNX_DEFAULT_DTYPE,
      processor: APEX_KOKORO_ONNX_DEFAULT_PROCESSOR,
      locked: true,
      updatedAt: "",
      configFileName: path.basename(configPath),
      secretsExposed: false,
      tokenExposed: false,
    });
  }
}

export async function writeApexLightweightVoiceLockConfig(input = {}) {
  const configPath = defaultVoiceConfigPath(input);
  const current = input.currentConfig || await readApexLightweightVoiceLockConfig(input);
  const next = sanitizePersistedVoiceConfig({
    provider: "kokoro-onnx",
    modelId: input.modelId || current.modelId || APEX_KOKORO_ONNX_MODEL_ID,
    voiceId: input.voiceId || current.voiceId || APEX_KOKORO_ONNX_DEFAULT_VOICE_ID,
    dtype: input.dtype || current.dtype || APEX_KOKORO_ONNX_DEFAULT_DTYPE,
    processor: input.processor || current.processor || APEX_KOKORO_ONNX_DEFAULT_PROCESSOR,
    locked: true,
    updatedAt: new Date().toISOString(),
  });
  await fs.mkdir(path.dirname(configPath), { recursive: true });
  await fs.writeFile(configPath, JSON.stringify(next, null, 2), "utf8");
  return Object.freeze({
    ...next,
    source: "local-config",
    configFileName: path.basename(configPath),
    persisted: true,
    secretsExposed: false,
    tokenExposed: false,
  });
}

export async function updateApexLightweightVoiceSelection(input = {}) {
  const action = lower(input.action || "lock-current", 80);
  const current = input.currentConfig || await readApexLightweightVoiceLockConfig(input);
  let voiceId = safeKokoroVoiceId(input.voiceId || current.voiceId);
  if (action === "next-male" || action === "try-next-male" || action === "next") {
    const currentIndex = APEX_KOKORO_ONNX_MALE_VOICE_IDS.indexOf(safeKokoroVoiceId(current.voiceId));
    voiceId = APEX_KOKORO_ONNX_MALE_VOICE_IDS[(currentIndex + 1) % APEX_KOKORO_ONNX_MALE_VOICE_IDS.length];
  }
  const written = await writeApexLightweightVoiceLockConfig({
    ...input,
    currentConfig: current,
    voiceId,
    modelId: input.modelId || current.modelId || APEX_KOKORO_ONNX_MODEL_ID,
    dtype: input.dtype || current.dtype || APEX_KOKORO_ONNX_DEFAULT_DTYPE,
    processor: input.processor || current.processor || APEX_KOKORO_ONNX_DEFAULT_PROCESSOR,
  });
  return Object.freeze({
    action,
    voiceSelection: written,
    voiceId: written.voiceId,
    provider: "kokoro-onnx",
    modelId: written.modelId,
    dtype: written.dtype,
    processor: written.processor,
    locked: true,
    persisted: true,
    availableVoiceIds: APEX_KOKORO_ONNX_MALE_VOICE_IDS,
    secretsExposed: false,
    tokenExposed: false,
  });
}

function installSteps(config) {
  return Object.freeze([
    "Use Kokoro ONNX through kokoro-js as the normal lightweight Apex voice path.",
    `Optional: set ${APEX_LIGHTWEIGHT_VOICE_ENV.PROVIDER}=kokoro-onnx.`,
    `Optional: set ${APEX_LIGHTWEIGHT_VOICE_ENV.VOICE_NAME}=am_michael or another approved Kokoro male voice id.`,
    `Optional: set ${APEX_LIGHTWEIGHT_VOICE_ENV.MODEL_ID}=${APEX_KOKORO_ONNX_MODEL_ID}.`,
    `Optional: set ${APEX_LIGHTWEIGHT_VOICE_ENV.DTYPE}=q8 and ${APEX_LIGHTWEIGHT_VOICE_ENV.PROCESSOR}=cpu/onnx.`,
    `For old CLI providers only, set ${APEX_LIGHTWEIGHT_VOICE_ENV.COMMAND} and optional ${APEX_LIGHTWEIGHT_VOICE_ENV.COMMAND_ARGS_JSON}.`,
    `Keep ${config.referenceVoiceFileName} local. Do not upload, move, or commit it.`,
  ]);
}

export async function discoverApexLightweightVoiceProviderCandidates(input = {}) {
  const config = input.config?.provider === "apex-lightweight-voice"
    ? input.config
    : readApexLightweightVoiceProviderConfig(input);
  const privateConfig = config[PRIVATE_CONFIG] || {};
  const commands = [
    privateConfig.command,
    ...COMMON_LIGHTWEIGHT_TTS_COMMANDS,
  ].map(cleanCommand).filter(Boolean);
  const uniqueCommands = [...new Set(commands)];
  const commandRows = [];
  for (const command of uniqueCommands) {
    const available = await commandExists(command, {
      platform: input.platform || process.platform,
      timeoutMs: input.discoveryTimeoutMs || 1500,
    });
    commandRows.push(Object.freeze({
      commandName: commandDisplayName(command),
      configured: command === cleanCommand(privateConfig.command),
      available,
    }));
  }
  const availableCommandNames = commandRows.filter((row) => row.available).map((row) => row.commandName);
  return Object.freeze({
    provider: "apex-lightweight-voice-discovery",
    searchedCommandNames: Object.freeze(commandRows.map((row) => row.commandName)),
    commandCandidates: Object.freeze(commandRows),
    availableCommandNames: Object.freeze(availableCommandNames),
    configuredCommandName: commandDisplayName(privateConfig.command),
    configuredCommandAvailable: Boolean(commandRows.find((row) => row.configured)?.available),
    voiceNameDiscovery: config.voiceNameConfigured ? "configured" : "not-discoverable-from-wav",
    referenceVoiceFileName: config.referenceVoiceFileName,
    secretsExposed: false,
    tokenExposed: false,
  });
}

export function readApexLightweightVoiceProviderConfig(input = {}) {
  const env = input.env || process.env || {};
  const persisted = input.persistedVoiceConfig || input.lockedVoiceConfig || {};
  const providerName = normalizeProvider(input.providerName || input.provider || env[APEX_LIGHTWEIGHT_VOICE_ENV.PROVIDER] || persisted.provider || DEFAULT_PROVIDER);
  const voiceName = isKokoroOnnxProvider(providerName)
    ? safeKokoroVoiceId(input.voiceName || input.voiceId || env[APEX_LIGHTWEIGHT_VOICE_ENV.VOICE_NAME] || persisted.voiceId || APEX_KOKORO_ONNX_DEFAULT_VOICE_ID)
    : text(input.voiceName || input.voiceId || env[APEX_LIGHTWEIGHT_VOICE_ENV.VOICE_NAME] || persisted.voiceId || "", 160);
  const command = text(input.command || env[APEX_LIGHTWEIGHT_VOICE_ENV.COMMAND] || "", 500);
  const commandArgs = parseCommandArgsJson(input.commandArgs || env[APEX_LIGHTWEIGHT_VOICE_ENV.COMMAND_ARGS_JSON]);
  const modelId = safeKokoroModelId(input.modelId || env[APEX_LIGHTWEIGHT_VOICE_ENV.MODEL_ID] || persisted.modelId || APEX_KOKORO_ONNX_MODEL_ID);
  const dtype = safeKokoroDtype(input.dtype || env[APEX_LIGHTWEIGHT_VOICE_ENV.DTYPE] || persisted.dtype || APEX_KOKORO_ONNX_DEFAULT_DTYPE);
  const processor = safeKokoroProcessor(input.processor || env[APEX_LIGHTWEIGHT_VOICE_ENV.PROCESSOR] || persisted.processor || APEX_KOKORO_ONNX_DEFAULT_PROCESSOR);
  const configPath = defaultVoiceConfigPath(input);
  const referenceWavPath = text(input.referenceWavPath || env[APEX_LIGHTWEIGHT_VOICE_ENV.REFERENCE_WAV_PATH] || defaultReferenceWavPath(), 800);
  const timeoutMs = parseTimeoutMs(input.timeoutMs || env[APEX_LIGHTWEIGHT_VOICE_ENV.TIMEOUT_MS]);

  return Object.freeze({
    provider: "apex-lightweight-voice",
    preferredProvider: providerName,
    voiceIdentity: "apex-lightweight",
    voiceIdentityLocked: true,
    voiceRotationAllowed: false,
    voiceNameConfigured: Boolean(voiceName),
    modelId,
    dtype,
    processor,
    sampleRate: APEX_KOKORO_ONNX_SAMPLE_RATE,
    outputFormat: APEX_KOKORO_ONNX_OUTPUT_FORMAT,
    persistedConfigSource: persisted.source || "default",
    configFileName: path.basename(configPath),
    commandConfigured: Boolean(command),
    referenceVoiceFileName: path.basename(referenceWavPath),
    timeoutMs,
    envNamesOnly: Object.freeze({ ...APEX_LIGHTWEIGHT_VOICE_ENV }),
    secretsExposed: false,
    tokenExposed: false,
    cloudAudioAllowed: false,
    openAiAudioUsed: false,
    [PRIVATE_CONFIG]: Object.freeze({
      voiceName,
      modelId,
      dtype,
      processor,
      configPath,
      command,
      commandArgs,
      referenceWavPath,
    }),
  });
}

export async function getApexLightweightVoiceProviderStatus(input = {}) {
  const persistedVoiceConfig = input.loadPersistedConfig === false
    ? input.persistedVoiceConfig || input.lockedVoiceConfig || {}
    : input.persistedVoiceConfig || input.lockedVoiceConfig || await readApexLightweightVoiceLockConfig(input);
  const config = input.config?.provider === "apex-lightweight-voice"
    ? input.config
    : readApexLightweightVoiceProviderConfig({ ...input, persistedVoiceConfig });
  const privateConfig = config[PRIVATE_CONFIG] || {};
  const referenceVoice = await readWavMetadata(privateConfig.referenceWavPath || "");
  const providerIsKokoroCompatible = isKokoroCompatibleProvider(config.preferredProvider);
  const providerIsOnnx = isKokoroOnnxProvider(config.preferredProvider);
  const providerIsCli = isKokoroCliProvider(config.preferredProvider);
  const kokoroOnnxPackageAvailable = input.kokoroOnnxPackageAvailable === undefined
    ? await isKokoroOnnxPackageAvailable(input)
    : Boolean(input.kokoroOnnxPackageAvailable);
  const commandAvailable = !providerIsCli
    ? false
    : input.commandAvailable === undefined
    ? await commandExists(privateConfig.command, { platform: input.platform || process.platform, timeoutMs: input.discoveryTimeoutMs || 1500 })
    : Boolean(input.commandAvailable);
  const discovery = input.discovery?.provider === "apex-lightweight-voice-discovery"
    ? input.discovery
    : await discoverApexLightweightVoiceProviderCandidates({ ...input, config });
  const voiceId = safeKokoroVoiceId(privateConfig.voiceName);

  const missing = [
    !providerIsKokoroCompatible ? "Apex lightweight voice provider must be Kokoro/OfflineTTS-compatible for this locked daily voice slice." : "",
    providerIsOnnx && !kokoroOnnxPackageAvailable ? "kokoro-js is not installed or could not be imported for Kokoro ONNX local TTS." : "",
    providerIsOnnx && !APEX_KOKORO_ONNX_MALE_VOICE_IDS.includes(voiceId) ? "Apex Kokoro ONNX voice id is not in the approved male audition list." : "",
    providerIsCli && !config.voiceNameConfigured ? "Apex lightweight voice name/profile is not configured for the selected CLI provider." : "",
    providerIsCli && !config.commandConfigured ? "Apex lightweight Kokoro/OfflineTTS command is not configured for the selected CLI provider." : "",
    providerIsCli && config.commandConfigured && !commandAvailable ? "Configured Kokoro/OfflineTTS command is not available." : "",
  ].filter(Boolean);
  const canSpeakWithLockedVoice = providerIsOnnx
    ? providerIsKokoroCompatible && kokoroOnnxPackageAvailable && APEX_KOKORO_ONNX_MALE_VOICE_IDS.includes(voiceId)
    : providerIsKokoroCompatible && config.voiceNameConfigured && config.commandConfigured && commandAvailable;
  const status = canSpeakWithLockedVoice
    ? APEX_LIGHTWEIGHT_VOICE_STATUS.READY
    : providerIsKokoroCompatible
      ? APEX_LIGHTWEIGHT_VOICE_STATUS.CONFIG_NEEDED
      : APEX_LIGHTWEIGHT_VOICE_STATUS.BLOCKED;

  return Object.freeze({
    provider: "apex-lightweight-voice",
    status,
    available: canSpeakWithLockedVoice,
    canSpeakWithLockedVoice,
    preferredProvider: config.preferredProvider,
    providerCompatibility: providerIsOnnx ? "kokoro-onnx" : providerIsKokoroCompatible ? "kokoro-compatible-cli" : "blocked-provider",
    modelId: privateConfig.modelId || APEX_KOKORO_ONNX_MODEL_ID,
    voiceId,
    dtype: privateConfig.dtype || APEX_KOKORO_ONNX_DEFAULT_DTYPE,
    processor: privateConfig.processor || APEX_KOKORO_ONNX_DEFAULT_PROCESSOR,
    sampleRate: APEX_KOKORO_ONNX_SAMPLE_RATE,
    outputFormat: APEX_KOKORO_ONNX_OUTPUT_FORMAT,
    kokoroOnnxPackageAvailable,
    availableVoiceIds: APEX_KOKORO_ONNX_MALE_VOICE_IDS,
    configFileName: config.configFileName,
    persistedConfigSource: config.persistedConfigSource,
    voiceIdentity: config.voiceIdentity,
    voiceIdentityLocked: true,
    voiceRotationAllowed: false,
    voiceName: providerIsOnnx ? voiceId : config.voiceNameConfigured ? privateConfig.voiceName : "",
    voiceNameConfigured: providerIsOnnx ? true : config.voiceNameConfigured,
    voiceNameDiscovery: providerIsOnnx ? config.persistedConfigSource || "default-kokoro-onnx" : config.voiceNameConfigured ? "configured" : "not-discoverable-from-wav",
    referenceVoice,
    commandConfigured: config.commandConfigured,
    commandAvailable,
    commandName: commandDisplayName(privateConfig.command),
    discovery,
    missing: Object.freeze(missing),
    action: canSpeakWithLockedVoice
      ? `Apex Kokoro ONNX voice is ready and locked as the normal voice (${voiceId}).`
      : "Apex Kokoro ONNX voice is the locked target, but local package/config validation is still needed before it can speak.",
    installSteps: installSteps(config),
    envNamesOnly: config.envNamesOnly,
    secretsExposed: false,
    tokenExposed: false,
    cloudAudioAllowed: false,
    openAiAudioUsed: false,
  });
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
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "apex-lightweight-voice-"));
  try {
    return await fn(tempRoot);
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
}

export async function speakWithApexLightweightVoice(input = {}) {
  const speechText = text(input.text || "", MAX_TEXT_LENGTH);
  if (!speechText) {
    return { ok: false, provider: "apex-lightweight-voice", error: "Apex lightweight voice requires text.", openAiAudioUsed: false };
  }
  const persistedVoiceConfig = input.loadPersistedConfig === false
    ? input.persistedVoiceConfig || input.lockedVoiceConfig || {}
    : input.persistedVoiceConfig || input.lockedVoiceConfig || await readApexLightweightVoiceLockConfig(input);
  const config = input.config?.provider === "apex-lightweight-voice"
    ? input.config
    : readApexLightweightVoiceProviderConfig({ ...input, persistedVoiceConfig });
  const privateConfig = config[PRIVATE_CONFIG] || {};
  const status = input.status?.provider === "apex-lightweight-voice"
    ? input.status
    : await getApexLightweightVoiceProviderStatus({ ...input, config });

  if (!status.canSpeakWithLockedVoice) {
    return {
      ok: false,
      provider: "apex-lightweight-voice",
      status,
      error: status.missing.join(" ") || "Apex lightweight Kokoro/OfflineTTS-compatible voice is not configured.",
      fallbackRecommended: true,
      openAiAudioUsed: false,
      cloudAudioAllowed: false,
    };
  }

  const generationStarted = performance.now();
  if (isKokoroOnnxProvider(config.preferredProvider)) {
    const voiceId = safeKokoroVoiceId(input.voiceId || privateConfig.voiceName || status.voiceId);
    const outputPath = text(input.outputPath || "", 900);
    const generateToFile = async (targetPath) => {
      const tts = await getKokoroTtsInstance(config, input);
      const audio = await tts.generate(speechText, {
        voice: voiceId,
        speed: Number(input.speed || 1) || 1,
      });
      return saveKokoroAudioToWav(audio, targetPath);
    };
    try {
      if (outputPath) {
        await fs.mkdir(path.dirname(outputPath), { recursive: true });
        const audio = await generateToFile(outputPath);
        return {
          ok: true,
          provider: "apex-lightweight-voice",
          engine: "kokoro-onnx",
          ttsProvider: "kokoro-onnx",
          modelId: privateConfig.modelId || APEX_KOKORO_ONNX_MODEL_ID,
          voiceId,
          profileName: voiceId,
          dtype: privateConfig.dtype || APEX_KOKORO_ONNX_DEFAULT_DTYPE,
          processor: privateConfig.processor || APEX_KOKORO_ONNX_DEFAULT_PROCESSOR,
          sampleRate: APEX_KOKORO_ONNX_SAMPLE_RATE,
          outputFormat: APEX_KOKORO_ONNX_OUTPUT_FORMAT,
          voiceIdentity: "apex-lightweight",
          voiceIdentityLocked: true,
          locked: true,
          fallbackUsed: false,
          fallbackReason: "",
          generationTimingMs: Math.max(0, Math.round(performance.now() - generationStarted)),
          audioBase64: audio.toString("base64"),
          outputFileName: path.basename(outputPath),
          contentType: "audio/wav",
          audioStored: false,
          openAiAudioUsed: false,
          cloudAudioAllowed: false,
          aiDisclosure: `Apex spoke through local Kokoro ONNX (${voiceId}) on CPU. OpenAI audio and Voicebox were not used.`,
        };
      }
      return withTempDir(async (tempRoot) => {
        const tempOutputPath = path.join(tempRoot, "apex-kokoro-onnx.wav");
        const audio = await generateToFile(tempOutputPath);
        return {
          ok: true,
          provider: "apex-lightweight-voice",
          engine: "kokoro-onnx",
          ttsProvider: "kokoro-onnx",
          modelId: privateConfig.modelId || APEX_KOKORO_ONNX_MODEL_ID,
          voiceId,
          profileName: voiceId,
          dtype: privateConfig.dtype || APEX_KOKORO_ONNX_DEFAULT_DTYPE,
          processor: privateConfig.processor || APEX_KOKORO_ONNX_DEFAULT_PROCESSOR,
          sampleRate: APEX_KOKORO_ONNX_SAMPLE_RATE,
          outputFormat: APEX_KOKORO_ONNX_OUTPUT_FORMAT,
          voiceIdentity: "apex-lightweight",
          voiceIdentityLocked: true,
          locked: true,
          fallbackUsed: false,
          fallbackReason: "",
          generationTimingMs: Math.max(0, Math.round(performance.now() - generationStarted)),
          audioBase64: audio.toString("base64"),
          contentType: "audio/wav",
          audioStored: false,
          openAiAudioUsed: false,
          cloudAudioAllowed: false,
          aiDisclosure: `Apex spoke through local Kokoro ONNX (${voiceId}) on CPU. OpenAI audio and Voicebox were not used.`,
        };
      });
    } catch {
      return {
        ok: false,
        provider: "apex-lightweight-voice",
        status,
        error: "Apex Kokoro ONNX local TTS failed.",
        generationTimingMs: Math.max(0, Math.round(performance.now() - generationStarted)),
        fallbackRecommended: true,
        openAiAudioUsed: false,
        cloudAudioAllowed: false,
      };
    }
  }

  return withTempDir(async (tempRoot) => {
    const outputPath = path.join(tempRoot, "apex-lightweight.wav");
    const args = formatCommandArgs(privateConfig.commandArgs, {
      voiceName: privateConfig.voiceName,
      outputPath,
    });
    const result = await runCommandWithInput(privateConfig.command, args, {
      input: speechText,
      timeoutMs: config.timeoutMs,
    });
    if (!result.ok) {
      return {
        ok: false,
        provider: "apex-lightweight-voice",
        status,
        error: "Apex lightweight Kokoro command failed.",
        generationTimingMs: Math.max(0, Math.round(performance.now() - generationStarted)),
        fallbackRecommended: true,
        openAiAudioUsed: false,
        cloudAudioAllowed: false,
      };
    }
    const audio = await fs.readFile(outputPath);
    return {
      ok: true,
      provider: "apex-lightweight-voice",
      engine: "apex-lightweight-kokoro",
      ttsProvider: status.preferredProvider || "kokoro",
      modelId: privateConfig.modelId || "",
      voiceId: privateConfig.voiceName,
      profileName: privateConfig.voiceName,
      dtype: privateConfig.dtype || "",
      processor: privateConfig.processor || "",
      sampleRate: APEX_KOKORO_ONNX_SAMPLE_RATE,
      outputFormat: APEX_KOKORO_ONNX_OUTPUT_FORMAT,
      voiceIdentity: "apex-lightweight",
      voiceIdentityLocked: true,
      locked: true,
      fallbackUsed: false,
      fallbackReason: "",
      generationTimingMs: Math.max(0, Math.round(performance.now() - generationStarted)),
      audioBase64: audio.toString("base64"),
      contentType: "audio/wav",
      audioStored: false,
      openAiAudioUsed: false,
      cloudAudioAllowed: false,
      aiDisclosure: "Apex spoke through the locked lightweight Kokoro/OfflineTTS-compatible voice. OpenAI audio and Voicebox were not used.",
    };
  });
}

function timestampSlug(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}

export async function generateApexKokoroVoiceAuditions(input = {}) {
  const outputDir = text(input.outputDir || path.join(process.cwd(), "outputs", `apex-kokoro-onnx-tts-v4-${timestampSlug()}`), 900);
  const auditionText = text(input.text || "Apex local voice test. John, this is the Apex daily voice running through Kokoro ONNX on CPU.", MAX_TEXT_LENGTH);
  const voiceIds = (Array.isArray(input.voiceIds) && input.voiceIds.length ? input.voiceIds : APEX_KOKORO_ONNX_MALE_VOICE_IDS)
    .map(safeKokoroVoiceId);
  const uniqueVoiceIds = [...new Set(voiceIds)];
  await fs.mkdir(outputDir, { recursive: true });
  const rows = [];
  for (const voiceId of uniqueVoiceIds) {
    const outputPath = path.join(outputDir, `audition_${voiceId}.wav`);
    const payload = await speakWithApexLightweightVoice({
      ...input,
      text: auditionText,
      voiceId,
      outputPath,
      provider: "kokoro-onnx",
      loadPersistedConfig: false,
      persistedVoiceConfig: {
        provider: "kokoro-onnx",
        modelId: input.modelId || APEX_KOKORO_ONNX_MODEL_ID,
        voiceId,
        dtype: input.dtype || APEX_KOKORO_ONNX_DEFAULT_DTYPE,
        processor: input.processor || APEX_KOKORO_ONNX_DEFAULT_PROCESSOR,
      },
    });
    rows.push(Object.freeze({
      voiceId,
      fileName: path.basename(outputPath),
      ok: Boolean(payload.ok),
      provider: payload.ttsProvider || "kokoro-onnx",
      modelId: payload.modelId || APEX_KOKORO_ONNX_MODEL_ID,
      dtype: payload.dtype || APEX_KOKORO_ONNX_DEFAULT_DTYPE,
      processor: payload.processor || APEX_KOKORO_ONNX_DEFAULT_PROCESSOR,
      sampleRate: payload.sampleRate || APEX_KOKORO_ONNX_SAMPLE_RATE,
      outputFormat: payload.outputFormat || APEX_KOKORO_ONNX_OUTPUT_FORMAT,
      generationTimingMs: Number(payload.generationTimingMs || 0) || 0,
      fallbackUsed: Boolean(payload.fallbackUsed || payload.providerFallback),
      fallbackReason: text(payload.fallbackReason || payload.error || "", 220),
    }));
  }
  const manifest = Object.freeze({
    provider: "kokoro-onnx",
    modelId: input.modelId || APEX_KOKORO_ONNX_MODEL_ID,
    dtype: input.dtype || APEX_KOKORO_ONNX_DEFAULT_DTYPE,
    processor: input.processor || APEX_KOKORO_ONNX_DEFAULT_PROCESSOR,
    sampleRate: APEX_KOKORO_ONNX_SAMPLE_RATE,
    outputFormat: APEX_KOKORO_ONNX_OUTPUT_FORMAT,
    outputDir,
    generatedAt: new Date().toISOString(),
    auditionText,
    voices: rows,
    openAiAudioUsed: false,
    cloudAudioAllowed: false,
    voiceboxUsed: false,
    secretsExposed: false,
  });
  await fs.writeFile(path.join(outputDir, "apex-kokoro-onnx-tts-v4-manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
  return manifest;
}
