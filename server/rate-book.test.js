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
  return 10500 + Math.floor(Math.random() * 1000);
}

async function waitForServer(baseUrl, serverOutput) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/ready`);
      if (response.ok) return;
    } catch {}
    await sleep(250);
  }

  throw new Error(`Rate book test server did not become ready.\n${serverOutput()}`);
}

async function startServer() {
  const tempDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "concrete-ops-rate-book-"));
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
      EMAIL_PROVIDER: "",
      EMAIL_FROM: "",
      EMAIL_REPLY_TO_DEFAULT: "",
      EMAIL_API_KEY: "",
      EMAIL_API_URL: "",
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

test("owner/admin rate book is company-scoped and field roles are blocked", async () => {
  const fixture = await startServer();

  try {
    const estimatorUser = createUserRecord({
      id: "U-RATE-ESTIMATOR",
      email: "rate-estimator@lastyard.test",
      password: "apexdemo123",
      name: "Estimator Rae",
      role: "Estimator",
    });
    const foremanUser = createUserRecord({
      id: "U-RATE-FOREMAN",
      email: "rate-foreman@lastyard.test",
      password: "apexdemo123",
      name: "Foreman Ray",
      role: "Foreman",
    });
    const employeeUser = createUserRecord({
      id: "U-RATE-EMPLOYEE",
      email: "rate-employee@lastyard.test",
      password: "apexdemo123",
      name: "Employee Riley",
      role: "Employee",
    });
    insertUsers(fixture.sqliteFile, [estimatorUser, foremanUser, employeeUser]);

    const ownerLogin = await login(fixture.baseUrl, { email: "demo.ops@apexhq.app", password: "apexdemo123" });
    const estimatorLogin = await login(fixture.baseUrl, { email: estimatorUser.email, password: "apexdemo123" });
    const foremanLogin = await login(fixture.baseUrl, { email: foremanUser.email, password: "apexdemo123" });
    const employeeLogin = await login(fixture.baseUrl, { email: employeeUser.email, password: "apexdemo123" });
    const ownerHeaders = authHeaders(ownerLogin.token);

    const createdState = await assertOk(fixture.baseUrl, "/api/rate-book", {
      method: "POST",
      headers: ownerHeaders,
      body: JSON.stringify({
        companyId: "OTHER-COMPANY",
        category: "material",
        trade: "concrete",
        title: "4000 PSI ready mix",
        description: "Furnish standard 4000 PSI ready mix concrete.",
        unit: "yd",
        unitCost: 145,
        markupPercent: 25,
        taxable: true,
      }),
    });
    const created = createdState.rateBookItems.find((item) => item.title === "4000 PSI ready mix");
    assert.ok(created);
    assert.equal(created.companyId, createdState.currentCompanyId);
    assert.equal(created.unitPrice, 181.25);
    assert.equal(created.unitCost, 145);
    assert.equal(created.markupPercent, 25);

    const updatedState = await assertOk(fixture.baseUrl, `/api/rate-book/${created.id}`, {
      method: "PATCH",
      headers: ownerHeaders,
      body: JSON.stringify({ unitCost: 150, markupPercent: 20, title: "4000 PSI ready mix updated" }),
    });
    const updated = updatedState.rateBookItems.find((item) => item.id === created.id);
    assert.equal(updated.unitPrice, 180);
    assert.equal(updated.title, "4000 PSI ready mix updated");

    const archivedState = await assertOk(fixture.baseUrl, `/api/rate-book/${created.id}/archive`, {
      method: "POST",
      headers: ownerHeaders,
    });
    assert.ok(archivedState.rateBookItems.find((item) => item.id === created.id).archivedAt);

    const restoredState = await assertOk(fixture.baseUrl, `/api/rate-book/${created.id}/restore`, {
      method: "POST",
      headers: ownerHeaders,
    });
    assert.equal(restoredState.rateBookItems.find((item) => item.id === created.id).archivedAt, null);

    const estimatorBootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", { headers: authHeaders(estimatorLogin.token) });
    const foremanBootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", { headers: authHeaders(foremanLogin.token) });
    const employeeBootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", { headers: authHeaders(employeeLogin.token) });
    assert.equal(estimatorBootstrap.permissions.rateBook.canManage, false);
    assert.equal(foremanBootstrap.permissions.rateBook.canManage, false);
    assert.equal(employeeBootstrap.permissions.rateBook.canManage, false);
    assert.deepEqual(estimatorBootstrap.rateBookItems, []);
    assert.deepEqual(foremanBootstrap.rateBookItems, []);
    assert.deepEqual(employeeBootstrap.rateBookItems, []);

    for (const token of [estimatorLogin.token, foremanLogin.token, employeeLogin.token]) {
      const denied = await requestJson(fixture.baseUrl, "/api/rate-book", { headers: authHeaders(token) });
      assert.equal(denied.response.status, 403);
      assert.match(denied.payload.error, /rate book/i);
    }
  } finally {
    await fixture.stop();
  }
});
