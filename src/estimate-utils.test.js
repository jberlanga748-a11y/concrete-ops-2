import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateEstimateLineTotal,
  calculateEstimateTotals,
  deriveEstimateListState,
  estimateStatusLabel,
  filterEstimates,
  formatEstimateCurrency,
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
    [{ customer: { name: "Martinez Residence" }, lead: { customer: "Martinez Residence", project: "Driveway replacement estimate" }, createdByName: "Demo Admin" }],
    [{ name: "Salem Dental Office" }],
    [{ customer: "Keizer Patio Project", project: "Stamped patio quote" }],
  );

  assert.deepEqual(state.customerOptions, ["All customers", "Martinez Residence", "Salem Dental Office"]);
  assert.deepEqual(state.creatorOptions, ["All creators", "Demo Admin"]);
  assert.equal(state.leadOptions.includes("Keizer Patio Project — Stamped patio quote"), true);
});

test("status labels and currency formatting stay human friendly", () => {
  assert.equal(estimateStatusLabel("approved"), "Approved");
  assert.equal(formatEstimateCurrency(2386.1), "$2,386.10");
});
