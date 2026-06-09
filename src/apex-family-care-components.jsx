import { useEffect, useMemo, useState } from "react";

import { Badge, Button, Card, Icon, InputField, PageHeader, SectionHeader, SelectField, StatCard, TextAreaField } from "./app-shell-components";
import {
  APEX_FAMILY_CARE_CATEGORIES,
  APEX_FAMILY_CARE_MAX_LOCAL_NOTES,
  APEX_FAMILY_CARE_REPORTERS,
  APEX_FAMILY_CARE_REQUIRED_SCREENS,
  APEX_FAMILY_CARE_SEVERITIES,
  addApexFamilyCareNote,
  buildApexFamilyCareDoctorSummary,
  buildApexFamilyCareFamilySummary,
  buildApexFamilyCareTodaySummary,
  createApexFamilyCareNote,
  getApexFamilyCareAccessGateSummary,
  listApexFamilyCareNotes,
} from "../shared/apexFamilyCare.js";

const STORAGE_KEY = "apex-family-care-local-notes-v1";

const SCREEN_LABELS = {
  today: "Today",
  add: "Add Update",
  timeline: "Care Timeline",
  doctor: "Doctor Summary",
  family: "Family Summary",
  settings: "Settings",
  access: "Family Access",
  health: "Apex Health",
};

function toDatetimeInputValue(date = new Date()) {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function formatCareTime(timestamp) {
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) return timestamp || "Time not set";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}

function buildStarterCareNotes(now = new Date()) {
  const morning = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  const yesterday = new Date(now.getTime() - 25 * 60 * 60 * 1000);
  return [
    createApexFamilyCareNote({
      id: "family-care-starter-normal",
      category: "normal",
      reporter: "Dad",
      timestamp: morning.toISOString(),
      summary: "Morning check-in was steady.",
      familyVisible: true,
    }, morning),
    createApexFamilyCareNote({
      id: "family-care-starter-doctor",
      category: "appointment",
      reporter: "Family",
      timestamp: yesterday.toISOString(),
      summary: "Save questions for the next doctor visit in this list.",
      addToDoctorSummary: true,
      familyVisible: true,
    }, yesterday),
  ];
}

function loadInitialNotes() {
  const starterNotes = buildStarterCareNotes();
  if (typeof window === "undefined") return starterNotes;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return starterNotes;
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed) || parsed.length === 0) return starterNotes;
    return listApexFamilyCareNotes(parsed, { limit: APEX_FAMILY_CARE_MAX_LOCAL_NOTES });
  } catch {
    return starterNotes;
  }
}

function noteTone(note) {
  return APEX_FAMILY_CARE_CATEGORIES.find((category) => category.id === note.category)?.tone || "slate";
}

function newDraft(categoryId = "normal") {
  const category = APEX_FAMILY_CARE_CATEGORIES.find((item) => item.id === categoryId) || APEX_FAMILY_CARE_CATEGORIES[0];
  return {
    category: category.id,
    reporter: "Dad",
    timestamp: toDatetimeInputValue(),
    summary: category.defaultSummary,
    severity: "unknown",
    bodyArea: "",
    addToDoctorSummary: category.doctorDefault,
    familyVisible: true,
    urgent: category.id === "concern",
  };
}

function ToggleRow({ label, checked, onChange }) {
  return (
    <label className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-700">
      <span className="min-w-0 break-words">{label}</span>
      <input
        type="checkbox"
        className="h-5 w-5 shrink-0 accent-blue-700"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}

function CareNoteRow({ note }) {
  return (
    <div className="min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-3">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <Badge tone={noteTone(note)}>{note.categoryLabel}</Badge>
        <Badge tone={note.urgent ? "amber" : "slate"}>{note.urgent ? "Concern" : "Normal"}</Badge>
        {note.addToDoctorSummary ? <Badge tone="blue">Doctor prep</Badge> : null}
        <span className="text-xs font-black text-slate-500">{formatCareTime(note.timestamp)}</span>
      </div>
      <p className="mt-2 break-words text-sm font-black text-slate-950">{note.summary}</p>
      <p className="mt-1 break-words text-xs font-bold text-slate-500">
        {note.reporter} for {note.subject}
        {note.severity !== "unknown" ? ` / ${note.severity}` : ""}
        {note.bodyArea ? ` / ${note.bodyArea}` : ""}
      </p>
    </div>
  );
}

function CareSignalPanel({ missingUpdate, patternSummary }) {
  const patterns = patternSummary?.patterns || [];
  return (
    <Card className="p-4">
      <SectionHeader title="Care Signals" description="Apex watches for missing updates and repeated family care patterns without diagnosis." />
      <div className="grid gap-2 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-black text-slate-950">Update loop</p>
            <Badge tone={missingUpdate?.missing ? "amber" : "green"}>{missingUpdate?.status || "current"}</Badge>
          </div>
          <p className="mt-1 text-sm font-bold text-slate-600">{missingUpdate?.message || "Family-visible update is current."}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-black text-slate-950">Patterns</p>
            <Badge tone={patterns.length ? "amber" : "green"}>{patternSummary?.summaryLabel || "No repeated concern pattern"}</Badge>
          </div>
          <p className="mt-1 text-sm font-bold text-slate-600">{patterns[0]?.familySafeSummary || "No repeated concern pattern in the current window."}</p>
        </div>
      </div>
    </Card>
  );
}

function TodayView({ notes, summary, onQuickAdd, setActiveScreen }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard title="Today" value={summary.todayCount} detail="Updates logged" />
        <StatCard title="Concerns" value={summary.openConcernCount} detail="Marked for follow-up" />
        <StatCard title="Doctor Prep" value={summary.doctorItemCount} detail="Saved notes" />
        <StatCard title="Family Visible" value={summary.familyVisibleCount} detail="Shared in summaries" />
      </div>

      <CareSignalPanel missingUpdate={summary.missingUpdate} patternSummary={summary.repeatedConcernPatterns} />

      <Card className="p-4">
        <SectionHeader
          title="Fast Update"
          description="Short buttons for the common care notes."
          action={(
            <Button type="button" variant="secondary" onClick={() => setActiveScreen("add")}>
              <Icon name="plus" /> Add Details
            </Button>
          )}
        />
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          {APEX_FAMILY_CARE_CATEGORIES.slice(0, 9).map((category) => (
            <Button
              key={category.id}
              type="button"
              variant="secondary"
              className="justify-start"
              onClick={() => onQuickAdd(category.id)}
            >
              <Icon name={category.icon} />
              {category.label}
            </Button>
          ))}
        </div>
      </Card>

      <Card className="p-4">
        <SectionHeader title="Latest Care Notes" description="Newest family care context first." />
        <div className="space-y-2">
          {notes.slice(0, 5).map((note) => <CareNoteRow key={note.id} note={note} />)}
        </div>
      </Card>
    </div>
  );
}

function AddUpdateView({ draft, setDraft, onSave }) {
  return (
    <Card className="p-4">
      <SectionHeader title="Add Update" description="Save a compact care note without Apex voice." />
      <div className="grid gap-3 lg:grid-cols-2">
        <SelectField label="Category" value={draft.category} onChange={(event) => setDraft((current) => newDraft(event.target.value))}>
          {APEX_FAMILY_CARE_CATEGORIES.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
        </SelectField>
        <SelectField label="Reporter" value={draft.reporter} onChange={(event) => setDraft((current) => ({ ...current, reporter: event.target.value }))}>
          {APEX_FAMILY_CARE_REPORTERS.map((reporter) => <option key={reporter} value={reporter}>{reporter}</option>)}
        </SelectField>
        <InputField label="Time" type="datetime-local" value={draft.timestamp} onChange={(event) => setDraft((current) => ({ ...current, timestamp: event.target.value }))} />
        <SelectField label="Severity" value={draft.severity} onChange={(event) => setDraft((current) => ({ ...current, severity: event.target.value }))}>
          {APEX_FAMILY_CARE_SEVERITIES.map((severity) => <option key={severity} value={severity}>{severity}</option>)}
        </SelectField>
        <InputField label="Body area" value={draft.bodyArea} onChange={(event) => setDraft((current) => ({ ...current, bodyArea: event.target.value }))} placeholder="Optional" />
      </div>
      <div className="mt-3">
        <TextAreaField label="Short summary" value={draft.summary} onChange={(event) => setDraft((current) => ({ ...current, summary: event.target.value }))} />
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-3">
        <ToggleRow label="Add to doctor summary" checked={draft.addToDoctorSummary} onChange={(value) => setDraft((current) => ({ ...current, addToDoctorSummary: value }))} />
        <ToggleRow label="Family visible" checked={draft.familyVisible} onChange={(value) => setDraft((current) => ({ ...current, familyVisible: value }))} />
        <ToggleRow label="Concern flag" checked={draft.urgent} onChange={(value) => setDraft((current) => ({ ...current, urgent: value }))} />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" onClick={onSave}>
          <Icon name="check" /> Save Update Locally
        </Button>
        <Badge tone="slate">No raw audio</Badge>
        <Badge tone="slate">No diagnosis</Badge>
      </div>
    </Card>
  );
}

function TimelineView({ notes }) {
  return (
    <Card className="p-4">
      <SectionHeader title="Care Timeline" description="Family care notes stay separate from Apex HQ business records." />
      <div className="space-y-2">
        {notes.map((note) => <CareNoteRow key={note.id} note={note} />)}
      </div>
    </Card>
  );
}

function DoctorSummaryView({ doctorSummary }) {
  return (
    <Card className="p-4">
      <SectionHeader title="Doctor Summary" description={doctorSummary.safetyLabel} />
      <div className="mb-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Saved Notes" value={doctorSummary.itemCount} detail="Marked for appointment prep" />
        <StatCard title="Concerns" value={doctorSummary.concernCount} detail="Family-marked or severe" />
        <StatCard title="Pain" value={doctorSummary.painCount} detail="Doctor prep items" />
        <StatCard title="Meds" value={doctorSummary.medicationCount} detail="Doctor prep items" />
      </div>
      <div className="mb-3 flex flex-wrap gap-2">
        {(doctorSummary.preparedLines || []).map((line) => <Badge key={line} tone="slate">{line}</Badge>)}
      </div>
      <div className="space-y-2">
        {doctorSummary.items.length ? doctorSummary.items.map((note) => <CareNoteRow key={note.id} note={note} />) : (
          <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm font-bold text-slate-600">No doctor prep notes yet.</div>
        )}
      </div>
      {doctorSummary.patternSummary?.patterns?.length ? (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm font-black text-amber-900">Repeated pattern prompts</p>
          <div className="mt-2 space-y-1">
            {doctorSummary.patternSummary.patterns.map((pattern) => (
              <p key={pattern.key} className="text-sm font-bold text-amber-800">{pattern.doctorPrepPrompt}</p>
            ))}
          </div>
        </div>
      ) : null}
    </Card>
  );
}

function FamilySummaryView({ familySummary }) {
  return (
    <Card className="p-4">
      <SectionHeader title="Family Summary" description="Low-noise family-visible update list." />
      <div className="mb-3 flex flex-wrap gap-2">
        <Badge tone={familySummary.patternSummary?.hasRepeatedConcerns ? "amber" : "green"}>{familySummary.headline}</Badge>
        <Badge tone={familySummary.concernCount > 0 ? "amber" : "green"}>{familySummary.concernCount} concerns</Badge>
        <Badge tone="blue">{familySummary.visibleCount} visible notes</Badge>
        <Badge tone={familySummary.missingUpdate?.missing ? "amber" : "green"}>{familySummary.missingUpdate?.status || "current"}</Badge>
        <Badge tone="slate">Notification: {familySummary.lockScreenSafeNotification}</Badge>
      </div>
      <div className="mb-3 grid gap-2 md:grid-cols-2">
        {(familySummary.keyPoints || []).map((point) => (
          <div key={point} className="rounded-lg border border-slate-200 bg-white p-3 text-sm font-bold text-slate-600">{point}</div>
        ))}
      </div>
      <div className="space-y-2">
        {familySummary.items.map((note) => <CareNoteRow key={note.id} note={note} />)}
      </div>
    </Card>
  );
}

function SettingsView() {
  return (
    <Card className="p-4">
      <SectionHeader title="Notifications / Settings" description="Phase 2 keeps summaries compact and lock-screen copy private." />
      <div className="grid gap-3 lg:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <p className="text-sm font-black text-slate-950">Lock screen</p>
          <p className="mt-1 text-sm font-bold text-slate-600">Use generic copy like "New Grandma update."</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <p className="text-sm font-black text-slate-950">Noise level</p>
          <p className="mt-1 text-sm font-bold text-slate-600">Digest routine notes; elevate concerns.</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <p className="text-sm font-black text-slate-950">Voice</p>
          <p className="mt-1 text-sm font-bold text-slate-600">No hidden or background recording.</p>
        </div>
      </div>
    </Card>
  );
}

function AccessView({ gate }) {
  return (
    <Card className="p-4">
      <SectionHeader title="Family Access" description="Private operator gate first; family invite flow comes after storage/access design is approved." />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <StatCard title="Route Private" value={gate.routePrivate ? "Yes" : "No"} detail="/family-care is not public." />
        <StatCard title="Apex Only" value={gate.apexOsOnly ? "Yes" : "No"} detail="Uses Apex OS visibility." />
        <StatCard title="Outside Access" value={gate.publicAccess ? "Open" : "Closed"} detail="No customer or field exposure." />
      </div>
    </Card>
  );
}

function HealthView({ gate, summary }) {
  const healthItems = [
    ["Public access", gate.publicAccess ? "Open" : "Closed", gate.publicAccess ? "red" : "green"],
    ["Customer access", gate.customerAccess ? "Open" : "Closed", gate.customerAccess ? "red" : "green"],
    ["Field access", gate.fieldAccess ? "Open" : "Closed", gate.fieldAccess ? "red" : "green"],
    ["Raw audio stored", gate.rawAudioStored ? "Yes" : "No", gate.rawAudioStored ? "red" : "green"],
    ["Raw transcript stored", gate.rawTranscriptStored ? "Yes" : "No", gate.rawTranscriptStored ? "red" : "green"],
    ["Medical diagnosis", gate.medicalDiagnosis ? "Yes" : "No", gate.medicalDiagnosis ? "red" : "green"],
    ["Emergency replacement", gate.emergencyReplacement ? "Yes" : "No", gate.emergencyReplacement ? "red" : "green"],
    ["Missing update detector", summary?.missingUpdate ? "On" : "Off", summary?.missingUpdate ? "green" : "amber"],
    ["Pattern detector", summary?.repeatedConcernPatterns ? "On" : "Off", summary?.repeatedConcernPatterns ? "green" : "amber"],
  ];

  return (
    <Card className="p-4">
      <SectionHeader title="Apex System Health" description="Phase 1 boundary checks for the private care workspace." />
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {healthItems.map(([label, value, tone]) => (
          <div key={label} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3">
            <span className="text-sm font-black text-slate-700">{label}</span>
            <Badge tone={tone}>{value}</Badge>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function ApexFamilyCarePage({ user, permissions }) {
  const [activeScreen, setActiveScreen] = useState("today");
  const [notes, setNotes] = useState(loadInitialNotes);
  const [draft, setDraft] = useState(() => newDraft("normal"));

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notes.slice(0, APEX_FAMILY_CARE_MAX_LOCAL_NOTES)));
  }, [notes]);

  const sortedNotes = useMemo(() => listApexFamilyCareNotes(notes, { limit: APEX_FAMILY_CARE_MAX_LOCAL_NOTES }), [notes]);
  const todaySummary = useMemo(() => buildApexFamilyCareTodaySummary(sortedNotes), [sortedNotes]);
  const doctorSummary = useMemo(() => buildApexFamilyCareDoctorSummary(sortedNotes), [sortedNotes]);
  const familySummary = useMemo(() => buildApexFamilyCareFamilySummary(sortedNotes), [sortedNotes]);
  const gate = useMemo(() => getApexFamilyCareAccessGateSummary({
    routePrivate: Boolean(user?.operatorAccess),
    apexOsOnly: Boolean(permissions?.apexOs?.canView),
  }), [permissions?.apexOs?.canView, user?.operatorAccess]);

  function handleQuickAdd(categoryId) {
    const nextDraft = newDraft(categoryId);
    setDraft(nextDraft);
    setActiveScreen("add");
  }

  function handleSave() {
    const saved = createApexFamilyCareNote({
      ...draft,
      id: `family-care-${Date.now()}`,
      timestamp: draft.timestamp || new Date().toISOString(),
    });
    setNotes((current) => addApexFamilyCareNote(current, saved));
    setDraft(newDraft(saved.category));
    setActiveScreen("today");
  }

  const screenContent = {
    today: <TodayView notes={sortedNotes} summary={todaySummary} onQuickAdd={handleQuickAdd} setActiveScreen={setActiveScreen} />,
    add: <AddUpdateView draft={draft} setDraft={setDraft} onSave={handleSave} />,
    timeline: <TimelineView notes={sortedNotes} />,
    doctor: <DoctorSummaryView doctorSummary={doctorSummary} />,
    family: <FamilySummaryView familySummary={familySummary} />,
    settings: <SettingsView />,
    access: <AccessView gate={gate} />,
    health: <HealthView gate={gate} summary={todaySummary} />,
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        eyebrow="Apex Private Operator"
        title="Family Care"
        description="Private family care workspace for Grandma. Separate from Apex HQ customer, field, and business data."
        actions={(
          <>
            <Badge tone="green">Family-only</Badge>
            <Badge tone="blue">PWA route</Badge>
            <Badge tone="slate">Local notes</Badge>
          </>
        )}
        tabs={APEX_FAMILY_CARE_REQUIRED_SCREENS.map((screen) => (
          <button
            key={screen}
            type="button"
            onClick={() => setActiveScreen(screen)}
            className={`shrink-0 rounded-lg px-3 py-2 text-xs font-black ${activeScreen === screen ? "bg-slate-950 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-orange-50 hover:text-orange-700"}`}
          >
            {SCREEN_LABELS[screen]}
          </button>
        ))}
      />

      <div className="mx-auto grid w-full max-w-[1520px] gap-4 px-5 pb-8 sm:px-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <main className="min-w-0">{screenContent[activeScreen]}</main>
        <aside className="space-y-4">
          <Card className="p-4">
            <SectionHeader title="Care Boundary" description="Built for John's family, not Apex HQ product use." />
            <div className="flex flex-wrap gap-2">
              <Badge tone="green">No public route</Badge>
              <Badge tone="green">No customer access</Badge>
              <Badge tone="green">No field access</Badge>
              <Badge tone="green">No raw audio</Badge>
              <Badge tone="green">No diagnosis</Badge>
            </div>
          </Card>
          <Card className="p-4">
            <SectionHeader title="Latest Signal" description={todaySummary.latestNote ? todaySummary.latestNote.summary : "No notes yet."} />
            <div className="grid gap-2">
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3">
                <span className="text-sm font-black text-slate-700">Next best action</span>
                <Badge tone={todaySummary.nextBestAction?.tone || "green"}>{todaySummary.nextBestAction?.label || "In sync"}</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3">
                <span className="text-sm font-black text-slate-700">Family loop</span>
                <Badge tone={todaySummary.missingUpdate?.missing ? "amber" : "green"}>{todaySummary.careLoopStatus || "Current"}</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3">
                <span className="text-sm font-black text-slate-700">Pattern watch</span>
                <Badge tone={todaySummary.repeatedConcernPatterns?.hasRepeatedConcerns ? "amber" : "green"}>{todaySummary.repeatedConcernPatterns?.summaryLabel || "Clear"}</Badge>
              </div>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
