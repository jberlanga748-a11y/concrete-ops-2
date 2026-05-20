#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

import { parsePilotConfig, verifyPilotConfig } from "./verify-pilot-config.mjs";

function printHelp() {
  console.log(`Apex HQ customer pilot setup plan

Usage:
  node scripts/pilot-setup-plan.mjs --config=fly.customer-m2-mini.toml --company="M2 Mini LLC" --owner="Joseph Madesh"
  node scripts/pilot-setup-plan.mjs --config=fly.customer-m2-mini.toml --company="M2 Mini LLC" --owner="Joseph Madesh" --json

Options:
  --config=<path>       Customer pilot Fly config to inspect.
  --company=<name>      Pilot company name.
  --owner=<name>        Owner/admin contact.
  --workflow=<text>     Optional one-workflow pilot scope.
  --json                Print JSON instead of Markdown.
  --help                Print this help.

Boundary:
  This command is local/read-only. It does not create Fly apps, create volumes, set secrets, create users, deploy, run auth smoke, or touch production.
`);
}

function parseArgs(argv) {
  const options = {
    config: "",
    company: "",
    owner: "",
    workflow: "",
    json: false,
    help: false,
  };

  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--json") {
      options.json = true;
    } else if (arg.startsWith("--config=")) {
      options.config = valueAfterEquals(arg);
    } else if (arg.startsWith("--company=")) {
      options.company = valueAfterEquals(arg);
    } else if (arg.startsWith("--owner=")) {
      options.owner = valueAfterEquals(arg);
    } else if (arg.startsWith("--workflow=")) {
      options.workflow = valueAfterEquals(arg);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function valueAfterEquals(arg) {
  return arg.slice(arg.indexOf("=") + 1).trim();
}

function firstMount(parsed) {
  return parsed.mounts.find((mount) => mount.source && mount.destination) || {};
}

function isCustomerPilotConfigPath(configPath) {
  const name = path.basename(configPath).toLowerCase();
  return name.startsWith("fly.customer-") && name.endsWith(".toml");
}

export function buildPilotSetupPlan({ parsed, verification, configPath, company, owner, workflow = "" }) {
  const errors = [];
  if (!verification?.ok) {
    errors.push(...(verification?.errors || ["Pilot config did not pass verification."]));
  }
  if (!isCustomerPilotConfigPath(configPath)) {
    errors.push("Setup plan requires a fly.customer-<slug>.toml config path.");
  }
  if (!company?.trim()) {
    errors.push("Company name is required.");
  }
  if (!owner?.trim()) {
    errors.push("Owner/admin contact is required.");
  }

  const mount = firstMount(parsed);
  const appName = verification?.app || parsed?.app || "";
  const volumeName = mount.source || "";
  const region = verification?.primaryRegion || parsed?.primaryRegion || "sjc";
  const volumeSize = mount.initial_size || "1gb";
  const baseUrl = `https://${appName}.fly.dev`;
  const workflowScope = workflow?.trim() || "one approved pilot workflow";

  const commands = {
    localPreflight: [
      "git status --short",
      `npm.cmd run pilot:verify-config -- --config=${configPath} --json`,
      "npm.cmd run verify:pilot-readiness",
    ],
    approvalGate: [
      "Confirm customer pilot setup approval in the release thread.",
      "Confirm no production app, production volume, demo app, or demo volume will be reused.",
      "Confirm customer data policy, pilot terms, support process, and Day 0/3/10 plan are accepted.",
    ],
    flySetup: [
      `fly apps create ${appName}`,
      `fly volumes create ${volumeName} --app ${appName} --region ${region} --size ${volumeSize.replace(/gb$/i, "")}`,
      `fly deploy --config ${configPath} --app ${appName}`,
    ],
    postDeploySmoke: [
      `Invoke-RestMethod ${baseUrl}/api/ready`,
      `npm.cmd run smoke:hosted -- --base-url=${baseUrl} --skip-auth --json`,
    ],
    rollback: [
      `fly releases -a ${appName}`,
      `fly deploy --config ${configPath} --app ${appName} --image <previous-image>`,
      `Invoke-RestMethod ${baseUrl}/api/ready`,
    ],
  };

  return {
    ok: errors.length === 0,
    errors,
    boundary: "read-only setup plan; no Fly resources, secrets, users, deploys, auth smoke, production, or customer data mutation",
    company: company?.trim() || "",
    owner: owner?.trim() || "",
    workflow: workflowScope,
    configPath,
    appName,
    volumeName,
    region,
    volumeSize,
    baseUrl,
    commands,
    requiredApprovals: [
      "customer pilot setup approval",
      "backup/rollback owner named",
      "pilot support owner named",
      "Day 0/3/10 plan accepted",
      "customer terms/data boundary accepted",
      "no production deploy approval implied",
    ],
    stopConditions: [
      "local pilot readiness preflight fails",
      "Fly app or volume name already exists unexpectedly",
      "required secrets are unavailable or unclear",
      "customer wants a broader workflow than the approved pilot scope",
      "production or demo app/volume would be reused",
    ],
  };
}

export function renderPilotSetupPlanMarkdown(plan) {
  const lines = [
    `# ${plan.company} Customer Pilot Setup Plan`,
    "",
    `Status: ${plan.ok ? "ready for approval" : "blocked"}`,
    `Boundary: ${plan.boundary}`,
    "",
    "## Target",
    "",
    `- Company: ${plan.company}`,
    `- Owner/admin: ${plan.owner}`,
    `- Workflow: ${plan.workflow}`,
    `- Fly app: ${plan.appName}`,
    `- Fly volume: ${plan.volumeName}`,
    `- Region: ${plan.region}`,
    `- URL after deploy: ${plan.baseUrl}`,
    "",
  ];

  if (plan.errors.length) {
    lines.push("## Blockers", "", ...plan.errors.map((error) => `- ${error}`), "");
  }

  lines.push(
    "## Required Approvals",
    "",
    ...plan.requiredApprovals.map((approval) => `- ${approval}`),
    "",
    "## Local Preflight",
    "",
    "```powershell",
    ...plan.commands.localPreflight,
    "```",
    "",
    "## Approval Gate",
    "",
    ...plan.commands.approvalGate.map((item) => `- ${item}`),
    "",
    "## Fly Setup Commands",
    "",
    "Run only after explicit customer pilot setup approval.",
    "",
    "```powershell",
    ...plan.commands.flySetup,
    "```",
    "",
    "## Post-Deploy Smoke",
    "",
    "```powershell",
    ...plan.commands.postDeploySmoke,
    "```",
    "",
    "## Rollback",
    "",
    "```powershell",
    ...plan.commands.rollback,
    "```",
    "",
    "## Stop Conditions",
    "",
    ...plan.stopConditions.map((item) => `- ${item}`),
    "",
  );

  return `${lines.join("\n")}\n`;
}

export async function runPilotSetupPlan(options = {}) {
  if (!options.config) {
    throw new Error("Missing --config=<path>.");
  }

  const configPath = path.normalize(options.config);
  const content = await fs.readFile(path.resolve(configPath), "utf8");
  const parsed = parsePilotConfig(content);
  const verification = verifyPilotConfig(parsed, { configPath });
  return buildPilotSetupPlan({
    parsed,
    verification,
    configPath,
    company: options.company,
    owner: options.owner,
    workflow: options.workflow,
  });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const plan = await runPilotSetupPlan(options);
  if (options.json) {
    console.log(JSON.stringify(plan, null, 2));
  } else {
    process.stdout.write(renderPilotSetupPlanMarkdown(plan));
  }

  if (!plan.ok) {
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
