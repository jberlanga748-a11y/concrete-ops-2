import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const DEFAULT_OUTPUT_DIR = path.resolve(process.cwd(), "tmp", "fencing-pilot-checkins");
const DEFAULT_WORKFLOW = "lead / opportunity -> estimate -> job -> schedule -> field proof -> report/upload -> ready-to-bill review";

const RISKY_PROMISE_PATTERNS = [
  /guarantee(?:d|s)?\s+(?:leads|jobs|revenue|growth|sales|results)/i,
  /AI\s+(?:runs|prices|bids|approves|sends|contacts|handles)/i,
  /automatic\s+(?:bid|bidding|pricing|sending|messages|customer contact|outreach)/i,
  /replaces?\s+(?:QuickBooks|payroll|accounting|your accountant)/i,
  /enterprise[-\s]?ready|SOC\s*2|bank[-\s]?level|fully compliant/i,
  /custom\s+(?:fencing\s+)?(?:feature|build|software)/i,
];

const SECRET_PATTERNS = [
  /password\s*[:=]/i,
  /token\s*[:=]/i,
  /api[_\s-]?key\s*[:=]/i,
  /secret\s*[:=]/i,
  /\bsk-[A-Za-z0-9_-]{12,}/,
];

function printHelp() {
  console.log(`Apex HQ fencing pilot check-in packet

Usage:
  npm run pilot:fencing-checkins -- --company="Friendly Fence Co" --owner="Riley Owner" --workflow="lead -> estimate -> job -> field proof" --first-record="Cedar fence replacement estimate" --field-action="Upload one fence photo" --success="Owner can find proof" --success="Field user uploads one photo" --write

Options:
  --company=<name>
  --owner=<name>
  --field-lead=<name>
  --workflow=<text>
  --first-record=<text>
  --field-action=<text>
  --success=<text>       Provide 2 or 3.
  --start-date=YYYY-MM-DD
  --output-dir=<dir>     Defaults to tmp/fencing-pilot-checkins.
  --write                Write a markdown packet. Without this, prints JSON only.
  --json
  --help

Boundary:
  Read-only check-in planner. This does not send messages, create users, create tasks, deploy, touch production, change packages, or mutate customer data.
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
    company: "",
    owner: "",
    fieldLead: "",
    workflow: DEFAULT_WORKFLOW,
    firstRecord: "",
    fieldAction: "",
    successCriteria: [],
    startDate: "",
  };

  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") options.help = true;
    if (arg === "--json") options.json = true;
    if (arg === "--write") options.write = true;
    if (arg.startsWith("--company=")) options.company = valueAfterEquals(arg);
    if (arg.startsWith("--owner=")) options.owner = valueAfterEquals(arg);
    if (arg.startsWith("--field-lead=")) options.fieldLead = valueAfterEquals(arg);
    if (arg.startsWith("--workflow=")) options.workflow = valueAfterEquals(arg);
    if (arg.startsWith("--first-record=")) options.firstRecord = valueAfterEquals(arg);
    if (arg.startsWith("--field-action=")) options.fieldAction = valueAfterEquals(arg);
    if (arg.startsWith("--success=")) options.successCriteria.push(valueAfterEquals(arg));
    if (arg.startsWith("--start-date=")) options.startDate = valueAfterEquals(arg);
    if (arg.startsWith("--output-dir=")) options.outputDir = path.resolve(process.cwd(), valueAfterEquals(arg));
  }

  return options;
}

function safeText(value = "", fallback = "") {
  const text = String(value || "").trim().replace(/\s+/g, " ");
  return text || fallback;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(date, days) {
  const next = new Date(`${date}T00:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

function slugify(value = "") {
  return safeText(value, "fencing-pilot")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "fencing-pilot";
}

function hasRiskyPromise(value = "") {
  return RISKY_PROMISE_PATTERNS.some((pattern) => pattern.test(value));
}

function hasSecretLikeText(value = "") {
  return SECRET_PATTERNS.some((pattern) => pattern.test(value));
}

function formatBullets(items = []) {
  return (items.length ? items : ["[fill before pilot]"]).map((item) => `- ${item}`).join("\n");
}

export function buildFencingPilotCheckinPacket(input = {}) {
  const startDate = safeText(input.startDate, todayIso());
  const successCriteria = Array.isArray(input.successCriteria)
    ? input.successCriteria.map((item) => safeText(item)).filter(Boolean)
    : [];

  const packet = {
    company: safeText(input.company, "[company]"),
    owner: safeText(input.owner, "[owner/admin]"),
    fieldLead: safeText(input.fieldLead, "[field lead if needed]"),
    workflow: safeText(input.workflow, DEFAULT_WORKFLOW),
    firstRecord: safeText(input.firstRecord, "[first real lead, estimate, job, or proof item]"),
    fieldAction: safeText(input.fieldAction, "[first field action]"),
    startDate,
    day3Date: addDays(startDate, 3),
    day10Date: addDays(startDate, 10),
    successCriteria,
    day3Questions: [
      "Did the owner/admin log in and find the selected workflow?",
      "Did the field user complete the agreed phone action if field workflow is in scope?",
      "What still went through text, memory, notebook, or another tool?",
      "Where did Apex HQ feel slower than the current process?",
      "Is the issue training, setup, bug, blocker, or future idea?",
      "Should the pilot continue as-is, narrow, adjust, or stop?",
    ],
    day10Scorecard: [
      "Owner can find the lead/estimate/job/proof without searching texts.",
      "Field user can complete the agreed action without office help.",
      "Reports/uploads/proof are easier to review than before.",
      "Follow-up or ready-to-bill status is clearer.",
      "Support load is manageable for founder-led pilot stage.",
      "Contractor would keep using the workflow or pay for a founder pilot.",
    ],
    outcomes: [
      "continue: pilot workflow is useful and support load is manageable",
      "adjust: workflow is useful but setup/training must be tightened",
      "narrow: one part works, but the pilot is too broad",
      "stop: value is unclear, support load is too high, or fit is poor",
    ],
    supportSeverity: [
      "P0: data leak, auth failure, wrong-role visibility, or app unavailable",
      "P1: pilot-blocking workflow failure with no workaround",
      "P2: friction with a workaround or training need",
      "P3: polish, wording, or future idea",
    ],
    boundaries: [
      "no custom build promise",
      "no guaranteed leads, jobs, revenue, or growth",
      "no AI autopilot, automatic bidding, pricing, sending, or customer contact",
      "no accounting/payroll replacement",
      "no public testimonial, screenshot, or logo without permission",
      "no production deploy or customer app handoff without approved setup",
    ],
  };

  const blockers = [];
  if (packet.company === "[company]") blockers.push("Company is required.");
  if (packet.owner === "[owner/admin]") blockers.push("Owner/admin contact is required.");
  if (packet.workflow === DEFAULT_WORKFLOW) blockers.push("Exact pilot workflow is required.");
  if (/^\[/.test(packet.firstRecord)) blockers.push("First real record is required.");
  if (/^\[/.test(packet.fieldAction)) blockers.push("First field action is required.");
  if (successCriteria.length < 2 || successCriteria.length > 3) blockers.push("Provide 2 or 3 success criteria.");

  const combinedText = [
    packet.company,
    packet.owner,
    packet.fieldLead,
    packet.workflow,
    packet.firstRecord,
    packet.fieldAction,
    ...successCriteria,
  ].join("\n");
  if (hasRiskyPromise(combinedText)) {
    blockers.push("Remove guaranteed-result, AI autopilot, auto-bidding, replacement, enterprise/compliance, or custom-build promises.");
  }
  if (hasSecretLikeText(combinedText)) {
    blockers.push("Remove passwords, tokens, API keys, or secrets from the check-in packet.");
  }

  return {
    ok: blockers.length === 0,
    blockers,
    packet,
    decisions: {
      day3Checkin: blockers.length === 0 ? "READY" : "NO-GO",
      day10ValueReview: blockers.length === 0 ? "READY" : "NO-GO",
      publicLaunch: "NO-GO",
      productionDeploy: "NO-GO unless explicitly approved through backup-first release",
    },
    boundary: "read-only check-in planner; no messages, users, tasks, deploys, production, package, billing, or customer-data mutation",
  };
}

export function formatFencingPilotCheckinMarkdown(report = {}) {
  const packet = report.packet || {};
  return `# Apex HQ Fencing Pilot Check-In Packet

Status: ${report.ok ? "ready for founder review" : "incomplete"}

Boundary: ${report.boundary}

## Decision

- Day 3 check-in: ${report.decisions.day3Checkin}
- Day 10 value review: ${report.decisions.day10ValueReview}
- Public launch: ${report.decisions.publicLaunch}
- Production deploy: ${report.decisions.productionDeploy}

## Pilot

- Company: ${packet.company}
- Owner/admin: ${packet.owner}
- Field lead: ${packet.fieldLead}
- Workflow: ${packet.workflow}
- First record: ${packet.firstRecord}
- First field action: ${packet.fieldAction}
- Start: ${packet.startDate}
- Day 3: ${packet.day3Date}
- Day 10: ${packet.day10Date}

## Success Criteria

${formatBullets(packet.successCriteria)}

## Day 3 Questions

${formatBullets(packet.day3Questions)}

## Day 10 Scorecard

Score each item 0-2:

- 0 = did not happen
- 1 = partially happened
- 2 = happened clearly

${formatBullets(packet.day10Scorecard)}

## Continue / Adjust / Narrow / Stop

${formatBullets(packet.outcomes)}

## Support Severity

${formatBullets(packet.supportSeverity)}

## Boundaries

${formatBullets(packet.boundaries)}

## Blockers

${report.blockers.length ? formatBullets(report.blockers) : "- None."}
`;
}

async function writePacket(report, outputDir) {
  await fs.mkdir(outputDir, { recursive: true });
  const fileName = `${report.packet.startDate}-${slugify(report.packet.company)}-fencing-pilot-checkins.md`;
  const outputPath = path.join(outputDir, fileName);
  await fs.writeFile(outputPath, formatFencingPilotCheckinMarkdown(report), "utf8");
  return outputPath;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const report = buildFencingPilotCheckinPacket(options);
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
