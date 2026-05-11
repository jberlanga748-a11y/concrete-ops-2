import assert from "node:assert/strict";
import test from "node:test";

import { deriveEstimatePrintModel } from "./estimatePrint.js";

function gcPacketLiteBlock(fields = {}) {
  return [
    "[Concrete Ops GC Packet Lite]",
    JSON.stringify(fields),
    "[/Concrete Ops GC Packet Lite]",
  ].join("\n");
}

test("estimate print model separates proposal sections and excludes internal notes", () => {
  const model = deriveEstimatePrintModel({
    scopeSummary: [
      "Scope of Work:",
      "Remove driveway panels.",
      "",
      "Inclusions:",
      "Sawcut and haul off.",
      "",
      "Exclusions:",
      "Permit fees.",
      "",
      "Assumptions / Clarifications:",
      "Access is clear.",
    ].join("\n"),
    customerNotes: "Customer Notes / Terms:\nValid for 30 days.",
    internalNotes: "Office-only margin note.",
  });

  assert.deepEqual(model.proposalSections.map((section) => section.title), [
    "Scope of Work",
    "Inclusions",
    "Exclusions",
    "Assumptions / Clarifications",
  ]);
  assert.equal(model.proposalSections[0].text, "Remove driveway panels.");
  assert.equal(model.customerNotes, "Valid for 30 days.");
  assert.doesNotMatch(JSON.stringify(model), /Office-only margin note/);
});

test("estimate print model includes safe GC Lite sections and excludes office-only packet notes", () => {
  const model = deriveEstimatePrintModel({
    internalNotes: [
      "Office-only margin note.",
      gcPacketLiteBlock({
        proposalCoverNote: "Thank you for the opportunity to price this work.",
        proposalSummary: "GC-facing commercial concrete summary.",
        qualifications: "Proposal is based on plans dated May 1.",
        scheduleNotes: "Schedule to be coordinated with the GC.",
        addendaRfiReferences: "RFI 03 and Addendum 01 reviewed.",
        gcReviewNotes: "Office-only GC strategy.",
        internalPacketNotes: "Missing internal packet item.",
      }),
      "[Concrete Ops Estimate Backup]",
      JSON.stringify({ notes: "Private SOV backup" }),
      "[/Concrete Ops Estimate Backup]",
      "[Concrete Ops Sent Proposal History]",
      JSON.stringify([{ snapshotId: "snap-private", notes: "Private sent history" }]),
      "[/Concrete Ops Sent Proposal History]",
    ].join("\n"),
  });

  assert.deepEqual(model.gcPacketLiteSections.map((section) => section.title), [
    "Proposal Cover Note",
    "Proposal Summary",
    "Qualifications",
    "Schedule Notes",
    "Addenda / RFI References",
  ]);
  assert.equal(model.gcPacketLiteSections[0].text, "Thank you for the opportunity to price this work.");

  const printedText = JSON.stringify(model);
  assert.match(printedText, /GC-facing commercial concrete summary/);
  assert.match(printedText, /RFI 03 and Addendum 01 reviewed/);
  assert.doesNotMatch(printedText, /Office-only margin note/);
  assert.doesNotMatch(printedText, /Office-only GC strategy/);
  assert.doesNotMatch(printedText, /Missing internal packet item/);
  assert.doesNotMatch(printedText, /Private SOV backup/);
  assert.doesNotMatch(printedText, /Private sent history/);
  assert.doesNotMatch(printedText, /Concrete Ops GC Packet Lite/);
});

test("estimate print model parses alternates and add-ons with conservative selected totals", () => {
  const model = deriveEstimatePrintModel({
    items: [{ description: "Base slab", quantity: 1, unit: "LS", unitPrice: 10000 }],
    customerNotes: [
      "Customer Notes / Terms:",
      "Schedule after approval.",
      "",
      "Alternates:",
      "- [optional] Stamped border | Amount: $1,250.00 | Description: Add stamped border.",
      "- [accepted] Thicker edge | Amount: $900.00",
      "- [excluded] Extra sawcutting | Amount: $300.00",
      "",
      "Optional Add-ons:",
      "- [selected] Sealer | Amount: $450.00",
      "- [included] Extra cleanup | Amount: $125.00",
    ].join("\n"),
  });

  assert.equal(model.options.alternates.length, 3);
  assert.equal(model.options.addOns.length, 2);
  assert.equal(model.options.alternates[0].status, "optional");
  assert.equal(model.options.alternates[1].affectsSelectedTotal, true);
  assert.equal(model.options.alternates[2].affectsSelectedTotal, false);
  assert.equal(model.options.selectedOptionsTotal, 1475);
  assert.equal(model.options.totalWithSelectedOptions, 11475);
});

test("estimate print model keeps old plain estimates safe", () => {
  const model = deriveEstimatePrintModel({
    scopeSummary: "Replace cracked driveway panels.",
    customerNotes: "Estimate is valid for 30 days.",
    items: [],
  });

  assert.equal(model.proposalSections.length, 1);
  assert.equal(model.proposalSections[0].title, "Scope of Work");
  assert.equal(model.proposalSections[0].text, "Replace cracked driveway panels.");
  assert.equal(model.customerNotes, "Estimate is valid for 30 days.");
  assert.equal(model.options.hasSelectedOptionsTotal, false);
  assert.equal(model.lineItems.length, 0);
});
