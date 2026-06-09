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
  APEX_BUILDER_CONTROLLED_FIX_ACTION_ROWS,
  APEX_BUILDER_VALIDATION_ACTION_ROWS,
  buildApexBuilderModeState,
  buildApexSelfFixPatchHandoff,
  buildApexSelfFixRepairPrep,
  buildApexTalkToApexResponse,
  buildApexWhatChangedFeedState,
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
  assert.deepEqual(state.memorySuggestions.rows, []);
  assert.equal(state.memorySuggestions.suggestedCount, 0);
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
  assert.deepEqual(state.apexActivity.rows, []);
  assert.equal(state.apexActivity.externalActionsLocked, true);
  assert.equal(state.apexHqDomain.status, "Restricted");
  assert.deepEqual(state.apexHqDomain.rows, []);
  assert.deepEqual(state.apexHqDomain.commandRows, []);
  assert.equal(state.apexBuilderMode.status, "Restricted");
  assert.equal(state.apexBuilderMode.canRunLocalValidation, false);
  assert.equal(state.apexBuilderMode.canApplyControlledLocalFixes, false);
  assert.deepEqual(state.apexBuilderMode.summaryRows, []);
  assert.deepEqual(state.apexBuilderMode.actionRows, []);
  assert.deepEqual(state.apexBuilderMode.fixActionRows, []);
  assert.equal(state.apexPersonalOsCore.status, "Restricted");
  assert.deepEqual(state.apexPersonalOsCore.routes, []);
  assert.deepEqual(state.apexPersonalOsCore.agentRows, []);
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

test("deriveApexControlRoomState builds compact redacted Apex Activity receipts for operators", () => {
  const state = deriveApexControlRoomState({
    user: { name: "John Berlanga", role: "Owner", operatorAccess: true },
    permissions: {
      apexOs: { canView: true, canManage: true },
      aiOffice: { canView: true },
    },
    auditEvents: [
      {
        id: "AUD-ACTION-OLD",
        entityType: "apexOsInternalAction",
        entityId: "AOIA-OLD",
        action: "blocked",
        summary: "Apex OS internal action stopped",
        createdAt: "2026-06-06T11:00:00.000Z",
        detail: JSON.stringify({
          actionId: "AOIA-OLD",
          actionType: "create-task",
          status: "blocked",
          affectedRecordId: "",
          undoHint: "No private state changed.",
          receiptSummary: "Stopped private task with password: super-secret-value",
          externalActionExecuted: false,
          customerVisible: false,
        }),
      },
      {
        id: "AUD-ACTION-NEW",
        entityType: "apexOsInternalAction",
        entityId: "AOIA-NEW",
        action: "performed",
        summary: "Apex OS internal action completed",
        createdAt: "2026-06-06T12:00:00.000Z",
        detail: JSON.stringify({
          actionId: "AOIA-NEW",
          actionType: "create-reminder",
          status: "performed",
          affectedRecordId: "AOR-123",
          undoHint: "Undo by archiving AOR-123; no external notification was created.",
          receiptSummary: "Saved private reminder: Call Mike tomorrow.",
          externalActionExecuted: false,
          customerVisible: false,
        }),
      },
    ],
  });

  assert.equal(state.apexActivity.totalCount, 2);
  assert.equal(state.apexActivity.performedCount, 1);
  assert.equal(state.apexActivity.blockedCount, 1);
  assert.equal(state.apexActivity.externalActionsLocked, true);
  assert.equal(state.apexActivity.rows[0].id, "AOIA-NEW");
  assert.equal(state.apexActivity.rows[0].affectedRecordType, "reminder");
  assert.equal(state.apexActivity.rows[0].affectedRecordId, "AOR-123");
  assert.match(state.apexActivity.rows[0].undoHint, /archiving AOR-123/i);
  assert.doesNotMatch(state.apexActivity.rows[1].reason, /super-secret-value/i);
});

test("buildApexBuilderModeState summarizes local builder work and validation receipts", () => {
  const state = buildApexBuilderModeState({
    buildAwareness: {
      status: "Local changes present",
      tone: "amber",
      branch: "codex/apex-builder-mode",
      headSha: "abc1234",
      changedFileCount: 2,
      changedFiles: [
        { id: "M:src/App.jsx", path: "src/App.jsx", status: "modified" },
        { id: "??:server/apex-os-builder-mode.js", path: "server/apex-os-builder-mode.js", status: "untracked" },
      ],
      buildStatus: { title: "Build script", status: "Available", detail: "npm.cmd run build.", tone: "green" },
      testStatus: { title: "Verification scripts", status: "20 scripts", detail: "Focused checks available.", tone: "green" },
      nextSafeTask: { id: "next", title: "Next useful local action", status: "Review changes", detail: "Run focused tests.", tone: "amber" },
    },
    autonomyRunCenter: {
      runRows: [
        { id: "RUN-BUILD", routeId: "apex-builder-mode", routeLabel: "Apex Builder Mode", title: "Fix app bug", status: "validating", nextSafeAction: "Run focused tests." },
        { id: "RUN-OTHER", routeLabel: "Marketing", title: "Write copy", status: "planned" },
      ],
    },
    executionHandoffs: { tone: "blue", handoffSummary: { total: 1, ready: 1 } },
    agentControlPlane: { activeRequestCount: 0 },
    validationReceipts: [
      { id: "VR-1", commandId: "git-diff-check", label: "Diff whitespace check", status: "passed", ok: true, receipt: "Diff check passed." },
    ],
    fixReceipts: [
      {
        id: "FIX-1",
        fixId: "apex-home-copy-polish",
        label: "Apex Home copy polish",
        status: "fixed",
        historyStatus: "validated",
        ok: true,
        request: "fix stale copy",
        filesTouched: ["src/apex-control-room-components.jsx"],
        validationSummary: { commandId: "apex-home-focused-tests", status: "passed", ok: true },
        actionTaken: ["checked-exact-baseline", "applied-controlled-exact-patch"],
        whatApexDid: "Apex applied an exact scoped patch and validated it.",
        undoAvailable: true,
        undoHint: "Undo is available for Apex's own last successful scoped patch.",
        patchPreviews: [
          {
            id: "patch-1",
            targetFile: "src/apex-control-room-components.jsx",
            searchSnippet: ">Apex Builder Mode v1.1</p>",
            replacementSnippet: ">Apex Builder Mode v1.2</p>",
            explanation: "Update Builder Mode label.",
            validationCommand: { id: "apex-home-focused-tests", label: "Apex Home focused tests" },
            expectedResult: "Focused tests should pass.",
          },
        ],
        receipt: "Apex applied a controlled local fix.",
      },
    ],
    undoReceipts: [
      {
        id: "UNDO-1",
        sourceFixId: "FIX-1",
        fixId: "apex-home-copy-polish",
        label: "Local undo",
        status: "undone",
        historyStatus: "undone",
        ok: true,
        filesTouched: ["src/apex-control-room-components.jsx"],
        validationSummary: { commandId: "apex-home-focused-tests", status: "passed", ok: true },
        whatApexDid: "Apex reversed its own last successful controlled patch.",
        undoHint: "Apex completed the scoped local undo.",
        receipt: "Apex undid 1 Apex-owned controlled local patch.",
      },
    ],
  });

  assert.equal(state.status, "Builder ready");
  assert.equal(state.changedFileCount, 2);
  assert.equal(state.activeTaskCount, 1);
  assert.equal(state.builderTaskRows[0].id, "RUN-BUILD");
  assert.equal(state.dirtyFileRows.length, 2);
  assert.equal(state.recentValidationRows[0].id, "VR-1");
  assert.equal(state.recentValidationRows[0].tone, "green");
  assert.equal(state.recentFixRows[0].id, "FIX-1");
  assert.equal(state.recentFixRows[0].tone, "green");
  assert.equal(state.recentFixRows[0].status, "validated");
  assert.equal(state.recentFixRows[0].request, "fix stale copy");
  assert.deepEqual(state.recentFixRows[0].filesTouched, ["src/apex-control-room-components.jsx"]);
  assert.equal(state.recentFixRows[0].validationCommandId, "apex-home-focused-tests");
  assert.equal(state.recentFixRows[0].undoAvailable, true);
  assert.equal(state.recentFixRows[0].patchPreviewCount, 1);
  assert.match(state.recentFixRows[0].whatApexDid, /validated/i);
  assert.equal(state.patchPreviewRows[0].targetFile, "src/apex-control-room-components.jsx");
  assert.match(state.patchPreviewRows[0].replacementSnippet, /v1\.2/);
  assert.equal(state.latestSuccessfulFix.id, "FIX-1");
  assert.equal(state.recentUndoRows[0].id, "UNDO-1");
  assert.equal(state.activityRows.some((row) => /What Apex Undid/i.test(row.title)), true);
  assert.match(state.activityRows[0].title, /What Apex Did/i);
  assert.equal(state.actionRows.some((row) => row.id === "build"), true);
  assert.equal(state.fixActionRows.length, APEX_BUILDER_CONTROLLED_FIX_ACTION_ROWS.length);
  assert.equal(state.fixActionRows.some((row) => row.id === "apex-home-copy-polish"), true);
  assert.equal(state.fixActionRows.some((row) => row.id === "builder-receipt-history-display"), true);
  assert.equal(state.fixActionRows.some((row) => row.id === "layout-overflow-guard"), true);
  assert.equal(state.canRunLocalValidation, true);
  assert.equal(state.canApplyControlledLocalFixes, true);
  assert.equal(state.canUndoControlledLocalFixes, true);
  assert.equal(state.canEditFiles, false);
  assert.equal(state.canDeploy, false);
  assert.equal(state.blockedRows.some((row) => /customer-visible/i.test(row.title)), true);
});

test("buildApexBuilderModeState strips deploy and git release language from next action copy", () => {
  const state = buildApexBuilderModeState({
    buildAwareness: {
      nextSafeTask: {
        id: "unsafe-next",
        title: "Next useful local action",
        status: "Ready",
        detail: "Validate it, document it, commit, push, and deploy before the next phase.",
        tone: "green",
      },
    },
  });

  assert.equal(state.nextAction.status, "Local only");
  assert.match(state.nextAction.detail, /Run focused local validation/i);
  assert.match(state.nextAction.detail, /stay outside Builder Mode/i);
});

test("buildApexWhatChangedFeedState aggregates compact operator activity without raw private content", () => {
  const builder = buildApexBuilderModeState({
    validationReceipts: [
      { id: "VAL-1", commandId: "git-diff-check", label: "Diff whitespace check", status: "passed", ok: true, receipt: "Diff passed locally." },
    ],
    fixReceipts: [
      {
        id: "FIX-1",
        fixId: "apex-home-copy-polish",
        label: "Apex Home copy polish",
        status: "fixed",
        historyStatus: "validated",
        ok: true,
        patchPreviews: [
          {
            id: "PATCH-1",
            targetFile: "src/apex-control-room-components.jsx",
            searchSnippet: "old safe copy",
            replacementSnippet: "new safe copy",
            explanation: "Update safe visible copy.",
          },
        ],
        receipt: "Apex applied a controlled local fix.",
        whatApexDid: "Apex applied a scoped patch and validated it.",
      },
    ],
    undoReceipts: [
      {
        id: "UNDO-1",
        sourceFixId: "FIX-1",
        status: "undone",
        ok: true,
        receipt: "Apex undid its own scoped patch.",
        whatApexDid: "Apex reversed its own last successful controlled patch.",
      },
    ],
  });

  const feed = buildApexWhatChangedFeedState({
    state: {
      apexActivity: {
        rows: [
          { id: "ACT-1", actionType: "create-reminder", affectedRecordType: "reminder", status: "performed", reason: "Saved reminder without secret-token-value." },
        ],
      },
      apexHqDomain: { status: "Business workspace ready", tone: "green", summary: "Apex can route to Apex HQ modules." },
      askApexChat: { providerStatus: "Local-first Ollama" },
    },
    builderMode: builder,
    validationReceipts: [{ id: "VAL-1", commandId: "git-diff-check", label: "Diff whitespace check", status: "passed", ok: true, receipt: "Diff passed locally." }],
    fixReceipts: [{
      id: "FIX-1",
      fixId: "apex-home-copy-polish",
      label: "Apex Home copy polish",
      status: "fixed",
      historyStatus: "validated",
      ok: true,
      receipt: "Apex applied a controlled local fix.",
      whatApexDid: "Apex applied a scoped patch and validated it.",
    }],
    undoReceipts: [{ id: "UNDO-1", sourceFixId: "FIX-1", status: "undone", ok: true, receipt: "Apex undid its own scoped patch." }],
    commandEvents: [{ id: "CMD-1", domain: "Apex HQ", title: "Show Apex HQ", detail: "Opened business workspace.", status: "active", panelId: "apex-hq" }],
  });

  assert.equal(feed.status, "Feed ready");
  assert.equal(feed.entries.some((entry) => entry.domain === "Builder" && /Apex Home copy polish|scoped patch/i.test(`${entry.title} ${entry.detail}`)), true);
  assert.equal(feed.entries.some((entry) => entry.title.includes("Patch preview")), true);
  assert.equal(feed.entries.some((entry) => /Undid local patch|Undo blocked/i.test(entry.title)), true);
  assert.equal(feed.entries.some((entry) => entry.domain === "Apex HQ"), true);
  assert.equal(feed.entries.some((entry) => entry.title === "Local intelligence"), true);
  assert.equal(feed.surfaceRows.some((row) => row.id === "second-monitor" && /Placeholder/i.test(row.status)), true);
  assert.doesNotMatch(JSON.stringify(feed), /secret-token-value/);
});

test("buildApexTalkToApexResponse summarizes What Changed conversationally without opening panels", () => {
  const feed = buildApexWhatChangedFeedState({
    state: {
      apexHqDomain: { status: "Business workspace ready", tone: "green", summary: "Apex can route to Apex HQ modules." },
      askApexChat: { providerStatus: "Local-first Ollama" },
    },
    fixReceipts: [{
      id: "FIX-2",
      label: "Apex Home talk surface",
      status: "fixed",
      ok: true,
      whatApexDid: "Apex hid permanent dashboard cards and kept the change private.",
    }],
  });

  const response = buildApexTalkToApexResponse({
    question: "Apex, what changed?",
    whatChangedFeed: feed,
  });

  assert.equal(response.handled, true);
  assert.equal(response.intent, "what-changed");
  assert.match(response.answer, /Here.s what changed/i);
  assert.match(response.answer, /Apex Home talk surface/i);
  assert.match(response.answer, /feed tucked away/i);
  assert.doesNotMatch(JSON.stringify(response), /secret-token-value/);
});

test("buildApexTalkToApexResponse handles quiet, clear, working, and receipt commands", () => {
  const builder = buildApexBuilderModeState({
    buildAwareness: {
      status: "Local changes present",
      changedFileCount: 3,
    },
    fixReceipts: [{
      id: "FIX-3",
      label: "Small UI repair",
      ok: true,
      status: "fixed",
      whatApexDid: "Apex applied a scoped local patch.",
    }],
  });
  const base = {
    builderMode: builder,
    fixReceipts: [{
      id: "FIX-3",
      label: "Small UI repair",
      ok: true,
      status: "fixed",
      whatApexDid: "Apex applied a scoped local patch.",
    }],
  };

  const working = buildApexTalkToApexResponse({ ...base, question: "Apex, what are you working on?" });
  assert.equal(working.handled, true);
  assert.equal(working.intent, "working-on");
  assert.match(working.answer, /Builder/i);

  const builderWork = buildApexTalkToApexResponse({ ...base, question: "Apex, work on the app." });
  assert.equal(builderWork.handled, true);
  assert.equal(builderWork.intent, "builder-work");
  assert.match(builderWork.answer, /routing that to Builder/i);

  const did = buildApexTalkToApexResponse({ ...base, question: "Apex, what did you just do?" });
  assert.equal(did.handled, true);
  assert.equal(did.intent, "what-apex-did");
  assert.match(did.answer, /Small UI repair/i);

  const quiet = buildApexTalkToApexResponse({ question: "Apex, go quiet." });
  assert.equal(quiet.handled, true);
  assert.equal(quiet.shouldClearScreen, true);

  const clear = buildApexTalkToApexResponse({ question: "Apex, show me only if I need to see it." });
  assert.equal(clear.handled, true);
  assert.equal(clear.shouldClearScreen, true);
});

test("buildApexSelfFixRepairPrep prepares repair path without execution", () => {
  const builder = buildApexBuilderModeState({
    buildAwareness: {
      status: "Local changes present",
      changedFileCount: 2,
    },
    fixReceipts: [{
      id: "FIX-4",
      label: "Apex Home status copy",
      ok: true,
      status: "fixed",
      filesTouched: ["src/apex-control-room-components.jsx"],
      patchPreviews: [{
        id: "PREVIEW-1",
        targetFile: "src/apex-control-room-components.jsx",
        searchSnippet: "old status",
        replacementSnippet: "new status",
        explanation: "Polish stale local status copy.",
        validationCommand: { id: "apex-home-focused-tests", label: "Apex Home focused tests" },
        expectedResult: "Focused tests pass.",
      }],
    }],
  });

  const prep = buildApexSelfFixRepairPrep({
    question: "Apex, fix this screen.",
    builderMode: builder,
    fixReceipts: [{
      id: "FIX-4",
      label: "Apex Home status copy",
      ok: true,
      status: "fixed",
      filesTouched: ["src/apex-control-room-components.jsx"],
    }],
  });

  assert.equal(prep.requested, true);
  assert.equal(prep.intent, "repair-plan");
  assert.equal(prep.canExecuteNow, false);
  assert.equal(prep.canEditFilesFromApexUi, false);
  assert.equal(prep.canRunGitFromApexUi, false);
  assert.equal(prep.canDeploy, false);
  assert.match(prep.issueSummary, /Repair prep/i);
  assert.deepEqual(prep.likelyAffectedFiles, ["src/apex-control-room-components.jsx"]);
  assert.match(prep.proposedSmallestFix, /latest patch preview|smallest/i);
  assert.equal(prep.patchHandoff, null);
  assert.match(prep.answer, /no auto-edit from the Apex UI/i);
  assert.match(prep.answer, /Validation I would run/i);
  assert.match(prep.answer, /Rollback path/i);
  assert.match(prep.answer, /No git reset/i);
  assert.doesNotMatch(prep.answer, /I edited|I applied|I deployed/i);
});

test("buildApexTalkToApexResponse handles Self-Fix v0 commands conversationally", () => {
  const builder = buildApexBuilderModeState({
    buildAwareness: {
      status: "Local changes present",
      changedFileCount: 1,
    },
  });
  const base = { builderMode: builder };

  const fix = buildApexTalkToApexResponse({ ...base, question: "Apex, fix this screen." });
  assert.equal(fix.handled, true);
  assert.equal(fix.intent, "repair-plan");
  assert.match(fix.answer, /Repair prep/i);
  assert.match(fix.answer, /Apex Home prepares the handoff/i);
  assert.doesNotMatch(fix.answer, /I edited|I applied|I ran git|I deployed/i);

  const patch = buildApexTalkToApexResponse({ ...base, question: "Apex, prepare a patch." });
  assert.equal(patch.handled, true);
  assert.equal(patch.intent, "repair-patch");
  assert.match(patch.answer, /Patch prep/i);
  assert.match(patch.answer, /needs exact patch context|did not edit files/i);

  const change = buildApexTalkToApexResponse({ ...base, question: "Apex, what would you change?" });
  assert.equal(change.handled, true);
  assert.equal(change.intent, "repair-change");
  assert.match(change.answer, /Proposed change/i);

  const tests = buildApexTalkToApexResponse({ ...base, question: "Apex, what tests would you run?" });
  assert.equal(tests.handled, true);
  assert.equal(tests.intent, "repair-tests");
  assert.match(tests.answer, /Validation prep/i);

  const stop = buildApexTalkToApexResponse({ ...base, question: "Apex, stop fixing." });
  assert.equal(stop.handled, true);
  assert.equal(stop.intent, "self-fix-stop");
  assert.equal(stop.shouldClearScreen, true);
});

test("buildApexSelfFixPatchHandoff creates exact non-executing patch package", () => {
  const builder = buildApexBuilderModeState({
    fixReceipts: [{
      id: "FIX-5",
      label: "Apex Home copy repair",
      ok: true,
      status: "fixed",
      filesTouched: ["src/apex-control-room-components.jsx"],
      patchPreviews: [{
        id: "PREVIEW-5",
        targetFile: "src/apex-control-room-components.jsx",
        searchSnippet: "Self-Fix prep",
        replacementSnippet: "Self-Fix handoff",
        explanation: "Move the route label from repair prep to patch handoff.",
        validationCommand: { id: "apex-home-focused-tests", label: "Apex Home focused tests" },
        expectedResult: "Focused Apex Home tests pass.",
      }],
    }],
  });
  const handoff = buildApexSelfFixPatchHandoff({
    question: "Apex, prepare a patch.",
    builderMode: builder,
    repairPrep: {
      intent: "repair-patch",
      likelyAffectedFiles: ["src/apex-control-room-components.jsx"],
      validationPlan: ["Apex Home focused tests"],
      rollbackPath: "Revert only the exact target file if validation fails.",
    },
    now: "2026-06-07T06:00:00.000Z",
  });

  assert.equal(handoff.version, "self-fix-v1");
  assert.equal(handoff.status, "ready-for-build-thread");
  assert.equal(handoff.destination, "build-thread-tooling");
  assert.deepEqual(handoff.targetFiles, ["src/apex-control-room-components.jsx"]);
  assert.equal(handoff.searchSnippet, "Self-Fix prep");
  assert.equal(handoff.replacementSnippet, "Self-Fix handoff");
  assert.match(handoff.humanReadableChangeSummary, /Move the route label/i);
  assert.equal(handoff.validationCommandRecommendation, "Apex Home focused tests");
  assert.match(handoff.rollbackNote, /exact target file/i);
  assert.match(handoff.receipt, /Patch handoff ready/i);
  assert.equal(handoff.canExecuteNow, false);
  assert.equal(handoff.canEditFilesFromApexUi, false);
  assert.equal(handoff.canRunGitFromApexUi, false);
  assert.equal(handoff.canDeploy, false);
  assert.match(JSON.stringify(handoff), /secrets exposure/i);
  assert.doesNotMatch(JSON.stringify(handoff), /sk-[a-z0-9]|bearer\s+[a-z0-9]|password=|I edited|I deployed/i);
});

test("buildApexTalkToApexResponse handles Self-Fix v1 patch handoff commands", () => {
  const builder = buildApexBuilderModeState({
    fixReceipts: [{
      id: "FIX-6",
      label: "Apex Home handoff wording",
      ok: true,
      status: "fixed",
      filesTouched: ["src/apex-control-room-utils.js"],
      patchPreviews: [{
        id: "PREVIEW-6",
        targetFile: "src/apex-control-room-utils.js",
        searchSnippet: "Patch prep: old text",
        replacementSnippet: "Patch handoff: new text",
        explanation: "Make the Self-Fix v1 response use handoff language.",
        validationCommand: { id: "apex-home-focused-tests", label: "Apex Home focused tests" },
        expectedResult: "Self-Fix focused tests pass.",
      }],
    }],
  });
  const base = { builderMode: builder };

  const prepare = buildApexTalkToApexResponse({ ...base, question: "Apex, prepare a patch." });
  assert.equal(prepare.handled, true);
  assert.equal(prepare.intent, "repair-patch");
  assert.equal(prepare.autoDispatchEligible, true);
  assert.equal(prepare.patchHandoff.status, "ready-for-build-thread");
  assert.match(prepare.answer, /Patch handoff ready/i);
  assert.match(prepare.answer, /Search snippet/i);
  assert.match(prepare.answer, /Replacement snippet/i);
  assert.doesNotMatch(prepare.answer, /I edited|I applied|I ran git|I deployed/i);

  const show = buildApexTalkToApexResponse({ ...base, question: "Apex, show me the patch." });
  assert.equal(show.handled, true);
  assert.equal(show.intent, "patch-show");
  assert.equal(show.patchHandoff.status, "ready-for-build-thread");
  assert.match(show.answer, /Patch preview/i);
  assert.match(show.answer, /src\/apex-control-room-utils\.js/i);

  const handoff = buildApexTalkToApexResponse({ ...base, question: "Apex, hand this to the build thread." });
  assert.equal(handoff.handled, true);
  assert.equal(handoff.intent, "patch-handoff");
  assert.equal(handoff.patchHandoff.destination, "build-thread-tooling");
  assert.match(handoff.handoffReceipt, /build-thread\/tooling execution/i);
  assert.equal(handoff.patchHandoff.canEditFilesFromApexUi, false);

  const staleCopy = buildApexTalkToApexResponse({ ...base, question: "Apex, fix stale copy." });
  assert.equal(staleCopy.handled, true);
  assert.equal(staleCopy.intent, "repair-plan");
  assert.equal(staleCopy.autoDispatchEligible, true);
});

test("buildApexTalkToApexResponse answers Self-Fix v2 dispatch details conversationally", () => {
  const receipt = {
    version: "self-fix-v2",
    status: "fixed",
    ok: true,
    shortAnswer: "Fixed. Focused tests passed.",
    changedDetail: "Apex applied the controlled copy patch through Builder tooling.",
    testedDetail: "Apex Home focused tests passed.",
    filesTouched: ["src/apex-control-room-utils.js"],
    patchPreviews: [{
      targetFile: "src/apex-control-room-utils.js",
      searchSnippet: "old self-fix copy",
      replacementSnippet: "new self-fix copy",
      explanation: "Update Self-Fix copy.",
    }],
    learningReceipt: {
      issuePattern: "ui-copy",
      patchStrategy: "Use the exact-match controlled Builder profile.",
      validationProof: "Apex Home focused tests passed.",
      fasterNextTime: "Reuse the matched Self-Fix handoff and dispatch Builder directly.",
    },
  };

  const changed = buildApexTalkToApexResponse({ question: "Apex, what did you change?", selfFixDispatchReceipt: receipt });
  assert.equal(changed.handled, true);
  assert.equal(changed.intent, "self-fix-changed");
  assert.match(changed.answer, /controlled copy patch/i);
  assert.match(changed.answer, /src\/apex-control-room-utils\.js/i);

  const tested = buildApexTalkToApexResponse({ question: "Apex, what did you test?", selfFixDispatchReceipt: receipt });
  assert.equal(tested.intent, "self-fix-tested");
  assert.match(tested.answer, /Apex Home focused tests passed/i);

  const learned = buildApexTalkToApexResponse({ question: "Apex, what did you learn?", selfFixDispatchReceipt: receipt });
  assert.equal(learned.intent, "self-fix-learning");
  assert.match(learned.answer, /ui-copy/i);
  assert.match(learned.answer, /dispatch Builder directly/i);

  const patch = buildApexTalkToApexResponse({ question: "Apex, show me the patch.", selfFixDispatchReceipt: receipt });
  assert.equal(patch.intent, "self-fix-patch-detail");
  assert.match(patch.answer, /src\/apex-control-room-utils\.js/i);
  assert.match(patch.answer, /conversational/i);

  const failure = buildApexTalkToApexResponse({ question: "Apex, what failed?", selfFixDispatchReceipt: receipt });
  assert.equal(failure.intent, "self-fix-failure");
  assert.match(failure.answer, /Nothing failed/i);
});

test("buildApexTalkToApexResponse answers local runtime readiness conversationally", () => {
  const localProviderStatus = {
    localProviders: {
      ollama: {
        provider: "ollama",
        available: true,
        status: "available",
        modelNames: ["qwen3:14b", "qwen3-coder:30b"],
      },
    },
  };

  const ready = buildApexTalkToApexResponse({
    question: "Apex, are you ready locally?",
    localProviderStatus,
  });

  assert.equal(ready.handled, true);
  assert.equal(ready.intent, "local-readiness");
  assert.match(ready.answer, /Apex is ready locally/i);
  assert.match(ready.answer, /qwen3:14b is ready/i);
  assert.match(ready.answer, /normal coding uses the same resident qwen3:14b/i);
  assert.match(ready.answer, /qwen3-coder:30b is manual-only-ready/i);
  assert.match(ready.answer, /OpenAI is not required/i);
  assert.doesNotMatch(ready.answer, /review-only|Execution Locked/i);
});

test("buildApexTalkToApexResponse handles Apex build-loop commands conversationally", () => {
  const start = buildApexTalkToApexResponse({
    question: "Apex, work on yourself.",
  });

  assert.equal(start.handled, true);
  assert.equal(start.intent, "apex-build-loop-work-on-self");
  assert.equal(start.autoBuildLoopEligible, true);
  assert.match(start.answer, /qwen3:14b/i);
  assert.match(start.answer, /qwen3-coder:30b stays manual-only/i);
  assert.doesNotMatch(start.answer, /dashboard|review-only|Execution Locked/i);

  const receipt = {
    taskTitle: "Improve Apex voice status",
    taskProfile: "apex-voice-status-polish",
    status: "completed",
    outcome: "fixed",
    shortAnswer: "Fixed.",
    reason: "Controlled local fix passed.",
    filesChanged: ["src/apex-control-room-utils.js"],
  };

  const status = buildApexTalkToApexResponse({
    question: "Apex, what are you building?",
    buildLoopReceipt: receipt,
  });
  assert.equal(status.handled, true);
  assert.equal(status.intent, "apex-build-loop-status");
  assert.match(status.answer, /Improve Apex voice status|Coding is/i);

  const changed = buildApexTalkToApexResponse({
    question: "Apex, what did you change?",
    buildLoopReceipt: receipt,
  });
  assert.equal(changed.handled, true);
  assert.match(changed.answer, /src\/apex-control-room-utils\.js|Fixed/i);

  const stopped = buildApexTalkToApexResponse({
    question: "Apex, stop coding.",
  });
  assert.equal(stopped.handled, true);
  assert.equal(stopped.autoBuildLoopEligible, true);
  assert.match(stopped.answer, /Stopping Apex-owned coding/i);
});

test("buildApexTalkToApexResponse handles GPU, speed, model, and cleanup commands conversationally", () => {
  const localProviderStatus = {
    localProviders: {
      ollama: {
        provider: "ollama",
        available: true,
        status: "available",
        modelNames: ["qwen3:14b", "qwen3-coder:30b"],
        modelProcessor: {
          processor: "gpu",
          model: "qwen3:14b",
          vramUsedMb: 9000,
          responseTimingMs: 1200,
          modelAlreadyLoaded: true,
        },
      },
      gpu: {
        provider: "nvidia-smi",
        available: true,
        status: "available",
        gpuName: "NVIDIA GeForce RTX 5080",
        vramTotalMb: 16303,
        vramUsedMb: 1406,
      },
    },
  };
  const localVoiceReadiness = {
    status: "partial",
    sttStatus: "local-ready",
    sttEngine: "faster-whisper CUDA",
    sttProcessor: "gpu",
    sttGpuCapable: true,
    usingWindowsVoiceFallback: true,
  };

  const gpu = buildApexTalkToApexResponse({
    question: "Apex, are you using my GPU?",
    localProviderStatus,
    localVoiceReadiness,
  });
  const speed = buildApexTalkToApexResponse({
    question: "Apex, check your local speed.",
    localProviderStatus,
    localVoiceReadiness,
  });
  const model = buildApexTalkToApexResponse({
    question: "Apex, are you using the fast brain or deep brain?",
    localProviderStatus,
  });
  const brainStatus = buildApexTalkToApexResponse({
    question: "Apex, what brain are you using?",
    localProviderStatus: {
      ...localProviderStatus,
      brain: {
        provider: "apex-workstation-brain",
        activeMode: "workstation",
        label: "Workstation",
        modelId: "qwen3:14b",
        numCtx: 12288,
        keepAlive: "60m",
        processor: "gpu",
        vramUsedMb: 9199,
        vramTotalMb: 16303,
        thresholdStatus: "stable",
        lastPromotionDecision: "eligible-for-measured-promotion-test",
      },
    },
  });
  const modeChange = buildApexTalkToApexResponse({
    question: "Apex, use workstation mode.",
    localProviderStatus,
  });
  const cleanup = buildApexTalkToApexResponse({
    question: "Apex, clean up your local runtime.",
    localProviderStatus,
  });

  assert.equal(gpu.intent, "local-gpu-status");
  assert.match(gpu.answer, /RTX 5080/i);
  assert.match(gpu.answer, /Latest model processor receipt says gpu/i);
  assert.match(gpu.answer, /faster-whisper CUDA on gpu/i);
  assert.doesNotMatch(gpu.answer, /OpenAI.*used/i);

  assert.equal(speed.intent, "local-speed-check");
  assert.match(speed.answer, /qwen3:14b/i);
  assert.match(speed.answer, /Resident context/i);
  assert.match(speed.answer, /4096/i);
  assert.match(speed.answer, /shorter prompts\/output caps/i);
  assert.match(speed.answer, /manual-only/i);
  assert.doesNotMatch(speed.answer, /dashboard|process table/i);

  assert.equal(model.intent, "local-model-mode");
  assert.match(model.answer, /qwen3:14b/i);
  assert.match(model.answer, /qwen3-coder:30b/i);
  assert.match(model.answer, /30B is not kept warm by default/i);
  assert.match(model.answer, /OpenAI stays disabled/i);

  assert.equal(brainStatus.intent, "workstation-brain-mode");
  assert.match(brainStatus.answer, /Workstation mode/i);
  assert.match(brainStatus.answer, /ctx|context/i);
  assert.match(brainStatus.answer, /VRAM/i);

  assert.equal(modeChange.handled, false);

  assert.equal(cleanup.intent, "local-runtime-cleanup");
  assert.match(cleanup.answer, /Apex-owned duplicate dev/i);
  assert.match(cleanup.answer, /avoids touching normal browser/i);
});

test("buildApexTalkToApexResponse explains what Apex needs to work tonight", () => {
  const partial = buildApexTalkToApexResponse({
    question: "Apex, what do you need to work tonight?",
    localProviderStatus: {
      localProviders: {
        ollama: {
          provider: "ollama",
          available: true,
          status: "available",
          modelNames: ["qwen3:14b"],
        },
      },
    },
  });

  assert.equal(partial.handled, true);
  assert.equal(partial.intent, "local-tonight-needs");
  assert.match(partial.answer, /qwen3:14b is ready/i);
  assert.match(partial.answer, /qwen3-coder:30b is missing-optional/i);
  assert.doesNotMatch(partial.answer, /pull qwen3-coder:30b/i);
  assert.match(partial.answer, /Local Voice Runtime/i);
  assert.doesNotMatch(partial.answer, /send|spend|deploy/i);
});

test("buildApexTalkToApexResponse handles Apex Personal OS identity, skills, and agents", () => {
  const identity = buildApexTalkToApexResponse({
    question: "Apex, are you Apex HQ or my personal Apex?",
  });

  assert.equal(identity.handled, true);
  assert.equal(identity.intent, "identity");
  assert.match(identity.answer, /private desktop operator/i);
  assert.match(identity.answer, /Apex HQ is one business workspace/i);
  assert.equal(identity.personalOsRoute.category, "local-chat");

  const skills = buildApexTalkToApexResponse({
    question: "Apex, what skills do you have?",
  });

  assert.equal(skills.handled, true);
  assert.equal(skills.intent, "skills");
  assert.match(skills.answer, /available skills/i);
  assert.match(skills.answer, /planned skills stay honest/i);
  assert.doesNotMatch(skills.answer, /can execute/i);

  const agents = buildApexTalkToApexResponse({
    question: "Apex, what agents work under you?",
  });

  assert.equal(agents.handled, true);
  assert.equal(agents.intent, "agents");
  assert.match(agents.answer, /Builder/i);
  assert.match(agents.answer, /not claim a planned agent is doing real work/i);
});

test("buildApexTalkToApexResponse handles local voice readiness without cloud audio claims", () => {
  const voice = buildApexTalkToApexResponse({
    question: "Apex, can you hear me?",
    localVoiceReadiness: {
      status: "partial",
      tone: "amber",
      loopState: "idle",
      microphoneStatus: "prompt",
      sttStatus: "missing",
      ttsStatus: "browser-playback-fallback",
      canHearLocally: false,
      canSpeakLocally: false,
      typedFallbackAvailable: true,
      openAiAudioUsed: false,
      cloudAudioAllowed: false,
      providerSummary: "Local voice is not fully wired yet.",
      missing: ["microphone permission", "local STT engine", "local TTS engine"],
    },
  });

  assert.equal(voice.handled, true);
  assert.equal(voice.intent, "voice-status");
  assert.match(voice.answer, /Not through a full local STT path yet/i);
  assert.match(voice.answer, /OpenAI audio is not used/i);
  assert.match(voice.answer, /Typed fallback is always available/i);
});

test("buildApexTalkToApexResponse handles always-open mic quiet and wake commands", () => {
  const voiceReadiness = {
    status: "ready",
    tone: "green",
    loopState: "standby",
    microphoneStatus: "granted",
    sttStatus: "local-ready",
    ttsStatus: "local-ready",
    sttEngine: "faster-whisper CUDA",
    ttsEngine: "Kokoro ONNX",
    sttProcessor: "gpu",
    sttGpuCapable: true,
    canHearLocally: true,
    canSpeakLocally: true,
    usingLightweightVoice: true,
    lightweightVoiceTarget: "Kokoro ONNX / am_michael",
    typedFallbackAvailable: true,
    openAiAudioUsed: false,
    cloudAudioAllowed: false,
    providerSummary: "Local voice is ready.",
    missing: [],
  };

  const quiet = buildApexTalkToApexResponse({
    question: "Apex, go quiet.",
    localVoiceReadiness: voiceReadiness,
  });
  assert.equal(quiet.handled, true);
  assert.equal(quiet.intent, "voice-stop-listening");
  assert.equal(quiet.shouldStopListening, true);
  assert.equal(quiet.shouldClearScreen, true);
  assert.match(quiet.answer, /voice loop to quiet/i);

  const wake = buildApexTalkToApexResponse({
    question: "Apex, start listening.",
    localVoiceReadiness: voiceReadiness,
  });
  assert.equal(wake.handled, true);
  assert.equal(wake.intent, "voice-start-listening");
  assert.equal(wake.shouldStartListening, true);
  assert.match(wake.answer, /standby listening mode/i);

  const hear = buildApexTalkToApexResponse({
    question: "Apex, can you hear me?",
    localVoiceReadiness: voiceReadiness,
  });
  assert.equal(hear.handled, true);
  assert.equal(hear.intent, "voice-status");
  assert.match(hear.answer, /browser mic input/i);
  assert.match(hear.answer, /sustained silence/i);
  assert.match(hear.answer, /OpenAI audio is not used/i);
});

test("buildApexTalkToApexResponse answers GPU STT and voice speed questions conversationally", () => {
  const gpuStt = buildApexTalkToApexResponse({
    question: "Apex, are you using GPU STT?",
    localVoiceReadiness: {
      status: "partial",
      tone: "amber",
      loopState: "idle",
      microphoneStatus: "granted",
      sttStatus: "local-ready",
      ttsStatus: "local-ready",
      sttEngine: "faster-whisper CUDA",
      ttsEngine: "Windows SAPI",
      sttProcessor: "gpu",
      sttGpuCapable: true,
      canHearLocally: true,
      canSpeakLocally: true,
      usingWindowsVoiceFallback: true,
      typedFallbackAvailable: true,
      openAiAudioUsed: false,
      cloudAudioAllowed: false,
      providerSummary: "Local STT uses GPU; TTS is Windows emergency fallback.",
      missing: ["locked Apex lightweight Kokoro/OfflineTTS voice configuration"],
    },
  });

  assert.equal(gpuStt.handled, true);
  assert.equal(gpuStt.intent, "voice-gpu-stt");
  assert.match(gpuStt.answer, /faster-whisper CUDA on GPU/i);
  assert.match(gpuStt.answer, /Voice identity is locked/i);

  const slow = buildApexTalkToApexResponse({
    question: "Apex, why is voice slow?",
    localVoiceReadiness: {
      status: "partial",
      tone: "amber",
      loopState: "idle",
      microphoneStatus: "granted",
      sttStatus: "local-ready",
      ttsStatus: "local-ready",
      sttEngine: "faster-whisper CUDA",
      ttsEngine: "Windows SAPI",
      sttProcessor: "gpu",
      sttGpuCapable: true,
      canHearLocally: true,
      canSpeakLocally: true,
      usingWindowsVoiceFallback: true,
      typedFallbackAvailable: true,
      openAiAudioUsed: false,
      cloudAudioAllowed: false,
      providerSummary: "Local STT uses GPU; TTS is Windows emergency fallback.",
      missing: ["locked Apex lightweight Kokoro/OfflineTTS voice configuration"],
    },
  });

  assert.equal(slow.handled, true);
  assert.equal(slow.intent, "local-speed-check");
  assert.match(slow.answer, /Windows SAPI fallback/i);
  assert.doesNotMatch(slow.answer, /review-only/i);
});

test("buildApexTalkToApexResponse reads back the last local transcript", () => {
  const response = buildApexTalkToApexResponse({
    question: "Apex, what did I just say?",
    lastVoiceTranscript: "Apex can you hear me",
  });

  assert.equal(response.handled, true);
  assert.equal(response.intent, "voice-transcript-readback");
  assert.match(response.answer, /Apex can you hear me/i);
  assert.match(response.sourceLabels.join(" "), /Local STT/i);
});

test("buildApexTalkToApexResponse explains voice turn timing receipts", () => {
  const response = buildApexTalkToApexResponse({
    question: "Apex, why were you slow?",
    localVoiceReadiness: {
      status: "ready",
      tone: "green",
      sttStatus: "local-ready",
      ttsStatus: "local-ready",
      sttEngine: "faster-whisper CUDA",
      ttsEngine: "Kokoro ONNX",
      sttProcessor: "gpu",
      sttGpuCapable: true,
      canHearLocally: true,
      canSpeakLocally: true,
      usingLightweightVoice: true,
      openAiAudioUsed: false,
      cloudAudioAllowed: false,
      missing: [],
      lastVoiceTurn: {
        status: "transcribed",
        totalTurnMs: 2750,
        slowestStep: "sttMs",
        slowestStepMs: 900,
        voiceCloseMs: 520,
        audioValid: true,
        timingMs: {
          captureDurationMs: 640,
          voiceCloseMs: 520,
          vadActualSilenceMs: 520,
          clientWavConversionMs: 28,
          uploadRequestMs: 55,
          sttMs: 900,
          modelTotalMs: 720,
          ttsGenerationMs: 260,
          playbackStartDelayMs: 80,
          totalTurnMs: 2750,
        },
      },
    },
  });

  assert.equal(response.handled, true);
  assert.equal(response.intent, "local-speed-check");
  assert.match(response.answer, /2750 ms/i);
  assert.match(response.answer, /close 520 ms/i);
  assert.match(response.answer, /slowest step was sttMs/i);
  assert.match(response.answer, /brain 720 ms/i);
  assert.match(response.answer, /TTS 260 ms/i);
  assert.doesNotMatch(response.answer, /review-only/i);
});

test("buildApexTalkToApexResponse treats voice latency as a speed receipt command", () => {
  const response = buildApexTalkToApexResponse({
    question: "Apex, voice latency.",
    localVoiceReadiness: {
      status: "ready",
      sttStatus: "local-ready",
      ttsStatus: "local-ready",
      sttEngine: "faster-whisper CUDA",
      ttsEngine: "Kokoro ONNX",
      sttProcessor: "gpu",
      canHearLocally: true,
      canSpeakLocally: true,
      usingLightweightVoice: true,
      lastVoiceTurn: {
        status: "spoken",
        totalTurnMs: 2650,
        liveTurnLatency: {
          provider: "apex-live-turn-latency",
          version: "v1",
          diagnosis: "model-fast-voice-slow",
          bottleneckOwner: "voice-pipeline",
          closeMs: 520,
          sttMs: 960,
          modelFirstTokenMs: 160,
          modelTotalMs: 572,
          ttsMs: 240,
          playbackRecoveryMs: 100,
          totalTurnMs: 2650,
          slowestStepLabel: "STT",
          slowestStepMs: 960,
          modelFast: true,
        },
        timingMs: {
          voiceCloseMs: 520,
          sttMs: 960,
          modelFirstTokenMs: 160,
          modelTotalMs: 572,
          ttsGenerationMs: 240,
          totalTurnMs: 2650,
        },
      },
    },
  });

  assert.equal(response.handled, true);
  assert.equal(response.intent, "local-speed-check");
  assert.match(response.answer, /2650 ms/i);
  assert.match(response.answer, /close 520 ms/i);
  assert.match(response.answer, /not Ollama/i);
});

test("buildApexTalkToApexResponse treats voice health as a timing check", () => {
  const response = buildApexTalkToApexResponse({
    question: "Apex, voice health.",
    localVoiceReadiness: {
      status: "ready",
      tone: "green",
      sttStatus: "local-ready",
      ttsStatus: "local-ready",
      sttEngine: "faster-whisper CUDA",
      ttsEngine: "Windows SAPI fast test",
      sttProcessor: "gpu",
      sttGpuCapable: true,
      canHearLocally: true,
      canSpeakLocally: true,
      usingLightweightVoice: true,
      openAiAudioUsed: false,
      cloudAudioAllowed: false,
      missing: [],
      lastVoiceTurn: {
        status: "spoken",
        totalTurnMs: 1220,
        timingMs: {
          sttMs: 300,
          modelTotalMs: 420,
          ttsGenerationMs: 110,
          totalTurnMs: 1220,
        },
      },
    },
  });

  assert.equal(response.handled, true);
  assert.equal(response.intent, "local-speed-check");
  assert.match(response.answer, /1220 ms/i);
  assert.match(response.answer, /brain 420 ms/i);
});

test("buildApexTalkToApexResponse explains failed audio turn receipts", () => {
  const response = buildApexTalkToApexResponse({
    question: "Apex, what failed with that audio turn?",
    localVoiceReadiness: {
      lastVoiceTurn: {
        status: "failed",
        failureReason: "too-short",
        audioValid: false,
        audio: {
          convertedMimeType: "audio/wav",
          sampleRate: 16000,
          channelCount: 1,
        },
      },
    },
  });

  assert.equal(response.handled, true);
  assert.equal(response.intent, "voice-audio-turn-failure");
  assert.match(response.answer, /too short/i);
  assert.match(response.answer, /16000 Hz/i);
  assert.match(response.answer, /cloud audio is off/i);
});

test("buildApexTalkToApexResponse handles natural local ear test phrases", () => {
  const response = buildApexTalkToApexResponse({
    question: "Apex can you hear a",
    localVoiceReadiness: {
      status: "ready",
      tone: "green",
      loopState: "idle",
      microphoneStatus: "granted",
      sttStatus: "local-ready",
      ttsStatus: "local-ready",
      sttEngine: "Windows SAPI",
      ttsEngine: "Windows SAPI",
      canHearLocally: true,
      canSpeakLocally: true,
      typedFallbackAvailable: true,
      openAiAudioUsed: false,
      cloudAudioAllowed: false,
      providerSummary: "Local voice is ready.",
      missing: [],
    },
  });

  assert.equal(response.handled, true);
  assert.equal(response.intent, "voice-status");
  assert.match(response.answer, /local STT is ready/i);
});

test("buildApexTalkToApexResponse handles natural local mic calibration phrases", () => {
  const response = buildApexTalkToApexResponse({
    question: "Apex, test my mic.",
    localVoiceReadiness: {
      status: "ready",
      tone: "green",
      loopState: "idle",
      microphoneStatus: "granted",
      sttStatus: "local-ready",
      ttsStatus: "local-ready",
      sttEngine: "faster-whisper CUDA",
      sttProcessor: "gpu",
      ttsEngine: "Kokoro ONNX",
      canHearLocally: true,
      canSpeakLocally: true,
      typedFallbackAvailable: true,
      openAiAudioUsed: false,
      cloudAudioAllowed: false,
      providerSummary: "Local voice is ready.",
      missing: [],
    },
  });

  assert.equal(response.handled, true);
  assert.equal(response.intent, "voice-mic-test");
  assert.match(response.answer, /PCM frames are arriving/i);
  assert.match(response.answer, /OpenAI audio is not used/i);
});

test("buildApexTalkToApexResponse starts learning conversation without adding panels", () => {
  const response = buildApexTalkToApexResponse({
    question: "Apex, I want you to learn from what I'm about to say.",
  });

  assert.equal(response.handled, true);
  assert.equal(response.intent, "learning-start");
  assert.equal(response.learningMode, true);
  assert.match(response.answer, /I.*listening/i);
  assert.match(response.answer, /save it only if it is safe/i);
});

test("buildApexTalkToApexResponse prepares learning memory but does not claim persistence", () => {
  const response = buildApexTalkToApexResponse({
    question: "Apex, learn this: keep the home screen minimal and conversational.",
  });

  assert.equal(response.handled, true);
  assert.equal(response.intent, "learning-save");
  assert.equal(response.learningMemoryDraft.status, "approved");
  assert.equal(response.learningMemoryDraft.sourceType, "apex-personal-learning-conversation");
  assert.match(response.answer, /saving/i);
  assert.doesNotMatch(response.answer, /saved/i);
});

test("buildApexTalkToApexResponse summarizes learned memory conversationally", () => {
  const response = buildApexTalkToApexResponse({
    question: "Apex, what did you learn?",
    memoryRows: [
      {
        id: "AOM-LEARN-1",
        title: "Assistant preference: Keep Apex calm",
        body: "Apex should stay calm and conversational.",
        category: "assistant-preference",
        type: "assistant-preference",
        sourceType: "apex-personal-learning-conversation",
        status: "approved",
        createdAt: "2026-06-07T12:00:00.000Z",
      },
    ],
  });

  assert.equal(response.handled, true);
  assert.equal(response.intent, "learning-query");
  assert.match(response.answer, /Keep Apex calm/i);
  assert.match(response.answer, /private learning conversations/i);
});

test("buildApexTalkToApexResponse routes Personal OS planned capabilities honestly", () => {
  const research = buildApexTalkToApexResponse({ question: "Apex, research this." });
  assert.equal(research.handled, true);
  assert.equal(research.intent, "research");
  assert.match(research.answer, /Live web research\/search is not wired/i);
  assert.equal(research.personalOsRoute.canExecuteNow, false);

  const control = buildApexTalkToApexResponse({ question: "Apex, what can you control right now?" });
  assert.equal(control.intent, "current-control");
  assert.match(control.answer, /I cannot control the desktop\/browser\/apps/i);
  assert.match(control.answer, /send messages, spend money, order, book, deploy/i);

  const stop = buildApexTalkToApexResponse({ question: "Apex, stop listening." });
  assert.equal(stop.intent, "voice-stop-listening");
  assert.equal(stop.shouldStopListening, true);
  assert.equal(stop.shouldClearScreen, true);
});

test("deriveApexControlRoomState exposes trusted live-run memory to Live Operator Mode", () => {
  const state = deriveApexControlRoomState({
    user: { name: "John Berlanga", role: "Owner", operatorAccess: true },
    permissions: {
      apexOs: { canView: true, canManage: true },
      aiOffice: { canView: true },
    },
    companySettings: {
      apexOsMemory: [
        {
          id: "AOM-LIVE-1",
          category: "private-owner-notes",
          title: "Apex remembered blocked browser QA",
          body: "Release work should not deploy until browser QA evidence passes.",
          sourceType: "apex-live-operator-proactive-check-in",
          sourceLabel: "Apex Proactive Check-In",
          sourceUri: "apex-live-operator:proactive:1",
          status: "approved",
          approvedAt: "2026-06-05T01:00:00.000Z",
        },
        {
          id: "AOM-LIVE-2",
          category: "private-owner-notes",
          title: "Suggested run result",
          body: "This run outcome is still waiting for manual review.",
          sourceType: "apex-live-operator-run",
          sourceLabel: "Apex Live Operator Mode",
          sourceUri: "apex-live-operator:run:2",
          status: "suggested",
          updatedAt: "2026-06-05T01:05:00.000Z",
        },
      ],
    },
  });

  assert.equal(state.liveOperatorMemory.status, "Trusted run history");
  assert.equal(state.liveOperatorMemory.trustedCount, 1);
  assert.equal(state.liveOperatorMemory.suggestedCount, 1);
  assert.equal(state.liveOperatorMemory.latestRows[0].title, "Apex remembered blocked browser QA");
  assert.equal(state.liveOperatorMode.trustedRunMemoryCount, 1);
  assert.equal(state.liveOperatorMode.pendingRunMemoryCount, 1);
  assert.match(state.liveOperatorMode.readinessRows.find((row) => row.id === "live-memory")?.detail || "", /future Apex answers/);
  assert.match(state.liveOperatorMode.operatorLoopRows.find((row) => row.id === "live-loop-remember")?.detail || "", /reviewed live-run memory/);
  assert.equal(state.liveOperatorMode.operatorJudgmentRows.find((row) => row.id === "judgment-memory-loop")?.status, "1 run memory");
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
  assert.equal(state.apexHqDomain.status, "Business workspace ready");
  assert.equal(state.apexHqDomain.rows.some((row) => row.id === "apex-hq-leads" && row.moduleId === "leads"), true);
  assert.equal(state.apexHqDomain.rows.some((row) => row.id === "apex-hq-jobs" && row.moduleId === "jobs"), true);
  assert.equal(state.apexHqDomain.rows.some((row) => row.id === "apex-hq-customers" && row.moduleId === "customers"), true);
  assert.equal(state.apexHqDomain.rows.some((row) => row.id === "apex-hq-estimates" && row.moduleId === "estimates"), true);
  assert.equal(state.apexHqDomain.rows.some((row) => row.id === "apex-hq-proposals" && row.moduleId === "proposals"), true);
  assert.equal(state.apexHqDomain.rows.some((row) => row.id === "apex-hq-reports" && row.moduleId === "reports"), true);
  assert.equal(state.apexHqDomain.rows.some((row) => row.id === "apex-hq-uploads" && row.moduleId === "uploads"), true);
  assert.equal(state.apexHqDomain.commandRows.some((row) => row.id === "bridge-private-task" && row.sectionId === "personal"), true);
  assert.equal(state.apexHqDomain.blockedRows.some((row) => /production\/deploy/i.test(row.title)), true);
  assert.equal(state.apexHqDomain.blockedRows.some((row) => /deletion/i.test(row.title)), true);
  assert.equal(state.apexBuilderMode.status, "Builder ready");
  assert.equal(state.apexBuilderMode.canRunLocalValidation, true);
  assert.equal(state.apexBuilderMode.canApplyControlledLocalFixes, true);
  assert.equal(state.apexBuilderMode.canEditFiles, false);
  assert.equal(state.apexBuilderMode.canDeploy, false);
  assert.equal(state.apexBuilderMode.canDeleteFiles, false);
  assert.equal(state.apexBuilderMode.summaryRows.some((row) => row.id === "builder-build-status"), true);
  assert.equal(state.apexBuilderMode.summaryRows.some((row) => row.id === "builder-dirty-files"), true);
  assert.equal(state.apexBuilderMode.actionRows.length, APEX_BUILDER_VALIDATION_ACTION_ROWS.length);
  assert.equal(state.apexBuilderMode.actionRows.some((row) => row.id === "apex-home-focused-tests"), true);
  assert.equal(state.apexBuilderMode.fixActionRows.length, APEX_BUILDER_CONTROLLED_FIX_ACTION_ROWS.length);
  assert.equal(state.apexBuilderMode.fixActionRows.some((row) => row.id === "utility-test-repair"), true);
  assert.equal(state.apexBuilderMode.fixActionRows.some((row) => row.id === "builder-status-label-repair"), true);
  assert.equal(state.apexBuilderMode.recentFixRows.some((row) => row.id === "builder-fix-ready"), true);
  assert.equal(state.apexBuilderMode.blockedRows.some((row) => /deploy/i.test(row.title)), true);
  assert.equal(state.apexBuilderMode.blockedRows.some((row) => /schema\/auth\/session/i.test(row.title)), true);
  assert.equal(state.apexPersonalOsCore.layerName, "Apex Personal OS");
  assert.equal(state.apexPersonalOsCore.businessDomainName, "Apex HQ");
  assert.equal(state.apexPersonalOsCore.fieldCustomerDemoVisible, false);
  assert.equal(state.apexPersonalOsCore.routes.some((row) => row.category === "desktop-control-planned" && row.status === "planned"), true);
  assert.equal(state.apexPersonalOsCore.agentRows.some((row) => row.id === "builder" && row.status === "active"), true);
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
  assert.equal(state.decisionMemory.coveredCategoryCount, 7);
  assert.equal(state.decisionMemory.categories.some((item) => item.id === "build-freeze" && item.status === "Covered"), true);
  assert.equal(state.decisionMemory.categories.some((item) => item.id === "business-goal" && item.status === "Covered"), true);
  assert.equal(state.decisionMemory.categories.some((item) => item.id === "personal-preference" && item.status === "Covered"), true);
  assert.equal(state.decisionMemory.categories.some((item) => item.id === "assistant-preference" && item.status === "Ready"), true);
  assert.equal(state.decisionMemory.categories.some((item) => item.id === "saved-idea" && item.status === "Ready"), true);
  assert.equal(state.decisionMemory.categories.some((item) => item.id === "do-not-do" && item.status === "Ready"), true);
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
  assert.equal(state.askApexChat.providerStatus, "Local-first Ollama");
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
  assert.match(state.askApexChat.answerPreview.detail, /local-first intelligence/);
  assert.match(state.askApexChat.answerPreview.detail, /acts privately for reversible internal work/);
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
  assert.equal(state.autonomyRunCenter.mode, "Private act-by-default");
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
  assert.equal(state.liveOperatorMode.mode, "Private Apex operator");
  assert.equal(state.liveOperatorMode.foundationPercent, 96);
  assert.equal(state.liveOperatorMode.jarvisBehaviorPercent, 90);
  assert.equal(state.liveOperatorMode.readinessRows.length, 6);
  assert.equal(state.liveOperatorMode.operatorLoopRows.length, 16);
  assert.equal(state.liveOperatorMode.operatorJudgmentRows.length, 4);
  assert.equal(state.liveOperatorMode.gapRows.length, 4);
  assert.equal(state.liveOperatorMode.readinessRows.some((item) => item.id === "live-run-ledger" && item.status === "Ready" && /natural-command autopilot/i.test(item.detail)), true);
  assert.equal(state.liveOperatorMode.operatorLoopRows.some((item) => item.id === "live-loop-save"), true);
  assert.equal(state.liveOperatorMode.operatorLoopRows.some((item) => item.id === "live-loop-command-run" && item.status === "Natural command"), true);
  assert.equal(state.liveOperatorMode.operatorLoopRows.some((item) => item.id === "live-loop-judge" && item.status === "Proactive"), true);
  assert.equal(state.liveOperatorMode.operatorLoopRows.some((item) => item.id === "live-loop-follow-up" && item.status === "Conversation continuity" && /last request, answer summary, matched room/i.test(item.detail)), true);
  assert.equal(state.liveOperatorMode.operatorJudgmentRows.some((item) => item.id === "judgment-start-private-run" && item.actionLabel === "Start private run"), true);
  assert.equal(state.liveOperatorMode.readinessRows.some((item) => item.id === "live-voice-loop" && /next-turn prompts/i.test(item.detail)), true);
  assert.equal(state.liveOperatorMode.readinessRows.some((item) => item.id === "live-voice-loop" && /voice health recovery/i.test(item.detail)), true);
  assert.equal(state.liveOperatorMode.operatorLoopRows.some((item) => item.id === "live-loop-interrupt" && item.status === "Barge-in memory"), true);
  assert.equal(state.liveOperatorMode.operatorLoopRows.some((item) => item.id === "live-loop-hear" && /recovery health/i.test(item.detail)), true);
  assert.equal(state.liveOperatorMode.operatorLoopRows.some((item) => item.id === "live-loop-cycle" && item.status === "Server-backed"), true);
  assert.equal(state.liveOperatorMode.operatorLoopRows.some((item) => item.id === "live-loop-auto-prep" && item.status === "Private-only"), true);
  assert.equal(state.liveOperatorMode.operatorLoopRows.some((item) => item.id === "live-loop-proof-check" && item.status === "Private proof"), true);
  assert.equal(state.liveOperatorMode.operatorLoopRows.some((item) => item.id === "live-loop-validate" && item.status === "Proof-backed"), true);
  assert.equal(state.liveOperatorMode.readinessRows.some((item) => item.id === "live-memory" && /proactive check-ins/i.test(item.detail)), true);
  assert.equal(state.liveOperatorMode.operatorLoopRows.some((item) => item.id === "live-loop-remember" && /proactive check-in memory/i.test(item.detail)), true);
  assert.equal(state.liveOperatorMode.operatorLoopRows.some((item) => item.id === "live-loop-monitor" && /Watch Officer/i.test(item.detail)), true);
  assert.equal(state.liveOperatorMode.gapRows.some((item) => item.id === "live-gap-execution" && item.status === "Approval-gated"), true);
  assert.equal(state.liveOperatorMode.gapRows.some((item) => item.id === "live-gap-proactive" && item.status === "Remembered check-ins"), true);
  assert.equal(state.liveOperatorMode.gapRows.some((item) => item.id === "live-gap-provider-reliability" && item.status === "Caption fallback"), true);
  assert.equal(state.liveOperatorMode.gapRows.some((item) => item.id === "live-gap-provider-reliability" && /voice health recovery lane/i.test(item.detail)), true);
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
  assert.equal(state.liveOperatorMode.jarvisBehaviorPercent, 96);
  assert.equal(state.liveOperatorMode.readinessRows.some((item) => item.id === "live-run-ledger" && item.status === "2 saved"), true);
  assert.equal(state.liveOperatorMode.operatorLoopRows.some((item) => item.id === "live-loop-save" && item.status === "2 saved"), true);
  assert.equal(state.liveOperatorMode.operatorLoopRows.some((item) => item.id === "live-loop-report" && item.status === "Report-ready"), true);
  assert.equal(state.liveOperatorMode.operatorJudgmentRows.some((item) => item.id === "judgment-finish-active-run" && item.status === "14% done"), true);
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

test("deriveApexControlRoomState separates memory suggestions from approved memory review rows", () => {
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
          id: "AOM-SUGGEST-1",
          category: "assistant-preference",
          type: "assistant-preference",
          title: "Concise updates",
          body: "John prefers concise progress updates while Codex is working.",
          sourceType: "apex-os-memory-suggestion",
          sourceLabel: "Ask Apex conversation",
          status: "suggested",
          createdAt: "2026-06-05T10:00:00.000Z",
        },
        {
          id: "AOM-SUGGEST-2",
          category: "saved-idea",
          type: "saved-idea",
          title: "Second screen workflow",
          body: "Save the idea for a second-screen Apex OS workflow.",
          sourceType: "apex-os-memory-suggestion",
          sourceLabel: "Ask Apex conversation",
          status: "suggested",
          createdAt: "2026-06-05T10:10:00.000Z",
        },
        {
          id: "AOM-APPROVED-1",
          category: "do-not-do",
          type: "do-not-do",
          title: "No external messages",
          body: "Apex OS must not send external messages without explicit approval.",
          sourceLabel: "John instruction",
          status: "approved",
          approvedAt: "2026-06-05T10:15:00.000Z",
        },
      ],
    },
  });

  assert.equal(state.memorySuggestions.status, "Review waiting");
  assert.equal(state.memorySuggestions.suggestedCount, 2);
  assert.equal(state.memorySuggestions.approvedCount, 1);
  assert.equal(state.memorySuggestions.archivedCount, 0);
  assert.deepEqual(state.memorySuggestions.rows.map((row) => row.title), ["Second screen workflow", "Concise updates"]);
  assert.equal(state.memorySuggestions.rows.some((row) => row.title === "No external messages"), false);
  assert.equal(state.memorySuggestions.recentApprovedRows.length, 1);
  assert.equal(state.memorySuggestions.recentApprovedRows[0].title, "No external messages");
  assert.equal(state.memorySuggestions.summary.approvedCount, 1);
  assert.equal(state.memorySuggestions.summary.suggestedCount, 2);
  assert.equal(state.decisionMemory.suggestedCount, 2);
  assert.equal(state.decisionMemory.approvedCount, 1);
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
      apexOsTasks: [
        {
          id: "AOT-PERSONAL-1",
          type: "task",
          title: "Review Apex HQ priorities",
          category: "apex-hq",
          status: "open",
          priority: "critical",
          dueAt: "2026-06-07T09:00:00.000Z",
        },
        {
          id: "AOR-PERSONAL-1",
          type: "reminder",
          title: "Call Mike",
          category: "business",
          status: "open",
          priority: "high",
          dueText: "tomorrow",
        },
      ],
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
  assert.equal(state.personalOperatingLayer.openTaskCount, 1);
  assert.equal(state.personalOperatingLayer.openReminderCount, 1);
  assert.equal(state.personalOperatingLayer.taskReminderRows.some((item) => item.title === "Review Apex HQ priorities"), true);
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
