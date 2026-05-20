import assert from "node:assert/strict";
import test from "node:test";

import { applyOpportunityScoutAgentPreviewToDraft, applyOpportunityScoutSourceCheckToDraft, buildOpportunityScoutSearchPhrase, buildOpportunityScoutSourceBrief, deriveOpportunityScoutState } from "./opportunity-scout-utils.js";

const TODAY = "2026-05-13";

test("opportunity scout builds a daily source queue from due and overdue lead sources", () => {
  const state = deriveOpportunityScoutState({
    currentCompanyId: "COMPANY-A",
    companySettings: { serviceArea: "Albany Oregon", companyName: "Apex HQ" },
    leadSources: [
      { id: "LS-1", companyId: "COMPANY-A", name: "Oregon plan room", type: "Plan room", tradeFocus: "commercial concrete", serviceArea: "Willamette Valley", status: "Active", nextCheckAt: "2026-05-10", notes: "[2026-05-12 source check] Result: Found Work | Next: Save found opportunity | Source: Oregon plan room | Note: ADA ramp RFP found. | Review-first: no lead, contact, message, or bid was created from this check." },
      { id: "LS-2", companyId: "COMPANY-A", name: "City bid page", type: "City/county/school bid page", tradeFocus: "sidewalk bids", city: "Salem", state: "OR", status: "Active", nextCheckAt: TODAY },
      { id: "LS-3", companyId: "COMPANY-A", name: "Inactive source", status: "Inactive", nextCheckAt: TODAY },
      { id: "LS-4", companyId: "COMPANY-B", name: "Other company source", status: "Active", nextCheckAt: TODAY },
    ],
  }, { today: TODAY });

  assert.equal(state.readiness.label, "Scout checks due");
  assert.equal(state.stats.activeSources, 2);
  assert.equal(state.stats.checksNeeded, 2);
  assert.equal(state.dailyJobFinder.label, "Daily Job Finder");
  assert.equal(state.agentRunPacket.mode, "review_first");
  assert.equal(state.agentRunPacket.adapters.some((adapter) => adapter.id === "public_web" || adapter.id === "approved_browser_session"), true);
  assert.equal(state.agentRunPacket.sourcePosture.reviewRequired, true);
  assert.equal(state.agentRunPacket.sourcePosture.safeUseLabel, "Human review required");
  assert.equal(state.agentRunPacket.blockedActions.some((action) => /No credential/i.test(action)), true);
  assert.equal(state.humanTaskQueue.some((task) => task.id === "source-LS-1" && task.tone === "red"), true);
  assert.equal(state.humanTaskQueue.some((task) => task.id === "source-LS-2" && task.actionLabel === "Check source"), true);
  assert.equal(state.dailyJobFinder.focusLanes.find((lane) => lane.id === "find-work").value, 2);
  assert.equal(state.dailyJobFinder.focusLanes.find((lane) => lane.id === "find-work").targetId, "scout-search-briefs");
  assert.deepEqual(state.dailyRunSteps.map((step) => step.id), [
    "run-profiles",
    "check-sources",
    "review-found-work",
    "work-lead-followups",
  ]);
  assert.equal(state.dailyRunSteps.find((step) => step.id === "check-sources").value, 2);
  assert.equal(state.dailyRunSteps.find((step) => step.id === "check-sources").targetId, "scout-search-briefs");
  assert.equal(state.qualityChecks.find((check) => check.id === "qa-source-checks").value, 2);
  assert.equal(state.qualityChecks.find((check) => check.id === "qa-source-checks").tone, "red");
  assert.deepEqual(state.sourceQueue.map((source) => source.sourceId), ["LS-1", "LS-2"]);
  assert.equal(state.recentSourceCheckOutcomes.length, 1);
  assert.equal(state.recentSourceCheckOutcomes[0].result, "found_work");
  assert.equal(state.recentSourceCheckOutcomes[0].sourceName, "Oregon plan room");
  assert.equal(state.stats.foundWorkSourceCheckOutcomes, 1);
  assert.equal(state.agentRunPacket.recentSourceOutcomes[0].result, "found_work");
  assert.equal(state.agentRunPacket.recentSourceOutcomes[0].sourceName, "Oregon plan room");
  assert.match(state.searchBriefs[0].query, /commercial concrete/i);
  assert.equal(state.sourceQueue.some((source) => source.name === "Other company source"), false);
});

test("opportunity scout does not invent opportunities when no lead sources exist", () => {
  const state = deriveOpportunityScoutState({
    leadSources: [],
    leads: [{ id: "L-1", customer: "Existing lead", status: "New" }],
  }, { today: TODAY });

  assert.equal(state.readiness.label, "Source setup needed");
  assert.equal(state.stats.activeSources, 0);
  assert.deepEqual(state.sourceQueue, []);
  assert.deepEqual(state.humanTaskQueue, []);
  assert.deepEqual(state.searchBriefs, []);
  assert.equal(state.guardrails.externalSearch, false);
  assert.equal(state.guardrails.autoCreateLeads, false);
  assert.equal(state.dailyJobFinder.focusLanes.find((lane) => lane.id === "find-work").targetId, "scout-search-profiles");
  assert.match(state.dailyJobFinder.operatorMode, /office verifies/i);
  assert.equal(state.dailyJobFinder.guardrails.some((item) => /No auto-created leads/i.test(item)), true);
  assert.equal(state.qualityChecks.find((check) => check.id === "qa-found-review").tone, "green");
});

test("opportunity scout prioritizes open lead follow-ups and missing info", () => {
  const state = deriveOpportunityScoutState({
    leadSources: [
      { id: "LS-1", name: "Referral source", type: "Referral source", status: "Active", nextCheckAt: "2026-05-20" },
    ],
    leads: [
      { id: "L-1", customer: "Overdue lead", status: "Contacted", followUpDueAt: "2026-05-11", fitScore: 45 },
      { id: "L-2", customer: "Missing info lead", status: "New", missingInfoCount: 2, fitScore: 60 },
      { id: "L-3", customer: "Strong lead", status: "New", fitScore: 91, fitLabel: "Strong Fit" },
      { id: "L-4", customer: "Lost lead", status: "Lost", fitScore: 100 },
    ],
  }, { today: TODAY });

  assert.deepEqual(state.leadQueue.map((lead) => lead.leadId), ["L-1", "L-2", "L-3"]);
  assert.equal(state.stats.openLeads, 3);
  assert.equal(state.stats.highFitLeads, 1);
  assert.equal(state.stats.missingInfoLeads, 1);
  assert.equal(state.stats.dueLeads, 1);
});

test("opportunity scout includes saved search profiles and found opportunities", () => {
  const state = deriveOpportunityScoutState({
    currentCompanyId: "COMPANY-A",
    companySettings: { serviceArea: "Albany Oregon" },
    opportunitySearchProfiles: [
      { id: "OSP-1", companyId: "COMPANY-A", name: "Daily bid scan", status: "active", cadence: "daily", trades: ["concrete"], serviceAreas: ["Albany"], keywords: ["sidewalk"], sourceAdapterId: "public_web", sourceAccessStatus: "clear_for_review", sourceTermsStatus: "unreviewed", lastRunAt: "", nextRunAt: TODAY },
      { id: "OSP-2", companyId: "COMPANY-A", name: "Paused scan", status: "paused", cadence: "weekly", trades: ["siding"] },
      { id: "OSP-3", companyId: "COMPANY-B", name: "Other company scan", status: "active" },
    ],
    foundOpportunities: [
      { id: "FO-1", companyId: "COMPANY-A", searchProfileId: "OSP-1", title: "School sidewalk repair", agency: "Albany School District", status: "reviewing", trade: "Concrete", fitScore: 84, bidDueAt: TODAY, sourceUrl: "https://example.test/bid", scopeSummary: "Sidewalk replacement with ADA ramp repair.", riskFlags: ["prevailing wage"], missingInfoItems: ["addenda"] },
      { id: "FO-5", companyId: "COMPANY-A", title: "Approved ramp repair", status: "reviewing", humanReviewStatus: "approved_for_lead", duplicateHints: [{ opportunityId: "FO-1", confidence: "medium", reasons: ["same agency"] }], fileMetadata: [{ name: "ramp-screenshot.png" }], fitLabel: "strong fit", fitExplanation: "strong fit: source proof saved" },
      { id: "FO-6", companyId: "COMPANY-A", title: "Converted city ramp", status: "converted_to_lead", convertedLeadId: "L-99", updatedAt: "2026-05-12T10:00:00.000Z" },
      { id: "FO-2", companyId: "COMPANY-A", title: "Skipped job", status: "skipped", fitScore: 95 },
      { id: "FO-3", companyId: "COMPANY-B", title: "Other company work", status: "new" },
      { id: "FO-4", companyId: "COMPANY-A", title: "No bid date job", status: "new", fitScore: 70 },
    ],
  }, { today: TODAY });

  assert.equal(state.readiness.label, "Found work needs review");
  assert.equal(state.stats.activeProfiles, 1);
  assert.equal(state.stats.totalProfiles, 2);
  assert.equal(state.stats.profilesDue, 1);
  assert.equal(state.stats.openFoundOpportunities, 3);
  assert.equal(state.stats.dueBidOpportunities, 1);
  assert.equal(state.dailyJobFinder.headline, "Review Found Work");
  assert.equal(state.agentRunPacket.safeNextAction, "Review saved opportunity and decide Approve For Lead or Skip.");
  assert.equal(state.agentRunPacket.sourcePosture.adapterId, "public_web");
  assert.equal(state.agentRunPacket.sourcePosture.termsStatus, "unreviewed");
  assert.equal(state.agentRunPacket.sourcePosture.reviewRequired, true);
  assert.equal(state.agentRunPacket.humanTasks.some((task) => /Approve For Lead/i.test(task)), true);
  assert.equal(state.humanTaskQueue[0].id, "missing-FO-1");
  assert.equal(state.humanTaskQueue.some((task) => task.id === "profile-OSP-1"), true);
  assert.equal(state.humanTaskQueue.some((task) => task.id === "duplicate-FO-5"), true);
  assert.equal(state.humanTaskQueue.some((task) => task.id === "approval-FO-4"), true);
  assert.equal(state.humanTaskQueue.some((task) => /Approve For Lead/i.test(task.helper)), true);
  assert.equal(state.dailyJobFinder.focusLanes.find((lane) => lane.id === "qualify-work").value, 3);
  assert.equal(state.dailyJobFinder.focusLanes.find((lane) => lane.id === "qualify-work").tone, "red");
  assert.equal(state.dailyRunSteps.find((step) => step.id === "run-profiles").value, 1);
  assert.equal(state.dailyRunSteps.find((step) => step.id === "review-found-work").tone, "red");
  assert.deepEqual(state.foundOpportunityQueue.map((opportunity) => opportunity.opportunityId), ["FO-1", "FO-4", "FO-5", "FO-6"]);
  assert.equal(state.foundOpportunityQueue[0].sourceUrl, "https://example.test/bid");
  assert.equal(state.foundOpportunityQueue[0].scopeSummary, "Sidewalk replacement with ADA ramp repair.");
  assert.deepEqual(state.foundOpportunityQueue[0].riskFlags, ["prevailing wage"]);
  assert.deepEqual(state.foundOpportunityQueue[0].missingInfoItems, ["addenda"]);
  assert.equal(state.foundOpportunityQueue[0].leadPreview.customer, "Albany School District");
  assert.equal(state.foundOpportunityQueue[0].leadPreview.project, "School sidewalk repair");
  assert.equal(state.foundOpportunityQueue[0].leadPreview.city, "Location pending");
  assert.equal(state.foundOpportunityQueue[0].leadPreview.priority, "High");
  assert.equal(state.foundOpportunityQueue[0].sourcePosture.safeUseLabel, "Human review required");
  assert.equal(state.foundOpportunityQueue[0].leadPreview.sourcePosture.termsStatus, "unreviewed");
  assert.equal(state.foundOpportunityQueue[0].leadPreview.canCreateLead, false);
  assert.equal(state.foundOpportunityQueue[0].leadPreview.reviewWarnings.some((warning) => /addenda/i.test(warning)), true);
  assert.equal(state.foundOpportunityQueue[0].leadPreview.reviewWarnings.some((warning) => /Source use needs review/i.test(warning)), true);
  assert.equal(state.foundOpportunityQueue[0].leadPreview.blockedActions.some((action) => /No bid submission/i.test(action)), true);
  assert.deepEqual(state.foundOpportunityQueue[0].leadPreview.notesIncluded, ["source link", "scope", "risks", "missing info"]);
  const approvedOpportunity = state.foundOpportunityQueue.find((opportunity) => opportunity.opportunityId === "FO-5");
  assert.equal(approvedOpportunity.canConvertToLead, true);
  assert.equal(approvedOpportunity.leadHandoffState, "approved_for_lead");
  assert.equal(approvedOpportunity.leadHandoffLabel, "Ready to create lead");
  assert.equal(approvedOpportunity.humanReviewStatus, "approved_for_lead");
  assert.equal(approvedOpportunity.leadPreview.canCreateLead, true);
  assert.equal(approvedOpportunity.duplicateHints.length, 1);
  assert.deepEqual(approvedOpportunity.fileMetadata.map((file) => file.name), ["ramp-screenshot.png"]);
  assert.equal(approvedOpportunity.fitLabel, "strong fit");
  const convertedOpportunity = state.foundOpportunityQueue.find((opportunity) => opportunity.opportunityId === "FO-6");
  assert.equal(convertedOpportunity.leadHandoffState, "converted_to_lead");
  assert.equal(convertedOpportunity.leadHandoffLabel, "Lead created");
  assert.equal(convertedOpportunity.canConvertToLead, false);
  assert.equal(convertedOpportunity.convertedLeadId, "L-99");
  assert.equal(state.stats.convertedLeadHandoffs, 1);
  assert.equal(state.stats.approvedForLeadOpportunities, 1);
  assert.equal(state.qualityChecks.find((check) => check.id === "qa-opportunity-quality").value, 5);
  assert.equal(state.qualityChecks.find((check) => check.id === "qa-opportunity-quality").targetId, "scout-found-opportunities");
  assert.equal(state.profileQueue.some((profile) => profile.profileId === "OSP-3"), false);
  const publicProfile = state.profileQueue.find((profile) => profile.profileId === "OSP-1");
  assert.equal(publicProfile.sourceAdapterId, "public_web");
  assert.equal(publicProfile.sourceTermsStatus, "unreviewed");
  assert.equal(publicProfile.sourceReviewRequired, true);
  const publicBrief = state.searchBriefs.find((brief) => brief.profileId === "OSP-1");
  assert.equal(Boolean(publicBrief), true);
  assert.equal(publicBrief.sourceAdapterId, "public_web");
  assert.equal(publicBrief.sourceReviewRequired, true);
});

test("opportunity scout search briefs keep both profile and source run cards visible", () => {
  const profiles = Array.from({ length: 5 }, (_, index) => ({
    id: `OSP-${index + 1}`,
    companyId: "COMPANY-A",
    name: `Profile ${index + 1}`,
    status: "active",
    cadence: "daily",
    trades: ["concrete"],
    serviceAreas: ["Albany"],
    keywords: ["sidewalk"],
    nextRunAt: TODAY,
  }));
  const sources = Array.from({ length: 4 }, (_, index) => ({
    id: `LS-${index + 1}`,
    companyId: "COMPANY-A",
    name: `Source ${index + 1}`,
    type: "City/county/school bid page",
    status: "Active",
    tradeFocus: "concrete bids",
    nextCheckAt: TODAY,
  }));

  const state = deriveOpportunityScoutState({
    currentCompanyId: "COMPANY-A",
    companySettings: { serviceArea: "Albany Oregon" },
    opportunitySearchProfiles: profiles,
    leadSources: sources,
  }, { today: TODAY });

  assert.equal(state.searchBriefs.length, 6);
  assert.equal(state.searchBriefs.some((brief) => brief.profileId), true);
  assert.equal(state.searchBriefs.some((brief) => brief.sourceId), true);
});

test("opportunity scout phrases relationship sources differently from bid portals", () => {
  const referralQuery = buildOpportunityScoutSearchPhrase({
    name: "Builder partners",
    type: "Builder/developer",
    serviceArea: "Linn County",
    tradeFocus: "deck and siding projects",
  });
  const portalQuery = buildOpportunityScoutSearchPhrase({
    name: "Public portal",
    type: "Public bid portal",
    city: "Albany",
    state: "OR",
    tradeFocus: "concrete bids",
  });

  assert.match(referralQuery, /follow up opportunities/i);
  assert.match(portalQuery, /RFP bid invite plan room/i);
});

test("opportunity scout source brief gives the office a safe manual run card", () => {
  const bidBrief = buildOpportunityScoutSourceBrief({
    name: "County bid page",
    type: "City/county/school bid page",
    tradeFocus: "exterior repairs",
    serviceArea: "Albany Oregon",
    url: "https://example.com/bids",
  });
  const relationshipBrief = buildOpportunityScoutSourceBrief({
    name: "Builder partners",
    type: "Builder/developer",
    notes: "Warm builders and remodelers",
  });

  assert.match(bidBrief.headline, /verify any bid dates/i);
  assert.equal(bidBrief.checkFor.length, 3);
  assert.match(bidBrief.resultPrompt, /real opportunity/i);
  assert.match(bidBrief.addLeadPrompt, /Add only real opportunities/i);
  assert.match(relationshipBrief.headline, /relationship source/i);
  assert.match(relationshipBrief.checkFor.join(" "), /human follow-up/i);
});

test("opportunity scout agent preview can fill an unsaved draft without overwriting human-entered fields", () => {
  const draft = applyOpportunityScoutAgentPreviewToDraft({
    title: "Human title",
    city: "",
    missingInfoItems: "",
    reasonToBid: "",
  }, {
    ok: true,
    extractedFields: {
      title: "Extracted title",
      agency: "City of Salem",
      city: "Salem",
      state: "OR",
      trade: "concrete",
      bidDueAt: "2026-06-10T17:00:00.000Z",
      sourceUrl: "https://example.test/bids/44",
      scopeSummary: "Concrete ramp replacement.",
      fileMetadata: [{ name: "bid-invite.pdf" }],
    },
    missingInfoItems: ["review owner"],
    fitReview: {
      fitScore: 82,
      fitExplanation: "strong fit: trade/scope captured",
      fitRisks: ["addenda not confirmed"],
    },
    normalizedOpportunity: { intakeSourceType: "pasted_text" },
  });

  assert.equal(draft.title, "Human title");
  assert.equal(draft.agency, "City of Salem");
  assert.equal(draft.city, "Salem");
  assert.equal(draft.state, "OR");
  assert.equal(draft.trade, "concrete");
  assert.equal(draft.bidDueAt, "2026-06-10");
  assert.equal(draft.sourceUrl, "https://example.test/bids/44");
  assert.equal(draft.fileMetadata, "bid-invite.pdf");
  assert.equal(draft.missingInfoItems, "review owner");
  assert.equal(draft.fitScore, "82");
  assert.match(draft.reasonToBid, /strong fit/i);
  assert.match(draft.riskFlags, /addenda/i);
});

test("opportunity scout agent preview fill is a no-op for blocked previews", () => {
  const draft = { title: "Keep me" };
  assert.equal(applyOpportunityScoutAgentPreviewToDraft(draft, { ok: false }), draft);
});

test("source check results can prefill found opportunity drafts without saving leads", () => {
  const draft = applyOpportunityScoutSourceCheckToDraft({
    title: "Human entered title",
  }, {
    result: "missing_docs",
    brief: {
      sourceId: "LS-1",
      title: "City bid page",
      type: "Public bid portal",
      helper: "Open city source and verify documents.",
      url: "https://example.test/bids",
    },
    source: {
      id: "LS-1",
      name: "City bids",
      tradeFocus: "concrete",
      city: "Salem",
      state: "OR",
      url: "https://example.test/bids",
    },
  });

  assert.equal(draft.title, "Human entered title");
  assert.equal(draft.leadSourceId, "LS-1");
  assert.equal(draft.sourceName, "City bids");
  assert.equal(draft.agency, "City bids");
  assert.equal(draft.trade, "concrete");
  assert.equal(draft.city, "Salem");
  assert.equal(draft.state, "OR");
  assert.equal(draft.sourceUrl, "https://example.test/bids");
  assert.equal(draft.status, "reviewing");
  assert.equal(draft.humanReviewStatus, "needs_info");
  assert.match(draft.humanReviewNote, /missing docs source check/i);
  assert.match(draft.missingInfoItems, /plans/);

  const duplicateDraft = applyOpportunityScoutSourceCheckToDraft({}, {
    result: "duplicate",
    brief: { title: "City bid page" },
    source: { name: "City bids" },
  });
  assert.equal(duplicateDraft.status, "watching");
  assert.equal(duplicateDraft.humanReviewStatus, "needs_info");
  assert.match(duplicateDraft.riskFlags, /possible duplicate/i);
});
