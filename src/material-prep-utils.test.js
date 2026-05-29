import assert from "node:assert/strict";
import test from "node:test";

import {
  MATERIAL_PREP_REVIEW_ONLY_GUARDRAILS,
  buildMaterialListSummary,
  buildMaterialPrepChecklist,
  buildMaterialPrepCopyText,
  buildMaterialPrepPrintPacket,
  buildPurchasingPrepPacket,
  buildPurchasingPrepRows,
  deriveMaterialPrepState,
} from "./material-prep-utils.js";

test("purchasing prep rows derive review-only material needs without pricing fields", () => {
  const rows = buildPurchasingPrepRows({
    id: "EST-1",
    items: [
      { id: "I-1", description: "4000 PSI concrete mix", quantity: 12, unit: "CY", unitPrice: 190, lineTotal: 2280 },
      { id: "I-2", description: "Crew labor install", quantity: 1, unit: "LS", unitPrice: 1200 },
      { id: "I-3", description: "Pump rental", quantity: 1, unit: "Day", unitPrice: 600 },
    ],
  });

  assert.equal(rows.length, 2);
  assert.deepEqual(rows.map((row) => row.category), ["material", "equipment"]);
  assert.equal(Object.hasOwn(rows[0], "unitPrice"), false);
  assert.equal(Object.hasOwn(rows[0], "lineTotal"), false);
  assert.match(rows[0].vendorNote, /Confirm availability/i);
  assert.match(rows[0].fieldNeed, /received 12 CY/i);
});

test("purchasing prep packet requires approved linked jobs and usable rows", () => {
  const packet = buildPurchasingPrepPacket(
    {
      id: "EST-1",
      title: "North slab",
      status: "approved",
      customerId: "C-1",
      jobId: "J-1",
      items: [{ id: "I-1", description: "Rebar steel", quantity: 400, unit: "LF", unitPrice: 2 }],
    },
    {
      customers: [{ id: "C-1", name: "North Customer" }],
      jobs: [{ id: "J-1", title: "North slab job" }],
    },
  );

  assert.equal(packet.ready, true);
  assert.equal(packet.customerName, "North Customer");
  assert.equal(packet.jobTitle, "North slab job");
  assert.equal(packet.counts.materials, 1);
  assert.equal(packet.blockers.length, 0);
});

test("material prep state uses approved estimates only and caps queue at seven", () => {
  const estimates = Array.from({ length: 9 }, (_, index) => ({
    id: `EST-${index + 1}`,
    title: `Approved ${index + 1}`,
    status: "approved",
    jobId: `J-${index + 1}`,
    items: [{ id: `I-${index + 1}`, description: "Concrete material", quantity: 1, unit: "CY" }],
  })).concat([
    { id: "DRAFT-1", title: "Draft", status: "draft", items: [{ description: "Concrete", quantity: 1, unit: "CY" }] },
  ]);
  const jobs = Array.from({ length: 9 }, (_, index) => ({ id: `J-${index + 1}`, title: `Job ${index + 1}` }));

  const state = deriveMaterialPrepState({ estimates, jobs });

  assert.equal(state.packets.length, 9);
  assert.equal(state.queue.length, 7);
  assert.equal(state.readyPackets.length, 9);
  assert.equal(state.kpis.length, 4);
});

test("material prep blocks unlinked approved estimates without mutating estimates", () => {
  const estimate = {
    id: "EST-1",
    title: "Approved but no job",
    status: "approved",
    items: [{ description: "Fence material", quantity: 80, unit: "LF", unitPrice: 12 }],
  };
  const state = deriveMaterialPrepState({ estimates: [estimate], jobs: [] });

  assert.equal(state.packets[0].ready, false);
  assert.match(state.packets[0].blockers.join(" "), /linked job/i);
  assert.equal(estimate.items[0].unitPrice, 12);
});

test("copy text excludes pricing and unsafe purchasing actions", () => {
  const packet = buildPurchasingPrepPacket(
    {
      id: "EST-1",
      title: "Safe packet",
      status: "approved",
      customerId: "C-1",
      jobId: "J-1",
      items: [{ id: "I-1", description: "Concrete material", quantity: 10, unit: "CY", unitPrice: 225, lineTotal: 2250 }],
    },
    {
      customers: [{ id: "C-1", name: "Customer" }],
      jobs: [{ id: "J-1", title: "Job" }],
    },
  );

  const copy = buildMaterialPrepCopyText(packet, { companyName: "Apex Test" });

  assert.match(copy, /Apex Test Material Prep/);
  assert.match(copy, /No vendor order/i);
  assert.doesNotMatch(copy, /\$\s*\d|unitPrice|lineTotal|Unit price:|Line total:|Margin:|Markup:/i);
  assert.doesNotMatch(copy, /order now|send to vendor|take payment/i);
});

test("print packet is internal review only and excludes prices", () => {
  const packet = buildPurchasingPrepPacket({
    id: "EST-1",
    title: "Print packet",
    status: "approved",
    jobId: "J-1",
    items: [{ id: "I-1", description: "Rebar material", quantity: 200, unit: "LF", unitPrice: 4 }],
  }, { jobs: [{ id: "J-1", title: "Job" }] });

  const printPacket = buildMaterialPrepPrintPacket(packet, {
    companyName: "Apex Test",
    companyProfile: { businessEmail: "ops@example.test", logoInitials: "AT" },
  });

  assert.equal(printPacket.packetMode, "internal");
  assert.equal(printPacket.companyName, "Apex Test");
  assert.equal(printPacket.sections.some((section) => section.title === "Guardrails"), true);
  assert.equal(JSON.stringify(printPacket).includes("unitPrice"), false);
  assert.equal(JSON.stringify(printPacket).includes("$"), false);
  assert.match(printPacket.disclaimerNote, /does not order materials/i);
});

test("material list summary groups material, equipment, subcontractor, and review rows without prices", () => {
  const packet = buildPurchasingPrepPacket({
    id: "EST-1",
    title: "Summary packet",
    status: "approved",
    jobId: "J-1",
    items: [
      { id: "I-1", description: "Concrete material", quantity: 10, unit: "CY", unitPrice: 225 },
      { id: "I-2", description: "Pump rental", quantity: 1, unit: "Day", unitPrice: 700 },
      { id: "I-3", description: "Trucking subcontractor", quantity: 1, unit: "LS", unitPrice: 1200 },
      { id: "I-4", description: "Special allowance", quantity: 1, unit: "EA", unitPrice: 300 },
    ],
  }, { jobs: [{ id: "J-1", title: "Job" }] });

  const summary = buildMaterialListSummary(packet);
  const summaryText = JSON.stringify(summary);

  assert.deepEqual(summary.map((section) => section.category), ["material", "equipment", "subcontractor", "review"]);
  assert.equal(summaryText.includes("unitPrice"), false);
  assert.equal(summaryText.includes("lineTotal"), false);
  assert.equal(summaryText.includes("$"), false);
});

test("material prep checklist stays manual and locks external actions", () => {
  const packet = buildPurchasingPrepPacket({
    id: "EST-1",
    title: "Checklist packet",
    status: "approved",
    jobId: "J-1",
    items: [{ id: "I-1", description: "Rebar material", quantity: 200, unit: "LF", unitPrice: 4 }],
  }, { jobs: [{ id: "J-1", title: "Job" }] });

  const checklist = buildMaterialPrepChecklist(packet);
  const checklistText = JSON.stringify(checklist);

  assert.equal(MATERIAL_PREP_REVIEW_ONLY_GUARDRAILS.length, 3);
  assert.equal(checklist.some((item) => item.id === "external_action_lock" && item.status === "locked"), true);
  assert.match(checklistText, /Do not send supplier messages/i);
  assert.match(checklistText, /place orders/i);
  assert.match(checklistText, /authorize payments/i);
});

test("material prep copy and print packets include manual checklist guardrails", () => {
  const packet = buildPurchasingPrepPacket({
    id: "EST-1",
    title: "Checklist output",
    status: "approved",
    jobId: "J-1",
    items: [{ id: "I-1", description: "Concrete material", quantity: 5, unit: "CY", unitPrice: 200 }],
  }, { jobs: [{ id: "J-1", title: "Job" }] });

  const copy = buildMaterialPrepCopyText(packet);
  const printPacket = buildMaterialPrepPrintPacket(packet);
  const printText = JSON.stringify(printPacket);

  assert.match(copy, /Manual prep checklist/i);
  assert.match(copy, /Keep external actions locked/i);
  assert.equal(printPacket.sections.some((section) => section.title === "Manual Prep Checklist"), true);
  assert.doesNotMatch(printText, /\$\s*\d|unitPrice|lineTotal|Unit price:|Line total:|Markup:|Margin:/i);
});
