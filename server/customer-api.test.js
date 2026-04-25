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
  return 4300 + Math.floor(Math.random() * 1000);
}

async function waitForServer(baseUrl, serverOutput) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/ready`);
      if (response.ok) {
        return;
      }
    } catch {
      // Poll until the server becomes ready.
    }
    await sleep(250);
  }

  throw new Error(`Customer API test server did not become ready.\n${serverOutput()}`);
}

async function startServer() {
  const tempDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "concrete-ops-customers-"));
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
      INSERT INTO users (id, email, name, role, password_hash)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (const user of users) {
      insertUser.run(user.id, user.email, user.name, user.role, user.passwordHash);
    }
  } finally {
    database.close();
  }
}

test("customer lifecycle creates audit events for owner-managed records", async () => {
  const fixture = await startServer();

  try {
    const ownerLogin = await login(fixture.baseUrl, {
      email: "ops@lastyard.test",
      password: "concrete123",
    });
    const headers = authHeaders(ownerLogin.token);

    const before = await assertOk(fixture.baseUrl, "/api/bootstrap", { headers });
    assert.equal(before.permissions.customers.canView, true);
    assert.equal(before.permissions.customers.canManage, true);

    const createState = await assertOk(fixture.baseUrl, "/api/customers", {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: "Dana Martinez",
        company: "Martinez Family",
        phone: "503-555-0142",
        email: "dana@example.com",
        city: "Silverton",
        serviceArea: "Mid-Valley",
        status: "Active",
        notes: "Prefers text confirmations.",
      }),
    });

    const createdCustomer = createState.customers.find((customer) => customer.email === "dana@example.com");
    assert.ok(createdCustomer, "Expected the new customer to be returned in bootstrap.");
    assert.equal(createdCustomer.status, "Active");
    assert.equal(createdCustomer.archivedAt, null);
    assert.ok(createState.auditEvents.some((event) => event.entityType === "customer" && event.entityId === createdCustomer.id && event.action === "created"));

    const updateState = await assertOk(fixture.baseUrl, `/api/customers/${createdCustomer.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        phone: "503-555-0199",
        status: "Inactive",
        notes: "Hold outreach until June.",
      }),
    });

    const updatedCustomer = updateState.customers.find((customer) => customer.id === createdCustomer.id);
    assert.equal(updatedCustomer.phone, "503-555-0199");
    assert.equal(updatedCustomer.status, "Inactive");
    assert.notEqual(updatedCustomer.createdAt, "");
    assert.notEqual(updatedCustomer.updatedAt, "");
    assert.ok(updateState.auditEvents.some((event) => event.entityType === "customer" && event.entityId === createdCustomer.id && event.action === "updated" && event.changedFields.includes("status")));

    const archivedState = await assertOk(fixture.baseUrl, `/api/customers/${createdCustomer.id}/archive`, {
      method: "POST",
      headers,
    });
    const archivedCustomer = archivedState.customers.find((customer) => customer.id === createdCustomer.id);
    assert.ok(archivedCustomer.archivedAt, "Expected archive to stamp archivedAt.");
    assert.ok(archivedState.auditEvents.some((event) => event.entityType === "customer" && event.entityId === createdCustomer.id && event.action === "archived"));

    const restoredState = await assertOk(fixture.baseUrl, `/api/customers/${createdCustomer.id}/restore`, {
      method: "POST",
      headers,
    });
    const restoredCustomer = restoredState.customers.find((customer) => customer.id === createdCustomer.id);
    assert.equal(restoredCustomer.archivedAt, null);
    assert.ok(restoredState.auditEvents.some((event) => event.entityType === "customer" && event.entityId === createdCustomer.id && event.action === "restored"));
  } finally {
    await fixture.stop();
  }
});

test("customer permissions allow administrators and block employees from management", async () => {
  const fixture = await startServer();

  try {
    insertUsers(fixture.sqliteFile, [
      createUserRecord({
        email: "admin@lastyard.test",
        password: "concrete123",
        name: "Admin User",
        role: "Administrator",
      }),
      createUserRecord({
        email: "employee@lastyard.test",
        password: "concrete123",
        name: "Employee User",
        role: "Employee",
      }),
    ]);

    const adminLogin = await login(fixture.baseUrl, {
      email: "admin@lastyard.test",
      password: "concrete123",
    });
    const adminBootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", {
      headers: authHeaders(adminLogin.token),
    });
    assert.equal(adminBootstrap.permissions.customers.canView, true);
    assert.equal(adminBootstrap.permissions.customers.canManage, true);

    const employeeLogin = await login(fixture.baseUrl, {
      email: "employee@lastyard.test",
      password: "concrete123",
    });
    const employeeHeaders = authHeaders(employeeLogin.token);
    const employeeBootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", { headers: employeeHeaders });
    assert.equal(employeeBootstrap.permissions.customers.canView, false);
    assert.equal(employeeBootstrap.permissions.customers.canManage, false);
    assert.equal(employeeBootstrap.customers.length, 0);

    const createDenied = await requestJson(fixture.baseUrl, "/api/customers", {
      method: "POST",
      headers: employeeHeaders,
      body: JSON.stringify({
        name: "Blocked Employee Customer",
        city: "Albany",
      }),
    });
    assert.equal(createDenied.response.status, 403);
    assert.match(createDenied.payload.error, /permission/i);

    const patchDenied = await requestJson(fixture.baseUrl, "/api/customers/C-1001", {
      method: "PATCH",
      headers: employeeHeaders,
      body: JSON.stringify({
        notes: "Should not be allowed.",
      }),
    });
    assert.equal(patchDenied.response.status, 403);

    const archiveDenied = await requestJson(fixture.baseUrl, "/api/customers/C-1001/archive", {
      method: "POST",
      headers: employeeHeaders,
    });
    assert.equal(archiveDenied.response.status, 403);
  } finally {
    await fixture.stop();
  }
});
