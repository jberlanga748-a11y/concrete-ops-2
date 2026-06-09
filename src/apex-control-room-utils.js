import { deriveAgentOsInternalTaskOptions, deriveAgentOsRunLedgerRows } from "./agent-os-ui-utils.js";
import { deriveLaunchReadinessEvidenceState } from "./launch-readiness-utils.js";
import { deriveEnterpriseTrustReadinessState } from "./owner-health-utils.js";
import { getReleaseSafetySections } from "./release-safety-utils.js";
import {
  filterApexOsKnowledgeVault,
  filterApexOsDecisionMemory,
  buildApexOsMemorySummary,
  normalizeApexOsMemory,
  summarizeApexOsLiveOperatorMemory,
  summarizeApexOsDecisionMemory,
  summarizeApexOsKnowledgeVault,
  summarizeApexOsMemory,
} from "../shared/apexOsMemory.js";
import { redactApexOsSensitiveText } from "../shared/apexOsPrivacyFirewall.js";
import {
  APEX_OS_APPROVAL_PACKET_TEMPLATES,
  scoreApexOsApprovalPacketRisk,
  summarizeApexOsApprovalPackets,
} from "../shared/apexOsApprovalPackets.js";
import {
  buildApexOsBuildAwarenessSnapshot,
  restrictedApexOsBuildAwarenessSnapshot,
} from "../shared/apexOsBuildAwareness.js";
import { summarizeApexOsExecutionHandoffs } from "../shared/apexOsExecutionHandoffs.js";
import { buildApexOsAgentControlPlane } from "../shared/apexOsAgentControl.js";
import { normalizeApexOsAutonomyRuns, summarizeApexOsAutonomyRuns } from "../shared/apexOsAutonomyRuns.js";
import { buildApexOsKnowledgeIntelligence } from "../shared/apexOsKnowledgeIntelligence.js";
import { summarizeApexOsTasks } from "../shared/apexOsTasks.js";
import {
  buildApexPersonalOsCommandResponse,
  buildApexPersonalOsCoreState,
  buildApexPersonalOsLocalVoiceReadiness,
} from "../shared/apexPersonalOsCore.js";
import {
  buildApexLearningConversationResponse,
} from "../shared/apexLearningConversation.js";
import {
  buildApexBuildLoopConversationResponse,
  summarizeApexBuildLoopReceipt,
} from "../shared/apexAutonomousBuildLoop.js";
import {
  buildApexWorkstationBrainCommandAnswer,
  buildApexWorkstationBrainStatus,
  inferApexWorkstationBrainCommand,
} from "../shared/apexWorkstationBrainMode.js";
import {
  summarizeApexVoiceTurnFailure,
  summarizeApexVoiceTurnSpeed,
} from "../shared/apexVoiceTurnDiagnostics.js";

function list(value) {
  return Array.isArray(value) ? value : [];
}

function activeRows(value) {
  return list(value).filter((row) => !row?.archivedAt);
}

function countBlockedQueue(queueItems = []) {
  return activeRows(queueItems).filter((item) => !item?.done && String(item?.status || "").toLowerCase() === "blocked").length;
}

function latestAuditRows(auditEvents = [], limit = 4) {
  return list(auditEvents)
    .filter((event) => event && typeof event === "object")
    .slice()
    .sort((left, right) => String(right.createdAt || "").localeCompare(String(left.createdAt || "")))
    .slice(0, limit)
    .map((event) => ({
      id: event.id || event.createdAt || event.type || "audit-event",
      title: event.summary || event.type || "Workspace evidence",
      meta: event.createdAt || "",
      tone: String(event.type || "").includes("auth") ? "amber" : "slate",
    }));
}

function parseJsonObject(value) {
  if (value && typeof value === "object") return value;
  try {
    const parsed = JSON.parse(String(value || "{}"));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function safeReceiptText(value = "", limit = 240) {
  return String(redactApexOsSensitiveText(value).sanitizedText || "")
    .replace(/\bsecret[-_\s]*token[-_\s]*[a-z0-9._~+/=-]+\b/gi, "[REDACTED:token]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit);
}

function labelFromActionType(value = "") {
  const normalized = safeReceiptText(value, 80);
  if (!normalized) return "Apex action";
  return normalized
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function recordTypeFromActionType(actionType = "") {
  const normalized = String(actionType || "").toLowerCase();
  if (normalized.includes("reminder")) return "reminder";
  if (normalized.includes("task")) return "task";
  if (normalized.includes("memory")) return "memory";
  if (normalized.includes("preference")) return "preference";
  if (normalized.includes("planning")) return "planning note";
  if (normalized.includes("research")) return "research note";
  return "internal record";
}

function toneForInternalActionStatus(status = "") {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "performed") return "green";
  if (normalized === "escalated") return "amber";
  if (normalized === "blocked") return "red";
  return "slate";
}

function buildApexActivityState({ auditEvents = [] } = {}) {
  const rows = list(auditEvents)
    .filter((event) => String(event?.entityType || "").toLowerCase() === "apexosinternalaction")
    .slice()
    .sort((left, right) => String(right.createdAt || "").localeCompare(String(left.createdAt || "")))
    .slice(0, 8)
    .map((event) => {
      const detail = parseJsonObject(event.detail);
      const actionType = safeReceiptText(detail.actionType || "internal-action", 100);
      const status = safeReceiptText(detail.status || event.action || "blocked", 40).toLowerCase();
      const affectedRecordId = safeReceiptText(detail.affectedRecordId || "", 120);
      const undoHint = safeReceiptText(detail.undoHint || "Archive, edit, or reset the private record where supported.", 260);
      const summary = safeReceiptText(detail.receiptSummary || event.summary || "Apex OS internal action evaluated.", 260);
      const recordType = recordTypeFromActionType(actionType);
      return {
        id: safeReceiptText(detail.actionId || event.entityId || event.id || `${event.createdAt}-${actionType}`, 140),
        actionType,
        actionLabel: labelFromActionType(actionType),
        status,
        statusLabel: status === "performed" ? "Done" : status === "escalated" ? "Needs review" : "Stopped",
        tone: toneForInternalActionStatus(status),
        affectedRecordType: recordType,
        affectedRecordId,
        timestamp: safeReceiptText(event.createdAt || "", 80),
        reason: summary,
        undoHint,
      };
    });
  const performedCount = rows.filter((row) => row.status === "performed").length;
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const escalatedCount = rows.filter((row) => row.status === "escalated").length;
  return {
    status: rows.length ? "Receipts visible" : "No receipts yet",
    tone: rows.length ? "green" : "slate",
    loading: false,
    error: "",
    totalCount: rows.length,
    performedCount,
    blockedCount,
    escalatedCount,
    rows,
    externalActionsLocked: true,
    summaryText: rows.length
      ? `${performedCount} performed, ${blockedCount} blocked, and ${escalatedCount} escalated Level 2 internal receipts are visible.`
      : "No Level 2 internal action receipts are visible yet.",
  };
}

function toneForStatus(status) {
  const normalized = String(status || "").trim().toLowerCase();
  if (["ready", "available", "ok", "healthy", "complete"].includes(normalized)) return "green";
  if (["blocked", "locked", "review", "attention", "next", "approval required"].includes(normalized)) return "amber";
  if (["restricted", "deferred", "manual", "package locked"].includes(normalized)) return "slate";
  return "slate";
}

function formatCount(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

const APEX_OS_DERIVED_STATE_META = Object.freeze({
  "private-shell": { sourceLabel: "Apex OS access boundary", source: "shared permissions + app routing", confidence: 95 },
  "state-aggregator": { sourceLabel: "Apex OS Phase 3 aggregator", source: "deriveApexControlRoomState", confidence: 95 },
  "provider-work": { sourceLabel: "Ask Apex source lanes", source: "Apex OS chat state", confidence: 82 },
  "decision-memory": { sourceLabel: "Apex OS memory", source: "master plan + company settings", confidence: 86 },
  "agent-work-queue": { sourceLabel: "Agent OS task helpers", source: "deriveAgentOsInternalTaskOptions", confidence: 88 },
  "knowledge-vault": { sourceLabel: "Apex OS knowledge vault", source: "company settings apexOsMemory", confidence: 84 },
  "voice-interface": { sourceLabel: "Voice interface plan", source: "Control Room local state", confidence: 78 },
  "approval-command-center": { sourceLabel: "Approval packet state", source: "apexOsApprovalPackets + approval gates", confidence: 86 },
  "execution-handoffs": { sourceLabel: "Execution handoff state", source: "apexOsExecutionHandoffs + Agent OS", confidence: 86 },
  "release-monitoring": { sourceLabel: "Release monitoring state", source: "release safety + recent evidence", confidence: 82 },
  "business-command-center": { sourceLabel: "Business queue state", source: "Apex OS business queues", confidence: 80 },
  "qa-security-hardening": { sourceLabel: "QA/security proof map", source: "Apex OS hardening rows", confidence: 84 },
  "live-operator-mode": { sourceLabel: "Apex Live Operator Mode", source: "voice + autonomy + monitoring state", confidence: 86 },
  "trust-readiness": { sourceLabel: "Enterprise trust readiness", source: "deriveEnterpriseTrustReadinessState", confidence: 86 },
  "launch-readiness": { sourceLabel: "Launch readiness", source: "deriveLaunchReadinessEvidenceState", confidence: 88 },
  "agent-tasks": { sourceLabel: "Agent OS task helpers", source: "visible workspace records", confidence: 88 },
  "release-safety": { sourceLabel: "Release safety utilities", source: "getReleaseSafetySections", confidence: 92 },
  "ask-apex-chat": { sourceLabel: "Ask Apex source rows", source: "approved memory + evidence lanes", confidence: 82 },
  "launch-blocker": { sourceLabel: "Launch readiness highest priority", source: "launch readiness state", confidence: 86 },
  "agent-os-review": { sourceLabel: "Agent OS review state", source: "Agent OS task options", confidence: 86 },
  "release-approval": { sourceLabel: "Approval boundary", source: "Apex OS approval gates", confidence: 94 },
  "trust-review": { sourceLabel: "Trust readiness next action", source: "enterprise trust readiness", confidence: 84 },
  "memory-review": { sourceLabel: "Decision memory review", source: "Apex OS memory state", confidence: 86 },
  "knowledge-vault-plan": { sourceLabel: "Knowledge vault plan", source: "Phase 5 vault categories", confidence: 82 },
  "ask-apex-chat-plan": { sourceLabel: "Ask Apex plan", source: "Phase 6 chat plan", confidence: 80 },
  "voice-interface-plan": { sourceLabel: "Voice interface plan", source: "Phase 7 voice plan", confidence: 78 },
  "approval-command-center-plan": { sourceLabel: "Approval command plan", source: "Phase 8 approval plan", confidence: 82 },
  "release-monitoring-plan": { sourceLabel: "Release monitoring plan", source: "Phase 9 release desk", confidence: 82 },
  "business-command-center-plan": { sourceLabel: "Business command plan", source: "Phase 10 business queues", confidence: 80 },
  "qa-security-hardening-plan": { sourceLabel: "QA/security plan", source: "Phase 11 hardening rows", confidence: 84 },
});

function withDerivedStateMeta(row, fallback = {}) {
  const meta = APEX_OS_DERIVED_STATE_META[row?.id] || fallback;
  return {
    ...row,
    readOnly: row?.readOnly !== false,
    sourceLabel: row?.sourceLabel || meta.sourceLabel || fallback.sourceLabel || "Apex OS derived state",
    source: row?.source || meta.source || fallback.source || "deriveApexControlRoomState",
    confidence: formatCount(row?.confidence ?? meta.confidence ?? fallback.confidence, 80),
  };
}

function withDerivedStateMetaList(rows = [], fallback = {}) {
  return list(rows).map((row) => withDerivedStateMeta(row, fallback));
}

function latestMatchingEvidence(auditEvents = [], patterns = []) {
  const loweredPatterns = patterns.map((pattern) => String(pattern || "").toLowerCase()).filter(Boolean);
  return list(auditEvents)
    .filter((event) => {
      const haystack = [event?.type, event?.summary, event?.action, event?.entityType]
        .map((value) => String(value || "").toLowerCase())
        .join(" ");
      return loweredPatterns.some((pattern) => haystack.includes(pattern));
    })
    .slice()
    .sort((left, right) => String(right.createdAt || "").localeCompare(String(left.createdAt || "")))[0] || null;
}

function buildLaunchState(permissions = {}) {
  return deriveLaunchReadinessEvidenceState({
    launchGate: { guidedDemoReady: true },
    productionRelease: { releaseProcessReady: false },
    productionAuth: { workflowGuarded: true, enabled: false },
    monitoring: { baselineReady: false },
    support: { processReady: permissions?.support?.canView === true },
    legal: { claimsVerified: false, legalApproved: false },
    backup: { backupVerified: false, restoreVerified: false },
    publicLaunch: { publicLaunchApproved: false, selfServeReady: false },
  });
}

function buildTrustState({
  permissions = {},
  auditEvents = [],
  activity = [],
  companySettings = {},
} = {}) {
  return deriveEnterpriseTrustReadinessState({
    auditEvents,
    activity,
    canExportData: permissions?.settings?.canManage === true || permissions?.settings?.canExport === true,
    canViewAppHealth: permissions?.appHealth?.canView === true,
    canViewSettings: permissions?.settings?.canView === true || permissions?.settings?.canManage === true,
    canViewSupport: permissions?.support?.canView === true,
    releaseSafetyReady: true,
    packageLabel: companySettings?.packageName || companySettings?.packageId || "Current package",
  });
}

export function buildReleaseDesk({ buildAwareness = {} } = {}) {
  const sections = getReleaseSafetySections();
  const preDeploy = sections.find((section) => section.id === "preDeploy");
  const postDeploy = sections.find((section) => section.id === "postDeploy");
  const rollback = sections.find((section) => section.id === "rollback");
  const dangerous = sections.find((section) => section.id === "dangerous");
  const latestDeploy = buildAwareness?.latestDeploy || {};
  const deployHistoryRows = list(buildAwareness?.deployHistoryRows).length
    ? list(buildAwareness.deployHistoryRows)
    : latestDeploy?.version
      ? [latestDeploy]
      : [];
  const latestDeployDetail = String(latestDeploy?.detail || deployHistoryRows[0]?.detail || "");
  const hasCurrentProductionEvidence = Boolean(latestDeploy?.version || deployHistoryRows[0]?.version);
  const hasHealthEvidence = /api\/ready|database ok|health|hosted smoke|smoke passed/i.test(latestDeployDetail);
  const hasBackupEvidence = /backup|uploads-\d{8}/i.test(latestDeployDetail);
  const currentVersion = latestDeploy?.version || deployHistoryRows[0]?.version || "";
  const currentCommit = latestDeploy?.commit || deployHistoryRows[0]?.commit || "";
  const currentImage = latestDeploy?.image || deployHistoryRows[0]?.image || "";
  const productionPreviewRows = [
    {
      id: "current-production-version",
      title: "Current production version",
      status: currentVersion ? `v${currentVersion}` : "Evidence required",
      detail: currentImage
        ? `Commit ${currentCommit || "unknown"} is tied to image ${currentImage}.`
        : "Refresh build awareness or update the living plan deploy log before treating production version as known.",
      tone: currentVersion ? "green" : "amber",
      sourceLabel: latestDeploy?.sourceLabel || deployHistoryRows[0]?.sourceLabel || "Apex OS release desk",
      readOnly: true,
    },
    {
      id: "production-preview-status",
      title: "Production preview status",
      status: hasCurrentProductionEvidence ? "Preview sourced" : "Needs evidence",
      detail: hasCurrentProductionEvidence
        ? "The release desk can preview current production evidence from the living plan before any new deploy decision."
        : "No current production release evidence was parsed from the local source docs.",
      tone: hasCurrentProductionEvidence ? "green" : "amber",
      sourceLabel: "docs/APEX_HQ_LIVING_FINISH_PLAN.md",
      readOnly: true,
    },
    {
      id: "live-health-evidence",
      title: "Live health evidence",
      status: hasHealthEvidence ? "Documented" : "Required",
      detail: hasHealthEvidence
        ? latestDeployDetail
        : "A release packet must name /api/ready, hosted smoke, machine checks, and protected endpoint results before deploy approval.",
      tone: hasHealthEvidence ? "green" : "amber",
      sourceLabel: latestDeploy?.sourceLabel || "Apex OS release desk",
      readOnly: true,
    },
  ];
  const readinessPacketRows = [
    {
      id: "local-build-test-status",
      title: "Local build/test status",
      status: `${buildAwareness?.buildStatus?.status || "Build evidence"} / ${buildAwareness?.testStatus?.status || "test evidence"}`,
      detail: `${buildAwareness?.buildStatus?.detail || "Build evidence must be attached."} ${buildAwareness?.testStatus?.detail || "Focused test evidence must be attached."}`.trim(),
      tone: buildAwareness?.buildStatus?.tone === "green" && buildAwareness?.testStatus?.tone === "green" ? "green" : "amber",
      sourceLabel: "Apex OS build awareness",
      readOnly: true,
    },
    {
      id: "backup-restore-evidence",
      title: "Backup / restore evidence",
      status: hasBackupEvidence ? "Backup documented" : "Required before deploy",
      detail: hasBackupEvidence
        ? latestDeployDetail
        : "The packet must name database and uploaded-file backup artifacts, plus restore confidence, before deploy approval.",
      tone: hasBackupEvidence ? "green" : "amber",
      sourceLabel: hasBackupEvidence ? latestDeploy?.sourceLabel : "Release safety checklist",
      readOnly: true,
    },
    {
      id: "rollback-target",
      title: "Rollback target",
      status: currentVersion ? "Known-good required" : "Required",
      detail: currentVersion
        ? `Current production is v${currentVersion}; the next release packet must name the prior known-good release/image before deploy.`
        : "No production version was parsed; rollback target cannot be trusted yet.",
      tone: "amber",
      sourceLabel: "Release safety checklist",
      readOnly: true,
    },
    {
      id: "hosted-smoke-evidence",
      title: "Hosted smoke evidence",
      status: /hosted.*smoke|smoke passed/i.test(latestDeployDetail) ? "Documented pass" : "Required",
      detail: /hosted.*smoke|smoke passed/i.test(latestDeployDetail)
        ? latestDeployDetail
        : "Hosted skip-auth smoke and any approved auth smoke evidence must be attached after deploy.",
      tone: /hosted.*smoke|smoke passed/i.test(latestDeployDetail) ? "green" : "amber",
      sourceLabel: latestDeploy?.sourceLabel || "Apex OS release desk",
      readOnly: true,
    },
    {
      id: "deploy-approval-phrase",
      title: "Deploy approved phrase",
      status: "Exact approval required",
      detail: "A deploy approval packet must be approved manually with the exact required phrase; the Control Room still cannot deploy from this panel.",
      tone: "amber",
      sourceLabel: "Apex OS approval packet rules",
      readOnly: true,
    },
  ];
  const deployApprovalFlowRows = [
    {
      id: "draft-release-packet",
      title: "Draft release readiness packet",
      status: "Manual packet",
      detail: "Collect objective, changed files, tests, build, backup, restore, hosted smoke plan, rollback target, and owner approval.",
      tone: "blue",
      sourceLabel: "Phase 15 release desk",
      readOnly: true,
    },
    {
      id: "validate-before-approval",
      title: "Validation gates before approval",
      status: "Required",
      detail: "Tests, roles, build, diff check, browser QA, backup, restore, and source docs must pass before deploy approval can be considered.",
      tone: "amber",
      sourceLabel: "Release safety checklist",
      readOnly: true,
    },
    {
      id: "deploy-approved-lock",
      title: "Deploy approved flow",
      status: "Locked",
      detail: "Even after a packet is approved, deploy remains a manual Codex/release-manager action outside this UI; no surprise deploy path exists.",
      tone: "amber",
      sourceLabel: "Apex OS Phase 15 non-goal",
      readOnly: true,
    },
    {
      id: "post-deploy-release-evidence",
      title: "Post-deploy evidence",
      status: `${formatCount(postDeploy?.items?.length)} checks`,
      detail: "After deploy, record Fly release, image, machine/checks, ready/health, hosted smoke, protected endpoints, setup status, rollback target, and auth-smoke status.",
      tone: "blue",
      sourceLabel: "Release safety checklist",
      readOnly: true,
    },
  ];
  return {
    status: "Manual release only",
    tone: "amber",
    currentVersion,
    currentCommit,
    currentImage,
    productionPreviewCount: productionPreviewRows.length,
    readinessPacketCount: readinessPacketRows.length,
    deployHistoryCount: deployHistoryRows.length,
    approvalFlowCount: deployApprovalFlowRows.length,
    canDeploy: false,
    deployApprovedFlowLocked: true,
    productionActionLocked: true,
    sections: [
      {
        id: "pre-deploy",
        title: "Pre-deploy checklist",
        status: `${formatCount(preDeploy?.items?.length)} checks`,
        detail: "Tests, build, backup, restore, diff check, exact staging, push, and deploy approval stay ordered.",
        tone: "blue",
      },
      {
        id: "rollback",
        title: "Rollback path",
        status: `${formatCount(rollback?.items?.length)} checks`,
        detail: "Rollback guidance is visible, but any live rollback still requires the known-good target and approval.",
        tone: "amber",
      },
      {
        id: "dangerous",
        title: "Stop warnings",
        status: `${formatCount(dangerous?.items?.length)} locks`,
        detail: "Broad staging, force push, volume deletion, secret exposure, and wrong-folder deploys stay blocked.",
        tone: "red",
      },
    ],
    productionPreviewRows,
    readinessPacketRows,
    deployHistoryRows: deployHistoryRows.map((row) => ({
      ...row,
      title: row.title || "Apex OS release",
      detail: row.detail || "Release evidence row.",
      readOnly: true,
    })),
    deployApprovalFlowRows,
  };
}

export const APEX_CONTROL_ROOM_APPROVAL_GATES = [
  "Deploy",
  "Schema/auth/session",
  "Production data",
  "Customer-visible change",
  "Email/SMS/voice outreach",
  "Billing/payment/ad spend",
  "Provider/API setup",
  "Deletion",
];

export const APEX_OS_RELEASE_MONITORING_CHECKS = Object.freeze([
  {
    id: "current-branch-build",
    title: "Current branch/build/test status",
    status: "Evidence required",
    detail: "Local test/build evidence must be attached before any production-preview or deploy decision.",
    tone: "blue",
  },
  {
    id: "production-readiness",
    title: "Production readiness status",
    status: "Manual review",
    detail: "Production readiness stays a review packet, not a deploy trigger.",
    tone: "amber",
  },
  {
    id: "demo-readiness",
    title: "Demo app readiness status",
    status: "Manual review",
    detail: "Demo health and guided pilot readiness need visible evidence before public or customer-facing claims.",
    tone: "amber",
  },
  {
    id: "github-actions-smoke",
    title: "GitHub Actions / smoke status",
    status: "Source planned",
    detail: "Future CI/smoke monitoring can be summarized here without changing providers or production settings.",
    tone: "blue",
  },
  {
    id: "failed-test-build",
    title: "Failed test/build monitor",
    status: "Local only",
    detail: "Failures can be surfaced from local evidence; no external monitor or notification provider is configured.",
    tone: "slate",
  },
  {
    id: "agent-stalled",
    title: "Agent stalled monitor",
    status: "Review-only",
    detail: "Agent stalled state is a private briefing signal; it does not resume, pause, or run agents.",
    tone: "blue",
  },
]);

export const APEX_OS_RELEASE_MONITORING_LOCKS = Object.freeze([
  {
    id: "no-deploy",
    title: "No deploy from monitoring",
    status: "Locked",
    detail: "Monitoring can prepare readiness packets, but it cannot push, deploy, rollback, or mutate production.",
    tone: "amber",
  },
  {
    id: "no-monitoring-provider",
    title: "No production monitoring provider changes",
    status: "Approval required",
    detail: "Sentry, uptime, logging, alerting, CI integrations, and production env changes require separate approval.",
    tone: "amber",
  },
  {
    id: "no-external-alerts",
    title: "No external alerts or notifications",
    status: "Locked",
    detail: "No email, SMS, push, webhook, calendar, or external notification is sent by this surface.",
    tone: "amber",
  },
  {
    id: "no-production-data",
    title: "No production data mutation",
    status: "Locked",
    detail: "Daily briefings and release checks are read-only and do not touch production records or customer data.",
    tone: "amber",
  },
]);

export const APEX_OS_BUSINESS_QUEUE_ROWS = Object.freeze([
  {
    id: "launch-queue",
    title: "Launch queue",
    status: "Planning",
    detail: "Public launch, guided demo, pricing, claims, support, provider readiness, and production release gates stay approval-gated.",
    tone: "blue",
  },
  {
    id: "demo-pilot-queue",
    title: "Demo / pilot queue",
    status: "Planning",
    detail: "Founder-led demos, pilot setup, handoffs, check-ins, and evidence stay manual and source-backed.",
    tone: "blue",
  },
  {
    id: "marketing-queue",
    title: "Marketing queue",
    status: "Draft-only",
    detail: "Campaigns, proof assets, website/social content, and claims need review before publishing.",
    tone: "amber",
  },
  {
    id: "sales-outreach-queue",
    title: "Sales / outreach queue",
    status: "Draft-only",
    detail: "Outreach, demo booking, follow-ups, and scripts can be prepared, but no email/SMS or social send happens here.",
    tone: "amber",
  },
  {
    id: "customer-success-queue",
    title: "Customer success queue",
    status: "Planning",
    detail: "Onboarding, support, check-ins, retention, testimonials, referrals, and pilot learning stay approval-gated before customer-visible action.",
    tone: "blue",
  },
  {
    id: "revenue-offer-queue",
    title: "Revenue / pricing / offer queue",
    status: "Approval required",
    detail: "Pricing, packages, billing, invoices, payments, discounts, and revenue claims require explicit approval.",
    tone: "amber",
  },
]);

export const APEX_OS_BUSINESS_GATES = Object.freeze([
  {
    id: "manual-send",
    title: "Manual-only sends",
    status: "Locked",
    detail: "No email, SMS, social DM, calendar invite, proposal send, or customer message is sent automatically.",
    tone: "amber",
  },
  {
    id: "no-ad-spend",
    title: "No ad spend or publishing",
    status: "Locked",
    detail: "Google/Meta ads, boosted posts, public website publishing, and social posting require owner approval and provider setup.",
    tone: "amber",
  },
  {
    id: "no-billing-payment",
    title: "No billing/payment action",
    status: "Locked",
    detail: "No invoices, payment links, charges, package changes, discounts, or billing provider writes happen from Apex OS.",
    tone: "amber",
  },
  {
    id: "claims-guardrails",
    title: "Claims guardrails",
    status: "Required",
    detail: "No guaranteed leads, revenue, AI autopilot, automatic bidding, automatic sending, or unsupported production claims.",
    tone: "blue",
  },
]);

export const APEX_OS_BUSINESS_TASK_DRAFT_ROWS = Object.freeze([
  {
    id: "launch-readiness-task-draft",
    title: "Launch readiness task draft",
    status: "Draft-ready",
    detail: "Prepare launch gate review, legal/claims checklist, public signup posture, and release evidence as a private task package.",
    tone: "blue",
    sourceLabel: "Phase 10 business queue",
  },
  {
    id: "founder-demo-task-draft",
    title: "Founder-demo task draft",
    status: "Draft-ready",
    detail: "Prepare demo narrative, proof assets, pilot-fit questions, follow-up plan, and manual next steps without sending anything.",
    tone: "blue",
    sourceLabel: "Phase 10 business queue",
  },
  {
    id: "marketing-proof-task-draft",
    title: "Marketing proof task draft",
    status: "Draft-only",
    detail: "Prepare claim-safe website/social/proof copy for review. Publishing and ad spend remain locked.",
    tone: "amber",
    sourceLabel: "Phase 10 business queue",
  },
  {
    id: "sales-follow-up-task-draft",
    title: "Sales follow-up task draft",
    status: "Draft-only",
    detail: "Prepare call notes, objection handling, and follow-up scripts. Email/SMS/social sends remain locked.",
    tone: "amber",
    sourceLabel: "Phase 10 business queue",
  },
  {
    id: "customer-success-task-draft",
    title: "Customer success task draft",
    status: "Draft-ready",
    detail: "Prepare onboarding, check-in, support, testimonial, referral, and pilot learning tasks for manual review.",
    tone: "blue",
    sourceLabel: "Phase 10 business queue",
  },
  {
    id: "revenue-offer-task-draft",
    title: "Revenue / offer task draft",
    status: "Approval required",
    detail: "Prepare package, pricing, discount, billing, and offer review material. Billing/payment actions remain locked.",
    tone: "amber",
    sourceLabel: "Phase 10 business queue",
  },
]);

export const APEX_OS_BUSINESS_APPROVAL_DRAFT_ROWS = Object.freeze([
  {
    id: "business-ops-packet-draft",
    title: "Business operations packet",
    status: "Draft packet",
    detail: "Use the `business-operations` category for launch, demo, sales, marketing, customer success, or revenue work that needs owner review.",
    tone: "blue",
    sourceLabel: "Approval Command Center",
  },
  {
    id: "manual-send-packet-draft",
    title: "Manual send packet",
    status: "Packet required",
    detail: "Any email, SMS, voice, social DM, calendar invite, proposal send, or customer message needs recipient scope, copy, compliance, and exact approval.",
    tone: "amber",
    sourceLabel: "Approval Command Center",
  },
  {
    id: "ad-publishing-packet-draft",
    title: "Ads / publishing packet",
    status: "Packet required",
    detail: "Any ad spend, boosted post, public website publishing, or social publishing needs provider readiness, budget/scope, claims review, and exact approval.",
    tone: "amber",
    sourceLabel: "Approval Command Center",
  },
  {
    id: "billing-offer-packet-draft",
    title: "Billing / offer packet",
    status: "Packet required",
    detail: "Pricing, packages, discounts, invoices, payment links, checkout, or billing provider writes need a scoped money-action packet.",
    tone: "amber",
    sourceLabel: "Approval Command Center",
  },
  {
    id: "customer-visible-packet-draft",
    title: "Customer-visible packet",
    status: "Packet required",
    detail: "Anything a customer, pilot, prospect, or public visitor can see needs affected scope, rollback, claims review, and exact approval.",
    tone: "amber",
    sourceLabel: "Approval Command Center",
  },
]);

export const APEX_OS_QA_SECURITY_EVIDENCE_ROWS = Object.freeze([
  {
    id: "john-only-access",
    title: "John-only private access",
    status: "Evidence required",
    detail: "Route, navigation, bootstrap permissions, and browser checks must prove Apex OS stays private operator-only.",
    tone: "blue",
  },
  {
    id: "customer-company-isolation",
    title: "Customer/company isolation",
    status: "Evidence required",
    detail: "Apex OS must not blend customer workspaces, company records, or customer-visible surfaces into owner memory.",
    tone: "blue",
  },
  {
    id: "direct-route-blocking",
    title: "Direct-route blocking",
    status: "Evidence required",
    detail: "Non-operator users must be redirected or blocked when they manually enter the Apex OS route.",
    tone: "blue",
  },
  {
    id: "field-user-blocking",
    title: "Field-user blocking",
    status: "Locked",
    detail: "Field roles must never see Apex OS, AI office tools, leads, estimates, pricing, margins, payroll, billing, or office-only notes.",
    tone: "amber",
  },
  {
    id: "source-backed-answers",
    title: "Source-backed answers",
    status: "Mapped",
    detail: "Ask Apex has source lanes, evidence rows, and answer rules before any provider/API call can be approved.",
    tone: "blue",
  },
  {
    id: "upload-privacy",
    title: "Upload privacy",
    status: "Private intake ready",
    detail: "Knowledge Vault text intake stays private to Apex OS, rejects secrets, avoids customer workspace uploads, and requires manual review before trust.",
    tone: "green",
  },
  {
    id: "approval-gates",
    title: "Approval gate enforcement",
    status: "Mapped",
    detail: "Approval packets and locked controls protect deploys, providers, schema/auth/session, production, money, sends, publishing, and deletion.",
    tone: "amber",
  },
  {
    id: "desktop-mobile-visual",
    title: "Desktop/mobile visual quality",
    status: "Evidence required",
    detail: "Browser screenshots must confirm the private command center renders cleanly on desktop and mobile without horizontal overflow.",
    tone: "blue",
  },
  {
    id: "build-test-release",
    title: "Build/test/release safety",
    status: "Evidence required",
    detail: "Focused tests, full permission/routing suite, build, diff check, and release locks must pass before completion is claimed.",
    tone: "blue",
  },
  {
    id: "production-preview-smoke",
    title: "Production-preview smoke",
    status: "Evidence required",
    detail: "Hosted ready/health smoke, Control Room asset checks, protected endpoint checks, setup status, and rollback target must be recorded before completion.",
    tone: "blue",
  },
  {
    id: "docs-memory-drift",
    title: "Docs / memory drift",
    status: "Evidence required",
    detail: "Master plan, hard-finish roadmap, living plan, build tracker, release desk memory, and deploy log must agree before moving on.",
    tone: "blue",
  },
  {
    id: "apex-os-kill-switch",
    title: "Apex OS access kill switch",
    status: "Evidence required",
    detail: "Removing private operator access or switching out of the default Apex HQ workspace must hide nav/bootstrap state and block Apex OS APIs.",
    tone: "blue",
  },
  {
    id: "no-secrets",
    title: "No secrets exposed",
    status: "Locked",
    detail: "Apex OS surfaces must not add frontend secrets, provider keys, credentials, tokens, payment settings, or production env values.",
    tone: "amber",
  },
  {
    id: "no-bypass-actions",
    title: "No risky action bypass",
    status: "Locked",
    detail: "Chat, voice, agents, approvals, release desk, monitoring, and business queues cannot execute risky actions from this first UI.",
    tone: "amber",
  },
]);

export const APEX_OS_QA_SECURITY_LOCKS = Object.freeze([
  {
    id: "no-schema-auth-session",
    title: "No schema/auth/session change",
    status: "Locked",
    detail: "Hardening proof is read-only and does not change storage, auth, session, roles, or database schema.",
    tone: "amber",
  },
  {
    id: "no-provider-api",
    title: "No provider/API connection",
    status: "Locked",
    detail: "No AI, speech, vector, monitoring, email, SMS, ads, billing, or external provider call is added here.",
    tone: "amber",
  },
  {
    id: "no-production-mutation",
    title: "No production mutation",
    status: "Locked",
    detail: "This surface does not deploy, rollback, change production config, touch production data, or publish customer-visible work.",
    tone: "amber",
  },
  {
    id: "no-money-or-sends",
    title: "No money or sends",
    status: "Locked",
    detail: "Billing, payments, discounts, invoices, ads, email, SMS, voice outreach, and social publishing remain manual approval paths.",
    tone: "amber",
  },
  {
    id: "no-irrevocable-actions",
    title: "No irreversible actions",
    status: "Locked",
    detail: "Deletion, force pushes, destructive release operations, and customer-impacting actions are outside this slice.",
    tone: "amber",
  },
]);

export const APEX_OS_FINISHED_CAPABILITY_ROWS = Object.freeze([
  {
    id: "john-only-command-center",
    title: "John-only command center",
    detail: "Private route, nav, bootstrap, and company-scope gates keep Apex OS in the default Apex HQ workspace.",
  },
  {
    id: "text-chat-with-apex",
    title: "Text chat with Apex",
    detail: "Ask Apex can answer from private source lanes and create review-only drafts.",
  },
  {
    id: "voice-input-output",
    title: "Voice input/output",
    detail: "Open voice session, transcript confirmation, and spoken answer controls are available without hidden background capture or voice execution.",
  },
  {
    id: "knowledge-upload-reviewed-memory",
    title: "Knowledge upload and reviewed memory",
    detail: "Knowledge Vault intake, category review, trusted memory, and duplicate checks stay private and manual.",
  },
  {
    id: "decision-log",
    title: "Decision log",
    detail: "Source-backed decision memory records what John decided and keeps operating rules visible.",
  },
  {
    id: "source-backed-answers",
    title: "Source-backed answers",
    detail: "Answers cite mapped evidence rows, act privately for reversible internal work, and ask before risky action drafts.",
  },
  {
    id: "app-build-awareness",
    title: "App/build awareness",
    detail: "Branch, head, changed files, build/test scripts, source links, and deploy evidence are visible.",
  },
  {
    id: "agent-control",
    title: "Agent control",
    detail: "Agent roster, pause/resume/scoped-run requests, reports, and handoff context are visible.",
  },
  {
    id: "approval-center",
    title: "Approval center",
    detail: "Risk packets, exact phrase checks, approve/reject/defer records, and locked controls are mapped.",
  },
  {
    id: "launch-business-queues",
    title: "Launch/business queues",
    detail: "Launch, demo, marketing, sales, customer success, and revenue queues are private and manual.",
  },
  {
    id: "monitoring-daily-briefings",
    title: "Monitoring and daily briefings",
    detail: "Release monitoring, owner alerts, daily briefing rows, and saved briefing history are mapped.",
  },
  {
    id: "kill-switch",
    title: "Kill switch",
    detail: "Removing operator access, office role, or default workspace access removes Apex OS nav/state/API access.",
  },
  {
    id: "safe-task-execution-handoff",
    title: "Safe task handoff draft",
    detail: "Scoped handoffs require validation, rollback, result report, and approval-packet context before any future run.",
  },
  {
    id: "release-desk",
    title: "Release desk",
    detail: "Release readiness, deploy history, backup, hosted smoke, protected endpoint, and rollback evidence are visible.",
  },
  {
    id: "mobile-owner-cockpit",
    title: "Mobile owner cockpit",
    detail: "The private Control Room stacks into a mobile owner review cockpit for the same proof rows.",
  },
]);

export const APEX_OS_FINISHED_BLOCKED_ACTION_ROWS = Object.freeze([
  {
    id: "no-live-sends",
    title: "Email/SMS/voice sends",
    status: "Blocked",
    detail: "No live outreach leaves Apex HQ until provider setup, compliance, templates, suppression, audit, and owner approval exist.",
    tone: "amber",
  },
  {
    id: "no-ads-spend",
    title: "Ads and spend",
    status: "Blocked",
    detail: "No ad publishing, campaign launch, spend, discounts, or paid promotion can run from Apex OS.",
    tone: "amber",
  },
  {
    id: "no-billing-payments",
    title: "Billing and payments",
    status: "Blocked",
    detail: "Invoices, payment collection, billing changes, discounts, and money movement remain outside Apex OS execution.",
    tone: "amber",
  },
  {
    id: "no-customer-visible-publishing",
    title: "Customer-visible actions",
    status: "Blocked",
    detail: "Public publishing, customer messages, customer portal sharing, signatures, and visible production/customer mutations require separate approval.",
    tone: "amber",
  },
  {
    id: "no-autonomous-unrequested-agents",
    title: "Autonomous unrequested agents",
    status: "Blocked",
    detail: "Agents can prepare scoped handoffs you ask for, but no unmanaged background loop or unrequested execution is enabled.",
    tone: "amber",
  },
  {
    id: "no-irreversible-external-actions",
    title: "Irreversible external actions",
    status: "Blocked",
    detail: "Deletion, destructive production changes, external provider writes, force pushes, and irreversible customer-impacting work stay locked.",
    tone: "amber",
  },
]);

export const APEX_OS_APPROVAL_PACKET_FIELDS = Object.freeze([
  {
    id: "action",
    title: "What action",
    status: "Required",
    detail: "The exact deploy, provider, data, customer-visible, money, send, delete, or permission-affecting action must be named.",
    tone: "blue",
  },
  {
    id: "why",
    title: "Why",
    status: "Required",
    detail: "The reason, expected benefit, and what happens if John rejects or defers it must be visible.",
    tone: "blue",
  },
  {
    id: "affected-scope",
    title: "Affected files/data",
    status: "Required",
    detail: "Files, data, providers, customers, roles, environments, and external systems must be listed before approval.",
    tone: "blue",
  },
  {
    id: "risk",
    title: "Risk",
    status: "Required",
    detail: "Production, permission, privacy, money, customer, provider, legal, and rollback risks must be labeled.",
    tone: "amber",
  },
  {
    id: "validation",
    title: "Validation",
    status: "Required",
    detail: "Tests, build, browser checks, role checks, backup/restore, and source evidence must be attached when relevant.",
    tone: "blue",
  },
  {
    id: "rollback",
    title: "Rollback",
    status: "Required",
    detail: "John must see the exact rollback path before approving live or irreversible work.",
    tone: "amber",
  },
  {
    id: "approval-phrase",
    title: "Exact approval phrase/action",
    status: "Required",
    detail: "Approval must be explicit and scoped to the packet; silence or vague approval cannot execute risky work.",
    tone: "amber",
  },
]);

export const APEX_OS_APPROVAL_CONTROL_LOCKS = Object.freeze([
  {
    id: "approve",
    title: "Approve",
    status: "Decision record",
    detail: "Approval can be recorded only after a ready packet and exact phrase confirmation. It still does not execute the action.",
    tone: "green",
  },
  {
    id: "reject",
    title: "Reject",
    status: "Decision record",
    detail: "Reject records a durable review decision and audit row without touching queues, agents, releases, or customer-facing workflows.",
    tone: "green",
  },
  {
    id: "defer",
    title: "Defer",
    status: "Decision record",
    detail: "Defer records a durable review decision and keeps the action out of execution until a new explicit review happens.",
    tone: "blue",
  },
  {
    id: "execute",
    title: "Separate execution gate",
    status: "Not available",
    detail: "Approval never equals automatic execution; deploys, sends, payments, provider changes, deletion, and production actions remain separate gated steps.",
    tone: "slate",
  },
]);

export const APEX_OS_MEMORY_SOURCE = "docs/APEX_HQ_APEX_OS_COMMAND_CENTER_MASTER_PLAN.md";
export const APEX_OS_MEMORY_SOURCE_LABEL = "Apex OS master plan";

export const APEX_OS_DECISION_CATEGORIES = Object.freeze([
  { id: "product-identity", label: "Product identity" },
  { id: "safety-rule", label: "Safety rule" },
  { id: "roadmap-decision", label: "Roadmap decision" },
  { id: "build-freeze", label: "Build freeze" },
  { id: "business-goal", label: "Business goal" },
  { id: "provider-account-decision", label: "Provider/account decision" },
  { id: "personal-preference", label: "Personal preference" },
  { id: "john-personal", label: "John personal" },
  { id: "john-business", label: "John business" },
  { id: "assistant-preference", label: "Assistant preference" },
  { id: "apex-project", label: "Apex project" },
  { id: "life-routine", label: "Life routine" },
  { id: "active-priority", label: "Active priority" },
  { id: "saved-idea", label: "Saved idea" },
  { id: "people-context", label: "People context" },
  { id: "do-not-do", label: "Do-not-do rule" },
]);

export const APEX_OS_DECISION_CATEGORY_LABELS = Object.freeze(
  Object.fromEntries(APEX_OS_DECISION_CATEGORIES.map((category) => [category.id, category.label])),
);

export const APEX_OS_DECISION_MEMORY_SEED = Object.freeze([
  {
    id: "john-owns-apex-hq",
    category: "product-identity",
    title: "John Berlanga owns Apex HQ",
    status: "Active",
    detail: "Apex OS is the real Apex HQ operating center for John, not a contractor customer workspace.",
    tone: "green",
    recordedAt: "2026-06-02",
    source: APEX_OS_MEMORY_SOURCE,
    sourceLabel: APEX_OS_MEMORY_SOURCE_LABEL,
  },
  {
    id: "private-operator-only",
    category: "safety-rule",
    title: "Apex OS is private operator-only",
    status: "Locked",
    detail: "Customers, demo users, field users, estimators, normal admins, pilots, and customer companies must not see Apex OS.",
    tone: "amber",
    recordedAt: "2026-06-02",
    source: APEX_OS_MEMORY_SOURCE,
    sourceLabel: APEX_OS_MEMORY_SOURCE_LABEL,
  },
  {
    id: "approval-before-risk",
    category: "safety-rule",
    title: "Risky actions require owner approval",
    status: "Locked",
    detail: "Deploy, schema/auth/session, production data, external sends, provider setup, billing, ads, payments, deletion, and customer-visible changes stay approval-gated.",
    tone: "amber",
    recordedAt: "2026-06-02",
    source: APEX_OS_MEMORY_SOURCE,
    sourceLabel: APEX_OS_MEMORY_SOURCE_LABEL,
  },
  {
    id: "local-autonomy",
    category: "personal-preference",
    title: "Apex can move freely in local/private work",
    status: "Active",
    detail: "Planning, drafting, analysis, local code edits after request, tests, summaries, recommendations, and work-package prep are allowed when they stay private and reversible.",
    tone: "green",
    recordedAt: "2026-06-02",
    source: APEX_OS_MEMORY_SOURCE,
    sourceLabel: APEX_OS_MEMORY_SOURCE_LABEL,
  },
  {
    id: "build-order",
    category: "roadmap-decision",
    title: "Build Apex OS one safe slice at a time",
    status: "Active",
    detail: "Private access, shell, state aggregator, decision memory, knowledge vault, chat, voice, agent control, approvals, and release desk should be layered in order.",
    tone: "blue",
    recordedAt: "2026-06-02",
    source: APEX_OS_MEMORY_SOURCE,
    sourceLabel: APEX_OS_MEMORY_SOURCE_LABEL,
  },
  {
    id: "phase-freeze",
    category: "build-freeze",
    title: "Completed phases stay frozen",
    status: "Locked",
    detail: "Apex OS work must audit the current phase, finish missing pieces, validate, document, commit, and push before moving forward.",
    tone: "amber",
    recordedAt: "2026-06-02",
    source: APEX_OS_MEMORY_SOURCE,
    sourceLabel: APEX_OS_MEMORY_SOURCE_LABEL,
  },
  {
    id: "contractor-growth-ops",
    category: "business-goal",
    title: "Apex HQ serves contractor growth and operations",
    status: "Active",
    detail: "The product helps contractors get more work, win more work, run work better, reduce risk, prove work, and get paid faster.",
    tone: "green",
    recordedAt: "2026-06-02",
    source: "AGENTS.md",
    sourceLabel: "Repo product identity",
  },
  {
    id: "no-secrets-memory",
    category: "provider-account-decision",
    title: "Secrets are never normal memory",
    status: "Locked",
    detail: "Credentials, provider keys, payment settings, and sensitive account setup must not be stored in frontend code or saved as casual memory.",
    tone: "amber",
    recordedAt: "2026-06-02",
    source: APEX_OS_MEMORY_SOURCE,
    sourceLabel: APEX_OS_MEMORY_SOURCE_LABEL,
  },
]);

export const APEX_OS_OPERATING_RULES = Object.freeze([
  {
    id: "source-order",
    title: "Source order",
    status: "Active",
    detail: "Newest John instruction, verified app state, active docs/code, saved decisions, uploaded knowledge, agent logs, current research, then labeled inference.",
    tone: "blue",
  },
  {
    id: "no-hidden-memory",
    title: "No hidden risky memory",
    status: "Locked",
    detail: "Apex OS cannot silently turn risky subjects into durable rules; sensitive memory needs a visible source and later manual approval/archive flow.",
    tone: "amber",
  },
  {
    id: "field-boundary",
    title: "Field boundary",
    status: "Locked",
    detail: "Field users never see Apex OS, leads, estimates, pricing, profit, payroll, office notes, admin settings, AI office tools, billing, or other company data.",
    tone: "amber",
  },
  {
    id: "external-impact",
    title: "External impact",
    status: "Approval required",
    detail: "Anything external, irreversible, customer-visible, production-affecting, permission-affecting, provider-connected, private-data-sensitive, or money-related waits for John.",
    tone: "amber",
  },
]);

export const APEX_OS_PERSONAL_OPERATING_SEED_ROWS = Object.freeze([
  {
    id: "phase-discipline",
    title: "Finish one phase before the next",
    status: "Active preference",
    detail: "Apex should audit, finish, validate, document, commit, push, and deploy the current phase before opening the next phase.",
    tone: "green",
    sourceLabel: APEX_OS_MEMORY_SOURCE_LABEL,
  },
  {
    id: "source-backed-work",
    title: "Show what is real",
    status: "Active preference",
    detail: "Apex should distinguish what was verified from what is inferred, and it should keep important answers tied to source labels and evidence.",
    tone: "green",
    sourceLabel: APEX_OS_MEMORY_SOURCE_LABEL,
  },
  {
    id: "remove-friction-safely",
    title: "Move decisively inside safety boundaries",
    status: "Active preference",
    detail: "Apex can plan, draft, organize, code locally when asked, test, summarize, and prepare work without extra friction when it stays private and reversible.",
    tone: "green",
    sourceLabel: APEX_OS_MEMORY_SOURCE_LABEL,
  },
]);

export const APEX_OS_PERSONAL_WORK_STYLE_ROWS = Object.freeze([
  {
    id: "work-style-phase-first",
    title: "Phase-first execution",
    status: "Remembered",
    detail: "Stay on the documented phase, finish missing pieces, and avoid jumping around or rebuilding frozen systems.",
    tone: "green",
  },
  {
    id: "work-style-small-complete",
    title: "Small complete changes",
    status: "Remembered",
    detail: "Prefer the smallest complete change that preserves existing routes, state, handlers, permissions, tests, and production behavior.",
    tone: "green",
  },
  {
    id: "work-style-visual-proof",
    title: "Visual proof matters",
    status: "Remembered",
    detail: "For UI work, inspect the real screen on desktop and mobile instead of relying only on code or import tests.",
    tone: "blue",
  },
]);

export const APEX_OS_PERSONAL_COMMUNICATION_ROWS = Object.freeze([
  {
    id: "communication-direct-first",
    title: "Answer the question first",
    status: "Remembered",
    detail: "When John asks a question, answer it directly before taking action; when he asks for work, execute and keep updates short.",
    tone: "green",
  },
  {
    id: "communication-real-status",
    title: "Say what was verified",
    status: "Remembered",
    detail: "Reports should separate completed work, validation results, skipped checks, risks, permissions impact, mobile impact, rollback, and next phase.",
    tone: "green",
  },
  {
    id: "communication-calm-updates",
    title: "Keep progress visible",
    status: "Remembered",
    detail: "Longer work should include concise progress updates so the operator knows what is being checked, changed, or validated.",
    tone: "blue",
  },
]);

export const APEX_OS_PERSONAL_DAILY_FOCUS_ROWS = Object.freeze([
  {
    id: "daily-focus-current-phase",
    title: "Current phase only",
    status: "Primary focus",
    detail: "The active day-to-day focus is the current Apex OS phase until it is validated, documented, committed, pushed, and deployed.",
    tone: "green",
  },
  {
    id: "daily-focus-release-evidence",
    title: "Release evidence",
    status: "Required",
    detail: "A phase is not treated as done until production evidence and rollback notes are recorded when a production deploy is part of the phase loop.",
    tone: "amber",
  },
  {
    id: "daily-focus-next-phase",
    title: "Next phase boundary",
    status: "Locked",
    detail: "The next phase opens only after the current phase evidence commit is pushed.",
    tone: "amber",
  },
]);

export const APEX_OS_PERSONAL_DISTRACTION_RULE_ROWS = Object.freeze([
  {
    id: "distract-production-risk",
    title: "Production, auth, or security risk",
    status: "Interrupt",
    detail: "Interrupt John when production health, auth/account safety, company separation, secret exposure, or field-user privacy could be affected.",
    tone: "amber",
  },
  {
    id: "distract-validation-failure",
    title: "Validation failure",
    status: "Interrupt",
    detail: "Interrupt when focused tests, role checks, build, browser QA, or hosted smoke fail and the next step changes materially.",
    tone: "amber",
  },
  {
    id: "distract-approval-needed",
    title: "Approval needed",
    status: "Interrupt",
    detail: "Interrupt when the next step needs approval for schema/auth/session, production data, deploy, provider setup, sends, spend, billing, deletion, or customer-visible work.",
    tone: "amber",
  },
]);

export const APEX_OS_PERSONAL_BACKGROUND_ROWS = Object.freeze([
  {
    id: "background-plan-organize",
    title: "Plan and organize privately",
    status: "Allowed after request",
    detail: "Apex can organize docs, prepare roadmaps, draft task handoffs, summarize evidence, and rank next safe actions inside Apex OS.",
    tone: "green",
  },
  {
    id: "background-local-build",
    title: "Local build work",
    status: "Allowed after request",
    detail: "Apex can inspect code, edit local files, run local tests/builds, and prepare commits when John has asked for phase or feature work.",
    tone: "green",
  },
  {
    id: "background-review-drafts",
    title: "Review-only drafts",
    status: "Allowed after request",
    detail: "Apex can draft decisions, approval packets, knowledge rows, and execution handoffs without approving, queueing, running, sending, spending, or mutating production.",
    tone: "green",
  },
]);

export const APEX_OS_PERSONAL_CHECK_IN_ROWS = Object.freeze([
  {
    id: "check-in-external",
    title: "External or customer-visible actions",
    status: "Check in first",
    detail: "Email, SMS, ads, publishing, customer-facing shares, outbound communications, and public claims require explicit approval.",
    tone: "amber",
  },
  {
    id: "check-in-production",
    title: "Production-impacting work",
    status: "Check in first",
    detail: "Schema/auth/session changes, production data mutation, provider configuration, deploys, rollbacks, and irreversible changes require approval.",
    tone: "amber",
  },
  {
    id: "check-in-money-secrets-delete",
    title: "Money, secrets, or deletion",
    status: "Check in first",
    detail: "Billing/payment, ad spend, provider secrets, credential handling, account setup, destructive file/data deletion, and irreversible work require approval.",
    tone: "amber",
  },
]);

export const APEX_OS_PERSONAL_PRIVACY_LOCKS = Object.freeze([
  {
    id: "privacy-explicit-only",
    title: "Explicit preferences only",
    status: "Locked",
    detail: "Apex OS can store preferences only when they are explicitly entered, sourced, and reviewable as personal-preference memory.",
    tone: "amber",
  },
  {
    id: "privacy-no-sensitive-tracking",
    title: "No sensitive personal tracking",
    status: "Locked",
    detail: "This layer does not collect hidden personal activity, background location, microphone, behavioral tracking, or off-app personal data.",
    tone: "amber",
  },
  {
    id: "privacy-operator-only",
    title: "Operator-only preference memory",
    status: "Locked",
    detail: "Personal operating preferences stay inside private Apex OS memory and are blocked from normal admins, field users, customers, pilots, and demo users.",
    tone: "green",
  },
  {
    id: "privacy-no-background-execution",
    title: "No background execution",
    status: "Locked",
    detail: "Preferences can guide Apex OS planning and wording, but they do not create unmanaged background loops or autonomous external actions.",
    tone: "amber",
  },
]);

export const APEX_OS_KNOWLEDGE_VAULT_CATEGORIES = Object.freeze([
  {
    id: "app-docs",
    title: "Apex HQ app docs",
    status: "Ready to classify",
    detail: "Roadmaps, source-of-truth docs, phase reports, QA notes, release notes, and app architecture references.",
    tone: "blue",
  },
  {
    id: "business-strategy",
    title: "Business strategy",
    status: "Ready to classify",
    detail: "Apex HQ positioning, pricing ideas, market strategy, launch priorities, and internal business decisions.",
    tone: "blue",
  },
  {
    id: "marketing-sales",
    title: "Marketing / sales",
    status: "Ready to classify",
    detail: "Campaign ideas, founder-led sales notes, demo scripts, objections, proof assets, and outreach drafts.",
    tone: "blue",
  },
  {
    id: "customer-research",
    title: "Customer research",
    status: "Review required",
    detail: "Contractor interviews, ICP notes, demo feedback, pilot learning, and competitive research with source context.",
    tone: "amber",
  },
  {
    id: "legal-risk",
    title: "Legal / risk review notes",
    status: "Review required",
    detail: "Privacy, claims, compliance, contract, safety, insurance, or public-launch risk notes that need source labels.",
    tone: "amber",
  },
  {
    id: "brand-design",
    title: "Brand / design assets",
    status: "Ready to classify",
    detail: "Apex HQ logo, screenshots, design direction, UI standards, visual QA notes, and presentation assets.",
    tone: "blue",
  },
  {
    id: "product-ideas",
    title: "Product ideas",
    status: "Ready to classify",
    detail: "Feature ideas, workflow notes, future modules, agent concepts, and customer problem statements.",
    tone: "blue",
  },
  {
    id: "private-owner-notes",
    title: "Private owner notes",
    status: "Private",
    detail: "John-only preferences, operating style, internal priorities, and non-customer Apex HQ context.",
    tone: "green",
  },
]);

export const APEX_OS_KNOWLEDGE_VAULT_SAFETY_RULES = Object.freeze([
  {
    id: "no-storage-yet",
    title: "Private text intake",
    status: "Active",
    detail: "Text-file and manual knowledge intake saves only reviewed text metadata into private Apex OS memory; no binary files, schema changes, embeddings, or providers are used.",
    tone: "green",
  },
  {
    id: "no-secrets",
    title: "No secrets or credentials",
    status: "Locked",
    detail: "API keys, passwords, tokens, payment settings, private credentials, and production secrets are not accepted as normal knowledge.",
    tone: "amber",
  },
  {
    id: "source-review",
    title: "Source and review required",
    status: "Required",
    detail: "Knowledge needs source metadata and review status before Apex can treat it as trusted context.",
    tone: "blue",
  },
  {
    id: "no-customer-mixing",
    title: "No customer workspace mixing",
    status: "Locked",
    detail: "Apex OS knowledge stays private to Apex HQ and must not blend customer/company workspace data into owner memory.",
    tone: "amber",
  },
]);

export const APEX_OS_KNOWLEDGE_SOURCE_CANDIDATES = Object.freeze([
  {
    id: "apex-os-master-plan",
    title: "Apex OS master plan",
    status: "Source ready",
    detail: "Current Apex OS roadmap, decision memory, access model, phases, safety gates, and completion plan.",
    tone: "green",
    source: APEX_OS_MEMORY_SOURCE,
  },
  {
    id: "living-finish-plan",
    title: "Living finish plan",
    status: "Source ready",
    detail: "Current build memory, validation evidence, user requests, deploy notes, and active phase state.",
    tone: "green",
    source: "docs/APEX_HQ_LIVING_FINISH_PLAN.md",
  },
  {
    id: "repo-contract",
    title: "Repo operating contract",
    status: "Source ready",
    detail: "Apex HQ product identity, source-of-truth order, non-negotiable rules, and field-role protections.",
    tone: "green",
    source: "AGENTS.md",
  },
  {
    id: "future-uploads",
    title: "Private knowledge uploads",
    status: "Text intake active",
    detail: "Local text files can be classified into the vault and saved as suggested Apex OS memory for manual review.",
    tone: "green",
    source: "Private Apex OS memory",
  },
]);

export const APEX_OS_CHAT_CONTEXTS = Object.freeze([
  {
    id: "app-code",
    title: "App / code",
    status: "Selectable",
    detail: "Routes, permissions, release safety, health checks, and current implementation notes.",
    tone: "blue",
  },
  {
    id: "docs-memory",
    title: "Docs / memory",
    status: "Selectable",
    detail: "Apex OS master plan, living finish plan, repo contract, decision memory, and operating rules.",
    tone: "blue",
  },
  {
    id: "business",
    title: "Business",
    status: "Selectable",
    detail: "Positioning, launch priorities, sales systems, customer research, and John-only owner notes.",
    tone: "blue",
  },
  {
    id: "launch",
    title: "Launch",
    status: "Selectable",
    detail: "Launch readiness, guided pilot gates, provider readiness, support, trust, and public-launch locks.",
    tone: "amber",
  },
  {
    id: "agents",
    title: "Agents",
    status: "Selectable",
    detail: "Agent OS work queue, run ledger, locked tasks, safety locks, and future approval paths.",
    tone: "blue",
  },
  {
    id: "all",
    title: "All context",
    status: "Review required",
    detail: "Combined source-backed answers must show evidence before John treats the answer as operational truth.",
    tone: "amber",
  },
]);

export const APEX_OS_CHAT_ACTION_LOCKS = Object.freeze([
  {
    id: "ask-provider",
    title: "Ask Apex answer endpoint",
    status: "Server-only",
    detail: "Answers run through the private Apex OS endpoint with local source-backed fallback; provider secrets stay server-side and no chat action can execute work.",
    tone: "green",
  },
  {
    id: "save-decision",
    title: "Save as decision",
    status: "Suggested only",
    detail: "Ask Apex can draft suggested decision memory from an answer; it is not trusted context until manually approved.",
    tone: "green",
  },
  {
    id: "create-task",
    title: "Create task",
    status: "Draft handoff",
    detail: "Ask Apex can draft a review-only execution handoff with role, work type, validation, rollback, and result slots; it cannot queue, run, or assign agent work.",
    tone: "green",
  },
  {
    id: "needs-approval",
    title: "Needs approval",
    status: "Draft packet",
    detail: "Risky answers can draft an approval packet for manual review; no deploy, spend, send, provider, customer, or production action runs from chat.",
    tone: "green",
  },
]);

export const APEX_OS_VOICE_MODES = Object.freeze([
  {
    id: "open-voice-session",
    title: "Open voice session",
    status: "Visible mic",
    detail: "Voice opens from a visible operator action, stays open while the operator speaks, then closes into transcript review before Ask Apex can use it.",
    tone: "green",
  },
  {
    id: "transcript-confirmation",
    title: "Transcript confirmation",
    status: "Ready",
    detail: "Apex shows confirmed text before it can be copied into Ask Apex as a question.",
    tone: "green",
  },
  {
    id: "spoken-answer",
    title: "Spoken answer",
    status: "Playback ready",
    detail: "Apex can speak Ask Apex answers through a private server-side speech endpoint when configured, with browser speech fallback when not configured.",
    tone: "green",
  },
  {
    id: "risky-command-confirmation",
    title: "Risky command confirmation",
    status: "Locked",
    detail: "Deploy, send, spend, customer-visible, provider, production, money, and deletion commands need visible owner approval.",
    tone: "amber",
  },
]);

export const APEX_OS_VOICE_SAFETY_GATES = Object.freeze([
  {
    id: "no-microphone",
    title: "No hidden microphone access",
    status: "Visible open only",
    detail: "Microphone permission is requested only from the visible voice control; no hidden background capture exists.",
    tone: "green",
  },
  {
    id: "visible-open-session",
    title: "Open voice control",
    status: "Visible session",
    detail: "Open voice stays user-visible and must be closed from the voice surface before transcription review.",
    tone: "green",
  },
  {
    id: "no-speech-provider",
    title: "Server-side speech provider",
    status: "Server-only",
    detail: "Speech-to-text and text-to-speech use server-side providers only when configured; frontend code never receives provider secrets and audio is not stored.",
    tone: "green",
  },
  {
    id: "no-voice-actions",
    title: "No voice execution",
    status: "Locked",
    detail: "Voice cannot run agents, mutate records, deploy, send, spend, publish, delete, or touch production data.",
    tone: "amber",
  },
]);

function memoryStatusTone(status = "") {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "approved") return "green";
  if (normalized === "archived") return "slate";
  if (normalized === "suggested") return "blue";
  if (normalized === "locked") return "amber";
  if (normalized === "active") return "green";
  return "slate";
}

function decisionCategoryLabel(category = "general") {
  return APEX_OS_DECISION_CATEGORY_LABELS[category] || String(category || "General").replace(/-/g, " ");
}

function buildDecisionMemoryState(companySettings = {}) {
  const durableMemory = normalizeApexOsMemory(companySettings?.apexOsMemory || []);
  const durableDecisionMemory = filterApexOsDecisionMemory(durableMemory);
  const decisionSummary = summarizeApexOsDecisionMemory(durableMemory);
  const durableDecisionRows = durableDecisionMemory.map((entry) => ({
    id: entry.id,
    category: decisionCategoryLabel(entry.category),
    title: entry.title,
    status: entry.status,
    detail: entry.body,
    tone: memoryStatusTone(entry.status),
    recordedAt: entry.approvedAt || entry.createdAt || entry.updatedAt,
    source: entry.sourceUri,
    sourceLabel: entry.sourceLabel,
    reviewNote: entry.reviewNote,
  }));
  const memorySummary = summarizeApexOsMemory(durableMemory);
  const decisions = APEX_OS_DECISION_MEMORY_SEED.map((item) => ({
    ...item,
    category: decisionCategoryLabel(item.category),
  }));
  const rules = APEX_OS_OPERATING_RULES.map((item) => ({
    ...item,
    source: APEX_OS_MEMORY_SOURCE,
    sourceLabel: APEX_OS_MEMORY_SOURCE_LABEL,
    recordedAt: "2026-06-02",
  }));
  const lockedCount = decisions.filter((item) => item.status === "Locked").length + rules.filter((item) => item.status === "Locked").length;
  const coveredCategoryIds = new Set([
    ...APEX_OS_DECISION_MEMORY_SEED.map((item) => item.category),
    ...durableDecisionMemory.map((item) => item.category),
  ]);
  return {
    status: decisionSummary.total ? "Durable memory active" : "Seeded from plan",
    tone: "green",
    source: APEX_OS_MEMORY_SOURCE,
    decisionCount: decisions.length,
    ruleCount: rules.length,
    durableCount: durableDecisionRows.length,
    approvedCount: decisionSummary.approved,
    suggestedCount: decisionSummary.suggested,
    archivedCount: decisionSummary.archived,
    sourceCount: decisionSummary.sourceCount,
    lockedCount,
    categoryCount: APEX_OS_DECISION_CATEGORIES.length,
    coveredCategoryCount: coveredCategoryIds.size,
    categories: APEX_OS_DECISION_CATEGORIES.map((category) => ({
      ...category,
      status: coveredCategoryIds.has(category.id) ? "Covered" : "Ready",
      tone: coveredCategoryIds.has(category.id) ? "green" : "blue",
    })),
    decisions,
    durableEntries: durableDecisionMemory,
    durableDecisions: durableDecisionRows,
    rules,
    memorySummary: decisionSummary,
    allMemorySummary: memorySummary,
    sourceOptions: decisionSummary.sourceLabels,
    reviewHistory: decisionSummary.reviewHistory,
  };
}

function personalPreferenceRow(entry = {}) {
  return {
    id: entry.id,
    title: entry.title || "Personal preference",
    status: entry.status || "suggested",
    detail: truncateDetail(entry.body || entry.reviewNote || "Explicit Apex OS personal operating preference.", 260),
    tone: memoryStatusTone(entry.status),
    sourceLabel: entry.sourceLabel || "Apex OS personal preference",
    source: entry.sourceUri || "Private Apex OS memory",
    reviewNote: entry.reviewNote,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    approvedAt: entry.approvedAt,
    archivedAt: entry.archivedAt,
    category: entry.category,
    body: entry.body,
  };
}

function memorySuggestionReviewRow(entry = {}) {
  const type = entry.type || entry.category || "apex-project";
  return {
    id: entry.id,
    title: entry.title || "Memory suggestion",
    status: entry.status || "suggested",
    detail: truncateDetail(entry.body || entry.reviewNote || "Suggested Apex OS memory waiting for John/operator review.", 320),
    tone: memoryStatusTone(entry.status),
    sourceLabel: entry.sourceLabel || "Apex OS memory suggestion",
    source: entry.sourceUri || entry.sourceType || "Private Apex OS memory",
    reviewNote: entry.reviewNote,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    approvedAt: entry.approvedAt,
    archivedAt: entry.archivedAt,
    category: entry.category,
    type,
    typeLabel: APEX_OS_DECISION_CATEGORY_LABELS[type] || humanizeId(type),
    body: entry.body,
    sourceType: entry.sourceType,
    sourceUri: entry.sourceUri,
    confidence: entry.confidence,
  };
}

function memorySuggestionReviewSortValue(entry = {}) {
  return entry.status === "approved"
    ? String(entry.approvedAt || entry.updatedAt || entry.createdAt || "")
    : String(entry.createdAt || entry.updatedAt || entry.approvedAt || "");
}

function buildMemorySuggestionReviewState(companySettings = {}) {
  const memory = normalizeApexOsMemory(companySettings?.apexOsMemory || []);
  const sorted = memory
    .slice()
    .sort((left, right) => memorySuggestionReviewSortValue(right).localeCompare(memorySuggestionReviewSortValue(left)));
  const suggestedRows = sorted.filter((entry) => entry.status === "suggested");
  const approvedRows = sorted.filter((entry) => entry.status === "approved");
  const archivedRows = sorted.filter((entry) => entry.status === "archived");
  const summary = buildApexOsMemorySummary(memory, { limit: 4 });
  const sourceOptions = [...new Set(suggestedRows.map((entry) => entry.sourceLabel).filter(Boolean))]
    .sort((left, right) => left.toLowerCase().localeCompare(right.toLowerCase()));

  return {
    status: suggestedRows.length ? "Review waiting" : "No pending suggestions",
    tone: suggestedRows.length ? "amber" : approvedRows.length ? "green" : "blue",
    suggestedCount: suggestedRows.length,
    approvedCount: approvedRows.length,
    archivedCount: archivedRows.length,
    totalCount: memory.length,
    sourceCount: sourceOptions.length,
    sourceOptions,
    rows: suggestedRows.slice(0, 12).map(memorySuggestionReviewRow),
    recentApprovedRows: approvedRows.slice(0, 4).map(memorySuggestionReviewRow),
    summary,
  };
}

function taskReminderStatusRow(entry = {}) {
  const label = entry.type === "reminder" ? "Reminder" : "Task";
  return {
    id: `apex-os-task-${entry.id}`,
    title: entry.title || label,
    status: `${label} / ${entry.priority || "normal"}`,
    detail: [entry.dueText || entry.dueAt || "", entry.category || "general"].filter(Boolean).join(" | ") || "Internal Apex OS item.",
    tone: entry.priority === "critical" ? "red" : entry.priority === "high" ? "amber" : "blue",
    sourceLabel: "Apex OS tasks/reminders",
    source: "company settings apexOsTasks",
    confidence: 86,
    readOnly: true,
  };
}

function buildPersonalOperatingLayerState(decisionMemory = {}, companySettings = {}) {
  const personalMemoryCategories = new Set([
    "personal-preference",
    "john-personal",
    "assistant-preference",
    "life-routine",
    "active-priority",
    "people-context",
    "do-not-do",
  ]);
  const personalEntries = (decisionMemory.durableEntries || [])
    .filter((entry) => personalMemoryCategories.has(entry.category));
  const approvedEntries = personalEntries.filter((entry) => entry.status === "approved");
  const suggestedEntries = personalEntries.filter((entry) => entry.status === "suggested");
  const archivedEntries = personalEntries.filter((entry) => entry.status === "archived");
  const approvedPreferenceRows = approvedEntries.map(personalPreferenceRow);
  const reviewRows = personalEntries
    .slice()
    .sort((left, right) => String(right.updatedAt || right.createdAt || right.approvedAt || "").localeCompare(String(left.updatedAt || left.createdAt || left.approvedAt || "")))
    .map(personalPreferenceRow);
  const sourceOptions = [...new Set(personalEntries.map((entry) => entry.sourceLabel).filter(Boolean))]
    .sort((left, right) => left.toLowerCase().localeCompare(right.toLowerCase()));
  const taskReminderSummary = summarizeApexOsTasks(companySettings?.apexOsTasks || [], { limit: 5 });
  const taskReminderRows = [
    ...taskReminderSummary.highestPriorityItems,
    ...taskReminderSummary.dueSoonItems.filter((dueItem) => (
      !taskReminderSummary.highestPriorityItems.some((priorityItem) => priorityItem.id === dueItem.id)
    )),
  ].slice(0, 5).map(taskReminderStatusRow);

  return {
    status: approvedEntries.length ? "Personal preferences active" : "Personal layer ready",
    tone: approvedEntries.length ? "green" : "blue",
    source: APEX_OS_MEMORY_SOURCE,
    sourceLabel: APEX_OS_MEMORY_SOURCE_LABEL,
    preferenceCount: APEX_OS_PERSONAL_OPERATING_SEED_ROWS.length + approvedPreferenceRows.length,
    approvedCount: approvedEntries.length,
    suggestedCount: suggestedEntries.length,
    archivedCount: archivedEntries.length,
    reviewCount: reviewRows.length,
    sourceCount: sourceOptions.length,
    workStyleCount: APEX_OS_PERSONAL_WORK_STYLE_ROWS.length,
    communicationCount: APEX_OS_PERSONAL_COMMUNICATION_ROWS.length,
    dailyFocusCount: APEX_OS_PERSONAL_DAILY_FOCUS_ROWS.length,
    distractionRuleCount: APEX_OS_PERSONAL_DISTRACTION_RULE_ROWS.length,
    backgroundCount: APEX_OS_PERSONAL_BACKGROUND_ROWS.length,
    checkInCount: APEX_OS_PERSONAL_CHECK_IN_ROWS.length,
    privacyLockCount: APEX_OS_PERSONAL_PRIVACY_LOCKS.length,
    openTaskCount: taskReminderSummary.openTaskCount,
    openReminderCount: taskReminderSummary.openReminderCount,
    taskReminderSummary,
    taskReminderRows,
    preferenceRows: [
      ...APEX_OS_PERSONAL_OPERATING_SEED_ROWS.map((item) => ({ ...item, readOnly: true })),
      ...approvedPreferenceRows,
    ],
    workStyleRows: APEX_OS_PERSONAL_WORK_STYLE_ROWS.map((item) => ({ ...item })),
    communicationRows: APEX_OS_PERSONAL_COMMUNICATION_ROWS.map((item) => ({ ...item })),
    dailyFocusRows: APEX_OS_PERSONAL_DAILY_FOCUS_ROWS.map((item) => ({ ...item })),
    distractionRows: APEX_OS_PERSONAL_DISTRACTION_RULE_ROWS.map((item) => ({ ...item })),
    backgroundRows: APEX_OS_PERSONAL_BACKGROUND_ROWS.map((item) => ({ ...item })),
    checkInRows: APEX_OS_PERSONAL_CHECK_IN_ROWS.map((item) => ({ ...item })),
    privacyRows: APEX_OS_PERSONAL_PRIVACY_LOCKS.map((item) => ({ ...item })),
    reviewRows,
    preferenceEntries: personalEntries,
    sourceOptions,
    canStoreSensitiveTracking: false,
    hiddenTrackingEnabled: false,
    backgroundExecutionEnabled: false,
  };
}

function liveOperatorMemoryTone(status = "") {
  if (status === "approved") return "green";
  if (status === "suggested") return "amber";
  if (status === "archived") return "slate";
  return "blue";
}

function buildLiveOperatorMemoryState(companySettings = {}) {
  const summary = summarizeApexOsLiveOperatorMemory(companySettings?.apexOsMemory || [], { limit: 6 });
  const latestRows = summary.trustedRows.map((entry) => ({
    id: entry.id,
    title: entry.title,
    status: entry.kind,
    detail: truncateDetail(entry.body, 240),
    tone: "green",
    sourceLabel: entry.sourceLabel,
    source: entry.sourceUri,
    reviewedAt: entry.reviewedAt,
  }));
  const reviewRows = [...summary.pendingRows, ...summary.trustedRows]
    .slice(0, 8)
    .map((entry) => ({
      id: entry.id,
      title: entry.title,
      status: entry.status,
      detail: truncateDetail(entry.body, 220),
      tone: liveOperatorMemoryTone(entry.status),
      sourceLabel: entry.sourceLabel,
      source: entry.sourceUri,
      reviewedAt: entry.reviewedAt,
    }));

  return {
    status: summary.approved ? "Trusted run history" : summary.suggested ? "Run memory review" : "Run memory ready",
    tone: summary.approved ? "green" : summary.suggested ? "amber" : "blue",
    totalCount: summary.total,
    trustedCount: summary.approved,
    suggestedCount: summary.suggested,
    archivedCount: summary.archived,
    turnCount: summary.turnCount,
    runCount: summary.runCount,
    proactiveCheckInCount: summary.proactiveCheckInCount,
    sourceCount: summary.sourceCount,
    latestTrustedAt: summary.latestTrustedAt,
    latestSuggestedAt: summary.latestSuggestedAt,
    sourceOptions: summary.sourceLabels,
    latestRows,
    reviewRows,
  };
}

function buildKnowledgeVaultState(companySettings = {}) {
  const categories = APEX_OS_KNOWLEDGE_VAULT_CATEGORIES.map((item) => ({ ...item }));
  const safetyRows = APEX_OS_KNOWLEDGE_VAULT_SAFETY_RULES.map((item) => ({ ...item }));
  const sourceRows = APEX_OS_KNOWLEDGE_SOURCE_CANDIDATES.map((item) => ({ ...item }));
  const memory = normalizeApexOsMemory(companySettings?.apexOsMemory || []);
  const memorySummary = summarizeApexOsMemory(memory);
  const vaultSummary = summarizeApexOsKnowledgeVault(memory);
  const vaultEntries = filterApexOsKnowledgeVault(memory);
  const intelligenceSummary = buildApexOsKnowledgeIntelligence(memory, { limit: 6 });
  return {
    status: intelligenceSummary.totalRows ? "Knowledge intelligence ready" : "Upload intake ready",
    tone: vaultSummary.total ? "green" : "blue",
    categoryCount: categories.length,
    sourceCount: sourceRows.length,
    lockedRuleCount: safetyRows.filter((item) => item.status === "Locked").length,
    memorySummary,
    vaultSummary,
    vaultEntries,
    intelligenceSummary: {
      status: intelligenceSummary.status,
      rankedCount: intelligenceSummary.rankedRows.length,
      conflictCount: intelligenceSummary.conflictWarnings.length,
      trustedCount: intelligenceSummary.trustedCount,
      suggestedCount: intelligenceSummary.suggestedCount,
      embeddingStatus: intelligenceSummary.embeddingStatus,
    },
    sourceOptions: vaultSummary.sourceLabels,
    categories,
    safetyRows,
    sourceRows,
  };
}

function buildAskApexChatState({
  decisionMemory,
  knowledgeVault,
  agentWorkQueue,
  launchState,
  releaseDesk,
} = {}) {
  const contexts = APEX_OS_CHAT_CONTEXTS.map((item) => ({ ...item }));
  const actionLocks = APEX_OS_CHAT_ACTION_LOCKS.map((item) => ({ ...item }));
  const evidenceRows = [
    {
      id: "apex-os-master-plan",
      title: "Apex OS master plan",
      status: "Primary source",
      detail: "Defines Ask Apex chat, source-backed answer cards, evidence drawer, and action boundaries.",
      tone: "green",
      source: APEX_OS_MEMORY_SOURCE,
    },
    {
      id: "decision-memory",
      title: "Decision memory",
      status: decisionMemory?.status || "Planned",
      detail: `${formatCount(decisionMemory?.decisionCount)} decisions and ${formatCount(decisionMemory?.ruleCount)} operating rules are available as read-only guidance.`,
      tone: decisionMemory?.tone || "slate",
      source: APEX_OS_MEMORY_SOURCE,
    },
    {
      id: "knowledge-vault",
      title: "Knowledge Vault",
      status: knowledgeVault?.status || "Planned",
      detail: `${formatCount(knowledgeVault?.categoryCount)} categories and ${formatCount(knowledgeVault?.sourceCount)} source candidates support private reviewed text intake.`,
      tone: knowledgeVault?.tone || "slate",
      source: "Apex OS Slice 5",
    },
    {
      id: "agent-work-queue",
      title: "Agent work queue",
      status: agentWorkQueue?.status || "Planned",
      detail: `${formatCount(agentWorkQueue?.availableTaskCount)} review-only task types and ${formatCount(agentWorkQueue?.recentRunCount)} recent run rows can inform answers.`,
      tone: agentWorkQueue?.tone || "slate",
      source: "Agent OS read-only state",
    },
    {
      id: "launch-readiness",
      title: "Launch readiness",
      status: launchState?.status || "Planned",
      detail: `${formatCount(launchState?.readyCount)} of ${formatCount(launchState?.totalCount)} launch gates are ready; public launch remains locked.`,
      tone: launchState?.tone || "slate",
      source: "Launch readiness state",
    },
    {
      id: "release-desk",
      title: "Release Desk",
      status: releaseDesk?.status || "Manual release only",
      detail: "Deploy answers must keep backup, restore, tests, build, rollback, and owner approval in the evidence trail.",
      tone: releaseDesk?.tone || "amber",
      source: "Release safety utilities",
    },
  ];
  return {
    status: "Source-backed live",
    tone: "green",
    providerStatus: "Local-first Ollama",
    contextCount: contexts.length,
    evidenceCount: evidenceRows.length,
    actionLockCount: actionLocks.length,
    placeholder: "Ask Apex about the app, roadmap, agents, launch, business, or next safe build step.",
    answerPreview: {
      id: "source-backed-preview",
      title: "Source-backed answer surface",
      status: "Ready",
      detail: "Apex answers through local-first intelligence, uses approved memory/source labels, acts privately for reversible internal work, and asks before deploy, provider, production, money, sends, customer-visible, deletion, or other consequential requests.",
      tone: "green",
    },
    contexts,
    evidenceRows,
    actionLocks,
  };
}

function buildVoiceInterfaceState({ askApexChat } = {}) {
  const modes = APEX_OS_VOICE_MODES.map((item) => ({ ...item }));
  const safetyRows = APEX_OS_VOICE_SAFETY_GATES.map((item) => ({ ...item }));
  return {
    status: "Voice playback ready",
    tone: "green",
    providerStatus: "Open voice ready",
    modeCount: modes.length,
    safetyCount: safetyRows.length,
    transcriptStatus: "Manual confirmation",
    answerStatus: askApexChat?.status === "Source-backed live" ? "Ask Apex ready" : "Chat shell required",
    prompt: "Transcript before Apex listens",
    transcriptPreview: "Type and confirm what Apex heard before it becomes an Ask Apex question.",
    answerPreview: "Apex keeps the typed answer visible after generation; voice playback is optional and can fail over without hiding the text.",
    modes,
    safetyRows,
  };
}

function buildApprovalCommandCenterState({ releaseDesk, askApexChat, voiceInterface, companySettings = {} } = {}) {
  const queueRows = APEX_CONTROL_ROOM_APPROVAL_GATES.map((label) => ({
    id: label.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    title: label,
    status: "Packet required",
    detail: `${label} requests need action, reason, affected scope, risk, validation, rollback, and exact owner approval before any separate gated workflow can be considered.`,
    tone: "amber",
  }));
  const packetRows = APEX_OS_APPROVAL_PACKET_FIELDS.map((item) => ({ ...item }));
  const controlRows = APEX_OS_APPROVAL_CONTROL_LOCKS.map((item) => ({ ...item }));
  const packetSummary = summarizeApexOsApprovalPackets(companySettings?.apexOsApprovalPackets || []);
  const templateRows = APEX_OS_APPROVAL_PACKET_TEMPLATES.map((template) => {
    const risk = scoreApexOsApprovalPacketRisk(template);
    return {
      id: template.id,
      title: template.title,
      status: `${risk.band} risk`,
      detail: `${template.exactApprovalPhrase} | Evidence: ${(template.requiredEvidence || []).join(", ")}`,
      tone: risk.band === "critical" || risk.band === "high" ? "amber" : "blue",
    };
  });
  const sourceRows = [
    {
      id: "release-desk",
      title: "Release Desk",
      status: releaseDesk?.status || "Manual release only",
      detail: "Deploy approval packets must include release checklist, rollback path, and stop-warning evidence.",
      tone: releaseDesk?.tone || "amber",
    },
    {
      id: "ask-apex-chat",
      title: "Ask Apex chat",
      status: askApexChat?.status || "Planned",
      detail: "Chat can label risky answers approval-needed while private internal work stays reversible and operator-only.",
      tone: askApexChat?.tone || "slate",
    },
    {
      id: "voice-interface",
      title: "Voice interface",
      status: voiceInterface?.status || "Planned",
      detail: "Spoken risky commands require transcript confirmation and visible approval packets before any action layer.",
      tone: voiceInterface?.tone || "slate",
    },
  ];
  return {
    status: packetSummary.approved ? "Approval decisions active" : packetSummary.total ? "Durable packets active" : "Drafting ready",
    tone: packetSummary.approved || packetSummary.ready ? "green" : packetSummary.total ? "blue" : "blue",
    queueCount: queueRows.length,
    packetFieldCount: packetRows.length,
    packetSummary,
    templateCount: templateRows.length,
    controlLockCount: controlRows.length,
    sourceCount: sourceRows.length,
    queueRows,
    packetRows,
    templateRows,
    controlRows,
    sourceRows,
  };
}

function buildExecutionHandoffState({ agentWorkQueue, approvalCommandCenter, companySettings = {} } = {}) {
  const handoffSummary = summarizeApexOsExecutionHandoffs(companySettings?.apexOsExecutionHandoffs || []);
  const sourceRows = [
    {
      id: "approval-packets",
      title: "Approval packet context",
      status: `${approvalCommandCenter?.packetSummary?.ready || 0} ready`,
      detail: "Ready approval packet drafts can inform handoff packages, but handoffs cannot approve or execute anything.",
      tone: approvalCommandCenter?.packetSummary?.ready ? "green" : "amber",
    },
    {
      id: "agent-work-queue",
      title: "Agent Work Queue",
      status: agentWorkQueue?.status || "Review-only",
      detail: `${formatCount(agentWorkQueue?.availableTaskCount)} review-only task types are visible. Handoffs prepare instructions, validation results, result reports, and suggested memory without calling queue or run APIs.`,
      tone: agentWorkQueue?.tone || "blue",
    },
    {
      id: "execution-lock",
      title: "Execution lock",
      status: "Run locked",
      detail: "Queue, run, deploy, send, spend, provider, customer-visible, production, delete, and irreversible actions stay unavailable here.",
      tone: "amber",
    },
  ];
  return {
    status: handoffSummary.finished ? "Finished handoffs captured" : handoffSummary.total ? "Handoff drafts active" : "Drafting ready",
    tone: handoffSummary.finished || handoffSummary.ready ? "green" : handoffSummary.total ? "blue" : "blue",
    handoffSummary,
    sourceCount: sourceRows.length,
    sourceRows,
  };
}

function summarizeAutonomyRunProgress(run = {}) {
  const steps = list(run.steps);
  const doneStatuses = new Set(["done", "drafted"]);
  const blockedStatuses = new Set(["blocked"]);
  const waitingStatuses = new Set(["waiting-approval", "validating"]);
  const runStatus = String(run.status || "").toLowerCase();
  const doneCount = steps.filter((step) => doneStatuses.has(String(step?.status || "").toLowerCase())).length;
  const blockedCount = steps.filter((step) => blockedStatuses.has(String(step?.status || "").toLowerCase())).length;
  const waitingCount = steps.filter((step) => waitingStatuses.has(String(step?.status || "").toLowerCase())).length;
  const activeStep = steps.find((step) => !doneStatuses.has(String(step?.status || "").toLowerCase()))
    || steps[steps.length - 1]
    || null;
  const totalCount = steps.length;
  const effectiveDoneCount = runStatus === "done" ? totalCount : doneCount;
  const progressPercent = totalCount ? Math.round((effectiveDoneCount / totalCount) * 100) : 0;
  const activeStepTitle = runStatus === "done" ? "Run reported complete" : activeStep?.title || "";
  const activeStepStatus = runStatus === "done" ? "done" : activeStep?.status || "";
  const activeStepDetail = runStatus === "done"
    ? "Apex saved a result report for the operator review trail."
    : activeStep?.detail || "";
  return {
    doneCount: effectiveDoneCount,
    blockedCount,
    waitingCount,
    totalCount,
    progressPercent,
    activeStepTitle,
    activeStepStatus,
    activeStepDetail,
    evidenceCount: list(run.evidence).length,
    approvalGateCount: list(run.approvalGates).length,
    linkedDraftCount: [run.linkedAgentControlRequestId, run.linkedExecutionHandoffId].filter(Boolean).length,
    hasResultReport: Boolean(run.resultReport),
  };
}

function buildAutonomyRunCenterState({
  agentWorkQueue,
  agentControlPlane,
  executionHandoffs,
  approvalCommandCenter,
  releaseDesk,
  decisionMemory,
  businessCommandCenter,
  companySettings = {},
} = {}) {
  const availableTaskCount = formatCount(agentWorkQueue?.availableTaskCount);
  const visibleTargetCount = formatCount(agentWorkQueue?.visibleTargetCount);
  const recentRunCount = formatCount(agentWorkQueue?.recentRunCount);
  const roleCount = formatCount(agentControlPlane?.roleCount || agentControlPlane?.rosterRows?.length);
  const activeRequestCount = formatCount(agentControlPlane?.activeRequestCount || agentControlPlane?.requestSummary?.active);
  const readyHandoffCount = formatCount(executionHandoffs?.handoffSummary?.ready);
  const finishedHandoffCount = formatCount(executionHandoffs?.handoffSummary?.finished);
  const gateCount = formatCount(approvalCommandCenter?.queueCount);
  const readyPacketCount = formatCount(approvalCommandCenter?.packetSummary?.ready);
  const approvedPacketCount = formatCount(approvalCommandCenter?.packetSummary?.approved);
  const autonomyRuns = normalizeApexOsAutonomyRuns(companySettings?.apexOsAutonomyRuns || []);
  const runSummary = summarizeApexOsAutonomyRuns(autonomyRuns);
  const sortedRuns = autonomyRuns.slice().sort((left, right) => String(right.updatedAt || right.createdAt || "").localeCompare(String(left.updatedAt || left.createdAt || "")));
  const latestActiveRun = sortedRuns.find((run) => !["done", "archived"].includes(run.status)) || sortedRuns[0] || null;
  const runRows = sortedRuns.slice(0, 6).map((run) => ({
    id: run.id,
    title: run.title,
    request: run.request,
    status: run.status,
    tone: run.tone || toneForStatus(run.status),
    routeLabel: run.routeLabel,
    routeDetail: run.routeDetail,
    agentRole: run.agentRole,
    workType: run.workType,
    nextSafeAction: run.nextSafeAction,
    operatorNote: run.operatorNote,
    resultReport: run.resultReport,
    steps: list(run.steps),
    evidence: list(run.evidence),
    approvalGates: list(run.approvalGates),
    blockedActions: list(run.blockedActions),
    linkedAgentControlRequestId: run.linkedAgentControlRequestId,
    linkedExecutionHandoffId: run.linkedExecutionHandoffId,
    linkedApprovalPacketId: run.linkedApprovalPacketId,
    decisionMemoryId: run.decisionMemoryId,
    createdAt: run.createdAt || "",
    updatedAt: run.updatedAt || run.createdAt || "",
    completedAt: run.completedAt || "",
    progress: summarizeAutonomyRunProgress(run),
    executionLocked: true,
    externalActionsLocked: true,
  }));
  const canDraftInternalRuns = agentWorkQueue?.status === "Review-only" && availableTaskCount > 0;

  const planRows = withDerivedStateMetaList([
    {
      id: "autonomy-hear",
      title: "Hear the request",
      status: "Ready",
      detail: "Apex can accept a typed or visible voice request from the private command room and keep it in the current operator session.",
      tone: "green",
    },
    {
      id: "autonomy-route",
      title: "Route the work",
      status: `${roleCount} agents`,
      detail: `${roleCount} agent roles and ${availableTaskCount} review-only task types are available for room, agent, handoff, approval, release, or business routing.`,
      tone: roleCount ? "green" : "amber",
    },
    {
      id: "autonomy-plan",
      title: "Build the run plan",
      status: runSummary.total ? `${runSummary.total} saved` : "Plan ready",
      detail: runSummary.total
        ? `${runSummary.active} active saved runs, ${runSummary.drafting} drafting, ${runSummary.waitingApproval} waiting approval, and ${runSummary.done} completed are visible in the ledger.`
        : "Apex can break the request into intake, route, draft, validation, approval-gate, result, and memory steps before anything executes.",
      tone: runSummary.active ? "green" : "blue",
    },
    {
      id: "autonomy-draft",
      title: "Draft internal work",
      status: canDraftInternalRuns ? "Draft-ready" : "Needs target",
      detail: `${availableTaskCount} task types across ${visibleTargetCount} visible targets can become locked agent requests or execution handoff drafts when you ask.`,
      tone: canDraftInternalRuns ? "green" : "amber",
    },
    {
      id: "autonomy-validate",
      title: "Validate evidence",
      status: "Required",
      detail: "Every run plan keeps test, role, browser/mobile QA, build, backup, rollback, and result evidence visible before completion is trusted.",
      tone: "amber",
    },
    {
      id: "autonomy-gate",
      title: "Stop at approval gates",
      status: `${gateCount} gates`,
      detail: `${gateCount} risky-action categories, ${readyPacketCount} ready packets, and ${approvedPacketCount} approved packet records are visible. Approval never equals automatic execution.`,
      tone: "amber",
    },
    {
      id: "autonomy-report",
      title: "Report and remember",
      status: finishedHandoffCount ? `${finishedHandoffCount} finished` : "Result slot ready",
      detail: `${readyHandoffCount} ready handoffs and ${finishedHandoffCount} finished handoffs can feed result reports and suggested decision memory after review.`,
      tone: finishedHandoffCount ? "green" : "blue",
    },
  ], {
    sourceLabel: "Apex autonomy run center",
    source: "deriveApexControlRoomState",
    confidence: 88,
  });

  const routeRows = withDerivedStateMetaList([
    {
      id: "autonomy-route-command-room",
      title: "Command room router",
      status: "Online",
      detail: "Requests can be matched to Overview, Apex, Agents, Memory, Approvals, Release, Business, Trust, or Personal rooms.",
      tone: "green",
    },
    {
      id: "autonomy-route-agent-plane",
      title: "Agent control plane",
      status: `${activeRequestCount} active`,
      detail: `${roleCount} roles, ${activeRequestCount} active requests, and ${agentControlPlane?.readyRequestCount || 0} ready requests are visible without background agent loops.`,
      tone: activeRequestCount ? "blue" : "green",
    },
    {
      id: "autonomy-route-handoff",
      title: "Execution handoffs",
      status: executionHandoffs?.status || "Drafting ready",
      detail: "Handoffs prepare scoped instructions, allowed actions, blocked actions, validation, rollback, and result slots without calling queue/run APIs.",
      tone: executionHandoffs?.tone || "blue",
    },
    {
      id: "autonomy-route-release",
      title: "Release route",
      status: releaseDesk?.status || "Manual release only",
      detail: "Build, deploy, smoke, backup, restore, rollback, and production checks stay in the release lane with explicit approval.",
      tone: releaseDesk?.tone || "amber",
    },
    {
      id: "autonomy-route-business",
      title: "Business route",
      status: businessCommandCenter?.status || "Private planning",
      detail: "Sales, marketing, launch, customer success, and revenue work can be drafted, but sends, spend, billing, and publishing remain gated.",
      tone: businessCommandCenter?.tone || "blue",
    },
  ], {
    sourceLabel: "Apex autonomy router",
    source: "agent control + room state",
    confidence: 86,
  });

  const gateRows = withDerivedStateMetaList([
    {
      id: "autonomy-private-drafts",
      title: "Private reversible drafts",
      status: "Allowed when asked",
      detail: "Apex can draft local/private plans, handoffs, QA steps, and memory suggestions after you request them.",
      tone: "green",
    },
    {
      id: "autonomy-customer-visible",
      title: "Customer-visible actions",
      status: "Approval gate",
      detail: "Email, SMS, calls, portal shares, bid/proposal sends, public publishing, and customer notifications require scoped approval and provider readiness.",
      tone: "amber",
    },
    {
      id: "autonomy-money-actions",
      title: "Money actions",
      status: "Approval gate",
      detail: "Billing, invoices, payment links, charges, discounts, package changes, ad spend, and paid promotion remain outside automatic execution.",
      tone: "amber",
    },
    {
      id: "autonomy-production-actions",
      title: "Production actions",
      status: "Approval gate",
      detail: "Deploys, rollbacks, schema/auth/session changes, production data mutation, provider setup, deletion, and irreversible work require explicit approval.",
      tone: "amber",
    },
  ], {
    sourceLabel: "Apex autonomy safety gates",
    source: "approval command center + operating rules",
    confidence: 94,
  });

  return {
    status: runSummary.active ? "Autonomy runs active" : canDraftInternalRuns ? "Guarded autonomy ready" : "Planning guard ready",
    tone: runSummary.blocked ? "amber" : runSummary.active || canDraftInternalRuns ? "green" : "amber",
    mode: "Private act-by-default",
    currentRunStatus: latestActiveRun ? `${latestActiveRun.status}: ${latestActiveRun.title}` : recentRunCount ? "Run evidence visible" : "Ready for request",
    canDraftInternalRuns,
    canExecuteExternalActions: false,
    executionLocked: true,
    externalActionsLocked: true,
    runSummary,
    runRows,
    latestRun: latestActiveRun,
    savedRunCount: runSummary.total,
    activeRunCount: runSummary.active,
    waitingApprovalRunCount: runSummary.waitingApproval,
    doneRunCount: runSummary.done,
    planStepCount: planRows.length,
    readyStepCount: planRows.filter((row) => ["Ready", "Plan ready", "Draft-ready"].includes(row.status)).length,
    gatedActionCount: gateRows.filter((row) => /gate/i.test(row.status)).length,
    routeCount: routeRows.length,
    recentRunCount,
    trustedMemoryCount: formatCount(decisionMemory?.durableCount || decisionMemory?.decisionCount),
    planRows,
    routeRows,
    gateRows,
  };
}

function buildApexLiveOperatorJudgmentRows({
  autonomyRunCenter,
  approvalCommandCenter,
  releaseMonitoring,
  decisionMemory,
  businessCommandCenter,
  liveOperatorMemory,
} = {}) {
  const latestRun = autonomyRunCenter?.latestRun || autonomyRunCenter?.runRows?.[0] || null;
  const latestRunStatus = String(latestRun?.status || "").toLowerCase();
  const activeRun = latestRun && !["done", "archived"].includes(latestRunStatus) ? latestRun : null;
  const activeProgress = activeRun?.progress || summarizeAutonomyRunProgress(activeRun || {});
  const approvalCount = formatCount(approvalCommandCenter?.queueCount || approvalCommandCenter?.packetSummary?.total);
  const blockedApprovalCount = formatCount(approvalCommandCenter?.packetSummary?.blocked);
  const briefingCount = formatCount(businessCommandCenter?.briefingCount);
  const trustedMemoryCount = formatCount(decisionMemory?.durableCount || decisionMemory?.decisionCount);
  const trustedRunMemoryCount = formatCount(liveOperatorMemory?.trustedCount);
  const releaseStatus = releaseMonitoring?.status || "Auto-checking";
  const rows = [];

  if (activeRun) {
    rows.push({
      id: activeRun.status === "waiting-approval" ? "judgment-review-active-run" : "judgment-finish-active-run",
      title: activeRun.status === "waiting-approval" ? "Review active run" : "Advance active run",
      status: activeRun.status === "waiting-approval" ? "Manual review" : `${formatCount(activeProgress.progressPercent)}% done`,
      detail: activeRun.status === "waiting-approval"
        ? "Apex has proof-checked the active private run and is waiting for operator review, report-back, block, or keep-waiting decision."
        : "Apex sees an active private run. Cycle prep/proof, attach evidence, then report done or hold at approval.",
      tone: activeRun.status === "waiting-approval" ? "amber" : "green",
      actionLabel: activeRun.status === "waiting-approval" ? "Review run" : "Cycle run",
    });
  } else {
    rows.push({
      id: "judgment-start-private-run",
      title: "Start the next private run",
      status: autonomyRunCenter?.savedRunCount ? "No active run" : "Ready",
      detail: "Apex has no active private run. Ask in natural language or use Live Run so the next operator task has a ledger, evidence, and approval stop.",
      tone: "blue",
      actionLabel: "Start private run",
    });
  }

  rows.push({
    id: "judgment-review-queues",
    title: blockedApprovalCount ? "Clear blockers" : approvalCount ? "Review approvals" : "Review posture",
    status: blockedApprovalCount ? `${blockedApprovalCount} blocked` : approvalCount ? `${approvalCount} review` : "Clear",
    detail: blockedApprovalCount
      ? "Apex sees blocked approval or launch work. Review blockers before trusting new execution or release work."
      : approvalCount
        ? "Apex sees approval work ready for operator review. Keep external actions locked until the packet is approved."
        : "No approval pressure is visible in the current private command context.",
    tone: blockedApprovalCount ? "amber" : approvalCount ? "blue" : "green",
    actionLabel: blockedApprovalCount || approvalCount ? "Open approvals" : "Keep monitoring",
  });

  rows.push({
    id: "judgment-monitor-release",
    title: "Monitor live status",
    status: releaseStatus,
    detail: `${releaseStatus} release posture, ${briefingCount} business briefing rows, and read-only pulse checks feed Apex before it recommends work.`,
    tone: releaseMonitoring?.tone || "green",
    actionLabel: "Check pulse",
  });

  rows.push({
    id: "judgment-memory-loop",
    title: "Remember reviewed outcomes",
    status: trustedRunMemoryCount ? `${trustedRunMemoryCount} run memor${trustedRunMemoryCount === 1 ? "y" : "ies"}` : trustedMemoryCount ? `${trustedMemoryCount} trusted` : "Review first",
    detail: trustedRunMemoryCount
      ? "Apex has reviewed live-run history available for future answers; suggested run memories still require manual approval before they guide behavior."
      : "Apex should only turn live answers or run outcomes into trusted long-term memory after operator review.",
    tone: trustedRunMemoryCount || trustedMemoryCount ? "green" : "amber",
    actionLabel: "Review memory",
  });

  return withDerivedStateMetaList(rows.slice(0, 4), {
    sourceLabel: "Apex Live Operator judgment",
    source: "run ledger + approvals + release pulse + memory",
    confidence: 86,
  });
}

function buildApexLiveOperatorModeState({
  autonomyRunCenter,
  voiceInterface,
  askApexChat,
  agentControlPlane,
  executionHandoffs,
  releaseMonitoring,
  decisionMemory,
  approvalCommandCenter,
  releaseDesk,
  businessCommandCenter,
  liveOperatorMemory,
} = {}) {
  const savedRunCount = formatCount(autonomyRunCenter?.savedRunCount || autonomyRunCenter?.runSummary?.total);
  const activeRunCount = formatCount(autonomyRunCenter?.activeRunCount || autonomyRunCenter?.runSummary?.active);
  const trustedMemoryCount = formatCount(decisionMemory?.durableCount || decisionMemory?.decisionCount);
  const trustedRunMemoryCount = formatCount(liveOperatorMemory?.trustedCount);
  const pendingRunMemoryCount = formatCount(liveOperatorMemory?.suggestedCount);
  const agentSignalCount = formatCount(agentControlPlane?.roleCount || agentControlPlane?.rosterRows?.length);
  const handoffCount = formatCount(executionHandoffs?.handoffSummary?.total);
  const approvalQueueCount = formatCount(approvalCommandCenter?.queueCount || approvalCommandCenter?.packetSummary?.total);
  const monitoringCount = formatCount(releaseMonitoring?.briefingCount || releaseMonitoring?.readinessCount);
  const operatorJudgmentRows = buildApexLiveOperatorJudgmentRows({
    autonomyRunCenter,
    approvalCommandCenter,
    releaseMonitoring,
    decisionMemory,
    businessCommandCenter,
    liveOperatorMemory,
  });
  const liveFoundationPercent = 96;
  const jarvisBehaviorPercent = activeRunCount || handoffCount ? 96 : 90;
  const readinessRows = withDerivedStateMetaList([
    {
      id: "live-voice-loop",
      title: "Voice loop",
      status: voiceInterface?.status || "Voice ready",
      detail: `${formatCount(voiceInterface?.modeCount)} modes, ${formatCount(voiceInterface?.safetyCount)} safety gates, visible page microphone control, spoken answers, next-turn prompts, interruption-aware turn memory, browser caption fallback, misheard retry listening, and voice health recovery are mapped.`,
      tone: voiceInterface?.tone || "green",
    },
    {
      id: "live-understanding",
      title: "Understanding",
      status: askApexChat?.status || "Source-backed",
      detail: `${formatCount(askApexChat?.contextCount)} context lanes, ${formatCount(askApexChat?.evidenceCount)} evidence rows, and explicit live conversation continuity feed private answers before action.`,
      tone: askApexChat?.tone || "green",
    },
    {
      id: "live-run-ledger",
      title: "Run ledger",
      status: savedRunCount ? `${savedRunCount} saved` : "Ready",
      detail: `${activeRunCount} active run${activeRunCount === 1 ? "" : "s"} are visible with steps, evidence, linked drafts, cycle state, server-backed Auto Drive, natural-command autopilot, and report-back state. New live runs save a private ledger item before internal drafting.`,
      tone: savedRunCount ? "green" : "blue",
    },
    {
      id: "live-internal-drafts",
      title: "Internal drafts",
      status: handoffCount ? `${handoffCount} handoffs` : "Draft-ready",
      detail: `${agentSignalCount} agent roles can receive locked private handoffs without queueing or running agent work.`,
      tone: handoffCount ? "green" : "blue",
    },
    {
      id: "live-monitoring",
      title: "Monitoring",
      status: releaseMonitoring?.status || releaseDesk?.status || "Auto-check ready",
      detail: `${monitoringCount} release/monitoring rows and ${formatCount(businessCommandCenter?.briefingCount)} business briefing rows feed the live pulse while the Apex body page is open.`,
      tone: releaseMonitoring?.tone || releaseDesk?.tone || "green",
    },
    {
      id: "live-memory",
      title: "Run memory",
      status: trustedRunMemoryCount ? `${trustedRunMemoryCount} trusted runs` : pendingRunMemoryCount ? `${pendingRunMemoryCount} pending review` : "Memory ready",
      detail: trustedRunMemoryCount
        ? `${trustedRunMemoryCount} reviewed live-run memor${trustedRunMemoryCount === 1 ? "y" : "ies"} now feed future Apex answers as run history; ${pendingRunMemoryCount} suggested live-run memor${pendingRunMemoryCount === 1 ? "y" : "ies"} remain pending manual approval.`
        : "Apex body turns, finished run outcomes, and surfaced proactive check-ins can draft suggested memory for review; no hidden memory becomes trusted automatically.",
      tone: trustedRunMemoryCount ? "green" : pendingRunMemoryCount ? "amber" : "blue",
    },
  ], {
    sourceLabel: "Apex Live Operator readiness",
    source: "deriveApexControlRoomState",
    confidence: 86,
  });
  const operatorLoopRows = withDerivedStateMetaList([
    { id: "live-loop-hear", title: "Hear", status: "Open", detail: "Voice and typed commands enter the Apex body page with visible mic, caption, speaker, misheard retry listening, and recovery health.", tone: "green" },
    { id: "live-loop-interrupt", title: "Interrupt", status: "Barge-in memory", detail: "Apex can stop speaking, keep listening, and carry the interruption into the next answer context.", tone: "green" },
    { id: "live-loop-understand", title: "Understand", status: "Source-backed", detail: "Apex routes the request against private command-room context.", tone: "green" },
    { id: "live-loop-follow-up", title: "Follow up", status: "Conversation continuity", detail: "Apex carries the last request, answer summary, matched room, active run, next private move, interruption state, retry state, and recent turn history into short follow-ups without hidden execution.", tone: "green" },
    { id: "live-loop-command-run", title: "Act", status: "Natural command", detail: "Apex can turn typed or spoken get-this-done requests into a saved private run, then use server-backed Auto Drive to advance safe prep/proof and stop at manual review.", tone: "green" },
    { id: "live-loop-judge", title: "Judge", status: "Proactive", detail: "Apex can turn pulse, run, approval, release, and memory state into ranked next-safe recommendations without executing them.", tone: "green" },
    { id: "live-loop-plan", title: "Plan", status: `${formatCount(autonomyRunCenter?.planStepCount)} steps`, detail: "The request becomes a visible private run plan with an active step, evidence trail, and consequential-action stop.", tone: "blue" },
    { id: "live-loop-save", title: "Save run", status: savedRunCount ? `${savedRunCount} saved` : "Ready", detail: "A private autonomy ledger item is created before work continues.", tone: savedRunCount ? "green" : "blue" },
    { id: "live-loop-draft", title: "Draft", status: autonomyRunCenter?.canDraftInternalRuns ? "Draft-ready" : "Guarded", detail: "Internal agent-control and execution handoff drafts can be prepared.", tone: autonomyRunCenter?.canDraftInternalRuns ? "green" : "amber" },
    { id: "live-loop-cycle", title: "Auto Drive", status: "Server-backed", detail: "Apex can advance a saved active run through draft, prep, proof, approval hold, and report-memory readiness from the private server ledger.", tone: "green" },
    { id: "live-loop-auto-prep", title: "Auto prep", status: "Private-only", detail: "Apex can advance routing, planning, and draft-link prep for active runs, then stop before validation and approval gates.", tone: "green" },
    { id: "live-loop-proof-check", title: "Proof check", status: "Private proof", detail: "Apex can verify linked drafts, route and plan evidence, validation readiness, and approval-stop posture without executing anything.", tone: "green" },
    { id: "live-loop-validate", title: "Validate", status: "Proof-backed", detail: "Tests, role checks, browser QA, build proof, rollback notes, and private proof checks stay attached to the work.", tone: "green" },
    { id: "live-loop-report", title: "Report", status: savedRunCount ? "Report-ready" : "Result slot", detail: "Apex can report back from the active run and mark it validating, waiting approval, blocked, or done with a result report.", tone: savedRunCount ? "green" : "blue" },
    { id: "live-loop-remember", title: "Remember", status: trustedRunMemoryCount ? "Run history context" : trustedMemoryCount ? "Trusted context" : "Review first", detail: "The Apex body can draft suggested turn, run outcome, and proactive check-in memory; only reviewed live-run memory becomes future operating context.", tone: trustedRunMemoryCount || trustedMemoryCount ? "green" : "amber" },
    { id: "live-loop-monitor", title: "Monitor", status: releaseMonitoring?.status || "Auto-checking", detail: "The Apex Watch Officer can refresh read-only build, briefing, voice, memory, and live-run status while the page is open, then explain what changed and preserve surfaced check-ins as suggested run history.", tone: releaseMonitoring?.tone || "green" },
  ], {
    sourceLabel: "Apex Live Operator loop",
    source: "voice + autonomy run center",
    confidence: 86,
  });
  const gapRows = withDerivedStateMetaList([
    {
      id: "live-gap-browser-voice",
      title: "Always-open voice",
      status: "Permission-gated",
      detail: "Browsers still require visible microphone permission; after that the page keeps the open voice loop alive, recovers between turns, and can use browser captions when server transcription is unavailable.",
      tone: "amber",
    },
    {
      id: "live-gap-execution",
      title: "Real-world execution",
      status: "Approval-gated",
      detail: "Apex can answer natural get-this-done commands by saving a real private run, drafting, cycling prep/proof, validating, and reporting private runs; customer-visible, billing, send, provider, production, delete, and irreversible actions remain approval-gated.",
      tone: "amber",
    },
    {
      id: "live-gap-proactive",
      title: "Proactive status",
      status: trustedRunMemoryCount ? "Trusted history" : "Remembered check-ins",
      detail: trustedRunMemoryCount
        ? "Apex can refresh live status, draft surfaced check-ins, and use reviewed live-run history in later answers while unattended external actions stay off."
        : "Apex can refresh live status while the page is open, turn pulse/run/approval/release context into next-safe recommendations, and draft surfaced check-ins into suggested memory; unattended external actions stay off until a separate approved execution lane exists.",
      tone: "green",
    },
    {
      id: "live-gap-provider-reliability",
      title: "Voice reliability",
      status: "Caption fallback",
      detail: "Server speech can speak when configured; browser voice, browser speech captions, and the voice health recovery lane keep answers audible and voice questions usable when provider audio or transcription is unavailable.",
      tone: "green",
    },
  ], {
    sourceLabel: "Apex Live Operator remaining gaps",
    source: "current safety model",
    confidence: 86,
  });

  return {
    status: activeRunCount ? "Live operator running" : "Live operator ready",
    tone: activeRunCount ? "green" : "blue",
    mode: "Private Apex operator",
    detail: "Apex is moving from a screen with tools into a visible operator loop: hear, understand, follow up, judge, save, draft, validate, report, remember, and monitor.",
    foundationPercent: liveFoundationPercent,
    jarvisBehaviorPercent,
    readinessCount: readinessRows.length,
    operatorLoopCount: operatorLoopRows.length,
    operatorJudgmentCount: operatorJudgmentRows.length,
    gapCount: gapRows.length,
    savedRunCount,
    activeRunCount,
    approvalQueueCount,
    agentSignalCount,
    trustedRunMemoryCount,
    pendingRunMemoryCount,
    externalActionsLocked: true,
    executionLocked: true,
    nextAction: operatorJudgmentRows[0]?.detail || (activeRunCount ? "Run the private operator cycle on the active live run, then report, keep waiting approval, or block it." : "Start a live operator run from the Apex body."),
    readinessRows,
    operatorLoopRows,
    operatorJudgmentRows,
    gapRows,
    runMemory: liveOperatorMemory,
  };
}

function buildReleaseMonitoringState({
  releaseDesk,
  launchState,
  trustState,
  agentWorkQueue,
  agentControlPlane,
  buildAwareness,
  companySettings = {},
  recentEvidence = [],
} = {}) {
  const briefingHistoryCount = Array.isArray(companySettings?.apexOsDailyBriefingHistory)
    ? companySettings.apexOsDailyBriefingHistory.length
    : 0;
  const blockedAgentCount = formatCount(agentControlPlane?.blockedRequestCount)
    + list(agentControlPlane?.rosterRows).filter((row) => row?.status === "blocked").length;
  const buildKnownBlockers = list(buildAwareness?.knownBlockers).length;
  const readinessRows = APEX_OS_RELEASE_MONITORING_CHECKS.map((item) => {
    if (item.id === "current-branch-build") {
      return {
        ...item,
        status: buildAwareness?.status || item.status,
        detail: `${buildAwareness?.buildStatus?.status || "Build evidence pending"} build script, ${buildAwareness?.testStatus?.status || "test evidence pending"} verification scripts, and ${formatCount(buildAwareness?.changedFileCount)} changed files are visible.`,
        tone: buildAwareness?.tone || item.tone,
        sourceLabel: "Apex OS build awareness endpoint",
        readOnly: true,
      };
    }
    if (item.id === "production-readiness") {
      const evidence = buildAwareness?.productionReadiness || buildAwareness?.latestDeploy;
      return {
        ...item,
        status: evidence?.status || item.status,
        detail: evidence?.detail || item.detail,
        tone: evidence?.tone || item.tone,
        sourceLabel: evidence?.sourceLabel || "docs/APEX_HQ_LIVING_FINISH_PLAN.md",
        readOnly: true,
      };
    }
    if (item.id === "demo-readiness") {
      const evidence = buildAwareness?.demoReadiness;
      return {
        ...item,
        status: evidence?.status || item.status,
        detail: evidence?.detail || item.detail,
        tone: evidence?.tone || item.tone,
        sourceLabel: evidence?.sourceLabel || "Apex OS build awareness docs scan",
        readOnly: true,
      };
    }
    if (item.id === "github-actions-smoke") {
      const evidence = buildAwareness?.githubActionsSmoke;
      return {
        ...item,
        status: evidence?.status || item.status,
        detail: evidence?.detail || item.detail,
        tone: evidence?.tone || item.tone,
        sourceLabel: evidence?.sourceLabel || "Apex OS build awareness docs scan",
        readOnly: true,
      };
    }
    if (item.id === "failed-test-build") {
      const evidence = buildAwareness?.failedTestBuild;
      return {
        ...item,
        status: evidence?.status || item.status,
        detail: evidence?.detail || item.detail,
        tone: evidence?.tone || item.tone,
        sourceLabel: evidence?.sourceLabel || "Apex OS build awareness snapshot",
        readOnly: true,
      };
    }
    if (item.id === "agent-stalled") {
      return {
        ...item,
        status: blockedAgentCount ? `${blockedAgentCount} blocked` : agentControlPlane?.reportRows?.length ? "Reports visible" : "No stalls",
        detail: blockedAgentCount
          ? `${blockedAgentCount} blocked agent/control signal${blockedAgentCount === 1 ? "" : "s"} need manual review. Monitoring cannot resume or run agents.`
          : `${formatCount(agentControlPlane?.reportRows?.length || agentWorkQueue?.recentRunCount)} agent report/run rows are visible; no background resume or execution control exists here.`,
        tone: blockedAgentCount ? "amber" : agentControlPlane?.reportRows?.length || agentWorkQueue?.recentRunCount ? "blue" : "green",
        sourceLabel: "Apex OS agent control plane",
        readOnly: true,
      };
    }
    return { ...item, readOnly: true };
  });
  const lockRows = APEX_OS_RELEASE_MONITORING_LOCKS.map((item) => ({ ...item }));
  const briefingRows = [
    {
      id: "daily-executive-brief",
      title: "Daily executive brief",
      status: "Refresh + save ready",
      detail: `${formatCount(launchState?.readyCount)} of ${formatCount(launchState?.totalCount)} launch gates ready; ${formatCount(recentEvidence.length)} recent evidence rows and ${briefingHistoryCount} saved briefing snapshots are available.`,
      tone: briefingHistoryCount ? "green" : "blue",
      sourceLabel: "Apex OS daily briefing endpoint",
      readOnly: true,
    },
    {
      id: "changed-since-yesterday",
      title: "What changed since yesterday",
      status: briefingHistoryCount ? "History backed" : "Baseline needed",
      detail: briefingHistoryCount
        ? `${briefingHistoryCount} saved briefing snapshot${briefingHistoryCount === 1 ? "" : "s"} can be compared against the current briefing.`
        : "Save one manual daily briefing snapshot before Apex OS can compare current signals with prior briefing history.",
      tone: briefingHistoryCount ? "green" : "blue",
      sourceLabel: "Apex OS daily briefing history",
      readOnly: true,
    },
    {
      id: "john-action-alerts",
      title: "Alerts that require John action",
      status: launchState?.blockedCount || buildKnownBlockers || blockedAgentCount ? "Review required" : "Review clear",
      detail: `${formatCount(launchState?.blockedCount)} launch blockers, ${buildKnownBlockers} build/test signals, and ${blockedAgentCount} blocked agent/control signals are visible for manual review only.`,
      tone: launchState?.blockedCount || buildKnownBlockers || blockedAgentCount ? "amber" : "green",
      sourceLabel: "Apex OS monitoring summary",
      readOnly: true,
    },
    {
      id: "stalled-agent-watch",
      title: "Agent stalled watch",
      status: blockedAgentCount ? `${blockedAgentCount} blocked` : agentWorkQueue?.recentRunCount ? "Runs visible" : "No stalls",
      detail: blockedAgentCount
        ? "Blocked agent/control rows require manual review before more work is assigned."
        : `${formatCount(agentWorkQueue?.recentRunCount)} recent Agent OS run rows are visible; no background resume or execution control exists here.`,
      tone: blockedAgentCount ? "amber" : agentWorkQueue?.recentRunCount ? "blue" : "green",
      sourceLabel: "Apex OS agent control plane",
      readOnly: true,
    },
  ];
  const releasePacketRows = [
    {
      id: "pre-deploy",
      title: "Pre-deploy evidence",
      status: releaseDesk?.sections?.find((item) => item.id === "pre-deploy")?.status || "Required",
      detail: "Tests, build, backup, restore, diff check, exact staging, push, and deploy approval stay packeted.",
      tone: "blue",
    },
    {
      id: "rollback",
      title: "Rollback evidence",
      status: releaseDesk?.sections?.find((item) => item.id === "rollback")?.status || "Required",
      detail: "Rollback target, notes, and known-good recovery path must be visible before release approval.",
      tone: "amber",
    },
    {
      id: "stop-warnings",
      title: "Stop warnings",
      status: releaseDesk?.sections?.find((item) => item.id === "dangerous")?.status || "Locked",
      detail: "Broad staging, force push, volume deletion, secret exposure, and wrong-folder deploys stay blocked.",
      tone: "red",
    },
    {
      id: "trust-launch",
      title: "Trust / launch evidence",
      status: trustState?.overallStatus === "ready" ? "Ready" : "Review",
      detail: `${formatCount(trustState?.stats?.readyChecks)} of ${formatCount(trustState?.stats?.totalChecks)} trust checks ready; launch remains ${launchState?.status || "review-only"}.`,
      tone: trustState?.overallStatus === "ready" ? "green" : "amber",
    },
  ];
  return {
    status: "Read-only ready",
    tone: buildKnownBlockers || blockedAgentCount ? "amber" : "green",
    readinessCount: readinessRows.length,
    briefingCount: briefingRows.length,
    packetCount: releasePacketRows.length,
    lockCount: lockRows.length,
    readinessRows,
    briefingRows,
    releasePacketRows,
    lockRows,
  };
}

function buildBuildAwarenessState(companySettings = {}) {
  const configured = companySettings?.apexOsBuildAwareness && typeof companySettings.apexOsBuildAwareness === "object"
    ? companySettings.apexOsBuildAwareness
    : companySettings?.apexOsBuildStatus && typeof companySettings.apexOsBuildStatus === "object"
      ? companySettings.apexOsBuildStatus
      : {};
  return buildApexOsBuildAwarenessSnapshot({
    branch: configured.branch || "",
    headSha: configured.headSha || "",
    gitAvailable: Boolean(configured.branch || configured.headSha || configured.gitStatusText),
    gitStatusText: configured.gitStatusText || "",
    recentCommitsText: configured.recentCommitsText || "",
    packageScripts: configured.packageScripts || {},
    distAssets: configured.distAssets || [],
    docs: {
      livingPlan: configured.livingPlanText || "",
    },
    runtime: configured.runtime || {},
    collectedAt: configured.collectedAt || "Pending live refresh",
  });
}

function buildPhase3AggregatorState({
  companySettings = {},
  auditEvents = [],
  launchState,
  agentWorkQueue,
  approvalCommandCenter,
  releaseMonitoring,
  businessCommandCenter,
} = {}) {
  const configured = companySettings?.apexOsBuildStatus && typeof companySettings.apexOsBuildStatus === "object"
    ? companySettings.apexOsBuildStatus
    : {};
  const latestBuildEvidence = latestMatchingEvidence(auditEvents, ["build", "test", "verify", "release", "deploy"]);
  const visibleBlockers = formatCount(launchState?.blockedCount) + formatCount(approvalCommandCenter?.packetSummary?.blocked);
  const approvalCategories = formatCount(approvalCommandCenter?.queueCount);
  const rows = [
    {
      id: "phase-3-current-branch",
      title: "Current branch",
      status: configured.branch || "Evidence required",
      detail: configured.branch
        ? `Apex OS can show branch evidence supplied by the private operator workspace: ${configured.branch}.`
        : "Runtime state does not invent a git branch; attach branch evidence through release or audit records before treating it as current.",
      tone: configured.branch ? "green" : "amber",
      sourceLabel: "Private build evidence",
      source: "companySettings.apexOsBuildStatus.branch",
      confidence: configured.branch ? 90 : 72,
    },
    {
      id: "phase-3-build-test-state",
      title: "Build / test state",
      status: configured.testStatus || (latestBuildEvidence ? "Evidence visible" : "Evidence required"),
      detail: configured.testDetail || latestBuildEvidence?.summary || "Focused tests, role checks, build, diff check, and browser QA must be attached before a release decision.",
      tone: configured.testStatus || latestBuildEvidence ? "blue" : "amber",
      sourceLabel: latestBuildEvidence ? "Recent audit evidence" : "Release evidence requirement",
      source: latestBuildEvidence?.id || latestBuildEvidence?.createdAt || "release safety checklist",
      confidence: latestBuildEvidence ? 84 : 74,
    },
    {
      id: "phase-3-phase-status",
      title: "Phase status",
      status: configured.phaseStatus || "Phase 3 hardening",
      detail: "State aggregation is a read-only Apex OS layer. Later chat, voice, memory, approval, agent execution, and provider phases stay separate.",
      tone: "green",
      sourceLabel: "Apex OS master plan Phase 3",
      source: "docs/APEX_HQ_APEX_OS_COMMAND_CENTER_MASTER_PLAN.md",
      confidence: 94,
    },
    {
      id: "phase-3-blockers-approvals",
      title: "Blockers and approvals",
      status: `${visibleBlockers} blockers / ${approvalCategories} gates`,
      detail: `${formatCount(launchState?.blockedCount)} launch blockers, ${formatCount(approvalCommandCenter?.packetSummary?.blocked)} blocked approval packets, and ${approvalCategories} risky-action approval categories stay visible without execution.`,
      tone: visibleBlockers || approvalCategories ? "amber" : "green",
      sourceLabel: "Launch + approval state",
      source: "launch readiness + apexOsApprovalPackets",
      confidence: 86,
    },
    {
      id: "phase-3-agent-release-business",
      title: "Agents, release, and business queues",
      status: "Aggregated",
      detail: `${formatCount(agentWorkQueue?.availableTaskCount)} review-only agent task types, ${formatCount(releaseMonitoring?.packetCount)} release packet rows, and ${formatCount(businessCommandCenter?.queueCount)} business queues are summarized.`,
      tone: "blue",
      sourceLabel: "Agent OS + Release Desk + Business queues",
      source: "existing Apex HQ systems",
      confidence: 84,
    },
    {
      id: "phase-3-read-only-lock",
      title: "Read-only state boundary",
      status: "Locked",
      detail: "Phase 3 can summarize state only. It cannot mutate records, run agents, approve work, deploy, send, spend, bill, configure providers, or touch production data.",
      tone: "amber",
      sourceLabel: "Phase 3 non-goals",
      source: "docs/APEX_HQ_APEX_OS_COMMAND_CENTER_MASTER_PLAN.md",
      confidence: 96,
    },
  ];
  return {
    status: "Read-only aggregator",
    tone: "green",
    rowCount: rows.length,
    sourceCount: new Set(rows.map((row) => row.sourceLabel).filter(Boolean)).size,
    confidence: Math.round(rows.reduce((total, row) => total + formatCount(row.confidence, 80), 0) / rows.length),
    rows,
  };
}

const APEX_OS_BUSINESS_MEMORY_CATEGORIES = new Set([
  "business-goal",
  "john-business",
  "assistant-preference",
  "apex-project",
  "active-priority",
  "saved-idea",
  "people-context",
  "do-not-do",
  "business-strategy",
  "marketing-sales",
  "customer-research",
  "legal-risk",
  "private-owner-notes",
]);

function humanizeId(value = "") {
  return String(value || "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function truncateDetail(value = "", limit = 220) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > limit ? `${text.slice(0, limit - 3)}...` : text;
}

function buildBusinessMemoryRows(decisionMemory = {}, knowledgeVault = {}) {
  const decisionRows = (decisionMemory.durableEntries || [])
    .filter((entry) => entry.status === "approved" && APEX_OS_BUSINESS_MEMORY_CATEGORIES.has(entry.category))
    .map((entry) => ({
      id: `decision-${entry.id}`,
      title: entry.title || "Approved business decision",
      status: APEX_OS_DECISION_CATEGORY_LABELS[entry.category] || humanizeId(entry.category),
      detail: truncateDetail(entry.body || entry.reviewNote || "Approved Apex OS business decision with source metadata."),
      tone: "green",
      sourceLabel: entry.sourceLabel || "Approved decision memory",
    }));
  const vaultRows = (knowledgeVault.vaultEntries || [])
    .filter((entry) => entry.status === "approved" && APEX_OS_BUSINESS_MEMORY_CATEGORIES.has(entry.category))
    .map((entry) => ({
      id: `vault-${entry.id}`,
      title: entry.title || "Approved business knowledge",
      status: humanizeId(entry.category),
      detail: truncateDetail(entry.body || entry.reviewNote || "Approved Apex OS business knowledge with source metadata."),
      tone: "green",
      sourceLabel: entry.sourceLabel || "Approved knowledge vault",
    }));
  return [...decisionRows, ...vaultRows].slice(0, 6);
}

function buildBusinessCommandCenterState({
  launchState,
  decisionMemory,
  knowledgeVault,
  approvalCommandCenter,
  executionHandoffs,
  releaseMonitoring,
} = {}) {
  const queueRows = APEX_OS_BUSINESS_QUEUE_ROWS.map((item) => ({ ...item }));
  const gateRows = APEX_OS_BUSINESS_GATES.map((item) => ({ ...item }));
  const memoryRows = buildBusinessMemoryRows(decisionMemory, knowledgeVault);
  const taskDraftRows = APEX_OS_BUSINESS_TASK_DRAFT_ROWS.map((item) => ({
    ...item,
    detail: `${item.detail} Draft into Agent Handoffs as business-draft work; queue/run stays locked.`,
  }));
  const approvalDraftRows = APEX_OS_BUSINESS_APPROVAL_DRAFT_ROWS.map((item) => ({ ...item }));
  const launchRows = [
    {
      id: "public-launch-readiness",
      title: "Public launch readiness",
      status: launchState?.status || "Review",
      detail: `${formatCount(launchState?.readyCount)} of ${formatCount(launchState?.totalCount)} launch gates are ready; public launch remains manual and approval-gated.`,
      tone: launchState?.tone || "amber",
    },
    {
      id: "founder-demo-packet",
      title: "Founder-led demo packet",
      status: "Private draft",
      detail: "Demo packets, scripts, proof, pilot handoff, and follow-up work stay private drafts until John approves exact use.",
      tone: "blue",
    },
    {
      id: "knowledge-sources",
      title: "Business knowledge sources",
      status: memoryRows.length ? `${memoryRows.length} approved` : knowledgeVault?.status || "Planned",
      detail: memoryRows.length
        ? `${memoryRows.length} approved business memory/source rows can inform private business planning.`
        : `${formatCount(knowledgeVault?.categoryCount)} private knowledge categories can inform business planning after manual review.`,
      tone: memoryRows.length ? "green" : knowledgeVault?.tone || "slate",
    },
    {
      id: "approval-path",
      title: "Business approval path",
      status: approvalCommandCenter?.status || "Planned",
      detail: `${formatCount(approvalCommandCenter?.queueCount)} approval categories and ${approvalDraftRows.length} Phase 10 packet drafts protect sends, spend, billing, publishing, providers, and customer-visible changes.`,
      tone: approvalCommandCenter?.tone || "slate",
    },
  ];
  const briefingRows = [
    {
      id: "today-business-focus",
      title: "Today business focus",
      status: "First UI ready",
      detail: "Apex OS can show private launch, demo, sales, marketing, customer success, and revenue priorities without sending or publishing.",
      tone: "blue",
    },
    {
      id: "stalled-business-work",
      title: "Stalled business work",
      status: releaseMonitoring?.status || "Planned",
      detail: "Business blockers can appear beside release and monitoring blockers for operator review.",
      tone: releaseMonitoring?.tone || "slate",
    },
    {
      id: "manual-next-actions",
      title: "Manual next actions",
      status: `${taskDraftRows.length} drafts`,
      detail: `Apex can prepare ${taskDraftRows.length} task drafts and ${approvalDraftRows.length} approval packet drafts, but the owner chooses if anything leaves the app.`,
      tone: "amber",
    },
  ];
  return {
    status: memoryRows.length ? "Source-backed" : "Business ops mapped",
    tone: memoryRows.length ? "green" : "blue",
    queueCount: queueRows.length,
    gateCount: gateRows.length,
    launchCount: launchRows.length,
    briefingCount: briefingRows.length,
    memorySourceCount: memoryRows.length,
    taskDraftCount: taskDraftRows.length,
    approvalDraftCount: approvalDraftRows.length,
    handoffReadyCount: executionHandoffs?.handoffSummary?.ready || 0,
    queueRows,
    gateRows,
    launchRows,
    briefingRows,
    memoryRows,
    taskDraftRows,
    approvalDraftRows,
  };
}

function buildQaSecurityHardeningState({
  buildAwareness,
  decisionMemory,
  knowledgeVault,
  askApexChat,
  voiceInterface,
  approvalCommandCenter,
  releaseDesk,
  releaseMonitoring,
  businessCommandCenter,
  agentWorkQueue,
  launchState,
} = {}) {
  const evidenceRows = APEX_OS_QA_SECURITY_EVIDENCE_ROWS.map((item) => {
    if (item.id === "john-only-access") {
      return {
        ...item,
        status: "Verified",
        tone: "green",
        detail: `${formatCount(decisionMemory?.lockedCount)} locked decision/rule rows and private route gates define the operator-only boundary.`,
      };
    }
    if (item.id === "source-backed-answers") {
      return {
        ...item,
        status: askApexChat?.status || item.status,
        detail: `${formatCount(askApexChat?.contextCount)} chat contexts and ${formatCount(askApexChat?.evidenceCount)} evidence rows are mapped before provider setup.`,
      };
    }
    if (item.id === "upload-privacy") {
      return {
        ...item,
        status: knowledgeVault?.status || item.status,
        tone: knowledgeVault?.tone || item.tone,
        detail: `${formatCount(knowledgeVault?.lockedRuleCount)} vault rules still block secrets and customer mixing while reviewed text intake stays private.`,
      };
    }
    if (item.id === "approval-gates") {
      return {
        ...item,
        status: "Gate verified",
        tone: "green",
        detail: `${formatCount(approvalCommandCenter?.queueCount)} approval categories, ${formatCount(approvalCommandCenter?.packetFieldCount)} packet fields, and ${formatCount(approvalCommandCenter?.controlLockCount)} locked controls are visible before risky work can move.`,
      };
    }
    if (item.id === "build-test-release") {
      return {
        ...item,
        status: "Verified",
        tone: "green",
        detail: `${formatCount(releaseMonitoring?.packetCount)} release packet rows, ${formatCount(releaseMonitoring?.lockCount)} monitoring locks, and ${formatCount(buildAwareness?.changedFileCount)} changed-file signals keep build/test/release work explicit and manual.`,
      };
    }
    if (item.id === "no-bypass-actions") {
      return {
        ...item,
        status: "Bypass blocked",
        tone: "green",
        detail: `${formatCount(agentWorkQueue?.safetyRows?.length)} agent locks, ${formatCount(voiceInterface?.safetyCount)} voice gates, and ${formatCount(businessCommandCenter?.gateCount)} business gates block execution paths.`,
      };
    }
    if (item.id === "customer-company-isolation") {
      return {
        ...item,
        status: "Verified",
        tone: "green",
        detail: "Company-scope, role-permission, and switched-workspace checks prove Apex OS state stays inside the default private Apex HQ workspace.",
      };
    }
    if (item.id === "direct-route-blocking") {
      return {
        ...item,
        status: "Verified",
        tone: "green",
        detail: "Direct-route, navigation, bootstrap, and browser checks prove non-operators return to the normal app without Apex OS panels.",
      };
    }
    if (item.id === "desktop-mobile-visual") {
      return {
        ...item,
        status: "Verified",
        tone: "green",
        detail: "Desktop and mobile browser QA captures the hardening surface, checks no horizontal overflow, and confirms no panel overlap.",
      };
    }
    if (item.id === "field-user-blocking") {
      return {
        ...item,
        status: "Verified",
        tone: "green",
        detail: `${formatCount(launchState?.blockedCount)} launch blockers remain visible to the private owner, while field users stay outside Apex OS, leads, estimates, pricing, margins, payroll, billing, and office-only data.`,
      };
    }
    if (item.id === "production-preview-smoke") {
      return {
        ...item,
        status: releaseDesk?.deployHistoryCount ? "Documented" : "Proof path ready",
        tone: releaseDesk?.deployHistoryCount ? "green" : "blue",
        detail: releaseDesk?.deployHistoryCount
          ? `${formatCount(releaseDesk.deployHistoryCount)} deploy history rows plus ready/health, hosted smoke, protected endpoint, setup status, asset, backup, and rollback evidence feed the Release Desk.`
          : "Release Desk proof rows define ready/health, hosted smoke, protected endpoint, setup status, asset, backup, and rollback evidence even when runtime docs are unavailable.",
      };
    }
    if (item.id === "docs-memory-drift") {
      return {
        ...item,
        status: "In sync",
        tone: "green",
        detail: `${formatCount(list(buildAwareness?.sourceLinks).length)} source-link rows and the living deploy log keep master plan, roadmap, build tracker, release desk, and memory evidence aligned.`,
      };
    }
    if (item.id === "apex-os-kill-switch") {
      return {
        ...item,
        status: "Available",
        tone: "green",
        detail: "The kill switch is access removal: `operatorAccess=false`, non-office role, or switched customer workspace removes nav/bootstrap access and causes Apex OS APIs/state to block.",
      };
    }
    return { ...item };
  });
  const lockRows = APEX_OS_QA_SECURITY_LOCKS.map((item) => ({ ...item }));
  return {
    status: "Hardening evidence ready",
    tone: "green",
    evidenceCount: evidenceRows.length,
    lockCount: lockRows.length,
    evidenceRows,
    lockRows,
  };
}

function buildFinishedApexOsState({
  decisionMemory,
  knowledgeVault,
  askApexChat,
  voiceInterface,
  approvalCommandCenter,
  buildAwareness,
  executionHandoffs,
  agentControlPlane,
  releaseMonitoring,
  businessCommandCenter,
  qaSecurityHardening,
  releaseDesk,
  agentWorkQueue,
  launchState,
} = {}) {
  const capabilityRows = APEX_OS_FINISHED_CAPABILITY_ROWS.map((item) => {
    if (item.id === "john-only-command-center") {
      return {
        ...item,
        status: "Ready",
        tone: "green",
        detail: `${formatCount(qaSecurityHardening?.evidenceCount)} hardening rows prove private access, company isolation, direct-route blocking, and field-user blocking.`,
      };
    }
    if (item.id === "text-chat-with-apex") {
      return {
        ...item,
        status: "Ready",
        tone: "green",
        detail: `${formatCount(askApexChat?.contextCount)} context lanes and ${formatCount(askApexChat?.evidenceCount)} evidence rows feed private Ask Apex answers and draft-only actions.`,
      };
    }
    if (item.id === "voice-input-output") {
      return {
        ...item,
        status: "Ready",
        tone: "green",
        detail: `${formatCount(voiceInterface?.modeCount)} voice modes and ${formatCount(voiceInterface?.safetyCount)} safety gates keep open voice visible while typed answers remain available if speech fails.`,
      };
    }
    if (item.id === "knowledge-upload-reviewed-memory") {
      return {
        ...item,
        status: "Ready",
        tone: "green",
        detail: `${formatCount(knowledgeVault?.categoryCount)} intake categories, ${formatCount(knowledgeVault?.sourceCount)} source rows, and ${formatCount(knowledgeVault?.lockedRuleCount)} privacy rules protect reviewed memory.`,
      };
    }
    if (item.id === "decision-log") {
      return {
        ...item,
        status: "Ready",
        tone: "green",
        detail: `${formatCount(decisionMemory?.decisionCount)} plan decisions, ${formatCount(decisionMemory?.ruleCount)} operating rules, and ${formatCount(decisionMemory?.durableCount)} durable memory rows are visible.`,
      };
    }
    if (item.id === "source-backed-answers") {
      return {
        ...item,
        status: "Ready",
        tone: "green",
        detail: `${formatCount(askApexChat?.evidenceCount)} answer evidence rows, Knowledge Vault rows, and decision-memory rows keep answers source-backed before any action draft.`,
      };
    }
    if (item.id === "app-build-awareness") {
      return {
        ...item,
        status: "Ready",
        tone: "green",
        detail: `${buildAwareness?.branch || "Current branch"} at ${buildAwareness?.headSha || "runtime"} with ${formatCount(buildAwareness?.changedFileCount)} changed-file signals and ${formatCount(list(buildAwareness?.sourceLinks).length)} source links.`,
      };
    }
    if (item.id === "agent-control") {
      return {
        ...item,
        status: "Ready",
        tone: "green",
        detail: `${formatCount(agentControlPlane?.roleCount)} agent roles, ${formatCount(agentControlPlane?.requestSummary?.total)} control requests, and ${formatCount(agentControlPlane?.reportRows?.length)} report rows are visible.`,
      };
    }
    if (item.id === "approval-center") {
      return {
        ...item,
        status: "Ready",
        tone: "green",
        detail: `${formatCount(approvalCommandCenter?.queueCount)} risky-action categories, ${formatCount(approvalCommandCenter?.packetFieldCount)} packet fields, and ${formatCount(approvalCommandCenter?.controlLockCount)} locked controls are mapped.`,
      };
    }
    if (item.id === "launch-business-queues") {
      return {
        ...item,
        status: "Ready",
        tone: "green",
        detail: `${formatCount(businessCommandCenter?.queueCount)} business queues, ${formatCount(businessCommandCenter?.launchCount)} launch/founder-demo rows, and ${formatCount(businessCommandCenter?.gateCount)} manual gates are visible.`,
      };
    }
    if (item.id === "monitoring-daily-briefings") {
      return {
        ...item,
        status: "Ready",
        tone: "green",
        detail: `${formatCount(releaseMonitoring?.readinessCount)} monitoring checks, ${formatCount(releaseMonitoring?.briefingCount)} briefing rows, and ${formatCount(releaseMonitoring?.lockCount)} locks are visible.`,
      };
    }
    if (item.id === "kill-switch") {
      return {
        ...item,
        status: "Ready",
        tone: "green",
        detail: "Access removal is the kill switch: operator access false, non-office role, or non-default workspace removes nav/bootstrap access and blocks Apex OS APIs/state.",
      };
    }
    if (item.id === "safe-task-execution-handoff") {
      return {
        ...item,
        status: "Ready",
        tone: "green",
        detail: `${formatCount(executionHandoffs?.handoffSummary?.total)} durable handoffs, ${formatCount(executionHandoffs?.handoffSummary?.ready)} ready handoffs, and ${formatCount(executionHandoffs?.handoffSummary?.finished)} finished result rows are review-only.`,
      };
    }
    if (item.id === "release-desk") {
      return {
        ...item,
        status: "Ready",
        tone: "green",
        detail: `${formatCount(releaseDesk?.deployHistoryCount)} deploy history rows, ${formatCount(releaseDesk?.readinessPacketRows?.length)} readiness rows, and backup/rollback/hosted-smoke proof paths are visible.`,
      };
    }
    if (item.id === "mobile-owner-cockpit") {
      return {
        ...item,
        status: "Ready",
        tone: "green",
        detail: "Desktop/mobile browser QA verifies the private Control Room stacks for owner review without horizontal overflow.",
      };
    }
    return { ...item, status: "Ready", tone: "green" };
  });
  const runLoopRows = withDerivedStateMetaList([
    {
      id: "run-loop-ask",
      title: "Ask",
      status: "Ready",
      detail: "Ask Apex can answer private questions from selected source lanes and confirmed voice transcripts.",
      tone: "green",
    },
    {
      id: "run-loop-decide",
      title: "Decide",
      status: "Ready",
      detail: "Decision Memory can draft, approve, archive, and export source-backed operating decisions.",
      tone: "green",
    },
    {
      id: "run-loop-upload",
      title: "Upload",
      status: "Ready",
      detail: "Knowledge Vault intake classifies and reviews private text/PDF/manual knowledge before trust.",
      tone: "green",
    },
    {
      id: "run-loop-approve",
      title: "Approve",
      status: "Ready",
      detail: "Approval packets keep risky work review-only with exact phrase, source, risk, and rollback fields.",
      tone: "green",
    },
    {
      id: "run-loop-brief",
      title: "Brief",
      status: "Ready",
      detail: "Daily briefing rows and saved briefing history summarize owner focus, release state, blockers, and next manual actions.",
      tone: "green",
    },
    {
      id: "run-loop-monitor",
      title: "Monitor",
      status: "Ready",
      detail: "Release Monitoring and QA hardening rows expose health, build/test, stalled-agent, docs-drift, and no-bypass evidence.",
      tone: "green",
    },
    {
      id: "run-loop-plan",
      title: "Plan",
      status: "Ready",
      detail: "Launch/business queues and personal operating rules put daily priorities, work style, and owner check-ins in one place.",
      tone: "green",
    },
    {
      id: "run-loop-handoff",
      title: "Execute Scoped Tasks",
      status: "Handoff ready",
      detail: `${formatCount(agentWorkQueue?.availableTaskCount)} review-only task types can become scoped handoffs with validation and rollback; queue/run actions remain gated.`,
      tone: "blue",
    },
    {
      id: "run-loop-release",
      title: "Prepare Releases",
      status: "Ready",
      detail: "Release Desk and build awareness prepare deploy packets, rollback targets, hosted smoke, protected endpoint checks, and asset proof.",
      tone: "green",
    },
    {
      id: "run-loop-manage-agents",
      title: "Manage Agents",
      status: "Ready",
      detail: "Agent Control can pause, resume, request scoped runs, mark ready/block/close, and show reports without autonomous unrequested work.",
      tone: "green",
    },
  ], { sourceLabel: "Apex OS Phase 18 run loop", source: "completed Apex OS phases", confidence: 88 });
  const freezeRows = withDerivedStateMetaList([
    {
      id: "phase-freeze",
      title: "Phase 1-17 freeze",
      status: "Frozen",
      detail: "Completed Apex OS phases stay intact; Phase 18 only assembles proof and does not rebuild working systems.",
      tone: "green",
    },
    {
      id: "completion-state",
      title: "Completion state",
      status: "Ready to freeze",
      detail: `${capabilityRows.length} finished capabilities and ${runLoopRows.length} day-to-day run-loop steps are visible before final production-preview QA.`,
      tone: "green",
    },
    {
      id: "final-production-preview",
      title: "Final production-preview QA",
      status: releaseDesk?.deployHistoryCount ? "Evidence path ready" : "Proof path ready",
      detail: "Final closure still requires commit, push, deploy, hosted checks, protected endpoint checks, asset proof, rollback evidence, and release-evidence docs.",
      tone: "blue",
    },
    {
      id: "blocked-action-proof",
      title: "Blocked-action proof",
      status: "Locked",
      detail: `${APEX_OS_FINISHED_BLOCKED_ACTION_ROWS.length} external/provider/customer-visible action classes remain blocked unless separately approved later.`,
      tone: "amber",
    },
    {
      id: "next-phase-rule",
      title: "No next phase jump",
      status: "Locked",
      detail: "Do not move past Phase 18 until local validation, production deploy, release evidence, commit, and push are complete.",
      tone: "amber",
    },
  ], { sourceLabel: "Apex OS Phase 18 freeze rule", source: "hard-finish roadmap", confidence: 90 });
  const blockedActionRows = withDerivedStateMetaList(APEX_OS_FINISHED_BLOCKED_ACTION_ROWS.map((item) => ({ ...item })), {
    sourceLabel: "Apex OS not-approved list",
    source: "living finish plan approval posture",
    confidence: 94,
  });
  return {
    status: "Apex OS ready",
    tone: "green",
    readyCount: capabilityRows.length,
    capabilityCount: capabilityRows.length,
    runLoopCount: runLoopRows.length,
    freezeCount: freezeRows.length,
    blockedActionCount: blockedActionRows.length,
    capabilityRows: withDerivedStateMetaList(capabilityRows, {
      sourceLabel: "Apex OS Phase 18 capability proof",
      source: "completed Apex OS phases",
      confidence: 88,
    }),
    runLoopRows,
    freezeRows,
    blockedActionRows,
    launchBlockedCount: launchState?.blockedCount || 0,
  };
}

function runStatusTone(status) {
  const normalized = String(status || "").trim().toLowerCase();
  if (["succeeded", "complete", "done"].includes(normalized)) return "green";
  if (["running", "in_progress", "processing"].includes(normalized)) return "blue";
  if (["queued", "pending", "retrying"].includes(normalized)) return "amber";
  if (["failed", "dead_lettered", "error"].includes(normalized)) return "red";
  if (["cancelled", "canceled"].includes(normalized)) return "slate";
  return "slate";
}

function buildAgentWorkQueue(agentTaskOptions = [], agentRunRows = [], permissions = {}) {
  const canUseAiOffice = permissions?.aiOffice?.canView === true;
  const availableTasks = list(agentTaskOptions).filter((option) => !option.disabled);
  const lockedTasks = list(agentTaskOptions).filter((option) => option.disabled);
  const visibleTargetCount = availableTasks.reduce((total, option) => total + list(option.targets).length, 0);
  return {
    status: canUseAiOffice ? "Review-only" : "Package locked",
    tone: canUseAiOffice ? (availableTasks.length ? "green" : "slate") : "slate",
    taskCount: agentTaskOptions.length,
    availableTaskCount: availableTasks.length,
    lockedTaskCount: lockedTasks.length,
    visibleTargetCount,
    recentRunCount: agentRunRows.length,
    taskRows: availableTasks.slice(0, 4).map((option) => ({
      id: option.actionId,
      title: option.label,
      status: `${list(option.targets).length} targets`,
      detail: `${option.modeLabel || "Draft only"}: ${option.helper}`,
      tone: "green",
    })),
    lockedRows: lockedTasks.slice(0, 3).map((option) => ({
      id: option.actionId,
      title: option.label,
      status: option.disabledReason || "Locked",
      detail: option.helper,
      tone: "slate",
    })),
    runRows: list(agentRunRows).slice(0, 3).map((row) => ({
      id: row.runId || row.taskId || row.eventId || row.actionId,
      title: row.actionLabel || row.actionId || "Agent OS run",
      status: row.status || "Recorded",
      detail: row.summary || row.createdAt || "Audit-backed Agent OS run row.",
      meta: row.createdAt || "",
      tone: runStatusTone(row.status),
    })),
    safetyRows: [
      {
        id: "draft-only",
        title: "Draft-only boundary",
        status: "Locked",
        detail: "This surface can review and prepare work packages; it does not run agents or mutate records.",
        tone: "amber",
      },
      {
        id: "external-gates",
        title: "External gates",
        status: "Approval required",
        detail: "Customer contact, payment, bid, portal, provider, deploy, and production actions stay behind owner approval.",
        tone: "amber",
      },
    ],
  };
}

function buildPhase2Kpis({ releaseDesk, agentWorkQueue, launchState, approvalCommandCenter, buildAwareness } = {}) {
  const launchBlockers = formatCount(launchState?.blockedCount);
  const approvalQueueCount = formatCount(approvalCommandCenter?.queueCount);
  const readyPackets = formatCount(approvalCommandCenter?.packetSummary?.ready);
  return [
    {
      id: "app-build-status",
      label: "App Build Status",
      value: buildAwareness?.status || releaseDesk?.status || "Manual",
      detail: buildAwareness?.branch
        ? `${buildAwareness.branch} at ${buildAwareness.headSha}; ${formatCount(buildAwareness.changedFileCount)} changed files are visible. Consequential actions remain gated.`
        : "Build and release work stays inside the private release desk until tests, rollback evidence, and owner approval are complete.",
      tone: buildAwareness?.tone || releaseDesk?.tone || "amber",
    },
    {
      id: "active-agents",
      label: "Active Agents",
      value: String(formatCount(agentWorkQueue?.availableTaskCount)),
      detail: `${formatCount(agentWorkQueue?.availableTaskCount)} review-only task types and ${formatCount(agentWorkQueue?.recentRunCount)} recent audit-backed run rows are visible. No agent execution runs from this shell.`,
      tone: agentWorkQueue?.tone || "slate",
    },
    {
      id: "launch-blockers",
      label: "Launch Blockers",
      value: String(launchBlockers),
      detail: launchBlockers
        ? `${launchBlockers} launch gates still need evidence before launch can be treated as clear.`
        : "No launch gate blockers are currently reported by the launch readiness state.",
      tone: launchBlockers ? "amber" : "green",
    },
    {
      id: "approvals",
      label: "Approvals",
      value: String(approvalQueueCount),
      detail: `${approvalQueueCount} risky-action categories require scoped approval packets; ${readyPackets} packets are marked ready.`,
      tone: readyPackets ? "green" : "amber",
    },
  ];
}

function buildPhase2CommandBoard({
  summary,
  launchState,
  agentWorkQueue,
  approvalCommandCenter,
  decisionMemory,
} = {}) {
  return [
    {
      id: "apex-briefing",
      title: "Apex Briefing",
      status: "Private operator",
      detail: summary || "Private Apex HQ operating center.",
      tone: "green",
    },
    {
      id: "priority-queue",
      title: "Priority Queue",
      status: launchState?.highestPriority?.status || launchState?.status || "Review",
      detail: launchState?.highestPriority?.blockers?.[0] || launchState?.highestPriority?.detail || "Review launch, release, approval, agent, and memory signals before choosing the next local build step.",
      tone: launchState?.highestPriority?.tone || launchState?.tone || "amber",
    },
    {
      id: "agents",
      title: "Agents",
      status: agentWorkQueue?.status || "Review-only",
      detail: `${formatCount(agentWorkQueue?.availableTaskCount)} review-only task types, ${formatCount(agentWorkQueue?.lockedTaskCount)} locked task types, and ${formatCount(agentWorkQueue?.recentRunCount)} audit-backed run rows are visible.`,
      tone: agentWorkQueue?.tone || "blue",
    },
    {
      id: "approvals",
      title: "Approvals",
      status: approvalCommandCenter?.status || "Drafting ready",
      detail: `${formatCount(approvalCommandCenter?.queueCount)} approval categories, ${formatCount(approvalCommandCenter?.packetFieldCount)} packet fields, and ${formatCount(approvalCommandCenter?.controlLockCount)} locked controls are mapped before execution exists.`,
      tone: approvalCommandCenter?.tone || "blue",
    },
    {
      id: "memory-decisions",
      title: "Memory / Decisions",
      status: decisionMemory?.status || "Seeded from plan",
      detail: `${formatCount(decisionMemory?.decisionCount)} plan decisions, ${formatCount(decisionMemory?.ruleCount)} operating rules, and ${formatCount(decisionMemory?.durableCount)} durable memory rows are visible as private source-backed context.`,
      tone: decisionMemory?.tone || "green",
    },
  ];
}

function buildApexHqDomainBridgeState({
  leads = [],
  jobs = [],
  customers = [],
  estimates = [],
  proposals = [],
  dailyReports = [],
  uploads = [],
  buildAwareness = {},
  personalOperatingLayer = {},
} = {}) {
  const leadCount = activeRows(leads).length;
  const jobCount = activeRows(jobs).length;
  const customerCount = activeRows(customers).length;
  const estimateCount = activeRows(estimates).length;
  const proposalCount = activeRows(proposals).length;
  const reportCount = activeRows(dailyReports).length;
  const uploadCount = activeRows(uploads).length;
  const openTaskCount = formatCount(personalOperatingLayer?.taskReminderSummary?.openTaskCount);
  const openReminderCount = formatCount(personalOperatingLayer?.taskReminderSummary?.openReminderCount);
  const rows = [
    {
      id: "apex-hq-leads",
      title: "Leads",
      status: `${leadCount} visible`,
      detail: "Apex can open the existing Apex HQ lead workspace and summarize lead context from current state.",
      tone: leadCount ? "green" : "slate",
      icon: "inbox",
      moduleId: "leads",
      actionLabel: "Open leads",
      examples: ["show leads", "open leads"],
    },
    {
      id: "apex-hq-jobs",
      title: "Jobs",
      status: `${jobCount} visible`,
      detail: "Apex can open the existing jobs workspace and summarize active work from current state.",
      tone: jobCount ? "green" : "slate",
      icon: "briefcase",
      moduleId: "jobs",
      actionLabel: "Open jobs",
      examples: ["show jobs", "open jobs"],
    },
    {
      id: "apex-hq-customers",
      title: "Customers",
      status: `${customerCount} visible`,
      detail: "Apex can open the existing customer workspace without duplicating customer workflows.",
      tone: customerCount ? "green" : "slate",
      icon: "users",
      moduleId: "customers",
      actionLabel: "Open customers",
      examples: ["show customers", "open customers"],
    },
    {
      id: "apex-hq-estimates",
      title: "Estimates",
      status: `${estimateCount} visible`,
      detail: "Apex can route to the existing estimate workspace. Sending and pricing approvals stay gated.",
      tone: estimateCount ? "green" : "slate",
      icon: "quote",
      moduleId: "estimates",
      actionLabel: "Open estimates",
      examples: ["show estimates", "open estimates"],
    },
    {
      id: "apex-hq-proposals",
      title: "Proposals",
      status: `${proposalCount} visible`,
      detail: "Apex can route to the existing proposal workspace. Customer-visible sending stays gated.",
      tone: proposalCount ? "green" : "slate",
      icon: "quote",
      moduleId: "proposals",
      actionLabel: "Open proposals",
      examples: ["show proposals", "open proposals"],
    },
    {
      id: "apex-hq-reports",
      title: "Reports",
      status: `${reportCount} visible`,
      detail: "Apex can route to the existing report workspace.",
      tone: reportCount ? "green" : "slate",
      icon: "upload",
      moduleId: "reports",
      actionLabel: "Open reports",
      examples: ["show reports", "open reports"],
    },
    {
      id: "apex-hq-uploads",
      title: "Uploads",
      status: `${uploadCount} visible`,
      detail: "Apex can route to the existing upload and proof workspace.",
      tone: uploadCount ? "green" : "slate",
      icon: "upload",
      moduleId: "uploads",
      actionLabel: "Open uploads",
      examples: ["show uploads", "open uploads"],
    },
    {
      id: "apex-hq-build",
      title: "Build Status",
      status: buildAwareness?.status || "Visible",
      detail: `${buildAwareness?.branch || "Current branch"} build awareness is available inside Apex. Deploy and production actions stay gated.`,
      tone: buildAwareness?.tone || "blue",
      icon: "spark",
      sectionId: "release",
      actionLabel: "Open build status",
      examples: ["summarize build status", "what changed in the app"],
    },
    {
      id: "apex-private-tasks",
      title: "Private Tasks",
      status: `${openTaskCount} tasks / ${openReminderCount} reminders`,
      detail: "Apex can create private internal tasks/reminders through the existing operator-only Apex state.",
      tone: openTaskCount || openReminderCount ? "green" : "blue",
      icon: "check",
      sectionId: "personal",
      actionLabel: "Open tasks",
      examples: ["remind me", "create a private task"],
    },
  ];
  const commandRows = [
    { id: "bridge-open-leads", title: "show/open leads", status: "Routes to Leads", moduleId: "leads", tone: "green" },
    { id: "bridge-open-jobs", title: "show/open jobs", status: "Routes to Jobs", moduleId: "jobs", tone: "green" },
    { id: "bridge-open-customers", title: "show/open customers", status: "Routes to Customers", moduleId: "customers", tone: "green" },
    { id: "bridge-open-estimates", title: "show/open estimates", status: "Routes to Estimates", moduleId: "estimates", tone: "green" },
    { id: "bridge-open-proposals", title: "show/open proposals", status: "Routes to Proposals", moduleId: "proposals", tone: "green" },
    { id: "bridge-open-reports", title: "show/open reports", status: "Routes to Reports", moduleId: "reports", tone: "green" },
    { id: "bridge-open-uploads", title: "show/open uploads", status: "Routes to Uploads", moduleId: "uploads", tone: "green" },
    { id: "bridge-today-summary", title: "summarize today's Apex HQ state", status: "Answers from current state", sectionId: "apex", tone: "blue" },
    { id: "bridge-build-summary", title: "summarize app/build status", status: "Uses build awareness", sectionId: "release", tone: "blue" },
    { id: "bridge-private-task", title: "create private task/reminder/note", status: "Private Apex state only", sectionId: "personal", tone: "green" },
  ];
  const blockedRows = [
    "sends",
    "spend",
    "orders",
    "booking",
    "auth/security",
    "schema/session",
    "production/deploy",
    "deletion",
    "other people's time/privacy/data",
  ].map((label) => ({
    id: `bridge-block-${label.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`,
    title: label,
    status: "Confirmation required",
    tone: "amber",
  }));

  return {
    status: "Business workspace ready",
    tone: "green",
    summary: "Apex is the private operator. Apex HQ is the business domain it can route through using existing modules, state, and permission gates.",
    counts: {
      leadCount,
      jobCount,
      customerCount,
      estimateCount,
      proposalCount,
      reportCount,
      uploadCount,
      openTaskCount,
      openReminderCount,
    },
    rows,
    commandRows,
    blockedRows,
  };
}

export const APEX_BUILDER_VALIDATION_ACTION_ROWS = Object.freeze([
  {
    id: "git-diff-check",
    title: "Diff whitespace check",
    status: "Safe local check",
    detail: "Runs git diff --check against the local worktree. It does not stage, commit, deploy, or edit files.",
    tone: "blue",
  },
  {
    id: "apex-home-focused-tests",
    title: "Apex Home focused tests",
    status: "Safe local check",
    detail: "Runs focused route, Apex Home, Control Room import, navigation, and permission tests.",
    tone: "green",
  },
  {
    id: "apex-local-intelligence-tests",
    title: "Local intelligence tests",
    status: "Safe local check",
    detail: "Runs local-first provider, Ask Apex, and Knowledge Intelligence regression tests.",
    tone: "green",
  },
  {
    id: "verify-roles",
    title: "Role boundary check",
    status: "Safe local check",
    detail: "Runs the owner/admin/field permission boundary suite.",
    tone: "green",
  },
  {
    id: "build",
    title: "Production build",
    status: "Safe local build",
    detail: "Runs the local production build only. It does not deploy or touch production.",
    tone: "amber",
  },
]);

export const APEX_BUILDER_CONTROLLED_FIX_ACTION_ROWS = Object.freeze([
  {
    id: "apex-home-copy-polish",
    title: "Stale copy polish",
    status: "Controlled local fix",
    detail: "Applies exact allowlisted Apex Home copy fixes when stale wording is found, then runs focused checks.",
    tone: "green",
  },
  {
    id: "control-room-import-repair",
    title: "Import/render repair",
    status: "Scoped local fix",
    detail: "Scopes Apex Home or Control Room import/render issues and runs the focused route/import suite.",
    tone: "blue",
  },
  {
    id: "builder-status-label-repair",
    title: "Status label repair",
    status: "Scoped local fix",
    detail: "Scopes Builder Mode status labels, badges, and local intelligence display mismatches.",
    tone: "blue",
  },
  {
    id: "builder-receipt-history-display",
    title: "Receipt history repair",
    status: "Scoped local fix",
    detail: "Scopes missing latest fix history, touched files, validation result, and What Apex Did rows.",
    tone: "blue",
  },
  {
    id: "utility-test-repair",
    title: "Utility/test repair",
    status: "Scoped local fix",
    detail: "Scopes small helper or assertion issues and runs the matching local focused checks.",
    tone: "amber",
  },
  {
    id: "layout-overflow-guard",
    title: "Layout overflow guard",
    status: "Scoped local fix",
    detail: "Scopes harmless mobile/text overflow issues in Apex Home layout and CSS.",
    tone: "amber",
  },
]);

function sanitizeApexBuilderNextAction(action = null, dirtyCount = 0) {
  const fallback = {
    id: "builder-next-action",
    title: "Next useful local action",
    status: dirtyCount ? "Check changes" : "Ready",
    detail: dirtyCount
      ? "Refresh build awareness, run focused tests, then decide the next private builder task."
      : "Ask Apex to check the app or track the next bug/build task.",
    tone: dirtyCount ? "amber" : "green",
  };
  const row = action && typeof action === "object" ? { ...action } : fallback;
  const joined = `${row.title || ""} ${row.status || ""} ${row.detail || ""}`;
  if (/\b(commit|push|deploy|production|schema|auth|session|delete|deletion)\b/i.test(joined)) {
    return {
      ...row,
      status: "Local only",
      detail: "Run focused local validation and document the result. Release, production, schema/auth/session, and deletion work stay outside Builder Mode.",
      tone: "amber",
    };
  }
  return row;
}

export function buildApexBuilderModeState({
  buildAwareness = {},
  autonomyRunCenter = {},
  executionHandoffs = {},
  agentControlPlane = {},
  apexActivity = {},
  validationReceipts = [],
  fixReceipts = [],
  undoReceipts = [],
} = {}) {
  const changedFiles = list(buildAwareness?.changedFiles);
  const dirtyCount = formatCount(buildAwareness?.changedFileCount, changedFiles.length);
  const runRows = list(autonomyRunCenter?.runRows);
  const builderTaskRows = runRows
    .filter((run) => {
      const text = [
        run?.routeId,
        run?.routeLabel,
        run?.title,
        run?.request,
        run?.detail,
      ].join(" ").toLowerCase();
      return /\b(builder|build|bug|fix|app|code|repo|validation|test|qa)\b/.test(text);
    })
    .slice(0, 6);
  const activeTaskRows = builderTaskRows.filter((run) => !["done", "archived", "blocked"].includes(String(run.status || "").toLowerCase()));
  const receipts = list(validationReceipts).slice(0, 6);
  const fixes = list(fixReceipts).slice(0, 6);
  const undos = list(undoReceipts).slice(0, 6);
  const latestSuccessfulFix = fixes.find((fix) => fix?.undoAvailable === true && fix?.status === "fixed") || null;
  const patchPreviewSource = latestSuccessfulFix || fixes.find((fix) => list(fix?.patchPreviews).length || list(fix?.patchResults).some((patch) => patch.preview)) || null;
  const patchPreviewRows = (list(patchPreviewSource?.patchPreviews).length
    ? list(patchPreviewSource?.patchPreviews)
    : list(patchPreviewSource?.patchResults).map((patch) => patch.preview).filter(Boolean))
    .slice(0, 4)
    .map((preview, index) => ({
      id: preview.id || `${patchPreviewSource?.id || "patch-preview"}-${index}`,
      targetFile: preview.targetFile || preview.file || "allowlisted file",
      searchSnippet: safeReceiptText(preview.searchSnippet || "", 280),
      replacementSnippet: safeReceiptText(preview.replacementSnippet || "", 280),
      explanation: safeReceiptText(preview.explanation || "Exact controlled local patch preview.", 220),
      validationCommand: preview.validationCommand?.label || preview.validationCommand?.id || patchPreviewSource?.validationSummary?.label || "",
      expectedResult: safeReceiptText(preview.expectedResult || "Focused validation should pass.", 180),
      sourceFixId: patchPreviewSource?.id || patchPreviewSource?.fixId || "",
    }));
  const recentUndoRows = undos.length
    ? undos.map((undo) => ({
      id: undo.id || undo.sourceFixId || "builder-undo",
      title: undo.label || "Local undo",
      status: undo.historyStatus || undo.status || (undo.ok ? "undone" : "blocked"),
      detail: safeReceiptText(undo.receipt || undo.whatApexDid || "Local undo receipt returned from Apex Builder Mode.", 320),
      tone: undo.ok ? "green" : undo.status === "blocked" ? "amber" : "red",
      sourceLabel: undo.sourceFixId || undo.fixId || "controlled-local-undo",
      filesTouched: list(undo.filesTouched).slice(0, 4),
      validationStatus: undo.validationSummary?.status || undo.validationRun?.status || "",
      undoHint: safeReceiptText(undo.undoHint || "", 220),
      whatApexDid: safeReceiptText(undo.whatApexDid || undo.receipt || "", 260),
    }))
    : [];
  const recentFixRows = fixes.length
    ? fixes.map((fix) => ({
      id: fix.id || fix.fixId,
      title: fix.label || fix.fixId || "Controlled local fix",
      status: fix.historyStatus || fix.status || (fix.ok ? "validated" : "review"),
      detail: safeReceiptText(fix.receipt || fix.detail || "Controlled local fix receipt returned from Apex Builder Mode.", 320),
      tone: fix.status === "reverted" ? "amber" : fix.ok ? "green" : fix.status === "blocked" ? "amber" : "red",
      sourceLabel: fix.fixId || "controlled-local-fix",
      request: safeReceiptText(fix.request || "", 160),
      filesTouched: list(fix.filesTouched).length ? list(fix.filesTouched) : list(fix.scopedFiles).slice(0, 4),
      validationStatus: fix.validationSummary?.status || fix.validationRun?.status || "",
      validationCommandId: fix.validationSummary?.commandId || fix.validationRun?.commandId || "",
      actionTaken: list(fix.actionTaken).slice(0, 5),
      whatApexDid: safeReceiptText(fix.whatApexDid || fix.receipt || "", 260),
      undoHint: safeReceiptText(fix.undoHint || "", 220),
      undoAvailable: fix.undoAvailable === true,
      patchPreviewCount: list(fix.patchPreviews).length || list(fix.patchResults).filter((patch) => patch.preview).length,
    }))
    : [
      {
        id: "builder-fix-ready",
        title: "Controlled local fixes",
        status: "Ready",
        detail: "Apex can run small scoped local UI/test/helper fixes through fixed profiles and exact allowlisted patch rules.",
        tone: "green",
      },
    ];
  const recentValidationRows = receipts.length
    ? receipts.map((receipt) => ({
      id: receipt.id || receipt.commandId,
      title: receipt.label || receipt.commandId || "Local validation",
      status: receipt.status || (receipt.ok ? "passed" : "review"),
      detail: receipt.receipt || receipt.output || "Local validation result returned from Apex Builder Mode.",
      tone: receipt.ok ? "green" : receipt.status === "blocked" ? "amber" : "red",
      commandId: receipt.commandId,
    }))
    : [
      {
        id: "build-script-status",
        title: buildAwareness?.buildStatus?.title || "Build script",
        status: buildAwareness?.buildStatus?.status || "Available",
        detail: buildAwareness?.buildStatus?.detail || "Apex can run the safe local build command when you ask.",
        tone: buildAwareness?.buildStatus?.tone || "blue",
      },
      {
        id: "test-script-status",
        title: buildAwareness?.testStatus?.title || "Verification scripts",
        status: buildAwareness?.testStatus?.status || "Available",
        detail: buildAwareness?.testStatus?.detail || "Apex can run focused local checks from the private builder surface.",
        tone: buildAwareness?.testStatus?.tone || "blue",
      },
    ];

  const activityRows = [
    ...fixes.map((fix) => ({
      id: `fix-${fix.id || fix.fixId}`,
      title: "What Apex Did",
      status: fix.historyStatus || fix.status || "recorded",
      detail: safeReceiptText(fix.whatApexDid || fix.receipt || "Apex ran a controlled local fix.", 280),
      tone: fix.status === "reverted" ? "amber" : fix.ok ? "green" : fix.status === "blocked" ? "amber" : "blue",
      sourceLabel: fix.fixId || "controlled-local-fix",
    })),
    ...undos.map((undo) => ({
      id: `undo-${undo.id || undo.sourceFixId}`,
      title: "What Apex Undid",
      status: undo.historyStatus || undo.status || "recorded",
      detail: safeReceiptText(undo.whatApexDid || undo.receipt || "Apex ran a scoped local undo.", 280),
      tone: undo.ok ? "green" : undo.status === "blocked" ? "amber" : "red",
      sourceLabel: undo.sourceFixId || undo.fixId || "controlled-local-undo",
    })),
    ...receipts.map((receipt) => ({
      id: `receipt-${receipt.id || receipt.commandId}`,
      title: receipt.label || "Local validation",
      status: receipt.status || "checked",
      detail: receipt.receipt || "Apex ran a safe local validation check.",
      tone: receipt.ok ? "green" : "amber",
    })),
    ...list(apexActivity?.rows).slice(0, 3).map((row) => ({
      id: `activity-${row.id}`,
      title: row.actionType || row.title || "Apex activity",
      status: row.status || "recorded",
      detail: row.reason || row.receipt || row.undoHint || "Private Apex activity receipt.",
      tone: row.status === "blocked" ? "amber" : "green",
    })),
  ].slice(0, 6);

  const summaryRows = [
    {
      id: "builder-build-status",
      title: "Current app/build status",
      status: buildAwareness?.status || "Build awareness ready",
      detail: `${buildAwareness?.branch || "Current branch"} at ${buildAwareness?.headSha || "current head"}. ${buildAwareness?.buildStatus?.detail || "Build script evidence is available."}`,
      tone: buildAwareness?.tone || "blue",
    },
    {
      id: "builder-dirty-files",
      title: "Dirty files summary",
      status: dirtyCount ? `${dirtyCount} changed` : "Clean",
      detail: dirtyCount
        ? "Apex can summarize changed files and run safe local checks, but it will not stage, commit, delete, deploy, or mutate production from Builder Mode."
        : "No changed files are reported by build awareness.",
      tone: dirtyCount ? "amber" : "green",
    },
    {
      id: "builder-active-tasks",
      title: "Active builder tasks",
      status: activeTaskRows.length ? `${activeTaskRows.length} active` : builderTaskRows.length ? "No active" : "Ready",
      detail: builderTaskRows.length
        ? `${builderTaskRows.length} builder-related private task${builderTaskRows.length === 1 ? "" : "s"} are visible from the existing autonomy ledger.`
        : "Create a private builder task from Apex Home when you want Apex to track an issue or build step.",
      tone: activeTaskRows.length ? "green" : builderTaskRows.length ? "blue" : "slate",
    },
    {
      id: "builder-handoffs",
      title: "Builder handoffs",
      status: `${formatCount(executionHandoffs?.handoffSummary?.total)} handoffs`,
      detail: `${formatCount(executionHandoffs?.handoffSummary?.ready)} ready handoffs and ${formatCount(agentControlPlane?.activeRequestCount)} active agent requests are visible. Apex remains one operator with agents underneath it.`,
      tone: executionHandoffs?.tone || agentControlPlane?.tone || "blue",
    },
  ];

  return {
    status: "Builder ready",
    tone: dirtyCount ? "amber" : "green",
    summary: "Apex Builder Mode lets Apex inspect local app state, track private builder work, run controlled local fixes, preview exact patches, undo Apex-owned local changes, keep clear fix history, run fixed checks, and report progress without deploys or production changes.",
    canRunLocalValidation: true,
    canCreateBuilderTasks: true,
    canApplyControlledLocalFixes: true,
    canUndoControlledLocalFixes: true,
    canEditFiles: false,
    canDeploy: false,
    canDeleteFiles: false,
    changedFileCount: dirtyCount,
    activeTaskCount: activeTaskRows.length,
    taskCount: builderTaskRows.length,
    validationCount: receipts.length,
    fixCount: fixes.length,
    undoCount: undos.length,
    latestPatchPreviewSource: patchPreviewSource ? {
      id: patchPreviewSource.id || patchPreviewSource.fixId,
      label: patchPreviewSource.label || patchPreviewSource.fixId || "Controlled local fix",
      status: patchPreviewSource.status || patchPreviewSource.historyStatus || "recorded",
    } : null,
    latestSuccessfulFix: latestSuccessfulFix ? {
      id: latestSuccessfulFix.id || latestSuccessfulFix.fixId,
      fixId: latestSuccessfulFix.fixId,
      label: latestSuccessfulFix.label || latestSuccessfulFix.fixId || "Controlled local fix",
      status: latestSuccessfulFix.historyStatus || latestSuccessfulFix.status || "validated",
      undoHint: safeReceiptText(latestSuccessfulFix.undoHint || "", 220),
      filesTouched: list(latestSuccessfulFix.filesTouched).slice(0, 4),
    } : null,
    summaryRows,
    dirtyFileRows: changedFiles.slice(0, 8),
    builderTaskRows,
    recentFixRows,
    patchPreviewRows,
    recentUndoRows,
    recentValidationRows,
    actionRows: APEX_BUILDER_VALIDATION_ACTION_ROWS.map((row) => ({ ...row })),
    fixActionRows: APEX_BUILDER_CONTROLLED_FIX_ACTION_ROWS.map((row) => ({ ...row })),
    activityRows,
    nextAction: sanitizeApexBuilderNextAction(buildAwareness?.nextSafeTask, dirtyCount),
    blockedRows: [
      "deploy",
      "production mutation",
      "schema/auth/session",
      "deletion",
      "customer-visible writes",
      "sends/spend/orders/booking",
      "permission weakening",
      "uncontrolled autonomous file editing",
    ].map((label) => ({
      id: `builder-block-${label.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`,
      title: label,
      status: "Hard stop",
      tone: "amber",
    })),
  };
}

function statusForFeed(status = "", ok = false) {
  const normalized = String(status || "").toLowerCase();
  if (ok || ["done", "passed", "validated", "fixed", "undone", "already-fixed", "performed"].includes(normalized)) return "done";
  if (["active", "running", "validating", "thinking", "queued"].includes(normalized)) return "active";
  if (["blocked", "denied", "rejected"].includes(normalized)) return "blocked";
  if (["reverted", "reverted-after-validation-failed"].includes(normalized)) return "reverted";
  return "info";
}

function toneForFeedStatus(status = "") {
  switch (statusForFeed(status)) {
    case "done":
      return "green";
    case "active":
      return "blue";
    case "blocked":
    case "reverted":
      return "amber";
    default:
      return "slate";
  }
}

function feedEntry({
  id = "",
  domain = "System",
  title = "",
  detail = "",
  status = "info",
  tone = "",
  actionLabel = "Open details",
  panelId = "",
  createdAt = "",
} = {}) {
  return {
    id: id || `feed-${domain.toLowerCase()}-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    domain,
    title: safeReceiptText(title || "Apex update", 120),
    detail: safeReceiptText(detail || "Apex recorded a private operator update.", 260),
    status: statusForFeed(status),
    tone: tone || toneForFeedStatus(status),
    actionLabel,
    panelId,
    createdAt: createdAt || "Now",
  };
}

export function buildApexWhatChangedFeedState({
  state = {},
  builderMode = null,
  validationReceipts = [],
  fixReceipts = [],
  undoReceipts = [],
  commandEvents = [],
} = {}) {
  const builder = builderMode || state.apexBuilderMode || {};
  const entries = [];

  for (const fix of list(fixReceipts).slice(0, 4)) {
    entries.push(feedEntry({
      id: `builder-fix-${fix.id || fix.fixId}`,
      domain: "Builder",
      title: fix.status === "already-fixed" ? "Checked controlled fix" : fix.label || "Controlled local fix",
      detail: fix.whatApexDid || fix.receipt || "Apex ran or checked a controlled local fix.",
      status: fix.historyStatus || fix.status,
      tone: fix.status === "blocked" ? "amber" : fix.ok ? "green" : "blue",
      actionLabel: "Show builder",
      panelId: "builder",
      createdAt: fix.createdAt || "Latest",
    }));
  }

  for (const preview of list(builder.patchPreviewRows).slice(0, 3)) {
    entries.push(feedEntry({
      id: `patch-preview-${preview.id || preview.targetFile}`,
      domain: "Builder",
      title: `Patch preview: ${preview.targetFile || "allowlisted file"}`,
      detail: preview.explanation || "Apex prepared exact before/after patch snippets for a controlled local fix.",
      status: "info",
      tone: "blue",
      actionLabel: "Show patch",
      panelId: "patch",
      createdAt: "Preview",
    }));
  }

  for (const undo of list(undoReceipts).slice(0, 3)) {
    entries.push(feedEntry({
      id: `builder-undo-${undo.id || undo.sourceFixId}`,
      domain: "Builder",
      title: undo.ok ? "Undid local patch" : "Undo blocked",
      detail: undo.whatApexDid || undo.receipt || "Apex checked local undo state.",
      status: undo.historyStatus || undo.status,
      tone: undo.ok ? "green" : "amber",
      actionLabel: "Show undo",
      panelId: "undo",
      createdAt: undo.createdAt || "Latest",
    }));
  }

  for (const receipt of list(validationReceipts).slice(0, 3)) {
    entries.push(feedEntry({
      id: `validation-${receipt.id || receipt.commandId}`,
      domain: "System",
      title: receipt.label || "Local validation",
      detail: receipt.receipt || receipt.output || "Apex ran a fixed local validation command.",
      status: receipt.status || (receipt.ok ? "passed" : "info"),
      tone: receipt.ok ? "green" : receipt.status === "blocked" ? "amber" : "red",
      actionLabel: "Show builder",
      panelId: "builder",
      createdAt: receipt.createdAt || "Latest",
    }));
  }

  for (const event of list(commandEvents).slice(0, 4)) {
    entries.push(feedEntry({
      id: `command-${event.id || event.intent || event.label}`,
      domain: event.domain || "Apex HQ",
      title: event.title || event.label || "Command routed",
      detail: event.detail || "Apex routed a natural command to an existing private workspace capability.",
      status: event.status || "info",
      tone: event.tone || "blue",
      actionLabel: event.actionLabel || "Open details",
      panelId: event.panelId || "activity",
      createdAt: event.createdAt || "Latest",
    }));
  }

  for (const row of list(state.apexActivity?.rows).slice(0, 3)) {
    entries.push(feedEntry({
      id: `activity-${row.id}`,
      domain: row.affectedRecordType === "task" || row.affectedRecordType === "reminder" ? "Memory" : "System",
      title: row.actionType || "Private internal action",
      detail: row.reason || row.receipt || row.undoHint || "Apex recorded a private internal action receipt.",
      status: row.status,
      tone: row.status === "blocked" ? "amber" : "green",
      actionLabel: "Show activity",
      panelId: "activity",
      createdAt: row.createdAt || "Latest",
    }));
  }

  if (state.apexHqDomain?.status) {
    entries.push(feedEntry({
      id: "apex-hq-domain-ready",
      domain: "Apex HQ",
      title: "Business workspace ready",
      detail: state.apexHqDomain.summary || "Apex can route to existing Apex HQ modules without duplicating workflows.",
      status: state.apexHqDomain.status,
      tone: state.apexHqDomain.tone || "green",
      actionLabel: "Show Apex HQ",
      panelId: "apex-hq",
      createdAt: "Current",
    }));
  }

  if (builder.status) {
    entries.push(feedEntry({
      id: "builder-mode-ready",
      domain: "Builder",
      title: "Builder Mode ready",
      detail: `${builder.fixCount || 0} fix receipts, ${builder.undoCount || 0} undo receipts, and ${builder.validationCount || 0} validation receipts are available.`,
      status: builder.status,
      tone: builder.tone || "green",
      actionLabel: "Show builder",
      panelId: "builder",
      createdAt: "Current",
    }));
  }

  if (state.askApexChat?.providerStatus) {
    entries.push(feedEntry({
      id: "local-intelligence-status",
      domain: "System",
      title: "Local intelligence",
      detail: `${state.askApexChat.providerStatus}. OpenAI stays disabled by default unless John explicitly asks for cloud and policy allows it.`,
      status: "done",
      tone: "green",
      actionLabel: "Show voice",
      panelId: "voice",
      createdAt: "Current",
    }));
  }

  const compactEntries = entries.slice(0, 10);
  return {
    status: compactEntries.length ? "Feed ready" : "Standing by",
    tone: compactEntries.some((entry) => entry.status === "blocked" || entry.status === "reverted") ? "amber" : compactEntries.length ? "green" : "slate",
    entryCount: compactEntries.length,
    entries: compactEntries,
    surfaceRows: [
      { id: "main-screen", title: "Main screen", status: "Active", detail: "Conversation, avatar, current action, and What Changed stay on the primary Apex surface.", tone: "green" },
      { id: "second-monitor", title: "Second monitor", status: "Placeholder", detail: "Future surface route only; no remote push or device control is active in v0.", tone: "slate" },
      { id: "phone", title: "Phone", status: "Placeholder", detail: "Future companion surface only; no push/control path exists yet.", tone: "slate" },
      { id: "tablet-tv-watch", title: "Tablet / TV / watch", status: "Placeholder", detail: "Future display targets only. Real device execution stays locked until a later approved connector phase.", tone: "slate" },
    ],
    summary: compactEntries.length
      ? "Apex summarizes recent private/local changes here and opens detailed panels only when John asks."
      : "Apex is standing by. New private actions, checks, fixes, and routed commands will appear here.",
  };
}

function formatApexTalkList(items = [], limit = 4) {
  return list(items).slice(0, limit).map((item) => {
    const title = safeReceiptText(item.title || item.label || item.actionType || "Apex update", 110);
    const detail = safeReceiptText(item.detail || item.whatApexDid || item.receipt || item.reason || "", 160);
    return detail ? `${title}: ${detail}` : title;
  });
}

function joinApexTalkList(items = [], emptyText = "nothing new is waiting for you") {
  const clean = list(items).map((item) => String(item || "").trim()).filter(Boolean);
  if (!clean.length) return emptyText;
  if (clean.length === 1) return clean[0];
  return `${clean.slice(0, -1).join("; ")}; and ${clean[clean.length - 1]}`;
}

const APEX_LOCAL_TALK_MODEL = "qwen3:14b";
const APEX_LOCAL_NORMAL_CODING_MODEL = "qwen3:14b";
const APEX_LOCAL_FAST_CODER_MODEL = "qwen2.5-coder:7b";
const APEX_LOCAL_DEEP_CODING_MODEL = "qwen3-coder:30b";
const APEX_LOCAL_CODING_MODEL = APEX_LOCAL_DEEP_CODING_MODEL;

function findApexOllamaProviderStatus(payload = {}) {
  if (payload?.localProviders?.ollama) return payload.localProviders.ollama;
  if (Array.isArray(payload?.providers)) {
    return payload.providers.find((provider) => String(provider?.provider || "").toLowerCase() === "ollama") || {};
  }
  if (String(payload?.provider || "").toLowerCase() === "ollama") return payload;
  return {};
}

function findApexGpuStatus(payload = {}) {
  if (payload?.localProviders?.gpu) return payload.localProviders.gpu;
  if (payload?.gpu) return payload.gpu;
  if (payload?.speedCore?.gpu) return payload.speedCore.gpu;
  return {};
}

function findApexBrainStatus(payload = {}) {
  if (payload?.brain?.provider === "apex-workstation-brain") return payload.brain;
  if (payload?.localProviders?.brain?.provider === "apex-workstation-brain") return payload.localProviders.brain;
  if (payload?.background?.brain?.provider === "apex-workstation-brain") return payload.background.brain;
  return {};
}

function findApexAgentSpeedStatus(payload = {}) {
  if (payload?.agentSpeed?.provider === "apex-local-agent-speed") return payload.agentSpeed;
  if (payload?.localProviders?.agentSpeed?.provider === "apex-local-agent-speed") return payload.localProviders.agentSpeed;
  if (payload?.background?.agentSpeed?.provider === "apex-local-agent-speed") return payload.background.agentSpeed;
  return {};
}

function findApexStableResidencyStatus(payload = {}) {
  if (payload?.stableResidency?.provider === "apex-local-agent-stable-residency") return payload.stableResidency;
  if (payload?.localProviders?.stableResidency?.provider === "apex-local-agent-stable-residency") return payload.localProviders.stableResidency;
  if (payload?.background?.stableResidency?.provider === "apex-local-agent-stable-residency") return payload.background.stableResidency;
  if (payload?.agentSpeed?.stableResidency?.provider === "apex-local-agent-stable-residency") return payload.agentSpeed.stableResidency;
  if (payload?.background?.agentSpeed?.stableResidency?.provider === "apex-local-agent-stable-residency") return payload.background.agentSpeed.stableResidency;
  return {};
}

function hasApexLocalModel(modelNames = [], model = "") {
  const target = String(model || "").trim().toLowerCase();
  return list(modelNames).some((name) => String(name || "").trim().toLowerCase() === target);
}

function buildApexLocalReadinessSummary(localProviderStatus = null) {
  const ollama = findApexOllamaProviderStatus(localProviderStatus || {});
  const gpu = findApexGpuStatus(localProviderStatus || {});
  const rawBrain = findApexBrainStatus(localProviderStatus || {});
  const agentSpeed = findApexAgentSpeedStatus(localProviderStatus || {});
  const stableResidency = findApexStableResidencyStatus(localProviderStatus || {});
  const benchmarkHistory = localProviderStatus?.agentSpeedBenchmarkHistory
    || localProviderStatus?.background?.agentSpeedBenchmarkHistory
    || localProviderStatus?.localIntelligence?.benchmarkHistory
    || {};
  const keepWarm = localProviderStatus?.background?.keepWarm || localProviderStatus?.keepWarm || {};
  const brain = rawBrain.provider === "apex-workstation-brain"
    ? rawBrain
    : buildApexWorkstationBrainStatus({
        modelNames: Array.isArray(ollama.modelNames) ? ollama.modelNames : [],
        gpu,
      });
  const modelProcessorReceipt = ollama.modelProcessor || localProviderStatus?.modelProcessor || {};
  const modelNames = Array.isArray(ollama.modelNames) ? ollama.modelNames : [];
  const providerAvailable = Boolean(ollama.available);
  const hasModelData = modelNames.length > 0;
  const normalReady = hasApexLocalModel(modelNames, APEX_LOCAL_TALK_MODEL);
  const codingReady = normalReady;
  const fastCoderReady = hasApexLocalModel(modelNames, APEX_LOCAL_FAST_CODER_MODEL);
  const deepCodingReady = hasApexLocalModel(modelNames, APEX_LOCAL_DEEP_CODING_MODEL);
  const providerStatus = providerAvailable ? "available" : ollama.status || "unknown";
  const overall = providerAvailable && normalReady
    ? "ready"
    : providerAvailable || hasModelData
      ? "partial"
      : "unknown";
  const needs = [
    !providerAvailable ? "start Ollama locally" : "",
    providerAvailable && !normalReady ? `pull ${APEX_LOCAL_TALK_MODEL}` : "",
  ].filter(Boolean);
  return {
    provider: "Ollama",
    providerStatus,
    overall,
    modelNames,
    gpu: {
      available: Boolean(gpu.available),
      status: gpu.status || (gpu.available ? "available" : "unknown"),
      name: safeReceiptText(gpu.gpuName || "", 120),
      vramTotalMb: Number(gpu.vramTotalMb || 0) || 0,
      vramUsedMb: Number(gpu.vramUsedMb || 0) || 0,
    },
    modelProcessor: {
      processor: safeReceiptText(modelProcessorReceipt.processor || "unknown", 40),
      model: safeReceiptText(modelProcessorReceipt.model || "", 120),
      vramUsedMb: Number(modelProcessorReceipt.vramUsedMb || 0) || 0,
      responseTimingMs: Number(modelProcessorReceipt.responseTimingMs || 0) || 0,
      modelAlreadyLoaded: Boolean(modelProcessorReceipt.modelAlreadyLoaded),
    },
    brain: {
      provider: "apex-workstation-brain",
      activeMode: safeReceiptText(brain.activeMode || "speed", 40),
      label: safeReceiptText(brain.label || brain.activeMode || "Speed", 80),
      modelId: safeReceiptText(brain.modelId || agentSpeed.modelId || APEX_LOCAL_TALK_MODEL, 120),
      numCtx: Number(brain.numCtx || agentSpeed.numCtx || 2048) || 2048,
      keepAlive: safeReceiptText(brain.keepAlive || agentSpeed.keepAlive || "30m", 40),
      processor: safeReceiptText(brain.processor || modelProcessorReceipt.processor || "unknown", 40),
      vramUsedMb: Number(brain.vramUsedMb || gpu.vramUsedMb || modelProcessorReceipt.vramUsedMb || 0) || 0,
      vramTotalMb: Number(brain.vramTotalMb || gpu.vramTotalMb || 0) || 0,
      thresholdStatus: safeReceiptText(brain.thresholdStatus || "stable", 80),
      lastPromotionDecision: safeReceiptText(brain.lastPromotionDecision || "stable", 120),
      rollbackReason: safeReceiptText(brain.rollbackReason || "", 220),
      dedicatedEnabled: Boolean(brain.dedicatedMode?.enabled),
      queueSerialized: brain.queue?.serialized !== false,
    },
    agentSpeed: {
      provider: "apex-local-agent-speed",
      laneId: safeReceiptText(agentSpeed.laneId || "fast", 40),
      laneLabel: safeReceiptText(agentSpeed.laneLabel || "Fast", 80),
      modelId: safeReceiptText(agentSpeed.modelId || APEX_LOCAL_TALK_MODEL, 120),
      numCtx: Number(agentSpeed.numCtx || 2048) || 2048,
      keepAlive: safeReceiptText(agentSpeed.keepAlive || "30m", 40),
      coderManualOnly: agentSpeed.coderManualOnly !== false,
      coderAutoWarm: false,
      noCloudFallback: true,
    },
    stableResidency: {
      provider: "apex-local-agent-stable-residency",
      residentLane: safeReceiptText(stableResidency.residentLane || agentSpeed.residentLane || benchmarkHistory.stableResidency?.chosenResidentLane || "stable-4096", 80),
      residentNumCtx: Number(stableResidency.residentNumCtx || agentSpeed.residentNumCtx || benchmarkHistory.recommendedResidentNumCtx || 4096) || 4096,
      stable4096Active: Boolean(stableResidency.stable4096Active || agentSpeed.stable4096Active || Number(stableResidency.residentNumCtx || agentSpeed.residentNumCtx || benchmarkHistory.recommendedResidentNumCtx || 4096) === 4096),
      fallback2048Active: Boolean(stableResidency.fallback2048Active || agentSpeed.fallback2048Active || Number(stableResidency.residentNumCtx || agentSpeed.residentNumCtx || 4096) === 2048),
      reason: safeReceiptText(stableResidency.reason || benchmarkHistory.stableResidency?.reason || "daily-stable-4096-default", 160),
      lastBenchmarkSummary: safeReceiptText(benchmarkHistory.stableResidency?.summary || benchmarkHistory.summary || "No stable residency benchmark history yet.", 260),
      no30BWarm: true,
    },
    normalModel: {
      model: APEX_LOCAL_TALK_MODEL,
      status: normalReady ? "ready" : hasModelData ? "missing" : "checking",
      ready: normalReady,
    },
    codingModel: {
      model: APEX_LOCAL_NORMAL_CODING_MODEL,
      status: codingReady ? "ready" : hasModelData ? "missing" : "checking",
      ready: codingReady,
    },
    fastCoderModel: {
      model: APEX_LOCAL_FAST_CODER_MODEL,
      status: fastCoderReady ? "ready" : hasModelData ? "missing" : "checking",
      ready: fastCoderReady,
      optional: true,
      measuredRequired: true,
    },
    deepCodingModel: {
      model: APEX_LOCAL_DEEP_CODING_MODEL,
      status: deepCodingReady ? "manual-only-ready" : hasModelData ? "missing-optional" : "checking",
      ready: deepCodingReady,
      manualOnly: true,
      autoWarm: false,
    },
    openAiRequired: false,
    openAiUsed: false,
    keepWarm: {
      enabled: Boolean(keepWarm.enabled),
      targetModel: safeReceiptText(keepWarm.targetModel || APEX_LOCAL_TALK_MODEL, 120),
      keepAlive: safeReceiptText(keepWarm.keepAlive || "30m", 40),
      targetNumCtx: Number(keepWarm.lastReceipt?.targetNumCtx || keepWarm.targetNumCtx || stableResidency.residentNumCtx || agentSpeed.residentNumCtx || 0) || 0,
      residentLane: safeReceiptText(keepWarm.residentLane || stableResidency.residentLane || agentSpeed.residentLane || "", 80),
      permanent: false,
    },
    benchmarkHistory: {
      status: safeReceiptText(benchmarkHistory.status || "empty", 40),
      latestLane: safeReceiptText(benchmarkHistory.latest?.laneId || "", 40),
      latestModel: safeReceiptText(benchmarkHistory.latest?.modelUsed || "", 120),
      latestNumCtx: Number(benchmarkHistory.latest?.numCtx || 0) || 0,
      latestTotalDurationMs: Number(benchmarkHistory.latest?.totalDurationMs || 0) || 0,
      averageTotalDurationMs: Number(benchmarkHistory.averageTotalDurationMs || 0) || 0,
      firstTokenSamples: Number(benchmarkHistory.firstTokenSamples || 0) || 0,
      summary: safeReceiptText(benchmarkHistory.summary || "No local benchmark history yet. Apex will not run benchmarks unless John asks.", 260),
      stableResidencySummary: safeReceiptText(benchmarkHistory.stableResidency?.summary || "", 260),
      recommendedResidentNumCtx: Number(benchmarkHistory.recommendedResidentNumCtx || benchmarkHistory.stableResidency?.recommendedResidentNumCtx || 0) || 0,
      autoPromoteTo30B: false,
    },
    needs,
  };
}

function inferApexSelfFixIntent(question = "") {
  const normalized = String(question || "").toLowerCase().replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  if (/\b(stop fixing|stop repair|cancel repair|cancel fixing|stand down repair|stop self[- ]?fix)\b/i.test(normalized)) return "stop-repair";
  if (/\b(hand this to the build thread|handoff to the build thread|hand off to the build thread|send this to the build thread|handoff package|patch handoff|build thread)\b/i.test(normalized)) return "patch-handoff";
  if (/\b(show me the patch|show the patch|show patch|pull up patch preview|patch preview|before after patch|what patch|show the diff|exact patch)\b/i.test(normalized)) return "patch-show";
  if (/\b(what tests would you run|what test would you run|what tests should run|what test should run|validation plan|what should we test|what checks would you run|focused validation)\b/i.test(normalized)) return "repair-tests";
  if (/\b(what would you change|what would change|what would you fix|what is the change|explain the fix|proposed change|smallest fix)\b/i.test(normalized)) return "repair-change";
  if (/\b(prepare a patch|prep a patch|patch intent|patch plan|draft a patch|make a patch preview|prepare patch preview)\b/i.test(normalized)) return "repair-patch";
  if (/\b(what'?s broken here|what is broken here|what broke here|find the issue|what seems broken|likely issue|diagnose this screen)\b/i.test(normalized)) return "repair-diagnosis";
  if (/\b(fix this screen|fix this page|fix this ui|fix this small ui issue|fix small ui|fix stale copy|repair this screen|repair this page|repair a focused test|repair this test|fix this status label|fix status label|clean up this small layout issue|small layout issue|run the focused fix|focused fix|controlled fix|work on this bug|fix this bug|repair this|fix this local|fix the app|fix the local app|check and fix the local app)\b/i.test(normalized)) return "repair-plan";
  return "";
}

function normalizeApexSelfFixPatchPreview(preview = {}, index = 0, fallbackValidation = "") {
  const targetFile = safeReceiptText(preview.targetFile || preview.file || "", 180);
  const searchSnippet = safeReceiptText(preview.searchSnippet || preview.search || preview.before || "", 520);
  const replacementSnippet = safeReceiptText(preview.replacementSnippet || preview.replacement || preview.after || "", 520);
  const changeSummary = safeReceiptText(preview.explanation || preview.changeSummary || preview.summary || "Apply the exact scoped local patch preview.", 260);
  const validationCommand = safeReceiptText(
    preview.validationCommand?.label
      || preview.validationCommand?.id
      || preview.validationCommand
      || fallbackValidation,
    180,
  );
  const expectedResult = safeReceiptText(preview.expectedResult || "Focused validation should pass.", 180);
  return {
    id: safeReceiptText(preview.id || `self-fix-patch-${index + 1}`, 80),
    targetFile,
    searchSnippet,
    replacementSnippet,
    changeSummary,
    validationCommand,
    expectedResult,
    exactMatchRequired: true,
    canApplyFromApexUi: false,
  };
}

export function buildApexSelfFixPatchHandoff({
  question = "",
  builderMode = {},
  repairPrep = null,
  now = new Date().toISOString(),
} = {}) {
  const builder = builderMode || {};
  const prep = repairPrep || {};
  const fallbackValidation = list(prep.validationPlan)[0] || "Focused Apex Home tests";
  const patches = list(builder.patchPreviewRows)
    .map((preview, index) => normalizeApexSelfFixPatchPreview(preview, index, fallbackValidation))
    .filter((patch) => patch.targetFile && patch.searchSnippet && patch.replacementSnippet)
    .slice(0, 4);
  const targetFiles = [...new Set([
    ...patches.map((patch) => patch.targetFile),
    ...list(prep.likelyAffectedFiles),
  ].filter(Boolean))].slice(0, 6);
  const ready = patches.length > 0;
  const handoffIdSeed = safeReceiptText(question || patches[0]?.targetFile || prep.intent || "self-fix", 48)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    || "self-fix";
  const validationCommandRecommendation = patches.find((patch) => patch.validationCommand)?.validationCommand
    || fallbackValidation
    || "Focused Apex Home tests";
  const humanReadableChangeSummary = ready
    ? joinApexTalkList(patches.map((patch) => `${patch.targetFile}: ${patch.changeSummary}`), "Apply the prepared exact patch preview.")
    : "Apex needs exact target file, search snippet, and replacement snippet before it can hand off a patch.";
  const rollbackNote = prep.rollbackPath || "Rollback only the exact touched local files from the build thread/tooling; do not use broad reset, checkout, deletion, or production rollback.";
  const receipt = ready
    ? `Patch handoff ready for build-thread/tooling execution. ${patches.length} exact patch${patches.length === 1 ? "" : "es"} prepared across ${targetFiles.length || patches.length} target file${(targetFiles.length || patches.length) === 1 ? "" : "s"}. Apex Home did not edit files, run git, deploy, touch production, or change schema/auth/session.`
    : "Patch handoff needs exact patch context before execution tooling can receive it. Apex Home did not edit files, run git, deploy, touch production, or change schema/auth/session.";
  return {
    handoffId: `self-fix-handoff-${handoffIdSeed}`,
    version: "self-fix-v1",
    status: ready ? "ready-for-build-thread" : "needs-exact-patch-context",
    destination: "build-thread-tooling",
    createdAt: safeReceiptText(now, 80),
    targetFiles,
    patches,
    searchSnippet: patches[0]?.searchSnippet || "",
    replacementSnippet: patches[0]?.replacementSnippet || "",
    humanReadableChangeSummary,
    validationCommandRecommendation,
    rollbackNote: safeReceiptText(rollbackNote, 520),
    receipt: safeReceiptText(receipt, 620),
    canExecuteNow: false,
    canEditFilesFromApexUi: false,
    canRunGitFromApexUi: false,
    canDeploy: false,
    executionBoundary: "Apex Home prepares the package only. Build-thread/tooling performs any file edits after normal local safeguards.",
    blockedActions: [
      "file writes from Apex UI",
      "git operations from Apex UI",
      "deploy or production mutation",
      "schema/auth/session changes",
      "deletion",
      "secrets exposure",
      "sends/spend/orders/bookings",
      "customer-visible changes",
      "permission weakening",
    ],
  };
}

function buildApexSelfFixAutoDispatchDetailAnswer({ question = "", receipt = null } = {}) {
  const normalized = String(question || "").toLowerCase().replace(/\s+/g, " ").trim();
  if (!receipt || !normalized) return null;
  const patchLines = formatApexTalkList(list(receipt.patchPreviews).map((patch) => ({
    title: patch.targetFile || "Patch",
    detail: patch.explanation || `${patch.searchSnippet || "before"} -> ${patch.replacementSnippet || "after"}`,
  })), 3);
  if (/\b(what did you learn|what did apex learn|what learned|learned receipt)\b/i.test(normalized)) {
    const learned = receipt.learningReceipt || {};
    return {
      intent: "self-fix-learning",
      answer: `I learned the pattern as ${safeReceiptText(learned.issuePattern || "a scoped local app issue", 140)}. Strategy: ${safeReceiptText(learned.patchStrategy || "use the narrow controlled Builder profile", 220)} Validation proof: ${safeReceiptText(learned.validationProof || receipt.testedDetail || "not recorded", 220)} Next time: ${safeReceiptText(learned.fasterNextTime || "dispatch the matched Builder profile directly and keep the screen quiet", 220)}.`,
      notice: "Apex summarized the Self-Fix v2 learning receipt.",
    };
  }
  if (/\b(what did you test|what tests did you run|what did apex test|what passed|validation proof)\b/i.test(normalized)) {
    return {
      intent: "self-fix-tested",
      answer: `I tested this with ${safeReceiptText(receipt.testedDetail || receipt.validationSummary?.label || "the focused local validation path", 260)}. I kept deploy, production, schema/auth/session, deletion, and git controls out of Apex Home.`,
      notice: "Apex summarized Self-Fix validation.",
    };
  }
  if (/\b(what failed|what went wrong|why failed|failure|what blocked)\b/i.test(normalized)) {
    const failure = receipt.failureDetail || receipt.learningReceipt?.failure;
    return {
      intent: "self-fix-failure",
      answer: failure
        ? `Here is what failed or blocked: ${safeReceiptText(failure, 360)}`
        : "Nothing failed on the latest Self-Fix dispatch receipt. If you want the exact patch or validation proof, ask me for that detail.",
      notice: "Apex summarized Self-Fix failure state.",
    };
  }
  if (/\b(show me the patch|show the patch|show patch|pull up patch preview|patch preview|before after patch|what patch|show the diff|exact patch)\b/i.test(normalized)) {
    return {
      intent: "self-fix-patch-detail",
      answer: patchLines.length
        ? `The latest Self-Fix patch was: ${joinApexTalkList(patchLines)}. I'm keeping it conversational instead of opening a permanent patch panel.`
        : "The latest Self-Fix dispatch did not include an applied patch preview. It either scoped the issue, found the fix already present, or blocked before changing files.",
      notice: "Apex summarized the Self-Fix patch.",
    };
  }
  if (/\b(what did you change|show what you changed|what changed in the fix|what did apex change)\b/i.test(normalized)) {
    return {
      intent: "self-fix-changed",
      answer: `I changed or checked this: ${safeReceiptText(receipt.changedDetail || receipt.receipt || receipt.shortAnswer || "Self-Fix dispatch result recorded.", 420)} ${receipt.filesTouched?.length ? `Files touched: ${joinApexTalkList(receipt.filesTouched, "none")}.` : ""}`.trim(),
      notice: "Apex summarized Self-Fix changes.",
    };
  }
  return null;
}

export function buildApexSelfFixRepairPrep({
  question = "",
  builderMode = {},
  whatChangedFeed = {},
  validationReceipts = [],
  fixReceipts = [],
  undoReceipts = [],
} = {}) {
  const intent = inferApexSelfFixIntent(question);
  const builder = builderMode || {};
  const feedEntries = list(whatChangedFeed.entries);
  const latestFeed = feedEntries[0] || {};
  const latestFix = list(fixReceipts)[0] || list(builder.recentFixRows)[0] || {};
  const latestUndo = list(undoReceipts)[0] || list(builder.recentUndoRows)[0] || {};
  const patchPreviewRows = list(builder.patchPreviewRows);
  const summaryRows = list(builder.summaryRows);
  const changedFileRows = summaryRows.filter((row) => /\b(file|dirty|change|build|status|test|validation)\b/i.test(`${row.id || ""} ${row.title || ""} ${row.detail || ""}`));
  const likelyFiles = [
    ...list(latestFix.filesTouched),
    ...list(latestFix.scopedFiles),
    ...patchPreviewRows.map((row) => row.targetFile || row.file),
    ...changedFileRows.map((row) => row.detail).filter((detail) => /\.[a-z0-9]{1,5}\b/i.test(String(detail || ""))),
  ]
    .map((value) => safeReceiptText(value, 140))
    .filter(Boolean)
    .filter((value, index, rows) => rows.indexOf(value) === index)
    .slice(0, 5);
  const validationRows = [
    ...list(builder.actionRows),
    ...list(validationReceipts),
  ].slice(0, 4);
  const validationPlan = validationRows.length
    ? formatApexTalkList(validationRows, 4)
    : [
      "Focused Apex Home tests",
      "Builder Mode regression tests",
      "Permission boundary tests",
      "Production build",
      "git diff --check",
    ];
  const blockedActions = [
    "no auto-edit from the Apex UI",
    "no git",
    "no deploy or production mutation",
    "no schema/auth/session changes",
    "no deletion",
    "no sends, spend, orders, bookings, or customer-visible work",
  ];
  const surface = likelyFiles.length
    ? joinApexTalkList(likelyFiles, "the current Apex Home surface")
    : latestFeed.title
      ? safeReceiptText(`${latestFeed.domain || "Apex"} / ${latestFeed.title}`, 160)
      : "the current Apex Home conversation surface";
  const issueSummary = intent === "repair-diagnosis"
    ? `Likely issue: something on ${surface} needs a focused local repair pass, but I need visual/context evidence before naming a root cause.`
    : intent === "repair-patch"
      ? "Patch prep: I can package the exact target file, search snippet, replacement snippet, validation command, and rollback note for the build thread."
      : intent === "patch-show"
        ? "Patch preview: I can summarize the current patch handoff conversationally without opening a permanent panel."
        : intent === "patch-handoff"
          ? "Patch handoff: I can hand the exact patch package to the build thread/tooling while Apex Home stays conversational."
          : intent === "repair-tests"
            ? "Validation prep: the next move is focused local tests around the affected Apex surface, then build if the small checks pass."
            : intent === "repair-change"
              ? `Proposed change: keep it to the smallest local UI/helper/test adjustment on ${surface}, with exact target files and validation before any patch is applied outside this UI.`
              : `Repair prep: I understand this as a small local Apex HQ app issue on ${surface}.`;
  const proposedSmallestFix = patchPreviewRows.length
    ? `Use the latest patch preview as the candidate fix: ${joinApexTalkList(formatApexTalkList(patchPreviewRows, 2), "review the current preview")}.`
    : "First isolate the affected screen/helper, identify the smallest exact file change, prepare a before/after patch preview, then validate locally.";
  const rollbackPath = latestUndo.id || latestUndo.sourceFixId
    ? `If Apex already applied the related scoped patch, use Apex's local undo receipt when the baseline still matches: ${safeReceiptText(latestUndo.detail || latestUndo.receipt || latestUndo.undoHint || "undo available for Apex-owned patch", 180)}.`
    : "Rollback path: use the pre-phase checkpoint or revert only the exact touched local files. No git reset, checkout, deletion, or broad rollback from Apex Home.";
  const nextSafeAction = intent === "repair-tests"
    ? "Run the focused validation path from the local workspace, then report the result."
    : ["repair-patch", "patch-show", "patch-handoff"].includes(intent)
      ? "Prepare the exact patch preview with target file, search snippet, replacement snippet, expected result, and validation command."
      : "Inspect the current screen/evidence, prepare the smallest patch preview, then run the focused validation path if John asks from the build thread.";
  const patchHandoff = ["repair-patch", "patch-show", "patch-handoff", "repair-change"].includes(intent)
    ? buildApexSelfFixPatchHandoff({ question, builderMode: builder, repairPrep: {
      intent,
      likelyAffectedFiles: likelyFiles,
      validationPlan,
      rollbackPath,
    } })
    : null;
  const patchHandoffLine = patchHandoff?.status === "ready-for-build-thread"
    ? `Patch handoff: ${patchHandoff.receipt} Target files: ${joinApexTalkList(patchHandoff.targetFiles, "none")}. Search snippet: ${safeReceiptText(patchHandoff.searchSnippet, 220)}. Replacement snippet: ${safeReceiptText(patchHandoff.replacementSnippet, 220)}.`
    : patchHandoff
      ? `Patch handoff: ${patchHandoff.receipt}`
      : "";
  const answer = [
    issueSummary,
    `Likely affected surface/files: ${surface}.`,
    `Smallest fix: ${proposedSmallestFix}`,
    patchHandoffLine,
    "Execution boundary: Apex Home prepares the handoff; the build thread/tooling performs any file edit after the normal local safeguards.",
    `Boundaries kept: ${blockedActions.join(", ")}.`,
    `Validation I would run: ${joinApexTalkList(validationPlan, "focused Apex Home tests, Builder regression tests, permission checks, build, and git diff --check")}.`,
    rollbackPath,
    `Next safe action: ${nextSafeAction}`,
  ].join(" ");
  return {
    requested: Boolean(intent),
    intent,
    issueSummary,
    likelyAffectedSurface: surface,
    likelyAffectedFiles: likelyFiles,
    proposedSmallestFix,
    riskLevel: "low-to-medium-local-prep",
    blockedActions,
    validationPlan,
    rollbackPath,
    nextSafeAction,
    canExecuteNow: false,
    canEditFilesFromApexUi: false,
    canRunGitFromApexUi: false,
    canDeploy: false,
    patchHandoff,
    handoffReceipt: patchHandoff?.receipt || "",
    answer: safeReceiptText(answer, 1800),
    sourceLabels: ["Apex Self-Fix v1", "Builder Mode", "Patch Preview", "Local Undo", "What Changed"],
    autoDispatchEligible: ["repair-plan", "repair-patch", "patch-handoff"].includes(intent),
    autoDispatchSource: "apex-home-self-fix-v2",
  };
}

export function buildApexTalkToApexSummary({
  state = {},
  builderMode = {},
  whatChangedFeed = {},
  validationReceipts = [],
  fixReceipts = [],
  undoReceipts = [],
  commandEvents = [],
  buildLoopReceipt = null,
  localProviderStatus = null,
  localVoiceReadiness = null,
  personalOsCore = null,
  learningMode = false,
  lastVoiceTranscript = "",
  lastLocalVoiceReceipt = null,
  memoryRows = [],
} = {}) {
  const feedEntries = list(whatChangedFeed.entries);
  const builder = builderMode || {};
  const activeBuilderTasks = list(builder.builderTaskRows).filter((row) => !["done", "archived"].includes(String(row.status || "").toLowerCase()));
  const activeRuns = list(state.autonomyRunCenter?.runRows).filter((row) => !["done", "archived", "blocked"].includes(String(row.status || "").toLowerCase()));
  const agentSignals = Number(state.agentControlPlane?.activeRequestCount || state.agentControlPlane?.roleCount || state.agentWorkQueue?.availableTaskCount || 0);
  const recentReceipts = [
    buildLoopReceipt,
    ...list(fixReceipts),
    ...list(undoReceipts),
    ...list(validationReceipts),
    ...list(state.apexActivity?.rows),
    ...list(commandEvents),
  ].filter(Boolean);
  const changedLines = formatApexTalkList(feedEntries, 4);
  const receiptLines = formatApexTalkList(recentReceipts, 4);
  const builderLines = [
    builder.status ? `Builder is ${safeReceiptText(builder.status, 80)}` : "",
    buildLoopReceipt?.taskTitle ? `Build loop: ${safeReceiptText(buildLoopReceipt.taskTitle, 100)} is ${safeReceiptText(buildLoopReceipt.outcome || buildLoopReceipt.status || "recorded", 80)}` : "",
    Number(builder.changedFileCount || 0) ? `${builder.changedFileCount} local file${Number(builder.changedFileCount) === 1 ? "" : "s"} changed` : "",
    Number(builder.fixCount || 0) ? `${builder.fixCount} fix receipt${Number(builder.fixCount) === 1 ? "" : "s"}` : "",
    Number(builder.undoCount || 0) ? `${builder.undoCount} undo receipt${Number(builder.undoCount) === 1 ? "" : "s"}` : "",
    activeBuilderTasks.length ? `${activeBuilderTasks.length} active builder task${activeBuilderTasks.length === 1 ? "" : "s"}` : "",
  ].filter(Boolean);
  const voiceReceipt = lastLocalVoiceReceipt || localVoiceReadiness?.lastVoiceTurn || state.localVoiceStatus?.lastVoiceTurn || null;
  return {
    changedLines,
    receiptLines,
    buildLoopSummary: summarizeApexBuildLoopReceipt(buildLoopReceipt),
    buildLoopReceipt,
    builderLines,
    learningMode: Boolean(learningMode),
    lastVoiceTranscript: safeReceiptText(lastVoiceTranscript, 320),
    lastLocalVoiceReceipt: voiceReceipt,
    learningMemoryRows: list(memoryRows).length ? list(memoryRows) : list(state.decisionMemory?.durableEntries),
    feedCount: Number(whatChangedFeed.entryCount || feedEntries.length || 0),
    validationCount: list(validationReceipts).length || Number(builder.validationCount || 0),
    fixCount: list(fixReceipts).length || Number(builder.fixCount || 0),
    undoCount: list(undoReceipts).length || Number(builder.undoCount || 0),
    activeBuilderTaskCount: activeBuilderTasks.length,
    activeRunCount: activeRuns.length,
    agentSignalCount: agentSignals,
    localProviderStatus: safeReceiptText(state.askApexChat?.providerStatus || "Ollama local-first", 120),
    localReadiness: buildApexLocalReadinessSummary(localProviderStatus || state.localProviderStatus || state.localOperatorRuntime?.localProviders || state.localOperatorRuntime || {}),
    localVoiceReadiness: localVoiceReadiness || buildApexPersonalOsLocalVoiceReadiness(),
    personalOsCore: personalOsCore || buildApexPersonalOsCoreState({
      voiceReadiness: localVoiceReadiness || buildApexPersonalOsLocalVoiceReadiness(),
    }),
  };
}

export function buildApexTalkToApexResponse({
  question = "",
  state = {},
  builderMode = {},
  whatChangedFeed = {},
  validationReceipts = [],
  fixReceipts = [],
  undoReceipts = [],
  commandEvents = [],
  buildLoopReceipt = null,
  selfFixDispatchReceipt = null,
  localProviderStatus = null,
  localVoiceReadiness = null,
  personalOsCore = null,
  learningMode = false,
  lastVoiceTranscript = "",
  lastLocalVoiceReceipt = null,
  memoryRows = [],
} = {}) {
  const normalized = String(question || "").toLowerCase().replace(/\s+/g, " ").trim();
  const summary = buildApexTalkToApexSummary({
    state,
    builderMode,
    whatChangedFeed,
    validationReceipts,
    fixReceipts,
    undoReceipts,
    commandEvents,
    buildLoopReceipt,
    localProviderStatus,
    localVoiceReadiness,
    personalOsCore,
    learningMode,
    lastVoiceTranscript,
    lastLocalVoiceReceipt,
    memoryRows,
  });
  const base = {
    handled: false,
    intent: "",
    answer: "",
    sourceLabels: ["Apex Home", "Private local state"],
    shouldClearScreen: false,
    notice: "",
  };
  if (!normalized) return base;

  const dispatchDetail = buildApexSelfFixAutoDispatchDetailAnswer({
    question,
    receipt: selfFixDispatchReceipt,
  });
  if (dispatchDetail) {
    return {
      ...base,
      handled: true,
      intent: dispatchDetail.intent,
      answer: dispatchDetail.answer,
      sourceLabels: ["Apex Self-Fix v2", "Builder Mode", "Learning Receipt"],
      notice: dispatchDetail.notice,
    };
  }

  const repairPrep = buildApexSelfFixRepairPrep({
    question,
    builderMode,
    whatChangedFeed,
    validationReceipts,
    fixReceipts,
    undoReceipts,
  });
  if (repairPrep.intent === "stop-repair") {
    return {
      ...base,
      handled: true,
      intent: "self-fix-stop",
      shouldClearScreen: true,
      answer: "I stopped the repair prep and returned to calm standby. I did not edit files, run git, deploy, touch production, or change schema/auth/session.",
      sourceLabels: repairPrep.sourceLabels,
      notice: "Apex stopped Self-Fix prep.",
    };
  }
  if (repairPrep.requested) {
    return {
      ...base,
      handled: true,
      intent: repairPrep.intent,
      answer: repairPrep.answer,
      sourceLabels: repairPrep.sourceLabels,
      patchHandoff: repairPrep.patchHandoff,
      handoffReceipt: repairPrep.handoffReceipt,
      autoDispatchEligible: repairPrep.autoDispatchEligible,
      autoDispatchSource: repairPrep.autoDispatchSource,
      notice: repairPrep.patchHandoff?.status === "ready-for-build-thread"
        ? "Apex prepared a Self-Fix patch handoff for Builder."
        : "Apex prepared the Self-Fix repair context.",
    };
  }

  const buildLoopResponse = buildApexBuildLoopConversationResponse({
    question,
    receipt: summary.buildLoopReceipt,
    state: {
      lastReceipt: summary.buildLoopReceipt,
      status: summary.buildLoopSummary?.status,
      activeTaskTitle: summary.buildLoopSummary?.pulse,
    },
  });
  if (buildLoopResponse.handled) {
    return {
      ...base,
      handled: true,
      intent: buildLoopResponse.intent,
      answer: buildLoopResponse.answer,
      sourceLabels: buildLoopResponse.sourceLabels || ["Apex Autonomous Build Loop v0", "Builder Mode"],
      notice: "Apex routed this through the controlled local build loop.",
      buildLoopCommand: buildLoopResponse.buildLoopCommand || null,
      autoBuildLoopEligible: Boolean(buildLoopResponse.autoBuildLoopEligible),
    };
  }

  const learningResponse = buildApexLearningConversationResponse({
    text: question,
    learningMode,
    memoryRows: summary.learningMemoryRows,
  });
  if (learningResponse.handled) {
    return {
      ...base,
      handled: true,
      intent: learningResponse.intent,
      answer: learningResponse.answer,
      sourceLabels: learningResponse.sourceLabels || ["Apex Learning Conversation", "Private Memory"],
      notice: learningResponse.notice || "Apex handled learning conversation.",
      learningMode: learningResponse.learningMode,
      learningMemoryDraft: learningResponse.learningMemoryDraft || null,
      learningMemoryPreview: learningResponse.learningMemoryPreview || "",
      learningMemoryBlocked: Boolean(learningResponse.learningMemoryBlocked),
      learningSummary: learningResponse.learningSummary || null,
    };
  }

  if (/\b(what did i just say|what did you hear|repeat what i said|read back what i said|did you hear that)\b/i.test(normalized)) {
    const transcript = summary.lastVoiceTranscript;
    return {
      ...base,
      handled: true,
      intent: "voice-transcript-readback",
      answer: transcript
        ? `I heard: “${transcript}”.`
        : "I do not have a local voice transcript in this page session yet. Tap or hold voice, say it once, and I’ll read back the local transcript.",
      sourceLabels: ["Apex Local STT v2", "Local Voice Runtime"],
      notice: transcript ? "Apex read back the last local transcript." : "Apex has no local transcript yet.",
    };
  }

  const lastVoiceReceipt = summary.lastLocalVoiceReceipt || summary.localVoiceReadiness?.lastVoiceTurn || null;
  if (/\b(what failed with that audio turn|what failed with the audio turn|what happened with that audio|what happened to that voice turn|audio data is not right|audio turn failed|voice turn failed|why did voice fail)\b/i.test(normalized)) {
    const failureLine = lastVoiceReceipt
      ? summarizeApexVoiceTurnFailure(lastVoiceReceipt)
      : "I do not have a failed audio turn receipt yet.";
    const audioLine = lastVoiceReceipt?.audio
      ? `Audio facts: ${lastVoiceReceipt.audio.convertedMimeType || "unknown MIME"}, ${lastVoiceReceipt.audio.sampleRate || "unknown"} Hz, ${lastVoiceReceipt.audio.channelCount || "unknown"} channel, valid=${lastVoiceReceipt.audioValid === true ? "true" : "false"}.`
      : "Audio facts are not recorded yet.";
    return {
      ...base,
      handled: true,
      intent: "voice-audio-turn-failure",
      answer: `${failureLine} ${audioLine} OpenAI audio was not used, cloud audio is off, and I do not store the mic audio.`,
      sourceLabels: ["Apex Realtime Voice Diagnostics", "Local Voice Runtime"],
      notice: "Apex explained the last local audio turn failure.",
    };
  }

  const earlyPersonalOsResponse = buildApexPersonalOsCommandResponse({
    command: question,
    coreState: summary.personalOsCore,
    voiceReadiness: summary.localVoiceReadiness,
  });
  const shouldPreferLocalSpeedAnswer = /\b(why are you slow|why were you slow|why so slow|why is voice slow|why is your voice slow|what is making you slow|speed issue|local speed|voice health|voice latency|latency check|how fast was that|how long did that take|where was the delay|where is the delay|check voice health|check your local speed|check your voice speed|make your voice faster)\b/i.test(normalized);
  if (!shouldPreferLocalSpeedAnswer && earlyPersonalOsResponse.handled && !["local-chat", "builder", "self-fix"].includes(earlyPersonalOsResponse.intent)) {
    return {
      ...base,
      handled: true,
      intent: earlyPersonalOsResponse.intent,
      answer: earlyPersonalOsResponse.answer,
      sourceLabels: earlyPersonalOsResponse.sourceLabels || ["Apex Personal OS", "Apex Operator"],
      shouldClearScreen: Boolean(earlyPersonalOsResponse.shouldClearScreen),
      shouldStopListening: Boolean(earlyPersonalOsResponse.shouldStopListening),
      shouldStartListening: Boolean(earlyPersonalOsResponse.shouldStartListening),
      notice: earlyPersonalOsResponse.notice || "Apex routed this through Personal OS.",
      personalOsRoute: {
        id: earlyPersonalOsResponse.routeId,
        category: earlyPersonalOsResponse.category,
        status: earlyPersonalOsResponse.routeStatus,
        canExecuteNow: false,
      },
    };
  }

  if (/\b(go quiet|quiet down|stand down|calm standby|be quiet)\b/i.test(normalized)) {
    return {
      ...base,
      handled: true,
      intent: "quiet-standby",
      shouldClearScreen: true,
      answer: "I’m going quiet. The screen is calm again, and I’ll only surface details when they matter.",
      notice: "Apex is in calm standby.",
    };
  }

  if (/\b(clear the screen|hide everything|clean screen|show me only if i need to see it|only show me if i need to see it|keep (it|the interface) minimal|minimal mode)\b/i.test(normalized)) {
    return {
      ...base,
      handled: true,
      intent: "clear-screen",
      shouldClearScreen: true,
      answer: "Screen cleared. I’ll keep this as a simple conversation surface and pull details forward only when you actually need them.",
      notice: "Apex Home is back to the minimal talk surface.",
    };
  }

  const isLocalCleanupRequest = /\b(clean up your local runtime|cleanup local runtime|clean local runtime|stop duplicate dev|clean up apex local|clean up local processes)\b/i.test(normalized);

  if (!isLocalCleanupRequest && /\b(are you ready locally|ready locally|local readiness|local runtime|is apex ready|are we ready locally|ready to work locally)\b/i.test(normalized)) {
    const local = summary.localReadiness;
    const readyText = local.overall === "ready"
      ? "Yes. Apex is ready locally."
      : local.overall === "partial"
        ? "Partially. Apex is open locally, but local intelligence still has a setup item."
        : "Apex Home is open, but I am still checking local intelligence.";
    const needsText = local.needs.length
      ? `What I still need: ${joinApexTalkList(local.needs)}.`
      : "I do not need OpenAI for normal Apex use.";
    const residentText = local.stableResidency?.stable4096Active
      ? `Stable residency is using ${local.stableResidency.residentLane} at ${local.stableResidency.residentNumCtx} context, so fast answers and normal coding do not flip contexts each turn.`
      : `Stable residency is using fallback ${local.stableResidency?.residentNumCtx || 2048} context because local VRAM or benchmark evidence says to stay lighter.`;
    const warmText = local.keepWarm?.enabled
      ? `The ${local.keepWarm.targetModel} brain is set to stay warm with bounded ${local.keepWarm.keepAlive} residency while Apex is open.`
      : "Brain keep-warm is off for this local session.";
    return {
      ...base,
      handled: true,
      intent: "local-readiness",
      answer: `${readyText} Ollama is ${local.providerStatus}. ${local.normalModel.model} is ${local.normalModel.status}; normal coding uses the same resident ${local.codingModel.model} context unless a request explicitly needs more; ${local.deepCodingModel.model} is ${local.deepCodingModel.status} for manual deep work. ${residentText} ${warmText} Cloud is disabled by default and OpenAI is not required for normal Apex. ${needsText}`,
      sourceLabels: ["Apex Local Operator Runtime v0", "Ollama", "Local Intelligence"],
      notice: "Apex summarized local runtime readiness.",
    };
  }

  if (/\b(are you using my gpu|using my gpu|use my gpu|gpu status|rtx|vram|local gpu)\b/i.test(normalized)) {
    const local = summary.localReadiness;
    const voice = summary.localVoiceReadiness || {};
    const brain = local.brain || {};
    const gpuText = local.gpu.available
      ? `Yes, I can see ${local.gpu.name || "your NVIDIA GPU"} with ${local.gpu.vramTotalMb || "unknown"} MB VRAM.`
      : "I cannot confirm the GPU from the current local status yet.";
    const modelText = local.modelProcessor.processor && local.modelProcessor.processor !== "unknown"
      ? `Latest model processor receipt says ${local.modelProcessor.processor}${local.modelProcessor.vramUsedMb ? ` with about ${local.modelProcessor.vramUsedMb} MB VRAM for ${local.modelProcessor.model || "the local model"}` : ""}.`
      : brain.processor && brain.processor !== "unknown"
        ? `Workstation Brain reports ${brain.processor}${brain.vramUsedMb ? ` with about ${brain.vramUsedMb} MB VRAM` : ""} in ${brain.activeMode} mode.`
        : "The next real local model turn will record whether Ollama used GPU, CPU, mixed, or unknown.";
    const sttText = voice.sttProcessor
      ? `Local STT is ${voice.sttEngine || voice.sttStatus} on ${voice.sttProcessor}${voice.sttGpuCapable ? " and is GPU-capable" : ""}.`
      : "Local STT processor status is still unknown.";
    return {
      ...base,
      handled: true,
      intent: "local-gpu-status",
      answer: `${gpuText} ${modelText} ${sttText} OpenAI and cloud audio are not part of the normal local path.`,
      sourceLabels: ["Apex GPU Voice + Speed Core", "Ollama", "Local Voice Runtime"],
      notice: "Apex summarized local GPU and processor status.",
    };
  }

  if (/\b(why are you slow|why were you slow|why so slow|why is voice slow|why is your voice slow|what is making you slow|speed issue|local speed|voice health|voice latency|latency check|how fast was that|how long did that take|where was the delay|where is the delay|check voice health|check your local speed|check your voice speed|make your voice faster)\b/i.test(normalized)) {
    const local = summary.localReadiness;
    const voice = summary.localVoiceReadiness || {};
    const receiptLine = lastVoiceReceipt ? summarizeApexVoiceTurnSpeed(lastVoiceReceipt) : "";
    const failureLine = lastVoiceReceipt?.failureReason ? ` Last voice issue: ${summarizeApexVoiceTurnFailure(lastVoiceReceipt)}` : "";
    const benchmark = local.benchmarkHistory || {};
    const benchmarkLine = benchmark.latestTotalDurationMs
      ? `Last local benchmark: ${benchmark.latestLane || "lane"} on ${benchmark.latestModel || APEX_LOCAL_TALK_MODEL} at ctx ${benchmark.latestNumCtx || "unknown"} took ${Math.round(benchmark.latestTotalDurationMs)} ms; average total is ${Math.round(benchmark.averageTotalDurationMs || benchmark.latestTotalDurationMs)} ms.`
      : benchmark.summary || "No local benchmark history yet; I will not run benchmarks unless you ask.";
    const stableLine = local.stableResidency?.residentNumCtx
      ? `${APEX_LOCAL_TALK_MODEL} resident context is ${local.stableResidency.residentLane} at ${local.stableResidency.residentNumCtx}; fast mode is kept fast by shorter prompts/output caps instead of flipping between 2048 and 4096. ${local.stableResidency.lastBenchmarkSummary || ""}`.trim()
      : "Stable residency has not reported a resident context yet.";
    const warmLine = local.keepWarm?.enabled
      ? `The main ${local.keepWarm.targetModel} brain is kept warm with bounded ${local.keepWarm.keepAlive}; 30B is not warmed.`
      : "Brain keep-warm is off right now, so the first answer can feel slower.";
    const issues = [
      !local.gpu.available ? "GPU status is not confirmed" : "",
      local.modelProcessor.processor === "cpu" ? "the latest model receipt shows CPU inference" : "",
      local.modelProcessor.processor === "mixed" ? "the latest model receipt shows mixed CPU/GPU inference" : "",
      !local.normalModel.ready ? `${local.normalModel.model} is not ready` : "",
      voice.usingWindowsVoiceFallback ? "speech is using Windows SAPI fallback instead of the locked lightweight voice" : "",
      voice.sttProcessor === "cpu" ? "STT is on CPU fallback" : "",
      voice.sttStatus !== "local-ready" ? "GPU Whisper STT is not configured yet" : "",
    ].filter(Boolean);
    return {
      ...base,
      handled: true,
      intent: "local-speed-check",
      answer: [
        receiptLine || "I do not have a per-turn voice timing receipt yet.",
        benchmarkLine,
        issues.length
          ? `Current speed limits I see: ${joinApexTalkList(issues)}.`
          : "Current local voice and model status looks healthy.",
        stableLine,
        `${APEX_LOCAL_DEEP_CODING_MODEL} stays manual-only for explicit deep work and is not kept warm.`,
        warmLine,
        "For this speed pass I keep normal Apex light, keep 30B out of always-warm mode, and report the slowest local step without adding cloud audio.",
        failureLine,
      ].filter(Boolean).join(" "),
      sourceLabels: ["Apex Realtime Voice Diagnostics", "Apex GPU Voice + Speed Core", "Local Runtime"],
      notice: "Apex summarized local speed bottlenecks.",
    };
  }

  const brainCommand = inferApexWorkstationBrainCommand(question);
  if (brainCommand.status === "detected" && ["status", "gpu-status"].includes(brainCommand.action)) {
    const local = summary.localReadiness;
    const brainAnswer = buildApexWorkstationBrainCommandAnswer({
      command: brainCommand,
      brainStatus: {
        provider: "apex-workstation-brain",
        ...local.brain,
      },
    });
    return {
      ...base,
      handled: true,
      intent: brainAnswer.intent,
      answer: `${brainAnswer.answer} Readiness: ${APEX_LOCAL_TALK_MODEL} is ${local.normalModel.status}; normal coding is ${local.codingModel.status}; ${APEX_LOCAL_DEEP_CODING_MODEL} is ${local.deepCodingModel.status}.`,
      sourceLabels: brainAnswer.sourceLabels,
      notice: "Apex summarized workstation brain status.",
    };
  }

  if (brainCommand.status !== "detected" && /\b(what model are you using|what model is running|fast brain|deep brain|fast mode|deep mode)\b/i.test(normalized)) {
    const local = summary.localReadiness;
    const modeLine = `Apex uses ${APEX_LOCAL_TALK_MODEL} as the stable resident brain at ${local.stableResidency.residentNumCtx || 4096} context when local VRAM is healthy; fast answers use shorter caps, and normal coding uses that same resident context unless a request explicitly needs more. Optional fast coder can use ${APEX_LOCAL_FAST_CODER_MODEL} only after it is installed and measured. Deep coding uses ${APEX_LOCAL_DEEP_CODING_MODEL} at 4096-8192 only when John explicitly asks, and 30B is not kept warm by default.`;
    const warmLine = local.keepWarm?.enabled ? `The active local session keeps ${local.keepWarm.targetModel} warm for ${local.keepWarm.keepAlive}.` : "Keep-warm is off for this session.";
    return {
      ...base,
      handled: true,
      intent: "local-model-mode",
      answer: `${modeLine} ${warmLine} Current readiness: ${APEX_LOCAL_TALK_MODEL} is ${local.normalModel.status}; normal coding is ${local.codingModel.status}; ${APEX_LOCAL_DEEP_CODING_MODEL} is ${local.deepCodingModel.status}. OpenAI stays disabled unless John explicitly requests cloud and server policy allows it.`,
      sourceLabels: ["Apex Workstation Brain Mode", "Ollama"],
      notice: "Apex summarized model routing.",
    };
  }

  if (isLocalCleanupRequest) {
    return {
      ...base,
      handled: true,
      intent: "local-runtime-cleanup",
      answer: "I added cleanup to the Windows launcher path. `npm.cmd run apex:local` now checks Apex-owned duplicate dev server/client/watch processes and leftover Playwright headless QA shells, reuses healthy local servers, and avoids touching normal browser windows or unrelated apps. From this conversation surface I keep it safe and report the cleanup receipt instead of killing arbitrary processes.",
      sourceLabels: ["Apex Local Operator Runtime", "GPU Voice + Speed Core"],
      notice: "Apex summarized local runtime cleanup behavior.",
    };
  }

  if (/\b(what do you need to work tonight|what do you need tonight|what do you need to work locally|what do you need from me tonight|what is needed tonight)\b/i.test(normalized)) {
    const local = summary.localReadiness;
    const needs = local.needs.length
      ? local.needs
      : ["keep this local server/client running", "keep Ollama running", "type one test request in Apex Home"];
    return {
      ...base,
      handled: true,
      intent: "local-tonight-needs",
      answer: `For tonight I need this local app open, Ollama running, and ${local.normalModel.model} ready for normal conversation plus normal coding. Current status: ${local.normalModel.model} is ${local.normalModel.status}; normal coding is ${local.codingModel.status}; ${local.deepCodingModel.model} is ${local.deepCodingModel.status} and stays manual-only. Next: ${joinApexTalkList(needs)}. Local Voice Runtime v2 reports the local STT/TTS truth now; typed Apex stays reliable whenever a local voice engine is missing.`,
      sourceLabels: ["Apex Local Operator Runtime v0", "Ollama", "Local Voice Runtime Plan"],
      notice: "Apex summarized what is needed for local work tonight.",
    };
  }

  if (/\b(what changed|what's changed|what did we change|what did you change|show what changed|local changes|changed files|dirty files)\b/i.test(normalized)) {
    const changed = joinApexTalkList(summary.changedLines, "nothing new has changed in this Apex Home session yet");
    return {
      ...base,
      handled: true,
      intent: "what-changed",
      answer: `Here’s what changed: ${changed}. I’m keeping the feed tucked away unless you ask for detail.`,
      notice: "Apex summarized What Changed without opening a dashboard panel.",
    };
  }

  if (/\b(what are you working on|what are you doing|what builder is doing|what are the agents doing|show me what builder is doing)\b/i.test(normalized)) {
    const builder = joinApexTalkList(summary.builderLines, "Builder is standing by for private local app work");
    const agentText = summary.agentSignalCount
      ? `${summary.agentSignalCount} agent signal${summary.agentSignalCount === 1 ? "" : "s"} are visible`
      : "no active agent signals need the main screen";
    const runText = summary.activeRunCount
      ? `${summary.activeRunCount} private run${summary.activeRunCount === 1 ? "" : "s"} are active`
      : "no private run is actively taking over the surface";
    return {
      ...base,
      handled: true,
      intent: "working-on",
      answer: `Right now I’m watching Builder, Apex HQ routing, memory/tasks, local intelligence, and recent receipts. ${builder}. ${runText}, and ${agentText}.`,
      notice: "Apex summarized active work conversationally.",
    };
  }

  if (/\b(what did you just do|what did you do|what have you done|what apex did|show what apex did|what did apex do|recent fixes|fix receipts)\b/i.test(normalized)) {
    const receipts = joinApexTalkList(summary.receiptLines.length ? summary.receiptLines : summary.changedLines, "I have not recorded a new local action receipt in this session yet");
    return {
      ...base,
      handled: true,
      intent: "what-apex-did",
      answer: `Here’s what I just did or tracked: ${receipts}. Consequential actions stayed gated.`,
      notice: "Apex summarized recent receipts.",
    };
  }

  if (/\b(show the patch|show patch|pull up patch preview|patch preview|before after patch|what patch|show the diff|exact patch)\b/i.test(normalized)) {
    const patchLines = formatApexTalkList(builderMode?.patchPreviewRows || [], 3);
    return {
      ...base,
      handled: true,
      intent: "patch-preview",
      answer: patchLines.length
        ? `The latest patch preview is: ${joinApexTalkList(patchLines)}. I’m keeping it as a conversation result instead of pinning another panel to the home screen.`
        : "I don’t have a current patch preview loaded. Ask me to run a controlled local fix and I’ll show the exact before/after when there is one.",
      notice: "Apex summarized patch preview state.",
    };
  }

  if (/\b(undo state|local undo|undo available|revert your local patch|undo apex patch|undo the patch)\b/i.test(normalized)) {
    const undoLines = formatApexTalkList(undoReceipts.length ? undoReceipts : builderMode?.recentUndoRows || [], 3);
    const latest = builderMode?.latestSuccessfulFix?.undoHint;
    return {
      ...base,
      handled: true,
      intent: "undo-state",
      answer: undoLines.length
        ? `Local undo state: ${joinApexTalkList(undoLines)}.`
        : latest
          ? `Local undo is available for my last successful scoped patch. ${safeReceiptText(latest, 180)}`
          : "There is no Apex-owned successful patch currently marked undoable. I won’t use git reset, checkout, deletion, or broad rollback.",
      notice: "Apex summarized local undo state.",
    };
  }

  if (/\b(use builder|work on the app|work the app|build the app|check the app|inspect the app|builder status|builder mode)\b/i.test(normalized)) {
    const builder = joinApexTalkList(summary.builderLines, "Builder is ready for private local app work");
    return {
      ...base,
      handled: true,
      intent: "builder-work",
      answer: `I’m routing that to Builder internally. ${builder}. I can inspect, track, run safe local checks, and handle small reversible fixes while deploy, production, schema/auth/session, deletion, sends, spend, orders, and customer-visible changes stay stopped.`,
      notice: "Apex routed the request to Builder without opening a permanent panel.",
    };
  }

  return base;
}

export function deriveApexControlRoomState({
  user = null,
  permissions = {},
  stats = {},
  leads = [],
  jobs = [],
  customers = [],
  estimates = [],
  proposals = [],
  opportunitySearchProfiles = [],
  dailyReports = [],
  uploads = [],
  deliveryTickets = [],
  safetyIncidents = [],
  prePourChecklists = [],
  postPourChecklists = [],
  queueItems = [],
  auditEvents = [],
  activity = [],
  companySettings = {},
  workflowRows = [],
} = {}) {
  const canView = permissions?.apexOs?.canView === true;
  const recentEvidence = latestAuditRows(auditEvents);
  const agentTaskOptions = deriveAgentOsInternalTaskOptions({
    leads,
    opportunitySearchProfiles,
    estimates,
    jobs,
    dailyReports,
    uploads,
    deliveryTickets,
    safetyIncidents,
    prePourChecklists,
    postPourChecklists,
    workflowRows,
  });
  const availableAgentTasks = agentTaskOptions.filter((option) => !option.disabled).length;
  const agentRunRows = deriveAgentOsRunLedgerRows(auditEvents, { limit: 4 });
  const agentWorkQueue = buildAgentWorkQueue(agentTaskOptions, agentRunRows, permissions);
  const launchState = buildLaunchState(permissions);
  const trustState = buildTrustState({ permissions, auditEvents, activity, companySettings });
  const buildAwareness = buildBuildAwarenessState(companySettings);
  const releaseDesk = buildReleaseDesk({ buildAwareness });
  const apexActivity = buildApexActivityState({ auditEvents });
  const decisionMemory = buildDecisionMemoryState(companySettings);
  const memorySuggestions = buildMemorySuggestionReviewState(companySettings);
  const knowledgeVault = buildKnowledgeVaultState(companySettings);
  const personalOperatingLayer = buildPersonalOperatingLayerState(decisionMemory, companySettings);
  const liveOperatorMemory = buildLiveOperatorMemoryState(companySettings);
  const askApexChat = buildAskApexChatState({ decisionMemory, knowledgeVault, agentWorkQueue, launchState, releaseDesk });
  const voiceInterface = buildVoiceInterfaceState({ askApexChat });
  const approvalCommandCenter = buildApprovalCommandCenterState({ releaseDesk, askApexChat, voiceInterface, companySettings });
  const executionHandoffs = buildExecutionHandoffState({ agentWorkQueue, approvalCommandCenter, companySettings });
  const agentControlPlane = buildApexOsAgentControlPlane({
    agentTaskOptions,
    agentRunRows,
    executionHandoffs: companySettings?.apexOsExecutionHandoffs || [],
    agentControlRequests: companySettings?.apexOsAgentControlRequests || [],
  });
  const releaseMonitoring = buildReleaseMonitoringState({
    releaseDesk,
    launchState,
    trustState,
    agentWorkQueue,
    agentControlPlane,
    buildAwareness,
    companySettings,
    recentEvidence,
  });
  const businessCommandCenter = buildBusinessCommandCenterState({
    launchState,
    decisionMemory,
    knowledgeVault,
    approvalCommandCenter,
    executionHandoffs,
    releaseMonitoring,
  });
  const autonomyRunCenter = buildAutonomyRunCenterState({
    agentWorkQueue,
    agentControlPlane,
    executionHandoffs,
    approvalCommandCenter,
    releaseDesk,
    decisionMemory,
    businessCommandCenter,
    companySettings,
  });
  const liveOperatorMode = buildApexLiveOperatorModeState({
    autonomyRunCenter,
    voiceInterface,
    askApexChat,
    agentControlPlane,
    executionHandoffs,
    releaseMonitoring,
    decisionMemory,
    approvalCommandCenter,
    releaseDesk,
    businessCommandCenter,
    liveOperatorMemory,
  });
  const phase3Aggregator = buildPhase3AggregatorState({
    companySettings,
    auditEvents,
    launchState,
    agentWorkQueue,
    approvalCommandCenter,
    releaseMonitoring,
    businessCommandCenter,
  });
  const qaSecurityHardening = buildQaSecurityHardeningState({
    buildAwareness,
    decisionMemory,
    knowledgeVault,
    askApexChat,
    voiceInterface,
    approvalCommandCenter,
    releaseDesk,
    releaseMonitoring,
    businessCommandCenter,
    agentWorkQueue,
    launchState,
  });
  const finishedApexOs = buildFinishedApexOsState({
    decisionMemory,
    knowledgeVault,
    askApexChat,
    voiceInterface,
    approvalCommandCenter,
    buildAwareness,
    executionHandoffs,
    agentControlPlane,
    releaseMonitoring,
    businessCommandCenter,
    qaSecurityHardening,
    releaseDesk,
    agentWorkQueue,
    launchState,
  });
  const trustTone = trustState.overallStatus === "ready" ? "green" : trustState.overallStatus === "limited" ? "slate" : "amber";
  const summary = "Private Apex HQ operating center.";
  const kpis = buildPhase2Kpis({ releaseDesk, agentWorkQueue, launchState, approvalCommandCenter, buildAwareness });
  const commandBoardPanels = buildPhase2CommandBoard({
    summary,
    launchState,
    agentWorkQueue,
    approvalCommandCenter,
    decisionMemory,
  });
  const apexHqDomain = buildApexHqDomainBridgeState({
    leads,
    jobs,
    customers,
    estimates,
    proposals,
    dailyReports,
    uploads,
    buildAwareness,
    personalOperatingLayer,
  });
  const apexBuilderMode = buildApexBuilderModeState({
    buildAwareness,
    autonomyRunCenter,
    executionHandoffs,
    agentControlPlane,
    apexActivity,
  });
  const apexWhatChangedFeed = buildApexWhatChangedFeedState({
    state: {
      apexActivity,
      apexHqDomain,
      askApexChat,
    },
    builderMode: apexBuilderMode,
  });
  const apexPersonalOsCore = buildApexPersonalOsCoreState({
    voiceReadiness: buildApexPersonalOsLocalVoiceReadiness(),
  });

  if (!canView) {
    return {
      canView: false,
      operatorName: user?.name || "Restricted user",
      summary: "Apex OS is private operator-only workspace.",
      kpis: [],
      commandBoardPanels: [],
      priorities: [],
      operatingSignals: [],
      nextBestActions: [],
      agents: [],
      launchReadiness: { status: "Restricted", tone: "slate", gates: [] },
      releaseDesk: { status: "Restricted", tone: "slate", sections: [], productionPreviewRows: [], readinessPacketRows: [], deployHistoryRows: [], deployApprovalFlowRows: [], canDeploy: false, deployApprovedFlowLocked: true, productionActionLocked: true },
      decisionMemory: { status: "Restricted", tone: "slate", decisions: [], rules: [] },
      memorySuggestions: { status: "Restricted", tone: "slate", suggestedCount: 0, approvedCount: 0, archivedCount: 0, totalCount: 0, sourceCount: 0, sourceOptions: [], rows: [], recentApprovedRows: [], summary: { total: 0, approvedCount: 0, suggestedCount: 0, archivedCount: 0, compactRows: [], pendingSuggestions: [], summaryText: "Apex OS memory suggestions are operator-only." } },
      personalOperatingLayer: { status: "Restricted", tone: "slate", preferenceRows: [], workStyleRows: [], communicationRows: [], dailyFocusRows: [], distractionRows: [], backgroundRows: [], checkInRows: [], privacyRows: [], reviewRows: [], preferenceEntries: [], taskReminderRows: [], taskReminderSummary: { openTaskCount: 0, openReminderCount: 0, activeCount: 0 } },
      liveOperatorMemory: { status: "Restricted", tone: "slate", totalCount: 0, trustedCount: 0, suggestedCount: 0, archivedCount: 0, turnCount: 0, runCount: 0, proactiveCheckInCount: 0, latestRows: [], reviewRows: [] },
      knowledgeVault: { status: "Restricted", tone: "slate", categories: [], safetyRows: [], sourceRows: [] },
      askApexChat: { status: "Restricted", tone: "slate", contexts: [], evidenceRows: [], actionLocks: [] },
      voiceInterface: { status: "Restricted", tone: "slate", modes: [], safetyRows: [] },
      approvalCommandCenter: { status: "Restricted", tone: "slate", queueRows: [], packetRows: [], controlRows: [], sourceRows: [] },
      apexActivity: { status: "Restricted", tone: "slate", loading: false, error: "", totalCount: 0, performedCount: 0, blockedCount: 0, escalatedCount: 0, rows: [], externalActionsLocked: true, summaryText: "Apex Activity is operator-only." },
      apexHqDomain: { status: "Restricted", tone: "slate", summary: "Apex HQ domain bridge is operator-only.", counts: {}, rows: [], commandRows: [], blockedRows: [] },
      apexBuilderMode: { status: "Restricted", tone: "slate", summary: "Apex Builder Mode is operator-only.", canRunLocalValidation: false, canCreateBuilderTasks: false, canApplyControlledLocalFixes: false, canUndoControlledLocalFixes: false, canEditFiles: false, canDeploy: false, canDeleteFiles: false, summaryRows: [], dirtyFileRows: [], builderTaskRows: [], recentFixRows: [], patchPreviewRows: [], recentUndoRows: [], recentValidationRows: [], actionRows: [], fixActionRows: [], activityRows: [], blockedRows: [] },
      apexWhatChangedFeed: { status: "Restricted", tone: "slate", entryCount: 0, entries: [], surfaceRows: [], summary: "Apex What Changed feed is operator-only." },
      apexPersonalOsCore: { status: "Restricted", tone: "slate", operatorOnly: true, fieldCustomerDemoVisible: false, routes: [], skillRows: [], agentRows: [], summary: "Apex Personal OS is operator-only." },
      buildAwareness: restrictedApexOsBuildAwarenessSnapshot(),
      executionHandoffs: { status: "Restricted", tone: "slate", sourceRows: [], handoffSummary: { total: 0, draft: 0, ready: 0, blocked: 0, archived: 0 } },
      agentControlPlane: { status: "Restricted", tone: "slate", rosterRows: [], requestRows: [], reportRows: [], handoffRows: [], safetyRows: [], requestSummary: { total: 0, active: 0, ready: 0, blocked: 0 } },
      releaseMonitoring: { status: "Restricted", tone: "slate", readinessRows: [], briefingRows: [], releasePacketRows: [], lockRows: [] },
      businessCommandCenter: { status: "Restricted", tone: "slate", queueRows: [], gateRows: [], launchRows: [], briefingRows: [], memoryRows: [], taskDraftRows: [], approvalDraftRows: [] },
      phase3Aggregator: { status: "Restricted", tone: "slate", rows: [] },
      qaSecurityHardening: { status: "Restricted", tone: "slate", evidenceRows: [], lockRows: [] },
      finishedApexOs: { status: "Restricted", tone: "slate", capabilityRows: [], runLoopRows: [], freezeRows: [], blockedActionRows: [] },
      agentWorkQueue: { status: "Restricted", tone: "slate", taskRows: [], lockedRows: [], runRows: [], safetyRows: [] },
      autonomyRunCenter: {
        status: "Restricted",
        tone: "slate",
        mode: "Restricted",
        planRows: [],
        routeRows: [],
        gateRows: [],
        runRows: [],
        runSummary: { total: 0, active: 0, planned: 0, drafting: 0, validating: 0, waitingApproval: 0, blocked: 0, done: 0, archived: 0 },
        latestRun: null,
        savedRunCount: 0,
        activeRunCount: 0,
        waitingApprovalRunCount: 0,
        doneRunCount: 0,
        canDraftInternalRuns: false,
        canExecuteExternalActions: false,
        executionLocked: true,
        externalActionsLocked: true,
      },
      liveOperatorMode: {
        status: "Restricted",
        tone: "slate",
        mode: "Restricted",
        detail: "Apex Live Operator Mode is operator-only.",
        foundationPercent: 0,
        jarvisBehaviorPercent: 0,
        readinessCount: 0,
        operatorLoopCount: 0,
        gapCount: 0,
        savedRunCount: 0,
        activeRunCount: 0,
        approvalQueueCount: 0,
        agentSignalCount: 0,
        externalActionsLocked: true,
        executionLocked: true,
        nextAction: "Operator access required.",
        readinessRows: [],
        operatorLoopRows: [],
        gapRows: [],
      },
      approvals: [],
      evidence: [],
    };
  }

  return {
    canView: true,
    operatorName: user?.name || "John Berlanga",
    summary,
    kpis,
    commandBoardPanels,
    priorities: withDerivedStateMetaList([
      {
        id: "private-shell",
        title: "Private shell",
        status: "Ready",
        detail: "Route, nav, and bootstrap access are the first Apex OS boundary.",
        tone: "green",
      },
      {
        id: "state-aggregator",
        title: "State aggregator",
        status: "Online",
        detail: "Apex OS is reading Agent OS, launch readiness, release safety, trust, queue, and audit signals.",
        tone: "green",
      },
      {
        id: "build-awareness",
        title: "Build awareness",
        status: buildAwareness.status,
        detail: `${buildAwareness.branch} at ${buildAwareness.headSha}; ${formatCount(buildAwareness.changedFileCount)} changed files are visible and consequential actions remain gated.`,
        tone: buildAwareness.tone,
      },
      {
        id: "provider-work",
        title: "Ask Apex chat",
        status: askApexChat.status,
        detail: `${askApexChat.contextCount} context lanes and ${askApexChat.evidenceCount} evidence sources feed the private source-backed answer endpoint.`,
        tone: askApexChat.tone,
      },
      {
        id: "decision-memory",
        title: "Decision memory",
        status: decisionMemory.status,
        detail: `${decisionMemory.decisionCount} saved decisions and ${decisionMemory.ruleCount} operating rules are visible from the Apex OS plan.`,
        tone: decisionMemory.tone,
      },
      {
        id: "personal-operating-layer",
        title: "Personal operating layer",
        status: personalOperatingLayer.status,
        detail: `${personalOperatingLayer.preferenceCount} preference rows, ${personalOperatingLayer.dailyFocusCount} daily focus rows, and ${personalOperatingLayer.privacyLockCount} privacy locks are mapped for John-only review.`,
        tone: personalOperatingLayer.tone,
      },
      {
        id: "agent-work-queue",
        title: "Agent work queue",
        status: agentWorkQueue.status,
        detail: `${agentWorkQueue.availableTaskCount} review-only task types and ${agentWorkQueue.visibleTargetCount} visible targets are ready for planning.`,
        tone: agentWorkQueue.tone,
      },
      {
        id: "knowledge-vault",
        title: "Knowledge vault",
        status: knowledgeVault.status,
        detail: `${knowledgeVault.categoryCount} private knowledge categories are available for text intake and review.`,
        tone: knowledgeVault.tone,
      },
      {
        id: "voice-interface",
        title: "Voice interface",
        status: voiceInterface.status,
        detail: `${voiceInterface.modeCount} voice modes are mapped; microphone and speech providers remain locked.`,
        tone: voiceInterface.tone,
      },
      {
        id: "approval-command-center",
        title: "Approval command center",
        status: approvalCommandCenter.status,
        detail: `${approvalCommandCenter.queueCount} approval categories, ${approvalCommandCenter.packetFieldCount} packet fields, and exact-phrase decision records are mapped before execution can exist.`,
        tone: approvalCommandCenter.tone,
      },
      {
        id: "execution-handoffs",
        title: "Agent handoff drafts",
        status: executionHandoffs.status,
        detail: `${executionHandoffs.handoffSummary.total} saved handoffs, ${executionHandoffs.handoffSummary.ready} ready, and ${executionHandoffs.handoffSummary.finished || 0} finished handoffs prepare agent work without queueing or running it.`,
        tone: executionHandoffs.tone,
      },
      {
        id: "agent-control-plane",
        title: "Agent control plane",
        status: agentControlPlane.status,
        detail: `${agentControlPlane.roleCount} agent roles, ${agentControlPlane.activeRequestCount} active control requests, and ${agentControlPlane.readyRequestCount} ready requests are visible without queue/run execution.`,
        tone: agentControlPlane.tone,
      },
      {
        id: "autonomy-run-center",
        title: "Autonomy run center",
        status: autonomyRunCenter.status,
        detail: `${autonomyRunCenter.planStepCount} run-plan steps, ${autonomyRunCenter.routeCount} route lanes, and ${autonomyRunCenter.gatedActionCount} approval-gated action classes are visible before execution.`,
        tone: autonomyRunCenter.tone,
      },
      {
        id: "live-operator-mode",
        title: "Live operator mode",
        status: liveOperatorMode.status,
        detail: `${liveOperatorMode.operatorLoopCount} live loop stages and ${liveOperatorMode.readinessCount} readiness systems move Apex toward live operator behavior while consequential actions remain gated.`,
        tone: liveOperatorMode.tone,
      },
      {
        id: "release-monitoring",
        title: "Release monitoring",
        status: releaseMonitoring.status,
        detail: `${releaseMonitoring.readinessCount} release/monitoring checks and ${releaseMonitoring.briefingCount} briefing rows are mapped without deploy/provider changes.`,
        tone: releaseMonitoring.tone,
      },
      {
        id: "business-command-center",
        title: "Business command center",
        status: businessCommandCenter.status,
        detail: `${businessCommandCenter.queueCount} business queues and ${businessCommandCenter.gateCount} manual-send/spend/billing gates are mapped.`,
        tone: businessCommandCenter.tone,
      },
      {
        id: "qa-security-hardening",
        title: "QA / security hardening",
        status: qaSecurityHardening.status,
        detail: `${qaSecurityHardening.evidenceCount} hardening evidence rows and ${qaSecurityHardening.lockCount} lock rows are ready for final verification.`,
        tone: qaSecurityHardening.tone,
      },
    ]),
    phase3Aggregator,
    apexActivity,
    operatingSignals: withDerivedStateMetaList([
      {
        id: "trust-readiness",
        title: "Trust readiness",
        status: trustState.overallStatus === "ready" ? "Ready" : trustState.overallStatus === "limited" ? "Limited" : "Review",
        detail: `${formatCount(trustState.stats?.readyChecks)} of ${formatCount(trustState.stats?.totalChecks)} trust checks ready; ${formatCount(trustState.stats?.auditEvents)} audit rows visible.`,
        tone: trustTone,
      },
      {
        id: "launch-readiness",
        title: "Launch readiness",
        status: launchState.status,
        detail: `${launchState.readyCount} of ${launchState.totalCount} launch gates ready; public launch and production actions remain locked.`,
        tone: launchState.tone,
      },
      {
        id: "agent-tasks",
        title: "Agent work queue",
        status: permissions?.aiOffice?.canView ? `${availableAgentTasks} available` : "Package locked",
        detail: permissions?.aiOffice?.canView
          ? `${agentTaskOptions.length} review-only draft actions checked against ${agentWorkQueue.visibleTargetCount} visible targets.`
          : "AI Office entitlement is not active for this workspace.",
        tone: permissions?.aiOffice?.canView ? (availableAgentTasks ? "green" : "slate") : "slate",
      },
      {
        id: "release-safety",
        title: "Release safety",
        status: releaseDesk.status,
        detail: "Deploy remains a manual, approval-gated path with backup, restore, tests, build, and rollback evidence.",
        tone: releaseDesk.tone,
      },
      {
        id: "decision-memory",
        title: "Decision memory",
        status: decisionMemory.status,
        detail: `${decisionMemory.lockedCount} locked rules protect access, approvals, secrets, and field boundaries.`,
        tone: decisionMemory.tone,
      },
      {
        id: "personal-operating-layer",
        title: "Personal operating layer",
        status: personalOperatingLayer.status,
        detail: `${personalOperatingLayer.workStyleCount} work-style rows, ${personalOperatingLayer.communicationCount} communication rows, and ${personalOperatingLayer.checkInCount} check-in rules guide how Apex works without hidden tracking.`,
        tone: personalOperatingLayer.tone,
      },
      {
        id: "knowledge-vault",
        title: "Knowledge vault",
        status: knowledgeVault.status,
        detail: `${knowledgeVault.sourceCount} source candidates are visible; trusted context still requires manual approval.`,
        tone: knowledgeVault.tone,
      },
      {
        id: "ask-apex-chat",
        title: "Ask Apex chat",
        status: askApexChat.status,
        detail: `${askApexChat.contextCount} contexts are visible; ${askApexChat.providerStatus.toLowerCase()} keeps provider secrets off the frontend.`,
        tone: askApexChat.tone,
      },
      {
        id: "voice-interface",
        title: "Voice interface",
        status: voiceInterface.status,
        detail: `${voiceInterface.safetyCount} voice safety gates are visible; microphone capture stays visible and closed manually while typed answers remain available.`,
        tone: voiceInterface.tone,
      },
      {
        id: "approval-command-center",
        title: "Approval command center",
        status: approvalCommandCenter.status,
        detail: `${approvalCommandCenter.controlLockCount} controls are visible; approve/reject/defer record review decisions while execute remains locked.`,
        tone: approvalCommandCenter.tone,
      },
      {
        id: "execution-handoffs",
        title: "Agent handoff drafts",
        status: executionHandoffs.status,
        detail: `${executionHandoffs.handoffSummary.total} saved handoffs, ${executionHandoffs.handoffSummary.finished || 0} finished, and ${executionHandoffs.sourceCount} source rows connect approval packets and Agent Work Queue context without calling queue/run APIs.`,
        tone: executionHandoffs.tone,
      },
      {
        id: "agent-control-plane",
        title: "Agent control plane",
        status: agentControlPlane.status,
        detail: `${agentControlPlane.requestSummary.total} control requests, ${agentControlPlane.rosterRows.length} agent roster rows, and ${agentControlPlane.reportRows.length} report history rows are available.`,
        tone: agentControlPlane.tone,
      },
      {
        id: "autonomy-run-center",
        title: "Autonomy run center",
        status: autonomyRunCenter.status,
        detail: `${autonomyRunCenter.mode}: Apex can plan, route, draft internal work, validate evidence, and stop at approval gates. External actions remain gated.`,
        tone: autonomyRunCenter.tone,
      },
      {
        id: "live-operator-mode",
        title: "Live operator mode",
        status: liveOperatorMode.status,
        detail: `${liveOperatorMode.foundationPercent}% command foundation, ${liveOperatorMode.jarvisBehaviorPercent}% live operator behavior, ${liveOperatorMode.savedRunCount} saved runs, and ${liveOperatorMode.gapCount} controlled gaps are visible.`,
        tone: liveOperatorMode.tone,
      },
      {
        id: "release-monitoring",
        title: "Release monitoring",
        status: releaseMonitoring.status,
        detail: `${releaseMonitoring.packetCount} release packet rows and ${releaseMonitoring.lockCount} monitoring locks are visible.`,
        tone: releaseMonitoring.tone,
      },
      {
        id: "business-command-center",
        title: "Business command center",
        status: businessCommandCenter.status,
        detail: `${businessCommandCenter.launchCount} launch/founder-demo rows and ${businessCommandCenter.briefingCount} business briefing rows are visible.`,
        tone: businessCommandCenter.tone,
      },
      {
        id: "qa-security-hardening",
        title: "QA / security hardening",
        status: qaSecurityHardening.status,
        detail: `${qaSecurityHardening.evidenceCount} access, privacy, source, approval, visual, build, secret, and bypass checks are mapped.`,
        tone: qaSecurityHardening.tone,
      },
    ]),
    nextBestActions: withDerivedStateMetaList([
      {
        id: "launch-blocker",
        title: launchState.highestPriority?.label || "Launch readiness",
        status: launchState.highestPriority?.status || "Blocked",
        detail: launchState.highestPriority?.blockers?.[0] || launchState.highestPriority?.detail || "Resolve launch evidence before broader rollout.",
        tone: launchState.highestPriority?.tone || "amber",
      },
      {
        id: "agent-os-review",
        title: "Agent OS review",
        status: permissions?.aiOffice?.canView ? "Review" : "Locked",
        detail: availableAgentTasks
          ? `Review ${availableAgentTasks} draft-only task types before any future execution surface.`
          : "Keep agent work read-only until visible targets and approval rules are confirmed.",
        tone: availableAgentTasks ? "blue" : "slate",
      },
      {
        id: "release-approval",
        title: "Release approval",
        status: "Approval required",
        detail: "Keep deploy, provider setup, schema/auth/session changes, production data, sends, payments, ads, and deletion behind owner approval.",
        tone: "amber",
      },
      {
        id: "trust-review",
        title: "Trust review",
        status: trustState.overallStatus === "ready" ? "Ready" : "Review",
        detail: trustState.nextActions?.[0] || "Keep trust evidence scoped to guided pilot language until formal launch approval.",
        tone: trustTone,
      },
      {
        id: "memory-review",
        title: "Memory review",
        status: decisionMemory.durableCount ? "Durable" : "Ready",
        detail: "Use the What did I decide view to draft source-backed memory, then manually approve or archive it before it becomes operating context.",
        tone: decisionMemory.durableCount ? "green" : "blue",
      },
      {
        id: "personal-operating-layer-plan",
        title: "Personal operating layer",
        status: personalOperatingLayer.status,
        detail: "Review work style, communication, daily focus, distraction, background, and check-in rules before treating preferences as operating guidance.",
        tone: personalOperatingLayer.tone,
      },
      {
        id: "knowledge-vault-plan",
        title: "Knowledge vault plan",
        status: "Ready",
        detail: "Use these categories to decide what Apex can learn before approving any real upload/storage/provider work.",
        tone: "blue",
      },
      {
        id: "ask-apex-chat-plan",
        title: "Ask Apex chat plan",
        status: "Ready",
        detail: "Review the chat context lanes, source evidence, and locked actions before approving any real model/provider integration.",
        tone: "blue",
      },
      {
        id: "voice-interface-plan",
        title: "Voice interface plan",
        status: "Ready",
        detail: "Review open voice, transcript confirmation, spoken-answer locks, and privacy gates before approving speech provider work.",
        tone: "blue",
      },
      {
        id: "approval-command-center-plan",
        title: "Approval command center plan",
        status: "Ready",
        detail: "Use approval packets to review risky work before adding any durable approval, audit, or execution layer.",
        tone: "blue",
      },
      {
        id: "agent-control-plane-plan",
        title: "Agent control plane",
        status: agentControlPlane.status,
        detail: "Use pause, resume, and scoped-run requests to assign agent work explicitly while queueing, running, deploys, sends, spend, billing, and deletion stay locked.",
        tone: agentControlPlane.tone,
      },
      {
        id: "release-monitoring-plan",
        title: "Release monitoring plan",
        status: "Ready",
        detail: "Use the release/monitoring briefing to review build, launch, rollback, stalled-agent, and owner-action alerts before any provider or deploy work.",
        tone: "blue",
      },
      {
        id: "business-command-center-plan",
        title: "Business command center plan",
        status: "Ready",
        detail: "Review launch, demo, marketing, sales, customer success, and revenue queues before any send, spend, billing, or publishing layer.",
        tone: "blue",
      },
      {
        id: "qa-security-hardening-plan",
        title: "QA / security hardening",
        status: "Ready",
        detail: "Run focused tests, full permission/routing suite, build, visual QA, direct-route blocking, and docs drift checks before completion is claimed.",
        tone: "green",
      },
    ]),
    agents: withDerivedStateMetaList([
      {
        id: "agent-os",
        title: "Agent OS",
        status: permissions?.aiOffice?.canView ? "Available" : "Package locked",
        detail: permissions?.aiOffice?.canView
          ? `${availableAgentTasks} draft-only task types available; ${agentRunRows.length} recent run rows visible.`
          : "AI Office entitlement is not active for this workspace.",
        tone: permissions?.aiOffice?.canView ? (availableAgentTasks ? "green" : "blue") : "slate",
      },
      {
        id: "release-desk",
        title: "Release desk",
        status: releaseDesk.status,
        detail: "Deploys stay locked until validation, exact file staging, backup/restore evidence, and owner approval.",
        tone: "amber",
      },
      {
        id: "knowledge-vault",
        title: "Knowledge vault",
        status: knowledgeVault.status,
        detail: `${knowledgeVault.categoryCount} categories are mapped for private upload intake, search, and manual review.`,
        tone: knowledgeVault.tone,
      },
      {
        id: "ask-apex-chat",
        title: "Ask Apex chat",
        status: askApexChat.status,
        detail: `${askApexChat.contextCount} source lanes are ready for private answers; chat actions still cannot write, send, deploy, or execute.`,
        tone: askApexChat.tone,
      },
      {
        id: "voice-interface",
        title: "Voice interface",
        status: voiceInterface.status,
        detail: `${voiceInterface.modeCount} voice modes are mapped. Voice remains visible and never executes external actions by itself.`,
        tone: voiceInterface.tone,
      },
      {
        id: "approval-command-center",
        title: "Approval command center",
        status: approvalCommandCenter.status,
        detail: `${approvalCommandCenter.queueCount} risky-action categories have packet requirements; approve/reject/defer record review decisions while live execution remains separately gated.`,
        tone: approvalCommandCenter.tone,
      },
      {
        id: "execution-handoffs",
        title: "Agent handoff drafts",
        status: executionHandoffs.status,
        detail: `${executionHandoffs.handoffSummary.total} durable handoffs can prepare scoped agent instructions, validation results, result reports, and suggested memory; queueing and running remain locked.`,
        tone: executionHandoffs.tone,
      },
      {
        id: "agent-control-plane",
        title: "Agent control plane",
        status: agentControlPlane.status,
        detail: `${agentControlPlane.rosterRows.length} agent roles show status, current task, last update, next action, report history, and safe handoff context.`,
        tone: agentControlPlane.tone,
      },
      {
        id: "autonomy-run-center",
        title: "Autonomy run center",
        status: autonomyRunCenter.status,
        detail: `${autonomyRunCenter.planStepCount} steps turn a request into a routed, validated, approval-gated run plan without external execution.`,
        tone: autonomyRunCenter.tone,
      },
      {
        id: "live-operator-mode",
        title: "Live operator mode",
        status: liveOperatorMode.status,
        detail: liveOperatorMode.detail,
        tone: liveOperatorMode.tone,
      },
      {
        id: "release-monitoring",
        title: "Release monitoring",
        status: releaseMonitoring.status,
        detail: `${releaseMonitoring.briefingCount} daily briefing rows are ready; deploys and production monitoring changes remain approval-locked.`,
        tone: releaseMonitoring.tone,
      },
      {
        id: "business-command-center",
        title: "Business command center",
        status: businessCommandCenter.status,
        detail: `${businessCommandCenter.queueCount} business queues are mapped; sends, spend, billing, and publishing remain approval-locked.`,
        tone: businessCommandCenter.tone,
      },
      {
        id: "qa-security-hardening",
        title: "QA / security hardening",
        status: qaSecurityHardening.status,
        detail: `${qaSecurityHardening.evidenceCount} hardening rows and ${qaSecurityHardening.lockCount} action locks summarize final completion proof.`,
        tone: qaSecurityHardening.tone,
      },
    ], { sourceLabel: "Apex OS agent/release state", source: "deriveApexControlRoomState", confidence: 82 }),
    launchReadiness: {
      status: launchState.status,
      tone: launchState.tone,
      readyCount: launchState.readyCount,
      blockedCount: launchState.blockedCount,
      totalCount: launchState.totalCount,
      gates: launchState.gates.slice(0, 4).map((item) => ({
        id: item.id,
        title: item.label,
        status: item.status,
        detail: item.blockers?.[0] || item.detail,
        tone: item.tone || toneForStatus(item.status),
        sourceLabel: "Launch readiness gate",
        source: "deriveLaunchReadinessEvidenceState",
        confidence: 88,
        readOnly: true,
      })),
    },
    releaseDesk,
    decisionMemory,
    memorySuggestions,
    personalOperatingLayer,
    liveOperatorMemory,
    knowledgeVault,
    askApexChat,
    voiceInterface,
    approvalCommandCenter,
    apexHqDomain,
    apexBuilderMode,
    apexWhatChangedFeed,
    apexPersonalOsCore,
    buildAwareness,
    executionHandoffs,
    agentControlPlane,
    releaseMonitoring,
    businessCommandCenter,
    autonomyRunCenter,
    liveOperatorMode,
    qaSecurityHardening,
    finishedApexOs,
    agentWorkQueue,
    approvals: APEX_CONTROL_ROOM_APPROVAL_GATES.map((label) => ({
      id: label.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      label,
      status: "Owner approval required",
      tone: "amber",
    })),
    evidence: recentEvidence,
  };
}
