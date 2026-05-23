#!/usr/bin/env node

import process from "node:process";
import { pathToFileURL } from "node:url";

import {
  PACKAGE_IDS,
  SECURITY_FEATURES,
  packageReadinessSummary,
} from "../shared/packages.js";
import {
  SUPPORT_PILOT_FEEDBACK_WORKFLOW,
  getSupportWorkflowOptionsForUser,
} from "../src/support-utils.js";

const PAYMENT_APPROVAL_PHRASE = "PAYMENT_IMPLEMENTATION_SEPARATELY_APPROVED";
const OWNER_ADMIN_ROLES = ["Owner", "Administrator"];
const FIELD_ROLES = ["Foreman", "Employee"];

function printHelp() {
  console.log(`Apex HQ package and billing readiness gate

Usage:
  npm run launch:package-billing-readiness
  npm run launch:package-billing-readiness -- --json
  npm run launch:package-billing-readiness -- --packages-verified --entitlements-verified --roles-verified --support-handoff-verified --claims-verified --build-verified --manual-billing-boundary-acknowledged --upgrade-audit-trail-planned --payment-plan-documented --json

Future payment approval flag:
  --payment-approval-phrase=${PAYMENT_APPROVAL_PHRASE}

Boundary:
  This command is read-only. It does not add Stripe, checkout, payment collection, invoices, self-serve package changes, package mutation, billing emails, customer messages, secrets, deploys, or production data changes.
`);
}

function parseArgs(argv = []) {
  const options = {
    help: false,
    json: false,
    evidence: {
      packagesVerified: false,
      entitlementsVerified: false,
      rolesVerified: false,
      supportHandoffVerified: false,
      claimsVerified: false,
      buildVerified: false,
      manualBillingBoundaryAcknowledged: false,
      upgradeAuditTrailPlanned: false,
      paymentPlanDocumented: false,
    },
    approvals: {
      paymentApprovalPhrase: "",
    },
  };

  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg === "--json") options.json = true;
    else if (arg === "--packages-verified") options.evidence.packagesVerified = true;
    else if (arg === "--entitlements-verified") options.evidence.entitlementsVerified = true;
    else if (arg === "--roles-verified") options.evidence.rolesVerified = true;
    else if (arg === "--support-handoff-verified") options.evidence.supportHandoffVerified = true;
    else if (arg === "--claims-verified") options.evidence.claimsVerified = true;
    else if (arg === "--build-verified") options.evidence.buildVerified = true;
    else if (arg === "--manual-billing-boundary-acknowledged") options.evidence.manualBillingBoundaryAcknowledged = true;
    else if (arg === "--upgrade-audit-trail-planned") options.evidence.upgradeAuditTrailPlanned = true;
    else if (arg === "--payment-plan-documented") options.evidence.paymentPlanDocumented = true;
    else if (arg.startsWith("--payment-approval-phrase=")) options.approvals.paymentApprovalPhrase = valueAfterEquals(arg);
    else throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function valueAfterEquals(arg) {
  return arg.slice(arg.indexOf("=") + 1).trim();
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

function packageModelAudit() {
  const summaries = Object.values(PACKAGE_IDS).map((packageId) => packageReadinessSummary(packageId));
  const securityIncluded = summaries.every((summary) => (
    summary.securityFeatures.length === SECURITY_FEATURES.length
      && summary.securityFeatures.every((feature) => feature.security)
      && summary.includedFeatures.some((feature) => SECURITY_FEATURES.includes(feature.key))
  ));
  const manualOnly = summaries.every((summary) => (
    summary.billingMode === "manual"
      && /Stripe billing and self-serve plan changes are not enabled/i.test(summary.billingDescription)
  ));
  const upgradePath = summaries.find((summary) => summary.currentPackage.id === PACKAGE_IDS.BASIC)?.nextPackage?.id === PACKAGE_IDS.PREMIUM
    && summaries.find((summary) => summary.currentPackage.id === PACKAGE_IDS.PREMIUM)?.nextPackage?.id === PACKAGE_IDS.ELITE
    && summaries.find((summary) => summary.currentPackage.id === PACKAGE_IDS.ELITE)?.nextPackage === null;

  return {
    ok: securityIncluded && manualOnly && upgradePath,
    securityIncluded,
    manualOnly,
    upgradePath,
    summaries: summaries.map((summary) => ({
      packageId: summary.currentPackage.id,
      label: summary.currentPackage.label,
      billingMode: summary.billingMode,
      nextPackageId: summary.nextPackage?.id || "",
      includedFeatureCount: summary.includedFeatures.length,
      lockedFeatureCount: summary.lockedFutureFeatures.length,
    })),
  };
}

function supportVisibilityAudit() {
  const ownerAdminCanRequest = OWNER_ADMIN_ROLES.every((role) => {
    const options = getSupportWorkflowOptionsForUser({ role });
    return options.includes("Upgrade / package review") && options.includes(SUPPORT_PILOT_FEEDBACK_WORKFLOW);
  });
  const fieldBlocked = FIELD_ROLES.every((role) => {
    const options = getSupportWorkflowOptionsForUser({ role });
    return !options.includes("Upgrade / package review") && !options.includes(SUPPORT_PILOT_FEEDBACK_WORKFLOW);
  });

  return {
    ok: ownerAdminCanRequest && fieldBlocked,
    ownerAdminCanRequest,
    fieldBlocked,
  };
}

export function buildPackageBillingReadinessReport({
  evidence = {},
  approvals = {},
  checkedAt = new Date().toISOString(),
} = {}) {
  const packageAudit = packageModelAudit();
  const supportAudit = supportVisibilityAudit();
  const paymentApproved = approvals.paymentApprovalPhrase === PAYMENT_APPROVAL_PHRASE;

  const gates = [
    gate("Package definitions and manual upgrade path", Boolean(evidence.packagesVerified && packageAudit.ok), [
      ...missing(evidence.packagesVerified, "Run and pass npm.cmd run verify:packages."),
      ...missing(packageAudit.securityIncluded, "Security/auth/company/role/demo/health features must remain included for every package."),
      ...missing(packageAudit.manualOnly, "Package readiness summaries must remain manual billing only."),
      ...missing(packageAudit.upgradePath, "Basic -> Premium -> Elite upgrade path must remain stable."),
    ]),
    gate("Entitlement enforcement", Boolean(evidence.entitlementsVerified), [
      ...missing(evidence.entitlementsVerified, "Run and pass npm.cmd run verify:entitlements."),
    ]),
    gate("Role-safe support handoff", Boolean(evidence.rolesVerified && evidence.supportHandoffVerified && supportAudit.ok), [
      ...missing(evidence.rolesVerified, "Run and pass npm.cmd run verify:roles."),
      ...missing(evidence.supportHandoffVerified, "Run support handoff tests proving copy-only upgrade context."),
      ...missing(supportAudit.ownerAdminCanRequest, "Owner/admin users must be able to request manual upgrade review."),
      ...missing(supportAudit.fieldBlocked, "Foreman/employee users must not see package upgrade review controls."),
    ]),
    gate("Manual billing boundary", Boolean(evidence.claimsVerified && evidence.manualBillingBoundaryAcknowledged), [
      ...missing(evidence.claimsVerified, "Run and pass npm.cmd run verify:claims."),
      ...missing(evidence.manualBillingBoundaryAcknowledged, "Acknowledge no Stripe, checkout, invoices, payment collection, or self-serve plan changes are active."),
    ]),
    gate("Future payment implementation plan", Boolean(evidence.upgradeAuditTrailPlanned && evidence.paymentPlanDocumented), [
      ...missing(evidence.upgradeAuditTrailPlanned, "Document that future package changes require server-side owner/operator approval and audit trail."),
      ...missing(evidence.paymentPlanDocumented, "Document Stripe/provider/legal/tax/accounting review as a separate future implementation phase."),
    ], [
      "Payment implementation remains a future approved phase; this gate does not authorize Stripe, checkout, invoices, or payment collection.",
    ]),
    gate("Build verification", Boolean(evidence.buildVerified), [
      ...missing(evidence.buildVerified, "Run and pass npm.cmd run build."),
    ]),
    gate("Payment automation approval", paymentApproved, [
      `Do not add payment automation until the exact ${PAYMENT_APPROVAL_PHRASE} phrase is recorded in a separate approved task.`,
    ]),
  ];

  const gateByName = new Map(gates.map((item) => [item.name, item]));
  const manualPackageModelReady = [
    "Package definitions and manual upgrade path",
    "Entitlement enforcement",
    "Role-safe support handoff",
    "Manual billing boundary",
    "Future payment implementation plan",
    "Build verification",
  ].every((name) => gateByName.get(name)?.go);
  const paymentImplementationReady = gates.every((item) => item.go);
  const nextBlockedGate = gates.find((item) => !item.go) || null;

  return {
    ok: paymentImplementationReady,
    manualPackageModelReady,
    paymentImplementationReady,
    checkedAt,
    packageAudit,
    supportAudit,
    gates,
    nextHighestLeverage: nextBlockedGate
      ? `${nextBlockedGate.name}: ${nextBlockedGate.blockers[0] || "clear remaining blockers"}`
      : "All package and payment gates are green; payment work still needs a separately scoped implementation.",
    boundary: "read-only: no Stripe, checkout, invoices, payment collection, self-serve plan changes, package mutation, secrets, deploy, or production data change",
  };
}

function printHumanReport(report) {
  console.log("Apex HQ package and billing readiness:");
  console.log(`- Manual package model ready: ${report.manualPackageModelReady ? "GO" : "NO-GO"}`);
  console.log(`- Payment implementation ready: ${report.paymentImplementationReady ? "GO" : "NO-GO"}`);

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

  const report = buildPackageBillingReadinessReport(options);
  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printHumanReport(report);
  }

  if (!report.manualPackageModelReady && !options.json) {
    process.exitCode = 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

export { parseArgs };
