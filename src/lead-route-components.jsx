import { useState } from "react";

import { missingInfoTone } from "../shared/leadMissingInfo.js";
import { leadScoreTone } from "../shared/leadScoring.js";
import { CONSTRUCTION_TRADE_PROFILES } from "../shared/constructionTrades.js";
import { Badge, Button, Card, Icon, InputField, SectionHeader, SelectField, StateCard, StatusBadge, TextAreaField } from "./app-shell-components";
import { deriveLeadPilotWorkflowReadiness } from "./lead-utils";

export const LEAD_SOURCE_OPTIONS = ["Website", "Referral", "Call-in", "Drive-by", "Repeat Customer", "Partner", "Lead Finder", "Opportunity Scout", "public_request_form"];

function todayDateInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function formatDateTime(value) {
  if (!value) return "Not recorded";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
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

export function LeadIntakeCard({ draft, setDraft, onCreateLead, disabled, canManage, customers = [], users = [] }) {
  if (!canManage) {
    return (
      <Card className="p-5">
        <SectionHeader title="New lead intake" description="Lead creation is restricted to office management roles." />
        <StateCard title="Read-only access" description="You can review the pipeline, but only owner/admin/operations roles can create or update leads." tone="slate" />
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <SectionHeader title="New lead intake" description="Create a new lead record for the office team." />
      <form className="grid gap-3" onSubmit={onCreateLead}>
        <div className="grid gap-3 md:grid-cols-2">
          <SelectField label="Existing customer" value={draft.customerId} onChange={(event) => {
            const selectedCustomer = customers.find((customer) => customer.id === event.target.value);
            setDraft((current) => ({
              ...current,
              customerId: event.target.value,
              customer: selectedCustomer?.name || current.customer,
              city: selectedCustomer?.city || current.city,
            }));
          }}>
            <option value="">Create or match automatically</option>
            {customers.filter((customer) => !customer.archivedAt).map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
          </SelectField>
          <InputField label="Customer" value={draft.customer} onChange={(event) => setDraft((current) => ({ ...current, customer: event.target.value }))} placeholder="Dana Martinez" />
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <InputField label="City" value={draft.city} onChange={(event) => setDraft((current) => ({ ...current, city: event.target.value }))} placeholder="Albany" />
          <InputField label="Project" value={draft.project} onChange={(event) => setDraft((current) => ({ ...current, project: event.target.value }))} placeholder="Front walkway replacement" />
          <InputField label="Follow-up due" type="date" value={draft.followUpDueAt} onChange={(event) => setDraft((current) => ({ ...current, followUpDueAt: event.target.value }))} />
        </div>
        <SelectField label="Trade / work type" value={draft.trade || ""} onChange={(event) => setDraft((current) => ({ ...current, trade: event.target.value }))}>
          <option value="">Use company default / infer from notes</option>
          {CONSTRUCTION_TRADE_PROFILES.map((trade) => (
            <option key={trade.id} value={trade.id}>{trade.label}</option>
          ))}
        </SelectField>
        <div className="grid gap-3 md:grid-cols-4">
          <SelectField label="Status" value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))}>
            <option>New</option>
            <option>Contacted</option>
            <option>Site Visit</option>
            <option>Estimate Sent</option>
            <option>Approved</option>
          </SelectField>
          <SelectField label="Priority" value={draft.priority} onChange={(event) => setDraft((current) => ({ ...current, priority: event.target.value }))}>
            <option>Low</option>
            <option>Normal</option>
            <option>High</option>
          </SelectField>
          <SelectField label="Owner" value={draft.ownerId} onChange={(event) => setDraft((current) => ({ ...current, ownerId: event.target.value }))}>
            <option value="">Unassigned</option>
            {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
          </SelectField>
          <SelectField label="Lead source" value={draft.source} onChange={(event) => setDraft((current) => ({ ...current, source: event.target.value }))}>
            {LEAD_SOURCE_OPTIONS.map((source) => <option key={source} value={source}>{leadSourceLabel(source)}</option>)}
          </SelectField>
          <InputField label="Value" type="number" value={draft.value} onChange={(event) => setDraft((current) => ({ ...current, value: event.target.value }))} placeholder="8200" />
        </div>
        <InputField label="Next step" value={draft.nextStep} onChange={(event) => setDraft((current) => ({ ...current, nextStep: event.target.value }))} placeholder="Schedule site measure" />
        <TextAreaField label="Notes" value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} placeholder="Gate access, finish details, timing notes..." />
        <Button type="submit" disabled={disabled}>
          <Icon name="plus" />
          Add lead
        </Button>
      </form>
    </Card>
  );
}

export function LeadScoreCard({ lead, canManage = false, disabled = false, onScoreLead = () => {} }) {
  const hasScore = leadHasScore(lead);
  const risks = Array.isArray(lead?.fitRisks) ? lead.fitRisks : [];
  return (
    <div className="rounded-3xl border border-blue-100 bg-blue-50/60 p-4">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-black text-slate-950">Rule-based lead score</p>
            <LeadScoreBadge lead={lead} />
            {hasScore ? <Badge tone="slate">Rule-Based</Badge> : null}
          </div>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            {hasScore ? lead.fitReason || "Local rules scored this lead." : "Score this lead with local business rules. No AI, scraping, or external calls are used."}
          </p>
        </div>
        {canManage ? (
          <Button type="button" className="w-full sm:w-auto" onClick={() => onScoreLead(lead)} disabled={disabled || Boolean(lead.archivedAt)}>
            {hasScore ? "Re-score Lead" : "Score Lead"}
          </Button>
        ) : null}
      </div>
      {hasScore ? (
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-blue-100 bg-white p-3">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Recommended next step</p>
            <p className="mt-1 text-sm font-bold leading-6 text-slate-700">{lead.fitNextStep || "Review and choose the next office step."}</p>
          </div>
          <div className="rounded-2xl border border-blue-100 bg-white p-3">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Risks / missing info</p>
            {risks.length > 0 ? (
              <ul className="mt-1 space-y-1 text-sm font-bold leading-6 text-slate-700">
                {risks.slice(0, 4).map((risk) => <li key={risk}>- {risk}</li>)}
              </ul>
            ) : (
              <p className="mt-1 text-sm font-bold text-emerald-700">No major rule-based risks found.</p>
            )}
          </div>
          <p className="text-xs font-bold text-slate-500 md:col-span-2">Scored {formatDateTime(lead.scoredAt)}. Scores are office-only and based on saved lead/source fields.</p>
        </div>
      ) : null}
    </div>
  );
}

export function LeadMissingInfoCard({ lead, canManage = false, disabled = false, onCheckMissingInfo = () => {} }) {
  const hasCheck = leadHasMissingInfoCheck(lead);
  const items = Array.isArray(lead?.missingInfoItems) ? lead.missingInfoItems : [];
  const required = items.filter((item) => item.severity === "required");
  const recommended = items.filter((item) => item.severity === "recommended");
  const optional = items.filter((item) => item.severity === "optional");

  function MissingGroup({ title, rows, tone }) {
    if (rows.length === 0) return null;
    return (
      <div className="rounded-2xl border border-blue-100 bg-white p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{title}</p>
          <Badge tone={tone}>{rows.length}</Badge>
        </div>
        <div className="space-y-2">
          {rows.slice(0, 5).map((item) => (
            <div key={item.key} className="rounded-2xl border border-blue-50 bg-blue-50/50 p-3">
              <p className="text-sm font-black text-slate-950">{item.label}</p>
              <p className="mt-1 text-xs font-bold leading-5 text-slate-600">{item.reason}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-amber-100 bg-amber-50/60 p-4">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-black text-slate-950">Missing Info Checker</p>
            <LeadMissingInfoBadge lead={lead} />
            <Badge tone="slate">Rule-Based</Badge>
          </div>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            {hasCheck ? lead.missingInfoNextStep || "Review missing lead details before estimating." : "Check required and recommended lead details before spending time estimating or following up."}
          </p>
        </div>
        {canManage ? (
          <Button type="button" className="w-full sm:w-auto" onClick={() => onCheckMissingInfo(lead)} disabled={disabled || Boolean(lead.archivedAt)}>
            {hasCheck ? "Re-check Missing Info" : "Check Missing Info"}
          </Button>
        ) : null}
      </div>
      {hasCheck ? (
        <div className="mt-3 space-y-3">
          {lead.missingInfoStatus === "Needs Info" ? (
            <p className="rounded-2xl border border-amber-100 bg-white px-3 py-2 text-sm font-black text-amber-800">Fill missing info before estimating.</p>
          ) : (
            <p className="rounded-2xl border border-emerald-100 bg-white px-3 py-2 text-sm font-black text-emerald-800">Core lead info is complete enough for office follow-up or estimating.</p>
          )}
          <div className="grid gap-3 lg:grid-cols-3">
            <MissingGroup title="Required" rows={required} tone="red" />
            <MissingGroup title="Recommended" rows={recommended} tone="amber" />
            <MissingGroup title="Optional" rows={optional} tone="slate" />
          </div>
          {items.length === 0 ? <p className="text-sm font-bold text-emerald-700">No missing items found.</p> : null}
          <p className="text-xs font-bold text-slate-500">Checked {formatDateTime(lead.missingInfoCheckedAt)}. Missing info checks are office-only and use saved lead/source fields.</p>
        </div>
      ) : null}
    </div>
  );
}

export function LeadAiAssistantCard({ lead, canManage = false, disabled = false, assistant = null, onGenerateLeadAssistant = () => {} }) {
  const [copyMessage, setCopyMessage] = useState("");
  if (!canManage) return null;

  const result = assistant?.result || null;
  const loading = Boolean(assistant?.loading);
  const message = assistant?.error || result?.message || "";
  const generated = Boolean(result?.configured && result?.ok);
  const unavailable = Boolean(message && !generated);

  async function copyText(label, value) {
    if (!value) return;
    if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
      setCopyMessage("Copy is not available in this browser. Select the draft text and copy it manually.");
      return;
    }
    await navigator.clipboard.writeText(value);
    setCopyMessage(`${label} copied.`);
  }

  function DraftBlock({ title, value, copyLabel }) {
    if (!value) return null;
    return (
      <div className="rounded-2xl border border-blue-100 bg-white p-3">
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{title}</p>
          <Button type="button" size="sm" variant="secondary" onClick={() => copyText(copyLabel || title, value)}>Copy</Button>
        </div>
        <p className="mt-2 whitespace-pre-wrap text-sm font-bold leading-6 text-slate-700">{value}</p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-sky-100 bg-sky-50/60 p-4">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-black text-slate-950">AI Lead Assistant</p>
            <Badge tone="blue">Draft only</Badge>
            <Badge tone="slate">Office review</Badge>
          </div>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Generate review-only lead help: summary, next step, missing info questions, email/SMS drafts, call script, and estimating handoff notes. Nothing is sent.
          </p>
        </div>
        <Button type="button" className="w-full sm:w-auto" onClick={() => onGenerateLeadAssistant(lead)} disabled={disabled || loading || Boolean(lead.archivedAt)}>
          {loading ? "Generating..." : generated ? "Regenerate" : "Generate AI Lead Drafts"}
        </Button>
      </div>

      {unavailable ? (
        <p className="mt-3 rounded-2xl border border-amber-100 bg-white px-3 py-2 text-sm font-bold text-amber-800">{message}</p>
      ) : null}

      {generated ? (
        <div className="mt-3 space-y-3">
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-2xl border border-blue-100 bg-white p-3">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">AI summary</p>
              <p className="mt-2 text-sm font-bold leading-6 text-slate-700">{result.leadSummary || "Review the lead details before follow-up."}</p>
            </div>
            <div className="rounded-2xl border border-blue-100 bg-white p-3">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Recommended next step</p>
              <p className="mt-2 text-sm font-bold leading-6 text-slate-700">{result.recommendedNextStep || "Choose the next office action."}</p>
              {result.suggestedFollowUpTiming ? <p className="mt-2 text-xs font-bold text-slate-500">Suggested timing: {result.suggestedFollowUpTiming}</p> : null}
              {result.suggestedStatus ? <Badge tone="blue">{result.suggestedStatus}</Badge> : null}
            </div>
          </div>

          {Array.isArray(result.missingInfoQuestions) && result.missingInfoQuestions.length > 0 ? (
            <div className="rounded-2xl border border-blue-100 bg-white p-3">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Missing info questions</p>
              <ul className="mt-2 space-y-1 text-sm font-bold leading-6 text-slate-700">
                {result.missingInfoQuestions.map((question) => <li key={question}>- {question}</li>)}
              </ul>
            </div>
          ) : null}

          <div className="grid gap-3 xl:grid-cols-2">
            <DraftBlock title="Follow-up email draft" value={result.followUpEmailDraft} copyLabel="Email draft" />
            <DraftBlock title="SMS/text draft" value={result.followUpSmsDraft} copyLabel="SMS draft" />
            <DraftBlock title="Call script" value={result.callScript} copyLabel="Call script" />
            <DraftBlock title="Estimating handoff notes" value={result.estimatingHandoffNotes} copyLabel="Estimating handoff notes" />
          </div>

          {Array.isArray(result.riskNotes) && result.riskNotes.length > 0 ? (
            <div className="rounded-2xl border border-amber-100 bg-white p-3">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Risk notes</p>
              <ul className="mt-2 space-y-1 text-sm font-bold leading-6 text-amber-800">
                {result.riskNotes.map((risk) => <li key={risk}>- {risk}</li>)}
              </ul>
            </div>
          ) : null}

          <p className="text-xs font-bold text-slate-500">AI drafts are review-only. Apex HQ does not send emails or texts from this card.</p>
          {copyMessage ? <p className="rounded-2xl border border-emerald-100 bg-white px-3 py-2 text-sm font-bold text-emerald-700">{copyMessage}</p> : null}
        </div>
      ) : null}
    </div>
  );
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
