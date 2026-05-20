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

function isProcessRunning(child) {
  return child.exitCode === null && child.signalCode === null;
}

async function waitForProcessExit(child, timeoutMs) {
  if (!isProcessRunning(child)) {
    return true;
  }

  return new Promise((resolve) => {
    const timeoutId = setTimeout(() => {
      child.off("exit", onExit);
      resolve(false);
    }, timeoutMs);

    function onExit() {
      clearTimeout(timeoutId);
      resolve(true);
    }

    child.once("exit", onExit);
  });
}

async function stopServerProcess(child) {
  if (!isProcessRunning(child)) {
    return;
  }

  child.kill("SIGTERM");
  const stopped = await waitForProcessExit(child, 3000);
  if (stopped || !isProcessRunning(child)) {
    return;
  }

  child.kill("SIGKILL");
  const killed = await waitForProcessExit(child, 3000);
  if (!killed && isProcessRunning(child)) {
    throw new Error(`Auth security test server did not stop cleanly. pid=${child.pid}`);
  }
}

async function startServer(extraEnv = {}) {
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
      NODE_ENV: "test",
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
    try {
      await stopServerProcess(server);
    } finally {
      await fs.rm(tempDataDir, { recursive: true, force: true });
    }
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

async function assertOk(baseUrl, pathname, options = {}) {
  const { response, payload } = await requestJson(baseUrl, pathname, options);
  assert.equal(response.ok, true, payload?.error || `Expected ${pathname} to succeed.`);
  return payload;
}

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function login(baseUrl, body = {}, extraHeaders = {}) {
  return requestJson(baseUrl, "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...extraHeaders },
    body: JSON.stringify({
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
      ...body,
    }),
  });
}

test("trusted proxy mode scopes login rate limits to forwarded client IP", async () => {
  const fixture = await startServer({ TRUST_PROXY_HOPS: "1" });

  try {
    const blockedIpHeaders = { "X-Forwarded-For": "203.0.113.10" };
    const otherIpHeaders = { "X-Forwarded-For": "203.0.113.11" };

    for (let attempt = 0; attempt < 6; attempt += 1) {
      const { response, payload } = await login(fixture.baseUrl, {
        password: `forwarded-wrong-${attempt}`,
      }, blockedIpHeaders);
      assert.equal(response.status, 401);
      assert.match(payload.error, /invalid email or password/i);
    }

    const limited = await login(fixture.baseUrl, {
      password: "forwarded-wrong-final",
    }, blockedIpHeaders);
    assert.equal(limited.response.status, 429);
    assert.match(limited.payload.error, /too many login attempts/i);

    const otherIpLogin = await login(fixture.baseUrl, {}, otherIpHeaders);
    assert.equal(otherIpLogin.response.status, 200);
    assert.ok(otherIpLogin.payload.token);
  } finally {
    await fixture.stop();
  }
});

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

    const loggedOutBootstrap = await requestJson(fixture.baseUrl, "/api/bootstrap", {
      headers: authHeaders(firstLogin.payload.token),
    });
    assert.equal(loggedOutBootstrap.response.status, 401);

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

test("password reset request is generic and reset completion is single-use", async () => {
  const fixture = await startServer();

  try {
    insertUser(fixture.sqliteFile, createUserRecord({
      id: "U-AUTH-RESET",
      email: "auth-reset@apexhq.test",
      password: "oldpass123",
      name: "Auth Reset",
      role: "Administrator",
    }));

    const existingSession = await login(fixture.baseUrl, {
      email: "auth-reset@apexhq.test",
      password: "oldpass123",
    });
    assert.equal(existingSession.response.status, 200);
    assert.ok(existingSession.payload.token);

    const missing = await assertOk(fixture.baseUrl, "/api/auth/password-reset/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "missing-reset@apexhq.test" }),
    });
    assert.match(missing.message, /if that email has access/i);
    assert.equal(missing.resetToken, undefined);

    const requested = await assertOk(fixture.baseUrl, "/api/auth/password-reset/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "auth-reset@apexhq.test" }),
    });
    assert.match(requested.message, /if that email has access/i);
    assert.ok(requested.resetToken);
    assert.match(requested.resetUrl || "", /^\/reset-password\?token=/);

    const completed = await assertOk(fixture.baseUrl, "/api/auth/password-reset/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: requested.resetToken,
        password: "newpass123",
      }),
    });
    assert.ok(completed.token);
    assert.equal(completed.user.email, "auth-reset@apexhq.test");

    const afterResetDatabase = new DatabaseSync(fixture.sqliteFile);
    try {
      const resetRow = afterResetDatabase.prepare(`
        SELECT reset_token_hash AS resetTokenHash, reset_expires_at AS resetExpiresAt
        FROM users
        WHERE email = ?
      `).get("auth-reset@apexhq.test");
      assert.equal(resetRow.resetTokenHash || "", "");
      assert.equal(resetRow.resetExpiresAt || "", "");
    } finally {
      afterResetDatabase.close();
    }

    const revokedBootstrap = await requestJson(fixture.baseUrl, "/api/bootstrap", {
      headers: authHeaders(existingSession.payload.token),
    });
    assert.equal(revokedBootstrap.response.status, 401);

    const reused = await requestJson(fixture.baseUrl, "/api/auth/password-reset/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: requested.resetToken,
        password: "newpass123",
      }),
    });
    assert.equal(reused.response.status, 400);

    const oldLogin = await login(fixture.baseUrl, {
      email: "auth-reset@apexhq.test",
      password: "oldpass123",
    });
    assert.equal(oldLogin.response.status, 401);

    const newLogin = await login(fixture.baseUrl, {
      email: "auth-reset@apexhq.test",
      password: "newpass123",
    });
    assert.equal(newLogin.response.status, 200);
    assert.ok(newLogin.payload.token);
  } finally {
    await fixture.stop();
  }
});

test("password reset request revokes pending invite credentials", async () => {
  const fixture = await startServer();

  try {
    insertUser(fixture.sqliteFile, createUserRecord({
      id: "U-AUTH-RESET-INVITE",
      email: "auth-reset-invite@apexhq.test",
      password: "oldpass123",
      name: "Auth Reset Invite",
      role: "Foreman",
      mustSetPassword: true,
    }));

    const database = new DatabaseSync(fixture.sqliteFile);
    try {
      database.prepare(`
        UPDATE users
        SET invite_token_hash = ?, invite_expires_at = ?, must_set_password = 1
        WHERE email = ?
      `).run("pending-invite-token-hash", "2099-01-01T00:00:00.000Z", "auth-reset-invite@apexhq.test");
    } finally {
      database.close();
    }

    const requested = await assertOk(fixture.baseUrl, "/api/auth/password-reset/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "auth-reset-invite@apexhq.test" }),
    });
    assert.match(requested.message, /if that email has access/i);
    assert.ok(requested.resetToken);

    const afterRequestDatabase = new DatabaseSync(fixture.sqliteFile);
    try {
      const row = afterRequestDatabase.prepare(`
        SELECT
          invite_token_hash AS inviteTokenHash,
          invite_expires_at AS inviteExpiresAt,
          reset_token_hash AS resetTokenHash
        FROM users
        WHERE email = ?
      `).get("auth-reset-invite@apexhq.test");
      assert.equal(row.inviteTokenHash || "", "");
      assert.equal(row.inviteExpiresAt || "", "");
      assert.notEqual(row.resetTokenHash || "", "");
    } finally {
      afterRequestDatabase.close();
    }
  } finally {
    await fixture.stop();
  }
});

test("password reset completion rejects expired tokens without changing the password", async () => {
  const fixture = await startServer();

  try {
    insertUser(fixture.sqliteFile, createUserRecord({
      id: "U-AUTH-RESET-EXPIRED",
      email: "auth-reset-expired@apexhq.test",
      password: "oldpass123",
      name: "Auth Reset Expired",
      role: "Administrator",
    }));

    const requested = await assertOk(fixture.baseUrl, "/api/auth/password-reset/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "auth-reset-expired@apexhq.test" }),
    });
    assert.ok(requested.resetToken);

    const database = new DatabaseSync(fixture.sqliteFile);
    try {
      database.prepare("UPDATE users SET reset_expires_at = ? WHERE email = ?").run("2020-01-01T00:00:00.000Z", "auth-reset-expired@apexhq.test");
    } finally {
      database.close();
    }

    const expired = await requestJson(fixture.baseUrl, "/api/auth/password-reset/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: requested.resetToken,
        password: "newpass123",
      }),
    });
    assert.equal(expired.response.status, 400);

    const oldLogin = await login(fixture.baseUrl, {
      email: "auth-reset-expired@apexhq.test",
      password: "oldpass123",
    });
    assert.equal(oldLogin.response.status, 200);
  } finally {
    await fixture.stop();
  }
});

test("inactive users cannot receive or complete password resets", async () => {
  const fixture = await startServer();

  try {
    insertUser(fixture.sqliteFile, createUserRecord({
      id: "U-AUTH-RESET-INACTIVE",
      email: "auth-reset-inactive@apexhq.test",
      password: "oldpass123",
      name: "Auth Reset Inactive",
      role: "Employee",
      status: "inactive",
    }));
    insertUser(fixture.sqliteFile, createUserRecord({
      id: "U-AUTH-RESET-DEACTIVATED",
      email: "auth-reset-deactivated@apexhq.test",
      password: "oldpass123",
      name: "Auth Reset Deactivated",
      role: "Employee",
    }));

    const inactiveRequested = await assertOk(fixture.baseUrl, "/api/auth/password-reset/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "auth-reset-inactive@apexhq.test" }),
    });
    assert.match(inactiveRequested.message, /if that email has access/i);
    assert.equal(inactiveRequested.resetToken, undefined);

    const database = new DatabaseSync(fixture.sqliteFile);
    try {
      const inactiveRow = database.prepare("SELECT reset_token_hash AS resetTokenHash FROM users WHERE email = ?").get("auth-reset-inactive@apexhq.test");
      assert.equal(inactiveRow.resetTokenHash || "", "");
    } finally {
      database.close();
    }

    const requested = await assertOk(fixture.baseUrl, "/api/auth/password-reset/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "auth-reset-deactivated@apexhq.test" }),
    });
    assert.ok(requested.resetToken);

    const deactivationDb = new DatabaseSync(fixture.sqliteFile);
    try {
      deactivationDb.prepare("UPDATE users SET status = ? WHERE email = ?").run("inactive", "auth-reset-deactivated@apexhq.test");
    } finally {
      deactivationDb.close();
    }

    const completed = await requestJson(fixture.baseUrl, "/api/auth/password-reset/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: requested.resetToken,
        password: "newpass123",
      }),
    });
    assert.equal(completed.response.status, 403);
    assert.equal(completed.payload.token, undefined);

    const deactivatedLogin = await login(fixture.baseUrl, {
      email: "auth-reset-deactivated@apexhq.test",
      password: "newpass123",
    });
    assert.equal(deactivatedLogin.response.status, 401);
  } finally {
    await fixture.stop();
  }
});

test("password reset request rate limit blocks repeated requests for the same email", async () => {
  const fixture = await startServer();

  try {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const request = await requestJson(fixture.baseUrl, "/api/auth/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "reset-limit@apexhq.test" }),
      });
      assert.equal(request.response.status, 200);
      assert.match(request.payload.message, /if that email has access/i);
    }

    const limited = await requestJson(fixture.baseUrl, "/api/auth/password-reset/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "reset-limit@apexhq.test" }),
    });
    assert.equal(limited.response.status, 429);
    assert.match(limited.payload.error, /too many password reset requests/i);
  } finally {
    await fixture.stop();
  }
});

test("token endpoints rate limit repeated invalid activation and reset attempts", async () => {
  const fixture = await startServer();

  try {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const resetAttempt = await requestJson(fixture.baseUrl, "/api/auth/password-reset/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: `bad-reset-token-${attempt}`,
          password: "validpass123",
        }),
      });
      assert.equal(resetAttempt.response.status, 400);
    }

    const limitedReset = await requestJson(fixture.baseUrl, "/api/auth/password-reset/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: "bad-reset-token-final",
        password: "validpass123",
      }),
    });
    assert.equal(limitedReset.response.status, 429);
    assert.match(limitedReset.payload.error, /too many token attempts/i);

    for (let attempt = 0; attempt < 12; attempt += 1) {
      const inviteAttempt = await requestJson(fixture.baseUrl, "/api/auth/activate-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: `bad-invite-token-${attempt}`,
          password: "validpass123",
        }),
      });
      assert.equal(inviteAttempt.response.status, 400);
    }

    const limitedInvite = await requestJson(fixture.baseUrl, "/api/auth/activate-invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: "bad-invite-token-final",
        password: "validpass123",
      }),
    });
    assert.equal(limitedInvite.response.status, 429);
    assert.match(limitedInvite.payload.error, /too many token attempts/i);
  } finally {
    await fixture.stop();
  }
});
