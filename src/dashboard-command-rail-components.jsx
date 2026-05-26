import { Badge, Card, Icon, SectionHeader, StateCard, StatusBadge } from "./app-shell-components";
import { StartupStatusBadge } from "./jobs-page-components";
import { jobScheduleLabel, jobStatusLabel, jobTitle } from "./job-utils";
import { LeadScoreBadge } from "./lead-route-components";
import { normalizeObjectArray } from "./report-utils";

export function DashboardCommandRailPolished({
  stats,
  selectedLead,
  selectedJob,
  liveJobsPreview,
  queueItems,
  activity,
  permissions,
  setActive,
  onFocusQueue,
  onFocusJobs,
  onFocusLeads,
  pipelineDisplayValue,
}) {
  const activeQueueItems = normalizeObjectArray(queueItems).filter((item) => !item.archivedAt && !item.done);
  const activeJobs = normalizeObjectArray(liveJobsPreview).filter((job) => !job.archivedAt);
  const recentActivity = normalizeObjectArray(activity).slice(0, 1);
  const selectedLeadTitle = selectedLead?.customer || selectedLead?.company || "No lead selected";
  const selectedJobTitle = selectedJob ? jobTitle(selectedJob) : "No job selected";

  return (
    <div className="co-dashboard-right-rail min-w-0">
      <Card className="co-dashboard-rail-card p-4">
        <SectionHeader title="Operator Snapshot" description="Live readout for the daily workspace." />
        <div className="co-dashboard-rail-metrics">
          <div>
            <span>Active jobs</span>
            <strong>{activeJobs.length}</strong>
          </div>
          <div>
            <span>Queue open</span>
            <strong>{activeQueueItems.length}</strong>
          </div>
          <div>
            <span>Reports due</span>
            <strong>{stats.reportsDue || 0}</strong>
          </div>
          <div>
            <span>Pipeline</span>
            <strong>{pipelineDisplayValue}</strong>
          </div>
        </div>
      </Card>

      <Card className="co-dashboard-rail-card p-4">
        <SectionHeader title="Quick Moves" description="Jump without losing the board context." />
        <div className="co-dashboard-quick-moves-grid">
          {permissions?.jobs?.canManageAll ? (
            <button type="button" className="co-dashboard-action-row" onClick={() => setActive("commandCenter")}>
              <span>Command Center</span>
              <Icon name="settings" />
            </button>
          ) : null}
          <button type="button" className="co-dashboard-action-row" onClick={onFocusLeads}>
            <span>Lead pipeline</span>
            <Icon name="users" />
          </button>
          <button type="button" className="co-dashboard-action-row" onClick={onFocusJobs}>
            <span>Active jobs</span>
            <Icon name="briefcase" />
          </button>
          <button type="button" className="co-dashboard-action-row" onClick={onFocusQueue}>
            <span>Task queue</span>
            <Icon name="clipboard" />
          </button>
          {permissions?.reports?.canView ? (
            <button type="button" className="co-dashboard-action-row" onClick={() => setActive("reports")}>
              <span>Reports</span>
              <Icon name="document" />
            </button>
          ) : null}
        </div>
      </Card>

      <Card className="co-dashboard-rail-card p-4">
        <SectionHeader title="Selected Records" description="Current lead and job context stay visible while the board moves." />
        {selectedLead || selectedJob ? (
          <div className="co-dashboard-selected-stack">
            {selectedLead ? (
              <div className="co-dashboard-selected-record">
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p>{selectedLeadTitle}</p>
                    <span>{selectedLead.project || selectedLead.city || "Project details pending"}</span>
                  </div>
                  <StatusBadge status={selectedLead.status || "New"} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge tone={selectedLead.priority === "High" ? "amber" : "blue"}>{selectedLead.priority || "Normal"}</Badge>
                  <LeadScoreBadge lead={selectedLead} />
                </div>
                <button type="button" className="co-dashboard-inline-link" onClick={() => setActive("leads")}>Open full lead record</button>
              </div>
            ) : null}
            {selectedJob ? (
              <div className="co-dashboard-selected-record" data-kind="job">
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p>{selectedJobTitle}</p>
                    <span>{[selectedJob.customer, jobScheduleLabel(selectedJob)].filter(Boolean).join(" / ") || "Schedule pending"}</span>
                  </div>
                  <StatusBadge status={jobStatusLabel(selectedJob.status || selectedJob.stage)} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <StartupStatusBadge status={selectedJob.startupStatus || "Not Started"} />
                  <Badge tone="blue">{Number(selectedJob.progress || 0)}% progress</Badge>
                </div>
                <button type="button" className="co-dashboard-inline-link" onClick={() => setActive("jobs")}>Open full job record</button>
              </div>
            ) : null}
          </div>
        ) : (
          <StateCard title="No record selected" description="Select a lead or job from the focus board to show its summary here." tone="slate" />
        )}
      </Card>

      <Card className="co-dashboard-rail-card p-4">
        <SectionHeader title="Recent Activity" description="Latest workspace movement." />
        <div className="grid gap-2">
          {recentActivity.length ? recentActivity.map((entry, index) => (
            <div key={entry.id || `${entry.type || "activity"}-${index}`} className="co-dashboard-activity-row">
              <span>{entry.title || entry.label || entry.type || "Activity"}</span>
              <p>{entry.description || entry.message || entry.detail || entry.timestamp || "Workspace update"}</p>
            </div>
          )) : (
            <div className="co-dashboard-activity-row">
              <span>No recent activity</span>
              <p>Activity appears here when records change.</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
