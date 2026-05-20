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
import { createUserRecord } from "./store.js";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createPort() {
  return 8900 + Math.floor(Math.random() * 800);
}

async function waitForServer(baseUrl, serverOutput) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/ready`);
      if (response.ok) return;
    } catch {
      // Poll until the server becomes ready.
    }
    await sleep(250);
  }

  throw new Error(`Opportunity Scout test server did not become ready.\n${serverOutput()}`);
}

async function startServer() {
  const tempDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "apex-hq-opportunity-scout-"));
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

  return { baseUrl, sqliteFile, stop, serverOutput: () => output };
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

function insertOtherCompanyOwner(sqliteFile) {
  const database = new DatabaseSync(sqliteFile);
  const now = new Date().toISOString();
  const user = createUserRecord({
    id: "U-OTHER-OWNER",
    email: "other.owner@apexhq.app",
    password: "apexdemo123",
    name: "Other Company Owner",
    role: "Owner",
    companyId: "COMPANY-OTHER",
    createdAt: now,
  });

  try {
    database.prepare(`
      INSERT INTO companies (id, workspace_id, name, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run("COMPANY-OTHER", "COMPANY-OTHER", "Other Apex HQ Workspace", "active", now, now);

    database.prepare(`
      INSERT OR REPLACE INTO company_settings (company_id, key, value, updated_at)
      VALUES (?, ?, ?, ?)
    `).run("COMPANY-OTHER", "packageId", PACKAGE_IDS.ELITE, now);

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
      user.companyId,
      0,
      user.createdAt,
      user.updatedAt || user.createdAt,
      null,
      user.passwordHash,
    );
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
      user.companyId,
      user.operatorAccess ? 1 : 0,
      user.createdAt,
      user.updatedAt || user.createdAt,
      null,
      user.passwordHash,
    );
  } finally {
    database.close();
  }
}

test("office users can manage Opportunity Scout profiles and found opportunities", async () => {
  const fixture = await startServer();
  try {
    setCompanyPackage(fixture.sqliteFile, PACKAGE_IDS.ELITE);

    const adminLogin = await login(fixture.baseUrl, {
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
    });

    const leadSourceBootstrap = await assertOk(fixture.baseUrl, "/api/lead-sources", {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify({
        name: "Public bid portals",
        type: "Public bid portal",
        serviceArea: "Albany and Corvallis",
        tradeFocus: "Concrete, fencing, decking",
        checkCadence: "Daily",
      }),
    });
    const leadSource = leadSourceBootstrap.leadSources[0];

    await assertOk(fixture.baseUrl, `/api/lead-sources/${leadSource.id}/check`, {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify({
        checkedAt: "2026-05-19",
        checkNote: "Result: Missing Docs | Next: Request or locate documents manually | Source: Public bid portals | Missing: plans | Note: Plans not posted token=secret.",
      }),
    });
    await assertOk(fixture.baseUrl, `/api/lead-sources/${leadSource.id}/check`, {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify({
        checkedAt: "2026-05-20",
        checkNote: "Result: Found Work | Next: Save found opportunity | Source: Public bid portals | Note: ADA sidewalk packet found.",
      }),
    });

    const profileBootstrap = await assertOk(fixture.baseUrl, "/api/opportunity-scout/search-profiles", {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify({
        name: "Daily public work",
        trades: ["concrete", "fencing"],
        serviceAreas: ["Albany", "Corvallis"],
        radiusMiles: 40,
        sourceTypes: ["Public bid portal"],
        keywords: ["sidewalk", "ADA"],
        cadence: "daily",
      }),
    });
    const profile = profileBootstrap.opportunitySearchProfiles[0];
    assert.equal(profile.name, "Daily public work");
    assert.equal(profile.companyId, adminLogin.user.companyId);

    const searchPlan = await assertOk(fixture.baseUrl, `/api/ai/opportunity-scout/search-profiles/${profile.id}/search-plan`, {
      method: "POST",
      headers: authHeaders(adminLogin.token),
    });
    assert.equal(searchPlan.ok, true);
    assert.equal(searchPlan.configured, false);
    assert.equal(searchPlan.localFallback, true);
    assert.match(searchPlan.searchSummary, /Daily public work/);
    assert.match(searchPlan.searchQueries.join(" "), /Albany concrete sidewalk/i);
    assert.match(searchPlan.qualificationChecklist.join(" "), /Approve For Lead/i);
    assert.match(searchPlan.nextOfficeStep, /recent Found Work/i);
    assert.match(searchPlan.riskFilters.join(" "), /Recent source outcome: Public bid portals was Missing Docs/i);
    assert.equal(JSON.stringify(searchPlan).includes("secret"), false);

    const opportunityBootstrap = await assertOk(fixture.baseUrl, "/api/opportunity-scout/found-opportunities", {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify({
        searchProfileId: profile.id,
        leadSourceId: leadSource.id,
        title: "School sidewalk repair",
        agency: "Albany School District",
        sourceName: "Public bid portals",
        city: "Albany",
        state: "OR",
        trade: "Concrete",
        projectType: "Sidewalk repair",
        status: "reviewing",
        fitScore: 84,
        bidDueAt: "2026-06-01",
        assignedEstimatorId: adminLogin.user.id,
        reasonToBid: "Local public work inside service area.",
        riskFlags: ["prevailing wage"],
      }),
    });
    const opportunity = opportunityBootstrap.foundOpportunities[0];
    assert.equal(opportunity.title, "School sidewalk repair");
    assert.equal(opportunity.status, "reviewing");
    assert.equal(opportunity.fitScore, 84);
    assert.deepEqual(opportunity.riskFlags, ["prevailing wage"]);

    const aiReview = await assertOk(fixture.baseUrl, `/api/ai/opportunity-scout/found-opportunities/${opportunity.id}/review`, {
      method: "POST",
      headers: authHeaders(adminLogin.token),
    });
    assert.equal(aiReview.ok, true);
    assert.equal(aiReview.configured, false);
    assert.match(aiReview.message, /OPENAI_API_KEY/);

    const updated = await assertOk(fixture.baseUrl, `/api/opportunity-scout/found-opportunities/${opportunity.id}`, {
      method: "PATCH",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify({ status: "watching", urgencyScore: 70 }),
    });
    assert.equal(updated.foundOpportunities[0].status, "watching");
    assert.equal(updated.foundOpportunities[0].urgencyScore, 70);

    const blockedConversion = await requestJson(fixture.baseUrl, `/api/opportunity-scout/found-opportunities/${opportunity.id}/convert-to-lead`, {
      method: "POST",
      headers: authHeaders(adminLogin.token),
    });
    assert.equal(blockedConversion.response.status, 409);
    assert.match(blockedConversion.payload.error, /approve/i);

    const approved = await assertOk(fixture.baseUrl, `/api/opportunity-scout/found-opportunities/${opportunity.id}`, {
      method: "PATCH",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify({ humanReviewStatus: "approved_for_lead", humanReviewNote: "Office approved for lead draft." }),
    });
    assert.equal(approved.foundOpportunities[0].humanReviewStatus, "approved_for_lead");
    assert.equal(approved.foundOpportunities[0].humanReviewedBy, adminLogin.user.id);

    const converted = await assertOk(fixture.baseUrl, `/api/opportunity-scout/found-opportunities/${opportunity.id}/convert-to-lead`, {
      method: "POST",
      headers: authHeaders(adminLogin.token),
    });
    const convertedOpportunity = converted.foundOpportunities.find((entry) => entry.id === opportunity.id);
    const createdLead = converted.leads.find((entry) => entry.id === converted.createdLeadId);
    assert.equal(convertedOpportunity.status, "converted_to_lead");
    assert.equal(convertedOpportunity.convertedLeadId, converted.createdLeadId);
    assert.equal(createdLead.source, "Opportunity Scout");
    assert.equal(createdLead.customer, "Albany School District");
    assert.equal(createdLead.project, "School sidewalk repair");
    assert.equal(createdLead.priority, "High");
    assert.match(createdLead.notes, /Source: Opportunity Scout/);

    const duplicateConversion = await requestJson(fixture.baseUrl, `/api/opportunity-scout/found-opportunities/${opportunity.id}/convert-to-lead`, {
      method: "POST",
      headers: authHeaders(adminLogin.token),
    });
    assert.equal(duplicateConversion.response.status, 409);

    const scoutPayload = await assertOk(fixture.baseUrl, "/api/opportunity-scout", {
      headers: authHeaders(adminLogin.token),
    });
    assert.equal(scoutPayload.searchProfiles.length, 1);
    assert.equal(scoutPayload.foundOpportunities.length, 1);
  } finally {
    await fixture.stop();
  }
});

test("Opportunity Scout manual intake redacts secrets, derives missing info, and flags duplicates", async () => {
  const fixture = await startServer();
  try {
    setCompanyPackage(fixture.sqliteFile, PACKAGE_IDS.ELITE);

    const adminLogin = await login(fixture.baseUrl, {
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
    });
    const headers = authHeaders(adminLogin.token);

    const first = await assertOk(fixture.baseUrl, "/api/opportunity-scout/found-opportunities", {
      method: "POST",
      headers,
      body: JSON.stringify({
        intakeSourceType: "pasted_text",
        intakeText: `
          Project: Library ADA concrete ramp
          Agency: City of Salem
          Location: Salem, OR
          Scope: Concrete ramp replacement and sidewalk repair
          https://example.com/rfp/44?token=secret-token
          password: portal-secret
        `,
        fileMetadata: [{ name: "library-rfp.pdf", notes: "access_token=hidden" }],
      }),
    });
    const opportunity = first.foundOpportunities[0];
    assert.equal(opportunity.title, "Library ADA concrete ramp");
    assert.equal(opportunity.intakeSourceType, "pasted_text");
    assert.equal(opportunity.sourceUrl.includes("secret-token"), false);
    assert.equal(opportunity.intakeText.includes("portal-secret"), false);
    assert.equal(opportunity.fileMetadata[0].notes.includes("hidden"), false);
    assert.equal(opportunity.missingInfoItems.includes("bid due date"), true);
    assert.equal(opportunity.humanReviewStatus, "needs_review");

    const duplicate = await assertOk(fixture.baseUrl, "/api/opportunity-scout/found-opportunities", {
      method: "POST",
      headers,
      body: JSON.stringify({
        title: "Library ADA concrete ramp",
        agency: "City of Salem",
        sourceUrl: "https://example.com/rfp/44",
      }),
    });
    assert.equal(duplicate.foundOpportunities[0].duplicateHints[0].opportunityId, opportunity.id);
  } finally {
    await fixture.stop();
  }
});

test("Opportunity Scout agent preview is review-only and does not persist found work", async () => {
  const fixture = await startServer();
  try {
    setCompanyPackage(fixture.sqliteFile, PACKAGE_IDS.ELITE);

    const adminLogin = await login(fixture.baseUrl, {
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
    });
    const headers = authHeaders(adminLogin.token);

    const before = await assertOk(fixture.baseUrl, "/api/opportunity-scout", { headers });
    assert.equal(before.foundOpportunities.length, 0);

    const preview = await assertOk(fixture.baseUrl, "/api/ai/opportunity-scout/agent-preview", {
      method: "POST",
      headers,
      body: JSON.stringify({
        intakeSourceType: "pasted_text",
        intakeText: `
          Project: Library ADA concrete ramp
          Agency: City of Salem
          Location: Salem, OR
          Bid due: June 10 2026
          Scope: Concrete ramp replacement and sidewalk repair
          https://example.com/rfp/44?token=secret-token
        `,
      }),
    });

    assert.equal(preview.ok, true);
    assert.equal(preview.extractedFields.title, "Library ADA concrete ramp");
    assert.equal(preview.extractedFields.sourceUrl.includes("secret-token"), false);
    assert.equal(preview.agentRunPacket.mode, "review_first");
    assert.equal(preview.agentRunPacket.blockedActions.some((action) => /No bid submission/i.test(action)), true);
    assert.match(preview.recommendedNextStep, /Save/);

    const after = await assertOk(fixture.baseUrl, "/api/opportunity-scout", { headers });
    assert.equal(after.foundOpportunities.length, 0);
  } finally {
    await fixture.stop();
  }
});

test("Opportunity Scout agent preview rejects unsafe payloads and field users", async () => {
  const fixture = await startServer();
  try {
    setCompanyPackage(fixture.sqliteFile, PACKAGE_IDS.ELITE);
    insertUser(fixture.sqliteFile, createUserRecord({
      id: "U-FIELD-SCOUT-PREVIEW-BLOCKED",
      email: "field.scout.preview@apexhq.app",
      password: "apexdemo123",
      name: "Field Scout Preview Blocked",
      role: "Foreman",
    }));
    const adminLogin = await login(fixture.baseUrl, {
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
    });
    const fieldLogin = await login(fixture.baseUrl, {
      email: "field.scout.preview@apexhq.app",
      password: "apexdemo123",
    });

    const unsafe = await requestJson(fixture.baseUrl, "/api/ai/opportunity-scout/agent-preview", {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify({
        title: "Unsafe portal bid",
        notes: "Automatically contact the owner and submit our bid.",
        token: "portal-token",
      }),
    });
    assert.equal(unsafe.response.status, 400);
    assert.match(unsafe.payload.error, /cannot contact customers/i);
    assert.match(unsafe.payload.error, /cannot store credentials/i);

    const fieldResponse = await requestJson(fixture.baseUrl, "/api/ai/opportunity-scout/agent-preview", {
      method: "POST",
      headers: authHeaders(fieldLogin.token),
      body: JSON.stringify({ title: "Field should not preview this" }),
    });
    assert.equal(fieldResponse.response.status, 403);
  } finally {
    await fixture.stop();
  }
});

test("Opportunity Scout rejects auto-contact, bid submission, and credential payloads", async () => {
  const fixture = await startServer();
  try {
    setCompanyPackage(fixture.sqliteFile, PACKAGE_IDS.ELITE);
    const adminLogin = await login(fixture.baseUrl, {
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
    });

    const unsafe = await requestJson(fixture.baseUrl, "/api/opportunity-scout/found-opportunities", {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify({
        title: "Unsafe auto bid",
        autoContact: true,
        submitBid: true,
        token: "portal-token",
      }),
    });
    assert.equal(unsafe.response.status, 400);
    assert.match(unsafe.payload.error, /cannot contact customers/i);
    assert.match(unsafe.payload.error, /cannot store credentials/i);

    const unsafeText = await requestJson(fixture.baseUrl, "/api/opportunity-scout/found-opportunities", {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify({
        title: "Unsafe pasted instructions",
        intakeText: "Automatically contact the owner and submit our bid once the plans load.",
      }),
    });
    assert.equal(unsafeText.response.status, 400);
    assert.match(unsafeText.payload.error, /cannot contact customers/i);
  } finally {
    await fixture.stop();
  }
});

test("Basic package users cannot access Opportunity Scout even with lead permissions", async () => {
  const fixture = await startServer();
  try {
    const adminLogin = await login(fixture.baseUrl, {
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
    });
    const headers = authHeaders(adminLogin.token);

    const bootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", {
      headers,
    });
    assert.equal(bootstrap.companyPackage.id, PACKAGE_IDS.BASIC);
    assert.equal(bootstrap.permissions.opportunityScout.canView, false);
    assert.equal(bootstrap.permissions.opportunityScout.canManage, false);
    assert.deepEqual(bootstrap.opportunitySearchProfiles, []);
    assert.deepEqual(bootstrap.foundOpportunities, []);

    const listResponse = await requestJson(fixture.baseUrl, "/api/opportunity-scout", {
      headers,
    });
    assert.equal(listResponse.response.status, 403);
    assert.match(listResponse.payload.error, /current Apex HQ package/i);

    const createResponse = await requestJson(fixture.baseUrl, "/api/opportunity-scout/search-profiles", {
      method: "POST",
      headers,
      body: JSON.stringify({ name: "Blocked Basic scout profile" }),
    });
    assert.equal(createResponse.response.status, 403);
    assert.match(createResponse.payload.error, /Opportunity Scout/i);

    const aiResponse = await requestJson(fixture.baseUrl, "/api/ai/opportunity-scout/search-profiles/OSP-BASIC/search-plan", {
      method: "POST",
      headers,
    });
    assert.equal(aiResponse.response.status, 403);
    assert.match(aiResponse.payload.error, /current Apex HQ package/i);
  } finally {
    await fixture.stop();
  }
});

test("field users cannot access Opportunity Scout", async () => {
  const fixture = await startServer();
  try {
    insertUser(fixture.sqliteFile, createUserRecord({
      id: "U-FIELD-SCOUT-BLOCKED",
      email: "field.scout@apexhq.app",
      password: "apexdemo123",
      name: "Field Scout Blocked",
      role: "Foreman",
    }));
    const foremanLogin = await login(fixture.baseUrl, {
      email: "field.scout@apexhq.app",
      password: "apexdemo123",
    });

    const listResponse = await requestJson(fixture.baseUrl, "/api/opportunity-scout", {
      headers: authHeaders(foremanLogin.token),
    });
    assert.equal(listResponse.response.status, 403);

    const createResponse = await requestJson(fixture.baseUrl, "/api/opportunity-scout/found-opportunities", {
      method: "POST",
      headers: authHeaders(foremanLogin.token),
      body: JSON.stringify({ title: "Field should not create this" }),
    });
    assert.equal(createResponse.response.status, 403);

    const convertResponse = await requestJson(fixture.baseUrl, "/api/opportunity-scout/found-opportunities/FO-NOPE/convert-to-lead", {
      method: "POST",
      headers: authHeaders(foremanLogin.token),
    });
    assert.equal(convertResponse.response.status, 403);

    const aiReviewResponse = await requestJson(fixture.baseUrl, "/api/ai/opportunity-scout/found-opportunities/FO-NOPE/review", {
      method: "POST",
      headers: authHeaders(foremanLogin.token),
    });
    assert.equal(aiReviewResponse.response.status, 403);

    const searchPlanResponse = await requestJson(fixture.baseUrl, "/api/ai/opportunity-scout/search-profiles/OSP-NOPE/search-plan", {
      method: "POST",
      headers: authHeaders(foremanLogin.token),
    });
    assert.equal(searchPlanResponse.response.status, 403);
  } finally {
    await fixture.stop();
  }
});

test("Opportunity Scout records stay company scoped", async () => {
  const fixture = await startServer();
  try {
    setCompanyPackage(fixture.sqliteFile, PACKAGE_IDS.ELITE);

    const adminLogin = await login(fixture.baseUrl, {
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
    });

    const profileBootstrap = await assertOk(fixture.baseUrl, "/api/opportunity-scout/search-profiles", {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify({ name: "Default company source profile" }),
    });
    const profile = profileBootstrap.opportunitySearchProfiles[0];

    const opportunityBootstrap = await assertOk(fixture.baseUrl, "/api/opportunity-scout/found-opportunities", {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify({
        searchProfileId: profile.id,
        title: "Default company opportunity",
      }),
    });
    const opportunity = opportunityBootstrap.foundOpportunities[0];

    insertOtherCompanyOwner(fixture.sqliteFile);
    const otherLogin = await login(fixture.baseUrl, {
      email: "other.owner@apexhq.app",
      password: "apexdemo123",
    });

    const otherList = await assertOk(fixture.baseUrl, "/api/opportunity-scout", {
      headers: authHeaders(otherLogin.token),
    });
    assert.equal(otherList.searchProfiles.length, 0);
    assert.equal(otherList.foundOpportunities.length, 0);

    const patchResponse = await requestJson(fixture.baseUrl, `/api/opportunity-scout/found-opportunities/${opportunity.id}`, {
      method: "PATCH",
      headers: authHeaders(otherLogin.token),
      body: JSON.stringify({ status: "watching" }),
    });
    assert.equal(patchResponse.response.status, 404);

    const convertResponse = await requestJson(fixture.baseUrl, `/api/opportunity-scout/found-opportunities/${opportunity.id}/convert-to-lead`, {
      method: "POST",
      headers: authHeaders(otherLogin.token),
    });
    assert.equal(convertResponse.response.status, 404);

    const aiReviewResponse = await requestJson(fixture.baseUrl, `/api/ai/opportunity-scout/found-opportunities/${opportunity.id}/review`, {
      method: "POST",
      headers: authHeaders(otherLogin.token),
    });
    assert.equal(aiReviewResponse.response.status, 404);

    const searchPlanResponse = await requestJson(fixture.baseUrl, `/api/ai/opportunity-scout/search-profiles/${profile.id}/search-plan`, {
      method: "POST",
      headers: authHeaders(otherLogin.token),
    });
    assert.equal(searchPlanResponse.response.status, 404);
  } finally {
    await fixture.stop();
  }
});
