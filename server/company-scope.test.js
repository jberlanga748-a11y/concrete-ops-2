import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

import { DEFAULT_COMPANY_ID } from "../shared/companyScope.js";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createPort() {
  return 8100 + Math.floor(Math.random() * 800);
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

  throw new Error(`Company scope test server did not become ready.\n${serverOutput()}`);
}

async function startServer() {
  const tempDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "concrete-ops-company-scope-"));
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

  return {
    baseUrl,
    sqliteFile,
    stop,
    serverOutput: () => output,
  };
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

function insertOtherCompanyLeadData(sqliteFile) {
  const database = new DatabaseSync(sqliteFile);
  const now = new Date().toISOString();
  try {
    database.prepare(`
      INSERT INTO companies (id, workspace_id, name, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run("COMPANY-LYF", "COMPANY-LYF", "Live Your Future Construction", "active", now, now);

    database.prepare(`
      INSERT INTO lead_sources (
        id, sort_index, company_id, name, type, url, city, state, service_area, trade_focus,
        notes, status, check_cadence, last_checked_at, next_check_at, created_at, updated_at, archived_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      "LS-LYF-001",
      999,
      "COMPANY-LYF",
      "LYF private bid list",
      "GC bid invites",
      "https://lyf.example.test/bids",
      "Portland",
      "OR",
      "Portland metro",
      "Exterior remodel",
      "Future workspace source that must not leak.",
      "Active",
      "Weekly",
      "",
      "",
      now,
      now,
      null,
    );

    database.prepare(`
      INSERT INTO leads (
        id, sort_index, company_id, customer_id, customer, city, project, status, priority, value,
        owner, owner_id, age, source, follow_up_due_at, next_step, notes, fit_score, fit_label,
        fit_reason, fit_risks, fit_next_step, score_source, scored_at, missing_info_status,
        missing_info_count, missing_info_items, missing_info_next_step, missing_info_checked_at,
        created_at, updated_at, archived_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      "L-LYF-001",
      999,
      "COMPANY-LYF",
      null,
      "LYF Private Customer",
      "Portland, OR",
      "Other company private exterior project",
      "New",
      "Normal",
      0,
      "LYF Owner",
      null,
      "New",
      "LYF private bid list",
      null,
      "Review in LYF workspace",
      "This record belongs to a future different company.",
      0,
      "",
      "",
      "[]",
      "",
      "",
      "",
      "",
      0,
      "[]",
      "",
      "",
      now,
      now,
      null,
    );
  } finally {
    database.close();
  }
}

test("bootstrap scopes existing users to the default company and hides future other-company lead data", async () => {
  const fixture = await startServer();

  try {
    const ownerLogin = await login(fixture.baseUrl, {
      email: "ops@lastyard.test",
      password: "concrete123",
    });
    const headers = authHeaders(ownerLogin.token);

    const initial = await assertOk(fixture.baseUrl, "/api/bootstrap", { headers });
    assert.equal(initial.currentCompanyId, DEFAULT_COMPANY_ID);
    assert.equal(initial.currentWorkspaceId, DEFAULT_COMPANY_ID);
    assert.equal(initial.user.companyId, DEFAULT_COMPANY_ID);
    assert.equal(initial.companies.length, 1);
    assert.equal(initial.companies[0].id, DEFAULT_COMPANY_ID);
    assert.ok(initial.leads.every((lead) => lead.companyId === DEFAULT_COMPANY_ID));
    assert.ok(initial.leadSources.every((source) => source.companyId === DEFAULT_COMPANY_ID));

    insertOtherCompanyLeadData(fixture.sqliteFile);

    const scoped = await assertOk(fixture.baseUrl, "/api/bootstrap", { headers });
    assert.equal(scoped.currentCompanyId, DEFAULT_COMPANY_ID);
    assert.equal(scoped.companies.length, 1);
    assert.equal(scoped.companies[0].id, DEFAULT_COMPANY_ID);
    assert.equal(scoped.leads.some((lead) => lead.id === "L-LYF-001"), false);
    assert.equal(scoped.leadSources.some((source) => source.id === "LS-LYF-001"), false);
    assert.ok(scoped.leads.every((lead) => lead.companyId === DEFAULT_COMPANY_ID));
    assert.ok(scoped.leadSources.every((source) => source.companyId === DEFAULT_COMPANY_ID));
  } finally {
    await fixture.stop();
  }
});
