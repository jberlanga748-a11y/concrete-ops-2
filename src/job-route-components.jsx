import { Badge, Button, Card, Icon, InputField, SectionHeader, SelectField, StateCard, TextAreaField } from "./app-shell-components";
import { deriveJobPilotHandoffReadiness } from "./job-utils";
import { getCrewAssignmentOptions, getForemanAssignmentOptions } from "./user-utils";

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
