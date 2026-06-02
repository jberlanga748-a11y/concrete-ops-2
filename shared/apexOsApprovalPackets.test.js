import assert from "node:assert/strict";
import test from "node:test";

import {
  getApexOsApprovalPacketMissingFields,
  isApexOsApprovalPacketReady,
  normalizeApexOsApprovalPacket,
  normalizeApexOsApprovalPackets,
  summarizeApexOsApprovalPackets,
} from "./apexOsApprovalPackets.js";

test("normalizes approval packets without approve or execute states", () => {
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

  assert.equal(packet.status, "draft");
  assert.equal(packet.requestedActionCategory, "deploy");
  assert.equal(packet.riskLevel, "high");
  assert.equal(isApexOsApprovalPacketReady(packet), true);
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
  ]);

  assert.equal(packets.length, 2);
  assert.deepEqual(summarizeApexOsApprovalPackets(packets), {
    total: 2,
    draft: 0,
    ready: 1,
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
});
