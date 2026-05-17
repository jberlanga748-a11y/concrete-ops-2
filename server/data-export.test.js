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
  return 8800 + Math.floor(Math.random() * 900);
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

  throw new Error(`Data export test server did not become ready.\n${serverOutput()}`);
}

async function startServer() {
  const tempDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "apex-hq-data-export-"));
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
  return { response, payload };
}

async function login(baseUrl, credentials) {
  const { payload } = await assertOk(baseUrl, "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });
  return payload;
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

test("owner export returns scoped workspace data without auth secrets", async () => {
  const fixture = await startServer();

  try {
    insertUsers(fixture.sqliteFile, [
      createUserRecord({
        id: "U-EXPORT-OWNER",
        email: "owner-export@apexhq.test",
        password: "apexdemo123",
        name: "Owner Export",
        role: "Owner",
      }),
    ]);

    const database = new DatabaseSync(fixture.sqliteFile);
    try {
      database.prepare("UPDATE leads SET company_id = ? WHERE id = (SELECT id FROM leads LIMIT 1)").run("COMPANY-OTHER");
      database.prepare(`
        INSERT INTO audit_events (
          id, sort_index, company_id, entity_type, entity_id, action, summary, detail,
          actor_user_id, actor_name, changed_fields, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        "AUDIT-OTHER-COMPANY-EXPORT",
        9999,
        "COMPANY-OTHER",
        "lead",
        "L-OTHER-EXPORT",
        "other_company_secret",
        "Other company audit event",
        "This audit event belongs to another company and must not export.",
        "U-OTHER",
        "Other Owner",
        "[]",
        new Date().toISOString(),
      );
    } finally {
      database.close();
    }

    const ownerLogin = await login(fixture.baseUrl, {
      email: "owner-export@apexhq.test",
      password: "apexdemo123",
    });

    const inviteCreated = await assertOk(fixture.baseUrl, "/api/users", {
      method: "POST",
      headers: authHeaders(ownerLogin.token),
      body: JSON.stringify({
        name: "Export Invite Foreman",
        email: "export-invite-foreman@apexhq.test",
        role: "Foreman",
      }),
    });
    const activationToken = inviteCreated.payload.provisionedUser?.activationToken;
    assert.ok(activationToken);

    const temporaryCreated = await assertOk(fixture.baseUrl, "/api/users", {
      method: "POST",
      headers: authHeaders(ownerLogin.token),
      body: JSON.stringify({
        name: "Export Temporary Employee",
        email: "export-temporary-employee@apexhq.test",
        role: "Employee",
        provisioningMode: "temporary_password",
      }),
    });
    const temporaryPassword = temporaryCreated.payload.provisionedUser?.temporaryPassword;
    assert.ok(temporaryPassword);

    const { response, payload } = await assertOk(fixture.baseUrl, "/api/export/company", {
      headers: authHeaders(ownerLogin.token),
    });

    assert.match(response.headers.get("content-disposition") || "", /apex-hq-.*\.json/);
    assert.equal(payload.exportVersion, 1);
    assert.equal(payload.companyId, "COMPANY-DEFAULT");
    assert.equal(payload.data.currentCompanyId, "COMPANY-DEFAULT");
    assert.ok(Array.isArray(payload.data.leads));
    assert.equal(payload.data.leads.some((lead) => lead.companyId === "COMPANY-OTHER"), false);
    assert.equal(payload.data.users.some((user) => "passwordHash" in user), false);
    assert.equal(payload.data.users.some((user) => "resetTokenHash" in user || "inviteTokenHash" in user), false);
    assertNoAuthSecretFields(payload, "company export");
    assertSerializedPayloadExcludes(payload, [activationToken, temporaryPassword], "company export");
    assert.equal(payload.data.auditEvents.some((event) => event.action === "data_exported"), true);
    assert.equal(payload.data.auditEvents.some((event) => event.action === "other_company_secret"), false);
  } finally {
    await fixture.stop();
  }
});

test("non-owner roles cannot export workspace data", async () => {
  const fixture = await startServer();

  try {
    insertUsers(fixture.sqliteFile, [
      createUserRecord({
        id: "U-EXPORT-ADMIN",
        email: "admin-export@apexhq.test",
        password: "apexdemo123",
        name: "Admin Export",
        role: "Administrator",
      }),
      createUserRecord({
        id: "U-EXPORT-EMPLOYEE",
        email: "employee-export@apexhq.test",
        password: "apexdemo123",
        name: "Employee Export",
        role: "Employee",
      }),
    ]);

    const database = new DatabaseSync(fixture.sqliteFile);
    try {
      database.prepare(`
        INSERT INTO audit_events (
          id, sort_index, company_id, entity_type, entity_id, action, summary, detail,
          actor_user_id, actor_name, changed_fields, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        "AUDIT-EMPLOYEE-HIDDEN",
        9998,
        "COMPANY-DEFAULT",
        "company",
        "COMPANY-DEFAULT",
        "employee_hidden_audit",
        "Employee-hidden audit event",
        "Employees must not receive office audit history in bootstrap.",
        "U-EXPORT-ADMIN",
        "Admin Export",
        "[]",
        new Date().toISOString(),
      );
    } finally {
      database.close();
    }

    const adminLogin = await login(fixture.baseUrl, {
      email: "admin-export@apexhq.test",
      password: "apexdemo123",
    });
    const adminExport = await requestJson(fixture.baseUrl, "/api/export/company", {
      headers: authHeaders(adminLogin.token),
    });
    assert.equal(adminExport.response.status, 403);

    const employeeLogin = await login(fixture.baseUrl, {
      email: "employee-export@apexhq.test",
      password: "apexdemo123",
    });
    const { payload: employeeBootstrap } = await assertOk(fixture.baseUrl, "/api/bootstrap", {
      headers: authHeaders(employeeLogin.token),
    });
    assert.equal(employeeBootstrap.permissions.audit.canView, false);
    assert.deepEqual(employeeBootstrap.auditEvents, []);

    const employeeExport = await requestJson(fixture.baseUrl, "/api/export/company", {
      headers: authHeaders(employeeLogin.token),
    });
    assert.equal(employeeExport.response.status, 403);
  } finally {
    await fixture.stop();
  }
});
