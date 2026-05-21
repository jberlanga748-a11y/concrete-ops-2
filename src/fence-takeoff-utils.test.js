import assert from "node:assert/strict";
import test from "node:test";

import {
  buildFenceTakeoffBackupRows,
  buildFenceTakeoffDraftLineItems,
  buildFenceTakeoffFieldHandoff,
  buildFenceTakeoffProposalSummary,
  calculateFenceLineFeet,
  mergeFenceTakeoffIntoDraft,
  normalizeFenceTakeoff,
  summarizeFenceTakeoffByAssembly,
} from "./fence-takeoff-utils.js";

const salemFenceLine = {
  type: "Feature",
  properties: {},
  geometry: {
    type: "LineString",
    coordinates: [
      [-123.0351, 44.9429],
      [-123.0349, 44.9429],
    ],
  },
};

test("calculates estimate-grade linear feet from GeoJSON line strings", () => {
  const feet = calculateFenceLineFeet(salemFenceLine);
  assert.equal(feet > 45, true);
  assert.equal(feet < 60, true);
  assert.equal(calculateFenceLineFeet({ type: "Feature", geometry: { type: "Point", coordinates: [-123, 45] } }), 0);
});

test("normalizes fence takeoff segments and totals gates", () => {
  const takeoff = normalizeFenceTakeoff({
    address: "  123 Fence Ave, Salem OR  ",
    segments: [
      { label: "Back run", material: "Cedar", height: "6 ft", fenceType: "Privacy", gates: "1", geojson: salemFenceLine },
      { label: "Side return", material: "Cedar", height: "6 ft", fenceType: "Privacy", gates: "0", linearFeet: "38.4" },
    ],
  });

  assert.equal(takeoff.address, "123 Fence Ave, Salem OR");
  assert.equal(takeoff.segments.length, 2);
  assert.equal(takeoff.gateCount, 1);
  assert.equal(takeoff.totalLinearFeet > 80, true);
  assert.match(takeoff.accuracyDisclaimer, /Estimate-grade satellite takeoff only/);
});

test("groups takeoff by fence assembly for draft quantities", () => {
  const takeoff = {
    segments: [
      { label: "A", material: "Cedar", height: "6 ft", fenceType: "Privacy", linearFeet: 50, gates: 1 },
      { label: "B", material: "Cedar", height: "6 ft", fenceType: "Privacy", linearFeet: 25, gates: 0 },
      { label: "C", material: "Chain link", height: "4 ft", fenceType: "Perimeter", linearFeet: 40, gates: 2 },
    ],
  };

  const groups = summarizeFenceTakeoffByAssembly(takeoff);
  assert.equal(groups.length, 2);
  assert.equal(groups.find((group) => group.material === "Cedar").linearFeet, 75);

  const lineItems = buildFenceTakeoffDraftLineItems(takeoff);
  assert.deepEqual(lineItems.map((item) => item.unit), ["LF", "LF", "EA"]);
  assert.equal(lineItems.at(-1).quantity, 3);
});

test("builds proposal-safe summary and field handoff notes without survey-grade claims", () => {
  const takeoff = {
    segments: [{ label: "Back run", material: "Cedar", height: "6 ft", fenceType: "Privacy", linearFeet: 125, gates: 2 }],
  };

  const summary = buildFenceTakeoffProposalSummary(takeoff);
  const handoff = buildFenceTakeoffFieldHandoff(takeoff);

  assert.match(summary, /approximately 125 LF/);
  assert.match(summary, /2 gate/);
  assert.equal(/survey-grade/i.test(summary), false);
  assert.equal(handoff.some((item) => /not survey-grade/i.test(item)), true);
});

test("creates office backup rows and merges draft quantities without changing prices", () => {
  const draft = {
    scopeSummary: "Existing scope.",
    items: [
      { description: "Mobilization", quantity: 1, unit: "LS", unitPrice: 250 },
      { description: "Fence takeoff - old row", quantity: 99, unit: "LF", unitPrice: 1 },
    ],
  };
  const takeoff = {
    address: "Salem, OR",
    segments: [{ label: "Back run", material: "Cedar", height: "6 ft", fenceType: "Privacy", linearFeet: 125, gates: 1 }],
  };

  const backupRows = buildFenceTakeoffBackupRows(takeoff);
  const merged = mergeFenceTakeoffIntoDraft(draft, takeoff);

  assert.equal(backupRows[0].source, "Satellite Fence Takeoff Lite");
  assert.equal(backupRows[0].unit, "LF");
  assert.equal(merged.items.some((item) => item.description === "Fence takeoff - old row"), false);
  assert.equal(merged.items.some((item) => item.description.includes("6 ft Cedar Privacy")), true);
  assert.equal(merged.items.find((item) => item.description.includes("6 ft Cedar Privacy")).unitPrice, "");
  assert.match(merged.scopeSummary, /Existing scope/);
  assert.match(merged.scopeSummary, /Fence takeoff includes approximately 125 LF/);
});
