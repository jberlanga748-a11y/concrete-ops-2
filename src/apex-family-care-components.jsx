import { useEffect, useMemo, useState } from "react";

import { Badge, Button, Card, Icon, InputField, PageHeader, SectionHeader, SelectField, StatCard, TextAreaField } from "./app-shell-components";
import {
  APEX_FAMILY_CARE_CATEGORIES,
  APEX_FAMILY_CARE_MAX_LOCAL_NOTES,
  APEX_FAMILY_CARE_NOTE_STATUSES,
  APEX_FAMILY_CARE_REPORTERS,
  APEX_FAMILY_CARE_REQUIRED_SCREENS,
  APEX_FAMILY_CARE_SEVERITIES,
  addApexFamilyCareNote,
  buildApexFamilyCareAccessReadiness,
  buildApexFamilyCareBoundaryReleasePrep,
  buildApexFamilyCareLocalReleaseSmokeChecklist,
  buildApexFamilyCareDoctorSummary,
  buildApexFamilyCareFamilySummary,
  buildApexFamilyCareReviewState,
  buildApexFamilyCareTodaySummary,
  createApexFamilyCareNote,
  getApexFamilyCareAccessGateSummary,
  listApexFamilyCareNotes,
  reviseApexFamilyCareNote,
  updateApexFamilyCareNote,
} from "../shared/apexFamilyCare.js";
import {
  APEX_FAMILY_CARE_COORDINATOR_REVIEW_POLICY,
  applyApexFamilyCareCoordinatorPromptReview,
  buildApexFamilyCareCoordinatorPacket,
  buildApexFamilyCareCoordinatorReviewPacket,
  getApexFamilyCareBrainInterfaceSummary,
  normalizeApexFamilyCareCoordinatorReviewState,
} from "../shared/apexFamilyCareBrain.js";
import {
  APEX_FAMILY_CARE_HOUSEHOLD_DEVICE_BRIDGE_APPROVAL_POLICY,
  APEX_FAMILY_CARE_HOUSEHOLD_DEVICE_PRESENCE_POLICY,
  APEX_FAMILY_CARE_KITCHEN_MODE_POLICY,
  applyApexFamilyCareKitchenControl,
  buildApexFamilyCareHouseholdDeviceBridgeApprovalPacket,
  buildApexFamilyCareHouseholdDevicePresence,
  buildApexFamilyCareKitchenModeStatus,
  getDefaultApexFamilyCareKitchenDeviceState,
} from "../shared/apexFamilyCareKitchen.js";
import {
  APEX_FAMILY_CARE_EXTERNAL_NOTIFICATION_APPROVAL_POLICY,
  APEX_FAMILY_CARE_NOTIFICATION_DELIVERY_METHODS,
  APEX_FAMILY_CARE_NOTIFICATION_DELIVERY_POLICY,
  APEX_FAMILY_CARE_NOTIFICATION_POLICY,
  buildApexFamilyCareExternalNotificationApprovalPacket,
  buildApexFamilyCareNotificationState,
  getDefaultApexFamilyCareNotificationPreferences,
  normalizeApexFamilyCareNotificationPreferences,
} from "../shared/apexFamilyCareNotifications.js";
import {
  APEX_FAMILY_CARE_TEST_WEEK_FRICTION_CATEGORIES,
  addApexFamilyCareTestWeekFrictionNote,
  buildApexFamilyCareTestWeekRunPacket,
  buildApexFamilyCareTestWeekSummary,
  getDefaultApexFamilyCareTestWeekState,
  markApexFamilyCareTestWeekComplete,
  normalizeApexFamilyCareTestWeekState,
  startApexFamilyCareTestWeek,
} from "../shared/apexFamilyCareTestWeek.js";
import {
  APEX_FAMILY_CARE_LOCAL_VOICE_INPUT_POLICY,
  APEX_FAMILY_CARE_LOCAL_STT_BRIDGE_APPROVAL_POLICY,
  APEX_FAMILY_CARE_VOICE_POLICY,
  applyApexFamilyCareLocalVoiceInputControl,
  buildApexFamilyCareLocalSttBridgeApprovalPacket,
  buildApexFamilyCareLocalVoiceInputSession,
  createApexFamilyCareVoiceNoteDraft,
} from "../shared/apexFamilyCareVoice.js";

const STORAGE_KEY = "apex-family-care-local-notes-v1";
const NOTIFICATION_STORAGE_KEY = "apex-family-care-notification-preferences-v1";
const KITCHEN_STORAGE_KEY = "apex-family-care-kitchen-device-v1";
const TEST_WEEK_STORAGE_KEY = "apex-family-care-test-week-v1";
const COORDINATOR_REVIEW_STORAGE_KEY = "apex-family-care-coordinator-review-v1";

const SCREEN_LABELS = {
  today: "Today",
  kitchen: "Kitchen Mode",
  add: "Add Update",
  voice: "Voice Update",
  timeline: "Care Timeline",
  doctor: "Doctor Summary",
  family: "Family Summary",
  settings: "Settings",
  testWeek: "Test Week",
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
    return listApexFamilyCareNotes(parsed, { limit: APEX_FAMILY_CARE_MAX_LOCAL_NOTES, status: "" });
  } catch {
    return starterNotes;
  }
}

function loadInitialNotificationPreferences() {
  const defaults = getDefaultApexFamilyCareNotificationPreferences();
  if (typeof window === "undefined") return defaults;
  try {
    const stored = window.localStorage.getItem(NOTIFICATION_STORAGE_KEY);
    if (!stored) return defaults;
    return normalizeApexFamilyCareNotificationPreferences(JSON.parse(stored));
  } catch {
    return defaults;
  }
}

function loadInitialKitchenDeviceState() {
  const defaults = getDefaultApexFamilyCareKitchenDeviceState();
  if (typeof window === "undefined") return defaults;
  try {
    const stored = window.localStorage.getItem(KITCHEN_STORAGE_KEY);
    if (!stored) return defaults;
    return applyApexFamilyCareKitchenControl(JSON.parse(stored), "heartbeat");
  } catch {
    return defaults;
  }
}

function loadInitialTestWeekState() {
  const defaults = getDefaultApexFamilyCareTestWeekState();
  if (typeof window === "undefined") return defaults;
  try {
    const stored = window.localStorage.getItem(TEST_WEEK_STORAGE_KEY);
    if (!stored) return defaults;
    return normalizeApexFamilyCareTestWeekState(JSON.parse(stored));
  } catch {
    return defaults;
  }
}

function loadInitialCoordinatorReviewState() {
  if (typeof window === "undefined") return { schemaVersion: 1, records: [] };
  try {
    const stored = window.localStorage.getItem(COORDINATOR_REVIEW_STORAGE_KEY);
    if (!stored) return { schemaVersion: 1, records: [] };
    const parsed = JSON.parse(stored);
    return parsed && typeof parsed === "object" ? parsed : { schemaVersion: 1, records: [] };
  } catch {
    return { schemaVersion: 1, records: [] };
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

function newVoiceDraft(reporter = "Dad") {
  return {
    reporter,
    transcript: "",
    followUpAnswer: "",
    listening: false,
    status: "idle",
    followUpAsked: false,
    parsed: null,
    receipt: null,
    localVoiceSession: buildApexFamilyCareLocalVoiceInputSession({ state: "quiet" }),
    notice: "Ready for one visible voice update.",
  };
}

function newTestWeekDraft() {
  return {
    reporter: "Dad",
    category: "too-much-work",
    text: "",
    suggestion: "",
    extraWork: false,
    shouldFreeze: false,
  };
}

function newTimelineFilters() {
  return {
    status: "open",
    category: "",
    reporter: "",
    concernOnly: false,
    doctorOnly: false,
  };
}

function noteTimestampToInputValue(timestamp) {
  const parsed = new Date(timestamp);
  return Number.isNaN(parsed.getTime()) ? toDatetimeInputValue() : toDatetimeInputValue(parsed);
}

function newRevisionDraft(note = null) {
  return {
    noteId: note?.id || "",
    category: note?.category || "normal",
    reporter: note?.reporter || "Dad",
    timestamp: noteTimestampToInputValue(note?.timestamp),
    summary: note?.summary || "",
    severity: note?.severity || "unknown",
    bodyArea: note?.bodyArea || "",
    addToDoctorSummary: Boolean(note?.addToDoctorSummary),
    familyVisible: note?.familyVisible !== false,
    urgent: Boolean(note?.urgent),
    status: note?.status === "archived" ? "needs-review" : note?.status || "needs-review",
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

function noteStatusTone(status) {
  if (status === "archived") return "slate";
  if (status === "needs-review") return "amber";
  if (status === "confirmed") return "blue";
  return "green";
}

function noteStatusLabel(status) {
  if (status === "needs-review") return "Needs review";
  if (status === "confirmed") return "Confirmed";
  return status;
}

function CareNoteRow({ note, onStatusChange = null, onRevise = null }) {
  const showStatusActions = typeof onStatusChange === "function";
  const showRevisionAction = typeof onRevise === "function";
  return (
    <div className="min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-3">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <Badge tone={noteTone(note)}>{note.categoryLabel}</Badge>
        <Badge tone={note.urgent ? "amber" : "slate"}>{note.urgent ? "Concern" : "Normal"}</Badge>
        <Badge tone={noteStatusTone(note.status)}>{noteStatusLabel(note.status)}</Badge>
        {note.addToDoctorSummary ? <Badge tone="blue">Doctor prep</Badge> : null}
        {note.revisionCount ? <Badge tone="slate">Revised {note.revisionCount}x</Badge> : null}
        <span className="text-xs font-black text-slate-500">{formatCareTime(note.timestamp)}</span>
      </div>
      <p className="mt-2 break-words text-sm font-black text-slate-950">{note.summary}</p>
      <p className="mt-1 break-words text-xs font-bold text-slate-500">
        {note.reporter} for {note.subject}
        {note.severity !== "unknown" ? ` / ${note.severity}` : ""}
        {note.bodyArea ? ` / ${note.bodyArea}` : ""}
      </p>
      {showStatusActions ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {showRevisionAction ? (
            <Button type="button" variant="secondary" onClick={() => onRevise(note)}>
              <Icon name="document" /> Revise Note
            </Button>
          ) : null}
          <Button type="button" variant="secondary" onClick={() => onStatusChange(note.id, "needs-review")} disabled={note.status === "needs-review"}>
            <Icon name="alert" /> Needs Review
          </Button>
          <Button type="button" variant="secondary" onClick={() => onStatusChange(note.id, "confirmed")} disabled={note.status === "confirmed"}>
            <Icon name="check" /> Confirm Reviewed
          </Button>
          <Button type="button" variant="secondary" onClick={() => onStatusChange(note.id, "active")} disabled={note.status === "active"}>
            <Icon name="check" /> Restore Active
          </Button>
          <Button type="button" variant="secondary" onClick={() => onStatusChange(note.id, "archived")} disabled={note.status === "archived"}>
            <Icon name="inbox" /> Archive
          </Button>
        </div>
      ) : null}
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

function TodayView({ notes, summary, onQuickAdd, onVoiceStart, setActiveScreen }) {
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
          description="Short buttons and visible voice entry for the common care notes."
          action={(
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={onVoiceStart}>
                <Icon name="quote" /> Voice Update
              </Button>
              <Button type="button" variant="secondary" onClick={() => setActiveScreen("add")}>
                <Icon name="plus" /> Add Details
              </Button>
            </div>
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

function KitchenModeView({ kitchenStatus, householdPresence, householdDeviceBridgeApproval, onKitchenQuickLog, onKitchenControl, onVoiceStart, setActiveScreen }) {
  const quickCategories = APEX_FAMILY_CARE_CATEGORIES.slice(0, 9);
  const isMuted = kitchenStatus.controls.muted;

  return (
    <div className="space-y-4">
      <Card className="border-blue-200 bg-blue-50 p-4">
        <SectionHeader
          title="Kitchen Mode"
          description="House tablet or old phone mode for fast visible updates."
          action={<Badge tone={kitchenStatus.health.statusTone}>{kitchenStatus.health.statusLabel}</Badge>}
        />
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-blue-200 bg-white p-3">
            <p className="text-sm font-black text-slate-950">First device</p>
            <p className="mt-1 text-sm font-bold text-slate-700">{kitchenStatus.device.deviceTypeLabel}</p>
            <p className="mt-1 text-xs font-bold text-slate-500">{kitchenStatus.device.installTarget}</p>
          </div>
          <div className="rounded-lg border border-blue-200 bg-white p-3">
            <p className="text-sm font-black text-slate-950">Listening</p>
            <p className="mt-1 text-sm font-bold text-slate-700">{kitchenStatus.controls.visibleListeningStatus}</p>
            <p className="mt-1 text-xs font-bold text-slate-500">No hidden microphone capture.</p>
          </div>
          <div className="rounded-lg border border-blue-200 bg-white p-3">
            <p className="text-sm font-black text-slate-950">Speaking</p>
            <p className="mt-1 text-sm font-bold text-slate-700">{kitchenStatus.controls.visibleSpeakingStatus}</p>
            <p className="mt-1 text-xs font-bold text-slate-500">Mute and stop stay visible.</p>
          </div>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <Button type="button" variant={isMuted ? "primary" : "secondary"} size="lg" onClick={() => onKitchenControl(isMuted ? "resume" : "mute")}>
            <Icon name={isMuted ? "check" : "lock"} /> {isMuted ? "Resume Kitchen" : "Mute Kitchen"}
          </Button>
          <Button type="button" variant="secondary" size="lg" onClick={() => onKitchenControl("stop")}>
            <Icon name="refresh" /> Stop / Recover Voice State
          </Button>
          <Button type="button" variant="secondary" size="lg" onClick={onVoiceStart}>
            <Icon name="quote" /> Visible Voice Update
          </Button>
        </div>
      </Card>

      <Card className="p-4">
        <SectionHeader title="One-Tap Care Updates" description="Large buttons for common kitchen/tablet entries." />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {quickCategories.map((category) => (
            <Button
              key={category.id}
              type="button"
              variant="secondary"
              className="min-h-20 justify-start px-4 py-4 text-left text-base"
              onClick={() => onKitchenQuickLog(category.id)}
            >
              <Icon name={category.icon} className="h-5 w-5 shrink-0" />
              <span>{category.label}</span>
            </Button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => setActiveScreen("add")}>
            <Icon name="plus" /> Add Details
          </Button>
          <Badge tone="green">Local only</Badge>
          <Badge tone="green">No camera</Badge>
          <Badge tone="green">No network scan</Badge>
        </div>
      </Card>

      <Card className="p-4">
        <SectionHeader title="Household Device Presence" description={householdPresence.presence.readyForHouse ? "House screen is ready for family use." : householdPresence.presence.offlineReason || "House screen needs a local PWA heartbeat."} />
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Primary Device" value={householdPresence.device.primaryLabel} detail={`Backup: ${householdPresence.device.backupLabel}`} />
          <StatCard title="Presence" value={householdPresence.presence.statusLabel} detail={`Last seen ${householdPresence.presence.minutesSinceLastSeen ?? 0}m ago`} />
          <StatCard title="Voice Mode" value={householdPresence.voice.statusLabel} detail={householdPresence.voice.detail} />
          <StatCard title="Controls" value={householdPresence.controls.alwaysVisible ? "Visible" : "Check"} detail="Mute, stop, recover" />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge tone="green">Tablet or old phone first</Badge>
          <Badge tone={householdPresence.device.raspberryPiDeferred ? "amber" : "green"}>{householdPresence.device.raspberryPiDeferred ? "Raspberry Pi deferred" : "No hardware needed"}</Badge>
          <Badge tone="green">Heartbeat only</Badge>
          <Badge tone="green">No camera</Badge>
          <Badge tone="green">No network scan</Badge>
          <Badge tone="green">No device control</Badge>
          <Badge tone={householdPresence.voice.bridgeApprovalRequired ? "amber" : "green"}>{householdPresence.voice.bridgeApprovalRequired ? "Local STT bridge pending" : "Local STT ready"}</Badge>
        </div>
      </Card>

      <Card className="p-4">
        <SectionHeader title="Household Device Bridge Approval" description={householdDeviceBridgeApproval.nextApprovalNeeded} />
        <div className="mb-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Current Path" value={householdDeviceBridgeApproval.currentPwaEnough ? "PWA enough" : "Approval needed"} detail={householdDeviceBridgeApproval.currentSafePath} />
          <StatCard title="Selected Device" value={householdDeviceBridgeApproval.selectedDeviceLabel} detail={householdDeviceBridgeApproval.selectedDeviceInstallTarget} />
          <StatCard title="Bridge Status" value={householdDeviceBridgeApproval.approvalStatus} detail="No activation in Phase 6B" />
          <StatCard title="Device Control" value={householdDeviceBridgeApproval.deviceOsControlEnabled ? "On" : "Off"} detail="Blocked" />
        </div>
        <div className="mb-3 flex flex-wrap gap-2">
          <Badge tone="green">PWA first</Badge>
          <Badge tone="amber">Bridge approval required</Badge>
          <Badge tone="green">No device OS control</Badge>
          <Badge tone="green">No camera</Badge>
          <Badge tone="green">No network scan</Badge>
          <Badge tone="green">No hidden recording</Badge>
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          {householdDeviceBridgeApproval.checks.map((check) => (
            <div key={check.id} className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-black text-slate-950">{check.label}</p>
                <Badge tone={check.passed ? "green" : "amber"}>{check.passed ? "Ready" : "Needed"}</Badge>
              </div>
              <p className="mt-1 text-sm font-bold text-slate-600">{check.detail}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4">
        <SectionHeader title="Kitchen Device Health" description="Local PWA heartbeat and visible controls only." />
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Device" value={kitchenStatus.device.deviceTypeLabel} detail={kitchenStatus.device.room} />
          <StatCard title="PWA" value={kitchenStatus.health.statusLabel} detail={`Last seen ${kitchenStatus.health.minutesSinceLastSeen ?? 0}m ago`} />
          <StatCard title="Mic" value={APEX_FAMILY_CARE_KITCHEN_MODE_POLICY.liveMicCaptureEnabled ? "Live" : "Off"} detail="Explicit visible voice only" />
          <StatCard title="Device Control" value={APEX_FAMILY_CARE_KITCHEN_MODE_POLICY.deviceControlEnabled ? "On" : "Off"} detail="No remote control" />
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

function VoiceUpdateView({ voiceDraft, setVoiceDraft, localSttBridgeApproval, onStart, onStop, onMute, onRecover, onCancel, onReview, onSave, onSaveNeedsReview }) {
  const receipt = voiceDraft.receipt;
  const parsed = voiceDraft.parsed;
  const localVoiceSession = voiceDraft.localVoiceSession || buildApexFamilyCareLocalVoiceInputSession({ state: "quiet" });
  const showFollowUp = voiceDraft.status === "needs-follow-up";
  const showPreview = parsed?.noteReady;

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <SectionHeader
          title="Voice Update"
          description="Visible one-turn entry for spoken care notes. This screen does not auto-start the microphone or store raw audio."
          action={(
            <Badge tone={localVoiceSession.sessionActive ? "amber" : "green"}>
              {localVoiceSession.sessionActive ? "Local STT visible" : "Quiet until started"}
            </Badge>
          )}
        />
        <div className="mb-3 grid gap-2 md:grid-cols-3">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
            <p className="text-sm font-black text-emerald-950">Start rule</p>
            <p className="mt-1 text-sm font-bold text-emerald-800">Only after someone taps Start Voice Update.</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-sm font-black text-slate-950">Recording rule</p>
            <p className="mt-1 text-sm font-bold text-slate-600">No hidden/background recording and no raw audio storage.</p>
          </div>
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
            <p className="text-sm font-black text-blue-950">Follow-up rule</p>
            <p className="mt-1 text-sm font-bold text-blue-800">Apex asks at most one clarifying question.</p>
          </div>
        </div>

        <div className="mb-3 grid gap-2 md:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-sm font-black text-slate-950">Local STT Bridge</p>
            <p className="mt-1 text-sm font-bold text-slate-600">{localVoiceSession.statusLabel}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-sm font-black text-slate-950">Endpoint</p>
            <p className="mt-1 text-sm font-bold text-slate-600">{localVoiceSession.localSttEndpointEnabled ? "Ready" : "Endpoint approval required"}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-sm font-black text-slate-950">Audio storage</p>
            <p className="mt-1 text-sm font-bold text-slate-600">{APEX_FAMILY_CARE_LOCAL_VOICE_INPUT_POLICY.rawAudioStored ? "Stored" : "Never stored"}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-sm font-black text-slate-950">Cloud STT</p>
            <p className="mt-1 text-sm font-bold text-slate-600">{APEX_FAMILY_CARE_LOCAL_VOICE_INPUT_POLICY.cloudSttAllowed ? "Allowed" : "Blocked"}</p>
          </div>
        </div>

        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-black text-amber-950">STT Bridge Approval</p>
              <p className="mt-1 text-sm font-bold text-amber-800">{localSttBridgeApproval.nextApprovalNeeded}</p>
            </div>
            <Badge tone={localSttBridgeApproval.readyForEndpointWork ? "green" : "amber"}>{localSttBridgeApproval.approvalStatus}</Badge>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {localSttBridgeApproval.approvalChecks.map((check) => (
              <div key={check.id} className="rounded-lg border border-white/70 bg-white p-3">
                <div className="flex min-w-0 items-center justify-between gap-2">
                  <p className="min-w-0 break-words text-xs font-black text-slate-950">{check.label}</p>
                  <Badge tone={check.ready ? "green" : "amber"}>{check.status}</Badge>
                </div>
                <p className="mt-1 break-words text-xs font-bold text-slate-600">{check.detail}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
          <TextAreaField
            label="Recognized words or typed fallback"
            value={voiceDraft.transcript}
            onChange={(event) => setVoiceDraft((current) => ({
              ...current,
              transcript: event.target.value,
              parsed: null,
              receipt: null,
              status: current.listening ? "listening" : "drafting",
              notice: "Voice text changed. Review it before saving.",
            }))}
            placeholder="Example: Apex, log that Grandma's knee hurt after lunch."
          />
          <div className="space-y-3">
            <SelectField
              label="Reporter"
              value={voiceDraft.reporter}
              onChange={(event) => setVoiceDraft((current) => ({ ...current, reporter: event.target.value }))}
            >
              {APEX_FAMILY_CARE_REPORTERS.map((reporter) => <option key={reporter} value={reporter}>{reporter}</option>)}
            </SelectField>
            <div className="flex flex-col gap-2">
              <Button type="button" onClick={onStart} disabled={voiceDraft.listening}>
                <Icon name="quote" /> Start Voice Update
              </Button>
              <Button type="button" variant="secondary" onClick={onStop} disabled={!voiceDraft.listening}>
                <Icon name="pause" /> Stop Listening
              </Button>
              <Button type="button" variant="secondary" onClick={onMute}>
                <Icon name="volume-x" /> Mute Voice Input
              </Button>
              <Button type="button" variant="secondary" onClick={onRecover}>
                <Icon name="refresh" /> Recover To Quiet
              </Button>
              <Button type="button" variant="secondary" onClick={onReview} disabled={!voiceDraft.transcript.trim()}>
                <Icon name="check" /> Done Talking / Review
              </Button>
              <Button type="button" variant="secondary" onClick={onCancel}>
                <Icon name="refresh" /> Cancel Voice Update
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Badge tone="green">Explicit start</Badge>
          <Badge tone="green">Visible stop</Badge>
          <Badge tone="green">Visible mute</Badge>
          <Badge tone="green">Visible recover</Badge>
          <Badge tone="amber">Endpoint approval required</Badge>
          <Badge tone={localVoiceSession.localSttEndpointEnabled ? "green" : "amber"}>{localVoiceSession.localSttEndpointEnabled ? "Local STT ready" : "Local STT bridge pending"}</Badge>
          <Badge tone="green">No raw transcript receipt</Badge>
          <Badge tone="green">No cloud STT</Badge>
          <Badge tone="green">No browser speech</Badge>
          <Badge tone="slate">Typed/tap fallback stays on</Badge>
        </div>
        <p className="mt-3 rounded-lg border border-slate-200 bg-white p-3 text-sm font-bold text-slate-600">{voiceDraft.notice}</p>
      </Card>

      {showFollowUp ? (
        <Card className="border-amber-200 bg-amber-50 p-4">
          <SectionHeader title="One Follow-up" description={parsed.followUpPrompt} />
          <TextAreaField
            label="Answer"
            value={voiceDraft.followUpAnswer}
            onChange={(event) => setVoiceDraft((current) => ({
              ...current,
              followUpAnswer: event.target.value,
              parsed: null,
              receipt: null,
              notice: "Follow-up answer changed. Review it before saving.",
            }))}
            placeholder="Add one short detail, then review again."
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" onClick={onReview} disabled={!voiceDraft.followUpAnswer.trim()}>
              <Icon name="check" /> Review With Answer
            </Button>
            <Button type="button" variant="secondary" onClick={onSaveNeedsReview}>
              <Icon name="alert" /> Save Needs Review
            </Button>
            <Badge tone="amber">No second follow-up</Badge>
          </div>
        </Card>
      ) : null}

      {showPreview ? (
        <Card className="p-4">
          <SectionHeader title="Apex Structured Note" description="Review the compact note Apex will save for the family." />
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="flex flex-wrap gap-2">
              <Badge tone="blue">{parsed.categoryLabel}</Badge>
              <Badge tone={parsed.urgent ? "amber" : "green"}>{parsed.urgent ? "Concern" : "Normal"}</Badge>
              <Badge tone="slate">{parsed.severity}</Badge>
              {parsed.bodyArea ? <Badge tone="slate">{parsed.bodyArea}</Badge> : null}
              {parsed.addToDoctorSummary ? <Badge tone="blue">Doctor prep</Badge> : null}
            </div>
            <p className="mt-2 break-words text-sm font-black text-slate-950">{parsed.noteInput.summary}</p>
            <p className="mt-1 text-xs font-bold text-slate-500">Reporter: {parsed.reporter}. Family visible: {parsed.familyVisible ? "yes" : "no"}.</p>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" onClick={onSave}>
              <Icon name="check" /> Save Voice Note
            </Button>
            <Button type="button" variant="secondary" onClick={onCancel}>
              <Icon name="refresh" /> Start Over
            </Button>
          </div>
        </Card>
      ) : null}

      {receipt ? (
        <Card className="p-4">
          <SectionHeader title="Voice Receipt" description="Compact local metadata only. No raw audio, transcript, prompts, responses, secrets, or cloud use." />
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3">
              <span className="text-sm font-black text-slate-700">Explicit start</span>
              <Badge tone={receipt.explicitUserStarted ? "green" : "red"}>{receipt.explicitUserStarted ? "Yes" : "No"}</Badge>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3">
              <span className="text-sm font-black text-slate-700">Raw audio</span>
              <Badge tone={receipt.rawAudioStored ? "red" : "green"}>{receipt.rawAudioStored ? "Stored" : "Not stored"}</Badge>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3">
              <span className="text-sm font-black text-slate-700">Cloud</span>
              <Badge tone={receipt.cloudUsed ? "red" : "green"}>{receipt.cloudUsed ? "Used" : "Unused"}</Badge>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3">
              <span className="text-sm font-black text-slate-700">Follow-ups</span>
              <Badge tone={receipt.metadata.followUpCount > APEX_FAMILY_CARE_VOICE_POLICY.maxFollowUps ? "red" : "green"}>{receipt.metadata.followUpCount}/{APEX_FAMILY_CARE_VOICE_POLICY.maxFollowUps}</Badge>
            </div>
          </div>
        </Card>
      ) : null}
    </div>
  );
}

function TimelineView({ reviewState, revisionDraft, setRevisionDraft, timelineFilters, setTimelineFilters, onCancelRevision, onSaveRevision, onStartRevise, onStatusChange }) {
  const editingRevision = Boolean(revisionDraft?.noteId);

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <SectionHeader title="Care Timeline" description={reviewState.nextAction} />
        <div className="mb-3 grid gap-2 md:grid-cols-2 xl:grid-cols-6">
          <StatCard title="Active" value={reviewState.counts.active} detail="Unconfirmed notes" />
          <StatCard title="Confirmed" value={reviewState.counts.confirmed} detail="Reviewed by family" />
          <StatCard title="Needs Review" value={reviewState.counts.needsReview} detail="Check before relying on it" />
          <StatCard title="Archived" value={reviewState.counts.archived} detail="Hidden from summaries" />
          <StatCard title="Doctor Prep" value={reviewState.counts.doctorPrep} detail="Open appointment notes" />
          <StatCard title="Filtered" value={reviewState.counts.filtered} detail="Shown below" />
        </div>
        <div className="grid gap-3 lg:grid-cols-5">
          <SelectField label="Status" value={timelineFilters.status} onChange={(event) => setTimelineFilters((current) => ({ ...current, status: event.target.value }))}>
            <option value="open">Open</option>
            <option value="all">All</option>
            {APEX_FAMILY_CARE_NOTE_STATUSES.map((status) => <option key={status} value={status}>{noteStatusLabel(status)}</option>)}
          </SelectField>
          <SelectField label="Category" value={timelineFilters.category} onChange={(event) => setTimelineFilters((current) => ({ ...current, category: event.target.value }))}>
            <option value="">All categories</option>
            {APEX_FAMILY_CARE_CATEGORIES.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
          </SelectField>
          <SelectField label="Reporter" value={timelineFilters.reporter} onChange={(event) => setTimelineFilters((current) => ({ ...current, reporter: event.target.value }))}>
            <option value="">All reporters</option>
            {APEX_FAMILY_CARE_REPORTERS.map((reporter) => <option key={reporter} value={reporter}>{reporter}</option>)}
          </SelectField>
          <ToggleRow label="Concern only" checked={timelineFilters.concernOnly} onChange={(value) => setTimelineFilters((current) => ({ ...current, concernOnly: value }))} />
          <ToggleRow label="Doctor prep only" checked={timelineFilters.doctorOnly} onChange={(value) => setTimelineFilters((current) => ({ ...current, doctorOnly: value }))} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => setTimelineFilters(newTimelineFilters())}>
            <Icon name="refresh" /> Reset Filters
          </Button>
          <Badge tone="green">Local review only</Badge>
          <Badge tone="green">No deletes</Badge>
          <Badge tone="green">No medical advice</Badge>
        </div>
      </Card>

      {editingRevision ? (
        <Card className="p-4">
          <SectionHeader title="Revise Note" description="Correct mistaken details locally without deleting the original note history." />
          <div className="grid gap-3 lg:grid-cols-2">
            <SelectField label="Category" value={revisionDraft.category} onChange={(event) => setRevisionDraft((current) => ({ ...current, category: event.target.value }))}>
              {APEX_FAMILY_CARE_CATEGORIES.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
            </SelectField>
            <SelectField label="Reporter" value={revisionDraft.reporter} onChange={(event) => setRevisionDraft((current) => ({ ...current, reporter: event.target.value }))}>
              {APEX_FAMILY_CARE_REPORTERS.map((reporter) => <option key={reporter} value={reporter}>{reporter}</option>)}
            </SelectField>
            <InputField label="Time" type="datetime-local" value={revisionDraft.timestamp} onChange={(event) => setRevisionDraft((current) => ({ ...current, timestamp: event.target.value }))} />
            <SelectField label="Severity" value={revisionDraft.severity} onChange={(event) => setRevisionDraft((current) => ({ ...current, severity: event.target.value }))}>
              {APEX_FAMILY_CARE_SEVERITIES.map((severity) => <option key={severity} value={severity}>{severity}</option>)}
            </SelectField>
            <InputField label="Body area" value={revisionDraft.bodyArea} onChange={(event) => setRevisionDraft((current) => ({ ...current, bodyArea: event.target.value }))} placeholder="Optional" />
            <SelectField label="Review status" value={revisionDraft.status} onChange={(event) => setRevisionDraft((current) => ({ ...current, status: event.target.value }))}>
              {APEX_FAMILY_CARE_NOTE_STATUSES.map((status) => <option key={status} value={status}>{noteStatusLabel(status)}</option>)}
            </SelectField>
          </div>
          <div className="mt-3">
            <TextAreaField label="Corrected note" value={revisionDraft.summary} onChange={(event) => setRevisionDraft((current) => ({ ...current, summary: event.target.value }))} />
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            <ToggleRow label="Add to doctor summary" checked={revisionDraft.addToDoctorSummary} onChange={(value) => setRevisionDraft((current) => ({ ...current, addToDoctorSummary: value }))} />
            <ToggleRow label="Family visible" checked={revisionDraft.familyVisible} onChange={(value) => setRevisionDraft((current) => ({ ...current, familyVisible: value }))} />
            <ToggleRow label="Concern flag" checked={revisionDraft.urgent} onChange={(value) => setRevisionDraft((current) => ({ ...current, urgent: value }))} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" onClick={onSaveRevision} disabled={!revisionDraft.summary.trim()}>
              <Icon name="check" /> Save Revision
            </Button>
            <Button type="button" variant="secondary" onClick={onCancelRevision}>
              <Icon name="refresh" /> Cancel Revision
            </Button>
            <Badge tone="green">No delete</Badge>
            <Badge tone="green">Metadata-only receipt</Badge>
            <Badge tone="green">No medical advice</Badge>
          </div>
        </Card>
      ) : null}

      <Card className="p-4">
        <SectionHeader title="Review Notes" description="Mark mistaken or uncertain notes for review before they feed family or doctor prep." />
        <div className="space-y-2">
          {reviewState.notes.length ? reviewState.notes.map((note) => (
            <CareNoteRow key={note.id} note={note} onRevise={onStartRevise} onStatusChange={onStatusChange} />
          )) : (
            <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm font-bold text-slate-600">No notes match these review filters.</div>
          )}
        </div>
      </Card>
    </div>
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
      <div className="mb-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        {(doctorSummary.doctorPrepChecklist || []).map((item) => (
          <div key={item.id} className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="flex min-w-0 items-center justify-between gap-3">
              <p className="min-w-0 break-words text-sm font-black text-slate-950">{item.label}</p>
              <Badge tone={item.ready ? "green" : "amber"}>{item.ready ? "Ready" : "Check"}</Badge>
            </div>
            <p className="mt-1 break-words text-xs font-bold text-slate-600">{item.detail}</p>
          </div>
        ))}
      </div>
      <div className="mb-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-black text-blue-950">Copy-Safe Doctor Visit Brief</p>
          <Badge tone="blue">Manual copy only</Badge>
          <Badge tone="green">No sends</Badge>
        </div>
        <div className="mt-2 space-y-1">
          {(doctorSummary.doctorVisitBriefLines || []).map((line) => (
            <p key={line} className="break-words text-sm font-bold text-blue-900">{line}</p>
          ))}
        </div>
      </div>
      <div className="mb-3 grid gap-3 lg:grid-cols-3">
        {(doctorSummary.doctorVisitSections || []).map((section) => (
          <div key={section.id} className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-sm font-black text-slate-950">{section.title}</p>
            <div className="mt-2 space-y-1">
              {section.lines.map((line) => <p key={line} className="break-words text-sm font-bold text-slate-600">{line}</p>)}
            </div>
            <div className="mt-2">
              <Badge tone="green">{section.safetyLabel}</Badge>
            </div>
          </div>
        ))}
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

function NotificationDecisionPreview({ decision }) {
  const tone = !decision.enabled
    ? "slate"
    : decision.quietHoursHold
      ? "amber"
      : decision.shouldNotify
        ? "green"
        : "slate";
  const status = !decision.enabled
    ? "Off"
    : decision.quietHoursHold
      ? "Quiet hours"
      : decision.shouldNotify
        ? "Ready"
        : "Quiet";

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-black text-slate-950">{decision.label}</p>
        <Badge tone={tone}>{status}</Badge>
      </div>
      <p className="mt-1 text-sm font-bold text-slate-600">{decision.inAppCopy}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <Badge tone={decision.lockScreenCopySafe ? "green" : "red"}>Safe lock-screen copy</Badge>
        <Badge tone="slate">{decision.lockScreenCopy}</Badge>
        <Badge tone={decision.localDeliveryReady ? "green" : decision.localDeliveryCandidate ? "amber" : "slate"}>{decision.localDeliveryStatusLabel}</Badge>
        <Badge tone={decision.providerSendQueued ? "red" : "green"}>{decision.providerSendQueued ? "Send queued" : "No live send"}</Badge>
      </div>
    </div>
  );
}

function LocalDeliveryNoticePreview({ decision }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-black text-slate-950">{decision.label}</p>
        <Badge tone={decision.localDeliveryReady ? "green" : "amber"}>{decision.localDeliveryStatusLabel}</Badge>
      </div>
      <p className="mt-1 text-sm font-bold text-slate-600">{decision.lockScreenCopy}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <Badge tone="green">House screen only</Badge>
        <Badge tone="green">Generic copy</Badge>
        <Badge tone="green">No provider payload</Badge>
      </div>
    </div>
  );
}

function SettingsView({ notificationPreferences, setNotificationPreferences, notificationState, externalNotificationApproval }) {
  function updatePreference(key, value) {
    setNotificationPreferences((current) => normalizeApexFamilyCareNotificationPreferences({
      ...current,
      [key]: value,
    }));
  }

  const localDeliveryDecisions = notificationState.decisions.filter((decision) => decision.localDeliveryCandidate || decision.localDeliveryReady);

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <SectionHeader title="Notifications / Settings" description="Local house-screen notices only. External sends still require approval." />
        <div className="mb-3 flex flex-wrap gap-2">
          <Badge tone="green">No live sends</Badge>
          <Badge tone="green">Safe lock-screen copy</Badge>
          <Badge tone="green">Local house device</Badge>
          <Badge tone="amber">External sends approval</Badge>
          <Badge tone="green">No provider payloads</Badge>
        </div>
        <div className="grid gap-3 xl:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-sm font-black text-slate-950">Notification types</p>
            <div className="mt-3 grid gap-2">
              <ToggleRow label="Family digest decisions" checked={notificationPreferences.familyDigestEnabled} onChange={(value) => updatePreference("familyDigestEnabled", value)} />
              <ToggleRow label="Concern-marked decisions" checked={notificationPreferences.concernNotificationsEnabled} onChange={(value) => updatePreference("concernNotificationsEnabled", value)} />
              <ToggleRow label="Missing-update decisions" checked={notificationPreferences.missingUpdateNotificationsEnabled} onChange={(value) => updatePreference("missingUpdateNotificationsEnabled", value)} />
              <ToggleRow label="Doctor summary decisions" checked={notificationPreferences.doctorSummaryNotificationsEnabled} onChange={(value) => updatePreference("doctorSummaryNotificationsEnabled", value)} />
              <ToggleRow label="Repeated-pattern decisions" checked={notificationPreferences.repeatedPatternNotificationsEnabled} onChange={(value) => updatePreference("repeatedPatternNotificationsEnabled", value)} />
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-sm font-black text-slate-950">Low-noise guard</p>
            <div className="mt-3 grid gap-2">
              <ToggleRow label="Quiet hours" checked={notificationPreferences.quietHoursEnabled} onChange={(value) => updatePreference("quietHoursEnabled", value)} />
              <ToggleRow label="Low-noise mode" checked={notificationPreferences.lowNoiseMode} onChange={(value) => updatePreference("lowNoiseMode", value)} />
              <div className="grid gap-2 sm:grid-cols-2">
                <InputField label="Quiet start" type="time" value={notificationPreferences.quietHoursStart} onChange={(event) => updatePreference("quietHoursStart", event.target.value)} />
                <InputField label="Quiet end" type="time" value={notificationPreferences.quietHoursEnd} onChange={(event) => updatePreference("quietHoursEnd", event.target.value)} />
              </div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <p className="text-sm font-black text-emerald-950">Live delivery</p>
                <p className="mt-1 text-sm font-bold text-emerald-800">
                  {APEX_FAMILY_CARE_NOTIFICATION_POLICY.liveDeliveryEnabled ? "Enabled" : "External sends off."}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-sm font-black text-slate-950">Delivery lane</p>
            <div className="mt-3 grid gap-2">
              <SelectField label="Method" value={notificationPreferences.deliveryMethod} onChange={(event) => updatePreference("deliveryMethod", event.target.value)}>
                {APEX_FAMILY_CARE_NOTIFICATION_DELIVERY_METHODS.map((method) => (
                  <option key={method.id} value={method.id}>{method.label}{method.requiresProviderApproval ? " - approval" : ""}</option>
                ))}
              </SelectField>
              <ToggleRow label="House device notices" checked={notificationPreferences.localHouseDeviceDeliveryEnabled} onChange={(value) => updatePreference("localHouseDeviceDeliveryEnabled", value)} />
              <ToggleRow label="Trust this house screen" checked={notificationPreferences.houseDeviceTrusted} onChange={(value) => updatePreference("houseDeviceTrusted", value)} />
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="text-sm font-black text-amber-950">External sends</p>
                <p className="mt-1 text-sm font-bold text-amber-800">
                  {APEX_FAMILY_CARE_NOTIFICATION_DELIVERY_POLICY.externalSendApprovalRequired ? "Approval required before SMS, email, push, or provider setup." : "Not locked"}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-sm font-black text-slate-950">Family recipients</p>
            <div className="mt-3 grid gap-2">
              <ToggleRow label="Dad" checked={notificationPreferences.recipientDadEnabled} onChange={(value) => updatePreference("recipientDadEnabled", value)} />
              <ToggleRow label="Brother" checked={notificationPreferences.recipientBrotherEnabled} onChange={(value) => updatePreference("recipientBrotherEnabled", value)} />
              <ToggleRow label="John" checked={notificationPreferences.recipientJohnEnabled} onChange={(value) => updatePreference("recipientJohnEnabled", value)} />
              <ToggleRow label="Family group" checked={notificationPreferences.recipientFamilyEnabled} onChange={(value) => updatePreference("recipientFamilyEnabled", value)} />
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                <p className="text-sm font-black text-blue-950">Recipient controls</p>
                <p className="mt-1 text-sm font-bold text-blue-800">Local intent only until real family access is approved.</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <SectionHeader title="External Delivery Approval" description={externalNotificationApproval.nextApprovalNeeded} />
        <div className="mb-3 flex flex-wrap gap-2">
          <Badge tone="amber">Approval required</Badge>
          <Badge tone="green">No provider payload</Badge>
          <Badge tone="green">No live sends</Badge>
          <Badge tone="green">No raw note text</Badge>
        </div>
        <div className="mb-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Selected" value={externalNotificationApproval.selectedChannelLabel} detail="External channel preview" />
          <StatCard title="Approved" value={externalNotificationApproval.approvedChannelLabel} detail={externalNotificationApproval.approvalStatus} />
          <StatCard title="Provider Payload" value={externalNotificationApproval.providerPayloadCreated ? "Created" : "Off"} detail="Blocked in Phase 5B" />
          <StatCard title="Live Sends" value={externalNotificationApproval.liveDeliveryEnabled ? "On" : "Off"} detail="Phase 5C only after approval" />
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          {externalNotificationApproval.checks.map((check) => (
            <div key={check.id} className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-black text-slate-950">{check.label}</p>
                <Badge tone={check.passed ? "green" : "amber"}>{check.passed ? "Ready" : "Needed"}</Badge>
              </div>
              <p className="mt-1 text-sm font-bold text-slate-600">{check.detail}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4">
        <SectionHeader title="Notification Decisions" description="Apex decides what matters and keeps lock-screen text generic." />
        <div className="mb-3 grid gap-2 md:grid-cols-3 xl:grid-cols-5">
          <StatCard title="Ready" value={notificationState.summary.activeDecisionCount} detail="Decision previews" />
          <StatCard title="Quiet Hold" value={notificationState.summary.heldForQuietHoursCount} detail="Low-noise guard" />
          <StatCard title="House Notices" value={notificationState.summary.readyLocalNoticeCount} detail={notificationState.summary.localDeliveryStatusLabel} />
          <StatCard title="Recipients" value={notificationState.summary.recipientCount} detail="Selected locally" />
          <StatCard title="Provider Sends" value={notificationState.summary.providerSendQueuedCount} detail="Approval locked" />
        </div>
        <div className="space-y-2">
          {notificationState.decisions.map((decision) => <NotificationDecisionPreview key={decision.id} decision={decision} />)}
        </div>
      </Card>

      <Card className="p-4">
        <SectionHeader title="Local House Notices" description={notificationState.delivery.statusLabel} />
        <div className="mb-3 flex flex-wrap gap-2">
          <Badge tone={notificationState.delivery.houseDeviceTrusted ? "green" : "amber"}>{notificationState.delivery.houseDeviceTrusted ? "House screen trusted" : "Trust required"}</Badge>
          <Badge tone={notificationState.delivery.houseDeviceReady ? "green" : "amber"}>{notificationState.delivery.houseDeviceReady ? "House screen ready" : "House screen not ready"}</Badge>
          <Badge tone={notificationState.delivery.providerSendsEnabled ? "red" : "green"}>{notificationState.delivery.providerSendsEnabled ? "Provider on" : "Provider off"}</Badge>
          <Badge tone="green">No payload storage</Badge>
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          {localDeliveryDecisions.length ? localDeliveryDecisions.map((decision) => (
            <LocalDeliveryNoticePreview key={decision.id} decision={decision} />
          )) : (
            <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm font-bold text-slate-600">No local house notices need attention right now.</div>
          )}
        </div>
      </Card>
    </div>
  );
}

function formatFrictionCategory(category) {
  return String(category || "other").split("-").map((part) => part.slice(0, 1).toUpperCase() + part.slice(1)).join(" ");
}

function TestWeekView({
  testWeekSummary,
  testWeekRunPacket,
  testWeekDraft,
  setTestWeekDraft,
  onStartTestWeek,
  onCompleteTestWeek,
  onAddFrictionNote,
  onUpdateTestWeekMetric,
}) {
  const state = testWeekSummary.state;
  const statusTone = testWeekSummary.evidenceReady ? "amber" : state.realWeekStarted ? "blue" : "slate";
  const dailyCheckInsEnabled = state.houseScreenReady && state.realWeekStarted;

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <SectionHeader
          title="Family Test Week"
          description="Collect the real family evidence before Phase 7 can close."
          action={<Badge tone={statusTone}>{testWeekSummary.phaseClosureStatus}</Badge>}
        />
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-6">
          <StatCard title="Status" value={state.status} detail={state.realWeekStarted ? "Real week started" : "Ready to start"} />
          <StatCard title="House Screen" value={state.houseScreenReady ? "Ready" : "Not Ready"} detail="Kitchen/house device" />
          <StatCard title="Tracked Days" value={testWeekSummary.trackedDays} detail="Needs 7 real days" />
          <StatCard title="Used Days" value={`${testWeekSummary.dailyCheckInCount}/7`} detail="Real use marks" />
          <StatCard title="Checks Passing" value={`${testWeekSummary.passedCount}/7`} detail="Success test" />
          <StatCard title="Friction Notes" value={state.frictionNotes.length} detail={`${testWeekSummary.simplifyCount} simplify / ${testWeekSummary.freezeCount} freeze`} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" onClick={onStartTestWeek} disabled={state.realWeekStarted}>
            <Icon name="check" /> Start Real Week
          </Button>
          <Button type="button" variant="secondary" onClick={onCompleteTestWeek} disabled={!state.realWeekStarted || state.realWeekCompleted}>
            <Icon name="calendar" /> Mark Week Complete
          </Button>
          <Button type="button" variant="secondary" onClick={() => onUpdateTestWeekMetric("houseScreenReady", true)} disabled={state.houseScreenReady}>
            <Icon name="check" /> Mark House Screen Ready
          </Button>
          <Badge tone="green">No auto-close</Badge>
          <Badge tone="green">Human review required</Badge>
        </div>
      </Card>

      <Card className="p-4">
        <SectionHeader
          title="Run The Week"
          description={testWeekRunPacket.nextHumanAction}
          action={<Badge tone={testWeekRunPacket.progressPercent >= 100 ? "green" : "blue"}>{testWeekRunPacket.progressPercent}%</Badge>}
        />
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {testWeekRunPacket.guideSteps.map((step) => (
            <div key={step.id} className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="flex min-w-0 items-center justify-between gap-3">
                <p className="min-w-0 break-words text-sm font-black text-slate-950">{step.label}</p>
                <Badge tone={step.done ? "green" : "slate"}>{step.done ? "Done" : "Next"}</Badge>
              </div>
              <p className="mt-1 break-words text-xs font-bold text-slate-600">{step.shortAction}</p>
              <p className="mt-1 break-words text-xs font-bold text-slate-500">{step.successSignal}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4">
        <SectionHeader
          title="Daily Check-Ins"
          description={dailyCheckInsEnabled ? "Tap a day only after Family Care was actually used for the real test week." : "Mark the house screen ready and start the real week before checking off days."}
          action={<Badge tone={testWeekSummary.fullWeekUsageEvidence ? "green" : "slate"}>{testWeekSummary.dailyCheckInCount}/7</Badge>}
        />
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {state.dailyCheckIns.map((checked, index) => (
            <Button
              key={`test-week-day-${index + 1}`}
              type="button"
              variant={checked ? "primary" : "secondary"}
              disabled={!dailyCheckInsEnabled}
              className="min-h-11"
              onClick={() => {
                const nextDailyCheckIns = state.dailyCheckIns.map((current, currentIndex) => (currentIndex === index ? !current : current));
                onUpdateTestWeekMetric("dailyCheckIns", nextDailyCheckIns);
              }}
            >
              <Icon name={checked ? "check" : "calendar"} /> Day {index + 1}
            </Button>
          ))}
        </div>
      </Card>

      <Card className="p-4">
        <SectionHeader title="Before / After Measures" description="Use rough family counts and 0-5 ratings after the real week." />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <InputField label="Status texts before / day" type="number" min="0" value={state.baselineStatusTextsPerDay} onChange={(event) => onUpdateTestWeekMetric("baselineStatusTextsPerDay", event.target.value)} />
          <InputField label="Status texts after / day" type="number" min="0" value={state.afterStatusTextsPerDay} onChange={(event) => onUpdateTestWeekMetric("afterStatusTextsPerDay", event.target.value)} />
          <InputField label="Doctor prep before" type="number" min="0" max="5" value={state.doctorPrepBeforeRating} onChange={(event) => onUpdateTestWeekMetric("doctorPrepBeforeRating", event.target.value)} />
          <InputField label="Doctor prep after" type="number" min="0" max="5" value={state.doctorPrepAfterRating} onChange={(event) => onUpdateTestWeekMetric("doctorPrepAfterRating", event.target.value)} />
          <InputField label="Family informed before" type="number" min="0" max="5" value={state.familyInformedBeforeRating} onChange={(event) => onUpdateTestWeekMetric("familyInformedBeforeRating", event.target.value)} />
          <InputField label="Family informed after" type="number" min="0" max="5" value={state.familyInformedAfterRating} onChange={(event) => onUpdateTestWeekMetric("familyInformedAfterRating", event.target.value)} />
          <InputField label="Dad burden before" type="number" min="0" max="5" value={state.dadExplanationBurdenBeforeRating} onChange={(event) => onUpdateTestWeekMetric("dadExplanationBurdenBeforeRating", event.target.value)} />
          <InputField label="Dad burden after" type="number" min="0" max="5" value={state.dadExplanationBurdenAfterRating} onChange={(event) => onUpdateTestWeekMetric("dadExplanationBurdenAfterRating", event.target.value)} />
          <InputField label="Grandma dignity" type="number" min="0" max="5" value={state.grandmaDignityRating} onChange={(event) => onUpdateTestWeekMetric("grandmaDignityRating", event.target.value)} />
          <SelectField label="Updates under 10 sec" value={state.updatesUnder10Seconds} onChange={(event) => onUpdateTestWeekMetric("updatesUnder10Seconds", event.target.value)}>
            <option value="unknown">Unknown</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </SelectField>
        </div>
      </Card>

      <Card className="p-4">
        <SectionHeader title="Success Checks" description={testWeekSummary.recommendedNextStep} />
        <div className="grid gap-2 md:grid-cols-2">
          {testWeekSummary.successChecks.map((check) => (
            <div key={check.id} className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3">
              <span className="min-w-0 break-words text-sm font-black text-slate-700">{check.label}</span>
              <Badge tone={check.passed ? "green" : "slate"}>{check.passed ? "Yes" : "Wait"}</Badge>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4">
        <SectionHeader
          title="Review Packet"
          description="Use these prompts after the real week, then simplify what felt like extra work."
          action={<Badge tone={testWeekSummary.evidenceReady ? "amber" : "slate"}>{testWeekSummary.evidenceReady ? "Ready" : "Waiting"}</Badge>}
        />
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {testWeekRunPacket.reviewPrompts.map((prompt) => (
            <div key={prompt.id} className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="flex min-w-0 items-center justify-between gap-3">
                <p className="min-w-0 break-words text-sm font-black text-slate-950">{prompt.label}</p>
                <Badge tone={prompt.ready ? "green" : "slate"}>{prompt.ready ? "Ready" : "Need"}</Badge>
              </div>
              <p className="mt-1 break-words text-xs font-bold text-slate-600">{prompt.metric}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4">
        <SectionHeader title="Friction And Useful Notes" description="Capture what to remove, simplify, or freeze after the real week." />
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className="space-y-3">
            <TextAreaField
              label="Family note"
              value={testWeekDraft.text}
              onChange={(event) => setTestWeekDraft((current) => ({ ...current, text: event.target.value }))}
              placeholder="Example: Dad still had to explain dinner updates twice."
            />
            <TextAreaField
              label="What should change"
              value={testWeekDraft.suggestion}
              onChange={(event) => setTestWeekDraft((current) => ({ ...current, suggestion: event.target.value }))}
              placeholder="Example: Make dinner/meds easier to scan."
            />
          </div>
          <div className="space-y-3">
            <SelectField label="Reporter" value={testWeekDraft.reporter} onChange={(event) => setTestWeekDraft((current) => ({ ...current, reporter: event.target.value }))}>
              {[...APEX_FAMILY_CARE_REPORTERS, "John"].map((reporter) => <option key={reporter} value={reporter}>{reporter}</option>)}
            </SelectField>
            <SelectField label="Category" value={testWeekDraft.category} onChange={(event) => setTestWeekDraft((current) => ({ ...current, category: event.target.value }))}>
              {APEX_FAMILY_CARE_TEST_WEEK_FRICTION_CATEGORIES.map((category) => <option key={category} value={category}>{formatFrictionCategory(category)}</option>)}
            </SelectField>
            <ToggleRow label="Felt like extra work" checked={testWeekDraft.extraWork} onChange={(value) => setTestWeekDraft((current) => ({ ...current, extraWork: value }))} />
            <ToggleRow label="Freeze this part" checked={testWeekDraft.shouldFreeze} onChange={(value) => setTestWeekDraft((current) => ({ ...current, shouldFreeze: value }))} />
            <Button type="button" onClick={onAddFrictionNote} disabled={!testWeekDraft.text.trim()}>
              <Icon name="plus" /> Add Test Note
            </Button>
          </div>
        </div>
        <div className="mt-3 space-y-2">
          {state.frictionNotes.length ? state.frictionNotes.slice(0, 5).map((note) => (
            <div key={note.id} className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={note.shouldSimplify ? "amber" : note.shouldFreeze ? "green" : "slate"}>{formatFrictionCategory(note.category)}</Badge>
                <Badge tone="slate">{note.reporter}</Badge>
                {note.shouldSimplify ? <Badge tone="amber">Simplify</Badge> : null}
                {note.shouldFreeze ? <Badge tone="green">Freeze</Badge> : null}
              </div>
              <p className="mt-2 break-words text-sm font-black text-slate-950">{note.text}</p>
              {note.suggestion ? <p className="mt-1 break-words text-xs font-bold text-slate-500">{note.suggestion}</p> : null}
            </div>
          )) : (
            <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm font-bold text-slate-600">No real family test notes yet.</div>
          )}
        </div>
      </Card>
    </div>
  );
}

function AccessView({ accessReadiness, boundaryReleasePrep, releaseSmokeChecklist, gate, standalone = false }) {
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <SectionHeader title="Family Access" description="Family-only access first; real invites, trusted devices, or remote access require approval later." />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Family App" value={standalone ? "Direct" : "Legacy"} detail={standalone ? "Opens without Apex HQ navigation." : "Temporary legacy app-shell view."} />
          <StatCard title="Access Mode" value={accessReadiness.accessMode} detail={accessReadiness.localReady ? "Ready for local-only use." : "Needs local access setup."} />
          <StatCard title="Remote Access" value={accessReadiness.remoteReady ? "Ready" : "Approval"} detail="Family rollout method comes later." />
          <StatCard title="Outside Access" value={gate.publicAccess ? "Open" : "Closed"} detail="No customer or field exposure." />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge tone="green">No auth change</Badge>
          <Badge tone="green">No schema change</Badge>
          <Badge tone="green">No Apex HQ nav</Badge>
          <Badge tone="green">No sends</Badge>
        </div>
      </Card>

      <Card className="p-4">
        <SectionHeader
          title="Standalone Release Boundary"
          description={boundaryReleasePrep.nextApprovalNeeded}
          action={<Badge tone={boundaryReleasePrep.productionBlocked ? "green" : "amber"}>{boundaryReleasePrep.productionBlocked ? "Production blocked" : "Private release"}</Badge>}
        />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Local Preview" value={boundaryReleasePrep.localPreviewReady ? "Ready" : "Check"} detail="John can test the standalone PWA locally." />
          <StatCard title="Production" value={boundaryReleasePrep.productionBlocked ? "Blocked" : "Approved"} detail="No public family release without approval." />
          <StatCard title="Family Access" value={boundaryReleasePrep.familyAccessModelApproved ? "Approved" : "Needed"} detail="Family code, invite, LAN, or remote path comes later." />
          <StatCard title="Apex HQ Drift" value="Blocked" detail="No contractor/customer/field navigation." />
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {boundaryReleasePrep.checks.map((check) => (
            <div key={check.id} className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="flex min-w-0 items-center justify-between gap-3">
                <p className="min-w-0 break-words text-sm font-black text-slate-950">{check.label}</p>
                <Badge tone={check.ready ? "green" : "amber"}>{check.status}</Badge>
              </div>
              <p className="mt-1 break-words text-xs font-bold text-slate-600">{check.detail}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge tone="green">No deploy</Badge>
          <Badge tone="green">No hosting change</Badge>
          <Badge tone="green">No auth change</Badge>
          <Badge tone="green">No provider setup</Badge>
        </div>
      </Card>

      <Card className="p-4">
        <SectionHeader
          title="Local Release Smoke"
          description={releaseSmokeChecklist.nextApprovalNeeded}
          action={<Badge tone={releaseSmokeChecklist.readyToRunLocalSmoke ? "green" : "amber"}>{releaseSmokeChecklist.readyToRunLocalSmoke ? "Ready locally" : "Check first"}</Badge>}
        />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Run Type" value="Human-run" detail="John/family runs these checks visibly." />
          <StatCard title="Preview" value={releaseSmokeChecklist.readyToRunLocalSmoke ? "Ready" : "Check"} detail="Local/house-device smoke only." />
          <StatCard title="Access Model" value={releaseSmokeChecklist.familyAccessModelApproved ? "Approved" : "Needed"} detail="No real rollout before this is chosen." />
          <StatCard title="Production" value={releaseSmokeChecklist.productionBlocked ? "Blocked" : "Stop"} detail="No release posture change in this slice." />
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {releaseSmokeChecklist.smokeSteps.map((step) => (
            <div key={step.id} className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="flex min-w-0 items-center justify-between gap-3">
                <p className="min-w-0 break-words text-sm font-black text-slate-950">{step.label}</p>
                <Badge tone={step.ready ? "green" : "amber"}>{step.status}</Badge>
              </div>
              <p className="mt-1 break-words text-xs font-bold text-slate-600">{step.detail}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {releaseSmokeChecklist.localRunInstructions.map((step, index) => (
            <div key={step} className="flex min-w-0 gap-3 rounded-lg border border-slate-200 bg-white p-3">
              <Badge tone="blue">{index + 1}</Badge>
              <p className="min-w-0 break-words text-sm font-black text-slate-700">{step}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge tone="green">Local only</Badge>
          <Badge tone="green">No auth change</Badge>
          <Badge tone="green">No deploy</Badge>
          <Badge tone="green">No sends</Badge>
        </div>
      </Card>

      <Card className="p-4">
        <SectionHeader title="Install Path" description={accessReadiness.nextApprovalNeeded} />
        <div className="grid gap-2 md:grid-cols-2">
          {accessReadiness.installSteps.map((step, index) => (
            <div key={step} className="flex min-w-0 gap-3 rounded-lg border border-slate-200 bg-white p-3">
              <Badge tone="blue">{index + 1}</Badge>
              <p className="min-w-0 break-words text-sm font-black text-slate-700">{step}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4">
        <SectionHeader title="Boundary Checks" description="Phase 1A keeps the family app separate while access decisions stay explicit." />
        <div className="grid gap-2 md:grid-cols-2">
          {accessReadiness.checks.map((check) => (
            <div key={check.id} className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="flex min-w-0 items-center justify-between gap-3">
                <p className="min-w-0 break-words text-sm font-black text-slate-950">{check.label}</p>
                <Badge tone={check.ready ? "green" : "amber"}>{check.status}</Badge>
              </div>
              <p className="mt-1 break-words text-xs font-bold text-slate-600">{check.detail}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function promptReviewTone(status) {
  if (status === "handled") return "green";
  if (status === "deferred") return "amber";
  if (status === "not-useful") return "slate";
  return "blue";
}

function promptReviewLabel(status) {
  if (status === "not-useful") return "Not useful";
  return status;
}

function HealthView({ accessReadiness, boundaryReleasePrep, releaseSmokeChecklist, localSttBridgeApproval, gate, summary, latestVoiceReceipt, notificationState, externalNotificationApproval, kitchenStatus, householdPresence, householdDeviceBridgeApproval, testWeekSummary, coordinatorPacket, coordinatorReviewPacket, onCoordinatorPromptReview }) {
  const brainInterface = getApexFamilyCareBrainInterfaceSummary();
  const coordinatorSummary = coordinatorPacket?.summary || {};
  const coordinatorPrompts = coordinatorReviewPacket?.reviewedPrompts || coordinatorPacket?.prompts || [];
  const coordinatorReviewSummary = coordinatorReviewPacket?.summary || {};
  const coordinatorFriction = coordinatorReviewPacket?.friction || {};
  const digestReview = coordinatorReviewPacket?.digestReview || {};
  const coordinatorStats = [
    ["Daily review", coordinatorPacket?.dailyReviewItems?.length ?? 0, "green"],
    ["Open concerns", coordinatorSummary.openConcernCount ?? 0, coordinatorSummary.openConcernCount ? "amber" : "green"],
    ["Doctor prep", coordinatorSummary.doctorPrepPromptCount ?? 0, coordinatorSummary.doctorPrepPromptCount ? "amber" : "green"],
    ["Medication review", coordinatorSummary.medicationReviewCount ?? 0, coordinatorSummary.medicationReviewCount ? "amber" : "green"],
    ["Open prompts", coordinatorReviewSummary.openPromptCount ?? coordinatorPrompts.length, coordinatorReviewSummary.openPromptCount ? "amber" : "green"],
    ["Handled", coordinatorReviewSummary.handledPromptCount ?? 0, "green"],
    ["Deferred", coordinatorReviewSummary.deferredPromptCount ?? 0, coordinatorReviewSummary.deferredPromptCount ? "amber" : "slate"],
    ["Not useful", coordinatorReviewSummary.notUsefulPromptCount ?? 0, coordinatorReviewSummary.notUsefulPromptCount ? "amber" : "slate"],
  ];
  const healthItems = [
    ["Public access", gate.publicAccess ? "Open" : "Closed", gate.publicAccess ? "red" : "green"],
    ["Customer access", gate.customerAccess ? "Open" : "Closed", gate.customerAccess ? "red" : "green"],
    ["Field access", gate.fieldAccess ? "Open" : "Closed", gate.fieldAccess ? "red" : "green"],
    ["Raw audio stored", gate.rawAudioStored ? "Yes" : "No", gate.rawAudioStored ? "red" : "green"],
    ["Raw transcript stored", gate.rawTranscriptStored ? "Yes" : "No", gate.rawTranscriptStored ? "red" : "green"],
    ["Medical diagnosis", gate.medicalDiagnosis ? "Yes" : "No", gate.medicalDiagnosis ? "red" : "green"],
    ["Emergency replacement", gate.emergencyReplacement ? "Yes" : "No", gate.emergencyReplacement ? "red" : "green"],
    ["Family access mode", accessReadiness?.accessMode || "local-only", accessReadiness?.localReady ? "green" : "amber"],
    ["Remote access", accessReadiness?.remoteReady ? "Ready" : "Approval", accessReadiness?.remoteReady ? "green" : "amber"],
    ["Local family preview", boundaryReleasePrep?.localPreviewReady ? "Ready" : "Check", boundaryReleasePrep?.localPreviewReady ? "green" : "amber"],
    ["Production family route", boundaryReleasePrep?.productionBlocked ? "Blocked" : "Approved", boundaryReleasePrep?.productionBlocked ? "green" : "amber"],
    ["Family release approval", boundaryReleasePrep?.privateReleaseApproved ? "Approved" : "Needed", boundaryReleasePrep?.privateReleaseApproved ? "amber" : "green"],
    ["Release smoke", releaseSmokeChecklist?.readyToRunLocalSmoke ? "Ready" : "Check", releaseSmokeChecklist?.readyToRunLocalSmoke ? "green" : "amber"],
    ["Release smoke sends", releaseSmokeChecklist?.policy?.smsSent || releaseSmokeChecklist?.policy?.emailSent || releaseSmokeChecklist?.policy?.pushSent ? "On" : "Off", releaseSmokeChecklist?.policy?.smsSent || releaseSmokeChecklist?.policy?.emailSent || releaseSmokeChecklist?.policy?.pushSent ? "red" : "green"],
    ["Release smoke auth", releaseSmokeChecklist?.policy?.authSessionChanged ? "Changed" : "No change", releaseSmokeChecklist?.policy?.authSessionChanged ? "red" : "green"],
    ["Auth/session change", accessReadiness?.policy?.authSessionChanged ? "Yes" : "No", accessReadiness?.policy?.authSessionChanged ? "red" : "green"],
    ["Schema change", accessReadiness?.policy?.schemaChanged ? "Yes" : "No", accessReadiness?.policy?.schemaChanged ? "red" : "green"],
    ["Missing update detector", summary?.missingUpdate ? "On" : "Off", summary?.missingUpdate ? "green" : "amber"],
    ["Pattern detector", summary?.repeatedConcernPatterns ? "On" : "Off", summary?.repeatedConcernPatterns ? "green" : "amber"],
    ["Apex care brain", brainInterface.status === "ready" ? "Ready" : "Off", brainInterface.status === "ready" ? "green" : "amber"],
    ["Care coordinator", coordinatorPrompts.length ? `${coordinatorPrompts.length} prompts` : "Quiet", coordinatorPrompts.length ? "amber" : "green"],
    ["Coordinator review", brainInterface.humanReviewRequired ? "Human" : "Auto", brainInterface.humanReviewRequired ? "green" : "red"],
    ["Coordinator sends", brainInterface.autoSend ? "On" : "Off", brainInterface.autoSend ? "red" : "green"],
    ["Coordinator digest", coordinatorReviewSummary.digestDraftReady ? "Draft" : "Check", coordinatorReviewSummary.digestDraftReady ? "green" : "amber"],
    ["Coordinator command path", APEX_FAMILY_CARE_COORDINATOR_REVIEW_POLICY.operatorCommandPathEnabled ? "On" : "Deferred", APEX_FAMILY_CARE_COORDINATOR_REVIEW_POLICY.operatorCommandPathEnabled ? "amber" : "green"],
    ["Coordinator provider payload", APEX_FAMILY_CARE_COORDINATOR_REVIEW_POLICY.providerPayloadCreated ? "Created" : "None", APEX_FAMILY_CARE_COORDINATOR_REVIEW_POLICY.providerPayloadCreated ? "red" : "green"],
    ["Coordinator friction text", APEX_FAMILY_CARE_COORDINATOR_REVIEW_POLICY.storesRawFrictionText ? "Stored" : "No raw text", APEX_FAMILY_CARE_COORDINATOR_REVIEW_POLICY.storesRawFrictionText ? "red" : "green"],
    ["Medication control", brainInterface.medicationControl ? "On" : "Off", brainInterface.medicationControl ? "red" : "green"],
    ["Voice explicit start", APEX_FAMILY_CARE_VOICE_POLICY.explicitUserStartedRequired ? "Required" : "Off", APEX_FAMILY_CARE_VOICE_POLICY.explicitUserStartedRequired ? "green" : "red"],
    ["Voice hidden recording", APEX_FAMILY_CARE_VOICE_POLICY.hiddenRecording ? "On" : "Off", APEX_FAMILY_CARE_VOICE_POLICY.hiddenRecording ? "red" : "green"],
    ["Voice follow-up limit", APEX_FAMILY_CARE_VOICE_POLICY.maxFollowUps, "green"],
    ["Family local STT", APEX_FAMILY_CARE_LOCAL_VOICE_INPUT_POLICY.localSttEndpointEnabled ? "Ready" : "Approval", APEX_FAMILY_CARE_LOCAL_VOICE_INPUT_POLICY.localSttEndpointEnabled ? "green" : "amber"],
    ["Family STT bridge approval", localSttBridgeApproval?.approvalStatus || "approval-required", localSttBridgeApproval?.readyForEndpointWork ? "green" : "amber"],
    ["Family STT endpoint", APEX_FAMILY_CARE_LOCAL_STT_BRIDGE_APPROVAL_POLICY.endpointEnabled ? "Enabled" : "Off", APEX_FAMILY_CARE_LOCAL_STT_BRIDGE_APPROVAL_POLICY.endpointEnabled ? "red" : "green"],
    ["Family STT raw audio", APEX_FAMILY_CARE_LOCAL_STT_BRIDGE_APPROVAL_POLICY.rawAudioStored || APEX_FAMILY_CARE_LOCAL_STT_BRIDGE_APPROVAL_POLICY.rawAudioUploaded ? "On" : "Off", APEX_FAMILY_CARE_LOCAL_STT_BRIDGE_APPROVAL_POLICY.rawAudioStored || APEX_FAMILY_CARE_LOCAL_STT_BRIDGE_APPROVAL_POLICY.rawAudioUploaded ? "red" : "green"],
    ["Family voice auto-listen", APEX_FAMILY_CARE_LOCAL_VOICE_INPUT_POLICY.autoListening ? "On" : "Off", APEX_FAMILY_CARE_LOCAL_VOICE_INPUT_POLICY.autoListening ? "red" : "green"],
    ["Family voice controls", APEX_FAMILY_CARE_LOCAL_VOICE_INPUT_POLICY.visibleStopRequired && APEX_FAMILY_CARE_LOCAL_VOICE_INPUT_POLICY.visibleMuteRequired && APEX_FAMILY_CARE_LOCAL_VOICE_INPUT_POLICY.visibleRecoverRequired ? "Visible" : "Check", APEX_FAMILY_CARE_LOCAL_VOICE_INPUT_POLICY.visibleStopRequired && APEX_FAMILY_CARE_LOCAL_VOICE_INPUT_POLICY.visibleMuteRequired && APEX_FAMILY_CARE_LOCAL_VOICE_INPUT_POLICY.visibleRecoverRequired ? "green" : "red"],
    ["Latest voice receipt", latestVoiceReceipt ? latestVoiceReceipt.metadata.category : "None", latestVoiceReceipt ? "blue" : "slate"],
    ["Notification decisions", notificationState?.summary?.activeDecisionCount ?? 0, "green"],
    ["Notification local delivery", notificationState?.summary?.readyLocalNoticeCount ?? 0, notificationState?.summary?.readyLocalNoticeCount ? "green" : "slate"],
    ["House screen trusted", notificationState?.summary?.houseDeviceTrusted ? "Yes" : "No", notificationState?.summary?.houseDeviceTrusted ? "green" : "amber"],
    ["External send approval", APEX_FAMILY_CARE_NOTIFICATION_DELIVERY_POLICY.externalSendApprovalRequired ? "Required" : "Off", APEX_FAMILY_CARE_NOTIFICATION_DELIVERY_POLICY.externalSendApprovalRequired ? "green" : "red"],
    ["External delivery approval", externalNotificationApproval?.approvalStatus || "approval-required", externalNotificationApproval?.readyForProviderSetup ? "green" : "amber"],
    ["External channel", externalNotificationApproval?.approvedChannelLabel || "Not chosen", externalNotificationApproval?.externalChannelApproved ? "green" : "amber"],
    ["External provider payload", externalNotificationApproval?.providerPayloadCreated || APEX_FAMILY_CARE_EXTERNAL_NOTIFICATION_APPROVAL_POLICY.providerPayloadCreated ? "Created" : "Off", externalNotificationApproval?.providerPayloadCreated || APEX_FAMILY_CARE_EXTERNAL_NOTIFICATION_APPROVAL_POLICY.providerPayloadCreated ? "red" : "green"],
    ["External live sends", externalNotificationApproval?.liveDeliveryEnabled || APEX_FAMILY_CARE_EXTERNAL_NOTIFICATION_APPROVAL_POLICY.liveDeliveryEnabled ? "On" : "Off", externalNotificationApproval?.liveDeliveryEnabled || APEX_FAMILY_CARE_EXTERNAL_NOTIFICATION_APPROVAL_POLICY.liveDeliveryEnabled ? "red" : "green"],
    ["Notification live sends", APEX_FAMILY_CARE_NOTIFICATION_POLICY.liveDeliveryEnabled ? "On" : "Off", APEX_FAMILY_CARE_NOTIFICATION_POLICY.liveDeliveryEnabled ? "red" : "green"],
    ["Notification provider sends", notificationState?.summary?.providerSendQueuedCount ?? 0, notificationState?.summary?.providerSendQueuedCount ? "red" : "green"],
    ["Lock-screen details", notificationState?.summary?.nextSafeLockScreenCopySafe ? "Safe" : "Check", notificationState?.summary?.nextSafeLockScreenCopySafe ? "green" : "red"],
    ["Kitchen mode", kitchenStatus?.health?.statusLabel || "Off", kitchenStatus?.health?.statusTone || "slate"],
    ["Kitchen first device", kitchenStatus?.device?.deviceTypeLabel || "House tablet PWA", "green"],
    ["Household presence", householdPresence?.presence?.statusLabel || "Off", householdPresence?.presence?.statusTone || "slate"],
    ["Household voice mode", householdPresence?.voice?.statusLabel || "Off", householdPresence?.voice?.statusTone || "slate"],
    ["Household stop/mute", householdPresence?.controls?.alwaysVisible ? "Visible" : "Check", householdPresence?.controls?.alwaysVisible ? "green" : "red"],
    ["Household bridge approval", householdDeviceBridgeApproval?.approvalStatus || "pwa-enough", householdDeviceBridgeApproval?.readyForBridgeWork ? "green" : "amber"],
    ["Household bridge active", householdDeviceBridgeApproval?.localDeviceBridgeActive || APEX_FAMILY_CARE_HOUSEHOLD_DEVICE_BRIDGE_APPROVAL_POLICY.localDeviceBridgeActive ? "On" : "Off", householdDeviceBridgeApproval?.localDeviceBridgeActive || APEX_FAMILY_CARE_HOUSEHOLD_DEVICE_BRIDGE_APPROVAL_POLICY.localDeviceBridgeActive ? "red" : "green"],
    ["Household bridge device control", householdDeviceBridgeApproval?.deviceOsControlEnabled || APEX_FAMILY_CARE_HOUSEHOLD_DEVICE_BRIDGE_APPROVAL_POLICY.deviceOsControlEnabled ? "On" : "Off", householdDeviceBridgeApproval?.deviceOsControlEnabled || APEX_FAMILY_CARE_HOUSEHOLD_DEVICE_BRIDGE_APPROVAL_POLICY.deviceOsControlEnabled ? "red" : "green"],
    ["Household bridge camera", householdDeviceBridgeApproval?.cameraSurveillanceEnabled || APEX_FAMILY_CARE_HOUSEHOLD_DEVICE_BRIDGE_APPROVAL_POLICY.cameraSurveillanceEnabled ? "On" : "Off", householdDeviceBridgeApproval?.cameraSurveillanceEnabled || APEX_FAMILY_CARE_HOUSEHOLD_DEVICE_BRIDGE_APPROVAL_POLICY.cameraSurveillanceEnabled ? "red" : "green"],
    ["Household bridge network scan", householdDeviceBridgeApproval?.networkScanningEnabled || APEX_FAMILY_CARE_HOUSEHOLD_DEVICE_BRIDGE_APPROVAL_POLICY.networkScanningEnabled ? "On" : "Off", householdDeviceBridgeApproval?.networkScanningEnabled || APEX_FAMILY_CARE_HOUSEHOLD_DEVICE_BRIDGE_APPROVAL_POLICY.networkScanningEnabled ? "red" : "green"],
    ["Kitchen hidden mic", APEX_FAMILY_CARE_KITCHEN_MODE_POLICY.hiddenRecording ? "On" : "Off", APEX_FAMILY_CARE_KITCHEN_MODE_POLICY.hiddenRecording ? "red" : "green"],
    ["Kitchen device control", APEX_FAMILY_CARE_KITCHEN_MODE_POLICY.deviceControlEnabled ? "On" : "Off", APEX_FAMILY_CARE_KITCHEN_MODE_POLICY.deviceControlEnabled ? "red" : "green"],
    ["Household camera", APEX_FAMILY_CARE_HOUSEHOLD_DEVICE_PRESENCE_POLICY.cameraSurveillanceEnabled ? "On" : "Off", APEX_FAMILY_CARE_HOUSEHOLD_DEVICE_PRESENCE_POLICY.cameraSurveillanceEnabled ? "red" : "green"],
    ["Household network scan", APEX_FAMILY_CARE_HOUSEHOLD_DEVICE_PRESENCE_POLICY.networkScanningEnabled ? "On" : "Off", APEX_FAMILY_CARE_HOUSEHOLD_DEVICE_PRESENCE_POLICY.networkScanningEnabled ? "red" : "green"],
    ["Test week status", testWeekSummary?.state?.status || "prep", testWeekSummary?.evidenceReady ? "amber" : "slate"],
    ["Test week evidence", testWeekSummary?.evidenceReady ? "Review" : "Missing", testWeekSummary?.evidenceReady ? "amber" : "slate"],
  ];

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <SectionHeader
          title="Apex Care Coordinator"
          description={coordinatorReviewSummary.nextHumanAction || coordinatorSummary.nextHumanAction || "No coordinator prompts need action right now."}
          action={<Badge tone={coordinatorPrompts.length ? "amber" : "green"}>{coordinatorPrompts.length ? `${coordinatorPrompts.length} prompts` : "Quiet"}</Badge>}
        />
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {coordinatorStats.map(([label, value, tone]) => (
            <div key={label} className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3">
              <span className="min-w-0 break-words text-sm font-black text-slate-700">{label}</span>
              <Badge tone={tone}>{value}</Badge>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge tone="green">Human review</Badge>
          <Badge tone="green">No sends</Badge>
          <Badge tone="green">No medication control</Badge>
          <Badge tone="green">Metadata-only receipt</Badge>
          <Badge tone="green">Draft only</Badge>
        </div>
        <div className="mt-3 grid gap-2">
          {coordinatorPrompts.length ? coordinatorPrompts.slice(0, 4).map((prompt) => (
            <div key={prompt.id} className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <Badge tone={prompt.priority === "high" ? "amber" : "slate"}>{prompt.priority}</Badge>
                <Badge tone="green">Human review</Badge>
                <Badge tone="green">No sends</Badge>
                <Badge tone={promptReviewTone(prompt.review?.status)}>{promptReviewLabel(prompt.review?.status || "open")}</Badge>
                <Badge tone="slate">{prompt.review?.feedback || "unrated"}</Badge>
              </div>
              <p className="mt-2 break-words text-sm font-black text-slate-950">{prompt.label}</p>
              <p className="mt-1 break-words text-xs font-bold text-slate-600">{prompt.detail}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" variant="secondary" onClick={() => onCoordinatorPromptReview(prompt.id, "handled", "useful")}>
                  <Icon name="check" /> Handled
                </Button>
                <Button type="button" variant="secondary" onClick={() => onCoordinatorPromptReview(prompt.id, "deferred", "wrong-time")}>
                  <Icon name="clock" /> Defer
                </Button>
                <Button type="button" variant="secondary" onClick={() => onCoordinatorPromptReview(prompt.id, "not-useful", "too-much")}>
                  <Icon name="alert" /> Not Useful
                </Button>
                <Button type="button" variant="secondary" onClick={() => onCoordinatorPromptReview(prompt.id, "open", "unrated")}>
                  <Icon name="refresh" /> Reopen
                </Button>
              </div>
            </div>
          )) : (
            <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm font-bold text-slate-600">
              Coordinator is quiet. Keep using quick updates and doctor prep.
            </div>
          )}
        </div>
      </Card>

      <Card className="p-4">
        <SectionHeader title="Daily Digest Review" description="Draft what the family should see, then keep it human-reviewed and unsent." />
        <div className="mb-3 flex flex-wrap gap-2">
          <Badge tone="blue">Draft only</Badge>
          <Badge tone="green">No sends</Badge>
          <Badge tone={digestReview.providerPayloadCreated ? "red" : "green"}>{digestReview.providerPayloadCreated ? "Provider payload" : "No provider payload"}</Badge>
          <Badge tone="green">Human review required</Badge>
        </div>
        <div className="space-y-2">
          {(digestReview.lines || ["No daily digest draft is ready yet."]).map((line) => (
            <div key={line} className="rounded-lg border border-slate-200 bg-white p-3 text-sm font-bold text-slate-600">{line}</div>
          ))}
        </div>
        <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
          <p className="text-sm font-black text-slate-950">Prompt feedback</p>
          <p className="mt-1 text-sm font-bold text-slate-600">{coordinatorFriction.summary || "Coordinator prompts have no feedback yet."}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge tone="green">{coordinatorFriction.usefulPromptCount || 0} useful</Badge>
            <Badge tone={(coordinatorFriction.tooMuchPromptCount || 0) ? "amber" : "slate"}>{coordinatorFriction.tooMuchPromptCount || 0} too much</Badge>
            <Badge tone={(coordinatorFriction.unclearPromptCount || 0) ? "amber" : "slate"}>{coordinatorFriction.unclearPromptCount || 0} unclear</Badge>
            <Badge tone={(coordinatorFriction.duplicatePromptCount || 0) ? "amber" : "slate"}>{coordinatorFriction.duplicatePromptCount || 0} duplicate</Badge>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <SectionHeader title="Apex System Health" description="Private care boundary and brain-interface checks." />
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {healthItems.map(([label, value, tone]) => (
            <div key={label} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3">
              <span className="text-sm font-black text-slate-700">{label}</span>
              <Badge tone={tone}>{value}</Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export function ApexFamilyCarePage({ user, permissions, standalone = false }) {
  const [activeScreen, setActiveScreen] = useState("today");
  const [notes, setNotes] = useState(loadInitialNotes);
  const [draft, setDraft] = useState(() => newDraft("normal"));
  const [voiceDraft, setVoiceDraft] = useState(() => newVoiceDraft("Dad"));
  const [latestVoiceReceipt, setLatestVoiceReceipt] = useState(null);
  const [notificationPreferences, setNotificationPreferences] = useState(loadInitialNotificationPreferences);
  const [kitchenDeviceState, setKitchenDeviceState] = useState(loadInitialKitchenDeviceState);
  const [testWeekState, setTestWeekState] = useState(loadInitialTestWeekState);
  const [testWeekDraft, setTestWeekDraft] = useState(newTestWeekDraft);
  const [timelineFilters, setTimelineFilters] = useState(newTimelineFilters);
  const [revisionDraft, setRevisionDraft] = useState(() => newRevisionDraft());
  const [coordinatorReviewState, setCoordinatorReviewState] = useState(loadInitialCoordinatorReviewState);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notes.slice(0, APEX_FAMILY_CARE_MAX_LOCAL_NOTES)));
  }, [notes]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(notificationPreferences));
  }, [notificationPreferences]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(KITCHEN_STORAGE_KEY, JSON.stringify(kitchenDeviceState));
  }, [kitchenDeviceState]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(TEST_WEEK_STORAGE_KEY, JSON.stringify(testWeekState));
  }, [testWeekState]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(COORDINATOR_REVIEW_STORAGE_KEY, JSON.stringify(coordinatorReviewState));
  }, [coordinatorReviewState]);

  const allNotes = useMemo(() => listApexFamilyCareNotes(notes, { limit: APEX_FAMILY_CARE_MAX_LOCAL_NOTES, status: "" }), [notes]);
  const sortedNotes = useMemo(() => listApexFamilyCareNotes(allNotes, { limit: APEX_FAMILY_CARE_MAX_LOCAL_NOTES }), [allNotes]);
  const todaySummary = useMemo(() => buildApexFamilyCareTodaySummary(sortedNotes), [sortedNotes]);
  const doctorSummary = useMemo(() => buildApexFamilyCareDoctorSummary(allNotes), [allNotes]);
  const familySummary = useMemo(() => buildApexFamilyCareFamilySummary(sortedNotes), [sortedNotes]);
  const reviewState = useMemo(() => buildApexFamilyCareReviewState(allNotes, timelineFilters), [allNotes, timelineFilters]);
  const coordinatorPacket = useMemo(() => buildApexFamilyCareCoordinatorPacket(allNotes), [allNotes]);
  const normalizedCoordinatorReviewState = useMemo(() => (
    normalizeApexFamilyCareCoordinatorReviewState(coordinatorReviewState, coordinatorPacket)
  ), [coordinatorPacket, coordinatorReviewState]);
  const coordinatorReviewPacket = useMemo(() => buildApexFamilyCareCoordinatorReviewPacket(allNotes, normalizedCoordinatorReviewState, {
    coordinatorPacket,
  }), [allNotes, coordinatorPacket, normalizedCoordinatorReviewState]);
  const kitchenStatus = useMemo(() => buildApexFamilyCareKitchenModeStatus(kitchenDeviceState), [kitchenDeviceState]);
  const householdPresence = useMemo(() => buildApexFamilyCareHouseholdDevicePresence(kitchenStatus), [kitchenStatus]);
  const householdDeviceBridgeApproval = useMemo(() => buildApexFamilyCareHouseholdDeviceBridgeApprovalPacket({
    selectedDevicePath: householdPresence.device.selectedType,
    currentPwaEnough: true,
    bridgeBeyondPwaApproved: false,
    deviceBoundaryApproved: false,
    familyAccessModelApproved: false,
    visibleControlsReady: householdPresence.controls.alwaysVisible,
    explicitVoiceStartReady: true,
    localSttBridgeApproved: false,
    noSurveillanceReady: true,
  }), [
    householdPresence.controls.alwaysVisible,
    householdPresence.device.selectedType,
  ]);
  const notificationState = useMemo(() => buildApexFamilyCareNotificationState(sortedNotes, {
    preferences: notificationPreferences,
    kitchenStatus,
  }), [kitchenStatus, notificationPreferences, sortedNotes]);
  const externalNotificationApproval = useMemo(() => buildApexFamilyCareExternalNotificationApprovalPacket({
    selectedChannel: notificationPreferences.deliveryMethod === "local-house-device" ? "not-chosen" : notificationPreferences.deliveryMethod,
    externalChannelApproved: false,
    providerBoundaryApproved: false,
    familyAccessModelApproved: false,
    recipientsOptedIn: notificationState.summary.recipientCount > 0,
    recipientCount: notificationState.summary.recipientCount,
    quietHoursReady: notificationPreferences.quietHoursEnabled,
    lockScreenCopySafe: notificationState.summary.nextSafeLockScreenCopySafe,
  }), [
    notificationPreferences.deliveryMethod,
    notificationPreferences.quietHoursEnabled,
    notificationState.summary.nextSafeLockScreenCopySafe,
    notificationState.summary.recipientCount,
  ]);
  const testWeekSummary = useMemo(() => buildApexFamilyCareTestWeekSummary(testWeekState, sortedNotes), [sortedNotes, testWeekState]);
  const testWeekRunPacket = useMemo(() => buildApexFamilyCareTestWeekRunPacket(testWeekState, sortedNotes), [sortedNotes, testWeekState]);
  const gate = useMemo(() => getApexFamilyCareAccessGateSummary({
    routePrivate: standalone || Boolean(user?.operatorAccess),
    apexOsOnly: !standalone && Boolean(permissions?.apexOs?.canView),
  }), [permissions?.apexOs?.canView, standalone, user?.operatorAccess]);
  const accessReadiness = useMemo(() => buildApexFamilyCareAccessReadiness({
    standalone,
    routePrivate: gate.routePrivate,
    accessMode: "local-only",
    installTarget: "house tablet or old phone",
    familyMembers: ["Dad", "Brother", "John", "Family"],
  }), [gate.routePrivate, standalone]);
  const boundaryReleasePrep = useMemo(() => buildApexFamilyCareBoundaryReleasePrep({
    standalone,
    hasHtmlEntry: true,
    hasManifest: true,
    hasStandaloneMount: true,
    apexHqNavigationFree: true,
    productionRouteStatus: "blocked-local-only",
    familyAccessModelApproved: false,
    privateReleaseApproved: false,
  }), [standalone]);
  const releaseSmokeChecklist = useMemo(() => buildApexFamilyCareLocalReleaseSmokeChecklist({
    standalone,
    localPreviewReady: boundaryReleasePrep.localPreviewReady,
    productionBlocked: boundaryReleasePrep.productionBlocked,
    directPwaReady: accessReadiness.localReady,
    apexHqNavigationFree: true,
    houseDeviceTarget: accessReadiness.installTarget,
    familyAccessModelApproved: false,
    accessModel: "not-chosen",
  }), [accessReadiness, boundaryReleasePrep, standalone]);
  const localSttBridgeApproval = useMemo(() => buildApexFamilyCareLocalSttBridgeApprovalPacket({
    requestedBridge: "existing-apex-local-faster-whisper-bridge",
    endpointBoundary: "family-care-specific-local-stt-endpoint",
    bridgeApprovalGranted: false,
    explicitStartReady: true,
    visibleControlsReady: true,
    noRawStorage: true,
    localOnly: true,
    noCloud: true,
    noBrowserSpeech: true,
    noApexHqDependency: true,
  }), []);

  function handleQuickAdd(categoryId) {
    const nextDraft = newDraft(categoryId);
    setDraft(nextDraft);
    setActiveScreen("add");
  }

  function handleStartVoiceUpdate() {
    setKitchenDeviceState((current) => applyApexFamilyCareKitchenControl(current, "set-listening"));
    setVoiceDraft((current) => ({
      ...newVoiceDraft(current.reporter),
      listening: true,
      status: "listening",
      localVoiceSession: applyApexFamilyCareLocalVoiceInputControl(current.localVoiceSession, "start"),
      notice: "Visible voice update started. Speak the short update, then enter the recognized words or typed fallback and review.",
    }));
    setActiveScreen("voice");
  }

  function handleStopVoiceUpdate() {
    setKitchenDeviceState((current) => applyApexFamilyCareKitchenControl(current, "stop"));
    setVoiceDraft((current) => ({
      ...current,
      listening: false,
      status: "stopped",
      localVoiceSession: applyApexFamilyCareLocalVoiceInputControl(current.localVoiceSession, "stop"),
      notice: "Voice listening stopped. Review the recognized words or typed fallback before saving.",
    }));
  }

  function handleMuteVoiceUpdate() {
    setKitchenDeviceState((current) => applyApexFamilyCareKitchenControl(current, "mute"));
    setVoiceDraft((current) => ({
      ...current,
      listening: false,
      status: "muted",
      localVoiceSession: applyApexFamilyCareLocalVoiceInputControl(current.localVoiceSession, "mute"),
      notice: "Voice input muted. Typed fallback stays available.",
    }));
  }

  function handleRecoverVoiceUpdate() {
    setKitchenDeviceState((current) => applyApexFamilyCareKitchenControl(current, "stop"));
    setVoiceDraft((current) => ({
      ...newVoiceDraft(current.reporter),
      localVoiceSession: applyApexFamilyCareLocalVoiceInputControl(current.localVoiceSession, "recover"),
      notice: "Recovered to quiet manual mode. No raw audio or transcript was stored.",
    }));
  }

  function handleKitchenControl(control) {
    setKitchenDeviceState((current) => applyApexFamilyCareKitchenControl(current, control));
  }

  function handleKitchenQuickLog(categoryId) {
    const category = APEX_FAMILY_CARE_CATEGORIES.find((item) => item.id === categoryId) || APEX_FAMILY_CARE_CATEGORIES[0];
    const now = new Date();
    const saved = createApexFamilyCareNote({
      id: `family-care-kitchen-${Date.now()}`,
      category: category.id,
      reporter: "Family",
      timestamp: now.toISOString(),
      summary: category.defaultSummary,
      addToDoctorSummary: category.doctorDefault,
      familyVisible: true,
      urgent: category.id === "concern",
      source: "tap",
    }, now);
    setNotes((current) => addApexFamilyCareNote(current, saved, now));
    setKitchenDeviceState((current) => applyApexFamilyCareKitchenControl(current, "heartbeat", now));
    setActiveScreen("kitchen");
  }

  function handleStartTestWeek() {
    setTestWeekState((current) => startApexFamilyCareTestWeek(current));
  }

  function handleCompleteTestWeek() {
    setTestWeekState((current) => markApexFamilyCareTestWeekComplete(current));
  }

  function handleUpdateTestWeekMetric(key, value) {
    setTestWeekState((current) => normalizeApexFamilyCareTestWeekState({
      ...current,
      [key]: value,
      updatedAt: new Date().toISOString(),
    }));
  }

  function handleAddTestWeekFrictionNote() {
    setTestWeekState((current) => addApexFamilyCareTestWeekFrictionNote(current, testWeekDraft));
    setTestWeekDraft(newTestWeekDraft());
  }

  function handleUpdateNoteStatus(noteId, status) {
    const now = new Date();
    const patch = status === "confirmed"
      ? {
        status,
        reviewConfirmedAt: now.toISOString(),
        reviewConfirmedBy: "Family",
      }
      : { status };
    setNotes((current) => {
      const updated = updateApexFamilyCareNote(current, noteId, patch, now, {
        maxNotes: APEX_FAMILY_CARE_MAX_LOCAL_NOTES,
      });
      return updated.changed ? updated.notes : current;
    });
  }

  function handleStartRevise(note) {
    setRevisionDraft(newRevisionDraft(note));
    setActiveScreen("timeline");
  }

  function handleCancelRevision() {
    setRevisionDraft(newRevisionDraft());
  }

  function handleSaveRevision() {
    if (!revisionDraft.noteId || !revisionDraft.summary.trim()) return;
    const revision = {
      category: revisionDraft.category,
      reporter: revisionDraft.reporter,
      timestamp: revisionDraft.timestamp || new Date().toISOString(),
      summary: revisionDraft.summary,
      severity: revisionDraft.severity,
      bodyArea: revisionDraft.bodyArea,
      addToDoctorSummary: revisionDraft.addToDoctorSummary,
      familyVisible: revisionDraft.familyVisible,
      urgent: revisionDraft.urgent,
      status: revisionDraft.status,
      revisedBy: revisionDraft.reporter,
    };
    setNotes((current) => {
      const updated = reviseApexFamilyCareNote(current, revisionDraft.noteId, revision, new Date(), {
        maxNotes: APEX_FAMILY_CARE_MAX_LOCAL_NOTES,
      });
      return updated.changed ? updated.notes : current;
    });
    setRevisionDraft(newRevisionDraft());
    setTimelineFilters((current) => ({ ...current, status: "open" }));
    setActiveScreen("timeline");
  }

  function handleCoordinatorPromptReview(promptId, status, feedback) {
    setCoordinatorReviewState((current) => applyApexFamilyCareCoordinatorPromptReview(current, coordinatorPacket, {
      promptId,
      status,
      feedback,
      reviewedBy: "Family",
      now: new Date(),
    }));
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

  function reviewVoiceDraft(options = {}) {
    setKitchenDeviceState((current) => applyApexFamilyCareKitchenControl(current, "stop"));
    setVoiceDraft((current) => {
      const followUpCount = options.forceFollowUpLimit ? APEX_FAMILY_CARE_VOICE_POLICY.maxFollowUps : current.followUpAsked ? 1 : 0;
      const parsed = createApexFamilyCareVoiceNoteDraft({
        transcript: current.transcript,
        followUpAnswer: current.followUpAsked ? current.followUpAnswer : "",
        followUpCount,
        reporter: current.reporter,
        inputMode: "visible-transcript",
        explicitUserStarted: true,
      });
      return {
        ...current,
        listening: false,
        status: parsed.needsFollowUp ? "needs-follow-up" : "ready",
        followUpAsked: parsed.needsFollowUp || current.followUpAsked,
        parsed,
        receipt: parsed.receipt,
        localVoiceSession: applyApexFamilyCareLocalVoiceInputControl(current.localVoiceSession, "stop"),
        notice: parsed.needsFollowUp
          ? "Apex needs one detail before saving. It will not ask a second follow-up."
          : "Apex turned this into a structured care note. Review and save it locally.",
      };
    });
  }

  function saveVoiceParsed(parsed, reporter) {
    const saved = createApexFamilyCareNote({
      ...parsed.noteInput,
      id: `family-care-voice-${Date.now()}`,
      reporter: reporter || parsed.noteInput.reporter,
      timestamp: parsed.noteInput.timestamp || new Date().toISOString(),
    });
    setNotes((current) => addApexFamilyCareNote(current, saved));
    setLatestVoiceReceipt(parsed.receipt);
    setKitchenDeviceState((current) => applyApexFamilyCareKitchenControl(current, "stop"));
    setVoiceDraft(newVoiceDraft(saved.reporter));
    setActiveScreen("today");
  }

  function handleSaveVoiceDraft() {
    if (voiceDraft.parsed?.noteReady) {
      saveVoiceParsed(voiceDraft.parsed, voiceDraft.reporter);
      return;
    }
    reviewVoiceDraft();
  }

  function handleSaveVoiceNeedsReview() {
    const parsed = createApexFamilyCareVoiceNoteDraft({
      transcript: voiceDraft.transcript,
      followUpAnswer: "",
      followUpCount: APEX_FAMILY_CARE_VOICE_POLICY.maxFollowUps,
      reporter: voiceDraft.reporter,
      inputMode: "visible-transcript",
      explicitUserStarted: true,
    });
    saveVoiceParsed(parsed, voiceDraft.reporter);
  }

  function handleCancelVoiceUpdate() {
    setKitchenDeviceState((current) => applyApexFamilyCareKitchenControl(current, "stop"));
    setVoiceDraft((current) => ({
      ...newVoiceDraft(current.reporter),
      localVoiceSession: applyApexFamilyCareLocalVoiceInputControl(current.localVoiceSession, "recover"),
      notice: "Recovered to quiet manual mode. No raw audio or transcript was stored.",
    }));
  }

  const screenContent = {
    today: <TodayView notes={sortedNotes} summary={todaySummary} onQuickAdd={handleQuickAdd} onVoiceStart={handleStartVoiceUpdate} setActiveScreen={setActiveScreen} />,
    kitchen: (
      <KitchenModeView
        kitchenStatus={kitchenStatus}
        householdPresence={householdPresence}
        householdDeviceBridgeApproval={householdDeviceBridgeApproval}
        onKitchenQuickLog={handleKitchenQuickLog}
        onKitchenControl={handleKitchenControl}
        onVoiceStart={handleStartVoiceUpdate}
        setActiveScreen={setActiveScreen}
      />
    ),
    add: <AddUpdateView draft={draft} setDraft={setDraft} onSave={handleSave} />,
    voice: (
      <VoiceUpdateView
        voiceDraft={voiceDraft}
        setVoiceDraft={setVoiceDraft}
        localSttBridgeApproval={localSttBridgeApproval}
        onStart={handleStartVoiceUpdate}
        onStop={handleStopVoiceUpdate}
        onMute={handleMuteVoiceUpdate}
        onRecover={handleRecoverVoiceUpdate}
        onCancel={handleCancelVoiceUpdate}
        onReview={() => reviewVoiceDraft()}
        onSave={handleSaveVoiceDraft}
        onSaveNeedsReview={handleSaveVoiceNeedsReview}
      />
    ),
    timeline: (
      <TimelineView
        reviewState={reviewState}
        revisionDraft={revisionDraft}
        setRevisionDraft={setRevisionDraft}
        timelineFilters={timelineFilters}
        setTimelineFilters={setTimelineFilters}
        onCancelRevision={handleCancelRevision}
        onSaveRevision={handleSaveRevision}
        onStartRevise={handleStartRevise}
        onStatusChange={handleUpdateNoteStatus}
      />
    ),
    doctor: <DoctorSummaryView doctorSummary={doctorSummary} />,
    family: <FamilySummaryView familySummary={familySummary} />,
    settings: (
      <SettingsView
        notificationPreferences={notificationPreferences}
        setNotificationPreferences={setNotificationPreferences}
        notificationState={notificationState}
        externalNotificationApproval={externalNotificationApproval}
      />
    ),
    testWeek: (
      <TestWeekView
        testWeekSummary={testWeekSummary}
        testWeekRunPacket={testWeekRunPacket}
        testWeekDraft={testWeekDraft}
        setTestWeekDraft={setTestWeekDraft}
        onStartTestWeek={handleStartTestWeek}
        onCompleteTestWeek={handleCompleteTestWeek}
        onAddFrictionNote={handleAddTestWeekFrictionNote}
        onUpdateTestWeekMetric={handleUpdateTestWeekMetric}
      />
    ),
    access: <AccessView accessReadiness={accessReadiness} boundaryReleasePrep={boundaryReleasePrep} releaseSmokeChecklist={releaseSmokeChecklist} gate={gate} standalone={standalone} />,
    health: (
      <HealthView
        accessReadiness={accessReadiness}
        boundaryReleasePrep={boundaryReleasePrep}
        releaseSmokeChecklist={releaseSmokeChecklist}
        localSttBridgeApproval={localSttBridgeApproval}
        gate={gate}
        summary={todaySummary}
        latestVoiceReceipt={latestVoiceReceipt}
        notificationState={notificationState}
        externalNotificationApproval={externalNotificationApproval}
        kitchenStatus={kitchenStatus}
        householdPresence={householdPresence}
        householdDeviceBridgeApproval={householdDeviceBridgeApproval}
        testWeekSummary={testWeekSummary}
        coordinatorPacket={coordinatorPacket}
        coordinatorReviewPacket={coordinatorReviewPacket}
        onCoordinatorPromptReview={handleCoordinatorPromptReview}
      />
    ),
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        eyebrow={standalone ? "Family-only PWA" : "Legacy Family Care Shell"}
        title="Apex Family Care"
        description={standalone ? "Private family care workspace for Grandma. Opens directly without Apex HQ, contractor tools, or the private Apex cockpit." : "Temporary legacy view. The family-facing app now opens directly as its own PWA."}
        actions={(
          <>
            <Badge tone="green">Family-only</Badge>
            <Badge tone="blue">{standalone ? "Direct PWA" : "Legacy shell"}</Badge>
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
            <SectionHeader title="Care Boundary" description="Built for John's family. Apex is the brain; Apex HQ is not this app." />
            <div className="flex flex-wrap gap-2">
              <Badge tone="green">Direct family app</Badge>
              <Badge tone="green">No Apex HQ nav</Badge>
              <Badge tone="green">No customer/field access</Badge>
              <Badge tone="green">No raw audio</Badge>
              <Badge tone="green">No diagnosis</Badge>
            </div>
          </Card>
          <Card className="p-4">
            <SectionHeader
              title="Kitchen Status"
              description={`${kitchenStatus.device.deviceTypeLabel} in ${kitchenStatus.device.room}`}
            />
            <div className="grid gap-2">
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3">
                <span className="text-sm font-black text-slate-700">House screen</span>
                <Badge tone={kitchenStatus.health.statusTone}>{kitchenStatus.health.statusLabel}</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3">
                <span className="text-sm font-black text-slate-700">Presence</span>
                <Badge tone={householdPresence.presence.statusTone}>{householdPresence.presence.readyForHouse ? "Ready" : "Check"}</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3">
                <span className="text-sm font-black text-slate-700">Mute</span>
                <Badge tone={kitchenStatus.controls.muted ? "slate" : "green"}>{kitchenStatus.controls.muted ? "On" : "Off"}</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3">
                <span className="text-sm font-black text-slate-700">Voice mode</span>
                <Badge tone={householdPresence.voice.statusTone}>{householdPresence.voice.statusLabel}</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3">
                <span className="text-sm font-black text-slate-700">Live mic</span>
                <Badge tone={APEX_FAMILY_CARE_KITCHEN_MODE_POLICY.liveMicCaptureEnabled ? "red" : "green"}>{APEX_FAMILY_CARE_KITCHEN_MODE_POLICY.liveMicCaptureEnabled ? "On" : "Off"}</Badge>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <SectionHeader
              title="Test Week Status"
              description={testWeekSummary.recommendedNextStep}
            />
            <div className="grid gap-2">
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3">
                <span className="text-sm font-black text-slate-700">Tracked days</span>
                <Badge tone={testWeekSummary.trackedDays >= 7 ? "green" : "slate"}>{testWeekSummary.trackedDays}/7</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3">
                <span className="text-sm font-black text-slate-700">Success checks</span>
                <Badge tone={testWeekSummary.passedCount >= 4 ? "green" : "slate"}>{testWeekSummary.passedCount}/7</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3">
                <span className="text-sm font-black text-slate-700">Phase closure</span>
                <Badge tone={testWeekSummary.evidenceReady ? "amber" : "slate"}>{testWeekSummary.evidenceReady ? "Review" : "Missing"}</Badge>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <SectionHeader
              title="Notification Status"
              description={notificationState.summary.nextSafeLockScreenCopy}
            />
            <div className="grid gap-2">
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3">
                <span className="text-sm font-black text-slate-700">Decision previews</span>
                <Badge tone="green">{notificationState.summary.activeDecisionCount}</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3">
                <span className="text-sm font-black text-slate-700">Quiet-hours hold</span>
                <Badge tone={notificationState.summary.heldForQuietHoursCount ? "amber" : "green"}>{notificationState.summary.heldForQuietHoursCount}</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3">
                <span className="text-sm font-black text-slate-700">House notices</span>
                <Badge tone={notificationState.summary.readyLocalNoticeCount ? "green" : "slate"}>{notificationState.summary.readyLocalNoticeCount}</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3">
                <span className="text-sm font-black text-slate-700">House trust</span>
                <Badge tone={notificationState.summary.houseDeviceTrusted ? "green" : "amber"}>{notificationState.summary.houseDeviceTrusted ? "On" : "Needed"}</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3">
                <span className="text-sm font-black text-slate-700">Live sends</span>
                <Badge tone={APEX_FAMILY_CARE_NOTIFICATION_POLICY.liveDeliveryEnabled ? "red" : "green"}>{APEX_FAMILY_CARE_NOTIFICATION_POLICY.liveDeliveryEnabled ? "On" : "Off"}</Badge>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <SectionHeader
              title="Voice Status"
              description={latestVoiceReceipt ? "Latest visible voice note receipt is metadata-only." : "Voice starts only from the visible Voice Update control."}
            />
            <div className="grid gap-2">
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3">
                <span className="text-sm font-black text-slate-700">Hidden recording</span>
                <Badge tone={APEX_FAMILY_CARE_VOICE_POLICY.hiddenRecording ? "red" : "green"}>{APEX_FAMILY_CARE_VOICE_POLICY.hiddenRecording ? "On" : "Off"}</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3">
                <span className="text-sm font-black text-slate-700">Latest category</span>
                <Badge tone={latestVoiceReceipt ? "blue" : "slate"}>{latestVoiceReceipt?.metadata?.category || "None"}</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3">
                <span className="text-sm font-black text-slate-700">Follow-up used</span>
                <Badge tone="green">{latestVoiceReceipt?.metadata?.followUpCount || 0}/{APEX_FAMILY_CARE_VOICE_POLICY.maxFollowUps}</Badge>
              </div>
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

export function ApexFamilyCareStandaloneApp() {
  return <ApexFamilyCarePage standalone />;
}
