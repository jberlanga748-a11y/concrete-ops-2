import assert from "node:assert/strict";
import test from "node:test";

import {
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
