import { useState } from "react";

import { Badge, Button, Card, Icon, InputField, SectionHeader, SelectField, StateCard, TextAreaField } from "./app-shell-components";
import { calculatorTypeLabel, formatCubicFeet, formatCubicYards, summarizeTakeoffSection } from "./calculator-utils";
import { deriveJobPilotHandoffReadiness } from "./job-utils";
import { getCrewAssignmentOptions, getForemanAssignmentOptions } from "./user-utils";
import { JOB_STARTUP_STATUSES, buildStartupSummary, canMarkStartupReady, calculateStartupStatus, getStartupCriticalWarnings, markStartupItem, normalizeJobStartupFields } from "../shared/jobStartup.js";

export function JobPilotHandoffReadinessCard({ job }) {
  const readiness = deriveJobPilotHandoffReadiness(job);

  return (
    <div className="rounded-3xl border border-orange-100 bg-orange-50/70 p-4">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-black text-slate-950">Field handoff readiness</p>
            <Badge tone={readiness.tone}>{readiness.status}</Badge>
            <Badge tone="slate">{readiness.readyCount} / {readiness.totalCount}</Badge>
          </div>
          <p className="mt-1 text-sm leading-6 text-slate-600">{readiness.summary}</p>
        </div>
        <div className="rounded-2xl border border-orange-100 bg-white px-3 py-2 text-sm font-black text-orange-800">
          {readiness.nextAction}
        </div>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
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
      <p className="mt-3 text-xs font-bold text-slate-500">Pilot path: schedule to field handoff to photo/report proof to owner follow-up. This card does not assign crews, send messages, or change billing.</p>
    </div>
  );
}

export function JobPlannerCard({ draft, setDraft, onCreateJob, disabled, users = [], canCreate }) {
  const foremanUsers = getForemanAssignmentOptions(users);
  const crewUsers = getCrewAssignmentOptions(users);

  if (!canCreate) {
    return (
      <Card className="p-5">
        <SectionHeader title="Scheduling" description="Job creation stays with office scheduling roles." />
        <StateCard title="Read-only planning" description="Foremen and employees can review assigned work here, but only office/admin roles can create or reschedule jobs." tone="slate" />
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <SectionHeader title="Create job" description="Create a schedulable field record. Assigned foremen and employees will see scheduled jobs in their field workspace." />
      <form className="grid gap-3" onSubmit={onCreateJob}>
        <div className="grid gap-3 md:grid-cols-2">
          <InputField label="Job name" value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Martinez Front Walk" />
          <InputField label="Customer" value={draft.customer} onChange={(event) => setDraft((current) => ({ ...current, customer: event.target.value }))} />
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <SelectField label="Status" value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))}>
            <option value="draft">Draft</option>
            <option value="planned">Planned</option>
            <option value="scheduled">Scheduled</option>
          </SelectField>
          <InputField label="Scheduled start" type="datetime-local" value={draft.scheduledStart} onChange={(event) => setDraft((current) => ({ ...current, scheduledStart: event.target.value }))} />
          <InputField label="Estimated duration" value={draft.estimatedDuration} onChange={(event) => setDraft((current) => ({ ...current, estimatedDuration: event.target.value }))} placeholder="2 days" />
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <InputField label="Address" value={draft.address} onChange={(event) => setDraft((current) => ({ ...current, address: event.target.value }))} placeholder="1452 Orchard View Dr" />
          <InputField label="Site contact" value={draft.siteContact} onChange={(event) => setDraft((current) => ({ ...current, siteContact: event.target.value }))} placeholder="Rob Jenkins - 503-555-0187" />
          <InputField label="Crew" value={draft.crew} onChange={(event) => setDraft((current) => ({ ...current, crew: event.target.value }))} placeholder="Juan + 3" />
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <SelectField label="Assigned foreman" value={draft.assignedForemanId} onChange={(event) => setDraft((current) => ({ ...current, assignedForemanId: event.target.value }))}>
            <option value="">Unassigned</option>
            {foremanUsers.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
          </SelectField>
          <SelectField label="Initial crew member" value={draft.assignedUserId} onChange={(event) => setDraft((current) => ({ ...current, assignedUserId: event.target.value }))}>
            <option value="">Unassigned</option>
            {crewUsers.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
          </SelectField>
          <InputField label="Crew size needed" type="number" min="0" value={draft.crewSizeNeeded} onChange={(event) => setDraft((current) => ({ ...current, crewSizeNeeded: Number(event.target.value) }))} />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="field-label">
            <span>Foreman planning visible</span>
            <input type="checkbox" checked={Boolean(draft.fieldPlanningVisible)} onChange={(event) => setDraft((current) => ({ ...current, fieldPlanningVisible: event.target.checked }))} />
          </label>
          <label className="field-label">
            <span>Visible to foreman</span>
            <input type="checkbox" checked={Boolean(draft.visibleToForeman)} onChange={(event) => setDraft((current) => ({ ...current, visibleToForeman: event.target.checked }))} />
          </label>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <InputField label="Progress" type="number" min="0" max="100" value={draft.progress} onChange={(event) => setDraft((current) => ({ ...current, progress: Number(event.target.value) }))} />
          <InputField label="Next step" value={draft.nextStep} onChange={(event) => setDraft((current) => ({ ...current, nextStep: event.target.value }))} placeholder="Confirm mix and pump truck" />
        </div>
        <TextAreaField label="Scope summary" value={draft.scopeSummary} onChange={(event) => setDraft((current) => ({ ...current, scopeSummary: event.target.value }))} />
        <TextAreaField label="Equipment notes" value={draft.equipmentNotes} onChange={(event) => setDraft((current) => ({ ...current, equipmentNotes: event.target.value }))} />
        <TextAreaField label="Safety notes" value={draft.safetyNotes} onChange={(event) => setDraft((current) => ({ ...current, safetyNotes: event.target.value }))} />
        <TextAreaField label="Material notes" value={draft.materialNotes} onChange={(event) => setDraft((current) => ({ ...current, materialNotes: event.target.value }))} />
        <TextAreaField label="Field notes" value={draft.fieldNotes} onChange={(event) => setDraft((current) => ({ ...current, fieldNotes: event.target.value }))} />
        <TextAreaField label="Notes" value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} />
        <Button type="submit" disabled={disabled}>
          <Icon name="plus" />
          Add job
        </Button>
      </form>
    </Card>
  );
}

function StartupStatusBadge({ status }) {
  const normalizedStatus = JOB_STARTUP_STATUSES.includes(status) ? status : "Not Started";
  let tone = "slate";
  if (["Ready for Field", "Completed"].includes(normalizedStatus)) tone = "green";
  if (normalizedStatus === "In Progress") tone = "blue";
  if (normalizedStatus === "Needs Review") tone = "amber";
  return <Badge tone={tone}>{normalizedStatus}</Badge>;
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

export function JobStartupChecklistCard({ job, onFieldChange, disabled }) {
  const [copyMessage, setCopyMessage] = useState("");
  const startup = normalizeJobStartupFields(job);
  const checklist = startup.startupChecklist;
  const warnings = getStartupCriticalWarnings(checklist);
  const satisfiedCount = checklist.filter((item) => item.checked || item.tbd).length;
  const missingRequiredCount = warnings.length;
  const hasPersistedStartup = Boolean(startup.startupLastUpdatedAt || startup.sourceImportedDraftId || checklist.some((item) => item.checked || item.tbd || item.notes));

  function saveChecklist(nextChecklist) {
    const nextStatus = calculateStartupStatus(nextChecklist);
    onFieldChange("startupChecklist", nextChecklist);
    onFieldChange("startupStatus", nextStatus);
  }

  function updateItem(key, patch) {
    const nextChecklist = markStartupItem(checklist, key, patch);
    saveChecklist(nextChecklist);
  }

  function initializeChecklist() {
    onFieldChange("startupChecklist", checklist);
    onFieldChange("startupStatus", startup.startupStatus || "Not Started");
    onFieldChange("startupLastUpdatedAt", new Date().toISOString());
  }

  function markReady() {
    if (!canMarkStartupReady(checklist)) {
      window.alert("Complete customer/contact, address, scope, crew/TBD, and start date/TBD before marking Ready for Field.");
      return;
    }
    onFieldChange("startupStatus", "Ready for Field");
  }

  async function copySummary() {
    await navigator.clipboard.writeText(buildStartupSummary({ ...job, ...startup }));
    setCopyMessage("Startup summary copied.");
    window.setTimeout(() => setCopyMessage(""), 2500);
  }

  return (
    <div className="rounded-3xl border border-blue-100 bg-slate-50/80 p-4">
      <SectionHeader
        title="Job Startup Checklist"
        description="Use this office review before the crew treats the job as ready for field work."
        action={<StartupStatusBadge status={startup.startupStatus} />}
      />
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-blue-100 bg-white p-3">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Checklist progress</p>
          <p className="mt-2 text-lg font-black text-slate-950">{satisfiedCount} / {checklist.length}</p>
          <p className="text-xs font-bold text-slate-500">done or marked TBD</p>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-3">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-amber-700">Missing before ready</p>
          <p className="mt-2 text-lg font-black text-amber-900">{missingRequiredCount}</p>
          <p className="text-xs font-bold text-amber-800">critical item{missingRequiredCount === 1 ? "" : "s"}</p>
        </div>
        <div className="rounded-2xl border border-blue-100 bg-white p-3">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Field release</p>
          <p className="mt-2 text-sm font-black text-slate-950">{canMarkStartupReady(checklist) ? "Ready can be marked" : "Not ready yet"}</p>
          <p className="text-xs font-bold text-slate-500">customer, address, scope, crew, start date</p>
        </div>
      </div>
      <div className="grid gap-3 lg:grid-cols-[1fr_0.85fr]">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="blue">{satisfiedCount} / {checklist.length} done or TBD</Badge>
            {startup.sourceImportedDraftId ? <Badge tone="violet">Imported draft {startup.sourceImportedDraftId}</Badge> : null}
            {startup.startupLastUpdatedAt ? <Badge tone="slate">Updated {formatDateTime(startup.startupLastUpdatedAt)}</Badge> : null}
          </div>
          {warnings.length > 0 ? (
            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-3 text-sm font-bold leading-6 text-amber-800">
              <p className="mb-1 text-[11px] font-black uppercase tracking-[0.16em] text-amber-700">Fix or mark TBD before Ready for Field</p>
              {warnings.map((warning) => <p key={warning}>{warning}</p>)}
            </div>
          ) : (
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-sm font-bold leading-6 text-emerald-800">
              Critical startup items are complete or marked TBD.
            </div>
          )}
          <div className="grid gap-2 md:grid-cols-2">
            {checklist.map((item) => (
              <div key={item.key} className="rounded-2xl border border-blue-100 bg-white p-3">
                <div className="flex items-start justify-between gap-3">
                  <label className="flex min-w-0 items-start gap-2 text-sm font-bold leading-5 text-slate-700">
                    <input
                      className="mt-1 accent-blue-700"
                      type="checkbox"
                      checked={item.checked}
                      onChange={(event) => updateItem(item.key, { checked: event.target.checked, tbd: event.target.checked ? false : item.tbd })}
                      disabled={disabled}
                    />
                    <span className="break-words">{item.label}</span>
                  </label>
                  {item.critical ? <Badge tone="amber">Critical</Badge> : null}
                </div>
                {item.tbdAllowed ? (
                  <label className="mt-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                    <input
                      className="accent-blue-700"
                      type="checkbox"
                      checked={item.tbd}
                      onChange={(event) => updateItem(item.key, { tbd: event.target.checked, checked: event.target.checked ? false : item.checked })}
                      disabled={disabled}
                    />
                    Mark TBD
                  </label>
                ) : null}
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <TextAreaField
            label="Startup notes"
            value={startup.startupNotes || ""}
            onChange={(event) => onFieldChange("startupNotes", event.target.value)}
            disabled={disabled}
            placeholder="Key imported draft context, readiness notes, or office review notes."
          />
          <div className="rounded-2xl border border-blue-100 bg-white p-3">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Startup actions</p>
            <p className="mt-2 text-sm font-bold leading-6 text-slate-600">Mark Ready for Field only after the office has confirmed the critical startup items.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {!hasPersistedStartup ? <Button type="button" variant="secondary" size="sm" onClick={initializeChecklist} disabled={disabled}>Initialize checklist</Button> : null}
              <Button type="button" size="sm" onClick={markReady} disabled={disabled || !canMarkStartupReady(checklist)}>Mark Ready for Field</Button>
              <Button type="button" variant="secondary" size="sm" onClick={copySummary} disabled={disabled}>Copy Startup Summary</Button>
            </div>
            {copyMessage ? <p className="mt-2 text-xs font-bold text-emerald-700">{copyMessage}</p> : null}
            {startup.startupCompletedAt ? <p className="mt-2 text-xs font-bold text-slate-500">Completed {formatDateTime(startup.startupCompletedAt)}</p> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export function JobCalculationsCard({ calculations, title = "Saved calculations", description = "Team-visible concrete volume records saved by the company team.", showInternalBadge = true }) {
  const safeCalculations = Array.isArray(calculations) ? calculations : [];

  return (
    <Card className="p-5">
      <SectionHeader title={title} description={description} />
      {safeCalculations.length === 0 ? (
        <StateCard title="No saved calculations yet" description="Calculator results saved to this job will appear here for allowed company users." tone="slate" />
      ) : (
        <div className="space-y-3">
          {safeCalculations.map((calculation) => {
            const sectionRows = Array.isArray(calculation.inputsJson?.sections) ? calculation.inputsJson.sections : [];
            const sectionCount = Number(calculation.inputsJson?.sectionCount || sectionRows.length || 0);

            return (
              <div key={calculation.id} className="rounded-2xl border border-blue-100 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-black text-slate-950">{calculatorTypeLabel(calculation.calculatorType)}</p>
                    <p className="mt-1 break-words text-sm text-slate-600">{calculation.summary || "Saved internal calculation"}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {sectionCount > 0 ? <Badge tone="blue">{sectionCount} sections</Badge> : null}
                    {showInternalBadge ? <Badge tone="slate">Internal only</Badge> : null}
                  </div>
                </div>
                <div className={`mt-3 grid gap-3 ${sectionCount > 0 ? "sm:grid-cols-2 lg:grid-cols-5" : "sm:grid-cols-2 lg:grid-cols-4"}`}>
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Base</p>
                    <p className="mt-1 text-sm font-bold text-slate-700">{formatCubicYards(calculation.cubicYards)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">With waste</p>
                    <p className="mt-1 text-sm font-bold text-slate-700">{formatCubicYards(calculation.cubicYardsWithWaste)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Created by</p>
                    <p className="mt-1 text-sm font-bold text-slate-700">{calculation.createdByName || calculation.createdBy}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Saved at</p>
                    <p className="mt-1 text-sm font-bold text-slate-700">{formatDateTime(calculation.createdAt)}</p>
                  </div>
                  {sectionCount > 0 ? (
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Sections</p>
                      <p className="mt-1 text-sm font-bold text-slate-700">{sectionCount}</p>
                    </div>
                  ) : null}
                </div>
                {sectionRows.length > 0 ? (
                  <div className="mt-3 space-y-2 rounded-2xl border border-blue-100 bg-blue-50/50 p-3">
                    {sectionRows.map((section, index) => (
                      <div key={section.id || `${section.label}-${index}`} className="rounded-2xl border border-blue-100 bg-white p-3">
                        <p className="text-sm font-black text-slate-950">{summarizeTakeoffSection(section, index)}</p>
                        <p className="mt-1 text-sm text-slate-600">{formatCubicYards(section.cubicYards)} - {formatCubicFeet(section.cubicFeet)}</p>
                        {section.notes ? <p className="mt-1 text-sm leading-6 text-slate-600">{section.notes}</p> : null}
                      </div>
                    ))}
                  </div>
                ) : null}
                {calculation.notes ? <p className="mt-3 text-sm leading-6 text-slate-600">{calculation.notes}</p> : null}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
