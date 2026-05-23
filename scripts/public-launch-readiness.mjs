#!/usr/bin/env node

import process from "node:process";
import { pathToFileURL } from "node:url";

const GUIDED_PILOT_APPROVAL_PHRASE = "GUIDED_PILOT_COMPLETION_RECORDED";
const GUIDED_PILOT_WAIVER_PHRASE = "GUIDED_PILOT_WAIVED_FOR_LAUNCH";
const LEGAL_REVIEW_APPROVAL_PHRASE = "LEGAL_PRIVACY_TERMS_REVIEW_RECORDED";
const PUBLIC_LAUNCH_APPROVAL_PHRASE = "PUBLIC_LAUNCH_SEPARATELY_APPROVED";

function printHelp() {
  console.log(`Apex HQ public launch readiness gate

Usage:
  npm run launch:public-readiness
  npm run launch:public-readiness -- --json
  npm run launch:public-readiness -- --pilot-readiness-verified --self-serve-readiness-verified --production-release-process-verified --backup-verified --restore-verified --monitoring-verified --support-process-verified --billing-boundary-verified --claims-verified --roles-verified --users-verified --signup-verified --entitlements-verified --build-verified --no-field-role-leaks-verified --no-cross-company-leaks-verified --json

Human approval / live-production flags:
  --guided-pilot-approval-phrase=${GUIDED_PILOT_APPROVAL_PHRASE}
  --guided-pilot-waiver-phrase=${GUIDED_PILOT_WAIVER_PHRASE}
  --legal-review-approval-phrase=${LEGAL_REVIEW_APPROVAL_PHRASE}
  --production-auth-smoke-passed
  --public-launch-approval-phrase=${PUBLIC_LAUNCH_APPROVAL_PHRASE}

Boundary:
  This command is read-only. It does not deploy, enable public signup, change secrets, create users, create companies, send customer messages, change billing, mutate data, touch Fly/Vercel/Supabase, or approve public launch by itself.
`);
}

function valueAfterEquals(arg) {
  return arg.slice(arg.indexOf("=") + 1).trim();
}

export function parseArgs(argv = []) {
  const options = {
    help: false,
    json: false,
    evidence: {
      pilotReadinessVerified: false,
      selfServeReadinessVerified: false,
      productionReleaseProcessVerified: false,
      backupVerified: false,
      restoreVerified: false,
      monitoringVerified: false,
      supportProcessVerified: false,
      billingBoundaryVerified: false,
      claimsVerified: false,
      rolesVerified: false,
      usersVerified: false,
      signupVerified: false,
      entitlementsVerified: false,
      buildVerified: false,
      noFieldRoleLeaksVerified: false,
      noCrossCompanyLeaksVerified: false,
      productionAuthSmokePassed: false,
    },
    approvals: {
      guidedPilotApprovalPhrase: "",
      guidedPilotWaiverPhrase: "",
      legalReviewApprovalPhrase: "",
      publicLaunchApprovalPhrase: "",
    },
  };

  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg === "--json") options.json = true;
    else if (arg === "--pilot-readiness-verified") options.evidence.pilotReadinessVerified = true;
    else if (arg === "--self-serve-readiness-verified") options.evidence.selfServeReadinessVerified = true;
    else if (arg === "--production-release-process-verified") options.evidence.productionReleaseProcessVerified = true;
    else if (arg === "--backup-verified") options.evidence.backupVerified = true;
    else if (arg === "--restore-verified") options.evidence.restoreVerified = true;
    else if (arg === "--monitoring-verified") options.evidence.monitoringVerified = true;
    else if (arg === "--support-process-verified") options.evidence.supportProcessVerified = true;
    else if (arg === "--billing-boundary-verified") options.evidence.billingBoundaryVerified = true;
    else if (arg === "--claims-verified") options.evidence.claimsVerified = true;
    else if (arg === "--roles-verified") options.evidence.rolesVerified = true;
    else if (arg === "--users-verified") options.evidence.usersVerified = true;
    else if (arg === "--signup-verified") options.evidence.signupVerified = true;
    else if (arg === "--entitlements-verified") options.evidence.entitlementsVerified = true;
    else if (arg === "--build-verified") options.evidence.buildVerified = true;
    else if (arg === "--no-field-role-leaks-verified") options.evidence.noFieldRoleLeaksVerified = true;
    else if (arg === "--no-cross-company-leaks-verified") options.evidence.noCrossCompanyLeaksVerified = true;
    else if (arg === "--production-auth-smoke-passed") options.evidence.productionAuthSmokePassed = true;
    else if (arg.startsWith("--guided-pilot-approval-phrase=")) options.approvals.guidedPilotApprovalPhrase = valueAfterEquals(arg);
    else if (arg.startsWith("--guided-pilot-waiver-phrase=")) options.approvals.guidedPilotWaiverPhrase = valueAfterEquals(arg);
    else if (arg.startsWith("--legal-review-approval-phrase=")) options.approvals.legalReviewApprovalPhrase = valueAfterEquals(arg);
    else if (arg.startsWith("--public-launch-approval-phrase=")) options.approvals.publicLaunchApprovalPhrase = valueAfterEquals(arg);
    else throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function missing(condition, message) {
  return condition ? [] : [message];
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

export function buildPublicLaunchReadinessReport({
  evidence = {},
  approvals = {},
  checkedAt = new Date().toISOString(),
} = {}) {
  const guidedPilotRecorded = approvals.guidedPilotApprovalPhrase === GUIDED_PILOT_APPROVAL_PHRASE;
  const guidedPilotWaived = approvals.guidedPilotWaiverPhrase === GUIDED_PILOT_WAIVER_PHRASE;
  const legalReviewRecorded = approvals.legalReviewApprovalPhrase === LEGAL_REVIEW_APPROVAL_PHRASE;
  const publicLaunchApproved = approvals.publicLaunchApprovalPhrase === PUBLIC_LAUNCH_APPROVAL_PHRASE;

  const gates = [
    gate("Controlled pilot readiness", Boolean(evidence.pilotReadinessVerified && evidence.supportProcessVerified), [
      ...missing(evidence.pilotReadinessVerified, "Run and pass npm.cmd run verify:pilot-readiness or the approved Sunday pilot readiness bundle."),
      ...missing(evidence.supportProcessVerified, "Confirm the support intake process, owner, severity rules, and escalation path are ready."),
    ]),
    gate("Legal, privacy, terms, and public claims", Boolean(evidence.claimsVerified && legalReviewRecorded), [
      ...missing(evidence.claimsVerified, "Run and pass npm.cmd run verify:claims."),
      ...missing(legalReviewRecorded, `Record ${LEGAL_REVIEW_APPROVAL_PHRASE} after legal/privacy/terms review.`),
    ]),
    gate("Production auth and release safety", Boolean(
      evidence.productionReleaseProcessVerified
        && evidence.productionAuthSmokePassed
        && evidence.backupVerified
        && evidence.restoreVerified
        && evidence.monitoringVerified,
    ), [
      ...missing(evidence.productionReleaseProcessVerified, "Run and pass the production release gate process check."),
      ...missing(evidence.productionAuthSmokePassed, "Run and pass approved production auth smoke on the real production target."),
      ...missing(evidence.backupVerified, "Run and pass npm.cmd run verify:backup."),
      ...missing(evidence.restoreVerified, "Run and pass npm.cmd run verify:restore."),
      ...missing(evidence.monitoringVerified, "Run and pass npm.cmd run verify:monitoring."),
    ]),
    gate("Self-serve launch smoke", Boolean(evidence.selfServeReadinessVerified && evidence.signupVerified && evidence.usersVerified && evidence.buildVerified), [
      ...missing(evidence.selfServeReadinessVerified, "Run and pass npm.cmd run verify:self-serve-readiness plus the approved self-serve launch gate."),
      ...missing(evidence.signupVerified, "Run and pass npm.cmd run verify:signup."),
      ...missing(evidence.usersVerified, "Run and pass npm.cmd run verify:users."),
      ...missing(evidence.buildVerified, "Run and pass npm.cmd run build."),
    ]),
    gate("Billing/payment boundary", Boolean(evidence.billingBoundaryVerified), [
      ...missing(evidence.billingBoundaryVerified, "Run and pass package/billing readiness and confirm no checkout, invoices, payment collection, or self-serve plan changes are live."),
    ], [
      "Payment collection remains a separate approved phase and is not required for manual first launch.",
    ]),
    gate("Role, entitlement, and company isolation", Boolean(
      evidence.rolesVerified
        && evidence.entitlementsVerified
        && evidence.noFieldRoleLeaksVerified
        && evidence.noCrossCompanyLeaksVerified,
    ), [
      ...missing(evidence.rolesVerified, "Run and pass npm.cmd run verify:roles."),
      ...missing(evidence.entitlementsVerified, "Run and pass npm.cmd run verify:entitlements."),
      ...missing(evidence.noFieldRoleLeaksVerified, "Verify field users cannot access office, pricing, margin, package, portal, or AI command surfaces."),
      ...missing(evidence.noCrossCompanyLeaksVerified, "Verify company/user scope tests pass with no known cross-company leaks."),
    ]),
    gate("Guided pilot completion or launch waiver", Boolean(guidedPilotRecorded || guidedPilotWaived), [
      ...missing(
        guidedPilotRecorded || guidedPilotWaived,
        `Do not claim guided pilot complete until ${GUIDED_PILOT_APPROVAL_PHRASE} is recorded after the real pilot walkthrough, or explicitly waive it with ${GUIDED_PILOT_WAIVER_PHRASE}.`,
      ),
    ], [
      ...(guidedPilotWaived && !guidedPilotRecorded ? ["Guided pilot was waived, not completed; keep first launch supervised and reversible."] : []),
    ]),
    gate("Public launch approval", publicLaunchApproved, [
      ...missing(publicLaunchApproved, `Do not enable broad public launch until ${PUBLIC_LAUNCH_APPROVAL_PHRASE} is recorded in a separate approved task.`),
    ]),
  ];

  const gateByName = new Map(gates.map((item) => [item.name, item]));
  const launchReadinessSystemReady = [
    "Controlled pilot readiness",
    "Self-serve launch smoke",
    "Billing/payment boundary",
    "Role, entitlement, and company isolation",
  ].every((name) => gateByName.get(name)?.go);
  const publicLaunchReady = gates.every((item) => item.go);
  const nextBlockedGate = gates.find((item) => !item.go) || null;

  return {
    ok: publicLaunchReady,
    launchReadinessSystemReady,
    publicLaunchReady,
    checkedAt,
    approvals: {
      guidedPilotRecorded,
      guidedPilotWaived,
      legalReviewRecorded,
      publicLaunchApproved,
    },
    gates,
    nextHighestLeverage: nextBlockedGate
      ? `${nextBlockedGate.name}: ${nextBlockedGate.blockers[0] || "clear remaining blockers"}`
      : "All public launch gates are green; execute only through the approved release checklist.",
    boundary: "read-only: no deploy, public signup enablement, secret change, user/company creation, production smoke execution, customer send, billing activation, or production data mutation",
  };
}

function printHumanReport(report) {
  console.log("Apex HQ public launch readiness:");
  console.log(`- Launch readiness system: ${report.launchReadinessSystemReady ? "GO" : "NO-GO"}`);
  console.log(`- Public launch: ${report.publicLaunchReady ? "GO" : "NO-GO"}`);

  for (const item of report.gates) {
    console.log(`- ${item.name}: ${item.status}`);
    for (const blocker of item.blockers) console.log(`  - ${blocker}`);
    for (const warning of item.warnings) console.log(`  - warning: ${warning}`);
  }

  console.log(`\nNext highest leverage: ${report.nextHighestLeverage}`);
  console.log(`Boundary: ${report.boundary}`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const report = buildPublicLaunchReadinessReport(options);
  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printHumanReport(report);
  }

  if (!report.launchReadinessSystemReady && !options.json) {
    process.exitCode = 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
