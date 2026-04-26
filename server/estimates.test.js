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
  return 9400 + Math.floor(Math.random() * 1000);
}

async function waitForServer(baseUrl, serverOutput) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/ready`);
      if (response.ok) return;
    } catch {}
    await sleep(250);
  }

  throw new Error(`Estimate test server did not become ready.\n${serverOutput()}`);
}

async function startServer() {
  const tempDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "concrete-ops-estimates-"));
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
  const payload = response.status === 204 ? null : await response.json().catch(() => null);
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

function buildEstimatePayload({ customerId, leadId = "", ...overrides } = {}) {
  return {
    customerId,
    leadId,
    title: "Martinez Driveway Proposal",
    status: "draft",
    scopeSummary: "Replace cracked driveway panels and restore broom-finish apron.",
    internalNotes: "Office-only pricing assumptions stay inside estimates.",
    customerNotes: "Two-day window once approved.",
    taxRate: 8.5,
    feesTotal: 125,
    items: [
      { description: "Concrete placement", quantity: 10, unit: "yd", unitPrice: 185 },
      { description: "Prep and cleanup", quantity: 1, unit: "lot", unitPrice: 650 },
    ],
    ...overrides,
  };
}

test("office and estimator users can manage estimates while field roles are blocked", async () => {
  const fixture = await startServer();

  try {
    const estimatorUser = createUserRecord({
      id: "U-EST-ESTIMATOR",
      email: "estimate-estimator@lastyard.test",
      password: "concrete123",
      name: "Estimator Sam",
      role: "Estimator",
    });
    const foremanUser = createUserRecord({
      id: "U-EST-FOREMAN",
      email: "estimate-foreman@lastyard.test",
      password: "concrete123",
      name: "Field Foreman",
      role: "Foreman",
    });
    const employeeUser = createUserRecord({
      id: "U-EST-EMPLOYEE",
      email: "estimate-employee@lastyard.test",
      password: "concrete123",
      name: "Field Employee",
      role: "Employee",
    });

    insertUsers(fixture.sqliteFile, [estimatorUser, foremanUser, employeeUser]);

    const officeLogin = await login(fixture.baseUrl, { email: "ops@lastyard.test", password: "concrete123" });
    const estimatorLogin = await login(fixture.baseUrl, { email: estimatorUser.email, password: "concrete123" });
    const foremanLogin = await login(fixture.baseUrl, { email: foremanUser.email, password: "concrete123" });
    const employeeLogin = await login(fixture.baseUrl, { email: employeeUser.email, password: "concrete123" });
    const officeHeaders = authHeaders(officeLogin.token);
    const estimatorHeaders = authHeaders(estimatorLogin.token);
    const foremanHeaders = authHeaders(foremanLogin.token);
    const employeeHeaders = authHeaders(employeeLogin.token);
    const officeBootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", { headers: { Authorization: `Bearer ${officeLogin.token}` } });

    const customerId = officeBootstrap.customers[0].id;
    const leadId = officeBootstrap.leads[0].id;

    const createdOfficeState = await assertOk(fixture.baseUrl, "/api/estimates", {
      method: "POST",
      headers: officeHeaders,
      body: JSON.stringify(buildEstimatePayload({ customerId, leadId })),
    });
    const officeEstimate = createdOfficeState.estimates.find((estimate) => estimate.title === "Martinez Driveway Proposal");
    assert.ok(officeEstimate);
    assert.equal(officeEstimate.subtotal, 2500);
    assert.equal(officeEstimate.taxTotal, 212.5);
    assert.equal(officeEstimate.grandTotal, 2837.5);
    assert.equal(officeEstimate.items.length, 2);

    const estimatorState = await assertOk(fixture.baseUrl, "/api/estimates", {
      method: "POST",
      headers: estimatorHeaders,
      body: JSON.stringify(buildEstimatePayload({
        customerId,
        title: "Estimator Patio Proposal",
      })),
    });
    assert.ok(estimatorState.estimates.some((estimate) => estimate.createdBy === estimatorUser.id));

    const deniedForeman = await requestJson(fixture.baseUrl, "/api/estimates", { headers: foremanHeaders });
    const deniedEmployee = await requestJson(fixture.baseUrl, "/api/estimates", { headers: employeeHeaders });
    assert.equal(deniedForeman.response.status, 403);
    assert.equal(deniedEmployee.response.status, 403);

    const foremanBootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", { headers: { Authorization: `Bearer ${foremanLogin.token}` } });
    const employeeBootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", { headers: { Authorization: `Bearer ${employeeLogin.token}` } });
    assert.deepEqual(foremanBootstrap.estimates, []);
    assert.deepEqual(employeeBootstrap.estimates, []);
    assert.equal(foremanBootstrap.jobs.every((job) => !("grandTotal" in job) && !("subtotal" in job)), true);

    const sentState = await assertOk(fixture.baseUrl, `/api/estimates/${officeEstimate.id}`, {
      method: "PATCH",
      headers: officeHeaders,
      body: JSON.stringify({
        ...buildEstimatePayload({ customerId, leadId }),
        title: officeEstimate.title,
        status: "sent",
        items: officeEstimate.items,
      }),
    });
    const sentEstimate = sentState.estimates.find((estimate) => estimate.id === officeEstimate.id);
    assert.equal(sentEstimate.status, "sent");
    assert.ok(sentEstimate.sentAt);

    const approvedState = await assertOk(fixture.baseUrl, `/api/estimates/${officeEstimate.id}`, {
      method: "PATCH",
      headers: officeHeaders,
      body: JSON.stringify({
        ...buildEstimatePayload({ customerId, leadId }),
        title: officeEstimate.title,
        status: "approved",
        items: officeEstimate.items,
      }),
    });
    const approvedEstimate = approvedState.estimates.find((estimate) => estimate.id === officeEstimate.id);
    assert.equal(approvedEstimate.status, "approved");
    assert.ok(approvedEstimate.approvedAt);

    const convertedState = await assertOk(fixture.baseUrl, `/api/estimates/${officeEstimate.id}/convert-to-job`, {
      method: "POST",
      headers: officeHeaders,
      body: JSON.stringify({}),
    });
    const convertedEstimate = convertedState.estimates.find((estimate) => estimate.id === officeEstimate.id);
    assert.ok(convertedEstimate.jobId);
    assert.ok(convertedState.jobs.some((job) => job.id === convertedEstimate.jobId && job.customerId === customerId));
  } finally {
    await fixture.stop();
  }
});
