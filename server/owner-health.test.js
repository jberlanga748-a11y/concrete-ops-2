import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

import { DEFAULT_COMPANY_ID } from "../shared/companyScope.js";
import { checkOwnerHealthStorage } from "./owner-health.js";
import { createUserRecord } from "./store.js";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createPort() {
  return 15400 + Math.floor(Math.random() * 1000);
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

  throw new Error(`Owner health test server did not become ready.\n${serverOutput()}`);
}

async function startServer(extraEnv = {}) {
  const tempDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "concrete-ops-owner-health-"));
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
      CONCRETE_OPS_IMPORT_TOKEN: "",
      ...extraEnv,
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

  return {
    baseUrl,
    sqliteFile,
    tempDataDir,
    stop,
    serverOutput: () => output,
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
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });
}

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
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
      user.phone || "",
      user.status || "active",
      user.companyId || DEFAULT_COMPANY_ID,
      user.operatorAccess ? 1 : 0,
      user.createdAt || new Date().toISOString(),
      user.updatedAt || user.createdAt || new Date().toISOString(),
      user.lastLoginAt || null,
      user.passwordHash,
    );
  } finally {
    database.close();
  }
}

function tableCounts(sqliteFile) {
  const database = new DatabaseSync(sqliteFile);
  try {
    const tables = ["users", "leads", "customers", "estimates", "jobs", "uploads"];
    return Object.fromEntries(tables.map((table) => [
      table,
      database.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count,
    ]));
  } finally {
    database.close();
  }
}

test("owner health requires authentication and blocks field users", async () => {
  const fixture = await startServer();

  try {
    const unauthenticated = await requestJson(fixture.baseUrl, "/api/owner-health");
    assert.equal(unauthenticated.response.status, 401);

    const fieldUser = createUserRecord({
      id: "U-OWNER-HEALTH-FIELD",
      email: "owner-health-field@lastyard.test",
      password: "concrete123",
      name: "Owner Health Field",
      role: "Employee",
    });
    insertUser(fixture.sqliteFile, fieldUser);

    const fieldLogin = await login(fixture.baseUrl, {
      email: fieldUser.email,
      password: "concrete123",
    });
    const fieldResponse = await requestJson(fixture.baseUrl, "/api/owner-health", {
      headers: authHeaders(fieldLogin.token),
    });
    assert.equal(fieldResponse.response.status, 403);
  } finally {
    await fixture.stop();
  }
});

test("owner health returns safe configured status without exposing secret values", async () => {
  const fakeOpenAiKey = "owner-health-openai-test-key";
  const fakeImportToken = "owner-health-import-token";
  const fixture = await startServer({
    OPENAI_API_KEY: fakeOpenAiKey,
    CONCRETE_OPS_IMPORT_TOKEN: fakeImportToken,
  });

  try {
    const ownerLogin = await login(fixture.baseUrl, {
      email: "ops@lastyard.test",
      password: "concrete123",
    });
    const beforeCounts = tableCounts(fixture.sqliteFile);
    const payload = await assertOk(fixture.baseUrl, "/api/owner-health", {
      headers: authHeaders(ownerLogin.token),
    });
    const afterCounts = tableCounts(fixture.sqliteFile);

    assert.equal(payload.ok, true);
    assert.equal(payload.app.status, "ok");
    assert.equal(payload.database.status, "ok");
    assert.equal(payload.database.readable, true);
    assert.equal(payload.storage.writable, true);
    assert.equal(payload.ai.configured, true);
    assert.equal(payload.websiteIntake.configured, true);
    assert.equal(payload.backups.status, "available");
    assert.equal(Number.isFinite(payload.counts.users), true);
    assert.equal(Number.isFinite(payload.counts.leads), true);
    assert.deepEqual(afterCounts, beforeCounts);

    const serialized = JSON.stringify(payload);
    assert.equal(serialized.includes(fakeOpenAiKey), false);
    assert.equal(serialized.includes(fakeImportToken), false);
    assert.equal(serialized.includes("Authorization"), false);
  } finally {
    await fixture.stop();
  }
});

test("owner health reports AI and website intake not configured when env vars are missing", async () => {
  const fixture = await startServer({
    OPENAI_API_KEY: "",
    CONCRETE_OPS_IMPORT_TOKEN: "",
  });

  try {
    const ownerLogin = await login(fixture.baseUrl, {
      email: "ops@lastyard.test",
      password: "concrete123",
    });
    const payload = await assertOk(fixture.baseUrl, "/api/owner-health", {
      headers: authHeaders(ownerLogin.token),
    });

    assert.equal(payload.ai.configured, false);
    assert.equal(payload.ai.status, "not_configured");
    assert.equal(payload.websiteIntake.configured, false);
    assert.equal(payload.websiteIntake.status, "not_configured");
    assert.equal(payload.warnings.some((warning) => warning.id === "ai-not-configured"), true);
    assert.equal(payload.warnings.some((warning) => warning.id === "website-intake-not-configured"), true);
  } finally {
    await fixture.stop();
  }
});

test("storage health handles unavailable statfs safely", async () => {
  const tempDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "concrete-ops-owner-health-statfs-"));
  try {
    const storage = await checkOwnerHealthStorage({
      dataDir: tempDataDir,
      statfs: async () => {
        throw new Error("statfs unavailable");
      },
    });

    assert.equal(storage.status, "ok");
    assert.equal(storage.writable, true);
    assert.equal(storage.freeBytes, null);
    assert.equal(storage.totalBytes, null);
    assert.equal(storage.usedPercent, null);
    assert.match(storage.message, /Free-space details are unavailable/);
  } finally {
    await fs.rm(tempDataDir, { recursive: true, force: true });
  }
});

