import { useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.mjs?url";

import {
  askApexOs,
  createApexOsMemory,
  createApexOsApprovalPacket,
  createApexOsExecutionHandoff,
  getApexOsMemory,
  getApexOsApprovalPackets,
  getApexOsDailyBriefing,
  getApexOsExecutionHandoffs,
  updateApexOsMemory,
  updateApexOsApprovalPacket,
  updateApexOsExecutionHandoff,
} from "./api";
import { Badge, Button, Card, Icon, PageHeader, SectionHeader } from "./app-shell-components";
import { deriveApexControlRoomState } from "./apex-control-room-utils";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

function ToneBadge({ children, tone = "slate" }) {
  return <Badge tone={tone}>{children}</Badge>;
}

function KpiTile({ item }) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-[0_14px_34px_-30px_rgba(7,17,31,0.5)]">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <p className="min-w-0 break-words text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">{item.label}</p>
        <ToneBadge tone={item.tone}>{item.value}</ToneBadge>
      </div>
      <p className="mt-3 min-w-0 break-words text-sm font-bold leading-5 text-slate-600">{item.detail}</p>
    </div>
  );
}

function StatusRow({ item }) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white px-4 py-3">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="break-words text-sm font-black text-slate-950">{item.title}</p>
          <p className="mt-1 break-words text-xs font-bold leading-5 text-slate-600">{item.detail}</p>
        </div>
        <ToneBadge tone={item.tone}>{item.status}</ToneBadge>
      </div>
    </div>
  );
}

function ApprovalRow({ item }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 border-b border-slate-100 py-2 last:border-b-0">
      <p className="min-w-0 break-words text-sm font-black text-slate-800">{item.label}</p>
      <span className="max-w-[52%] rounded-lg bg-amber-50 px-2.5 py-1 text-right text-[11px] font-black leading-4 text-amber-800 ring-1 ring-amber-200">{item.status}</span>
    </div>
  );
}

function EvidenceRow({ item }) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="break-words text-sm font-black text-slate-950">{item.title}</p>
      {item.meta ? <p className="mt-1 break-words text-xs font-bold text-slate-500">{item.meta}</p> : null}
    </div>
  );
}

function MemoryRow({ item }) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white px-4 py-3">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="break-words text-[10px] font-black uppercase tracking-[0.16em] text-orange-700">{item.category || "Operating rule"}</p>
          <p className="mt-1 break-words text-sm font-black text-slate-950">{item.title}</p>
          <p className="mt-1 break-words text-xs font-bold leading-5 text-slate-600">{item.detail}</p>
          {item.source || item.sourceLabel ? <p className="mt-2 break-words text-[11px] font-black text-slate-500">Source: {item.sourceLabel || item.source}</p> : null}
          {item.recordedAt ? <p className="mt-1 break-words text-[11px] font-black text-slate-500">Recorded: {item.recordedAt}</p> : null}
          {item.reviewNote ? <p className="mt-1 break-words text-[11px] font-black text-slate-500">Review: {item.reviewNote}</p> : null}
        </div>
        <ToneBadge tone={item.tone}>{item.status}</ToneBadge>
      </div>
    </div>
  );
}

function EmptyPanel({ children }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm font-bold text-slate-600">
      {children}
    </div>
  );
}

function AskApexAnswerPanel({ response, error }) {
  if (error) {
    return (
      <StatusRow item={{
        id: "ask-apex-error",
        title: "Ask Apex response",
        status: "Needs attention",
        detail: error,
        tone: "red",
      }} />
    );
  }
  if (!response?.answer) return null;

  const answer = response.answer;
  const sourceLabels = Array.isArray(answer.sourceLabels) ? answer.sourceLabels : [];
  const approvalWarnings = Array.isArray(answer.approvalWarnings) ? answer.approvalWarnings : [];

  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="break-words text-sm font-black text-slate-950">Apex answer</p>
          <p className="mt-1 break-words text-sm font-bold leading-6 text-slate-700">{answer.answer}</p>
        </div>
        <ToneBadge tone={answer.ok === false ? "amber" : "green"}>{answer.mode || "source-backed"}</ToneBadge>
      </div>

      <div className="mt-4 grid min-w-0 gap-3 lg:grid-cols-2">
        <StatusRow item={{
          id: "ask-next-action",
          title: "Next action",
          status: answer.nextAction || "Review",
          detail: answer.providerConfigured ? "Provider was configured server-side for this answer, with local fallback if the provider failed." : "Local source-backed fallback answered because no server-side provider key is configured here.",
          tone: approvalWarnings.length ? "amber" : "green",
        }} />
        <StatusRow item={{
          id: "ask-context-count",
          title: "Evidence count",
          status: `${response.context?.sourceCount || sourceLabels.length || 0} sources`,
          detail: `${response.context?.memoryCount || 0} approved memory rows and ${response.context?.approvalWarningCount || approvalWarnings.length || 0} approval warnings were returned by the private endpoint.`,
          tone: "blue",
        }} />
      </div>

      <div className="mt-4 grid min-w-0 gap-3 lg:grid-cols-2">
        <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Sources</p>
          <div className="mt-2 flex min-w-0 flex-wrap gap-2">
            {sourceLabels.length ? sourceLabels.map((label) => <ToneBadge key={label} tone="slate">{label}</ToneBadge>) : <ToneBadge tone="amber">No source labels</ToneBadge>}
          </div>
        </div>
        <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Approval warnings</p>
          <div className="mt-2 grid min-w-0 gap-2">
            {approvalWarnings.length ? approvalWarnings.map((warning) => (
              <p key={warning} className="break-words rounded-lg bg-amber-50 px-3 py-2 text-xs font-black leading-5 text-amber-800 ring-1 ring-amber-200">{warning}</p>
            )) : <p className="text-xs font-black text-emerald-700">No risky action was requested.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function AskApexPanel({ state, sessionToken, question, setQuestion }) {
  const [response, setResponse] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const canAsk = state.canView && Boolean(sessionToken) && question.trim() && !submitting;

  async function handleSubmit(event) {
    event.preventDefault();
    if (!canAsk) return;
    setSubmitting(true);
    setError("");
    try {
      const payload = await askApexOs(sessionToken, { question: question.trim() });
      setResponse(payload);
    } catch (requestError) {
      setError(requestError?.message || "Ask Apex could not answer right now.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-w-0 gap-4">
      <div className="grid min-w-0 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {state.askApexChat.contexts.map((item) => (
          <button
            key={item.id}
            type="button"
            disabled
            className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-left opacity-90"
            title={`${item.title}: ${item.status}`}
          >
            <span className="block break-words text-sm font-black text-slate-950">{item.title}</span>
            <span className="mt-1 block break-words text-xs font-bold leading-5 text-slate-600">{item.detail}</span>
            <span className="mt-2 inline-flex"><ToneBadge tone={item.tone}>{item.status}</ToneBadge></span>
          </button>
        ))}
      </div>

      <form className="min-w-0 rounded-xl border border-slate-200 bg-white p-3" onSubmit={handleSubmit}>
        <label className="sr-only" htmlFor="ask-apex-input">Ask Apex</label>
        <textarea
          id="ask-apex-input"
          value={question}
          onChange={(event) => {
            setQuestion(event.target.value);
            setError("");
          }}
          maxLength={1000}
          placeholder={state.askApexChat.placeholder}
          className="min-h-28 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold leading-6 text-slate-700 placeholder:text-slate-500"
          disabled={!state.canView || submitting}
        />
        <div className="mt-3 flex min-w-0 flex-wrap gap-2">
          <Button type="submit" disabled={!canAsk} variant="secondary" size="sm">
            <Icon name="spark" /> {submitting ? "Asking Apex..." : "Ask Apex"}
          </Button>
          <Button type="button" disabled variant="secondary" size="sm">
            <Icon name="clipboard" /> Evidence returned
          </Button>
          <Button type="button" disabled variant="secondary" size="sm">
            <Icon name="lock" /> No execution
          </Button>
        </div>
      </form>

      <AskApexAnswerPanel response={response} error={error} />
      <StatusRow item={state.askApexChat.answerPreview} />
    </div>
  );
}

function VoiceTranscriptPanel({ state, onUseTranscript }) {
  const [transcriptDraft, setTranscriptDraft] = useState("");
  const [confirmedTranscript, setConfirmedTranscript] = useState("");
  const [notice, setNotice] = useState("");
  const canConfirm = state.canView && Boolean(transcriptDraft.trim());
  const canUse = state.canView && Boolean(confirmedTranscript.trim());

  function confirmTranscript() {
    if (!canConfirm) return;
    setConfirmedTranscript(transcriptDraft.trim());
    setNotice("Transcript confirmed locally. Review it before sending it to Ask Apex.");
  }

  function useTranscript() {
    if (!canUse) return;
    onUseTranscript(confirmedTranscript.trim());
    setNotice("Confirmed transcript copied into Ask Apex. Press Ask Apex when ready.");
  }

  return (
    <div className="grid min-w-0 gap-4">
      <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div className="flex min-h-44 min-w-0 flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
          <button
            type="button"
            disabled
            className="inline-flex h-20 w-20 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-500 shadow-[0_16px_34px_-28px_rgba(7,17,31,0.5)] disabled:cursor-not-allowed"
            title="Microphone access is locked"
          >
            <Icon name="phone" className="h-8 w-8" />
          </button>
          <p className="mt-3 break-words text-sm font-black text-slate-950">{state.voiceInterface.prompt}</p>
          <p className="mt-1 break-words text-xs font-bold leading-5 text-slate-600">{state.voiceInterface.providerStatus}</p>
        </div>
        <div className="grid min-w-0 gap-3">
          <StatusRow item={{
            id: "voice-transcript-preview",
            title: "Transcript preview",
            status: confirmedTranscript ? "Confirmed locally" : state.voiceInterface.transcriptStatus,
            detail: confirmedTranscript || state.voiceInterface.transcriptPreview,
            tone: confirmedTranscript ? "green" : "blue",
          }} />
          <StatusRow item={{
            id: "voice-answer-preview",
            title: "Spoken answer preview",
            status: state.voiceInterface.answerStatus,
            detail: state.voiceInterface.answerPreview,
            tone: "amber",
          }} />
        </div>
      </div>

      <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-3">
        <label className="sr-only" htmlFor="voice-transcript-input">Voice transcript</label>
        <textarea
          id="voice-transcript-input"
          value={transcriptDraft}
          onChange={(event) => {
            setTranscriptDraft(event.target.value);
            setNotice("");
          }}
          maxLength={1000}
          placeholder="Type what Apex heard before treating it as a command."
          className="min-h-24 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold leading-6 text-slate-700 placeholder:text-slate-500"
          disabled={!state.canView}
        />
        <div className="mt-3 flex min-w-0 flex-wrap gap-2">
          <Button type="button" disabled variant="secondary" size="sm">
            <Icon name="phone" /> Mic locked
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={confirmTranscript} disabled={!canConfirm}>
            <Icon name="clipboard" /> Confirm transcript
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={useTranscript} disabled={!canUse}>
            <Icon name="spark" /> Use in Ask Apex
          </Button>
          <Button type="button" disabled variant="secondary" size="sm">
            <Icon name="lock" /> Speech locked
          </Button>
        </div>
        <p className="mt-3 break-words text-xs font-black leading-5 text-slate-500">{notice || "Manual transcript only. Apex does not request microphone access, store audio, or execute voice commands."}</p>
      </div>
    </div>
  );
}

function DailyBriefingPanel({ state, sessionToken }) {
  const [briefing, setBriefing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const canRefresh = state.canView && Boolean(sessionToken) && !loading;
  const rows = briefing?.briefingRows?.length ? briefing.briefingRows : state.releaseMonitoring.briefingRows;

  async function refreshBriefing() {
    if (!canRefresh) return;
    setLoading(true);
    setNotice("");
    try {
      const payload = await getApexOsDailyBriefing(sessionToken);
      setBriefing(payload.dailyBriefing);
      setNotice("Daily briefing refreshed from current Apex HQ workspace state.");
    } catch (error) {
      setNotice(error?.message || "Daily briefing could not refresh right now.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-w-0 gap-3">
      <div className="flex min-w-0 flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="break-words text-sm font-black text-slate-950">{briefing?.summary || "Refresh the briefing for a current private operating snapshot."}</p>
          <p className="mt-1 break-words text-xs font-bold leading-5 text-slate-600">{notice || "Read-only: no alerts are sent and no records are changed."}</p>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={refreshBriefing} disabled={!canRefresh}>
          <Icon name="refresh" /> {loading ? "Refreshing..." : "Refresh"}
        </Button>
      </div>
      {rows.map((item) => <StatusRow key={item.id} item={item} />)}
      {briefing?.alerts?.length ? (
        <div className="grid min-w-0 gap-3">
          <SectionHeader title="Briefing Locks" description={`${briefing.alerts.length} safety locks returned with the briefing.`} />
          {briefing.alerts.map((item) => <StatusRow key={item.id} item={item} />)}
        </div>
      ) : null}
      {briefing?.sourceLabels?.length ? (
        <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Briefing sources</p>
          <div className="mt-2 flex min-w-0 flex-wrap gap-2">
            {briefing.sourceLabels.map((label) => <ToneBadge key={label} tone="slate">{label}</ToneBadge>)}
          </div>
        </div>
      ) : null}
    </div>
  );
}

const EMPTY_DECISION_MEMORY_FORM = {
  category: "roadmap-decision",
  title: "",
  body: "",
  sourceType: "manual",
  sourceLabel: "Apex Control Room",
  sourceUri: "",
  reviewNote: "",
  status: "suggested",
  confidence: 80,
};

function DecisionMemoryManager({ state, sessionToken }) {
  const [form, setForm] = useState(EMPTY_DECISION_MEMORY_FORM);
  const [memoryRows, setMemoryRows] = useState(state.decisionMemory?.durableEntries || []);
  const [summary, setSummary] = useState(null);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const canUse = state.canView && Boolean(sessionToken) && !loading;
  const canCreate = canUse && form.title.trim() && form.body.trim() && form.sourceLabel.trim();
  const activeSummary = summary || state.decisionMemory?.memorySummary || { total: memoryRows.length, approved: 0, suggested: 0, archived: 0 };

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setNotice("");
  }

  async function refreshMemory() {
    if (!canUse) return;
    setLoading(true);
    setNotice("");
    try {
      const payload = await getApexOsMemory(sessionToken);
      setMemoryRows(payload.apexOsMemory || []);
      setSummary(payload.summary || null);
      setNotice("Decision memory loaded from private Apex OS storage.");
    } catch (error) {
      setNotice(error?.message || "Decision memory could not load right now.");
    } finally {
      setLoading(false);
    }
  }

  async function submitMemory(event) {
    event.preventDefault();
    if (!canCreate) return;
    setLoading(true);
    setNotice("");
    try {
      const payload = await createApexOsMemory(sessionToken, { ...form, status: "suggested" });
      setMemoryRows((current) => [payload.apexOsMemoryEntry, ...current].filter(Boolean));
      setSummary((current) => ({
        total: (current?.total || 0) + 1,
        approved: current?.approved || 0,
        suggested: (current?.suggested || 0) + 1,
        archived: current?.archived || 0,
      }));
      setForm(EMPTY_DECISION_MEMORY_FORM);
      setNotice("Decision memory drafted as suggested. It is not operating context until approved.");
    } catch (error) {
      setNotice(error?.message || "Decision memory could not be saved right now.");
    } finally {
      setLoading(false);
    }
  }

  async function setMemoryStatus(row, status) {
    if (!canUse || !row?.id) return;
    setLoading(true);
    setNotice("");
    try {
      await updateApexOsMemory(sessionToken, row.id, { ...row, status });
      const payload = await getApexOsMemory(sessionToken);
      setMemoryRows(payload.apexOsMemory || []);
      setSummary(payload.summary || null);
      setNotice(status === "archived" ? "Decision archived. It no longer feeds approved Apex OS context." : "Decision approved for source-backed Apex OS context.");
    } catch (error) {
      setNotice(error?.message || "Decision memory could not be updated right now.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-w-0 gap-4">
      <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatusRow item={{
          id: "decision-memory-saved",
          title: "Saved memory",
          status: `${activeSummary.total || 0}`,
          detail: `${activeSummary.approved || 0} approved, ${activeSummary.suggested || 0} suggested, ${activeSummary.archived || 0} archived.`,
          tone: activeSummary.approved ? "green" : "blue",
        }} />
        <StatusRow item={{
          id: "decision-memory-categories",
          title: "Phase 4 categories",
          status: `${state.decisionMemory.coveredCategoryCount || 0}/${state.decisionMemory.categoryCount || 0}`,
          detail: "Product identity, safety, roadmap, build freeze, business goal, provider/account, and personal preference decisions are covered.",
          tone: "green",
        }} />
      </div>

      <form className="grid min-w-0 gap-3 rounded-xl border border-slate-200 bg-white p-3" onSubmit={submitMemory}>
        <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_260px]">
          <input
            value={form.title}
            onChange={(event) => updateField("title", event.target.value)}
            maxLength={140}
            placeholder="Decision title"
            className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700"
            disabled={!state.canView || loading}
          />
          <select
            value={form.category}
            onChange={(event) => updateField("category", event.target.value)}
            className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700"
            disabled={!state.canView || loading}
          >
            {state.decisionMemory.categories.map((category) => (
              <option key={category.id} value={category.id}>{category.label}</option>
            ))}
          </select>
        </div>
        <textarea
          value={form.body}
          onChange={(event) => updateField("body", event.target.value)}
          maxLength={1800}
          placeholder="What did the operator decide?"
          className="min-h-20 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold leading-6 text-slate-700"
          disabled={!state.canView || loading}
        />
        <div className="grid min-w-0 gap-3 lg:grid-cols-3">
          <input value={form.sourceLabel} onChange={(event) => updateField("sourceLabel", event.target.value)} maxLength={120} placeholder="Source label" className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700" disabled={!state.canView || loading} />
          <input value={form.sourceUri} onChange={(event) => updateField("sourceUri", event.target.value)} maxLength={240} placeholder="Source URI or file" className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700" disabled={!state.canView || loading} />
          <input value={form.reviewNote} onChange={(event) => updateField("reviewNote", event.target.value)} maxLength={300} placeholder="Review note" className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700" disabled={!state.canView || loading} />
        </div>
        <div className="flex min-w-0 flex-wrap gap-2">
          <Button type="submit" variant="secondary" size="sm" disabled={!canCreate}>
            <Icon name="clipboard" /> {loading ? "Saving..." : "Draft memory"}
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={refreshMemory} disabled={!canUse}>
            <Icon name="refresh" /> Load decisions
          </Button>
          <Button type="button" disabled variant="secondary" size="sm">
            <Icon name="lock" /> No hidden memory
          </Button>
        </div>
        <p className="break-words text-xs font-black leading-5 text-slate-500">{notice || "Memory requires a source label, stores no secrets, starts as suggested, and becomes operating context only after manual approval."}</p>
      </form>

      <div className="grid min-w-0 gap-3">
        {memoryRows.length ? memoryRows.slice(0, 6).map((row) => (
          <div key={row.id} className="min-w-0 rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="break-words text-[10px] font-black uppercase tracking-[0.16em] text-orange-700">{String(row.category || "general").replace(/-/g, " ")}</p>
                <p className="mt-1 break-words text-sm font-black text-slate-950">{row.title}</p>
                <p className="mt-1 break-words text-xs font-bold leading-5 text-slate-600">{row.body}</p>
                <p className="mt-2 break-words text-[11px] font-black text-slate-500">Source: {row.sourceLabel || "Missing source"}{row.createdAt ? ` | Created: ${row.createdAt}` : ""}</p>
              </div>
              <ToneBadge tone={row.status === "approved" ? "green" : row.status === "archived" ? "slate" : "blue"}>{row.status}</ToneBadge>
            </div>
            <div className="mt-3 flex min-w-0 flex-wrap gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => setMemoryStatus(row, "approved")} disabled={!canUse || row.status === "approved" || row.status === "archived"}>
                <Icon name="check" /> Approve
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={() => setMemoryStatus(row, "archived")} disabled={!canUse || row.status === "archived"}>
                <Icon name="clock" /> Archive
              </Button>
            </div>
          </div>
        )) : (
          <EmptyPanel>No durable decision memory loaded yet.</EmptyPanel>
        )}
      </div>
    </div>
  );
}

const EMPTY_KNOWLEDGE_VAULT_FORM = {
  category: "app-docs",
  title: "",
  body: "",
  sourceType: "knowledge-upload",
  sourceLabel: "Apex Knowledge Vault",
  sourceUri: "",
  reviewNote: "Summary pending - manual review required.",
  status: "suggested",
  confidence: 70,
};

const KNOWLEDGE_VAULT_BODY_LIMIT = 1800;
const KNOWLEDGE_VAULT_EXTRACT_LIMIT = 6000;
const KNOWLEDGE_VAULT_DEFAULT_SOURCE_LABEL = EMPTY_KNOWLEDGE_VAULT_FORM.sourceLabel;

function categoryTitle(categories = [], id = "") {
  return categories.find((category) => category.id === id)?.title || String(id || "Knowledge").replace(/-/g, " ");
}

function fileSizeLabel(size = 0) {
  const bytes = Number(size) || 0;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} bytes`;
}

async function extractPdfKnowledgeText(file) {
  const data = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjsLib.getDocument({ data, disableWorker: true });
  try {
    const pdf = await loadingTask.promise;
    const pageTexts = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = content.items.map((item) => item.str || "").join(" ").replace(/\s+/g, " ").trim();
      if (text) pageTexts.push(text);
      if (pageTexts.join(" ").length >= KNOWLEDGE_VAULT_EXTRACT_LIMIT) break;
    }
    return {
      text: pageTexts.join("\n\n").slice(0, KNOWLEDGE_VAULT_EXTRACT_LIMIT),
      pageCount: pdf.numPages,
    };
  } finally {
    loadingTask.destroy?.();
  }
}

async function extractKnowledgeFileText(file) {
  if (/\\.pdf$/i.test(file.name) || file.type === "application/pdf") {
    return extractPdfKnowledgeText(file);
  }
  return {
    text: (await file.text()).slice(0, KNOWLEDGE_VAULT_EXTRACT_LIMIT),
    pageCount: 0,
  };
}

function filterKnowledgeRows(rows = [], { category, source, status, query } = {}) {
  const normalizedQuery = String(query || "").trim().toLowerCase();
  const normalizedSource = String(source || "all").trim().toLowerCase();
  return rows
    .filter((row) => !category || category === "all" || row.category === category)
    .filter((row) => !status || status === "all" || row.status === status)
    .filter((row) => source === "all" || [row.sourceLabel, row.sourceType, row.sourceUri].some((value) => String(value || "").toLowerCase().includes(normalizedSource)))
    .filter((row) => {
      if (!normalizedQuery) return true;
      return [row.title, row.body, row.sourceLabel, row.sourceUri, row.reviewNote, row.category].some((value) => String(value || "").toLowerCase().includes(normalizedQuery));
    });
}

function knowledgeDuplicateKeys({ title = "", sourceLabel = "", sourceUri = "" } = {}) {
  return [sourceUri, sourceLabel !== KNOWLEDGE_VAULT_DEFAULT_SOURCE_LABEL ? sourceLabel : "", title]
    .map((value) => String(value || "").trim().toLowerCase())
    .filter(Boolean);
}

function KnowledgeVaultManager({ state, sessionToken }) {
  const [form, setForm] = useState(EMPTY_KNOWLEDGE_VAULT_FORM);
  const [vaultRows, setVaultRows] = useState(state.knowledgeVault?.vaultEntries || []);
  const [summary, setSummary] = useState(state.knowledgeVault?.vaultSummary || null);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const canUse = state.canView && Boolean(sessionToken) && !loading;
  const categoryIds = new Set((state.knowledgeVault?.categories || []).map((category) => category.id));
  const knowledgeRows = vaultRows.filter((row) => categoryIds.has(row.category));
  const duplicateKeys = knowledgeDuplicateKeys(form);
  const duplicateRow = duplicateKeys.length ? knowledgeRows.find((row) => row.status !== "archived" && knowledgeDuplicateKeys(row).some((key) => duplicateKeys.includes(key))) : null;
  const canCreate = canUse && form.category && form.title.trim() && form.body.trim() && form.sourceLabel.trim() && !duplicateRow;
  const sourceOptions = [...new Set([
    ...(state.knowledgeVault?.sourceOptions || []),
    ...knowledgeRows.map((row) => row.sourceLabel).filter(Boolean),
  ])].sort((left, right) => left.toLowerCase().localeCompare(right.toLowerCase()));
  const visibleRows = filterKnowledgeRows(knowledgeRows, {
    category: categoryFilter,
    source: sourceFilter,
    status: statusFilter,
    query: search,
  });
  const activeSummary = summary || state.knowledgeVault?.vaultSummary || {
    total: knowledgeRows.length,
    trusted: knowledgeRows.filter((row) => row.status === "approved").length,
    suggested: knowledgeRows.filter((row) => row.status === "suggested").length,
    archived: knowledgeRows.filter((row) => row.status === "archived").length,
  };

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setNotice("");
  }

  function updateFromMemoryPayload(payload, message) {
    const rows = (payload.apexOsMemory || payload.companySettings?.apexOsMemory || []).filter((row) => categoryIds.has(row.category));
    setVaultRows(rows);
    const total = rows.length;
    setSummary({
      total,
      trusted: rows.filter((row) => row.status === "approved").length,
      suggested: rows.filter((row) => row.status === "suggested").length,
      archived: rows.filter((row) => row.status === "archived").length,
      sourceCount: new Set(rows.map((row) => row.sourceLabel).filter(Boolean)).size,
      sourceLabels: [...new Set(rows.map((row) => row.sourceLabel).filter(Boolean))],
    });
    setNotice(message);
  }

  async function refreshVault() {
    if (!canUse) return;
    setLoading(true);
    setNotice("");
    try {
      const payload = await getApexOsMemory(sessionToken);
      updateFromMemoryPayload(payload, "Knowledge vault loaded from private Apex OS memory.");
    } catch (error) {
      setNotice(error?.message || "Knowledge vault could not load right now.");
    } finally {
      setLoading(false);
    }
  }

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const allowed = /\.(txt|md|markdown|json|csv|log|html|css|js|jsx|ts|tsx|pdf)$/i.test(file.name) || file.type === "application/pdf";
    if (!allowed) {
      setNotice("Use a text-based source file or PDF for this private vault intake.");
      return;
    }
    try {
      const extracted = await extractKnowledgeFileText(file);
      const body = extracted.text.slice(0, KNOWLEDGE_VAULT_BODY_LIMIT);
      if (!body.trim()) {
        setNotice("Apex could not find readable text in that file.");
        return;
      }
      const extractionSummary = `${file.type === "application/pdf" || /\.pdf$/i.test(file.name) ? `PDF text extracted${extracted.pageCount ? ` from ${extracted.pageCount} page${extracted.pageCount === 1 ? "" : "s"}` : ""}` : "Text file loaded"}; ${fileSizeLabel(file.size)}; ${extracted.text.length} characters read; ${Math.min(body.length, KNOWLEDGE_VAULT_BODY_LIMIT)} saved for review.`;
      setForm((current) => ({
        ...current,
        title: current.title.trim() ? current.title : file.name.replace(/\.[^.]+$/, ""),
        body,
        sourceType: "knowledge-upload",
        sourceLabel: file.name,
        sourceUri: `local-upload:${file.name}`,
        reviewNote: extractionSummary.slice(0, 300),
      }));
      setNotice(`${file.name} loaded locally as suggested knowledge. Review before drafting.`);
    } catch {
      setNotice("Apex could not read that local knowledge file.");
    }
  }

  async function submitKnowledge(event) {
    event.preventDefault();
    if (!canCreate) return;
    setLoading(true);
    setNotice("");
    try {
      const payload = await createApexOsMemory(sessionToken, {
        ...form,
        status: "suggested",
        sourceType: form.sourceType || "knowledge-upload",
      });
      setVaultRows((current) => [payload.apexOsMemoryEntry, ...current].filter(Boolean));
      setSummary((current) => ({
        total: (current?.total || activeSummary.total || 0) + 1,
        trusted: current?.trusted || activeSummary.trusted || 0,
        suggested: (current?.suggested || activeSummary.suggested || 0) + 1,
        archived: current?.archived || activeSummary.archived || 0,
        sourceCount: current?.sourceCount || activeSummary.sourceCount || sourceOptions.length,
        sourceLabels: current?.sourceLabels || activeSummary.sourceLabels || sourceOptions,
      }));
      setForm(EMPTY_KNOWLEDGE_VAULT_FORM);
      setNotice("Knowledge drafted as suggested. It is not trusted Apex context until manually approved.");
    } catch (error) {
      setNotice(error?.message || "Knowledge could not be saved right now.");
    } finally {
      setLoading(false);
    }
  }

  async function setKnowledgeStatus(row, status) {
    if (!canUse || !row?.id) return;
    setLoading(true);
    setNotice("");
    try {
      await updateApexOsMemory(sessionToken, row.id, { ...row, status });
      const payload = await getApexOsMemory(sessionToken);
      updateFromMemoryPayload(payload, status === "archived" ? "Knowledge archived from trusted context." : "Knowledge approved as trusted Apex OS memory.");
    } catch (error) {
      setNotice(error?.message || "Knowledge could not be updated right now.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-w-0 gap-4">
      <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatusRow item={{
          id: "vault-total",
          title: "Saved knowledge",
          status: `${activeSummary.total || 0}`,
          detail: `${activeSummary.trusted || 0} trusted, ${activeSummary.suggested || 0} suggested, ${activeSummary.archived || 0} archived.`,
          tone: activeSummary.trusted ? "green" : "blue",
        }} />
        <StatusRow item={{
          id: "vault-sources",
          title: "Source metadata",
          status: `${sourceOptions.length || activeSummary.sourceCount || 0}`,
          detail: "Each vault row keeps category, source label, source URI, review status, and summary status.",
          tone: "blue",
        }} />
        <StatusRow item={{
          id: "vault-review",
          title: "Manual review",
          status: "Required",
          detail: "Suggested uploads do not feed trusted Apex context until approved from this panel.",
          tone: "amber",
        }} />
        <StatusRow item={{
          id: "vault-boundary",
          title: "Private boundary",
          status: "Locked",
          detail: "No customer uploads, public publishing, provider calls, embeddings, or binary storage are created here.",
          tone: "amber",
        }} />
      </div>
      {duplicateRow ? (
        <StatusRow item={{
          id: "vault-duplicate-source",
          title: "Duplicate source guard",
          status: "Already saved",
          detail: `${duplicateRow.title || duplicateRow.sourceLabel || "This knowledge source"} is already in the vault. Archive the old row or change the source before drafting another copy.`,
          tone: "amber",
        }} />
      ) : null}

      <form className="grid min-w-0 gap-3 rounded-xl border border-slate-200 bg-white p-3" onSubmit={submitKnowledge}>
        <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_260px]">
          <input
            value={form.title}
            onChange={(event) => updateField("title", event.target.value)}
            maxLength={140}
            placeholder="Knowledge title"
            className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700"
            disabled={!state.canView || loading}
          />
          <select
            value={form.category}
            onChange={(event) => updateField("category", event.target.value)}
            className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700"
            disabled={!state.canView || loading}
          >
            {(state.knowledgeVault?.categories || []).map((category) => (
              <option key={category.id} value={category.id}>{category.title}</option>
            ))}
          </select>
        </div>
        <textarea
          value={form.body}
          onChange={(event) => updateField("body", event.target.value)}
          maxLength={1800}
          placeholder="Knowledge summary or uploaded text"
          className="min-h-24 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold leading-6 text-slate-700"
          disabled={!state.canView || loading}
        />
        <div className="grid min-w-0 gap-3 lg:grid-cols-4">
          <input value={form.sourceLabel} onChange={(event) => updateField("sourceLabel", event.target.value)} maxLength={120} placeholder="Source label" className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700" disabled={!state.canView || loading} />
          <input value={form.sourceUri} onChange={(event) => updateField("sourceUri", event.target.value)} maxLength={240} placeholder="Source URI or file" className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700" disabled={!state.canView || loading} />
          <input value={form.reviewNote} onChange={(event) => updateField("reviewNote", event.target.value)} maxLength={300} placeholder="Summary status" className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700" disabled={!state.canView || loading} />
          <input type="file" accept=".txt,.md,.markdown,.json,.csv,.log,.html,.css,.js,.jsx,.ts,.tsx,.pdf,text/*,application/pdf" onChange={handleFileChange} className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-xs file:font-black file:text-white" disabled={!state.canView || loading} />
        </div>
        <div className="flex min-w-0 flex-wrap gap-2">
          <Button type="submit" variant="secondary" size="sm" disabled={!canCreate}>
            <Icon name="upload" /> {loading ? "Saving..." : "Draft knowledge"}
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={refreshVault} disabled={!canUse}>
            <Icon name="refresh" /> Load vault
          </Button>
          <Button type="button" disabled variant="secondary" size="sm">
            <Icon name="lock" /> Review required
          </Button>
        </div>
        <p className="break-words text-xs font-black leading-5 text-slate-500">{notice || "Text files and PDFs are read locally, saved as suggested Apex OS memory with source metadata, and blocked if they include secrets or customer emails."}</p>
      </form>

      <div className="grid min-w-0 gap-3 rounded-xl border border-slate-200 bg-white p-3">
        <div className="grid min-w-0 gap-3 lg:grid-cols-4">
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search vault" className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700" />
          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700">
            <option value="all">All categories</option>
            {(state.knowledgeVault?.categories || []).map((category) => <option key={category.id} value={category.id}>{category.title}</option>)}
          </select>
          <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)} className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700">
            <option value="all">All sources</option>
            {sourceOptions.map((source) => <option key={source} value={source}>{source}</option>)}
          </select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700">
            <option value="all">All review states</option>
            <option value="suggested">Suggested</option>
            <option value="approved">Trusted</option>
            <option value="archived">Archived</option>
          </select>
        </div>
        <p className="break-words text-xs font-black text-slate-500">Showing {visibleRows.length} of {knowledgeRows.length} vault row{knowledgeRows.length === 1 ? "" : "s"}.</p>
      </div>

      <div className="grid min-w-0 gap-3">
        {visibleRows.length ? visibleRows.slice(0, 8).map((row) => (
          <div key={row.id} className="min-w-0 rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="break-words text-[10px] font-black uppercase tracking-[0.16em] text-orange-700">{categoryTitle(state.knowledgeVault?.categories, row.category)}</p>
                <p className="mt-1 break-words text-sm font-black text-slate-950">{row.title}</p>
                <p className="mt-1 break-words text-xs font-bold leading-5 text-slate-600">{row.body}</p>
                <p className="mt-2 break-words text-[11px] font-black text-slate-500">Source: {row.sourceLabel || "Missing source"}{row.sourceUri ? ` | ${row.sourceUri}` : ""}</p>
                {row.reviewNote ? <p className="mt-1 break-words text-[11px] font-black text-slate-500">Summary: {row.reviewNote}</p> : null}
              </div>
              <ToneBadge tone={row.status === "approved" ? "green" : row.status === "archived" ? "slate" : "blue"}>{row.status === "approved" ? "trusted" : row.status}</ToneBadge>
            </div>
            <div className="mt-3 flex min-w-0 flex-wrap gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => setKnowledgeStatus(row, "approved")} disabled={!canUse || row.status === "approved" || row.status === "archived"}>
                <Icon name="check" /> Approve
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={() => setKnowledgeStatus(row, "archived")} disabled={!canUse || row.status === "archived"}>
                <Icon name="clock" /> Archive
              </Button>
            </div>
          </div>
        )) : (
          <EmptyPanel>No knowledge rows match the current vault filters.</EmptyPanel>
        )}
      </div>
    </div>
  );
}

const EMPTY_APPROVAL_PACKET_FORM = {
  title: "",
  requestedActionCategory: "deploy",
  riskLevel: "high",
  action: "",
  reason: "",
  affectedScope: "",
  validationPlan: "",
  rollbackPlan: "",
  exactApprovalPhrase: "",
  sourceLabel: "Apex Control Room",
  sourceUri: "",
  status: "draft",
};

function ApprovalPacketDraftPanel({ state, sessionToken }) {
  const [form, setForm] = useState(EMPTY_APPROVAL_PACKET_FORM);
  const [packets, setPackets] = useState([]);
  const [summary, setSummary] = useState(null);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const canUse = state.canView && Boolean(sessionToken) && !loading;
  const canCreate = canUse && form.title.trim() && form.action.trim() && form.sourceLabel.trim();

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setNotice("");
  }

  async function refreshPackets() {
    if (!canUse) return;
    setLoading(true);
    setNotice("");
    try {
      const payload = await getApexOsApprovalPackets(sessionToken);
      setPackets(payload.apexOsApprovalPackets || []);
      setSummary(payload.summary || null);
      setNotice("Approval packets loaded from private Apex OS storage.");
    } catch (error) {
      setNotice(error?.message || "Approval packets could not load right now.");
    } finally {
      setLoading(false);
    }
  }

  async function submitPacket(event) {
    event.preventDefault();
    if (!canCreate) return;
    setLoading(true);
    setNotice("");
    try {
      const payload = await createApexOsApprovalPacket(sessionToken, form);
      setPackets((current) => [payload.apexOsApprovalPacket, ...current].filter(Boolean));
      setSummary((current) => ({
        total: (current?.total || 0) + 1,
        draft: (current?.draft || 0) + (payload.apexOsApprovalPacket?.status === "draft" ? 1 : 0),
        ready: (current?.ready || 0) + (payload.apexOsApprovalPacket?.status === "ready" ? 1 : 0),
        blocked: (current?.blocked || 0) + (payload.apexOsApprovalPacket?.status === "blocked" ? 1 : 0),
        archived: current?.archived || 0,
      }));
      setForm(EMPTY_APPROVAL_PACKET_FORM);
      setNotice("Approval packet drafted. It does not approve or execute the action.");
    } catch (error) {
      setNotice(error?.message || "Approval packet could not be saved right now.");
    } finally {
      setLoading(false);
    }
  }

  async function setPacketStatus(packet, status) {
    if (!canUse || !packet?.id) return;
    setLoading(true);
    setNotice("");
    try {
      await updateApexOsApprovalPacket(sessionToken, packet.id, { ...packet, status });
      const payload = await getApexOsApprovalPackets(sessionToken);
      setPackets(payload.apexOsApprovalPackets || []);
      setSummary(payload.summary || null);
      setNotice(status === "archived" ? "Packet archived. No action executed." : "Packet status updated. Approval and execution remain locked.");
    } catch (error) {
      setNotice(error?.message || "Approval packet could not be updated right now.");
    } finally {
      setLoading(false);
    }
  }

  const activeSummary = summary || { total: packets.length, draft: 0, ready: 0, blocked: 0, archived: 0 };

  return (
    <div className="grid min-w-0 gap-4">
      <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatusRow item={{
          id: "approval-packet-total",
          title: "Saved packets",
          status: `${activeSummary.total || 0}`,
          detail: `${activeSummary.ready || 0} ready, ${activeSummary.draft || 0} draft, ${activeSummary.blocked || 0} blocked, ${activeSummary.archived || 0} archived.`,
          tone: activeSummary.ready ? "green" : "blue",
        }} />
        <StatusRow item={{
          id: "approval-packet-execution-lock",
          title: "Approval execution",
          status: "Locked",
          detail: "This slice can draft, ready, block, and archive packets only. It cannot approve, deploy, send, spend, publish, delete, or mutate production.",
          tone: "amber",
        }} />
      </div>

      <form className="grid min-w-0 gap-3 rounded-xl border border-slate-200 bg-white p-3" onSubmit={submitPacket}>
        <div className="grid min-w-0 gap-3 lg:grid-cols-2">
          <input
            value={form.title}
            onChange={(event) => updateField("title", event.target.value)}
            maxLength={160}
            placeholder="Action title"
            className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700"
            disabled={!state.canView || loading}
          />
          <div className="grid min-w-0 gap-3 sm:grid-cols-3">
            <select
              value={form.requestedActionCategory}
              onChange={(event) => updateField("requestedActionCategory", event.target.value)}
              className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700"
              disabled={!state.canView || loading}
            >
              <option value="deploy">Deploy</option>
              <option value="production-data">Production data</option>
              <option value="schema-auth-session">Schema/auth/session</option>
              <option value="customer-visible">Customer-visible</option>
              <option value="email-sms">Email/SMS</option>
              <option value="billing-payment">Billing/payment</option>
              <option value="ad-spend-publishing">Ads/publishing</option>
              <option value="provider-connection">Provider</option>
              <option value="file-deletion">File deletion</option>
              <option value="business-operations">Business ops</option>
              <option value="general">General</option>
            </select>
            <select
              value={form.riskLevel}
              onChange={(event) => updateField("riskLevel", event.target.value)}
              className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700"
              disabled={!state.canView || loading}
            >
              <option value="low">Low risk</option>
              <option value="medium">Medium risk</option>
              <option value="high">High risk</option>
              <option value="critical">Critical risk</option>
            </select>
            <select
              value={form.status}
              onChange={(event) => updateField("status", event.target.value)}
              className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700"
              disabled={!state.canView || loading}
            >
              <option value="draft">Draft</option>
              <option value="ready">Ready</option>
              <option value="blocked">Blocked</option>
            </select>
          </div>
        </div>
        <textarea
          value={form.action}
          onChange={(event) => updateField("action", event.target.value)}
          maxLength={1800}
          placeholder="What action is being requested?"
          className="min-h-20 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold leading-6 text-slate-700"
          disabled={!state.canView || loading}
        />
        <div className="grid min-w-0 gap-3 lg:grid-cols-2">
          <textarea value={form.reason} onChange={(event) => updateField("reason", event.target.value)} maxLength={1800} placeholder="Why this matters" className="min-h-20 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold leading-6 text-slate-700" disabled={!state.canView || loading} />
          <textarea value={form.affectedScope} onChange={(event) => updateField("affectedScope", event.target.value)} maxLength={1800} placeholder="Affected files, data, users, or systems" className="min-h-20 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold leading-6 text-slate-700" disabled={!state.canView || loading} />
          <textarea value={form.validationPlan} onChange={(event) => updateField("validationPlan", event.target.value)} maxLength={1800} placeholder="Validation plan" className="min-h-20 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold leading-6 text-slate-700" disabled={!state.canView || loading} />
          <textarea value={form.rollbackPlan} onChange={(event) => updateField("rollbackPlan", event.target.value)} maxLength={1800} placeholder="Rollback plan" className="min-h-20 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold leading-6 text-slate-700" disabled={!state.canView || loading} />
        </div>
        <div className="grid min-w-0 gap-3 lg:grid-cols-3">
          <input value={form.exactApprovalPhrase} onChange={(event) => updateField("exactApprovalPhrase", event.target.value)} maxLength={140} placeholder="Exact approval phrase" className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700" disabled={!state.canView || loading} />
          <input value={form.sourceLabel} onChange={(event) => updateField("sourceLabel", event.target.value)} maxLength={140} placeholder="Source label" className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700" disabled={!state.canView || loading} />
          <input value={form.sourceUri} onChange={(event) => updateField("sourceUri", event.target.value)} maxLength={260} placeholder="Source URI or file" className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700" disabled={!state.canView || loading} />
        </div>
        <div className="flex min-w-0 flex-wrap gap-2">
          <Button type="submit" variant="secondary" size="sm" disabled={!canCreate}>
            <Icon name="clipboard" /> {loading ? "Saving..." : "Draft packet"}
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={refreshPackets} disabled={!canUse}>
            <Icon name="refresh" /> Load packets
          </Button>
          <Button type="button" disabled variant="secondary" size="sm">
            <Icon name="lock" /> Execute locked
          </Button>
        </div>
        <p className="break-words text-xs font-black leading-5 text-slate-500">{notice || "Ready packets require source, validation, rollback, affected scope, and exact approval phrase. Approval still happens outside this draft flow."}</p>
      </form>

      <div className="grid min-w-0 gap-3">
        {packets.length ? packets.slice(0, 5).map((packet) => (
          <div key={packet.id} className="min-w-0 rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="break-words text-sm font-black text-slate-950">{packet.title}</p>
                <p className="mt-1 break-words text-xs font-bold leading-5 text-slate-600">{packet.action}</p>
                <p className="mt-2 break-words text-[11px] font-black text-slate-500">Source: {packet.sourceLabel || "Missing source"} | Risk: {packet.riskLevel}</p>
                {packet.missingFields?.length ? <p className="mt-2 break-words text-[11px] font-black text-amber-700">Missing: {packet.missingFields.join(", ")}</p> : null}
              </div>
              <ToneBadge tone={packet.status === "ready" ? "green" : packet.status === "blocked" ? "red" : packet.status === "archived" ? "slate" : "blue"}>{packet.status}</ToneBadge>
            </div>
            <div className="mt-3 flex min-w-0 flex-wrap gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => setPacketStatus(packet, "ready")} disabled={!canUse || packet.status === "ready" || packet.status === "archived"}>
                <Icon name="check" /> Mark ready
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={() => setPacketStatus(packet, "blocked")} disabled={!canUse || packet.status === "blocked" || packet.status === "archived"}>
                <Icon name="alert" /> Mark blocked
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={() => setPacketStatus(packet, "archived")} disabled={!canUse || packet.status === "archived"}>
                <Icon name="clock" /> Archive
              </Button>
              <Button type="button" disabled variant="secondary" size="sm">
                <Icon name="lock" /> Approve locked
              </Button>
            </div>
          </div>
        )) : (
          <EmptyPanel>No durable approval packet drafts loaded yet.</EmptyPanel>
        )}
      </div>
    </div>
  );
}

const EMPTY_EXECUTION_HANDOFF_FORM = {
  title: "",
  agentRole: "build",
  workType: "local-code-plan",
  riskLevel: "medium",
  sourceApprovalPacketId: "",
  objective: "",
  sourceEvidence: "",
  allowedActions: "Read files, draft local code or docs, run local tests, and report evidence.",
  blockedActions: "No deploy, sends, spend, provider setup, production mutation, customer-visible changes, deletion, or irreversible actions.",
  validationPlan: "",
  rollbackPlan: "",
  handoffPrompt: "",
  sourceLabel: "Apex Control Room",
  sourceUri: "",
  status: "draft",
};

function ExecutionHandoffDraftPanel({ state, sessionToken }) {
  const [form, setForm] = useState(EMPTY_EXECUTION_HANDOFF_FORM);
  const [handoffs, setHandoffs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const canUse = state.canView && Boolean(sessionToken) && !loading;
  const canCreate = canUse && form.title.trim() && form.objective.trim() && form.sourceLabel.trim();

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setNotice("");
  }

  async function refreshHandoffs() {
    if (!canUse) return;
    setLoading(true);
    setNotice("");
    try {
      const payload = await getApexOsExecutionHandoffs(sessionToken);
      setHandoffs(payload.apexOsExecutionHandoffs || []);
      setSummary(payload.summary || null);
      setNotice("Agent handoffs loaded from private Apex OS storage.");
    } catch (error) {
      setNotice(error?.message || "Agent handoffs could not load right now.");
    } finally {
      setLoading(false);
    }
  }

  async function submitHandoff(event) {
    event.preventDefault();
    if (!canCreate) return;
    setLoading(true);
    setNotice("");
    try {
      const payload = await createApexOsExecutionHandoff(sessionToken, form);
      setHandoffs((current) => [payload.apexOsExecutionHandoff, ...current].filter(Boolean));
      setSummary((current) => ({
        total: (current?.total || 0) + 1,
        draft: (current?.draft || 0) + (payload.apexOsExecutionHandoff?.status === "draft" ? 1 : 0),
        ready: (current?.ready || 0) + (payload.apexOsExecutionHandoff?.status === "ready" ? 1 : 0),
        blocked: (current?.blocked || 0) + (payload.apexOsExecutionHandoff?.status === "blocked" ? 1 : 0),
        archived: current?.archived || 0,
      }));
      setForm(EMPTY_EXECUTION_HANDOFF_FORM);
      setNotice("Agent handoff drafted. It cannot queue or run agents.");
    } catch (error) {
      setNotice(error?.message || "Agent handoff could not be saved right now.");
    } finally {
      setLoading(false);
    }
  }

  async function setHandoffStatus(handoff, status) {
    if (!canUse || !handoff?.id) return;
    setLoading(true);
    setNotice("");
    try {
      await updateApexOsExecutionHandoff(sessionToken, handoff.id, { ...handoff, status });
      const payload = await getApexOsExecutionHandoffs(sessionToken);
      setHandoffs(payload.apexOsExecutionHandoffs || []);
      setSummary(payload.summary || null);
      setNotice(status === "archived" ? "Handoff archived. No agent was queued or run." : "Handoff status updated. Queue and run remain locked.");
    } catch (error) {
      setNotice(error?.message || "Agent handoff could not be updated right now.");
    } finally {
      setLoading(false);
    }
  }

  const activeSummary = summary || state.executionHandoffs?.handoffSummary || { total: handoffs.length, draft: 0, ready: 0, blocked: 0, archived: 0 };

  return (
    <div className="grid min-w-0 gap-4">
      <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatusRow item={{
          id: "agent-handoff-total",
          title: "Saved handoffs",
          status: `${activeSummary.total || 0}`,
          detail: `${activeSummary.ready || 0} ready, ${activeSummary.draft || 0} draft, ${activeSummary.blocked || 0} blocked, ${activeSummary.archived || 0} archived.`,
          tone: activeSummary.ready ? "green" : "blue",
        }} />
        <StatusRow item={{
          id: "agent-handoff-run-lock",
          title: "Agent execution",
          status: "Run locked",
          detail: "This panel drafts scoped work packages only. It does not call Agent OS queue/run endpoints.",
          tone: "amber",
        }} />
      </div>

      <div className="grid min-w-0 gap-3 lg:grid-cols-3">
        {state.executionHandoffs.sourceRows.map((item) => <StatusRow key={item.id} item={item} />)}
      </div>

      <form className="grid min-w-0 gap-3 rounded-xl border border-slate-200 bg-white p-3" onSubmit={submitHandoff}>
        <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <input
            value={form.title}
            onChange={(event) => updateField("title", event.target.value)}
            maxLength={160}
            placeholder="Handoff title"
            className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700"
            disabled={!state.canView || loading}
          />
          <div className="grid min-w-0 gap-3 sm:grid-cols-4">
            <select value={form.agentRole} onChange={(event) => updateField("agentRole", event.target.value)} className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700" disabled={!state.canView || loading}>
              <option value="build">Build</option>
              <option value="qa">QA</option>
              <option value="release">Release</option>
              <option value="marketing">Marketing</option>
              <option value="sales">Sales</option>
              <option value="customer-success">Customer success</option>
              <option value="monitoring">Monitoring</option>
              <option value="business">Business</option>
              <option value="general">General</option>
            </select>
            <select value={form.workType} onChange={(event) => updateField("workType", event.target.value)} className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700" disabled={!state.canView || loading}>
              <option value="local-code-plan">Local code plan</option>
              <option value="qa-check">QA check</option>
              <option value="release-packet">Release packet</option>
              <option value="business-draft">Business draft</option>
              <option value="monitoring-review">Monitoring review</option>
              <option value="docs-update">Docs update</option>
              <option value="design-review">Design review</option>
              <option value="general">General</option>
            </select>
            <select value={form.riskLevel} onChange={(event) => updateField("riskLevel", event.target.value)} className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700" disabled={!state.canView || loading}>
              <option value="low">Low risk</option>
              <option value="medium">Medium risk</option>
              <option value="high">High risk</option>
              <option value="critical">Critical risk</option>
            </select>
            <select value={form.status} onChange={(event) => updateField("status", event.target.value)} className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700" disabled={!state.canView || loading}>
              <option value="draft">Draft</option>
              <option value="ready">Ready</option>
              <option value="blocked">Blocked</option>
            </select>
          </div>
        </div>
        <textarea value={form.objective} onChange={(event) => updateField("objective", event.target.value)} maxLength={1800} placeholder="Objective for the agent handoff" className="min-h-20 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold leading-6 text-slate-700" disabled={!state.canView || loading} />
        <div className="grid min-w-0 gap-3 lg:grid-cols-2">
          <textarea value={form.sourceEvidence} onChange={(event) => updateField("sourceEvidence", event.target.value)} maxLength={1800} placeholder="Source evidence and context" className="min-h-20 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold leading-6 text-slate-700" disabled={!state.canView || loading} />
          <textarea value={form.handoffPrompt} onChange={(event) => updateField("handoffPrompt", event.target.value)} maxLength={1800} placeholder="Prompt/instructions for the future agent worker" className="min-h-20 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold leading-6 text-slate-700" disabled={!state.canView || loading} />
          <textarea value={form.allowedActions} onChange={(event) => updateField("allowedActions", event.target.value)} maxLength={1800} placeholder="Allowed actions" className="min-h-20 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold leading-6 text-slate-700" disabled={!state.canView || loading} />
          <textarea value={form.blockedActions} onChange={(event) => updateField("blockedActions", event.target.value)} maxLength={1800} placeholder="Blocked actions" className="min-h-20 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold leading-6 text-slate-700" disabled={!state.canView || loading} />
          <textarea value={form.validationPlan} onChange={(event) => updateField("validationPlan", event.target.value)} maxLength={1800} placeholder="Validation plan" className="min-h-20 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold leading-6 text-slate-700" disabled={!state.canView || loading} />
          <textarea value={form.rollbackPlan} onChange={(event) => updateField("rollbackPlan", event.target.value)} maxLength={1800} placeholder="Rollback plan" className="min-h-20 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold leading-6 text-slate-700" disabled={!state.canView || loading} />
        </div>
        <div className="grid min-w-0 gap-3 lg:grid-cols-3">
          <input value={form.sourceApprovalPacketId} onChange={(event) => updateField("sourceApprovalPacketId", event.target.value)} maxLength={140} placeholder="Source approval packet ID" className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700" disabled={!state.canView || loading} />
          <input value={form.sourceLabel} onChange={(event) => updateField("sourceLabel", event.target.value)} maxLength={140} placeholder="Source label" className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700" disabled={!state.canView || loading} />
          <input value={form.sourceUri} onChange={(event) => updateField("sourceUri", event.target.value)} maxLength={260} placeholder="Source URI or file" className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700" disabled={!state.canView || loading} />
        </div>
        <div className="flex min-w-0 flex-wrap gap-2">
          <Button type="submit" variant="secondary" size="sm" disabled={!canCreate}>
            <Icon name="clipboard" /> {loading ? "Saving..." : "Draft handoff"}
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={refreshHandoffs} disabled={!canUse}>
            <Icon name="refresh" /> Load handoffs
          </Button>
          <Button type="button" disabled variant="secondary" size="sm">
            <Icon name="lock" /> Queue locked
          </Button>
          <Button type="button" disabled variant="secondary" size="sm">
            <Icon name="lock" /> Run locked
          </Button>
        </div>
        <p className="break-words text-xs font-black leading-5 text-slate-500">{notice || "Ready handoffs require source evidence, allowed actions, blocked actions, validation, rollback, and a handoff prompt. Execution still requires a separate gated workflow."}</p>
      </form>

      <div className="grid min-w-0 gap-3">
        {handoffs.length ? handoffs.slice(0, 5).map((handoff) => (
          <div key={handoff.id} className="min-w-0 rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="break-words text-sm font-black text-slate-950">{handoff.title}</p>
                <p className="mt-1 break-words text-xs font-bold leading-5 text-slate-600">{handoff.objective}</p>
                <p className="mt-2 break-words text-[11px] font-black text-slate-500">Role: {handoff.agentRole} | Work: {handoff.workType} | Source: {handoff.sourceLabel || "Missing source"}</p>
                {handoff.missingFields?.length ? <p className="mt-2 break-words text-[11px] font-black text-amber-700">Missing: {handoff.missingFields.join(", ")}</p> : null}
              </div>
              <ToneBadge tone={handoff.status === "ready" ? "green" : handoff.status === "blocked" ? "red" : handoff.status === "archived" ? "slate" : "blue"}>{handoff.status}</ToneBadge>
            </div>
            <div className="mt-3 flex min-w-0 flex-wrap gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => setHandoffStatus(handoff, "ready")} disabled={!canUse || handoff.status === "ready" || handoff.status === "archived"}>
                <Icon name="check" /> Mark ready
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={() => setHandoffStatus(handoff, "blocked")} disabled={!canUse || handoff.status === "blocked" || handoff.status === "archived"}>
                <Icon name="alert" /> Mark blocked
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={() => setHandoffStatus(handoff, "archived")} disabled={!canUse || handoff.status === "archived"}>
                <Icon name="clock" /> Archive
              </Button>
              <Button type="button" disabled variant="secondary" size="sm">
                <Icon name="lock" /> Run locked
              </Button>
            </div>
          </div>
        )) : (
          <EmptyPanel>No durable agent handoff drafts loaded yet.</EmptyPanel>
        )}
      </div>
    </div>
  );
}

export function ApexControlRoomPage(props) {
  const state = deriveApexControlRoomState(props);
  const [askQuestion, setAskQuestion] = useState("");

  return (
    <div className="co-apex-control-room-page min-w-0 max-w-full bg-slate-100 pb-36 lg:pb-8">
      <PageHeader
        eyebrow="Apex OS"
        title="Apex Control Room"
        description={`Private Apex HQ operating center for ${state.operatorName}.`}
        actions={(
          <div className="flex min-w-0 flex-wrap gap-2">
            <ToneBadge tone={state.canView ? "green" : "red"}>{state.canView ? "Private operator" : "Restricted"}</ToneBadge>
            <ToneBadge tone="amber">No deploy</ToneBadge>
            <ToneBadge tone="slate">No provider changes</ToneBadge>
          </div>
        )}
      />

      <main className="mx-auto flex w-full max-w-[1520px] flex-col gap-4 px-4 sm:px-6">
        <section className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {state.kpis.map((item) => <KpiTile key={item.id} item={item} />)}
        </section>

        <section className="grid min-w-0 gap-3 lg:grid-cols-2 2xl:grid-cols-5">
          {state.commandBoardPanels.map((item) => (
            <Card key={item.id} className="min-w-0 p-4">
              <SectionHeader
                title={item.title}
                description={item.detail}
                action={<ToneBadge tone={item.tone}>{item.status}</ToneBadge>}
              />
            </Card>
          ))}
        </section>

        <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)]">
          <Card className="min-w-0 p-4 sm:p-5">
            <SectionHeader
              title="Apex Briefing"
              description={state.summary}
              action={<span className="inline-flex h-9 items-center rounded-xl bg-slate-950 px-3 text-xs font-black text-white"><Icon name="spark" className="mr-2 h-4 w-4" />Slice 3 memory</span>}
            />
            <div className="grid min-w-0 gap-3 lg:grid-cols-2 2xl:grid-cols-4">
              {state.priorities.map((item) => <StatusRow key={item.id} item={item} />)}
            </div>
          </Card>

          <Card className="min-w-0 p-4 sm:p-5">
            <SectionHeader title="Approval Gates" description="Risky actions stay locked behind owner approval." />
            <div className="min-w-0">
              {state.approvals.map((item) => <ApprovalRow key={item.id} item={item} />)}
            </div>
          </Card>
        </section>

        <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <Card className="min-w-0 p-4 sm:p-5">
            <SectionHeader
              title="Approval Command Center"
              description={`${state.approvalCommandCenter.queueCount || 0} risky-action categories require scoped owner approval packets.`}
              action={<ToneBadge tone={state.approvalCommandCenter.tone}>{state.approvalCommandCenter.status}</ToneBadge>}
            />
            <div className="grid min-w-0 gap-3 lg:grid-cols-2">
              {state.approvalCommandCenter.queueRows.map((item) => <StatusRow key={item.id} item={item} />)}
            </div>
          </Card>

          <Card className="min-w-0 p-4 sm:p-5">
            <SectionHeader title="Approval Packet Drafts" description={`${state.approvalCommandCenter.packetFieldCount || 0} fields guide ready packets before any risky work can be approved.`} />
            <ApprovalPacketDraftPanel state={state} sessionToken={props.sessionToken} />
          </Card>
        </section>

        <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <Card className="min-w-0 p-4 sm:p-5">
            <SectionHeader title="Approval Controls" description="Visible control model only; no approval writes or execution exist yet." />
            <div className="grid min-w-0 gap-3">
              {state.approvalCommandCenter.controlRows.map((item) => <StatusRow key={item.id} item={item} />)}
            </div>
            <div className="mt-4 flex min-w-0 flex-wrap gap-2">
              <Button type="button" disabled variant="secondary" size="sm">
                <Icon name="check" /> Approve
              </Button>
              <Button type="button" disabled variant="secondary" size="sm">
                <Icon name="alert" /> Reject
              </Button>
              <Button type="button" disabled variant="secondary" size="sm">
                <Icon name="clock" /> Defer
              </Button>
              <Button type="button" disabled variant="secondary" size="sm">
                <Icon name="lock" /> Execute locked
              </Button>
            </div>
          </Card>

          <Card className="min-w-0 p-4 sm:p-5">
            <SectionHeader title="Approval Sources" description={`${state.approvalCommandCenter.sourceCount || 0} surfaces feeding approval packets.`} />
            <div className="grid min-w-0 gap-3">
              {state.approvalCommandCenter.sourceRows.map((item) => <StatusRow key={item.id} item={item} />)}
            </div>
          </Card>
        </section>

        <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <Card className="min-w-0 p-4 sm:p-5">
            <SectionHeader title="Operating Signals" description="Read-only state pulled from current Apex HQ systems." />
            <div className="grid min-w-0 gap-3 lg:grid-cols-2">
              {state.operatingSignals.map((item) => <StatusRow key={item.id} item={item} />)}
            </div>
          </Card>

          <Card className="min-w-0 p-4 sm:p-5">
            <SectionHeader title="Next Best Actions" description="Private owner actions for the next controlled build step." />
            <div className="grid min-w-0 gap-3">
              {state.nextBestActions.map((item) => <StatusRow key={item.id} item={item} />)}
            </div>
          </Card>
        </section>

        <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <Card className="min-w-0 p-4 sm:p-5">
            <SectionHeader
              title="Release Monitoring"
              description={`${state.releaseMonitoring.readinessCount || 0} release and monitoring checks are mapped for private review.`}
              action={<ToneBadge tone={state.releaseMonitoring.tone}>{state.releaseMonitoring.status}</ToneBadge>}
            />
            <div className="grid min-w-0 gap-3 lg:grid-cols-2">
              {state.releaseMonitoring.readinessRows.map((item) => <StatusRow key={item.id} item={item} />)}
            </div>
          </Card>

          <Card className="min-w-0 p-4 sm:p-5">
            <SectionHeader title="Daily Briefing" description={`${state.releaseMonitoring.briefingCount || 0} briefing rows for John-only review.`} />
            <DailyBriefingPanel state={state} sessionToken={props.sessionToken} />
          </Card>
        </section>

        <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <Card className="min-w-0 p-4 sm:p-5">
            <SectionHeader title="Release Readiness Packet" description={`${state.releaseMonitoring.packetCount || 0} packet rows before any release approval.`} />
            <div className="grid min-w-0 gap-3 lg:grid-cols-2">
              {state.releaseMonitoring.releasePacketRows.map((item) => <StatusRow key={item.id} item={item} />)}
            </div>
          </Card>

          <Card className="min-w-0 p-4 sm:p-5">
            <SectionHeader title="Monitoring Locks" description="Monitoring is read-only until provider and deploy approval exists." />
            <div className="grid min-w-0 gap-3">
              {state.releaseMonitoring.lockRows.map((item) => <StatusRow key={item.id} item={item} />)}
            </div>
          </Card>
        </section>

        <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <Card className="min-w-0 p-4 sm:p-5">
            <SectionHeader
              title="Business Command Center"
              description={`${state.businessCommandCenter.queueCount || 0} private business queues for Apex HQ growth and launch work.`}
              action={<ToneBadge tone={state.businessCommandCenter.tone}>{state.businessCommandCenter.status}</ToneBadge>}
            />
            <div className="grid min-w-0 gap-3 lg:grid-cols-2">
              {state.businessCommandCenter.queueRows.map((item) => <StatusRow key={item.id} item={item} />)}
            </div>
          </Card>

          <Card className="min-w-0 p-4 sm:p-5">
            <SectionHeader title="Business Gates" description={`${state.businessCommandCenter.gateCount || 0} gates keep business actions manual.`} />
            <div className="grid min-w-0 gap-3">
              {state.businessCommandCenter.gateRows.map((item) => <StatusRow key={item.id} item={item} />)}
            </div>
          </Card>
        </section>

        <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <Card className="min-w-0 p-4 sm:p-5">
            <SectionHeader title="Launch / Founder Demo" description={`${state.businessCommandCenter.launchCount || 0} launch and founder-led demo readiness rows.`} />
            <div className="grid min-w-0 gap-3">
              {state.businessCommandCenter.launchRows.map((item) => <StatusRow key={item.id} item={item} />)}
            </div>
          </Card>

          <Card className="min-w-0 p-4 sm:p-5">
            <SectionHeader title="Business Briefing" description={`${state.businessCommandCenter.briefingCount || 0} John-only business briefing rows.`} />
            <div className="grid min-w-0 gap-3">
              {state.businessCommandCenter.briefingRows.map((item) => <StatusRow key={item.id} item={item} />)}
            </div>
          </Card>
        </section>

        <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <Card className="min-w-0 p-4 sm:p-5">
            <SectionHeader
              title="QA / Security Hardening"
              description={`${state.qaSecurityHardening.evidenceCount || 0} final hardening rows before Apex OS is treated as complete.`}
              action={<ToneBadge tone={state.qaSecurityHardening.tone}>{state.qaSecurityHardening.status}</ToneBadge>}
            />
            <div className="grid min-w-0 gap-3 lg:grid-cols-2">
              {state.qaSecurityHardening.evidenceRows.map((item) => <StatusRow key={item.id} item={item} />)}
            </div>
          </Card>

          <Card className="min-w-0 p-4 sm:p-5">
            <SectionHeader title="Hardening Locks" description={`${state.qaSecurityHardening.lockCount || 0} action classes stay approval-locked.`} />
            <div className="grid min-w-0 gap-3">
              {state.qaSecurityHardening.lockRows.map((item) => <StatusRow key={item.id} item={item} />)}
            </div>
          </Card>
        </section>

        <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <Card className="min-w-0 p-4 sm:p-5">
            <SectionHeader title="Completion Audit" description="What has to be proven before the active Apex OS goal can be closed." />
            <div className="grid min-w-0 gap-3">
              <StatusRow item={{
                id: "completion-local",
                title: "Local completion",
                status: state.qaSecurityHardening.status,
                detail: "The Apex OS surfaces are built locally as first UI slices; final completion depends on tests, build, route checks, mobile checks, and docs being current.",
                tone: state.qaSecurityHardening.tone,
              }} />
              <StatusRow item={{
                id: "completion-production",
                title: "Production / provider boundary",
                status: "Approval required",
                detail: "Deploys, provider/API work, speech, live monitoring, durable memory, customer-visible changes, and production mutations remain outside this local completion pass.",
                tone: "amber",
              }} />
            </div>
          </Card>

          <Card className="min-w-0 p-4 sm:p-5">
            <SectionHeader title="Security Proof Sources" description="The private surfaces feeding this hardening pass." />
            <div className="grid min-w-0 gap-3 lg:grid-cols-2">
              <StatusRow item={{
                id: "proof-ask-apex",
                title: "Ask Apex / Knowledge Vault",
                status: "Private intake",
                detail: "Chat, evidence, and vault intake stay private with no provider calls, embeddings, public publishing, or customer upload mixing.",
                tone: "blue",
              }} />
              <StatusRow item={{
                id: "proof-voice-approval",
                title: "Voice / Approval Center",
                status: "Locked",
                detail: "Voice controls are disabled and approval controls are visual only, so risky spoken or clicked actions cannot execute.",
                tone: "amber",
              }} />
            </div>
          </Card>
        </section>

        <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <Card className="min-w-0 p-4 sm:p-5">
            <SectionHeader
              title="Decision Memory"
              description={`What John decided. ${state.decisionMemory.decisionCount || 0} plan decisions and ${state.decisionMemory.durableCount || 0} durable memory rows are visible.`}
              action={<ToneBadge tone={state.decisionMemory.tone}>{state.decisionMemory.status}</ToneBadge>}
            />
            <div className="grid min-w-0 gap-3 lg:grid-cols-2">
              {state.decisionMemory.decisions.map((item) => <MemoryRow key={item.id} item={item} />)}
            </div>
          </Card>

          <Card className="min-w-0 p-4 sm:p-5">
            <SectionHeader
              title="Operating Rules"
              description="Current Apex OS boundaries before editable memory exists."
            />
            <div className="grid min-w-0 gap-3">
              {state.decisionMemory.rules.map((item) => <MemoryRow key={item.id} item={item} />)}
            </div>
          </Card>
        </section>

        <section className="grid min-w-0 gap-4">
          <Card className="min-w-0 p-4 sm:p-5">
            <SectionHeader
              title="What Did I Decide?"
              description="Source-backed decision memory with manual draft, approve, and archive controls."
              action={<ToneBadge tone={state.decisionMemory.approvedCount ? "green" : "blue"}>{state.decisionMemory.approvedCount || 0} approved</ToneBadge>}
            />
            <DecisionMemoryManager state={state} sessionToken={props.sessionToken} />
          </Card>
        </section>

        <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <Card className="min-w-0 p-4 sm:p-5">
            <SectionHeader
              title="Agent Work Queue"
              description={`${state.agentWorkQueue.availableTaskCount || 0} review-only task types across ${state.agentWorkQueue.visibleTargetCount || 0} visible targets.`}
              action={<ToneBadge tone={state.agentWorkQueue.tone}>{state.agentWorkQueue.status}</ToneBadge>}
            />
            {state.agentWorkQueue.taskRows.length ? (
              <div className="grid min-w-0 gap-3 lg:grid-cols-2">
                {state.agentWorkQueue.taskRows.map((item) => <StatusRow key={item.id} item={item} />)}
              </div>
            ) : (
              <EmptyPanel>No review-only agent tasks are available for visible records.</EmptyPanel>
            )}
          </Card>

          <Card className="min-w-0 p-4 sm:p-5">
            <SectionHeader
              title="Agent Run Ledger"
              description={`${state.agentWorkQueue.recentRunCount || 0} recent audit-backed run rows.`}
            />
            {state.agentWorkQueue.runRows.length ? (
              <div className="grid min-w-0 gap-3">
                {state.agentWorkQueue.runRows.map((item) => <StatusRow key={item.id} item={item} />)}
              </div>
            ) : (
              <EmptyPanel>No recent Agent OS run rows are visible yet.</EmptyPanel>
            )}
          </Card>
        </section>

        <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <Card className="min-w-0 p-4 sm:p-5">
            <SectionHeader title="Agent Safety Locks" description="What this queue still cannot do." />
            <div className="grid min-w-0 gap-3">
              {state.agentWorkQueue.safetyRows.map((item) => <StatusRow key={item.id} item={item} />)}
            </div>
          </Card>

          <Card className="min-w-0 p-4 sm:p-5">
            <SectionHeader
              title="Agent Handoff Drafts"
              description={`${state.executionHandoffs.handoffSummary?.total || 0} durable handoffs prepare scoped agent work packages without running them.`}
              action={<ToneBadge tone={state.executionHandoffs.tone}>{state.executionHandoffs.status}</ToneBadge>}
            />
            <ExecutionHandoffDraftPanel state={state} sessionToken={props.sessionToken} />
          </Card>
        </section>

        <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <Card className="min-w-0 p-4 sm:p-5">
            <SectionHeader
              title="Locked Agent Tasks"
              description={`${state.agentWorkQueue.lockedTaskCount || 0} task types are locked or have no visible targets.`}
            />
            {state.agentWorkQueue.lockedRows.length ? (
              <div className="grid min-w-0 gap-3 lg:grid-cols-2">
                {state.agentWorkQueue.lockedRows.map((item) => <StatusRow key={item.id} item={item} />)}
              </div>
            ) : (
              <EmptyPanel>No locked agent task rows are visible.</EmptyPanel>
            )}
          </Card>

          <Card className="min-w-0 p-4 sm:p-5">
            <SectionHeader title="Handoff Execution Locks" description="Prepared handoffs cannot cross approval boundaries by themselves." />
            <div className="grid min-w-0 gap-3">
              <StatusRow item={{
                id: "handoff-no-queue",
                title: "No agent queueing",
                status: "Locked",
                detail: "Handoff drafts do not call Agent OS queue, run, or execution endpoints.",
                tone: "amber",
              }} />
              <StatusRow item={{
                id: "handoff-no-external",
                title: "No external actions",
                status: "Locked",
                detail: "Deploy, sends, spend, provider setup, customer-visible changes, production mutation, and deletion remain outside this flow.",
                tone: "amber",
              }} />
            </div>
          </Card>
        </section>

        <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <Card className="min-w-0 p-4 sm:p-5">
            <SectionHeader
              title="Knowledge Vault"
              description={`${state.knowledgeVault.categoryCount || 0} private knowledge categories are ready for reviewed intake.`}
              action={<ToneBadge tone={state.knowledgeVault.tone}>{state.knowledgeVault.status}</ToneBadge>}
            />
            <div className="grid min-w-0 gap-3 lg:grid-cols-2">
              {state.knowledgeVault.categories.slice(0, 6).map((item) => <StatusRow key={item.id} item={item} />)}
            </div>
          </Card>

          <Card className="min-w-0 p-4 sm:p-5">
            <SectionHeader title="Vault Safety Gates" description="Upload and trusted-memory boundaries." />
            <div className="grid min-w-0 gap-3">
              {state.knowledgeVault.safetyRows.map((item) => <StatusRow key={item.id} item={item} />)}
            </div>
          </Card>
        </section>

        <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <Card className="min-w-0 p-4 sm:p-5">
            <SectionHeader title="Vault Sources" description={`${state.knowledgeVault.sourceCount || 0} current source candidates.`} />
            <div className="grid min-w-0 gap-3">
              {state.knowledgeVault.sourceRows.map((item) => <StatusRow key={item.id} item={item} />)}
            </div>
          </Card>

          <Card className="min-w-0 p-4 sm:p-5">
            <SectionHeader title="Vault Intake Status" description="Reviewed private knowledge intake." />
            <div className="grid min-w-0 gap-3 lg:grid-cols-2">
              <StatusRow item={{
                id: "durable-apex-os-memory",
                title: "Durable Apex OS memory",
                status: state.knowledgeVault.memorySummary?.total ? `${state.knowledgeVault.memorySummary.total} saved` : "Ready",
                detail: `${state.knowledgeVault.memorySummary?.approved || 0} approved, ${state.knowledgeVault.memorySummary?.suggested || 0} suggested, and ${state.knowledgeVault.memorySummary?.archived || 0} archived memory rows are tracked in private company settings.`,
                tone: state.knowledgeVault.memorySummary?.total ? "green" : "blue",
              }} />
              <StatusRow item={{
                id: "upload-intake",
                title: "Upload intake",
                status: "Text intake active",
                detail: "Local text files can be read into the vault and saved as suggested knowledge with source metadata.",
                tone: "green",
              }} />
              <StatusRow item={{
                id: "trusted-memory",
                title: "Trusted memory",
                status: "Approval required",
                detail: "Suggested knowledge does not feed approved Apex context until manually approved.",
                tone: "amber",
              }} />
            </div>
          </Card>
        </section>

        <section className="min-w-0">
          <Card className="min-w-0 p-4 sm:p-5">
            <SectionHeader
              title="Knowledge Upload Vault"
              description="Classify, draft, review, search, and approve private Apex OS knowledge."
              action={<ToneBadge tone={state.knowledgeVault.tone}>{state.knowledgeVault.status}</ToneBadge>}
            />
            <KnowledgeVaultManager state={state} sessionToken={props.sessionToken} />
          </Card>
        </section>

        <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <Card className="min-w-0 p-4 sm:p-5">
            <SectionHeader
              title="Ask Apex"
              description="Private source-backed chat shell for app, roadmap, agents, business, and launch questions."
              action={<ToneBadge tone={state.askApexChat.tone}>{state.askApexChat.status}</ToneBadge>}
            />
            <AskApexPanel state={state} sessionToken={props.sessionToken} question={askQuestion} setQuestion={setAskQuestion} />
          </Card>

          <Card className="min-w-0 p-4 sm:p-5">
            <SectionHeader title="Ask Apex Actions" description="Chat actions are visible now but cannot write or execute yet." />
            <div className="grid min-w-0 gap-3">
              {state.askApexChat.actionLocks.map((item) => <StatusRow key={item.id} item={item} />)}
            </div>
          </Card>
        </section>

        <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <Card className="min-w-0 p-4 sm:p-5">
            <SectionHeader
              title="Ask Apex Evidence"
              description={`${state.askApexChat.evidenceCount || 0} current source rows available before provider integration.`}
            />
            <div className="grid min-w-0 gap-3">
              {state.askApexChat.evidenceRows.slice(0, 4).map((item) => <StatusRow key={item.id} item={item} />)}
            </div>
          </Card>

          <Card className="min-w-0 p-4 sm:p-5">
            <SectionHeader title="Source-Backed Answer Rules" description="Answer quality gates before Ask Apex can become live." />
            <div className="grid min-w-0 gap-3 lg:grid-cols-2">
              <StatusRow item={{
                id: "source-labels",
                title: "Source labels",
                status: "Required",
                detail: "Answers about the app, launch, agents, business, or decisions must show the source rows used.",
                tone: "blue",
              }} />
              <StatusRow item={{
                id: "risk-labels",
                title: "Risk labels",
                status: "Locked",
                detail: "Anything involving deploy, provider/API, production, customer-visible work, money, sends, or deletion must be marked approval-needed.",
                tone: "amber",
              }} />
            </div>
          </Card>
        </section>

        <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <Card className="min-w-0 p-4 sm:p-5">
            <SectionHeader
              title="Voice Interface"
              description="Private transcript confirmation surface with microphone, speech provider, and always-listening locked."
              action={<ToneBadge tone={state.voiceInterface.tone}>{state.voiceInterface.status}</ToneBadge>}
            />
            <VoiceTranscriptPanel state={state} onUseTranscript={setAskQuestion} />
          </Card>

          <Card className="min-w-0 p-4 sm:p-5">
            <SectionHeader title="Voice Safety Gates" description={`${state.voiceInterface.safetyCount || 0} voice boundaries before provider work.`} />
            <div className="grid min-w-0 gap-3">
              {state.voiceInterface.safetyRows.map((item) => <StatusRow key={item.id} item={item} />)}
            </div>
          </Card>
        </section>

        <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <Card className="min-w-0 p-4 sm:p-5">
            <SectionHeader title="Voice Modes" description={`${state.voiceInterface.modeCount || 0} planned modes for the talk/listen experience.`} />
            <div className="grid min-w-0 gap-3 lg:grid-cols-2">
              {state.voiceInterface.modes.map((item) => <StatusRow key={item.id} item={item} />)}
            </div>
          </Card>

          <Card className="min-w-0 p-4 sm:p-5">
            <SectionHeader title="Voice Approval Boundary" description="Voice stays manual and private until speech/provider approval exists." />
            <div className="grid min-w-0 gap-3 lg:grid-cols-2">
              <StatusRow item={{
                id: "voice-risk-review",
                title: "Risky spoken commands",
                status: "Owner approval required",
                detail: "A spoken request cannot deploy, send, spend, publish, change providers, touch production data, or delete anything.",
                tone: "amber",
              }} />
              <StatusRow item={{
                id: "voice-privacy-review",
                title: "Privacy review",
                status: "Required",
                detail: "Microphone permission, transcript retention, audio handling, and always-listening controls need separate review.",
                tone: "blue",
              }} />
            </div>
          </Card>
        </section>

        <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <Card className="min-w-0 p-4 sm:p-5">
            <SectionHeader
              title="Launch Readiness"
              description={`${state.launchReadiness.readyCount || 0} of ${state.launchReadiness.totalCount || 0} gates ready.`}
              action={<ToneBadge tone={state.launchReadiness.tone}>{state.launchReadiness.status}</ToneBadge>}
            />
            <div className="grid min-w-0 gap-3">
              {state.launchReadiness.gates.map((item) => <StatusRow key={item.id} item={item} />)}
            </div>
          </Card>

          <Card className="min-w-0 p-4 sm:p-5">
            <SectionHeader
              title="Release Desk"
              description="Manual deploy safety, rollback, and stop-warning summary."
              action={<ToneBadge tone={state.releaseDesk.tone}>{state.releaseDesk.status}</ToneBadge>}
            />
            <div className="grid min-w-0 gap-3">
              {state.releaseDesk.sections.map((item) => <StatusRow key={item.id} item={item} />)}
            </div>
          </Card>
        </section>

        <section className="grid min-w-0 gap-4 xl:grid-cols-2">
          <Card className="min-w-0 p-4 sm:p-5">
            <SectionHeader title="Agent Control" description="Read-only agent posture for the first slice." />
            <div className="grid min-w-0 gap-3">
              {state.agents.map((item) => <StatusRow key={item.id} item={item} />)}
            </div>
          </Card>

          <Card className="min-w-0 p-4 sm:p-5">
            <SectionHeader title="Recent Evidence" description="Current audit signal available to Apex OS." />
            {state.evidence.length ? (
              <div className="grid min-w-0 gap-3">
                {state.evidence.map((item) => <EvidenceRow key={item.id} item={item} />)}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm font-bold text-slate-600">
                No recent evidence rows are visible for this workspace.
              </div>
            )}
          </Card>
        </section>
      </main>
    </div>
  );
}
