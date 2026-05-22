import { useState } from "react";

import { Badge, Icon } from "./app-shell-components";
import { formatMinutes, timeStatusTone } from "./time-utils";

export function TimeStatusBadge({ status }) {
  return <Badge tone={timeStatusTone(status)}>{status === "on_break" ? "On Break" : status === "completed" ? "Completed" : "Active"}</Badge>;
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
