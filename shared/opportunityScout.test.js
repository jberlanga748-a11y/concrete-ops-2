import assert from "node:assert/strict";
import test from "node:test";

import {
  canConvertFoundOpportunityToLead,
  changedOpportunityFields,
  deriveFoundOpportunityMissingInfoItems,
  extractOpportunityFieldsFromIntake,
  findDuplicateFoundOpportunities,
  isConvertedFoundOpportunityToLead,
  normalizeFoundOpportunityPayload,
  normalizeOpportunitySearchProfilePayload,
  OPPORTUNITY_SCOUT_GUARDRAILS,
  redactOpportunityScoutText,
  sanitizeOpportunityScoutUrl,
  OPPORTUNITY_SEARCH_PROFILE_STARTERS,
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

test("search profile starters are safe editable daily scout presets", () => {
  assert.equal(OPPORTUNITY_SEARCH_PROFILE_STARTERS.length >= 4, true);
  assert.equal(OPPORTUNITY_SEARCH_PROFILE_STARTERS.every((starter) => starter.id && starter.label && starter.name), true);
  assert.equal(OPPORTUNITY_SEARCH_PROFILE_STARTERS.every((starter) => Array.isArray(starter.trades) && starter.trades.length > 0), true);
  assert.equal(OPPORTUNITY_SEARCH_PROFILE_STARTERS.some((starter) => starter.id === "public-bid-scan"), true);
  assert.equal(OPPORTUNITY_SEARCH_PROFILE_STARTERS.some((starter) => starter.id === "relationship-follow-up"), true);
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
    sourceUrl: "https://example.com/bids?token=secret&project=1",
    humanReviewStatus: "approved_for_lead",
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
  assert.equal(opportunity.sourceUrl, "https://example.com/bids?token=%5Bredacted%5D&project=1");
  assert.equal(opportunity.humanReviewStatus, "approved_for_lead");
  assert.deepEqual(opportunity.riskFlags, ["prevailing wage", "bond"]);
  assert.equal(opportunity.missingInfoItems.includes("plan link"), true);
  assert.equal(opportunity.missingInfoItems.includes("addenda"), true);
  assert.match(opportunity.bidDueAt, /^2026-06-01T/);
});

test("found opportunity validation requires a title", () => {
  assert.deepEqual(validateFoundOpportunityPayload({}), ["Opportunity title is required."]);
});

test("pasted intake text extracts fields while redacting secrets", () => {
  const extracted = extractOpportunityFieldsFromIntake(`
    Project: Library ADA concrete ramp
    Agency: City of Salem
    Location: Salem, OR
    Bid due: June 10 2026
    Contact: bids@example.com
    Scope: Concrete demolition, ramp forming, and sidewalk replacement.
    https://example.com/rfp?access_token=super-secret
    password: portal-secret
  `);

  assert.equal(extracted.title, "Library ADA concrete ramp");
  assert.equal(extracted.agency, "City of Salem");
  assert.equal(extracted.city, "Salem");
  assert.equal(extracted.state, "OR");
  assert.equal(extracted.trade, "concrete");
  assert.equal(extracted.contactEmail, "bids@example.com");
  assert.match(extracted.bidDueAt, /^2026-06-10T/);
  assert.equal(extracted.sourceUrl.includes("super-secret"), false);
  assert.equal(redactOpportunityScoutText("token=abc password: secret").includes("secret"), false);
  assert.equal(sanitizeOpportunityScoutUrl("ftp://private.example.com/file"), "");
});

test("found opportunity intake derives missing info and fit explanation", () => {
  const opportunity = normalizeFoundOpportunityPayload({
    intakeSourceType: "pasted_text",
    intakeText: "Project: Sidewalk patch\nLocation: Albany, OR\nScope: concrete repair",
    fileMetadata: [{ name: "bid-screenshot.png", notes: "authorization=secret" }],
  }, {
    id: "FO-2",
    changedAt: "2026-05-13T12:00:00.000Z",
    createdBy: "U-1",
  });

  assert.equal(opportunity.title, "Sidewalk patch");
  assert.equal(opportunity.intakeSourceType, "pasted_text");
  assert.equal(opportunity.fileMetadata[0].notes.includes("secret"), false);
  assert.equal(opportunity.missingInfoItems.includes("bid due date"), true);
  assert.equal(opportunity.missingInfoItems.includes("review owner"), true);
  assert.match(opportunity.fitExplanation, /fit/i);
  assert.equal(deriveFoundOpportunityMissingInfoItems(opportunity).includes("bid due date"), true);
});

test("found opportunity validation blocks automation and credential storage", () => {
  assert.deepEqual(validateFoundOpportunityPayload({
    title: "Unsafe portal bid",
    autoContact: true,
    password: "portal-secret",
  }), [
    "Opportunity Scout cannot contact customers, submit bids, or automate external actions.",
    "Opportunity Scout cannot store credentials, tokens, cookies, or private portal secrets.",
  ]);
  assert.equal(OPPORTUNITY_SCOUT_GUARDRAILS.some((item) => /No automatic customer/i.test(item)), true);
  assert.equal(OPPORTUNITY_SCOUT_GUARDRAILS.some((item) => /No bid submission/i.test(item)), true);
});

test("found opportunity validation blocks automation instructions in pasted text", () => {
  const contactErrors = validateFoundOpportunityPayload({
    title: "Unsafe contact instruction",
    intakeText: "Automatically contact the owner and ask for plan access.",
  });
  assert.ok(contactErrors.some((error) => /cannot contact customers/i.test(error)));

  const bidErrors = validateFoundOpportunityPayload({
    title: "Unsafe bid instruction",
    notes: "Submit our bid through the portal as soon as the packet is ready.",
  });
  assert.ok(bidErrors.some((error) => /cannot contact customers/i.test(error)));
});

test("dedupe helper flags likely found opportunity matches", () => {
  const duplicates = findDuplicateFoundOpportunities({
    id: "FO-NEW",
    title: "School sidewalk repair",
    agency: "Albany School District",
    sourceUrl: "https://example.com/bids/123?token=redacted",
  }, [
    { id: "FO-OLD", title: "School sidewalk repair", agency: "Albany School District", sourceUrl: "https://example.com/bids/123" },
    { id: "FO-OTHER", title: "Roofing", agency: "Other" },
  ]);

  assert.equal(duplicates.length, 1);
  assert.equal(duplicates[0].opportunityId, "FO-OLD");
  assert.equal(duplicates[0].confidence, "high");
});

test("lead conversion helper requires human approval first", () => {
  assert.equal(canConvertFoundOpportunityToLead({ humanReviewStatus: "needs_review" }), false);
  assert.equal(canConvertFoundOpportunityToLead({ humanReviewStatus: "approved_for_lead" }), true);
  assert.equal(canConvertFoundOpportunityToLead({ humanReviewStatus: "approved_for_lead", convertedLeadId: "L-1" }), false);
  assert.equal(canConvertFoundOpportunityToLead({ humanReviewStatus: "approved_for_lead", status: "converted_to_lead" }), false);
  assert.equal(isConvertedFoundOpportunityToLead({ status: "converted_to_lead" }), true);
  assert.equal(isConvertedFoundOpportunityToLead({ convertedLeadId: "L-1" }), true);
});

test("changed fields compare array values safely", () => {
  const previous = { title: "A", riskFlags: ["bond"] };
  const next = { title: "A", riskFlags: ["bond", "wage"] };
  assert.deepEqual(changedOpportunityFields(previous, next, ["title", "riskFlags"]), ["riskFlags"]);
});
