import process from "node:process";
import { pathToFileURL } from "node:url";

const DEFAULT_BASE_URL = "https://app.apexhq.online";

function printHelp() {
  console.log(`Apex HQ self-serve readiness gate

Usage:
  npm run launch:self-serve-readiness
  npm run launch:self-serve-readiness -- --json
  npm run launch:self-serve-readiness -- --check-live --base-url=https://concrete-ops-demo.fly.dev --json
  npm run launch:self-serve-readiness -- --signup-verified --users-verified --roles-verified --backup-verified --restore-verified --build-verified --claims-verified --hosted-smoke-verified --support-owner="Owner name" --monitoring-destination="GitHub Issues" --manual-billing-boundary-acknowledged --json

Evidence flags:
  --signup-verified                       npm run verify:signup passed for this release candidate.
  --users-verified                        npm run verify:users passed for this release candidate.
  --roles-verified                        npm run verify:roles passed for this release candidate.
  --backup-verified                       npm run verify:backup passed for this release candidate.
  --restore-verified                      npm run verify:restore passed for this release candidate.
  --build-verified                        npm run build passed for this release candidate.
  --claims-verified                       npm run verify:claims passed for this release candidate.
  --hosted-smoke-verified                 Hosted smoke passed on the intended target.
  --support-owner=<name>                  Person responsible for first self-serve support triage.
  --monitoring-destination=<destination>  Alert destination for /api/ready and auth/bootstrap failures.
  --manual-billing-boundary-acknowledged  Confirms no checkout, invoices, payment collection, or self-serve plan changes are active.

Approval flags:
  --legal-review-acknowledged             Legal/privacy/public-claims review is complete.
  --production-safety-approved            Backup-first production safety approval is captured.
  --public-signup-enable-approved         Explicit approval exists to enable PUBLIC_SIGNUP_ENABLED on the target.

Live read-only options:
  --check-live                            Read /api/ready and /api/setup/status on the base URL.
  --base-url=<url>                        Target URL for read-only live checks. Default ${DEFAULT_BASE_URL}.

Boundary:
  This command does not deploy, change env vars, create users, create companies, create sessions, mutate data, send messages, enable billing, or touch Fly/Vercel/Supabase.
`);
}

function valueAfterEquals(arg) {
  return arg.slice(arg.indexOf("=") + 1).trim();
}

export function parseArgs(argv = []) {
  const options = {
    help: false,
    json: false,
    checkLive: false,
    baseUrl: DEFAULT_BASE_URL,
    evidence: {
      signupVerified: false,
      usersVerified: false,
      rolesVerified: false,
      backupVerified: false,
      restoreVerified: false,
      buildVerified: false,
      claimsVerified: false,
      hostedSmokeVerified: false,
      supportOwner: "",
      monitoringDestination: "",
      manualBillingBoundaryAcknowledged: false,
    },
    approvals: {
      legalReviewAcknowledged: false,
      productionSafetyApproved: false,
      publicSignupEnableApproved: false,
    },
  };

  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") options.help = true;
    if (arg === "--json") options.json = true;
    if (arg === "--check-live") options.checkLive = true;
    if (arg === "--signup-verified") options.evidence.signupVerified = true;
    if (arg === "--users-verified") options.evidence.usersVerified = true;
    if (arg === "--roles-verified") options.evidence.rolesVerified = true;
    if (arg === "--backup-verified") options.evidence.backupVerified = true;
    if (arg === "--restore-verified") options.evidence.restoreVerified = true;
    if (arg === "--build-verified") options.evidence.buildVerified = true;
    if (arg === "--claims-verified") options.evidence.claimsVerified = true;
    if (arg === "--hosted-smoke-verified") options.evidence.hostedSmokeVerified = true;
    if (arg === "--manual-billing-boundary-acknowledged") options.evidence.manualBillingBoundaryAcknowledged = true;
    if (arg === "--legal-review-acknowledged") options.approvals.legalReviewAcknowledged = true;
    if (arg === "--production-safety-approved") options.approvals.productionSafetyApproved = true;
    if (arg === "--public-signup-enable-approved") options.approvals.publicSignupEnableApproved = true;
    if (arg.startsWith("--base-url=")) options.baseUrl = valueAfterEquals(arg).replace(/\/+$/, "");
    if (arg.startsWith("--support-owner=")) options.evidence.supportOwner = valueAfterEquals(arg);
    if (arg.startsWith("--monitoring-destination=")) options.evidence.monitoringDestination = valueAfterEquals(arg);
  }

  return options;
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

function missing(condition, message) {
  return condition ? [] : [message];
}

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

async function requestJson(url) {
  const startedAt = Date.now();
  const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  const payload = await response.json().catch(() => ({}));
  return {
    ok: response.ok,
    status: response.status,
    durationMs: Date.now() - startedAt,
    payload,
  };
}

export async function runLiveSelfServeChecks({ baseUrl = DEFAULT_BASE_URL, checkLive = false } = {}) {
  if (!checkLive) {
    return {
      checked: false,
      baseUrl,
      ready: null,
      setupStatus: null,
      warnings: ["Live checks were skipped."],
    };
  }

  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
  const result = {
    checked: true,
    baseUrl: normalizedBaseUrl,
    ready: null,
    setupStatus: null,
    warnings: [],
  };

  try {
    result.ready = await requestJson(`${normalizedBaseUrl}/api/ready`);
  } catch (error) {
    result.ready = {
      ok: false,
      status: 0,
      durationMs: 0,
      payload: {},
      error: error.message,
    };
  }

  try {
    result.setupStatus = await requestJson(`${normalizedBaseUrl}/api/setup/status`);
  } catch (error) {
    result.setupStatus = {
      ok: false,
      status: 0,
      durationMs: 0,
      payload: {},
      error: error.message,
    };
  }

  if (result.setupStatus?.ok && result.setupStatus.payload?.demoMode) {
    result.warnings.push("Target is running in demo mode; do not treat it as a real self-serve production target.");
  }

  if (result.setupStatus?.ok && result.setupStatus.payload?.publicSignupEnabled) {
    result.warnings.push("Public signup is already enabled on the checked target.");
  }

  return result;
}

export function buildSelfServeReadinessReport({
  evidence = {},
  approvals = {},
  live = { checked: false, ready: null, setupStatus: null, warnings: [] },
  checkedAt = new Date().toISOString(),
} = {}) {
  const supportOwner = text(evidence.supportOwner);
  const monitoringDestination = text(evidence.monitoringDestination);
  const readyOk = !live.checked || Boolean(live.ready?.ok && live.ready?.payload?.status === "ready");
  const setupOk = !live.checked || Boolean(live.setupStatus?.ok);
  const setupStatus = live.setupStatus?.payload || {};
  const liveProductionUnsafe = Boolean(setupStatus.demoMode);

  const gates = [
    gate("Signup and workspace creation", Boolean(evidence.signupVerified), missing(evidence.signupVerified, "Run and pass npm.cmd run verify:signup.")),
    gate("Tenant, users, and role safety", Boolean(evidence.usersVerified && evidence.rolesVerified), [
      ...missing(evidence.usersVerified, "Run and pass npm.cmd run verify:users."),
      ...missing(evidence.rolesVerified, "Run and pass npm.cmd run verify:roles."),
    ]),
    gate("Backup and restore safety", Boolean(evidence.backupVerified && evidence.restoreVerified), [
      ...missing(evidence.backupVerified, "Run and pass npm.cmd run verify:backup."),
      ...missing(evidence.restoreVerified, "Run and pass npm.cmd run verify:restore."),
    ]),
    gate("Build and hosted smoke", Boolean(evidence.buildVerified && evidence.hostedSmokeVerified && readyOk && setupOk), [
      ...missing(evidence.buildVerified, "Run and pass npm.cmd run build."),
      ...missing(evidence.hostedSmokeVerified, "Run and pass hosted smoke on the intended target."),
      ...missing(readyOk, "The checked target /api/ready endpoint is not healthy."),
      ...missing(setupOk, "The checked target /api/setup/status endpoint is not readable."),
    ], live.warnings || []),
    gate("Support owner and alert path", Boolean(supportOwner && monitoringDestination), [
      ...missing(supportOwner, "Set a named first-response support owner."),
      ...missing(monitoringDestination, "Set a monitoring or alert destination for readiness/auth failures."),
    ]),
    gate("Claims, legal, and billing boundary", Boolean(evidence.claimsVerified && approvals.legalReviewAcknowledged && evidence.manualBillingBoundaryAcknowledged), [
      ...missing(evidence.claimsVerified, "Run and pass npm.cmd run verify:claims."),
      ...missing(approvals.legalReviewAcknowledged, "Complete legal/privacy/public-claims review before broad self-serve."),
      ...missing(evidence.manualBillingBoundaryAcknowledged, "Acknowledge manual billing/package boundary: no checkout, invoices, payments, or self-serve plan changes."),
    ]),
    gate("Production signup enablement approval", Boolean(approvals.productionSafetyApproved && approvals.publicSignupEnableApproved && !liveProductionUnsafe), [
      ...missing(approvals.productionSafetyApproved, "Capture backup-first production safety approval."),
      ...missing(approvals.publicSignupEnableApproved, "Capture explicit approval before enabling PUBLIC_SIGNUP_ENABLED."),
      ...missing(!liveProductionUnsafe, "Checked target is demo mode; do not enable real self-serve there."),
    ]),
  ];

  const gateByName = new Map(gates.map((item) => [item.name, item]));
  const controlledSelfServePilotReady = [
    "Signup and workspace creation",
    "Tenant, users, and role safety",
    "Backup and restore safety",
    "Build and hosted smoke",
    "Support owner and alert path",
  ].every((name) => gateByName.get(name)?.go);
  const publicSelfServeReady = gates.every((item) => item.go);
  const nextBlockedGate = gates.find((item) => !item.go) || null;

  return {
    ok: publicSelfServeReady,
    controlledSelfServePilotReady,
    publicSelfServeReady,
    checkedAt,
    live: {
      checked: Boolean(live.checked),
      baseUrl: live.baseUrl || "",
      readyOk: Boolean(live.ready?.ok),
      readyDurationMs: live.ready?.durationMs || 0,
      setupStatusOk: Boolean(live.setupStatus?.ok),
      publicSignupEnabled: Boolean(setupStatus.publicSignupEnabled),
      demoMode: Boolean(setupStatus.demoMode),
      needsSetup: Boolean(setupStatus.needsSetup),
    },
    gates,
    nextHighestLeverage: nextBlockedGate
      ? `${nextBlockedGate.name}: ${nextBlockedGate.blockers[0] || "clear remaining blockers"}`
      : "All self-serve gates are green; only then consider enabling production signup.",
    boundary: "read-only: no deploy, env var change, user/company/session creation, data mutation, billing, message sending, or production action",
  };
}

function printHumanReport(report) {
  console.log("Apex HQ self-serve readiness:");
  console.log(`- Controlled self-serve pilot: ${report.controlledSelfServePilotReady ? "GO" : "NO-GO"}`);
  console.log(`- Public self-serve launch: ${report.publicSelfServeReady ? "GO" : "NO-GO"}`);
  if (report.live.checked) {
    console.log(`- Live target: ${report.live.baseUrl}`);
    console.log(`- /api/ready: ${report.live.readyOk ? "PASS" : "FAIL"} (${report.live.readyDurationMs}ms)`);
    console.log(`- /api/setup/status: ${report.live.setupStatusOk ? "PASS" : "FAIL"}`);
    console.log(`- public signup enabled: ${report.live.publicSignupEnabled ? "yes" : "no"}`);
    console.log(`- demo mode: ${report.live.demoMode ? "yes" : "no"}`);
  }

  for (const item of report.gates) {
    console.log(`\n${item.name}: ${item.status}`);
    for (const blocker of item.blockers) {
      console.log(`- ${blocker}`);
    }
    for (const warning of item.warnings) {
      console.log(`- Warning: ${warning}`);
    }
  }

  console.log(`\nNext highest leverage: ${report.nextHighestLeverage}`);
  console.log(`Boundary: ${report.boundary}`);
}

export async function runSelfServeReadiness(options = {}) {
  const live = await runLiveSelfServeChecks({
    baseUrl: options.baseUrl || DEFAULT_BASE_URL,
    checkLive: options.checkLive,
  });
  return buildSelfServeReadinessReport({
    evidence: options.evidence || {},
    approvals: options.approvals || {},
    live,
  });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const report = await runSelfServeReadiness(options);
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
