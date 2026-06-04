import assert from "node:assert/strict";
import test from "node:test";

import {
  APEX_CONTROL_ROOM_APPROVAL_GATES,
  APEX_OS_BUSINESS_APPROVAL_DRAFT_ROWS,
  APEX_OS_BUSINESS_GATES,
  APEX_OS_BUSINESS_QUEUE_ROWS,
  APEX_OS_BUSINESS_TASK_DRAFT_ROWS,
  APEX_OS_CHAT_ACTION_LOCKS,
  APEX_OS_FINISHED_BLOCKED_ACTION_ROWS,
  APEX_OS_FINISHED_CAPABILITY_ROWS,
  APEX_OS_CHAT_CONTEXTS,
  APEX_OS_APPROVAL_CONTROL_LOCKS,
  APEX_OS_APPROVAL_PACKET_FIELDS,
  APEX_OS_DECISION_CATEGORIES,
  APEX_OS_MEMORY_SOURCE,
  APEX_OS_PERSONAL_BACKGROUND_ROWS,
  APEX_OS_PERSONAL_CHECK_IN_ROWS,
  APEX_OS_PERSONAL_COMMUNICATION_ROWS,
  APEX_OS_PERSONAL_DAILY_FOCUS_ROWS,
  APEX_OS_PERSONAL_DISTRACTION_RULE_ROWS,
  APEX_OS_PERSONAL_OPERATING_SEED_ROWS,
  APEX_OS_PERSONAL_PRIVACY_LOCKS,
  APEX_OS_PERSONAL_WORK_STYLE_ROWS,
  APEX_OS_RELEASE_MONITORING_CHECKS,
  APEX_OS_RELEASE_MONITORING_LOCKS,
  APEX_OS_QA_SECURITY_EVIDENCE_ROWS,
  APEX_OS_QA_SECURITY_LOCKS,
  APEX_OS_VOICE_MODES,
  APEX_OS_VOICE_SAFETY_GATES,
  deriveApexControlRoomState,
} from "./apex-control-room-utils.js";

test("deriveApexControlRoomState blocks non-private users", () => {
  const state = deriveApexControlRoomState({
    user: { name: "Normal Admin", role: "Administrator" },
    permissions: { apexOs: { canView: false } },
    jobs: [{ id: "J-1" }],
  });

  assert.equal(state.canView, false);
  assert.deepEqual(state.kpis, []);
  assert.deepEqual(state.commandBoardPanels, []);
  assert.deepEqual(state.operatingSignals, []);
  assert.deepEqual(state.nextBestActions, []);
  assert.deepEqual(state.launchReadiness.gates, []);
  assert.deepEqual(state.decisionMemory.decisions, []);
  assert.deepEqual(state.decisionMemory.rules, []);
  assert.deepEqual(state.personalOperatingLayer.preferenceRows, []);
  assert.deepEqual(state.personalOperatingLayer.privacyRows, []);
  assert.deepEqual(state.knowledgeVault.categories, []);
  assert.deepEqual(state.knowledgeVault.safetyRows, []);
  assert.deepEqual(state.askApexChat.contexts, []);
  assert.deepEqual(state.askApexChat.evidenceRows, []);
  assert.deepEqual(state.askApexChat.actionLocks, []);
  assert.deepEqual(state.voiceInterface.modes, []);
  assert.deepEqual(state.voiceInterface.safetyRows, []);
  assert.deepEqual(state.approvalCommandCenter.queueRows, []);
  assert.deepEqual(state.approvalCommandCenter.packetRows, []);
  assert.deepEqual(state.approvalCommandCenter.controlRows, []);
  assert.deepEqual(state.approvalCommandCenter.sourceRows, []);
  assert.deepEqual(state.executionHandoffs.sourceRows, []);
  assert.deepEqual(state.releaseMonitoring.readinessRows, []);
  assert.deepEqual(state.releaseMonitoring.briefingRows, []);
  assert.deepEqual(state.releaseMonitoring.releasePacketRows, []);
  assert.deepEqual(state.releaseMonitoring.lockRows, []);
  assert.deepEqual(state.businessCommandCenter.queueRows, []);
  assert.deepEqual(state.businessCommandCenter.gateRows, []);
  assert.deepEqual(state.businessCommandCenter.launchRows, []);
  assert.deepEqual(state.businessCommandCenter.briefingRows, []);
  assert.deepEqual(state.businessCommandCenter.memoryRows, []);
  assert.deepEqual(state.businessCommandCenter.taskDraftRows, []);
  assert.deepEqual(state.businessCommandCenter.approvalDraftRows, []);
  assert.deepEqual(state.phase3Aggregator.rows, []);
  assert.deepEqual(state.qaSecurityHardening.evidenceRows, []);
  assert.deepEqual(state.qaSecurityHardening.lockRows, []);
  assert.deepEqual(state.finishedApexOs.capabilityRows, []);
  assert.deepEqual(state.finishedApexOs.runLoopRows, []);
  assert.deepEqual(state.finishedApexOs.freezeRows, []);
  assert.deepEqual(state.finishedApexOs.blockedActionRows, []);
  assert.deepEqual(state.agentWorkQueue.taskRows, []);
  assert.deepEqual(state.agentWorkQueue.runRows, []);
  assert.deepEqual(state.autonomyRunCenter.planRows, []);
  assert.deepEqual(state.autonomyRunCenter.routeRows, []);
  assert.deepEqual(state.autonomyRunCenter.gateRows, []);
  assert.deepEqual(state.autonomyRunCenter.runRows, []);
  assert.equal(state.autonomyRunCenter.runSummary.total, 0);
  assert.equal(state.autonomyRunCenter.canExecuteExternalActions, false);
  assert.equal(state.autonomyRunCenter.executionLocked, true);
  assert.deepEqual(state.liveOperatorMode.readinessRows, []);
  assert.deepEqual(state.liveOperatorMode.operatorLoopRows, []);
  assert.deepEqual(state.liveOperatorMode.gapRows, []);
  assert.equal(state.liveOperatorMode.externalActionsLocked, true);
  assert.equal(state.liveOperatorMode.executionLocked, true);
  assert.equal(state.operatorName, "Normal Admin");
});

test("deriveApexControlRoomState builds private operator status from visible state", () => {
  const state = deriveApexControlRoomState({
    user: { name: "John Berlanga", role: "Owner", operatorAccess: true },
    permissions: {
      apexOs: { canView: true, canManage: true },
      aiOffice: { canView: true },
      settings: { canView: true, canManage: true },
      appHealth: { canView: true },
      support: { canView: true },
    },
    stats: { activeJobs: 2 },
    leads: [{ id: "L-1", customerName: "Rivera Builders" }],
    estimates: [{ id: "E-1" }, { id: "E-2", archivedAt: "2026-01-01T00:00:00.000Z" }],
    jobs: [{ id: "J-1", customerName: "Apex Demo Job" }],
    dailyReports: [{ id: "DR-1", title: "Daily report" }],
    queueItems: [
      { id: "Q-1", status: "Blocked", done: false },
      { id: "Q-2", status: "Ready", done: false },
      { id: "Q-3", status: "Ready", done: true },
    ],
    auditEvents: [
      { id: "AUD-BUILD", type: "build.verify", summary: "Focused tests and build passed", createdAt: "2026-06-02T14:00:00.000Z" },
      { id: "AUD-1", type: "release.check", summary: "Build check passed", createdAt: "2026-06-01T12:00:00.000Z" },
      { id: "AUD-2", type: "auth.login", summary: "Login check", createdAt: "2026-06-02T12:00:00.000Z" },
      {
        id: "AUD-3",
        entityType: "agentOsRun",
        entityId: "RUN-1",
        action: "agent.os.run.queued",
        summary: "Agent run queued",
        createdAt: "2026-06-02T13:00:00.000Z",
        detail: JSON.stringify({
          run: { id: "RUN-1", status: "queued" },
          task: { id: "TASK-1", actionLabel: "Lead follow-up draft" },
          actionId: "lead_follow_up_draft",
        }),
      },
    ],
    activity: [{ id: "ACT-1", title: "Owner reviewed dashboard", createdAt: "2026-06-02T10:00:00.000Z" }],
    companySettings: {
      packageName: "Apex HQ Owner",
      apexOsBuildStatus: {
        branch: "codex/apex-os-command-center",
        phaseStatus: "Phase 3 hard-finish",
        testStatus: "Focused tests passing",
        testDetail: "Phase 3 utility, role, build, and browser QA evidence is attached.",
        livingPlanText: "| 2026-06-03 | Apex OS Phase 14 Action Execution Layer | `ab1a656`; Fly release `v646`; image `registry.fly.io/concrete-ops-2:deployment-01KT6G2KC3ZZ5HS4Q3GT0VHHAP` | Production Fly app `concrete-ops-2` | Predeploy backup `postgres-app-data-20260603-102138Z.json` plus `uploads-20260603-102138Z`; both `/api/ready` endpoints database OK; hosted skip-auth health/routes smoke passed. |",
        packageScripts: { build: "vite build", "verify:roles": "node --test" },
        distAssets: ["index-D5EnyN4J.js"],
      },
    },
  });

  assert.equal(state.canView, true);
  assert.equal(state.operatorName, "John Berlanga");
  assert.deepEqual(state.kpis.map((item) => item.label), [
    "App Build Status",
    "Active Agents",
    "Launch Blockers",
    "Approvals",
  ]);
  assert.equal(state.kpis.find((item) => item.id === "app-build-status")?.value, "Workspace clean");
  assert.match(state.kpis.find((item) => item.id === "app-build-status")?.detail || "", /codex\/apex-os-command-center/);
  assert.equal(state.kpis.find((item) => item.id === "active-agents")?.value, "10");
  assert.match(state.kpis.find((item) => item.id === "active-agents")?.detail || "", /No agent execution/);
  assert.equal(state.kpis.find((item) => item.id === "launch-blockers")?.value, "6");
  assert.equal(state.kpis.find((item) => item.id === "approvals")?.value, String(APEX_CONTROL_ROOM_APPROVAL_GATES.length));
  assert.deepEqual(state.commandBoardPanels.map((item) => item.title), [
    "Apex Briefing",
    "Priority Queue",
    "Agents",
    "Approvals",
    "Memory / Decisions",
  ]);
  assert.match(state.commandBoardPanels.find((item) => item.id === "agents")?.detail || "", /review-only task types/);
  assert.match(state.commandBoardPanels.find((item) => item.id === "memory-decisions")?.detail || "", /source-backed context/);
  assert.match(state.agents.find((item) => item.id === "agent-os")?.detail || "", /recent run rows visible/);
  assert.equal(state.operatingSignals.find((item) => item.id === "state-aggregator"), undefined);
  assert.equal(state.operatingSignals.find((item) => item.id === "agent-tasks")?.status, "10 available");
  assert.match(state.operatingSignals.find((item) => item.id === "agent-tasks")?.detail || "", /10 visible targets/);
  assert.equal(state.operatingSignals.every((item) => item.readOnly === true), true);
  assert.equal(state.operatingSignals.every((item) => item.sourceLabel && item.confidence), true);
  assert.equal(state.operatingSignals.find((item) => item.id === "agent-tasks")?.sourceLabel, "Agent OS task helpers");
  assert.equal(state.operatingSignals.find((item) => item.id === "launch-readiness")?.status, "Launch locked");
  assert.equal(state.operatingSignals.find((item) => item.id === "decision-memory")?.status, "Seeded from plan");
  assert.equal(state.operatingSignals.find((item) => item.id === "knowledge-vault")?.status, "Upload intake ready");
  assert.equal(state.operatingSignals.find((item) => item.id === "ask-apex-chat")?.status, "Source-backed live");
  assert.equal(state.operatingSignals.find((item) => item.id === "voice-interface")?.status, "Voice playback ready");
  assert.equal(state.operatingSignals.find((item) => item.id === "approval-command-center")?.status, "Drafting ready");
  assert.equal(state.operatingSignals.find((item) => item.id === "execution-handoffs")?.status, "Drafting ready");
  assert.equal(state.operatingSignals.find((item) => item.id === "release-monitoring")?.status, "Read-only ready");
  assert.equal(state.operatingSignals.find((item) => item.id === "business-command-center")?.status, "Business ops mapped");
  assert.equal(state.operatingSignals.find((item) => item.id === "qa-security-hardening")?.status, "Hardening evidence ready");
  assert.equal(state.priorities.find((item) => item.id === "agent-work-queue")?.status, "Review-only");
  assert.equal(state.priorities.find((item) => item.id === "knowledge-vault")?.status, "Upload intake ready");
  assert.equal(state.priorities.find((item) => item.id === "provider-work")?.status, "Source-backed live");
  assert.equal(state.priorities.find((item) => item.id === "voice-interface")?.status, "Voice playback ready");
  assert.equal(state.priorities.find((item) => item.id === "approval-command-center")?.status, "Drafting ready");
  assert.equal(state.priorities.find((item) => item.id === "execution-handoffs")?.status, "Drafting ready");
  assert.equal(state.priorities.find((item) => item.id === "release-monitoring")?.status, "Read-only ready");
  assert.equal(state.priorities.find((item) => item.id === "business-command-center")?.status, "Business ops mapped");
  assert.equal(state.priorities.find((item) => item.id === "qa-security-hardening")?.status, "Hardening evidence ready");
  assert.equal(state.releaseDesk.status, "Manual release only");
  assert.equal(state.releaseDesk.sections.length, 3);
  assert.equal(state.releaseDesk.currentVersion, "646");
  assert.equal(state.releaseDesk.currentCommit, "ab1a656");
  assert.equal(state.releaseDesk.canDeploy, false);
  assert.equal(state.releaseDesk.deployApprovedFlowLocked, true);
  assert.equal(state.releaseDesk.productionActionLocked, true);
  assert.equal(state.releaseDesk.productionPreviewCount, 3);
  assert.equal(state.releaseDesk.readinessPacketCount, 5);
  assert.equal(state.releaseDesk.deployHistoryCount, 1);
  assert.equal(state.releaseDesk.approvalFlowCount, 4);
  assert.equal(state.releaseDesk.productionPreviewRows.some((item) => item.id === "current-production-version" && item.status === "v646"), true);
  assert.equal(state.releaseDesk.productionPreviewRows.some((item) => item.id === "live-health-evidence" && item.status === "Documented"), true);
  assert.equal(state.releaseDesk.readinessPacketRows.some((item) => item.id === "backup-restore-evidence" && item.status === "Backup documented"), true);
  assert.equal(state.releaseDesk.readinessPacketRows.some((item) => item.id === "deploy-approval-phrase" && item.status === "Exact approval required"), true);
  assert.equal(state.releaseDesk.deployHistoryRows.some((item) => item.status === "v646" && item.commit === "ab1a656"), true);
  assert.equal(state.releaseDesk.deployApprovalFlowRows.some((item) => item.id === "deploy-approved-lock" && item.status === "Locked"), true);
  assert.equal(state.launchReadiness.blockedCount > 0, true);
  assert.equal(state.launchReadiness.gates.length, 4);
  assert.match(state.nextBestActions.find((item) => item.id === "release-approval")?.detail || "", /owner approval/);
  assert.match(state.nextBestActions.find((item) => item.id === "memory-review")?.detail || "", /manually approve or archive/);
  assert.equal(state.nextBestActions.find((item) => item.id === "ask-apex-chat-plan")?.status, "Ready");
  assert.equal(state.nextBestActions.find((item) => item.id === "voice-interface-plan")?.status, "Ready");
  assert.equal(state.nextBestActions.find((item) => item.id === "approval-command-center-plan")?.status, "Ready");
  assert.equal(state.nextBestActions.find((item) => item.id === "release-monitoring-plan")?.status, "Ready");
  assert.equal(state.nextBestActions.find((item) => item.id === "business-command-center-plan")?.status, "Ready");
  assert.equal(state.nextBestActions.find((item) => item.id === "qa-security-hardening-plan")?.status, "Ready");
  assert.equal(state.decisionMemory.status, "Seeded from plan");
  assert.equal(state.decisionMemory.source, APEX_OS_MEMORY_SOURCE);
  assert.equal(state.decisionMemory.decisionCount, 8);
  assert.equal(state.decisionMemory.ruleCount, 4);
  assert.equal(state.decisionMemory.categoryCount, APEX_OS_DECISION_CATEGORIES.length);
  assert.equal(state.decisionMemory.coveredCategoryCount, APEX_OS_DECISION_CATEGORIES.length);
  assert.equal(state.decisionMemory.categories.some((item) => item.id === "build-freeze" && item.status === "Covered"), true);
  assert.equal(state.decisionMemory.categories.some((item) => item.id === "business-goal" && item.status === "Covered"), true);
  assert.equal(state.decisionMemory.categories.some((item) => item.id === "personal-preference" && item.status === "Covered"), true);
  assert.equal(state.decisionMemory.decisions.some((item) => item.id === "private-operator-only" && item.status === "Locked"), true);
  assert.equal(state.decisionMemory.rules.some((item) => item.id === "field-boundary" && item.status === "Locked"), true);
  assert.equal(state.personalOperatingLayer.status, "Personal layer ready");
  assert.equal(state.personalOperatingLayer.preferenceCount, APEX_OS_PERSONAL_OPERATING_SEED_ROWS.length);
  assert.equal(state.personalOperatingLayer.workStyleCount, APEX_OS_PERSONAL_WORK_STYLE_ROWS.length);
  assert.equal(state.personalOperatingLayer.communicationCount, APEX_OS_PERSONAL_COMMUNICATION_ROWS.length);
  assert.equal(state.personalOperatingLayer.dailyFocusCount, APEX_OS_PERSONAL_DAILY_FOCUS_ROWS.length);
  assert.equal(state.personalOperatingLayer.distractionRuleCount, APEX_OS_PERSONAL_DISTRACTION_RULE_ROWS.length);
  assert.equal(state.personalOperatingLayer.backgroundCount, APEX_OS_PERSONAL_BACKGROUND_ROWS.length);
  assert.equal(state.personalOperatingLayer.checkInCount, APEX_OS_PERSONAL_CHECK_IN_ROWS.length);
  assert.equal(state.personalOperatingLayer.privacyLockCount, APEX_OS_PERSONAL_PRIVACY_LOCKS.length);
  assert.equal(state.personalOperatingLayer.hiddenTrackingEnabled, false);
  assert.equal(state.personalOperatingLayer.backgroundExecutionEnabled, false);
  assert.equal(state.personalOperatingLayer.preferenceRows.some((item) => item.id === "phase-discipline"), true);
  assert.equal(state.personalOperatingLayer.dailyFocusRows.some((item) => item.id === "daily-focus-current-phase"), true);
  assert.equal(state.personalOperatingLayer.distractionRows.some((item) => item.id === "distract-validation-failure"), true);
  assert.equal(state.personalOperatingLayer.backgroundRows.some((item) => item.id === "background-local-build"), true);
  assert.equal(state.personalOperatingLayer.checkInRows.some((item) => item.id === "check-in-production"), true);
  assert.equal(state.personalOperatingLayer.privacyRows.some((item) => item.id === "privacy-no-sensitive-tracking" && item.status === "Locked"), true);
  assert.equal(state.operatingSignals.find((item) => item.id === "personal-operating-layer")?.status, "Personal layer ready");
  assert.equal(state.priorities.find((item) => item.id === "personal-operating-layer")?.status, "Personal layer ready");
  assert.equal(state.nextBestActions.find((item) => item.id === "personal-operating-layer-plan")?.status, "Personal layer ready");
  assert.equal(state.knowledgeVault.status, "Upload intake ready");
  assert.equal(state.knowledgeVault.categoryCount, 8);
  assert.equal(state.knowledgeVault.sourceCount, 4);
  assert.equal(state.knowledgeVault.lockedRuleCount, 2);
  assert.equal(state.knowledgeVault.categories.some((item) => item.id === "private-owner-notes" && item.status === "Private"), true);
  assert.equal(state.knowledgeVault.safetyRows.some((item) => item.id === "no-storage-yet" && item.status === "Active"), true);
  assert.equal(state.knowledgeVault.safetyRows.some((item) => item.id === "no-secrets" && item.status === "Locked"), true);
  assert.equal(state.knowledgeVault.sourceRows.some((item) => item.id === "future-uploads" && item.status === "Text intake active"), true);
  assert.equal(state.askApexChat.status, "Source-backed live");
  assert.equal(state.askApexChat.providerStatus, "Server-only provider");
  assert.equal(state.askApexChat.contextCount, APEX_OS_CHAT_CONTEXTS.length);
  assert.equal(state.askApexChat.evidenceCount, 6);
  assert.equal(state.askApexChat.actionLockCount, APEX_OS_CHAT_ACTION_LOCKS.length);
  assert.match(state.askApexChat.placeholder, /app, roadmap, agents, launch, business/);
  assert.equal(state.askApexChat.contexts.some((item) => item.id === "app-code" && item.status === "Selectable"), true);
  assert.equal(state.askApexChat.contexts.some((item) => item.id === "all" && item.status === "Review required"), true);
  assert.equal(state.askApexChat.evidenceRows.some((item) => item.id === "knowledge-vault" && item.status === "Upload intake ready"), true);
  assert.equal(state.askApexChat.evidenceRows.some((item) => item.id === "launch-readiness" && item.status === "Launch locked"), true);
  assert.equal(state.askApexChat.actionLocks.some((item) => item.id === "ask-provider" && item.status === "Server-only"), true);
  assert.equal(state.askApexChat.actionLocks.some((item) => item.id === "save-decision" && item.status === "Suggested only"), true);
  assert.equal(state.askApexChat.actionLocks.some((item) => item.id === "create-task" && item.status === "Draft handoff"), true);
  assert.equal(state.askApexChat.actionLocks.some((item) => item.id === "needs-approval" && item.status === "Draft packet"), true);
  assert.match(state.askApexChat.answerPreview.detail, /Apex answers from approved memory and source labels/);
  assert.equal(state.voiceInterface.status, "Voice playback ready");
  assert.equal(state.voiceInterface.providerStatus, "Open voice ready");
  assert.equal(state.voiceInterface.modeCount, APEX_OS_VOICE_MODES.length);
  assert.equal(state.voiceInterface.safetyCount, APEX_OS_VOICE_SAFETY_GATES.length);
  assert.equal(state.voiceInterface.transcriptStatus, "Manual confirmation");
  assert.equal(state.voiceInterface.answerStatus, "Ask Apex ready");
  assert.match(state.voiceInterface.prompt, /Transcript before Apex listens/);
  assert.match(state.voiceInterface.transcriptPreview, /Type and confirm what Apex heard/);
  assert.equal(state.voiceInterface.modes.some((item) => item.id === "open-voice-session" && item.status === "Visible mic"), true);
  assert.equal(state.voiceInterface.modes.some((item) => item.id === "transcript-confirmation" && item.status === "Ready"), true);
  assert.equal(state.voiceInterface.modes.some((item) => item.id === "spoken-answer" && item.status === "Playback ready"), true);
  assert.equal(state.voiceInterface.modes.some((item) => item.id === "risky-command-confirmation" && item.status === "Locked"), true);
  assert.equal(state.voiceInterface.safetyRows.some((item) => item.id === "no-microphone" && item.status === "Visible open only"), true);
  assert.equal(state.voiceInterface.safetyRows.some((item) => item.id === "visible-open-session" && item.status === "Visible session"), true);
  assert.equal(state.voiceInterface.safetyRows.some((item) => item.id === "no-speech-provider" && item.status === "Server-only"), true);
  assert.equal(state.approvalCommandCenter.status, "Drafting ready");
  assert.equal(state.approvalCommandCenter.queueCount, APEX_CONTROL_ROOM_APPROVAL_GATES.length);
  assert.equal(state.approvalCommandCenter.packetFieldCount, APEX_OS_APPROVAL_PACKET_FIELDS.length);
  assert.equal(state.approvalCommandCenter.controlLockCount, APEX_OS_APPROVAL_CONTROL_LOCKS.length);
  assert.equal(state.approvalCommandCenter.templateCount >= 5, true);
  assert.equal(state.approvalCommandCenter.sourceCount, 3);
  assert.equal(state.approvalCommandCenter.queueRows.some((item) => item.id === "deploy" && item.status === "Packet required"), true);
  assert.equal(state.approvalCommandCenter.packetRows.some((item) => item.id === "rollback" && item.status === "Required"), true);
  assert.equal(state.approvalCommandCenter.packetRows.some((item) => item.id === "approval-phrase" && item.status === "Required"), true);
  assert.equal(state.approvalCommandCenter.controlRows.some((item) => item.id === "approve" && item.status === "Decision record"), true);
  assert.equal(state.approvalCommandCenter.controlRows.some((item) => item.id === "execute" && item.status === "Not available"), true);
  assert.equal(state.approvalCommandCenter.templateRows.some((item) => item.id === "deploy" && /BACKUP_FIRST_PRODUCTION_RELEASE_APPROVED/.test(item.detail)), true);
  assert.equal(state.approvalCommandCenter.sourceRows.some((item) => item.id === "voice-interface" && item.status === "Voice playback ready"), true);
  assert.equal(state.executionHandoffs.status, "Drafting ready");
  assert.equal(state.executionHandoffs.handoffSummary.total, 0);
  assert.equal(state.executionHandoffs.sourceCount, 3);
  assert.equal(state.executionHandoffs.sourceRows.some((item) => item.id === "execution-lock" && item.status === "Run locked"), true);
  assert.equal(state.releaseMonitoring.status, "Read-only ready");
  assert.equal(state.releaseMonitoring.readinessCount, APEX_OS_RELEASE_MONITORING_CHECKS.length);
  assert.equal(state.releaseMonitoring.lockCount, APEX_OS_RELEASE_MONITORING_LOCKS.length);
  assert.equal(state.releaseMonitoring.briefingCount, 4);
  assert.equal(state.releaseMonitoring.packetCount, 4);
  assert.equal(state.releaseMonitoring.readinessRows.some((item) => item.id === "current-branch-build" && item.status === "Workspace clean"), true);
  assert.equal(state.releaseMonitoring.readinessRows.some((item) => item.id === "failed-test-build" && item.status === "No failed source"), true);
  assert.equal(state.releaseMonitoring.readinessRows.some((item) => item.id === "agent-stalled" && item.status === "Reports visible"), true);
  assert.equal(state.releaseMonitoring.briefingRows.some((item) => item.id === "daily-executive-brief" && item.status === "Refresh + save ready"), true);
  assert.equal(state.releaseMonitoring.briefingRows.some((item) => item.id === "changed-since-yesterday" && item.status === "Baseline needed"), true);
  assert.equal(state.releaseMonitoring.briefingRows.some((item) => item.id === "stalled-agent-watch" && item.status === "Runs visible"), true);
  assert.equal(state.releaseMonitoring.releasePacketRows.some((item) => item.id === "stop-warnings" && item.status === "10 locks"), true);
  assert.equal(state.releaseMonitoring.lockRows.some((item) => item.id === "no-deploy" && item.status === "Locked"), true);
  assert.equal(state.releaseMonitoring.lockRows.some((item) => item.id === "no-monitoring-provider" && item.status === "Approval required"), true);
  assert.equal(state.releaseMonitoring.lockRows.some((item) => item.id === "no-external-alerts" && item.status === "Locked"), true);
  assert.equal(state.buildAwareness.status, "Workspace clean");
  assert.equal(state.buildAwareness.executionLocked, true);
  assert.equal(state.buildAwareness.canExecute, false);
  assert.equal(state.buildAwareness.sourceLinks.some((item) => item.path === "docs/APEX_HQ_LIVING_FINISH_PLAN.md"), true);
  assert.equal(state.buildAwareness.lockRows.some((item) => item.id === "no-field-data" && item.status === "Locked"), true);
  assert.equal(state.kpis.some((item) => item.id === "app-build-status" && /changed files/.test(item.detail)), true);
  assert.equal(state.phase3Aggregator.status, "Read-only aggregator");
  assert.equal(state.phase3Aggregator.rowCount, 6);
  assert.equal(state.phase3Aggregator.rows.some((item) => item.id === "phase-3-current-branch" && item.status === "codex/apex-os-command-center"), true);
  assert.equal(state.phase3Aggregator.rows.some((item) => item.id === "phase-3-build-test-state" && item.status === "Focused tests passing"), true);
  assert.equal(state.phase3Aggregator.rows.some((item) => item.id === "phase-3-phase-status" && item.status === "Phase 3 hard-finish"), true);
  assert.equal(state.phase3Aggregator.rows.some((item) => item.id === "phase-3-blockers-approvals" && /gates/.test(item.status)), true);
  assert.equal(state.phase3Aggregator.rows.some((item) => item.id === "phase-3-read-only-lock" && item.status === "Locked" && item.confidence === 96), true);
  assert.equal(state.businessCommandCenter.status, "Business ops mapped");
  assert.equal(state.businessCommandCenter.queueCount, APEX_OS_BUSINESS_QUEUE_ROWS.length);
  assert.equal(state.businessCommandCenter.gateCount, APEX_OS_BUSINESS_GATES.length);
  assert.equal(state.businessCommandCenter.launchCount, 4);
  assert.equal(state.businessCommandCenter.briefingCount, 3);
  assert.equal(state.businessCommandCenter.taskDraftCount, APEX_OS_BUSINESS_TASK_DRAFT_ROWS.length);
  assert.equal(state.businessCommandCenter.approvalDraftCount, APEX_OS_BUSINESS_APPROVAL_DRAFT_ROWS.length);
  assert.equal(state.businessCommandCenter.memorySourceCount, 0);
  assert.equal(state.businessCommandCenter.queueRows.some((item) => item.id === "launch-queue" && item.status === "Planning"), true);
  assert.equal(state.businessCommandCenter.queueRows.some((item) => item.id === "sales-outreach-queue" && item.status === "Draft-only"), true);
  assert.equal(state.businessCommandCenter.queueRows.some((item) => item.id === "revenue-offer-queue" && item.status === "Approval required"), true);
  assert.equal(state.businessCommandCenter.gateRows.some((item) => item.id === "manual-send" && item.status === "Locked"), true);
  assert.equal(state.businessCommandCenter.gateRows.some((item) => item.id === "no-ad-spend" && item.status === "Locked"), true);
  assert.equal(state.businessCommandCenter.gateRows.some((item) => item.id === "claims-guardrails" && item.status === "Required"), true);
  assert.equal(state.businessCommandCenter.launchRows.some((item) => item.id === "public-launch-readiness" && item.status === "Launch locked"), true);
  assert.equal(state.businessCommandCenter.briefingRows.some((item) => item.id === "manual-next-actions" && item.status === "6 drafts"), true);
  assert.equal(state.businessCommandCenter.taskDraftRows.some((item) => item.id === "founder-demo-task-draft" && item.status === "Draft-ready"), true);
  assert.equal(state.businessCommandCenter.taskDraftRows.some((item) => item.id === "sales-follow-up-task-draft" && /Email\/SMS/.test(item.detail)), true);
  assert.equal(state.businessCommandCenter.approvalDraftRows.some((item) => item.id === "business-ops-packet-draft" && item.status === "Draft packet"), true);
  assert.equal(state.businessCommandCenter.approvalDraftRows.some((item) => item.id === "billing-offer-packet-draft" && /Billing/.test(item.title)), true);
  assert.equal(state.qaSecurityHardening.status, "Hardening evidence ready");
  assert.equal(state.qaSecurityHardening.evidenceCount, APEX_OS_QA_SECURITY_EVIDENCE_ROWS.length);
  assert.equal(state.qaSecurityHardening.lockCount, APEX_OS_QA_SECURITY_LOCKS.length);
  assert.equal(state.qaSecurityHardening.evidenceRows.some((item) => item.id === "john-only-access" && item.status === "Verified"), true);
  assert.equal(state.qaSecurityHardening.evidenceRows.some((item) => item.id === "customer-company-isolation" && item.status === "Verified"), true);
  assert.equal(state.qaSecurityHardening.evidenceRows.some((item) => item.id === "direct-route-blocking" && item.status === "Verified"), true);
  assert.equal(state.qaSecurityHardening.evidenceRows.some((item) => item.id === "field-user-blocking" && item.status === "Verified"), true);
  assert.equal(state.qaSecurityHardening.evidenceRows.some((item) => item.id === "source-backed-answers" && item.status === "Source-backed live"), true);
  assert.equal(state.qaSecurityHardening.evidenceRows.some((item) => item.id === "upload-privacy" && item.status === "Upload intake ready"), true);
  assert.equal(state.qaSecurityHardening.evidenceRows.some((item) => item.id === "approval-gates" && item.status === "Gate verified"), true);
  assert.equal(state.qaSecurityHardening.evidenceRows.some((item) => item.id === "desktop-mobile-visual" && item.status === "Verified"), true);
  assert.equal(state.qaSecurityHardening.evidenceRows.some((item) => item.id === "build-test-release" && item.status === "Verified"), true);
  assert.equal(state.qaSecurityHardening.evidenceRows.some((item) => item.id === "production-preview-smoke" && item.status === "Documented"), true);
  assert.equal(state.qaSecurityHardening.evidenceRows.some((item) => item.id === "docs-memory-drift" && item.status === "In sync"), true);
  assert.equal(state.qaSecurityHardening.evidenceRows.some((item) => item.id === "apex-os-kill-switch" && item.status === "Available"), true);
  assert.equal(state.qaSecurityHardening.evidenceRows.some((item) => item.id === "no-secrets" && item.status === "Locked"), true);
  assert.equal(state.qaSecurityHardening.evidenceRows.some((item) => item.id === "no-bypass-actions" && item.status === "Bypass blocked"), true);
  assert.equal(state.qaSecurityHardening.lockRows.some((item) => item.id === "no-schema-auth-session" && item.status === "Locked"), true);
  assert.equal(state.qaSecurityHardening.lockRows.some((item) => item.id === "no-provider-api" && item.status === "Locked"), true);
  assert.equal(state.qaSecurityHardening.lockRows.some((item) => item.id === "no-production-mutation" && item.status === "Locked"), true);
  assert.equal(state.qaSecurityHardening.lockRows.some((item) => item.id === "no-money-or-sends" && item.status === "Locked"), true);
  assert.equal(state.qaSecurityHardening.lockRows.some((item) => item.id === "no-irrevocable-actions" && item.status === "Locked"), true);
  assert.equal(state.finishedApexOs.status, "Apex OS ready");
  assert.equal(state.finishedApexOs.readyCount, APEX_OS_FINISHED_CAPABILITY_ROWS.length);
  assert.equal(state.finishedApexOs.capabilityCount, APEX_OS_FINISHED_CAPABILITY_ROWS.length);
  assert.equal(state.finishedApexOs.runLoopCount, 10);
  assert.equal(state.finishedApexOs.freezeCount, 5);
  assert.equal(state.finishedApexOs.blockedActionCount, APEX_OS_FINISHED_BLOCKED_ACTION_ROWS.length);
  assert.equal(state.finishedApexOs.capabilityRows.some((item) => item.id === "john-only-command-center" && item.status === "Ready"), true);
  assert.equal(state.finishedApexOs.capabilityRows.some((item) => item.id === "voice-input-output" && item.status === "Ready"), true);
  assert.equal(state.finishedApexOs.capabilityRows.some((item) => item.id === "safe-task-execution-handoff" && item.status === "Ready"), true);
  assert.equal(state.finishedApexOs.runLoopRows.some((item) => item.id === "run-loop-handoff" && item.status === "Handoff ready"), true);
  assert.equal(state.finishedApexOs.freezeRows.some((item) => item.id === "phase-freeze" && item.status === "Frozen"), true);
  assert.equal(state.finishedApexOs.blockedActionRows.some((item) => item.id === "no-live-sends" && item.status === "Blocked"), true);
  assert.equal(state.agentWorkQueue.status, "Review-only");
  assert.equal(state.agentWorkQueue.availableTaskCount, 10);
  assert.equal(state.agentWorkQueue.visibleTargetCount, 10);
  assert.equal(state.agentWorkQueue.lockedTaskCount, 6);
  assert.equal(state.agentWorkQueue.taskRows.length, 4);
  assert.equal(state.agentWorkQueue.taskRows.some((item) => item.id === "lead_follow_up_draft" && item.status === "1 targets"), true);
  assert.equal(state.agentWorkQueue.lockedRows.length, 3);
  assert.equal(state.agentWorkQueue.runRows[0].title, "Lead follow-up draft");
  assert.equal(state.agentWorkQueue.runRows[0].status, "queued");
  assert.equal(state.agentWorkQueue.safetyRows.some((item) => item.id === "external-gates" && item.status === "Approval required"), true);
  assert.equal(state.autonomyRunCenter.status, "Guarded autonomy ready");
  assert.equal(state.autonomyRunCenter.mode, "Review-first autonomy");
  assert.equal(state.autonomyRunCenter.planStepCount, 7);
  assert.equal(state.autonomyRunCenter.routeCount, 5);
  assert.equal(state.autonomyRunCenter.gatedActionCount, 3);
  assert.equal(state.autonomyRunCenter.canDraftInternalRuns, true);
  assert.equal(state.autonomyRunCenter.canExecuteExternalActions, false);
  assert.equal(state.autonomyRunCenter.executionLocked, true);
  assert.equal(state.autonomyRunCenter.externalActionsLocked, true);
  assert.equal(state.autonomyRunCenter.planRows.some((item) => item.id === "autonomy-gate" && item.status === `${APEX_CONTROL_ROOM_APPROVAL_GATES.length} gates`), true);
  assert.equal(state.autonomyRunCenter.routeRows.some((item) => item.id === "autonomy-route-agent-plane"), true);
  assert.equal(state.autonomyRunCenter.gateRows.some((item) => item.id === "autonomy-customer-visible" && item.status === "Approval gate"), true);
  assert.equal(state.operatingSignals.some((item) => item.id === "autonomy-run-center"), true);
  assert.equal(state.agents.some((item) => item.id === "autonomy-run-center"), true);
  assert.equal(state.liveOperatorMode.status, "Live operator ready");
  assert.equal(state.liveOperatorMode.mode, "Body-first review-first operator");
  assert.equal(state.liveOperatorMode.foundationPercent, 94);
  assert.equal(state.liveOperatorMode.jarvisBehaviorPercent, 80);
  assert.equal(state.liveOperatorMode.readinessRows.length, 6);
  assert.equal(state.liveOperatorMode.operatorLoopRows.length, 13);
  assert.equal(state.liveOperatorMode.gapRows.length, 4);
  assert.equal(state.liveOperatorMode.readinessRows.some((item) => item.id === "live-run-ledger" && item.status === "Ready"), true);
  assert.equal(state.liveOperatorMode.operatorLoopRows.some((item) => item.id === "live-loop-save"), true);
  assert.equal(state.liveOperatorMode.readinessRows.some((item) => item.id === "live-voice-loop" && /interruption-aware turn memory/i.test(item.detail)), true);
  assert.equal(state.liveOperatorMode.operatorLoopRows.some((item) => item.id === "live-loop-interrupt" && item.status === "Barge-in memory"), true);
  assert.equal(state.liveOperatorMode.operatorLoopRows.some((item) => item.id === "live-loop-cycle" && item.status === "Private cycle"), true);
  assert.equal(state.liveOperatorMode.operatorLoopRows.some((item) => item.id === "live-loop-auto-prep" && item.status === "Private-only"), true);
  assert.equal(state.liveOperatorMode.operatorLoopRows.some((item) => item.id === "live-loop-proof-check" && item.status === "Private proof"), true);
  assert.equal(state.liveOperatorMode.operatorLoopRows.some((item) => item.id === "live-loop-validate" && item.status === "Proof-backed"), true);
  assert.equal(state.liveOperatorMode.readinessRows.some((item) => item.id === "live-memory" && /Apex body turns/i.test(item.detail)), true);
  assert.equal(state.liveOperatorMode.operatorLoopRows.some((item) => item.id === "live-loop-remember" && /suggested turn memory/i.test(item.detail)), true);
  assert.equal(state.liveOperatorMode.gapRows.some((item) => item.id === "live-gap-execution" && item.status === "Approval-gated"), true);
  assert.equal(state.liveOperatorMode.gapRows.some((item) => item.id === "live-gap-proactive" && item.status === "Auto-checking"), true);
  assert.equal(state.liveOperatorMode.gapRows.some((item) => item.id === "live-gap-provider-reliability" && item.status === "Caption fallback"), true);
  assert.equal(state.liveOperatorMode.externalActionsLocked, true);
  assert.equal(state.liveOperatorMode.executionLocked, true);
  assert.equal(state.operatingSignals.some((item) => item.id === "live-operator-mode"), true);
  assert.equal(state.agents.some((item) => item.id === "live-operator-mode"), true);
  assert.equal(state.approvals.length, APEX_CONTROL_ROOM_APPROVAL_GATES.length);
  assert.equal(state.evidence[0].id, "AUD-BUILD");
});

test("deriveApexControlRoomState includes saved autonomy run ledger rows", () => {
  const state = deriveApexControlRoomState({
    user: { name: "John Berlanga", role: "Owner", operatorAccess: true },
    permissions: {
      apexOs: { canView: true, canManage: true },
      aiOffice: { canView: true },
      settings: { canView: true, canManage: true },
    },
    companySettings: {
      apexOsAutonomyRuns: [
        {
          id: "AAR-ACTIVE",
          title: "Tracked Apex run",
          request: "Turn the next UI polish request into a saved run.",
          routeId: "agents",
          routeLabel: "Agents",
          sourceLabel: "Run Center",
          status: "drafting",
          evidence: ["Internal draft package linked for review."],
          linkedAgentControlRequestId: "AAC-1",
          linkedExecutionHandoffId: "AEH-1",
          updatedAt: "2026-06-04T10:00:00.000Z",
        },
        {
          id: "AAR-DONE",
          title: "Finished run",
          request: "Record a completed run.",
          routeId: "release",
          routeLabel: "Release",
          sourceLabel: "Run Center",
          status: "done",
          resultReport: "Completed after review.",
          updatedAt: "2026-06-04T09:00:00.000Z",
        },
      ],
    },
  });

  assert.equal(state.autonomyRunCenter.status, "Autonomy runs active");
  assert.equal(state.autonomyRunCenter.runSummary.total, 2);
  assert.equal(state.autonomyRunCenter.runSummary.active, 1);
  assert.equal(state.autonomyRunCenter.runSummary.drafting, 1);
  assert.equal(state.autonomyRunCenter.runSummary.done, 1);
  assert.equal(state.autonomyRunCenter.runRows[0].id, "AAR-ACTIVE");
  assert.equal(state.autonomyRunCenter.latestRun.id, "AAR-ACTIVE");
  assert.equal(state.autonomyRunCenter.runRows[0].executionLocked, true);
  assert.equal(state.autonomyRunCenter.runRows[0].externalActionsLocked, true);
  assert.equal(state.autonomyRunCenter.runRows[0].progress.totalCount, 7);
  assert.equal(state.autonomyRunCenter.runRows[0].progress.linkedDraftCount, 2);
  assert.equal(state.autonomyRunCenter.runRows[0].steps.length, 7);
  assert.equal(state.autonomyRunCenter.runRows[0].evidence.length >= 1, true);
  assert.equal(state.autonomyRunCenter.runRows[1].progress.progressPercent, 100);
  assert.equal(state.autonomyRunCenter.runRows[1].progress.activeStepTitle, "Run reported complete");
  assert.equal(state.autonomyRunCenter.runRows[1].progress.activeStepStatus, "done");
  assert.equal(state.autonomyRunCenter.runRows[1].progress.hasResultReport, true);
  assert.equal(state.liveOperatorMode.status, "Live operator running");
  assert.equal(state.liveOperatorMode.savedRunCount, 2);
  assert.equal(state.liveOperatorMode.activeRunCount, 1);
  assert.equal(state.liveOperatorMode.jarvisBehaviorPercent, 88);
  assert.equal(state.liveOperatorMode.readinessRows.some((item) => item.id === "live-run-ledger" && item.status === "2 saved"), true);
  assert.equal(state.liveOperatorMode.operatorLoopRows.some((item) => item.id === "live-loop-save" && item.status === "2 saved"), true);
  assert.equal(state.liveOperatorMode.operatorLoopRows.some((item) => item.id === "live-loop-report" && item.status === "Report-ready"), true);
});

test("deriveApexControlRoomState includes durable Apex OS decision memory summary", () => {
  const state = deriveApexControlRoomState({
    user: { name: "John Berlanga", role: "Owner", operatorAccess: true },
    permissions: {
      apexOs: { canView: true, canManage: true },
      aiOffice: { canView: true },
      settings: { canView: true, canManage: true },
    },
    companySettings: {
      apexOsMemory: [
        {
          id: "AOM-1",
          category: "product-identity",
          title: "Private operating center",
          body: "Apex OS is private to John/operator access.",
          sourceLabel: "Apex OS master plan",
          sourceUri: "docs/APEX_HQ_APEX_OS_COMMAND_CENTER_MASTER_PLAN.md",
          status: "approved",
          createdAt: "2026-06-02T01:00:00.000Z",
          approvedAt: "2026-06-02T01:05:00.000Z",
        },
        {
          id: "AOM-2",
          category: "business-goal",
          title: "Launch queue",
          body: "Launch work remains approval gated.",
          sourceLabel: "Living plan",
          status: "suggested",
        },
        {
          id: "AOM-3",
          category: "personal-preference",
          title: "Prefer phase discipline",
          body: "Work phase by phase before jumping ahead.",
          sourceLabel: "John instruction",
          status: "archived",
        },
        {
          id: "AOM-KV-1",
          category: "app-docs",
          title: "Knowledge upload",
          body: "This belongs to the vault and should not appear as a Phase 4 decision row.",
          sourceLabel: "Vault upload",
          status: "approved",
        },
      ],
    },
  });

  assert.equal(state.decisionMemory.status, "Durable memory active");
  assert.equal(state.decisionMemory.durableCount, 3);
  assert.equal(state.decisionMemory.durableEntries.length, 3);
  assert.equal(state.decisionMemory.approvedCount, 1);
  assert.equal(state.decisionMemory.suggestedCount, 1);
  assert.equal(state.decisionMemory.archivedCount, 1);
  assert.equal(state.decisionMemory.sourceCount, 3);
  assert.deepEqual(state.decisionMemory.sourceOptions, ["Apex OS master plan", "John instruction", "Living plan"]);
  assert.equal(state.decisionMemory.reviewHistory.length, 3);
  assert.equal(state.decisionMemory.durableDecisions[0].category, "Product identity");
  assert.equal(state.decisionMemory.durableDecisions[0].recordedAt, "2026-06-02T01:05:00.000Z");
  assert.equal(state.decisionMemory.durableEntries.some((entry) => entry.category === "app-docs"), false);
  assert.equal(state.nextBestActions.find((item) => item.id === "memory-review")?.status, "Durable");
  assert.equal(state.knowledgeVault.status, "Knowledge intelligence ready");
  assert.equal(state.knowledgeVault.memorySummary.total, 4);
  assert.equal(state.knowledgeVault.memorySummary.approved, 2);
  assert.equal(state.knowledgeVault.memorySummary.suggested, 1);
  assert.equal(state.knowledgeVault.memorySummary.archived, 1);
  assert.equal(state.knowledgeVault.vaultSummary.total, 1);
  assert.equal(state.knowledgeVault.intelligenceSummary.trustedCount, 2);
  assert.equal(state.knowledgeVault.intelligenceSummary.rankedCount >= 1, true);
});

test("deriveApexControlRoomState builds Phase 16 personal operating layer from explicit preference memory", () => {
  const state = deriveApexControlRoomState({
    user: { name: "John Berlanga", role: "Owner", operatorAccess: true },
    permissions: {
      apexOs: { canView: true, canManage: true },
      aiOffice: { canView: true },
      settings: { canView: true, canManage: true },
    },
    companySettings: {
      apexOsMemory: [
        {
          id: "AOM-PREF-1",
          category: "personal-preference",
          title: "Short progress updates",
          body: "Keep updates short while work is running, then give the verified result.",
          sourceType: "personal-operating-layer",
          sourceLabel: "John instruction",
          sourceUri: "chat:phase-16",
          status: "approved",
          createdAt: "2026-06-03T11:00:00.000Z",
          approvedAt: "2026-06-03T11:05:00.000Z",
        },
        {
          id: "AOM-PREF-2",
          category: "personal-preference",
          title: "Ask before external actions",
          body: "External actions need explicit approval before they happen.",
          sourceLabel: "Apex OS safety",
          status: "suggested",
          createdAt: "2026-06-03T11:10:00.000Z",
        },
        {
          id: "AOM-PREF-3",
          category: "personal-preference",
          title: "Old preference",
          body: "Archived personal operating note.",
          sourceLabel: "Older note",
          status: "archived",
          createdAt: "2026-06-03T10:00:00.000Z",
        },
      ],
    },
  });

  assert.equal(state.personalOperatingLayer.status, "Personal preferences active");
  assert.equal(state.personalOperatingLayer.approvedCount, 1);
  assert.equal(state.personalOperatingLayer.suggestedCount, 1);
  assert.equal(state.personalOperatingLayer.archivedCount, 1);
  assert.equal(state.personalOperatingLayer.reviewCount, 3);
  assert.equal(state.personalOperatingLayer.preferenceCount, APEX_OS_PERSONAL_OPERATING_SEED_ROWS.length + 1);
  assert.deepEqual(state.personalOperatingLayer.sourceOptions, ["Apex OS safety", "John instruction", "Older note"]);
  assert.equal(state.personalOperatingLayer.preferenceRows.some((item) => item.title === "Short progress updates" && item.status === "approved"), true);
  assert.equal(state.personalOperatingLayer.reviewRows.some((item) => item.title === "Ask before external actions" && item.status === "suggested"), true);
  assert.equal(state.personalOperatingLayer.canStoreSensitiveTracking, false);
  assert.equal(state.personalOperatingLayer.hiddenTrackingEnabled, false);
  assert.equal(state.personalOperatingLayer.backgroundExecutionEnabled, false);
});

test("deriveApexControlRoomState summarizes durable knowledge upload vault rows", () => {
  const state = deriveApexControlRoomState({
    user: { name: "John Berlanga", role: "Owner", operatorAccess: true },
    permissions: {
      apexOs: { canView: true, canManage: true },
      aiOffice: { canView: true },
    },
    companySettings: {
      apexOsMemory: [
        {
          id: "AOM-KV-1",
          category: "app-docs",
          title: "Phase 5 notes",
          body: "Knowledge Upload Vault supports reviewed private intake.",
          sourceType: "knowledge-upload",
          sourceLabel: "phase-5.md",
          sourceUri: "local-upload:phase-5.md",
          status: "suggested",
          reviewNote: "Summary pending.",
        },
        {
          id: "AOM-KV-2",
          category: "marketing-sales",
          title: "Demo narrative",
          body: "Founder-led demo notes for Apex HQ.",
          sourceType: "manual",
          sourceLabel: "Sales notes",
          status: "approved",
          reviewNote: "Trusted.",
        },
      ],
    },
  });

  assert.equal(state.knowledgeVault.status, "Knowledge intelligence ready");
  assert.equal(state.knowledgeVault.vaultSummary.total, 2);
  assert.equal(state.knowledgeVault.vaultSummary.trusted, 1);
  assert.equal(state.knowledgeVault.vaultSummary.suggested, 1);
  assert.equal(state.knowledgeVault.vaultSummary.reviewHistory.length, 2);
  assert.equal(state.knowledgeVault.intelligenceSummary.status, "Source-ranked");
  assert.equal(state.knowledgeVault.intelligenceSummary.rankedCount, 2);
  assert.equal(state.knowledgeVault.intelligenceSummary.conflictCount, 0);
  assert.deepEqual(state.knowledgeVault.sourceOptions, ["phase-5.md", "Sales notes"]);
  assert.deepEqual(state.knowledgeVault.vaultEntries.map((entry) => entry.title), ["Phase 5 notes", "Demo narrative"]);
});

test("deriveApexControlRoomState feeds Phase 10 from approved business memory only", () => {
  const state = deriveApexControlRoomState({
    user: { name: "John Berlanga", role: "Owner", operatorAccess: true },
    permissions: {
      apexOs: { canView: true, canManage: true },
      aiOffice: { canView: true },
      settings: { canView: true, canManage: true },
    },
    companySettings: {
      apexOsMemory: [
        {
          id: "AOM-BIZ-1",
          category: "business-goal",
          title: "Founder-led launch focus",
          body: "Use founder-led demos and controlled pilots before wider public launch.",
          sourceLabel: "Living finish plan",
          status: "approved",
        },
        {
          id: "AOM-BIZ-2",
          category: "marketing-sales",
          title: "Demo proof narrative",
          body: "Use proof assets and objection notes as private draft context.",
          sourceType: "knowledge-upload",
          sourceLabel: "Sales notes",
          status: "approved",
        },
        {
          id: "AOM-BIZ-3",
          category: "marketing-sales",
          title: "Suggested only",
          body: "This should not be trusted yet.",
          sourceLabel: "Unreviewed note",
          status: "suggested",
        },
        {
          id: "AOM-BIZ-4",
          category: "product-identity",
          title: "Not a business queue source",
          body: "Product identity rows should stay out of Phase 10 business source memory.",
          sourceLabel: "Master plan",
          status: "approved",
        },
      ],
    },
  });

  assert.equal(state.businessCommandCenter.status, "Source-backed");
  assert.equal(state.businessCommandCenter.memorySourceCount, 2);
  assert.deepEqual(state.businessCommandCenter.memoryRows.map((row) => row.title), ["Founder-led launch focus", "Demo proof narrative"]);
  assert.equal(state.businessCommandCenter.memoryRows.some((row) => row.title === "Suggested only"), false);
  assert.equal(state.businessCommandCenter.launchRows.some((row) => row.id === "knowledge-sources" && row.status === "2 approved"), true);
  assert.equal(state.businessCommandCenter.approvalDraftRows.some((row) => row.id === "customer-visible-packet-draft" && row.status === "Packet required"), true);
});

test("deriveApexControlRoomState includes durable Apex OS approval packet summary", () => {
  const state = deriveApexControlRoomState({
    user: { name: "John Berlanga", role: "Owner", operatorAccess: true },
    permissions: {
      apexOs: { canView: true, canManage: true },
      aiOffice: { canView: true },
      settings: { canView: true, canManage: true },
    },
    companySettings: {
      apexOsApprovalPackets: [
        {
          id: "AAP-1",
          title: "Deploy Apex OS",
          action: "Deploy the private Apex OS package after gates pass.",
          status: "ready",
          sourceLabel: "Release Desk",
        },
        {
          id: "AAP-2",
          title: "Provider setup",
          action: "Prepare provider setup review.",
          status: "draft",
          sourceLabel: "Provider checklist",
        },
        {
          id: "AAP-3",
          title: "Billing packet",
          action: "Approve billing setup for review record only.",
          status: "approved",
          sourceLabel: "Billing checklist",
        },
      ],
    },
  });

  assert.equal(state.approvalCommandCenter.status, "Approval decisions active");
  assert.equal(state.approvalCommandCenter.packetSummary.total, 3);
  assert.equal(state.approvalCommandCenter.packetSummary.ready, 1);
  assert.equal(state.approvalCommandCenter.packetSummary.draft, 1);
  assert.equal(state.approvalCommandCenter.packetSummary.approved, 1);
  assert.equal(state.approvalCommandCenter.templateRows.length >= 5, true);
});

test("deriveApexControlRoomState includes durable Apex OS execution handoff summary", () => {
  const state = deriveApexControlRoomState({
    user: { name: "John Berlanga", role: "Owner", operatorAccess: true },
    permissions: {
      apexOs: { canView: true, canManage: true },
      aiOffice: { canView: true },
      settings: { canView: true, canManage: true },
    },
    companySettings: {
      apexOsExecutionHandoffs: [
        {
          id: "AEH-1",
          title: "Build handoff",
          objective: "Prepare the next local Apex OS slice.",
          status: "ready",
          sourceLabel: "Apex OS plan",
          sourceEvidence: "Living plan and approval packet.",
          allowedActions: "Read files and run local tests.",
          blockedActions: "No deploy, sends, spend, provider setup, production mutation, or customer-visible changes.",
          validationPlan: "Run focused tests and browser QA.",
          rollbackPlan: "Revert the branch commit.",
          handoffPrompt: "Continue the local build slice only.",
        },
        {
          id: "AEH-2",
          title: "Business draft",
          objective: "Prepare launch copy drafts.",
          status: "draft",
          sourceLabel: "Business command center",
        },
      ],
    },
  });

  assert.equal(state.executionHandoffs.status, "Handoff drafts active");
  assert.equal(state.executionHandoffs.handoffSummary.total, 2);
  assert.equal(state.executionHandoffs.handoffSummary.ready, 1);
  assert.equal(state.executionHandoffs.handoffSummary.draft, 1);
  assert.equal(state.executionHandoffs.handoffSummary.finished, 0);
});

test("deriveApexControlRoomState summarizes finished execution handoff results", () => {
  const state = deriveApexControlRoomState({
    user: { name: "John Berlanga", role: "Owner", operatorAccess: true },
    permissions: {
      apexOs: { canView: true, canManage: true },
      aiOffice: { canView: true },
      settings: { canView: true, canManage: true },
    },
    companySettings: {
      apexOsExecutionHandoffs: [
        {
          id: "AEH-FINISHED",
          title: "Finished handoff",
          objective: "Finish Phase 14 safely.",
          status: "ready",
          workstreamStatus: "finished",
          sourceLabel: "Apex OS plan",
          sourceEvidence: "Master plan.",
          allowedActions: "Read files, edit docs, run local tests.",
          blockedActions: "No deploy, sends, spend, provider setup, production mutation, or customer-visible changes.",
          validationPlan: "Run focused checks.",
          validationResults: "Focused checks passed.",
          rollbackPlan: "Revert commit.",
          resultReport: "Phase 14 finished locally.",
          handoffPrompt: "Report result.",
          decisionMemoryId: "AOM-FINISHED",
        },
      ],
    },
  });

  assert.equal(state.executionHandoffs.status, "Finished handoffs captured");
  assert.equal(state.executionHandoffs.handoffSummary.finished, 1);
  assert.equal(state.operatingSignals.some((row) => row.id === "execution-handoffs" && /finished/i.test(row.detail)), true);
});

test("deriveApexControlRoomState includes Phase 7 agent control plane roster and requests", () => {
  const state = deriveApexControlRoomState({
    user: { name: "John Berlanga", role: "Owner", operatorAccess: true },
    permissions: {
      apexOs: { canView: true, canManage: true },
      aiOffice: { canView: true },
      settings: { canView: true, canManage: true },
    },
    auditEvents: [
      {
        id: "AUDIT-RUN-QA",
        entityType: "agentOsRun",
        entityId: "RUN-QA-1",
        action: "agent.os.run.running",
        summary: "QA run in progress.",
        createdAt: "2026-06-03T10:00:00.000Z",
        detail: JSON.stringify({
          run: {
            id: "RUN-QA-1",
            agentRole: "qa",
            actionLabel: "QA sweep",
            status: "running",
            summary: "Focused QA is running.",
          },
        }),
      },
    ],
    companySettings: {
      apexOsExecutionHandoffs: [
        {
          id: "AEH-RELEASE",
          title: "Release handoff",
          agentRole: "release",
          objective: "Prepare the release handoff after approval.",
          status: "ready",
          sourceLabel: "Release Desk",
        },
      ],
      apexOsAgentControlRequests: [
        {
          id: "AAC-MARKETING",
          title: "Pause marketing",
          requestType: "pause",
          agentRole: "marketing",
          objective: "Pause launch content work.",
          scope: "Apex OS launch content only.",
          validationPlan: "Confirm content scope.",
          rollbackPlan: "Resume request.",
          sourceLabel: "Operator",
          status: "requested",
        },
      ],
    },
  });

  assert.equal(state.agentControlPlane.status, "Control plane active");
  assert.equal(state.agentControlPlane.rosterRows.length, 7);
  assert.equal(state.agentControlPlane.requestSummary.pause, 1);
  assert.equal(state.agentControlPlane.rosterRows.find((row) => row.id === "marketing").status, "paused");
  assert.equal(state.agentControlPlane.rosterRows.find((row) => row.id === "release").status, "needs approval");
  assert.equal(state.agentControlPlane.safetyRows.some((row) => row.id === "scoped-requests-only"), true);
  assert.equal(state.operatingSignals.some((row) => row.id === "agent-control-plane"), true);
});
