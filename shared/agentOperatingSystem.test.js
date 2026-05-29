import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAgentOsExternalGateDecisionPacket,
  buildAgentExternalGateReadinessPacket,
  buildAgentOsExternalGateReadinessDeck,
  buildAgentExternalGateExecutionContract,
  buildAgentOsExternalGateExecutionDeck,
  buildAgentExternalGateSandboxAdapterRun,
  buildAgentOsExternalGateSandboxAdapterDeck,
  buildAgentOsInternalDraftPacket,
  buildAgentSchedulingMutationGateReadinessPacket,
  buildAgentLeadsAutonomousDailyScoutSchedule,
  buildAgentLeadsLiveAdapterApprovalPacket,
  buildAgentLeadsLiveAdapterExecutionContract,
  buildAgentLeadsProviderAdapterRunner,
  buildAgentLeadsProviderCompliancePacket,
  buildAgentLeadsProviderContract,
  buildAgentLeadsProviderMonitoringSnapshot,
  buildAgentLeadsAllSourceAdapterCoverage,
  buildAgentLeadsLiveProviderReadiness,
  buildAgentLeadsLiveProcurementPublicAdapterContract,
  buildAgentLeadsOfficialProviderApiAdapterContract,
  buildAgentLeadsProcurementFeedAdapterContract,
  buildAgentLeadsPublicProviderAdapterContract,
  buildAgentLeadsPrivateSourceDailyChecklist,
  buildAgentLeadsPrivateSourceLoginHandoff,
  buildAgentLeadsLivePublicProviderExecution,
  buildAgentLeadsProviderResultDraftPreview,
  buildAgentLeadsProviderReviewQueue,
  buildAgentLeadsFoundOpportunityDraftFromProviderReviewRow,
  buildAgentLeadsProviderHealthCheck,
  buildAgentLeadsProviderSandboxRun,
  buildAgentLeadsDailyReviewWorkflowSnapshot,
  buildAgentLeadsLiveSourceSetupReadiness,
  buildAgentLeadsPilotRunReadinessPacket,
  buildAgentLeadsProviderConnectionSetupPlan,
  buildAgentLeadsPilotActivationLayer,
  buildAgentLeadsRealPublicSourceConfigActivation,
  buildAgentLeadsControlledHostedDemoSmokePacket,
  buildAgentLeadsSmokeEvidenceRecorder,
  buildAgentLeadsControlledDailyPublicSourceRunEvidencePacket,
  buildAgentLeadsControlledDailyPublicRunApprovalRecord,
  buildAgentLeadsControlledDailyPublicRunPreflight,
  buildAgentLeadsControlledDailyPublicRunEvidencePrep,
  buildAgentLeadsControlledDailyPublicRunOutcomeLoop,
  buildAgentLeadsControlledDailyRunReviewFlow,
  buildAgentLeadsDailyReviewInbox,
  buildAgentLeadsDailyRunAdminControls,
  buildAgentLeadsDailyRunHistory,
  buildAgentLeadsScheduledRunReadiness,
  buildAgentLeadsPilotExecutionRehearsal,
  buildAgentLeadsControlledPilotRunExecution,
  buildAgentLeadsDailySourceMonitoring,
  buildAgentLeadsLocalCompletionReadiness,
  buildAgentLeadsProductionReadinessGate,
  buildAgentLeadsProductionSourceSetupBoard,
  buildAgentOsOperatorControlPanel,
  buildAgentLeadsSourceCoveragePlanner,
  buildAgentLeadsSourceExpansionControls,
  buildAgentOsOpportunityScoutExecutionPlan,
  buildAgentOsSummary,
  createAgentOsRunForTask,
  deriveAgentOsAutonomyPlan,
  deriveAgentOsExternalGateAdapterReadiness,
  deriveAgentLeadsProviderActivationReadiness,
  deriveAgentOsOpportunitySearchPrepQueue,
  deriveAgentOsLearningSignals,
  deriveAgentOsLedgerFromAuditEvents,
  deriveAgentOsTaskPayloadFromAdvisorRecommendation,
  getAgentOsExternalGateApprovalPlan,
  getAgentOsAction,
  listApprovedAgentLeadsProviderConnectors,
  listAgentOsAdvisorTaskMappings,
  listAgentOsActionRegistry,
  listAgentOsExternalGates,
  listAgentOsExternalGateApprovalPlans,
  normalizeAgentLeadsProviderImportDecision,
  normalizeAgentLeadsProviderReviewLearningSignal,
  normalizeAgentLeadsCredentialHandoff,
  normalizeAgentLeadsProviderConnectionMetadata,
  normalizeAgentLeadsProviderDailySchedule,
  normalizeAgentLeadsProviderSourceConsent,
  normalizeAgentLeadsPrivateEvidenceIntake,
  normalizeAgentLeadsPlatformProviderBoundary,
  normalizeAgentLeadsProcurementFeedAdapterConfig,
  normalizeAgentLeadsPrivateSourceAuthorization,
  normalizeAgentLeadsLiveAdapterApprovalDecision,
  normalizeAgentLeadsProviderReviewQueueDecision,
  normalizeAgentLeadsProductionReadinessEvidence,
  normalizeAgentLeadsSourceExpansionControl,
  deriveAgentLeadsProviderAttemptLedger,
  deriveAgentLeadsProviderReviewLearningSnapshot,
  deriveAgentLeadsProviderConnections,
  deriveAgentLeadsProviderDailySchedules,
  deriveAgentLeadsProviderSourceConsents,
  deriveAgentLeadsPlatformProviderBoundaries,
  deriveAgentLeadsProcurementFeedAdapterConfigs,
  deriveAgentLeadsPrivateSourceAuthorizations,
  runAgentLeadsDailyJobFinderOrchestration,
  runAgentLeadsDailyJobFinderAutopilot,
  runAgentLeadsOfficialProviderApiAdapterHarness,
  runAgentLeadsDailyLiveProcurementPublicAdapter,
  runAgentLeadsLiveProcurementPublicAdapter,
  runAgentLeadsProcurementFeedAdapter,
  runAgentLeadsPublicSourceProviderAdapters,
  normalizeAgentOsExternalGateSettings,
  normalizeAgentLeadsProviderSettings,
  normalizeAgentOsTask,
  normalizeAgentOsWorkflowSettings,
  transitionAgentOsRun,
  validateAgentLeadsSmokeEvidencePayload,
} from "./agentOperatingSystem.js";

test("Agent OS registry defines safe internal actions and approved-but-disabled external gates", () => {
  const registry = listAgentOsActionRegistry();
  const actionIds = registry.map((action) => action.actionId);
  const leadDraft = getAgentOsAction("lead_follow_up_draft");
  const opportunityPrep = getAgentOsAction("opportunity_search_prep");
  const payment = getAgentOsAction("payment_collection");

  assert.ok(actionIds.includes("opportunity_search_prep"));
  assert.ok(actionIds.includes("lead_follow_up_draft"));
  assert.ok(actionIds.includes("estimate_packet_draft"));
  assert.ok(actionIds.includes("change_order_draft"));
  assert.ok(actionIds.includes("invoice_payment_prep"));
  assert.ok(actionIds.includes("material_list_prep"));
  assert.ok(actionIds.includes("job_costing_review"));
  assert.ok(actionIds.includes("warranty_follow_up_draft"));
  assert.ok(actionIds.includes("permit_checklist_prep"));
  assert.ok(actionIds.includes("crew_handoff_prep"));
  assert.ok(actionIds.includes("daily_report_review"));
  assert.ok(actionIds.includes("upload_photo_review"));
  assert.ok(actionIds.includes("delivery_ticket_review"));
  assert.ok(actionIds.includes("safety_incident_summary"));
  assert.ok(actionIds.includes("pre_pour_review"));
  assert.ok(actionIds.includes("post_pour_review"));
  assert.equal(opportunityPrep.permissionGate, "opportunityScout.canManage");
  assert.equal(opportunityPrep.packageGate, "opportunityScout.canUse");
  assert.match(opportunityPrep.rollbackBehavior, /no web search/i);
  assert.equal(leadDraft.externalGate, null);
  assert.equal(leadDraft.auditEvent, "agent.os.internal.lead_follow_up_draft.prepared");
  assert.equal(payment.externalGate, "payment_collection");
  assert.match(payment.requiredInputs.join(" "), /approvedPaymentBoundary/);
  assert.equal(listAgentOsExternalGates().every((gate) => gate.status === "boundary_approved"), true);
  assert.equal(listAgentOsExternalGates().every((gate) => gate.executionEnabled === false), true);
  assert.match(listAgentOsExternalGates().find((gate) => gate.id === "payment_collection").executionLock, /billing provider/i);
  assert.equal(getAgentOsAction("safety_incident_summary").externalGate, null);
  assert.match(getAgentOsAction("delivery_ticket_review").rollbackBehavior, /no ticket approval/i);
});

test("Agent OS maps selected contractor advisor recommendations into visible safe internal task payloads", () => {
  const leadPayload = deriveAgentOsTaskPayloadFromAdvisorRecommendation({
    recommendation: {
      id: "marketing-lead-sources",
      label: "Rank lead sources by jobs won",
      moduleId: "leads",
    },
    target: { entityType: "lead", entityId: "LEAD-1" },
  }, {
    workspace: { leads: [{ id: "LEAD-1", project: "Driveway lead" }] },
  });
  const estimatePayload = deriveAgentOsTaskPayloadFromAdvisorRecommendation({
    recommendation: { id: "estimate-draft-queue", label: "Turn drafts into packets" },
    target: { entityType: "estimate", entityId: "EST-1" },
  }, {
    workspace: { estimates: [{ id: "EST-1", title: "Patio estimate" }] },
  });
  const jobPayload = deriveAgentOsTaskPayloadFromAdvisorRecommendation({
    recommendation: { id: "money-time", label: "Check time leakage" },
    target: { entityType: "job", entityId: "JOB-1" },
  }, {
    workspace: { jobs: [{ id: "JOB-1", title: "Stamped patio" }] },
  });

  assert.equal(leadPayload.ok, true);
  assert.equal(leadPayload.taskPayload.actionId, "lead_follow_up_draft");
  assert.equal(leadPayload.taskPayload.leadId, "LEAD-1");
  assert.match(leadPayload.source.safetyBoundary, /internal Agent OS draft\/prep/i);
  assert.equal(estimatePayload.taskPayload.actionId, "estimate_packet_draft");
  assert.equal(estimatePayload.taskPayload.estimateId, "EST-1");
  assert.equal(jobPayload.taskPayload.actionId, "job_costing_review");
  assert.equal(jobPayload.taskPayload.jobId, "JOB-1");
  assert.ok(listAgentOsAdvisorTaskMappings().some((mapping) => mapping.recommendationId === "money-proof"));
});

test("Agent OS advisor queue mapping fails closed for unsupported recommendations and invisible targets", () => {
  const unsupported = deriveAgentOsTaskPayloadFromAdvisorRecommendation({
    recommendation: { id: "unknown-action", label: "Do something" },
    target: { entityType: "lead", entityId: "LEAD-1" },
  }, {
    workspace: { leads: [{ id: "LEAD-1" }] },
  });
  const wrongTarget = deriveAgentOsTaskPayloadFromAdvisorRecommendation({
    recommendation: { id: "marketing-lead-sources", label: "Follow up lead" },
    target: { entityType: "job", entityId: "JOB-1" },
  }, {
    workspace: { jobs: [{ id: "JOB-1" }] },
  });
  const invisible = deriveAgentOsTaskPayloadFromAdvisorRecommendation({
    recommendation: { id: "marketing-lead-sources", label: "Follow up lead" },
    target: { entityType: "lead", entityId: "LEAD-404" },
  }, {
    workspace: { leads: [{ id: "LEAD-1" }] },
  });

  assert.equal(unsupported.ok, false);
  assert.match(unsupported.error, /cannot queue/i);
  assert.equal(wrongTarget.ok, false);
  assert.match(wrongTarget.error, /visible lead/i);
  assert.equal(invisible.ok, false);
  assert.match(invisible.error, /visible, company-scoped/i);
});

test("Agent OS workflow settings normalize per-workflow autonomy without opening external gates", () => {
  const settings = normalizeAgentOsWorkflowSettings({
    leadFollowUpDraft: "approval-required",
    emailSend: "approval_required",
    paymentCollection: "draft_only",
    unknown: "ignored",
  });
  const plan = deriveAgentOsAutonomyPlan(settings);

  assert.equal(settings.leadFollowUpDraft, "approval_required");
  assert.equal(settings.emailSend, "approval_required");
  assert.equal(settings.paymentCollection, "draft_only");
  assert.equal(plan.rows.find((row) => row.workflowId === "emailSend").externalLocked, true);
  assert.equal(plan.rows.find((row) => row.workflowId === "emailSend").modeId, "locked");
  assert.equal(plan.rows.find((row) => row.workflowId === "leadFollowUpDraft").externalLocked, false);
  assert.equal(plan.rows.find((row) => row.workflowId === "leadFollowUpDraft").externalActionsLocked, true);
  assert.equal(plan.rows.find((row) => row.workflowId === "leadFollowUpDraft").mayExecuteInternal, true);
  assert.match(plan.safetyBoundary, /boundaries are approved/i);
});

test("Agent OS task and run models include retries, cancellation, dead-letter, and log shape", () => {
  const normalized = normalizeAgentOsTask({
    actionId: "lead_follow_up_draft",
    target: { entityType: "lead", entityId: "LEAD-1", title: "Patio lead" },
    followUpGoal: "Confirm site walk",
  }, {
    id: "TASK-1",
    companyId: "COMPANY-1",
    actorUserId: "USER-1",
    now: "2026-05-27T08:00:00.000Z",
  });
  assert.equal(normalized.ok, true);
  assert.equal(normalized.task.status, "queued");
  assert.equal(normalized.task.maxAttempts, 2);
  assert.equal(normalized.task.cancellation.killSwitch, "company_policy_or_user_cancel");
  assert.equal(normalized.task.inputs.leadId, "LEAD-1");
  assert.match(normalized.task.inputs.followUpGoal, /Confirm site walk/);
  assert.match(normalized.task.idempotencyKey, /company-1:lead_follow_up_draft/i);

  const queuedRun = createAgentOsRunForTask(normalized.task, {
    id: "RUN-1",
    now: "2026-05-27T08:00:00.000Z",
  });
  const running = transitionAgentOsRun(queuedRun, "running", {
    now: "2026-05-27T08:01:00.000Z",
  });
  const retrying = transitionAgentOsRun(running, "retrying", {
    now: "2026-05-27T08:02:00.000Z",
  });
  const dead = transitionAgentOsRun(retrying, "dead_lettered", {
    message: "Max attempts reached",
    now: "2026-05-27T08:03:00.000Z",
  });

  assert.equal(running.startedAt, "2026-05-27T08:01:00.000Z");
  assert.equal(retrying.status, "retrying");
  assert.ok(retrying.nextRetryAt);
  assert.equal(dead.status, "dead_lettered");
  assert.equal(dead.deadLetteredAt, "2026-05-27T08:03:00.000Z");
  assert.match(dead.logs.at(-1).message, /Max attempts/);
});

test("Agent OS normalizes opportunity search prep as a review-only internal task", () => {
  const normalized = normalizeAgentOsTask({
    actionId: "opportunity_search_prep",
    target: { entityType: "opportunitySearchProfile", entityId: "OSP-1", title: "Daily concrete bid scan" },
    searchGoal: "Find public and authorized private jobs for today's review.",
  }, {
    id: "TASK-SCOUT",
    companyId: "COMPANY-1",
    actorUserId: "USER-1",
    now: "2026-05-27T08:00:00.000Z",
  });
  const packet = buildAgentOsInternalDraftPacket(normalized.task, {
    workspace: {
      opportunitySearchProfiles: [{ id: "OSP-1", name: "Daily concrete bid scan" }],
    },
    now: "2026-05-27T08:01:00.000Z",
  });

  assert.equal(normalized.ok, true);
  assert.equal(normalized.task.inputs.searchProfileId, "OSP-1");
  assert.match(normalized.task.inputs.searchGoal, /authorized private jobs/i);
  assert.match(normalized.task.idempotencyKey, /company-1:opportunity_search_prep:osp-1/i);
  assert.equal(packet.ok, true);
  assert.equal(packet.agentProposal.proposalType, "opportunity-search-prep");
  assert.match(packet.agentProposal.blockedReasons.join(" "), /No customer email/i);
  assert.match(packet.agentProposal.draftPrepSummary[0].fieldPreview[1].currentValue, /No live web browsing/i);
  assert.match(packet.agentProposal.redactedResponsePreview, /Daily public\/private opportunity-source checklist/i);
  assert.equal(packet.output.executionPlan.mode, "daily_agent_leads_scout_execution_v6");
  assert.match(packet.output.executionPlan.safetyBoundary, /live-capable-but-locked provider plans/i);
});

test("Agent OS derives daily opportunity search prep queue without duplicating same-day runs", () => {
  const queue = deriveAgentOsOpportunitySearchPrepQueue({
    companyId: "COMPANY-1",
    today: "2026-05-27",
    opportunitySearchProfiles: [
      { id: "OSP-1", name: "Public bid scan", status: "active", cadence: "daily", lastRunAt: "", nextRunAt: "2026-05-27" },
      { id: "OSP-2", name: "Manual relationship scan", status: "active", cadence: "manual", nextRunAt: "2026-05-27" },
      { id: "OSP-3", name: "Paused scan", status: "paused", cadence: "daily", nextRunAt: "2026-05-27" },
      { id: "OSP-4", name: "Future scan", status: "active", cadence: "weekly", lastRunAt: "2026-05-26", nextRunAt: "2026-06-01" },
    ],
  });
  const duplicateQueue = deriveAgentOsOpportunitySearchPrepQueue({
    companyId: "COMPANY-1",
    today: "2026-05-27",
    opportunitySearchProfiles: [
      { id: "OSP-1", name: "Public bid scan", status: "active", cadence: "daily", lastRunAt: "", nextRunAt: "2026-05-27" },
    ],
    existingTasks: [{
      idempotencyKey: queue.queued[0].idempotencyKey,
    }],
  });

  assert.equal(queue.queuedCount, 1);
  assert.equal(queue.dueCount, 1);
  assert.equal(queue.profileCount, 2);
  assert.equal(queue.queued[0].payload.actionId, "opportunity_search_prep");
  assert.equal(queue.queued[0].payload.searchProfileId, "OSP-1");
  assert.match(queue.queued[0].payload.searchGoal, /2026-05-27/);
  assert.match(queue.safetyBoundary, /does not browse, scrape, contact/i);
  assert.equal(queue.schedulerHook.safeForCron, true);
  assert.equal(queue.schedulerHook.mode, "daily_agent_leads_scout_execution_v6");
  assert.equal(duplicateQueue.queuedCount, 0);
  assert.equal(duplicateQueue.skippedCount, 1);
  assert.equal(duplicateQueue.skipped[0].reason, "already_queued_for_today");
});

test("Agent OS builds daily scout execution cards without saving leads or credentials", () => {
  const plan = buildAgentOsOpportunityScoutExecutionPlan({
    today: "2026-05-27",
    companySettings: {
      serviceArea: "Salem Oregon",
      apexAgentAutomationPolicy: {
        publicLeadProviderSettings: {
          providerId: "dry_run_simulator",
          mode: "dry_run",
          dailyBudget: 10,
          allowedSourceCategories: ["public_web_search", "public_bid_page", "local_classified"],
        },
      },
    },
    opportunitySearchProfiles: [
      {
        id: "OSP-PUBLIC",
        name: "Public concrete bid scan",
        status: "active",
        cadence: "daily",
        trades: ["concrete"],
        serviceAreas: ["Salem"],
        sourceTypes: ["Public bid portal"],
        sourceAdapterId: "public_web",
        sourceTermsStatus: "public_allowed",
        nextRunAt: "2026-05-27",
        notes: "[2026-05-27 source check] Result: Found Work | Next: Save found opportunity | Source: Public concrete bid scan | Note: Sidewalk packet found. | Review-first: no lead, contact, message, or bid was created from this check.",
      },
      {
        id: "OSP-PRIVATE",
        name: "GC portal scan",
        status: "active",
        cadence: "daily",
        sourceAdapterId: "approved_browser_session",
        sourceAuthorizationStatus: "needs_authorization",
        nextRunAt: "2026-05-27",
      },
    ],
    leadSources: [
      { id: "LS-PUBLIC", name: "City bids", type: "Public bid page", url: "https://example.test/bids", status: "Active" },
    ],
  });

  assert.equal(plan.mode, "daily_agent_leads_scout_execution_v6");
  assert.equal(plan.stats.publicRunnerCards >= 2, true);
  assert.equal(plan.stats.publicDiscoveryCards >= 1, true);
  assert.equal(plan.stats.privateHandoffCards >= 1, true);
  assert.equal(plan.stats.foundDraftCards, 1);
  assert.equal(plan.publicRunnerCards[0].searchUrls.length > 0, true);
  assert.equal(plan.publicDiscoveryQueue[0].type, "public_discovery_result");
  assert.equal(plan.publicProviderBoundary.liveSearchEnabled, false);
  assert.equal(plan.publicProviderBoundary.providerContract.id, "agent_leads_public_provider_contract_v6");
  assert.equal(plan.publicProviderBoundary.providerSettings.dailyBudget, 10);
  assert.equal(plan.dailyRunRecord.status, "prepared");
  assert.equal(plan.dailyRunRecord.publicDiscoveryCardCount, plan.stats.publicDiscoveryCards);
  assert.equal(plan.dailyRunRecord.providerAttemptCount >= 1, true);
  assert.equal(plan.dailyRunRecord.providerResultCount >= plan.publicDiscoveryQueue.length, true);
  assert.equal(plan.dailyRunRecord.providerReviewImportCount, plan.providerReviewImportQueue.length);
  assert.equal(plan.stats.providerAttempts >= 1, true);
  assert.equal(plan.stats.providerReviewImports, plan.providerReviewImportQueue.length);
  assert.equal(plan.stats.reviewedOutcomeSignals >= 1, true);
  assert.match(plan.publicDiscoveryQueue[0].safetyBoundary, /has not contacted anyone/i);
  assert.equal(Boolean(plan.publicDiscoveryQueue[0].provider), true);
  assert.equal(plan.publicDiscoveryQueue[0].liveFetchStatus, "dry_run_only");
  assert.equal(Boolean(plan.publicDiscoveryQueue[0].providerConnectorId), true);
  assert.equal(plan.publicDiscoveryQueue[0].providerImportGate.canAutoSave, false);
  assert.equal(plan.providerReviewImportQueue[0].importGate.canAutoSave, false);
  assert.match(plan.providerReviewImportQueue[0].safetyBoundary, /review-only/i);
  assert.match(plan.privateHandoffCards[0].safetyBoundary, /does not log in/i);
  assert.equal(plan.foundDraftQueue[0].draftPreview.humanReviewStatus, "needs_review");
  assert.match(plan.foundDraftQueue[0].safetyBoundary, /No Found Opportunity, Lead/i);
  assert.match(plan.guardrails.join(" "), /No cold calls/i);
});

test("Agent OS provider contract normalizes settings and simulator fails closed", () => {
  const settings = normalizeAgentLeadsProviderSettings({
    providerId: "Future Search API",
    mode: "live",
    dailyBudget: 999,
    maxResultsPerRun: 99,
    allowedSourceCategories: "public_web_search, public_bid_page",
    enabledConnectorIds: ["public_web_search", "facebook_private_group", "public_procurement_search"],
    geographyControls: { serviceAreas: "Salem, Albany", states: ["OR"], radiusMiles: 999 },
    tradeScope: { trades: "concrete, fencing", excludedKeywords: "free, diy" },
    reviewRules: { requireHumanOpen: false, minFitScoreForReview: 200 },
    credentialBoundary: { mode: "password", credentialRef: "secret-password" },
    lastHealthStatus: "OK",
  });
  const contract = buildAgentLeadsProviderContract(settings);
  const connectors = listApprovedAgentLeadsProviderConnectors(settings);
  const plan = buildAgentOsOpportunityScoutExecutionPlan({
    today: "2026-05-27",
    companySettings: {
      serviceArea: "Salem Oregon",
      apexAgentAutomationPolicy: {
        publicLeadProviderSettings: {
          ...settings,
          mode: "disabled",
          dailyBudget: 0,
        },
      },
    },
    opportunitySearchProfiles: [{
      id: "OSP-DISABLED",
      name: "Disabled public search",
      status: "active",
      cadence: "daily",
      trades: ["concrete"],
      serviceAreas: ["Salem"],
      sourceTypes: ["Public bid portal"],
      sourceAdapterId: "public_web",
      sourceTermsStatus: "public_allowed",
      nextRunAt: "2026-05-27",
    }],
  });

  assert.equal(settings.providerId, "future_search_api");
  assert.equal(settings.mode, "dry_run");
  assert.equal(settings.dailyBudget, 250);
  assert.equal(settings.maxResultsPerRun, 10);
  assert.deepEqual(settings.enabledConnectorIds, ["public_web_search", "public_procurement_search"]);
  assert.deepEqual(settings.geographyControls.serviceAreas, ["Salem", "Albany"]);
  assert.equal(settings.geographyControls.radiusMiles, 250);
  assert.deepEqual(settings.tradeScope.excludedKeywords, ["free", "diy"]);
  assert.equal(settings.reviewRules.requireHumanOpen, false);
  assert.equal(settings.reviewRules.minFitScoreForReview, 100);
  assert.equal(settings.credentialBoundary.mode, "none");
  assert.equal(settings.credentialBoundary.rawCredentialStorage, false);
  assert.equal(connectors.some((connector) => connector.id === "public_web_search" && connector.enabled), true);
  assert.equal(connectors.every((connector) => connector.executionEnabled === false), true);
  assert.equal(contract.liveSearchEnabled, false);
  assert.equal(contract.liveCapability.executionEnabled, false);
  assert.equal(contract.credentialBoundary.rawPasswordsAccepted, false);
  assert.match(contract.safetyBoundary, /activation-ready but locked/i);
  assert.equal(plan.publicDiscoveryQueue.length, 0);
  assert.equal(plan.providerAttempts[0].status, "disabled");
  assert.equal(plan.dailyRunRecord.providerErrorCount, 1);
  assert.equal(plan.dailyRunRecord.providerResultCount, 0);
  assert.equal(plan.publicProviderBoundary.liveProviderPlan.status, "disabled");
  assert.equal(plan.publicProviderBoundary.providerActivationReadiness.executionEnabled, false);
});

test("Agent OS v6 keeps live provider mode locked and disables unselected connectors", () => {
  const plan = buildAgentOsOpportunityScoutExecutionPlan({
    today: "2026-05-27",
    companySettings: {
      serviceArea: "Salem Oregon",
      apexAgentAutomationPolicy: {
        publicLeadProviderSettings: {
          providerId: "approved_public_search",
          mode: "live_locked",
          dailyBudget: 10,
          enabledConnectorIds: ["public_procurement_search"],
          allowedSourceCategories: ["public_marketplace", "public_bid_page"],
          credentialBoundary: { mode: "oauth_reference_only", credentialRef: "conn-ref-1", password: "do-not-store" },
        },
      },
    },
    opportunitySearchProfiles: [
      {
        id: "OSP-FB-PUBLIC",
        name: "Facebook Marketplace scan",
        status: "active",
        cadence: "daily",
        sourceAdapterId: "facebook_marketplace",
        sourceTermsStatus: "public_allowed",
        nextRunAt: "2026-05-27",
      },
    ],
  });

  assert.equal(plan.mode, "daily_agent_leads_scout_execution_v6");
  assert.equal(plan.publicProviderBoundary.providerContract.id, "agent_leads_public_provider_contract_v6");
  assert.equal(plan.publicProviderBoundary.liveProviderPlan.status, "live_capable_locked");
  assert.equal(plan.publicProviderBoundary.liveProviderPlan.executionEnabled, false);
  assert.equal(plan.publicProviderBoundary.providerContract.credentialBoundary.passwordStorage, false);
  assert.equal(plan.publicDiscoveryQueue.length, 0);
  assert.equal(plan.providerAttempts[0].status, "live_locked");
  assert.equal(plan.providerAttempts[0].liveRequestAttempted, false);

  const connectorBlocked = buildAgentOsOpportunityScoutExecutionPlan({
    today: "2026-05-27",
    companySettings: {
      serviceArea: "Salem Oregon",
      apexAgentAutomationPolicy: {
        publicLeadProviderSettings: {
          mode: "dry_run",
          dailyBudget: 10,
          enabledConnectorIds: ["public_procurement_search"],
          allowedSourceCategories: ["public_marketplace"],
        },
      },
    },
    opportunitySearchProfiles: [{
      id: "OSP-FB-PUBLIC",
      name: "Facebook Marketplace scan",
      status: "active",
      cadence: "daily",
      sourceAdapterId: "facebook_marketplace",
      sourceTermsStatus: "public_allowed",
      nextRunAt: "2026-05-27",
    }],
  });
  assert.equal(connectorBlocked.providerAttempts[0].status, "provider_connector_disabled");
  assert.equal(connectorBlocked.publicDiscoveryQueue.length, 0);
});

test("Agent OS v6 provider activation health, sandbox, and import decisions stay review-only", () => {
  const settings = normalizeAgentLeadsProviderSettings({
    providerId: "approved_public_search",
    mode: "test",
    dailyBudget: 12,
    maxResultsPerRun: 2,
    enabledConnectorIds: ["public_web_search", "public_procurement_search"],
    geographyControls: { serviceAreas: ["Salem"] },
    tradeScope: { trades: ["concrete"] },
    reviewRules: { requireHumanOpen: true, dedupeBeforeImport: true, minFitScoreForReview: 55 },
  });
  const readiness = deriveAgentLeadsProviderActivationReadiness(settings);
  const health = buildAgentLeadsProviderHealthCheck(settings, { now: "2026-05-27T08:00:00.000Z" });
  const sandbox = buildAgentLeadsProviderSandboxRun({
    settings,
    day: "2026-05-27",
    now: "2026-05-27T08:01:00.000Z",
    request: {
      connectorId: "public_web_search",
      query: "Salem concrete public bid opportunity",
      title: "Sandbox concrete bid",
    },
  });
  const decision = normalizeAgentLeadsProviderImportDecision({
    providerResultId: sandbox.results[0].providerResultId,
    providerAttemptId: sandbox.providerAttempt.attemptId,
    decision: "save_draft",
    note: "Looks relevant.",
  }, {
    id: "DECISION-1",
    companyId: "COMPANY-1",
    actorUserId: "USER-1",
    now: "2026-05-27T08:02:00.000Z",
  });

  assert.equal(readiness.executionEnabled, false);
  assert.equal(readiness.liveSearchEnabled, false);
  assert.equal(readiness.status, "blocked");
  assert.equal(readiness.checks.some((check) => check.id === "live-execution-lock" && check.status === "blocked"), true);
  assert.equal(health.contractId, "agent_leads_public_provider_contract_v6");
  assert.equal(health.executionEnabled, false);
  assert.equal(health.redactedConfig.credentialBoundary.passwordStorage, false);
  assert.equal(sandbox.mode, "agent_leads_provider_sandbox_v6");
  assert.equal(sandbox.liveRequestAttempted, false);
  assert.equal(sandbox.results.length > 0, true);
  assert.match(sandbox.safetyBoundary, /deterministic local fixtures/i);
  assert.equal(decision.ok, true);
  assert.equal(decision.decision.canAutoSave, false);
  assert.equal(decision.decision.savedRecordId, "");
  assert.match(decision.decision.safetyBoundary, /does not save/i);
});

test("Agent OS v6 live adapter approval packet records boundary approval without enabling execution", () => {
  const settings = normalizeAgentLeadsProviderSettings({
    providerId: "approved_public_search",
    mode: "live_locked",
    dailyBudget: 20,
    maxResultsPerRun: 3,
    enabledConnectorIds: ["public_web_search", "public_procurement_search"],
    geographyControls: { serviceAreas: ["Salem"] },
    tradeScope: { trades: ["concrete"] },
    reviewRules: { requireHumanOpen: true, dedupeBeforeImport: true },
  });
  const executionContract = buildAgentLeadsLiveAdapterExecutionContract(settings);
  const packet = buildAgentLeadsLiveAdapterApprovalPacket({
    settings,
    auditEvents: [{
      id: "AUDIT-1",
      action: "agent.os.provider.sandbox_test.prepared",
      createdAt: "2026-05-27T08:00:00.000Z",
      detail: JSON.stringify({
        providerSandboxRun: { providerId: "approved_public_search", connectorId: "public_web_search", status: "ok", results: [{ id: "R-1" }] },
        providerResultCount: 1,
      }),
    }],
    companyId: "COMPANY-1",
    actorUserId: "OWNER-1",
    now: "2026-05-27T08:10:00.000Z",
  });
  const directEnable = normalizeAgentLeadsLiveAdapterApprovalDecision({
    decision: "approve_boundary",
    providerId: "approved_public_search",
    connectorIds: ["public_web_search"],
    acknowledgement: true,
    executionEnabled: true,
  }, { settings });
  const approved = normalizeAgentLeadsLiveAdapterApprovalDecision({
    decision: "approve_boundary",
    providerId: "approved_public_search",
    connectorIds: ["public_web_search"],
    acknowledgement: true,
    note: "Approved boundary only.",
  }, {
    settings,
    id: "APPROVAL-1",
    companyId: "COMPANY-1",
    actorUserId: "OWNER-1",
    now: "2026-05-27T08:11:00.000Z",
  });
  const badCredentialSettings = normalizeAgentLeadsProviderSettings({
    ...settings,
    enabledConnectorIds: ["public_plan_room_search"],
    credentialBoundary: { mode: "none" },
  });
  const missingCredential = normalizeAgentLeadsLiveAdapterApprovalDecision({
    decision: "approve_boundary",
    providerId: "approved_public_search",
    connectorIds: ["public_plan_room_search"],
    acknowledgement: true,
  }, { settings: badCredentialSettings });
  const unselected = normalizeAgentLeadsLiveAdapterApprovalDecision({
    decision: "approve_boundary",
    providerId: "approved_public_search",
    connectorIds: ["public_classifieds_search"],
    acknowledgement: true,
  }, { settings });

  assert.equal(executionContract.executionEnabled, false);
  assert.equal(executionContract.liveSearchEnabled, false);
  assert.equal(executionContract.canEnableFromClient, false);
  assert.match(executionContract.noContactGuarantees.join(" "), /no cold calls/i);
  assert.equal(packet.version, "v6");
  assert.equal(packet.prerequisites.status, "ready_for_boundary_approval");
  assert.equal(packet.auditView.sandboxTestCount, 1);
  assert.equal(packet.executionEnabled, false);
  assert.equal(directEnable.ok, false);
  assert.match(directEnable.error, /cannot be enabled/i);
  assert.equal(approved.ok, true);
  assert.equal(approved.decision.status, "boundary_approved");
  assert.equal(approved.decision.executionEnabled, false);
  assert.equal(missingCredential.ok, false);
  assert.match(missingCredential.error, /credential/i);
  assert.equal(unselected.ok, false);
  assert.match(unselected.error, /not selected/i);
});

test("Agent OS v7 provider runner, scheduler, credential handoff, and draft preview stay review-only", () => {
  const settings = normalizeAgentLeadsProviderSettings({
    providerId: "approved_public_search",
    mode: "test",
    dailyBudget: 20,
    maxResultsPerRun: 2,
    enabledConnectorIds: ["public_web_search", "public_procurement_search"],
    geographyControls: { serviceAreas: ["Salem"] },
    tradeScope: { trades: ["concrete"] },
    reviewRules: { requireHumanOpen: true, dedupeBeforeImport: true },
  });
  const plan = buildAgentOsOpportunityScoutExecutionPlan({
    today: "2026-05-27",
    companySettings: {
      apexAgentAutomationPolicy: { publicLeadProviderSettings: settings },
    },
    opportunitySearchProfiles: [{
      id: "OSP-V7",
      name: "V7 public search",
      status: "active",
      cadence: "daily",
      trades: ["concrete"],
      serviceAreas: ["Salem"],
      sourceTypes: ["Public bid portal"],
      sourceAdapterId: "public_web",
      sourceTermsStatus: "public_allowed",
      nextRunAt: "2026-05-27",
    }],
  });
  const runner = buildAgentLeadsProviderAdapterRunner({
    settings,
    runnerCards: plan.publicRunnerCards,
    companyId: "COMPANY-1",
    actorUserId: "USER-1",
    today: "2026-05-27",
    now: "2026-05-27T09:00:00.000Z",
  });
  const liveAttempt = buildAgentLeadsProviderAdapterRunner({
    settings,
    runnerCards: plan.publicRunnerCards,
    companyId: "COMPANY-1",
    actorUserId: "USER-1",
    today: "2026-05-27",
    executeLive: true,
  });
  const schedule = buildAgentLeadsAutonomousDailyScoutSchedule({
    opportunitySearchProfiles: [{
      id: "OSP-V7",
      name: "V7 public search",
      status: "active",
      cadence: "daily",
      nextRunAt: "2026-05-27",
    }],
    companyId: "COMPANY-1",
    settings,
    today: "2026-05-27",
  });
  const handoff = normalizeAgentLeadsCredentialHandoff({
    sourceAdapterId: "facebook_private_group",
    credentialRef: "credref_private_source_1",
  }, {
    id: "HANDOFF-1",
    companyId: "COMPANY-1",
    actorUserId: "OWNER-1",
    now: "2026-05-27T09:05:00.000Z",
  });
  const rawPasswordBlocked = normalizeAgentLeadsCredentialHandoff({
    sourceAdapterId: "facebook_private_group",
    credentialRef: "credref_private_source_1",
    password: "do-not-store",
  });
  const draftPreview = buildAgentLeadsProviderResultDraftPreview(runner.results[0], {
    id: "DRAFT-PREVIEW-1",
    companyId: "COMPANY-1",
    actorUserId: "USER-1",
  });

  assert.equal(runner.mode, "agent_leads_provider_adapter_runner_v7");
  assert.equal(runner.liveRequestAttempted, false);
  assert.equal(runner.executionEnabled, false);
  assert.equal(runner.results.length > 0, true);
  assert.equal(runner.resultDraftPreviews[0].canAutoSave, false);
  assert.equal(liveAttempt.status, "blocked");
  assert.match(liveAttempt.blockedReasons.join(" "), /Direct live execution/i);
  assert.equal(schedule.mode, "agent_leads_autonomous_daily_scheduler_v7");
  assert.equal(schedule.safeForCron, true);
  assert.equal(schedule.providerExecutionEnabled, false);
  assert.equal(handoff.ok, true);
  assert.equal(handoff.credentialHandoff.passwordStorage, false);
  assert.equal(rawPasswordBlocked.ok, false);
  assert.match(rawPasswordBlocked.error, /references only/i);
  assert.equal(draftPreview.ok, true);
  assert.equal(draftPreview.draftPreview.savedRecordId, "");
});

test("Agent OS v8 live-public provider execution requires approval, budget, no-login connectors, and review queue", () => {
  const settings = normalizeAgentLeadsProviderSettings({
    providerId: "approved_public_search",
    mode: "live_locked",
    dailyBudget: 2,
    maxResultsPerRun: 2,
    enabledConnectorIds: ["public_procurement_search"],
    geographyControls: { serviceAreas: ["Salem"] },
    tradeScope: { trades: ["concrete"] },
    reviewRules: { requireHumanOpen: true, dedupeBeforeImport: true },
  });
  const approvedAudit = [{
    id: "AUDIT-APPROVAL",
    action: "agent.os.provider.live_adapter.approve_boundary",
    createdAt: "2026-05-27T08:00:00.000Z",
    detail: JSON.stringify({
      providerApprovalDecision: {
        providerId: "approved_public_search",
        connectorIds: ["public_procurement_search"],
        decision: "approve_boundary",
        status: "boundary_approved",
        actorUserId: "OWNER-1",
        createdAt: "2026-05-27T08:00:00.000Z",
      },
    }),
  }];
  const plan = buildAgentOsOpportunityScoutExecutionPlan({
    today: "2026-05-27",
    companySettings: { apexAgentAutomationPolicy: { publicLeadProviderSettings: settings } },
    opportunitySearchProfiles: [{
      id: "OSP-V8",
      name: "V8 public bids",
      status: "active",
      cadence: "daily",
      trades: ["concrete"],
      serviceAreas: ["Salem"],
      sourceTypes: ["Public bid portal"],
      sourceAdapterId: "public_web",
      sourceTermsStatus: "public_allowed",
      nextRunAt: "2026-05-27",
    }],
  });
  const execution = buildAgentLeadsLivePublicProviderExecution({
    settings,
    runnerCards: plan.publicRunnerCards,
    auditEvents: approvedAudit,
    companyId: "COMPANY-1",
    actorUserId: "OWNER-1",
    today: "2026-05-27",
    connectorIds: ["public_procurement_search"],
    serverGates: { packageEnabled: true, roleAllowed: true, ownerAdminApproved: true },
  });
  const noApproval = buildAgentLeadsLivePublicProviderExecution({
    settings,
    runnerCards: plan.publicRunnerCards,
    auditEvents: [],
    companyId: "COMPANY-1",
    actorUserId: "OWNER-1",
    today: "2026-05-27",
    connectorIds: ["public_procurement_search"],
    serverGates: { packageEnabled: true, roleAllowed: true, ownerAdminApproved: true },
  });
  const directClient = buildAgentLeadsLivePublicProviderExecution({
    settings,
    runnerCards: plan.publicRunnerCards,
    auditEvents: approvedAudit,
    companyId: "COMPANY-1",
    actorUserId: "OWNER-1",
    today: "2026-05-27",
    connectorIds: ["public_procurement_search"],
    directClientAttempt: true,
    serverGates: { packageEnabled: true, roleAllowed: true, ownerAdminApproved: true },
  });
  const loginConnector = buildAgentLeadsLivePublicProviderExecution({
    settings: normalizeAgentLeadsProviderSettings({ ...settings, enabledConnectorIds: ["public_plan_room_search"], credentialBoundary: { mode: "oauth_reference_only", credentialRef: "credref-planroom" } }),
    runnerCards: plan.publicRunnerCards,
    auditEvents: approvedAudit,
    companyId: "COMPANY-1",
    actorUserId: "OWNER-1",
    today: "2026-05-27",
    connectorIds: ["public_plan_room_search"],
    serverGates: { packageEnabled: true, roleAllowed: true, ownerAdminApproved: true },
  });
  const spentAudit = [{
    id: "AUDIT-SPENT",
    action: "agent.os.provider.live_public_execution.review_queue_prepared",
    createdAt: "2026-05-27T09:00:00.000Z",
    detail: JSON.stringify({ providerLivePublicExecution: execution }),
  }];
  const priorDayExecution = {
    ...execution,
    today: "2026-05-26",
    adapterInvocations: execution.adapterInvocations.map((attempt) => ({
      ...attempt,
      attemptId: attempt.attemptId.replace("2026-05-27", "2026-05-26"),
      idempotencyKey: attempt.idempotencyKey.replace("2026-05-27", "2026-05-26"),
    })),
  };
  const duplicateExecution = buildAgentLeadsLivePublicProviderExecution({
    settings,
    runnerCards: plan.publicRunnerCards,
    auditEvents: [...approvedAudit, ...spentAudit],
    companyId: "COMPANY-1",
    actorUserId: "OWNER-1",
    today: "2026-05-27",
    connectorIds: ["public_procurement_search"],
    serverGates: { packageEnabled: true, roleAllowed: true, ownerAdminApproved: true },
  });
  const ledger = deriveAgentLeadsProviderAttemptLedger(spentAudit, settings, { today: "2026-05-27" });
  const priorDayLedger = deriveAgentLeadsProviderAttemptLedger([{
    id: "AUDIT-PRIOR-DAY-SPENT",
    action: "agent.os.provider.live_public_execution.review_queue_prepared",
    createdAt: "2026-05-27T00:30:00.000Z",
    detail: JSON.stringify({ providerLivePublicExecution: priorDayExecution }),
  }], settings, { today: "2026-05-27" });
  const reviewQueue = buildAgentLeadsProviderReviewQueue(execution.results, { companyId: "COMPANY-1", actorUserId: "OWNER-1" });
  const reviewDecision = normalizeAgentLeadsProviderReviewQueueDecision({
    providerResultId: reviewQueue.rows[0].providerResultId,
    decision: "draft_found_opportunity",
  }, { companyId: "COMPANY-1", actorUserId: "OWNER-1" });
  const autoSaveBlocked = normalizeAgentLeadsProviderReviewQueueDecision({
    providerResultId: reviewQueue.rows[0].providerResultId,
    decision: "draft_found_opportunity",
    autoSave: true,
  });

  assert.equal(execution.mode, "agent_leads_live_public_provider_execution_v8");
  assert.equal(execution.status, "review_queue_prepared");
  assert.equal(execution.livePublicExecutionEnabled, true);
  assert.equal(execution.externalNetworkRequestAttempted, false);
  assert.equal(execution.reviewQueue.count > 0, true);
  assert.equal(execution.reviewQueue.rows[0].canAutoSave, false);
  assert.equal(noApproval.status, "blocked");
  assert.match(noApproval.blockedReasons.join(" "), /approval/i);
  assert.equal(directClient.status, "blocked");
  assert.match(directClient.blockedReasons.join(" "), /Direct client/i);
  assert.equal(loginConnector.status, "blocked");
  assert.match(loginConnector.blockedReasons.join(" "), /no-login/i);
  assert.equal(duplicateExecution.status, "blocked");
  assert.match(duplicateExecution.blockedReasons.join(" "), /Duplicate/i);
  assert.equal(ledger.usedBudget >= 1, true);
  assert.equal(priorDayLedger.usedBudget, 0);
  assert.equal(reviewDecision.ok, true);
  assert.equal(reviewDecision.decision.canAutoSave, false);
  assert.equal(autoSaveBlocked.ok, false);
});

test("Agent OS v20 provider review decisions create redacted learning and source quality signals", () => {
  const accepted = normalizeAgentLeadsProviderReviewLearningSignal({
    providerResultId: "RESULT-1",
    providerAttemptId: "ATTEMPT-1",
    connectorId: "public_procurement_search",
    sourceUrl: "https://city.example/bids/sidewalk-rfp",
    sourceType: "public bid",
    title: "Concrete sidewalk RFP",
    decision: "draft_found_opportunity",
    fitScore: 82,
    note: "Owner liked it. email owner@example.com password=secret",
  }, { companyId: "COMPANY-1", actorUserId: "OWNER-1", now: "2026-05-28T08:00:00.000Z" });
  const duplicate = normalizeAgentLeadsProviderReviewLearningSignal({
    providerResultId: "RESULT-2",
    providerAttemptId: "ATTEMPT-2",
    connectorId: "public_procurement_search",
    sourceUrl: "https://city.example/bids/curb-rfp",
    sourceType: "public bid",
    title: "Concrete curb RFP",
    decision: "mark_duplicate",
  }, { companyId: "COMPANY-1", actorUserId: "OWNER-1", now: "2026-05-28T09:00:00.000Z" });
  const noFitDecision = normalizeAgentLeadsProviderReviewQueueDecision({
    providerResultId: "RESULT-3",
    providerAttemptId: "ATTEMPT-3",
    connectorId: "public_classifieds_search",
    sourceUrl: "https://classifieds.example/jobs/free-diy",
    sourceType: "classified",
    title: "Free DIY help wanted",
    decision: "no_fit",
    token: "",
  }, { companyId: "COMPANY-1", actorUserId: "OWNER-1", now: "2026-05-28T10:00:00.000Z" });
  const privateHandoff = normalizeAgentLeadsProviderReviewLearningSignal({
    providerResultId: "PRIVATE-HANDOFF-1",
    connectorId: "facebook_private_group",
    sourceType: "private_social",
    title: "Private group handoff",
    decision: "private_handoff_completed",
  }, { companyId: "COMPANY-1", actorUserId: "OWNER-1", now: "2026-05-28T10:30:00.000Z" });
  const secretBlocked = normalizeAgentLeadsProviderReviewQueueDecision({
    providerResultId: "RESULT-4",
    decision: "draft_found_opportunity",
    password: "do-not-store",
  });
  const snapshot = deriveAgentLeadsProviderReviewLearningSnapshot([
    { detail: { providerReviewLearningSignal: accepted.signal }, createdAt: accepted.signal.createdAt },
    { detail: { providerReviewLearningSignal: duplicate.signal }, createdAt: duplicate.signal.createdAt },
    { detail: { providerReviewQueueDecision: noFitDecision.decision }, createdAt: noFitDecision.decision.createdAt },
    { detail: { providerReviewLearningSignal: privateHandoff.signal }, createdAt: privateHandoff.signal.createdAt },
  ], { companyId: "COMPANY-1", today: "2026-05-28" });
  const reviewQueue = buildAgentLeadsProviderReviewQueue([{
    providerResultId: "RESULT-5",
    providerAttemptId: "ATTEMPT-5",
    connectorId: "public_procurement_search",
    sourceUrl: "https://city.example/bids/ada-ramp-rfp",
    sourceType: "public bid",
    title: "Concrete ADA ramp RFP in Salem",
    fitScore: 70,
    duplicateRisk: "none",
  }], {
    companyId: "COMPANY-1",
    actorUserId: "OWNER-1",
    now: "2026-05-28T11:00:00.000Z",
    learningSnapshot: snapshot,
    settings: { tradeScope: { trades: ["concrete"] }, geographyControls: { serviceAreas: ["Salem"] } },
  });
  const workflow = buildAgentLeadsDailyReviewWorkflowSnapshot({
    reviewInboxRows: reviewQueue.rows,
    privateChecklistRows: [{ id: "PRIVATE-HANDOFF-2", title: "Nextdoor handoff" }],
    learningSnapshot: snapshot,
    today: "2026-05-28",
  });

  assert.equal(accepted.ok, true);
  assert.equal(accepted.signal.learningSignalType, "accepted_found_opportunity");
  assert.match(accepted.signal.redactedNote, /\[redacted-email\]/);
  assert.match(accepted.signal.redactedNote, /\[redacted\]/);
  assert.equal(noFitDecision.ok, true);
  assert.equal(secretBlocked.ok, false);
  assert.equal(privateHandoff.ok, true);
  assert.equal(snapshot.mode, "agent_leads_provider_review_learning_snapshot_v21");
  assert.equal(snapshot.signalCount, 4);
  assert.equal(snapshot.sourceQualitySnapshot.count >= 2, true);
  assert.equal(snapshot.sourceQualitySnapshot.rows.some((row) => row.quality === "promising_source" || row.quality === "good_source"), true);
  assert.equal(snapshot.sourceTrendCards.some((card) => card.id === "best_sources"), true);
  assert.equal(snapshot.tomorrowAdjustments.some((adjustment) => adjustment.action === "rank_higher"), true);
  assert.equal(workflow.mode, "agent_leads_daily_review_workflow_v21");
  assert.equal(workflow.counts.accepted, 1);
  assert.equal(workflow.counts.duplicates, 1);
  assert.equal(workflow.counts.noFit, 1);
  assert.equal(workflow.counts.privateHandoffsCompleted, 1);
  assert.equal(workflow.counts.privateHandoffRows, 1);
  assert.equal(workflow.leadAutoSaveEnabled, false);
  assert.equal(workflow.customerContactEnabled, false);
  assert.equal(reviewQueue.mode, "agent_leads_provider_review_queue_v20");
  assert.equal(reviewQueue.rows[0].learningScoreAdjustment > 0, true);
  assert.match(reviewQueue.rows[0].whyApexFoundThis.summary, /trade match|source history/i);
  assert.equal(reviewQueue.rows[0].canAutoSave, false);
});

test("Agent OS v22 source expansion controls classify sources without opening external actions", () => {
  const publicControl = normalizeAgentLeadsSourceExpansionControl({
    id: "SRC-PUBLIC",
    sourceAdapterId: "craigslist_local_board",
    sourceName: "Public classifieds",
    sourceType: "Community classifieds",
    sourceUrl: "https://classifieds.example/jobs",
    sourcePosture: "public_no_login",
  }, { companyId: "COMPANY-1", actorUserId: "OWNER-1", now: "2026-05-28T12:00:00.000Z" });
  const privateControl = normalizeAgentLeadsSourceExpansionControl({
    id: "SRC-PRIVATE",
    sourceAdapterId: "facebook_private_group",
    sourceName: "Private group",
    sourceType: "Facebook private group",
    sourcePosture: "private_human_handoff",
  }, { companyId: "COMPANY-1", actorUserId: "OWNER-1", now: "2026-05-28T12:00:00.000Z" });
  const unsafePublic = normalizeAgentLeadsSourceExpansionControl({
    sourceAdapterId: "public_web",
    sourceUrl: "https://example.com/login",
    sourcePosture: "public_no_login",
  });
  const secretBlocked = normalizeAgentLeadsSourceExpansionControl({
    sourceAdapterId: "gc_portal",
    sourcePosture: "private_human_handoff",
    password: "do-not-store",
  });
  const learning = deriveAgentLeadsProviderReviewLearningSnapshot([
    {
      detail: {
        providerReviewLearningSignal: {
          companyId: "COMPANY-1",
          connectorId: "public_classifieds_search",
          sourceType: "public classifieds listing",
          decision: "draft_found_opportunity",
          learningSignalType: "accepted_found_opportunity",
          sourceQualityVote: "good_source",
          scoreAdjustment: 8,
          providerResultId: "RESULT-22",
          createdAt: "2026-05-28T11:00:00.000Z",
        },
      },
      createdAt: "2026-05-28T11:00:00.000Z",
    },
  ], { companyId: "COMPANY-1", today: "2026-05-28" });
  const controls = buildAgentLeadsSourceExpansionControls({
    opportunitySearchProfiles: [{
      id: "OSP-PUBLIC",
      name: "Public board",
      sourceAdapterId: "craigslist_local_board",
      sourceTypes: ["Community classifieds"],
      sourcePosture: "public_no_login",
      sourceTermsStatus: "public_allowed",
    }, {
      id: "OSP-PRIVATE",
      name: "Private group",
      sourceAdapterId: "facebook_private_group",
      sourceTypes: ["Facebook private group"],
      sourcePosture: "private_human_handoff",
      sourceAccessStatus: "needs_human",
      sourceTermsStatus: "human_review_required",
    }],
    leadSources: [{ id: "LS-1", name: "Inbox forwards", type: "Forwarded bid invite" }],
    learningSnapshot: learning,
    companyId: "COMPANY-1",
    actorUserId: "OWNER-1",
    now: "2026-05-28T12:00:00.000Z",
  });

  assert.equal(publicControl.ok, true);
  assert.equal(publicControl.control.posture, "public_no_login");
  assert.equal(privateControl.ok, true);
  assert.equal(privateControl.control.posture, "private_human_handoff");
  assert.equal(unsafePublic.ok, false);
  assert.equal(secretBlocked.ok, false);
  assert.equal(controls.mode, "agent_leads_source_expansion_controls_v22");
  assert.equal(controls.postureCounts.publicNoLogin >= 1, true);
  assert.equal(controls.postureCounts.privateHumanHandoff >= 1, true);
  assert.equal(controls.suggestions.some((suggestion) => suggestion.action === "add_more_like_this"), true);
  assert.equal(controls.externalActionsLocked, true);
});

test("Agent OS v23 source coverage planner recommends safe setup drafts without external actions", () => {
  const planner = buildAgentLeadsSourceCoveragePlanner({
    companyId: "COMPANY-A",
    actorUserId: "USER-1",
    companySettings: {
      companyId: "COMPANY-A",
      serviceArea: "Salem Oregon",
      primaryTrade: "fencing",
    },
    opportunitySearchProfiles: [
      {
        id: "OSP-PUBLIC",
        companyId: "COMPANY-A",
        name: "City procurement checks",
        sourceAdapterId: "public_procurement_feed",
        sourcePosture: "public_no_login",
        sourceTypes: ["City bid page"],
        status: "active",
      },
    ],
    leadSources: [
      {
        id: "LS-CLASSIFIEDS",
        companyId: "COMPANY-A",
        name: "Craigslist fence work",
        type: "Public classifieds",
        status: "Active",
      },
    ],
    now: "2026-05-28T08:00:00.000Z",
  });

  assert.equal(planner.mode, "agent_leads_source_coverage_planner_v23");
  assert.equal(planner.reviewOnlyExecution, true);
  assert.equal(planner.externalActionsLocked, true);
  assert.equal(planner.leadAutoSaveEnabled, false);
  assert.equal(planner.customerContactEnabled, false);
  assert.equal(planner.coverageScore > 0, true);
  assert.equal(planner.families.find((family) => family.id === "public_procurement").status, "covered");
  assert.equal(planner.families.find((family) => family.id === "private_social").status, "coverage_gap");

  const privateRecommendation = planner.recommendations.find((recommendation) => recommendation.familyId === "private_social");
  assert.ok(privateRecommendation);
  assert.equal(privateRecommendation.posture, "private_human_handoff");
  assert.equal(privateRecommendation.setupDraft.searchProfileDraft.sourcePosture, "private_human_handoff");
  assert.equal(privateRecommendation.setupDraft.searchProfileDraft.sourceAuthorizationStatus, "needs_authorization");
  assert.equal(privateRecommendation.setupDraft.leadSourceDraft.serviceArea, "Salem Oregon");
  assert.match(privateRecommendation.setupDraft.safetyBoundary, /does not connect accounts/i);
  assert.equal(privateRecommendation.blockedActions.some((action) => /scraping/i.test(action)), true);
});

test("Agent OS v24 live source setup readiness explains pilot gaps without enabling external actions", () => {
  const controls = buildAgentLeadsSourceExpansionControls({
    opportunitySearchProfiles: [{
      id: "OSP-PUBLIC",
      name: "City bid page",
      sourceAdapterId: "public_procurement_feed",
      sourcePosture: "public_no_login",
      sourceTypes: ["City bid page"],
      sourceTermsStatus: "unreviewed",
      cadence: "daily",
      status: "active",
    }, {
      id: "OSP-PRIVATE",
      name: "Facebook homeowner group",
      sourceAdapterId: "facebook_private_group",
      sourcePosture: "private_human_handoff",
      sourceTypes: ["Facebook private group"],
      sourceAccessStatus: "needs_human",
      sourceTermsStatus: "human_review_required",
      sourceAuthorizationStatus: "needs_authorization",
      cadence: "manual",
      status: "active",
    }],
    leadSources: [],
    companyId: "COMPANY-A",
    actorUserId: "OWNER-1",
    now: "2026-05-28T08:00:00.000Z",
  });
  const planner = buildAgentLeadsSourceCoveragePlanner({
    sourceExpansionControls: controls,
    companySettings: { companyId: "COMPANY-A", serviceArea: "Salem Oregon", primaryTrade: "concrete" },
    companyId: "COMPANY-A",
    actorUserId: "OWNER-1",
    now: "2026-05-28T08:00:00.000Z",
  });
  const readiness = buildAgentLeadsLiveSourceSetupReadiness({
    sourceExpansionControls: controls,
    sourceCoveragePlanner: planner,
    providerActivationReadiness: { status: "locked", checks: [{ id: "approval", label: "Approval", status: "missing" }] },
    providerSettings: { mode: "dry_run", providerId: "dry_run_simulator" },
    dailyRunRecord: { id: "daily-agent-leads-2026-05-28", mode: "daily_agent_leads_scout_execution_v6", sourceCount: 2 },
    publicRunnerCards: [{ id: "public-1" }],
    privateHandoffCards: [{ id: "private-1" }],
    providerReviewImportQueue: [{ id: "review-1" }],
  });

  assert.equal(readiness.mode, "agent_leads_live_source_setup_readiness_v24");
  assert.equal(readiness.reviewOnlyExecution, true);
  assert.equal(readiness.externalActionsLocked, true);
  assert.equal(readiness.leadAutoSaveEnabled, false);
  assert.equal(readiness.customerContactEnabled, false);
  assert.equal(readiness.dailyRunReadiness.status, "ready_for_review_only_daily_prep");
  assert.equal(readiness.privateSourceReadiness.status, "needs_human_authorization");
  assert.equal(readiness.officialApiReadiness.liveExecutionEnabled, false);
  assert.equal(readiness.missingActions.some((item) => /authorized human reviewer/i.test(item.missing)), true);
  assert.match(readiness.safetyBoundary, /does not enable scraping/i);
});

test("Agent OS v25 pilot run readiness creates an operator checklist and evidence packet without execution", () => {
  const controls = buildAgentLeadsSourceExpansionControls({
    opportunitySearchProfiles: [{
      id: "OSP-PUBLIC",
      name: "City bid page",
      sourceAdapterId: "public_procurement_feed",
      sourcePosture: "public_no_login",
      sourceTypes: ["City bid page"],
      sourceTermsStatus: "unreviewed",
      cadence: "daily",
      status: "active",
    }],
    leadSources: [],
    companyId: "COMPANY-A",
    actorUserId: "OWNER-1",
    now: "2026-05-28T08:00:00.000Z",
  });
  const planner = buildAgentLeadsSourceCoveragePlanner({
    sourceExpansionControls: controls,
    companySettings: { companyId: "COMPANY-A", companyName: "Ace Fence", serviceArea: "Salem Oregon", primaryTrade: "fencing" },
    companyId: "COMPANY-A",
    actorUserId: "OWNER-1",
    now: "2026-05-28T08:00:00.000Z",
  });
  const liveReadiness = buildAgentLeadsLiveSourceSetupReadiness({
    sourceExpansionControls: controls,
    sourceCoveragePlanner: planner,
    providerSettings: { mode: "dry_run", providerId: "dry_run_simulator" },
    dailyRunRecord: { id: "daily-agent-leads-2026-05-28", mode: "daily_agent_leads_scout_execution_v6", sourceCount: 1 },
    publicRunnerCards: [{ id: "public-1" }],
    providerReviewImportQueue: [{ id: "review-1" }],
  });
  const packet = buildAgentLeadsPilotRunReadinessPacket({
    liveSourceSetupReadiness: liveReadiness,
    sourceCoveragePlanner: planner,
    sourceExpansionControls: controls,
    providerSettings: { mode: "dry_run", providerId: "dry_run_simulator" },
    dailyRunRecord: { id: "daily-agent-leads-2026-05-28", mode: "daily_agent_leads_scout_execution_v6", sourceCount: 1 },
    publicRunnerCards: [{ id: "public-1" }],
    providerReviewImportQueue: [{ id: "review-1" }],
    companySettings: { companyName: "Ace Fence" },
    today: "2026-05-28",
  });

  assert.equal(packet.mode, "agent_leads_pilot_run_readiness_v25");
  assert.equal(packet.verdict, "ready_with_warnings");
  assert.equal(packet.reviewOnlyExecution, true);
  assert.equal(packet.externalActionsLocked, true);
  assert.equal(packet.leadAutoSaveEnabled, false);
  assert.equal(packet.customerContactEnabled, false);
  assert.equal(packet.tomorrowChecklist.some((item) => item.id === "review-public-sources" && item.status === "ready"), true);
  assert.equal(packet.pilotEvidencePacket.companyName, "Ace Fence");
  assert.equal(packet.pilotEvidencePacket.whatApexWillNotDo.some((item) => /No scraping/i.test(item)), true);
  assert.match(packet.safetyBoundary, /operator checklist/i);
});

test("Agent OS v26 provider connection setup plan keeps OAuth and provider work locked", () => {
  const controls = buildAgentLeadsSourceExpansionControls({
    opportunitySearchProfiles: [{
      id: "OSP-PUBLIC",
      name: "City bid page",
      sourceAdapterId: "public_procurement_feed",
      sourcePosture: "public_no_login",
      sourceTypes: ["City bid page"],
      sourceTermsStatus: "unreviewed",
      cadence: "daily",
      status: "active",
    }, {
      id: "OSP-OFFICIAL",
      name: "Official procurement feed",
      sourceAdapterId: "official_procurement_feed_api_sandbox",
      sourcePosture: "official_api_only",
      sourceTypes: ["Official API/feed"],
      sourceAuthorizationStatus: "oauth_or_api_required",
      cadence: "daily",
      status: "active",
    }],
    leadSources: [],
    companyId: "COMPANY-A",
    actorUserId: "OWNER-1",
    now: "2026-05-28T08:00:00.000Z",
  });
  const planner = buildAgentLeadsSourceCoveragePlanner({
    sourceExpansionControls: controls,
    companySettings: { companyId: "COMPANY-A", companyName: "Ace Fence", serviceArea: "Salem Oregon", primaryTrade: "fencing" },
    companyId: "COMPANY-A",
    actorUserId: "OWNER-1",
    now: "2026-05-28T08:00:00.000Z",
  });
  const liveReadiness = buildAgentLeadsLiveSourceSetupReadiness({
    sourceExpansionControls: controls,
    sourceCoveragePlanner: planner,
    providerSettings: { mode: "live_locked", providerId: "approved_public_search" },
    dailyRunRecord: { id: "daily-agent-leads-2026-05-28", mode: "daily_agent_leads_scout_execution_v6", sourceCount: 2 },
    publicRunnerCards: [{ id: "public-1" }],
    providerReviewImportQueue: [{ id: "review-1" }],
  });
  const pilotPacket = buildAgentLeadsPilotRunReadinessPacket({
    liveSourceSetupReadiness: liveReadiness,
    sourceCoveragePlanner: planner,
    sourceExpansionControls: controls,
    providerSettings: { mode: "live_locked", providerId: "approved_public_search" },
    dailyRunRecord: { id: "daily-agent-leads-2026-05-28", mode: "daily_agent_leads_scout_execution_v6", sourceCount: 2 },
    publicRunnerCards: [{ id: "public-1" }],
    providerReviewImportQueue: [{ id: "review-1" }],
    companySettings: { companyName: "Ace Fence" },
    today: "2026-05-28",
  });
  const setupPlan = buildAgentLeadsProviderConnectionSetupPlan({
    providerSettings: { mode: "live_locked", providerId: "approved_public_search" },
    sourceCoveragePlanner: planner,
    liveSourceSetupReadiness: liveReadiness,
    pilotRunReadiness: pilotPacket,
    companySettings: { companyName: "Ace Fence" },
    today: "2026-05-28",
  });

  assert.equal(setupPlan.mode, "agent_leads_provider_connection_setup_plan_v26");
  assert.equal(setupPlan.externalActionsLocked, true);
  assert.equal(setupPlan.leadAutoSaveEnabled, false);
  assert.equal(setupPlan.liveProviderCallsEnabled, false);
  assert.equal(setupPlan.rawCredentialStorageEnabled, false);
  assert.equal(setupPlan.providerOAuthTokenStorageEnabled, false);
  assert.equal(setupPlan.unattendedLoginEnabled, false);
  assert.equal(setupPlan.pilotConnectionPacket.canStoreRawCredentials, false);
  assert.equal(setupPlan.pilotConnectionPacket.canRunLiveWithoutApproval, false);
  assert.equal(setupPlan.providerCredentialBoundary.rawCredentialStorageAllowed, false);
  assert.equal(setupPlan.providerCredentialBoundary.frontendCredentialExposureAllowed, false);
  assert.equal(setupPlan.approvalRequiredBefore.some((item) => /sandbox evidence/i.test(item)), true);
  assert.equal(setupPlan.hostedPilotSmokePlan.blockedChecks.some((item) => /No provider OAuth token exchange/i.test(item)), true);
  assert.equal(setupPlan.hostedPilotSmokePlan.blockedChecks.some((item) => /No lead auto-save/i.test(item)), true);
  assert.equal(setupPlan.lanes.find((lane) => lane.id === "official_api_oauth").credentialRequirement, "server-side credential reference only");
  assert.equal(setupPlan.lanes.some((lane) => lane.blockedActions.some((action) => /raw passwords/i.test(action))), true);
  assert.match(setupPlan.safetyBoundary, /does not store OAuth tokens/i);
});

test("Agent OS v27 pilot activation layer tracks readiness and hosted smoke without execution", () => {
  const controls = buildAgentLeadsSourceExpansionControls({
    opportunitySearchProfiles: [{
      id: "OSP-PUBLIC",
      name: "City bid page",
      sourceAdapterId: "public_procurement_feed",
      sourcePosture: "public_no_login",
      sourceTypes: ["City bid page"],
      sourceTermsStatus: "public_allowed",
      cadence: "daily",
      status: "active",
    }, {
      id: "OSP-PRIVATE",
      name: "Facebook private group",
      sourceAdapterId: "facebook_private_group",
      sourcePosture: "private_human_handoff",
      sourceAuthorizationStatus: "authorized_for_human_session",
      sourceTypes: ["Facebook private group"],
      cadence: "daily",
      status: "active",
    }],
    leadSources: [],
    companyId: "COMPANY-A",
    actorUserId: "OWNER-1",
    now: "2026-05-28T08:00:00.000Z",
  });
  const planner = buildAgentLeadsSourceCoveragePlanner({
    sourceExpansionControls: controls,
    companySettings: { companyId: "COMPANY-A", companyName: "Ace Fence", serviceArea: "Salem Oregon", primaryTrade: "fencing" },
    companyId: "COMPANY-A",
    actorUserId: "OWNER-1",
    now: "2026-05-28T08:00:00.000Z",
  });
  const dailyRunRecord = { id: "daily-agent-leads-2026-05-28", mode: "daily_agent_leads_scout_execution_v6", sourceCount: 2 };
  const liveReadiness = buildAgentLeadsLiveSourceSetupReadiness({
    sourceExpansionControls: controls,
    sourceCoveragePlanner: planner,
    providerSettings: { mode: "live_locked", providerId: "approved_public_search" },
    dailyRunRecord,
    publicRunnerCards: [{ id: "public-1" }],
    privateHandoffCards: [{ id: "private-1" }],
    providerReviewImportQueue: [{ id: "review-1" }],
  });
  const pilotPacket = buildAgentLeadsPilotRunReadinessPacket({
    liveSourceSetupReadiness: liveReadiness,
    sourceCoveragePlanner: planner,
    sourceExpansionControls: controls,
    providerSettings: { mode: "live_locked", providerId: "approved_public_search" },
    dailyRunRecord,
    publicRunnerCards: [{ id: "public-1" }],
    privateHandoffCards: [{ id: "private-1" }],
    providerReviewImportQueue: [{ id: "review-1" }],
    companySettings: { companyName: "Ace Fence" },
    today: "2026-05-28",
  });
  const setupPlan = buildAgentLeadsProviderConnectionSetupPlan({
    providerSettings: { mode: "live_locked", providerId: "approved_public_search" },
    sourceCoveragePlanner: planner,
    liveSourceSetupReadiness: liveReadiness,
    pilotRunReadiness: pilotPacket,
    companySettings: { companyName: "Ace Fence" },
    today: "2026-05-28",
  });
  const activation = buildAgentLeadsPilotActivationLayer({
    providerSettings: { mode: "live_locked", providerId: "approved_public_search" },
    providerConnectionSetupPlan: setupPlan,
    pilotRunReadiness: pilotPacket,
    liveSourceSetupReadiness: liveReadiness,
    sourceCoveragePlanner: planner,
    sourceExpansionControls: controls,
    dailyRunRecord,
    publicRunnerCards: [{ id: "public-1" }],
    privateHandoffCards: [{ id: "private-1" }],
    providerReviewImportQueue: [{ id: "review-1" }],
    auditEvents: [{
      id: "AUDIT-PROVIDER-CONNECTION",
      action: "agent.os.provider.connection_metadata.recorded",
      actorUserId: "OWNER-1",
      createdAt: "2026-05-28T08:15:00.000Z",
      detail: JSON.stringify({
        providerConnectionMetadata: {
          providerName: "Public procurement provider",
          connectorId: "public_procurement_search",
          status: "recorded",
          actorUserId: "OWNER-1",
        },
      }),
    }],
    companySettings: { companyName: "Ace Fence" },
    today: "2026-05-28",
  });

  assert.equal(activation.mode, "agent_leads_pilot_activation_layer_v27");
  assert.equal(activation.externalActionsLocked, true);
  assert.equal(activation.liveProviderCallsEnabled, false);
  assert.equal(activation.providerOAuthTokenStorageEnabled, false);
  assert.equal(activation.rawCredentialStorageEnabled, false);
  assert.equal(activation.hostedPilotSmokePacket.canRunAutomatically, false);
  assert.equal(activation.hostedPilotSmokePacket.canTouchProductionData, false);
  assert.equal(activation.hostedPilotSmokePacket.blockedChecks.some((item) => /No provider OAuth token exchange/i.test(item)), true);
  assert.equal(activation.connectionStatusHistory.some((row) => row.actorUserId === "OWNER-1" && row.secretsRedacted), true);
  assert.equal(activation.realSourceReadinessBoard.rows.some((row) => row.id === "private_handoff" && row.status === "human_handoff_ready"), true);
  assert.equal(activation.tomorrowRunView.willCheck.some((item) => /public source card/i.test(item)), true);
  assert.equal(activation.tomorrowRunView.exactlyWhatApexWillNotDo.some((item) => /No auto-created leads/i.test(item)), true);
  assert.match(activation.safetyBoundary, /read-only activation packet/i);
});

test("Agent OS v28 real public source config activation blocks private and search-result sources", () => {
  const packet = buildAgentLeadsRealPublicSourceConfigActivation({
    publicRunnerCards: [{
      id: "source-city-bids",
      type: "public_source_runner",
      targetKind: "lead_source",
      targetId: "LS-CITY",
      title: "City bid page",
      sourceUrl: "https://city.example.gov/procurement/open-bids",
      sourceTermsStatus: "public_allowed",
      sourcePosture: "public_no_login",
      sourceConnector: { id: "public_procurement_search", label: "Public procurement search", posture: "review_card" },
      searchUrls: [{ label: "Saved source URL", url: "https://city.example.gov/procurement/open-bids" }],
    }, {
      id: "profile-google-search",
      type: "public_source_runner",
      targetKind: "search_profile",
      targetId: "OSP-GOOGLE",
      title: "Search profile without saved source",
      sourceTermsStatus: "unreviewed",
      sourceConnector: { id: "public_web_search", label: "Public web search", posture: "review_card" },
      searchUrls: [{ label: "Google public search", url: "https://www.google.com/search?q=salem%20concrete%20rfp" }],
    }],
    privateHandoffCards: [{
      id: "private-facebook",
      type: "private_source_handoff",
      targetKind: "search_profile",
      targetId: "OSP-FB",
      title: "Facebook private group",
      sourceConnector: { id: "facebook_private_group", label: "Facebook private group", posture: "human_handoff" },
    }],
    providerSettings: { mode: "live_locked", providerId: "approved_public_search" },
    providerConnectionSetupPlan: { status: "setup_plan_ready" },
    pilotActivationLayer: { status: "ready_for_read_only_pilot_activation" },
    dailyRunRecord: { id: "daily-agent-leads-2026-05-28" },
    companySettings: { companyName: "Ace Fence" },
    today: "2026-05-28",
  });

  const eligibleConfig = packet.approvedPublicSourceConfigs.find((config) => config.targetId === "LS-CITY");
  const blockedConfig = packet.approvedPublicSourceConfigs.find((config) => config.targetId === "OSP-GOOGLE");

  assert.equal(packet.mode, "agent_leads_real_public_source_config_activation_v28");
  assert.equal(packet.externalActionsLocked, true);
  assert.equal(packet.liveProviderCallsEnabled, false);
  assert.equal(packet.rawCredentialStorageEnabled, false);
  assert.equal(packet.deployEnabled, false);
  assert.equal(packet.productionDataTouchEnabled, false);
  assert.equal(eligibleConfig.eligibility.eligible, true);
  assert.equal(eligibleConfig.eligibility.idempotencyKey.includes("LS-CITY"), true);
  assert.equal(blockedConfig.eligibility.eligible, false);
  assert.equal(blockedConfig.eligibility.complianceRows.some((row) => row.blockedReason === "search_engine_serp_requires_official_api"), true);
  assert.equal(packet.blockedPrivateOrLoginSources.some((row) => row.targetId === "OSP-FB" && row.status === "blocked_from_public_run"), true);
  assert.equal(packet.operatorActivationDrafts.every((draft) => draft.canExecute === false), true);
  assert.equal(packet.pilotSourceEvidenceChecklist.some((item) => item.id === "no-login"), true);
  assert.match(packet.safetyBoundary, /metadata and eligibility only/i);
});

test("Agent OS v29 controlled hosted demo smoke packet selects one safe source without running smoke", () => {
  const activation = buildAgentLeadsRealPublicSourceConfigActivation({
    publicRunnerCards: [{
      id: "source-city-bids",
      type: "public_source_runner",
      targetKind: "lead_source",
      targetId: "LS-CITY",
      title: "City bid page",
      sourceUrl: "https://city.example.gov/procurement/open-bids",
      sourceTermsStatus: "public_allowed",
      sourcePosture: "public_no_login",
      sourceConnector: { id: "public_procurement_search", label: "Public procurement search", posture: "review_card" },
      searchUrls: [{ label: "Saved source URL", url: "https://city.example.gov/procurement/open-bids" }],
    }],
    providerSettings: { mode: "live_locked", providerId: "approved_public_search" },
    providerConnectionSetupPlan: { status: "setup_plan_ready" },
    pilotActivationLayer: { status: "ready_for_read_only_pilot_activation" },
    dailyRunRecord: { id: "daily-agent-leads-2026-05-28" },
    companySettings: { companyName: "Ace Fence" },
    today: "2026-05-28",
  });
  const smoke = buildAgentLeadsControlledHostedDemoSmokePacket({
    realPublicSourceConfigActivation: activation,
    pilotActivationLayer: { status: "ready_for_read_only_pilot_activation", tomorrowRunView: { blockers: [] } },
    providerConnectionSetupPlan: { status: "setup_plan_ready" },
    providerSettings: { mode: "live_locked", providerId: "approved_public_search" },
    dailyRunRecord: { id: "daily-agent-leads-2026-05-28" },
    companySettings: { companyName: "Ace Fence" },
    today: "2026-05-28",
  });
  const blockedSmoke = buildAgentLeadsControlledHostedDemoSmokePacket({
    realPublicSourceConfigActivation: { approvedPublicSourceConfigs: [], stats: { blockedPublicConfigs: 1 } },
    pilotActivationLayer: { tomorrowRunView: { blockers: ["No eligible public source URL."] } },
    providerConnectionSetupPlan: { status: "needs_source_or_provider_setup" },
    providerSettings: { mode: "dry_run", providerId: "dry_run_simulator" },
    dailyRunRecord: {},
    today: "2026-05-28",
  });

  assert.equal(smoke.mode, "agent_leads_controlled_hosted_demo_smoke_packet_v29");
  assert.equal(smoke.status, "ready_for_human_approved_demo_smoke");
  assert.equal(smoke.smokeTargetSelector.selectedSourceConfigId.includes("LS-CITY"), true);
  assert.equal(smoke.smokeResultModel.status, "not_run");
  assert.equal(smoke.smokeResultModel.canAutoRecord, false);
  assert.equal(smoke.canRunAutomatically, false);
  assert.equal(smoke.browserAutomationEnabled, false);
  assert.equal(smoke.liveProviderCallsEnabled, false);
  assert.equal(smoke.deployEnabled, false);
  assert.equal(smoke.productionDataTouchEnabled, false);
  assert.equal(smoke.blockedSmokeActions.some((item) => /No provider fetch/i.test(item)), true);
  assert.equal(smoke.hostedDemoSmokeChecklist.some((step) => step.id === "confirm-no-external-actions"), true);
  assert.equal(blockedSmoke.status, "blocked");
  assert.equal(blockedSmoke.failureTriage.some((item) => item.category === "source_url"), true);
  assert.match(smoke.safetyBoundary, /human-run evidence packet only/i);
});

test("Agent OS v30 smoke evidence recorder validates redacted human evidence without writing server state", () => {
  const activation = buildAgentLeadsRealPublicSourceConfigActivation({
    publicRunnerCards: [{
      id: "source-city-bids",
      type: "public_source_runner",
      targetKind: "lead_source",
      targetId: "LS-CITY",
      title: "City bid page",
      sourceUrl: "https://city.example.gov/procurement/open-bids",
      sourceTermsStatus: "public_allowed",
      sourcePosture: "public_no_login",
      sourceConnector: { id: "public_procurement_search", label: "Public procurement search", posture: "review_card" },
      searchUrls: [{ label: "Saved source URL", url: "https://city.example.gov/procurement/open-bids" }],
    }],
    providerSettings: { mode: "live_locked", providerId: "approved_public_search" },
    providerConnectionSetupPlan: { status: "setup_plan_ready" },
    pilotActivationLayer: { status: "ready_for_read_only_pilot_activation" },
    dailyRunRecord: { id: "daily-agent-leads-2026-05-28" },
    companySettings: { companyName: "Ace Fence" },
    today: "2026-05-28",
  });
  const smoke = buildAgentLeadsControlledHostedDemoSmokePacket({
    realPublicSourceConfigActivation: activation,
    pilotActivationLayer: { status: "ready_for_read_only_pilot_activation", tomorrowRunView: { blockers: [] } },
    providerConnectionSetupPlan: { status: "setup_plan_ready" },
    providerSettings: { mode: "live_locked", providerId: "approved_public_search" },
    dailyRunRecord: { id: "daily-agent-leads-2026-05-28" },
    companySettings: { companyName: "Ace Fence" },
    today: "2026-05-28",
  });
  const safeEvidence = {
    status: "passed_with_warnings",
    environmentLabel: "controlled hosted demo",
    targetUrl: "https://concrete-ops-demo.fly.dev/agent",
    companyName: "Ace Fence",
    sourceConfigId: smoke.smokeTargetSelector.selectedSourceConfigId,
    sourceUrl: smoke.smokeTargetSelector.selectedSourceUrl,
    reviewQueueCount: 2,
    screenshotsOrNotes: "Observed review cards only. No customer contact.",
    operatorName: "Owner Admin",
    observedAt: "2026-05-28T10:00:00.000Z",
    acknowledgement: true,
  };

  const recorder = buildAgentLeadsSmokeEvidenceRecorder({
    controlledHostedDemoSmokePacket: smoke,
    evidencePayload: safeEvidence,
    companySettings: { companyId: "COMPANY-1", companyName: "Ace Fence" },
    actorUserId: "OWNER-1",
    today: "2026-05-28",
    now: "2026-05-28T10:05:00.000Z",
  });
  const rejected = validateAgentLeadsSmokeEvidencePayload({
    ...safeEvidence,
    screenshotsOrNotes: "password: redacted-demo-value and sent email to customer",
  }, { controlledHostedDemoSmokePacket: smoke });

  assert.equal(recorder.mode, "agent_leads_smoke_evidence_recorder_v30");
  assert.equal(recorder.status, "evidence_ready_for_audit_review");
  assert.equal(recorder.validation.status, "accepted_for_manual_audit_review");
  assert.equal(recorder.validation.ok, true);
  assert.equal(recorder.auditEventDraft.detail.evidence.sourceUrl, "https://city.example.gov/procurement/open-bids");
  assert.equal(recorder.auditEventShape.canPersistAutomatically, false);
  assert.equal(recorder.canRecordAutomatically, false);
  assert.equal(recorder.serverWriteEnabled, false);
  assert.equal(recorder.externalActionsLocked, true);
  assert.equal(recorder.productionDataTouchEnabled, false);
  assert.equal(rejected.ok, false);
  assert.equal(rejected.rejectedSecrets, true);
  assert.equal(rejected.rejectedExternalClaims, true);
  assert.equal(rejected.errors.some((error) => /passwords, tokens/i.test(error)), true);
  assert.equal(rejected.errors.some((error) => /cannot claim contact/i.test(error)), true);
});

test("Agent OS v32 controlled daily public-source run evidence packet stays review-only", () => {
  const activation = buildAgentLeadsRealPublicSourceConfigActivation({
    publicRunnerCards: [{
      id: "source-city-bids",
      type: "public_source_runner",
      targetKind: "lead_source",
      targetId: "LS-CITY",
      title: "City bid page",
      sourceUrl: "https://city.example.gov/procurement/open-bids",
      sourceTermsStatus: "public_allowed",
      sourcePosture: "public_no_login",
      sourceConnector: { id: "public_procurement_search", label: "Public procurement search", posture: "review_card" },
      searchUrls: [{ label: "Saved source URL", url: "https://city.example.gov/procurement/open-bids" }],
    }],
    providerSettings: { mode: "live_locked", providerId: "approved_public_search", dailyBudget: 3, maxResultsPerRun: 2, enabledConnectorIds: ["public_procurement_search"] },
    providerConnectionSetupPlan: { status: "setup_plan_ready" },
    pilotActivationLayer: { status: "ready_for_read_only_pilot_activation" },
    dailyRunRecord: { id: "daily-agent-leads-2026-05-28" },
    companySettings: { companyName: "Ace Fence" },
    today: "2026-05-28",
  });
  const packet = buildAgentLeadsControlledDailyPublicSourceRunEvidencePacket({
    realPublicSourceConfigActivation: activation,
    auditEvents: [{
      action: "agent.os.leads.hosted_demo_smoke.evidence_recorded",
      createdAt: "2026-05-28T10:05:00.000Z",
      detail: {
        smokeEvidenceReviewIntake: { status: "audit_record_prepared" },
        smokeEvidence: { status: "passed_with_warnings" },
      },
    }],
    providerSettings: { mode: "live_locked", providerId: "approved_public_search", dailyBudget: 3, maxResultsPerRun: 2, enabledConnectorIds: ["public_procurement_search"] },
    dailyRunRecord: { id: "daily-agent-leads-2026-05-28", mode: "daily_agent_leads_scout_execution_v6" },
    publicRunnerCards: [{ id: "source-city-bids" }],
    companySettings: { companyName: "Ace Fence" },
    today: "2026-05-28",
  });
  const blocked = buildAgentLeadsControlledDailyPublicSourceRunEvidencePacket({
    realPublicSourceConfigActivation: activation,
    providerSettings: { mode: "disabled", providerId: "approved_public_search", dailyBudget: 0, maxResultsPerRun: 2, enabledConnectorIds: [] },
    dailyRunRecord: {},
    today: "2026-05-28",
  });

  assert.equal(packet.mode, "agent_leads_controlled_daily_public_source_run_evidence_packet_v32");
  assert.equal(packet.status, "ready_for_owner_admin_review");
  assert.equal(packet.nextRunDate, "2026-05-29");
  assert.equal(packet.sourceRunRows.length, 1);
  assert.match(packet.sourceRunRows[0].idempotencyKey, /2026-05-29/);
  assert.equal(packet.runEnvelope.dailyBudget, 3);
  assert.equal(packet.runEnvelope.maxResultsPerRun, 2);
  assert.equal(packet.externalActionsLocked, true);
  assert.equal(packet.safeForCron, false);
  assert.equal(packet.canRunAutomatically, false);
  assert.equal(packet.browserAutomationEnabled, false);
  assert.equal(packet.liveProviderCallsEnabled, false);
  assert.equal(packet.leadAutoSaveEnabled, false);
  assert.equal(packet.customerContactEnabled, false);
  assert.equal(packet.productionDataTouchEnabled, false);
  assert.match(packet.safetyBoundary, /review packet only/i);
  assert.equal(blocked.status, "blocked");
  assert.equal(blocked.blockers.some((reason) => /Daily run record/i.test(reason)), true);
  assert.equal(blocked.blockers.some((reason) => /Provider mode is disabled/i.test(reason)), true);
});

test("Agent OS v33-v36 controlled daily public run approval, preflight, evidence, and outcomes stay locked", () => {
  const activation = buildAgentLeadsRealPublicSourceConfigActivation({
    publicRunnerCards: [{
      id: "source-city-bids",
      type: "public_source_runner",
      targetKind: "lead_source",
      targetId: "LS-CITY",
      title: "City bid page",
      sourceUrl: "https://city.example.gov/procurement/open-bids",
      sourceTermsStatus: "public_allowed",
      sourcePosture: "public_no_login",
      sourceConnector: { id: "public_procurement_search", label: "Public procurement search", posture: "review_card" },
      searchUrls: [{ label: "Saved source URL", url: "https://city.example.gov/procurement/open-bids" }],
    }],
    providerSettings: { mode: "live_locked", providerId: "approved_public_search", dailyBudget: 3, maxResultsPerRun: 2, enabledConnectorIds: ["public_procurement_search"] },
    providerConnectionSetupPlan: { status: "setup_plan_ready" },
    pilotActivationLayer: { status: "ready_for_read_only_pilot_activation" },
    dailyRunRecord: { id: "daily-agent-leads-2026-05-28" },
    today: "2026-05-28",
  });
  const packet = buildAgentLeadsControlledDailyPublicSourceRunEvidencePacket({
    realPublicSourceConfigActivation: activation,
    providerSettings: { mode: "live_locked", providerId: "approved_public_search", dailyBudget: 3, maxResultsPerRun: 2, enabledConnectorIds: ["public_procurement_search"] },
    dailyRunRecord: { id: "daily-agent-leads-2026-05-28", mode: "daily_agent_leads_scout_execution_v6" },
    publicRunnerCards: [{ id: "source-city-bids" }],
    today: "2026-05-28",
  });
  const approval = buildAgentLeadsControlledDailyPublicRunApprovalRecord({
    controlledDailyPublicSourceRunEvidencePacket: packet,
    approvalPayload: { acknowledgement: true, approvedBy: "Owner Admin" },
    companySettings: { companyId: "COMPANY-1" },
    actorUserId: "OWNER-1",
    today: "2026-05-28",
    now: "2026-05-28T12:00:00.000Z",
  });
  const auditEvents = [{
    action: "agent.os.provider.daily_public_run.approved",
    createdAt: "2026-05-28T12:00:00.000Z",
    detail: { controlledDailyPublicRunApproval: approval.approvalRecord },
  }];
  const preflight = buildAgentLeadsControlledDailyPublicRunPreflight({
    controlledDailyPublicSourceRunEvidencePacket: packet,
    auditEvents,
    providerSettings: { mode: "live_locked", providerId: "approved_public_search", dailyBudget: 3, maxResultsPerRun: 2, enabledConnectorIds: ["public_procurement_search"] },
    today: "2026-05-28",
  });
  const evidencePrep = buildAgentLeadsControlledDailyPublicRunEvidencePrep({
    controlledDailyPublicSourceRunEvidencePacket: packet,
    preflight,
    companySettings: { companyId: "COMPANY-1" },
    actorUserId: "OWNER-1",
    today: "2026-05-28",
    now: "2026-05-28T12:05:00.000Z",
  });
  const outcomeLoop = buildAgentLeadsControlledDailyPublicRunOutcomeLoop({
    controlledDailyPublicSourceRunEvidencePacket: packet,
    auditEvents: [{
      detail: {
        controlledDailyPublicRunOutcomeRecords: [{
          nextRunDate: packet.nextRunDate,
          decision: "draft_found_opportunity",
          sourceConfigId: packet.sourceRunRows[0].sourceConfigId,
        }],
      },
    }],
    today: "2026-05-28",
  });

  assert.equal(approval.ok, true);
  assert.equal(approval.approvalRecord.mode, "agent_leads_controlled_daily_public_run_approval_v33");
  assert.equal(approval.approvalRecord.safeForCron, false);
  assert.equal(preflight.mode, "agent_leads_controlled_daily_public_run_preflight_v34");
  assert.equal(preflight.status, "ready_for_controlled_evidence_prep");
  assert.equal(preflight.canRunProviderFetch, false);
  assert.equal(evidencePrep.mode, "agent_leads_controlled_daily_public_run_evidence_prep_v35");
  assert.equal(evidencePrep.status, "review_evidence_prepared");
  assert.equal(evidencePrep.evidenceRows.length, 1);
  assert.equal(evidencePrep.liveProviderCallsEnabled, false);
  assert.equal(evidencePrep.leadAutoSaveEnabled, false);
  assert.equal(outcomeLoop.mode, "agent_leads_controlled_daily_public_run_outcome_loop_v36");
  assert.equal(outcomeLoop.status, "learning_signals_recorded");
  assert.equal(outcomeLoop.acceptedCount, 1);
  assert.match(evidencePrep.safetyBoundary, /does not fetch providers/i);
});

test("Agent OS v38 expands no-login public sources and drafts review rows without creating leads", () => {
  const settings = normalizeAgentLeadsProviderSettings({
    enabledConnectorIds: ["public_permit_notice_search", "public_agency_calendar_search"],
    allowedSourceCategories: ["public_permit_notice", "public_agency_calendar"],
  });
  const connectors = listApprovedAgentLeadsProviderConnectors(settings);
  assert.equal(connectors.some((connector) => connector.id === "public_permit_notice_search" && connector.credentialMode === "none"), true);
  assert.equal(connectors.some((connector) => connector.id === "public_agency_calendar_search" && connector.credentialMode === "none"), true);
  const contract = buildAgentLeadsPublicProviderAdapterContract(settings);
  assert.equal(contract.adapters.some((adapter) => adapter.connectorId === "public_permit_notice_search" && adapter.requiresLogin === false), true);
  assert.equal(contract.adapters.some((adapter) => adapter.connectorId === "public_agency_calendar_search" && adapter.requiresLogin === false), true);

  const queue = buildAgentLeadsProviderReviewQueue([{
    providerResultId: "provider-result-1",
    providerAttemptId: "provider-attempt-1",
    provider: "approved_public_search",
    connectorId: "public_permit_notice_search",
    title: "City permit notice for concrete repair",
    snippet: "Public permit notice may indicate upcoming concrete repair work.",
    sourceUrl: "https://city.example.gov/permits/notices/concrete-repair",
    sourceType: "public_permit_notice",
    fitScore: 72,
  }], { companyId: "COMPANY-1", actorUserId: "USER-1", now: "2026-05-28T08:00:00.000Z" });
  const draft = buildAgentLeadsFoundOpportunityDraftFromProviderReviewRow(queue.rows[0], {
    companyId: "COMPANY-1",
    actorUserId: "USER-1",
    now: "2026-05-28T08:00:00.000Z",
  });
  assert.equal(draft.ok, true);
  assert.equal(draft.draftPayload.agentPreparedDraft, true);
  assert.equal(draft.draftPayload.humanReviewStatus, "needs_review");
  assert.equal(draft.draftRecord.canAutoSaveLead, false);
  assert.equal(draft.draftRecord.leadCreated, false);
  assert.equal(draft.draftRecord.customerContactEnabled, false);
  assert.match(draft.draftRecord.safetyBoundary, /does not create a lead/i);
});

test("Agent OS v39 reports Agent Leads local completion without unlocking production autonomy", () => {
  const readiness = buildAgentLeadsLocalCompletionReadiness({
    sourceCoveragePlanner: {
      mode: "agent_leads_source_coverage_planner_v23",
      coverageScore: 92,
    },
    liveSourceSetupReadiness: {
      mode: "agent_leads_live_source_setup_readiness_v24",
      externalActionsLocked: true,
    },
    pilotActivationLayer: {
      mode: "agent_leads_pilot_activation_layer_v27",
      externalActionsLocked: true,
    },
    realPublicSourceConfigActivation: {
      mode: "agent_leads_real_public_source_config_activation_v28",
      stats: { eligiblePublicConfigs: 1 },
      externalActionsLocked: true,
    },
    controlledHostedDemoSmokePacket: {
      mode: "agent_leads_controlled_hosted_demo_smoke_packet_v29",
      status: "ready_for_human_smoke",
    },
    smokeEvidenceRecorder: {
      mode: "agent_leads_smoke_evidence_recorder_v30",
      status: "evidence_ready_for_audit_review",
      externalActionsLocked: true,
    },
    controlledDailyPublicSourceRunEvidencePacket: {
      mode: "agent_leads_controlled_daily_public_source_run_evidence_packet_v32",
      status: "ready_for_owner_admin_review",
      externalActionsLocked: true,
      leadAutoSaveEnabled: false,
    },
    controlledDailyPublicRunPreflight: {
      mode: "agent_leads_controlled_daily_public_run_preflight_v34",
      status: "ready_for_controlled_evidence_prep",
      externalActionsLocked: true,
    },
    controlledDailyPublicRunEvidencePrep: {
      mode: "agent_leads_controlled_daily_public_run_evidence_prep_v35",
      status: "review_evidence_prepared",
      externalActionsLocked: true,
      leadAutoSaveEnabled: false,
      customerContactEnabled: false,
      bidSubmissionEnabled: false,
      paymentCollectionEnabled: false,
      schedulingMutationEnabled: false,
      integrationWritesEnabled: false,
    },
    controlledDailyPublicRunOutcomeLoop: {
      mode: "agent_leads_controlled_daily_public_run_outcome_loop_v36",
      outcomeCount: 2,
      externalActionsLocked: true,
    },
    dailyRunRecord: {
      id: "daily-agent-leads-2026-05-28",
      mode: "daily_agent_leads_scout_execution_v6",
    },
    schedulerHook: {
      safeForCron: true,
    },
    providerReviewImportQueue: [{ id: "review-1" }],
    publicRunnerCards: [{ id: "public-1" }],
    privateHandoffCards: [{ id: "private-1" }],
    foundOpportunities: [{ id: "FO-1", agentPreparedDraft: true }],
    auditEvents: [{
      action: "agent.os.provider_review_queue.found_opportunity_drafted",
      createdAt: "2026-05-28T12:00:00.000Z",
    }],
    companySettings: { companyName: "Ace Fence" },
    today: "2026-05-28",
  });

  assert.equal(readiness.mode, "agent_leads_local_completion_readiness_v39");
  assert.equal(readiness.localCompletionStatus, "complete_review_first_local");
  assert.equal(readiness.localImplementationPercent, 100);
  assert.equal(readiness.readyForDailyReviewOnlyRun, true);
  assert.equal(readiness.readyForProductionAutonomy, false);
  assert.equal(readiness.externalActionLocks.customerContactEnabled, false);
  assert.equal(readiness.externalActionLocks.leadAutoSaveEnabled, false);
  assert.equal(readiness.completionRows.every((row) => row.status === "complete"), true);
  assert.match(readiness.safetyBoundary, /does not enable production autonomy/i);
});

test("Agent OS v40 production readiness gate requires release evidence and keeps autonomy locked", () => {
  const completedCheckIds = [
    "verify_leads",
    "verify_agent_learning",
    "verify_agent_os_console",
    "verify_roles",
    "verify_auth",
    "verify_server",
    "verify_estimates",
    "build",
    "diff_check",
    "verify_backup",
    "verify_restore",
    "production_auth_smoke_readiness",
    "verify_monitoring",
    "verify_claims",
    "pilot_rehearsal",
    "support_intake_ready",
    "incident_rollback_ready",
    "legal_claims_reviewed",
  ];
  const localCompletionReadiness = {
    localCompletionStatus: "complete_review_first_local",
    localImplementationPercent: 100,
    externalActionLocks: {
      customerContactEnabled: false,
      leadAutoSaveEnabled: false,
      bidSubmissionEnabled: false,
      paymentCollectionEnabled: false,
      schedulingMutationEnabled: false,
      integrationWritesEnabled: false,
      productionDataTouchEnabled: false,
    },
  };
  const evidence = normalizeAgentLeadsProductionReadinessEvidence({
    operatorName: "Owner",
    environmentLabel: "Founder-supported production review",
    targetUrl: "https://app.example.com",
    completedCheckIds,
    commandSummary: "All checks passed in a local release verification session.",
    acknowledgement: true,
  }, {
    companyId: "COMPANY-1",
    actorUserId: "OWNER-1",
    now: "2026-05-28T12:00:00.000Z",
  });
  const blockedEvidence = normalizeAgentLeadsProductionReadinessEvidence({
    operatorName: "Owner",
    completedCheckIds,
    acknowledgement: true,
    password: "do-not-store",
  });
  const blockedGate = buildAgentLeadsProductionReadinessGate({
    localCompletionReadiness,
    auditEvents: [],
    companySettings: { companyName: "Ace Fence" },
    today: "2026-05-28",
  });
  const readyGate = buildAgentLeadsProductionReadinessGate({
    localCompletionReadiness,
    auditEvents: [{
      action: "agent.os.leads.production_readiness.evidence_recorded",
      createdAt: "2026-05-28T12:00:00.000Z",
      detail: {
        agentLeadsProductionReadinessEvidence: evidence.evidence,
      },
    }],
    companySettings: { companyName: "Ace Fence" },
    today: "2026-05-28",
  });

  assert.equal(evidence.ok, true);
  assert.equal(evidence.evidence.mode, "agent_leads_production_readiness_evidence_v40");
  assert.equal(evidence.evidence.deployEnabled, false);
  assert.equal(evidence.evidence.productionDataTouchEnabled, false);
  assert.equal(blockedEvidence.ok, false);
  assert.match(blockedEvidence.errors.join(" "), /raw passwords/i);
  assert.equal(blockedGate.mode, "agent_leads_production_readiness_gate_v40");
  assert.equal(blockedGate.productionLaunchStatus, "no_go");
  assert.equal(readyGate.productionLaunchStatus, "ready_for_founder_supported_production_review");
  assert.equal(readyGate.readyForFounderSupportedProduction, true);
  assert.equal(readyGate.readyForWiderPublicLaunch, false);
  assert.equal(readyGate.readyForProductionAutonomy, false);
  assert.equal(readyGate.externalActionLocks.customerContactEnabled, false);
  assert.match(readyGate.safetyBoundary, /never enables production autonomy/i);
});

test("Agent OS v41 builds production source setup, review inbox, and no-jobs monitoring without external actions", () => {
  const sourceSetup = buildAgentLeadsProductionSourceSetupBoard({
    sourceCoveragePlanner: {
      coverageScore: 72,
      recommendations: [{ id: "rec-private", label: "Add private group handoff", posture: "private_human_handoff", reason: "Local groups still need human evidence." }],
    },
    liveSourceSetupReadiness: {
      sourceRows: [{ id: "ready-1", sourceName: "City bids", posture: "public_no_login", status: "ready_for_review_only_daily_prep", tone: "green" }],
    },
    realPublicSourceConfigActivation: {
      approvedPublicSourceConfigs: [{
        id: "public-1",
        sourceName: "City procurement",
        sourceUrl: "https://city.example/bids",
        connectorId: "public_procurement_search",
        connectorLabel: "Public procurement",
        readiness: "eligible_for_tomorrow_read_only_public_run",
        termsStatus: "approved",
        eligibility: { eligible: true, blockedReasons: [] },
      }],
      blockedPrivateOrLoginSources: [{
        id: "private-1",
        sourceName: "Facebook private group",
        status: "blocked_from_public_run",
        reason: "Private group requires human review.",
        allowedNextStep: "Use private handoff.",
      }],
    },
    providerSettings: { mode: "live_locked", dailyBudget: 3, enabledConnectorIds: ["public_procurement_search"] },
    today: "2026-05-29",
  });
  const inbox = buildAgentLeadsDailyReviewInbox({
    providerReviewImportQueue: [{
      id: "provider-review-1",
      providerResultId: "RESULT-1",
      providerAttemptId: "ATTEMPT-1",
      provider: "Public procurement",
      connectorId: "public_procurement_search",
      title: "Sidewalk repair bid",
      snippet: "Public bid notice for concrete repair.",
      fitScore: 84,
      duplicateRisk: "possible",
      sourceUrl: "https://city.example/bids/sidewalk",
      draftPreview: { missingInfoItems: ["Confirm bid due date"], fitExplanation: "Concrete repair in service area." },
    }],
    foundDraftQueue: [{
      id: "found-draft-1",
      title: "Plan room docs needed",
      sourceName: "Forwarded invite",
      result: "missing_docs",
      checkedAt: "2026-05-29",
      draftPreview: { title: "Plan room docs needed", humanReviewStatus: "needs_info", missingInfoItems: ["Plans"] },
    }],
    privateHandoffCards: [{
      id: "private-card-1",
      title: "Facebook private group",
      sourceConnector: { label: "Facebook private group" },
      checklist: ["Authorized human opens group", "Paste safe evidence only"],
    }],
    rejectedProviderResults: [{ id: "reject-1", title: "Out of area job", reason: "Outside service area." }],
    dailyRunRecord: { id: "daily-agent-leads-2026-05-29" },
    today: "2026-05-29",
  });
  const monitoring = buildAgentLeadsDailySourceMonitoring({
    productionSourceSetupBoard: sourceSetup,
    dailyReviewInbox: inbox,
    providerAttempts: [{ attemptId: "ATTEMPT-1", provider: "Public procurement", status: "ok" }],
    dailyRunRecord: { id: "daily-agent-leads-2026-05-29" },
    providerSettings: {
      mode: "live_locked",
      dailyJobFinderAutopilot: {
        sourcePriorityIds: ["public-1"],
        pausedSourceIds: ["private-1"],
      },
    },
    today: "2026-05-29",
  });
  const emptyMonitoring = buildAgentLeadsDailySourceMonitoring({
    productionSourceSetupBoard: { stats: { eligiblePublicSources: 0 }, rows: [] },
    dailyReviewInbox: { stats: { totalRows: 0 } },
    today: "2026-05-29",
  });

  assert.equal(sourceSetup.mode, "agent_leads_production_source_setup_board_v41");
  assert.equal(sourceSetup.status, "ready_for_daily_review_runs");
  assert.equal(sourceSetup.stats.eligiblePublicSources, 1);
  assert.equal(sourceSetup.stats.privateHandoffSources, 1);
  assert.equal(sourceSetup.externalActionsLocked, true);
  assert.equal(sourceSetup.leadAutoSaveEnabled, false);
  assert.equal(sourceSetup.customerContactEnabled, false);
  assert.equal(sourceSetup.bidSubmissionEnabled, false);

  assert.equal(inbox.mode, "agent_leads_daily_review_inbox_v41");
  assert.equal(inbox.status, "has_review_work");
  assert.equal(inbox.stats.totalRows, 4);
  assert.equal(inbox.stats.highFitRows, 1);
  assert.equal(inbox.stats.duplicateWarningRows, 1);
  assert.equal(inbox.rows.every((row) => row.canAutoSave === false && row.canCreateLeadDirectly === false), true);
  assert.match(inbox.safetyBoundary, /cannot create leads, contact anyone, submit bids/i);

  assert.equal(monitoring.mode, "agent_leads_daily_source_monitoring_v41");
  assert.equal(monitoring.status, "review_rows_ready");
  assert.match(monitoring.noJobsExplanation, /4 review inbox row/i);
  assert.equal(monitoring.externalActionsLocked, true);
  assert.equal(monitoring.sourceHealthRows[0].healthScore >= 75, true);
  assert.equal(monitoring.sourceHealthRows[0].priorityRank, 1);
  assert.equal(monitoring.sourceHealthRows.some((row) => row.status === "paused"), true);
  assert.equal(monitoring.stats.pausedSources, 1);
  assert.match(emptyMonitoring.noJobsExplanation, /No eligible public no-login source/i);
});

test("Agent OS v43 keeps Agent Leads run history, no-result learning, and admin controls review-only", () => {
  const providerSettings = normalizeAgentLeadsProviderSettings({
    mode: "live_locked",
    enabledConnectorIds: ["public_procurement_search"],
    geographyControls: { serviceAreas: ["Salem"] },
    tradeScope: { trades: ["concrete"] },
    reviewRules: { minFitScoreForReview: 40 },
    dailyJobFinderAutopilot: {
      enabled: true,
      runTimeLocal: "05:30",
      sourcePriorityIds: ["public-1"],
      pausedSourceIds: ["private-1"],
    },
  });
  const sourceSetup = {
    rows: [
      { id: "public-1", type: "public_source", label: "City procurement", connectorId: "public_procurement_search", eligibleForDailyRun: true, missing: [] },
      { id: "private-1", type: "private_handoff", label: "Private group", eligibleForDailyRun: false, missing: ["Human handoff required"] },
    ],
    stats: { eligiblePublicSources: 1 },
  };
  const monitoring = buildAgentLeadsDailySourceMonitoring({
    productionSourceSetupBoard: sourceSetup,
    dailyReviewInbox: { stats: { totalRows: 0 } },
    providerAttempts: [{ attemptId: "ATTEMPT-1", status: "empty_response", resultCount: 0 }],
    dailyRunRecord: { id: "daily-agent-leads-2026-05-29", status: "prepared_no_results", sourceCount: 2, providerAttemptCount: 1 },
    providerSettings,
    auditEvents: [{
      action: "agent.os.provider.daily_job_finder.autopilot",
      createdAt: "2026-05-28T12:00:00.000Z",
      detail: {
        dailyJobFinderAutopilotRun: {
          runHistoryRecord: {
            id: "daily-job-finder-autopilot-ace-2026-05-28",
            today: "2026-05-28",
            status: "prepared_no_results",
            sourceCount: 2,
            publicReviewQueueRows: 0,
            providerAttemptCount: 1,
            providerResultCount: 0,
            providerErrorCount: 0,
            createdAt: "2026-05-28T12:00:00.000Z",
          },
        },
      },
    }],
    today: "2026-05-29",
  });
  const history = buildAgentLeadsDailyRunHistory({
    auditEvents: [{
      action: "agent.os.provider.daily_job_finder.autopilot",
      createdAt: "2026-05-28T12:00:00.000Z",
      detail: {
        dailyJobFinderAutopilotRun: {
          runHistoryRecord: {
            id: "daily-job-finder-autopilot-ace-2026-05-28",
            today: "2026-05-28",
            status: "prepared_no_results",
            sourceCount: 2,
            publicReviewQueueRows: 0,
            providerAttemptCount: 1,
            providerResultCount: 0,
            providerErrorCount: 0,
            createdAt: "2026-05-28T12:00:00.000Z",
          },
        },
      },
    }],
    dailyRunRecord: { id: "daily-agent-leads-2026-05-29", status: "prepared_no_results", sourceCount: 2, providerAttemptCount: 1, providerResultCount: 0, providerErrorCount: 0 },
    dailyReviewInbox: { stats: { totalRows: 0 } },
    dailySourceMonitoring: monitoring,
    providerSettings,
    today: "2026-05-29",
  });
  const controls = buildAgentLeadsDailyRunAdminControls({
    providerSettings,
    productionSourceSetupBoard: sourceSetup,
    today: "2026-05-29",
  });

  assert.equal(monitoring.mode, "agent_leads_daily_source_monitoring_v41");
  assert.equal(monitoring.sourceHealthRows.find((row) => row.id === "public-1")?.priorityRank, 1);
  assert.equal(monitoring.sourceHealthRows.find((row) => row.id === "private-1")?.paused, true);
  assert.equal(history.mode, "agent_leads_daily_run_history_v43");
  assert.equal(history.stats.noResultRuns, 2);
  assert.equal(history.noResultLearning.status, "learning_from_no_result_runs");
  assert.equal(history.noResultLearning.externalActionsLocked, true);
  assert.match(history.noResultLearning.redaction, /No raw source pages/i);
  assert.equal(controls.mode, "agent_leads_daily_run_admin_controls_v43");
  assert.equal(controls.status, "daily_run_enabled");
  assert.equal(controls.controlSummary.prioritySources, 1);
  assert.equal(controls.controlSummary.pausedSources, 1);
  assert.equal(controls.externalActionsLocked, true);
  assert.equal(controls.customerContactEnabled, false);
});

test("Agent OS v44 builds scheduled Agent Leads readiness with run lock and tomorrow preview", () => {
  const providerSettings = normalizeAgentLeadsProviderSettings({
    mode: "live_locked",
    enabledConnectorIds: ["public_procurement_search"],
    geographyControls: { serviceAreas: ["Salem"] },
    tradeScope: { trades: ["concrete"] },
    dailyJobFinderAutopilot: {
      enabled: true,
      runTimeLocal: "05:45",
      sourcePriorityIds: ["public-1"],
      pausedSourceIds: ["private-1"],
    },
  });
  const sourceSetup = {
    rows: [
      { id: "public-1", type: "public_source", label: "City procurement", connectorId: "public_procurement_search", eligibleForDailyRun: true },
      { id: "private-1", type: "private_handoff", label: "Private group", connectorId: "private_social", eligibleForDailyRun: false },
    ],
    stats: { eligiblePublicSources: 1 },
  };
  const auditEvents = [{
    action: "agent.os.provider.daily_job_finder.autopilot",
    createdAt: "2026-05-29T12:00:00.000Z",
    detail: {
      dailyJobFinderAutopilotRun: {
        runHistoryRecord: {
          id: "daily-job-finder-autopilot-ace-2026-05-29",
          today: "2026-05-29",
          status: "prepared_no_results",
          sourceCount: 2,
          publicReviewQueueRows: 0,
          providerAttemptCount: 1,
          providerResultCount: 0,
          providerErrorCount: 0,
          createdAt: "2026-05-29T12:00:00.000Z",
        },
      },
    },
  }, {
    action: "agent.os.provider.daily_job_finder.autopilot",
    createdAt: "2026-05-27T12:00:00.000Z",
    detail: {
      dailyJobFinderAutopilotRun: {
        runHistoryRecord: {
          id: "daily-job-finder-autopilot-ace-2026-05-27",
          today: "2026-05-27",
          status: "prepared_no_results",
          sourceCount: 2,
          publicReviewQueueRows: 0,
          providerAttemptCount: 1,
          providerResultCount: 0,
          providerErrorCount: 0,
          createdAt: "2026-05-27T12:00:00.000Z",
        },
      },
    },
  }];
  const monitoring = buildAgentLeadsDailySourceMonitoring({
    productionSourceSetupBoard: sourceSetup,
    dailyReviewInbox: { stats: { totalRows: 0 } },
    providerAttempts: [{ attemptId: "ATTEMPT-1", status: "empty_response" }],
    dailyRunRecord: { id: "daily-agent-leads-2026-05-29", status: "prepared_no_results", sourceCount: 2 },
    providerSettings,
    auditEvents,
    today: "2026-05-29",
  });
  const history = buildAgentLeadsDailyRunHistory({
    auditEvents,
    dailySourceMonitoring: monitoring,
    providerSettings,
    today: "2026-05-29",
  });
  const controls = buildAgentLeadsDailyRunAdminControls({
    providerSettings,
    productionSourceSetupBoard: sourceSetup,
    today: "2026-05-29",
  });
  const readiness = buildAgentLeadsScheduledRunReadiness({
    auditEvents,
    providerSettings,
    productionSourceSetupBoard: sourceSetup,
    dailyRunHistory: history,
    dailyRunAdminControls: controls,
    dailySourceMonitoring: monitoring,
    schedulerHook: { endpoint: "POST /api/agent/os/provider/daily-job-finder/autopilot" },
    companyId: "COMPANY-1",
    today: "2026-05-29",
  });

  assert.equal(readiness.mode, "agent_leads_scheduled_run_readiness_v44");
  assert.equal(readiness.status, "ready_for_tomorrow_locked_today");
  assert.equal(readiness.tomorrow, "2026-05-30");
  assert.equal(readiness.runLock.status, "locked_already_ran_today");
  assert.equal(readiness.runLock.canRunToday, false);
  assert.match(readiness.runLock.idempotencyKey, /COMPANY-1::agent-leads-daily-review-run::2026-05-29/);
  assert.equal(readiness.tomorrowRunPreview.willCheckCount, 1);
  assert.equal(readiness.tomorrowRunPreview.rows.find((row) => row.id === "public-1")?.status, "will_check");
  assert.equal(readiness.tomorrowRunPreview.rows.find((row) => row.id === "private-1")?.status, "skipped_paused");
  assert.equal(readiness.staleSourceAlerts.some((alert) => alert.id === "repeated-no-results"), true);
  assert.equal(readiness.scheduledRunPacket.safeForCron, true);
  assert.equal(readiness.scheduledRunPacket.reviewOnlyExecution, true);
  assert.equal(readiness.externalActionsLocked, true);
  assert.equal(readiness.unattendedLoginEnabled, false);
  assert.equal(readiness.customerContactEnabled, false);
  assert.equal(readiness.integrationWritesEnabled, false);
  assert.match(readiness.safetyBoundary, /does not create a scheduler/i);
});

test("Agent OS v45 rehearses Agent Leads pilot execution without external actions", () => {
  const providerSettings = normalizeAgentLeadsProviderSettings({
    mode: "live_locked",
    enabledConnectorIds: ["public_procurement_search"],
    dailyJobFinderAutopilot: {
      enabled: true,
      runTimeLocal: "05:45",
      sourcePriorityIds: ["public-1"],
      pausedSourceIds: ["private-1"],
    },
  });
  const dailyReviewInbox = {
    rows: [],
    stats: { totalRows: 0 },
    externalActionsLocked: true,
  };
  const dailyRunHistory = {
    rows: [{
      id: "daily-job-finder-autopilot-ace-2026-05-29",
      day: "2026-05-29",
      status: "prepared_no_results",
      sourceCount: 2,
      reviewRows: 0,
      providerAttemptCount: 1,
      noResult: true,
    }],
    stats: { runCount: 1, noResultRuns: 1 },
    noResultLearning: {
      recommendations: [{
        id: "expand-or-tighten-scope",
        label: "Tune tomorrow's scope",
        reason: "No-result run should tune source priority.",
        suggestedControl: "Adjust source priority.",
      }],
    },
  };
  const scheduledRunReadiness = {
    mode: "agent_leads_scheduled_run_readiness_v44",
    today: "2026-05-29",
    tomorrow: "2026-05-30",
    status: "ready_for_tomorrow_locked_today",
    scheduledRunPacket: {
      id: "COMPANY-1::agent-leads-scheduled-run::2026-05-30",
      endpoint: "POST /api/agent/os/provider/daily-job-finder/autopilot",
      runTimeLocal: "05:45",
      timezone: "local",
      targetDay: "2026-05-30",
      safeForCron: true,
      reviewOnlyExecution: true,
      externalActionsLocked: true,
    },
    runLock: {
      idempotencyKey: "COMPANY-1::agent-leads-daily-review-run::2026-05-29",
      todayRunRecorded: true,
      todayRunCount: 1,
      status: "locked_already_ran_today",
      canRunToday: false,
      detail: "A daily Agent Leads run is already recorded today for this company.",
    },
    tomorrowRunPreview: {
      rows: [{
        id: "public-1",
        label: "City procurement",
        connectorId: "public_procurement_search",
        status: "will_check",
        willCheck: true,
        reason: "Included in tomorrow's review-only Agent Leads run.",
      }, {
        id: "private-1",
        label: "Private group",
        status: "skipped_paused",
        willCheck: false,
        paused: true,
        reason: "Paused by owner/admin controls.",
      }],
      willCheckCount: 1,
      exactlyWhatApexWillNotDo: ["No lead auto-save or customer/source contact."],
    },
    staleSourceAlerts: [{
      id: "repeated-no-results",
      label: "Repeated no-result mornings",
      reason: "1 recorded run had no review rows.",
      nextStep: "Tune source priority.",
    }],
    blockers: [],
  };
  const rehearsal = buildAgentLeadsPilotExecutionRehearsal({
    scheduledRunReadiness,
    dailyReviewInbox,
    dailyRunHistory,
    dailySourceMonitoring: { noJobsExplanation: "No review rows cleared fit gates today." },
    providerSettings,
    companySettings: { companyName: "Ace Fence" },
    companyId: "COMPANY-1",
    today: "2026-05-29",
  });

  assert.equal(rehearsal.mode, "agent_leads_pilot_execution_rehearsal_v45");
  assert.equal(rehearsal.status, "ready_with_review_notes");
  assert.equal(rehearsal.simulatedScheduledRunPacket.rehearsalOnly, true);
  assert.equal(rehearsal.simulatedScheduledRunPacket.safeForCron, false);
  assert.equal(rehearsal.idempotencyRehearsal.rehearsalPassed, true);
  assert.equal(rehearsal.simulatedReviewInbox.count, 1);
  assert.equal(rehearsal.simulatedReviewInbox.rows[0].canAutoSave, false);
  assert.equal(rehearsal.simulatedReviewInbox.skippedRows[0].status, "skipped_paused");
  assert.equal(rehearsal.carriedLearning.noResultRecommendations.length, 1);
  assert.equal(rehearsal.carriedLearning.staleSourceAlerts.length, 1);
  assert.match(rehearsal.ownerAdminPilotReadinessReport.summary, /review-only contractor workflow/i);
  assert.equal(rehearsal.externalActionsLocked, true);
  assert.equal(rehearsal.customerContactEnabled, false);
  assert.equal(rehearsal.unattendedLoginEnabled, false);
  assert.equal(rehearsal.productionDataTouchEnabled, false);
  assert.match(rehearsal.safetyBoundary, /does not create a scheduler/i);
});

test("Agent OS v46 persists controlled Agent Leads pilot run evidence without external actions", () => {
  const scheduledRunReadiness = {
    mode: "agent_leads_scheduled_run_readiness_v44",
    today: "2026-05-28",
    tomorrow: "2026-05-29",
    status: "ready_for_tomorrow_review_only_run",
    scheduledRunPacket: { id: "COMPANY-1::agent-leads-scheduled-run::2026-05-29", safeForCron: true },
    runLock: { idempotencyKey: "COMPANY-1::agent-leads-daily-review-run::2026-05-28", status: "available_for_today", canRunToday: true },
    tomorrowRunPreview: { rows: [{ id: "SRC-1", sourceKey: "src-1", label: "City bids", willCheck: true }] },
    blockers: [],
  };
  const pilotExecutionRehearsal = {
    mode: "agent_leads_pilot_execution_rehearsal_v45",
    status: "ready_for_owner_admin_review",
    tomorrow: "2026-05-29",
  };
  const controlledDailyRunReviewFlow = {
    mode: "agent_leads_controlled_daily_run_review_flow_v42",
    status: "review_inbox_ready",
    nextRunDate: "2026-05-29",
    selectedSourceRows: [{
      sourceConfigId: "SRC-1",
      sourceName: "City bids",
      sourceUrl: "https://city.example.gov/bids",
      connectorId: "public_procurement_search",
      idempotencyKey: "COMPANY-1::SRC-1::2026-05-29",
      expectedOutput: "Review inbox row or no-result explanation.",
    }],
    reviewInboxPreviewRows: [{
      id: "ROW-1",
      providerResultId: "RESULT-1",
      title: "Sidewalk bid review",
      sourceName: "City bids",
      sourceUrl: "https://city.example.gov/bids",
      fitScore: 78,
      canAutoSave: false,
    }],
    stats: { reviewInboxRows: 1 },
  };
  const execution = buildAgentLeadsControlledPilotRunExecution({
    scheduledRunReadiness,
    pilotExecutionRehearsal,
    controlledDailyRunReviewFlow,
    dailyRunHistory: { status: "has_run_history", rows: [] },
    dailyRunAdminControls: { enabled: true },
    dailySourceMonitoring: { noJobsExplanation: "", stats: { missedSourceAlerts: 0 } },
    providerSettings: { mode: "test" },
    companySettings: { companyName: "Ace" },
    companyId: "COMPANY-1",
    actorUserId: "OWNER-1",
    today: "2026-05-28",
    now: "2026-05-28T10:00:00.000Z",
  });
  assert.equal(execution.mode, "agent_leads_controlled_pilot_run_execution_v46");
  assert.equal(execution.status, "ready_to_persist_review_inbox");
  assert.equal(execution.runRecord.mode, "agent_leads_controlled_pilot_run_record_v46");
  assert.equal(execution.runRecord.sourceCount, 1);
  assert.equal(execution.persistedReviewInbox.mode, "agent_leads_persistent_review_inbox_v46");
  assert.equal(execution.persistedReviewInbox.rows[0].canAutoSave, false);
  assert.equal(execution.controlledPublicSourceExecutor.networkRequestsEnabled, false);
  assert.equal(execution.runControls.runNow.enabled, true);
  assert.equal(execution.productionSafetyReport.blockedExternalActions.includes("contact"), true);
  assert.equal(execution.leadAutoSaveEnabled, false);
  assert.equal(execution.customerContactEnabled, false);
  assert.equal(execution.productionDataTouchEnabled, false);

  const persisted = buildAgentLeadsControlledPilotRunExecution({
    scheduledRunReadiness,
    pilotExecutionRehearsal,
    controlledDailyRunReviewFlow,
    auditEvents: [{
      action: "agent.os.provider.controlled_pilot_run.review_inbox_persisted",
      createdAt: "2026-05-28T10:00:00.000Z",
      detail: { agentLeadsControlledPilotRunExecution: execution },
    }],
    companyId: "COMPANY-1",
    today: "2026-05-28",
  });
  assert.equal(persisted.status, "persisted");
  assert.equal(persisted.runControls.runNow.enabled, false);
  assert.equal(persisted.persistedReviewInbox.rows[0].status, "persisted_for_review");
});

test("Agent OS v42 builds a controlled daily run review flow from approved public-source evidence only", () => {
  const packet = {
    mode: "agent_leads_controlled_daily_public_source_run_evidence_packet_v32",
    status: "ready_for_owner_admin_review",
    nextRunDate: "2026-05-30",
    runEnvelope: { runId: "agent-leads-controlled-public-source-run-2026-05-30" },
    sourceRunRows: [{
      sourceConfigId: "source-city-bids",
      sourceName: "City bid page",
      sourceUrl: "https://city.example.gov/procurement/open-bids",
      connectorId: "public_procurement_search",
      idempotencyKey: "agent-leads-controlled-daily-public-source-run::approved_public_search::source-city-bids::2026-05-30::https://city.example.gov/procurement/open-bids",
      expectedOutput: "Provider-shaped review card or no-result/error evidence; no Found Opportunity or Lead is saved automatically.",
    }],
  };
  const flow = buildAgentLeadsControlledDailyRunReviewFlow({
    controlledDailyPublicSourceRunEvidencePacket: packet,
    controlledDailyPublicRunPreflight: {
      mode: "agent_leads_controlled_daily_public_run_preflight_v34",
      status: "ready_for_controlled_evidence_prep",
      approvalStatus: "approved_for_controlled_evidence_prep",
    },
    controlledDailyPublicRunEvidencePrep: {
      mode: "agent_leads_controlled_daily_public_run_evidence_prep_v35",
      status: "review_evidence_prepared",
      runId: "agent-leads-controlled-public-source-run-2026-05-30",
      createdAt: "2026-05-29T12:00:00.000Z",
      evidenceRows: [{
        id: "controlled-daily-public-run-evidence-1-source-city-bids",
        providerResultId: "controlled-public-review-2026-05-30-source-city-bids",
        sourceConfigId: "source-city-bids",
        sourceName: "City bid page",
        sourceUrl: "https://city.example.gov/procurement/open-bids",
        connectorId: "public_procurement_search",
        idempotencyKey: packet.sourceRunRows[0].idempotencyKey,
        status: "review_card_prepared",
        title: "City bid page review card",
        fitScore: 0,
        duplicateRisk: "needs_human_review",
        reviewNote: "Controlled public-source evidence row prepared for owner/admin review only.",
      }],
    },
    dailyReviewInbox: { rows: [], stats: { totalRows: 0 } },
    dailySourceMonitoring: { noJobsExplanation: "1 eligible public source ran or is ready." },
    dailyRunRecord: { id: "daily-agent-leads-2026-05-29" },
    auditEvents: [{
      action: "agent.os.provider.daily_public_run.outcome_recorded",
      createdAt: "2026-05-29T12:10:00.000Z",
      detail: {
        controlledDailyPublicRunOutcomeRecords: [{
          nextRunDate: "2026-05-30",
          evidenceRowId: "controlled-daily-public-run-evidence-1-source-city-bids",
          providerResultId: "controlled-public-review-2026-05-30-source-city-bids",
          decision: "draft_found_opportunity",
          note: "Good public source fit.",
          createdAt: "2026-05-29T12:10:00.000Z",
          externalActionsLocked: true,
          canAutoSave: false,
        }],
      },
    }],
    companySettings: { companyName: "Ace Fence" },
    today: "2026-05-29",
  });
  const blocked = buildAgentLeadsControlledDailyRunReviewFlow({
    controlledDailyPublicSourceRunEvidencePacket: packet,
    controlledDailyPublicRunPreflight: {
      mode: "agent_leads_controlled_daily_public_run_preflight_v34",
      status: "blocked",
      approvalStatus: "missing",
    },
    controlledDailyPublicRunEvidencePrep: {
      mode: "agent_leads_controlled_daily_public_run_evidence_prep_v35",
      status: "blocked",
      evidenceRows: [],
    },
    today: "2026-05-29",
  });

  assert.equal(flow.mode, "agent_leads_controlled_daily_run_review_flow_v42");
  assert.equal(flow.status, "review_inbox_ready");
  assert.equal(flow.selectedSourceRows.length, 1);
  assert.equal(flow.reviewInboxPreviewRows.length, 1);
  assert.equal(flow.reviewInboxPreviewRows[0].canAutoSave, false);
  assert.equal(flow.reviewInboxPreviewRows[0].canCreateLeadDirectly, false);
  assert.equal(flow.reviewInboxPreviewRows[0].outcomeDecision, "draft_found_opportunity");
  assert.equal(flow.reviewInboxPreviewRows[0].outcomeStatus, "recorded");
  assert.equal(flow.reviewInboxPreviewRows[0].customerContactEnabled, false);
  assert.equal(flow.stats.outcomeRows, 1);
  assert.equal(flow.stats.decidedReviewRows, 1);
  assert.equal(flow.commandSteps.find((step) => step.id === "record-outcomes")?.status, "outcomes_recorded");
  assert.equal(flow.commandSteps.every((step) => step.externalActionsLocked === true), true);
  assert.equal(flow.externalActionsLocked, true);
  assert.equal(flow.liveProviderCallsEnabled, false);
  assert.equal(flow.browserAutomationEnabled, false);
  assert.equal(flow.scrapingEnabled, false);
  assert.equal(flow.leadAutoSaveEnabled, false);
  assert.equal(flow.customerContactEnabled, false);
  assert.equal(flow.bidSubmissionEnabled, false);
  assert.equal(flow.paymentCollectionEnabled, false);
  assert.equal(flow.schedulingMutationEnabled, false);
  assert.equal(flow.integrationWritesEnabled, false);
  assert.match(flow.safetyBoundary, /does not browse, scrape, log in, contact anyone/i);
  assert.equal(blocked.status, "ready_for_owner_approval");
  assert.match(blocked.blockers.join(" "), /approval and preflight/i);
});

test("Agent OS v9 public-source provider adapters fetch safe public URLs into review queue only", async () => {
  const settings = normalizeAgentLeadsProviderSettings({
    providerId: "approved_public_search",
    mode: "live_locked",
    dailyBudget: 3,
    maxResultsPerRun: 2,
    enabledConnectorIds: ["public_procurement_search"],
    geographyControls: { serviceAreas: ["Salem"] },
    tradeScope: { trades: ["concrete"] },
    reviewRules: { requireHumanOpen: true, dedupeBeforeImport: true },
  });
  const approvedAudit = [{
    id: "AUDIT-APPROVAL-V9",
    action: "agent.os.provider.live_adapter.approve_boundary",
    createdAt: "2026-05-27T08:00:00.000Z",
    detail: JSON.stringify({
      providerApprovalDecision: {
        providerId: "approved_public_search",
        connectorIds: ["public_procurement_search"],
        decision: "approve_boundary",
        status: "boundary_approved",
        actorUserId: "OWNER-1",
        createdAt: "2026-05-27T08:00:00.000Z",
      },
    }),
  }];
  const runnerCards = [{
    id: "public-card-v9",
    type: "public_source_runner",
    targetKind: "search_profile",
    targetId: "OSP-V9",
    title: "City procurement bid page",
    query: "Salem concrete sidewalk bid opportunity",
    sourceConnector: { id: "public_web", label: "Public web", category: "public", posture: "review_card" },
    controls: { trades: ["concrete"], serviceAreas: ["Salem"], excludedKeywords: [] },
    searchUrls: [{ label: "City bid page", url: "https://city.example/bids" }],
  }];
  const fetchCalls = [];
  const fetchImpl = async (url, init) => {
    fetchCalls.push({ url, method: init?.method });
    return {
      status: 200,
      headers: { get: (name) => (name.toLowerCase() === "content-type" ? "text/html; charset=utf-8" : "") },
      text: async () => "<html><head><title>City of Salem Bids</title></head><body><a href=\"/bids/sidewalk-rfp\">Concrete sidewalk replacement RFP</a><a href=\"/bids/parks-flatwork\">Parks flatwork repair bid</a></body></html>",
    };
  };
  const contract = buildAgentLeadsPublicProviderAdapterContract(settings);
  const execution = await runAgentLeadsPublicSourceProviderAdapters({
    settings,
    runnerCards,
    auditEvents: approvedAudit,
    companyId: "COMPANY-1",
    actorUserId: "OWNER-1",
    today: "2026-05-27",
    connectorIds: ["public_procurement_search"],
    serverGates: { packageEnabled: true, roleAllowed: true, ownerAdminApproved: true },
    fetchImpl,
  });
  const spentAudit = [{
    id: "AUDIT-V9-SPENT",
    action: "agent.os.provider.public_source_adapters.review_queue_prepared",
    createdAt: "2026-05-27T09:00:00.000Z",
    detail: JSON.stringify({ providerPublicSourceAdapterExecution: execution }),
  }];
  const duplicateExecution = await runAgentLeadsPublicSourceProviderAdapters({
    settings,
    runnerCards,
    auditEvents: [...approvedAudit, ...spentAudit],
    companyId: "COMPANY-1",
    actorUserId: "OWNER-1",
    today: "2026-05-27",
    connectorIds: ["public_procurement_search"],
    serverGates: { packageEnabled: true, roleAllowed: true, ownerAdminApproved: true },
    fetchImpl,
  });
  const searchEngineBlocked = await runAgentLeadsPublicSourceProviderAdapters({
    settings,
    runnerCards: [{ ...runnerCards[0], searchUrls: [{ label: "Search page", url: "https://www.google.com/search?q=salem%20concrete%20bids" }] }],
    auditEvents: approvedAudit,
    companyId: "COMPANY-1",
    actorUserId: "OWNER-1",
    today: "2026-05-27",
    connectorIds: ["public_procurement_search"],
    serverGates: { packageEnabled: true, roleAllowed: true, ownerAdminApproved: true },
    fetchImpl,
  });
  const loginConnectorBlocked = await runAgentLeadsPublicSourceProviderAdapters({
    settings: normalizeAgentLeadsProviderSettings({ ...settings, enabledConnectorIds: ["public_plan_room_search"], credentialBoundary: { mode: "oauth_reference_only", credentialRef: "credref" } }),
    runnerCards,
    auditEvents: approvedAudit,
    companyId: "COMPANY-1",
    actorUserId: "OWNER-1",
    today: "2026-05-27",
    connectorIds: ["public_plan_room_search"],
    serverGates: { packageEnabled: true, roleAllowed: true, ownerAdminApproved: true },
    fetchImpl,
  });
  const directClientBlocked = await runAgentLeadsPublicSourceProviderAdapters({
    settings,
    runnerCards,
    auditEvents: approvedAudit,
    companyId: "COMPANY-1",
    actorUserId: "OWNER-1",
    today: "2026-05-27",
    connectorIds: ["public_procurement_search"],
    directClientAttempt: true,
    serverGates: { packageEnabled: true, roleAllowed: true, ownerAdminApproved: true },
    fetchImpl,
  });
  const ledger = deriveAgentLeadsProviderAttemptLedger(spentAudit, settings, { today: "2026-05-27" });

  assert.equal(contract.version, "v9");
  assert.equal(contract.adapters.some((adapter) => adapter.connectorId === "public_procurement_search" && adapter.enabled), true);
  assert.equal(execution.mode, "agent_leads_public_source_provider_adapters_v9");
  assert.equal(execution.status, "review_queue_prepared");
  assert.equal(execution.liveNetworkRequestsAllowed, true);
  assert.equal(execution.externalNetworkRequestAttempted, true);
  assert.equal(fetchCalls.length, 1);
  assert.equal(fetchCalls[0].method, "GET");
  assert.equal(execution.results.length, 2);
  assert.match(execution.results[0].sourceUrl, /https:\/\/city\.example\/bids\/sidewalk-rfp/);
  assert.equal(Boolean(execution.results[0].dedupeKey), true);
  assert.equal(execution.reviewQueue.count, 2);
  assert.equal(execution.reviewQueue.rows[0].canAutoSave, false);
  assert.match(execution.reviewQueue.rows[0].blockedActions.join(" "), /No auto-save/i);
  assert.equal(duplicateExecution.status, "blocked");
  assert.match(duplicateExecution.blockedReasons.join(" "), /Duplicate/i);
  assert.equal(searchEngineBlocked.status, "blocked");
  assert.match(searchEngineBlocked.blockedReasons.join(" "), /search_engine_serp_requires_official_api/i);
  assert.equal(loginConnectorBlocked.status, "blocked");
  assert.match(loginConnectorBlocked.blockedReasons.join(" "), /no-login/i);
  assert.equal(directClientBlocked.status, "blocked");
  assert.match(directClientBlocked.blockedReasons.join(" "), /Direct clients/i);
  assert.equal(ledger.usedBudget, 1);
});

test("Agent OS v10 private-source authorization, handoff, evidence intake, and checklist stay human-operated", () => {
  const authorization = normalizeAgentLeadsPrivateSourceAuthorization({
    sourceName: "Salem contractors private group",
    sourceType: "facebook_private_group",
    sourceAdapterId: "facebook_private_group",
    authorizedBy: "Owner One",
    credentialRef: "credref-private-group",
    acknowledgement: true,
    expiresAt: "2026-05-27T12:00:00.000Z",
    allowedActions: ["human_open", "paste_safe_evidence", "auto_contact"],
  }, {
    id: "PRIVATE-AUTH-1",
    companyId: "COMPANY-1",
    actorUserId: "OWNER-1",
    now: "2026-05-26T12:00:00.000Z",
  });
  const handoff = buildAgentLeadsPrivateSourceLoginHandoff(authorization.authorization, {
    id: "PRIVATE-HANDOFF-1",
    companyId: "COMPANY-1",
    actorUserId: "OWNER-1",
    now: "2026-05-26T12:01:00.000Z",
  });
  const intake = normalizeAgentLeadsPrivateEvidenceIntake({
    authorizationId: authorization.authorization.id,
    sourceName: authorization.authorization.sourceName,
    sourceType: authorization.authorization.sourceType,
    sourceAdapterId: authorization.authorization.sourceAdapterId,
    evidenceText: "Concrete patio repair lead near Salem. Contact jane@example.com at 503-555-1212. password=badsecret",
    fileNames: ["private-group-screenshot.png"],
  }, {
    id: "PRIVATE-EVIDENCE-1",
    companyId: "COMPANY-1",
    actorUserId: "OWNER-1",
    now: "2026-05-27T09:00:00.000Z",
  });
  const rawSecretBlocked = normalizeAgentLeadsPrivateSourceAuthorization({
    sourceName: "Bad source",
    sourceAdapterId: "facebook_private_group",
    authorizedBy: "Owner One",
    acknowledgement: true,
    password: "do-not-store",
  });
  const autoSaveBlocked = normalizeAgentLeadsPrivateEvidenceIntake({
    evidenceText: "",
    sourceAdapterId: "facebook_private_group",
  });
  const auditEvents = [{
    id: "AUDIT-PRIVATE-AUTH",
    action: "agent.os.provider.private_source.authorization_recorded",
    createdAt: "2026-05-26T12:00:00.000Z",
    detail: JSON.stringify({ privateSourceAuthorization: authorization.authorization }),
  }];
  const derivedAuthorizations = deriveAgentLeadsPrivateSourceAuthorizations(auditEvents);
  const checklist = buildAgentLeadsPrivateSourceDailyChecklist({
    privateSourceAuthorizations: derivedAuthorizations,
    privateHandoffCards: [{
      id: "private-card-1",
      type: "private_source_handoff",
      title: "Nextdoor neighborhood jobs",
      sourceConnector: { id: "nextdoor_private_group", category: "private_social" },
    }],
    today: "2026-05-28",
  });

  assert.equal(authorization.ok, true);
  assert.equal(authorization.authorization.status, "authorized_human_handoff");
  assert.equal(authorization.authorization.rawCredentialStorage, false);
  assert.equal(authorization.authorization.loginAutomationEnabled, false);
  assert.equal(authorization.authorization.allowedActions.includes("auto_contact"), false);
  assert.match(authorization.authorization.forbiddenActions.join(" "), /unattended_login/i);
  assert.equal(handoff.ok, true);
  assert.equal(handoff.handoff.status, "human_login_required");
  assert.match(handoff.handoff.blockedActions.join(" "), /No unattended login/i);
  assert.equal(intake.ok, true);
  assert.match(intake.intake.redactedEvidenceText, /\[redacted-email\]/);
  assert.match(intake.intake.redactedEvidenceText, /\[redacted-phone\]/);
  assert.match(intake.intake.redactedEvidenceText, /password=\[redacted\]/i);
  assert.equal(intake.intake.reviewQueue.count, 1);
  assert.equal(intake.intake.reviewQueue.rows[0].canAutoSave, false);
  assert.equal(rawSecretBlocked.ok, false);
  assert.match(rawSecretBlocked.error, /passwords/i);
  assert.equal(autoSaveBlocked.ok, false);
  assert.equal(derivedAuthorizations.length, 1);
  assert.equal(checklist.mode, "agent_leads_private_source_daily_checklist_v10");
  assert.equal(checklist.count, 2);
  assert.equal(checklist.reviewDueCount >= 1, true);
  assert.match(checklist.safetyBoundary, /does not log in/i);
});

test("Agent OS v11 platform provider boundaries drive compliance and monitoring without enabling execution", () => {
  const settings = normalizeAgentLeadsProviderSettings({
    providerId: "approved_public_search",
    mode: "live_locked",
    dailyBudget: 8,
    maxResultsPerRun: 2,
    enabledConnectorIds: ["public_procurement_search"],
    geographyControls: { serviceAreas: ["Salem"] },
    tradeScope: { trades: ["concrete"] },
    reviewRules: { requireHumanOpen: true, dedupeBeforeImport: true },
  });
  const boundary = normalizeAgentLeadsPlatformProviderBoundary({
    providerName: "City Procurement Feed",
    providerType: "procurement_feed_api",
    connectorIds: ["public_procurement_search"],
    reviewedBy: "Owner One",
    sourceTermsStatus: "approved",
    robotsStatus: "not_applicable",
    credentialRef: "credref-city-feed",
    allowedOperations: ["search_read", "listing_read", "send_dm", "submit_bid"],
    acknowledgement: true,
    expiresAt: "2026-06-30T00:00:00.000Z",
  }, {
    id: "PLATFORM-BOUNDARY-1",
    companyId: "COMPANY-1",
    actorUserId: "OWNER-1",
    now: "2026-05-28T08:00:00.000Z",
  });
  const rawSecretBlocked = normalizeAgentLeadsPlatformProviderBoundary({
    providerName: "Bad Provider",
    providerType: "approved_search_api",
    connectorIds: ["public_web_search"],
    reviewedBy: "Owner One",
    sourceTermsStatus: "approved",
    robotsStatus: "allowed",
    acknowledgement: true,
    apiKey: "do-not-store",
  });
  const publicExecutionAudit = {
    id: "AUDIT-PUBLIC-V9",
    action: "agent.os.provider.public_source_adapters.review_queue_prepared",
    createdAt: "2026-05-28T09:00:00.000Z",
    detail: JSON.stringify({
      providerPublicSourceAdapterExecution: {
        adapterInvocations: [{ attemptId: "ATTEMPT-1", connectorId: "public_procurement_search", status: "ok", resultCount: 1 }],
        results: [{ providerResultId: "RESULT-1" }],
        rejectedResults: [],
        reviewQueue: { count: 1 },
      },
    }),
  };
  const auditEvents = [
    {
      id: "AUDIT-BOUNDARY",
      action: "agent.os.provider.platform_boundary.recorded",
      createdAt: "2026-05-28T08:00:00.000Z",
      detail: JSON.stringify({ platformProviderBoundary: boundary.boundary }),
    },
    publicExecutionAudit,
    {
      id: "AUDIT-PRIVATE-EVIDENCE",
      action: "agent.os.provider.private_source.evidence_intake_recorded",
      createdAt: "2026-05-28T10:00:00.000Z",
      detail: JSON.stringify({ privateSourceEvidenceIntake: { reviewQueue: { count: 1 } } }),
    },
  ];
  const derivedBoundaries = deriveAgentLeadsPlatformProviderBoundaries(auditEvents, { today: "2026-05-28" });
  const compliance = buildAgentLeadsProviderCompliancePacket({
    settings,
    auditEvents,
    companyId: "COMPANY-1",
    actorUserId: "OWNER-1",
    now: "2026-05-28T12:00:00.000Z",
  });
  const monitor = buildAgentLeadsProviderMonitoringSnapshot({
    settings,
    auditEvents,
    today: "2026-05-28",
    now: "2026-05-28T12:00:00.000Z",
  });

  assert.equal(boundary.ok, true);
  assert.equal(boundary.boundary.status, "boundary_recorded");
  assert.equal(boundary.boundary.rawCredentialStorage, false);
  assert.equal(boundary.boundary.executionEnabled, false);
  assert.equal(boundary.boundary.liveNetworkRequestsEnabled, false);
  assert.equal(boundary.boundary.allowedOperations.includes("send_dm"), false);
  assert.equal(boundary.boundary.allowedOperations.includes("submit_bid"), false);
  assert.equal(rawSecretBlocked.ok, false);
  assert.match(rawSecretBlocked.error, /references only/i);
  assert.equal(derivedBoundaries.length, 1);
  assert.equal(derivedBoundaries[0].expired, false);
  assert.equal(compliance.mode, "agent_leads_provider_compliance_packet_v11");
  assert.equal(compliance.status, "ready_for_provider_adapter_build");
  assert.equal(compliance.executionEnabled, false);
  assert.equal(compliance.liveNetworkRequestsEnabled, false);
  assert.equal(compliance.externalActionsLocked, true);
  assert.equal(monitor.mode, "agent_leads_provider_monitoring_snapshot_v11");
  assert.equal(monitor.counts.adapterInvocations, 1);
  assert.equal(monitor.counts.privateEvidenceIntakes, 1);
  assert.equal(monitor.counts.reviewQueueRows, 2);
  assert.equal(monitor.executionEnabled, false);
  assert.match(monitor.safetyBoundary, /does not poll providers/i);
});

test("Agent OS v12 official provider API adapter harness prepares sandbox review queue only", () => {
  const settings = normalizeAgentLeadsProviderSettings({
    providerId: "approved_public_search",
    mode: "live_locked",
    dailyBudget: 8,
    maxResultsPerRun: 2,
    enabledConnectorIds: ["public_procurement_search"],
    geographyControls: { serviceAreas: ["Salem"] },
    tradeScope: { trades: ["concrete"] },
    reviewRules: { requireHumanOpen: true, dedupeBeforeImport: true },
  });
  const boundary = normalizeAgentLeadsPlatformProviderBoundary({
    providerName: "City Procurement Feed",
    providerType: "procurement_feed_api",
    connectorIds: ["public_procurement_search"],
    reviewedBy: "Owner One",
    sourceTermsStatus: "approved",
    robotsStatus: "not_applicable",
    acknowledgement: true,
  }, {
    id: "PLATFORM-BOUNDARY-V12",
    companyId: "COMPANY-1",
    actorUserId: "OWNER-1",
    now: "2026-05-28T08:00:00.000Z",
  });
  const auditEvents = [
    {
      id: "AUDIT-LIVE-APPROVAL-V12",
      action: "agent.os.provider.live_adapter.approve_boundary",
      createdAt: "2026-05-28T07:00:00.000Z",
      detail: JSON.stringify({
        providerApprovalDecision: {
          providerId: "approved_public_search",
          decision: "approve_boundary",
          status: "boundary_approved",
          connectorIds: ["public_procurement_search"],
        },
      }),
    },
    {
      id: "AUDIT-BOUNDARY-V12",
      action: "agent.os.provider.platform_boundary.recorded",
      createdAt: "2026-05-28T08:00:00.000Z",
      detail: JSON.stringify({ platformProviderBoundary: boundary.boundary }),
    },
  ];
  const contract = buildAgentLeadsOfficialProviderApiAdapterContract({
    settings,
    auditEvents,
    today: "2026-05-28",
  });
  const execution = runAgentLeadsOfficialProviderApiAdapterHarness({
    settings,
    auditEvents,
    companyId: "COMPANY-1",
    actorUserId: "OWNER-1",
    today: "2026-05-28",
    now: "2026-05-28T09:00:00.000Z",
    adapterId: "official_procurement_feed_api_sandbox",
    query: "Salem concrete sidewalk bid",
    connectorIds: ["public_procurement_search"],
    mockProviderResponse: {
      results: [{
        id: "OFFICIAL-RESULT-1",
        title: "Sidewalk replacement RFP",
        snippet: "Official procurement feed sandbox result.",
        fitScore: 82,
      }],
    },
    serverGates: { packageEnabled: true, roleAllowed: true, ownerAdminApproved: true },
  });
  const spentAudit = [{
    id: "AUDIT-OFFICIAL-V12",
    action: "agent.os.provider.official_api_adapter.review_queue_prepared",
    createdAt: "2026-05-28T09:00:00.000Z",
    detail: JSON.stringify({ officialProviderApiAdapterExecution: execution }),
  }];
  const duplicateBlocked = runAgentLeadsOfficialProviderApiAdapterHarness({
    settings,
    auditEvents: [...auditEvents, ...spentAudit],
    companyId: "COMPANY-1",
    actorUserId: "OWNER-1",
    today: "2026-05-28",
    now: "2026-05-28T10:00:00.000Z",
    adapterId: "official_procurement_feed_api_sandbox",
    query: "Salem concrete sidewalk bid",
    connectorIds: ["public_procurement_search"],
    serverGates: { packageEnabled: true, roleAllowed: true, ownerAdminApproved: true },
  });
  const directClientBlocked = runAgentLeadsOfficialProviderApiAdapterHarness({
    settings,
    auditEvents,
    companyId: "COMPANY-1",
    actorUserId: "OWNER-1",
    today: "2026-05-28",
    adapterId: "official_procurement_feed_api_sandbox",
    directClientAttempt: true,
    serverGates: { packageEnabled: true, roleAllowed: true, ownerAdminApproved: true },
  });

  assert.equal(contract.id, "agent_leads_official_provider_api_adapter_contract_v12");
  assert.equal(contract.adapters.some((adapter) => adapter.id === "official_procurement_feed_api_sandbox" && adapter.boundaryStatus === "boundary_recorded"), true);
  assert.equal(execution.mode, "agent_leads_official_provider_api_adapter_harness_v12");
  assert.equal(execution.status, "review_queue_prepared");
  assert.equal(execution.executionEnabled, false);
  assert.equal(execution.liveNetworkRequestsEnabled, false);
  assert.equal(execution.externalNetworkRequestAttempted, false);
  assert.equal(execution.adapterInvocations[0].officialProviderApiAdapter, true);
  assert.equal(execution.reviewQueue.count, 1);
  assert.equal(execution.reviewQueue.rows[0].canAutoSave, false);
  assert.match(execution.safetyBoundary, /sandbox\/mock/i);
  assert.equal(duplicateBlocked.status, "blocked");
  assert.match(duplicateBlocked.blockedReasons.join(" "), /Duplicate/i);
  assert.equal(directClientBlocked.status, "blocked");
  assert.match(directClientBlocked.blockedReasons.join(" "), /Direct clients/i);
});

test("Agent OS v13 procurement feed adapter records config and runs fixture review queue only", () => {
  const settings = normalizeAgentLeadsProviderSettings({
    providerId: "approved_public_search",
    mode: "live_locked",
    dailyBudget: 8,
    maxResultsPerRun: 2,
    enabledConnectorIds: ["public_procurement_search"],
    geographyControls: { serviceAreas: ["Salem"] },
    tradeScope: { trades: ["concrete"] },
    reviewRules: { requireHumanOpen: true, dedupeBeforeImport: true },
  });
  const boundary = normalizeAgentLeadsPlatformProviderBoundary({
    providerName: "City Procurement Feed",
    providerType: "procurement_feed_api",
    connectorIds: ["public_procurement_search"],
    reviewedBy: "Owner One",
    sourceTermsStatus: "approved",
    robotsStatus: "not_applicable",
    acknowledgement: true,
  }, {
    id: "PLATFORM-BOUNDARY-V13",
    companyId: "COMPANY-1",
    actorUserId: "OWNER-1",
    now: "2026-05-28T08:00:00.000Z",
  });
  const config = normalizeAgentLeadsProcurementFeedAdapterConfig({
    endpointName: "City bids fixture",
    endpointUrl: "https://city.example/procurement/feed",
    responseFormat: "json_feed",
    reviewedBy: "Owner One",
    acknowledgement: true,
  }, {
    id: "PROCUREMENT-CONFIG-1",
    companyId: "COMPANY-1",
    actorUserId: "OWNER-1",
    now: "2026-05-28T08:30:00.000Z",
  });
  const rawSecretBlocked = normalizeAgentLeadsProcurementFeedAdapterConfig({
    endpointName: "Bad feed",
    reviewedBy: "Owner One",
    acknowledgement: true,
    token: "do-not-store",
  });
  const auditEvents = [
    {
      id: "AUDIT-LIVE-APPROVAL-V13",
      action: "agent.os.provider.live_adapter.approve_boundary",
      createdAt: "2026-05-28T07:00:00.000Z",
      detail: JSON.stringify({
        providerApprovalDecision: {
          providerId: "approved_public_search",
          decision: "approve_boundary",
          status: "boundary_approved",
          connectorIds: ["public_procurement_search"],
        },
      }),
    },
    {
      id: "AUDIT-BOUNDARY-V13",
      action: "agent.os.provider.platform_boundary.recorded",
      createdAt: "2026-05-28T08:00:00.000Z",
      detail: JSON.stringify({ platformProviderBoundary: boundary.boundary }),
    },
    {
      id: "AUDIT-PROCUREMENT-CONFIG",
      action: "agent.os.provider.procurement_feed_adapter.config_recorded",
      createdAt: "2026-05-28T08:30:00.000Z",
      detail: JSON.stringify({ procurementFeedAdapterConfig: config.config }),
    },
  ];
  const contract = buildAgentLeadsProcurementFeedAdapterContract({
    settings,
    auditEvents,
    today: "2026-05-28",
  });
  const execution = runAgentLeadsProcurementFeedAdapter({
    settings,
    auditEvents,
    companyId: "COMPANY-1",
    actorUserId: "OWNER-1",
    today: "2026-05-28",
    now: "2026-05-28T09:00:00.000Z",
    configId: config.config.id,
    query: "Salem concrete sidewalk bid",
    fixtureResponse: {
      results: [{
        id: "PROC-FIXTURE-1",
        title: "Sidewalk replacement procurement",
        agency: "City of Salem",
        projectNumber: "BID-2026-42",
        dueAt: "2026-06-15T17:00:00.000Z",
        sourceUrl: "https://city.example/procurement/bid-42",
        snippet: "Fixture procurement feed result.",
        fitScore: 84,
      }],
    },
    serverGates: { packageEnabled: true, roleAllowed: true, ownerAdminApproved: true },
  });
  const spentAudit = [{
    id: "AUDIT-PROCUREMENT-RUN",
    action: "agent.os.provider.procurement_feed_adapter.review_queue_prepared",
    createdAt: "2026-05-28T09:00:00.000Z",
    detail: JSON.stringify({ procurementFeedAdapterExecution: execution }),
  }];
  const duplicateBlocked = runAgentLeadsProcurementFeedAdapter({
    settings,
    auditEvents: [...auditEvents, ...spentAudit],
    companyId: "COMPANY-1",
    actorUserId: "OWNER-1",
    today: "2026-05-28",
    now: "2026-05-28T10:00:00.000Z",
    configId: config.config.id,
    query: "Salem concrete sidewalk bid",
    serverGates: { packageEnabled: true, roleAllowed: true, ownerAdminApproved: true },
  });

  assert.equal(config.ok, true);
  assert.equal(config.config.status, "fixture_ready");
  assert.equal(config.config.executionEnabled, false);
  assert.equal(rawSecretBlocked.ok, false);
  assert.match(rawSecretBlocked.error, /references only/i);
  assert.equal(deriveAgentLeadsProcurementFeedAdapterConfigs(auditEvents).length, 1);
  assert.equal(contract.id, "agent_leads_procurement_feed_adapter_contract_v13");
  assert.equal(contract.status, "fixture_ready");
  assert.equal(execution.mode, "agent_leads_procurement_feed_adapter_v13");
  assert.equal(execution.status, "review_queue_prepared");
  assert.equal(execution.executionEnabled, false);
  assert.equal(execution.liveNetworkRequestsEnabled, false);
  assert.equal(execution.externalNetworkRequestAttempted, false);
  assert.equal(execution.results[0].agency, "City of Salem");
  assert.equal(execution.results[0].projectNumber, "BID-2026-42");
  assert.equal(execution.reviewQueue.count, 1);
  assert.equal(execution.reviewQueue.rows[0].canAutoSave, false);
  assert.equal(duplicateBlocked.status, "blocked");
  assert.match(duplicateBlocked.blockedReasons.join(" "), /Duplicate/i);
});

test("Agent OS v14 live provider readiness records metadata, consent, and schedule without unlocking live execution", () => {
  const settings = normalizeAgentLeadsProviderSettings({
    providerId: "approved_public_search",
    mode: "live_locked",
    dailyBudget: 6,
    enabledConnectorIds: ["public_procurement_search", "public_plan_room_search"],
    geographyControls: { serviceAreas: ["Salem"] },
    tradeScope: { trades: ["concrete"] },
    reviewRules: { requireHumanOpen: true, dedupeBeforeImport: true },
  });
  const publicConnection = normalizeAgentLeadsProviderConnectionMetadata({
    providerName: "City procurement feed",
    connectorId: "public_procurement_search",
    sourceCategory: "public_procurement",
    reviewedBy: "Owner One",
    acknowledgement: true,
  }, {
    id: "PROVIDER-CONNECTION-1",
    companyId: "COMPANY-1",
    actorUserId: "OWNER-1",
    now: "2026-05-28T08:00:00.000Z",
  });
  const publicConsent = normalizeAgentLeadsProviderSourceConsent({
    sourceName: "City procurement sources",
    sourceCategory: "public_procurement",
    connectorIds: ["public_procurement_search"],
    authorizedBy: "Owner One",
    acknowledgement: true,
  }, {
    id: "PROVIDER-CONSENT-1",
    companyId: "COMPANY-1",
    actorUserId: "OWNER-1",
    now: "2026-05-28T08:05:00.000Z",
  });
  const schedule = normalizeAgentLeadsProviderDailySchedule({
    sourceCategories: ["public_procurement"],
    startTimeLocal: "06:00",
    timezone: "America/Los_Angeles",
    reviewer: "Owner One",
    acknowledgement: true,
  }, {
    id: "PROVIDER-SCHEDULE-1",
    companyId: "COMPANY-1",
    actorUserId: "OWNER-1",
    now: "2026-05-28T08:10:00.000Z",
  });
  const boundary = normalizeAgentLeadsPlatformProviderBoundary({
    providerName: "City procurement feed",
    providerType: "procurement_feed_api",
    connectorIds: ["public_procurement_search"],
    reviewedBy: "Owner One",
    sourceTermsStatus: "approved",
    robotsStatus: "not_applicable",
    acknowledgement: true,
  }, {
    id: "PROVIDER-BOUNDARY-1",
    companyId: "COMPANY-1",
    actorUserId: "OWNER-1",
    now: "2026-05-28T08:15:00.000Z",
  });
  const rawSecretBlocked = normalizeAgentLeadsProviderConnectionMetadata({
    providerName: "Bad connection",
    connectorId: "public_plan_room_search",
    reviewedBy: "Owner One",
    acknowledgement: true,
    password: "do-not-store",
  });
  const unsafeConsentBlocked = normalizeAgentLeadsProviderSourceConsent({
    sourceName: "Bad consent",
    sourceCategory: "public_procurement",
    authorizedBy: "Owner One",
    acknowledgement: true,
    contactAllowed: true,
  });
  const forceLiveScheduleBlocked = normalizeAgentLeadsProviderDailySchedule({
    sourceCategories: ["public_procurement"],
    reviewer: "Owner One",
    acknowledgement: true,
    executionEnabled: true,
  });
  const auditEvents = [
    {
      id: "AUDIT-CONNECTION-1",
      action: "agent.os.provider.connection_metadata.recorded",
      createdAt: "2026-05-28T08:00:00.000Z",
      detail: JSON.stringify({ providerConnectionMetadata: publicConnection.connection }),
    },
    {
      id: "AUDIT-CONSENT-1",
      action: "agent.os.provider.source_consent.recorded",
      createdAt: "2026-05-28T08:05:00.000Z",
      detail: JSON.stringify({ providerSourceConsent: publicConsent.consent }),
    },
    {
      id: "AUDIT-SCHEDULE-1",
      action: "agent.os.provider.daily_schedule.recorded",
      createdAt: "2026-05-28T08:10:00.000Z",
      detail: JSON.stringify({ providerDailySchedule: schedule.schedule }),
    },
    {
      id: "AUDIT-BOUNDARY-1",
      action: "agent.os.provider.platform_boundary.recorded",
      createdAt: "2026-05-28T08:15:00.000Z",
      detail: JSON.stringify({ platformProviderBoundary: boundary.boundary }),
    },
  ];
  const readiness = buildAgentLeadsLiveProviderReadiness({
    settings,
    auditEvents,
    today: "2026-05-28",
    now: "2026-05-28T09:00:00.000Z",
  });
  const health = buildAgentLeadsProviderHealthCheck(settings, {
    auditEvents,
    today: "2026-05-28",
    now: "2026-05-28T09:00:00.000Z",
  });

  assert.equal(publicConnection.ok, true);
  assert.equal(publicConnection.connection.rawCredentialStorage, false);
  assert.equal(publicConsent.ok, true);
  assert.equal(publicConsent.consent.externalContactApproved, false);
  assert.equal(schedule.ok, true);
  assert.equal(schedule.schedule.safeForCron, true);
  assert.equal(schedule.schedule.providerExecutionEnabled, false);
  assert.equal(rawSecretBlocked.ok, false);
  assert.match(rawSecretBlocked.error, /credential references only/i);
  assert.equal(unsafeConsentBlocked.ok, false);
  assert.match(unsafeConsentBlocked.error, /cannot approve contact/i);
  assert.equal(forceLiveScheduleBlocked.ok, false);
  assert.match(forceLiveScheduleBlocked.error, /cannot enable live execution/i);
  assert.equal(deriveAgentLeadsProviderConnections(auditEvents).length, 1);
  assert.equal(deriveAgentLeadsProviderSourceConsents(auditEvents, { today: "2026-05-28" }).length, 1);
  assert.equal(deriveAgentLeadsProviderDailySchedules(auditEvents).length, 1);
  assert.equal(readiness.mode, "agent_leads_live_provider_readiness_v14");
  assert.equal(readiness.rows.some((row) => row.sourceCategory === "public_procurement" && row.status === "ready"), true);
  assert.equal(readiness.rows.some((row) => row.sourceCategory === "public_job_board" && row.status === "missing_consent"), true);
  assert.equal(readiness.status, "missing_consent");
  assert.equal(readiness.executionEnabled, false);
  assert.equal(readiness.liveNetworkRequestsEnabled, false);
  assert.equal(readiness.externalActionsLocked, true);
  assert.equal(health.liveProviderReadiness.mode, "agent_leads_live_provider_readiness_v14");
});

test("Agent OS v15 live public procurement adapter fetches approved public URLs into review queue only", async () => {
  const sourceUrl = "https://city.example/procurement/feed";
  const settings = normalizeAgentLeadsProviderSettings({
    providerId: "approved_public_search",
    mode: "live_locked",
    dailyBudget: 4,
    maxResultsPerRun: 2,
    enabledConnectorIds: ["public_procurement_search"],
    geographyControls: { serviceAreas: ["Salem"] },
    tradeScope: { trades: ["concrete"] },
    reviewRules: { requireHumanOpen: true, dedupeBeforeImport: true },
  });
  const connection = normalizeAgentLeadsProviderConnectionMetadata({
    providerName: "City procurement feed",
    connectorId: "public_procurement_search",
    sourceCategory: "public_procurement",
    sourceUrl,
    reviewedBy: "Owner One",
    acknowledgement: true,
  }, {
    id: "PROVIDER-CONNECTION-V15",
    companyId: "COMPANY-1",
    actorUserId: "OWNER-1",
    now: "2026-05-28T08:00:00.000Z",
  });
  const consent = normalizeAgentLeadsProviderSourceConsent({
    sourceName: "City procurement sources",
    sourceCategory: "public_procurement",
    connectorIds: ["public_procurement_search"],
    authorizedBy: "Owner One",
    acknowledgement: true,
  }, {
    id: "PROVIDER-CONSENT-V15",
    companyId: "COMPANY-1",
    actorUserId: "OWNER-1",
    now: "2026-05-28T08:05:00.000Z",
  });
  const schedule = normalizeAgentLeadsProviderDailySchedule({
    sourceCategories: ["public_procurement"],
    startTimeLocal: "06:00",
    reviewer: "Owner One",
    acknowledgement: true,
  }, {
    id: "PROVIDER-SCHEDULE-V15",
    companyId: "COMPANY-1",
    actorUserId: "OWNER-1",
    now: "2026-05-28T08:10:00.000Z",
  });
  const boundary = normalizeAgentLeadsPlatformProviderBoundary({
    providerName: "City procurement feed",
    providerType: "procurement_feed_api",
    connectorIds: ["public_procurement_search"],
    reviewedBy: "Owner One",
    sourceTermsStatus: "approved",
    robotsStatus: "not_applicable",
    acknowledgement: true,
  }, {
    id: "PLATFORM-BOUNDARY-V15",
    companyId: "COMPANY-1",
    actorUserId: "OWNER-1",
    now: "2026-05-28T08:15:00.000Z",
  });
  const config = normalizeAgentLeadsProcurementFeedAdapterConfig({
    endpointName: "City procurement feed",
    endpointUrl: sourceUrl,
    responseFormat: "json_feed",
    reviewedBy: "Owner One",
    acknowledgement: true,
  }, {
    id: "PROCUREMENT-CONFIG-V15",
    companyId: "COMPANY-1",
    actorUserId: "OWNER-1",
    now: "2026-05-28T08:20:00.000Z",
  });
  const auditEvents = [
    {
      id: "AUDIT-LIVE-APPROVAL-V15",
      action: "agent.os.provider.live_adapter.approve_boundary",
      createdAt: "2026-05-28T07:50:00.000Z",
      detail: JSON.stringify({
        providerApprovalDecision: {
          providerId: "approved_public_search",
          decision: "approve_boundary",
          status: "boundary_approved",
          connectorIds: ["public_procurement_search"],
        },
      }),
    },
    { id: "AUDIT-CONNECTION-V15", action: "agent.os.provider.connection_metadata.recorded", createdAt: "2026-05-28T08:00:00.000Z", detail: JSON.stringify({ providerConnectionMetadata: connection.connection }) },
    { id: "AUDIT-CONSENT-V15", action: "agent.os.provider.source_consent.recorded", createdAt: "2026-05-28T08:05:00.000Z", detail: JSON.stringify({ providerSourceConsent: consent.consent }) },
    { id: "AUDIT-SCHEDULE-V15", action: "agent.os.provider.daily_schedule.recorded", createdAt: "2026-05-28T08:10:00.000Z", detail: JSON.stringify({ providerDailySchedule: schedule.schedule }) },
    { id: "AUDIT-BOUNDARY-V15", action: "agent.os.provider.platform_boundary.recorded", createdAt: "2026-05-28T08:15:00.000Z", detail: JSON.stringify({ platformProviderBoundary: boundary.boundary }) },
    { id: "AUDIT-CONFIG-V15", action: "agent.os.provider.procurement_feed_adapter.config_recorded", createdAt: "2026-05-28T08:20:00.000Z", detail: JSON.stringify({ procurementFeedAdapterConfig: config.config }) },
  ];
  const fetchCalls = [];
  const fetchImpl = async (url, options = {}) => {
    fetchCalls.push({ url, method: options.method, userAgent: options.headers?.["User-Agent"] || "" });
    return new Response("<html><head><title>City bids</title></head><body><a href=\"/bid-42\">BID-2026-42 sidewalk replacement concrete RFP</a></body></html>", {
      status: 200,
      headers: { "content-type": "text/html" },
    });
  };
  const contract = buildAgentLeadsLiveProcurementPublicAdapterContract({ settings, auditEvents, today: "2026-05-28" });
  const execution = await runAgentLeadsLiveProcurementPublicAdapter({
    settings,
    auditEvents,
    companyId: "COMPANY-1",
    actorUserId: "OWNER-1",
    today: "2026-05-28",
    now: "2026-05-28T09:00:00.000Z",
    configId: config.config.id,
    query: "Salem concrete procurement",
    fetchImpl,
    serverGates: { packageEnabled: true, roleAllowed: true, ownerAdminApproved: true },
  });
  const spentAudit = [{
    id: "AUDIT-LIVE-PROCUREMENT-RUN",
    action: "agent.os.provider.live_procurement_public_adapter.review_queue_prepared",
    createdAt: "2026-05-28T09:00:00.000Z",
    detail: JSON.stringify({ liveProcurementPublicAdapterExecution: execution }),
  }];
  const duplicateBlocked = await runAgentLeadsLiveProcurementPublicAdapter({
    settings,
    auditEvents: [...auditEvents, ...spentAudit],
    companyId: "COMPANY-1",
    actorUserId: "OWNER-1",
    today: "2026-05-28",
    now: "2026-05-28T10:00:00.000Z",
    configId: config.config.id,
    query: "Salem concrete procurement",
    fetchImpl,
    serverGates: { packageEnabled: true, roleAllowed: true, ownerAdminApproved: true },
  });

  assert.equal(connection.ok, true);
  assert.equal(connection.connection.sourceUrl, sourceUrl);
  assert.equal(contract.id, "agent_leads_live_procurement_public_adapter_contract_v15");
  assert.equal(contract.status, "ready_locked");
  assert.equal(execution.mode, "agent_leads_live_procurement_public_adapter_v15");
  assert.equal(execution.status, "review_queue_prepared");
  assert.equal(execution.liveNetworkRequestsAllowed, true);
  assert.equal(execution.externalNetworkRequestAttempted, true);
  assert.equal(execution.reviewOnlyExecution, true);
  assert.equal(execution.leadAutoSaveEnabled, false);
  assert.equal(execution.results[0].liveProcurementPublicAdapter, true);
  assert.equal(execution.results[0].projectNumber, "2026-42");
  assert.equal(execution.reviewQueue.count, 1);
  assert.equal(execution.reviewQueue.rows[0].canAutoSave, false);
  assert.equal(fetchCalls.length, 1);
  assert.equal(fetchCalls[0].url, sourceUrl);
  assert.match(fetchCalls[0].userAgent, /ApexHQ-AgentLeads/i);
  assert.equal(duplicateBlocked.status, "blocked");
  assert.match(duplicateBlocked.blockedReasons.join(" "), /Duplicate/i);
});

test("Agent OS v16 daily live procurement adapter selects ready scheduled public procurement sources only", async () => {
  const settings = normalizeAgentLeadsProviderSettings({
    providerId: "approved_public_search",
    mode: "live_locked",
    dailyBudget: 2,
    maxResultsPerRun: 2,
    enabledConnectorIds: ["public_procurement_search"],
    geographyControls: { serviceAreas: ["Salem"] },
    tradeScope: { trades: ["concrete"] },
    reviewRules: { requireHumanOpen: true, dedupeBeforeImport: true, minFitScoreForReview: 40 },
  });
  const sourceUrl = "https://procurement.example.gov/open-bids";
  const connection = normalizeAgentLeadsProviderConnectionMetadata({
    providerName: "City bids",
    sourceCategory: "public_procurement",
    connectorId: "public_procurement_search",
    sourceUrl,
    reviewedBy: "Owner",
    acknowledgement: true,
  }, { companyId: "COMPANY-1", actorUserId: "OWNER-1", now: "2026-05-28T08:00:00.000Z" });
  const consent = normalizeAgentLeadsProviderSourceConsent({
    sourceName: "City bids",
    sourceCategory: "public_procurement",
    connectorIds: ["public_procurement_search"],
    authorizedBy: "Owner",
    acknowledgement: true,
  }, { companyId: "COMPANY-1", actorUserId: "OWNER-1", now: "2026-05-28T08:05:00.000Z" });
  const schedule = normalizeAgentLeadsProviderDailySchedule({
    sourceCategories: ["public_procurement"],
    startTimeLocal: "06:00",
    reviewer: "Owner",
    acknowledgement: true,
  }, { companyId: "COMPANY-1", actorUserId: "OWNER-1", now: "2026-05-28T08:10:00.000Z" });
  const boundary = normalizeAgentLeadsPlatformProviderBoundary({
    providerName: "City procurement API",
    providerType: "procurement_feed_api",
    connectorIds: ["public_procurement_search"],
    allowedOperations: ["search_read", "listing_read", "review_queue_prepare"],
    sourceTermsStatus: "approved",
    robotsStatus: "allowed",
    reviewedBy: "Owner",
    acknowledgement: true,
  }, { companyId: "COMPANY-1", actorUserId: "OWNER-1", now: "2026-05-28T08:15:00.000Z" });
  const config = normalizeAgentLeadsProcurementFeedAdapterConfig({
    endpointName: "City bids",
    endpointUrl: sourceUrl,
    responseFormat: "html",
    reviewedBy: "Owner",
    acknowledgement: true,
  }, { companyId: "COMPANY-1", actorUserId: "OWNER-1", now: "2026-05-28T08:20:00.000Z" });
  const auditEvents = [
    {
      id: "AUDIT-LIVE-APPROVAL-V16",
      action: "agent.os.provider.live_adapter.approve_boundary",
      createdAt: "2026-05-28T07:50:00.000Z",
      detail: JSON.stringify({
        providerApprovalDecision: {
          providerId: "approved_public_search",
          decision: "approve_boundary",
          status: "boundary_approved",
          connectorIds: ["public_procurement_search"],
        },
      }),
    },
    { id: "AUDIT-CONNECTION-V16", action: "agent.os.provider.connection_metadata.recorded", createdAt: "2026-05-28T08:00:00.000Z", detail: JSON.stringify({ providerConnectionMetadata: connection.connection }) },
    { id: "AUDIT-CONSENT-V16", action: "agent.os.provider.source_consent.recorded", createdAt: "2026-05-28T08:05:00.000Z", detail: JSON.stringify({ providerSourceConsent: consent.consent }) },
    { id: "AUDIT-SCHEDULE-V16", action: "agent.os.provider.daily_schedule.recorded", createdAt: "2026-05-28T08:10:00.000Z", detail: JSON.stringify({ providerDailySchedule: schedule.schedule }) },
    { id: "AUDIT-BOUNDARY-V16", action: "agent.os.provider.platform_boundary.recorded", createdAt: "2026-05-28T08:15:00.000Z", detail: JSON.stringify({ platformProviderBoundary: boundary.boundary }) },
    { id: "AUDIT-CONFIG-V16", action: "agent.os.provider.procurement_feed_adapter.config_recorded", createdAt: "2026-05-28T08:20:00.000Z", detail: JSON.stringify({ procurementFeedAdapterConfig: config.config }) },
  ];
  const fetchCalls = [];
  const fetchImpl = async (url, options = {}) => {
    fetchCalls.push({ url, method: options.method });
    return new Response("<html><body><a href=\"/bid-99\">BID-2026-99 curb ramp concrete RFP</a></body></html>", {
      status: 200,
      headers: { "content-type": "text/html" },
    });
  };
  const execution = await runAgentLeadsDailyLiveProcurementPublicAdapter({
    settings,
    auditEvents,
    companyId: "COMPANY-1",
    actorUserId: "OWNER-1",
    today: "2026-05-28",
    now: "2026-05-28T09:00:00.000Z",
    query: "Salem concrete procurement",
    fetchImpl,
    serverGates: { packageEnabled: true, roleAllowed: true, ownerAdminApproved: true },
  });
  const duplicateBlocked = await runAgentLeadsDailyLiveProcurementPublicAdapter({
    settings,
    auditEvents: [...auditEvents, {
      id: "AUDIT-DAILY-LIVE-PROCUREMENT-RUN",
      action: "agent.os.provider.live_procurement_public_adapter.daily_review_queue_prepared",
      createdAt: "2026-05-28T09:00:00.000Z",
      detail: JSON.stringify({ dailyLiveProcurementPublicAdapterExecution: execution }),
    }],
    companyId: "COMPANY-1",
    actorUserId: "OWNER-1",
    today: "2026-05-28",
    now: "2026-05-28T10:00:00.000Z",
    query: "Salem concrete procurement",
    fetchImpl,
    serverGates: { packageEnabled: true, roleAllowed: true, ownerAdminApproved: true },
  });

  assert.equal(execution.mode, "agent_leads_daily_live_procurement_public_adapter_v16");
  assert.equal(execution.status, "review_queue_prepared");
  assert.equal(execution.safeForCron, true);
  assert.equal(execution.externalActionsLocked, true);
  assert.equal(execution.leadAutoSaveEnabled, false);
  assert.equal(execution.reviewQueue.count, 1);
  assert.equal(execution.results[0].dailyLiveProcurementPublicAdapter, true);
  assert.equal(execution.liveProcurementPublicAdapterExecution.mode, "agent_leads_live_procurement_public_adapter_v15");
  assert.equal(fetchCalls.length, 1);
  assert.equal(fetchCalls[0].url, sourceUrl);
  assert.equal(duplicateBlocked.status, "blocked");
  assert.match(duplicateBlocked.blockedReasons.join(" "), /Duplicate|schedule run limit/i);
  assert.equal(fetchCalls.length, 1);
});

test("Agent OS v17 all-source adapter coverage completes review-first public and private source map", () => {
  const settings = normalizeAgentLeadsProviderSettings({
    providerId: "approved_public_search",
    mode: "live_locked",
    dailyBudget: 10,
    maxResultsPerRun: 2,
    enabledConnectorIds: ["public_web_search", "public_procurement_search", "public_classifieds_search", "public_plan_room_search", "public_social_search"],
    geographyControls: { serviceAreas: ["Salem"] },
    tradeScope: { trades: ["concrete"] },
    credentialBoundary: { mode: "oauth_reference_only", credentialRef: "credref-social-planroom" },
  });
  const coverage = buildAgentLeadsAllSourceAdapterCoverage({
    settings,
    auditEvents: [],
    today: "2026-05-28",
    now: "2026-05-28T12:00:00.000Z",
  });
  const officialContract = buildAgentLeadsOfficialProviderApiAdapterContract({ settings, auditEvents: [], today: "2026-05-28" });
  const socialCoverage = coverage.connectorCoverage.find((row) => row.id === "public_social_search");
  const planRoomCoverage = coverage.connectorCoverage.find((row) => row.id === "public_plan_room_search");
  const classifiedsCoverage = coverage.connectorCoverage.find((row) => row.id === "public_classifieds_search");

  assert.equal(coverage.mode, "agent_leads_all_source_adapter_coverage_v17");
  assert.equal(coverage.status, "complete_review_first_coverage");
  assert.equal(coverage.implementationComplete, true);
  assert.equal(coverage.externalActionsLocked, true);
  assert.equal(coverage.leadAutoSaveEnabled, false);
  assert.equal(coverage.privateSourceCoverage.every((row) => row.implementationStatus === "implemented_human_handoff"), true);
  assert.equal(socialCoverage.officialApiHarnessImplemented, true);
  assert.equal(socialCoverage.loginAutomationEnabled, false);
  assert.equal(planRoomCoverage.officialApiHarnessImplemented, true);
  assert.equal(classifiedsCoverage.liveNoLoginFetchImplemented, true);
  assert.equal(officialContract.adapters.some((adapter) => adapter.id === "official_social_platform_api_sandbox"), true);
  assert.equal(officialContract.adapters.some((adapter) => adapter.id === "official_marketplace_api_sandbox"), true);
  assert.match(coverage.lockedByDesign.join(" "), /unattended private-source login/i);
});

test("Agent OS v18 daily job finder orchestrates public review queue and private handoff checklist", async () => {
  const settings = normalizeAgentLeadsProviderSettings({
    providerId: "approved_public_search",
    mode: "live_locked",
    dailyBudget: 4,
    maxResultsPerRun: 2,
    enabledConnectorIds: ["public_web_search", "public_classifieds_search", "public_plan_room_search"],
    geographyControls: { serviceAreas: ["Salem"] },
    tradeScope: { trades: ["concrete"] },
    credentialBoundary: { mode: "oauth_reference_only", credentialRef: "credref-planroom" },
  });
  const authorization = normalizeAgentLeadsPrivateSourceAuthorization({
    sourceName: "Facebook group",
    sourceType: "facebook_private_group",
    sourceAdapterId: "facebook_private_group",
    authorizedBy: "Owner",
    acknowledgement: true,
  }, {
    id: "PRIVATE-AUTH-V18",
    companyId: "COMPANY-1",
    actorUserId: "OWNER-1",
    now: "2026-05-28T07:00:00.000Z",
  });
  const auditEvents = [
    {
      id: "AUDIT-LIVE-APPROVAL-V18",
      action: "agent.os.provider.live_adapter.approve_boundary",
      createdAt: "2026-05-28T07:30:00.000Z",
      detail: JSON.stringify({
        providerApprovalDecision: {
          providerId: "approved_public_search",
          decision: "approve_boundary",
          status: "boundary_approved",
          connectorIds: ["public_web_search", "public_classifieds_search"],
        },
      }),
    },
    {
      id: "AUDIT-PRIVATE-AUTH-V18",
      action: "agent.os.provider.private_source.authorization_recorded",
      createdAt: "2026-05-28T07:00:00.000Z",
      detail: JSON.stringify({ privateSourceAuthorization: authorization.authorization }),
    },
  ];
  const dailyScoutExecutionPlan = {
    publicRunnerCards: [{
      id: "public-card-v18",
      type: "public_source_runner",
      targetKind: "search_profile",
      targetId: "OSP-V18",
      title: "Local board",
      query: "Salem concrete repair",
      sourceConnector: { id: "craigslist_local_board", label: "Craigslist/local board", category: "public", posture: "review_card" },
      controls: { trades: ["concrete"], serviceAreas: ["Salem"], excludedKeywords: [] },
      searchUrls: [{ label: "Local board", url: "https://classifieds.example/jobs" }],
    }],
    privateHandoffCards: [{
      id: "private-card-v18",
      type: "private_source_handoff",
      title: "Facebook group",
      sourceConnector: { id: "facebook_private_group", category: "private_social" },
    }],
  };
  const fetchCalls = [];
  const fetchImpl = async (url, init) => {
    fetchCalls.push({ url, method: init?.method });
    return {
      status: 200,
      headers: { get: (name) => (name.toLowerCase() === "content-type" ? "text/html" : "") },
      text: async () => "<html><head><title>Local jobs</title></head><body><a href=\"/patio-repair\">Concrete patio repair needed</a></body></html>",
    };
  };
  const execution = await runAgentLeadsDailyJobFinderOrchestration({
    settings,
    auditEvents,
    dailyScoutExecutionPlan,
    companyId: "COMPANY-1",
    actorUserId: "OWNER-1",
    today: "2026-05-28",
    now: "2026-05-28T09:00:00.000Z",
    connectorIds: ["public_classifieds_search", "public_plan_room_search"],
    serverGates: { packageEnabled: true, roleAllowed: true, ownerAdminApproved: true },
    fetchImpl,
  });
  const duplicateBlocked = await runAgentLeadsDailyJobFinderOrchestration({
    settings,
    auditEvents: [...auditEvents, {
      id: "AUDIT-DAILY-JOB-FINDER-V18",
      action: "agent.os.provider.daily_job_finder.orchestration_prepared",
      createdAt: "2026-05-28T09:00:00.000Z",
      detail: JSON.stringify({ dailyJobFinderOrchestrationExecution: execution }),
    }],
    dailyScoutExecutionPlan,
    companyId: "COMPANY-1",
    actorUserId: "OWNER-1",
    today: "2026-05-28",
    now: "2026-05-28T10:00:00.000Z",
    connectorIds: ["public_classifieds_search"],
    serverGates: { packageEnabled: true, roleAllowed: true, ownerAdminApproved: true },
    fetchImpl,
  });

  assert.equal(execution.mode, "agent_leads_daily_job_finder_orchestration_v18");
  assert.equal(execution.status, "review_queue_prepared");
  assert.deepEqual(execution.selectedNoLoginConnectorIds, ["public_classifieds_search"]);
  assert.equal(execution.privateSourceChecklist.count >= 1, true);
  assert.equal(execution.reviewQueue.count, 1);
  assert.equal(execution.reviewQueue.rows[0].canAutoSave, false);
  assert.equal(execution.externalActionsLocked, true);
  assert.equal(execution.leadAutoSaveEnabled, false);
  assert.equal(execution.safeForCron, true);
  assert.equal(fetchCalls.length, 1);
  assert.equal(fetchCalls[0].method, "GET");
  assert.equal(duplicateBlocked.status, "blocked");
  assert.match(duplicateBlocked.blockedReasons.join(" "), /already ran today/i);
});

test("Agent OS v19 daily job finder autopilot respects company schedule and builds review inbox history", async () => {
  const settings = normalizeAgentLeadsProviderSettings({
    providerId: "approved_public_search",
    mode: "live_locked",
    dailyBudget: 4,
    maxResultsPerRun: 2,
    enabledConnectorIds: ["public_classifieds_search", "public_plan_room_search"],
    geographyControls: { serviceAreas: ["Salem"], radiusMiles: 25 },
    tradeScope: { trades: ["concrete"], projectTypes: ["flatwork"] },
    credentialBoundary: { mode: "oauth_reference_only", credentialRef: "credref-plan-room" },
    dailyJobFinderAutopilot: {
      enabled: true,
      runTimeLocal: "06:00",
      markets: ["Salem"],
      trades: ["concrete"],
      publicSourceConnectorIds: ["public_classifieds_search", "public_plan_room_search"],
    },
  });
  const dailyScoutExecutionPlan = {
    publicRunnerCards: [{
      id: "public-card-v19",
      type: "public_source_runner",
      targetKind: "search_profile",
      targetId: "OSP-V19",
      title: "Local board",
      query: "Salem concrete repair",
      sourceConnector: { id: "craigslist_local_board", label: "Craigslist/local board", category: "public", posture: "review_card" },
      controls: { trades: ["concrete"], serviceAreas: ["Salem"], excludedKeywords: [] },
      searchUrls: [{ label: "Local board", url: "https://classifieds.example/jobs" }],
    }],
    privateHandoffCards: [{
      id: "private-card-v19",
      type: "private_source_handoff",
      title: "Private Facebook group",
      sourceConnector: { id: "facebook_private_group", category: "private_social" },
    }],
  };
  const auditEvents = [{
    id: "AUDIT-LIVE-APPROVAL-V19",
    action: "agent.os.provider.live_adapter.approve_boundary",
    createdAt: "2026-05-28T05:00:00.000Z",
    detail: JSON.stringify({
      providerApprovalDecision: {
        providerId: "approved_public_search",
        decision: "approve_boundary",
        status: "boundary_approved",
        connectorIds: ["public_classifieds_search"],
      },
    }),
  }];
  const fetchCalls = [];
  const fetchImpl = async (url, init) => {
    fetchCalls.push({ url, method: init?.method });
    return {
      status: 200,
      headers: { get: (name) => (name.toLowerCase() === "content-type" ? "text/html" : "") },
      text: async () => "<html><body><a href=\"/driveway\">Concrete driveway repair request</a></body></html>",
    };
  };
  const early = await runAgentLeadsDailyJobFinderAutopilot({
    settings,
    auditEvents,
    dailyScoutExecutionPlan,
    companyId: "COMPANY-1",
    actorUserId: "OWNER-1",
    today: "2026-05-28",
    now: "2026-05-28T05:30:00.000Z",
    serverGates: { packageEnabled: true, roleAllowed: true, ownerAdminApproved: true },
    fetchImpl,
  });
  const run = await runAgentLeadsDailyJobFinderAutopilot({
    settings,
    auditEvents,
    dailyScoutExecutionPlan,
    companyId: "COMPANY-1",
    actorUserId: "OWNER-1",
    today: "2026-05-28",
    now: "2026-05-28T06:30:00.000Z",
    serverGates: { packageEnabled: true, roleAllowed: true, ownerAdminApproved: true },
    fetchImpl,
  });
  const duplicate = await runAgentLeadsDailyJobFinderAutopilot({
    settings,
    auditEvents: [...auditEvents, {
      id: "AUDIT-DAILY-AUTOPILOT-V19",
      action: "agent.os.provider.daily_job_finder.autopilot.succeeded",
      createdAt: "2026-05-28T06:30:00.000Z",
      detail: JSON.stringify({ dailyJobFinderAutopilotRun: run }),
    }],
    dailyScoutExecutionPlan,
    companyId: "COMPANY-1",
    actorUserId: "OWNER-1",
    today: "2026-05-28",
    now: "2026-05-28T07:30:00.000Z",
    serverGates: { packageEnabled: true, roleAllowed: true, ownerAdminApproved: true },
    fetchImpl,
  });

  assert.equal(early.status, "blocked");
  assert.match(early.blockedReasons.join(" "), /has not opened/i);
  assert.equal(run.mode, "agent_leads_daily_job_finder_autopilot_v21");
  assert.equal(run.status, "review_inbox_prepared");
  assert.equal(run.settings.enabled, true);
  assert.deepEqual(run.orchestration.selectedNoLoginConnectorIds, ["public_classifieds_search"]);
  assert.equal(run.reviewInbox.count, 1);
  assert.equal(run.reviewInbox.rows[0].inboxStatus, "needs_human_review");
  assert.equal(run.reviewInbox.providerReviewLearningSnapshot.mode, "agent_leads_provider_review_learning_snapshot_v21");
  assert.equal(run.reviewInbox.dailyReviewWorkflow.mode, "agent_leads_daily_review_workflow_v21");
  assert.equal(run.runHistoryRecord.providerResultCount, 1);
  assert.equal(run.queuedTaskPayload.actionId, "opportunity_search_prep");
  assert.equal(run.safeForCron, true);
  assert.equal(run.leadAutoSaveEnabled, false);
  assert.equal(run.customerContactEnabled, false);
  assert.equal(fetchCalls.length, 1);
  assert.equal(duplicate.status, "blocked");
  assert.match(duplicate.blockedReasons.join(" "), /already ran today/i);
});

test("Agent OS provider simulator rejects unsafe URLs before import cards", () => {
  const plan = buildAgentOsOpportunityScoutExecutionPlan({
    today: "2026-05-27",
    companySettings: { serviceArea: "Salem Oregon" },
    opportunitySearchProfiles: [{
      id: "OSP-UNSAFE",
      name: "Unsafe public search",
      status: "active",
      cadence: "daily",
      trades: ["concrete"],
      serviceAreas: ["Salem"],
      sourceTypes: ["Public bid portal"],
      sourceAdapterId: "public_web",
      sourceTermsStatus: "public_allowed",
      keywords: ["unsafe"],
      nextRunAt: "2026-05-27",
    }],
  });

  assert.equal(plan.rejectedProviderResults.length >= 1, true);
  assert.equal(plan.rejectedProviderResults.some((result) => result.reason === "secret_like_query" || result.reason === "login_or_account_path"), true);
  assert.equal(plan.publicDiscoveryQueue.every((card) => !/token=secret|login/i.test(card.sourceUrl)), true);
  assert.equal(plan.dailyRunRecord.providerRejectedCount, plan.rejectedProviderResults.length);
});

test("Agent OS keeps private social sources handoff-only while public local boards can be reviewed", () => {
  const plan = buildAgentOsOpportunityScoutExecutionPlan({
    today: "2026-05-27",
    companySettings: { serviceArea: "Salem Oregon" },
    opportunitySearchProfiles: [
      {
        id: "OSP-FB-GROUP",
        name: "Facebook private group scan",
        status: "active",
        cadence: "daily",
        sourceAdapterId: "facebook_private_group",
        sourceAuthorizationStatus: "needs_authorization",
        nextRunAt: "2026-05-27",
      },
      {
        id: "OSP-LOCAL-BOARD",
        name: "Craigslist concrete jobs",
        status: "active",
        cadence: "daily",
        sourceTypes: ["Craigslist/local board"],
        sourceAdapterId: "craigslist_local_board",
        sourceTermsStatus: "public_allowed",
        nextRunAt: "2026-05-27",
      },
    ],
  });

  const privateCard = plan.privateHandoffCards.find((card) => card.targetId === "OSP-FB-GROUP");
  const publicCard = plan.publicRunnerCards.find((card) => card.targetId === "OSP-LOCAL-BOARD");
  assert.equal(Boolean(privateCard), true);
  assert.equal(privateCard.searchUrls.length, 0);
  assert.equal(privateCard.sourceConnector.category, "private_social");
  assert.match(privateCard.safetyBoundary, /does not log in/i);
  assert.equal(Boolean(publicCard), true);
  assert.equal(publicCard.sourceConnector.category, "public_social");
  assert.equal(publicCard.searchUrls.length > 0, true);
  assert.equal(publicCard.searchUrls.some((entry) => entry.label === "Craigslist public search"), true);
  assert.equal(plan.publicDiscoveryQueue.some((card) => card.parentCardId === publicCard.id), true);
  assert.equal(plan.publicDiscoveryQueue.every((card) => card.sourceUrl && card.fitScore >= 0), true);
  assert.equal(plan.publicDiscoveryQueue.every((card) => card.allowedActions.includes("Open public source")), true);
  assert.match(publicCard.blockedActions.join(" "), /No customer\/source contact/i);
});

test("Agent OS learning signals cover accepted edits, rejected drafts, estimates, closeouts, follow-ups, and preferences", () => {
  const signals = deriveAgentOsLearningSignals({
    estimates: [
      { id: "EST-WON", status: "approved", updatedAt: "2026-05-27T08:00:00.000Z" },
      { id: "EST-LOST", status: "lost", updatedAt: "2026-05-27T08:01:00.000Z" },
    ],
    jobs: [{ id: "JOB-1", status: "billing_ready", updatedAt: "2026-05-27T08:02:00.000Z" }],
    contactHistory: [{ id: "CONTACT-1", outcome: "Follow-up scheduled", createdAt: "2026-05-27T08:03:00.000Z" }],
    agentLearningPreferences: [{ id: "PREF-1", title: "Proof photos", status: "approved" }],
    auditEvents: [
      { action: "agent.proposal.draft_created", createdAt: "2026-05-27T08:04:00.000Z" },
      { action: "agent.proposal.rejected", createdAt: "2026-05-27T08:05:00.000Z" },
    ],
  });

  assert.equal(signals.activeSignalCount, 7);
  assert.equal(signals.rows.every((row) => row.companyScoped), true);
  assert.equal(signals.rows.find((row) => row.id === "won_estimate").count, 1);
  assert.equal(signals.rows.find((row) => row.id === "rejected_draft").count, 1);
  assert.match(signals.safetyBoundary, /review-first/i);
});

test("Agent OS summary derives durable ledger rows from audit events", () => {
  const auditEvents = [{
    id: "AUDIT-1",
    companyId: "COMPANY-1",
    entityType: "agentOsRun",
    action: "agent.os.task.queued",
    summary: "Queued",
    createdAt: "2026-05-27T08:00:00.000Z",
    detail: JSON.stringify({
      task: { id: "TASK-1", actionId: "lead_follow_up_draft", status: "queued" },
      run: { id: "RUN-1", actionId: "lead_follow_up_draft", status: "queued" },
      reviewCardCount: 3,
      publicRunnerCardCount: 2,
      privateHandoffCardCount: 1,
      foundDraftCardCount: 0,
    }),
  }];
  const ledger = deriveAgentOsLedgerFromAuditEvents(auditEvents);
  const summary = buildAgentOsSummary({ auditEvents });

  assert.equal(ledger.rows.length, 1);
  assert.equal(ledger.queuedCount, 1);
  assert.equal(ledger.reviewCardCount, 3);
  assert.equal(ledger.publicRunnerCardCount, 2);
  assert.equal(summary.version, "apex-agent-os-v1");
  assert.equal(summary.ledger.rows[0].runId, "RUN-1");
  assert.equal(summary.publicLeadProviderContract.id, "agent_leads_public_provider_contract_v6");
  assert.equal(summary.publicLeadProviderContract.liveSearchEnabled, false);
  assert.equal(summary.approvedPublicLeadProviderConnectors.every((connector) => connector.executionEnabled === false), true);
  assert.equal(summary.operatorControlPanel.mode, "agent_os_operator_control_panel_v1");
  assert.equal(summary.operatorControlPanel.stats.externalLockedCount, 7);
  assert.ok(summary.operatorControlPanel.actionRollbackRows.some((row) => row.actionId === "lead_follow_up_draft"));
  assert.match(summary.safetyBoundary, /External gate boundaries/);
});

test("Agent OS operator control panel exposes rollback, idempotency, learning, and run controls", () => {
  const ledger = deriveAgentOsLedgerFromAuditEvents([{
    id: "AUDIT-DEAD",
    companyId: "COMPANY-1",
    entityType: "agentOsRun",
    action: "agent.os.run.dead_lettered",
    summary: "Dead-lettered",
    createdAt: "2026-05-27T08:00:00.000Z",
    detail: JSON.stringify({
      task: { id: "TASK-DELIVERY", actionId: "delivery_ticket_review", status: "dead_lettered" },
      run: { id: "RUN-DELIVERY", actionId: "delivery_ticket_review", status: "dead_lettered" },
    }),
  }]);
  const learningSignals = deriveAgentOsLearningSignals({
    jobs: [{ id: "JOB-1", status: "completed", updatedAt: "2026-05-27T08:00:00.000Z" }],
  });
  const panel = buildAgentOsOperatorControlPanel({ ledger, learningSignals });

  assert.equal(panel.status, "needs_operator_review");
  assert.equal(panel.stats.deadLetterCount, 1);
  assert.ok(panel.actionRollbackRows.some((row) => row.actionId === "delivery_ticket_review" && row.idempotencyKeyFields.includes("deliveryTicketId")));
  assert.match(panel.actionRollbackRows.find((row) => row.actionId === "safety_incident_summary").rollbackBehavior, /no incident resolution/i);
  assert.equal(panel.externalGateRows.every((row) => row.executionEnabled === false), true);
  assert.ok(panel.learningRows.some((row) => row.id === "closeout_outcome" && row.count === 1));
  assert.match(panel.safetyBoundary, /retry\/dead-letter\/cancel/i);
});

test("Agent OS executes expanded internal contractor workflow packets without domain mutation", () => {
  const normalized = normalizeAgentOsTask({
    actionId: "pre_pour_review",
    target: { entityType: "prePourChecklist", entityId: "PRE-1", title: "Driveway pre-pour" },
  }, {
    id: "TASK-PREPOUR",
    companyId: "COMPANY-1",
    actorUserId: "USER-1",
    now: "2026-05-27T08:00:00.000Z",
  });
  const packet = buildAgentOsInternalDraftPacket(normalized.task, {
    workspace: { prePourChecklists: [{ id: "PRE-1", title: "Driveway pre-pour" }] },
    now: "2026-05-27T08:01:00.000Z",
  });

  assert.equal(normalized.ok, true);
  assert.equal(normalized.task.inputs.prePourChecklistId, "PRE-1");
  assert.match(normalized.task.idempotencyKey, /company-1:pre_pour_review:pre-1/i);
  assert.equal(packet.ok, true);
  assert.equal(packet.agentProposal.proposalType, "workflow-draft-prep");
  assert.match(packet.agentProposal.draftPrepSummary[0].fieldPreview[1].currentValue, /No checklist completion/);
  assert.match(packet.agentProposal.blockedReasons.join(" "), /No bid submission/);
});

test("Agent OS builds executable internal draft packets while keeping external gate execution disabled", () => {
  const normalized = normalizeAgentOsTask({
    actionId: "change_order_draft",
    target: { entityType: "job", entityId: "JOB-1", title: "Driveway pour" },
  }, {
    id: "TASK-CHANGE",
    companyId: "COMPANY-1",
    actorUserId: "USER-1",
    now: "2026-05-27T08:00:00.000Z",
  });
  const packet = buildAgentOsInternalDraftPacket(normalized.task, {
    workspace: { jobs: [{ id: "JOB-1", title: "Driveway pour" }] },
    now: "2026-05-27T08:01:00.000Z",
  });
  const plans = listAgentOsExternalGateApprovalPlans();

  assert.equal(packet.ok, true);
  assert.equal(packet.agentProposal.proposalType, "change-order-review");
  assert.match(packet.agentProposal.blockedReasons.join(" "), /No customer email/i);
  assert.match(packet.agentProposal.draftPrepSummary[0].fieldPreview[1].currentValue, /No pricing/);
  assert.equal(plans.length, listAgentOsExternalGates().length);
  assert.equal(plans.every((plan) => plan.status === "boundary_approved" && plan.executionEnabled === false), true);
  assert.match(getAgentOsExternalGateApprovalPlan("payment_collection").approvedBoundary, /sandbox strategy/i);
});

test("Agent OS external gate decision packets capture approved boundaries without enabling execution", () => {
  const packet = buildAgentOsExternalGateDecisionPacket("bid_submission", {
    companyId: "COMPANY-1",
    actorUserId: "USER-1",
    now: "2026-05-27T09:00:00.000Z",
  });

  assert.equal(packet.ok, true);
  assert.equal(packet.gate.status, "boundary_approved");
  assert.equal(packet.gate.executionEnabled, false);
  assert.equal(packet.gate.companyId, "COMPANY-1");
  assert.match(packet.gate.approvedBoundary, /destination verification/i);
  assert.match(packet.gate.executionLock, /destination-specific adapter/i);
  assert.match(packet.requiredBeforeExecution.join(" "), /Per-company opt-in/i);
  assert.match(packet.safetyBoundary, /No customer contact, payment, portal write, schedule mutation, bid submission, or integration write occurs/i);

  const unknown = buildAgentOsExternalGateDecisionPacket("unknown_gate");
  assert.equal(unknown.ok, false);
});

test("Agent OS external gate settings require explicit human-confirmed company opt-in", () => {
  const settings = normalizeAgentOsExternalGateSettings({
    email_send: {
      enabled: true,
      mode: "human_confirmed",
      allowedWorkflow: "estimate_send",
      testOnly: false,
      updatedAt: "2026-05-27T10:00:00.000Z",
    },
    sms_send: {
      enabled: true,
      mode: "disabled",
    },
  });
  const gates = listAgentOsExternalGates({ externalGateSettings: settings });
  const emailPacket = buildAgentOsExternalGateDecisionPacket("email_send", {
    externalGateSettings: settings,
    companyId: "COMPANY-1",
  });

  assert.equal(settings.email_send.enabled, true);
  assert.equal(settings.email_send.mode, "human_confirmed");
  assert.equal(settings.email_send.allowedWorkflow, "estimate_send");
  assert.equal(settings.email_send.testOnly, false);
  assert.equal(settings.sms_send.enabled, false);
  assert.equal(gates.find((gate) => gate.id === "email_send").executionEnabled, true);
  assert.equal(gates.find((gate) => gate.id === "sms_send").executionEnabled, false);
  assert.equal(emailPacket.gate.executionEnabled, true);
  assert.equal(emailPacket.adapterReadiness.executionEnabled, false);
  assert.match(emailPacket.safetyBoundary, /does not execute by itself/i);
});

test("Agent OS external gate adapter readiness records evidence without enabling execution", () => {
  const readiness = deriveAgentOsExternalGateAdapterReadiness({
    externalGateSettings: {
      email_send: {
        enabled: true,
        mode: "human_confirmed",
        allowedWorkflow: "estimate_send",
        testOnly: false,
      },
    },
    evidence: {
      email_send: {
        domainAdapter: true,
        companyOptIn: true,
        humanConfirmation: true,
        idempotency: true,
        audit: true,
        rollback: true,
        tenantRolePackageTests: true,
        providerSandboxOrTestStrategy: true,
      },
    },
  });
  const email = readiness.find((row) => row.gateId === "email_send");
  const payment = readiness.find((row) => row.gateId === "payment_collection");

  assert.deepEqual(readiness.map((row) => row.gateId), [
    "email_send",
    "sms_send",
    "payment_collection",
    "customer_portal_action",
    "scheduling",
    "bid_submission",
    "integration_write",
  ]);
  assert.equal(readiness.every((row) => row.executionEnabled === false), true);
  assert.equal(readiness.every((row) => row.normalHumanConfirmationRequired === true), true);
  assert.equal(email.companyGateConfigured, true);
  assert.equal(email.status, "ready_for_human_confirmed_adapter_review");
  assert.equal(email.missingEvidenceIds.length, 0);
  assert.equal(payment.companyGateConfigured, false);
  assert.equal(payment.status, "needs_adapter_evidence");
  assert.match(payment.safetyBoundary, /never sends, collects payment, writes portal\/schedule\/integration data, submits bids/i);
  assert.equal(readiness.every((row) => row.requiredBeforeExecution.includes("Human confirmation that names the visible effect")), true);
});

test("Agent OS scheduling gate readiness detects conflicts and keeps schedule mutation locked", () => {
  const packet = buildAgentSchedulingMutationGateReadinessPacket({
    companyId: "COMPANY-1",
    actorUserId: "USER-1",
    job: {
      id: "JOB-1",
      companyId: "COMPANY-1",
      title: "Driveway pour",
      scheduledStart: "2026-06-01T08:00:00.000Z",
      scheduledEnd: "2026-06-01T12:00:00.000Z",
      crewId: "CREW-1",
      crewName: "Crew A",
      status: "scheduled",
    },
    proposedSchedule: {
      scheduledStart: "2026-06-02T08:00:00.000Z",
      scheduledEnd: "2026-06-02T12:00:00.000Z",
      crewId: "CREW-1",
      crewName: "Crew A",
      humanReviewConfirmed: true,
      approvedScheduleBoundary: true,
      notificationPolicy: {
        crewNotificationReviewed: true,
        customerNotificationReviewed: true,
        fieldVisibilityReviewed: true,
        notifyCrew: false,
        notifyCustomer: false,
        fieldVisibleAfterSave: false,
      },
    },
    existingJobs: [{
      id: "JOB-2",
      companyId: "COMPANY-1",
      title: "Patio prep",
      scheduledStart: "2026-06-02T09:00:00.000Z",
      scheduledEnd: "2026-06-02T11:00:00.000Z",
      crewId: "CREW-1",
      crewName: "Crew A",
    }],
    externalGateSettings: {
      scheduling: {
        enabled: true,
        mode: "human_confirmed",
        allowedWorkflow: "schedule_job",
        testOnly: false,
      },
    },
    adapterEvidence: {
      scheduling: {
        domainAdapter: true,
        companyOptIn: true,
        humanConfirmation: true,
        idempotency: true,
        audit: true,
        rollback: true,
        tenantRolePackageTests: true,
        providerSandboxOrTestStrategy: true,
      },
    },
    now: "2026-05-29T12:00:00.000Z",
  });

  assert.equal(packet.mode, "agent_scheduling_mutation_gate_readiness_v1");
  assert.equal(packet.status, "blocked_locked");
  assert.equal(packet.conflictRows.length, 1);
  assert.match(packet.blockers.join(" "), /conflict/i);
  assert.equal(packet.notificationPolicyReview.status, "reviewed");
  assert.equal(packet.adapterReadiness.status, "ready_for_human_confirmed_adapter_review");
  assert.deepEqual(packet.restoreAuditPlan.restoreFields, ["scheduledStart", "scheduledEnd", "crewId", "crewName", "status"]);
  assert.equal(packet.scheduleMutationPrepared, false);
  assert.equal(packet.scheduleMutationApplied, false);
  assert.equal(packet.canMutateSchedule, false);
  assert.match(packet.safetyBoundary, /No schedule, crew assignment, field visibility, customer notification/i);
});

test("Agent OS scheduling gate readiness can be review-ready but still cannot mutate schedules", () => {
  const packet = buildAgentSchedulingMutationGateReadinessPacket({
    companyId: "COMPANY-1",
    actorUserId: "USER-1",
    job: { id: "JOB-1", companyId: "COMPANY-1", scheduledStart: "2026-06-01T08:00:00.000Z", scheduledEnd: "2026-06-01T12:00:00.000Z" },
    proposedSchedule: {
      scheduledStart: "2026-06-02T08:00:00.000Z",
      scheduledEnd: "2026-06-02T12:00:00.000Z",
      humanReviewConfirmed: true,
      approvedScheduleBoundary: true,
      conflictOverrideAcknowledged: true,
      notificationPolicy: {
        crewNotificationReviewed: true,
        customerNotificationReviewed: true,
        fieldVisibilityReviewed: true,
      },
    },
    externalGateSettings: {
      scheduling: {
        enabled: true,
        mode: "human_confirmed",
        allowedWorkflow: "schedule_job",
        testOnly: false,
      },
    },
    adapterEvidence: {
      scheduling: {
        domainAdapter: true,
        companyOptIn: true,
        humanConfirmation: true,
        idempotency: true,
        audit: true,
        rollback: true,
        tenantRolePackageTests: true,
        providerSandboxOrTestStrategy: true,
      },
    },
  });

  assert.equal(packet.status, "ready_for_human_confirmed_schedule_review_locked");
  assert.equal(packet.blockers.length, 0);
  assert.equal(packet.externalScheduleMutationEnabled, false);
  assert.equal(packet.canMutateSchedule, false);
  assert.equal(packet.auditEvent, "agent.os.external.scheduling.readiness_locked");

  const unsafe = buildAgentSchedulingMutationGateReadinessPacket({
    job: { id: "JOB-1" },
    proposedSchedule: {
      scheduledStart: "2026-06-02T08:00:00.000Z",
      scheduledEnd: "2026-06-02T12:00:00.000Z",
      humanReviewConfirmed: true,
      approvedScheduleBoundary: true,
      execute: true,
      apiKey: "secret",
    },
  });
  assert.match(unsafe.blockers.join(" "), /credentials|auto-execute/i);
  assert.equal(unsafe.canMutateSchedule, false);
});

test("Agent OS external gate readiness packets cover portal, integration, SMS, payment, and bid gates without execution", () => {
  const gateIds = ["customer_portal_action", "integration_write", "sms_send", "payment_collection", "bid_submission"];
  const packets = gateIds.map((gateId) => buildAgentExternalGateReadinessPacket(gateId, {
    companyId: "COMPANY-1",
    actorUserId: "USER-1",
    target: { entityType: "record", entityId: `${gateId}-target`, label: `${gateId} target` },
    review: Object.fromEntries([
      ["previewDiffReviewed", true],
      ["customerScopeValidated", true],
      ["tokenLifecycleReviewed", true],
      ["compensatingActionReviewed", true],
      ["sandboxVerified", true],
      ["providerObjectScoped", true],
      ["fieldMapReviewed", true],
      ["reconciliationReviewed", true],
      ["consentConfirmed", true],
      ["optOutReviewed", true],
      ["senderConfigured", true],
      ["testRecipientStrategy", true],
      ["templateReviewed", true],
      ["amountIntegrityReviewed", true],
      ["sandboxProviderReviewed", true],
      ["kycProviderStatusReviewed", true],
      ["destinationVerified", true],
      ["packetPreviewReviewed", true],
      ["deadlineReviewed", true],
      ["withdrawalCorrectionReviewed", true],
      ["humanReviewConfirmed", true],
      ["approvedBoundary", true],
    ]),
    externalGateSettings: {
      [gateId]: {
        enabled: true,
        mode: "human_confirmed",
        allowedWorkflow: gateId,
        testOnly: false,
      },
    },
    adapterEvidence: {
      [gateId]: {
        domainAdapter: true,
        companyOptIn: true,
        humanConfirmation: true,
        idempotency: true,
        audit: true,
        rollback: true,
        tenantRolePackageTests: true,
        providerSandboxOrTestStrategy: true,
      },
    },
    now: "2026-05-29T13:00:00.000Z",
  }));

  assert.equal(packets.every((packet) => packet.ok === true), true);
  assert.equal(packets.every((packet) => packet.status.includes("ready_for_human_confirmed")), true);
  assert.equal(packets.every((packet) => packet.externalActionPrepared === false), true);
  assert.equal(packets.every((packet) => packet.externalActionExecuted === false), true);
  assert.equal(packets.every((packet) => packet.canExecute === false), true);
  assert.ok(packets.find((packet) => packet.gateId === "sms_send").blockedActions.includes("No SMS send"));
  assert.ok(packets.find((packet) => packet.gateId === "payment_collection").blockedActions.includes("No charge"));
  assert.match(packets.find((packet) => packet.gateId === "bid_submission").safetyBoundary, /No bid submission/i);

  const unsafe = buildAgentExternalGateReadinessPacket("integration_write", {
    target: { entityType: "integration", entityId: "INT-1" },
    review: { humanReviewConfirmed: true, approvedBoundary: true, apiKey: "secret", syncNow: true },
  });
  assert.equal(unsafe.status, "blocked_locked");
  assert.match(unsafe.blockers.join(" "), /credentials|auto-execute|external-action/i);
});

test("Agent OS external gate readiness deck exposes all locked preflight endpoints", () => {
  const deck = buildAgentOsExternalGateReadinessDeck({
    companyId: "COMPANY-1",
    actorUserId: "USER-1",
  });

  assert.equal(deck.mode, "agent_os_external_gate_readiness_deck_v1");
  assert.deepEqual(deck.rows.map((row) => row.gateId), [
    "email_send",
    "sms_send",
    "payment_collection",
    "customer_portal_action",
    "scheduling",
    "bid_submission",
    "integration_write",
  ]);
  assert.equal(deck.stats.gateCount, 7);
  assert.equal(deck.stats.endpointCount, 7);
  assert.ok(deck.rows.find((row) => row.gateId === "scheduling").preflightEndpoint.includes("/scheduling/readiness"));
  assert.ok(deck.rows.find((row) => row.gateId === "sms_send").blockedActions.includes("No SMS send"));
  assert.match(deck.safetyBoundary, /review-only/i);
});

test("Agent OS external gate execution contracts define locked routes without provider actions", () => {
  const contract = buildAgentExternalGateExecutionContract("payment_collection", {
    companyId: "COMPANY-1",
    actorUserId: "USER-1",
    target: { entityType: "job", entityId: "JOB-1", label: "Driveway invoice" },
    review: {
      amountIntegrityReviewed: true,
      sandboxProviderReviewed: true,
      kycProviderStatusReviewed: true,
      reconciliationReviewed: true,
      humanReviewConfirmed: true,
      approvedBoundary: true,
      idempotencyKey: "payment-contract-1",
    },
    externalGateSettings: {
      payment_collection: { enabled: true, mode: "human_confirmed", allowedWorkflow: "payment_collection", testOnly: true },
    },
    adapterEvidence: {
      payment_collection: {
        domainAdapter: true,
        companyOptIn: true,
        humanConfirmation: true,
        idempotency: true,
        audit: true,
        rollback: true,
        tenantRolePackageTests: true,
        providerSandboxOrTestStrategy: true,
      },
    },
  });

  assert.equal(contract.ok, true);
  assert.equal(contract.mode, "agent_os_external_gate_execution_contract_v1");
  assert.equal(contract.status, "prepared_locked");
  assert.equal(contract.gateId, "payment_collection");
  assert.match(contract.executionRoute, /payment_collection\/execute/);
  assert.equal(contract.executionEnabled, false);
  assert.equal(contract.canExecute, false);
  assert.equal(contract.providerRequestPrepared, false);
  assert.equal(contract.providerRequestSent, false);
  assert.equal(contract.externalActionExecuted, false);
  assert.ok(contract.blockedActions.includes("No charge"));
  assert.match(contract.safetyBoundary, /No provider request|payment/i);

  const unsafe = buildAgentExternalGateExecutionContract("integration_write", {
    target: { entityType: "integration", entityId: "INT-1", writeNow: true },
    review: { humanReviewConfirmed: true, approvedBoundary: true, apiKey: "secret" },
  });
  assert.equal(unsafe.status, "blocked_locked");
  assert.match(unsafe.reviewBlockers.join(" "), /credentials|auto-execute|external-action/i);
});

test("Agent OS external gate execution deck exposes all locked contract and execute routes", () => {
  const deck = buildAgentOsExternalGateExecutionDeck({
    companyId: "COMPANY-1",
    actorUserId: "USER-1",
  });

  assert.equal(deck.mode, "agent_os_external_gate_execution_deck_v1");
  assert.deepEqual(deck.rows.map((row) => row.gateId), [
    "email_send",
    "sms_send",
    "payment_collection",
    "customer_portal_action",
    "bid_submission",
    "integration_write",
  ]);
  assert.equal(deck.stats.gateCount, 6);
  assert.equal(deck.stats.lockedCount, 6);
  assert.equal(deck.stats.contractEndpointCount, 6);
  assert.equal(deck.stats.executionEndpointCount, 6);
  assert.equal(deck.rows.every((row) => row.canExecute === false), true);
  assert.ok(deck.rows.find((row) => row.gateId === "bid_submission").executionRoute.includes("/bid_submission/execute"));
  assert.match(deck.safetyBoundary, /locked/i);
});

test("Agent OS sandbox adapters run from locked contracts without external execution", () => {
  const baseContract = buildAgentExternalGateExecutionContract("sms_send", {
    companyId: "COMPANY-1",
    actorUserId: "USER-1",
    target: { entityType: "lead", entityId: "LEAD-1", label: "Driveway follow-up" },
    review: {
      consentConfirmed: true,
      optOutReviewed: true,
      senderConfigured: true,
      testRecipientStrategy: true,
      templateReviewed: true,
      humanReviewConfirmed: true,
      approvedBoundary: true,
      idempotencyKey: "sms-contract-1",
    },
    externalGateSettings: {
      sms_send: { enabled: true, mode: "human_confirmed", allowedWorkflow: "sms_customer_message", testOnly: true },
    },
    adapterEvidence: {
      sms_send: {
        domainAdapter: true,
        companyOptIn: true,
        humanConfirmation: true,
        idempotency: true,
        audit: true,
        rollback: true,
        tenantRolePackageTests: true,
        providerSandboxOrTestStrategy: true,
      },
    },
  });
  const run = buildAgentExternalGateSandboxAdapterRun("sms_send", {
    companyId: "COMPANY-1",
    actorUserId: "USER-1",
    executionContract: baseContract,
    adapterInput: {
      sandboxLabel: "Test recipient only",
      operatorNote: "Review copy against consent record.",
      idempotencyKey: "sms-sandbox-run-1",
    },
  });

  assert.equal(run.ok, true);
  assert.equal(run.status, "sandbox_test_recipient_ready_locked");
  assert.equal(run.adapterId, "sms_test_recipient_adapter");
  assert.equal(run.sandboxAdapterPrepared, true);
  assert.equal(run.sandboxAdapterExecuted, false);
  assert.equal(run.providerRequestPrepared, false);
  assert.equal(run.providerRequestSent, false);
  assert.equal(run.externalActionExecuted, false);
  assert.equal(run.canExecute, false);
  assert.ok(run.blockedActions.includes("No SMS send"));
  assert.match(run.outputPreview.redaction, /Secrets|credentials/i);

  const unsafe = buildAgentExternalGateSandboxAdapterRun("integration_write", {
    executionContract: { ...baseContract, gateId: "integration_write", status: "prepared_locked" },
    adapterInput: { apiKey: "secret", writeNow: true },
  });
  assert.equal(unsafe.status, "blocked_locked");
  assert.match(unsafe.blockers.join(" "), /credentials|live execution|external-action/i);
});

test("Agent OS sandbox adapter deck covers portal, SMS, payment, integration, and bid adapters", () => {
  const deck = buildAgentOsExternalGateSandboxAdapterDeck({
    companyId: "COMPANY-1",
    actorUserId: "USER-1",
  });

  assert.equal(deck.mode, "agent_os_external_gate_sandbox_adapter_deck_v1");
  assert.deepEqual(deck.rows.map((row) => row.gateId), [
    "customer_portal_action",
    "sms_send",
    "payment_collection",
    "integration_write",
    "bid_submission",
  ]);
  assert.equal(deck.stats.adapterCount, 5);
  assert.equal(deck.stats.lockedCount, 5);
  assert.equal(deck.rows.every((row) => row.canExecute === false), true);
  assert.ok(deck.rows.find((row) => row.gateId === "payment_collection").runEndpoint.includes("/sandbox-adapter/run"));
  assert.match(deck.safetyBoundary, /internal evidence/i);
});

test("Agent OS known external gates stay disabled unless explicitly configured", () => {
  const knownExternalGateIds = [
    "email_send",
    "sms_send",
    "payment_collection",
    "customer_portal_action",
    "scheduling",
    "bid_submission",
    "integration_write",
  ];
  const defaultGates = listAgentOsExternalGates();
  const malformedSettings = normalizeAgentOsExternalGateSettings(Object.fromEntries(
    knownExternalGateIds.map((gateId) => [gateId, {
      enabled: true,
      mode: gateId === "email_send" ? "human_confirmed" : "disabled",
      allowedWorkflow: `${gateId}_workflow`,
    }]),
  ));
  const configuredGates = listAgentOsExternalGates({ externalGateSettings: malformedSettings });

  assert.deepEqual(defaultGates.map((gate) => gate.id), knownExternalGateIds);
  assert.equal(defaultGates.every((gate) => gate.status === "boundary_approved"), true);
  assert.equal(defaultGates.every((gate) => gate.executionEnabled === false), true);
  assert.equal(defaultGates.every((gate) => gate.blockedUntilConfigured === true), true);
  assert.equal(defaultGates.every((gate) => gate.normalHumanConfirmationRequired === true), true);
  assert.equal(defaultGates.every((gate) => /normal domain adapter|per-company opt-in|idempotency|audit|rollback|tenant/i.test(gate.requiredApproval)), true);

  assert.equal(configuredGates.find((gate) => gate.id === "email_send").executionEnabled, true);
  assert.equal(configuredGates.find((gate) => gate.id === "email_send").allowedWorkflow, "email_send_workflow");
  assert.equal(configuredGates.filter((gate) => gate.id !== "email_send").every((gate) => gate.executionEnabled === false), true);
  assert.equal(configuredGates.filter((gate) => gate.id !== "email_send").every((gate) => gate.mode === "disabled"), true);
});
