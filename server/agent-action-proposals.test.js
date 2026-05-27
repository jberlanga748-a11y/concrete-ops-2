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
  return 16800 + Math.floor(Math.random() * 700);
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

  throw new Error(`Agent action proposal test server did not become ready.\n${serverOutput()}`);
}

async function startServer() {
  const tempDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "apex-agent-action-proposals-"));
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
    body: JSON.stringify({ ...credentials, returnToken: true }),
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

function insertCustomerAndLead(sqliteFile, {
  customerId = "CUST-AGENT-DRAFT",
  leadId = "LEAD-AGENT-DRAFT",
  companyId = DEFAULT_COMPANY_ID,
} = {}) {
  const database = new DatabaseSync(sqliteFile);
  const now = new Date().toISOString();
  try {
    database.prepare(`
      INSERT INTO customers (id, sort_index, company_id, name, company, phone, email, city, service_area, status, notes, created_at, updated_at, archived_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      customerId,
      9001,
      companyId,
      "Agent Draft Customer",
      "Agent Draft Customer",
      "503-555-0199",
      "agent-draft-customer@example.test",
      "Salem",
      "Salem",
      "Prospect",
      "Created for agent draft tests.",
      now,
      now,
      null,
    );
    database.prepare(`
      INSERT INTO leads (id, sort_index, company_id, customer_id, customer, city, project, status, priority, value, owner, owner_id, age, source, follow_up_due_at, next_step, notes, fit_score, fit_label, fit_reason, fit_risks, fit_next_step, score_source, scored_at, missing_info_status, missing_info_count, missing_info_items, missing_info_next_step, missing_info_checked_at, created_at, updated_at, archived_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      leadId,
      9001,
      companyId,
      customerId,
      "Agent Draft Customer",
      "Salem",
      "Agent Draft Patio",
      "Qualified",
      "High",
      18500,
      "Jason M.",
      "",
      "Today",
      "Website",
      "",
      "Prepare estimate draft",
      "Customer needs a new patio estimate with broom finish.",
      82,
      "Strong fit",
      "Concrete scope is in service area.",
      "Confirm access and preferred schedule.",
      "Create draft estimate.",
      "manual",
      now,
      "complete",
      0,
      "[]",
      "",
      now,
      now,
      now,
      null,
    );
  } finally {
    database.close();
  }
  return { customerId, leadId };
}

function auditEvents(sqliteFile) {
  const database = new DatabaseSync(sqliteFile);
  try {
    return database.prepare(`
      SELECT entity_type AS entityType, entity_id AS entityId, action, summary, detail, actor_user_id AS actorUserId, actor_name AS actorName
      FROM audit_events
      WHERE entity_type = 'agentActionProposal'
      ORDER BY sort_index DESC
    `).all();
  } finally {
    database.close();
  }
}

function estimateRows(sqliteFile) {
  const database = new DatabaseSync(sqliteFile);
  try {
    return database.prepare(`
      SELECT id, lead_id AS leadId, customer_id AS customerId, status, sent_at AS sentAt, sent_to AS sentTo, provider_message_id AS providerMessageId, job_id AS jobId, internal_notes AS internalNotes
      FROM estimates
      ORDER BY sort_index DESC
    `).all();
  } finally {
    database.close();
  }
}

function jobRows(sqliteFile) {
  const database = new DatabaseSync(sqliteFile);
  try {
    return database.prepare(`
      SELECT id, customer_id AS customerId, lead_id AS leadId, title, status, assigned_foreman_id AS assignedForemanId, assigned_user_id AS assignedUserId, field_planning_visible AS fieldPlanningVisible, visible_to_foreman AS visibleToForeman, notes
      FROM jobs
      ORDER BY sort_index DESC
    `).all();
  } finally {
    database.close();
  }
}

function tableCounts(sqliteFile, tableNames) {
  const database = new DatabaseSync(sqliteFile);
  try {
    return Object.fromEntries(tableNames.map((tableName) => [
      tableName,
      database.prepare(`SELECT COUNT(*) AS count FROM ${tableName}`).get().count,
    ]));
  } finally {
    database.close();
  }
}

function agentAuditPayload(overrides = {}) {
  return {
    eventType: "agent.proposal.generated",
    proposalId: "agent-proposal:estimate-draft-review:estimates",
    proposalType: "estimate-draft-review",
    status: "needs_human_review",
    riskLevel: "review_required",
    sourceRoute: "/command-center",
    sourceModule: "estimates",
    summary: "Estimate draft review packet",
    redactedPromptPreview: "Create an estimate from rough notes with api_key=secret123 and contact bob@example.com",
    redactedResponsePreview: "No email is sent. Review only.",
    approvalRequired: true,
    requiredApprovals: ["Read the assistant summary", "Use the normal Apex HQ button only if approved"],
    blockedReasons: ["No customer email, text, call, or notification"],
    draftPrepSummary: [{
      prepType: "Estimate draft prep",
      label: "Newco Builders",
      reviewLabel: "No estimate is saved until a user reviews it.",
      fieldPreview: [
        {
          field: "Rough notes",
          currentValue: "No estimate created",
          proposedValue: "Use api_key=secret123 for 120 LF cedar fence and contact bob@example.com",
          source: "Assistant prompt",
          note: "Human must review before save.",
        },
      ],
    }],
    targetEntityType: "lead",
    targetEntityId: "LEAD-1",
    ...overrides,
  };
}

test("agent proposal audit is package gated, role gated, and append-only redacted", async () => {
  const fixture = await startServer();

  try {
    const unauthenticated = await requestJson(fixture.baseUrl, "/api/agent-action-proposals/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(agentAuditPayload()),
    });
    assert.equal(unauthenticated.response.status, 401);

    const adminLogin = await login(fixture.baseUrl, {
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
    });

    const basicBlocked = await requestJson(fixture.baseUrl, "/api/agent-action-proposals/audit", {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify(agentAuditPayload()),
    });
    assert.equal(basicBlocked.response.status, 403);

    setCompanyPackage(fixture.sqliteFile, PACKAGE_IDS.PREMIUM);
    const employeeUser = createUserRecord({
      id: "U-AGENT-AUDIT-EMPLOYEE",
      email: "agent-audit-employee@apexhq.test",
      password: "apexdemo123",
      name: "Agent Audit Employee",
      role: "Employee",
    });
    insertUser(fixture.sqliteFile, employeeUser);

    const employeeLogin = await login(fixture.baseUrl, {
      email: employeeUser.email,
      password: "apexdemo123",
    });
    const employeeBlocked = await requestJson(fixture.baseUrl, "/api/agent-action-proposals/audit", {
      method: "POST",
      headers: authHeaders(employeeLogin.token),
      body: JSON.stringify(agentAuditPayload({ proposalId: "agent-proposal:field-denied" })),
    });
    assert.equal(employeeBlocked.response.status, 403);

    const payload = await assertOk(fixture.baseUrl, "/api/agent-action-proposals/audit", {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify(agentAuditPayload()),
    });

    assert.equal(payload.auditEvent.entityType, "agentActionProposal");
    assert.equal(payload.auditEvent.action, "agent.proposal.generated");
    assert.equal(payload.auditEvent.detail.approvalRequired, true);
    assert.equal(payload.auditEvent.detail.draftPrepSummary[0].fieldPreview[0].field, "Rough notes");
    assert.doesNotMatch(JSON.stringify(payload.auditEvent), /secret123|bob@example\.com/i);
    assert.match(JSON.stringify(payload.auditEvent), /\[REDACTED\]/);

    const records = auditEvents(fixture.sqliteFile);
    assert.equal(records.length, 1);
    assert.equal(records[0].entityId, "agent-proposal:estimate-draft-review:estimates");
    assert.equal(records[0].actorUserId, adminLogin.user.id);
    assert.doesNotMatch(records[0].detail, /secret123|bob@example\.com/i);
    assert.match(records[0].detail, /Rough notes/);
    assert.match(records[0].detail, /Unsafe automation request remains review-only/);
  } finally {
    await fixture.stop();
  }
});

test("agent proposal audit rejects non-review-first records", async () => {
  const fixture = await startServer();

  try {
    setCompanyPackage(fixture.sqliteFile, PACKAGE_IDS.PREMIUM);
    const adminLogin = await login(fixture.baseUrl, {
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
    });

    const response = await requestJson(fixture.baseUrl, "/api/agent-action-proposals/audit", {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify(agentAuditPayload({ approvalRequired: false })),
    });

    assert.equal(response.response.status, 400);
    assert.match(response.payload.error, /human approval required/i);

    const fakeDraftCreated = await requestJson(fixture.baseUrl, "/api/agent-action-proposals/audit", {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify(agentAuditPayload({
        eventType: "agent.proposal.draft_created",
        status: "draft_created",
      })),
    });
    assert.equal(fakeDraftCreated.response.status, 400);
    const fakeSendReady = await requestJson(fixture.baseUrl, "/api/agent-action-proposals/audit", {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify(agentAuditPayload({
        eventType: "agent.proposal.send_ready_for_human",
        status: "ready_for_human_send",
      })),
    });
    assert.equal(fakeSendReady.response.status, 400);
    assert.equal(auditEvents(fixture.sqliteFile).length, 0);
  } finally {
    await fixture.stop();
  }
});

test("agent proposal approval-for-draft is audit-only and requires a generated event", async () => {
  const fixture = await startServer();

  try {
    setCompanyPackage(fixture.sqliteFile, PACKAGE_IDS.PREMIUM);
    const adminLogin = await login(fixture.baseUrl, {
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
    });

    const approvalPayload = agentAuditPayload({
      eventType: "agent.proposal.approved_for_draft",
      status: "approved_for_draft",
      summary: "Estimate draft prep approved for manual review",
    });

    const missingGenerated = await requestJson(fixture.baseUrl, "/api/agent-action-proposals/audit", {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify(approvalPayload),
    });
    assert.equal(missingGenerated.response.status, 409);
    assert.match(missingGenerated.payload.error, /generated agent proposal/i);

    await assertOk(fixture.baseUrl, "/api/agent-action-proposals/audit", {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify(agentAuditPayload()),
    });

    const beforeCounts = tableCounts(fixture.sqliteFile, ["leads", "estimates", "jobs", "contact_history", "daily_reports", "uploads"]);
    const approved = await assertOk(fixture.baseUrl, "/api/agent-action-proposals/audit", {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify(approvalPayload),
    });
    const afterCounts = tableCounts(fixture.sqliteFile, ["leads", "estimates", "jobs", "contact_history", "daily_reports", "uploads"]);

    assert.equal(approved.auditEvent.action, "agent.proposal.approved_for_draft");
    assert.equal(approved.auditEvent.detail.status, "approved_for_draft");
    assert.deepEqual(afterCounts, beforeCounts);

    const records = auditEvents(fixture.sqliteFile);
    assert.equal(records.length, 2);
    assert.deepEqual(records.map((record) => record.action), [
      "agent.proposal.approved_for_draft",
      "agent.proposal.generated",
    ]);
  } finally {
    await fixture.stop();
  }
});

test("agent proposal approval-for-draft keeps field users and unsupported proposal types blocked", async () => {
  const fixture = await startServer();

  try {
    setCompanyPackage(fixture.sqliteFile, PACKAGE_IDS.PREMIUM);
    const adminLogin = await login(fixture.baseUrl, {
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
    });
    const employeeUser = createUserRecord({
      id: "U-AGENT-APPROVAL-EMPLOYEE",
      email: "agent-approval-employee@apexhq.test",
      password: "apexdemo123",
      name: "Agent Approval Employee",
      role: "Employee",
    });
    insertUser(fixture.sqliteFile, employeeUser);
    const employeeLogin = await login(fixture.baseUrl, {
      email: employeeUser.email,
      password: "apexdemo123",
    });

    await assertOk(fixture.baseUrl, "/api/agent-action-proposals/audit", {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify(agentAuditPayload()),
    });

    const employeeBlocked = await requestJson(fixture.baseUrl, "/api/agent-action-proposals/audit", {
      method: "POST",
      headers: authHeaders(employeeLogin.token),
      body: JSON.stringify(agentAuditPayload({
        eventType: "agent.proposal.approved_for_draft",
        status: "approved_for_draft",
      })),
    });
    assert.equal(employeeBlocked.response.status, 403);

    const unsupportedGenerated = agentAuditPayload({
      proposalId: "agent-proposal:daily-closeout-readiness:reports",
      proposalType: "daily-closeout-readiness",
      sourceModule: "reports",
      summary: "Daily closeout review packet",
    });
    await assertOk(fixture.baseUrl, "/api/agent-action-proposals/audit", {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify(unsupportedGenerated),
    });
    const unsupportedApproval = await requestJson(fixture.baseUrl, "/api/agent-action-proposals/audit", {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify({
        ...unsupportedGenerated,
        eventType: "agent.proposal.approved_for_draft",
        status: "approved_for_draft",
      }),
    });
    assert.equal(unsupportedApproval.response.status, 403);
  } finally {
    await fixture.stop();
  }
});

test("agent proposal can create a draft estimate from an approved lead without sending or converting", async () => {
  const fixture = await startServer();

  try {
    setCompanyPackage(fixture.sqliteFile, PACKAGE_IDS.PREMIUM);
    const { leadId } = insertCustomerAndLead(fixture.sqliteFile);
    const adminLogin = await login(fixture.baseUrl, {
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
    });
    const beforeCounts = tableCounts(fixture.sqliteFile, ["estimates", "jobs", "contact_history"]);

    const payload = await assertOk(fixture.baseUrl, "/api/agent-action-proposals/create-estimate-draft", {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify({
        leadId,
        proposal: agentAuditPayload({
          proposalId: `agent-proposal:estimate-draft-review:${leadId}`,
          targetEntityType: "lead",
          targetEntityId: leadId,
          summary: "Estimate draft review packet",
          redactedPromptPreview: "Create estimate draft for Agent Draft Customer contact agent@example.test. Do not send.",
          redactedResponsePreview: "Draft only. No send or customer contact.",
        }),
      }),
    });
    const afterCounts = tableCounts(fixture.sqliteFile, ["estimates", "jobs", "contact_history"]);
    const estimate = estimateRows(fixture.sqliteFile).find((row) => row.id === payload.agentDraftEstimateId);

    assert.equal(afterCounts.estimates, beforeCounts.estimates + 1);
    assert.equal(afterCounts.jobs, beforeCounts.jobs);
    assert.equal(afterCounts.contact_history, beforeCounts.contact_history);
    assert.ok(estimate);
    assert.equal(estimate.leadId, leadId);
    assert.equal(estimate.status, "draft");
    assert.equal(estimate.sentAt || "", "");
    assert.equal(estimate.sentTo || "", "");
    assert.equal(estimate.providerMessageId || "", "");
    assert.equal(estimate.jobId || "", "");
    assert.match(estimate.internalNotes, /No proposal was sent/i);

    const records = auditEvents(fixture.sqliteFile);
    const proposalActions = records.map((record) => record.action);
    assert.ok(proposalActions.includes("agent.proposal.generated"));
    assert.ok(proposalActions.includes("agent.proposal.approved_for_draft"));
    assert.ok(proposalActions.includes("agent.proposal.draft_created"));
    const draftCreatedRecord = records.find((record) => record.action === "agent.proposal.draft_created");
    const draftCreatedDetail = JSON.parse(draftCreatedRecord.detail);
    assert.equal(draftCreatedDetail.createdDraftEntityType, "estimate");
    assert.equal(draftCreatedDetail.createdDraftEntityId, payload.agentDraftEstimateId);
    assert.doesNotMatch(JSON.stringify(records), /example\.test/i);
    assert.match(JSON.stringify(records), /\[REDACTED\]/);
  } finally {
    await fixture.stop();
  }
});

test("agent proposal estimate draft creation blocks field users and unsupported proposal types", async () => {
  const fixture = await startServer();

  try {
    setCompanyPackage(fixture.sqliteFile, PACKAGE_IDS.PREMIUM);
    const { leadId } = insertCustomerAndLead(fixture.sqliteFile, {
      customerId: "CUST-AGENT-DRAFT-BLOCKED",
      leadId: "LEAD-AGENT-DRAFT-BLOCKED",
    });
    const employeeUser = createUserRecord({
      id: "U-AGENT-DRAFT-EMPLOYEE",
      email: "agent-draft-employee@apexhq.test",
      password: "apexdemo123",
      name: "Agent Draft Employee",
      role: "Employee",
    });
    insertUser(fixture.sqliteFile, employeeUser);
    const employeeLogin = await login(fixture.baseUrl, {
      email: employeeUser.email,
      password: "apexdemo123",
    });
    const adminLogin = await login(fixture.baseUrl, {
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
    });

    const employeeBlocked = await requestJson(fixture.baseUrl, "/api/agent-action-proposals/create-estimate-draft", {
      method: "POST",
      headers: authHeaders(employeeLogin.token),
      body: JSON.stringify({
        leadId,
        proposal: agentAuditPayload({
          proposalId: `agent-proposal:estimate-draft-review:${leadId}`,
          targetEntityId: leadId,
        }),
      }),
    });
    assert.equal(employeeBlocked.response.status, 403);

    const unsupported = await requestJson(fixture.baseUrl, "/api/agent-action-proposals/create-estimate-draft", {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify({
        leadId,
        proposal: agentAuditPayload({
          proposalId: "agent-proposal:lead-follow-up:leads",
          proposalType: "lead-follow-up",
          targetEntityId: leadId,
        }),
      }),
    });
    assert.equal(unsupported.response.status, 403);

    const counts = tableCounts(fixture.sqliteFile, ["estimates", "jobs", "contact_history"]);
    assert.equal(estimateRows(fixture.sqliteFile).some((estimate) => estimate.leadId === leadId), false);
    assert.equal(counts.jobs >= 0, true);
    assert.equal(counts.contact_history >= 0, true);
  } finally {
    await fixture.stop();
  }
});

test("agent proposal can prepare estimate send review without sending email or marking sent", async () => {
  const fixture = await startServer();

  try {
    setCompanyPackage(fixture.sqliteFile, PACKAGE_IDS.PREMIUM);
    const adminLogin = await login(fixture.baseUrl, {
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
    });
    const bootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", {
      headers: { Authorization: `Bearer ${adminLogin.token}` },
    });
    const created = await assertOk(fixture.baseUrl, "/api/estimates", {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify({
        customerId: bootstrap.customers[0].id,
        leadId: bootstrap.leads[0].id,
        title: "Agent Send Review Estimate",
        status: "draft",
        customerEmail: "agent-send-review@example.test",
        scopeSummary: "Prepare packet for review.",
        internalNotes: "Internal only.",
        customerNotes: "Customer-facing note.",
        items: [{ description: "Fence install", quantity: 100, unit: "lf", unitPrice: 42 }],
      }),
    });
    const estimate = created.estimates.find((entry) => entry.title === "Agent Send Review Estimate");
    const beforeCounts = tableCounts(fixture.sqliteFile, ["jobs", "contact_history"]);

    const prepared = await assertOk(fixture.baseUrl, "/api/agent-action-proposals/prepare-estimate-send", {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify({
        estimateId: estimate.id,
        proposal: agentAuditPayload({
          proposalId: `agent-proposal:estimate-packet-review:${estimate.id}`,
          proposalType: "estimate-packet-review",
          sourceModule: "estimates",
          targetEntityType: "estimate",
          targetEntityId: estimate.id,
          summary: "Estimate packet review packet",
          redactedPromptPreview: "Prepare proposal send for review. Do not email agent-send-review@example.test.",
          redactedResponsePreview: "Send review only. No email was sent.",
        }),
      }),
    });
    const afterCounts = tableCounts(fixture.sqliteFile, ["jobs", "contact_history"]);
    const afterEstimate = estimateRows(fixture.sqliteFile).find((row) => row.id === estimate.id);

    assert.equal(prepared.agentEstimateSendReview.estimateId, estimate.id);
    assert.equal(prepared.agentEstimateSendReview.status, "ready_for_human_send");
    assert.equal(prepared.agentEstimateSendReview.recipientPresent, true);
    assert.equal(afterEstimate.status, "draft");
    assert.equal(afterEstimate.sentAt || "", "");
    assert.equal(afterEstimate.sentTo || "", "");
    assert.equal(afterEstimate.providerMessageId || "", "");
    assert.deepEqual(afterCounts, beforeCounts);

    const records = auditEvents(fixture.sqliteFile);
    const sendReadyRecord = records.find((record) => record.action === "agent.proposal.send_ready_for_human");
    assert.ok(sendReadyRecord);
    assert.doesNotMatch(sendReadyRecord.detail, /agent-send-review@example\.test/i);
    assert.match(sendReadyRecord.detail, /No email was sent by Apex Assistant/i);
  } finally {
    await fixture.stop();
  }
});

test("agent proposal estimate send review blocks field users, unsupported proposals, and missing recipients", async () => {
  const fixture = await startServer();

  try {
    setCompanyPackage(fixture.sqliteFile, PACKAGE_IDS.PREMIUM);
    const adminLogin = await login(fixture.baseUrl, {
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
    });
    const employeeUser = createUserRecord({
      id: "U-AGENT-SEND-EMPLOYEE",
      email: "agent-send-employee@apexhq.test",
      password: "apexdemo123",
      name: "Agent Send Employee",
      role: "Employee",
    });
    insertUser(fixture.sqliteFile, employeeUser);
    const employeeLogin = await login(fixture.baseUrl, {
      email: employeeUser.email,
      password: "apexdemo123",
    });
    const bootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", {
      headers: { Authorization: `Bearer ${adminLogin.token}` },
    });
    const created = await assertOk(fixture.baseUrl, "/api/estimates", {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify({
        customerId: bootstrap.customers[0].id,
        leadId: bootstrap.leads[0].id,
        title: "Agent Send Blocked Estimate",
        status: "draft",
        customerEmail: "agent-send-blocked@example.test",
        scopeSummary: "Prepare packet for review.",
        internalNotes: "",
        customerNotes: "",
        items: [{ description: "Fence install", quantity: 50, unit: "lf", unitPrice: 45 }],
      }),
    });
    const estimate = created.estimates.find((entry) => entry.title === "Agent Send Blocked Estimate");
    const basePayload = {
      estimateId: estimate.id,
      proposal: agentAuditPayload({
        proposalId: `agent-proposal:estimate-packet-review:${estimate.id}`,
        proposalType: "estimate-packet-review",
        targetEntityType: "estimate",
        targetEntityId: estimate.id,
      }),
    };

    const employeeBlocked = await requestJson(fixture.baseUrl, "/api/agent-action-proposals/prepare-estimate-send", {
      method: "POST",
      headers: authHeaders(employeeLogin.token),
      body: JSON.stringify(basePayload),
    });
    assert.equal(employeeBlocked.response.status, 403);

    const unsupported = await requestJson(fixture.baseUrl, "/api/agent-action-proposals/prepare-estimate-send", {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify({
        ...basePayload,
        proposal: {
          ...basePayload.proposal,
          proposalId: "agent-proposal:lead-follow-up:leads",
          proposalType: "lead-follow-up",
        },
      }),
    });
    assert.equal(unsupported.response.status, 403);

    const noRecipientCreated = await assertOk(fixture.baseUrl, "/api/estimates", {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify({
        customerName: "Agent Send No Recipient Customer",
        title: "Agent Send Missing Recipient",
        status: "draft",
        customerEmail: "",
        scopeSummary: "Missing recipient.",
        internalNotes: "",
        customerNotes: "",
        items: [{ description: "Fence install", quantity: 20, unit: "lf", unitPrice: 40 }],
      }),
    });
    const noRecipientEstimate = noRecipientCreated.estimates.find((entry) => entry.title === "Agent Send Missing Recipient");
    const missingRecipient = await requestJson(fixture.baseUrl, "/api/agent-action-proposals/prepare-estimate-send", {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify({
        estimateId: noRecipientEstimate.id,
        proposal: {
          ...basePayload.proposal,
          proposalId: `agent-proposal:estimate-packet-review:${noRecipientEstimate.id}`,
          targetEntityId: noRecipientEstimate.id,
        },
      }),
    });
    assert.equal(missingRecipient.response.status, 400);
    assert.match(missingRecipient.payload.error, /customer email/i);
  } finally {
    await fixture.stop();
  }
});

test("agent proposal can convert an approved estimate to a draft job only after human approval", async () => {
  const fixture = await startServer();

  try {
    setCompanyPackage(fixture.sqliteFile, PACKAGE_IDS.PREMIUM);
    const adminLogin = await login(fixture.baseUrl, {
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
    });
    const bootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", {
      headers: { Authorization: `Bearer ${adminLogin.token}` },
    });
    const created = await assertOk(fixture.baseUrl, "/api/estimates", {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify({
        customerId: bootstrap.customers[0].id,
        leadId: bootstrap.leads[0].id,
        title: "Agent Job Handoff Estimate",
        status: "approved",
        customerEmail: "agent-job-handoff@example.test",
        scopeSummary: "Approved fence project ready for job handoff.",
        internalNotes: "Internal only.",
        customerNotes: "Customer terms.",
        items: [{ description: "Fence install", quantity: 120, unit: "lf", unitPrice: 48 }],
      }),
    });
    const estimate = created.estimates.find((entry) => entry.title === "Agent Job Handoff Estimate");
    const proposal = agentAuditPayload({
      proposalId: `agent-proposal:estimate-job-handoff-review:${estimate.id}`,
      proposalType: "estimate-job-handoff-review",
      sourceModule: "estimates",
      targetEntityType: "estimate",
      targetEntityId: estimate.id,
      summary: "Estimate job handoff review packet",
      redactedPromptPreview: "Prepare job handoff. Do not email, schedule, assign crew, or notify customer.",
      redactedResponsePreview: "Review only. Approved estimate can become a draft job after approval.",
    });

    const missingApproval = await requestJson(fixture.baseUrl, "/api/agent-action-proposals/convert-estimate-to-job", {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify({ estimateId: estimate.id, proposal }),
    });
    assert.equal(missingApproval.response.status, 409);

    await assertOk(fixture.baseUrl, "/api/agent-action-proposals/audit", {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify(proposal),
    });
    await assertOk(fixture.baseUrl, "/api/agent-action-proposals/audit", {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify({
        ...proposal,
        eventType: "agent.proposal.approved_for_draft",
        status: "approved_for_draft",
      }),
    });

    const beforeCounts = tableCounts(fixture.sqliteFile, ["jobs", "contact_history"]);
    const converted = await assertOk(fixture.baseUrl, "/api/agent-action-proposals/convert-estimate-to-job", {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify({ estimateId: estimate.id, proposal }),
    });
    const afterCounts = tableCounts(fixture.sqliteFile, ["jobs", "contact_history"]);
    const createdJob = jobRows(fixture.sqliteFile).find((job) => job.id === converted.agentJobId);
    const convertedEstimate = estimateRows(fixture.sqliteFile).find((row) => row.id === estimate.id);

    assert.equal(afterCounts.jobs, beforeCounts.jobs + 1);
    assert.equal(afterCounts.contact_history, beforeCounts.contact_history);
    assert.ok(createdJob);
    assert.equal(createdJob.status, "draft");
    assert.equal(createdJob.assignedForemanId || "", "");
    assert.equal(createdJob.assignedUserId || "", "");
    assert.equal(Boolean(createdJob.fieldPlanningVisible), false);
    assert.equal(Boolean(createdJob.visibleToForeman), false);
    assert.match(createdJob.notes, /No schedule, crew assignment, customer contact, billing, or field visibility change was automated/i);
    assert.equal(convertedEstimate.jobId, converted.agentJobId);
    assert.equal(convertedEstimate.sentAt || "", "");
    assert.equal(convertedEstimate.sentTo || "", "");
    assert.equal(convertedEstimate.providerMessageId || "", "");

    const records = auditEvents(fixture.sqliteFile);
    const actions = records.map((record) => record.action);
    assert.ok(actions.includes("agent.proposal.job_created"));
    assert.doesNotMatch(JSON.stringify(records), /agent-job-handoff@example\.test/i);
  } finally {
    await fixture.stop();
  }
});

test("agent proposal estimate to job conversion blocks field users and unsupported proposal types", async () => {
  const fixture = await startServer();

  try {
    setCompanyPackage(fixture.sqliteFile, PACKAGE_IDS.PREMIUM);
    const adminLogin = await login(fixture.baseUrl, {
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
    });
    const employeeUser = createUserRecord({
      id: "U-AGENT-JOB-EMPLOYEE",
      email: "agent-job-employee@apexhq.test",
      password: "apexdemo123",
      name: "Agent Job Employee",
      role: "Employee",
    });
    insertUser(fixture.sqliteFile, employeeUser);
    const employeeLogin = await login(fixture.baseUrl, {
      email: employeeUser.email,
      password: "apexdemo123",
    });
    const bootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", {
      headers: { Authorization: `Bearer ${adminLogin.token}` },
    });
    const created = await assertOk(fixture.baseUrl, "/api/estimates", {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify({
        customerId: bootstrap.customers[0].id,
        leadId: bootstrap.leads[0].id,
        title: "Agent Job Blocked Estimate",
        status: "approved",
        customerEmail: "agent-job-blocked@example.test",
        scopeSummary: "Approved project.",
        items: [{ description: "Fence install", quantity: 25, unit: "lf", unitPrice: 40 }],
      }),
    });
    const estimate = created.estimates.find((entry) => entry.title === "Agent Job Blocked Estimate");
    const basePayload = {
      estimateId: estimate.id,
      proposal: agentAuditPayload({
        proposalId: `agent-proposal:estimate-job-handoff-review:${estimate.id}`,
        proposalType: "estimate-job-handoff-review",
        targetEntityType: "estimate",
        targetEntityId: estimate.id,
      }),
    };

    const employeeBlocked = await requestJson(fixture.baseUrl, "/api/agent-action-proposals/convert-estimate-to-job", {
      method: "POST",
      headers: authHeaders(employeeLogin.token),
      body: JSON.stringify(basePayload),
    });
    assert.equal(employeeBlocked.response.status, 403);

    const unsupported = await requestJson(fixture.baseUrl, "/api/agent-action-proposals/convert-estimate-to-job", {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify({
        ...basePayload,
        proposal: {
          ...basePayload.proposal,
          proposalId: "agent-proposal:estimate-packet-review:blocked",
          proposalType: "estimate-packet-review",
        },
      }),
    });
    assert.equal(unsupported.response.status, 403);
  } finally {
    await fixture.stop();
  }
});
