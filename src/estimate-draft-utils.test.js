import assert from "node:assert/strict";
import test from "node:test";

import {
  ESTIMATE_PROPOSAL_TYPE_OPTIONS,
  INITIAL_ESTIMATE_FORM,
  applyEstimateProposalTypeToDraft,
  createEstimateDraft,
  createEstimateLineItemDraft,
  getEstimateProposalTypeOption,
  makeDraftRowId,
} from "./estimate-draft-utils.js";
import { deriveEstimateGcPacketLite } from "./estimate-gc-packet-utils.js";
import { deriveEstimateProposalSections } from "./estimate-utils.js";

test("createEstimateDraft normalizes empty estimate form defaults", () => {
  const draft = createEstimateDraft(INITIAL_ESTIMATE_FORM);

  assert.equal(draft.status, "draft");
  assert.equal(draft.customerName, "");
  assert.equal(draft.proposalPacketType, "residential");
  assert.equal(draft.items.length, 1);
  assert.equal(draft.items[0].description, "");
  assert.equal(draft.items[0].quantity, 1);
  assert.match(draft.items[0].id, /^estimate-item-/);
});

test("createEstimateDraft preserves linked record fields and line item values", () => {
  const draft = createEstimateDraft({
    customerId: "customer-1",
    leadId: "lead-1",
    customer: { name: "Martinez Concrete" },
    customerEmail: "owner@example.com",
    title: "Driveway proposal",
    trade: "concrete",
    status: "sent",
    items: [{ id: "line-1", description: "Prep and pour", quantity: 12, unit: "yd", unitPrice: 325 }],
  });

  assert.equal(draft.customerId, "customer-1");
  assert.equal(draft.leadId, "lead-1");
  assert.equal(draft.customerName, "Martinez Concrete");
  assert.equal(draft.customerEmail, "owner@example.com");
  assert.equal(draft.title, "Driveway proposal");
  assert.equal(draft.proposalPacketType, "residential");
  assert.deepEqual(draft.items[0], {
    id: "line-1",
    description: "Prep and pour",
    quantity: 12,
    unit: "yd",
    unitPrice: 325,
  });
});

test("estimate line draft ids use the requested prefix", () => {
  assert.match(makeDraftRowId("custom"), /^custom-/);
  assert.match(createEstimateLineItemDraft().id, /^estimate-item-/);
});

test("proposal type starters expose residential commercial and GC estimate choices", () => {
  assert.deepEqual(ESTIMATE_PROPOSAL_TYPE_OPTIONS.map((option) => option.id), ["residential", "commercial", "gc"]);
  assert.equal(getEstimateProposalTypeOption("commercial").packetPresetId, "commercialSubcontractorPacket");
  assert.equal(getEstimateProposalTypeOption("gc").packetPresetId, "gcPrimeProposalPacket");
});

test("proposal type starter fills customer-safe estimate packet sections", () => {
  const draft = applyEstimateProposalTypeToDraft(createEstimateDraft({
    ...INITIAL_ESTIMATE_FORM,
    customerName: "Valley Property Care",
    title: "Office ADA ramp proposal",
  }), "commercial");
  const sections = deriveEstimateProposalSections(draft);

  assert.equal(draft.proposalPacketType, "commercial");
  assert.match(sections.scopeOfWork, /commercial work area/i);
  assert.match(sections.customerNotes, /Progress billing/i);
  assert.doesNotMatch(draft.internalNotes, /payroll|margin|profit/i);
});

test("GC proposal starter can fill GC packet lite without private review notes", () => {
  const draft = applyEstimateProposalTypeToDraft(createEstimateDraft(INITIAL_ESTIMATE_FORM), "gc");
  const packet = deriveEstimateGcPacketLite(draft);

  assert.equal(draft.proposalPacketType, "gc");
  assert.match(packet.proposalCoverNote, /GC \/ prime bid package/i);
  assert.match(packet.addendaRfiReferences, /drawing sheets/i);
  assert.equal(packet.gcReviewNotes, "");
  assert.equal(packet.internalPacketNotes, "");
});

test("GC proposal starter can stay customer-section only when packet tools are unavailable", () => {
  const draft = applyEstimateProposalTypeToDraft(createEstimateDraft(INITIAL_ESTIMATE_FORM), "gc", {
    includeGcPacket: false,
  });
  const packet = deriveEstimateGcPacketLite(draft);
  const sections = deriveEstimateProposalSections(draft);

  assert.equal(draft.proposalPacketType, "gc");
  assert.match(sections.scopeOfWork, /bid scope/i);
  assert.deepEqual(packet, {
    proposalCoverNote: "",
    proposalSummary: "",
    qualifications: "",
    scheduleNotes: "",
    addendaRfiReferences: "",
    gcReviewNotes: "",
    internalPacketNotes: "",
  });
});
