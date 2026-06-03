import { deriveAgentOsInternalTaskOptions, deriveAgentOsRunLedgerRows } from "./agent-os-ui-utils.js";
import { deriveLaunchReadinessEvidenceState } from "./launch-readiness-utils.js";
import { deriveEnterpriseTrustReadinessState } from "./owner-health-utils.js";
import { getReleaseSafetySections } from "./release-safety-utils.js";
import {
  filterApexOsKnowledgeVault,
  filterApexOsDecisionMemory,
  normalizeApexOsMemory,
  summarizeApexOsDecisionMemory,
  summarizeApexOsKnowledgeVault,
  summarizeApexOsMemory,
} from "../shared/apexOsMemory.js";
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

function buildReleaseDesk() {
  const sections = getReleaseSafetySections();
  const preDeploy = sections.find((section) => section.id === "preDeploy");
  const rollback = sections.find((section) => section.id === "rollback");
  const dangerous = sections.find((section) => section.id === "dangerous");
  return {
    status: "Manual release only",
    tone: "amber",
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
    detail: "Public launch, guided demo, pricing, claims, support, provider readiness, and production release gates stay review-first.",
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
    detail: "Onboarding, support, check-ins, retention, testimonials, referrals, and pilot learning stay review-first.",
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
    title: "Execute approved action",
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
    status: "Draft packet",
    detail: "Ask Apex can draft a review-only task packet; it cannot queue, run, or assign agent work.",
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
    id: "push-to-talk",
    title: "Push-to-talk",
    status: "Transcript only",
    detail: "The first voice path is manual transcript confirmation; browser microphone capture and always-listening remain disabled.",
    tone: "blue",
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
    status: "Provider locked",
    detail: "Text-to-speech waits for approved speech provider/API setup and privacy review.",
    tone: "amber",
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
    title: "No microphone access",
    status: "Locked",
    detail: "This first UI does not request browser microphone permission or capture audio.",
    tone: "amber",
  },
  {
    id: "no-always-listening",
    title: "No always-listening mode",
    status: "Locked",
    detail: "Always-listening would need separate privacy review, consent, visible controls, and explicit approval.",
    tone: "amber",
  },
  {
    id: "no-speech-provider",
    title: "No speech provider",
    status: "Approval required",
    detail: "Speech-to-text, text-to-speech, model voice, provider secrets, and external audio APIs are not configured in this slice.",
    tone: "amber",
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

function buildKnowledgeVaultState(companySettings = {}) {
  const categories = APEX_OS_KNOWLEDGE_VAULT_CATEGORIES.map((item) => ({ ...item }));
  const safetyRows = APEX_OS_KNOWLEDGE_VAULT_SAFETY_RULES.map((item) => ({ ...item }));
  const sourceRows = APEX_OS_KNOWLEDGE_SOURCE_CANDIDATES.map((item) => ({ ...item }));
  const memory = normalizeApexOsMemory(companySettings?.apexOsMemory || []);
  const memorySummary = summarizeApexOsMemory(memory);
  const vaultSummary = summarizeApexOsKnowledgeVault(memory);
  const vaultEntries = filterApexOsKnowledgeVault(memory);
  return {
    status: vaultSummary.total ? "Knowledge under review" : "Upload intake ready",
    tone: vaultSummary.total ? "green" : "blue",
    categoryCount: categories.length,
    sourceCount: sourceRows.length,
    lockedRuleCount: safetyRows.filter((item) => item.status === "Locked").length,
    memorySummary,
    vaultSummary,
    vaultEntries,
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
    providerStatus: "Server-only provider",
    contextCount: contexts.length,
    evidenceCount: evidenceRows.length,
    actionLockCount: actionLocks.length,
    placeholder: "Ask Apex about the app, roadmap, agents, launch, business, or next safe build step.",
    answerPreview: {
      id: "source-backed-preview",
      title: "Source-backed answer surface",
      status: "Ready",
      detail: "Apex answers from approved memory and source labels, then flags deploy, provider, production, money, sends, customer-visible, or deletion requests as approval-needed.",
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
    status: "Transcript confirm ready",
    tone: "green",
    providerStatus: "Speech provider locked",
    modeCount: modes.length,
    safetyCount: safetyRows.length,
    transcriptStatus: "Manual confirmation",
    answerStatus: askApexChat?.status === "Source-backed live" ? "Ask Apex ready" : "Chat shell required",
    prompt: "Transcript before Apex listens",
    transcriptPreview: "Type and confirm what Apex heard before it becomes an Ask Apex question.",
    answerPreview: "Spoken audio output waits for approved speech provider/API setup; confirmed text can feed Ask Apex now.",
    modes,
    safetyRows,
  };
}

function buildApprovalCommandCenterState({ releaseDesk, askApexChat, voiceInterface, companySettings = {} } = {}) {
  const queueRows = APEX_CONTROL_ROOM_APPROVAL_GATES.map((label) => ({
    id: label.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    title: label,
    status: "Packet required",
    detail: `${label} requests need action, reason, affected scope, risk, validation, rollback, and exact owner approval before anything can happen.`,
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
      detail: "Chat can label risky answers approval-needed, but cannot write approvals or execute actions.",
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
      detail: `${formatCount(agentWorkQueue?.availableTaskCount)} review-only task types are visible. Handoffs prepare instructions without calling queue or run APIs.`,
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
    status: handoffSummary.total ? "Handoff drafts active" : "Drafting ready",
    tone: handoffSummary.ready ? "green" : handoffSummary.total ? "blue" : "blue",
    handoffSummary,
    sourceCount: sourceRows.length,
    sourceRows,
  };
}

function buildReleaseMonitoringState({
  releaseDesk,
  launchState,
  trustState,
  agentWorkQueue,
  recentEvidence = [],
} = {}) {
  const readinessRows = APEX_OS_RELEASE_MONITORING_CHECKS.map((item) => ({ ...item }));
  const lockRows = APEX_OS_RELEASE_MONITORING_LOCKS.map((item) => ({ ...item }));
  const briefingRows = [
    {
      id: "daily-executive-brief",
      title: "Daily executive brief",
      status: "First UI ready",
      detail: `${formatCount(launchState?.readyCount)} of ${formatCount(launchState?.totalCount)} launch gates ready; ${formatCount(recentEvidence.length)} recent evidence rows are available.`,
      tone: "blue",
    },
    {
      id: "changed-since-yesterday",
      title: "What changed since yesterday",
      status: "Evidence planned",
      detail: "Apex OS can reserve this space for build, test, release, agent, and launch diffs without connecting external providers yet.",
      tone: "slate",
    },
    {
      id: "john-action-alerts",
      title: "Alerts that require John action",
      status: "Review required",
      detail: "Approval packets, launch blockers, failed local checks, stalled agents, and release stop warnings should surface here for manual review.",
      tone: "amber",
    },
    {
      id: "stalled-agent-watch",
      title: "Agent stalled watch",
      status: agentWorkQueue?.recentRunCount ? "Runs visible" : "No recent runs",
      detail: `${formatCount(agentWorkQueue?.recentRunCount)} recent Agent OS run rows are visible; no background resume or execution control exists here.`,
      tone: agentWorkQueue?.recentRunCount ? "blue" : "slate",
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
    status: "First UI ready",
    tone: "blue",
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

function buildBusinessCommandCenterState({
  launchState,
  knowledgeVault,
  approvalCommandCenter,
  releaseMonitoring,
} = {}) {
  const queueRows = APEX_OS_BUSINESS_QUEUE_ROWS.map((item) => ({ ...item }));
  const gateRows = APEX_OS_BUSINESS_GATES.map((item) => ({ ...item }));
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
      status: "Review-first",
      detail: "Demo packets, scripts, proof, pilot handoff, and follow-up work stay private drafts until John approves exact use.",
      tone: "blue",
    },
    {
      id: "knowledge-sources",
      title: "Business knowledge sources",
      status: knowledgeVault?.status || "Planned",
      detail: `${formatCount(knowledgeVault?.categoryCount)} private knowledge categories can inform business planning after manual review.`,
      tone: knowledgeVault?.tone || "slate",
    },
    {
      id: "approval-path",
      title: "Business approval path",
      status: approvalCommandCenter?.status || "Planned",
      detail: `${formatCount(approvalCommandCenter?.queueCount)} approval categories protect sends, spend, billing, publishing, providers, and customer-visible changes.`,
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
      status: "Review required",
      detail: "Apex can prepare drafts, packets, checklists, and recommendations, but the owner chooses if anything leaves the app.",
      tone: "amber",
    },
  ];
  return {
    status: "First UI ready",
    tone: "blue",
    queueCount: queueRows.length,
    gateCount: gateRows.length,
    launchCount: launchRows.length,
    briefingCount: briefingRows.length,
    queueRows,
    gateRows,
    launchRows,
    briefingRows,
  };
}

function buildQaSecurityHardeningState({
  decisionMemory,
  knowledgeVault,
  askApexChat,
  voiceInterface,
  approvalCommandCenter,
  releaseMonitoring,
  businessCommandCenter,
  agentWorkQueue,
  launchState,
} = {}) {
  const evidenceRows = APEX_OS_QA_SECURITY_EVIDENCE_ROWS.map((item) => {
    if (item.id === "john-only-access") {
      return {
        ...item,
        status: "Mapped",
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
        status: approvalCommandCenter?.status || item.status,
        detail: `${formatCount(approvalCommandCenter?.queueCount)} approval categories, ${formatCount(approvalCommandCenter?.packetFieldCount)} packet fields, and ${formatCount(approvalCommandCenter?.controlLockCount)} locked controls are visible.`,
      };
    }
    if (item.id === "build-test-release") {
      return {
        ...item,
        status: releaseMonitoring?.status || item.status,
        detail: `${formatCount(releaseMonitoring?.packetCount)} release packet rows and ${formatCount(releaseMonitoring?.lockCount)} monitoring locks keep release work manual.`,
      };
    }
    if (item.id === "no-bypass-actions") {
      return {
        ...item,
        detail: `${formatCount(agentWorkQueue?.safetyRows?.length)} agent locks, ${formatCount(voiceInterface?.safetyCount)} voice gates, and ${formatCount(businessCommandCenter?.gateCount)} business gates block execution paths.`,
      };
    }
    if (item.id === "customer-company-isolation") {
      return {
        ...item,
        detail: "Private Apex OS state is derived inside the authenticated workspace and hidden from customer-facing navigation or field routes.",
      };
    }
    if (item.id === "direct-route-blocking") {
      return {
        ...item,
        detail: "Browser QA must verify a non-operator direct route returns to the normal app without exposing Apex OS panels.",
      };
    }
    if (item.id === "desktop-mobile-visual") {
      return {
        ...item,
        detail: "Desktop and mobile screenshots must include this QA surface and prove no horizontal overflow or panel overlap.",
      };
    }
    if (item.id === "field-user-blocking") {
      return {
        ...item,
        detail: `${formatCount(launchState?.blockedCount)} launch blockers remain visible to the private owner, while field users stay outside Apex OS entirely.`,
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
        ? `${buildAwareness.branch} at ${buildAwareness.headSha}; ${formatCount(buildAwareness.changedFileCount)} changed files are visible. Execution remains locked.`
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

export function deriveApexControlRoomState({
  user = null,
  permissions = {},
  stats = {},
  leads = [],
  jobs = [],
  estimates = [],
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
  const releaseDesk = buildReleaseDesk();
  const decisionMemory = buildDecisionMemoryState(companySettings);
  const knowledgeVault = buildKnowledgeVaultState(companySettings);
  const buildAwareness = buildBuildAwarenessState(companySettings);
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
  const releaseMonitoring = buildReleaseMonitoringState({ releaseDesk, launchState, trustState, agentWorkQueue, recentEvidence });
  const businessCommandCenter = buildBusinessCommandCenterState({ launchState, knowledgeVault, approvalCommandCenter, releaseMonitoring });
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
    decisionMemory,
    knowledgeVault,
    askApexChat,
    voiceInterface,
    approvalCommandCenter,
    releaseMonitoring,
    businessCommandCenter,
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
      releaseDesk: { status: "Restricted", tone: "slate", sections: [] },
      decisionMemory: { status: "Restricted", tone: "slate", decisions: [], rules: [] },
      knowledgeVault: { status: "Restricted", tone: "slate", categories: [], safetyRows: [], sourceRows: [] },
      askApexChat: { status: "Restricted", tone: "slate", contexts: [], evidenceRows: [], actionLocks: [] },
      voiceInterface: { status: "Restricted", tone: "slate", modes: [], safetyRows: [] },
      approvalCommandCenter: { status: "Restricted", tone: "slate", queueRows: [], packetRows: [], controlRows: [], sourceRows: [] },
      buildAwareness: restrictedApexOsBuildAwarenessSnapshot(),
      executionHandoffs: { status: "Restricted", tone: "slate", sourceRows: [], handoffSummary: { total: 0, draft: 0, ready: 0, blocked: 0, archived: 0 } },
      agentControlPlane: { status: "Restricted", tone: "slate", rosterRows: [], requestRows: [], reportRows: [], handoffRows: [], safetyRows: [], requestSummary: { total: 0, active: 0, ready: 0, blocked: 0 } },
      releaseMonitoring: { status: "Restricted", tone: "slate", readinessRows: [], briefingRows: [], releasePacketRows: [], lockRows: [] },
      businessCommandCenter: { status: "Restricted", tone: "slate", queueRows: [], gateRows: [], launchRows: [], briefingRows: [] },
      phase3Aggregator: { status: "Restricted", tone: "slate", rows: [] },
      qaSecurityHardening: { status: "Restricted", tone: "slate", evidenceRows: [], lockRows: [] },
      agentWorkQueue: { status: "Restricted", tone: "slate", taskRows: [], lockedRows: [], runRows: [], safetyRows: [] },
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
        detail: `${buildAwareness.branch} at ${buildAwareness.headSha}; ${formatCount(buildAwareness.changedFileCount)} changed files are visible and execution remains locked.`,
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
        detail: `${executionHandoffs.handoffSummary.total} saved handoffs and ${executionHandoffs.handoffSummary.ready} ready handoffs prepare agent work without queueing or running it.`,
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
        detail: `${voiceInterface.safetyCount} voice safety gates are visible; no microphone, speech provider, or always-listening mode is active.`,
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
        detail: `${executionHandoffs.sourceCount} source rows connect approval packets and Agent Work Queue context without calling queue/run APIs.`,
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
        detail: "Review push-to-talk, transcript confirmation, spoken-answer locks, and privacy gates before approving speech provider work.",
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
        detail: `${voiceInterface.modeCount} voice modes are mapped. No microphone, speech provider, always-listening, or voice execution is active.`,
        tone: voiceInterface.tone,
      },
      {
        id: "approval-command-center",
        title: "Approval command center",
        status: approvalCommandCenter.status,
        detail: `${approvalCommandCenter.queueCount} risky-action categories have packet requirements; approve/reject/defer record review decisions while execution remains locked.`,
        tone: approvalCommandCenter.tone,
      },
      {
        id: "execution-handoffs",
        title: "Agent handoff drafts",
        status: executionHandoffs.status,
        detail: `${executionHandoffs.handoffSummary.total} durable handoffs can prepare scoped agent instructions; queueing and running remain locked.`,
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
