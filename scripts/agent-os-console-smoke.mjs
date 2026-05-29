#!/usr/bin/env node
import fs from "node:fs/promises";
import fsSync from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

import { chromium } from "playwright";

const DEFAULT_BASE_URL = "http://localhost:5173/";
const DEFAULT_PASSWORD_ENV = "APEX_AGENT_OS_CONSOLE_SMOKE_PASSWORD";
const FALLBACK_DEMO_PASSWORD = "apexdemo123";
const DEFAULT_ADMIN_EMAIL = "demo.admin@apexhq.app";
const DEFAULT_EMPLOYEE_EMAIL = "demo.employee@apexhq.app";
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function printHelp() {
  console.log(`Apex Agent OS console smoke

Usage:
  node scripts/agent-os-console-smoke.mjs --start-local
  node scripts/agent-os-console-smoke.mjs --base-url=http://127.0.0.1:5173/

Flags:
  --start-local                 Start npm run dev with temp demo data.
  --base-url=<url>              App URL to smoke. Defaults to ${DEFAULT_BASE_URL}
  --admin-email=<email>         Admin demo email.
  --employee-email=<email>      Employee demo email.
  --password-env=<name>         Env var for demo smoke password.
  --headed                      Show the browser.
  --json                        Print JSON only.
  --help                        Print this message.

Safety:
  This smoke is local-only for write setup. It may queue one safe internal Agent OS draft/prep run only when the target URL is localhost.
  It never sends messages, collects payment, submits bids, changes schedules, writes integrations, deploys, or touches production data.
`);
}

export function parseAgentOsConsoleSmokeArgs(argv = []) {
  const options = {
    baseUrl: DEFAULT_BASE_URL,
    adminEmail: DEFAULT_ADMIN_EMAIL,
    employeeEmail: DEFAULT_EMPLOYEE_EMAIL,
    passwordEnv: DEFAULT_PASSWORD_ENV,
    startLocal: false,
    headed: false,
    json: false,
    help: false,
  };

  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg === "--start-local") options.startLocal = true;
    else if (arg === "--headed") options.headed = true;
    else if (arg === "--json") options.json = true;
    else if (arg.startsWith("--base-url=")) options.baseUrl = arg.slice("--base-url=".length);
    else if (arg.startsWith("--admin-email=")) options.adminEmail = arg.slice("--admin-email=".length).trim();
    else if (arg.startsWith("--employee-email=")) options.employeeEmail = arg.slice("--employee-email=".length).trim();
    else if (arg.startsWith("--password-env=")) options.passwordEnv = arg.slice("--password-env=".length).trim();
    else throw new Error(`Unknown argument: ${arg}`);
  }

  options.baseUrl = new URL(options.baseUrl).toString();
  if (!options.passwordEnv) options.passwordEnv = DEFAULT_PASSWORD_ENV;
  return options;
}

export function isLocalBaseUrl(baseUrl = "") {
  try {
    return LOCAL_HOSTS.has(new URL(baseUrl).hostname);
  } catch {
    return false;
  }
}

export function assertAgentOsConsoleSmokeSafety(options = {}) {
  if (!isLocalBaseUrl(options.baseUrl)) {
    throw new Error("Agent OS console smoke is local-only because it queues one safe internal demo run for UI evidence.");
  }
  return true;
}

export function buildAgentOsConsoleSmokeResult({ admin = {}, employee = {}, logs = [] } = {}) {
  const checks = {
    adminConsoleVisible: Boolean(admin.consoleVisible),
    actionFiltersVisible: Boolean(admin.actionFiltersVisible),
    queueVisible: Boolean(admin.queueVisible),
    recentRunsVisible: Boolean(admin.recentRunsVisible),
    runDetailVisible: Boolean(admin.runDetailVisible),
    learningReviewVisible: Boolean(admin.learningReviewVisible),
    productionGateEvidenceVisible: Boolean(admin.productionGateEvidenceVisible),
    externalLocksVisible: Boolean(admin.externalLocksVisible),
    employeeConsoleHidden: Boolean(employee.consoleHidden),
    employeeApiDenied: Boolean(employee.apiDenied),
    noUiLoadError: !admin.loadErrorVisible,
    noBrowserWarningsOrErrors: logs.length === 0,
  };
  return {
    mode: "agent_os_console_smoke_v1",
    status: Object.values(checks).every(Boolean) ? "passed" : "failed",
    checks,
    warningOrErrorLogs: logs,
    safetyBoundary: "Local/demo Agent OS console smoke only. No production data, customer contact, payment, bid submission, schedule mutation, integration write, deploy, or secret change is performed.",
  };
}

async function waitForReady(baseUrl, { timeoutMs = 90_000 } = {}) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(new URL("/api/ready", baseUrl));
      if (response.ok) return true;
      lastError = new Error(`ready returned ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 750));
  }
  throw new Error(`Apex HQ local dev server did not become ready. ${lastError?.message || ""}`.trim());
}

async function startLocalDevServer() {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "apex-agent-os-console-smoke-"));
  const logPath = path.join(dataDir, "dev.log");
  const logStream = fsSync.createWriteStream(logPath, { flags: "a" });
  const child = process.platform === "win32"
    ? spawn("cmd.exe", ["/d", "/s", "/c", "npm.cmd run dev"], {
        cwd: process.cwd(),
        env: {
          ...process.env,
          DATA_DIR: dataDir,
          DEMO_MODE: "true",
          SEED_DEMO_DATA: "true",
          DEMO_PACKAGE_ID: "elite",
        },
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      })
    : spawn("npm", ["run", "dev"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      DATA_DIR: dataDir,
      DEMO_MODE: "true",
      SEED_DEMO_DATA: "true",
      DEMO_PACKAGE_ID: "elite",
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  child.stdout?.pipe(logStream);
  child.stderr?.pipe(logStream);

  child.on("exit", () => {
    logStream.end();
  });

  await waitForReady(DEFAULT_BASE_URL);
  return {
    dataDir,
    logPath,
    stop() {
      if (process.platform === "win32" && child.pid) {
        spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
      } else if (!child.killed) {
        child.kill();
      }
      logStream.end();
      return Promise.resolve();
    },
  };
}

function demoPassword(passwordEnv) {
  return process.env[passwordEnv] || FALLBACK_DEMO_PASSWORD;
}

async function login(context, baseUrl, { email, password }) {
  const response = await context.request.post(new URL("/api/auth/login", baseUrl).toString(), {
    data: { email, password },
  });
  if (!response.ok()) {
    throw new Error(`Login failed for ${email}: ${response.status()}`);
  }
  return response.json();
}

async function queueDemoAgentOsRun(page, baseUrl, csrfToken = "") {
  const bootstrap = await page.request.get(new URL("/api/bootstrap", baseUrl).toString());
  if (!bootstrap.ok()) throw new Error(`Bootstrap failed before Agent OS queue: ${bootstrap.status()}`);
  const payload = await bootstrap.json();
  const leads = Array.isArray(payload.leads) ? payload.leads : Array.isArray(payload.appState?.leads) ? payload.appState.leads : [];
  const lead = leads.find((item) => item && !item.archivedAt);
  if (!lead?.id) throw new Error("No demo lead found for Agent OS console smoke run detail.");

  const queued = await page.request.post(new URL("/api/agent/os/tasks", baseUrl).toString(), {
    headers: csrfToken ? { "x-csrf-token": csrfToken } : {},
    data: {
      actionId: "lead_follow_up_draft",
      target: {
        entityType: "lead",
        entityId: lead.id,
        title: lead.project || lead.customer || lead.customerName || "Demo lead",
      },
    },
  });
  if (!queued.ok()) {
    throw new Error(`Agent OS queue failed: ${queued.status()} ${await queued.text()}`);
  }
}

async function smokeAdminConsole(browser, baseUrl, options) {
  const context = await browser.newContext({ baseURL: baseUrl });
  const page = await context.newPage();
  const logs = [];
  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) logs.push(`${message.type()}: ${message.text()}`);
  });

  const loginPayload = await login(context, baseUrl, {
    email: options.adminEmail,
    password: demoPassword(options.passwordEnv),
  });
  await queueDemoAgentOsRun(page, baseUrl, loginPayload.csrfToken || "");
  await page.goto(new URL("/ai-office", baseUrl).toString(), { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Apex Agent OS Console" }).waitFor({ timeout: 20_000 });

  const admin = {
    consoleVisible: await page.getByRole("heading", { name: "Apex Agent OS Console" }).isVisible(),
    actionFiltersVisible: await page.getByRole("button", { name: /Leads \(/ }).isVisible(),
    queueVisible: await page.getByText("Queue Internal Tasks").isVisible(),
    recentRunsVisible: await page.getByText("Recent Runs").isVisible(),
    runDetailVisible: await page.getByText("Run detail").isVisible(),
    learningReviewVisible: await page.getByText("Learning Review").isVisible(),
    productionGateEvidenceVisible: await page.getByText("Production Gate Evidence").isVisible(),
    externalLocksVisible: await page.getByText(/External action locks:/).first().isVisible(),
    loadErrorVisible: await page.getByText(/could not load|failed/i).isVisible().catch(() => false),
  };
  await context.close();
  return { admin, logs };
}

async function smokeEmployeeDenied(browser, baseUrl, options) {
  const context = await browser.newContext({ baseURL: baseUrl });
  const page = await context.newPage();
  await login(context, baseUrl, {
    email: options.employeeEmail,
    password: demoPassword(options.passwordEnv),
  });
  const apiResponse = await page.request.get(new URL("/api/agent/os", baseUrl).toString());
  await page.goto(new URL("/ai-office", baseUrl).toString(), { waitUntil: "domcontentloaded" });
  const employee = {
    consoleHidden: !(await page.getByRole("heading", { name: "Apex Agent OS Console" }).isVisible().catch(() => false)),
    apiDenied: apiResponse.status() === 403,
  };
  await context.close();
  return employee;
}

export async function runAgentOsConsoleSmoke(options = {}) {
  assertAgentOsConsoleSmokeSafety(options);
  let localServer = null;
  if (options.startLocal) {
    localServer = await startLocalDevServer();
  } else {
    await waitForReady(options.baseUrl);
  }

  const browser = await chromium.launch({ headless: !options.headed });
  try {
    const { admin, logs } = await smokeAdminConsole(browser, options.baseUrl, options);
    const employee = await smokeEmployeeDenied(browser, options.baseUrl, options);
    const result = buildAgentOsConsoleSmokeResult({ admin, employee, logs });
    if (result.status !== "passed") {
      throw new Error(`Agent OS console smoke failed: ${JSON.stringify(result.checks)}`);
    }
    return result;
  } finally {
    await browser.close().catch(() => {});
    if (localServer) await localServer.stop();
  }
}

async function main() {
  const options = parseAgentOsConsoleSmokeArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }
  assertAgentOsConsoleSmokeSafety(options);
  const result = await runAgentOsConsoleSmoke(options);
  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`Agent OS console smoke ${result.status}.`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
