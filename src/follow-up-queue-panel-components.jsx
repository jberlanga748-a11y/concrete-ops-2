import { useMemo, useState } from "react";

import { Badge, Button, Card, Icon, SelectField, StateCard } from "./app-shell-components";
import {
  deriveFollowUpQueueState,
  filterFollowUpQueueItems,
  FOLLOW_UP_QUEUE_GROUPS,
  FOLLOW_UP_QUEUE_TYPE_FILTERS,
} from "./follow-up-queue-utils";
import { buildManualOutreachContactPayload } from "./manual-outreach-drafts";
import { ManualOutreachDraftPanel } from "./manual-outreach-panel-components";

function todayDateInputValue() {
  return new Date().toISOString().slice(0, 10);
}

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

function followUpTone(bucket) {
  return bucket === "overdue" ? "red" : bucket === "dueToday" ? "amber" : bucket === "waiting" ? "blue" : "slate";
}

function followUpBucketLabel(bucket) {
  return FOLLOW_UP_QUEUE_GROUPS.find((group) => group.id === bucket)?.label || "Follow-Up";
}

export function FollowUpQueuePanel({
  leads = [],
  customers = [],
  estimates = [],
  leadSources = [],
  contactHistory = [],
  permissions,
  companyName,
  user,
  disabled = false,
  onOpenLead = () => {},
  onOpenCustomer = () => {},
  onOpenEstimate = () => {},
  onOpenLeads = () => {},
  onCreateContactHistory = async () => false,
  compact = false,
  maxItems = 12,
}) {
  const canView = Boolean(permissions?.contactHistory?.canView && permissions?.leads?.canView);
  const canManage = Boolean(permissions?.contactHistory?.canManage);
  const [groupFilter, setGroupFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [draftItemId, setDraftItemId] = useState("");
  const today = todayDateInputValue();
  const queueState = useMemo(() => deriveFollowUpQueueState({
    leads,
    customers,
    estimates,
    leadSources,
    contactHistory,
  }, { today }), [contactHistory, customers, estimates, leadSources, leads, today]);
  const visibleItems = useMemo(() => filterFollowUpQueueItems(queueState.items, {
    group: groupFilter,
    type: typeFilter,
    query,
  }), [groupFilter, query, queueState.items, typeFilter]);
  const draftItem = useMemo(() => queueState.items.find((item) => item.id === draftItemId) || null, [draftItemId, queueState.items]);

  if (!canView) return null;

  function openItem(item) {
    if (item.type === "lead") onOpenLead(item.recordId);
    else if (item.type === "customer") onOpenCustomer(item.recordId);
    else if (item.type === "estimate") onOpenEstimate(item.recordId);
    else onOpenLeads();
  }

  async function runQueueAction(item, action, drafts = null) {
    if (!canManage || disabled) return;
    if (item.type === "leadSource") {
      onOpenLeads();
      setMessage("Open the Daily Source Check card below to mark this source checked.");
      return;
    }

    const normalizedAction = action === "log-email" ? "mark-email-sent" : action === "log-text" ? "mark-text-sent" : action === "waiting" ? "mark-waiting" : action;
    const payload = buildManualOutreachContactPayload(item, normalizedAction, {
      today,
      drafts,
      companyName,
      senderName: user?.name || companyName,
    });
    if (!payload) return;
    const didSave = await onCreateContactHistory(payload);
    if (didSave) {
      const label = normalizedAction === "follow-up-tomorrow"
        ? "Follow-up moved to tomorrow."
        : normalizedAction === "follow-up-two-days"
          ? "Follow-up moved out two days."
          : normalizedAction === "mark-waiting"
            ? "Marked waiting on response."
            : normalizedAction === "mark-email-sent"
              ? "Manual email draft logged as sent outside Apex HQ."
              : normalizedAction === "mark-text-sent"
                ? "Manual text draft logged as sent outside Apex HQ."
                : "Manual outreach logged.";
      setMessage(`${label} No email or text was sent.`);
    }
  }

  const stats = [
    { label: "Due Today", value: queueState.stats.dueToday, tone: "amber" },
    { label: "Overdue", value: queueState.stats.overdue, tone: "red" },
    { label: "Waiting", value: queueState.stats.waiting, tone: "blue" },
    { label: "Not Contacted", value: queueState.stats.notContacted, tone: "slate" },
  ];
  const visibleDisplayItems = visibleItems.slice(0, maxItems);

  if (compact) {
    return (
      <Card className="co-leads-followup-card co-leads-followup-compact overflow-hidden">
        <div className="co-leads-followup-header border-b border-slate-200 bg-white p-3">
          <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <h3 className="text-sm font-black uppercase tracking-[0.06em] text-slate-950">Follow-Up Queue / Office Action Board</h3>
              <p className="mt-1 text-xs font-bold leading-5 text-slate-600">Work the next calls, manual drafts, waiting records, and due follow-ups without opening every lead tool.</p>
            </div>
            <div className="co-leads-followup-stat-grid grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-4 xl:min-w-[430px]">
              {stats.map((stat) => (
                <div key={stat.label} className="co-leads-followup-stat">
                  <p>{stat.value}</p>
                  <span>{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="co-leads-followup-tabs mt-3 flex min-w-0 gap-2 overflow-x-auto pb-1">
            {FOLLOW_UP_QUEUE_GROUPS.slice(0, 7).map((group) => (
              <button
                key={group.id}
                type="button"
                className={groupFilter === group.id ? "is-active" : ""}
                onClick={() => setGroupFilter(group.id)}
              >
                {group.label}
              </button>
            ))}
          </div>
          {message ? <p className="mt-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">{message}</p> : null}
          <ManualOutreachDraftPanel
            item={draftItem}
            companyName={companyName}
            user={user}
            disabled={disabled}
            onClose={() => setDraftItemId("")}
            onAction={runQueueAction}
          />
        </div>

        <div className="hidden md:block">
          <div className="table-shell co-leads-followup-table-shell">
            <table className="co-leads-followup-table w-full min-w-[860px] text-left">
              <thead>
                <tr>
                  <th>Customer / Company</th>
                  <th>Last Contact</th>
                  <th>Next Step</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleDisplayItems.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <p className="font-black text-slate-950">{item.title}</p>
                      <p className="text-xs font-bold text-slate-500">{item.subtitle || item.type}</p>
                    </td>
                    <td className="text-sm font-bold text-slate-700">{item.lastContactedAt ? formatDateTime(item.lastContactedAt) : "Not contacted"}</td>
                    <td className="text-sm font-bold text-slate-700"><span className="line-clamp-2">{item.notesPreview || item.reason || "Review next action"}</span></td>
                    <td><Badge tone={followUpTone(item.bucket)}>{followUpBucketLabel(item.bucket)}</Badge></td>
                    <td>
                      <div className="flex justify-end gap-2">
                        <button type="button" className="co-leads-row-action" onClick={() => openItem(item)}>{item.actionLabel}</button>
                        {canManage && item.type !== "leadSource" ? <button type="button" className="co-leads-row-action" onClick={() => setDraftItemId(item.id)} disabled={disabled}>Draft / Copy</button> : null}
                        {canManage && item.type !== "leadSource" ? <button type="button" className="co-leads-icon-button" onClick={() => runQueueAction(item, "mark-waiting")} disabled={disabled} aria-label={`Mark ${item.title} waiting`}><Icon name="clock" /></button> : null}
                        {canManage && item.type !== "leadSource" ? <button type="button" className="co-leads-icon-button" onClick={() => runQueueAction(item, "follow-up-tomorrow")} disabled={disabled} aria-label={`Follow up with ${item.title} tomorrow`}><Icon name="clipboard" /></button> : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="co-leads-followup-mobile-list grid gap-2 p-3 md:hidden">
          {visibleDisplayItems.map((item) => (
            <div key={item.id} className="co-office-list-card rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-words text-sm font-black text-slate-950">{item.title}</p>
                  <p className="mt-1 break-words text-xs font-bold text-slate-500">{item.subtitle || item.reason}</p>
                </div>
                <Badge tone={followUpTone(item.bucket)}>{followUpBucketLabel(item.bucket)}</Badge>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button type="button" size="sm" variant="secondary" onClick={() => openItem(item)}>{item.actionLabel}</Button>
                {canManage && item.type !== "leadSource" ? <Button type="button" size="sm" onClick={() => setDraftItemId(item.id)} disabled={disabled}>Draft / Copy</Button> : null}
              </div>
            </div>
          ))}
          {visibleDisplayItems.length === 0 ? <StateCard title="Follow-up queue is clear" description="Due, overdue, waiting, not-contacted, and recently contacted records will appear here." tone="slate" /> : null}
        </div>

        <details className="co-leads-tool-disclosure co-leads-followup-filters mx-3 mb-3">
          <summary>
            <span>Search and queue filters</span>
            <span>{visibleItems.length} matching records</span>
          </summary>
          <div className="co-leads-followup-filter-grid mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_220px]">
            <input
              className="field-input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search follow-ups, customers, projects, notes..."
            />
            <SelectField label="Queue" value={groupFilter} onChange={(event) => setGroupFilter(event.target.value)}>
              {FOLLOW_UP_QUEUE_GROUPS.map((group) => <option key={group.id} value={group.id}>{group.label}</option>)}
            </SelectField>
            <SelectField label="Type" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
              {FOLLOW_UP_QUEUE_TYPE_FILTERS.map((type) => <option key={type.id} value={type.id}>{type.label}</option>)}
            </SelectField>
          </div>
        </details>

        <div className="co-leads-followup-footer flex min-w-0 flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-white px-3 py-2">
          <p className="text-xs font-black text-slate-500">Showing {visibleDisplayItems.length} of {visibleItems.length} follow-up records.</p>
          <button type="button" className="text-xs font-black text-orange-700" onClick={() => setGroupFilter("all")}>View all follow-up work</button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-blue-100 bg-white p-4">
        <div className="flex min-w-0 flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <Badge tone="amber">Follow-Up Queue</Badge>
            <h3 className="mt-2 text-base font-black text-slate-950">Manual outreach queue</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Leads, customers, estimates, and source checks needing office attention. No emails or texts are sent from here.
            </p>
          </div>
          <div className="grid min-w-0 gap-2 sm:grid-cols-4 xl:min-w-[560px]">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-blue-100 bg-blue-50/50 p-3">
                <p className="text-lg font-black text-slate-950">{stat.value}</p>
                <Badge tone={stat.value > 0 ? stat.tone : "slate"}>{stat.label}</Badge>
              </div>
            ))}
          </div>
        </div>
        {message ? <p className="mt-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">{message}</p> : null}
        <ManualOutreachDraftPanel
          item={draftItem}
          companyName={companyName}
          user={user}
          disabled={disabled}
          onClose={() => setDraftItemId("")}
          onAction={runQueueAction}
        />
        <div className="co-leads-followup-filter-grid mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_220px]">
          <input
            className="field-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search follow-ups, customers, projects, notes..."
          />
          <SelectField label="Queue" value={groupFilter} onChange={(event) => setGroupFilter(event.target.value)}>
            {FOLLOW_UP_QUEUE_GROUPS.map((group) => <option key={group.id} value={group.id}>{group.label}</option>)}
          </SelectField>
          <SelectField label="Type" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
            {FOLLOW_UP_QUEUE_TYPE_FILTERS.map((type) => <option key={type.id} value={type.id}>{type.label}</option>)}
          </SelectField>
        </div>
      </div>

      <div className="grid gap-3 p-4">
        {visibleItems.length > 0 ? visibleDisplayItems.map((item) => (
          <div key={item.id} className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
            <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="break-words text-sm font-black text-slate-950">{item.title}</p>
                  <Badge tone={followUpTone(item.bucket)}>{followUpBucketLabel(item.bucket)}</Badge>
                  <Badge tone="slate">{item.type === "leadSource" ? "Lead Source" : item.type[0].toUpperCase() + item.type.slice(1)}</Badge>
                </div>
                <p className="mt-1 break-words text-xs font-bold text-slate-500">{item.subtitle || "No extra context"}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.reason}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-slate-500">
                  <span>Last: {item.lastContactedAt ? formatDateTime(item.lastContactedAt) : "Not contacted"}</span>
                  <span>Next: {item.nextFollowUpDate || "Not scheduled"}</span>
                  {item.lastContactMethod ? <span>Method: {item.lastContactMethod}</span> : null}
                  {item.outcome ? <span>Outcome: {item.outcome}</span> : null}
                </div>
                {item.notesPreview ? <p className="mt-2 line-clamp-2 text-xs font-bold leading-5 text-slate-500">{item.notesPreview}</p> : null}
              </div>
              <div className="flex w-full flex-col gap-2 xl:w-auto xl:min-w-[240px]">
                <Button type="button" size="sm" variant="secondary" onClick={() => openItem(item)}>{item.actionLabel}</Button>
                {canManage && item.type !== "leadSource" ? (
                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                    <Button type="button" size="sm" onClick={() => setDraftItemId(item.id)} disabled={disabled}>Draft / Copy</Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => runQueueAction(item, "log-call")} disabled={disabled}>Log Manual Call</Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => runQueueAction(item, "log-email")} disabled={disabled}>Log Manual Email</Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => runQueueAction(item, "log-text")} disabled={disabled}>Log Manual Text</Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => runQueueAction(item, "waiting")} disabled={disabled}>Mark Waiting</Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => runQueueAction(item, "follow-up-tomorrow")} disabled={disabled}>Follow-Up Tomorrow</Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => runQueueAction(item, "follow-up-two-days")} disabled={disabled}>Follow-Up in 2 Days</Button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )) : (
          <StateCard title="Follow-up queue is clear" description="Due, overdue, waiting, not-contacted, and recently contacted records will appear here." tone="slate" />
        )}
      </div>
    </Card>
  );
}
