import { useEffect, useMemo, useState } from "react";

import { AssistantRail, Badge, Button, Card, Icon, InputField, PageHeader, SectionHeader, SelectField, StateCard, TextAreaField } from "./app-shell-components";
import { SUPPORT_DRAFT_SESSION_KEY } from "./app-runtime-constants";
import { ModuleKpiStrip } from "./command-center-route-components";
import { deriveAcknowledgmentState, deriveActivePpeItems, deriveSafetyIncidentListState, deriveSafetyJobCloseoutReadiness, deriveSafetyWorkspaceJobs, deriveVisibleSafetyPolicies, filterSafetyIncidents } from "./safety-utils";

const INITIAL_SAFETY_POLICY_FORM = {
  title: "",
  body: "",
  category: "PPE",
};

const INITIAL_PPE_ITEM_FORM = {
  label: "",
  description: "",
  requiredByDefault: true,
};

const INITIAL_SAFETY_ACK_FORM = {
  jobId: "",
  policyId: "",
  notes: "",
};

const INITIAL_SAFETY_INCIDENT_FORM = {
  jobId: "",
  type: "concern",
  severity: "low",
  title: "",
  description: "",
  immediateAction: "",
};

function formatDateTime(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}
function safetySeverityTone(severity = "low") {
  const normalized = String(severity || "").toLowerCase();
  if (normalized === "critical" || normalized === "high") return "red";
  if (normalized === "medium") return "amber";
  if (normalized === "resolved") return "green";
  return "slate";
}

function safetyIncidentTypeLabel(type = "concern") {
  return String(type || "concern").replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function safetyIncidentStatusTone(status = "open") {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "resolved") return "green";
  if (normalized === "reviewed") return "blue";
  if (normalized === "archived") return "slate";
  return "amber";
}

function safetyIncidentJobLabel(incident) {
  return incident?.job?.title || "General safety concern";
}

function safetyIncidentReporterLabel(incident) {
  return incident?.submittedByName || "Reporter pending";
}

function safetyIncidentPrimaryDate(incident) {
  return incident?.createdAt || incident?.updatedAt || incident?.reviewedAt || incident?.resolvedAt;
}

function SafetyIncidentsTablePolished({ rows, selectedId, onSelect, onOpenDetails, mobileMaxRows = null }) {
  const mobileRows = mobileMaxRows ? rows.slice(0, mobileMaxRows) : rows;

  return (
    <>
      <div className="co-incidents-mobile-list grid gap-3 p-3 lg:hidden">
        {mobileRows.map((incident) => {
          const selected = incident.id === selectedId;

          return (
            <article
              key={incident.id}
              className={`co-incidents-mobile-card co-mobile-record-card w-full rounded-[1.05rem] border p-4 text-left transition ${selected ? "is-selected border-orange-200 bg-orange-50/75" : "border-slate-200 bg-white hover:border-orange-200 hover:bg-orange-50/35"}`}
            >
              <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="break-words text-base font-black text-slate-950">{incident.title || "Untitled safety item"}</p>
                  <p className="mt-1 break-words text-xs font-bold text-slate-500">{safetyIncidentJobLabel(incident)} / {safetyIncidentReporterLabel(incident)}</p>
                </div>
                <Badge tone={safetyIncidentStatusTone(incident.status)}>{incident.statusLabel || incident.status || "Open"}</Badge>
              </div>
              <div className="co-incidents-mobile-metrics">
                <span>Type <strong>{safetyIncidentTypeLabel(incident.type)}</strong></span>
                <span>Severity <strong>{incident.severity || "low"}</strong></span>
                <span>Created <strong>{formatDateTime(safetyIncidentPrimaryDate(incident)) || "Not set"}</strong></span>
              </div>
              <button type="button" className="co-incidents-mobile-card-action" onClick={() => { onSelect(incident.id); onOpenDetails?.(incident.id); }}>
                Open incident
              </button>
            </article>
          );
        })}
      </div>
      <div className="co-incidents-list-scroll hidden min-w-0 overflow-auto lg:block">
        <table className="co-incidents-command-table w-full min-w-[960px] text-left">
          <thead>
            <tr>
              <th>Incident / Job</th>
              <th>Status</th>
              <th>Severity</th>
              <th>Type</th>
              <th>Submitted By</th>
              <th>Created</th>
              <th>Open</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((incident) => {
              const selected = incident.id === selectedId;

              return (
                <tr key={incident.id} onClick={() => onSelect(incident.id)} className={`cursor-pointer transition hover:bg-orange-50/45 ${selected ? "bg-orange-50/70" : ""}`}>
                  <td>
                    <p className="font-black text-slate-950">{incident.title || "Untitled safety item"}</p>
                    <p className="text-xs font-bold text-slate-500">{safetyIncidentJobLabel(incident)}</p>
                  </td>
                  <td><Badge tone={safetyIncidentStatusTone(incident.status)}>{incident.statusLabel || incident.status || "Open"}</Badge></td>
                  <td><Badge tone={safetySeverityTone(incident.severity)}>{incident.severity || "low"}</Badge></td>
                  <td className="font-bold text-slate-700">{safetyIncidentTypeLabel(incident.type)}</td>
                  <td className="font-bold text-slate-700">{safetyIncidentReporterLabel(incident)}</td>
                  <td className="font-bold text-slate-700">{formatDateTime(safetyIncidentPrimaryDate(incident))}</td>
                  <td>
                    <button type="button" className="co-incidents-icon-button" onClick={(event) => { event.stopPropagation(); onSelect(incident.id); onOpenDetails?.(incident.id); }} aria-label={`Open incident ${incident.title || incident.id}`}>
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

function SafetyCloseoutReadinessCard({ readiness }) {
  if (!readiness) return null;

  return (
    <Card className="co-incidents-rail-card p-4">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-orange-700">Safety closeout</p>
          <h3 className="mt-2 text-base font-black leading-tight text-slate-950">{readiness.status}</h3>
          <p className="mt-1 text-xs font-bold leading-5 text-slate-600">{readiness.nextAction} before the job is treated as closeout-ready.</p>
        </div>
        <Badge tone={readiness.tone}>{readiness.blockedJobs} jobs</Badge>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-slate-200 bg-white p-2">
          <span className="block text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Open</span>
          <strong className="mt-1 block text-sm font-black text-slate-950">{readiness.openCount}</strong>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-2">
          <span className="block text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Severe</span>
          <strong className="mt-1 block text-sm font-black text-slate-950">{readiness.highSeverityCount}</strong>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-2">
          <span className="block text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">General</span>
          <strong className="mt-1 block text-sm font-black text-slate-950">{readiness.generalOpen}</strong>
        </div>
      </div>
      <div className="mt-3 grid gap-2">
        {readiness.topJobs.length ? readiness.topJobs.map((job) => (
          <div key={job.jobId} className="rounded-xl border border-slate-200 bg-white p-2.5">
            <div className="flex min-w-0 items-center justify-between gap-2">
              <p className="min-w-0 truncate text-xs font-black text-slate-900">{job.label}</p>
              <Badge tone={job.tone}>{job.openCount} open</Badge>
            </div>
            <p className="mt-1 text-[11px] font-bold leading-4 text-slate-600">
              {job.blockers.slice(0, 2).join(" / ")}
            </p>
          </div>
        )) : (
          <StateCard title="Safety clear" description="No visible unresolved safety incident is blocking closeout." tone="green" />
        )}
      </div>
      <p className="mt-3 text-[11px] font-bold leading-5 text-slate-500">
        Review-only. This does not notify customers, change job status, or create safety automation.
      </p>
    </Card>
  );
}

function SafetyIncidentCommandRailPolished({ incident, closeoutReadiness, canSubmit, canReview, isOfficeWorkspace, busy, onOpenTool, onReview, onResolve, onArchive }) {
  const railClassName = `co-incidents-right-rail space-y-4${isOfficeWorkspace ? " co-incidents-office-assistant" : ""}`;
  const assistantPriorities = incident ? [
    {
      label: ["high", "critical"].includes(String(incident.severity || "").toLowerCase())
        ? `${incident.severity} severity needs clear follow-up`
        : `${incident.severity || "low"} severity in the response board`,
      tone: ["high", "critical"].includes(String(incident.severity || "").toLowerCase()) ? "warn" : "default",
    },
    {
      label: incident.immediateAction ? "Immediate action is logged" : "Immediate action still needs detail",
      tone: incident.immediateAction ? "ready" : "warn",
    },
    {
      label: ["reviewed", "resolved", "archived"].includes(String(incident.status || ""))
        ? `${incident.statusLabel || incident.status} safety loop`
        : "Office follow-up still open",
      tone: ["reviewed", "resolved", "archived"].includes(String(incident.status || "")) ? "ready" : "warn",
    },
  ] : [
    { label: "Select an incident to load response context", tone: "default" },
    { label: "Keep severity, action, and reviewer context together", tone: "warn" },
    { label: "Submit field-safe safety items from visible jobs", tone: "default" },
  ];
  const assistantActions = [
    { label: incident ? "Open incident details" : "Prepare details", icon: "alert", onClick: () => onOpenTool("detail"), show: true },
    { label: "Submit incident", icon: "plus", onClick: () => onOpenTool("submit"), show: Boolean(canSubmit) },
    { label: "Review response", icon: "clipboard", onClick: () => onOpenTool("detail"), show: Boolean(incident && canReview) },
  ].filter((item) => item.show);

  if (!incident) {
    return (
      <div className={railClassName}>
        {isOfficeWorkspace ? (
          <Card className="co-prepour-assistant-card p-0">
            <div className="co-prepour-assistant-topbar">
              <span><Icon name="spark" /></span>
              <strong>Apex Assistant</strong>
              <em>Safety</em>
            </div>
            <div className="co-prepour-assistant-body">
              <p className="co-prepour-assistant-kicker">Safety command</p>
              <h3>Select a safety item before follow-up.</h3>
              <p>Load severity, job, reporter, immediate action, and the next response step in one place.</p>
              <div className="co-prepour-assistant-priorities">
                {assistantPriorities.map((item) => <span key={item.label} data-tone={item.tone}>{item.label}</span>)}
              </div>
              <div className="co-prepour-assistant-actions">
                {assistantActions.map((item) => (
                  <button key={item.label} type="button" onClick={item.onClick}>
                    <Icon name={item.icon} />
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </Card>
        ) : null}
        <SafetyCloseoutReadinessCard readiness={closeoutReadiness} />
        <Card className="co-incidents-rail-card p-4">
          <SectionHeader title="Incident Console" description="Select a safety item or submit a new field concern." />
          <div className="co-incidents-empty-rail">
            <span><Icon name="alert" /></span>
            <strong>No incident selected</strong>
            <p>Safety submissions show job, reporter, severity, status, and immediate action here without payroll, pricing, or office-only data.</p>
          </div>
          {canSubmit ? <Button type="button" className="mt-3 w-full" onClick={() => onOpenTool("submit")}>Submit Incident</Button> : null}
        </Card>
      </div>
    );
  }

  const canMarkReview = canReview && !["reviewed", "resolved", "archived"].includes(String(incident.status || ""));
  const canResolve = canReview && !["resolved", "archived"].includes(String(incident.status || ""));

  return (
    <div className={railClassName}>
      {isOfficeWorkspace ? (
        <Card className="co-prepour-assistant-card p-0">
          <div className="co-prepour-assistant-topbar">
            <span><Icon name="spark" /></span>
            <strong>Apex Assistant</strong>
            <em>Safety</em>
          </div>
          <div className="co-prepour-assistant-body">
            <p className="co-prepour-assistant-kicker">Safety command</p>
            <h3>{incident.title || "Selected safety item"}</h3>
            <p>{safetyIncidentJobLabel(incident)} / {safetyIncidentReporterLabel(incident)} / {formatDateTime(safetyIncidentPrimaryDate(incident)) || "No date"}</p>
            <div className="co-prepour-assistant-priorities">
              {assistantPriorities.map((item) => <span key={item.label} data-tone={item.tone}>{item.label}</span>)}
            </div>
            <div className="co-prepour-assistant-actions">
              {assistantActions.map((item) => (
                <button key={item.label} type="button" onClick={item.onClick}>
                  <Icon name={item.icon} />
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </Card>
      ) : null}
      <SafetyCloseoutReadinessCard readiness={closeoutReadiness} />
      <Card className="co-incidents-rail-card p-4">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Selected incident</p>
            <h3 className="mt-2 break-words text-xl font-black leading-tight text-slate-950">{incident.title || "Untitled safety item"}</h3>
            <p className="mt-1 break-words text-xs font-black text-slate-500">{safetyIncidentJobLabel(incident)} / {safetyIncidentReporterLabel(incident)}</p>
          </div>
          <Badge tone={safetySeverityTone(incident.severity)}>{incident.severity || "low"}</Badge>
        </div>

        <div className="co-incidents-selected-metrics">
          <div>
            <span>Status</span>
            <strong>{incident.statusLabel || incident.status || "Open"}</strong>
          </div>
          <div>
            <span>Type</span>
            <strong>{safetyIncidentTypeLabel(incident.type)}</strong>
          </div>
          <div>
            <span>Submitted</span>
            <strong>{formatDateTime(safetyIncidentPrimaryDate(incident)) || "Not set"}</strong>
          </div>
          <div>
            <span>Reporter</span>
            <strong>{safetyIncidentReporterLabel(incident)}</strong>
          </div>
        </div>

        <div className="co-incidents-note-panel">
          <span>Description</span>
          <p>{incident.description || "No incident description provided."}</p>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button type="button" size="sm" onClick={() => onOpenTool("detail")}>{canReview ? "Review" : "Details"}</Button>
          {canSubmit ? <Button type="button" size="sm" variant="secondary" onClick={() => onOpenTool("submit")}>Submit New</Button> : null}
          {canReview ? <Button type="button" size="sm" variant="secondary" onClick={() => onReview(incident.id)} disabled={busy || !canMarkReview}>Mark reviewed</Button> : null}
          {canReview ? <Button type="button" size="sm" onClick={() => onResolve(incident.id)} disabled={busy || !canResolve}>Resolve</Button> : null}
        </div>
      </Card>

      <Card className="co-incidents-rail-card p-4">
        <SectionHeader title="Follow-Up Checks" description="A complete record helps the office close the safety loop." />
        <div className="co-incidents-readiness-list">
          <span data-state={incident.title ? "ready" : "needs"}>Title <strong>{incident.title ? "Set" : "Needed"}</strong></span>
          <span data-state={incident.description ? "ready" : "needs"}>Description <strong>{incident.description ? "Set" : "Needed"}</strong></span>
          <span data-state={incident.immediateAction ? "ready" : "needs"}>Immediate action <strong>{incident.immediateAction ? "Logged" : "Needed"}</strong></span>
          <span data-state={["reviewed", "resolved", "archived"].includes(String(incident.status || "")) ? "ready" : "needs"}>Follow-up <strong>{incident.statusLabel || "Open"}</strong></span>
        </div>
      </Card>
    </div>
  );
}

function SafetyIncidentSubmitPanelPolished({ canSubmit, allowedJobs, incidentDraft, setIncidentDraft, busy, onSubmit }) {
  if (!canSubmit) {
    return (
      <Card className="co-incidents-form-card p-4">
        <StateCard title="Submit unavailable" description="This role can review visible safety information but cannot submit incidents." tone="slate" />
      </Card>
    );
  }

  return (
    <Card className="co-incidents-form-card p-4">
      <SectionHeader title="Submit Safety Item" description={allowedJobs.length === 0 ? "Submit a general safety concern when no assigned job is available." : "Job options stay scoped to work this user is allowed to see."} />
      <form className="co-incidents-form-grid" onSubmit={onSubmit}>
        <SelectField label="Job" value={incidentDraft.jobId} onChange={(event) => setIncidentDraft((current) => ({ ...current, jobId: event.target.value }))}>
          <option value="">General safety concern</option>
          {allowedJobs.map((job) => <option key={job.id} value={job.id}>{job.label}</option>)}
        </SelectField>
        <SelectField label="Type" value={incidentDraft.type} onChange={(event) => setIncidentDraft((current) => ({ ...current, type: event.target.value }))}>
          <option value="concern">Concern</option>
          <option value="hazard">Hazard</option>
          <option value="near_miss">Near miss</option>
          <option value="injury">Injury</option>
          <option value="property_damage">Property damage</option>
          <option value="other">Other</option>
        </SelectField>
        <SelectField label="Severity" value={incidentDraft.severity} onChange={(event) => setIncidentDraft((current) => ({ ...current, severity: event.target.value }))}>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </SelectField>
        <InputField label="Title" value={incidentDraft.title} onChange={(event) => setIncidentDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Wet slab edge, exposed rebar, blocked access..." />
        <div className="md:col-span-2">
          <TextAreaField label="Description" value={incidentDraft.description} onChange={(event) => setIncidentDraft((current) => ({ ...current, description: event.target.value }))} placeholder="What happened, where it was, and what the crew should know next." />
        </div>
        <div className="md:col-span-2">
          <TextAreaField label="Immediate action" value={incidentDraft.immediateAction} onChange={(event) => setIncidentDraft((current) => ({ ...current, immediateAction: event.target.value }))} placeholder="Stopped work, taped off area, called foreman, moved material..." />
        </div>
        <div className="md:col-span-2">
          <Button type="submit" disabled={busy || !incidentDraft.title || !incidentDraft.description}>Submit safety item</Button>
        </div>
      </form>
    </Card>
  );
}

function SafetyIncidentDetailPanelPolished({ incident, canReview, busy, onReview, onResolve, onArchive }) {
  if (!incident) {
    return (
      <Card className="co-incidents-form-card p-4">
        <StateCard title="No incident selected" description="Choose a safety item from the board to review details and follow-up actions." tone="slate" />
      </Card>
    );
  }

  return (
    <Card className="co-incidents-form-card p-4">
      <SectionHeader title={incident.title || "Safety item"} description={safetyIncidentJobLabel(incident)} action={<Badge tone={safetySeverityTone(incident.severity)}>{incident.severity || "low"}</Badge>} />
      <div className="co-incidents-readonly-grid">
        <div><span>Status</span><strong>{incident.statusLabel || incident.status || "Open"}</strong></div>
        <div><span>Type</span><strong>{safetyIncidentTypeLabel(incident.type)}</strong></div>
        <div><span>Reporter</span><strong>{safetyIncidentReporterLabel(incident)}</strong></div>
        <div><span>Created</span><strong>{formatDateTime(safetyIncidentPrimaryDate(incident)) || "Not set"}</strong></div>
      </div>
      <div className="co-incidents-note-panel">
        <span>Description</span>
        <p>{incident.description || "No description provided."}</p>
      </div>
      <div className="co-incidents-note-panel">
        <span>Immediate action</span>
        <p>{incident.immediateAction || "No immediate action recorded."}</p>
      </div>
      {canReview ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => onReview(incident.id)} disabled={busy || incident.status === "reviewed" || incident.status === "resolved" || incident.status === "archived"}>Review</Button>
          <Button type="button" onClick={() => onResolve(incident.id)} disabled={busy || incident.status === "resolved" || incident.status === "archived"}>Resolve</Button>
          <Button type="button" variant="danger" onClick={() => onArchive(incident.id)} disabled={busy || Boolean(incident.archivedAt)}>Archive</Button>
        </div>
      ) : null}
    </Card>
  );
}

function SafetyIncidentsMobileFocusPanel({
  incident,
  visibleCount,
  visibleOpen,
  highSeverity,
  reviewNeeded,
  canSubmitIncidents,
  onSubmitIncident,
  onViewBoard,
  onOpenResponse,
  onOpenSevere,
  onNeedsReview,
  onOpenDetail,
}) {
  const focusTitle = incident?.title || "Incident response";
  const focusMeta = incident
    ? `${safetyIncidentJobLabel(incident)} / ${safetyIncidentReporterLabel(incident)}`
    : "Submit field-safe safety items and keep response work easy to review.";
  const metricItems = [
    { label: "Open", value: visibleOpen, tone: visibleOpen ? "amber" : "green", onClick: onOpenResponse },
    { label: "Severe", value: highSeverity, tone: highSeverity ? "orange" : "slate", onClick: onOpenSevere },
    { label: "Review", value: reviewNeeded, tone: reviewNeeded ? "orange" : "slate", onClick: onNeedsReview },
  ];

  return (
    <section className="co-prepour-mobile-focus co-incidents-mobile-focus mx-4 mb-3 lg:hidden" aria-label="Incidents mobile focus">
      <div className="co-prepour-mobile-focus-copy">
        <span>Safety Focus</span>
        <h2>{focusTitle}</h2>
        <p>{focusMeta}</p>
        <em>{visibleOpen ? `${visibleOpen} open safety item${visibleOpen === 1 ? "" : "s"} need attention` : "Safety watch clear"}</em>
      </div>

      <div className="co-prepour-mobile-focus-actions">
        {canSubmitIncidents ? (
          <Button type="button" onClick={onSubmitIncident}>
            <Icon name="plus" />
            Submit Incident
          </Button>
        ) : (
          <Button type="button" onClick={onOpenDetail}>
            <Icon name="alert" />
            View Details
          </Button>
        )}
        <Button type="button" variant="secondary" onClick={onViewBoard}>
          <Icon name="clipboard" />
          View Board
        </Button>
        <Button type="button" variant="secondary" onClick={onOpenResponse}>
          <Icon name="clock" />
          Open Response
        </Button>
      </div>

      <div className="co-prepour-mobile-focus-metrics">
        <button type="button" onClick={onViewBoard} data-tone="orange">
          <span>Visible</span>
          <strong>{visibleCount}</strong>
        </button>
        {metricItems.map((item) => (
          <button key={item.label} type="button" onClick={item.onClick} data-tone={item.tone}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </button>
        ))}
      </div>
    </section>
  );
}

function SafetyIncidentsPagePolished({
  user,
  companySettings,
  permissions,
  setActive,
  canManage,
  canSubmitIncidents,
  canReview,
  allowedJobs,
  incidentListState,
  incidentStatusFilter,
  setIncidentStatusFilter,
  incidentTypeFilter,
  setIncidentTypeFilter,
  incidentSeverityFilter,
  setIncidentSeverityFilter,
  incidentJobFilter,
  setIncidentJobFilter,
  incidentReporterFilter,
  setIncidentReporterFilter,
  incidentArchiveFilter,
  setIncidentArchiveFilter,
  incidentSearch,
  setIncidentSearch,
  incidentDraft,
  setIncidentDraft,
  visibleIncidents,
  allIncidents,
  selectedIncident,
  setSelectedIncidentId,
  busy,
  errorMessage,
  onSubmitIncident,
  onReviewSafetyIncident,
  onResolveSafetyIncident,
  onArchiveSafetyIncident,
  assistantSafetyIncidentReviewSeed = null,
  onAssistantSafetyIncidentReviewSeedHandled = () => {},
}) {
  const [showTools, setShowTools] = useState(false);
  const [toolTab, setToolTab] = useState(canSubmitIncidents ? "submit" : "detail");
  const [showAllMobileIncidents, setShowAllMobileIncidents] = useState(false);
  const toolsRef = useRef(null);
  const boardRef = useRef(null);
  const isFieldIncidentWorkspace = !canManage;
  const visibleOpen = visibleIncidents.filter((incident) => !incident.archivedAt && !["resolved", "archived"].includes(incident.status)).length;
  const highSeverity = visibleIncidents.filter((incident) => ["high", "critical"].includes(String(incident.severity || "").toLowerCase())).length;
  const reviewNeeded = visibleIncidents.filter((incident) => String(incident.status || "").toLowerCase() === "open").length;
  const resolvedCount = visibleIncidents.filter((incident) => String(incident.status || "").toLowerCase() === "resolved").length;
  const safetyCloseoutReadiness = useMemo(() => deriveSafetyJobCloseoutReadiness(allIncidents, allowedJobs), [allIncidents, allowedJobs]);
  const canOpenSafetySupport = canAccessWorkspaceModule("support", user, companySettings, permissions);
  const mobileIncidentPreviewCap = isFieldIncidentWorkspace ? 3 : visibleIncidents.length;
  const mobileVisibleIncidentCap = showAllMobileIncidents ? visibleIncidents.length : mobileIncidentPreviewCap;
  const mobileVisibleIncidentCount = Math.min(visibleIncidents.length, mobileVisibleIncidentCap);
  const incidentKpis = [
    { label: "Visible Incidents", value: visibleIncidents.length, helper: "Matching current filters", icon: "alert", tone: "orange" },
    { label: "Open Follow-Up", value: visibleOpen, helper: "Needs safety action", icon: "clock", tone: visibleOpen ? "amber" : "green", actionLabel: "Open", onAction: () => setIncidentStatusFilter("open") },
    { label: "High Severity", value: highSeverity, helper: "High or critical", icon: "alert", tone: highSeverity ? "red" : "green" },
    { label: "Reviewed", value: visibleIncidents.filter((incident) => incident.status === "reviewed").length, helper: isFieldIncidentWorkspace ? "Follow-up reviewed" : "Office reviewed", icon: "check", tone: "orange", actionLabel: "Reviewed", onAction: () => setIncidentStatusFilter("reviewed") },
    { label: "Resolved", value: resolvedCount, helper: "Closed safety loop", icon: "check", tone: "green", actionLabel: "Resolved", onAction: () => setIncidentStatusFilter("resolved") },
  ];
  const statusOptions = [
    { label: "All", value: "All" },
    { label: "Open", value: "open" },
    { label: "Reviewed", value: "reviewed" },
    { label: "Resolved", value: "resolved" },
    { label: "Archived", value: "archived" },
  ];

  function clearFilters() {
    setIncidentStatusFilter("All");
    setIncidentTypeFilter("All types");
    setIncidentSeverityFilter("All severities");
    setIncidentJobFilter("All jobs");
    setIncidentReporterFilter("All reporters");
    setIncidentArchiveFilter("Active only");
    setIncidentSearch("");
    setShowAllMobileIncidents(false);
  }

  function openTools(nextTab = canSubmitIncidents ? "submit" : "detail") {
    setToolTab(nextTab);
    setShowTools(true);
    window.setTimeout(() => {
      toolsRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
      if (window.innerWidth < 768) {
        window.setTimeout(() => window.scrollBy({ top: 130, behavior: "smooth" }), 180);
      }
    }, 0);
  }

  function selectTool(nextTab = "detail") {
    setToolTab(nextTab);
    window.setTimeout(() => {
      toolsRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
      if (window.innerWidth < 768) {
        window.setTimeout(() => window.scrollBy({ top: 130, behavior: "smooth" }), 180);
      }
    }, 0);
  }

  function jumpToBoard() {
    window.setTimeout(() => boardRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" }), 0);
  }

  function openPriorityIncident(matchIncident, options = {}) {
    const targetIncident = visibleIncidents.find(matchIncident) || (allIncidents || []).find(matchIncident);
    if (options.statusFilter) setIncidentStatusFilter(options.statusFilter);
    if (options.typeFilter) setIncidentTypeFilter(options.typeFilter);
    if (options.severityFilter) setIncidentSeverityFilter(options.severityFilter);
    if (options.archiveFilter) setIncidentArchiveFilter(options.archiveFilter);
    if (targetIncident?.id) setSelectedIncidentId(targetIncident.id);
    if (options.scrollTarget === "board") {
      jumpToBoard();
      return;
    }
    openTools(options.tool || "detail");
  }

  useEffect(() => {
    const seed = assistantSafetyIncidentReviewSeed;
    if (!seed?.nonce || !canReview) return;

    const activeIncidents = normalizeObjectArray(allIncidents).filter((incident) => (
      !incident.archivedAt && !["resolved", "archived"].includes(String(incident.status || "").toLowerCase())
    ));
    const targetIncidentId = seed.incidentId && activeIncidents.some((incident) => incident?.id === seed.incidentId)
      ? seed.incidentId
      : activeIncidents.find((incident) => ["critical", "high"].includes(String(incident.severity || "").toLowerCase()))?.id
        || activeIncidents.find((incident) => String(incident.status || "").toLowerCase() === "open")?.id
        || activeIncidents[0]?.id
        || "";

    setIncidentStatusFilter("All");
    setIncidentTypeFilter("All types");
    setIncidentSeverityFilter("All severities");
    setIncidentJobFilter("All jobs");
    setIncidentReporterFilter("All reporters");
    setIncidentArchiveFilter("Active only");
    setIncidentSearch("");
    if (targetIncidentId) setSelectedIncidentId(targetIncidentId);
    openTools("detail");
    onAssistantSafetyIncidentReviewSeedHandled(seed.nonce);
  }, [assistantSafetyIncidentReviewSeed?.nonce, canReview, allIncidents]);

  function openSafetySupport() {
    const supportSelectedIncident = visibleIncidents.some((incident) => incident.id === selectedIncident?.id) ? selectedIncident : null;
    const context = buildSafetyIncidentSupportContext({
      user,
      permissions,
      visibleRows: visibleIncidents,
      selectedIncident: supportSelectedIncident,
      filters: {
        status: incidentStatusFilter,
        type: incidentTypeFilter,
        severity: incidentSeverityFilter,
        jobId: incidentJobFilter,
        submittedBy: incidentReporterFilter,
        archived: incidentArchiveFilter,
        query: incidentSearch,
      },
      visibleJobs: allowedJobs,
    });
    if (typeof onOpenSupport === "function") {
      onOpenSupport(context);
      return;
    }
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(SUPPORT_DRAFT_SESSION_KEY, JSON.stringify({ ...context, nonce: Date.now() }));
      if (typeof setActive === "function") {
        setActive("support");
      } else {
        window.location.assign(getModulePath("support"));
      }
    }
  }

  const severeIncident = visibleIncidents.find((incident) => ["critical", "high"].includes(String(incident.severity || "").toLowerCase()))
    || (allIncidents || []).find((incident) => ["critical", "high"].includes(String(incident.severity || "").toLowerCase()));
  const openResponsePriorityCard = {
    label: "Open response",
    value: visibleOpen,
    helper: visibleOpen ? (isFieldIncidentWorkspace ? "Unresolved safety items need the next field action." : "Unresolved safety items need the next office or field action.") : "Visible incidents are reviewed or closed.",
    icon: "clock",
    tone: visibleOpen ? "amber" : "green",
    actionLabel: visibleOpen ? "Open response" : "View board",
    onAction: () => openPriorityIncident((incident) => !incident.archivedAt && !["resolved", "archived"].includes(String(incident.status || "").toLowerCase()), { statusFilter: "All", archiveFilter: "Active only" }),
  };
  const highSeverityPriorityCard = {
    label: "High severity",
    value: highSeverity,
    helper: highSeverity ? "Critical or high severity incidents should stay easy to inspect." : "No high severity incidents in the visible scope.",
    icon: "alert",
    tone: highSeverity ? "red" : "green",
    actionLabel: highSeverity ? "Open severe" : "All clear",
    onAction: () => openPriorityIncident((incident) => ["critical", "high"].includes(String(incident.severity || "").toLowerCase()), { severityFilter: severeIncident ? String(severeIncident.severity || "critical").toLowerCase() : "critical", archiveFilter: "Active only" }),
  };
  const needsReviewPriorityCard = {
    label: "Needs review",
    value: reviewNeeded,
    helper: reviewNeeded ? (isFieldIncidentWorkspace ? "Open reports are ready for documentation or field follow-up." : "Open reports are ready for documentation or office follow-up.") : "No open report is waiting in the current view.",
    icon: "document",
    tone: reviewNeeded ? "orange" : "green",
    actionLabel: canReview ? "Review" : "View open",
    onAction: () => openPriorityIncident((incident) => String(incident.status || "").toLowerCase() === "open", { statusFilter: reviewNeeded ? "open" : "All", archiveFilter: "Active only" }),
  };
  const submitIncidentPriorityCard = {
    label: "Submit incident",
    value: canSubmitIncidents ? "Ready" : "Locked",
    helper: canSubmitIncidents ? "Start a field-safe concern, hazard, near miss, or injury report." : "This role can review visible safety records only.",
    icon: "plus",
    tone: canSubmitIncidents ? "orange" : "slate",
    actionLabel: canSubmitIncidents ? "Start report" : "Read only",
    onAction: () => openTools(canSubmitIncidents ? "submit" : "detail"),
  };
  const incidentPriorityCards = isFieldIncidentWorkspace && canSubmitIncidents
    ? [submitIncidentPriorityCard, highSeverityPriorityCard, openResponsePriorityCard, needsReviewPriorityCard]
    : visibleIncidents.length === 0 && canSubmitIncidents
    ? [submitIncidentPriorityCard, openResponsePriorityCard, highSeverityPriorityCard, needsReviewPriorityCard]
    : highSeverity
      ? [highSeverityPriorityCard, openResponsePriorityCard, needsReviewPriorityCard, submitIncidentPriorityCard]
      : [openResponsePriorityCard, highSeverityPriorityCard, needsReviewPriorityCard, submitIncidentPriorityCard];
  const adminMobileIncidentQueue = useMemo(() => {
    if (isFieldIncidentWorkspace) return [];
    return visibleIncidents
      .filter((incident) => !incident.archivedAt && String(incident.status || "").toLowerCase() !== "archived")
      .slice()
      .sort((left, right) => {
        const score = (incident) => {
          const status = String(incident.status || "").toLowerCase();
          const severity = String(incident.severity || "").toLowerCase();
          return (["critical", "high"].includes(severity) ? 60 : severity === "medium" ? 30 : 0)
            + (status === "open" ? 40 : status === "reviewed" ? 16 : 0)
            + (incident.immediateAction ? 0 : 8);
        };
        const scoreDiff = score(right) - score(left);
        if (scoreDiff) return scoreDiff;
        return new Date(safetyIncidentPrimaryDate(right) || 0).getTime() - new Date(safetyIncidentPrimaryDate(left) || 0).getTime();
      })
      .slice(0, 3);
  }, [isFieldIncidentWorkspace, visibleIncidents]);
  const selectedIncidentIsAdminMobileVisible = adminMobileIncidentQueue.some((incident) => incident.id === selectedIncident?.id);
  const adminMobileIncidentFocus = selectedIncidentIsAdminMobileVisible ? selectedIncident : adminMobileIncidentQueue[0] || null;
  const adminMobileIncidentStatus = String(adminMobileIncidentFocus?.status || "").toLowerCase();
  const adminMobileIncidentSeverity = String(adminMobileIncidentFocus?.severity || "").toLowerCase();
  const adminMobileIncidentIsSevere = ["critical", "high"].includes(adminMobileIncidentSeverity);
  const adminMobileIncidentNeedsReview = adminMobileIncidentStatus === "open";
  const adminMobileIncidentTone = adminMobileIncidentIsSevere ? "red" : adminMobileIncidentNeedsReview || visibleOpen ? "amber" : "green";
  const adminMobileIncidentBadge = adminMobileIncidentIsSevere
    ? "High severity"
    : adminMobileIncidentNeedsReview
      ? "Needs review"
      : visibleOpen
        ? "Open follow-up"
        : "Safety clear";
  const adminMobileIncidentNextTitle = adminMobileIncidentFocus
    ? `Review ${adminMobileIncidentFocus.title || "safety item"}`
    : canSubmitIncidents
      ? "No incident queue"
      : "Safety queue clear";
  const adminMobileIncidentNextMeta = adminMobileIncidentFocus
    ? [
        safetyIncidentJobLabel(adminMobileIncidentFocus),
        safetyIncidentReporterLabel(adminMobileIncidentFocus),
        adminMobileIncidentFocus.statusLabel || adminMobileIncidentFocus.status || "Open",
      ].filter(Boolean).join(" / ")
    : "No visible incident needs admin triage right now.";
  const adminMobileIncidentStatusTiles = [
    { label: "Open", value: visibleOpen, helper: "follow-up", tone: visibleOpen ? "amber" : "green" },
    { label: "Severe", value: highSeverity, helper: "high/critical", tone: highSeverity ? "red" : "slate" },
    { label: "Review", value: reviewNeeded, helper: "open reports", tone: reviewNeeded ? "orange" : "green" },
  ];

  function selectAdminMobileIncident(incident = adminMobileIncidentFocus || adminMobileIncidentQueue[0]) {
    if (incident?.id) setSelectedIncidentId(incident.id);
  }

  function handleAdminMobileReview() {
    if (!adminMobileIncidentFocus?.id) {
      if (canSubmitIncidents) openTools("submit");
      return;
    }
    selectAdminMobileIncident(adminMobileIncidentFocus);
    if (canReview && adminMobileIncidentNeedsReview) {
      onReviewSafetyIncident(adminMobileIncidentFocus.id);
    }
  }

  function handleAdminMobileResolve() {
    if (!adminMobileIncidentFocus?.id) {
      clearFilters();
      return;
    }
    selectAdminMobileIncident(adminMobileIncidentFocus);
    if (canReview && !["resolved", "archived"].includes(adminMobileIncidentStatus)) {
      onResolveSafetyIncident(adminMobileIncidentFocus.id);
    }
  }

  const adminMobilePrimaryLabel = adminMobileIncidentFocus
    ? adminMobileIncidentNeedsReview && canReview
      ? "Review"
      : "Open Item"
    : canSubmitIncidents
      ? "New Report"
      : "Refresh";
  const adminMobileSecondaryLabel = adminMobileIncidentFocus && canReview && !["resolved", "archived"].includes(adminMobileIncidentStatus)
    ? "Resolve"
    : "Clear";

  return (
    <div className="co-office-page co-incidents-page" data-field-workspace={isFieldIncidentWorkspace ? "true" : undefined}>
      <PageHeader
        eyebrow={canManage ? "Office Safety" : "Field Safety"}
        title={canManage ? "Incidents" : "Report Incident"}
        description="Submit and track jobsite safety items without exposing office-only data."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => setIncidentArchiveFilter("Active only")}>{visibleIncidents.length} visible</Button>
            {canOpenSafetySupport ? <Button type="button" variant="secondary" onClick={openSafetySupport}>Support Review</Button> : null}
            {canSubmitIncidents ? <Button type="button" onClick={() => openTools("submit")}>Submit Incident</Button> : null}
          </div>
        }
      />

      <section className="co-admin-mobile-ops-shell co-admin-mobile-incidents-shell" data-admin-mobile-ops-shell="incidents" aria-label="Admin mobile incident command">
        <div className="co-admin-mobile-ops-head">
          <span>Office safety</span>
          <h1>What needs incident attention?</h1>
          <p>Review severe, open, and unresolved safety items before the crew day gets messy.</p>
        </div>

        <div className="co-admin-mobile-next-card" data-tone={adminMobileIncidentTone}>
          <div className="co-admin-mobile-next-copy">
            <span>Today / Next Action</span>
            <strong>{adminMobileIncidentNextTitle}</strong>
            <p>{adminMobileIncidentNextMeta}</p>
          </div>
          <Badge tone={adminMobileIncidentTone === "red" ? "red" : adminMobileIncidentTone === "amber" ? "amber" : "green"}>{adminMobileIncidentBadge}</Badge>
          <div className="co-admin-mobile-primary-actions">
            <Button type="button" onClick={handleAdminMobileReview} disabled={busy}>{adminMobilePrimaryLabel}</Button>
            <Button type="button" variant="secondary" onClick={handleAdminMobileResolve} disabled={busy}>{adminMobileSecondaryLabel}</Button>
          </div>
        </div>

        <div className="co-admin-mobile-status-tiles" aria-label="Incident mobile status">
          {adminMobileIncidentStatusTiles.map((tile) => (
            <div key={tile.label} className="co-admin-mobile-status-tile" data-tone={tile.tone}>
              <span>{tile.label}</span>
              <strong>{tile.value}</strong>
              <em>{tile.helper}</em>
            </div>
          ))}
        </div>

        <section className="co-admin-mobile-queue-panel" aria-label="Top incident queue">
          <div className="co-admin-mobile-panel-head">
            <span>Top 3</span>
            <strong>Incident queue</strong>
            <em>{adminMobileIncidentQueue.length ? `${adminMobileIncidentQueue.length} shown` : "Clear"}</em>
          </div>
          {adminMobileIncidentQueue.length ? (
            <div className="co-admin-mobile-incidents-queue-list">
              {adminMobileIncidentQueue.map((incident) => {
                const severity = String(incident.severity || "").toLowerCase();
                const status = String(incident.status || "").toLowerCase();
                const tone = ["critical", "high"].includes(severity) ? "red" : status === "open" ? "amber" : "green";
                return (
                  <button
                    key={incident.id}
                    type="button"
                    className={`co-admin-mobile-queue-card ${incident.id === adminMobileIncidentFocus?.id ? "is-selected" : ""}`}
                    data-tone={tone}
                    onClick={() => selectAdminMobileIncident(incident)}
                  >
                    <span>{safetyIncidentTypeLabel(incident.type)}</span>
                    <strong>{incident.title || "Untitled safety item"}</strong>
                    <em>{safetyIncidentJobLabel(incident)} / {safetyIncidentReporterLabel(incident)}</em>
                    <b>{incident.statusLabel || incident.status || "Open"} / {formatDateTime(safetyIncidentPrimaryDate(incident)) || "No date"}</b>
                  </button>
                );
              })}
            </div>
          ) : (
            <StateCard title="Safety queue clear" description="No visible incident needs mobile triage right now." tone="green" />
          )}
        </section>

        <details className="co-admin-mobile-more-drawer">
          <summary>
            <span>More details</span>
            <strong>Safety follow-up</strong>
            <em>Resolved items, filters, and support review stay tucked away on phone.</em>
          </summary>
          <div className="co-admin-mobile-more-grid">
            <button type="button" onClick={() => setIncidentStatusFilter("resolved")}>
              <span>Resolved</span>
              <strong>{resolvedCount}</strong>
              <b>closed loop</b>
            </button>
            <button type="button" onClick={clearFilters}>
              <span>Filters</span>
              <strong>{visibleIncidents.length}</strong>
              <b>visible</b>
            </button>
            <button type="button" onClick={openSafetySupport} disabled={!canOpenSafetySupport}>
              <span>Support</span>
              <strong>{canOpenSafetySupport ? "Ready" : "Locked"}</strong>
              <b>review</b>
            </button>
          </div>
        </details>
      </section>

      <SafetyIncidentsMobileFocusPanel
        incident={selectedIncident}
        visibleCount={visibleIncidents.length}
        visibleOpen={visibleOpen}
        highSeverity={highSeverity}
        reviewNeeded={reviewNeeded}
        canSubmitIncidents={canSubmitIncidents}
        onSubmitIncident={() => openTools("submit")}
        onViewBoard={jumpToBoard}
        onOpenResponse={() => openPriorityIncident((incident) => !incident.archivedAt && !["resolved", "archived"].includes(String(incident.status || "").toLowerCase()), { statusFilter: "All", archiveFilter: "Active only", scrollTarget: "board" })}
        onOpenSevere={() => openPriorityIncident((incident) => ["critical", "high"].includes(String(incident.severity || "").toLowerCase()), { severityFilter: severeIncident ? String(severeIncident.severity || "critical").toLowerCase() : "All severities", archiveFilter: "Active only", scrollTarget: "board" })}
        onNeedsReview={() => openPriorityIncident((incident) => String(incident.status || "").toLowerCase() === "open", { statusFilter: reviewNeeded ? "open" : "All", archiveFilter: "Active only", scrollTarget: "board" })}
        onOpenDetail={() => openTools("detail")}
      />

      <div className="co-incidents-kpi-grid mx-auto grid w-full max-w-[1520px] min-w-0 grid-cols-1 gap-3 px-5 pb-3 sm:px-6 md:grid-cols-5 lg:px-6">
        {incidentKpis.map((item) => <CommandCenterKpiCard key={item.label} item={item} />)}
      </div>

      <div className="co-incidents-priority-grid mx-auto grid w-full max-w-[1520px] min-w-0 gap-3 px-5 pb-3 sm:px-6 md:grid-cols-2 xl:grid-cols-4 lg:px-6">
        {incidentPriorityCards.map((card) => (
          <button key={card.label} type="button" className="co-incidents-priority-card co-focus-ring" data-tone={card.tone} data-primary={card === submitIncidentPriorityCard && canSubmitIncidents ? "true" : undefined} onClick={card.onAction}>
            <span className="co-incidents-priority-icon"><Icon name={card.icon} className="h-4 w-4" /></span>
            <span className="min-w-0">
              <span className="co-incidents-priority-value">{card.value}</span>
              <span className="co-incidents-priority-label">{card.label}</span>
              <span className="co-incidents-priority-helper">{card.helper}</span>
            </span>
            <span className="co-incidents-priority-action">{card.actionLabel} -&gt;</span>
          </button>
        ))}
      </div>

      <div className="co-incidents-command-layout mx-auto grid w-full max-w-[1520px] min-w-0 gap-3 px-5 pb-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-6">
        <div ref={boardRef} className="min-w-0">
        <Card className="co-incidents-main-board overflow-hidden">
          <div className="co-incidents-board-header border-b border-slate-200 bg-white p-4">
            <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0">
                <h2 className="text-base font-black uppercase tracking-[0.04em] text-slate-950">{isFieldIncidentWorkspace ? "Safety Queue" : "Incident Response Board"}</h2>
                <p className="mt-1 text-sm font-bold leading-5 text-slate-600">
                  {canManage
                    ? "Track jobsite safety items, severity, type, reporter, status, immediate action, and office follow-up."
                    : "Top visible safety items, severity, and the next field action."}
                </p>
              </div>
            </div>
          </div>
          <div className="co-incidents-filter-strip border-b border-slate-200 bg-white p-3">
            <div className="co-incidents-status-tabs">
              {statusOptions.map((option) => (
                <button key={option.value} type="button" className={incidentStatusFilter === option.value ? "is-active" : ""} onClick={() => setIncidentStatusFilter(option.value)}>
                  {option.label}
                </button>
              ))}
            </div>
            <input className="field-input co-incidents-search" value={incidentSearch} onChange={(event) => setIncidentSearch(event.target.value)} placeholder="Search title, description, immediate action, job, reporter..." />
          </div>
          <details className="co-incidents-advanced-filters border-b border-slate-200 bg-white">
            <summary>
              <span>Advanced filters</span>
              <span>{[incidentTypeFilter !== "All types" ? incidentTypeFilter : "", incidentSeverityFilter !== "All severities" ? incidentSeverityFilter : "", incidentJobFilter !== "All jobs" ? "Job" : "", incidentReporterFilter !== "All reporters" ? "Reporter" : "", incidentArchiveFilter !== "Active only" ? incidentArchiveFilter : ""].filter(Boolean).length || "Type, severity, job"}</span>
            </summary>
            <div className="co-office-filter-grid co-incidents-filter-grid grid gap-3 p-3 md:grid-cols-3">
              <SelectField label="Type" value={incidentTypeFilter} onChange={(event) => setIncidentTypeFilter(event.target.value)}>
                <option>All types</option>
                <option value="concern">Concern</option>
                <option value="hazard">Hazard</option>
                <option value="near_miss">Near miss</option>
                <option value="injury">Injury</option>
                <option value="property_damage">Property damage</option>
                <option value="other">Other</option>
              </SelectField>
              <SelectField label="Severity" value={incidentSeverityFilter} onChange={(event) => setIncidentSeverityFilter(event.target.value)}>
                <option>All severities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </SelectField>
              <SelectField label="Archive" value={incidentArchiveFilter} onChange={(event) => setIncidentArchiveFilter(event.target.value)}>
                <option>Active only</option>
                <option>Archived only</option>
                <option>All</option>
              </SelectField>
              <SelectField label="Job" value={incidentJobFilter} onChange={(event) => setIncidentJobFilter(event.target.value)}>
                <option>All jobs</option>
                {incidentListState.jobOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </SelectField>
              <SelectField label="Submitted by" value={incidentReporterFilter} onChange={(event) => setIncidentReporterFilter(event.target.value)}>
                <option>All reporters</option>
                {incidentListState.reporterOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </SelectField>
            </div>
          </details>
          {errorMessage && visibleIncidents.length === 0 ? (
            <div className="p-5"><StateCard title="Safety incidents unavailable" description={errorMessage} tone="red" /></div>
          ) : visibleIncidents.length === 0 ? (
            <div className="p-5"><StateCard title={(allIncidents || []).length === 0 ? "No incidents yet" : "No incidents match these filters"} description={(allIncidents || []).length === 0 ? "Submitted concerns and incidents will appear here as soon as the field starts using the safety workflow." : "Clear a filter or search another title, job, reporter, or safety note."} tone="slate" /></div>
          ) : (
            <SafetyIncidentsTablePolished
              rows={visibleIncidents}
              selectedId={selectedIncident?.id}
              onSelect={setSelectedIncidentId}
              onOpenDetails={(id) => { setSelectedIncidentId(id); openTools("detail"); }}
              mobileMaxRows={mobileVisibleIncidentCap}
            />
          )}
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3">
            <p className="text-sm font-bold text-slate-600">
              <span className="hidden lg:inline">Showing {visibleIncidents.length} incident{visibleIncidents.length === 1 ? "" : "s"} / {visibleOpen} open follow-up{visibleOpen === 1 ? "" : "s"}</span>
              <span className="lg:hidden">Showing {mobileVisibleIncidentCount} of {visibleIncidents.length} incident{visibleIncidents.length === 1 ? "" : "s"} / {visibleOpen} open follow-up{visibleOpen === 1 ? "" : "s"}</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {visibleIncidents.length > mobileIncidentPreviewCap ? (
                <Button type="button" size="sm" variant="secondary" className="lg:hidden" onClick={() => setShowAllMobileIncidents((current) => !current)}>
                  {showAllMobileIncidents ? "Show fewer" : `Show all ${visibleIncidents.length}`}
                </Button>
              ) : null}
              <Button type="button" size="sm" variant="secondary" onClick={clearFilters}>Clear filters</Button>
            </div>
          </div>
        </Card>
        {!canManage ? (
          <div className="co-field-mobile-tool-surface co-incidents-mobile-tool-surface mt-3 lg:hidden">
            <div className="co-field-mobile-section-head">
              <span>
                <strong>Incident tools</strong>
                <em>Submit a field safety item or review the selected incident without opening a drawer.</em>
              </span>
            </div>
            <div className="co-field-mobile-tool-tabs" role="tablist" aria-label="Incident tools">
              {canSubmitIncidents ? <button type="button" className={toolTab === "submit" ? "is-active" : ""} onClick={() => selectTool("submit")}><Icon name="plus" />Submit</button> : null}
              <button type="button" className={toolTab === "detail" ? "is-active" : ""} onClick={() => selectTool("detail")}><Icon name="alert" />Detail</button>
            </div>
            <div className="co-field-mobile-tool-body">
              {toolTab === "submit" ? (
                <SafetyIncidentSubmitPanelPolished canSubmit={canSubmitIncidents} allowedJobs={allowedJobs} incidentDraft={incidentDraft} setIncidentDraft={setIncidentDraft} busy={busy} onSubmit={onSubmitIncident} />
              ) : (
                <SafetyIncidentDetailPanelPolished incident={selectedIncident} canReview={canReview} busy={busy} onReview={onReviewSafetyIncident} onResolve={onResolveSafetyIncident} onArchive={onArchiveSafetyIncident} />
              )}
            </div>
          </div>
        ) : null}
        <details
          ref={toolsRef}
          className="co-incidents-tools-drawer mt-3 w-full min-w-0"
          open={showTools}
          onToggle={(event) => setShowTools(event.currentTarget.open)}
        >
          <summary>
            <span>
              <strong>Incident Tools</strong>
              <em>Submit new safety items or review selected incidents without changing safety permissions.</em>
            </span>
            <span>Open tools</span>
          </summary>
          <div className="co-incidents-tool-tabs mt-3 flex min-w-0 gap-2 overflow-x-auto pb-1">
            {canSubmitIncidents ? <button type="button" className={toolTab === "submit" ? "is-active" : ""} onClick={() => selectTool("submit")}><Icon name="plus" />Submit</button> : null}
            <button type="button" className={toolTab === "detail" ? "is-active" : ""} onClick={() => selectTool("detail")}><Icon name="alert" />Detail</button>
          </div>
          <div className="co-incidents-tools-panel mt-3">
            {toolTab === "submit" ? (
              <SafetyIncidentSubmitPanelPolished canSubmit={canSubmitIncidents} allowedJobs={allowedJobs} incidentDraft={incidentDraft} setIncidentDraft={setIncidentDraft} busy={busy} onSubmit={onSubmitIncident} />
            ) : (
              <SafetyIncidentDetailPanelPolished incident={selectedIncident} canReview={canReview} busy={busy} onReview={onReviewSafetyIncident} onResolve={onResolveSafetyIncident} onArchive={onArchiveSafetyIncident} />
            )}
          </div>
        </details>
        </div>

        {canManage ? (
          <SafetyIncidentCommandRailPolished incident={selectedIncident} closeoutReadiness={safetyCloseoutReadiness} canSubmit={canSubmitIncidents} canReview={canReview} busy={busy} onOpenTool={openTools} onReview={onReviewSafetyIncident} onResolve={onResolveSafetyIncident} onArchive={onArchiveSafetyIncident} />
        ) : null}
      </div>
    </div>
  );
}

function toolboxPolicyUpdatedAt(policy) {
  return policy?.updatedAt || policy?.createdAt;
}

function toolboxPolicyStatusTone(policy) {
  if (policy?.archivedAt) return "slate";
  return "green";
}

function ToolboxTalksTablePolished({ policies, selectedId, onSelect, onOpenTalk, mobileMaxRows = null }) {
  const mobilePolicies = mobileMaxRows ? policies.slice(0, mobileMaxRows) : policies;

  return (
    <>
      <div className="co-toolbox-mobile-list grid gap-3 p-3 lg:hidden">
        {mobilePolicies.map((policy) => {
          const selected = policy.id === selectedId;

          return (
            <article
              key={policy.id}
              className={`co-toolbox-mobile-card co-mobile-record-card w-full rounded-[1.05rem] border p-4 text-left transition ${selected ? "is-selected border-orange-200 bg-orange-50/75" : "border-slate-200 bg-white"}`}
            >
              <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="break-words text-base font-black text-slate-950">{policy.title || "Untitled toolbox talk"}</p>
                  <p className="mt-1 break-words text-xs font-bold text-slate-500">{policy.category || "Safety"} / Current field guidance</p>
                </div>
                <Badge tone={toolboxPolicyStatusTone(policy)}>{policy.archivedAt ? "Archived" : policy.statusLabel || "Active"}</Badge>
              </div>
              <div className="co-toolbox-mobile-summary">{policy.body || "No guidance text recorded yet."}</div>
              <button type="button" className="co-toolbox-mobile-card-action" onClick={() => { onSelect(policy.id); onOpenTalk?.(policy.id); }}>
                Open talk
              </button>
            </article>
          );
        })}
      </div>
      <div className="co-toolbox-list-scroll hidden min-w-0 overflow-auto lg:block">
        <table className="co-toolbox-command-table w-full min-w-[820px] text-left">
          <thead>
            <tr>
              <th>Talk / Guidance</th>
              <th>Category</th>
              <th>Status</th>
              <th>Updated</th>
              <th>Open</th>
            </tr>
          </thead>
          <tbody>
            {policies.map((policy) => {
              const selected = policy.id === selectedId;

              return (
                <tr key={policy.id} onClick={() => onSelect(policy.id)} className={`cursor-pointer transition hover:bg-orange-50/45 ${selected ? "bg-orange-50/70" : ""}`}>
                  <td>
                    <p className="font-black text-slate-950">{policy.title || "Untitled toolbox talk"}</p>
                    <p className="text-xs font-bold text-slate-500">{policy.body || "No guidance text recorded yet."}</p>
                  </td>
                  <td className="font-bold text-slate-700">{policy.category || "Safety"}</td>
                  <td><Badge tone={toolboxPolicyStatusTone(policy)}>{policy.archivedAt ? "Archived" : policy.statusLabel || "Active"}</Badge></td>
                  <td className="font-bold text-slate-700">{formatDateTime(toolboxPolicyUpdatedAt(policy))}</td>
                  <td>
                    <button type="button" className="co-toolbox-icon-button" onClick={(event) => { event.stopPropagation(); onSelect(policy.id); onOpenTalk?.(policy.id); }} aria-label={`Open toolbox talk ${policy.title || policy.id}`}>
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

function ToolboxTalkCommandRailPolished({ policy, canAcknowledge, canManage, ackState, ppeItems, onOpenTool, isOfficeWorkspace = false }) {
  const requiredPpeCount = ppeItems.filter((item) => item.requiredByDefault).length;
  const railClassName = `co-toolbox-right-rail space-y-4${isOfficeWorkspace ? " co-toolbox-talks-office-assistant" : ""}`;
  const assistantPriorities = policy ? [
    {
      label: ackState.hasAcknowledged ? "Crew review is acknowledged for the current user" : "Crew review still needs acknowledgment",
      tone: ackState.hasAcknowledged ? "ready" : "warn",
    },
    {
      label: requiredPpeCount ? `${requiredPpeCount} required PPE reminder${requiredPpeCount === 1 ? "" : "s"} tied to this review` : "No required PPE reminders are marked yet",
      tone: requiredPpeCount ? "ready" : "default",
    },
    {
      label: policy.archivedAt ? "Archived guidance stays out of field focus" : `${policy.statusLabel || "Active"} guidance is visible to the crew`,
      tone: policy.archivedAt ? "warn" : "ready",
    },
  ] : [
    { label: "Select a toolbox talk to load crew guidance", tone: "default" },
    { label: "Keep acknowledgments short and field-safe", tone: "ready" },
    { label: canManage ? "Create practical guidance before the morning huddle" : "PPE reminders stay available without office controls", tone: "warn" },
  ];
  const assistantActions = [
    { label: "Open PPE reminders", icon: "hardhat", onClick: () => onOpenTool("ppe"), show: true },
    { label: policy ? "Acknowledge review" : "Prepare acknowledgment", icon: "check", onClick: () => onOpenTool("ack"), show: Boolean(canAcknowledge) },
    { label: policy ? "Edit guidance" : "Manage guidance", icon: "settings", onClick: () => onOpenTool("manage"), show: Boolean(canManage) },
  ].filter((item) => item.show);

  if (!policy) {
    return (
      <div className={railClassName}>
        {isOfficeWorkspace ? (
          <Card className="co-prepour-assistant-card p-0">
            <div className="co-prepour-assistant-topbar">
              <span><Icon name="spark" /></span>
              <strong>Apex Assistant</strong>
              <em>Safety</em>
            </div>
            <div className="co-prepour-assistant-body">
              <p className="co-prepour-assistant-kicker">Toolbox command</p>
              <h3>Select a talk before the crew huddle.</h3>
              <p>Pick current guidance to see PPE reminders, acknowledgment status, and the next office action.</p>
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
          <SectionHeader title="Toolbox Console" description="Select a talk or create guidance for the crew." />
          <div className="co-toolbox-empty-rail">
            <span><Icon name="clipboard" /></span>
            <strong>No toolbox talk selected</strong>
            <p>Toolbox talks keep field guidance practical, visible, and separate from office-only data.</p>
          </div>
          {canManage ? <Button type="button" className="mt-3 w-full" onClick={() => onOpenTool("manage")}>Manage Guidance</Button> : null}
        </Card>
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
            <em>Safety</em>
          </div>
          <div className="co-prepour-assistant-body">
            <p className="co-prepour-assistant-kicker">Toolbox command</p>
            <h3>{policy.title || "Selected toolbox talk"}</h3>
            <p>{policy.category || "Safety"} / Updated {formatDateTime(toolboxPolicyUpdatedAt(policy)) || "No date"} / {requiredPpeCount} PPE required</p>
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
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Selected talk</p>
            <h3 className="mt-2 break-words text-xl font-black leading-tight text-slate-950">{policy.title || "Untitled toolbox talk"}</h3>
            <p className="mt-1 break-words text-xs font-black text-slate-500">{policy.category || "Safety"} / {formatDateTime(toolboxPolicyUpdatedAt(policy)) || "No date"}</p>
          </div>
          <Badge tone={toolboxPolicyStatusTone(policy)}>{policy.archivedAt ? "Archived" : policy.statusLabel || "Active"}</Badge>
        </div>

        <div className="co-toolbox-selected-metrics">
          <div>
            <span>Category</span>
            <strong>{policy.category || "Safety"}</strong>
          </div>
          <div>
            <span>PPE</span>
            <strong>{requiredPpeCount} required</strong>
          </div>
          <div>
            <span>Acknowledged</span>
            <strong>{ackState.hasAcknowledged ? "Yes" : "Not yet"}</strong>
          </div>
          <div>
            <span>Updated</span>
            <strong>{formatDateTime(toolboxPolicyUpdatedAt(policy)) || "No date"}</strong>
          </div>
        </div>

        <div className="co-toolbox-note-panel">
          <span>Talk outline</span>
          <p>{policy.body || "No guidance text recorded yet."}</p>
        </div>

        <div className={`co-toolbox-rail-actions mt-3 grid gap-2 ${canAcknowledge && canManage ? "grid-cols-2" : "grid-cols-1"}`}>
          {canAcknowledge ? <Button type="button" size="sm" onClick={() => onOpenTool("ack")}>Acknowledge</Button> : null}
          {canManage ? <Button type="button" size="sm" variant="secondary" onClick={() => onOpenTool("manage")}>Edit Talk</Button> : null}
        </div>
      </Card>

      <Card className="co-toolbox-rail-card p-4">
        <SectionHeader title="Talk Readiness" description="Keep the crew brief short, current, and actionable." />
        <div className="co-toolbox-readiness-list">
          <span data-state={policy.title ? "ready" : "needs"}>Title <strong>{policy.title ? "Set" : "Needed"}</strong></span>
          <span data-state={policy.body ? "ready" : "needs"}>Guidance <strong>{policy.body ? "Written" : "Needed"}</strong></span>
          <span data-state={ppeItems.length ? "ready" : "needs"}>PPE list <strong>{ppeItems.length ? `${ppeItems.length} items` : "Needed"}</strong></span>
          <span data-state={ackState.hasAcknowledged ? "ready" : "needs"}>Crew ack <strong>{ackState.hasAcknowledged ? "Captured" : "Open"}</strong></span>
        </div>
      </Card>
    </div>
  );
}

function ToolboxAcknowledgePanelPolished({ canAcknowledge, allowedJobs, visiblePolicies, ackDraft, setAckDraft, acknowledgments, canManage, ackState, busy, onSubmit }) {
  if (!canAcknowledge) {
    return (
      <Card className="co-toolbox-form-card p-4">
        <StateCard title="Acknowledgment unavailable" description="This role cannot acknowledge toolbox talks." tone="slate" />
      </Card>
    );
  }

  return (
    <Card className="co-toolbox-form-card p-4">
      <SectionHeader title="Acknowledge Toolbox Review" description={ackState.hasAcknowledged ? `Last acknowledged ${formatDateTime(ackState.latest?.acknowledgedAt)}.` : "Capture a quick field acknowledgment after the crew review."} />
      <form className="co-toolbox-form-grid" onSubmit={onSubmit}>
        <SelectField label="Job" value={ackDraft.jobId} onChange={(event) => setAckDraft((current) => ({ ...current, jobId: event.target.value }))}>
          <option value="">General toolbox review</option>
          {allowedJobs.map((job) => <option key={job.id} value={job.id}>{job.label}</option>)}
        </SelectField>
        <SelectField label="Talk" value={ackDraft.policyId} onChange={(event) => setAckDraft((current) => ({ ...current, policyId: event.target.value }))}>
          <option value="">All current toolbox guidance</option>
          {visiblePolicies.filter((policy) => !policy.archivedAt).map((policy) => <option key={policy.id} value={policy.id}>{policy.title}</option>)}
        </SelectField>
        <div className="md:col-span-2">
          <TextAreaField label="Notes" value={ackDraft.notes} onChange={(event) => setAckDraft((current) => ({ ...current, notes: event.target.value }))} placeholder="Topics covered, PPE checked, crew questions, site hazards..." />
        </div>
        <div className="md:col-span-2">
          <Button type="submit" className="w-full sm:w-auto" disabled={busy}>Acknowledge</Button>
        </div>
      </form>
      <div className="co-toolbox-ack-list">
        {(acknowledgments || []).slice(0, canManage ? 6 : 3).map((acknowledgment) => (
          <div key={acknowledgment.id}>
            <strong>{acknowledgment.policyTitle || "General toolbox review"}</strong>
            <span>{acknowledgment.userName}{acknowledgment.job?.title ? ` / ${acknowledgment.job.title}` : ""}</span>
            <em>{formatDateTime(acknowledgment.acknowledgedAt)}</em>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ToolboxManagePanelPolished({
  canManage,
  selectedPolicy,
  policyDraft,
  setPolicyDraft,
  onPolicySubmit,
  onNewPolicy,
  onArchivePolicy,
  busy,
}) {
  if (!canManage) {
    return (
      <Card className="co-toolbox-form-card p-4">
        <StateCard title="Management unavailable" description="Only office/admin roles can edit toolbox guidance." tone="slate" />
      </Card>
    );
  }

  return (
    <Card className="co-toolbox-form-card p-4">
      <SectionHeader title={selectedPolicy ? "Edit Toolbox Talk" : "Create Toolbox Talk"} description="Keep the language practical for the field. Avoid legal, payroll, or pricing content." />
      <form className="co-toolbox-form-grid" onSubmit={onPolicySubmit}>
        <InputField label="Title" value={policyDraft.title} onChange={(event) => setPolicyDraft((current) => ({ ...current, title: event.target.value }))} />
        <InputField label="Category" value={policyDraft.category} onChange={(event) => setPolicyDraft((current) => ({ ...current, category: event.target.value }))} />
        <div className="md:col-span-2">
          <TextAreaField label="Talk body" value={policyDraft.body} onChange={(event) => setPolicyDraft((current) => ({ ...current, body: event.target.value }))} />
        </div>
        <div className="flex flex-wrap gap-2 md:col-span-2">
          <Button type="submit" disabled={busy || !policyDraft.title || !policyDraft.body}>Save talk</Button>
          {selectedPolicy ? <Button type="button" variant="secondary" onClick={onNewPolicy}>New talk</Button> : null}
          {selectedPolicy ? <Button type="button" variant="danger" onClick={() => onArchivePolicy(selectedPolicy.id)} disabled={busy || Boolean(selectedPolicy.archivedAt)}>Archive</Button> : null}
        </div>
      </form>
    </Card>
  );
}

function ToolboxPpePanelPolished({ ppeItems, canManage, selectedPpeItem, setSelectedPpeId, ppeDraft, setPpeDraft, onPpeSubmit, onArchivePpeItem, busy }) {
  return (
    <Card className="co-toolbox-form-card p-4">
      <SectionHeader title="PPE Reminders" description={canManage ? "PPE expectations stay visible with toolbox talks and editable only by office/admin roles." : "PPE expectations stay visible with toolbox talks and crew acknowledgments."} />
      {ppeItems.length === 0 ? (
        <StateCard title="No PPE items yet" description="Add PPE items to support field toolbox reviews." tone="slate" />
      ) : (
        <div className="co-toolbox-ppe-list">
          {ppeItems.map((item) => (
            <button key={item.id} type="button" onClick={() => canManage ? setSelectedPpeId(item.id) : undefined} className={selectedPpeItem?.id === item.id ? "is-selected" : ""}>
              <span>
                <strong>{item.label}</strong>
                <em>{item.description || "No description"}</em>
              </span>
              <Badge tone={item.requiredByDefault ? "orange" : "slate"}>{item.requiredByDefault ? "Required" : "As needed"}</Badge>
            </button>
          ))}
        </div>
      )}
      {canManage ? (
        <form className="co-toolbox-form-grid mt-4" onSubmit={onPpeSubmit}>
          <InputField label="Label" value={ppeDraft.label} onChange={(event) => setPpeDraft((current) => ({ ...current, label: event.target.value }))} />
          <label className="field-label">
            <span>Required by default</span>
            <div className="flex min-h-[2.75rem] items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700">
              <input type="checkbox" checked={ppeDraft.requiredByDefault} onChange={(event) => setPpeDraft((current) => ({ ...current, requiredByDefault: event.target.checked }))} />
              <span>Surface this item first.</span>
            </div>
          </label>
          <div className="md:col-span-2">
            <TextAreaField label="Description" value={ppeDraft.description} onChange={(event) => setPpeDraft((current) => ({ ...current, description: event.target.value }))} />
          </div>
          <div className="flex flex-wrap gap-2 md:col-span-2">
            <Button type="submit" disabled={busy || !ppeDraft.label}>Save PPE item</Button>
            {selectedPpeItem ? <Button type="button" variant="secondary" onClick={() => setSelectedPpeId("")}>New item</Button> : null}
            {selectedPpeItem ? <Button type="button" variant="danger" onClick={() => onArchivePpeItem(selectedPpeItem.id)} disabled={busy || Boolean(selectedPpeItem.archivedAt)}>Archive</Button> : null}
          </div>
        </form>
      ) : null}
    </Card>
  );
}

function ToolboxTalksMobileFocusPanel({
  talk,
  visibleCount,
  activeCount,
  requiredPpeCount,
  acknowledgmentState,
  canAcknowledge,
  canManage,
  onAcknowledge,
  onViewBoard,
  onOpenPpe,
  onManage,
}) {
  const focusTitle = talk?.title || "Toolbox review";
  const focusMeta = talk
    ? `${talk.category || "Safety"} / Current field guidance`
    : "Keep safety guidance, PPE reminders, and crew acknowledgment easy to reach.";
  const metricItems = [
    { label: "Visible", value: visibleCount, tone: visibleCount ? "orange" : "slate", onClick: onViewBoard },
    { label: "Active", value: activeCount, tone: activeCount ? "green" : "slate", onClick: onViewBoard },
    { label: "PPE", value: requiredPpeCount, tone: requiredPpeCount ? "orange" : "slate", onClick: onOpenPpe },
    { label: "Ack", value: acknowledgmentState.hasAcknowledged ? "Done" : "Open", tone: acknowledgmentState.hasAcknowledged ? "green" : "amber", onClick: onAcknowledge },
  ];

  return (
    <section className="co-prepour-mobile-focus co-toolbox-mobile-focus mx-4 mb-3 lg:hidden" aria-label="Toolbox talks mobile focus">
      <div className="co-prepour-mobile-focus-copy">
        <span>Toolbox Focus</span>
        <h2>{focusTitle}</h2>
        <p>{focusMeta}</p>
        <em>{acknowledgmentState.hasAcknowledged ? "Crew review acknowledged" : "Crew review still open"}</em>
      </div>

      <div className="co-prepour-mobile-focus-actions">
        {canAcknowledge ? (
          <Button type="button" onClick={onAcknowledge}>
            <Icon name="check" />
            Acknowledge
          </Button>
        ) : (
          <Button type="button" onClick={onViewBoard}>
            <Icon name="clipboard" />
            View Board
          </Button>
        )}
        <Button type="button" variant="secondary" onClick={onViewBoard}>
          <Icon name="clipboard" />
          Board
        </Button>
        <Button type="button" variant="secondary" onClick={canManage ? onManage : onOpenPpe}>
          <Icon name={canManage ? "settings" : "hardhat"} />
          {canManage ? "Manage" : "PPE"}
        </Button>
      </div>

      <div className="co-prepour-mobile-focus-metrics">
        {metricItems.map((item) => (
          <button key={item.label} type="button" onClick={item.onClick} data-tone={item.tone}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </button>
        ))}
      </div>
    </section>
  );
}

function ToolboxTalksPagePolished({
  canManage,
  canAcknowledge,
  visiblePolicies,
  activePpeItems,
  acknowledgmentState,
  safetyAcknowledgments,
  allowedJobs,
  selectedPolicy,
  setSelectedPolicyId,
  policyDraft,
  setPolicyDraft,
  selectedPpeItem,
  setSelectedPpeId,
  ppeDraft,
  setPpeDraft,
  ackDraft,
  setAckDraft,
  busy,
  onPolicySubmit,
  onArchiveSafetyPolicy,
  onPpeSubmit,
  onArchivePpeItem,
  onAcknowledge,
}) {
  const [categoryFilter, setCategoryFilter] = useState("All categories");
  const [search, setSearch] = useState("");
  const [showTools, setShowTools] = useState(false);
  const [toolTab, setToolTab] = useState(canAcknowledge ? "ack" : "ppe");
  const [showAllMobileTalks, setShowAllMobileTalks] = useState(false);
  const boardRef = useRef(null);
  const toolsRef = useRef(null);
  const categories = useMemo(() => Array.from(new Set(visiblePolicies.map((policy) => policy.category).filter(Boolean))).sort(), [visiblePolicies]);
  const filteredPolicies = useMemo(() => {
    const query = search.trim().toLowerCase();
    return visiblePolicies.filter((policy) => {
      if (categoryFilter !== "All categories" && policy.category !== categoryFilter) return false;
      if (!query) return true;
      return [policy.title, policy.body, policy.category].filter(Boolean).join(" ").toLowerCase().includes(query);
    });
  }, [categoryFilter, search, visiblePolicies]);
  const selectedTalk = filteredPolicies.find((policy) => policy.id === selectedPolicy?.id) || selectedPolicy || filteredPolicies[0] || visiblePolicies[0] || null;
  const requiredPpeCount = activePpeItems.filter((item) => item.requiredByDefault).length;
  const mobileTalkPreviewCap = canManage ? filteredPolicies.length : 3;
  const mobileVisibleTalkCap = showAllMobileTalks ? filteredPolicies.length : mobileTalkPreviewCap;
  const mobileVisibleTalkCount = Math.min(filteredPolicies.length, mobileVisibleTalkCap);
  const toolboxKpis = [
    { label: "Guidance Items", value: filteredPolicies.length, helper: "Matching current filters", icon: "clipboard", tone: "orange" },
    { label: "Active Talks", value: visiblePolicies.filter((policy) => !policy.archivedAt).length, helper: "Visible to field", icon: "check", tone: "green" },
    { label: "Required PPE", value: requiredPpeCount, helper: "Default PPE reminders", icon: "hardhat", tone: "amber" },
    { label: "Acknowledgments", value: acknowledgmentState.count, helper: acknowledgmentState.hasAcknowledged ? "Latest user acknowledgment" : "No user acknowledgment yet", icon: "users", tone: acknowledgmentState.hasAcknowledged ? "green" : "slate" },
    { label: "Crew Review", value: acknowledgmentState.hasAcknowledged ? "Done" : "Open", helper: "Current user status", icon: "check", tone: acknowledgmentState.hasAcknowledged ? "green" : "amber" },
  ];

  function clearFilters() {
    setCategoryFilter("All categories");
    setSearch("");
    setShowAllMobileTalks(false);
  }

  function openTools(nextTab = canAcknowledge ? "ack" : "ppe", options = {}) {
    const targetPolicyId = options.policyId || selectedTalk?.id;
    if (nextTab === "ack" && targetPolicyId) {
      setAckDraft((current) => ({ ...current, policyId: targetPolicyId }));
    }
    setToolTab(nextTab);
    setShowTools(true);
    window.setTimeout(() => {
      toolsRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
      if (window.innerWidth < 768) {
        window.setTimeout(() => window.scrollBy({ top: 130, behavior: "smooth" }), 180);
      }
    }, 0);
  }

  function scrollToGuidanceBoard() {
    window.setTimeout(() => boardRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" }), 0);
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

  function openPriorityTalk(matchPolicy, options = {}) {
    const targetPolicy = filteredPolicies.find(matchPolicy) || visiblePolicies.find(matchPolicy);
    if (options.categoryFilter) setCategoryFilter(options.categoryFilter);
    if (options.search !== undefined) setSearch(options.search);
    if (targetPolicy?.id) setSelectedPolicyId(targetPolicy.id);
    if (options.openTools === false) {
      scrollToGuidanceBoard();
      return;
    }
    openTools(options.tool || (canAcknowledge ? "ack" : "ppe"));
  }

  const latestTalk = selectedTalk || filteredPolicies[0] || visiblePolicies[0] || null;
  const crewReviewPriorityCard = {
    label: "Crew review",
    value: acknowledgmentState.hasAcknowledged ? "Done" : "Open",
    helper: acknowledgmentState.hasAcknowledged ? `Latest acknowledgment ${formatDateTime(acknowledgmentState.latest?.acknowledgedAt)}.` : "Crew review needs a field-safe acknowledgment.",
    icon: "check",
    tone: acknowledgmentState.hasAcknowledged ? "green" : "amber",
    primary: canAcknowledge && !acknowledgmentState.hasAcknowledged,
    actionLabel: canAcknowledge ? "Acknowledge" : "View status",
    onAction: () => openTools(canAcknowledge ? "ack" : "ppe"),
  };
  const currentTalkPriorityCard = {
    label: "Current talk",
    value: latestTalk ? 1 : 0,
    helper: latestTalk ? `${latestTalk.title || "Untitled talk"}${latestTalk.category ? ` / ${latestTalk.category}` : ""}` : "No toolbox guidance is visible yet.",
    icon: "clipboard",
    tone: latestTalk ? "orange" : "slate",
    actionLabel: latestTalk ? "Open board" : "No talk",
    onAction: () => openPriorityTalk((policy) => policy.id === latestTalk?.id, { openTools: false }),
  };
  const ppeRemindersPriorityCard = {
    label: "PPE reminders",
    value: requiredPpeCount,
    helper: requiredPpeCount ? "Required default PPE reminders are ready for the crew." : "No required PPE reminders are marked by default.",
    icon: "hardhat",
    tone: requiredPpeCount ? "orange" : "slate",
    actionLabel: "Open PPE",
    onAction: () => openTools("ppe"),
  };
  const manageGuidancePriorityCard = {
    label: canManage ? "Manage guidance" : "Field guidance",
    value: canManage ? "Ready" : filteredPolicies.length,
    helper: canManage ? "Create or edit toolbox talks without exposing office-only data." : "Field-safe toolbox talks stay scoped to this workspace.",
    icon: canManage ? "settings" : "users",
    tone: canManage ? "orange" : "green",
    actionLabel: canManage ? "Manage" : "Review",
    onAction: () => openTools(canManage ? "manage" : (canAcknowledge ? "ack" : "ppe")),
  };
  const toolboxPriorityCards = canManage
    ? (filteredPolicies.length === 0
      ? [manageGuidancePriorityCard, currentTalkPriorityCard, ppeRemindersPriorityCard, crewReviewPriorityCard]
      : [crewReviewPriorityCard, currentTalkPriorityCard, ppeRemindersPriorityCard, manageGuidancePriorityCard])
    : [crewReviewPriorityCard, currentTalkPriorityCard, ppeRemindersPriorityCard];

  return (
    <div className={`co-office-page co-toolbox-page co-toolbox-talks-page ${canManage ? "" : "co-field-tool-page"}`} data-field-workspace={canManage ? "false" : "true"}>
      <PageHeader
        eyebrow={canManage ? "Office Safety" : "Field Safety"}
        title="Toolbox Talks"
        description="Review toolbox guidance, PPE reminders, and crew acknowledgments."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={clearFilters}>{filteredPolicies.length} visible</Button>
            {canAcknowledge ? <Button type="button" onClick={() => openTools("ack")}>Acknowledge</Button> : null}
          </div>
        }
      />

      <ToolboxTalksMobileFocusPanel
        talk={selectedTalk}
        visibleCount={filteredPolicies.length}
        activeCount={visiblePolicies.filter((policy) => !policy.archivedAt).length}
        requiredPpeCount={requiredPpeCount}
        acknowledgmentState={acknowledgmentState}
        canAcknowledge={canAcknowledge}
        canManage={canManage}
        onAcknowledge={() => openTools(canAcknowledge ? "ack" : "ppe")}
        onViewBoard={scrollToGuidanceBoard}
        onOpenPpe={() => openTools("ppe")}
        onManage={() => openTools("manage")}
      />

      <div className="co-toolbox-kpi-grid mx-auto grid w-full max-w-[1520px] min-w-0 grid-cols-1 gap-3 px-5 pb-3 sm:px-6 md:grid-cols-3 2xl:grid-cols-5 lg:px-6">
        {toolboxKpis.map((item) => <CommandCenterKpiCard key={item.label} item={item} />)}
      </div>

      <div className="co-toolbox-priority-grid mx-auto grid w-full max-w-[1520px] min-w-0 gap-3 px-5 pb-3 sm:px-6 md:grid-cols-2 xl:grid-cols-4 lg:px-6">
        {toolboxPriorityCards.map((card) => (
          <button key={card.label} type="button" className={`co-toolbox-priority-card co-focus-ring ${card.primary ? "is-primary" : ""}`} data-tone={card.tone} onClick={card.onAction}>
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

      <div className="co-toolbox-command-layout mx-auto grid w-full max-w-[1520px] min-w-0 gap-3 px-5 pb-4 sm:px-6 2xl:grid-cols-[minmax(0,1fr)_360px] lg:px-6">
        <div id="toolbox-guidance-board" ref={boardRef} className="co-toolbox-command-main min-w-0">
          <Card className="co-toolbox-main-board overflow-hidden">
            <div className="co-toolbox-board-header border-b border-slate-200 bg-white p-4">
              <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0">
                  <h2 className="text-base font-black uppercase tracking-[0.04em] text-slate-950">{canManage ? "Toolbox Guidance Board" : "Toolbox Queue"}</h2>
                  <p className="mt-1 text-sm font-bold leading-5 text-slate-600">{canManage ? "Scan safety topics, PPE reminders, current guidance, and crew acknowledgment status without office-only clutter." : "Top crew talks, PPE reminders, and acknowledgment status."}</p>
                </div>
              </div>
            </div>
            <div className="co-toolbox-filter-strip border-b border-slate-200 bg-white p-3">
              <div className="co-toolbox-category-tabs">
                <button type="button" className={categoryFilter === "All categories" ? "is-active" : ""} onClick={() => setCategoryFilter("All categories")}>All</button>
                {categories.map((category) => (
                  <button key={category} type="button" className={categoryFilter === category ? "is-active" : ""} onClick={() => setCategoryFilter(category)}>
                    {category}
                  </button>
                ))}
              </div>
              <input className="field-input co-toolbox-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search toolbox talk, category, guidance..." />
            </div>
            {filteredPolicies.length === 0 ? (
              <div className="p-5"><StateCard title={visiblePolicies.length === 0 ? "No toolbox talks yet" : "No toolbox talks match these filters"} description={visiblePolicies.length === 0 ? (canManage ? "Create the first safety policy or toolbox talk to start crew guidance." : "Toolbox guidance will show here when it is available for the crew.") : "Clear the category or search another topic."} tone="slate" /></div>
            ) : (
              <ToolboxTalksTablePolished
                policies={filteredPolicies}
                selectedId={selectedTalk?.id}
                onSelect={setSelectedPolicyId}
                onOpenTalk={(id) => { setSelectedPolicyId(id); openTools(canAcknowledge ? "ack" : "ppe", { policyId: id }); }}
                mobileMaxRows={mobileVisibleTalkCap}
              />
            )}
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3">
              <p className="text-sm font-bold text-slate-600">
                <span className="hidden lg:inline">Showing {filteredPolicies.length} toolbox talk{filteredPolicies.length === 1 ? "" : "s"} / {requiredPpeCount} required PPE reminder{requiredPpeCount === 1 ? "" : "s"}</span>
                <span className="lg:hidden">Showing {mobileVisibleTalkCount} of {filteredPolicies.length} talk{filteredPolicies.length === 1 ? "" : "s"} / {requiredPpeCount} PPE reminder{requiredPpeCount === 1 ? "" : "s"}</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {filteredPolicies.length > mobileTalkPreviewCap ? (
                  <Button type="button" size="sm" variant="secondary" className="lg:hidden" onClick={() => setShowAllMobileTalks((current) => !current)}>
                    {showAllMobileTalks ? "Show fewer" : `Show all ${filteredPolicies.length}`}
                  </Button>
                ) : null}
                <Button type="button" size="sm" variant="secondary" onClick={clearFilters}>Clear filters</Button>
              </div>
            </div>
          </Card>
          {!canManage ? (
            <div className="co-field-mobile-tool-surface co-toolbox-mobile-tool-surface mt-3 lg:hidden">
              <div className="co-field-mobile-section-head">
                <span>
                  <strong>Toolbox tools</strong>
                  <em>Acknowledge crew review and keep PPE reminders close without opening a drawer.</em>
                </span>
              </div>
              <div className="co-field-mobile-tool-tabs" role="tablist" aria-label="Toolbox tools">
                {canAcknowledge ? <button type="button" className={toolTab === "ack" ? "is-active" : ""} onClick={() => changeToolTab("ack")}><Icon name="check" />Acknowledge</button> : null}
                <button type="button" className={toolTab === "ppe" ? "is-active" : ""} onClick={() => changeToolTab("ppe")}><Icon name="hardhat" />PPE</button>
              </div>
              <div className="co-field-mobile-tool-body">
                {toolTab === "ack" ? (
                  <ToolboxAcknowledgePanelPolished canAcknowledge={canAcknowledge} allowedJobs={allowedJobs} visiblePolicies={visiblePolicies} ackDraft={ackDraft} setAckDraft={setAckDraft} acknowledgments={safetyAcknowledgments} canManage={canManage} ackState={acknowledgmentState} busy={busy} onSubmit={onAcknowledge} />
                ) : (
                  <ToolboxPpePanelPolished ppeItems={activePpeItems} canManage={canManage} selectedPpeItem={selectedPpeItem} setSelectedPpeId={setSelectedPpeId} ppeDraft={ppeDraft} setPpeDraft={setPpeDraft} onPpeSubmit={onPpeSubmit} onArchivePpeItem={onArchivePpeItem} busy={busy} />
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
                <strong>Toolbox Tools</strong>
                <em>{canManage ? "Acknowledge crew review, manage guidance, and keep PPE reminders close to the talk." : "Acknowledge crew review and keep PPE reminders close to the talk."}</em>
              </span>
              <span>Open tools</span>
            </summary>
            <div className="co-toolbox-tool-tabs mt-3 flex min-w-0 gap-2 overflow-x-auto pb-1">
              {canAcknowledge ? <button type="button" className={toolTab === "ack" ? "is-active" : ""} onClick={() => changeToolTab("ack")}><Icon name="check" />Acknowledge</button> : null}
              <button type="button" className={toolTab === "ppe" ? "is-active" : ""} onClick={() => changeToolTab("ppe")}><Icon name="hardhat" />PPE</button>
              {canManage ? <button type="button" className={toolTab === "manage" ? "is-active" : ""} onClick={() => changeToolTab("manage")}><Icon name="settings" />Manage</button> : null}
            </div>
            <div className="co-toolbox-tools-panel mt-3">
              {toolTab === "ack" ? (
                <ToolboxAcknowledgePanelPolished canAcknowledge={canAcknowledge} allowedJobs={allowedJobs} visiblePolicies={visiblePolicies} ackDraft={ackDraft} setAckDraft={setAckDraft} acknowledgments={safetyAcknowledgments} canManage={canManage} ackState={acknowledgmentState} busy={busy} onSubmit={onAcknowledge} />
              ) : toolTab === "manage" ? (
                <ToolboxManagePanelPolished canManage={canManage} selectedPolicy={selectedPolicy} policyDraft={policyDraft} setPolicyDraft={setPolicyDraft} onPolicySubmit={onPolicySubmit} onNewPolicy={() => setSelectedPolicyId("")} onArchivePolicy={onArchiveSafetyPolicy} busy={busy} />
              ) : (
                <ToolboxPpePanelPolished ppeItems={activePpeItems} canManage={canManage} selectedPpeItem={selectedPpeItem} setSelectedPpeId={setSelectedPpeId} ppeDraft={ppeDraft} setPpeDraft={setPpeDraft} onPpeSubmit={onPpeSubmit} onArchivePpeItem={onArchivePpeItem} busy={busy} />
              )}
            </div>
          </details>
        </div>

        {canManage ? (
          <ToolboxTalkCommandRailPolished policy={selectedTalk} canAcknowledge={canAcknowledge} canManage={canManage} ackState={acknowledgmentState} ppeItems={activePpeItems} onOpenTool={openTools} isOfficeWorkspace={canManage} />
        ) : null}
      </div>
    </div>
  );
}

function ppeItemUpdatedAt(item) {
  return item?.updatedAt || item?.createdAt;
}

function ppeItemRequirementLabel(item) {
  return item?.requiredByDefault ? "Required" : "As needed";
}

function ppeItemStatusTone(item) {
  if (item?.archivedAt) return "slate";
  if (item?.requiredByDefault) return "orange";
  return "amber";
}

function PpeChecklistTablePolished({ items, selectedId, onSelect, mobileMaxRows = null }) {
  const mobileItems = mobileMaxRows ? items.slice(0, mobileMaxRows) : items;

  return (
    <>
      <div className="co-toolbox-mobile-list grid gap-3 p-3 lg:hidden">
        {mobileItems.map((item) => {
          const selected = item.id === selectedId;

          return (
            <article
              key={item.id}
              className={`co-toolbox-mobile-card co-mobile-record-card w-full rounded-[1.05rem] border p-4 text-left transition ${selected ? "is-selected border-orange-200 bg-orange-50/75" : "border-slate-200 bg-white"}`}
            >
              <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="break-words text-base font-black text-slate-950">{item.label || "Untitled PPE item"}</p>
                  <p className="mt-1 break-words text-xs font-bold text-slate-500">{ppeItemRequirementLabel(item)} / Current PPE guidance</p>
                </div>
                <Badge tone={ppeItemStatusTone(item)}>{ppeItemRequirementLabel(item)}</Badge>
              </div>
              <div className="co-toolbox-mobile-summary">{item.description || "No PPE guidance recorded yet."}</div>
              <button type="button" className="co-toolbox-mobile-card-action" onClick={() => onSelect(item.id)}>
                Open PPE
              </button>
            </article>
          );
        })}
      </div>
      <div className="co-toolbox-list-scroll hidden min-w-0 overflow-auto lg:block">
        <table className="co-toolbox-command-table w-full min-w-[820px] text-left">
          <thead>
            <tr>
              <th>PPE / Requirement</th>
              <th>Default</th>
              <th>Status</th>
              <th>Updated</th>
              <th>Open</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const selected = item.id === selectedId;

              return (
                <tr key={item.id} onClick={() => onSelect(item.id)} className={`cursor-pointer transition hover:bg-orange-50/45 ${selected ? "bg-orange-50/70" : ""}`}>
                  <td>
                    <p className="font-black text-slate-950">{item.label || "Untitled PPE item"}</p>
                    <p className="text-xs font-bold text-slate-500">{item.description || "No PPE guidance recorded yet."}</p>
                  </td>
                  <td><Badge tone={item.requiredByDefault ? "orange" : "slate"}>{ppeItemRequirementLabel(item)}</Badge></td>
                  <td><Badge tone={item.archivedAt ? "slate" : "green"}>{item.archivedAt ? "Archived" : item.statusLabel || "Active"}</Badge></td>
                  <td className="font-bold text-slate-700">{formatDateTime(ppeItemUpdatedAt(item))}</td>
                  <td>
                    <button type="button" className="co-toolbox-icon-button" onClick={(event) => { event.stopPropagation(); onSelect(item.id); }} aria-label={`Open PPE item ${item.label || item.id}`}>
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

function PpeCommandRailPolished({ item, canManage, canAcknowledge, canSubmitIncidents, acknowledgmentState, policies, incidents, onOpenTool, onSelectItem, isOfficeWorkspace = false }) {
  const ppePolicies = policies.filter((policy) => String(policy.category || "").toLowerCase().includes("ppe") || `${policy.title || ""} ${policy.body || ""}`.toLowerCase().includes("ppe"));
  const openIncidents = incidents.filter((incident) => !incident.archivedAt && !["resolved", "archived"].includes(String(incident.status || ""))).length;
  const railClassName = `co-toolbox-right-rail space-y-4${isOfficeWorkspace ? " co-ppe-office-assistant" : ""}`;
  const assistantPriorities = item ? [
    {
      label: item.requiredByDefault ? "Required PPE is surfaced before work starts" : "This PPE item is marked as-needed",
      tone: item.requiredByDefault ? "ready" : "default",
    },
    {
      label: acknowledgmentState.hasAcknowledged ? "Crew PPE acknowledgment is captured" : "Crew PPE acknowledgment still needs action",
      tone: acknowledgmentState.hasAcknowledged ? "ready" : "warn",
    },
    {
      label: openIncidents ? `${openIncidents} visible safety watch item${openIncidents === 1 ? "" : "s"} open` : "Safety watch is clear for this scope",
      tone: openIncidents ? "warn" : "ready",
    },
  ] : [
    { label: "Select a PPE item to load field expectations", tone: "default" },
    { label: "Required protection should be visible before work starts", tone: "warn" },
    { label: "Safety watch stays close without field office controls", tone: "ready" },
  ];
  const assistantActions = [
    { label: item ? "Open PPE setup" : "Prepare PPE setup", icon: "hardhat", onClick: () => onOpenTool("ppe"), show: Boolean(canManage) },
    { label: "Acknowledge PPE", icon: "check", onClick: () => onOpenTool("ack"), show: Boolean(canAcknowledge) },
    { label: "Review safety watch", icon: "alert", onClick: () => onOpenTool("incident"), show: Boolean(canSubmitIncidents) },
  ].filter((entry) => entry.show);

  if (!item) {
    return (
      <div className={railClassName}>
        {isOfficeWorkspace ? (
          <Card className="co-prepour-assistant-card p-0">
            <div className="co-prepour-assistant-topbar">
              <span><Icon name="spark" /></span>
              <strong>Apex Assistant</strong>
              <em>PPE</em>
            </div>
            <div className="co-prepour-assistant-body">
              <p className="co-prepour-assistant-kicker">PPE command</p>
              <h3>Select protection before work starts.</h3>
              <p>Pick a PPE row to see required gear, acknowledgment status, linked guidance, and safety watch context.</p>
              <div className="co-prepour-assistant-priorities">
                {assistantPriorities.map((entry) => <span key={entry.label} data-tone={entry.tone}>{entry.label}</span>)}
              </div>
              {assistantActions.length ? (
                <div className="co-prepour-assistant-actions">
                  {assistantActions.map((entry) => (
                    <button key={entry.label} type="button" onClick={entry.onClick}>
                      <Icon name={entry.icon} />
                      {entry.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </Card>
        ) : null}
        <Card className="co-toolbox-rail-card p-4">
          <SectionHeader title="PPE Console" description="Select an item to review field-ready equipment expectations." />
          <div className="co-toolbox-empty-rail">
            <span><Icon name="hardhat" /></span>
            <strong>No PPE item selected</strong>
            <p>PPE requirements stay field-safe and focused on jobsite readiness without office-only data.</p>
          </div>
          {canAcknowledge ? <Button type="button" className="mt-3 w-full" onClick={() => onOpenTool("ack")}>Acknowledge PPE</Button> : null}
        </Card>
      </div>
    );
  }

  const actionCount = [canAcknowledge, canManage, canSubmitIncidents].filter(Boolean).length;

  return (
    <div className={railClassName}>
      {isOfficeWorkspace ? (
        <Card className="co-prepour-assistant-card p-0">
          <div className="co-prepour-assistant-topbar">
            <span><Icon name="spark" /></span>
            <strong>Apex Assistant</strong>
            <em>PPE</em>
          </div>
          <div className="co-prepour-assistant-body">
            <p className="co-prepour-assistant-kicker">PPE command</p>
            <h3>{item.label || "Selected PPE item"}</h3>
            <p>{ppeItemRequirementLabel(item)} / Updated {formatDateTime(ppeItemUpdatedAt(item)) || "No date"} / {ppePolicies.length} guidance link{ppePolicies.length === 1 ? "" : "s"}</p>
            <div className="co-prepour-assistant-priorities">
              {assistantPriorities.map((entry) => <span key={entry.label} data-tone={entry.tone}>{entry.label}</span>)}
            </div>
            {assistantActions.length ? (
              <div className="co-prepour-assistant-actions">
                {assistantActions.map((entry) => (
                  <button key={entry.label} type="button" onClick={entry.onClick}>
                    <Icon name={entry.icon} />
                    {entry.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </Card>
      ) : null}
      <Card className="co-toolbox-rail-card p-4">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Selected PPE</p>
            <h3 className="mt-2 break-words text-xl font-black leading-tight text-slate-950">{item.label || "Untitled PPE item"}</h3>
            <p className="mt-1 break-words text-xs font-black text-slate-500">{ppeItemRequirementLabel(item)} / {formatDateTime(ppeItemUpdatedAt(item)) || "No date"}</p>
          </div>
          <Badge tone={ppeItemStatusTone(item)}>{ppeItemRequirementLabel(item)}</Badge>
        </div>

        <div className="co-toolbox-selected-metrics">
          <div>
            <span>Default</span>
            <strong>{item.requiredByDefault ? "Required" : "As needed"}</strong>
          </div>
          <div>
            <span>Status</span>
            <strong>{item.archivedAt ? "Archived" : item.statusLabel || "Active"}</strong>
          </div>
          <div>
            <span>Acknowledged</span>
            <strong>{acknowledgmentState.hasAcknowledged ? "Yes" : "Open"}</strong>
          </div>
          <div>
            <span>Guidance</span>
            <strong>{ppePolicies.length} linked</strong>
          </div>
        </div>

        <div className="co-toolbox-note-panel">
          <span>Field expectation</span>
          <p>{item.description || "No PPE guidance recorded yet."}</p>
        </div>

        <div className={`co-toolbox-rail-actions mt-3 grid gap-2 ${actionCount === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
          {canAcknowledge ? <Button type="button" size="sm" onClick={() => onOpenTool("ack")}>Acknowledge</Button> : null}
          {canManage ? <Button type="button" size="sm" variant="secondary" onClick={() => { onSelectItem(item.id); onOpenTool("ppe"); }}>Edit PPE</Button> : null}
          {canSubmitIncidents ? <Button type="button" size="sm" className={actionCount === 3 ? "col-span-2" : ""} variant="secondary" onClick={() => onOpenTool("incident")}>Report Concern</Button> : null}
        </div>
      </Card>

      <Card className="co-toolbox-rail-card p-4">
        <SectionHeader title="Readiness Checks" description="A quick view of whether PPE guidance is ready for the crew." />
        <div className="co-toolbox-readiness-list">
          <span data-state={item.label ? "ready" : "needs"}>Label <strong>{item.label ? "Set" : "Needed"}</strong></span>
          <span data-state={item.description ? "ready" : "needs"}>Description <strong>{item.description ? "Written" : "Needed"}</strong></span>
          <span data-state={item.requiredByDefault ? "ready" : "needs"}>Default list <strong>{item.requiredByDefault ? "Included" : "As needed"}</strong></span>
          <span data-state={openIncidents ? "needs" : "ready"}>Safety watch <strong>{openIncidents ? `${openIncidents} open` : "Clear"}</strong></span>
        </div>
      </Card>
    </div>
  );
}

function PpeMobileFocusPanel({
  item,
  filteredCount,
  requiredCount,
  acknowledgmentState,
  openIncidents,
  canAcknowledge,
  canSubmitIncidents,
  canManage,
  onAcknowledge,
  onViewBoard,
  onOpenIncident,
  onOpenTools,
}) {
  const focusTitle = item?.label || "PPE check ready";
  const focusMeta = item
    ? `${ppeItemRequirementLabel(item)} / Current PPE guidance`
    : `${filteredCount} visible PPE item${filteredCount === 1 ? "" : "s"}`;
  const metricItems = [
    { label: "Items", value: filteredCount, tone: filteredCount ? "orange" : "slate", onClick: onViewBoard },
    { label: "Req", value: requiredCount, tone: requiredCount ? "orange" : "slate", onClick: onViewBoard },
    { label: "Ack", value: acknowledgmentState.hasAcknowledged ? "Done" : "Open", tone: acknowledgmentState.hasAcknowledged ? "green" : "amber", onClick: onAcknowledge },
    { label: "Watch", value: openIncidents, tone: openIncidents ? "amber" : "green", onClick: canSubmitIncidents ? onOpenIncident : onViewBoard },
  ];

  return (
    <section className="co-prepour-mobile-focus co-toolbox-mobile-focus co-ppe-mobile-focus mx-4 mb-3 lg:hidden" aria-label="PPE mobile focus">
      <div className="co-prepour-mobile-focus-copy">
        <span>PPE Focus</span>
        <h2>{focusTitle}</h2>
        <p>{item?.description || "Confirm required protection, acknowledge PPE expectations, and keep safety concerns one tap away."}</p>
        <em>{focusMeta}</em>
      </div>

      <div className="co-prepour-mobile-focus-actions">
        {canAcknowledge ? (
          <Button type="button" onClick={onAcknowledge}>
            <Icon name="check" />
            Acknowledge
          </Button>
        ) : (
          <Button type="button" onClick={onViewBoard}>
            <Icon name="hardhat" />
            View PPE
          </Button>
        )}
        {canSubmitIncidents ? (
          <Button type="button" variant="secondary" onClick={onOpenIncident}>
            <Icon name="alert" />
            Concern
          </Button>
        ) : null}
        <Button type="button" variant="secondary" onClick={onOpenTools}>
          <Icon name={canManage ? "settings" : "clipboard"} />
          {canManage ? "Manage" : "Guidance"}
        </Button>
      </div>

      <div className="co-prepour-mobile-focus-metrics">
        {metricItems.map((metric) => (
          <button key={metric.label} type="button" className="co-field-touch-target" data-tone={metric.tone} onClick={metric.onClick}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
          </button>
        ))}
      </div>
    </section>
  );
}

function PpeFieldOperatorPanel({ selectedItem, filteredCount, requiredCount, acknowledgmentState, openIncidents, canAcknowledge, canSubmitIncidents, onOpenTool, onJumpToBoard }) {
  const summaryItems = [
    { label: "PPE items", value: filteredCount, tone: filteredCount ? "orange" : "slate" },
    { label: "Required", value: requiredCount, tone: requiredCount ? "orange" : "slate" },
    { label: "Acknowledged", value: acknowledgmentState.hasAcknowledged ? "Yes" : "Open", tone: acknowledgmentState.hasAcknowledged ? "green" : "amber" },
    { label: "Safety watch", value: openIncidents, tone: openIncidents ? "amber" : "green" },
  ];

  return (
    <div className="co-ppe-field-panel-wrap mx-auto w-full max-w-[1520px] min-w-0 px-5 pb-3 sm:px-6 lg:px-6">
      <FieldOperatorPanelShell
        className="co-ppe-field-panel"
        badges={[
          { label: "Field PPE Check", tone: "orange" },
          { label: acknowledgmentState.hasAcknowledged ? "Acknowledged" : "Needs acknowledgment", tone: acknowledgmentState.hasAcknowledged ? "green" : "amber" },
          openIncidents ? { label: `${openIncidents} safety watch`, tone: "amber" } : { label: "Safety watch clear", tone: "green" },
        ]}
        title={selectedItem ? selectedItem.label || "PPE requirement" : "PPE check ready"}
        description={selectedItem?.description || "Confirm required protection, acknowledge the PPE check, and keep field concerns close without office-only controls."}
        meta={selectedItem ? `${ppeItemRequirementLabel(selectedItem)} / Current PPE guidance` : `${filteredCount} visible PPE item${filteredCount === 1 ? "" : "s"}`}
        metaIcon="hardhat"
        actions={[
          canAcknowledge
            ? { id: "ack", label: "Acknowledge PPE", icon: "check", onClick: () => onOpenTool("ack") }
            : { id: "board", label: "View PPE", icon: "hardhat", onClick: onJumpToBoard },
          canSubmitIncidents ? { id: "incident", label: "Report Concern", icon: "alert", variant: "secondary", onClick: () => onOpenTool("incident") } : null,
          { id: "policy", label: "Guidance", icon: "clipboard", variant: "secondary", onClick: () => onOpenTool("policy") },
          { id: "board-secondary", label: "View Board", icon: "arrowUpRight", variant: "secondary", onClick: onJumpToBoard },
        ]}
        facts={summaryItems}
      />
    </div>
  );
}

function PpeAcknowledgePanelPolished({ canAcknowledge, allowedJobs, visiblePolicies, ackDraft, setAckDraft, acknowledgments, canManage, ackState, busy, onSubmit }) {
  if (!canAcknowledge) {
    return (
      <Card className="co-toolbox-form-card p-4">
        <StateCard title="Acknowledgment unavailable" description="This role can review PPE guidance but cannot submit acknowledgments." tone="slate" />
      </Card>
    );
  }

  return (
    <Card className="co-toolbox-form-card p-4">
      <SectionHeader title="Acknowledge PPE Check" description={ackState.hasAcknowledged ? `Last acknowledged ${formatDateTime(ackState.latest?.acknowledgedAt)}.` : "Capture a quick PPE acknowledgment for the current job or company safety guidance."} />
      <form className="co-toolbox-form-grid" onSubmit={onSubmit}>
        <SelectField label="Job" value={ackDraft.jobId} onChange={(event) => setAckDraft((current) => ({ ...current, jobId: event.target.value }))}>
          <option value="">General safety review</option>
          {allowedJobs.map((job) => <option key={job.id} value={job.id}>{job.label}</option>)}
        </SelectField>
        <SelectField label="Policy" value={ackDraft.policyId} onChange={(event) => setAckDraft((current) => ({ ...current, policyId: event.target.value }))}>
          <option value="">All current safety guidance</option>
          {visiblePolicies.filter((policy) => !policy.archivedAt).map((policy) => <option key={policy.id} value={policy.id}>{policy.title}</option>)}
        </SelectField>
        <div className="md:col-span-2">
          <TextAreaField label="Notes" value={ackDraft.notes} onChange={(event) => setAckDraft((current) => ({ ...current, notes: event.target.value }))} placeholder="PPE checked, extra protection noted, crew questions, site hazards..." />
        </div>
        <div className="md:col-span-2">
          <Button type="submit" className="w-full sm:w-auto" disabled={busy}>Acknowledge PPE check</Button>
        </div>
      </form>
      <div className="co-toolbox-ack-list">
        {(acknowledgments || []).slice(0, canManage ? 6 : 3).map((acknowledgment) => (
          <div key={acknowledgment.id}>
            <strong>{acknowledgment.policyTitle || "General safety & PPE review"}</strong>
            <span>{acknowledgment.userName}{acknowledgment.job?.title ? ` / ${acknowledgment.job.title}` : ""}</span>
            <em>{formatDateTime(acknowledgment.acknowledgedAt)}</em>
          </div>
        ))}
      </div>
    </Card>
  );
}

function PpeManagePanelPolished({ canManage, selectedPpeItem, setSelectedPpeId, ppeDraft, setPpeDraft, onPpeSubmit, onArchivePpeItem, busy }) {
  if (!canManage) {
    return (
      <Card className="co-toolbox-form-card p-4">
        <StateCard title="PPE management unavailable" description="Only office/admin roles can edit PPE requirements." tone="slate" />
      </Card>
    );
  }

  return (
    <Card className="co-toolbox-form-card p-4">
      <SectionHeader title={selectedPpeItem ? "Edit PPE Item" : "Add PPE Item"} description="Keep field requirements direct, concrete, and easy to scan before work starts." />
      <form className="co-toolbox-form-grid" onSubmit={onPpeSubmit}>
        <InputField label="Label" value={ppeDraft.label} onChange={(event) => setPpeDraft((current) => ({ ...current, label: event.target.value }))} />
        <label className="field-label">
          <span>Required by default</span>
          <div className="flex min-h-[2.75rem] items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700">
            <input type="checkbox" checked={ppeDraft.requiredByDefault} onChange={(event) => setPpeDraft((current) => ({ ...current, requiredByDefault: event.target.checked }))} />
            <span>Surface this item first in the PPE board.</span>
          </div>
        </label>
        <div className="md:col-span-2">
          <TextAreaField label="Description" value={ppeDraft.description} onChange={(event) => setPpeDraft((current) => ({ ...current, description: event.target.value }))} />
        </div>
        <div className="flex flex-wrap gap-2 md:col-span-2">
          <Button type="submit" disabled={busy || !ppeDraft.label}>Save PPE item</Button>
          {selectedPpeItem ? <Button type="button" variant="secondary" onClick={() => setSelectedPpeId("")}>New item</Button> : null}
          {selectedPpeItem ? <Button type="button" variant="danger" onClick={() => onArchivePpeItem(selectedPpeItem.id)} disabled={busy || Boolean(selectedPpeItem.archivedAt)}>Archive</Button> : null}
        </div>
      </form>
    </Card>
  );
}

function PpePolicyPanelPolished({ canManage, visiblePolicies, selectedPolicy, setSelectedPolicyId, policyDraft, setPolicyDraft, onPolicySubmit, onArchiveSafetyPolicy, busy }) {
  return (
    <Card className="co-toolbox-form-card p-4">
      <SectionHeader title="Safety Guidance" description={canManage ? "Policy guidance remains available here for office/admin edits." : "Field-safe guidance remains visible without office-only information."} />
      {visiblePolicies.length === 0 ? (
        <StateCard title="No safety policies yet" description={canManage ? "Safety guidance will appear here after office/admin creates it." : "Safety guidance will appear here when it is available for the crew."} tone="slate" />
      ) : (
        <div className="co-toolbox-ppe-list">
          {visiblePolicies.map((policy) => (
            <button key={policy.id} type="button" onClick={() => canManage ? setSelectedPolicyId(policy.id) : undefined} className={selectedPolicy?.id === policy.id ? "is-selected" : ""}>
              <span>
                <strong>{policy.title || "Untitled safety policy"}</strong>
                <em>{policy.category || "Safety"} / {policy.body || "No guidance text recorded yet."}</em>
              </span>
              <Badge tone={policy.archivedAt ? "slate" : "green"}>{policy.archivedAt ? "Archived" : policy.statusLabel || "Active"}</Badge>
            </button>
          ))}
        </div>
      )}
      {canManage ? (
        <form className="co-toolbox-form-grid mt-4" onSubmit={onPolicySubmit}>
          <InputField label="Title" value={policyDraft.title} onChange={(event) => setPolicyDraft((current) => ({ ...current, title: event.target.value }))} />
          <InputField label="Category" value={policyDraft.category} onChange={(event) => setPolicyDraft((current) => ({ ...current, category: event.target.value }))} />
          <div className="md:col-span-2">
            <TextAreaField label="Policy body" value={policyDraft.body} onChange={(event) => setPolicyDraft((current) => ({ ...current, body: event.target.value }))} />
          </div>
          <div className="flex flex-wrap gap-2 md:col-span-2">
            <Button type="submit" disabled={busy || !policyDraft.title || !policyDraft.body}>Save policy</Button>
            {selectedPolicy ? <Button type="button" variant="secondary" onClick={() => setSelectedPolicyId("")}>New policy</Button> : null}
            {selectedPolicy ? <Button type="button" variant="danger" onClick={() => onArchiveSafetyPolicy(selectedPolicy.id)} disabled={busy || Boolean(selectedPolicy.archivedAt)}>Archive</Button> : null}
          </div>
        </form>
      ) : null}
    </Card>
  );
}

function PpeIncidentToolsPanelPolished({
  canSubmitIncidents,
  canReview,
  allowedJobs,
  incidentDraft,
  setIncidentDraft,
  visibleIncidents,
  selectedIncident,
  setSelectedIncidentId,
  busy,
  onSubmitIncident,
  onReviewSafetyIncident,
  onResolveSafetyIncident,
  onArchiveSafetyIncident,
}) {
  return (
    <div className="grid gap-3 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
      <SafetyIncidentSubmitPanelPolished canSubmit={canSubmitIncidents} allowedJobs={allowedJobs} incidentDraft={incidentDraft} setIncidentDraft={setIncidentDraft} busy={busy} onSubmit={onSubmitIncident} />
      <Card className="co-toolbox-form-card p-4">
        <SectionHeader title="Safety Watch" description="PPE-related concerns remain available without taking over the PPE checklist." />
        {visibleIncidents.length === 0 ? (
          <StateCard title="No visible incidents" description="Safety concerns will appear here when they are in this user's allowed scope." tone="slate" />
        ) : (
          <div className="co-toolbox-ppe-list">
            {visibleIncidents.map((incident) => (
              <button key={incident.id} type="button" onClick={() => setSelectedIncidentId(incident.id)} className={selectedIncident?.id === incident.id ? "is-selected" : ""}>
                <span>
                  <strong>{incident.title || "Untitled safety item"}</strong>
                  <em>{safetyIncidentJobLabel(incident)} / {safetyIncidentReporterLabel(incident)}</em>
                </span>
                <Badge tone={safetyIncidentStatusTone(incident.status)}>{incident.statusLabel || incident.status || "Open"}</Badge>
              </button>
            ))}
          </div>
        )}
      </Card>
      <div className="xl:col-span-2">
        <SafetyIncidentDetailPanelPolished incident={selectedIncident} canReview={canReview} busy={busy} onReview={onReviewSafetyIncident} onResolve={onResolveSafetyIncident} onArchive={onArchiveSafetyIncident} />
      </div>
    </div>
  );
}

function PpeChecklistPagePolished({
  canManage,
  canAcknowledge,
  canSubmitIncidents,
  canReview,
  activePpeItems,
  visiblePolicies,
  acknowledgmentState,
  safetyAcknowledgments,
  allowedJobs,
  selectedPpeItem,
  setSelectedPpeId,
  ppeDraft,
  setPpeDraft,
  selectedPolicy,
  setSelectedPolicyId,
  policyDraft,
  setPolicyDraft,
  ackDraft,
  setAckDraft,
  incidentDraft,
  setIncidentDraft,
  visibleIncidents,
  selectedIncident,
  setSelectedIncidentId,
  onOpenIncidents = () => {},
  busy,
  onPpeSubmit,
  onArchivePpeItem,
  onPolicySubmit,
  onArchiveSafetyPolicy,
  onAcknowledge,
  onSubmitIncident,
  onReviewSafetyIncident,
  onResolveSafetyIncident,
  onArchiveSafetyIncident,
}) {
  const [requirementFilter, setRequirementFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [showTools, setShowTools] = useState(false);
  const [toolTab, setToolTab] = useState(canAcknowledge ? "ack" : "ppe");
  const [showAllMobilePpe, setShowAllMobilePpe] = useState(false);
  const toolsRef = useRef(null);
  const ppePolicies = useMemo(() => visiblePolicies.filter((policy) => String(policy.category || "").toLowerCase().includes("ppe") || `${policy.title || ""} ${policy.body || ""}`.toLowerCase().includes("ppe")), [visiblePolicies]);
  const filteredPpeItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return activePpeItems.filter((item) => {
      if (requirementFilter === "Required" && !item.requiredByDefault) return false;
      if (requirementFilter === "As needed" && item.requiredByDefault) return false;
      if (!query) return true;
      return [item.label, item.description, ppeItemRequirementLabel(item)].filter(Boolean).join(" ").toLowerCase().includes(query);
    });
  }, [activePpeItems, requirementFilter, search]);
  const selectedItem = filteredPpeItems.find((item) => item.id === selectedPpeItem?.id) || selectedPpeItem || filteredPpeItems[0] || activePpeItems[0] || null;
  const requiredCount = activePpeItems.filter((item) => item.requiredByDefault).length;
  const optionalCount = activePpeItems.length - requiredCount;
  const openIncidents = visibleIncidents.filter((incident) => !incident.archivedAt && !["resolved", "archived"].includes(String(incident.status || ""))).length;
  const mobilePpePreviewCap = canManage ? filteredPpeItems.length : 3;
  const mobileVisiblePpeCap = showAllMobilePpe ? filteredPpeItems.length : mobilePpePreviewCap;
  const mobileVisiblePpeCount = Math.min(filteredPpeItems.length, mobileVisiblePpeCap);
  const ppeKpis = [
    { label: "PPE Items", value: filteredPpeItems.length, helper: "Matching current view", icon: "hardhat", tone: "orange" },
    { label: "Required", value: requiredCount, helper: "Default crew checklist", icon: "check", tone: "green", actionLabel: "Required", onAction: () => setRequirementFilter("Required") },
    { label: "As Needed", value: optionalCount, helper: "Task-specific gear", icon: "layers", tone: "amber", actionLabel: "As needed", onAction: () => setRequirementFilter("As needed") },
    { label: "Acknowledgments", value: acknowledgmentState.count, helper: acknowledgmentState.hasAcknowledged ? "Latest user acknowledgment" : "No user acknowledgment yet", icon: "users", tone: acknowledgmentState.hasAcknowledged ? "green" : "slate" },
    { label: "Safety Watch", value: openIncidents, helper: "Open visible incidents", icon: "alert", tone: openIncidents ? "amber" : "green" },
  ];
  const filterOptions = ["All", "Required", "As needed"];

  function clearFilters() {
    setRequirementFilter("All");
    setSearch("");
    setShowAllMobilePpe(false);
  }

  function jumpToBoard() {
    setRequirementFilter("All");
    setShowAllMobilePpe(false);
    window.setTimeout(() => document.getElementById("ppe-readiness-board")?.scrollIntoView?.({ behavior: "smooth", block: "start" }), 0);
  }

  function openTools(nextTab = canAcknowledge ? "ack" : "ppe") {
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

  function openPriorityPpe(matchItem, options = {}) {
    const targetItem = filteredPpeItems.find(matchItem) || activePpeItems.find(matchItem);
    if (options.requirementFilter) setRequirementFilter(options.requirementFilter);
    if (options.search !== undefined) setSearch(options.search);
    if (targetItem?.id) setSelectedPpeId(targetItem.id);
    openTools(options.tool || (canManage ? "ppe" : (canAcknowledge ? "ack" : "policy")));
  }

  const requiredGearPriorityCard = {
    label: "Required gear",
    value: requiredCount,
    helper: requiredCount ? "Default protection is ready to review before the crew starts." : "No PPE items are marked required by default.",
    icon: "hardhat",
    tone: requiredCount ? "orange" : "slate",
    actionLabel: "Review required",
    onAction: () => openPriorityPpe((item) => item.requiredByDefault, { requirementFilter: "Required", tool: canManage ? "ppe" : (canAcknowledge ? "ack" : "policy") }),
  };
  const crewAcknowledgmentPriorityCard = {
    label: "Crew acknowledgment",
    value: acknowledgmentState.hasAcknowledged ? "Done" : "Open",
    helper: acknowledgmentState.hasAcknowledged ? `Latest acknowledgment ${formatDateTime(acknowledgmentState.latest?.acknowledgedAt)}.` : "Crew PPE expectations still need acknowledgment.",
    icon: "check",
    tone: acknowledgmentState.hasAcknowledged ? "green" : "amber",
    actionLabel: canAcknowledge ? "Acknowledge" : "View status",
    onAction: () => openTools(canAcknowledge ? "ack" : "policy"),
  };
  const safetyWatchPriorityCard = {
    label: "Safety watch",
    value: openIncidents,
    helper: openIncidents ? "Open visible safety concerns are tied into the PPE workflow." : "No open visible incidents in this safety scope.",
    icon: "alert",
    tone: openIncidents ? "amber" : "green",
    actionLabel: openIncidents ? "Open watch" : "All clear",
    onAction: () => openTools(canSubmitIncidents || canReview ? "incident" : "policy"),
  };
  const ppeSetupPriorityCard = {
    label: canManage ? "PPE setup" : "PPE guidance",
    value: canManage ? "Ready" : ppePolicies.length,
    helper: canManage ? "Manage equipment requirements without changing field permissions." : "Field-safe guidance stays available without admin controls.",
    icon: canManage ? "settings" : "clipboard",
    tone: canManage ? "orange" : "green",
    actionLabel: canManage ? "Manage" : "Guidance",
    onAction: () => openTools(canManage ? "ppe" : "policy"),
  };
  const ppePriorityCards = !canManage && canAcknowledge
    ? [crewAcknowledgmentPriorityCard, requiredGearPriorityCard, safetyWatchPriorityCard, ppeSetupPriorityCard]
    : filteredPpeItems.length === 0 && canManage
      ? [ppeSetupPriorityCard, requiredGearPriorityCard, crewAcknowledgmentPriorityCard, safetyWatchPriorityCard]
      : [requiredGearPriorityCard, crewAcknowledgmentPriorityCard, safetyWatchPriorityCard, ppeSetupPriorityCard];
  const adminMobilePpeQueue = useMemo(() => {
    return [...activePpeItems].sort((left, right) => {
      const requiredCompare = Number(Boolean(right.requiredByDefault)) - Number(Boolean(left.requiredByDefault));
      if (requiredCompare !== 0) return requiredCompare;
      return String(left.label || "").localeCompare(String(right.label || ""));
    }).slice(0, 3);
  }, [activePpeItems]);
  const selectedItemIsMobileVisible = Boolean(selectedItem?.id && activePpeItems.some((item) => item.id === selectedItem.id));
  const adminMobilePpeFocus = selectedItemIsMobileVisible ? selectedItem : adminMobilePpeQueue[0] || null;
  const adminMobilePpeBadge = openIncidents
    ? "Safety watch"
    : acknowledgmentState.hasAcknowledged
      ? "Acknowledged"
      : requiredCount
        ? "PPE check"
        : "Setup";
  const adminMobilePpeNextAction = openIncidents
    ? "Review open safety watch"
    : !acknowledgmentState.hasAcknowledged
      ? "Confirm PPE acknowledgment"
      : requiredCount
        ? "Review required protection"
        : "Add first PPE requirements";
  const adminMobilePpeNextMeta = adminMobilePpeFocus
    ? [
      adminMobilePpeFocus.label || "PPE item",
      ppeItemRequirementLabel(adminMobilePpeFocus),
      openIncidents ? `${openIncidents} safety watch open` : acknowledgmentState.hasAcknowledged ? "Acknowledged" : "Acknowledgment open",
    ].filter(Boolean).join(" / ")
    : "PPE reminders, acknowledgments, and safety watch items will appear here.";
  const adminMobilePpeStatusTiles = [
    { label: "Required", value: requiredCount, helper: "default gear", tone: requiredCount ? "orange" : "slate" },
    { label: "Ack", value: acknowledgmentState.hasAcknowledged ? "Done" : "Open", helper: "current user", tone: acknowledgmentState.hasAcknowledged ? "green" : "amber" },
    { label: "Watch", value: openIncidents, helper: "open safety", tone: openIncidents ? "amber" : "green" },
  ];

  function selectAdminMobilePpeItem(item = adminMobilePpeFocus || adminMobilePpeQueue[0]) {
    if (item?.id) setSelectedPpeId(item.id);
    if (item?.requiredByDefault) {
      setRequirementFilter("Required");
    } else {
      setRequirementFilter("All");
    }
    setSearch("");
  }

  function handleAdminMobilePpePrimaryAction() {
    if (openIncidents && typeof onOpenIncidents === "function") {
      onOpenIncidents();
      return;
    }
    selectAdminMobilePpeItem(adminMobilePpeFocus || adminMobilePpeQueue[0]);
  }

  function handleAdminMobilePpeSecondaryAction() {
    if (!acknowledgmentState.hasAcknowledged && adminMobilePpeFocus) {
      selectAdminMobilePpeItem(adminMobilePpeFocus);
      return;
    }
    clearFilters();
    if (adminMobilePpeQueue[0]?.id) setSelectedPpeId(adminMobilePpeQueue[0].id);
  }

  const adminMobilePpePrimaryLabel = openIncidents ? "Open Watch" : "Review Gear";
  const adminMobilePpeSecondaryLabel = !acknowledgmentState.hasAcknowledged ? "PPE Check" : "All Gear";

  return (
    <div className={`co-office-page co-toolbox-page co-ppe-page ${canManage ? "" : "co-field-tool-page"}`} data-field-workspace={canManage ? "false" : "true"}>
      <PageHeader
        eyebrow={canManage ? "Office Safety" : "Field Safety"}
        title="PPE Checklist"
        description={canManage ? "Review required jobsite protection, acknowledge current safety expectations, and keep PPE management close but uncluttered." : "Review required jobsite protection, acknowledge current safety expectations, and keep field concerns close."}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={jumpToBoard}>{filteredPpeItems.length} visible</Button>
            {canAcknowledge ? <Button type="button" onClick={() => openTools("ack")}>Acknowledge PPE</Button> : null}
          </div>
        }
      />

      {canManage ? (
        <section className="co-admin-mobile-ops-shell co-admin-mobile-ppe-shell" data-admin-mobile-ops-shell="ppe" aria-label="Admin mobile PPE command">
          <div className="co-admin-mobile-ops-head">
            <span>Office Safety</span>
            <h1>What needs PPE attention?</h1>
            <p>PPE triage for required gear, acknowledgments, and open safety watch items before work starts.</p>
          </div>

          <div className="co-admin-mobile-next-card" data-tone={openIncidents || !acknowledgmentState.hasAcknowledged ? "amber" : "green"}>
            <div className="co-admin-mobile-next-copy">
              <span>Today / Next Action</span>
              <strong>{adminMobilePpeNextAction}</strong>
              <p>{adminMobilePpeNextMeta}</p>
            </div>
            <Badge tone={openIncidents || !acknowledgmentState.hasAcknowledged ? "amber" : "green"}>{adminMobilePpeBadge}</Badge>
            <div className="co-admin-mobile-primary-actions">
              <Button type="button" onClick={handleAdminMobilePpePrimaryAction}>{adminMobilePpePrimaryLabel}</Button>
              <Button type="button" variant="secondary" onClick={handleAdminMobilePpeSecondaryAction}>{adminMobilePpeSecondaryLabel}</Button>
            </div>
          </div>

          <div className="co-admin-mobile-status-tiles" aria-label="PPE status">
            {adminMobilePpeStatusTiles.map((item) => (
              <div key={item.label} className="co-admin-mobile-status-tile" data-tone={item.tone}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <em>{item.helper}</em>
              </div>
            ))}
          </div>

          <section className="co-admin-mobile-queue-panel" aria-label="Top PPE queue">
            <div className="co-admin-mobile-panel-head">
              <span>Top 3</span>
              <strong>PPE queue</strong>
              <em>{adminMobilePpeQueue.length ? `${adminMobilePpeQueue.length} shown` : "Clear"}</em>
            </div>
            {adminMobilePpeQueue.length ? (
              <div className="co-admin-mobile-ppe-queue-list">
                {adminMobilePpeQueue.map((item) => {
                  const tone = item.requiredByDefault ? "amber" : "slate";
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`co-admin-mobile-queue-card ${item.id === adminMobilePpeFocus?.id ? "is-selected" : ""}`}
                      data-tone={tone}
                      onClick={() => selectAdminMobilePpeItem(item)}
                    >
                      <span>{ppeItemRequirementLabel(item)}</span>
                      <strong>{item.label || "PPE item"}</strong>
                      <em>{item.requiredByDefault ? "Default PPE requirement" : "Task-specific PPE item"}</em>
                      <b>{formatDateTime(item.updatedAt || item.createdAt)}</b>
                    </button>
                  );
                })}
              </div>
            ) : (
              <StateCard title="PPE setup needed" description="Admin PPE requirements will appear here after the first item is added from the full tablet or desktop workbench." tone="slate" />
            )}
          </section>

          <details className="co-admin-mobile-more-drawer">
            <summary>
              <span>More details</span>
              <strong>Visible, optional, guidance</strong>
              <em>Open only when needed</em>
            </summary>
            <div className="co-admin-mobile-more-grid">
              <span>
                <em>Visible</em>
                <strong>{activePpeItems.length}</strong>
                <b>PPE items</b>
              </span>
              <span>
                <em>As needed</em>
                <strong>{optionalCount}</strong>
                <b>items</b>
              </span>
              <span>
                <em>Guidance</em>
                <strong>{ppePolicies.length}</strong>
                <b>linked</b>
              </span>
            </div>
          </details>
        </section>
      ) : null}

      <PpeMobileFocusPanel
        item={selectedItem}
        filteredCount={filteredPpeItems.length}
        requiredCount={requiredCount}
        acknowledgmentState={acknowledgmentState}
        openIncidents={openIncidents}
        canAcknowledge={canAcknowledge}
        canSubmitIncidents={canSubmitIncidents}
        canManage={canManage}
        onAcknowledge={() => openTools(canAcknowledge ? "ack" : "policy")}
        onViewBoard={jumpToBoard}
        onOpenIncident={() => openTools(canSubmitIncidents || canReview ? "incident" : "policy")}
        onOpenTools={() => openTools(canManage ? "ppe" : "policy")}
      />

      {!canManage ? (
        <PpeFieldOperatorPanel
          selectedItem={selectedItem}
          filteredCount={filteredPpeItems.length}
          requiredCount={requiredCount}
          acknowledgmentState={acknowledgmentState}
          openIncidents={openIncidents}
          canAcknowledge={canAcknowledge}
          canSubmitIncidents={canSubmitIncidents}
          onOpenTool={openTools}
          onJumpToBoard={jumpToBoard}
        />
      ) : null}

      <div className="co-toolbox-kpi-grid mx-auto grid w-full max-w-[1520px] min-w-0 grid-cols-1 gap-3 px-5 pb-3 sm:px-6 md:grid-cols-3 2xl:grid-cols-5 lg:px-6">
        {ppeKpis.map((item) => <CommandCenterKpiCard key={item.label} item={item} />)}
      </div>

      <div className="co-toolbox-priority-grid mx-auto grid w-full max-w-[1520px] min-w-0 gap-3 px-5 pb-3 sm:px-6 md:grid-cols-2 xl:grid-cols-4 lg:px-6">
        {ppePriorityCards.map((card) => (
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

      <div className="co-toolbox-command-layout mx-auto grid w-full max-w-[1520px] min-w-0 gap-3 px-5 pb-4 sm:px-6 2xl:grid-cols-[minmax(0,1fr)_360px] lg:px-6">
        <div id="ppe-readiness-board" className="co-ppe-command-main min-w-0">
          <Card className="co-toolbox-main-board overflow-hidden">
            <div className="co-toolbox-board-header border-b border-slate-200 bg-white p-4">
              <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0">
                  <h2 className="text-base font-black uppercase tracking-[0.04em] text-slate-950">{canManage ? "PPE Readiness Board" : "PPE Queue"}</h2>
                  <p className="mt-1 text-sm font-bold leading-5 text-slate-600">{canManage ? "Scan required gear, task-specific protection, crew acknowledgment status, and safety guidance before work starts." : "Top required gear, acknowledgment status, and quick guidance."}</p>
                </div>
              </div>
            </div>
            <div className="co-toolbox-filter-strip border-b border-slate-200 bg-white p-3">
              <div className="co-toolbox-category-tabs">
                {filterOptions.map((option) => (
                  <button key={option} type="button" className={requirementFilter === option ? "is-active" : ""} onClick={() => setRequirementFilter(option)}>
                    {option}
                  </button>
                ))}
              </div>
              <input className="field-input co-toolbox-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search PPE gear..." />
            </div>
            {filteredPpeItems.length === 0 ? (
              <div className="p-5"><StateCard title={activePpeItems.length === 0 ? "No PPE items yet" : "No PPE items match these filters"} description={activePpeItems.length === 0 ? (canManage ? "Office/admin can add the first PPE item from the management drawer." : "PPE requirements will show here when they are available for the crew.") : "Clear the filter or search another equipment requirement."} tone="slate" /></div>
            ) : (
              <PpeChecklistTablePolished items={filteredPpeItems} selectedId={selectedItem?.id} onSelect={setSelectedPpeId} mobileMaxRows={mobileVisiblePpeCap} />
            )}
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3">
              <p className="text-sm font-bold text-slate-600">
                <span className="hidden lg:inline">Showing {filteredPpeItems.length} PPE item{filteredPpeItems.length === 1 ? "" : "s"} / {requiredCount} required / {optionalCount} as needed</span>
                <span className="lg:hidden">Showing {mobileVisiblePpeCount} of {filteredPpeItems.length} PPE item{filteredPpeItems.length === 1 ? "" : "s"} / {requiredCount} required / {optionalCount} as needed</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {filteredPpeItems.length > mobilePpePreviewCap ? (
                  <Button type="button" size="sm" variant="secondary" className="lg:hidden" onClick={() => setShowAllMobilePpe((current) => !current)}>
                    {showAllMobilePpe ? "Show fewer" : `Show all ${filteredPpeItems.length}`}
                  </Button>
                ) : null}
                <Button type="button" size="sm" variant="secondary" onClick={clearFilters}>Clear filters</Button>
              </div>
            </div>
          </Card>
          {!canManage ? (
            <div className="co-field-mobile-tool-surface co-ppe-mobile-tool-surface mt-3 lg:hidden">
              <div className="co-field-mobile-section-head">
                <span>
                  <strong>PPE tools</strong>
                  <em>Acknowledge, review guidance, or report a concern without opening a drawer.</em>
                </span>
              </div>
              <div className="co-field-mobile-tool-tabs" role="tablist" aria-label="PPE tools">
                {canAcknowledge ? <button type="button" className={toolTab === "ack" ? "is-active" : ""} onClick={() => changeToolTab("ack")}><Icon name="check" />Acknowledge</button> : null}
                <button type="button" className={toolTab === "policy" ? "is-active" : ""} onClick={() => changeToolTab("policy")}><Icon name="clipboard" />Guidance</button>
                {canSubmitIncidents || canReview ? <button type="button" className={toolTab === "incident" ? "is-active" : ""} onClick={() => changeToolTab("incident")}><Icon name="alert" />Safety Watch</button> : null}
              </div>
              <div className="co-field-mobile-tool-body">
                {toolTab === "ack" ? (
                  <PpeAcknowledgePanelPolished canAcknowledge={canAcknowledge} allowedJobs={allowedJobs} visiblePolicies={visiblePolicies} ackDraft={ackDraft} setAckDraft={setAckDraft} acknowledgments={safetyAcknowledgments} canManage={canManage} ackState={acknowledgmentState} busy={busy} onSubmit={onAcknowledge} />
                ) : toolTab === "incident" ? (
                  <PpeIncidentToolsPanelPolished canSubmitIncidents={canSubmitIncidents} canReview={canReview} allowedJobs={allowedJobs} incidentDraft={incidentDraft} setIncidentDraft={setIncidentDraft} visibleIncidents={visibleIncidents} selectedIncident={selectedIncident} setSelectedIncidentId={setSelectedIncidentId} busy={busy} onSubmitIncident={onSubmitIncident} onReviewSafetyIncident={onReviewSafetyIncident} onResolveSafetyIncident={onResolveSafetyIncident} onArchiveSafetyIncident={onArchiveSafetyIncident} />
                ) : (
                  <PpePolicyPanelPolished canManage={canManage} visiblePolicies={visiblePolicies} selectedPolicy={selectedPolicy} setSelectedPolicyId={setSelectedPolicyId} policyDraft={policyDraft} setPolicyDraft={setPolicyDraft} onPolicySubmit={onPolicySubmit} onArchiveSafetyPolicy={onArchiveSafetyPolicy} busy={busy} />
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
                <strong>PPE Tools</strong>
                <em>{canManage ? "Acknowledge PPE checks, manage equipment requirements, review safety guidance, and keep incident workflow available." : "Acknowledge PPE checks, review field-safe guidance, and report concerns without office controls."}</em>
              </span>
              <span>Open tools</span>
            </summary>
            <div className="co-toolbox-tool-tabs mt-3 flex min-w-0 gap-2 overflow-x-auto pb-1">
              {canAcknowledge ? <button type="button" className={toolTab === "ack" ? "is-active" : ""} onClick={() => changeToolTab("ack")}><Icon name="check" />Acknowledge</button> : null}
              {canManage ? <button type="button" className={toolTab === "ppe" ? "is-active" : ""} onClick={() => { if (selectedItem) setSelectedPpeId(selectedItem.id); changeToolTab("ppe"); }}><Icon name="hardhat" />PPE Setup</button> : null}
              <button type="button" className={toolTab === "policy" ? "is-active" : ""} onClick={() => changeToolTab("policy")}><Icon name="clipboard" />Guidance</button>
              {canSubmitIncidents || canReview ? <button type="button" className={toolTab === "incident" ? "is-active" : ""} onClick={() => changeToolTab("incident")}><Icon name="alert" />Safety Watch</button> : null}
            </div>
            <div className="co-toolbox-tools-panel mt-3">
              {toolTab === "ack" ? (
                <PpeAcknowledgePanelPolished canAcknowledge={canAcknowledge} allowedJobs={allowedJobs} visiblePolicies={visiblePolicies} ackDraft={ackDraft} setAckDraft={setAckDraft} acknowledgments={safetyAcknowledgments} canManage={canManage} ackState={acknowledgmentState} busy={busy} onSubmit={onAcknowledge} />
              ) : toolTab === "ppe" ? (
                <PpeManagePanelPolished canManage={canManage} selectedPpeItem={selectedPpeItem} setSelectedPpeId={setSelectedPpeId} ppeDraft={ppeDraft} setPpeDraft={setPpeDraft} onPpeSubmit={onPpeSubmit} onArchivePpeItem={onArchivePpeItem} busy={busy} />
              ) : toolTab === "incident" ? (
                <PpeIncidentToolsPanelPolished canSubmitIncidents={canSubmitIncidents} canReview={canReview} allowedJobs={allowedJobs} incidentDraft={incidentDraft} setIncidentDraft={setIncidentDraft} visibleIncidents={visibleIncidents} selectedIncident={selectedIncident} setSelectedIncidentId={setSelectedIncidentId} busy={busy} onSubmitIncident={onSubmitIncident} onReviewSafetyIncident={onReviewSafetyIncident} onResolveSafetyIncident={onResolveSafetyIncident} onArchiveSafetyIncident={onArchiveSafetyIncident} />
              ) : (
                <PpePolicyPanelPolished canManage={canManage} visiblePolicies={visiblePolicies} selectedPolicy={selectedPolicy} setSelectedPolicyId={setSelectedPolicyId} policyDraft={policyDraft} setPolicyDraft={setPolicyDraft} onPolicySubmit={onPolicySubmit} onArchiveSafetyPolicy={onArchiveSafetyPolicy} busy={busy} />
              )}
            </div>
          </details>
        </div>

        {canManage ? (
          <PpeCommandRailPolished
            item={selectedItem}
            canManage={canManage}
            canAcknowledge={canAcknowledge}
            canSubmitIncidents={canSubmitIncidents}
            acknowledgmentState={acknowledgmentState}
            policies={ppePolicies}
            incidents={visibleIncidents}
            onOpenTool={openTools}
            onSelectItem={setSelectedPpeId}
          />
        ) : null}
      </div>
    </div>
  );
}

export function SafetyPage({
  active,
  setActive,
  user,
  companySettings,
  permissions,
  jobs,
  safetyPolicies,
  ppeItems,
  safetyAcknowledgments,
  safetyIncidents,
  busy,
  errorMessage,
  onCreateSafetyPolicy,
  onSaveSafetyPolicy,
  onArchiveSafetyPolicy,
  onCreatePpeItem,
  onSavePpeItem,
  onArchivePpeItem,
  onAcknowledgeSafety,
  onCreateSafetyIncident,
  onReviewSafetyIncident,
  onResolveSafetyIncident,
  onArchiveSafetyIncident,
  onOpenSupport,
  assistantSafetyIncidentReviewSeed = null,
  onAssistantSafetyIncidentReviewSeedHandled = () => {},
}) {
  const incidentFocused = active === "incidents";
  const toolboxFocused = active === "toolbox";
  const ppeFocused = active === "ppe";
  const canManage = permissions.safety.canManage;
  const canAcknowledge = permissions.safety.canAcknowledge;
  const canSubmitIncidents = permissions.safety.canSubmitIncidents;
  const canReview = permissions.safety.canReviewIncidents;
  const allowedJobs = useMemo(() => deriveSafetyWorkspaceJobs(jobs), [jobs]);
  const visiblePolicies = useMemo(() => deriveVisibleSafetyPolicies(safetyPolicies, { includeArchived: canManage }), [canManage, safetyPolicies]);
  const activePpeItems = useMemo(() => deriveActivePpeItems(ppeItems), [ppeItems]);
  const acknowledgmentState = useMemo(() => deriveAcknowledgmentState(safetyAcknowledgments, user?.id), [safetyAcknowledgments, user?.id]);
  const incidentListState = useMemo(() => deriveSafetyIncidentListState(safetyIncidents), [safetyIncidents]);
  const [incidentStatusFilter, setIncidentStatusFilter] = useState("All");
  const [incidentTypeFilter, setIncidentTypeFilter] = useState("All types");
  const [incidentSeverityFilter, setIncidentSeverityFilter] = useState("All severities");
  const [incidentJobFilter, setIncidentJobFilter] = useState("All jobs");
  const [incidentReporterFilter, setIncidentReporterFilter] = useState("All reporters");
  const [incidentArchiveFilter, setIncidentArchiveFilter] = useState("Active only");
  const [incidentSearch, setIncidentSearch] = useState("");
  const [selectedPolicyId, setSelectedPolicyId] = useState("");
  const [selectedPpeId, setSelectedPpeId] = useState("");
  const [selectedIncidentId, setSelectedIncidentId] = useState("");
  const [policyDraft, setPolicyDraft] = useState(INITIAL_SAFETY_POLICY_FORM);
  const [ppeDraft, setPpeDraft] = useState(INITIAL_PPE_ITEM_FORM);
  const [ackDraft, setAckDraft] = useState(INITIAL_SAFETY_ACK_FORM);
  const [incidentDraft, setIncidentDraft] = useState(INITIAL_SAFETY_INCIDENT_FORM);
  const visibleIncidents = useMemo(() => filterSafetyIncidents(safetyIncidents, {
    status: incidentStatusFilter,
    type: incidentTypeFilter,
    severity: incidentSeverityFilter,
    jobId: incidentJobFilter,
    submittedBy: incidentReporterFilter,
    archived: incidentArchiveFilter,
    query: incidentSearch,
  }), [incidentArchiveFilter, incidentJobFilter, incidentReporterFilter, incidentSearch, incidentSeverityFilter, incidentStatusFilter, incidentTypeFilter, safetyIncidents]);
  const selectedPolicy = visiblePolicies.find((policy) => policy.id === selectedPolicyId) || null;
  const selectedPpeItem = ppeItems.find((item) => item.id === selectedPpeId) || null;
  const selectedIncident = visibleIncidents.find((incident) => incident.id === selectedIncidentId) || safetyIncidents.find((incident) => incident.id === selectedIncidentId) || null;

  useEffect(() => {
    const preferredJobId = allowedJobs.length === 1 ? allowedJobs[0].id : "";
    setAckDraft((current) => {
      if (current.jobId && allowedJobs.some((job) => job.id === current.jobId)) return current;
      return { ...current, jobId: preferredJobId };
    });
    setIncidentDraft((current) => {
      if (current.jobId && allowedJobs.some((job) => job.id === current.jobId)) return current;
      return { ...current, jobId: preferredJobId };
    });
  }, [allowedJobs]);

  useEffect(() => {
    if (!selectedPolicy) {
      setPolicyDraft(INITIAL_SAFETY_POLICY_FORM);
      return;
    }
    setPolicyDraft({
      title: selectedPolicy.title || "",
      body: selectedPolicy.body || "",
      category: selectedPolicy.category || "PPE",
    });
  }, [selectedPolicy]);

  useEffect(() => {
    if (!selectedPpeItem) {
      setPpeDraft(INITIAL_PPE_ITEM_FORM);
      return;
    }
    setPpeDraft({
      label: selectedPpeItem.label || "",
      description: selectedPpeItem.description || "",
      requiredByDefault: Boolean(selectedPpeItem.requiredByDefault),
    });
  }, [selectedPpeItem]);

  useEffect(() => {
    if (!selectedIncidentId && visibleIncidents[0]?.id) {
      setSelectedIncidentId(visibleIncidents[0].id);
      return;
    }
    if (selectedIncidentId && !visibleIncidents.some((incident) => incident.id === selectedIncidentId) && visibleIncidents[0]?.id) {
      setSelectedIncidentId(visibleIncidents[0].id);
    }
  }, [selectedIncidentId, visibleIncidents]);

  async function handlePolicySubmit(event) {
    event.preventDefault();
    if (selectedPolicy && canManage) {
      await onSaveSafetyPolicy(selectedPolicy.id, policyDraft);
      return;
    }
    const created = await onCreateSafetyPolicy(policyDraft);
    if (!created) return;
    setPolicyDraft(INITIAL_SAFETY_POLICY_FORM);
  }

  async function handlePpeSubmit(event) {
    event.preventDefault();
    if (selectedPpeItem && canManage) {
      await onSavePpeItem(selectedPpeItem.id, ppeDraft);
      return;
    }
    const created = await onCreatePpeItem(ppeDraft);
    if (!created) return;
    setPpeDraft(INITIAL_PPE_ITEM_FORM);
  }

  async function handleAcknowledge(event) {
    event.preventDefault();
    const acknowledged = await onAcknowledgeSafety(ackDraft);
    if (!acknowledged) return;
    setAckDraft((current) => ({ ...INITIAL_SAFETY_ACK_FORM, jobId: current.jobId }));
  }

  async function handleIncidentSubmit(event) {
    event.preventDefault();
    const created = await onCreateSafetyIncident(incidentDraft);
    if (!created) return;
    setIncidentDraft((current) => ({
      ...INITIAL_SAFETY_INCIDENT_FORM,
      jobId: current.jobId,
    }));
  }

  const headerTitle = canManage
    ? incidentFocused
      ? "Incidents"
      : toolboxFocused
        ? "Toolbox Talks"
        : ppeFocused
          ? "PPE Checklist"
          : "Safety & PPE"
    : incidentFocused
      ? "Report Incident"
      : toolboxFocused
        ? "Toolbox Talks"
        : ppeFocused
          ? "PPE Checklist"
          : "Safety";
  const headerDescription = incidentFocused
    ? "Submit, review, and track safety concerns, hazards, near misses, injuries, and property damage."
    : toolboxFocused
      ? "Review safety guidance and toolbox talk reminders before work starts."
      : ppeFocused
        ? "Review required PPE and acknowledge current safety expectations."
        : canManage
          ? "Manage field-safe policies, PPE expectations, acknowledgments, and incidents without exposing payroll or pricing."
          : "Review current safety guidance, acknowledge PPE, and submit field concerns without exposing office-only data.";
  const routeCallout = incidentFocused
    ? "Use this page when something happened on the job or the crew needs a safety concern documented."
    : toolboxFocused
      ? "Use this page for quick crew safety reminders, PPE expectations, and jobsite safety guidance."
      : ppeFocused
        ? "Use this page to confirm PPE expectations and field safety requirements."
        : "";
  const headerBadgeLabel = incidentFocused
    ? `${visibleIncidents.length} visible incidents`
    : toolboxFocused
      ? `${visiblePolicies.length} guidance items`
      : ppeFocused
        ? `${activePpeItems.length} PPE items`
        : `${visibleIncidents.length} visible incidents`;
  const openIncidentCount = visibleIncidents.filter((incident) => !incident.archivedAt && !["resolved", "archived"].includes(incident.status)).length;
  const safetyKpis = [
    { label: "Policies", value: visiblePolicies.length, helper: "Field-safe guidance", icon: "clipboard" },
    { label: "PPE Items", value: activePpeItems.length, helper: "Required equipment list", icon: "hardhat" },
    { label: "Open Incidents", value: openIncidentCount, helper: "Needs safety follow-up", icon: "alert" },
    { label: "Acknowledgments", value: acknowledgmentState.count, helper: acknowledgmentState.hasAcknowledged ? "Latest user acknowledgment" : "No user acknowledgment yet", icon: "check" },
  ];

  if (incidentFocused) {
    return (
      <SafetyIncidentsPagePolished
        user={user}
        companySettings={companySettings}
        permissions={permissions}
        setActive={setActive}
        canManage={canManage}
        canSubmitIncidents={canSubmitIncidents}
        canReview={canReview}
        allowedJobs={allowedJobs}
        incidentListState={incidentListState}
        incidentStatusFilter={incidentStatusFilter}
        setIncidentStatusFilter={setIncidentStatusFilter}
        incidentTypeFilter={incidentTypeFilter}
        setIncidentTypeFilter={setIncidentTypeFilter}
        incidentSeverityFilter={incidentSeverityFilter}
        setIncidentSeverityFilter={setIncidentSeverityFilter}
        incidentJobFilter={incidentJobFilter}
        setIncidentJobFilter={setIncidentJobFilter}
        incidentReporterFilter={incidentReporterFilter}
        setIncidentReporterFilter={setIncidentReporterFilter}
        incidentArchiveFilter={incidentArchiveFilter}
        setIncidentArchiveFilter={setIncidentArchiveFilter}
        incidentSearch={incidentSearch}
        setIncidentSearch={setIncidentSearch}
        incidentDraft={incidentDraft}
        setIncidentDraft={setIncidentDraft}
        visibleIncidents={visibleIncidents}
        allIncidents={safetyIncidents}
        selectedIncident={selectedIncident}
        setSelectedIncidentId={setSelectedIncidentId}
        busy={busy}
        errorMessage={errorMessage}
        onSubmitIncident={handleIncidentSubmit}
        onReviewSafetyIncident={onReviewSafetyIncident}
        onResolveSafetyIncident={onResolveSafetyIncident}
        onArchiveSafetyIncident={onArchiveSafetyIncident}
        onOpenSupport={onOpenSupport}
        assistantSafetyIncidentReviewSeed={assistantSafetyIncidentReviewSeed}
        onAssistantSafetyIncidentReviewSeedHandled={onAssistantSafetyIncidentReviewSeedHandled}
      />
    );
  }

  if (toolboxFocused) {
    return (
      <ToolboxTalksPagePolished
        canManage={canManage}
        canAcknowledge={canAcknowledge}
        visiblePolicies={visiblePolicies}
        activePpeItems={activePpeItems}
        acknowledgmentState={acknowledgmentState}
        safetyAcknowledgments={safetyAcknowledgments}
        allowedJobs={allowedJobs}
        selectedPolicy={selectedPolicy}
        setSelectedPolicyId={setSelectedPolicyId}
        policyDraft={policyDraft}
        setPolicyDraft={setPolicyDraft}
        selectedPpeItem={selectedPpeItem}
        setSelectedPpeId={setSelectedPpeId}
        ppeDraft={ppeDraft}
        setPpeDraft={setPpeDraft}
        ackDraft={ackDraft}
        setAckDraft={setAckDraft}
        busy={busy}
        onPolicySubmit={handlePolicySubmit}
        onArchiveSafetyPolicy={onArchiveSafetyPolicy}
        onPpeSubmit={handlePpeSubmit}
        onArchivePpeItem={onArchivePpeItem}
        onAcknowledge={handleAcknowledge}
      />
    );
  }

  if (ppeFocused) {
    return (
      <PpeChecklistPagePolished
        canManage={canManage}
        canAcknowledge={canAcknowledge}
        canSubmitIncidents={canSubmitIncidents}
        canReview={canReview}
        activePpeItems={activePpeItems}
        visiblePolicies={visiblePolicies}
        acknowledgmentState={acknowledgmentState}
        safetyAcknowledgments={safetyAcknowledgments}
        allowedJobs={allowedJobs}
        selectedPpeItem={selectedPpeItem}
        setSelectedPpeId={setSelectedPpeId}
        ppeDraft={ppeDraft}
        setPpeDraft={setPpeDraft}
        selectedPolicy={selectedPolicy}
        setSelectedPolicyId={setSelectedPolicyId}
        policyDraft={policyDraft}
        setPolicyDraft={setPolicyDraft}
        ackDraft={ackDraft}
        setAckDraft={setAckDraft}
        incidentDraft={incidentDraft}
        setIncidentDraft={setIncidentDraft}
        visibleIncidents={visibleIncidents}
        selectedIncident={selectedIncident}
        setSelectedIncidentId={setSelectedIncidentId}
        onOpenIncidents={() => setActive("incidents")}
        busy={busy}
        onPpeSubmit={handlePpeSubmit}
        onArchivePpeItem={onArchivePpeItem}
        onPolicySubmit={handlePolicySubmit}
        onArchiveSafetyPolicy={onArchiveSafetyPolicy}
        onAcknowledge={handleAcknowledge}
        onSubmitIncident={handleIncidentSubmit}
        onReviewSafetyIncident={onReviewSafetyIncident}
        onResolveSafetyIncident={onResolveSafetyIncident}
        onArchiveSafetyIncident={onArchiveSafetyIncident}
      />
    );
  }

  function renderPoliciesCard() {
    return (
      <Card className="p-4 md:p-5">
        <SectionHeader title={toolboxFocused ? "Toolbox guidance" : "Safety policies"} description={canManage ? "Company-wide policies stay editable here for office/admin roles." : "Field-safe policies stay visible here without office-only notes or money data."} />
        {visiblePolicies.length === 0 ? <StateCard title="No safety policies yet" description="Add the first policy to start the Safety & PPE module." tone="slate" /> : (
          <div className="space-y-3">
            {visiblePolicies.map((policy) => (
              <button
                key={policy.id}
                type="button"
                onClick={() => canManage ? setSelectedPolicyId(policy.id) : undefined}
                className={`w-full rounded-2xl border p-4 text-left ${selectedPolicy?.id === policy.id ? "border-blue-300 bg-blue-50/70" : "border-blue-100 bg-white"}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-slate-950">{policy.title}</p>
                    <p className="mt-1 text-xs font-bold text-slate-500">{policy.category}</p>
                  </div>
                  <Badge tone={policy.archivedAt ? "slate" : "green"}>{policy.statusLabel}</Badge>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{policy.body}</p>
              </button>
            ))}
          </div>
        )}
      </Card>
    );
  }

  function renderPpeCard() {
    return (
      <Card className="p-4 md:p-5">
        <SectionHeader title={toolboxFocused ? "PPE reminders" : "PPE checklist"} description="Default PPE stays visible to field users and editable only for office/admin." />
        {activePpeItems.length === 0 ? <StateCard title="No PPE items yet" description="Add the first PPE item to build the checklist." tone="slate" /> : (
          <div className="space-y-2">
            {activePpeItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => canManage ? setSelectedPpeId(item.id) : undefined}
                className={`w-full rounded-2xl border p-3 text-left ${selectedPpeItem?.id === item.id ? "border-blue-300 bg-blue-50/70" : "border-blue-100 bg-white"}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-slate-950">{item.label}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{item.description}</p>
                  </div>
                  <Badge tone={item.requiredByDefault ? "blue" : "slate"}>{item.requiredByDefault ? "Required" : "As needed"}</Badge>
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>
    );
  }

  function renderAcknowledgmentCard() {
    if (!canAcknowledge) return null;
    return (
      <Card className="p-4 md:p-5">
        <SectionHeader title={toolboxFocused ? "Acknowledge toolbox review" : ppeFocused ? "Acknowledge PPE check" : "Acknowledge safety & PPE"} description={acknowledgmentState.hasAcknowledged ? `Last acknowledged ${formatDateTime(acknowledgmentState.latest?.acknowledgedAt)}.` : "Capture a quick acknowledgment for your current work or general company safety guidance."} />
        <form className="grid gap-3" onSubmit={handleAcknowledge}>
          <SelectField label="Job" value={ackDraft.jobId} onChange={(event) => setAckDraft((current) => ({ ...current, jobId: event.target.value }))}>
            <option value="">General safety review</option>
            {allowedJobs.map((job) => <option key={job.id} value={job.id}>{job.label}</option>)}
          </SelectField>
          <SelectField label="Policy" value={ackDraft.policyId} onChange={(event) => setAckDraft((current) => ({ ...current, policyId: event.target.value }))}>
            <option value="">All current safety guidance</option>
            {visiblePolicies.filter((policy) => !policy.archivedAt).map((policy) => <option key={policy.id} value={policy.id}>{policy.title}</option>)}
          </SelectField>
          <TextAreaField label="Notes" value={ackDraft.notes} onChange={(event) => setAckDraft((current) => ({ ...current, notes: event.target.value }))} placeholder="Crew brief complete, PPE checked, silica controls discussed..." />
          <Button type="submit" disabled={busy}>Acknowledge</Button>
        </form>
        <div className="mt-4 space-y-2">
          {(safetyAcknowledgments || []).slice(0, canManage ? 6 : 3).map((acknowledgment) => (
            <div key={acknowledgment.id} className="rounded-2xl border border-blue-100 bg-blue-50/40 p-3">
              <p className="text-sm font-black text-slate-950">{acknowledgment.policyTitle || "General safety & PPE review"}</p>
              <p className="mt-1 text-xs text-slate-500">{acknowledgment.userName}{acknowledgment.job?.title ? ` - ${acknowledgment.job.title}` : ""}</p>
              <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">{formatDateTime(acknowledgment.acknowledgedAt)}</p>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow={canManage ? "Office Safety" : "Field Safety"}
        title={headerTitle}
        description={headerDescription}
        actions={<Badge tone="blue">{headerBadgeLabel}</Badge>}
      />
      <ModuleKpiStrip items={safetyKpis} />
      {routeCallout ? (
        <div className="px-5 pb-4 sm:px-6 lg:px-8">
          <Card className="p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-700">When to use this page</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{routeCallout}</p>
          </Card>
        </div>
      ) : null}
      <div className="grid min-w-0 gap-4 px-5 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:px-8">
        <div className="min-w-0 space-y-4">
          {toolboxFocused ? renderPoliciesCard() : null}
          {toolboxFocused ? renderAcknowledgmentCard() : null}
          {ppeFocused ? renderPpeCard() : null}
          {ppeFocused ? renderAcknowledgmentCard() : null}
          {canSubmitIncidents ? (
            <Card className="p-4 md:p-5">
              <SectionHeader
                title={incidentFocused ? "Submit concern or incident" : "Report incident"}
                description={allowedJobs.length === 0 ? "No assigned job is on your device yet. You can still submit a general safety concern." : "Job options stay scoped to the work you are allowed to see."}
              />
              <form className="grid gap-3" onSubmit={handleIncidentSubmit}>
                <div className="grid gap-3 md:grid-cols-2">
                  <SelectField label="Job" value={incidentDraft.jobId} onChange={(event) => setIncidentDraft((current) => ({ ...current, jobId: event.target.value }))}>
                    <option value="">General safety concern</option>
                    {allowedJobs.map((job) => <option key={job.id} value={job.id}>{job.label}</option>)}
                  </SelectField>
                  <SelectField label="Type" value={incidentDraft.type} onChange={(event) => setIncidentDraft((current) => ({ ...current, type: event.target.value }))}>
                    <option value="concern">Concern</option>
                    <option value="hazard">Hazard</option>
                    <option value="near_miss">Near miss</option>
                    <option value="injury">Injury</option>
                    <option value="property_damage">Property damage</option>
                    <option value="other">Other</option>
                  </SelectField>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <SelectField label="Severity" value={incidentDraft.severity} onChange={(event) => setIncidentDraft((current) => ({ ...current, severity: event.target.value }))}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </SelectField>
                  <InputField label="Title" value={incidentDraft.title} onChange={(event) => setIncidentDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Wet slab edge, exposed rebar, blocked access..." />
                </div>
                <TextAreaField label="Description" value={incidentDraft.description} onChange={(event) => setIncidentDraft((current) => ({ ...current, description: event.target.value }))} placeholder="What happened, where it was, and what the crew should know next." />
                <TextAreaField label="Immediate action" value={incidentDraft.immediateAction} onChange={(event) => setIncidentDraft((current) => ({ ...current, immediateAction: event.target.value }))} placeholder="Stopped work, taped off area, called foreman, moved material..." />
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" disabled={busy || !incidentDraft.title || !incidentDraft.description}>Submit safety item</Button>
                </div>
              </form>
            </Card>
          ) : null}

          <Card className="overflow-hidden">
            <div className="p-4 md:p-5">
              <SectionHeader title="Incidents & concerns" description={canManage ? "Review, resolve, and archive field submissions across the company." : "Only incidents in your allowed field scope appear here."} />
            </div>
            <div className="grid gap-3 border-y border-blue-100 bg-blue-50/35 p-3 md:grid-cols-2 xl:grid-cols-3">
              <SelectField label="Status" value={incidentStatusFilter} onChange={(event) => setIncidentStatusFilter(event.target.value)}>
                <option>All</option>
                <option value="open">Open</option>
                <option value="reviewed">Reviewed</option>
                <option value="resolved">Resolved</option>
                <option value="archived">Archived</option>
              </SelectField>
              <SelectField label="Type" value={incidentTypeFilter} onChange={(event) => setIncidentTypeFilter(event.target.value)}>
                <option>All types</option>
                <option value="concern">Concern</option>
                <option value="hazard">Hazard</option>
                <option value="near_miss">Near miss</option>
                <option value="injury">Injury</option>
                <option value="property_damage">Property damage</option>
                <option value="other">Other</option>
              </SelectField>
              <SelectField label="Severity" value={incidentSeverityFilter} onChange={(event) => setIncidentSeverityFilter(event.target.value)}>
                <option>All severities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </SelectField>
              <SelectField label="Job" value={incidentJobFilter} onChange={(event) => setIncidentJobFilter(event.target.value)}>
                <option>All jobs</option>
                {incidentListState.jobOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </SelectField>
              <SelectField label="Submitted by" value={incidentReporterFilter} onChange={(event) => setIncidentReporterFilter(event.target.value)}>
                <option>All reporters</option>
                {incidentListState.reporterOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </SelectField>
              <SelectField label="Archive" value={incidentArchiveFilter} onChange={(event) => setIncidentArchiveFilter(event.target.value)}>
                <option>Active only</option>
                <option>Archived only</option>
                <option>All</option>
              </SelectField>
              <div className="md:col-span-2 xl:col-span-3">
                <input className="field-input w-full" value={incidentSearch} onChange={(event) => setIncidentSearch(event.target.value)} placeholder="Search incident title, description, job, or reporter..." />
              </div>
            </div>
            {errorMessage && visibleIncidents.length === 0 ? (
              <div className="p-5"><StateCard title="Safety incidents unavailable" description={errorMessage} tone="red" /></div>
            ) : visibleIncidents.length === 0 ? (
              <div className="p-5"><StateCard title="No incidents yet" description="Submitted concerns and incidents will appear here as soon as the field starts using the safety workflow." tone="slate" /></div>
            ) : (
              <div className="space-y-3 p-4">
                {visibleIncidents.map((incident) => (
                  <button
                    key={incident.id}
                    type="button"
                    onClick={() => setSelectedIncidentId(incident.id)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${selectedIncident?.id === incident.id ? "border-blue-300 bg-blue-50/70" : "border-blue-100 bg-white hover:border-blue-200 hover:bg-blue-50/40"}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-black text-slate-950">{incident.title}</p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">{incident.job?.title || "General safety concern"} - {incident.submittedByName}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge tone={safetySeverityTone(incident.severity)}>{safetyIncidentTypeLabel(incident.type)}</Badge>
                        <Badge tone={incident.status === "resolved" ? "green" : incident.status === "reviewed" ? "blue" : incident.status === "archived" ? "slate" : "amber"}>{incident.statusLabel}</Badge>
                      </div>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{incident.description}</p>
                    <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">{formatDateTime(incident.createdAt)}</p>
                  </button>
                ))}
              </div>
            )}
          </Card>

          {!toolboxFocused ? (
          <Card className="p-4 md:p-5">
            <SectionHeader title="Safety policies" description={canManage ? "Company-wide policies stay editable here for office/admin roles." : "Field-safe policies stay visible here without office-only notes or money data."} />
            {visiblePolicies.length === 0 ? <StateCard title="No safety policies yet" description="Add the first policy to start the Safety & PPE module." tone="slate" /> : (
              <div className="space-y-3">
                {visiblePolicies.map((policy) => (
                  <button
                    key={policy.id}
                    type="button"
                    onClick={() => canManage ? setSelectedPolicyId(policy.id) : undefined}
                    className={`w-full rounded-2xl border p-4 text-left ${selectedPolicy?.id === policy.id ? "border-blue-300 bg-blue-50/70" : "border-blue-100 bg-white"}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-black text-slate-950">{policy.title}</p>
                        <p className="mt-1 text-xs font-bold text-slate-500">{policy.category}</p>
                      </div>
                      <Badge tone={policy.archivedAt ? "slate" : "green"}>{policy.statusLabel}</Badge>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{policy.body}</p>
                  </button>
                ))}
              </div>
            )}
          </Card>
          ) : null}
        </div>

        <div className="min-w-0 space-y-4">
          {!ppeFocused ? (
          <Card className="p-4 md:p-5">
            <SectionHeader title="PPE checklist" description="Default PPE stays visible to field users and editable only for office/admin." />
            {activePpeItems.length === 0 ? <StateCard title="No PPE items yet" description="Add the first PPE item to build the checklist." tone="slate" /> : (
              <div className="space-y-2">
                {activePpeItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => canManage ? setSelectedPpeId(item.id) : undefined}
                    className={`w-full rounded-2xl border p-3 text-left ${selectedPpeItem?.id === item.id ? "border-blue-300 bg-blue-50/70" : "border-blue-100 bg-white"}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-black text-slate-950">{item.label}</p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">{item.description}</p>
                      </div>
                      <Badge tone={item.requiredByDefault ? "blue" : "slate"}>{item.requiredByDefault ? "Required" : "As needed"}</Badge>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>
          ) : null}

          {canAcknowledge && !toolboxFocused && !ppeFocused ? (
            <Card className="p-4 md:p-5">
              <SectionHeader title="Acknowledge safety & PPE" description={acknowledgmentState.hasAcknowledged ? `Last acknowledged ${formatDateTime(acknowledgmentState.latest?.acknowledgedAt)}.` : "Capture a quick acknowledgment for your current work or general company safety guidance."} />
              <form className="grid gap-3" onSubmit={handleAcknowledge}>
                <SelectField label="Job" value={ackDraft.jobId} onChange={(event) => setAckDraft((current) => ({ ...current, jobId: event.target.value }))}>
                  <option value="">General safety review</option>
                  {allowedJobs.map((job) => <option key={job.id} value={job.id}>{job.label}</option>)}
                </SelectField>
                <SelectField label="Policy" value={ackDraft.policyId} onChange={(event) => setAckDraft((current) => ({ ...current, policyId: event.target.value }))}>
                  <option value="">All current safety guidance</option>
                  {visiblePolicies.filter((policy) => !policy.archivedAt).map((policy) => <option key={policy.id} value={policy.id}>{policy.title}</option>)}
                </SelectField>
                <TextAreaField label="Notes" value={ackDraft.notes} onChange={(event) => setAckDraft((current) => ({ ...current, notes: event.target.value }))} placeholder="Crew brief complete, PPE checked, silica controls discussed..." />
                <Button type="submit" disabled={busy}>Acknowledge</Button>
              </form>
              <div className="mt-4 space-y-2">
                {(safetyAcknowledgments || []).slice(0, canManage ? 6 : 3).map((acknowledgment) => (
                  <div key={acknowledgment.id} className="rounded-2xl border border-blue-100 bg-blue-50/40 p-3">
                    <p className="text-sm font-black text-slate-950">{acknowledgment.policyTitle || "General safety & PPE review"}</p>
                    <p className="mt-1 text-xs text-slate-500">{acknowledgment.userName}{acknowledgment.job?.title ? ` - ${acknowledgment.job.title}` : ""}</p>
                    <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">{formatDateTime(acknowledgment.acknowledgedAt)}</p>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          {selectedIncident ? (
            <Card className="p-4 md:p-5">
              <SectionHeader title="Incident detail" description={selectedIncident.job?.title || "General safety concern"} action={<Badge tone={safetySeverityTone(selectedIncident.severity)}>{selectedIncident.severity}</Badge>} />
              <p className="text-sm font-black text-slate-950">{selectedIncident.title}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{selectedIncident.description}</p>
              {selectedIncident.immediateAction ? (
                <div className="mt-3 rounded-2xl border border-blue-100 bg-blue-50/50 p-3">
                  <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Immediate action</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{selectedIncident.immediateAction}</p>
                </div>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge tone="slate">{safetyIncidentTypeLabel(selectedIncident.type)}</Badge>
                <Badge tone={selectedIncident.status === "resolved" ? "green" : selectedIncident.status === "reviewed" ? "blue" : selectedIncident.status === "archived" ? "slate" : "amber"}>{selectedIncident.statusLabel}</Badge>
              </div>
              {canReview ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" onClick={() => onReviewSafetyIncident(selectedIncident.id)} disabled={busy || selectedIncident.status === "reviewed" || selectedIncident.status === "resolved" || selectedIncident.status === "archived"}>Review</Button>
                  <Button type="button" onClick={() => onResolveSafetyIncident(selectedIncident.id)} disabled={busy || selectedIncident.status === "resolved" || selectedIncident.status === "archived"}>Resolve</Button>
                  <Button type="button" variant="danger" onClick={() => onArchiveSafetyIncident(selectedIncident.id)} disabled={busy || Boolean(selectedIncident.archivedAt)}>Archive</Button>
                </div>
              ) : null}
            </Card>
          ) : null}

          {canManage ? (
            <>
              <Card className="p-4 md:p-5">
                <SectionHeader title={selectedPolicy ? "Edit safety policy" : "Create safety policy"} description="Keep the language practical for the field. Avoid legal or pricing content here." />
                <form className="grid gap-3" onSubmit={handlePolicySubmit}>
                  <InputField label="Title" value={policyDraft.title} onChange={(event) => setPolicyDraft((current) => ({ ...current, title: event.target.value }))} />
                  <InputField label="Category" value={policyDraft.category} onChange={(event) => setPolicyDraft((current) => ({ ...current, category: event.target.value }))} />
                  <TextAreaField label="Policy body" value={policyDraft.body} onChange={(event) => setPolicyDraft((current) => ({ ...current, body: event.target.value }))} />
                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" disabled={busy || !policyDraft.title || !policyDraft.body}>Save policy</Button>
                    {selectedPolicy ? <Button type="button" variant="secondary" onClick={() => setSelectedPolicyId("")}>New policy</Button> : null}
                    {selectedPolicy ? <Button type="button" variant="danger" onClick={() => onArchiveSafetyPolicy(selectedPolicy.id)} disabled={busy || Boolean(selectedPolicy.archivedAt)}>Archive</Button> : null}
                  </div>
                </form>
              </Card>

              <Card className="p-4 md:p-5">
                <SectionHeader title={selectedPpeItem ? "Edit PPE item" : "Add PPE item"} description="Required-by-default items stay surfaced first for field crews." />
                <form className="grid gap-3" onSubmit={handlePpeSubmit}>
                  <InputField label="Label" value={ppeDraft.label} onChange={(event) => setPpeDraft((current) => ({ ...current, label: event.target.value }))} />
                  <TextAreaField label="Description" value={ppeDraft.description} onChange={(event) => setPpeDraft((current) => ({ ...current, description: event.target.value }))} />
                  <label className="field-label">
                    <span>Required by default</span>
                    <div className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm font-bold text-slate-700">
                      <input type="checkbox" checked={ppeDraft.requiredByDefault} onChange={(event) => setPpeDraft((current) => ({ ...current, requiredByDefault: event.target.checked }))} />
                      <span>Surface this item at the top of the PPE checklist.</span>
                    </div>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" disabled={busy || !ppeDraft.label}>Save PPE item</Button>
                    {selectedPpeItem ? <Button type="button" variant="secondary" onClick={() => setSelectedPpeId("")}>New item</Button> : null}
                    {selectedPpeItem ? <Button type="button" variant="danger" onClick={() => onArchivePpeItem(selectedPpeItem.id)} disabled={busy || Boolean(selectedPpeItem.archivedAt)}>Archive</Button> : null}
                  </div>
                </form>
              </Card>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
