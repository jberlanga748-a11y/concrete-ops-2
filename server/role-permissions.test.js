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

test("Apex OS bootstrap permission is retired from Apex HQ", async () => {
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
    const operatorAdmin = createUserRecord({
      id: "U-ADMIN-PRIVATE-APEX-OS",
      email: "operator-admin@apexhq.test",
      password: "apexdemo123",
      name: "Operator Admin",
      role: "Administrator",
      operatorAccess: true,
    });
    const normalAdmin = createUserRecord({
      id: "U-ADMIN-BLOCKED-APEX-OS",
      email: "normal-admin@apexhq.test",
      password: "apexdemo123",
      name: "Normal Admin",
      role: "Administrator",
      operatorAccess: false,
    });
    const estimatorUser = createUserRecord({
      id: "U-ESTIMATOR-APEX-OS",
      email: "estimator-apex-os@apexhq.test",
      password: "apexdemo123",
      name: "Estimator Apex",
      role: "Estimator",
      operatorAccess: true,
    });
    const fieldUser = createUserRecord({
      id: "U-FIELD-APEX-OS",
      email: "field-apex-os@apexhq.test",
      password: "apexdemo123",
      name: "Field Apex",
      role: "Foreman",
      operatorAccess: true,
    });
    const employeeUser = createUserRecord({
      id: "U-EMPLOYEE-APEX-OS",
      email: "employee-apex-os@apexhq.test",
      password: "apexdemo123",
      name: "Employee Apex",
      role: "Employee",
      operatorAccess: true,
    });

    insertUsers(fixture.sqliteFile, [privateOwner, normalOwner, operatorAdmin, normalAdmin, estimatorUser, fieldUser, employeeUser]);

    const privateLogin = await login(fixture.baseUrl, {
      email: "private-owner@apexhq.test",
      password: "apexdemo123",
    });
    const normalLogin = await login(fixture.baseUrl, {
      email: "normal-owner@apexhq.test",
      password: "apexdemo123",
    });
    const operatorAdminLogin = await login(fixture.baseUrl, { email: "operator-admin@apexhq.test", password: "apexdemo123" });
    const blockedLogins = await Promise.all([
      login(fixture.baseUrl, { email: "normal-admin@apexhq.test", password: "apexdemo123" }),
      login(fixture.baseUrl, { email: "estimator-apex-os@apexhq.test", password: "apexdemo123" }),
      login(fixture.baseUrl, { email: "field-apex-os@apexhq.test", password: "apexdemo123" }),
      login(fixture.baseUrl, { email: "employee-apex-os@apexhq.test", password: "apexdemo123" }),
    ]);
    const privateBootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", {
      headers: authHeaders(privateLogin.token),
    });
    const normalBootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", {
      headers: authHeaders(normalLogin.token),
    });
    const operatorAdminBootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", {
      headers: authHeaders(operatorAdminLogin.token),
    });
    const blockedBootstraps = await Promise.all(blockedLogins.map((blockedLogin) => assertOk(fixture.baseUrl, "/api/bootstrap", {
      headers: authHeaders(blockedLogin.token),
    })));

    assert.equal(privateBootstrap.permissions.apexOs.canView, false);
    assert.equal(privateBootstrap.permissions.apexOs.canManage, false);
    assert.equal(operatorAdminBootstrap.permissions.apexOs.canView, false);
    assert.equal(operatorAdminBootstrap.permissions.apexOs.canManage, false);
    assert.equal(normalBootstrap.permissions.apexOs.canView, false);
    assert.deepEqual(blockedBootstraps.map((bootstrap) => bootstrap.permissions.apexOs.canView), [false, false, false, false]);

    const privateMemory = await requestJson(fixture.baseUrl, "/api/apex-os/memory", {
      headers: authHeaders(privateLogin.token),
    });
    assert.equal(privateMemory.response.status, 410);
    assert.match(privateMemory.payload.error, /standalone local repo/i);

    const privateBuilderValidation = await requestJson(fixture.baseUrl, "/api/apex-os/builder/validation-runs", {
      method: "POST",
      headers: authHeaders(privateLogin.token),
      body: JSON.stringify({ commandId: "not-a-real-command" }),
    });
    assert.equal(privateBuilderValidation.response.status, 410);

    const privateBuilderFix = await requestJson(fixture.baseUrl, "/api/apex-os/builder/fix-runs", {
      method: "POST",
      headers: authHeaders(privateLogin.token),
      body: JSON.stringify({ request: "deploy production" }),
    });
    assert.equal(privateBuilderFix.response.status, 410);

    const privateBuilderUndo = await requestJson(fixture.baseUrl, "/api/apex-os/builder/undo-runs", {
      method: "POST",
      headers: authHeaders(privateLogin.token),
      body: JSON.stringify({ fixRun: null }),
    });
    assert.equal(privateBuilderUndo.response.status, 410);

    const privateBuildLoop = await requestJson(fixture.baseUrl, "/api/apex-os/build-loop/runs", {
      method: "POST",
      headers: authHeaders(privateLogin.token),
      body: JSON.stringify({ request: "deploy production", runValidation: false }),
    });
    assert.equal(privateBuildLoop.response.status, 410);

    for (const blockedLogin of [normalLogin, ...blockedLogins]) {
      const blockedMemory = await requestJson(fixture.baseUrl, "/api/apex-os/memory", {
        headers: authHeaders(blockedLogin.token),
      });
      assert.equal(blockedMemory.response.status, 410);

      const blockedBuilderValidation = await requestJson(fixture.baseUrl, "/api/apex-os/builder/validation-runs", {
        method: "POST",
        headers: authHeaders(blockedLogin.token),
        body: JSON.stringify({ commandId: "not-a-real-command" }),
      });
      assert.equal(blockedBuilderValidation.response.status, 410);

      const blockedBuilderFix = await requestJson(fixture.baseUrl, "/api/apex-os/builder/fix-runs", {
        method: "POST",
        headers: authHeaders(blockedLogin.token),
        body: JSON.stringify({ request: "fix small UI copy" }),
      });
      assert.equal(blockedBuilderFix.response.status, 410);

      const blockedBuilderUndo = await requestJson(fixture.baseUrl, "/api/apex-os/builder/undo-runs", {
        method: "POST",
        headers: authHeaders(blockedLogin.token),
        body: JSON.stringify({ fixRun: null }),
      });
      assert.equal(blockedBuilderUndo.response.status, 410);

      const blockedBuildLoop = await requestJson(fixture.baseUrl, "/api/apex-os/build-loop/runs", {
        method: "POST",
        headers: authHeaders(blockedLogin.token),
        body: JSON.stringify({ request: "Apex, work on yourself.", runValidation: false }),
      });
      assert.equal(blockedBuildLoop.response.status, 410);
    }
  } finally {
    await fixture.stop();
  }
});
