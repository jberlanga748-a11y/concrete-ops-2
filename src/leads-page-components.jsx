import { useMemo, useState } from "react";

import { CONSTRUCTION_TRADE_PROFILES } from "../shared/constructionTrades.js";
import { LEAD_SCORE_LABELS } from "../shared/leadScoring.js";
import { calculateNextLeadSourceCheckDate, createLeadSourceDraft, createLeadSourceDraftFromStarter, deriveDailySourceCheckState, deriveLeadSourceListState, leadSourceLocation, LEAD_SOURCE_CADENCE_OPTIONS, LEAD_SOURCE_STARTERS, LEAD_SOURCE_TYPE_OPTIONS, validateLeadSourcePayload } from "../shared/leadSources.js";
import { ApexOfficeCommandShell, Badge, Button, Card, DesktopCommandDrawer, FilterBar, InputField, SectionHeader, SelectField, StateCard, StatusBadge, TextAreaField } from "./app-shell-components";
import { ContactHistoryPanel } from "./contact-history-route-components";
import { contactHistoryTimeline } from "./contact-history-utils";
import { isEstimatorMobilePipelineUser } from "./estimator-mobile-utils";
import { deriveLeadInboxState } from "./lead-utils";
import { LEAD_SOURCE_OPTIONS, LeadIntakeCard, LeadMissingInfoBadge, LeadScoreBadge, formatLeadFollowUpDate, isLeadFollowUpDue, isLeadReadyForEstimate, leadContactEmail, leadContactPhone, leadHasMissingInfoCheck, leadHasScore, leadSourceLabel } from "./lead-route-components";
import { normalizeObjectArray, todayDateInputValue } from "./report-utils";

function currency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
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

function SaveStateText({ saveState, align = "left" }) {
  const palette = {
    idle: "text-slate-400",
    pending: "text-amber-600",
    saving: "text-blue-700",
    saved: "text-emerald-700",
    error: "text-red-700",
  };

  return (
    <p className={`text-xs font-black uppercase tracking-[0.14em] ${palette[saveState.status] || palette.idle} ${align === "right" ? "text-right" : ""}`}>
      {saveState.message}
    </p>
  );
}

function isLeadWaitingOnResponse(lead = {}) {
  const status = String(lead.status || "").toLowerCase();
  const nextStep = String(lead.nextStep || "").toLowerCase();
  return status.includes("waiting") || nextStep.includes("waiting") || nextStep.includes("response");
}

function LeadInboxReviewQueue({ inboxState, onSelectLead, onCreateEstimateFromLead = () => {}, onScoreLead = () => {}, onCheckMissingInfo = () => {}, canManage = false, canCreateEstimate = false, disabled = false }) {
  const stats = [
    { label: "New / Needs Review", value: inboxState.stats.newNeedsReview, tone: "blue" },
    { label: "Follow-Up Due", value: inboxState.stats.followUpDue, tone: "amber" },
    { label: "Missing Next Step", value: inboxState.stats.missingNextStep, tone: "amber" },
    { label: "Ready for Estimate", value: inboxState.stats.readyForEstimate, tone: "green" },
  ];
  const queueItems = inboxState.items.slice(0, 4);

  return (
    <Card className="p-4">
      <div className="flex min-w-0 flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <Badge tone="blue">Lead Inbox / Review Queue</Badge>
          <h3 className="mt-2 text-base font-black text-slate-950">Review these leads first</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            A simple landing zone for newly found, call-in, and follow-up leads before they become estimates.
          </p>
        </div>
        <div className="grid min-w-0 gap-2 sm:grid-cols-2 xl:min-w-[520px] xl:grid-cols-4">
          {stats.map((item) => (
            <div key={item.label} className="rounded-2xl border border-blue-100 bg-blue-50/50 p-3">
              <p className="text-xl font-black text-slate-950">{item.value}</p>
              <Badge tone={item.value > 0 ? item.tone : "slate"}>{item.label}</Badge>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 grid gap-2 xl:grid-cols-2">
        {queueItems.length > 0 ? queueItems.map((lead) => (
          <div key={lead.id} className="rounded-xl border border-blue-100 bg-white p-3 shadow-sm">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="break-words text-sm font-black text-slate-950">{lead.customer || "Unnamed lead"}</p>
                <p className="mt-1 break-words text-xs font-bold text-slate-500">
                  {[lead.project, lead.city || lead.state, leadSourceLabel(lead.source || "Call-in")].filter(Boolean).join(" / ")}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {lead.reviewReasons.map((reason) => <Badge key={reason.label} tone={reason.tone}>{reason.label}</Badge>)}
                  <LeadScoreBadge lead={lead} />
                  <LeadMissingInfoBadge lead={lead} />
                </div>
              </div>
              <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:min-w-[10rem]">
                <Button type="button" size="sm" variant="secondary" onClick={() => onSelectLead?.(lead.id)}>Review lead</Button>
                {canManage ? <Button type="button" size="sm" variant="secondary" onClick={() => onCheckMissingInfo(lead)} disabled={disabled || Boolean(lead.archivedAt)}>{leadHasMissingInfoCheck(lead) ? "Re-check info" : "Check info"}</Button> : null}
                {canManage ? <Button type="button" size="sm" variant="secondary" onClick={() => onScoreLead(lead)} disabled={disabled || Boolean(lead.archivedAt)}>{leadHasScore(lead) ? "Re-score" : "Score"}</Button> : null}
                {canCreateEstimate && lead.reviewReasons.some((reason) => reason.label === "Ready for Estimate") ? (
                  <Button type="button" size="sm" onClick={() => onCreateEstimateFromLead(lead)}>Create Estimate</Button>
                ) : null}
              </div>
            </div>
            <p className="mt-2 line-clamp-2 text-xs font-bold leading-5 text-slate-600">{lead.nextStep || lead.reviewReasons[0]?.helper || "Add a next step before this lead moves forward."}</p>
          </div>
        )) : (
          <StateCard title="Lead inbox is clear" description="New leads, due follow-ups, missing next steps, and estimate-ready leads will appear here." tone="slate" />
        )}
      </div>
    </Card>
  );
}

function DailySourceCheckPanel({
  sources = [],
  canManage = false,
  disabled = false,
  onMarkSourceChecked = async () => false,
  onStartLeadFromSource = () => {},
}) {
  const today = todayDateInputValue();
  const checkState = useMemo(() => deriveDailySourceCheckState(sources, { today }), [sources, today]);
  const [checkingSourceId, setCheckingSourceId] = useState("");
  const [checkDraft, setCheckDraft] = useState({ checkedAt: today, nextCheckAt: "", checkNote: "" });
  const [message, setMessage] = useState("");
  const activeSourceCount = normalizeObjectArray(sources).filter((source) => !source.archivedAt && String(source.status || "Active").toLowerCase() === "active").length;
  const checksToRun = checkState.stats.overdue + checkState.stats.dueToday;
  const sourceCheckTone = checkState.stats.overdue ? "red" : checksToRun ? "orange" : "green";
  const sourceCheckRunCards = [
    {
      label: "Run First",
      value: checksToRun,
      helper: checksToRun ? `${checkState.stats.overdue} overdue / ${checkState.stats.dueToday} due today` : "No source checks due.",
      tone: sourceCheckTone,
    },
    {
      label: "Coverage",
      value: activeSourceCount,
      helper: "Active manual sources feeding the job finder.",
      tone: activeSourceCount ? "blue" : "amber",
    },
    {
      label: "Recently Checked",
      value: checkState.stats.recentlyChecked,
      helper: "Newest source checks stay visible for audit trail.",
      tone: checkState.stats.recentlyChecked ? "green" : "slate",
    },
  ];

  function beginCheck(source) {
    const checkedAt = todayDateInputValue();
    setCheckingSourceId(source.id);
    setCheckDraft({
      checkedAt,
      nextCheckAt: calculateNextLeadSourceCheckDate(source.checkCadence, checkedAt),
      checkNote: "",
    });
    setMessage("");
  }

  function cancelCheck() {
    setCheckingSourceId("");
    setCheckDraft({ checkedAt: todayDateInputValue(), nextCheckAt: "", checkNote: "" });
  }

  function updateCheckedAt(value, source) {
    setCheckDraft((current) => ({
      ...current,
      checkedAt: value,
      nextCheckAt: calculateNextLeadSourceCheckDate(source.checkCadence, value),
    }));
  }

  async function submitCheck(event, source) {
    event.preventDefault();
    if (!canManage) return;
    const didSave = await onMarkSourceChecked(source.id, checkDraft);
    if (didSave) {
      setMessage(`${source.name} marked checked.`);
      cancelCheck();
    }
  }

  function startLead(source) {
    onStartLeadFromSource(source);
    setMessage(`Source context copied into the new lead form for ${source.name}.`);
  }

  function SourceActions({ source }) {
    const isChecking = checkingSourceId === source.id;
    return (
      <div className="mt-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {source.url ? (
            <a className="inline-flex min-w-0 max-w-full items-center justify-center rounded-2xl border border-blue-100 bg-white px-3 py-2 text-center text-xs font-black leading-tight text-slate-700 transition hover:bg-blue-50" href={source.url} target="_blank" rel="noreferrer">Open source URL</a>
          ) : null}
          {canManage ? <Button type="button" size="sm" onClick={() => beginCheck(source)} disabled={disabled}>Mark Checked</Button> : null}
          {canManage ? <Button type="button" size="sm" variant="secondary" onClick={() => startLead(source)} disabled={disabled}>Add Lead From Source</Button> : null}
        </div>
        {isChecking ? (
          <form onSubmit={(event) => submitCheck(event, source)} className="mt-3 rounded-2xl border border-blue-100 bg-blue-50/60 p-3">
            <div className="grid gap-3 md:grid-cols-2">
              <InputField label="Checked date" type="date" value={checkDraft.checkedAt} onChange={(event) => updateCheckedAt(event.target.value, source)} disabled={disabled} />
              <InputField label="Next check date" type="date" value={checkDraft.nextCheckAt} onChange={(event) => setCheckDraft((current) => ({ ...current, nextCheckAt: event.target.value }))} disabled={disabled} />
            </div>
            <TextAreaField label="Check note / result" value={checkDraft.checkNote} onChange={(event) => setCheckDraft((current) => ({ ...current, checkNote: event.target.value }))} disabled={disabled} placeholder="Example: no matching bids found today; check again next week." />
            <p className="mt-2 text-xs font-bold text-slate-500">Manual and as-needed cadences leave the next check blank unless you set one.</p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Button type="submit" size="sm" disabled={disabled}>Save Check</Button>
              <Button type="button" size="sm" variant="secondary" onClick={cancelCheck} disabled={disabled}>Cancel</Button>
            </div>
          </form>
        ) : null}
      </div>
    );
  }

  function SourceCard({ source, tone = "blue", helper }) {
    const scoutBrief = buildOpportunityScoutSourceBrief(source);
    return (
      <div className="co-source-check-card" data-tone={tone}>
        <div className="co-source-check-card-head">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="break-words text-sm font-black text-slate-950">{source.name || "Unnamed source"}</p>
              <Badge tone={tone}>{helper}</Badge>
            </div>
            <p className="mt-1 break-words text-xs font-bold text-slate-500">{[source.type, leadSourceLocation(source), source.checkCadence || "Manual"].filter(Boolean).join(" / ")}</p>
          </div>
          <div className="co-source-check-card-dates">
            <span>Last <strong>{source.lastCheckedAt || "Not set"}</strong></span>
            <span>Next <strong>{source.nextCheckAt || "Not scheduled"}</strong></span>
          </div>
        </div>
        <div className="co-source-check-brief" data-tone={tone}>
          <div className="co-source-check-brief-head">
            <span>Scout brief</span>
            <code>{scoutBrief.query}</code>
            <p>{scoutBrief.headline}</p>
          </div>
          <div className="co-source-check-brief-list">
            {scoutBrief.checkFor.map((item) => <em key={item}>{item}</em>)}
          </div>
          <p className="co-source-check-brief-result">{scoutBrief.resultPrompt}</p>
        </div>
        <SourceActions source={source} />
      </div>
    );
  }

  function SourceSection({ title, description, rows, emptyTitle, tone, helperForSource }) {
    return (
      <div className="min-w-0 space-y-3">
        <SectionHeader title={title} description={description} action={<Badge tone={rows.length > 0 ? tone : "slate"}>{rows.length}</Badge>} />
        {rows.length > 0 ? rows.slice(0, 6).map((source) => (
          <SourceCard key={`${title}-${source.id}`} source={source} tone={tone} helper={helperForSource(source)} />
        )) : <StateCard title={emptyTitle} description="Sources will appear here when their check dates match this bucket." tone="slate" />}
      </div>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="co-source-check-header border-b border-orange-100 bg-white p-4">
        <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <Badge tone="amber">Daily Source Check</Badge>
            <h3 className="mt-2 text-base font-black text-slate-950">Manual source check queue</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Check bid pages, plan rooms, referrals, and relationship sources manually. Nothing is scraped, emailed, texted, or checked automatically.
            </p>
          </div>
          <div className="co-source-check-stat-grid">
            {sourceCheckRunCards.map((card) => (
              <div key={card.label} className="co-source-check-stat" data-tone={card.tone}>
                <p>{card.value}</p>
                <strong>{card.label}</strong>
                <span>{card.helper}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="co-source-check-run-strip" data-tone={sourceCheckTone}>
          <div>
            <span>Today&apos;s Source Run</span>
            <strong>{checksToRun ? "Start with overdue and due sources." : "Source checks are clear."}</strong>
            <p>{checksToRun ? "Open each source, verify real opportunities, then mark checked or start a lead only after a human review." : "Upcoming and recent sources stay below so the office can keep the routine honest."}</p>
          </div>
          <div className="co-source-check-run-steps">
            <small><b>1</b>Open source</small>
            <small><b>2</b>Verify real work</small>
            <small><b>3</b>Save check</small>
            <small><b>4</b>Add lead only if real</small>
          </div>
        </div>
        {message ? <p className="mt-3 rounded-2xl border border-blue-100 bg-white px-3 py-2 text-sm font-bold text-blue-800">{message}</p> : null}
      </div>

      <div className="grid gap-5 p-4 xl:grid-cols-2">
        <SourceSection
          title="Overdue Sources"
          description="Active sources with a next check date before today."
          rows={checkState.overdueSources}
          emptyTitle="No overdue sources"
          tone="red"
          helperForSource={(source) => `Overdue ${source.nextCheckAt}`}
        />
        <SourceSection
          title="Sources Due Today"
          description="Active sources scheduled for today."
          rows={checkState.dueTodaySources}
          emptyTitle="No sources due today"
          tone="amber"
          helperForSource={() => "Due today"}
        />
        <SourceSection
          title="Upcoming Sources"
          description="Active sources scheduled after today."
          rows={checkState.upcomingSources}
          emptyTitle="No upcoming checks scheduled"
          tone="blue"
          helperForSource={(source) => `Next ${source.nextCheckAt}`}
        />
        <SourceSection
          title="Recently Checked Sources"
          description="Newest manual source checks, sorted by last checked date."
          rows={checkState.recentlyCheckedSources}
          emptyTitle="No checks recorded yet"
          tone="green"
          helperForSource={(source) => `Checked ${source.lastCheckedAt}`}
        />
      </div>
    </Card>
  );
}

function LeadSourcesPanel({
  sources = [],
  canManage = false,
  onCreateSource = async () => false,
  onUpdateSource = async () => false,
  onArchiveSource = async () => false,
  onRestoreSource = async () => false,
  disabled = false,
}) {
  const [draft, setDraft] = useState(INITIAL_LEAD_SOURCE_FORM);
  const [editingId, setEditingId] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [query, setQuery] = useState("");
  const [formError, setFormError] = useState("");
  const sourceState = useMemo(() => deriveLeadSourceListState(sources, { includeInactive: showInactive, query }), [query, showInactive, sources]);
  const activeEditingSource = editingId ? sources.find((source) => source.id === editingId) : null;
  const sourceLibraryTone = sourceState.stats.dueForCheck ? "orange" : sourceState.stats.active ? "green" : "amber";
  const sourceLibraryCards = [
    { label: "Active Sources", value: sourceState.stats.active, helper: "Live channels feeding Daily Source Check.", tone: sourceState.stats.active ? "green" : "amber" },
    { label: "Due For Check", value: sourceState.stats.dueForCheck, helper: "Needs office review from Source Checks.", tone: sourceState.stats.dueForCheck ? "orange" : "slate" },
    { label: "Inactive", value: sourceState.stats.inactive, helper: "Paused sources stay visible when requested.", tone: sourceState.stats.inactive ? "slate" : "green" },
  ];

  function resetDraft() {
    setDraft(INITIAL_LEAD_SOURCE_FORM);
    setEditingId("");
    setFormError("");
  }

  function setDraftField(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function editSource(source) {
    setEditingId(source.id);
    setDraft(createLeadSourceDraft(source));
    setFormError("");
  }

  function applyStarter(starterId) {
    if (!starterId) return;
    setDraft(createLeadSourceDraftFromStarter(starterId));
    setEditingId("");
    setFormError("");
  }

  async function submitSource(event) {
    event.preventDefault();
    if (!canManage) return;
    const errors = validateLeadSourcePayload(draft, { existing: activeEditingSource });
    if (errors.length > 0) {
      setFormError(errors[0]);
      return;
    }

    const didSave = editingId
      ? await onUpdateSource(editingId, draft)
      : await onCreateSource(draft);

    if (didSave) {
      resetDraft();
    }
  }

  return (
    <Card className="overflow-hidden">
      <div className="co-lead-source-header border-b border-orange-100 bg-white p-4">
        <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <Badge tone="green">Lead Sources</Badge>
            <h3 className="mt-2 text-base font-black text-slate-950">Sources to check manually</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Track bid pages, plan rooms, referral lists, and relationship sources. This is source management only; no scraping, AI, or automatic checks run here.
            </p>
          </div>
          <div className="co-lead-source-stat-grid">
            {sourceLibraryCards.map((card) => (
              <div key={card.label} className="co-lead-source-stat" data-tone={card.tone}>
                <p>{card.value}</p>
                <strong>{card.label}</strong>
                <span>{card.helper}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="co-lead-source-command-strip" data-tone={sourceLibraryTone}>
          <div>
            <span>Source Library Console</span>
            <strong>{sourceState.stats.active ? "Keep every source checkable and clean." : "Add the first source to start daily job finding."}</strong>
            <p>Use starter templates for common contractor channels, keep URLs and cadence current, and avoid storing passwords or private portal credentials.</p>
          </div>
          <div className="co-lead-source-command-points">
            <small><b>Type</b>Bid page, plan room, referral, relationship</small>
            <small><b>Cadence</b>Daily, weekly, monthly, or manual</small>
            <small><b>Safety</b>No secrets or private login data</small>
          </div>
        </div>
      </div>

      <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        <div className="min-w-0 space-y-3">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <input
              className="field-input sm:max-w-md"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search sources, cities, notes..."
            />
            <label className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-slate-500">
              <input type="checkbox" checked={showInactive} onChange={(event) => setShowInactive(event.target.checked)} />
              Show inactive
            </label>
          </div>

          {sourceState.sources.length > 0 ? (
            <div className="space-y-3">
              {sourceState.sources.map((source) => (
                <div key={source.id} className="co-lead-source-record" data-state={source.status === "Active" ? "active" : "inactive"}>
                  <div className="co-lead-source-record-head">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="break-words text-sm font-black text-slate-950">{source.name || "Unnamed source"}</p>
                        <Badge tone={source.status === "Active" ? "green" : "slate"}>{source.status || "Active"}</Badge>
                      </div>
                      <p className="mt-1 break-words text-xs font-bold text-slate-500">
                        {[source.type, leadSourceLocation(source), source.tradeFocus].filter(Boolean).join(" / ")}
                      </p>
                      <p className="mt-2 break-words text-sm leading-6 text-slate-600">{source.notes || "No notes yet."}</p>
                      <div className="co-lead-source-record-meta">
                        <span><b>Cadence</b>{source.checkCadence || "Manual"}</span>
                        <span><b>Last</b>{source.lastCheckedAt || "Not set"}</span>
                        <span><b>Next</b>{source.nextCheckAt || "Not set"}</span>
                      </div>
                    </div>
                    <div className="co-lead-source-record-actions">
                      {source.url ? (
                        <a className="inline-flex min-w-0 max-w-full items-center justify-center rounded-2xl border border-blue-100 bg-white px-3 py-2 text-center text-xs font-black leading-tight text-slate-700 transition hover:bg-blue-50" href={source.url} target="_blank" rel="noreferrer">Open source URL</a>
                      ) : null}
                      {canManage ? <Button type="button" size="sm" variant="secondary" onClick={() => editSource(source)} disabled={disabled}>Edit</Button> : null}
                      {canManage && source.status === "Active" ? (
                        <Button type="button" size="sm" variant="ghost" onClick={() => onArchiveSource(source.id)} disabled={disabled}>Deactivate</Button>
                      ) : null}
                      {canManage && source.status !== "Active" ? (
                        <Button type="button" size="sm" variant="ghost" onClick={() => onRestoreSource(source.id)} disabled={disabled}>Reactivate</Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <StateCard title="No lead sources yet" description="Add bid pages, plan rooms, referral lists, or other manual sources for the office to review." tone="slate" />
              <div className="co-lead-source-empty-guide">
                <div>
                  <span>1</span>
                  <strong>Build the run list</strong>
                  <p>Add the public pages, plan rooms, GC invites, and relationship sources the office should check.</p>
                </div>
                <div>
                  <span>2</span>
                  <strong>Set the cadence</strong>
                  <p>Keep daily, weekly, monthly, and manual sources separated so due checks stay obvious.</p>
                </div>
                <div>
                  <span>3</span>
                  <strong>Hand off real work</strong>
                  <p>Source checks turn into leads only after the office confirms the opportunity is real.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={submitSource} className="co-lead-source-editor min-w-0">
          <SectionHeader
            title={editingId ? "Edit lead source" : "Add lead source"}
            description="Name is required. URL is optional because relationship sources may not have one."
          />
          <div className="mt-4 space-y-3">
            <div className="co-lead-source-starter-grid">
              {LEAD_SOURCE_STARTERS.map((starter) => (
                <button
                  key={starter.id}
                  type="button"
                  className="co-lead-source-starter co-focus-ring"
                  onClick={() => applyStarter(starter.id)}
                  disabled={!canManage || disabled}
                >
                  <span>{starter.group || "Starter"}</span>
                  <strong>{starter.label}</strong>
                  <em>{starter.description || starter.source?.notes || "Use this as an editable source starter."}</em>
                </button>
              ))}
            </div>
            <SelectField label="Starter template" value="" onChange={(event) => applyStarter(event.target.value)} disabled={!canManage || disabled}>
              <option value="">Choose starter...</option>
              {LEAD_SOURCE_STARTERS.map((starter) => <option key={starter.id} value={starter.id}>{starter.label}</option>)}
            </SelectField>
            <InputField label="Source name" value={draft.name} onChange={(event) => setDraftField("name", event.target.value)} disabled={!canManage || disabled} required />
            <SelectField label="Type/category" value={draft.type} onChange={(event) => setDraftField("type", event.target.value)} disabled={!canManage || disabled}>
              {LEAD_SOURCE_TYPE_OPTIONS.map((type) => <option key={type} value={type}>{type}</option>)}
            </SelectField>
            <InputField label="URL / website / portal link" value={draft.url} onChange={(event) => setDraftField("url", event.target.value)} disabled={!canManage || disabled} placeholder="https://example.com/bids" />
            <div className="grid gap-3 sm:grid-cols-2">
              <InputField label="City" value={draft.city} onChange={(event) => setDraftField("city", event.target.value)} disabled={!canManage || disabled} />
              <InputField label="State" value={draft.state} onChange={(event) => setDraftField("state", event.target.value)} disabled={!canManage || disabled} />
            </div>
            <InputField label="Service area" value={draft.serviceArea} onChange={(event) => setDraftField("serviceArea", event.target.value)} disabled={!canManage || disabled} />
            <InputField label="Trade / industry focus" value={draft.tradeFocus} onChange={(event) => setDraftField("tradeFocus", event.target.value)} disabled={!canManage || disabled} />
            <SelectField label="Check cadence" value={draft.checkCadence} onChange={(event) => setDraftField("checkCadence", event.target.value)} disabled={!canManage || disabled}>
              {LEAD_SOURCE_CADENCE_OPTIONS.map((cadence) => <option key={cadence} value={cadence}>{cadence}</option>)}
            </SelectField>
            <div className="grid gap-3 sm:grid-cols-2">
              <InputField label="Last checked" type="date" value={draft.lastCheckedAt} onChange={(event) => setDraftField("lastCheckedAt", event.target.value)} disabled={!canManage || disabled} />
              <InputField label="Next check" type="date" value={draft.nextCheckAt} onChange={(event) => setDraftField("nextCheckAt", event.target.value)} disabled={!canManage || disabled} />
            </div>
            <SelectField label="Status" value={draft.status} onChange={(event) => setDraftField("status", event.target.value)} disabled={!canManage || disabled}>
              <option>Active</option>
              <option>Inactive</option>
            </SelectField>
            <TextAreaField label="Notes" value={draft.notes} onChange={(event) => setDraftField("notes", event.target.value)} disabled={!canManage || disabled} placeholder="Do not store passwords, API keys, or private credentials here." />
            {formError ? <p className="rounded-2xl border border-red-100 bg-red-50 p-3 text-sm font-bold text-red-700">{formError}</p> : null}
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="submit" disabled={!canManage || disabled}>{editingId ? "Save Source" : "Add Source"}</Button>
              {editingId ? <Button type="button" variant="secondary" onClick={resetDraft} disabled={disabled}>Cancel</Button> : null}
            </div>
          </div>
        </form>
      </div>
    </Card>
  );
}

function LeadCommandRail({
  lead,
  onFieldChange,
  onCreateJob,
  onCreateEstimateFromLead = () => {},
  onScoreLead = () => {},
  onCheckMissingInfo = () => {},
  onGenerateLeadAssistant = () => {},
  onConvertToCustomer = () => {},
  onArchive,
  onRestore,
  onDelete,
  users = [],
  customers = [],
  contactHistory = [],
  contactHistoryPermissions,
  onCreateContactHistory,
  onUpdateContactHistory,
  onArchiveContactHistory,
  onRestoreContactHistory,
  disabled,
  saveState,
  canManage = true,
  canCreateEstimate = false,
  leadAssistantState = null,
}) {
  if (!lead) {
    return (
      <div className="co-leads-shell-detail">
        <Card className="co-leads-rail-card p-4">
          <SectionHeader title="Selected lead summary" description="Choose a lead from the queue to review actions, missing info, and next steps." />
          <StateCard title="No lead selected" description="Pick a lead from the queue to inspect the work, contact status, and estimate readiness." tone="slate" />
        </Card>
      </div>
    );
  }

  const phone = leadContactPhone(lead);
  const email = leadContactEmail(lead);
  const missingItems = Array.isArray(lead.missingInfoItems) ? lead.missingInfoItems : [];
  const assistant = leadAssistantState?.leadId === lead.id ? leadAssistantState : null;
  const followUpDue = isLeadFollowUpDue(lead);
  const readyForEstimate = isLeadReadyForEstimate(lead);
  const tradeLabel = CONSTRUCTION_TRADE_PROFILES.find((trade) => trade.id === lead.trade)?.label || lead.trade || "Company default";
  const readinessRows = [
    { label: "Contact info confirmed", ok: Boolean(phone || email) },
    { label: "Trade / work type set", ok: Boolean(lead.trade) },
    { label: "Job address confirmed", ok: Boolean(lead.city || lead.address || lead.projectAddress) },
    { label: "Scope description noted", ok: Boolean(lead.project || lead.scopeSummary || lead.notes) },
    { label: "Next step assigned", ok: Boolean(lead.nextStep) },
    { label: "Follow-up scheduled", ok: Boolean(lead.followUpDueAt) },
  ];
  const readinessGapCount = readinessRows.filter((row) => !row.ok).length + missingItems.length;
  const recentHistory = contactHistoryTimeline(contactHistory, "lead", lead.id).slice(0, 5);
  const assistantPriorities = [
    { value: followUpDue ? "Due" : lead.followUpDueAt ? "Set" : "Open", label: "follow-up status", tone: followUpDue ? "orange" : lead.followUpDueAt ? "green" : "slate" },
    { value: readyForEstimate ? "Ready" : "Prep", label: "estimate path", tone: readyForEstimate ? "green" : "orange" },
    { value: readinessGapCount, label: "readiness gaps", tone: readinessGapCount ? "orange" : "green" },
  ];
  const primaryLeadActions = [
    { label: "Create Estimate", variant: "primary", onClick: () => onCreateEstimateFromLead(lead), disabled: disabled || Boolean(lead.archivedAt) || !canManage || !canCreateEstimate },
    { label: leadHasMissingInfoCheck(lead) ? "Re-check Info" : "Check Info", variant: "secondary", onClick: () => onCheckMissingInfo(lead), disabled: disabled || Boolean(lead.archivedAt) || !canManage },
    { label: leadHasScore(lead) ? "Re-score Fit" : "Score Fit", variant: "secondary", onClick: () => onScoreLead(lead), disabled: disabled || Boolean(lead.archivedAt) || !canManage },
    { label: "Create Job", variant: "secondary", onClick: onCreateJob, disabled: disabled || Boolean(lead.archivedAt) || !canManage },
  ];
  const secondaryLeadActions = [
    { label: "Convert", onClick: onConvertToCustomer, disabled: disabled || Boolean(lead.archivedAt) || !canManage },
    lead.archivedAt
      ? { label: "Restore", onClick: onRestore, disabled: disabled || !canManage }
      : { label: "Archive", onClick: onArchive, disabled: disabled || !canManage },
  ];

  return (
    <div className="co-leads-shell-detail">
      <div className="co-leads-shell-detail-primary">
        <Card className="co-leads-rail-card co-leads-summary-card p-4">
          <div className="flex min-w-0 items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Selected Lead Summary</p>
              <h3 className="mt-2 break-words text-xl font-black text-slate-950">{lead.customer || "Unnamed lead"}</h3>
              <p className="mt-1 break-words text-xs font-bold text-slate-500">{[lead.project, lead.city, leadSourceLabel(lead.source || "Call-in")].filter(Boolean).join(" / ")}</p>
            </div>
            <StatusBadge status={followUpDue ? "Follow-Up Due" : lead.status || "New"} />
          </div>
          <div className="co-leads-summary-badges">
            <Badge tone={lead.priority === "High" ? "amber" : lead.priority === "Low" ? "slate" : "blue"}>{lead.priority || "Normal"}</Badge>
            <LeadScoreBadge lead={lead} />
            <LeadMissingInfoBadge lead={lead} />
            <Badge tone={lead.trade ? "blue" : "slate"}>{tradeLabel}</Badge>
            {readyForEstimate ? <Badge tone="green">Estimate ready</Badge> : <Badge tone="amber">Needs prep</Badge>}
          </div>
          <div className="co-leads-action-pulse" aria-label="Lead action status">
            {assistantPriorities.map((item) => (
              <div key={item.label} data-tone={item.tone || "slate"}>
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
          <div className="co-leads-primary-action-strip">
            {primaryLeadActions.map((action) => (
              <Button key={action.label} type="button" size="sm" variant={action.variant} onClick={action.onClick} disabled={action.disabled}>
                {action.label}
              </Button>
            ))}
          </div>
          <div className="co-leads-secondary-action-row">
            {secondaryLeadActions.map((action) => (
              <Button key={action.label} type="button" size="sm" variant="secondary" onClick={action.onClick} disabled={action.disabled}>
                {action.label}
              </Button>
            ))}
          </div>
          <div className="co-leads-summary-facts">
            <div>
              <span>Contact</span>
              <strong>{phone || email || "Missing"}</strong>
            </div>
            {phone && email ? (
              <div>
                <span>Email</span>
                <strong>{email}</strong>
              </div>
            ) : null}
            <div>
              <span>Owner</span>
              <strong>{lead.owner || "Unassigned"}</strong>
            </div>
            <div>
              <span>Pipeline value</span>
              <strong>{currency(lead.value)}</strong>
            </div>
            <div>
              <span>Next follow-up</span>
              <strong>{formatLeadFollowUpDate(lead.followUpDueAt)}</strong>
            </div>
            <div>
              <span>Next action</span>
              <strong>{lead.nextStep || "Assign next step"}</strong>
            </div>
          </div>
          {lead.archivedAt ? <Button type="button" size="sm" variant="danger" className="mt-2 w-full" onClick={onDelete} disabled={disabled || !canManage}>Delete Permanently</Button> : null}
          <SaveStateText saveState={saveState} />
        </Card>

        <Card className="co-leads-rail-card p-4">
          <SectionHeader title="Missing info / readiness" description="Keep the lead ready for estimating and follow-up." action={<LeadMissingInfoBadge lead={lead} />} />
          <div className="space-y-2">
            {readinessRows.map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
                <span className="text-sm font-bold text-slate-700">{row.label}</span>
                <Badge tone={row.ok ? "green" : "amber"}>{row.ok ? "OK" : "Needs"}</Badge>
              </div>
            ))}
          </div>
          {missingItems.length > 0 ? (
            <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50/70 p-3">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-amber-700">Missing items</p>
              <ul className="mt-2 space-y-1 text-sm font-bold leading-5 text-slate-700">
                {missingItems.slice(0, 4).map((item) => <li key={item.key || item.label}>- {item.label || item.reason}</li>)}
              </ul>
            </div>
          ) : null}
        </Card>
      </div>

      <div className="co-leads-shell-detail-secondary">
        <details className="co-leads-rail-details co-leads-tools-tray">
          <summary>
            <span>Edit & activity</span>
            <span>Status, AI drafts, and history</span>
          </summary>
          <div className="co-leads-tools-tray-body">
            <Card className="co-leads-rail-card p-4">
              <SectionHeader title="Edit lead" description="Status, owner, follow-up, and notes." />
              <div className="grid gap-3">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  <SelectField label="Status" value={lead.status || "New"} onChange={(event) => onFieldChange("status", event.target.value)} disabled={!canManage || disabled}>
                    <option>New</option>
                    <option>Contacted</option>
                    <option>Site Visit</option>
                    <option>Estimate Sent</option>
                    <option>Approved</option>
                  </SelectField>
                  <SelectField label="Priority" value={lead.priority || "Normal"} onChange={(event) => onFieldChange("priority", event.target.value)} disabled={!canManage || disabled}>
                    <option>Low</option>
                    <option>Normal</option>
                    <option>High</option>
                  </SelectField>
                </div>
                <SelectField label="Owner" value={lead.ownerId || ""} onChange={(event) => onFieldChange("ownerId", event.target.value)} disabled={!canManage || disabled}>
                  <option value="">Unassigned</option>
                  {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
                </SelectField>
                <SelectField label="Trade / work type" value={lead.trade || ""} onChange={(event) => onFieldChange("trade", event.target.value)} disabled={!canManage || disabled}>
                  <option value="">Use company default / infer from notes</option>
                  {CONSTRUCTION_TRADE_PROFILES.map((trade) => <option key={trade.id} value={trade.id}>{trade.label}</option>)}
                </SelectField>
                <InputField label="Follow-up due" type="date" value={lead.followUpDueAt || ""} onChange={(event) => onFieldChange("followUpDueAt", event.target.value)} disabled={!canManage || disabled} />
                <InputField label="Next step" value={lead.nextStep || ""} onChange={(event) => onFieldChange("nextStep", event.target.value)} disabled={!canManage || disabled} />
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  <InputField label="City" value={lead.city || ""} onChange={(event) => onFieldChange("city", event.target.value)} disabled={!canManage || disabled} />
                  <InputField label="Value" type="number" value={lead.value || ""} onChange={(event) => onFieldChange("value", Number(event.target.value))} disabled={!canManage || disabled} />
                </div>
                <SelectField label="Linked customer" value={lead.customerId || ""} onChange={(event) => onFieldChange("customerId", event.target.value)} disabled={!canManage || disabled}>
                  <option value="">Create or match automatically</option>
                  {customers.filter((customer) => !customer.archivedAt).map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
                </SelectField>
                <TextAreaField label="Notes" value={lead.notes || ""} onChange={(event) => onFieldChange("notes", event.target.value)} disabled={!canManage || disabled} className="field-input min-h-24 resize-y" />
              </div>
            </Card>

            <Card className="co-leads-rail-card p-4">
              <SectionHeader title="AI lead assistant" description="Draft-only support for next steps and outreach copy." action={<Badge tone="blue">Beta</Badge>} />
              <Button type="button" className="w-full" onClick={() => onGenerateLeadAssistant(lead)} disabled={disabled || Boolean(lead.archivedAt) || !canManage || Boolean(assistant?.loading)}>
                {assistant?.loading ? "Generating..." : assistant?.result?.ok ? "Regenerate Drafts" : "Generate Drafts"}
              </Button>
              {assistant?.error ? <p className="mt-3 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-800">{assistant.error}</p> : null}
              {assistant?.result?.ok ? (
                <div className="mt-3 space-y-3 text-sm font-bold leading-5 text-slate-700">
                  <p><span className="text-slate-400">Summary:</span> {assistant.result.leadSummary || "Review the lead before follow-up."}</p>
                  <p><span className="text-slate-400">Next step:</span> {assistant.result.recommendedNextStep || "Choose the next office action."}</p>
                </div>
              ) : null}
            </Card>

            <Card className="co-leads-rail-card p-4">
              <SectionHeader title="Recent contact history" description="Latest outreach tied to this lead." action={<Badge tone="slate">{recentHistory.length}</Badge>} />
              {recentHistory.length > 0 ? (
                <div className="space-y-2">
                  {recentHistory.map((item) => (
                    <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-3">
                      <p className="text-sm font-black text-slate-950">{item.title || item.method || "Contact logged"}</p>
                      <p className="mt-1 text-xs font-bold leading-5 text-slate-500">{item.description || item.notes || formatDateTime(item.createdAt)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-sm font-bold text-slate-500">No contact history yet.</p>
              )}
              <details className="co-leads-rail-details co-leads-contact-editor mt-3">
                <summary>
                  <span>Log contact / edit history</span>
                  <span>Manual outreach notes</span>
                </summary>
                <div className="pt-3">
                  <ContactHistoryPanel
                    entityType="lead"
                    entity={lead}
                    records={contactHistory}
                    permissions={contactHistoryPermissions}
                    disabled={disabled}
                    onCreate={onCreateContactHistory}
                    onUpdate={onUpdateContactHistory}
                    onArchive={onArchiveContactHistory}
                    onRestore={onRestoreContactHistory}
                  />
                </div>
              </details>
            </Card>
          </div>
        </details>
      </div>
    </div>
  );
}

export function LeadsPage({
  user,
  companyName,
  leads = [],
  leadSources = [],
  contactHistory = [],
  estimates = [],
  rows,
  filter,
  setFilter,
  search,
  setSearch,
  ownerFilter,
  setOwnerFilter,
  sourceFilter,
  setSourceFilter,
  dueFilter,
  setDueFilter,
  scoreFilter,
  setScoreFilter,
  scoreSort,
  setScoreSort,
  users,
  customers,
  permissions,
  selectedLeadId,
  onSelectLead,
  onSelectCustomer,
  selectedLead,
  onLeadFieldChange,
  onScoreLead,
  onCheckMissingInfo,
  onGenerateLeadAssistant,
  leadAssistantState,
  leadDraft,
  setLeadDraft,
  onCreateLead,
  onCreateJobFromLead,
  onCreateEstimateFromLead,
  onConvertLeadToCustomer,
  onArchiveLead,
  onRestoreLead,
  onDeleteLead,
  onCreateLeadSource,
  onUpdateLeadSource,
  onArchiveLeadSource,
  onRestoreLeadSource,
  onMarkLeadSourceChecked,
  onCreateContactHistory,
  onUpdateContactHistory,
  onArchiveContactHistory,
  onRestoreContactHistory,
  onOpenEstimate = () => {},
  relatedLeadRecords,
  setActive,
  busy,
  leadSaveState,
  EstimatorMobilePipelineComponent,
  FollowUpQueuePanelComponent,
}) {
  const leadInboxState = useMemo(() => deriveLeadInboxState(leads), [leads]);
  const today = todayDateInputValue();
  const [activeLeadTool, setActiveLeadTool] = useState("intake");
  const [showCreateLead, setShowCreateLead] = useState(false);
  const canManageSources = permissions?.leads?.canManageSources ?? permissions?.leads?.canManage;
  const leadNeedsActionCount = rows.filter((lead) => (
    lead.status === "New"
    || isLeadFollowUpDue(lead, today)
    || (lead.followUpDueAt && String(lead.followUpDueAt).slice(0, 10) < today)
  )).length;
  const leadEstimateReadyCount = rows.filter(isLeadReadyForEstimate).length;
  const leadMissingInfoCount = rows.filter((lead) => {
    const missingItems = Array.isArray(lead.missingInfoItems) ? lead.missingInfoItems : [];
    const missingCount = Number(lead.missingInfoCount || 0);
    const missingStatus = String(lead.missingInfoStatus || "").toLowerCase();
    return missingItems.length > 0 || missingCount > 0 || missingStatus.includes("missing") || !leadHasMissingInfoCheck(lead);
  }).length;
  const leadWaitingCount = rows.filter(isLeadWaitingOnResponse).length;
  const leadKpis = [
    { label: "Needs Action", value: leadNeedsActionCount, helper: "New, due, or overdue lead work", icon: "clipboard", tone: "orange", actionLabel: "Open action queue", onClick: () => { setShowCreateLead(false); setDueFilter("Due today"); } },
    { label: "Estimate Ready", value: leadEstimateReadyCount, helper: "Enough info to draft an estimate", icon: "check", tone: "green", actionLabel: "View ready leads", onClick: () => { setShowCreateLead(false); setScoreFilter("All scores"); } },
    { label: "Missing Info", value: leadMissingInfoCount, helper: "Blocked until details are filled in", icon: "alert", tone: "red", actionLabel: "Review blockers", onClick: () => { setShowCreateLead(false); setScoreFilter("All scores"); } },
    { label: "Waiting Reply", value: leadWaitingCount, helper: "Customer or GC response needed", icon: "clock", tone: "amber", actionLabel: "View waiting", onClick: () => { setShowCreateLead(false); setFilter("All"); } },
  ];
  const leadToolTabs = [
    { id: "intake", label: "Intake", count: permissions.leads.canManage ? 1 : 0 },
    { id: "review", label: "Review Queue", count: leadInboxState.items.length },
    { id: "sourceChecks", label: "Source Checks", count: leadSources.length },
    { id: "sources", label: "Lead Sources", count: leadSources.length },
  ];
  const newLeadShellItem = useMemo(() => (permissions?.leads?.canManage ? {
    id: "create-lead",
    kind: "create",
    title: "New lead",
    meta: "Create contact, scope, source, and next step",
    sourceLabel: "Create",
    status: "Manual Entry",
    statusLabel: "Manual Entry",
    tone: "blue",
    actionLabel: "Create",
  } : null), [permissions?.leads?.canManage]);
  const leadShellQueue = useMemo(() => {
    const shellLeadItems = rows.map((lead) => {
      const followUpDue = isLeadFollowUpDue(lead, today);
      const readyForEstimate = isLeadReadyForEstimate(lead);
      const missingItems = Array.isArray(lead.missingInfoItems) ? lead.missingInfoItems : [];
      const missingCount = Number(lead.missingInfoCount || 0) + missingItems.length;
      const missingStatus = String(lead.missingInfoStatus || "").toLowerCase();
      const hasMissingInfo = missingCount > 0 || missingStatus.includes("missing") || !leadHasMissingInfoCheck(lead);
      const waiting = isLeadWaitingOnResponse(lead);
      const tone = readyForEstimate ? "green" : followUpDue ? "orange" : hasMissingInfo ? "red" : waiting ? "amber" : "blue";
      const statusLabel = readyForEstimate ? "Estimate Ready" : followUpDue ? "Follow-Up Due" : hasMissingInfo ? "Missing Info" : waiting ? "Waiting Reply" : (lead.status || "New");

      return {
        id: lead.id,
        kind: "lead",
        lead,
        title: lead.customer || "Unnamed lead",
        meta: [lead.project, lead.city, leadSourceLabel(lead.source || "Call-in")].filter(Boolean).join(" / ") || "Lead details pending",
        sourceLabel: lead.priority === "High" ? "High Priority" : leadSourceLabel(lead.source || "Call-in"),
        status: statusLabel,
        statusLabel,
        tone,
        actionLabel: readyForEstimate ? "Estimate" : followUpDue ? "Follow Up" : hasMissingInfo ? "Fix Info" : "Review",
        badges: [
          { label: lead.status || "New", tone: lead.archivedAt ? "slate" : tone },
          { label: lead.owner || "Unassigned", tone: lead.owner ? "blue" : "slate" },
          { label: readyForEstimate ? "Ready" : hasMissingInfo ? "Needs info" : "Review", tone: readyForEstimate ? "green" : hasMissingInfo ? "red" : "orange" },
        ],
      };
    });

    return shellLeadItems;
  }, [rows, today]);
  const selectedLeadShellItem = useMemo(() => {
    if (showCreateLead) return newLeadShellItem;
    if (selectedLead) {
      return leadShellQueue.find((item) => item.kind === "lead" && item.lead?.id === selectedLead.id) || {
        id: selectedLead.id,
        kind: "lead",
        lead: selectedLead,
        title: selectedLead.customer || "Unnamed lead",
        meta: [selectedLead.project, selectedLead.city, leadSourceLabel(selectedLead.source || "Call-in")].filter(Boolean).join(" / ") || "Lead details pending",
        sourceLabel: selectedLead.priority === "High" ? "High Priority" : leadSourceLabel(selectedLead.source || "Call-in"),
        status: selectedLead.status || "New",
        statusLabel: selectedLead.status || "New",
        tone: isLeadReadyForEstimate(selectedLead) ? "green" : isLeadFollowUpDue(selectedLead, today) ? "orange" : "blue",
        actionLabel: "Review",
      };
    }
    return null;
  }, [leadShellQueue, newLeadShellItem, selectedLead, showCreateLead, today]);

  function handleStartLeadFromSource(source) {
    const sourceContext = [
      `Lead source: ${source.name || "Unnamed source"}`,
      source.type ? `Type: ${source.type}` : "",
      source.url ? `URL: ${source.url}` : "",
      source.serviceArea ? `Service area: ${source.serviceArea}` : "",
      source.tradeFocus ? `Trade focus: ${source.tradeFocus}` : "",
      source.notes ? `Source notes: ${source.notes}` : "",
    ].filter(Boolean).join("\n");

    setLeadDraft((current) => ({
      ...current,
      customer: "",
      customerId: "",
      city: source.city || source.serviceArea || current.city || "",
      project: source.tradeFocus || "",
      status: "New",
      source: "Lead Finder",
      nextStep: "Review lead found from source",
      notes: sourceContext,
    }));
  }

  function openFollowUpQueue() {
    setShowCreateLead(false);
    setDueFilter("Due today");
    if (typeof document === "undefined") return;
    requestAnimationFrame(() => {
      const target = document.getElementById("lead-followup-board");
      if (target?.tagName === "DETAILS") {
        target.open = true;
      }
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function selectLeadTool(toolId = "intake") {
    setActiveLeadTool(toolId);
    if (typeof document === "undefined") return;
    requestAnimationFrame(() => {
      const target = document.getElementById("lead-tools-drawer");
      if (target?.tagName === "DETAILS") {
        target.open = true;
      }
      const isMobile = typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;
      if (isMobile) {
        const panel = target?.querySelector?.(".co-leads-tools-panel");
        (panel || target)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  }

  function selectLeadShellItem(item) {
    if (!item) return;
    if (item.kind === "create") {
      setShowCreateLead(true);
      setActiveLeadTool("intake");
      return;
    }
    setShowCreateLead(false);
    if (item.lead?.id) onSelectLead(item.lead.id);
  }

  function renderLeadShellDetail(item) {
    if (item?.kind === "create") {
      return (
        <div className="co-leads-shell-detail-scroll">
          <LeadIntakeCard draft={leadDraft} setDraft={setLeadDraft} onCreateLead={onCreateLead} disabled={busy} canManage={permissions.leads.canManage} customers={customers} users={users} />
        </div>
      );
    }

    return (
      <div className="co-leads-shell-detail-scroll">
        <LeadCommandRail
          lead={selectedLead}
          onFieldChange={onLeadFieldChange}
          onScoreLead={onScoreLead}
          onCheckMissingInfo={onCheckMissingInfo}
          onGenerateLeadAssistant={onGenerateLeadAssistant}
          leadAssistantState={leadAssistantState}
          onCreateJob={onCreateJobFromLead}
          onCreateEstimateFromLead={onCreateEstimateFromLead}
          onConvertToCustomer={onConvertLeadToCustomer}
          onArchive={onArchiveLead}
          onRestore={onRestoreLead}
          onDelete={onDeleteLead}
          users={users}
          customers={customers}
          contactHistory={contactHistory}
          contactHistoryPermissions={permissions.contactHistory}
          onCreateContactHistory={onCreateContactHistory}
          onUpdateContactHistory={onUpdateContactHistory}
          onArchiveContactHistory={onArchiveContactHistory}
          onRestoreContactHistory={onRestoreContactHistory}
          disabled={busy}
          saveState={leadSaveState}
          canManage={permissions.leads.canManage}
          canCreateEstimate={permissions?.estimates?.canManage}
        />
      </div>
    );
  }

  const MobilePipelinePage = EstimatorMobilePipelineComponent || null;
  const FollowUpQueue = FollowUpQueuePanelComponent || (() => null);
  const canUseEstimatorMobilePipeline = Boolean(MobilePipelinePage) && isEstimatorMobilePipelineUser(user, permissions);

  return (
    <>
    {canUseEstimatorMobilePipeline ? (
      <div className="co-sales-mobile-only">
        <MobilePipelinePage
          user={user}
          companyName={companyName}
          leads={leads}
          estimates={estimates}
          customers={customers}
          permissions={permissions}
          setActive={setActive}
          onSelectLead={onSelectLead}
          onOpenEstimate={onOpenEstimate}
          onSelectCustomer={onSelectCustomer}
          activeModule="leads"
        />
      </div>
    ) : null}
    {canUseEstimatorMobilePipeline ? (
      <div className="co-sales-tablet-only">
        <MobilePipelinePage
          user={user}
          companyName={companyName}
          leads={leads}
          estimates={estimates}
          customers={customers}
          permissions={permissions}
          setActive={setActive}
          onSelectLead={onSelectLead}
          onOpenEstimate={onOpenEstimate}
          onSelectCustomer={onSelectCustomer}
          activeModule="leads"
        />
      </div>
    ) : null}
    <div className={canUseEstimatorMobilePipeline ? "co-sales-mobile-desktop-content" : ""}>
    <div className="co-office-page co-leads-page co-leads-shell-page">
      <div className="co-leads-desktop-workspace-frame">
        <ApexOfficeCommandShell
          eyebrow="Office"
          title="Leads"
          description="Track new leads, follow-ups, estimates, missing info, and next actions from one contractor command view."
          kpis={leadKpis}
          queue={{
            title: "Lead queue",
            description: `${leadShellQueue.length} visible lead${leadShellQueue.length === 1 ? "" : "s"} from the current filters.`,
            items: leadShellQueue,
            selectedId: selectedLeadShellItem?.id,
            onSelect: selectLeadShellItem,
            limit: 6,
            controls: (
              <div className="co-leads-shell-controls">
                <FilterBar
                  filters={["All", "New", "Contacted", "Site Visit", "Estimate Sent", "Approved", "Archived"]}
                  active={filter}
                  setActive={(nextFilter) => {
                    setShowCreateLead(false);
                    setFilter(nextFilter);
                  }}
                  search={search}
                  setSearch={(nextSearch) => {
                    setShowCreateLead(false);
                    setSearch(nextSearch);
                  }}
                  placeholder="Search leads..."
                />
                <details className="co-leads-advanced-filters">
                  <summary>
                    <span>Advanced filters</span>
                    <span>{[ownerFilter !== "All owners" ? ownerFilter : "", sourceFilter !== "All sources" ? sourceFilter : "", dueFilter !== "All due dates" ? dueFilter : "", scoreFilter !== "All scores" ? scoreFilter : ""].filter(Boolean).length || "Owner, source, due date, score"}</span>
                  </summary>
                  <div className="co-office-filter-grid co-leads-filter-grid grid gap-3 p-3 md:grid-cols-5">
                    <SelectField label="Owner" value={ownerFilter} onChange={(event) => setOwnerFilter(event.target.value)}>
                      <option>All owners</option>
                      {Array.from(new Set(users.map((user) => user.name))).sort().map((name) => <option key={name}>{name}</option>)}
                    </SelectField>
                    <SelectField label="Lead source" value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)}>
                      <option>All sources</option>
                      {LEAD_SOURCE_OPTIONS.map((source) => <option key={source} value={source}>{source === "public_request_form" ? "Public request form" : source}</option>)}
                    </SelectField>
                    <SelectField label="Follow-up due" value={dueFilter} onChange={(event) => setDueFilter(event.target.value)}>
                      <option>All due dates</option>
                      <option>Overdue</option>
                      <option>Due today</option>
                      <option>Due soon</option>
                      <option>No due date</option>
                    </SelectField>
                    <SelectField label="Fit score" value={scoreFilter} onChange={(event) => setScoreFilter(event.target.value)}>
                      <option>All scores</option>
                      {LEAD_SCORE_LABELS.map((label) => <option key={label}>{label}</option>)}
                    </SelectField>
                    <SelectField label="Sort" value={scoreSort} onChange={(event) => setScoreSort(event.target.value)}>
                      <option>Default order</option>
                      <option>High score first</option>
                    </SelectField>
                  </div>
                </details>
              </div>
            ),
            emptyState: <StateCard title="No leads available" description="Create the first lead or clear filters to see active opportunities." tone="slate" />,
          }}
          detail={{
            title: selectedLeadShellItem?.kind === "create" ? "New lead" : "Selected lead",
            item: selectedLeadShellItem,
            render: renderLeadShellDetail,
            emptyState: <StateCard title="No lead selected" description="Select a lead from the queue to review next steps and estimate readiness." tone="slate" />,
          }}
          quickActions={[
            permissions?.leads?.canManage ? { id: "new-lead", label: "New Lead", icon: "plus", onClick: () => selectLeadShellItem(newLeadShellItem) } : null,
            { id: "follow-up", label: "Follow-Up", icon: "clock", onClick: openFollowUpQueue, disabled: leadNeedsActionCount === 0 },
            { id: "estimate-ready", label: "Estimate Ready", icon: "check", onClick: () => { setShowCreateLead(false); setScoreFilter("All scores"); }, disabled: leadEstimateReadyCount === 0 },
          ].filter(Boolean)}
          className="co-leads-command-shell"
        />

        <details id="lead-followup-board" className="co-leads-shell-followup">
          <summary>
            <span>
              <strong>Follow-up queue</strong>
              <em>Due leads, waiting replies, and manual contact work stay one step below the main command view.</em>
            </span>
            <span>{leadNeedsActionCount} need action</span>
          </summary>
          <FollowUpQueue
            leads={leads}
            customers={customers}
            estimates={estimates}
            leadSources={leadSources}
            contactHistory={contactHistory}
            permissions={permissions}
            companyName={companyName}
            user={user}
            disabled={busy}
            onOpenLead={onSelectLead}
            onOpenCustomer={onSelectCustomer}
            onOpenEstimate={onOpenEstimate}
            onOpenLeads={() => setActive?.("leads")}
            onCreateContactHistory={onCreateContactHistory}
            compact
            maxItems={4}
          />
        </details>

        <DesktopCommandDrawer
          id="lead-tools-drawer"
          className="co-leads-tools-drawer mx-auto w-full max-w-[1520px] min-w-0 px-5 pb-24 sm:px-6 md:pb-4 lg:px-8"
          title="Intake & Sources"
          description="New lead intake, review queue, source checks, and source management stay available here."
          summaryLabel="Open workspace"
          variant="right"
        >
          <div className="co-leads-tool-tabs mt-3 flex min-w-0 gap-2 overflow-x-auto pb-1">
            {leadToolTabs.map((tab) => (
              <button key={tab.id} type="button" className={activeLeadTool === tab.id ? "is-active" : ""} onClick={() => selectLeadTool(tab.id)}>
                {tab.label}
                <span>{tab.count}</span>
              </button>
            ))}
          </div>
          <div className="co-leads-tools-panel mt-3">
            {activeLeadTool === "intake" ? (
              <LeadIntakeCard draft={leadDraft} setDraft={setLeadDraft} onCreateLead={onCreateLead} disabled={busy} canManage={permissions.leads.canManage} customers={customers} users={users} />
            ) : null}
            {activeLeadTool === "review" ? (
              <LeadInboxReviewQueue inboxState={leadInboxState} onSelectLead={onSelectLead} onScoreLead={onScoreLead} onCheckMissingInfo={onCheckMissingInfo} onCreateEstimateFromLead={onCreateEstimateFromLead} canManage={permissions?.leads?.canManage} canCreateEstimate={permissions?.estimates?.canManage} disabled={busy} />
            ) : null}
            {activeLeadTool === "sourceChecks" ? (
              <DailySourceCheckPanel
                sources={leadSources}
                canManage={canManageSources}
                onMarkSourceChecked={onMarkLeadSourceChecked}
                onStartLeadFromSource={handleStartLeadFromSource}
                disabled={busy}
              />
            ) : null}
            {activeLeadTool === "sources" ? (
              <LeadSourcesPanel
                sources={leadSources}
                canManage={canManageSources}
                onCreateSource={onCreateLeadSource}
                onUpdateSource={onUpdateLeadSource}
                onArchiveSource={onArchiveLeadSource}
                onRestoreSource={onRestoreLeadSource}
                disabled={busy}
              />
            ) : null}
          </div>
        </DesktopCommandDrawer>
      </div>
    </div>
    </div>
    </>
  );
}
