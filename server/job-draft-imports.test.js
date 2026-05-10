import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

import { createUserRecord } from "./store.js";
import { CITY_STATE_WARNING } from "../shared/jobDraftImports.js";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createPort() {
  return 10200 + Math.floor(Math.random() * 1000);
}

async function waitForServer(baseUrl, serverOutput) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/ready`);
      if (response.ok) return;
    } catch {}
    await sleep(250);
  }

  throw new Error(`Imported job draft test server did not become ready.\n${serverOutput()}`);
}

async function startServer() {
  const tempDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "concrete-ops-job-drafts-"));
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

  return { baseUrl, sqliteFile, stop };
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

const validPackage = {
  packageVersion: "1.0",
  exportedAt: "2026-05-10T12:00:00.000Z",
  sourceApp: "Last Yard Concrete Proposal / GC Packet Generator",
  packageType: "concrete_ops_job_draft",
  opsJobDraftId: "ops-draft-server-1",
  sourceHandoffId: "handoff-server-1",
  sourceLeadId: "lead-server-1",
  sourceProposalId: "proposal-server-1",
  customerName: "Benton Commons",
  contactName: "Casey PM",
  contactEmail: "casey@example.test",
  contactPhone: "503-555-0101",
  jobName: "Corvallis Entry Ramp",
  jobAddress: "88 Main St, Corvallis, OR 97330",
  city: "Corvallis",
  state: "OR",
  serviceType: "ADA ramp",
  projectType: "Commercial entry",
  scopeSummary: "Form and pour ADA entry ramp.",
  includedScope: ["Demo entry landing", "Pour broom-finish ramp"],
  exclusions: ["Permits by GC"],
  assumptions: ["Access provided"],
  operationsNotes: "Coordinate with tenant access.",
  crewNotes: "Bring hand tools and compactors.",
  scheduleNotes: "Target early week.",
  startDateTarget: "2026-05-20",
  assignedCrewPlaceholder: "Ramp crew",
  foremanPlaceholder: "TBD",
  draftStatus: "Ready",
  opsReadinessScore: 90,
  opsReadinessLabel: "Ready",
  opsReadinessIssues: [],
  proposalAmount: 12500,
  proposalLinkOrId: "proposal-server-1",
  handoffStatus: "Ready for Ops Review",
  jobDraftSummary: "Concrete Ops Job Draft: Corvallis Entry Ramp",
};

test("Imported Job Drafts import, edit, and create jobs without exposing field roles", async () => {
  const fixture = await startServer();

  try {
    const employeeUser = createUserRecord({
      id: "U-JOB-DRAFT-EMPLOYEE",
      email: "job-draft-employee@lastyard.test",
      password: "concrete123",
      name: "Field Employee",
      role: "Employee",
    });
    insertUsers(fixture.sqliteFile, [employeeUser]);

    const ownerLogin = await login(fixture.baseUrl, {
      email: "ops@lastyard.test",
      password: "concrete123",
    });
    const headers = authHeaders(ownerLogin.token);

    const importedState = await assertOk(fixture.baseUrl, "/api/job-draft-imports", {
      method: "POST",
      headers,
      body: JSON.stringify({ package: validPackage }),
    });
    const importedDraft = importedState.importedDraft;

    assert.equal(importedDraft.importStatus, "Ready to Create Job");
    assert.equal(importedDraft.customerName, "Benton Commons");
    assert.ok(!importedState.jobs.some((job) => job.title === "Corvallis Entry Ramp"), "Import must not auto-create a real job.");

    const duplicate = await requestJson(fixture.baseUrl, "/api/job-draft-imports", {
      method: "POST",
      headers,
      body: JSON.stringify({ package: validPackage }),
    });
    assert.equal(duplicate.response.status, 409);
    assert.equal(duplicate.payload.duplicateReason, "opsJobDraftId");

    const editedState = await assertOk(fixture.baseUrl, `/api/job-draft-imports/${importedDraft.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ city: "Albany", importStatus: "Ready to Create Job" }),
    });
    assert.equal(editedState.importedDraft.city, "Albany");

    const createdState = await assertOk(fixture.baseUrl, `/api/job-draft-imports/${importedDraft.id}/create-job`, {
      method: "POST",
      headers,
      body: JSON.stringify({}),
    });
    assert.equal(createdState.createdJob.title, "Corvallis Entry Ramp");
    assert.equal(createdState.createdJob.customer, "Benton Commons");
    assert.equal(createdState.importedDraft.createdJobId, createdState.createdJob.id);
    assert.equal(createdState.importedDraft.importStatus, "Job Created");
    assert.match(createdState.createdJob.notes, /Source Proposal ID: proposal-server-1/);

    const employeeLogin = await login(fixture.baseUrl, {
      email: "job-draft-employee@lastyard.test",
      password: "concrete123",
    });
    const employeeBootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", {
      headers: authHeaders(employeeLogin.token),
    });
    assert.deepEqual(employeeBootstrap.jobDraftImports, []);
    assert.equal(employeeBootstrap.permissions.jobDraftImports.canView, false);

    const employeeImportApi = await requestJson(fixture.baseUrl, "/api/job-draft-imports", {
      headers: authHeaders(employeeLogin.token),
    });
    assert.equal(employeeImportApi.response.status, 403);
  } finally {
    await fixture.stop();
  }
});

test("missing city/state with address imports as Needs Review and requires confirmation before job creation", async () => {
  const fixture = await startServer();

  try {
    const ownerLogin = await login(fixture.baseUrl, {
      email: "ops@lastyard.test",
      password: "concrete123",
    });
    const headers = authHeaders(ownerLogin.token);

    const importedState = await assertOk(fixture.baseUrl, "/api/job-draft-imports", {
      method: "POST",
      headers,
      body: JSON.stringify({
        package: {
          ...validPackage,
          opsJobDraftId: "ops-draft-server-2",
          sourceHandoffId: "handoff-server-2",
          jobName: "Rural Shop Slab",
          jobAddress: "2290 County Shop Road",
          city: "",
          state: "",
        },
      }),
    });
    const importedDraft = importedState.importedDraft;
    assert.equal(importedDraft.importStatus, "Needs Review");
    assert.ok(importedDraft.importWarnings.includes(CITY_STATE_WARNING));

    const blockedCreate = await requestJson(fixture.baseUrl, `/api/job-draft-imports/${importedDraft.id}/create-job`, {
      method: "POST",
      headers,
      body: JSON.stringify({}),
    });
    assert.equal(blockedCreate.response.status, 409);
    assert.equal(blockedCreate.payload.error, CITY_STATE_WARNING);

    const createdState = await assertOk(fixture.baseUrl, `/api/job-draft-imports/${importedDraft.id}/create-job`, {
      method: "POST",
      headers,
      body: JSON.stringify({ allowMissingCityState: true, allowNotReady: true }),
    });
    assert.equal(createdState.createdJob.title, "Rural Shop Slab");
    assert.equal(createdState.importedDraft.createdJobId, createdState.createdJob.id);
  } finally {
    await fixture.stop();
  }
});
