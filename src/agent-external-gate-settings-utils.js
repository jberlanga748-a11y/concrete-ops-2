import { normalizeApexAgentAutomationPolicy } from "../shared/apexAgentAutomationPolicy.js";

export const AGENT_EMAIL_GATE_ID = "email_send";
export const AGENT_EMAIL_GATE_WORKFLOW = "estimate_send";

export function deriveAgentEmailGateSettingsState(companySettings = {}) {
  const policy = normalizeApexAgentAutomationPolicy(companySettings.apexAgentAutomationPolicy || {});
  const gate = policy.externalGateSettings?.[AGENT_EMAIL_GATE_ID] || {};
  const enabled = gate.enabled === true
    && gate.mode === "human_confirmed"
    && (!gate.allowedWorkflow || gate.allowedWorkflow === AGENT_EMAIL_GATE_WORKFLOW);

  return {
    enabled,
    gate,
    statusLabel: enabled ? "Human-confirmed" : "Locked",
    badgeTone: enabled ? "green" : "slate",
    detail: enabled
      ? "Apex Agent may hand an approved estimate email to the normal send workflow after all confirmations."
      : "Apex Agent can draft and prepare estimate send review, but cannot send customer email.",
  };
}

export function buildAgentEmailGateSettingsPatch({ enabled, updatedAt = new Date().toISOString() } = {}) {
  const isEnabled = enabled === true;
  return {
    apexAgentAutomationPolicy: {
      workflowSettings: {
        emailSend: isEnabled ? "approval_required" : "locked",
      },
      externalGateSettings: {
        [AGENT_EMAIL_GATE_ID]: {
          enabled: isEnabled,
          mode: isEnabled ? "human_confirmed" : "disabled",
          allowedWorkflow: isEnabled ? AGENT_EMAIL_GATE_WORKFLOW : "",
          testOnly: !isEnabled,
          updatedAt,
        },
      },
    },
  };
}
