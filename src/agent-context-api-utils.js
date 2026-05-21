function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function text(value = "") {
  return String(value ?? "").trim();
}

export function agentContextPayloadToWorkflowContext(payload = {}) {
  if (payload?.mode !== "read_only_agent_context") return null;
  const summary = payload.summary || {};

  return {
    generatedAt: payload.generatedAt || "",
    mode: "server_read_only_review_first",
    source: "server",
    requestId: payload.requestId || "",
    userRole: text(payload.user?.role || "Unknown"),
    visibleModuleCount: Number(summary.visibleModuleCount || 0),
    attentionCount: Number(summary.attentionCount || 0),
    summary: text(summary.text || ""),
    modules: asArray(payload.modules).filter((module) => module?.canView),
    topActions: asArray(payload.topActions),
    safetyBoundary: text(payload.safetyBoundary || "Read-only agent context. No records are changed."),
  };
}

