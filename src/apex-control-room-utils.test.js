import assert from "node:assert/strict";
import test from "node:test";

import {
  APEX_CONTROL_ROOM_APPROVAL_GATES,
  APEX_OS_BUSINESS_GATES,
  APEX_OS_BUSINESS_QUEUE_ROWS,
  APEX_OS_CHAT_ACTION_LOCKS,
  APEX_OS_CHAT_CONTEXTS,
  APEX_OS_APPROVAL_CONTROL_LOCKS,
  APEX_OS_APPROVAL_PACKET_FIELDS,
  APEX_OS_MEMORY_SOURCE,
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
  assert.deepEqual(state.operatingSignals, []);
  assert.deepEqual(state.nextBestActions, []);
  assert.deepEqual(state.launchReadiness.gates, []);
  assert.deepEqual(state.decisionMemory.decisions, []);
  assert.deepEqual(state.decisionMemory.rules, []);
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
  assert.deepEqual(state.releaseMonitoring.readinessRows, []);
  assert.deepEqual(state.releaseMonitoring.briefingRows, []);
  assert.deepEqual(state.releaseMonitoring.releasePacketRows, []);
  assert.deepEqual(state.releaseMonitoring.lockRows, []);
  assert.deepEqual(state.businessCommandCenter.queueRows, []);
  assert.deepEqual(state.businessCommandCenter.gateRows, []);
  assert.deepEqual(state.businessCommandCenter.launchRows, []);
  assert.deepEqual(state.businessCommandCenter.briefingRows, []);
  assert.deepEqual(state.qaSecurityHardening.evidenceRows, []);
  assert.deepEqual(state.qaSecurityHardening.lockRows, []);
  assert.deepEqual(state.agentWorkQueue.taskRows, []);
  assert.deepEqual(state.agentWorkQueue.runRows, []);
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
    companySettings: { packageName: "Apex HQ Owner" },
  });

  assert.equal(state.canView, true);
  assert.equal(state.operatorName, "John Berlanga");
  assert.equal(state.kpis.find((item) => item.id === "queue")?.value, "2");
  assert.match(state.kpis.find((item) => item.id === "queue")?.detail || "", /1 blocked/);
  assert.equal(state.kpis.find((item) => item.id === "workspace")?.value, "4");
  assert.match(state.agents.find((item) => item.id === "agent-os")?.detail || "", /recent run rows visible/);
  assert.equal(state.operatingSignals.find((item) => item.id === "state-aggregator"), undefined);
  assert.equal(state.operatingSignals.find((item) => item.id === "agent-tasks")?.status, "10 available");
  assert.match(state.operatingSignals.find((item) => item.id === "agent-tasks")?.detail || "", /10 visible targets/);
  assert.equal(state.operatingSignals.find((item) => item.id === "launch-readiness")?.status, "Launch locked");
  assert.equal(state.operatingSignals.find((item) => item.id === "decision-memory")?.status, "Seeded from plan");
  assert.equal(state.operatingSignals.find((item) => item.id === "knowledge-vault")?.status, "First UI ready");
  assert.equal(state.operatingSignals.find((item) => item.id === "ask-apex-chat")?.status, "Source-backed live");
  assert.equal(state.operatingSignals.find((item) => item.id === "voice-interface")?.status, "First UI ready");
  assert.equal(state.operatingSignals.find((item) => item.id === "approval-command-center")?.status, "First UI ready");
  assert.equal(state.operatingSignals.find((item) => item.id === "release-monitoring")?.status, "First UI ready");
  assert.equal(state.operatingSignals.find((item) => item.id === "business-command-center")?.status, "First UI ready");
  assert.equal(state.operatingSignals.find((item) => item.id === "qa-security-hardening")?.status, "Hardening evidence ready");
  assert.equal(state.priorities.find((item) => item.id === "agent-work-queue")?.status, "Review-only");
  assert.equal(state.priorities.find((item) => item.id === "knowledge-vault")?.status, "First UI ready");
  assert.equal(state.priorities.find((item) => item.id === "provider-work")?.status, "Source-backed live");
  assert.equal(state.priorities.find((item) => item.id === "voice-interface")?.status, "First UI ready");
  assert.equal(state.priorities.find((item) => item.id === "approval-command-center")?.status, "First UI ready");
  assert.equal(state.priorities.find((item) => item.id === "release-monitoring")?.status, "First UI ready");
  assert.equal(state.priorities.find((item) => item.id === "business-command-center")?.status, "First UI ready");
  assert.equal(state.priorities.find((item) => item.id === "qa-security-hardening")?.status, "Hardening evidence ready");
  assert.equal(state.releaseDesk.status, "Manual release only");
  assert.equal(state.releaseDesk.sections.length, 3);
  assert.equal(state.launchReadiness.blockedCount > 0, true);
  assert.equal(state.launchReadiness.gates.length, 4);
  assert.match(state.nextBestActions.find((item) => item.id === "release-approval")?.detail || "", /John approval/);
  assert.match(state.nextBestActions.find((item) => item.id === "memory-review")?.detail || "", /approve\/archive memory/);
  assert.equal(state.nextBestActions.find((item) => item.id === "ask-apex-chat-plan")?.status, "Ready");
  assert.equal(state.nextBestActions.find((item) => item.id === "voice-interface-plan")?.status, "Ready");
  assert.equal(state.nextBestActions.find((item) => item.id === "approval-command-center-plan")?.status, "Ready");
  assert.equal(state.nextBestActions.find((item) => item.id === "release-monitoring-plan")?.status, "Ready");
  assert.equal(state.nextBestActions.find((item) => item.id === "business-command-center-plan")?.status, "Ready");
  assert.equal(state.nextBestActions.find((item) => item.id === "qa-security-hardening-plan")?.status, "Ready");
  assert.equal(state.decisionMemory.status, "Seeded from plan");
  assert.equal(state.decisionMemory.source, APEX_OS_MEMORY_SOURCE);
  assert.equal(state.decisionMemory.decisionCount, 6);
  assert.equal(state.decisionMemory.ruleCount, 4);
  assert.equal(state.decisionMemory.decisions.some((item) => item.id === "private-operator-only" && item.status === "Locked"), true);
  assert.equal(state.decisionMemory.rules.some((item) => item.id === "field-boundary" && item.status === "Locked"), true);
  assert.equal(state.knowledgeVault.status, "First UI ready");
  assert.equal(state.knowledgeVault.categoryCount, 8);
  assert.equal(state.knowledgeVault.sourceCount, 4);
  assert.equal(state.knowledgeVault.lockedRuleCount, 3);
  assert.equal(state.knowledgeVault.categories.some((item) => item.id === "private-owner-notes" && item.status === "Private"), true);
  assert.equal(state.knowledgeVault.safetyRows.some((item) => item.id === "no-storage-yet" && item.status === "Locked"), true);
  assert.equal(state.knowledgeVault.safetyRows.some((item) => item.id === "no-secrets" && item.status === "Locked"), true);
  assert.equal(state.knowledgeVault.sourceRows.some((item) => item.id === "future-uploads" && item.status === "Approval required"), true);
  assert.equal(state.askApexChat.status, "Source-backed live");
  assert.equal(state.askApexChat.providerStatus, "Server-only provider");
  assert.equal(state.askApexChat.contextCount, APEX_OS_CHAT_CONTEXTS.length);
  assert.equal(state.askApexChat.evidenceCount, 6);
  assert.equal(state.askApexChat.actionLockCount, APEX_OS_CHAT_ACTION_LOCKS.length);
  assert.match(state.askApexChat.placeholder, /app, roadmap, agents, launch, business/);
  assert.equal(state.askApexChat.contexts.some((item) => item.id === "all" && item.status === "Review required"), true);
  assert.equal(state.askApexChat.evidenceRows.some((item) => item.id === "knowledge-vault" && item.status === "First UI ready"), true);
  assert.equal(state.askApexChat.evidenceRows.some((item) => item.id === "launch-readiness" && item.status === "Launch locked"), true);
  assert.equal(state.askApexChat.actionLocks.some((item) => item.id === "ask-provider" && item.status === "Server-only"), true);
  assert.equal(state.askApexChat.actionLocks.some((item) => item.id === "save-decision" && item.status === "Approval required"), true);
  assert.equal(state.askApexChat.actionLocks.some((item) => item.id === "create-task" && item.status === "Approval required"), true);
  assert.match(state.askApexChat.answerPreview.detail, /Apex answers from approved memory and source labels/);
  assert.equal(state.voiceInterface.status, "First UI ready");
  assert.equal(state.voiceInterface.providerStatus, "Speech provider locked");
  assert.equal(state.voiceInterface.modeCount, APEX_OS_VOICE_MODES.length);
  assert.equal(state.voiceInterface.safetyCount, APEX_OS_VOICE_SAFETY_GATES.length);
  assert.equal(state.voiceInterface.transcriptStatus, "Confirmation required");
  assert.equal(state.voiceInterface.answerStatus, "Ask Apex ready");
  assert.match(state.voiceInterface.prompt, /Hold to talk/);
  assert.match(state.voiceInterface.transcriptPreview, /Transcript preview waits here/);
  assert.equal(state.voiceInterface.modes.some((item) => item.id === "push-to-talk" && item.status === "Planned"), true);
  assert.equal(state.voiceInterface.modes.some((item) => item.id === "risky-command-confirmation" && item.status === "Locked"), true);
  assert.equal(state.voiceInterface.safetyRows.some((item) => item.id === "no-microphone" && item.status === "Locked"), true);
  assert.equal(state.voiceInterface.safetyRows.some((item) => item.id === "no-always-listening" && item.status === "Locked"), true);
  assert.equal(state.voiceInterface.safetyRows.some((item) => item.id === "no-speech-provider" && item.status === "Approval required"), true);
  assert.equal(state.approvalCommandCenter.status, "First UI ready");
  assert.equal(state.approvalCommandCenter.queueCount, APEX_CONTROL_ROOM_APPROVAL_GATES.length);
  assert.equal(state.approvalCommandCenter.packetFieldCount, APEX_OS_APPROVAL_PACKET_FIELDS.length);
  assert.equal(state.approvalCommandCenter.controlLockCount, APEX_OS_APPROVAL_CONTROL_LOCKS.length);
  assert.equal(state.approvalCommandCenter.sourceCount, 3);
  assert.equal(state.approvalCommandCenter.queueRows.some((item) => item.id === "deploy" && item.status === "Packet required"), true);
  assert.equal(state.approvalCommandCenter.packetRows.some((item) => item.id === "rollback" && item.status === "Required"), true);
  assert.equal(state.approvalCommandCenter.packetRows.some((item) => item.id === "approval-phrase" && item.status === "Required"), true);
  assert.equal(state.approvalCommandCenter.controlRows.some((item) => item.id === "approve" && item.status === "Locked"), true);
  assert.equal(state.approvalCommandCenter.controlRows.some((item) => item.id === "execute" && item.status === "Not available"), true);
  assert.equal(state.approvalCommandCenter.sourceRows.some((item) => item.id === "voice-interface" && item.status === "First UI ready"), true);
  assert.equal(state.releaseMonitoring.status, "First UI ready");
  assert.equal(state.releaseMonitoring.readinessCount, APEX_OS_RELEASE_MONITORING_CHECKS.length);
  assert.equal(state.releaseMonitoring.lockCount, APEX_OS_RELEASE_MONITORING_LOCKS.length);
  assert.equal(state.releaseMonitoring.briefingCount, 4);
  assert.equal(state.releaseMonitoring.packetCount, 4);
  assert.equal(state.releaseMonitoring.readinessRows.some((item) => item.id === "current-branch-build" && item.status === "Evidence required"), true);
  assert.equal(state.releaseMonitoring.readinessRows.some((item) => item.id === "agent-stalled" && item.status === "Review-only"), true);
  assert.equal(state.releaseMonitoring.briefingRows.some((item) => item.id === "daily-executive-brief" && item.status === "First UI ready"), true);
  assert.equal(state.releaseMonitoring.briefingRows.some((item) => item.id === "stalled-agent-watch" && item.status === "Runs visible"), true);
  assert.equal(state.releaseMonitoring.releasePacketRows.some((item) => item.id === "stop-warnings" && item.status === "10 locks"), true);
  assert.equal(state.releaseMonitoring.lockRows.some((item) => item.id === "no-deploy" && item.status === "Locked"), true);
  assert.equal(state.releaseMonitoring.lockRows.some((item) => item.id === "no-monitoring-provider" && item.status === "Approval required"), true);
  assert.equal(state.releaseMonitoring.lockRows.some((item) => item.id === "no-external-alerts" && item.status === "Locked"), true);
  assert.equal(state.businessCommandCenter.status, "First UI ready");
  assert.equal(state.businessCommandCenter.queueCount, APEX_OS_BUSINESS_QUEUE_ROWS.length);
  assert.equal(state.businessCommandCenter.gateCount, APEX_OS_BUSINESS_GATES.length);
  assert.equal(state.businessCommandCenter.launchCount, 4);
  assert.equal(state.businessCommandCenter.briefingCount, 3);
  assert.equal(state.businessCommandCenter.queueRows.some((item) => item.id === "launch-queue" && item.status === "Planning"), true);
  assert.equal(state.businessCommandCenter.queueRows.some((item) => item.id === "sales-outreach-queue" && item.status === "Draft-only"), true);
  assert.equal(state.businessCommandCenter.queueRows.some((item) => item.id === "revenue-offer-queue" && item.status === "Approval required"), true);
  assert.equal(state.businessCommandCenter.gateRows.some((item) => item.id === "manual-send" && item.status === "Locked"), true);
  assert.equal(state.businessCommandCenter.gateRows.some((item) => item.id === "no-ad-spend" && item.status === "Locked"), true);
  assert.equal(state.businessCommandCenter.gateRows.some((item) => item.id === "claims-guardrails" && item.status === "Required"), true);
  assert.equal(state.businessCommandCenter.launchRows.some((item) => item.id === "public-launch-readiness" && item.status === "Launch locked"), true);
  assert.equal(state.businessCommandCenter.briefingRows.some((item) => item.id === "manual-next-actions" && item.status === "Review required"), true);
  assert.equal(state.qaSecurityHardening.status, "Hardening evidence ready");
  assert.equal(state.qaSecurityHardening.evidenceCount, APEX_OS_QA_SECURITY_EVIDENCE_ROWS.length);
  assert.equal(state.qaSecurityHardening.lockCount, APEX_OS_QA_SECURITY_LOCKS.length);
  assert.equal(state.qaSecurityHardening.evidenceRows.some((item) => item.id === "john-only-access" && item.status === "Mapped"), true);
  assert.equal(state.qaSecurityHardening.evidenceRows.some((item) => item.id === "customer-company-isolation" && item.status === "Evidence required"), true);
  assert.equal(state.qaSecurityHardening.evidenceRows.some((item) => item.id === "direct-route-blocking" && item.status === "Evidence required"), true);
  assert.equal(state.qaSecurityHardening.evidenceRows.some((item) => item.id === "field-user-blocking" && item.status === "Locked"), true);
  assert.equal(state.qaSecurityHardening.evidenceRows.some((item) => item.id === "source-backed-answers" && item.status === "Source-backed live"), true);
  assert.equal(state.qaSecurityHardening.evidenceRows.some((item) => item.id === "upload-privacy" && item.status === "Locked"), true);
  assert.equal(state.qaSecurityHardening.evidenceRows.some((item) => item.id === "approval-gates" && item.status === "First UI ready"), true);
  assert.equal(state.qaSecurityHardening.evidenceRows.some((item) => item.id === "desktop-mobile-visual" && item.status === "Evidence required"), true);
  assert.equal(state.qaSecurityHardening.evidenceRows.some((item) => item.id === "build-test-release" && item.status === "First UI ready"), true);
  assert.equal(state.qaSecurityHardening.evidenceRows.some((item) => item.id === "no-secrets" && item.status === "Locked"), true);
  assert.equal(state.qaSecurityHardening.evidenceRows.some((item) => item.id === "no-bypass-actions" && item.status === "Locked"), true);
  assert.equal(state.qaSecurityHardening.lockRows.some((item) => item.id === "no-schema-auth-session" && item.status === "Locked"), true);
  assert.equal(state.qaSecurityHardening.lockRows.some((item) => item.id === "no-provider-api" && item.status === "Locked"), true);
  assert.equal(state.qaSecurityHardening.lockRows.some((item) => item.id === "no-production-mutation" && item.status === "Locked"), true);
  assert.equal(state.qaSecurityHardening.lockRows.some((item) => item.id === "no-money-or-sends" && item.status === "Locked"), true);
  assert.equal(state.qaSecurityHardening.lockRows.some((item) => item.id === "no-irrevocable-actions" && item.status === "Locked"), true);
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
  assert.equal(state.approvals.length, APEX_CONTROL_ROOM_APPROVAL_GATES.length);
  assert.equal(state.evidence[0].id, "AUD-3");
});

test("deriveApexControlRoomState includes durable Apex OS memory summary", () => {
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
          category: "decision",
          title: "Private operating center",
          body: "Apex OS is private to John/operator access.",
          sourceLabel: "Apex OS master plan",
          status: "approved",
        },
        {
          id: "AOM-2",
          category: "business-strategy",
          title: "Launch queue",
          body: "Launch work remains approval gated.",
          sourceLabel: "Living plan",
          status: "suggested",
        },
      ],
    },
  });

  assert.equal(state.knowledgeVault.status, "Durable memory active");
  assert.equal(state.knowledgeVault.memorySummary.total, 2);
  assert.equal(state.knowledgeVault.memorySummary.approved, 1);
  assert.equal(state.knowledgeVault.memorySummary.suggested, 1);
});
