import fs from "node:fs/promises";
import path from "node:path";

import { chromium } from "playwright";

const DEFAULT_BASE_URL = "http://localhost:4000/";
const DEFAULT_OUTPUT_ROOT = path.resolve(process.cwd(), "ui-audit", "public-site");
const DEFAULT_VIEWPORTS = ["1440x1000", "768x1024", "390x844"];
const VIEWPORTS = {
  "1440x1000": { width: 1440, height: 1000 },
  "768x1024": { width: 768, height: 1024 },
  "390x844": { width: 390, height: 844 },
};
const FORBIDDEN_PUBLIC_CLAIMS = [
  /guarantee(?:d|s)?\s+(?:leads|jobs|revenue|growth)/i,
  /replaces?\s+(?:quickbooks|payroll|accounting)/i,
  /ai\s+(?:runs|prices|bids|approves|sends)/i,
  /enterprise[-\s]?ready/i,
  /soc\s*2/i,
  /stripe|checkout|invoice|payment collection/i,
  /public self[-\s]?serve saas/i,
];

function printHelp() {
  console.log(`Apex HQ public site UI audit

Usage:
  npm run audit:public-site

Optional flags:
  --base-url=http://localhost:4000/
  --viewports=1440x1000,768x1024,390x844
  --output-dir=ui-audit/public-site
  --headed
  --help
`);
}

function parseArgs(argv) {
  const options = {
    baseUrl: DEFAULT_BASE_URL,
    outputRoot: DEFAULT_OUTPUT_ROOT,
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
    if (arg.startsWith("--base-url=")) {
      options.baseUrl = arg.split("=")[1];
      continue;
    }
    if (arg.startsWith("--viewports=")) {
      options.viewports = arg.split("=")[1].split(",").map((value) => value.trim()).filter(Boolean);
      continue;
    }
    if (arg.startsWith("--output-dir=")) {
      options.outputRoot = path.resolve(process.cwd(), arg.split("=")[1]);
    }
  }

  options.baseUrl = new URL(options.baseUrl).toString();
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

function findForbiddenClaims(text = "") {
  return FORBIDDEN_PUBLIC_CLAIMS
    .map((pattern) => text.match(pattern)?.[0] || "")
    .filter(Boolean);
}

async function checkViewport(browser, options, viewportName, runDir) {
  const viewport = VIEWPORTS[viewportName];
  const context = await browser.newContext({ baseURL: options.baseUrl, viewport });
  const page = await context.newPage();
  const consoleErrors = [];
  const failedRequests = [];
  const failedResponses = [];

  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) {
      consoleErrors.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on("requestfailed", (request) => {
    failedRequests.push(`${request.method()} ${request.url()} ${request.failure()?.errorText || "failed"}`);
  });
  page.on("response", (response) => {
    if (response.status() >= 400) {
      failedResponses.push(`${response.status()} ${response.url()}`);
    }
  });

  await page.goto("/founder-pilot", { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: /stop chasing job details/i }).waitFor({ timeout: 10_000 });

  const beforeSubmit = await page.evaluate(() => {
    const text = document.body.textContent || "";
    return {
      h1: document.querySelector("h1")?.textContent || "",
      bodyWidth: document.body.scrollWidth,
      viewportWidth: window.innerWidth,
      horizontalOverflow: document.body.scrollWidth > window.innerWidth + 1,
      hasLoginLink: Array.from(document.querySelectorAll("button,a")).some((el) => /login/i.test(el.textContent || "")),
      hasManualCopy: text.includes("Apex HQ does not send automatic email or SMS"),
      text,
    };
  });

  await page.getByLabel("Name", { exact: true }).fill("QA Owner");
  await page.getByLabel("Company", { exact: true }).fill("QA Concrete");
  await page.getByLabel("Phone", { exact: true }).fill("541-555-0100");
  await page.getByLabel("What is scattered today?", { exact: true }).fill("Job notes live in texts.");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: /submit walkthrough request/i }).click();
  await page.getByText(/manual founder review/i).waitFor({ timeout: 10_000 });
  await page.getByText(/saved for manual review/i).waitFor({ timeout: 10_000 });

  const preparedRequests = await page.locator("textarea[readonly]").evaluateAll((elements) => (
    elements.map((element) => element.value || element.textContent || "")
  )).catch(() => []);
  const preparedRequest = preparedRequests.find((value) => /manual founder follow-up only/i.test(value)) || preparedRequests[0] || "";
  const actionableConsoleErrors = consoleErrors.filter((message) => !/Failed to load resource/i.test(message));
  const actionableFailedResponses = failedResponses.filter((entry) => !/\/favicon\.ico(?:$|\?)/i.test(entry));
  const screenshotPath = path.join(runDir, `founder-pilot-${viewportName}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true, animations: "disabled", caret: "hide" });
  await context.close();

  const forbiddenClaims = findForbiddenClaims(beforeSubmit.text);
  const failures = [
    beforeSubmit.h1 !== "Stop chasing job details." ? "Expected public site H1 was not visible." : "",
    beforeSubmit.horizontalOverflow ? "Horizontal overflow detected." : "",
    !beforeSubmit.hasLoginLink ? "Login handoff was not visible." : "",
    !beforeSubmit.hasManualCopy ? "Manual follow-up copy was not visible." : "",
    forbiddenClaims.length > 0 ? `Forbidden public claim copy found: ${forbiddenClaims.join(", ")}` : "",
    !/manual founder follow-up only/i.test(preparedRequest) ? "Saved request did not preserve manual follow-up boundary." : "",
    actionableConsoleErrors.length > 0 ? `Console warnings/errors: ${actionableConsoleErrors.join(" | ")}` : "",
    failedRequests.length > 0 ? `Failed network requests: ${failedRequests.join(" | ")}` : "",
    actionableFailedResponses.length > 0 ? `Failed HTTP responses: ${actionableFailedResponses.join(" | ")}` : "",
  ].filter(Boolean);

  return {
    viewport: viewportName,
    ok: failures.length === 0,
    failures,
    metrics: {
      h1: beforeSubmit.h1,
      bodyWidth: beforeSubmit.bodyWidth,
      viewportWidth: beforeSubmit.viewportWidth,
      horizontalOverflow: beforeSubmit.horizontalOverflow,
      hasLoginLink: beforeSubmit.hasLoginLink,
      hasManualCopy: beforeSubmit.hasManualCopy,
      preparedRequestManual: /manual founder follow-up only/i.test(preparedRequest),
    },
    consoleErrors,
    failedRequests,
    failedResponses,
    screenshotPath,
  };
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
  const results = [];
  try {
    for (const viewportName of options.viewports) {
      results.push(await checkViewport(browser, options, viewportName, runDir));
    }
  } finally {
    await browser.close();
  }

  const report = {
    ok: results.every((result) => result.ok),
    baseUrl: options.baseUrl,
    checkedAt: new Date().toISOString(),
    results,
  };
  const reportPath = path.join(runDir, "public-site-audit.json");
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);

  console.log(JSON.stringify({ ok: report.ok, reportPath, results: results.map(({ viewport, ok, failures, screenshotPath }) => ({ viewport, ok, failures, screenshotPath })) }, null, 2));
  if (!report.ok) {
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
