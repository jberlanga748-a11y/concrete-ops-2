#!/usr/bin/env node
import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const DEFAULT_APP = "concrete-ops-demo";
const DEFAULT_MACHINE_ID = "784192dc275318";
const DEFAULT_BASE_URL = "https://concrete-ops-demo.fly.dev/";
const DEFAULT_PASSWORD_ENV = "APEX_SMOKE_PASSWORD";
const PRODUCTION_HOSTS = new Set(["app.apexhq.online", "concrete-ops-2.fly.dev"]);

function printHelp() {
  console.log(`Apex HQ Fly demo Opportunity Scout acceptance

Runs the full backup-first DEMO-only hosted acceptance loop:
  health -> backup -> package Elite -> Opportunity Scout smoke -> cleanup -> package Premium -> hosted smoke

Usage:
  npm run smoke:opportunity-scout:fly-demo

Flags:
  --app=concrete-ops-demo       Fly demo app. Only concrete-ops-demo is allowed.
  --machine=<id>                Fly machine id. Default ${DEFAULT_MACHINE_ID}.
  --base-url=<url>              Demo URL. Default ${DEFAULT_BASE_URL}
  --password-env=<name>         Env var containing demo smoke password. Default ${DEFAULT_PASSWORD_ENV}.
  --dry-run                     Print the planned command sequence without running it.
  --json                        Print JSON summary only.
  --help                        Print this message.

Safety:
  This script refuses production hosts and non-demo Fly apps, takes a backup first,
  requires the hosted smoke password, and rolls the demo package back to Premium
  even if Opportunity Scout acceptance fails.
`);
}

export function parseArgs(argv) {
  const options = {
    app: DEFAULT_APP,
    machineId: DEFAULT_MACHINE_ID,
    baseUrl: DEFAULT_BASE_URL,
    passwordEnv: DEFAULT_PASSWORD_ENV,
    dryRun: false,
    json: false,
    help: false,
  };

  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--json") options.json = true;
    else if (arg.startsWith("--app=")) options.app = arg.slice("--app=".length);
    else if (arg.startsWith("--machine=")) options.machineId = arg.slice("--machine=".length);
    else if (arg.startsWith("--base-url=")) options.baseUrl = arg.slice("--base-url=".length);
    else if (arg.startsWith("--password-env=")) options.passwordEnv = arg.slice("--password-env=".length);
    else throw new Error(`Unknown argument: ${arg}`);
  }

  options.baseUrl = new URL(options.baseUrl).toString();
  validateOptions(options);
  return options;
}

function validateOptions(options) {
  if (options.app !== DEFAULT_APP) {
    throw new Error(`Refusing to run against Fly app ${options.app}. Only ${DEFAULT_APP} is allowed.`);
  }
  if (!/^[a-z0-9-]+$/.test(options.app)) {
    throw new Error("Fly app name contains unsafe characters.");
  }
  if (!/^[a-z0-9]+$/.test(options.machineId)) {
    throw new Error("Fly machine id contains unsafe characters.");
  }
  if (PRODUCTION_HOSTS.has(new URL(options.baseUrl).hostname)) {
    throw new Error("Refusing to run Opportunity Scout demo smoke against a production host.");
  }
}

function remoteCommand(options, command) {
  return ["machine", "exec", options.machineId, "-a", options.app, "--timeout", "120", `sh -lc 'cd /app && ${command}'`];
}

export function buildPlan(options) {
  return [
    {
      name: "wake-demo-health",
      command: process.execPath,
      args: ["scripts/hosted-smoke.mjs", `--base-url=${options.baseUrl}`, "--flows=health", "--skip-auth", "--json"],
      rollbackSafe: true,
    },
    { name: "fly-status", command: "fly", args: ["status", "-a", options.app], rollbackSafe: true },
    { name: "fly-health-checks", command: "fly", args: ["checks", "list", "-a", options.app], rollbackSafe: true },
    { name: "backup-demo-data", command: "fly", args: remoteCommand(options, "node server/backup-export.js"), rollbackSafe: false },
    { name: "set-elite", command: "fly", args: remoteCommand(options, "node server/demo-package-set.js --package elite --apply"), rollbackSafe: false },
    {
      name: "opportunity-scout-acceptance",
      command: process.execPath,
      args: ["scripts/opportunity-scout-hosted-smoke.mjs", `--base-url=${options.baseUrl}`, `--password-env=${options.passwordEnv}`, "--json"],
      rollbackSafe: false,
      env: { [options.passwordEnv]: process.env[options.passwordEnv] || "" },
    },
    { name: "cleanup-smoke-artifacts", command: "fly", args: remoteCommand(options, "node server/demo-smoke-cleanup.js --apply"), rollbackSafe: false },
    { name: "rollback-premium", command: "fly", args: remoteCommand(options, "node server/demo-package-set.js --package premium --apply"), rollbackSafe: true },
    { name: "verify-premium", command: "fly", args: remoteCommand(options, "node server/demo-package-set.js --package premium"), rollbackSafe: true },
    { name: "verify-cleanup-empty", command: "fly", args: remoteCommand(options, "node server/demo-smoke-cleanup.js"), rollbackSafe: true },
    {
      name: "hosted-smoke-final",
      command: process.execPath,
      args: ["scripts/hosted-smoke.mjs", `--base-url=${options.baseUrl}`, `--password-env=${options.passwordEnv}`, "--allow-auth", "--json"],
      rollbackSafe: true,
      env: { [options.passwordEnv]: process.env[options.passwordEnv] || "" },
    },
  ];
}

function formatCommand(step) {
  return [step.command, ...step.args].join(" ");
}

function runCommand(step) {
  return new Promise((resolve) => {
    const child = spawn(step.command, step.args, {
      cwd: process.cwd(),
      env: {
        ...process.env,
        ...(step.env || {}),
      },
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("close", (code) => {
      resolve({ code, stdout, stderr });
    });
    child.on("error", (error) => {
      resolve({ code: 1, stdout, stderr, error: error.message });
    });
  });
}

async function runStep(step, results, { quiet = false } = {}) {
  if (!quiet) {
    console.log(`Running ${step.name}: ${formatCommand(step)}`);
  }
  const result = await runCommand(step);
  const summary = {
    name: step.name,
    command: formatCommand(step),
    exitCode: result.code,
    stdout: result.stdout.trim(),
    stderr: [result.stderr.trim(), result.error || ""].filter(Boolean).join("\n"),
  };
  results.steps.push(summary);
  if (result.code !== 0) {
    throw new Error(`${step.name} failed with exit code ${result.code}`);
  }
  return summary;
}

async function run() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }
  if (!process.env[options.passwordEnv] && !options.dryRun) {
    throw new Error(`Missing ${options.passwordEnv}.`);
  }

  const plan = buildPlan(options);
  if (options.dryRun) {
    const dryRun = {
      dryRun: true,
      app: options.app,
      baseUrl: options.baseUrl,
      steps: plan.map((step) => ({ name: step.name, command: formatCommand(step), rollbackSafe: step.rollbackSafe })),
    };
    console.log(JSON.stringify(dryRun, null, options.json ? 0 : 2));
    return;
  }

  const results = {
    app: options.app,
    baseUrl: options.baseUrl,
    productionHost: PRODUCTION_HOSTS.has(new URL(options.baseUrl).hostname),
    steps: [],
    rollbackAttempted: false,
    cleanupAttempted: false,
    packageMutated: false,
  };

  const rollbackStep = plan.find((step) => step.name === "rollback-premium");
  const cleanupStep = plan.find((step) => step.name === "cleanup-smoke-artifacts");
  const tailSteps = plan.filter((step) => ["verify-premium", "verify-cleanup-empty", "hosted-smoke-final"].includes(step.name));

  try {
    for (const step of plan) {
      if (["rollback-premium", "verify-premium", "verify-cleanup-empty", "hosted-smoke-final"].includes(step.name)) continue;
      await runStep(step, results, { quiet: options.json });
      if (step.name === "set-elite") results.packageMutated = true;
      if (step.name === "cleanup-smoke-artifacts") results.cleanupAttempted = true;
    }
  } catch (error) {
    results.error = error instanceof Error ? error.message : String(error);
    if (results.packageMutated && !results.cleanupAttempted) {
      try {
        await runStep(cleanupStep, results, { quiet: options.json });
        results.cleanupAttempted = true;
      } catch (cleanupError) {
        results.cleanupError = cleanupError instanceof Error ? cleanupError.message : String(cleanupError);
      }
    }
  } finally {
    if (results.packageMutated) {
      try {
        await runStep(rollbackStep, results, { quiet: options.json });
        results.rollbackAttempted = true;
      } catch (rollbackError) {
        results.rollbackError = rollbackError instanceof Error ? rollbackError.message : String(rollbackError);
      }
    }
  }

  if (results.error || results.rollbackError) {
    console.log(JSON.stringify(results, null, options.json ? 0 : 2));
    process.exitCode = 1;
    return;
  }

  try {
    for (const step of tailSteps) {
      await runStep(step, results, { quiet: options.json });
    }
  } catch (tailError) {
    results.error = tailError instanceof Error ? tailError.message : String(tailError);
    console.log(JSON.stringify(results, null, options.json ? 0 : 2));
    process.exitCode = 1;
    return;
  }

  console.log(JSON.stringify(results, null, options.json ? 0 : 2));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  run().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
