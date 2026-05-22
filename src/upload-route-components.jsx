import { useState } from "react";

import { Badge } from "./app-shell-components";
import { gpsStatusLabel, uploadJobLabel, uploadTitle, uploadUploaderLabel } from "./upload-utils";

function uploadDateTimeLabel(value) {
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

function uploadFileSizeLabel(bytes) {
  const size = Number(bytes || 0);
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  if (size >= 1024) return `${Math.round(size / 1024)} KB`;
  return `${size} B`;
}

export function UploadListCard({ upload, selected, onSelect }) {
  return (
    <button type="button" onClick={() => onSelect(upload.id)} className={`co-mobile-record-card w-full min-w-0 max-w-full rounded-2xl border p-4 text-left transition ${selected ? "is-selected border-orange-200 bg-orange-50/70" : "border-slate-200 bg-white hover:border-orange-200 hover:bg-orange-50/50"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-black text-slate-950">{uploadTitle(upload)}</p>
          <p className="mt-1 break-words text-xs font-bold text-slate-500">{uploadJobLabel(upload)} / {uploadUploaderLabel(upload)}</p>
        </div>
        <Badge tone={upload.hasGps ? "green" : "slate"}>{gpsStatusLabel(upload)}</Badge>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
        <span>{uploadDateTimeLabel(upload.takenAt)}</span>
        <span>{uploadFileSizeLabel(upload.fileSize)}</span>
        {upload.archivedAt ? <span>Archived</span> : null}
      </div>
      {upload.notes ? <p className="mt-2 line-clamp-2 text-sm leading-5 text-slate-600">{upload.notes}</p> : null}
    </button>
  );
}

export function UploadMobileAccordionCard({ title, summary, badge, defaultOpen = false, children }) {
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

export function UploadMobileFieldGroup({ title, summary, defaultOpen = false, children }) {
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
