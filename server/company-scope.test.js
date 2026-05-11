import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

import { DEFAULT_COMPANY_ID } from "../shared/companyScope.js";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createPort() {
  return 8100 + Math.floor(Math.random() * 800);
}

async function waitForServer(baseUrl, serverOutput) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/ready`);
      if (response.ok) return;
    } catch {
      // Poll until the server becomes ready.
    }
    await sleep(250);
  }

  throw new Error(`Company scope test server did not become ready.\n${serverOutput()}`);
}

async function startServer() {
  const tempDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "concrete-ops-company-scope-"));
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

async function postJson(baseUrl, pathname, token, body = {}) {
  return assertOk(baseUrl, pathname, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
}

async function assertStatus(baseUrl, pathname, token, expectedStatus, { method = "POST", body = {} } = {}) {
  const { response, payload } = await requestJson(baseUrl, pathname, {
    method,
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  assert.equal(response.status, expectedStatus, payload?.error || `Expected ${pathname} to return ${expectedStatus}.`);
  return payload;
}

function insertOtherCompanyLeadData(sqliteFile) {
  const database = new DatabaseSync(sqliteFile);
  const now = new Date().toISOString();
  try {
    database.prepare(`
      INSERT INTO companies (id, workspace_id, name, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run("COMPANY-LYF", "COMPANY-LYF", "Live Your Future Construction", "active", now, now);

    database.prepare(`
      INSERT INTO lead_sources (
        id, sort_index, company_id, name, type, url, city, state, service_area, trade_focus,
        notes, status, check_cadence, last_checked_at, next_check_at, created_at, updated_at, archived_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      "LS-LYF-001",
      999,
      "COMPANY-LYF",
      "LYF private bid list",
      "GC bid invites",
      "https://lyf.example.test/bids",
      "Portland",
      "OR",
      "Portland metro",
      "Exterior remodel",
      "Future workspace source that must not leak.",
      "Active",
      "Weekly",
      "",
      "",
      now,
      now,
      null,
    );

    database.prepare(`
      INSERT INTO leads (
        id, sort_index, company_id, customer_id, customer, city, project, status, priority, value,
        owner, owner_id, age, source, follow_up_due_at, next_step, notes, fit_score, fit_label,
        fit_reason, fit_risks, fit_next_step, score_source, scored_at, missing_info_status,
        missing_info_count, missing_info_items, missing_info_next_step, missing_info_checked_at,
        created_at, updated_at, archived_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      "L-LYF-001",
      999,
      "COMPANY-LYF",
      null,
      "LYF Private Customer",
      "Portland, OR",
      "Other company private exterior project",
      "New",
      "Normal",
      0,
      "LYF Owner",
      null,
      "New",
      "LYF private bid list",
      null,
      "Review in LYF workspace",
      "This record belongs to a future different company.",
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
  } finally {
    database.close();
  }
}

function ensureOtherCompany(database) {
  const now = new Date().toISOString();
  database.prepare(`
    INSERT OR IGNORE INTO companies (id, workspace_id, name, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run("COMPANY-LYF", "COMPANY-LYF", "Live Your Future Construction", "active", now, now);
}

function moveRecordsToOtherCompany(sqliteFile, recordIds = {}) {
  const database = new DatabaseSync(sqliteFile);
  try {
    ensureOtherCompany(database);
    const updates = [
      ["leads", recordIds.leadId],
      ["lead_sources", recordIds.leadSourceId],
      ["customers", recordIds.customerId],
      ["estimates", recordIds.estimateId],
      ["jobs", recordIds.jobId],
      ["daily_reports", recordIds.dailyReportId],
      ["uploads", recordIds.uploadId],
      ["delivery_tickets", recordIds.deliveryTicketId],
      ["change_order_requests", recordIds.changeOrderRequestId],
      ["time_entries", recordIds.timeEntryId],
    ];

    for (const [tableName, id] of updates) {
      if (id) {
        database.prepare(`UPDATE ${tableName} SET company_id = ? WHERE id = ?`).run("COMPANY-LYF", id);
      }
    }
  } finally {
    database.close();
  }
}

function findById(records, id, label) {
  const record = (records || []).find((item) => item.id === id);
  assert.ok(record, `${label} ${id} should be present in bootstrap payload.`);
  return record;
}

function findByName(records, name, label) {
  const record = (records || []).find((item) => item.name === name || item.customer === name || item.title === name);
  assert.ok(record, `${label} named ${name} should be present in bootstrap payload.`);
  return record;
}

function companyIdForRecord(sqliteFile, tableName, id) {
  const allowedTables = new Set(["customers", "leads", "lead_sources", "estimates", "jobs"]);
  assert.equal(allowedTables.has(tableName), true, `Unexpected table lookup: ${tableName}`);
  const database = new DatabaseSync(sqliteFile);
  try {
    const record = database.prepare(`SELECT company_id AS companyId FROM ${tableName} WHERE id = ?`).get(id);
    assert.ok(record, `${tableName} record ${id} should exist.`);
    return record.companyId;
  } finally {
    database.close();
  }
}

test("bootstrap scopes existing users to the default company and hides future other-company lead data", async () => {
  const fixture = await startServer();

  try {
    const ownerLogin = await login(fixture.baseUrl, {
      email: "ops@lastyard.test",
      password: "concrete123",
    });
    const headers = authHeaders(ownerLogin.token);

    const initial = await assertOk(fixture.baseUrl, "/api/bootstrap", { headers });
    assert.equal(initial.currentCompanyId, DEFAULT_COMPANY_ID);
    assert.equal(initial.currentWorkspaceId, DEFAULT_COMPANY_ID);
    assert.equal(initial.user.companyId, DEFAULT_COMPANY_ID);
    assert.equal(initial.companies.length, 1);
    assert.equal(initial.companies[0].id, DEFAULT_COMPANY_ID);
    assert.ok(initial.leads.every((lead) => lead.companyId === DEFAULT_COMPANY_ID));
    assert.ok(initial.leadSources.every((source) => source.companyId === DEFAULT_COMPANY_ID));

    insertOtherCompanyLeadData(fixture.sqliteFile);

    const scoped = await assertOk(fixture.baseUrl, "/api/bootstrap", { headers });
    assert.equal(scoped.currentCompanyId, DEFAULT_COMPANY_ID);
    assert.equal(scoped.companies.length, 1);
    assert.equal(scoped.companies[0].id, DEFAULT_COMPANY_ID);
    assert.equal(scoped.leads.some((lead) => lead.id === "L-LYF-001"), false);
    assert.equal(scoped.leadSources.some((source) => source.id === "LS-LYF-001"), false);
    assert.ok(scoped.leads.every((lead) => lead.companyId === DEFAULT_COMPANY_ID));
    assert.ok(scoped.leadSources.every((source) => source.companyId === DEFAULT_COMPANY_ID));
  } finally {
    await fixture.stop();
  }
});

test("create routes stamp records with the current default company", async () => {
  const fixture = await startServer();

  try {
    const ownerLogin = await login(fixture.baseUrl, {
      email: "ops@lastyard.test",
      password: "concrete123",
    });

    const customerPayload = await postJson(fixture.baseUrl, "/api/customers", ownerLogin.token, {
      name: "Scoped Customer",
      city: "Portland",
      status: "Active",
    });
    const customer = findByName(customerPayload.customers, "Scoped Customer", "Customer");

    const leadPayload = await postJson(fixture.baseUrl, "/api/leads", ownerLogin.token, {
      customer: "Scoped Lead",
      city: "Portland",
      project: "Scoped project",
      source: "Call-in",
    });
    const lead = findByName(leadPayload.leads, "Scoped Lead", "Lead");

    const sourcePayload = await postJson(fixture.baseUrl, "/api/lead-sources", ownerLogin.token, {
      name: "Scoped Bid Source",
      type: "Manual source",
    });
    const leadSource = findByName(sourcePayload.leadSources, "Scoped Bid Source", "Lead source");

    const estimatePayload = await postJson(fixture.baseUrl, "/api/estimates", ownerLogin.token, {
      customerId: customer.id,
      title: "Scoped Estimate",
      status: "draft",
      items: [],
    });
    const estimate = findByName(estimatePayload.estimates, "Scoped Estimate", "Estimate");

    const jobPayload = await postJson(fixture.baseUrl, "/api/jobs", ownerLogin.token, {
      title: "Scoped Job",
      customer: "Scoped Customer",
      city: "Portland",
      status: "scheduled",
    });
    const job = findByName(jobPayload.jobs, "Scoped Job", "Job");

    assert.equal(companyIdForRecord(fixture.sqliteFile, "customers", customer.id), DEFAULT_COMPANY_ID);
    assert.equal(companyIdForRecord(fixture.sqliteFile, "leads", lead.id), DEFAULT_COMPANY_ID);
    assert.equal(companyIdForRecord(fixture.sqliteFile, "lead_sources", leadSource.id), DEFAULT_COMPANY_ID);
    assert.equal(companyIdForRecord(fixture.sqliteFile, "estimates", estimate.id), DEFAULT_COMPANY_ID);
    assert.equal(companyIdForRecord(fixture.sqliteFile, "jobs", job.id), DEFAULT_COMPANY_ID);
  } finally {
    await fixture.stop();
  }
});

test("ID-based mutations cannot touch records moved to another company", async () => {
  const fixture = await startServer();

  try {
    const ownerLogin = await login(fixture.baseUrl, {
      email: "ops@lastyard.test",
      password: "concrete123",
    });
    const token = ownerLogin.token;

    const customerPayload = await postJson(fixture.baseUrl, "/api/customers", token, {
      name: "Other Company Customer",
      city: "Portland",
      status: "Active",
    });
    const otherCustomer = findByName(customerPayload.customers, "Other Company Customer", "Customer");

    const leadPayload = await postJson(fixture.baseUrl, "/api/leads", token, {
      customer: "Other Company Lead",
      city: "Portland",
      project: "Private other-company project",
      source: "Call-in",
    });
    const otherLead = findByName(leadPayload.leads, "Other Company Lead", "Lead");

    const sourcePayload = await postJson(fixture.baseUrl, "/api/lead-sources", token, {
      name: "Other Company Source",
      type: "Manual source",
    });
    const otherSource = findByName(sourcePayload.leadSources, "Other Company Source", "Lead source");

    const estimatePayload = await postJson(fixture.baseUrl, "/api/estimates", token, {
      customerId: otherCustomer.id,
      title: "Other Company Estimate",
      status: "approved",
      items: [],
    });
    const otherEstimate = findByName(estimatePayload.estimates, "Other Company Estimate", "Estimate");

    const jobPayload = await postJson(fixture.baseUrl, "/api/jobs", token, {
      title: "Other Company Job",
      customer: "Other Company Customer",
      city: "Portland",
      status: "scheduled",
    });
    const otherJob = findByName(jobPayload.jobs, "Other Company Job", "Job");

    moveRecordsToOtherCompany(fixture.sqliteFile, {
      customerId: otherCustomer.id,
      leadId: otherLead.id,
      leadSourceId: otherSource.id,
      estimateId: otherEstimate.id,
      jobId: otherJob.id,
    });

    await assertStatus(fixture.baseUrl, `/api/leads/${otherLead.id}/score`, token, 404);
    await assertStatus(fixture.baseUrl, `/api/leads/${otherLead.id}/check-missing-info`, token, 404);
    await assertStatus(fixture.baseUrl, `/api/leads/${otherLead.id}/convert`, token, 404);
    await assertStatus(fixture.baseUrl, `/api/leads/${otherLead.id}/convert-to-customer`, token, 404);
    await assertStatus(fixture.baseUrl, `/api/lead-sources/${otherSource.id}/check`, token, 404, {
      body: { checkedAt: "2026-05-11" },
    });
    await assertStatus(fixture.baseUrl, `/api/estimates/${otherEstimate.id}`, token, 404, {
      method: "PATCH",
      body: { title: "Cross-company edit attempt" },
    });
    await assertStatus(fixture.baseUrl, `/api/estimates/${otherEstimate.id}/convert-to-job`, token, 404);
    await assertStatus(fixture.baseUrl, `/api/jobs/${otherJob.id}`, token, 404, {
      method: "PATCH",
      body: { nextStep: "Cross-company edit attempt" },
    });
    await assertStatus(fixture.baseUrl, `/api/jobs/${otherJob.id}/assignments`, token, 404, {
      body: { userId: ownerLogin.user.id, roleOnJob: "crew" },
    });
  } finally {
    await fixture.stop();
  }
});

test("cross-company links are blocked on default-company mutations", async () => {
  const fixture = await startServer();

  try {
    const ownerLogin = await login(fixture.baseUrl, {
      email: "ops@lastyard.test",
      password: "concrete123",
    });
    const token = ownerLogin.token;

    const otherCustomerPayload = await postJson(fixture.baseUrl, "/api/customers", token, {
      name: "Hidden Link Customer",
      city: "Portland",
      status: "Active",
    });
    const otherCustomer = findByName(otherCustomerPayload.customers, "Hidden Link Customer", "Customer");
    moveRecordsToOtherCompany(fixture.sqliteFile, { customerId: otherCustomer.id });

    const defaultCustomerPayload = await postJson(fixture.baseUrl, "/api/customers", token, {
      name: "Default Link Customer",
      city: "Portland",
      status: "Active",
    });
    const defaultCustomer = findByName(defaultCustomerPayload.customers, "Default Link Customer", "Customer");

    const estimatePayload = await postJson(fixture.baseUrl, "/api/estimates", token, {
      customerId: defaultCustomer.id,
      title: "Default Link Estimate",
      status: "draft",
      items: [],
    });
    const estimate = findByName(estimatePayload.estimates, "Default Link Estimate", "Estimate");

    await assertStatus(fixture.baseUrl, `/api/estimates/${estimate.id}`, token, 404, {
      method: "PATCH",
      body: { customerId: otherCustomer.id, title: "Should stay blocked" },
    });
  } finally {
    await fixture.stop();
  }
});
