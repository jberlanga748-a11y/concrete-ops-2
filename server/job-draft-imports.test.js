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
import { DEFAULT_COMPANY_ID } from "../shared/companyScope.js";
import { PACKAGE_IDS } from "../shared/packages.js";

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

async function startServer(extraEnv = {}) {
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
      ...extraEnv,
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

function integrationHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function insertUsers(sqliteFile, users) {
  const database = new DatabaseSync(sqliteFile);
  try {
    const insertUser = database.prepare(`
      INSERT INTO users (id, email, name, role, phone, status, company_id, operator_access, created_at, updated_at, last_login_at, password_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const user of users) {
      insertUser.run(
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
    }
  } finally {
    database.close();
  }
}

function insertOtherCompany(sqliteFile) {
  const database = new DatabaseSync(sqliteFile);
  const now = new Date().toISOString();
  try {
    database.prepare(`
      INSERT OR IGNORE INTO companies (id, workspace_id, name, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run("COMPANY-LYF", "COMPANY-LYF", "Live Your Future Construction", "active", now, now);
  } finally {
    database.close();
  }
}

function setCompanyPackage(sqliteFile, packageId, companyId = DEFAULT_COMPANY_ID) {
  const database = new DatabaseSync(sqliteFile);
  try {
    database.prepare(`
      INSERT OR REPLACE INTO company_settings (company_id, key, value, updated_at)
      VALUES (?, ?, ?, ?)
    `).run(companyId, "packageId", packageId, new Date().toISOString());
  } finally {
    database.close();
  }
}

const validPackage = {
  packageVersion: "1.0",
  exportedAt: "2026-05-10T12:00:00.000Z",
  sourceApp: "Last Yard Concrete Proposal / GC Packet Generator",
  packageType: "concrete_ops_job_draft",
  targetCompanyId: DEFAULT_COMPANY_ID,
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
  jobDraftSummary: "Apex HQ Job Draft: Corvallis Entry Ramp",
};

test("integration job draft import rejects missing and invalid tokens", async () => {
  const fixture = await startServer({ CONCRETE_OPS_IMPORT_TOKEN: "integration-test-token" });

  try {
    const missingToken = await requestJson(fixture.baseUrl, "/api/integrations/job-draft-imports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validPackage),
    });
    assert.equal(missingToken.response.status, 401);
    assert.match(missingToken.payload.error, /invalid integration token/i);

    const invalidToken = await requestJson(fixture.baseUrl, "/api/integrations/job-draft-imports", {
      method: "POST",
      headers: integrationHeaders("wrong-token"),
      body: JSON.stringify(validPackage),
    });
    assert.equal(invalidToken.response.status, 401);
    assert.match(invalidToken.payload.error, /invalid integration token/i);
  } finally {
    await fixture.stop();
  }
});

test("integration job draft import requires explicit target company in single-company mode", async () => {
  const fixture = await startServer({ CONCRETE_OPS_IMPORT_TOKEN: "integration-test-token" });

  try {
    const missingTarget = await requestJson(fixture.baseUrl, "/api/integrations/job-draft-imports", {
      method: "POST",
      headers: integrationHeaders("integration-test-token"),
      body: JSON.stringify({
        ...validPackage,
        targetCompanyId: "",
        opsJobDraftId: "ops-draft-single-company-missing-target",
        sourceHandoffId: "handoff-single-company-missing-target",
      }),
    });
    assert.equal(missingTarget.response.status, 400);
    assert.match(missingTarget.payload.error, /targetCompanyId/i);
  } finally {
    await fixture.stop();
  }
});

test("integration job draft import creates a draft only and keeps sensitive fields stripped", async () => {
  const token = "integration-test-token";
  const fixture = await startServer({ CONCRETE_OPS_IMPORT_TOKEN: token });

  try {
    setCompanyPackage(fixture.sqliteFile, PACKAGE_IDS.PREMIUM);
    const packageWithWarning = {
      ...validPackage,
      opsJobDraftId: "ops-draft-integration-1",
      sourceHandoffId: "handoff-integration-1",
      jobName: "Rural Shop Slab",
      jobAddress: "2290 County Shop Road",
      city: "",
      state: "",
      apiKey: "do-not-save",
      nested: {
        accessToken: "do-not-save-nested",
        safeNote: "safe nested value",
      },
    };

    const imported = await requestJson(fixture.baseUrl, "/api/integrations/job-draft-imports", {
      method: "POST",
      headers: integrationHeaders(token),
      body: JSON.stringify(packageWithWarning),
    });

    assert.equal(imported.response.status, 201);
    assert.equal(imported.payload.ok, true);
    assert.equal(imported.payload.duplicate, false);
    assert.equal(imported.payload.status, "Needs Review");
    assert.equal(imported.payload.openPath, `/job-draft-imports/${imported.payload.importedDraftId}`);
    assert.ok(imported.payload.warnings.includes(CITY_STATE_WARNING));

    const ownerLogin = await login(fixture.baseUrl, {
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
    });
    const bootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", {
      headers: authHeaders(ownerLogin.token),
    });
    const draft = bootstrap.jobDraftImports.find((item) => item.id === imported.payload.importedDraftId);

    assert.equal(draft.importStatus, "Needs Review");
    assert.ok(draft.importWarnings.includes(CITY_STATE_WARNING));
    assert.equal(draft.originalPackage.apiKey, undefined);
    assert.equal(draft.originalPackage.nested.accessToken, undefined);
    assert.equal(draft.originalPackage.nested.safeNote, "safe nested value");
    assert.ok(!bootstrap.jobs.some((job) => job.title === "Rural Shop Slab"), "Integration import must not auto-create a real job.");
  } finally {
    await fixture.stop();
  }
});

test("integration job draft import requires the Integrations package feature", async () => {
  const token = "integration-test-token";
  const fixture = await startServer({ CONCRETE_OPS_IMPORT_TOKEN: token });

  try {
    setCompanyPackage(fixture.sqliteFile, PACKAGE_IDS.BASIC);
    const denied = await requestJson(fixture.baseUrl, "/api/integrations/job-draft-imports", {
      method: "POST",
      headers: integrationHeaders(token),
      body: JSON.stringify({
        ...validPackage,
        opsJobDraftId: "ops-draft-basic-denied",
        sourceHandoffId: "handoff-basic-denied",
      }),
    });

    assert.equal(denied.response.status, 403);
    assert.match(denied.payload.error, /Job Draft Imports/);
    assert.match(denied.payload.error, /current Apex HQ package/);
  } finally {
    await fixture.stop();
  }
});

test("integration job draft import returns a safe duplicate response without creating a second draft", async () => {
  const token = "integration-test-token";
  const fixture = await startServer({ CONCRETE_OPS_IMPORT_TOKEN: token });

  try {
    setCompanyPackage(fixture.sqliteFile, PACKAGE_IDS.PREMIUM);
    const firstImport = await requestJson(fixture.baseUrl, "/api/integrations/job-draft-imports", {
      method: "POST",
      headers: integrationHeaders(token),
      body: JSON.stringify(validPackage),
    });
    assert.equal(firstImport.response.status, 201);

    const duplicateImport = await requestJson(fixture.baseUrl, "/api/integrations/job-draft-imports", {
      method: "POST",
      headers: integrationHeaders(token),
      body: JSON.stringify(validPackage),
    });
    assert.equal(duplicateImport.response.status, 200);
    assert.equal(duplicateImport.payload.ok, true);
    assert.equal(duplicateImport.payload.duplicate, true);
    assert.equal(duplicateImport.payload.importedDraftId, firstImport.payload.importedDraftId);
    assert.equal(duplicateImport.payload.openPath, `/job-draft-imports/${firstImport.payload.importedDraftId}`);

    const ownerLogin = await login(fixture.baseUrl, {
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
    });
    const bootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", {
      headers: authHeaders(ownerLogin.token),
    });
    assert.equal(bootstrap.jobDraftImports.filter((draft) => draft.opsJobDraftId === validPackage.opsJobDraftId).length, 1);
  } finally {
    await fixture.stop();
  }
});

test("integration job draft import requires target company in multi-company mode and writes only to that company", async () => {
  const token = "integration-test-token";
  const lyfToken = "integration-lyf-token";
  const fixture = await startServer({
    CONCRETE_OPS_IMPORT_TOKEN: token,
    APEX_HQ_COMPANY_IMPORT_TOKENS: JSON.stringify({ "COMPANY-LYF": lyfToken }),
  });

  try {
    insertOtherCompany(fixture.sqliteFile);
    setCompanyPackage(fixture.sqliteFile, PACKAGE_IDS.PREMIUM, "COMPANY-LYF");
    insertUsers(fixture.sqliteFile, [
      createUserRecord({
        id: "U-JOB-DRAFT-LYF-OWNER",
        email: "job-draft-lyf-owner@lastyard.test",
        password: "apexdemo123",
        name: "Job Draft LYF Owner",
        role: "Owner",
        companyId: "COMPANY-LYF",
      }),
    ]);

    const missingTarget = await requestJson(fixture.baseUrl, "/api/integrations/job-draft-imports", {
      method: "POST",
      headers: integrationHeaders(token),
      body: JSON.stringify({
        ...validPackage,
        targetCompanyId: "",
        opsJobDraftId: "ops-draft-missing-target",
        sourceHandoffId: "handoff-missing-target",
      }),
    });
    assert.equal(missingTarget.response.status, 400);
    assert.match(missingTarget.payload.error, /targetCompanyId/i);

    const invalidTarget = await requestJson(fixture.baseUrl, "/api/integrations/job-draft-imports", {
      method: "POST",
      headers: integrationHeaders(token),
      body: JSON.stringify({
        ...validPackage,
        targetCompanyId: "COMPANY-MISSING",
        opsJobDraftId: "ops-draft-invalid-target",
        sourceHandoffId: "handoff-invalid-target",
      }),
    });
    assert.equal(invalidTarget.response.status, 404);
    assert.match(invalidTarget.payload.error, /target company not found/i);

    const genericCompanyId = await requestJson(fixture.baseUrl, "/api/integrations/job-draft-imports", {
      method: "POST",
      headers: integrationHeaders(token),
      body: JSON.stringify({
        ...validPackage,
        targetCompanyId: "",
        companyId: "COMPANY-LYF",
        opsJobDraftId: "ops-draft-generic-company-id",
        sourceHandoffId: "handoff-generic-company-id",
      }),
    });
    assert.equal(genericCompanyId.response.status, 400);
    assert.match(genericCompanyId.payload.error, /targetCompanyId/i);

    const contextCompanyId = await requestJson(fixture.baseUrl, "/api/integrations/job-draft-imports", {
      method: "POST",
      headers: integrationHeaders(token),
      body: JSON.stringify({
        ...validPackage,
        targetCompanyId: "",
        context: { companyId: "COMPANY-LYF" },
        opsJobDraftId: "ops-draft-context-company-id",
        sourceHandoffId: "handoff-context-company-id",
      }),
    });
    assert.equal(contextCompanyId.response.status, 400);
    assert.match(contextCompanyId.payload.error, /targetCompanyId/i);

    const wrongCompanyToken = await requestJson(fixture.baseUrl, "/api/integrations/job-draft-imports", {
      method: "POST",
      headers: integrationHeaders(token),
      body: JSON.stringify({
        ...validPackage,
        targetCompanyId: "COMPANY-LYF",
        opsJobDraftId: "ops-draft-wrong-company-token",
        sourceHandoffId: "handoff-wrong-company-token",
      }),
    });
    assert.equal(wrongCompanyToken.response.status, 401);
    assert.match(wrongCompanyToken.payload.error, /invalid integration token/i);

    const imported = await requestJson(fixture.baseUrl, "/api/integrations/job-draft-imports", {
      method: "POST",
      headers: integrationHeaders(lyfToken),
      body: JSON.stringify({
        ...validPackage,
        targetCompanyId: "COMPANY-LYF",
        opsJobDraftId: "ops-draft-lyf-target",
        sourceHandoffId: "handoff-lyf-target",
        jobName: "LYF Target Draft",
      }),
    });
    assert.equal(imported.response.status, 201);

    const lyfLogin = await login(fixture.baseUrl, {
      email: "job-draft-lyf-owner@lastyard.test",
      password: "apexdemo123",
    });
    const lyfBootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", {
      headers: authHeaders(lyfLogin.token),
    });
    const draft = lyfBootstrap.jobDraftImports.find((item) => item.id === imported.payload.importedDraftId);
    assert.ok(draft);
    assert.equal(draft.companyId, "COMPANY-LYF");
    assert.equal(draft.jobName, "LYF Target Draft");

    const defaultLogin = await login(fixture.baseUrl, {
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
    });
    const defaultBootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", {
      headers: authHeaders(defaultLogin.token),
    });
    assert.equal(defaultBootstrap.jobDraftImports.some((item) => item.id === imported.payload.importedDraftId), false);
  } finally {
    await fixture.stop();
  }
});

test("integration job draft import rejects invalid packageType", async () => {
  const token = "integration-test-token";
  const fixture = await startServer({ CONCRETE_OPS_IMPORT_TOKEN: token });

  try {
    const invalidPackage = await requestJson(fixture.baseUrl, "/api/integrations/job-draft-imports", {
      method: "POST",
      headers: integrationHeaders(token),
      body: JSON.stringify({
        ...validPackage,
        packageType: "wrong_package",
      }),
    });

    assert.equal(invalidPackage.response.status, 400);
    assert.match(invalidPackage.payload.error, /unsupported packageType/i);
  } finally {
    await fixture.stop();
  }
});

test("Imported Job Drafts import, edit, and create jobs without exposing field roles", async () => {
  const fixture = await startServer();

  try {
    setCompanyPackage(fixture.sqliteFile, PACKAGE_IDS.PREMIUM);
    const employeeUser = createUserRecord({
      id: "U-JOB-DRAFT-EMPLOYEE",
      email: "job-draft-employee@lastyard.test",
      password: "apexdemo123",
      name: "Field Employee",
      role: "Employee",
    });
    insertUsers(fixture.sqliteFile, [employeeUser]);

    const ownerLogin = await login(fixture.baseUrl, {
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
    });
    const headers = authHeaders(ownerLogin.token);

    const importedState = await assertOk(fixture.baseUrl, "/api/job-draft-imports", {
      method: "POST",
      headers,
      body: JSON.stringify({ package: validPackage }),
    });
    const importedDraft = importedState.importedDraft;

    assert.equal(importedDraft.importStatus, "Ready to Create Job");
    assert.equal(importedDraft.customerMatchStatus, "New Customer Needed");
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
      body: JSON.stringify({ crewNotes: "Updated crew notes for startup.", importStatus: "Ready to Create Job" }),
    });
    assert.equal(editedState.importedDraft.crewNotes, "Updated crew notes for startup.");

    const createdState = await assertOk(fixture.baseUrl, `/api/job-draft-imports/${importedDraft.id}/create-job`, {
      method: "POST",
      headers,
      body: JSON.stringify({}),
    });
    assert.equal(createdState.createdJob.title, "Corvallis Entry Ramp");
    assert.equal(createdState.createdJob.customer, "Benton Commons");
    assert.equal(createdState.createdJob.address, "88 Main St, Corvallis, OR 97330");
    assert.equal(createdState.createdJob.scopeSummary, "Form and pour ADA entry ramp.");
    assert.equal(createdState.createdJob.fieldNotes, "Updated crew notes for startup.");
    assert.equal(createdState.createdJob.estimatedDuration, "Target early week.");
    assert.equal(createdState.createdJob.materialNotes, "ADA ramp / Commercial entry");
    assert.equal(createdState.createdJob.safetyNotes, "");
    assert.equal(createdState.importedDraft.createdJobId, createdState.createdJob.id);
    assert.equal(createdState.importedDraft.importStatus, "Job Created");
    assert.equal(createdState.importedDraft.customerMatchStatus, "Confirmed");
    assert.equal(createdState.importedDraft.matchedCustomerId, createdState.createdJob.customerId);
    assert.match(createdState.createdJob.notes, /Source Proposal ID: proposal-server-1/);
    assert.match(createdState.createdJob.notes, /Source Handoff ID: handoff-server-1/);
    assert.match(createdState.createdJob.notes, /Operations Notes:\nCoordinate with tenant access/);
    assert.match(createdState.createdJob.notes, /Crew Notes:\nUpdated crew notes for startup/);
    assert.match(createdState.createdJob.notes, /Schedule Notes:\nTarget early week/);
    assert.equal(createdState.createdJob.sourceImportedDraftId, importedDraft.id);
    assert.equal(createdState.createdJob.startupStatus, "Not Started");
    assert.match(createdState.createdJob.startupNotes, /Source proposal: proposal-server-1/);
    assert.match(createdState.createdJob.startupNotes, /Operations notes: Coordinate with tenant access/);
    assert.equal(createdState.createdJob.startupChecklist.length, 18);

    const refreshedState = await assertOk(fixture.baseUrl, "/api/bootstrap", { headers });
    const persistedDraft = refreshedState.jobDraftImports.find((draft) => draft.id === importedDraft.id);
    const persistedJob = refreshedState.jobs.find((job) => job.id === createdState.createdJob.id);
    assert.equal(persistedDraft.createdJobId, createdState.createdJob.id);
    assert.equal(persistedDraft.importStatus, "Job Created");
    assert.equal(persistedJob.sourceImportedDraftId, importedDraft.id);
    assert.equal(persistedJob.startupChecklist.length, 18);

    const duplicateCreate = await requestJson(fixture.baseUrl, `/api/job-draft-imports/${importedDraft.id}/create-job`, {
      method: "POST",
      headers,
      body: JSON.stringify({}),
    });
    assert.equal(duplicateCreate.response.status, 409);
    assert.equal(duplicateCreate.payload.createdJobId, createdState.createdJob.id);

    const employeeLogin = await login(fixture.baseUrl, {
      email: "job-draft-employee@lastyard.test",
      password: "apexdemo123",
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

test("Imported Job Drafts are unavailable for Basic packages", async () => {
  const fixture = await startServer();

  try {
    setCompanyPackage(fixture.sqliteFile, PACKAGE_IDS.BASIC);
    const ownerLogin = await login(fixture.baseUrl, {
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
    });
    const headers = authHeaders(ownerLogin.token);
    const bootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", { headers });

    assert.deepEqual(bootstrap.jobDraftImports, []);
    assert.equal(bootstrap.permissions.jobDraftImports.canView, false);
    assert.equal(bootstrap.permissions.jobDraftImports.canManage, false);
    assert.equal(bootstrap.permissions.jobDraftImports.canCreateJob, false);

    const listDenied = await requestJson(fixture.baseUrl, "/api/job-draft-imports", { headers });
    assert.equal(listDenied.response.status, 403);
    assert.match(listDenied.payload.error, /Job Draft Imports/);

    const createDenied = await requestJson(fixture.baseUrl, "/api/job-draft-imports", {
      method: "POST",
      headers,
      body: JSON.stringify({ package: validPackage }),
    });
    assert.equal(createDenied.response.status, 403);
    assert.match(createDenied.payload.error, /Job Draft Imports/);
  } finally {
    await fixture.stop();
  }
});

test("imported draft customer match uses existing customer when creating a job", async () => {
  const fixture = await startServer();

  try {
    setCompanyPackage(fixture.sqliteFile, PACKAGE_IDS.PREMIUM);
    const ownerLogin = await login(fixture.baseUrl, {
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
    });
    const headers = authHeaders(ownerLogin.token);

    const customerState = await assertOk(fixture.baseUrl, "/api/customers", {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: "Benton Commons",
        company: "Benton Commons LLC",
        phone: "503-555-0101",
        email: "casey@example.test",
        city: "Corvallis",
        serviceArea: "Corvallis",
        status: "Active",
      }),
    });
    const customer = customerState.customers.find((item) => item.name === "Benton Commons");
    assert.ok(customer);

    const importedState = await assertOk(fixture.baseUrl, "/api/job-draft-imports", {
      method: "POST",
      headers,
      body: JSON.stringify({ package: validPackage }),
    });
    assert.equal(importedState.importedDraft.customerMatchStatus, "Matched");
    assert.equal(importedState.importedDraft.matchedCustomerId, customer.id);

    const createdState = await assertOk(fixture.baseUrl, `/api/job-draft-imports/${importedState.importedDraft.id}/create-job`, {
      method: "POST",
      headers,
      body: JSON.stringify({}),
    });

    assert.equal(createdState.createdJob.customerId, customer.id);
    assert.equal(createdState.createdJob.customer, "Benton Commons");
    assert.equal(createdState.importedDraft.customerMatchStatus, "Confirmed");
    assert.equal(createdState.importedDraft.matchedCustomerId, customer.id);
    assert.equal(createdState.customers.filter((item) => item.name === "Benton Commons").length, 1);
  } finally {
    await fixture.stop();
  }
});

test("review-required customer matches block job creation until office confirms", async () => {
  const fixture = await startServer();

  try {
    setCompanyPackage(fixture.sqliteFile, PACKAGE_IDS.PREMIUM);
    const ownerLogin = await login(fixture.baseUrl, {
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
    });
    const headers = authHeaders(ownerLogin.token);

    const firstCustomerState = await assertOk(fixture.baseUrl, "/api/customers", {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: "Benton Commons",
        phone: "",
        email: "",
        city: "Corvallis",
        status: "Active",
      }),
    });
    const firstCustomer = firstCustomerState.customers.find((item) => item.name === "Benton Commons");
    await assertOk(fixture.baseUrl, "/api/customers", {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: "Casey PM Holdings",
        phone: "",
        email: "casey@example.test",
        city: "Corvallis",
        status: "Active",
      }),
    });

    const importedState = await assertOk(fixture.baseUrl, "/api/job-draft-imports", {
      method: "POST",
      headers,
      body: JSON.stringify({ package: validPackage }),
    });
    assert.equal(importedState.importedDraft.customerMatchStatus, "Review Required");
    assert.ok(importedState.importedDraft.customerMatchCandidates.length >= 2);

    const blockedCreate = await requestJson(fixture.baseUrl, `/api/job-draft-imports/${importedState.importedDraft.id}/create-job`, {
      method: "POST",
      headers,
      body: JSON.stringify({}),
    });
    assert.equal(blockedCreate.response.status, 409);
    assert.equal(blockedCreate.payload.needsCustomerMatchReview, true);

    const confirmedState = await assertOk(fixture.baseUrl, `/api/job-draft-imports/${importedState.importedDraft.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        matchedCustomerId: firstCustomer.id,
        matchedCustomerName: firstCustomer.name,
        customerMatchStatus: "Confirmed",
        customerMatchOverrideReason: "Office reviewed possible matches and chose Benton Commons.",
      }),
    });
    assert.equal(confirmedState.importedDraft.customerMatchStatus, "Confirmed");

    const createdState = await assertOk(fixture.baseUrl, `/api/job-draft-imports/${importedState.importedDraft.id}/create-job`, {
      method: "POST",
      headers,
      body: JSON.stringify({}),
    });
    assert.equal(createdState.createdJob.customerId, firstCustomer.id);
    assert.equal(createdState.importedDraft.customerMatchOverrideReason, "Office reviewed possible matches and chose Benton Commons.");
  } finally {
    await fixture.stop();
  }
});

test("imported draft job creation blocks similar existing jobs unless confirmed", async () => {
  const fixture = await startServer();

  try {
    setCompanyPackage(fixture.sqliteFile, PACKAGE_IDS.PREMIUM);
    const ownerLogin = await login(fixture.baseUrl, {
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
    });
    const headers = authHeaders(ownerLogin.token);

    const firstImport = await assertOk(fixture.baseUrl, "/api/job-draft-imports", {
      method: "POST",
      headers,
      body: JSON.stringify({ package: validPackage }),
    });
    await assertOk(fixture.baseUrl, `/api/job-draft-imports/${firstImport.importedDraft.id}/create-job`, {
      method: "POST",
      headers,
      body: JSON.stringify({}),
    });

    const duplicateImport = await assertOk(fixture.baseUrl, "/api/job-draft-imports", {
      method: "POST",
      headers,
      body: JSON.stringify({
        allowDuplicate: true,
        package: {
          ...validPackage,
          opsJobDraftId: "ops-draft-server-duplicate-job",
          sourceHandoffId: "handoff-server-duplicate-job",
        },
      }),
    });

    const blockedDuplicateJob = await requestJson(fixture.baseUrl, `/api/job-draft-imports/${duplicateImport.importedDraft.id}/create-job`, {
      method: "POST",
      headers,
      body: JSON.stringify({}),
    });
    assert.equal(blockedDuplicateJob.response.status, 409);
    assert.equal(blockedDuplicateJob.payload.needsConfirmation, true);
    assert.match(blockedDuplicateJob.payload.error, /similar job already exists/i);
    assert.equal(blockedDuplicateJob.payload.duplicateJob.title, "Corvallis Entry Ramp");
  } finally {
    await fixture.stop();
  }
});

test("missing city/state with address imports as Needs Review and requires confirmation before job creation", async () => {
  const fixture = await startServer();

  try {
    setCompanyPackage(fixture.sqliteFile, PACKAGE_IDS.PREMIUM);
    const ownerLogin = await login(fixture.baseUrl, {
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
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
    assert.equal(createdState.createdJob.startupStatus, "Needs Review");
  } finally {
    await fixture.stop();
  }
});
