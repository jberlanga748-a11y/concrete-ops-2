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
  return 7900 + Math.floor(Math.random() * 1000);
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

  throw new Error(`Safety test server did not become ready.\n${serverOutput()}`);
}

async function startServer() {
  const tempDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "concrete-ops-safety-"));
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

function ensureOtherCompany(database) {
  const now = new Date().toISOString();
  database.prepare(`
    INSERT OR IGNORE INTO companies (id, workspace_id, name, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run("COMPANY-LYF", "COMPANY-LYF", "Live Your Future Construction", "active", now, now);
}

function moveJobAndCustomerToOtherCompany(sqliteFile, jobId, customerId) {
  const database = new DatabaseSync(sqliteFile);
  try {
    ensureOtherCompany(database);
    database.prepare("UPDATE jobs SET company_id = ? WHERE id = ?").run("COMPANY-LYF", jobId);
    if (customerId) {
      database.prepare("UPDATE customers SET company_id = ? WHERE id = ?").run("COMPANY-LYF", customerId);
    }
  } finally {
    database.close();
  }
}

function moveSafetyPolicyToOtherCompany(sqliteFile, policyId) {
  const database = new DatabaseSync(sqliteFile);
  try {
    ensureOtherCompany(database);
    database.prepare("UPDATE safety_policies SET company_id = ? WHERE id = ?").run("COMPANY-LYF", policyId);
  } finally {
    database.close();
  }
}

function setSafetyIncidentJob(sqliteFile, incidentId, jobId) {
  const database = new DatabaseSync(sqliteFile);
  try {
    database.prepare("UPDATE safety_incidents SET job_id = ? WHERE id = ?").run(jobId, incidentId);
  } finally {
    database.close();
  }
}

function setSafetyAcknowledgmentLinks(sqliteFile, acknowledgmentId, links = {}) {
  const database = new DatabaseSync(sqliteFile);
  try {
    database.prepare(`
      UPDATE safety_acknowledgments
      SET job_id = ?, policy_id = ?
      WHERE id = ?
    `).run(links.jobId || "", links.policyId || "", acknowledgmentId);
  } finally {
    database.close();
  }
}

test("safety permissions keep office management while scoping field visibility", async () => {
  const fixture = await startServer();

  try {
    const foremanUser = createUserRecord({
      id: "U-SAFE-FOREMAN",
      email: "safe-foreman@lastyard.test",
      password: "apexdemo123",
      name: "Safe Foreman",
      role: "Foreman",
    });
    const employeeUser = createUserRecord({
      id: "U-SAFE-EMPLOYEE",
      email: "safe-employee@lastyard.test",
      password: "apexdemo123",
      name: "Safe Employee",
      role: "Employee",
    });
    const otherEmployee = createUserRecord({
      id: "U-SAFE-OTHER",
      email: "safe-other@lastyard.test",
      password: "apexdemo123",
      name: "Other Employee",
      role: "Employee",
    });

    insertUsers(fixture.sqliteFile, [foremanUser, employeeUser, otherEmployee]);

    const opsLogin = await login(fixture.baseUrl, { email: "demo.ops@apexhq.app", password: "apexdemo123" });
    const officeHeaders = authHeaders(opsLogin.token);

    const officeBootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", { headers: officeHeaders });
    assert.equal(officeBootstrap.safetyPolicies.length >= 4, true);
    assert.equal(officeBootstrap.ppeItems.some((item) => item.label === "Hard hat"), true);

    await assertOk(fixture.baseUrl, "/api/jobs/J-2201/assignments", {
      method: "POST",
      headers: officeHeaders,
      body: JSON.stringify({ userId: foremanUser.id, roleOnJob: "foreman" }),
    });
    await assertOk(fixture.baseUrl, "/api/jobs/J-2201/assignments", {
      method: "POST",
      headers: officeHeaders,
      body: JSON.stringify({ userId: employeeUser.id, roleOnJob: "crew" }),
    });
    await assertOk(fixture.baseUrl, "/api/jobs/J-2192/assignments", {
      method: "POST",
      headers: officeHeaders,
      body: JSON.stringify({ userId: otherEmployee.id, roleOnJob: "crew" }),
    });

    const foremanLogin = await login(fixture.baseUrl, { email: foremanUser.email, password: "apexdemo123" });
    const employeeLogin = await login(fixture.baseUrl, { email: employeeUser.email, password: "apexdemo123" });
    const foremanHeaders = authHeaders(foremanLogin.token);
    const employeeHeaders = authHeaders(employeeLogin.token);

    const employeePolicyAttempt = await requestJson(fixture.baseUrl, "/api/safety/policies", {
      method: "POST",
      headers: employeeHeaders,
      body: JSON.stringify({ title: "Nope", body: "Nope", category: "PPE" }),
    });
    assert.equal(employeePolicyAttempt.response.status, 403);

    const foremanPolicyAttempt = await requestJson(fixture.baseUrl, "/api/safety/policies", {
      method: "POST",
      headers: foremanHeaders,
      body: JSON.stringify({ title: "Nope", body: "Nope", category: "PPE" }),
    });
    assert.equal(foremanPolicyAttempt.response.status, 403);

    const createdPolicyState = await assertOk(fixture.baseUrl, "/api/safety/policies", {
      method: "POST",
      headers: officeHeaders,
      body: JSON.stringify({
        title: "Ladder awareness",
        body: "Check ladder footing before climbing and keep access clear.",
        category: "Access",
      }),
    });
    assert.equal(createdPolicyState.safetyPolicies.some((policy) => policy.title === "Ladder awareness"), true);

    const createdPpeState = await assertOk(fixture.baseUrl, "/api/safety/ppe-items", {
      method: "POST",
      headers: officeHeaders,
      body: JSON.stringify({
        label: "Knee pads",
        description: "Use when kneeling for long finishing or cleanup work.",
        requiredByDefault: false,
      }),
    });
    assert.equal(createdPpeState.ppeItems.some((item) => item.label === "Knee pads"), true);

    const employeeAckState = await assertOk(fixture.baseUrl, "/api/safety/acknowledgments", {
      method: "POST",
      headers: employeeHeaders,
      body: JSON.stringify({
        jobId: "J-2201",
        notes: "Reviewed PPE before pour prep.",
      }),
    });
    assert.equal(employeeAckState.safetyAcknowledgments.some((entry) => entry.userId === employeeUser.id), true);

    const foremanAckState = await assertOk(fixture.baseUrl, "/api/safety/acknowledgments", {
      method: "POST",
      headers: foremanHeaders,
      body: JSON.stringify({
        jobId: "J-2201",
        notes: "Covered dust and saw-cut controls with the crew.",
      }),
    });
    assert.equal(foremanAckState.safetyAcknowledgments.some((entry) => entry.userId === foremanUser.id), true);

    const employeeIncidentState = await assertOk(fixture.baseUrl, "/api/safety/incidents", {
      method: "POST",
      headers: employeeHeaders,
      body: JSON.stringify({
        jobId: "J-2201",
        type: "hazard",
        severity: "medium",
        title: "Extension cord across walkway",
        description: "Cord was stretched across the access path near the mixer.",
        immediateAction: "Moved cord and marked the path until cleanup was complete.",
      }),
    });
    const employeeIncident = employeeIncidentState.safetyIncidents.find((incident) => incident.submittedBy === employeeUser.id);
    assert.ok(employeeIncident);
    assert.equal(employeeIncident.job.canViewMoney, false);
    assert.equal("notes" in employeeIncident.job, false);

    const employeeWrongJob = await requestJson(fixture.baseUrl, "/api/safety/incidents", {
      method: "POST",
      headers: employeeHeaders,
      body: JSON.stringify({
        jobId: "J-2192",
        title: "Wrong job incident",
        description: "Should not be allowed.",
      }),
    });
    assert.equal(employeeWrongJob.response.status, 403);

    await assertOk(fixture.baseUrl, "/api/safety/incidents", {
      method: "POST",
      headers: officeHeaders,
      body: JSON.stringify({
        jobId: "J-2192",
        type: "concern",
        severity: "low",
        title: "Other job concern",
        description: "Only office and the assigned worker should see this.",
      }),
    });

    const foremanSafetyView = await assertOk(fixture.baseUrl, "/api/safety", { headers: foremanHeaders });
    assert.equal(foremanSafetyView.safetyPolicies.length > 0, true);
    assert.equal(foremanSafetyView.safetyIncidents.some((incident) => incident.jobId === "J-2201"), true);
    assert.equal(foremanSafetyView.safetyIncidents.some((incident) => incident.jobId === "J-2192"), false);

    const employeeSafetyView = await assertOk(fixture.baseUrl, "/api/safety", { headers: employeeHeaders });
    assert.equal(employeeSafetyView.safetyIncidents.every((incident) => incident.submittedBy === employeeUser.id), true);
    assert.equal(employeeSafetyView.leads, undefined);

    const reviewedState = await assertOk(fixture.baseUrl, `/api/safety/incidents/${employeeIncident.id}/review`, {
      method: "POST",
      headers: officeHeaders,
    });
    const reviewedIncident = reviewedState.safetyIncidents.find((incident) => incident.id === employeeIncident.id);
    assert.equal(reviewedIncident.status, "reviewed");

    const resolvedState = await assertOk(fixture.baseUrl, `/api/safety/incidents/${employeeIncident.id}/resolve`, {
      method: "POST",
      headers: officeHeaders,
    });
    const resolvedIncident = resolvedState.safetyIncidents.find((incident) => incident.id === employeeIncident.id);
    assert.equal(resolvedIncident.status, "resolved");

    const archivedState = await assertOk(fixture.baseUrl, `/api/safety/incidents/${employeeIncident.id}/archive`, {
      method: "POST",
      headers: officeHeaders,
    });
    assert.equal(archivedState.safetyIncidents.some((incident) => incident.id === employeeIncident.id && incident.archivedAt), true);
    assert.equal(archivedState.auditEvents.some((event) => event.entityType === "safetyIncident"), true);
  } finally {
    await fixture.stop();
  }
});

test("safety responses fail closed on stale cross-company linked records", async () => {
  const fixture = await startServer();

  try {
    const opsLogin = await login(fixture.baseUrl, { email: "demo.ops@apexhq.app", password: "apexdemo123" });
    const officeHeaders = authHeaders(opsLogin.token);

    const hiddenJobState = await assertOk(fixture.baseUrl, "/api/jobs", {
      method: "POST",
      headers: officeHeaders,
      body: JSON.stringify({
        title: "Hidden Safety Job",
        customer: "Hidden Safety Customer",
        address: "44 Hidden Safety Road",
        city: "Eugene",
        status: "scheduled",
      }),
    });
    const hiddenJob = hiddenJobState.jobs.find((entry) => entry.title === "Hidden Safety Job");
    assert.ok(hiddenJob);
    moveJobAndCustomerToOtherCompany(fixture.sqliteFile, hiddenJob.id, hiddenJob.customerId);

    const hiddenPolicyState = await assertOk(fixture.baseUrl, "/api/safety/policies", {
      method: "POST",
      headers: officeHeaders,
      body: JSON.stringify({
        title: "Hidden Safety Policy",
        body: "Hidden policy guidance must not leak.",
        category: "Hidden",
      }),
    });
    const hiddenPolicy = hiddenPolicyState.safetyPolicies.find((entry) => entry.title === "Hidden Safety Policy");
    assert.ok(hiddenPolicy);
    moveSafetyPolicyToOtherCompany(fixture.sqliteFile, hiddenPolicy.id);

    const incidentState = await assertOk(fixture.baseUrl, "/api/safety/incidents", {
      method: "POST",
      headers: officeHeaders,
      body: JSON.stringify({
        jobId: "J-2201",
        type: "hazard",
        severity: "medium",
        title: "Visible safety incident with stale job",
        description: "Visible incident should disappear if linked to a hidden job.",
        immediateAction: "Logged for regression coverage.",
      }),
    });
    const incident = incidentState.safetyIncidents.find((entry) => entry.title === "Visible safety incident with stale job");
    assert.ok(incident);
    setSafetyIncidentJob(fixture.sqliteFile, incident.id, hiddenJob.id);

    const acknowledgmentState = await assertOk(fixture.baseUrl, "/api/safety/acknowledgments", {
      method: "POST",
      headers: officeHeaders,
      body: JSON.stringify({
        jobId: "J-2201",
        notes: "Visible acknowledgment should disappear if linked to hidden safety records.",
      }),
    });
    const acknowledgment = acknowledgmentState.safetyAcknowledgments.find((entry) => entry.notes === "Visible acknowledgment should disappear if linked to hidden safety records.");
    assert.ok(acknowledgment);
    setSafetyAcknowledgmentLinks(fixture.sqliteFile, acknowledgment.id, {
      jobId: hiddenJob.id,
      policyId: hiddenPolicy.id,
    });

    const safetyPayload = await assertOk(fixture.baseUrl, "/api/safety", { headers: officeHeaders });
    assert.equal(safetyPayload.safetyIncidents.some((entry) => entry.id === incident.id), false);
    assert.equal(safetyPayload.safetyAcknowledgments.some((entry) => entry.id === acknowledgment.id), false);
    const serializedSafetyRecords = JSON.stringify({
      safetyIncidents: safetyPayload.safetyIncidents,
      safetyAcknowledgments: safetyPayload.safetyAcknowledgments,
    });
    assert.equal(serializedSafetyRecords.includes("Hidden Safety Job"), false);
    assert.equal(serializedSafetyRecords.includes("Hidden Safety Customer"), false);
    assert.equal(serializedSafetyRecords.includes("44 Hidden Safety Road"), false);
    assert.equal(serializedSafetyRecords.includes("Hidden Safety Policy"), false);
    assert.equal(serializedSafetyRecords.includes("Hidden policy guidance"), false);

    const bootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", { headers: officeHeaders });
    assert.equal(bootstrap.safetyIncidents.some((entry) => entry.id === incident.id), false);
    assert.equal(bootstrap.safetyAcknowledgments.some((entry) => entry.id === acknowledgment.id), false);
  } finally {
    await fixture.stop();
  }
});
