import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

import { DEFAULT_COMPANY_ID } from "../shared/companyScope.js";
import { PACKAGE_IDS } from "../shared/packages.js";
import { CONTRACTOR_OPS_WEBSITE_LEAD_PACKAGE_TYPE } from "../shared/websiteLeadIntake.js";
import { createUserRecord } from "./store.js";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createPort() {
  return 17200 + Math.floor(Math.random() * 1000);
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

  throw new Error(`Package entitlement test server did not become ready.\n${serverOutput()}`);
}

async function startServer() {
  const tempDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "apex-hq-entitlements-"));
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
      OPENAI_API_KEY: "",
      CONCRETE_OPS_IMPORT_TOKEN: "entitlement-test-token",
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

async function login(baseUrl) {
  return assertOk(baseUrl, "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
    }),
  });
}

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
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

async function loginAndBootstrap(fixture, packageId) {
  setCompanyPackage(fixture.sqliteFile, packageId);
  const loginResult = await login(fixture.baseUrl);
  const headers = authHeaders(loginResult.token);
  const bootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", { headers });
  return { headers, bootstrap };
}

function roughNotesBody() {
  return JSON.stringify({
    roughNotes: "Customer: ABC Builders\nProject: Salem slab\nScope: Pour 500 SF 4-inch broom finish slab. Exclude permits.",
  });
}

function websiteLeadPackage() {
  return {
    packageType: CONTRACTOR_OPS_WEBSITE_LEAD_PACKAGE_TYPE,
    sourceApp: "Website Form",
    sourceSubmissionId: `entitlement-website-${Date.now()}`,
    targetCompanyId: DEFAULT_COMPANY_ID,
    website: {
      siteName: "Apex HQ Demo Website",
      pageUrl: "https://example.test/request-estimate",
      formName: "Request Estimate",
      medium: "website",
      source: "Website",
    },
    lead: {
      serviceType: "Concrete",
      projectType: "Warehouse slab",
      customerName: "Website Entitlement Customer",
      contactName: "Website Entitlement Customer",
      contactEmail: "website-entitlement@example.test",
      contactPhone: "541-555-0188",
      city: "Salem",
      state: "OR",
      description: "Requesting a slab estimate from the website.",
      consentToContact: true,
    },
    honeypot: "",
  };
}

function leadCount(sqliteFile) {
  const database = new DatabaseSync(sqliteFile);
  try {
    return database.prepare("SELECT COUNT(*) AS count FROM leads").get().count;
  } finally {
    database.close();
  }
}

function leadCompanyId(sqliteFile, id) {
  const database = new DatabaseSync(sqliteFile);
  try {
    return database.prepare("SELECT company_id AS companyId FROM leads WHERE id = ?").get(id)?.companyId || "";
  } finally {
    database.close();
  }
}

test("Basic package exposes core office permissions but blocks premium and elite surfaces", async () => {
  const fixture = await startServer();

  try {
    const { headers, bootstrap } = await loginAndBootstrap(fixture, PACKAGE_IDS.BASIC);
    const lead = bootstrap.leads[0];

    assert.equal(bootstrap.companyPackage.id, PACKAGE_IDS.BASIC);
    assert.equal(bootstrap.permissions.estimates.canView, true);
    assert.equal(bootstrap.permissions.estimates.canManage, true);
    assert.equal(bootstrap.permissions.estimates.canUseAiRoughNotes, false);
    assert.equal(bootstrap.permissions.estimates.canUseGcPackets, false);
    assert.equal(bootstrap.permissions.jobDraftImports.canView, false);
    assert.equal(bootstrap.permissions.aiOffice.canView, false);
    assert.equal(bootstrap.permissions.appHealth.canView, false);
    assert.equal(bootstrap.permissions.support.canView, true);
    assert.equal(bootstrap.permissions.fieldOps.canView, false);
    assert.equal(bootstrap.permissions.reports.canViewAdvanced, false);
    assert.equal(bootstrap.permissions.opportunityScout.canView, false);
    assert.equal(bootstrap.permissions.customerPortal.canPreview, false);
    assert.deepEqual(bootstrap.jobDraftImports, []);
    assert.deepEqual(bootstrap.opportunitySearchProfiles, []);
    assert.deepEqual(bootstrap.foundOpportunities, []);

    const deniedOwnerHealth = await requestJson(fixture.baseUrl, "/api/owner-health", { headers });
    assert.equal(deniedOwnerHealth.response.status, 403);
    assert.match(deniedOwnerHealth.payload.error, /Owner Health Status/);

    const deniedDrafts = await requestJson(fixture.baseUrl, "/api/job-draft-imports", { headers });
    assert.equal(deniedDrafts.response.status, 403);
    assert.match(deniedDrafts.payload.error, /Job Draft Imports/);

    const deniedRoughNotes = await requestJson(fixture.baseUrl, "/api/ai/estimates/rough-notes", {
      method: "POST",
      headers,
      body: roughNotesBody(),
    });
    assert.equal(deniedRoughNotes.response.status, 403);
    assert.match(deniedRoughNotes.payload.error, /AI Rough Notes Helper/);

    const deniedLeadAssistant = await requestJson(fixture.baseUrl, `/api/ai/leads/${lead.id}/assist`, {
      method: "POST",
      headers,
    });
    assert.equal(deniedLeadAssistant.response.status, 403);
    assert.match(deniedLeadAssistant.payload.error, /Lead Assistant/);

    const deniedScout = await requestJson(fixture.baseUrl, "/api/opportunity-scout", { headers });
    assert.equal(deniedScout.response.status, 403);
    assert.match(deniedScout.payload.error, /Opportunity Scout/);
  } finally {
    await fixture.stop();
  }
});

test("Basic package blocks website lead intake integration writes", async () => {
  const fixture = await startServer();

  try {
    setCompanyPackage(fixture.sqliteFile, PACKAGE_IDS.BASIC);
    const beforeCount = leadCount(fixture.sqliteFile);

    const deniedWebsiteLead = await requestJson(fixture.baseUrl, "/api/integrations/website-leads", {
      method: "POST",
      headers: {
        Authorization: "Bearer entitlement-test-token",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(websiteLeadPackage()),
    });

    assert.equal(deniedWebsiteLead.response.status, 403);
    assert.match(deniedWebsiteLead.payload.error, /Website Lead Intake/);
    assert.equal(leadCount(fixture.sqliteFile), beforeCount);
  } finally {
    await fixture.stop();
  }
});

test("Premium package enables premium tools while keeping Elite Lead Finder locked", async () => {
  const fixture = await startServer();

  try {
    const { headers, bootstrap } = await loginAndBootstrap(fixture, PACKAGE_IDS.PREMIUM);
    const lead = bootstrap.leads[0];

    assert.equal(bootstrap.companyPackage.id, PACKAGE_IDS.PREMIUM);
    assert.equal(bootstrap.permissions.estimates.canUseAiRoughNotes, true);
    assert.equal(bootstrap.permissions.estimates.canUseGcPackets, true);
    assert.equal(bootstrap.permissions.jobDraftImports.canView, true);
    assert.equal(bootstrap.permissions.aiOffice.canView, true);
    assert.equal(bootstrap.permissions.aiOffice.canUseLeadAssistant, true);
    assert.equal(bootstrap.permissions.appHealth.canView, true);
    assert.equal(bootstrap.permissions.support.canView, true);
    assert.equal(bootstrap.permissions.fieldOps.canView, true);
    assert.equal(bootstrap.permissions.fieldOps.canViewCompanyWide, true);
    assert.equal(bootstrap.permissions.reports.canViewAdvanced, true);
    assert.equal(bootstrap.permissions.opportunityScout.canView, false);
    assert.equal(bootstrap.permissions.customerPortal.canPreview, false);

    const ownerHealth = await assertOk(fixture.baseUrl, "/api/owner-health", { headers });
    assert.equal(ownerHealth.ok, true);

    const drafts = await assertOk(fixture.baseUrl, "/api/job-draft-imports", { headers });
    assert.ok(Array.isArray(drafts.jobDraftImports));

    const roughNotes = await assertOk(fixture.baseUrl, "/api/ai/estimates/rough-notes", {
      method: "POST",
      headers,
      body: roughNotesBody(),
    });
    assert.equal(roughNotes.ok, true);
    assert.equal(roughNotes.configured, false);

    const leadAssistant = await assertOk(fixture.baseUrl, `/api/ai/leads/${lead.id}/assist`, {
      method: "POST",
      headers,
    });
    assert.equal(leadAssistant.ok, true);
    assert.equal(leadAssistant.configured, false);

    const deniedScout = await requestJson(fixture.baseUrl, "/api/opportunity-scout", { headers });
    assert.equal(deniedScout.response.status, 403);
    assert.match(deniedScout.payload.error, /Opportunity Scout/);
  } finally {
    await fixture.stop();
  }
});

test("Premium package allows website lead intake integration writes", async () => {
  const fixture = await startServer();

  try {
    setCompanyPackage(fixture.sqliteFile, PACKAGE_IDS.PREMIUM);
    const importedWebsiteLead = await assertOk(fixture.baseUrl, "/api/integrations/website-leads", {
      method: "POST",
      headers: {
        Authorization: "Bearer entitlement-test-token",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(websiteLeadPackage()),
    });

    assert.equal(importedWebsiteLead.ok, true);
    assert.equal(importedWebsiteLead.duplicate, false);
    assert.equal(leadCompanyId(fixture.sqliteFile, importedWebsiteLead.leadId), DEFAULT_COMPANY_ID);
  } finally {
    await fixture.stop();
  }
});

test("Elite package enables Lead Finder and inherits Premium entitlements", async () => {
  const fixture = await startServer();

  try {
    setCompanyPackage(fixture.sqliteFile, PACKAGE_IDS.ELITE);
    const ownerUser = createUserRecord({
      id: "U-ENTITLEMENT-OWNER",
      email: "entitlement-owner@apexhq.test",
      password: "apexdemo123",
      name: "Entitlement Owner",
      role: "Owner",
    });
    insertUser(fixture.sqliteFile, ownerUser);
    const loginResult = await assertOk(fixture.baseUrl, "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: ownerUser.email,
        password: "apexdemo123",
      }),
    });
    const headers = authHeaders(loginResult.token);
    const bootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", { headers });

    assert.equal(bootstrap.companyPackage.id, PACKAGE_IDS.ELITE);
    assert.equal(bootstrap.permissions.estimates.canUseAiRoughNotes, true);
    assert.equal(bootstrap.permissions.estimates.canUseGcPackets, true);
    assert.equal(bootstrap.permissions.jobDraftImports.canView, true);
    assert.equal(bootstrap.permissions.aiOffice.canView, true);
    assert.equal(bootstrap.permissions.appHealth.canView, true);
    assert.equal(bootstrap.permissions.support.canView, true);
    assert.equal(bootstrap.permissions.fieldOps.canView, true);
    assert.equal(bootstrap.permissions.fieldOps.canViewCompanyWide, true);
    assert.equal(bootstrap.permissions.reports.canViewAdvanced, true);
    assert.equal(bootstrap.permissions.opportunityScout.canView, true);
    assert.equal(bootstrap.permissions.customerPortal.canPreview, true);
    assert.ok(Array.isArray(bootstrap.opportunitySearchProfiles));
    assert.ok(Array.isArray(bootstrap.foundOpportunities));

    const scout = await assertOk(fixture.baseUrl, "/api/opportunity-scout", { headers });
    assert.ok(Array.isArray(scout.searchProfiles));
    assert.ok(Array.isArray(scout.foundOpportunities));
  } finally {
    await fixture.stop();
  }
});

test("Elite package does not grant field users office-only premium tools", async () => {
  const fixture = await startServer();

  try {
    setCompanyPackage(fixture.sqliteFile, PACKAGE_IDS.ELITE);
    const fieldUser = createUserRecord({
      id: "U-ENTITLEMENT-FIELD",
      email: "entitlement-field@apexhq.test",
      password: "apexdemo123",
      name: "Entitlement Field",
      role: "Employee",
    });
    insertUser(fixture.sqliteFile, fieldUser);

    const loginResult = await assertOk(fixture.baseUrl, "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: fieldUser.email,
        password: "apexdemo123",
      }),
    });
    const headers = authHeaders(loginResult.token);
    const bootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", { headers });

    assert.equal(bootstrap.companyPackage, null);
    assert.equal(Object.prototype.hasOwnProperty.call(bootstrap.currentCompany, "packageId"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(bootstrap.companySettings, "packageId"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(bootstrap.companySettings, "managedSetupChecklist"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(bootstrap.companySettings, "managedSetupNotes"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(bootstrap.companySettings, "managedSetupStatus"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(bootstrap.companySettings, "printPacketFooter"), false);
    assert.equal(bootstrap.companySettings.toolChecklistEnabled, true);
    assert.equal(bootstrap.permissions.estimates.canView, false);
    assert.equal(bootstrap.permissions.estimates.canUseAiRoughNotes, false);
    assert.equal(bootstrap.permissions.estimates.canUseGcPackets, false);
    assert.equal(bootstrap.permissions.jobDraftImports.canView, false);
    assert.equal(bootstrap.permissions.aiOffice.canView, false);
    assert.equal(bootstrap.permissions.appHealth.canView, false);
    assert.equal(bootstrap.permissions.support.canView, true);
    assert.equal(bootstrap.permissions.fieldOps.canView, true);
    assert.equal(bootstrap.permissions.fieldOps.canViewCompanyWide, false);
    assert.equal(bootstrap.permissions.reports.canViewAdvanced, false);
    assert.equal(bootstrap.permissions.opportunityScout.canView, false);
    assert.equal(bootstrap.permissions.customerPortal.canPreview, false);
    assert.deepEqual(bootstrap.leads, []);
    assert.deepEqual(bootstrap.estimates, []);
    assert.deepEqual(bootstrap.jobDraftImports, []);
    assert.deepEqual(bootstrap.opportunitySearchProfiles, []);
    assert.deepEqual(bootstrap.foundOpportunities, []);

    const deniedOwnerHealth = await requestJson(fixture.baseUrl, "/api/owner-health", { headers });
    assert.equal(deniedOwnerHealth.response.status, 403);

    const deniedDrafts = await requestJson(fixture.baseUrl, "/api/job-draft-imports", { headers });
    assert.equal(deniedDrafts.response.status, 403);

    const deniedRoughNotes = await requestJson(fixture.baseUrl, "/api/ai/estimates/rough-notes", {
      method: "POST",
      headers,
      body: roughNotesBody(),
    });
    assert.equal(deniedRoughNotes.response.status, 403);

    const deniedScout = await requestJson(fixture.baseUrl, "/api/opportunity-scout", { headers });
    assert.equal(deniedScout.response.status, 403);
  } finally {
    await fixture.stop();
  }
});

test("premium entitlements fail closed when user company context is missing", async () => {
  const fixture = await startServer();

  try {
    setCompanyPackage(fixture.sqliteFile, PACKAGE_IDS.PREMIUM);
    const orphanOwner = createUserRecord({
      id: "U-ENTITLEMENT-ORPHAN",
      email: "entitlement-orphan@apexhq.test",
      password: "apexdemo123",
      name: "Entitlement Orphan",
      role: "Owner",
      companyId: "COMPANY-MISSING",
    });
    insertUser(fixture.sqliteFile, orphanOwner);

    const loginResult = await assertOk(fixture.baseUrl, "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: orphanOwner.email,
        password: "apexdemo123",
      }),
    });
    const headers = authHeaders(loginResult.token);

    const deniedDrafts = await requestJson(fixture.baseUrl, "/api/job-draft-imports", { headers });
    assert.equal(deniedDrafts.response.status, 403);
    assert.match(deniedDrafts.payload.error, /Job Draft Imports/);

    const deniedHealth = await requestJson(fixture.baseUrl, "/api/owner-health", { headers });
    assert.equal(deniedHealth.response.status, 403);
    assert.match(deniedHealth.payload.error, /Owner Health Status/);
  } finally {
    await fixture.stop();
  }
});
