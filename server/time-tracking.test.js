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
  return 6100 + Math.floor(Math.random() * 1000);
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

  throw new Error(`Time tracking test server did not become ready.\n${serverOutput()}`);
}

async function startServer() {
  const tempDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "concrete-ops-time-"));
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
    headers: {
      "Content-Type": "application/json",
      "X-Apex-Auth-Mode": "bearer",
    },
    body: JSON.stringify({ ...credentials, returnToken: true }),
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

function configureJobs(sqliteFile) {
  const database = new DatabaseSync(sqliteFile);
  try {
    database.prepare(`
      UPDATE jobs
      SET field_planning_visible = 1,
          visible_to_foreman = 1,
          scheduled_start = '2026-05-03T08:00'
      WHERE id = 'J-2198'
    `).run();
  } finally {
    database.close();
  }
}

test("employees and foremen can track field time with proper visibility and break handling", async () => {
  const fixture = await startServer();

  try {
    const foremanUser = createUserRecord({
      id: "U-TIME-FOREMAN",
      email: "time-foreman@lastyard.test",
      password: "apexdemo123",
      name: "Time Foreman",
      role: "Foreman",
    });
    const employeeUser = createUserRecord({
      id: "U-TIME-EMPLOYEE",
      email: "time-employee@lastyard.test",
      password: "apexdemo123",
      name: "Time Employee",
      role: "Employee",
    });
    const secondEmployee = createUserRecord({
      id: "U-TIME-EMPLOYEE-2",
      email: "time-employee-2@lastyard.test",
      password: "apexdemo123",
      name: "Other Employee",
      role: "Employee",
    });

    insertUsers(fixture.sqliteFile, [foremanUser, employeeUser, secondEmployee]);
    configureJobs(fixture.sqliteFile);

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
    await assertOk(fixture.baseUrl, "/api/jobs/J-2201/assignments", {
      method: "POST",
      headers: officeHeaders,
      body: JSON.stringify({
        userId: secondEmployee.id,
        roleOnJob: "driver",
      }),
    });
    await assertOk(fixture.baseUrl, "/api/jobs/J-2198/assignments", {
      method: "POST",
      headers: officeHeaders,
      body: JSON.stringify({
        userId: foremanUser.id,
        roleOnJob: "foreman",
      }),
    });

    const employeeLogin = await login(fixture.baseUrl, {
      email: "time-employee@lastyard.test",
      password: "apexdemo123",
    });
    const employeeHeaders = authHeaders(employeeLogin.token);

    const deniedClockIn = await requestJson(fixture.baseUrl, "/api/time-entries/clock-in", {
      method: "POST",
      headers: employeeHeaders,
      body: JSON.stringify({
        workCategory: "job",
        jobId: "J-2192",
      }),
    });
    assert.equal(deniedClockIn.response.status, 403);

    const missingJob = await requestJson(fixture.baseUrl, "/api/time-entries/clock-in", {
      method: "POST",
      headers: employeeHeaders,
      body: JSON.stringify({
        workCategory: "job",
      }),
    });
    assert.equal(missingJob.response.status, 400);

    const wrongCategory = await requestJson(fixture.baseUrl, "/api/time-entries/clock-in", {
      method: "POST",
      headers: employeeHeaders,
      body: JSON.stringify({
        workCategory: "travel",
      }),
    });
    assert.equal(wrongCategory.response.status, 403);

    const policyDisabledLocationClockIn = await requestJson(fixture.baseUrl, "/api/time-entries/clock-in", {
      method: "POST",
      headers: employeeHeaders,
      body: JSON.stringify({
        workCategory: "job",
        jobId: "J-2201",
        clockInLatitude: 44.95621,
        clockInLongitude: -123.03481,
      }),
    });
    assert.equal(policyDisabledLocationClockIn.response.status, 403);
    assert.match(policyDisabledLocationClockIn.payload.error, /location evidence is disabled/i);

    const settingsWithLocationPolicy = await assertOk(fixture.baseUrl, "/api/settings/company", {
      method: "PATCH",
      headers: officeHeaders,
      body: JSON.stringify({
        timeLocationEvidencePolicy: {
          enabled: true,
          presenceReviewEnabled: true,
          presenceReviewRadiusMeters: 100,
          workerNotice: "Crew can optionally capture GPS at clock-in or clock-out only.",
        },
      }),
    });
    assert.equal(settingsWithLocationPolicy.companySettings.timeLocationEvidencePolicy.enabled, true);
    assert.equal(settingsWithLocationPolicy.companySettings.timeLocationEvidencePolicy.presenceReviewEnabled, true);
    assert.equal(settingsWithLocationPolicy.companySettings.timeLocationEvidencePolicy.presenceReviewRadiusMeters, 100);
    assert.match(settingsWithLocationPolicy.companySettings.timeLocationEvidencePolicy.workerNotice, /optionally capture GPS/);
    assert.ok(settingsWithLocationPolicy.auditEvents.some((event) => event.entityId === "timeLocationEvidencePolicy" && event.action === "enabled"));

    const clockedInState = await assertOk(fixture.baseUrl, "/api/time-entries/clock-in", {
      method: "POST",
      headers: employeeHeaders,
      body: JSON.stringify({
        workCategory: "job",
        jobId: "J-2201",
        notes: "Started on site prep",
        clockInLatitude: 44.95621,
        clockInLongitude: -123.03481,
        clockInLocationAccuracy: 8,
        clockInLocationCapturedAt: "2026-05-29T15:00:00.000Z",
      }),
    });
    const activeEntry = clockedInState.timeEntries.find((entry) => entry.userId === employeeUser.id);
    assert.ok(activeEntry);
    assert.equal(activeEntry.status, "active");
    assert.equal(activeEntry.jobId, "J-2201");
    assert.equal(activeEntry.workCategory, "job");
    assert.equal(activeEntry.clockInLatitude, 44.95621);
    assert.equal(activeEntry.clockInLongitude, -123.03481);
    assert.equal(activeEntry.clockInLocationAccuracy, 8);
    assert.equal(activeEntry.clockInLocationCapturedAt, "2026-05-29T15:00:00.000Z");
    assert.equal(activeEntry.clockInLocationUnavailableReason, "");

    const invalidClockOutLocation = await requestJson(fixture.baseUrl, `/api/time-entries/${activeEntry.id}/clock-out`, {
      method: "POST",
      headers: employeeHeaders,
      body: JSON.stringify({
        clockOutLatitude: 44.95622,
      }),
    });
    assert.equal(invalidClockOutLocation.response.status, 400);

    const duplicateClockIn = await requestJson(fixture.baseUrl, "/api/time-entries/clock-in", {
      method: "POST",
      headers: employeeHeaders,
      body: JSON.stringify({
        workCategory: "job",
        jobId: "J-2201",
      }),
    });
    assert.equal(duplicateClockIn.response.status, 409);

    const onBreakState = await assertOk(fixture.baseUrl, `/api/time-entries/${activeEntry.id}/break-start`, {
      method: "POST",
      headers: employeeHeaders,
    });
    const onBreakEntry = onBreakState.timeEntries.find((entry) => entry.id === activeEntry.id);
    assert.equal(onBreakEntry.status, "on_break");

    const resumedState = await assertOk(fixture.baseUrl, `/api/time-entries/${activeEntry.id}/break-end`, {
      method: "POST",
      headers: employeeHeaders,
    });
    const resumedEntry = resumedState.timeEntries.find((entry) => entry.id === activeEntry.id);
    assert.equal(resumedEntry.status, "active");

    const clockedOutState = await assertOk(fixture.baseUrl, `/api/time-entries/${activeEntry.id}/clock-out`, {
      method: "POST",
      headers: employeeHeaders,
      body: JSON.stringify({
        clockOutLatitude: 44.9605,
        clockOutLongitude: -123.03481,
        clockOutLocationAccuracy: 11,
        clockOutLocationCapturedAt: "2026-05-29T18:00:00.000Z",
      }),
    });
    const completedEntry = clockedOutState.timeEntries.find((entry) => entry.id === activeEntry.id);
    assert.equal(completedEntry.status, "completed");
    assert.ok(completedEntry.totalMinutes >= 0);
    assert.ok(completedEntry.breakMinutes >= 0);
    assert.equal(completedEntry.clockOutLatitude, 44.9605);
    assert.equal(completedEntry.clockOutLongitude, -123.03481);
    assert.equal(completedEntry.clockOutLocationUnavailableReason, "");
    assert.equal(completedEntry.jobsitePresenceReview.status, "needs_review");
    assert.match(completedEntry.jobsitePresenceReview.detail, /Review before using this for payroll, discipline, or job status decisions/);

    const employeePresenceReview = await requestJson(fixture.baseUrl, `/api/time-entries/${activeEntry.id}/presence-review`, {
      method: "POST",
      headers: employeeHeaders,
      body: JSON.stringify({
        note: "Employee should not be able to close this review.",
      }),
    });
    assert.equal(employeePresenceReview.response.status, 403);

    const presenceReviewedState = await assertOk(fixture.baseUrl, `/api/time-entries/${activeEntry.id}/presence-review`, {
      method: "POST",
      headers: officeHeaders,
      body: JSON.stringify({
        note: "Reviewed with foreman; clock-out was at the material gate after cleanup.",
      }),
    });
    const reviewedEntry = presenceReviewedState.timeEntries.find((entry) => entry.id === activeEntry.id);
    assert.equal(reviewedEntry.jobsitePresenceReviewStatus, "reviewed");
    assert.ok(reviewedEntry.jobsitePresenceReviewedByName);
    assert.match(reviewedEntry.jobsitePresenceReviewNote, /material gate/);
    assert.equal(reviewedEntry.jobsitePresenceReview.status, "reviewed");
    assert.ok(presenceReviewedState.auditEvents.some((event) => event.entityType === "timeEntry" && event.action === "presence_reviewed"));

    const employeeTime = await assertOk(fixture.baseUrl, "/api/time-entries", {
      headers: employeeHeaders,
    });
    assert.deepEqual(employeeTime.timeEntries.map((entry) => entry.userId), [employeeUser.id]);
    assert.equal("payRate" in employeeTime.timeEntries[0], false);
    assert.equal("grossPay" in employeeTime.timeEntries[0], false);

    const secondEmployeeLogin = await login(fixture.baseUrl, {
      email: "time-employee-2@lastyard.test",
      password: "apexdemo123",
    });
    const secondEmployeeTime = await assertOk(fixture.baseUrl, "/api/time-entries", {
      headers: authHeaders(secondEmployeeLogin.token),
    });
    assert.equal(secondEmployeeTime.timeEntries.length, 0);

    const foremanLogin = await login(fixture.baseUrl, {
      email: "time-foreman@lastyard.test",
      password: "apexdemo123",
    });
    const foremanHeaders = authHeaders(foremanLogin.token);
    const foremanOwnClock = await assertOk(fixture.baseUrl, "/api/time-entries/clock-in", {
      method: "POST",
      headers: foremanHeaders,
      body: JSON.stringify({
        workCategory: "job",
        jobId: "J-2198",
      }),
    });
    const foremanOwnEntry = foremanOwnClock.timeEntries.find((entry) => entry.userId === foremanUser.id);
    assert.ok(foremanOwnEntry);

    const foremanTravel = await requestJson(fixture.baseUrl, "/api/time-entries/clock-in", {
      method: "POST",
      headers: authHeaders(secondEmployeeLogin.token),
      body: JSON.stringify({
        workCategory: "travel",
      }),
    });
    assert.equal(foremanTravel.response.status, 403);

    const foremanTime = await assertOk(fixture.baseUrl, "/api/time-entries", {
      headers: foremanHeaders,
    });
    assert.equal(foremanTime.timeEntries.some((entry) => entry.userId === employeeUser.id), true);
    assert.equal(foremanTime.timeEntries.some((entry) => entry.userId === foremanUser.id), true);
    assert.equal("payRate" in foremanTime.timeEntries[0], false);
    assert.equal("grossPay" in foremanTime.timeEntries[0], false);

    const foremanCorrectDenied = await requestJson(fixture.baseUrl, `/api/time-entries/${activeEntry.id}`, {
      method: "PATCH",
      headers: foremanHeaders,
      body: JSON.stringify({
        notes: "Trying to change office-only time data",
      }),
    });
    assert.equal(foremanCorrectDenied.response.status, 403);
  } finally {
    await fixture.stop();
  }
});

test("estimators, operations, administrators, and owners get the expected role-scoped time access", async () => {
  const fixture = await startServer();

  try {
    const ownerUser = createUserRecord({
      id: "U-TIME-OWNER",
      email: "time-owner@lastyard.test",
      password: "apexdemo123",
      name: "Time Owner",
      role: "Owner",
    });
    const adminUser = createUserRecord({
      id: "U-TIME-ADMIN",
      email: "time-admin@lastyard.test",
      password: "apexdemo123",
      name: "Time Admin",
      role: "Administrator",
    });
    const opsUser = createUserRecord({
      id: "U-TIME-OPS",
      email: "time-demo.ops@apexhq.app",
      password: "apexdemo123",
      name: "Time Ops",
      role: "Operations Manager",
    });
    const estimatorUser = createUserRecord({
      id: "U-TIME-EST",
      email: "time-estimator@lastyard.test",
      password: "apexdemo123",
      name: "Time Estimator",
      role: "Estimator",
    });
    const employeeUser = createUserRecord({
      id: "U-TIME-EMPLOYEE-OFFICE",
      email: "time-employee-office@lastyard.test",
      password: "apexdemo123",
      name: "Time Employee Office",
      role: "Employee",
    });

    insertUsers(fixture.sqliteFile, [ownerUser, adminUser, opsUser, estimatorUser, employeeUser]);
    configureJobs(fixture.sqliteFile);

    const officeLogin = await login(fixture.baseUrl, {
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
    });
    const officeHeaders = authHeaders(officeLogin.token);
    await assertOk(fixture.baseUrl, "/api/jobs/J-2201/assignments", {
      method: "POST",
      headers: officeHeaders,
      body: JSON.stringify({
        userId: employeeUser.id,
        roleOnJob: "crew",
      }),
    });

    const estimatorLogin = await login(fixture.baseUrl, {
      email: "time-estimator@lastyard.test",
      password: "apexdemo123",
    });
    const estimatorHeaders = authHeaders(estimatorLogin.token);
    const estimatorClockIn = await assertOk(fixture.baseUrl, "/api/time-entries/clock-in", {
      method: "POST",
      headers: estimatorHeaders,
      body: JSON.stringify({
        workCategory: "estimating",
        notes: "Proposal review",
      }),
    });
    const estimatorEntry = estimatorClockIn.timeEntries.find((entry) => entry.userId === estimatorUser.id);
    assert.equal(estimatorEntry.workCategory, "estimating");
    assert.equal(estimatorEntry.jobId, "");

    const estimatorLeadFollowUp = await requestJson(fixture.baseUrl, "/api/time-entries/clock-in", {
      method: "POST",
      headers: estimatorHeaders,
      body: JSON.stringify({
        workCategory: "lead_follow_up",
      }),
    });
    assert.equal(estimatorLeadFollowUp.response.status, 409);

    await assertOk(fixture.baseUrl, `/api/time-entries/${estimatorEntry.id}/clock-out`, {
      method: "POST",
      headers: estimatorHeaders,
    });

    const estimatorAllTimeDenied = await requestJson(fixture.baseUrl, "/api/users", {
      headers: estimatorHeaders,
    });
    assert.equal(estimatorAllTimeDenied.response.status, 403);

    const opsLogin = await login(fixture.baseUrl, {
      email: "time-demo.ops@apexhq.app",
      password: "apexdemo123",
    });
    const opsHeaders = authHeaders(opsLogin.token);
    const opsClockIn = await assertOk(fixture.baseUrl, "/api/time-entries/clock-in", {
      method: "POST",
      headers: opsHeaders,
      body: JSON.stringify({
        workCategory: "office_admin",
      }),
    });
    const opsEntry = opsClockIn.timeEntries.find((entry) => entry.userId === opsUser.id);
    assert.equal(opsEntry.workCategory, "office_admin");
    assert.equal(opsEntry.jobId, "");

    const opsInvalidCategory = await requestJson(fixture.baseUrl, "/api/time-entries/clock-in", {
      method: "POST",
      headers: opsHeaders,
      body: JSON.stringify({
        workCategory: "estimating",
      }),
    });
    assert.equal(opsInvalidCategory.response.status, 409);

    await assertOk(fixture.baseUrl, `/api/time-entries/${opsEntry.id}/clock-out`, {
      method: "POST",
      headers: opsHeaders,
    });

    const adminLogin = await login(fixture.baseUrl, {
      email: "time-admin@lastyard.test",
      password: "apexdemo123",
    });
    const adminHeaders = authHeaders(adminLogin.token);
    const adminClockIn = await assertOk(fixture.baseUrl, "/api/time-entries/clock-in", {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        workCategory: "meeting",
      }),
    });
    const adminEntry = adminClockIn.timeEntries.find((entry) => entry.userId === adminUser.id);
    assert.equal(adminEntry.workCategory, "meeting");

    await assertOk(fixture.baseUrl, `/api/time-entries/${adminEntry.id}/clock-out`, {
      method: "POST",
      headers: adminHeaders,
    });

    const employeeLogin = await login(fixture.baseUrl, {
      email: "time-employee-office@lastyard.test",
      password: "apexdemo123",
    });
    const employeeHeaders = authHeaders(employeeLogin.token);
    const employeeClockIn = await assertOk(fixture.baseUrl, "/api/time-entries/clock-in", {
      method: "POST",
      headers: employeeHeaders,
      body: JSON.stringify({
        workCategory: "job",
        jobId: "J-2201",
      }),
    });
    const employeeEntry = employeeClockIn.timeEntries.find((entry) => entry.userId === employeeUser.id);

    const adminAllTime = await assertOk(fixture.baseUrl, "/api/time-entries", {
      headers: adminHeaders,
    });
    assert.equal(adminAllTime.timeEntries.length >= 4, true);

    const correctedState = await assertOk(fixture.baseUrl, `/api/time-entries/${employeeEntry.id}`, {
      method: "PATCH",
      headers: adminHeaders,
      body: JSON.stringify({
        workCategory: "job",
        jobId: "J-2201",
        notes: "Corrected by admin",
      }),
    });
    const correctedEntry = correctedState.timeEntries.find((entry) => entry.id === employeeEntry.id);
    assert.equal(correctedEntry.notes, "Corrected by admin");
    assert.ok(correctedState.auditEvents.some((event) => event.entityType === "timeEntry" && event.action === "corrected"));

    const ownerLogin = await login(fixture.baseUrl, {
      email: "time-owner@lastyard.test",
      password: "apexdemo123",
    });
    const ownerHeaders = authHeaders(ownerLogin.token);
    const ownerClockDenied = await requestJson(fixture.baseUrl, "/api/time-entries/clock-in", {
      method: "POST",
      headers: ownerHeaders,
      body: JSON.stringify({
        workCategory: "meeting",
      }),
    });
    assert.equal(ownerClockDenied.response.status, 403);

    const ownerAllTime = await assertOk(fixture.baseUrl, "/api/time-entries", {
      headers: ownerHeaders,
    });
    assert.equal(ownerAllTime.timeEntries.length >= 4, true);
  } finally {
    await fixture.stop();
  }
});
