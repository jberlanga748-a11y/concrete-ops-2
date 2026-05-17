import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveApexAssistantShellState,
  resolveApexAssistantCommand,
  resolveAssistantEstimateDraftCommand,
  resolveAssistantMissingProofCommand,
} from "./apex-assistant-shell-utils.js";

test("assistant shell is hidden without AI Office permission", () => {
  const state = deriveApexAssistantShellState({
    permissions: { aiOffice: { canView: false }, jobs: { canManageAll: false }, leads: { canView: false } },
    commandCenter: {
      watchtowerQueue: [{ id: "report:1", title: "Report", moduleId: "reports" }],
      watchtowerActions: [{ id: "proof", title: "Proof", moduleId: "uploads" }],
    },
  });

  assert.equal(state.canView, false);
  assert.deepEqual(state.watchtowerQueue, []);
  assert.deepEqual(state.watchtowerActions, []);
});

test("assistant shell is available to office roles even when AI Office is not included", () => {
  const state = deriveApexAssistantShellState({
    permissions: { aiOffice: { canView: false }, jobs: { canManageAll: true }, leads: { canView: true } },
    commandCenter: {
      watchtowerQueue: [{ id: "job:1", title: "Job startup", moduleId: "jobs" }],
    },
  });

  assert.equal(state.canView, true);
  assert.equal(state.watchtowerQueue.length, 1);
});

test("assistant shell summarizes watchtower context for permitted office users", () => {
  const state = deriveApexAssistantShellState({
    permissions: { aiOffice: { canView: true } },
    commandCenter: {
      stats: { fieldProofGaps: 2, reviewQueueItems: 1 },
      watchtowerQueue: [
        { id: "report:1", title: "Daily report", moduleId: "reports" },
        { id: "photo:1", title: "Missing photo", moduleId: "uploads" },
      ],
      watchtowerActions: [{ id: "proof", title: "Close proof gaps", moduleId: "reports" }],
    },
  });

  assert.equal(state.canView, true);
  assert.equal(state.modeLabel, "Review-only");
  assert.equal(state.statusLabel, "2 need attention");
  assert.equal(state.watchtowerQueue.length, 2);
  assert.equal(state.watchtowerActions[0].moduleId, "reports");
});

test("assistant commands route to existing modules without write actions", () => {
  const reportCommand = resolveApexAssistantCommand("open reports needing review");
  const estimateCommand = resolveApexAssistantCommand("open estimates and proposals");
  const fallbackCommand = resolveApexAssistantCommand("send the customer a message");

  assert.equal(reportCommand.moduleId, "reports");
  assert.equal(reportCommand.actionLabel, "Open reports");
  assert.equal(estimateCommand.moduleId, "estimates");
  assert.equal(fallbackCommand.moduleId, "commandCenter");
  assert.match(fallbackCommand.message, /will not send customer messages automatically/i);
});

test("empty assistant command starts with highest watchtower action", () => {
  const command = resolveApexAssistantCommand("", {
    watchtowerActions: [
      {
        title: "Unblock job startup",
        description: "Jobs need crew assignment.",
        moduleId: "jobs",
        actionLabel: "Open jobs",
      },
    ],
  });

  assert.equal(command.type, "watchtower");
  assert.equal(command.moduleId, "jobs");
  assert.match(command.message, /Unblock job startup/);
});

test("assistant summarizes missing proof for a visible office job", () => {
  const command = resolveAssistantMissingProofCommand("Summarize missing proof for Westview Warehouse", {
    permissions: {
      jobs: { canManageAll: true, canView: true },
      reports: { canManageAll: true, canReview: true },
      uploads: { canManageAll: true },
      deliveryTickets: { canManageAll: true },
    },
    jobs: [{ id: "JOB-1", title: "Westview Warehouse" }],
    commandCenter: {
      dailyReports: {
        activeJobsMissingTodayReport: [{ id: "JOB-1", title: "Westview Warehouse" }],
        dailyReportsNeedingReview: [],
      },
      uploads: { jobsMissingPhotos: [{ id: "JOB-1", title: "Westview Warehouse" }] },
      fieldRecords: {
        pendingDeliveryTickets: [{ id: "TICKET-1", jobId: "JOB-1", status: "pending" }],
        pendingPrePour: [],
        pendingPostPour: [],
        openSafetyIncidents: [],
        openToolChecklists: [],
      },
    },
  });

  assert.equal(command.type, "missing-proof-summary");
  assert.equal(command.job.title, "Westview Warehouse");
  assert.match(command.message, /3 proof items?/i);
  assert.equal(command.items.find((item) => item.id === "daily-report").status, "missing");
  assert.equal(command.items.find((item) => item.id === "photo-proof").status, "missing");
  assert.equal(command.items.find((item) => item.id === "delivery-tickets").status, "needs-review");
  assert.deepEqual(command.actions.map((action) => action.moduleId), ["reports", "uploads", "deliveryTickets"]);
});

test("assistant missing proof summary stays clear when current proof data is complete", () => {
  const command = resolveAssistantMissingProofCommand("what proof is missing", {
    permissions: { jobs: { canManageAll: true, canView: true } },
    jobs: [{ id: "JOB-2", title: "Clean Job" }],
    commandCenter: {
      dailyReports: { activeJobsMissingTodayReport: [], dailyReportsNeedingReview: [] },
      uploads: { jobsMissingPhotos: [] },
      fieldRecords: {
        pendingDeliveryTickets: [],
        pendingPrePour: [],
        pendingPostPour: [],
        openSafetyIncidents: [],
        openToolChecklists: [],
      },
    },
  });

  assert.equal(command.type, "missing-proof-summary");
  assert.match(command.message, /does not show missing proof/i);
  assert.equal(command.items.every((item) => item.status === "complete"), true);
});

test("assistant missing proof summary is blocked for field roles", () => {
  const command = resolveAssistantMissingProofCommand("show missing photos", {
    permissions: {
      jobs: { canView: true, canManageField: true, canManageAll: false },
      reports: { canCreate: true, canManageAll: false },
      uploads: { canCreate: true, canManageAll: false },
    },
    jobs: [{ id: "JOB-3", title: "Field Job" }],
  });

  assert.equal(command.type, "blocked-command");
  assert.match(command.message, /Field users stay limited/i);
});

test("assistant classifies lead to estimate rough-note commands with a review match", () => {
  const command = resolveAssistantEstimateDraftCommand(
    "Open ABC Builders and start an estimate with rough notes: Demo old concrete, pour 500 SF 4-inch broom finish, exclude permits.",
    {
      permissions: {
        estimates: { canManage: true, canUseAiRoughNotes: true },
        leads: { canView: true },
      },
      leads: [
        {
          id: "LEAD-ABC",
          customer: "ABC Builders",
          project: "Salem warehouse slab",
          city: "Salem",
          status: "Needs Estimate",
        },
      ],
      customers: [],
    },
  );

  assert.equal(command.type, "estimate-draft-review");
  assert.equal(command.matches.length, 1);
  assert.equal(command.matches[0].leadId, "LEAD-ABC");
  assert.match(command.roughNotes, /500 SF/);
  assert.match(command.message, /ABC Builders/);
});

test("assistant estimate command shows choices for ambiguous records", () => {
  const command = resolveAssistantEstimateDraftCommand("Start estimate for ABC Builders with notes: pour slab.", {
    permissions: { estimates: { canManage: true, canUseAiRoughNotes: true } },
    leads: [
      { id: "LEAD-1", customer: "ABC Builders", project: "Warehouse slab" },
      { id: "LEAD-2", customer: "ABC Builders", project: "Sidewalk repair" },
    ],
    customers: [{ id: "CUSTOMER-ABC", name: "ABC Builders" }],
  });

  assert.equal(command.type, "estimate-draft-review");
  assert.equal(command.matches.length, 3);
  assert.match(command.message, /multiple/i);
});

test("assistant estimate command falls back to a clean new draft without a match", () => {
  const command = resolveAssistantEstimateDraftCommand("Start estimate with notes: Customer: Newco Builders. Pour 300 SF sidewalk.", {
    permissions: { estimates: { canManage: true, canUseAiRoughNotes: true } },
    leads: [],
    customers: [],
  });

  assert.equal(command.type, "estimate-draft-review");
  assert.deepEqual(command.matches, []);
  assert.equal(command.fallback.customerName, "Newco Builders");
  assert.match(command.fallback.label, /Newco Builders/);
});

test("assistant estimate command blocks field or ungated rough-note access", () => {
  const fieldDenied = resolveAssistantEstimateDraftCommand("Start estimate with notes: pour slab.", {
    permissions: { estimates: { canManage: false, canUseAiRoughNotes: false } },
  });
  const packageDenied = resolveAssistantEstimateDraftCommand("Start estimate with notes: pour slab.", {
    permissions: { estimates: { canManage: true, canUseAiRoughNotes: false } },
  });

  assert.equal(fieldDenied.type, "blocked-command");
  assert.match(fieldDenied.message, /Field roles stay blocked/i);
  assert.equal(packageDenied.type, "package-blocked");
  assert.match(packageDenied.message, /Premium AI Rough Notes/i);
});

test("assistant blocks unsafe automation language before estimate matching", () => {
  const command = resolveApexAssistantCommand("send this estimate to ABC Builders", {
    commandContext: {
      permissions: { estimates: { canManage: true, canUseAiRoughNotes: true } },
      customers: [{ id: "CUSTOMER-ABC", name: "ABC Builders" }],
    },
  });

  assert.equal(command.type, "blocked-command");
  assert.equal(command.moduleId, "commandCenter");
  assert.match(command.message, /will not send/i);
});
