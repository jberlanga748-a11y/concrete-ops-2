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
  return 5800 + Math.floor(Math.random() * 1000);
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

  throw new Error(`Crew assignment test server did not become ready.\n${serverOutput()}`);
}

async function startServer() {
  const tempDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "concrete-ops-crew-"));
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

function configureCrewPlanning(sqliteFile) {
  const database = new DatabaseSync(sqliteFile);
  try {
    database.prepare(`
      UPDATE jobs
      SET field_planning_visible = 1,
          visible_to_foreman = 1,
          scheduled_start = '2026-05-03T08:00',
          status = 'scheduled'
      WHERE id = 'J-2198'
    `).run();

    database.prepare(`
      UPDATE jobs
      SET field_planning_visible = 0,
          visible_to_foreman = 0,
          scheduled_start = '2026-05-08T08:00',
          status = 'scheduled',
          assigned_foreman_id = '',
          assigned_user_id = ''
      WHERE id = 'J-2192'
    `).run();
  } finally {
    database.close();
  }
}

function seedLegacyCrewAliasConflict(sqliteFile, userId) {
  const database = new DatabaseSync(sqliteFile);
  try {
    database.prepare(`
      UPDATE jobs
      SET assigned_user_id = ?,
          assigned_foreman_id = '',
          updated_at = '2026-05-01T08:00:00.000Z'
      WHERE id = 'J-2201'
    `).run(userId);

    database.prepare(`
      INSERT INTO job_assignments (id, sort_index, job_id, user_id, role_on_job, assigned_by, assigned_at, removed_at, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      "JA-LEGACY-J-2201-crew",
      0,
      "J-2201",
      userId,
      "crew",
      "",
      "2026-04-30T08:00:00.000Z",
      "2026-04-30T09:00:00.000Z",
      "",
      "2026-04-30T08:00:00.000Z",
      "2026-04-30T09:00:00.000Z",
    );
  } finally {
    database.close();
  }
}

function updateJobFieldNotes(sqliteFile, notes) {
  const database = new DatabaseSync(sqliteFile);
  try {
    database.prepare(`
      UPDATE jobs
      SET field_notes = ?,
          updated_at = '2026-05-01T10:00:00.000Z'
      WHERE id = 'J-2201'
    `).run(notes);
  } finally {
    database.close();
  }
}

function listAssignments(sqliteFile, jobId = "J-2201") {
  const database = new DatabaseSync(sqliteFile);
  try {
    return database.prepare(`
      SELECT id, job_id AS jobId, user_id AS userId, role_on_job AS roleOnJob, removed_at AS removedAt
      FROM job_assignments
      WHERE job_id = ?
      ORDER BY sort_index ASC
    `).all(jobId);
  } finally {
    database.close();
  }
}

test("office roles can assign foremen and multiple crew members with audit coverage", async () => {
  const fixture = await startServer();

  try {
    const foremanUser = createUserRecord({
      id: "U-CREW-FOREMAN",
      email: "crew-foreman@lastyard.test",
      password: "concrete123",
      name: "Crew Foreman",
      role: "Foreman",
    });
    const employeeOne = createUserRecord({
      id: "U-CREW-EMP-1",
      email: "crew-emp-1@lastyard.test",
      password: "concrete123",
      name: "Crew Employee One",
      role: "Employee",
    });
    const employeeTwo = createUserRecord({
      id: "U-CREW-EMP-2",
      email: "crew-emp-2@lastyard.test",
      password: "concrete123",
      name: "Crew Employee Two",
      role: "Employee",
    });

    insertUsers(fixture.sqliteFile, [foremanUser, employeeOne, employeeTwo]);
    configureCrewPlanning(fixture.sqliteFile);

    const opsLogin = await login(fixture.baseUrl, {
      email: "ops@lastyard.test",
      password: "concrete123",
    });
    const headers = authHeaders(opsLogin.token);

    const foremanState = await assertOk(fixture.baseUrl, "/api/jobs/J-2201/assignments", {
      method: "POST",
      headers,
      body: JSON.stringify({
        userId: foremanUser.id,
        roleOnJob: "foreman",
      }),
    });
    const foremanJob = foremanState.jobs.find((job) => job.id === "J-2201");
    assert.equal(foremanJob.assignedForemanId, foremanUser.id);
    assert.equal(foremanJob.foremanAssignment?.userId, foremanUser.id);
    assert.ok(foremanState.auditEvents.some((event) => event.entityType === "job" && event.entityId === "J-2201" && event.action === "foreman_assigned"));

    const crewState = await assertOk(fixture.baseUrl, "/api/jobs/J-2201/assignments", {
      method: "POST",
      headers,
      body: JSON.stringify({
        userId: employeeOne.id,
        roleOnJob: "crew",
        notes: "Prep and cleanup",
      }),
    });
    const firstCrewJob = crewState.jobs.find((job) => job.id === "J-2201");
    assert.equal(firstCrewJob.crewAssignments.length >= 1, true);
    const firstCrewAssignment = firstCrewJob.crewAssignments.find((assignment) => assignment.userId === employeeOne.id);
    assert.ok(firstCrewAssignment);
    assert.ok(crewState.auditEvents.some((event) => event.entityType === "job" && event.entityId === "J-2201" && event.action === "crew_assigned"));

    const secondCrewState = await assertOk(fixture.baseUrl, "/api/jobs/J-2201/assignments", {
      method: "POST",
      headers,
      body: JSON.stringify({
        userId: employeeTwo.id,
        roleOnJob: "finisher",
      }),
    });
    const secondCrewJob = secondCrewState.jobs.find((job) => job.id === "J-2201");
    assert.equal(secondCrewJob.crewAssignments.length >= 2, true);
    const secondCrewAssignment = secondCrewJob.crewAssignments.find((assignment) => assignment.userId === employeeTwo.id);
    assert.ok(secondCrewAssignment);

    const roleChangedState = await assertOk(fixture.baseUrl, `/api/jobs/J-2201/assignments/${secondCrewAssignment.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        roleOnJob: "operator",
      }),
    });
    const roleChangedJob = roleChangedState.jobs.find((job) => job.id === "J-2201");
    assert.equal(roleChangedJob.crewAssignments.find((assignment) => assignment.id === secondCrewAssignment.id)?.roleOnJob, "operator");
    assert.ok(roleChangedState.auditEvents.some((event) => event.entityType === "job" && event.entityId === "J-2201" && event.action === "assignment_role_changed"));

    const removedState = await assertOk(fixture.baseUrl, `/api/jobs/J-2201/assignments/${firstCrewAssignment.id}`, {
      method: "DELETE",
      headers,
    });
    const removedJob = removedState.jobs.find((job) => job.id === "J-2201");
    assert.equal(removedJob.crewAssignments.some((assignment) => assignment.id === firstCrewAssignment.id), false);
    assert.ok(removedState.auditEvents.some((event) => event.entityType === "job" && event.entityId === "J-2201" && event.action === "crew_removed"));
  } finally {
    await fixture.stop();
  }
});

test("field roles see only crew data appropriate to their assigned work and cannot manage assignments", async () => {
  const fixture = await startServer();

  try {
    const foremanUser = createUserRecord({
      id: "U-CREW-VIEW-FOREMAN",
      email: "crew-view-foreman@lastyard.test",
      password: "concrete123",
      name: "View Foreman",
      role: "Foreman",
    });
    const employeeOne = createUserRecord({
      id: "U-CREW-VIEW-EMP-1",
      email: "crew-view-emp-1@lastyard.test",
      password: "concrete123",
      name: "Assigned Employee",
      role: "Employee",
    });
    const employeeTwo = createUserRecord({
      id: "U-CREW-VIEW-EMP-2",
      email: "crew-view-emp-2@lastyard.test",
      password: "concrete123",
      name: "Other Employee",
      role: "Employee",
    });

    insertUsers(fixture.sqliteFile, [foremanUser, employeeOne, employeeTwo]);
    configureCrewPlanning(fixture.sqliteFile);

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
    await assertOk(fixture.baseUrl, "/api/jobs/J-2198/assignments", {
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
        userId: employeeOne.id,
        roleOnJob: "crew",
        notes: "Should stay hidden from field views",
      }),
    });
    await assertOk(fixture.baseUrl, "/api/jobs/J-2201/assignments", {
      method: "POST",
      headers: officeHeaders,
      body: JSON.stringify({
        userId: employeeTwo.id,
        roleOnJob: "driver",
      }),
    });

    const foremanLogin = await login(fixture.baseUrl, {
      email: "crew-view-foreman@lastyard.test",
      password: "concrete123",
    });
    const foremanJobs = await assertOk(fixture.baseUrl, "/api/jobs", {
      headers: authHeaders(foremanLogin.token),
    });
    assert.deepEqual(foremanJobs.jobs.map((job) => job.id).sort(), ["J-2198", "J-2201"]);
    const foremanAssignedJob = foremanJobs.jobs.find((job) => job.id === "J-2201");
    assert.ok(foremanAssignedJob);
    assert.ok(foremanAssignedJob.crewAssignments.some((assignment) => assignment.userId === employeeOne.id));
    assert.ok(foremanAssignedJob.crewAssignments.some((assignment) => assignment.userId === employeeTwo.id));
    assert.equal(foremanAssignedJob.crewAssignments.every((assignment) => !("notes" in assignment)), true);
    assert.equal("notes" in foremanAssignedJob, false);
    assert.equal("value" in foremanAssignedJob, false);

    const foremanDeniedAssignment = await requestJson(fixture.baseUrl, "/api/jobs/J-2201/assignments", {
      method: "POST",
      headers: authHeaders(foremanLogin.token),
      body: JSON.stringify({
        userId: employeeTwo.id,
        roleOnJob: "crew",
      }),
    });
    assert.equal(foremanDeniedAssignment.response.status, 403);

    const employeeLogin = await login(fixture.baseUrl, {
      email: "crew-view-emp-1@lastyard.test",
      password: "concrete123",
    });
    const employeeJobs = await assertOk(fixture.baseUrl, "/api/jobs", {
      headers: authHeaders(employeeLogin.token),
    });
    assert.deepEqual(employeeJobs.jobs.map((job) => job.id), ["J-2201"]);
    const employeeJob = employeeJobs.jobs[0];
    assert.equal(employeeJob.crewAssignments.length, 1);
    assert.equal(employeeJob.crewAssignments[0].userId, employeeOne.id);
    assert.equal(employeeJob.foremanAssignment?.userId, foremanUser.id);
    assert.equal(employeeJob.crewAssignments.every((assignment) => !("notes" in assignment)), true);
    assert.equal("notes" in employeeJob, false);
    assert.equal("value" in employeeJob, false);

    const employeeDeniedAssignment = await requestJson(fixture.baseUrl, "/api/jobs/J-2201/assignments", {
      method: "POST",
      headers: authHeaders(employeeLogin.token),
      body: JSON.stringify({
        userId: employeeTwo.id,
        roleOnJob: "crew",
      }),
    });
    assert.equal(employeeDeniedAssignment.response.status, 403);
  } finally {
    await fixture.stop();
  }
});

test("legacy assignment aliases do not duplicate persisted rows and stay manageable through office APIs", async () => {
  const fixture = await startServer();

  try {
    const employeeOne = createUserRecord({
      id: "U-CREW-LEGACY-EMP-1",
      email: "crew-legacy-emp-1@lastyard.test",
      password: "concrete123",
      name: "Legacy Crew Employee",
      role: "Employee",
    });
    const employeeTwo = createUserRecord({
      id: "U-CREW-LEGACY-EMP-2",
      email: "crew-legacy-emp-2@lastyard.test",
      password: "concrete123",
      name: "Second Crew Employee",
      role: "Employee",
    });
    const foremanUser = createUserRecord({
      id: "U-CREW-LEGACY-FOREMAN",
      email: "crew-legacy-foreman@lastyard.test",
      password: "concrete123",
      name: "Legacy Foreman",
      role: "Foreman",
    });

    insertUsers(fixture.sqliteFile, [employeeOne, employeeTwo, foremanUser]);
    seedLegacyCrewAliasConflict(fixture.sqliteFile, employeeOne.id);

    const opsLogin = await login(fixture.baseUrl, {
      email: "ops@lastyard.test",
      password: "concrete123",
    });
    const headers = authHeaders(opsLogin.token);

    const firstBootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", { headers });
    const legacyJob = firstBootstrap.jobs.find((job) => job.id === "J-2201");
    assert.ok(legacyJob);
    assert.equal(legacyJob.crewAssignments.length, 1);
    assert.equal(legacyJob.crewAssignments[0].userId, employeeOne.id);

    const secondBootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", { headers });
    assert.equal(secondBootstrap.jobs.find((job) => job.id === "J-2201").crewAssignments.length, 1);

    const duplicateLegacyAddAttempt = await requestJson(fixture.baseUrl, "/api/jobs/J-2201/assignments", {
      method: "POST",
      headers,
      body: JSON.stringify({
        userId: employeeOne.id,
        roleOnJob: "finisher",
      }),
    });
    assert.equal(duplicateLegacyAddAttempt.response.status, 409);

    const touchedJobState = await assertOk(fixture.baseUrl, "/api/jobs/J-2201", {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        fieldNotes: "Legacy assignment dedupe check.",
      }),
    });
    assert.equal(touchedJobState.jobs.find((job) => job.id === "J-2201").id, "J-2201");

    const persistedAssignmentsAfterWrite = listAssignments(fixture.sqliteFile);
    assert.equal(
      persistedAssignmentsAfterWrite.filter((assignment) => assignment.userId === employeeOne.id && !assignment.removedAt).length <= 1,
      true,
    );

    const addSecondCrewState = await assertOk(fixture.baseUrl, "/api/jobs/J-2201/assignments", {
      method: "POST",
      headers,
      body: JSON.stringify({
        userId: employeeTwo.id,
        roleOnJob: "crew",
      }),
    });
    const crewJob = addSecondCrewState.jobs.find((job) => job.id === "J-2201");
    assert.equal(crewJob.crewAssignments.filter((assignment) => assignment.userId === employeeOne.id).length, 1);
    const addedSecondAssignment = crewJob.crewAssignments.find((assignment) => assignment.userId === employeeTwo.id);
    assert.ok(addedSecondAssignment);

    await assertOk(fixture.baseUrl, "/api/jobs/J-2201/assignments", {
      method: "POST",
      headers,
      body: JSON.stringify({
        userId: foremanUser.id,
        roleOnJob: "foreman",
      }),
    });

    const foremanLoginForView = await login(fixture.baseUrl, {
      email: foremanUser.email,
      password: "concrete123",
    });
    const foremanJobsView = await assertOk(fixture.baseUrl, "/api/jobs", {
      headers: authHeaders(foremanLoginForView.token),
    });
    const foremanVisibleJob = foremanJobsView.jobs.find((job) => job.id === "J-2201");
    assert.equal(foremanVisibleJob.crewAssignments.filter((assignment) => assignment.userId === employeeOne.id).length, 1);

    const employeeLoginForView = await login(fixture.baseUrl, {
      email: employeeOne.email,
      password: "concrete123",
    });
    const employeeJobsView = await assertOk(fixture.baseUrl, "/api/jobs", {
      headers: authHeaders(employeeLoginForView.token),
    });
    assert.equal(employeeJobsView.jobs[0].crewAssignments.filter((assignment) => assignment.userId === employeeOne.id).length, 1);

    const removedLegacyState = await assertOk(fixture.baseUrl, "/api/jobs/J-2201/assignments/JA-LEGACY-J-2201-crew", {
      method: "DELETE",
      headers,
    });
    const removedLegacyJob = removedLegacyState.jobs.find((job) => job.id === "J-2201");
    assert.equal(removedLegacyJob.crewAssignments.some((assignment) => assignment.userId === employeeOne.id), false);

    const replacementCrewState = await assertOk(fixture.baseUrl, "/api/jobs/J-2201/assignments", {
      method: "POST",
      headers,
      body: JSON.stringify({
        userId: employeeOne.id,
        roleOnJob: "crew",
      }),
    });
    const replacementCrewJob = replacementCrewState.jobs.find((job) => job.id === "J-2201");
    const replacementAssignment = replacementCrewJob.crewAssignments.find((assignment) => assignment.userId === employeeOne.id);
    assert.ok(replacementAssignment);
    assert.equal(replacementCrewJob.crewAssignments.filter((assignment) => assignment.userId === employeeOne.id).length, 1);
    assert.equal(replacementAssignment.id.startsWith("JA-"), true);
    assert.notEqual(replacementAssignment.id, "JA-LEGACY-J-2201-crew");

    const duplicateCrewAttempt = await requestJson(fixture.baseUrl, "/api/jobs/J-2201/assignments", {
      method: "POST",
      headers,
      body: JSON.stringify({
        userId: employeeOne.id,
        roleOnJob: "crew",
      }),
    });
    assert.equal(duplicateCrewAttempt.response.status, 409);

    const foremanLogin = await login(fixture.baseUrl, {
      email: foremanUser.email,
      password: "concrete123",
    });
    const foremanDeniedAssignment = await requestJson(fixture.baseUrl, "/api/jobs/J-2201/assignments", {
      method: "POST",
      headers: authHeaders(foremanLogin.token),
      body: JSON.stringify({
        userId: employeeTwo.id,
        roleOnJob: "crew",
      }),
    });
    assert.equal(foremanDeniedAssignment.response.status, 403);
  } finally {
    await fixture.stop();
  }
});
