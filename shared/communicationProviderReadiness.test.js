import assert from "node:assert/strict";
import test from "node:test";

import {
  assertSafeCommunicationProviderPayload,
  buildCommunicationDeliveryAttemptContract,
  buildCommunicationSuppressionRecord,
  buildOutboundCommunicationApprovalRequest,
  deriveCommunicationDeliveryAttemptContracts,
  deriveCommunicationProviderReadiness,
  deriveOutboundCommunicationApprovalQueue,
  deriveCommunicationSuppressionList,
  isRecipientSuppressed,
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
        suppressionListReady: true,
        templateReviewReady: true,
        deliveryHistoryReady: true,
        deliveryAttemptContractReady: true,
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

test("communication suppression records stay locked, scoped, and idempotent", () => {
  const suppressionRecord = buildCommunicationSuppressionRecord({
    channel: "all",
    recipient: "Customer@Example.Test",
    reason: "do_not_contact",
    targetEntityType: "lead",
    targetEntityId: "L-1",
    note: "Customer asked at customer@example.test to stop outreach.",
    idempotencyKey: "suppression-1",
  }, {
    companyId: "COMPANY-1",
    requestedByUserId: "U-1",
    requestedByName: "Owner",
    now: "2026-05-29T00:00:00.000Z",
  });

  assert.equal(suppressionRecord.status, "active_locked");
  assert.equal(suppressionRecord.sendBlocked, true);
  assert.equal(suppressionRecord.externalSendEnabled, false);
  assert.equal(suppressionRecord.recipientKey, "customer@example.test");
  assert.match(suppressionRecord.note, /\[REDACTED_EMAIL\]/);
  assert.equal(isRecipientSuppressed("customer@example.test", "email", [suppressionRecord]), true);
  assert.equal(isRecipientSuppressed("customer@example.test", "sms", [suppressionRecord]), true);

  const suppressions = deriveCommunicationSuppressionList([
    { id: "S1", createdAt: "2026-05-29T00:00:00.000Z", detail: JSON.stringify({ suppressionRecord }) },
    { id: "S2", createdAt: "2026-05-29T00:01:00.000Z", detail: JSON.stringify({ suppressionRecord: { ...suppressionRecord, id: "OTHER" } }) },
  ]);
  assert.equal(suppressions.length, 1);
  assert.equal(suppressions[0].id, "OTHER");
});

test("delivery-attempt contracts capture lock, suppression, and provider failure classes without sending", () => {
  const approval = buildOutboundCommunicationApprovalRequest({
    channel: "email",
    targetEntityType: "lead",
    targetEntityId: "L-1",
    recipient: "customer@example.test",
    consentConfirmed: true,
    templateReviewed: true,
    humanReviewConfirmed: true,
    idempotencyKey: "approval-1",
  });
  const suppressionRecord = buildCommunicationSuppressionRecord({
    channel: "email",
    recipient: "customer@example.test",
    reason: "opt_out",
  });
  const readiness = deriveCommunicationProviderReadiness({
    providerConfig: { emailConfigured: false },
    evidence: {
      email: {
        consentModelReady: true,
        optOutReady: true,
        doNotContactReady: true,
        suppressionListReady: true,
        templateReviewReady: true,
        deliveryHistoryReady: true,
        deliveryAttemptContractReady: true,
        approvalQueueReady: true,
      },
    },
    outboundApprovalQueue: [approval],
    suppressionList: [suppressionRecord],
  });
  const deliveryAttemptContract = buildCommunicationDeliveryAttemptContract(approval, {
    suppressionList: [suppressionRecord],
    providerReadiness: readiness,
    requestedByUserId: "U-1",
    requestedByName: "Owner",
    now: "2026-05-29T00:02:00.000Z",
  });

  assert.equal(deliveryAttemptContract.status, "blocked_by_suppression_locked");
  assert.equal(deliveryAttemptContract.providerRequestPrepared, false);
  assert.equal(deliveryAttemptContract.providerRequestSent, false);
  assert.equal(deliveryAttemptContract.canSend, false);
  assert.ok(deliveryAttemptContract.failureClasses.includes("suppressed"));
  assert.ok(deliveryAttemptContract.failureClasses.includes("provider_unconfigured"));
  assert.ok(deliveryAttemptContract.failureClasses.includes("missing_adapter"));

  const contracts = deriveCommunicationDeliveryAttemptContracts([
    { id: "D1", createdAt: "2026-05-29T00:02:00.000Z", detail: JSON.stringify({ deliveryAttemptContract }) },
    { id: "D2", createdAt: "2026-05-29T00:03:00.000Z", detail: JSON.stringify({ deliveryAttemptContract: { ...deliveryAttemptContract, id: "OTHER" } }) },
  ]);
  assert.equal(contracts.length, 1);
  assert.equal(contracts[0].id, "OTHER");
});
