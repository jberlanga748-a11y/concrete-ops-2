import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

import { createUserRecord } from "./store.js";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createPort() {
  return 8000 + Math.floor(Math.random() * 1000);
}

async function waitForServer(baseUrl, serverOutput) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/ready`);
      if (response.ok) return;
    } catch {}
    await sleep(250);
  }

  throw new Error(`Tool checklist test server did not become ready.\n${serverOutput()}`);
}

async function startServer() {
  const tempDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "concrete-ops-tool-checklist-"));
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

test("tool checklist toggle and role-scoped checklist workflows work without leaking field data", async () => {
  const fixture = await startServer();

  try {
    const foremanUser = createUserRecord({
      id: "U-TC-FOREMAN",
      email: "tool-foreman@lastyard.test",
      password: "concrete123",
      name: "Tool Foreman",
      role: "Foreman",
    });
    const employeeUser = createUserRecord({
      id: "U-TC-EMPLOYEE",
      email: "tool-employee@lastyard.test",
      password: "concrete123",
      name: "Tool Employee",
      role: "Employee",
    });
    const unrelatedEmployee = createUserRecord({
      id: "U-TC-OTHER",
      email: "tool-other@lastyard.test",
      password: "concrete123",
      name: "Other Tool Employee",
      role: "Employee",
    });

    insertUsers(fixture.sqliteFile, [foremanUser, employeeUser, unrelatedEmployee]);

    const opsLogin = await login(fixture.baseUrl, { email: "ops@lastyard.test", password: "concrete123" });
    const officeHeaders = authHeaders(opsLogin.token);

    await assertOk(fixture.baseUrl, "/api/jobs/J-2201/assignments", {
      method: "POST",
      headers: officeHeaders,
      body: JSON.stringify({ userId: foremanUser.id, roleOnJob: "foreman" }),
    });
    await assertOk(fixture.baseUrl, "/api/jobs/J-2201/assignments", {
      method: "POST",
      headers: officeHeaders,
      body: JSON.stringify({ userId: employeeUser.id, roleOnJob: "crew" }),
    });
    await assertOk(fixture.baseUrl, "/api/jobs/J-2192/assignments", {
      method: "POST",
      headers: officeHeaders,
      body: JSON.stringify({ userId: unrelatedEmployee.id, roleOnJob: "crew" }),
    });

    const foremanLogin = await login(fixture.baseUrl, { email: foremanUser.email, password: "concrete123" });
    const employeeLogin = await login(fixture.baseUrl, { email: employeeUser.email, password: "concrete123" });
    const otherLogin = await login(fixture.baseUrl, { email: unrelatedEmployee.email, password: "concrete123" });
    const foremanHeaders = authHeaders(foremanLogin.token);
    const employeeHeaders = authHeaders(employeeLogin.token);
    const otherHeaders = authHeaders(otherLogin.token);

    const disabledState = await assertOk(fixture.baseUrl, "/api/settings/company", {
      method: "PATCH",
      headers: officeHeaders,
      body: JSON.stringify({
        toolChecklistEnabled: false,
        companyName: "Pacific Northwest Concrete Demo",
        logoInitials: "pnc",
        accentColor: "emerald",
      }),
    });
    assert.equal(disabledState.companySettings.toolChecklistEnabled, false);
    assert.equal(disabledState.companySettings.companyName, "Pacific Northwest Concrete Demo");
    assert.equal(disabledState.companySettings.logoInitials, "PNC");
    assert.equal(disabledState.companySettings.accentColor, "emerald");
    const toolChecklistAuditCount = disabledState.auditEvents.filter((event) => /Tool checklist (enabled|disabled)/i.test(event.summary || "")).length;

    const disabledForemanBootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", { headers: foremanHeaders });
    assert.equal(disabledForemanBootstrap.permissions.toolChecklist.canUse, false);
    assert.deepEqual(disabledForemanBootstrap.toolChecklists, []);

    const disabledFieldAccess = await requestJson(fixture.baseUrl, "/api/tool-checklists", { headers: employeeHeaders });
    assert.equal(disabledFieldAccess.response.status, 403);

    const reenabledState = await assertOk(fixture.baseUrl, "/api/settings/company", {
      method: "PATCH",
      headers: officeHeaders,
      body: JSON.stringify({ toolChecklistEnabled: true }),
    });
    assert.equal(reenabledState.companySettings.toolChecklistEnabled, true);
    assert.equal(reenabledState.companySettings.companyName, "Pacific Northwest Concrete Demo");
    assert.equal(reenabledState.companySettings.logoInitials, "PNC");
    assert.equal(reenabledState.companySettings.accentColor, "emerald");

    const brandingOnlyState = await assertOk(fixture.baseUrl, "/api/settings/company", {
      method: "PATCH",
      headers: officeHeaders,
      body: JSON.stringify({
        companyName: "Pacific Northwest Concrete HQ",
        logoInitials: "pc",
        accentColor: "amber",
      }),
    });
    assert.equal(brandingOnlyState.companySettings.toolChecklistEnabled, true);
    assert.equal(brandingOnlyState.companySettings.companyName, "Pacific Northwest Concrete HQ");
    assert.equal(brandingOnlyState.companySettings.logoInitials, "PC");
    assert.equal(brandingOnlyState.companySettings.accentColor, "amber");
    assert.equal(brandingOnlyState.auditEvents[0]?.summary, "Workspace branding updated");
    assert.equal(brandingOnlyState.auditEvents.filter((event) => /Tool checklist (enabled|disabled)/i.test(event.summary || "")).length, toolChecklistAuditCount + 1);

    const companyProfileState = await assertOk(fixture.baseUrl, "/api/settings/company", {
      method: "PATCH",
      headers: officeHeaders,
      body: JSON.stringify({
        businessPhone: "(503) 555-0100",
        businessEmail: "office@pacificnwconcrete.test",
        website: "https://pacificnwconcrete.test",
        businessAddress: "123 Concrete Way, Salem, OR 97301",
        serviceArea: "Salem and Portland metro",
        licenseText: "CCB #123456 · Bonded and insured.",
      }),
    });
    assert.equal(companyProfileState.companySettings.businessPhone, "(503) 555-0100");
    assert.equal(companyProfileState.companySettings.businessEmail, "office@pacificnwconcrete.test");
    assert.equal(companyProfileState.companySettings.website, "https://pacificnwconcrete.test");
    assert.equal(companyProfileState.companySettings.businessAddress, "123 Concrete Way, Salem, OR 97301");
    assert.equal(companyProfileState.companySettings.serviceArea, "Salem and Portland metro");
    assert.equal(companyProfileState.companySettings.licenseText, "CCB #123456 · Bonded and insured.");
    assert.equal(companyProfileState.auditEvents[0]?.summary, "Company profile updated");

    const printPacketState = await assertOk(fixture.baseUrl, "/api/settings/company", {
      method: "PATCH",
      headers: officeHeaders,
      body: JSON.stringify({
        printPacketFooter: "Generated by Concrete Ops for job documentation, field reports, and closeout records.",
        printPacketDisclaimer: "Internal job documentation. Review all details before sharing outside the company.",
      }),
    });
    assert.equal(printPacketState.companySettings.printPacketFooter, "Generated by Concrete Ops for job documentation, field reports, and closeout records.");
    assert.equal(printPacketState.companySettings.printPacketDisclaimer, "Internal job documentation. Review all details before sharing outside the company.");
    assert.equal(printPacketState.auditEvents[0]?.summary, "Print packet settings updated");

    const createdChecklistState = await assertOk(fixture.baseUrl, "/api/tool-checklists", {
      method: "POST",
      headers: foremanHeaders,
      body: JSON.stringify({
        jobId: "J-2201",
        title: "Pour day loadout",
        notes: "Start with the finishing kit.",
      }),
    });
    const createdChecklist = createdChecklistState.toolChecklists.find((checklist) => checklist.title === "Pour day loadout");
    assert.ok(createdChecklist);

    const unrelatedChecklistAttempt = await requestJson(fixture.baseUrl, "/api/tool-checklists", {
      method: "POST",
      headers: foremanHeaders,
      body: JSON.stringify({
        jobId: "J-2192",
        title: "No access checklist",
      }),
    });
    assert.equal(unrelatedChecklistAttempt.response.status, 403);

    const itemAddedState = await assertOk(fixture.baseUrl, `/api/tool-checklists/${createdChecklist.id}/items`, {
      method: "POST",
      headers: foremanHeaders,
      body: JSON.stringify({
        name: "Power screed",
        category: "small_equipment",
        quantity: 1,
        status: "loaded",
      }),
    });
    const addedItem = itemAddedState.toolChecklists.find((checklist) => checklist.id === createdChecklist.id).items[0];
    assert.equal(addedItem.name, "Power screed");

    const employeeUpdatedState = await assertOk(fixture.baseUrl, `/api/tool-checklists/${createdChecklist.id}/items/${addedItem.id}`, {
      method: "PATCH",
      headers: employeeHeaders,
      body: JSON.stringify({
        status: "missing",
        missingNotes: "Still at the yard.",
      }),
    });
    const employeeVisibleChecklist = employeeUpdatedState.toolChecklists.find((checklist) => checklist.id === createdChecklist.id);
    assert.equal(employeeVisibleChecklist.items[0].status, "missing");
    assert.equal(employeeVisibleChecklist.items[0].missingNotes, "Still at the yard.");
    assert.equal(employeeVisibleChecklist.job.canViewMoney, false);
    assert.equal("notes" in employeeVisibleChecklist.job, false);

    const unrelatedEmployeeView = await assertOk(fixture.baseUrl, "/api/tool-checklists", { headers: otherHeaders });
    assert.equal(unrelatedEmployeeView.toolChecklists.length, 0);

    const foremanSubmitState = await assertOk(fixture.baseUrl, `/api/tool-checklists/${createdChecklist.id}/submit`, {
      method: "POST",
      headers: foremanHeaders,
    });
    assert.equal(foremanSubmitState.toolChecklists.find((checklist) => checklist.id === createdChecklist.id).status, "submitted");

    const reviewedState = await assertOk(fixture.baseUrl, `/api/tool-checklists/${createdChecklist.id}/review`, {
      method: "POST",
      headers: officeHeaders,
    });
    assert.equal(reviewedState.toolChecklists.find((checklist) => checklist.id === createdChecklist.id).status, "reviewed");

    const archivedState = await assertOk(fixture.baseUrl, `/api/tool-checklists/${createdChecklist.id}/archive`, {
      method: "POST",
      headers: officeHeaders,
    });
    const archivedChecklist = archivedState.toolChecklists.find((checklist) => checklist.id === createdChecklist.id);
    assert.equal(archivedChecklist.status, "archived");

    const disabledAgain = await assertOk(fixture.baseUrl, "/api/settings/company", {
      method: "PATCH",
      headers: officeHeaders,
      body: JSON.stringify({ toolChecklistEnabled: false }),
    });
    assert.equal(disabledAgain.companySettings.toolChecklistEnabled, false);

    const officeChecklistList = await assertOk(fixture.baseUrl, "/api/tool-checklists", { headers: officeHeaders });
    assert.equal(officeChecklistList.toolChecklists.some((checklist) => checklist.id === createdChecklist.id), true);
  } finally {
    await fixture.stop();
  }
});
