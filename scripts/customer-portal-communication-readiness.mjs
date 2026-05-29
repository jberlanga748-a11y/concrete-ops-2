#!/usr/bin/env node

import process from "node:process";
import { pathToFileURL } from "node:url";

import { resolvePackageEntitlements } from "../shared/packageEntitlements.js";
import { PACKAGE_IDS, packageIncludesFeature } from "../shared/packages.js";
import { evaluateAgentActionPermission } from "../shared/agentActionPolicy.js";
import { canPreviewCustomerPortal } from "../shared/permissions.js";
import {
  buildCustomerPortalTokenizedAccessApprovalPacket,
  buildCustomerPortalPreviewPacket,
  deriveCustomerPortalTokenizedAccessPlan,
  deriveCustomerPortalPreviewState,
} from "../src/customer-portal-preview-utils.js";

const EXTERNAL_PORTAL_APPROVAL_PHRASE = "TOKENIZED_CUSTOMER_PORTAL_SEPARATELY_APPROVED";
const CUSTOMER_SEND_APPROVAL_PHRASE = "CUSTOMER_SEND_WORKFLOW_SEPARATELY_APPROVED";
const OWNER_ADMIN_ROLES = ["Owner", "Administrator"];
const BLOCKED_ROLES = ["Operations Manager", "Estimator", "Foreman", "Employee"];

function printHelp() {
  console.log(`Apex HQ customer portal and communication readiness gate

Usage:
  npm run launch:customer-portal-readiness
  npm run launch:customer-portal-readiness -- --json
  npm run launch:customer-portal-readiness -- --portal-preview-verified --print-packets-verified --estimate-output-verified --roles-verified --entitlements-verified --agent-policy-verified --claims-verified --build-verified --tokenized-portal-plan-documented --access-record-lifecycle-verified --public-route-contract-verified --access-record-packet-verified --share-approval-queue-verified --share-approval-review-verified --external-gate-preflight-verified --external-execution-contract-verified --message-review-plan-documented --approval-audit-plan-documented --json

Future approval flags:
  --external-portal-approval-phrase=${EXTERNAL_PORTAL_APPROVAL_PHRASE}
  --customer-send-approval-phrase=${CUSTOMER_SEND_APPROVAL_PHRASE}

Boundary:
  This command is read-only. It does not create customer logins, public links, portal tokens, approvals, emails, SMS, bid submissions, customer messages, package changes, invoices, payments, secrets, deploys, or production data changes.
`);
}

function parseArgs(argv = []) {
  const options = {
    help: false,
    json: false,
    evidence: {
      portalPreviewVerified: false,
      printPacketsVerified: false,
      estimateOutputVerified: false,
      rolesVerified: false,
      entitlementsVerified: false,
      agentPolicyVerified: false,
      claimsVerified: false,
      buildVerified: false,
      tokenizedPortalPlanDocumented: false,
      accessRecordLifecycleVerified: false,
      publicRouteContractVerified: false,
      accessRecordPacketVerified: false,
      shareApprovalQueueVerified: false,
      shareApprovalReviewVerified: false,
      externalGatePreflightVerified: false,
      externalExecutionContractVerified: false,
      messageReviewPlanDocumented: false,
      approvalAuditPlanDocumented: false,
    },
    approvals: {
      externalPortalApprovalPhrase: "",
      customerSendApprovalPhrase: "",
    },
  };

  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg === "--json") options.json = true;
    else if (arg === "--portal-preview-verified") options.evidence.portalPreviewVerified = true;
    else if (arg === "--print-packets-verified") options.evidence.printPacketsVerified = true;
    else if (arg === "--estimate-output-verified") options.evidence.estimateOutputVerified = true;
    else if (arg === "--roles-verified") options.evidence.rolesVerified = true;
    else if (arg === "--entitlements-verified") options.evidence.entitlementsVerified = true;
    else if (arg === "--agent-policy-verified") options.evidence.agentPolicyVerified = true;
    else if (arg === "--claims-verified") options.evidence.claimsVerified = true;
    else if (arg === "--build-verified") options.evidence.buildVerified = true;
    else if (arg === "--tokenized-portal-plan-documented") options.evidence.tokenizedPortalPlanDocumented = true;
    else if (arg === "--access-record-lifecycle-verified") options.evidence.accessRecordLifecycleVerified = true;
    else if (arg === "--public-route-contract-verified") options.evidence.publicRouteContractVerified = true;
    else if (arg === "--access-record-packet-verified") options.evidence.accessRecordPacketVerified = true;
    else if (arg === "--share-approval-queue-verified") options.evidence.shareApprovalQueueVerified = true;
    else if (arg === "--share-approval-review-verified") options.evidence.shareApprovalReviewVerified = true;
    else if (arg === "--external-gate-preflight-verified") options.evidence.externalGatePreflightVerified = true;
    else if (arg === "--external-execution-contract-verified") options.evidence.externalExecutionContractVerified = true;
    else if (arg === "--message-review-plan-documented") options.evidence.messageReviewPlanDocumented = true;
    else if (arg === "--approval-audit-plan-documented") options.evidence.approvalAuditPlanDocumented = true;
    else if (arg.startsWith("--external-portal-approval-phrase=")) options.approvals.externalPortalApprovalPhrase = valueAfterEquals(arg);
    else if (arg.startsWith("--customer-send-approval-phrase=")) options.approvals.customerSendApprovalPhrase = valueAfterEquals(arg);
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

function buildPreviewFixture() {
  const state = deriveCustomerPortalPreviewState({
    companySettings: {
      companyName: "Apex Demo Concrete",
      businessEmail: "office@example.test",
    },
    estimates: [
      {
        id: "EST-DRAFT",
        customerId: "C1",
        customer: { name: "ABC Builders" },
        status: "draft",
        title: "Internal draft",
        internalNotes: "Do not leak margin.",
      },
      {
        id: "EST-APPROVED",
        customerId: "C1",
        customer: { name: "ABC Builders" },
        status: "approved",
        title: "Shop slab proposal",
        scopeSummary: "Install 40x60 broom finish slab.",
        exclusions: "Permits and utility relocation excluded.",
        grandTotal: 28500,
        internalNotes: "Margin is 31%.",
        aiNotes: "Assistant reasoning.",
      },
    ],
    jobs: [
      {
        id: "JOB-1",
        customerId: "C1",
        customer: "ABC Builders",
        title: "Shop slab",
        status: "in_progress",
        scheduledStart: "2026-05-20",
        nextStep: "Pour scheduled after form inspection.",
      },
    ],
    uploads: [
      { id: "UP-1", jobId: "JOB-1", caption: "Forms staged", fileName: "forms.jpg", uploadedAt: "2026-05-17" },
    ],
    dailyReports: [
      { id: "DR-1", jobId: "JOB-1", status: "submitted" },
    ],
    changeOrderRequests: [
      { id: "CO-1", jobId: "JOB-1", status: "approved" },
    ],
  });
  const packet = buildCustomerPortalPreviewPacket({
    state,
    user: { name: "Owner Ops", role: "Owner", token: "secret-session-token" },
    generatedAt: "2026-05-23T00:00:00.000Z",
  });

  return { state, packet };
}

function customerPortalSafetyAudit() {
  const { state, packet } = buildPreviewFixture();
  const accessPlan = deriveCustomerPortalTokenizedAccessPlan({
    state,
    companyId: "COMPANY-DEMO",
    actor: { role: "Owner", token: "secret-session-token" },
    issuedAt: "2026-05-23T00:00:00.000Z",
    expiresAt: "2026-05-30T00:00:00.000Z",
    approvalId: "AUDIT-CUSTOMER-PORTAL-PLAN",
  });
  const accessPacket = buildCustomerPortalTokenizedAccessApprovalPacket({
    accessPlan,
    generatedAt: "2026-05-23T00:05:00.000Z",
  });
  const boundariesText = (state.boundaries || []).join(" ");
  const hasApprovedProposal = state.readiness.find((item) => item.id === "proposal")?.ready === true;
  const hasProofAndProgress = state.preview.proofPhotoCount > 0 && state.preview.progressUpdateCount > 0;
  const hasChangeOrderContext = state.preview.reviewedChangeOrderCount > 0;
  const blocksExternalPortal = /No customer login, public share link, self-serve approval/i.test(boundariesText);
  const excludesInternalData = ![
    "Margin is 31%",
    "Assistant reasoning",
    "secret-session-token",
    "Internal draft",
    "Do not leak margin",
  ].some((term) => packet.includes(term));
  const copyOnly = /does not send, publish, approve, or create a customer portal|No customer login, public share link/i.test(`${packet} ${boundariesText}`);
  const tokenizedAccessContract = accessPlan.implementationReady
    && accessPlan.canCreateExternalAccess === false
    && accessPlan.tokenMaterialCreated === false
    && accessPlan.expiration.ready
    && accessPlan.revocation.ready
    && accessPlan.audit.ready
    && accessPlan.gates.find((gate) => gate.id === "external_lock")?.ready === false
    && /No raw portal token is generated/i.test(accessPacket)
    && !["secret-session-token", "Margin is 31%", "Assistant reasoning"].some((term) => accessPacket.includes(term));

  return {
    ok: hasApprovedProposal && hasProofAndProgress && hasChangeOrderContext && blocksExternalPortal && excludesInternalData && copyOnly && tokenizedAccessContract,
    hasApprovedProposal,
    hasProofAndProgress,
    hasChangeOrderContext,
    blocksExternalPortal,
    excludesInternalData,
    copyOnly,
    tokenizedAccessContract,
    accessPlanExternalLocked: accessPlan.canCreateExternalAccess === false,
    accessPlanExpirationReady: accessPlan.expiration.ready,
    accessPlanRevocationReady: accessPlan.revocation.ready,
    accessPlanAuditReady: accessPlan.audit.ready,
  };
}

function roleAndPackageAudit() {
  const ownerAdminPreview = OWNER_ADMIN_ROLES.every((role) => canPreviewCustomerPortal({ role }));
  const blockedRoles = BLOCKED_ROLES.every((role) => !canPreviewCustomerPortal({ role }));
  const basic = resolvePackageEntitlements({ hasFeature: (featureKey) => packageIncludesFeature(PACKAGE_IDS.BASIC, featureKey) });
  const premium = resolvePackageEntitlements({ hasFeature: (featureKey) => packageIncludesFeature(PACKAGE_IDS.PREMIUM, featureKey) });
  const elite = resolvePackageEntitlements({ hasFeature: (featureKey) => packageIncludesFeature(PACKAGE_IDS.ELITE, featureKey) });
  const eliteOnly = !basic.customerPortal.canUsePreview && !premium.customerPortal.canUsePreview && elite.customerPortal.canUsePreview;

  return {
    ok: ownerAdminPreview && blockedRoles && eliteOnly,
    ownerAdminPreview,
    blockedRoles,
    eliteOnly,
  };
}

function communicationSafetyAudit() {
  const blockedSend = evaluateAgentActionPermission({
    commandType: "estimate-packet-review",
    requestedActionClass: "send_customer_message",
    hasHumanApproval: true,
  });
  const blockedBid = evaluateAgentActionPermission({
    commandType: "estimate-packet-review",
    requestedActionClass: "submit_bid",
    hasHumanApproval: true,
  });
  const blockedProposalSend = evaluateAgentActionPermission({
    commandType: "estimate-packet-review",
    requestedActionClass: "send_proposal",
    hasHumanApproval: true,
  });

  return {
    ok: !blockedSend.ok && !blockedBid.ok && !blockedProposalSend.ok,
    customerMessageBlocked: !blockedSend.ok,
    bidSubmissionBlocked: !blockedBid.ok,
    proposalSendBlocked: !blockedProposalSend.ok,
    failures: [
      ...blockedSend.failures,
      ...blockedBid.failures,
      ...blockedProposalSend.failures,
    ],
  };
}

export function buildCustomerPortalCommunicationReadinessReport({
  evidence = {},
  approvals = {},
  checkedAt = new Date().toISOString(),
} = {}) {
  const portalAudit = customerPortalSafetyAudit();
  const rolePackageAudit = roleAndPackageAudit();
  const communicationAudit = communicationSafetyAudit();
  const externalPortalApproved = approvals.externalPortalApprovalPhrase === EXTERNAL_PORTAL_APPROVAL_PHRASE;
  const customerSendApproved = approvals.customerSendApprovalPhrase === CUSTOMER_SEND_APPROVAL_PHRASE;

  const gates = [
    gate("Manual customer portal preview", Boolean(evidence.portalPreviewVerified && portalAudit.ok), [
      ...missing(evidence.portalPreviewVerified, "Run and pass customer portal preview tests."),
      ...missing(portalAudit.hasApprovedProposal, "Manual preview must use approved customer-facing proposal content."),
      ...missing(portalAudit.hasProofAndProgress, "Manual preview must include proof/progress context when available."),
      ...missing(portalAudit.hasChangeOrderContext, "Manual preview must include reviewed change-order context when available."),
      ...missing(portalAudit.excludesInternalData, "Manual preview packet must exclude internal notes, AI reasoning, secrets, and margins."),
      ...missing(portalAudit.copyOnly, "Manual preview must remain copy-only and not create a customer portal."),
    ]),
    gate("Customer-facing packet output", Boolean(evidence.printPacketsVerified && evidence.estimateOutputVerified), [
      ...missing(evidence.printPacketsVerified, "Run and pass npm.cmd run verify:print-packets."),
      ...missing(evidence.estimateOutputVerified, "Run and pass npm.cmd run verify:estimates."),
    ]),
    gate("Role and package safety", Boolean(evidence.rolesVerified && evidence.entitlementsVerified && rolePackageAudit.ok), [
      ...missing(evidence.rolesVerified, "Run and pass npm.cmd run verify:roles."),
      ...missing(evidence.entitlementsVerified, "Run and pass npm.cmd run verify:entitlements."),
      ...missing(rolePackageAudit.ownerAdminPreview, "Owner/admin roles must be allowed to preview manual portal packets."),
      ...missing(rolePackageAudit.blockedRoles, "Operations manager, estimator, foreman, and employee roles must stay blocked from customer portal preview."),
      ...missing(rolePackageAudit.eliteOnly, "Customer portal preview must remain Elite package gated."),
    ]),
    gate("Customer message review safety", Boolean(evidence.agentPolicyVerified && communicationAudit.ok), [
      ...missing(evidence.agentPolicyVerified, "Run and pass shared agent action policy tests."),
      ...missing(communicationAudit.customerMessageBlocked, "Agent/customer message sending must be blocked by default."),
      ...missing(communicationAudit.bidSubmissionBlocked, "Bid submission must be blocked by default."),
      ...missing(communicationAudit.proposalSendBlocked, "Proposal/customer send must be blocked by default."),
    ]),
    gate("Claims and build safety", Boolean(evidence.claimsVerified && evidence.buildVerified), [
      ...missing(evidence.claimsVerified, "Run and pass npm.cmd run verify:claims."),
      ...missing(evidence.buildVerified, "Run and pass npm.cmd run build."),
    ]),
    gate("Tokenized portal and external sharing plan", Boolean(evidence.tokenizedPortalPlanDocumented && evidence.messageReviewPlanDocumented && evidence.approvalAuditPlanDocumented), [
      ...missing(evidence.tokenizedPortalPlanDocumented, "Document tokenized access, expiration, company scope, and revocation before any external portal."),
      ...missing(evidence.messageReviewPlanDocumented, "Document human-reviewed customer message flow before any send automation."),
      ...missing(evidence.approvalAuditPlanDocumented, "Document approval/audit trail requirements before external sharing or sends."),
      ...missing(portalAudit.tokenizedAccessContract, "Tokenized access readiness contract must prove expiration, revocation, audit, and external lock behavior."),
    ], [
      "Tokenized customer portal and send workflow remain future approved phases; this gate does not create external access or send messages.",
    ]),
    gate("Locked access-record lifecycle", Boolean(evidence.accessRecordLifecycleVerified), [
      ...missing(evidence.accessRecordLifecycleVerified, "Run and pass locked customer portal access-record lifecycle tests."),
    ], [
      "Lifecycle verification covers internal prepare/revoke/expire evidence only; it does not create customer routes or redeemable portal tokens.",
    ]),
    gate("Locked public route contract", Boolean(evidence.publicRouteContractVerified), [
      ...missing(evidence.publicRouteContractVerified, "Run and pass locked public customer portal route contract tests."),
    ], [
      "Public route contract verification proves browser hits remain locked and customer-data free; it does not enable external portal access.",
    ]),
    gate("Internal access-record packet", Boolean(evidence.accessRecordPacketVerified), [
      ...missing(evidence.accessRecordPacketVerified, "Run and pass internal customer portal access-record packet tests."),
    ], [
      "Internal packet verification covers owner/admin review output only; it does not serve content to customers.",
    ]),
    gate("Locked share approval queue", Boolean(evidence.shareApprovalQueueVerified), [
      ...missing(evidence.shareApprovalQueueVerified, "Run and pass locked customer portal share approval queue tests."),
    ], [
      "Share approval queue verification covers internal owner/admin review evidence only; it does not create links, tokens, sends, invoices, or payments.",
    ]),
    gate("Locked share approval review", Boolean(evidence.shareApprovalReviewVerified), [
      ...missing(evidence.shareApprovalReviewVerified, "Run and pass locked customer portal share approval review tests."),
    ], [
      "Share approval review verification covers internal owner/admin decisions only; a ready decision does not publish links, tokens, sends, invoices, or payments.",
    ]),
    gate("External gate preflight lock", Boolean(evidence.externalGatePreflightVerified), [
      ...missing(evidence.externalGatePreflightVerified, "Run and pass locked customer portal external gate preflight tests."),
    ], [
      "External gate preflight verification covers read-only prerequisite reporting only; it does not create external portal implementation.",
    ]),
    gate("Locked external execution contract", Boolean(evidence.externalExecutionContractVerified), [
      ...missing(evidence.externalExecutionContractVerified, "Run and pass locked customer portal external execution contract tests."),
    ], [
      "Execution contract verification covers idempotency, audit, rollback, Agent OS gate mapping, and hard-deny execution only; it does not create customer portal implementation.",
    ]),
    gate("External customer portal approval", externalPortalApproved, [
      `Do not create customer logins, public share links, or portal tokens until ${EXTERNAL_PORTAL_APPROVAL_PHRASE} is recorded in a separate approved task.`,
    ]),
    gate("Customer send workflow approval", customerSendApproved, [
      `Do not send customer emails, SMS, proposals, bids, or portal notifications until ${CUSTOMER_SEND_APPROVAL_PHRASE} is recorded in a separate approved task.`,
    ]),
  ];

  const gateByName = new Map(gates.map((item) => [item.name, item]));
  const internalCustomerPreviewReady = [
    "Manual customer portal preview",
    "Customer-facing packet output",
    "Role and package safety",
    "Customer message review safety",
    "Claims and build safety",
    "Tokenized portal and external sharing plan",
    "Locked access-record lifecycle",
    "Locked public route contract",
    "Internal access-record packet",
    "Locked share approval queue",
    "Locked share approval review",
    "External gate preflight lock",
    "Locked external execution contract",
  ].every((name) => gateByName.get(name)?.go);
  const externalCustomerPortalReady = gates.every((item) => item.go);
  const nextBlockedGate = gates.find((item) => !item.go) || null;

  return {
    ok: externalCustomerPortalReady,
    internalCustomerPreviewReady,
    externalCustomerPortalReady,
    checkedAt,
    portalAudit,
    rolePackageAudit,
    communicationAudit,
    gates,
    nextHighestLeverage: nextBlockedGate
      ? `${nextBlockedGate.name}: ${nextBlockedGate.blockers[0] || "clear remaining blockers"}`
      : "All customer portal and communication gates are green; external access still needs separately scoped implementation.",
    boundary: "read-only: no customer login, share link, portal token, email, SMS, proposal send, bid submission, package change, invoice, payment, secret, deploy, or production data change",
  };
}

function printHumanReport(report) {
  console.log("Apex HQ customer portal and communication readiness:");
  console.log(`- Internal customer preview ready: ${report.internalCustomerPreviewReady ? "GO" : "NO-GO"}`);
  console.log(`- External customer portal ready: ${report.externalCustomerPortalReady ? "GO" : "NO-GO"}`);

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

  const report = buildCustomerPortalCommunicationReadinessReport(options);
  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printHumanReport(report);
  }

  if (!report.internalCustomerPreviewReady && !options.json) {
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
