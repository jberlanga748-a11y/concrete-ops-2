import assert from "node:assert/strict";
import test from "node:test";

import {
  changedOpportunityFields,
  normalizeFoundOpportunityPayload,
  normalizeOpportunitySearchProfilePayload,
  validateFoundOpportunityPayload,
  validateOpportunitySearchProfilePayload,
} from "./opportunityScout.js";

test("search profiles normalize arrays, cadence, and status safely", () => {
  const profile = normalizeOpportunitySearchProfilePayload({
    name: "  Public bids   Oregon ",
    trades: "Concrete, fencing, Concrete",
    serviceAreas: ["Albany", " Corvallis "],
    radiusMiles: "35",
    sourceTypes: ["Public bid portal"],
    keywords: "sidewalk, ada ramp",
    excludedKeywords: ["roofing"],
    cadence: "Daily",
    status: "active",
  }, {
    id: "OSP-1",
    changedAt: "2026-05-13T12:00:00.000Z",
    createdBy: "U-1",
  });

  assert.equal(profile.id, "OSP-1");
  assert.equal(profile.name, "Public bids Oregon");
  assert.deepEqual(profile.trades, ["Concrete", "fencing"]);
  assert.deepEqual(profile.serviceAreas, ["Albany", "Corvallis"]);
  assert.equal(profile.radiusMiles, 35);
  assert.equal(profile.cadence, "daily");
  assert.equal(profile.status, "active");
  assert.equal(profile.createdBy, "U-1");
});

test("search profile validation requires a name and rejects negative radius", () => {
  assert.deepEqual(validateOpportunitySearchProfilePayload({ radiusMiles: -1 }), [
    "Search profile name is required.",
    "Service radius must be zero or higher.",
  ]);
});

test("found opportunities normalize scores, dates, risks, and contact fields", () => {
  const opportunity = normalizeFoundOpportunityPayload({
    title: "  School sidewalk repair ",
    agency: "Albany School District",
    status: "watching",
    fitScore: 88.8,
    urgencyScore: 300,
    distanceScore: -10,
    tradeMatchScore: 72,
    bidDueAt: "2026-06-01",
    contactEmail: "BIDS@EXAMPLE.COM ",
    riskFlags: "prevailing wage, bond",
    missingInfoItems: ["plan link", " addenda "],
  }, {
    id: "FO-1",
    changedAt: "2026-05-13T12:00:00.000Z",
    createdBy: "U-1",
  });

  assert.equal(opportunity.title, "School sidewalk repair");
  assert.equal(opportunity.status, "watching");
  assert.equal(opportunity.fitScore, 89);
  assert.equal(opportunity.urgencyScore, 100);
  assert.equal(opportunity.distanceScore, 0);
  assert.equal(opportunity.contactEmail, "bids@example.com");
  assert.deepEqual(opportunity.riskFlags, ["prevailing wage", "bond"]);
  assert.deepEqual(opportunity.missingInfoItems, ["plan link", "addenda"]);
  assert.match(opportunity.bidDueAt, /^2026-06-01T/);
});

test("found opportunity validation requires a title", () => {
  assert.deepEqual(validateFoundOpportunityPayload({}), ["Opportunity title is required."]);
});

test("changed fields compare array values safely", () => {
  const previous = { title: "A", riskFlags: ["bond"] };
  const next = { title: "A", riskFlags: ["bond", "wage"] };
  assert.deepEqual(changedOpportunityFields(previous, next, ["title", "riskFlags"]), ["riskFlags"]);
});
