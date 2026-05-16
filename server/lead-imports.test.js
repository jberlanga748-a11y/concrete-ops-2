import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

import { createUserRecord } from "./store.js";
import { DEFAULT_COMPANY_ID } from "../shared/companyScope.js";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createPort() {
  return 11200 + Math.floor(Math.random() * 1000);
}

async function waitForServer(baseUrl, serverOutput) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/ready`);
      if (response.ok) return;
    } catch {}
    await sleep(250);
  }

  throw new Error(`Lead import test server did not become ready.\n${serverOutput()}`);
}

async function startServer(extraEnv = {}) {
  const tempDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "concrete-ops-lead-imports-"));
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

const validLeadPackage = {
  packageType: "concrete_ops_lead",
  sourceApp: "Last Yard Proposal / Lead Finder",
  sourceLeadId: "lead-import-server-1",
  lead: {
    title: "Albany shop slab",
    companyName: "Willamette Shop LLC",
    contactName: "Sam Builder",
    contactEmail: "sam.builder@example.test",
    contactPhone: "541-555-0133",
    city: "Albany",
    state: "OR",
    sourceName: "GC Bid Page",
    sourceUrl: "https://example.test/leads/1?token=do-not-save",
    serviceType: "Concrete",
    projectType: "Shop slab",
    description: "Imported shop slab opportunity.",
    nextFollowUpDate: "2026-05-18",
  },
};

test("integration lead import rejects missing and invalid tokens", async () => {
  const fixture = await startServer({ CONCRETE_OPS_IMPORT_TOKEN: "lead-import-token" });

  try {
    const missingToken = await requestJson(fixture.baseUrl, "/api/integrations/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validLeadPackage),
    });
    assert.equal(missingToken.response.status, 401);
    assert.match(missingToken.payload.error, /invalid integration token/i);

    const invalidToken = await requestJson(fixture.baseUrl, "/api/integrations/leads", {
      method: "POST",
      headers: integrationHeaders("wrong-token"),
      body: JSON.stringify(validLeadPackage),
    });
    assert.equal(invalidToken.response.status, 401);
    assert.match(invalidToken.payload.error, /invalid integration token/i);
  } finally {
    await fixture.stop();
  }
});

test("integration lead import creates only a lead and strips sensitive fields", async () => {
  const token = "lead-import-token";
  const fixture = await startServer({ CONCRETE_OPS_IMPORT_TOKEN: token });

  try {
    const ownerLogin = await login(fixture.baseUrl, {
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
    });
    const before = await assertOk(fixture.baseUrl, "/api/bootstrap", {
      headers: authHeaders(ownerLogin.token),
    });

    const imported = await requestJson(fixture.baseUrl, "/api/integrations/leads", {
      method: "POST",
      headers: integrationHeaders(token),
      body: JSON.stringify({
        ...validLeadPackage,
        apiKey: "do-not-save",
        lead: {
          ...validLeadPackage.lead,
          accessToken: "do-not-save-nested",
        },
      }),
    });

    assert.equal(imported.response.status, 201);
    assert.equal(imported.payload.ok, true);
    assert.equal(imported.payload.duplicate, false);
    assert.equal(imported.payload.possibleDuplicate, false);
    assert.equal(imported.payload.reviewRequired, true);
    assert.equal(imported.payload.openPath, `/leads/${imported.payload.leadId}`);

    const after = await assertOk(fixture.baseUrl, "/api/bootstrap", {
      headers: authHeaders(ownerLogin.token),
    });
    const lead = after.leads.find((item) => item.id === imported.payload.leadId);

    assert.ok(lead, "Expected imported lead to be visible to office users.");
    assert.equal(lead.customer, "Willamette Shop LLC");
    assert.equal(lead.project, "Albany shop slab");
    assert.equal(lead.source, "Lead Finder");
    assert.equal(lead.followUpDueAt, "2026-05-18");
    assert.match(lead.notes, /Source Lead ID: lead-import-server-1/);
    assert.match(lead.notes, /Original source: GC Bid Page/);
    assert.doesNotMatch(lead.notes, /do-not-save|token=/i);
    assert.equal(after.customers.length, before.customers.length, "Lead import must not create customers.");
    assert.equal(after.jobs.length, before.jobs.length, "Lead import must not create jobs.");
    assert.equal(after.estimates.length, before.estimates.length, "Lead import must not create estimates.");
  } finally {
    await fixture.stop();
  }
});

test("integration lead import returns duplicate without creating a second lead", async () => {
  const token = "lead-import-token";
  const fixture = await startServer({ CONCRETE_OPS_IMPORT_TOKEN: token });

  try {
    const firstImport = await requestJson(fixture.baseUrl, "/api/integrations/leads", {
      method: "POST",
      headers: integrationHeaders(token),
      body: JSON.stringify(validLeadPackage),
    });
    assert.equal(firstImport.response.status, 201);

    const duplicateImport = await requestJson(fixture.baseUrl, "/api/integrations/leads", {
      method: "POST",
      headers: integrationHeaders(token),
      body: JSON.stringify(validLeadPackage),
    });
    assert.equal(duplicateImport.response.status, 200);
    assert.equal(duplicateImport.payload.ok, true);
    assert.equal(duplicateImport.payload.duplicate, true);
    assert.equal(duplicateImport.payload.leadId, firstImport.payload.leadId);
    assert.equal(duplicateImport.payload.openPath, `/leads/${firstImport.payload.leadId}`);

    const ownerLogin = await login(fixture.baseUrl, {
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
    });
    const bootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", {
      headers: authHeaders(ownerLogin.token),
    });
    assert.equal(bootstrap.leads.filter((lead) => /Source Lead ID: lead-import-server-1/.test(lead.notes)).length, 1);
  } finally {
    await fixture.stop();
  }
});

test("integration lead import creates review lead for possible duplicates", async () => {
  const token = "lead-import-token";
  const fixture = await startServer({ CONCRETE_OPS_IMPORT_TOKEN: token });

  try {
    const ownerLogin = await login(fixture.baseUrl, {
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
    });
    const headers = authHeaders(ownerLogin.token);
    await assertOk(fixture.baseUrl, "/api/leads", {
      method: "POST",
      headers,
      body: JSON.stringify({
        customer: "Oak View LLC",
        city: "Salem",
        project: "Front sidewalk",
        source: "Website",
        nextStep: "Call customer",
        notes: "Existing website inquiry.",
      }),
    });

    const imported = await requestJson(fixture.baseUrl, "/api/integrations/leads", {
      method: "POST",
      headers: integrationHeaders(token),
      body: JSON.stringify({
        ...validLeadPackage,
        sourceLeadId: "lead-possible-duplicate",
        lead: {
          ...validLeadPackage.lead,
          title: "Sidewalk repair",
          companyName: "Oak View Inc.",
          contactEmail: "different@example.test",
          contactPhone: "541-555-4444",
          city: "Salem",
        },
      }),
    });

    assert.equal(imported.response.status, 201);
    assert.equal(imported.payload.possibleDuplicate, true);
    assert.equal(imported.payload.duplicate, false);
    assert.equal(imported.payload.duplicateCandidates.length, 1);

    const bootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", { headers });
    const lead = bootstrap.leads.find((item) => item.id === imported.payload.leadId);
    assert.match(lead.nextStep, /possible duplicate/i);
    assert.match(lead.notes, /Possible duplicate warning:/);
  } finally {
    await fixture.stop();
  }
});

test("integration lead import requires target company in multi-company mode and writes only to that company", async () => {
  const token = "lead-import-token";
  const fixture = await startServer({ CONCRETE_OPS_IMPORT_TOKEN: token });

  try {
    insertOtherCompany(fixture.sqliteFile);
    insertUsers(fixture.sqliteFile, [
      createUserRecord({
        id: "U-LEAD-IMPORT-LYF-OWNER",
        email: "lead-import-lyf-owner@lastyard.test",
        password: "apexdemo123",
        name: "Lead Import LYF Owner",
        role: "Owner",
        companyId: "COMPANY-LYF",
      }),
    ]);

    const missingTarget = await requestJson(fixture.baseUrl, "/api/integrations/leads", {
      method: "POST",
      headers: integrationHeaders(token),
      body: JSON.stringify({
        ...validLeadPackage,
        sourceLeadId: "lead-import-missing-target",
      }),
    });
    assert.equal(missingTarget.response.status, 400);
    assert.match(missingTarget.payload.error, /targetCompanyId/i);

    const invalidTarget = await requestJson(fixture.baseUrl, "/api/integrations/leads", {
      method: "POST",
      headers: integrationHeaders(token),
      body: JSON.stringify({
        ...validLeadPackage,
        targetCompanyId: "COMPANY-MISSING",
        sourceLeadId: "lead-import-invalid-target",
      }),
    });
    assert.equal(invalidTarget.response.status, 404);
    assert.match(invalidTarget.payload.error, /target company not found/i);

    const genericCompanyId = await requestJson(fixture.baseUrl, "/api/integrations/leads", {
      method: "POST",
      headers: integrationHeaders(token),
      body: JSON.stringify({
        ...validLeadPackage,
        companyId: "COMPANY-LYF",
        sourceLeadId: "lead-import-generic-company-id",
      }),
    });
    assert.equal(genericCompanyId.response.status, 400);
    assert.match(genericCompanyId.payload.error, /targetCompanyId/i);

    const nestedLeadCompanyId = await requestJson(fixture.baseUrl, "/api/integrations/leads", {
      method: "POST",
      headers: integrationHeaders(token),
      body: JSON.stringify({
        ...validLeadPackage,
        sourceLeadId: "lead-import-nested-company-id",
        lead: {
          ...validLeadPackage.lead,
          companyId: "COMPANY-LYF",
          targetCompanyId: "COMPANY-LYF",
        },
      }),
    });
    assert.equal(nestedLeadCompanyId.response.status, 400);
    assert.match(nestedLeadCompanyId.payload.error, /targetCompanyId/i);

    const imported = await requestJson(fixture.baseUrl, "/api/integrations/leads", {
      method: "POST",
      headers: integrationHeaders(token),
      body: JSON.stringify({
        ...validLeadPackage,
        targetCompanyId: "COMPANY-LYF",
        sourceLeadId: "lead-import-lyf-target",
        lead: {
          ...validLeadPackage.lead,
          title: "LYF targeted slab",
          companyName: "LYF Target Customer",
        },
      }),
    });
    assert.equal(imported.response.status, 201);

    const lyfLogin = await login(fixture.baseUrl, {
      email: "lead-import-lyf-owner@lastyard.test",
      password: "apexdemo123",
    });
    const lyfBootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", {
      headers: authHeaders(lyfLogin.token),
    });
    const lead = lyfBootstrap.leads.find((item) => item.id === imported.payload.leadId);
    assert.ok(lead);
    assert.equal(lead.companyId, "COMPANY-LYF");
    assert.equal(lead.customer, "LYF Target Customer");

    const defaultLogin = await login(fixture.baseUrl, {
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
    });
    const defaultBootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", {
      headers: authHeaders(defaultLogin.token),
    });
    assert.equal(defaultBootstrap.leads.some((item) => item.id === imported.payload.leadId), false);
  } finally {
    await fixture.stop();
  }
});

test("integration lead import rejects invalid packages and keeps field roles blocked", async () => {
  const token = "lead-import-token";
  const fixture = await startServer({ CONCRETE_OPS_IMPORT_TOKEN: token });

  try {
    const invalidPackage = await requestJson(fixture.baseUrl, "/api/integrations/leads", {
      method: "POST",
      headers: integrationHeaders(token),
      body: JSON.stringify({
        ...validLeadPackage,
        packageType: "wrong_package",
      }),
    });
    assert.equal(invalidPackage.response.status, 400);
    assert.match(invalidPackage.payload.error, /unsupported packageType/i);

    const imported = await requestJson(fixture.baseUrl, "/api/integrations/leads", {
      method: "POST",
      headers: integrationHeaders(token),
      body: JSON.stringify({
        ...validLeadPackage,
        sourceLeadId: "lead-field-hidden",
        lead: {
          ...validLeadPackage.lead,
          title: "Employee hidden lead",
          companyName: "Hidden Lead Co",
          contactEmail: "hidden@example.test",
        },
      }),
    });
    assert.equal(imported.response.status, 201);

    insertUsers(fixture.sqliteFile, [
      createUserRecord({
        id: "U-LEAD-IMPORT-EMPLOYEE",
        email: "lead-import-employee@lastyard.test",
        password: "apexdemo123",
        name: "Lead Import Employee",
        role: "Employee",
      }),
    ]);
    const employeeLogin = await login(fixture.baseUrl, {
      email: "lead-import-employee@lastyard.test",
      password: "apexdemo123",
    });
    const employeeBootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", {
      headers: authHeaders(employeeLogin.token),
    });

    assert.deepEqual(employeeBootstrap.leads, []);
    assert.equal(employeeBootstrap.permissions.leads.canView, false);
    assert.equal(employeeBootstrap.permissions.leads.canManage, false);
  } finally {
    await fixture.stop();
  }
});
