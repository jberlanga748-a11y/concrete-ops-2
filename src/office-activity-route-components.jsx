import { useState } from "react";

import { Badge, Button, Card, SectionHeader } from "./app-shell-components";

function normalizeObjectArray(value, fallback = []) {
  if (Array.isArray(value)) {
    return value.filter((item) => item && typeof item === "object");
  }
  if (Array.isArray(fallback)) {
    return fallback.filter((item) => item && typeof item === "object");
  }
  return [];
}

function formatActivityDateTime(value) {
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

function AuditActionBadge({ action }) {
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

export function ActivityPanel({ activity = [] }) {
  return (
    <Card className="p-4">
      <SectionHeader title="Recent Activity" description="Live changes land here so the office can keep pace with the field." />
      <div className="space-y-3">
        {activity.map((item) => (
          <div key={item.id} className="border-l-2 border-blue-200 pl-3">
            <p className="text-xs font-black uppercase tracking-widest text-blue-700">{item.time}</p>
            <p className="mt-1 text-sm font-black text-slate-950">{item.title}</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">{item.detail}</p>
            <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">{formatActivityDateTime(item.createdAt)}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function AuditTrailPanel({ auditEvents }) {
  const [showAll, setShowAll] = useState(false);
  const safeAuditEvents = normalizeObjectArray(auditEvents).map((event, index) => ({
    ...event,
    id: event?.id || `audit-${index}`,
    summary: event?.summary || event?.title || "Workspace event",
    detail: event?.detail || event?.description || "Changes were recorded for this workspace event.",
    action: event?.action || "updated",
    actorName: event?.actorName || event?.userName || "Unknown user",
    entityType: event?.entityType || "workspace",
    changedFields: Array.isArray(event?.changedFields) ? event.changedFields.filter(Boolean) : [],
  }));
  const visibleAuditEvents = showAll ? safeAuditEvents : safeAuditEvents.slice(0, 5);

  return (
    <Card className="p-5">
      <SectionHeader
        title="Audit trail"
        description="Review the latest workspace changes without crowding the rest of Settings."
        action={safeAuditEvents.length > 5 ? (
          <Button type="button" size="sm" variant="secondary" onClick={() => setShowAll((current) => !current)}>
            {showAll ? "Show latest 5" : "Show audit trail"}
          </Button>
        ) : null}
      />
      {safeAuditEvents.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-blue-200 bg-blue-50 p-6 text-center text-sm text-slate-500">Audit history will appear here as records are created, updated, reviewed, and reset.</div>
      ) : (
        <div className="space-y-3">
          {visibleAuditEvents.map((event) => (
            <div key={event.id} className="rounded-2xl border border-blue-100 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-slate-950">{event.summary}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{event.detail}</p>
                </div>
                <AuditActionBadge action={event.action} />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                <span>{event.entityType}</span>
                {event.entityId ? <span>{event.entityId}</span> : null}
                <span>{event.actorName}</span>
                <span>{formatActivityDateTime(event.createdAt)}</span>
              </div>
              {event.changedFields.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {event.changedFields.map((field) => (
                    <Badge key={`${event.id}-${field}`} tone="slate">{field}</Badge>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
