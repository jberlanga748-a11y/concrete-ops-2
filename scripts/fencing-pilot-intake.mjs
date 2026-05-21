import process from "node:process";
import { pathToFileURL } from "node:url";

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
  console.log(`Apex HQ fencing pilot intake gate

Usage:
  npm run pilot:fencing-intake -- --company="Friendly Fence Co" --owner-name="Riley Owner" --owner-email="owner@example.com" --field-name="Sam Foreman" --field-email="sam@example.com" --first-record="Cedar fence replacement estimate" --current-tools="texts, notebook, photos" --lost-info="photos and follow-ups" --support-channel="text John for same-day best effort" --backup-confirmed --terms-acknowledged --data-boundary-acknowledged --success="Owner can find proof" --success="Field user uploads one photo" --json

Options:
  --company=<name>
  --owner-name=<name>
  --owner-email=<email>
  --field-name=<name>
  --field-email=<email>
  --workflow=<text>              Defaults to the first fencing workflow.
  --first-record=<text>
  --field-action=<text>
  --current-tools=<text>
  --lost-info=<text>
  --support-channel=<text>
  --success=<text>               Provide 2 or 3.
  --backup-confirmed
  --terms-acknowledged
  --data-boundary-acknowledged
  --no-field-user                Use only if the pilot has no field phone workflow.
  --json
  --help

Boundary:
  Read-only intake validation. This does not create users, send outreach, deploy, touch production, store credentials, change packages, or mutate customer data.
`);
}

function valueAfterEquals(arg) {
  return arg.slice(arg.indexOf("=") + 1).trim();
}

function parseArgs(argv) {
  const options = {
    help: false,
    json: false,
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
    if (arg.startsWith("--success=")) options.intake.successCriteria.push(valueAfterEquals(arg));
  }

  return options;
}

function safeText(value = "") {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function validEmail(value = "") {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(safeText(value));
}

function hasRiskyPromise(value = "") {
  return RISKY_PROMISE_PATTERNS.some((pattern) => pattern.test(value));
}

function hasSecretLikeText(value = "") {
  return SECRET_PATTERNS.some((pattern) => pattern.test(value));
}

function isMissing(value = "") {
  const text = safeText(value).toLowerCase();
  return !text || text.includes("to confirm") || text.includes("[") || text.includes("todo");
}

export function buildFencingPilotIntakeGate(input = {}) {
  const intake = {
    company: safeText(input.company),
    ownerName: safeText(input.ownerName),
    ownerEmail: safeText(input.ownerEmail),
    fieldName: safeText(input.fieldName),
    fieldEmail: safeText(input.fieldEmail),
    fieldUserRequired: input.fieldUserRequired !== false,
    workflow: safeText(input.workflow, DEFAULT_WORKFLOW),
    firstRecord: safeText(input.firstRecord),
    fieldAction: safeText(input.fieldAction),
    currentTools: safeText(input.currentTools),
    lostInfo: safeText(input.lostInfo),
    supportChannel: safeText(input.supportChannel),
    successCriteria: Array.isArray(input.successCriteria)
      ? input.successCriteria.map((item) => safeText(item)).filter(Boolean)
      : [],
    backupConfirmed: Boolean(input.backupConfirmed),
    termsAcknowledged: Boolean(input.termsAcknowledged),
    dataBoundaryAcknowledged: Boolean(input.dataBoundaryAcknowledged),
  };

  const blockers = [];
  const warnings = [];
  if (isMissing(intake.company)) blockers.push("Company name is required.");
  if (isMissing(intake.ownerName)) blockers.push("Owner/admin name is required.");
  if (!validEmail(intake.ownerEmail)) blockers.push("Owner/admin email is required and must look valid.");
  if (intake.fieldUserRequired && isMissing(intake.fieldName)) blockers.push("Field lead or employee name is required for this field-proof pilot.");
  if (intake.fieldUserRequired && !validEmail(intake.fieldEmail)) blockers.push("Field lead or employee email is required and must look valid.");
  if (isMissing(intake.workflow)) blockers.push("One exact pilot workflow is required.");
  if (isMissing(intake.firstRecord)) blockers.push("One real first lead, estimate, job, or proof record is required.");
  if (intake.fieldUserRequired && isMissing(intake.fieldAction)) blockers.push("One exact field phone/proof action is required.");
  if (isMissing(intake.currentTools)) blockers.push("Current estimate, schedule, photo, and follow-up tools are required.");
  if (isMissing(intake.lostInfo)) blockers.push("The owner must say what gets lost most often today.");
  if (isMissing(intake.supportChannel)) blockers.push("Support channel and same-day best-effort expectations are required.");
  if (intake.successCriteria.length < 2 || intake.successCriteria.length > 3) blockers.push("Provide 2 or 3 plain-language success criteria.");
  if (!intake.backupConfirmed) blockers.push("Confirm the contractor will keep the current system as backup during the pilot.");
  if (!intake.termsAcknowledged) blockers.push("Confirm written pilot expectations are acknowledged before outside login.");
  if (!intake.dataBoundaryAcknowledged) blockers.push("Confirm no sensitive data beyond the pilot workflow should be uploaded.");

  const combinedText = [
    intake.company,
    intake.ownerName,
    intake.fieldName,
    intake.workflow,
    intake.firstRecord,
    intake.fieldAction,
    intake.currentTools,
    intake.lostInfo,
    intake.supportChannel,
    ...intake.successCriteria,
  ].join("\n");

  if (hasRiskyPromise(combinedText)) {
    blockers.push("Remove guaranteed-result, AI autopilot, auto-bidding, replacement, enterprise/compliance, or custom-build promises.");
  }
  if (hasSecretLikeText(combinedText)) {
    blockers.push("Remove passwords, tokens, API keys, or secrets from the intake.");
  }

  if (!intake.ownerEmail.endsWith("@example.com") && intake.ownerEmail) {
    warnings.push("Treat the owner/admin email as private setup data; do not commit it to docs.");
  }
  if (intake.fieldEmail && !intake.fieldEmail.endsWith("@example.com")) {
    warnings.push("Treat the field user email as private setup data; do not commit it to docs.");
  }

  const ok = blockers.length === 0;
  return {
    ok,
    status: ok ? "GO" : "NO-GO",
    blockers,
    warnings,
    intake,
    decisions: {
      outsideLogin: ok ? "GO after demo preflight and support owner confirmation" : "NO-GO",
      friendlyValidation: ok ? "GO with supervision" : "NO-GO",
      publicLaunch: "NO-GO",
      productionDeploy: "NO-GO unless explicitly approved through backup-first release",
    },
    nextSteps: ok
      ? [
        "Run npm.cmd run pilot:fencing-preflight -- --run --allow-auth --json with APEX_SMOKE_PASSWORD available.",
        "Create access only in the approved demo/pilot path after support owner confirmation.",
        "Keep the contractor's current system as backup.",
        "Schedule Day 3 and Day 10 check-ins before handoff.",
      ]
      : [
        "Collect missing setup information.",
        "Remove any unsafe promise or secret-like text.",
        "Do not create outside access yet.",
      ],
    boundary: "read-only intake gate; no user creation, outreach, deploy, production, package, billing, or customer-data mutation",
  };
}

function printHumanReport(report) {
  console.log("Apex HQ fencing pilot intake gate:");
  console.log(`- Status: ${report.status}`);
  console.log(`- Outside login: ${report.decisions.outsideLogin}`);
  console.log(`- Friendly validation: ${report.decisions.friendlyValidation}`);
  console.log(`- Public launch: ${report.decisions.publicLaunch}`);
  console.log(`- Production deploy: ${report.decisions.productionDeploy}`);
  console.log(`- Boundary: ${report.boundary}`);
  if (report.blockers.length) {
    console.log("\nBlockers:");
    for (const blocker of report.blockers) console.log(`- ${blocker}`);
  }
  if (report.warnings.length) {
    console.log("\nWarnings:");
    for (const warning of report.warnings) console.log(`- ${warning}`);
  }
  console.log("\nNext steps:");
  for (const step of report.nextSteps) console.log(`- ${step}`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const report = buildFencingPilotIntakeGate(options.intake);
  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printHumanReport(report);
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
