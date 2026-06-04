import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import process from "node:process";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { createServerConfig } from "./config.js";

const config = createServerConfig(process.env);
const port = String(config.smokeTestPort);
const baseUrl = `http://localhost:${port}`;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer() {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/ready`);
      if (response.ok) return;
    } catch {
      // Keep polling until the server is ready.
    }
    await sleep(500);
  }

  throw new Error("Server did not become ready.");
}

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const payload = response.status === 204 ? null : await response.json();

  if (!response.ok) {
    throw new Error(payload?.error || `Request failed for ${path}`);
  }

  return payload;
}

async function rawRequest(path, options = {}) {
  return fetch(`${baseUrl}${path}`, options);
}

async function expectStatus(path, expectedStatus, options = {}) {
  const response = await rawRequest(path, options);
  if (response.status !== expectedStatus) {
    throw new Error(`Expected ${path} to return ${expectedStatus}, received ${response.status}.`);
  }
  return response;
}

function assertSecurityHeaders(response, { production = false } = {}) {
  const expectedHeaders = {
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "referrer-policy": "no-referrer",
    "cross-origin-opener-policy": "same-origin",
    "permissions-policy": "geolocation=(self), microphone=(self), payment=(), usb=()",
  };

  for (const [header, expected] of Object.entries(expectedHeaders)) {
    const actual = response.headers.get(header);
    if (actual !== expected) {
      throw new Error(`Expected ${header} to be ${expected}, received ${actual}.`);
    }
  }

  const csp = response.headers.get("content-security-policy") || "";
  for (const directive of ["default-src 'self'", "frame-ancestors 'none'", "frame-src 'self' blob:", "object-src 'none'", "form-action 'self'", "connect-src 'self' blob:"]) {
    if (!csp.includes(directive)) {
      throw new Error(`Expected CSP header to include ${directive}.`);
    }
  }
  if (response.headers.get("content-security-policy-report-only")) {
    throw new Error("Expected CSP to be enforced instead of report-only.");
  }

  const hsts = response.headers.get("strict-transport-security");
  if (production && hsts !== "max-age=15552000; includeSubDomains") {
    throw new Error(`Expected production HSTS header, received ${hsts}.`);
  }
  if (!production && hsts) {
    throw new Error("Expected non-production responses to omit HSTS.");
  }
}

function waitForExit(childProcess) {
  return new Promise((resolve) => {
    childProcess.once("exit", resolve);
  });
}

function cookieHeaderFromResponse(response) {
  const setCookies = typeof response.headers.getSetCookie === "function"
    ? response.headers.getSetCookie()
    : (response.headers.get("set-cookie") || "").split(/,\s*(?=[^;,]+=)/).filter(Boolean);
  return setCookies.map((cookie) => cookie.split(";")[0]).join("; ");
}

async function runProductionSetupBootstrapTest() {
  const setupPort = String(Number(port) + 1);
  const setupBaseUrl = `http://localhost:${setupPort}`;
  const tempDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "concrete-ops-setup-"));
  const server = spawn(process.execPath, ["server/index.js"], {
    stdio: "inherit",
    env: {
      ...process.env,
      NODE_ENV: "production",
      PORT: setupPort,
      DATA_DIR: tempDataDir,
      SEED_DEMO_DATA: "false",
      LOG_LEVEL: "warn",
    },
  });

  async function setupRequest(pathname, options = {}) {
    const response = await fetch(`${setupBaseUrl}${pathname}`, options);
    const payload = response.status === 204 ? null : await response.json();

    if (!response.ok) {
      throw new Error(payload?.error || `Request failed for ${pathname}`);
    }

    return payload;
  }

  try {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      try {
        const response = await fetch(`${setupBaseUrl}/api/ready`);
        if (response.ok) break;
      } catch {
        // Keep polling until the setup server is ready.
      }
      await sleep(500);

      if (attempt === 19) {
        throw new Error("Production setup server did not become ready.");
      }
    }

    const productionHealth = await fetch(`${setupBaseUrl}/api/health`, {
      headers: { Origin: "https://app.apexhq.online" },
    });
    assertSecurityHeaders(productionHealth, { production: true });
    if (productionHealth.headers.get("access-control-allow-origin") !== "https://app.apexhq.online") {
      throw new Error("Expected production CORS to allow the Apex HQ app origin.");
    }

    const blockedOriginHealth = await fetch(`${setupBaseUrl}/api/health`, {
      headers: { Origin: "https://example.invalid" },
    });
    if (blockedOriginHealth.headers.get("access-control-allow-origin")) {
      throw new Error("Expected production CORS to omit access-control-allow-origin for unapproved origins.");
    }

    const setupStatus = await setupRequest("/api/setup/status");
    if (!setupStatus.needsSetup || setupStatus.demoMode || setupStatus.hasUsers) {
      throw new Error("Expected production setup mode to start without users or demo data.");
    }

    const demoLoginResponse = await fetch(`${setupBaseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "demo.ops@apexhq.app",
        password: "apexdemo123",
      }),
    });
    if (demoLoginResponse.status !== 401) {
      throw new Error(`Expected demo login to fail in production setup mode, received ${demoLoginResponse.status}.`);
    }

    const bootstrapResponse = await fetch(`${setupBaseUrl}/api/setup/bootstrap-admin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Production Admin",
        email: "admin@example.com",
        password: "pouring123",
        role: "Administrator",
      }),
    });
    const bootstrap = await bootstrapResponse.json();
    if (!bootstrapResponse.ok) {
      throw new Error(bootstrap?.error || "Production bootstrap-admin failed.");
    }

    const bootstrapCookieHeader = cookieHeaderFromResponse(bootstrapResponse);
    if (bootstrap.token || !bootstrap.csrfToken || !bootstrapCookieHeader.includes("apex_hq_session=") || bootstrap.user?.email !== "admin@example.com") {
      throw new Error("Expected bootstrap-admin to create an HttpOnly cookie session for the first admin.");
    }

    const bootstrapHeaders = {
      Cookie: bootstrapCookieHeader,
    };
    const workspace = await setupRequest("/api/bootstrap", { headers: bootstrapHeaders });
    if (workspace.user?.email !== "admin@example.com") {
      throw new Error("Expected bootstrapped admin session to access the workspace.");
    }

    const resetResponse = await fetch(`${setupBaseUrl}/api/reset`, {
      method: "POST",
      headers: {
        ...bootstrapHeaders,
        "X-CSRF-Token": bootstrap.csrfToken,
      },
    });
    if (resetResponse.status !== 403) {
      throw new Error(`Expected reset to be disabled when demo data is off, received ${resetResponse.status}.`);
    }
  } finally {
    server.kill("SIGTERM");
    await waitForExit(server);
    await fs.rm(tempDataDir, { recursive: true, force: true });
  }
}

async function run() {
  const tempDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "concrete-ops-smoke-"));
  const sqliteFile = path.join(tempDataDir, "app-data.sqlite");
  const server = spawn(process.execPath, ["server/index.js"], {
    stdio: "inherit",
    env: {
      ...process.env,
      PORT: port,
      DATA_DIR: tempDataDir,
    },
  });
  let database;

  try {
    await waitForServer();

    const healthResponse = await rawRequest("/api/health");
    assertSecurityHeaders(healthResponse);
    const localOriginHealth = await fetch(`${baseUrl}/api/health`, {
      headers: { Origin: "http://localhost:5173" },
    });
    if (localOriginHealth.headers.get("access-control-allow-origin") !== "http://localhost:5173") {
      throw new Error("Expected non-production CORS to preserve local development access.");
    }
    const health = await healthResponse.json();
    if (health.status !== "healthy") {
      throw new Error(`Expected /api/health to report healthy, received ${health.status}.`);
    }
    const healthRequestId = healthResponse.headers.get("x-request-id");
    if (!healthRequestId || health.requestId !== healthRequestId) {
      throw new Error("Expected /api/health to return a matching request ID header and payload.");
    }

    const readyResponse = await rawRequest("/api/ready");
    const ready = await readyResponse.json();
    if (ready.status !== "ready" || ready.checks?.database !== "ok") {
      throw new Error("Expected /api/ready to confirm database readiness.");
    }
    if ("dataDir" in ready || "sqliteFile" in ready || JSON.stringify(ready).includes(tempDataDir)) {
      throw new Error("Expected /api/ready to avoid exposing internal filesystem paths.");
    }
    const readyRequestId = readyResponse.headers.get("x-request-id");
    if (!readyRequestId || ready.requestId !== readyRequestId) {
      throw new Error("Expected /api/ready to return a matching request ID header and payload.");
    }

    const login = await request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Apex-Auth-Mode": "bearer" },
      body: JSON.stringify({
        email: "demo.ops@apexhq.app",
        password: "apexdemo123",
      }),
    });

    const headers = {
      Authorization: `Bearer ${login.token}`,
      "Content-Type": "application/json",
    };

    const before = await request("/api/bootstrap", { headers });
    const beforeAuditCount = before.auditEvents.length;

    await request("/api/leads", {
      method: "POST",
      headers,
      body: JSON.stringify({
        customer: "Smoke Test Customer",
        city: "Portland",
        project: "API verification",
        priority: "Normal",
        owner: "Office",
        value: 5000,
        nextStep: "Check persistence",
        notes: "Created by the smoke test.",
      }),
    });

    const after = await request("/api/bootstrap", { headers });
    const createdLead = after.leads[0];

    if (after.leads.length !== before.leads.length + 1) {
      throw new Error("Expected the smoke test to create exactly one lead.");
    }
    if (after.auditEvents.length <= beforeAuditCount) {
      throw new Error("Expected lead creation to append an audit event.");
    }
    if (!createdLead?.createdAt || !createdLead?.updatedAt || createdLead.createdAt !== createdLead.updatedAt) {
      throw new Error("Expected newly created leads to include matching createdAt and updatedAt timestamps.");
    }
    const createAudit = after.auditEvents.find((event) => event.entityType === "lead" && event.entityId === createdLead.id && event.action === "created");
    if (!createAudit) {
      throw new Error("Expected lead creation to be captured in audit history.");
    }

    await request(`/api/leads/${createdLead.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        notes: "Timestamp verification update",
      }),
    });

    const updated = await request("/api/bootstrap", { headers });
    const updatedLead = updated.leads.find((lead) => lead.id === createdLead.id);
    if (!updatedLead?.createdAt || !updatedLead?.updatedAt || updatedLead.createdAt === updatedLead.updatedAt) {
      throw new Error("Expected lead updates to preserve createdAt and advance updatedAt.");
    }
    const updateAudit = updated.auditEvents.find((event) => event.entityType === "lead" && event.entityId === createdLead.id && event.action === "updated");
    if (!updateAudit || !updateAudit.changedFields.includes("notes")) {
      throw new Error("Expected lead updates to capture changed fields in audit history.");
    }

    await expectStatus(`/api/leads/${createdLead.id}`, 409, {
      method: "DELETE",
      headers,
    });

    await request(`/api/leads/${createdLead.id}/archive`, {
      method: "POST",
      headers,
    });

    const archived = await request("/api/bootstrap", { headers });
    const archivedLead = archived.leads.find((lead) => lead.id === createdLead.id);
    if (!archivedLead?.archivedAt) {
      throw new Error("Expected archived leads to include archivedAt.");
    }
    const archiveAudit = archived.auditEvents.find((event) => event.entityType === "lead" && event.entityId === createdLead.id && event.action === "archived");
    if (!archiveAudit) {
      throw new Error("Expected lead archive to be captured in audit history.");
    }

    await request(`/api/leads/${createdLead.id}`, {
      method: "DELETE",
      headers,
    });

    const deleted = await request("/api/bootstrap", { headers });
    if (deleted.leads.some((lead) => lead.id === createdLead.id)) {
      throw new Error("Expected archived leads to be deletable.");
    }
    const deleteAudit = deleted.auditEvents.find((event) => event.entityType === "lead" && event.entityId === createdLead.id && event.action === "deleted");
    if (!deleteAudit) {
      throw new Error("Expected lead deletion to be captured in audit history.");
    }

    await expectStatus("/api/leads", 400, {
      method: "POST",
      headers,
      body: JSON.stringify({
        customer: "Invalid Lead",
        city: "Salem",
        project: "Bad enum check",
        priority: "Urgent",
      }),
    });

    await expectStatus("/api/jobs/J-DOES-NOT-EXIST", 404, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        stage: "Waiting",
      }),
    });

    database = new DatabaseSync(sqliteFile);
    database.prepare(`
      UPDATE sessions
      SET expires_at = ?
      WHERE user_id = ?
    `).run(new Date(Date.now() - 60_000).toISOString(), login.user.id);

    const expiredResponse = await rawRequest("/api/bootstrap", { headers });
    if (expiredResponse.status !== 401) {
      throw new Error(`Expected expired session to return 401, received ${expiredResponse.status}.`);
    }
    const expiredPayload = await expiredResponse.json();
    if (!expiredPayload.requestId || expiredResponse.headers.get("x-request-id") !== expiredPayload.requestId) {
      throw new Error("Expected expired session errors to include a matching request ID.");
    }

    await runProductionSetupBootstrapTest();

    console.log(`Smoke test passed: ${before.leads.length} -> ${after.leads.length} leads, validation, expired sessions, and production setup verified`);
  } finally {
    database?.close();
    server.kill("SIGTERM");
    await waitForExit(server);
    await fs.rm(tempDataDir, { recursive: true, force: true });
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
