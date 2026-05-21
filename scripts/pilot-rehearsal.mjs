import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const DEFAULT_OUTPUT_DIR = path.resolve(process.cwd(), "tmp", "pilot-rehearsals");
const SAFE_WORKFLOW = "lead/estimate -> job -> schedule/handoff -> field photo/report/upload -> owner review";
const PILOT_REFERENCE_DOCS = [
  "docs/apex-hq-first-guided-user-walkthrough-script.md",
  "docs/apex-hq-one-page-pilot-onboarding-checklist.md",
  "docs/apex-hq-pilot-feedback-intake-form.md",
  "docs/apex-hq-pilot-readiness-checklist.md",
  "docs/apex-hq-support-intake-process.md",
];
const GUIDED_WALKTHROUGH_ROUTES = [
  "/command-center",
  "/leads",
  "/estimates",
  "/jobs",
  "/schedule",
  "/reports",
  "/uploads",
  "/support",
];
const RISKY_PROMISE_PATTERNS = [
  /guarantee(?:d|s)?\s+(?:leads|jobs|revenue|growth|sales|results)/i,
  /AI\s+(?:runs|prices|bids|approves|sends|contacts|handles)/i,
  /replaces?\s+(?:QuickBooks|payroll|accounting|your accountant)/i,
  /enterprise[-\s]?ready|SOC\s*2|bank[-\s]?level|fully compliant/i,
  /custom build/i,
  /automatic\s+(?:pricing|sending|messages|customer contact)/i,
];

function printHelp() {
  console.log(`Apex HQ pilot rehearsal plan

Usage:
  npm run pilot:rehearsal -- --company="Acme Concrete" --workflow="estimate -> job -> field proof" --owner="Riley Owner" --field-lead="Sam Foreman" --success="Owner can find proof" --success="Field user uploads one photo" --write

Options:
  --company=<name>       Contractor or pilot company name.
  --workflow=<workflow>  One narrow workflow to test.
  --owner=<name>         Owner/admin pilot contact.
  --field-lead=<name>    Foreman/employee pilot contact when field workflow is in scope.
  --first-record=<text>  First real lead, estimate, job, or proof item.
  --field-action=<text>  First field action to rehearse.
  --success=<text>       Success criterion. Provide 2 or 3.
  --start-date=YYYY-MM-DD
  --output-dir=<dir>     Defaults to tmp/pilot-rehearsals.
  --write                Write a markdown plan. Without this, prints JSON only.
  --help

Boundary:
  This command does not create apps, users, records, Fly resources, customer data, outreach, or deploys.
`);
}

function parseArgs(argv) {
  const options = {
    company: "",
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
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }
    if (arg === "--write") {
      options.write = true;
      continue;
    }
    if (arg.startsWith("--company=")) options.company = valueAfterEquals(arg);
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

function addDays(date, days) {
  const next = new Date(`${date}T00:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function safeText(value = "", fallback = "") {
  const text = String(value || "").trim().replace(/\s+/g, " ");
  return text || fallback;
}

function slugify(value = "") {
  return safeText(value, "pilot")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "pilot";
}

function hasRiskyPromise(value = "") {
  return RISKY_PROMISE_PATTERNS.some((pattern) => pattern.test(value));
}

export function buildPilotRehearsalPlan(input = {}) {
  const startDate = safeText(input.startDate, todayIso());
  const successCriteria = Array.isArray(input.successCriteria)
    ? input.successCriteria.map((item) => safeText(item)).filter(Boolean)
    : [];

  return {
    company: safeText(input.company, "[company]"),
    workflow: safeText(input.workflow, SAFE_WORKFLOW),
    owner: safeText(input.owner, "[owner/admin]"),
    fieldLead: safeText(input.fieldLead, "[field lead if needed]"),
    firstRecord: safeText(input.firstRecord, "[first real lead, estimate, job, or proof item]"),
    fieldAction: safeText(input.fieldAction, "[first photo, report, upload, ticket, checklist, or job update]"),
    packageDirection: safeText(input.packageDirection, "unknown until day-10 value review"),
    startDate,
    day3Date: addDays(startDate, 3),
    day10Date: addDays(startDate, 10),
    successCriteria,
    referenceDocs: PILOT_REFERENCE_DOCS,
    guidedWalkthroughRoutes: GUIDED_WALKTHROUGH_ROUTES,
    boundaries: [
      "one workflow only",
      "no custom build promise",
      "no guaranteed leads, jobs, revenue, or growth",
      "no accounting/payroll replacement",
      "no AI autopilot, automatic pricing, automatic sending, or automatic customer contact",
      "no enterprise, SOC 2, bank-level, or formal compliance claim",
      "no production deploy or customer app handoff without the approved setup checklist",
    ],
    day0: [
      "Confirm contractor trade, crew count, owner/admin, field lead, current tools, and pain in their words.",
      "Confirm first real record and one field/proof action.",
      "Confirm owner/admin and field role boundaries.",
      "Confirm support severity path and screenshot/steps capture.",
      "Run local pilot readiness preflight and manual pilot smoke before handoff.",
    ],
    day3: [
      "Confirm owner/admin logged in and found the workflow.",
      "Confirm field user attempted the agreed action if field workflow is in scope.",
      "Capture what still went through text and where Apex HQ felt slower.",
      "Classify issues as training, workaround, product blocker, or poor fit.",
      "Keep, narrow, adjust, or stop without adding scope.",
    ],
    day10: [
      "Score real workflow use, owner value, field action, reduced chasing, proof visibility, follow-up clarity, support load, and willingness to pay.",
      "Decide continue, adjust, or stop.",
      "Ask for quote, screenshot, logo, or referral only after value is real and permission is explicit.",
    ],
  };
}

export function validatePilotRehearsalPlan(plan = {}) {
  const issues = [];
  const checkedText = [
    plan.workflow,
    plan.firstRecord,
    plan.fieldAction,
    ...(plan.successCriteria || []),
  ].join("\n");

  if (!plan.company || plan.company === "[company]") issues.push("Company is required before a real pilot rehearsal.");
  if (!plan.owner || plan.owner === "[owner/admin]") issues.push("Owner/admin contact is required.");
  if (!plan.workflow || plan.workflow === SAFE_WORKFLOW) issues.push("Select one exact workflow for the pilot.");
  if (!plan.firstRecord || /^\[/.test(plan.firstRecord)) issues.push("First real lead, estimate, job, or proof item is required.");
  if (!plan.fieldAction || /^\[/.test(plan.fieldAction)) issues.push("First field/proof action is required.");
  if (!Array.isArray(plan.successCriteria) || plan.successCriteria.length < 2 || plan.successCriteria.length > 3) {
    issues.push("Provide 2 or 3 plain-language success criteria.");
  }
  if (hasRiskyPromise(checkedText)) {
    issues.push("Remove custom-build, guaranteed-result, autopilot, replacement, or enterprise/compliance promises.");
  }

  return {
    ok: issues.length === 0,
    issues,
  };
}

export function formatPilotRehearsalMarkdown(plan = {}, validation = validatePilotRehearsalPlan(plan)) {
  return `# Apex HQ Pilot Rehearsal Plan

Status: ${validation.ok ? "ready for manual review" : "incomplete"}

Boundary: this plan does not create apps, users, records, outreach, Fly resources, or deployments.

## Pilot

- Company: ${plan.company}
- Workflow: ${plan.workflow}
- Owner/admin: ${plan.owner}
- Field lead: ${plan.fieldLead}
- First record: ${plan.firstRecord}
- First field/proof action: ${plan.fieldAction}
- Package direction: ${plan.packageDirection}
- Start: ${plan.startDate}
- Day 3: ${plan.day3Date}
- Day 10: ${plan.day10Date}

## Success Criteria

${formatBullets(plan.successCriteria)}

## Guided Walkthrough Routes

${formatBullets(plan.guidedWalkthroughRoutes)}

## Required Reference Docs

${formatBullets(plan.referenceDocs)}

## Day 0

${formatBullets(plan.day0)}

## Day 3

${formatBullets(plan.day3)}

## Day 10

${formatBullets(plan.day10)}

## Boundaries

${formatBullets(plan.boundaries)}

## Validation

${validation.ok ? "- Passed local rehearsal validation." : formatBullets(validation.issues)}
`;
}

function formatBullets(items = []) {
  return (items.length ? items : ["[fill before pilot]"]).map((item) => `- ${item}`).join("\n");
}

async function writePlan(plan, validation, outputDir) {
  await fs.mkdir(outputDir, { recursive: true });
  const fileName = `${plan.startDate}-${slugify(plan.company)}-pilot-rehearsal.md`;
  const outputPath = path.join(outputDir, fileName);
  await fs.writeFile(outputPath, formatPilotRehearsalMarkdown(plan, validation), "utf8");
  return outputPath;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const plan = buildPilotRehearsalPlan(options);
  const validation = validatePilotRehearsalPlan(plan);
  const report = {
    ok: validation.ok,
    issues: validation.issues,
    plan,
    outputPath: "",
    boundary: "read-only rehearsal helper; no apps, users, records, Fly resources, outreach, or deploys",
  };

  if (options.write) {
    report.outputPath = await writePlan(plan, validation, options.outputDir);
  }

  console.log(JSON.stringify(report, null, 2));
  if (!validation.ok) {
    process.exitCode = 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
