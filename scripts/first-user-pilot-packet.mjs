import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

import {
  buildPilotRehearsalPlan,
  formatPilotRehearsalMarkdown,
  validatePilotRehearsalPlan,
} from "./pilot-rehearsal.mjs";

const DEFAULT_OUTPUT_DIR = path.resolve(process.cwd(), "tmp", "first-user-pilot-packets");

const REQUIRED_DOCS = [
  "docs/apex-hq-first-guided-user-walkthrough-script.md",
  "docs/apex-hq-one-page-pilot-onboarding-checklist.md",
  "docs/apex-hq-pilot-feedback-intake-form.md",
  "docs/apex-hq-pilot-readiness-checklist.md",
  "docs/apex-hq-support-intake-process.md",
  "docs/apex-hq-release-rollback-checklist.md",
];

const PILOT_SETUP_FIELDS = [
  "company name",
  "owner/admin name and email",
  "field lead or employee name and email if field workflow is in scope",
  "one active lead, estimate, job, or proof record",
  "current estimate, schedule, photo, and follow-up tools",
  "what gets lost most often today",
  "support channel and same-day best-effort expectations",
  "confirmation that current system remains backup during the pilot",
];

const WALKTHROUGH_STEPS = [
  "Set the frame: guided pilot, one workflow, current system remains backup.",
  "Open Command Center and show what needs attention.",
  "Open Leads or Opportunity Scout only if the selected workflow starts before estimate.",
  "Open Estimate Studio and show branded proposal, scope, inclusions, exclusions, and manual send boundaries.",
  "Open Jobs and Schedule to show the office-to-field handoff.",
  "Open Field Mode on phone if a field user is in scope.",
  "Open Reports and Uploads to show field proof review.",
  "Open Support and record one realistic feedback item.",
  "Confirm Day 3 and Day 10 follow-up dates.",
];

const SUPPORT_FIELDS = [
  "company/workspace",
  "user and role",
  "page or workflow",
  "device/browser",
  "issue or feedback",
  "steps, expected, and actual result",
  "screenshot or recording if available",
  "blocking yes/no",
  "severity P0/P1/P2/P3",
  "owner and promised follow-up",
];

function printHelp() {
  console.log(`Apex HQ first-user pilot packet

Usage:
  npm run pilot:first-user-packet -- --company="Friendly Fence Co" --trade="fencing" --workflow="lead -> estimate -> job -> field proof" --owner="Owner Name" --field-lead="Foreman Name" --first-record="First fence replacement lead" --field-action="Upload one fence progress photo" --success="Owner can review proof without text search" --success="Field user uploads one photo" --write

Options:
  --company=<name>
  --trade=<trade>
  --workflow=<workflow>
  --owner=<name>
  --field-lead=<name>
  --first-record=<text>
  --field-action=<text>
  --success=<text>       Provide 2 or 3.
  --start-date=YYYY-MM-DD
  --output-dir=<dir>     Defaults to tmp/first-user-pilot-packets.
  --write                Write a markdown packet. Without this, prints JSON only.
  --help

Boundary:
  This command does not create users, apps, records, customer data, Fly resources, outreach, deploys, or production changes.
`);
}

function parseArgs(argv) {
  const options = {
    company: "",
    trade: "",
    workflow: "",
    owner: "",
    fieldLead: "",
    firstRecord: "",
    fieldAction: "",
    successCriteria: [],
    startDate: "",
    outputDir: DEFAULT_OUTPUT_DIR,
    write: false,
    help: false,
  };

  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") options.help = true;
    if (arg === "--write") options.write = true;
    if (arg.startsWith("--company=")) options.company = valueAfterEquals(arg);
    if (arg.startsWith("--trade=")) options.trade = valueAfterEquals(arg);
    if (arg.startsWith("--workflow=")) options.workflow = valueAfterEquals(arg);
    if (arg.startsWith("--owner=")) options.owner = valueAfterEquals(arg);
    if (arg.startsWith("--field-lead=")) options.fieldLead = valueAfterEquals(arg);
    if (arg.startsWith("--first-record=")) options.firstRecord = valueAfterEquals(arg);
    if (arg.startsWith("--field-action=")) options.fieldAction = valueAfterEquals(arg);
    if (arg.startsWith("--success=")) options.successCriteria.push(valueAfterEquals(arg));
    if (arg.startsWith("--start-date=")) options.startDate = valueAfterEquals(arg);
    if (arg.startsWith("--output-dir=")) options.outputDir = path.resolve(process.cwd(), valueAfterEquals(arg));
  }

  return options;
}

function valueAfterEquals(arg) {
  return arg.slice(arg.indexOf("=") + 1).trim();
}

function safeText(value = "", fallback = "") {
  const text = String(value || "").trim().replace(/\s+/g, " ");
  return text || fallback;
}

function slugify(value = "") {
  return safeText(value, "first-user-pilot")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "first-user-pilot";
}

function formatBullets(items = []) {
  return (items.length ? items : ["[fill before pilot]"]).map((item) => `- ${item}`).join("\n");
}

function guidedPilotMessage(packet = {}) {
  const trade = packet.trade === "[trade]" ? "contractor" : packet.trade;
  return [
    "I can set you up, but I want to do it the right way.",
    "",
    `Apex HQ is ready for a guided ${trade} pilot, not a full self-serve rollout yet. I would start with one workflow for a few days: ${packet.workflow}.`,
    "",
    "You would keep your current system as backup while we test it. If the workflow feels useful, then we can turn it into a founder pilot and decide if it makes sense to keep going monthly.",
  ].join("\n");
}

export function buildFirstUserPilotPacket(input = {}) {
  const rehearsal = buildPilotRehearsalPlan(input);
  const rehearsalValidation = validatePilotRehearsalPlan(rehearsal);
  const trade = safeText(input.trade, "[trade]");
  const blockers = [...rehearsalValidation.issues];

  if (!trade || trade === "[trade]") {
    blockers.push("Trade is required so the first-user packet can stay specific.");
  }

  return {
    ok: blockers.length === 0,
    blockers,
    trade,
    rehearsal,
    requiredDocs: REQUIRED_DOCS,
    setupFields: PILOT_SETUP_FIELDS,
    walkthroughSteps: WALKTHROUGH_STEPS,
    supportFields: SUPPORT_FIELDS,
    message: guidedPilotMessage({ trade, workflow: rehearsal.workflow }),
    goNoGo: {
      guidedDemo: blockers.length === 0 ? "GO" : "NO-GO",
      controlledPilot: blockers.length === 0 ? "GO with supervision" : "NO-GO",
      publicLaunch: "NO-GO",
      productionDeploy: "NO-GO unless explicitly approved through backup-first release",
    },
    boundary: "read-only packet generator; no users, apps, records, Fly resources, outreach, deploys, or production changes",
  };
}

export function formatFirstUserPilotPacketMarkdown(packet = {}) {
  return `# Apex HQ First User Pilot Packet

Status: ${packet.ok ? "ready for founder review" : "incomplete"}

Boundary: ${packet.boundary}

## Decision

- Guided demo: ${packet.goNoGo.guidedDemo}
- Controlled pilot: ${packet.goNoGo.controlledPilot}
- Public launch: ${packet.goNoGo.publicLaunch}
- Production deploy: ${packet.goNoGo.productionDeploy}

## Candidate

- Company: ${packet.rehearsal.company}
- Trade: ${packet.trade}
- Owner/admin: ${packet.rehearsal.owner}
- Field lead: ${packet.rehearsal.fieldLead}
- Workflow: ${packet.rehearsal.workflow}
- First record: ${packet.rehearsal.firstRecord}
- First field/proof action: ${packet.rehearsal.fieldAction}
- Day 3: ${packet.rehearsal.day3Date}
- Day 10: ${packet.rehearsal.day10Date}

## First Message

\`\`\`text
${packet.message}
\`\`\`

## Setup Info Needed

${formatBullets(packet.setupFields)}

## Walkthrough Run Of Show

${formatBullets(packet.walkthroughSteps)}

## Success Criteria

${formatBullets(packet.rehearsal.successCriteria)}

## Support Intake Fields

${formatBullets(packet.supportFields)}

## Required Docs

${formatBullets(packet.requiredDocs)}

## Rehearsal Plan

${formatPilotRehearsalMarkdown(packet.rehearsal, {
    ok: packet.blockers.length === 0,
    issues: packet.blockers,
  })}

## Blockers

${packet.blockers.length ? formatBullets(packet.blockers) : "- None."}

Production deploy remains locked unless approved through the backup-first release checklist.
`;
}

async function writePacket(packet, outputDir) {
  await fs.mkdir(outputDir, { recursive: true });
  const fileName = `${packet.rehearsal.startDate}-${slugify(packet.rehearsal.company)}-first-user-pilot-packet.md`;
  const outputPath = path.join(outputDir, fileName);
  await fs.writeFile(outputPath, formatFirstUserPilotPacketMarkdown(packet), "utf8");
  return outputPath;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const packet = buildFirstUserPilotPacket(options);
  const report = {
    ok: packet.ok,
    blockers: packet.blockers,
    outputPath: "",
    packet,
  };

  if (options.write) {
    report.outputPath = await writePacket(packet, options.outputDir);
  }

  console.log(JSON.stringify(report, null, 2));
  if (!packet.ok) {
    process.exitCode = 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
