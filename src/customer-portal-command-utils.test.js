import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCustomerPortalCommentDraft,
  deriveCustomerPortalCommandState,
} from "./customer-portal-command-utils.js";

test("derives owner/admin customer portal command state without enabling external execution", () => {
  const state = deriveCustomerPortalCommandState({
    canPreview: true,
    previewState: {
      preview: {
        customer: "ABC Builders",
        estimateId: "EST-1",
        estimateTitle: "Shop slab proposal",
        jobId: "JOB-1",
      },
      readiness: [{ id: "proposal", ready: true }],
    },
    accessRecords: [
      { id: "CPA-1", status: "prepared_locked", expiresAt: "2026-06-01T12:00:00.000Z" },
      { id: "CPA-2", status: "revoked_locked", revokedAt: "2026-05-30T12:00:00.000Z" },
    ],
    shareApprovalRequests: [
      { id: "CPSA-1", status: "ready_for_external_gate_review_locked", customer: "ABC Builders" },
    ],
    providerReadiness: {
      outboundApprovals: [{ id: "COMM-1", targetEntityType: "estimate", targetEntityId: "EST-1" }],
      deliveryAttemptContracts: [{ id: "COMM-DELIVERY-1" }],
    },
  });

  assert.equal(state.canPreview, true);
  assert.equal(state.activeAccessRecordCount, 1);
  assert.equal(state.customerCommentTarget.entityType, "estimate");
  assert.equal(state.customerCommentTarget.entityId, "EST-1");
  assert.equal(state.summaryCards.find((card) => card.id === "proposal")?.value, "Ready");
  assert.equal(state.summaryCards.find((card) => card.id === "messages")?.value, 1);
  assert.equal(state.boundaryRows.find((row) => row.label === "Public route")?.value, "Locked response only");
  assert.equal(JSON.stringify(state).includes("tokenHashReference"), false);
});

test("builds a customer portal comment draft as internal contact history", () => {
  const draft = buildCustomerPortalCommentDraft({
    comment: "Can we approve the change order after photos are added?",
    preview: { customer: "ABC Builders" },
    user: { name: "Owner Ops" },
    now: "2026-05-30T12:00:00.000Z",
  });

  assert.equal(draft.method, "Other");
  assert.equal(draft.direction, "inbound");
  assert.equal(draft.outcome, "Replied");
  assert.match(draft.subject, /ABC Builders/);
  assert.match(draft.notes, /Owner Ops/);
  assert.match(draft.notes, /change order/);
  assert.match(draft.notes, /Internal customer decision: Comment \/ question/);
  assert.match(draft.notes, /no portal approval, rejection, customer session, message, invoice, payment, token, or public action/i);
});

test("builds approval and rejection notes as internal-only review decisions", () => {
  const approval = buildCustomerPortalCommentDraft({
    decision: "approval_noted",
    comment: "Customer said the packet looks good.",
    preview: { customer: "ABC Builders" },
  });
  const rejection = buildCustomerPortalCommentDraft({
    decision: "rejection_noted",
    comment: "Customer declined the change order.",
    preview: { customer: "ABC Builders" },
  });

  assert.equal(approval.outcome, "Replied");
  assert.match(approval.notes, /Internal customer decision: Approval noted/);
  assert.equal(rejection.outcome, "Follow-Up Needed");
  assert.match(rejection.notes, /Internal customer decision: Rejection noted/);
  assert.doesNotMatch(`${approval.notes}\n${rejection.notes}`, /tokenized link|session created|message sent|invoice created/i);
});
