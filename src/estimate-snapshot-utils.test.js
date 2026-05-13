import test from "node:test";
import assert from "node:assert/strict";

import { deriveEstimatePrintModel } from "../shared/estimatePrint.js";
import { deriveEstimateBackup } from "./estimate-backup-utils.js";
import { calculateEstimateOptionTotals, calculateEstimateTotals } from "./estimate-utils.js";
import {
  addEstimateSentSnapshot,
  createEstimateSentSnapshot,
  deriveEstimateSentSnapshots,
  getEstimateVisibleInternalNotes,
  mergeEstimateOfficeInternalNotes,
  mergeEstimateSentSnapshots,
  normalizeEstimateSentSnapshot,
} from "./estimate-snapshot-utils.js";

const baseEstimate = {
  id: "E-100",
  title: "Driveway proposal",
  status: "draft",
  customerId: "C-100",
  customerEmail: "owner@example.com",
  customer: { id: "C-100", name: "River City Concrete" },
  createdByName: "Office Admin",
  scopeSummary: "Scope of Work:\nPlace driveway.",
  customerNotes: [
    "Customer Notes / Terms:",
    "Customer-facing terms only.",
    "",
    "Alternates:",
    "- [optional] Extra broom finish | Amount: $250",
    "- [accepted] Thicker edge | Amount: $500",
  ].join("\n"),
  internalNotes: "Office estimating note.",
  taxRate: 0,
  feesTotal: 25,
  items: [
    { description: "Concrete placement", quantity: 2, unit: "CY", unitPrice: 1000 },
  ],
};

test("old estimates without sent history normalize safely", () => {
  assert.deepEqual(deriveEstimateSentSnapshots(baseEstimate), []);
  assert.equal(getEstimateVisibleInternalNotes(baseEstimate), "Office estimating note.");
});

test("snapshot records normalize safely", () => {
  assert.deepEqual(normalizeEstimateSentSnapshot({
    snapshotId: "snap-1",
    estimateId: "E-1",
    estimateTitle: "Test",
    customerName: " Customer ",
    customerEmail: " user@example.com ",
    method: "EMAIL",
    status: "SENT",
    baseTotal: "123.456",
    selectedOptionsTotal: "10.1",
  }), {
    snapshotId: "snap-1",
    estimateId: "E-1",
    estimateTitle: "Test",
    customerId: "",
    customerName: "Customer",
    customerEmail: "user@example.com",
    createdAt: "",
    sentAt: "",
    sentBy: "",
    sentByName: "",
    method: "email",
    status: "sent",
    baseTotal: 123.46,
    selectedOptionsTotal: 10.1,
    estimateStatusAtSend: "",
    notes: "",
  });
});

test("manual snapshot records current estimate summary", () => {
  const snapshot = createEstimateSentSnapshot(baseEstimate, {
    snapshotId: "snap-manual",
    createdAt: "2026-05-10T12:00:00.000Z",
    method: "manual",
    notes: "Recorded after customer call.",
  });

  assert.equal(snapshot.estimateId, "E-100");
  assert.equal(snapshot.estimateTitle, "Driveway proposal");
  assert.equal(snapshot.customerName, "River City Concrete");
  assert.equal(snapshot.customerEmail, "owner@example.com");
  assert.equal(snapshot.method, "manual");
  assert.equal(snapshot.status, "sent");
  assert.equal(snapshot.baseTotal, 2025);
  assert.equal(snapshot.selectedOptionsTotal, 500);
  assert.equal(snapshot.notes, "Recorded after customer call.");
});

test("sent snapshots persist as office-only internal notes without changing totals or items", () => {
  const withSnapshot = addEstimateSentSnapshot(baseEstimate, {
    snapshotId: "snap-1",
    createdAt: "2026-05-10T12:00:00.000Z",
    method: "manual",
  });

  assert.equal(calculateEstimateTotals(withSnapshot.items, withSnapshot).grandTotal, 2025);
  assert.equal(calculateEstimateOptionTotals(withSnapshot).totalWithSelectedOptions, 2525);
  assert.deepEqual(withSnapshot.items, baseEstimate.items);

  const snapshots = deriveEstimateSentSnapshots(withSnapshot);
  assert.equal(snapshots.length, 1);
  assert.equal(snapshots[0].snapshotId, "snap-1");
});

test("visible internal notes hide sent history while preserving estimate backup", () => {
  const withBackup = {
    ...baseEstimate,
    internalNotes: [
      "Visible note.",
      "[Apex HQ Estimate Backup]",
      JSON.stringify({ sovRows: [{ section: "Base", amount: "1000" }], takeoffRows: [], notes: "Backup only." }),
      "[/Apex HQ Estimate Backup]",
    ].join("\n"),
  };
  const withSnapshot = addEstimateSentSnapshot(withBackup, {
    snapshotId: "snap-1",
    createdAt: "2026-05-10T12:00:00.000Z",
  });

  assert.equal(getEstimateVisibleInternalNotes(withSnapshot), "Visible note.");
  assert.equal(deriveEstimateBackup(withSnapshot).sovRows.length, 1);
  assert.equal(deriveEstimateSentSnapshots(withSnapshot).length, 1);

  const edited = mergeEstimateOfficeInternalNotes(withSnapshot, "Updated visible note.");
  assert.equal(getEstimateVisibleInternalNotes(edited), "Updated visible note.");
  assert.equal(deriveEstimateBackup(edited).sovRows.length, 1);
  assert.equal(deriveEstimateSentSnapshots(edited).length, 1);
});

test("sent snapshots do not print customer-facing", () => {
  const withSnapshot = mergeEstimateSentSnapshots(baseEstimate, [{
    snapshotId: "snap-secret",
    estimateId: "E-100",
    estimateTitle: "Driveway proposal",
    customerName: "River City Concrete",
    customerEmail: "owner@example.com",
    createdAt: "2026-05-10T12:00:00.000Z",
    method: "manual",
    status: "sent",
    baseTotal: 2025,
    selectedOptionsTotal: 500,
    notes: "Office-only sent record.",
  }]);
  const printModel = deriveEstimatePrintModel(withSnapshot);
  const printedText = JSON.stringify(printModel);

  assert.equal(printedText.includes("snap-secret"), false);
  assert.equal(printedText.includes("Office-only sent record"), false);
  assert.equal(printedText.includes("Customer-facing terms only"), true);
});
