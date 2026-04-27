import fs from "node:fs/promises";
import path from "node:path";

import { chromium } from "playwright";

const DEFAULT_BASE_URL = "https://concrete-ops-demo.fly.dev/";
const DEFAULT_OUTPUT_ROOT = path.resolve(process.cwd(), "ui-audit", "demo-desktop");
const DEFAULT_TIMEOUT_MS = 90_000;
const NETWORK_IDLE_TIMEOUT_MS = 7_500;
const PAGE_SETTLE_DELAY_MS = 1_200;
const DEFAULT_VIEWPORTS = ["1440x900", "1920x1080"];
const LOGIN_BUTTON_NAME = /enter workspace/i;
const LOGOUT_BUTTON_NAME = /log out/i;
const FIRST_VIEWPORT = { width: 1440, height: 900 };

const VIEWPORTS = {
  "1440x900": { width: 1440, height: 900 },
  "1920x1080": { width: 1920, height: 1080 },
};

const DEMO_PASSWORD = "demo12345";

const ROLE_CONFIGS = {
  admin: {
    email: "demo.admin@concreteops.app",
    label: "admin",
    pages: [
      { slug: "dashboard", path: "/", heading: "Dashboard" },
      { slug: "leads", path: "/leads", heading: "Leads" },
      { slug: "jobs", path: "/jobs", heading: "Jobs" },
      { slug: "jobs-print-packet", path: "/jobs", heading: "Jobs", focusButton: /print job packet/i, optional: true },
      { slug: "daily-reports", path: "/reports", heading: "Daily Reports" },
      { slug: "reports-print-daily-report", path: "/reports", heading: "Daily Reports", focusButton: /print daily report/i, optional: true },
      { slug: "uploads", path: "/uploads", heading: "Uploads" },
      { slug: "incidents", path: "/incidents", heading: /incidents|report incident/i },
      { slug: "toolbox-talks", path: "/toolbox", heading: "Toolbox Talks" },
      { slug: "ppe", path: "/ppe", heading: /ppe checklist|safety & ppe/i },
      { slug: "tool-checklist", path: "/toolChecklist", heading: "Tool Checklist" },
      { slug: "calculator", path: "/calculator", heading: /concrete calculator|calculator/i },
      { slug: "pre-pour", path: "/prePour", heading: "Pre-Pour Checklist" },
      { slug: "post-pour", path: "/postPour", heading: "Post-Pour Checklist" },
      { slug: "delivery-tickets", path: "/deliveryTickets", heading: "Delivery Tickets" },
      { slug: "settings", path: "/settings", heading: "Settings" },
    ],
  },
  foreman: {
    email: "demo.foreman@concreteops.app",
    label: "foreman",
    pages: [
      { slug: "dashboard", path: "/", heading: /dashboard|foreman workspace/i },
      { slug: "jobs", path: "/jobs", heading: "Jobs" },
      { slug: "time", path: "/time", heading: "Time" },
      { slug: "reports", path: "/reports", heading: "Daily Reports" },
      { slug: "pre-pour", path: "/prePour", heading: "Pre-Pour Checklist" },
      { slug: "post-pour", path: "/postPour", heading: "Post-Pour Checklist" },
      { slug: "uploads", path: "/uploads", heading: "Uploads" },
      { slug: "incidents", path: "/incidents", heading: /incidents|report incident/i },
      { slug: "tool-checklist", path: "/toolChecklist", heading: "Tool Checklist" },
    ],
  },
  employee: {
    email: "demo.employee@concreteops.app",
    label: "employee",
    pages: [
      { slug: "workspace", path: "/", heading: /dashboard|employee workspace/i },
      { slug: "assigned-job", path: "/jobs", heading: "Jobs" },
      { slug: "time", path: "/time", heading: "Time" },
      { slug: "uploads", path: "/uploads", heading: "Uploads" },
      { slug: "ppe", path: "/ppe", heading: /ppe checklist|safety & ppe/i },
    ],
  },
};

function printHelp() {
  console.log(`Concrete Ops demo desktop UI audit

Usage:
  npm run audit:demo-desktop

Optional flags:
  --roles=admin,foreman,employee
  --viewports=1440x900,1920x1080
  --base-url=https://concrete-ops-demo.fly.dev/
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

async function waitForHeading(page, heading) {
  if (!heading) return;
  const headingLocator = typeof heading === "string"
    ? page.getByRole("heading", { name: heading, exact: false }).first()
    : page.getByRole("heading", { name: heading }).first();
  await headingLocator.waitFor({ state: "visible", timeout: DEFAULT_TIMEOUT_MS }).catch(() => {});
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

  await page.getByRole("button", { name: LOGOUT_BUTTON_NAME }).first().waitFor({
    state: "visible",
    timeout: DEFAULT_TIMEOUT_MS,
  });
  await waitForIdle(page);

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
    await page.goto(absoluteUrl, { waitUntil: "domcontentloaded", timeout: DEFAULT_TIMEOUT_MS });
    await waitForIdle(page);
    await waitForHeading(page, spec.heading);

    const focused = await maybeFocusButton(page, spec.focusButton);
    if (!focused) {
      manifest.push({
        role,
        viewport: viewportName,
        slug: spec.slug,
        path: spec.path,
        status: spec.optional ? "skipped" : "missing_button",
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

  try {
    for (const role of options.roles) {
      const roleConfig = ROLE_CONFIGS[role];
      const storageState = await loginAndCaptureState(browser, roleConfig, options);

      for (const viewportName of options.viewports) {
        const viewport = VIEWPORTS[viewportName];
        const context = await browser.newContext({
          baseURL: options.baseUrl,
          storageState,
          viewport,
        });
        context.setDefaultTimeout(DEFAULT_TIMEOUT_MS);
        context.setDefaultNavigationTimeout(DEFAULT_TIMEOUT_MS);
        const page = await context.newPage();
        const roleViewportDir = path.join(runDir, role, viewportName);
        await ensureDirectory(roleViewportDir);

        for (const spec of roleConfig.pages) {
          await capturePage(page, role, viewportName, spec, roleViewportDir, options.baseUrl, manifest);
        }

        await context.close();
      }
    }
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
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
