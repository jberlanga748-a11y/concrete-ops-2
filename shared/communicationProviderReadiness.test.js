import assert from "node:assert/strict";
import test from "node:test";

import {
  assertSafeCommunicationProviderPayload,
  buildOutboundCommunicationApprovalRequest,
  deriveCommunicationProviderReadiness,
  deriveOutboundCommunicationApprovalQueue,
} from "./communicationProviderReadiness.js";

test("communication provider readiness stays locked while reporting missing evidence", () => {
  const readiness = deriveCommunicationProviderReadiness({
    externalGateSettings: {
      email_send: { enabled: true, mode: "human_confirmed" },
      sms_send: { enabled: false, mode: "disabled" },
    },
    providerConfig: { emailConfigured: true, smsConfigured: false },
    evidence: {
      email: {
        consentModelReady: true,
        optOutReady: true,
        doNotContactReady: true,
        templateReviewReady: true,
        deliveryHistoryReady: true,
        approvalQueueReady: true,
      },
    },
  });

  const email = readiness.rows.find((row) => row.channel === "email");
  const sms = readiness.rows.find((row) => row.channel === "sms");
  assert.equal(email.status, "ready_for_human_confirmed_adapter_review");
  assert.equal(sms.status, "missing_readiness_evidence");
  assert.equal(readiness.externalSendExecutionEnabled, false);
  assert.equal(readiness.rows.every((row) => row.canSend === false), true);
});

test("outbound approval request records consent, opt-out, idempotency, and locked send state", () => {
  const approval = buildOutboundCommunicationApprovalRequest({
    channel: "email",
    targetEntityType: "lead",
    targetEntityId: "L-1",
    recipient: "customer@example.test",
    consentSource: "Website form opt-in",
    consentConfirmed: true,
    templateReviewed: true,
    humanReviewConfirmed: true,
    messagePreview: "Hello customer@example.test, here is the reviewed update.",
    idempotencyKey: "approval-1",
  }, {
    companyId: "COMPANY-1",
    requestedByUserId: "U-1",
    requestedByName: "Owner",
    now: "2026-05-29T00:00:00.000Z",
  });

  assert.equal(approval.status, "queued_locked");
  assert.equal(approval.gateId, "email_send");
  assert.equal(approval.canSend, false);
  assert.equal(approval.externalSendEnabled, false);
  assert.match(approval.messagePreview, /\[REDACTED_EMAIL\]/);
  assert.equal(approval.idempotencyKey, "approval-1");
});

test("outbound approval blocks opt-out, do-not-contact, missing consent, and unsafe payloads", () => {
  const blocked = buildOutboundCommunicationApprovalRequest({
    channel: "sms",
    targetEntityType: "customer",
    targetEntityId: "C-1",
    recipient: "+15555550123",
    optedOut: true,
    doNotContact: true,
    templateReviewed: false,
    humanReviewConfirmed: false,
  });

  assert.equal(blocked.status, "blocked_locked");
  assert.equal(blocked.gateId, "sms_send");
  assert.match(blocked.blockers.join(" "), /Consent source|opted out|do-not-contact|template|Human review/i);
  assert.throws(() => assertSafeCommunicationProviderPayload({ apiKey: "secret", sendNow: true }), /cannot include secrets/i);
});

test("outbound approval queue dedupes by idempotency key", () => {
  const approval = buildOutboundCommunicationApprovalRequest({
    channel: "email",
    targetEntityType: "estimate",
    targetEntityId: "EST-1",
    recipient: "customer@example.test",
    consentConfirmed: true,
    templateReviewed: true,
    humanReviewConfirmed: true,
    idempotencyKey: "same-key",
  });
  const queue = deriveOutboundCommunicationApprovalQueue([
    { id: "A1", action: "queued_locked", createdAt: "2026-05-29T00:00:00.000Z", detail: JSON.stringify({ outboundApproval: approval }) },
    { id: "A2", action: "queued_locked", createdAt: "2026-05-29T00:01:00.000Z", detail: JSON.stringify({ outboundApproval: { ...approval, id: "OTHER" } }) },
  ]);

  assert.equal(queue.length, 1);
  assert.equal(queue[0].id, approval.id);
});
