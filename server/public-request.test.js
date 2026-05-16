import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

import { createUserRecord } from "./store.js";
import { DEFAULT_COMPANY_ID } from "../shared/companyScope.js";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createPort() {
  return 9800 + Math.floor(Math.random() * 1000);
}

async function waitForServer(baseUrl, serverOutput) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/ready`);
      if (response.ok) return;
    } catch {}
    await sleep(250);
  }

  throw new Error(`Public request test server did not become ready.\n${serverOutput()}`);
}

async function startServer(envOverrides = {}) {
  const tempDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "concrete-ops-public-request-"));
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
      PUBLIC_ESTIMATE_REQUEST_ENABLED: "true",
      ...envOverrides,
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

function insertOtherCompany(sqliteFile) {
  const database = new DatabaseSync(sqliteFile);
  const now = new Date().toISOString();
  try {
    database.prepare(`
      INSERT OR IGNORE INTO companies (id, workspace_id, name, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run("COMPANY-LYF", "COMPANY-LYF", "Live Your Future Construction", "active", now, now);
  } finally {
    database.close();
  }
}

function insertUser(sqliteFile, user) {
  const database = new DatabaseSync(sqliteFile);
  try {
    database.prepare(`
      INSERT INTO users (id, email, name, role, phone, status, company_id, operator_access, created_at, updated_at, last_login_at, password_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      user.id,
      user.email,
      user.name,
      user.role,
      user.phone || "",
      user.status || "active",
      user.companyId || DEFAULT_COMPANY_ID,
      user.operatorAccess ? 1 : 0,
      user.createdAt || new Date().toISOString(),
      user.updatedAt || user.createdAt || new Date().toISOString(),
      user.lastLoginAt || null,
      user.passwordHash,
    );
  } finally {
    database.close();
  }
}

function buildPublicRequestPayload(overrides = {}) {
  return {
    name: "Alex Rivera",
    phone: "503-555-0199",
    email: "alex.rivera@example.test",
    projectAddress: "412 Market Street NE, Salem, OR",
    projectType: "ADA ramp",
    projectDetails: "Need a small ADA ramp poured at the storefront entry and want a quick estimate visit.",
    preferredContactMethod: "Phone",
    preferredContactTime: "Weekday afternoons",
    honeypot: "",
    ...overrides,
  };
}

test("public estimate request creates a lead, links a customer, and keeps field roles scoped out", async () => {
  const fixture = await startServer();

  try {
    const employeeUser = createUserRecord({
      id: "U-PUBLIC-EMPLOYEE",
      email: "public-employee@lastyard.test",
      password: "apexdemo123",
      name: "Public Field Employee",
      role: "Employee",
    });
    insertUsers(fixture.sqliteFile, [employeeUser]);

    const submission = await assertOk(fixture.baseUrl, "/api/public/estimate-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildPublicRequestPayload()),
    });
    assert.equal(submission.ok, true);

    const officeLogin = await login(fixture.baseUrl, {
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
    });
    const officeBootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", {
      headers: { Authorization: `Bearer ${officeLogin.token}` },
    });
    const createdLead = officeBootstrap.leads.find((lead) => lead.customer === "Alex Rivera" && lead.source === "public_request_form");
    assert.ok(createdLead);
    assert.equal(createdLead.status, "New");
    assert.match(createdLead.notes, /Project address: 412 Market Street NE, Salem, OR/);
    assert.match(createdLead.notes, /Preferred contact method: Phone/);

    const linkedCustomer = officeBootstrap.customers.find((customer) => customer.id === createdLead.customerId);
    assert.ok(linkedCustomer);
    assert.equal(linkedCustomer.phone, "503-555-0199");
    assert.equal(linkedCustomer.email, "alex.rivera@example.test");
    assert.ok(officeBootstrap.activity.some((item) => item.title === "Public estimate request received"));
    assert.ok(officeBootstrap.auditEvents.some((event) => event.entityId === createdLead.id && event.action === "public_request_created"));

    const employeeLogin = await login(fixture.baseUrl, {
      email: "public-employee@lastyard.test",
      password: "apexdemo123",
    });
    const employeeBootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", {
      headers: { Authorization: `Bearer ${employeeLogin.token}` },
    });
    assert.equal(employeeBootstrap.leads.length, 0);
    assert.equal(employeeBootstrap.customers.length, 0);
  } finally {
    await fixture.stop();
  }
});

test("public estimate request honeypot and rate limit block spam without exposing internal data", async () => {
  const fixture = await startServer();

  try {
    const honeypotAttempt = await requestJson(fixture.baseUrl, "/api/public/estimate-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildPublicRequestPayload({
        name: "Spam Bot",
        email: "spam@example.test",
        honeypot: "https://spam.invalid",
      })),
    });
    assert.equal(honeypotAttempt.response.status, 202);

    const officeLogin = await login(fixture.baseUrl, {
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
    });
    const officeBootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", {
      headers: { Authorization: `Bearer ${officeLogin.token}` },
    });
    assert.equal(officeBootstrap.leads.some((lead) => lead.customer === "Spam Bot"), false);

    for (let index = 0; index < 5; index += 1) {
      const response = await requestJson(fixture.baseUrl, "/api/public/estimate-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPublicRequestPayload({
          name: `Rate Limit ${index}`,
          email: `rate-${index}@example.test`,
        })),
      });
      assert.equal(response.response.status, 201);
    }

    const limited = await requestJson(fixture.baseUrl, "/api/public/estimate-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildPublicRequestPayload({
        name: "Rate Limit Final",
        email: "rate-final@example.test",
      })),
    });
    assert.equal(limited.response.status, 429);
  } finally {
    await fixture.stop();
  }
});

test("public estimate request requires a valid target company in multi-company mode and writes only there", async () => {
  const fixture = await startServer();

  try {
    insertOtherCompany(fixture.sqliteFile);
    insertUser(fixture.sqliteFile, createUserRecord({
      id: "U-PUBLIC-LYF-OWNER",
      email: "public-lyf-owner@lastyard.test",
      password: "apexdemo123",
      name: "LYF Public Owner",
      role: "Owner",
      companyId: "COMPANY-LYF",
    }));

    const missingTarget = await requestJson(fixture.baseUrl, "/api/public/estimate-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildPublicRequestPayload({ name: "Missing Target", email: "missing-target@example.test" })),
    });
    assert.equal(missingTarget.response.status, 400);
    assert.match(missingTarget.payload.error, /targetCompanyId/i);

    const invalidTarget = await requestJson(fixture.baseUrl, "/api/public/estimate-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildPublicRequestPayload({
        name: "Invalid Target",
        email: "invalid-target@example.test",
        targetCompanyId: "COMPANY-MISSING",
      })),
    });
    assert.equal(invalidTarget.response.status, 404);
    assert.match(invalidTarget.payload.error, /target company not found/i);

    const submission = await assertOk(fixture.baseUrl, "/api/public/estimate-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildPublicRequestPayload({
        name: "LYF Targeted Lead",
        email: "lyf-target@example.test",
        targetCompanyId: "COMPANY-LYF",
      })),
    });
    assert.equal(submission.ok, true);

    const lyfLogin = await login(fixture.baseUrl, {
      email: "public-lyf-owner@lastyard.test",
      password: "apexdemo123",
    });
    const lyfBootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", {
      headers: { Authorization: `Bearer ${lyfLogin.token}` },
    });
    const lyfLead = lyfBootstrap.leads.find((lead) => lead.customer === "LYF Targeted Lead");
    assert.ok(lyfLead);
    assert.equal(lyfLead.companyId, "COMPANY-LYF");
    assert.ok(lyfBootstrap.queueItems.some((item) => item.title === "Follow up LYF Targeted Lead"));

    const defaultLogin = await login(fixture.baseUrl, {
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
    });
    const defaultBootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", {
      headers: { Authorization: `Bearer ${defaultLogin.token}` },
    });
    assert.equal(defaultBootstrap.leads.some((lead) => lead.customer === "LYF Targeted Lead"), false);
  } finally {
    await fixture.stop();
  }
});
