import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCustomerPortalCommunicationReadinessReport,
  parseArgs,
} from "./customer-portal-communication-readiness.mjs";

test("customer portal communication readiness fails closed without evidence", () => {
  const report = buildCustomerPortalCommunicationReadinessReport({
    checkedAt: "2026-05-23T00:00:00.000Z",
  });

  assert.equal(report.internalCustomerPreviewReady, false);
  assert.equal(report.externalCustomerPortalReady, false);
  assert.equal(report.ok, false);
  assert.ok(report.gates.find((gate) => gate.name === "Manual customer portal preview").blockers.some((blocker) => /customer portal preview tests/i.test(blocker)));
});

test("internal customer preview can be ready while external portal remains locked", () => {
  const report = buildCustomerPortalCommunicationReadinessReport({
    checkedAt: "2026-05-23T00:00:00.000Z",
    evidence: {
      portalPreviewVerified: true,
      printPacketsVerified: true,
      estimateOutputVerified: true,
      rolesVerified: true,
      entitlementsVerified: true,
      agentPolicyVerified: true,
      claimsVerified: true,
      buildVerified: true,
      tokenizedPortalPlanDocumented: true,
      accessRecordLifecycleVerified: true,
      publicRouteContractVerified: true,
      accessRecordPacketVerified: true,
      messageReviewPlanDocumented: true,
      approvalAuditPlanDocumented: true,
    },
  });

  assert.equal(report.internalCustomerPreviewReady, true);
  assert.equal(report.externalCustomerPortalReady, false);
  assert.equal(report.ok, false);
  assert.equal(report.portalAudit.hasApprovedProposal, true);
  assert.equal(report.portalAudit.excludesInternalData, true);
  assert.equal(report.portalAudit.tokenizedAccessContract, true);
  assert.equal(report.portalAudit.accessPlanExternalLocked, true);
  assert.equal(report.portalAudit.accessPlanExpirationReady, true);
  assert.equal(report.portalAudit.accessPlanRevocationReady, true);
  assert.equal(report.portalAudit.accessPlanAuditReady, true);
  assert.equal(report.rolePackageAudit.eliteOnly, true);
  assert.equal(report.rolePackageAudit.blockedRoles, true);
  assert.equal(report.communicationAudit.customerMessageBlocked, true);
  assert.equal(report.communicationAudit.bidSubmissionBlocked, true);
  assert.ok(report.gates.find((gate) => gate.name === "External customer portal approval").blockers.some((blocker) => /Do not create customer logins/i.test(blocker)));
});

test("external customer portal and sends require exact separate approval phrases", () => {
  const base = {
    evidence: {
      portalPreviewVerified: true,
      printPacketsVerified: true,
      estimateOutputVerified: true,
      rolesVerified: true,
      entitlementsVerified: true,
      agentPolicyVerified: true,
      claimsVerified: true,
      buildVerified: true,
      tokenizedPortalPlanDocumented: true,
      accessRecordLifecycleVerified: true,
      publicRouteContractVerified: true,
      accessRecordPacketVerified: true,
      messageReviewPlanDocumented: true,
      approvalAuditPlanDocumented: true,
    },
  };
  const denied = buildCustomerPortalCommunicationReadinessReport({
    ...base,
    approvals: {
      externalPortalApprovalPhrase: "APPROVED",
      customerSendApprovalPhrase: "APPROVED",
    },
  });
  const approved = buildCustomerPortalCommunicationReadinessReport({
    ...base,
    approvals: {
      externalPortalApprovalPhrase: "TOKENIZED_CUSTOMER_PORTAL_SEPARATELY_APPROVED",
      customerSendApprovalPhrase: "CUSTOMER_SEND_WORKFLOW_SEPARATELY_APPROVED",
    },
  });

  assert.equal(denied.externalCustomerPortalReady, false);
  assert.equal(approved.externalCustomerPortalReady, true);
  assert.equal(approved.ok, true);
});

test("customer portal readiness parser captures evidence without mutating anything", () => {
  const options = parseArgs([
    "--json",
    "--portal-preview-verified",
    "--print-packets-verified",
    "--estimate-output-verified",
    "--roles-verified",
    "--entitlements-verified",
    "--agent-policy-verified",
    "--claims-verified",
    "--build-verified",
    "--tokenized-portal-plan-documented",
    "--access-record-lifecycle-verified",
    "--public-route-contract-verified",
    "--access-record-packet-verified",
    "--message-review-plan-documented",
    "--approval-audit-plan-documented",
  ]);

  assert.equal(options.json, true);
  assert.equal(options.evidence.portalPreviewVerified, true);
  assert.equal(options.evidence.printPacketsVerified, true);
  assert.equal(options.evidence.agentPolicyVerified, true);
  assert.equal(options.evidence.accessRecordLifecycleVerified, true);
  assert.equal(options.evidence.publicRouteContractVerified, true);
  assert.equal(options.evidence.accessRecordPacketVerified, true);
  assert.equal(options.evidence.approvalAuditPlanDocumented, true);
  assert.equal(options.approvals.externalPortalApprovalPhrase, "");
});
