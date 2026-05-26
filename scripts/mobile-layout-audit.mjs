import fs from "node:fs/promises";
import path from "node:path";

import { chromium } from "playwright";

const DEFAULT_BASE_URL = "http://127.0.0.1:4000/";
const DEFAULT_OUTPUT_ROOT = path.resolve(process.cwd(), "output", "playwright", "mobile-layout-audit");
const DEMO_PASSWORD = "apexdemo123";
const LOGIN_BUTTON_NAME = /enter workspace/i;
const SESSION_TOKEN_KEY = "apex-hq/session-token";
const LOGIN_READY_DELAY_MS = 900;
const PAGE_SETTLE_DELAY_MS = 650;
const NETWORK_IDLE_TIMEOUT_MS = 3500;
const AUTH_WORKSPACE_READY_TIMEOUT_MS = 12000;
const ROUTE_READY_TIMEOUT_MS = 12000;
const BROWSER_LAUNCH_TIMEOUT_MS = 20000;
const CLOSE_TIMEOUT_MS = 5000;
const LOGIN_TIMEOUT_MS = 45000;
const ROUTE_AUDIT_TIMEOUT_MS = 45000;

const PHONE_VIEWPORT = { width: 390, height: 844 };

const ROLE_CONFIGS = {
  foreman: { email: "demo.foreman@apexhq.app" },
  employee: { email: "demo.employee@apexhq.app" },
};

const DEFAULT_ROUTES = ["/jobs", "/uploads", "/reports"];

const ROUTE_CONTRACTS = {
  "/jobs": {
    contentSelector: ".co-field-landing-stack",
    primarySelector: ".co-field-mobile-remote",
    firstCardSelector: ".co-field-mobile-queue-card",
    maxFirstCardNavOverlap: 0,
    maxScrollTailPx: 200,
  },
  "/uploads": {
    contentSelector: ".co-uploads-field-panel, .co-uploads-mobile-focus, .co-field-mobile-tool-surface",
    primarySelector: ".co-uploads-field-panel, .co-uploads-mobile-focus, .co-field-mobile-tool-surface",
    maxViewportDeadSpacePx: 180,
    maxInternalPanelDeadSpacePx: 120,
    maxScrollTailPx: 180,
  },
  "/reports": {
    contentSelector: ".co-reports-page.co-field-mobile-reports-shell[data-field-workspace=\"true\"] .co-reports-ops-card, .co-reports-field-panel, .co-reports-mobile-closeout-card, .co-field-mobile-tool-surface",
    primarySelector: ".co-reports-page.co-field-mobile-reports-shell[data-field-workspace=\"true\"] .co-reports-ops-card, .co-reports-field-panel, .co-reports-mobile-closeout-card, .co-field-mobile-tool-surface",
    allowedRedirects: { employee: "/jobs" },
    maxViewportDeadSpacePx: 220,
    maxInternalPanelDeadSpacePx: 140,
    maxScrollTailPx: 220,
  },
};

const BROWSER_LAUNCH_OPTIONS = [
  { label: "chromium", options: {} },
  { label: "msedge", options: { channel: "msedge" } },
];

let progressPath = "";

async function progress(message) {
  if (!progressPath) return;
  await fs.appendFile(progressPath, `${new Date().toISOString()} ${message}\n`).catch(() => {});
}

function printHelp() {
  console.log(`Apex HQ mobile layout audit

Usage:
  npm run audit:mobile-layout

Optional flags:
  --base-url=http://127.0.0.1:4000/
  --roles=foreman,employee
  --routes=/jobs,/uploads,/reports
  --output-dir=output/playwright/mobile-layout-audit
  --browser=auto|chromium|msedge
  --headed
  --help
`);
}

function parseArgs(argv) {
  const options = {
    baseUrl: DEFAULT_BASE_URL,
    outputRoot: DEFAULT_OUTPUT_ROOT,
    roles: Object.keys(ROLE_CONFIGS),
    routes: DEFAULT_ROUTES,
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
    if (arg.startsWith("--routes=")) {
      options.routes = arg.split("=")[1].split(",").map((value) => normalizeRoute(value.trim())).filter(Boolean);
      continue;
    }
    if (arg.startsWith("--output-dir=")) {
      options.outputRoot = path.resolve(process.cwd(), arg.split("=")[1]);
      continue;
    }
    if (arg.startsWith("--browser=")) {
      options.browser = arg.split("=")[1].trim();
    }
  }

  options.baseUrl = new URL(options.baseUrl).toString();

  const invalidRoles = options.roles.filter((role) => !ROLE_CONFIGS[role]);
  if (invalidRoles.length) throw new Error(`Unknown roles: ${invalidRoles.join(", ")}`);

  if (!["auto", ...BROWSER_LAUNCH_OPTIONS.map((candidate) => candidate.label)].includes(options.browser)) {
    throw new Error(`Unknown browser: ${options.browser}`);
  }

  return options;
}

function normalizeRoute(routePath) {
  if (!routePath) return "";
  return routePath.startsWith("/") ? routePath : `/${routePath}`;
}

function timestampSlug() {
  const nonce = Math.random().toString(36).slice(2, 8);
  return `${new Date().toISOString().replace(/[:.]/g, "-")}-${process.pid}-${nonce}`;
}

async function ensureDirectory(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

function withTimeout(promise, timeoutMs, label, { onTimeout } = {}) {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(async () => {
      await onTimeout?.();
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
}

async function closeWithTimeout(resource, label, timeoutMs = CLOSE_TIMEOUT_MS) {
  if (!resource?.close) return;
  let timeoutId;
  await Promise.race([
    resource.close().catch(() => {}),
    new Promise((resolve) => {
      timeoutId = setTimeout(() => {
        console.warn(`${label} close timed out after ${timeoutMs}ms; continuing.`);
        resolve();
      }, timeoutMs);
    }),
  ]).finally(() => clearTimeout(timeoutId));
}

async function settlePage(page) {
  await page.waitForLoadState("domcontentloaded").catch(() => {});
  await page.waitForTimeout(PAGE_SETTLE_DELAY_MS);
  await page.waitForLoadState("networkidle", { timeout: NETWORK_IDLE_TIMEOUT_MS }).catch(() => {});
}

async function waitForAuthenticatedWorkspace(page, role) {
  try {
    await page.waitForFunction((tokenKey) => {
      const rootText = (document.querySelector("#root")?.textContent || document.body.textContent || "").replace(/\s+/g, " ").trim();
      const hasSessionToken = Boolean(window.localStorage.getItem(tokenKey));
      const stillOnLogin = Boolean(document.querySelector("input[type='password']")) && /Enter workspace/i.test(rootText);
      const hasWorkspaceFrame = Boolean(document.querySelector([
        "main",
        "[role='main']",
        ".co-app-shell-main",
        ".co-office-page",
        ".co-mobile-role-shell",
        ".co-field-mobile-remote",
      ].join(",")));
      const hasWorkspaceText = /Log out|Team workspace|Today|Operations Command|Field Mode|Photo Evidence/i.test(rootText);
      return !stillOnLogin && (hasSessionToken || hasWorkspaceFrame || hasWorkspaceText);
    }, SESSION_TOKEN_KEY, { timeout: AUTH_WORKSPACE_READY_TIMEOUT_MS });
  } catch {
    const snapshot = await page.evaluate(() => ({
      url: window.location.href,
      text: (document.querySelector("#root")?.textContent || document.body.textContent || "").replace(/\s+/g, " ").trim().slice(0, 220),
      hasToken: Boolean(window.localStorage.getItem("apex-hq/session-token")),
    })).catch(() => ({ url: "", text: "", hasToken: false }));
    throw new Error(`${role} login did not reach authenticated workspace. url=${snapshot.url || "unknown"} hasToken=${snapshot.hasToken} text="${snapshot.text}"`);
  }
}

async function waitForRouteReady(page, role, routePath) {
  try {
    await page.waitForFunction((tokenKey) => {
      const rootText = (document.querySelector("#root")?.textContent || document.body.textContent || "").replace(/\s+/g, " ").trim();
      const hasSessionToken = Boolean(window.localStorage.getItem(tokenKey));
      const stillOnLogin = Boolean(document.querySelector("input[type='password']")) && /Enter workspace/i.test(rootText);
      const hasRouteFrame = Boolean(document.querySelector([
        ".co-office-page",
        ".co-field-mobile-remote",
        ".co-uploads-field-panel",
        ".co-reports-field-panel",
        ".co-field-mobile-tool-surface",
      ].join(",")));
      return !stillOnLogin && (hasSessionToken || hasRouteFrame || rootText.length > 120);
    }, SESSION_TOKEN_KEY, { timeout: ROUTE_READY_TIMEOUT_MS });
  } catch {
    const snapshot = await page.evaluate(() => ({
      url: window.location.href,
      text: (document.querySelector("#root")?.textContent || document.body.textContent || "").replace(/\s+/g, " ").trim().slice(0, 220),
      hasToken: Boolean(window.localStorage.getItem("apex-hq/session-token")),
    })).catch(() => ({ url: "", text: "", hasToken: false }));
    throw new Error(`${role} ${routePath} did not render mobile layout evidence. url=${snapshot.url || "unknown"} hasToken=${snapshot.hasToken} text="${snapshot.text}"`);
  }
}

function isNavigationAbort(errorText = "") {
  return /net::ERR_ABORTED/i.test(String(errorText));
}

async function createAuthenticatedContext(browser, options, role) {
  await progress(`${role} login: new context`);
  const context = await browser.newContext({
    baseURL: options.baseUrl,
    viewport: PHONE_VIEWPORT,
    isMobile: true,
    hasTouch: true,
  });
  context.setDefaultTimeout(10000);
  context.setDefaultNavigationTimeout(15000);
  const page = await context.newPage();
  await progress(`${role} login: page created`);
  try {
    await page.goto("/", { waitUntil: "domcontentloaded" });
  } catch (error) {
    if (!isNavigationAbort(error?.message || "")) throw error;
  }
  await progress(`${role} login: goto complete`);
  await settlePage(page);
  await progress(`${role} login: settled`);
  await page.getByLabel("Email").first().fill(ROLE_CONFIGS[role].email);
  await progress(`${role} login: email filled`);
  await page.getByLabel("Password").first().fill(DEMO_PASSWORD);
  await progress(`${role} login: password filled`);
  await page.getByRole("button", { name: LOGIN_BUTTON_NAME }).click();
  await progress(`${role} login: clicked submit`);
  await page.waitForTimeout(LOGIN_READY_DELAY_MS);
  await settlePage(page);
  await progress(`${role} login: post-submit settled`);
  await waitForAuthenticatedWorkspace(page, role);
  await progress(`${role} login: authenticated workspace`);
  await page.close().catch(() => {});
  return context;
}

function intersectionArea(a, b) {
  if (!a || !b) return 0;
  const width = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
  const height = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  return Math.round(width * height);
}

async function inspectMobileLayout(page, routePath) {
  const contract = ROUTE_CONTRACTS[routePath] || {};
  return page.evaluate(({ contract: pageContract }) => {
    const visible = (element) => {
      if (!element) return false;
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 3 && rect.height > 3 && rect.bottom > 0 && rect.top < window.innerHeight && style.display !== "none" && style.visibility !== "hidden";
    };
    const rectOf = (element) => {
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return {
        top: Math.round(rect.top),
        right: Math.round(rect.right),
        bottom: Math.round(rect.bottom),
        left: Math.round(rect.left),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      };
    };
    const firstVisible = (selector) => selector
      ? Array.from(document.querySelectorAll(selector)).find((element) => visible(element)) || null
      : null;
    const allVisible = (selector) => selector
      ? Array.from(document.querySelectorAll(selector)).filter((element) => visible(element))
      : [];
    const bottomOfLastMeaningfulChild = (element) => {
      if (!element) return null;
      const descendants = Array.from(element.querySelectorAll("button, a, h1, h2, h3, p, span, strong, em, [class*=strip], [class*=facts], [class*=actions]"))
        .filter(visible)
        .map((child) => child.getBoundingClientRect().bottom);
      if (!descendants.length) return null;
      return Math.round(Math.max(...descendants));
    };

    const nav = firstVisible("nav.co-mobile-bottom-nav");
    const content = firstVisible(pageContract.contentSelector);
    const primary = firstVisible(pageContract.primarySelector);
    const firstCard = firstVisible(pageContract.firstCardSelector);
    const navRect = rectOf(nav);
    const contentRect = rectOf(content);
    const primaryRect = rectOf(primary);
    const firstCardRect = rectOf(firstCard);
    const mainRect = rectOf(firstVisible("main, [role='main'], .co-app-shell-main"));
    const panelLastChildBottom = bottomOfLastMeaningfulChild(primary);
    const internalPanelDeadSpace = primaryRect && panelLastChildBottom != null
      ? Math.max(0, primaryRect.bottom - panelLastChildBottom)
      : 0;
    const contentBottom = Math.max(
      contentRect?.bottom || 0,
      primaryRect?.bottom || 0,
      firstCardRect?.bottom || 0,
      ...allVisible(".co-field-mobile-queue-card, .co-uploads-mobile-card, .co-reports-mobile-card, .co-field-mobile-tool-surface, .co-field-operator-panel")
        .map((element) => rectOf(element)?.bottom || 0),
    );
    const pageContentBottom = Math.max(
      contentRect ? contentRect.bottom + window.scrollY : 0,
      primaryRect ? primaryRect.bottom + window.scrollY : 0,
      ...allVisible(".co-field-mobile-queue-card, .co-uploads-mobile-card, .co-reports-mobile-card, .co-field-mobile-tool-surface, .co-field-operator-panel")
        .map((element) => element.getBoundingClientRect().bottom + window.scrollY),
    );
    const viewportDeadSpace = navRect && contentBottom < navRect.top
      ? Math.round(navRect.top - contentBottom)
      : 0;
    const actionableOverlap = allVisible("button, a, summary")
      .filter((element) => !element.closest("nav.co-mobile-bottom-nav"))
      .map((element) => ({ rect: rectOf(element), text: (element.textContent || "").replace(/\s+/g, " ").trim().slice(0, 80) }))
      .filter((entry) => entry.rect && navRect && !(entry.rect.right <= navRect.left || entry.rect.left >= navRect.right || entry.rect.bottom <= navRect.top || entry.rect.top >= navRect.bottom));

    return {
      pathname: window.location.pathname,
      scrollHeight: document.documentElement.scrollHeight,
      viewportHeight: window.innerHeight,
      bodyOverflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
      navRect,
      mainRect,
      contentRect,
      primaryRect,
      firstCardRect,
      firstCardNavOverlapArea: firstCardRect && navRect
        ? Math.round(Math.max(0, Math.min(firstCardRect.right, navRect.right) - Math.max(firstCardRect.left, navRect.left)) * Math.max(0, Math.min(firstCardRect.bottom, navRect.bottom) - Math.max(firstCardRect.top, navRect.top)))
        : 0,
      viewportDeadSpace,
      internalPanelDeadSpace,
      scrollTail: Math.max(0, Math.round(document.documentElement.scrollHeight - pageContentBottom)),
      actionableOverlap,
      hasContent: Boolean(contentRect || primaryRect),
    };
  }, { contract });
}

function buildFailures(metrics, routePath, role) {
  const contract = ROUTE_CONTRACTS[routePath] || {};
  const failures = [];
  if (contract.allowedRedirects?.[role] === metrics.pathname) return failures;

  if (!metrics.hasContent) failures.push("No auditable mobile content panel/card was found for this route.");
  if (!metrics.navRect) failures.push("Mobile bottom nav was not found.");
  if (metrics.bodyOverflowX) failures.push("Horizontal page overflow detected.");

  const maxFirstCardNavOverlap = contract.maxFirstCardNavOverlap ?? 0;
  if (metrics.firstCardNavOverlapArea > maxFirstCardNavOverlap) {
    failures.push(`Bottom nav overlaps first primary card by ${metrics.firstCardNavOverlapArea}px area.`);
  }

  const actionableOverlap = Array.isArray(metrics.actionableOverlap) ? metrics.actionableOverlap : [];
  if (actionableOverlap.length > 0) {
    const labels = actionableOverlap.slice(0, 3).map((entry) => entry.text || `${entry.rect.width}x${entry.rect.height}`).join(", ");
    failures.push(`Bottom nav overlaps visible route action(s): ${labels}.`);
  }

  const maxViewportDeadSpacePx = contract.maxViewportDeadSpacePx;
  if (Number.isFinite(maxViewportDeadSpacePx) && metrics.viewportDeadSpace > maxViewportDeadSpacePx) {
    failures.push(`Visible content ends ${metrics.viewportDeadSpace}px above bottom nav; max allowed is ${maxViewportDeadSpacePx}px.`);
  }

  const maxInternalPanelDeadSpacePx = contract.maxInternalPanelDeadSpacePx;
  if (Number.isFinite(maxInternalPanelDeadSpacePx) && metrics.internalPanelDeadSpace > maxInternalPanelDeadSpacePx) {
    failures.push(`Primary panel has ${metrics.internalPanelDeadSpace}px of internal dead space; max allowed is ${maxInternalPanelDeadSpacePx}px.`);
  }

  const maxScrollTailPx = contract.maxScrollTailPx;
  if (Number.isFinite(maxScrollTailPx) && metrics.scrollTail > maxScrollTailPx) {
    failures.push(`Document scroll tail is ${metrics.scrollTail}px after content; max allowed is ${maxScrollTailPx}px.`);
  }

  return failures;
}

async function auditRoute(context, role, routePath, runDir) {
  const page = await context.newPage();
  await progress(`${role} ${routePath}: page created`);
  let metrics = {};
  let auditError = "";

  try {
    try {
      await page.goto(routePath, { waitUntil: "domcontentloaded" });
    } catch (error) {
      if (!isNavigationAbort(error?.message || "")) throw error;
    }
    await progress(`${role} ${routePath}: goto complete`);
    await settlePage(page);
    await progress(`${role} ${routePath}: settled`);
    await waitForRouteReady(page, role, routePath);
    await progress(`${role} ${routePath}: route ready`);
    await settlePage(page);
    await progress(`${role} ${routePath}: route settled`);
    metrics = await inspectMobileLayout(page, routePath);
    await progress(`${role} ${routePath}: inspected`);
  } catch (error) {
    auditError = error?.message || String(error);
  }

  const failures = [
    auditError ? `Route audit failed: ${auditError}` : "",
    ...buildFailures(metrics, routePath, role),
  ].filter(Boolean);

  const routeSlug = routePath.replace(/^\//, "") || "dashboard";
  const screenshotPath = path.join(runDir, role, `${routeSlug}.png`);
  if (failures.length) {
    await ensureDirectory(path.dirname(screenshotPath));
    await page.screenshot({ path: screenshotPath, fullPage: false, animations: "disabled", caret: "hide" }).catch(() => {});
  }

  await page.close().catch(() => {});
  return {
    role,
    route: routePath,
    status: failures.length ? "failed" : "passed",
    failures,
    metrics,
    screenshotPath: failures.length ? screenshotPath : undefined,
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
  progressPath = path.join(runDir, "progress.log");
  await progress(`audit start baseUrl=${options.baseUrl} roles=${options.roles.join(",")} routes=${options.routes.join(",")}`);

  const results = [];

  for (const role of options.roles) {
    const roleLaunch = await launchBrowser(options);
    await progress(`${role} browser launched: ${roleLaunch.browserName}`);
    console.log(`Browser: ${roleLaunch.browserName} (${role})`);
    let context;
    try {
      context = await withTimeout(
      createAuthenticatedContext(roleLaunch.browser, options, role),
      LOGIN_TIMEOUT_MS,
      `${role} login`,
      { onTimeout: () => closeWithTimeout(roleLaunch.browser, `${role} browser`) },
    );
      for (const routePath of options.routes) {
        const result = await withTimeout(
          auditRoute(context, role, routePath, runDir),
          ROUTE_AUDIT_TIMEOUT_MS,
          `${role} ${routePath} audit`,
          { onTimeout: () => closeWithTimeout(roleLaunch.browser, `${role} browser`) },
        );
        results.push(result);
        const marker = result.status === "passed" ? "pass" : "fail";
        console.log(`[${marker}] ${role} phone ${routePath}`);
      }
    } finally {
      if (context) await closeWithTimeout(context, `${role} context`);
      await closeWithTimeout(roleLaunch.browser, `${role} browser`);
    }
  }

  const manifestPath = path.join(runDir, "manifest.json");
  await fs.writeFile(manifestPath, JSON.stringify({ generatedAt: new Date().toISOString(), baseUrl: options.baseUrl, viewport: PHONE_VIEWPORT, results }, null, 2));

  const failures = results.filter((result) => result.status === "failed");
  console.log("\nMobile layout audit complete.");
  console.log(`Manifest: ${manifestPath}`);
  console.log(`Checked: ${results.length}`);
  console.log(`Failures: ${failures.length}`);

  for (const failure of failures.slice(0, 12)) {
    console.log(`- ${failure.role} ${failure.route}: ${failure.failures.join(" | ")}`);
  }

  if (failures.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
