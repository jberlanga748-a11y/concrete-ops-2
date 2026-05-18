import fs from "node:fs/promises";
import path from "node:path";

import { chromium } from "playwright";

import { MODULE_PATHS } from "../src/app-routing.js";

const DEFAULT_BASE_URL = "http://127.0.0.1:4000/";
const DEFAULT_OUTPUT_ROOT = path.resolve(process.cwd(), "ui-audit", "visual-polish");
const DEMO_PASSWORD = "apexdemo123";
const PAGE_SETTLE_DELAY_MS = 650;
const NETWORK_IDLE_TIMEOUT_MS = 3500;
const LOGIN_READY_DELAY_MS = 900;
const LOGIN_BUTTON_NAME = /enter workspace/i;
const BROWSER_LAUNCH_TIMEOUT_MS = 20000;
const LOGIN_TIMEOUT_MS = 20000;
const ROUTE_AUDIT_TIMEOUT_MS = 20000;
const BROWSER_LAUNCH_OPTIONS = [
  { label: "chromium", options: {} },
  { label: "msedge", options: { channel: "msedge" } },
];

const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 768, height: 1024 },
  phone: { width: 390, height: 844 },
};

const ROLE_CONFIGS = {
  admin: {
    email: "demo.admin@apexhq.app",
    viewports: ["desktop", "phone"],
  },
  employee: {
    email: "demo.employee@apexhq.app",
    viewports: ["phone"],
  },
};

const DEFAULT_ADMIN_ROUTES = Object.entries(MODULE_PATHS)
  .filter(([id]) => id !== "design")
  .map(([id, routePath]) => ({ id, path: routePath }));

const EMPLOYEE_FORBIDDEN_TEXT = [
  /Operations Command/i,
  /Imported Drafts/i,
  /Estimate Studio/i,
  /App Health/i,
  /Plan Readiness/i,
  /Package Locked/i,
  /Upgrade review/i,
  /billing/i,
  /pricing/i,
];

function printHelp() {
  console.log(`Apex HQ visual polish route audit

Usage:
  npm run audit:visual-polish

Optional flags:
  --base-url=http://127.0.0.1:4000/
  --roles=admin,employee
  --viewports=desktop,phone
  --routes=/,/jobs,/delivery-tickets
  --browser=auto|chromium|msedge
  --output-dir=ui-audit/visual-polish
  --headed
  --help
`);
}

function parseArgs(argv) {
  const options = {
    baseUrl: DEFAULT_BASE_URL,
    outputRoot: DEFAULT_OUTPUT_ROOT,
    roles: Object.keys(ROLE_CONFIGS),
    viewports: [],
    routes: [],
    browser: "auto",
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
    if (arg.startsWith("--base-url=")) {
      options.baseUrl = arg.split("=")[1];
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
    if (arg.startsWith("--routes=")) {
      options.routes = arg.split("=")[1].split(",").map((value) => value.trim()).filter(Boolean);
      continue;
    }
    if (arg.startsWith("--browser=")) {
      options.browser = arg.split("=")[1].trim();
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
  if (!["auto", ...BROWSER_LAUNCH_OPTIONS.map((candidate) => candidate.label)].includes(options.browser)) {
    throw new Error(`Unknown browser: ${options.browser}`);
  }

  return options;
}

function timestampSlug() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function normalizeRoute(routePath) {
  if (!routePath) return "/";
  return routePath.startsWith("/") ? routePath : `/${routePath}`;
}

function routeSpecs(options) {
  if (options.routes.length > 0) {
    return options.routes.map((routePath) => ({ id: routePath.replace(/^\//, "") || "dashboard", path: normalizeRoute(routePath) }));
  }
  return DEFAULT_ADMIN_ROUTES;
}

async function ensureDirectory(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function settlePage(page) {
  await page.waitForLoadState("domcontentloaded").catch(() => {});
  await page.waitForTimeout(PAGE_SETTLE_DELAY_MS);
  await page.waitForLoadState("networkidle", { timeout: NETWORK_IDLE_TIMEOUT_MS }).catch(() => {});
}

function withTimeout(promise, timeoutMs, label) {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
}

function isNavigationAbort(errorText = "") {
  return /net::ERR_ABORTED/i.test(String(errorText));
}

function isIgnorableNavigationAbort(request) {
  return request.isNavigationRequest()
    && request.resourceType() === "document"
    && isNavigationAbort(request.failure()?.errorText || "");
}

async function login(browser, options, role, viewportName) {
  const context = await browser.newContext({
    baseURL: options.baseUrl,
    viewport: VIEWPORTS[viewportName],
  });
  context.setDefaultTimeout(10000);
  context.setDefaultNavigationTimeout(15000);
  try {
    return await withTimeout((async () => {
      const page = await context.newPage();
      try {
        await page.goto("/", { waitUntil: "domcontentloaded" });
      } catch (error) {
        if (!isNavigationAbort(error?.message || "")) throw error;
      }
      await settlePage(page);
      await page.getByLabel("Email").first().fill(ROLE_CONFIGS[role].email);
      await page.getByLabel("Password").first().fill(DEMO_PASSWORD);
      await page.getByRole("button", { name: LOGIN_BUTTON_NAME }).click();
      await page.waitForTimeout(LOGIN_READY_DELAY_MS);
      await settlePage(page);
      return context.storageState();
    })(), LOGIN_TIMEOUT_MS, `${role} login`);
  } finally {
    await context.close().catch(() => {});
  }
}

function intersects(a, b) {
  return Boolean(a && b && a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y);
}

function summarizeIssue(entry) {
  if (entry.text) return entry.text;
  if (entry.className) return entry.className;
  return `${entry.tag || "element"} ${entry.rect || ""}`.trim();
}

async function inspectPage(page, role) {
  return page.evaluate(({ employeeForbiddenPatterns, roleName }) => {
    const rectOf = (element) => {
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return {
        tag: element.tagName.toLowerCase(),
        className: String(element.className || "").slice(0, 110),
        text: (element.textContent || element.value || "").replace(/\s+/g, " ").trim().slice(0, 140),
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        rect: `${Math.round(rect.x)},${Math.round(rect.y)},${Math.round(rect.width)}x${Math.round(rect.height)}`,
      };
    };

    const visible = (element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 3 && rect.height > 3 && rect.bottom > 0 && rect.top < window.innerHeight && style.display !== "none" && style.visibility !== "hidden";
    };

    const triggerElement = document.querySelector(".co-apex-assistant-trigger");
    const trigger = rectOf(triggerElement);
    const interactiveCandidates = Array.from(document.querySelectorAll("button, a, input, textarea, select, summary"))
      .filter((element) => element !== triggerElement && !element.closest(".co-apex-assistant-shell"))
      .filter(visible)
      .map(rectOf);

    const clippedCandidates = Array.from(document.querySelectorAll([
      "button",
      "a",
      "summary",
      "th",
      "td",
      "h1",
      "h2",
      "h3",
      "p",
      "span",
      "strong",
      "em",
      "input",
      "select",
      "textarea",
      ".co-command-kpi",
      ".co-command-card",
      ".co-office-list-card",
      ".co-mobile-record-card",
      ".co-card",
      ".badge",
      "[class*=pill]",
      "[class*=chip]",
    ].join(",")))
      .filter(visible)
      .filter((element) => (element.textContent || element.value || "").trim().length > 0)
      .filter((element) => {
        const style = window.getComputedStyle(element);
        const clipsX = element.scrollWidth > element.clientWidth + 3;
        const clipsY = element.scrollHeight > element.clientHeight + 3;
        const clipsByStyle = ["hidden", "clip", "scroll", "auto"].includes(style.overflowX)
          || ["hidden", "clip", "scroll", "auto"].includes(style.overflowY)
          || style.textOverflow === "ellipsis"
          || style.whiteSpace === "nowrap";
        return (clipsX || clipsY) && clipsByStyle;
      })
      .slice(0, 12)
      .map((element) => {
        const info = rectOf(element);
        const style = window.getComputedStyle(element);
        return {
          ...info,
          client: `${Math.round(element.clientWidth)}x${Math.round(element.clientHeight)}`,
          scroll: `${Math.round(element.scrollWidth)}x${Math.round(element.scrollHeight)}`,
          overflowX: style.overflowX,
          overflowY: style.overflowY,
          whiteSpace: style.whiteSpace,
          textOverflow: style.textOverflow,
        };
      });

    const text = document.body.textContent || "";
    const forbiddenText = employeeForbiddenPatterns
      .filter((pattern) => new RegExp(pattern.source, pattern.flags).test(text))
      .map((pattern) => pattern.source);

    return {
      pathname: window.location.pathname,
      h1: document.querySelector("h1")?.textContent || "",
      bodyOverflow: document.body.scrollWidth > window.innerWidth + 1,
      assistantOverlaps: interactiveCandidates.filter((candidate) => trigger && candidate && trigger.x < candidate.x + candidate.width && trigger.x + trigger.width > candidate.x && trigger.y < candidate.y + candidate.height && trigger.y + trigger.height > candidate.y),
      clipped: clippedCandidates,
      forbiddenText: roleName === "employee" ? forbiddenText : [],
    };
  }, {
    employeeForbiddenPatterns: EMPLOYEE_FORBIDDEN_TEXT.map((pattern) => ({ source: pattern.source, flags: pattern.flags })),
    roleName: role,
  });
}

async function auditRoute(browser, storageState, options, role, viewportName, spec, runDir) {
  const context = await browser.newContext({
    baseURL: options.baseUrl,
    storageState,
    viewport: VIEWPORTS[viewportName],
  });
  context.setDefaultTimeout(10000);
  context.setDefaultNavigationTimeout(15000);
  const page = await context.newPage();
  const consoleMessages = [];
  const failedRequests = [];
  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) {
      consoleMessages.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on("requestfailed", (request) => {
    if (isIgnorableNavigationAbort(request)) return;
    failedRequests.push(`${request.method()} ${request.url()} ${request.failure()?.errorText || "failed"}`);
  });

  let inspection = { pathname: "", h1: "", bodyOverflow: false, assistantOverlaps: [], clipped: [], forbiddenText: [] };
  let auditError = "";
  try {
    await withTimeout((async () => {
      try {
        await page.goto(spec.path, { waitUntil: "domcontentloaded" });
      } catch (error) {
        if (!isNavigationAbort(error?.message || "")) throw error;
      }
      await settlePage(page);
      inspection = await inspectPage(page, role);
    })(), ROUTE_AUDIT_TIMEOUT_MS, `${role} ${viewportName} ${spec.path} audit`);
  } catch (error) {
    auditError = error?.message || String(error);
  }

  const failures = [
    auditError ? `Route audit failed: ${auditError}` : "",
    inspection.bodyOverflow ? "Horizontal page overflow detected." : "",
    ...inspection.assistantOverlaps.map((entry) => `Assistant overlaps visible control: ${summarizeIssue(entry)}`),
    ...inspection.clipped.map((entry) => `Visible content may be clipped: ${summarizeIssue(entry)} (${entry.client} client, ${entry.scroll} scroll)`),
    ...inspection.forbiddenText.map((entry) => `Employee-visible forbidden office/package text: ${entry}`),
    ...consoleMessages.map((entry) => `Console warning/error: ${entry}`),
    ...failedRequests.map((entry) => `Failed request: ${entry}`),
  ].filter(Boolean);

  const screenshotPath = failures.length > 0
    ? path.join(runDir, role, viewportName, `${spec.id}.png`)
    : "";
  if (screenshotPath) {
    await ensureDirectory(path.dirname(screenshotPath));
    await page.screenshot({ path: screenshotPath, fullPage: false, animations: "disabled", caret: "hide" }).catch(() => {});
  }

  await context.close().catch(() => {});
  return {
    role,
    viewport: viewportName,
    route: spec.path,
    routeId: spec.id,
    pathname: inspection.pathname,
    h1: inspection.h1,
    status: failures.length ? "failed" : "passed",
    failures,
    screenshotPath: screenshotPath || undefined,
  };
}

async function launchBrowser(options) {
  let lastError;
  const candidates = options.browser === "auto"
    ? BROWSER_LAUNCH_OPTIONS
    : BROWSER_LAUNCH_OPTIONS.filter((candidate) => candidate.label === options.browser);
  for (const candidate of candidates) {
    try {
      const browser = await withTimeout(
        chromium.launch({ ...candidate.options, headless: !options.headed }),
        BROWSER_LAUNCH_TIMEOUT_MS,
        `${candidate.label} browser launch`,
      );
      return { browser, browserName: candidate.label };
    } catch (error) {
      lastError = error;
      console.warn(`Could not launch ${candidate.label}; trying next browser candidate.`);
    }
  }
  throw lastError;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const runDir = path.join(options.outputRoot, timestampSlug());
  await ensureDirectory(runDir);

  const specs = routeSpecs(options);
  const results = [];

  for (const role of options.roles) {
    const viewports = options.viewports.length > 0 ? options.viewports : ROLE_CONFIGS[role].viewports;
    for (const viewportName of viewports) {
      const { browser, browserName } = await launchBrowser(options);
      console.log(`Browser: ${browserName} (${role} ${viewportName})`);
      try {
        const storageState = await login(browser, options, role, viewportName);
        for (const spec of specs) {
          const result = await auditRoute(browser, storageState, options, role, viewportName, spec, runDir);
          results.push(result);
          const marker = result.status === "passed" ? "pass" : "fail";
          console.log(`[${marker}] ${role} ${viewportName} ${spec.path}`);
        }
      } finally {
        await browser.close().catch(() => {});
      }
    }
  }

  const manifestPath = path.join(runDir, "manifest.json");
  await fs.writeFile(manifestPath, JSON.stringify({ generatedAt: new Date().toISOString(), baseUrl: options.baseUrl, results }, null, 2));

  const failures = results.filter((result) => result.status === "failed");
  console.log(`\nVisual polish audit complete.`);
  console.log(`Manifest: ${manifestPath}`);
  console.log(`Checked: ${results.length}`);
  console.log(`Failures: ${failures.length}`);

  if (failures.length > 0) {
    for (const failure of failures.slice(0, 12)) {
      console.log(`- ${failure.role} ${failure.viewport} ${failure.route}: ${failure.failures.join(" | ")}`);
    }
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
