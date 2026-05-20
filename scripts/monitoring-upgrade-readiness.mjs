import process from "node:process";
import { pathToFileURL } from "node:url";

const DEFAULT_MIN_RETENTION_DAYS = 7;
const DEFAULT_MAX_RETENTION_DAYS = 90;
const APPROVED_ENVIRONMENTS = new Set(["demo", "pilot", "production"]);
const APPROVED_DESTINATIONS = new Set(["github-issues", "dedicated-ops-channel", "email-to-operator", "incident-tracker"]);
const SENSITIVE_LOG_TERMS = [
  "request bodies",
  "passwords",
  "tokens",
  "authorization headers",
  "customer payloads",
  "estimate contents",
  "upload contents",
  "payment data",
];

function printHelp() {
  console.log(`Apex HQ monitoring upgrade readiness

Usage:
  npm run verify:monitoring-upgrade
  npm run monitor:upgrade-readiness -- --provider="Better Stack" --environment=demo --alert-destination=github-issues --retention-days=14 --access-owner="John" --redaction-confirmed --demo-first --json

Options:
  --provider=<name>               Monitoring/log provider or "github-actions".
  --environment=demo|pilot|production
  --alert-destination=<value>     github-issues, dedicated-ops-channel, email-to-operator, or incident-tracker.
  --retention-days=<days>         Must be 7 to 90 for pilot-stage monitoring.
  --access-owner=<name>           Person accountable for access and alerts.
  --redaction-confirmed           Confirms no request bodies, secrets, tokens, or sensitive payloads are captured.
  --request-id-search             Provider supports request ID search.
  --error-alerts                  Provider supports error/5xx/readiness alerts.
  --demo-first                    Demo-first rollout is planned before production.
  --production-approved           Explicit production-safety approval was recorded.
  --json
  --help

Boundary:
  This command does not create log drains, set secrets, configure providers, deploy, touch Fly, or send production logs anywhere.
`);
}

function parseArgs(argv) {
  const options = {
    provider: "",
    environment: "demo",
    alertDestination: "",
    retentionDays: 0,
    accessOwner: "",
    redactionConfirmed: false,
    requestIdSearch: false,
    errorAlerts: false,
    demoFirst: false,
    productionApproved: false,
    json: false,
    help: false,
  };

  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") options.help = true;
    if (arg === "--json") options.json = true;
    if (arg === "--redaction-confirmed") options.redactionConfirmed = true;
    if (arg === "--request-id-search") options.requestIdSearch = true;
    if (arg === "--error-alerts") options.errorAlerts = true;
    if (arg === "--demo-first") options.demoFirst = true;
    if (arg === "--production-approved") options.productionApproved = true;
    if (arg.startsWith("--provider=")) options.provider = valueAfterEquals(arg);
    if (arg.startsWith("--environment=")) options.environment = valueAfterEquals(arg).toLowerCase();
    if (arg.startsWith("--alert-destination=")) options.alertDestination = valueAfterEquals(arg).toLowerCase();
    if (arg.startsWith("--retention-days=")) options.retentionDays = Number(valueAfterEquals(arg));
    if (arg.startsWith("--access-owner=")) options.accessOwner = valueAfterEquals(arg);
  }

  return options;
}

function valueAfterEquals(arg) {
  return arg.slice(arg.indexOf("=") + 1).trim();
}

function isBlank(value) {
  return !String(value || "").trim();
}

export function buildMonitoringUpgradeReadiness(input = {}) {
  const options = {
    provider: String(input.provider || "").trim(),
    environment: String(input.environment || "demo").trim().toLowerCase(),
    alertDestination: String(input.alertDestination || "").trim().toLowerCase(),
    retentionDays: Number(input.retentionDays || 0),
    accessOwner: String(input.accessOwner || "").trim(),
    redactionConfirmed: Boolean(input.redactionConfirmed),
    requestIdSearch: Boolean(input.requestIdSearch),
    errorAlerts: Boolean(input.errorAlerts),
    demoFirst: Boolean(input.demoFirst),
    productionApproved: Boolean(input.productionApproved),
  };

  const blockers = [];
  const warnings = [];

  if (isBlank(options.provider)) {
    blockers.push("Choose one monitoring/log provider or explicitly choose the existing GitHub Actions baseline.");
  }

  if (!APPROVED_ENVIRONMENTS.has(options.environment)) {
    blockers.push(`Environment must be one of: ${Array.from(APPROVED_ENVIRONMENTS).join(", ")}.`);
  }

  if (!APPROVED_DESTINATIONS.has(options.alertDestination)) {
    blockers.push(`Alert destination must be one of: ${Array.from(APPROVED_DESTINATIONS).join(", ")}.`);
  }

  if (!Number.isInteger(options.retentionDays)
    || options.retentionDays < DEFAULT_MIN_RETENTION_DAYS
    || options.retentionDays > DEFAULT_MAX_RETENTION_DAYS) {
    blockers.push(`Retention must be ${DEFAULT_MIN_RETENTION_DAYS}-${DEFAULT_MAX_RETENTION_DAYS} days for pilot-stage monitoring.`);
  }

  if (isBlank(options.accessOwner)) {
    blockers.push("Name the access owner responsible for provider access and alert handling.");
  }

  if (!options.redactionConfirmed) {
    blockers.push(`Confirm the provider will not capture sensitive data: ${SENSITIVE_LOG_TERMS.join(", ")}.`);
  }

  if (!options.requestIdSearch) {
    blockers.push("Confirm the provider supports search by request ID.");
  }

  if (!options.errorAlerts) {
    blockers.push("Confirm alerting on level:error, repeated 5xx, and readiness failures.");
  }

  if (!options.demoFirst) {
    blockers.push("Test the monitoring change on demo before production.");
  }

  if (options.environment === "production" && !options.productionApproved) {
    blockers.push("Production monitoring/log drain changes require explicit production-safety approval.");
  }

  if (/personal|gmail|inbox/i.test(options.provider) || /personal|gmail|inbox/i.test(options.alertDestination)) {
    blockers.push("Do not route production logs or alerts to unmanaged personal inboxes.");
  }

  if (/freeform|request bod|payload/i.test(options.provider)) {
    warnings.push("Provider name suggests payload capture; confirm log payload filtering before any trial.");
  }

  return {
    go: blockers.length === 0,
    environment: options.environment,
    provider: options.provider || "[not selected]",
    alertDestination: options.alertDestination || "[not selected]",
    retentionDays: options.retentionDays || 0,
    accessOwner: options.accessOwner || "[not assigned]",
    blockers,
    warnings,
    requiredSignals: [
      "/api/ready failure",
      "/api/health failure",
      "level:error logs",
      "repeated 5xx responses",
      "request duration over 10 seconds",
      "SQLite readiness or locking errors",
      "backup/export failure",
      "restore drill failure",
    ],
    rollout: [
      "Document provider, access owner, retention, redaction, and alert destination.",
      "Run demo-first monitoring for 24-48 hours.",
      "Review false positives and alert noise.",
      "Request production-safety approval before production log drain or paid provider changes.",
      "Keep rollback/removal commands in the release checklist.",
    ],
    boundary: "read-only: no provider setup, no log drain, no secrets, no deploy, no Fly change, no production log export",
  };
}

function printHumanReport(report) {
  console.log("Monitoring upgrade readiness:");
  console.log(`- Provider: ${report.provider}`);
  console.log(`- Environment: ${report.environment}`);
  console.log(`- Alert destination: ${report.alertDestination}`);
  console.log(`- Retention days: ${report.retentionDays}`);
  console.log(`- Access owner: ${report.accessOwner}`);
  console.log(`- Decision: ${report.go ? "GO" : "NO-GO"}`);

  if (report.blockers.length) {
    console.log("\nBlockers:");
    for (const blocker of report.blockers) {
      console.log(`- ${blocker}`);
    }
  }

  if (report.warnings.length) {
    console.log("\nWarnings:");
    for (const warning of report.warnings) {
      console.log(`- ${warning}`);
    }
  }

  console.log("\nBoundary: no provider, log drain, secret, deploy, Fly, or production-log action was performed.");
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const report = buildMonitoringUpgradeReadiness(options);
  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printHumanReport(report);
  }

  if (!report.go && options.provider) {
    process.exitCode = 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
