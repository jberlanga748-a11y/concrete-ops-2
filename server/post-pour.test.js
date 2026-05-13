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
  return 9100 + Math.floor(Math.random() * 1000);
}

async function waitForServer(baseUrl, serverOutput) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/ready`);
      if (response.ok) return;
    } catch {}
    await sleep(250);
  }

  throw new Error(`Post-pour test server did not become ready.\n${serverOutput()}`);
}

async function startServer() {
  const tempDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "concrete-ops-post-pour-"));
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

test("post-pour permissions keep field access scoped while office can review lifecycle changes", async () => {
  const fixture = await startServer();

  try {
    const foremanUser = createUserRecord({
      id: "U-POSTPOUR-FOREMAN",
      email: "postpour-foreman@lastyard.test",
      password: "apexdemo123",
      name: "Post-Pour Foreman",
      role: "Foreman",
    });
    const employeeUser = createUserRecord({
      id: "U-POSTPOUR-EMPLOYEE",
      email: "postpour-employee@lastyard.test",
      password: "apexdemo123",
      name: "Post-Pour Employee",
      role: "Employee",
    });
    const otherEmployee = createUserRecord({
      id: "U-POSTPOUR-OTHER",
      email: "postpour-other@lastyard.test",
      password: "apexdemo123",
      name: "Other Field Employee",
      role: "Employee",
    });

    insertUsers(fixture.sqliteFile, [foremanUser, employeeUser, otherEmployee]);

    const opsLogin = await login(fixture.baseUrl, { email: "demo.ops@apexhq.app", password: "apexdemo123" });
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

    const foremanLogin = await login(fixture.baseUrl, { email: foremanUser.email, password: "apexdemo123" });
    const employeeLogin = await login(fixture.baseUrl, { email: employeeUser.email, password: "apexdemo123" });
    const otherLogin = await login(fixture.baseUrl, { email: otherEmployee.email, password: "apexdemo123" });
    const foremanHeaders = authHeaders(foremanLogin.token);
    const employeeHeaders = authHeaders(employeeLogin.token);
    const otherHeaders = authHeaders(otherLogin.token);

    const unrelatedCreate = await requestJson(fixture.baseUrl, "/api/post-pour-checklists", {
      method: "POST",
      headers: foremanHeaders,
      body: JSON.stringify({ jobId: "J-2192", notes: "Should not work." }),
    });
    assert.equal(unrelatedCreate.response.status, 403);

    const createdState = await assertOk(fixture.baseUrl, "/api/post-pour-checklists", {
      method: "POST",
      headers: foremanHeaders,
      body: JSON.stringify({
        jobId: "J-2201",
        notes: "Set finish, cleanup, cure, and closeout reminders.",
      }),
    });
    const createdChecklist = createdState.postPourChecklists.find((checklist) => checklist.jobId === "J-2201");
    assert.ok(createdChecklist);
    assert.equal(createdChecklist.items.length >= 10, true);
    assert.equal(createdChecklist.items.some((item) => item.key === "completion_photos_taken"), true);
    assert.notEqual(createdChecklist.job.canViewMoney, true);
    assert.equal("notes" in createdChecklist.job, false);

    const finishItem = createdChecklist.items.find((item) => item.key === "finish_quality_checked");
    assert.ok(finishItem);

    const incompleteComplete = await requestJson(fixture.baseUrl, `/api/post-pour-checklists/${createdChecklist.id}/complete`, {
      method: "POST",
      headers: foremanHeaders,
    });
    assert.equal(incompleteComplete.response.status, 409);

    const updatedState = await assertOk(fixture.baseUrl, `/api/post-pour-checklists/${createdChecklist.id}/items/${finishItem.id}`, {
      method: "PATCH",
      headers: foremanHeaders,
      body: JSON.stringify({
        status: "checked",
        notes: "Finish texture and edges confirmed.",
      }),
    });
    const updatedChecklist = updatedState.postPourChecklists.find((checklist) => checklist.id === createdChecklist.id);
    assert.equal(updatedChecklist.items.find((item) => item.id === finishItem.id).status, "checked");

    const employeeEditAttempt = await requestJson(fixture.baseUrl, `/api/post-pour-checklists/${createdChecklist.id}/items/${finishItem.id}`, {
      method: "PATCH",
      headers: employeeHeaders,
      body: JSON.stringify({ status: "checked", notes: "Employee should not be able to change this." }),
    });
    assert.equal(employeeEditAttempt.response.status, 403);

    const employeeView = await assertOk(fixture.baseUrl, "/api/post-pour-checklists", { headers: employeeHeaders });
    assert.equal(employeeView.postPourChecklists.length, 1);
    assert.equal(employeeView.postPourChecklists[0].id, createdChecklist.id);

    const unrelatedView = await assertOk(fixture.baseUrl, "/api/post-pour-checklists", { headers: otherHeaders });
    assert.equal(unrelatedView.postPourChecklists.length, 0);

    for (const item of createdChecklist.items) {
      await assertOk(fixture.baseUrl, `/api/post-pour-checklists/${createdChecklist.id}/items/${item.id}`, {
        method: "PATCH",
        headers: foremanHeaders,
        body: JSON.stringify({
          status: item.key === "sealant_reminder_if_needed" ? "not_applicable" : "checked",
          notes: item.key === "completion_photos_taken" ? "Uploaded finish and cleanup photos." : "",
        }),
      });
    }

    const completedState = await assertOk(fixture.baseUrl, `/api/post-pour-checklists/${createdChecklist.id}/complete`, {
      method: "POST",
      headers: foremanHeaders,
    });
    const completedChecklist = completedState.postPourChecklists.find((checklist) => checklist.id === createdChecklist.id);
    assert.equal(completedChecklist.status, "completed");

    const employeeCompleteAttempt = await requestJson(fixture.baseUrl, `/api/post-pour-checklists/${createdChecklist.id}/complete`, {
      method: "POST",
      headers: employeeHeaders,
    });
    assert.equal(employeeCompleteAttempt.response.status, 403);

    const foremanReviewAttempt = await requestJson(fixture.baseUrl, `/api/post-pour-checklists/${createdChecklist.id}/review`, {
      method: "POST",
      headers: foremanHeaders,
    });
    assert.equal(foremanReviewAttempt.response.status, 403);

    const reviewedState = await assertOk(fixture.baseUrl, `/api/post-pour-checklists/${createdChecklist.id}/review`, {
      method: "POST",
      headers: officeHeaders,
    });
    assert.equal(reviewedState.postPourChecklists.find((checklist) => checklist.id === createdChecklist.id).status, "reviewed");

    const reopenedState = await assertOk(fixture.baseUrl, `/api/post-pour-checklists/${createdChecklist.id}/reopen`, {
      method: "POST",
      headers: officeHeaders,
    });
    assert.equal(reopenedState.postPourChecklists.find((checklist) => checklist.id === createdChecklist.id).status, "reopened");

    const archivedState = await assertOk(fixture.baseUrl, `/api/post-pour-checklists/${createdChecklist.id}/archive`, {
      method: "POST",
      headers: officeHeaders,
    });
    const archivedChecklist = archivedState.postPourChecklists.find((checklist) => checklist.id === createdChecklist.id);
    assert.equal(archivedChecklist.status, "archived");
    assert.equal(Boolean(archivedChecklist.archivedAt), true);
    assert.equal(archivedState.auditEvents.some((event) => event.entityType === "postPourChecklist"), true);

    const officeList = await assertOk(fixture.baseUrl, "/api/post-pour-checklists", { headers: officeHeaders });
    assert.equal(officeList.postPourChecklists.some((checklist) => checklist.id === createdChecklist.id), true);
  } finally {
    await fixture.stop();
  }
});
