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
  return 5300 + Math.floor(Math.random() * 1000);
}

async function waitForServer(baseUrl, serverOutput) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/ready`);
      if (response.ok) {
        return;
      }
    } catch {
      // Poll until the server becomes ready.
    }
    await sleep(250);
  }

  throw new Error(`Lead workflow test server did not become ready.\n${serverOutput()}`);
}

async function startServer() {
  const tempDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "concrete-ops-leads-"));
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
      INSERT INTO users (id, email, name, role, password_hash)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (const user of users) {
      insertUser.run(user.id, user.email, user.name, user.role, user.passwordHash);
    }
  } finally {
    database.close();
  }
}

test("lead workflow supports assignment, status history, customer linking, archive/restore, and customer conversion", async () => {
  const fixture = await startServer();

  try {
    const ownerLogin = await login(fixture.baseUrl, {
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
    });
    const headers = authHeaders(ownerLogin.token);
    const before = await assertOk(fixture.baseUrl, "/api/bootstrap", { headers });

    assert.equal(before.permissions.leads.canView, true);
    assert.equal(before.permissions.leads.canManage, true);
    assert.equal(before.permissions.leads.canViewSources, true);
    assert.equal(before.permissions.leads.canManageSources, true);
    assert.ok(Array.isArray(before.leadSources), "Expected lead sources to be present in bootstrap state.");

    const existingCustomer = before.customers.find((customer) => !customer.archivedAt);
    assert.ok(existingCustomer, "Expected seeded customers to be available.");

    const sourceState = await assertOk(fixture.baseUrl, "/api/lead-sources", {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: "Albany bid page",
        type: "City/county/school bid page",
        url: "albany.example.com/bids",
        city: "Albany",
        state: "or",
        serviceArea: "Albany and Linn County",
        tradeFocus: "Sidewalks and ADA ramps",
        notes: "Manual source only. No passwords stored.",
        checkCadence: "Weekly",
        nextCheckAt: "2026-05-12",
      }),
    });
    const createdSource = sourceState.leadSources.find((source) => source.name === "Albany bid page");
    assert.ok(createdSource, "Expected created lead source to be returned.");
    assert.equal(createdSource.url, "https://albany.example.com/bids");
    assert.equal(createdSource.state, "OR");
    assert.equal(createdSource.status, "Active");
    assert.ok(sourceState.auditEvents.some((event) => event.entityType === "leadSource" && event.entityId === createdSource.id && event.action === "created"));

    const updatedSourceState = await assertOk(fixture.baseUrl, `/api/lead-sources/${createdSource.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        checkCadence: "Monthly",
        lastCheckedAt: "2026-05-11",
        notes: "Checked manually by office.",
      }),
    });
    const updatedSource = updatedSourceState.leadSources.find((source) => source.id === createdSource.id);
    assert.equal(updatedSource.checkCadence, "Monthly");
    assert.equal(updatedSource.lastCheckedAt, "2026-05-11");

    const inactiveSourceState = await assertOk(fixture.baseUrl, `/api/lead-sources/${createdSource.id}/archive`, {
      method: "POST",
      headers,
    });
    const inactiveSource = inactiveSourceState.leadSources.find((source) => source.id === createdSource.id);
    assert.equal(inactiveSource.status, "Inactive");
    assert.ok(inactiveSource.archivedAt, "Expected deactivation to stamp archivedAt.");

    const restoredSourceState = await assertOk(fixture.baseUrl, `/api/lead-sources/${createdSource.id}/restore`, {
      method: "POST",
      headers,
    });
    const restoredSource = restoredSourceState.leadSources.find((source) => source.id === createdSource.id);
    assert.equal(restoredSource.status, "Active");
    assert.equal(restoredSource.archivedAt, null);

    const checkedSourceState = await assertOk(fixture.baseUrl, `/api/lead-sources/${createdSource.id}/check`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        checkedAt: "2026-05-11",
        checkNote: "No new concrete bid matches today.",
      }),
    });
    const checkedSource = checkedSourceState.leadSources.find((source) => source.id === createdSource.id);
    assert.equal(checkedSource.lastCheckedAt, "2026-05-11");
    assert.equal(checkedSource.nextCheckAt, "2026-06-11");
    assert.match(checkedSource.notes, /No new concrete bid matches today/);
    assert.ok(checkedSourceState.auditEvents.some((event) => event.entityType === "leadSource" && event.entityId === createdSource.id && event.action === "checked"));

    const invalidSource = await requestJson(fixture.baseUrl, "/api/lead-sources", {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: "",
      }),
    });
    assert.equal(invalidSource.response.status, 400);
    assert.match(invalidSource.payload.error, /source name/i);

    const createState = await assertOk(fixture.baseUrl, "/api/leads", {
      method: "POST",
      headers,
      body: JSON.stringify({
        customer: "Taylor Mason",
        city: "Dallas",
        project: "Front steps",
        trade: "fence",
        status: "Contacted",
        priority: "High",
        ownerId: before.user.id,
        source: "Website",
        followUpDueAt: "2026-05-02",
        value: 9200,
        nextStep: "Schedule site visit",
        notes: "Wants Saturday consult.",
      }),
    });

    const createdLead = createState.leads.find((lead) => lead.customer === "Taylor Mason" && lead.project === "Front steps");
    assert.ok(createdLead, "Expected created lead to be returned.");
    assert.equal(createdLead.ownerId, before.user.id);
    assert.equal(createdLead.owner, before.user.name);
    assert.equal(createdLead.source, "Website");
    assert.equal(createdLead.trade, "fencing");
    assert.equal(createdLead.followUpDueAt, "2026-05-02");
    assert.ok(createdLead.customerId, "Expected lead creation to link a customer record.");
    assert.equal(createdLead.fitScore, 0);
    assert.equal(createdLead.fitLabel, "");
    assert.equal(createdLead.missingInfoStatus, "");
    assert.equal(createdLead.missingInfoCount, 0);
    assert.deepEqual(createdLead.missingInfoItems, []);

    const createdCustomer = createState.customers.find((customer) => customer.id === createdLead.customerId);
    assert.ok(createdCustomer, "Expected lead creation to return the linked customer.");
    assert.equal(createdCustomer.status, "Prospect");

    const initialHistory = createState.leadStatusHistory.filter((entry) => entry.leadId === createdLead.id);
    assert.equal(initialHistory.length, 1);
    assert.equal(initialHistory[0].toStatus, "Contacted");
    assert.ok(createState.auditEvents.some((event) => event.entityType === "lead" && event.entityId === createdLead.id && event.action === "created"));

    const queueItem = createState.queueItems.find((item) => item.title === "Follow up Taylor Mason");
    assert.ok(queueItem, "Expected lead creation to enqueue a follow-up item.");

    const scoredState = await assertOk(fixture.baseUrl, `/api/leads/${createdLead.id}/score`, {
      method: "POST",
      headers,
    });
    const scoredLead = scoredState.leads.find((lead) => lead.id === createdLead.id);
    assert.ok(scoredLead.fitScore > 0, "Expected lead scoring to save a numeric fit score.");
    assert.ok(["Strong Fit", "Good Fit", "Review Needed", "Poor Fit"].includes(scoredLead.fitLabel));
    assert.equal(scoredLead.scoreSource, "rule_based");
    assert.ok(scoredLead.scoredAt, "Expected lead scoring to stamp scoredAt.");
    assert.ok(Array.isArray(scoredLead.fitRisks), "Expected fitRisks to return as an array.");
    assert.match(scoredLead.fitNextStep, /follow-up|estimate|Qualify|Fill missing/i);
    assert.ok(scoredState.auditEvents.some((event) => event.entityType === "lead" && event.entityId === createdLead.id && event.action === "scored"));
    assert.ok(scoredState.activity.some((event) => event.title === "Lead scored"));

    const missingInfoState = await assertOk(fixture.baseUrl, `/api/leads/${createdLead.id}/check-missing-info`, {
      method: "POST",
      headers,
    });
    const missingInfoLead = missingInfoState.leads.find((lead) => lead.id === createdLead.id);
    assert.equal(missingInfoLead.missingInfoStatus, "Needs Info");
    assert.ok(missingInfoLead.missingInfoCount > 0, "Expected missing info check to save a missing item count.");
    assert.ok(Array.isArray(missingInfoLead.missingInfoItems), "Expected missing info items to return as an array.");
    assert.ok(missingInfoLead.missingInfoItems.some((item) => item.key === "contact_path" && item.severity === "required"));
    assert.match(missingInfoLead.missingInfoNextStep, /Phone or email/i);
    assert.ok(missingInfoLead.missingInfoCheckedAt, "Expected missing info check to stamp checkedAt.");
    assert.ok(missingInfoState.auditEvents.some((event) => event.entityType === "lead" && event.entityId === createdLead.id && event.action === "missing_info_checked"));
    assert.ok(missingInfoState.activity.some((event) => event.title === "Lead missing info checked"));

    const updateState = await assertOk(fixture.baseUrl, `/api/leads/${createdLead.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        status: "Site Visit",
        ownerId: before.user.id,
        source: "Referral",
        trade: "roofing",
        followUpDueAt: "2026-05-04",
        customerId: existingCustomer.id,
        city: existingCustomer.city || "Salem",
        notes: "Customer linked to existing record.",
      }),
    });

    const updatedLead = updateState.leads.find((lead) => lead.id === createdLead.id);
    assert.ok(updatedLead, "Expected updated lead to be returned.");
    assert.equal(updatedLead.status, "Site Visit");
    assert.equal(updatedLead.source, "Referral");
    assert.equal(updatedLead.trade, "roofing");
    assert.equal(updatedLead.followUpDueAt, "2026-05-04");
    assert.equal(updatedLead.customerId, existingCustomer.id);
    assert.equal(updatedLead.customer, existingCustomer.name);

    const updatedHistory = updateState.leadStatusHistory.filter((entry) => entry.leadId === createdLead.id);
    assert.equal(updatedHistory.length, 2);
    assert.ok(updatedHistory.some((entry) => entry.fromStatus === "Contacted" && entry.toStatus === "Site Visit"));
    assert.ok(updateState.auditEvents.some((event) => event.entityType === "lead" && event.entityId === createdLead.id && event.action === "status_changed"));
    assert.ok(updateState.auditEvents.some((event) => event.entityType === "lead" && event.entityId === createdLead.id && event.action === "updated"));

    const archivedState = await assertOk(fixture.baseUrl, `/api/leads/${createdLead.id}/archive`, {
      method: "POST",
      headers,
    });
    const archivedLead = archivedState.leads.find((lead) => lead.id === createdLead.id);
    assert.ok(archivedLead.archivedAt, "Expected archive to stamp archivedAt.");
    assert.ok(archivedState.auditEvents.some((event) => event.entityType === "lead" && event.entityId === createdLead.id && event.action === "archived"));

    const restoredState = await assertOk(fixture.baseUrl, `/api/leads/${createdLead.id}/restore`, {
      method: "POST",
      headers,
    });
    const restoredLead = restoredState.leads.find((lead) => lead.id === createdLead.id);
    assert.equal(restoredLead.archivedAt, null);
    assert.ok(restoredState.auditEvents.some((event) => event.entityType === "lead" && event.entityId === createdLead.id && event.action === "restored"));

    const convertState = await assertOk(fixture.baseUrl, `/api/leads/${createdLead.id}/convert-to-customer`, {
      method: "POST",
      headers,
    });
    const convertedLead = convertState.leads.find((lead) => lead.id === createdLead.id);
    assert.equal(convertedLead.status, "Approved");
    assert.equal(convertedLead.nextStep, "Converted into customer record");

    const convertedCustomer = convertState.customers.find((customer) => customer.id === convertedLead.customerId);
    assert.ok(convertedCustomer, "Expected converted lead to still point at a customer.");
    assert.equal(convertedCustomer.status, "Active");

    const convertHistory = convertState.leadStatusHistory.filter((entry) => entry.leadId === createdLead.id);
    assert.ok(convertHistory.some((entry) => entry.fromStatus === "Site Visit" && entry.toStatus === "Approved"));
    assert.ok(convertState.auditEvents.some((event) => event.entityType === "lead" && event.entityId === createdLead.id && event.action === "converted"));
  } finally {
    await fixture.stop();
  }
});

test("lead permissions keep office access while hiding lead data from employees and foremen", async () => {
  const fixture = await startServer();

  try {
    insertUsers(fixture.sqliteFile, [
      createUserRecord({
        id: "U-ADMIN-LEADS",
        email: "admin@lastyard.test",
        password: "apexdemo123",
        name: "Admin User",
        role: "Administrator",
      }),
      createUserRecord({
        id: "U-OPS-LEADS",
        email: "ops-manager@lastyard.test",
        password: "apexdemo123",
        name: "Ops Manager",
        role: "Operations Manager",
      }),
      createUserRecord({
        id: "U-ESTIMATOR-LEADS",
        email: "estimator@lastyard.test",
        password: "apexdemo123",
        name: "Estimator User",
        role: "Estimator",
      }),
      createUserRecord({
        id: "U-EMPLOYEE-LEADS",
        email: "employee@lastyard.test",
        password: "apexdemo123",
        name: "Employee User",
        role: "Employee",
      }),
      createUserRecord({
        id: "U-FOREMAN-LEADS",
        email: "foreman@lastyard.test",
        password: "apexdemo123",
        name: "Foreman User",
        role: "Foreman",
      }),
    ]);

    const adminLogin = await login(fixture.baseUrl, {
      email: "admin@lastyard.test",
      password: "apexdemo123",
    });
    const adminBootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", {
      headers: authHeaders(adminLogin.token),
    });
    assert.equal(adminBootstrap.permissions.leads.canManage, true);

    const opsManagerLogin = await login(fixture.baseUrl, {
      email: "ops-manager@lastyard.test",
      password: "apexdemo123",
    });
    const opsHeaders = authHeaders(opsManagerLogin.token);
    const opsBootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", { headers: opsHeaders });
    assert.equal(opsBootstrap.permissions.leads.canManage, true);

    const opsCreate = await assertOk(fixture.baseUrl, "/api/leads", {
      method: "POST",
      headers: opsHeaders,
      body: JSON.stringify({
        customer: "Managed by Ops",
        city: "Salem",
        project: "Patio extension",
        ownerId: opsBootstrap.user.id,
        source: "Partner",
        followUpDueAt: "2026-05-05",
      }),
    });
    const opsLead = opsCreate.leads.find((lead) => lead.customer === "Managed by Ops");
    assert.ok(opsLead, "Expected operations manager to create a lead.");

    const opsSourceState = await assertOk(fixture.baseUrl, "/api/lead-sources", {
      method: "POST",
      headers: opsHeaders,
      body: JSON.stringify({
        name: "Ops-only bid source",
        type: "Manual source",
      }),
    });
    const opsSource = opsSourceState.leadSources.find((source) => source.name === "Ops-only bid source");
    assert.ok(opsSource, "Expected operations manager to create a lead source.");

    const estimatorLogin = await login(fixture.baseUrl, {
      email: "estimator@lastyard.test",
      password: "apexdemo123",
    });
    const estimatorHeaders = authHeaders(estimatorLogin.token);
    const estimatorBootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", { headers: estimatorHeaders });
    assert.equal(estimatorBootstrap.permissions.leads.canView, true);
    assert.equal(estimatorBootstrap.permissions.leads.canManage, true);
    const estimatorLeads = await assertOk(fixture.baseUrl, "/api/leads", { headers: estimatorHeaders });
    assert.ok(Array.isArray(estimatorLeads.leads));
    assert.ok(Array.isArray(estimatorLeads.leadSources));

    const employeeLogin = await login(fixture.baseUrl, {
      email: "employee@lastyard.test",
      password: "apexdemo123",
    });
    const employeeHeaders = authHeaders(employeeLogin.token);
    const employeeBootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", { headers: employeeHeaders });
    assert.equal(employeeBootstrap.permissions.leads.canView, false);
    assert.equal(employeeBootstrap.permissions.leads.canManage, false);
    assert.equal(employeeBootstrap.permissions.leads.canViewSources, false);
    assert.equal(employeeBootstrap.permissions.leads.canManageSources, false);
    assert.equal(employeeBootstrap.leads.length, 0);
    assert.equal(employeeBootstrap.leadSources.length, 0);
    assert.equal(employeeBootstrap.leadStatusHistory.length, 0);
    assert.equal(employeeBootstrap.customers.length, 0);
    assert.equal(employeeBootstrap.stats.newLeads, 0);
    assert.equal(employeeBootstrap.stats.pipelineValue, 0);

    const createDenied = await requestJson(fixture.baseUrl, "/api/leads", {
      method: "POST",
      headers: employeeHeaders,
      body: JSON.stringify({
        customer: "Blocked Employee Lead",
        city: "Albany",
        project: "Driveway",
      }),
    });
    assert.equal(createDenied.response.status, 403);
    assert.match(createDenied.payload.error, /permission/i);

    const listDenied = await requestJson(fixture.baseUrl, "/api/leads", {
      headers: employeeHeaders,
    });
    assert.equal(listDenied.response.status, 403);

    const sourceListDenied = await requestJson(fixture.baseUrl, "/api/lead-sources", {
      headers: employeeHeaders,
    });
    assert.equal(sourceListDenied.response.status, 403);

    const sourceCreateDenied = await requestJson(fixture.baseUrl, "/api/lead-sources", {
      method: "POST",
      headers: employeeHeaders,
      body: JSON.stringify({
        name: "Blocked field source",
      }),
    });
    assert.equal(sourceCreateDenied.response.status, 403);

    const sourcePatchDenied = await requestJson(fixture.baseUrl, `/api/lead-sources/${opsSource.id}`, {
      method: "PATCH",
      headers: employeeHeaders,
      body: JSON.stringify({
        notes: "Should not be allowed.",
      }),
    });
    assert.equal(sourcePatchDenied.response.status, 403);

    const sourceArchiveDenied = await requestJson(fixture.baseUrl, `/api/lead-sources/${opsSource.id}/archive`, {
      method: "POST",
      headers: employeeHeaders,
    });
    assert.equal(sourceArchiveDenied.response.status, 403);

    const sourceCheckDenied = await requestJson(fixture.baseUrl, `/api/lead-sources/${opsSource.id}/check`, {
      method: "POST",
      headers: employeeHeaders,
      body: JSON.stringify({
        checkedAt: "2026-05-11",
      }),
    });
    assert.equal(sourceCheckDenied.response.status, 403);

    const scoreDenied = await requestJson(fixture.baseUrl, `/api/leads/${opsLead.id}/score`, {
      method: "POST",
      headers: employeeHeaders,
    });
    assert.equal(scoreDenied.response.status, 403);

    const missingInfoDenied = await requestJson(fixture.baseUrl, `/api/leads/${opsLead.id}/check-missing-info`, {
      method: "POST",
      headers: employeeHeaders,
    });
    assert.equal(missingInfoDenied.response.status, 403);

    const patchDenied = await requestJson(fixture.baseUrl, `/api/leads/${opsLead.id}`, {
      method: "PATCH",
      headers: employeeHeaders,
      body: JSON.stringify({
        notes: "Should not be allowed.",
      }),
    });
    assert.equal(patchDenied.response.status, 403);

    const archiveDenied = await requestJson(fixture.baseUrl, `/api/leads/${opsLead.id}/archive`, {
      method: "POST",
      headers: employeeHeaders,
    });
    assert.equal(archiveDenied.response.status, 403);

    const restoreDenied = await requestJson(fixture.baseUrl, `/api/leads/${opsLead.id}/restore`, {
      method: "POST",
      headers: employeeHeaders,
    });
    assert.equal(restoreDenied.response.status, 403);

    const convertDenied = await requestJson(fixture.baseUrl, `/api/leads/${opsLead.id}/convert-to-customer`, {
      method: "POST",
      headers: employeeHeaders,
    });
    assert.equal(convertDenied.response.status, 403);

    const foremanLogin = await login(fixture.baseUrl, {
      email: "foreman@lastyard.test",
      password: "apexdemo123",
    });
    const foremanBootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", {
      headers: authHeaders(foremanLogin.token),
    });
    assert.equal(foremanBootstrap.permissions.leads.canView, false);
    assert.equal(foremanBootstrap.permissions.leads.canManage, false);
    assert.equal(foremanBootstrap.permissions.customers.canView, false);
    assert.equal(foremanBootstrap.leads.length, 0);
    assert.equal(foremanBootstrap.leadSources.length, 0);
    assert.equal(foremanBootstrap.customers.length, 0);
    assert.equal(foremanBootstrap.stats.newLeads, 0);
    assert.equal(foremanBootstrap.stats.pipelineValue, 0);

    const foremanLeadList = await requestJson(fixture.baseUrl, "/api/leads", {
      headers: authHeaders(foremanLogin.token),
    });
    assert.equal(foremanLeadList.response.status, 403);
  } finally {
    await fixture.stop();
  }
});
