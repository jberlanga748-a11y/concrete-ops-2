import assert from "node:assert/strict";
import test from "node:test";

import {
  canConvertFoundOpportunityToLead,
  buildFoundOpportunityLeadHandoffPacket,
  buildOpportunityScoutAgentRunPacket,
  buildOpportunityScoutAgentPreview,
  changedOpportunityFields,
  deriveFoundOpportunityMissingInfoItems,
  extractOpportunityFieldsFromIntake,
  findDuplicateFoundOpportunities,
  isConvertedFoundOpportunityToLead,
  normalizeFoundOpportunityPayload,
  normalizeOpportunitySearchProfilePayload,
  OPPORTUNITY_SCOUT_GUARDRAILS,
  OPPORTUNITY_SCOUT_SOURCE_CHECK_RESULTS,
  OPPORTUNITY_SCOUT_SOURCE_ADAPTERS,
  buildOpportunityScoutSourceCheckNote,
  classifyOpportunityScoutSourceAccess,
  parseOpportunityScoutSourceCheckOutcomes,
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
    sourcePolicyNote: "Check robots.txt and public terms before recurring source checks. token=secret",
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
  assert.equal(profile.sourceAdapterId, "public_web");
  assert.equal(profile.sourceAccessStatus, "clear_for_review");
  assert.equal(profile.sourceTermsStatus, "unreviewed");
  assert.equal(profile.sourcePolicyNote.includes("secret"), false);
  assert.equal(profile.cadence, "daily");
  assert.equal(profile.status, "active");
  assert.equal(profile.createdBy, "U-1");
});

test("search profiles preserve explicit source adapter review posture", () => {
  const profile = normalizeOpportunitySearchProfilePayload({
    name: "GC portal review",
    sourceAdapterId: "approved_browser_session",
    sourceTypes: ["GC portal", "Plan room"],
    sourceAccessStatus: "needs_human",
    sourceTermsStatus: "human_review_required",
    sourcePolicyNote: "Authorized user must open the portal. Do not store password=secret.",
  });

  assert.equal(profile.sourceAdapterId, "approved_browser_session");
  assert.equal(profile.sourceAccessStatus, "needs_human");
  assert.equal(profile.sourceTermsStatus, "human_review_required");
  assert.equal(profile.sourcePolicyNote.includes("secret"), false);
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

test("opportunity scout agent run packet exposes source adapters and review-first stop rules", () => {
  const packet = buildOpportunityScoutAgentRunPacket({
    searchProfile: {
      name: "Public concrete scan",
      sourceAdapterId: "public_web",
      sourceTermsStatus: "unreviewed",
      sourcePolicyNote: "Check public terms before recurring checks. token=secret",
      trades: ["concrete"],
      serviceAreas: ["Salem"],
      sourceTypes: ["City/county/school bid page", "Plan room"],
    },
    leadSource: {
      name: "City bid page",
      type: "Public bid portal",
      url: "https://example.test/bids",
    },
    foundOpportunity: {
      title: "Library ramp",
      intakeSourceType: "pasted_text",
      duplicateHints: [{ opportunityId: "FO-1" }],
      humanReviewStatus: "needs_review",
    },
    companySettings: { serviceArea: "Salem Oregon" },
    recentSourceCheckOutcomes: [
      {
        sourceName: "City bid page",
        checkedAt: "2026-05-20",
        result: "missing_docs",
        label: "Missing Docs",
        nextAction: "Request or locate documents manually",
        missingInfo: "plans",
        note: "Plans not posted yet token=secret.",
      },
    ],
  });

  assert.equal(packet.mode, "review_first");
  assert.equal(packet.primaryAdapterId, "pasted_text");
  assert.equal(packet.sourcePosture.adapterId, "public_web");
  assert.equal(packet.sourcePosture.termsStatus, "unreviewed");
  assert.equal(packet.sourcePosture.reviewRequired, true);
  assert.equal(packet.sourcePosture.safeUseLabel, "Human review required");
  assert.equal(packet.sourcePosture.policyNote.includes("secret"), false);
  assert.equal(packet.adapters.some((adapter) => adapter.id === "pasted_text"), true);
  assert.equal(packet.adapters.some((adapter) => adapter.id === "approved_browser_session"), true);
  assert.equal(packet.steps.some((step) => /CAPTCHA/i.test(step)), true);
  assert.equal(packet.blockedActions.some((action) => /No bid submission/i.test(action)), true);
  assert.equal(packet.humanTasks.some((task) => /Approve For Lead/i.test(task)), true);
  assert.equal(packet.humanTasks.some((task) => /source terms/i.test(task)), true);
  assert.equal(packet.humanTasks.some((task) => /duplicate/i.test(task)), true);
  assert.equal(packet.recentSourceOutcomes.length, 1);
  assert.equal(packet.recentSourceOutcomes[0].result, "missing_docs");
  assert.equal(packet.recentSourceOutcomes[0].note.includes("secret"), false);
});

test("opportunity scout agent packet marks private or future adapters as human-required", () => {
  const packet = buildOpportunityScoutAgentRunPacket({
    searchProfile: {
      name: "API and inbox scan",
      sourceTypes: ["Official API", "Email ingestion"],
    },
    leadSource: {
      name: "GC portal",
      type: "Private portal",
    },
  });

  assert.equal(OPPORTUNITY_SCOUT_SOURCE_ADAPTERS.some((adapter) => adapter.id === "official_api"), true);
  assert.equal(packet.adapters.some((adapter) => adapter.status === "future_review"), true);
  assert.equal(packet.adapters.some((adapter) => adapter.status === "human_required"), true);
  assert.equal(packet.humanTasks.some((task) => /authorized/i.test(task)), true);
  assert.equal(packet.safeNextAction, "Run the manual source brief and save a found opportunity draft.");
});

test("opportunity scout agent packet marks blocked source posture", () => {
  const packet = buildOpportunityScoutAgentRunPacket({
    searchProfile: {
      name: "Blocked source",
      sourceAdapterId: "public_web",
      sourceAccessStatus: "clear_for_review",
      sourceTermsStatus: "blocked",
      sourcePolicyNote: "Terms prohibit reuse. api_key=secret",
    },
  });

  assert.equal(packet.sourcePosture.blocked, true);
  assert.equal(packet.sourcePosture.safeUseLabel, "Blocked source");
  assert.equal(packet.humanTasks.some((task) => /blocked/i.test(task)), true);
  assert.equal(JSON.stringify(packet).includes("secret"), false);
});

test("opportunity scout agent preview extracts, scores, dedupes, and stays review-only", () => {
  const preview = buildOpportunityScoutAgentPreview({
    intakeSourceType: "pasted_text",
    intakeText: `
      Project: Library ADA ramp
      Agency: City of Salem
      Location: Salem, OR
      Bid due: June 10 2026
      Contact: bids@example.com
      Scope: Concrete ramp replacement and sidewalk repair.
      https://example.test/bids/44?token=secret
    `,
  }, {
    existingOpportunities: [
      { id: "FO-1", title: "Library ADA ramp", agency: "City of Salem" },
    ],
    searchProfile: { name: "Public bid scan", sourceTypes: ["City/county/school bid page"] },
    leadSource: { name: "City bids", type: "Public bid portal" },
    companySettings: { serviceArea: "Salem Oregon" },
    recentSourceCheckOutcomes: [{
      sourceName: "City bids",
      checkedAt: "2026-05-20",
      result: "found_work",
      label: "Found Work",
      nextAction: "Save found opportunity",
      note: "Sidewalk packet token=secret.",
    }],
    createdBy: "U-1",
  });

  assert.equal(preview.ok, true);
  assert.equal(preview.mode, "review_first_agent_preview");
  assert.equal(preview.extractedFields.title, "Library ADA ramp");
  assert.equal(preview.extractedFields.agency, "City of Salem");
  assert.equal(preview.extractedFields.sourceUrl.includes("secret"), false);
  assert.equal(preview.duplicateHints[0].opportunityId, "FO-1");
  assert.equal(preview.fitReview.fitScore > 0, true);
  assert.equal(preview.accessReview.status, "clear_for_review");
  assert.equal(preview.agentRunPacket.blockedActions.some((action) => /No bid submission/i.test(action)), true);
  assert.equal(preview.agentRunPacket.recentSourceOutcomes[0].result, "found_work");
  assert.equal(preview.agentRunPacket.recentSourceOutcomes[0].note.includes("secret"), false);
  assert.equal(JSON.stringify(preview.agentRunPacket).includes("secret"), false);
  assert.match(preview.recommendedNextStep, /duplicate/i);
});

test("source access classifier stops at login, MFA, CAPTCHA, paywall, and private access", () => {
  const accessReview = classifyOpportunityScoutSourceAccess({
    sourceType: "GC portal",
    intakeText: "Plan room login requires MFA and CAPTCHA before seeing docs.",
    notes: "Subscription required. Do not scrape.",
  });

  assert.equal(accessReview.status, "needs_human");
  assert.equal(accessReview.stopReasons.some((reason) => /Login/i.test(reason)), true);
  assert.equal(accessReview.stopReasons.some((reason) => /MFA/i.test(reason)), true);
  assert.equal(accessReview.stopReasons.some((reason) => /CAPTCHA/i.test(reason)), true);
  assert.equal(accessReview.stopReasons.some((reason) => /Paywall/i.test(reason)), true);
  assert.equal(accessReview.stopReasons.some((reason) => /Private portal/i.test(reason)), true);
  assert.equal(accessReview.stopReasons.some((reason) => /Robots/i.test(reason)), true);
  assert.equal(accessReview.allowedNextActions.includes("Create a human task"), true);
  assert.equal(accessReview.blockedActions.some((action) => /No login automation/i.test(action)), true);
});

test("source check notes capture review-first outcomes without creating actions", () => {
  assert.equal(OPPORTUNITY_SCOUT_SOURCE_CHECK_RESULTS.map((result) => result.id).includes("found_work"), true);
  assert.equal(OPPORTUNITY_SCOUT_SOURCE_CHECK_RESULTS.map((result) => result.id).includes("needs_human"), true);

  const note = buildOpportunityScoutSourceCheckNote({
    result: "missing_docs",
    sourceName: "City bids",
    missingInfoItems: ["addenda", "plans"],
    note: "Found possible sidewalk work token=secret but docs were incomplete.",
  });

  assert.match(note, /Result: Missing Docs/);
  assert.match(note, /Next: Request or locate documents manually/);
  assert.match(note, /Missing: addenda, plans/);
  assert.equal(note.includes("secret"), false);
  assert.match(note, /no lead, contact, message, or bid was created/i);
});

test("source check outcome parser exposes recent review-first source history", () => {
  const note = buildOpportunityScoutSourceCheckNote({
    result: "found_work",
    sourceName: "City bids",
    note: "Sidewalk RFP found for office review.",
  });
  const outcomes = parseOpportunityScoutSourceCheckOutcomes({
    id: "LS-1",
    name: "City bids",
    notes: `[2026-05-20 source check] ${note}\nExisting unrelated source note.`,
  });

  assert.equal(outcomes.length, 1);
  assert.equal(outcomes[0].sourceId, "LS-1");
  assert.equal(outcomes[0].sourceName, "City bids");
  assert.equal(outcomes[0].checkedAt, "2026-05-20");
  assert.equal(outcomes[0].result, "found_work");
  assert.equal(outcomes[0].label, "Found Work");
  assert.equal(outcomes[0].tone, "orange");
  assert.equal(outcomes[0].reviewOnly, true);
  assert.match(outcomes[0].note, /Sidewalk RFP/);
});

test("opportunity scout agent preview rejects unsafe external action payloads", () => {
  const preview = buildOpportunityScoutAgentPreview({
    title: "Unsafe portal bid",
    notes: "Automatically contact the owner and submit our bid.",
    token: "portal-token",
  });

  assert.equal(preview.ok, false);
  assert.equal(preview.errors.some((error) => /cannot contact customers/i.test(error)), true);
  assert.equal(preview.errors.some((error) => /cannot store credentials/i.test(error)), true);
  assert.equal(preview.blockedActions.some((action) => /No credential/i.test(action)), true);
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

test("lead handoff packet explains create-lead gates and blocked agent actions", () => {
  const needsReview = buildFoundOpportunityLeadHandoffPacket({
    title: "Library ramp",
    agency: "City of Salem",
    city: "Salem",
    fitScore: 81,
    bidDueAt: "2026-05-13",
    sourceUrl: "https://example.test/bids/44",
    scopeSummary: "Concrete ramp replacement.",
    missingInfoItems: ["addenda"],
    duplicateHints: [{ opportunityId: "FO-1" }],
    humanReviewStatus: "needs_review",
  }, { today: "2026-05-13" });

  assert.equal(needsReview.customer, "City of Salem");
  assert.equal(needsReview.priority, "High");
  assert.equal(needsReview.canCreateLead, false);
  assert.equal(needsReview.approvalRequired, true);
  assert.equal(needsReview.notesIncluded.includes("source link"), true);
  assert.equal(needsReview.reviewWarnings.some((warning) => /Approve For Lead/i.test(warning)), true);
  assert.equal(needsReview.reviewWarnings.some((warning) => /duplicate/i.test(warning)), true);
  assert.equal(needsReview.blockedActions.some((action) => /No bid submission/i.test(action)), true);

  const blockedSource = buildFoundOpportunityLeadHandoffPacket({
    title: "Library ramp",
    humanReviewStatus: "approved_for_lead",
  }, {
    sourcePosture: {
      adapterId: "public_web",
      accessStatus: "clear_for_review",
      termsStatus: "blocked",
      reviewRequired: true,
      blocked: true,
      safeUseLabel: "Blocked source",
    },
  });
  assert.equal(blockedSource.sourcePosture.blocked, true);
  assert.equal(blockedSource.canCreateLead, false);
  assert.equal(blockedSource.approvalRequired, true);
  assert.equal(blockedSource.reviewWarnings.some((warning) => /blocked/i.test(warning)), true);

  const accessReview = buildFoundOpportunityLeadHandoffPacket({
    title: "Library ramp",
    humanReviewStatus: "approved_for_lead",
  }, {
    sourcePosture: {
      adapterId: "approved_browser_session",
      accessStatus: "needs_human",
      termsStatus: "human_review_required",
      reviewRequired: true,
      blocked: false,
      safeUseLabel: "Human review required",
    },
  });
  assert.equal(accessReview.canCreateLead, false);
  assert.equal(accessReview.reviewWarnings.some((warning) => /Source access requires human review/i.test(warning)), true);

  const approved = buildFoundOpportunityLeadHandoffPacket({
    title: "Library ramp",
    humanReviewStatus: "approved_for_lead",
  });
  assert.equal(approved.canCreateLead, true);
  assert.equal(approved.approvalRequired, false);
});

test("changed fields compare array values safely", () => {
  const previous = { title: "A", riskFlags: ["bond"] };
  const next = { title: "A", riskFlags: ["bond", "wage"] };
  assert.deepEqual(changedOpportunityFields(previous, next, ["title", "riskFlags"]), ["riskFlags"]);
});
