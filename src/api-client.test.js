import assert from "node:assert/strict";
import test from "node:test";

import { getApexOsBackgroundStatus, getApexOsBuildLoopStatus, getApexOsSkills, listenApexOsNativeVoice, runApexOsBuildLoop, runApexOsInternalAction, runApexOsTypedLiveTurnBenchmark, saveApexOsLocalVoiceLiveTurnReceipt } from "./api.js";

test("getApexOsSkills calls the read-only Apex OS skills endpoint", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (path, options) => {
    calls.push({ path, options });
    return {
      ok: true,
      status: 200,
      headers: { get: () => "" },
      json: async () => ({
        apexOsSkills: [],
        summary: { availableCount: 0, plannedCount: 0, executableCount: 0 },
      }),
    };
  };

  try {
    const payload = await getApexOsSkills("TEST-TOKEN");
    assert.equal(payload.summary.executableCount, 0);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].path, "/api/apex-os/skills");
    assert.equal(calls[0].options.method, "GET");
    assert.equal(calls[0].options.headers.Authorization, "Bearer TEST-TOKEN");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("runApexOsInternalAction calls the private Apex OS internal action endpoint", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (path, options) => {
    calls.push({ path, options });
    return {
      ok: true,
      status: 201,
      headers: { get: () => "" },
      json: async () => ({
        apexOsInternalAction: {
          status: "performed",
          performed: true,
          receipt: { summary: "Saved private task." },
        },
      }),
    };
  };

  try {
    const payload = await runApexOsInternalAction("TEST-TOKEN", {
      actionType: "create-task",
      payload: { title: "Finish Level 2" },
    });
    assert.equal(payload.apexOsInternalAction.performed, true);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].path, "/api/apex-os/internal-actions");
    assert.equal(calls[0].options.method, "POST");
    assert.equal(calls[0].options.headers.Authorization, "Bearer TEST-TOKEN");
    assert.match(calls[0].options.body, /create-task/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getApexOsBackgroundStatus calls the operator-only background status endpoint", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (path, options) => {
    calls.push({ path, options });
    return {
      ok: true,
      status: 200,
      headers: { get: () => "" },
      json: async () => ({
        background: {
          provider: "apex-background-runtime",
          status: "healthy",
        },
      }),
    };
  };

  try {
    const payload = await getApexOsBackgroundStatus("TEST-TOKEN");
    assert.equal(payload.background.provider, "apex-background-runtime");
    assert.equal(calls.length, 1);
    assert.equal(calls[0].path, "/api/apex-os/background/status");
    assert.equal(calls[0].options.method, "GET");
    assert.equal(calls[0].options.headers.Authorization, "Bearer TEST-TOKEN");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("listenApexOsNativeVoice calls the operator-only native listen endpoint", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (path, options) => {
    calls.push({ path, options });
    return {
      ok: true,
      status: 200,
      headers: { get: () => "" },
      json: async () => ({
        provider: "apex-native-voice",
        ok: true,
        transcript: "Apex native voice test.",
      }),
    };
  };

  try {
    const payload = await listenApexOsNativeVoice("TEST-TOKEN", { listenSeconds: 2 });
    assert.equal(payload.provider, "apex-native-voice");
    assert.equal(payload.transcript, "Apex native voice test.");
    assert.equal(calls.length, 1);
    assert.equal(calls[0].path, "/api/apex-os/local-voice/native-listen");
    assert.equal(calls[0].options.method, "POST");
    assert.equal(calls[0].options.headers.Authorization, "Bearer TEST-TOKEN");
    assert.match(calls[0].options.body, /listenSeconds/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("saveApexOsLocalVoiceLiveTurnReceipt calls the compact live latency receipt endpoint", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (path, options) => {
    calls.push({ path, options });
    return {
      ok: true,
      status: 200,
      headers: { get: () => "" },
      json: async () => ({
        liveTurnLatency: {
          provider: "apex-live-turn-latency",
          receiptType: "live-turn-latency",
          transcriptStored: false,
        },
      }),
    };
  };

  try {
    const payload = await saveApexOsLocalVoiceLiveTurnReceipt("TEST-TOKEN", {
      receipt: { turnId: "turn-1", timingMs: { sttMs: 100 } },
    });
    assert.equal(payload.liveTurnLatency.provider, "apex-live-turn-latency");
    assert.equal(payload.liveTurnLatency.transcriptStored, false);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].path, "/api/apex-os/local-voice/live-turn-receipt");
    assert.equal(calls[0].options.method, "POST");
    assert.equal(calls[0].options.headers.Authorization, "Bearer TEST-TOKEN");
    assert.match(calls[0].options.body, /turn-1/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("runApexOsTypedLiveTurnBenchmark calls the explicit typed benchmark endpoint", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (path, options) => {
    calls.push({ path, options });
    return {
      ok: true,
      status: 200,
      headers: { get: () => "" },
      json: async () => ({
        typedBenchmark: {
          provider: "apex-live-turn-latency",
          benchmarkType: "typed",
          explicitUserStarted: true,
        },
      }),
    };
  };

  try {
    const payload = await runApexOsTypedLiveTurnBenchmark("TEST-TOKEN", { explicitUserStarted: true });
    assert.equal(payload.typedBenchmark.benchmarkType, "typed");
    assert.equal(calls.length, 1);
    assert.equal(calls[0].path, "/api/apex-os/local-voice/live-turn-benchmark/typed");
    assert.equal(calls[0].options.method, "POST");
    assert.equal(calls[0].options.headers.Authorization, "Bearer TEST-TOKEN");
    assert.match(calls[0].options.body, /explicitUserStarted/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Apex build loop API helpers call operator-only build-loop endpoints", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (path, options) => {
    calls.push({ path, options });
    return {
      ok: true,
      status: 200,
      headers: { get: () => "" },
      json: async () => ({
        buildLoop: {
          receipt: {
            outcome: "fixed",
          },
        },
      }),
    };
  };

  try {
    await getApexOsBuildLoopStatus("TEST-TOKEN");
    const payload = await runApexOsBuildLoop("TEST-TOKEN", { request: "Apex, work on yourself." });
    assert.equal(payload.buildLoop.receipt.outcome, "fixed");
    assert.equal(calls[0].path, "/api/apex-os/build-loop/status");
    assert.equal(calls[0].options.method, "GET");
    assert.equal(calls[1].path, "/api/apex-os/build-loop/runs");
    assert.equal(calls[1].options.method, "POST");
    assert.equal(calls[1].options.headers.Authorization, "Bearer TEST-TOKEN");
    assert.match(calls[1].options.body, /work on yourself/i);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
