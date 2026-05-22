import {
  Badge,
  Button,
  Card,
  Icon,
  SectionHeader,
} from "./app-shell-components";

export function CommandCenterSummaryCard({ title, description, count, tone = "orange", rows = [], emptyText = "Nothing waiting.", actionLabel = "View all", onAction }) {
  return (
    <Card className="co-command-card p-4">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-black text-slate-950">{title}</p>
          {description ? <p className="mt-1 text-sm leading-5 text-slate-500">{description}</p> : null}
        </div>
        <Badge tone={count > 0 ? tone : "slate"}>{count}</Badge>
      </div>
      <div className="mt-3 space-y-2">
        {rows.length ? rows.slice(0, 3).map((row) => (
          <div key={row.id} className="rounded-2xl border border-slate-100 bg-white/90 p-3">
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-slate-950">{row.title}</p>
                {row.description ? <p className="mt-1 break-words text-xs font-bold leading-5 text-slate-500">{row.description}</p> : null}
              </div>
              {row.badge ? <Badge tone={row.tone || "slate"}>{row.badge}</Badge> : null}
            </div>
          </div>
        )) : (
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-sm font-bold text-slate-500">{emptyText}</div>
        )}
      </div>
      {onAction ? (
        <button type="button" onClick={onAction} className="co-focus-ring mt-3 inline-flex items-center gap-1 rounded-full text-sm font-black text-orange-700 hover:text-orange-800">
          {actionLabel}
          <span aria-hidden="true">-&gt;</span>
        </button>
      ) : null}
    </Card>
  );
}

export function CommandCenterTableCard({ title, description, action, children, emptyText, className = "" }) {
  return (
    <Card className={`co-command-card co-command-table-card p-2.5 ${className}`}>
      <SectionHeader title={title} description={description} action={action} />
      {children ? (
        <div className="table-shell co-command-table-shell">
          {children}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-4 text-sm font-bold text-slate-500">{emptyText}</div>
      )}
    </Card>
  );
}

export function CommandCenterOwnerHealthCard({ onOpenOwnerHealth }) {
  const rows = [
    { label: "App Status", detail: "Review the live health panel", pill: "Review", tone: "blue" },
    { label: "Database", detail: "Confirm data service status", pill: "Review", tone: "blue" },
    { label: "Backup", detail: "Check export and safety status", pill: "Review", tone: "slate" },
    { label: "Apex Assistant", detail: "Server-side, review-only assistant tools", pill: "Review", tone: "slate" },
    { label: "Website Intake", detail: "Review intake readiness", pill: "Review", tone: "slate" },
  ];

  return (
    <Card className="co-command-card p-2.5">
      <SectionHeader title="Owner Health Review" description="Live app, data, and intake checks stay one click away." />
      <div className="co-command-health-list">
        {rows.map((row) => (
          <div key={row.label} className="co-command-health-row co-command-rail-row">
            <span className="flex min-w-0 items-start gap-2">
              <span className="co-command-health-check" aria-hidden="true">
                <Icon name="check" className="h-3 w-3" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-xs font-black text-slate-950">{row.label}</span>
                <span className="sr-only">{row.detail}</span>
              </span>
            </span>
            <Badge tone={row.tone}>{row.pill}</Badge>
          </div>
        ))}
      </div>
      <button type="button" onClick={onOpenOwnerHealth} className="co-focus-ring mt-2 inline-flex items-center gap-1 rounded-full text-xs font-black text-orange-700 hover:text-orange-800">
        View Owner Health
        <span aria-hidden="true">-&gt;</span>
      </button>
    </Card>
  );
}

export function CommandCenterWatchtowerCard({ actions = [], queue = [], onOpenModule }) {
  const visibleActions = Array.isArray(actions) ? actions.slice(0, 5) : [];
  const visibleQueue = Array.isArray(queue) ? queue.slice(0, 4) : [];

  return (
    <Card className="co-command-card p-2.5">
      <SectionHeader title="Watchtower" description="Read-only owner view of missing work and field blockers." />
      <div className="grid gap-1">
        {visibleActions.length ? visibleActions.map((action) => (
          <button
            key={action.id}
            type="button"
            onClick={() => onOpenModule?.(action.moduleId)}
            className="co-command-rail-row co-focus-ring grid w-full grid-cols-[0.55rem_minmax(0,1fr)_auto] items-start gap-2 rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-left transition hover:border-orange-200 hover:bg-orange-50"
          >
            <span className="co-command-alert-dot mt-1.5" data-tone={action.tone || "amber"} aria-hidden="true" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-black text-slate-950">{action.title}</span>
              <span className="mt-0.5 block text-xs font-bold leading-5 text-slate-600">{action.description}</span>
            </span>
            <span className="flex shrink-0 flex-col items-end gap-1">
              <Badge tone={action.tone || "amber"}>{action.count}</Badge>
              <span className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">{action.actionLabel || "Review"}</span>
            </span>
          </button>
        )) : (
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-3 text-sm font-bold text-emerald-700">
            Watchtower has no owner actions right now.
          </div>
        )}
      </div>
      {visibleQueue.length ? (
        <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-50/80 p-2">
          <p className="px-1 pb-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Needs attention</p>
          <div className="grid gap-1">
            {visibleQueue.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onOpenModule?.(item.moduleId)}
                className="co-focus-ring w-full rounded-xl border border-white bg-white px-2 py-1.5 text-left transition hover:border-orange-200 hover:bg-orange-50"
              >
                <span className="flex min-w-0 items-start justify-between gap-2">
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-black text-slate-950">{item.title}</span>
                    <span className="mt-0.5 block text-[11px] font-bold leading-4 text-slate-600">{item.description}</span>
                  </span>
                  <Badge tone={item.tone || "amber"}>{item.sourceLabel || "Review"}</Badge>
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <p className="mt-3 text-xs font-bold text-slate-600">Review-only. Watchtower does not send messages, change jobs, or contact customers automatically.</p>
    </Card>
  );
}

export function CommandCenterMorningFlowCard({ onOpenLeads, onOpenDrafts, onOpenJobs, onOpenReports, priorityCount = 0, overdueCount = 0, jobsNeedingReview = 0, reportsUploadsDue = 0 }) {
  const steps = [
    "Clear overdue follow-ups",
    "Unblock job startup",
    "Review reports, photos, tickets, and time",
  ];

  return (
    <Card className="co-command-cockpit p-4">
      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(20rem,0.92fr)] xl:items-stretch">
        <div className="min-w-0">
          <Badge tone="orange">Operator cockpit</Badge>
          <h3 className="mt-2 text-2xl font-black tracking-tight text-white">Start with what can block today.</h3>
          <p className="co-command-cockpit-copy mt-2 max-w-3xl text-sm font-bold leading-6 text-slate-300">
            Prioritize overdue outreach, job startup blockers, and field evidence before the office moves deeper into the day.
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {steps.map((step, index) => (
              <span key={step} className="co-command-cockpit-step">
                <span>{index + 1}</span>
                {step}
              </span>
            ))}
          </div>
        </div>
        <div className="grid min-w-0 gap-2">
          <div className="co-command-cockpit-metrics">
            <div>
              <p>{priorityCount}</p>
              <span>priority items</span>
            </div>
            <div>
              <p>{overdueCount}</p>
              <span>overdue</span>
            </div>
            <div>
              <p>{jobsNeedingReview}</p>
              <span>job blockers</span>
            </div>
            <div>
              <p>{reportsUploadsDue}</p>
              <span>reports/photos</span>
            </div>
          </div>
          <div className="co-command-cockpit-actions">
            <Button type="button" size="sm" onClick={onOpenLeads}>Start Priority Work</Button>
            <Button type="button" size="sm" variant="secondary" onClick={onOpenJobs}>Open Jobs</Button>
            {typeof onOpenDrafts === "function" ? <Button type="button" size="sm" variant="secondary" onClick={onOpenDrafts}>Draft Review</Button> : null}
            <Button type="button" size="sm" variant="secondary" onClick={onOpenReports}>Reports / Photos</Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

export function CommandCenterQuickAction({ icon, label, helper, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="co-command-action-row co-command-rail-row co-focus-ring flex w-full items-center justify-between gap-2 rounded-xl border px-2 py-1.5 text-left transition hover:border-orange-200 hover:bg-orange-50"
    >
      <span className="flex min-w-0 items-center gap-2.5">
        <span className="shrink-0 rounded-xl bg-orange-50 p-1.5 text-orange-700">
          <Icon name={icon} className="h-4 w-4" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-black text-slate-950">{label}</span>
          {helper ? <span className="sr-only">{helper}</span> : null}
        </span>
      </span>
      <span className="text-lg font-black text-slate-400" aria-hidden="true">&rsaquo;</span>
    </button>
  );
}

export function CommandCenterOpsPulseCard({ icon = "grid", title, value, helper, rows = [], tone = "orange", actionLabel = "Open", onAction }) {
  const safeRows = Array.isArray(rows) ? rows.filter(Boolean) : [];
  const canRunAction = typeof onAction === "function";

  return (
    <Card className="co-command-ops-card" data-tone={tone}>
      <div className="co-command-ops-card-head">
        <span className="co-command-ops-card-icon" aria-hidden="true">
          <Icon name={icon} className="h-4 w-4" />
        </span>
        <span className="min-w-0">
          <span className="co-command-ops-card-title">{title}</span>
          <span className="co-command-ops-card-helper">{helper}</span>
        </span>
        <strong>{value}</strong>
      </div>
      <div className="co-command-ops-card-rows">
        {safeRows.map((row) => (
          <span key={row.label}>
            <em>{row.label}</em>
            <b>{row.value}</b>
          </span>
        ))}
      </div>
      {canRunAction ? (
        <button type="button" onClick={onAction} className="co-command-ops-card-link co-focus-ring">
          {actionLabel}
          <span aria-hidden="true">-&gt;</span>
        </button>
      ) : null}
    </Card>
  );
}

export function CommandCenterProofChainCard({ summary, onOpenModule }) {
  const rows = Array.isArray(summary?.rows) ? summary.rows : [];
  if (!rows.length) return null;
  const hasBlockers = Number(summary?.blockerCount || 0) > 0;
  const readyCount = Number(summary?.readyCount || 0);

  return (
    <Card className="co-command-card p-3.5">
      <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={hasBlockers ? "amber" : readyCount > 0 ? "green" : "slate"}>{summary?.statusLabel || "Proof chain"}</Badge>
            <Badge tone="slate">Review-only</Badge>
          </div>
          <h3 className="mt-2 text-base font-black text-slate-950">Proof chain from setup to ready-to-bill</h3>
          <p className="mt-1 max-w-4xl text-sm font-bold leading-6 text-slate-600">
            One office readout ties job startup, reports, uploads, tickets, safety, tools, time, and manual billing readiness together.
          </p>
        </div>
        <Button type="button" size="sm" onClick={() => onOpenModule?.(summary?.nextModuleId || "jobs")}>
          {summary?.nextAction || "Review chain"}
        </Button>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        {rows.map((row) => (
          <button
            key={row.id}
            type="button"
            onClick={() => onOpenModule?.(row.moduleId)}
            className="co-command-ops-card co-focus-ring text-left"
            data-tone={row.tone || "slate"}
          >
            <span className="co-command-ops-card-head">
              <span className="co-command-ops-card-icon" aria-hidden="true">
                <Icon name={row.id === "ready-to-bill" ? "check" : row.id === "time" ? "clock" : row.id === "safety-tools" ? "alert" : row.id === "materials" ? "clipboard" : row.id === "field-proof" ? "upload" : "briefcase"} className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="co-command-ops-card-title">{row.label}</span>
                <span className="co-command-ops-card-helper">{row.helper}</span>
              </span>
              <strong>{row.value}</strong>
            </span>
            <span className="co-command-ops-card-link">
              {row.actionLabel || "Open"}
              <span aria-hidden="true">-&gt;</span>
            </span>
          </button>
        ))}
      </div>
      <p className="mt-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs font-bold leading-5 text-slate-600">
        This is a visibility surface only. It does not send messages, create invoices, submit billing, or change field records automatically.
      </p>
    </Card>
  );
}

export function FieldOpsAgentSummaryCard({ state, onOpenModule, onOpenItem, compact = false }) {
  if (!state?.canView) return null;
  const items = Array.isArray(state.items) ? state.items.slice(0, compact ? 3 : 5) : [];
  const stats = state.stats || {};
  const hasRisk = Number(stats.total || 0) > 0;
  const openModule = (moduleId) => {
    if (!moduleId || typeof onOpenModule !== "function") return;
    onOpenModule(moduleId);
  };
  const openItem = (item) => {
    if (typeof onOpenItem === "function") {
      onOpenItem(item);
      return;
    }
    openModule(item?.moduleId);
  };

  return (
    <Card className={`co-command-card ${compact ? "p-3" : "p-3.5"}`}>
      <SectionHeader
        title="Field Ops Agent"
        description={compact ? "Read-only assigned-work reminders." : "Read-only field risk summary with human review only."}
        action={<Badge tone={hasRisk ? "amber" : "green"}>{state.modeLabel || "Read-only"}</Badge>}
      />
      <div className="mt-3 grid grid-cols-3 gap-1.5">
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-2">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Review</p>
          <strong className="mt-1 block text-xl font-black text-slate-950">{stats.total || 0}</strong>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-2">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Jobs</p>
          <strong className="mt-1 block text-xl font-black text-slate-950">{stats.visibleJobs || 0}</strong>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-2">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Clocks</p>
          <strong className="mt-1 block text-xl font-black text-slate-950">{stats.activeClocks || 0}</strong>
        </div>
      </div>
      <div className="mt-3 grid gap-1.5">
        {items.length ? items.map((item) => (
          <button
            type="button"
            key={item.id}
            onClick={() => openItem(item)}
            className="co-focus-ring grid w-full grid-cols-[minmax(0,1fr)_auto] items-start gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-left transition hover:border-orange-200 hover:bg-orange-50"
          >
            <span className="min-w-0">
              <span className="block truncate text-sm font-black text-slate-950">{item.title}</span>
              <span className="mt-0.5 block text-xs font-bold leading-5 text-slate-600">{item.description}</span>
              <span className="mt-1 block text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">
                {[item.contextLabel, item.dueLabel || state.roleScope].filter(Boolean).join(" / ")}
              </span>
            </span>
            <Badge tone={item.severity === "critical" ? "red" : item.severity === "warning" ? "amber" : "blue"}>{item.actionLabel || "Open"}</Badge>
          </button>
        )) : (
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-3 text-sm font-bold leading-6 text-emerald-800">
            Field Ops Agent does not see missing reports, proof, tickets, checklists, incidents, or active clock reviews for this scope.
          </div>
        )}
      </div>
      <p className="mt-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs font-bold leading-5 text-slate-600">
        {state.privacyLabel || "No hidden GPS tracking, no automatic messages, no payroll or discipline actions."}
      </p>
    </Card>
  );
}
