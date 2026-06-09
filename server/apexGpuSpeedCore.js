import { spawn } from "node:child_process";

export const APEX_GPU_SPEED_STATUS = Object.freeze({
  AVAILABLE: "available",
  UNAVAILABLE: "unavailable",
  BLOCKED: "blocked",
  ERROR: "error",
});

const DEFAULT_NVIDIA_SMI_COMMAND = "nvidia-smi";
const DEFAULT_TIMEOUT_MS = 1600;
const SHORT_LIMIT = 180;

function safeText(value = "", limit = SHORT_LIMIT) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, limit);
}

function safeNumber(value = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function bytesToMb(value = 0) {
  const bytes = safeNumber(value);
  return bytes ? Math.round(bytes / 1024 / 1024) : 0;
}

function mbToBytes(value = 0) {
  const mb = safeNumber(value);
  return mb ? Math.round(mb * 1024 * 1024) : 0;
}

function parseTimeoutMs(value = DEFAULT_TIMEOUT_MS) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_TIMEOUT_MS;
  return Math.max(250, Math.min(10_000, Math.round(parsed)));
}

function runCommand(command, args = [], { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
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
      stdout += String(chunk || "").slice(0, 8000);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk || "").slice(0, 2000);
    });
    child.on("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve({ ok: false, code: -1, stdout, stderr: safeText(error?.message || "command failed", 500) });
    });
    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve({ ok: code === 0, code, stdout, stderr });
    });
  });
}

export function parseNvidiaSmiGpuCsv(output = "") {
  const firstLine = String(output || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean)[0] || "";
  if (!firstLine) {
    return Object.freeze({
      status: APEX_GPU_SPEED_STATUS.UNAVAILABLE,
      available: false,
      reason: "nvidia-smi-empty",
      processor: "unknown",
      gpuName: "",
      vramTotalMb: 0,
      vramUsedMb: 0,
      gpuUtilizationPercent: 0,
    });
  }

  const [gpuName = "", totalMb = 0, usedMb = 0, utilization = 0] = firstLine.split(",").map((part) => part.trim());
  const parsed = Object.freeze({
    status: APEX_GPU_SPEED_STATUS.AVAILABLE,
    available: true,
    reason: "nvidia-gpu-detected",
    processor: "gpu",
    gpuName: safeText(gpuName, 120),
    vramTotalMb: Math.round(safeNumber(totalMb)),
    vramUsedMb: Math.round(safeNumber(usedMb)),
    gpuUtilizationPercent: Math.round(safeNumber(utilization)),
  });

  return parsed.gpuName ? parsed : Object.freeze({
    ...parsed,
    status: APEX_GPU_SPEED_STATUS.UNAVAILABLE,
    available: false,
    reason: "nvidia-smi-gpu-name-missing",
    processor: "unknown",
  });
}

export async function getApexGpuStatus(input = {}) {
  if (input.disabled) {
    return Object.freeze({
      provider: "nvidia-smi",
      status: APEX_GPU_SPEED_STATUS.BLOCKED,
      available: false,
      reason: "gpu-status-disabled",
      processor: "unknown",
      gpuName: "",
      vramTotalMb: 0,
      vramUsedMb: 0,
      gpuUtilizationPercent: 0,
      commandName: "nvidia-smi",
      commandValuesExposed: false,
      secretsExposed: false,
    });
  }

  if (typeof input.nvidiaSmiOutput === "string") {
    return Object.freeze({
      provider: "nvidia-smi",
      ...parseNvidiaSmiGpuCsv(input.nvidiaSmiOutput),
      commandName: "nvidia-smi",
      commandValuesExposed: false,
      secretsExposed: false,
    });
  }

  const commandRunner = input.commandRunner || runCommand;
  try {
    const result = await commandRunner(DEFAULT_NVIDIA_SMI_COMMAND, [
      "--query-gpu=name,memory.total,memory.used,utilization.gpu",
      "--format=csv,noheader,nounits",
    ], {
      timeoutMs: parseTimeoutMs(input.timeoutMs),
    });
    if (!result?.ok) {
      return Object.freeze({
        provider: "nvidia-smi",
        status: APEX_GPU_SPEED_STATUS.UNAVAILABLE,
        available: false,
        reason: safeText(result?.stderr || "nvidia-smi-unavailable", 120),
        processor: "unknown",
        gpuName: "",
        vramTotalMb: 0,
        vramUsedMb: 0,
        gpuUtilizationPercent: 0,
        commandName: "nvidia-smi",
        commandValuesExposed: false,
        secretsExposed: false,
      });
    }
    return Object.freeze({
      provider: "nvidia-smi",
      ...parseNvidiaSmiGpuCsv(result.stdout || ""),
      commandName: "nvidia-smi",
      commandValuesExposed: false,
      secretsExposed: false,
    });
  } catch {
    return Object.freeze({
      provider: "nvidia-smi",
      status: APEX_GPU_SPEED_STATUS.ERROR,
      available: false,
      reason: "gpu-status-error",
      processor: "unknown",
      gpuName: "",
      vramTotalMb: 0,
      vramUsedMb: 0,
      gpuUtilizationPercent: 0,
      commandName: "nvidia-smi",
      commandValuesExposed: false,
      secretsExposed: false,
    });
  }
}

export function parseOllamaLoadedModels(payload = {}) {
  return (Array.isArray(payload?.models) ? payload.models : [])
    .map((model) => {
      const name = safeText(model?.name || model?.model || "", 160);
      if (!name) return null;
      return Object.freeze({
        name,
        model: name,
        sizeBytes: safeNumber(model?.size),
        sizeVramBytes: safeNumber(model?.size_vram ?? model?.sizeVram),
        sizeMb: bytesToMb(model?.size),
        sizeVramMb: bytesToMb(model?.size_vram ?? model?.sizeVram),
        expiresAt: safeText(model?.expires_at || "", 80),
      });
    })
    .filter(Boolean);
}

export function findOllamaLoadedModel(payload = {}, modelName = "") {
  const target = safeText(modelName, 160).toLowerCase();
  if (!target) return null;
  return parseOllamaLoadedModels(payload).find((model) => model.name.toLowerCase() === target) || null;
}

export function inferProcessorFromLoadedModel(model = null) {
  if (!model) return "unknown";
  const vramBytes = safeNumber(model.sizeVramBytes);
  const totalBytes = safeNumber(model.sizeBytes);
  if (vramBytes <= 0) return "cpu";
  if (totalBytes > 0 && vramBytes < totalBytes * 0.85) return "mixed";
  return "gpu";
}

export function buildOllamaModelProcessorReceipt({
  provider = "ollama",
  model = "",
  beforePayload = {},
  afterPayload = {},
  timingMs = 0,
  status = "completed",
  reason = "",
  generatedAt = new Date().toISOString(),
} = {}) {
  const beforeModel = findOllamaLoadedModel(beforePayload, model);
  const afterModel = findOllamaLoadedModel(afterPayload, model) || beforeModel;
  const processor = inferProcessorFromLoadedModel(afterModel);
  const vramUsedMb = afterModel?.sizeVramMb || 0;
  const modelSizeMb = afterModel?.sizeMb || 0;
  const responseTimingMs = safeNumber(timingMs) > 0 ? Math.max(1, Math.round(safeNumber(timingMs))) : 0;
  return Object.freeze({
    receiptType: "local-model-processor",
    provider: safeText(provider, 40),
    model: safeText(model || afterModel?.name || beforeModel?.name || "", 160),
    status: safeText(status || "completed", 80),
    processor,
    vramUsedMb,
    modelSizeMb,
    modelAlreadyLoaded: Boolean(beforeModel),
    modelLoadedAfterTurn: Boolean(afterModel),
    responseTimingMs,
    reason: safeText(reason || (processor === "unknown" ? "ollama-runtime-snapshot-unavailable" : "ollama-runtime-snapshot-read"), 160),
    generatedAt: safeText(generatedAt, 80),
    rawPromptStored: false,
    rawResponseStored: false,
    secretsExposed: false,
    tokenExposed: false,
  });
}

export function buildApexSpeedCoreStatus({
  gpu = {},
  latestModelProcessor = null,
  voice = null,
} = {}) {
  const modelProcessor = latestModelProcessor || {};
  const sttEngine = voice?.selectedSttEngine || null;
  const sttProcessor = safeText(sttEngine?.processor || voice?.sttProcessor || "", 40) || "unknown";
  const gpuAvailable = Boolean(gpu.available);
  const modelProcessorLabel = safeText(modelProcessor.processor || "unknown", 40);
  const status = gpuAvailable
    ? modelProcessorLabel === "gpu" || modelProcessorLabel === "mixed"
      ? "gpu-active"
      : "gpu-detected"
    : "gpu-unavailable";
  return Object.freeze({
    provider: "apex-gpu-speed-core",
    status,
    gpuAvailable,
    gpuName: safeText(gpu.gpuName || "", 120),
    vramTotalMb: Math.round(safeNumber(gpu.vramTotalMb)),
    vramUsedMb: Math.round(safeNumber(gpu.vramUsedMb)),
    modelProcessor: modelProcessorLabel,
    modelVramUsedMb: Math.round(safeNumber(modelProcessor.vramUsedMb)),
    modelAlreadyLoaded: Boolean(modelProcessor.modelAlreadyLoaded),
    latestModel: safeText(modelProcessor.model || "", 160),
    sttProcessor,
    sttEngine: safeText(sttEngine?.name || sttEngine?.id || "", 120),
    openAiUsed: false,
    cloudAudioUsed: false,
    secretsExposed: false,
    summary: gpuAvailable
      ? `GPU detected: ${safeText(gpu.gpuName || "NVIDIA GPU", 120)}. Model processor is ${modelProcessorLabel}. STT processor is ${sttProcessor}.`
      : "GPU status is unavailable. Apex stays local-first and reports processor status honestly.",
  });
}

export { bytesToMb, mbToBytes };
