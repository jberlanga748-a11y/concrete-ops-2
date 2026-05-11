import assert from "node:assert/strict";
import test from "node:test";

import {
  buildEstimateCopyText,
  buildEstimateCustomerMessage,
  buildEstimateEmailSubject,
  buildEstimateDraftFromLead,
  buildScopeSummaryFromProposalSections,
  calculateEstimateLineTotal,
  calculateEstimateTotals,
  deriveEstimateListState,
  deriveEstimateProposalSections,
  estimateCustomerEmail,
  estimateStatusLabel,
  filterEstimates,
  formatEstimateCurrency,
  getEstimateFromLeadReadiness,
  mergeEstimateProposalSections,
} from "./estimate-utils.js";

test("line item totals and estimate totals calculate correctly", () => {
  const items = [
    { description: "Concrete", quantity: 10, unitPrice: 185 },
    { description: "Forms", quantity: 2, unitPrice: 125.5 },
  ];

  assert.equal(calculateEstimateLineTotal(items[0]), 1850);
  assert.deepEqual(calculateEstimateTotals(items, { taxRate: 10, feesTotal: 75 }), {
    subtotal: 2101,
    taxRate: 10,
    taxTotal: 210.1,
    feesTotal: 75,
    grandTotal: 2386.1,
  });
});

test("negative or invalid line items stay safe", () => {
  assert.equal(calculateEstimateLineTotal({ quantity: -3, unitPrice: 100 }), 0);
  assert.equal(calculateEstimateLineTotal({ quantity: "bad", unitPrice: 100 }), 0);
});

test("estimate filters support status customer lead creator archive and search", () => {
  const rows = [
    {
      id: "EST-1",
      status: "draft",
      title: "Martinez Driveway",
      scopeSummary: "Replace cracked driveway",
      internalNotes: "Office follow-up",
      customerNotes: "Phase one only",
      customer: { name: "Martinez Residence" },
      lead: { customer: "Martinez Residence", project: "Driveway replacement estimate" },
      createdByName: "Demo Admin",
      archivedAt: null,
      items: [{ description: "Concrete", unit: "yd" }],
    },
    {
      id: "EST-2",
      status: "archived",
      title: "ADA Ramp",
      customer: { name: "Salem Dental Office" },
      lead: null,
      createdByName: "Estimator Sam",
      archivedAt: "2026-04-25T10:00:00.000Z",
      items: [],
    },
  ];

  assert.equal(filterEstimates(rows, { status: "Draft" }).length, 1);
  assert.equal(filterEstimates(rows, { customer: "Martinez Residence" }).length, 1);
  assert.equal(filterEstimates(rows, { lead: "Martinez Residence — Driveway replacement estimate" }).length, 1);
  assert.equal(filterEstimates(rows, { createdBy: "Demo Admin" }).length, 1);
  assert.equal(filterEstimates(rows, { archived: "Archived" }).length, 1);
  assert.equal(filterEstimates(rows, { search: "phase one" }).length, 1);
});

test("derive estimate list state tolerates sparse inputs", () => {
  const state = deriveEstimateListState(
    [null, { customer: { name: "Martinez Residence" }, lead: { customer: "Martinez Residence", project: "Driveway replacement estimate" }, createdByName: "Demo Admin" }],
    [undefined, { name: "Salem Dental Office" }],
    [null, { customer: "Keizer Patio Project", project: "Stamped patio quote" }],
  );

  assert.deepEqual(state.customerOptions, ["All customers", "Martinez Residence", "Salem Dental Office"]);
  assert.deepEqual(state.creatorOptions, ["All creators", "Demo Admin"]);
  assert.equal(state.leadOptions.includes("Keizer Patio Project — Stamped patio quote"), true);
});

test("estimate helpers tolerate sparse estimate rows and missing item arrays", () => {
  const sparseRows = [
    null,
    undefined,
    {
      id: "EST-1",
      title: "Sparse draft",
      status: "draft",
      customer: null,
      lead: null,
      createdByName: null,
      items: null,
    },
  ];

  assert.equal(filterEstimates(sparseRows, { search: "sparse" }).length, 1);
  assert.deepEqual(calculateEstimateTotals(undefined), {
    subtotal: 0,
    taxRate: null,
    taxTotal: null,
    feesTotal: null,
    grandTotal: 0,
  });
});

test("status labels and currency formatting stay human friendly", () => {
  assert.equal(estimateStatusLabel("approved"), "Approved");
  assert.equal(formatEstimateCurrency(2386.1), "$2,386.10");
});

test("estimate draft prefill from lead uses existing linked customer without line items", () => {
  const lead = {
    id: "L-100",
    customerId: "C-100",
    customer: "Megan Carter",
    project: "Driveway replacement",
    source: "Lead Finder",
    followUpDueAt: "2026-05-12",
    nextStep: "Build proposal",
    notes: "Replace cracked driveway and apron.",
  };
  const customers = [{ id: "C-100", name: "Megan Carter", email: "megan@example.test" }];

  const draft = buildEstimateDraftFromLead(lead, { customers });

  assert.deepEqual(draft, {
    customerId: "C-100",
    leadId: "L-100",
    customerEmail: "megan@example.test",
    title: "Driveway replacement",
    status: "draft",
    scopeSummary: "Replace cracked driveway and apron.",
    internalNotes: [
      "Created from lead L-100.",
      "Lead source: Lead Finder.",
      "Lead next step: Build proposal.",
      "Lead follow-up due: 2026-05-12.",
      "Lead customer: Megan Carter.",
    ].join("\n"),
    customerNotes: "",
    taxRate: "",
    feesTotal: "",
    items: [],
  });
});

test("estimate draft from lead requires an existing linked customer before create", () => {
  const lead = { id: "L-101", customer: "Unlinked Lead", project: "Patio", notes: "Needs review." };

  const readiness = getEstimateFromLeadReadiness(lead, { customers: [] });
  const draft = buildEstimateDraftFromLead(lead, { customers: [] });

  assert.equal(readiness.canCreate, false);
  assert.equal(readiness.reason, "missing_customer");
  assert.match(readiness.message, /Link or convert this lead to a customer/);
  assert.equal(draft.customerId, "");
  assert.equal(draft.leadId, "L-101");
  assert.equal(draft.items.length, 0);
});

test("proposal section helpers keep old estimates safe", () => {
  const oldEstimate = {
    scopeSummary: "Remove existing driveway and pour 4-inch broom-finish concrete.",
    customerNotes: "Estimate valid for 30 days.",
    internalNotes: "Check pricing before sending.",
  };

  const sections = deriveEstimateProposalSections(oldEstimate);

  assert.deepEqual(sections, {
    scopeOfWork: "Remove existing driveway and pour 4-inch broom-finish concrete.",
    inclusions: "",
    exclusions: "",
    assumptions: "",
    customerNotes: "Estimate valid for 30 days.",
    internalNotes: "Check pricing before sending.",
  });
  assert.equal(buildScopeSummaryFromProposalSections(sections), oldEstimate.scopeSummary);
});

test("proposal section helpers store customer-facing sections in scope summary only", () => {
  const draft = mergeEstimateProposalSections({}, {
    scopeOfWork: "Sawcut, remove, form, pour, and broom finish driveway panels.",
    inclusions: "Concrete, formwork, standard cleanup.",
    exclusions: "Permit fees and utility relocation.",
    assumptions: "Existing base is suitable after removals.",
    customerNotes: "Two-day scheduling window after approval.",
    internalNotes: "Office-only margin note.",
  });

  assert.equal(draft.scopeSummary, [
    "Scope of Work:\nSawcut, remove, form, pour, and broom finish driveway panels.",
    "Inclusions:\nConcrete, formwork, standard cleanup.",
    "Exclusions:\nPermit fees and utility relocation.",
    "Assumptions / Clarifications:\nExisting base is suitable after removals.",
  ].join("\n\n"));
  assert.equal(draft.customerNotes, "Two-day scheduling window after approval.");
  assert.equal(draft.internalNotes, "Office-only margin note.");

  const parsed = deriveEstimateProposalSections(draft);
  assert.equal(parsed.inclusions, "Concrete, formwork, standard cleanup.");
  assert.equal(parsed.exclusions, "Permit fees and utility relocation.");
  assert.equal(parsed.assumptions, "Existing base is suitable after removals.");
});

test("estimate copy helpers include customer-facing pricing content without internal notes", () => {
  const estimate = {
    title: "Martinez Driveway Proposal",
    status: "sent",
    scopeSummary: "Replace cracked driveway panels and pour a broom-finish apron.",
    internalNotes: "Office-only follow-up note.",
    customerNotes: "Estimate is valid for 30 days.",
    customer: { name: "Martinez Residence", email: "martinez@example.test" },
    lead: { customer: "Martinez Residence", project: "Driveway replacement estimate" },
    items: [
      { description: "Demo and haul off", quantity: 1, unit: "LS", unitPrice: 1850 },
      { description: "Concrete placement", quantity: 9, unit: "yd", unitPrice: 215 },
    ],
    taxRate: 0,
    feesTotal: 125,
  };
  const companyProfile = {
    businessPhone: "(503) 555-0100",
    businessEmail: "office@concreteopsdemo.com",
  };

  const estimateCopy = buildEstimateCopyText({
    companyName: "Concrete Ops Demo Company",
    companyProfile,
    estimate,
  });
  const customerMessage = buildEstimateCustomerMessage({
    companyName: "Concrete Ops Demo Company",
    companyProfile,
    estimate,
  });

  assert.match(estimateCopy, /Concrete Ops Demo Company/);
  assert.match(estimateCopy, /Martinez Residence/);
  assert.match(estimateCopy, /Driveway replacement estimate/);
  assert.match(estimateCopy, /Grand total:/);
  assert.match(estimateCopy, /Estimate is valid for 30 days\./);
  assert.match(estimateCopy, /office@concreteopsdemo\.com/);
  assert.doesNotMatch(estimateCopy, /Office-only follow-up note\./);

  assert.match(customerMessage, /Hi Martinez Residence,/);
  assert.match(customerMessage, /Thank you for the opportunity to look at your project\./);
  assert.match(customerMessage, /Driveway replacement estimate/);
  assert.match(customerMessage, /Total estimate: \$3,910\.00/);
  assert.match(customerMessage, /Scope summary:\nReplace cracked driveway panels and pour a broom-finish apron\./);
  assert.match(customerMessage, /Notes:\nEstimate is valid for 30 days\./);
  assert.match(customerMessage, /Concrete Ops Demo Company/);
  assert.match(customerMessage, /\(503\) 555-0100/);
  assert.match(customerMessage, /office@concreteopsdemo\.com/);
  assert.doesNotMatch(customerMessage, /Line items:/);
  assert.doesNotMatch(customerMessage, /Concrete placement/);
  assert.doesNotMatch(customerMessage, /Grand total:/);
  assert.doesNotMatch(customerMessage, /Office-only follow-up note\./);

  assert.equal(estimateCustomerEmail(estimate), "martinez@example.test");
  assert.equal(estimateCustomerEmail({ ...estimate, customerEmail: "proposal-recipient@example.test" }), "proposal-recipient@example.test");
  assert.equal(buildEstimateEmailSubject({ estimate }), "Estimate for Driveway replacement estimate");
});
