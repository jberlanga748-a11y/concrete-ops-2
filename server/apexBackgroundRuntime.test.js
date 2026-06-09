import assert from "node:assert/strict";
import test from "node:test";

import {
  buildApexBackgroundRuntimeStatus,
  collectApexBackgroundRuntimeStatus,
  readApexBackgroundRuntimeConfig,
  runApexBackgroundKeepWarmPing,
} from "./apexBackgroundRuntime.js";

test("background runtime config keeps bounded speed-lane cold by default", () => {
  const config = readApexBackgroundRuntimeConfig({ env: {} });

  assert.equal(config.provider, "apex-background-runtime");
  assert.equal(config.keepWarmEnabled, false);
  assert.equal(config.keepWarmModel, "qwen3:14b");
  assert.equal(config.keepAlive, "30m");
  assert.equal(config.keepAlivePermanent, false);
  assert.equal(config.secretsExposed, false);
});

test("background runtime config can disable keep-warm explicitly", () => {
  const config = readApexBackgroundRuntimeConfig({
    env: {
      APEX_BACKGROUND_KEEP_WARM_ENABLED: "0",
    },
  });

  assert.equal(config.keepWarmEnabled, false);
  assert.equal(config.keepAlive, "30m");
  assert.equal(config.keepAlivePermanent, false);
});

test("background runtime rejects permanent keep-alive in v0", () => {
  const config = readApexBackgroundRuntimeConfig({
    env: {
      APEX_BACKGROUND_KEEP_WARM_ENABLED: "1",
      APEX_BACKGROUND_KEEP_WARM_KEEP_ALIVE: "-1",
    },
  });

  assert.equal(config.keepWarmEnabled, true);
  assert.equal(config.keepAlive, "30m");
  assert.equal(config.keepAlivePermanent, false);
});

test("keep-warm disabled returns a non-generating receipt", async () => {
  let fetchCalled = false;
  const receipt = await runApexBackgroundKeepWarmPing({
    env: {
      APEX_BACKGROUND_KEEP_WARM_ENABLED: "0",
    },
    fetchImpl: async () => {
      fetchCalled = true;
      throw new Error("should not fetch");
    },
  });

  assert.equal(fetchCalled, false);
  assert.equal(receipt.status, "disabled");
  assert.equal(receipt.enabled, false);
  assert.equal(receipt.textGenerated, false);
  assert.equal(receipt.promptStored, false);
  assert.equal(receipt.memoryWritten, false);
  assert.equal(receipt.openAiUsed, false);
});

test("keep-warm enabled calls local Ollama generate with empty prompt and bounded keep alive", async () => {
  const calls = [];
  const receipt = await runApexBackgroundKeepWarmPing({
    env: {
      APEX_BACKGROUND_KEEP_WARM_ENABLED: "true",
      APEX_BACKGROUND_KEEP_WARM_MODEL: "qwen3:14b",
      APEX_BACKGROUND_KEEP_WARM_KEEP_ALIVE: "10m",
    },
    fetchImpl: async (url, options) => {
      calls.push({ url: String(url), body: JSON.parse(options.body) });
      return {
        ok: true,
        status: 200,
        async json() {
          return { response: "" };
        },
      };
    },
  });

  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /127\.0\.0\.1:11434\/api\/generate/);
  assert.equal(calls[0].body.model, "qwen3:14b");
  assert.equal(calls[0].body.prompt, "");
  assert.equal(calls[0].body.stream, false);
  assert.equal(calls[0].body.keep_alive, "10m");
  assert.equal(calls[0].body.options.num_ctx, 4096);
  assert.equal(calls[0].body.options.num_predict, 1);
  assert.equal(receipt.status, "ready");
  assert.equal(receipt.version, "v1.3");
  assert.equal(receipt.targetNumCtx, 4096);
  assert.equal(receipt.activeLane, "stable-4096");
  assert.equal(receipt.stable4096Active, true);
  assert.equal(receipt.warmPlan.status, "ready");
  assert.equal(receipt.success, true);
  assert.equal(receipt.textGenerated, false);
  assert.equal(receipt.userVisibleAnswerCreated, false);
});

test("keep-warm blocks qwen3-coder from default residency", async () => {
  let fetchCalled = false;
  const receipt = await runApexBackgroundKeepWarmPing({
    env: {
      APEX_BACKGROUND_KEEP_WARM_ENABLED: "true",
      APEX_BACKGROUND_KEEP_WARM_MODEL: "qwen3-coder:30b",
    },
    fetchImpl: async () => {
      fetchCalled = true;
      return { ok: true, async json() { return {}; } };
    },
  });

  assert.equal(fetchCalled, false);
  assert.equal(receipt.status, "blocked");
  assert.equal(receipt.reason, "coding-model-not-kept-warm-by-default");
});

test("keep-warm uses stable 4096 context for normal and coding lanes when VRAM is healthy", async () => {
  const calls = [];
  const receipt = await runApexBackgroundKeepWarmPing({
    activeLane: "coding",
    env: {
      APEX_BACKGROUND_KEEP_WARM_ENABLED: "true",
      APEX_BACKGROUND_KEEP_WARM_MODEL: "qwen3:14b",
    },
    fetchImpl: async (url, options) => {
      calls.push({ url: String(url), body: JSON.parse(options.body) });
      return {
        ok: true,
        status: 200,
        async json() {
          return { response: "" };
        },
      };
    },
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].body.model, "qwen3:14b");
  assert.equal(calls[0].body.keep_alive, "30m");
  assert.equal(calls[0].body.options.num_ctx, 4096);
  assert.equal(receipt.status, "ready");
  assert.equal(receipt.targetNumCtx, 4096);
  assert.equal(receipt.activeLane, "stable-4096");
  assert.equal(receipt.warmPlan.deepModelWarmAllowed, false);
});

test("background status marks local workstation components without execution", () => {
  const status = buildApexBackgroundRuntimeStatus({
    config: readApexBackgroundRuntimeConfig({ env: {} }),
    api: { ok: true, status: "ready" },
    client: { ok: true, status: "ready", url: "http://localhost:5173/apex" },
    ollama: {
      available: true,
      status: "available",
      modelNames: ["qwen3:14b", "qwen3-coder:30b"],
      modelCount: 2,
    },
    llamaCpp: {
      provider: "llama.cpp",
      available: true,
      status: "available",
      canChatNow: true,
      modelNames: ["gpt-oss:20b", "qwen3:4b-instruct", "qwen3:14b"],
      modelCount: 3,
      loadedModel: { model: "gpt-oss:20b", matchedKnownFile: true },
      models: [
        { model: "gpt-oss:20b", fileAvailable: true, loaded: true },
        { model: "qwen3:4b-instruct", fileAvailable: true, loaded: false },
        { model: "qwen3:14b", fileAvailable: true, loaded: false },
      ],
    },
    llamaRuntime: {
      provider: "apex-llama-cpp-runtime",
      ownedProcessActive: true,
      ownedPid: 4242,
      model: "gpt-oss:20b",
      startedAt: "2026-06-08T20:00:00.000Z",
    },
    gpu: {
      provider: "nvidia-smi",
      status: "available",
      available: true,
      gpuName: "NVIDIA GeForce RTX 5080",
      vramTotalMb: 16303,
      vramUsedMb: 1200,
      gpuUtilizationPercent: 4,
    },
    localVoice: {
      status: "ready",
      canHearLocally: true,
      canSpeakLocally: true,
      selectedSttEngine: { id: "faster-whisper-cuda", name: "faster-whisper CUDA", processor: "gpu", modelName: "small.en" },
      selectedTtsEngine: { provider: "kokoro-onnx", voiceId: "am_michael", processor: "cpu/onnx" },
      lastVoiceTurn: {
        turnId: "turn-live-1",
        status: "spoken",
        totalTurnMs: 2650,
        timingMs: {
          voiceCloseMs: 520,
          sttMs: 960,
          modelFirstTokenMs: 160,
          modelTotalMs: 572,
          ttsGenerationMs: 240,
          playbackStartDelayMs: 60,
          recoveryMs: 40,
          totalTurnMs: 2650,
        },
        liveTurnLatency: {
          provider: "apex-live-turn-latency",
          version: "v1",
          diagnosis: "model-fast-voice-slow",
          bottleneckOwner: "voice-pipeline",
          closeMs: 520,
          sttMs: 960,
          modelFirstTokenMs: 160,
          modelTotalMs: 572,
          ttsMs: 240,
          playbackRecoveryMs: 100,
          totalTurnMs: 2650,
          slowestStepLabel: "STT",
          slowestStepMs: 960,
          modelFast: true,
          voiceDominant: true,
        },
      },
    },
    alwaysOpenMic: { state: "standby", ingressProvider: "browser", vadProvider: "amplitude-gate" },
    liveTurnLatencyHistory: {
      provider: "apex-live-turn-latency",
      receiptType: "live-turn-latency-history-summary",
      version: "v1",
      status: "ready",
      latestTypedBenchmark: {
        benchmarkType: "typed",
        explicitUserStarted: true,
        totalTurnMs: 590,
        modelFirstTokenMs: 155,
        modelTotalMs: 560,
      },
      latestVoiceBenchmark: {
        benchmarkType: "voice",
        explicitUserStarted: true,
        totalTurnMs: 2650,
        closeMs: 520,
        sttMs: 960,
        modelTotalMs: 572,
        ttsMs: 240,
        playbackRecoveryMs: 100,
        slowestStepLabel: "STT",
        slowestStepMs: 960,
        diagnosis: "model-fast-voice-slow",
      },
      benchmarkComparison: {
        status: "ready",
        typedTotalMs: 590,
        voiceTotalMs: 2650,
        slowestStepLabel: "STT",
        slowestStepMs: 960,
        diagnosis: "model-fast-voice-slow",
      },
      voiceBenchmarkRequiresVisibleAction: false,
    },
  });

  assert.equal(status.status, "healthy");
  assert.equal(status.llamaCpp.ready, true);
  assert.equal(status.llamaCpp.selectedModel, "gpt-oss:20b");
  assert.equal(status.primaryRuntime.status, "resident");
  assert.equal(status.primaryRuntime.model, "gpt-oss:20b");
  assert.equal(status.primaryRuntime.legacyOllamaKeepWarmRequired, false);
  assert.equal(status.ollama.defaultModel.status, "ready");
  assert.equal(status.ollama.legacyFallback, true);
  assert.equal(status.ollama.codingModel.status, "ready");
  assert.equal(status.brain.provider, "apex-workstation-brain");
  assert.equal(status.brain.activeMode, "speed");
  assert.equal(status.brain.modelId, "qwen3:14b");
  assert.equal(status.brain.numCtx, 2048);
  assert.equal(status.brain.keepAlive, "10m");
  assert.equal(status.agentSpeed.provider, "apex-local-agent-speed");
  assert.equal(status.agentSpeed.laneId, "fast");
  assert.equal(status.agentSpeed.modelId, "qwen3:14b");
  assert.equal(status.agentSpeed.numCtx, 4096);
  assert.equal(status.stableResidency.residentLane, "stable-4096");
  assert.equal(status.stableResidency.residentNumCtx, 4096);
  assert.equal(status.keepWarm.residentNumCtx, 4096);
  assert.equal(status.agentSpeed.coderAutoWarm, false);
  assert.equal(status.agentSpeed.noCloudFallback, true);
  assert.equal(status.brain.thresholdStatus, "stable");
  assert.equal(status.brain.dedicatedMode.prepared, true);
  assert.equal(status.brain.dedicatedMode.enabled, false);
  assert.equal(status.brain.queue.serialized, true);
  assert.equal(status.gpu.computeReady, true);
  assert.equal(status.voice.sttProvider, "faster-whisper-cuda");
  assert.equal(status.voice.sttProcessor, "gpu");
  assert.equal(status.voice.ttsProvider, "kokoro-onnx");
  assert.equal(status.voice.latestLiveTurnTiming.sttMs, 960);
  assert.equal(status.voice.latestLiveTurnTiming.modelFirstTokenMs, 160);
  assert.equal(status.voice.latestLiveTurnTiming.diagnosis, "model-fast-voice-slow");
  assert.equal(status.liveTurnBenchmarkHistory.latestTypedBenchmark.totalTurnMs, 590);
  assert.equal(status.voice.latestVoiceBenchmark.totalTurnMs, 2650);
  assert.equal(status.latency.benchmarkComparison.diagnosis, "model-fast-voice-slow");
  assert.equal(status.mic.ingressProvider, "browser");
  assert.equal(status.mic.vadProvider, "amplitude-gate");
  assert.equal(status.keepWarm.enabled, false);
  assert.equal(status.keepWarm.keepAlive, "30m");
  assert.equal(status.agentSpeedBenchmarkHistory.receiptType, "benchmark-history-summary");
  assert.equal(status.agentSpeedBenchmarkHistory.benchmarksRunAutomatically, false);
  assert.equal(status.duplicateProcesses.warningOnly, true);
  assert.equal(status.latency.profile.provider, "apex-latency-profiler");
  assert.equal(status.latency.liveTurn.diagnosis, "model-fast-voice-slow");
  assert.equal(status.latency.liveTurn.bottleneckOwner, "voice-pipeline");
  assert.equal(status.latency.warmRuntimeReady, true);
  assert.equal(status.latency.profile.warmRuntime.ready, true);
  assert.equal(status.latency.profile.warmRuntime.targetModel, "gpt-oss:20b");
  assert.equal(status.safety.windowsServiceRegistered, false);
  assert.equal(status.safety.externalExecutionAdded, false);
});

test("background status degrades when infrastructure drops without exposing secrets", async () => {
  const status = await collectApexBackgroundRuntimeStatus({
    env: { SECRET_VALUE: "sk-background-secret-should-not-leak" },
    api: { ok: true, status: "ready" },
    client: { ok: true, status: "ready" },
    ollama: { available: false, status: "unavailable", modelNames: [] },
    llamaCpp: { provider: "llama.cpp", available: false, status: "unavailable", modelNames: [] },
    gpu: { available: false, status: "unavailable", reason: "nvidia-smi-unavailable" },
    localVoice: { status: "missing", canHearLocally: false, canSpeakLocally: false },
    keepWarm: {
      provider: "ollama",
      status: "disabled",
      enabled: false,
      targetModel: "qwen3:14b",
      keepAlive: "5m",
      success: false,
      textGenerated: false,
      generatedTextLength: 0,
      reason: "keep-warm-disabled",
      openAiUsed: false,
      secretsExposed: false,
    },
  });

  assert.equal(status.status, "degraded");
  assert.equal(status.degradedReasons.includes("llama-cpp-not-ready"), true);
  assert.equal(status.degradedReasons.includes("ollama-not-ready"), false);
  assert.equal(status.degradedReasons.includes("gpu-not-ready"), true);
  assert.equal(status.degradedReasons.includes("voice-not-ready"), true);
  assert.equal(status.safety.openAiUsed, false);
  assert.equal(status.safety.secretsExposed, false);
  assert.doesNotMatch(JSON.stringify(status), /sk-background-secret-should-not-leak/i);
});
