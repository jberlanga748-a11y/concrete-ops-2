import assert from "node:assert/strict";
import test from "node:test";

import { applyOpportunityScoutAgentPreviewToDraft, applyOpportunityScoutSourceCheckToDraft, buildFoundOpportunityDraftFromScoutExecutionCard, buildFoundOpportunityEvidenceIntakeFromScoutCard, buildOpportunityScoutConnectorSetupDraft, buildOpportunityScoutConnectorSetupDraftFromCoverageRecommendation, buildOpportunityScoutConnectorSetupPayload, buildOpportunityScoutSearchPhrase, buildOpportunityScoutSourceBrief, deriveFoundOpportunityDraftDuplicateWarnings, deriveOpportunityScoutState } from "./opportunity-scout-utils.js";
import { OPPORTUNITY_SCOUT_CONNECTOR_PRESETS } from "../shared/opportunityScout.js";

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
  assert.equal(state.dailyResourcePlan.label, "Daily Lead Resource Plan");
  assert.equal(state.dailyResourcePlan.stats.total, 2);
  assert.equal(state.dailyResourcePlan.stats.public, 1);
  assert.equal(state.dailyResourcePlan.stats.authorizedPrivate, 1);
  assert.equal(state.dailyResourcePlan.guardrails.some((item) => /No cold calls/i.test(item)), true);
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

test("opportunity scout resource plan separates public social boards from private social handoffs", () => {
  const state = deriveOpportunityScoutState({
    currentCompanyId: "COMPANY-A",
    companySettings: { serviceArea: "Albany Oregon" },
    opportunitySearchProfiles: [
      {
        id: "OSP-FB-GROUP",
        companyId: "COMPANY-A",
        name: "Facebook private group scan",
        status: "active",
        cadence: "daily",
        sourceAdapterId: "facebook_private_group",
        sourceAuthorizationStatus: "needs_authorization",
        sourceTypes: ["Facebook private group"],
        nextRunAt: TODAY,
      },
      {
        id: "OSP-CRAIGSLIST",
        companyId: "COMPANY-A",
        name: "Craigslist/local concrete board",
        status: "active",
        cadence: "daily",
        sourceAdapterId: "craigslist_local_board",
        sourceTermsStatus: "public_allowed",
        sourceTypes: ["Craigslist/local board"],
        nextRunAt: TODAY,
      },
    ],
  }, { today: TODAY });

  const privateRow = state.dailyResourcePlan.rows.find((row) => row.sourceId === "OSP-FB-GROUP");
  const publicRow = state.dailyResourcePlan.rows.find((row) => row.sourceId === "OSP-CRAIGSLIST");
  const privateCard = state.dailyScoutExecutionPlan.privateHandoffCards.find((card) => card.targetId === "OSP-FB-GROUP");
  const publicCard = state.dailyScoutExecutionPlan.publicRunnerCards.find((card) => card.targetId === "OSP-CRAIGSLIST");

  assert.equal(privateRow.laneId, "authorized_private");
  assert.equal(privateRow.requiresHumanAccess, true);
  assert.equal(privateRow.canAutonomousPrep, false);
  assert.equal(publicRow.laneId, "public");
  assert.equal(publicRow.canAutonomousPrep, true);
  assert.equal(Boolean(privateCard), true);
  assert.equal(privateCard.searchUrls.length, 0);
  assert.equal(Boolean(publicCard), true);
  assert.equal(publicCard.searchUrls.length > 0, true);
});

test("opportunity scout connector setup builds source and profile payloads without credentials", () => {
  const preset = OPPORTUNITY_SCOUT_CONNECTOR_PRESETS.find((entry) => entry.id === "facebook-private-group");
  const draft = buildOpportunityScoutConnectorSetupDraft(preset, {
    name: "Albany homeowner group",
    serviceArea: "Albany",
  });
  const payload = buildOpportunityScoutConnectorSetupPayload(draft);

  assert.equal(payload.shouldCreateLeadSource, true);
  assert.equal(payload.shouldCreateSearchProfile, true);
  assert.equal(payload.leadSource.name, "Albany homeowner group");
  assert.equal(payload.leadSource.type, "Social/community source");
  assert.equal(payload.searchProfile.sourceAdapterId, "facebook_private_group");
  assert.equal(payload.searchProfile.sourcePosture, "private_human_handoff");
  assert.equal(payload.searchProfile.sourceAuthorizationStatus, "needs_authorization");
  assert.equal(payload.searchProfile.projectTypes.includes("repair"), true);
  assert.equal(payload.searchProfile.preferredSources.includes("public"), false);
  assert.match(payload.safetyBoundary, /does not log in/i);
  assert.equal(JSON.stringify(payload).includes("password="), false);
});

test("opportunity scout source coverage recommendations prepare safe editable connector drafts", () => {
  const state = deriveOpportunityScoutState({
    currentCompanyId: "COMPANY-A",
    companySettings: { serviceArea: "Albany Oregon", primaryTrade: "concrete" },
    opportunitySearchProfiles: [
      {
        id: "OSP-PUBLIC",
        companyId: "COMPANY-A",
        name: "City bid page",
        sourceAdapterId: "public_procurement_feed",
        sourcePosture: "public_no_login",
        sourceTypes: ["City bid page"],
        status: "active",
      },
    ],
    leadSources: [],
  }, { today: TODAY });
  const recommendation = state.dailyScoutExecutionPlan.sourceCoveragePlanner.recommendations.find((entry) => entry.familyId === "private_social");
  const draft = buildOpportunityScoutConnectorSetupDraftFromCoverageRecommendation(recommendation, { serviceArea: "Albany Oregon", primaryTrade: "concrete" });
  const payload = buildOpportunityScoutConnectorSetupPayload(draft);

  assert.equal(state.dailyScoutExecutionPlan.sourceCoveragePlanner.mode, "agent_leads_source_coverage_planner_v23");
  assert.equal(state.dailyScoutExecutionPlan.sourceCoveragePlanner.externalActionsLocked, true);
  assert.equal(state.dailyScoutExecutionPlan.liveSourceSetupReadiness.mode, "agent_leads_live_source_setup_readiness_v24");
  assert.equal(state.dailyScoutExecutionPlan.liveSourceSetupReadiness.externalActionsLocked, true);
  assert.equal(state.dailyScoutExecutionPlan.liveSourceSetupReadiness.leadAutoSaveEnabled, false);
  assert.equal(state.dailyScoutExecutionPlan.pilotRunReadiness.mode, "agent_leads_pilot_run_readiness_v25");
  assert.equal(state.dailyScoutExecutionPlan.pilotRunReadiness.externalActionsLocked, true);
  assert.equal(state.dailyScoutExecutionPlan.pilotRunReadiness.tomorrowChecklist.some((item) => item.id === "save-approved-drafts"), true);
  assert.equal(state.dailyScoutExecutionPlan.providerConnectionSetupPlan.mode, "agent_leads_provider_connection_setup_plan_v26");
  assert.equal(state.dailyScoutExecutionPlan.providerConnectionSetupPlan.externalActionsLocked, true);
  assert.equal(state.dailyScoutExecutionPlan.providerConnectionSetupPlan.rawCredentialStorageEnabled, false);
  assert.equal(state.dailyScoutExecutionPlan.providerConnectionSetupPlan.liveProviderCallsEnabled, false);
  assert.equal(state.dailyScoutExecutionPlan.providerConnectionSetupPlan.hostedPilotSmokePlan.blockedChecks.some((item) => /No raw credential/i.test(item)), true);
  assert.equal(state.dailyScoutExecutionPlan.pilotActivationLayer.mode, "agent_leads_pilot_activation_layer_v27");
  assert.equal(state.dailyScoutExecutionPlan.pilotActivationLayer.externalActionsLocked, true);
  assert.equal(state.dailyScoutExecutionPlan.pilotActivationLayer.hostedPilotSmokePacket.canRunAutomatically, false);
  assert.equal(state.dailyScoutExecutionPlan.pilotActivationLayer.liveProviderCallsEnabled, false);
  assert.equal(state.dailyScoutExecutionPlan.pilotActivationLayer.tomorrowRunView.exactlyWhatApexWillNotDo.some((item) => /No OAuth token exchange/i.test(item)), true);
  assert.equal(state.dailyScoutExecutionPlan.realPublicSourceConfigActivation.mode, "agent_leads_real_public_source_config_activation_v28");
  assert.equal(state.dailyScoutExecutionPlan.realPublicSourceConfigActivation.externalActionsLocked, true);
  assert.equal(state.dailyScoutExecutionPlan.realPublicSourceConfigActivation.liveProviderCallsEnabled, false);
  assert.equal(state.dailyScoutExecutionPlan.realPublicSourceConfigActivation.operatorActivationDrafts.every((entry) => entry.canExecute === false), true);
  assert.equal(state.dailyScoutExecutionPlan.realPublicSourceConfigActivation.safetyBoundary.includes("metadata and eligibility only"), true);
  assert.equal(state.dailyScoutExecutionPlan.controlledHostedDemoSmokePacket.mode, "agent_leads_controlled_hosted_demo_smoke_packet_v29");
  assert.equal(state.dailyScoutExecutionPlan.controlledHostedDemoSmokePacket.canRunAutomatically, false);
  assert.equal(state.dailyScoutExecutionPlan.controlledHostedDemoSmokePacket.browserAutomationEnabled, false);
  assert.equal(state.dailyScoutExecutionPlan.controlledHostedDemoSmokePacket.deployEnabled, false);
  assert.equal(state.dailyScoutExecutionPlan.controlledHostedDemoSmokePacket.productionDataTouchEnabled, false);
  assert.equal(state.dailyScoutExecutionPlan.controlledHostedDemoSmokePacket.smokeResultModel.status, "not_run");
  assert.equal(state.dailyScoutExecutionPlan.smokeEvidenceRecorder.mode, "agent_leads_smoke_evidence_recorder_v30");
  assert.equal(state.dailyScoutExecutionPlan.smokeEvidenceRecorder.canRecordAutomatically, false);
  assert.equal(state.dailyScoutExecutionPlan.smokeEvidenceRecorder.serverWriteEnabled, false);
  assert.equal(state.dailyScoutExecutionPlan.smokeEvidenceRecorder.externalActionsLocked, true);
  assert.equal(state.dailyScoutExecutionPlan.smokeEvidenceRecorder.evidenceDraft.fields.sourceConfigId, state.dailyScoutExecutionPlan.controlledHostedDemoSmokePacket.smokeTargetSelector.selectedSourceConfigId || "");
  assert.equal(state.dailyScoutExecutionPlan.controlledDailyPublicSourceRunEvidencePacket.mode, "agent_leads_controlled_daily_public_source_run_evidence_packet_v32");
  assert.equal(state.dailyScoutExecutionPlan.controlledDailyPublicSourceRunEvidencePacket.externalActionsLocked, true);
  assert.equal(state.dailyScoutExecutionPlan.controlledDailyPublicSourceRunEvidencePacket.safeForCron, false);
  assert.equal(state.dailyScoutExecutionPlan.controlledDailyPublicSourceRunEvidencePacket.canRunAutomatically, false);
  assert.equal(state.dailyScoutExecutionPlan.controlledDailyPublicSourceRunEvidencePacket.leadAutoSaveEnabled, false);
  assert.equal(state.dailyScoutExecutionPlan.controlledDailyPublicRunPreflight.mode, "agent_leads_controlled_daily_public_run_preflight_v34");
  assert.equal(state.dailyScoutExecutionPlan.controlledDailyPublicRunEvidencePrep.mode, "agent_leads_controlled_daily_public_run_evidence_prep_v35");
  assert.equal(state.dailyScoutExecutionPlan.controlledDailyPublicRunOutcomeLoop.mode, "agent_leads_controlled_daily_public_run_outcome_loop_v36");
  assert.equal(state.dailyScoutExecutionPlan.controlledDailyPublicRunPreflight.canRunProviderFetch, false);
  assert.equal(state.dailyScoutExecutionPlan.controlledDailyPublicRunEvidencePrep.leadAutoSaveEnabled, false);
  assert.equal(state.dailyScoutExecutionPlan.localCompletionReadiness.mode, "agent_leads_local_completion_readiness_v39");
  assert.equal(state.dailyScoutExecutionPlan.localCompletionReadiness.localCompletionStatus, "complete_review_first_local");
  assert.equal(state.dailyScoutExecutionPlan.localCompletionReadiness.readyForProductionAutonomy, false);
  assert.equal(state.dailyScoutExecutionPlan.localCompletionReadiness.externalActionLocks.customerContactEnabled, false);
  assert.equal(state.dailyScoutExecutionPlan.productionReadinessGate.mode, "agent_leads_production_readiness_gate_v40");
  assert.equal(state.dailyScoutExecutionPlan.productionReadinessGate.productionLaunchStatus, "no_go");
  assert.equal(state.dailyScoutExecutionPlan.productionReadinessGate.readyForProductionAutonomy, false);
  assert.equal(draft.sourcePosture, "private_human_handoff");
  assert.equal(draft.sourceAuthorizationStatus, "needs_authorization");
  assert.equal(payload.searchProfile.sourcePosture, "private_human_handoff");
  assert.equal(payload.searchProfile.sourceAuthorizationStatus, "needs_authorization");
  assert.equal(payload.leadSource.url, "");
  assert.match(payload.safetyBoundary, /does not log in/i);
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
  assert.equal(state.dailyResourcePlan.stats.total, 0);
  assert.match(state.dailyResourcePlan.summary, /Add public, private-authorized, inbound, or warm relationship sources/i);
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
      { id: "OSP-1", companyId: "COMPANY-A", name: "Daily bid scan", status: "active", cadence: "daily", trades: ["concrete"], serviceAreas: ["Albany"], keywords: ["sidewalk"], sourceAdapterId: "public_web", sourceAccessStatus: "clear_for_review", sourceTermsStatus: "unreviewed", sourceAuthorizationStatus: "authorized_for_human_session", sourceAuthorizedBy: "Owner", notes: "[2026-05-12 source check] Result: Found Work | Next: Save found opportunity | Source: Daily bid scan | Note: Public RFP found. | Review-first: no lead, contact, message, or bid was created from this check.", lastRunAt: "", nextRunAt: TODAY },
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
    auditEvents: [{
      id: "AUDIT-SCOUT",
      companyId: "COMPANY-A",
      action: "agent.os.opportunity_search_prep.daily.queued",
      summary: "Opportunity search prep queued for daily Opportunity Scout review",
      createdAt: "2026-05-13T08:00:00.000Z",
      detail: JSON.stringify({
        task: {
          target: { title: "Daily bid scan" },
        },
        runId: "RUN-SCOUT",
        reviewCardCount: 4,
        publicRunnerCardCount: 2,
        privateHandoffCardCount: 1,
        foundDraftCardCount: 1,
      }),
    }],
  }, { today: TODAY });

  assert.equal(state.readiness.label, "Found work needs review");
  assert.equal(state.stats.activeProfiles, 1);
  assert.equal(state.stats.totalProfiles, 2);
  assert.equal(state.stats.profilesDue, 1);
  assert.equal(state.stats.openFoundOpportunities, 3);
  assert.equal(state.stats.dueBidOpportunities, 1);
  assert.equal(state.dailyJobFinder.headline, "Review Found Work");
  assert.equal(state.dailyResourcePlan.stats.total, 1);
  assert.equal(state.dailyResourcePlan.stats.public, 1);
  assert.equal(state.dailyResourcePlan.stats.humanAccess, 1);
  assert.equal(state.dailyResourcePlan.rows[0].sourceKind, "search_profile");
  assert.equal(state.dailyResourcePlan.rows[0].canAutonomousPrep, false);
  assert.equal(state.dailyResourcePlan.rows[0].requiresHumanAccess, true);
  assert.equal(state.dailyResourcePlan.rows[0].privateSourceGate.authorizationStatus, "authorized_for_human_session");
  assert.equal(state.recentSourceCheckOutcomes.some((outcome) => outcome.sourceName === "Daily bid scan"), true);
  assert.equal(state.dailyAgentLeadsLedger.stats.queuedPrep, 1);
  assert.equal(state.dailyAgentLeadsLedger.stats.reviewedSources, 1);
  assert.equal(state.dailyAgentLeadsLedger.stats.blockedSources, 1);
  assert.equal(state.dailyAgentLeadsLedger.stats.reviewCards, 4);
  assert.equal(state.dailyAgentLeadsLedger.stats.publicRunnerCards, 2);
  assert.equal(state.dailyAgentLeadsLedger.rows.some((row) => row.type === "queued_prep"), true);
  assert.equal(state.dailyScoutExecutionPlan.mode, "daily_agent_leads_scout_execution_v6");
  assert.equal(state.dailyScoutExecutionPlan.stats.publicRunnerCards >= 1, true);
  assert.equal(state.dailyScoutExecutionPlan.stats.publicDiscoveryCards >= 1, true);
  assert.equal(state.dailyScoutExecutionPlan.stats.foundDraftCards >= 1, true);
  assert.match(state.dailyScoutExecutionPlan.safetyBoundary, /live-capable-but-locked provider plans/i);
  assert.equal(state.dailyScoutExecutionPlan.publicProviderBoundary.liveSearchEnabled, false);
  assert.equal(state.dailyScoutExecutionPlan.publicProviderBoundary.providerContract.id, "agent_leads_public_provider_contract_v6");
  assert.equal(state.dailyScoutExecutionPlan.publicProviderBoundary.liveProviderPlan.executionEnabled, false);
  assert.equal(state.dailyScoutExecutionPlan.dailyRunRecord.status, "prepared");
  assert.equal(state.dailyScoutExecutionPlan.dailyRunRecord.providerAttemptCount >= 1, true);
  assert.equal(state.dailyScoutExecutionPlan.dailyRunRecord.providerReviewImportCount, state.dailyScoutExecutionPlan.providerReviewImportQueue.length);
  assert.equal(state.dailyScoutExecutionPlan.stats.providerAttempts >= 1, true);
  assert.equal(state.dailyScoutExecutionPlan.stats.providerReviewImports, state.dailyScoutExecutionPlan.providerReviewImportQueue.length);
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

test("opportunity scout derives review-first ingestion readiness from queued intake packets", () => {
  const state = deriveOpportunityScoutState({
    currentCompanyId: "COMPANY-A",
    companySettings: { serviceArea: "Salem Oregon" },
    opportunityIntakePackets: [
      {
        id: "PKT-1",
        companyId: "COMPANY-A",
        intakeSourceType: "pasted_text",
        sourceName: "Forwarded bid invite",
        intakeText: "Project: Library ADA ramp\nAgency: City of Salem\nLocation: Salem, OR\nBid due: June 10 2026\nScope: Concrete ramp replacement.",
      },
      {
        id: "PKT-2",
        companyId: "COMPANY-A",
        sourceAdapterId: "email_ingestion",
        title: "Private GC invite",
        intakeText: "Login required with MFA before plan access.",
      },
      {
        id: "PKT-3",
        companyId: "COMPANY-B",
        title: "Other company invite",
        intakeText: "Project: should not leak",
      },
    ],
  }, { today: TODAY });

  assert.equal(state.ingestionReadiness.mode, "review_first_ingestion_readiness");
  assert.equal(state.ingestionReadiness.rows.length, 2);
  assert.equal(state.ingestionReadiness.rows.some((row) => row.id === "PKT-3"), false);
  assert.equal(state.stats.intakePackets, 2);
  assert.equal(state.stats.intakePacketsNeedHumanReview, 1);
  assert.equal(state.ingestionReadiness.rows[1].reviewStatus, "human_review_required");
  assert.ok(state.ingestionReadiness.guardrails.some((item) => /Live email, OAuth/i.test(item)));
  assert.ok(state.ingestionReadiness.rows[0].blockedActions.some((action) => /No lead or opportunity is saved automatically/i.test(action)));
});

test("opportunity scout keeps Create Lead locked when source access still needs human review", () => {
  const state = deriveOpportunityScoutState({
    currentCompanyId: "COMPANY-A",
    opportunitySearchProfiles: [
      {
        id: "OSP-HUMAN",
        companyId: "COMPANY-A",
        name: "GC portal review",
        status: "active",
        sourceAdapterId: "approved_browser_session",
        sourceAccessStatus: "needs_human",
        sourceTermsStatus: "human_review_required",
      },
    ],
    foundOpportunities: [
      {
        id: "FO-HUMAN",
        companyId: "COMPANY-A",
        searchProfileId: "OSP-HUMAN",
        title: "Portal sidewalk package",
        status: "reviewing",
        humanReviewStatus: "approved_for_lead",
      },
    ],
  }, { today: TODAY });

  const opportunity = state.foundOpportunityQueue.find((entry) => entry.opportunityId === "FO-HUMAN");
  assert.equal(opportunity.canConvertToLead, false);
  assert.equal(opportunity.leadPreview.canCreateLead, false);
  assert.equal(opportunity.leadPreview.reviewWarnings.some((warning) => /Source access requires human review/i.test(warning)), true);
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

test("daily scout execution cards prefill found opportunity drafts without saving private handoffs", () => {
  const current = { title: "", intakeSourceType: "manual" };
  const publicCard = {
    id: "card-public",
    type: "public_source_runner",
    targetKind: "search_profile",
    targetId: "OSP-1",
    title: "City sidewalk bids",
    query: "Albany concrete sidewalk RFP",
    searchUrls: [{ label: "Google", url: "https://example.test/search?q=sidewalk" }],
    checklist: ["Bid due date", "Plans/addenda"],
    safetyBoundary: "Public-source review card only.",
  };
  const privateCard = {
    id: "card-private",
    type: "private_source_handoff",
    title: "GC portal",
  };
  const draft = buildFoundOpportunityDraftFromScoutExecutionCard(current, publicCard);
  const blocked = buildFoundOpportunityDraftFromScoutExecutionCard(current, privateCard);

  assert.equal(draft.agentPreparedDraft, true);
  assert.equal(draft.searchProfileId, "OSP-1");
  assert.equal(draft.title, "City sidewalk bids opportunity");
  assert.equal(draft.sourceUrl, "https://example.test/search?q=sidewalk");
  assert.match(draft.humanReviewNote, /Human save and review required/i);
  assert.match(draft.notes, /Search query: Albany concrete sidewalk RFP/i);
  assert.deepEqual(blocked, current);
});

test("public discovery result cards prefill found opportunity drafts with source evidence", () => {
  const draft = buildFoundOpportunityDraftFromScoutExecutionCard({}, {
    id: "public-discovery-1",
    type: "public_discovery_result",
    targetKind: "search_profile",
    targetId: "OSP-PUBLIC",
    title: "City sidewalk bids - Google public search",
    sourceName: "City sidewalk bids",
    sourceUrl: "https://example.test/public-bid",
    snippet: "Public review candidate for Albany concrete sidewalk RFP.",
    fitScore: 82,
    fitReason: "Strong public-source candidate based on trade and job-intent terms.",
    draftPreview: {
      humanReviewStatus: "needs_review",
      missingInfoItems: "Confirm bid due date.",
    },
  });

  assert.equal(draft.agentPreparedDraft, true);
  assert.equal(draft.searchProfileId, "OSP-PUBLIC");
  assert.equal(draft.sourceUrl, "https://example.test/public-bid");
  assert.equal(draft.fitScore, 82);
  assert.match(draft.scopeSummary, /Albany concrete sidewalk RFP/i);
  assert.match(draft.reasonToBid, /Strong public-source candidate/i);
});

test("private source execution cards prepare evidence intake without creating a lead draft", () => {
  const draft = buildFoundOpportunityEvidenceIntakeFromScoutCard({}, {
    id: "card-private",
    type: "private_source_handoff",
    targetKind: "search_profile",
    targetId: "OSP-FB",
    title: "Facebook private group handoff",
    query: "Albany concrete repair private group",
    sourceConnector: { label: "Private social/community" },
    safetyBoundary: "Private source handoff only.",
  });

  assert.equal(draft.searchProfileId, "OSP-FB");
  assert.equal(draft.title || "", "");
  assert.equal(draft.intakeSourceType, "pasted_text");
  assert.equal(draft.humanReviewStatus, "needs_info");
  assert.match(draft.notes, /Do not store passwords/i);
  assert.equal(draft.agentPreparedDraft, true);
});

test("found opportunity draft duplicate warnings compare saved opportunities and leads before save", () => {
  const warnings = deriveFoundOpportunityDraftDuplicateWarnings({
    title: "Library ramp repair",
    agency: "City of Albany",
    city: "Albany",
    sourceUrl: "https://example.test/rfp/1",
  }, {
    foundOpportunities: [{
      id: "FO-1",
      title: "Library ramp repair",
      agency: "City of Albany",
      city: "Albany",
      sourceUrl: "https://example.test/rfp/1",
    }],
    leads: [{
      id: "LEAD-1",
      project: "Library ramp repair",
      city: "Albany",
      source: "City of Albany",
    }],
  });

  assert.equal(warnings.some((warning) => warning.type === "found_opportunity"), true);
  assert.equal(warnings.some((warning) => warning.type === "lead"), true);
  assert.match(warnings.map((warning) => warning.helper).join(" "), /same source URL|possible lead match/i);
});
