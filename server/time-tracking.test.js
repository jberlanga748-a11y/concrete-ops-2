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

test("employees can track their own time on assigned jobs and foremen plus office get scoped visibility", async () => {
  const fixture = await startServer();

  try {
    const foremanUser = createUserRecord({
      id: "U-TIME-FOREMAN",
      email: "time-foreman@lastyard.test",
      password: "concrete123",
      name: "Time Foreman",
      role: "Foreman",
    });
    const employeeUser = createUserRecord({
      id: "U-TIME-EMPLOYEE",
      email: "time-employee@lastyard.test",
      password: "concrete123",
      name: "Time Employee",
      role: "Employee",
    });
    const secondEmployee = createUserRecord({
      id: "U-TIME-EMPLOYEE-2",
      email: "time-employee-2@lastyard.test",
      password: "concrete123",
      name: "Other Employee",
      role: "Employee",
    });

    insertUsers(fixture.sqliteFile, [foremanUser, employeeUser, secondEmployee]);
    configureJobs(fixture.sqliteFile);

    const opsLogin = await login(fixture.baseUrl, {
      email: "ops@lastyard.test",
      password: "concrete123",
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
      password: "concrete123",
    });
    const employeeHeaders = authHeaders(employeeLogin.token);

    const deniedClockIn = await requestJson(fixture.baseUrl, "/api/time-entries/clock-in", {
      method: "POST",
      headers: employeeHeaders,
      body: JSON.stringify({
        jobId: "J-2192",
      }),
    });
    assert.equal(deniedClockIn.response.status, 403);

    const clockedInState = await assertOk(fixture.baseUrl, "/api/time-entries/clock-in", {
      method: "POST",
      headers: employeeHeaders,
      body: JSON.stringify({
        jobId: "J-2201",
        notes: "Started on site prep",
      }),
    });
    const activeEntry = clockedInState.timeEntries.find((entry) => entry.userId === employeeUser.id);
    assert.ok(activeEntry);
    assert.equal(activeEntry.status, "active");
    assert.equal(activeEntry.jobId, "J-2201");

    const duplicateClockIn = await requestJson(fixture.baseUrl, "/api/time-entries/clock-in", {
      method: "POST",
      headers: employeeHeaders,
      body: JSON.stringify({
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
    });
    const completedEntry = clockedOutState.timeEntries.find((entry) => entry.id === activeEntry.id);
    assert.equal(completedEntry.status, "completed");
    assert.ok(typeof completedEntry.totalMinutes === "number");
    assert.ok(typeof completedEntry.breakMinutes === "number");

    const employeeTime = await assertOk(fixture.baseUrl, "/api/time-entries", {
      headers: employeeHeaders,
    });
    assert.deepEqual(employeeTime.timeEntries.map((entry) => entry.userId), [employeeUser.id]);
    assert.equal("payRate" in employeeTime.timeEntries[0], false);
    assert.equal("grossPay" in employeeTime.timeEntries[0], false);

    const secondEmployeeLogin = await login(fixture.baseUrl, {
      email: "time-employee-2@lastyard.test",
      password: "concrete123",
    });
    const secondEmployeeTime = await assertOk(fixture.baseUrl, "/api/time-entries", {
      headers: authHeaders(secondEmployeeLogin.token),
    });
    assert.equal(secondEmployeeTime.timeEntries.length, 0);

    const foremanLogin = await login(fixture.baseUrl, {
      email: "time-foreman@lastyard.test",
      password: "concrete123",
    });
    const foremanTime = await assertOk(fixture.baseUrl, "/api/time-entries", {
      headers: authHeaders(foremanLogin.token),
    });
    assert.equal(foremanTime.timeEntries.length, 1);
    assert.equal(foremanTime.timeEntries[0].userId, employeeUser.id);
    assert.equal("payRate" in foremanTime.timeEntries[0], false);
    assert.equal("grossPay" in foremanTime.timeEntries[0], false);

    const foremanCorrectDenied = await requestJson(fixture.baseUrl, `/api/time-entries/${activeEntry.id}`, {
      method: "PATCH",
      headers: authHeaders(foremanLogin.token),
      body: JSON.stringify({
        notes: "Trying to change office-only time data",
      }),
    });
    assert.equal(foremanCorrectDenied.response.status, 403);

    const correctedState = await assertOk(fixture.baseUrl, `/api/time-entries/${activeEntry.id}`, {
      method: "PATCH",
      headers: officeHeaders,
      body: JSON.stringify({
        notes: "Adjusted by office",
      }),
    });
    const correctedEntry = correctedState.timeEntries.find((entry) => entry.id === activeEntry.id);
    assert.equal(correctedEntry.notes, "Adjusted by office");
    assert.ok(correctedState.auditEvents.some((event) => event.entityType === "timeEntry" && event.action === "corrected"));

    const officeTime = await assertOk(fixture.baseUrl, "/api/time-entries", {
      headers: officeHeaders,
    });
    assert.equal(officeTime.timeEntries.length, 1);
    assert.equal(officeTime.timeEntries[0].userId, employeeUser.id);
  } finally {
    await fixture.stop();
  }
});
