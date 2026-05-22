import { useState } from "react";

import { Badge, Card, Icon, SectionHeader, StateCard } from "./app-shell-components";
import { formatMinutes, timeStatusTone } from "./time-utils";

export function workCategoryLabel(workCategory = "") {
  const labels = {
    job: "Job",
    office_admin: "Office/Admin",
    estimating: "Estimating",
    lead_follow_up: "Lead Follow-up",
    shop_yard: "Shop/Yard",
    travel: "Travel",
    training: "Training",
    meeting: "Meeting",
    maintenance: "Maintenance",
    other: "Other",
  };

  return labels[workCategory] || "Other";
}

export function TimeStatusBadge({ status }) {
  return <Badge tone={timeStatusTone(status)}>{status === "on_break" ? "On Break" : status === "completed" ? "Completed" : "Active"}</Badge>;
}

function timeEntryDateTimeLabel(value) {
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

export function TimeKpiCardPolished({ item }) {
  const tone = item.tone || "orange";
  const rawValue = Number(item.rawValue ?? item.value ?? 0);
  const isEmpty = Number.isFinite(rawValue) ? rawValue <= 0 : false;

  return (
    <div className="co-command-kpi border p-3" data-tone={tone}>
      <div className="co-command-kpi-body">
        <div className="co-command-kpi-icon">
          <Icon name={item.icon} className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className={`co-command-kpi-value ${isEmpty ? "is-empty" : ""}`}>{item.value ?? 0}</p>
          <p className="mt-0.5 break-words text-sm font-black leading-tight text-slate-950">{item.label}</p>
          <p className="mt-0.5 break-words text-xs font-bold leading-[1.35] text-slate-700">{item.helper}</p>
        </div>
      </div>
      {item.actionLabel ? (
        <button type="button" onClick={item.onAction} className="co-command-kpi-link co-focus-ring">
          {item.actionLabel}
          <span aria-hidden="true">-&gt;</span>
        </button>
      ) : null}
    </div>
  );
}

export function TimeSummaryMetricsPolished({ summary, activeCount = 0, label = "This week" }) {
  const safeSummary = summary || { totalMinutes: 0, breakMinutes: 0, groupedBreakdown: [] };

  return (
    <div className="co-time-summary-strip">
      <div>
        <span>{label}</span>
        <strong>{formatMinutes(safeSummary.totalMinutes)}</strong>
        <small>worked</small>
      </div>
      <div>
        <span>Breaks</span>
        <strong>{formatMinutes(safeSummary.breakMinutes)}</strong>
        <small>recorded</small>
      </div>
      <div>
        <span>Categories</span>
        <strong>{safeSummary.groupedBreakdown?.length || 0}</strong>
        <small>visible</small>
      </div>
      <div>
        <span>Clocked in</span>
        <strong>{activeCount}</strong>
        <small>right now</small>
      </div>
    </div>
  );
}

export function TimeMobileAccordionCard({ title, summary, badge, defaultOpen = false, children }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="co-mobile-accordion panel-sheen rounded-3xl border border-blue-100 bg-white/95 shadow-panel md:hidden">
      <button type="button" className="flex w-full cursor-pointer items-start justify-between gap-3 p-3.5 text-left" aria-expanded={isOpen} onClick={() => setIsOpen((current) => !current)}>
        <span className="min-w-0">
          <span className="block text-base font-black text-slate-950">{title}</span>
          {summary ? <span className="mt-1 block break-words text-xs font-bold leading-5 text-slate-500">{summary}</span> : null}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {badge}
          <span className={`co-mobile-toggle-pill rounded-full px-2.5 py-1 text-xs font-black ${isOpen ? "is-active bg-blue-700 text-white" : "bg-blue-50 text-blue-700"}`}>{isOpen ? "Hide ^" : "Show v"}</span>
        </span>
      </button>
      {isOpen ? <div className="border-t border-blue-100 p-3.5">
        {children}
      </div> : null}
    </div>
  );
}

export function TimeMobileFieldGroup({ title, summary, defaultOpen = false, children }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="co-mobile-field-group rounded-2xl border border-blue-100 bg-white">
      <button type="button" className="flex w-full cursor-pointer items-center justify-between gap-3 px-3 py-2.5 text-left" aria-expanded={isOpen} onClick={() => setIsOpen((current) => !current)}>
        <span className="min-w-0">
          <span className="block text-sm font-black text-slate-950">{title}</span>
          {summary ? <span className="mt-0.5 block text-xs font-bold text-slate-500">{summary}</span> : null}
        </span>
        <span className="co-mobile-toggle-pill shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-black text-blue-700">{isOpen ? "Hide ^" : "Show v"}</span>
      </button>
      {isOpen ? <div className="grid gap-3 border-t border-blue-100 p-3">
        {children}
      </div> : null}
    </div>
  );
}

export function RecentTimeEntriesCard({ entries, title = "Recent entries", description, emptyTitle = "No time entries yet", emptyDescription = "Clock in to start your first time entry.", showUser = false, compact = false, compactMobile = false }) {
  const safeEntries = Array.isArray(entries) ? entries : [];
  const content = safeEntries.length === 0 ? (
    <StateCard title={emptyTitle} description={emptyDescription} tone="slate" />
  ) : (
    <div className={compactMobile ? "space-y-2.5 md:space-y-3" : "space-y-3"}>
      {safeEntries.map((entry) => <TimeEntryCard key={entry.id} entry={entry} showUser={showUser} compact={compact} compactMobile={compactMobile} />)}
    </div>
  );

  if (compactMobile) {
    return (
      <>
        <TimeMobileAccordionCard title={title} summary={`${safeEntries.length} visible entries`} badge={<Badge tone="slate">{safeEntries.length}</Badge>}>
          {content}
        </TimeMobileAccordionCard>
        <Card className="hidden p-5 md:block">
          <SectionHeader title={title} description={description} />
          {content}
        </Card>
      </>
    );
  }

  return (
    <Card className={compactMobile ? "p-3.5 md:p-5" : "p-5"}>
      <SectionHeader title={title} description={description} />
      {content}
    </Card>
  );
}

export function TimeEntryCard({ entry, showUser = false, compact = false, compactMobile = false }) {
  return (
    <div className={compactMobile ? "co-mobile-record-card rounded-2xl border border-blue-100 bg-white p-3 md:p-4" : "rounded-2xl border border-blue-100 bg-white p-4"}>
      <div className={compactMobile ? "flex flex-wrap items-start justify-between gap-2.5" : "flex flex-wrap items-start justify-between gap-3"}>
        <div className="min-w-0">
          <p className={compactMobile ? "break-words text-[13px] font-black text-slate-950 md:text-sm" : "break-words text-sm font-black text-slate-950"}>{entry.jobTitle || workCategoryLabel(entry.workCategory)}</p>
          <p className="mt-1 break-words text-xs font-bold text-slate-500">{entry.workCategory === "job" ? (entry.address || "Jobsite details pending") : workCategoryLabel(entry.workCategory)}</p>
          {showUser ? <p className="mt-1 break-words text-xs font-bold text-slate-500">{entry.userName}</p> : null}
        </div>
        <TimeStatusBadge status={entry.status} />
      </div>
      <div className={`${compactMobile ? "mt-2.5 gap-2.5 md:mt-3 md:gap-3" : "mt-3 gap-3"} grid ${compact ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Clock in</p>
          <p className={compactMobile ? "mt-1 text-[13px] font-bold text-slate-700 md:text-sm" : "mt-1 text-sm font-bold text-slate-700"}>{timeEntryDateTimeLabel(entry.clockInAt)}</p>
        </div>
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Clock out</p>
          <p className={compactMobile ? "mt-1 text-[13px] font-bold text-slate-700 md:text-sm" : "mt-1 text-sm font-bold text-slate-700"}>{entry.clockOutAt ? timeEntryDateTimeLabel(entry.clockOutAt) : "Still active"}</p>
        </div>
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Total</p>
          <p className={compactMobile ? "mt-1 text-[13px] font-bold text-slate-700 md:text-sm" : "mt-1 text-sm font-bold text-slate-700"}>{entry.status === "completed" ? formatMinutes(entry.totalMinutes) : "In progress"}</p>
        </div>
      </div>
      <div className={compactMobile ? "mt-2.5 flex flex-wrap gap-1.5 md:mt-3 md:gap-2" : "mt-3 flex flex-wrap gap-2"}>
        <Badge tone="slate">{workCategoryLabel(entry.workCategory)}</Badge>
        <Badge tone="slate">Break {formatMinutes(entry.breakMinutes)}</Badge>
        {entry.scheduledStart ? <Badge tone="blue">{timeEntryDateTimeLabel(entry.scheduledStart)}</Badge> : null}
      </div>
      {entry.notes ? <p className={compactMobile ? "mt-2.5 text-[13px] leading-5 text-slate-600 md:mt-3 md:text-sm md:leading-6" : "mt-3 text-sm leading-6 text-slate-600"}>{entry.notes}</p> : null}
    </div>
  );
}

export function WeekSummaryCard({ summary, title = "This Week", description, compactMobile = false }) {
  const cardClassName = compactMobile ? "p-3.5 md:p-5" : "p-5";
  const metricCardClassName = compactMobile ? "rounded-2xl border border-blue-100 bg-blue-50/50 p-3 md:p-4" : "rounded-2xl border border-blue-100 bg-blue-50/50 p-4";
  const metricValueClassName = compactMobile ? "mt-1 text-lg font-black text-slate-950 md:mt-2 md:text-xl" : "mt-2 text-xl font-black text-slate-950";
  const sectionCardClassName = compactMobile ? "rounded-2xl border border-blue-100 p-3 md:p-4" : "rounded-2xl border border-blue-100 p-4";
  const outerGridClassName = compactMobile ? "grid gap-2.5 sm:grid-cols-3" : "grid gap-3 sm:grid-cols-3";
  const lowerGridClassName = compactMobile ? "mt-3 grid gap-3 lg:grid-cols-2" : "mt-4 grid gap-4 lg:grid-cols-2";
  const summaryText = `Worked ${formatMinutes(summary.totalMinutes)} / Breaks ${formatMinutes(summary.breakMinutes)} / ${summary.groupedBreakdown.length} categories`;
  const content = (
    <>
      <div className={outerGridClassName}>
        <div className={metricCardClassName}>
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Worked</p>
          <p className={metricValueClassName}>{formatMinutes(summary.totalMinutes)}</p>
        </div>
        <div className={metricCardClassName}>
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Breaks</p>
          <p className={metricValueClassName}>{formatMinutes(summary.breakMinutes)}</p>
        </div>
        <div className={metricCardClassName}>
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Categories</p>
          <p className={metricValueClassName}>{summary.groupedBreakdown.length}</p>
        </div>
      </div>
      <div className={lowerGridClassName}>
        <div className={sectionCardClassName}>
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Daily breakdown</p>
          <div className="mt-3 space-y-2">
            {summary.dayBreakdown.map((day) => (
              <div key={day.label} className="flex items-center justify-between text-sm">
                <span className="font-bold text-slate-600">{day.label}</span>
                <span className="font-black text-slate-950">{day.minutes ? formatMinutes(day.minutes) : "No time yet"}</span>
              </div>
            ))}
          </div>
        </div>
        <div className={sectionCardClassName}>
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Job / category breakdown</p>
          {summary.groupedBreakdown.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No time logged this week yet.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {summary.groupedBreakdown.map((group) => (
                <div key={group.label} className="flex items-center justify-between text-sm">
                  <span className="font-bold text-slate-600">{group.label}</span>
                  <span className="font-black text-slate-950">{formatMinutes(group.minutes)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );

  if (compactMobile) {
    return (
      <>
        <TimeMobileAccordionCard title={title} summary={summaryText} badge={summary.activeEntry ? <TimeStatusBadge status={summary.activeEntry.status} /> : null}>
          {content}
        </TimeMobileAccordionCard>
        <Card className="hidden p-5 md:block">
          <SectionHeader title={title} description={description} action={summary.activeEntry ? <TimeStatusBadge status={summary.activeEntry.status} /> : null} />
          {content}
        </Card>
      </>
    );
  }

  return (
    <Card className={cardClassName}>
      <SectionHeader title={title} description={description} action={summary.activeEntry ? <TimeStatusBadge status={summary.activeEntry.status} /> : null} />
      {content}
    </Card>
  );
}
