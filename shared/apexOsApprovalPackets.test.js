import assert from "node:assert/strict";
import test from "node:test";

import {
  APEX_OS_APPROVAL_PACKET_TEMPLATES,
  getApexOsApprovalPacketMissingFields,
  isApexOsApprovalPacketApprovalConfirmed,
  isApexOsApprovalPacketReady,
  normalizeApexOsApprovalPacket,
  normalizeApexOsApprovalPackets,
  scoreApexOsApprovalPacketRisk,
  summarizeApexOsApprovalPackets,
} from "./apexOsApprovalPackets.js";

test("normalizes approval packets with review decisions but no execution state", () => {
  const packet = normalizeApexOsApprovalPacket({
    id: "AAP-1",
    title: "Deploy Apex OS",
    action: "Deploy the private Apex Control Room package after gates pass.",
    requestedActionCategory: "deploy",
    riskLevel: "high",
    status: "approved",
    reason: "Operator wants production access.",
    affectedScope: "Production app release.",
    validationPlan: "Run build, server, role, backup, restore, hosted smoke, and production auth smoke.",
    rollbackPlan: "Rollback to prior Fly release.",
    exactApprovalPhrase: "BACKUP_FIRST_PRODUCTION_RELEASE_APPROVED",
    sourceLabel: "docs/APEX_HQ_LIVING_FINISH_PLAN.md",
  });

  assert.equal(packet.status, "approved");
  assert.equal(packet.requestedActionCategory, "deploy");
  assert.equal(packet.riskLevel, "high");
  assert.ok(packet.approvedAt);
  assert.equal(isApexOsApprovalPacketReady(packet), true);
  assert.equal(isApexOsApprovalPacketApprovalConfirmed(packet, "BACKUP_FIRST_PRODUCTION_RELEASE_APPROVED"), true);
  assert.equal(isApexOsApprovalPacketApprovalConfirmed(packet, "wrong phrase"), false);
  assert.equal(scoreApexOsApprovalPacketRisk(packet).band, "high");
});

test("summarizes only valid durable packets", () => {
  const packets = normalizeApexOsApprovalPackets([
    {
      id: "AAP-1",
      title: "Ready packet",
      action: "Prepare deployment evidence.",
      status: "ready",
      reason: "Release needs a packet.",
      affectedScope: "Apex OS release desk.",
      validationPlan: "Run release checks.",
      rollbackPlan: "Revert the release branch.",
      exactApprovalPhrase: "BACKUP_FIRST_PRODUCTION_RELEASE_APPROVED",
      sourceLabel: "Release Desk",
    },
    { id: "AAP-2", title: "", action: "Missing title" },
    {
      id: "AAP-3",
      title: "Archived packet",
      action: "Old packet.",
      status: "archived",
    },
    {
      id: "AAP-4",
      title: "Approved packet",
      action: "Approved for review only.",
      status: "approved",
    },
    {
      id: "AAP-5",
      title: "Rejected packet",
      action: "Rejected after review.",
      status: "rejected",
    },
    {
      id: "AAP-6",
      title: "Deferred packet",
      action: "Deferred for later review.",
      status: "deferred",
    },
  ]);

  assert.equal(packets.length, 5);
  assert.deepEqual(summarizeApexOsApprovalPackets(packets), {
    total: 5,
    draft: 0,
    ready: 1,
    approved: 1,
    rejected: 1,
    deferred: 1,
    blocked: 0,
    archived: 1,
  });
});

test("flags missing readiness fields and unsafe packet text", () => {
  const packet = normalizeApexOsApprovalPacket({
    id: "AAP-UNSAFE",
    title: "Unsafe packet",
    action: "Store API key sk-test-123456789abc for provider setup.",
    sourceLabel: "Manual note",
  });

  assert.deepEqual(getApexOsApprovalPacketMissingFields(packet), [
    "Reason",
    "Affected scope",
    "Validation plan",
    "Rollback plan",
    "Exact approval phrase",
  ]);
  assert.equal(isApexOsApprovalPacketReady(packet), false);
  assert.equal(packet.blockedReasons.length, 1);
  assert.match(packet.action, /\[REDACTED\]/);

  const executed = normalizeApexOsApprovalPacket({
    id: "AAP-EXECUTE",
    title: "Execute packet",
    action: "Execute the approved action now.",
    status: "executed",
  });
  assert.equal(executed.status, "draft");
  assert.match(executed.blockedReasons.join(" "), /execution/);
});

test("provides approval templates with risk scoring and exact approval phrases", () => {
  assert.equal(APEX_OS_APPROVAL_PACKET_TEMPLATES.length >= 5, true);
  assert.equal(APEX_OS_APPROVAL_PACKET_TEMPLATES.some((template) => template.id === "deploy" && template.exactApprovalPhrase === "BACKUP_FIRST_PRODUCTION_RELEASE_APPROVED"), true);
  assert.equal(APEX_OS_APPROVAL_PACKET_TEMPLATES.every((template) => scoreApexOsApprovalPacketRisk(template).score > 0), true);
});
