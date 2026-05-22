import { useEffect, useMemo, useState } from "react";

import {
  Badge,
  Button,
  Card,
  Icon,
  SectionHeader,
  StatCard,
  StateCard,
} from "./app-shell-components";
import { buildCustomerPortalPreviewPacket } from "./customer-portal-preview-utils";
import { getOwnerHealth } from "./api";
import {
  buildOwnerSupportPacket,
  buildEnterpriseTrustReviewPacket,
  deriveAppHealthAuditState,
  deriveEnterpriseTrustReadinessState,
  deriveOverallOwnerHealthStatus,
  formatBytes,
  healthStatusTone,
  ownerHealthStatusLabel,
  ownerHealthWarnings,
} from "./owner-health-utils";
import {
  getReleaseSafetyCommandGroups,
  getReleaseSafetySections,
  releaseSafetyStatusTone,
} from "./release-safety-utils";
import { DESIGN_COLORS } from "./design-tokens";

function formatDateTime(value) {
  if (!value) return "Not recorded";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Not recorded";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}

function AppHealthAuditActionBadge({ action }) {
  const tones = {
    created: "green",
    updated: "blue",
    converted: "violet",
    completed: "green",
    reopened: "amber",
    archived: "slate",
    restored: "blue",
    deleted: "red",
    reset: "red",
  };

  return <Badge tone={tones[action] || "slate"}>{action}</Badge>;
}

export function OwnerHealthStatusPanel({ sessionToken, canView = false, user = null, companyName = "" }) {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [supportCopyMessage, setSupportCopyMessage] = useState("");

  async function refreshHealth({ silent = false } = {}) {
    if (!canView || !sessionToken) return;
    setLoading(true);
    if (!silent) setNotice("");
    try {
      const payload = await getOwnerHealth(sessionToken);
      setHealth(payload);
      setNotice("");
    } catch {
      setNotice("Owner Health Status could not be loaded. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadHealth() {
      if (!canView || !sessionToken) return;
      setLoading(true);
      try {
        const payload = await getOwnerHealth(sessionToken);
        if (!cancelled) {
          setHealth(payload);
          setNotice("");
        }
      } catch {
        if (!cancelled) setNotice("Owner Health Status could not be loaded. Try again in a moment.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadHealth();
    return () => {
      cancelled = true;
    };
  }, [canView, sessionToken]);

  if (!canView) return null;

  const overallStatus = deriveOverallOwnerHealthStatus(health || {});
  const warnings = ownerHealthWarnings(health || {});
  const counts = health?.counts || {};
  const supportPacket = buildOwnerSupportPacket(health || {}, {
    companyName,
    userName: user?.name || user?.email || "Workspace owner",
  });
  const sectionCards = [
    {
      id: "app",
      label: "App",
      status: health?.app?.status || "unknown",
      message: health?.app?.environment ? `${health.app.environment} / uptime ${Math.max(0, Number(health.app.uptimeSeconds || 0))}s` : "App status has not been checked yet.",
    },
    {
      id: "database",
      label: "Database",
      status: health?.database?.status || "unknown",
      message: health?.database?.message || "Database status has not been checked yet.",
    },
    {
      id: "storage",
      label: "Storage",
      status: health?.storage?.status || "unknown",
      message: health?.storage
        ? `${health.storage.message || "Storage checked."} Free: ${formatBytes(health.storage.freeBytes)} / Total: ${formatBytes(health.storage.totalBytes)}`
        : "Storage status has not been checked yet.",
    },
    {
      id: "ai",
      label: "AI",
      status: health?.ai?.status || "unknown",
      message: health?.ai?.message || "AI configuration status has not been checked yet.",
    },
    {
      id: "websiteIntake",
      label: "Website intake",
      status: health?.websiteIntake?.status || "unknown",
      message: health?.websiteIntake?.message || "Website intake status has not been checked yet.",
    },
    {
      id: "backups",
      label: "Backups",
      status: health?.backups?.status || "unknown",
      message: health?.backups?.message || "Backup/export status has not been checked yet.",
    },
  ];
  const countItems = [
    ["Companies", counts.companies],
    ["Users", counts.users],
    ["Leads", counts.leads],
    ["Customers", counts.customers],
    ["Estimates", counts.estimates],
    ["Jobs", counts.jobs],
    ["Active jobs", counts.activeJobs],
    ["Uploads", counts.uploads],
    ["Open follow-ups", counts.openFollowUps],
  ];

  async function copySupportPacket() {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(supportPacket);
      } else if (typeof document !== "undefined") {
        const textArea = document.createElement("textarea");
        textArea.value = supportPacket;
        textArea.setAttribute("readonly", "");
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      } else {
        throw new Error("Clipboard unavailable");
      }
      setSupportCopyMessage("Support packet copied. Paste it into your support message with what happened.");
    } catch {
      setSupportCopyMessage("Could not copy automatically. Select the packet text and copy it manually.");
    }
  }

  return (
    <Card className="p-5">
      <SectionHeader
        title="Owner Health Status"
        description="A safe owner-only status check for app readiness, database, storage, configured integrations, and workspace activity."
        action={(
          <Button type="button" variant="secondary" size="sm" onClick={() => refreshHealth()} disabled={loading || !sessionToken}>
            {loading ? "Checking..." : "Refresh"}
          </Button>
        )}
      />
      <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-black text-slate-950">Overall owner status</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">No secrets, tokens, customer lists, pricing, or internal record details are shown here.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={healthStatusTone(overallStatus)}>{ownerHealthStatusLabel(overallStatus)}</Badge>
            {health?.generatedAt ? <Badge tone="slate">Checked {formatDateTime(health.generatedAt)}</Badge> : null}
          </div>
        </div>
        {notice ? <p className="mt-3 text-sm font-bold text-amber-700">{notice}</p> : null}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {sectionCards.map((section) => (
          <div key={section.id} className="rounded-2xl border border-blue-100 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-black text-slate-950">{section.label}</p>
              <Badge tone={healthStatusTone(section.status)}>{ownerHealthStatusLabel(section.status)}</Badge>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">{section.message}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="rounded-2xl border border-blue-100 bg-white p-4">
          <p className="text-sm font-black text-slate-950">Workspace counts</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {countItems.map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-blue-50 bg-blue-50/50 p-3">
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">{label}</p>
                <p className="mt-1 text-xl font-black text-slate-950">{Number.isFinite(Number(value)) ? Number(value) : 0}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-blue-100 bg-white p-4">
          <p className="text-sm font-black text-slate-950">Warnings</p>
          <div className="mt-3 grid gap-2">
            {warnings.length ? warnings.map((warning) => (
              <div key={warning.id} className="rounded-2xl border border-blue-50 bg-blue-50/50 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={healthStatusTone(warning.severity)}>{ownerHealthStatusLabel(warning.severity)}</Badge>
                  <p className="text-sm font-black text-slate-950">{warning.title}</p>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{warning.message}</p>
              </div>
            )) : (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
                No owner health warnings are active.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="slate">Support packet</Badge>
              <Badge tone="green">Copy only</Badge>
              <Badge tone="slate">No secrets</Badge>
            </div>
            <p className="mt-2 text-sm font-black text-slate-950">Report an issue with clean diagnostics</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">Copy a safe app-health summary, then add what screen you were on and what you expected. Apex HQ does not send this automatically.</p>
          </div>
          <Button type="button" size="sm" variant="secondary" onClick={copySupportPacket}>
            <Icon name="clipboard" />Copy support packet
          </Button>
        </div>
        {supportCopyMessage ? <p className="mt-3 text-sm font-bold text-emerald-700">{supportCopyMessage}</p> : null}
        <details className="mt-3">
          <summary className="cursor-pointer text-sm font-black text-slate-700">Preview packet</summary>
          <pre className="mt-3 max-h-72 overflow-auto rounded-2xl border border-slate-200 bg-white p-3 text-xs leading-5 text-slate-700">{supportPacket}</pre>
        </details>
      </div>
    </Card>
  );
}

export function CustomerPortalManualPreviewPanel({
  canPreview = false,
  state,
  user,
  packageReadiness,
  onOpenSupport,
}) {
  const [copyNotice, setCopyNotice] = useState("");
  const preview = state?.preview || {};
  const packet = useMemo(() => buildCustomerPortalPreviewPacket({ state, user }), [state, user]);

  async function copyPreviewPacket() {
    if (!canPreview) return;
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(packet);
      } else if (typeof document !== "undefined") {
        const textArea = document.createElement("textarea");
        textArea.value = packet;
        textArea.setAttribute("readonly", "");
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      } else {
        throw new Error("Clipboard unavailable");
      }
      setCopyNotice("Internal preview packet copied for owner/admin review.");
    } catch {
      setCopyNotice("Could not copy automatically. Select the preview text and copy it manually.");
    }
  }

  if (!canPreview) {
    const currentPackage = packageReadiness?.currentPackage?.label || "Current package";
    const canRequestReview = typeof onOpenSupport === "function";

    return (
      <Card className="co-settings-console-card p-5">
        <SectionHeader
          title="Customer portal manual preview"
          description="Elite owner/admin preview is locked for this workspace. No customer access, links, approvals, or notifications exist here."
          action={<Badge tone="amber">Elite locked</Badge>}
        />
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
          <StateCard
            title={`${currentPackage} workspace`}
            description="Customer portal remains an Elite future feature. Basic and Premium workspaces keep proposal, job, and proof workflows internal until a manual package review is approved."
            tone="slate"
          />
          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
            <p className="text-sm font-black text-amber-900">Locked boundary</p>
            <p className="mt-2 text-sm font-bold leading-6 text-amber-800">No customer login, share link, self-serve approval, payment, invoice, checkout, or automatic notification was added.</p>
            {canRequestReview ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="mt-3"
                onClick={() => onOpenSupport({
                  workflow: "Upgrade / package review",
                  blockerLevel: "Not a blocker",
                  currentPackage,
                  requestedPackage: "Elite",
                  requestedFeature: "Customer portal manual approval preview",
                  upgradeReason: "Review Elite access for an owner/admin internal preview of customer-facing proposal and progress content. No customer auth, share links, self-serve approvals, payments, invoices, or notifications.",
                  summary: "Please review whether Elite customer portal preview access is appropriate for this workspace.",
                  expected: "Founder/operator reviews manually before any package change or customer-facing portal work.",
                  workaround: "Keep using existing estimates, jobs, reports, uploads, and manual print/share workflows.",
                })}
              >
                <Icon name="help" />Request manual review
              </Button>
            ) : null}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="co-settings-console-card p-5">
      <SectionHeader
        title="Customer portal manual preview"
        description="Owner/admin internal preview only. Review what could become customer-facing before any future sharing model exists."
        action={<Badge tone="green">Elite preview</Badge>}
      />
      <div className="grid gap-3 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <StatCard title="Customer" value={preview.customer || "Customer pending"} detail="Customer-facing label candidate." />
            <StatCard title="Proposal" value={preview.estimateStatus || "Pending"} detail={`${preview.estimateTitle || "Approved proposal pending"} / ${preview.estimateTotal || "$0"}`} />
            <StatCard title="Job progress" value={preview.jobStatus || "Pending"} detail={preview.jobTitle || "Job pending"} />
            <StatCard title="Proof ready" value={preview.proofPhotoCount || 0} detail={`${preview.progressUpdateCount || 0} progress update(s), ${preview.reviewedChangeOrderCount || 0} reviewed change order(s).`} />
          </div>
          <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">Customer-facing content candidate</p>
            <div className="mt-3 grid gap-3 text-sm leading-6 text-slate-700">
              <p><strong>Scope:</strong> {preview.scopeSummary || "Approved scope summary pending."}</p>
              <p><strong>Exclusions:</strong> {preview.exclusions || "Exclusions pending owner/admin review."}</p>
              <p><strong>Schedule:</strong> {preview.scheduleExpectation || "Schedule pending"}</p>
              <p><strong>Next step:</strong> {preview.nextStep || "Next step pending owner/admin review"}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Manual readiness</p>
            <div className="mt-3 grid gap-2">
              {(state?.readiness || []).map((item) => (
                <div key={item.id} className="co-settings-blocker-row">
                  <span>{item.label}</span>
                  <Badge tone={item.ready ? "green" : "amber"}>{item.ready ? "Ready" : "Review"}</Badge>
                  <em>{item.detail}</em>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Hard boundaries</p>
            <div className="mt-3 grid gap-2">
              {(state?.boundaries || []).map((boundary) => (
                <div key={boundary} className="co-ai-boundary-row" data-state="manual">
                  <span>{boundary}</span>
                  <strong>Manual</strong>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="secondary" onClick={copyPreviewPacket}>
              <Icon name="clipboard" />Copy internal preview
            </Button>
            <p className="text-sm font-bold text-slate-500">{copyNotice || "Copy-only. Apex HQ does not send, publish, approve, or create a customer portal from this preview."}</p>
          </div>
        </div>
      </div>
      <pre className="mt-4 max-h-80 overflow-auto rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs leading-5 text-slate-700">{packet}</pre>
    </Card>
  );
}

export function AppHealthAuditActivityPanel({ auditEvents = [], activity = [], canView = false }) {
  const trustState = useMemo(() => deriveAppHealthAuditState({ auditEvents, activity }), [activity, auditEvents]);
  const [copyMessage, setCopyMessage] = useState("");
  const stats = [
    { label: "Audit Events", value: trustState.stats.auditEvents, helper: "Workspace changes", tone: "blue" },
    { label: "Today", value: trustState.stats.todayAuditEvents, helper: "Changed today", tone: trustState.stats.todayAuditEvents ? "amber" : "slate" },
    { label: "Sensitive", value: trustState.stats.sensitiveAuditEvents, helper: "Users, roles, exports", tone: trustState.stats.sensitiveAuditEvents ? "amber" : "green" },
    { label: "Activity", value: trustState.stats.activity, helper: "Operational feed", tone: "slate" },
  ];

  async function copyTrustSummary() {
    const lines = [
      "Apex HQ App Health / Audit Activity Summary",
      `Generated for: ${trustState.generatedForDate || new Date().toISOString().slice(0, 10)}`,
      `Audit events: ${trustState.stats.auditEvents}`,
      `Audit events today: ${trustState.stats.todayAuditEvents}`,
      `Sensitive admin/security events: ${trustState.stats.sensitiveAuditEvents}`,
      `Activity records: ${trustState.stats.activity}`,
      "",
      "Recent audit events:",
      ...(trustState.recentAuditEvents.slice(0, 5).map((event) => `- ${event.summary} / ${event.action} / ${event.actorName} / ${event.createdAt || "No timestamp"}`)),
      "",
      "Manual note: This summary is copy-only. Apex HQ did not send it automatically.",
    ];

    try {
      const text = lines.join("\n");
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else if (typeof document !== "undefined") {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.setAttribute("readonly", "");
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      } else {
        throw new Error("Clipboard unavailable");
      }
      setCopyMessage("Audit/activity summary copied.");
    } catch {
      setCopyMessage("Could not copy automatically. Review the visible summary instead.");
    }
  }

  if (!canView) return null;

  return (
    <Card className="p-5">
      <SectionHeader
        title="Audit Activity / Trust Review"
        description="Owner/admin view of recent workspace changes, sensitive admin activity, and the operational activity feed."
        action={<Button type="button" size="sm" variant="secondary" onClick={copyTrustSummary}><Icon name="clipboard" />Copy summary</Button>}
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-blue-100 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">{stat.label}</p>
                <p className="mt-2 text-2xl font-black text-slate-950">{stat.value}</p>
                <p className="mt-1 text-xs font-bold text-slate-500">{stat.helper}</p>
              </div>
              <Badge tone={stat.tone}>{stat.label}</Badge>
            </div>
          </div>
        ))}
      </div>
      {copyMessage ? <p className="mt-3 text-sm font-bold text-emerald-700">{copyMessage}</p> : null}

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-black text-slate-950">Recent audit events</p>
            <Badge tone="blue">{trustState.recentAuditEvents.length}</Badge>
          </div>
          <div className="mt-3 grid gap-2">
            {trustState.recentAuditEvents.length ? trustState.recentAuditEvents.map((event) => (
              <div key={event.id} className="rounded-2xl border border-white/80 bg-white p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-black text-slate-950">{event.summary}</p>
                    <p className="mt-1 text-xs font-bold text-slate-500">{event.entityType} / {event.action} / {event.actorName}</p>
                  </div>
                  <AppHealthAuditActionBadge action={event.action} />
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-500">{event.detail}</p>
                <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">{formatDateTime(event.createdAt)}</p>
              </div>
            )) : <StateCard title="No audit events yet" description="Workspace audit history appears here after users create, update, review, export, or archive records." tone="slate" />}
          </div>
        </div>

        <div className="rounded-2xl border border-amber-100 bg-amber-50/40 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-black text-slate-950">Sensitive admin events</p>
            <Badge tone={trustState.sensitiveAuditEvents.length ? "amber" : "green"}>{trustState.sensitiveAuditEvents.length}</Badge>
          </div>
          <div className="mt-3 grid gap-2">
            {trustState.sensitiveAuditEvents.length ? trustState.sensitiveAuditEvents.map((event) => (
              <div key={event.id} className="rounded-2xl border border-white/80 bg-white p-3">
                <p className="text-sm font-black text-slate-950">{event.summary}</p>
                <p className="mt-1 text-xs font-bold text-slate-500">{event.entityType} / {event.action} / {formatDateTime(event.createdAt)}</p>
                {event.changedFields.length ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {event.changedFields.slice(0, 5).map((field) => <Badge key={`${event.id}-${field}`} tone="slate">{field}</Badge>)}
                  </div>
                ) : null}
              </div>
            )) : (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
                No sensitive admin events are in the current visible audit window.
              </div>
            )}
          </div>
        </div>

        <div className="xl:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-black text-slate-950">Recent operational activity</p>
            <Badge tone="slate">{trustState.recentActivity.length}</Badge>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {trustState.recentActivity.length ? trustState.recentActivity.map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-3">
                <p className="text-sm font-black text-slate-950">{item.title}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">{item.detail}</p>
                <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">{item.time || formatDateTime(item.createdAt)}</p>
              </div>
            )) : <StateCard title="No activity yet" description="Operational activity appears here as the workspace is used." tone="slate" />}
          </div>
        </div>
      </div>
    </Card>
  );
}

export function EnterpriseTrustReadinessPanel({
  auditEvents = [],
  activity = [],
  canView = false,
  canViewSettings = false,
  canExportData = false,
  canViewAppHealth = false,
  canViewSupport = false,
  packageReadiness = null,
  onJump = null,
  onOpenSupport = null,
  user = null,
  companyName = "",
}) {
  const [trustCopyMessage, setTrustCopyMessage] = useState("");
  const trustReadiness = useMemo(() => deriveEnterpriseTrustReadinessState({
    auditEvents,
    activity,
    canViewSettings,
    canExportData,
    canViewAppHealth,
    canViewSupport,
    packageLabel: packageReadiness?.currentPackage?.label || "Current package",
  }), [
    activity,
    auditEvents,
    canExportData,
    canViewAppHealth,
    canViewSettings,
    canViewSupport,
    packageReadiness?.currentPackage?.label,
  ]);

  if (!canView) return null;

  const statusTone = trustReadiness.overallStatus === "ready"
    ? "green"
    : trustReadiness.overallStatus === "limited"
      ? "blue"
      : "amber";
  const statusLabel = trustReadiness.overallStatus === "ready"
    ? "Trust surface ready"
    : trustReadiness.overallStatus === "limited"
      ? "Limited by role/package"
      : "Needs review";
  const statCards = [
    { label: "Ready checks", value: `${trustReadiness.stats.readyChecks}/${trustReadiness.stats.totalChecks}`, helper: "Owner trust controls", tone: statusTone },
    { label: "Audit events", value: trustReadiness.stats.auditEvents, helper: "Workspace history", tone: trustReadiness.stats.auditEvents ? "blue" : "amber" },
    { label: "Sensitive events", value: trustReadiness.stats.sensitiveAuditEvents, helper: "Users, roles, exports", tone: trustReadiness.stats.sensitiveAuditEvents ? "amber" : "green" },
    { label: "Exports logged", value: trustReadiness.stats.exportEvents, helper: "Owner data exports", tone: trustReadiness.stats.exportEvents ? "green" : "slate" },
  ];

  async function copyTrustReviewPacket() {
    const packet = buildEnterpriseTrustReviewPacket(trustReadiness, {
      companyName,
      userName: user?.name || user?.email || "Owner/admin",
    });

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(packet);
      } else if (typeof document !== "undefined") {
        const textArea = document.createElement("textarea");
        textArea.value = packet;
        textArea.setAttribute("readonly", "");
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      } else {
        throw new Error("Clipboard unavailable");
      }
      setTrustCopyMessage("Pilot trust review packet copied.");
    } catch {
      setTrustCopyMessage("Could not copy automatically. Review the visible trust summary instead.");
    }
  }

  return (
    <Card className="p-5">
      <SectionHeader
        title="Enterprise Trust Readiness"
        description="Owner/admin view of the trust controls Apex HQ needs before broader SaaS rollout. This is evidence and guidance only - no compliance claims, automation, or billing changes."
        action={<Badge tone={statusTone}>{statusLabel}</Badge>}
      />
      <div className="co-trust-readiness-hero">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="slate">{trustReadiness.packageLabel}</Badge>
            <Badge tone="green">Security included</Badge>
            <Badge tone="slate">Manual review</Badge>
          </div>
          <p>Trust work is strongest when owners can inspect health, exports, audit activity, support context, and release safety from one place.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" onClick={copyTrustReviewPacket}><Icon name="clipboard" />Copy trust packet</Button>
          {canExportData ? <Button type="button" size="sm" variant="secondary" onClick={() => onJump?.("settings-workspace-identity")}><Icon name="document" />Export area</Button> : null}
          {canViewAppHealth ? <Button type="button" size="sm" variant="secondary" onClick={() => onJump?.("settings-owner-health")}><Icon name="database" />Owner Health</Button> : null}
          {canViewSupport ? <Button type="button" size="sm" variant="secondary" onClick={() => onOpenSupport?.()}><Icon name="help" />Support</Button> : null}
        </div>
      </div>
      {trustCopyMessage ? <p className="mt-3 text-sm font-bold text-emerald-700">{trustCopyMessage}</p> : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((stat) => (
          <div key={stat.label} className="co-trust-stat-card">
            <Badge tone={stat.tone}>{stat.label}</Badge>
            <strong>{stat.value}</strong>
            <span>{stat.helper}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {trustReadiness.checks.map((check) => (
          <div key={check.id} className={`co-trust-check-card is-${check.status}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p>{check.label}</p>
              <Badge tone={check.status === "ready" ? "green" : check.status === "restricted" ? "slate" : "amber"}>
                {check.status === "ready" ? "Ready" : check.status === "restricted" ? "Restricted" : "Review"}
              </Badge>
            </div>
            <span>{check.detail}</span>
          </div>
        ))}
      </div>

      <div className="co-trust-next-actions mt-4">
        <div>
          <span>Next trust actions</span>
          {trustReadiness.nextActions.slice(0, 4).map((action) => <p key={action}>{action}</p>)}
        </div>
        <div>
          <span>Claims guardrail</span>
          <p>Use this for guided pilot confidence only. Do not describe Apex HQ as SOC 2, SSO/MFA, SLA, or enterprise-compliance ready until those controls are actually built and verified.</p>
        </div>
      </div>

      {trustReadiness.attentionChecks.length ? (
        <div className="mt-4">
          <StateCard
            title="Trust items still need evidence"
            description={`${trustReadiness.attentionChecks.map((check) => check.label).join(", ")} should be reviewed before positioning Apex HQ as broad public SaaS or enterprise-ready.`}
            tone="amber"
          />
        </div>
      ) : null}
    </Card>
  );
}

export function ReleaseSafetyRollbackPanel({ canView = false }) {
  const [copyMessage, setCopyMessage] = useState("");
  const sections = useMemo(() => getReleaseSafetySections(), []);
  const commandGroups = useMemo(() => getReleaseSafetyCommandGroups(), []);

  async function copyCommandGroup(group) {
    const value = group?.text || "";
    if (!value) return;

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else if (typeof document !== "undefined") {
        const textArea = document.createElement("textarea");
        textArea.value = value;
        textArea.setAttribute("readonly", "");
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      } else {
        throw new Error("Clipboard unavailable");
      }
      setCopyMessage(`${group.title} copied.`);
    } catch {
      setCopyMessage("Could not copy automatically. Select the command text and copy it manually.");
    }
  }

  if (!canView) return null;

  return (
    <Card className="p-5">
      <SectionHeader
        title="Release Safety / Rollback Notes"
        description="A manual owner checklist for safe deploys, health checks, and conservative rollback decisions. This is guidance only - no automatic rollback or external monitoring runs here."
      />
      <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="amber">Manual checklist</Badge>
          <Badge tone="slate">No automation</Badge>
          <Badge tone="slate">No secrets</Badge>
        </div>
        <p className="mt-3 text-sm leading-6 text-amber-800">Pause before deploys when the folder, repo, branch, modified files, or health status does not look exactly right. If anything feels weird, stop and ask before guessing.</p>
        {copyMessage ? <p className="mt-3 text-sm font-bold text-emerald-700">{copyMessage}</p> : null}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        {sections.map((section) => (
          <div key={section.id} className={`rounded-2xl border p-4 ${section.tone === "red" ? "border-red-100 bg-red-50/70" : section.tone === "amber" ? "border-amber-100 bg-amber-50/70" : "border-blue-100 bg-white"}`}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-black text-slate-950">{section.title}</p>
              {section.tone ? <Badge tone={releaseSafetyStatusTone(section.tone)}>{section.tone === "red" ? "Stop first" : "Review"}</Badge> : null}
            </div>
            <ul className="grid gap-2 text-sm leading-6 text-slate-700">
              {section.items.map((item) => (
                <li key={item} className="rounded-2xl border border-white/80 bg-white/70 px-3 py-2">{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
        <SectionHeader title="Safe Commands Reference" description="Copy these only from the correct folder and only when the checklist above is clean. Replace MACHINE_ID or VOLUME_ID with a real value from the list command first." />
        <div className="grid gap-3 lg:grid-cols-2">
          {commandGroups.map((group) => (
            <div key={group.id} className="rounded-2xl border border-blue-100 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-black text-slate-950">{group.title}</p>
                  <p className="mt-1 text-sm leading-5 text-slate-500">{group.description}</p>
                </div>
                <Button type="button" size="sm" variant="secondary" onClick={() => copyCommandGroup(group)}>Copy</Button>
              </div>
              <pre className="mt-3 overflow-x-auto rounded-2xl border border-slate-200 bg-slate-950 p-3 text-xs leading-5 text-slate-100"><code>{group.text}</code></pre>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

export function PwaInstallGuidancePanel({ canView = false }) {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installState, setInstallState] = useState("idle");

  useEffect(() => {
    if (!canView || typeof window === "undefined") return undefined;

    function handleBeforeInstallPrompt(event) {
      event.preventDefault();
      setInstallPrompt(event);
      setInstallState("available");
    }

    function handleInstalled() {
      setInstallPrompt(null);
      setInstallState("installed");
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, [canView]);

  async function handleInstallClick() {
    if (!installPrompt?.prompt) return;

    setInstallState("prompting");
    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      setInstallPrompt(null);
      setInstallState(choice?.outcome === "accepted" ? "installed" : "dismissed");
    } catch {
      setInstallState("fallback");
    }
  }

  if (!canView) return null;

  const installAvailable = Boolean(installPrompt);
  const statusMessage = installState === "installed"
    ? "Apex HQ has been installed or the browser reported a successful install."
    : installState === "dismissed"
      ? "Install was dismissed. You can still use the browser menu install option later."
      : installState === "fallback"
        ? "The browser install prompt was not available. Use the manual install steps below."
        : "Chrome or Edge may show an install button when the browser confirms this device supports app install.";

  return (
    <Card className="p-5">
      <SectionHeader
        title="Install Apex HQ"
        description="Add Apex HQ to a desktop or mobile home screen as an installable app shell. Live workspace data still requires an internet connection."
        action={installAvailable ? (
          <Button type="button" variant="primary" size="sm" onClick={handleInstallClick} disabled={installState === "prompting"}>
            {installState === "prompting" ? "Opening..." : "Install App"}
          </Button>
        ) : null}
      />
      <div className="rounded-2xl border border-orange-100 bg-orange-50/70 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="amber">Installable app shell</Badge>
          <Badge tone="slate">No offline editing</Badge>
          <Badge tone="slate">No browser alerts</Badge>
        </div>
        <p className="mt-3 text-sm leading-6 text-orange-900">
          Offline editing is not enabled yet. Keep an internet connection active for leads, jobs, reports, photos, estimates, and owner tools.
        </p>
        <p className="mt-2 text-sm font-bold text-orange-800">{statusMessage}</p>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-blue-100 bg-white p-4">
          <p className="text-sm font-black text-slate-950">Windows desktop</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">Open Apex HQ in Chrome or Edge, use the browser install button or menu, then pin it to the taskbar or Start menu.</p>
        </div>
        <div className="rounded-2xl border border-blue-100 bg-white p-4">
          <p className="text-sm font-black text-slate-950">iPhone or iPad</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">Open the live app in Safari, tap Share, then choose Add to Home Screen.</p>
        </div>
        <div className="rounded-2xl border border-blue-100 bg-white p-4">
          <p className="text-sm font-black text-slate-950">Android</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">Open the live app in Chrome, then use Install app or Add to Home screen from the browser menu.</p>
        </div>
      </div>
    </Card>
  );
}

export function UiStyleFoundationPanel({ canView = false }) {
  if (!canView) return null;

  const swatches = [
    ["Brand orange", DESIGN_COLORS.brand.orange],
    ["Shell dark", DESIGN_COLORS.shell.dark],
    ["Workspace", DESIGN_COLORS.workspace.page],
    ["Card", DESIGN_COLORS.workspace.card],
  ];

  return (
    <Card className="p-5">
      <SectionHeader
        title="UI Style Foundation"
        description="Design tokens are now in place for the dark shell, orange brand accent, light workspace, rounded cards, and soft construction SaaS polish. Full page-by-page UI polish continues in phases 12B-12J."
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <div className="co-sidebar-shell rounded-3xl border border-slate-800 p-4 text-white">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-2xl bg-orange-500 text-sm font-black text-white">AH</div>
            <div>
              <p className="text-sm font-black">Apex HQ</p>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-300">Team workspace</p>
            </div>
          </div>
          <div className="mt-4 grid gap-2 text-sm font-bold">
            <div className="rounded-2xl bg-orange-600 px-3 py-2">Dashboard active state</div>
            <div className="rounded-2xl px-3 py-2 text-slate-300">Jobs / Leads / Reports</div>
          </div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {swatches.map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-slate-200 bg-white p-3">
                <div className="h-10 rounded-xl border border-slate-200" style={{ background: value }} />
                <p className="mt-2 text-sm font-black text-slate-950">{label}</p>
                <p className="text-xs font-bold text-slate-500">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" size="sm">Primary action</Button>
            <Button type="button" size="sm" variant="secondary">Secondary action</Button>
            <Badge tone="orange">Orange accent</Badge>
            <Badge tone="slate">Soft badge</Badge>
          </div>
        </div>
      </div>
    </Card>
  );
}
