import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

import { createUserRecord } from "./store.js";
import { markStartupItem, normalizeStartupChecklist } from "../shared/jobStartup.js";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createPort() {
  return 5700 + Math.floor(Math.random() * 1000);
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

  throw new Error(`Jobs workflow test server did not become ready.\n${serverOutput()}`);
}

async function startServer() {
  const tempDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "concrete-ops-jobs-"));
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

function configureAssignedJobs(sqliteFile, { foremanId, employeeId }) {
  const database = new DatabaseSync(sqliteFile);
  try {
    database.prepare(`
      UPDATE jobs
      SET assigned_foreman_id = ?,
          assigned_user_id = ?,
          field_planning_visible = 0,
          visible_to_foreman = 0,
          scheduled_start = '2026-04-25T07:30',
          status = 'in_progress'
      WHERE id = 'J-2201'
    `).run(foremanId, employeeId);

    database.prepare(`
      UPDATE jobs
      SET assigned_foreman_id = ?,
          assigned_user_id = '',
          field_planning_visible = 1,
          visible_to_foreman = 1,
          scheduled_start = '2026-05-03T08:00',
          status = 'scheduled'
      WHERE id = 'J-2198'
    `).run(foremanId);

    database.prepare(`
      UPDATE jobs
      SET assigned_foreman_id = '',
          assigned_user_id = '',
          field_planning_visible = 0,
          visible_to_foreman = 0
      WHERE id = 'J-2192'
    `).run();
  } finally {
    database.close();
  }
}

test("office roles can create, update, archive, and restore jobs with audit events", async () => {
  const fixture = await startServer();

  try {
    const foremanUser = createUserRecord({
      id: "U-FOREMAN-JOBS",
      email: "foreman-jobs@lastyard.test",
      password: "apexdemo123",
      name: "Field Foreman",
      role: "Foreman",
    });

    insertUsers(fixture.sqliteFile, [foremanUser]);

    const opsLogin = await login(fixture.baseUrl, {
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
    });
    const headers = authHeaders(opsLogin.token);

    const createState = await assertOk(fixture.baseUrl, "/api/jobs", {
      method: "POST",
      headers,
      body: JSON.stringify({
        title: "West Salem Steps",
        customer: "Dana Martinez",
        address: "601 Orchard St NW, Salem, OR",
        siteContact: "Dana Martinez · 503-555-0133",
        scopeSummary: "Front step replacement and landing pour.",
        scheduledStart: "2026-05-06T08:00",
        estimatedDuration: "2 days",
        status: "planned",
        assignedForemanId: foremanUser.id,
        crew: "Field crew",
        crewSizeNeeded: 3,
        materialNotes: "Rebar and finish notes only.",
        fieldPlanningVisible: true,
        visibleToForeman: true,
        nextStep: "Confirm demo crew and saw cut layout",
        notes: "Office-only schedule notes.",
      }),
    });

    const createdJob = createState.jobs.find((job) => job.title === "West Salem Steps");
    assert.ok(createdJob, "Expected created job to be returned.");
    assert.equal(createdJob.status, "planned");
    assert.equal(createdJob.assignedForemanId, foremanUser.id);
    assert.ok(createState.auditEvents.some((event) => event.entityType === "job" && event.entityId === createdJob.id && event.action === "created"));
    assert.ok(createState.auditEvents.some((event) => event.entityType === "job" && event.entityId === createdJob.id && event.action === "assigned"));

    const updateState = await assertOk(fixture.baseUrl, `/api/jobs/${createdJob.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        status: "scheduled",
        scheduledEnd: "2026-05-07T16:00",
        assignedForemanId: "",
        assignedUserId: "",
      }),
    });

    const updatedJob = updateState.jobs.find((job) => job.id === createdJob.id);
    assert.equal(updatedJob.status, "scheduled");
    assert.equal(updatedJob.scheduledEnd, "2026-05-07T16:00");
    assert.ok(updateState.auditEvents.some((event) => event.entityType === "job" && event.entityId === createdJob.id && event.action === "status_changed"));
    assert.ok(updateState.auditEvents.some((event) => event.entityType === "job" && event.entityId === createdJob.id && event.action === "assigned"));

    const archivedState = await assertOk(fixture.baseUrl, `/api/jobs/${createdJob.id}/archive`, {
      method: "POST",
      headers,
    });
    const archivedJob = archivedState.jobs.find((job) => job.id === createdJob.id);
    assert.ok(archivedJob.archivedAt);

    const restoredState = await assertOk(fixture.baseUrl, `/api/jobs/${createdJob.id}/restore`, {
      method: "POST",
      headers,
    });
    const restoredJob = restoredState.jobs.find((job) => job.id === createdJob.id);
    assert.equal(restoredJob.archivedAt, null);
  } finally {
    await fixture.stop();
  }
});

test("foremen see assigned and future field-visible jobs and can only submit limited field updates", async () => {
  const fixture = await startServer();

  try {
    const foremanUser = createUserRecord({
      id: "U-FOREMAN-JOBS-VIEW",
      email: "foreman-view@lastyard.test",
      password: "apexdemo123",
      name: "Foreman View",
      role: "Foreman",
    });
    const employeeUser = createUserRecord({
      id: "U-EMPLOYEE-JOBS-VIEW",
      email: "employee-view@lastyard.test",
      password: "apexdemo123",
      name: "Field Employee",
      role: "Employee",
    });

    insertUsers(fixture.sqliteFile, [foremanUser, employeeUser]);
    configureAssignedJobs(fixture.sqliteFile, { foremanId: foremanUser.id, employeeId: employeeUser.id });

    const foremanLogin = await login(fixture.baseUrl, {
      email: "foreman-view@lastyard.test",
      password: "apexdemo123",
    });
    const headers = authHeaders(foremanLogin.token);
    const jobsState = await assertOk(fixture.baseUrl, "/api/jobs", { headers });

    assert.deepEqual(jobsState.jobs.map((job) => job.id).sort(), ["J-2198", "J-2201"]);
    assert.ok(jobsState.jobs.every((job) => !("notes" in job)));
    assert.ok(jobsState.jobs.every((job) => !("value" in job)));
    assert.ok(jobsState.jobs.every((job) => typeof job.status === "string"));
    assert.ok(jobsState.jobs.every((job) => typeof job.scopeSummary === "string"));

    const updateState = await assertOk(fixture.baseUrl, "/api/jobs/J-2201", {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        status: "field_complete",
        progress: 100,
        fieldNotes: "Crew wrapped field work and uploaded finish photos.",
      }),
    });

    const updatedJob = updateState.jobs.find((job) => job.id === "J-2201");
    assert.equal(updatedJob.status, "field_complete");
    assert.equal(updatedJob.progress, 100);
    assert.equal(updatedJob.fieldNotes, "Crew wrapped field work and uploaded finish photos.");

    const forbiddenUpdate = await requestJson(fixture.baseUrl, "/api/jobs/J-2198", {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        status: "billing_ready",
      }),
    });
    assert.equal(forbiddenUpdate.response.status, 403);
  } finally {
    await fixture.stop();
  }
});

test("employees only see assigned jobs and cannot create, edit, or archive jobs", async () => {
  const fixture = await startServer();

  try {
    const foremanUser = createUserRecord({
      id: "U-FOREMAN-JOBS-EMP",
      email: "foreman-emp@lastyard.test",
      password: "apexdemo123",
      name: "Foreman Assign",
      role: "Foreman",
    });
    const employeeUser = createUserRecord({
      id: "U-EMPLOYEE-JOBS-EMP",
      email: "employee-emp@lastyard.test",
      password: "apexdemo123",
      name: "Employee Assign",
      role: "Employee",
    });

    insertUsers(fixture.sqliteFile, [foremanUser, employeeUser]);
    configureAssignedJobs(fixture.sqliteFile, { foremanId: foremanUser.id, employeeId: employeeUser.id });

    const employeeLogin = await login(fixture.baseUrl, {
      email: "employee-emp@lastyard.test",
      password: "apexdemo123",
    });
    const headers = authHeaders(employeeLogin.token);
    const jobsState = await assertOk(fixture.baseUrl, "/api/jobs", { headers });

    assert.deepEqual(jobsState.jobs.map((job) => job.id), ["J-2201"]);
    assert.ok(jobsState.jobs.every((job) => !("notes" in job)));
    assert.ok(jobsState.jobs.every((job) => !("value" in job)));

    const createDenied = await requestJson(fixture.baseUrl, "/api/jobs", {
      method: "POST",
      headers,
      body: JSON.stringify({
        title: "Blocked Job",
        customer: "Blocked Customer",
      }),
    });
    assert.equal(createDenied.response.status, 403);

    const patchDenied = await requestJson(fixture.baseUrl, "/api/jobs/J-2201", {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        fieldNotes: "Trying to edit through the general job endpoint.",
      }),
    });
    assert.equal(patchDenied.response.status, 403);

    const archiveDenied = await requestJson(fixture.baseUrl, "/api/jobs/J-2201/archive", {
      method: "POST",
      headers,
    });
    assert.equal(archiveDenied.response.status, 403);
  } finally {
    await fixture.stop();
  }
});

test("manual jobs can initialize and persist startup checklist readiness", async () => {
  const fixture = await startServer();

  try {
    const opsLogin = await login(fixture.baseUrl, {
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
    });
    const headers = authHeaders(opsLogin.token);

    const createState = await assertOk(fixture.baseUrl, "/api/jobs", {
      method: "POST",
      headers,
      body: JSON.stringify({
        title: "Startup Review Slab",
        customer: "North Valley Shop",
        address: "22 Shop Rd, Albany, OR",
        scopeSummary: "Prepare and pour shop slab.",
        status: "planned",
      }),
    });
    const createdJob = createState.jobs.find((job) => job.title === "Startup Review Slab");
    assert.equal(createdJob.startupStatus, "Not Started");
    assert.equal(createdJob.startupChecklist.length, 18);

    const partialChecklist = markStartupItem(normalizeStartupChecklist(createdJob.startupChecklist), "customerContactConfirmed", { checked: true }, { changedAt: "2026-05-10T10:00:00.000Z" });
    const blockedReady = await requestJson(fixture.baseUrl, `/api/jobs/${createdJob.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        startupChecklist: partialChecklist,
        startupStatus: "Ready for Field",
      }),
    });
    assert.equal(blockedReady.response.status, 400);

    let readyChecklist = partialChecklist;
    for (const key of ["jobAddressConfirmed", "scopeReviewed"]) {
      readyChecklist = markStartupItem(readyChecklist, key, { checked: true }, { changedAt: "2026-05-10T10:05:00.000Z" });
    }
    readyChecklist = markStartupItem(readyChecklist, "crewAssigned", { tbd: true }, { changedAt: "2026-05-10T10:05:00.000Z" });
    readyChecklist = markStartupItem(readyChecklist, "startDateSet", { tbd: true }, { changedAt: "2026-05-10T10:05:00.000Z" });

    const readyState = await assertOk(fixture.baseUrl, `/api/jobs/${createdJob.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        startupChecklist: readyChecklist,
        startupStatus: "Ready for Field",
        startupNotes: "Crew and start date are TBD until the setup call.",
      }),
    });
    const readyJob = readyState.jobs.find((job) => job.id === createdJob.id);
    assert.equal(readyJob.startupStatus, "Ready for Field");
    assert.match(readyJob.startupNotes, /setup call/);
    assert.ok(readyJob.startupLastUpdatedAt);

    const refreshedState = await assertOk(fixture.baseUrl, "/api/bootstrap", { headers });
    const persistedJob = refreshedState.jobs.find((job) => job.id === createdJob.id);
    assert.equal(persistedJob.startupStatus, "Ready for Field");
    assert.equal(persistedJob.startupChecklist.find((item) => item.key === "crewAssigned").tbd, true);
  } finally {
    await fixture.stop();
  }
});
