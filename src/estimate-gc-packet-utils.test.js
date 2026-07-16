import test from "node:test";
import assert from "node:assert/strict";

import { deriveEstimatePrintModel } from "../shared/estimatePrint.js";
import { deriveEstimateBackup } from "./estimate-backup-utils.js";
import {
  deriveEstimateGcPacketLite,
  getEstimateInternalNotesWithoutGcPacketLite,
  normalizeEstimateGcPacketLite,
  serializeEstimateGcPacketLite,
} from "./estimate-gc-packet-utils.js";
import { addEstimateSentSnapshot, deriveEstimateSentSnapshots, getEstimateVisibleInternalNotes, mergeEstimateGcPacketLite } from "./estimate-snapshot-utils.js";
import { calculateEstimateTotals } from "./estimate-utils.js";
import { applyEstimateTemplateStarter } from "./estimate-template-utils.js";

const baseEstimate = {
  id: "E-GC-1",
  title: "Commercial flatwork proposal",
  customer: { id: "C-1", name: "ABC Prime Contractors" },
  customerEmail: "pm@example.com",
  status: "draft",
  scopeSummary: "Scope of Work:\nPlace concrete flatwork.",
  customerNotes: "Customer Notes / Terms:\nProposal valid for 30 days.",
  internalNotes: "Visible office note.",
  taxRate: 0,
  feesTotal: 0,
  items: [
    { description: "Concrete placement", quantity: 10, unit: "CY", unitPrice: 500 },
  ],
};

test("old estimates without GC Lite content normalize safely", () => {
  assert.deepEqual(deriveEstimateGcPacketLite(baseEstimate), {
    proposalCoverNote: "",
    proposalSummary: "",
    qualifications: "",
    scheduleNotes: "",
    addendaRfiReferences: "",
    gcReviewNotes: "",
    internalPacketNotes: "",
  });
  assert.equal(getEstimateVisibleInternalNotes(baseEstimate), "Visible office note.");
});

test("GC Lite customer-facing and office-only fields normalize safely", () => {
  assert.deepEqual(normalizeEstimateGcPacketLite({
    proposalCoverNote: " Cover note\r\n",
    proposalSummary: " Summary ",
    qualifications: "Qualifications",
    scheduleNotes: "Schedule notes",
    addendaRfiReferences: "Addendum 01",
    gcReviewNotes: "Office review",
    internalPacketNotes: "Internal packet note",
  }), {
    proposalCoverNote: "Cover note",
    proposalSummary: "Summary",
    qualifications: "Qualifications",
    scheduleNotes: "Schedule notes",
    addendaRfiReferences: "Addendum 01",
    gcReviewNotes: "Office review",
    internalPacketNotes: "Internal packet note",
  });
});

test("GC Lite content stores as an internal structured block without changing totals", () => {
  const estimate = mergeEstimateGcPacketLite(baseEstimate, {
    proposalCoverNote: "Thank you for the opportunity to bid.",
    proposalSummary: "Commercial concrete scope for GC review.",
    qualifications: "Excludes permits unless noted.",
    scheduleNotes: "Schedule to be coordinated with GC.",
    addendaRfiReferences: "Addendum 01 reviewed.",
    gcReviewNotes: "Call PM before final send.",
    internalPacketNotes: "Need final addendum check.",
  });

  assert.equal(calculateEstimateTotals(estimate.items, estimate).grandTotal, 5000);
  assert.equal(estimate.scopeSummary, baseEstimate.scopeSummary);
  assert.equal(estimate.customerNotes, baseEstimate.customerNotes);
  assert.equal(getEstimateVisibleInternalNotes(estimate), "Visible office note.");
  assert.equal(deriveEstimateGcPacketLite(estimate).proposalSummary, "Commercial concrete scope for GC review.");
  assert.match(serializeEstimateGcPacketLite(deriveEstimateGcPacketLite(estimate)), /Apex HQ GC Packet Lite/);
});

test("GC Lite block is hidden from visible internal notes and removable from raw notes", () => {
  const estimate = mergeEstimateGcPacketLite(baseEstimate, {
    proposalCoverNote: "Cover",
    internalPacketNotes: "Internal packet note",
  });

  assert.equal(getEstimateVisibleInternalNotes(estimate), "Visible office note.");
  assert.equal(getEstimateInternalNotesWithoutGcPacketLite(estimate.internalNotes), "Visible office note.");
});

test("GC Lite merge preserves SOV backup and sent snapshot history", () => {
  const withBackup = {
    ...baseEstimate,
    internalNotes: [
      "Visible office note.",
      "[Apex HQ Estimate Backup]",
      JSON.stringify({ sovRows: [{ section: "Mobilization", amount: "1000" }], takeoffRows: [], notes: "Backup note." }),
      "[/Apex HQ Estimate Backup]",
    ].join("\n"),
  };
  const withSnapshot = addEstimateSentSnapshot(withBackup, {
    snapshotId: "snap-gc",
    createdAt: "2026-05-11T12:00:00.000Z",
  });
  const withGcLite = mergeEstimateGcPacketLite(withSnapshot, {
    proposalSummary: "GC summary",
    gcReviewNotes: "Office-only GC note",
  });

  assert.equal(deriveEstimateBackup(withGcLite).sovRows.length, 1);
  assert.equal(deriveEstimateSentSnapshots(withGcLite).length, 1);
  assert.equal(deriveEstimateGcPacketLite(withGcLite).gcReviewNotes, "Office-only GC note");
});

test("GC Lite customer-facing content prints while office-only packet notes stay hidden", () => {
  const estimate = mergeEstimateGcPacketLite(baseEstimate, {
    proposalCoverNote: "Customer-facing cover note",
    proposalSummary: "Future GC packet summary",
    qualifications: "Bid is based on Addendum 01.",
    scheduleNotes: "Schedule will be coordinated with the GC.",
    addendaRfiReferences: "RFI 03 reviewed.",
    gcReviewNotes: "Office strategy note",
    internalPacketNotes: "Missing internal packet item",
  });
  const model = deriveEstimatePrintModel(estimate, { presetId: "gcBidPacket" });
  const printedText = JSON.stringify(model);

  assert.deepEqual(model.gcPacketLiteSections.map((section) => section.title), [
    "Proposal Cover Note",
    "Proposal Summary",
    "Qualifications",
    "Schedule Notes",
    "Addenda / RFI References",
  ]);
  assert.equal(printedText.includes("Customer-facing cover note"), true);
  assert.equal(printedText.includes("Future GC packet summary"), true);
  assert.equal(printedText.includes("Bid is based on Addendum 01."), true);
  assert.equal(printedText.includes("Office strategy note"), false);
  assert.equal(printedText.includes("Missing internal packet item"), false);
  assert.equal(printedText.includes("Proposal valid for 30 days"), true);
});

test("estimate templates still work with GC Lite content", () => {
  const templated = applyEstimateTemplateStarter({
    ...baseEstimate,
    items: [],
  }, "sidewalk-walkway");
  const withGcLite = mergeEstimateGcPacketLite(templated, {
    proposalSummary: "GC summary after template.",
  });

  assert.equal(deriveEstimateGcPacketLite(withGcLite).proposalSummary, "GC summary after template.");
  assert.ok(Array.isArray(withGcLite.items));
  assert.equal(calculateEstimateTotals(withGcLite.items, withGcLite).grandTotal, 0);
});
