import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import http from "node:http";
import net from "node:net";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

import { DEFAULT_COMPANY_ID } from "../shared/companyScope.js";
import { PACKAGE_IDS } from "../shared/packages.js";
import { createUserRecord } from "./store.js";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function createPort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close(() => resolve(port));
    });
  });
}

async function waitForServer(baseUrl, serverOutput) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/ready`);
      if (response.ok) return;
    } catch {
      // Poll until ready.
    }
    await sleep(250);
  }
  throw new Error(`Agent OS test server did not become ready.\n${serverOutput()}`);
}

function isProcessRunning(child) {
  return child.exitCode === null && child.signalCode === null;
}

async function waitForProcessExit(child, timeoutMs) {
  if (!isProcessRunning(child)) return true;
  return new Promise((resolve) => {
    const timeoutId = setTimeout(() => {
      child.off("exit", onExit);
      resolve(false);
    }, timeoutMs);
    function onExit() {
      clearTimeout(timeoutId);
      resolve(true);
    }
    child.once("exit", onExit);
  });
}

async function stopServerProcess(child) {
  if (!isProcessRunning(child)) return;
  child.kill("SIGTERM");
  const stopped = await waitForProcessExit(child, 3000);
  if (stopped || !isProcessRunning(child)) return;
  child.kill("SIGKILL");
  const killed = await waitForProcessExit(child, 3000);
  if (!killed && isProcessRunning(child)) {
    throw new Error(`Agent OS test server did not stop cleanly. pid=${child.pid}`);
  }
}

async function startServer(envOverrides = {}) {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await startServerAttempt(envOverrides);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

async function startServerAttempt(envOverrides = {}) {
  const tempDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "apex-agent-os-"));
  const sqliteFile = path.join(tempDataDir, "app-data.sqlite");
  const port = await createPort();
  const baseUrl = `http://127.0.0.1:${port}`;
  let output = "";
  const server = spawn(process.execPath, ["server/index.js"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(port),
      DATA_DIR: tempDataDir,
      LOG_LEVEL: "warn",
      OPENAI_API_KEY: "",
      EMAIL_PROVIDER: "",
      EMAIL_FROM: "",
      EMAIL_REPLY_TO_DEFAULT: "",
      EMAIL_API_KEY: "",
      EMAIL_API_URL: "",
      ...envOverrides,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  server.stdout.on("data", (chunk) => {
    output += String(chunk);
  });
  server.stderr.on("data", (chunk) => {
    output += String(chunk);
  });

  try {
    await waitForServer(baseUrl, () => output);
  } catch (error) {
    await stopServerProcess(server);
    await fs.rm(tempDataDir, { recursive: true, force: true });
    throw error;
  }

  async function stop() {
    await stopServerProcess(server);
    await fs.rm(tempDataDir, { recursive: true, force: true });
  }

  return { baseUrl, sqliteFile, stop };
}

async function startMockEmailApi({ status = 200, payload = { id: "msg_agent_gate_123" } } = {}) {
  const requests = [];
  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      requests.push({
        method: req.method,
        url: req.url,
        authorization: req.headers.authorization || "",
        body: body ? JSON.parse(body) : null,
      });
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify(payload));
    });
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  return {
    url: `http://127.0.0.1:${address.port}/emails`,
    requests,
    async stop() {
      await new Promise((resolve) => server.close(resolve));
    },
  };
}

async function startMockPublicSource({ status = 200, contentType = "text/html", body = "<html><head><title>Public bids</title></head><body><a href=\"/bid-1\">Concrete bid</a></body></html>" } = {}) {
  const requests = [];
  const server = http.createServer((req, res) => {
    requests.push({ method: req.method, url: req.url, userAgent: req.headers["user-agent"] || "" });
    res.writeHead(status, { "Content-Type": contentType });
    res.end(body);
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  return {
    url: `http://127.0.0.1:${address.port}`,
    requests,
    async stop() {
      await new Promise((resolve) => server.close(resolve));
    },
  };
}

async function requestJson(baseUrl, pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, options);
  const payload = response.status === 204 ? null : await response.json().catch(() => null);
  return { response, payload };
}

async function assertOk(baseUrl, pathname, options = {}) {
  const { response, payload } = await requestJson(baseUrl, pathname, options);
  const detail = payload ? JSON.stringify(payload) : "";
  assert.equal(response.ok, true, payload?.error || `Expected ${pathname} to succeed. status=${response.status} ${detail}`);
  return payload;
}

async function login(baseUrl, credentials) {
  return assertOk(baseUrl, "/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Apex-Auth-Mode": "bearer",
    },
    body: JSON.stringify({ ...credentials, returnToken: true }),
  });
}

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function buildEstimatePayload({ customerId, leadId = "", ...overrides } = {}) {
  return {
    customerId,
    leadId,
    title: "Agent Gate Email Proposal",
    status: "draft",
    customerEmail: "agent-gate-recipient@example.test",
    scopeSummary: "Prepare a reviewed proposal for the agent email gate test.",
    internalNotes: "Office-only agent gate test notes stay private.",
    customerNotes: "Please review and reply with questions.",
    taxRate: 8.5,
    feesTotal: 125,
    items: [
      { description: "Concrete placement", quantity: 10, unit: "yd", unitPrice: 185 },
      { description: "Prep and cleanup", quantity: 1, unit: "lot", unitPrice: 650 },
    ],
    ...overrides,
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

function agentOsAuditEvents(sqliteFile) {
  const database = new DatabaseSync(sqliteFile);
  try {
    return database.prepare(`
      SELECT entity_type AS entityType, entity_id AS entityId, action, summary, detail
      FROM audit_events
      WHERE entity_type = 'agentOsRun'
      ORDER BY sort_index DESC
    `).all();
  } finally {
    database.close();
  }
}

function agentProposalAuditEvents(sqliteFile) {
  const database = new DatabaseSync(sqliteFile);
  try {
    return database.prepare(`
      SELECT entity_type AS entityType, entity_id AS entityId, action, summary, detail
      FROM audit_events
      WHERE entity_type = 'agentActionProposal'
      ORDER BY sort_index DESC
    `).all();
  } finally {
    database.close();
  }
}

function auditEvents(sqliteFile) {
  const database = new DatabaseSync(sqliteFile);
  try {
    return database.prepare(`
      SELECT entity_type AS entityType, entity_id AS entityId, action, summary, detail
      FROM audit_events
      ORDER BY sort_index DESC
    `).all();
  } finally {
    database.close();
  }
}

test("Agent OS exposes registry and queues audit-backed internal runs while external gate execution stays disabled", async () => {
  const fixture = await startServer();

  try {
    const adminLogin = await login(fixture.baseUrl, {
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
    });

    const basicBlocked = await requestJson(fixture.baseUrl, "/api/agent/os", {
      headers: authHeaders(adminLogin.token),
    });
    assert.equal(basicBlocked.response.status, 403);

    setCompanyPackage(fixture.sqliteFile, PACKAGE_IDS.PREMIUM);
    const agentOs = await assertOk(fixture.baseUrl, "/api/agent/os", {
      headers: authHeaders(adminLogin.token),
    });
    assert.equal(agentOs.agentOs.version, "apex-agent-os-v1");
    assert.ok(agentOs.agentOs.actions.some((action) => action.actionId === "lead_follow_up_draft"));
    assert.equal(agentOs.agentOs.publicLeadProviderContract.id, "agent_leads_public_provider_contract_v6");
    assert.equal(agentOs.agentOs.publicLeadProviderContract.liveSearchEnabled, false);
    assert.equal(agentOs.agentOs.approvedPublicLeadProviderConnectors.every((connector) => connector.executionEnabled === false), true);
    assert.equal(agentOs.agentOs.externalGates.every((gate) => gate.status === "boundary_approved"), true);
    assert.equal(agentOs.agentOs.externalGates.every((gate) => gate.executionEnabled === false), true);
    const smsGate = await assertOk(fixture.baseUrl, "/api/agent/os/external-gates/sms_send", {
      headers: authHeaders(adminLogin.token),
    });
    assert.equal(smsGate.externalGate.gate.status, "boundary_approved");
    assert.equal(smsGate.externalGate.gate.executionEnabled, false);
    assert.match(smsGate.externalGate.requiredBeforeExecution.join(" "), /Per-company opt-in/i);
    assert.match(smsGate.externalGate.safetyBoundary, /No customer contact/i);

    const premiumScoutBlocked = await requestJson(fixture.baseUrl, "/api/agent/os/tasks", {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify({
        actionId: "opportunity_search_prep",
        target: { entityType: "opportunitySearchProfile", entityId: "OSP-1", title: "Daily bid scan" },
      }),
    });
    assert.equal(premiumScoutBlocked.response.status, 403);
    const premiumLiveApprovalBlocked = await requestJson(fixture.baseUrl, "/api/agent/os/provider/live-approval", {
      headers: authHeaders(adminLogin.token),
    });
    assert.equal(premiumLiveApprovalBlocked.response.status, 403);
    const premiumAdapterRunnerBlocked = await requestJson(fixture.baseUrl, "/api/agent/os/provider/adapter-runner", {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify({ today: "2026-05-27" }),
    });
    assert.equal(premiumAdapterRunnerBlocked.response.status, 403);
    const premiumLivePublicBlocked = await requestJson(fixture.baseUrl, "/api/agent/os/provider/live-public-execution", {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify({ today: "2026-05-27", connectorIds: ["public_procurement_search"] }),
    });
    assert.equal(premiumLivePublicBlocked.response.status, 403);
    const premiumPublicSourceAdapterBlocked = await requestJson(fixture.baseUrl, "/api/agent/os/provider/public-source-adapters", {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify({ today: "2026-05-27", connectorIds: ["public_procurement_search"] }),
    });
    assert.equal(premiumPublicSourceAdapterBlocked.response.status, 403);
    const premiumDailyJobFinderBlocked = await requestJson(fixture.baseUrl, "/api/agent/os/provider/daily-job-finder/run", {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify({ today: "2026-05-27", connectorIds: ["public_procurement_search"] }),
    });
    assert.equal(premiumDailyJobFinderBlocked.response.status, 403);
    const premiumDailyJobFinderAutopilotBlocked = await requestJson(fixture.baseUrl, "/api/agent/os/provider/daily-job-finder/autopilot", {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify({ today: "2026-05-27" }),
    });
    assert.equal(premiumDailyJobFinderAutopilotBlocked.response.status, 403);
    const premiumPrivateSourceAuthBlocked = await requestJson(fixture.baseUrl, "/api/agent/os/provider/private-source-authorizations", {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify({ sourceName: "Private group", sourceAdapterId: "facebook_private_group", authorizedBy: "Admin", acknowledgement: true }),
    });
    assert.equal(premiumPrivateSourceAuthBlocked.response.status, 403);
    const premiumPlatformBoundaryBlocked = await requestJson(fixture.baseUrl, "/api/agent/os/provider/platform-boundaries", {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify({ providerName: "Approved API", providerType: "approved_search_api", connectorIds: ["public_web_search"], reviewedBy: "Admin", sourceTermsStatus: "approved", robotsStatus: "allowed", acknowledgement: true }),
    });
    assert.equal(premiumPlatformBoundaryBlocked.response.status, 403);
    const premiumOfficialApiHarnessBlocked = await requestJson(fixture.baseUrl, "/api/agent/os/provider/official-api-adapter-harness", {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify({ today: "2026-05-27", adapterId: "official_procurement_feed_api_sandbox", query: "Salem concrete bid" }),
    });
    assert.equal(premiumOfficialApiHarnessBlocked.response.status, 403);
    const premiumSourceCoverageBlocked = await requestJson(fixture.baseUrl, "/api/agent/os/provider/source-adapter-coverage?today=2026-05-27", {
      headers: authHeaders(adminLogin.token),
    });
    assert.equal(premiumSourceCoverageBlocked.response.status, 403);
    const premiumDailyPublicRunEvidenceBlocked = await requestJson(fixture.baseUrl, "/api/agent/os/provider/daily-public-run-evidence?today=2026-05-27", {
      headers: authHeaders(adminLogin.token),
    });
    assert.equal(premiumDailyPublicRunEvidenceBlocked.response.status, 403);
    const premiumDailyPublicRunApprovalBlocked = await requestJson(fixture.baseUrl, "/api/agent/os/provider/daily-public-run-approval", {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify({ today: "2026-05-27", acknowledgement: true }),
    });
    assert.equal(premiumDailyPublicRunApprovalBlocked.response.status, 403);
    const premiumProcurementAdapterBlocked = await requestJson(fixture.baseUrl, "/api/agent/os/provider/procurement-feed-adapter/run", {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify({ today: "2026-05-27", query: "Salem concrete bid" }),
    });
    assert.equal(premiumProcurementAdapterBlocked.response.status, 403);
    const premiumLiveProcurementAdapterBlocked = await requestJson(fixture.baseUrl, "/api/agent/os/provider/live-procurement-public-adapter/run", {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify({ today: "2026-05-27", query: "Salem concrete bid" }),
    });
    assert.equal(premiumLiveProcurementAdapterBlocked.response.status, 403);
    const premiumDailyLiveProcurementAdapterBlocked = await requestJson(fixture.baseUrl, "/api/agent/os/provider/live-procurement-public-adapter/daily", {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify({ today: "2026-05-27", query: "Salem concrete bid" }),
    });
    assert.equal(premiumDailyLiveProcurementAdapterBlocked.response.status, 403);
    const premiumLiveReadinessBlocked = await requestJson(fixture.baseUrl, "/api/agent/os/provider/live-readiness", {
      headers: authHeaders(adminLogin.token),
    });
    assert.equal(premiumLiveReadinessBlocked.response.status, 403);
    const premiumConnectionMetadataBlocked = await requestJson(fixture.baseUrl, "/api/agent/os/provider/connection-metadata", {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify({ providerName: "Provider", connectorId: "public_procurement_search", reviewedBy: "Admin", acknowledgement: true }),
    });
    assert.equal(premiumConnectionMetadataBlocked.response.status, 403);
    const premiumSourceConsentBlocked = await requestJson(fixture.baseUrl, "/api/agent/os/provider/source-consents", {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify({ sourceName: "Public procurement", sourceCategory: "public_procurement", authorizedBy: "Admin", acknowledgement: true }),
    });
    assert.equal(premiumSourceConsentBlocked.response.status, 403);
    const premiumDailyScheduleBlocked = await requestJson(fixture.baseUrl, "/api/agent/os/provider/daily-schedule", {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify({ sourceCategories: ["public_procurement"], reviewer: "Admin", acknowledgement: true }),
    });
    assert.equal(premiumDailyScheduleBlocked.response.status, 403);
    const premiumSmokeEvidenceBlocked = await requestJson(fixture.baseUrl, "/api/agent/os/provider/smoke-evidence", {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify({ status: "passed", acknowledgement: true }),
    });
    assert.equal(premiumSmokeEvidenceBlocked.response.status, 403);
    const premiumReviewDraftBlocked = await requestJson(fixture.baseUrl, "/api/agent/os/provider/review-queue-draft-opportunity", {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify({ providerResultId: "provider-result-1", acknowledgement: true }),
    });
    assert.equal(premiumReviewDraftBlocked.response.status, 403);
    const premiumLocalCompletionBlocked = await requestJson(fixture.baseUrl, "/api/agent/os/provider/local-completion-readiness", {
      headers: authHeaders(adminLogin.token),
    });
    assert.equal(premiumLocalCompletionBlocked.response.status, 403);
    const premiumProductionReadinessBlocked = await requestJson(fixture.baseUrl, "/api/agent/os/provider/production-readiness", {
      headers: authHeaders(adminLogin.token),
    });
    assert.equal(premiumProductionReadinessBlocked.response.status, 403);
    const premiumProductionEvidenceBlocked = await requestJson(fixture.baseUrl, "/api/agent/os/provider/production-readiness-evidence", {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify({ operatorName: "Admin", acknowledgement: true }),
    });
    assert.equal(premiumProductionEvidenceBlocked.response.status, 403);
    const premiumControlledPilotRunBlocked = await requestJson(fixture.baseUrl, "/api/agent/os/provider/controlled-pilot-run", {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify({ today: "2026-05-27", acknowledgement: true }),
    });
    assert.equal(premiumControlledPilotRunBlocked.response.status, 403);

    setCompanyPackage(fixture.sqliteFile, PACKAGE_IDS.ELITE);
    const approvalAdminUser = createUserRecord({
      id: "U-AGENT-OS-PROVIDER-ADMIN",
      email: "agent-os-provider-admin@apexhq.test",
      password: "apexdemo123",
      name: "Agent OS Provider Admin",
      role: "Administrator",
    });
    insertUser(fixture.sqliteFile, approvalAdminUser);
    const approvalAdminLogin = await login(fixture.baseUrl, {
      email: approvalAdminUser.email,
      password: "apexdemo123",
    });
    await assertOk(fixture.baseUrl, "/api/settings/company", {
      method: "PATCH",
      headers: authHeaders(approvalAdminLogin.token),
      body: JSON.stringify({
        apexAgentAutomationPolicy: {
          publicLeadProviderSettings: {
            providerId: "approved_public_search",
            mode: "test",
            dailyBudget: 12,
            maxResultsPerRun: 2,
            enabledConnectorIds: ["public_web_search", "public_procurement_search"],
            geographyControls: { serviceAreas: ["Salem"] },
            tradeScope: { trades: ["concrete"] },
            reviewRules: { requireHumanOpen: true, dedupeBeforeImport: true, minFitScoreForReview: 40 },
          },
        },
      }),
    });
    const scoutBootstrap = await assertOk(fixture.baseUrl, "/api/opportunity-scout/search-profiles", {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify({
        name: "Agent OS daily public bid scan",
        trades: ["concrete"],
        serviceAreas: ["Salem Oregon"],
        sourceTypes: ["Public bid portal", "City/county/school bid page"],
        sourceAdapterId: "public_web",
        sourceTermsStatus: "public_allowed",
        cadence: "daily",
      }),
    });
    const searchProfile = scoutBootstrap.opportunitySearchProfiles.find((profile) => profile.name === "Agent OS daily public bid scan");
    assert.ok(searchProfile?.id);
    await assertOk(fixture.baseUrl, "/api/lead-sources", {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify({
        name: "City public bid source",
        type: "City/county/school bid page",
        serviceArea: "Salem Oregon",
        tradeFocus: "Concrete",
        checkCadence: "Daily",
        url: "https://city.example.gov/procurement/open-bids",
      }),
    });

    const scoutQueued = await assertOk(fixture.baseUrl, "/api/agent/os/opportunity-search-prep/daily", {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify({ today: "2026-05-27" }),
    });
    assert.equal(scoutQueued.dailyOpportunitySearchPrep.queuedCount, 1);
    assert.equal(scoutQueued.dailyOpportunitySearchPrep.queued[0].actionId, "opportunity_search_prep");
    assert.equal(scoutQueued.dailyOpportunitySearchPrep.queued[0].profileId, searchProfile.id);
    assert.equal(scoutQueued.dailyOpportunitySearchPrep.schedulerHook.safeForCron, true);
    assert.equal(scoutQueued.dailyScoutExecutionPlan.mode, "daily_agent_leads_scout_execution_v6");
    assert.equal(scoutQueued.dailyScoutExecutionPlan.stats.publicRunnerCards >= 1, true);
    assert.equal(scoutQueued.dailyScoutExecutionPlan.dailyRunRecord.status, "prepared");
    assert.equal(scoutQueued.dailyScoutExecutionPlan.dailyRunRecord.providerAttemptCount >= 1, true);
    assert.equal(scoutQueued.dailyScoutExecutionPlan.dailyRunRecord.providerReviewImportCount, scoutQueued.dailyScoutExecutionPlan.providerReviewImportQueue.length);
    assert.equal(scoutQueued.dailyScoutExecutionPlan.publicProviderBoundary.providerContract.liveSearchEnabled, false);
    assert.equal(scoutQueued.dailyScoutExecutionPlan.publicProviderBoundary.liveProviderPlan.executionEnabled, false);
    assert.equal(scoutQueued.ledger.reviewCardCount >= scoutQueued.dailyScoutExecutionPlan.stats.cards, true);
    assert.equal(scoutQueued.ledger.dailyRunRecordCount >= 1, true);
    assert.equal(scoutQueued.ledger.providerAttemptCount >= 1, true);
    assert.equal(scoutQueued.ledger.providerReviewImportCount >= scoutQueued.dailyScoutExecutionPlan.providerReviewImportQueue.length, true);
    const smokeTarget = scoutQueued.dailyScoutExecutionPlan.controlledHostedDemoSmokePacket.smokeTargetSelector;
    assert.ok(smokeTarget.selectedSourceConfigId);
    const unsafeSmokeEvidenceBlocked = await requestJson(fixture.baseUrl, "/api/agent/os/provider/smoke-evidence", {
      method: "POST",
      headers: authHeaders(approvalAdminLogin.token),
      body: JSON.stringify({
        today: "2026-05-27",
        status: "passed",
        environmentLabel: "controlled hosted demo",
        targetUrl: "https://concrete-ops-demo.fly.dev/agent",
        sourceConfigId: smokeTarget.selectedSourceConfigId,
        sourceUrl: smokeTarget.selectedSourceUrl,
        reviewQueueCount: 1,
        screenshotsOrNotes: "password: redacted-demo-value and sent email to customer",
        operatorName: "Agent OS Provider Admin",
        observedAt: "2026-05-27T10:00:00.000Z",
        acknowledgement: true,
      }),
    });
    assert.equal(unsafeSmokeEvidenceBlocked.response.status, 400);
    const smokeEvidenceReviewed = await assertOk(fixture.baseUrl, "/api/agent/os/provider/smoke-evidence", {
      method: "POST",
      headers: authHeaders(approvalAdminLogin.token),
      body: JSON.stringify({
        today: "2026-05-27",
        status: "passed_with_warnings",
        environmentLabel: "controlled hosted demo",
        targetUrl: "https://concrete-ops-demo.fly.dev/agent",
        sourceConfigId: smokeTarget.selectedSourceConfigId,
        sourceUrl: smokeTarget.selectedSourceUrl,
        reviewQueueCount: 1,
        screenshotsOrNotes: "Observed one review-only source card. No external action occurred.",
        operatorName: "Agent OS Provider Admin",
        observedAt: "2026-05-27T10:00:00.000Z",
        acknowledgement: true,
      }),
    });
    assert.equal(smokeEvidenceReviewed.smokeEvidenceReviewIntake.mode, "agent_leads_smoke_evidence_review_intake_v31");
    assert.equal(smokeEvidenceReviewed.smokeEvidenceReviewIntake.status, "audit_record_prepared");
    assert.equal(smokeEvidenceReviewed.smokeEvidenceRecorder.validation.ok, true);
    assert.equal(smokeEvidenceReviewed.smokeEvidenceRecorder.serverWriteEnabled, false);
    assert.equal(smokeEvidenceReviewed.smokeEvidenceReviewIntake.customerContactEnabled, false);
    assert.equal(smokeEvidenceReviewed.smokeEvidenceReviewIntake.leadAutoSaveEnabled, false);
    assert.equal(smokeEvidenceReviewed.smokeEvidenceReviewIntake.productionDataTouchEnabled, false);
    assert.equal(smokeEvidenceReviewed.ledger.rows.some((row) => row.action === "agent.os.leads.hosted_demo_smoke.evidence_recorded"), true);
    const smokeAudit = auditEvents(fixture.sqliteFile).find((event) => event.action === "agent.os.leads.hosted_demo_smoke.evidence_recorded");
    assert.ok(smokeAudit);
    assert.doesNotMatch(smokeAudit.detail, /redacted-demo-value|sent email/i);
    const dailyPublicRunEvidence = await assertOk(fixture.baseUrl, "/api/agent/os/provider/daily-public-run-evidence?today=2026-05-27", {
      headers: authHeaders(approvalAdminLogin.token),
    });
    assert.equal(dailyPublicRunEvidence.controlledDailyPublicSourceRunEvidencePacket.mode, "agent_leads_controlled_daily_public_source_run_evidence_packet_v32");
    assert.equal(dailyPublicRunEvidence.controlledDailyPublicSourceRunEvidencePacket.status, "ready_for_owner_admin_review");
    assert.equal(dailyPublicRunEvidence.controlledDailyPublicSourceRunEvidencePacket.nextRunDate, "2026-05-28");
    assert.equal(dailyPublicRunEvidence.controlledDailyPublicSourceRunEvidencePacket.sourceRunRows.length >= 1, true);
    assert.match(dailyPublicRunEvidence.controlledDailyPublicSourceRunEvidencePacket.sourceRunRows[0].idempotencyKey, /2026-05-28/);
    assert.equal(dailyPublicRunEvidence.controlledDailyPublicSourceRunEvidencePacket.canRunAutomatically, false);
    assert.equal(dailyPublicRunEvidence.controlledDailyPublicSourceRunEvidencePacket.safeForCron, false);
    assert.equal(dailyPublicRunEvidence.controlledDailyPublicSourceRunEvidencePacket.customerContactEnabled, false);
    assert.equal(dailyPublicRunEvidence.controlledDailyPublicSourceRunEvidencePacket.leadAutoSaveEnabled, false);
    assert.equal(dailyPublicRunEvidence.controlledDailyPublicSourceRunEvidencePacket.productionDataTouchEnabled, false);
    const approvalMissingPreflight = await assertOk(fixture.baseUrl, "/api/agent/os/provider/daily-public-run-preflight?today=2026-05-27", {
      headers: authHeaders(approvalAdminLogin.token),
    });
    assert.equal(approvalMissingPreflight.controlledDailyPublicRunPreflight.status, "blocked");
    assert.match(approvalMissingPreflight.controlledDailyPublicRunPreflight.blockers.join(" "), /approval/i);
    const controlledRunApproval = await assertOk(fixture.baseUrl, "/api/agent/os/provider/daily-public-run-approval", {
      method: "POST",
      headers: authHeaders(approvalAdminLogin.token),
      body: JSON.stringify({
        today: "2026-05-27",
        acknowledgement: true,
        approvedBy: "Agent OS Provider Admin",
        selectedSourceConfigIds: dailyPublicRunEvidence.controlledDailyPublicSourceRunEvidencePacket.sourceRunRows.map((row) => row.sourceConfigId),
        idempotencyKeys: dailyPublicRunEvidence.controlledDailyPublicSourceRunEvidencePacket.sourceRunRows.map((row) => row.idempotencyKey),
      }),
    });
    assert.equal(controlledRunApproval.controlledDailyPublicRunApproval.mode, "agent_leads_controlled_daily_public_run_approval_v33");
    assert.equal(controlledRunApproval.controlledDailyPublicRunPreflight.status, "ready_for_controlled_evidence_prep");
    assert.equal(controlledRunApproval.controlledDailyPublicRunEvidencePrep.status, "review_evidence_prepared");
    const forcedControlledRunBlocked = await requestJson(fixture.baseUrl, "/api/agent/os/provider/daily-public-run-evidence", {
      method: "POST",
      headers: authHeaders(approvalAdminLogin.token),
      body: JSON.stringify({ today: "2026-05-27", acknowledgement: true, fetchProvider: true }),
    });
    assert.equal(forcedControlledRunBlocked.response.status, 400);
    const controlledRunEvidencePrep = await assertOk(fixture.baseUrl, "/api/agent/os/provider/daily-public-run-evidence", {
      method: "POST",
      headers: authHeaders(approvalAdminLogin.token),
      body: JSON.stringify({ today: "2026-05-27", acknowledgement: true }),
    });
    assert.equal(controlledRunEvidencePrep.controlledDailyPublicRunEvidencePrep.mode, "agent_leads_controlled_daily_public_run_evidence_prep_v35");
    assert.equal(controlledRunEvidencePrep.controlledDailyPublicRunEvidencePrep.status, "review_evidence_prepared");
    assert.equal(controlledRunEvidencePrep.controlledDailyPublicRunEvidencePrep.liveProviderCallsEnabled, false);
    assert.equal(controlledRunEvidencePrep.controlledDailyPublicRunEvidencePrep.leadAutoSaveEnabled, false);
    const forcedControlledFlowBlocked = await requestJson(fixture.baseUrl, "/api/agent/os/provider/daily-public-run-controlled-flow", {
      method: "POST",
      headers: authHeaders(approvalAdminLogin.token),
      body: JSON.stringify({ today: "2026-05-27", acknowledgement: true, fetchProvider: true }),
    });
    assert.equal(forcedControlledFlowBlocked.response.status, 400);
    const controlledReviewFlow = await assertOk(fixture.baseUrl, "/api/agent/os/provider/daily-public-run-controlled-flow", {
      method: "POST",
      headers: authHeaders(approvalAdminLogin.token),
      body: JSON.stringify({
        today: "2026-05-27",
        acknowledgement: true,
        approvedBy: "Agent OS Provider Admin",
        selectedSourceConfigIds: dailyPublicRunEvidence.controlledDailyPublicSourceRunEvidencePacket.sourceRunRows.map((row) => row.sourceConfigId),
        idempotencyKeys: dailyPublicRunEvidence.controlledDailyPublicSourceRunEvidencePacket.sourceRunRows.map((row) => row.idempotencyKey),
      }),
    });
    assert.equal(controlledReviewFlow.controlledDailyRunReviewFlow.mode, "agent_leads_controlled_daily_run_review_flow_v42");
    assert.equal(controlledReviewFlow.controlledDailyRunReviewFlow.status, "review_inbox_ready");
    assert.equal(controlledReviewFlow.controlledDailyRunReviewFlow.reviewInboxPreviewRows.length >= 1, true);
    assert.equal(controlledReviewFlow.controlledDailyRunReviewFlow.reviewInboxPreviewRows[0].canAutoSave, false);
    assert.equal(controlledReviewFlow.controlledDailyRunReviewFlow.customerContactEnabled, false);
    assert.equal(controlledReviewFlow.controlledDailyRunReviewFlow.leadAutoSaveEnabled, false);
    assert.equal(controlledReviewFlow.controlledDailyRunReviewFlow.liveProviderCallsEnabled, false);
    const forcedControlledPilotRunBlocked = await requestJson(fixture.baseUrl, "/api/agent/os/provider/controlled-pilot-run", {
      method: "POST",
      headers: authHeaders(approvalAdminLogin.token),
      body: JSON.stringify({ today: "2026-05-27", acknowledgement: true, fetchProvider: true }),
    });
    assert.equal(forcedControlledPilotRunBlocked.response.status, 400);
    const controlledPilotRun = await assertOk(fixture.baseUrl, "/api/agent/os/provider/controlled-pilot-run", {
      method: "POST",
      headers: authHeaders(approvalAdminLogin.token),
      body: JSON.stringify({ today: "2026-05-27", acknowledgement: true }),
    });
    assert.equal(controlledPilotRun.controlledPilotRunExecution.mode, "agent_leads_controlled_pilot_run_execution_v46");
    assert.equal(controlledPilotRun.controlledPilotRunExecution.status, "persisted");
    assert.equal(controlledPilotRun.controlledPilotRunExecution.runRecord.mode, "agent_leads_controlled_pilot_run_record_v46");
    assert.equal(controlledPilotRun.controlledPilotRunExecution.persistedReviewInbox.mode, "agent_leads_persistent_review_inbox_v46");
    assert.equal(controlledPilotRun.controlledPilotRunExecution.persistedReviewInbox.count >= 1, true);
    assert.equal(controlledPilotRun.controlledPilotRunExecution.controlledPublicSourceExecutor.networkRequestsEnabled, false);
    assert.equal(controlledPilotRun.controlledPilotRunExecution.leadAutoSaveEnabled, false);
    assert.equal(controlledPilotRun.controlledPilotRunExecution.customerContactEnabled, false);
    assert.equal(controlledPilotRun.controlledPilotRunExecution.productionDataTouchEnabled, false);
    assert.equal(controlledPilotRun.dailyReviewInbox.rows[0].canAutoSave, false);
    assert.equal(controlledPilotRun.ledger.rows.some((row) => row.action === "agent.os.provider.controlled_pilot_run.review_inbox_persisted"), true);
    const controlledPilotRunAgain = await assertOk(fixture.baseUrl, "/api/agent/os/provider/controlled-pilot-run", {
      method: "POST",
      headers: authHeaders(approvalAdminLogin.token),
      body: JSON.stringify({ today: "2026-05-27", acknowledgement: true }),
    });
    assert.equal(controlledPilotRunAgain.controlledPilotRunExecution.status, "persisted");
    const controlledPilotAuditRows = auditEvents(fixture.sqliteFile).filter((event) => event.action === "agent.os.provider.controlled_pilot_run.review_inbox_persisted");
    assert.equal(controlledPilotAuditRows.length, 1);
    const controlledInboxRow = controlledReviewFlow.controlledDailyRunReviewFlow.reviewInboxPreviewRows[0];
    const controlledInboxDraft = await assertOk(fixture.baseUrl, "/api/agent/os/provider/review-queue-draft-opportunity", {
      method: "POST",
      headers: authHeaders(approvalAdminLogin.token),
      body: JSON.stringify({
        today: "2026-05-27",
        acknowledgement: true,
        providerResultId: controlledInboxRow.providerResultId,
        reviewRowId: controlledInboxRow.id,
      }),
    });
    assert.equal(controlledInboxDraft.providerReviewFoundOpportunityDraft.leadCreated, false);
    assert.equal(controlledInboxDraft.providerReviewFoundOpportunityDraft.customerContactEnabled, false);
    const evidenceRow = controlledRunEvidencePrep.controlledDailyPublicRunEvidencePrep.evidenceRows[0];
    const controlledRunOutcomes = await assertOk(fixture.baseUrl, "/api/agent/os/provider/daily-public-run-outcomes", {
      method: "POST",
      headers: authHeaders(approvalAdminLogin.token),
      body: JSON.stringify({
        today: "2026-05-27",
        outcomes: [{ evidenceRowId: evidenceRow.id, decision: "draft_found_opportunity", note: "Good public source fit." }],
      }),
    });
    assert.equal(controlledRunOutcomes.controlledDailyPublicRunOutcomeRecords.length, 1);
    assert.equal(controlledRunOutcomes.providerReviewLearningSignals[0].learningSignalType, "accepted_found_opportunity");
    assert.equal(controlledRunOutcomes.providerReviewLearningSignals[0].canAutoSave, false);
    assert.equal(controlledRunOutcomes.controlledDailyPublicRunOutcomeLoop.status, "learning_signals_recorded");

    const providerHealth = await assertOk(fixture.baseUrl, "/api/agent/os/provider/health", {
      headers: authHeaders(adminLogin.token),
    });
    assert.equal(providerHealth.providerHealth.contractId, "agent_leads_public_provider_contract_v6");
    assert.equal(providerHealth.providerHealth.executionEnabled, false);
    assert.equal(providerHealth.providerHealth.liveSearchEnabled, false);
    assert.match(providerHealth.providerHealth.safetyBoundary, /does not call external providers/i);

    const sandboxTest = await assertOk(fixture.baseUrl, "/api/agent/os/provider/sandbox-test", {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify({
        today: "2026-05-27",
        connectorId: "public_web_search",
        query: "Salem concrete public bid opportunity",
      }),
    });
    assert.equal(sandboxTest.providerSandboxRun.mode, "agent_leads_provider_sandbox_v6");
    assert.equal(sandboxTest.providerSandboxRun.liveRequestAttempted, false);
    assert.equal(sandboxTest.providerSandboxRun.results.length > 0, true);

    const providerDecision = await assertOk(fixture.baseUrl, "/api/agent/os/provider/import-decisions", {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify({
        providerResultId: sandboxTest.providerSandboxRun.results[0].providerResultId,
        providerAttemptId: sandboxTest.providerSandboxRun.providerAttempt.attemptId,
        decision: "duplicate",
      }),
    });
    assert.equal(providerDecision.providerImportDecision.canAutoSave, false);
    assert.equal(providerDecision.providerImportDecision.savedRecordId, "");
    assert.equal(providerDecision.ledger.providerReviewImportCount >= 1, true);

    const providerAdapterRunner = await assertOk(fixture.baseUrl, "/api/agent/os/provider/adapter-runner", {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify({ today: "2026-05-27" }),
    });
    assert.equal(providerAdapterRunner.providerAdapterRunner.mode, "agent_leads_provider_adapter_runner_v7");
    assert.equal(providerAdapterRunner.providerAdapterRunner.liveRequestAttempted, false);
    assert.equal(providerAdapterRunner.providerAdapterRunner.executionEnabled, false);
    assert.equal(providerAdapterRunner.providerAdapterRunner.resultDraftPreviews.length >= 1, true);

    const directAdapterLiveBlocked = await requestJson(fixture.baseUrl, "/api/agent/os/provider/adapter-runner", {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify({ today: "2026-05-27", executeLive: true }),
    });
    assert.equal(directAdapterLiveBlocked.response.status, 400);
    assert.match(directAdapterLiveBlocked.payload.error, /cannot enable live execution/i);

    const autonomousDailyScout = await assertOk(fixture.baseUrl, "/api/agent/os/opportunity-search-prep/autonomous-daily", {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify({ today: "2026-05-28" }),
    });
    assert.equal(autonomousDailyScout.autonomousDailyScout.mode, "agent_leads_autonomous_daily_scheduler_v7");
    assert.equal(autonomousDailyScout.providerAdapterRunner.liveRequestAttempted, false);
    assert.equal(autonomousDailyScout.providerAdapterRunner.resultDraftPreviews.length >= 1, true);

    const rawCredentialHandoffBlocked = await requestJson(fixture.baseUrl, "/api/agent/os/provider/credential-handoffs", {
      method: "POST",
      headers: authHeaders(approvalAdminLogin.token),
      body: JSON.stringify({
        sourceAdapterId: "facebook_private_group",
        credentialRef: "credref_private_source_1",
        password: "do-not-store",
      }),
    });
    assert.equal(rawCredentialHandoffBlocked.response.status, 400);
    assert.match(rawCredentialHandoffBlocked.payload.error, /references only/i);

    const credentialHandoff = await assertOk(fixture.baseUrl, "/api/agent/os/provider/credential-handoffs", {
      method: "POST",
      headers: authHeaders(approvalAdminLogin.token),
      body: JSON.stringify({
        sourceAdapterId: "facebook_private_group",
        credentialRef: "credref_private_source_1",
      }),
    });
    assert.equal(credentialHandoff.providerCredentialHandoff.rawCredentialStorage, false);
    assert.equal(credentialHandoff.providerCredentialHandoff.loginAutomationEnabled, false);

    const privateSourceSecretBlocked = await requestJson(fixture.baseUrl, "/api/agent/os/provider/private-source-authorizations", {
      method: "POST",
      headers: authHeaders(approvalAdminLogin.token),
      body: JSON.stringify({
        sourceName: "Bad private source",
        sourceAdapterId: "facebook_private_group",
        authorizedBy: "Owner",
        acknowledgement: true,
        password: "do-not-store",
      }),
    });
    assert.equal(privateSourceSecretBlocked.response.status, 400);
    assert.match(privateSourceSecretBlocked.payload.error, /passwords/i);

    const privateSourceAuthorization = await assertOk(fixture.baseUrl, "/api/agent/os/provider/private-source-authorizations", {
      method: "POST",
      headers: authHeaders(approvalAdminLogin.token),
      body: JSON.stringify({
        today: "2026-05-28",
        sourceName: "Salem contractors private group",
        sourceType: "facebook_private_group",
        sourceAdapterId: "facebook_private_group",
        authorizedBy: "Agent OS Provider Admin",
        credentialRef: "credref_private_source_1",
        acknowledgement: true,
        expiresAt: "2026-05-28T12:00:00.000Z",
      }),
    });
    assert.equal(privateSourceAuthorization.privateSourceAuthorization.status, "authorized_human_handoff");
    assert.equal(privateSourceAuthorization.privateSourceAuthorization.rawCredentialStorage, false);
    assert.equal(privateSourceAuthorization.privateSourceAuthorization.loginAutomationEnabled, false);
    assert.equal(privateSourceAuthorization.privateSourceLoginHandoff.status, "human_login_required");
    assert.equal(privateSourceAuthorization.privateSourceChecklist.count >= 1, true);

    const privateEvidenceUnsafeActionBlocked = await requestJson(fixture.baseUrl, "/api/agent/os/provider/private-evidence-intake", {
      method: "POST",
      headers: authHeaders(approvalAdminLogin.token),
      body: JSON.stringify({
        authorizationId: privateSourceAuthorization.privateSourceAuthorization.id,
        sourceAdapterId: "facebook_private_group",
        evidenceText: "Concrete patio request in Salem",
        saveLead: true,
      }),
    });
    assert.equal(privateEvidenceUnsafeActionBlocked.response.status, 400);
    assert.match(privateEvidenceUnsafeActionBlocked.payload.error, /cannot save leads/i);

    const privateEvidenceIntake = await assertOk(fixture.baseUrl, "/api/agent/os/provider/private-evidence-intake", {
      method: "POST",
      headers: authHeaders(approvalAdminLogin.token),
      body: JSON.stringify({
        authorizationId: privateSourceAuthorization.privateSourceAuthorization.id,
        sourceName: "Salem contractors private group",
        sourceType: "facebook_private_group",
        sourceAdapterId: "facebook_private_group",
        evidenceText: "Concrete patio repair lead near Salem. Email jane@example.com and phone 503-555-1212. token=secret",
        fileNames: ["group-evidence.png"],
      }),
    });
    assert.equal(privateEvidenceIntake.privateSourceEvidenceIntake.status, "review_queue_prepared");
    assert.equal(privateEvidenceIntake.privateSourceEvidenceIntake.reviewQueue.count, 1);
    assert.equal(privateEvidenceIntake.privateSourceEvidenceIntake.reviewQueue.rows[0].canAutoSave, false);
    assert.match(privateEvidenceIntake.privateSourceEvidenceIntake.redactedEvidenceText, /\[redacted-email\]/);
    assert.match(privateEvidenceIntake.privateSourceEvidenceIntake.redactedEvidenceText, /\[redacted-phone\]/);

    const privateSourceChecklist = await assertOk(fixture.baseUrl, "/api/agent/os/provider/private-source-checklist?today=2026-05-28", {
      headers: authHeaders(approvalAdminLogin.token),
    });
    assert.equal(privateSourceChecklist.privateSourceChecklist.mode, "agent_leads_private_source_daily_checklist_v10");
    assert.equal(privateSourceChecklist.privateSourceChecklist.count >= 1, true);

    const platformBoundarySecretBlocked = await requestJson(fixture.baseUrl, "/api/agent/os/provider/platform-boundaries", {
      method: "POST",
      headers: authHeaders(approvalAdminLogin.token),
      body: JSON.stringify({
        providerName: "Bad provider",
        providerType: "approved_search_api",
        connectorIds: ["public_web_search"],
        reviewedBy: "Agent OS Provider Admin",
        sourceTermsStatus: "approved",
        robotsStatus: "allowed",
        acknowledgement: true,
        apiKey: "do-not-store",
      }),
    });
    assert.equal(platformBoundarySecretBlocked.response.status, 400);
    assert.match(platformBoundarySecretBlocked.payload.error, /references only/i);

    const platformBoundary = await assertOk(fixture.baseUrl, "/api/agent/os/provider/platform-boundaries", {
      method: "POST",
      headers: authHeaders(approvalAdminLogin.token),
      body: JSON.stringify({
        today: "2026-05-28",
        providerName: "Approved procurement API",
        providerType: "procurement_feed_api",
        connectorIds: ["public_web_search", "public_procurement_search"],
        reviewedBy: "Agent OS Provider Admin",
        sourceTermsStatus: "approved",
        robotsStatus: "not_applicable",
        credentialRef: "credref-approved-provider",
        acknowledgement: true,
      }),
    });
    assert.equal(platformBoundary.platformProviderBoundary.status, "boundary_recorded");
    assert.equal(platformBoundary.platformProviderBoundary.executionEnabled, false);
    assert.equal(platformBoundary.platformProviderBoundary.liveNetworkRequestsEnabled, false);
    assert.equal(platformBoundary.providerCompliancePacket.mode, "agent_leads_provider_compliance_packet_v11");
    assert.equal(platformBoundary.providerCompliancePacket.status, "ready_for_provider_adapter_build");
    assert.equal(platformBoundary.providerMonitoringSnapshot.mode, "agent_leads_provider_monitoring_snapshot_v11");
    assert.equal(platformBoundary.providerMonitoringSnapshot.executionEnabled, false);

    const connectionSecretBlocked = await requestJson(fixture.baseUrl, "/api/agent/os/provider/connection-metadata", {
      method: "POST",
      headers: authHeaders(approvalAdminLogin.token),
      body: JSON.stringify({
        providerName: "Bad provider connection",
        connectorId: "public_procurement_search",
        reviewedBy: "Agent OS Provider Admin",
        acknowledgement: true,
        password: "do-not-store",
      }),
    });
    assert.equal(connectionSecretBlocked.response.status, 400);
    assert.match(connectionSecretBlocked.payload.error, /credential references only/i);

    const providerProcurementConnection = await assertOk(fixture.baseUrl, "/api/agent/os/provider/connection-metadata", {
      method: "POST",
      headers: authHeaders(approvalAdminLogin.token),
      body: JSON.stringify({
        today: "2026-05-28",
        providerName: "Approved procurement API",
        sourceCategory: "public_procurement",
        connectorId: "public_procurement_search",
        reviewedBy: "Agent OS Provider Admin",
        acknowledgement: true,
      }),
    });
    assert.equal(providerProcurementConnection.providerConnectionMetadata.status, "metadata_recorded");
    assert.equal(providerProcurementConnection.providerConnectionMetadata.rawCredentialStorage, false);
    assert.equal(providerProcurementConnection.providerConnectionMetadata.executionEnabled, false);

    const providerPublicWebConnection = await assertOk(fixture.baseUrl, "/api/agent/os/provider/connection-metadata", {
      method: "POST",
      headers: authHeaders(approvalAdminLogin.token),
      body: JSON.stringify({
        today: "2026-05-28",
        providerName: "Approved public search API",
        sourceCategory: "public_job_board",
        connectorId: "public_web_search",
        reviewedBy: "Agent OS Provider Admin",
        acknowledgement: true,
      }),
    });
    assert.equal(providerPublicWebConnection.providerConnectionMetadata.liveNetworkRequestsEnabled, false);

    const contactConsentBlocked = await requestJson(fixture.baseUrl, "/api/agent/os/provider/source-consents", {
      method: "POST",
      headers: authHeaders(approvalAdminLogin.token),
      body: JSON.stringify({
        sourceName: "Bad consent",
        sourceCategory: "public_procurement",
        authorizedBy: "Agent OS Provider Admin",
        acknowledgement: true,
        contactAllowed: true,
      }),
    });
    assert.equal(contactConsentBlocked.response.status, 400);
    assert.match(contactConsentBlocked.payload.error, /cannot approve contact/i);

    const providerProcurementConsent = await assertOk(fixture.baseUrl, "/api/agent/os/provider/source-consents", {
      method: "POST",
      headers: authHeaders(approvalAdminLogin.token),
      body: JSON.stringify({
        today: "2026-05-28",
        sourceName: "Approved procurement sources",
        sourceCategory: "public_procurement",
        connectorIds: ["public_procurement_search"],
        authorizedBy: "Agent OS Provider Admin",
        acknowledgement: true,
      }),
    });
    assert.equal(providerProcurementConsent.providerSourceConsent.status, "consent_recorded");
    assert.equal(providerProcurementConsent.providerSourceConsent.externalContactApproved, false);

    const providerPublicWebConsent = await assertOk(fixture.baseUrl, "/api/agent/os/provider/source-consents", {
      method: "POST",
      headers: authHeaders(approvalAdminLogin.token),
      body: JSON.stringify({
        today: "2026-05-28",
        sourceName: "Approved public search sources",
        sourceCategory: "public_job_board",
        connectorIds: ["public_web_search"],
        authorizedBy: "Agent OS Provider Admin",
        acknowledgement: true,
      }),
    });
    assert.equal(providerPublicWebConsent.providerSourceConsent.autoSaveApproved, false);

    const forceLiveScheduleBlocked = await requestJson(fixture.baseUrl, "/api/agent/os/provider/daily-schedule", {
      method: "POST",
      headers: authHeaders(approvalAdminLogin.token),
      body: JSON.stringify({
        sourceCategories: ["public_procurement"],
        reviewer: "Agent OS Provider Admin",
        acknowledgement: true,
        executionEnabled: true,
      }),
    });
    assert.equal(forceLiveScheduleBlocked.response.status, 400);
    assert.match(forceLiveScheduleBlocked.payload.error, /cannot enable live execution/i);

    const providerDailySchedule = await assertOk(fixture.baseUrl, "/api/agent/os/provider/daily-schedule", {
      method: "POST",
      headers: authHeaders(approvalAdminLogin.token),
      body: JSON.stringify({
        today: "2026-05-28",
        sourceCategories: ["public_procurement", "public_job_board", "social_private_group"],
        startTimeLocal: "06:00",
        timezone: "America/Los_Angeles",
        reviewer: "Agent OS Provider Admin",
        acknowledgement: true,
      }),
    });
    assert.equal(providerDailySchedule.providerDailySchedule.mode, "agent_leads_daily_provider_schedule_v14");
    assert.equal(providerDailySchedule.providerDailySchedule.safeForCron, true);
    assert.equal(providerDailySchedule.providerDailySchedule.providerExecutionEnabled, false);

    const providerLiveReadiness = await assertOk(fixture.baseUrl, "/api/agent/os/provider/live-readiness?today=2026-05-28", {
      headers: authHeaders(approvalAdminLogin.token),
    });
    assert.equal(providerLiveReadiness.providerLiveReadiness.mode, "agent_leads_live_provider_readiness_v14");
    assert.equal(providerLiveReadiness.providerLiveReadiness.status, "locked");
    assert.equal(providerLiveReadiness.providerLiveReadiness.counts.ready >= 2, true);
    assert.equal(providerLiveReadiness.providerLiveReadiness.executionEnabled, false);
    assert.equal(providerLiveReadiness.providerLiveReadiness.liveNetworkRequestsEnabled, false);

    await assertOk(fixture.baseUrl, "/api/settings/company", {
      method: "PATCH",
      headers: authHeaders(approvalAdminLogin.token),
      body: JSON.stringify({
        apexAgentAutomationPolicy: {
          publicLeadProviderSettings: {
            providerId: "approved_public_search",
            mode: "live_locked",
            dailyBudget: 12,
            maxResultsPerRun: 2,
            enabledConnectorIds: ["public_web_search", "public_procurement_search"],
            geographyControls: { serviceAreas: ["Salem"] },
            tradeScope: { trades: ["concrete"] },
            reviewRules: { requireHumanOpen: true, dedupeBeforeImport: true, minFitScoreForReview: 40 },
          },
        },
      }),
    });

    const providerBoundaryApprovedForLiveProcurement = await assertOk(fixture.baseUrl, "/api/agent/os/provider/live-approval", {
      method: "POST",
      headers: authHeaders(approvalAdminLogin.token),
      body: JSON.stringify({
        decision: "approve_boundary",
        providerId: "approved_public_search",
        connectorIds: ["public_procurement_search"],
        acknowledgement: true,
        note: "Approve live public procurement boundary.",
      }),
    });
    assert.equal(providerBoundaryApprovedForLiveProcurement.providerApprovalDecision.executionEnabled, false);

    const mockLiveProcurementSource = await startMockPublicSource({
      body: "<html><head><title>City bids</title></head><body><a href=\"/bid-42\">BID-2026-42 sidewalk replacement concrete RFP</a></body></html>",
    });
    try {
      const liveProcurementConnection = await assertOk(fixture.baseUrl, "/api/agent/os/provider/connection-metadata", {
        method: "POST",
        headers: authHeaders(approvalAdminLogin.token),
        body: JSON.stringify({
          today: "2026-05-28",
          providerName: "Mock live procurement source",
          sourceCategory: "public_procurement",
          connectorId: "public_procurement_search",
          sourceUrl: `${mockLiveProcurementSource.url}/bids`,
          reviewedBy: "Agent OS Provider Admin",
          acknowledgement: true,
        }),
      });
      assert.equal(liveProcurementConnection.providerConnectionMetadata.sourceUrl, `${mockLiveProcurementSource.url}/bids`);

      const liveProcurementConfig = await assertOk(fixture.baseUrl, "/api/agent/os/provider/procurement-feed-adapter/configs", {
        method: "POST",
        headers: authHeaders(approvalAdminLogin.token),
        body: JSON.stringify({
          today: "2026-05-28",
          endpointName: "Mock live procurement source",
          endpointUrl: `${mockLiveProcurementSource.url}/bids`,
          responseFormat: "json_feed",
          reviewedBy: "Agent OS Provider Admin",
          acknowledgement: true,
        }),
      });
      const liveProcurementForceBlocked = await requestJson(fixture.baseUrl, "/api/agent/os/provider/live-procurement-public-adapter/run", {
        method: "POST",
        headers: authHeaders(approvalAdminLogin.token),
        body: JSON.stringify({
          today: "2026-05-28",
          configId: liveProcurementConfig.procurementFeedAdapterConfig.id,
          sourceUrl: `${mockLiveProcurementSource.url}/bids`,
          executionEnabled: true,
        }),
      });
      assert.equal(liveProcurementForceBlocked.response.status, 400);
      assert.match(liveProcurementForceBlocked.payload.error, /cannot force live procurement/i);

      const liveProcurementRunResponse = await requestJson(fixture.baseUrl, "/api/agent/os/provider/live-procurement-public-adapter/run", {
        method: "POST",
        headers: authHeaders(approvalAdminLogin.token),
        body: JSON.stringify({
          today: "2026-05-28",
          configId: liveProcurementConfig.procurementFeedAdapterConfig.id,
          sourceUrl: `${mockLiveProcurementSource.url}/bids`,
          query: "Salem concrete procurement",
        }),
      });
      assert.equal(liveProcurementRunResponse.response.status, 201, JSON.stringify(liveProcurementRunResponse.payload?.liveProcurementPublicAdapterExecution?.blockedReasons || liveProcurementRunResponse.payload));
      const liveProcurementRun = liveProcurementRunResponse.payload;
      assert.equal(liveProcurementRun.liveProcurementPublicAdapterExecution.mode, "agent_leads_live_procurement_public_adapter_v15");
      assert.equal(liveProcurementRun.liveProcurementPublicAdapterExecution.status, "review_queue_prepared");
      assert.equal(liveProcurementRun.liveProcurementPublicAdapterExecution.externalNetworkRequestAttempted, true);
      assert.equal(liveProcurementRun.liveProcurementPublicAdapterExecution.reviewQueue.count, 1);
      assert.equal(liveProcurementRun.liveProcurementPublicAdapterExecution.reviewQueue.rows[0].canAutoSave, false);
      assert.equal(liveProcurementRun.liveProcurementPublicAdapterExecution.externalActionsLocked, true);
      assert.equal(mockLiveProcurementSource.requests.length, 1);

      const liveProcurementDuplicateBlocked = await requestJson(fixture.baseUrl, "/api/agent/os/provider/live-procurement-public-adapter/run", {
        method: "POST",
        headers: authHeaders(approvalAdminLogin.token),
        body: JSON.stringify({
          today: "2026-05-28",
          configId: liveProcurementConfig.procurementFeedAdapterConfig.id,
          sourceUrl: `${mockLiveProcurementSource.url}/bids`,
          query: "Salem concrete procurement",
        }),
      });
      assert.equal(liveProcurementDuplicateBlocked.response.status, 409);
      assert.match(liveProcurementDuplicateBlocked.payload.liveProcurementPublicAdapterExecution.blockedReasons.join(" "), /Duplicate/i);

      const dailyLiveProcurementForceBlocked = await requestJson(fixture.baseUrl, "/api/agent/os/provider/live-procurement-public-adapter/daily", {
        method: "POST",
        headers: authHeaders(approvalAdminLogin.token),
        body: JSON.stringify({
          today: "2026-05-28",
          executionEnabled: true,
        }),
      });
      assert.equal(dailyLiveProcurementForceBlocked.response.status, 400);
      assert.match(dailyLiveProcurementForceBlocked.payload.error, /cannot force daily live procurement/i);

      const dailyLiveProcurementRunResponse = await requestJson(fixture.baseUrl, "/api/agent/os/provider/live-procurement-public-adapter/daily", {
        method: "POST",
        headers: authHeaders(approvalAdminLogin.token),
        body: JSON.stringify({
          today: "2026-05-28",
          query: "Salem daily concrete procurement",
        }),
      });
      assert.equal(dailyLiveProcurementRunResponse.response.status, 201, JSON.stringify(dailyLiveProcurementRunResponse.payload?.dailyLiveProcurementPublicAdapterExecution?.blockedReasons || dailyLiveProcurementRunResponse.payload));
      const dailyLiveProcurementRun = dailyLiveProcurementRunResponse.payload.dailyLiveProcurementPublicAdapterExecution;
      assert.equal(dailyLiveProcurementRun.mode, "agent_leads_daily_live_procurement_public_adapter_v16");
      assert.equal(dailyLiveProcurementRun.status, "review_queue_prepared");
      assert.equal(dailyLiveProcurementRun.safeForCron, true);
      assert.equal(dailyLiveProcurementRun.externalActionsLocked, true);
      assert.equal(dailyLiveProcurementRun.reviewQueue.count, 1);
      assert.equal(dailyLiveProcurementRun.liveProcurementPublicAdapterExecution.mode, "agent_leads_live_procurement_public_adapter_v15");
      assert.equal(mockLiveProcurementSource.requests.length, 2);

      const dailyLiveProcurementDuplicateBlocked = await requestJson(fixture.baseUrl, "/api/agent/os/provider/live-procurement-public-adapter/daily", {
        method: "POST",
        headers: authHeaders(approvalAdminLogin.token),
        body: JSON.stringify({
          today: "2026-05-28",
          query: "Salem daily concrete procurement",
        }),
      });
      assert.equal(dailyLiveProcurementDuplicateBlocked.response.status, 409);
      assert.match(dailyLiveProcurementDuplicateBlocked.payload.dailyLiveProcurementPublicAdapterExecution.blockedReasons.join(" "), /Duplicate|schedule run limit/i);
      assert.equal(mockLiveProcurementSource.requests.length, 2);
    } finally {
      await mockLiveProcurementSource.stop();
    }

    const providerCompliancePacket = await assertOk(fixture.baseUrl, "/api/agent/os/provider/compliance-packet", {
      headers: authHeaders(approvalAdminLogin.token),
    });
    assert.equal(providerCompliancePacket.providerCompliancePacket.approvedBoundaryCount >= 1, true);
    assert.equal(providerCompliancePacket.providerCompliancePacket.externalActionsLocked, true);

    const providerMonitoringSnapshot = await assertOk(fixture.baseUrl, "/api/agent/os/provider/monitoring-snapshot?today=2026-05-28", {
      headers: authHeaders(approvalAdminLogin.token),
    });
    assert.equal(providerMonitoringSnapshot.providerMonitoringSnapshot.counts.platformBoundaries >= 1, true);
    assert.equal(providerMonitoringSnapshot.providerMonitoringSnapshot.liveNetworkRequestsEnabled, false);

    const allSourceCoverage = await assertOk(fixture.baseUrl, "/api/agent/os/provider/source-adapter-coverage?today=2026-05-28", {
      headers: authHeaders(approvalAdminLogin.token),
    });
    assert.equal(allSourceCoverage.allSourceAdapterCoverage.mode, "agent_leads_all_source_adapter_coverage_v17");
    assert.equal(allSourceCoverage.allSourceAdapterCoverage.status, "complete_review_first_coverage");
    assert.equal(allSourceCoverage.allSourceAdapterCoverage.externalActionsLocked, true);
    assert.equal(allSourceCoverage.allSourceAdapterCoverage.connectorCoverage.some((row) => row.id === "public_social_search" && row.officialApiHarnessImplemented), true);
    assert.equal(allSourceCoverage.allSourceAdapterCoverage.privateSourceCoverage.every((row) => row.loginAutomationEnabled === false), true);

    const opsLiveApprovalBlocked = await requestJson(fixture.baseUrl, "/api/agent/os/provider/live-approval", {
      headers: authHeaders(adminLogin.token),
    });
    assert.equal(opsLiveApprovalBlocked.response.status, 403);

    const providerApprovalPacket = await assertOk(fixture.baseUrl, "/api/agent/os/provider/live-approval", {
      headers: authHeaders(approvalAdminLogin.token),
    });
    assert.equal(providerApprovalPacket.providerApprovalPacket.version, "v6");
    assert.equal(providerApprovalPacket.providerApprovalPacket.executionContract.executionEnabled, false);
    assert.equal(providerApprovalPacket.providerApprovalPacket.auditView.sandboxTestCount >= 1, true);
    assert.equal(providerApprovalPacket.providerApprovalPacket.prerequisites.status, "ready_for_boundary_approval");

    const directLiveEnableBlocked = await requestJson(fixture.baseUrl, "/api/agent/os/provider/live-approval", {
      method: "POST",
      headers: authHeaders(approvalAdminLogin.token),
      body: JSON.stringify({
        decision: "approve_boundary",
        providerId: "approved_public_search",
        connectorIds: ["public_web_search"],
        acknowledgement: true,
        executionEnabled: true,
      }),
    });
    assert.equal(directLiveEnableBlocked.response.status, 400);
    assert.match(directLiveEnableBlocked.payload.error, /cannot be enabled/i);

    const providerBoundaryApproved = await assertOk(fixture.baseUrl, "/api/agent/os/provider/live-approval", {
      method: "POST",
      headers: authHeaders(approvalAdminLogin.token),
      body: JSON.stringify({
        decision: "approve_boundary",
        providerId: "approved_public_search",
        connectorIds: ["public_web_search"],
        acknowledgement: true,
        note: "Boundary only.",
      }),
    });
    assert.equal(providerBoundaryApproved.providerApprovalDecision.status, "boundary_approved");
    assert.equal(providerBoundaryApproved.providerApprovalDecision.executionEnabled, false);
    assert.equal(providerBoundaryApproved.providerApprovalPacket.approvalStatus, "boundary_approved");

    const officialApiAdapters = await assertOk(fixture.baseUrl, "/api/agent/os/provider/official-api-adapters?today=2026-05-28", {
      headers: authHeaders(approvalAdminLogin.token),
    });
    assert.equal(officialApiAdapters.officialProviderApiAdapterContract.id, "agent_leads_official_provider_api_adapter_contract_v12");
    assert.equal(officialApiAdapters.officialProviderApiAdapterContract.adapters.some((adapter) => adapter.id === "official_procurement_feed_api_sandbox"), true);

    const officialApiSecretBlocked = await requestJson(fixture.baseUrl, "/api/agent/os/provider/official-api-adapter-harness", {
      method: "POST",
      headers: authHeaders(approvalAdminLogin.token),
      body: JSON.stringify({
        today: "2026-05-28",
        adapterId: "official_procurement_feed_api_sandbox",
        query: "Salem concrete bid",
        apiKey: "do-not-store",
      }),
    });
    assert.equal(officialApiSecretBlocked.response.status, 400);
    assert.match(officialApiSecretBlocked.payload.error, /raw secrets/i);

    const officialApiHarness = await assertOk(fixture.baseUrl, "/api/agent/os/provider/official-api-adapter-harness", {
      method: "POST",
      headers: authHeaders(approvalAdminLogin.token),
      body: JSON.stringify({
        today: "2026-05-28",
        adapterId: "official_procurement_feed_api_sandbox",
        query: "Salem concrete sidewalk bid",
        connectorIds: ["public_procurement_search"],
        mockProviderResponse: {
          results: [{
            id: "OFFICIAL-API-SERVER-1",
            title: "Sidewalk RFP from official API sandbox",
            snippet: "Server-side sandbox provider API result.",
            fitScore: 81,
          }],
        },
      }),
    });
    assert.equal(officialApiHarness.officialProviderApiAdapterExecution.mode, "agent_leads_official_provider_api_adapter_harness_v12");
    assert.equal(officialApiHarness.officialProviderApiAdapterExecution.status, "review_queue_prepared");
    assert.equal(officialApiHarness.officialProviderApiAdapterExecution.executionEnabled, false);
    assert.equal(officialApiHarness.officialProviderApiAdapterExecution.liveNetworkRequestsEnabled, false);
    assert.equal(officialApiHarness.officialProviderApiAdapterExecution.reviewQueue.count, 1);
    assert.equal(officialApiHarness.providerMonitoringSnapshot.counts.adapterInvocations >= 1, true);

    const officialApiDuplicateBlocked = await requestJson(fixture.baseUrl, "/api/agent/os/provider/official-api-adapter-harness", {
      method: "POST",
      headers: authHeaders(approvalAdminLogin.token),
      body: JSON.stringify({
        today: "2026-05-28",
        adapterId: "official_procurement_feed_api_sandbox",
        query: "Salem concrete sidewalk bid",
        connectorIds: ["public_procurement_search"],
      }),
    });
    assert.equal(officialApiDuplicateBlocked.response.status, 409);
    assert.match(officialApiDuplicateBlocked.payload.officialProviderApiAdapterExecution.blockedReasons.join(" "), /Duplicate/i);

    const procurementConfigSecretBlocked = await requestJson(fixture.baseUrl, "/api/agent/os/provider/procurement-feed-adapter/configs", {
      method: "POST",
      headers: authHeaders(approvalAdminLogin.token),
      body: JSON.stringify({
        endpointName: "Bad procurement feed",
        reviewedBy: "Agent OS Provider Admin",
        acknowledgement: true,
        token: "do-not-store",
      }),
    });
    assert.equal(procurementConfigSecretBlocked.response.status, 400);
    assert.match(procurementConfigSecretBlocked.payload.error, /references only/i);

    const procurementConfig = await assertOk(fixture.baseUrl, "/api/agent/os/provider/procurement-feed-adapter/configs", {
      method: "POST",
      headers: authHeaders(approvalAdminLogin.token),
      body: JSON.stringify({
        today: "2026-05-28",
        endpointName: "Approved city procurement fixture",
        endpointUrl: "https://city.example/procurement/feed",
        responseFormat: "json_feed",
        reviewedBy: "Agent OS Provider Admin",
        acknowledgement: true,
      }),
    });
    assert.equal(procurementConfig.procurementFeedAdapterConfig.status, "fixture_ready");
    assert.equal(procurementConfig.procurementFeedAdapterConfig.executionEnabled, false);
    assert.equal(procurementConfig.procurementFeedAdapterContract.id, "agent_leads_procurement_feed_adapter_contract_v13");

    const procurementAdapter = await assertOk(fixture.baseUrl, "/api/agent/os/provider/procurement-feed-adapter", {
      headers: authHeaders(approvalAdminLogin.token),
    });
    assert.equal(procurementAdapter.procurementFeedAdapterContract.status, "fixture_ready");
    assert.equal(procurementAdapter.procurementFeedAdapterConfigs.length >= 1, true);

    const procurementRun = await assertOk(fixture.baseUrl, "/api/agent/os/provider/procurement-feed-adapter/run", {
      method: "POST",
      headers: authHeaders(approvalAdminLogin.token),
      body: JSON.stringify({
        today: "2026-05-28",
        configId: procurementConfig.procurementFeedAdapterConfig.id,
        query: "Salem concrete procurement fixture",
        fixtureResponse: {
          results: [{
            id: "PROCUREMENT-SERVER-1",
            title: "City sidewalk replacement procurement",
            agency: "City of Salem",
            projectNumber: "BID-2026-42",
            sourceUrl: "https://city.example/procurement/bid-42",
            snippet: "Fixture-backed procurement feed result.",
            fitScore: 83,
          }],
        },
      }),
    });
    assert.equal(procurementRun.procurementFeedAdapterExecution.mode, "agent_leads_procurement_feed_adapter_v13");
    assert.equal(procurementRun.procurementFeedAdapterExecution.status, "review_queue_prepared");
    assert.equal(procurementRun.procurementFeedAdapterExecution.executionEnabled, false);
    assert.equal(procurementRun.procurementFeedAdapterExecution.liveNetworkRequestsEnabled, false);
    assert.equal(procurementRun.procurementFeedAdapterExecution.reviewQueue.count, 1);
    assert.equal(procurementRun.providerMonitoringSnapshot.counts.adapterInvocations >= 1, true);

    const procurementDuplicateBlocked = await requestJson(fixture.baseUrl, "/api/agent/os/provider/procurement-feed-adapter/run", {
      method: "POST",
      headers: authHeaders(approvalAdminLogin.token),
      body: JSON.stringify({
        today: "2026-05-28",
        configId: procurementConfig.procurementFeedAdapterConfig.id,
        query: "Salem concrete procurement fixture",
      }),
    });
    assert.equal(procurementDuplicateBlocked.response.status, 409);
    assert.match(procurementDuplicateBlocked.payload.procurementFeedAdapterExecution.blockedReasons.join(" "), /Duplicate/i);

    await assertOk(fixture.baseUrl, "/api/settings/company", {
      method: "PATCH",
      headers: authHeaders(approvalAdminLogin.token),
      body: JSON.stringify({
        apexAgentAutomationPolicy: {
          publicLeadProviderSettings: {
            providerId: "approved_public_search",
            mode: "live_locked",
            dailyBudget: 1,
            maxResultsPerRun: 2,
            enabledConnectorIds: ["public_procurement_search"],
            geographyControls: { serviceAreas: ["Salem"] },
            tradeScope: { trades: ["concrete"] },
            reviewRules: { requireHumanOpen: true, dedupeBeforeImport: true },
          },
        },
      }),
    });
    const providerBoundaryApprovedForLivePublic = await assertOk(fixture.baseUrl, "/api/agent/os/provider/live-approval", {
      method: "POST",
      headers: authHeaders(approvalAdminLogin.token),
      body: JSON.stringify({
        decision: "approve_boundary",
        providerId: "approved_public_search",
        connectorIds: ["public_procurement_search"],
        acknowledgement: true,
        note: "Approve public no-login provider boundary.",
      }),
    });
    assert.equal(providerBoundaryApprovedForLivePublic.providerApprovalDecision.status, "boundary_approved");

    const directLivePublicBlocked = await requestJson(fixture.baseUrl, "/api/agent/os/provider/live-public-execution", {
      method: "POST",
      headers: authHeaders(approvalAdminLogin.token),
      body: JSON.stringify({
        today: "2026-05-29",
        connectorIds: ["public_procurement_search"],
        forceLive: true,
      }),
    });
    assert.equal(directLivePublicBlocked.response.status, 400);
    assert.match(directLivePublicBlocked.payload.error, /Direct API/i);

    const livePublicExecution = await assertOk(fixture.baseUrl, "/api/agent/os/provider/live-public-execution", {
      method: "POST",
      headers: authHeaders(approvalAdminLogin.token),
      body: JSON.stringify({
        today: "2026-05-29",
        connectorIds: ["public_procurement_search"],
      }),
    });
    assert.equal(livePublicExecution.providerLivePublicExecution.mode, "agent_leads_live_public_provider_execution_v8");
    assert.equal(livePublicExecution.providerLivePublicExecution.status, "review_queue_prepared");
    assert.equal(livePublicExecution.providerLivePublicExecution.livePublicExecutionEnabled, true);
    assert.equal(livePublicExecution.providerLivePublicExecution.externalNetworkRequestAttempted, false);
    assert.equal(livePublicExecution.providerLivePublicExecution.reviewQueue.count >= 1, true);

    const reviewQueueDecision = await assertOk(fixture.baseUrl, "/api/agent/os/provider/review-queue-decisions", {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify({
        providerResultId: livePublicExecution.providerLivePublicExecution.reviewQueue.rows[0].providerResultId,
        providerAttemptId: livePublicExecution.providerLivePublicExecution.reviewQueue.rows[0].providerAttemptId,
        decision: "draft_found_opportunity",
      }),
    });
    assert.equal(reviewQueueDecision.providerReviewQueueDecision.canAutoSave, false);
    assert.equal(reviewQueueDecision.providerReviewQueueDecision.savedRecordId, "");
    assert.equal(reviewQueueDecision.providerReviewLearningSignal.learningSignalType, "accepted_found_opportunity");
    assert.equal(reviewQueueDecision.providerReviewLearningSignal.canAutoSave, false);
    assert.equal(reviewQueueDecision.sourceQualitySnapshot.count >= 1, true);
    assert.equal(reviewQueueDecision.dailyReviewWorkflow.mode, "agent_leads_daily_review_workflow_v21");
    assert.equal(reviewQueueDecision.dailyReviewWorkflow.counts.accepted >= 1, true);
    assert.equal(reviewQueueDecision.dailyReviewWorkflow.leadAutoSaveEnabled, false);

    const bootstrapBeforeReviewDraft = await assertOk(fixture.baseUrl, "/api/bootstrap", {
      headers: authHeaders(approvalAdminLogin.token),
    });
    const leadCountBeforeReviewDraft = bootstrapBeforeReviewDraft.leads.length;
    const reviewQueueDraft = await assertOk(fixture.baseUrl, "/api/agent/os/provider/review-queue-draft-opportunity", {
      method: "POST",
      headers: authHeaders(approvalAdminLogin.token),
      body: JSON.stringify({
        today: "2026-05-29",
        providerResultId: livePublicExecution.providerLivePublicExecution.reviewQueue.rows[0].providerResultId,
        acknowledgement: true,
      }),
    });
    assert.equal(reviewQueueDraft.providerReviewFoundOpportunityDraft.mode, "agent_leads_review_row_found_opportunity_draft_v38");
    assert.equal(reviewQueueDraft.providerReviewFoundOpportunityDraft.leadCreated, false);
    assert.equal(reviewQueueDraft.providerReviewFoundOpportunityDraft.canAutoSaveLead, false);
    assert.equal(reviewQueueDraft.providerReviewFoundOpportunityDraft.customerContactEnabled, false);
    assert.ok(reviewQueueDraft.createdOpportunityId);
    const savedReviewOpportunity = reviewQueueDraft.foundOpportunities.find((opportunity) => opportunity.id === reviewQueueDraft.createdOpportunityId);
    assert.equal(savedReviewOpportunity.humanReviewStatus, "needs_review");
    assert.equal(savedReviewOpportunity.convertedLeadId, "");
    assert.equal(reviewQueueDraft.leads.length, leadCountBeforeReviewDraft);

    const localCompletionReadiness = await assertOk(fixture.baseUrl, "/api/agent/os/provider/local-completion-readiness?today=2026-05-29", {
      headers: authHeaders(approvalAdminLogin.token),
    });
    assert.equal(localCompletionReadiness.localCompletionReadiness.mode, "agent_leads_local_completion_readiness_v39");
    assert.equal(localCompletionReadiness.localCompletionReadiness.localCompletionStatus, "complete_review_first_local");
    assert.equal(localCompletionReadiness.localCompletionReadiness.localImplementationPercent, 100);
    assert.equal(localCompletionReadiness.localCompletionReadiness.readyForProductionAutonomy, false);
    assert.equal(localCompletionReadiness.localCompletionReadiness.externalActionLocks.customerContactEnabled, false);
    assert.equal(localCompletionReadiness.localCompletionReadiness.externalActionLocks.leadAutoSaveEnabled, false);

    const productionReadinessNoGo = await assertOk(fixture.baseUrl, "/api/agent/os/provider/production-readiness?today=2026-05-29", {
      headers: authHeaders(approvalAdminLogin.token),
    });
    assert.equal(productionReadinessNoGo.productionReadinessGate.mode, "agent_leads_production_readiness_gate_v40");
    assert.equal(productionReadinessNoGo.productionReadinessGate.productionLaunchStatus, "no_go");
    assert.equal(productionReadinessNoGo.productionReadinessGate.readyForProductionAutonomy, false);

    const productionEvidenceSecretBlocked = await requestJson(fixture.baseUrl, "/api/agent/os/provider/production-readiness-evidence", {
      method: "POST",
      headers: authHeaders(approvalAdminLogin.token),
      body: JSON.stringify({
        today: "2026-05-29",
        operatorName: "Agent OS Provider Admin",
        acknowledgement: true,
        password: "do-not-store",
      }),
    });
    assert.equal(productionEvidenceSecretBlocked.response.status, 400);
    assert.match(productionEvidenceSecretBlocked.payload.error, /rejected/i);

    const productionReadinessEvidence = await assertOk(fixture.baseUrl, "/api/agent/os/provider/production-readiness-evidence", {
      method: "POST",
      headers: authHeaders(approvalAdminLogin.token),
      body: JSON.stringify({
        today: "2026-05-29",
        operatorName: "Agent OS Provider Admin",
        environmentLabel: "Founder-supported production review",
        targetUrl: "https://app.example.com",
        completedCheckIds: [
          "verify_leads",
          "verify_agent_learning",
          "verify_agent_os_console",
          "verify_roles",
          "verify_auth",
          "verify_server",
          "verify_estimates",
          "build",
          "diff_check",
          "verify_backup",
          "verify_restore",
          "production_auth_smoke_readiness",
          "verify_monitoring",
          "verify_claims",
          "pilot_rehearsal",
          "support_intake_ready",
          "incident_rollback_ready",
          "legal_claims_reviewed",
        ],
        commandSummary: "Release evidence recorded from verified command output.",
        acknowledgement: true,
      }),
    });
    assert.equal(productionReadinessEvidence.productionReadinessEvidence.mode, "agent_leads_production_readiness_evidence_v40");
    assert.equal(productionReadinessEvidence.productionReadinessGate.productionLaunchStatus, "ready_for_founder_supported_production_review");
    assert.equal(productionReadinessEvidence.productionReadinessGate.readyForFounderSupportedProduction, true);
    assert.equal(productionReadinessEvidence.productionReadinessGate.readyForWiderPublicLaunch, false);
    assert.equal(productionReadinessEvidence.productionReadinessGate.readyForProductionAutonomy, false);
    assert.equal(productionReadinessEvidence.productionReadinessGate.externalActionLocks.customerContactEnabled, false);

    const reviewQueueDraftAutoSaveBlocked = await requestJson(fixture.baseUrl, "/api/agent/os/provider/review-queue-draft-opportunity", {
      method: "POST",
      headers: authHeaders(approvalAdminLogin.token),
      body: JSON.stringify({
        today: "2026-05-29",
        providerResultId: livePublicExecution.providerLivePublicExecution.reviewQueue.rows[0].providerResultId,
        acknowledgement: true,
        saveLead: true,
      }),
    });
    assert.equal(reviewQueueDraftAutoSaveBlocked.response.status, 400);
    assert.match(reviewQueueDraftAutoSaveBlocked.payload.error, /cannot save leads/i);

    const reviewQueueAutoSaveBlocked = await requestJson(fixture.baseUrl, "/api/agent/os/provider/review-queue-decisions", {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify({
        providerResultId: livePublicExecution.providerLivePublicExecution.reviewQueue.rows[0].providerResultId,
        decision: "draft_found_opportunity",
        autoSave: true,
      }),
    });
    assert.equal(reviewQueueAutoSaveBlocked.response.status, 400);
    assert.match(reviewQueueAutoSaveBlocked.payload.error, /cannot save leads/i);

    const duplicateOrBudgetLivePublicBlocked = await requestJson(fixture.baseUrl, "/api/agent/os/provider/live-public-execution", {
      method: "POST",
      headers: authHeaders(approvalAdminLogin.token),
      body: JSON.stringify({
        today: "2026-05-29",
        connectorIds: ["public_procurement_search"],
      }),
    });
    assert.equal(duplicateOrBudgetLivePublicBlocked.response.status, 409);
    assert.match(duplicateOrBudgetLivePublicBlocked.payload.providerLivePublicExecution.blockedReasons.join(" "), /budget|Duplicate/i);

    const mockPublicSource = await startMockPublicSource({
      body: "<html><head><title>City bids</title></head><body><a href=\"/sidewalk-rfp\">Concrete sidewalk RFP</a><a href=\"/flatwork-repair\">Flatwork repair bid</a></body></html>",
    });
    try {
      const directPublicAdapterBlocked = await requestJson(fixture.baseUrl, "/api/agent/os/provider/public-source-adapters", {
        method: "POST",
        headers: authHeaders(approvalAdminLogin.token),
        body: JSON.stringify({
          today: "2026-05-31",
          connectorIds: ["public_procurement_search"],
          forceLive: true,
        }),
      });
      assert.equal(directPublicAdapterBlocked.response.status, 400);
      assert.match(directPublicAdapterBlocked.payload.error, /Direct API/i);

      const publicSourceAdapterExecution = await assertOk(fixture.baseUrl, "/api/agent/os/provider/public-source-adapters", {
        method: "POST",
        headers: authHeaders(approvalAdminLogin.token),
        body: JSON.stringify({
          today: "2026-05-31",
          connectorIds: ["public_procurement_search"],
          runnerCards: [{
            id: "server-public-source-v9",
            type: "public_source_runner",
            targetKind: "search_profile",
            targetId: "OSP-V9-SERVER",
            title: "City public bids",
            query: "Salem concrete public bid opportunity",
            sourceConnector: { id: "public_web", label: "Public web", category: "public", posture: "review_card" },
            controls: { trades: ["concrete"], serviceAreas: ["Salem"], excludedKeywords: [] },
            searchUrls: [{ label: "Mock city bid page", url: `${mockPublicSource.url}/bids` }],
          }],
        }),
      });
      assert.equal(publicSourceAdapterExecution.providerPublicSourceAdapterExecution.mode, "agent_leads_public_source_provider_adapters_v9");
      assert.equal(publicSourceAdapterExecution.providerPublicSourceAdapterExecution.status, "review_queue_prepared");
      assert.equal(publicSourceAdapterExecution.providerPublicSourceAdapterExecution.externalNetworkRequestAttempted, true);
      assert.equal(publicSourceAdapterExecution.providerPublicSourceAdapterExecution.reviewQueue.count >= 1, true);
      assert.equal(mockPublicSource.requests.length, 1);

      const duplicatePublicSourceBlocked = await requestJson(fixture.baseUrl, "/api/agent/os/provider/public-source-adapters", {
        method: "POST",
        headers: authHeaders(approvalAdminLogin.token),
        body: JSON.stringify({
          today: "2026-05-31",
          connectorIds: ["public_procurement_search"],
          runnerCards: [{
            id: "server-public-source-v9",
            type: "public_source_runner",
            targetKind: "search_profile",
            targetId: "OSP-V9-SERVER",
            title: "City public bids",
            query: "Salem concrete public bid opportunity",
            sourceConnector: { id: "public_web", label: "Public web", category: "public", posture: "review_card" },
            controls: { trades: ["concrete"], serviceAreas: ["Salem"], excludedKeywords: [] },
            searchUrls: [{ label: "Mock city bid page", url: `${mockPublicSource.url}/bids` }],
          }],
        }),
      });
      assert.equal(duplicatePublicSourceBlocked.response.status, 409);
      assert.match(duplicatePublicSourceBlocked.payload.providerPublicSourceAdapterExecution.blockedReasons.join(" "), /budget|Duplicate/i);

      const dailyJobFinderForceBlocked = await requestJson(fixture.baseUrl, "/api/agent/os/provider/daily-job-finder/run", {
        method: "POST",
        headers: authHeaders(approvalAdminLogin.token),
        body: JSON.stringify({
          today: "2026-06-01",
          connectorIds: ["public_procurement_search"],
          forceLive: true,
        }),
      });
      assert.equal(dailyJobFinderForceBlocked.response.status, 400);
      assert.match(dailyJobFinderForceBlocked.payload.error, /cannot force daily job finder/i);

      const dailyJobFinderRun = await assertOk(fixture.baseUrl, "/api/agent/os/provider/daily-job-finder/run", {
        method: "POST",
        headers: authHeaders(approvalAdminLogin.token),
        body: JSON.stringify({
          today: "2026-06-01",
          connectorIds: ["public_procurement_search"],
          runnerCards: [{
            id: "server-daily-job-finder-v18",
            type: "public_source_runner",
            targetKind: "search_profile",
            targetId: "OSP-V18-SERVER",
            title: "Daily city public bids",
            query: "Salem daily concrete public bid",
            sourceConnector: { id: "public_web", label: "Public web", category: "public", posture: "review_card" },
            controls: { trades: ["concrete"], serviceAreas: ["Salem"], excludedKeywords: [] },
            searchUrls: [{ label: "Mock city daily bid page", url: `${mockPublicSource.url}/daily-bids` }],
          }],
          privateHandoffCards: [{
            id: "server-private-handoff-v18",
            type: "private_source_handoff",
            title: "Private Facebook group",
            sourceConnector: { id: "facebook_private_group", category: "private_social" },
          }],
        }),
      });
      assert.equal(dailyJobFinderRun.dailyJobFinderOrchestrationExecution.mode, "agent_leads_daily_job_finder_orchestration_v18");
      assert.equal(dailyJobFinderRun.dailyJobFinderOrchestrationExecution.status, "review_queue_prepared");
      assert.equal(dailyJobFinderRun.dailyJobFinderOrchestrationExecution.safeForCron, true);
      assert.equal(dailyJobFinderRun.dailyJobFinderOrchestrationExecution.externalActionsLocked, true);
      assert.equal(dailyJobFinderRun.dailyJobFinderOrchestrationExecution.reviewQueue.count >= 1, true);
      assert.equal(dailyJobFinderRun.dailyJobFinderOrchestrationExecution.privateSourceChecklist.count >= 1, true);
      assert.equal(mockPublicSource.requests.length, 2);

      const dailyJobFinderDuplicateBlocked = await requestJson(fixture.baseUrl, "/api/agent/os/provider/daily-job-finder/run", {
        method: "POST",
        headers: authHeaders(approvalAdminLogin.token),
        body: JSON.stringify({
          today: "2026-06-01",
          connectorIds: ["public_procurement_search"],
          runnerCards: [{
            id: "server-daily-job-finder-v18",
            type: "public_source_runner",
            targetKind: "search_profile",
            targetId: "OSP-V18-SERVER",
            title: "Daily city public bids",
            query: "Salem daily concrete public bid",
            sourceConnector: { id: "public_web", label: "Public web", category: "public", posture: "review_card" },
            controls: { trades: ["concrete"], serviceAreas: ["Salem"], excludedKeywords: [] },
            searchUrls: [{ label: "Mock city daily bid page", url: `${mockPublicSource.url}/daily-bids` }],
          }],
        }),
      });
      assert.equal(dailyJobFinderDuplicateBlocked.response.status, 409);
      assert.match(dailyJobFinderDuplicateBlocked.payload.dailyJobFinderOrchestrationExecution.blockedReasons.join(" "), /already ran today/i);

      await assertOk(fixture.baseUrl, "/api/settings/company", {
        method: "PATCH",
        headers: authHeaders(approvalAdminLogin.token),
        body: JSON.stringify({
          apexAgentAutomationPolicy: {
            publicLeadProviderSettings: {
              providerId: "approved_public_search",
              mode: "live_locked",
              dailyBudget: 4,
              enabledConnectorIds: ["public_procurement_search"],
              geographyControls: { serviceAreas: ["Salem"] },
              tradeScope: { trades: ["concrete"] },
              dailyJobFinderAutopilot: {
                enabled: true,
                runTimeLocal: "00:00",
                markets: ["Salem"],
                trades: ["concrete"],
                publicSourceConnectorIds: ["public_procurement_search"],
              },
            },
          },
        }),
      });
      await assertOk(fixture.baseUrl, "/api/lead-sources", {
        method: "POST",
        headers: authHeaders(approvalAdminLogin.token),
        body: JSON.stringify({
          name: "Agent OS autopilot source URL",
          type: "City/county/school bid page",
          serviceArea: "Salem Oregon",
          tradeFocus: "Concrete",
          checkCadence: "Daily",
          nextCheckAt: "2026-06-02",
          url: `${mockPublicSource.url}/autopilot-source`,
        }),
      });
      const dailyJobFinderAutopilotRun = await assertOk(fixture.baseUrl, "/api/agent/os/provider/daily-job-finder/autopilot", {
        method: "POST",
        headers: authHeaders(approvalAdminLogin.token),
        body: JSON.stringify({ today: "2026-06-02" }),
      });
      assert.equal(dailyJobFinderAutopilotRun.dailyJobFinderAutopilotRun.mode, "agent_leads_daily_job_finder_autopilot_v21");
      assert.equal(dailyJobFinderAutopilotRun.dailyJobFinderAutopilotRun.status, "review_inbox_prepared");
      assert.equal(dailyJobFinderAutopilotRun.dailyJobFinderAutopilotRun.reviewInbox.count >= 1, true);
      assert.equal(dailyJobFinderAutopilotRun.task.actionId, "opportunity_search_prep");
      assert.equal(dailyJobFinderAutopilotRun.run.status, "succeeded");
      assert.equal(dailyJobFinderAutopilotRun.run.output.reviewInbox.count >= 1, true);
      assert.equal(dailyJobFinderAutopilotRun.dailyJobFinderAutopilotRun.leadAutoSaveEnabled, false);
      assert.equal(dailyJobFinderAutopilotRun.dailyJobFinderAutopilotRun.externalActionsLocked, true);
      assert.equal(mockPublicSource.requests.length >= 3, true);

      const dailyJobFinderAutopilotDuplicateBlocked = await requestJson(fixture.baseUrl, "/api/agent/os/provider/daily-job-finder/autopilot", {
        method: "POST",
        headers: authHeaders(approvalAdminLogin.token),
        body: JSON.stringify({ today: "2026-06-02" }),
      });
      assert.equal(dailyJobFinderAutopilotDuplicateBlocked.response.status, 409);
      assert.match(dailyJobFinderAutopilotDuplicateBlocked.payload.dailyJobFinderAutopilotRun.blockedReasons.join(" "), /already ran today/i);
    } finally {
      await mockPublicSource.stop();
    }

    await assertOk(fixture.baseUrl, "/api/settings/company", {
      method: "PATCH",
      headers: authHeaders(approvalAdminLogin.token),
      body: JSON.stringify({
        apexAgentAutomationPolicy: {
          publicLeadProviderSettings: {
            providerId: "approved_public_search",
            mode: "live_locked",
            dailyBudget: 2,
            enabledConnectorIds: ["public_plan_room_search"],
            geographyControls: { serviceAreas: ["Salem"] },
            tradeScope: { trades: ["concrete"] },
            credentialBoundary: { mode: "oauth_reference_only", credentialRef: "credref-plan-room" },
          },
        },
      }),
    });
    const loginConnectorLivePublicBlocked = await requestJson(fixture.baseUrl, "/api/agent/os/provider/live-public-execution", {
      method: "POST",
      headers: authHeaders(approvalAdminLogin.token),
      body: JSON.stringify({
        today: "2026-05-30",
        connectorIds: ["public_plan_room_search"],
      }),
    });
    assert.equal(loginConnectorLivePublicBlocked.response.status, 409);
    assert.match(loginConnectorLivePublicBlocked.payload.providerLivePublicExecution.blockedReasons.join(" "), /no-login/i);

    const providerBoundaryRevoked = await assertOk(fixture.baseUrl, "/api/agent/os/provider/live-approval", {
      method: "POST",
      headers: authHeaders(approvalAdminLogin.token),
      body: JSON.stringify({
        decision: "revoke",
        providerId: "approved_public_search",
        connectorIds: ["public_plan_room_search"],
        note: "Pause the boundary.",
      }),
    });
    assert.equal(providerBoundaryRevoked.providerApprovalDecision.status, "revoked");
    assert.equal(providerBoundaryRevoked.providerApprovalPacket.executionContract.liveSearchEnabled, false);

    const missingApprovalLivePublicBlocked = await requestJson(fixture.baseUrl, "/api/agent/os/provider/live-public-execution", {
      method: "POST",
      headers: authHeaders(approvalAdminLogin.token),
      body: JSON.stringify({
        today: "2026-05-31",
        connectorIds: ["public_plan_room_search"],
      }),
    });
    assert.equal(missingApprovalLivePublicBlocked.response.status, 409);
    assert.match(missingApprovalLivePublicBlocked.payload.providerLivePublicExecution.blockedReasons.join(" "), /approval/i);

    const unselectedConnectorBlocked = await requestJson(fixture.baseUrl, "/api/agent/os/provider/live-approval", {
      method: "POST",
      headers: authHeaders(approvalAdminLogin.token),
      body: JSON.stringify({
        decision: "approve_boundary",
        providerId: "approved_public_search",
        connectorIds: ["public_classifieds_search"],
        acknowledgement: true,
      }),
    });
    assert.equal(unselectedConnectorBlocked.response.status, 400);
    assert.match(unselectedConnectorBlocked.payload.error, /not selected/i);

    await assertOk(fixture.baseUrl, "/api/settings/company", {
      method: "PATCH",
      headers: authHeaders(approvalAdminLogin.token),
      body: JSON.stringify({
        apexAgentAutomationPolicy: {
          publicLeadProviderSettings: {
            providerId: "approved_public_search",
            mode: "disabled",
            dailyBudget: 0,
            enabledConnectorIds: ["public_web_search"],
            geographyControls: { serviceAreas: ["Salem"] },
            tradeScope: { trades: ["concrete"] },
          },
        },
      }),
    });
    const missingReadinessBlocked = await requestJson(fixture.baseUrl, "/api/agent/os/provider/live-approval", {
      method: "POST",
      headers: authHeaders(approvalAdminLogin.token),
      body: JSON.stringify({
        decision: "approve_boundary",
        providerId: "approved_public_search",
        connectorIds: ["public_web_search"],
        acknowledgement: true,
      }),
    });
    assert.equal(missingReadinessBlocked.response.status, 400);
    assert.match(missingReadinessBlocked.payload.error, /disabled|budget/i);

    await assertOk(fixture.baseUrl, "/api/settings/company", {
      method: "PATCH",
      headers: authHeaders(approvalAdminLogin.token),
      body: JSON.stringify({
        apexAgentAutomationPolicy: {
          publicLeadProviderSettings: {
            providerId: "approved_public_search",
            mode: "test",
            dailyBudget: 12,
            enabledConnectorIds: ["public_plan_room_search"],
            geographyControls: { serviceAreas: ["Salem"] },
            tradeScope: { trades: ["concrete"] },
            credentialBoundary: { mode: "none" },
          },
        },
      }),
    });
    const missingCredentialBlocked = await requestJson(fixture.baseUrl, "/api/agent/os/provider/live-approval", {
      method: "POST",
      headers: authHeaders(approvalAdminLogin.token),
      body: JSON.stringify({
        decision: "approve_boundary",
        providerId: "approved_public_search",
        connectorIds: ["public_plan_room_search"],
        acknowledgement: true,
      }),
    });
    assert.equal(missingCredentialBlocked.response.status, 400);
    assert.match(missingCredentialBlocked.payload.error, /Credential/i);

    const fieldUser = createUserRecord({
      id: "U-AGENT-OS-PROVIDER-FIELD",
      email: "agent-os-provider-field@apexhq.test",
      password: "apexdemo123",
      name: "Agent OS Provider Field",
      role: "Employee",
    });
    insertUser(fixture.sqliteFile, fieldUser);
    const fieldLogin = await login(fixture.baseUrl, {
      email: fieldUser.email,
      password: "apexdemo123",
    });
    const fieldHealthBlocked = await requestJson(fixture.baseUrl, "/api/agent/os/provider/health", {
      headers: authHeaders(fieldLogin.token),
    });
    assert.equal(fieldHealthBlocked.response.status, 403);
    const fieldLiveApprovalBlocked = await requestJson(fixture.baseUrl, "/api/agent/os/provider/live-approval", {
      headers: authHeaders(fieldLogin.token),
    });
    assert.equal(fieldLiveApprovalBlocked.response.status, 403);
    const fieldAdapterRunnerBlocked = await requestJson(fixture.baseUrl, "/api/agent/os/provider/adapter-runner", {
      method: "POST",
      headers: authHeaders(fieldLogin.token),
      body: JSON.stringify({ today: "2026-05-27" }),
    });
    assert.equal(fieldAdapterRunnerBlocked.response.status, 403);
    const fieldLivePublicBlocked = await requestJson(fixture.baseUrl, "/api/agent/os/provider/live-public-execution", {
      method: "POST",
      headers: authHeaders(fieldLogin.token),
      body: JSON.stringify({ today: "2026-05-27", connectorIds: ["public_procurement_search"] }),
    });
    assert.equal(fieldLivePublicBlocked.response.status, 403);
    const fieldPublicSourceAdapterBlocked = await requestJson(fixture.baseUrl, "/api/agent/os/provider/public-source-adapters", {
      method: "POST",
      headers: authHeaders(fieldLogin.token),
      body: JSON.stringify({ today: "2026-05-27", connectorIds: ["public_procurement_search"] }),
    });
    assert.equal(fieldPublicSourceAdapterBlocked.response.status, 403);
    const fieldPrivateSourceAuthBlocked = await requestJson(fixture.baseUrl, "/api/agent/os/provider/private-source-authorizations", {
      method: "POST",
      headers: authHeaders(fieldLogin.token),
      body: JSON.stringify({ sourceName: "Private group", sourceAdapterId: "facebook_private_group", authorizedBy: "Field", acknowledgement: true }),
    });
    assert.equal(fieldPrivateSourceAuthBlocked.response.status, 403);
    const fieldPrivateEvidenceBlocked = await requestJson(fixture.baseUrl, "/api/agent/os/provider/private-evidence-intake", {
      method: "POST",
      headers: authHeaders(fieldLogin.token),
      body: JSON.stringify({ sourceAdapterId: "facebook_private_group", evidenceText: "Concrete lead" }),
    });
    assert.equal(fieldPrivateEvidenceBlocked.response.status, 403);
    const fieldCredentialHandoffBlocked = await requestJson(fixture.baseUrl, "/api/agent/os/provider/credential-handoffs", {
      method: "POST",
      headers: authHeaders(fieldLogin.token),
      body: JSON.stringify({ sourceAdapterId: "facebook_private_group", credentialRef: "credref_private_source_1" }),
    });
    assert.equal(fieldCredentialHandoffBlocked.response.status, 403);
    const fieldLiveReadinessBlocked = await requestJson(fixture.baseUrl, "/api/agent/os/provider/live-readiness", {
      headers: authHeaders(fieldLogin.token),
    });
    assert.equal(fieldLiveReadinessBlocked.response.status, 403);
    const fieldConnectionMetadataBlocked = await requestJson(fixture.baseUrl, "/api/agent/os/provider/connection-metadata", {
      method: "POST",
      headers: authHeaders(fieldLogin.token),
      body: JSON.stringify({ providerName: "Provider", connectorId: "public_procurement_search", reviewedBy: "Field", acknowledgement: true }),
    });
    assert.equal(fieldConnectionMetadataBlocked.response.status, 403);
    const fieldSourceConsentBlocked = await requestJson(fixture.baseUrl, "/api/agent/os/provider/source-consents", {
      method: "POST",
      headers: authHeaders(fieldLogin.token),
      body: JSON.stringify({ sourceName: "Public procurement", sourceCategory: "public_procurement", authorizedBy: "Field", acknowledgement: true }),
    });
    assert.equal(fieldSourceConsentBlocked.response.status, 403);
    const fieldDailyScheduleBlocked = await requestJson(fixture.baseUrl, "/api/agent/os/provider/daily-schedule", {
      method: "POST",
      headers: authHeaders(fieldLogin.token),
      body: JSON.stringify({ sourceCategories: ["public_procurement"], reviewer: "Field", acknowledgement: true }),
    });
    assert.equal(fieldDailyScheduleBlocked.response.status, 403);
    const fieldSmokeEvidenceBlocked = await requestJson(fixture.baseUrl, "/api/agent/os/provider/smoke-evidence", {
      method: "POST",
      headers: authHeaders(fieldLogin.token),
      body: JSON.stringify({ today: "2026-05-28", status: "passed", acknowledgement: true }),
    });
    assert.equal(fieldSmokeEvidenceBlocked.response.status, 403);
    const fieldPlatformBoundaryBlocked = await requestJson(fixture.baseUrl, "/api/agent/os/provider/platform-boundaries", {
      method: "POST",
      headers: authHeaders(fieldLogin.token),
      body: JSON.stringify({ providerName: "Approved API", providerType: "approved_search_api", connectorIds: ["public_web_search"], reviewedBy: "Field", sourceTermsStatus: "approved", robotsStatus: "allowed", acknowledgement: true }),
    });
    assert.equal(fieldPlatformBoundaryBlocked.response.status, 403);
    const fieldComplianceBlocked = await requestJson(fixture.baseUrl, "/api/agent/os/provider/compliance-packet", {
      headers: authHeaders(fieldLogin.token),
    });
    assert.equal(fieldComplianceBlocked.response.status, 403);
    const fieldOfficialApiHarnessBlocked = await requestJson(fixture.baseUrl, "/api/agent/os/provider/official-api-adapter-harness", {
      method: "POST",
      headers: authHeaders(fieldLogin.token),
      body: JSON.stringify({ today: "2026-05-28", adapterId: "official_procurement_feed_api_sandbox", query: "Salem concrete bid" }),
    });
    assert.equal(fieldOfficialApiHarnessBlocked.response.status, 403);
    const fieldSourceCoverageBlocked = await requestJson(fixture.baseUrl, "/api/agent/os/provider/source-adapter-coverage?today=2026-05-28", {
      headers: authHeaders(fieldLogin.token),
    });
    assert.equal(fieldSourceCoverageBlocked.response.status, 403);
    const fieldDailyPublicRunEvidenceBlocked = await requestJson(fixture.baseUrl, "/api/agent/os/provider/daily-public-run-evidence?today=2026-05-28", {
      headers: authHeaders(fieldLogin.token),
    });
    assert.equal(fieldDailyPublicRunEvidenceBlocked.response.status, 403);
    const fieldDailyPublicRunApprovalBlocked = await requestJson(fixture.baseUrl, "/api/agent/os/provider/daily-public-run-approval", {
      method: "POST",
      headers: authHeaders(fieldLogin.token),
      body: JSON.stringify({ today: "2026-05-28", acknowledgement: true }),
    });
    assert.equal(fieldDailyPublicRunApprovalBlocked.response.status, 403);
    const fieldProcurementRunBlocked = await requestJson(fixture.baseUrl, "/api/agent/os/provider/procurement-feed-adapter/run", {
      method: "POST",
      headers: authHeaders(fieldLogin.token),
      body: JSON.stringify({ today: "2026-05-28", query: "Salem concrete bid" }),
    });
    assert.equal(fieldProcurementRunBlocked.response.status, 403);
    const fieldLiveProcurementRunBlocked = await requestJson(fixture.baseUrl, "/api/agent/os/provider/live-procurement-public-adapter/run", {
      method: "POST",
      headers: authHeaders(fieldLogin.token),
      body: JSON.stringify({ today: "2026-05-28", query: "Salem concrete bid" }),
    });
    assert.equal(fieldLiveProcurementRunBlocked.response.status, 403);
    const fieldDailyJobFinderBlocked = await requestJson(fixture.baseUrl, "/api/agent/os/provider/daily-job-finder/run", {
      method: "POST",
      headers: authHeaders(fieldLogin.token),
      body: JSON.stringify({ today: "2026-05-28", query: "Salem concrete bid" }),
    });
    assert.equal(fieldDailyJobFinderBlocked.response.status, 403);
    const fieldDailyJobFinderAutopilotBlocked = await requestJson(fixture.baseUrl, "/api/agent/os/provider/daily-job-finder/autopilot", {
      method: "POST",
      headers: authHeaders(fieldLogin.token),
      body: JSON.stringify({ today: "2026-05-28" }),
    });
    assert.equal(fieldDailyJobFinderAutopilotBlocked.response.status, 403);
    const fieldDailyLiveProcurementRunBlocked = await requestJson(fixture.baseUrl, "/api/agent/os/provider/live-procurement-public-adapter/daily", {
      method: "POST",
      headers: authHeaders(fieldLogin.token),
      body: JSON.stringify({ today: "2026-05-28", query: "Salem concrete bid" }),
    });
    assert.equal(fieldDailyLiveProcurementRunBlocked.response.status, 403);

    const scoutDuplicate = await assertOk(fixture.baseUrl, "/api/agent/os/opportunity-search-prep/daily", {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify({ today: "2026-05-27" }),
    });
    assert.equal(scoutDuplicate.dailyOpportunitySearchPrep.queuedCount, 0);
    assert.equal(scoutDuplicate.dailyOpportunitySearchPrep.skippedCount, 1);

    const scoutExecuted = await assertOk(fixture.baseUrl, `/api/agent/os/runs/${scoutQueued.dailyOpportunitySearchPrep.queued[0].runId}/execute`, {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify({}),
    });
    assert.equal(scoutExecuted.run.status, "succeeded");
    assert.equal(scoutExecuted.run.output.executionPlan.mode, "daily_agent_leads_scout_execution_v6");
    assert.equal(scoutExecuted.agentProposal.proposalType, "opportunity-search-prep");
    assert.match(scoutExecuted.agentProposal.redactedResponsePreview, /public runner card/i);
    assert.match(scoutExecuted.agentProposal.blockedReasons.join(" "), /No customer email/i);
    assert.match(scoutExecuted.agentProposal.draftPrepSummary[0].fieldPreview[1].currentValue, /No live web browsing/i);

    const queued = await assertOk(fixture.baseUrl, "/api/agent/os/tasks", {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify({
        actionId: "lead_follow_up_draft",
        target: { entityType: "lead", entityId: "LEAD-1", title: "Patio lead" },
        followUpGoal: "Confirm site walk",
      }),
    });
    assert.equal(queued.task.status, "queued");
    assert.equal(queued.run.status, "queued");
    assert.equal(queued.ledger.queuedCount >= 2, true);

    const running = await assertOk(fixture.baseUrl, `/api/agent/os/runs/${queued.run.id}/status`, {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify({ status: "running", message: "Worker claimed run." }),
    });
    assert.equal(running.run.status, "running");
    assert.match(running.run.logs.at(-1).message, /Worker claimed/);

    const statusSucceededBlocked = await requestJson(fixture.baseUrl, `/api/agent/os/runs/${queued.run.id}/status`, {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify({ status: "succeeded", message: "Manual success should be blocked." }),
    });
    assert.equal(statusSucceededBlocked.response.status, 400);
    assert.match(statusSucceededBlocked.payload.error, /Use execute to produce succeeded runs/i);

    const dead = await assertOk(fixture.baseUrl, `/api/agent/os/runs/${queued.run.id}/status`, {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify({ status: "dead_lettered", message: "Retries exhausted." }),
    });
    assert.equal(dead.run.status, "dead_lettered");
    assert.equal(dead.ledger.deadLetterCount, 1);

    const retried = await assertOk(fixture.baseUrl, `/api/agent/os/runs/${queued.run.id}/status`, {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify({ status: "retrying", message: "Office requested retry." }),
    });
    assert.equal(retried.run.status, "retrying");

    const executed = await assertOk(fixture.baseUrl, `/api/agent/os/runs/${queued.run.id}/execute`, {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify({}),
    });
    assert.equal(executed.run.status, "succeeded");
    assert.equal(executed.run.output.mode, "agent_os_internal_draft_packet");
    assert.equal(executed.agentProposal.proposalType, "lead-follow-up");
    assert.match(executed.agentProposal.blockedReasons.join(" "), /No customer email/i);

    const prePourQueued = await assertOk(fixture.baseUrl, "/api/agent/os/tasks", {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify({
        actionId: "pre_pour_review",
        target: { entityType: "prePourChecklist", entityId: "PRE-AGENT-1", title: "Driveway pre-pour" },
      }),
    });
    assert.equal(prePourQueued.task.inputs.prePourChecklistId, "PRE-AGENT-1");
    assert.match(prePourQueued.task.idempotencyKey, /pre_pour_review/i);
    const prePourExecuted = await assertOk(fixture.baseUrl, `/api/agent/os/runs/${prePourQueued.run.id}/execute`, {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify({}),
    });
    assert.equal(prePourExecuted.run.status, "succeeded");
    assert.match(prePourExecuted.agentProposal.draftPrepSummary[0].fieldPreview[1].currentValue, /No checklist completion/);
    assert.match(prePourExecuted.agentProposal.blockedReasons.join(" "), /No bid submission/);

    const externalBlocked = await requestJson(fixture.baseUrl, "/api/agent/os/tasks", {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify({
        actionId: "email_send",
        target: { entityType: "lead", entityId: "LEAD-1" },
      }),
    });
    assert.equal(externalBlocked.response.status, 403);
    assert.match(externalBlocked.payload.error, /live execution requires the normal domain adapter/i);

    const records = agentOsAuditEvents(fixture.sqliteFile);
    const recordedActions = records.map((record) => record.action);
    assert.ok(recordedActions.includes("agent.os.task.queued"));
    assert.ok(recordedActions.includes("agent.os.run.running"));
    assert.ok(recordedActions.includes("agent.os.run.dead_lettered"));
    assert.ok(recordedActions.includes("agent.os.run.retrying"));
    assert.ok(recordedActions.includes("agent.os.run.succeeded"));
    assert.ok(agentProposalAuditEvents(fixture.sqliteFile).some((record) => record.action === "agent.proposal.generated" && /lead-follow-up/.test(record.detail)));
    assert.doesNotMatch(JSON.stringify(records), /apexdemo123/i);
    assert.match(records[0].detail, /No external send/);
  } finally {
    await fixture.stop();
  }
});

test("Agent OS blocks field users from internal task queueing", async () => {
  const fixture = await startServer();

  try {
    setCompanyPackage(fixture.sqliteFile, PACKAGE_IDS.PREMIUM);
    const employeeUser = createUserRecord({
      id: "U-AGENT-OS-EMPLOYEE",
      email: "agent-os-employee@apexhq.test",
      password: "apexdemo123",
      name: "Agent OS Employee",
      role: "Employee",
    });
    insertUser(fixture.sqliteFile, employeeUser);
    const employeeLogin = await login(fixture.baseUrl, {
      email: employeeUser.email,
      password: "apexdemo123",
    });

    const employeeBlocked = await requestJson(fixture.baseUrl, "/api/agent/os/tasks", {
      method: "POST",
      headers: authHeaders(employeeLogin.token),
      body: JSON.stringify({
        actionId: "lead_follow_up_draft",
        target: { entityType: "lead", entityId: "LEAD-1" },
      }),
    });
    assert.equal(employeeBlocked.response.status, 403);
    assert.equal(agentOsAuditEvents(fixture.sqliteFile).length, 0);
  } finally {
    await fixture.stop();
  }
});

test("Agent OS queues selected contractor advisor recommendations through server-side safe task mapping", async () => {
  const fixture = await startServer();

  try {
    setCompanyPackage(fixture.sqliteFile, PACKAGE_IDS.PREMIUM);
    const adminLogin = await login(fixture.baseUrl, {
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
    });

    const queued = await assertOk(fixture.baseUrl, "/api/agent/os/advisor-tasks", {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify({
        recommendation: {
          id: "marketing-lead-sources",
          label: "Rank lead sources by jobs won",
          reason: "Follow up the best visible lead source before buying more attention.",
          moduleId: "leads",
          actionLabel: "Open Leads",
        },
        target: { entityType: "lead", entityId: "L-1047" },
      }),
    });

    assert.equal(queued.advisorTask.actionId, "lead_follow_up_draft");
    assert.equal(queued.task.target.entityId, "L-1047");
    assert.equal(queued.task.inputs.leadId, "L-1047");
    assert.equal(queued.run.status, "queued");
    assert.match(queued.advisorTask.safetyBoundary, /internal Agent OS draft\/prep/i);
    assert.ok(agentOsAuditEvents(fixture.sqliteFile).some((record) => record.action === "agent.os.advisor.task.queued"));

    const invisibleTarget = await requestJson(fixture.baseUrl, "/api/agent/os/advisor-tasks", {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify({
        recommendation: { id: "marketing-lead-sources", label: "Follow up lead", moduleId: "leads" },
        target: { entityType: "lead", entityId: "L-DOES-NOT-EXIST" },
      }),
    });
    assert.equal(invisibleTarget.response.status, 400);
    assert.match(invisibleTarget.payload.error, /visible, company-scoped/i);

    const externalLanguageBlocked = await requestJson(fixture.baseUrl, "/api/agent/os/advisor-tasks", {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify({
        recommendation: { id: "email-send", label: "Send email", moduleId: "communications" },
        target: { entityType: "lead", entityId: "L-1047" },
      }),
    });
    assert.equal(externalLanguageBlocked.response.status, 400);
    assert.match(externalLanguageBlocked.payload.error, /cannot queue/i);
  } finally {
    await fixture.stop();
  }
});

test("Agent OS blocks field users from advisor recommendation task queueing", async () => {
  const fixture = await startServer();

  try {
    setCompanyPackage(fixture.sqliteFile, PACKAGE_IDS.PREMIUM);
    const employeeUser = createUserRecord({
      id: "U-AGENT-OS-ADVISOR-EMPLOYEE",
      email: "agent-os-advisor-employee@apexhq.test",
      password: "apexdemo123",
      name: "Agent OS Advisor Employee",
      role: "Employee",
    });
    insertUser(fixture.sqliteFile, employeeUser);
    const employeeLogin = await login(fixture.baseUrl, {
      email: employeeUser.email,
      password: "apexdemo123",
    });

    const employeeBlocked = await requestJson(fixture.baseUrl, "/api/agent/os/advisor-tasks", {
      method: "POST",
      headers: authHeaders(employeeLogin.token),
      body: JSON.stringify({
        recommendation: { id: "marketing-lead-sources", label: "Follow up lead", moduleId: "leads" },
        target: { entityType: "lead", entityId: "L-1047" },
      }),
    });
    assert.equal(employeeBlocked.response.status, 403);
    assert.equal(agentOsAuditEvents(fixture.sqliteFile).length, 0);
  } finally {
    await fixture.stop();
  }
});

test("Agent OS executes human-confirmed estimate email only after company email gate opt-in", async () => {
  const emailApi = await startMockEmailApi();
  const fixture = await startServer({
    EMAIL_PROVIDER: "resend",
    EMAIL_FROM: "Apex HQ <estimates@example.test>",
    EMAIL_REPLY_TO_DEFAULT: "office@example.test",
    EMAIL_API_KEY: "test-api-key",
    EMAIL_API_URL: emailApi.url,
  });

  try {
    setCompanyPackage(fixture.sqliteFile, PACKAGE_IDS.PREMIUM);
    const adminLogin = await login(fixture.baseUrl, {
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
    });
    const headers = authHeaders(adminLogin.token);
    const bootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", { headers });
    const createdState = await assertOk(fixture.baseUrl, "/api/estimates", {
      method: "POST",
      headers,
      body: JSON.stringify(buildEstimatePayload({
        customerId: bootstrap.customers[0].id,
        leadId: bootstrap.leads[0].id,
      })),
    });
    const estimate = createdState.estimates.find((entry) => entry.title === "Agent Gate Email Proposal");
    assert.ok(estimate, "Expected a created estimate with a customer email.");
    const proposal = {
      proposalId: `agent-email-send:${estimate.id}`,
      proposalType: "estimate-packet-review",
      status: "needs_human_review",
      summary: "Estimate email send gate test",
      sourceModule: "estimates",
      targetEntityType: "estimate",
      targetEntityId: estimate.id,
      requiredApprovals: ["Human review required."],
      blockedReasons: ["No email before external gate confirmation."],
    };

    await assertOk(fixture.baseUrl, "/api/agent-action-proposals/prepare-estimate-send", {
      method: "POST",
      headers,
      body: JSON.stringify({ proposal, estimateId: estimate.id }),
    });

    const blockedBeforeOptIn = await requestJson(fixture.baseUrl, "/api/agent-action-proposals/execute-estimate-send", {
      method: "POST",
      headers,
      body: JSON.stringify({
        proposal,
        estimateId: estimate.id,
        reviewConfirmed: true,
        customerContactConfirmed: true,
        externalGateConfirmed: true,
      }),
    });
    assert.equal(blockedBeforeOptIn.response.status, 403);
    assert.match(blockedBeforeOptIn.payload.error, /not enabled for this company/i);
    assert.equal(emailApi.requests.length, 0);

    await assertOk(fixture.baseUrl, "/api/settings/company", {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        apexAgentAutomationPolicy: {
          externalGateSettings: {
            email_send: {
              enabled: true,
              mode: "human_confirmed",
              allowedWorkflow: "estimate_send",
              testOnly: true,
            },
          },
        },
      }),
    });

    const enabledGate = await assertOk(fixture.baseUrl, "/api/agent/os/external-gates/email_send", { headers });
    assert.equal(enabledGate.externalGate.gate.executionEnabled, true);
    assert.equal(enabledGate.externalGate.gate.allowedWorkflow, "estimate_send");

    const missingConfirmation = await requestJson(fixture.baseUrl, "/api/agent-action-proposals/execute-estimate-send", {
      method: "POST",
      headers,
      body: JSON.stringify({
        proposal,
        estimateId: estimate.id,
        reviewConfirmed: true,
      }),
    });
    assert.equal(missingConfirmation.response.status, 400);
    assert.match(missingConfirmation.payload.error, /customer contact/i);
    assert.equal(emailApi.requests.length, 0);

    const sentState = await assertOk(fixture.baseUrl, "/api/agent-action-proposals/execute-estimate-send", {
      method: "POST",
      headers,
      body: JSON.stringify({
        proposal,
        estimateId: estimate.id,
        reviewConfirmed: true,
        customerContactConfirmed: true,
        externalGateConfirmed: true,
      }),
    });
    assert.equal(emailApi.requests.length, 1);
    assert.equal(sentState.agentEstimateEmailSend.gateId, "email_send");
    assert.equal(sentState.agentEstimateEmailSend.workflowId, "estimate_send");
    assert.equal(sentState.agentEstimateEmailSend.providerMessageId, "msg_agent_gate_123");
    const sentEstimate = sentState.estimates.find((entry) => entry.id === estimate.id);
    assert.equal(sentEstimate.status, "sent");
    assert.ok(sentEstimate.sentAt);

    const duplicate = await requestJson(fixture.baseUrl, "/api/agent-action-proposals/execute-estimate-send", {
      method: "POST",
      headers,
      body: JSON.stringify({
        proposal,
        estimateId: estimate.id,
        reviewConfirmed: true,
        customerContactConfirmed: true,
        externalGateConfirmed: true,
      }),
    });
    assert.equal(duplicate.response.status, 409);
    assert.equal(emailApi.requests.length, 1);

    const records = auditEvents(fixture.sqliteFile);
    assert.ok(records.some((record) => record.action === "agent.os.external.email_send.executed"));
    assert.ok(records.some((record) => record.action === "agent.proposal.email_sent"));
    assert.ok(records.some((record) => record.action === "agent_sent"));
    assert.doesNotMatch(JSON.stringify(records), /test-api-key|apexdemo123/i);
  } finally {
    await fixture.stop();
    await emailApi.stop();
  }
});

test("Communication provider readiness and outbound approval queue stay locked and audited", async () => {
  const fixture = await startServer({
    EMAIL_PROVIDER: "resend",
    EMAIL_FROM: "Apex HQ <estimates@example.test>",
    EMAIL_API_KEY: "test-api-key",
  });

  try {
    setCompanyPackage(fixture.sqliteFile, PACKAGE_IDS.PREMIUM);
    const adminLogin = await login(fixture.baseUrl, {
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
    });
    const headers = authHeaders(adminLogin.token);
    const bootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", { headers });

    const readiness = await assertOk(fixture.baseUrl, "/api/communications/provider-readiness", { headers });
    assert.equal(readiness.communicationProviderReadiness.mode, "communication_provider_readiness_v1");
    assert.equal(readiness.communicationProviderReadiness.externalSendExecutionEnabled, false);
    assert.equal(readiness.communicationProviderReadiness.rows.find((row) => row.channel === "email").providerConfigured, true);
    assert.equal(readiness.communicationProviderReadiness.rows.every((row) => row.canSend === false), true);

    const lead = bootstrap.leads[0];
    const approval = await assertOk(fixture.baseUrl, "/api/communications/outbound-approvals", {
      method: "POST",
      headers,
      body: JSON.stringify({
        channel: "email",
        targetEntityType: "lead",
        targetEntityId: lead.id,
        recipient: "customer@example.test",
        consentSource: "Website estimate request opt-in",
        consentConfirmed: true,
        templateReviewed: true,
        humanReviewConfirmed: true,
        messagePreview: "Hello customer@example.test, here is the reviewed follow-up.",
        idempotencyKey: "communication-approval-1",
      }),
    });
    assert.equal(approval.outboundApproval.status, "queued_locked");
    assert.equal(approval.outboundApproval.canSend, false);
    assert.equal(approval.outboundApproval.externalSendEnabled, false);
    assert.match(approval.outboundApproval.messagePreview, /\[REDACTED_EMAIL\]/);

    const replay = await assertOk(fixture.baseUrl, "/api/communications/outbound-approvals", {
      method: "POST",
      headers,
      body: JSON.stringify({
        channel: "email",
        targetEntityType: "lead",
        targetEntityId: lead.id,
        recipient: "customer@example.test",
        consentSource: "Website estimate request opt-in",
        consentConfirmed: true,
        templateReviewed: true,
        humanReviewConfirmed: true,
        idempotencyKey: "communication-approval-1",
      }),
    });
    assert.equal(replay.idempotentReplay, true);
    assert.equal(replay.outboundApproval.id, approval.outboundApproval.id);

    const executeDenied = await requestJson(fixture.baseUrl, `/api/communications/outbound-approvals/${approval.outboundApproval.id}/execute`, {
      method: "POST",
      headers,
      body: JSON.stringify({ humanReviewConfirmed: true }),
    });
    assert.equal(executeDenied.response.status, 423);
    assert.match(executeDenied.payload.error, /execution is locked/i);

    const suppression = await assertOk(fixture.baseUrl, "/api/communications/suppressions", {
      method: "POST",
      headers,
      body: JSON.stringify({
        channel: "all",
        targetEntityType: "lead",
        targetEntityId: lead.id,
        recipient: "customer@example.test",
        reason: "do_not_contact",
        source: "manual",
        note: "Customer asked customer@example.test for no more outreach.",
        idempotencyKey: "communication-suppression-1",
      }),
    });
    assert.equal(suppression.suppressionRecord.status, "active_locked");
    assert.equal(suppression.suppressionRecord.sendBlocked, true);
    assert.equal(suppression.suppressionRecord.externalSendEnabled, false);
    assert.match(suppression.suppressionRecord.note, /\[REDACTED_EMAIL\]/);
    assert.equal(suppression.communicationProviderReadiness.activeSuppressionCount, 1);

    const suppressionReplay = await assertOk(fixture.baseUrl, "/api/communications/suppressions", {
      method: "POST",
      headers,
      body: JSON.stringify({
        channel: "all",
        recipient: "customer@example.test",
        reason: "do_not_contact",
        idempotencyKey: "communication-suppression-1",
      }),
    });
    assert.equal(suppressionReplay.idempotentReplay, true);
    assert.equal(suppressionReplay.suppressionRecord.id, suppression.suppressionRecord.id);

    const deliveryContract = await assertOk(fixture.baseUrl, `/api/communications/outbound-approvals/${approval.outboundApproval.id}/delivery-attempt-contract`, {
      method: "POST",
      headers,
      body: JSON.stringify({ humanReviewConfirmed: true }),
    });
    assert.equal(deliveryContract.deliveryAttemptContract.status, "blocked_by_suppression_locked");
    assert.equal(deliveryContract.deliveryAttemptContract.providerRequestPrepared, false);
    assert.equal(deliveryContract.deliveryAttemptContract.providerRequestSent, false);
    assert.equal(deliveryContract.deliveryAttemptContract.canSend, false);
    assert.ok(deliveryContract.deliveryAttemptContract.failureClasses.includes("suppressed"));
    assert.ok(deliveryContract.deliveryAttemptContract.failureClasses.includes("missing_adapter"));

    const deliveryContractReplay = await assertOk(fixture.baseUrl, `/api/communications/outbound-approvals/${approval.outboundApproval.id}/delivery-attempt-contract`, {
      method: "POST",
      headers,
      body: JSON.stringify({ humanReviewConfirmed: true }),
    });
    assert.equal(deliveryContractReplay.idempotentReplay, true);
    assert.equal(deliveryContractReplay.deliveryAttemptContract.id, deliveryContract.deliveryAttemptContract.id);

    const records = auditEvents(fixture.sqliteFile);
    assert.equal(records.filter((record) => record.entityType === "communication_outbound_approval").length, 1);
    assert.equal(records.filter((record) => record.entityType === "communication_suppression").length, 1);
    assert.equal(records.filter((record) => record.entityType === "communication_delivery_attempt_contract").length, 1);
    assert.doesNotMatch(JSON.stringify(records), /test-api-key|apexdemo123/i);
  } finally {
    await fixture.stop();
  }
});

test("Communication provider readiness denies unsafe payloads and field users", async () => {
  const fixture = await startServer();

  try {
    const adminLogin = await login(fixture.baseUrl, {
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
    });
    const headers = authHeaders(adminLogin.token);
    const bootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", { headers });
    const lead = bootstrap.leads[0];

    const unsafe = await requestJson(fixture.baseUrl, "/api/communications/outbound-approvals", {
      method: "POST",
      headers,
      body: JSON.stringify({
        channel: "email",
        targetEntityType: "lead",
        targetEntityId: lead.id,
        recipient: "customer@example.test",
        consentConfirmed: true,
        templateReviewed: true,
        humanReviewConfirmed: true,
        apiKey: "do-not-store",
      }),
    });
    assert.equal(unsafe.response.status, 400);

    const fieldUser = createUserRecord({
      id: "U-COMM-PROVIDER-FIELD",
      email: "comm-provider-field@apexhq.test",
      password: "apexdemo123",
      name: "Communication Provider Field User",
      role: "Employee",
    });
    insertUser(fixture.sqliteFile, fieldUser);
    const fieldLogin = await login(fixture.baseUrl, {
      email: fieldUser.email,
      password: "apexdemo123",
    });
    const fieldReadiness = await requestJson(fixture.baseUrl, "/api/communications/provider-readiness", {
      headers: authHeaders(fieldLogin.token),
    });
    assert.equal(fieldReadiness.response.status, 403);
    const fieldQueue = await requestJson(fixture.baseUrl, "/api/communications/outbound-approvals", {
      method: "POST",
      headers: authHeaders(fieldLogin.token),
      body: JSON.stringify({
        channel: "email",
        targetEntityType: "lead",
        targetEntityId: lead.id,
        recipient: "customer@example.test",
      }),
    });
    assert.equal(fieldQueue.response.status, 403);
    const fieldSuppression = await requestJson(fixture.baseUrl, "/api/communications/suppressions", {
      method: "POST",
      headers: authHeaders(fieldLogin.token),
      body: JSON.stringify({
        channel: "email",
        recipient: "customer@example.test",
        reason: "manual_hold",
      }),
    });
    assert.equal(fieldSuppression.response.status, 403);
    const fieldDeliveryContract = await requestJson(fixture.baseUrl, "/api/communications/outbound-approvals/fake-approval/delivery-attempt-contract", {
      method: "POST",
      headers: authHeaders(fieldLogin.token),
      body: JSON.stringify({ humanReviewConfirmed: true }),
    });
    assert.equal(fieldDeliveryContract.response.status, 403);
  } finally {
    await fixture.stop();
  }
});
