import { useMemo, useState } from "react";

import {
  Badge,
  Button,
  Card,
  Icon,
  SectionHeader,
  StateCard,
} from "./app-shell-components";
import {
  buildEnterpriseTrustReviewPacket,
  deriveAppHealthAuditState,
  deriveEnterpriseTrustReadinessState,
} from "./owner-health-utils";
import {
  getReleaseSafetyCommandGroups,
  getReleaseSafetySections,
  releaseSafetyStatusTone,
} from "./release-safety-utils";

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
