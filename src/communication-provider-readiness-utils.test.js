import assert from "node:assert/strict";
import test from "node:test";

import { deriveCommunicationProviderReadinessUiState } from "./communication-provider-readiness-utils.js";

test("communication provider readiness UI state keeps sends locked and summarizes evidence", () => {
  const state = deriveCommunicationProviderReadinessUiState({
    communicationProviderReadiness: {
      mode: "communication_provider_readiness_v1",
      status: "missing_readiness_evidence",
      externalSendExecutionEnabled: false,
      rows: [
        {
          channel: "email",
          status: "ready_for_human_confirmed_adapter_review",
          missingCheckIds: [],
          canSend: false,
        },
        {
          channel: "sms",
          status: "missing_readiness_evidence",
          missingCheckIds: ["provider_config", "opt_out"],
          canSend: false,
        },
      ],
    },
    outboundApprovals: [{ id: "A1", channel: "email", status: "queued_locked" }],
    suppressions: [{ id: "S1", channel: "all", reason: "do_not_contact" }],
    deliveryAttemptContracts: [{ id: "D1", channel: "email", status: "blocked_by_suppression_locked", failureClasses: ["suppressed", "lock_active"] }],
  });

  assert.equal(state.executionLocked, true);
  assert.equal(state.lockedLabel, "Send Locked");
  assert.equal(state.summaryCards.find((card) => card.id === "channels").value, "1/2");
  assert.equal(state.summaryCards.find((card) => card.id === "suppressions").value, 1);
  assert.equal(state.rows[1].missingLabel, "Provider Config, Opt Out");
  assert.equal(state.suppressions[0].reasonLabel, "Do Not Contact");
  assert.equal(state.outboundApprovals[0].statusLabel, "Queued Locked");
  assert.equal(state.deliveryAttemptContracts[0].failureLabel, "Suppressed, Lock Active");
});

test("communication provider readiness UI state tolerates empty payloads", () => {
  const state = deriveCommunicationProviderReadinessUiState();

  assert.equal(state.executionLocked, true);
  assert.equal(state.rows.length, 0);
  assert.equal(state.summaryCards.find((card) => card.id === "channels").value, "0/0");
  assert.equal(state.boundary, "Communication execution is locked.");
});
