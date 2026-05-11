import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createPort() {
  return 6500 + Math.floor(Math.random() * 1000);
}

async function waitForServer(baseUrl, serverOutput) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/ready`);
      if (response.ok) return;
    } catch {
      // Poll until ready.
    }
    await sleep(250);
  }
  throw new Error(`Contact history test server did not become ready.\n${serverOutput()}`);
}

async function startServer() {
  const tempDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "concrete-ops-contact-history-"));
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

function insertOtherCompanyLead(sqliteFile) {
  const database = new DatabaseSync(sqliteFile);
  const now = "2026-05-11T12:00:00.000Z";
  try {
    database.exec(`
      INSERT INTO companies (id, workspace_id, name, status, created_at, updated_at)
      VALUES ('COMPANY-OTHER', 'COMPANY-OTHER', 'Other Contractor', 'active', '${now}', '${now}');
    `);
    database.prepare(`
      INSERT INTO leads (
        id, sort_index, company_id, customer_id, customer, city, project, status, priority, value, owner, owner_id, age, source,
        follow_up_due_at, next_step, notes, fit_score, fit_label, fit_reason, fit_risks, fit_next_step, score_source, scored_at,
        missing_info_status, missing_info_count, missing_info_items, missing_info_next_step, missing_info_checked_at,
        created_at, updated_at, archived_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      "L-OTHER",
      0,
      "COMPANY-OTHER",
      null,
      "Other Customer",
      "Eugene",
      "Other company work",
      "New",
      "Normal",
      0,
      "",
      null,
      "Just now",
      "Website",
      "",
      "Review",
      "Other company lead.",
      0,
      "",
      "",
      "[]",
      "",
      "",
      "",
      "",
      0,
      "[]",
      "",
      "",
      now,
      now,
      null,
    );
    database.prepare(`
      INSERT INTO contact_history (
        id, sort_index, company_id, entity_type, entity_id, contact_name, contact_email, contact_phone, method, direction, outcome,
        subject, message_draft, notes, contacted_at, next_follow_up_date, created_by, created_by_name, created_at, updated_at, archived_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      "CH-OTHER",
      0,
      "COMPANY-OTHER",
      "lead",
      "L-OTHER",
      "Other Customer",
      "",
      "",
      "Call",
      "outbound",
      "Follow-Up Needed",
      "",
      "",
      "Other company contact note.",
      now,
      "",
      "U-OTHER",
      "Other User",
      now,
      now,
      null,
    );
  } finally {
    database.close();
  }
}

test("contact history supports manual lead and customer outreach tracking", async () => {
  const fixture = await startServer();

  try {
    const ownerLogin = await login(fixture.baseUrl, {
      email: "ops@lastyard.test",
      password: "concrete123",
    });
    const headers = authHeaders(ownerLogin.token);
    const before = await assertOk(fixture.baseUrl, "/api/bootstrap", { headers });
    assert.equal(before.permissions.contactHistory.canView, true);
    assert.equal(before.permissions.contactHistory.canManage, true);
    assert.ok(Array.isArray(before.contactHistory));

    const createCustomerState = await assertOk(fixture.baseUrl, "/api/customers", {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: "Contact History Customer",
        phone: "503-555-0111",
        email: "contact-history@example.com",
        city: "Albany",
        status: "Prospect",
      }),
    });
    const customer = createCustomerState.customers.find((entry) => entry.email === "contact-history@example.com");
    assert.ok(customer);

    const createLeadState = await assertOk(fixture.baseUrl, "/api/leads", {
      method: "POST",
      headers,
      body: JSON.stringify({
        customer: customer.name,
        customerId: customer.id,
        city: "Albany",
        project: "Fence repair follow-up",
        status: "New",
        source: "Website",
        nextStep: "Review website lead",
        notes: "Manual tracking test.",
      }),
    });
    const lead = createLeadState.leads.find((entry) => entry.project === "Fence repair follow-up");
    assert.ok(lead);

    const loggedState = await assertOk(fixture.baseUrl, "/api/contact-history", {
      method: "POST",
      headers,
      body: JSON.stringify({
        entityType: "lead",
        entityId: lead.id,
        method: "Email",
        direction: "outbound",
        outcome: "Follow-Up Needed",
        subject: "Fence repair follow-up",
        messageDraft: "Thanks for reaching out. Can you send photos?",
        notes: "Draft saved only. No email was sent.",
        nextFollowUpDate: "2026-05-14",
      }),
    });
    const contactRecord = loggedState.contactHistory.find((entry) => entry.entityType === "lead" && entry.entityId === lead.id);
    assert.ok(contactRecord);
    assert.equal(contactRecord.companyId, lead.companyId);
    assert.equal(contactRecord.method, "Email");
    assert.match(contactRecord.messageDraft, /send photos/);
    const updatedLead = loggedState.leads.find((entry) => entry.id === lead.id);
    assert.equal(updatedLead.followUpDueAt, "2026-05-14");
    assert.match(updatedLead.nextStep, /Follow up/);
    assert.ok(loggedState.auditEvents.some((event) => event.entityType === "contactHistory" && event.entityId === contactRecord.id && event.action === "created"));

    const filtered = await assertOk(fixture.baseUrl, `/api/contact-history?entityType=lead&entityId=${lead.id}`, { headers });
    assert.equal(filtered.contactHistory.length, 1);
    assert.equal(filtered.contactHistory[0].id, contactRecord.id);

    const patchedState = await assertOk(fixture.baseUrl, `/api/contact-history/${contactRecord.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        outcome: "Waiting on Response",
        notes: "Customer has the draft and we are waiting.",
      }),
    });
    const patchedRecord = patchedState.contactHistory.find((entry) => entry.id === contactRecord.id);
    assert.equal(patchedRecord.outcome, "Waiting on Response");
    assert.match(patchedRecord.notes, /waiting/i);

    const archivedState = await assertOk(fixture.baseUrl, `/api/contact-history/${contactRecord.id}/archive`, {
      method: "POST",
      headers,
    });
    assert.ok(archivedState.contactHistory.find((entry) => entry.id === contactRecord.id).archivedAt);

    const restoredState = await assertOk(fixture.baseUrl, `/api/contact-history/${contactRecord.id}/restore`, {
      method: "POST",
      headers,
    });
    assert.equal(restoredState.contactHistory.find((entry) => entry.id === contactRecord.id).archivedAt, null);

    const customerContactState = await assertOk(fixture.baseUrl, "/api/contact-history", {
      method: "POST",
      headers,
      body: JSON.stringify({
        entityType: "customer",
        entityId: customer.id,
        method: "Call",
        outcome: "Interested",
        notes: "Customer asked for a site visit.",
      }),
    });
    const customerRecord = customerContactState.contactHistory.find((entry) => entry.entityType === "customer" && entry.entityId === customer.id);
    assert.ok(customerRecord);
    assert.equal(customerRecord.contactPhone, "503-555-0111");
  } finally {
    await fixture.stop();
  }
});

test("contact history is field-denied and company scoped", async () => {
  const fixture = await startServer();

  try {
    const ownerLogin = await login(fixture.baseUrl, {
      email: "ops@lastyard.test",
      password: "concrete123",
    });
    const headers = authHeaders(ownerLogin.token);
    const userState = await assertOk(fixture.baseUrl, "/api/users", {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: "Field Contact User",
        email: "field-contact@example.com",
        password: "fieldpass123",
        role: "Foreman",
      }),
    });
    assert.ok(userState.users.find((user) => user.email === "field-contact@example.com"));

    const fieldLogin = await login(fixture.baseUrl, {
      email: "field-contact@example.com",
      password: "fieldpass123",
    });
    const fieldHeaders = authHeaders(fieldLogin.token);
    const fieldBootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", { headers: fieldHeaders });
    assert.equal(fieldBootstrap.permissions.contactHistory.canView, false);
    assert.equal(fieldBootstrap.contactHistory.length, 0);

    const fieldGet = await requestJson(fixture.baseUrl, "/api/contact-history", { headers: fieldHeaders });
    assert.equal(fieldGet.response.status, 403);

    const fieldPost = await requestJson(fixture.baseUrl, "/api/contact-history", {
      method: "POST",
      headers: fieldHeaders,
      body: JSON.stringify({ entityType: "lead", entityId: "L-1", method: "Call" }),
    });
    assert.equal(fieldPost.response.status, 403);

    insertOtherCompanyLead(fixture.sqliteFile);

    const crossCompanyCreate = await requestJson(fixture.baseUrl, "/api/contact-history", {
      method: "POST",
      headers,
      body: JSON.stringify({
        entityType: "lead",
        entityId: "L-OTHER",
        method: "Call",
        notes: "Should not link across companies.",
      }),
    });
    assert.equal(crossCompanyCreate.response.status, 404);

    const crossCompanyGet = await requestJson(fixture.baseUrl, "/api/contact-history?entityType=lead&entityId=L-OTHER", { headers });
    assert.equal(crossCompanyGet.response.status, 404);

    const defaultHistory = await assertOk(fixture.baseUrl, "/api/contact-history", { headers });
    assert.equal(defaultHistory.contactHistory.some((entry) => entry.id === "CH-OTHER"), false);
  } finally {
    await fixture.stop();
  }
});
