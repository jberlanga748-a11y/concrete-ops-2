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
  return 6300 + Math.floor(Math.random() * 1000);
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

  throw new Error(`AI estimate rough notes test server did not become ready.\n${serverOutput()}`);
}

async function startServer() {
  const tempDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "apex-hq-ai-estimates-"));
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

  return {
    baseUrl,
    sqliteFile,
    stop,
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

function insertUsers(sqliteFile, users) {
  const database = new DatabaseSync(sqliteFile);
  try {
    const insertUser = database.prepare(`
      INSERT INTO users (id, email, name, role, password_hash)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (const user of users) {
      insertUser.run(user.id, user.email, user.name, user.role, user.passwordHash);
    }
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

test("AI estimate rough notes route returns configured false safely when OpenAI is not configured", async () => {
  const fixture = await startServer();

  try {
    setCompanyPackage(fixture.sqliteFile, PACKAGE_IDS.PREMIUM);

    const loginResult = await login(fixture.baseUrl, {
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
    });
    const headers = authHeaders(loginResult.token);
    const bootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", { headers });
    const estimate = bootstrap.estimates[0];
    assert.equal(bootstrap.companyPackage.id, PACKAGE_IDS.PREMIUM);
    assert.equal(bootstrap.permissions.estimates.canUseAiRoughNotes, true);
    assert.equal(bootstrap.permissions.estimates.canUseGcPackets, true);

    const result = await assertOk(fixture.baseUrl, "/api/ai/estimates/rough-notes", {
      method: "POST",
      headers,
      body: JSON.stringify({
        roughNotes: "Demo existing sidewalk, pour 4 inch broom finish, 300 sf, exclude permits.",
        estimateId: estimate?.id || "",
        estimateDraft: {
          title: estimate?.title || "Sidewalk Proposal",
          customerId: estimate?.customerId || "",
          leadId: estimate?.leadId || "",
          scopeSummary: estimate?.scopeSummary || "",
          items: estimate?.items || [],
        },
      }),
    });

    assert.equal(result.ok, true);
    assert.equal(result.configured, false);
    assert.match(result.message, /OPENAI_API_KEY/);
    assert.equal(result.scopeOfWork, "");
    assert.deepEqual(result.inclusions, []);
  } finally {
    await fixture.stop();
  }
});

test("AI estimate rough notes route is blocked for Basic packages", async () => {
  const fixture = await startServer();

  try {
    const loginResult = await login(fixture.baseUrl, {
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
    });
    const headers = authHeaders(loginResult.token);
    const bootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", { headers });
    assert.equal(bootstrap.companyPackage.id, PACKAGE_IDS.BASIC);
    assert.equal(bootstrap.permissions.estimates.canView, true);
    assert.equal(bootstrap.permissions.estimates.canManage, true);
    assert.equal(bootstrap.permissions.estimates.canUseAiRoughNotes, false);
    assert.equal(bootstrap.permissions.estimates.canUseGcPackets, false);

    const denied = await requestJson(fixture.baseUrl, "/api/ai/estimates/rough-notes", {
      method: "POST",
      headers,
      body: JSON.stringify({
        roughNotes: "Demo old sidewalk and pour 300 sf broom finish.",
      }),
    });

    assert.equal(denied.response.status, 403);
    assert.match(denied.payload.error, /AI Rough Notes Helper/i);
    assert.match(denied.payload.error, /current Apex HQ package/i);
  } finally {
    await fixture.stop();
  }
});

test("AI estimate rough notes route keeps field roles blocked", async () => {
  const fixture = await startServer();

  try {
    insertUsers(fixture.sqliteFile, [
      createUserRecord({
        id: "U-EMPLOYEE-AI-ESTIMATES",
        email: "employee-estimate-ai@apexhq.test",
        password: "apexdemo123",
        name: "Employee Estimate AI User",
        role: "Employee",
      }),
    ]);

    const employeeLogin = await login(fixture.baseUrl, {
      email: "employee-estimate-ai@apexhq.test",
      password: "apexdemo123",
    });
    const denied = await requestJson(fixture.baseUrl, "/api/ai/estimates/rough-notes", {
      method: "POST",
      headers: authHeaders(employeeLogin.token),
      body: JSON.stringify({
        roughNotes: "300 sf sidewalk.",
      }),
    });

    assert.equal(denied.response.status, 403);
    assert.match(denied.payload.error, /permission/i);
  } finally {
    await fixture.stop();
  }
});

test("frontend code does not include OpenAI keys or direct OpenAI API calls for estimate rough notes", async () => {
  const frontendFiles = [
    "src/App.jsx",
    "src/api.js",
  ];

  for (const file of frontendFiles) {
    const contents = await fs.readFile(file, "utf8");
    assert.equal(contents.includes("OPENAI_API_KEY"), false, `${file} must not reference OPENAI_API_KEY.`);
    assert.equal(contents.includes("api.openai.com"), false, `${file} must not call OpenAI directly.`);
  }
});
