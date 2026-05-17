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

function enableOperatorAccess(sqliteFile, email = "demo.ops@apexhq.app") {
  const database = new DatabaseSync(sqliteFile);
  try {
    database.prepare(`
      UPDATE users
      SET operator_access = 1
      WHERE email = ?
    `).run(email);
  } finally {
    database.close();
  }
}

function insertUserRecord(sqliteFile, user) {
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
      ["contact_history", recordIds.contactHistoryId],
      ["queue_items", recordIds.queueItemId],
      ["safety_policies", recordIds.safetyPolicyId],
      ["ppe_items", recordIds.ppeItemId],
      ["safety_incidents", recordIds.safetyIncidentId],
      ["pre_pour_checklists", recordIds.prePourChecklistId],
      ["post_pour_checklists", recordIds.postPourChecklistId],
      ["tool_checklists", recordIds.toolChecklistId],
      ["calculator_results", recordIds.calculatorResultId],
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
  const record = (records || []).find((item) => item.name === name || item.customer === name || item.title === name || item.label === name || item.summary === name);
  assert.ok(record, `${label} named ${name} should be present in bootstrap payload.`);
  return record;
}

function findAddedRecord(beforeRecords, afterRecords, label) {
  const beforeIds = new Set((beforeRecords || []).map((record) => record.id));
  const record = (afterRecords || []).find((item) => !beforeIds.has(item.id));
  assert.ok(record, `${label} should be present in the updated payload.`);
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
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
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

    await assertStatus(fixture.baseUrl, "/api/companies/select", ownerLogin.token, 403, {
      body: { companyId: "COMPANY-LYF" },
    });
  } finally {
    await fixture.stop();
  }
});

test("operator user can switch companies without leaking selected company access to normal users", async () => {
  const fixture = await startServer();

  try {
    insertOtherCompanyLeadData(fixture.sqliteFile);
    enableOperatorAccess(fixture.sqliteFile);

    const operatorLogin = await login(fixture.baseUrl, {
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
    });

    const operatorBootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", {
      headers: authHeaders(operatorLogin.token),
    });
    assert.equal(operatorBootstrap.permissions.companies.canSwitch, true);
    assert.equal(operatorBootstrap.companies.some((company) => company.id === "COMPANY-LYF"), true);
    assert.equal(operatorBootstrap.leads.some((lead) => lead.id === "L-LYF-001"), false);

    const switched = await postJson(fixture.baseUrl, "/api/companies/select", operatorLogin.token, {
      companyId: "COMPANY-LYF",
    });
    assert.equal(switched.currentCompanyId, "COMPANY-LYF");
    assert.equal(switched.currentWorkspaceId, "COMPANY-LYF");
    assert.equal(switched.currentCompany.name, "Live Your Future Construction");
    assert.equal(switched.companies.some((company) => company.id === DEFAULT_COMPANY_ID), true);
    assert.equal(switched.leads.some((lead) => lead.id === "L-LYF-001"), true);
    assert.ok(switched.leads.every((lead) => lead.companyId === "COMPANY-LYF"));

    const createdLeadPayload = await postJson(fixture.baseUrl, "/api/leads", operatorLogin.token, {
      customer: "Operator LYF Lead",
      city: "Portland",
      project: "Selected workspace lead",
      source: "Call-in",
      owner: "LYF Office",
      ownerId: "",
    });
    const createdLead = findByName(createdLeadPayload.leads, "Operator LYF Lead", "Lead");
    assert.equal(companyIdForRecord(fixture.sqliteFile, "leads", createdLead.id), "COMPANY-LYF");

    const invalidSwitch = await assertStatus(fixture.baseUrl, "/api/companies/select", operatorLogin.token, 404, {
      body: { companyId: "COMPANY-MISSING" },
    });
    assert.match(invalidSwitch.error, /not found/i);
  } finally {
    await fixture.stop();
  }
});

test("operator company settings remain scoped to the selected company", async () => {
  const fixture = await startServer();

  try {
    insertOtherCompanyLeadData(fixture.sqliteFile);
    enableOperatorAccess(fixture.sqliteFile);

    const operatorLogin = await login(fixture.baseUrl, {
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
    });
    const token = operatorLogin.token;

    const defaultBootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", {
      headers: authHeaders(token),
    });
    const defaultCompanyName = defaultBootstrap.companySettings.companyName;

    const switched = await postJson(fixture.baseUrl, "/api/companies/select", token, {
      companyId: "COMPANY-LYF",
    });
    assert.equal(switched.currentCompanyId, "COMPANY-LYF");

    const lyfSettings = await assertOk(fixture.baseUrl, "/api/settings/company", {
      method: "PATCH",
      headers: authHeaders(token),
      body: JSON.stringify({
        companyName: "Live Your Future HQ",
        businessEmail: "office@liveyourfuture.test",
        serviceArea: "Albany and surrounding exterior trades",
        toolChecklistEnabled: false,
      }),
    });
    assert.equal(lyfSettings.currentCompanyId, "COMPANY-LYF");
    assert.equal(lyfSettings.companySettings.companyName, "Live Your Future HQ");
    assert.equal(lyfSettings.companySettings.toolChecklistEnabled, false);

    const backToDefault = await postJson(fixture.baseUrl, "/api/companies/select", token, {
      companyId: DEFAULT_COMPANY_ID,
    });
    assert.equal(backToDefault.currentCompanyId, DEFAULT_COMPANY_ID);
    assert.equal(backToDefault.companySettings.companyName, defaultCompanyName);
    assert.notEqual(backToDefault.companySettings.companyName, "Live Your Future HQ");
    assert.equal(backToDefault.companySettings.toolChecklistEnabled, true);

    const backToLyf = await postJson(fixture.baseUrl, "/api/companies/select", token, {
      companyId: "COMPANY-LYF",
    });
    assert.equal(backToLyf.currentCompanyId, "COMPANY-LYF");
    assert.equal(backToLyf.companySettings.companyName, "Live Your Future HQ");
    assert.equal(backToLyf.companySettings.businessEmail, "office@liveyourfuture.test");
    assert.equal(backToLyf.companySettings.toolChecklistEnabled, false);
  } finally {
    await fixture.stop();
  }
});

test("field roles cannot switch companies even if the flag is present", async () => {
  const fixture = await startServer();

  try {
    insertOtherCompanyLeadData(fixture.sqliteFile);
    insertUserRecord(fixture.sqliteFile, createUserRecord({
      id: "U-FIELD-OPERATOR-FLAG",
      email: "field-operator-flag@lastyard.test",
      password: "apexdemo123",
      name: "Flagged Foreman",
      role: "Foreman",
      operatorAccess: true,
    }));

    const foremanLogin = await login(fixture.baseUrl, {
      email: "field-operator-flag@lastyard.test",
      password: "apexdemo123",
    });

    const foremanBootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", {
      headers: authHeaders(foremanLogin.token),
    });
    assert.equal(foremanBootstrap.permissions.companies.canSwitch, false);
    assert.equal(foremanBootstrap.companies.length, 1);

    await assertStatus(fixture.baseUrl, "/api/companies/select", foremanLogin.token, 403, {
      body: { companyId: "COMPANY-LYF" },
    });
  } finally {
    await fixture.stop();
  }
});

test("create routes stamp records with the current default company", async () => {
  const fixture = await startServer();

  try {
    const ownerLogin = await login(fixture.baseUrl, {
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
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
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
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

test("field workflow records stay scoped after being assigned to another company", async () => {
  const fixture = await startServer();

  try {
    const ownerLogin = await login(fixture.baseUrl, {
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
    });
    const token = ownerLogin.token;
    const headers = authHeaders(token);
    const initial = await assertOk(fixture.baseUrl, "/api/bootstrap", { headers });

    const policyPayload = await postJson(fixture.baseUrl, "/api/safety/policies", token, {
      title: "Other Company Harness Rule",
      body: "Other company rule that must stay hidden from this workspace.",
      category: "Fall protection",
    });
    const policy = findByName(policyPayload.safetyPolicies, "Other Company Harness Rule", "Safety policy");

    const ppePayload = await postJson(fixture.baseUrl, "/api/safety/ppe-items", token, {
      label: "Other Company Respirator",
      description: "Other company PPE item.",
      requiredByDefault: true,
    });
    const ppeItem = findByName(ppePayload.ppeItems, "Other Company Respirator", "PPE item");

    const incidentPayload = await postJson(fixture.baseUrl, "/api/safety/incidents", token, {
      jobId: "J-2201",
      title: "Other Company Near Miss",
      description: "Other company safety incident.",
      type: "near_miss",
      severity: "medium",
    });
    const incident = findByName(incidentPayload.safetyIncidents, "Other Company Near Miss", "Safety incident");

    const toolPayload = await postJson(fixture.baseUrl, "/api/tool-checklists", token, {
      jobId: "J-2201",
      title: "Other Company Tool Loadout",
    });
    const toolChecklist = findByName(toolPayload.toolChecklists, "Other Company Tool Loadout", "Tool checklist");

    const prePourPayload = await postJson(fixture.baseUrl, "/api/pre-pour-checklists", token, {
      jobId: "J-2201",
      notes: "Other company pre-pour setup.",
    });
    const prePourChecklist = findAddedRecord(initial.prePourChecklists, prePourPayload.prePourChecklists, "Pre-pour checklist");

    const postPourPayload = await postJson(fixture.baseUrl, "/api/post-pour-checklists", token, {
      jobId: "J-2201",
      notes: "Other company post-pour setup.",
    });
    const postPourChecklist = findAddedRecord(initial.postPourChecklists, postPourPayload.postPourChecklists, "Post-pour checklist");

    const calculatorPayload = await postJson(fixture.baseUrl, "/api/calculator-results", token, {
      jobId: "J-2201",
      calculatorType: "slab",
      inputsJson: { length: 20, width: 12, thicknessInches: 4 },
      wastePercent: 10,
      cubicFeet: 80,
      cubicYards: 2.96,
      cubicYardsWithWaste: 3.26,
      summary: "Other Company Slab Calculation",
      notes: "Other company internal calculator result.",
    });
    const calculatorResult = findByName(calculatorPayload.calculatorResults, "Other Company Slab Calculation", "Calculator result");

    moveRecordsToOtherCompany(fixture.sqliteFile, {
      safetyPolicyId: policy.id,
      ppeItemId: ppeItem.id,
      safetyIncidentId: incident.id,
      toolChecklistId: toolChecklist.id,
      prePourChecklistId: prePourChecklist.id,
      postPourChecklistId: postPourChecklist.id,
      calculatorResultId: calculatorResult.id,
    });

    const scoped = await assertOk(fixture.baseUrl, "/api/bootstrap", { headers });
    assert.equal(scoped.safetyPolicies.some((record) => record.id === policy.id), false);
    assert.equal(scoped.ppeItems.some((record) => record.id === ppeItem.id), false);
    assert.equal(scoped.safetyIncidents.some((record) => record.id === incident.id), false);
    assert.equal(scoped.toolChecklists.some((record) => record.id === toolChecklist.id), false);
    assert.equal(scoped.prePourChecklists.some((record) => record.id === prePourChecklist.id), false);
    assert.equal(scoped.postPourChecklists.some((record) => record.id === postPourChecklist.id), false);
    assert.equal(scoped.calculatorResults.some((record) => record.id === calculatorResult.id), false);

    await assertStatus(fixture.baseUrl, `/api/safety/policies/${policy.id}`, token, 404, {
      method: "PATCH",
      body: { title: "Cross-company safety edit" },
    });
    await assertStatus(fixture.baseUrl, `/api/safety/ppe-items/${ppeItem.id}`, token, 404, {
      method: "PATCH",
      body: { label: "Cross-company PPE edit" },
    });
    await assertStatus(fixture.baseUrl, `/api/safety/incidents/${incident.id}/review`, token, 404);
    await assertStatus(fixture.baseUrl, `/api/tool-checklists/${toolChecklist.id}`, token, 404, {
      method: "PATCH",
      body: { title: "Cross-company checklist edit" },
    });
    await assertStatus(fixture.baseUrl, `/api/pre-pour-checklists/${prePourChecklist.id}`, token, 404, {
      method: "PATCH",
      body: { notes: "Cross-company pre-pour edit" },
    });
    await assertStatus(fixture.baseUrl, `/api/post-pour-checklists/${postPourChecklist.id}`, token, 404, {
      method: "PATCH",
      body: { notes: "Cross-company post-pour edit" },
    });
  } finally {
    await fixture.stop();
  }
});

test("cross-company links are blocked on default-company mutations", async () => {
  const fixture = await startServer();

  try {
    const ownerLogin = await login(fixture.baseUrl, {
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
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

test("proof, time, contact history, and queue records remain company-isolated", async () => {
  const fixture = await startServer();

  try {
    const ownerLogin = await login(fixture.baseUrl, {
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
    });
    const token = ownerLogin.token;
    const headers = authHeaders(token);
    const initial = await assertOk(fixture.baseUrl, "/api/bootstrap", { headers });
    const today = new Date().toISOString().slice(0, 10);
    const foremanUser = createUserRecord({
      id: "U-SCOPE-PROOF-FOREMAN",
      email: "scope-proof-foreman@lastyard.test",
      password: "apexdemo123",
      name: "Scope Proof Foreman",
      role: "Foreman",
    });
    insertUserRecord(fixture.sqliteFile, foremanUser);
    await postJson(fixture.baseUrl, "/api/jobs/J-2201/assignments", token, {
      userId: foremanUser.id,
      roleOnJob: "foreman",
    });

    const reportPayload = await postJson(fixture.baseUrl, "/api/daily-reports", token, {
      jobId: "J-2201",
      reportDate: today,
      crewSummary: "Other company crew",
      workPerformed: "Other company daily report.",
    });
    const report = findAddedRecord(initial.dailyReports, reportPayload.dailyReports, "Daily report");

    const uploadPayload = await postJson(fixture.baseUrl, "/api/uploads", token, {
      jobId: "J-2201",
      fileName: "other-company-proof.png",
      fileType: "image/png",
      dataUrl: "data:image/png;base64,aGVsbG8=",
      caption: "Other company proof",
    });
    const upload = findAddedRecord(initial.uploads, uploadPayload.uploads, "Upload");

    const ticketPayload = await postJson(fixture.baseUrl, "/api/delivery-tickets", token, {
      jobId: "J-2201",
      reportId: report.id,
      supplier: "Other Company Ready Mix",
      ticketNumber: "OC-1001",
      yardsDelivered: 3,
    });
    const ticket = findAddedRecord(initial.deliveryTickets, ticketPayload.deliveryTickets, "Delivery ticket");

    const foremanLogin = await login(fixture.baseUrl, {
      email: foremanUser.email,
      password: "apexdemo123",
    });
    const timePayload = await postJson(fixture.baseUrl, "/api/time-entries/clock-in", foremanLogin.token, {
      workCategory: "job",
      jobId: "J-2201",
      notes: "Other company time entry",
    });
    const timeEntry = findAddedRecord(initial.timeEntries, timePayload.timeEntries, "Time entry");

    const leadPayload = await postJson(fixture.baseUrl, "/api/leads", token, {
      customer: "Other Company Contact Lead",
      city: "Portland",
      project: "Other company contact scope",
      source: "Call-in",
    });
    const lead = findByName(leadPayload.leads, "Other Company Contact Lead", "Lead");

    const contactPayload = await postJson(fixture.baseUrl, "/api/contact-history", token, {
      entityType: "lead",
      entityId: lead.id,
      contactName: "Other Company Contact",
      method: "Call",
      direction: "outbound",
      outcome: "Follow-Up Needed",
      notes: "Other company contact history.",
    });
    const contact = findAddedRecord(initial.contactHistory, contactPayload.contactHistory, "Contact history");

    const queuePayload = await postJson(fixture.baseUrl, "/api/queue-items", token, {
      title: "Other company queue item",
      meta: "Must stay hidden from default company.",
      status: "Due today",
    });
    const queueItem = findByName(queuePayload.queueItems, "Other company queue item", "Queue item");

    moveRecordsToOtherCompany(fixture.sqliteFile, {
      dailyReportId: report.id,
      uploadId: upload.id,
      deliveryTicketId: ticket.id,
      timeEntryId: timeEntry.id,
      leadId: lead.id,
      contactHistoryId: contact.id,
      queueItemId: queueItem.id,
    });

    const scopedBootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", { headers });
    assert.equal(scopedBootstrap.dailyReports.some((record) => record.id === report.id), false);
    assert.equal(scopedBootstrap.uploads.some((record) => record.id === upload.id), false);
    assert.equal(scopedBootstrap.deliveryTickets.some((record) => record.id === ticket.id), false);
    assert.equal(scopedBootstrap.timeEntries.some((record) => record.id === timeEntry.id), false);
    assert.equal(scopedBootstrap.contactHistory.some((record) => record.id === contact.id), false);
    assert.equal(scopedBootstrap.queueItems.some((record) => record.id === queueItem.id), false);

    const scopedReports = await assertOk(fixture.baseUrl, "/api/daily-reports", { headers });
    assert.equal(scopedReports.dailyReports.some((record) => record.id === report.id), false);
    const scopedUploads = await assertOk(fixture.baseUrl, "/api/uploads", { headers });
    assert.equal(scopedUploads.uploads.some((record) => record.id === upload.id), false);
    const scopedTickets = await assertOk(fixture.baseUrl, "/api/delivery-tickets", { headers });
    assert.equal(scopedTickets.deliveryTickets.some((record) => record.id === ticket.id), false);
    const scopedTime = await assertOk(fixture.baseUrl, "/api/time-entries", { headers });
    assert.equal(scopedTime.timeEntries.some((record) => record.id === timeEntry.id), false);
    const scopedContact = await assertOk(fixture.baseUrl, "/api/contact-history", { headers });
    assert.equal(scopedContact.contactHistory.some((record) => record.id === contact.id), false);

    const crossCompanyUploadContent = await fetch(`${fixture.baseUrl}/api/uploads/${upload.id}/content`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(crossCompanyUploadContent.status, 404);

    await assertStatus(fixture.baseUrl, `/api/daily-reports/${report.id}`, token, 404, {
      method: "PATCH",
      body: { workPerformed: "Cross-company report edit" },
    });
    await assertStatus(fixture.baseUrl, `/api/uploads/${upload.id}`, token, 404, {
      method: "PATCH",
      body: { caption: "Cross-company upload edit" },
    });
    await assertStatus(fixture.baseUrl, `/api/delivery-tickets/${ticket.id}`, token, 404, {
      method: "PATCH",
      body: { notes: "Cross-company delivery edit" },
    });
    await assertStatus(fixture.baseUrl, `/api/time-entries/${timeEntry.id}`, token, 404, {
      method: "PATCH",
      body: { notes: "Cross-company time edit" },
    });
    await assertStatus(fixture.baseUrl, `/api/contact-history/${contact.id}`, token, 404, {
      method: "PATCH",
      body: { notes: "Cross-company contact edit" },
    });
    await assertStatus(fixture.baseUrl, `/api/queue-items/${queueItem.id}/toggle`, token, 404, {
      method: "PATCH",
    });
  } finally {
    await fixture.stop();
  }
});
