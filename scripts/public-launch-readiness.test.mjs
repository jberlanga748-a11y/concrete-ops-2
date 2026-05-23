import assert from "node:assert/strict";
import test from "node:test";

import { buildPublicLaunchReadinessReport, parseArgs } from "./public-launch-readiness.mjs";

const READY_EVIDENCE = {
  pilotReadinessVerified: true,
  selfServeReadinessVerified: true,
  productionReleaseProcessVerified: true,
  backupVerified: true,
  restoreVerified: true,
  monitoringVerified: true,
  supportProcessVerified: true,
  billingBoundaryVerified: true,
  claimsVerified: true,
  rolesVerified: true,
  usersVerified: true,
  signupVerified: true,
  entitlementsVerified: true,
  buildVerified: true,
  noFieldRoleLeaksVerified: true,
  noCrossCompanyLeaksVerified: true,
  productionAuthSmokePassed: true,
};

test("public launch readiness fails closed without evidence", () => {
  const report = buildPublicLaunchReadinessReport({ checkedAt: "2026-05-23T00:00:00.000Z" });

  assert.equal(report.launchReadinessSystemReady, false);
  assert.equal(report.publicLaunchReady, false);
  assert.equal(report.ok, false);
  assert.ok(report.gates.find((gate) => gate.name === "Controlled pilot readiness").blockers.some((blocker) => /pilot/i.test(blocker)));
});

test("public launch readiness system can be green while public launch remains locked", () => {
  const report = buildPublicLaunchReadinessReport({
    checkedAt: "2026-05-23T00:00:00.000Z",
    evidence: {
      ...READY_EVIDENCE,
      productionAuthSmokePassed: false,
    },
  });

  assert.equal(report.launchReadinessSystemReady, true);
  assert.equal(report.publicLaunchReady, false);
  assert.equal(report.ok, false);
  assert.ok(report.gates.find((gate) => gate.name === "Guided pilot completion or launch waiver").blockers.some((blocker) => /GUIDED_PILOT_COMPLETION_RECORDED/i.test(blocker)));
  assert.ok(report.gates.find((gate) => gate.name === "Public launch approval").blockers.some((blocker) => /PUBLIC_LAUNCH_SEPARATELY_APPROVED/i.test(blocker)));
});

test("public launch readiness can record an explicit guided pilot waiver", () => {
  const report = buildPublicLaunchReadinessReport({
    evidence: READY_EVIDENCE,
    approvals: {
      guidedPilotWaiverPhrase: "GUIDED_PILOT_WAIVED_FOR_LAUNCH",
      legalReviewApprovalPhrase: "LEGAL_PRIVACY_TERMS_REVIEW_RECORDED",
      publicLaunchApprovalPhrase: "PUBLIC_LAUNCH_SEPARATELY_APPROVED",
    },
  });

  assert.equal(report.approvals.guidedPilotRecorded, false);
  assert.equal(report.approvals.guidedPilotWaived, true);
  assert.equal(report.publicLaunchReady, true);
  assert.deepEqual(report.gates.find((gate) => gate.name === "Guided pilot completion or launch waiver").blockers, []);
  assert.deepEqual(report.gates.find((gate) => gate.name === "Public launch approval").blockers, []);
  assert.ok(report.gates.find((gate) => gate.name === "Guided pilot completion or launch waiver").warnings.some((warning) => /waived/i.test(warning)));
});

test("public launch readiness requires legal review and production auth smoke", () => {
  const report = buildPublicLaunchReadinessReport({
    evidence: READY_EVIDENCE,
    approvals: {
      guidedPilotApprovalPhrase: "GUIDED_PILOT_COMPLETION_RECORDED",
      publicLaunchApprovalPhrase: "PUBLIC_LAUNCH_SEPARATELY_APPROVED",
    },
  });

  assert.equal(report.publicLaunchReady, false);
  assert.equal(report.approvals.guidedPilotRecorded, true);
  assert.equal(report.approvals.legalReviewRecorded, false);
  assert.ok(report.gates.find((gate) => gate.name === "Legal, privacy, terms, and public claims").blockers.some((blocker) => /LEGAL_PRIVACY_TERMS_REVIEW_RECORDED/i.test(blocker)));
});

test("public launch readiness only goes green with every human approval phrase", () => {
  const report = buildPublicLaunchReadinessReport({
    evidence: READY_EVIDENCE,
    approvals: {
      guidedPilotApprovalPhrase: "GUIDED_PILOT_COMPLETION_RECORDED",
      legalReviewApprovalPhrase: "LEGAL_PRIVACY_TERMS_REVIEW_RECORDED",
      publicLaunchApprovalPhrase: "PUBLIC_LAUNCH_SEPARATELY_APPROVED",
    },
  });

  assert.equal(report.launchReadinessSystemReady, true);
  assert.equal(report.publicLaunchReady, true);
  assert.equal(report.ok, true);
});

test("public launch readiness parser captures flags without mutation", () => {
  const options = parseArgs([
    "--json",
    "--pilot-readiness-verified",
    "--self-serve-readiness-verified",
    "--production-release-process-verified",
    "--backup-verified",
    "--restore-verified",
    "--monitoring-verified",
    "--support-process-verified",
    "--billing-boundary-verified",
    "--claims-verified",
    "--roles-verified",
    "--users-verified",
    "--signup-verified",
    "--entitlements-verified",
    "--build-verified",
    "--no-field-role-leaks-verified",
    "--no-cross-company-leaks-verified",
    "--production-auth-smoke-passed",
    "--guided-pilot-approval-phrase=GUIDED_PILOT_COMPLETION_RECORDED",
    "--guided-pilot-waiver-phrase=GUIDED_PILOT_WAIVED_FOR_LAUNCH",
  ]);

  assert.equal(options.json, true);
  assert.equal(options.evidence.pilotReadinessVerified, true);
  assert.equal(options.evidence.noCrossCompanyLeaksVerified, true);
  assert.equal(options.evidence.productionAuthSmokePassed, true);
  assert.equal(options.approvals.guidedPilotApprovalPhrase, "GUIDED_PILOT_COMPLETION_RECORDED");
  assert.equal(options.approvals.guidedPilotWaiverPhrase, "GUIDED_PILOT_WAIVED_FOR_LAUNCH");
});
