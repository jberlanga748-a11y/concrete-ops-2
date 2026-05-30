import { useEffect, useMemo, useState } from "react";

import { ApexWorkspaceLeaderShell, Badge, Button, StateCard } from "./app-shell-components";
import { EmployeeWorkspacePage, ForemanWorkspacePage } from "./field-workspace-page-components";
import { jobTitle } from "./job-utils";
import { reportStatusLabel } from "./report-utils";
import { deriveScheduleCoordinationState, scheduleDateLabel } from "./schedule-route-utils";

function normalizeObjectArray(value, fallback = []) {
  if (Array.isArray(value)) {
    return value.filter((item) => item && typeof item === "object");
  }
  if (Array.isArray(fallback)) {
    return fallback.filter((item) => item && typeof item === "object");
  }
  return [];
}

function todayDateInputValue() {
  return new Date().toISOString().slice(0, 10);
}
export function FieldWorkspaceLeaderPage({
  user,
  currentCompanyId,
  jobs,
  visibleJobs,
  selectedJobId,
  selectedJob,
  onSelectJob,
  permissions,
  setActive,
  timeEntries,
  dailyReports,
  uploads,
  deliveryTickets,
  changeOrderRequests,
  prePourChecklists,
  postPourChecklists,
  safetyIncidents,
  toolChecklists,
  onJobFieldChange,
  onAcknowledgeAssignmentNotice,
  busy,
  onClockIn,
  onClockOut,
  onStartBreak,
  onEndBreak,
}) {
  const isFieldRoleWorkspace = !permissions.jobs.canManageAll && !permissions.leads.canView;
  const fieldRows = Array.isArray(visibleJobs) ? visibleJobs : jobs;

  if (isFieldRoleWorkspace && permissions.jobs.canManageField) {
    return (
      <ForemanWorkspacePage
        rows={fieldRows}
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
        changeOrderRequests={changeOrderRequests}
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

  if (isFieldRoleWorkspace) {
    return (
      <EmployeeWorkspacePage
        rows={fieldRows}
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
        changeOrderRequests={changeOrderRequests}
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

  return (
    <OfficeFieldWorkspaceLeaderPage
      jobs={fieldRows}
      selectedFieldJobId={selectedJobId}
      onSelectJob={onSelectJob}
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
    />
  );
}

function OfficeFieldWorkspaceLeaderPage({
  jobs,
  selectedFieldJobId,
  onSelectJob,
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
}) {
  const safeJobs = useMemo(() => normalizeObjectArray(jobs).filter((job) => !job.archivedAt), [jobs]);
  const scheduleState = useMemo(() => deriveScheduleCoordinationState({
    jobs: safeJobs,
    dailyReports,
    uploads,
    deliveryTickets,
    prePourChecklists,
    postPourChecklists,
    toolChecklists,
    safetyIncidents,
    timeEntries,
  }), [dailyReports, deliveryTickets, postPourChecklists, prePourChecklists, safeJobs, safetyIncidents, timeEntries, toolChecklists, uploads]);
  const [selectedFieldItemId, setSelectedFieldItemId] = useState("");
  const fieldQueue = useMemo(() => {
    const seen = new Set();
    const rows = [
      ...scheduleState.missingRows,
      ...scheduleState.todayRows,
      ...scheduleState.tomorrowRows,
      ...scheduleState.unassignedRows,
    ].filter((row) => {
      const key = `${row.job?.id || "job"}-${row.dateKey || "unscheduled"}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return rows.slice(0, 7).map((row, index) => {
      const job = row.job || {};
      const missingLabel = row.missing.length ? row.missing.slice(0, 3).join(" / ") : "Ready";
      const isToday = row.dateKey === scheduleState.todayKey;
      const isTomorrow = row.dateKey === scheduleState.tomorrowKey;
      return {
        id: `field-${job.id || index}-${row.dateKey || "unscheduled"}`,
        eyebrow: row.missing.length ? "Needs Field Review" : isToday ? "Today" : isTomorrow ? "Tomorrow Prep" : "Field Work",
        title: jobTitle(job),
        meta: [job.customer, job.address || job.city, scheduleDateLabel(row.dateKey)].filter(Boolean).join(" / ") || "Job context pending",
        statusLabel: missingLabel,
        tone: row.tone || (row.missing.length ? "amber" : "green"),
        actionLabel: row.missing.length ? "Resolve" : "Open job",
        moduleId: "jobs",
        row,
      };
    });
  }, [scheduleState]);
  const selectedFieldItem = fieldQueue.find((item) => item.id === selectedFieldItemId) || fieldQueue.find((item) => item.row?.job?.id === selectedFieldJobId) || fieldQueue[0] || null;

  useEffect(() => {
    if (selectedFieldItem && selectedFieldItem.id !== selectedFieldItemId) {
      setSelectedFieldItemId(selectedFieldItem.id);
    }
  }, [selectedFieldItem, selectedFieldItemId]);

  function openModule(moduleId) {
    if (moduleId) setActive?.(moduleId);
  }

  function openFieldQueueItem(item = selectedFieldItem) {
    if (item?.row?.job?.id) onSelectJob?.(item.row.job.id);
    openModule(item?.moduleId || "jobs");
  }

  const proofGapCount = scheduleState.missingRows.filter((row) => row.missing.some((item) => ["Report", "Photos", "Ticket"].includes(item))).length;
  const crewGapCount = scheduleState.unassignedRows.length;
  const fieldTools = [
    { id: "jobs", label: "Jobs", helper: "Setup, crew, startup", icon: "briefcase", tone: "blue", count: safeJobs.length, disabled: !permissions.jobs.canView && !permissions.jobs.canManageAll },
    { id: "schedule", label: "Schedule", helper: "Today and lookahead", icon: "calendar", tone: "orange", count: scheduleState.stats.today, disabled: !permissions.jobs.canManageAll },
    { id: "time", label: "Time", helper: "Clock and crew activity", icon: "clock", tone: "green", count: scheduleState.stats.activeClocks, disabled: !permissions.time.canView },
    { id: "reports", label: "Reports", helper: "Daily closeout", icon: "document", tone: proofGapCount ? "amber" : "slate", count: normalizeObjectArray(dailyReports).filter((report) => !report.archivedAt).length, disabled: !permissions.reports.canView },
    { id: "uploads", label: "Photos", helper: "Jobsite evidence", icon: "upload", tone: "slate", count: normalizeObjectArray(uploads).filter((upload) => !upload.archivedAt).length, disabled: !permissions.uploads.canView },
    { id: "deliveryTickets", label: "Tickets", helper: "Concrete deliveries", icon: "clipboard", tone: "slate", count: normalizeObjectArray(deliveryTickets).filter((ticket) => !ticket.archivedAt).length, disabled: !permissions.deliveryTickets.canView },
    { id: "prePour", label: "Pre-Pour", helper: "Readiness checks", icon: "clipboard", tone: "amber", count: normalizeObjectArray(prePourChecklists).filter((checklist) => !checklist.archivedAt).length, disabled: !permissions.prePour.canView },
    { id: "postPour", label: "Post-Pour", helper: "Finish checks", icon: "clipboard", tone: "amber", count: normalizeObjectArray(postPourChecklists).filter((checklist) => !checklist.archivedAt).length, disabled: !permissions.postPour.canView },
    { id: "toolChecklist", label: "Tools", helper: "Loadout blockers", icon: "layers", tone: "orange", count: normalizeObjectArray(toolChecklists).filter((checklist) => !checklist.archivedAt).length, disabled: !permissions.toolChecklist.canUse },
    { id: "changeOrders", label: "Changes", helper: "Scope requests", icon: "refresh", tone: "slate", count: null, disabled: !permissions.changeOrders.canView },
  ].filter((tool) => !tool.disabled);
  const primaryFieldTools = [
    ...fieldTools.filter((tool) => ["jobs", "schedule", "reports", "uploads"].includes(tool.id)),
    ...fieldTools.filter((tool) => !["jobs", "schedule", "reports", "uploads"].includes(tool.id)),
  ].slice(0, 4);
  const kpis = [
    { id: "today", label: "Today", value: scheduleState.stats.today, helper: `${scheduleState.stats.tomorrow} tomorrow`, icon: "calendar", tone: scheduleState.stats.today ? "blue" : "slate", onClick: () => openModule("schedule") },
    { id: "field-gaps", label: "Gaps", value: scheduleState.stats.missingActivity, helper: `${proofGapCount} proof / ${crewGapCount} crew`, icon: "alert", tone: scheduleState.stats.missingActivity ? "amber" : "green", onClick: () => openModule("jobs") },
    { id: "active-time", label: "Clocked In", value: scheduleState.stats.activeClocks, helper: "right now", icon: "clock", tone: scheduleState.stats.activeClocks ? "green" : "slate", onClick: () => openModule("time") },
  ];
  const quickActions = [
    { id: "open-jobs", label: "Jobs", icon: "briefcase", onClick: () => openModule("jobs"), disabled: !permissions.jobs.canView && !permissions.jobs.canManageAll },
    { id: "open-time", label: "Clock", icon: "clock", onClick: () => openModule("time"), disabled: !permissions.time.canView },
    { id: "open-photos", label: "Photos", icon: "upload", onClick: () => openModule("uploads"), disabled: !permissions.uploads.canView },
  ].filter((action) => !action.disabled);
  return (
    <div className="co-office-page co-field-leader-page">
      <ApexWorkspaceLeaderShell
        eyebrow="Workspace"
        title="Field"
        description="Today's field work, blockers, and proof."
        kpis={kpis}
        tools={primaryFieldTools}
        onSelectTool={(tool) => openModule(tool.id)}
        toolTitle="Primary tools"
        toolDescription="The four tools used most often from this workspace."
        queue={{
          title: "Top blockers",
          description: fieldQueue.length ? "Only the highest-risk items stay on this page." : "No field blockers are active right now.",
          items: fieldQueue,
          selectedId: selectedFieldItem?.id,
          onSelect: (item) => setSelectedFieldItemId(item.id),
          limit: 3,
          badgeLabel: `${Math.min(fieldQueue.length, 3)}/${fieldQueue.length || 3}`,
          emptyState: <StateCard title="Field queue clear" description="Jobs, proof, crew, and checklist issues will appear here when they need action." tone="green" />,
        }}
        detail={{
          title: "Next action",
          item: selectedFieldItem,
          render: (item) => {
            const row = item?.row || {};
            const job = row.job || {};
            return item ? (
              <>
                <div className="co-apex-selected-record">
                  <Badge tone={item.tone || "slate"}>{item.eyebrow || "Field"}</Badge>
                  <h2>{item.title}</h2>
                  <p>{item.meta || "Review the job context before moving work forward."}</p>
                </div>
                <div className="co-apex-selected-facts co-field-leader-selected-facts">
                  <span><em>Date</em><strong>{scheduleDateLabel(row.dateKey)}</strong></span>
                  <span><em>Crew</em><strong>{row.crewLabels?.length ? row.crewLabels.slice(0, 2).join(", ") : "Crew missing"}</strong></span>
                  <span><em>Report</em><strong>{row.report ? reportStatusLabel(row.report.status) : row.dateKey && row.dateKey <= todayDateInputValue() ? "Missing" : "Not due"}</strong></span>
                  <span><em>Proof</em><strong>{row.proofState?.photoCount || 0} photos / {row.proofState?.ticketCount || 0} tickets</strong></span>
                </div>
                <div className="co-apex-selected-next">
                  <span>Next field-safe action</span>
                  <strong>{row.missing?.length ? `Resolve ${row.missing[0]}` : "Open job"}</strong>
                  <p>{row.missing?.length ? `${row.missing.join(", ")} need review.` : "This item looks ready. Open the job for details."}</p>
                </div>
                <div className="co-apex-selected-actions">
                  <Button type="button" onClick={() => openFieldQueueItem(item)}>Open job</Button>
                  {permissions.reports.canView ? <Button type="button" variant="secondary" onClick={() => openModule("reports")}>Reports</Button> : null}
                  {permissions.uploads.canView ? <Button type="button" variant="secondary" onClick={() => openModule("uploads")}>Photos</Button> : null}
                </div>
              </>
            ) : null;
          },
        }}
        quickActions={quickActions}
      />
    </div>
  );
}
