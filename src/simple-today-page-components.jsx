import { Badge, Button, Card, Icon, PageHeader, StateCard } from "./app-shell-components";
import { jobScheduleLabel, jobStatusLabel, jobTitle } from "./job-utils";
import { resolveWorkspaceCompanyName } from "./brand-utils";

const CLOSED_JOB_STATUSES = new Set(["complete", "completed", "closed", "cancelled", "archived"]);

function simpleJobStatus(job) {
  return String(job?.status || job?.stage || "").trim().toLowerCase();
}

function friendlyJobSchedule(job) {
  const raw = jobScheduleLabel(job) || job?.scheduledStart || "";
  const parsed = new Date(raw);
  if (!raw || Number.isNaN(parsed.getTime())) return raw || "Not scheduled yet";
  return parsed.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function openJobsForToday(jobs = []) {
  return (Array.isArray(jobs) ? jobs : [])
    .filter((job) => job && !job.archivedAt && !CLOSED_JOB_STATUSES.has(simpleJobStatus(job)))
    .sort((a, b) => {
      const aActive = simpleJobStatus(a) === "in_progress" ? 0 : 1;
      const bActive = simpleJobStatus(b) === "in_progress" ? 0 : 1;
      if (aActive !== bActive) return aActive - bActive;
      return String(a.scheduledStart || "").localeCompare(String(b.scheduledStart || ""));
    })
    .slice(0, 12);
}

// The fence-pilot front door: a calm home with the company name, today's
// jobs, and the four things a small crew actually does. Everything else in
// the app still exists -- this page just doesn't shout about it.
export function SimpleFenceTodayPage({
  user,
  companySettings = {},
  currentCompany = null,
  companyName = "",
  jobs = [],
  setActive,
  onSelectJob,
  onStartQuickEstimate,
}) {
  const workspaceName = companyName || resolveWorkspaceCompanyName({ currentCompany, companySettings, user });
  const todayLabel = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const openJobs = openJobsForToday(jobs);

  const quickActions = [
    { id: "clock", label: "Clock", helper: "Clock in or out", icon: "clock", onClick: () => setActive?.("time") },
    {
      id: "quote",
      label: "Quote",
      helper: "Start a new estimate",
      icon: "quote",
      onClick: () => {
        if (typeof onStartQuickEstimate === "function") onStartQuickEstimate();
        else setActive?.("estimates");
      },
    },
    { id: "send", label: "Send", helper: "Review & send estimates", icon: "arrowUpRight", onClick: () => setActive?.("estimates") },
    { id: "hours", label: "Hours", helper: "Crew hours this week", icon: "document", onClick: () => setActive?.("time") },
  ];

  return (
    <div className="co-office-page co-simple-today-page">
      <PageHeader eyebrow={todayLabel} title={workspaceName} description="Here's your day. Everything else is in the side menu when you need it." />

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" role="group" aria-label="Quick actions">
        {quickActions.map((action) => (
          <button
            key={action.id}
            type="button"
            onClick={action.onClick}
            className="co-focus-ring flex flex-col items-start gap-2 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-orange-300 hover:bg-orange-50/40"
          >
            <Icon name={action.icon} />
            <span className="text-lg font-black text-slate-950">{action.label}</span>
            <span className="text-sm font-bold text-slate-500">{action.helper}</span>
          </button>
        ))}
      </div>

      <Card className="mt-5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-black text-slate-950">Your jobs</h2>
          <Button type="button" variant="secondary" onClick={() => setActive?.("jobs")}>All jobs</Button>
        </div>
        {openJobs.length === 0 ? (
          <div className="mt-3">
            <StateCard title="No jobs yet" description="When you create a job (or win an estimate), it shows up here." tone="slate" />
          </div>
        ) : (
          <ul className="mt-3 grid gap-2">
            {openJobs.map((job) => (
              <li key={job.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <div className="min-w-0">
                  <p className="break-words text-sm font-black text-slate-950">{jobTitle(job)}</p>
                  <p className="mt-0.5 text-xs font-bold text-slate-500">{friendlyJobSchedule(job)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge tone={simpleJobStatus(job) === "in_progress" ? "green" : "slate"}>{jobStatusLabel(job.status || job.stage)}</Badge>
                  <Button type="button" onClick={() => (typeof onSelectJob === "function" ? onSelectJob(job.id) : setActive?.("jobs"))}>Open</Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
