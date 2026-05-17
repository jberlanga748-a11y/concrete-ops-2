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

async function activateInvite(baseUrl, payload) {
  return assertOk(baseUrl, "/api/auth/activate-invite", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

const AUTH_SECRET_FIELDS = new Set([
  "passwordHash",
  "inviteTokenHash",
  "resetTokenHash",
  "activationToken",
  "activationUrl",
  "resetToken",
  "resetUrl",
  "temporaryPassword",
]);

function assertNoAuthSecretFields(value, label = "payload") {
  const leaks = [];

  function visit(entry, pathName) {
    if (!entry || typeof entry !== "object") return;
    if (Array.isArray(entry)) {
      entry.forEach((item, index) => visit(item, `${pathName}[${index}]`));
      return;
    }

    for (const [key, child] of Object.entries(entry)) {
      const childPath = `${pathName}.${key}`;
      if (AUTH_SECRET_FIELDS.has(key)) {
        leaks.push(childPath);
      }
      visit(child, childPath);
    }
  }

  visit(value, label);
  assert.deepEqual(leaks, []);
}

function assertSerializedPayloadExcludes(value, secrets, label = "payload") {
  const serialized = JSON.stringify(value);
  for (const secret of secrets.filter(Boolean)) {
    assert.equal(
      serialized.includes(secret),
      false,
      `${label} should not include provisioning secret ${secret}`,
    );
  }
}

function insertUsers(sqliteFile, users) {
  const database = new DatabaseSync(sqliteFile);
  try {
    const insertUser = database.prepare(`
      INSERT INTO users (id, email, name, role, phone, status, company_id, operator_access, created_at, updated_at, last_login_at, password_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const user of users) {
      insertUser.run(
        user.id,
        user.email,
        user.name,
        user.role,
        user.phone || "",
        user.status || "active",
        user.companyId || "COMPANY-DEFAULT",
        user.operatorAccess ? 1 : 0,
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

function insertCompany(sqliteFile, companyId, name) {
  const database = new DatabaseSync(sqliteFile);
  const now = new Date().toISOString();
  try {
    database.prepare(`
      INSERT OR IGNORE INTO companies (id, workspace_id, name, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(companyId, companyId, name, "active", now, now);
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
    assert.equal(createForeman.provisionedUser?.temporaryPassword, null);
    assert.ok(createForeman.provisionedUser?.activationToken);
    assert.match(createForeman.provisionedUser?.activationUrl || "", /^\/activate-invite\?token=/);
    assert.equal(foremanUser.mustSetPassword, true);
    assert.equal(foremanUser.inviteStatus, "pending");

    const beforeActivationDatabase = new DatabaseSync(fixture.sqliteFile);
    try {
      beforeActivationDatabase.prepare(`
        UPDATE users
        SET reset_token_hash = ?, reset_requested_at = ?, reset_expires_at = ?, reset_used_at = ?
        WHERE email = ?
      `).run(
        "stale-reset-token-hash",
        "2026-01-01T00:00:00.000Z",
        "2026-01-02T00:00:00.000Z",
        "2026-01-03T00:00:00.000Z",
        "freya@lastyard.test",
      );
    } finally {
      beforeActivationDatabase.close();
    }

    const foremanActivation = await activateInvite(fixture.baseUrl, {
      token: createForeman.provisionedUser.activationToken,
      password: "foremanpass123",
    });
    assert.ok(foremanActivation.token);
    assert.equal(foremanActivation.user.email, "freya@lastyard.test");

    const afterActivationDatabase = new DatabaseSync(fixture.sqliteFile);
    try {
      const activatedRow = afterActivationDatabase.prepare(`
        SELECT
          invite_token_hash AS inviteTokenHash,
          invite_expires_at AS inviteExpiresAt,
          reset_token_hash AS resetTokenHash,
          reset_requested_at AS resetRequestedAt,
          reset_expires_at AS resetExpiresAt,
          reset_used_at AS resetUsedAt
        FROM users
        WHERE email = ?
      `).get("freya@lastyard.test");
      assert.equal(activatedRow.inviteTokenHash || "", "");
      assert.equal(activatedRow.inviteExpiresAt || "", "");
      assert.equal(activatedRow.resetTokenHash || "", "");
      assert.equal(activatedRow.resetRequestedAt || "", "");
      assert.equal(activatedRow.resetExpiresAt || "", "");
      assert.equal(activatedRow.resetUsedAt || "", "");
    } finally {
      afterActivationDatabase.close();
    }

    const reusedInvite = await requestJson(fixture.baseUrl, "/api/auth/activate-invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: createForeman.provisionedUser.activationToken,
        password: "foremanpass123",
      }),
    });
    assert.equal(reusedInvite.response.status, 400);

    const foremanLogin = await login(fixture.baseUrl, {
      email: "freya@lastyard.test",
      password: "foremanpass123",
    });
    assert.ok(foremanLogin.token);

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
    assert.equal(createEmployee.provisionedUser?.activationToken, null);

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

    const inactiveBootstrap = await requestJson(fixture.baseUrl, "/api/bootstrap", {
      headers: authHeaders(employeeLogin.token),
    });
    assert.equal(inactiveBootstrap.response.status, 401);
  } finally {
    await fixture.stop();
  }
});

test("owners can reissue pending activation invites without exposing field access", async () => {
  const fixture = await startServer();

  try {
    insertUsers(fixture.sqliteFile, [
      createUserRecord({
        id: "U-OWNER-REISSUE",
        email: "owner-reissue@lastyard.test",
        password: "apexdemo123",
        name: "Owner Reissue",
        role: "Owner",
      }),
    ]);

    const ownerLogin = await login(fixture.baseUrl, {
      email: "owner-reissue@lastyard.test",
      password: "apexdemo123",
    });

    const createdInvite = await assertOk(fixture.baseUrl, "/api/users", {
      method: "POST",
      headers: authHeaders(ownerLogin.token),
      body: JSON.stringify({
        name: "Riley Reissue",
        email: "riley-reissue@lastyard.test",
        role: "Foreman",
      }),
    });
    const invitedUser = createdInvite.users.find((user) => user.email === "riley-reissue@lastyard.test");
    assert.ok(invitedUser);
    assert.ok(createdInvite.provisionedUser?.activationToken);

    const expiredDatabase = new DatabaseSync(fixture.sqliteFile);
    try {
      expiredDatabase.prepare(`
        UPDATE users
        SET invite_expires_at = ?, reset_token_hash = ?, reset_requested_at = ?, reset_expires_at = ?
        WHERE id = ?
      `).run("2020-01-01T00:00:00.000Z", "stale-reset-token-hash", "2026-01-01T00:00:00.000Z", "2026-01-02T00:00:00.000Z", invitedUser.id);
    } finally {
      expiredDatabase.close();
    }

    const reissuedInvite = await assertOk(fixture.baseUrl, `/api/users/${invitedUser.id}/invite`, {
      method: "POST",
      headers: authHeaders(ownerLogin.token),
    });
    assert.equal(reissuedInvite.provisionedUser?.email, "riley-reissue@lastyard.test");
    assert.equal(reissuedInvite.provisionedUser?.provisioningMode, "invite");
    assert.ok(reissuedInvite.provisionedUser?.activationToken);
    assert.notEqual(reissuedInvite.provisionedUser.activationToken, createdInvite.provisionedUser.activationToken);
    assert.match(reissuedInvite.provisionedUser?.activationUrl || "", /^\/activate-invite\?token=/);
    const reissuedUser = reissuedInvite.users.find((user) => user.id === invitedUser.id);
    assert.equal(reissuedUser.inviteStatus, "pending");
    assert.equal(reissuedUser.mustSetPassword, true);

    const staleActivation = await requestJson(fixture.baseUrl, "/api/auth/activate-invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: createdInvite.provisionedUser.activationToken,
        password: "foremanpass123",
      }),
    });
    assert.equal(staleActivation.response.status, 400);

    const activated = await activateInvite(fixture.baseUrl, {
      token: reissuedInvite.provisionedUser.activationToken,
      password: "foremanpass123",
    });
    assert.ok(activated.token);
    assert.equal(activated.user.email, "riley-reissue@lastyard.test");

    const fieldReissue = await requestJson(fixture.baseUrl, `/api/users/${invitedUser.id}/invite`, {
      method: "POST",
      headers: authHeaders(activated.token),
    });
    assert.equal(fieldReissue.response.status, 403);

    const activatedReissue = await requestJson(fixture.baseUrl, `/api/users/${invitedUser.id}/invite`, {
      method: "POST",
      headers: authHeaders(ownerLogin.token),
    });
    assert.equal(activatedReissue.response.status, 409);
    assert.match(activatedReissue.payload.error, /already activated/i);
  } finally {
    await fixture.stop();
  }
});

test("user management and bootstrap payloads do not expose auth hashes or provisioning secrets", async () => {
  const fixture = await startServer();

  try {
    insertUsers(fixture.sqliteFile, [
      createUserRecord({
        id: "U-OWNER-AUTH-SECRETS",
        email: "owner-auth-secrets@lastyard.test",
        password: "apexdemo123",
        name: "Owner Auth Secrets",
        role: "Owner",
      }),
    ]);

    const ownerLogin = await login(fixture.baseUrl, {
      email: "owner-auth-secrets@lastyard.test",
      password: "apexdemo123",
    });

    const inviteCreated = await assertOk(fixture.baseUrl, "/api/users", {
      method: "POST",
      headers: authHeaders(ownerLogin.token),
      body: JSON.stringify({
        name: "Invite Only Foreman",
        email: "invite-only-foreman@lastyard.test",
        role: "Foreman",
      }),
    });
    const activationToken = inviteCreated.provisionedUser?.activationToken;
    assert.ok(activationToken);
    assert.match(inviteCreated.provisionedUser?.activationUrl || "", /^\/activate-invite\?token=/);
    assertNoAuthSecretFields({ users: inviteCreated.users }, "create invite users");
    assertSerializedPayloadExcludes({ users: inviteCreated.users }, [activationToken], "create invite users");

    const temporaryCreated = await assertOk(fixture.baseUrl, "/api/users", {
      method: "POST",
      headers: authHeaders(ownerLogin.token),
      body: JSON.stringify({
        name: "Temporary Password Employee",
        email: "temporary-password-employee@lastyard.test",
        role: "Employee",
        provisioningMode: "temporary_password",
      }),
    });
    const temporaryPassword = temporaryCreated.provisionedUser?.temporaryPassword;
    assert.ok(temporaryPassword);
    assertNoAuthSecretFields({ users: temporaryCreated.users }, "create temporary users");
    assertSerializedPayloadExcludes({ users: temporaryCreated.users }, [activationToken, temporaryPassword], "create temporary users");

    const usersPayload = await assertOk(fixture.baseUrl, "/api/users", {
      headers: authHeaders(ownerLogin.token),
    });
    assertNoAuthSecretFields(usersPayload, "owner users payload");
    assertSerializedPayloadExcludes(usersPayload, [activationToken, temporaryPassword], "owner users payload");

    const ownerBootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", {
      headers: authHeaders(ownerLogin.token),
    });
    assertNoAuthSecretFields(ownerBootstrap, "owner bootstrap");
    assertSerializedPayloadExcludes(ownerBootstrap, [activationToken, temporaryPassword], "owner bootstrap");

    const employeeLogin = await login(fixture.baseUrl, {
      email: "temporary-password-employee@lastyard.test",
      password: temporaryPassword,
    });
    const employeeBootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", {
      headers: authHeaders(employeeLogin.token),
    });
    assertNoAuthSecretFields(employeeBootstrap, "employee bootstrap");
    assertSerializedPayloadExcludes(employeeBootstrap, [activationToken, temporaryPassword], "employee bootstrap");
    assert.deepEqual(employeeBootstrap.users.map((user) => user.email), ["temporary-password-employee@lastyard.test"]);
  } finally {
    await fixture.stop();
  }
});

test("audit and activity payloads do not expose provisioning or password secrets", async () => {
  const fixture = await startServer();

  try {
    insertUsers(fixture.sqliteFile, [
      createUserRecord({
        id: "U-OWNER-AUDIT-SECRETS",
        email: "owner-audit-secrets@lastyard.test",
        password: "apexdemo123",
        name: "Owner Audit Secrets",
        role: "Owner",
      }),
    ]);

    const ownerLogin = await login(fixture.baseUrl, {
      email: "owner-audit-secrets@lastyard.test",
      password: "apexdemo123",
    });

    const inviteCreated = await assertOk(fixture.baseUrl, "/api/users", {
      method: "POST",
      headers: authHeaders(ownerLogin.token),
      body: JSON.stringify({
        name: "Audit Invite Foreman",
        email: "audit-invite-foreman@lastyard.test",
        role: "Foreman",
      }),
    });
    const activationToken = inviteCreated.provisionedUser?.activationToken;
    assert.ok(activationToken);

    const temporaryCreated = await assertOk(fixture.baseUrl, "/api/users", {
      method: "POST",
      headers: authHeaders(ownerLogin.token),
      body: JSON.stringify({
        name: "Audit Temporary Employee",
        email: "audit-temporary-employee@lastyard.test",
        role: "Employee",
        provisioningMode: "temporary_password",
      }),
    });
    const temporaryPassword = temporaryCreated.provisionedUser?.temporaryPassword;
    const temporaryUser = temporaryCreated.users.find((user) => user.email === "audit-temporary-employee@lastyard.test");
    assert.ok(temporaryPassword);
    assert.ok(temporaryUser);

    const replacementPassword = "newfield123";
    await assertOk(fixture.baseUrl, `/api/users/${temporaryUser.id}`, {
      method: "PATCH",
      headers: authHeaders(ownerLogin.token),
      body: JSON.stringify({
        password: replacementPassword,
      }),
    });

    const ownerBootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", {
      headers: authHeaders(ownerLogin.token),
    });
    const operationalHistory = {
      activity: ownerBootstrap.activity,
      auditEvents: ownerBootstrap.auditEvents,
    };
    assertNoAuthSecretFields(operationalHistory, "operational history");
    assertSerializedPayloadExcludes(
      operationalHistory,
      [activationToken, temporaryPassword, replacementPassword],
      "operational history",
    );
  } finally {
    await fixture.stop();
  }
});

test("deactivating users revokes pending invite and password reset credentials", async () => {
  const fixture = await startServer();

  try {
    insertUsers(fixture.sqliteFile, [
      createUserRecord({
        id: "U-OWNER-DEACTIVATE-TOKENS",
        email: "owner-deactivate-tokens@lastyard.test",
        password: "apexdemo123",
        name: "Owner Deactivate Tokens",
        role: "Owner",
      }),
    ]);

    const ownerLogin = await login(fixture.baseUrl, {
      email: "owner-deactivate-tokens@lastyard.test",
      password: "apexdemo123",
    });
    const headers = authHeaders(ownerLogin.token);

    const inviteCreated = await assertOk(fixture.baseUrl, "/api/users", {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: "Invite Token Revoked",
        email: "invite-token-revoked@lastyard.test",
        role: "Employee",
      }),
    });
    const inviteToken = inviteCreated.provisionedUser?.activationToken;
    const inviteUser = inviteCreated.users.find((user) => user.email === "invite-token-revoked@lastyard.test");
    assert.ok(inviteToken);
    assert.ok(inviteUser);

    const resetCreated = await assertOk(fixture.baseUrl, "/api/users", {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: "Reset Token Revoked",
        email: "reset-token-revoked@lastyard.test",
        role: "Employee",
        password: "oldfield123",
      }),
    });
    const resetUser = resetCreated.users.find((user) => user.email === "reset-token-revoked@lastyard.test");
    assert.ok(resetUser);

    await assertOk(fixture.baseUrl, "/api/auth/password-reset/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "reset-token-revoked@lastyard.test" }),
    });

    const beforeDeactivate = new DatabaseSync(fixture.sqliteFile);
    try {
      const inviteRow = beforeDeactivate.prepare("SELECT invite_token_hash AS inviteTokenHash FROM users WHERE email = ?").get("invite-token-revoked@lastyard.test");
      const resetRow = beforeDeactivate.prepare("SELECT reset_token_hash AS resetTokenHash FROM users WHERE email = ?").get("reset-token-revoked@lastyard.test");
      assert.notEqual(inviteRow.inviteTokenHash || "", "");
      assert.notEqual(resetRow.resetTokenHash || "", "");
    } finally {
      beforeDeactivate.close();
    }

    await assertOk(fixture.baseUrl, `/api/users/${inviteUser.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ status: "inactive" }),
    });
    await assertOk(fixture.baseUrl, `/api/users/${resetUser.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ status: "inactive" }),
    });

    const afterDeactivate = new DatabaseSync(fixture.sqliteFile);
    try {
      const inviteRow = afterDeactivate.prepare(`
        SELECT invite_token_hash AS inviteTokenHash, invite_expires_at AS inviteExpiresAt
        FROM users
        WHERE email = ?
      `).get("invite-token-revoked@lastyard.test");
      const resetRow = afterDeactivate.prepare(`
        SELECT reset_token_hash AS resetTokenHash, reset_expires_at AS resetExpiresAt
        FROM users
        WHERE email = ?
      `).get("reset-token-revoked@lastyard.test");
      assert.equal(inviteRow.inviteTokenHash || "", "");
      assert.equal(inviteRow.inviteExpiresAt || "", "");
      assert.equal(resetRow.resetTokenHash || "", "");
      assert.equal(resetRow.resetExpiresAt || "", "");
    } finally {
      afterDeactivate.close();
    }

    const inactiveActivation = await requestJson(fixture.baseUrl, "/api/auth/activate-invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: inviteToken,
        password: "validpass123",
      }),
    });
    assert.equal(inactiveActivation.response.status, 400);

    await assertOk(fixture.baseUrl, `/api/users/${inviteUser.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ status: "active" }),
    });
    await assertOk(fixture.baseUrl, `/api/users/${resetUser.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ status: "active" }),
    });

    const reactivatedActivation = await requestJson(fixture.baseUrl, "/api/auth/activate-invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: inviteToken,
        password: "validpass123",
      }),
    });
    assert.equal(reactivatedActivation.response.status, 400);
  } finally {
    await fixture.stop();
  }
});

test("user password updates revoke existing sessions and require the new password", async () => {
  const fixture = await startServer();

  try {
    insertUsers(fixture.sqliteFile, [
      createUserRecord({
        id: "U-OWNER-PASSWORD-UPDATE",
        email: "owner-password-update@lastyard.test",
        password: "apexdemo123",
        name: "Owner Password Update",
        role: "Owner",
      }),
      createUserRecord({
        id: "U-EMPLOYEE-PASSWORD-UPDATE",
        email: "employee-password-update@lastyard.test",
        password: "oldfield123",
        name: "Employee Password Update",
        role: "Employee",
        inviteTokenHash: "stale-invite-token-hash",
        inviteExpiresAt: "2099-01-01T00:00:00.000Z",
        resetTokenHash: "stale-reset-token-hash",
        resetExpiresAt: "2099-01-01T00:00:00.000Z",
      }),
    ]);

    const ownerLogin = await login(fixture.baseUrl, {
      email: "owner-password-update@lastyard.test",
      password: "apexdemo123",
    });
    const employeeLogin = await login(fixture.baseUrl, {
      email: "employee-password-update@lastyard.test",
      password: "oldfield123",
    });
    assert.ok(employeeLogin.token);

    const updated = await assertOk(fixture.baseUrl, "/api/users/U-EMPLOYEE-PASSWORD-UPDATE", {
      method: "PATCH",
      headers: authHeaders(ownerLogin.token),
      body: JSON.stringify({
        password: "newfield123",
      }),
    });
    assert.equal(updated.users.find((user) => user.id === "U-EMPLOYEE-PASSWORD-UPDATE")?.mustSetPassword, false);

    const database = new DatabaseSync(fixture.sqliteFile);
    try {
      const row = database.prepare(`
        SELECT
          invite_token_hash AS inviteTokenHash,
          invite_expires_at AS inviteExpiresAt,
          reset_token_hash AS resetTokenHash,
          reset_expires_at AS resetExpiresAt
        FROM users
        WHERE id = ?
      `).get("U-EMPLOYEE-PASSWORD-UPDATE");
      assert.equal(row.inviteTokenHash || "", "");
      assert.equal(row.inviteExpiresAt || "", "");
      assert.equal(row.resetTokenHash || "", "");
      assert.equal(row.resetExpiresAt || "", "");
    } finally {
      database.close();
    }

    const oldTokenBootstrap = await requestJson(fixture.baseUrl, "/api/bootstrap", {
      headers: authHeaders(employeeLogin.token),
    });
    assert.equal(oldTokenBootstrap.response.status, 401);

    const oldPasswordLogin = await requestJson(fixture.baseUrl, "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "employee-password-update@lastyard.test",
        password: "oldfield123",
      }),
    });
    assert.equal(oldPasswordLogin.response.status, 401);

    const newPasswordLogin = await login(fixture.baseUrl, {
      email: "employee-password-update@lastyard.test",
      password: "newfield123",
    });
    assert.ok(newPasswordLogin.token);
  } finally {
    await fixture.stop();
  }
});

test("role changes take effect for existing sessions on the next request", async () => {
  const fixture = await startServer();

  try {
    insertUsers(fixture.sqliteFile, [
      createUserRecord({
        id: "U-OWNER-ROLE-SESSION",
        email: "owner-role-session@lastyard.test",
        password: "apexdemo123",
        name: "Owner Role Session",
        role: "Owner",
      }),
      createUserRecord({
        id: "U-ADMIN-ROLE-SESSION",
        email: "admin-role-session@lastyard.test",
        password: "apexdemo123",
        name: "Admin Role Session",
        role: "Administrator",
      }),
    ]);

    const ownerLogin = await login(fixture.baseUrl, {
      email: "owner-role-session@lastyard.test",
      password: "apexdemo123",
    });
    const adminLogin = await login(fixture.baseUrl, {
      email: "admin-role-session@lastyard.test",
      password: "apexdemo123",
    });

    const beforeChange = await assertOk(fixture.baseUrl, "/api/users", {
      headers: authHeaders(adminLogin.token),
    });
    assert.equal(beforeChange.users.some((user) => user.email === "owner-role-session@lastyard.test"), true);

    const downgraded = await assertOk(fixture.baseUrl, "/api/users/U-ADMIN-ROLE-SESSION", {
      method: "PATCH",
      headers: authHeaders(ownerLogin.token),
      body: JSON.stringify({
        role: "Employee",
      }),
    });
    assert.equal(downgraded.users.find((user) => user.id === "U-ADMIN-ROLE-SESSION")?.role, "Employee");

    const staleAdminUsersRequest = await requestJson(fixture.baseUrl, "/api/users", {
      headers: authHeaders(adminLogin.token),
    });
    assert.equal(staleAdminUsersRequest.response.status, 403);

    const afterChangeBootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", {
      headers: authHeaders(adminLogin.token),
    });
    assert.equal(afterChangeBootstrap.user.role, "Employee");
    assert.equal(afterChangeBootstrap.permissions.users.canView, false);
    assert.deepEqual(afterChangeBootstrap.users.map((user) => user.email), ["admin-role-session@lastyard.test"]);
  } finally {
    await fixture.stop();
  }
});

test("user management ignores operator and company-scope escalation fields", async () => {
  const fixture = await startServer();

  try {
    insertUsers(fixture.sqliteFile, [
      createUserRecord({
        id: "U-OWNER-SCOPE-ESCALATION",
        email: "owner-scope-escalation@lastyard.test",
        password: "apexdemo123",
        name: "Owner Scope Escalation",
        role: "Owner",
      }),
    ]);

    const ownerLogin = await login(fixture.baseUrl, {
      email: "owner-scope-escalation@lastyard.test",
      password: "apexdemo123",
    });

    const created = await assertOk(fixture.baseUrl, "/api/users", {
      method: "POST",
      headers: authHeaders(ownerLogin.token),
      body: JSON.stringify({
        name: "Escalation Attempt",
        email: "scope-escalation-attempt@lastyard.test",
        role: "Administrator",
        password: "apexdemo123",
        operatorAccess: true,
        companyId: "COMPANY-ATTACKER",
        currentCompanyId: "COMPANY-ATTACKER",
      }),
    });
    const createdUser = created.users.find((user) => user.email === "scope-escalation-attempt@lastyard.test");
    assert.ok(createdUser);
    assert.equal(createdUser.operatorAccess, false);
    assert.notEqual(createdUser.companyId, "COMPANY-ATTACKER");

    const patched = await assertOk(fixture.baseUrl, `/api/users/${createdUser.id}`, {
      method: "PATCH",
      headers: authHeaders(ownerLogin.token),
      body: JSON.stringify({
        phone: "503-555-0199",
        operatorAccess: true,
        companyId: "COMPANY-ATTACKER",
        currentCompanyId: "COMPANY-ATTACKER",
      }),
    });
    const patchedUser = patched.users.find((user) => user.id === createdUser.id);
    assert.equal(patchedUser.operatorAccess, false);
    assert.equal(patchedUser.companyId, createdUser.companyId);

    const attemptedUserLogin = await login(fixture.baseUrl, {
      email: "scope-escalation-attempt@lastyard.test",
      password: "apexdemo123",
    });
    const switchAttempt = await requestJson(fixture.baseUrl, "/api/companies/select", {
      method: "POST",
      headers: authHeaders(attemptedUserLogin.token),
      body: JSON.stringify({ companyId: "COMPANY-ATTACKER" }),
    });
    assert.equal(switchAttempt.response.status, 403);
  } finally {
    await fixture.stop();
  }
});

test("user management excludes and blocks mutations for other-company users", async () => {
  const fixture = await startServer();

  try {
    insertCompany(fixture.sqliteFile, "COMPANY-LYF", "Live Your Future Construction");
    insertUsers(fixture.sqliteFile, [
      createUserRecord({
        id: "U-OWNER-COMPANY-SCOPE",
        email: "owner-company-scope@lastyard.test",
        password: "apexdemo123",
        name: "Owner Company Scope",
        role: "Owner",
      }),
      createUserRecord({
        id: "U-LYF-COMPANY-SCOPE",
        email: "lyf-company-scope@lastyard.test",
        password: "apexdemo123",
        name: "LYF Company Scope",
        role: "Administrator",
        companyId: "COMPANY-LYF",
      }),
    ]);

    const ownerLogin = await login(fixture.baseUrl, {
      email: "owner-company-scope@lastyard.test",
      password: "apexdemo123",
    });

    const usersPayload = await assertOk(fixture.baseUrl, "/api/users", {
      headers: authHeaders(ownerLogin.token),
    });
    assert.equal(usersPayload.users.some((user) => user.id === "U-LYF-COMPANY-SCOPE"), false);
    assert.equal(usersPayload.users.some((user) => user.email === "lyf-company-scope@lastyard.test"), false);

    const patchOtherCompanyUser = await requestJson(fixture.baseUrl, "/api/users/U-LYF-COMPANY-SCOPE", {
      method: "PATCH",
      headers: authHeaders(ownerLogin.token),
      body: JSON.stringify({ phone: "503-555-0199" }),
    });
    assert.equal(patchOtherCompanyUser.response.status, 404);

    const otherCompanyLogin = await login(fixture.baseUrl, {
      email: "lyf-company-scope@lastyard.test",
      password: "apexdemo123",
    });
    const otherCompanyUsers = await assertOk(fixture.baseUrl, "/api/users", {
      headers: authHeaders(otherCompanyLogin.token),
    });
    assert.equal(otherCompanyUsers.users.some((user) => user.id === "U-LYF-COMPANY-SCOPE"), true);
    assert.equal(otherCompanyUsers.users.some((user) => user.id === "U-OWNER-COMPANY-SCOPE"), false);
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

    const invalidEmailCreate = await requestJson(fixture.baseUrl, "/api/users", {
      method: "POST",
      headers: authHeaders(ownerLogin.token),
      body: JSON.stringify({
        name: "Invalid Email Employee",
        email: "not-an-email",
        role: "Employee",
        password: "crewlogin123",
      }),
    });
    assert.equal(invalidEmailCreate.response.status, 400);
    assert.match(invalidEmailCreate.payload.error, /valid email/i);

    const database = new DatabaseSync(fixture.sqliteFile);
    try {
      const matchingUsers = database.prepare("SELECT COUNT(*) AS count FROM users WHERE email = ?").get("weak-employee@lastyard.test");
      assert.equal(matchingUsers.count, 0);
      const invalidEmailUsers = database.prepare("SELECT COUNT(*) AS count FROM users WHERE email = ?").get("not-an-email");
      assert.equal(invalidEmailUsers.count, 0);
    } finally {
      database.close();
    }
  } finally {
    await fixture.stop();
  }
});

test("invite activation fails safely for invalid or expired tokens", async () => {
  const fixture = await startServer();

  try {
    insertUsers(fixture.sqliteFile, [
      createUserRecord({
        id: "U-OWNER-INVITE-FAIL",
        email: "owner-invite-fail@lastyard.test",
        password: "apexdemo123",
        name: "Owner Invite Fail",
        role: "Owner",
      }),
    ]);

    const invalidInvite = await requestJson(fixture.baseUrl, "/api/auth/activate-invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: "not-a-real-token",
        password: "validpass123",
      }),
    });
    assert.equal(invalidInvite.response.status, 400);

    const ownerLogin = await login(fixture.baseUrl, {
      email: "owner-invite-fail@lastyard.test",
      password: "apexdemo123",
    });
    const createdInvite = await assertOk(fixture.baseUrl, "/api/users", {
      method: "POST",
      headers: authHeaders(ownerLogin.token),
      body: JSON.stringify({
        name: "Expired Invite",
        email: "expired-invite@lastyard.test",
        role: "Employee",
      }),
    });

    const database = new DatabaseSync(fixture.sqliteFile);
    try {
      database.prepare("UPDATE users SET invite_expires_at = ? WHERE email = ?").run("2020-01-01T00:00:00.000Z", "expired-invite@lastyard.test");
    } finally {
      database.close();
    }

    const expiredInvite = await requestJson(fixture.baseUrl, "/api/auth/activate-invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: createdInvite.provisionedUser.activationToken,
        password: "validpass123",
      }),
    });
    assert.equal(expiredInvite.response.status, 400);

    const inactiveInvite = await assertOk(fixture.baseUrl, "/api/users", {
      method: "POST",
      headers: authHeaders(ownerLogin.token),
      body: JSON.stringify({
        name: "Inactive Invite",
        email: "inactive-invite@lastyard.test",
        role: "Employee",
      }),
    });
    assert.ok(inactiveInvite.provisionedUser.activationToken);

    const inactiveDatabase = new DatabaseSync(fixture.sqliteFile);
    try {
      inactiveDatabase.prepare("UPDATE users SET status = ? WHERE email = ?").run("inactive", "inactive-invite@lastyard.test");
    } finally {
      inactiveDatabase.close();
    }

    const inactiveActivation = await requestJson(fixture.baseUrl, "/api/auth/activate-invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: inactiveInvite.provisionedUser.activationToken,
        password: "validpass123",
      }),
    });
    assert.equal(inactiveActivation.response.status, 403);
    assert.equal(inactiveActivation.payload.token, undefined);

    const inactiveLogin = await requestJson(fixture.baseUrl, "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "inactive-invite@lastyard.test",
        password: "validpass123",
      }),
    });
    assert.equal(inactiveLogin.response.status, 401);
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
      const bootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", {
        headers: authHeaders(session.token),
      });
      assert.equal(bootstrap.permissions.users.canView, false);
      assert.equal(bootstrap.permissions.users.canManage, false);

      const denied = await requestJson(fixture.baseUrl, "/api/users", {
        headers: authHeaders(session.token),
      });
      assert.equal(denied.response.status, 403);

      const deniedCreate = await requestJson(fixture.baseUrl, "/api/users", {
        method: "POST",
        headers: authHeaders(session.token),
        body: JSON.stringify({
          name: "Blocked Invite",
          email: `blocked-${credentials.email}`,
          role: "Employee",
        }),
      });
      assert.equal(deniedCreate.response.status, 403);

      const deniedUpdate = await requestJson(fixture.baseUrl, "/api/users/U-OPS-USERS", {
        method: "PATCH",
        headers: authHeaders(session.token),
        body: JSON.stringify({
          role: "Owner",
        }),
      });
      assert.equal(deniedUpdate.response.status, 403);

      const deniedInvite = await requestJson(fixture.baseUrl, "/api/users/U-OPS-USERS/invite", {
        method: "POST",
        headers: authHeaders(session.token),
      });
      assert.equal(deniedInvite.response.status, 403);
    }
  } finally {
    await fixture.stop();
  }
});
