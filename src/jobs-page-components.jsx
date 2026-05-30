import { useEffect, useMemo, useRef, useState } from "react";

import {
  ApexOfficeCommandShell,
  AssistantRail,
  Badge,
  Button,
  Card,
  CommandPageFrame,
  FilterBar,
  Icon,
  InputField,
  PageHeader,
  SectionHeader,
  SelectField,
  StateCard,
  StatusBadge,
  TextAreaField,
  WorkQueueCard,
} from "./app-shell-components";
import { CommandCenterKpiCard } from "./command-center-route-components";
import { formatJobScheduleDetail } from "./field-format-utils";
import { buildJobCloseoutBillingReviewPacket } from "./job-closeout-billing-utils.js";
import { EmployeeWorkspacePage, ForemanWorkspacePage } from "./field-workspace-page-components";
import { deriveJobOperationsFinishState } from "./job-operations-finish-utils";
import { JobCalculationsCard, JobPilotHandoffReadinessCard, JobPlannerCard, JobStartupChecklistCard } from "./job-route-components";
import { deriveJobListState, jobNextStep, jobStatusLabel, jobTitle, normalizeJobStatus } from "./job-utils";
import { deriveToolChecklistJobReadiness } from "./tool-checklist-utils";
import { getCrewAssignmentOptions, getForemanAssignmentOptions } from "./user-utils";
import { JOB_STARTUP_STATUSES, getStartupCriticalWarnings, normalizeStartupChecklist } from "../shared/jobStartup.js";

function normalizeObjectArray(value, fallback = []) {
  if (Array.isArray(value)) {
    return value.filter((item) => item && typeof item === "object");
  }
  if (Array.isArray(fallback)) {
    return fallback.filter((item) => item && typeof item === "object");
  }
  return [];
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

function formatReviewMoney(value = 0) {
  const amount = Number(value || 0);
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  });
}

function todayDateInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function dailyReportRecordJobId(record = {}) {
  return record.jobId || record.linkedJobId || record.job?.id || "";
}

function SaveStateText({ saveState, align = "left" }) {
  const palette = {
    idle: "text-slate-400",
    pending: "text-amber-600",
    saving: "text-blue-700",
    saved: "text-emerald-700",
    error: "text-red-700",
  };
  const state = saveState || { status: "idle", message: "" };

  return (
    <p className={`text-xs font-black uppercase tracking-[0.14em] ${palette[state.status] || palette.idle} ${align === "right" ? "text-right" : ""}`}>
      {state.message}
    </p>
  );
}

function TimestampMeta({ createdAt, updatedAt }) {
  return (
    <div className="grid gap-2 rounded-2xl border border-blue-100 bg-blue-50/60 p-3 text-xs text-slate-600 md:grid-cols-2">
      <div>
        <p className="font-black uppercase tracking-[0.14em] text-slate-400">Created</p>
        <p className="mt-1 font-bold text-slate-700">{formatDateTime(createdAt)}</p>
      </div>
      <div>
        <p className="font-black uppercase tracking-[0.14em] text-slate-400">Last updated</p>
        <p className="mt-1 font-bold text-slate-700">{formatDateTime(updatedAt)}</p>
      </div>
    </div>
  );
}

export function StartupStatusBadge({ status }) {
  const normalizedStatus = JOB_STARTUP_STATUSES.includes(status) ? status : "Not Started";
  let tone = "slate";
  if (["Ready for Field", "Completed"].includes(normalizedStatus)) tone = "green";
  if (normalizedStatus === "In Progress") tone = "blue";
  if (normalizedStatus === "Needs Review") tone = "amber";
  return <Badge tone={tone}>{normalizedStatus}</Badge>;
}

const JOB_ASSIGNMENT_ROLE_OPTIONS = [
  { value: "crew", label: "Crew" },
  { value: "operator", label: "Operator" },
  { value: "finisher", label: "Finisher" },
  { value: "laborer", label: "Laborer" },
  { value: "driver", label: "Driver" },
  { value: "other", label: "Other" },
];

function jobAssignmentRoleLabel(role) {
  const matched = JOB_ASSIGNMENT_ROLE_OPTIONS.find((option) => option.value === role);
  if (matched) return matched.label;
  if (role === "foreman") return "Foreman";
  return role || "Crew";
}

function AssignmentNoticeStatus({ assignment }) {
  if (!assignment) return null;
  if (assignment.noticeAcknowledged) {
    return <Badge tone="green">Acknowledged {formatDateTime(assignment.noticeAcknowledgedAt)}</Badge>;
  }
  return <Badge tone="amber">Needs acknowledgement</Badge>;
}

function JobCrewSection({
  job,
  users,
  disabled,
  canManageAssignments,
  onChangeForeman,
  onAddAssignment,
  onUpdateAssignment,
  onRemoveAssignment,
}) {
  const [foremanDraft, setForemanDraft] = useState(job?.foremanAssignment?.userId || job?.assignedForemanId || "");
  const [crewDraft, setCrewDraft] = useState({
    userId: "",
    roleOnJob: "crew",
    notes: "",
  });

  useEffect(() => {
    setForemanDraft(job?.foremanAssignment?.userId || job?.assignedForemanId || "");
    setCrewDraft({
      userId: "",
      roleOnJob: "crew",
      notes: "",
    });
  }, [job?.assignedForemanId, job?.foremanAssignment?.userId, job?.id]);

  const foremen = getForemanAssignmentOptions(users);
  const crewUsers = getCrewAssignmentOptions(users);
  const visibleCrew = job?.crewAssignments || [];
  const foremanAssignment = job?.foremanAssignment || null;

  function handleAddAssignment(event) {
    event.preventDefault();
    if (!crewDraft.userId) return;
    onAddAssignment(crewDraft);
    setCrewDraft({
      userId: "",
      roleOnJob: "crew",
      notes: "",
    });
  }

  return (
    <div className="space-y-3 rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black text-slate-950">Crew assignments</p>
          <p className="mt-1 text-xs text-slate-500">
            {canManageAssignments ? "Assign the foreman and crew so scheduled jobs show on field users' phones." : "View the field-safe crew assigned to this job."}
          </p>
        </div>
        <Badge tone={visibleCrew.length > 0 || foremanAssignment ? "blue" : "slate"}>
          {foremanAssignment ? `${visibleCrew.length} crew + foreman` : `${visibleCrew.length} crew`}
        </Badge>
      </div>

      <div className="rounded-2xl border border-blue-100 bg-white p-3">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Assigned foreman</p>
        {canManageAssignments ? (
          <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-end">
            <SelectField label="Foreman" value={foremanDraft} onChange={(event) => setForemanDraft(event.target.value)} className="w-full">
              <option value="">Unassigned</option>
              {foremen.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
            </SelectField>
            <Button
              type="button"
              size="sm"
              className="md:mb-0.5"
              onClick={() => onChangeForeman(foremanDraft)}
              disabled={disabled || foremanDraft === (foremanAssignment?.userId || "")}
            >
              Save foreman
            </Button>
          </div>
        ) : (
          <div className="mt-3 rounded-2xl border border-blue-100 bg-blue-50/60 p-3">
            <p className="font-black text-slate-950">{foremanAssignment?.userName || "No foreman assigned"}</p>
            <p className="mt-1 text-xs text-slate-500">{foremanAssignment ? `${foremanAssignment.userRole} - ${jobAssignmentRoleLabel(foremanAssignment.roleOnJob)}` : "Scheduling will appear here when a foreman is assigned."}</p>
          </div>
        )}
        {foremanAssignment ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <AssignmentNoticeStatus assignment={foremanAssignment} />
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl border border-blue-100 bg-white p-3">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Assigned crew</p>
        <p className="mt-1 text-xs text-slate-500">Crew roles stay field-safe for foremen and employees.</p>

        {visibleCrew.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-dashed border-blue-200 bg-blue-50 p-4 text-sm text-slate-500">No crew assigned yet.</div>
        ) : (
          <div className="mt-3 space-y-2">
            {visibleCrew.map((assignment) => (
              <div key={assignment.id} className="rounded-2xl border border-blue-100 bg-blue-50/60 p-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-black text-slate-950">{assignment.userName}</p>
                    <p className="mt-1 text-xs text-slate-500">{assignment.userRole || "Field user"} - Assigned {formatDateTime(assignment.assignedAt)}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <AssignmentNoticeStatus assignment={assignment} />
                    </div>
                  </div>
                  {canManageAssignments ? (
                    <div className="flex flex-col gap-2 md:flex-row md:items-end">
                      <SelectField label="Role" value={assignment.roleOnJob} onChange={(event) => onUpdateAssignment(assignment.id, { roleOnJob: event.target.value })}>
                        {JOB_ASSIGNMENT_ROLE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        <option value="foreman">Foreman</option>
                      </SelectField>
                      <Button type="button" variant="ghost" size="sm" className="md:mb-0.5" onClick={() => onRemoveAssignment(assignment.id)} disabled={disabled}>Remove</Button>
                    </div>
                  ) : (
                    <Badge tone="slate">{jobAssignmentRoleLabel(assignment.roleOnJob)}</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {canManageAssignments ? (
          <form className="mt-4 grid gap-3 border-t border-blue-100 pt-4" onSubmit={handleAddAssignment}>
            <div className="grid gap-3 md:grid-cols-[1.4fr_1fr]">
              <SelectField label="Crew member" value={crewDraft.userId} onChange={(event) => setCrewDraft((current) => ({ ...current, userId: event.target.value }))}>
                <option value="">Select employee</option>
                {crewUsers.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
              </SelectField>
              <SelectField label="Role on job" value={crewDraft.roleOnJob} onChange={(event) => setCrewDraft((current) => ({ ...current, roleOnJob: event.target.value }))}>
                {JOB_ASSIGNMENT_ROLE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </SelectField>
            </div>
            <TextAreaField label="Assignment note" value={crewDraft.notes} onChange={(event) => setCrewDraft((current) => ({ ...current, notes: event.target.value }))} placeholder="Optional staging or specialty detail." />
            <p className="text-xs font-bold leading-5 text-slate-500">Tip: add a scheduled start and field notes so assigned employees know where to be next.</p>
            <Button type="submit" disabled={disabled || !crewDraft.userId}>
              <Icon name="plus" />
              Add crew member
            </Button>
          </form>
        ) : null}
      </div>
    </div>
  );
}

function JobDetailPanel({
  job,
  users,
  onFieldChange,
  onArchive,
  onRestore,
  onDelete,
  onChangeForeman,
  onAddAssignment,
  onUpdateAssignment,
  onRemoveAssignment,
  saveState,
  disabled,
  permissions,
  onPrintPacket,
}) {
  if (!job) {
    return (
      <Card className="p-5">
        <SectionHeader title="Job details" description="Select a job to update scheduling, field progress, and execution notes." />
        <div className="rounded-2xl border border-dashed border-blue-200 bg-blue-50 p-6 text-center text-sm text-slate-500">Choose a job from the table to keep the field and office teams aligned.</div>
      </Card>
    );
  }

  const canManageAll = permissions?.jobs?.canManageAll;
  const canManageField = job.canManageField || canManageAll;
  const canEditField = Boolean(canManageField);
  const canArchive = Boolean(canManageAll);
  const canManageAssignments = Boolean(permissions?.jobs?.canManageAssignments);
  const notesValue = canManageAll ? (job.notes || "") : (job.fieldNotes || "");
  const statusValue = normalizeJobStatus(job.status || job.stage);
  const isConvertedEstimateJob = canManageAll && /Created from approved estimate/i.test(job.notes || "");

  return (
    <Card className="p-5">
      <SectionHeader
        title={jobTitle(job)}
        description={`${job.id} - ${job.customer}`}
        action={
          <div className="flex flex-wrap gap-2">
            {!canManageAll ? <Badge tone="slate">Field view</Badge> : null}
            {job.archivedAt ? <Badge tone="slate">Archived</Badge> : null}
            {(canManageAll || job.canManageField || permissions?.jobs?.canViewMoney) ? <Button variant="secondary" size="sm" onClick={onPrintPacket} disabled={disabled || typeof onPrintPacket !== "function"}>Print Job Packet</Button> : null}
            {job.archivedAt ? (
              <>
                <Button variant="secondary" size="sm" onClick={onRestore} disabled={disabled || !canArchive}>Restore</Button>
                <Button variant="danger" size="sm" onClick={onDelete} disabled={disabled || !canArchive}>Delete</Button>
              </>
            ) : (
              <Button variant="secondary" size="sm" onClick={onArchive} disabled={disabled || !canArchive}>Archive</Button>
            )}
          </div>
        }
      />
      <SaveStateText saveState={saveState} />
      <div className="grid gap-3">
        <TimestampMeta createdAt={job.createdAt} updatedAt={job.updatedAt} />
        {isConvertedEstimateJob ? (
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold leading-6 text-emerald-800">
            Job created from an approved estimate. Next step: set scheduled start/end, confirm the address, and assign foreman/crew.
          </div>
        ) : null}
        {canManageAll ? <JobPilotHandoffReadinessCard job={job} /> : null}
        {canManageAll ? (
          <JobStartupChecklistCard job={job} onFieldChange={onFieldChange} disabled={disabled} />
        ) : null}
        <div className="grid gap-3 md:grid-cols-2">
          <InputField label="Job name" value={jobTitle(job)} onChange={(event) => onFieldChange("title", event.target.value)} disabled={!canManageAll || disabled} />
          <InputField label="Customer" value={job.customer} onChange={(event) => onFieldChange("customer", event.target.value)} disabled={!canManageAll || disabled} />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <SelectField label="Status" value={statusValue} onChange={(event) => onFieldChange("status", event.target.value)} disabled={!canEditField || disabled}>
            <option value="draft">Draft</option>
            <option value="planned">Planned</option>
            <option value="scheduled">Scheduled</option>
            <option value="in_progress">In Progress</option>
            <option value="field_complete">Field Complete</option>
            <option value="completed">Completed</option>
            {canManageAll ? <option value="billing_ready">Billing Ready</option> : null}
            {canManageAll ? <option value="closed">Closed</option> : null}
          </SelectField>
          <InputField label="Scheduled start" type="datetime-local" value={job.scheduledStart || ""} onChange={(event) => onFieldChange("scheduledStart", event.target.value)} disabled={!canManageAll || disabled} />
        </div>
        {canManageAll ? (
          <div className="grid gap-3 md:grid-cols-2">
            <InputField label="Scheduled end (optional)" type="datetime-local" value={job.scheduledEnd || ""} onChange={(event) => onFieldChange("scheduledEnd", event.target.value)} disabled={disabled} />
            <InputField label="Estimated duration" value={job.estimatedDuration || ""} onChange={(event) => onFieldChange("estimatedDuration", event.target.value)} disabled={disabled} />
          </div>
        ) : null}
        <label className="field-label">
          <span>Progress ({job.progress}%)</span>
          <input className="w-full accent-blue-700" type="range" min="0" max="100" value={job.progress} onChange={(event) => onFieldChange("progress", Number(event.target.value))} disabled={!canEditField || disabled} />
        </label>
        <InputField label="Next step" value={jobNextStep(job)} onChange={(event) => onFieldChange("nextStep", event.target.value)} disabled={!canEditField || disabled} />
        <div className="grid gap-3 md:grid-cols-2">
          <InputField label="Job address" value={job.address || ""} onChange={(event) => onFieldChange("address", event.target.value)} disabled={!canManageAll || disabled} />
          <InputField label="Site contact" value={job.siteContact || ""} onChange={(event) => onFieldChange("siteContact", event.target.value)} disabled={!canManageAll || disabled} />
        </div>
        <TextAreaField label="Scope summary" value={job.scopeSummary || ""} onChange={(event) => onFieldChange("scopeSummary", event.target.value)} disabled={!canManageAll || disabled} />
        {canManageAll ? (
          <>
            <div className="grid gap-3 md:grid-cols-2">
              <InputField label="Crew" value={job.crew || ""} onChange={(event) => onFieldChange("crew", event.target.value)} disabled={disabled} />
              <InputField label="Crew size needed" type="number" min="0" value={job.crewSizeNeeded || 0} onChange={(event) => onFieldChange("crewSizeNeeded", Number(event.target.value))} disabled={disabled} />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="field-label">
                <span>Foreman planning visible</span>
                <input type="checkbox" checked={Boolean(job.fieldPlanningVisible)} onChange={(event) => onFieldChange("fieldPlanningVisible", event.target.checked)} disabled={disabled} />
              </label>
              <label className="field-label">
                <span>Visible to foreman</span>
                <input type="checkbox" checked={Boolean(job.visibleToForeman)} onChange={(event) => onFieldChange("visibleToForeman", event.target.checked)} disabled={disabled} />
              </label>
            </div>
            <TextAreaField label="Equipment notes" value={job.equipmentNotes || ""} onChange={(event) => onFieldChange("equipmentNotes", event.target.value)} disabled={disabled} />
          </>
        ) : null}
        <TextAreaField label="Safety notes" value={job.safetyNotes || ""} onChange={(event) => onFieldChange("safetyNotes", event.target.value)} disabled={!canManageAll || disabled} />
        <TextAreaField label="Material notes" value={job.materialNotes || ""} onChange={(event) => onFieldChange("materialNotes", event.target.value)} disabled={!canManageAll || disabled} />
        <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Pre-pour checklist</p>
          <p className="mt-2 text-sm font-bold leading-6 text-slate-700">{job.prePourChecklist?.statusLabel || "Not started"}</p>
        </div>
        <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Post-pour checklist</p>
          <p className="mt-2 text-sm font-bold leading-6 text-slate-700">{job.postPourChecklist?.statusLabel || "Not started"}</p>
        </div>
        <TextAreaField label={canManageAll ? "Office notes (hidden from field)" : "Field notes"} value={notesValue} onChange={(event) => onFieldChange(canManageAll ? "notes" : "fieldNotes", event.target.value)} disabled={!canEditField || disabled} />
        <JobCrewSection
          job={job}
          users={users}
          disabled={disabled}
          canManageAssignments={canManageAssignments}
          onChangeForeman={onChangeForeman}
          onAddAssignment={onAddAssignment}
          onUpdateAssignment={onUpdateAssignment}
          onRemoveAssignment={onRemoveAssignment}
        />
        <JobCalculationsCard calculations={job.calculatorResults} />
      </div>
    </Card>
  );
}

function jobDisplayForeman(job) {
  return job?.foremanAssignment?.userName || job?.assignedForemanName || job?.assignedForemanId || "Unassigned";
}

function jobCrewCount(job) {
  const crewAssignments = Array.isArray(job?.crewAssignments) ? job.crewAssignments.length : 0;
  return crewAssignments || Number(job?.crewSizeNeeded || 0) || 0;
}

function jobMissingCrew(job) {
  return !(job?.foremanAssignment?.userId || job?.assignedForemanId || job?.assignedUserId);
}

function jobMissingStart(job) {
  return !job?.scheduledStart;
}

function jobBoardScheduleLabel(job) {
  if (!job?.scheduledStart) return "Unscheduled";
  const parsed = new Date(job.scheduledStart);
  if (Number.isNaN(parsed.getTime())) return job.scheduledStart;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}

function jobStartupNeedsReview(job) {
  const startupStatus = job?.startupStatus || "Not Started";
  return ["Not Started", "In Progress", "Needs Review"].includes(startupStatus);
}

export function JobsTablePolished({ rows, selectedId, onSelect, maxRows = 8, mobileMaxRows = null }) {
  const visibleRows = rows.slice(0, maxRows);
  const mobileRows = rows.slice(0, mobileMaxRows || maxRows);

  return (
    <>
      <div className="co-jobs-mobile-list grid gap-3 p-3 md:hidden">
        {mobileRows.map((job) => {
          const selected = job.id === selectedId;
          const progressValue = Math.max(0, Math.min(100, Number(job.progress || 0)));
          const missingCrew = jobMissingCrew(job);
          const missingStart = jobMissingStart(job);
          const startupNeedsReview = jobStartupNeedsReview(job);
          return (
            <button
              key={job.id}
              type="button"
              onClick={() => onSelect(job.id)}
              className={`co-jobs-mobile-card co-mobile-record-card co-office-list-card w-full rounded-[1.15rem] border p-4 text-left transition ${selected ? "is-selected border-orange-200 bg-orange-50/70" : "border-slate-200 bg-white hover:border-orange-200 hover:bg-orange-50/30"}`}
            >
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-words text-base font-black text-slate-950">{jobTitle(job)}</p>
                  <p className="mt-1 break-words text-xs font-bold text-slate-500">{job.id} / {job.customer || "Customer pending"}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <StatusBadge status={jobStatusLabel(job.status || job.stage)} />
                  <StartupStatusBadge status={job.startupStatus || "Not Started"} />
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Scheduled</p>
                  <p className="mt-1 break-words text-sm font-black text-slate-800">{jobBoardScheduleLabel(job)}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Foreman</p>
                  <p className="mt-1 break-words text-sm font-bold text-slate-700">{jobDisplayForeman(job)}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Crew</p>
                  <p className="mt-1 break-words text-sm font-bold text-slate-700">{jobCrewCount(job)} assigned/needed</p>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Next step</p>
                  <p className="mt-1 break-words text-sm font-bold text-slate-700">{jobNextStep(job)}</p>
                </div>
              </div>
              <div className="co-jobs-mobile-readiness">
                <span data-state={missingCrew ? "needs" : "ready"}>Crew <strong>{missingCrew ? "Needs" : "OK"}</strong></span>
                <span data-state={missingStart ? "needs" : "ready"}>Start <strong>{missingStart ? "Needs" : "OK"}</strong></span>
                <span data-state={startupNeedsReview ? "needs" : "ready"}>Startup <strong>{startupNeedsReview ? "Review" : "OK"}</strong></span>
              </div>
              <div className="mt-4 flex min-w-0 items-center gap-3">
                <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-orange-600" style={{ width: `${progressValue}%` }} />
                </div>
                <span className="shrink-0 text-xs font-black text-slate-500">{progressValue}%</span>
                {selected ? <Badge tone="blue">Selected</Badge> : null}
              </div>
            </button>
          );
        })}
      </div>
      <div className="hidden md:block">
        <div className="table-shell">
          <table className="co-jobs-command-table w-full min-w-[780px] text-left">
            <thead>
              <tr>
                <th>Job / Customer</th>
                <th>Status</th>
                <th>Schedule</th>
                <th>Startup</th>
                <th>Crew</th>
                <th>Next Step</th>
                <th>Progress</th>
                <th className="text-right">Open</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((job) => {
                const selected = job.id === selectedId;
                const progressValue = Math.max(0, Math.min(100, Number(job.progress || 0)));
                return (
                  <tr key={job.id} onClick={() => onSelect(job.id)} className={`cursor-pointer transition hover:bg-orange-50/45 ${selected ? "bg-orange-50/70" : ""}`}>
                    <td>
                      <p className="font-black text-slate-950">{jobTitle(job)}</p>
                      <p className="text-xs font-bold text-slate-500">{job.id} / {job.customer || "Customer pending"}</p>
                    </td>
                    <td><StatusBadge status={jobStatusLabel(job.status || job.stage)} /></td>
                    <td className="font-bold text-slate-700">{jobBoardScheduleLabel(job)}</td>
                    <td><StartupStatusBadge status={job.startupStatus || "Not Started"} /></td>
                    <td className="co-jobs-crew-cell">
                      <p className="font-bold text-slate-700">{jobDisplayForeman(job)}</p>
                      <p className="text-xs font-bold text-slate-500">{jobCrewCount(job)} assigned/needed</p>
                    </td>
                    <td className="font-bold text-slate-700">{jobNextStep(job)}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-orange-600" style={{ width: `${progressValue}%` }} />
                        </div>
                        <span className="text-xs font-black text-slate-500">{progressValue}%</span>
                      </div>
                    </td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <button type="button" className="co-jobs-icon-button" onClick={(event) => { event.stopPropagation(); onSelect(job.id); }} aria-label={`Select ${jobTitle(job)}`}>
                          <Icon name="arrowUpRight" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function JobCommandRailPolished({
  job,
  permissions,
  billingMode = false,
  closeoutBillingRow = null,
  toolChecklistBlockerCount = 0,
  disabled,
  saveState,
  onArchive,
  onRestore,
  onDelete,
  onPrintPacket,
  onOpenTool,
  onOpenModule,
}) {
  if (!job) {
    return (
      <div className="co-jobs-right-rail space-y-4">
        <Card className="co-jobs-rail-card p-4">
          <SectionHeader title="Selected job summary" description="Choose a job from the board to review schedule, startup, crew, and field actions." />
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-sm font-bold text-slate-500">No job selected.</div>
        </Card>
      </div>
    );
  }

  const canManageAll = Boolean(permissions?.jobs?.canManageAll);
  const canPrint = canManageAll || job.canManageField || permissions?.jobs?.canViewMoney;
  const canArchive = canManageAll;
  const startupWarnings = getStartupCriticalWarnings(normalizeStartupChecklist(job.startupChecklist));
  const progressValue = Math.max(0, Math.min(100, Number(job.progress || 0)));
  const missingCrew = jobMissingCrew(job);
  const missingStart = jobMissingStart(job);
  const startupNeedsReview = jobStartupNeedsReview(job);
  const isBillingReadyJob = normalizeJobStatus(job.status || job.stage) === "billing_ready";
  const hasToolBlockers = Number(toolChecklistBlockerCount || 0) > 0;
  const billingPrep = closeoutBillingRow?.billingPrep || null;
  const proofMissingCount = billingPrep?.proofStatus?.missing?.length || 0;
  const approvedChangeCount = billingPrep?.approvedChangesIncluded?.count || 0;

  return (
    <div className="co-jobs-right-rail space-y-4">
      <Card className="co-jobs-rail-card p-4">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Selected Job Summary</p>
            <h3 className="mt-2 break-words text-xl font-black text-slate-950">{jobTitle(job)}</h3>
            <p className="mt-1 break-words text-xs font-bold text-slate-500">{job.id} / {job.customer || "Customer pending"}</p>
          </div>
          <StatusBadge status={jobStatusLabel(job.status || job.stage)} />
        </div>
        <div className="co-jobs-selected-metrics">
          <div>
            <span>Schedule</span>
            <strong>{jobBoardScheduleLabel(job)}</strong>
          </div>
          <div>
            <span>Foreman</span>
            <strong>{jobDisplayForeman(job)}</strong>
          </div>
          <div>
            <span>Crew</span>
            <strong>{jobCrewCount(job)} assigned/needed</strong>
          </div>
          <div>
            <span>Startup blockers</span>
            <strong>{startupWarnings.length}</strong>
          </div>
        </div>
        <div className="co-jobs-progress-panel">
          <div className="flex items-center justify-between gap-3">
            <span>Progress</span>
            <strong>{progressValue}%</strong>
          </div>
          <div><span style={{ width: `${progressValue}%` }} /></div>
          <p>{jobNextStep(job)}</p>
        </div>
        {billingMode || isBillingReadyJob ? (
          <div className="co-jobs-money-panel">
            <span>Ready-to-bill review</span>
            <strong>{billingPrep?.whatCanBeBilled?.label || (isBillingReadyJob ? "Manual closeout queue" : "Closeout context")}</strong>
            <p>{billingPrep?.nextAction || "Confirm reports, photo evidence, delivery tickets, and office notes before finance takes the next step outside Apex HQ. This panel is readiness context only."}</p>
            {billingPrep ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge tone={closeoutBillingRow.readyForBillingReview ? "green" : "amber"}>{closeoutBillingRow.readyForBillingReview ? "Closeout ready" : "Blocked"}</Badge>
                <Badge tone={proofMissingCount ? "amber" : "green"}>{proofMissingCount} proof gaps</Badge>
                <Badge tone={approvedChangeCount ? "blue" : "slate"}>{approvedChangeCount} approved changes</Badge>
                <Badge tone={billingPrep.canPrepareManualInvoice ? "green" : "amber"}>{billingPrep.canPrepareManualInvoice ? "Invoice prep ready" : "Invoice prep blocked"}</Badge>
              </div>
            ) : null}
          </div>
        ) : null}
        <div className="co-jobs-release-pills">
          <span data-state={missingCrew ? "needs" : "ready"}>Crew <strong>{missingCrew ? "Needs" : "OK"}</strong></span>
          <span data-state={missingStart ? "needs" : "ready"}>Start <strong>{missingStart ? "Needs" : "OK"}</strong></span>
          <span data-state={startupNeedsReview ? "needs" : "ready"}>Startup <strong>{startupNeedsReview ? "Review" : "OK"}</strong></span>
          <span data-state={hasToolBlockers ? "needs" : "ready"}>Tools <strong>{hasToolBlockers ? `${toolChecklistBlockerCount} gaps` : "OK"}</strong></span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button type="button" size="sm" onClick={() => onOpenTool("details")}>Edit Job</Button>
          <Button type="button" size="sm" variant="secondary" onClick={() => onOpenTool("startup")}>Startup</Button>
          <Button type="button" size="sm" variant="secondary" onClick={() => onOpenTool("crew")}>Crew</Button>
          <Button type="button" size="sm" variant="secondary" onClick={onPrintPacket} disabled={disabled || !canPrint || typeof onPrintPacket !== "function"}>Print</Button>
        </div>
        <SaveStateText saveState={saveState} />
      </Card>

      <Card className="co-jobs-rail-card p-4">
        <SectionHeader title="Readiness" description="Crew, start date, and startup review stay visible before release to field." />
        <div className="grid gap-2">
          <div className="co-jobs-readiness-row">
            <span>Foreman / crew assigned</span>
            <Badge tone={jobMissingCrew(job) ? "amber" : "green"}>{jobMissingCrew(job) ? "Needs" : "OK"}</Badge>
          </div>
          <div className="co-jobs-readiness-row">
            <span>Start date set</span>
            <Badge tone={jobMissingStart(job) ? "amber" : "green"}>{jobMissingStart(job) ? "Needs" : "OK"}</Badge>
          </div>
          <div className="co-jobs-readiness-row">
            <span>Startup reviewed</span>
            <StartupStatusBadge status={job.startupStatus || "Not Started"} />
          </div>
          <div className="co-jobs-readiness-row">
            <span>Tool loadout ready</span>
            <Badge tone={hasToolBlockers ? "amber" : "green"}>{hasToolBlockers ? `${toolChecklistBlockerCount} gaps` : "OK"}</Badge>
          </div>
          <div className="co-jobs-readiness-row">
            <span>Visible to field</span>
            <Badge tone={job.visibleToForeman || job.fieldPlanningVisible ? "green" : "slate"}>{job.visibleToForeman || job.fieldPlanningVisible ? "Yes" : "No"}</Badge>
          </div>
        </div>
      </Card>

      <Card className="co-jobs-rail-card p-4">
        <SectionHeader title="Job actions" description="Jump to the operational records that support the selected job." />
        <div className="grid gap-2">
          <button type="button" className="co-jobs-action-row" onClick={() => onOpenModule?.("reports")}>
            <span>Daily reports</span>
            <Icon name="document" />
          </button>
          <button type="button" className="co-jobs-action-row" onClick={() => onOpenModule?.("uploads")}>
            <span>Uploads / photos</span>
            <Icon name="upload" />
          </button>
          <button type="button" className="co-jobs-action-row" onClick={() => onOpenModule?.("deliveryTickets")}>
            <span>Delivery tickets</span>
            <Icon name="clipboard" />
          </button>
          <button type="button" className="co-jobs-action-row" onClick={() => onOpenModule?.("toolChecklist")}>
            <span>Tool checklist</span>
            <Icon name="layers" />
          </button>
          {job.archivedAt ? (
            <>
              <button type="button" className="co-jobs-action-row" onClick={onRestore} disabled={disabled || !canArchive}>
                <span>Restore job</span>
                <Icon name="refresh" />
              </button>
              <button type="button" className="co-jobs-action-row" onClick={onDelete} disabled={disabled || !canArchive}>
                <span>Delete job</span>
                <Icon name="alert" />
              </button>
            </>
          ) : (
            <button type="button" className="co-jobs-action-row" onClick={onArchive} disabled={disabled || !canArchive}>
              <span>Archive job</span>
              <Icon name="database" />
            </button>
          )}
        </div>
      </Card>
    </div>
  );
}

function jobNorthStarTone(job, proofState = {}, safetyCount = 0, toolCount = 0) {
  if (safetyCount > 0) return "red";
  if (toolCount > 0 || jobMissingCrew(job) || jobMissingStart(job) || jobStartupNeedsReview(job) || proofState.missingCount > 0) return "orange";
  if (normalizeJobStatus(job?.status || job?.stage) === "billing_ready") return "green";
  if (normalizeJobStatus(job?.status || job?.stage) === "in_progress") return "blue";
  return "slate";
}

function jobNorthStarNextAction(job, proofState = {}, safetyCount = 0, toolCount = 0) {
  if (safetyCount > 0) return "Review safety";
  if (toolCount > 0) return "Resolve tools";
  if (jobMissingCrew(job)) return "Assign crew";
  if (jobMissingStart(job)) return "Set start";
  if (jobStartupNeedsReview(job)) return "Review startup";
  if (proofState.missingCount > 0) return "Collect proof";
  if (normalizeJobStatus(job?.status || job?.stage) === "billing_ready") return "Ready to bill";
  return "Open job";
}

function jobNorthStarProofState(job, reportJobIds = new Set(), uploadJobIds = new Set(), ticketJobIds = new Set()) {
  const jobId = job?.id || "";
  const hasReport = Boolean(jobId && reportJobIds.has(jobId));
  const hasPhotos = Boolean(jobId && uploadJobIds.has(jobId));
  const hasTicket = Boolean(jobId && ticketJobIds.has(jobId));
  const missingCount = [hasReport, hasPhotos, hasTicket].filter((value) => !value).length;
  return { hasReport, hasPhotos, hasTicket, missingCount };
}

function JobsCommandWorkbench({
  rows = [],
  selectedJob,
  selectedJobId,
  reportJobIds = new Set(),
  uploadJobIds = new Set(),
  ticketJobIds = new Set(),
  safetyJobIds = new Set(),
  toolChecklistJobIds = new Set(),
  visibleRowsCount,
  startupReviewCount,
  missingCrewCount,
  toolBlockerCount,
  activeFieldCount,
  readyToBillCount,
  jobsNextAction,
  jobsNextDetail,
  permissions,
  onSelectJob,
  onOpenTool,
  onOpenModule,
  onCreateJob,
  onViewBoard,
}) {
  const sortedRows = [...rows]
    .sort((a, b) => {
      const aProof = jobNorthStarProofState(a, reportJobIds, uploadJobIds, ticketJobIds);
      const bProof = jobNorthStarProofState(b, reportJobIds, uploadJobIds, ticketJobIds);
      const aSafety = safetyJobIds.has(a.id) ? 1 : 0;
      const bSafety = safetyJobIds.has(b.id) ? 1 : 0;
      const aTools = toolChecklistJobIds.has(a.id) ? 1 : 0;
      const bTools = toolChecklistJobIds.has(b.id) ? 1 : 0;
      const score = (job, proof, safety, tools) => (
        safety * 40
        + tools * 34
        + (jobMissingCrew(job) ? 30 : 0)
        + (jobMissingStart(job) ? 24 : 0)
        + (jobStartupNeedsReview(job) ? 18 : 0)
        + proof.missingCount * 6
        + (normalizeJobStatus(job.status || job.stage) === "billing_ready" ? 5 : 0)
      );
      return score(b, bProof, bSafety, bTools) - score(a, aProof, aSafety, aTools);
    })
    .slice(0, 5);
  const selectedProof = jobNorthStarProofState(selectedJob, reportJobIds, uploadJobIds, ticketJobIds);
  const selectedSafetyCount = selectedJob?.id && safetyJobIds.has(selectedJob.id) ? 1 : 0;
  const selectedToolCount = selectedJob?.id && toolChecklistJobIds.has(selectedJob.id) ? 1 : 0;
  const selectedSetupReady = selectedJob && !jobMissingCrew(selectedJob) && !jobMissingStart(selectedJob) && !jobStartupNeedsReview(selectedJob);
  const selectedFieldReady = selectedJob && selectedSetupReady && !selectedToolCount && (selectedJob.visibleToForeman || selectedJob.fieldPlanningVisible || normalizeJobStatus(selectedJob.status || selectedJob.stage) === "in_progress");
  const selectedFromEstimate = Boolean(selectedJob?.estimateId || selectedJob?.sourceEstimateId || /Created from approved estimate/i.test(selectedJob?.notes || ""));
  const selectedBillingReady = selectedJob && normalizeJobStatus(selectedJob.status || selectedJob.stage) === "billing_ready";
  const bridgeSteps = [
    { label: "Estimate", value: selectedFromEstimate ? "Linked" : "Manual", state: selectedFromEstimate ? "ready" : "neutral" },
    { label: "Setup", value: selectedSetupReady ? "Ready" : "Needs", state: selectedSetupReady ? "ready" : "needs" },
    { label: "Field handoff", value: selectedFieldReady ? "Visible" : "Prep", state: selectedFieldReady ? "ready" : "needs" },
    { label: "Tools", value: selectedToolCount ? "Blocked" : "Ready", state: selectedToolCount ? "needs" : "ready" },
    { label: "Proof", value: selectedProof.missingCount === 0 ? "Complete" : `${selectedProof.missingCount} gaps`, state: selectedProof.missingCount === 0 ? "ready" : "needs" },
    { label: "Billing", value: selectedBillingReady ? "Ready" : "Later", state: selectedBillingReady ? "ready" : "neutral" },
  ];
  const priorities = [
    { value: missingCrewCount, label: "crew gaps", tone: missingCrewCount ? "orange" : "green" },
    { value: startupReviewCount, label: "startup reviews", tone: startupReviewCount ? "orange" : "green" },
    { value: toolBlockerCount, label: "tool blockers", tone: toolBlockerCount ? "orange" : "green" },
    { value: readyToBillCount, label: "ready to bill", tone: readyToBillCount ? "green" : "slate" },
  ];
  const actions = [
    { label: "Review job board", icon: "briefcase", onClick: onViewBoard },
    selectedJob ? { label: "Open startup", icon: "clipboard", onClick: () => onOpenTool?.("startup") } : null,
    selectedJob ? { label: "Open photos", icon: "upload", onClick: () => onOpenModule?.("uploads") } : null,
  ].filter(Boolean);

  return (
    <CommandPageFrame
      className="co-jobs-northstar-frame"
      rail={(
        <AssistantRail
          eyebrow="Job Assistant"
          title="Operations"
          description={jobsNextDetail}
          priorities={priorities}
          actions={actions}
        />
      )}
    >
      <section className="co-jobs-command-workbench" aria-label="Job operations command board">
        <div className="co-jobs-command-workbench-head">
          <div className="min-w-0">
            <p>Job Command</p>
            <h2>Jobs moving from setup to field proof</h2>
            <span>{jobsNextAction}</span>
          </div>
          <div className="co-jobs-command-workbench-actions">
            <Button type="button" size="sm" variant="secondary" onClick={onViewBoard}>Open board</Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => onOpenModule?.("reports")}>Reports</Button>
            {permissions?.jobs?.canCreate ? <Button type="button" size="sm" onClick={onCreateJob}>Create job</Button> : null}
          </div>
        </div>
        <div className="co-jobs-command-metrics">
          <span><strong>{visibleRowsCount}</strong> active jobs</span>
          <span data-tone={missingCrewCount ? "orange" : "green"}><strong>{missingCrewCount}</strong> crew gaps</span>
          <span data-tone={startupReviewCount ? "orange" : "green"}><strong>{startupReviewCount}</strong> startup</span>
          <span data-tone={toolBlockerCount ? "orange" : "green"}><strong>{toolBlockerCount}</strong> tools</span>
          <span data-tone={activeFieldCount ? "green" : "slate"}><strong>{activeFieldCount}</strong> in field</span>
          <span data-tone={readyToBillCount ? "green" : "slate"}><strong>{readyToBillCount}</strong> ready bill</span>
        </div>
        <div className="co-jobs-command-grid">
          <div className="co-jobs-flow-list">
            <div className="co-jobs-flow-head">
              <span>Primary work queue</span>
              <em>{rows.length} filtered</em>
            </div>
            {sortedRows.length > 0 ? sortedRows.map((job) => {
              const proof = jobNorthStarProofState(job, reportJobIds, uploadJobIds, ticketJobIds);
              const safetyCount = job?.id && safetyJobIds.has(job.id) ? 1 : 0;
              const toolCount = job?.id && toolChecklistJobIds.has(job.id) ? 1 : 0;
              const tone = jobNorthStarTone(job, proof, safetyCount, toolCount);
              const selected = job.id === selectedJobId;
              return (
                <WorkQueueCard
                  key={job.id}
                  eyebrow={jobBoardScheduleLabel(job)}
                  title={jobTitle(job)}
                  meta={`${job.customer || "Customer pending"} / ${job.city || job.address || "Location pending"}`}
                  status={jobStatusLabel(job.status || job.stage)}
                  tone={tone}
                  selected={selected}
                  actionLabel={jobNorthStarNextAction(job, proof, safetyCount, toolCount)}
                  onClick={() => onSelectJob?.(job.id)}
                >
                  <div className="co-jobs-flow-facts">
                    <span>Crew <strong>{jobMissingCrew(job) ? "Needs" : jobDisplayForeman(job)}</strong></span>
                    <span data-state={toolCount ? "needs" : "ready"}>Tools <strong>{toolCount ? "Blocked" : "Ready"}</strong></span>
                    <span data-state={proof.missingCount ? "needs" : "ready"}>Proof <strong>{proof.missingCount ? `${proof.missingCount} gaps` : "Ready"}</strong></span>
                    <span data-state={safetyCount ? "blocker" : "ready"}>Safety <strong>{safetyCount ? "Review" : "Clear"}</strong></span>
                    <span data-state={normalizeJobStatus(job.status || job.stage) === "billing_ready" ? "ready" : "neutral"}>Billing <strong>{normalizeJobStatus(job.status || job.stage) === "billing_ready" ? "Ready" : "Later"}</strong></span>
                  </div>
                </WorkQueueCard>
              );
            }) : (
              <StateCard title="No jobs match this view" description="Adjust filters or create a job to bring active work into the operations board." tone="blue" />
            )}
          </div>
          <div className="co-jobs-bridge-panel">
            <div className="co-jobs-bridge-head">
              <span>Selected job bridge</span>
              {selectedJob ? <StatusBadge status={jobStatusLabel(selectedJob.status || selectedJob.stage)} /> : <Badge tone="slate">No job</Badge>}
            </div>
            {selectedJob ? (
              <>
                <h3>{jobTitle(selectedJob)}</h3>
                <p>{selectedJob.customer || "Customer pending"} / {selectedJob.address || selectedJob.city || "Location pending"}</p>
                <div className="co-jobs-bridge-steps">
                  {bridgeSteps.map((step) => (
                    <span key={step.label} data-state={step.state}>{step.label}<strong>{step.value}</strong></span>
                  ))}
                </div>
                <div className="co-jobs-bridge-actions">
                  <button type="button" onClick={() => onOpenTool?.("details")}><Icon name="briefcase" />Setup</button>
                  <button type="button" onClick={() => onOpenTool?.("crew")}><Icon name="users" />Crew</button>
                  <button type="button" onClick={() => onOpenModule?.("reports")}><Icon name="document" />Reports</button>
                  <button type="button" onClick={() => onOpenModule?.("uploads")}><Icon name="upload" />Photos</button>
                </div>
              </>
            ) : (
              <StateCard title="Select a job" description="Choose a job from the queue to see setup, field handoff, proof, and ready-to-bill context." tone="slate" />
            )}
          </div>
        </div>
      </section>
    </CommandPageFrame>
  );
}

export function JobsPage({
  ...props
}) {
  return <JobsPagePolished {...props} />;
}

function JobsPagePolished({
  rows,
  user,
  filter,
  setFilter,
  search,
  setSearch,
  customerFilter,
  setCustomerFilter,
  foremanFilter,
  setForemanFilter,
  dateFilter,
  setDateFilter,
  startupFilter,
  setStartupFilter,
  users,
  estimates = [],
  changeOrderRequests = [],
  customers = [],
  rateBookItems = [],
  selectedJobId,
  onSelectJob,
  selectedJob,
  onJobFieldChange,
  jobDraft,
  setJobDraft,
  onCreateJob,
  onArchiveJob,
  onRestoreJob,
  onDeleteJob,
  onChangeForeman,
  onAddAssignment,
  onUpdateAssignment,
  onRemoveAssignment,
  onAcknowledgeAssignmentNotice,
  busy,
  jobSaveState,
  permissions,
  setActive,
  timeEntries,
  dailyReports,
  uploads,
  deliveryTickets,
  prePourChecklists,
  postPourChecklists,
  safetyIncidents,
  toolChecklists,
  currentCompanyId,
  onClockIn,
  onClockOut,
  onStartBreak,
  onEndBreak,
  onPrintJobPacket,
  assistantJobHandoffSeed = null,
  onAssistantJobHandoffSeedHandled = () => {},
}) {
  const isFieldWorkspace = !permissions.jobs.canManageAll && !permissions.leads.canView;

  if (isFieldWorkspace && permissions.jobs.canManageField) {
    return (
      <ForemanWorkspacePage
        rows={rows}
        user={user}
        selectedJobId={selectedJobId}
        onSelectJob={onSelectJob}
        selectedJob={selectedJob}
        onJobFieldChange={onJobFieldChange}
        busy={busy}
        permissions={permissions}
        setActive={setActive}
        timeEntries={timeEntries}
        dailyReports={dailyReports}
        uploads={uploads}
        deliveryTickets={deliveryTickets}
        prePourChecklists={prePourChecklists}
        postPourChecklists={postPourChecklists}
        safetyIncidents={safetyIncidents}
        toolChecklists={toolChecklists}
        currentCompanyId={currentCompanyId}
        onClockIn={onClockIn}
        onClockOut={onClockOut}
        onStartBreak={onStartBreak}
        onEndBreak={onEndBreak}
        onAcknowledgeAssignmentNotice={onAcknowledgeAssignmentNotice}
      />
    );
  }

  if (isFieldWorkspace) {
    return (
      <EmployeeWorkspacePage
        rows={rows}
        user={user}
        selectedJobId={selectedJobId}
        onSelectJob={onSelectJob}
        selectedJob={selectedJob}
        permissions={permissions}
        setActive={setActive}
        timeEntries={timeEntries}
        dailyReports={dailyReports}
        uploads={uploads}
        deliveryTickets={deliveryTickets}
        prePourChecklists={prePourChecklists}
        postPourChecklists={postPourChecklists}
        safetyIncidents={safetyIncidents}
        toolChecklists={toolChecklists}
        currentCompanyId={currentCompanyId}
        onClockIn={onClockIn}
        onClockOut={onClockOut}
        onStartBreak={onStartBreak}
        onEndBreak={onEndBreak}
        onAcknowledgeAssignmentNotice={onAcknowledgeAssignmentNotice}
        busy={busy}
      />
    );
  }

  const [showJobTools, setShowJobTools] = useState(false);
  const [activeJobTool, setActiveJobTool] = useState("create");
  const [jobShellSelectionId, setJobShellSelectionId] = useState("");
  const [jobShellMode, setJobShellMode] = useState("overview");
  const [showAllMobileJobs, setShowAllMobileJobs] = useState(false);
  const jobToolsRef = useRef(null);
  const canUseJobsCommandShell = Boolean(permissions?.jobs?.canManageAll);
  const roleLabel = permissions.jobs.canManageAll ? "office scheduling" : "scope review";
  const pageTitle = "Jobs";
  const pageEyebrow = permissions.jobs.canManageAll ? "Field Ops" : "Job Scope";
  const jobListState = useMemo(() => deriveJobListState(rows, {
    status: filter,
    query: search,
    customer: customerFilter,
    foremanId: foremanFilter,
    date: dateFilter,
  }, users), [customerFilter, dateFilter, filter, foremanFilter, rows, search, users]);
  const visibleRows = jobListState.filteredJobs.filter((job) => startupFilter === "All startup" || (job.startupStatus || "Not Started") === startupFilter);
  const isReadyToBillView = filter === "Billing Ready";
  const liveJobRows = normalizeObjectArray(rows).filter((job) => !job.archivedAt);
  const readyToBillRows = liveJobRows.filter((job) => normalizeJobStatus(job.status || job.stage) === "billing_ready");
  const closeoutBillingPacket = useMemo(() => buildJobCloseoutBillingReviewPacket({
    jobs: liveJobRows,
    estimates,
    dailyReports,
    uploads,
    timeEntries,
    deliveryTickets,
    changeOrderRequests,
    safetyIncidents,
    prePourChecklists,
    postPourChecklists,
    toolChecklists,
    permissions,
  }, { maxJobs: liveJobRows.length + 1 }), [
    changeOrderRequests,
    dailyReports,
    deliveryTickets,
    estimates,
    liveJobRows,
    permissions,
    postPourChecklists,
    prePourChecklists,
    safetyIncidents,
    timeEntries,
    toolChecklists,
    uploads,
  ]);
  const closeoutRowByJobId = useMemo(() => new Map((closeoutBillingPacket.rows || []).map((row) => [row.jobId, row])), [closeoutBillingPacket.rows]);
  const visibleJobIds = new Set(visibleRows.map((job) => job.id).filter(Boolean));
  const visibleReports = normalizeObjectArray(dailyReports).filter((report) => !report.archivedAt && visibleJobIds.has(dailyReportRecordJobId(report)));
  const visibleUploads = normalizeObjectArray(uploads).filter((upload) => !upload.archivedAt && visibleJobIds.has(dailyReportRecordJobId(upload)));
  const visibleTickets = normalizeObjectArray(deliveryTickets).filter((ticket) => !ticket.archivedAt && visibleJobIds.has(dailyReportRecordJobId(ticket)));
  const visibleReportJobIds = new Set(visibleReports.map(dailyReportRecordJobId).filter(Boolean));
  const visibleUploadJobIds = new Set(visibleUploads.map(dailyReportRecordJobId).filter(Boolean));
  const visibleTicketJobIds = new Set(visibleTickets.map(dailyReportRecordJobId).filter(Boolean));
  const visibleSafetyIncidents = normalizeObjectArray(safetyIncidents).filter((incident) => !incident.archivedAt && visibleJobIds.has(dailyReportRecordJobId(incident)));
  const visibleSafetyJobIds = new Set(visibleSafetyIncidents.map(dailyReportRecordJobId).filter(Boolean));
  const toolChecklistReadiness = useMemo(() => deriveToolChecklistJobReadiness(normalizeObjectArray(toolChecklists), liveJobRows, { maxJobs: liveJobRows.length + 1 }), [liveJobRows, toolChecklists]);
  const toolChecklistBlockedJobIds = new Set(toolChecklistReadiness.topJobs.filter((job) => job.blockers.length > 0).map((job) => job.jobId));
  const visibleToolChecklistBlockedJobIds = new Set([...toolChecklistBlockedJobIds].filter((jobId) => visibleJobIds.has(jobId)));
  const jobOperationsFinishState = useMemo(() => deriveJobOperationsFinishState({
    jobs: liveJobRows,
    estimates,
    customers,
    rateBookItems,
    dailyReports,
    uploads,
    deliveryTickets,
    safetyIncidents,
    toolChecklists,
    permissions,
  }), [customers, dailyReports, deliveryTickets, estimates, liveJobRows, permissions, rateBookItems, safetyIncidents, toolChecklists, uploads]);
  const visibleProofBlockers = visibleRows.filter((job) => (
    !visibleReportJobIds.has(job.id)
    || !visibleUploadJobIds.has(job.id)
    || !visibleTicketJobIds.has(job.id)
  ));
  const readyToBillSummaryCards = [
    { label: "Closeout ready", value: closeoutBillingPacket.metrics?.readyForBillingReview || 0, helper: "Office-clean manual billing reviews", icon: "briefcase", tone: closeoutBillingPacket.metrics?.readyForBillingReview ? "green" : "slate" },
    { label: "Manual invoice prep", value: closeoutBillingPacket.metrics?.manualInvoicePrepReady || 0, helper: "Ready for external manual prep only", icon: "document", tone: closeoutBillingPacket.metrics?.manualInvoicePrepReady ? "green" : "amber" },
    { label: "Approved changes", value: formatReviewMoney(closeoutBillingPacket.metrics?.approvedChangeOrderTotal || 0), helper: `${closeoutBillingPacket.metrics?.approvedChangeOrdersIncluded || 0} included change order${(closeoutBillingPacket.metrics?.approvedChangeOrdersIncluded || 0) === 1 ? "" : "s"}`, icon: "refresh", tone: closeoutBillingPacket.metrics?.approvedChangeOrdersIncluded ? "blue" : "slate" },
    { label: "Proof missing", value: closeoutBillingPacket.metrics?.proofMissingItems || 0, helper: "Reports, photos, tickets, safety, or checklist gaps", icon: "clipboard", tone: closeoutBillingPacket.metrics?.proofMissingItems ? "orange" : "green" },
    { label: "Payment prep", value: closeoutBillingPacket.metrics?.manualPaymentPrepReady || 0, helper: "Planning only; no links or charges", icon: "check", tone: closeoutBillingPacket.metrics?.manualPaymentPrepReady ? "green" : "slate" },
  ];
  const visibleJobRowCap = 8;
  const mobileJobPreviewCap = 3;
  const mobileVisibleJobRowCap = showAllMobileJobs ? visibleJobRowCap : mobileJobPreviewCap;
  const startupReviewCount = visibleRows.filter(jobStartupNeedsReview).length;
  const missingCrewCount = visibleRows.filter(jobMissingCrew).length;
  const missingStartCount = visibleRows.filter(jobMissingStart).length;
  const toolBlockerCount = visibleToolChecklistBlockedJobIds.size;
  const activeFieldCount = visibleRows.filter((job) => normalizeJobStatus(job.status || job.stage) === "in_progress").length;
  const canManageJobReadiness = Boolean(permissions?.jobs?.canManageAll);
  const canManageJobAssignments = Boolean(permissions?.jobs?.canManageAssignments);
  const crewActionLabel = canManageJobAssignments ? "Assign crew" : "Review crew";
  const startActionLabel = canManageJobReadiness ? "Set start" : "Review dates";
  const jobKpis = [
    { label: "Jobs", value: visibleRows.length, helper: "Matching current filters", icon: "briefcase", tone: "blue", actionLabel: "View jobs", onAction: () => setFilter("All") },
    { label: "Startup Review", value: startupReviewCount, helper: "Needs office or field prep", icon: "alert", tone: "orange", actionLabel: "Review startup", onAction: () => setStartupFilter("Needs Review") },
    { label: "Missing Crew", value: missingCrewCount, helper: "No foreman or lead assigned", icon: "users", tone: "amber", actionLabel: crewActionLabel, onAction: () => setForemanFilter("All foremen") },
    { label: "Tool Blockers", value: toolBlockerCount, helper: "Missing or damaged loadout issues", icon: "layers", tone: toolBlockerCount ? "amber" : "green", actionLabel: "Open tools", onAction: () => setActive("toolChecklist") },
    { label: "Missing Start", value: missingStartCount, helper: "Date not set", icon: "clock", tone: "red", actionLabel: "View unscheduled", onAction: () => setDateFilter("Unscheduled") },
  ];
  const jobToolTabs = [
    { id: "create", label: "Create Job", count: permissions.jobs.canCreate ? 1 : 0 },
    { id: "details", label: "Edit / Details", count: selectedJob ? 1 : 0 },
    { id: "startup", label: "Startup", count: selectedJob ? getStartupCriticalWarnings(normalizeStartupChecklist(selectedJob.startupChecklist)).length : 0 },
    { id: "crew", label: "Crew", count: selectedJob ? jobCrewCount(selectedJob) : 0 },
  ];

  function openJobTool(toolId = "details") {
    if (canUseJobsCommandShell) {
      setJobShellMode(toolId || "details");
      return;
    }
    setActiveJobTool(toolId);
    setShowJobTools(true);
    window.setTimeout(() => jobToolsRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" }), 0);
  }

  function openMatchingJob(matchJob, toolId = "details") {
    const target = visibleRows.find(matchJob) || liveJobRows.find(matchJob);
    if (target?.id) {
      onSelectJob(target.id);
      openJobTool(toolId);
      return;
    }
    jumpToJobSection("jobs-operations-board");
  }

  useEffect(() => {
    const seed = assistantJobHandoffSeed;
    if (!seed?.nonce || !permissions?.jobs?.canManageAll) return;

    const targetJobId = seed.jobId && liveJobRows.some((job) => job?.id === seed.jobId)
      ? seed.jobId
      : liveJobRows.find(jobStartupNeedsReview)?.id || liveJobRows[0]?.id || "";
    setFilter("All");
    setCustomerFilter("All customers");
    setForemanFilter("All foremen");
    setDateFilter("All dates");
    setStartupFilter("All startup");
    setSearch("");
    if (targetJobId) onSelectJob(targetJobId);
    openJobTool(targetJobId ? "startup" : "details");
    onAssistantJobHandoffSeedHandled(seed.nonce);
  }, [assistantJobHandoffSeed?.nonce, liveJobRows, permissions?.jobs?.canManageAll]);

  function jumpToJobSection(sectionId) {
    if (typeof document === "undefined") return;
    requestAnimationFrame(() => {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function focusNewJob() {
    openJobTool("create");
  }

  const jobsCommandItems = [
    {
      label: "Startup review",
      value: startupReviewCount,
      helper: startupReviewCount ? "Jobs need office or field prep review" : "Startup queue is clear",
      tone: startupReviewCount ? "orange" : "green",
      action: startupReviewCount ? "Review startup" : "Clear",
      onClick: () => startupReviewCount ? openMatchingJob(jobStartupNeedsReview, canManageJobReadiness ? "startup" : "details") : jumpToJobSection("jobs-operations-board"),
    },
    {
      label: "Missing crew",
      value: missingCrewCount,
      helper: missingCrewCount ? "Foreman or lead assignment needed" : "Crew assignment looks ready",
      tone: missingCrewCount ? "amber" : "green",
      action: missingCrewCount ? crewActionLabel : "Clear",
      onClick: () => missingCrewCount ? openMatchingJob(jobMissingCrew, canManageJobAssignments ? "crew" : "details") : jumpToJobSection("jobs-operations-board"),
    },
    {
      label: "Tool blockers",
      value: toolBlockerCount,
      helper: toolBlockerCount ? "Missing or damaged loadouts block dispatch" : "Tool loadouts are clear",
      tone: toolBlockerCount ? "amber" : "green",
      action: toolBlockerCount ? "Open tools" : "Clear",
      onClick: () => toolBlockerCount ? setActive("toolChecklist") : jumpToJobSection("jobs-operations-board"),
    },
    {
      label: "Missing start",
      value: missingStartCount,
      helper: missingStartCount ? "Jobs need a scheduled start" : "Scheduled starts are set",
      tone: missingStartCount ? "amber" : "green",
      action: missingStartCount ? startActionLabel : "Clear",
      onClick: () => {
        if (missingStartCount) {
          setDateFilter("Unscheduled");
          openMatchingJob(jobMissingStart, "details");
          return;
        }
        jumpToJobSection("jobs-operations-board");
      },
    },
    {
      label: "Active field work",
      value: activeFieldCount,
      helper: activeFieldCount ? "Jobs currently moving in field" : "No in-progress jobs in view",
      tone: activeFieldCount ? "green" : "slate",
      action: activeFieldCount ? "View active" : "View board",
      onClick: () => {
        if (activeFieldCount) setFilter("In Progress");
        jumpToJobSection("jobs-operations-board");
      },
    },
  ];
  const jobsNextAction = missingCrewCount
    ? `${canManageJobAssignments ? "Assign" : "Review"} crew before release`
    : toolBlockerCount
      ? "Resolve tool loadout blockers"
    : missingStartCount
      ? `${canManageJobReadiness ? "Set" : "Review"} missing job start dates`
      : startupReviewCount
        ? "Review startup readiness"
        : activeFieldCount
          ? "Check active field work"
          : "Jobs board is clear";
  const jobsNextDetail = missingCrewCount
    ? `${missingCrewCount} job${missingCrewCount === 1 ? "" : "s"} need foreman or lead assignment.`
    : toolBlockerCount
      ? `${toolBlockerCount} job${toolBlockerCount === 1 ? " has" : "s have"} missing or damaged tool loadout blockers.`
    : missingStartCount
      ? `${missingStartCount} job${missingStartCount === 1 ? "" : "s"} need scheduled starts before the field handoff.`
      : startupReviewCount
        ? `${startupReviewCount} job${startupReviewCount === 1 ? "" : "s"} need startup review.`
        : activeFieldCount
          ? `${activeFieldCount} job${activeFieldCount === 1 ? " is" : "s are"} in progress.`
          : "No urgent job setup blockers in the current view.";

  function jobShellDateKey(job) {
    if (!job?.scheduledStart) return "";
    const parsed = new Date(job.scheduledStart);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
    return String(job.scheduledStart || "").slice(0, 10);
  }

  function buildJobShellItem(job, kind = "job", priority = 80) {
    if (!job?.id) return null;
    const proofState = jobNorthStarProofState(job, visibleReportJobIds, visibleUploadJobIds, visibleTicketJobIds);
    const safetyCount = visibleSafetyJobIds.has(job.id) ? 1 : 0;
    const toolCount = visibleToolChecklistBlockedJobIds.has(job.id) ? 1 : 0;
    const missingCrew = jobMissingCrew(job);
    const missingStart = jobMissingStart(job);
    const startupNeedsReview = jobStartupNeedsReview(job);
    const status = normalizeJobStatus(job.status || job.stage);
    const kindLabel = kind === "crew"
      ? "Crew / Start Gap"
      : kind === "startup"
        ? "Startup Review"
        : kind === "billing"
          ? "Ready To Bill"
          : kind === "today"
            ? "Starts Today"
            : kind === "problem"
              ? "Problem"
              : "Active Job";
    const readiness = [
      missingCrew ? "Crew" : "",
      missingStart ? "Start" : "",
      startupNeedsReview ? "Startup" : "",
      toolCount ? "Tools" : "",
      safetyCount ? "Safety" : "",
      proofState.missingCount ? "Proof" : "",
    ].filter(Boolean);

    return {
      id: `job-${job.id}`,
      kind,
      priority,
      job,
      eyebrow: kindLabel,
      title: jobTitle(job),
      meta: [job.customer, job.address || job.city, jobBoardScheduleLabel(job)].filter(Boolean).join(" / ") || "Job setup pending",
      statusLabel: readiness.length ? readiness.slice(0, 3).join(" / ") : jobStatusLabel(job.status || job.stage),
      tone: jobNorthStarTone(job, proofState, safetyCount, toolCount),
      actionLabel: jobNorthStarNextAction(job, proofState, safetyCount, toolCount),
      badges: [
        { label: jobStatusLabel(job.status || job.stage), tone: status === "billing_ready" ? "green" : status === "in_progress" ? "blue" : "slate" },
        { label: jobDisplayForeman(job), tone: missingCrew ? "amber" : "green" },
        { label: `${proofState.missingCount} proof gap${proofState.missingCount === 1 ? "" : "s"}`, tone: proofState.missingCount ? "amber" : "green" },
      ],
    };
  }

  const jobShellKpis = [
    {
      id: "active-jobs",
      label: "Active Jobs",
      value: liveJobRows.length,
      helper: `${activeFieldCount} in progress / ${visibleRows.length} visible`,
      icon: "briefcase",
      tone: liveJobRows.length ? "blue" : "slate",
      onClick: () => {
        const target = liveJobRows.find((job) => normalizeJobStatus(job.status || job.stage) === "in_progress") || liveJobRows[0];
        if (target?.id) {
          onSelectJob(target.id);
          setJobShellSelectionId(`job-${target.id}`);
          setJobShellMode("overview");
        }
      },
    },
    {
      id: "starts-today",
      label: "Starts Today",
      value: liveJobRows.filter((job) => jobShellDateKey(job) === todayDateInputValue()).length,
      helper: `${missingStartCount} missing start dates`,
      icon: "clock",
      tone: liveJobRows.some((job) => jobShellDateKey(job) === todayDateInputValue()) ? "orange" : "slate",
      onClick: () => {
        const target = liveJobRows.find((job) => jobShellDateKey(job) === todayDateInputValue());
        if (target?.id) {
          onSelectJob(target.id);
          setJobShellSelectionId(`job-${target.id}`);
          setJobShellMode("overview");
        }
      },
    },
    {
      id: "crew-start-gaps",
      label: "Crew / Start Gaps",
      value: liveJobRows.filter((job) => jobMissingCrew(job) || jobMissingStart(job)).length,
      helper: `${missingCrewCount} crew / ${missingStartCount} start`,
      icon: "users",
      tone: liveJobRows.some((job) => jobMissingCrew(job) || jobMissingStart(job)) ? "amber" : "green",
      onClick: () => {
        const target = liveJobRows.find((job) => jobMissingCrew(job) || jobMissingStart(job));
        if (target?.id) {
          onSelectJob(target.id);
          setJobShellSelectionId(`job-${target.id}`);
          setJobShellMode(jobMissingCrew(target) ? "crew" : "details");
        }
      },
    },
    {
      id: "ready-to-bill",
      label: "Ready To Bill",
      value: readyToBillRows.length,
      helper: `${visibleProofBlockers.length} proof blocker${visibleProofBlockers.length === 1 ? "" : "s"}`,
      icon: "check",
      tone: readyToBillRows.length ? "green" : "slate",
      onClick: () => {
        const target = readyToBillRows[0];
        if (target?.id) {
          onSelectJob(target.id);
          setJobShellSelectionId(`job-${target.id}`);
          setJobShellMode("overview");
        }
      },
    },
  ];
  const jobShellQueue = useMemo(() => {
    const items = [];
    const seenJobIds = new Set();

    function addJob(job, kind, priority) {
      if (!job?.id || seenJobIds.has(job.id)) return;
      const item = buildJobShellItem(job, kind, priority);
      if (!item) return;
      seenJobIds.add(job.id);
      items.push(item);
    }

    liveJobRows.filter((job) => visibleSafetyJobIds.has(job.id) || visibleToolChecklistBlockedJobIds.has(job.id)).forEach((job, index) => addJob(job, "problem", 10 + index));
    liveJobRows.filter((job) => jobMissingCrew(job) || jobMissingStart(job)).forEach((job, index) => addJob(job, "crew", 30 + index));
    liveJobRows.filter(jobStartupNeedsReview).forEach((job, index) => addJob(job, "startup", 50 + index));
    liveJobRows.filter((job) => jobShellDateKey(job) === todayDateInputValue()).forEach((job, index) => addJob(job, "today", 70 + index));
    readyToBillRows.forEach((job, index) => addJob(job, "billing", 90 + index));
    liveJobRows.forEach((job, index) => addJob(job, "job", 110 + index));

    return items.sort((left, right) => left.priority - right.priority || left.title.localeCompare(right.title)).slice(0, 7);
  }, [liveJobRows, readyToBillRows, visibleReportJobIds, visibleSafetyJobIds, visibleTicketJobIds, visibleToolChecklistBlockedJobIds, visibleUploadJobIds]);
  const selectedJobShellFallbackItem = jobShellQueue.find((item) => item.id === jobShellSelectionId)
    || jobShellQueue.find((item) => item.job?.id === selectedJobId)
    || jobShellQueue[0]
    || null;
  const selectedJobShellItem = jobShellMode === "create"
    ? {
      id: "job-create",
      kind: "create",
      eyebrow: "Create Job",
      title: "Create a job",
      meta: "Inline planner",
      statusLabel: permissions.jobs.canCreate ? "Draft" : "Unavailable",
      tone: "blue",
      actionLabel: "Create Job",
    }
    : selectedJobShellFallbackItem
      || (selectedJob ? buildJobShellItem(selectedJob, "job", 120) : null);
  const selectedJobShellId = selectedJobShellItem?.id || "";
  const jobShellAssistantDescription = missingCrewCount || missingStartCount || startupReviewCount || toolBlockerCount
    ? `${missingCrewCount + missingStartCount + startupReviewCount + toolBlockerCount} readiness item${missingCrewCount + missingStartCount + startupReviewCount + toolBlockerCount === 1 ? "" : "s"} need office review before clean field handoff.`
    : readyToBillRows.length
      ? `${readyToBillRows.length} job${readyToBillRows.length === 1 ? " is" : "s are"} ready for manual billing review.`
      : "Jobs are clear in the current office view.";
  const jobShellAssistantActions = [
    permissions.jobs.canCreate ? { label: "Create Job", icon: "plus", onClick: () => { setJobShellMode("create"); setJobShellSelectionId("job-create"); } } : null,
    { label: "Review Startup", icon: "clipboard", onClick: () => {
      const target = liveJobRows.find(jobStartupNeedsReview);
      if (target?.id) {
        onSelectJob(target.id);
        setJobShellSelectionId(`job-${target.id}`);
        setJobShellMode("startup");
      }
    }, disabled: !startupReviewCount },
    { label: "Fix Crew / Start", icon: "users", onClick: () => {
      const target = liveJobRows.find((job) => jobMissingCrew(job) || jobMissingStart(job));
      if (target?.id) {
        onSelectJob(target.id);
        setJobShellSelectionId(`job-${target.id}`);
        setJobShellMode(jobMissingCrew(target) ? "crew" : "details");
      }
    }, disabled: !(missingCrewCount || missingStartCount) },
  ].filter(Boolean);
  const jobShellQuickActions = [
    permissions.jobs.canCreate ? { id: "create-job", label: "Create Job", icon: "plus", onClick: () => { setJobShellMode("create"); setJobShellSelectionId("job-create"); } } : null,
    { id: "startup-review", label: "Startup Review", icon: "clipboard", onClick: () => {
      const target = liveJobRows.find(jobStartupNeedsReview);
      if (target?.id) {
        onSelectJob(target.id);
        setJobShellSelectionId(`job-${target.id}`);
        setJobShellMode("startup");
      }
    }, disabled: !startupReviewCount },
    { id: "ready-to-bill", label: "Ready To Bill", icon: "check", onClick: () => {
      const target = readyToBillRows[0];
      if (target?.id) {
        onSelectJob(target.id);
        setJobShellSelectionId(`job-${target.id}`);
        setJobShellMode("overview");
      }
    }, disabled: !readyToBillRows.length },
  ].filter(Boolean);

  useEffect(() => {
    if (!canUseJobsCommandShell) return;
    if (jobShellMode === "create") return;
    const fallbackId = selectedJobShellFallbackItem?.id || "";
    if (!jobShellSelectionId && fallbackId) {
      setJobShellSelectionId(fallbackId);
      if (selectedJobShellFallbackItem?.job?.id) onSelectJob(selectedJobShellFallbackItem.job.id);
      return;
    }
    if (jobShellSelectionId && fallbackId && !jobShellQueue.some((item) => item.id === jobShellSelectionId)) {
      setJobShellSelectionId(fallbackId);
      if (selectedJobShellFallbackItem?.job?.id) onSelectJob(selectedJobShellFallbackItem.job.id);
    }
  }, [canUseJobsCommandShell, jobShellMode, jobShellQueue, jobShellSelectionId, onSelectJob, selectedJobShellFallbackItem?.id, selectedJobShellFallbackItem?.job?.id]);

  function selectJobShellItem(item) {
    if (!item) return;
    setJobShellSelectionId(item.id);
    setJobShellMode("overview");
    if (item.job?.id) onSelectJob(item.job.id);
  }

  function openJobOperationsAction(action = {}, fallbackJobId = "") {
    const targetJobId = action.jobId || fallbackJobId;
    if (targetJobId) {
      onSelectJob(targetJobId);
      setJobShellSelectionId(`job-${targetJobId}`);
    }
    if (!action.route || action.route === "jobs") {
      setJobShellMode(action.mode === "crew" || action.mode === "startup" || action.mode === "create" ? action.mode : "details");
      return;
    }
    setActive?.(action.route);
  }

  function renderJobShellOverview(item) {
    const job = item?.job || selectedJob;
    if (!job) {
      return <StateCard title="No job selected" description="Select a job from the priority queue to review schedule, crew, startup, proof, and print actions." tone="slate" />;
    }
    const proofState = jobNorthStarProofState(job, visibleReportJobIds, visibleUploadJobIds, visibleTicketJobIds);
    const safetyCount = visibleSafetyJobIds.has(job.id) ? 1 : 0;
    const toolCount = visibleToolChecklistBlockedJobIds.has(job.id) ? 1 : 0;
    const startupWarnings = getStartupCriticalWarnings(normalizeStartupChecklist(job.startupChecklist));
    const operationsRow = jobOperationsFinishState.selectedRowForJobId?.(job.id);
    const operationsCheckpoints = operationsRow?.checkpoints || [];
    const operationsVisibleCheckpoints = operationsCheckpoints.slice(0, 8);
    const closeoutBillingRow = closeoutRowByJobId.get(job.id);
    const billingPrep = closeoutBillingRow?.billingPrep || null;
    const progressValue = Math.max(0, Math.min(100, Number(job.progress || 0)));
    const isBillingReadyJob = normalizeJobStatus(job.status || job.stage) === "billing_ready";
    const overviewActions = [
      { id: "details", label: "Details", onClick: () => setJobShellMode("details") },
      { id: "startup", label: "Startup", variant: "secondary", onClick: () => setJobShellMode("startup") },
      { id: "crew", label: "Crew", variant: "secondary", onClick: () => setJobShellMode("crew") },
    ];

    return (
      <div className="co-jobs-shell-detail-scroll">
        <div className="co-apex-selected-record">
          <Badge tone={isBillingReadyJob ? "green" : jobNorthStarTone(job, proofState, safetyCount, toolCount)}>{item?.eyebrow || "Selected Job"}</Badge>
          <h2>{jobTitle(job)}</h2>
          <p>{[job.customer, job.address || job.city].filter(Boolean).join(" / ") || "Customer or location pending"}</p>
        </div>
        <div className="co-apex-selected-facts co-jobs-shell-selected-facts">
          <span><em>Status</em><strong>{jobStatusLabel(job.status || job.stage)}</strong></span>
          <span><em>Schedule</em><strong>{formatJobScheduleDetail(job)}</strong></span>
          <span><em>Foreman</em><strong>{jobDisplayForeman(job)}</strong></span>
          <span><em>Crew</em><strong>{jobCrewCount(job)} assigned/needed</strong></span>
          <span><em>Startup</em><strong>{startupWarnings.length ? `${startupWarnings.length} warning${startupWarnings.length === 1 ? "" : "s"}` : (job.startupStatus || "Not Started")}</strong></span>
          <span><em>Proof</em><strong>{proofState.missingCount ? `${proofState.missingCount} gap${proofState.missingCount === 1 ? "" : "s"}` : "Complete"}</strong></span>
          <span><em>Tools</em><strong>{toolCount ? `${toolCount} blocker${toolCount === 1 ? "" : "s"}` : "Ready"}</strong></span>
          <span><em>Progress</em><strong>{progressValue}%</strong></span>
        </div>
        <div className="co-apex-selected-next">
          <span>Next safe action</span>
          <strong>{jobNorthStarNextAction(job, proofState, safetyCount, toolCount)}</strong>
          <p>{jobNextStep(job)} No external send, bid submission, billing action, or package change happens from this shell.</p>
        </div>
        {operationsRow ? (
          <div className="rounded-3xl border border-orange-100 bg-orange-50/60 p-4">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={operationsRow.blockerCount ? "amber" : "green"}>Job Operations Finish</Badge>
                  <Badge tone={operationsRow.fieldVisible ? "green" : "slate"}>{operationsRow.phaseStatus}</Badge>
                </div>
                <h3 className="mt-2 break-words text-base font-black text-slate-950">Schedule, startup, crew, materials, proof, and field handoff</h3>
                <p className="mt-1 text-sm font-bold leading-6 text-slate-600">{operationsRow.nextAction.detail}</p>
              </div>
              <Button type="button" size="sm" onClick={() => openJobOperationsAction(operationsRow.nextAction, job.id)}>
                {operationsRow.nextAction.label}
              </Button>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {operationsVisibleCheckpoints.map((checkpoint) => (
                <button
                  key={checkpoint.id}
                  type="button"
                  className="rounded-2xl border border-white bg-white p-3 text-left shadow-sm"
                  onClick={() => openJobOperationsAction(checkpoint, job.id)}
                >
                  <span className="flex items-center justify-between gap-2">
                    <strong className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{checkpoint.label}</strong>
                    <Badge tone={checkpoint.ready ? "green" : "amber"}>{checkpoint.ready ? "Ready" : "Review"}</Badge>
                  </span>
                  <em className="mt-2 block text-xs font-bold not-italic leading-5 text-slate-600">{checkpoint.helper}</em>
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs font-bold leading-5 text-slate-500">Field-safe boundary: no pricing, margin, payroll, billing, estimate packet, office note, customer send, vendor order, or provider write is exposed from this review.</p>
          </div>
        ) : null}
        {isBillingReadyJob ? (
          <div className="co-jobs-shell-money-note">
            <span>Ready-to-bill review</span>
            <strong>{billingPrep?.whatCanBeBilled?.label || "Manual closeout only"}</strong>
            <p>{billingPrep?.nextAction || "Confirm reports, photos, tickets, and office notes before finance acts outside Apex HQ."}</p>
            {billingPrep ? (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <span className="rounded-2xl border border-white bg-white/80 p-3 text-xs font-bold text-slate-600">
                  <strong className="block text-sm font-black text-slate-950">{formatReviewMoney(billingPrep.approvedChangesIncluded.total)}</strong>
                  Approved changes included
                </span>
                <span className="rounded-2xl border border-white bg-white/80 p-3 text-xs font-bold text-slate-600">
                  <strong className="block text-sm font-black text-slate-950">{billingPrep.proofStatus.missing.length}</strong>
                  Missing proof items
                </span>
                <span className="rounded-2xl border border-white bg-white/80 p-3 text-xs font-bold text-slate-600">
                  <strong className="block text-sm font-black text-slate-950">{billingPrep.invoicePrepStatus === "ready_for_manual_invoice_prep" ? "Ready" : "Blocked"}</strong>
                  Manual invoice prep
                </span>
                <span className="rounded-2xl border border-white bg-white/80 p-3 text-xs font-bold text-slate-600">
                  <strong className="block text-sm font-black text-slate-950">{billingPrep.paymentPrepStatus === "ready_for_manual_payment_prep" ? "Ready" : "Blocked"}</strong>
                  Manual payment prep
                </span>
              </div>
            ) : null}
          </div>
        ) : null}
        <div className="co-apex-selected-actions">
          {overviewActions.map((action, index) => (
            <Button key={action.id} type="button" variant={action.variant || (index === 0 ? "primary" : "secondary")} onClick={action.onClick}>{action.label}</Button>
          ))}
        </div>
      </div>
    );
  }

  function renderJobShellDetail(item) {
    const mode = item?.kind === "create" ? "create" : jobShellMode;
    if (mode === "create") {
      return (
        <div className="co-jobs-shell-detail-scroll">
          <JobPlannerCard draft={jobDraft} setDraft={setJobDraft} onCreateJob={onCreateJob} disabled={busy || !permissions.jobs.canCreate} users={users} canCreate={permissions.jobs.canCreate} />
        </div>
      );
    }

    const job = item?.job || selectedJob;
    if (!job) {
      return <StateCard title="No job selected" description="Select a job before opening details, startup, or crew tools." tone="slate" />;
    }

    if (mode === "details") {
      return (
        <div className="co-jobs-shell-detail-scroll">
          <JobDetailPanel
            job={job}
            users={users}
            onFieldChange={onJobFieldChange}
            onArchive={onArchiveJob}
            onRestore={onRestoreJob}
            onDelete={onDeleteJob}
            onChangeForeman={onChangeForeman}
            onAddAssignment={onAddAssignment}
            onUpdateAssignment={onUpdateAssignment}
            onRemoveAssignment={onRemoveAssignment}
            saveState={jobSaveState}
            disabled={busy}
            permissions={permissions}
            onPrintPacket={() => onPrintJobPacket?.(job)}
          />
        </div>
      );
    }

    if (mode === "startup") {
      return (
        <div className="co-jobs-shell-detail-scroll">
          <Card className="p-4">
            <SectionHeader title="Startup Readiness" description="Review blockers before the job is treated as ready for field work." action={<StartupStatusBadge status={job.startupStatus || "Not Started"} />} />
            <JobStartupChecklistCard job={job} onFieldChange={onJobFieldChange} disabled={busy} />
          </Card>
        </div>
      );
    }

    if (mode === "crew") {
      return (
        <div className="co-jobs-shell-detail-scroll">
          <Card className="p-4">
            <SectionHeader title="Crew / Foreman" description="Assign the foreman and crew without opening a drawer." />
            <JobCrewSection
              job={job}
              users={users}
              disabled={busy}
              canManageAssignments={Boolean(permissions?.jobs?.canManageAssignments)}
              onChangeForeman={onChangeForeman}
              onAddAssignment={onAddAssignment}
              onUpdateAssignment={onUpdateAssignment}
              onRemoveAssignment={onRemoveAssignment}
            />
          </Card>
        </div>
      );
    }

    return renderJobShellOverview(item);
  }

  if (canUseJobsCommandShell) {
    return (
      <div className="co-office-page co-jobs-page co-jobs-shell-page">
        <ApexOfficeCommandShell
          eyebrow="Field Ops"
          title="Jobs"
          description="Run active work, starts, crew gaps, and ready-to-bill reviews from one no-drawer office command view."
          kpis={jobShellKpis}
          queue={{
            title: "Job priority queue",
            description: `${jobShellQueue.length} priority job${jobShellQueue.length === 1 ? "" : "s"} shown from readiness, startup, starts today, and billing review.`,
            items: jobShellQueue,
            selectedId: selectedJobShellId,
            onSelect: selectJobShellItem,
            emptyState: <StateCard title="Job queue clear" description="Active jobs, starts, gaps, and billing-ready work appear here when they need review." tone="green" />,
          }}
          detail={{
            title: jobShellMode === "create" ? "Create job" : jobShellMode === "details" ? "Job details" : jobShellMode === "startup" ? "Startup readiness" : jobShellMode === "crew" ? "Crew / Foreman" : "Selected job",
            item: selectedJobShellItem,
            render: renderJobShellDetail,
            emptyState: <StateCard title="No job selected" description="Select a job from the queue to review field readiness." tone="slate" />,
          }}
          assistant={{
            title: "Jobs",
            description: jobShellAssistantDescription,
            priorities: [
              { value: liveJobRows.length, label: "active jobs", tone: liveJobRows.length ? "blue" : "slate" },
              { value: liveJobRows.filter((job) => jobShellDateKey(job) === todayDateInputValue()).length, label: "starts today", tone: liveJobRows.some((job) => jobShellDateKey(job) === todayDateInputValue()) ? "orange" : "slate" },
              { value: liveJobRows.filter((job) => jobMissingCrew(job) || jobMissingStart(job)).length, label: "crew/start gaps", tone: liveJobRows.some((job) => jobMissingCrew(job) || jobMissingStart(job)) ? "amber" : "green" },
              { value: readyToBillRows.length, label: "ready to bill", tone: readyToBillRows.length ? "green" : "slate" },
            ],
            actions: jobShellAssistantActions,
            guardrails: ["No desktop drawers", "No automatic sends or billing", "Field Mode stays separate"],
          }}
          quickActions={jobShellQuickActions}
        />
      </div>
    );
  }

  return (
    <div className="co-office-page co-jobs-page" data-money-view={isReadyToBillView ? "true" : undefined}>
      <PageHeader
        eyebrow={pageEyebrow}
        title={pageTitle}
        description={isReadyToBillView
          ? "Review billing-ready jobs, proof records, delivery tickets, and closeout blockers before any external billing step."
          : `Manage active jobs, startup readiness, crews, schedules, and field visibility from one ${roleLabel} command view.`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => jumpToJobSection("jobs-operations-board")}>{visibleRows.length} visible jobs</Button>
            {permissions.jobs.canCreate ? <Button type="button" onClick={focusNewJob}>Create Job</Button> : null}
          </div>
        }
      />
      {!isReadyToBillView ? (
        <JobsCommandWorkbench
          rows={visibleRows}
          selectedJob={selectedJob}
          selectedJobId={selectedJobId}
          reportJobIds={visibleReportJobIds}
          uploadJobIds={visibleUploadJobIds}
          ticketJobIds={visibleTicketJobIds}
          safetyJobIds={visibleSafetyJobIds}
          toolChecklistJobIds={visibleToolChecklistBlockedJobIds}
          visibleRowsCount={visibleRows.length}
          startupReviewCount={startupReviewCount}
          missingCrewCount={missingCrewCount}
          toolBlockerCount={toolBlockerCount}
          activeFieldCount={activeFieldCount}
          readyToBillCount={readyToBillRows.length}
          jobsNextAction={jobsNextAction}
          jobsNextDetail={jobsNextDetail}
          permissions={permissions}
          onSelectJob={onSelectJob}
          onOpenTool={openJobTool}
          onOpenModule={setActive}
          onCreateJob={focusNewJob}
          onViewBoard={() => jumpToJobSection("jobs-operations-board")}
        />
      ) : null}
      <div className="co-jobs-kpi-grid mx-auto grid w-full max-w-[1520px] min-w-0 grid-cols-1 gap-3 px-5 pb-3 sm:px-6 md:grid-cols-5 lg:px-6">
        {jobKpis.map((item) => <CommandCenterKpiCard key={item.label} item={item} />)}
      </div>

      {isReadyToBillView ? (
        <div className="co-jobs-money-strip mx-auto grid w-full max-w-[1520px] min-w-0 gap-3 px-5 pb-3 sm:px-6 md:grid-cols-5 lg:px-6">
          {readyToBillSummaryCards.map((card) => (
            <div key={card.label} className="co-jobs-money-card" data-tone={card.tone}>
              <span className="co-jobs-money-icon"><Icon name={card.icon} className="h-4 w-4" /></span>
              <div className="min-w-0">
                <strong>{card.value}</strong>
                <span>{card.label}</span>
                <p>{card.helper}</p>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="co-jobs-command-layout mx-auto grid w-full max-w-[1520px] min-w-0 gap-3 px-5 pb-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-6">
        <div className="co-jobs-left-stack min-w-0 space-y-3">
          <Card id="jobs-operations-board" className="co-jobs-main-board overflow-hidden">
            <div className="co-jobs-board-header border-b border-slate-200 bg-white p-4">
              <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0">
                  <h2 className="text-base font-black uppercase tracking-[0.04em] text-slate-950">{isReadyToBillView ? "Ready To Bill Queue" : "Job Operations Board"}</h2>
                  <p className="mt-1 text-sm font-bold leading-5 text-slate-600">
                    {isReadyToBillView
                      ? "Use this as a manual closeout queue only. Apex HQ keeps money readiness internal, support-led, and separate from finance systems."
                      : "Filter jobs, select a record, and keep schedule, crew, and startup readiness in the right rail."}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="secondary" onClick={() => setFilter("All")}>All jobs</Button>
                  <Button type="button" size="sm" variant="secondary" onClick={() => isReadyToBillView ? setActive("reports") : setStartupFilter("Needs Review")}>{isReadyToBillView ? "Open reports" : "Startup review"}</Button>
                  {permissions.jobs.canCreate ? <Button type="button" size="sm" onClick={focusNewJob}>Create Job</Button> : null}
                </div>
              </div>
            </div>
            <FilterBar filters={["All", "Draft", "Planned", "Scheduled", "In Progress", "Field Complete", "Completed", "Billing Ready", "Closed", "Archived"]} active={filter} setActive={setFilter} search={search} setSearch={setSearch} placeholder="Search job, customer, address, next step..." />
            <details className="co-jobs-advanced-filters border-b border-slate-200 bg-white">
              <summary>
                <span>Advanced filters</span>
                <span>{[customerFilter !== "All customers" ? customerFilter : "", foremanFilter !== "All foremen" ? foremanFilter : "", dateFilter !== "All dates" ? dateFilter : "", startupFilter !== "All startup" ? startupFilter : ""].filter(Boolean).length || "Customer, foreman, date, startup"}</span>
              </summary>
              <div className="co-office-filter-grid co-jobs-filter-grid grid gap-3 p-3 md:grid-cols-4">
                <SelectField label="Customer" value={customerFilter} onChange={(event) => setCustomerFilter(event.target.value)}>
                  <option>All customers</option>
                  {jobListState.customerOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </SelectField>
                <SelectField label="Foreman" value={foremanFilter} onChange={(event) => setForemanFilter(event.target.value)}>
                  <option>All foremen</option>
                  {jobListState.foremanOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </SelectField>
                <SelectField label="Date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)}>
                  <option>All dates</option>
                  <option>Today</option>
                  <option>This Week</option>
                  <option>Upcoming</option>
                  <option>Overdue</option>
                  <option>Unscheduled</option>
                </SelectField>
                <SelectField label="Startup" value={startupFilter} onChange={(event) => setStartupFilter(event.target.value)}>
                  <option>All startup</option>
                  {JOB_STARTUP_STATUSES.map((status) => <option key={status}>{status}</option>)}
                </SelectField>
              </div>
            </details>
            {visibleRows.length === 0 ? (
              <div className="p-5">
                <StateCard title="No jobs match this view" description="Adjust filters or create a job to bring active work into the operations board." tone="blue" />
              </div>
            ) : (
              <JobsTablePolished rows={visibleRows} selectedId={selectedJobId} onSelect={onSelectJob} maxRows={visibleJobRowCap} mobileMaxRows={mobileVisibleJobRowCap} />
            )}
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3">
              <p className="text-sm font-bold text-slate-600">
                <span className="hidden md:inline">Showing {Math.min(visibleRows.length, visibleJobRowCap)} of {visibleRows.length} filtered jobs</span>
                <span className="md:hidden">Showing {Math.min(visibleRows.length, mobileVisibleJobRowCap)} of {visibleRows.length} filtered jobs</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {visibleRows.length > mobileJobPreviewCap ? (
                  <Button type="button" size="sm" variant="secondary" className="md:hidden" onClick={() => setShowAllMobileJobs((current) => !current)}>
                    {showAllMobileJobs ? "Show less" : "Show more"}
                  </Button>
                ) : null}
                <Button type="button" size="sm" variant="secondary" onClick={() => { setFilter("All"); setCustomerFilter("All customers"); setForemanFilter("All foremen"); setDateFilter("All dates"); setStartupFilter("All startup"); setSearch(""); }}>Clear filters</Button>
              </div>
            </div>
          </Card>
        </div>

        <JobCommandRailPolished
          job={selectedJob}
          permissions={permissions}
          billingMode={isReadyToBillView}
          closeoutBillingRow={selectedJob?.id ? closeoutRowByJobId.get(selectedJob.id) : null}
          toolChecklistBlockerCount={selectedJob?.id && toolChecklistBlockedJobIds.has(selectedJob.id) ? 1 : 0}
          disabled={busy}
          saveState={jobSaveState}
          onArchive={onArchiveJob}
          onRestore={onRestoreJob}
          onDelete={onDeleteJob}
          onPrintPacket={selectedJob ? () => onPrintJobPacket?.(selectedJob) : undefined}
          onOpenTool={openJobTool}
          onOpenModule={setActive}
        />
      </div>

      <details
        ref={jobToolsRef}
        className="co-jobs-tools-drawer mx-auto w-full max-w-[1520px] min-w-0 px-5 pb-4 sm:px-6 lg:px-8"
        open={showJobTools}
        onToggle={(event) => setShowJobTools(event.currentTarget.open)}
      >
        <summary>
          <span>
            <strong>Job Tools</strong>
            <em>Create jobs, edit details, finish startup readiness, and assign field crews here.</em>
          </span>
          <span>Open tools</span>
        </summary>
        <div className="co-jobs-tool-tabs mt-3 flex min-w-0 gap-2 overflow-x-auto pb-1">
          {jobToolTabs.map((tab) => (
            <button key={tab.id} type="button" className={activeJobTool === tab.id ? "is-active" : ""} onClick={() => setActiveJobTool(tab.id)}>
              {tab.label}
              <span>{tab.count}</span>
            </button>
          ))}
        </div>
        <div className="co-jobs-tools-panel mt-3">
          {activeJobTool === "create" ? (
            <JobPlannerCard draft={jobDraft} setDraft={setJobDraft} onCreateJob={onCreateJob} disabled={busy || !permissions.jobs.canCreate} users={users} canCreate={permissions.jobs.canCreate} />
          ) : null}

          {activeJobTool === "details" ? (
            <JobDetailPanel
              job={selectedJob}
              users={users}
              onFieldChange={onJobFieldChange}
              onArchive={onArchiveJob}
              onRestore={onRestoreJob}
              onDelete={onDeleteJob}
              onChangeForeman={onChangeForeman}
              onAddAssignment={onAddAssignment}
              onUpdateAssignment={onUpdateAssignment}
              onRemoveAssignment={onRemoveAssignment}
              saveState={jobSaveState}
              disabled={busy}
              permissions={permissions}
              onPrintPacket={selectedJob ? () => onPrintJobPacket?.(selectedJob) : undefined}
            />
          ) : null}

          {activeJobTool === "startup" ? (
            <Card className="p-4">
              <SectionHeader title="Startup Readiness" description="Review blockers before the job is treated as ready for field work." action={selectedJob ? <StartupStatusBadge status={selectedJob.startupStatus || "Not Started"} /> : null} />
              {selectedJob && permissions.jobs.canManageAll ? (
                <JobStartupChecklistCard job={selectedJob} onFieldChange={onJobFieldChange} disabled={busy} />
              ) : (
                <StateCard title="Startup review unavailable" description={selectedJob ? "Startup checklist editing is only available to office scheduling roles." : "Select a job before reviewing startup readiness."} tone="slate" />
              )}
            </Card>
          ) : null}

          {activeJobTool === "crew" ? (
            <Card className="p-4">
              <SectionHeader title="Crew / Foreman" description="Assign the foreman and crew without crowding the main job board." />
              {selectedJob ? (
                <JobCrewSection
                  job={selectedJob}
                  users={users}
                  disabled={busy}
                  canManageAssignments={Boolean(permissions?.jobs?.canManageAssignments)}
                  onChangeForeman={onChangeForeman}
                  onAddAssignment={onAddAssignment}
                  onUpdateAssignment={onUpdateAssignment}
                  onRemoveAssignment={onRemoveAssignment}
                />
              ) : (
                <StateCard title="No job selected" description="Select a job before assigning a foreman or crew." tone="blue" />
              )}
            </Card>
          ) : null}
        </div>
      </details>
    </div>
  );
}
