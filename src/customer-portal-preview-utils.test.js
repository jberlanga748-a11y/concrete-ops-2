import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCustomerPortalPreviewPacket,
  buildCustomerPortalTokenizedAccessApprovalPacket,
  deriveCustomerPortalPreviewState,
  deriveCustomerPortalTokenizedAccessPlan,
} from "./customer-portal-preview-utils.js";

test("derives a customer portal manual preview from approved customer-facing records only", () => {
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
        grandTotal: 12000,
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
      { id: "UP-2", jobId: "OTHER", caption: "Other customer", fileName: "other.jpg", uploadedAt: "2026-05-17" },
    ],
    dailyReports: [
      { id: "DR-1", jobId: "JOB-1", status: "submitted" },
    ],
    changeOrderRequests: [
      { id: "CO-1", jobId: "JOB-1", status: "approved" },
      { id: "CO-2", jobId: "JOB-1", status: "draft" },
    ],
  });

  assert.equal(state.preview.workspaceName, "Apex Demo Concrete");
  assert.equal(state.preview.customer, "ABC Builders");
  assert.equal(state.preview.estimateId, "EST-APPROVED");
  assert.equal(state.preview.estimateTitle, "Shop slab proposal");
  assert.equal(state.preview.estimateStatus, "Approved");
  assert.equal(state.preview.estimateTotal, "$28,500");
  assert.equal(state.preview.scopeSummary, "Install 40x60 broom finish slab.");
  assert.equal(state.preview.exclusions, "Permits and utility relocation excluded.");
  assert.equal(state.preview.jobTitle, "Shop slab");
  assert.equal(state.preview.jobStatus, "In progress");
  assert.equal(state.preview.proofPhotoCount, 1);
  assert.equal(state.preview.progressUpdateCount, 1);
  assert.equal(state.preview.reviewedChangeOrderCount, 1);
  assert.equal(state.shareReadyEstimatesCount, 1);
  assert.equal(state.relatedProofPhotos.length, 1);
  assert.equal(state.readiness.find((item) => item.id === "proposal")?.ready, true);
});

test("customer portal preview fails closed when no approved estimate exists", () => {
  const state = deriveCustomerPortalPreviewState({
    estimates: [
      { id: "EST-DRAFT", customer: "Draft Customer", status: "draft", title: "Draft only", grandTotal: 1000 },
    ],
    jobs: [
      { id: "JOB-1", customer: "Draft Customer", status: "scheduled" },
    ],
  });

  assert.equal(state.preview.estimateId, "");
  assert.equal(state.preview.estimateTitle, "Approved proposal pending");
  assert.equal(state.preview.jobTitle, "Job pending");
  assert.equal(state.readiness.find((item) => item.id === "proposal")?.ready, false);
  assert.match(state.readiness.find((item) => item.id === "proposal")?.detail || "", /No approved estimate/);
});

test("customer portal preview packet excludes internal notes and share automation", () => {
  const state = deriveCustomerPortalPreviewState({
    estimates: [
      {
        id: "EST-APPROVED",
        customer: "ABC Builders",
        status: "approved",
        title: "Approved proposal",
        scopeSummary: "Customer-safe scope.",
        exclusions: "Customer-safe exclusions.",
        grandTotal: 5000,
        internalNotes: "Secret margin note.",
        aiNotes: "Assistant reasoning.",
      },
    ],
  });
  const packet = buildCustomerPortalPreviewPacket({
    state,
    user: {
      name: "Owner Ops",
      role: "Owner",
      token: "secret-session-token",
    },
    generatedAt: "2026-05-17T12:00:00.000Z",
  });

  assert.match(packet, /Apex HQ Customer Portal Manual Approval Preview/);
  assert.match(packet, /Customer: ABC Builders/);
  assert.match(packet, /Scope: Customer-safe scope/);
  assert.match(packet, /No customer login, public share link/);
  assert.match(packet, /automatic notification/);
  assert.equal(packet.includes("Secret margin note"), false);
  assert.equal(packet.includes("Assistant reasoning"), false);
  assert.equal(packet.includes("secret-session-token"), false);
});

test("tokenized customer portal access plan is implementation-ready but externally locked", () => {
  const state = deriveCustomerPortalPreviewState({
    estimates: [
      {
        id: "EST-APPROVED",
        customerId: "C1",
        customer: "ABC Builders",
        status: "approved",
        title: "Approved proposal",
        scopeSummary: "Customer-safe scope.",
        grandTotal: 5000,
      },
    ],
    jobs: [{ id: "JOB-1", customerId: "C1", customer: "ABC Builders", status: "scheduled" }],
  });
  const accessPlan = deriveCustomerPortalTokenizedAccessPlan({
    state,
    companyId: "COMPANY-1",
    actor: { role: "Owner", token: "secret-session-token" },
    issuedAt: "2026-05-29T12:00:00.000Z",
    expiresAt: "2026-06-05T12:00:00.000Z",
    approvalId: "AUDIT-123",
  });

  assert.equal(accessPlan.implementationReady, true);
  assert.equal(accessPlan.canCreateExternalAccess, false);
  assert.equal(accessPlan.tokenMaterialCreated, false);
  assert.equal(accessPlan.tokenReference, "not-created");
  assert.equal(accessPlan.scope.companyId, "COMPANY-1");
  assert.deepEqual(accessPlan.scope.allowedSections, ["proposal", "proof_summary", "progress_summary", "reviewed_change_orders"]);
  assert.equal(accessPlan.expiration.ttlHours, 168);
  assert.equal(accessPlan.audit.requiredEvents.includes("customer_portal.external_access_revoked"), true);
  assert.equal(accessPlan.externalActionLocks.some((lock) => /No raw portal token/i.test(lock)), true);
  assert.match(accessPlan.boundary, /Readiness contract only/i);
  assert.equal(JSON.stringify(accessPlan).includes("secret-session-token"), false);
});

test("tokenized portal access plan fails closed without role, scope, approval, or safe expiration", () => {
  const state = deriveCustomerPortalPreviewState({
    estimates: [{ id: "EST-DRAFT", customer: "ABC Builders", status: "draft" }],
  });
  const accessPlan = deriveCustomerPortalTokenizedAccessPlan({
    state,
    actor: { role: "Foreman" },
    issuedAt: "2026-05-29T12:00:00.000Z",
    expiresAt: "2026-06-20T12:00:00.000Z",
    revocationSupported: false,
  });

  assert.equal(accessPlan.implementationReady, false);
  assert.equal(accessPlan.canCreateExternalAccess, false);
  assert.equal(accessPlan.gates.find((gate) => gate.id === "role")?.ready, false);
  assert.equal(accessPlan.gates.find((gate) => gate.id === "company_scope")?.ready, false);
  assert.equal(accessPlan.gates.find((gate) => gate.id === "approved_proposal")?.ready, false);
  assert.equal(accessPlan.gates.find((gate) => gate.id === "expiration")?.ready, false);
  assert.equal(accessPlan.gates.find((gate) => gate.id === "revocation")?.ready, false);
  assert.equal(accessPlan.gates.find((gate) => gate.id === "approval_audit")?.ready, false);
  assert.equal(accessPlan.gates.find((gate) => gate.id === "external_lock")?.ready, false);
});

test("tokenized access approval packet excludes raw secrets and states locked boundary", () => {
  const state = deriveCustomerPortalPreviewState({
    estimates: [
      {
        id: "EST-APPROVED",
        customer: "ABC Builders",
        status: "approved",
        title: "Approved proposal",
        scopeSummary: "Customer-safe scope.",
        internalNotes: "Office-only margin note.",
      },
    ],
  });
  const accessPlan = deriveCustomerPortalTokenizedAccessPlan({
    state,
    companyId: "COMPANY-1",
    actor: { role: "Administrator", token: "secret-session-token" },
    issuedAt: "2026-05-29T12:00:00.000Z",
    expiresAt: "2026-06-01T12:00:00.000Z",
    approvalId: "AUDIT-456",
  });
  const packet = buildCustomerPortalTokenizedAccessApprovalPacket({
    accessPlan,
    generatedAt: "2026-05-29T12:05:00.000Z",
  });

  assert.match(packet, /Tokenized Access Readiness Packet/);
  assert.match(packet, /External access allowed now: no/);
  assert.match(packet, /Token material created: no/);
  assert.match(packet, /No customer login is created/);
  assert.match(packet, /External access lock: blocked/i);
  assert.equal(packet.includes("Office-only margin note"), false);
  assert.equal(packet.includes("secret-session-token"), false);
});
