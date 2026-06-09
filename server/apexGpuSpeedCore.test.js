import assert from "node:assert/strict";
import test from "node:test";

import {
  APEX_GPU_SPEED_STATUS,
  buildApexSpeedCoreStatus,
  buildOllamaModelProcessorReceipt,
  bytesToMb,
  getApexGpuStatus,
  inferProcessorFromLoadedModel,
  mbToBytes,
  parseNvidiaSmiGpuCsv,
  parseOllamaLoadedModels,
} from "./apexGpuSpeedCore.js";

test("NVIDIA SMI CSV parser returns safe local GPU status", () => {
  const parsed = parseNvidiaSmiGpuCsv("NVIDIA GeForce RTX 5080, 16303, 1406, 7\n");

  assert.equal(parsed.status, APEX_GPU_SPEED_STATUS.AVAILABLE);
  assert.equal(parsed.available, true);
  assert.equal(parsed.processor, "gpu");
  assert.equal(parsed.gpuName, "NVIDIA GeForce RTX 5080");
  assert.equal(parsed.vramTotalMb, 16303);
  assert.equal(parsed.vramUsedMb, 1406);
  assert.equal(parsed.gpuUtilizationPercent, 7);
});

test("GPU status helper fails closed without exposing command values", async () => {
  const disabled = await getApexGpuStatus({ disabled: true });
  const unavailable = await getApexGpuStatus({
    commandRunner: async () => ({ ok: false, stderr: "nvidia-smi not found" }),
  });

  assert.equal(disabled.status, APEX_GPU_SPEED_STATUS.BLOCKED);
  assert.equal(disabled.commandValuesExposed, false);
  assert.equal(disabled.secretsExposed, false);
  assert.equal(unavailable.status, APEX_GPU_SPEED_STATUS.UNAVAILABLE);
  assert.equal(unavailable.available, false);
  assert.equal(unavailable.commandValuesExposed, false);
});

test("Ollama loaded model parser and processor inference handle GPU, mixed, and CPU", () => {
  const models = parseOllamaLoadedModels({
    models: [
      { name: "qwen3:14b", size: mbToBytes(9000), size_vram: mbToBytes(9000) },
      { name: "qwen3-coder:30b", size: mbToBytes(18000), size_vram: mbToBytes(9000) },
      { name: "cpu-only:1b", size: mbToBytes(1000), size_vram: 0 },
    ],
  });

  assert.equal(models.length, 3);
  assert.equal(models[0].sizeMb, 9000);
  assert.equal(models[0].sizeVramMb, 9000);
  assert.equal(inferProcessorFromLoadedModel(models[0]), "gpu");
  assert.equal(inferProcessorFromLoadedModel(models[1]), "mixed");
  assert.equal(inferProcessorFromLoadedModel(models[2]), "cpu");
  assert.equal(bytesToMb(mbToBytes(42)), 42);
});

test("Ollama processor receipt records safe GPU metadata without prompt or response", () => {
  const receipt = buildOllamaModelProcessorReceipt({
    model: "qwen3:14b",
    beforePayload: { models: [] },
    afterPayload: {
      models: [{ name: "qwen3:14b", size: mbToBytes(9000), size_vram: mbToBytes(9000) }],
    },
    timingMs: 1234.56,
  });

  assert.equal(receipt.receiptType, "local-model-processor");
  assert.equal(receipt.provider, "ollama");
  assert.equal(receipt.model, "qwen3:14b");
  assert.equal(receipt.processor, "gpu");
  assert.equal(receipt.vramUsedMb, 9000);
  assert.equal(receipt.modelAlreadyLoaded, false);
  assert.equal(receipt.modelLoadedAfterTurn, true);
  assert.equal(receipt.responseTimingMs, 1235);
  assert.equal(receipt.rawPromptStored, false);
  assert.equal(receipt.rawResponseStored, false);
  assert.equal(receipt.secretsExposed, false);
});

test("Apex Speed Core combines GPU, model, and STT receipts compactly", () => {
  const status = buildApexSpeedCoreStatus({
    gpu: {
      available: true,
      gpuName: "NVIDIA GeForce RTX 5080",
      vramTotalMb: 16303,
      vramUsedMb: 1406,
    },
    latestModelProcessor: {
      model: "qwen3:14b",
      processor: "gpu",
      vramUsedMb: 9000,
      modelAlreadyLoaded: true,
    },
    voice: {
      selectedSttEngine: {
        id: "faster-whisper-cuda",
        name: "faster-whisper CUDA",
        processor: "gpu",
      },
    },
  });

  assert.equal(status.provider, "apex-gpu-speed-core");
  assert.equal(status.status, "gpu-active");
  assert.equal(status.gpuAvailable, true);
  assert.equal(status.modelProcessor, "gpu");
  assert.equal(status.latestModel, "qwen3:14b");
  assert.equal(status.sttProcessor, "gpu");
  assert.equal(status.openAiUsed, false);
  assert.equal(status.cloudAudioUsed, false);
  assert.equal(status.secretsExposed, false);
});
