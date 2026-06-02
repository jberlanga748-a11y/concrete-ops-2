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
  return 5600 + Math.floor(Math.random() * 1000);
}

async function waitForServer(baseUrl, serverOutput) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/ready`);
      if (response.ok) {
        return;
      }
    } catch {
      // Poll until ready.
    }
    await sleep(250);
  }

  throw new Error(`Role permission test server did not become ready.\n${serverOutput()}`);
}

async function startServer() {
  const tempDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "concrete-ops-roles-"));
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

function insertUsers(sqliteFile, users) {
  const database = new DatabaseSync(sqliteFile);
  try {
    const insertUser = database.prepare(`
      INSERT INTO users (id, email, name, role, password_hash, operator_access)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const user of users) {
      insertUser.run(user.id, user.email, user.name, user.role, user.passwordHash, user.operatorAccess ? 1 : 0);
    }
  } finally {
    database.close();
  }
}

function configureJobVisibility(sqliteFile, { foremanId, employeeId }) {
  const database = new DatabaseSync(sqliteFile);
  try {
    database.prepare(`
      UPDATE jobs
      SET assigned_foreman_id = ?,
          assigned_user_id = ?,
          field_planning_visible = 0,
          visible_to_foreman = 0,
          scheduled_start = '2026-04-25T07:30',
          status = 'in_progress'
      WHERE id = 'J-2201'
    `).run(foremanId, employeeId);

    database.prepare(`
      UPDATE jobs
      SET assigned_foreman_id = ?,
          assigned_user_id = '',
          field_planning_visible = 1,
          visible_to_foreman = 1,
          scheduled_start = '2026-05-03T08:00',
          status = 'scheduled'
      WHERE id = 'J-2198'
    `).run(foremanId);

    database.prepare(`
      UPDATE jobs
      SET assigned_foreman_id = '',
          assigned_user_id = '',
          field_planning_visible = 0,
          visible_to_foreman = 0
      WHERE id = 'J-2192'
    `).run();
  } finally {
    database.close();
  }
}

test("job visibility is role-scoped and field roles receive redacted job payloads", async () => {
  const fixture = await startServer();

  try {
    const ownerUser = createUserRecord({
      id: "U-OWNER-ROLES",
      email: "owner@lastyard.test",
      password: "apexdemo123",
      name: "Owner User",
      role: "Owner",
    });
    const foremanUser = createUserRecord({
      id: "U-FOREMAN-ROLES",
      email: "foreman@lastyard.test",
      password: "apexdemo123",
      name: "Foreman User",
      role: "Foreman",
    });
    const employeeUser = createUserRecord({
      id: "U-EMPLOYEE-ROLES",
      email: "employee@lastyard.test",
      password: "apexdemo123",
      name: "Employee User",
      role: "Employee",
    });

    insertUsers(fixture.sqliteFile, [ownerUser, foremanUser, employeeUser]);
    configureJobVisibility(fixture.sqliteFile, { foremanId: foremanUser.id, employeeId: employeeUser.id });

    const ownerLogin = await login(fixture.baseUrl, {
      email: "owner@lastyard.test",
      password: "apexdemo123",
    });
    const ownerJobs = await assertOk(fixture.baseUrl, "/api/jobs", {
      headers: authHeaders(ownerLogin.token),
    });
    assert.equal(ownerJobs.jobs.length >= 3, true);
    assert.ok(ownerJobs.jobs.every((job) => "notes" in job), "Owner should receive office job notes.");

    const foremanLogin = await login(fixture.baseUrl, {
      email: "foreman@lastyard.test",
      password: "apexdemo123",
    });
    const foremanHeaders = authHeaders(foremanLogin.token);
    const foremanJobs = await assertOk(fixture.baseUrl, "/api/jobs", {
      headers: foremanHeaders,
    });
    assert.deepEqual(foremanJobs.jobs.map((job) => job.id).sort(), ["J-2198", "J-2201"]);
    assert.ok(foremanJobs.jobs.every((job) => !("notes" in job)), "Foreman payload should omit office notes.");
    assert.ok(foremanJobs.jobs.every((job) => !("value" in job)), "Foreman payload should omit money fields.");
    assert.ok(foremanJobs.jobs.every((job) => typeof job.scopeSummary === "string"));
    assert.ok(foremanJobs.jobs.every((job) => typeof job.address === "string"));
    assert.ok(foremanJobs.jobs.every((job) => typeof job.siteContact === "string"));

    const foremanCustomersDenied = await requestJson(fixture.baseUrl, "/api/customers", {
      headers: foremanHeaders,
    });
    assert.equal(foremanCustomersDenied.response.status, 403);

    const employeeLogin = await login(fixture.baseUrl, {
      email: "employee@lastyard.test",
      password: "apexdemo123",
    });
    const employeeHeaders = authHeaders(employeeLogin.token);
    const employeeJobs = await assertOk(fixture.baseUrl, "/api/jobs", {
      headers: employeeHeaders,
    });
    assert.deepEqual(employeeJobs.jobs.map((job) => job.id), ["J-2201"]);
    assert.ok(employeeJobs.jobs.every((job) => !("notes" in job)), "Employee payload should omit office notes.");
    assert.ok(employeeJobs.jobs.every((job) => !("value" in job)), "Employee payload should omit money fields.");

    const employeeCustomersDenied = await requestJson(fixture.baseUrl, "/api/customers", {
      headers: employeeHeaders,
    });
    assert.equal(employeeCustomersDenied.response.status, 403);
  } finally {
    await fixture.stop();
  }
});

test("Apex OS bootstrap permission requires private operator access", async () => {
  const fixture = await startServer();

  try {
    const privateOwner = createUserRecord({
      id: "U-PRIVATE-APEX-OS",
      email: "private-owner@apexhq.test",
      password: "apexdemo123",
      name: "Private Owner",
      role: "Owner",
      operatorAccess: true,
    });
    const normalOwner = createUserRecord({
      id: "U-NORMAL-APEX-OS",
      email: "normal-owner@apexhq.test",
      password: "apexdemo123",
      name: "Normal Owner",
      role: "Owner",
      operatorAccess: false,
    });
    const fieldUser = createUserRecord({
      id: "U-FIELD-APEX-OS",
      email: "field-apex-os@apexhq.test",
      password: "apexdemo123",
      name: "Field Apex",
      role: "Foreman",
      operatorAccess: true,
    });

    insertUsers(fixture.sqliteFile, [privateOwner, normalOwner, fieldUser]);

    const privateLogin = await login(fixture.baseUrl, {
      email: "private-owner@apexhq.test",
      password: "apexdemo123",
    });
    const normalLogin = await login(fixture.baseUrl, {
      email: "normal-owner@apexhq.test",
      password: "apexdemo123",
    });
    const fieldLogin = await login(fixture.baseUrl, {
      email: "field-apex-os@apexhq.test",
      password: "apexdemo123",
    });
    const privateBootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", {
      headers: authHeaders(privateLogin.token),
    });
    const normalBootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", {
      headers: authHeaders(normalLogin.token),
    });
    const fieldBootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", {
      headers: authHeaders(fieldLogin.token),
    });

    assert.equal(privateBootstrap.permissions.apexOs.canView, true);
    assert.equal(privateBootstrap.permissions.apexOs.canManage, true);
    assert.equal(normalBootstrap.permissions.apexOs.canView, false);
    assert.equal(fieldBootstrap.permissions.apexOs.canView, false);
  } finally {
    await fixture.stop();
  }
});
