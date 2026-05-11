import assert from "node:assert/strict";
import test from "node:test";

import { deriveEstimatePrintModel } from "./estimatePrint.js";

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

