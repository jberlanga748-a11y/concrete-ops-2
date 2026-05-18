import fs from "node:fs/promises";
import path from "node:path";

import { chromium } from "playwright";

import { MODULE_PATHS } from "../src/app-routing.js";

const DEFAULT_BASE_URL = "https://app.apexhq.online/";
const DEFAULT_OUTPUT_ROOT = path.resolve(process.cwd(), "ui-audit", "demo-desktop");
const DEFAULT_TIMEOUT_MS = 90_000;
const PAGE_NAVIGATION_TIMEOUT_MS = 45_000;
const NETWORK_IDLE_TIMEOUT_MS = 7_500;
const PAGE_SETTLE_DELAY_MS = 1_200;
const APP_READY_TIMEOUT_MS = 20_000;
const DEFAULT_VIEWPORTS = ["1440x900", "1920x1080"];
const LOGIN_BUTTON_NAME = /enter workspace/i;
const LOGOUT_BUTTON_NAME = /log out/i;
const WORKSPACE_LOADING_TEXT = /Loading team workspace/i;
const FIRST_VIEWPORT = { width: 1440, height: 900 };

const VIEWPORTS = {
  "1440x900": { width: 1440, height: 900 },
  "1920x1080": { width: 1920, height: 1080 },
};

const DEMO_PASSWORD = "apexdemo123";

const ROLE_CONFIGS = {
  admin: {
    email: "demo.admin@apexhq.app",
    label: "admin",
    pages: [
      { slug: "dashboard", path: MODULE_PATHS.dashboard, heading: /dashboard|daily workspace/i },
      { slug: "leads", path: MODULE_PATHS.leads, heading: "Leads" },
      { slug: "jobs", path: MODULE_PATHS.jobs, heading: "Jobs" },
      { slug: "jobs-print-packet", path: MODULE_PATHS.jobs, heading: "Jobs", focusButton: /print job packet/i, optional: true },
      { slug: "daily-reports", path: MODULE_PATHS.reports, heading: "Daily Reports" },
      { slug: "reports-print-daily-report", path: MODULE_PATHS.reports, heading: "Daily Reports", focusButton: /print daily report/i, optional: true },
      { slug: "uploads", path: MODULE_PATHS.uploads, heading: /uploads|photo evidence/i },
      { slug: "incidents", path: MODULE_PATHS.incidents, heading: /incidents|report incident/i },
      { slug: "toolbox-talks", path: MODULE_PATHS.toolbox, heading: "Toolbox Talks" },
      { slug: "ppe", path: MODULE_PATHS.ppe, heading: /ppe checklist|safety & ppe/i },
      { slug: "tool-checklist", path: MODULE_PATHS.toolChecklist, heading: "Tool Checklist" },
      { slug: "calculator", path: MODULE_PATHS.calculator, heading: /concrete calculator|calculator/i },
      { slug: "pre-pour", path: MODULE_PATHS.prePour, heading: /pre-pour|pre-pour checklist/i },
      { slug: "post-pour", path: MODULE_PATHS.postPour, heading: /post-pour|post-pour checklist/i },
      { slug: "delivery-tickets", path: MODULE_PATHS.deliveryTickets, heading: "Delivery Tickets" },
      { slug: "settings", path: MODULE_PATHS.settings, heading: "Settings" },
    ],
  },
  foreman: {
    email: "demo.foreman@apexhq.app",
    label: "foreman",
    pages: [
      { slug: "dashboard", path: MODULE_PATHS.dashboard, heading: /field mode|dashboard|foreman workspace|my jobs/i },
      { slug: "jobs", path: MODULE_PATHS.jobs, heading: /field mode|jobs/i },
      { slug: "time", path: MODULE_PATHS.time, heading: "Time" },
      { slug: "reports", path: MODULE_PATHS.reports, heading: "Daily Reports" },
      { slug: "pre-pour", path: MODULE_PATHS.prePour, heading: /pre-pour|pre-pour checklist/i },
      { slug: "post-pour", path: MODULE_PATHS.postPour, heading: /post-pour|post-pour checklist/i },
      { slug: "uploads", path: MODULE_PATHS.uploads, heading: /uploads|photo evidence/i },
      { slug: "incidents", path: MODULE_PATHS.incidents, heading: /incidents|report incident/i },
      { slug: "tool-checklist", path: MODULE_PATHS.toolChecklist, heading: "Tool Checklist" },
    ],
  },
  employee: {
    email: "demo.employee@apexhq.app",
    label: "employee",
    pages: [
      { slug: "workspace", path: MODULE_PATHS.dashboard, heading: /field mode|dashboard|employee workspace|my job/i },
      { slug: "assigned-job", path: MODULE_PATHS.jobs, heading: /field mode|jobs|my job/i },
      { slug: "time", path: MODULE_PATHS.time, heading: "Time" },
      { slug: "uploads", path: MODULE_PATHS.uploads, heading: /uploads|photo evidence/i },
      { slug: "ppe", path: MODULE_PATHS.ppe, heading: /ppe checklist|safety & ppe/i },
    ],
  },
};

function printHelp() {
  console.log(`Apex HQ demo desktop UI audit

Usage:
  npm run audit:demo-desktop

Optional flags:
  --roles=admin,foreman,employee
  --viewports=1440x900,1920x1080
  --pages=dashboard,pre-pour,post-pour
  --base-url=https://app.apexhq.online/
  --output-dir=ui-audit/demo-desktop
  --headed
  --help
`);
}

function parseArgs(argv) {
  const options = {
    baseUrl: DEFAULT_BASE_URL,
    outputRoot: DEFAULT_OUTPUT_ROOT,
    roles: Object.keys(ROLE_CONFIGS),
    viewports: DEFAULT_VIEWPORTS,
    pages: [],
    headed: false,
  };

  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }
    if (arg === "--headed") {
      options.headed = true;
      continue;
    }
    if (arg.startsWith("--roles=")) {
      options.roles = arg.split("=")[1].split(",").map((value) => value.trim()).filter(Boolean);
      continue;
    }
    if (arg.startsWith("--viewports=")) {
      options.viewports = arg.split("=")[1].split(",").map((value) => value.trim()).filter(Boolean);
      continue;
    }
    if (arg.startsWith("--pages=")) {
      options.pages = arg.split("=")[1].split(",").map((value) => value.trim()).filter(Boolean);
      continue;
    }
    if (arg.startsWith("--base-url=")) {
      options.baseUrl = arg.split("=")[1];
      continue;
    }
    if (arg.startsWith("--output-dir=")) {
      options.outputRoot = path.resolve(process.cwd(), arg.split("=")[1]);
    }
  }

  options.baseUrl = new URL(options.baseUrl).toString();

  const invalidRoles = options.roles.filter((role) => !ROLE_CONFIGS[role]);
  if (invalidRoles.length > 0) {
    throw new Error(`Unknown roles: ${invalidRoles.join(", ")}`);
  }

  const invalidViewports = options.viewports.filter((viewport) => !VIEWPORTS[viewport]);
  if (invalidViewports.length > 0) {
    throw new Error(`Unknown viewports: ${invalidViewports.join(", ")}`);
  }

  const knownPages = new Set(Object.values(ROLE_CONFIGS).flatMap((roleConfig) => roleConfig.pages.map((page) => page.slug)));
  const invalidPages = options.pages.filter((page) => !knownPages.has(page));
  if (invalidPages.length > 0) {
    throw new Error(`Unknown pages: ${invalidPages.join(", ")}`);
  }

  return options;
}

function timestampSlug() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function ensureDirectory(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function waitForIdle(page) {
  await page.waitForLoadState("domcontentloaded", { timeout: DEFAULT_TIMEOUT_MS }).catch(() => {});
  await page.waitForTimeout(PAGE_SETTLE_DELAY_MS);
  await page.waitForLoadState("networkidle", { timeout: NETWORK_IDLE_TIMEOUT_MS }).catch(() => {});
}

function getHeadingLocator(page, heading) {
  if (!heading) return null;
  return typeof heading === "string"
    ? page.getByRole("heading", { name: heading, exact: false }).first()
    : page.getByRole("heading", { name: heading }).first();
}

async function waitForHeading(page, heading, timeout = DEFAULT_TIMEOUT_MS) {
  const headingLocator = getHeadingLocator(page, heading);
  if (!headingLocator) return true;
  try {
    await headingLocator.waitFor({ state: "visible", timeout });
    return true;
  } catch {
    return false;
  }
}

async function waitForAnyVisible(locators, timeout) {
  if (locators.length === 0) return false;
  try {
    await Promise.any(locators.map((locator) => locator.waitFor({ state: "visible", timeout })));
    return true;
  } catch {
    return false;
  }
}

async function captureDiagnosticScreenshot(page, screenshotPath) {
  try {
    await page.screenshot({
      path: screenshotPath,
      fullPage: false,
      animations: "disabled",
      caret: "hide",
    });
    return true;
  } catch {
    return false;
  }
}

async function waitForWorkspaceReady(page, heading) {
  const loadingLocator = page.getByText(WORKSPACE_LOADING_TEXT).first();
  const loadingVisible = await loadingLocator.isVisible().catch(() => false);
  if (loadingVisible) {
    try {
      await loadingLocator.waitFor({ state: "hidden", timeout: APP_READY_TIMEOUT_MS });
    } catch {
      return {
        ok: false,
        status: "loading_timeout",
        reason: "Loading team workspace did not finish before timeout.",
      };
    }
  }

  const readinessLocators = [
    page.getByRole("button", { name: LOGOUT_BUTTON_NAME }).first(),
    page.locator("main").first(),
  ];
  const headingLocator = getHeadingLocator(page, heading);
  if (headingLocator) {
    readinessLocators.unshift(headingLocator);
  }

  const ready = await waitForAnyVisible(readinessLocators, APP_READY_TIMEOUT_MS);
  if (!ready) {
    return {
      ok: false,
      status: "error",
      reason: heading
        ? "Workspace shell or expected page heading never became visible."
        : "Workspace shell never became visible.",
    };
  }

  const headingVisible = await waitForHeading(page, heading, 10_000);
  if (!headingVisible) {
    return {
      ok: false,
      status: "error",
      reason: "Expected page heading never became visible after loading finished.",
    };
  }

  return { ok: true };
}

async function loginAndCaptureState(browser, roleConfig, options) {
  const context = await browser.newContext({
    baseURL: options.baseUrl,
    viewport: FIRST_VIEWPORT,
  });
  context.setDefaultTimeout(DEFAULT_TIMEOUT_MS);
  context.setDefaultNavigationTimeout(DEFAULT_TIMEOUT_MS);
  const page = await context.newPage();

  await page.goto(options.baseUrl, { waitUntil: "domcontentloaded", timeout: DEFAULT_TIMEOUT_MS });
  await waitForIdle(page);

  const emailField = page.getByLabel("Email").first();
  const passwordField = page.getByLabel("Password").first();
  await emailField.fill(roleConfig.email);
  await passwordField.fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: LOGIN_BUTTON_NAME }).click();

  await waitForIdle(page);
  const readyState = await waitForWorkspaceReady(page, null);
  if (!readyState.ok) {
    throw new Error(readyState.reason);
  }

  const storageState = await context.storageState();
  await context.close();
  return storageState;
}

async function maybeFocusButton(page, buttonPattern) {
  if (!buttonPattern) return true;
  const button = page.getByRole("button", { name: buttonPattern }).first();
  const visible = await button.isVisible({ timeout: 5_000 }).catch(() => false);
  if (!visible) return false;
  await button.scrollIntoViewIfNeeded().catch(() => {});
  return true;
}

async function capturePage(page, role, viewportName, spec, outputDir, baseUrl, manifest) {
  const absoluteUrl = new URL(spec.path, baseUrl).toString();
  try {
    await page.goto(absoluteUrl, { waitUntil: "domcontentloaded", timeout: PAGE_NAVIGATION_TIMEOUT_MS });
    await waitForIdle(page);
    const readyState = await waitForWorkspaceReady(page, spec.heading);
    if (!readyState.ok) {
      const screenshotPath = path.join(outputDir, `${spec.slug}.png`);
      const savedDiagnostic = await captureDiagnosticScreenshot(page, screenshotPath);
      manifest.push({
        role,
        viewport: viewportName,
        slug: spec.slug,
        path: spec.path,
        status: readyState.status,
        optional: Boolean(spec.optional),
        reason: readyState.reason,
        screenshotPath: savedDiagnostic ? screenshotPath : undefined,
      });
      console.warn(`[skip] ${role} ${viewportName} ${spec.slug}: ${readyState.reason}`);
      return;
    }

    const focused = await maybeFocusButton(page, spec.focusButton);
    if (!focused) {
      manifest.push({
        role,
        viewport: viewportName,
        slug: spec.slug,
        path: spec.path,
        status: spec.optional ? "skipped" : "missing_button",
        optional: Boolean(spec.optional),
        reason: "Expected button was not visible.",
      });
      return;
    }

    await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
    const screenshotPath = path.join(outputDir, `${spec.slug}.png`);
    let captureMode = "fullPage";
    try {
      await page.screenshot({
        path: screenshotPath,
        fullPage: true,
        animations: "disabled",
        caret: "hide",
      });
    } catch {
      captureMode = "viewport";
      await page.screenshot({
        path: screenshotPath,
        fullPage: false,
        animations: "disabled",
        caret: "hide",
      });
    }
    manifest.push({
      role,
      viewport: viewportName,
      slug: spec.slug,
      path: spec.path,
      status: "captured",
      optional: Boolean(spec.optional),
      captureMode,
      screenshotPath,
    });
    console.log(`[capture] ${role} ${viewportName} ${spec.slug}`);
  } catch (error) {
    manifest.push({
      role,
      viewport: viewportName,
      slug: spec.slug,
      path: spec.path,
      status: "error",
      optional: Boolean(spec.optional),
      reason: error instanceof Error ? error.message : String(error),
    });
    console.warn(`[skip] ${role} ${viewportName} ${spec.slug}: ${error instanceof Error ? error.message : error}`);
  }
}

async function run() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const runDir = path.join(options.outputRoot, timestampSlug());
  await ensureDirectory(runDir);

  const browser = await chromium.launch({ headless: !options.headed });
  const manifest = [];
  let fatalError = null;

  try {
    for (const role of options.roles) {
      const roleConfig = ROLE_CONFIGS[role];
      let storageState;
      try {
        storageState = await loginAndCaptureState(browser, roleConfig, options);
      } catch (error) {
        manifest.push({
          role,
          viewport: "login",
          slug: "login",
          path: "/",
          status: "error",
          optional: false,
          reason: error instanceof Error ? error.message : String(error),
        });
        console.warn(`[skip] ${role} login: ${error instanceof Error ? error.message : error}`);
        continue;
      }

      for (const viewportName of options.viewports) {
        const viewport = VIEWPORTS[viewportName];
        const context = await browser.newContext({
          baseURL: options.baseUrl,
          storageState,
          viewport,
        });
        context.setDefaultTimeout(DEFAULT_TIMEOUT_MS);
        context.setDefaultNavigationTimeout(DEFAULT_TIMEOUT_MS);
        const roleViewportDir = path.join(runDir, role, viewportName);
        await ensureDirectory(roleViewportDir);
        const pageSpecs = options.pages.length > 0
          ? roleConfig.pages.filter((spec) => options.pages.includes(spec.slug))
          : roleConfig.pages;

        for (const spec of pageSpecs) {
          const page = await context.newPage();
          try {
            await capturePage(page, role, viewportName, spec, roleViewportDir, options.baseUrl, manifest);
          } finally {
            await page.close().catch(() => {});
          }
        }

        await context.close();
      }
    }
  } catch (error) {
    fatalError = error;
  } finally {
    await browser.close();
  }

  const manifestPath = path.join(runDir, "manifest.json");
  await fs.writeFile(manifestPath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    baseUrl: options.baseUrl,
    roles: options.roles,
    viewports: options.viewports,
    screenshots: manifest,
  }, null, 2));

  console.log(`\nDesktop UI audit complete.`);
  console.log(`Screenshots: ${runDir}`);
  console.log(`Manifest: ${manifestPath}`);

  const failedRequiredCaptures = manifest.filter((entry) => !entry.optional && !["captured"].includes(entry.status));
  console.log(`Required capture failures: ${failedRequiredCaptures.length}`);
  for (const failure of failedRequiredCaptures.slice(0, 12)) {
    console.log(`- ${failure.role} ${failure.viewport} ${failure.slug}: ${failure.reason || failure.status}`);
  }

  if (fatalError) {
    throw fatalError;
  }
  if (failedRequiredCaptures.length > 0) {
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
