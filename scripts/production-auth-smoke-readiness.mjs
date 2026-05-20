import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";

const execFileAsync = promisify(execFile);

const WORKFLOW_PATH = ".github/workflows/production-auth-smoke.yml";
const REQUIRED_SECRET = "APEX_PRODUCTION_SMOKE_PASSWORD";
const APPROVED_URLS = [
  "https://app.apexhq.online",
  "https://concrete-ops-2.fly.dev",
];
const SMOKE_USERS = [
  "smoke.admin@apexhq.app",
  "smoke.employee@apexhq.app",
];

function printHelp() {
  console.log(`Apex HQ production auth smoke readiness

Usage:
  npm run verify:production-auth-smoke-readiness
  node scripts/production-auth-smoke-readiness.mjs --json
  node scripts/production-auth-smoke-readiness.mjs --check-live

Options:
  --repo=<owner/repo>       GitHub repo for secret presence check.
  --base-url=<url>          Production URL to validate, default https://app.apexhq.online.
  --skip-gh                Do not call gh secret list.
  --check-live             Read-only GET /api/ready check against the selected base URL.
  --smoke-users-approved   Record that dedicated synthetic production smoke users/workspace were approved.
  --production-safety-approved
                           Record that production-safety approval was captured before auth smoke.
  --dispatch-confirmation=<phrase>
                           Must equal PRODUCTION_AUTH_SMOKE_APPROVED before readiness can go green.
  --json                   Print full JSON report.
  --help

Boundary:
  This command does not run login, create sessions, dispatch workflows, set secrets, create users, deploy, mutate production data, or touch Fly.
`);
}

function parseArgs(argv) {
  const options = {
    repo: "jberlanga748-a11y/concrete-ops-2",
    baseUrl: "https://app.apexhq.online",
    skipGh: false,
    checkLive: false,
    smokeUsersApproved: false,
    productionSafetyApproved: false,
    dispatchConfirmation: "",
    json: false,
    help: false,
  };

  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") options.help = true;
    if (arg === "--skip-gh") options.skipGh = true;
    if (arg === "--check-live") options.checkLive = true;
    if (arg === "--smoke-users-approved") options.smokeUsersApproved = true;
    if (arg === "--production-safety-approved") options.productionSafetyApproved = true;
    if (arg === "--json") options.json = true;
    if (arg.startsWith("--repo=")) options.repo = valueAfterEquals(arg);
    if (arg.startsWith("--base-url=")) options.baseUrl = valueAfterEquals(arg).replace(/\/+$/, "");
    if (arg.startsWith("--dispatch-confirmation=")) options.dispatchConfirmation = valueAfterEquals(arg);
  }

  return options;
}

function valueAfterEquals(arg) {
  return arg.slice(arg.indexOf("=") + 1).trim();
}

function hasPattern(text, pattern) {
  return pattern.test(text);
}

export function inspectProductionAuthWorkflow(workflowText = "") {
  const checks = [
    {
      id: "manual-dispatch",
      ok: hasPattern(workflowText, /workflow_dispatch:/),
      message: "Workflow must be manual dispatch only.",
    },
    {
      id: "no-schedule",
      ok: !hasPattern(workflowText, /^\s*schedule:/m),
      message: "Workflow must not have a schedule.",
    },
    {
      id: "approval-phrase",
      ok: hasPattern(workflowText, /PRODUCTION_AUTH_SMOKE_APPROVED/),
      message: "Workflow must require the exact production auth approval phrase.",
    },
    {
      id: "production-secret",
      ok: hasPattern(workflowText, new RegExp(REQUIRED_SECRET)),
      message: `Workflow must use ${REQUIRED_SECRET}.`,
    },
    {
      id: "no-demo-secret",
      ok: !hasPattern(workflowText, /secrets\.APEX_SMOKE_PASSWORD/),
      message: "Workflow must not use the demo smoke secret for production auth.",
    },
    {
      id: "approved-urls",
      ok: APPROVED_URLS.every((url) => workflowText.includes(url)),
      message: "Workflow must restrict production auth smoke to approved production URLs.",
    },
    {
      id: "production-auth-flag",
      ok: hasPattern(workflowText, /--allow-production-auth/),
      message: "Hosted smoke must explicitly opt in to production auth.",
    },
    {
      id: "dedicated-smoke-users",
      ok: SMOKE_USERS.every((user) => workflowText.includes(user)),
      message: "Workflow must use dedicated production smoke user emails.",
    },
    {
      id: "no-deploy",
      ok: !hasPattern(workflowText, /\bfly deploy\b|vercel --prod|deploy production/i),
      message: "Workflow must not deploy.",
    },
    {
      id: "no-mutation-tools",
      ok: !hasPattern(workflowText, /smoke:opportunity-scout|demo:package|resetWorkspace|public\/demo-interest|password-reset/i),
      message: "Workflow must not run mutation-capable demo or intake tools.",
    },
  ];

  return {
    ok: checks.every((check) => check.ok),
    checks,
  };
}

export function buildReadinessDecision({
  workflow = { ok: false, checks: [] },
  secret = { checked: false, present: false, error: "" },
  live = { checked: false, ok: false, error: "" },
  baseUrl = "https://app.apexhq.online",
  approvals = {},
} = {}) {
  const blockers = [];
  const warnings = [];
  const dispatchConfirmed = approvals.dispatchConfirmation === "PRODUCTION_AUTH_SMOKE_APPROVED";

  if (!workflow.ok) {
    for (const check of workflow.checks.filter((item) => !item.ok)) {
      blockers.push(`Workflow gate failed: ${check.message}`);
    }
  }

  if (!APPROVED_URLS.includes(baseUrl)) {
    blockers.push(`Base URL is not approved for production auth smoke: ${baseUrl}`);
  }

  if (!secret.checked) {
    blockers.push("GitHub production smoke secret presence was not checked.");
  } else if (!secret.present) {
    blockers.push(`${REQUIRED_SECRET} is not configured in GitHub repository secrets.`);
  }

  if (secret.error) {
    warnings.push(`GitHub secret check did not complete: ${secret.error}`);
  }

  if (live.checked && !live.ok) {
    blockers.push(`Production readiness endpoint is not healthy: ${live.error || "unknown error"}`);
  }

  if (!approvals.smokeUsersApproved) {
    blockers.push("Dedicated synthetic production smoke workspace/users are not approved for first auth smoke.");
  }

  if (!approvals.productionSafetyApproved) {
    blockers.push("Production-safety approval is not recorded for first production auth smoke.");
  }

  if (!dispatchConfirmed) {
    blockers.push("Manual workflow dispatch still requires the exact PRODUCTION_AUTH_SMOKE_APPROVED confirmation.");
  }

  return {
    go: blockers.length === 0,
    blockers,
    warnings,
    nextActions: blockers.length
      ? [
          "Approve or create a dedicated synthetic production smoke workspace and smoke users.",
          `Store ${REQUIRED_SECRET} in GitHub Actions repository secrets without printing it.`,
          "Run this readiness check again before dispatching the production auth smoke workflow.",
        ]
      : [
          "Dispatch the manual workflow only when production-safety approval is recorded.",
          "Watch login/bootstrap timing and employee restricted-route results.",
        ],
  };
}

async function checkSecretPresence(repo) {
  try {
    const { stdout } = await execFileAsync("gh", ["secret", "list", "--repo", repo, "--json", "name"], {
      timeout: 20_000,
      windowsHide: true,
    });
    const secrets = JSON.parse(stdout || "[]");
    return {
      checked: true,
      present: secrets.some((secret) => secret.name === REQUIRED_SECRET),
      namesChecked: secrets.length,
      error: "",
    };
  } catch (error) {
    return {
      checked: false,
      present: false,
      namesChecked: 0,
      error: error.message,
    };
  }
}

async function checkReadyEndpoint(baseUrl) {
  const url = new URL("/api/ready", baseUrl).toString();
  const attempts = [];

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const startedAt = Date.now();
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
      const body = await response.json().catch(() => ({}));
      const ok = response.ok && body?.status === "ready" && body?.checks?.database === "ok";
      const result = {
        attempt,
        ok,
        status: response.status,
        durationMs: Date.now() - startedAt,
        database: body?.checks?.database || "unknown",
        error: ok ? "" : JSON.stringify(body),
      };
      attempts.push(result);
      if (ok) {
        return {
          checked: true,
          ok: true,
          url,
          status: result.status,
          durationMs: result.durationMs,
          database: result.database,
          error: "",
          attempts,
        };
      }
    } catch (error) {
      attempts.push({
        attempt,
        ok: false,
        status: 0,
        durationMs: Date.now() - startedAt,
        database: "unknown",
        error: error.message,
      });
    }

    await delay(750);
  }

  const last = attempts.at(-1) || {};
  return {
    checked: true,
    ok: false,
    url,
    status: last.status || 0,
    durationMs: last.durationMs || 0,
    database: last.database || "unknown",
    error: last.error || "readiness check failed",
    attempts,
  };
}

export async function runProductionAuthSmokeReadiness(options = {}) {
  const workflowText = await fs.readFile(WORKFLOW_PATH, "utf8");
  const workflow = inspectProductionAuthWorkflow(workflowText);
  const secret = options.skipGh ? { checked: false, present: false, error: "" } : await checkSecretPresence(options.repo);
  const live = options.checkLive ? await checkReadyEndpoint(options.baseUrl) : { checked: false, ok: false, error: "" };
  const approvals = {
    smokeUsersApproved: Boolean(options.smokeUsersApproved),
    productionSafetyApproved: Boolean(options.productionSafetyApproved),
    dispatchConfirmation: options.dispatchConfirmation || "",
  };
  const decision = buildReadinessDecision({ workflow, secret, live, baseUrl: options.baseUrl, approvals });

  return {
    ok: workflow.ok && (!live.checked || live.ok),
    readyForAuthSmoke: decision.go,
    baseUrl: options.baseUrl,
    boundary: "read-only: no login, sessions, workflow dispatch, secrets, users, deploys, Fly changes, or production data mutation",
    workflow,
    secret: {
      checked: secret.checked,
      present: secret.present,
      namesChecked: secret.namesChecked || 0,
      error: secret.error || "",
    },
    live,
    approvals: {
      smokeUsersApproved: approvals.smokeUsersApproved,
      productionSafetyApproved: approvals.productionSafetyApproved,
      dispatchConfirmationMatched: approvals.dispatchConfirmation === "PRODUCTION_AUTH_SMOKE_APPROVED",
    },
    decision,
  };
}

function printHumanReport(report) {
  console.log("Production auth smoke readiness:");
  console.log(`- Base URL: ${report.baseUrl}`);
  console.log(`- Workflow guardrails: ${report.workflow.ok ? "PASS" : "FAIL"}`);
  console.log(`- Secret checked: ${report.secret.checked ? "yes" : "no"}`);
  console.log(`- Secret present: ${report.secret.present ? "yes" : "no"}`);
  if (report.live.checked) {
    console.log(`- /api/ready: ${report.live.ok ? "PASS" : "FAIL"} (${report.live.durationMs}ms)`);
  }
  console.log(`- Smoke users approved: ${report.approvals.smokeUsersApproved ? "yes" : "no"}`);
  console.log(`- Production-safety approved: ${report.approvals.productionSafetyApproved ? "yes" : "no"}`);
  console.log(`- Dispatch confirmation matched: ${report.approvals.dispatchConfirmationMatched ? "yes" : "no"}`);
  console.log(`- Ready for production auth smoke: ${report.readyForAuthSmoke ? "GO" : "NO-GO"}`);

  if (report.decision.blockers.length) {
    console.log("\nBlockers:");
    for (const blocker of report.decision.blockers) {
      console.log(`- ${blocker}`);
    }
  }

  if (report.decision.warnings.length) {
    console.log("\nWarnings:");
    for (const warning of report.decision.warnings) {
      console.log(`- ${warning}`);
    }
  }

  console.log("\nBoundary: no login, session, workflow dispatch, secret write, user creation, deploy, Fly action, or production data mutation was performed.");
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const report = await runProductionAuthSmokeReadiness(options);
  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printHumanReport(report);
  }

  if (!report.workflow.ok || (report.live.checked && !report.live.ok)) {
    process.exitCode = 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
