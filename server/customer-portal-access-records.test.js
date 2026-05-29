import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
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
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/ready`);
      if (response.ok) return;
    } catch {
      // Poll until ready.
    }
    await sleep(250);
  }

  throw new Error(`Customer portal access records test server did not become ready.\n${serverOutput()}`);
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
    throw new Error(`Customer portal access records test server did not stop cleanly. pid=${child.pid}`);
  }
}

async function startServer() {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await startServerAttempt();
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

async function startServerAttempt() {
  const tempDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "apex-customer-portal-access-"));
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

async function login(baseUrl, credentials = {}) {
  return assertOk(baseUrl, "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
      returnToken: true,
      ...credentials,
    }),
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

function insertCompany(sqliteFile, companyId, name = "Portal Other Company") {
  const database = new DatabaseSync(sqliteFile);
  const now = new Date().toISOString();
  try {
    database.prepare(`
      INSERT OR IGNORE INTO companies (id, workspace_id, name, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(companyId, companyId, name, "active", now, now);
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

function insertPortalOwner(sqliteFile, {
  email = `portal-owner-${Date.now()}-${Math.random().toString(16).slice(2)}@apexhq.test`,
  companyId = DEFAULT_COMPANY_ID,
} = {}) {
  const owner = createUserRecord({
    id: `U-PORTAL-OWNER-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    email,
    password: "apexdemo123",
    name: "Portal Owner",
    role: "Owner",
    companyId,
  });
  insertUser(sqliteFile, owner);
  return owner;
}

function insertApprovedEstimateFixture(sqliteFile) {
  const database = new DatabaseSync(sqliteFile);
  const now = new Date().toISOString();
  const unique = Date.now();
  const customerId = `CUST-PORTAL-${unique}`;
  const estimateId = `EST-PORTAL-${unique}`;
  try {
    const owner = database.prepare("SELECT id FROM users WHERE email = ?").get("demo.ops@apexhq.app");
    assert.ok(owner?.id, "Expected seeded demo owner user to exist.");

    database.prepare(`
      INSERT INTO customers (id, sort_index, company_id, name, company, phone, email, city, service_area, status, notes, created_at, updated_at, archived_at)
      VALUES (?, (SELECT COALESCE(MAX(sort_index), -1) + 1 FROM customers), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      customerId,
      DEFAULT_COMPANY_ID,
      "Portal Review Customer",
      "Portal Review Customer",
      "503-555-0140",
      "portal-review@example.test",
      "Salem",
      "Mid-Valley",
      "Active",
      "Self-contained fixture for locked customer portal access record tests.",
      now,
      now,
      null,
    );

    database.prepare(`
      INSERT INTO estimates (
        id, sort_index, company_id, customer_id, lead_id, job_id, customer_email, title, status,
        scope_summary, internal_notes, customer_notes, subtotal, tax_rate, tax_total, fees_total, grand_total,
        created_by, sent_at, sent_by, sent_to, email_subject, provider_message_id, approved_at,
        rejected_at, archived_at, created_at, updated_at
      )
      VALUES (?, (SELECT COALESCE(MAX(sort_index), -1) + 1 FROM estimates), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      estimateId,
      DEFAULT_COMPANY_ID,
      customerId,
      null,
      null,
      "portal-review@example.test",
      "Portal Review Patio",
      "approved",
      "Install broom-finish patio with compacted base and control joints.",
      "Internal margin and crew notes stay excluded from portal access records.",
      "Customer-facing scope has been reviewed for portal readiness.",
      12000,
      0,
      0,
      0,
      12000,
      owner.id,
      now,
      owner.id,
      "portal-review@example.test",
      "Approved proposal for portal review",
      "",
      now,
      null,
      null,
      now,
      now,
    );

    return estimateId;
  } finally {
    database.close();
  }
}

function readAuditEvents(sqliteFile, entityType = "customer_portal_access") {
  const database = new DatabaseSync(sqliteFile);
  try {
    return database.prepare(`
      SELECT entity_type AS entityType, entity_id AS entityId, action, summary, detail
      FROM audit_events
      WHERE entity_type = ?
      ORDER BY sort_index ASC
    `).all(entityType);
  } finally {
    database.close();
  }
}

function forceAccessRecordExpiration(sqliteFile, recordId, expiresAt) {
  const database = new DatabaseSync(sqliteFile);
  try {
    const auditEvent = database.prepare(`
      SELECT id, detail
      FROM audit_events
      WHERE entity_type = 'customer_portal_access'
        AND entity_id = ?
        AND action = 'prepared_locked'
      ORDER BY sort_index DESC
      LIMIT 1
    `).get(recordId);
    assert.ok(auditEvent?.id, "Expected prepared access record audit event to exist.");
    const detail = JSON.parse(auditEvent.detail);
    detail.accessRecord.expiresAt = expiresAt;
    database.prepare("UPDATE audit_events SET detail = ? WHERE id = ?").run(JSON.stringify(detail), auditEvent.id);
  } finally {
    database.close();
  }
}

function expiresIn(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

async function createLockedAccessRecord(fixture, { expiresAt = expiresIn(2), approvalId = "PORTAL-ACCESS-REVIEW-HELPER" } = {}) {
  setCompanyPackage(fixture.sqliteFile, PACKAGE_IDS.ELITE);
  const estimateId = insertApprovedEstimateFixture(fixture.sqliteFile);
  const owner = insertPortalOwner(fixture.sqliteFile);
  const loginResult = await login(fixture.baseUrl, { email: owner.email });
  const headers = authHeaders(loginResult.token);
  const created = await assertOk(fixture.baseUrl, "/api/customer-portal/access-records", {
    method: "POST",
    headers,
    body: JSON.stringify({
      estimateId,
      expiresAt,
      approvalId,
    }),
  });
  return { created, estimateId, headers, owner };
}

test("Elite owner can prepare locked customer portal access records without token material", async () => {
  const fixture = await startServer();

  try {
    setCompanyPackage(fixture.sqliteFile, PACKAGE_IDS.ELITE);
    const estimateId = insertApprovedEstimateFixture(fixture.sqliteFile);
    const owner = insertPortalOwner(fixture.sqliteFile);
    const loginResult = await login(fixture.baseUrl, { email: owner.email });
    const headers = authHeaders(loginResult.token);

    const createdResult = await requestJson(fixture.baseUrl, "/api/customer-portal/access-records", {
      method: "POST",
      headers,
      body: JSON.stringify({
        estimateId,
        expiresAt: expiresIn(2),
        approvalId: "PORTAL-ACCESS-REVIEW-001",
      }),
    });
    assert.equal(createdResult.response.ok, true, `${createdResult.payload?.error || "Request failed"}\n${fixture.serverOutput()}`);
    const created = createdResult.payload;

    assert.equal(created.accessRecord.status, "prepared_locked");
    assert.equal(created.accessRecord.companyId, DEFAULT_COMPANY_ID);
    assert.equal(created.accessRecord.estimateId, estimateId);
    assert.match(created.accessRecord.tokenHashReference, /^sha256:[a-f0-9]{64}$/);
    assert.equal(created.accessRecord.tokenMaterialCreated, false);
    assert.equal(created.accessRecord.canCreateExternalAccess, false);
    assert.equal(created.accessRecord.revocationSupported, true);
    assert.deepEqual(created.accessRecord.allowedSections, ["proposal", "proof_summary", "progress_summary", "reviewed_change_orders"]);
    assert.equal(created.accessPlan.canCreateExternalAccess, false);
    assert.equal(created.accessPlan.tokenMaterialCreated, false);
    assert.equal(created.accessPlan.implementationReady, true);
    assert.equal(JSON.stringify(created).includes("rawToken"), false);
    assert.equal(JSON.stringify(created).includes("publicUrl"), false);
    assert.equal(JSON.stringify(created).includes("shareLink"), false);

    const listed = await assertOk(fixture.baseUrl, "/api/customer-portal/access-records", { headers });
    assert.equal(listed.accessRecords.length, 1);
    assert.equal(listed.accessRecords[0].id, created.accessRecord.id);
    assert.equal(typeof listed.accessRecords[0].auditEventId, "string");
    assert.notEqual(listed.accessRecords[0].auditEventId, "");

    const auditEvents = readAuditEvents(fixture.sqliteFile);
    assert.equal(auditEvents.length, 1);
    assert.equal(auditEvents[0].action, "prepared_locked");
    assert.equal(auditEvents[0].entityId, created.accessRecord.id);
    assert.equal(auditEvents[0].detail.includes("tokenHashReference"), true);
    assert.equal(auditEvents[0].detail.includes("rawToken"), false);
  } finally {
    await fixture.stop();
  }
});

test("Customer portal access records require the Elite package", async () => {
  const fixture = await startServer();

  try {
    setCompanyPackage(fixture.sqliteFile, PACKAGE_IDS.PREMIUM);
    const estimateId = insertApprovedEstimateFixture(fixture.sqliteFile);
    const owner = insertPortalOwner(fixture.sqliteFile);
    const loginResult = await login(fixture.baseUrl, { email: owner.email });
    const headers = authHeaders(loginResult.token);

    const deniedList = await requestJson(fixture.baseUrl, "/api/customer-portal/access-records", { headers });
    assert.equal(deniedList.response.status, 403);

    const deniedCreate = await requestJson(fixture.baseUrl, "/api/customer-portal/access-records", {
      method: "POST",
      headers,
      body: JSON.stringify({
        estimateId,
        expiresAt: expiresIn(2),
        approvalId: "PORTAL-ACCESS-REVIEW-PREMIUM",
      }),
    });
    assert.equal(deniedCreate.response.status, 403);
    assert.equal(readAuditEvents(fixture.sqliteFile).length, 0);
  } finally {
    await fixture.stop();
  }
});

test("Customer portal access records require owner or admin role", async () => {
  const fixture = await startServer();

  try {
    setCompanyPackage(fixture.sqliteFile, PACKAGE_IDS.ELITE);
    const estimateId = insertApprovedEstimateFixture(fixture.sqliteFile);
    const fieldUser = createUserRecord({
      id: "U-PORTAL-FIELD",
      email: "portal-field@apexhq.test",
      password: "apexdemo123",
      name: "Portal Field User",
      role: "Employee",
    });
    insertUser(fixture.sqliteFile, fieldUser);

    const loginResult = await login(fixture.baseUrl, { email: fieldUser.email });
    const headers = authHeaders(loginResult.token);
    const denied = await requestJson(fixture.baseUrl, "/api/customer-portal/access-records", {
      method: "POST",
      headers,
      body: JSON.stringify({
        estimateId,
        expiresAt: expiresIn(2),
        approvalId: "PORTAL-ACCESS-REVIEW-FIELD",
      }),
    });

    assert.equal(denied.response.status, 403);
    assert.equal(readAuditEvents(fixture.sqliteFile).length, 0);
  } finally {
    await fixture.stop();
  }
});

test("Customer portal access records reject external access payload fields", async () => {
  const fixture = await startServer();

  try {
    setCompanyPackage(fixture.sqliteFile, PACKAGE_IDS.ELITE);
    const estimateId = insertApprovedEstimateFixture(fixture.sqliteFile);
    const owner = insertPortalOwner(fixture.sqliteFile);
    const loginResult = await login(fixture.baseUrl, { email: owner.email });
    const headers = authHeaders(loginResult.token);

    const denied = await requestJson(fixture.baseUrl, "/api/customer-portal/access-records", {
      method: "POST",
      headers,
      body: JSON.stringify({
        estimateId,
        expiresAt: expiresIn(2),
        approvalId: "PORTAL-ACCESS-REVIEW-UNSAFE",
        publicUrl: "https://customer.example.test/portal",
      }),
    });

    assert.equal(denied.response.status, 400);
    assert.match(denied.payload.error, /cannot include external access/i);
    assert.equal(readAuditEvents(fixture.sqliteFile).length, 0);
  } finally {
    await fixture.stop();
  }
});

test("Customer portal access records enforce bounded expiration readiness", async () => {
  const fixture = await startServer();

  try {
    setCompanyPackage(fixture.sqliteFile, PACKAGE_IDS.ELITE);
    const estimateId = insertApprovedEstimateFixture(fixture.sqliteFile);
    const owner = insertPortalOwner(fixture.sqliteFile);
    const loginResult = await login(fixture.baseUrl, { email: owner.email });
    const headers = authHeaders(loginResult.token);

    const denied = await requestJson(fixture.baseUrl, "/api/customer-portal/access-records", {
      method: "POST",
      headers,
      body: JSON.stringify({
        estimateId,
        expiresAt: expiresIn(20),
        approvalId: "PORTAL-ACCESS-REVIEW-LONG-TTL",
      }),
    });

    assert.equal(denied.response.status, 400);
    assert.match(denied.payload.error, /Expiration must be valid/i);
    assert.equal(readAuditEvents(fixture.sqliteFile).length, 0);
  } finally {
    await fixture.stop();
  }
});

test("Elite owner can revoke locked customer portal access records without creating external access", async () => {
  const fixture = await startServer();

  try {
    const { created, headers } = await createLockedAccessRecord(fixture, {
      approvalId: "PORTAL-ACCESS-REVIEW-REVOKE",
    });

    const revoked = await assertOk(fixture.baseUrl, `/api/customer-portal/access-records/${created.accessRecord.id}/revoke`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        reason: "Customer asked us to pause the review packet.",
      }),
    });

    assert.equal(revoked.accessRecord.id, created.accessRecord.id);
    assert.equal(revoked.accessRecord.status, "revoked_locked");
    assert.notEqual(revoked.accessRecord.revokedAt, "");
    assert.equal(revoked.accessRecord.canCreateExternalAccess, false);
    assert.equal(revoked.accessRecord.tokenMaterialCreated, false);
    assert.equal(revoked.lifecycle.action, "revoked_locked");
    assert.equal(JSON.stringify(revoked).includes("rawToken"), false);
    assert.equal(JSON.stringify(revoked).includes("publicUrl"), false);

    const listed = await assertOk(fixture.baseUrl, "/api/customer-portal/access-records", { headers });
    assert.equal(listed.accessRecords.length, 1);
    assert.equal(listed.accessRecords[0].status, "revoked_locked");
    assert.equal(listed.accessRecords[0].lifecycleEvents.some((event) => event.action === "revoked_locked"), true);

    const deniedSecondRevoke = await requestJson(fixture.baseUrl, `/api/customer-portal/access-records/${created.accessRecord.id}/revoke`, {
      method: "POST",
      headers,
      body: JSON.stringify({ reason: "Duplicate revoke should be blocked." }),
    });
    assert.equal(deniedSecondRevoke.response.status, 409);

    const auditEvents = readAuditEvents(fixture.sqliteFile);
    assert.deepEqual(new Set(auditEvents.map((event) => event.action)), new Set(["prepared_locked", "revoked_locked"]));
    const revokeAuditEvent = auditEvents.find((event) => event.action === "revoked_locked");
    assert.equal(revokeAuditEvent.detail.includes("Customer asked us to pause"), true);
    assert.equal(revokeAuditEvent.detail.includes("rawToken"), false);
    assert.equal(revokeAuditEvent.detail.includes("publicUrl"), false);
  } finally {
    await fixture.stop();
  }
});

test("Customer portal access records derive expired status without background mutation", async () => {
  const fixture = await startServer();

  try {
    const { created, headers } = await createLockedAccessRecord(fixture, {
      approvalId: "PORTAL-ACCESS-REVIEW-EXPIRED",
    });
    forceAccessRecordExpiration(fixture.sqliteFile, created.accessRecord.id, new Date(Date.now() - 60_000).toISOString());

    const listed = await assertOk(fixture.baseUrl, "/api/customer-portal/access-records", { headers });
    assert.equal(listed.accessRecords.length, 1);
    assert.equal(listed.accessRecords[0].id, created.accessRecord.id);
    assert.equal(listed.accessRecords[0].status, "expired_locked");
    assert.equal(listed.accessRecords[0].revokedAt, "");
    assert.equal(readAuditEvents(fixture.sqliteFile).length, 1);
  } finally {
    await fixture.stop();
  }
});

test("Customer portal access record revocation is tenant scoped", async () => {
  const fixture = await startServer();

  try {
    const { created } = await createLockedAccessRecord(fixture, {
      approvalId: "PORTAL-ACCESS-REVIEW-TENANT-A",
    });
    const otherCompanyId = "COMPANY-PORTAL-OTHER";
    insertCompany(fixture.sqliteFile, otherCompanyId);
    setCompanyPackage(fixture.sqliteFile, PACKAGE_IDS.ELITE, otherCompanyId);
    const otherOwner = insertPortalOwner(fixture.sqliteFile, {
      email: "portal-other-owner@apexhq.test",
      companyId: otherCompanyId,
    });
    const otherLogin = await login(fixture.baseUrl, { email: otherOwner.email });
    const otherHeaders = authHeaders(otherLogin.token);

    const otherList = await assertOk(fixture.baseUrl, "/api/customer-portal/access-records", { headers: otherHeaders });
    assert.deepEqual(otherList.accessRecords, []);

    const denied = await requestJson(fixture.baseUrl, `/api/customer-portal/access-records/${created.accessRecord.id}/revoke`, {
      method: "POST",
      headers: otherHeaders,
      body: JSON.stringify({ reason: "Cross-company revoke attempt." }),
    });
    assert.equal(denied.response.status, 404);
    assert.equal(readAuditEvents(fixture.sqliteFile).length, 1);
  } finally {
    await fixture.stop();
  }
});

test("Field users cannot revoke customer portal access records by direct API call", async () => {
  const fixture = await startServer();

  try {
    const { created } = await createLockedAccessRecord(fixture, {
      approvalId: "PORTAL-ACCESS-REVIEW-FIELD-REVOKE",
    });
    const fieldUser = createUserRecord({
      id: "U-PORTAL-FIELD-REVOKE",
      email: "portal-field-revoke@apexhq.test",
      password: "apexdemo123",
      name: "Portal Field Revoke User",
      role: "Employee",
    });
    insertUser(fixture.sqliteFile, fieldUser);
    const fieldLogin = await login(fixture.baseUrl, { email: fieldUser.email });
    const fieldHeaders = authHeaders(fieldLogin.token);

    const denied = await requestJson(fixture.baseUrl, `/api/customer-portal/access-records/${created.accessRecord.id}/revoke`, {
      method: "POST",
      headers: fieldHeaders,
      body: JSON.stringify({ reason: "Field users cannot revoke." }),
    });
    assert.equal(denied.response.status, 403);
    assert.equal(readAuditEvents(fixture.sqliteFile).length, 1);
  } finally {
    await fixture.stop();
  }
});

test("Public customer portal route is locked and does not serve access-record data", async () => {
  const fixture = await startServer();

  try {
    const { created } = await createLockedAccessRecord(fixture, {
      approvalId: "PORTAL-ACCESS-REVIEW-PUBLIC-LOCK",
    });

    const publicRoute = await requestJson(fixture.baseUrl, `/portal/${created.accessRecord.id}`);
    assert.equal(publicRoute.response.status, 423);
    assert.equal(publicRoute.payload.status, "locked");
    assert.equal(publicRoute.payload.code, "customer_portal_public_route_locked");
    assert.equal(publicRoute.payload.publicRouteEnabled, false);
    assert.equal(publicRoute.payload.canServeCustomerData, false);
    assert.equal(publicRoute.payload.canRedeemToken, false);
    assert.equal(publicRoute.payload.canAcceptCustomerAction, false);
    assert.match(publicRoute.payload.denialReasons.join(" "), /TOKENIZED_CUSTOMER_PORTAL_SEPARATELY_APPROVED/);

    const serialized = JSON.stringify(publicRoute.payload);
    assert.equal(serialized.includes("Portal Review Customer"), false);
    assert.equal(serialized.includes("Portal Review Patio"), false);
    assert.equal(serialized.includes("tokenHashReference"), false);
    assert.equal(serialized.includes(created.accessRecord.tokenHashReference), false);
    assert.equal(serialized.includes("Internal margin"), false);
  } finally {
    await fixture.stop();
  }
});

test("Public customer portal route denies missing and malformed access ids without customer data", async () => {
  const fixture = await startServer();

  try {
    const missing = await requestJson(fixture.baseUrl, "/portal");
    assert.equal(missing.response.status, 423);
    assert.match(missing.payload.denialReasons.join(" "), /Missing public portal access id/);
    assert.equal(missing.payload.canServeCustomerData, false);
    assert.equal(missing.payload.canRedeemToken, false);

    const malformed = await requestJson(fixture.baseUrl, "/portal/bad%20access%20id");
    assert.equal(malformed.response.status, 423);
    assert.match(malformed.payload.denialReasons.join(" "), /Malformed public portal access id/);
    assert.equal(malformed.payload.canServeCustomerData, false);
    assert.equal(malformed.payload.canAcceptCustomerAction, false);
  } finally {
    await fixture.stop();
  }
});

test("Elite owner can build an internal packet from an active locked access record", async () => {
  const fixture = await startServer();

  try {
    const { created, headers } = await createLockedAccessRecord(fixture, {
      approvalId: "PORTAL-ACCESS-REVIEW-PACKET",
    });

    const packetResult = await assertOk(fixture.baseUrl, `/api/customer-portal/access-records/${created.accessRecord.id}/packet`, {
      headers,
    });

    assert.equal(packetResult.packet.accessRecordId, created.accessRecord.id);
    assert.equal(packetResult.packet.status, "prepared_locked");
    assert.equal(packetResult.packet.estimateId, created.accessRecord.estimateId);
    assert.match(packetResult.packet.packet, /Apex HQ Customer Portal Manual Approval Preview/);
    assert.match(packetResult.packet.packet, /Portal Review Customer/);
    assert.match(packetResult.packet.packet, /Portal Review Patio/);
    assert.match(packetResult.boundary, /Internal owner\/admin review packet only/);

    const serialized = JSON.stringify(packetResult);
    assert.equal(serialized.includes(created.accessRecord.tokenHashReference), false);
    assert.equal(serialized.includes("tokenHashReference"), false);
    assert.equal(serialized.includes("auditEventId"), false);
    assert.equal(serialized.includes("preparedAuditEventId"), false);
    assert.equal(serialized.includes("Internal margin and crew notes"), false);
    assert.equal(serialized.includes("secret-session-token"), false);
    assert.equal(serialized.includes("publicUrl"), false);
    assert.equal(serialized.includes("rawToken"), false);
  } finally {
    await fixture.stop();
  }
});

test("Access-record packets require the Elite package", async () => {
  const fixture = await startServer();

  try {
    setCompanyPackage(fixture.sqliteFile, PACKAGE_IDS.PREMIUM);
    const estimateId = insertApprovedEstimateFixture(fixture.sqliteFile);
    const owner = insertPortalOwner(fixture.sqliteFile);
    const loginResult = await login(fixture.baseUrl, { email: owner.email });
    const headers = authHeaders(loginResult.token);

    const deniedCreate = await requestJson(fixture.baseUrl, "/api/customer-portal/access-records", {
      method: "POST",
      headers,
      body: JSON.stringify({
        estimateId,
        expiresAt: expiresIn(2),
        approvalId: "PORTAL-ACCESS-REVIEW-PACKET-PREMIUM",
      }),
    });
    assert.equal(deniedCreate.response.status, 403);

    const deniedPacket = await requestJson(fixture.baseUrl, "/api/customer-portal/access-records/CPA-NOT-AVAILABLE/packet", { headers });
    assert.equal(deniedPacket.response.status, 403);
  } finally {
    await fixture.stop();
  }
});

test("Access-record packets deny field users and wrong-company users", async () => {
  const fixture = await startServer();

  try {
    const { created } = await createLockedAccessRecord(fixture, {
      approvalId: "PORTAL-ACCESS-REVIEW-PACKET-DENIAL",
    });
    const fieldUser = createUserRecord({
      id: "U-PORTAL-FIELD-PACKET",
      email: "portal-field-packet@apexhq.test",
      password: "apexdemo123",
      name: "Portal Field Packet User",
      role: "Employee",
    });
    insertUser(fixture.sqliteFile, fieldUser);
    const fieldLogin = await login(fixture.baseUrl, { email: fieldUser.email });
    const fieldHeaders = authHeaders(fieldLogin.token);

    const fieldDenied = await requestJson(fixture.baseUrl, `/api/customer-portal/access-records/${created.accessRecord.id}/packet`, {
      headers: fieldHeaders,
    });
    assert.equal(fieldDenied.response.status, 403);

    const otherCompanyId = "COMPANY-PORTAL-PACKET-OTHER";
    insertCompany(fixture.sqliteFile, otherCompanyId);
    setCompanyPackage(fixture.sqliteFile, PACKAGE_IDS.ELITE, otherCompanyId);
    const otherOwner = insertPortalOwner(fixture.sqliteFile, {
      email: "portal-packet-other-owner@apexhq.test",
      companyId: otherCompanyId,
    });
    const otherLogin = await login(fixture.baseUrl, { email: otherOwner.email });
    const otherHeaders = authHeaders(otherLogin.token);
    const wrongCompanyDenied = await requestJson(fixture.baseUrl, `/api/customer-portal/access-records/${created.accessRecord.id}/packet`, {
      headers: otherHeaders,
    });
    assert.equal(wrongCompanyDenied.response.status, 404);
  } finally {
    await fixture.stop();
  }
});

test("Access-record packets fail closed for revoked and expired records", async () => {
  const fixture = await startServer();

  try {
    const active = await createLockedAccessRecord(fixture, {
      approvalId: "PORTAL-ACCESS-REVIEW-PACKET-EXPIRED",
    });
    forceAccessRecordExpiration(fixture.sqliteFile, active.created.accessRecord.id, new Date(Date.now() - 60_000).toISOString());
    const expiredDenied = await requestJson(fixture.baseUrl, `/api/customer-portal/access-records/${active.created.accessRecord.id}/packet`, {
      headers: active.headers,
    });
    assert.equal(expiredDenied.response.status, 409);
    assert.match(expiredDenied.payload.error, /expired/i);

    const revoked = await createLockedAccessRecord(fixture, {
      approvalId: "PORTAL-ACCESS-REVIEW-PACKET-REVOKED",
    });
    await assertOk(fixture.baseUrl, `/api/customer-portal/access-records/${revoked.created.accessRecord.id}/revoke`, {
      method: "POST",
      headers: revoked.headers,
      body: JSON.stringify({ reason: "No longer approved for packet review." }),
    });
    const revokedDenied = await requestJson(fixture.baseUrl, `/api/customer-portal/access-records/${revoked.created.accessRecord.id}/packet`, {
      headers: revoked.headers,
    });
    assert.equal(revokedDenied.response.status, 409);
    assert.match(revokedDenied.payload.error, /revoked/i);
  } finally {
    await fixture.stop();
  }
});

test("Elite owner can request locked customer portal share approval without external sharing", async () => {
  const fixture = await startServer();

  try {
    const { created, headers } = await createLockedAccessRecord(fixture, {
      approvalId: "PORTAL-ACCESS-REVIEW-SHARE-APPROVAL",
    });

    const approvalResult = await assertOk(fixture.baseUrl, `/api/customer-portal/access-records/${created.accessRecord.id}/share-approvals`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        note: "Owner wants this packet reviewed before any future customer portal share.",
      }),
    });

    assert.equal(approvalResult.shareApprovalRequest.status, "requested_locked");
    assert.equal(approvalResult.shareApprovalRequest.accessRecordId, created.accessRecord.id);
    assert.equal(approvalResult.shareApprovalRequest.estimateId, created.accessRecord.estimateId);
    assert.equal(approvalResult.shareApprovalRequest.packetReady, true);
    assert.equal(approvalResult.shareApprovalRequest.approvalRequired, true);
    assert.equal(approvalResult.shareApprovalRequest.externalShareEnabled, false);
    assert.equal(approvalResult.shareApprovalRequest.publicRouteEnabled, false);
    assert.equal(approvalResult.shareApprovalRequest.canCreateExternalAccess, false);
    assert.equal(approvalResult.shareApprovalRequest.canRedeemToken, false);
    assert.equal(approvalResult.shareApprovalRequest.canAcceptCustomerAction, false);
    assert.equal(approvalResult.shareApprovalRequest.tokenMaterialCreated, false);
    assert.equal(approvalResult.shareApprovalRequest.customerMessageSent, false);
    assert.equal(approvalResult.shareApprovalRequest.invoiceCreated, false);
    assert.equal(approvalResult.shareApprovalRequest.paymentCollectionEnabled, false);
    assert.match(approvalResult.packet.packet, /Apex HQ Customer Portal Manual Approval Preview/);
    assert.match(approvalResult.boundary, /Locked internal sharing approval queue only/);

    const serialized = JSON.stringify(approvalResult);
    assert.equal(serialized.includes(created.accessRecord.tokenHashReference), false);
    assert.equal(serialized.includes("tokenHashReference"), false);
    assert.equal(serialized.includes("rawToken"), false);
    assert.equal(serialized.includes("publicUrl"), false);
    assert.equal(serialized.includes("shareLink"), false);
    assert.equal(serialized.includes("paymentLink"), false);
    assert.equal(serialized.includes("invoiceUrl"), false);
    assert.equal(serialized.includes("Internal margin and crew notes"), false);

    const listed = await assertOk(fixture.baseUrl, "/api/customer-portal/share-approvals", { headers });
    assert.equal(listed.shareApprovalRequests.length, 1);
    assert.equal(listed.shareApprovalRequests[0].id, approvalResult.shareApprovalRequest.id);
    assert.equal(listed.shareApprovalRequests[0].accessRecordId, created.accessRecord.id);
    assert.equal(listed.shareApprovalRequests[0].externalShareEnabled, false);

    const shareApprovalEvents = readAuditEvents(fixture.sqliteFile, "customer_portal_share_approval");
    assert.equal(shareApprovalEvents.length, 1);
    assert.equal(shareApprovalEvents[0].action, "requested_locked");
    assert.equal(shareApprovalEvents[0].entityId, approvalResult.shareApprovalRequest.id);
    assert.equal(shareApprovalEvents[0].detail.includes("tokenHashReference"), false);
    assert.equal(shareApprovalEvents[0].detail.includes("rawToken"), false);
    assert.equal(shareApprovalEvents[0].detail.includes("publicUrl"), false);
  } finally {
    await fixture.stop();
  }
});

test("Share approval queue rejects unsafe external payload fields", async () => {
  const fixture = await startServer();

  try {
    const { created, headers } = await createLockedAccessRecord(fixture, {
      approvalId: "PORTAL-ACCESS-REVIEW-SHARE-UNSAFE",
    });

    const denied = await requestJson(fixture.baseUrl, `/api/customer-portal/access-records/${created.accessRecord.id}/share-approvals`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        note: "Unsafe request should fail.",
        shareLink: "https://customer.example.test/portal/abc",
      }),
    });

    assert.equal(denied.response.status, 400);
    assert.match(denied.payload.error, /cannot include external access/i);
    assert.equal(readAuditEvents(fixture.sqliteFile, "customer_portal_share_approval").length, 0);
  } finally {
    await fixture.stop();
  }
});

test("Share approval queue requires Elite owner/admin access", async () => {
  const fixture = await startServer();

  try {
    setCompanyPackage(fixture.sqliteFile, PACKAGE_IDS.PREMIUM);
    const owner = insertPortalOwner(fixture.sqliteFile);
    const ownerLogin = await login(fixture.baseUrl, { email: owner.email });
    const ownerHeaders = authHeaders(ownerLogin.token);

    const deniedList = await requestJson(fixture.baseUrl, "/api/customer-portal/share-approvals", { headers: ownerHeaders });
    assert.equal(deniedList.response.status, 403);

    const deniedCreate = await requestJson(fixture.baseUrl, "/api/customer-portal/access-records/CPA-NOT-AVAILABLE/share-approvals", {
      method: "POST",
      headers: ownerHeaders,
      body: JSON.stringify({ note: "Premium packages cannot queue share approvals." }),
    });
    assert.equal(deniedCreate.response.status, 403);

    setCompanyPackage(fixture.sqliteFile, PACKAGE_IDS.ELITE);
    const estimateId = insertApprovedEstimateFixture(fixture.sqliteFile);
    const fieldUser = createUserRecord({
      id: "U-PORTAL-FIELD-SHARE-APPROVAL",
      email: "portal-field-share-approval@apexhq.test",
      password: "apexdemo123",
      name: "Portal Field Share Approval User",
      role: "Employee",
    });
    insertUser(fixture.sqliteFile, fieldUser);
    const fieldLogin = await login(fixture.baseUrl, { email: fieldUser.email });
    const fieldHeaders = authHeaders(fieldLogin.token);

    const fieldDeniedCreate = await requestJson(fixture.baseUrl, "/api/customer-portal/access-records", {
      method: "POST",
      headers: fieldHeaders,
      body: JSON.stringify({
        estimateId,
        expiresAt: expiresIn(2),
        approvalId: "PORTAL-ACCESS-REVIEW-SHARE-FIELD",
      }),
    });
    assert.equal(fieldDeniedCreate.response.status, 403);

    const fieldDeniedList = await requestJson(fixture.baseUrl, "/api/customer-portal/share-approvals", { headers: fieldHeaders });
    assert.equal(fieldDeniedList.response.status, 403);
    assert.equal(readAuditEvents(fixture.sqliteFile, "customer_portal_share_approval").length, 0);
  } finally {
    await fixture.stop();
  }
});

test("Share approval requests are tenant scoped and fail closed for expired or revoked records", async () => {
  const fixture = await startServer();

  try {
    const active = await createLockedAccessRecord(fixture, {
      approvalId: "PORTAL-ACCESS-REVIEW-SHARE-TENANT",
    });
    const otherCompanyId = "COMPANY-PORTAL-SHARE-OTHER";
    insertCompany(fixture.sqliteFile, otherCompanyId);
    setCompanyPackage(fixture.sqliteFile, PACKAGE_IDS.ELITE, otherCompanyId);
    const otherOwner = insertPortalOwner(fixture.sqliteFile, {
      email: "portal-share-other-owner@apexhq.test",
      companyId: otherCompanyId,
    });
    const otherLogin = await login(fixture.baseUrl, { email: otherOwner.email });
    const otherHeaders = authHeaders(otherLogin.token);

    const wrongCompanyDenied = await requestJson(fixture.baseUrl, `/api/customer-portal/access-records/${active.created.accessRecord.id}/share-approvals`, {
      method: "POST",
      headers: otherHeaders,
      body: JSON.stringify({ note: "Cross-company share approval should not exist." }),
    });
    assert.equal(wrongCompanyDenied.response.status, 404);

    forceAccessRecordExpiration(fixture.sqliteFile, active.created.accessRecord.id, new Date(Date.now() - 60_000).toISOString());
    const expiredDenied = await requestJson(fixture.baseUrl, `/api/customer-portal/access-records/${active.created.accessRecord.id}/share-approvals`, {
      method: "POST",
      headers: active.headers,
      body: JSON.stringify({ note: "Expired records cannot be queued." }),
    });
    assert.equal(expiredDenied.response.status, 409);
    assert.match(expiredDenied.payload.error, /expired/i);

    const revoked = await createLockedAccessRecord(fixture, {
      approvalId: "PORTAL-ACCESS-REVIEW-SHARE-REVOKED",
    });
    await assertOk(fixture.baseUrl, `/api/customer-portal/access-records/${revoked.created.accessRecord.id}/revoke`, {
      method: "POST",
      headers: revoked.headers,
      body: JSON.stringify({ reason: "No share approval review." }),
    });
    const revokedDenied = await requestJson(fixture.baseUrl, `/api/customer-portal/access-records/${revoked.created.accessRecord.id}/share-approvals`, {
      method: "POST",
      headers: revoked.headers,
      body: JSON.stringify({ note: "Revoked records cannot be queued." }),
    });
    assert.equal(revokedDenied.response.status, 409);
    assert.match(revokedDenied.payload.error, /revoked/i);
    assert.equal(readAuditEvents(fixture.sqliteFile, "customer_portal_share_approval").length, 0);
  } finally {
    await fixture.stop();
  }
});

test("Elite owner can review a locked share approval without enabling external access", async () => {
  const fixture = await startServer();

  try {
    const { created, headers } = await createLockedAccessRecord(fixture, {
      approvalId: "PORTAL-ACCESS-REVIEW-SHARE-DECISION",
    });
    const approvalResult = await assertOk(fixture.baseUrl, `/api/customer-portal/access-records/${created.accessRecord.id}/share-approvals`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        note: "Review packet before the future external gate.",
      }),
    });

    const reviewed = await assertOk(fixture.baseUrl, `/api/customer-portal/share-approvals/${approvalResult.shareApprovalRequest.id}/review`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        decision: "ready_for_external_gate_review_locked",
        note: "Packet is ready for a separate future gate. password=do-not-store",
      }),
    });

    assert.equal(reviewed.shareApprovalRequest.id, approvalResult.shareApprovalRequest.id);
    assert.equal(reviewed.shareApprovalRequest.status, "ready_for_external_gate_review_locked");
    assert.notEqual(reviewed.shareApprovalRequest.reviewedAt, "");
    assert.equal(reviewed.shareApprovalRequest.externalShareEnabled, false);
    assert.equal(reviewed.shareApprovalRequest.publicRouteEnabled, false);
    assert.equal(reviewed.shareApprovalRequest.canCreateExternalAccess, false);
    assert.equal(reviewed.shareApprovalRequest.canRedeemToken, false);
    assert.equal(reviewed.shareApprovalRequest.canAcceptCustomerAction, false);
    assert.equal(reviewed.shareApprovalRequest.customerMessageSent, false);
    assert.equal(reviewed.shareApprovalRequest.invoiceCreated, false);
    assert.equal(reviewed.shareApprovalRequest.paymentCollectionEnabled, false);
    assert.match(reviewed.shareApprovalRequest.reviewNote, /\[REDACTED\]/);

    const serialized = JSON.stringify(reviewed);
    assert.equal(serialized.includes(created.accessRecord.tokenHashReference), false);
    assert.equal(serialized.includes("tokenHashReference"), false);
    assert.equal(serialized.includes("rawToken"), false);
    assert.equal(serialized.includes("publicUrl"), false);
    assert.equal(serialized.includes("shareLink"), false);
    assert.equal(serialized.includes("do-not-store"), false);

    const listed = await assertOk(fixture.baseUrl, "/api/customer-portal/share-approvals", { headers });
    assert.equal(listed.shareApprovalRequests.length, 1);
    assert.equal(listed.shareApprovalRequests[0].status, "ready_for_external_gate_review_locked");
    assert.equal(listed.shareApprovalRequests[0].reviewEvents.some((event) => event.action === "ready_for_external_gate_review_locked"), true);

    const duplicate = await requestJson(fixture.baseUrl, `/api/customer-portal/share-approvals/${approvalResult.shareApprovalRequest.id}/review`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        decision: "changes_requested_locked",
        note: "Duplicate review should be blocked.",
      }),
    });
    assert.equal(duplicate.response.status, 409);

    const shareApprovalEvents = readAuditEvents(fixture.sqliteFile, "customer_portal_share_approval");
    assert.deepEqual(new Set(shareApprovalEvents.map((event) => event.action)), new Set(["requested_locked", "ready_for_external_gate_review_locked"]));
    assert.equal(shareApprovalEvents.some((event) => event.detail.includes("do-not-store")), false);
  } finally {
    await fixture.stop();
  }
});

test("Share approval review denies unsafe payloads, field users, and wrong-company users", async () => {
  const fixture = await startServer();

  try {
    const { created, headers } = await createLockedAccessRecord(fixture, {
      approvalId: "PORTAL-ACCESS-REVIEW-SHARE-DECISION-DENIAL",
    });
    const approvalResult = await assertOk(fixture.baseUrl, `/api/customer-portal/access-records/${created.accessRecord.id}/share-approvals`, {
      method: "POST",
      headers,
      body: JSON.stringify({ note: "Prepare a locked queue item for review denial tests." }),
    });

    const unsafe = await requestJson(fixture.baseUrl, `/api/customer-portal/share-approvals/${approvalResult.shareApprovalRequest.id}/review`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        decision: "changes_requested_locked",
        publicUrl: "https://customer.example.test/portal/abc",
      }),
    });
    assert.equal(unsafe.response.status, 400);

    const fieldUser = createUserRecord({
      id: "U-PORTAL-FIELD-SHARE-REVIEW",
      email: "portal-field-share-review@apexhq.test",
      password: "apexdemo123",
      name: "Portal Field Share Review User",
      role: "Employee",
    });
    insertUser(fixture.sqliteFile, fieldUser);
    const fieldLogin = await login(fixture.baseUrl, { email: fieldUser.email });
    const fieldDenied = await requestJson(fixture.baseUrl, `/api/customer-portal/share-approvals/${approvalResult.shareApprovalRequest.id}/review`, {
      method: "POST",
      headers: authHeaders(fieldLogin.token),
      body: JSON.stringify({ decision: "rejected_locked", note: "Field users cannot review." }),
    });
    assert.equal(fieldDenied.response.status, 403);

    const otherCompanyId = "COMPANY-PORTAL-SHARE-REVIEW-OTHER";
    insertCompany(fixture.sqliteFile, otherCompanyId);
    setCompanyPackage(fixture.sqliteFile, PACKAGE_IDS.ELITE, otherCompanyId);
    const otherOwner = insertPortalOwner(fixture.sqliteFile, {
      email: "portal-share-review-other-owner@apexhq.test",
      companyId: otherCompanyId,
    });
    const otherLogin = await login(fixture.baseUrl, { email: otherOwner.email });
    const wrongCompanyDenied = await requestJson(fixture.baseUrl, `/api/customer-portal/share-approvals/${approvalResult.shareApprovalRequest.id}/review`, {
      method: "POST",
      headers: authHeaders(otherLogin.token),
      body: JSON.stringify({ decision: "rejected_locked", note: "Cross-company review should not exist." }),
    });
    assert.equal(wrongCompanyDenied.response.status, 404);
    assert.equal(readAuditEvents(fixture.sqliteFile, "customer_portal_share_approval").length, 1);
  } finally {
    await fixture.stop();
  }
});

test("Share approval review fails closed when the underlying access record expires or is revoked", async () => {
  const fixture = await startServer();

  try {
    const expired = await createLockedAccessRecord(fixture, {
      approvalId: "PORTAL-ACCESS-REVIEW-SHARE-DECISION-EXPIRED",
    });
    const expiredApproval = await assertOk(fixture.baseUrl, `/api/customer-portal/access-records/${expired.created.accessRecord.id}/share-approvals`, {
      method: "POST",
      headers: expired.headers,
      body: JSON.stringify({ note: "Queue before expiration." }),
    });
    forceAccessRecordExpiration(fixture.sqliteFile, expired.created.accessRecord.id, new Date(Date.now() - 60_000).toISOString());
    const expiredDenied = await requestJson(fixture.baseUrl, `/api/customer-portal/share-approvals/${expiredApproval.shareApprovalRequest.id}/review`, {
      method: "POST",
      headers: expired.headers,
      body: JSON.stringify({ decision: "ready_for_external_gate_review_locked", note: "Expired access records cannot be readied." }),
    });
    assert.equal(expiredDenied.response.status, 409);
    assert.match(expiredDenied.payload.error, /expired/i);

    const revoked = await createLockedAccessRecord(fixture, {
      approvalId: "PORTAL-ACCESS-REVIEW-SHARE-DECISION-REVOKED",
    });
    const revokedApproval = await assertOk(fixture.baseUrl, `/api/customer-portal/access-records/${revoked.created.accessRecord.id}/share-approvals`, {
      method: "POST",
      headers: revoked.headers,
      body: JSON.stringify({ note: "Queue before revoke." }),
    });
    await assertOk(fixture.baseUrl, `/api/customer-portal/access-records/${revoked.created.accessRecord.id}/revoke`, {
      method: "POST",
      headers: revoked.headers,
      body: JSON.stringify({ reason: "Cancel this share review." }),
    });
    const revokedDenied = await requestJson(fixture.baseUrl, `/api/customer-portal/share-approvals/${revokedApproval.shareApprovalRequest.id}/review`, {
      method: "POST",
      headers: revoked.headers,
      body: JSON.stringify({ decision: "ready_for_external_gate_review_locked", note: "Revoked access records cannot be readied." }),
    });
    assert.equal(revokedDenied.response.status, 409);
    assert.match(revokedDenied.payload.error, /revoked/i);
    assert.equal(readAuditEvents(fixture.sqliteFile, "customer_portal_share_approval").length, 2);
  } finally {
    await fixture.stop();
  }
});
