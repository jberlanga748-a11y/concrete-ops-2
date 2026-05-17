import assert from "node:assert/strict";
import test from "node:test";

import { calculateEstimateTotals } from "./estimate-utils.js";
import { applyEstimateTemplateStarter } from "./estimate-template-utils.js";
import {
  createEmptyReferenceAttachmentRow,
  createEmptySovRow,
  createEmptyTakeoffRow,
  deriveEstimateBackup,
  getEstimateInternalNotesWithoutBackup,
  mergeEstimateBackup,
  mergeEstimateInternalNotes,
  normalizeEstimateBackup,
  normalizeEstimateReferenceAttachmentRow,
  normalizeEstimateSovRow,
  normalizeEstimateTakeoffRow,
  serializeEstimateBackup,
} from "./estimate-backup-utils.js";
import { buildPrintDocumentHtml, deriveEstimatePrintPacket } from "./print-packets.js";

test("old estimates without backup fields normalize safely", () => {
  assert.deepEqual(deriveEstimateBackup({ internalNotes: "Office-only note." }), {
    sovRows: [],
    takeoffRows: [],
    referenceRows: [],
    notes: "",
  });
  assert.equal(getEstimateInternalNotesWithoutBackup("Office-only note."), "Office-only note.");
  assert.deepEqual(createEmptySovRow(), {
    section: "",
    description: "",
    quantity: "",
    unit: "",
    amount: "",
    notes: "",
  });
  assert.deepEqual(createEmptyTakeoffRow(), {
    item: "",
    quantity: "",
    unit: "",
    source: "",
    estimatorNote: "",
  });
  assert.deepEqual(createEmptyReferenceAttachmentRow(), {
    fileName: "",
    referenceType: "",
    url: "",
    source: "",
    notes: "",
  });
});

test("SOV rows and backup notes normalize safely", () => {
  const row = normalizeEstimateSovRow({
    item: "  Mobilization  ",
    description: " Job setup ",
    quantity: " 1 ",
    unit: " LS ",
    amount: " 2500 ",
    notes: " Review before billing ",
  });

  assert.deepEqual(row, {
    section: "Mobilization",
    description: "Job setup",
    quantity: "1",
    unit: "LS",
    amount: "2500",
    notes: "Review before billing",
  });

  assert.deepEqual(normalizeEstimateBackup({
    sovRows: [row, createEmptySovRow()],
    takeoffRows: [],
    referenceRows: [],
    notes: "  estimator backup note  ",
  }), {
    sovRows: [row],
    takeoffRows: [],
    referenceRows: [],
    notes: "estimator backup note",
  });
});

test("takeoff rows normalize safely", () => {
  const row = normalizeEstimateTakeoffRow({
    item: "  4\" sidewalk  ",
    quantity: " 120 ",
    unit: " SF ",
    sheet: " A1.1 ",
    notes: " Includes landing ",
  });

  assert.deepEqual(row, {
    item: "4\" sidewalk",
    quantity: "120",
    unit: "SF",
    source: "A1.1",
    estimatorNote: "Includes landing",
  });
});

test("reference attachment rows normalize safely", () => {
  const row = normalizeEstimateReferenceAttachmentRow({
    name: "  Bluebeam slab takeoff.png  ",
    type: " Screenshot ",
    link: " https://files.example.test/takeoff.png ",
    sheet: " A2.0 ",
    estimatorNote: " Shows 500 SF slab area ",
  });

  assert.deepEqual(row, {
    fileName: "Bluebeam slab takeoff.png",
    referenceType: "Screenshot",
    url: "https://files.example.test/takeoff.png",
    source: "A2.0",
    notes: "Shows 500 SF slab area",
  });
});

test("backup data stores in internal notes without overwriting line items or visible notes", () => {
  const estimate = {
    internalNotes: "Call supplier before final send.",
    items: [{ description: "Concrete placement", quantity: 8, unit: "yd", unitPrice: 225 }],
  };
  const next = mergeEstimateBackup(estimate, {
    sovRows: [{ section: "Concrete", description: "Placement", quantity: "8", unit: "CY", amount: "1800", notes: "Backup only" }],
    takeoffRows: [{ item: "Concrete volume", quantity: "8", unit: "CY", source: "Takeoff sheet", estimatorNote: "Round up after waste review" }],
    referenceRows: [{ fileName: "Bluebeam takeoff.png", referenceType: "Screenshot", url: "https://files.example.test/takeoff.png", source: "A2.0", notes: "Office proof only" }],
    notes: "Backup rows do not change line items.",
  });

  assert.deepEqual(next.items, estimate.items);
  assert.equal(getEstimateInternalNotesWithoutBackup(next.internalNotes), "Call supplier before final send.");
  assert.deepEqual(deriveEstimateBackup(next), {
    sovRows: [{ section: "Concrete", description: "Placement", quantity: "8", unit: "CY", amount: "1800", notes: "Backup only" }],
    takeoffRows: [{ item: "Concrete volume", quantity: "8", unit: "CY", source: "Takeoff sheet", estimatorNote: "Round up after waste review" }],
    referenceRows: [{ fileName: "Bluebeam takeoff.png", referenceType: "Screenshot", url: "https://files.example.test/takeoff.png", source: "A2.0", notes: "Office proof only" }],
    notes: "Backup rows do not change line items.",
  });
});

test("backup rows do not affect estimate base totals", () => {
  const estimate = mergeEstimateBackup({
    items: [{ description: "Base work", quantity: 2, unitPrice: 100 }],
    taxRate: 10,
    feesTotal: 50,
  }, {
    sovRows: [{ section: "Backup SOV", amount: "9999" }],
    takeoffRows: [{ item: "Backup takeoff", quantity: "9999", unit: "SF" }],
  });

  assert.deepEqual(calculateEstimateTotals(estimate.items, {
    taxRate: estimate.taxRate,
    feesTotal: estimate.feesTotal,
  }), {
    subtotal: 200,
    taxRate: 10,
    taxTotal: 20,
    feesTotal: 50,
    grandTotal: 270,
  });
});

test("internal note edits preserve existing backup block", () => {
  const estimate = mergeEstimateBackup({ internalNotes: "Old office note." }, {
    sovRows: [{ section: "Demo", amount: "1200" }],
  });
  const next = mergeEstimateInternalNotes(estimate, "Updated office note.");

  assert.equal(getEstimateInternalNotesWithoutBackup(next.internalNotes), "Updated office note.");
  assert.equal(deriveEstimateBackup(next).sovRows[0].section, "Demo");
});

test("backup data does not print customer-facing estimate output", () => {
  const estimate = mergeEstimateBackup({
    title: "Backup-safe proposal",
    scopeSummary: "Customer-facing scope.",
    customerNotes: "Customer-facing terms.",
    internalNotes: "Private estimator note.",
    customer: { name: "Martinez Residence" },
    items: [{ description: "Concrete placement", quantity: 1, unit: "LS", unitPrice: 1000 }],
  }, {
    sovRows: [{ section: "Private SOV", description: "Do not print", amount: "1000" }],
    takeoffRows: [{ item: "Private takeoff", quantity: "200", unit: "SF", source: "Estimator worksheet" }],
    referenceRows: [{ fileName: "Private takeoff photo.jpg", referenceType: "Photo", url: "https://files.example.test/private.jpg", notes: "Do not print" }],
    notes: "Estimator backup only.",
  });

  const html = buildPrintDocumentHtml(deriveEstimatePrintPacket({ estimate }));

  assert.match(html, /Backup-safe proposal/);
  assert.match(html, /Customer-facing scope/);
  assert.doesNotMatch(html, /Private estimator note/);
  assert.doesNotMatch(html, /Private SOV/);
  assert.doesNotMatch(html, /Private takeoff/);
  assert.doesNotMatch(html, /Private takeoff photo/);
  assert.doesNotMatch(html, /files\.example\.test\/private/);
  assert.doesNotMatch(html, /Estimator backup only/);
  assert.doesNotMatch(html, /Apex HQ Estimate Backup/);
});

test("estimate template starters continue to work with backup notes", () => {
  const estimate = mergeEstimateBackup(applyEstimateTemplateStarter({
    customerId: "C-1",
    leadId: "L-1",
    items: [],
  }, "concrete-flatwork"), {
    notes: "Confirm takeoff before sending.",
  });

  assert.equal(estimate.customerId, "C-1");
  assert.equal(estimate.leadId, "L-1");
  assert.equal(estimate.items.length > 0, true);
  assert.equal(deriveEstimateBackup(estimate).notes, "Confirm takeoff before sending.");
  assert.equal(serializeEstimateBackup(deriveEstimateBackup(estimate)).includes("Confirm takeoff before sending."), true);
});
