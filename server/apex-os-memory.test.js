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
  return 18750 + Math.floor(Math.random() * 700);
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
  throw new Error(`Apex OS memory test server did not become ready.\n${serverOutput()}`);
}

async function startServer() {
  const tempDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "apex-os-memory-"));
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

function storedApexOsMemory(sqliteFile, companyId = DEFAULT_COMPANY_ID) {
  const database = new DatabaseSync(sqliteFile);
  try {
    const row = database.prepare(`
      SELECT value FROM company_settings
      WHERE company_id = ? AND key = 'apexOsMemory'
    `).get(companyId);
    return JSON.parse(row?.value || "[]");
  } finally {
    database.close();
  }
}

function auditEvents(sqliteFile) {
  const database = new DatabaseSync(sqliteFile);
  try {
    return database.prepare(`
      SELECT entity_type AS entityType, action, summary
      FROM audit_events
      WHERE entity_type = 'apexOsMemory'
      ORDER BY created_at DESC
    `).all();
  } finally {
    database.close();
  }
}

test("Apex OS memory is operator-only, source-backed, persisted, and audited", async () => {
  const fixture = await startServer();

  try {
    setOperatorAccess(fixture.sqliteFile, "demo.ops@apexhq.app", true);
    const operatorLogin = await login(fixture.baseUrl, {
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
    });
    const adminUser = createUserRecord({
      id: "U-APEX-OS-MEMORY-ADMIN",
      email: "apex-os-memory-admin@apexhq.test",
      password: "apexdemo123",
      name: "Apex OS Memory Admin",
      role: "Administrator",
    });
    insertUser(fixture.sqliteFile, adminUser);
    const adminLogin = await login(fixture.baseUrl, {
      email: adminUser.email,
      password: "apexdemo123",
    });
    const employeeUser = createUserRecord({
      id: "U-APEX-OS-MEMORY-EMPLOYEE",
      email: "apex-os-memory-employee@apexhq.test",
      password: "apexdemo123",
      name: "Apex OS Memory Employee",
      role: "Employee",
    });
    insertUser(fixture.sqliteFile, employeeUser);
    const employeeLogin = await login(fixture.baseUrl, {
      email: employeeUser.email,
      password: "apexdemo123",
    });

    const adminBlocked = await requestJson(fixture.baseUrl, "/api/apex-os/memory", {
      headers: authHeaders(adminLogin.token),
    });
    assert.equal(adminBlocked.response.status, 403);

    const employeeBlocked = await requestJson(fixture.baseUrl, "/api/apex-os/memory", {
      headers: authHeaders(employeeLogin.token),
    });
    assert.equal(employeeBlocked.response.status, 403);
    const adminAskBlocked = await requestJson(fixture.baseUrl, "/api/apex-os/ask", {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify({ question: "What is next?" }),
    });
    assert.equal(adminAskBlocked.response.status, 403);
    const adminBriefingBlocked = await requestJson(fixture.baseUrl, "/api/apex-os/daily-briefing", {
      headers: authHeaders(adminLogin.token),
    });
    assert.equal(adminBriefingBlocked.response.status, 403);

    const unsafe = await requestJson(fixture.baseUrl, "/api/apex-os/memory", {
      method: "POST",
      headers: authHeaders(operatorLogin.token),
      body: JSON.stringify({
        title: "Unsafe credential",
        body: "Remember API key sk-test-123456789abc and customer@example.test.",
        sourceLabel: "Bad note",
      }),
    });
    assert.equal(unsafe.response.status, 400);

    const missingSource = await requestJson(fixture.baseUrl, "/api/apex-os/memory", {
      method: "POST",
      headers: authHeaders(operatorLogin.token),
      body: JSON.stringify({
        title: "Missing source",
        body: "This should not become durable without a source label.",
      }),
    });
    assert.equal(missingSource.response.status, 400);

    const created = await assertOk(fixture.baseUrl, "/api/apex-os/memory", {
      method: "POST",
      headers: authHeaders(operatorLogin.token),
      body: JSON.stringify({
        category: "decision",
        title: "Apex OS private command center",
        body: "Apex OS is John's private operating center for Apex HQ.",
        sourceType: "document",
        sourceLabel: "Apex OS master plan",
        sourceUri: "docs/APEX_HQ_APEX_OS_COMMAND_CENTER_MASTER_PLAN.md",
        status: "suggested",
      }),
    });

    assert.equal(created.apexOsMemoryEntry.status, "suggested");
    assert.equal(created.companySettings.apexOsMemory[0].title, "Apex OS private command center");
    assert.equal(storedApexOsMemory(fixture.sqliteFile)[0].sourceLabel, "Apex OS master plan");

    const approved = await assertOk(fixture.baseUrl, `/api/apex-os/memory/${created.apexOsMemoryEntry.id}`, {
      method: "PATCH",
      headers: authHeaders(operatorLogin.token),
      body: JSON.stringify({ status: "approved", reviewNote: "Approved for source-backed Apex OS context." }),
    });
    assert.equal(approved.apexOsMemoryEntry.status, "approved");
    assert.equal(approved.apexOsMemoryEntry.approvedBy, operatorLogin.user.id);

    const listed = await assertOk(fixture.baseUrl, "/api/apex-os/memory", {
      headers: authHeaders(operatorLogin.token),
    });
    assert.equal(listed.summary.approved, 1);
    assert.equal(listed.apexOsMemory[0].title, "Apex OS private command center");

    const asked = await assertOk(fixture.baseUrl, "/api/apex-os/ask", {
      method: "POST",
      headers: authHeaders(operatorLogin.token),
      body: JSON.stringify({ question: "Can Apex deploy and send customers messages today?" }),
    });
    assert.equal(asked.answer.providerConfigured, false);
    assert.equal(asked.answer.mode, "local-source-backed");
    assert.equal(asked.context.memoryCount, 1);
    assert.equal(asked.answer.sourceLabels.some((label) => label === "Apex OS master plan"), true);
    assert.equal(asked.answer.approvalWarnings.length >= 2, true);

    const briefing = await assertOk(fixture.baseUrl, "/api/apex-os/daily-briefing", {
      headers: authHeaders(operatorLogin.token),
    });
    assert.equal(briefing.dailyBriefing.operatorName, operatorLogin.user.name);
    assert.equal(briefing.dailyBriefing.briefingRows.some((row) => row.id === "memory-context" && row.status === "1 approved"), true);
    assert.equal(briefing.dailyBriefing.alerts.some((row) => row.id === "no-execution" && row.status === "Locked"), true);
    assert.equal(briefing.dailyBriefing.sourceLabels.includes("AGENTS.md field-role protection rules"), true);

    const archived = await assertOk(fixture.baseUrl, `/api/apex-os/memory/${created.apexOsMemoryEntry.id}`, {
      method: "PATCH",
      headers: authHeaders(operatorLogin.token),
      body: JSON.stringify({ status: "archived" }),
    });
    assert.equal(archived.apexOsMemoryEntry.status, "archived");
    assert.ok(archived.apexOsMemoryEntry.archivedAt);
    assert.deepEqual(auditEvents(fixture.sqliteFile).map((event) => event.action).slice(0, 3), ["archived", "approved", "suggested"]);
  } finally {
    await fixture.stop();
  }
});
