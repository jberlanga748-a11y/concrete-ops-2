import assert from "node:assert/strict";
import test from "node:test";

import { deriveApexAssistantShellState, resolveApexAssistantCommand } from "./apex-assistant-shell-utils.js";

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
  const estimateCommand = resolveApexAssistantCommand("start an estimate proposal");
  const fallbackCommand = resolveApexAssistantCommand("send the customer a message");

  assert.equal(reportCommand.moduleId, "reports");
  assert.equal(reportCommand.actionLabel, "Open reports");
  assert.equal(estimateCommand.moduleId, "estimates");
  assert.equal(fallbackCommand.moduleId, "commandCenter");
  assert.match(fallbackCommand.message, /will not create, send, approve, or edit/i);
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
