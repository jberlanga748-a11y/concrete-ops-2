import { missingInfoTone } from "../shared/leadMissingInfo.js";
import { leadScoreTone } from "../shared/leadScoring.js";
import { Badge, Icon, StatusBadge } from "./app-shell-components";
import { deriveLeadPilotWorkflowReadiness } from "./lead-utils";

function todayDateInputValue() {
  return new Date().toISOString().slice(0, 10);
}

export function leadSourceLabel(source) {
  return source === "public_request_form" ? "Public request form" : source;
}

export function leadContactPhone(lead = {}) {
  return lead.phone || lead.contactPhone || lead.customerPhone || lead.primaryPhone || "";
}

export function leadContactEmail(lead = {}) {
  return lead.email || lead.contactEmail || lead.customerEmail || lead.primaryEmail || "";
}

export function formatLeadFollowUpDate(value) {
  if (!value) return "Not set";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
}

export function isLeadFollowUpDue(lead = {}, today = todayDateInputValue()) {
  if (!lead.followUpDueAt) return false;
  return String(lead.followUpDueAt).slice(0, 10) <= today;
}

export function isLeadReadyForEstimate(lead = {}) {
  const status = String(lead.status || "").toLowerCase();
  const nextStep = String(lead.nextStep || "").toLowerCase();
  return status.includes("site visit") || status.includes("estimate") || nextStep.includes("estimate") || nextStep.includes("proposal");
}

export function leadHasScore(lead = {}) {
  return Boolean(lead.scoredAt || lead.scoreSource || lead.fitLabel);
}

export function leadHasMissingInfoCheck(lead = {}) {
  return Boolean(lead.missingInfoCheckedAt || lead.missingInfoStatus);
}

export function LeadScoreBadge({ lead }) {
  if (!leadHasScore(lead)) return <Badge tone="slate">Not scored</Badge>;
  return <Badge tone={leadScoreTone(lead.fitLabel || lead.fitScore)}>{Number(lead.fitScore || 0)} / {lead.fitLabel || "Scored"}</Badge>;
}

export function LeadMissingInfoBadge({ lead }) {
  if (!leadHasMissingInfoCheck(lead)) return <Badge tone="slate">Info not checked</Badge>;
  const count = Number(lead.missingInfoCount || 0);
  const label = lead.missingInfoStatus === "Complete" ? "Info complete" : `Needs ${count} item${count === 1 ? "" : "s"}`;
  return <Badge tone={missingInfoTone(lead.missingInfoStatus || count)}>{label}</Badge>;
}

export function LeadsTable({ rows, selectedId, onSelect, maxRows = null, mobileMaxRows = null }) {
  const displayRows = maxRows ? rows.slice(0, maxRows) : rows;
  const mobileRows = mobileMaxRows ? rows.slice(0, mobileMaxRows) : displayRows;
  return (
    <>
      <div className="space-y-3 md:hidden">
        {mobileRows.map((row) => {
          const selected = row.id === selectedId;
          const followUpDue = isLeadFollowUpDue(row);
          const readyForEstimate = isLeadReadyForEstimate(row);
          return (
            <button
              key={row.id}
              type="button"
              onClick={() => onSelect(row.id)}
              className={`co-leads-mobile-card co-mobile-record-card co-office-list-card w-full rounded-[1.15rem] border p-4 text-left transition ${selected ? "is-selected border-orange-200 bg-orange-50/70" : "border-slate-200 bg-white hover:border-orange-200 hover:bg-orange-50/30"} ${followUpDue ? "is-due" : ""} ${readyForEstimate ? "is-ready" : ""}`}
            >
              <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="break-words text-lg font-black text-slate-950">{row.customer || "Unnamed lead"}</p>
                  <p className="mt-1 break-words text-xs font-bold text-slate-500">{row.id} / {row.city}</p>
                </div>
                <div className="shrink-0">
                  <StatusBadge status={row.status} />
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Project</p>
                  <p className="mt-1 break-words text-sm font-bold text-slate-700">{row.project || "No project yet"}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Next step</p>
                  <p className="mt-1 break-words text-sm font-bold text-slate-700">{row.nextStep || "Add next step"}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Source</p>
                  <p className="mt-1 break-words text-sm font-bold text-slate-700">{leadSourceLabel(row.source || "Call-in")}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Follow-up</p>
                  <p className="mt-1 break-words text-sm font-black text-slate-950">{formatLeadFollowUpDate(row.followUpDueAt)}</p>
                </div>
              </div>
              <div className="mt-4 flex min-w-0 flex-wrap items-center gap-2">
                <Badge tone={row.priority === "High" ? "amber" : row.priority === "Low" ? "slate" : "blue"}>{row.priority}</Badge>
                <LeadScoreBadge lead={row} />
                <LeadMissingInfoBadge lead={row} />
                {selected ? <Badge tone="blue">Selected</Badge> : null}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <span className="co-leads-row-action justify-center">
                  <Icon name="document" />
                  Review
                </span>
                <span className="co-leads-row-action justify-center">
                  <Icon name="arrowUpRight" />
                  Open
                </span>
              </div>
            </button>
          );
        })}
      </div>
      <div className="hidden md:block">
        <div className="table-shell">
          <table className="co-leads-command-table w-full min-w-[760px] text-left">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-black uppercase tracking-widest text-slate-500">
              <tr>
                <th className="px-4 py-3">Customer / Company</th>
                <th className="px-4 py-3">Project Type</th>
                <th className="px-4 py-3">City</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Next Step</th>
                <th className="px-4 py-3">Follow-Up</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayRows.map((row) => {
                const selected = row.id === selectedId;
                const followUpDue = isLeadFollowUpDue(row);
                const readyForEstimate = isLeadReadyForEstimate(row);
                return (
                  <tr key={row.id} onClick={() => onSelect(row.id)} className={`co-leads-command-row cursor-pointer transition hover:bg-orange-50/45 ${selected ? "is-selected bg-orange-50/70" : ""} ${followUpDue ? "is-due" : ""} ${readyForEstimate ? "is-ready" : ""}`}>
                    <td className="px-4 py-3">
                      <p className="co-leads-table-title font-black text-slate-950">{row.customer}</p>
                      <p className="co-leads-table-meta text-xs font-bold text-slate-500">{row.id} / {row.city}</p>
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-slate-700"><span className="co-leads-table-copy">{row.project || "No project yet"}</span></td>
                    <td className="px-4 py-3 text-sm font-bold text-slate-600"><span className="truncate">{row.city || "No city"}</span></td>
                    <td className="px-4 py-3 text-sm font-bold text-slate-600"><span className="co-leads-table-copy">{leadSourceLabel(row.source || "Call-in")}</span></td>
                    <td className="px-4 py-3"><StatusBadge status={row.status || "New"} /></td>
                    <td className="max-w-[260px] px-4 py-3 text-sm font-bold text-slate-600">
                      <span className="co-leads-table-copy">{row.nextStep || "Add next step"}</span>
                    </td>
                    <td className="px-4 py-3 text-sm font-black text-slate-950">{formatLeadFollowUpDate(row.followUpDueAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button type="button" className="co-leads-icon-button" onClick={(event) => { event.stopPropagation(); onSelect(row.id); }} aria-label={`Review ${row.customer || "lead"}`}>
                          <Icon name="document" />
                        </button>
                        <button type="button" className="co-leads-icon-button" onClick={(event) => { event.stopPropagation(); onSelect(row.id); }} aria-label={`Open ${row.customer || "lead"}`}>
                          <Icon name="arrowUpRight" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export function LeadPilotWorkflowReadinessCard({ lead, customers = [] }) {
  const readiness = deriveLeadPilotWorkflowReadiness(lead, { customers });

  return (
    <div className="rounded-3xl border border-orange-100 bg-orange-50/70 p-4">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-black text-slate-950">Pilot workflow readiness</p>
            <Badge tone={readiness.tone}>{readiness.status}</Badge>
            <Badge tone="slate">{readiness.readyCount} / {readiness.totalCount}</Badge>
          </div>
          <p className="mt-1 text-sm leading-6 text-slate-600">{readiness.summary}</p>
        </div>
        <div className="rounded-2xl border border-orange-100 bg-white px-3 py-2 text-sm font-black text-orange-800">
          {readiness.nextAction}
        </div>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {readiness.steps.map((step) => (
          <div key={step.id} className={`rounded-2xl border p-3 ${step.complete ? "border-emerald-100 bg-white" : "border-amber-100 bg-white"}`}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">{step.label}</p>
              <Badge tone={step.complete ? "green" : "amber"}>{step.complete ? "Ready" : "Needed"}</Badge>
            </div>
            <p className="mt-2 text-xs font-bold leading-5 text-slate-600">{step.helper}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs font-bold text-slate-500">Pilot path: lead or estimate to job setup to photo/proof to owner follow-up. Nothing is sent or automated from this card.</p>
    </div>
  );
}
