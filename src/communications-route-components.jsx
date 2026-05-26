import { useEffect, useMemo, useState } from "react";

import {
  ApexOfficeCommandShell,
  Badge,
  Button,
  Card,
  CommandPageFrame,
  InputField,
  PageHeader,
  SectionHeader,
  SelectField,
  StateCard,
  TextAreaField,
} from "./app-shell-components";
import { contactHistoryBadgeTone, createContactHistoryDraft, deriveCommunicationCenterState } from "./contact-history-utils";
import { CONTACT_HISTORY_DIRECTIONS, CONTACT_HISTORY_METHODS, CONTACT_HISTORY_OUTCOMES } from "../shared/contactHistory.js";

function useDesktopCommandViewport(minWidth = 1024) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return true;
    return window.matchMedia(`(min-width: ${minWidth}px)`).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return undefined;
    const mediaQuery = window.matchMedia(`(min-width: ${minWidth}px)`);
    const update = () => setMatches(mediaQuery.matches);
    update();
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", update);
      return () => mediaQuery.removeEventListener("change", update);
    }
    mediaQuery.addListener(update);
    return () => mediaQuery.removeListener(update);
  }, [minWidth]);

  return matches;
}

function formatDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function todayDateInputValue() {
  return new Date().toISOString().slice(0, 10);
}

export function CommunicationCenterPage({
  leads = [],
  customers = [],
  estimates = [],
  jobs = [],
  leadSources = [],
  contactHistory = [],
  permissions,
  companyName,
  user,
  busy = false,
  onCreateContactHistory = async () => false,
  onUpdateContactHistory = async () => false,
  onArchiveContactHistory = async () => false,
  onRestoreContactHistory = async () => false,
  onSelectLead = () => {},
  onSelectCustomer = () => {},
  onSelectJob = () => {},
  onOpenEstimate = () => {},
  AccessRestrictedComponent,
  FollowUpQueuePanelComponent,
}) {
  const canView = Boolean(permissions?.contactHistory?.canView);
  const canManage = Boolean(permissions?.contactHistory?.canManage);
  const [entityTypeFilter, setEntityTypeFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [selectedKey, setSelectedKey] = useState("");
  const [draft, setDraft] = useState(() => createContactHistoryDraft({}, "lead", "Call"));
  const [message, setMessage] = useState("");
  const isDesktopCommandViewport = useDesktopCommandViewport(1180);
  const centerState = useMemo(() => deriveCommunicationCenterState({
    leads,
    customers,
    estimates,
    jobs,
    contactHistory,
  }, { entityType: entityTypeFilter, query }), [contactHistory, customers, entityTypeFilter, estimates, jobs, leads, query]);
  const optionKeys = useMemo(() => centerState.options.map((option) => option.key).join("|"), [centerState.options]);
  const selectedOption = useMemo(() => centerState.options.find((option) => option.key === selectedKey) || centerState.options[0] || null, [centerState.options, selectedKey]);
  const todayKey = todayDateInputValue();
  const communicationShellQueue = useMemo(() => {
    const recordsByEntityKey = new Map();
    centerState.records.forEach((record) => {
      const key = `${record.entityType}:${record.entityId}`;
      if (!recordsByEntityKey.has(key)) recordsByEntityKey.set(key, []);
      recordsByEntityKey.get(key).push(record);
    });

    return centerState.options.map((option) => {
      const relatedRecords = recordsByEntityKey.get(option.key) || [];
      const latest = relatedRecords[0] || null;
      const overdue = relatedRecords.some((record) => record.nextFollowUpDate && record.nextFollowUpDate < todayKey);
      const dueToday = relatedRecords.some((record) => record.nextFollowUpDate === todayKey);
      const waiting = relatedRecords.some((record) => record.outcome === "Waiting on Response");
      const needsFirstTouch = relatedRecords.length === 0;
      const priorityScore = overdue ? 50 : dueToday ? 40 : waiting ? 30 : needsFirstTouch ? 20 : 10;
      const statusLabel = overdue ? "Overdue" : dueToday ? "Due Today" : waiting ? "Waiting" : needsFirstTouch ? "No Touch" : `${relatedRecords.length} Logged`;
      const tone = overdue ? "red" : dueToday ? "amber" : waiting ? "orange" : needsFirstTouch ? "blue" : "slate";

      return {
        id: option.key,
        option,
        title: option.label,
        meta: option.subtitle || `${option.type} communication context`,
        sourceLabel: option.type,
        status: statusLabel,
        statusLabel,
        tone,
        actionLabel: "",
        priorityScore,
        relatedRecords,
        badges: [
          { label: option.type, tone: "slate" },
          latest ? { label: latest.method || "Logged", tone: contactHistoryBadgeTone(latest.method, "method") } : { label: "New", tone: "blue" },
        ],
      };
    }).sort((left, right) => (
      right.priorityScore - left.priorityScore ||
      right.relatedRecords.length - left.relatedRecords.length ||
      left.title.localeCompare(right.title)
    ));
  }, [centerState.options, centerState.records, todayKey]);
  const selectedCommunicationShellItem = useMemo(() => (
    communicationShellQueue.find((item) => item.id === selectedOption?.key) ||
    communicationShellQueue[0] ||
    null
  ), [communicationShellQueue, selectedOption?.key]);
  const selectedRelatedRecords = useMemo(() => (
    selectedOption
      ? centerState.records.filter((record) => record.entityType === selectedOption.type && record.entityId === selectedOption.id)
      : []
  ), [centerState.records, selectedOption]);

  useEffect(() => {
    if (!centerState.options.length) {
      setSelectedKey("");
      return;
    }
    if (!selectedKey || !centerState.options.some((option) => option.key === selectedKey)) {
      setSelectedKey(centerState.options[0].key);
    }
  }, [centerState.options, optionKeys, selectedKey]);

  useEffect(() => {
    if (!selectedOption) {
      setDraft(createContactHistoryDraft({}, "lead", "Call"));
      return;
    }
    setDraft(createContactHistoryDraft(selectedOption.record, selectedOption.type, "Call"));
    setMessage("");
  }, [selectedOption?.key]);

  if (!canView) {
    return AccessRestrictedComponent ? <AccessRestrictedComponent active="communications" user={user} permissions={permissions} setActive={() => {}} /> : <CommandPageFrame><StateCard title="Communications unavailable" description="This route is protected for your role." tone="amber" /></CommandPageFrame>;
  }

  const stats = [
    { id: "logged", label: "Logged", value: centerState.stats.total, tone: "blue", helper: "Manual records", icon: "quote" },
    { id: "due-today", label: "Due Today", value: centerState.stats.dueToday, tone: centerState.stats.dueToday ? "amber" : "green", helper: "Follow-ups", icon: "clock" },
    { id: "overdue", label: "Overdue", value: centerState.stats.overdue, tone: centerState.stats.overdue ? "red" : "green", helper: "Needs action", icon: "alert" },
    { id: "waiting", label: "Waiting", value: centerState.stats.waiting, tone: centerState.stats.waiting ? "amber" : "slate", helper: "Customer replies", icon: "inbox" },
  ];

  function openRecord(record) {
    const type = record?.entityType || record?.type;
    const id = record?.entityId || record?.id;
    if (!id) return;
    if (type === "lead") onSelectLead(id);
    else if (type === "customer") onSelectCustomer(id);
    else if (type === "job") onSelectJob(id);
    else if (type === "estimate") onOpenEstimate(id);
  }

  function setQuickMethod(method) {
    setDraft((current) => ({
      ...current,
      method,
      outcome: method === "Email" || method === "Text" ? "Sent" : "Follow-Up Needed",
    }));
  }

  async function submitCommunication(event) {
    event.preventDefault();
    if (!canManage || !selectedOption) return;
    const didSave = await onCreateContactHistory({
      ...draft,
      entityType: selectedOption.type,
      entityId: selectedOption.id,
    });
    if (didSave) {
      setMessage(`Communication logged for ${selectedOption.label}. No email or text was sent.`);
      setDraft(createContactHistoryDraft(selectedOption.record, selectedOption.type, draft.method || "Call"));
    }
  }

  function selectCommunicationShellItem(item) {
    if (!item) return;
    setSelectedKey(item.option?.key || item.id);
  }

  function openFirstCommunicationShellItem(predicate) {
    const nextItem = communicationShellQueue.find(predicate);
    if (nextItem) selectCommunicationShellItem(nextItem);
  }

  function renderCommunicationRecord(record, { compact = false } = {}) {
    return (
      <div key={record.id} className={`co-communications-log-row grid gap-3 ${compact ? "p-3" : "p-4"} lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start`}>
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <Badge tone={contactHistoryBadgeTone(record.method, "method")}>{record.method}</Badge>
            <Badge tone={contactHistoryBadgeTone(record.outcome)}>{record.outcome}</Badge>
            <Badge tone="slate">{record.entityType}</Badge>
            {record.nextFollowUpDate ? <Badge tone={record.nextFollowUpDate <= todayKey ? "amber" : "blue"}>Next {record.nextFollowUpDate}</Badge> : null}
          </div>
          <p className="mt-2 break-words text-sm font-black text-slate-950">{record.subject || record.entity?.label || "Manual communication"}</p>
          <p className="mt-1 text-xs font-bold text-slate-500">{record.entity?.label || record.contactName || "Unlinked context"} {record.entity?.subtitle ? `- ${record.entity.subtitle}` : ""}</p>
          <p className="mt-1 text-xs font-bold text-slate-500">{formatDateTime(record.contactedAt || record.createdAt)} by {record.createdByName || "Office"}</p>
          {record.messageDraft ? <p className="co-communications-log-draft mt-3 line-clamp-3 whitespace-pre-wrap rounded-2xl bg-blue-50/60 p-3 text-sm leading-6 text-slate-700">{record.messageDraft}</p> : null}
          {record.notes ? <p className="co-communications-log-notes mt-3 line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{record.notes}</p> : null}
        </div>
        <div className="co-communications-log-actions flex flex-wrap gap-2 lg:justify-end">
          <Button type="button" size="sm" variant="secondary" onClick={() => openRecord(record)}>Open Context</Button>
          {canManage && record.outcome !== "Waiting on Response" ? <Button type="button" size="sm" variant="ghost" onClick={() => onUpdateContactHistory(record.id, { outcome: "Waiting on Response" })} disabled={busy}>Mark waiting</Button> : null}
          {canManage ? <Button type="button" size="sm" variant="ghost" onClick={() => onArchiveContactHistory(record.id)} disabled={busy}>Archive</Button> : null}
        </div>
      </div>
    );
  }

  function renderCommunicationShellDetail(item) {
    const option = item?.option || selectedOption;
    const relatedRecords = item?.relatedRecords || selectedRelatedRecords;

    if (!option) {
      return <StateCard title="No communication context" description="Create a lead, customer, estimate, or job before logging communication." tone="slate" />;
    }

    return (
      <div className="co-communications-shell-detail-scroll">
        <div className="co-communications-selected-context">
          <span>Selected context</span>
          <strong>{option.label}</strong>
          {option.subtitle ? <em>{option.subtitle}</em> : null}
          <Badge tone="slate">{option.type}</Badge>
        </div>

        <form className="co-communications-form grid gap-3" onSubmit={submitCommunication}>
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <SelectField label="Link communication to" value={selectedOption?.key || ""} onChange={(event) => setSelectedKey(event.target.value)} disabled={busy || !canManage}>
              {centerState.options.map((communicationOption) => (
                <option key={communicationOption.key} value={communicationOption.key}>{communicationOption.label} - {communicationOption.type}</option>
              ))}
            </SelectField>
            <Button type="button" variant="secondary" onClick={() => openRecord(option)}>Open Context</Button>
          </div>
          <div className="co-communications-method-row flex flex-wrap gap-2">
            {["Call", "Email", "Text", "In Person", "Other"].map((method) => (
              <Button key={method} type="button" size="sm" variant={draft.method === method ? "primary" : "secondary"} onClick={() => setQuickMethod(method)} disabled={busy || !canManage}>
                {method}
              </Button>
            ))}
          </div>
          <div className="co-communications-compact-fields grid gap-3 md:grid-cols-3">
            <SelectField label="Direction" value={draft.direction} onChange={(event) => setDraft((current) => ({ ...current, direction: event.target.value }))} disabled={busy || !canManage}>
              {CONTACT_HISTORY_DIRECTIONS.map((direction) => <option key={direction} value={direction}>{direction === "outbound" ? "Outbound" : "Inbound"}</option>)}
            </SelectField>
            <SelectField label="Outcome" value={draft.outcome} onChange={(event) => setDraft((current) => ({ ...current, outcome: event.target.value }))} disabled={busy || !canManage}>
              {CONTACT_HISTORY_OUTCOMES.map((outcome) => <option key={outcome}>{outcome}</option>)}
            </SelectField>
            <InputField label="Next follow-up" type="date" value={draft.nextFollowUpDate} onChange={(event) => setDraft((current) => ({ ...current, nextFollowUpDate: event.target.value }))} disabled={busy || !canManage} />
          </div>
          <InputField label="Subject / short title" value={draft.subject} onChange={(event) => setDraft((current) => ({ ...current, subject: event.target.value }))} disabled={busy || !canManage} placeholder="Estimate follow-up, site visit, approval call" />
          <div className="co-communications-note-grid grid gap-3 lg:grid-cols-2">
            <TextAreaField label="Draft / script" value={draft.messageDraft} onChange={(event) => setDraft((current) => ({ ...current, messageDraft: event.target.value }))} disabled={busy || !canManage} placeholder="Manual email/SMS/call script. Stored only; Apex HQ does not send it." />
            <TextAreaField label="Outcome notes" value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} disabled={busy || !canManage} placeholder="What happened and what needs to happen next." />
          </div>
          <div className="co-communications-submit-row flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={busy || !canManage || !selectedOption}>Save communication</Button>
            <p className="text-sm font-bold text-slate-500">{message || "Manual-only: no email, text, or phone call is sent."}</p>
          </div>
        </form>

        <section className="co-communications-detail-section">
          <SectionHeader
            title="Selected timeline"
            description="Manual outreach history for this selected lead, customer, estimate, or job."
            action={<Badge tone={relatedRecords.length ? "blue" : "slate"}>{relatedRecords.length} logged</Badge>}
          />
          <div className="co-communications-log-stack divide-y divide-slate-100">
            {relatedRecords.length ? relatedRecords.slice(0, 4).map((record) => renderCommunicationRecord(record, { compact: true })) : (
              <StateCard title="No touches logged" description="Save the first manual communication note when the next call, text draft, or email draft is ready." tone="slate" />
            )}
          </div>
        </section>
      </div>
    );
  }

  function renderCommunicationFallbackPage() {
    return (
      <div className="co-office-page co-communications-page">
        <PageHeader
          eyebrow="Office"
          title="Communication Center"
          description="Manual-first customer, lead, estimate, and job communication context. Nothing is emailed, texted, or called automatically."
          actions={<Badge tone="blue">Manual Log</Badge>}
        />

        <div className="co-communications-shell grid min-w-0 gap-3 px-5 pb-6 sm:px-6 lg:px-8">
          <div className="co-communications-kpi-grid grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
              <Card key={stat.label} className="co-communications-kpi-card p-4" data-tone={stat.tone}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{stat.label}</p>
                    <p className="mt-2 text-3xl font-black text-slate-950">{stat.value}</p>
                    <p className="mt-1 text-xs font-bold text-slate-500">{stat.helper}</p>
                  </div>
                  <Badge tone={stat.tone}>{stat.label}</Badge>
                </div>
              </Card>
            ))}
          </div>

          <div className="co-communications-command-layout grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_380px]">
            <div className="co-communications-left-stack grid min-w-0 gap-3">
              <Card className="co-communications-main-board overflow-hidden">
                <div className="co-communications-board-header border-b border-slate-200 bg-white p-4">
                  <SectionHeader
                    title="Manual Outreach Command"
                    description="Log calls, copied email/text drafts, meeting notes, and next follow-up dates against the right record."
                    action={<Badge tone={canManage ? "green" : "slate"}>{canManage ? "Can edit" : "Read only"}</Badge>}
                  />
                </div>
                {!centerState.options.length ? (
                  <div className="p-4"><StateCard title="No records available" description="Create a lead, customer, estimate, or job before logging communication." tone="slate" /></div>
                ) : (
                  <form className="co-communications-form grid gap-3 p-4" onSubmit={submitCommunication}>
                    <SelectField label="Link communication to" value={selectedOption?.key || ""} onChange={(event) => setSelectedKey(event.target.value)} disabled={busy || !canManage}>
                      {centerState.options.map((option) => (
                        <option key={option.key} value={option.key}>{option.label} - {option.type}</option>
                      ))}
                    </SelectField>
                    {selectedOption ? (
                      <div className="co-communications-selected-context">
                        <span>Selected context</span>
                        <strong>{selectedOption.label}</strong>
                        {selectedOption.subtitle ? <em>{selectedOption.subtitle}</em> : null}
                        <Badge tone="slate">{selectedOption.type}</Badge>
                      </div>
                    ) : null}
                    <div className="co-communications-method-row flex flex-wrap gap-2">
                      {["Call", "Email", "Text", "In Person", "Other"].map((method) => (
                        <Button key={method} type="button" size="sm" variant={draft.method === method ? "primary" : "secondary"} onClick={() => setQuickMethod(method)} disabled={busy || !canManage}>
                          {method}
                        </Button>
                      ))}
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                      <InputField label="Contact name" value={draft.contactName} onChange={(event) => setDraft((current) => ({ ...current, contactName: event.target.value }))} disabled={busy || !canManage} />
                      <InputField label="Email" value={draft.contactEmail} onChange={(event) => setDraft((current) => ({ ...current, contactEmail: event.target.value }))} disabled={busy || !canManage} />
                      <InputField label="Phone" value={draft.contactPhone} onChange={(event) => setDraft((current) => ({ ...current, contactPhone: event.target.value }))} disabled={busy || !canManage} />
                    </div>
                    <div className="grid gap-3 md:grid-cols-4">
                      <SelectField label="Method" value={draft.method} onChange={(event) => setDraft((current) => ({ ...current, method: event.target.value }))} disabled={busy || !canManage}>
                        {CONTACT_HISTORY_METHODS.map((method) => <option key={method}>{method}</option>)}
                      </SelectField>
                      <SelectField label="Direction" value={draft.direction} onChange={(event) => setDraft((current) => ({ ...current, direction: event.target.value }))} disabled={busy || !canManage}>
                        {CONTACT_HISTORY_DIRECTIONS.map((direction) => <option key={direction} value={direction}>{direction === "outbound" ? "Outbound" : "Inbound"}</option>)}
                      </SelectField>
                      <SelectField label="Outcome" value={draft.outcome} onChange={(event) => setDraft((current) => ({ ...current, outcome: event.target.value }))} disabled={busy || !canManage}>
                        {CONTACT_HISTORY_OUTCOMES.map((outcome) => <option key={outcome}>{outcome}</option>)}
                      </SelectField>
                      <InputField label="Next follow-up" type="date" value={draft.nextFollowUpDate} onChange={(event) => setDraft((current) => ({ ...current, nextFollowUpDate: event.target.value }))} disabled={busy || !canManage} />
                    </div>
                    <InputField label="Subject / short title" value={draft.subject} onChange={(event) => setDraft((current) => ({ ...current, subject: event.target.value }))} disabled={busy || !canManage} placeholder="Estimate follow-up, site visit, approval call" />
                    <TextAreaField label="Draft message / script" value={draft.messageDraft} onChange={(event) => setDraft((current) => ({ ...current, messageDraft: event.target.value }))} disabled={busy || !canManage} placeholder="Manual email/SMS/call script. Stored only; Apex HQ does not send it." />
                    <TextAreaField label="Outcome notes" value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} disabled={busy || !canManage} placeholder="What happened, what the customer said, and what needs to happen next." />
                    <div className="co-communications-submit-row flex flex-wrap items-center gap-3">
                      <Button type="submit" disabled={busy || !canManage || !selectedOption}>Save communication</Button>
                      <p className="text-sm font-bold text-slate-500">{message || "Manual-only: no email, text, or phone call is sent."}</p>
                    </div>
                  </form>
                )}
              </Card>

              <Card className="co-communications-log-card overflow-hidden">
                <div className="co-communications-log-header border-b border-slate-200 p-4">
                  <SectionHeader title="Communication log" description="Search recent manual notes, drafts, follow-ups, and customer responses across office records." />
                  <div className="mt-3 grid gap-3 md:grid-cols-[220px_minmax(0,1fr)]">
                    <SelectField label="Type" value={entityTypeFilter} onChange={(event) => setEntityTypeFilter(event.target.value)}>
                      <option value="all">All records</option>
                      <option value="lead">Leads</option>
                      <option value="customer">Customers</option>
                      <option value="estimate">Estimates</option>
                      <option value="job">Jobs</option>
                    </SelectField>
                    <InputField label="Search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Customer, project, subject, outcome, or notes" />
                  </div>
                </div>
                <div className="divide-y divide-slate-100">
                  {centerState.filteredRecords.slice(0, 18).map((record) => renderCommunicationRecord(record))}
                  {!centerState.filteredRecords.length ? (
                    <div className="p-5"><StateCard title="No communication matches" description="Clear the filter or log the next manual customer touch." tone="slate" /></div>
                  ) : null}
                </div>
              </Card>
            </div>

            <aside className="co-communications-rail grid min-w-0 gap-3 content-start">
              {FollowUpQueuePanelComponent ? <FollowUpQueuePanelComponent
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
                onOpenLeads={() => onSelectLead(leads[0]?.id || "")}
                onCreateContactHistory={onCreateContactHistory}
                compact
                maxItems={8}
              /> : null}
              <Card className="co-communications-rules-card p-4">
                <SectionHeader title="Manual communication rules" description="This phase is visibility and logging only." />
                <div className="grid gap-2">
                  <div className="co-ai-boundary-row" data-state="manual"><span>Email/SMS</span><strong>Manual only</strong></div>
                  <div className="co-ai-boundary-row" data-state="safe"><span>Office data</span><strong>Role protected</strong></div>
                  <div className="co-ai-boundary-row" data-state="safe"><span>Company data</span><strong>Scoped server-side</strong></div>
                  <div className="co-ai-boundary-row" data-state="manual"><span>Automation</span><strong>Not included</strong></div>
                </div>
              </Card>
            </aside>
          </div>
        </div>
      </div>
    );
  }

  if (!isDesktopCommandViewport) {
    return renderCommunicationFallbackPage();
  }

  return (
    <div className="co-office-page co-communications-page co-communications-shell-page">
      <ApexOfficeCommandShell
        eyebrow="Office"
        title="Communication Center"
        description="Manual-first customer, lead, estimate, and job communication context. Nothing is emailed, texted, or called automatically."
        kpis={stats}
        queue={{
          title: "Communication queue",
          description: `${communicationShellQueue.length} lead, customer, estimate, and job context${communicationShellQueue.length === 1 ? "" : "s"} ready for manual outreach.`,
          items: communicationShellQueue,
          selectedId: selectedCommunicationShellItem?.id,
          onSelect: selectCommunicationShellItem,
          limit: 5,
          emptyState: <StateCard title="No records available" description="Create a lead, customer, estimate, or job before logging communication." tone="slate" />,
        }}
        detail={{
          title: "Manual outreach detail",
          item: selectedCommunicationShellItem,
          render: renderCommunicationShellDetail,
          emptyState: <StateCard title="No communication selected" description="Select a lead, customer, estimate, or job to log the next safe manual touch." tone="slate" />,
        }}
        quickActions={[
          { id: "due-follow-up", label: "Due Follow-Up", icon: "clock", onClick: () => openFirstCommunicationShellItem((item) => ["Overdue", "Due Today"].includes(item.statusLabel)), disabled: !communicationShellQueue.some((item) => ["Overdue", "Due Today"].includes(item.statusLabel)) },
          { id: "waiting-replies", label: "Waiting Replies", icon: "inbox", onClick: () => openFirstCommunicationShellItem((item) => item.statusLabel === "Waiting"), disabled: !communicationShellQueue.some((item) => item.statusLabel === "Waiting") },
          { id: "first-touch", label: "First Touch", icon: "plus", onClick: () => openFirstCommunicationShellItem((item) => item.statusLabel === "No Touch"), disabled: !communicationShellQueue.some((item) => item.statusLabel === "No Touch") },
        ]}
        className="co-communications-command-shell"
      />
    </div>
  );
}
