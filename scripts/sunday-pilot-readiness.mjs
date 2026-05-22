#!/usr/bin/env node

import process from "node:process";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

import { buildFencingPilotIntakeGate } from "./fencing-pilot-intake.mjs";
import { buildFencingPilotPreflight } from "./fencing-pilot-preflight.mjs";
import { buildSandboxPlan, defaultSandboxProfile } from "./fake-company-sandbox.mjs";

const DEFAULT_BASE_URL = "https://concrete-ops-demo.fly.dev";
const DEFAULT_WORKFLOW = "lead / opportunity -> estimate -> job -> schedule -> field proof -> report/upload -> ready-to-bill review";
const DEFAULT_FIELD_ACTION = "Upload one fence jobsite photo and complete one proof item";

const LOCAL_COMMANDS = [
  { id: "fake-company-sandbox", command: "npm.cmd", args: ["run", "verify:fake-company-sandbox"], timeoutMs: 120000 },
  { id: "signup-tenant-safety", command: "npm.cmd", args: ["run", "verify:signup"], timeoutMs: 180000 },
  { id: "role-safety", command: "npm.cmd", args: ["run", "verify:roles"], timeoutMs: 120000 },
  { id: "lead-workflow", command: "npm.cmd", args: ["run", "verify:leads"], timeoutMs: 180000 },
  { id: "job-workflow", command: "npm.cmd", args: ["run", "verify:jobs"], timeoutMs: 180000 },
  { id: "daily-report-workflow", command: "npm.cmd", args: ["run", "verify:daily-reports"], timeoutMs: 120000 },
  { id: "upload-workflow", command: "npm.cmd", args: ["run", "verify:uploads"], timeoutMs: 120000 },
  { id: "estimate-workflow", command: "npm.cmd", args: ["run", "verify:estimates"], timeoutMs: 180000 },
  { id: "production-build", command: "npm.cmd", args: ["run", "build"], timeoutMs: 120000 },
  { id: "diff-whitespace", command: "git", args: ["diff", "--check"], timeoutMs: 120000 },
];

function printHelp() {
  console.log(`Apex HQ Sunday pilot readiness gate

Usage:
  npm run pilot:sunday-readiness -- --json
  npm run pilot:sunday-readiness -- --run-local --json

Optional real-company intake fields:
  --company=<name>
  --owner-name=<name>
  --owner-email=<email>
  --field-name=<name>
  --field-email=<email>
  --first-record=<text>
  --current-tools=<text>
  --lost-info=<text>
  --support-channel=<text>
  --success=<text>       Provide 2 or 3.
  --backup-confirmed
  --terms-acknowledged
  --data-boundary-acknowledged
  --no-field-user

Boundary:
  Guided-pilot gate only. This does not deploy, create real users, send messages, change packages, collect payment, mutate production data, or unlock production.
`);
}

function valueAfterEquals(arg) {
  return arg.slice(arg.indexOf("=") + 1).trim();
}

function parseArgs(argv) {
  const options = {
    help: false,
    json: false,
    runLocal: false,
    baseUrl: DEFAULT_BASE_URL,
    intake: {
      company: "",
      ownerName: "",
      ownerEmail: "",
      fieldName: "",
      fieldEmail: "",
      fieldUserRequired: true,
      firstRecord: "",
      currentTools: "",
      lostInfo: "",
      supportChannel: "",
      successCriteria: [],
      backupConfirmed: false,
      termsAcknowledged: false,
      dataBoundaryAcknowledged: false,
    },
  };

  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg === "--json") options.json = true;
    else if (arg === "--run-local") options.runLocal = true;
    else if (arg === "--backup-confirmed") options.intake.backupConfirmed = true;
    else if (arg === "--terms-acknowledged") options.intake.termsAcknowledged = true;
    else if (arg === "--data-boundary-acknowledged") options.intake.dataBoundaryAcknowledged = true;
    else if (arg === "--no-field-user") options.intake.fieldUserRequired = false;
    else if (arg.startsWith("--base-url=")) options.baseUrl = valueAfterEquals(arg).replace(/\/+$/, "");
    else if (arg.startsWith("--company=")) options.intake.company = valueAfterEquals(arg);
    else if (arg.startsWith("--owner-name=")) options.intake.ownerName = valueAfterEquals(arg);
    else if (arg.startsWith("--owner-email=")) options.intake.ownerEmail = valueAfterEquals(arg);
    else if (arg.startsWith("--field-name=")) options.intake.fieldName = valueAfterEquals(arg);
    else if (arg.startsWith("--field-email=")) options.intake.fieldEmail = valueAfterEquals(arg);
    else if (arg.startsWith("--first-record=")) options.intake.firstRecord = valueAfterEquals(arg);
    else if (arg.startsWith("--current-tools=")) options.intake.currentTools = valueAfterEquals(arg);
    else if (arg.startsWith("--lost-info=")) options.intake.lostInfo = valueAfterEquals(arg);
    else if (arg.startsWith("--support-channel=")) options.intake.supportChannel = valueAfterEquals(arg);
    else if (arg.startsWith("--success=")) options.intake.successCriteria.push(valueAfterEquals(arg));
  }

  return options;
}

function runCommand(commandSpec) {
  const startedAt = Date.now();
  const invocation = resolveCommandInvocation(commandSpec);
  const result = spawnSync(invocation.command, invocation.args, {
    cwd: process.cwd(),
    encoding: "utf8",
    shell: false,
    windowsHide: true,
    timeout: commandSpec.timeoutMs || 180000,
    maxBuffer: 1024 * 1024 * 30,
  });
  const output = [
    result.stdout || "",
    result.stderr || "",
    result.error?.message ? `error: ${result.error.message}` : "",
    result.signal ? `signal: ${result.signal}` : "",
  ].join("\n").trim();
  return {
    id: commandSpec.id,
    command: [commandSpec.command, ...commandSpec.args].join(" "),
    ok: result.status === 0,
    status: result.status,
    signal: result.signal || "",
    timedOut: result.error?.code === "ETIMEDOUT",
    durationMs: Date.now() - startedAt,
    outputTail: output.split(/\r?\n/).slice(-20),
  };
}

function shouldRetrySilentProcessCrash(result) {
  return !result.ok
    && (result.status === null || result.status === 3221225477)
    && Array.isArray(result.outputTail)
    && result.outputTail.join("").trim() === "";
}

function shouldRetryTransientVerifierStartup(result) {
  return !result.ok
    && Array.isArray(result.outputTail)
    && /test server did not become ready/i.test(result.outputTail.join("\n"));
}

function runCommandWithRetry(commandRunner, commandSpec) {
  const first = commandRunner(commandSpec);
  if (!shouldRetrySilentProcessCrash(first) && !shouldRetryTransientVerifierStartup(first)) return first;

  const retry = commandRunner(commandSpec);
  return {
    ...retry,
    attempts: 2,
    firstAttemptStatus: first.status,
  };
}

function quoteCommandArg(value = "") {
  const text = String(value);
  if (/^[A-Za-z0-9_./:=,-]+$/.test(text)) return text;
  return `"${text.replace(/"/g, '\\"')}"`;
}

function resolveCommandInvocation(commandSpec) {
  if (process.platform === "win32" && commandSpec.command === "npm.cmd") {
    return {
      command: "cmd.exe",
      args: ["/d", "/s", "/c", [commandSpec.command, ...commandSpec.args].map(quoteCommandArg).join(" ")],
    };
  }
  return {
    command: commandSpec.command,
    args: commandSpec.args,
  };
}

function commandPlan() {
  return LOCAL_COMMANDS.map((entry) => ({
    id: entry.id,
    command: [entry.command, ...entry.args].join(" "),
  }));
}

export function buildSundayPilotReadinessReport({
  intake = {},
  baseUrl = DEFAULT_BASE_URL,
  runLocal = false,
  commandRunner = runCommand,
} = {}) {
  const normalizedIntake = {
    workflow: DEFAULT_WORKFLOW,
    fieldAction: DEFAULT_FIELD_ACTION,
    ...intake,
  };
  const intakeGate = buildFencingPilotIntakeGate(normalizedIntake);
  const sandboxPlan = buildSandboxPlan(defaultSandboxProfile({ suffix: "sunday-rehearsal" }));
  const preflight = buildFencingPilotPreflight({
    baseUrl,
    pilot: {
      company: normalizedIntake.company || "Sunday Pilot Candidate",
      owner: normalizedIntake.ownerName || "Owner/admin to confirm",
      fieldLead: normalizedIntake.fieldName || "Field lead to confirm",
      firstRecord: normalizedIntake.firstRecord || "First real fence lead/estimate/job to confirm",
      successCriteria: normalizedIntake.successCriteria?.length ? normalizedIntake.successCriteria : undefined,
    },
    allowAuth: true,
    authAvailable: Boolean(process.env.APEX_SMOKE_PASSWORD),
  });

  const localResults = runLocal ? LOCAL_COMMANDS.map((command) => runCommandWithRetry(commandRunner, command)) : [];
  const failedLocal = localResults.filter((result) => !result.ok);
  const localVerificationStatus = runLocal
    ? (failedLocal.length === 0 ? "GO" : "NO-GO")
    : "NOT-RUN";

  const blockers = [];
  const warnings = [
    "Production remains locked until backup-first production release approval.",
    "Known production-safety follow-up: inspect why the production backup command reported demo-mode behavior before any production release.",
    "Do not create outside login until real-company intake fields are complete and acknowledged.",
    "No outbound email/text/bid submission is approved for Sunday.",
  ];

  if (runLocal && failedLocal.length > 0) {
    blockers.push(...failedLocal.map((result) => `Local verification failed: ${result.id}`));
  }
  if (!runLocal) {
    warnings.push("Local verification was not run. Use --run-local before a live walkthrough.");
  }
  if (!intakeGate.ok) {
    blockers.push(...intakeGate.blockers.map((blocker) => `Real-company intake: ${blocker}`));
  }

  const appRehearsalReady = runLocal && failedLocal.length === 0;
  const guidedCompanyWalkthroughReady = appRehearsalReady && intakeGate.ok;
  const status = guidedCompanyWalkthroughReady ? "GO" : "NO-GO";

  return {
    status,
    generatedAt: new Date().toISOString(),
    baseUrl,
    decisions: {
      appRehearsal: appRehearsalReady ? "GO" : "NO-GO",
      realCompanyGuidedWalkthrough: guidedCompanyWalkthroughReady ? "GO" : "NO-GO",
      outsideLoginCreation: guidedCompanyWalkthroughReady ? "GO with approved demo/pilot path only" : "NO-GO",
      productionDeploy: "NO-GO unless explicitly approved through backup-first production release",
      publicLaunch: "NO-GO",
    },
    localVerification: {
      status: localVerificationStatus,
      commandPlan: commandPlan(),
      results: localResults,
    },
    intakeGate,
    sandboxRehearsal: {
      status: appRehearsalReady ? "GO" : "NO-GO until local verification passes",
      command: "npm.cmd run sandbox:fake-company -- --base-url=http://127.0.0.1:4000",
      plan: sandboxPlan,
    },
    hostedPreflight: {
      status: "PLANNED",
      baseUrl,
      command: `npm.cmd run pilot:fencing-preflight -- --run --base-url=${baseUrl} ${process.env.APEX_SMOKE_PASSWORD ? "--allow-auth" : ""} --json`.replace(/\s+/g, " ").trim(),
      authAvailable: Boolean(process.env.APEX_SMOKE_PASSWORD),
      steps: preflight.steps,
    },
    sundayRunbook: [
      "Freeze scope to one contractor and one workflow.",
      "Run local verification with this gate using --run-local.",
      "Run fake-company sandbox rehearsal locally or on approved Fly demo only.",
      "Collect real-company intake without committing real emails or private details.",
      "Create outside access only in the approved demo/pilot path.",
      "Keep the contractor's current tools as backup.",
      "Walk owner/admin through Command Center -> Lead -> Estimate -> Job -> Schedule -> Reports/Uploads -> Support.",
      "Walk field user through phone Jobs -> Reports -> Uploads -> Time if field workflow is in scope.",
      "Record feedback using the pilot feedback intake form.",
      "Schedule Day 3 and Day 10 check-ins before ending the walkthrough.",
    ],
    blockers,
    warnings: [...warnings, ...intakeGate.warnings],
    changedDataBoundary: "No data is created by this readiness gate. The sandbox script creates fake data only when run against localhost or explicitly allowed Fly demo.",
  };
}

function printHumanReport(report) {
  console.log("Apex HQ Sunday pilot readiness gate");
  console.log(`Status: ${report.status}`);
  console.log(`App rehearsal: ${report.decisions.appRehearsal}`);
  console.log(`Real company walkthrough: ${report.decisions.realCompanyGuidedWalkthrough}`);
  console.log(`Outside login: ${report.decisions.outsideLoginCreation}`);
  console.log(`Production deploy: ${report.decisions.productionDeploy}`);
  console.log(`Local verification: ${report.localVerification.status}`);
  if (report.blockers.length) {
    console.log("\nBlockers:");
    for (const blocker of report.blockers) console.log(`- ${blocker}`);
  }
  if (report.warnings.length) {
    console.log("\nWarnings:");
    for (const warning of report.warnings) console.log(`- ${warning}`);
  }
  console.log("\nNext runbook:");
  for (const step of report.sundayRunbook) console.log(`- ${step}`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const report = buildSundayPilotReadinessReport(options);
  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printHumanReport(report);
  }
  if (report.status !== "GO") {
    process.exitCode = 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
