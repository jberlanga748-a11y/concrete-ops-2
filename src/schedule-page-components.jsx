import { useEffect, useMemo, useState } from "react";

import { AssistantRail, ApexOfficeCommandShell, Badge, Button, Card, CommandPageFrame, DesktopCommandDrawer, Icon, PageHeader, StateCard, StatusBadge, WorkQueueCard } from "./app-shell-components";
import { directionsUrl, formatJobScheduleDetail } from "./field-format-utils";
import { jobStatusLabel, jobTitle } from "./job-utils";
import { reportStatusLabel } from "./report-utils";
import { deriveScheduleCoordinationState, scheduleDateLabel, scheduleRowKey, scheduleRowTone, scheduleUniqueRows } from "./schedule-route-utils";

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

function useDesktopCommandViewport(minWidth = 1024) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return true;
    return window.matchMedia(`(min-width: ${minWidth}px)`).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return undefined;
    const mediaQuery = window.matchMedia(`(min-width: ${minWidth}px)`);
    const update = () => setMatches(mediaQuery.matches);
    update();
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", update);
      return () => mediaQuery.removeEventListener("change", update);
    }
    mediaQuery.addListener(update);
    return () => mediaQuery.removeListener(update);
  }, [minWidth]);

  return matches;
}
function ScheduleJobCard({ row, permissions, onOpenJob, onOpenModule, onOpenReport, compact = false }) {
  const job = row.job;
  const missingLabel = row.missing.length ? row.missing.slice(0, 4).join(" / ") : "Ready";
  const crewLabel = row.crewLabels.length ? row.crewLabels.slice(0, 3).join(", ") : "Crew missing";
  const canOpenReports = Boolean(permissions?.reports?.canView);
  const canOpenUploads = Boolean(permissions?.uploads?.canView);
  const canOpenTickets = Boolean(permissions?.deliveryTickets?.canView);
  const mapUrl = directionsUrl(job.address || "");

  return (
    <article className={`co-schedule-job-card ${compact ? "co-schedule-job-card-compact" : ""}`} data-tone={row.tone}>
      <div className="co-schedule-job-main">
        <button type="button" className="co-schedule-job-title" onClick={() => onOpenJob(row)}>
          <span>
            <strong>{jobTitle(job)}</strong>
            <small>{[job.customer, job.address || job.city].filter(Boolean).join(" / ") || "Customer or location pending"}</small>
          </span>
          <Icon name="arrowUpRight" />
        </button>
        <div className="co-schedule-job-badges">
          <StatusBadge status={jobStatusLabel(job.status || job.stage)} />
          <Badge tone={row.missing.length ? (row.tone === "red" ? "red" : "amber") : "green"}>{missingLabel}</Badge>
        </div>
      </div>
      <div className="co-schedule-job-grid">
        <span><em>Date</em><strong>{row.dateKey ? scheduleDateLabel(row.dateKey) : "Unscheduled"}</strong></span>
        <span><em>Time</em><strong>{formatJobScheduleDetail(job)}</strong></span>
        <span><em>Foreman</em><strong>{row.foreman}</strong></span>
        <span><em>Crew</em><strong>{crewLabel}</strong></span>
        <span><em>Report</em><strong>{row.report ? reportStatusLabel(row.report.status) : row.dateKey && row.dateKey <= todayDateInputValue() ? "Missing" : "Not due"}</strong></span>
        <span><em>Proof</em><strong>{row.proofState.photoCount} photos / {row.proofState.ticketCount} tickets</strong></span>
      </div>
      <div className="co-schedule-job-actions">
        <Button type="button" size="sm" onClick={() => onOpenJob(row)}>Job</Button>
        {canOpenReports ? <Button type="button" size="sm" variant="secondary" onClick={() => onOpenReport(row)}>{row.report ? "Report" : "Reports"}</Button> : null}
        {canOpenUploads ? <Button type="button" size="sm" variant="secondary" onClick={() => onOpenModule("uploads")}>Photos</Button> : null}
        {canOpenTickets ? <Button type="button" size="sm" variant="secondary" onClick={() => onOpenModule("deliveryTickets")}>Tickets</Button> : null}
        {mapUrl ? <a className="co-schedule-map-link" href={mapUrl} target="_blank" rel="noreferrer">Map</a> : null}
      </div>
    </article>
  );
}

function ScheduleSection({ title, description, rows = [], emptyTitle, emptyDescription, permissions, onOpenJob, onOpenModule, onOpenReport, compact = false, limit = 6 }) {
  const visibleRows = normalizeObjectArray(rows).slice(0, limit);
  return (
    <Card className="co-schedule-section overflow-hidden">
      <div className="co-schedule-section-header">
        <div className="min-w-0">
          <p>{title}</p>
          <span>{description}</span>
        </div>
        <Badge tone={rows.length ? "orange" : "slate"}>{rows.length}</Badge>
      </div>
      <div className="co-schedule-section-list">
        {visibleRows.length ? visibleRows.map((row) => (
          <ScheduleJobCard
            key={`${title}-${row.job.id}-${row.dateKey || "unscheduled"}`}
            row={row}
            permissions={permissions}
            onOpenJob={onOpenJob}
            onOpenModule={onOpenModule}
            onOpenReport={onOpenReport}
            compact={compact}
          />
        )) : (
          <StateCard title={emptyTitle} description={emptyDescription} tone="slate" />
        )}
      </div>
      {rows.length > visibleRows.length ? (
        <div className="co-schedule-section-footer">
          <span>Showing {visibleRows.length} of {rows.length}</span>
        </div>
      ) : null}
    </Card>
  );
}

function ScheduleOperatingPlanWorkbench({
  scheduleState,
  permissions,
  selectedRow,
  onSelectRow,
  onOpenJob,
  onOpenModule,
  onOpenReport,
}) {
  const primaryRows = scheduleUniqueRows([
    ...scheduleState.todayRows,
    ...scheduleState.missingRows,
    ...scheduleState.tomorrowRows,
    ...scheduleState.unassignedRows,
  ]).slice(0, 5);
  const tomorrowPrepRows = scheduleUniqueRows(scheduleState.tomorrowRows).slice(0, 3);
  const crewLoads = Array.from(primaryRows.reduce((map, row) => {
    const labels = row.crewLabels.length ? row.crewLabels : [row.foreman || "Unassigned"];
    labels.slice(0, 2).forEach((label) => {
      const key = label || "Unassigned";
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, new Map()).entries()).slice(0, 5);
  const focusRow = selectedRow || primaryRows[0] || null;
  const focusJob = focusRow?.job || null;
  const canOpenReports = Boolean(permissions?.reports?.canView);
  const canOpenUploads = Boolean(permissions?.uploads?.canView);
  const canOpenTickets = Boolean(permissions?.deliveryTickets?.canView);

  return (
    <section className="co-schedule-command-workbench" aria-label="Daily operating plan">
      <div className="co-schedule-command-head">
        <div className="min-w-0">
          <p>Daily operating plan</p>
          <h2>Dispatch today, prep tomorrow, clear blockers</h2>
          <span>Schedule, crew load, field proof, safety, and closeout readiness in one office pass.</span>
        </div>
        <div className="co-schedule-command-actions">
          <Button type="button" variant="secondary" onClick={() => onOpenModule("jobs")}>Open Jobs</Button>
          <Button type="button" onClick={() => onOpenModule("reports")}>Review Reports</Button>
        </div>
      </div>

      <div className="co-schedule-command-grid">
        <div className="co-schedule-dispatch-queue">
          <div className="co-schedule-command-section-head">
            <span>Operating queue</span>
            <strong>{primaryRows.length || "Clear"}</strong>
          </div>
          {primaryRows.length ? primaryRows.map((row) => {
            const job = row.job;
            const missingLabel = row.missing.length ? row.missing.slice(0, 3).join(" / ") : "Ready";
            const crewLabel = row.crewLabels.length ? row.crewLabels.slice(0, 2).join(", ") : "Crew missing";
            return (
              <WorkQueueCard
                key={`${job.id}-${row.dateKey || "unscheduled"}`}
                eyebrow={row.dateKey === scheduleState.todayKey ? "Today" : row.dateKey === scheduleState.tomorrowKey ? "Tomorrow prep" : row.dateKey ? "Lookahead" : "Needs scheduling"}
                title={jobTitle(job)}
                meta={[job.customer, job.city || job.address, scheduleDateLabel(row.dateKey)].filter(Boolean).join(" / ")}
                status={jobStatusLabel(job.status || job.stage)}
                tone={scheduleRowTone(row)}
                actionLabel="Inspect plan"
                selected={focusJob?.id === job.id && focusRow?.dateKey === row.dateKey}
                onClick={() => onSelectRow(row)}
              >
                <div className="co-schedule-command-row-facts">
                  <span>Time <strong>{formatJobScheduleDetail(job)}</strong></span>
                  <span>Crew <strong>{crewLabel}</strong></span>
                  <span>Proof <strong>{row.proofState.photoCount} photos / {row.proofState.ticketCount} tickets</strong></span>
                  <span data-state={row.missing.length ? "needs" : "ready"}>Blockers <strong>{missingLabel}</strong></span>
                </div>
              </WorkQueueCard>
            );
          }) : (
            <div className="co-schedule-command-empty">
              <strong>No scheduled work in this view</strong>
              <span>Jobs appear here when they need dispatch, crew prep, or field follow-up.</span>
            </div>
          )}
        </div>

        <div className="co-schedule-selected-panel">
          <div className="co-schedule-command-section-head">
            <span>Selected job and tomorrow prep</span>
            <strong>{focusRow ? (focusRow.missing.length ? "Needs action" : "Ready") : "Waiting"}</strong>
          </div>
          {focusRow ? (
            <>
              <div className="co-schedule-selected-title">
                <div className="min-w-0">
                  <h3>{jobTitle(focusJob)}</h3>
                  <p>{[focusJob.customer, focusJob.address || focusJob.city].filter(Boolean).join(" / ") || "Location pending"}</p>
                </div>
                <Badge tone={focusRow.missing.length ? (focusRow.tone === "red" ? "red" : "amber") : "green"}>{focusRow.missing.length ? focusRow.missing.slice(0, 2).join(" / ") : "Ready"}</Badge>
              </div>
              <div className="co-schedule-selected-grid">
                <span><em>Schedule</em><strong>{formatJobScheduleDetail(focusJob)}</strong></span>
                <span><em>Foreman</em><strong>{focusRow.foreman}</strong></span>
                <span><em>Crew</em><strong>{focusRow.crewLabels.length ? focusRow.crewLabels.join(", ") : "Pending crew"}</strong></span>
                <span><em>Report</em><strong>{focusRow.report ? reportStatusLabel(focusRow.report.status) : focusRow.dateKey && focusRow.dateKey <= todayDateInputValue() ? "Missing" : "Not due"}</strong></span>
                <span><em>Proof</em><strong>{focusRow.proofState.photoCount} photos / {focusRow.proofState.ticketCount} tickets</strong></span>
                <span><em>Safety / checklist</em><strong>{focusRow.workflowCounts.total ? `${focusRow.workflowCounts.total} open` : "Clear"}</strong></span>
              </div>
              <div className="co-schedule-crew-load">
                <div className="co-schedule-command-section-head">
                  <span>Crew load</span>
                  <strong>{crewLoads.length || "No crews"}</strong>
                </div>
                {crewLoads.length ? crewLoads.map(([label, count]) => (
                  <span key={label}>
                    <strong>{label}</strong>
                    <em>{count} job{count === 1 ? "" : "s"}</em>
                  </span>
                )) : <p>No crew load visible yet.</p>}
              </div>
              <div className="co-schedule-selected-actions">
                <Button type="button" onClick={() => onOpenJob(focusRow)}>Open Job</Button>
                {canOpenReports ? <Button type="button" variant="secondary" onClick={() => onOpenReport(focusRow)}>{focusRow.report ? "Open Report" : "Reports"}</Button> : null}
                {canOpenUploads ? <Button type="button" variant="secondary" onClick={() => onOpenModule("uploads")}>Photos</Button> : null}
                {canOpenTickets ? <Button type="button" variant="secondary" onClick={() => onOpenModule("deliveryTickets")}>Tickets</Button> : null}
              </div>
            </>
          ) : (
            <div className="co-schedule-command-empty">
              <strong>No job selected</strong>
              <span>Select a row to inspect crew, proof, report, safety, and next action context.</span>
            </div>
          )}
          <div className="co-schedule-tomorrow-prep">
            <div className="co-schedule-command-section-head">
              <span>Tomorrow prep</span>
              <strong>{tomorrowPrepRows.length || "Clear"}</strong>
            </div>
            {tomorrowPrepRows.length ? tomorrowPrepRows.map((row) => (
              <button key={`tomorrow-${row.job.id}-${row.dateKey || "scheduled"}`} type="button" onClick={() => onSelectRow(row)}>
                <span>
                  <strong>{jobTitle(row.job)}</strong>
                  <em>{[formatJobScheduleDetail(row.job), row.crewLabels.length ? row.crewLabels.slice(0, 2).join(", ") : "Crew pending"].filter(Boolean).join(" / ")}</em>
                </span>
                <Badge tone={row.missing.length ? "amber" : "green"}>{row.missing.length ? `${row.missing.length} gaps` : "Ready"}</Badge>
              </button>
            )) : (
              <p>No tomorrow jobs need prep in this view.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export function SchedulePage({
  jobs = [],
  dailyReports = [],
  uploads = [],
  deliveryTickets = [],
  prePourChecklists = [],
  postPourChecklists = [],
  toolChecklists = [],
  safetyIncidents = [],
  timeEntries = [],
  users = [],
  permissions,
  setActive,
  onSelectJob,
  onSelectReport,
}) {
  const scheduleState = useMemo(() => deriveScheduleCoordinationState({
    jobs,
    dailyReports,
    uploads,
    deliveryTickets,
    prePourChecklists,
    postPourChecklists,
    toolChecklists,
    safetyIncidents,
    timeEntries,
    users,
  }), [dailyReports, deliveryTickets, jobs, postPourChecklists, prePourChecklists, safetyIncidents, timeEntries, toolChecklists, uploads, users]);
  const stats = scheduleState.stats;
  const [selectedScheduleKey, setSelectedScheduleKey] = useState("");
  const allScheduleRows = useMemo(() => scheduleUniqueRows([
    ...scheduleState.todayRows,
    ...scheduleState.tomorrowRows,
    ...scheduleState.missingRows,
    ...scheduleState.unassignedRows,
    ...scheduleState.weekRows,
  ]), [scheduleState]);
  const selectedScheduleRow = allScheduleRows.find((row) => scheduleRowKey(row) === selectedScheduleKey)
    || scheduleState.missingRows[0]
    || scheduleState.todayRows[0]
    || scheduleState.tomorrowRows[0]
    || allScheduleRows[0]
    || null;
  const kpis = [
    { label: "Today", value: stats.today, helper: "Scheduled or active", icon: "calendar", tone: stats.today ? "orange" : "slate", actionLabel: "Open jobs", onAction: () => setActive("jobs") },
    { label: "Tomorrow", value: stats.tomorrow, helper: "Prep before morning", icon: "clock", tone: stats.tomorrow ? "blue" : "slate", actionLabel: "Open jobs", onAction: () => setActive("jobs") },
    { label: "Unassigned", value: stats.unassigned, helper: "Needs date or crew", icon: "users", tone: stats.unassigned ? "amber" : "green", actionLabel: "Assign crew", onAction: () => setActive("jobs") },
    { label: "Needs Follow-Up", value: stats.missingActivity, helper: "Missing activity or readiness", icon: "alert", tone: stats.missingActivity ? "red" : "green", actionLabel: "Review", onAction: () => setActive("jobs") },
  ];

  function openModule(moduleId) {
    if (moduleId) setActive?.(moduleId);
  }

  function openJob(row) {
    if (row?.job?.id) onSelectJob?.(row.job.id);
  }

  function openReport(row) {
    if (row?.report?.id && typeof onSelectReport === "function") {
      onSelectReport(row.report.id);
      return;
    }
    setActive?.("reports");
  }

  function selectScheduleRow(row) {
    setSelectedScheduleKey(scheduleRowKey(row));
  }

  const isDesktopScheduleCommandViewport = useDesktopCommandViewport(1180);
  const canUseScheduleCommandShell = Boolean(permissions?.jobs?.canManageAll && isDesktopScheduleCommandViewport);
  const scheduleShellKpis = [
    {
      id: "jobs-today",
      label: "Jobs Today",
      value: stats.today,
      helper: "Scheduled or active",
      icon: "briefcase",
      tone: stats.today ? "blue" : "slate",
      onClick: () => openModule("jobs"),
    },
    {
      id: "tomorrow-prep",
      label: "Tomorrow Prep",
      value: stats.tomorrow,
      helper: "Prep before morning",
      icon: "clock",
      tone: stats.tomorrow ? "orange" : "slate",
      onClick: () => openModule("jobs"),
    },
    {
      id: "crew-date-gaps",
      label: "Crew / Date Gaps",
      value: stats.unassigned,
      helper: "Needs start or crew",
      icon: "users",
      tone: stats.unassigned ? "amber" : "green",
      onClick: () => openModule("jobs"),
    },
    {
      id: "problems",
      label: "Problems",
      value: stats.missingActivity,
      helper: "Missing proof or readiness",
      icon: "alert",
      tone: stats.missingActivity ? "amber" : "green",
      onClick: () => {
        const targetRow = scheduleState.missingRows[0];
        if (targetRow) setSelectedScheduleKey(scheduleRowKey(targetRow));
      },
    },
  ];
  const scheduleShellQueue = useMemo(() => {
    const items = [];
    const seenKeys = new Set();

    function addRow(row, kind, priority) {
      if (!row?.job) return;
      const key = scheduleRowKey(row);
      if (seenKeys.has(key)) return;
      seenKeys.add(key);
      const job = row.job;
      const missingLabel = row.missing.length ? row.missing.slice(0, 3).join(" / ") : "Ready";
      const crewLabel = row.crewLabels.length ? row.crewLabels.slice(0, 2).join(", ") : "Crew missing";
      const eyebrow = kind === "problem"
        ? "Problem"
        : kind === "today"
          ? "Today"
          : kind === "tomorrow"
            ? "Tomorrow prep"
            : kind === "gap"
              ? "Crew / date gap"
              : "Week lookahead";

      items.push({
        id: key,
        kind,
        row,
        job,
        priority,
        eyebrow,
        title: jobTitle(job),
        meta: [job.customer, job.address || job.city, scheduleDateLabel(row.dateKey)].filter(Boolean).join(" / ") || "Schedule pending",
        statusLabel: missingLabel,
        tone: scheduleRowTone(row),
        actionLabel: "Review plan",
        badges: [
          { label: formatJobScheduleDetail(job), tone: "slate" },
          { label: crewLabel, tone: row.crewLabels.length ? "green" : "amber" },
          { label: `${row.proofState.photoCount} photos / ${row.proofState.ticketCount} tickets`, tone: row.proofState.gapCount ? "amber" : "green" },
        ],
      });
    }

    scheduleState.missingRows.forEach((row, index) => addRow(row, "problem", 10 + index));
    scheduleState.todayRows.forEach((row, index) => addRow(row, "today", 30 + index));
    scheduleState.tomorrowRows.forEach((row, index) => addRow(row, "tomorrow", 50 + index));
    scheduleState.unassignedRows.forEach((row, index) => addRow(row, "gap", 70 + index));
    scheduleState.weekRows.forEach((row, index) => addRow(row, "week", 90 + index));

    return items.sort((left, right) => left.priority - right.priority).slice(0, 7);
  }, [scheduleState]);
  const scheduleShellFallbackItem = scheduleShellQueue.find((item) => item.id === selectedScheduleKey) || scheduleShellQueue[0] || null;
  const selectedScheduleShellItem = scheduleShellQueue.find((item) => item.id === selectedScheduleKey) || scheduleShellFallbackItem;
  const selectedScheduleShellId = selectedScheduleShellItem?.id || "";
  useEffect(() => {
    if (!canUseScheduleCommandShell) return;
    const fallbackId = scheduleShellFallbackItem?.id || "";
    if (!selectedScheduleKey && fallbackId) {
      setSelectedScheduleKey(fallbackId);
      return;
    }
    if (selectedScheduleKey && !scheduleShellQueue.some((item) => item.id === selectedScheduleKey)) {
      setSelectedScheduleKey(fallbackId);
    }
  }, [canUseScheduleCommandShell, scheduleShellFallbackItem?.id, scheduleShellQueue, selectedScheduleKey]);

  function selectScheduleShellItem(item) {
    if (!item) return;
    setSelectedScheduleKey(item.id);
  }

  function openFirstScheduleShellItem(rows = [], fallbackModule = "jobs") {
    const targetRow = normalizeObjectArray(rows)[0];
    if (targetRow) {
      setSelectedScheduleKey(scheduleRowKey(targetRow));
      return;
    }
    openModule(fallbackModule);
  }

  function renderScheduleShellDetail(item) {
    const row = item?.row || selectedScheduleRow;
    const job = row?.job || null;
    if (!row || !job) return null;

    const missingLabel = row.missing.length ? row.missing.slice(0, 4).join(" / ") : "Ready";
    const reportLabel = row.report ? reportStatusLabel(row.report.status) : row.dateKey && row.dateKey <= todayDateInputValue() ? "Missing" : "Not due";
    const proofLabel = `${row.proofState.photoCount} photos / ${row.proofState.ticketCount} tickets`;
    const checklistLabel = row.workflowCounts.total ? `${row.workflowCounts.total} open` : "Clear";
    const crewLabel = row.crewLabels.length ? row.crewLabels.join(", ") : "Pending crew";
    const mapUrl = directionsUrl(job.address || "");
    const detailActions = [
      { id: "job", label: "Open Job", onClick: () => openJob(row) },
      permissions?.reports?.canView ? { id: "report", label: row.report ? "Open Report" : "Reports", variant: "secondary", onClick: () => openReport(row) } : null,
      permissions?.uploads?.canView ? { id: "proof", label: "Open Proof", variant: "secondary", onClick: () => openModule("uploads") } : null,
    ].filter(Boolean).slice(0, 3);

    return (
      <div className="co-schedule-shell-detail-scroll">
        <div className="co-apex-selected-record">
          <Badge tone={row.missing.length ? (row.tone === "red" ? "red" : "amber") : "green"}>{missingLabel}</Badge>
          <h2>{jobTitle(job)}</h2>
          <p>{[job.customer, job.address || job.city].filter(Boolean).join(" / ") || "Customer or location pending"}</p>
        </div>
        <div className="co-apex-selected-facts co-schedule-shell-selected-facts">
          <span><em>Date</em><strong>{row.dateKey ? scheduleDateLabel(row.dateKey) : "Unscheduled"}</strong></span>
          <span><em>Time</em><strong>{formatJobScheduleDetail(job)}</strong></span>
          <span><em>Foreman</em><strong>{row.foreman}</strong></span>
          <span><em>Crew</em><strong>{crewLabel}</strong></span>
          <span><em>Report</em><strong>{reportLabel}</strong></span>
          <span><em>Proof</em><strong>{proofLabel}</strong></span>
          <span><em>Checklist</em><strong>{checklistLabel}</strong></span>
          <span><em>Startup</em><strong>{row.startupWarnings.length ? `${row.startupWarnings.length} warning${row.startupWarnings.length === 1 ? "" : "s"}` : "Clear"}</strong></span>
          <span><em>Status</em><strong>{jobStatusLabel(job.status || job.stage)}</strong></span>
        </div>
        <div className="co-apex-selected-next">
          <span>Next safe action</span>
          <strong>{row.missing.length ? "Clear blockers in the full module" : "Review the job plan"}</strong>
          <p>Use the full job, report, or proof routes for updates. The schedule shell does not create reports, submit proof, change crew, or send external messages automatically.</p>
        </div>
        {mapUrl ? (
          <div className="co-schedule-shell-map-note">
            <span>Map available</span>
            <a href={mapUrl} target="_blank" rel="noreferrer">Open jobsite map</a>
          </div>
        ) : null}
        <div className="co-apex-selected-actions">
          {detailActions.map((action, index) => (
            <Button key={action.id} type="button" variant={action.variant || (index === 0 ? "primary" : "secondary")} onClick={action.onClick}>{action.label}</Button>
          ))}
        </div>
      </div>
    );
  }

  const adminMobileScheduleQueue = scheduleShellQueue.slice(0, 3);
  const adminMobileScheduleFocus = selectedScheduleShellItem || scheduleShellFallbackItem;
  const adminMobileFocusRow = adminMobileScheduleFocus?.row || selectedScheduleRow;
  const adminMobileFocusJob = adminMobileFocusRow?.job || null;
  const adminMobileMissingLabel = adminMobileFocusRow?.missing?.length
    ? adminMobileFocusRow.missing.slice(0, 2).join(" / ")
    : "Ready";
  const adminMobileNextAction = adminMobileFocusRow?.missing?.length
    ? "Clear today's schedule blocker"
    : adminMobileFocusJob
      ? "Confirm today's job plan"
      : "Open jobs and assign the day";
  const adminMobileNextMeta = adminMobileFocusJob
    ? [
      adminMobileFocusJob.customer,
      adminMobileFocusJob.city,
      adminMobileFocusRow?.dateKey ? scheduleDateLabel(adminMobileFocusRow.dateKey) : null,
    ].filter(Boolean).join(" / ") || "Schedule details pending"
    : "Today's schedule, crew gaps, and follow-ups will appear here.";
  const adminMobileStatusTiles = [
    { label: "Today", value: stats.today, helper: "scheduled or active", tone: stats.today ? "orange" : "slate" },
    { label: "Gaps", value: stats.unassigned, helper: "crew or date", tone: stats.unassigned ? "amber" : "green" },
    { label: "Follow-up", value: stats.missingActivity, helper: "proof or readiness", tone: stats.missingActivity ? "red" : "green" },
  ];

  if (canUseScheduleCommandShell) {
    return (
      <div className="co-office-page co-schedule-page co-schedule-shell-page">
        <ApexOfficeCommandShell
          eyebrow="Operations"
          title="Schedule"
          description="Dispatch today, prep tomorrow, and clear crew, proof, report, and readiness gaps without drawers."
          kpis={scheduleShellKpis}
          queue={{
            title: "Schedule priority queue",
            description: `${scheduleShellQueue.length} priority item${scheduleShellQueue.length === 1 ? "" : "s"} shown from today, tomorrow, gaps, problems, and week lookahead.`,
            items: scheduleShellQueue,
            selectedId: selectedScheduleShellId,
            onSelect: selectScheduleShellItem,
            emptyState: <StateCard title="Schedule queue clear" description="Today's jobs, tomorrow prep, crew gaps, and schedule problems appear here when they need action." tone="green" />,
          }}
          detail={{
            title: "Selected schedule item",
            item: selectedScheduleShellItem,
            render: renderScheduleShellDetail,
            emptyState: <StateCard title="No schedule item selected" description="Select a job from the schedule priority queue to review dispatch details." tone="slate" />,
          }}
          quickActions={[
            { id: "open-jobs", label: "Open Jobs", icon: "briefcase", onClick: () => openModule("jobs") },
            { id: "tomorrow-prep", label: "Tomorrow Prep", icon: "clock", onClick: () => openFirstScheduleShellItem(scheduleState.tomorrowRows, "jobs") },
            { id: "problems", label: "Problems", icon: "alert", onClick: () => openFirstScheduleShellItem(scheduleState.missingRows, "jobs") },
          ]}
          className="co-schedule-command-shell"
        />
      </div>
    );
  }

  return (
    <div className="co-office-page co-schedule-page">
      {permissions?.jobs?.canManageAll ? (
        <section className="co-admin-mobile-ops-shell co-admin-mobile-schedule-shell" data-admin-mobile-ops-shell="schedule" aria-label="Admin mobile schedule command">
          <div className="co-admin-mobile-ops-head">
            <span>Operations</span>
            <h1>What needs attention today?</h1>
            <p>Schedule triage for today's jobs, crew gaps, and blocked field activity.</p>
          </div>

          <div className="co-admin-mobile-next-card" data-tone={adminMobileFocusRow?.missing?.length ? "amber" : "green"}>
            <div className="co-admin-mobile-next-copy">
              <span>Today / Next Action</span>
              <strong>{adminMobileNextAction}</strong>
              <p>{adminMobileNextMeta}</p>
            </div>
            <Badge tone={adminMobileFocusRow?.missing?.length ? "amber" : "green"}>{adminMobileMissingLabel}</Badge>
            <div className="co-admin-mobile-primary-actions">
              <Button type="button" onClick={() => (adminMobileFocusRow ? openJob(adminMobileFocusRow) : openModule("jobs"))}>{adminMobileFocusRow ? "Open Job" : "Open Jobs"}</Button>
              {permissions?.reports?.canView ? <Button type="button" variant="secondary" onClick={() => openReport(adminMobileFocusRow)}>Review Reports</Button> : null}
            </div>
          </div>

          <div className="co-admin-mobile-status-tiles" aria-label="Schedule status">
            {adminMobileStatusTiles.map((item) => (
              <div key={item.label} className="co-admin-mobile-status-tile" data-tone={item.tone}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <em>{item.helper}</em>
              </div>
            ))}
          </div>

          <section className="co-admin-mobile-queue-panel" aria-label="Top schedule queue">
            <div className="co-admin-mobile-panel-head">
              <span>Top 3</span>
              <strong>Schedule queue</strong>
              <em>{scheduleShellQueue.length ? `${Math.min(scheduleShellQueue.length, 3)} shown` : "Clear"}</em>
            </div>
            {adminMobileScheduleQueue.length ? (
              <div className="co-admin-mobile-schedule-queue-list">
                {adminMobileScheduleQueue.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`co-admin-mobile-queue-card ${item.id === selectedScheduleShellId ? "is-selected" : ""}`}
                    data-tone={item.tone}
                    onClick={() => selectScheduleShellItem(item)}
                  >
                    <span>{item.eyebrow}</span>
                    <strong>{item.title}</strong>
                    <em>{[item.job?.customer, item.row?.dateKey ? scheduleDateLabel(item.row.dateKey) : null].filter(Boolean).join(" / ") || item.meta}</em>
                    <b>{item.statusLabel}</b>
                  </button>
                ))}
              </div>
            ) : (
              <StateCard title="Schedule clear" description="Today's jobs, tomorrow prep, and blockers are clear in this view." tone="green" />
            )}
          </section>

          <details className="co-admin-mobile-more-drawer">
            <summary>
              <span>More details</span>
              <strong>Tomorrow, proof, time</strong>
              <em>Open only when needed</em>
            </summary>
            <div className="co-admin-mobile-more-grid">
              <button type="button" onClick={() => openFirstScheduleShellItem(scheduleState.tomorrowRows, "jobs")}>
                <span>Tomorrow</span>
                <strong>{stats.tomorrow}</strong>
                <em>prep items</em>
              </button>
              <button type="button" onClick={() => openModule("uploads")} disabled={!permissions?.uploads?.canView}>
                <span>Proof</span>
                <strong>{adminMobileFocusRow?.proofState?.gapCount || 0}</strong>
                <em>gaps</em>
              </button>
              <button type="button" onClick={() => openModule("time")} disabled={!permissions?.time?.canView}>
                <span>Crew Time</span>
                <strong>{stats.activeCrew || 0}</strong>
                <em>active</em>
              </button>
            </div>
          </details>
        </section>
      ) : null}

      <div className="co-schedule-desktop-tablet-frame">
      <PageHeader
        eyebrow="Operations"
        title="Schedule Coordination"
        description="Plan today and tomorrow, see crew coverage, and catch missing field activity before it turns into phone calls."
        actions={(
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => setActive("jobs")}>Open Jobs</Button>
            <Button type="button" onClick={() => setActive("reports")}>Review Reports</Button>
          </div>
        )}
      />

      <CommandPageFrame
        className="co-schedule-northstar-frame"
        kpis={
          <div className="co-schedule-plan-kpis">
            {kpis.map((item) => (
              <button key={item.label} type="button" className="co-schedule-plan-kpi" data-tone={item.tone} onClick={item.onAction}>
                <Icon name={item.icon} />
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <em>{item.helper}</em>
                <b>{item.actionLabel}</b>
              </button>
            ))}
          </div>
        }
        rail={
          <AssistantRail
            eyebrow="Apex Assistant"
            title="Schedule"
            description={stats.missingActivity ? `${stats.missingActivity} schedule item${stats.missingActivity === 1 ? "" : "s"} need crew, proof, report, or readiness review.` : "Today and tomorrow are clear in the current operating plan."}
            priorities={[
              { value: stats.today, label: "Today's jobs", tone: stats.today ? "orange" : "slate" },
              { value: stats.tomorrow, label: "Tomorrow prep", tone: stats.tomorrow ? "blue" : "slate" },
              { value: stats.unassigned, label: "Needs crew/date", tone: stats.unassigned ? "amber" : "green" },
              { value: stats.missingActivity, label: "Needs action", tone: stats.missingActivity ? "red" : "green" },
            ]}
            actions={[
              { label: "Open Jobs", icon: "briefcase", onClick: () => openModule("jobs") },
              { label: "Review Reports", icon: "document", onClick: () => openModule("reports") },
              { label: "Photo Evidence", icon: "upload", onClick: () => openModule("uploads"), disabled: !permissions?.uploads?.canView },
              { label: "Crew Time", icon: "clock", onClick: () => openModule("time"), disabled: !permissions?.time?.canView },
            ]}
          />
        }
        footer={
          <DesktopCommandDrawer
            className="co-schedule-support-drawer"
            bodyClassName="co-schedule-support-grid grid min-w-0 gap-3"
            title="Secondary Schedule Panels"
            description="Week lookahead, unassigned jobs, and missing activity stay inside the dispatcher workspace."
            summaryLabel="Open panels"
            variant="bottom"
          >
              <ScheduleSection
                title="Week Lookahead"
                description={`Scheduled work through ${scheduleDateLabel(scheduleState.weekEndKey)}`}
                rows={scheduleState.weekRows}
                emptyTitle="No scheduled work this week"
                emptyDescription="This week will populate from existing job scheduled start dates."
                permissions={permissions}
                onOpenJob={openJob}
                onOpenModule={openModule}
                onOpenReport={openReport}
                limit={8}
              />

              <div className="co-schedule-day-grid">
                <ScheduleSection
                  title="Unassigned / Needs Crew"
                  description="Jobs missing a start date, foreman, or crew coverage"
                  rows={scheduleState.unassignedRows}
                  emptyTitle="Crew coverage looks clear"
                  emptyDescription="Jobs with missing dates or crew assignments will appear here."
                  permissions={permissions}
                  onOpenJob={openJob}
                  onOpenModule={openModule}
                  onOpenReport={openReport}
                  compact
                  limit={5}
                />
                <ScheduleSection
                  title="Missing Activity / Needs Follow-Up"
                  description="Due work missing reports, photos, startup, crew, or checklist completion"
                  rows={scheduleState.missingRows}
                  emptyTitle="No urgent activity gaps"
                  emptyDescription="Missing reports, proof, crew, or readiness issues will appear here."
                  permissions={permissions}
                  onOpenJob={openJob}
                  onOpenModule={openModule}
                  onOpenReport={openReport}
                  compact
                  limit={5}
                />
              </div>
          </DesktopCommandDrawer>
        }
      >
        <ScheduleOperatingPlanWorkbench
          scheduleState={scheduleState}
          permissions={permissions}
          selectedRow={selectedScheduleRow}
          onSelectRow={selectScheduleRow}
          onOpenJob={openJob}
          onOpenModule={openModule}
          onOpenReport={openReport}
        />
      </CommandPageFrame>
      </div>
    </div>
  );
}
