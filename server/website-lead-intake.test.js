import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

import { DEFAULT_COMPANY_ID } from "../shared/companyScope.js";
import { CONTRACTOR_OPS_WEBSITE_LEAD_PACKAGE_TYPE } from "../shared/websiteLeadIntake.js";
import { createUserRecord } from "./store.js";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createPort() {
  return 12200 + Math.floor(Math.random() * 1000);
}

async function waitForServer(baseUrl, serverOutput) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/ready`);
      if (response.ok) return;
    } catch {}
    await sleep(250);
  }

  throw new Error(`Website lead intake test server did not become ready.\n${serverOutput()}`);
}

async function startServer(extraEnv = {}) {
  const tempDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "concrete-ops-website-leads-"));
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

function insertUser(sqliteFile, user) {
  const database = new DatabaseSync(sqliteFile);
  try {
    database.prepare(`
      INSERT INTO users (id, email, name, role, phone, status, company_id, operator_access, created_at, updated_at, last_login_at, password_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
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
  } finally {
    database.close();
  }
}

function tableCount(sqliteFile, tableName) {
  const allowedTables = new Set(["customers", "leads", "estimates", "jobs", "users"]);
  assert.equal(allowedTables.has(tableName), true, `Unexpected table lookup: ${tableName}`);
  const database = new DatabaseSync(sqliteFile);
  try {
    return database.prepare(`SELECT COUNT(*) AS count FROM ${tableName}`).get().count;
  } finally {
    database.close();
  }
}

function leadRecord(sqliteFile, id) {
  const database = new DatabaseSync(sqliteFile);
  try {
    return database.prepare(`
      SELECT id, company_id AS companyId, customer, city, project, source, notes
      FROM leads
      WHERE id = ?
    `).get(id);
  } finally {
    database.close();
  }
}

function leadsWithSubmissionId(sqliteFile, sourceSubmissionId) {
  const database = new DatabaseSync(sqliteFile);
  try {
    return database.prepare(`
      SELECT id, company_id AS companyId, customer, notes
      FROM leads
      WHERE notes LIKE ?
      ORDER BY id
    `).all(`%Source submission ID: ${sourceSubmissionId}%`);
  } finally {
    database.close();
  }
}

const validWebsitePackage = {
  packageType: CONTRACTOR_OPS_WEBSITE_LEAD_PACKAGE_TYPE,
  sourceApp: "Website Form",
  sourceSubmissionId: "website-server-1",
  targetCompanyId: DEFAULT_COMPANY_ID,
  website: {
    siteName: "Live Your Future Website",
    pageUrl: "https://example.test/fencing?token=do-not-save&utm_source=google&code=drop",
    formName: "Request Estimate",
    campaign: "Google Ads - Fencing",
    medium: "website",
    source: "Website",
  },
  lead: {
    serviceType: "Fencing",
    projectType: "Fence repair",
    customerName: "Pat Customer",
    contactName: "Pat Customer",
    contactEmail: "pat@example.test",
    contactPhone: "541-555-0199",
    city: "Albany",
    state: "OR",
    zip: "97321",
    description: "Repair a leaning fence section.",
    timeline: "ASAP",
    budgetRange: "$2k-$5k",
    preferredContactMethod: "Call",
    consentToContact: true,
  },
  meta: {
    referrer: "https://referrer.example.test/path?session=drop&utm_campaign=spring",
    utmSource: "google",
    utmMedium: "cpc",
    utmCampaign: "spring fence",
  },
  honeypot: "",
};

test("website lead intake rejects missing and invalid tokens", async () => {
  const fixture = await startServer({ CONCRETE_OPS_IMPORT_TOKEN: "website-token" });

  try {
    const missingToken = await requestJson(fixture.baseUrl, "/api/integrations/website-leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validWebsitePackage),
    });
    assert.equal(missingToken.response.status, 401);
    assert.match(missingToken.payload.error, /invalid integration token/i);

    const invalidToken = await requestJson(fixture.baseUrl, "/api/integrations/website-leads", {
      method: "POST",
      headers: integrationHeaders("wrong-token"),
      body: JSON.stringify(validWebsitePackage),
    });
    assert.equal(invalidToken.response.status, 401);
    assert.match(invalidToken.payload.error, /invalid integration token/i);
  } finally {
    await fixture.stop();
  }
});

test("website lead intake rejects unsupported packages and missing or invalid companies", async () => {
  const token = "website-token";
  const fixture = await startServer({ CONCRETE_OPS_IMPORT_TOKEN: token });

  try {
    const invalidPackage = await requestJson(fixture.baseUrl, "/api/integrations/website-leads", {
      method: "POST",
      headers: integrationHeaders(token),
      body: JSON.stringify({
        ...validWebsitePackage,
        packageType: "wrong_package",
      }),
    });
    assert.equal(invalidPackage.response.status, 400);
    assert.match(invalidPackage.payload.error, /unsupported packageType/i);

    const missingCompany = await requestJson(fixture.baseUrl, "/api/integrations/website-leads", {
      method: "POST",
      headers: integrationHeaders(token),
      body: JSON.stringify({
        ...validWebsitePackage,
        targetCompanyId: "",
      }),
    });
    assert.equal(missingCompany.response.status, 400);
    assert.match(missingCompany.payload.error, /targetCompanyId/i);

    const invalidCompany = await requestJson(fixture.baseUrl, "/api/integrations/website-leads", {
      method: "POST",
      headers: integrationHeaders(token),
      body: JSON.stringify({
        ...validWebsitePackage,
        targetCompanyId: "COMPANY-MISSING",
      }),
    });
    assert.equal(invalidCompany.response.status, 404);
    assert.match(invalidCompany.payload.error, /target company not found/i);
  } finally {
    await fixture.stop();
  }
});

test("website lead intake creates only a lead in the target company and strips sensitive fields", async () => {
  const token = "website-token";
  const fixture = await startServer({ CONCRETE_OPS_IMPORT_TOKEN: token });

  try {
    const beforeCounts = {
      customers: tableCount(fixture.sqliteFile, "customers"),
      estimates: tableCount(fixture.sqliteFile, "estimates"),
      jobs: tableCount(fixture.sqliteFile, "jobs"),
      users: tableCount(fixture.sqliteFile, "users"),
    };
    const ownerLogin = await login(fixture.baseUrl, {
      email: "ops@lastyard.test",
      password: "concrete123",
    });

    const imported = await requestJson(fixture.baseUrl, "/api/integrations/website-leads", {
      method: "POST",
      headers: integrationHeaders(token),
      body: JSON.stringify({
        ...validWebsitePackage,
        apiKey: "do-not-save",
        lead: {
          ...validWebsitePackage.lead,
          accessToken: "do-not-save-nested",
          description: "Repair a leaning fence section. apiKey=do-not-save-in-text",
        },
      }),
    });

    assert.equal(imported.response.status, 201);
    assert.equal(imported.payload.ok, true);
    assert.equal(imported.payload.duplicate, false);
    assert.equal(imported.payload.possibleDuplicate, false);
    assert.equal(imported.payload.reviewRequired, true);
    assert.equal(imported.payload.openPath, `/leads/${imported.payload.leadId}`);

    const lead = leadRecord(fixture.sqliteFile, imported.payload.leadId);
    assert.equal(lead.companyId, DEFAULT_COMPANY_ID);
    assert.equal(lead.customer, "Pat Customer");
    assert.equal(lead.project, "Fencing - Fence repair");
    assert.equal(lead.source, "Website");
    assert.match(lead.notes, /Website lead/);
    assert.match(lead.notes, /Source submission ID: website-server-1/);
    assert.match(lead.notes, /Page URL: https:\/\/example.test\/fencing\?utm_source=google/);
    assert.match(lead.notes, /UTM campaign: spring fence/);
    assert.doesNotMatch(lead.notes, /do-not-save|token=|code=|session=|apiKey=do-not-save/i);

    const bootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", {
      headers: authHeaders(ownerLogin.token),
    });
    assert.ok(bootstrap.leads.some((item) => item.id === imported.payload.leadId));
    assert.equal(tableCount(fixture.sqliteFile, "customers"), beforeCounts.customers, "Website intake must not create customers.");
    assert.equal(tableCount(fixture.sqliteFile, "estimates"), beforeCounts.estimates, "Website intake must not create estimates.");
    assert.equal(tableCount(fixture.sqliteFile, "jobs"), beforeCounts.jobs, "Website intake must not create jobs.");
    assert.equal(tableCount(fixture.sqliteFile, "users"), beforeCounts.users, "Website intake must not create users.");
  } finally {
    await fixture.stop();
  }
});

test("website lead intake sourceSubmissionId duplicates do not create a second same-company lead", async () => {
  const token = "website-token";
  const fixture = await startServer({ CONCRETE_OPS_IMPORT_TOKEN: token });

  try {
    const firstImport = await requestJson(fixture.baseUrl, "/api/integrations/website-leads", {
      method: "POST",
      headers: integrationHeaders(token),
      body: JSON.stringify(validWebsitePackage),
    });
    assert.equal(firstImport.response.status, 201);

    const duplicateImport = await requestJson(fixture.baseUrl, "/api/integrations/website-leads", {
      method: "POST",
      headers: integrationHeaders(token),
      body: JSON.stringify(validWebsitePackage),
    });
    assert.equal(duplicateImport.response.status, 200);
    assert.equal(duplicateImport.payload.ok, true);
    assert.equal(duplicateImport.payload.duplicate, true);
    assert.equal(duplicateImport.payload.leadId, firstImport.payload.leadId);
    assert.equal(duplicateImport.payload.openPath, `/leads/${firstImport.payload.leadId}`);
    assert.equal(leadsWithSubmissionId(fixture.sqliteFile, "website-server-1").length, 1);
  } finally {
    await fixture.stop();
  }
});

test("website lead intake duplicate checks are scoped to the target company", async () => {
  const token = "website-token";
  const fixture = await startServer({ CONCRETE_OPS_IMPORT_TOKEN: token });

  try {
    insertOtherCompany(fixture.sqliteFile);

    const defaultCompanyLead = await requestJson(fixture.baseUrl, "/api/integrations/website-leads", {
      method: "POST",
      headers: integrationHeaders(token),
      body: JSON.stringify({
        ...validWebsitePackage,
        sourceSubmissionId: "shared-submission",
      }),
    });
    assert.equal(defaultCompanyLead.response.status, 201);

    const otherCompanyLead = await requestJson(fixture.baseUrl, "/api/integrations/website-leads", {
      method: "POST",
      headers: integrationHeaders(token),
      body: JSON.stringify({
        ...validWebsitePackage,
        sourceSubmissionId: "shared-submission",
        targetCompanyId: "COMPANY-LYF",
      }),
    });
    assert.equal(otherCompanyLead.response.status, 201);
    assert.equal(otherCompanyLead.payload.duplicate, false);

    const matchingLeads = leadsWithSubmissionId(fixture.sqliteFile, "shared-submission");
    assert.equal(matchingLeads.length, 2);
    assert.deepEqual(new Set(matchingLeads.map((lead) => lead.companyId)), new Set([DEFAULT_COMPANY_ID, "COMPANY-LYF"]));

    const ownerLogin = await login(fixture.baseUrl, {
      email: "ops@lastyard.test",
      password: "concrete123",
    });
    const ownerBootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", {
      headers: authHeaders(ownerLogin.token),
    });
    assert.ok(ownerBootstrap.leads.some((lead) => lead.id === defaultCompanyLead.payload.leadId));
    assert.equal(ownerBootstrap.leads.some((lead) => lead.id === otherCompanyLead.payload.leadId), false);
  } finally {
    await fixture.stop();
  }
});

test("website lead intake honeypot submissions are ignored without creating a lead", async () => {
  const token = "website-token";
  const fixture = await startServer({ CONCRETE_OPS_IMPORT_TOKEN: token });

  try {
    const beforeLeadCount = tableCount(fixture.sqliteFile, "leads");
    const ignored = await requestJson(fixture.baseUrl, "/api/integrations/website-leads", {
      method: "POST",
      headers: integrationHeaders(token),
      body: JSON.stringify({
        ...validWebsitePackage,
        sourceSubmissionId: "honeypot-submission",
        honeypot: "bot value",
      }),
    });

    assert.equal(ignored.response.status, 200);
    assert.equal(ignored.payload.ok, true);
    assert.equal(ignored.payload.ignored, true);
    assert.equal(tableCount(fixture.sqliteFile, "leads"), beforeLeadCount);
  } finally {
    await fixture.stop();
  }
});

test("website leads stay hidden from field roles and outside-company users", async () => {
  const token = "website-token";
  const fixture = await startServer({ CONCRETE_OPS_IMPORT_TOKEN: token });

  try {
    insertOtherCompany(fixture.sqliteFile);
    const imported = await requestJson(fixture.baseUrl, "/api/integrations/website-leads", {
      method: "POST",
      headers: integrationHeaders(token),
      body: JSON.stringify({
        ...validWebsitePackage,
        sourceSubmissionId: "field-hidden-submission",
        targetCompanyId: "COMPANY-LYF",
      }),
    });
    assert.equal(imported.response.status, 201);

    insertUser(fixture.sqliteFile, createUserRecord({
      id: "U-WEB-INTAKE-EMPLOYEE",
      email: "website-intake-employee@lastyard.test",
      password: "concrete123",
      name: "Website Intake Employee",
      role: "Employee",
    }));
    const employeeLogin = await login(fixture.baseUrl, {
      email: "website-intake-employee@lastyard.test",
      password: "concrete123",
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
