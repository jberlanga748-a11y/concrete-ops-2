import { summarizeApexOsMemory } from "./apexOsMemory.js";

function list(value) {
  return Array.isArray(value) ? value : [];
}

function activeRows(value) {
  return list(value).filter((row) => row && typeof row === "object" && !row.archivedAt);
}

function countStatus(rows, status) {
  const normalizedStatus = String(status || "").toLowerCase();
  return activeRows(rows).filter((row) => String(row.status || "").toLowerCase() === normalizedStatus).length;
}

function recentRows(rows, limit = 4) {
  return list(rows)
    .filter((row) => row && typeof row === "object")
    .slice()
    .sort((left, right) => String(right.createdAt || right.updatedAt || "").localeCompare(String(left.createdAt || left.updatedAt || "")))
    .slice(0, limit);
}

function text(value = "", fallback = "") {
  const normalized = String(value ?? "").replace(/\s+/g, " ").trim();
  return normalized || fallback;
}

function toneForCount(count, emptyTone = "slate") {
  return count > 0 ? "amber" : emptyTone;
}

export function buildApexOsDailyBriefing({ state = {}, user = {}, now = new Date().toISOString() } = {}) {
  const activeJobs = activeRows(state.jobs).length;
  const activeLeads = activeRows(state.leads).length;
  const activeEstimates = activeRows(state.estimates).length;
  const openQueueItems = activeRows(state.queueItems).filter((item) => !item.done);
  const blockedQueueItems = openQueueItems.filter((item) => String(item.status || "").toLowerCase() === "blocked");
  const dailyReportsDue = countStatus(state.dailyReports, "draft") + countStatus(state.dailyReports, "needs review");
  const recentEvidence = recentRows([...(state.auditEvents || []), ...(state.activity || [])], 5);
  const companySettings = state.companySettings || {};
  const memorySummary = summarizeApexOsMemory(companySettings.apexOsMemory || []);

  const briefingRows = [
    {
      id: "workspace-pulse",
      title: "Workspace pulse",
      status: `${activeJobs} jobs`,
      detail: `${activeJobs} active jobs, ${activeLeads} active leads, ${activeEstimates} active estimates, and ${openQueueItems.length} open queue items are visible to Apex OS.`,
      tone: activeJobs || activeLeads || activeEstimates ? "blue" : "slate",
    },
    {
      id: "john-action-alerts",
      title: "John action alerts",
      status: blockedQueueItems.length ? `${blockedQueueItems.length} blocked` : "Review clear",
      detail: blockedQueueItems.length
        ? `${blockedQueueItems.length} blocked queue item${blockedQueueItems.length === 1 ? "" : "s"} need manual review before Apex should recommend execution.`
        : "No blocked queue items were found in the current local workspace snapshot.",
      tone: toneForCount(blockedQueueItems.length, "green"),
    },
    {
      id: "field-proof-watch",
      title: "Field proof watch",
      status: dailyReportsDue ? `${dailyReportsDue} review` : "No report alert",
      detail: dailyReportsDue
        ? `${dailyReportsDue} daily report row${dailyReportsDue === 1 ? "" : "s"} appear to need draft/review attention.`
        : "No draft or needs-review daily report rows were found for this briefing.",
      tone: toneForCount(dailyReportsDue, "green"),
    },
    {
      id: "memory-context",
      title: "Apex OS memory context",
      status: `${memorySummary.approved || 0} approved`,
      detail: `${memorySummary.total || 0} durable memory row${memorySummary.total === 1 ? "" : "s"} exist: ${memorySummary.approved || 0} approved, ${memorySummary.suggested || 0} suggested, ${memorySummary.archived || 0} archived.`,
      tone: memorySummary.approved ? "green" : "blue",
    },
    {
      id: "release-posture",
      title: "Release posture",
      status: "Approval gated",
      detail: "Production deploy, rollback, provider changes, and hosted smoke remain locked behind release evidence and exact approval phrases.",
      tone: "amber",
    },
    {
      id: "evidence-pulse",
      title: "Evidence pulse",
      status: `${recentEvidence.length} recent`,
      detail: recentEvidence.length
        ? `Latest evidence includes ${recentEvidence.map((entry) => text(entry.summary || entry.title || entry.type || entry.action, "workspace activity")).join("; ")}.`
        : "No recent audit/activity evidence rows were found in this local snapshot.",
      tone: recentEvidence.length ? "blue" : "slate",
    },
  ];

  const alerts = [
    {
      id: "no-execution",
      title: "No autonomous execution",
      status: "Locked",
      detail: "This briefing can recommend and summarize only; it cannot run agents, deploy, send, spend, publish, delete, or mutate production.",
      tone: "amber",
    },
    {
      id: "field-boundary",
      title: "Field boundary",
      status: "Protected",
      detail: "Apex OS remains operator-only and must not expose leads, estimates, pricing, payroll, admin tools, or AI office tools to field users.",
      tone: "green",
    },
    {
      id: "approval-packets",
      title: "Approval packets",
      status: "Required",
      detail: "Money, sends, customer-visible, production, provider, auth/session, schema, destructive, or irreversible work still needs a scoped packet.",
      tone: "amber",
    },
  ];

  const nextActions = [
    blockedQueueItems.length ? "Review blocked queue items before approving any agent action." : "Use Ask Apex to pick the next safe local build slice.",
    dailyReportsDue ? "Review daily reports that need draft/review attention." : "Keep release and daily briefing checks read-only until deploy gates clear.",
    memorySummary.suggested ? "Approve or archive suggested Apex OS memory before using it as trusted context." : "Add source-backed memory only when it has a clear source label.",
  ];

  return {
    id: `APEX-BRIEF-${String(now).replace(/[^0-9A-Za-z]+/g, "-").replace(/^-|-$/g, "")}`,
    generatedAt: now,
    operatorName: text(user.name, "Apex operator"),
    status: blockedQueueItems.length || dailyReportsDue ? "Review needed" : "Ready",
    tone: blockedQueueItems.length || dailyReportsDue ? "amber" : "green",
    summary: `Apex briefing for ${text(user.name, "operator")}: ${activeJobs} jobs, ${activeLeads} leads, ${openQueueItems.length} open queue items, ${memorySummary.approved || 0} approved memory rows.`,
    briefingRows,
    alerts,
    nextActions,
    sourceLabels: [
      "Current Apex HQ workspace state",
      "Apex OS durable memory summary",
      "Apex OS release and approval locks",
      "AGENTS.md field-role protection rules",
    ],
  };
}
