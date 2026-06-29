import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  APEX_LLAMA_CPP_RUNTIME_ENV,
  resetApexLlamaCppRuntimeStateForTests,
  resolveApexLlamaCppRuntimeConfig,
  runApexLlamaCppRuntimeAction,
} from "./apexLlamaCppRuntime.js";
import {
  APEX_LLAMA_CPP_ENV,
  APEX_LLAMA_CPP_MODEL_ID,
} from "./apexLlamaCppProvider.js";

async function withRuntimeFiles(run) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "apex-llama-cpp-runtime-"));
  const exePath = path.join(tempDir, "llama-server.exe");
  const modelPath = path.join(tempDir, "gpt-oss-20b-mxfp4.gguf");
  await fs.writeFile(exePath, "exe");
  await fs.writeFile(modelPath, "GGUF");
  try {
    return await run({ tempDir, exePath, modelPath });
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
    resetApexLlamaCppRuntimeStateForTests();
  }
}

function readyStatus() {
  return Object.freeze({
    provider: "llama.cpp",
    status: "available",
    available: true,
    models: Object.freeze([
      Object.freeze({
        model: APEX_LLAMA_CPP_MODEL_ID.GPT_OSS_20B,
        fileAvailable: true,
        loaded: true,
      }),
    ]),
    loadedModel: Object.freeze({
      model: APEX_LLAMA_CPP_MODEL_ID.GPT_OSS_20B,
      matchedKnownFile: true,
    }),
  });
}

function unavailableStatus(reason = "llama-cpp-unavailable") {
  return Object.freeze({
    provider: "llama.cpp",
    status: "unavailable",
    available: false,
    reason,
    models: Object.freeze([]),
  });
}

function fakeChild(pid = 12345) {
  return {
    pid,
    killed: false,
    exitCode: null,
    unrefCalled: false,
    kill(signal = "SIGTERM") {
      this.signal = signal;
      this.killed = true;
      this.exitCode = 0;
      return true;
    },
    unref() {
      this.unrefCalled = true;
    },
  };
}

test("llama.cpp runtime config resolves local exe and GPT model without exposing paths", async () => {
  await withRuntimeFiles(async ({ exePath, modelPath }) => {
    const config = resolveApexLlamaCppRuntimeConfig({
      env: {
        [APEX_LLAMA_CPP_RUNTIME_ENV.EXE_PATH]: exePath,
        [APEX_LLAMA_CPP_ENV.GPT_OSS_GGUF]: modelPath,
      },
    });

    assert.equal(config.exeAvailable, true);
    assert.equal(config.modelAvailable, true);
    assert.equal(config.exe.fileName, "llama-server.exe");
    assert.equal(config.modelFile.fileName, "gpt-oss-20b-mxfp4.gguf");
    assert.equal(config.args.includes("--host"), true);
    assert.equal(config.args.includes("127.0.0.1"), true);
    assert.equal(config.args.includes("--ctx-size"), true);
    assert.equal(config.args.includes("8192"), true);
    assert.equal(config.localOnly, true);
    assert.equal(JSON.stringify(config.exe).includes(exePath), false);
    assert.equal(JSON.stringify(config.modelFile).includes(modelPath), false);
  });
});

test("prepare-gpt unloads Ollama, starts owned llama.cpp, and waits for readiness", async () => {
  await withRuntimeFiles(async ({ exePath, modelPath }) => {
    const reloadCalls = [];
    const spawnCalls = [];
    const child = fakeChild(24680);
    const statuses = [unavailableStatus(), readyStatus()];

    const receipt = await runApexLlamaCppRuntimeAction({
      action: "prepare-gpt",
      env: {
        [APEX_LLAMA_CPP_RUNTIME_ENV.EXE_PATH]: exePath,
        [APEX_LLAMA_CPP_ENV.GPT_OSS_GGUF]: modelPath,
      },
      providerStatusImpl: async () => statuses.shift() || readyStatus(),
      reloadOllamaImpl: async (payload) => {
        reloadCalls.push(payload);
        return Object.freeze({ provider: "apex-ollama-brain-reload", status: "completed", reloadCalled: payload.reload !== false });
      },
      spawnImpl: (command, args, options) => {
        spawnCalls.push({ command, args, options });
        return child;
      },
      sleepImpl: async () => {},
      waitMs: 5_000,
    });

    assert.equal(receipt.status, "completed");
    assert.equal(receipt.reason, "llama-cpp-gpt-sidecar-ready");
    assert.equal(receipt.processStarted, true);
    assert.equal(receipt.processOwned, true);
    assert.equal(receipt.canChatNow, true);
    assert.equal(receipt.primaryProvider, true);
    assert.equal(receipt.manualOnly, false);
    assert.equal(reloadCalls.length, 1);
    assert.equal(reloadCalls[0].reload, false);
    assert.equal(spawnCalls.length, 1);
    assert.equal(spawnCalls[0].command, exePath);
    assert.equal(spawnCalls[0].args.includes(modelPath), true);
    assert.equal(spawnCalls[0].options.windowsHide, true);
    assert.equal(spawnCalls[0].options.detached, false);
  });
});

test("stop only stops the Apex-owned llama.cpp child process", async () => {
  await withRuntimeFiles(async ({ exePath, modelPath }) => {
    const child = fakeChild(13579);
    const statuses = [unavailableStatus(), readyStatus()];
    await runApexLlamaCppRuntimeAction({
      action: "prepare-gpt",
      env: {
        [APEX_LLAMA_CPP_RUNTIME_ENV.EXE_PATH]: exePath,
        [APEX_LLAMA_CPP_ENV.GPT_OSS_GGUF]: modelPath,
      },
      providerStatusImpl: async () => statuses.shift() || readyStatus(),
      reloadOllamaImpl: async () => ({ status: "completed" }),
      spawnImpl: () => child,
      sleepImpl: async () => {},
    });

    const stopped = await runApexLlamaCppRuntimeAction({
      action: "stop",
      providerStatusImpl: async () => unavailableStatus("after-stop"),
    });
    const secondStop = await runApexLlamaCppRuntimeAction({
      action: "stop",
      providerStatusImpl: async () => unavailableStatus("after-stop"),
    });

    assert.equal(child.killed, true);
    assert.equal(stopped.status, "completed");
    assert.equal(stopped.processStopped, true);
    assert.equal(stopped.processOwned, true);
    assert.equal(secondStop.status, "noop");
    assert.equal(secondStop.processStopped, false);
    assert.equal(secondStop.runtime.randomProcessesTouched, false);
  });
});

test("prepare-gpt can detach the sidecar for one-shot local launcher runs", async () => {
  await withRuntimeFiles(async ({ exePath, modelPath }) => {
    const spawnCalls = [];
    const child = fakeChild(86420);
    const statuses = [unavailableStatus(), readyStatus()];

    const receipt = await runApexLlamaCppRuntimeAction({
      action: "prepare-gpt",
      detachProcess: true,
      env: {
        [APEX_LLAMA_CPP_RUNTIME_ENV.EXE_PATH]: exePath,
        [APEX_LLAMA_CPP_ENV.GPT_OSS_GGUF]: modelPath,
      },
      providerStatusImpl: async () => statuses.shift() || readyStatus(),
      reloadOllamaImpl: async () => ({ provider: "apex-ollama-brain-reload", status: "completed" }),
      spawnImpl: (command, args, options) => {
        spawnCalls.push({ command, args, options });
        return child;
      },
      sleepImpl: async () => {},
      waitMs: 5_000,
    });

    assert.equal(receipt.status, "completed");
    assert.equal(receipt.canChatNow, true);
    assert.equal(receipt.processStarted, true);
    assert.equal(receipt.processOwned, false);
    assert.equal(receipt.processDetached, true);
    assert.equal(child.unrefCalled, true);
    assert.equal(spawnCalls[0].options.detached, true);
    assert.equal(receipt.runtime.ownedProcessActive, false);
  });
});

test("restore-ollama stops owned llama.cpp and reloads the Ollama fallback", async () => {
  await withRuntimeFiles(async ({ exePath, modelPath }) => {
    const child = fakeChild(97531);
    const reloadCalls = [];
    const statuses = [unavailableStatus(), readyStatus()];
    await runApexLlamaCppRuntimeAction({
      action: "prepare-gpt",
      env: {
        [APEX_LLAMA_CPP_RUNTIME_ENV.EXE_PATH]: exePath,
        [APEX_LLAMA_CPP_ENV.GPT_OSS_GGUF]: modelPath,
      },
      providerStatusImpl: async () => statuses.shift() || readyStatus(),
      reloadOllamaImpl: async (payload) => {
        reloadCalls.push(payload);
        return { status: "completed" };
      },
      spawnImpl: () => child,
      sleepImpl: async () => {},
    });

    const restored = await runApexLlamaCppRuntimeAction({
      action: "restore-ollama",
      reloadOllamaImpl: async (payload) => {
        reloadCalls.push(payload);
        return { status: "completed" };
      },
    });

    assert.equal(child.killed, true);
    assert.equal(restored.status, "completed");
    assert.equal(restored.reason, "ollama-fallback-restored");
    assert.equal(restored.processStopped, true);
    assert.equal(reloadCalls.length, 2);
    assert.equal(reloadCalls[0].reload, false);
    assert.equal(reloadCalls[1].reload, true);
  });
});

test("runtime blocks unsupported actions and missing binaries", async () => {
  await withRuntimeFiles(async ({ modelPath }) => {
    const badAction = await runApexLlamaCppRuntimeAction({
      action: "wipe-everything",
      providerStatusImpl: async () => unavailableStatus(),
    });
    const missingExe = await runApexLlamaCppRuntimeAction({
      action: "prepare-gpt",
      env: {
        [APEX_LLAMA_CPP_RUNTIME_ENV.EXE_PATH]: path.join(os.tmpdir(), "missing-llama-server.exe"),
        [APEX_LLAMA_CPP_ENV.GPT_OSS_GGUF]: modelPath,
      },
      providerStatusImpl: async () => unavailableStatus(),
    });

    assert.equal(badAction.status, "blocked");
    assert.equal(badAction.reason, "unsupported-llama-cpp-runtime-action");
    assert.equal(missingExe.status, "blocked");
    assert.equal(missingExe.reason, "llama-cpp-server-exe-missing");
  });
});
