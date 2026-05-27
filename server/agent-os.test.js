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

async function startServer() {
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

test("Agent OS exposes registry and queues audit-backed internal runs while external gates stay locked", async () => {
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
    assert.equal(agentOs.agentOs.externalGates.every((gate) => gate.status === "locked"), true);

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
    assert.match(externalBlocked.payload.error, /External Apex Agent actions are locked/i);

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
