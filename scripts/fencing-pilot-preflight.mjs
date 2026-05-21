import process from "node:process";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

import {
  buildFirstUserPilotPacket,
} from "./first-user-pilot-packet.mjs";

const DEFAULT_BASE_URL = "https://concrete-ops-demo.fly.dev";
const DEFAULT_OUTPUT_DIR = "ui-audit/fencing-first-walkthrough";

export const DEFAULT_FENCING_PILOT = {
  company: "First Friendly Fencing Contractor",
  trade: "fencing",
  workflow: "lead / opportunity -> estimate -> job -> schedule -> field proof -> report/upload -> ready-to-bill review",
  owner: "Owner/admin to confirm",
  fieldLead: "First field lead to confirm",
  firstRecord: "First active fence lead or estimate",
  fieldAction: "Upload one fence jobsite photo and complete one proof item",
  successCriteria: [
    "Owner can see lead, estimate, job, schedule, proof, and next follow-up in one place",
    "One field user can complete one phone action without seeing office pricing or settings",
    "Owner can decide by Day 3 whether the workflow is useful enough for a 14-day founder pilot",
  ],
};

function printHelp() {
  console.log(`Apex HQ fencing pilot preflight

Usage:
  npm run pilot:fencing-preflight
  npm run pilot:fencing-preflight -- --json
  npm run pilot:fencing-preflight -- --run
  npm run pilot:fencing-preflight -- --run --allow-auth

Options:
  --base-url=<url>        Defaults to ${DEFAULT_BASE_URL}
  --output-dir=<dir>      Defaults to ${DEFAULT_OUTPUT_DIR}
  --allow-auth            Use hosted auth smoke when APEX_SMOKE_PASSWORD is available.
  --run                   Run the safe checks instead of only printing the plan.
  --json                  Print JSON.
  --company=<name>
  --owner=<name>
  --field-lead=<name>
  --first-record=<text>
  --field-action=<text>
  --success=<text>        Provide 2 or 3. Defaults to the first fencing pilot criteria.

Boundary:
  Demo/preflight only. This does not deploy, touch production, create users, change packages, submit bids, send outreach, collect payment, or mutate customer data.
`);
}

function valueAfterEquals(arg) {
  return arg.slice(arg.indexOf("=") + 1).trim();
}

function parseArgs(argv) {
  const options = {
    help: false,
    json: false,
    run: false,
    allowAuth: false,
    baseUrl: DEFAULT_BASE_URL,
    outputDir: DEFAULT_OUTPUT_DIR,
    pilot: { ...DEFAULT_FENCING_PILOT, successCriteria: [...DEFAULT_FENCING_PILOT.successCriteria] },
  };

  let customSuccessCriteria = [];
  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") options.help = true;
    if (arg === "--json") options.json = true;
    if (arg === "--run") options.run = true;
    if (arg === "--allow-auth") options.allowAuth = true;
    if (arg.startsWith("--base-url=")) options.baseUrl = valueAfterEquals(arg).replace(/\/+$/, "");
    if (arg.startsWith("--output-dir=")) options.outputDir = valueAfterEquals(arg);
    if (arg.startsWith("--company=")) options.pilot.company = valueAfterEquals(arg);
    if (arg.startsWith("--owner=")) options.pilot.owner = valueAfterEquals(arg);
    if (arg.startsWith("--field-lead=")) options.pilot.fieldLead = valueAfterEquals(arg);
    if (arg.startsWith("--first-record=")) options.pilot.firstRecord = valueAfterEquals(arg);
    if (arg.startsWith("--field-action=")) options.pilot.fieldAction = valueAfterEquals(arg);
    if (arg.startsWith("--success=")) customSuccessCriteria.push(valueAfterEquals(arg));
  }

  if (customSuccessCriteria.length > 0) {
    options.pilot.successCriteria = customSuccessCriteria;
  }
  options.baseUrl = new URL(options.baseUrl).toString().replace(/\/+$/, "");
  return options;
}

export function resolveNpmInvocation(args, platform = process.platform) {
  if (platform === "win32") {
    return {
      command: "cmd.exe",
      commandArgs: ["/d", "/s", "/c", ["npm.cmd", ...args].map(quoteCommandArg).join(" ")],
    };
  }
  return {
    command: "npm",
    commandArgs: args,
  };
}

function quoteCommandArg(value = "") {
  const text = String(value);
  if (/^[A-Za-z0-9_./:=,-]+$/.test(text)) return text;
  return `"${text.replace(/"/g, '\\"')}"`;
}

function shellQuote(value = "") {
  const text = String(value);
  if (/^[A-Za-z0-9_./:=,-]+$/.test(text)) return text;
  return `"${text.replace(/"/g, '\\"')}"`;
}

function pilotPacketArgs(pilot) {
  const args = [
    "run",
    "pilot:first-user-packet",
    "--",
    `--company=${pilot.company}`,
    `--trade=${pilot.trade}`,
    `--workflow=${pilot.workflow}`,
    `--owner=${pilot.owner}`,
    `--field-lead=${pilot.fieldLead}`,
    `--first-record=${pilot.firstRecord}`,
    `--field-action=${pilot.fieldAction}`,
  ];
  for (const criterion of pilot.successCriteria) {
    args.push(`--success=${criterion}`);
  }
  return args;
}

function pilotPacketCommandArgs(pilot) {
  const args = [
    "run",
    "pilot:first-user-packet",
    "--",
    `--company=${shellQuote(pilot.company)}`,
    `--trade=${shellQuote(pilot.trade)}`,
    `--workflow=${shellQuote(pilot.workflow)}`,
    `--owner=${shellQuote(pilot.owner)}`,
    `--field-lead=${shellQuote(pilot.fieldLead)}`,
    `--first-record=${shellQuote(pilot.firstRecord)}`,
    `--field-action=${shellQuote(pilot.fieldAction)}`,
  ];
  for (const criterion of pilot.successCriteria) {
    args.push(`--success=${shellQuote(criterion)}`);
  }
  return args;
}

export function buildFencingPilotPreflight(options = {}) {
  const baseUrl = (options.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, "");
  const outputDir = options.outputDir || DEFAULT_OUTPUT_DIR;
  const pilot = {
    ...DEFAULT_FENCING_PILOT,
    ...(options.pilot || {}),
    successCriteria: options.pilot?.successCriteria || DEFAULT_FENCING_PILOT.successCriteria,
  };
  const packet = buildFirstUserPilotPacket(pilot);
  const allowAuth = Boolean(options.allowAuth);
  const authAvailable = Boolean(options.authAvailable);
  const authMode = allowAuth && authAvailable ? "--allow-auth" : "--skip-auth";
  const authWarning = allowAuth && !authAvailable
    ? "APEX_SMOKE_PASSWORD is missing, so hosted auth smoke will be skipped."
    : "";

  const steps = [
    {
      id: "ready",
      label: "Fly demo readiness",
      type: "fetch",
      url: `${baseUrl}/api/ready`,
      command: `GET ${baseUrl}/api/ready`,
    },
    {
      id: "pilot-packet",
      label: "Validate fencing pilot packet",
      type: "packet",
      args: pilotPacketArgs(pilot),
      command: `npm.cmd ${pilotPacketCommandArgs(pilot).join(" ")}`,
    },
    {
      id: "hosted-smoke",
      label: allowAuth && authAvailable ? "Hosted smoke with auth" : "Hosted smoke without auth",
      type: "npm",
      args: ["run", "smoke:hosted", "--", `--base-url=${baseUrl}`, authMode, "--json"],
      command: `npm.cmd run smoke:hosted -- --base-url=${baseUrl} ${authMode} --json`,
    },
    {
      id: "admin-desktop",
      label: "Admin desktop walkthrough route audit",
      type: "npm",
      args: [
        "run",
        "audit:visual-polish",
        "--",
        `--base-url=${baseUrl}`,
        "--browser=chromium",
        "--roles=admin",
        "--viewports=desktop",
        "--routes=/command-center,/leads,/estimates,/jobs,/schedule,/reports,/uploads,/support",
        `--output-dir=${outputDir}`,
      ],
      command: `npm.cmd run audit:visual-polish -- --base-url=${baseUrl} --browser=chromium --roles=admin --viewports=desktop --routes=/command-center,/leads,/estimates,/jobs,/schedule,/reports,/uploads,/support --output-dir=${outputDir}`,
    },
    {
      id: "admin-tablet",
      label: "Admin tablet estimate/job/schedule route audit",
      type: "npm",
      args: [
        "run",
        "audit:visual-polish",
        "--",
        `--base-url=${baseUrl}`,
        "--browser=chromium",
        "--roles=admin",
        "--viewports=tablet",
        "--routes=/estimates,/jobs,/schedule",
        `--output-dir=${outputDir}`,
      ],
      command: `npm.cmd run audit:visual-polish -- --base-url=${baseUrl} --browser=chromium --roles=admin --viewports=tablet --routes=/estimates,/jobs,/schedule --output-dir=${outputDir}`,
    },
    {
      id: "employee-phone",
      label: "Employee phone field and restricted route audit",
      type: "npm",
      args: [
        "run",
        "audit:visual-polish",
        "--",
        `--base-url=${baseUrl}`,
        "--browser=chromium",
        "--roles=employee",
        "--viewports=phone",
        "--routes=/jobs,/reports,/uploads,/time,/estimates,/leads,/settings",
        `--output-dir=${outputDir}`,
      ],
      command: `npm.cmd run audit:visual-polish -- --base-url=${baseUrl} --browser=chromium --roles=employee --viewports=phone --routes=/jobs,/reports,/uploads,/time,/estimates,/leads,/settings --output-dir=${outputDir}`,
    },
    {
      id: "roles",
      label: "Role permission tests",
      type: "npm",
      args: ["run", "verify:roles"],
      command: "npm.cmd run verify:roles",
    },
  ];

  const blockers = [...packet.blockers];
  const warnings = [
    authWarning,
    "Actual owner/admin email, field user email, and first real record must be confirmed before outside login.",
    "Pilot terms and customer data expectations must be confirmed before real paid or ongoing outside use.",
  ].filter(Boolean);

  return {
    ok: blockers.length === 0,
    baseUrl,
    outputDir,
    packet: {
      ok: packet.ok,
      blockers: packet.blockers,
      decision: packet.goNoGo,
    },
    steps,
    warnings,
    decisions: {
      guidedWalkthrough: blockers.length === 0 ? "GO" : "NO-GO",
      friendlyValidation: blockers.length === 0 ? "GO with supervision" : "NO-GO",
      publicLaunch: "NO-GO",
      productionDeploy: "NO-GO unless explicitly approved through backup-first release",
    },
    boundary: "demo/preflight only; no deploy, production, package, user, customer-data, billing, outreach, or destructive change",
  };
}

async function runFetchStep(step) {
  const response = await fetch(step.url);
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.checks?.database !== "ok") {
    throw new Error(`${step.label} failed: HTTP ${response.status}`);
  }
  return {
    status: "passed",
    httpStatus: response.status,
    payload,
  };
}

function runNpmStep(step) {
  const invocation = resolveNpmInvocation(step.args);
  const result = spawnSync(invocation.command, invocation.commandArgs, {
    cwd: process.cwd(),
    stdio: "pipe",
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(`${step.label} failed with exit ${result.status}${result.error ? ` (${result.error.message})` : ""}\n${result.stdout || ""}\n${result.stderr || ""}`);
  }
  return {
    status: "passed",
    exitCode: result.status,
    output: `${result.stdout || ""}${result.stderr || ""}`.slice(-3000),
  };
}

function runPacketStep(report) {
  if (!report.packet.ok) {
    throw new Error(`Fencing pilot packet failed validation: ${report.packet.blockers.join("; ")}`);
  }
  return {
    status: "passed",
    decision: report.packet.decision,
  };
}

export async function runFencingPilotPreflight(options = {}) {
  const report = buildFencingPilotPreflight({
    ...options,
    authAvailable: Boolean(process.env.APEX_SMOKE_PASSWORD),
  });
  const results = [];
  for (const step of report.steps) {
    try {
      const result = step.type === "fetch"
        ? await runFetchStep(step)
        : step.type === "packet"
          ? runPacketStep(report)
          : runNpmStep(step);
      results.push({ id: step.id, label: step.label, ...result });
    } catch (error) {
      results.push({ id: step.id, label: step.label, status: "failed", error: error?.message || String(error) });
      break;
    }
  }
  return {
    ...report,
    run: {
      checkedAt: new Date().toISOString(),
      results,
      ok: results.length === report.steps.length && results.every((result) => result.status === "passed"),
    },
  };
}

function printHumanReport(report) {
  console.log("Apex HQ fencing pilot preflight:");
  console.log(`- Base URL: ${report.baseUrl}`);
  console.log(`- Guided walkthrough: ${report.decisions.guidedWalkthrough}`);
  console.log(`- Friendly validation: ${report.decisions.friendlyValidation}`);
  console.log(`- Public launch: ${report.decisions.publicLaunch}`);
  console.log(`- Production deploy: ${report.decisions.productionDeploy}`);
  console.log(`- Boundary: ${report.boundary}`);
  if (report.warnings.length) {
    console.log("\nWarnings:");
    for (const warning of report.warnings) console.log(`- ${warning}`);
  }
  console.log("\nSteps:");
  for (const step of report.steps) console.log(`- ${step.label}: ${step.command}`);
  if (report.run) {
    console.log("\nRun results:");
    for (const result of report.run.results) console.log(`- ${result.label}: ${result.status}`);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }
  const report = options.run
    ? await runFencingPilotPreflight(options)
    : buildFencingPilotPreflight({
      ...options,
      authAvailable: Boolean(process.env.APEX_SMOKE_PASSWORD),
    });

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printHumanReport(report);
  }
  if (options.run && !report.run.ok) {
    process.exitCode = 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
