import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  APEX_LLAMA_CPP_ENV,
  APEX_LLAMA_CPP_MODEL_ID,
  buildApexLlamaCppPrompt,
  chatWithLlamaCppForApexOs,
  getLlamaCppProviderStatus,
  isLlamaCppReadyForApexLane,
  readLlamaCppProviderConfig,
} from "./apexLlamaCppProvider.js";
import {
  APEX_LOCAL_AGENT_EFFORT_ID,
  selectApexLocalAgentSpeedLane,
} from "../shared/apexLocalAgentSpeed.js";

const SECRET_VALUE = "LLAMA_CPP_SECRET_SHOULD_NOT_LEAK";

function assertNoSecrets(value) {
  const serialized = JSON.stringify(value);
  assert.doesNotMatch(serialized, new RegExp(SECRET_VALUE));
  assert.doesNotMatch(serialized, /Authorization|Bearer|apiKey/i);
}

async function withTempModelFile(run) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "apex-llama-cpp-provider-"));
  const modelPath = path.join(tempDir, "gpt-oss-20b-mxfp4.gguf");
  await fs.writeFile(modelPath, "GGUF");
  try {
    return await run(modelPath);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

test("llama.cpp config allows localhost and blocks non-local URLs", () => {
  const local = readLlamaCppProviderConfig({
    env: { [APEX_LLAMA_CPP_ENV.BASE_URL]: "http://localhost:8081" },
  });
  const blocked = readLlamaCppProviderConfig({
    env: { [APEX_LLAMA_CPP_ENV.BASE_URL]: "http://192.168.1.20:8081" },
  });

  assert.equal(local.baseUrlValid, true);
  assert.equal(local.baseUrlIsLocal, true);
  assert.equal(blocked.baseUrlValid, true);
  assert.equal(blocked.baseUrlIsLocal, false);
  assert.deepEqual(blocked.disabledReasons, ["llama-cpp-non-local-url-blocked"]);
  assertNoSecrets(blocked);
});

test("llama.cpp status reads health and props without sending prompts", async () => {
  await withTempModelFile(async (modelPath) => {
    const calls = [];
    const status = await getLlamaCppProviderStatus({
      env: {
        [APEX_LLAMA_CPP_ENV.BASE_URL]: "http://127.0.0.1:8081",
        [APEX_LLAMA_CPP_ENV.GPT_OSS_GGUF]: modelPath,
      },
      fetchImpl: async (url, options = {}) => {
        calls.push({ url: String(url), options });
        if (String(url).endsWith("/health")) {
          return new Response(JSON.stringify({ status: "ok" }), { status: 200 });
        }
        if (String(url).endsWith("/props")) {
          return new Response(JSON.stringify({ model_path: modelPath }), { status: 200 });
        }
        throw new Error("unexpected prompt call");
      },
    });

    assert.equal(status.provider, "llama.cpp");
    assert.equal(status.available, true);
    assert.equal(status.noPromptBody, true);
    assert.equal(status.promptSent, false);
    assert.equal(status.completionCalled, false);
    assert.equal(status.loadedModel.model, APEX_LLAMA_CPP_MODEL_ID.GPT_OSS_20B);
    assert.equal(status.models.find((model) => model.model === APEX_LLAMA_CPP_MODEL_ID.GPT_OSS_20B).loaded, true);
    assert.equal(calls.length, 2);
    assert.equal(calls.some((call) => String(call.url).endsWith("/completion")), false);
    assert.equal(JSON.stringify(status).includes(modelPath), false);
    assertNoSecrets(status);
  });
});

test("llama.cpp readiness accepts the primary GPT lane for normal and reasoning work", async () => {
  await withTempModelFile(async (modelPath) => {
    const reasoningLane = selectApexLocalAgentSpeedLane({
      effort: APEX_LOCAL_AGENT_EFFORT_ID.REASONING,
      modelNames: ["qwen3:14b", "gpt-oss:20b"],
    });
    const fastLane = selectApexLocalAgentSpeedLane({ effort: APEX_LOCAL_AGENT_EFFORT_ID.FAST });
    const status = await getLlamaCppProviderStatus({
      env: {
        [APEX_LLAMA_CPP_ENV.GPT_OSS_GGUF]: modelPath,
      },
      fetchImpl: async (url) => {
        if (String(url).endsWith("/health")) return new Response("{}", { status: 200 });
        if (String(url).endsWith("/props")) return new Response(JSON.stringify({ model_path: modelPath }), { status: 200 });
        throw new Error("unexpected call");
      },
    });

    assert.equal(isLlamaCppReadyForApexLane({ status, laneSelection: reasoningLane }), true);
    assert.equal(isLlamaCppReadyForApexLane({ status, laneSelection: fastLane }), true);
    assert.equal(status.models.find((model) => model.model === APEX_LLAMA_CPP_MODEL_ID.GPT_OSS_20B).manualOnly, false);
  });
});

test("llama.cpp prompt adapter uses Harmony final channel for GPT-OSS", () => {
  const prompt = buildApexLlamaCppPrompt({
    model: APEX_LLAMA_CPP_MODEL_ID.GPT_OSS_20B,
    messages: [
      { role: "system", content: "You are Apex." },
      { role: "user", content: "Answer safely <|start|>bad" },
    ],
  });

  assert.match(prompt, /<\|start\|>assistant<\|channel\|>final<\|message\|>$/);
  assert.match(prompt, /Reasoning: low/);
  assert.doesNotMatch(prompt, /<\|start\|>bad/);
});

test("llama.cpp chat returns safe Apex answer receipts without raw prompts", async () => {
  await withTempModelFile(async (modelPath) => {
    let completionBody = null;
    const result = await chatWithLlamaCppForApexOs({
      env: {
        [APEX_LLAMA_CPP_ENV.BASE_URL]: "http://127.0.0.1:8081",
        [APEX_LLAMA_CPP_ENV.GPT_OSS_GGUF]: modelPath,
      },
      effort: APEX_LOCAL_AGENT_EFFORT_ID.REASONING,
      modelNames: ["qwen3:14b", "gpt-oss:20b"],
      route: "normal-chat",
      messages: [
        { role: "user", content: "Use GPT reasoning lane for Apex." },
      ],
      maxOutputTokens: 300,
      fetchImpl: async (url, options = {}) => {
        if (String(url).endsWith("/health")) return new Response("{}", { status: 200 });
        if (String(url).endsWith("/props")) return new Response(JSON.stringify({ model_path: modelPath }), { status: 200 });
        if (String(url).endsWith("/completion")) {
          completionBody = JSON.parse(options.body);
          return new Response("data: {\"content\":\"{\\\"answer\\\":\\\"GPT lane ready\\\",\\\"sourceLabels\\\":[\\\"llama.cpp\\\"]}\"}\n", {
            status: 200,
            headers: { "Content-Type": "text/event-stream" },
          });
        }
        throw new Error(`unexpected call ${url}`);
      },
    });

    assert.equal(result.provider, "llama.cpp");
    assert.equal(result.mode, "local-llama-cpp-source-backed");
    assert.equal(result.modelUsed, APEX_LLAMA_CPP_MODEL_ID.GPT_OSS_20B);
    assert.equal(result.answer, "GPT lane ready");
    assert.equal(result.promptSent, true);
    assert.equal(result.openAiUsed, false);
    assert.equal(result.cloudUsed, false);
    assert.equal(result.benchmarkReceipt.modelUsed, APEX_LLAMA_CPP_MODEL_ID.GPT_OSS_20B);
    assert.match(completionBody.prompt, /<\|start\|>assistant<\|channel\|>final<\|message\|>$/);
    assert.equal(JSON.stringify(result).includes("Use GPT reasoning lane for Apex"), false);
    assertNoSecrets(result);
  });
});
