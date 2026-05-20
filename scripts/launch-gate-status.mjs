import process from "node:process";
import { pathToFileURL } from "node:url";

import { runPublicClaimsCheck } from "./public-claims-check.mjs";
import { buildMonitoringUpgradeReadiness } from "./monitoring-upgrade-readiness.mjs";
import { buildPilotRehearsalPlan, validatePilotRehearsalPlan } from "./pilot-rehearsal.mjs";
import { runProductionAuthSmokeReadiness } from "./production-auth-smoke-readiness.mjs";

function printHelp() {
  console.log(`Apex HQ launch gate status

Usage:
  npm run launch:gate-status
  npm run launch:gate-status -- --check-live --json
  npm run launch:gate-status -- --company="Acme Concrete" --workflow="estimate -> job -> field proof" --owner="Riley Owner" --first-record="Maple Ridge estimate" --field-action="Upload one proof photo" --success="Owner can find proof" --success="Field user completes one action" --json

Options:
  --check-live                  Read-only /api/ready check for production auth smoke readiness.
  --skip-gh                     Skip GitHub secret presence check.
  --base-url=<url>              Production URL for readiness checks.
  --repo=<owner/repo>           GitHub repo for secret presence check.

Pilot rehearsal options:
  --company=<name>
  --workflow=<workflow>
  --owner=<name>
  --field-lead=<name>
  --first-record=<text>
  --field-action=<text>
  --success=<text>              Provide 2 or 3 success criteria.
  --start-date=YYYY-MM-DD

Monitoring options:
  --provider=<name>
  --environment=demo|pilot|production
  --alert-destination=<value>
  --retention-days=<days>
  --access-owner=<name>
  --redaction-confirmed
  --request-id-search
  --error-alerts
  --demo-first
  --production-approved

Boundary:
  This command does not deploy, authenticate, create sessions, create users, set secrets, create Fly resources, configure providers, write customer data, or mutate production.
`);
}

function parseArgs(argv) {
  const options = {
    help: false,
    json: false,
    productionAuth: {
      repo: "jberlanga748-a11y/concrete-ops-2",
      baseUrl: "https://app.apexhq.online",
      skipGh: false,
      checkLive: false,
    },
    monitoring: {
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
    },
    pilot: {
      company: "",
      workflow: "",
      owner: "",
      fieldLead: "",
      firstRecord: "",
      fieldAction: "",
      successCriteria: [],
      startDate: "",
    },
  };

  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") options.help = true;
    if (arg === "--json") options.json = true;
    if (arg === "--skip-gh") options.productionAuth.skipGh = true;
    if (arg === "--check-live") options.productionAuth.checkLive = true;
    if (arg === "--redaction-confirmed") options.monitoring.redactionConfirmed = true;
    if (arg === "--request-id-search") options.monitoring.requestIdSearch = true;
    if (arg === "--error-alerts") options.monitoring.errorAlerts = true;
    if (arg === "--demo-first") options.monitoring.demoFirst = true;
    if (arg === "--production-approved") options.monitoring.productionApproved = true;

    if (arg.startsWith("--repo=")) options.productionAuth.repo = valueAfterEquals(arg);
    if (arg.startsWith("--base-url=")) options.productionAuth.baseUrl = valueAfterEquals(arg).replace(/\/+$/, "");

    if (arg.startsWith("--provider=")) options.monitoring.provider = valueAfterEquals(arg);
    if (arg.startsWith("--environment=")) options.monitoring.environment = valueAfterEquals(arg);
    if (arg.startsWith("--alert-destination=")) options.monitoring.alertDestination = valueAfterEquals(arg);
    if (arg.startsWith("--retention-days=")) options.monitoring.retentionDays = Number(valueAfterEquals(arg));
    if (arg.startsWith("--access-owner=")) options.monitoring.accessOwner = valueAfterEquals(arg);

    if (arg.startsWith("--company=")) options.pilot.company = valueAfterEquals(arg);
    if (arg.startsWith("--workflow=")) options.pilot.workflow = valueAfterEquals(arg);
    if (arg.startsWith("--owner=")) options.pilot.owner = valueAfterEquals(arg);
    if (arg.startsWith("--field-lead=")) options.pilot.fieldLead = valueAfterEquals(arg);
    if (arg.startsWith("--first-record=")) options.pilot.firstRecord = valueAfterEquals(arg);
    if (arg.startsWith("--field-action=")) options.pilot.fieldAction = valueAfterEquals(arg);
    if (arg.startsWith("--success=")) options.pilot.successCriteria.push(valueAfterEquals(arg));
    if (arg.startsWith("--start-date=")) options.pilot.startDate = valueAfterEquals(arg);
  }

  return options;
}

function valueAfterEquals(arg) {
  return arg.slice(arg.indexOf("=") + 1).trim();
}

function gate(name, go, blockers = [], warnings = []) {
  return {
    name,
    go,
    status: go ? "GO" : "NO-GO",
    blockers,
    warnings,
  };
}

function requiredExternalBlockers() {
  return [
    "Formal legal/privacy/public-claims review is still required before wider paid launch.",
    "Production monitoring/log-drain provider is not enabled without approval.",
    "Production auth smoke users/secret are not approved/configured.",
    "Customer-specific pilot app/workspace requires a real customer slug and setup approval.",
  ];
}

export function buildLaunchGateStatus({
  claims = { ok: false, findings: [] },
  productionAuth = { readyForAuthSmoke: false, decision: { blockers: [] } },
  monitoring = { go: false, blockers: [] },
  pilotValidation = { ok: false, issues: [] },
} = {}) {
  const claimBlockers = claims.ok
    ? []
    : (claims.findings || []).map((finding) => `${finding.file}:${finding.line} ${finding.message}`);
  const productionAuthBlockers = productionAuth?.decision?.blockers || [];
  const monitoringBlockers = monitoring?.blockers || [];
  const pilotBlockers = pilotValidation?.issues || [];

  const gates = [
    gate("Guided demo readiness", claims.ok, claimBlockers),
    gate("Customer pilot handoff readiness", claims.ok && pilotValidation.ok, [
      ...claimBlockers,
      ...pilotBlockers,
    ]),
    gate("Production auth smoke readiness", Boolean(productionAuth.readyForAuthSmoke), productionAuthBlockers),
    gate("Production monitoring upgrade readiness", Boolean(monitoring.go), monitoringBlockers, monitoring.warnings || []),
    gate("Wider paid launch readiness", false, [
      ...claimBlockers,
      ...requiredExternalBlockers(),
    ]),
  ];

  return {
    ok: gates.every((item) => item.go),
    checkedAt: new Date().toISOString(),
    gates,
    nextHighestLeverage: firstBlockerRecommendation(gates),
    boundary: "read-only: no deploy, auth, session, secret, user, Fly, provider, customer data, or production mutation",
  };
}

function firstBlockerRecommendation(gates) {
  const customerPilot = gates.find((item) => item.name === "Customer pilot handoff readiness");
  if (customerPilot && !customerPilot.go) {
    return "Pick one real pilot candidate/workflow and run pilot:rehearsal with 2-3 success criteria.";
  }
  const monitoring = gates.find((item) => item.name === "Production monitoring upgrade readiness");
  if (monitoring && !monitoring.go) {
    return "Choose a demo-first monitoring provider/destination or keep GitHub Actions as the baseline.";
  }
  const productionAuth = gates.find((item) => item.name === "Production auth smoke readiness");
  if (productionAuth && !productionAuth.go) {
    return "Approve dedicated production smoke users and configure APEX_PRODUCTION_SMOKE_PASSWORD before auth smoke.";
  }
  return "Do formal legal/privacy/public-claims review before wider paid launch.";
}

function printHumanReport(report) {
  console.log("Apex HQ launch gate status:");
  for (const item of report.gates) {
    console.log(`- ${item.name}: ${item.status}`);
    for (const blocker of item.blockers.slice(0, 5)) {
      console.log(`  - ${blocker}`);
    }
    if (item.blockers.length > 5) {
      console.log(`  - ${item.blockers.length - 5} more blocker(s)`);
    }
  }
  console.log(`\nNext highest leverage: ${report.nextHighestLeverage}`);
  console.log(`Boundary: ${report.boundary}`);
}

export async function runLaunchGateStatus(options = {}) {
  const claims = await runPublicClaimsCheck();
  const productionAuth = await runProductionAuthSmokeReadiness(options.productionAuth || {});
  const monitoring = buildMonitoringUpgradeReadiness(options.monitoring || {});
  const pilotPlan = buildPilotRehearsalPlan(options.pilot || {});
  const pilotValidation = validatePilotRehearsalPlan(pilotPlan);

  return buildLaunchGateStatus({
    claims,
    productionAuth,
    monitoring,
    pilotValidation,
  });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const report = await runLaunchGateStatus(options);
  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printHumanReport(report);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
