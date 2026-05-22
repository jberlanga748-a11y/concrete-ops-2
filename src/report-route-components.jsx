import { useState } from "react";

import { Badge } from "./app-shell-components";
import { jobTitle } from "./job-utils";
import { reportStatusLabel } from "./report-utils";

export function DailyReportStatusBadge({ status }) {
  const tone = status === "reviewed"
    ? "green"
    : status === "submitted"
      ? "orange"
      : status === "reopened"
        ? "amber"
        : status === "archived"
          ? "slate"
          : "violet";

  return <Badge tone={tone}>{reportStatusLabel(status)}</Badge>;
}

export function DailyReportMobileAccordionCard({ title, summary, badge, defaultOpen = false, children }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`co-mobile-accordion rounded-2xl border bg-white/95 shadow-sm md:hidden ${isOpen ? "is-open border-orange-200" : "border-slate-200"}`}>
      <button type="button" className="flex w-full cursor-pointer items-center justify-between gap-3 px-3 py-2.5 text-left" aria-expanded={isOpen} onClick={() => setIsOpen((current) => !current)}>
        <span className="min-w-0">
          <span className="block truncate text-sm font-black text-slate-950">{title}</span>
          {summary ? <span className="mt-0.5 block truncate text-xs font-bold text-slate-500">{summary}</span> : null}
        </span>
        <span className="flex shrink-0 items-center gap-1.5">
          {badge}
          <span className={`co-mobile-toggle-pill inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-black ${isOpen ? "is-active bg-orange-600 text-white" : "bg-orange-50 text-orange-700"}`}>
            {isOpen ? "Hide" : "Show"}
            <span aria-hidden="true">{isOpen ? "^" : "v"}</span>
          </span>
        </span>
      </button>
      {isOpen ? <div className="border-t border-slate-200 p-2.5">
        {children}
      </div> : null}
    </div>
  );
}

export function DailyReportMobileFieldGroup({ title, summary, defaultOpen = false, children }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="co-mobile-field-group rounded-2xl border border-slate-200 bg-white">
      <button type="button" className="flex w-full cursor-pointer items-center justify-between gap-3 px-3 py-2.5 text-left" aria-expanded={isOpen} onClick={() => setIsOpen((current) => !current)}>
        <span className="min-w-0">
          <span className="block text-sm font-black text-slate-950">{title}</span>
          {summary ? <span className="mt-0.5 block text-xs font-bold text-slate-500">{summary}</span> : null}
        </span>
        <span className="co-mobile-toggle-pill shrink-0 rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-black text-orange-700">{isOpen ? "Hide ^" : "Show v"}</span>
      </button>
      {isOpen ? <div className="grid gap-3 border-t border-slate-200 p-3">
        {children}
      </div> : null}
    </div>
  );
}

export function DailyReportMobileCard({ report, selected, onSelect }) {
  return (
    <button type="button" onClick={() => onSelect(report.id)} className={`co-mobile-record-card w-full rounded-2xl border p-3 text-left transition ${selected ? "is-selected border-orange-200 bg-orange-50/80" : "border-slate-200 bg-white hover:border-orange-200 hover:bg-orange-50/50"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words text-sm font-black text-slate-950">{jobTitle(report.job)}</p>
          <p className="mt-1 break-words text-xs font-bold text-slate-500">{report.reportDate} / {report.createdByName}</p>
        </div>
        <DailyReportStatusBadge status={report.status} />
      </div>
      <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-600">{report.workPerformed || report.crewSummary || report.weather || "No report details yet."}</p>
    </button>
  );
}

export function DailyReportsTable({ rows, selectedId, onSelect }) {
  return (
    <div className="table-shell">
      <table className="w-full min-w-[920px] text-left">
        <thead className="border-b border-blue-100 bg-slate-50 text-[11px] font-black uppercase tracking-widest text-slate-500">
          <tr>
            <th className="px-4 py-3">Job</th>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Created by</th>
            <th className="px-4 py-3">Crew</th>
            <th className="px-4 py-3">Weather</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-blue-50">
          {rows.map((report) => {
            const selected = report.id === selectedId;
            return (
              <tr key={report.id} onClick={() => onSelect(report.id)} className={`cursor-pointer transition hover:bg-blue-50/60 ${selected ? "bg-blue-50/80" : ""}`}>
                <td className="px-4 py-3">
                  <p className="font-black text-slate-950">{jobTitle(report.job)}</p>
                  <p className="text-xs font-bold text-slate-500">{report.id}</p>
                </td>
                <td className="px-4 py-3 text-sm font-bold text-slate-700">{report.reportDate}</td>
                <td className="px-4 py-3"><DailyReportStatusBadge status={report.status} /></td>
                <td className="px-4 py-3 text-sm font-bold text-slate-700">{report.createdByName}</td>
                <td className="px-4 py-3 text-sm font-bold text-slate-500">{report.crewSummary || "No crew summary"}</td>
                <td className="px-4 py-3 text-sm font-bold text-slate-500">{report.weather || "Not set"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
