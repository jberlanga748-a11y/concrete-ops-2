import process from "node:process";
import { pathToFileURL } from "node:url";

import { buildPilotConfig } from "./create-pilot-config.mjs";
import { buildFencingPilotSetupApproval } from "./fencing-pilot-setup-approval.mjs";
import { buildPilotSetupPlan } from "./pilot-setup-plan.mjs";
import { parsePilotConfig, verifyPilotConfig } from "./verify-pilot-config.mjs";

const DEFAULT_SLUG = "friendly-fence";
const DEFAULT_WORKFLOW = "lead / opportunity -> estimate -> job -> schedule -> field proof -> report/upload -> ready-to-bill review";

function printHelp() {
  console.log(`Apex HQ fencing pilot config approval dry-run

Usage:
  npm run pilot:fencing-config-dry-run -- --company="Friendly Fence Co" --owner-name="Riley Owner" --owner-email="owner@example.com" --field-name="Sam Foreman" --field-email="sam@example.com" --first-record="Cedar fence replacement estimate" --current-tools="texts, notebook, phone photos, calendar" --lost-info="photos and follow-up details" --support-channel="text John for same-day best-effort support" --support-owner="John" --rollback-owner="John" --pilot-slug="friendly-fence" --backup-confirmed --terms-acknowledged --data-boundary-acknowledged --day0-accepted --day3-day10-accepted --preflight-passed --success="Owner can find proof without text search" --success="Field user uploads one photo from phone" --json

Boundary:
  Dry-run only. This does not write fly.customer-*.toml, create Fly apps, create volumes, set secrets, create users, deploy, authenticate, touch production, or mutate customer data.
`);
}

function valueAfterEquals(arg) {
  return arg.slice(arg.indexOf("=") + 1).trim();
}

function parseArgs(argv) {
  const options = {
    help: false,
    json: false,
    region: "sjc",
    minMachinesRunning: 0,
    supportOwner: "",
    rollbackOwner: "",
    pilotSlug: DEFAULT_SLUG,
    day0Accepted: false,
    day3Day10Accepted: false,
    preflightPassed: false,
    intake: {
      company: "",
      ownerName: "",
      ownerEmail: "",
      fieldName: "",
      fieldEmail: "",
      fieldUserRequired: true,
      workflow: DEFAULT_WORKFLOW,
      firstRecord: "",
      fieldAction: "Upload one fence jobsite photo and complete one proof item",
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
    if (arg === "--json") options.json = true;
    if (arg === "--backup-confirmed") options.intake.backupConfirmed = true;
    if (arg === "--terms-acknowledged") options.intake.termsAcknowledged = true;
    if (arg === "--data-boundary-acknowledged") options.intake.dataBoundaryAcknowledged = true;
    if (arg === "--day0-accepted") options.day0Accepted = true;
    if (arg === "--day3-day10-accepted") options.day3Day10Accepted = true;
    if (arg === "--preflight-passed") options.preflightPassed = true;
    if (arg === "--no-field-user") options.intake.fieldUserRequired = false;
    if (arg.startsWith("--company=")) options.intake.company = valueAfterEquals(arg);
    if (arg.startsWith("--owner-name=")) options.intake.ownerName = valueAfterEquals(arg);
    if (arg.startsWith("--owner-email=")) options.intake.ownerEmail = valueAfterEquals(arg);
    if (arg.startsWith("--field-name=")) options.intake.fieldName = valueAfterEquals(arg);
    if (arg.startsWith("--field-email=")) options.intake.fieldEmail = valueAfterEquals(arg);
    if (arg.startsWith("--workflow=")) options.intake.workflow = valueAfterEquals(arg);
    if (arg.startsWith("--first-record=")) options.intake.firstRecord = valueAfterEquals(arg);
    if (arg.startsWith("--field-action=")) options.intake.fieldAction = valueAfterEquals(arg);
    if (arg.startsWith("--current-tools=")) options.intake.currentTools = valueAfterEquals(arg);
    if (arg.startsWith("--lost-info=")) options.intake.lostInfo = valueAfterEquals(arg);
    if (arg.startsWith("--support-channel=")) options.intake.supportChannel = valueAfterEquals(arg);
    if (arg.startsWith("--support-owner=")) options.supportOwner = valueAfterEquals(arg);
    if (arg.startsWith("--rollback-owner=")) options.rollbackOwner = valueAfterEquals(arg);
    if (arg.startsWith("--pilot-slug=")) options.pilotSlug = valueAfterEquals(arg);
    if (arg.startsWith("--region=")) options.region = valueAfterEquals(arg);
    if (arg.startsWith("--min-machines-running=")) options.minMachinesRunning = Number(valueAfterEquals(arg));
    if (arg.startsWith("--success=")) options.intake.successCriteria.push(valueAfterEquals(arg));
  }

  return options;
}

export function buildFencingPilotConfigDryRun(input = {}) {
  const approval = buildFencingPilotSetupApproval(input);
  const config = buildPilotConfig({
    slug: approval.pilotSlug || input.pilotSlug || DEFAULT_SLUG,
    region: input.region || "sjc",
    minMachinesRunning: Number(input.minMachinesRunning || 0),
  });
  const configPath = config.fileName;
  const parsed = parsePilotConfig(config.content);
  const verification = verifyPilotConfig(parsed, { configPath });
  const setupPlan = buildPilotSetupPlan({
    parsed,
    verification,
    configPath,
    company: approval.intake.company,
    owner: approval.intake.ownerName,
    workflow: approval.intake.workflow,
  });

  const blockers = [
    ...approval.blockers,
    ...verification.errors.map((error) => `Config verification: ${error}`),
    ...setupPlan.errors.map((error) => `Setup plan: ${error}`),
  ];
  const ok = blockers.length === 0;

  return {
    ok,
    status: ok ? "READY_FOR_MANUAL_CONFIG_APPROVAL" : "NO-GO",
    blockers,
    warnings: [
      ...approval.warnings,
      ...verification.warnings.map((warning) => `Config warning: ${warning}`),
    ],
    approval: {
      status: approval.status,
      decisions: approval.decisions,
      supportOwner: approval.supportOwner,
      rollbackOwner: approval.rollbackOwner,
    },
    plannedConfig: {
      fileName: config.fileName,
      appName: config.appName,
      volumeName: config.volumeName,
      region: input.region || "sjc",
      minMachinesRunning: Number(input.minMachinesRunning || 0),
      verified: verification.ok,
      errors: verification.errors,
      warnings: verification.warnings,
    },
    setupPlan: {
      ok: setupPlan.ok,
      baseUrl: setupPlan.baseUrl,
      localPreflight: setupPlan.commands.localPreflight,
      approvalGate: setupPlan.commands.approvalGate,
      flySetup: setupPlan.commands.flySetup,
      postDeploySmoke: setupPlan.commands.postDeploySmoke,
      rollback: setupPlan.commands.rollback,
      stopConditions: setupPlan.stopConditions,
    },
    decisions: {
      configFileCreation: ok ? "READY_FOR_SEPARATE_APPROVAL" : "NO-GO",
      flyResourceCreation: "NO-GO until separately approved",
      outsideLogin: approval.decisions.outsideLogin,
      publicLaunch: "NO-GO",
      productionDeploy: "NO-GO unless explicitly approved through backup-first release",
    },
    boundary: "dry-run only; no config file write, Fly resource, secret, user, auth, deploy, production, package, billing, or customer-data mutation",
  };
}

export function formatFencingPilotConfigDryRunMarkdown(report = {}) {
  return `# Apex HQ Fencing Pilot Config Approval Dry-Run

Status: ${report.status}

Boundary: ${report.boundary}

## Decision

- Config file creation: ${report.decisions.configFileCreation}
- Fly resource creation: ${report.decisions.flyResourceCreation}
- Outside login: ${report.decisions.outsideLogin}
- Public launch: ${report.decisions.publicLaunch}
- Production deploy: ${report.decisions.productionDeploy}

## Planned Config

- File: ${report.plannedConfig.fileName}
- App: ${report.plannedConfig.appName}
- Volume: ${report.plannedConfig.volumeName}
- Region: ${report.plannedConfig.region}
- Min machines running: ${report.plannedConfig.minMachinesRunning}
- Verified: ${report.plannedConfig.verified ? "yes" : "no"}

## Local Preflight

${report.setupPlan.localPreflight.map((item) => `- ${item}`).join("\n")}

## Approval Gate

${report.setupPlan.approvalGate.map((item) => `- ${item}`).join("\n")}

## Commands For Later Approval Only

Do not run these until a separate customer pilot setup approval is given.

${report.setupPlan.flySetup.map((item) => `- ${item}`).join("\n")}

## Blockers

${report.blockers.length ? report.blockers.map((item) => `- ${item}`).join("\n") : "- None."}
`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const report = buildFencingPilotConfigDryRun(options);
  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    process.stdout.write(formatFencingPilotConfigDryRunMarkdown(report));
  }
  if (!report.ok) {
    process.exitCode = 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
