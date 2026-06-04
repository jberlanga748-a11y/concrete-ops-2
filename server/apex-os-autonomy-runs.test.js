import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

import { DEFAULT_COMPANY_ID } from "../shared/companyScope.js";
import { createUserRecord } from "./store.js";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createPort() {
  return 19450 + Math.floor(Math.random() * 700);
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
  throw new Error(`Apex autonomy run test server did not become ready.\n${serverOutput()}`);
}

async function startServer() {
  const tempDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "apex-os-autonomy-runs-"));
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

  async function stop() {
    server.kill("SIGTERM");
    await new Promise((resolve) => server.once("exit", resolve));
    await fs.rm(tempDataDir, { recursive: true, force: true });
  }

  return { baseUrl, sqliteFile, stop };
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

function storedJsonSetting(sqliteFile, key, companyId = DEFAULT_COMPANY_ID) {
  const database = new DatabaseSync(sqliteFile);
  try {
    const row = database.prepare(`
      SELECT value FROM company_settings
      WHERE company_id = ? AND key = ?
    `).get(companyId, key);
    return JSON.parse(row?.value || "[]");
  } finally {
    database.close();
  }
}

function autonomyAuditEvents(sqliteFile) {
  const database = new DatabaseSync(sqliteFile);
  try {
    return database.prepare(`
      SELECT entity_type AS entityType, action, summary
      FROM audit_events
      WHERE entity_type IN ('apexOsAutonomyRun', 'apexOsExecutionHandoff', 'apexOsAgentControlRequest')
      ORDER BY created_at DESC
    `).all();
  } finally {
    database.close();
  }
}

test("Apex autonomy runs are operator-only, persisted, linked to drafts, and execution locked", async () => {
  const fixture = await startServer();

  try {
    setOperatorAccess(fixture.sqliteFile, "demo.ops@apexhq.app", true);
    const operatorLogin = await login(fixture.baseUrl, {
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
    });

    const adminUser = createUserRecord({
      id: "U-APEX-OS-AUTONOMY-ADMIN",
      email: "apex-os-autonomy-admin@apexhq.test",
      password: "apexdemo123",
      name: "Apex OS Autonomy Admin",
      role: "Administrator",
    });
    insertUser(fixture.sqliteFile, adminUser);
    const adminLogin = await login(fixture.baseUrl, {
      email: adminUser.email,
      password: "apexdemo123",
    });

    const adminBlocked = await requestJson(fixture.baseUrl, "/api/apex-os/autonomy-runs", {
      headers: authHeaders(adminLogin.token),
    });
    assert.equal(adminBlocked.response.status, 403);

    const unsafeStatus = await requestJson(fixture.baseUrl, "/api/apex-os/autonomy-runs", {
      method: "POST",
      headers: authHeaders(operatorLogin.token),
      body: JSON.stringify({
        request: "Queue an agent run.",
        status: "queued",
        sourceLabel: "Test",
      }),
    });
    assert.equal(unsafeStatus.response.status, 400);
    assert.match(unsafeStatus.payload.error, /queueing/i);

    const unsafeSecret = await requestJson(fixture.baseUrl, "/api/apex-os/autonomy-runs", {
      method: "POST",
      headers: authHeaders(operatorLogin.token),
      body: JSON.stringify({
        request: "Use password sample-value in the portal.",
        sourceLabel: "Test",
      }),
    });
    assert.equal(unsafeSecret.response.status, 400);
    assert.match(unsafeSecret.payload.error, /passwords/i);

    const created = await assertOk(fixture.baseUrl, "/api/apex-os/autonomy-runs", {
      method: "POST",
      headers: authHeaders(operatorLogin.token),
      body: JSON.stringify({
        request: "Turn the next Apex UI improvement into a tracked internal run.",
        routeId: "agents",
        routeLabel: "Agents",
        routeDetail: "Plan and draft internal work only.",
        sourceLabel: "Autonomy route test",
      }),
    });

    assert.equal(created.apexOsAutonomyRun.executionLocked, true);
    assert.equal(created.apexOsAutonomyRun.canExecute, false);
    assert.equal(created.apexOsAutonomyRun.canRunAgent, false);
    assert.equal(created.summary.total, 1);
    assert.equal(storedJsonSetting(fixture.sqliteFile, "apexOsAutonomyRuns").length, 1);

    const draft = await assertOk(fixture.baseUrl, `/api/apex-os/autonomy-runs/${created.apexOsAutonomyRun.id}/draft-internal`, {
      method: "POST",
      headers: authHeaders(operatorLogin.token),
      body: JSON.stringify({}),
    });

    assert.equal(draft.apexOsAutonomyRun.status, "drafting");
    assert.equal(draft.apexOsAutonomyRun.executionLocked, true);
    assert.equal(draft.apexOsAutonomyRun.canExecute, false);
    assert.ok(draft.apexOsAutonomyRun.linkedAgentControlRequestId);
    assert.ok(draft.apexOsAutonomyRun.linkedExecutionHandoffId);
    assert.equal(draft.apexOsAgentControlRequest.executionLocked, true);
    assert.equal(draft.apexOsExecutionHandoff.canRun, false);
    assert.equal(storedJsonSetting(fixture.sqliteFile, "apexOsAgentControlRequests").length, 1);
    assert.equal(storedJsonSetting(fixture.sqliteFile, "apexOsExecutionHandoffs").length, 1);

    const incompleteDone = await requestJson(fixture.baseUrl, `/api/apex-os/autonomy-runs/${created.apexOsAutonomyRun.id}`, {
      method: "PATCH",
      headers: authHeaders(operatorLogin.token),
      body: JSON.stringify({ status: "done" }),
    });
    assert.equal(incompleteDone.response.status, 400);
    assert.match(incompleteDone.payload.error, /Result report/i);

    const finished = await assertOk(fixture.baseUrl, `/api/apex-os/autonomy-runs/${created.apexOsAutonomyRun.id}`, {
      method: "PATCH",
      headers: authHeaders(operatorLogin.token),
      body: JSON.stringify({
        status: "done",
        resultReport: "Internal run completed after operator review. No external action executed.",
      }),
    });
    assert.equal(finished.apexOsAutonomyRun.status, "done");
    assert.equal(finished.summary.done, 1);

    const finishedDraftBlocked = await requestJson(fixture.baseUrl, `/api/apex-os/autonomy-runs/${created.apexOsAutonomyRun.id}/draft-internal`, {
      method: "POST",
      headers: authHeaders(operatorLogin.token),
      body: JSON.stringify({}),
    });
    assert.equal(finishedDraftBlocked.response.status, 400);
    assert.match(finishedDraftBlocked.payload.error, /completed/i);

    const listed = await assertOk(fixture.baseUrl, "/api/apex-os/autonomy-runs", {
      headers: authHeaders(operatorLogin.token),
    });
    assert.equal(listed.apexOsAutonomyRuns[0].title, created.apexOsAutonomyRun.title);
    assert.equal(listed.apexOsAutonomyRuns[0].externalActionsLocked, true);
    assert.equal(listed.apexOsAutonomyRuns[0].canExecute, false);

    const events = autonomyAuditEvents(fixture.sqliteFile);
    assert.ok(events.some((event) => event.entityType === "apexOsAutonomyRun" && event.action === "internal-draft-prepared"));
  } finally {
    await fixture.stop();
  }
});
