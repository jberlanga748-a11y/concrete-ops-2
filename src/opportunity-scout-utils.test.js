import assert from "node:assert/strict";
import test from "node:test";

import { buildOpportunityScoutSearchPhrase, buildOpportunityScoutSourceBrief, deriveOpportunityScoutState } from "./opportunity-scout-utils.js";

const TODAY = "2026-05-13";

test("opportunity scout builds a daily source queue from due and overdue lead sources", () => {
  const state = deriveOpportunityScoutState({
    currentCompanyId: "COMPANY-A",
    companySettings: { serviceArea: "Albany Oregon", companyName: "Apex HQ" },
    leadSources: [
      { id: "LS-1", companyId: "COMPANY-A", name: "Oregon plan room", type: "Plan room", tradeFocus: "commercial concrete", serviceArea: "Willamette Valley", status: "Active", nextCheckAt: "2026-05-10" },
      { id: "LS-2", companyId: "COMPANY-A", name: "City bid page", type: "City/county/school bid page", tradeFocus: "sidewalk bids", city: "Salem", state: "OR", status: "Active", nextCheckAt: TODAY },
      { id: "LS-3", companyId: "COMPANY-A", name: "Inactive source", status: "Inactive", nextCheckAt: TODAY },
      { id: "LS-4", companyId: "COMPANY-B", name: "Other company source", status: "Active", nextCheckAt: TODAY },
    ],
  }, { today: TODAY });

  assert.equal(state.readiness.label, "Scout checks due");
  assert.equal(state.stats.activeSources, 2);
  assert.equal(state.stats.checksNeeded, 2);
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
  assert.deepEqual(state.searchBriefs, []);
  assert.equal(state.guardrails.externalSearch, false);
  assert.equal(state.guardrails.autoCreateLeads, false);
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
      { id: "OSP-1", companyId: "COMPANY-A", name: "Daily bid scan", status: "active", cadence: "daily", trades: ["concrete"], serviceAreas: ["Albany"], keywords: ["sidewalk"], lastRunAt: "", nextRunAt: TODAY },
      { id: "OSP-2", companyId: "COMPANY-A", name: "Paused scan", status: "paused", cadence: "weekly", trades: ["siding"] },
      { id: "OSP-3", companyId: "COMPANY-B", name: "Other company scan", status: "active" },
    ],
    foundOpportunities: [
      { id: "FO-1", companyId: "COMPANY-A", title: "School sidewalk repair", agency: "Albany School District", status: "reviewing", trade: "Concrete", fitScore: 84, bidDueAt: TODAY, riskFlags: ["prevailing wage"] },
      { id: "FO-2", companyId: "COMPANY-A", title: "Skipped job", status: "skipped", fitScore: 95 },
      { id: "FO-3", companyId: "COMPANY-B", title: "Other company work", status: "new" },
      { id: "FO-4", companyId: "COMPANY-A", title: "No bid date job", status: "new", fitScore: 70 },
    ],
  }, { today: TODAY });

  assert.equal(state.readiness.label, "Found work needs review");
  assert.equal(state.stats.activeProfiles, 1);
  assert.equal(state.stats.totalProfiles, 2);
  assert.equal(state.stats.profilesDue, 1);
  assert.equal(state.stats.openFoundOpportunities, 2);
  assert.equal(state.stats.dueBidOpportunities, 1);
  assert.equal(state.dailyRunSteps.find((step) => step.id === "run-profiles").value, 1);
  assert.equal(state.dailyRunSteps.find((step) => step.id === "review-found-work").tone, "red");
  assert.deepEqual(state.foundOpportunityQueue.map((opportunity) => opportunity.opportunityId), ["FO-1", "FO-4"]);
  assert.equal(state.qualityChecks.find((check) => check.id === "qa-opportunity-quality").value, 3);
  assert.equal(state.qualityChecks.find((check) => check.id === "qa-opportunity-quality").targetId, "scout-found-opportunities");
  assert.equal(state.profileQueue.some((profile) => profile.profileId === "OSP-3"), false);
  assert.equal(state.searchBriefs.some((brief) => brief.profileId === "OSP-1"), true);
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
