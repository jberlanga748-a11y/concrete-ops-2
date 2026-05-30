import assert from "node:assert/strict";
import test from "node:test";

import { deriveBillingPaymentsCommandState } from "./billing-payments-command-utils.js";
import { packageReadinessSummary } from "../shared/packages.js";

const OWNER_ADMIN_PERMISSIONS = {
  settings: { canView: true },
  jobs: { canManageAll: true },
  estimates: { canView: true },
  reports: { canReview: true },
  uploads: { canManageAll: true },
  deliveryTickets: { canManageAll: true },
  time: { canManageAll: true },
};

test("billing payments command exposes provider-ready owner/admin billing workflows without processing money", () => {
  const state = deriveBillingPaymentsCommandState({
    user: { role: "Owner / Ops" },
    permissions: OWNER_ADMIN_PERMISSIONS,
    companySettings: {
      packageId: "premium",
      billingProviderSettings: {
        providerId: "stripe",
        mode: "sandbox",
        accountReference: "acct_test_ready",
      },
    },
    packageReadiness: packageReadinessSummary("premium"),
    jobs: [
      { id: "JOB-1", title: "Shop slab", customer: "Riverside", status: "billing_ready" },
      { id: "JOB-2", title: "Active driveway", status: "in_progress" },
    ],
    estimates: [{ id: "EST-1", jobId: "JOB-1", grandTotal: 18500 }],
    dailyReports: [{ id: "DR-1", jobId: "JOB-1", status: "reviewed" }],
    uploads: [{ id: "UP-1", jobId: "JOB-1" }],
    deliveryTickets: [{ id: "DT-1", jobId: "JOB-1", reportId: "DR-1", ticketUploadId: "UP-1", supplier: "Ready Mix", ticketNumber: "RM-9", yardsDelivered: 7 }],
    timeEntries: [{ id: "TE-1", jobId: "JOB-1", status: "completed", totalMinutes: 420 }],
    changeOrderRequests: [{
      id: "CO-1",
      jobId: "JOB-1",
      status: "approved_for_pricing",
      priceAmount: 1200,
      customerReviewStatus: "accepted_manually",
      billingHandoffStatus: "ready_for_manual_billing_handoff",
    }],
    auditEvents: [
      { id: "AUD-1", type: "package.upgrade.review", summary: "Manual package review requested", actorName: "Owner" },
      { id: "AUD-2", type: "lead.created", summary: "Lead created" },
    ],
  });

  assert.equal(state.canView, true);
  assert.equal(state.providerState.status, "Provider-ready");
  assert.equal(state.providerState.liveExecutionLocked, true);
  assert.equal(state.metrics.billingReviewCandidates, 1);
  assert.equal(state.metrics.billingReviewTotal, 19700);
  assert.equal(state.metrics.closeoutReady, 1);
  assert.equal(state.metrics.manualInvoicePrepReady, 1);
  assert.equal(state.metrics.approvedChangeOrdersIncluded, 1);
  assert.equal(state.billingJobs[0].estimateId, "EST-1");
  assert.equal(state.billingJobs[0].readyForBillingReview, true);
  assert.equal(state.billingJobs[0].proofMissing.length, 0);
  assert.equal(state.billingJobs[0].manualInvoicePrepStatus, "ready_for_manual_invoice_prep");
  assert.equal(state.billingJobs[0].approvedChangeOrdersIncluded.total, 1200);
  assert.equal(state.closeoutPacket.rows[0].billingPrep.canPrepareManualPaymentFollowUp, true);
  assert.equal(state.packageAuditTrail.length, 1);
  assert.equal(state.workflowLanes.some((lane) => lane.id === "checkout" && lane.status === "Provider-ready"), true);
  assert.match(state.safetyBoundary, /does not process live payments/i);
  assert.equal(state.blockedActions.some((action) => /No checkout session/i.test(action)), true);
  assert.doesNotMatch(JSON.stringify(state), /sk_live|sk_test|client_secret|card number/i);
});

test("billing command stays useful when payment provider is not configured", () => {
  const state = deriveBillingPaymentsCommandState({
    user: { role: "Administrator" },
    permissions: OWNER_ADMIN_PERMISSIONS,
    companySettings: { packageId: "basic" },
    jobs: [{ id: "JOB-1", title: "Fence repair", status: "closed" }],
    estimates: [{ id: "EST-1", jobId: "JOB-1", total: 4200 }],
  });

  assert.equal(state.canView, true);
  assert.equal(state.currentPackage.label, "Basic");
  assert.equal(state.nextPackage.label, "Premium");
  assert.equal(state.providerState.status, "Needs account/API key");
  assert.equal(state.workflowLanes.find((lane) => lane.id === "provider-health").status, "Needs account/API key");
  assert.equal(state.workflowLanes.find((lane) => lane.id === "manual-invoice").status, "Provider-ready");
  assert.match(state.summary, /provider-ready review lanes/i);
});

test("billing command blocks field and non-owner roles from money and package context", () => {
  const state = deriveBillingPaymentsCommandState({
    user: { role: "Foreman" },
    permissions: { settings: { canView: false }, jobs: { canView: true } },
    companySettings: { packageId: "elite" },
    jobs: [{ id: "JOB-1", title: "Secret priced job", status: "billing_ready" }],
    estimates: [{ id: "EST-1", jobId: "JOB-1", grandTotal: 100000 }],
    auditEvents: [{ id: "AUD-1", summary: "Package changed to Elite" }],
  });

  assert.equal(state.canView, false);
  assert.equal(state.billingJobs.length, 0);
  assert.equal(state.packageAuditTrail.length, 0);
  assert.equal(state.closeoutPacket, undefined);
  assert.doesNotMatch(JSON.stringify(state), /100000|Secret priced job|Elite/);
  assert.match(state.safetyBoundary, /Field and non-owner\/admin users/i);
});
