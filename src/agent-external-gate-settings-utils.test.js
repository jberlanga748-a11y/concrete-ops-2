import assert from "node:assert/strict";
import test from "node:test";

import {
  AGENT_EMAIL_GATE_WORKFLOW,
  buildAgentEmailGateSettingsPatch,
  deriveAgentEmailGateSettingsState,
} from "./agent-external-gate-settings-utils.js";

test("agent email gate settings default locked", () => {
  const state = deriveAgentEmailGateSettingsState({});

  assert.equal(state.enabled, false);
  assert.equal(state.statusLabel, "Locked");
  assert.match(state.detail, /cannot send customer email/i);
});

test("agent email gate settings recognize human-confirmed estimate send opt-in", () => {
  const state = deriveAgentEmailGateSettingsState({
    apexAgentAutomationPolicy: {
      externalGateSettings: {
        email_send: {
          enabled: true,
          mode: "human_confirmed",
          allowedWorkflow: AGENT_EMAIL_GATE_WORKFLOW,
          testOnly: false,
        },
      },
    },
  });

  assert.equal(state.enabled, true);
  assert.equal(state.statusLabel, "Human-confirmed");
  assert.equal(state.gate.testOnly, false);
});

test("agent email gate patch enables and disables only the email send gate", () => {
  const enabledPatch = buildAgentEmailGateSettingsPatch({
    enabled: true,
    updatedAt: "2026-05-27T08:00:00.000Z",
  });

  assert.deepEqual(enabledPatch, {
    apexAgentAutomationPolicy: {
      workflowSettings: {
        emailSend: "approval_required",
      },
      externalGateSettings: {
        email_send: {
          enabled: true,
          mode: "human_confirmed",
          allowedWorkflow: "estimate_send",
          testOnly: false,
          updatedAt: "2026-05-27T08:00:00.000Z",
        },
      },
    },
  });

  const disabledPatch = buildAgentEmailGateSettingsPatch({
    enabled: false,
    updatedAt: "2026-05-27T08:05:00.000Z",
  });

  assert.deepEqual(disabledPatch.apexAgentAutomationPolicy.externalGateSettings.email_send, {
    enabled: false,
    mode: "disabled",
    allowedWorkflow: "",
    testOnly: true,
    updatedAt: "2026-05-27T08:05:00.000Z",
  });
  assert.equal(disabledPatch.apexAgentAutomationPolicy.workflowSettings.emailSend, "locked");
});
