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
  return 7200 + Math.floor(Math.random() * 1000);
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

  throw new Error(`Users management test server did not become ready.\n${serverOutput()}`);
}

async function startServer() {
  const tempDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "concrete-ops-users-"));
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
    stop,
    serverOutput: () => output,
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

function insertUsers(sqliteFile, users) {
  const database = new DatabaseSync(sqliteFile);
  try {
    const insertUser = database.prepare(`
      INSERT INTO users (id, email, name, role, phone, status, created_at, updated_at, last_login_at, password_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const user of users) {
      insertUser.run(
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
    }
  } finally {
    database.close();
  }
}

test("owner and admin can create role-based users and inactive users cannot log in", async () => {
  const fixture = await startServer();

  try {
    insertUsers(fixture.sqliteFile, [
      createUserRecord({
        id: "U-OWNER-USERS",
        email: "owner-users@lastyard.test",
        password: "apexdemo123",
        name: "Owner Users",
        role: "Owner",
      }),
      createUserRecord({
        id: "U-ADMIN-USERS",
        email: "admin-users@lastyard.test",
        password: "apexdemo123",
        name: "Admin Users",
        role: "Administrator",
      }),
    ]);

    const ownerLogin = await login(fixture.baseUrl, {
      email: "owner-users@lastyard.test",
      password: "apexdemo123",
    });

    const createForeman = await assertOk(fixture.baseUrl, "/api/users", {
      method: "POST",
      headers: authHeaders(ownerLogin.token),
      body: JSON.stringify({
        name: "Freya Foreman",
        email: "freya@lastyard.test",
        phone: "503-555-0100",
        role: "Foreman",
      }),
    });

    const foremanUser = createForeman.users.find((user) => user.email === "freya@lastyard.test");
    assert.ok(foremanUser);
    assert.equal(foremanUser.role, "Foreman");
    assert.equal(foremanUser.status, "active");
    assert.ok(createForeman.provisionedUser?.temporaryPassword);

    const adminLogin = await login(fixture.baseUrl, {
      email: "admin-users@lastyard.test",
      password: "apexdemo123",
    });

    const createEmployee = await assertOk(fixture.baseUrl, "/api/users", {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify({
        name: "Evan Employee",
        email: "evan@lastyard.test",
        phone: "503-555-0101",
        role: "Employee",
        password: "crewlogin123",
      }),
    });

    const employeeUser = createEmployee.users.find((user) => user.email === "evan@lastyard.test");
    assert.ok(employeeUser);
    assert.equal(employeeUser.role, "Employee");
    assert.equal(createEmployee.provisionedUser?.temporaryPassword, null);

    const employeeLogin = await assertOk(fixture.baseUrl, "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "evan@lastyard.test",
        password: "crewlogin123",
      }),
    });
    assert.ok(employeeLogin.token);

    const deactivateEmployee = await assertOk(fixture.baseUrl, `/api/users/${employeeUser.id}`, {
      method: "PATCH",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify({
        status: "inactive",
      }),
    });
    const inactiveUser = deactivateEmployee.users.find((user) => user.id === employeeUser.id);
    assert.equal(inactiveUser.status, "inactive");

    const inactiveLogin = await requestJson(fixture.baseUrl, "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "evan@lastyard.test",
        password: "crewlogin123",
      }),
    });
    assert.equal(inactiveLogin.response.status, 403);
  } finally {
    await fixture.stop();
  }
});

test("only active owners can assign or manage owner access", async () => {
  const fixture = await startServer();

  try {
    insertUsers(fixture.sqliteFile, [
      createUserRecord({
        id: "U-OWNER-GUARD",
        email: "owner-guard@lastyard.test",
        password: "apexdemo123",
        name: "Owner Guard",
        role: "Owner",
      }),
      createUserRecord({
        id: "U-ADMIN-GUARD",
        email: "admin-guard@lastyard.test",
        password: "apexdemo123",
        name: "Admin Guard",
        role: "Administrator",
      }),
    ]);

    const adminLogin = await login(fixture.baseUrl, {
      email: "admin-guard@lastyard.test",
      password: "apexdemo123",
    });

    const blockedOwnerCreate = await requestJson(fixture.baseUrl, "/api/users", {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify({
        name: "Promoted Owner",
        email: "promoted-owner@lastyard.test",
        role: "Owner",
      }),
    });
    assert.equal(blockedOwnerCreate.response.status, 403);

    const blockedOwnerPatch = await requestJson(fixture.baseUrl, "/api/users/U-OWNER-GUARD", {
      method: "PATCH",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify({
        status: "inactive",
      }),
    });
    assert.equal(blockedOwnerPatch.response.status, 403);

    const blockedRoleEscalation = await requestJson(fixture.baseUrl, "/api/users/U-ADMIN-GUARD", {
      method: "PATCH",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify({
        role: "Owner",
      }),
    });
    assert.equal(blockedRoleEscalation.response.status, 403);

    const ownerLogin = await login(fixture.baseUrl, {
      email: "owner-guard@lastyard.test",
      password: "apexdemo123",
    });

    const ownerCreated = await assertOk(fixture.baseUrl, "/api/users", {
      method: "POST",
      headers: authHeaders(ownerLogin.token),
      body: JSON.stringify({
        name: "Second Owner",
        email: "second-owner@lastyard.test",
        role: "Owner",
        password: "apexdemo123",
      }),
    });
    assert.equal(ownerCreated.users.find((user) => user.email === "second-owner@lastyard.test")?.role, "Owner");
  } finally {
    await fixture.stop();
  }
});

test("explicit user passwords must meet the public SaaS password policy", async () => {
  const fixture = await startServer();

  try {
    insertUsers(fixture.sqliteFile, [
      createUserRecord({
        id: "U-OWNER-PASSWORD-POLICY",
        email: "owner-password-policy@lastyard.test",
        password: "apexdemo123",
        name: "Owner Password Policy",
        role: "Owner",
      }),
    ]);

    const ownerLogin = await login(fixture.baseUrl, {
      email: "owner-password-policy@lastyard.test",
      password: "apexdemo123",
    });

    const weakCreate = await requestJson(fixture.baseUrl, "/api/users", {
      method: "POST",
      headers: authHeaders(ownerLogin.token),
      body: JSON.stringify({
        name: "Weak Password Employee",
        email: "weak-employee@lastyard.test",
        role: "Employee",
        password: "crewonly",
      }),
    });
    assert.equal(weakCreate.response.status, 400);
    assert.match(weakCreate.payload.error, /at least 10 characters|letter and one number/i);

    const database = new DatabaseSync(fixture.sqliteFile);
    try {
      const matchingUsers = database.prepare("SELECT COUNT(*) AS count FROM users WHERE email = ?").get("weak-employee@lastyard.test");
      assert.equal(matchingUsers.count, 0);
    } finally {
      database.close();
    }
  } finally {
    await fixture.stop();
  }
});

test("employee, foreman, and estimator cannot access user management while operations manager can", async () => {
  const fixture = await startServer();

  try {
    insertUsers(fixture.sqliteFile, [
      createUserRecord({
        id: "U-OPS-USERS",
        email: "ops-users@lastyard.test",
        password: "apexdemo123",
        name: "Ops Users",
        role: "Operations Manager",
      }),
      createUserRecord({
        id: "U-EST-USERS",
        email: "est-users@lastyard.test",
        password: "apexdemo123",
        name: "Estimator Users",
        role: "Estimator",
      }),
      createUserRecord({
        id: "U-FOREMAN-USERS",
        email: "foreman-users@lastyard.test",
        password: "apexdemo123",
        name: "Foreman Users",
        role: "Foreman",
      }),
      createUserRecord({
        id: "U-EMP-USERS",
        email: "employee-users@lastyard.test",
        password: "apexdemo123",
        name: "Employee Users",
        role: "Employee",
      }),
    ]);

    const opsLogin = await login(fixture.baseUrl, {
      email: "ops-users@lastyard.test",
      password: "apexdemo123",
    });
    const opsBootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", {
      headers: authHeaders(opsLogin.token),
    });
    assert.equal(opsBootstrap.permissions.users.canManage, true);
    const opsUsers = await assertOk(fixture.baseUrl, "/api/users", {
      headers: authHeaders(opsLogin.token),
    });
    assert.ok(Array.isArray(opsUsers.users));

    for (const credentials of [
      { email: "est-users@lastyard.test", password: "apexdemo123" },
      { email: "foreman-users@lastyard.test", password: "apexdemo123" },
      { email: "employee-users@lastyard.test", password: "apexdemo123" },
    ]) {
      const session = await login(fixture.baseUrl, credentials);
      const denied = await requestJson(fixture.baseUrl, "/api/users", {
        headers: authHeaders(session.token),
      });
      assert.equal(denied.response.status, 403);
    }
  } finally {
    await fixture.stop();
  }
});
