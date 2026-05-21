import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

import { buildFencingPilotIntakeGate } from "./fencing-pilot-intake.mjs";

const DEFAULT_OUTPUT_DIR = path.resolve(process.cwd(), "tmp", "fencing-pilot-setup-approvals");
const DEFAULT_WORKFLOW = "lead / opportunity -> estimate -> job -> schedule -> field proof -> report/upload -> ready-to-bill review";

const RESERVED_APP_NAMES = new Set([
  "concrete-ops-2",
  "concrete-ops-demo",
  "apex-hq-production",
]);

const SECRET_PATTERNS = [
  /password\s*[:=]/i,
  /token\s*[:=]/i,
  /api[_\s-]?key\s*[:=]/i,
  /secret\s*[:=]/i,
  /\bsk-[A-Za-z0-9_-]{12,}/,
];

function printHelp() {
  console.log(`Apex HQ fencing pilot setup approval packet

Usage:
  npm run pilot:fencing-setup-approval -- --company="Friendly Fence Co" --owner-name="Riley Owner" --owner-email="owner@example.com" --field-name="Sam Foreman" --field-email="sam@example.com" --first-record="Cedar fence replacement estimate" --current-tools="texts, notebook, phone photos, calendar" --lost-info="photos and follow-up details" --support-channel="text John for same-day best-effort support" --support-owner="John" --rollback-owner="John" --pilot-slug="friendly-fence" --backup-confirmed --terms-acknowledged --data-boundary-acknowledged --day0-accepted --day3-day10-accepted --preflight-passed --success="Owner can find proof without text search" --success="Field user uploads one photo from phone" --json

Options:
  --company=<name>
  --owner-name=<name>
  --owner-email=<email>
  --field-name=<name>
  --field-email=<email>
  --workflow=<text>
  --first-record=<text>
  --field-action=<text>
  --current-tools=<text>
  --lost-info=<text>
  --support-channel=<text>
  --support-owner=<name>
  --rollback-owner=<name>
  --pilot-slug=<slug>           Used only to plan names. Does not create resources.
  --success=<text>              Provide 2 or 3.
  --backup-confirmed
  --terms-acknowledged
  --data-boundary-acknowledged
  --day0-accepted
  --day3-day10-accepted
  --preflight-passed
  --no-field-user
  --output-dir=<dir>
  --write
  --json
  --help

Boundary:
  Read-only approval packet. This does not create Fly apps, create volumes, set secrets, create users, send outreach, deploy, change packages, touch production, or mutate customer data.
`);
}

function valueAfterEquals(arg) {
  return arg.slice(arg.indexOf("=") + 1).trim();
}

function parseArgs(argv) {
  const options = {
    help: false,
    json: false,
    write: false,
    outputDir: DEFAULT_OUTPUT_DIR,
    supportOwner: "",
    rollbackOwner: "",
    pilotSlug: "",
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
    if (arg === "--write") options.write = true;
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
    if (arg.startsWith("--success=")) options.intake.successCriteria.push(valueAfterEquals(arg));
    if (arg.startsWith("--output-dir=")) options.outputDir = path.resolve(process.cwd(), valueAfterEquals(arg));
  }

  return options;
}

function safeText(value = "", fallback = "") {
  const text = String(value || "").trim().replace(/\s+/g, " ");
  return text || fallback;
}

function slugify(value = "") {
  return safeText(value, "fencing-pilot")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "fencing-pilot";
}

function validPilotSlug(value = "") {
  return /^[a-z0-9][a-z0-9-]{2,47}$/.test(value) && !value.includes("--");
}

function hasSecretLikeText(value = "") {
  return SECRET_PATTERNS.some((pattern) => pattern.test(value));
}

function formatBullets(items = []) {
  return (items.length ? items : ["[fill before approval]"]).map((item) => `- ${item}`).join("\n");
}

export function buildFencingPilotSetupApproval(input = {}) {
  const intakeReport = buildFencingPilotIntakeGate(input.intake || input);
  const supportOwner = safeText(input.supportOwner);
  const rollbackOwner = safeText(input.rollbackOwner);
  const pilotSlug = slugify(input.pilotSlug || intakeReport.intake.company);
  const plannedApp = `apex-hq-${pilotSlug}-pilot`;
  const plannedVolume = `apex_hq_${pilotSlug.replace(/-/g, "_")}_pilot_data`;
  const blockers = [...intakeReport.blockers];
  const warnings = [...intakeReport.warnings];

  if (!supportOwner) blockers.push("Pilot support owner is required.");
  if (!rollbackOwner) blockers.push("Backup/rollback owner is required.");
  if (!validPilotSlug(pilotSlug)) blockers.push("Pilot slug must be 3-48 lowercase letters, numbers, or single hyphens.");
  if (RESERVED_APP_NAMES.has(plannedApp) || RESERVED_APP_NAMES.has(pilotSlug)) {
    blockers.push("Pilot slug cannot point at production, demo, or reserved app names.");
  }
  if (!input.day0Accepted) blockers.push("Day 0 setup and guided walkthrough plan must be accepted.");
  if (!input.day3Day10Accepted) blockers.push("Day 3 and Day 10 check-in plan must be accepted.");
  if (!input.preflightPassed) blockers.push("Local/demo preflight must pass before customer pilot setup approval.");

  const extraText = [supportOwner, rollbackOwner, pilotSlug].join("\n");
  if (hasSecretLikeText(extraText)) {
    blockers.push("Remove passwords, tokens, API keys, or secrets from approval owners and pilot slug.");
  }

  const ok = blockers.length === 0;
  return {
    ok,
    status: ok ? "READY_FOR_MANUAL_APPROVAL" : "NO-GO",
    blockers,
    warnings,
    intake: intakeReport.intake,
    supportOwner,
    rollbackOwner,
    pilotSlug,
    plannedNames: {
      app: plannedApp,
      volume: plannedVolume,
      config: `fly.customer-${pilotSlug}.toml`,
      baseUrl: `https://${plannedApp}.fly.dev`,
    },
    requiredEvidence: [
      "fencing intake gate passed",
      "pilot readiness preflight passed",
      "support owner named",
      "backup/rollback owner named",
      "current system remains backup",
      "written pilot expectations acknowledged",
      "data boundary acknowledged",
      "Day 0, Day 3, and Day 10 plan accepted",
    ],
    manualApprovalChecklist: [
      "Confirm this is one supervised workflow, not a public launch.",
      "Confirm no production app, demo app, production volume, or demo volume will be reused.",
      "Confirm no real emails, phone numbers, secrets, or private job details are committed to docs.",
      "Confirm any customer pilot app/volume creation gets a separate explicit approval.",
      "Confirm support severity and rollback owner are available during the walkthrough.",
    ],
    decisions: {
      outsideLogin: ok ? "GO only after explicit manual approval" : "NO-GO",
      customerPilotSetup: ok ? "READY_FOR_APPROVAL" : "NO-GO",
      flyResourceCreation: "NO-GO until separately approved",
      publicLaunch: "NO-GO",
      productionDeploy: "NO-GO unless explicitly approved through backup-first release",
    },
    stopConditions: [
      "pilot scope expands beyond the approved workflow",
      "customer asks for production handoff",
      "real credentials, tokens, private job details, or sensitive data are included",
      "preflight fails or support/rollback owner is unavailable",
      "Fly resource names collide with production, demo, or an existing customer app",
    ],
    boundary: "read-only setup approval packet; no Fly resources, secrets, users, outreach, deploys, production, packages, billing, or customer-data mutation",
  };
}

export function formatFencingPilotSetupApprovalMarkdown(report = {}) {
  return `# Apex HQ Fencing Pilot Setup Approval Packet

Status: ${report.status}

Boundary: ${report.boundary}

## Decision

- Outside login: ${report.decisions.outsideLogin}
- Customer pilot setup: ${report.decisions.customerPilotSetup}
- Fly resource creation: ${report.decisions.flyResourceCreation}
- Public launch: ${report.decisions.publicLaunch}
- Production deploy: ${report.decisions.productionDeploy}

## Candidate

- Company: ${report.intake.company}
- Owner/admin: ${report.intake.ownerName}
- Field lead: ${report.intake.fieldUserRequired ? report.intake.fieldName : "not in scope"}
- Workflow: ${report.intake.workflow}
- First record: ${report.intake.firstRecord}
- First field action: ${report.intake.fieldUserRequired ? report.intake.fieldAction : "not in scope"}
- Support owner: ${report.supportOwner}
- Backup/rollback owner: ${report.rollbackOwner}

## Planned Names

These are planning names only. Do not create resources from this packet without separate explicit approval.

- Pilot slug: ${report.pilotSlug}
- Fly app: ${report.plannedNames.app}
- Fly volume: ${report.plannedNames.volume}
- Config path: ${report.plannedNames.config}
- URL after approved deploy: ${report.plannedNames.baseUrl}

## Required Evidence

${formatBullets(report.requiredEvidence)}

## Manual Approval Checklist

${formatBullets(report.manualApprovalChecklist)}

## Success Criteria

${formatBullets(report.intake.successCriteria)}

## Stop Conditions

${formatBullets(report.stopConditions)}

## Warnings

${report.warnings.length ? formatBullets(report.warnings) : "- None."}

## Blockers

${report.blockers.length ? formatBullets(report.blockers) : "- None."}
`;
}

async function writePacket(report, outputDir) {
  await fs.mkdir(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, `${report.pilotSlug}-fencing-pilot-setup-approval.md`);
  await fs.writeFile(outputPath, formatFencingPilotSetupApprovalMarkdown(report), "utf8");
  return outputPath;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const report = buildFencingPilotSetupApproval(options);
  const output = { ...report, outputPath: "" };
  if (options.write) {
    output.outputPath = await writePacket(report, options.outputDir);
  }

  console.log(JSON.stringify(output, null, 2));
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
