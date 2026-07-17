import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import http from "node:http";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

import { createUserRecord } from "./store.js";

function extractPdfText(buffer) {
  return Array.from(buffer.toString("latin1").matchAll(/<([0-9A-Fa-f]+)>/g))
    .map((match) => Buffer.from(match[1], "hex").toString("latin1"))
    .join("")
    .replace(/\s+/g, " ");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createPort() {
  return 9400 + Math.floor(Math.random() * 1000);
}

async function waitForServer(baseUrl, serverOutput) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/ready`);
      if (response.ok) return;
    } catch {}
    await sleep(250);
  }

  throw new Error(`Estimate test server did not become ready.\n${serverOutput()}`);
}

async function startServer(envOverrides = {}) {
  const tempDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "concrete-ops-estimates-"));
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

async function startMockEmailApi({ status = 200, payload = { id: "msg_test_123" } } = {}) {
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

function insertUsers(sqliteFile, users) {
  const database = new DatabaseSync(sqliteFile);
  try {
    const insertUser = database.prepare(`
      INSERT INTO users (id, email, name, role, phone, status, created_at, updated_at, last_login_at, password_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const user of users) {
      insertUser.run(
        user.id,
        user.email,
        user.name,
        user.role,
        user.phone || "",
        user.status || "active",
        user.createdAt || new Date().toISOString(),
        user.updatedAt || user.createdAt || new Date().toISOString(),
        user.lastLoginAt || null,
        user.passwordHash,
      );
    }
  } finally {
    database.close();
  }
}

function auditEvents(sqliteFile) {
  const database = new DatabaseSync(sqliteFile);
  try {
    return database.prepare(`
      SELECT entity_type AS entityType, entity_id AS entityId, action, summary, detail, actor_name AS actorName, changed_fields AS changedFields, created_at AS createdAt
      FROM audit_events
      ORDER BY sort_index DESC
    `).all();
  } finally {
    database.close();
  }
}

function buildEstimatePayload({ customerId, leadId = "", ...overrides } = {}) {
  return {
    customerId,
    leadId,
    title: "Martinez Driveway Proposal",
    status: "draft",
    customerEmail: "martinez@example.test",
    proposalPacketType: "commercial",
    scopeSummary: "Replace cracked driveway panels and restore broom-finish apron.",
    internalNotes: "Office-only pricing assumptions stay inside estimates.",
    customerNotes: "Two-day window once approved.",
    taxRate: 8.5,
    feesTotal: 125,
    items: [
      { description: "Concrete placement", quantity: 10, unit: "yd", unitPrice: 185 },
      { description: "Prep and cleanup", quantity: 1, unit: "lot", unitPrice: 650 },
    ],
    ...overrides,
  };
}

function reassignEstimateCompany(sqliteFile, estimateId, companyId) {
  const database = new DatabaseSync(sqliteFile);
  try {
    database.prepare("UPDATE estimates SET company_id = ? WHERE id = ?").run(companyId, estimateId);
  } finally {
    database.close();
  }
}

test("office and estimator users can manage estimates while field roles are blocked", async () => {
  const fixture = await startServer();

  try {
    const estimatorUser = createUserRecord({
      id: "U-EST-ESTIMATOR",
      email: "estimate-estimator@lastyard.test",
      password: "apexdemo123",
      name: "Estimator Sam",
      role: "Estimator",
    });
    const foremanUser = createUserRecord({
      id: "U-EST-FOREMAN",
      email: "estimate-foreman@lastyard.test",
      password: "apexdemo123",
      name: "Field Foreman",
      role: "Foreman",
    });
    const employeeUser = createUserRecord({
      id: "U-EST-EMPLOYEE",
      email: "estimate-employee@lastyard.test",
      password: "apexdemo123",
      name: "Field Employee",
      role: "Employee",
    });

    insertUsers(fixture.sqliteFile, [estimatorUser, foremanUser, employeeUser]);

    const officeLogin = await login(fixture.baseUrl, { email: "demo.ops@apexhq.app", password: "apexdemo123" });
    const estimatorLogin = await login(fixture.baseUrl, { email: estimatorUser.email, password: "apexdemo123" });
    const foremanLogin = await login(fixture.baseUrl, { email: foremanUser.email, password: "apexdemo123" });
    const employeeLogin = await login(fixture.baseUrl, { email: employeeUser.email, password: "apexdemo123" });
    const officeHeaders = authHeaders(officeLogin.token);
    const estimatorHeaders = authHeaders(estimatorLogin.token);
    const foremanHeaders = authHeaders(foremanLogin.token);
    const employeeHeaders = authHeaders(employeeLogin.token);
    const officeBootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", { headers: { Authorization: `Bearer ${officeLogin.token}` } });

    const customerId = officeBootstrap.customers[0].id;
    const leadId = officeBootstrap.leads[0].id;
    await assertOk(fixture.baseUrl, `/api/leads/${leadId}`, {
      method: "PATCH",
      headers: officeHeaders,
      body: JSON.stringify({ trade: "fence" }),
    });

    const createdOfficeState = await assertOk(fixture.baseUrl, "/api/estimates", {
      method: "POST",
      headers: officeHeaders,
      body: JSON.stringify(buildEstimatePayload({ customerId, leadId })),
    });
    const officeEstimate = createdOfficeState.estimates.find((estimate) => estimate.title === "Martinez Driveway Proposal");
    assert.ok(officeEstimate);
    assert.equal(officeEstimate.subtotal, 2500);
    assert.equal(officeEstimate.taxTotal, 212.5);
    assert.equal(officeEstimate.grandTotal, 2837.5);
    assert.equal(officeEstimate.customerEmail, "martinez@example.test");
    assert.equal(officeEstimate.proposalPacketType, "commercial");
    assert.equal(officeEstimate.items.length, 2);

    const blankStarterState = await assertOk(fixture.baseUrl, "/api/estimates", {
      method: "POST",
      headers: officeHeaders,
      body: JSON.stringify(buildEstimatePayload({
        customerId,
        leadId,
        title: "Blank Starter Estimate",
        items: [{ description: "", quantity: 1, unit: "ea", unitPrice: "" }],
      })),
    });
    const blankStarterEstimate = blankStarterState.estimates.find((estimate) => estimate.title === "Blank Starter Estimate");
    assert.ok(blankStarterEstimate);
    assert.equal(blankStarterEstimate.items.length, 0);
    assert.equal(blankStarterEstimate.subtotal, 0);
    assert.equal(blankStarterEstimate.grandTotal, 125);

    const unconfiguredSend = await requestJson(fixture.baseUrl, `/api/estimates/${officeEstimate.id}/send`, {
      method: "POST",
      headers: officeHeaders,
      body: JSON.stringify({ reviewConfirmed: true }),
    });
    assert.equal(unconfiguredSend.response.status, 503);
    assert.match(unconfiguredSend.payload.error, /Email sending is not configured yet/);

    const estimatorState = await assertOk(fixture.baseUrl, "/api/estimates", {
      method: "POST",
      headers: estimatorHeaders,
      body: JSON.stringify(buildEstimatePayload({
        customerId,
        title: "Estimator Patio Proposal",
      })),
    });
    assert.ok(estimatorState.estimates.some((estimate) => estimate.createdBy === estimatorUser.id));

    const deniedForeman = await requestJson(fixture.baseUrl, "/api/estimates", { headers: foremanHeaders });
    const deniedEmployee = await requestJson(fixture.baseUrl, "/api/estimates", { headers: employeeHeaders });
    assert.equal(deniedForeman.response.status, 403);
    assert.equal(deniedEmployee.response.status, 403);
    const deniedForemanSend = await requestJson(fixture.baseUrl, `/api/estimates/${officeEstimate.id}/send`, {
      method: "POST",
      headers: foremanHeaders,
    });
    assert.equal(deniedForemanSend.response.status, 403);

    const foremanBootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", { headers: { Authorization: `Bearer ${foremanLogin.token}` } });
    const employeeBootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", { headers: { Authorization: `Bearer ${employeeLogin.token}` } });
    assert.deepEqual(foremanBootstrap.estimates, []);
    assert.deepEqual(employeeBootstrap.estimates, []);
    assert.equal(foremanBootstrap.jobs.every((job) => !("grandTotal" in job) && !("subtotal" in job)), true);

    const sentState = await assertOk(fixture.baseUrl, `/api/estimates/${officeEstimate.id}`, {
      method: "PATCH",
      headers: officeHeaders,
      body: JSON.stringify({
        ...buildEstimatePayload({ customerId, leadId }),
        title: officeEstimate.title,
        proposalPacketType: "gc",
        status: "sent",
        items: officeEstimate.items,
      }),
    });
    const sentEstimate = sentState.estimates.find((estimate) => estimate.id === officeEstimate.id);
    assert.equal(sentEstimate.status, "sent");
    assert.equal(sentEstimate.proposalPacketType, "gc");
    assert.ok(sentEstimate.sentAt);

    const approvedState = await assertOk(fixture.baseUrl, `/api/estimates/${officeEstimate.id}`, {
      method: "PATCH",
      headers: officeHeaders,
      body: JSON.stringify({
        ...buildEstimatePayload({ customerId, leadId }),
        title: officeEstimate.title,
        status: "approved",
        items: officeEstimate.items,
      }),
    });
    const approvedEstimate = approvedState.estimates.find((estimate) => estimate.id === officeEstimate.id);
    assert.equal(approvedEstimate.status, "approved");
    assert.ok(approvedEstimate.approvedAt);

    const deniedEstimatorConvert = await requestJson(fixture.baseUrl, `/api/estimates/${officeEstimate.id}/convert-to-job`, {
      method: "POST",
      headers: estimatorHeaders,
      body: JSON.stringify({}),
    });
    assert.equal(deniedEstimatorConvert.response.status, 403);
    assert.match(deniedEstimatorConvert.payload.error, /create jobs from estimates/i);

    const deniedForemanConvert = await requestJson(fixture.baseUrl, `/api/estimates/${officeEstimate.id}/convert-to-job`, {
      method: "POST",
      headers: foremanHeaders,
      body: JSON.stringify({}),
    });
    assert.equal(deniedForemanConvert.response.status, 403);

    const deniedEmployeeConvert = await requestJson(fixture.baseUrl, `/api/estimates/${officeEstimate.id}/convert-to-job`, {
      method: "POST",
      headers: employeeHeaders,
      body: JSON.stringify({}),
    });
    assert.equal(deniedEmployeeConvert.response.status, 403);

    const afterDeniedConvertState = await assertOk(fixture.baseUrl, "/api/bootstrap", { headers: officeHeaders });
    const afterDeniedConvertEstimate = afterDeniedConvertState.estimates.find((estimate) => estimate.id === officeEstimate.id);
    assert.equal(Boolean(afterDeniedConvertEstimate.jobId), false);

    const convertedState = await assertOk(fixture.baseUrl, `/api/estimates/${officeEstimate.id}/convert-to-job`, {
      method: "POST",
      headers: officeHeaders,
      body: JSON.stringify({}),
    });
    const convertedEstimate = convertedState.estimates.find((estimate) => estimate.id === officeEstimate.id);
    assert.ok(convertedEstimate.jobId);
    const convertedJob = convertedState.jobs.find((job) => job.id === convertedEstimate.jobId);
    assert.ok(convertedJob);
    assert.equal(convertedJob.customerId, customerId);
    assert.equal(convertedJob.leadId, leadId);
    assert.equal(convertedJob.title, officeEstimate.title);
    assert.equal(convertedJob.scopeSummary, "Replace cracked driveway panels and restore broom-finish apron.");
    assert.equal(convertedJob.status, "draft");
    assert.match(convertedJob.notes, new RegExp(`Created from approved estimate ${officeEstimate.id}: ${officeEstimate.title}\\.`));
    assert.match(convertedJob.notes, /Lead\/project:/);
    assert.match(convertedJob.notes, /Customer notes\/terms: Two-day window once approved\./);
    assert.match(convertedJob.notes, /Next step: schedule the job and assign foreman\/crew\./);
    assert.doesNotMatch(convertedJob.notes, /Office-only pricing assumptions/);
    assert.match(convertedJob.startupNotes, /Trade context: Fencing/);
    assert.match(convertedJob.startupNotes, /Field handoff focus:/);
    assert.match(convertedJob.startupNotes, /Proof photos to collect:/);
    assert.doesNotMatch(convertedJob.startupNotes, /Office-only pricing assumptions/);
  } finally {
    await fixture.stop();
  }
});

test("configured estimate email sends before marking estimate sent", async () => {
  const emailApi = await startMockEmailApi();
  const fixture = await startServer({
    EMAIL_PROVIDER: "resend",
    EMAIL_FROM: "Apex HQ <estimates@example.test>",
    EMAIL_REPLY_TO_DEFAULT: "office@example.test",
    EMAIL_API_KEY: "test-api-key",
    EMAIL_API_URL: emailApi.url,
  });

  try {
    const officeLogin = await login(fixture.baseUrl, { email: "demo.ops@apexhq.app", password: "apexdemo123" });
    const officeHeaders = authHeaders(officeLogin.token);
    const officeBootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", { headers: { Authorization: `Bearer ${officeLogin.token}` } });
    assert.equal(officeBootstrap.email.estimateSendingConfigured, true);

    const customerId = officeBootstrap.customers[0].id;
    const leadId = officeBootstrap.leads[0].id;
    const createdState = await assertOk(fixture.baseUrl, "/api/estimates", {
      method: "POST",
      headers: officeHeaders,
      body: JSON.stringify(buildEstimatePayload({
        customerId,
        leadId,
        customerEmail: "proposal-recipient@example.test",
      })),
    });
    const estimate = createdState.estimates.find((entry) => entry.title === "Martinez Driveway Proposal");

    const blockedWithoutReview = await requestJson(fixture.baseUrl, `/api/estimates/${estimate.id}/send`, {
      method: "POST",
      headers: officeHeaders,
      body: JSON.stringify({}),
    });
    assert.equal(blockedWithoutReview.response.status, 400);
    assert.match(blockedWithoutReview.payload.error, /Confirm human review/i);
    assert.equal(emailApi.requests.length, 0);

    const sentState = await assertOk(fixture.baseUrl, `/api/estimates/${estimate.id}/send`, {
      method: "POST",
      headers: officeHeaders,
      body: JSON.stringify({ reviewConfirmed: true }),
    });

    assert.equal(emailApi.requests.length, 1);
    const request = emailApi.requests[0];
    assert.equal(request.method, "POST");
    assert.equal(request.authorization, "Bearer test-api-key");
    assert.deepEqual(request.body.to, ["proposal-recipient@example.test"]);
    assert.equal(request.body.from, "Apex HQ <estimates@example.test>");
    assert.equal(request.body.reply_to, "office@example.test");
    assert.equal(request.body.subject, "Estimate for Cedar fence replacement estimate");
    assert.match(request.body.text, /Hi Martinez Residence,/);
    assert.match(request.body.text, /Attached is your estimate for Cedar fence replacement estimate\./);
    assert.match(request.body.text, /Please reply to this email if you have any questions or would like to move forward\./);
    assert.doesNotMatch(request.body.text, /Total estimate: \$2,837\.50/);
    assert.doesNotMatch(request.body.text, /Concrete placement/);
    assert.doesNotMatch(request.body.text, /Office-only pricing assumptions/);
    assert.equal(request.body.attachments.length, 1);
    assert.equal(request.body.attachments[0].filename, "Estimate-Martinez-Residence-Cedar-fence-replacement-estimate.pdf");
    const pdfBuffer = Buffer.from(request.body.attachments[0].content, "base64");
    const pdfText = pdfBuffer.toString("latin1");
    const decodedText = extractPdfText(pdfBuffer);
    assert.match(pdfText, /%PDF-1\.3/);
    assert.match(decodedText, /Apex HQ Workspace/);
    assert.match(decodedText, /Martinez Residence/);
    assert.match(decodedText, /Cedar fence replacement estimate/);
    assert.match(decodedText, /Concrete placement/);
    assert.match(decodedText, /PROJECT TOTAL/);
    assert.match(decodedText, /\$2,837\.50/);
    assert.match(decodedText, /Two-day window once approved\./);
    assert.doesNotMatch(decodedText, /Office-only pricing assumptions/);

    assert.equal(sentState.emailSend.sentTo, "proposal-recipient@example.test");
    assert.equal(sentState.emailSend.providerMessageId, "msg_test_123");
    assert.equal(sentState.emailSend.attachmentFilename, "Estimate-Martinez-Residence-Cedar-fence-replacement-estimate.pdf");
    const sentEstimate = sentState.estimates.find((entry) => entry.id === estimate.id);
    assert.equal(sentEstimate.status, "sent");
    assert.ok(sentEstimate.sentAt);
    assert.equal(sentEstimate.sentBy, officeBootstrap.user.id);
    assert.equal(sentEstimate.customerEmail, "proposal-recipient@example.test");
    assert.equal(sentEstimate.sentTo, "proposal-recipient@example.test");
    assert.equal(sentEstimate.emailSubject, "Estimate for Cedar fence replacement estimate");
    assert.equal(sentEstimate.providerMessageId, "msg_test_123");
    const records = auditEvents(fixture.sqliteFile).filter((record) => record.entityId === estimate.id);
    assert.equal(records.some((record) => record.action === "send_review_confirmed"), true);
    assert.equal(records.some((record) => record.action === "sent"), true);
    const reviewRecord = records.find((record) => record.action === "send_review_confirmed");
    const sentRecord = records.find((record) => record.action === "sent");
    assert.equal(new Date(reviewRecord.createdAt).getTime() <= new Date(sentRecord.createdAt).getTime(), true);
    assert.match(reviewRecord.detail, /recipient, scope, total, attachments, exclusions, and terms/i);
    assert.doesNotMatch(reviewRecord.detail, /proposal-recipient@example\.test/i);
  } finally {
    await fixture.stop();
    await emailApi.stop();
  }
});

test("failed estimate email send does not mark estimate sent", async () => {
  const emailApi = await startMockEmailApi({ status: 500, payload: { message: "Provider unavailable" } });
  const fixture = await startServer({
    EMAIL_PROVIDER: "resend",
    EMAIL_FROM: "Apex HQ <estimates@example.test>",
    EMAIL_REPLY_TO_DEFAULT: "office@example.test",
    EMAIL_API_KEY: "test-api-key",
    EMAIL_API_URL: emailApi.url,
  });

  try {
    const officeLogin = await login(fixture.baseUrl, { email: "demo.ops@apexhq.app", password: "apexdemo123" });
    const officeHeaders = authHeaders(officeLogin.token);
    const officeBootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", { headers: { Authorization: `Bearer ${officeLogin.token}` } });
    const createdState = await assertOk(fixture.baseUrl, "/api/estimates", {
      method: "POST",
      headers: officeHeaders,
      body: JSON.stringify(buildEstimatePayload({
        customerId: officeBootstrap.customers[0].id,
        leadId: officeBootstrap.leads[0].id,
      })),
    });
    const estimate = createdState.estimates.find((entry) => entry.title === "Martinez Driveway Proposal");

    const failedSend = await requestJson(fixture.baseUrl, `/api/estimates/${estimate.id}/send`, {
      method: "POST",
      headers: officeHeaders,
      body: JSON.stringify({ reviewConfirmed: true }),
    });
    assert.equal(failedSend.response.status, 502);
    assert.match(failedSend.payload.error, /Provider unavailable/);

    const afterFailureState = await assertOk(fixture.baseUrl, "/api/bootstrap", { headers: { Authorization: `Bearer ${officeLogin.token}` } });
    const afterFailureEstimate = afterFailureState.estimates.find((entry) => entry.id === estimate.id);
    assert.equal(afterFailureEstimate.status, "draft");
    assert.equal(afterFailureEstimate.sentAt, "");
    assert.equal(afterFailureEstimate.sentTo, "");
    const records = auditEvents(fixture.sqliteFile).filter((record) => record.entityId === estimate.id);
    assert.equal(records.some((record) => record.action === "send_review_confirmed"), true);
    assert.equal(records.some((record) => record.action === "sent"), false);
  } finally {
    await fixture.stop();
    await emailApi.stop();
  }
});

test("estimate PDF can be viewed/downloaded without email config and stays company-scoped", async () => {
  const fixture = await startServer();

  try {
    const officeLogin = await login(fixture.baseUrl, { email: "demo.ops@apexhq.app", password: "apexdemo123" });
    const officeHeaders = authHeaders(officeLogin.token);
    const officeBootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", { headers: officeHeaders });
    const customerId = officeBootstrap.customers[0].id;
    const leadId = officeBootstrap.leads[0].id;

    const createdState = await assertOk(fixture.baseUrl, "/api/estimates", {
      method: "POST",
      headers: officeHeaders,
      body: JSON.stringify(buildEstimatePayload({ customerId, leadId })),
    });
    const estimate = createdState.estimates.find((entry) => entry.title === "Martinez Driveway Proposal");
    assert.ok(estimate);

    // Email is NOT configured in this fixture (a send would 503), yet the PDF renders and downloads.
    const inlineResponse = await fetch(`${fixture.baseUrl}/api/estimates/${estimate.id}/pdf`, { headers: authHeaders(officeLogin.token) });
    assert.equal(inlineResponse.status, 200);
    assert.equal(inlineResponse.headers.get("content-type"), "application/pdf");
    assert.match(inlineResponse.headers.get("content-disposition") || "", /^inline; filename=".+\.pdf"/);
    const inlineBuffer = Buffer.from(await inlineResponse.arrayBuffer());
    assert.equal(inlineBuffer.subarray(0, 5).toString("latin1"), "%PDF-");
    assert.ok(inlineBuffer.length > 1000);

    // Customer-facing content rendered; internal-only notes must NOT leak into the PDF.
    const inlineText = extractPdfText(inlineBuffer);
    assert.match(inlineText, /Martinez Driveway Proposal/);
    assert.match(inlineText, /PROJECT TOTAL/);
    assert.doesNotMatch(inlineText, /Office-only/);

    // ?download=1 flips to an attachment disposition and renders the same customer-facing content
    // (same renderer + inputs as the emailed PDF; only the embedded creation timestamp / doc-id differ).
    const downloadResponse = await fetch(`${fixture.baseUrl}/api/estimates/${estimate.id}/pdf?download=1`, { headers: authHeaders(officeLogin.token) });
    assert.equal(downloadResponse.status, 200);
    assert.match(downloadResponse.headers.get("content-disposition") || "", /^attachment; filename=".+\.pdf"/);
    const downloadBuffer = Buffer.from(await downloadResponse.arrayBuffer());
    assert.equal(downloadBuffer.subarray(0, 5).toString("latin1"), "%PDF-");
    const downloadText = extractPdfText(downloadBuffer);
    assert.match(downloadText, /Martinez Driveway Proposal/);
    assert.match(downloadText, /PROJECT TOTAL/);
    assert.doesNotMatch(downloadText, /Office-only/);

    // Company-scoped: once the estimate belongs to another company, the office user is 404'd.
    reassignEstimateCompany(fixture.sqliteFile, estimate.id, "COMPANY-OTHER");
    const crossCompanyResponse = await fetch(`${fixture.baseUrl}/api/estimates/${estimate.id}/pdf`, { headers: authHeaders(officeLogin.token) });
    assert.equal(crossCompanyResponse.status, 404);

    // An unknown estimate id is 404 too.
    const missingResponse = await fetch(`${fixture.baseUrl}/api/estimates/EST-DOES-NOT-EXIST/pdf`, { headers: authHeaders(officeLogin.token) });
    assert.equal(missingResponse.status, 404);
  } finally {
    await fixture.stop();
  }
});
