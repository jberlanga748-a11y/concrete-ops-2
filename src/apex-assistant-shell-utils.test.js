import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveApexAssistantShellState,
  resolveApexAssistantCommand,
  resolveAssistantEstimateDraftCommand,
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
