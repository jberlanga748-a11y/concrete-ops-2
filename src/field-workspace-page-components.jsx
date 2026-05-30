import { lazy, useMemo } from "react";

import { Badge, Button, Card, Icon, InputField, PageHeader, SectionHeader, SelectField, StateCard, StatusBadge, TextAreaField } from "./app-shell-components";
import { CommandCenterKpiCard, FieldOpsAgentSummaryCard } from "./command-center-route-components";
import { deriveFieldModeFinishState } from "./field-mode-finish-utils";
import {
  FieldAssignmentNoticePanel,
  FieldDetailDisclosure,
  FieldJobSummaryCard,
  FieldMobileActionGrid,
  FieldNextJobCard,
  FieldOperatorPanelShell,
  FieldWorkspaceDisclosure,
} from "./field-route-components";
import { deriveFieldOpsAgentState } from "./field-ops-agent-utils";
import { directionsUrl, fieldChecklistNeedsAction, fieldChecklistSummary, formatJobScheduleDetail, humanizeAssignmentRole } from "./field-format-utils";
import { deriveEmployeeWorkspace, deriveFieldTradeGuidance, deriveForemanWorkspace } from "./field-workspace-utils";
import { JobCalculationsCard } from "./job-route-components";
import { jobStatusLabel, jobTitle, normalizeJobStatus } from "./job-utils";
import { workCategoryLabel } from "./time-category-utils";
import { deriveTimeWorkspace } from "./time-utils";

const ActiveTimeCard = lazy(() => import("./time-route-components").then((module) => ({ default: module.ActiveTimeCard })));

function FieldJobFocusCard({ job, permissions, onFieldChange, disabled, embedded = false }) {
  if (!job) {
    const EmptyShell = embedded ? "div" : Card;
    return (
      <EmptyShell className={embedded ? "co-field-focus-card co-field-focus-card-embedded" : "co-field-focus-card p-5"}>
        <SectionHeader title="Field focus" description="Assigned work will appear here once the office schedules it." />
        <StateCard title="No assigned jobs yet" description="Contact office if this is wrong or if a job should already be on your phone." tone="slate" />
      </EmptyShell>
    );
  }

  const FocusShell = embedded ? "div" : Card;
  const canManageField = Boolean(job.canManageField || permissions.jobs.canManageField);
  const crewAssignments = Array.isArray(job.crewAssignments) ? job.crewAssignments : [];
  const fieldNoteCount = [job.fieldNotes, job.materialNotes, job.equipmentNotes, job.safetyNotes].filter((value) => String(value || "").trim()).length;
  const checklistSummary = [job.prePourChecklist?.statusLabel || "Pre-pour pending", job.postPourChecklist?.statusLabel || "Post-pour pending"].join(" / ");
  const tradeGuidance = deriveFieldTradeGuidance(job);
  const snapshotItems = [
    { label: "Schedule", value: formatJobScheduleDetail(job) },
    { label: "Address", value: job.address || "Address pending" },
    { label: "Crew", value: `${crewAssignments.length} assigned` },
    { label: "Trade", value: tradeGuidance?.tradeLabel || "General Contractor" },
  ];

  return (
    <div className="min-w-0 space-y-4">
      <FocusShell className={embedded ? "co-field-focus-card co-field-focus-card-embedded" : "co-field-focus-card p-5"}>
        <SectionHeader title={jobTitle(job)} description={`${job.id} - ${job.customer || "Assigned site"}`} action={<StatusBadge status={jobStatusLabel(job.status || job.stage)} />} />
        <div className="co-field-focus-snapshot">
          {snapshotItems.map((item) => (
            <div key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
        <div className="space-y-3">
          <FieldDetailDisclosure title="Schedule / address / directions" summary={`${formatJobScheduleDetail(job)} - ${job.address || "Address pending"}`} defaultOpen>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Address</p>
                <p className="mt-2 break-words text-sm font-bold leading-6 text-slate-700">{job.address || "Address pending"}</p>
                {directionsUrl(job.address) ? (
                  <a className="mt-2 inline-flex min-h-[2rem] items-center text-xs font-black uppercase tracking-[0.14em] text-blue-700 hover:text-blue-900" href={directionsUrl(job.address)} target="_blank" rel="noreferrer">
                    Open directions
                  </a>
                ) : null}
              </div>
              <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Schedule</p>
                <p className="mt-2 text-sm font-bold leading-6 text-slate-700">{formatJobScheduleDetail(job)}</p>
              </div>
              <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Site contact</p>
                <p className="mt-2 text-sm font-bold leading-6 text-slate-700">{job.siteContact || "Contact pending"}</p>
              </div>
              <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Foreman</p>
                <p className="mt-2 text-sm font-bold leading-6 text-slate-700">{job.foremanAssignment?.userName || job.assignedForemanName || "Unassigned"}</p>
              </div>
            </div>
          </FieldDetailDisclosure>
          <FieldDetailDisclosure title="Job details" summary={checklistSummary}>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-blue-100 p-4 md:col-span-2">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Scope summary</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">{job.scopeSummary || "Scope summary pending."}</p>
              </div>
              <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Pre-pour</p>
                <p className="mt-2 text-sm font-bold leading-6 text-slate-700">{job.prePourChecklist?.statusLabel || "Not started"}</p>
              </div>
              <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Post-pour</p>
                <p className="mt-2 text-sm font-bold leading-6 text-slate-700">{job.postPourChecklist?.statusLabel || "Not started"}</p>
              </div>
            </div>
          </FieldDetailDisclosure>
          {tradeGuidance ? (
            <FieldDetailDisclosure title={`${tradeGuidance.tradeLabel} field proof`} summary={tradeGuidance.proofPhotoChecklist.slice(0, 2).join(" / ") || "Proof checklist ready"}>
              <div className="grid gap-3 lg:grid-cols-3">
                <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Handoff focus</p>
                  <ul className="mt-2 space-y-1 text-sm font-bold leading-6 text-slate-700">
                    {tradeGuidance.fieldHandoffChecklist.slice(0, 4).map((item) => <li key={item}>- {item}</li>)}
                  </ul>
                </div>
                <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Photos to capture</p>
                  <ul className="mt-2 space-y-1 text-sm font-bold leading-6 text-slate-700">
                    {tradeGuidance.proofPhotoChecklist.slice(0, 4).map((item) => <li key={item}>- {item}</li>)}
                  </ul>
                </div>
                <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-amber-700">Change watch</p>
                  <ul className="mt-2 space-y-1 text-sm font-bold leading-6 text-slate-700">
                    {tradeGuidance.changeOrderWatchouts.slice(0, 4).map((item) => <li key={item}>- {item}</li>)}
                  </ul>
                </div>
              </div>
            </FieldDetailDisclosure>
          ) : null}
          <FieldDetailDisclosure title="Field notes" summary={fieldNoteCount ? `${fieldNoteCount} field note sections ready` : "No field notes yet"}>
            {canManageField ? (
              <div className="grid gap-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <SelectField label="Field status" value={normalizeJobStatus(job.status || job.stage)} onChange={(event) => onFieldChange("status", event.target.value)} disabled={disabled}>
                    <option value="planned">Planned</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="in_progress">In Progress</option>
                    <option value="field_complete">Field Complete</option>
                    <option value="completed">Completed</option>
                  </SelectField>
                  <InputField label="Next step" value={job.nextStep || ""} onChange={(event) => onFieldChange("nextStep", event.target.value)} disabled={disabled} />
                </div>
                <label className="field-label">
                  <span>Progress ({job.progress}%)</span>
                  <input className="w-full accent-blue-700" type="range" min="0" max="100" value={job.progress} onChange={(event) => onFieldChange("progress", Number(event.target.value))} disabled={disabled} />
                </label>
                <TextAreaField label="Field notes" value={job.fieldNotes || ""} onChange={(event) => onFieldChange("fieldNotes", event.target.value)} disabled={disabled} />
              </div>
            ) : (
              <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Field notes</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">{job.fieldNotes || "No field notes yet."}</p>
              </div>
            )}
          </FieldDetailDisclosure>
          <FieldDetailDisclosure title="Materials / Equipment / Safety" summary={`${[job.materialNotes, job.equipmentNotes, job.safetyNotes].filter((value) => String(value || "").trim()).length} notes`}>
            <div className="grid gap-3 lg:grid-cols-3">
              <div className="rounded-2xl border border-blue-100 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Materials</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">{job.materialNotes || "No material notes yet."}</p>
              </div>
              <div className="rounded-2xl border border-blue-100 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Equipment</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">{job.equipmentNotes || "No equipment notes yet."}</p>
              </div>
              <div className="rounded-2xl border border-blue-100 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Safety</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">{job.safetyNotes || "No safety notes yet."}</p>
              </div>
            </div>
          </FieldDetailDisclosure>
          <FieldDetailDisclosure title={permissions.jobs.canManageField ? "Crew" : "Crew on site"} summary={`${crewAssignments.length} assigned`}>
            {crewAssignments.length > 0 ? (
              <div className="space-y-2">
                {crewAssignments.map((assignment) => (
                  <div key={assignment.id || `${assignment.userId}-${assignment.roleOnJob}`} className="flex items-center justify-between rounded-2xl border border-blue-100 bg-white p-3">
                    <div>
                      <p className="text-sm font-black text-slate-950">{assignment.userName || assignment.userId}</p>
                      <p className="mt-1 text-xs font-bold text-slate-500">{humanizeAssignmentRole(assignment.roleOnJob)}</p>
                    </div>
                    <Badge tone="slate">{assignment.userRole || "Crew"}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <StateCard title="No crew assigned yet" description="Contact office if this crew list looks incomplete." tone="slate" />
            )}
          </FieldDetailDisclosure>
        </div>
      </FocusShell>
      <FieldWorkspaceDisclosure title="Saved calculations" description="Calculator results connected to this assigned job." badge={(job.calculatorResults || []).length ? `${job.calculatorResults.length} saved` : "None"}>
        <JobCalculationsCard calculations={job.calculatorResults} title="Saved calculations" description="Team-visible concrete volume records for this job." showInternalBadge={false} />
      </FieldWorkspaceDisclosure>
    </div>
  );
}

function FieldWalkthroughCard({ role = "employee" }) {
  const isForeman = role === "foreman";
  const steps = isForeman
    ? ["Check new assignment notices", "Clock in and open the next job", "Submit reports, photos, tickets, and checklists"]
    : ["Check new assignment notices", "Clock in and open your assigned job", "Use safety, photos, and field tools when needed"];

  return (
    <Card className="border-blue-200 bg-blue-50/80 p-4 shadow-sm">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Badge tone="blue">Start here</Badge>
          <p className="mt-2 text-sm font-black text-slate-950">{isForeman ? "Foreman field walkthrough" : "Employee field walkthrough"}</p>
          <p className="mt-1 text-xs font-bold leading-5 text-slate-600">
            This workspace only shows field-safe job details and tools.
          </p>
        </div>
        <div className="grid min-w-0 gap-2 text-xs font-black text-blue-800 sm:min-w-[360px]">
          {steps.map((step, index) => (
            <span key={step} className="rounded-full bg-white px-3 py-1.5 ring-1 ring-blue-100">{index + 1}. {step}</span>
          ))}
        </div>
      </div>
    </Card>
  );
}

function FieldJobOperatorPanel({ role = "employee", workspace, focusJob, permissions, setActive, onSelectJob, activeEntry }) {
  const isForeman = role === "foreman";
  const primaryJob = workspace?.nextAssignedJob || focusJob || workspace?.assignedJobs?.[0] || null;
  const noticeCount = Array.isArray(workspace?.assignmentNotices) ? workspace.assignmentNotices.length : 0;
  const assignedCount = Array.isArray(workspace?.assignedJobs) ? workspace.assignedJobs.length : 0;
  const upcomingCount = Array.isArray(workspace?.upcomingJobs) ? workspace.upcomingJobs.length : 0;
  const crewCount = Array.isArray(primaryJob?.crewAssignments) ? primaryJob.crewAssignments.length : 0;
  const fieldNoteCount = primaryJob ? [primaryJob.fieldNotes, primaryJob.materialNotes, primaryJob.equipmentNotes, primaryJob.safetyNotes].filter((value) => String(value || "").trim()).length : 0;
  const canRoute = typeof setActive === "function";
  const mapUrl = directionsUrl(primaryJob?.address);
  const openFieldTool = (toolId) => {
    if (!canRoute) return;
    setActive(toolId);
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches) {
      window.setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 0);
    }
  };

  const summaryItems = [
    { label: isForeman ? "Assigned jobs" : "Assigned work", value: assignedCount, tone: assignedCount ? "orange" : "slate" },
    { label: "Notices", value: noticeCount, tone: noticeCount ? "amber" : "green" },
    { label: "Crew", value: primaryJob ? crewCount : "-", tone: crewCount ? "orange" : "slate" },
    { label: "Field notes", value: primaryJob ? fieldNoteCount : "-", tone: fieldNoteCount ? "orange" : "slate" },
  ];

  if (isForeman) {
    summaryItems.push({ label: "Upcoming", value: upcomingCount, tone: upcomingCount ? "orange" : "slate" });
  }

  return (
    <FieldOperatorPanelShell
      badges={[
        { label: isForeman ? "Foreman Mode" : "Field Mode", tone: "orange" },
        primaryJob ? <StatusBadge status={jobStatusLabel(primaryJob.status || primaryJob.stage)} /> : null,
        noticeCount ? { label: `${noticeCount} new notice${noticeCount === 1 ? "" : "s"}`, tone: "amber" } : null,
      ]}
      title={primaryJob ? jobTitle(primaryJob) : isForeman ? "No assigned jobs yet" : "No assigned job yet"}
      description={primaryJob
        ? `${primaryJob.customer || "Assigned site"} / ${formatJobScheduleDetail(primaryJob)}`
        : "When office assigns work, the job, address, notes, and safe actions will show here."}
      meta={primaryJob ? (primaryJob.address || "Address pending") : ""}
      metaIcon="briefcase"
      actions={[
        permissions?.time?.canView && canRoute ? { id: "time", label: activeEntry ? "Open Time" : "Clock In", icon: "clock", onClick: () => openFieldTool("time") } : null,
        primaryJob ? { id: "job", label: "View Job", icon: "briefcase", variant: "secondary", onClick: () => onSelectJob(primaryJob.id) } : null,
        mapUrl ? { id: "directions", label: "Directions", icon: "arrowUpRight", href: mapUrl } : null,
        permissions?.reports?.canView && canRoute ? { id: "reports", label: "Report", icon: "document", variant: "secondary", onClick: () => openFieldTool("reports") } : null,
        permissions?.uploads?.canView && canRoute ? { id: "uploads", label: "Photos", icon: "upload", variant: "secondary", onClick: () => openFieldTool("uploads") } : null,
      ]}
      facts={summaryItems}
    />
  );
}
function FieldMobileRemoteControlPanel({
  role = "employee",
  workspace,
  focusJob,
  permissions,
  setActive,
  timeWorkspace,
  onSelectJob,
  onClockIn,
  onClockOut,
  onStartBreak,
  onEndBreak,
  busy,
}) {
  const isForeman = role === "foreman";
  const primaryJob = workspace?.nextAssignedJob || focusJob || workspace?.assignedJobs?.[0] || null;
  const activeEntry = timeWorkspace?.activeEntry || null;
  const allowedCategories = Array.isArray(timeWorkspace?.allowedCategories) ? timeWorkspace.allowedCategories : [];
  const canRoute = typeof setActive === "function";
  const canQuickClockIn = Boolean(!activeEntry && primaryJob?.id && permissions?.time?.canManageOwn && allowedCategories.includes("job") && typeof onClockIn === "function");
  const canClockOut = Boolean(activeEntry?.id && permissions?.time?.canManageOwn && typeof onClockOut === "function");
  const canManageBreakTime = Boolean(activeEntry?.id && permissions?.time?.canManageOwn && typeof (activeEntry?.status === "on_break" ? onEndBreak : onStartBreak) === "function");
  const tradeGuidance = deriveFieldTradeGuidance(primaryJob);
  const proofPrompt = tradeGuidance?.proofPhotoChecklist?.slice(0, 2).join(", ");
  const checklistTarget = permissions?.prePour?.canView && fieldChecklistNeedsAction(primaryJob?.prePourChecklist)
    ? { id: "prePour", label: "Pre-Pour", helper: fieldChecklistSummary(primaryJob?.prePourChecklist) }
    : permissions?.postPour?.canView && fieldChecklistNeedsAction(primaryJob?.postPourChecklist)
      ? { id: "postPour", label: "Post-Pour", helper: fieldChecklistSummary(primaryJob?.postPourChecklist) }
      : permissions?.toolChecklist?.canUse
        ? { id: "toolChecklist", label: "Checklist", helper: "Tool and safety checks" }
        : permissions?.safety?.canView
          ? { id: "ppe", label: "Safety", helper: "PPE and field safety" }
          : null;
  const openFieldTool = (toolId) => {
    if (!canRoute || !toolId) return;
    setActive(toolId);
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches) {
      window.setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 0);
    }
  };
  const quickClockIn = () => {
    if (!canQuickClockIn) return;
    onClockIn({ workCategory: "job", jobId: primaryJob.id, notes: "" });
  };
  const handleClockPrimary = activeEntry?.status === "on_break"
    ? () => canManageBreakTime && onEndBreak(activeEntry.id)
    : activeEntry
      ? () => canManageBreakTime && onStartBreak(activeEntry.id)
      : quickClockIn;
  const clockLabel = activeEntry?.status === "on_break" ? "End Break" : activeEntry ? "Start Break" : "Clock In";
  const clockHelper = activeEntry ? (activeEntry.jobTitle || workCategoryLabel(activeEntry.workCategory)) : primaryJob ? "Start job time" : "No job selected";
  const actions = [
    {
      id: "clock",
      label: clockLabel,
      helper: clockHelper,
      icon: "clock",
      tone: activeEntry ? "green" : "orange",
      onClick: handleClockPrimary,
      disabled: busy || (activeEntry ? !canManageBreakTime : !canQuickClockIn),
    },
    permissions?.uploads?.canView ? {
      id: "photos",
      label: "Photos",
      helper: proofPrompt || "Upload proof",
      icon: "upload",
      tone: "slate",
      onClick: () => openFieldTool("uploads"),
      disabled: !canRoute,
    } : null,
    permissions?.reports?.canView ? {
      id: "report",
      label: "Report",
      helper: "Field notes",
      icon: "document",
      tone: "blue",
      onClick: () => openFieldTool("reports"),
      disabled: !canRoute,
    } : null,
    checklistTarget ? {
      id: "checklist",
      label: checklistTarget.label,
      helper: checklistTarget.helper,
      icon: "clipboard",
      tone: "amber",
      onClick: () => openFieldTool(checklistTarget.id),
      disabled: !canRoute,
    } : null,
    isForeman && (permissions?.changeOrders?.canRequest || permissions?.changeOrders?.canManage) ? {
      id: "change",
      label: "Change Request",
      helper: "Field request",
      icon: "refresh",
      tone: "slate",
      onClick: () => openFieldTool("changeOrders"),
      disabled: !canRoute,
    } : permissions?.support?.canView ? {
      id: "blocker",
      label: "Report",
      helper: "Blocker or issue",
      icon: "alert",
      tone: "slate",
      onClick: () => openFieldTool("support"),
      disabled: !canRoute,
    } : null,
  ].filter(Boolean).slice(0, 5);

  return (
    <section className="co-field-mobile-remote" aria-label={isForeman ? "Foreman Today job remote" : "Employee My Work remote"}>
      <div className="co-field-mobile-remote-head">
        <div>
          <Badge tone="orange">{isForeman ? "Foreman" : "Employee"}</Badge>
          <h2>{isForeman ? "Today's Job" : "My Work"}</h2>
          <p>{primaryJob ? `${jobTitle(primaryJob)} / ${primaryJob.customer || "Assigned site"}` : "No assigned job is ready on this phone."}</p>
        </div>
        <StatusBadge status={activeEntry ? (activeEntry.status === "on_break" ? "On Break" : "Clock Running") : primaryJob ? "Ready" : "No Job"} />
      </div>
      {primaryJob ? (
        <div className="co-field-mobile-remote-job">
          <span>{formatJobScheduleDetail(primaryJob)}</span>
          <strong>{primaryJob.address || "Address pending"}</strong>
          <button type="button" onClick={() => onSelectJob?.(primaryJob.id)}>Open job</button>
        </div>
      ) : (
        <div className="co-field-mobile-remote-empty">Contact the office if work should be assigned for today.</div>
      )}
      <FieldMobileActionGrid actions={actions} className="co-field-mobile-remote-actions" />
      {activeEntry ? (
        <div className="co-field-mobile-remote-footer">
          <span>{activeEntry.status === "on_break" ? "Break is active" : "Clock is running"}</span>
          <button type="button" onClick={() => canClockOut && onClockOut(activeEntry.id)} disabled={busy || !canClockOut}>Clock out</button>
        </div>
      ) : null}
    </section>
  );
}
function FieldMobileJobsQueue({
  role = "employee",
  workspace,
  focusJob,
  onSelectJob,
  onAcknowledgeAssignmentNotice,
  disabled,
}) {
  const isForeman = role === "foreman";
  const primaryJob = workspace?.nextAssignedJob || focusJob || workspace?.assignedJobs?.[0] || null;
  const notices = Array.isArray(workspace?.assignmentNotices) ? workspace.assignmentNotices : [];
  const assignedJobs = Array.isArray(workspace?.assignedJobs) ? workspace.assignedJobs : [];
  const upcomingJobs = isForeman && Array.isArray(workspace?.upcomingJobs) ? workspace.upcomingJobs : [];
  const queueItems = [];
  const seenJobIds = new Set(primaryJob?.id ? [primaryJob.id] : []);

  notices.forEach((notice) => {
    if (queueItems.length >= 3) return;
    const job = notice?.job;
    if (!job?.id) return;
    seenJobIds.add(job.id);
    queueItems.push({
      id: `notice-${notice.id || job.id}`,
      type: "notice",
      tone: "amber",
      label: "Confirm",
      job,
      actionLabel: "Open",
    });
  });

  [...assignedJobs, ...upcomingJobs].forEach((job) => {
    if (queueItems.length >= 3 || !job?.id || seenJobIds.has(job.id)) return;
    seenJobIds.add(job.id);
    queueItems.push({
      id: `job-${job.id}`,
      type: "job",
      tone: job === workspace?.nextAssignedJob ? "orange" : "slate",
      label: upcomingJobs.includes(job) ? "Upcoming" : "Next job",
      job,
      actionLabel: "Open",
    });
  });

  if (queueItems.length === 0) return null;

  return (
    <section className="co-field-mobile-queue" aria-label="Next field jobs">
      <div className="co-field-mobile-queue-head">
        <span>
          <strong>Next up</strong>
          <em>{isForeman ? "Assignments, crew movement, and prep." : "Assignments and safe next actions."}</em>
        </span>
        <Badge tone={notices.length ? "amber" : "slate"}>{queueItems.length}</Badge>
      </div>
      <div className="co-field-mobile-queue-list">
        {queueItems.map((item) => {
          const job = item.job;
          return (
            <div key={item.id} className="co-field-mobile-queue-card" data-tone={item.tone}>
              <span className="co-field-mobile-queue-icon"><Icon name={item.type === "notice" ? "alert" : "briefcase"} /></span>
              <div className="co-field-mobile-queue-copy">
                <p>{item.label}</p>
                <strong>{jobTitle(job)}</strong>
                <em>{formatJobScheduleDetail(job)}</em>
                <span>{job?.address || "Address pending"}</span>
              </div>
              <div className="co-field-mobile-queue-actions">
                {item.type === "notice" ? (
                  <button type="button" onClick={() => onAcknowledgeAssignmentNotice?.(job.id)} disabled={disabled || typeof onAcknowledgeAssignmentNotice !== "function"}>
                    Got it
                  </button>
                ) : null}
                <button type="button" onClick={() => onSelectJob?.(job.id)}>{item.actionLabel}</button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function FieldMobileJobsLayout({ role = "employee", children }) {
  return (
    <div className="co-office-page co-jobs-page co-field-workspace-page co-field-mobile-jobs-shell" data-field-role={role}>
      {children}
    </div>
  );
}

function FieldWorkspaceKpisPolished({ workspace, timeWorkspace, focusJob, role = "employee" }) {
  const assignedCount = workspace.assignedJobs.length;
  const noticeCount = workspace.assignmentNotices.length;
  const fieldNoteCount = focusJob ? [focusJob.fieldNotes, focusJob.materialNotes, focusJob.equipmentNotes, focusJob.safetyNotes].filter((value) => String(value || "").trim()).length : 0;
  const isForeman = role === "foreman";
  const items = [
    { label: isForeman ? "Assigned Jobs" : "Assigned Work", value: assignedCount, helper: "Visible field work", icon: "briefcase", tone: assignedCount ? "orange" : "slate" },
    { label: "Notices", value: noticeCount, helper: noticeCount ? "Needs ack" : "All acked", icon: "alert", tone: noticeCount ? "amber" : "green" },
    { label: "Active Clock", value: timeWorkspace.activeEntry ? 1 : 0, helper: timeWorkspace.activeEntry ? "Crew time running" : "Ready to clock", icon: "clock", tone: timeWorkspace.activeEntry ? "green" : "slate" },
    { label: "Field Notes", value: fieldNoteCount, helper: focusJob ? "Selected job notes" : "Select a job", icon: "document", tone: fieldNoteCount ? "blue" : "slate" },
  ];

  return (
    <div className="co-field-kpi-grid mx-auto grid w-full max-w-[1520px] min-w-0 grid-cols-2 gap-3 px-5 pb-3 sm:px-6 lg:grid-cols-4 lg:px-6">
      {items.map((item) => <CommandCenterKpiCard key={item.label} item={item} />)}
    </div>
  );
}

function FieldWorkspaceActionsPolished({ permissions, role = "employee", setActive, activeEntry, focusJob }) {
  if (typeof setActive !== "function") return null;

  const actions = [
    {
      id: "time",
      label: activeEntry ? "Time Running" : "Clock In",
      helper: activeEntry ? "Open time to break or clock out" : "Start field time",
      icon: "clock",
      enabled: permissions.time.canView,
      tone: activeEntry ? "green" : "orange",
    },
    {
      id: "reports",
      label: "Reports",
      helper: "Daily field notes",
      icon: "document",
      enabled: permissions.reports.canView,
      tone: "blue",
    },
    {
      id: "uploads",
      label: "Photos",
      helper: "Upload evidence",
      icon: "upload",
      enabled: permissions.uploads.canView,
      tone: "slate",
    },
    {
      id: "deliveryTickets",
      label: "Tickets",
      helper: "Delivery records",
      icon: "clipboard",
      enabled: permissions.deliveryTickets.canView,
      tone: "slate",
    },
    {
      id: "prePour",
      label: "Pre-Pour",
      helper: "Readiness checks",
      icon: "clipboard",
      enabled: permissions.prePour.canView,
      tone: "amber",
    },
    {
      id: "postPour",
      label: "Post-Pour",
      helper: "Closeout checks",
      icon: "clipboard",
      enabled: permissions.postPour.canView,
      tone: "amber",
    },
    {
      id: "ppe",
      label: "PPE",
      helper: "Safety gear",
      icon: "hardhat",
      enabled: permissions.safety.canView,
      tone: "green",
    },
    {
      id: "toolChecklist",
      label: "Tools",
      helper: "Loadout list",
      icon: "clipboard",
      enabled: permissions.toolChecklist.canUse,
      tone: "orange",
    },
    {
      id: "calculator",
      label: "Calculator",
      helper: focusJob ? "Save to job" : "Yardage math",
      icon: "calculator",
      enabled: permissions.calculator.canUse,
      tone: "blue",
    },
    {
      id: "changeOrders",
      label: "Changes",
      helper: "Field request",
      icon: "refresh",
      enabled: permissions.changeOrders.canRequest || permissions.changeOrders.canManage,
      tone: "slate",
    },
  ].filter((action) => action.enabled);

  if (actions.length === 0) return null;

  const mobilePrimaryActionIds = new Set(role === "foreman"
    ? ["deliveryTickets", "ppe", "toolChecklist", "calculator", "changeOrders"]
    : ["deliveryTickets", "ppe", "toolChecklist", "calculator"]);
  const desktopPrimaryActionIds = new Set(role === "foreman"
    ? ["time", "reports", "uploads", "prePour", "postPour", "toolChecklist"]
    : ["time", "uploads", "ppe", "toolChecklist"]);
  const desktopPrimaryActions = actions.filter((action) => desktopPrimaryActionIds.has(action.id));
  const desktopSecondaryActions = actions.filter((action) => !desktopPrimaryActionIds.has(action.id));
  const mobilePrimaryActions = actions.filter((action) => mobilePrimaryActionIds.has(action.id));
  const mobileSecondaryActions = actions.filter((action) => !mobilePrimaryActionIds.has(action.id));
  const openFieldTool = (toolId) => {
    setActive(toolId);
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches) {
      window.setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 0);
    }
  };
  const renderFieldAction = (action) => (
    <button key={action.id} type="button" className="co-field-action-card" data-tone={action.tone} onClick={() => openFieldTool(action.id)}>
      <span>
        <Icon name={action.icon} />
      </span>
      <strong>{action.label}</strong>
      <em>{action.helper}</em>
    </button>
  );

  return (
    <Card className="co-field-action-dock p-4">
      <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <SectionHeader
          title={role === "foreman" ? "Foreman Command Tools" : "Employee Field Tools"}
          description="Open the field-safe tools tied to the work visible for this role."
        />
        <Badge tone={focusJob ? "orange" : "slate"}>{focusJob ? jobTitle(focusJob) : "No job selected"}</Badge>
      </div>
      <div className="co-field-action-grid co-field-action-grid-desktop mt-3">
        {(desktopPrimaryActions.length ? desktopPrimaryActions : actions).map(renderFieldAction)}
      </div>
      {desktopSecondaryActions.length ? (
        <div className="co-field-action-compact-strip">
          <span>More field-safe tools</span>
          <div>
            {desktopSecondaryActions.map((action) => (
              <button key={action.id} type="button" data-tone={action.tone} onClick={() => openFieldTool(action.id)}>
                <Icon name={action.icon} />
                {action.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <div className="co-field-mobile-actions mt-3">
        <div className="co-field-action-grid co-field-action-grid-mobile">
          {(mobilePrimaryActions.length ? mobilePrimaryActions : actions).map(renderFieldAction)}
        </div>
        {mobileSecondaryActions.length ? (
          <details className="co-field-secondary-tools-drawer">
            <summary>
              <span>More field tools</span>
              <strong>{mobileSecondaryActions.length}</strong>
            </summary>
            <div className="co-field-action-grid co-field-action-grid-mobile co-field-action-grid-secondary">
              {mobileSecondaryActions.map(renderFieldAction)}
            </div>
          </details>
        ) : null}
      </div>
    </Card>
  );
}

function FieldRequiredItemsPanel({
  role = "employee",
  workspace,
  focusJob,
  permissions,
  setActive,
  onSelectJob,
  timeWorkspace,
  onAcknowledgeAssignmentNotice,
  busy,
  onClockIn,
  onClockOut,
  onStartBreak,
  onEndBreak,
}) {
  const isForeman = role === "foreman";
  const primaryJob = workspace?.nextAssignedJob || focusJob || workspace?.assignedJobs?.[0] || null;
  const notices = Array.isArray(workspace?.assignmentNotices) ? workspace.assignmentNotices : [];
  const firstNotice = notices[0] || null;
  const activeEntry = timeWorkspace?.activeEntry || null;
  const allowedCategories = Array.isArray(timeWorkspace?.allowedCategories) ? timeWorkspace.allowedCategories : [];
  const tradeGuidance = deriveFieldTradeGuidance(primaryJob);
  const proofPrompt = tradeGuidance?.proofPhotoChecklist?.slice(0, 3).join(", ");
  const reportPrompt = tradeGuidance?.fieldHandoffChecklist?.slice(0, 2).join(", ");
  const canRoute = typeof setActive === "function";
  const canQuickClockIn = Boolean(!activeEntry && primaryJob?.id && permissions?.time?.canManageOwn && allowedCategories.includes("job") && typeof onClockIn === "function");
  const canManageBreakTime = Boolean(activeEntry?.id && permissions?.time?.canManageOwn && typeof (activeEntry?.status === "on_break" ? onEndBreak : onStartBreak) === "function");
  const canClockOut = Boolean(activeEntry?.id && permissions?.time?.canManageOwn && typeof onClockOut === "function");
  const openFieldTool = (toolId) => {
    if (!canRoute) return;
    setActive(toolId);
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches) {
      window.setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 0);
    }
  };
  const quickClockIn = () => {
    if (!canQuickClockIn) return;
    onClockIn({ workCategory: "job", jobId: primaryJob.id, notes: "" });
  };
  const prePourPending = permissions?.prePour?.canView && fieldChecklistNeedsAction(primaryJob?.prePourChecklist);
  const postPourPending = permissions?.postPour?.canView && fieldChecklistNeedsAction(primaryJob?.postPourChecklist);
  const checklistTarget = prePourPending
    ? { id: "prePour", label: "Pre-Pour", detail: fieldChecklistSummary(primaryJob?.prePourChecklist) }
    : postPourPending
      ? { id: "postPour", label: "Post-Pour", detail: fieldChecklistSummary(primaryJob?.postPourChecklist) }
      : permissions?.toolChecklist?.canUse
        ? { id: "toolChecklist", label: "Tool Checklist", detail: "Review loadout" }
        : null;

  const items = [
    {
      id: "clock",
      tone: activeEntry ? "green" : "orange",
      status: activeEntry ? (activeEntry.status === "on_break" ? "On break" : "Active") : "Ready",
      title: activeEntry ? "Clock is running" : "Clock into current job",
      detail: activeEntry ? (activeEntry.jobTitle || workCategoryLabel(activeEntry.workCategory)) : (primaryJob ? jobTitle(primaryJob) : "No assigned job selected"),
      icon: "clock",
      actionLabel: activeEntry?.status === "on_break" ? "End break" : activeEntry ? "Start break" : "Clock in now",
      onAction: activeEntry?.status === "on_break"
        ? () => canManageBreakTime && onEndBreak(activeEntry.id)
        : activeEntry
          ? () => canManageBreakTime && onStartBreak(activeEntry.id)
          : quickClockIn,
      disabled: busy || (activeEntry ? !canManageBreakTime : !canQuickClockIn),
      secondaryLabel: activeEntry ? "Clock out" : "Open time",
      onSecondary: activeEntry ? () => canClockOut && onClockOut(activeEntry.id) : () => openFieldTool("time"),
      secondaryDisabled: busy || (activeEntry ? !canClockOut : !permissions?.time?.canView),
    },
    notices.length ? {
      id: "notice",
      tone: "amber",
      status: `${notices.length} notice${notices.length === 1 ? "" : "s"}`,
      title: "Acknowledge assignment",
      detail: firstNotice?.job ? `${jobTitle(firstNotice.job)} - ${formatJobScheduleDetail(firstNotice.job)}` : "Review new assignment details",
      icon: "alert",
      actionLabel: "Got it",
      onAction: () => firstNotice?.job?.id && onAcknowledgeAssignmentNotice?.(firstNotice.job.id),
      disabled: busy || !firstNotice?.job?.id || typeof onAcknowledgeAssignmentNotice !== "function",
      secondaryLabel: "View job",
      onSecondary: () => {
        if (!firstNotice?.job?.id) return;
        onSelectJob?.(firstNotice.job.id);
        openFieldTool("jobs");
      },
    } : null,
    permissions?.uploads?.canView ? {
      id: "photos",
      tone: "slate",
      status: tradeGuidance?.tradeLabel || "Evidence",
      title: "Photo evidence",
      detail: proofPrompt || (primaryJob ? `Capture photos for ${jobTitle(primaryJob)}` : "Upload field photos when assigned"),
      icon: "upload",
      actionLabel: "Upload photos",
      onAction: () => openFieldTool("uploads"),
      disabled: !canRoute,
    } : null,
    isForeman && permissions?.reports?.canView ? {
      id: "report",
      tone: "blue",
      status: "Foreman",
      title: "Daily report",
      detail: reportPrompt ? `Note: ${reportPrompt}` : "Open field notes, labor, weather, and progress",
      icon: "document",
      actionLabel: "Open report",
      onAction: () => openFieldTool("reports"),
      disabled: !canRoute,
    } : null,
    checklistTarget ? {
      id: "checklist",
      tone: prePourPending || postPourPending ? "orange" : "green",
      status: prePourPending || postPourPending ? "Pending" : "Ready",
      title: checklistTarget.label,
      detail: checklistTarget.detail,
      icon: "clipboard",
      actionLabel: "Open checklist",
      onAction: () => openFieldTool(checklistTarget.id),
      disabled: !canRoute,
    } : null,
  ].filter(Boolean);

  if (items.length === 0) return null;

  return (
    <Card className="co-field-required-panel p-4">
      <div className="co-field-required-heading">
        <SectionHeader
          title="Today's Required Items"
          description="Handle the field actions that keep the day moving."
          action={<Badge tone={items.some((item) => ["amber", "orange"].includes(item.tone)) ? "orange" : "green"}>{items.length} items</Badge>}
        />
      </div>
      <div className="co-field-required-list">
        {items.map((item) => (
          <div key={item.id} className="co-field-required-item" data-tone={item.tone}>
            <span className="co-field-required-icon"><Icon name={item.icon} /></span>
            <div className="co-field-required-copy">
              <p>{item.title}</p>
              <strong>{item.detail}</strong>
              <em>{item.status}</em>
            </div>
            <div className="co-field-required-actions">
              <Button type="button" size="sm" className="co-field-required-primary" onClick={item.onAction} disabled={item.disabled}>{item.actionLabel}</Button>
              {item.secondaryLabel ? (
                <Button type="button" size="sm" className="co-field-required-secondary" variant="secondary" onClick={item.onSecondary} disabled={item.secondaryDisabled}>{item.secondaryLabel}</Button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function FieldModeFinishPanel({ state, setActive }) {
  if (!state?.canView || !Array.isArray(state.items) || state.items.length === 0) return null;
  const canRoute = typeof setActive === "function";
  const openFieldTool = (toolId) => {
    if (!canRoute || !toolId) return;
    setActive(toolId);
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches) {
      window.setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 0);
    }
  };

  return (
    <Card className="co-field-mode-finish-panel p-4">
      <div className="co-field-mode-finish-head">
        <SectionHeader
          title={state.title}
          description={state.summary}
          action={<Badge tone={state.tone || "slate"}>{state.status}</Badge>}
        />
        <div className="co-field-mode-finish-next">
          <span>Next action</span>
          <strong>{state.nextAction?.label || "Open field work"}</strong>
          <button type="button" onClick={() => openFieldTool(state.nextAction?.moduleId || "jobs")} disabled={!canRoute || !state.nextAction?.moduleId}>
            {state.nextAction?.actionLabel || "Open"}
          </button>
        </div>
      </div>
      <div className="co-field-mode-finish-grid">
        {state.items.map((item) => (
          <button
            key={item.id}
            type="button"
            data-tone={item.tone || "slate"}
            data-ready={item.ready ? "true" : "false"}
            onClick={() => openFieldTool(item.moduleId)}
            disabled={!item.enabled || !canRoute || !item.moduleId}
          >
            <span>{item.label}</span>
            <strong>{item.status}</strong>
            <em>{item.helper}</em>
          </button>
        ))}
      </div>
      <p className="co-field-mode-finish-boundary">{state.safetyBoundary}</p>
    </Card>
  );
}

function FieldWorkspacePagePolished({
  role = "employee",
  workspace,
  focusJob,
  permissions,
  fieldOpsAgent,
  setActive,
  timeWorkspace,
  onSelectJob,
  onJobFieldChange,
  onAcknowledgeAssignmentNotice,
  busy,
  onClockIn,
  onClockOut,
  onStartBreak,
  onEndBreak,
  dailyReports,
  uploads,
  deliveryTickets,
  safetyIncidents,
  toolChecklists,
}) {
  const isForeman = role === "foreman";
  const assignedTitle = isForeman ? "Assigned Jobs" : "Assigned Work";
  const assignedDescription = isForeman ? "Jobs you are currently responsible for in the field." : "Only your assigned jobs appear here. Contact office if something looks wrong.";
  const emptyAssignedTitle = isForeman ? "No assigned jobs yet" : "No assigned jobs yet";
  const emptyAssignedDescription = isForeman ? "Contact office if this is wrong or if a scheduled job is missing from your workspace." : "Contact office if you expected a job to be assigned to you today.";
  const priorityJob = workspace.nextAssignedJob || focusJob || workspace.assignedJobs[0] || null;
  const priorityJobTitle = workspace.nextAssignedJob ? "" : priorityJob ? "Current field job" : "";
  const priorityJobDescription = workspace.nextAssignedJob
    ? "Primary field assignment with the fastest safe actions for this role."
    : "Current field-safe job with schedule, address, directions, and quick actions.";
  const fieldModeFinish = useMemo(() => deriveFieldModeFinishState({
    role,
    workspace,
    focusJob: priorityJob,
    permissions,
    timeWorkspace,
    dailyReports,
    uploads,
    deliveryTickets,
    safetyIncidents,
    toolChecklists,
    pwaInstallReady: true,
  }), [dailyReports, deliveryTickets, focusJob, permissions, priorityJob, role, safetyIncidents, timeWorkspace, toolChecklists, uploads, workspace]);

  return (
    <FieldMobileJobsLayout role={role}>
      <PageHeader
        eyebrow="Field Workspace"
        title="Field Mode"
        description={isForeman ? "Run assigned jobs, crew time, notes, checklists, photos, tickets, and job-safe tools from one field view." : "Open assigned work, clock in, review field notes, and use job-safe tools."}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="orange">{workspace.assignedJobs.length} assigned job{workspace.assignedJobs.length === 1 ? "" : "s"}</Badge>
            {workspace.assignmentNotices.length ? <Badge tone="amber">{workspace.assignmentNotices.length} notice{workspace.assignmentNotices.length === 1 ? "" : "s"}</Badge> : <Badge tone="green">Field-safe</Badge>}
          </div>
        }
      />
      <div className="co-field-landing-stack mx-auto flex w-full max-w-[1400px] min-w-0 flex-col gap-3 px-5 pb-3 sm:px-6 lg:px-6">
        <FieldMobileRemoteControlPanel
          role={role}
          workspace={workspace}
          focusJob={focusJob}
          permissions={permissions}
          setActive={setActive}
          timeWorkspace={timeWorkspace}
          onSelectJob={onSelectJob}
          onClockIn={onClockIn}
          onClockOut={onClockOut}
          onStartBreak={onStartBreak}
          onEndBreak={onEndBreak}
          busy={busy}
        />
        <FieldMobileJobsQueue
          role={role}
          workspace={workspace}
          focusJob={focusJob}
          onSelectJob={onSelectJob}
          onAcknowledgeAssignmentNotice={onAcknowledgeAssignmentNotice}
          disabled={busy}
        />
        <FieldModeFinishPanel state={fieldModeFinish} setActive={setActive} />
        <div className="co-field-operator-wrap">
          <FieldJobOperatorPanel role={role} workspace={workspace} focusJob={focusJob} permissions={permissions} setActive={setActive} onSelectJob={onSelectJob} activeEntry={timeWorkspace.activeEntry} />
        </div>
        <div className="co-field-required-wrap">
          <FieldRequiredItemsPanel
            role={role}
            workspace={workspace}
            focusJob={focusJob}
            permissions={permissions}
            setActive={setActive}
            onSelectJob={onSelectJob}
            timeWorkspace={timeWorkspace}
            onAcknowledgeAssignmentNotice={onAcknowledgeAssignmentNotice}
            busy={busy}
            onClockIn={onClockIn}
            onClockOut={onClockOut}
            onStartBreak={onStartBreak}
            onEndBreak={onEndBreak}
          />
        </div>
        {fieldOpsAgent?.canView ? (
          <div className="co-field-required-wrap">
            <FieldOpsAgentSummaryCard state={fieldOpsAgent} onOpenModule={setActive} compact />
          </div>
        ) : null}
      </div>
      <FieldWorkspaceKpisPolished workspace={workspace} timeWorkspace={timeWorkspace} focusJob={focusJob} role={role} />
      <div className="co-field-command-layout mx-auto grid w-full max-w-[1400px] min-w-0 gap-3 px-5 pb-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_376px] lg:px-6">
        <div className="co-field-left-stack min-w-0 space-y-3">
          <FieldAssignmentNoticePanel notices={workspace.assignmentNotices} onSelectJob={onSelectJob} onAcknowledge={onAcknowledgeAssignmentNotice} disabled={busy} />
          <section className="co-field-today-board">
            <div className="co-field-today-board-header">
              <SectionHeader
                title="Today's Field Board"
                description="Clock status, current assignment, address, and first field actions stay together."
                action={priorityJob ? <Badge tone="orange">{jobTitle(priorityJob)}</Badge> : <Badge tone="slate">No job selected</Badge>}
              />
            </div>
            <div className="co-field-two-up grid min-w-0 gap-3 xl:grid-cols-2">
              <ActiveTimeCard
                activeEntry={timeWorkspace.activeEntry}
                availableJobs={timeWorkspace.availableJobs}
                allowedCategories={timeWorkspace.allowedCategories}
                onClockIn={onClockIn}
                onClockOut={onClockOut}
                onStartBreak={onStartBreak}
                onEndBreak={onEndBreak}
                disabled={busy}
                compactMobile
                mobileDefaultOpen={false}
                heroClock
                description={isForeman ? "Clock your own assigned or field-visible work without exposing payroll or pricing data." : undefined}
              />
              <FieldNextJobCard
                job={priorityJob}
                titleOverride={priorityJobTitle}
                descriptionOverride={priorityJobDescription}
                onSelect={onSelectJob}
                setActive={setActive}
                permissions={permissions}
                activeEntry={timeWorkspace.activeEntry}
              />
            </div>
          </section>
          <FieldWorkspaceActionsPolished permissions={permissions} role={role} setActive={setActive} activeEntry={timeWorkspace.activeEntry} focusJob={focusJob} />
          <div className="co-field-mobile-focus-card">
            <FieldWorkspaceDisclosure
              title={focusJob ? "Selected job details" : "Selected job"}
              description={focusJob ? (focusJob.customer || "Assigned site") : "Choose an assigned job to review field-safe details."}
              badge={focusJob ? jobStatusLabel(focusJob.status || focusJob.stage) : "None"}
            >
              <FieldJobFocusCard job={focusJob} permissions={permissions} onFieldChange={onJobFieldChange} disabled={busy} embedded />
            </FieldWorkspaceDisclosure>
          </div>
          <FieldWorkspaceDisclosure title={assignedTitle} description={assignedDescription} badge={`${workspace.assignedJobs.length} assigned`} defaultOpen={workspace.assignedJobs.length > 0}>
            {workspace.assignedJobs.length > 0 ? (
              <div className="co-field-assigned-job-list">
                {workspace.assignedJobs.map((job) => (
                  <FieldJobSummaryCard key={job.id} job={job} selected={focusJob?.id === job.id} onSelect={onSelectJob} note="Assigned" />
                ))}
              </div>
            ) : (
              <StateCard title={emptyAssignedTitle} description={emptyAssignedDescription} tone="slate" />
            )}
          </FieldWorkspaceDisclosure>
          {isForeman ? (
            <FieldWorkspaceDisclosure title="Upcoming Planning Jobs" description="Future field-visible jobs for crew, tools, and site prep." badge={`${workspace.upcomingJobs.length} upcoming`}>
              {workspace.upcomingJobs.length > 0 ? (
                <div className="co-field-assigned-job-list">
                  {workspace.upcomingJobs.map((job) => (
                    <FieldJobSummaryCard key={job.id} job={job} selected={focusJob?.id === job.id} onSelect={onSelectJob} note="Upcoming" />
                  ))}
                </div>
              ) : (
                <StateCard title="No upcoming field-visible jobs" description="Once office planning flags future work for field visibility, it will appear here." tone="slate" />
              )}
            </FieldWorkspaceDisclosure>
          ) : null}
        </div>
        <div className="co-field-right-rail min-w-0">
          <FieldJobFocusCard job={focusJob} permissions={permissions} onFieldChange={onJobFieldChange} disabled={busy} />
        </div>
      </div>
    </FieldMobileJobsLayout>
  );
}

function fieldWorkspaceJobList(workspace, { includeUpcoming = false } = {}) {
  const assignedJobs = Array.isArray(workspace?.assignedJobs) ? workspace.assignedJobs : [];
  const upcomingJobs = includeUpcoming && Array.isArray(workspace?.upcomingJobs) ? workspace.upcomingJobs : [];
  const seen = new Set();
  return [...assignedJobs, ...upcomingJobs].filter((job) => {
    if (!job?.id || seen.has(job.id)) return false;
    seen.add(job.id);
    return true;
  });
}

function deriveFieldWorkspaceFocusJob(workspace, selectedJobId, selectedJob, { includeUpcoming = false } = {}) {
  const allowedJobs = fieldWorkspaceJobList(workspace, { includeUpcoming });
  const allowedIds = new Set(allowedJobs.map((job) => job.id));
  if (selectedJobId) {
    const selectedAllowedJob = allowedJobs.find((job) => job.id === selectedJobId);
    if (selectedAllowedJob) return selectedAllowedJob;
  }
  if (selectedJob?.id && allowedIds.has(selectedJob.id)) return selectedJob;
  return workspace?.nextAssignedJob || workspace?.primaryJob || allowedJobs[0] || null;
}

export function ForemanWorkspacePage({ rows, user, selectedJobId, onSelectJob, selectedJob, onJobFieldChange, onAcknowledgeAssignmentNotice, busy, permissions, setActive, timeEntries, dailyReports, uploads, deliveryTickets, prePourChecklists, postPourChecklists, safetyIncidents, toolChecklists, currentCompanyId, onClockIn, onClockOut, onStartBreak, onEndBreak }) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const workspace = useMemo(() => deriveForemanWorkspace(safeRows, user?.id), [safeRows, user?.id]);
  const fieldJobs = useMemo(() => fieldWorkspaceJobList(workspace, { includeUpcoming: true }), [workspace]);
  const focusJob = useMemo(() => deriveFieldWorkspaceFocusJob(workspace, selectedJobId, selectedJob, { includeUpcoming: true }), [selectedJob, selectedJobId, workspace]);
  const timeWorkspace = useMemo(() => deriveTimeWorkspace(timeEntries, fieldJobs, user?.id, permissions.time.allowedCategories || []), [fieldJobs, permissions.time.allowedCategories, timeEntries, user?.id]);
  const fieldOpsAgent = useMemo(() => deriveFieldOpsAgentState({
    currentCompanyId,
    jobs: fieldJobs,
    dailyReports,
    uploads,
    deliveryTickets,
    prePourChecklists,
    postPourChecklists,
    safetyIncidents,
    toolChecklists,
    timeEntries,
  }, {
    companyId: currentCompanyId,
    permissions,
    user,
  }), [currentCompanyId, dailyReports, deliveryTickets, fieldJobs, permissions, postPourChecklists, prePourChecklists, safetyIncidents, timeEntries, toolChecklists, uploads, user]);

  return (
    <FieldWorkspacePagePolished
      role="foreman"
      workspace={workspace}
      focusJob={focusJob}
      permissions={permissions}
      fieldOpsAgent={fieldOpsAgent}
      setActive={setActive}
      timeWorkspace={timeWorkspace}
      onSelectJob={onSelectJob}
      onJobFieldChange={onJobFieldChange}
      onAcknowledgeAssignmentNotice={onAcknowledgeAssignmentNotice}
      busy={busy}
      onClockIn={onClockIn}
      onClockOut={onClockOut}
      onStartBreak={onStartBreak}
      onEndBreak={onEndBreak}
      dailyReports={dailyReports}
      uploads={uploads}
      deliveryTickets={deliveryTickets}
      safetyIncidents={safetyIncidents}
      toolChecklists={toolChecklists}
    />
  );
}

export function EmployeeWorkspacePage({ rows, user, selectedJobId, onSelectJob, selectedJob, permissions, setActive, timeEntries, dailyReports, uploads, deliveryTickets, prePourChecklists, postPourChecklists, safetyIncidents, toolChecklists, currentCompanyId, onClockIn, onClockOut, onStartBreak, onEndBreak, onAcknowledgeAssignmentNotice, busy }) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const workspace = useMemo(() => deriveEmployeeWorkspace(safeRows, user?.id), [safeRows, user?.id]);
  const fallbackJob = useMemo(() => deriveFieldWorkspaceFocusJob(workspace, selectedJobId, selectedJob), [selectedJob, selectedJobId, workspace]);
  const timeWorkspace = useMemo(() => deriveTimeWorkspace(timeEntries, workspace.assignedJobs, user?.id, permissions.time.allowedCategories || []), [permissions.time.allowedCategories, timeEntries, user?.id, workspace.assignedJobs]);
  const fieldOpsAgent = useMemo(() => deriveFieldOpsAgentState({
    currentCompanyId,
    jobs: workspace.assignedJobs,
    dailyReports,
    uploads,
    deliveryTickets,
    prePourChecklists,
    postPourChecklists,
    safetyIncidents,
    toolChecklists,
    timeEntries,
  }, {
    companyId: currentCompanyId,
    permissions,
    user,
  }), [currentCompanyId, dailyReports, deliveryTickets, permissions, postPourChecklists, prePourChecklists, safetyIncidents, timeEntries, toolChecklists, uploads, user, workspace.assignedJobs]);

  return (
    <FieldWorkspacePagePolished
      role="employee"
      workspace={workspace}
      focusJob={fallbackJob}
      permissions={permissions}
      fieldOpsAgent={fieldOpsAgent}
      setActive={setActive}
      timeWorkspace={timeWorkspace}
      onSelectJob={onSelectJob}
      onJobFieldChange={() => {}}
      onAcknowledgeAssignmentNotice={onAcknowledgeAssignmentNotice}
      busy={busy}
      onClockIn={onClockIn}
      onClockOut={onClockOut}
      onStartBreak={onStartBreak}
      onEndBreak={onEndBreak}
      dailyReports={dailyReports}
      uploads={uploads}
      deliveryTickets={deliveryTickets}
      safetyIncidents={safetyIncidents}
      toolChecklists={toolChecklists}
    />
  );
}
