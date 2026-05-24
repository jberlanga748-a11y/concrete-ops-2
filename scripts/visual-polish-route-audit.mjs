import fs from "node:fs/promises";
import path from "node:path";

import { chromium } from "playwright";

import { MODULE_PATHS } from "../src/app-routing.js";
import { buildVisualPolishEvidenceFailures } from "./visual-polish-audit-rules.mjs";

const DEFAULT_BASE_URL = "http://127.0.0.1:4000/";
const DEFAULT_OUTPUT_ROOT = path.resolve(process.cwd(), "ui-audit", "visual-polish");
const DEMO_PASSWORD = "apexdemo123";
const PAGE_SETTLE_DELAY_MS = 650;
const NETWORK_IDLE_TIMEOUT_MS = 3500;
const LOGIN_READY_DELAY_MS = 900;
const AUTH_WORKSPACE_READY_TIMEOUT_MS = 12000;
const ROUTE_RENDER_READY_TIMEOUT_MS = 12000;
const SESSION_TOKEN_KEY = "apex-hq/session-token";
const LOGIN_BUTTON_NAME = /enter workspace/i;
const BROWSER_LAUNCH_TIMEOUT_MS = 20000;
const LOGIN_TIMEOUT_MS = 20000;
const ROUTE_AUDIT_TIMEOUT_MS = 20000;
const ROUTES_PER_BROWSER_SESSION = 5;
const RETRYABLE_ROUTE_FAILURE = /timed out|Target page|context or browser has been closed/i;
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
  foreman: {
    email: "demo.foreman@apexhq.app",
    viewports: ["phone"],
  },
  employee: {
    email: "demo.employee@apexhq.app",
    viewports: ["phone"],
  },
};

const DEFAULT_ADMIN_ROUTES = Object.entries(MODULE_PATHS)
  .filter(([id]) => id !== "design")
  .map(([id, routePath]) => ({ id, path: routePath }));

const DEFAULT_ROUTE_MATRIX = {
  "admin:phone": ["/dashboard", "/communications", "/leads", "/estimates", "/calculator", "/rate-book"],
  "foreman:phone": ["/jobs", "/time", "/uploads", "/reports", "/change-orders", "/calculator", "/communications", "/rate-book"],
  "employee:phone": ["/jobs", "/time", "/uploads", "/reports", "/change-orders", "/calculator", "/communications", "/rate-book"],
  "admin:tablet": ["/dashboard", "/communications", "/jobs", "/leads", "/estimates", "/time", "/uploads", "/reports", "/change-orders", "/calculator", "/rate-book"],
  "foreman:tablet": ["/jobs", "/time", "/uploads", "/reports", "/change-orders", "/calculator", "/communications", "/rate-book"],
  "employee:tablet": ["/jobs", "/time", "/uploads", "/reports", "/change-orders", "/calculator", "/communications", "/rate-book"],
};

const FIELD_FORBIDDEN_TEXT = [
  /Operations Command/i,
  /Imported Drafts/i,
  /Estimate Studio/i,
  /App Health/i,
  /Plan Readiness/i,
  /Package Locked/i,
  /Upgrade review/i,
  /billing/i,
  /profit margin/i,
  /gross margin/i,
  /margin %/i,
  /unit price/i,
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
  const nonce = Math.random().toString(36).slice(2, 8);
  return `${new Date().toISOString().replace(/[:.]/g, "-")}-${process.pid}-${nonce}`;
}

function normalizeRoute(routePath) {
  if (!routePath) return "/";
  return routePath.startsWith("/") ? routePath : `/${routePath}`;
}

function routeSpecs(options, role, viewportName) {
  if (options.routes.length > 0) {
    return options.routes.map((routePath) => ({ id: routePath.replace(/^\//, "") || "dashboard", path: normalizeRoute(routePath) }));
  }
  const scopedRoutes = DEFAULT_ROUTE_MATRIX[`${role}:${viewportName}`];
  if (scopedRoutes) {
    return scopedRoutes.map((routePath) => ({ id: routePath.replace(/^\//, "") || "dashboard", path: normalizeRoute(routePath) }));
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

async function closeWithTimeout(resource, label, timeoutMs = 5000) {
  if (!resource?.close) return;
  let timeoutId;
  await Promise.race([
    resource.close().catch(() => {}),
    new Promise((resolve) => {
      timeoutId = setTimeout(() => {
        console.warn(`${label} close timed out after ${timeoutMs}ms; continuing audit.`);
        resolve();
      }, timeoutMs);
    }),
  ]).finally(() => clearTimeout(timeoutId));
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
        ".co-apex-office-command-shell",
      ].join(",")));
      const hasWorkspaceText = /Log out|Team workspace|Today|Jobs Today|Operations Command|Field Mode/i.test(rootText);
      return hasSessionToken && !stillOnLogin && (hasWorkspaceFrame || hasWorkspaceText);
    }, SESSION_TOKEN_KEY, { timeout: AUTH_WORKSPACE_READY_TIMEOUT_MS });
  } catch (error) {
    const snapshot = await page.evaluate(() => ({
      url: window.location.href,
      text: (document.querySelector("#root")?.textContent || document.body.textContent || "").replace(/\s+/g, " ").trim().slice(0, 220),
      hasToken: Boolean(window.localStorage.getItem("apex-hq/session-token")),
    })).catch(() => ({ url: "", text: "", hasToken: false }));
    throw new Error(`${role} audit login did not reach authenticated workspace. url=${snapshot.url || "unknown"} hasToken=${snapshot.hasToken} text="${snapshot.text}"`);
  }
}

async function waitForRouteAuditEvidence(page, role, viewportName, routePath) {
  try {
    await page.waitForFunction((tokenKey) => {
      const rootText = (document.querySelector("#root")?.textContent || document.body.textContent || "").replace(/\s+/g, " ").trim();
      const hasSessionToken = Boolean(window.localStorage.getItem(tokenKey));
      const hasWorkspaceFrame = Boolean(document.querySelector([
        "main",
        "[role='main']",
        ".co-app-shell-main",
        ".co-office-page",
        ".co-mobile-role-shell",
        ".co-field-mobile-remote",
        ".co-apex-office-command-shell",
      ].join(",")));
      const hasVisibleRouteText = rootText.length > 120 && !/^Loading/i.test(rootText);
      const stillOnLogin = Boolean(document.querySelector("input[type='password']")) && /Enter workspace/i.test(rootText);
      return hasSessionToken && !stillOnLogin && (hasWorkspaceFrame || hasVisibleRouteText);
    }, SESSION_TOKEN_KEY, { timeout: ROUTE_RENDER_READY_TIMEOUT_MS });
  } catch (error) {
    const snapshot = await page.evaluate(() => ({
      url: window.location.href,
      text: (document.querySelector("#root")?.textContent || document.body.textContent || "").replace(/\s+/g, " ").trim().slice(0, 220),
      hasToken: Boolean(window.localStorage.getItem("apex-hq/session-token")),
    })).catch(() => ({ url: "", text: "", hasToken: false }));
    throw new Error(`${role} ${viewportName} ${routePath} did not render auditable workspace evidence. url=${snapshot.url || "unknown"} hasToken=${snapshot.hasToken} text="${snapshot.text}"`);
  }
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
      await waitForAuthenticatedWorkspace(page, role);
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
  return page.evaluate(({ fieldForbiddenPatterns, roleName }) => {
    const parseRgb = (value) => {
      const match = String(value || "").match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
      return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
    };
    const luminance = (rgb) => {
      if (!rgb) return null;
      const [red, green, blue] = rgb.map((channel) => {
        const value = channel / 255;
        return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
    };
    const contrastRatio = (foreground, background) => {
      const fg = luminance(parseRgb(foreground));
      const bg = luminance(parseRgb(background));
      if (fg == null || bg == null) return null;
      const light = Math.max(fg, bg);
      const dark = Math.min(fg, bg);
      return (light + 0.05) / (dark + 0.05);
    };
    const effectiveBackground = (element) => {
      const opaqueColorFromImage = (value) => {
        const matches = String(value || "").matchAll(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/gi);
        for (const match of matches) {
          const alpha = match[4] == null ? 1 : Number(match[4]);
          if (alpha >= 0.5) return `rgb(${match[1]}, ${match[2]}, ${match[3]})`;
        }
        return "";
      };
      let current = element;
      while (current && current !== document.documentElement) {
        const style = window.getComputedStyle(current);
        const bg = style.backgroundColor;
        const alphaMatch = String(bg || "").match(/rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+(?:\s*,\s*([\d.]+))?\s*\)/i);
        const alpha = alphaMatch?.[1] == null ? 1 : Number(alphaMatch[1]);
        if (bg && !/rgba?\(0,\s*0,\s*0,\s*0\)|transparent/i.test(bg) && alpha >= 0.75) return bg;
        const imageColor = opaqueColorFromImage(style.backgroundImage);
        if (imageColor) return imageColor;
        current = current.parentElement;
      }
      const bodyBg = window.getComputedStyle(document.body).backgroundColor || "";
      return /rgba?\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\)|transparent/i.test(bodyBg) ? "rgb(255, 255, 255)" : bodyBg || "rgb(255, 255, 255)";
    };
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
        const intendedScrollContainer = ["auto", "scroll"].includes(style.overflowY)
          && clipsY
          && !["button", "a", "summary", "input", "select", "textarea"].includes(element.tagName.toLowerCase());
        const clipsByStyle = ["hidden", "clip", "scroll", "auto"].includes(style.overflowX)
          || ["hidden", "clip", "scroll", "auto"].includes(style.overflowY)
          || style.textOverflow === "ellipsis"
          || style.whiteSpace === "nowrap";
        if (intendedScrollContainer) return false;
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
    const smallTouchTargets = Array.from(document.querySelectorAll("button, a, input, textarea, select, summary"))
      .filter((element) => !element.closest(".co-apex-assistant-shell"))
      .filter(visible)
      .map(rectOf)
      .filter((entry) => entry && (entry.width < 44 || entry.height < 44))
      .slice(0, 12)
      .map((entry) => ({
        label: entry.text || entry.className || entry.tag,
        rect: entry.rect,
      }));
    const lowContrastText = Array.from(document.querySelectorAll("h1,h2,h3,p,span,strong,em,button,a,label,th,td"))
      .filter(visible)
      .filter((element) => (element.textContent || "").trim().length > 2)
      .map((element) => {
        const style = window.getComputedStyle(element);
        const ratio = contrastRatio(style.color, effectiveBackground(element));
        return {
          label: (element.textContent || "").replace(/\s+/g, " ").trim().slice(0, 80),
          ratio: ratio == null ? "" : ratio.toFixed(2),
          rect: rectOf(element)?.rect || "",
        };
      })
      .filter((entry) => entry.ratio && Number(entry.ratio) < 2.25)
      .slice(0, 12);
    const visibleDesktopTables = Array.from(document.querySelectorAll("table"))
      .filter(visible)
      .filter((element) => !element.closest(".co-field-mobile-tool-surface"))
      .length;
    const forbiddenText = fieldForbiddenPatterns
      .filter((pattern) => new RegExp(pattern.source, pattern.flags).test(text))
      .map((pattern) => pattern.source);
    const fieldRole = ["foreman", "employee"].includes(roleName);

    return {
      pathname: window.location.pathname,
      h1: document.querySelector("h1")?.textContent || "",
      bodyText: text.replace(/\s+/g, " ").trim().slice(0, 6000),
      bodyTextLength: text.replace(/\s+/g, " ").trim().length,
      rootEmpty: !document.querySelector("#root")?.textContent?.trim(),
      hasMainLandmark: Array.from(document.querySelectorAll("main, [role='main'], .co-app-shell-main, .co-office-page, .co-field-mobile-remote, .co-mobile-role-shell")).some(visible),
      hasOfficeCommandShell: Boolean(document.querySelector(".co-apex-office-command-shell")),
      visibleDesktopTables,
      smallTouchTargets,
      lowContrastText,
      bodyOverflow: document.body.scrollWidth > window.innerWidth + 1,
      assistantOverlaps: interactiveCandidates.filter((candidate) => trigger && candidate && trigger.x < candidate.x + candidate.width && trigger.x + trigger.width > candidate.x && trigger.y < candidate.y + candidate.height && trigger.y + trigger.height > candidate.y),
      clipped: clippedCandidates,
      forbiddenText: fieldRole ? forbiddenText : [],
    };
  }, {
    fieldForbiddenPatterns: FIELD_FORBIDDEN_TEXT.map((pattern) => ({ source: pattern.source, flags: pattern.flags })),
    roleName: role,
  });
}

async function auditRoute(browser, storageState, options, role, viewportName, spec, runDir) {
  let context;
  try {
    context = await withTimeout(
      browser.newContext({
        baseURL: options.baseUrl,
        storageState,
        viewport: VIEWPORTS[viewportName],
      }),
      ROUTE_AUDIT_TIMEOUT_MS,
      `${role} ${viewportName} ${spec.path} context`,
    );
  } catch (error) {
    return {
      role,
      viewport: viewportName,
      route: spec.path,
      routeId: spec.id,
      pathname: "",
      h1: "",
      status: "failed",
      failures: [`Route audit failed: ${error?.message || String(error)}`],
    };
  }
  context.setDefaultTimeout(10000);
  context.setDefaultNavigationTimeout(15000);
  let page;
  try {
    page = await withTimeout(context.newPage(), ROUTE_AUDIT_TIMEOUT_MS, `${role} ${viewportName} ${spec.path} page`);
  } catch (error) {
    await closeWithTimeout(context, `${role} ${viewportName} ${spec.path} context`);
    return {
      role,
      viewport: viewportName,
      route: spec.path,
      routeId: spec.id,
      pathname: "",
      h1: "",
      status: "failed",
      failures: [`Route audit failed: ${error?.message || String(error)}`],
    };
  }
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
      await waitForRouteAuditEvidence(page, role, viewportName, spec.path);
      await settlePage(page);
      inspection = await inspectPage(page, role);
    })(), ROUTE_AUDIT_TIMEOUT_MS, `${role} ${viewportName} ${spec.path} audit`, {
      onTimeout: () => closeWithTimeout(context, `${role} ${viewportName} ${spec.path} context`),
    });
  } catch (error) {
    auditError = error?.message || String(error);
  }

  const failures = [
    auditError ? `Route audit failed: ${auditError}` : "",
    ...buildVisualPolishEvidenceFailures({ inspection, role, viewportName, route: spec.path }),
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

  await closeWithTimeout(context, `${role} ${viewportName} ${spec.path} context`);
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

function isRetryableRouteFailure(result) {
  return result?.status === "failed" && result.failures?.some((failure) => RETRYABLE_ROUTE_FAILURE.test(failure));
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const runDir = path.join(options.outputRoot, timestampSlug());
  await ensureDirectory(runDir);

  const results = [];

  for (const role of options.roles) {
    const viewports = options.viewports.length > 0 ? options.viewports : ROLE_CONFIGS[role].viewports;
    for (const viewportName of viewports) {
      const specs = routeSpecs(options, role, viewportName);
      let browser;
      let routesInSession = ROUTES_PER_BROWSER_SESSION;
      let storageState;
      let loginBrowser;
      try {
        const loginLaunch = await launchBrowser(options);
        loginBrowser = loginLaunch.browser;
        console.log(`Browser: ${loginLaunch.browserName} (${role} ${viewportName} login)`);
        storageState = await login(loginBrowser, options, role, viewportName);
        await closeWithTimeout(loginBrowser, `${role} ${viewportName} login browser`);
        loginBrowser = null;

        for (const spec of specs) {
          if (!browser || routesInSession >= ROUTES_PER_BROWSER_SESSION) {
            if (browser) await closeWithTimeout(browser, `${role} ${viewportName} browser`);
            const launched = await launchBrowser(options);
            browser = launched.browser;
            routesInSession = 0;
            console.log(`Browser: ${launched.browserName} (${role} ${viewportName})`);
          }
          let result = await auditRoute(browser, storageState, options, role, viewportName, spec, runDir);
          if (isRetryableRouteFailure(result)) {
            console.warn(`[retry] ${role} ${viewportName} ${spec.path}: ${result.failures.join("; ")}`);
            await closeWithTimeout(browser, `${role} ${viewportName} browser`);
            const launched = await launchBrowser(options);
            browser = launched.browser;
            routesInSession = 0;
            console.log(`Browser: ${launched.browserName} (${role} ${viewportName} retry)`);
            result = await auditRoute(browser, storageState, options, role, viewportName, spec, runDir);
          }
          routesInSession += 1;
          results.push(result);
          const marker = result.status === "passed" ? "pass" : "fail";
          console.log(`[${marker}] ${role} ${viewportName} ${spec.path}`);
        }
      } finally {
        if (loginBrowser) await closeWithTimeout(loginBrowser, `${role} ${viewportName} login browser`);
        if (browser) await closeWithTimeout(browser, `${role} ${viewportName} browser`);
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
