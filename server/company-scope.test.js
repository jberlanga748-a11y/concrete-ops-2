import assert from "node:assert/strict";
import fs from "node:fs/promises";
import net from "node:net";
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

async function createPort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
  });
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
  const port = await createPort();
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
    body: JSON.stringify({ ...credentials, returnToken: true }),
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
  const record = (records || []).find((item) => item.name === name || item.customer === name || item.title === name || item.label === name || item.summary === name || item.ticketNumber === name);
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

function activeJobAssignmentsForJob(sqliteFile, jobId) {
  const database = new DatabaseSync(sqliteFile);
  try {
    return database.prepare(`
      SELECT company_id AS companyId, job_id AS jobId, user_id AS userId, role_on_job AS roleOnJob
      FROM job_assignments
      WHERE job_id = ? AND removed_at IS NULL
      ORDER BY role_on_job, user_id
    `).all(jobId);
  } finally {
    database.close();
  }
}

function setEstimateLinks(sqliteFile, estimateId, links = {}) {
  const database = new DatabaseSync(sqliteFile);
  try {
    database.prepare(`
      UPDATE estimates
      SET customer_id = ?, lead_id = ?, job_id = ?
      WHERE id = ?
    `).run(links.customerId || "", links.leadId || "", links.jobId || "", estimateId);
  } finally {
    database.close();
  }
}

function setDeliveryTicketLinks(sqliteFile, ticketId, links = {}) {
  const database = new DatabaseSync(sqliteFile);
  try {
    database.prepare(`
      UPDATE delivery_tickets
      SET report_id = ?, ticket_upload_id = ?
      WHERE id = ?
    `).run(links.reportId || "", links.uploadId || "", ticketId);
  } finally {
    database.close();
  }
}

function setUploadLinks(sqliteFile, uploadId, links = {}) {
  const database = new DatabaseSync(sqliteFile);
  try {
    database.prepare(`
      UPDATE uploads
      SET job_id = COALESCE(?, job_id),
          customer_id = ?,
          report_id = ?
      WHERE id = ?
    `).run(links.jobId ?? null, links.customerId || "", links.reportId || "", uploadId);
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
    assert.equal(operatorBootstrap.permissions.apexOs.canView, true);
    assert.equal(operatorBootstrap.companies.some((company) => company.id === "COMPANY-LYF"), true);
    assert.equal(operatorBootstrap.leads.some((lead) => lead.id === "L-LYF-001"), false);

    const switched = await postJson(fixture.baseUrl, "/api/companies/select", operatorLogin.token, {
      companyId: "COMPANY-LYF",
    });
    assert.equal(switched.currentCompanyId, "COMPANY-LYF");
    assert.equal(switched.currentWorkspaceId, "COMPANY-LYF");
    assert.equal(switched.currentCompany.name, "Live Your Future Construction");
    assert.equal(switched.permissions.companies.canSwitch, true);
    assert.equal(switched.permissions.apexOs.canView, false);
    assert.equal(switched.companies.some((company) => company.id === DEFAULT_COMPANY_ID), true);
    assert.equal(switched.leads.some((lead) => lead.id === "L-LYF-001"), true);
    assert.ok(switched.leads.every((lead) => lead.companyId === "COMPANY-LYF"));

    const apexOsInCustomerWorkspace = await requestJson(fixture.baseUrl, "/api/apex-os/memory", {
      headers: authHeaders(operatorLogin.token),
    });
    assert.equal(apexOsInCustomerWorkspace.response.status, 403);

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

    const switchedBack = await postJson(fixture.baseUrl, "/api/companies/select", operatorLogin.token, {
      companyId: DEFAULT_COMPANY_ID,
    });
    assert.equal(switchedBack.permissions.apexOs.canView, true);
    const apexOsInDefaultWorkspace = await requestJson(fixture.baseUrl, "/api/apex-os/memory", {
      headers: authHeaders(operatorLogin.token),
    });
    assert.equal(apexOsInDefaultWorkspace.response.status, 200);
  } finally {
    await fixture.stop();
  }
});

test("activity feed writes stay scoped to the selected company", async () => {
  const fixture = await startServer();

  try {
    insertOtherCompanyLeadData(fixture.sqliteFile);
    enableOperatorAccess(fixture.sqliteFile);

    const operatorLogin = await login(fixture.baseUrl, {
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
    });

    await postJson(fixture.baseUrl, "/api/companies/select", operatorLogin.token, {
      companyId: "COMPANY-LYF",
    });
    await postJson(fixture.baseUrl, "/api/queue-items", operatorLogin.token, {
      title: "LYF scoped activity task",
      meta: "Activity must stay in the LYF workspace.",
      status: "Due today",
    });

    const lyfBootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", {
      headers: authHeaders(operatorLogin.token),
    });
    assert.equal(lyfBootstrap.currentCompanyId, "COMPANY-LYF");
    assert.equal(lyfBootstrap.activity.some((entry) => entry.title === "Queue item added" && entry.detail === "LYF scoped activity task"), true);
    assert.ok(lyfBootstrap.activity.every((entry) => entry.companyId === "COMPANY-LYF"));

    await postJson(fixture.baseUrl, "/api/companies/select", operatorLogin.token, {
      companyId: DEFAULT_COMPANY_ID,
    });
    const defaultBootstrapBeforeCreate = await assertOk(fixture.baseUrl, "/api/bootstrap", {
      headers: authHeaders(operatorLogin.token),
    });
    assert.equal(defaultBootstrapBeforeCreate.currentCompanyId, DEFAULT_COMPANY_ID);
    assert.equal(defaultBootstrapBeforeCreate.activity.some((entry) => entry.detail === "LYF scoped activity task"), false);

    await postJson(fixture.baseUrl, "/api/queue-items", operatorLogin.token, {
      title: "Default scoped activity task",
      meta: "Activity must stay in the default workspace.",
      status: "Due today",
    });
    const defaultBootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", {
      headers: authHeaders(operatorLogin.token),
    });
    assert.equal(defaultBootstrap.activity.some((entry) => entry.title === "Queue item added" && entry.detail === "Default scoped activity task"), true);
    assert.equal(defaultBootstrap.activity.some((entry) => entry.detail === "LYF scoped activity task"), false);
    assert.ok(defaultBootstrap.activity.every((entry) => entry.companyId === DEFAULT_COMPANY_ID));
  } finally {
    await fixture.stop();
  }
});

test("operator job assignments are stamped to the selected job company", async () => {
  const fixture = await startServer();

  try {
    insertOtherCompanyLeadData(fixture.sqliteFile);
    enableOperatorAccess(fixture.sqliteFile);
    const lyfForeman = createUserRecord({
      id: "U-LYF-ASSIGN-FOREMAN",
      email: "lyf-assign-foreman@lastyard.test",
      password: "apexdemo123",
      name: "LYF Assignment Foreman",
      role: "Foreman",
      companyId: "COMPANY-LYF",
    });
    const lyfEmployee = createUserRecord({
      id: "U-LYF-ASSIGN-EMPLOYEE",
      email: "lyf-assign-employee@lastyard.test",
      password: "apexdemo123",
      name: "LYF Assignment Employee",
      role: "Employee",
      companyId: "COMPANY-LYF",
    });
    insertUserRecord(fixture.sqliteFile, lyfForeman);
    insertUserRecord(fixture.sqliteFile, lyfEmployee);

    const operatorLogin = await login(fixture.baseUrl, {
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
    });
    await postJson(fixture.baseUrl, "/api/companies/select", operatorLogin.token, {
      companyId: "COMPANY-LYF",
    });

    const createdWithAssignments = await postJson(fixture.baseUrl, "/api/jobs", operatorLogin.token, {
      title: "LYF Assigned On Create",
      customer: "LYF Assignment Customer",
      city: "Portland",
      status: "scheduled",
      assignedForemanId: lyfForeman.id,
      assignedUserId: lyfEmployee.id,
    });
    const createJob = findByName(createdWithAssignments.jobs, "LYF Assigned On Create", "Job");
    assert.equal(companyIdForRecord(fixture.sqliteFile, "jobs", createJob.id), "COMPANY-LYF");
    assert.deepEqual(new Set(activeJobAssignmentsForJob(fixture.sqliteFile, createJob.id).map((assignment) => assignment.companyId)), new Set(["COMPANY-LYF"]));

    const createdForRouteAssignment = await postJson(fixture.baseUrl, "/api/jobs", operatorLogin.token, {
      title: "LYF Route Assignment",
      customer: "LYF Assignment Customer",
      city: "Portland",
      status: "scheduled",
    });
    const routeJob = findByName(createdForRouteAssignment.jobs, "LYF Route Assignment", "Job");
    await postJson(fixture.baseUrl, `/api/jobs/${routeJob.id}/assignments`, operatorLogin.token, {
      userId: lyfEmployee.id,
      roleOnJob: "crew",
    });
    assert.deepEqual(new Set(activeJobAssignmentsForJob(fixture.sqliteFile, routeJob.id).map((assignment) => assignment.companyId)), new Set(["COMPANY-LYF"]));

    const createdForPatchAssignment = await postJson(fixture.baseUrl, "/api/jobs", operatorLogin.token, {
      title: "LYF Patch Assignment",
      customer: "LYF Assignment Customer",
      city: "Portland",
      status: "scheduled",
    });
    const patchJob = findByName(createdForPatchAssignment.jobs, "LYF Patch Assignment", "Job");
    await assertOk(fixture.baseUrl, `/api/jobs/${patchJob.id}`, {
      method: "PATCH",
      headers: authHeaders(operatorLogin.token),
      body: JSON.stringify({ assignedForemanId: lyfForeman.id }),
    });
    assert.deepEqual(new Set(activeJobAssignmentsForJob(fixture.sqliteFile, patchJob.id).map((assignment) => assignment.companyId)), new Set(["COMPANY-LYF"]));
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

test("company settings ignore client-supplied company scope fields", async () => {
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
    assert.equal(defaultBootstrap.currentCompanyId, DEFAULT_COMPANY_ID);

    const updatedDefault = await assertOk(fixture.baseUrl, "/api/settings/company", {
      method: "PATCH",
      headers: authHeaders(token),
      body: JSON.stringify({
        companyId: "COMPANY-LYF",
        currentCompanyId: "COMPANY-LYF",
        selectedCompanyId: "COMPANY-LYF",
        companyName: "Default Workspace Only",
        businessEmail: "default-only@apexhq.test",
      }),
    });
    assert.equal(updatedDefault.currentCompanyId, DEFAULT_COMPANY_ID);
    assert.equal(updatedDefault.companySettings.companyName, "Default Workspace Only");
    assert.equal(updatedDefault.companySettings.businessEmail, "default-only@apexhq.test");

    const switched = await postJson(fixture.baseUrl, "/api/companies/select", token, {
      companyId: "COMPANY-LYF",
    });
    assert.equal(switched.currentCompanyId, "COMPANY-LYF");
    assert.notEqual(switched.companySettings.companyName, "Default Workspace Only");
    assert.notEqual(switched.companySettings.businessEmail, "default-only@apexhq.test");
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

test("estimate responses do not hydrate stale cross-company linked records", async () => {
  const fixture = await startServer();

  try {
    const ownerLogin = await login(fixture.baseUrl, {
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
    });
    const token = ownerLogin.token;
    const headers = authHeaders(token);

    const hiddenCustomerPayload = await postJson(fixture.baseUrl, "/api/customers", token, {
      name: "Hidden Estimate Link Customer",
      city: "Portland",
      status: "Active",
    });
    const hiddenCustomer = findByName(hiddenCustomerPayload.customers, "Hidden Estimate Link Customer", "Customer");
    const hiddenLeadPayload = await postJson(fixture.baseUrl, "/api/leads", token, {
      customer: "Hidden Estimate Link Lead",
      city: "Portland",
      project: "Hidden estimate link project",
      source: "Call-in",
    });
    const hiddenLead = findByName(hiddenLeadPayload.leads, "Hidden Estimate Link Lead", "Lead");
    const hiddenJobPayload = await postJson(fixture.baseUrl, "/api/jobs", token, {
      title: "Hidden Estimate Link Job",
      customer: "Hidden Estimate Link Customer",
      city: "Portland",
      status: "scheduled",
    });
    const hiddenJob = findByName(hiddenJobPayload.jobs, "Hidden Estimate Link Job", "Job");
    moveRecordsToOtherCompany(fixture.sqliteFile, {
      customerId: hiddenCustomer.id,
      leadId: hiddenLead.id,
      jobId: hiddenJob.id,
    });

    const defaultCustomerPayload = await postJson(fixture.baseUrl, "/api/customers", token, {
      name: "Visible Estimate Customer",
      city: "Salem",
      status: "Active",
    });
    const defaultCustomer = findByName(defaultCustomerPayload.customers, "Visible Estimate Customer", "Customer");
    const estimatePayload = await postJson(fixture.baseUrl, "/api/estimates", token, {
      customerId: defaultCustomer.id,
      title: "Visible Estimate With Stale Links",
      status: "draft",
      items: [],
    });
    const estimate = findByName(estimatePayload.estimates, "Visible Estimate With Stale Links", "Estimate");
    setEstimateLinks(fixture.sqliteFile, estimate.id, {
      customerId: hiddenCustomer.id,
      leadId: hiddenLead.id,
      jobId: hiddenJob.id,
    });

    const estimatesResponse = await assertOk(fixture.baseUrl, "/api/estimates", { headers });
    const responseEstimate = findByName(estimatesResponse.estimates, "Visible Estimate With Stale Links", "Estimate");
    assert.equal(responseEstimate.customer, null);
    assert.equal(responseEstimate.lead, null);
    assert.equal(responseEstimate.job, null);
    const serializedEstimates = JSON.stringify(estimatesResponse);
    assert.equal(serializedEstimates.includes("Hidden Estimate Link Customer"), false);
    assert.equal(serializedEstimates.includes("Hidden Estimate Link Lead"), false);
    assert.equal(serializedEstimates.includes("Hidden estimate link project"), false);
    assert.equal(serializedEstimates.includes("Hidden Estimate Link Job"), false);

    const bootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", { headers });
    const bootstrapEstimate = findByName(bootstrap.estimates, "Visible Estimate With Stale Links", "Estimate");
    assert.equal(bootstrapEstimate.customer, null);
    assert.equal(bootstrapEstimate.lead, null);
    assert.equal(bootstrapEstimate.job, null);
  } finally {
    await fixture.stop();
  }
});

test("delivery ticket responses do not hydrate stale cross-company linked records", async () => {
  const fixture = await startServer();

  try {
    const ownerLogin = await login(fixture.baseUrl, {
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
    });
    const token = ownerLogin.token;
    const headers = authHeaders(token);
    const initial = await assertOk(fixture.baseUrl, "/api/bootstrap", { headers });

    const hiddenReportPayload = await postJson(fixture.baseUrl, "/api/daily-reports", token, {
      jobId: "J-2201",
      reportDate: "2026-05-16",
      crewSummary: "Hidden delivery link crew",
      workPerformed: "Hidden delivery report work.",
    });
    const hiddenReport = findAddedRecord(initial.dailyReports, hiddenReportPayload.dailyReports, "Daily report");
    const hiddenUploadPayload = await postJson(fixture.baseUrl, "/api/uploads", token, {
      jobId: "J-2201",
      fileName: "hidden-delivery-ticket-proof.png",
      fileType: "image/png",
      dataUrl: "data:image/png;base64,aGVsbG8=",
      caption: "Hidden delivery ticket proof",
    });
    const hiddenUpload = findAddedRecord(hiddenReportPayload.uploads, hiddenUploadPayload.uploads, "Upload");
    moveRecordsToOtherCompany(fixture.sqliteFile, {
      dailyReportId: hiddenReport.id,
      uploadId: hiddenUpload.id,
    });

    const ticketPayload = await postJson(fixture.baseUrl, "/api/delivery-tickets", token, {
      jobId: "J-2201",
      supplier: "Visible Delivery Supplier",
      ticketNumber: "VISIBLE-STALENESS-1",
      yardsDelivered: 4,
    });
    const ticket = findByName(ticketPayload.deliveryTickets, "VISIBLE-STALENESS-1", "Delivery ticket");
    setDeliveryTicketLinks(fixture.sqliteFile, ticket.id, {
      reportId: hiddenReport.id,
      uploadId: hiddenUpload.id,
    });

    const ticketsResponse = await assertOk(fixture.baseUrl, "/api/delivery-tickets", { headers });
    const responseTicket = findByName(ticketsResponse.deliveryTickets, "VISIBLE-STALENESS-1", "Delivery ticket");
    assert.equal(responseTicket.report, null);
    assert.equal(responseTicket.ticketUpload, null);
    const serializedTickets = JSON.stringify(ticketsResponse);
    assert.equal(serializedTickets.includes("Hidden delivery link crew"), false);
    assert.equal(serializedTickets.includes("Hidden delivery report work"), false);
    assert.equal(serializedTickets.includes("hidden-delivery-ticket-proof.png"), false);
    assert.equal(serializedTickets.includes("Hidden delivery ticket proof"), false);

    const bootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", { headers });
    const bootstrapTicket = findByName(bootstrap.deliveryTickets, "VISIBLE-STALENESS-1", "Delivery ticket");
    assert.equal(bootstrapTicket.report, null);
    assert.equal(bootstrapTicket.ticketUpload, null);
  } finally {
    await fixture.stop();
  }
});

test("upload responses do not hydrate stale cross-company linked records", async () => {
  const fixture = await startServer();

  try {
    const ownerLogin = await login(fixture.baseUrl, {
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
    });
    const token = ownerLogin.token;
    const headers = authHeaders(token);
    const initial = await assertOk(fixture.baseUrl, "/api/bootstrap", { headers });

    const hiddenCustomerPayload = await postJson(fixture.baseUrl, "/api/customers", token, {
      name: "Hidden Upload Link Customer",
      city: "Portland",
      status: "Active",
    });
    const hiddenCustomer = findByName(hiddenCustomerPayload.customers, "Hidden Upload Link Customer", "Customer");
    const hiddenReportPayload = await postJson(fixture.baseUrl, "/api/daily-reports", token, {
      jobId: "J-2201",
      reportDate: "2035-07-19",
      crewSummary: "Hidden upload report crew",
      workPerformed: "Hidden upload report work.",
    });
    const hiddenReport = findAddedRecord(initial.dailyReports, hiddenReportPayload.dailyReports, "Daily report");
    moveRecordsToOtherCompany(fixture.sqliteFile, {
      customerId: hiddenCustomer.id,
      dailyReportId: hiddenReport.id,
    });

    const visibleUploadPayload = await postJson(fixture.baseUrl, "/api/uploads", token, {
      jobId: "J-2201",
      fileName: "visible-upload-proof.png",
      fileType: "image/png",
      dataUrl: "data:image/png;base64,aGVsbG8=",
      caption: "Visible upload with stale linked records",
    });
    const visibleUpload = findAddedRecord(initial.uploads, visibleUploadPayload.uploads, "Upload");
    setUploadLinks(fixture.sqliteFile, visibleUpload.id, {
      customerId: hiddenCustomer.id,
      reportId: hiddenReport.id,
    });

    const hiddenJobPayload = await postJson(fixture.baseUrl, "/api/jobs", token, {
      title: "Hidden Upload Link Job",
      customer: "Hidden Upload Link Job Customer",
      address: "101 Hidden Upload Way",
      city: "Eugene",
      status: "scheduled",
    });
    const hiddenJob = findByName(hiddenJobPayload.jobs, "Hidden Upload Link Job", "Job");
    moveRecordsToOtherCompany(fixture.sqliteFile, {
      jobId: hiddenJob.id,
      customerId: hiddenJob.customerId,
    });
    const staleJobUploadPayload = await postJson(fixture.baseUrl, "/api/uploads", token, {
      jobId: "J-2201",
      fileName: "visible-upload-stale-job-proof.png",
      fileType: "image/png",
      dataUrl: "data:image/png;base64,aGVsbG8=",
      caption: "Visible upload with stale job",
    });
    const staleJobUpload = findAddedRecord(visibleUploadPayload.uploads, staleJobUploadPayload.uploads, "Upload");
    setUploadLinks(fixture.sqliteFile, staleJobUpload.id, {
      jobId: hiddenJob.id,
      customerId: hiddenJob.customerId,
    });

    const uploadsResponse = await assertOk(fixture.baseUrl, "/api/uploads", { headers });
    const responseUpload = findById(uploadsResponse.uploads, visibleUpload.id, "Upload");
    assert.equal(responseUpload.customerName, "");
    assert.equal(responseUpload.reportDate, "");
    assert.equal(uploadsResponse.uploads.some((record) => record.id === staleJobUpload.id), false);
    const serializedUploads = JSON.stringify(uploadsResponse.uploads);
    assert.equal(serializedUploads.includes("Hidden Upload Link Customer"), false);
    assert.equal(serializedUploads.includes("2035-07-19"), false);
    assert.equal(serializedUploads.includes("Hidden Upload Link Job"), false);
    assert.equal(serializedUploads.includes("Hidden Upload Link Job Customer"), false);
    assert.equal(serializedUploads.includes("101 Hidden Upload Way"), false);

    const bootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", { headers });
    const bootstrapUpload = findById(bootstrap.uploads, visibleUpload.id, "Upload");
    assert.equal(bootstrapUpload.customerName, "");
    assert.equal(bootstrapUpload.reportDate, "");
    assert.equal(bootstrap.uploads.some((record) => record.id === staleJobUpload.id), false);
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
