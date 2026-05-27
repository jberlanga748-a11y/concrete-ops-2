import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import http from "node:http";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

import { DEFAULT_COMPANY_ID } from "../shared/companyScope.js";
import { PACKAGE_IDS } from "../shared/packages.js";
import { createUserRecord } from "./store.js";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createPort() {
  return 18200 + Math.floor(Math.random() * 700);
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
  throw new Error(`Agent OS test server did not become ready.\n${serverOutput()}`);
}

async function startServer(envOverrides = {}) {
  const tempDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "apex-agent-os-"));
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

  await waitForServer(baseUrl, () => output);

  async function stop() {
    server.kill("SIGTERM");
    await new Promise((resolve) => server.once("exit", resolve));
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
    assert.equal(agentOs.agentOs.externalGates.every((gate) => gate.status === "boundary_approved"), true);
    assert.equal(agentOs.agentOs.externalGates.every((gate) => gate.executionEnabled === false), true);
    const smsGate = await assertOk(fixture.baseUrl, "/api/agent/os/external-gates/sms_send", {
      headers: authHeaders(adminLogin.token),
    });
    assert.equal(smsGate.externalGate.gate.status, "boundary_approved");
    assert.equal(smsGate.externalGate.gate.executionEnabled, false);
    assert.match(smsGate.externalGate.requiredBeforeExecution.join(" "), /Per-company opt-in/i);
    assert.match(smsGate.externalGate.safetyBoundary, /No customer contact/i);

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
    assert.equal(queued.ledger.queuedCount, 1);

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
