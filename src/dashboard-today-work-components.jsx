import { Badge, Button, Card, StateCard, StatusBadge } from "./app-shell-components";
import { formatJobScheduleDetail } from "./field-format-utils";
import { jobStatusLabel, jobTitle } from "./job-utils";
import { normalizeObjectArray } from "./report-utils";

function DashboardTodayWorkMetric({ label, value, helper, tone = "slate" }) {
  return (
    <div className="co-today-work-metric" data-tone={tone}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{helper}</small>
    </div>
  );
}

function DashboardTodayWorkRow({ row, permissions, setActive, onSelectJob, fieldMode = false }) {
  const job = row.job;
  const missingLabel = row.missing.length ? row.missing.slice(0, 3).join(" / ") : "Ready";
  const canRoute = typeof setActive === "function";
  const canOpenReports = Boolean(permissions?.reports?.canView && canRoute);
  const canOpenUploads = Boolean(permissions?.uploads?.canView && canRoute);

  return (
    <div className="co-today-work-row" data-tone={row.tone}>
      <button type="button" className="co-today-work-job" onClick={() => onSelectJob?.(job.id)}>
        <span>
          <strong>{jobTitle(job)}</strong>
          <small>{[job.customer, row.scheduleLabel].filter(Boolean).join(" / ")}</small>
        </span>
        <StatusBadge status={jobStatusLabel(job.status || job.stage)} />
      </button>
      <div className="co-today-work-details">
        <div>
          <span>Foreman</span>
          <strong>{row.foreman}</strong>
        </div>
        <div>
          <span>Crew</span>
          <strong>{row.crewCount ? `${row.crewCount} assigned` : "Missing"}</strong>
        </div>
        <div>
          <span>Report</span>
          <strong>{row.reportLabel}</strong>
        </div>
        <div>
          <span>Proof</span>
          <strong>{row.photoCount} photos / {row.ticketCount} tickets</strong>
        </div>
      </div>
      <div className="co-today-work-footer">
        <Badge tone={row.missing.length ? "amber" : "green"}>{missingLabel}</Badge>
        {row.openWorkflowCount ? <Badge tone="orange">{row.openWorkflowCount} workflow open</Badge> : <Badge tone="green">Workflows clear</Badge>}
        <div className="co-today-work-actions">
          {canOpenReports ? <Button type="button" size="sm" variant="secondary" onClick={() => setActive("reports")}>{fieldMode ? "Report" : "Reports"}</Button> : null}
          {canOpenUploads ? <Button type="button" size="sm" variant="secondary" onClick={() => setActive("uploads")}>Photos</Button> : null}
          {canRoute ? <Button type="button" size="sm" onClick={() => setActive("jobs")}>{fieldMode ? "My jobs" : "Jobs"}</Button> : null}
        </div>
      </div>
    </div>
  );
}

export function DashboardTodayCoordinationPanel({ coordination, permissions, setActive, onSelectJob, fieldMode = false }) {
  const rows = normalizeObjectArray(coordination?.rows).slice(0, fieldMode ? 2 : 4);
  const upcomingJobs = normalizeObjectArray(coordination?.upcomingJobs);
  const stats = coordination?.stats || {};
  const headline = rows.length
    ? `${rows.length} active today`
    : upcomingJobs.length
      ? `${upcomingJobs.length} upcoming`
      : "No scheduled jobs";

  return (
    <Card className={`co-today-work-board overflow-hidden ${fieldMode ? "co-today-work-board-field" : ""}`}>
      <div className="co-dashboard-board-header co-today-work-header border-b border-slate-200 bg-white p-4">
        <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <h2>{fieldMode ? "Today's Work" : "Today's Work Coordination"}</h2>
            <p>{fieldMode ? "Assigned work, clock/report/photo actions, and missing items stay together." : "Crew assignments, job activity, and proof gaps for today's operating plan."}</p>
          </div>
          <div className="co-today-work-header-actions">
            <Badge tone={rows.length ? "orange" : "slate"}>{headline}</Badge>
            {permissions?.jobs?.canView || permissions?.jobs?.canManageAll || permissions?.jobs?.canManageField ? (
              <Button type="button" size="sm" onClick={() => setActive?.("jobs")}>{fieldMode ? "Open my jobs" : "Open jobs"}</Button>
            ) : null}
          </div>
        </div>
      </div>
      <div className="co-today-work-summary">
        <DashboardTodayWorkMetric label="Active today" value={stats.todayJobs || 0} helper="Scheduled or moving" tone={stats.todayJobs ? "orange" : "slate"} />
        <DashboardTodayWorkMetric label="Crew assigned" value={stats.crewsAssigned || 0} helper="Jobs with crew" tone={stats.crewsAssigned ? "green" : "amber"} />
        <DashboardTodayWorkMetric label="Reports missing" value={stats.missingReports || 0} helper="Needs field closeout" tone={stats.missingReports ? "amber" : "green"} />
        <DashboardTodayWorkMetric label="Proof gaps" value={(stats.missingPhotos || 0) + (stats.openWorkflows || 0)} helper="Photos or workflow items" tone={(stats.missingPhotos || 0) + (stats.openWorkflows || 0) ? "amber" : "green"} />
      </div>
      <div className="co-today-work-list">
        {rows.length ? rows.map((row) => (
          <DashboardTodayWorkRow key={row.job.id} row={row} permissions={permissions} setActive={setActive} onSelectJob={onSelectJob} fieldMode={fieldMode} />
        )) : (
          <div className="co-today-work-empty">
            <StateCard
              title={upcomingJobs.length ? "No active work today" : "No scheduled work today"}
              description={upcomingJobs.length ? `Next scheduled job: ${jobTitle(upcomingJobs[0])} / ${formatJobScheduleDetail(upcomingJobs[0])}.` : "Scheduled and active job coordination will appear here once work is assigned."}
              tone="slate"
            />
          </div>
        )}
      </div>
    </Card>
  );
}
