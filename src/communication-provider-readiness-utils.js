function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function text(value = "") {
  return String(value ?? "").trim();
}

function titleCase(value = "") {
  return text(value)
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function deriveCommunicationProviderReadinessUiState(payload = {}) {
  const readiness = payload.communicationProviderReadiness || {};
  const rows = asArray(readiness.rows);
  const suppressions = asArray(payload.suppressions);
  const outboundApprovals = asArray(payload.outboundApprovals);
  const deliveryAttemptContracts = asArray(payload.deliveryAttemptContracts);
  const missingCheckCount = rows.reduce((count, row) => count + asArray(row.missingCheckIds).length, 0);
  const readyChannelCount = rows.filter((row) => row.status === "ready_for_human_confirmed_adapter_review").length;
  const executionLocked = readiness.externalSendExecutionEnabled !== true && rows.every((row) => row.canSend !== true);

  return {
    mode: text(readiness.mode || "communication_provider_readiness_v1"),
    status: text(readiness.status || "unknown"),
    statusLabel: readiness.status === "ready_for_locked_adapter_review" ? "Ready For Adapter Review" : "Missing Evidence",
    statusTone: readiness.status === "ready_for_locked_adapter_review" ? "green" : "amber",
    boundary: text(payload.boundary || readiness.boundary || "Communication execution is locked."),
    rows: rows.map((row) => ({
      ...row,
      channelLabel: titleCase(row.channel),
      statusLabel: row.status === "ready_for_human_confirmed_adapter_review" ? "Evidence Ready" : "Needs Evidence",
      tone: row.status === "ready_for_human_confirmed_adapter_review" ? "green" : "amber",
      missingLabel: asArray(row.missingCheckIds).map(titleCase).join(", ") || "None",
    })),
    suppressions: suppressions.map((item) => ({
      ...item,
      channelLabel: titleCase(item.channel || "all"),
      reasonLabel: titleCase(item.reason || "manual_hold"),
    })),
    outboundApprovals: outboundApprovals.map((item) => ({
      ...item,
      channelLabel: titleCase(item.channel),
      statusLabel: titleCase(item.status || "queued_locked"),
      statusTone: item.status === "queued_locked" ? "blue" : "amber",
      blockerLabel: asArray(item.blockers).join(" ") || "No readiness blockers recorded.",
    })),
    deliveryAttemptContracts: deliveryAttemptContracts.map((item) => ({
      ...item,
      channelLabel: titleCase(item.channel),
      statusLabel: titleCase(item.status || "delivery_attempt_locked"),
      statusTone: item.status === "blocked_by_suppression_locked" ? "amber" : "blue",
      failureLabel: asArray(item.failureClasses).map(titleCase).join(", ") || "Lock Active",
    })),
    summaryCards: [
      { id: "channels", label: "Channels Ready", value: `${readyChannelCount}/${rows.length || 0}`, tone: readyChannelCount === rows.length && rows.length ? "green" : "amber" },
      { id: "approvals", label: "Locked Approvals", value: outboundApprovals.length, tone: outboundApprovals.length ? "blue" : "slate" },
      { id: "suppressions", label: "Suppressions", value: suppressions.length, tone: suppressions.length ? "amber" : "green" },
      { id: "delivery", label: "Delivery Contracts", value: deliveryAttemptContracts.length, tone: deliveryAttemptContracts.length ? "blue" : "slate" },
    ],
    missingCheckCount,
    executionLocked,
    lockedLabel: executionLocked ? "Send Locked" : "Review Required",
  };
}
