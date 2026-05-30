import assert from "node:assert/strict";
import test from "node:test";

import {
  LAST_YARD_COMPANY_DEFAULTS,
  calculateProposalLineTotal,
  calculateProposalTotals,
  concreteSpecRows,
  createBlankProposal,
  createSeedProposal,
  duplicateProposal,
  filterProposals,
  getNextProposalNumber,
  proposalStatusLabel,
  validateProposal,
} from "./proposal-utils.js";

test("proposal numbers increment within the proposal year", () => {
  assert.equal(getNextProposalNumber([], "2026-05-02"), "LYC-2026-0001");
  assert.equal(
    getNextProposalNumber([
      { proposalNumber: "LYC-2026-0001" },
      { proposalNumber: "LYC-2026-0007" },
      { proposalNumber: "LYC-2025-0099" },
    ], "2026-05-02"),
    "LYC-2026-0008",
  );
});

test("proposal totals include taxable subtotal, discount, deposit, and balance due", () => {
  const items = [
    { quantity: 2, unitPrice: 100, taxable: true },
    { quantity: 1, unitPrice: 50, taxable: false },
  ];

  assert.equal(calculateProposalLineTotal(items[0]), 200);
  assert.deepEqual(calculateProposalTotals(items, { taxRate: 10, discountAmount: 25, depositAmount: 100 }), {
    subtotal: 250,
    taxableSubtotal: 200,
    taxRate: 10,
    taxAmount: 20,
    discountAmount: 25,
    total: 245,
    depositAmount: 100,
    balanceDue: 145,
  });
});

test("seed proposal carries Last Yard GC sidewalk details", () => {
  const proposal = createSeedProposal(LAST_YARD_COMPANY_DEFAULTS);

  assert.equal(proposal.proposalType, "gc_prime");
  assert.equal(proposal.project.name, "Albany Commercial Sidewalk Replacement");
  assert.equal(proposal.client.companyName, "Example Prime Contractors LLC");
  assert.equal(proposal.lineItems.length, 5);
  assert.equal(proposal.company.ccb, "CCB #247389");
});

test("proposal validation blocks missing required fields and warns on optional gaps", () => {
  const proposal = createBlankProposal([], LAST_YARD_COMPANY_DEFAULTS);
  proposal.client.companyName = "";
  proposal.client.contactName = "";
  proposal.project.name = "";
  proposal.client.projectAddress = "";
  proposal.project.location = "";
  proposal.concreteSpecs = {};

  const result = validateProposal(proposal);
  assert.equal(result.errors.includes("Client/company or contact name is required."), true);
  assert.equal(result.errors.includes("Project name is required."), true);
  assert.equal(result.errors.includes("Project address or location is required."), true);
  assert.equal(result.warnings.includes("Concrete specs are not filled in."), true);
});

test("proposal filtering searches client, project, GC, and status fields", () => {
  const seed = createSeedProposal(LAST_YARD_COMPANY_DEFAULTS);
  const copy = duplicateProposal(seed, [seed], LAST_YARD_COMPANY_DEFAULTS);
  copy.status = "approved";
  copy.client.companyName = "Residential Client";
  copy.gcPrime.contractorName = "";
  copy.project.name = "Benton Patio";

  assert.deepEqual(filterProposals([seed, copy], { search: "Example Prime" }).map((proposal) => proposal.id), [seed.id]);
  assert.deepEqual(filterProposals([seed, copy], { search: "Benton" }).map((proposal) => proposal.id), [copy.id]);
  assert.deepEqual(filterProposals([seed, copy], { status: "Approved" }).map((proposal) => proposal.id), [copy.id]);
  assert.equal(proposalStatusLabel("sent"), "Sent");
});

test("concrete specs table keeps explicit yes/no values", () => {
  const rows = concreteSpecRows({
    thicknessInches: 4,
    psi: "3500 PSI",
    fiberMesh: false,
    pumpRequired: true,
  });

  assert.deepEqual(rows, [
    ["Thickness", "4 in"],
    ["PSI", "3500 PSI"],
    ["Fiber mesh", "No"],
    ["Pump required", "Yes"],
  ]);
});
