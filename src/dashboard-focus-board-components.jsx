import { Badge, Button, Card, Icon, StateCard, StatusBadge } from "./app-shell-components";
import { jobNextStep, jobScheduleLabel, jobTitle } from "./job-utils";
import { leadSourceLabel } from "./lead-route-components";
import { normalizeObjectArray } from "./report-utils";

function DashboardCockpitMetric({ label, value, helper, tone = "slate" }) {
  return (
    <div className="co-dashboard-cockpit-metric" data-tone={tone}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{helper}</small>
    </div>
  );
}

function DashboardNextActionTile({ item }) {
  return (
    <button type="button" className="co-dashboard-next-tile" data-tone={item.tone || "orange"} onClick={item.onPrimary}>
      <span className="co-dashboard-next-icon"><Icon name={item.icon || "alert"} /></span>
      <span className="co-dashboard-next-copy">
        <em>{item.badge}</em>
        <strong>{item.title}</strong>
        <small>{item.description}</small>
      </span>
      <span className="co-dashboard-next-value">{item.value}</span>
    </button>
  );
}

export function DashboardCockpitPanel({
  stats,
  pipelineDisplayValue,
  attentionCount,
  readyCount,
  openQueueCount,
  dashboardPriorityCards,
}) {
  return (
    <div className="co-dashboard-cockpit w-full min-w-0">
      <Card className="co-dashboard-cockpit-main">
        <div className="co-dashboard-cockpit-copy">
          <p>Owner command</p>
          <h2>Today's operating plan</h2>
          <span>{attentionCount ? `${attentionCount} items need a decision before the day moves. Clear the queue, protect active jobs, then move pipeline work.` : "The board is clear. Keep jobs moving and review ready work before opening deeper tools."}</span>
        </div>
        <div className="co-dashboard-cockpit-metrics">
          <DashboardCockpitMetric label="Needs action" value={attentionCount} helper="Reports, queue, startup" tone={attentionCount ? "orange" : "green"} />
          <DashboardCockpitMetric label="Ready work" value={readyCount} helper="Jobs and queue ready" tone="green" />
          <DashboardCockpitMetric label="Pipeline" value={pipelineDisplayValue} helper={`${stats.newLeads || 0} new leads`} tone="blue" />
          <DashboardCockpitMetric label="Queue open" value={openQueueCount} helper="Tasks still moving" tone={openQueueCount ? "amber" : "green"} />
        </div>
        <div className="co-dashboard-next-panel">
          <div className="co-dashboard-next-header">
            <span>Next moves</span>
            <strong>Click first</strong>
          </div>
          <div className="co-dashboard-next-grid">
            {dashboardPriorityCards.map((item) => <DashboardNextActionTile key={item.title} item={item} />)}
          </div>
        </div>
      </Card>
    </div>
  );
}

function DashboardFocusRow({ title, meta, detail, badge, selected, onClick }) {
  return (
    <button type="button" className={`co-dashboard-focus-row ${selected ? "is-selected" : ""}`} onClick={onClick}>
      <span className="min-w-0">
        <strong>{title}</strong>
        <small>{meta}</small>
        {detail ? <em>{detail}</em> : null}
      </span>
      {badge}
    </button>
  );
}

export function DashboardDailyFocusBoard({
  leadRef,
  jobsRef,
  queueRef,
  visibleLeads,
  selectedLeadId,
  onSelectLead,
  liveJobsPreview,
  selectedJobId,
  onSelectJob,
  activeQueueItems,
  onToggleTask,
  onArchiveTask,
  onOpenLeads,
  onOpenJobs,
  onOpenTools,
  disabled,
}) {
  const leadRows = normalizeObjectArray(visibleLeads).slice(0, 4);
  const jobRows = normalizeObjectArray(liveJobsPreview).slice(0, 4);
  const queueRows = normalizeObjectArray(activeQueueItems).slice(0, 4);

  return (
    <Card className="co-dashboard-focus-board overflow-hidden">
      <div className="co-dashboard-board-header border-b border-slate-200 bg-white p-4">
        <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <h2>Daily Focus Board</h2>
            <p>Three operating lanes: sell the next job, protect active jobs, and clear today's office queue.</p>
          </div>
          <div className="co-dashboard-focus-actions">
            <Button type="button" size="sm" variant="secondary" onClick={onOpenLeads}>Open lead board</Button>
            <Button type="button" size="sm" variant="secondary" onClick={onOpenJobs}>Open job board</Button>
            <Button type="button" size="sm" onClick={onOpenTools}>Open queue tools</Button>
          </div>
        </div>
      </div>

      <div className="co-dashboard-focus-lanes">
        <section ref={leadRef} tabIndex={-1} className="co-dashboard-focus-lane">
          <div className="co-dashboard-focus-lane-header">
            <span>Lead follow-up</span>
            <Badge tone="blue">{leadRows.length} shown</Badge>
          </div>
          <div className="co-dashboard-focus-list">
            {leadRows.length ? leadRows.map((lead) => (
              <DashboardFocusRow
                key={lead.id}
                title={lead.customer || lead.company || "Unnamed lead"}
                meta={[lead.project, lead.city, leadSourceLabel(lead.source || "")].filter(Boolean).join(" / ")}
                detail={lead.nextStep || "Choose next follow-up"}
                selected={lead.id === selectedLeadId}
                onClick={() => onSelectLead(lead.id)}
                badge={<StatusBadge status={lead.status || "New"} />}
              />
            )) : (
              <StateCard title="No matching leads" description="Lead follow-up clears here when filters return no live work." tone="slate" />
            )}
          </div>
          <Button type="button" size="sm" variant="secondary" onClick={onOpenLeads}>Open lead board</Button>
        </section>

        <section ref={jobsRef} tabIndex={-1} className="co-dashboard-focus-lane">
          <div className="co-dashboard-focus-lane-header">
            <span>Jobs at risk</span>
            <Badge tone="orange">{jobRows.length} active</Badge>
          </div>
          <div className="co-dashboard-focus-list">
            {jobRows.length ? jobRows.map((job) => {
              const progressValue = Math.max(0, Math.min(100, Number(job.progress || 0)));
              return (
                <DashboardFocusRow
                  key={job.id}
                  title={jobTitle(job)}
                  meta={[job.customer, jobScheduleLabel(job)].filter(Boolean).join(" / ")}
                  detail={jobNextStep(job)}
                  selected={job.id === selectedJobId}
                  onClick={() => onSelectJob(job.id)}
                  badge={(
                    <span className="co-dashboard-focus-progress">
                      <span className="co-dashboard-focus-progress-track"><span style={{ width: `${progressValue}%` }} /></span>
                      <em>{progressValue}%</em>
                    </span>
                  )}
                />
              );
            }) : (
              <StateCard title="No active jobs" description="Active jobs appear here once they need schedule, crew, or startup attention." tone="slate" />
            )}
          </div>
          <Button type="button" size="sm" variant="secondary" onClick={onOpenJobs}>Open job board</Button>
        </section>

        <section ref={queueRef} tabIndex={-1} className="co-dashboard-focus-lane">
          <div className="co-dashboard-focus-lane-header">
            <span>Office queue</span>
            <Badge tone={queueRows.length ? "amber" : "green"}>{queueRows.length} shown</Badge>
          </div>
          <div className="co-dashboard-focus-list">
            {queueRows.length ? queueRows.map((item) => (
              <div key={item.id} className="co-dashboard-queue-focus-row">
                <button type="button" onClick={() => onToggleTask?.(item.id)} disabled={disabled} aria-label={`Toggle ${item.title}`}>
                  <Icon name="check" />
                </button>
                <span>
                  <strong>{item.title}</strong>
                  <small>{item.meta || "Queue context pending"}</small>
                </span>
                <span className="co-dashboard-queue-actions">
                  <StatusBadge status={item.done ? "Done" : item.status} />
                  <button type="button" onClick={() => onArchiveTask?.(item.id)} disabled={disabled}>Archive</button>
                </span>
              </div>
            )) : (
              <StateCard title="Queue clear" description="Due, blocked, and review items appear here when they need action." tone="green" />
            )}
          </div>
          <Button type="button" size="sm" variant="secondary" onClick={onOpenTools}>Open queue tools</Button>
        </section>
      </div>
    </Card>
  );
}
