import { useEffect, useMemo, useState } from "react";

import {
  CONTACT_HISTORY_DIRECTIONS,
  CONTACT_HISTORY_METHODS,
  CONTACT_HISTORY_OUTCOMES,
} from "../shared/contactHistory.js";
import {
  contactHistoryBadgeTone,
  contactHistoryTimeline,
  createContactHistoryDraft,
  deriveContactHistoryPanelState,
} from "./contact-history-utils";
import {
  Badge,
  Button,
  Card,
  InputField,
  SectionHeader,
  SelectField,
  StateCard,
  TextAreaField,
} from "./app-shell-components";

function formatContactDateTime(value) {
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

export function ContactHistoryPanel({
  entityType,
  entity,
  records = [],
  permissions,
  disabled,
  onCreate,
  onUpdate,
  onArchive,
  onRestore,
}) {
  const canManage = Boolean(permissions?.canManage);
  const entityId = entity?.id || "";
  const panelState = useMemo(() => deriveContactHistoryPanelState(records, entityType, entityId), [entityId, entityType, records]);
  const timeline = useMemo(() => contactHistoryTimeline(records, entityType, entityId), [entityId, entityType, records]);
  const [draft, setDraft] = useState(() => createContactHistoryDraft(entity, entityType, "Call"));
  const [copyMessage, setCopyMessage] = useState("");

  useEffect(() => {
    setDraft(createContactHistoryDraft(entity, entityType, "Call"));
    setCopyMessage("");
  }, [entity?.id, entityType]);

  if (!permissions?.canView) {
    return null;
  }

  function setQuickMethod(method) {
    setDraft((current) => ({
      ...current,
      method,
      outcome: method === "Email" || method === "Text" ? "Sent" : "Follow-Up Needed",
    }));
  }

  async function submitContactHistory(event) {
    event.preventDefault();
    if (!canManage || !entityId || typeof onCreate !== "function") return;
    const saved = await onCreate({
      ...draft,
      entityType,
      entityId,
    });
    if (saved) {
      setDraft(createContactHistoryDraft(entity, entityType, draft.method || "Call"));
    }
  }

  async function copyDraftText(record) {
    const content = [record.subject ? `Subject: ${record.subject}` : "", record.messageDraft || record.notes || ""].filter(Boolean).join("\n\n");
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      setCopyMessage("Draft copied.");
    } catch {
      setCopyMessage("Could not copy draft from this browser.");
    }
  }

  const latest = panelState.latestContact;
  const nextFollowUp = panelState.nextFollowUp;

  return (
    <Card className="p-4">
      <SectionHeader
        title="Contact history"
        description="Manual calls, emails, texts, follow-ups, and outreach drafts. Apex HQ does not send email or SMS here."
        action={<Badge tone={nextFollowUp ? "amber" : latest ? "blue" : "slate"}>{nextFollowUp ? `Next ${nextFollowUp.nextFollowUpDate}` : `${panelState.records.length} logged`}</Badge>}
      />
      {latest ? (
        <div className="mb-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-3 text-sm text-slate-600">
            <p><span className="font-black text-slate-950">Latest:</span> {latest.method} / {latest.outcome}</p>
            <p className="mt-1"><span className="font-black text-slate-950">When:</span> {formatContactDateTime(latest.contactedAt)}</p>
          </div>
          <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-3 text-sm text-amber-800">
            <p className="font-black">{nextFollowUp ? "Follow-up scheduled" : "No follow-up date set"}</p>
            <p className="mt-1">{nextFollowUp ? `${nextFollowUp.nextFollowUpDate} - ${nextFollowUp.outcome}` : "Add a next follow-up date when the office needs another touch."}</p>
          </div>
        </div>
      ) : (
        <StateCard title="No contact history yet" description="Log the first manual outreach note so future calls, drafts, and follow-ups are visible." tone="slate" />
      )}

      {canManage ? (
        <form className="mt-4 grid gap-3 rounded-3xl border border-blue-100 bg-blue-50/40 p-3" onSubmit={submitContactHistory}>
          <div className="flex flex-wrap gap-2">
            {["Call", "Email", "Text", "Other"].map((method) => (
              <Button key={method} type="button" size="sm" variant={draft.method === method ? "primary" : "secondary"} onClick={() => setQuickMethod(method)} disabled={disabled}>
                Log {method}
              </Button>
            ))}
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <InputField label="Contact name" value={draft.contactName} onChange={(event) => setDraft((current) => ({ ...current, contactName: event.target.value }))} disabled={disabled} />
            <InputField label="Email" value={draft.contactEmail} onChange={(event) => setDraft((current) => ({ ...current, contactEmail: event.target.value }))} disabled={disabled} />
            <InputField label="Phone" value={draft.contactPhone} onChange={(event) => setDraft((current) => ({ ...current, contactPhone: event.target.value }))} disabled={disabled} />
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            <SelectField label="Method" value={draft.method} onChange={(event) => setDraft((current) => ({ ...current, method: event.target.value }))} disabled={disabled}>
              {CONTACT_HISTORY_METHODS.map((method) => <option key={method}>{method}</option>)}
            </SelectField>
            <SelectField label="Direction" value={draft.direction} onChange={(event) => setDraft((current) => ({ ...current, direction: event.target.value }))} disabled={disabled}>
              {CONTACT_HISTORY_DIRECTIONS.map((direction) => <option key={direction} value={direction}>{direction === "outbound" ? "Outbound" : "Inbound"}</option>)}
            </SelectField>
            <SelectField label="Outcome" value={draft.outcome} onChange={(event) => setDraft((current) => ({ ...current, outcome: event.target.value }))} disabled={disabled}>
              {CONTACT_HISTORY_OUTCOMES.map((outcome) => <option key={outcome}>{outcome}</option>)}
            </SelectField>
            <InputField label="Contacted at" type="datetime-local" value={draft.contactedAt} onChange={(event) => setDraft((current) => ({ ...current, contactedAt: event.target.value }))} disabled={disabled} />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <InputField label="Subject / short title" value={draft.subject} onChange={(event) => setDraft((current) => ({ ...current, subject: event.target.value }))} disabled={disabled} placeholder="Follow-up on estimate request" />
            <InputField label="Next follow-up date" type="date" value={draft.nextFollowUpDate} onChange={(event) => setDraft((current) => ({ ...current, nextFollowUpDate: event.target.value }))} disabled={disabled} />
          </div>
          <TextAreaField label="Draft message / script" value={draft.messageDraft} onChange={(event) => setDraft((current) => ({ ...current, messageDraft: event.target.value }))} disabled={disabled} placeholder="Paste an AI draft, SMS draft, call script, or email text here. This is stored only; nothing is sent." />
          <TextAreaField label="Outcome notes" value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} disabled={disabled} placeholder="Manual result, customer response, or office follow-up note." />
          <Button type="submit" disabled={disabled || !entityId}>Save contact history</Button>
        </form>
      ) : (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-slate-600">Read-only contact history.</div>
      )}

      {copyMessage ? <p className="mt-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">{copyMessage}</p> : null}

      {timeline.length > 0 ? (
        <div className="mt-4 space-y-3">
          {timeline.slice(0, 8).map((record) => (
            <div key={record.id} className={`rounded-2xl border p-3 ${record.archivedAt ? "border-slate-200 bg-slate-50 opacity-75" : "border-blue-100 bg-white"}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-2">
                    <Badge tone={contactHistoryBadgeTone(record.method, "method")}>{record.method}</Badge>
                    <Badge tone={contactHistoryBadgeTone(record.outcome)}>{record.outcome}</Badge>
                    <Badge tone="slate">{record.direction === "outbound" ? "Outbound" : "Inbound"}</Badge>
                    {record.archivedAt ? <Badge tone="slate">Archived</Badge> : null}
                  </div>
                  <p className="mt-2 text-sm font-black text-slate-950">{record.subject || record.contactName || "Manual outreach"}</p>
                  <p className="mt-1 text-xs font-bold text-slate-500">{formatContactDateTime(record.contactedAt)} by {record.createdByName || "Office"}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {record.messageDraft || record.notes ? <Button type="button" size="sm" variant="ghost" onClick={() => copyDraftText(record)}>Copy Draft</Button> : null}
                  {canManage && !record.archivedAt && typeof onUpdate === "function" ? <Button type="button" size="sm" variant="ghost" onClick={() => onUpdate(record.id, { outcome: "Waiting on Response" })} disabled={disabled}>Mark waiting</Button> : null}
                  {canManage && !record.archivedAt ? <Button type="button" size="sm" variant="ghost" onClick={() => onArchive?.(record.id)} disabled={disabled}>Archive</Button> : null}
                  {canManage && record.archivedAt ? <Button type="button" size="sm" variant="ghost" onClick={() => onRestore?.(record.id)} disabled={disabled}>Restore</Button> : null}
                </div>
              </div>
              {record.messageDraft ? <p className="mt-3 whitespace-pre-wrap rounded-2xl bg-blue-50/60 p-3 text-sm leading-6 text-slate-700">{record.messageDraft}</p> : null}
              {record.notes ? <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{record.notes}</p> : null}
              {record.nextFollowUpDate ? <p className="mt-3 text-xs font-black uppercase tracking-[0.16em] text-amber-700">Next follow-up: {record.nextFollowUpDate}</p> : null}
            </div>
          ))}
        </div>
      ) : null}
    </Card>
  );
}
