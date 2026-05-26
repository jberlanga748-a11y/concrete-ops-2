import { useEffect, useMemo, useRef, useState } from "react";

import {
  Badge,
  Button,
  Card,
  Icon,
  InputField,
  PageHeader,
  SectionHeader,
  SelectField,
  StateCard,
  StatusBadge,
  TextAreaField,
} from "./app-shell-components";
import { CommandCenterKpiCard, ModuleKpiStrip } from "./command-center-route-components";
import { FieldOperatorPanelShell } from "./field-route-components";
import { deriveChecklistItems, deriveToolChecklistJobReadiness, deriveToolChecklistListState, filterToolChecklists, toolChecklistItemStatusLabel, toolChecklistStatusLabel } from "./tool-checklist-utils";
import { jobTitle } from "./job-utils";

function formatDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
const INITIAL_TOOL_CHECKLIST_FORM = {
  jobId: "",
  title: "Tool loadout",
  notes: "",
};

const INITIAL_TOOL_CHECKLIST_ITEM_FORM = {
  name: "",
  category: "other",
  quantity: 1,
  status: "needed",
  notes: "",
  missingNotes: "",
  damagedNotes: "",
};

function toolChecklistStatusTone(status = "draft") {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "reviewed") return "green";
  if (normalized === "submitted") return "amber";
  if (normalized === "archived") return "slate";
  if (normalized === "active") return "orange";
  return "slate";
}

function toolChecklistItemStatusTone(status = "needed") {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "missing" || normalized === "damaged") return normalized === "missing" ? "amber" : "red";
  if (["loaded", "on_site", "returned", "not_needed"].includes(normalized)) return "green";
  return "slate";
}

function toolChecklistJobLabel(checklist) {
  return checklist?.job?.title || checklist?.jobTitle || "General checklist";
}

function toolChecklistCustomerLabel(checklist) {
  return checklist?.job?.customer || "Field work";
}

function toolChecklistForemanLabel(checklist) {
  return checklist?.job?.foremanAssignment?.userName || checklist?.assignedForemanName || "Unassigned";
}

function toolChecklistUpdatedAt(checklist) {
  return checklist?.updatedAt || checklist?.createdAt;
}

function ToolChecklistTablePolished({ rows, selectedId, onSelect, onOpenChecklist, mobileMaxRows = null }) {
  const mobileRows = mobileMaxRows ? rows.slice(0, mobileMaxRows) : rows;

  return (
    <>
      <div className="co-toolbox-mobile-list grid gap-3 p-3 lg:hidden">
        {mobileRows.map((checklist) => {
          const selected = checklist.id === selectedId;

          return (
            <article
              key={checklist.id}
              className={`co-toolbox-mobile-card co-mobile-record-card w-full rounded-[1.05rem] border p-4 text-left transition ${selected ? "is-selected border-orange-200 bg-orange-50/75" : "border-slate-200 bg-white"}`}
            >
              <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="break-words text-base font-black text-slate-950">{checklist.title || "Untitled tool checklist"}</p>
                  <p className="mt-1 break-words text-xs font-bold text-slate-500">{toolChecklistJobLabel(checklist)} / {toolChecklistCustomerLabel(checklist)}</p>
                </div>
                <Badge tone={toolChecklistStatusTone(checklist.status)}>{toolChecklistStatusLabel(checklist.status)}</Badge>
              </div>
              <div className="co-toolbox-selected-metrics">
                <div><span>Items</span><strong>{checklist.items?.length || 0}</strong></div>
                <div><span>Missing</span><strong>{checklist.missingItemCount || 0}</strong></div>
                <div><span>Damaged</span><strong>{checklist.damagedItemCount || 0}</strong></div>
                <div><span>Foreman</span><strong>{toolChecklistForemanLabel(checklist)}</strong></div>
              </div>
              <button type="button" className="co-toolbox-mobile-card-action" onClick={() => { onSelect(checklist.id); onOpenChecklist?.(checklist.id); }}>
                Open checklist
              </button>
            </article>
          );
        })}
      </div>
      <div className="co-toolbox-list-scroll hidden min-w-0 overflow-auto lg:block">
        <table className="co-toolbox-command-table w-full min-w-[900px] text-left">
          <thead>
            <tr>
              <th>Checklist / Notes</th>
              <th>Job</th>
              <th>Status</th>
              <th>Tool Issues</th>
              <th>Open</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((checklist) => {
              const selected = checklist.id === selectedId;

              return (
                <tr key={checklist.id} onClick={() => onSelect(checklist.id)} className={`cursor-pointer transition hover:bg-orange-50/45 ${selected ? "bg-orange-50/70" : ""}`}>
                  <td>
                    <p className="font-black text-slate-950">{checklist.title || "Untitled tool checklist"}</p>
                    <p className="text-xs font-bold text-slate-500">{checklist.notes || "No checklist notes recorded yet."}</p>
                  </td>
                  <td>
                    <p className="font-black text-slate-950">{toolChecklistJobLabel(checklist)}</p>
                    <p className="text-xs font-bold text-slate-500">{toolChecklistForemanLabel(checklist)}</p>
                  </td>
                  <td><Badge tone={toolChecklistStatusTone(checklist.status)}>{toolChecklistStatusLabel(checklist.status)}</Badge></td>
                  <td>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge tone="slate">{checklist.items?.length || 0} items</Badge>
                      {checklist.missingItemCount ? <Badge tone="amber">{checklist.missingItemCount} missing</Badge> : null}
                      {checklist.damagedItemCount ? <Badge tone="red">{checklist.damagedItemCount} damaged</Badge> : null}
                    </div>
                  </td>
                  <td>
                    <button type="button" className="co-toolbox-icon-button" onClick={(event) => { event.stopPropagation(); onSelect(checklist.id); onOpenChecklist?.(checklist.id); }} aria-label={`Open tool checklist ${checklist.title || checklist.id}`}>
                      <Icon name="arrowUpRight" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function ToolChecklistJobReadinessCard({ readiness }) {
  if (!readiness) return null;

  return (
    <Card className="co-toolbox-rail-card p-4">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-orange-700">Dispatch readiness</p>
          <h3 className="mt-2 text-base font-black leading-tight text-slate-950">{readiness.status}</h3>
          <p className="mt-1 text-xs font-bold leading-5 text-slate-600">{readiness.nextAction} before the crew loadout is dispatch-ready.</p>
        </div>
        <Badge tone={readiness.tone}>{readiness.blockedJobs} jobs</Badge>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-slate-200 bg-white p-2">
          <span className="block text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Missing</span>
          <strong className="mt-1 block text-sm font-black text-slate-950">{readiness.missingItems}</strong>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-2">
          <span className="block text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Damaged</span>
          <strong className="mt-1 block text-sm font-black text-slate-950">{readiness.damagedItems}</strong>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-2">
          <span className="block text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Submitted</span>
          <strong className="mt-1 block text-sm font-black text-slate-950">{readiness.submittedChecklists}</strong>
        </div>
      </div>
      <div className="mt-3 grid gap-2">
        {readiness.topJobs.length ? readiness.topJobs.map((job) => (
          <div key={job.jobId} className="rounded-xl border border-slate-200 bg-white p-2.5">
            <div className="flex min-w-0 items-center justify-between gap-2">
              <p className="min-w-0 truncate text-xs font-black text-slate-900">{job.label}</p>
              <Badge tone={job.tone}>{job.checklists} loadout{job.checklists === 1 ? "" : "s"}</Badge>
            </div>
            <p className="mt-1 text-[11px] font-bold leading-4 text-slate-600">
              {job.blockers.length ? job.blockers.slice(0, 2).join(" / ") : "Tools are listed, issue-free, and reviewed."}
            </p>
          </div>
        )) : (
          <StateCard title="No active loadouts" description="Job tool readiness will appear here once loadouts are created." tone="slate" />
        )}
      </div>
      <p className="mt-3 text-[11px] font-bold leading-5 text-slate-500">
        Review-only. This does not assign crews, change jobs, or notify customers.
      </p>
    </Card>
  );
}

function ToolChecklistCommandRailPolished({ checklist, selectedItems, jobReadiness, permissions, busy, onOpenTool, onSubmitChecklist, onReviewChecklist, onArchiveChecklist, isOfficeWorkspace = false }) {
  const missingCount = Number(checklist?.missingItemCount || 0);
  const damagedCount = Number(checklist?.damagedItemCount || 0);
  const hasIssues = missingCount > 0 || damagedCount > 0;
  const railClassName = `co-toolbox-right-rail space-y-4${isOfficeWorkspace ? " co-tool-checklist-office-assistant" : ""}`;
  const assistantPriorities = checklist ? [
    {
      label: hasIssues
        ? `${missingCount + damagedCount} tool issue${missingCount + damagedCount === 1 ? "" : "s"} need a loadout decision`
        : "Tool issues are clear for the selected loadout",
      tone: hasIssues ? "warn" : "ready",
    },
    {
      label: `${toolChecklistStatusLabel(checklist.status)} status in the loadout board`,
      tone: String(checklist.status || "").toLowerCase() === "submitted" ? "warn" : "default",
    },
    {
      label: `${toolChecklistForemanLabel(checklist)} owns the field handoff`,
      tone: checklist.foremanName || checklist.foremanId ? "ready" : "default",
    },
  ] : [
    { label: "Select a loadout to see missing and damaged tools", tone: "default" },
    { label: permissions.toolChecklist.canManage ? "Create the next job loadout before the crew rolls" : "Assigned loadouts stay job-scoped", tone: "warn" },
    { label: "Office review stays out of field-only views", tone: "ready" },
  ];
  const assistantActions = [
    { label: checklist ? "Review checklist items" : "Prepare loadout", icon: checklist ? "layers" : "plus", onClick: () => onOpenTool(checklist ? "items" : "create"), show: Boolean(checklist || permissions.toolChecklist.canManage) },
    { label: "Edit loadout notes", icon: "clipboard", onClick: () => onOpenTool("detail"), show: Boolean(checklist && (permissions.toolChecklist.canManageAll || permissions.toolChecklist.canManageJob)) },
    { label: "Review submission", icon: "check", onClick: () => onReviewChecklist(checklist.id), show: Boolean(checklist && permissions.toolChecklist.canReview) },
  ].filter((item) => item.show);

  if (!checklist) {
    return (
      <div className={railClassName}>
        {isOfficeWorkspace ? (
          <Card className="co-prepour-assistant-card p-0">
            <div className="co-prepour-assistant-topbar">
              <span><Icon name="spark" /></span>
              <strong>Apex Assistant</strong>
              <em>Tools</em>
            </div>
            <div className="co-prepour-assistant-body">
              <p className="co-prepour-assistant-kicker">Loadout command</p>
              <h3>Select a loadout before the crew rolls.</h3>
              <p>Pick a job row to see missing tools, crew ownership, submission status, and the next office action.</p>
              <div className="co-prepour-assistant-priorities">
                {assistantPriorities.map((item) => <span key={item.label} data-tone={item.tone}>{item.label}</span>)}
              </div>
              {assistantActions.length ? (
                <div className="co-prepour-assistant-actions">
                  {assistantActions.map((item) => (
                    <button key={item.label} type="button" onClick={item.onClick}>
                      <Icon name={item.icon} />
                      {item.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </Card>
        ) : null}
        <Card className="co-toolbox-rail-card p-4">
          <SectionHeader title="Tool Console" description="Select a checklist or create one for a visible job." />
          <div className="co-toolbox-empty-rail">
            <span><Icon name="clipboard" /></span>
            <strong>No checklist selected</strong>
            <p>Tool checklists stay scoped to allowed jobs, so field users only see the work assigned to them.</p>
          </div>
          {permissions.toolChecklist.canManage ? <Button type="button" className="mt-3 w-full" onClick={() => onOpenTool("create")}>Create Checklist</Button> : null}
        </Card>
        {isOfficeWorkspace ? <ToolChecklistJobReadinessCard readiness={jobReadiness} /> : null}
      </div>
    );
  }

  return (
    <div className={railClassName}>
      {isOfficeWorkspace ? (
        <Card className="co-prepour-assistant-card p-0">
          <div className="co-prepour-assistant-topbar">
            <span><Icon name="spark" /></span>
            <strong>Apex Assistant</strong>
            <em>Tools</em>
          </div>
          <div className="co-prepour-assistant-body">
            <p className="co-prepour-assistant-kicker">Loadout command</p>
            <h3>{checklist.title || "Selected tool loadout"}</h3>
            <p>{toolChecklistJobLabel(checklist)} / {toolChecklistCustomerLabel(checklist)} / {selectedItems.length} item{selectedItems.length === 1 ? "" : "s"} listed</p>
            <div className="co-prepour-assistant-priorities">
              {assistantPriorities.map((item) => <span key={item.label} data-tone={item.tone}>{item.label}</span>)}
            </div>
            {assistantActions.length ? (
              <div className="co-prepour-assistant-actions">
                {assistantActions.map((item) => (
                  <button key={item.label} type="button" onClick={item.onClick}>
                    <Icon name={item.icon} />
                    {item.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </Card>
      ) : null}
      {isOfficeWorkspace ? <ToolChecklistJobReadinessCard readiness={jobReadiness} /> : null}
      <Card className="co-toolbox-rail-card p-4">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Selected checklist</p>
            <h3 className="mt-2 break-words text-xl font-black leading-tight text-slate-950">{checklist.title || "Untitled tool checklist"}</h3>
            <p className="mt-1 break-words text-xs font-black text-slate-500">{toolChecklistJobLabel(checklist)} / {toolChecklistCustomerLabel(checklist)}</p>
          </div>
          <Badge tone={toolChecklistStatusTone(checklist.status)}>{toolChecklistStatusLabel(checklist.status)}</Badge>
        </div>

        <div className="co-toolbox-selected-metrics">
          <div><span>Items</span><strong>{selectedItems.length}</strong></div>
          <div><span>Missing</span><strong>{missingCount}</strong></div>
          <div><span>Damaged</span><strong>{damagedCount}</strong></div>
          <div><span>Foreman</span><strong>{toolChecklistForemanLabel(checklist)}</strong></div>
        </div>

        <div className="co-toolbox-note-panel">
          <span>Checklist notes</span>
          <p>{checklist.notes || "No checklist notes recorded yet."}</p>
        </div>

        <div className="co-toolbox-rail-action-grid mt-3">
          <Button type="button" size="sm" onClick={() => onOpenTool("items")}>Review Items</Button>
          {(permissions.toolChecklist.canManageAll || permissions.toolChecklist.canManageJob) ? <Button type="button" size="sm" variant="secondary" onClick={() => onOpenTool("detail")}>Edit Notes</Button> : null}
          {permissions.toolChecklist.canManageJob ? <Button type="button" size="sm" variant="secondary" onClick={() => onSubmitChecklist(checklist.id)} disabled={busy || checklist.status === "submitted" || checklist.status === "reviewed" || checklist.status === "archived"}>Submit</Button> : null}
          {permissions.toolChecklist.canReview ? <Button type="button" size="sm" onClick={() => onReviewChecklist(checklist.id)} disabled={busy || checklist.status === "reviewed" || checklist.status === "archived"}>Review</Button> : null}
          {permissions.toolChecklist.canManageAll ? <Button type="button" size="sm" variant="danger" onClick={() => onArchiveChecklist(checklist.id)} disabled={busy || checklist.status === "archived"}>Archive</Button> : null}
        </div>
      </Card>

      <Card className="co-toolbox-rail-card p-4">
        <SectionHeader title="Loadout Readiness" description="A fast check for whether the crew can move with confidence." />
        <div className="co-toolbox-readiness-list">
          <span data-state={checklist.jobId ? "ready" : "needs"}>Job link <strong>{checklist.jobId ? "Set" : "Needed"}</strong></span>
          <span data-state={selectedItems.length ? "ready" : "needs"}>Items <strong>{selectedItems.length ? `${selectedItems.length} listed` : "Needed"}</strong></span>
          <span data-state={missingCount ? "needs" : "ready"}>Missing <strong>{missingCount ? `${missingCount} open` : "Clear"}</strong></span>
          <span data-state={damagedCount ? "needs" : "ready"}>Damaged <strong>{damagedCount ? `${damagedCount} open` : "Clear"}</strong></span>
          <span data-state={hasIssues ? "needs" : "ready"}>Crew status <strong>{hasIssues ? "Needs action" : "Ready"}</strong></span>
        </div>
      </Card>
    </div>
  );
}

function ToolChecklistMobileFocusPanel({
  checklist,
  selectedItems,
  filteredCount,
  visibleJobCount,
  openIssueCount,
  permissions,
  busy,
  canAddItems,
  canCreateChecklist,
  onOpenTool,
  onSubmitChecklist,
  onJumpToBoard,
}) {
  const status = String(checklist?.status || "").toLowerCase();
  const canSubmit = Boolean(
    permissions.toolChecklist.canManageJob
      && checklist
      && !["submitted", "reviewed", "archived"].includes(status)
  );
  const title = checklist?.title || "Tool loadout ready";
  const focusMeta = checklist
    ? `${toolChecklistJobLabel(checklist)} / ${toolChecklistForemanLabel(checklist)}`
    : `${filteredCount} visible loadout${filteredCount === 1 ? "" : "s"}`;
  const metricItems = [
    { label: "Loads", value: filteredCount, tone: filteredCount ? "orange" : "slate", onClick: onJumpToBoard },
    { label: "Items", value: checklist ? selectedItems.length : "-", tone: selectedItems.length ? "orange" : "slate", onClick: () => onOpenTool("items") },
    { label: "Issues", value: openIssueCount, tone: openIssueCount ? "amber" : "green", onClick: () => onOpenTool("items") },
    { label: "Jobs", value: visibleJobCount, tone: visibleJobCount ? "orange" : "slate", onClick: onJumpToBoard },
  ];

  return (
    <section className="co-prepour-mobile-focus co-toolbox-mobile-focus co-tool-checklist-mobile-focus mx-4 mb-3 lg:hidden" aria-label="Tool checklist mobile focus">
      <div className="co-prepour-mobile-focus-copy">
        <span>Tool Focus</span>
        <h2>{title}</h2>
        <p>{checklist?.notes || "Open the selected loadout, update missing or damaged tools, and keep submit actions within role limits."}</p>
        <em>{focusMeta}</em>
      </div>

      <div className="co-prepour-mobile-focus-actions">
        {checklist ? (
          <Button type="button" onClick={() => onOpenTool("items")}>
            <Icon name="layers" />
            Items
          </Button>
        ) : (
          <Button type="button" onClick={onJumpToBoard}>
            <Icon name="clipboard" />
            Board
          </Button>
        )}
        {canAddItems ? (
          <Button type="button" variant="secondary" onClick={() => onOpenTool("add")}>
            <Icon name="plus" />
            Add
          </Button>
        ) : canCreateChecklist ? (
          <Button type="button" variant="secondary" onClick={() => onOpenTool("create")}>
            <Icon name="plus" />
            New
          </Button>
        ) : null}
        {canSubmit ? (
          <Button type="button" variant="secondary" onClick={() => onSubmitChecklist(checklist.id)} disabled={busy || !canSubmit}>
            <Icon name="check" />
            Submit
          </Button>
        ) : (
          <Button type="button" variant="secondary" onClick={() => onOpenTool(checklist ? "detail" : "items")}>
            <Icon name="clipboard" />
            Details
          </Button>
        )}
      </div>

      <div className="co-prepour-mobile-focus-metrics">
        {metricItems.map((metric) => (
          <button key={metric.label} type="button" data-tone={metric.tone} onClick={metric.onClick}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
          </button>
        ))}
      </div>
    </section>
  );
}

function ToolChecklistFieldOperatorPanel({ checklist, selectedItems, filteredRows, visibleJobs, permissions, busy, onOpenTool, onSubmitChecklist, onJumpToBoard }) {
  const status = String(checklist?.status || "").toLowerCase();
  const missingCount = Number(checklist?.missingItemCount || 0);
  const damagedCount = Number(checklist?.damagedItemCount || 0);
  const openIssueCount = missingCount + damagedCount;
  const canContribute = Boolean(permissions.toolChecklist.canContribute && checklist);
  const canSubmit = Boolean(
    permissions.toolChecklist.canManageJob
      && checklist
      && !["submitted", "reviewed", "archived"].includes(status)
  );
  const summaryItems = [
    { label: "Loadouts", value: filteredRows.length, tone: filteredRows.length ? "orange" : "slate" },
    { label: "Selected items", value: checklist ? selectedItems.length : "-", tone: selectedItems.length ? "orange" : "slate" },
    { label: "Open issues", value: checklist ? openIssueCount : "-", tone: openIssueCount ? "amber" : "green" },
    { label: "Assigned jobs", value: visibleJobs.length, tone: visibleJobs.length ? "orange" : "slate" },
  ];

  return (
    <div className="co-tool-checklist-field-panel-wrap mx-auto w-full max-w-[1520px] min-w-0 px-5 pb-3 sm:px-6 lg:px-6">
      <FieldOperatorPanelShell
        className="co-tool-checklist-field-panel"
        badges={[
          { label: "Field Tool Loadout", tone: "orange" },
          checklist ? { label: toolChecklistStatusLabel(checklist.status), tone: toolChecklistStatusTone(checklist.status) } : null,
          openIssueCount ? { label: `${openIssueCount} open issue${openIssueCount === 1 ? "" : "s"}`, tone: "amber" } : { label: "No open issues", tone: "green" },
        ]}
        title={checklist ? checklist.title || "Untitled tool checklist" : "No tool loadout selected"}
        description={checklist
          ? `${toolChecklistJobLabel(checklist)} / ${toolChecklistCustomerLabel(checklist)}`
          : visibleJobs.length
            ? "Select an assigned loadout, add missing tools, and keep the job checklist ready for handoff."
            : "When a job tool checklist is assigned, the loadout and field actions will show here."}
        meta={checklist ? `${selectedItems.length} item${selectedItems.length === 1 ? "" : "s"} listed / ${toolChecklistForemanLabel(checklist)}` : `${filteredRows.length} visible loadout${filteredRows.length === 1 ? "" : "s"}`}
        metaIcon="clipboard"
        actions={[
          checklist
            ? { id: "items", label: "Open Items", icon: "layers", onClick: () => onOpenTool("items") }
            : { id: "board", label: "View Board", icon: "clipboard", onClick: onJumpToBoard },
          canContribute ? { id: "add", label: "Add Item", icon: "plus", variant: "secondary", onClick: () => onOpenTool("add") } : null,
          permissions.toolChecklist.canManageJob && checklist ? { id: "submit", label: "Submit", icon: "check", variant: "secondary", disabled: busy || !canSubmit, onClick: () => onSubmitChecklist(checklist.id) } : null,
          permissions.toolChecklist.canManage ? { id: "create", label: "New Loadout", icon: "plus", variant: "secondary", onClick: () => onOpenTool("create") } : null,
        ]}
        facts={summaryItems}
      />
    </div>
  );
}

function ToolChecklistCreatePanelPolished({ canCreate, visibleJobs, checklistDraft, setChecklistDraft, singleJobId, busy, onCreateChecklist }) {
  if (!canCreate) {
    return (
      <Card className="co-toolbox-form-card p-4">
        <StateCard title="Create unavailable" description="This role can use assigned checklists but cannot create new job checklists." tone="slate" />
      </Card>
    );
  }

  return (
    <Card className="co-toolbox-form-card p-4">
      <SectionHeader title="Create Checklist" description="Start a job-level loadout board for the crew." />
      <div className="co-toolbox-form-grid">
        <SelectField label="Job" value={checklistDraft.jobId} onChange={(event) => setChecklistDraft((current) => ({ ...current, jobId: event.target.value }))}>
          <option value="">Select a job</option>
          {visibleJobs.map((job) => <option key={job.id} value={job.id}>{jobTitle(job)}</option>)}
        </SelectField>
        <div className="co-tool-checklist-create-title">
          <InputField label="Title" value={checklistDraft.title} onChange={(event) => setChecklistDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Pour day loadout" />
        </div>
        <div className="co-tool-checklist-create-notes md:col-span-2">
          <InputField label="Notes" value={checklistDraft.notes} onChange={(event) => setChecklistDraft((current) => ({ ...current, notes: event.target.value }))} placeholder="Crew prep notes" />
        </div>
        <div className="md:col-span-2">
          <Button
            type="button"
            className="w-full sm:w-auto"
            onClick={async () => {
              const created = await onCreateChecklist(checklistDraft);
              if (!created) return;
              setChecklistDraft({ ...INITIAL_TOOL_CHECKLIST_FORM, jobId: singleJobId });
            }}
            disabled={busy || !checklistDraft.jobId || !checklistDraft.title.trim()}
          >
            Create checklist
          </Button>
        </div>
      </div>
    </Card>
  );
}

function ToolChecklistDetailPanelPolished({ checklist, permissions, busy, onSaveChecklist, onSubmitChecklist, onReviewChecklist, onArchiveChecklist }) {
  if (!checklist) {
    return (
      <Card className="co-toolbox-form-card p-4">
        <StateCard title="No checklist selected" description="Choose a checklist from the board to review details and actions." tone="slate" />
      </Card>
    );
  }

  return (
    <Card className="co-toolbox-form-card p-4">
      <SectionHeader title={checklist.title || "Tool checklist"} description={`${toolChecklistJobLabel(checklist)} / ${toolChecklistCustomerLabel(checklist)}`} action={<Badge tone={toolChecklistStatusTone(checklist.status)}>{toolChecklistStatusLabel(checklist.status)}</Badge>} />
      <div className="co-toolbox-selected-metrics">
        <div><span>Foreman</span><strong>{toolChecklistForemanLabel(checklist)}</strong></div>
        <div><span>Updated</span><strong>{formatDateTime(toolChecklistUpdatedAt(checklist)) || "Not set"}</strong></div>
        <div><span>Missing</span><strong>{checklist.missingItemCount || 0}</strong></div>
        <div><span>Damaged</span><strong>{checklist.damagedItemCount || 0}</strong></div>
      </div>
      <div className="mt-3">
        <TextAreaField
          label="Checklist notes"
          key={`${checklist.id}-notes`}
          defaultValue={checklist.notes || ""}
          onBlur={(event) => onSaveChecklist(checklist.id, { notes: event.target.value })}
          disabled={busy || (!permissions.toolChecklist.canManageAll && !permissions.toolChecklist.canManageJob)}
        />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {permissions.toolChecklist.canManageJob ? <Button type="button" variant="secondary" onClick={() => onSubmitChecklist(checklist.id)} disabled={busy || checklist.status === "submitted" || checklist.status === "reviewed" || checklist.status === "archived"}>Submit checklist</Button> : null}
        {permissions.toolChecklist.canReview ? <Button type="button" variant="secondary" onClick={() => onReviewChecklist(checklist.id)} disabled={busy || checklist.status === "reviewed" || checklist.status === "archived"}>Review checklist</Button> : null}
        {permissions.toolChecklist.canManageAll ? <Button type="button" variant="danger" onClick={() => onArchiveChecklist(checklist.id)} disabled={busy || checklist.status === "archived"}>Archive checklist</Button> : null}
      </div>
    </Card>
  );
}

function ToolChecklistItemsPanelPolished({ checklist, items, permissions, busy, onUpdateChecklistItem }) {
  if (!checklist) {
    return (
      <Card className="co-toolbox-form-card p-4">
        <StateCard title="No checklist selected" description="Choose a checklist to review and update tool items." tone="slate" />
      </Card>
    );
  }

  return (
    <Card className="co-toolbox-form-card p-4">
      <SectionHeader title="Checklist Items" description="Track what is needed, loaded, on site, missing, damaged, or returned." />
      {items.length === 0 ? (
        <StateCard title="No items yet" description="Add the first tool or checklist note to get the crew started." tone="slate" />
      ) : (
        <div className="grid gap-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-[0.9rem] border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-black text-slate-950">{item.name}</p>
                  <p className="mt-1 break-words text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{String(item.category || "other").replaceAll("_", " ")}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge tone={toolChecklistItemStatusTone(item.status)}>{toolChecklistItemStatusLabel(item.status)}</Badge>
                  <Badge tone="slate">Qty {item.quantity}</Badge>
                </div>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {permissions.toolChecklist.canContribute ? (
                  <div className="co-tool-checklist-status-actions md:col-span-2" aria-label={`Quick status for ${item.name}`}>
                    {["loaded", "on_site", "missing", "damaged"].map((statusOption) => (
                      <button
                        key={statusOption}
                        type="button"
                        className={item.status === statusOption ? "is-active" : ""}
                        data-tone={toolChecklistItemStatusTone(statusOption)}
                        onClick={() => onUpdateChecklistItem(checklist.id, item.id, { status: statusOption })}
                        disabled={busy}
                      >
                        {toolChecklistItemStatusLabel(statusOption)}
                      </button>
                    ))}
                  </div>
                ) : null}
                <TextAreaField label="Notes" key={`${item.id}-notes`} defaultValue={item.notes || ""} onBlur={(event) => onUpdateChecklistItem(checklist.id, item.id, { notes: event.target.value })} disabled={busy || !permissions.toolChecklist.canContribute} />
                <div className="grid gap-3">
                  <SelectField label="Status" value={item.status} onChange={(event) => onUpdateChecklistItem(checklist.id, item.id, { status: event.target.value })} disabled={busy || !permissions.toolChecklist.canContribute}>
                    {["needed", "loaded", "on_site", "missing", "damaged", "returned", "not_needed"].map((option) => <option key={option} value={option}>{toolChecklistItemStatusLabel(option)}</option>)}
                  </SelectField>
                  <InputField label="Missing notes" key={`${item.id}-missing`} defaultValue={item.missingNotes || ""} onBlur={(event) => onUpdateChecklistItem(checklist.id, item.id, { missingNotes: event.target.value })} disabled={busy || !permissions.toolChecklist.canContribute} />
                  <InputField label="Damaged notes" key={`${item.id}-damaged`} defaultValue={item.damagedNotes || ""} onBlur={(event) => onUpdateChecklistItem(checklist.id, item.id, { damagedNotes: event.target.value })} disabled={busy || !permissions.toolChecklist.canContribute} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function ToolChecklistAddItemPanelPolished({ canAddItems, checklist, itemDraft, setItemDraft, busy, onAddChecklistItem }) {
  if (!canAddItems || !checklist) {
    return (
      <Card className="co-toolbox-form-card p-4">
        <StateCard title="Add item unavailable" description="Select a checklist with contribution access to add tools or flag issues." tone="slate" />
      </Card>
    );
  }

  return (
    <Card className="co-toolbox-form-card p-4">
      <SectionHeader title="Add Item" description="Add needed tools, materials, consumables, or field notes for the selected checklist." />
      <div className="co-toolbox-form-grid">
        <InputField label="Tool name" value={itemDraft.name} onChange={(event) => setItemDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Power screed" />
        <SelectField label="Category" value={itemDraft.category} onChange={(event) => setItemDraft((current) => ({ ...current, category: event.target.value }))}>
          {["hand_tools", "power_tools", "concrete_finishing", "forms_layout", "safety_ppe", "small_equipment", "consumables", "other"].map((option) => <option key={option} value={option}>{option.replaceAll("_", " ")}</option>)}
        </SelectField>
        <InputField label="Quantity" type="number" min="1" value={itemDraft.quantity} onChange={(event) => setItemDraft((current) => ({ ...current, quantity: event.target.value }))} />
        <SelectField label="Initial status" value={itemDraft.status} onChange={(event) => setItemDraft((current) => ({ ...current, status: event.target.value }))}>
          {["needed", "loaded", "on_site", "missing", "damaged", "returned", "not_needed"].map((option) => <option key={option} value={option}>{toolChecklistItemStatusLabel(option)}</option>)}
        </SelectField>
        <div className="md:col-span-2">
          <TextAreaField label="Notes" value={itemDraft.notes} onChange={(event) => setItemDraft((current) => ({ ...current, notes: event.target.value }))} />
        </div>
        <InputField label="Missing notes" value={itemDraft.missingNotes} onChange={(event) => setItemDraft((current) => ({ ...current, missingNotes: event.target.value }))} />
        <InputField label="Damaged notes" value={itemDraft.damagedNotes} onChange={(event) => setItemDraft((current) => ({ ...current, damagedNotes: event.target.value }))} />
        <div className="md:col-span-2">
          <Button
            type="button"
            className="w-full sm:w-auto"
            onClick={async () => {
              const added = await onAddChecklistItem(checklist.id, itemDraft);
              if (!added) return;
              setItemDraft(INITIAL_TOOL_CHECKLIST_ITEM_FORM);
            }}
            disabled={busy || !itemDraft.name.trim()}
          >
            Add item
          </Button>
        </div>
      </div>
    </Card>
  );
}

function ToolChecklistPagePolished({
  permissions,
  visibleJobs,
  checklistRows,
  filteredRows,
  listState,
  selectedChecklist,
  selectedItems,
  statusFilter,
  setStatusFilter,
  jobFilter,
  setJobFilter,
  foremanFilter,
  setForemanFilter,
  archiveFilter,
  setArchiveFilter,
  issueFilter,
  setIssueFilter,
  search,
  setSearch,
  setSelectedChecklistId,
  checklistDraft,
  setChecklistDraft,
  itemDraft,
  setItemDraft,
  canCreateChecklist,
  canAddItems,
  noFieldJob,
  singleJobId,
  toolChecklistKpis,
  busy,
  onCreateChecklist,
  onSaveChecklist,
  onAddChecklistItem,
  onUpdateChecklistItem,
  onSubmitChecklist,
  onReviewChecklist,
  onArchiveChecklist,
  assistantToolChecklistReviewSeed = null,
  onAssistantToolChecklistReviewSeedHandled = () => {},
}) {
  const [showTools, setShowTools] = useState(false);
  const [toolTab, setToolTab] = useState("items");
  const [showAllMobileChecklists, setShowAllMobileChecklists] = useState(false);
  const toolsRef = useRef(null);
  const statusOptions = ["All", "Draft", "Active", "Submitted", "Reviewed", "Archived"];
  const openIssueCount = filteredRows.reduce((sum, checklist) => sum + Number(checklist.missingItemCount || 0) + Number(checklist.damagedItemCount || 0), 0);
  const toolJobReadiness = useMemo(() => deriveToolChecklistJobReadiness(filteredRows, visibleJobs), [filteredRows, visibleJobs]);
  const isFieldToolChecklist = !permissions.toolChecklist.canManageAll;
  const mobileChecklistPreviewCap = isFieldToolChecklist ? 3 : filteredRows.length;
  const mobileVisibleChecklistCap = showAllMobileChecklists ? filteredRows.length : mobileChecklistPreviewCap;
  const mobileVisibleChecklistCount = Math.min(filteredRows.length, mobileVisibleChecklistCap);

  function clearFilters() {
    setStatusFilter("All");
    setJobFilter("All jobs");
    setForemanFilter("All foremen");
    setArchiveFilter("Active");
    setIssueFilter("All items");
    setSearch("");
    setShowAllMobileChecklists(false);
  }

  function jumpToBoard() {
    setArchiveFilter("Active");
    setShowAllMobileChecklists(false);
    window.setTimeout(() => document.getElementById("tool-checklist-loadout-board")?.scrollIntoView?.({ behavior: "smooth", block: "start" }), 0);
  }

  function openTools(nextTab = "items") {
    setToolTab(nextTab);
    setShowTools(true);
    window.setTimeout(() => {
      toolsRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
      if (window.innerWidth < 768) {
        window.setTimeout(() => window.scrollBy({ top: 130, behavior: "smooth" }), 180);
      }
    }, 0);
  }

  function changeToolTab(nextTab) {
    setToolTab(nextTab);
    window.setTimeout(() => {
      toolsRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
      if (window.innerWidth < 768) {
        window.setTimeout(() => window.scrollBy({ top: 130, behavior: "smooth" }), 180);
      }
    }, 0);
  }

  function openPriorityChecklist(matchChecklist, options = {}) {
    const targetChecklist = filteredRows.find(matchChecklist) || checklistRows.find(matchChecklist);
    if (options.statusFilter) setStatusFilter(options.statusFilter);
    if (options.issueFilter) setIssueFilter(options.issueFilter);
    if (options.archiveFilter) setArchiveFilter(options.archiveFilter);
    if (options.jobFilter) setJobFilter(options.jobFilter);
    if (options.foremanFilter) setForemanFilter(options.foremanFilter);
    if (options.search !== undefined) setSearch(options.search);
    if (targetChecklist?.id) setSelectedChecklistId(targetChecklist.id);
    openTools(options.tool || "items");
  }

  useEffect(() => {
    const seed = assistantToolChecklistReviewSeed;
    if (!seed?.nonce || !(permissions.toolChecklist.canReview || permissions.toolChecklist.canManageAll || permissions.toolChecklist.canManage)) return;

    const activeChecklists = checklistRows.filter((checklist) => !checklist?.archivedAt && String(checklist.status || "").toLowerCase() !== "archived");
    const seededChecklist = seed.checklistId ? activeChecklists.find((checklist) => checklist.id === seed.checklistId) : null;
    const targetChecklist = seededChecklist
      || activeChecklists.find((checklist) => String(checklist.status || "").toLowerCase() === "submitted")
      || activeChecklists.find((checklist) => Number(checklist.missingItemCount || 0) + Number(checklist.damagedItemCount || 0) > 0)
      || activeChecklists[0]
      || null;

    setArchiveFilter("Active");
    setStatusFilter(String(targetChecklist?.status || "").toLowerCase() === "submitted" ? "Submitted" : "All");
    setIssueFilter(Number(targetChecklist?.missingItemCount || 0) + Number(targetChecklist?.damagedItemCount || 0) > 0 ? "Missing or damaged" : "All items");
    setJobFilter("All jobs");
    setForemanFilter("All foremen");
    setSearch("");
    if (targetChecklist?.id) setSelectedChecklistId(targetChecklist.id);
    openTools("detail");
    onAssistantToolChecklistReviewSeedHandled(seed.nonce);
  }, [assistantToolChecklistReviewSeed?.nonce, checklistRows, permissions.toolChecklist.canReview, permissions.toolChecklist.canManageAll, permissions.toolChecklist.canManage]);

  const issueChecklist = filteredRows.find((checklist) => Number(checklist.missingItemCount || 0) + Number(checklist.damagedItemCount || 0) > 0)
    || checklistRows.find((checklist) => Number(checklist.missingItemCount || 0) + Number(checklist.damagedItemCount || 0) > 0);
  const submittedCount = filteredRows.filter((checklist) => String(checklist.status || "").toLowerCase() === "submitted").length;
  const activeWorkCount = filteredRows.filter((checklist) => !["submitted", "reviewed", "archived"].includes(String(checklist.status || "").toLowerCase())).length;
  const reviewLaneLabel = permissions.toolChecklist.canReview ? "Needs review" : "Ready to submit";
  const reviewLaneCount = permissions.toolChecklist.canReview ? submittedCount : activeWorkCount;
  const hasReviewLane = reviewLaneCount > 0;
  const issuePriorityCard = {
    label: "Open tool issues",
    value: openIssueCount,
    helper: openIssueCount ? (permissions.toolChecklist.canReview ? "Missing or damaged items need a crew or office decision." : "Missing or damaged items need a crew or foreman decision.") : "No missing or damaged tools in the current view.",
    icon: "alert",
    tone: openIssueCount ? "amber" : "green",
    actionLabel: openIssueCount ? "Open issues" : "All clear",
    onAction: () => openPriorityChecklist((checklist) => Number(checklist.missingItemCount || 0) + Number(checklist.damagedItemCount || 0) > 0, { issueFilter: openIssueCount ? "Missing or damaged" : "All items", archiveFilter: "Active", tool: "items" }),
  };
  const reviewPriorityCard = {
    label: reviewLaneLabel,
    value: reviewLaneCount,
    helper: permissions.toolChecklist.canReview ? "Submitted checklists are ready for office review." : "Active field loadouts can be finished and submitted.",
    icon: "check",
    tone: reviewLaneCount ? "orange" : "slate",
    actionLabel: hasReviewLane ? (permissions.toolChecklist.canReview ? "Review" : "Submit") : "View board",
    onAction: () => hasReviewLane ? openPriorityChecklist((checklist) => permissions.toolChecklist.canReview ? String(checklist.status || "").toLowerCase() === "submitted" : !["submitted", "reviewed", "archived"].includes(String(checklist.status || "").toLowerCase()), { statusFilter: permissions.toolChecklist.canReview ? "Submitted" : "All", archiveFilter: "Active", tool: "detail" }) : jumpToBoard(),
  };
  const selectedPriorityCard = {
    label: "Selected loadout",
    value: selectedChecklist ? selectedItems.length : 0,
    helper: selectedChecklist ? `${selectedChecklist.title || "Tool checklist"} / ${toolChecklistJobLabel(selectedChecklist)}` : canCreateChecklist ? "Start the first job loadout, then add tools and crew notes." : "Select an assigned checklist when one is available.",
    icon: "clipboard",
    tone: selectedChecklist ? "orange" : "slate",
    actionLabel: selectedChecklist ? "Open items" : (canCreateChecklist ? "Create" : "View board"),
    onAction: () => selectedChecklist ? openPriorityChecklist((checklist) => checklist.id === selectedChecklist?.id || checklist.id === issueChecklist?.id, { tool: "items" }) : (canCreateChecklist ? openTools("create") : jumpToBoard()),
  };
  const createPriorityCard = {
    label: canCreateChecklist ? "Create loadout" : (canAddItems ? "Add tool item" : "Review tools"),
    value: canCreateChecklist || canAddItems ? "Ready" : filteredRows.length,
    helper: canCreateChecklist ? "Start a job-level loadout for visible work." : canAddItems ? "Add missing tools or field notes to the selected checklist." : "Review assigned loadouts without office-only controls.",
    icon: canCreateChecklist || canAddItems ? "plus" : "layers",
    tone: canCreateChecklist || canAddItems ? "orange" : "green",
    actionLabel: canCreateChecklist ? "Create" : (canAddItems ? "Add item" : "Review"),
    onAction: () => openTools(canCreateChecklist ? "create" : (canAddItems ? "add" : "items")),
  };
  const visibleStatusOptions = isFieldToolChecklist ? statusOptions.filter((option) => option !== "Archived") : statusOptions;
  const toolChecklistPriorityCards = filteredRows.length === 0 && canCreateChecklist
    ? [createPriorityCard, issuePriorityCard, reviewPriorityCard, selectedPriorityCard]
    : isFieldToolChecklist && openIssueCount
      ? [issuePriorityCard, selectedPriorityCard, createPriorityCard, reviewPriorityCard]
      : isFieldToolChecklist
        ? [selectedPriorityCard, createPriorityCard, issuePriorityCard, reviewPriorityCard]
    : [issuePriorityCard, reviewPriorityCard, selectedPriorityCard, createPriorityCard];
  const adminMobileToolChecklistQueue = useMemo(() => {
    const activeRows = filteredRows.filter((checklist) => {
      const status = String(checklist.status || "").toLowerCase();
      return !checklist.archivedAt && status !== "archived";
    });

    return [...activeRows].sort((left, right) => {
      const scoreChecklist = (checklist) => {
        const missing = Number(checklist.missingItemCount || 0);
        const damaged = Number(checklist.damagedItemCount || 0);
        const status = String(checklist.status || "").toLowerCase();
        const itemCount = Array.isArray(checklist.items) ? checklist.items.filter((item) => !item.archivedAt).length : 0;
        if (damaged) return 0;
        if (missing) return 1;
        if (status === "submitted") return 2;
        if (!itemCount) return 3;
        if (status === "active") return 4;
        return 5;
      };
      const scoreCompare = scoreChecklist(left) - scoreChecklist(right);
      if (scoreCompare !== 0) return scoreCompare;
      return new Date(toolChecklistUpdatedAt(right) || 0).getTime() - new Date(toolChecklistUpdatedAt(left) || 0).getTime();
    }).slice(0, 3);
  }, [filteredRows]);
  const selectedChecklistIsAdminMobileVisible = Boolean(selectedChecklist?.id && filteredRows.some((checklist) => checklist.id === selectedChecklist.id));
  const adminMobileToolChecklistFocus = selectedChecklistIsAdminMobileVisible ? selectedChecklist : adminMobileToolChecklistQueue[0] || null;
  const adminMobileToolChecklistFocusItems = deriveChecklistItems(adminMobileToolChecklistFocus?.items || [], { includeArchived: permissions.toolChecklist.canManageAll });
  const adminMobileToolChecklistMissingCount = Number(adminMobileToolChecklistFocus?.missingItemCount || 0);
  const adminMobileToolChecklistDamagedCount = Number(adminMobileToolChecklistFocus?.damagedItemCount || 0);
  const adminMobileToolChecklistStatus = String(adminMobileToolChecklistFocus?.status || "").toLowerCase();
  const adminMobileToolChecklistEmptyFocus = Boolean(adminMobileToolChecklistFocus && adminMobileToolChecklistFocusItems.length === 0);
  const adminMobileToolChecklistOpenIssueFocus = adminMobileToolChecklistMissingCount + adminMobileToolChecklistDamagedCount;
  const adminMobileToolChecklistBadge = adminMobileToolChecklistDamagedCount
    ? "Damaged"
    : adminMobileToolChecklistMissingCount
      ? "Missing"
      : adminMobileToolChecklistStatus === "submitted"
        ? "Review"
        : adminMobileToolChecklistEmptyFocus
          ? "Items needed"
          : adminMobileToolChecklistFocus
            ? "Ready"
            : "No loadouts";
  const adminMobileToolChecklistNextAction = adminMobileToolChecklistDamagedCount
    ? "Resolve damaged tools"
    : adminMobileToolChecklistMissingCount
      ? "Resolve missing tools"
      : adminMobileToolChecklistStatus === "submitted"
        ? "Review submitted loadout"
        : adminMobileToolChecklistEmptyFocus
          ? "Add checklist items"
          : adminMobileToolChecklistFocus
            ? "Confirm loadout readiness"
            : canCreateChecklist
              ? "Create the first loadout"
              : "No assigned loadout";
  const adminMobileToolChecklistNextMeta = adminMobileToolChecklistFocus
    ? [
      adminMobileToolChecklistFocus.title || "Tool loadout",
      toolChecklistJobLabel(adminMobileToolChecklistFocus),
      adminMobileToolChecklistOpenIssueFocus
        ? `${adminMobileToolChecklistOpenIssueFocus} open issue${adminMobileToolChecklistOpenIssueFocus === 1 ? "" : "s"}`
        : toolChecklistStatusLabel(adminMobileToolChecklistFocus.status),
    ].filter(Boolean).join(" / ")
    : "Tool loadouts, submissions, and missing or damaged items will appear here.";
  const adminMobileToolChecklistStatusTiles = [
    { label: "Issues", value: openIssueCount, helper: "missing/damaged", tone: openIssueCount ? "amber" : "green" },
    { label: "Review", value: submittedCount, helper: "submitted", tone: submittedCount ? "orange" : "green" },
    { label: "Loads", value: filteredRows.length, helper: "visible", tone: filteredRows.length ? "orange" : "slate" },
  ];

  function selectAdminMobileToolChecklist(checklist = adminMobileToolChecklistFocus || adminMobileToolChecklistQueue[0]) {
    if (checklist?.id) setSelectedChecklistId(checklist.id);
    const hasIssues = Number(checklist?.missingItemCount || 0) + Number(checklist?.damagedItemCount || 0) > 0;
    setArchiveFilter("Active");
    setIssueFilter(hasIssues ? "Missing or damaged" : "All items");
    setStatusFilter("All");
    setJobFilter("All jobs");
    setForemanFilter("All foremen");
    setSearch("");
  }

  function handleAdminMobileToolChecklistPrimaryAction() {
    if (!adminMobileToolChecklistFocus) {
      if (canCreateChecklist) openTools("create");
      return;
    }
    selectAdminMobileToolChecklist(adminMobileToolChecklistFocus);
    if (permissions.toolChecklist.canReview && adminMobileToolChecklistStatus === "submitted") {
      onReviewChecklist(adminMobileToolChecklistFocus.id);
    }
  }

  function handleAdminMobileToolChecklistSecondaryAction() {
    if (!filteredRows.length && canCreateChecklist) {
      openTools("create");
      return;
    }
    clearFilters();
    if (adminMobileToolChecklistQueue[0]?.id) setSelectedChecklistId(adminMobileToolChecklistQueue[0].id);
  }

  const adminMobileToolChecklistPrimaryLabel = !adminMobileToolChecklistFocus
    ? canCreateChecklist ? "New Loadout" : "View Loads"
    : permissions.toolChecklist.canReview && adminMobileToolChecklistStatus === "submitted"
      ? "Review"
      : adminMobileToolChecklistOpenIssueFocus
        ? "Open Issue"
        : "Open Loadout";
  const adminMobileToolChecklistSecondaryLabel = !filteredRows.length && canCreateChecklist ? "New Loadout" : "All Loads";
  const fieldHeaderActions = (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="secondary" onClick={jumpToBoard}>{filteredRows.length} visible</Button>
      {selectedChecklist ? <Button type="button" onClick={() => openTools("items")}>Open Items</Button> : null}
      {canAddItems ? <Button type="button" variant="secondary" onClick={() => openTools("add")}>Add Item</Button> : null}
    </div>
  );
  const officeHeaderActions = (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="secondary" onClick={jumpToBoard}>{filteredRows.length} visible</Button>
      {canCreateChecklist ? <Button type="button" onClick={() => openTools("create")}>Create Checklist</Button> : null}
    </div>
  );

  return (
    <div className={`co-office-page co-toolbox-page co-tool-checklist-page ${permissions.toolChecklist.canManageAll ? "" : "co-field-tool-page"}`} data-field-workspace={isFieldToolChecklist ? "true" : "false"}>
      <PageHeader
        eyebrow={permissions.toolChecklist.canManageAll ? "Office Tools" : "Field Tools"}
        title="Tool Checklist"
        description={permissions.toolChecklist.canManageAll ? "Manage job tool loadouts, review submissions, and keep field issues visible to the office." : "Keep assigned job tools organized, flag missing or damaged items, and submit the checklist without office-only data."}
        actions={isFieldToolChecklist ? fieldHeaderActions : officeHeaderActions}
      />

      {permissions.toolChecklist.canManageAll ? (
        <section className="co-admin-mobile-ops-shell co-admin-mobile-tool-checklist-shell" data-admin-mobile-ops-shell="tool-checklist" aria-label="Admin mobile Tool Checklist command">
          <div className="co-admin-mobile-ops-head">
            <span>Office Tools</span>
            <h1>What needs tool attention?</h1>
            <p>Tool loadout triage for missing gear, damaged gear, submitted checklists, and dispatch readiness.</p>
          </div>

          <div className="co-admin-mobile-next-card" data-tone={adminMobileToolChecklistOpenIssueFocus || adminMobileToolChecklistStatus === "submitted" || adminMobileToolChecklistEmptyFocus ? "amber" : "green"}>
            <div className="co-admin-mobile-next-copy">
              <span>Today / Next Action</span>
              <strong>{adminMobileToolChecklistNextAction}</strong>
              <p>{adminMobileToolChecklistNextMeta}</p>
            </div>
            <Badge tone={adminMobileToolChecklistOpenIssueFocus || adminMobileToolChecklistStatus === "submitted" || adminMobileToolChecklistEmptyFocus ? "amber" : "green"}>{adminMobileToolChecklistBadge}</Badge>
            <div className="co-admin-mobile-primary-actions">
              <Button type="button" onClick={handleAdminMobileToolChecklistPrimaryAction}>{adminMobileToolChecklistPrimaryLabel}</Button>
              <Button type="button" variant="secondary" onClick={handleAdminMobileToolChecklistSecondaryAction}>{adminMobileToolChecklistSecondaryLabel}</Button>
            </div>
          </div>

          <div className="co-admin-mobile-status-tiles" aria-label="Tool checklist status">
            {adminMobileToolChecklistStatusTiles.map((item) => (
              <div key={item.label} className="co-admin-mobile-status-tile" data-tone={item.tone}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <em>{item.helper}</em>
              </div>
            ))}
          </div>

          <section className="co-admin-mobile-queue-panel" aria-label="Top tool checklist queue">
            <div className="co-admin-mobile-panel-head">
              <span>Top 3</span>
              <strong>Tool queue</strong>
              <em>{adminMobileToolChecklistQueue.length ? `${adminMobileToolChecklistQueue.length} shown` : "Clear"}</em>
            </div>
            {adminMobileToolChecklistQueue.length ? (
              <div className="co-admin-mobile-tool-checklist-queue-list">
                {adminMobileToolChecklistQueue.map((checklist) => {
                  const missing = Number(checklist.missingItemCount || 0);
                  const damaged = Number(checklist.damagedItemCount || 0);
                  const status = String(checklist.status || "").toLowerCase();
                  const itemCount = Array.isArray(checklist.items) ? checklist.items.filter((item) => !item.archivedAt).length : 0;
                  const tone = damaged ? "red" : missing || !itemCount ? "amber" : status === "submitted" ? "orange" : "green";
                  const queueStatus = damaged
                    ? `${damaged} damaged`
                    : missing
                      ? `${missing} missing`
                      : !itemCount
                        ? "Items needed"
                        : status === "submitted"
                          ? "Needs review"
                          : toolChecklistStatusLabel(checklist.status);
                  return (
                    <button
                      key={checklist.id}
                      type="button"
                      className={`co-admin-mobile-queue-card ${checklist.id === adminMobileToolChecklistFocus?.id ? "is-selected" : ""}`}
                      data-tone={tone}
                      onClick={() => selectAdminMobileToolChecklist(checklist)}
                    >
                      <span>{queueStatus}</span>
                      <strong>{checklist.title || "Untitled tool checklist"}</strong>
                      <em>{[toolChecklistJobLabel(checklist), toolChecklistForemanLabel(checklist)].filter(Boolean).join(" / ") || "Assigned loadout"}</em>
                      <b>{formatDateTime(toolChecklistUpdatedAt(checklist))}</b>
                    </button>
                  );
                })}
              </div>
            ) : (
              <StateCard title="Tool loadouts clear" description="Missing tools, damaged tools, and submitted loadouts will appear here when they need admin attention." tone="green" />
            )}
          </section>

          <details className="co-admin-mobile-more-drawer">
            <summary>
              <span>More details</span>
              <strong>Visible, damaged, submitted</strong>
              <em>Open only when needed</em>
            </summary>
            <div className="co-admin-mobile-more-grid">
              <span>
                <em>Visible</em>
                <strong>{filteredRows.length}</strong>
                <b>loadouts</b>
              </span>
              <span>
                <em>Damaged</em>
                <strong>{filteredRows.reduce((sum, checklist) => sum + Number(checklist.damagedItemCount || 0), 0)}</strong>
                <b>items</b>
              </span>
              <span>
                <em>Submitted</em>
                <strong>{submittedCount}</strong>
                <b>review</b>
              </span>
            </div>
          </details>
        </section>
      ) : null}

      <ToolChecklistMobileFocusPanel
        checklist={selectedChecklist}
        selectedItems={selectedItems}
        filteredCount={filteredRows.length}
        visibleJobCount={visibleJobs.length}
        openIssueCount={openIssueCount}
        permissions={permissions}
        busy={busy}
        canAddItems={canAddItems}
        canCreateChecklist={canCreateChecklist}
        onOpenTool={openTools}
        onSubmitChecklist={onSubmitChecklist}
        onJumpToBoard={jumpToBoard}
      />

      {isFieldToolChecklist ? (
        <ToolChecklistFieldOperatorPanel
          checklist={selectedChecklist}
          selectedItems={selectedItems}
          filteredRows={filteredRows}
          visibleJobs={visibleJobs}
          permissions={permissions}
          busy={busy}
          onOpenTool={openTools}
          onSubmitChecklist={onSubmitChecklist}
          onJumpToBoard={jumpToBoard}
        />
      ) : null}

      <div className="co-toolbox-kpi-grid mx-auto grid w-full max-w-[1520px] min-w-0 grid-cols-1 gap-3 px-5 pb-3 sm:px-6 md:grid-cols-4 lg:px-6">
        {toolChecklistKpis.map((item) => <CommandCenterKpiCard key={item.label} item={item} />)}
      </div>

      <div className="co-toolbox-priority-grid mx-auto grid w-full max-w-[1520px] min-w-0 gap-3 px-5 pb-3 sm:px-6 md:grid-cols-2 xl:grid-cols-4 lg:px-6">
        {toolChecklistPriorityCards.map((card) => (
          <button key={card.label} type="button" className="co-toolbox-priority-card co-focus-ring" data-tone={card.tone} onClick={card.onAction}>
            <span className="co-toolbox-priority-icon"><Icon name={card.icon} className="h-4 w-4" /></span>
            <span className="min-w-0">
              <span className="co-toolbox-priority-value">{card.value}</span>
              <span className="co-toolbox-priority-label">{card.label}</span>
              <span className="co-toolbox-priority-helper">{card.helper}</span>
            </span>
            <span className="co-toolbox-priority-action">{card.actionLabel} -&gt;</span>
          </button>
        ))}
      </div>

      <div className="co-toolbox-command-layout mx-auto grid w-full max-w-[1520px] min-w-0 gap-3 px-5 pb-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-6">
        <div id="tool-checklist-loadout-board" className="co-tool-checklist-command-main min-w-0">
          <Card className="co-toolbox-main-board overflow-hidden">
            <div className="co-toolbox-board-header border-b border-slate-200 bg-white p-4">
              <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0">
                  <h2 className="text-base font-black uppercase tracking-[0.04em] text-slate-950">{isFieldToolChecklist ? "Loadout Queue" : "Tool Loadout Board"}</h2>
                  <p className="mt-1 text-sm font-bold leading-5 text-slate-600">{isFieldToolChecklist ? "Top assigned loadouts, open issues, and the next tool action." : "Scan job checklists, missing or damaged tools, assigned foremen, and submission status from one dense operator board."}</p>
                </div>
              </div>
            </div>
            <div className="co-toolbox-filter-strip border-b border-slate-200 bg-white p-3">
              <div className="co-toolbox-category-tabs">
                {visibleStatusOptions.map((option) => (
                  <button key={option} type="button" className={statusFilter === option ? "is-active" : ""} onClick={() => setStatusFilter(option)}>
                    {option}
                  </button>
                ))}
              </div>
              <input className="field-input co-toolbox-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search loadout..." />
            </div>
            <details className="co-incidents-advanced-filters border-b border-slate-200 bg-white">
              <summary>
                <span>Advanced filters</span>
                <span>{[jobFilter !== "All jobs" ? "Job" : "", foremanFilter !== "All foremen" ? "Foreman" : "", !isFieldToolChecklist && archiveFilter !== "Active" ? archiveFilter : "", issueFilter !== "All items" ? issueFilter : ""].filter(Boolean).length || "Job, foreman, issue"}</span>
              </summary>
              <div className={`co-office-filter-grid grid gap-3 p-3 ${isFieldToolChecklist ? "md:grid-cols-3" : "md:grid-cols-4"}`}>
                <SelectField label="Job" value={jobFilter} onChange={(event) => setJobFilter(event.target.value)}>
                  {listState.jobOptions.map((option) => <option key={option}>{option}</option>)}
                </SelectField>
                <SelectField label="Foreman" value={foremanFilter} onChange={(event) => setForemanFilter(event.target.value)}>
                  {listState.foremanOptions.map((option) => <option key={option}>{option}</option>)}
                </SelectField>
                {!isFieldToolChecklist ? (
                  <SelectField label="Archived" value={archiveFilter} onChange={(event) => setArchiveFilter(event.target.value)}>
                    {["Active", "Archived", "All"].map((option) => <option key={option}>{option}</option>)}
                  </SelectField>
                ) : null}
                <SelectField label="Issue focus" value={issueFilter} onChange={(event) => setIssueFilter(event.target.value)}>
                  {["All items", "Missing only", "Damaged only", "Missing or damaged"].map((option) => <option key={option}>{option}</option>)}
                </SelectField>
              </div>
            </details>
            {filteredRows.length === 0 ? (
              <div className="p-5"><StateCard title={noFieldJob ? "No assigned job yet" : "No checklists match these filters"} description={noFieldJob ? "Contact office if a checklist should already be on your phone." : checklistRows.length === 0 ? "Create the first job tool checklist to start tracking loadouts." : "Clear a filter or search another job, foreman, checklist, or tool note."} tone="slate" /></div>
            ) : (
              <ToolChecklistTablePolished
                rows={filteredRows}
                selectedId={selectedChecklist?.id}
                onSelect={setSelectedChecklistId}
                onOpenChecklist={(id) => { setSelectedChecklistId(id); openTools("items"); }}
                mobileMaxRows={mobileVisibleChecklistCap}
              />
            )}
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3">
              <p className="text-sm font-bold text-slate-600">
                <span className="hidden lg:inline">Showing {filteredRows.length} checklist{filteredRows.length === 1 ? "" : "s"} / {openIssueCount} open tool issue{openIssueCount === 1 ? "" : "s"}</span>
                <span className="lg:hidden">Showing {mobileVisibleChecklistCount} of {filteredRows.length} checklist{filteredRows.length === 1 ? "" : "s"} / {openIssueCount} open tool issue{openIssueCount === 1 ? "" : "s"}</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {filteredRows.length > mobileChecklistPreviewCap ? (
                  <Button type="button" size="sm" variant="secondary" className="lg:hidden" onClick={() => setShowAllMobileChecklists((current) => !current)}>
                    {showAllMobileChecklists ? "Show fewer" : `Show all ${filteredRows.length}`}
                  </Button>
                ) : null}
                <Button type="button" size="sm" variant="secondary" onClick={clearFilters}>Clear filters</Button>
              </div>
            </div>
          </Card>
          {isFieldToolChecklist ? (
            <div className="co-field-mobile-tool-surface co-tool-checklist-mobile-tool-surface mt-3 lg:hidden">
              <div className="co-field-mobile-section-head">
                <span>
                  <strong>Checklist tools</strong>
                  <em>Update items, add notes, or submit the selected loadout without opening a drawer.</em>
                </span>
              </div>
              <div className="co-field-mobile-tool-tabs" role="tablist" aria-label="Tool checklist tools">
                <button type="button" className={toolTab === "detail" ? "is-active" : ""} onClick={() => changeToolTab("detail")}><Icon name="clipboard" />Detail</button>
                <button type="button" className={toolTab === "items" ? "is-active" : ""} onClick={() => changeToolTab("items")}><Icon name="layers" />Items</button>
                {canAddItems ? <button type="button" className={toolTab === "add" ? "is-active" : ""} onClick={() => changeToolTab("add")}><Icon name="plus" />Add Item</button> : null}
              </div>
              <div className="co-field-mobile-tool-body">
                {toolTab === "add" ? (
                  <ToolChecklistAddItemPanelPolished canAddItems={canAddItems} checklist={selectedChecklist} itemDraft={itemDraft} setItemDraft={setItemDraft} busy={busy} onAddChecklistItem={onAddChecklistItem} />
                ) : toolTab === "detail" ? (
                  <ToolChecklistDetailPanelPolished checklist={selectedChecklist} permissions={permissions} busy={busy} onSaveChecklist={onSaveChecklist} onSubmitChecklist={onSubmitChecklist} onReviewChecklist={onReviewChecklist} onArchiveChecklist={onArchiveChecklist} />
                ) : (
                  <ToolChecklistItemsPanelPolished checklist={selectedChecklist} items={selectedItems} permissions={permissions} busy={busy} onUpdateChecklistItem={onUpdateChecklistItem} />
                )}
              </div>
            </div>
          ) : null}
          <details
            ref={toolsRef}
            className="co-toolbox-tools-drawer mt-3 w-full min-w-0"
            open={showTools}
            onToggle={(event) => setShowTools(event.currentTarget.open)}
          >
            <summary>
              <span>
                <strong>Tool Checklist Tools</strong>
                <em>{isFieldToolChecklist ? "Update selected tool items, add field notes, and submit only when your role allows it." : "Create job loadouts, update selected checklist notes, manage items, and submit or review without changing permissions."}</em>
              </span>
              <span>Open tools</span>
            </summary>
            <div className="co-toolbox-tool-tabs mt-3 flex min-w-0 gap-2 overflow-x-auto pb-1">
              {canCreateChecklist ? <button type="button" className={toolTab === "create" ? "is-active" : ""} onClick={() => changeToolTab("create")}><Icon name="plus" />Create</button> : null}
              <button type="button" className={toolTab === "detail" ? "is-active" : ""} onClick={() => changeToolTab("detail")}><Icon name="clipboard" />Detail</button>
              <button type="button" className={toolTab === "items" ? "is-active" : ""} onClick={() => changeToolTab("items")}><Icon name="layers" />Items</button>
              {canAddItems ? <button type="button" className={toolTab === "add" ? "is-active" : ""} onClick={() => changeToolTab("add")}><Icon name="plus" />Add Item</button> : null}
            </div>
            <div className="co-toolbox-tools-panel mt-3">
              {toolTab === "create" ? (
                <ToolChecklistCreatePanelPolished canCreate={canCreateChecklist} visibleJobs={visibleJobs} checklistDraft={checklistDraft} setChecklistDraft={setChecklistDraft} singleJobId={singleJobId} busy={busy} onCreateChecklist={onCreateChecklist} />
              ) : toolTab === "add" ? (
                <ToolChecklistAddItemPanelPolished canAddItems={canAddItems} checklist={selectedChecklist} itemDraft={itemDraft} setItemDraft={setItemDraft} busy={busy} onAddChecklistItem={onAddChecklistItem} />
              ) : toolTab === "detail" ? (
                <ToolChecklistDetailPanelPolished checklist={selectedChecklist} permissions={permissions} busy={busy} onSaveChecklist={onSaveChecklist} onSubmitChecklist={onSubmitChecklist} onReviewChecklist={onReviewChecklist} onArchiveChecklist={onArchiveChecklist} />
              ) : (
                <ToolChecklistItemsPanelPolished checklist={selectedChecklist} items={selectedItems} permissions={permissions} busy={busy} onUpdateChecklistItem={onUpdateChecklistItem} />
              )}
            </div>
          </details>
        </div>

        {!isFieldToolChecklist ? (
          <ToolChecklistCommandRailPolished checklist={selectedChecklist} selectedItems={selectedItems} jobReadiness={toolJobReadiness} permissions={permissions} busy={busy} onOpenTool={openTools} onSubmitChecklist={onSubmitChecklist} onReviewChecklist={onReviewChecklist} onArchiveChecklist={onArchiveChecklist} />
        ) : null}
      </div>
    </div>
  );
}

export function ToolChecklistPage({
  user,
  jobs,
  toolChecklists,
  permissions,
  companySettings,
  onCreateChecklist,
  onSaveChecklist,
  onAddChecklistItem,
  onUpdateChecklistItem,
  onSubmitChecklist,
  onReviewChecklist,
  onArchiveChecklist,
  assistantToolChecklistReviewSeed = null,
  onAssistantToolChecklistReviewSeedHandled = () => {},
  busy,
}) {
  const [statusFilter, setStatusFilter] = useState("All");
  const [jobFilter, setJobFilter] = useState("All jobs");
  const [foremanFilter, setForemanFilter] = useState("All foremen");
  const [archiveFilter, setArchiveFilter] = useState("Active");
  const [issueFilter, setIssueFilter] = useState("All items");
  const [search, setSearch] = useState("");
  const [selectedChecklistId, setSelectedChecklistId] = useState("");
  const [checklistDraft, setChecklistDraft] = useState(INITIAL_TOOL_CHECKLIST_FORM);
  const [itemDraft, setItemDraft] = useState(INITIAL_TOOL_CHECKLIST_ITEM_FORM);

  const visibleJobs = Array.isArray(jobs) ? jobs.filter((job) => !job.archivedAt) : [];
  const checklistRows = Array.isArray(toolChecklists) ? toolChecklists : [];
  const filteredRows = useMemo(() => filterToolChecklists(checklistRows, {
    status: statusFilter,
    job: jobFilter,
    foreman: foremanFilter,
    archived: archiveFilter,
    missingDamaged: issueFilter,
    search,
  }), [archiveFilter, checklistRows, foremanFilter, issueFilter, jobFilter, search, statusFilter]);
  const listState = useMemo(() => deriveToolChecklistListState(filteredRows, visibleJobs), [filteredRows, visibleJobs]);
  const selectedChecklist = filteredRows.find((checklist) => checklist.id === selectedChecklistId) || filteredRows[0] || checklistRows.find((checklist) => checklist.id === selectedChecklistId) || null;
  const selectedItems = deriveChecklistItems(selectedChecklist?.items || [], { includeArchived: permissions.toolChecklist.canManageAll });
  const singleJobId = visibleJobs.length === 1 ? visibleJobs[0].id : "";

  useEffect(() => {
    if (!selectedChecklistId && filteredRows[0]?.id) {
      setSelectedChecklistId(filteredRows[0].id);
    }
  }, [filteredRows, selectedChecklistId]);

  useEffect(() => {
    if (singleJobId && !checklistDraft.jobId) {
      setChecklistDraft((current) => ({ ...current, jobId: singleJobId }));
    }
  }, [singleJobId, checklistDraft.jobId]);

  const canCreateChecklist = permissions.toolChecklist.canManage;
  const canAddItems = permissions.toolChecklist.canContribute && Boolean(selectedChecklist);
  const noFieldJob = !permissions.toolChecklist.canManageAll && visibleJobs.length === 0;
  const toolChecklistKpis = [
    { label: "Visible Checklists", value: filteredRows.length, helper: "Current tool board", icon: "clipboard" },
    { label: "Submitted", value: filteredRows.filter((checklist) => checklist.status === "submitted").length, helper: "Waiting office review", icon: "upload" },
    { label: "Missing Items", value: filteredRows.reduce((sum, checklist) => sum + Number(checklist.missingItemCount || 0), 0), helper: "Items not on hand", icon: "alert" },
    { label: "Damaged Items", value: filteredRows.reduce((sum, checklist) => sum + Number(checklist.damagedItemCount || 0), 0), helper: "Needs replacement", icon: "refresh" },
  ];

  if (!permissions.toolChecklist.canUse && !permissions.toolChecklist.canManageAll) {
    return (
      <div>
        <PageHeader eyebrow="Field Tools" title="Tool Checklist" description="This module is currently disabled for field roles." />
        <div className="px-5 sm:px-6 lg:px-8">
          <StateCard title="Tool Checklist is off" description="The office can re-enable this module in Settings without deleting saved checklist data." tone="slate" />
        </div>
      </div>
    );
  }

  return (
    <ToolChecklistPagePolished
      permissions={permissions}
      visibleJobs={visibleJobs}
      checklistRows={checklistRows}
      filteredRows={filteredRows}
      listState={listState}
      selectedChecklist={selectedChecklist}
      selectedItems={selectedItems}
      statusFilter={statusFilter}
      setStatusFilter={setStatusFilter}
      jobFilter={jobFilter}
      setJobFilter={setJobFilter}
      foremanFilter={foremanFilter}
      setForemanFilter={setForemanFilter}
      archiveFilter={archiveFilter}
      setArchiveFilter={setArchiveFilter}
      issueFilter={issueFilter}
      setIssueFilter={setIssueFilter}
      search={search}
      setSearch={setSearch}
      setSelectedChecklistId={setSelectedChecklistId}
      checklistDraft={checklistDraft}
      setChecklistDraft={setChecklistDraft}
      itemDraft={itemDraft}
      setItemDraft={setItemDraft}
      canCreateChecklist={canCreateChecklist}
      canAddItems={canAddItems}
      noFieldJob={noFieldJob}
      singleJobId={singleJobId}
      toolChecklistKpis={toolChecklistKpis}
      busy={busy}
      onCreateChecklist={onCreateChecklist}
      onSaveChecklist={onSaveChecklist}
      onAddChecklistItem={onAddChecklistItem}
      onUpdateChecklistItem={onUpdateChecklistItem}
      onSubmitChecklist={onSubmitChecklist}
      onReviewChecklist={onReviewChecklist}
      onArchiveChecklist={onArchiveChecklist}
      assistantToolChecklistReviewSeed={assistantToolChecklistReviewSeed}
      onAssistantToolChecklistReviewSeedHandled={onAssistantToolChecklistReviewSeedHandled}
    />
  );

  return (
    <div>
      <PageHeader eyebrow="Field Tools" title="Tool Checklist" description={permissions.toolChecklist.canManageAll ? "Manage job checklists, review submissions, and keep field tool status visible to the office." : "Keep job tools organized, flag missing or damaged items, and submit the field checklist without exposing office-only data."} />
      <ModuleKpiStrip items={toolChecklistKpis} />
      <div className="grid min-w-0 gap-4 px-5 sm:px-6 lg:grid-cols-[340px_minmax(0,1fr)] lg:px-8">
        <div className="min-w-0 space-y-4">
          <Card className="p-4">
            <SectionHeader title="Filters" description="Keep the checklist list scoped to the work you need right now." />
            <div className="grid gap-3">
              <SelectField label="Status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                {["All", "Draft", "Active", "Submitted", "Reviewed", "Archived"].map((option) => <option key={option}>{option}</option>)}
              </SelectField>
              <SelectField label="Job" value={jobFilter} onChange={(event) => setJobFilter(event.target.value)}>
                {listState.jobOptions.map((option) => <option key={option}>{option}</option>)}
              </SelectField>
              <SelectField label="Foreman" value={foremanFilter} onChange={(event) => setForemanFilter(event.target.value)}>
                {listState.foremanOptions.map((option) => <option key={option}>{option}</option>)}
              </SelectField>
              <SelectField label="Archived" value={archiveFilter} onChange={(event) => setArchiveFilter(event.target.value)}>
                {["Active", "Archived", "All"].map((option) => <option key={option}>{option}</option>)}
              </SelectField>
              <SelectField label="Issue focus" value={issueFilter} onChange={(event) => setIssueFilter(event.target.value)}>
                {["All items", "Missing only", "Damaged only", "Missing or damaged"].map((option) => <option key={option}>{option}</option>)}
              </SelectField>
              <InputField label="Search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search checklists or tool notes..." />
            </div>
          </Card>
          <Card className="p-4">
            <SectionHeader title="Checklist list" description={`${filteredRows.length} visible checklist${filteredRows.length === 1 ? "" : "s"}.`} />
            {filteredRows.length === 0 ? (
              <StateCard title={noFieldJob ? "No assigned job yet" : "No checklists match these filters"} description={noFieldJob ? "Contact office if a checklist should already be on your phone." : "Clear a filter or create a checklist for the job."} tone="slate" />
            ) : (
              <div className="space-y-3">
                {filteredRows.map((checklist) => (
                  <button
                    key={checklist.id}
                    type="button"
                    onClick={() => setSelectedChecklistId(checklist.id)}
                    className={`w-full rounded-3xl border p-4 text-left transition ${selectedChecklist?.id === checklist.id ? "border-blue-300 bg-blue-50/80 shadow-panel" : "border-blue-100 bg-white hover:border-blue-200 hover:bg-blue-50/50"}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-black text-slate-950">{checklist.title}</p>
                        <p className="mt-1 break-words text-xs font-bold text-slate-500">{checklist.job?.title || "General checklist"} Â· {checklist.job?.customer || "Field work"}</p>
                      </div>
                      <StatusBadge status={toolChecklistStatusLabel(checklist.status)} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {checklist.missingItemCount ? <Badge tone="amber">{checklist.missingItemCount} missing</Badge> : null}
                      {checklist.damagedItemCount ? <Badge tone="red">{checklist.damagedItemCount} damaged</Badge> : null}
                      <Badge tone="slate">{checklist.items?.length || 0} items</Badge>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>
        <div className="min-w-0 space-y-4">
          {canCreateChecklist ? (
            <Card className="p-4">
              <SectionHeader title="Create checklist" description="Start with a job-level checklist for the crew." />
              <div className="grid gap-3 md:grid-cols-2">
                <SelectField label="Job" value={checklistDraft.jobId} onChange={(event) => setChecklistDraft((current) => ({ ...current, jobId: event.target.value }))}>
                  <option value="">Select a job</option>
                  {visibleJobs.map((job) => <option key={job.id} value={job.id}>{jobTitle(job)}</option>)}
                </SelectField>
                <InputField label="Title" value={checklistDraft.title} onChange={(event) => setChecklistDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Pour day loadout" />
              </div>
              <div className="mt-3">
                <TextAreaField label="Notes" value={checklistDraft.notes} onChange={(event) => setChecklistDraft((current) => ({ ...current, notes: event.target.value }))} placeholder="What should the crew prep before leaving the yard?" />
              </div>
              <div className="mt-4">
                <Button
                  type="button"
                  onClick={async () => {
                    const created = await onCreateChecklist(checklistDraft);
                    if (!created) return;
                    setChecklistDraft({ ...INITIAL_TOOL_CHECKLIST_FORM, jobId: singleJobId });
                  }}
                  disabled={busy || !checklistDraft.jobId || !checklistDraft.title.trim()}
                >
                  Create checklist
                </Button>
              </div>
            </Card>
          ) : null}

          {selectedChecklist ? (
            <Card className="p-4">
              <SectionHeader
                title={selectedChecklist.title}
                description={`${selectedChecklist.job?.title || "General checklist"} Â· ${selectedChecklist.job?.customer || "Field work"}`}
                action={<StatusBadge status={toolChecklistStatusLabel(selectedChecklist.status)} />}
              />
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-3 text-sm text-slate-600">
                  <p><span className="font-black text-slate-950">Foreman:</span> {selectedChecklist.job?.foremanAssignment?.userName || "Unassigned"}</p>
                  <p className="mt-1"><span className="font-black text-slate-950">Updated:</span> {formatDateTime(selectedChecklist.updatedAt)}</p>
                </div>
                <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-3 text-sm text-slate-600">
                  <p><span className="font-black text-slate-950">Missing:</span> {selectedChecklist.missingItemCount}</p>
                  <p className="mt-1"><span className="font-black text-slate-950">Damaged:</span> {selectedChecklist.damagedItemCount}</p>
                </div>
              </div>
              <div className="mt-3">
                <TextAreaField
                  label="Checklist notes"
                  key={`${selectedChecklist.id}-notes`}
                  defaultValue={selectedChecklist.notes || ""}
                  onBlur={(event) => onSaveChecklist(selectedChecklist.id, { notes: event.target.value })}
                  disabled={busy || (!permissions.toolChecklist.canManageAll && !permissions.toolChecklist.canManageJob)}
                />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {permissions.toolChecklist.canManageJob ? <Button type="button" variant="secondary" onClick={() => onSubmitChecklist(selectedChecklist.id)} disabled={busy || selectedChecklist.status === "submitted" || selectedChecklist.status === "reviewed" || selectedChecklist.status === "archived"}>Submit checklist</Button> : null}
                {permissions.toolChecklist.canReview ? <Button type="button" variant="secondary" onClick={() => onReviewChecklist(selectedChecklist.id)} disabled={busy || selectedChecklist.status === "reviewed" || selectedChecklist.status === "archived"}>Review checklist</Button> : null}
                {permissions.toolChecklist.canManageAll ? <Button type="button" variant="danger" onClick={() => onArchiveChecklist(selectedChecklist.id)} disabled={busy || selectedChecklist.status === "archived"}>Archive checklist</Button> : null}
              </div>
            </Card>
          ) : null}

          {selectedChecklist ? (
            <Card className="p-4">
              <SectionHeader title="Checklist items" description="Track what the crew needs, what is loaded, and what needs attention." />
              {selectedItems.length === 0 ? (
                <StateCard title="No items yet" description="Add the first tool or checklist note to get the crew started." tone="slate" />
              ) : (
                <div className="space-y-3">
                  {selectedItems.map((item) => (
                    <div key={item.id} className="rounded-3xl border border-blue-100 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-black text-slate-950">{item.name}</p>
                          <p className="mt-1 break-words text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{item.category.replaceAll("_", " ")}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <StatusBadge status={toolChecklistItemStatusLabel(item.status)} />
                          <Badge tone="slate">Qty {item.quantity}</Badge>
                        </div>
                      </div>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <TextAreaField label="Notes" key={`${item.id}-notes`} defaultValue={item.notes || ""} onBlur={(event) => onUpdateChecklistItem(selectedChecklist.id, item.id, { notes: event.target.value })} disabled={busy || !permissions.toolChecklist.canContribute} />
                        <div className="grid gap-3">
                          <SelectField label="Status" value={item.status} onChange={(event) => onUpdateChecklistItem(selectedChecklist.id, item.id, { status: event.target.value })} disabled={busy || !permissions.toolChecklist.canContribute}>
                            {["needed", "loaded", "on_site", "missing", "damaged", "returned", "not_needed"].map((option) => <option key={option} value={option}>{toolChecklistItemStatusLabel(option)}</option>)}
                          </SelectField>
                          <InputField label="Missing notes" key={`${item.id}-missing`} defaultValue={item.missingNotes || ""} onBlur={(event) => onUpdateChecklistItem(selectedChecklist.id, item.id, { missingNotes: event.target.value })} disabled={busy || !permissions.toolChecklist.canContribute} />
                          <InputField label="Damaged notes" key={`${item.id}-damaged`} defaultValue={item.damagedNotes || ""} onBlur={(event) => onUpdateChecklistItem(selectedChecklist.id, item.id, { damagedNotes: event.target.value })} disabled={busy || !permissions.toolChecklist.canContribute} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ) : null}

          {canAddItems ? (
            <Card className="p-4">
              <SectionHeader title="Add item" description="Employees can add needed tools or flag missing and damaged items. Foremen and office roles can add the full checklist." />
              <div className="grid gap-3 md:grid-cols-2">
                <InputField label="Tool name" value={itemDraft.name} onChange={(event) => setItemDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Power screed" />
                <SelectField label="Category" value={itemDraft.category} onChange={(event) => setItemDraft((current) => ({ ...current, category: event.target.value }))}>
                  {["hand_tools", "power_tools", "concrete_finishing", "forms_layout", "safety_ppe", "small_equipment", "consumables", "other"].map((option) => <option key={option} value={option}>{option.replaceAll("_", " ")}</option>)}
                </SelectField>
                <InputField label="Quantity" type="number" min="1" value={itemDraft.quantity} onChange={(event) => setItemDraft((current) => ({ ...current, quantity: event.target.value }))} />
                <SelectField label="Initial status" value={itemDraft.status} onChange={(event) => setItemDraft((current) => ({ ...current, status: event.target.value }))}>
                  {["needed", "loaded", "on_site", "missing", "damaged", "returned", "not_needed"].map((option) => <option key={option} value={option}>{toolChecklistItemStatusLabel(option)}</option>)}
                </SelectField>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <TextAreaField label="Notes" value={itemDraft.notes} onChange={(event) => setItemDraft((current) => ({ ...current, notes: event.target.value }))} />
                <div className="grid gap-3">
                  <InputField label="Missing notes" value={itemDraft.missingNotes} onChange={(event) => setItemDraft((current) => ({ ...current, missingNotes: event.target.value }))} />
                  <InputField label="Damaged notes" value={itemDraft.damagedNotes} onChange={(event) => setItemDraft((current) => ({ ...current, damagedNotes: event.target.value }))} />
                </div>
              </div>
              <div className="mt-4">
                <Button
                  type="button"
                  onClick={async () => {
                    const added = await onAddChecklistItem(selectedChecklist.id, itemDraft);
                    if (!added) return;
                    setItemDraft(INITIAL_TOOL_CHECKLIST_ITEM_FORM);
                  }}
                  disabled={busy || !itemDraft.name.trim()}
                >
                  Add item
                </Button>
              </div>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
