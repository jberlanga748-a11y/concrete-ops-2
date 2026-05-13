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
  } finally {
    await fixture.stop();
  }
});

test("Opportunity Scout records stay company scoped", async () => {
  const fixture = await startServer();
  try {
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
  } finally {
    await fixture.stop();
  }
});
