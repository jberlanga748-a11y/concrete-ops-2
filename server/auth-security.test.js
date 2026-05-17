import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

import { createUserRecord } from "./store.js";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createPort() {
  return 9700 + Math.floor(Math.random() * 800);
}

async function waitForServer(baseUrl, serverOutput) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/ready`);
      if (response.ok) return;
    } catch {
      // Poll until the server becomes ready.
    }
    await sleep(250);
  }

  throw new Error(`Auth security test server did not become ready.\n${serverOutput()}`);
}

async function startServer() {
  const tempDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "apex-hq-auth-security-"));
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
    sqliteFile: path.join(tempDataDir, "app-data.sqlite"),
    stop,
  };
}

async function requestJson(baseUrl, pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, options);
  const payload = response.status === 204 ? null : await response.json();
  return { response, payload };
}

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function login(baseUrl, body = {}) {
  return requestJson(baseUrl, "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
      ...body,
    }),
  });
}

function insertUser(sqliteFile, user) {
  const database = new DatabaseSync(sqliteFile);
  try {
    database.prepare(`
      INSERT INTO users (id, email, name, role, phone, status, created_at, updated_at, last_login_at, password_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      user.id,
      user.email,
      user.name,
      user.role,
      user.phone || "",
      user.status || "active",
      user.createdAt || new Date().toISOString(),
      user.updatedAt || user.createdAt || new Date().toISOString(),
      user.lastLoginAt || null,
      user.passwordHash,
    );
  } finally {
    database.close();
  }
}

test("login rate limit blocks repeated bad credentials for the same target", async () => {
  const fixture = await startServer();

  try {
    insertUser(fixture.sqliteFile, createUserRecord({
      id: "U-AUTH-RATE-OTHER",
      email: "auth-rate-other@apexhq.test",
      password: "apexdemo123",
      name: "Auth Rate Other",
      role: "Administrator",
    }));

    for (let attempt = 0; attempt < 6; attempt += 1) {
      const { response, payload } = await login(fixture.baseUrl, {
        password: `wrong-login-${attempt}`,
      });
      assert.equal(response.status, 401);
      assert.match(payload.error, /invalid email or password/i);
    }

    const limited = await login(fixture.baseUrl, {
      password: "wrong-login-final",
    });
    assert.equal(limited.response.status, 429);
    assert.match(limited.payload.error, /too many login attempts/i);

    const otherTarget = await login(fixture.baseUrl, {
      email: "auth-rate-other@apexhq.test",
      password: "apexdemo123",
    });
    assert.equal(otherTarget.response.status, 200);
    assert.ok(otherTarget.payload.token);
  } finally {
    await fixture.stop();
  }
});

test("successful login and logout are written to the audit trail", async () => {
  const fixture = await startServer();

  try {
    const firstLogin = await login(fixture.baseUrl);
    assert.equal(firstLogin.response.status, 200);
    assert.ok(firstLogin.payload.token);

    const firstBootstrap = await requestJson(fixture.baseUrl, "/api/bootstrap", {
      headers: authHeaders(firstLogin.payload.token),
    });
    assert.equal(firstBootstrap.response.status, 200);
    assert.equal(firstBootstrap.payload.auditEvents.some((event) => (
      event.entityType === "auth"
        && event.action === "logged_in"
        && event.entityId === firstBootstrap.payload.user.id
    )), true);

    const logout = await requestJson(fixture.baseUrl, "/api/auth/logout", {
      method: "POST",
      headers: authHeaders(firstLogin.payload.token),
    });
    assert.equal(logout.response.status, 204);

    const secondLogin = await login(fixture.baseUrl);
    assert.equal(secondLogin.response.status, 200);

    const secondBootstrap = await requestJson(fixture.baseUrl, "/api/bootstrap", {
      headers: authHeaders(secondLogin.payload.token),
    });
    assert.equal(secondBootstrap.response.status, 200);
    assert.equal(secondBootstrap.payload.auditEvents.some((event) => (
      event.entityType === "auth"
        && event.action === "logged_out"
        && event.entityId === secondBootstrap.payload.user.id
    )), true);
  } finally {
    await fixture.stop();
  }
});

test("successful login clears earlier failed attempts before the threshold", async () => {
  const fixture = await startServer();

  try {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const { response } = await login(fixture.baseUrl, {
        password: `bad-password-${attempt}`,
      });
      assert.equal(response.status, 401);
    }

    const success = await login(fixture.baseUrl);
    assert.equal(success.response.status, 200);
    assert.ok(success.payload.token);

    const retryAfterSuccess = await login(fixture.baseUrl, {
      password: "bad-after-success",
    });
    assert.equal(retryAfterSuccess.response.status, 401);
  } finally {
    await fixture.stop();
  }
});
