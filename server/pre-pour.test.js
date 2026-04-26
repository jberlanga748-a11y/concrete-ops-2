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
  return 8100 + Math.floor(Math.random() * 1000);
}

async function waitForServer(baseUrl, serverOutput) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/ready`);
      if (response.ok) return;
    } catch {}
    await sleep(250);
  }

  throw new Error(`Pre-pour test server did not become ready.\n${serverOutput()}`);
}

async function startServer() {
  const tempDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "concrete-ops-pre-pour-"));
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

test("pre-pour permissions keep field access scoped while office can review lifecycle changes", async () => {
  const fixture = await startServer();

  try {
    const foremanUser = createUserRecord({
      id: "U-PREPOUR-FOREMAN",
      email: "prepour-foreman@lastyard.test",
      password: "concrete123",
      name: "Pre-Pour Foreman",
      role: "Foreman",
    });
    const employeeUser = createUserRecord({
      id: "U-PREPOUR-EMPLOYEE",
      email: "prepour-employee@lastyard.test",
      password: "concrete123",
      name: "Pre-Pour Employee",
      role: "Employee",
    });
    const otherEmployee = createUserRecord({
      id: "U-PREPOUR-OTHER",
      email: "prepour-other@lastyard.test",
      password: "concrete123",
      name: "Other Field Employee",
      role: "Employee",
    });

    insertUsers(fixture.sqliteFile, [foremanUser, employeeUser, otherEmployee]);

    const opsLogin = await login(fixture.baseUrl, { email: "ops@lastyard.test", password: "concrete123" });
    const officeHeaders = authHeaders(opsLogin.token);

    await assertOk(fixture.baseUrl, "/api/jobs/J-2201/assignments", {
      method: "POST",
      headers: officeHeaders,
      body: JSON.stringify({ userId: foremanUser.id, roleOnJob: "foreman" }),
    });
    await assertOk(fixture.baseUrl, "/api/jobs/J-2201/assignments", {
      method: "POST",
      headers: officeHeaders,
      body: JSON.stringify({ userId: employeeUser.id, roleOnJob: "crew" }),
    });
    await assertOk(fixture.baseUrl, "/api/jobs/J-2192/assignments", {
      method: "POST",
      headers: officeHeaders,
      body: JSON.stringify({ userId: otherEmployee.id, roleOnJob: "crew" }),
    });

    const foremanLogin = await login(fixture.baseUrl, { email: foremanUser.email, password: "concrete123" });
    const employeeLogin = await login(fixture.baseUrl, { email: employeeUser.email, password: "concrete123" });
    const otherLogin = await login(fixture.baseUrl, { email: otherEmployee.email, password: "concrete123" });
    const foremanHeaders = authHeaders(foremanLogin.token);
    const employeeHeaders = authHeaders(employeeLogin.token);
    const otherHeaders = authHeaders(otherLogin.token);

    const unrelatedCreate = await requestJson(fixture.baseUrl, "/api/pre-pour-checklists", {
      method: "POST",
      headers: foremanHeaders,
      body: JSON.stringify({ jobId: "J-2192", notes: "Should not work." }),
    });
    assert.equal(unrelatedCreate.response.status, 403);

    const createdState = await assertOk(fixture.baseUrl, "/api/pre-pour-checklists", {
      method: "POST",
      headers: foremanHeaders,
      body: JSON.stringify({
        jobId: "J-2201",
        notes: "Before truck dispatch, confirm access and base prep.",
      }),
    });
    const createdChecklist = createdState.prePourChecklists.find((checklist) => checklist.jobId === "J-2201");
    assert.ok(createdChecklist);
    assert.equal(createdChecklist.items.length >= 10, true);
    assert.equal(createdChecklist.items.some((item) => item.key === "before_photos_taken"), true);
    assert.notEqual(createdChecklist.job.canViewMoney, true);
    assert.equal("notes" in createdChecklist.job, false);

    const formsItem = createdChecklist.items.find((item) => item.key === "forms_set");
    assert.ok(formsItem);

    const incompleteComplete = await requestJson(fixture.baseUrl, `/api/pre-pour-checklists/${createdChecklist.id}/complete`, {
      method: "POST",
      headers: foremanHeaders,
    });
    assert.equal(incompleteComplete.response.status, 409);

    const formsUpdatedState = await assertOk(fixture.baseUrl, `/api/pre-pour-checklists/${createdChecklist.id}/items/${formsItem.id}`, {
      method: "PATCH",
      headers: foremanHeaders,
      body: JSON.stringify({
        status: "checked",
        notes: "Forms pinned and aligned.",
      }),
    });
    const formsUpdatedChecklist = formsUpdatedState.prePourChecklists.find((checklist) => checklist.id === createdChecklist.id);
    assert.equal(formsUpdatedChecklist.items.find((item) => item.id === formsItem.id).status, "checked");

    const employeeEditAttempt = await requestJson(fixture.baseUrl, `/api/pre-pour-checklists/${createdChecklist.id}/items/${formsItem.id}`, {
      method: "PATCH",
      headers: employeeHeaders,
      body: JSON.stringify({ status: "checked", notes: "Employee should not be able to change this." }),
    });
    assert.equal(employeeEditAttempt.response.status, 403);

    const employeeView = await assertOk(fixture.baseUrl, "/api/pre-pour-checklists", { headers: employeeHeaders });
    assert.equal(employeeView.prePourChecklists.length, 1);
    assert.equal(employeeView.prePourChecklists[0].id, createdChecklist.id);

    const unrelatedView = await assertOk(fixture.baseUrl, "/api/pre-pour-checklists", { headers: otherHeaders });
    assert.equal(unrelatedView.prePourChecklists.length, 0);

    for (const item of createdChecklist.items) {
      await assertOk(fixture.baseUrl, `/api/pre-pour-checklists/${createdChecklist.id}/items/${item.id}`, {
        method: "PATCH",
        headers: foremanHeaders,
        body: JSON.stringify({
          status: item.key === "pump_truck_access_confirmed" ? "not_applicable" : "checked",
          notes: item.key === "before_photos_taken" ? "Captured the slab prep and access lane." : "",
        }),
      });
    }

    const completedState = await assertOk(fixture.baseUrl, `/api/pre-pour-checklists/${createdChecklist.id}/complete`, {
      method: "POST",
      headers: foremanHeaders,
    });
    const completedChecklist = completedState.prePourChecklists.find((checklist) => checklist.id === createdChecklist.id);
    assert.equal(completedChecklist.status, "completed");

    const employeeCompleteAttempt = await requestJson(fixture.baseUrl, `/api/pre-pour-checklists/${createdChecklist.id}/complete`, {
      method: "POST",
      headers: employeeHeaders,
    });
    assert.equal(employeeCompleteAttempt.response.status, 403);

    const foremanReviewAttempt = await requestJson(fixture.baseUrl, `/api/pre-pour-checklists/${createdChecklist.id}/review`, {
      method: "POST",
      headers: foremanHeaders,
    });
    assert.equal(foremanReviewAttempt.response.status, 403);

    const reviewedState = await assertOk(fixture.baseUrl, `/api/pre-pour-checklists/${createdChecklist.id}/review`, {
      method: "POST",
      headers: officeHeaders,
    });
    assert.equal(reviewedState.prePourChecklists.find((checklist) => checklist.id === createdChecklist.id).status, "reviewed");

    const reopenedState = await assertOk(fixture.baseUrl, `/api/pre-pour-checklists/${createdChecklist.id}/reopen`, {
      method: "POST",
      headers: officeHeaders,
    });
    assert.equal(reopenedState.prePourChecklists.find((checklist) => checklist.id === createdChecklist.id).status, "reopened");

    const archivedState = await assertOk(fixture.baseUrl, `/api/pre-pour-checklists/${createdChecklist.id}/archive`, {
      method: "POST",
      headers: officeHeaders,
    });
    const archivedChecklist = archivedState.prePourChecklists.find((checklist) => checklist.id === createdChecklist.id);
    assert.equal(archivedChecklist.status, "archived");
    assert.equal(Boolean(archivedChecklist.archivedAt), true);
    assert.equal(archivedState.auditEvents.some((event) => event.entityType === "prePourChecklist"), true);

    const officeList = await assertOk(fixture.baseUrl, "/api/pre-pour-checklists", { headers: officeHeaders });
    assert.equal(officeList.prePourChecklists.some((checklist) => checklist.id === createdChecklist.id), true);
  } finally {
    await fixture.stop();
  }
});
