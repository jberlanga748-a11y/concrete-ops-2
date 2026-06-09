import assert from "node:assert/strict";
import fs from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

import {
  APEX_HOME_ASSISTANT_ENV,
  HOME_ASSISTANT_EXECUTION_STATUS,
  HOME_ASSISTANT_PREVIEW_STATUS,
  HOME_ASSISTANT_STATUS_READ_STATUS,
  buildHomeAssistantCommandPreview,
  createHomeAssistantExecutionGuard,
  executeHomeAssistantCommandOnce,
  getHomeAssistantConnectorStatus,
  normalizeHomeAssistantAllowlist,
  readHomeAssistantConnectorConfig,
  readHomeAssistantEntityStatus,
  resetHomeAssistantExecutionGuardsForTest,
} from "./apexHomeAssistantConnector.js";
import { createUserRecord } from "./store.js";

const SECRET_TOKEN = "HA_SECRET_TOKEN_SHOULD_NOT_LEAK";
const BASE_URL = "http://127.0.0.1:8123";

function allowlistFixture() {
  return {
    devices: {
      "bedroom-tv": {
        roomId: "bedroom",
        label: "Bedroom TV",
        domain: "media_player",
        entityId: "media_player.bedroom_tv",
      allowedServices: [
        "media_player.turn_on",
        "media_player.turn_off",
        "media_player.volume_set",
        "media_player.volume_up",
        "media_player.volume_down",
        "media_player.select_source",
      ],
      allowedSources: ["Apex Dashboard", "HDMI 1"],
      maxVolumeLevel: 0.6,
    },
    "office-light": {
      roomId: "office",
      label: "Office Light",
      domain: "light",
      entityId: "light.office",
      allowedServices: ["light.turn_on", "light.turn_off"],
    },
    "office-switch": {
      roomId: "office",
      label: "Office Switch",
      domain: "switch",
      entityId: "switch.office",
      allowedServices: ["switch.turn_on", "switch.turn_off"],
    },
  },
    scenes: {
      "dashboard-mode": {
        label: "Dashboard Mode",
        domain: "scene",
        entityId: "scene.apex_dashboard",
        allowedServices: ["scene.turn_on"],
        allowDashboardCast: true,
      },
    },
  };
}

function envFixture(overrides = {}) {
  return {
    [APEX_HOME_ASSISTANT_ENV.BASE_URL]: BASE_URL,
    [APEX_HOME_ASSISTANT_ENV.TOKEN]: SECRET_TOKEN,
    [APEX_HOME_ASSISTANT_ENV.ENABLED]: "true",
    [APEX_HOME_ASSISTANT_ENV.EXECUTION_ENABLED]: "true",
    [APEX_HOME_ASSISTANT_ENV.KILL_SWITCH]: "false",
    [APEX_HOME_ASSISTANT_ENV.LOCAL_NETWORK_ONLY]: "true",
    [APEX_HOME_ASSISTANT_ENV.ALLOWED_ENTITIES_JSON]: JSON.stringify(allowlistFixture()),
    [APEX_HOME_ASSISTANT_ENV.REQUEST_TIMEOUT_MS]: "300",
    [APEX_HOME_ASSISTANT_ENV.MAX_RETRIES]: "1",
    [APEX_HOME_ASSISTANT_ENV.ALLOW_DASHBOARD_CAST]: "true",
    ...overrides,
  };
}

function assertNoSecrets(value) {
  const serialized = JSON.stringify(value);
  assert.doesNotMatch(serialized, new RegExp(SECRET_TOKEN));
  assert.doesNotMatch(serialized, /127\.0\.0\.1:8123|Authorization|Bearer/i);
}

function createPreparedExecution(input = {}, options = {}) {
  const actorId = options.actorId || "operator-1";
  const workspaceId = options.workspaceId || "apex-hq";
  const env = options.env || envFixture();
  const preview = buildHomeAssistantCommandPreview(input, {
    env,
    now: options.now || "2026-06-06T12:00:00.000Z",
  });
  const guard = createHomeAssistantExecutionGuard(preview, {
    env,
    actorId,
    workspaceId,
    now: options.guardNow || options.now || "2026-06-06T12:00:00.000Z",
    ttlMs: options.ttlMs,
  });
  return { actorId, workspaceId, env, preview, guard };
}

async function executePrepared(prepared, overrides = {}, options = {}) {
  return executeHomeAssistantCommandOnce({
    previewId: prepared.preview.previewId,
    previewHash: prepared.preview.previewHash,
    executionGuard: prepared.guard.executionGuard,
    confirmationPhrase: prepared.guard.confirmationPhrase,
    ...overrides,
  }, {
    env: prepared.env,
    actorId: prepared.actorId,
    workspaceId: prepared.workspaceId,
    now: options.now || "2026-06-06T12:00:05.000Z",
    fetchImpl: options.fetchImpl,
  });
}

async function startMockHomeAssistantServer(handler) {
  const server = http.createServer(handler);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    async stop() {
      await new Promise((resolve) => server.close(resolve));
    },
  };
}

test("Home Assistant connector is disabled when config is missing", () => {
  const config = readHomeAssistantConnectorConfig({ env: {} });
  const status = getHomeAssistantConnectorStatus({ connectorConfig: config });

  assert.equal(status.status, "disabled");
  assert.equal(status.enabled, false);
  assert.equal(status.configured, false);
  assert.equal(status.canExecuteNow, false);
  assert.equal(status.executionLocked, true);
  assert.equal(status.disabledReasons.includes("missing-base-url"), true);
  assertNoSecrets(config);
  assertNoSecrets(status);
});

test("Home Assistant token and base URL never appear in public status or preview", () => {
  const env = envFixture();
  const config = readHomeAssistantConnectorConfig({ env });
  const status = getHomeAssistantConnectorStatus({ connectorConfig: config });
  const preview = buildHomeAssistantCommandPreview({
    apexDeviceId: "bedroom-tv",
    command: "turn-on",
    request: "turn on bedroom TV",
  }, { env, now: "2026-06-06T12:00:00.000Z" });

  assert.equal(config.tokenConfigured, true);
  assert.equal(status.tokenConfigured, true);
  assert.equal(preview.status, HOME_ASSISTANT_PREVIEW_STATUS.PREPARED);
  assertNoSecrets(config);
  assertNoSecrets(status);
  assertNoSecrets(preview);
});

test("Home Assistant allowlist parser accepts safe devices and scenes", () => {
  const allowlist = normalizeHomeAssistantAllowlist(allowlistFixture());

  assert.equal(allowlist.configured, true);
  assert.equal(allowlist.deviceCount, 3);
  assert.equal(allowlist.sceneCount, 1);
  assert.equal(allowlist.devices["bedroom-tv"].entityId, "media_player.bedroom_tv");
  assert.deepEqual(allowlist.devices["bedroom-tv"].allowedSources, ["Apex Dashboard", "HDMI 1"]);
  assert.equal(allowlist.devices["bedroom-tv"].maxVolumeLevel, 0.6);
  assert.equal(allowlist.scenes["dashboard-mode"].allowDashboardCast, true);
});

test("Home Assistant allowlist invalid JSON safely falls back", () => {
  const allowlist = normalizeHomeAssistantAllowlist("{not json");

  assert.equal(allowlist.configured, false);
  assert.equal(allowlist.deviceCount, 0);
  assert.equal(allowlist.sceneCount, 0);
  assert.equal(allowlist.errors.includes("invalid-allowlist-json"), true);
});

test("Home Assistant allowlist blocks cameras, mics, locks, alarms, HVAC, garage, and security targets", () => {
  const allowlist = normalizeHomeAssistantAllowlist({
    devices: {
      camera: { label: "Office Camera", entityId: "camera.office", allowedServices: ["camera.turn_on"] },
      microphone: { label: "Office Microphone", entityId: "switch.office_microphone", allowedServices: ["switch.turn_on"] },
      lock: { label: "Front Door Lock", entityId: "lock.front_door", allowedServices: ["lock.unlock"] },
      alarm: { label: "Alarm", entityId: "alarm_control_panel.home", allowedServices: ["alarm_control_panel.alarm_arm_home"] },
      hvac: { label: "Thermostat HVAC", entityId: "climate.home", allowedServices: ["climate.set_temperature"] },
      garage: { label: "Garage Door", entityId: "cover.garage", allowedServices: ["cover.open_cover"] },
      security: { label: "Security Switch", entityId: "switch.security_mode", allowedServices: ["switch.turn_on"] },
    },
  });

  assert.equal(allowlist.deviceCount, 0);
  assert.equal(allowlist.blockedEntryCount, 7);
  assert.equal(allowlist.errors.some((entry) => entry.includes("blocked-device-class")), true);
});

test("Home Assistant preview blocks unknown or free-form entity IDs", () => {
  const env = envFixture();
  const unknownDevice = buildHomeAssistantCommandPreview({
    apexDeviceId: "not-real",
    command: "turn-on",
  }, { env });
  const freeFormEntity = buildHomeAssistantCommandPreview({
    entityId: "media_player.bedroom_tv",
    command: "turn-on",
  }, { env });

  assert.equal(unknownDevice.status, HOME_ASSISTANT_PREVIEW_STATUS.BLOCKED);
  assert.equal(unknownDevice.reason, "unknown-apex-device-id");
  assert.equal(freeFormEntity.status, HOME_ASSISTANT_PREVIEW_STATUS.BLOCKED);
  assert.equal(freeFormEntity.reason, "free-form-entity-id-blocked");
  assertNoSecrets(unknownDevice);
  assertNoSecrets(freeFormEntity);
});

test("Home Assistant preview returns exact planned service and payload without service execution", () => {
  const env = envFixture();
  const preview = buildHomeAssistantCommandPreview({
    apexDeviceId: "bedroom-tv",
    command: "volume-set",
    volumeLevel: 25,
    request: "set bedroom TV volume to 25",
  }, { env, now: "2026-06-06T12:00:00.000Z" });

  assert.equal(preview.status, HOME_ASSISTANT_PREVIEW_STATUS.PREPARED);
  assert.equal(preview.service, "media_player.volume_set");
  assert.deepEqual(preview.payload, {
    entity_id: "media_player.bedroom_tv",
    volume_level: 0.25,
  });
  assert.equal(preview.serviceCallExecuted, false);
  assert.equal(preview.realDeviceTouched, false);
  assert.equal(preview.canExecuteNow, false);
  assert.equal(preview.executionLocked, true);
  assertNoSecrets(preview);
});

test("Home Assistant dashboard cast preview requires an allowlisted scene or script", () => {
  const env = envFixture();
  const blockedDeviceCast = buildHomeAssistantCommandPreview({
    apexDeviceId: "bedroom-tv",
    command: "dashboard-cast",
  }, { env });
  const sceneCast = buildHomeAssistantCommandPreview({
    sceneId: "dashboard-mode",
    command: "dashboard-cast",
  }, { env, now: "2026-06-06T12:00:00.000Z" });

  assert.equal(blockedDeviceCast.status, HOME_ASSISTANT_PREVIEW_STATUS.BLOCKED);
  assert.equal(blockedDeviceCast.reason, "command-not-allowed-for-target");
  assert.equal(sceneCast.status, HOME_ASSISTANT_PREVIEW_STATUS.PREPARED);
  assert.equal(sceneCast.service, "scene.turn_on");
  assert.deepEqual(sceneCast.payload, { entity_id: "scene.apex_dashboard" });
});

test("Home Assistant status read succeeds against a mock read-only server", async () => {
  let requestedPath = "";
  let requestedAuth = "";
  const server = await startMockHomeAssistantServer((req, res) => {
    requestedPath = req.url;
    requestedAuth = req.headers.authorization || "";
    assert.equal(req.method, "GET");
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({
      entity_id: "media_player.bedroom_tv",
      state: "on",
      attributes: {
        friendly_name: "Bedroom TV",
        source: "Apex Dashboard",
        volume_level: 0.3,
        media_title: "Private media title should not be returned",
      },
      last_changed: "2026-06-06T12:00:00.000Z",
      last_updated: "2026-06-06T12:00:01.000Z",
    }));
  });

  try {
    const result = await readHomeAssistantEntityStatus({
      apexDeviceId: "bedroom-tv",
    }, {
      env: envFixture({ [APEX_HOME_ASSISTANT_ENV.BASE_URL]: server.baseUrl }),
    });

    assert.equal(result.status, HOME_ASSISTANT_STATUS_READ_STATUS.OK);
    assert.equal(requestedPath, "/api/states/media_player.bedroom_tv");
    assert.equal(requestedAuth, `Bearer ${SECRET_TOKEN}`);
    assert.equal(result.entityStatus.state, "on");
    assert.equal(result.entityStatus.attributes.friendlyName, "Bedroom TV");
    assert.equal(Object.hasOwn(result.entityStatus.attributes, "media_title"), false);
    assertNoSecrets(result);
  } finally {
    await server.stop();
  }
});

test("Home Assistant status read timeout and errors return safe responses", async () => {
  const timeoutResult = await readHomeAssistantEntityStatus({
    apexDeviceId: "bedroom-tv",
  }, {
    env: envFixture({ [APEX_HOME_ASSISTANT_ENV.REQUEST_TIMEOUT_MS]: "100" }),
    fetchImpl: (_url, options = {}) => new Promise((_resolve, reject) => {
      options.signal?.addEventListener("abort", () => reject(new Error("aborted")));
    }),
  });
  const errorResult = await readHomeAssistantEntityStatus({
    apexDeviceId: "bedroom-tv",
  }, {
    env: envFixture(),
    fetchImpl: () => {
      throw new Error(`Do not leak ${SECRET_TOKEN} ${BASE_URL}`);
    },
  });

  assert.equal(timeoutResult.status, HOME_ASSISTANT_STATUS_READ_STATUS.ERROR);
  assert.equal(errorResult.status, HOME_ASSISTANT_STATUS_READ_STATUS.ERROR);
  assertNoSecrets(timeoutResult);
  assertNoSecrets(errorResult);
});

test("Home Assistant kill switch blocks preview and status reads", async () => {
  let fetchCalled = false;
  const env = envFixture({ [APEX_HOME_ASSISTANT_ENV.KILL_SWITCH]: "true" });
  const preview = buildHomeAssistantCommandPreview({
    apexDeviceId: "bedroom-tv",
    command: "turn-on",
  }, { env });
  const status = await readHomeAssistantEntityStatus({
    apexDeviceId: "bedroom-tv",
  }, {
    env,
    fetchImpl: () => {
      fetchCalled = true;
      throw new Error("should not be called");
    },
  });

  assert.equal(preview.status, HOME_ASSISTANT_PREVIEW_STATUS.BLOCKED);
  assert.equal(preview.reason, "home-assistant-kill-switch-on");
  assert.equal(status.status, HOME_ASSISTANT_STATUS_READ_STATUS.BLOCKED);
  assert.equal(fetchCalled, false);
});

test("Home Assistant execution disabled flag blocks one-time execution", async () => {
  resetHomeAssistantExecutionGuardsForTest();
  let fetchCalled = false;
  const prepared = createPreparedExecution({
    apexDeviceId: "office-light",
    command: "turn-on",
  });

  const result = await executeHomeAssistantCommandOnce({
    previewId: prepared.preview.previewId,
    previewHash: prepared.preview.previewHash,
    executionGuard: prepared.guard.executionGuard,
    confirmationPhrase: prepared.guard.confirmationPhrase,
  }, {
    env: envFixture({ [APEX_HOME_ASSISTANT_ENV.EXECUTION_ENABLED]: "false" }),
    actorId: prepared.actorId,
    workspaceId: prepared.workspaceId,
    fetchImpl: () => {
      fetchCalled = true;
      throw new Error("should not execute");
    },
  });

  assert.equal(result.status, HOME_ASSISTANT_EXECUTION_STATUS.DISABLED);
  assert.equal(result.reason, "home-assistant-execution-disabled");
  assert.equal(fetchCalled, false);
  assertNoSecrets(result);
});

test("Home Assistant execution kill switch blocks one-time execution", async () => {
  resetHomeAssistantExecutionGuardsForTest();
  let fetchCalled = false;
  const prepared = createPreparedExecution({
    apexDeviceId: "office-light",
    command: "turn-on",
  });

  const result = await executeHomeAssistantCommandOnce({
    previewId: prepared.preview.previewId,
    previewHash: prepared.preview.previewHash,
    executionGuard: prepared.guard.executionGuard,
    confirmationPhrase: prepared.guard.confirmationPhrase,
  }, {
    env: envFixture({ [APEX_HOME_ASSISTANT_ENV.KILL_SWITCH]: "true" }),
    actorId: prepared.actorId,
    workspaceId: prepared.workspaceId,
    fetchImpl: () => {
      fetchCalled = true;
      throw new Error("should not execute");
    },
  });

  assert.equal(result.status, HOME_ASSISTANT_EXECUTION_STATUS.BLOCKED);
  assert.equal(result.reason, "home-assistant-kill-switch-on");
  assert.equal(fetchCalled, false);
  assertNoSecrets(result);
});

test("Home Assistant execution blocks unknown entities, blocked domains, and non-v1 commands", () => {
  resetHomeAssistantExecutionGuardsForTest();
  const env = envFixture();
  const unknownPreview = buildHomeAssistantCommandPreview({
    apexDeviceId: "not-real",
    command: "turn-on",
  }, { env });
  const blockedDomainPreview = buildHomeAssistantCommandPreview({
    apexDeviceId: "office-camera",
    command: "turn-on",
  }, {
    env: envFixture({
      [APEX_HOME_ASSISTANT_ENV.ALLOWED_ENTITIES_JSON]: JSON.stringify({
        devices: {
          "office-camera": {
            label: "Office Camera",
            domain: "camera",
            entityId: "camera.office",
            allowedServices: ["camera.turn_on"],
          },
        },
      }),
    }),
  });
  const nonV1Preview = buildHomeAssistantCommandPreview({
    apexDeviceId: "bedroom-tv",
    command: "volume-up",
  }, { env });
  const nonV1Guard = createHomeAssistantExecutionGuard(nonV1Preview, {
    env,
    actorId: "operator-1",
    workspaceId: "apex-hq",
  });

  assert.equal(unknownPreview.status, HOME_ASSISTANT_PREVIEW_STATUS.BLOCKED);
  assert.equal(unknownPreview.reason, "unknown-apex-device-id");
  assert.equal(blockedDomainPreview.status, HOME_ASSISTANT_PREVIEW_STATUS.DISABLED);
  assert.equal(blockedDomainPreview.reason, "home-assistant-connector-disabled");
  assert.equal(nonV1Preview.status, HOME_ASSISTANT_PREVIEW_STATUS.PREPARED);
  assert.equal(nonV1Guard.status, HOME_ASSISTANT_EXECUTION_STATUS.BLOCKED);
  assert.equal(nonV1Guard.reason, "preview-not-v1-executable");
});

test("Home Assistant execution rejects modified payloads and missing confirmation phrases", async () => {
  resetHomeAssistantExecutionGuardsForTest();
  let fetchCalled = false;
  const prepared = createPreparedExecution({
    apexDeviceId: "bedroom-tv",
    command: "volume-set",
    volumeLevel: 25,
  });

  const modified = await executePrepared(prepared, {
    payload: {
      entity_id: "media_player.bedroom_tv",
      volume_level: 0.3,
    },
  }, {
    fetchImpl: () => {
      fetchCalled = true;
      throw new Error("should not execute");
    },
  });
  const missingPhrase = await executePrepared(prepared, {
    confirmationPhrase: "",
  }, {
    fetchImpl: () => {
      fetchCalled = true;
      throw new Error("should not execute");
    },
  });

  assert.equal(modified.status, HOME_ASSISTANT_EXECUTION_STATUS.BLOCKED);
  assert.equal(modified.reason, "modified-preview-payload-rejected");
  assert.equal(missingPhrase.status, HOME_ASSISTANT_EXECUTION_STATUS.BLOCKED);
  assert.equal(missingPhrase.reason, "missing-confirmation-phrase");
  assert.equal(fetchCalled, false);
  assertNoSecrets(modified);
  assertNoSecrets(missingPhrase);
});

test("Home Assistant execution rejects expired and replayed preview guards", async () => {
  resetHomeAssistantExecutionGuardsForTest();
  let calls = 0;
  const prepared = createPreparedExecution({
    apexDeviceId: "office-light",
    command: "turn-on",
  }, {
    now: "2026-06-06T12:00:00.000Z",
    ttlMs: 1000,
  });
  const expired = await executePrepared(prepared, {}, {
    now: "2026-06-06T12:00:02.000Z",
    fetchImpl: () => {
      calls += 1;
      throw new Error("should not execute expired guard");
    },
  });

  resetHomeAssistantExecutionGuardsForTest();
  const replayPrepared = createPreparedExecution({
    apexDeviceId: "office-light",
    command: "turn-on",
  });
  const first = await executePrepared(replayPrepared, {}, {
    fetchImpl: () => {
      calls += 1;
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ([]),
      });
    },
  });
  const replay = await executePrepared(replayPrepared, {}, {
    fetchImpl: () => {
      calls += 1;
      throw new Error("should not execute replay");
    },
  });

  assert.equal(expired.status, HOME_ASSISTANT_EXECUTION_STATUS.EXPIRED);
  assert.equal(expired.reason, "execution-guard-expired");
  assert.equal(first.status, HOME_ASSISTANT_EXECUTION_STATUS.SUCCEEDED);
  assert.equal(replay.status, HOME_ASSISTANT_EXECUTION_STATUS.REPLAYED);
  assert.equal(replay.reason, "execution-guard-already-consumed");
  assert.equal(calls, 1);
  assertNoSecrets(expired);
  assertNoSecrets(first);
  assertNoSecrets(replay);
});

test("Home Assistant execution calls mock service once for allowed light, switch, media player, and scene commands", async () => {
  resetHomeAssistantExecutionGuardsForTest();
  const calls = [];
  const server = await startMockHomeAssistantServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => {
      body += String(chunk);
    });
    req.on("end", () => {
      calls.push({
        method: req.method,
        url: req.url,
        auth: req.headers.authorization || "",
        body: JSON.parse(body || "{}"),
      });
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify([]));
    });
  });

  try {
    const env = envFixture({
      [APEX_HOME_ASSISTANT_ENV.BASE_URL]: server.baseUrl,
      [APEX_HOME_ASSISTANT_ENV.MAX_RETRIES]: "0",
    });
    const cases = [
      {
        input: { apexDeviceId: "office-light", command: "turn-on" },
        path: "/api/services/light/turn_on",
        payload: { entity_id: "light.office" },
      },
      {
        input: { apexDeviceId: "office-switch", command: "turn-off" },
        path: "/api/services/switch/turn_off",
        payload: { entity_id: "switch.office" },
      },
      {
        input: { apexDeviceId: "bedroom-tv", command: "volume-set", volumeLevel: 25 },
        path: "/api/services/media_player/volume_set",
        payload: { entity_id: "media_player.bedroom_tv", volume_level: 0.25 },
      },
      {
        input: { sceneId: "dashboard-mode", command: "trigger-scene" },
        path: "/api/services/scene/turn_on",
        payload: { entity_id: "scene.apex_dashboard" },
      },
    ];

    for (const entry of cases) {
      const prepared = createPreparedExecution(entry.input, { env });
      const result = await executePrepared(prepared, {}, { fetchImpl: globalThis.fetch });
      assert.equal(result.status, HOME_ASSISTANT_EXECUTION_STATUS.SUCCEEDED);
      assert.equal(result.externalActionExecuted, true);
      assert.equal(result.serviceCallExecuted, true);
      assert.equal(result.headersExposed, false);
      assert.equal(JSON.stringify(result).includes(server.baseUrl), false);
      assertNoSecrets(result);
    }

    assert.equal(calls.length, cases.length);
    for (let index = 0; index < cases.length; index += 1) {
      assert.equal(calls[index].method, "POST");
      assert.equal(calls[index].url, cases[index].path);
      assert.equal(calls[index].auth, `Bearer ${SECRET_TOKEN}`);
      assert.deepEqual(calls[index].body, cases[index].payload);
    }
  } finally {
    await server.stop();
  }
});

test("Home Assistant execution allows only source allowlist and safe volume range", async () => {
  resetHomeAssistantExecutionGuardsForTest();
  const disallowedSource = buildHomeAssistantCommandPreview({
    apexDeviceId: "bedroom-tv",
    command: "select-source",
    source: "Unknown HDMI",
  }, { env: envFixture() });
  const highVolume = buildHomeAssistantCommandPreview({
    apexDeviceId: "bedroom-tv",
    command: "volume-set",
    volumeLevel: 90,
  }, { env: envFixture() });
  const allowedSource = createPreparedExecution({
    apexDeviceId: "bedroom-tv",
    command: "select-source",
    source: "Apex Dashboard",
  });
  const dryRun = await executePrepared(allowedSource, { dryRun: true }, {
    fetchImpl: () => {
      throw new Error("dry run should not call Home Assistant");
    },
  });

  assert.equal(disallowedSource.status, HOME_ASSISTANT_PREVIEW_STATUS.BLOCKED);
  assert.equal(disallowedSource.reason, "source-not-allowlisted");
  assert.equal(highVolume.status, HOME_ASSISTANT_PREVIEW_STATUS.BLOCKED);
  assert.equal(highVolume.reason, "volume-level-outside-safe-range");
  assert.equal(allowedSource.preview.status, HOME_ASSISTANT_PREVIEW_STATUS.PREPARED);
  assert.equal(dryRun.status, HOME_ASSISTANT_EXECUTION_STATUS.DRY_RUN);
  assert.equal(dryRun.externalActionExecuted, false);
  assertNoSecrets(dryRun);
});

test("Home Assistant execution timeout and service errors return sanitized receipts", async () => {
  resetHomeAssistantExecutionGuardsForTest();
  const timeoutPrepared = createPreparedExecution({
    apexDeviceId: "office-light",
    command: "turn-on",
  });
  const timeout = await executePrepared(timeoutPrepared, {}, {
    fetchImpl: (_url, options = {}) => new Promise((_resolve, reject) => {
      options.signal?.addEventListener("abort", () => reject(new Error(`Do not leak ${SECRET_TOKEN}`)));
    }),
  });

  resetHomeAssistantExecutionGuardsForTest();
  const errorPrepared = createPreparedExecution({
    apexDeviceId: "office-light",
    command: "turn-on",
  });
  const error = await executePrepared(errorPrepared, {}, {
    fetchImpl: () => Promise.resolve({
      ok: false,
      status: 500,
      json: async () => ({ private: SECRET_TOKEN }),
    }),
  });

  assert.equal(timeout.status, HOME_ASSISTANT_EXECUTION_STATUS.ERROR);
  assert.equal(timeout.reason, "home-assistant-service-call-error");
  assert.equal(error.status, HOME_ASSISTANT_EXECUTION_STATUS.ERROR);
  assert.equal(error.reason, "home-assistant-service-call-failed");
  assert.equal(error.httpStatus, 500);
  assertNoSecrets(timeout);
  assertNoSecrets(error);
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createPort() {
  return 20150 + Math.floor(Math.random() * 500);
}

async function waitForServer(baseUrl, serverOutput) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/ready`);
      if (response.ok) return;
    } catch {
      // Poll until ready.
    }
    await sleep(250);
  }
  throw new Error(`Home Assistant connector test server did not become ready.\n${serverOutput()}`);
}

async function startApexServer() {
  const tempDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "apex-ha-connector-"));
  const sqliteFile = path.join(tempDataDir, "app-data.sqlite");
  const port = createPort();
  const baseUrl = `http://localhost:${port}`;
  let output = "";
  const server = spawn(process.execPath, ["server/index.js"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(port),
      DATA_DIR: tempDataDir,
      LOG_LEVEL: "warn",
      OPENAI_API_KEY: "",
      [APEX_HOME_ASSISTANT_ENV.BASE_URL]: "",
      [APEX_HOME_ASSISTANT_ENV.TOKEN]: "",
      [APEX_HOME_ASSISTANT_ENV.ENABLED]: "false",
      [APEX_HOME_ASSISTANT_ENV.EXECUTION_ENABLED]: "false",
      [APEX_HOME_ASSISTANT_ENV.KILL_SWITCH]: "true",
      [APEX_HOME_ASSISTANT_ENV.LOCAL_NETWORK_ONLY]: "true",
      [APEX_HOME_ASSISTANT_ENV.ALLOWED_ENTITIES_JSON]: "",
      [APEX_HOME_ASSISTANT_ENV.REQUEST_TIMEOUT_MS]: "100",
      [APEX_HOME_ASSISTANT_ENV.MAX_RETRIES]: "0",
      [APEX_HOME_ASSISTANT_ENV.ALLOW_DASHBOARD_CAST]: "false",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  server.stdout.on("data", (chunk) => {
    output += String(chunk);
  });
  server.stderr.on("data", (chunk) => {
    output += String(chunk);
  });

  await waitForServer(baseUrl, () => output);

  return {
    baseUrl,
    sqliteFile,
    async stop() {
      server.kill("SIGTERM");
      await new Promise((resolve) => server.once("exit", resolve));
      await fs.rm(tempDataDir, { recursive: true, force: true });
    },
  };
}

async function requestJson(baseUrl, pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, options);
  const payload = response.status === 204 ? null : await response.json().catch(() => null);
  return { response, payload };
}

async function assertOk(baseUrl, pathname, options = {}) {
  const { response, payload } = await requestJson(baseUrl, pathname, options);
  assert.equal(response.ok, true, payload?.error || `Expected ${pathname} to succeed.`);
  return payload;
}

async function login(baseUrl, credentials) {
  return assertOk(baseUrl, "/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Apex-Auth-Mode": "bearer",
    },
    body: JSON.stringify({ ...credentials, returnToken: true }),
  });
}

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function setOperatorAccess(sqliteFile, email, enabled) {
  const database = new DatabaseSync(sqliteFile);
  try {
    database.prepare("UPDATE users SET operator_access = ? WHERE email = ?").run(enabled ? 1 : 0, email);
  } finally {
    database.close();
  }
}

function insertUser(sqliteFile, user) {
  const database = new DatabaseSync(sqliteFile);
  try {
    database.prepare(`
      INSERT INTO users (id, email, name, role, phone, status, company_id, operator_access, created_at, updated_at, last_login_at, password_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      user.id,
      user.email,
      user.name,
      user.role,
      user.phone,
      user.status,
      user.companyId,
      user.operatorAccess ? 1 : 0,
      user.createdAt,
      user.updatedAt,
      user.lastLoginAt,
      user.passwordHash,
    );
  } finally {
    database.close();
  }
}

test("Home Assistant endpoints are Apex OS operator-only and non-executing", async () => {
  const fixture = await startApexServer();

  try {
    setOperatorAccess(fixture.sqliteFile, "demo.ops@apexhq.app", true);
    const operatorLogin = await login(fixture.baseUrl, {
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
    });

    const adminUser = createUserRecord({
      id: "U-HA-CONNECTOR-ADMIN",
      email: "ha-connector-admin@apexhq.test",
      password: "apexdemo123",
      name: "HA Connector Admin",
      role: "Administrator",
    });
    const fieldUser = createUserRecord({
      id: "U-HA-CONNECTOR-FIELD",
      email: "ha-connector-field@apexhq.test",
      password: "apexdemo123",
      name: "HA Connector Field",
      role: "Foreman",
      operatorAccess: true,
    });
    insertUser(fixture.sqliteFile, adminUser);
    insertUser(fixture.sqliteFile, fieldUser);

    const adminLogin = await login(fixture.baseUrl, {
      email: adminUser.email,
      password: "apexdemo123",
    });
    const fieldLogin = await login(fixture.baseUrl, {
      email: fieldUser.email,
      password: "apexdemo123",
    });

    const operatorStatus = await requestJson(fixture.baseUrl, "/api/apex-os/home-assistant/status", {
      headers: authHeaders(operatorLogin.token),
    });
    assert.equal(operatorStatus.response.status, 200);
    assert.equal(operatorStatus.payload.homeAssistant.status, "blocked");
    assert.equal(operatorStatus.payload.execution.executionLocked, true);
    assertNoSecrets(operatorStatus.payload);

    const operatorPreview = await requestJson(fixture.baseUrl, "/api/apex-os/home-assistant/preview", {
      method: "POST",
      headers: authHeaders(operatorLogin.token),
      body: JSON.stringify({ apexDeviceId: "bedroom-tv", command: "turn-on" }),
    });
    assert.equal(operatorPreview.response.status, 200);
    assert.equal(operatorPreview.payload.homeAssistantPreview.status, "blocked");
    assert.equal(operatorPreview.payload.execution.canExecuteNow, false);
    assertNoSecrets(operatorPreview.payload);

    const operatorExecute = await requestJson(fixture.baseUrl, "/api/apex-os/home-assistant/execute", {
      method: "POST",
      headers: authHeaders(operatorLogin.token),
      body: JSON.stringify({
        previewId: "HA-PV-not-real",
        executionGuard: "not-real.not-real",
        confirmationPhrase: "I approve Apex to execute Home Assistant preview HA-PV-not-real one time now",
      }),
    });
    assert.equal(operatorExecute.response.status, 200);
    assert.equal(operatorExecute.payload.homeAssistantExecution.status, "blocked");
    assert.equal(operatorExecute.payload.homeAssistantExecution.externalActionExecuted, false);
    assertNoSecrets(operatorExecute.payload);

    for (const blockedLogin of [adminLogin, fieldLogin]) {
      const blockedStatus = await requestJson(fixture.baseUrl, "/api/apex-os/home-assistant/status", {
        headers: authHeaders(blockedLogin.token),
      });
      assert.equal(blockedStatus.response.status, 403);

      const blockedPreview = await requestJson(fixture.baseUrl, "/api/apex-os/home-assistant/preview", {
        method: "POST",
        headers: authHeaders(blockedLogin.token),
        body: JSON.stringify({ apexDeviceId: "bedroom-tv", command: "turn-on" }),
      });
      assert.equal(blockedPreview.response.status, 403);

      const blockedExecute = await requestJson(fixture.baseUrl, "/api/apex-os/home-assistant/execute", {
        method: "POST",
        headers: authHeaders(blockedLogin.token),
        body: JSON.stringify({
          previewId: "HA-PV-not-real",
          executionGuard: "not-real.not-real",
          confirmationPhrase: "I approve Apex to execute Home Assistant preview HA-PV-not-real one time now",
        }),
      });
      assert.equal(blockedExecute.response.status, 403);
    }
  } finally {
    await fixture.stop();
  }
});
