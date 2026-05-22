import { useMemo, useState } from "react";

import {
  Badge,
  Button,
  Card,
  Icon,
  SectionHeader,
  StateCard,
} from "./app-shell-components";
import { deriveAppHealthAuditState } from "./owner-health-utils";

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
