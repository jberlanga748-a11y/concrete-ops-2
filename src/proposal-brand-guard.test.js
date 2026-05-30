import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const PROPOSAL_SURFACE_FILES = [
  "src/proposal-utils.js",
  "src/ProposalGenerator.jsx",
  "src/estimates-page-components.jsx",
  "src/estimates-route-components.jsx",
  "src/estimate-proposal-finish-utils.js",
  "shared/estimatePrint.js",
  "shared/estimatePacketPresets.js",
];

test("estimate and proposal surfaces do not expose retired pilot brand copy", async () => {
  const retiredPilotName = ["Last", "Yard"].join(" ");
  const retiredStorageKey = ["last", "yard"].join("-");
  const retiredProposalPrefix = ["L", "Y", "C"].join("");

  for (const filePath of PROPOSAL_SURFACE_FILES) {
    const source = await readFile(filePath, "utf8");
    assert.equal(source.includes(retiredPilotName), false, `${filePath} includes retired pilot name`);
    assert.equal(source.toLowerCase().includes(retiredStorageKey), false, `${filePath} includes retired pilot storage key`);
    assert.equal(source.includes(`${retiredProposalPrefix}-`), false, `${filePath} includes retired pilot proposal prefix`);
  }
});
