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
  return 7800 + Math.floor(Math.random() * 1000);
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

  throw new Error(`Calculator result test server did not become ready.\n${serverOutput()}`);
}

async function startServer() {
  const tempDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "concrete-ops-calculator-"));
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
  const payload = response.status === 204 ? null : await response.json().catch(() => null);
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

function configureJobVisibility(sqliteFile, { foremanId, employeeId }) {
  const database = new DatabaseSync(sqliteFile);
  try {
    database.prepare(`
      UPDATE jobs
      SET assigned_foreman_id = ?,
          assigned_user_id = ?,
          field_planning_visible = 0,
          visible_to_foreman = 0,
          scheduled_start = '2026-04-25T07:30:00.000Z',
          status = 'in_progress'
      WHERE id = 'J-2201'
    `).run(foremanId, employeeId);

    database.prepare(`
      UPDATE jobs
      SET assigned_foreman_id = '',
          assigned_user_id = '',
          field_planning_visible = 1,
          visible_to_foreman = 1,
          scheduled_start = '2026-05-06T08:00:00.000Z',
          status = 'scheduled'
      WHERE id = 'J-2198'
    `).run();
  } finally {
    database.close();
  }
}

function calculationPayload(jobId, overrides = {}) {
  return {
    jobId,
    calculatorType: "slab",
    inputsJson: { length: 20, width: 12, thicknessInches: 4 },
    wastePercent: 10,
    cubicFeet: 80,
    cubicYards: 2.96,
    cubicYardsWithWaste: 3.26,
    summary: "20 ft x 12 ft x 4 in slab",
    notes: "Internal pour planning note.",
    ...overrides,
  };
}

function multiSectionPayload(jobId, overrides = {}) {
  return {
    jobId,
    calculatorType: "multi_section",
    inputsJson: {
      mode: "multi_section",
      sections: [
        {
          id: "S1",
          label: "Panel 1",
          calculatorType: "slab",
          inputs: { length: 5, width: 6, thicknessInches: 4 },
          cubicFeet: 10,
          cubicYards: 0.37,
          notes: "Front walk",
          summary: "5 ft x 6 ft x 4 in slab",
        },
        {
          id: "S2",
          label: "Panel 2",
          calculatorType: "slab",
          inputs: { length: 4, width: 8, thicknessInches: 4 },
          cubicFeet: 10.6667,
          cubicYards: 0.40,
          notes: "",
          summary: "4 ft x 8 ft x 4 in slab",
        },
      ],
      totals: {
        cubicFeet: 20.6667,
        cubicYards: 0.77,
        cubicYardsWithWaste: 0.85,
      },
      wastePercent: 10,
      sectionCount: 2,
    },
    wastePercent: 10,
    cubicFeet: 20.6667,
    cubicYards: 0.77,
    cubicYardsWithWaste: 0.85,
    summary: "2 sections totaling 0.77 yd^3 base",
    notes: "Internal sidewalk takeoff.",
    ...overrides,
  };
}

test("calculator results save to allowed jobs with internal-only visibility", async () => {
  const fixture = await startServer();

  try {
    const foremanUser = createUserRecord({
      id: "U-CALC-FOREMAN",
      email: "calc-foreman@lastyard.test",
      password: "concrete123",
      name: "Calc Foreman",
      role: "Foreman",
    });
    const employeeUser = createUserRecord({
      id: "U-CALC-EMPLOYEE",
      email: "calc-employee@lastyard.test",
      password: "concrete123",
      name: "Calc Employee",
      role: "Employee",
    });

    insertUsers(fixture.sqliteFile, [foremanUser, employeeUser]);
    configureJobVisibility(fixture.sqliteFile, { foremanId: foremanUser.id, employeeId: employeeUser.id });

    const officeLogin = await login(fixture.baseUrl, {
      email: "ops@lastyard.test",
      password: "concrete123",
    });
    const officeHeaders = authHeaders(officeLogin.token);

    const foremanLogin = await login(fixture.baseUrl, {
      email: foremanUser.email,
      password: "concrete123",
    });
    const employeeLogin = await login(fixture.baseUrl, {
      email: employeeUser.email,
      password: "concrete123",
    });

    const foremanHeaders = authHeaders(foremanLogin.token);
    const employeeHeaders = authHeaders(employeeLogin.token);

    const officeState = await assertOk(fixture.baseUrl, "/api/calculator-results", {
      method: "POST",
      headers: officeHeaders,
      body: JSON.stringify(calculationPayload("J-2192", { calculatorType: "round_column", summary: "24 in diameter x 10 ft round column" })),
    });
    assert.ok(officeState.calculatorResults.some((result) => result.jobId === "J-2192"));

    const officeMultiSectionState = await assertOk(fixture.baseUrl, "/api/calculator-results", {
      method: "POST",
      headers: officeHeaders,
      body: JSON.stringify(multiSectionPayload("J-2192")),
    });
    const officeTakeoff = officeMultiSectionState.calculatorResults.find((result) => result.calculatorType === "multi_section");
    assert.ok(officeTakeoff);
    assert.equal(officeTakeoff.visibility, "internal");
    assert.equal(Array.isArray(officeTakeoff.inputsJson?.sections), true);
    assert.equal(officeTakeoff.inputsJson.sections.length, 2);
    assert.equal(officeTakeoff.inputsJson.sections[0].label, "Panel 1");

    const foremanAssignedState = await assertOk(fixture.baseUrl, "/api/calculator-results", {
      method: "POST",
      headers: foremanHeaders,
      body: JSON.stringify(calculationPayload("J-2201")),
    });
    const foremanAssignedResult = foremanAssignedState.calculatorResults.find((result) => result.jobId === "J-2201");
    assert.ok(foremanAssignedResult);
    assert.equal(foremanAssignedResult.visibility, "internal");
    assert.equal("pricing" in foremanAssignedResult, false);

    const foremanPlanningState = await assertOk(fixture.baseUrl, "/api/calculator-results", {
      method: "POST",
      headers: foremanHeaders,
      body: JSON.stringify(calculationPayload("J-2198", { summary: "30 ft x 2 ft x 1.5 ft footing" })),
    });
    assert.ok(foremanPlanningState.calculatorResults.some((result) => result.jobId === "J-2198"));

    const employeeState = await assertOk(fixture.baseUrl, "/api/calculator-results", {
      method: "POST",
      headers: employeeHeaders,
      body: JSON.stringify(calculationPayload("J-2201", { summary: "Employee assigned slab" })),
    });
    assert.ok(employeeState.calculatorResults.some((result) => result.summary === "Employee assigned slab"));

    const employeeTakeoffState = await assertOk(fixture.baseUrl, "/api/calculator-results", {
      method: "POST",
      headers: employeeHeaders,
      body: JSON.stringify(multiSectionPayload("J-2201", { summary: "Employee sidewalk takeoff" })),
    });
    assert.ok(employeeTakeoffState.calculatorResults.some((result) => result.summary === "Employee sidewalk takeoff" && result.inputsJson?.sections?.length === 2));

    const deniedEmployeeSave = await requestJson(fixture.baseUrl, "/api/calculator-results", {
      method: "POST",
      headers: employeeHeaders,
      body: JSON.stringify(calculationPayload("J-2192")),
    });
    assert.equal(deniedEmployeeSave.response.status, 403);

    const invalidSave = await requestJson(fixture.baseUrl, "/api/calculator-results", {
      method: "POST",
      headers: officeHeaders,
      body: JSON.stringify(calculationPayload("J-2201", { summary: "", cubicYards: -1 })),
    });
    assert.equal(invalidSave.response.status, 400);

    const employeeBootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", {
      headers: employeeHeaders,
    });
    assert.equal(employeeBootstrap.calculatorResults.every((result) => result.jobId === "J-2201"), true);
    const employeeJob = employeeBootstrap.jobs.find((job) => job.id === "J-2201");
    assert.ok(employeeJob);
    assert.ok(Array.isArray(employeeJob.calculatorResults));
    assert.equal(employeeJob.calculatorResults.every((result) => result.visibility === "internal"), true);
    assert.equal(employeeJob.calculatorResults.some((result) => result.summary === "Employee assigned slab"), true);
    assert.equal(employeeBootstrap.jobs.some((job) => job.id === "J-2192"), false);

    const foremanBootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", {
      headers: foremanHeaders,
    });
    assert.equal(foremanBootstrap.calculatorResults.some((result) => result.jobId === "J-2198"), true);
    assert.equal(foremanBootstrap.calculatorResults.some((result) => result.jobId === "J-2192"), false);

    const officeBootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", {
      headers: officeHeaders,
    });
    assert.ok(officeBootstrap.auditEvents.some((event) => event.entityType === "calculatorResult" && event.action === "saved"));
    const officeJob = officeBootstrap.jobs.find((job) => job.id === "J-2192");
    assert.ok(officeJob?.calculatorResults?.some((result) => result.calculatorType === "round_column"));
    assert.ok(officeJob?.calculatorResults?.some((result) => result.calculatorType === "multi_section" && result.inputsJson?.sections?.length === 2));
  } finally {
    await fixture.stop();
  }
});
