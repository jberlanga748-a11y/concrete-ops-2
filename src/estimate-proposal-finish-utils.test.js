import assert from "node:assert/strict";
import test from "node:test";

import { mergeEstimateBackup } from "./estimate-backup-utils.js";
import { mergeEstimateGcPacketLite } from "./estimate-snapshot-utils.js";
import { mergeEstimateProposalSections } from "./estimate-utils.js";
import { deriveEstimateProposalFinishState } from "./estimate-proposal-finish-utils.js";
import { resolveEstimatePacketSettings } from "../shared/estimatePacketPresets.js";

const OFFICE_PERMISSIONS = {
  estimates: {
    canView: true,
    canManage: true,
  },
};

function fullEstimate(overrides = {}) {
  const withSections = mergeEstimateProposalSections({
    id: "EST-100",
    title: "Martinez Cedar Fence Proposal",
    status: "approved",
    customerId: "C-100",
    customerName: "Martinez Residence",
    customerEmail: "martinez@example.test",
    customer: { id: "C-100", name: "Martinez Residence", email: "martinez@example.test" },
    items: [
      { description: "Remove old fence", quantity: 1, unit: "LS", unitPrice: 1800 },
      { description: "Install cedar fence", quantity: 150, unit: "LF", unitPrice: 42 },
    ],
    taxRate: "",
    feesTotal: 150,
    internalNotes: "Foreman handoff: confirm access, capture before/after photos, and save delivery ticket.",
  }, {
    scopeOfWork: "Remove failing cedar fence sections and install new cedar posts, rails, pickets, and two gates.",
    inclusions: "Labor, standard materials, cleanup, and gate hardware.",
    exclusions: "Permits, hidden utility relocation, and work outside listed fence runs.",
    assumptions: "Customer provides access and existing grade is suitable.",
    customerNotes: "Estimate valid for 30 days.",
    alternates: [
      { title: "Premium gate hardware", amount: 450, status: "selected", description: "Upgrade hinges and latch." },
    ],
    addOns: [
      { title: "Post-stain prep", amount: 300, status: "optional", description: "Prep fence for later staining." },
    ],
  });
  const withBackup = mergeEstimateBackup(withSections, {
    takeoffRows: [{ item: "Fence run", quantity: "150", unit: "LF", source: "Site measure", estimatorNote: "Office-only takeoff backup." }],
    referenceRows: [{ fileName: "Fence before photo.jpg", referenceType: "Photo", source: "Field upload", notes: "Customer-safe proof reference." }],
    notes: "Private estimator backup note.",
  });
  const withGc = mergeEstimateGcPacketLite(withBackup, {
    proposalCoverNote: "Thank you for the opportunity to price the fence work.",
    proposalSummary: "Cedar fence replacement with two gates.",
    qualifications: "Based on reviewed site access and listed scope.",
    scheduleNotes: "Schedule after customer approval and material confirmation.",
    addendaRfiReferences: "No addenda currently open.",
    gcReviewNotes: "Office-only bid strategy.",
    internalPacketNotes: "Internal packet assembly note.",
  });
  return { ...withGc, ...overrides };
}

test("proposal finish state marks customer, GC, options, evidence, and field handoff ready", () => {
  const state = deriveEstimateProposalFinishState({
    estimate: fullEstimate(),
    permissions: OFFICE_PERMISSIONS,
    packetSettings: resolveEstimatePacketSettings({ presetId: "gcPrimeProposalPacket" }),
    canUseGcPackets: true,
    emailSendingConfigured: false,
  });

  assert.equal(state.canView, true);
  assert.equal(state.mode, "review_first_estimate_proposal_finish");
  assert.equal(state.status, "Finished packet ready");
  assert.equal(state.stats.optionChoices > 0, true);
  assert.equal(state.stats.evidenceSections > 0, true);
  assert.equal(state.stats.gcSections >= 3, true);
  assert.equal(state.stats.handoffReady, true);
  assert.equal(state.readinessRows.find((row) => row.id === "send-mode").ready, false);
  assert.equal(state.providerRows.find((row) => row.label === "Email provider").value, "Needs account/API key");
  assert.equal(state.customerPacketRows.find((row) => row.label === "Customer-safe print").value, "Clean");
  assert.match(state.safetyBoundary, /pricing-free/);
});

test("proposal finish state exposes email configured without bypassing human send", () => {
  const state = deriveEstimateProposalFinishState({
    estimate: fullEstimate(),
    permissions: OFFICE_PERMISSIONS,
    packetSettings: resolveEstimatePacketSettings({ presetId: "customerProposalPacket" }),
    canUseGcPackets: true,
    emailSendingConfigured: true,
  });

  assert.equal(state.readinessRows.find((row) => row.id === "send-mode").ready, true);
  assert.equal(state.providerRows.find((row) => row.label === "Email provider").value, "Configured");
  assert.equal(state.providerRows.find((row) => row.label === "Customer send").value, "Human-confirmed only");
  assert.equal(state.blockedActions.some((action) => /No customer email/i.test(action)), true);
});

test("proposal finish state flags missing terms, exclusions, evidence, and packet backup", () => {
  const state = deriveEstimateProposalFinishState({
    estimate: {
      id: "EST-101",
      title: "Thin Draft",
      status: "draft",
      customerId: "C-101",
      customerName: "Thin Customer",
      customerEmail: "thin@example.test",
      scopeSummary: "Replace fence.",
      items: [{ description: "Fence work", quantity: 1, unit: "LS", unitPrice: 5000 }],
    },
    permissions: OFFICE_PERMISSIONS,
    packetSettings: resolveEstimatePacketSettings({ presetId: "gcBidPacket" }),
    canUseGcPackets: true,
  });

  assert.equal(state.status, "Needs proposal polish");
  assert.equal(state.readinessRows.find((row) => row.id === "terms").ready, false);
  assert.equal(state.readinessRows.find((row) => row.id === "evidence").ready, false);
  assert.equal(state.readinessRows.find((row) => row.id === "gc-packet").ready, false);
  assert.equal(state.readinessRows.find((row) => row.id === "foreman-handoff").ready, false);
});

test("field roles are blocked from proposal finish packets", () => {
  const state = deriveEstimateProposalFinishState({
    estimate: fullEstimate(),
    permissions: {
      jobs: { canManageField: true, canManageAll: false },
      estimates: { canView: false, canManage: false },
    },
  });

  assert.equal(state.canView, false);
  assert.equal(state.mode, "blocked_estimate_proposal_finish");
  assert.deepEqual(state.readinessRows, []);
  assert.match(state.safetyBoundary, /Field users stay blocked/i);
});

test("customer-safe output does not expose internal notes or private backup blocks", () => {
  const state = deriveEstimateProposalFinishState({
    estimate: fullEstimate({
      internalNotes: [
        fullEstimate().internalNotes,
        "Office-only margin note and profit strategy.",
        "Payroll should never appear.",
        "Private file URL file:///C:/secret/takeoff.pdf",
      ].join("\n"),
    }),
    permissions: OFFICE_PERMISSIONS,
    packetSettings: resolveEstimatePacketSettings({ presetId: "internalReviewPacket", allowInternalSections: true }),
    canUseGcPackets: true,
  });

  assert.equal(state.customerPacketRows.find((row) => row.label === "Customer-safe print").value, "Clean");
  assert.equal(state.blockedActions.some((action) => /margin, profit, payroll/i.test(action)), true);
  assert.equal(state.stats.internalSections > 0, true);
});
