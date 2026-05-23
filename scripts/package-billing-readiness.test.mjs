import assert from "node:assert/strict";
import test from "node:test";

import { buildPackageBillingReadinessReport, parseArgs } from "./package-billing-readiness.mjs";

test("package billing readiness fails closed without evidence", () => {
  const report = buildPackageBillingReadinessReport({
    checkedAt: "2026-05-23T00:00:00.000Z",
  });

  assert.equal(report.manualPackageModelReady, false);
  assert.equal(report.paymentImplementationReady, false);
  assert.equal(report.ok, false);
  assert.ok(report.gates.find((gate) => gate.name === "Package definitions and manual upgrade path").blockers.some((blocker) => /verify:packages/i.test(blocker)));
});

test("manual package model can be ready while payment implementation remains locked", () => {
  const report = buildPackageBillingReadinessReport({
    checkedAt: "2026-05-23T00:00:00.000Z",
    evidence: {
      packagesVerified: true,
      entitlementsVerified: true,
      rolesVerified: true,
      supportHandoffVerified: true,
      claimsVerified: true,
      buildVerified: true,
      manualBillingBoundaryAcknowledged: true,
      upgradeAuditTrailPlanned: true,
      paymentPlanDocumented: true,
    },
  });

  assert.equal(report.manualPackageModelReady, true);
  assert.equal(report.paymentImplementationReady, false);
  assert.equal(report.ok, false);
  assert.equal(report.packageAudit.securityIncluded, true);
  assert.equal(report.packageAudit.manualOnly, true);
  assert.equal(report.packageAudit.upgradePath, true);
  assert.equal(report.supportAudit.ownerAdminCanRequest, true);
  assert.equal(report.supportAudit.fieldBlocked, true);
  assert.ok(report.gates.find((gate) => gate.name === "Payment automation approval").blockers.some((blocker) => /Do not add payment automation/i.test(blocker)));
});

test("payment implementation stays locked until exact separate approval phrase", () => {
  const base = {
    evidence: {
      packagesVerified: true,
      entitlementsVerified: true,
      rolesVerified: true,
      supportHandoffVerified: true,
      claimsVerified: true,
      buildVerified: true,
      manualBillingBoundaryAcknowledged: true,
      upgradeAuditTrailPlanned: true,
      paymentPlanDocumented: true,
    },
  };
  const denied = buildPackageBillingReadinessReport({
    ...base,
    approvals: { paymentApprovalPhrase: "APPROVED" },
  });
  const approved = buildPackageBillingReadinessReport({
    ...base,
    approvals: { paymentApprovalPhrase: "PAYMENT_IMPLEMENTATION_SEPARATELY_APPROVED" },
  });

  assert.equal(denied.paymentImplementationReady, false);
  assert.equal(approved.paymentImplementationReady, true);
  assert.equal(approved.ok, true);
});

test("package billing readiness parser captures evidence without mutating anything", () => {
  const options = parseArgs([
    "--json",
    "--packages-verified",
    "--entitlements-verified",
    "--roles-verified",
    "--support-handoff-verified",
    "--claims-verified",
    "--build-verified",
    "--manual-billing-boundary-acknowledged",
    "--upgrade-audit-trail-planned",
    "--payment-plan-documented",
  ]);

  assert.equal(options.json, true);
  assert.equal(options.evidence.packagesVerified, true);
  assert.equal(options.evidence.entitlementsVerified, true);
  assert.equal(options.evidence.supportHandoffVerified, true);
  assert.equal(options.evidence.manualBillingBoundaryAcknowledged, true);
  assert.equal(options.approvals.paymentApprovalPhrase, "");
});
