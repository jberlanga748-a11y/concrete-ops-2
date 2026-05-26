import { useMemo, useState } from "react";

import { Badge, Button } from "./app-shell-components";
import { buildManualOutreachDrafts } from "./manual-outreach-drafts";

export function ManualOutreachDraftPanel({
  item,
  companyName,
  user,
  disabled = false,
  onClose = () => {},
  onAction = async () => false,
}) {
  const drafts = useMemo(() => buildManualOutreachDrafts(item || {}, {
    companyName,
    senderName: user?.name || companyName,
  }), [companyName, item, user?.name]);
  const [copyMessage, setCopyMessage] = useState("");

  if (!item || item.type === "leadSource") return null;

  async function copyText(label, value) {
    if (!value) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = value;
        textarea.setAttribute("readonly", "true");
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopyMessage(`${label} copied.`);
    } catch {
      setCopyMessage("Could not copy automatically. Select the text below and copy manually.");
    }
  }

  function DraftBlock({ title, value, copyLabel, rows = 5 }) {
    return (
      <div className="rounded-2xl border border-blue-100 bg-white p-3">
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-black text-slate-950">{title}</p>
            <p className="mt-1 text-xs font-bold text-slate-500">Manual copy only - no message is sent from Apex HQ.</p>
          </div>
          <Button type="button" size="sm" variant="secondary" onClick={() => copyText(copyLabel, value)} disabled={disabled || !value}>Copy</Button>
        </div>
        <textarea
          className="field-input mt-3 min-h-[120px] whitespace-pre-wrap font-mono text-xs leading-5"
          readOnly
          rows={rows}
          value={value || ""}
          onFocus={(event) => event.currentTarget.select()}
        />
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-3xl border border-amber-100 bg-amber-50/60 p-4">
      <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <Badge tone="amber">Draft / Copy</Badge>
          <h4 className="mt-2 text-base font-black text-slate-950">{item.title}</h4>
          <p className="mt-1 text-sm leading-6 text-slate-700">Manual copy only - Apex HQ does not send email, SMS, or calls from this panel.</p>
        </div>
        <Button type="button" size="sm" variant="ghost" onClick={onClose}>Close Drafts</Button>
      </div>

      {copyMessage ? <p className="mt-3 rounded-2xl border border-emerald-100 bg-white px-3 py-2 text-sm font-bold text-emerald-700">{copyMessage}</p> : null}

      <div className="mt-4 grid gap-3 xl:grid-cols-2">
        <DraftBlock title="Email subject" value={drafts.emailSubject} copyLabel="Email subject" rows={2} />
        <DraftBlock title="Email body" value={drafts.emailBody} copyLabel="Email body" />
        <DraftBlock title="SMS/text body" value={drafts.smsBody} copyLabel="SMS draft" rows={4} />
        <DraftBlock title="Call script" value={drafts.callScript} copyLabel="Call script" />
        <DraftBlock title="Voicemail script" value={drafts.voicemailScript} copyLabel="Voicemail script" rows={4} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={() => onAction(item, "mark-email-sent", drafts)} disabled={disabled}>Mark Email Manually Sent</Button>
        <Button type="button" size="sm" onClick={() => onAction(item, "mark-text-sent", drafts)} disabled={disabled}>Mark Text Manually Sent</Button>
        <Button type="button" size="sm" variant="secondary" onClick={() => onAction(item, "log-call", drafts)} disabled={disabled}>Log Call Attempt</Button>
        <Button type="button" size="sm" variant="secondary" onClick={() => onAction(item, "mark-waiting", drafts)} disabled={disabled}>Mark Waiting on Response</Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => onAction(item, "follow-up-tomorrow", drafts)} disabled={disabled}>Follow-Up Tomorrow</Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => onAction(item, "follow-up-two-days", drafts)} disabled={disabled}>Follow-Up in 2 Days</Button>
      </div>
    </div>
  );
}
