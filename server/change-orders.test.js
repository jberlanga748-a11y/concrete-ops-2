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
  return 9200 + Math.floor(Math.random() * 1000);
}

async function waitForServer(baseUrl, serverOutput) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/ready`);
      if (response.ok) return;
    } catch {}
    await sleep(250);
  }

  throw new Error(`Change order test server did not become ready.\n${serverOutput()}`);
}

async function startServer() {
  const tempDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "concrete-ops-change-orders-"));
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

  return { baseUrl, sqliteFile, stop };
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

test("change order requests stay field-safe while office manages review", async () => {
  const fixture = await startServer();

  try {
    const foremanUser = createUserRecord({
      id: "U-COR-FOREMAN",
      email: "cor-foreman@lastyard.test",
      password: "apexdemo123",
      name: "Crew Foreman",
      role: "Foreman",
    });
    const otherForemanUser = createUserRecord({
      id: "U-COR-FOREMAN-OTHER",
      email: "cor-other-foreman@lastyard.test",
      password: "apexdemo123",
      name: "Other Foreman",
      role: "Foreman",
    });
    const employeeUser = createUserRecord({
      id: "U-COR-EMPLOYEE",
      email: "cor-employee@lastyard.test",
      password: "apexdemo123",
      name: "Field Employee",
      role: "Employee",
    });

    insertUsers(fixture.sqliteFile, [foremanUser, otherForemanUser, employeeUser]);

    const opsLogin = await login(fixture.baseUrl, { email: "demo.ops@apexhq.app", password: "apexdemo123" });
    const officeHeaders = authHeaders(opsLogin.token);

    await assertOk(fixture.baseUrl, "/api/jobs/J-2201/assignments", {
      method: "POST",
      headers: officeHeaders,
      body: JSON.stringify({ userId: foremanUser.id, roleOnJob: "foreman" }),
    });
    await assertOk(fixture.baseUrl, "/api/jobs/J-2192/assignments", {
      method: "POST",
      headers: officeHeaders,
      body: JSON.stringify({ userId: otherForemanUser.id, roleOnJob: "foreman" }),
    });

    const foremanLogin = await login(fixture.baseUrl, { email: foremanUser.email, password: "apexdemo123" });
    const otherForemanLogin = await login(fixture.baseUrl, { email: otherForemanUser.email, password: "apexdemo123" });
    const employeeLogin = await login(fixture.baseUrl, { email: employeeUser.email, password: "apexdemo123" });
    const foremanHeaders = authHeaders(foremanLogin.token);
    const otherForemanHeaders = authHeaders(otherForemanLogin.token);
    const employeeHeaders = authHeaders(employeeLogin.token);

    const unrelatedCreate = await requestJson(fixture.baseUrl, "/api/change-order-requests", {
      method: "POST",
      headers: foremanHeaders,
      body: JSON.stringify({
        jobId: "J-2192",
        reason: "Extra curb",
        scopeDescription: "Extend curb by 10 feet.",
        fieldNotes: "Should be blocked.",
      }),
    });
    assert.equal(unrelatedCreate.response.status, 403);

    const createdState = await assertOk(fixture.baseUrl, "/api/change-order-requests", {
      method: "POST",
      headers: foremanHeaders,
      body: JSON.stringify({
        jobId: "J-2201",
        reason: "Customer requested wider walk",
        scopeDescription: "Widen the front walk by 18 inches along the driveway edge.",
        fieldNotes: "Customer approved discussing a scope change with office.",
      }),
    });
    const request = createdState.changeOrderRequests.find((entry) => entry.jobId === "J-2201");
    assert.ok(request);
    assert.equal(request.status, "requested");
    assert.equal(request.officeNotes, "");
    assert.notEqual(request.job.canViewMoney, true);

    const otherForemanList = await assertOk(fixture.baseUrl, "/api/change-order-requests", { headers: otherForemanHeaders });
    assert.equal(otherForemanList.changeOrderRequests.length, 0);

    const employeeList = await requestJson(fixture.baseUrl, "/api/change-order-requests", { headers: employeeHeaders });
    assert.equal(employeeList.response.status, 403);

    const reviewedState = await assertOk(fixture.baseUrl, `/api/change-order-requests/${request.id}`, {
      method: "PATCH",
      headers: officeHeaders,
      body: JSON.stringify({
        status: "under_review",
        officeNotes: "Reviewing scope before pricing handoff.",
      }),
    });
    const reviewedRequest = reviewedState.changeOrderRequests.find((entry) => entry.id === request.id);
    assert.equal(reviewedRequest.status, "under_review");
    assert.equal(reviewedRequest.officeNotes, "Reviewing scope before pricing handoff.");

    const foremanViewAfterReview = await assertOk(fixture.baseUrl, "/api/change-order-requests", { headers: foremanHeaders });
    const visibleRequest = foremanViewAfterReview.changeOrderRequests.find((entry) => entry.id === request.id);
    assert.ok(visibleRequest);
    assert.equal(visibleRequest.status, "under_review");
    assert.equal(visibleRequest.officeNotes, "");

    const archivedState = await assertOk(fixture.baseUrl, `/api/change-order-requests/${request.id}/archive`, {
      method: "POST",
      headers: officeHeaders,
    });
    const archivedRequest = archivedState.changeOrderRequests.find((entry) => entry.id === request.id);
    assert.equal(archivedRequest.status, "archived");
    assert.equal(Boolean(archivedRequest.archivedAt), true);
    assert.equal(archivedState.auditEvents.some((event) => event.entityType === "changeOrderRequest"), true);
  } finally {
    await fixture.stop();
  }
});
