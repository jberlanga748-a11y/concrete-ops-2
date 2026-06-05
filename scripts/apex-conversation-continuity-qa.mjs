#!/usr/bin/env node
import fs from "node:fs/promises";
import fsSync from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import net from "node:net";

import { chromium } from "playwright";

const rootDir = process.cwd();
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const outputDir = path.join(rootDir, "outputs", "apex-conversation-continuity-qa", timestamp);
const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "apex-conversation-continuity-"));
const sqliteFile = path.join(dataDir, "app-data.sqlite");
const port = await findFreePort();
const baseUrl = `http://127.0.0.1:${port}`;
const serverLogPath = path.join(outputDir, "server.log");
const conversationContextSelector = '[aria-label="Apex live conversation context"], [aria-label="Apex mobile live conversation context"]';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
  });
}

async function waitForReady() {
  let last = "";
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/ready`, { signal: AbortSignal.timeout(2_000) });
      last = `${response.status} ${await response.text().catch(() => "")}`;
      if (response.ok) return;
    } catch (error) {
      last = error?.message || String(error);
    }
    await sleep(500);
  }
  throw new Error(`Local Apex HQ server did not become ready. ${last}`);
}

function setTempDemoOperatorAccess() {
  const database = new DatabaseSync(sqliteFile);
  try {
    const result = database.prepare("UPDATE users SET operator_access = 1 WHERE lower(email) = lower(?)").run("demo.admin@apexhq.app");
    if (!result.changes) {
      throw new Error("Demo admin user was not seeded in the temp QA database.");
    }
  } finally {
    database.close();
  }
}

async function loginContext(context) {
  const response = await context.request.post(`${baseUrl}/api/auth/login`, {
    data: { email: "demo.admin@apexhq.app", password: "apexdemo123" },
  });
  if (!response.ok()) {
    throw new Error(`QA login failed: ${response.status()} ${await response.text()}`);
  }
  return response.json();
}

async function waitForApexRoom(page) {
  await page.goto(`${baseUrl}/apex-control-room`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: /^APEX$/i }).waitFor({ timeout: 30_000 });
  await page.getByPlaceholder("Ask Apex anything...").waitFor({ timeout: 30_000 });
}

async function askTurn(page, text) {
  const input = page.getByPlaceholder("Ask Apex anything...").first();
  await input.fill(text);
  await page.getByRole("button", { name: /Ask Apex/i }).click();
  await page.waitForFunction((question) => {
    const body = document.body.textContent || "";
    return body.includes("Conversation Context") && body.includes(question) && !body.includes("Apex is thinking");
  }, text, { timeout: 45_000 });
  await page.waitForTimeout(700);
}

async function ensureVisibleConversationContext(page) {
  const hasVisibleContext = async () => page.evaluate(() => {
    const contexts = Array.from(document.querySelectorAll('[aria-label="Apex live conversation context"], [aria-label="Apex mobile live conversation context"]'));
    return contexts.some((element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
    });
  });

  if (await hasVisibleContext()) return;

  const consoleButtons = page.getByRole("button", { name: /Console|Full Console/i });
  const count = await consoleButtons.count();
  for (let index = 0; index < count; index += 1) {
    const button = consoleButtons.nth(index);
    if (await button.isVisible().catch(() => false)) {
      await button.click();
      await page.waitForTimeout(800);
      break;
    }
  }

  try {
    await page.waitForFunction(() => {
      const contexts = Array.from(document.querySelectorAll('[aria-label="Apex live conversation context"], [aria-label="Apex mobile live conversation context"]'));
      return contexts.some((element) => {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
      });
    }, null, { timeout: 15_000 });
  } catch (error) {
    await page.screenshot({ path: path.join(outputDir, "conversation-context-not-visible.png"), fullPage: true }).catch(() => {});
    throw error;
  }
}

async function visibleConversationContextLocator(page) {
  const index = await page.evaluate(() => {
    const contexts = Array.from(document.querySelectorAll('[aria-label="Apex live conversation context"], [aria-label="Apex mobile live conversation context"]'));
    return contexts.findIndex((element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
    });
  });
  if (index < 0) throw new Error("No visible Apex live conversation context was found.");
  return page.locator(conversationContextSelector).nth(index);
}

async function viewportPass(browser, name, viewport) {
  const context = await browser.newContext({ baseURL: baseUrl, viewport });
  const page = await context.newPage();
  const logs = [];
  const failedRequests = [];

  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) {
      logs.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => logs.push(`pageerror: ${error.message}`));
  page.on("requestfailed", (request) => {
    if (!request.url().startsWith(baseUrl)) return;
    failedRequests.push(`${request.method()} ${request.url()} ${request.failure()?.errorText || "failed"}`);
  });

  await loginContext(context);
  await waitForApexRoom(page);
  await askTurn(page, "Summarize what Apex is tracking right now.");
  await askTurn(page, "yes do that next");

  await ensureVisibleConversationContext(page);
  const contextLocator = await visibleConversationContextLocator(page);
  await contextLocator.scrollIntoViewIfNeeded();
  const contextScreenshotPath = path.join(outputDir, `${name}-conversation-context.png`);
  await contextLocator.screenshot({ path: contextScreenshotPath });
  const screenshotPath = path.join(outputDir, `${name}-conversation-continuity.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  const evidence = await page.evaluate(() => {
    const root = document.querySelector("#root") || document.body;
    const text = (root.textContent || "").replace(/\s+/g, " ").trim();
    const contexts = Array.from(document.querySelectorAll('[aria-label="Apex live conversation context"], [aria-label="Apex mobile live conversation context"]'));
    const contextEl = contexts.find((element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
    }) || contexts[0];
    const responseEl = document.querySelector('[aria-label="Apex visible response"]')
      || document.querySelector('[aria-label="Apex mobile response"]');
    const horizontalOverflow = Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth);
    return {
      url: window.location.href,
      hasApexHeading: /\bApex\b/i.test(text),
      hasAskInput: Boolean(document.querySelector("#apex-cockpit-ask")),
      hasConversationContext: Boolean(contextEl),
      conversationContextVisible: Boolean(contextEl?.getBoundingClientRect().width && contextEl?.getBoundingClientRect().height),
      contextText: (contextEl?.textContent || "").replace(/\s+/g, " ").trim().slice(0, 700),
      responseText: (responseEl?.textContent || "").replace(/\s+/g, " ").trim().slice(0, 900),
      hasSecondTurn: text.includes("yes do that next"),
      hasThreadRow: /Thread/i.test(contextEl?.textContent || ""),
      hasRouteRow: /Route/i.test(contextEl?.textContent || ""),
      hasRunRow: /Run/i.test(contextEl?.textContent || ""),
      hasMoveRow: /Move/i.test(contextEl?.textContent || ""),
      horizontalOverflow,
    };
  });

  const pass = evidence.hasApexHeading
    && evidence.hasAskInput
    && evidence.hasConversationContext
    && evidence.conversationContextVisible
    && evidence.hasSecondTurn
    && evidence.hasThreadRow
    && evidence.hasRouteRow
    && evidence.hasRunRow
    && evidence.hasMoveRow
    && evidence.horizontalOverflow === 0
    && logs.length === 0
    && failedRequests.length === 0;

  await context.close();
  return { name, viewport, pass, screenshotPath, contextScreenshotPath, evidence, logs, failedRequests };
}

async function main() {
  await fs.mkdir(outputDir, { recursive: true });
  const logStream = fsSync.createWriteStream(serverLogPath, { flags: "a" });
  const server = spawn(process.execPath, ["server/index.js"], {
    cwd: rootDir,
    env: {
      ...process.env,
      PORT: String(port),
      DATA_DIR: dataDir,
      DEMO_MODE: "true",
      SEED_DEMO_DATA: "true",
      DEMO_PACKAGE_ID: "elite",
      LOG_LEVEL: "warn",
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });

  server.stdout.pipe(logStream);
  server.stderr.pipe(logStream);

  async function stopServer() {
    if (process.platform === "win32" && server.pid) {
      spawnSync("taskkill", ["/PID", String(server.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
    } else if (!server.killed) {
      server.kill("SIGTERM");
    }
    await sleep(500);
    logStream.end();
  }

  let browser;
  try {
    await waitForReady();
    setTempDemoOperatorAccess();
    browser = await chromium.launch({ headless: true });
    const results = [
      await viewportPass(browser, "desktop", { width: 1440, height: 920 }),
      await viewportPass(browser, "mobile", { width: 390, height: 844, isMobile: true }),
    ];
    const summary = {
      mode: "apex_conversation_continuity_qa",
      status: results.every((item) => item.pass) ? "passed" : "failed",
      baseUrl,
      outputDir,
      results,
      safetyBoundary: "Disposable local SQLite QA only. Demo admin operator_access was set in the temp database. No production data, external sends, billing, provider credentials, schema/auth changes, deploys, or irreversible actions were performed.",
    };
    await fs.writeFile(path.join(outputDir, "summary.json"), JSON.stringify(summary, null, 2));
    console.log(JSON.stringify(summary, null, 2));
    if (summary.status !== "passed") process.exitCode = 1;
  } catch (error) {
    const failure = {
      mode: "apex_conversation_continuity_qa",
      status: "failed",
      baseUrl,
      outputDir,
      error: error?.stack || error?.message || String(error),
    };
    await fs.writeFile(path.join(outputDir, "failure.json"), JSON.stringify(failure, null, 2)).catch(() => {});
    console.error(JSON.stringify(failure, null, 2));
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close().catch(() => {});
    await stopServer();
  }
}

await main();
