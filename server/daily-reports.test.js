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
  return 7200 + Math.floor(Math.random() * 1000);
}

async function waitForServer(baseUrl, serverOutput) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/ready`);
      if (response.ok) return;
    } catch {
      // Poll until the server is ready.
    }
    await sleep(250);
  }

  throw new Error(`Daily reports test server did not become ready.\n${serverOutput()}`);
}

async function startServer() {
  const tempDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "concrete-ops-daily-reports-"));
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

function setDailyReportJob(sqliteFile, reportId, jobId) {
  const database = new DatabaseSync(sqliteFile);
  try {
    database.prepare("UPDATE daily_reports SET job_id = ? WHERE id = ?").run(jobId, reportId);
  } finally {
    database.close();
  }
}

test("daily reports respect foreman workflow, office review, employee restrictions, and field-safe summaries", async () => {
  const fixture = await startServer();

  try {
    const foremanUser = createUserRecord({
      id: "U-REPORT-FOREMAN",
      email: "reports-foreman@lastyard.test",
      password: "apexdemo123",
      name: "Report Foreman",
      role: "Foreman",
    });
    const employeeUser = createUserRecord({
      id: "U-REPORT-EMPLOYEE",
      email: "reports-employee@lastyard.test",
      password: "apexdemo123",
      name: "Report Employee",
      role: "Employee",
    });

    insertUsers(fixture.sqliteFile, [foremanUser, employeeUser]);

    const opsLogin = await login(fixture.baseUrl, {
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
    });
    const officeHeaders = authHeaders(opsLogin.token);

    await assertOk(fixture.baseUrl, "/api/jobs/J-2201/assignments", {
      method: "POST",
      headers: officeHeaders,
      body: JSON.stringify({
        userId: foremanUser.id,
        roleOnJob: "foreman",
      }),
    });

    await assertOk(fixture.baseUrl, "/api/jobs/J-2201/assignments", {
      method: "POST",
      headers: officeHeaders,
      body: JSON.stringify({
        userId: employeeUser.id,
        roleOnJob: "crew",
      }),
    });

    const foremanLogin = await login(fixture.baseUrl, {
      email: foremanUser.email,
      password: "apexdemo123",
    });
    const foremanHeaders = authHeaders(foremanLogin.token);

    const employeeLogin = await login(fixture.baseUrl, {
      email: employeeUser.email,
      password: "apexdemo123",
    });
    const employeeHeaders = authHeaders(employeeLogin.token);

    const today = new Date().toISOString().slice(0, 10);

    await assertOk(fixture.baseUrl, "/api/time-entries/clock-in", {
      method: "POST",
      headers: foremanHeaders,
      body: JSON.stringify({
        workCategory: "job",
        jobId: "J-2201",
      }),
    });

    const employeeClockedIn = await assertOk(fixture.baseUrl, "/api/time-entries/clock-in", {
      method: "POST",
      headers: employeeHeaders,
      body: JSON.stringify({
        workCategory: "job",
        jobId: "J-2201",
      }),
    });
    const employeeEntry = employeeClockedIn.timeEntries.find((entry) => entry.userId === employeeUser.id);
    await assertOk(fixture.baseUrl, `/api/time-entries/${employeeEntry.id}/clock-out`, {
      method: "POST",
      headers: employeeHeaders,
    });

    const createdState = await assertOk(fixture.baseUrl, "/api/daily-reports", {
      method: "POST",
      headers: foremanHeaders,
      body: JSON.stringify({
        jobId: "J-2201",
        reportDate: today,
        crewSummary: "Foreman plus one crew member",
        workPerformed: "Prepped forms and cleaned the site.",
        safetyNotes: "Watched saw-cut dust control.",
        materialNotes: "Base rock delivered.",
        weather: "Cloudy",
      }),
    });

    const createdReport = createdState.dailyReports.find((report) => report.jobId === "J-2201" && report.reportDate === today);
    assert.ok(createdReport);
    assert.equal(createdReport.status, "draft");
    assert.equal(createdReport.timeSummary.totalEntries >= 1, true);
    assert.equal(createdReport.job.canViewMoney, false);
    assert.equal("notes" in createdReport.job, false);

    const unassignedCreate = await requestJson(fixture.baseUrl, "/api/daily-reports", {
      method: "POST",
      headers: foremanHeaders,
      body: JSON.stringify({
        jobId: "J-2192",
        reportDate: today,
      }),
    });
    assert.equal(unassignedCreate.response.status, 403);

    const updatedState = await assertOk(fixture.baseUrl, `/api/daily-reports/${createdReport.id}`, {
      method: "PATCH",
      headers: foremanHeaders,
      body: JSON.stringify({
        workPerformed: "Prepped forms, set string lines, and cleaned the site.",
        concretePoured: true,
        yardsPoured: 5.5,
      }),
    });
    const updatedReport = updatedState.dailyReports.find((report) => report.id === createdReport.id);
    assert.equal(updatedReport.concretePoured, true);
    assert.equal(updatedReport.yardsPoured, 5.5);

    const submittedState = await assertOk(fixture.baseUrl, `/api/daily-reports/${createdReport.id}/submit`, {
      method: "POST",
      headers: foremanHeaders,
    });
    const submittedReport = submittedState.dailyReports.find((report) => report.id === createdReport.id);
    assert.equal(submittedReport.status, "submitted");

    const deniedSubmittedEdit = await requestJson(fixture.baseUrl, `/api/daily-reports/${createdReport.id}`, {
      method: "PATCH",
      headers: foremanHeaders,
      body: JSON.stringify({
        generalNotes: "Trying to edit after submit",
      }),
    });
    assert.equal(deniedSubmittedEdit.response.status, 403);

    const employeeBootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", {
      headers: employeeHeaders,
    });
    assert.deepEqual(employeeBootstrap.dailyReports, []);
    assert.equal(employeeBootstrap.permissions.reports.canView, false);

    const employeeReports = await requestJson(fixture.baseUrl, "/api/daily-reports", {
      headers: employeeHeaders,
    });
    assert.equal(employeeReports.response.status, 403);

    const deniedEmployeeMutation = await requestJson(fixture.baseUrl, `/api/daily-reports/${createdReport.id}/submit`, {
      method: "POST",
      headers: employeeHeaders,
    });
    assert.equal(deniedEmployeeMutation.response.status, 403);

    const officeReports = await assertOk(fixture.baseUrl, "/api/daily-reports", {
      headers: officeHeaders,
    });
    assert.ok(officeReports.dailyReports.some((report) => report.id === createdReport.id));

    const reviewedState = await assertOk(fixture.baseUrl, `/api/daily-reports/${createdReport.id}/review`, {
      method: "POST",
      headers: officeHeaders,
    });
    const reviewedReport = reviewedState.dailyReports.find((report) => report.id === createdReport.id);
    assert.equal(reviewedReport.status, "reviewed");

    const reopenedState = await assertOk(fixture.baseUrl, `/api/daily-reports/${createdReport.id}/reopen`, {
      method: "POST",
      headers: officeHeaders,
    });
    const reopenedReport = reopenedState.dailyReports.find((report) => report.id === createdReport.id);
    assert.equal(reopenedReport.status, "reopened");

    const archivedState = await assertOk(fixture.baseUrl, `/api/daily-reports/${createdReport.id}/archive`, {
      method: "POST",
      headers: officeHeaders,
    });
    const archivedReport = archivedState.dailyReports.find((report) => report.id === createdReport.id);
    assert.equal(archivedReport.status, "archived");
    assert.ok(archivedReport.archivedAt);

    const auditActions = archivedState.auditEvents
      .filter((event) => event.entityType === "dailyReport" && event.entityId === createdReport.id)
      .map((event) => event.action);
    assert.ok(auditActions.includes("created"));
    assert.ok(auditActions.includes("updated"));
    assert.ok(auditActions.includes("submitted"));
    assert.ok(auditActions.includes("reviewed"));
    assert.ok(auditActions.includes("reopened"));
    assert.ok(auditActions.includes("archived"));
  } finally {
    await fixture.stop();
  }
});

test("daily reports fail closed on stale cross-company linked jobs", async () => {
  const fixture = await startServer();

  try {
    const opsLogin = await login(fixture.baseUrl, {
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
    });
    const officeHeaders = authHeaders(opsLogin.token);

    const hiddenJobState = await assertOk(fixture.baseUrl, "/api/jobs", {
      method: "POST",
      headers: officeHeaders,
      body: JSON.stringify({
        title: "Hidden Daily Report Job",
        customer: "Hidden Daily Report Customer",
        address: "700 Hidden Report Lane",
        city: "Eugene",
        status: "scheduled",
      }),
    });
    const hiddenJob = hiddenJobState.jobs.find((entry) => entry.title === "Hidden Daily Report Job");
    assert.ok(hiddenJob);
    moveJobAndCustomerToOtherCompany(fixture.sqliteFile, hiddenJob.id, hiddenJob.customerId);

    const reportState = await assertOk(fixture.baseUrl, "/api/daily-reports", {
      method: "POST",
      headers: officeHeaders,
      body: JSON.stringify({
        jobId: "J-2201",
        reportDate: "2035-08-11",
        crewSummary: "Visible report crew",
        workPerformed: "Visible report should disappear if linked to a hidden job.",
      }),
    });
    const report = reportState.dailyReports.find((entry) => entry.reportDate === "2035-08-11");
    assert.ok(report);
    setDailyReportJob(fixture.sqliteFile, report.id, hiddenJob.id);

    const reportsPayload = await assertOk(fixture.baseUrl, "/api/daily-reports", { headers: officeHeaders });
    assert.equal(reportsPayload.dailyReports.some((entry) => entry.id === report.id), false);
    const serializedReports = JSON.stringify(reportsPayload.dailyReports);
    assert.equal(serializedReports.includes("Hidden Daily Report Job"), false);
    assert.equal(serializedReports.includes("Hidden Daily Report Customer"), false);
    assert.equal(serializedReports.includes("700 Hidden Report Lane"), false);

    const bootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", { headers: officeHeaders });
    assert.equal(bootstrap.dailyReports.some((entry) => entry.id === report.id), false);
    const serializedBootstrapReports = JSON.stringify(bootstrap.dailyReports);
    assert.equal(serializedBootstrapReports.includes("Hidden Daily Report Job"), false);
    assert.equal(serializedBootstrapReports.includes("Hidden Daily Report Customer"), false);
    assert.equal(serializedBootstrapReports.includes("700 Hidden Report Lane"), false);
  } finally {
    await fixture.stop();
  }
});
