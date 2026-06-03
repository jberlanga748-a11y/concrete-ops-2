import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

import { DEFAULT_COMPANY_ID } from "../shared/companyScope.js";
import { createUserRecord } from "./store.js";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createPort() {
  return 18750 + Math.floor(Math.random() * 700);
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
  throw new Error(`Apex OS memory test server did not become ready.\n${serverOutput()}`);
}

async function startServer() {
  const tempDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "apex-os-memory-"));
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

function setOperatorAccess(sqliteFile, email, enabled) {
  const database = new DatabaseSync(sqliteFile);
  try {
    database.prepare("UPDATE users SET operator_access = ? WHERE email = ?").run(enabled ? 1 : 0, email);
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
      user.phone,
      user.status,
      user.companyId,
      user.operatorAccess ? 1 : 0,
      user.createdAt,
      user.updatedAt,
      user.lastLoginAt,
      user.passwordHash,
    );
  } finally {
    database.close();
  }
}

function storedApexOsMemory(sqliteFile, companyId = DEFAULT_COMPANY_ID) {
  const database = new DatabaseSync(sqliteFile);
  try {
    const row = database.prepare(`
      SELECT value FROM company_settings
      WHERE company_id = ? AND key = 'apexOsMemory'
    `).get(companyId);
    return JSON.parse(row?.value || "[]");
  } finally {
    database.close();
  }
}

function storedApexOsApprovalPackets(sqliteFile, companyId = DEFAULT_COMPANY_ID) {
  const database = new DatabaseSync(sqliteFile);
  try {
    const row = database.prepare(`
      SELECT value FROM company_settings
      WHERE company_id = ? AND key = 'apexOsApprovalPackets'
    `).get(companyId);
    return JSON.parse(row?.value || "[]");
  } finally {
    database.close();
  }
}

function storedApexOsExecutionHandoffs(sqliteFile, companyId = DEFAULT_COMPANY_ID) {
  const database = new DatabaseSync(sqliteFile);
  try {
    const row = database.prepare(`
      SELECT value FROM company_settings
      WHERE company_id = ? AND key = 'apexOsExecutionHandoffs'
    `).get(companyId);
    return JSON.parse(row?.value || "[]");
  } finally {
    database.close();
  }
}

function storedApexOsAgentControlRequests(sqliteFile, companyId = DEFAULT_COMPANY_ID) {
  const database = new DatabaseSync(sqliteFile);
  try {
    const row = database.prepare(`
      SELECT value FROM company_settings
      WHERE company_id = ? AND key = 'apexOsAgentControlRequests'
    `).get(companyId);
    return JSON.parse(row?.value || "[]");
  } finally {
    database.close();
  }
}

function auditEvents(sqliteFile) {
  const database = new DatabaseSync(sqliteFile);
  try {
    return database.prepare(`
      SELECT entity_type AS entityType, action, summary
      FROM audit_events
      WHERE entity_type IN ('apexOsMemory', 'apexOsApprovalPacket', 'apexOsExecutionHandoff', 'apexOsAgentControlRequest')
      ORDER BY created_at DESC
    `).all();
  } finally {
    database.close();
  }
}

test("Apex OS memory is operator-only, source-backed, persisted, and audited", async () => {
  const fixture = await startServer();

  try {
    setOperatorAccess(fixture.sqliteFile, "demo.ops@apexhq.app", true);
    const operatorLogin = await login(fixture.baseUrl, {
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
    });
    const adminUser = createUserRecord({
      id: "U-APEX-OS-MEMORY-ADMIN",
      email: "apex-os-memory-admin@apexhq.test",
      password: "apexdemo123",
      name: "Apex OS Memory Admin",
      role: "Administrator",
    });
    insertUser(fixture.sqliteFile, adminUser);
    const adminLogin = await login(fixture.baseUrl, {
      email: adminUser.email,
      password: "apexdemo123",
    });
    const employeeUser = createUserRecord({
      id: "U-APEX-OS-MEMORY-EMPLOYEE",
      email: "apex-os-memory-employee@apexhq.test",
      password: "apexdemo123",
      name: "Apex OS Memory Employee",
      role: "Employee",
    });
    insertUser(fixture.sqliteFile, employeeUser);
    const employeeLogin = await login(fixture.baseUrl, {
      email: employeeUser.email,
      password: "apexdemo123",
    });

    const adminBlocked = await requestJson(fixture.baseUrl, "/api/apex-os/memory", {
      headers: authHeaders(adminLogin.token),
    });
    assert.equal(adminBlocked.response.status, 403);

    const employeeBlocked = await requestJson(fixture.baseUrl, "/api/apex-os/memory", {
      headers: authHeaders(employeeLogin.token),
    });
    assert.equal(employeeBlocked.response.status, 403);
    const adminAskBlocked = await requestJson(fixture.baseUrl, "/api/apex-os/ask", {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify({ question: "What is next?" }),
    });
    assert.equal(adminAskBlocked.response.status, 403);
    const adminBriefingBlocked = await requestJson(fixture.baseUrl, "/api/apex-os/daily-briefing", {
      headers: authHeaders(adminLogin.token),
    });
    assert.equal(adminBriefingBlocked.response.status, 403);
    const adminPacketsBlocked = await requestJson(fixture.baseUrl, "/api/apex-os/approval-packets", {
      headers: authHeaders(adminLogin.token),
    });
    assert.equal(adminPacketsBlocked.response.status, 403);
    const adminHandoffsBlocked = await requestJson(fixture.baseUrl, "/api/apex-os/execution-handoffs", {
      headers: authHeaders(adminLogin.token),
    });
    assert.equal(adminHandoffsBlocked.response.status, 403);
    const adminAgentControlBlocked = await requestJson(fixture.baseUrl, "/api/apex-os/agent-control", {
      headers: authHeaders(adminLogin.token),
    });
    assert.equal(adminAgentControlBlocked.response.status, 403);

    const unsafe = await requestJson(fixture.baseUrl, "/api/apex-os/memory", {
      method: "POST",
      headers: authHeaders(operatorLogin.token),
      body: JSON.stringify({
        title: "Unsafe credential",
        body: "Remember API key sk-test-123456789abc and customer@example.test.",
        sourceLabel: "Bad note",
      }),
    });
    assert.equal(unsafe.response.status, 400);

    const missingSource = await requestJson(fixture.baseUrl, "/api/apex-os/memory", {
      method: "POST",
      headers: authHeaders(operatorLogin.token),
      body: JSON.stringify({
        title: "Missing source",
        body: "This should not become durable without a source label.",
      }),
    });
    assert.equal(missingSource.response.status, 400);

    const uploadedKnowledge = await assertOk(fixture.baseUrl, "/api/apex-os/memory", {
      method: "POST",
      headers: authHeaders(operatorLogin.token),
      body: JSON.stringify({
        category: "Apex HQ app docs",
        title: "Phase 5 upload intake",
        body: "Knowledge Upload Vault text intake starts as suggested until manually reviewed.",
        sourceType: "knowledge-upload",
        sourceLabel: "phase-5-upload.md",
        sourceUri: "local-upload:phase-5-upload.md",
        status: "approved",
        reviewNote: "Summary pending - manual review required.",
      }),
    });
    assert.equal(uploadedKnowledge.apexOsMemoryEntry.category, "app-docs");
    assert.equal(uploadedKnowledge.apexOsMemoryEntry.status, "suggested");
    assert.equal(uploadedKnowledge.apexOsMemoryEntry.approvedBy, "");
    assert.equal(storedApexOsMemory(fixture.sqliteFile)[0].sourceType, "knowledge-upload");

    const duplicateKnowledge = await requestJson(fixture.baseUrl, "/api/apex-os/memory", {
      method: "POST",
      headers: authHeaders(operatorLogin.token),
      body: JSON.stringify({
        category: "Apex HQ app docs",
        title: "Phase 5 upload intake",
        body: "A duplicate active knowledge upload should be blocked before manual review.",
        sourceType: "knowledge-upload",
        sourceLabel: "phase-5-upload.md",
        sourceUri: "local-upload:phase-5-upload.md",
        status: "suggested",
      }),
    });
    assert.equal(duplicateKnowledge.response.status, 409);

    const created = await assertOk(fixture.baseUrl, "/api/apex-os/memory", {
      method: "POST",
      headers: authHeaders(operatorLogin.token),
      body: JSON.stringify({
        category: "decision",
        title: "Apex OS private command center",
        body: "Apex OS is John's private operating center for Apex HQ.",
        sourceType: "document",
        sourceLabel: "Apex OS master plan",
        sourceUri: "docs/APEX_HQ_APEX_OS_COMMAND_CENTER_MASTER_PLAN.md",
        status: "suggested",
      }),
    });

    assert.equal(created.apexOsMemoryEntry.status, "suggested");
    assert.equal(created.companySettings.apexOsMemory[0].title, "Apex OS private command center");
    assert.equal(storedApexOsMemory(fixture.sqliteFile)[0].sourceLabel, "Apex OS master plan");

    const duplicate = await requestJson(fixture.baseUrl, "/api/apex-os/memory", {
      method: "POST",
      headers: authHeaders(operatorLogin.token),
      body: JSON.stringify({
        category: "decision",
        title: "Apex OS private command center",
        body: "This should be blocked until the active source/title row is archived.",
        sourceType: "document",
        sourceLabel: "Apex OS master plan",
        sourceUri: "docs/APEX_HQ_APEX_OS_COMMAND_CENTER_MASTER_PLAN.md",
        status: "suggested",
      }),
    });
    assert.equal(duplicate.response.status, 409);

    const approved = await assertOk(fixture.baseUrl, `/api/apex-os/memory/${created.apexOsMemoryEntry.id}`, {
      method: "PATCH",
      headers: authHeaders(operatorLogin.token),
      body: JSON.stringify({ status: "approved", reviewNote: "Approved for source-backed Apex OS context." }),
    });
    assert.equal(approved.apexOsMemoryEntry.status, "approved");
    assert.equal(approved.apexOsMemoryEntry.approvedBy, operatorLogin.user.id);

    const listed = await assertOk(fixture.baseUrl, "/api/apex-os/memory", {
      headers: authHeaders(operatorLogin.token),
    });
    assert.equal(listed.summary.approved, 1);
    assert.equal(listed.apexOsMemory[0].title, "Apex OS private command center");

    const asked = await assertOk(fixture.baseUrl, "/api/apex-os/ask", {
      method: "POST",
      headers: authHeaders(operatorLogin.token),
      body: JSON.stringify({ question: "Can Apex deploy and send customers messages today?", contextScope: "docs-memory" }),
    });
    assert.equal(asked.answer.providerConfigured, false);
    assert.equal(asked.answer.mode, "local-source-backed");
    assert.equal(asked.context.contextScope, "docs-memory");
    assert.equal(asked.context.memoryCount, 1);
    assert.equal(asked.answer.sourceLabels.some((label) => label === "Apex OS master plan"), true);
    assert.equal(asked.answer.approvalWarnings.length >= 2, true);
    assert.equal(asked.evidenceUsed[0].rank, 1);
    assert.equal(asked.evidenceUsed.some((row) => row.sourceLabel === "Apex OS master plan"), true);

    const briefing = await assertOk(fixture.baseUrl, "/api/apex-os/daily-briefing", {
      headers: authHeaders(operatorLogin.token),
    });
    assert.equal(briefing.dailyBriefing.operatorName, operatorLogin.user.name);
    assert.equal(briefing.dailyBriefing.briefingRows.some((row) => row.id === "memory-context" && row.status === "1 approved"), true);
    assert.equal(briefing.dailyBriefing.alerts.some((row) => row.id === "no-execution" && row.status === "Locked"), true);
    assert.equal(briefing.dailyBriefing.history.status, "Baseline needed");
    assert.equal(briefing.dailyBriefing.changedSincePreviousRows.some((row) => row.id === "briefing-baseline-needed"), true);
    assert.equal(briefing.dailyBriefing.sourceLabels.includes("AGENTS.md field-role protection rules"), true);

    const savedBriefing = await assertOk(fixture.baseUrl, "/api/apex-os/daily-briefing/history", {
      method: "POST",
      headers: authHeaders(operatorLogin.token),
    });
    assert.equal(savedBriefing.apexOsDailyBriefingSnapshot.status, savedBriefing.dailyBriefing.status);
    assert.equal(savedBriefing.dailyBriefing.history.status, "History active");
    assert.equal(savedBriefing.dailyBriefing.history.snapshotCount, 1);
    assert.equal(savedBriefing.dailyBriefing.historyRows.length, 1);
    assert.equal(savedBriefing.dailyBriefing.externalAlertsEnabled, false);
    assert.equal(savedBriefing.dailyBriefing.canExecute, false);

    const adminBriefingSaveBlocked = await requestJson(fixture.baseUrl, "/api/apex-os/daily-briefing/history", {
      method: "POST",
      headers: authHeaders(adminLogin.token),
    });
    assert.equal(adminBriefingSaveBlocked.response.status, 403);

    const buildAwareness = await assertOk(fixture.baseUrl, "/api/apex-os/build-awareness", {
      headers: authHeaders(operatorLogin.token),
    });
    assert.equal(buildAwareness.buildAwareness.executionLocked, true);
    assert.equal(buildAwareness.buildAwareness.canExecute, false);
    assert.equal(buildAwareness.buildAwareness.fieldDataIncluded, false);
    assert.equal(Array.isArray(buildAwareness.buildAwareness.changedFiles), true);
    assert.equal(buildAwareness.buildAwareness.sourceLinks.some((row) => row.path === "docs/APEX_HQ_LIVING_FINISH_PLAN.md"), true);

    const adminBuildAwarenessBlocked = await requestJson(fixture.baseUrl, "/api/apex-os/build-awareness", {
      headers: authHeaders(adminLogin.token),
    });
    assert.equal(adminBuildAwarenessBlocked.response.status, 403);

    const unsafePacket = await requestJson(fixture.baseUrl, "/api/apex-os/approval-packets", {
      method: "POST",
      headers: authHeaders(operatorLogin.token),
      body: JSON.stringify({
        title: "Unsafe approval packet",
        action: "Use provider API key sk-test-123456789abc for a speech provider.",
        sourceLabel: "Unsafe note",
      }),
    });
    assert.equal(unsafePacket.response.status, 400);

    const executedStatusPacket = await requestJson(fixture.baseUrl, "/api/apex-os/approval-packets", {
      method: "POST",
      headers: authHeaders(operatorLogin.token),
      body: JSON.stringify({
        title: "Executed status is blocked",
        action: "Execute now.",
        status: "executed",
        sourceLabel: "Manual approval note",
      }),
    });
    assert.equal(executedStatusPacket.response.status, 400);

    const incompleteApprovedPacket = await requestJson(fixture.baseUrl, "/api/apex-os/approval-packets", {
      method: "POST",
      headers: authHeaders(operatorLogin.token),
      body: JSON.stringify({
        title: "Incomplete approval is blocked",
        action: "Deploy now.",
        status: "approved",
        sourceLabel: "Manual approval note",
      }),
    });
    assert.equal(incompleteApprovedPacket.response.status, 400);

    const incompleteReadyPacket = await requestJson(fixture.baseUrl, "/api/apex-os/approval-packets", {
      method: "POST",
      headers: authHeaders(operatorLogin.token),
      body: JSON.stringify({
        title: "Incomplete ready packet",
        action: "Deploy the Apex OS package.",
        status: "ready",
        sourceLabel: "Release Desk",
      }),
    });
    assert.equal(incompleteReadyPacket.response.status, 400);

    const createdPacket = await assertOk(fixture.baseUrl, "/api/apex-os/approval-packets", {
      method: "POST",
      headers: authHeaders(operatorLogin.token),
      body: JSON.stringify({
        title: "Deploy Apex OS Control Room",
        action: "Deploy the private Apex OS Control Room package after release gates pass.",
        requestedActionCategory: "deploy",
        riskLevel: "high",
        status: "draft",
        reason: "John wants Apex OS available in production after validation.",
        affectedScope: "Production web app release only.",
        validationPlan: "Run focused Apex OS tests, verify roles, build, backup, restore, hosted smoke, and production auth smoke.",
        rollbackPlan: "Rollback to the previous Fly release if hosted smoke fails.",
        exactApprovalPhrase: "BACKUP_FIRST_PRODUCTION_RELEASE_APPROVED",
        sourceLabel: "docs/APEX_HQ_LIVING_FINISH_PLAN.md",
      }),
    });
    assert.equal(createdPacket.apexOsApprovalPacket.status, "draft");
    assert.equal(createdPacket.apexOsApprovalPacket.readyToReview, true);
    assert.equal(createdPacket.apexOsApprovalPacket.executionLocked, true);
    assert.equal(createdPacket.apexOsApprovalPacket.canExecute, false);
    assert.equal(createdPacket.apexOsApprovalPacket.riskAssessment.band, "high");
    assert.equal(storedApexOsApprovalPackets(fixture.sqliteFile)[0].title, "Deploy Apex OS Control Room");

    const readyPacket = await assertOk(fixture.baseUrl, `/api/apex-os/approval-packets/${createdPacket.apexOsApprovalPacket.id}`, {
      method: "PATCH",
      headers: authHeaders(operatorLogin.token),
      body: JSON.stringify({ status: "ready" }),
    });
    assert.equal(readyPacket.apexOsApprovalPacket.status, "ready");

    const wrongApprovalPhrase = await requestJson(fixture.baseUrl, `/api/apex-os/approval-packets/${createdPacket.apexOsApprovalPacket.id}`, {
      method: "PATCH",
      headers: authHeaders(operatorLogin.token),
      body: JSON.stringify({ status: "approved", approvalPhraseConfirmation: "WRONG_PHRASE" }),
    });
    assert.equal(wrongApprovalPhrase.response.status, 400);

    const approvedPacket = await assertOk(fixture.baseUrl, `/api/apex-os/approval-packets/${createdPacket.apexOsApprovalPacket.id}`, {
      method: "PATCH",
      headers: authHeaders(operatorLogin.token),
      body: JSON.stringify({
        status: "approved",
        approvalPhraseConfirmation: "BACKUP_FIRST_PRODUCTION_RELEASE_APPROVED",
        decisionNote: "Josh approved the packet for review record only.",
      }),
    });
    assert.equal(approvedPacket.apexOsApprovalPacket.status, "approved");
    assert.equal(approvedPacket.apexOsApprovalPacket.approvedBy, operatorLogin.user.id);
    assert.equal(approvedPacket.apexOsApprovalPacket.executionLocked, true);
    assert.equal(approvedPacket.apexOsApprovalPacket.canExecute, false);

    const rejectedPacket = await assertOk(fixture.baseUrl, "/api/apex-os/approval-packets", {
      method: "POST",
      headers: authHeaders(operatorLogin.token),
      body: JSON.stringify({
        title: "Reject provider setup",
        action: "Reject provider setup until credentials and compliance are ready.",
        requestedActionCategory: "provider-connection",
        riskLevel: "high",
        status: "rejected",
        sourceLabel: "Provider setup review",
        decisionNote: "Provider setup is not approved yet.",
      }),
    });
    assert.equal(rejectedPacket.apexOsApprovalPacket.status, "rejected");
    assert.equal(rejectedPacket.apexOsApprovalPacket.rejectedBy, operatorLogin.user.id);
    assert.equal(rejectedPacket.apexOsApprovalPacket.executionLocked, true);

    const deferredPacket = await assertOk(fixture.baseUrl, "/api/apex-os/approval-packets", {
      method: "POST",
      headers: authHeaders(operatorLogin.token),
      body: JSON.stringify({
        title: "Defer billing action",
        action: "Defer live billing setup until payment provider testing is approved.",
        requestedActionCategory: "billing-payment",
        riskLevel: "critical",
        status: "deferred",
        sourceLabel: "Billing review",
        decisionNote: "Billing remains parked.",
      }),
    });
    assert.equal(deferredPacket.apexOsApprovalPacket.status, "deferred");
    assert.equal(deferredPacket.apexOsApprovalPacket.deferredBy, operatorLogin.user.id);
    assert.equal(deferredPacket.apexOsApprovalPacket.executionLocked, true);

    const listedPackets = await assertOk(fixture.baseUrl, "/api/apex-os/approval-packets", {
      headers: authHeaders(operatorLogin.token),
    });
    assert.equal(listedPackets.summary.approved, 1);
    assert.equal(listedPackets.summary.rejected, 1);
    assert.equal(listedPackets.summary.deferred, 1);
    assert.equal(listedPackets.apexOsApprovalPackets.some((packet) => packet.title === "Deploy Apex OS Control Room" && packet.status === "approved" && packet.executionLocked === true), true);

    const unsafeHandoff = await requestJson(fixture.baseUrl, "/api/apex-os/execution-handoffs", {
      method: "POST",
      headers: authHeaders(operatorLogin.token),
      body: JSON.stringify({
        title: "Unsafe handoff",
        objective: "Use provider API key sk-test-123456789abc to configure a live provider.",
        sourceLabel: "Unsafe note",
      }),
    });
    assert.equal(unsafeHandoff.response.status, 400);

    const executedStatusHandoff = await requestJson(fixture.baseUrl, "/api/apex-os/execution-handoffs", {
      method: "POST",
      headers: authHeaders(operatorLogin.token),
      body: JSON.stringify({
        title: "Executed status is blocked",
        objective: "Run the agent now.",
        status: "executed",
        sourceLabel: "Manual note",
      }),
    });
    assert.equal(executedStatusHandoff.response.status, 400);

    const queuedStatusHandoff = await requestJson(fixture.baseUrl, "/api/apex-os/execution-handoffs", {
      method: "POST",
      headers: authHeaders(operatorLogin.token),
      body: JSON.stringify({
        title: "Queued status is blocked",
        objective: "Queue the agent now.",
        status: "queued",
        sourceLabel: "Manual note",
      }),
    });
    assert.equal(queuedStatusHandoff.response.status, 400);

    const incompleteReadyHandoff = await requestJson(fixture.baseUrl, "/api/apex-os/execution-handoffs", {
      method: "POST",
      headers: authHeaders(operatorLogin.token),
      body: JSON.stringify({
        title: "Incomplete ready handoff",
        objective: "Prepare the next local Apex OS slice.",
        status: "ready",
        sourceLabel: "Agent Work Queue",
      }),
    });
    assert.equal(incompleteReadyHandoff.response.status, 400);

    const createdHandoff = await assertOk(fixture.baseUrl, "/api/apex-os/execution-handoffs", {
      method: "POST",
      headers: authHeaders(operatorLogin.token),
      body: JSON.stringify({
        title: "Build Apex OS handoff drafts",
        agentRole: "build",
        workType: "local-code-plan",
        riskLevel: "medium",
        sourceApprovalPacketId: createdPacket.apexOsApprovalPacket.id,
        objective: "Prepare the safe agent handoff draft slice for Apex OS.",
        sourceEvidence: "Apex OS living finish plan, master plan, and approval packet context.",
        allowedActions: "Read files, draft local code, run local tests, and report evidence.",
        blockedActions: "No deploy, sends, spend, provider setup, production mutation, customer-visible changes, deletion, or irreversible actions.",
        validationPlan: "Run focused handoff tests, server tests, role checks, build, and browser QA.",
        rollbackPlan: "Revert the handoff branch commit.",
        handoffPrompt: "Act as Apex feature builder and implement local-only handoff drafting.",
        sourceLabel: "docs/APEX_HQ_LIVING_FINISH_PLAN.md",
      }),
    });
    assert.equal(createdHandoff.apexOsExecutionHandoff.status, "draft");
    assert.equal(createdHandoff.apexOsExecutionHandoff.readyToReview, true);
    assert.equal(storedApexOsExecutionHandoffs(fixture.sqliteFile)[0].title, "Build Apex OS handoff drafts");

    const readyHandoff = await assertOk(fixture.baseUrl, `/api/apex-os/execution-handoffs/${createdHandoff.apexOsExecutionHandoff.id}`, {
      method: "PATCH",
      headers: authHeaders(operatorLogin.token),
      body: JSON.stringify({ status: "ready" }),
    });
    assert.equal(readyHandoff.apexOsExecutionHandoff.status, "ready");

    const listedHandoffs = await assertOk(fixture.baseUrl, "/api/apex-os/execution-handoffs", {
      headers: authHeaders(operatorLogin.token),
    });
    assert.equal(listedHandoffs.summary.ready, 1);
    assert.equal(listedHandoffs.apexOsExecutionHandoffs[0].title, "Build Apex OS handoff drafts");

    const unsafeAgentControl = await requestJson(fixture.baseUrl, "/api/apex-os/agent-control/requests", {
      method: "POST",
      headers: authHeaders(operatorLogin.token),
      body: JSON.stringify({
        title: "Unsafe agent control",
        requestType: "scoped-run",
        agentRole: "build",
        objective: "Use provider API key sk-test-123456789abc and customer@example.test.",
        sourceLabel: "Unsafe note",
      }),
    });
    assert.equal(unsafeAgentControl.response.status, 400);

    const queuedAgentControl = await requestJson(fixture.baseUrl, "/api/apex-os/agent-control/requests", {
      method: "POST",
      headers: authHeaders(operatorLogin.token),
      body: JSON.stringify({
        title: "Queued status is blocked",
        requestType: "scoped-run",
        agentRole: "build",
        objective: "Queue this agent now.",
        status: "queued",
        sourceLabel: "Manual note",
      }),
    });
    assert.equal(queuedAgentControl.response.status, 400);

    const incompleteReadyAgentControl = await requestJson(fixture.baseUrl, "/api/apex-os/agent-control/requests", {
      method: "POST",
      headers: authHeaders(operatorLogin.token),
      body: JSON.stringify({
        title: "Incomplete ready control",
        requestType: "scoped-run",
        agentRole: "qa",
        objective: "Run QA for Phase 7.",
        status: "ready",
        sourceLabel: "Agent Control Plane",
      }),
    });
    assert.equal(incompleteReadyAgentControl.response.status, 400);

    const createdAgentControl = await assertOk(fixture.baseUrl, "/api/apex-os/agent-control/requests", {
      method: "POST",
      headers: authHeaders(operatorLogin.token),
      body: JSON.stringify({
        title: "Run Phase 7 QA",
        requestType: "scoped-run",
        agentRole: "qa",
        riskLevel: "medium",
        objective: "Run the Phase 7 focused QA pass after the agent control plane is built.",
        scope: "Local tests, build, role checks, browser QA, docs, and report evidence only.",
        validationPlan: "Run focused shared, server, UI, permission, build, and browser smoke checks.",
        rollbackPlan: "Revert the Phase 7 branch commit and redeploy previous production if release smoke fails.",
        sourceLabel: "docs/APEX_HQ_APEX_OS_COMMAND_CENTER_MASTER_PLAN.md",
        status: "requested",
      }),
    });
    assert.equal(createdAgentControl.apexOsAgentControlRequest.status, "requested");
    assert.equal(createdAgentControl.apexOsAgentControlRequest.readyToReview, true);
    assert.equal(createdAgentControl.apexOsAgentControlRequest.executionLocked, true);
    assert.equal(storedApexOsAgentControlRequests(fixture.sqliteFile)[0].title, "Run Phase 7 QA");

    const readyAgentControl = await assertOk(fixture.baseUrl, `/api/apex-os/agent-control/requests/${createdAgentControl.apexOsAgentControlRequest.id}`, {
      method: "PATCH",
      headers: authHeaders(operatorLogin.token),
      body: JSON.stringify({ status: "ready" }),
    });
    assert.equal(readyAgentControl.apexOsAgentControlRequest.status, "ready");

    const listedAgentControl = await assertOk(fixture.baseUrl, "/api/apex-os/agent-control", {
      headers: authHeaders(operatorLogin.token),
    });
    assert.equal(listedAgentControl.summary.ready, 1);
    assert.equal(listedAgentControl.controlPlane.rosterRows.length, 7);
    assert.equal(listedAgentControl.controlPlane.rosterRows.some((row) => row.id === "qa" && row.status === "needs approval"), true);
    assert.equal(listedAgentControl.controlPlane.safetyRows.some((row) => row.id === "external-action-gates"), true);

    const archived = await assertOk(fixture.baseUrl, `/api/apex-os/memory/${created.apexOsMemoryEntry.id}`, {
      method: "PATCH",
      headers: authHeaders(operatorLogin.token),
      body: JSON.stringify({ status: "archived" }),
    });
    assert.equal(archived.apexOsMemoryEntry.status, "archived");
    assert.ok(archived.apexOsMemoryEntry.archivedAt);
    const audits = auditEvents(fixture.sqliteFile);
    assert.equal(audits.some((event) => event.entityType === "apexOsAgentControlRequest" && event.action === "readied"), true);
    assert.equal(audits.some((event) => event.entityType === "apexOsExecutionHandoff" && event.action === "readied"), true);
    assert.equal(audits.some((event) => event.entityType === "apexOsApprovalPacket" && event.action === "readied"), true);
    assert.equal(audits.some((event) => event.entityType === "apexOsApprovalPacket" && event.action === "approved"), true);
    assert.equal(audits.some((event) => event.entityType === "apexOsApprovalPacket" && event.action === "rejected"), true);
    assert.equal(audits.some((event) => event.entityType === "apexOsApprovalPacket" && event.action === "deferred"), true);
    assert.deepEqual(audits.filter((event) => event.entityType === "apexOsMemory").map((event) => event.action).slice(0, 3), ["archived", "approved", "suggested"]);
  } finally {
    await fixture.stop();
  }
});
