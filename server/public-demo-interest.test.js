import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

import { DEFAULT_COMPANY_ID } from "../shared/companyScope.js";
import { createUserRecord } from "./store.js";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createPort() {
  return 12600 + Math.floor(Math.random() * 700);
}

async function waitForServer(baseUrl, serverOutput) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/ready`);
      if (response.ok) return;
    } catch {}
    await sleep(250);
  }

  throw new Error(`Public demo interest test server did not become ready.\n${serverOutput()}`);
}

async function startServer(envOverrides = {}) {
  const tempDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "apex-public-demo-interest-"));
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
    body: JSON.stringify({ ...credentials, returnToken: true }),
  });
}

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function buildDemoInterestPayload(overrides = {}) {
  return {
    name: "Riley Owner",
    company: "Riley Flatwork",
    email: "riley@example.test",
    phone: "541-555-0199",
    trade: "Concrete",
    location: "Salem, OR",
    workflow: "Estimate to job handoff",
    message: "Estimate notes and job photos live in texts. apiKey=do-not-save",
    consentToManualFollowUp: true,
    honeypot: "",
    ...overrides,
  };
}

function tableCount(sqliteFile, tableName) {
  const allowedTables = new Set(["customers", "leads", "estimates", "jobs", "queue_items", "users"]);
  assert.equal(allowedTables.has(tableName), true, `Unexpected table lookup: ${tableName}`);
  const database = new DatabaseSync(sqliteFile);
  try {
    return database.prepare(`SELECT COUNT(*) AS count FROM ${tableName}`).get().count;
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

function leadRecord(sqliteFile, id) {
  const database = new DatabaseSync(sqliteFile);
  try {
    return database.prepare(`
      SELECT id, company_id AS companyId, customer, city, project, source, notes
      FROM leads
      WHERE id = ?
    `).get(id);
  } finally {
    database.close();
  }
}

function demoInterestLeadCount(sqliteFile) {
  const database = new DatabaseSync(sqliteFile);
  try {
    return database.prepare(`
      SELECT COUNT(*) AS count
      FROM leads
      WHERE source = 'Website'
        AND notes LIKE '%Source: Apex HQ founder-pilot website%'
    `).get().count;
  } finally {
    database.close();
  }
}

test("public demo interest creates a manual review lead only and keeps field roles blocked", async () => {
  const fixture = await startServer();

  try {
    const beforeCounts = {
      customers: tableCount(fixture.sqliteFile, "customers"),
      estimates: tableCount(fixture.sqliteFile, "estimates"),
      jobs: tableCount(fixture.sqliteFile, "jobs"),
      queueItems: tableCount(fixture.sqliteFile, "queue_items"),
      users: tableCount(fixture.sqliteFile, "users"),
    };
    insertUser(fixture.sqliteFile, createUserRecord({
      id: "U-PUBLIC-DEMO-EMPLOYEE",
      email: "public-demo-employee@lastyard.test",
      password: "apexdemo123",
      name: "Public Demo Employee",
      role: "Employee",
    }));

    const submitted = await requestJson(fixture.baseUrl, "/api/public/demo-interest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildDemoInterestPayload()),
    });

    assert.equal(submitted.response.status, 201);
    assert.equal(submitted.payload.ok, true);
    assert.equal(submitted.payload.reviewRequired, true);
    assert.match(submitted.payload.message, /manual founder review/i);
    assert.match(submitted.payload.message, /No automatic email or SMS/i);

    const lead = leadRecord(fixture.sqliteFile, submitted.payload.leadId);
    assert.equal(lead.companyId, DEFAULT_COMPANY_ID);
    assert.equal(lead.customer, "Riley Flatwork");
    assert.equal(lead.city, "Salem, OR");
    assert.equal(lead.project, "Apex HQ founder pilot - Estimate to job handoff");
    assert.equal(lead.source, "Website");
    assert.match(lead.notes, /Source: Apex HQ founder-pilot website/);
    assert.match(lead.notes, /manual founder follow-up only/i);
    assert.match(lead.notes, /no automatic email, SMS, account creation, billing, package change, customer portal access, or workspace creation/i);
    assert.doesNotMatch(lead.notes, /do-not-save|apiKey=do-not-save/i);
    assert.equal(tableCount(fixture.sqliteFile, "customers"), beforeCounts.customers, "Demo interest must not create customers.");
    assert.equal(tableCount(fixture.sqliteFile, "estimates"), beforeCounts.estimates, "Demo interest must not create estimates.");
    assert.equal(tableCount(fixture.sqliteFile, "jobs"), beforeCounts.jobs, "Demo interest must not create jobs.");
    assert.equal(tableCount(fixture.sqliteFile, "queue_items"), beforeCounts.queueItems + 1, "Demo interest should create one owner/admin manual review queue item.");
    assert.equal(tableCount(fixture.sqliteFile, "users"), beforeCounts.users + 1, "Only the test field user should be added.");

    const officeLogin = await login(fixture.baseUrl, {
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
    });
    const officeBootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", {
      headers: authHeaders(officeLogin.token),
    });
    assert.ok(officeBootstrap.leads.some((item) => item.id === submitted.payload.leadId));
    assert.ok(officeBootstrap.queueItems.some((item) => item.title === "Review founder-pilot request" && item.meta === "Riley Flatwork - Estimate to job handoff"));
    assert.ok(officeBootstrap.activity.some((item) => item.title === "Founder-pilot walkthrough request received"));
    assert.ok(officeBootstrap.auditEvents.some((event) => event.entityId === submitted.payload.leadId && event.action === "public_demo_interest_created"));

    const employeeLogin = await login(fixture.baseUrl, {
      email: "public-demo-employee@lastyard.test",
      password: "apexdemo123",
    });
    const employeeBootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", {
      headers: authHeaders(employeeLogin.token),
    });
    assert.deepEqual(employeeBootstrap.leads, []);
    assert.deepEqual(employeeBootstrap.queueItems, []);
    assert.equal(employeeBootstrap.permissions.leads.canView, false);
    assert.equal(employeeBootstrap.permissions.leads.canManage, false);
  } finally {
    await fixture.stop();
  }
});

test("public demo interest treats exact retries as duplicate manual review leads", async () => {
  const fixture = await startServer();

  try {
    const first = await requestJson(fixture.baseUrl, "/api/public/demo-interest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildDemoInterestPayload()),
    });
    assert.equal(first.response.status, 201);
    assert.equal(first.payload.duplicate, false);
    assert.equal(demoInterestLeadCount(fixture.sqliteFile), 1);
    const queueItemsAfterFirst = tableCount(fixture.sqliteFile, "queue_items");

    const retry = await requestJson(fixture.baseUrl, "/api/public/demo-interest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildDemoInterestPayload({
        message: "Follow-up retry from the same request.",
      })),
    });
    assert.equal(retry.response.status, 200);
    assert.equal(retry.payload.duplicate, true);
    assert.equal(retry.payload.leadId, first.payload.leadId);
    assert.match(retry.payload.message, /already exists/i);
    assert.equal(demoInterestLeadCount(fixture.sqliteFile), 1);
    assert.equal(tableCount(fixture.sqliteFile, "queue_items"), queueItemsAfterFirst, "Duplicate retries must not create another manual review queue item.");
  } finally {
    await fixture.stop();
  }
});

test("public demo interest requires consent and a contact channel", async () => {
  const fixture = await startServer();

  try {
    const missingConsent = await requestJson(fixture.baseUrl, "/api/public/demo-interest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildDemoInterestPayload({ consentToManualFollowUp: false })),
    });
    assert.equal(missingConsent.response.status, 400);
    assert.match(missingConsent.payload.error, /consent/i);

    const missingContact = await requestJson(fixture.baseUrl, "/api/public/demo-interest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildDemoInterestPayload({ phone: "", email: "" })),
    });
    assert.equal(missingContact.response.status, 400);
    assert.match(missingContact.payload.error, /phone or email/i);
  } finally {
    await fixture.stop();
  }
});

test("public demo interest ignores honeypot and never honors client-selected company", async () => {
  const fixture = await startServer();

  try {
    insertOtherCompany(fixture.sqliteFile);
    const beforeLeadCount = tableCount(fixture.sqliteFile, "leads");
    const ignored = await requestJson(fixture.baseUrl, "/api/public/demo-interest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildDemoInterestPayload({ honeypot: "bot value" })),
    });
    assert.equal(ignored.response.status, 202);
    assert.equal(tableCount(fixture.sqliteFile, "leads"), beforeLeadCount);

    const submitted = await requestJson(fixture.baseUrl, "/api/public/demo-interest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildDemoInterestPayload({ targetCompanyId: "COMPANY-LYF" })),
    });
    assert.equal(submitted.response.status, 201);
    const lead = leadRecord(fixture.sqliteFile, submitted.payload.leadId);
    assert.equal(lead.companyId, DEFAULT_COMPANY_ID);
  } finally {
    await fixture.stop();
  }
});
