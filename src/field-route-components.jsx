import { useEffect, useState } from "react";

import { Badge, Button, Card, Icon, SectionHeader, StateCard, StatusBadge } from "./app-shell-components";
import { jobStatusLabel, jobTitle } from "./job-utils";

export function FieldActionGrid({ actions, onOpen }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {actions.map((action) => {
        const canOpen = Boolean(action.moduleId);
        return (
          <button
            key={action.title}
            type="button"
            onClick={() => canOpen ? onOpen(action.moduleId) : undefined}
            disabled={!canOpen}
            aria-disabled={!canOpen}
            className={`rounded-3xl border border-blue-100 bg-white p-4 text-left transition ${
              canOpen
                ? "hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50/50"
                : "cursor-not-allowed opacity-70"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${canOpen ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-400"}`}>
                <Icon name={action.icon} className="h-5 w-5" />
              </div>
              <Badge tone={action.tone || "slate"}>{action.badge || "Ready"}</Badge>
            </div>
            <p className="mt-4 text-base font-black text-slate-950">{action.title}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{action.description}</p>
          </button>
        );
      })}
    </div>
  );
}

export function FieldFactStrip({ items, className = "" }) {
  const safeItems = Array.isArray(items) ? items.filter(Boolean) : [];
  if (safeItems.length === 0) return null;

  return (
    <div className={`co-field-operator-strip ${className}`.trim()}>
      {safeItems.map((item) => (
        <div key={item.id || item.label} data-tone={item.tone || "slate"}>
          <span>{item.label}</span>
          <strong>{item.value ?? "-"}</strong>
        </div>
      ))}
    </div>
  );
}

export function FieldMobileActionGrid({ actions, className = "" }) {
  const safeActions = Array.isArray(actions) ? actions.filter(Boolean) : [];
  if (safeActions.length === 0) return null;

  return (
    <div className={`co-field-mobile-action-grid ${className}`.trim()}>
      {safeActions.map((action) => (
        <button
          key={action.id || action.label}
          type="button"
          data-tone={action.tone || "slate"}
          onClick={action.onClick}
          disabled={action.disabled}
        >
          {action.icon ? <Icon name={action.icon} /> : null}
          <span>{action.label}</span>
          {action.helper ? <em>{action.helper}</em> : null}
        </button>
      ))}
    </div>
  );
}

export function FieldOperatorPanelShell({
  className = "",
  badges = [],
  title,
  description,
  metaIcon = "briefcase",
  meta,
  actions = [],
  facts = [],
}) {
  const safeBadges = Array.isArray(badges) ? badges.filter(Boolean) : [];
  const safeActions = Array.isArray(actions) ? actions.filter(Boolean) : [];

  return (
    <Card className={`co-field-operator-panel ${className} overflow-hidden`.trim()}>
      <div className="co-field-operator-shell">
        <div className="co-field-operator-copy min-w-0">
          {safeBadges.length ? (
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              {safeBadges.map((badge, index) => (
                badge?.label
                  ? <Badge key={badge.id || badge.label} tone={badge.tone || "slate"}>{badge.label}</Badge>
                  : <span key={badge?.key || index} className="contents">{badge}</span>
              ))}
            </div>
          ) : null}
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
          {meta ? (
            <div className="co-field-operator-address">
              <Icon name={metaIcon} />
              <span>{meta}</span>
            </div>
          ) : null}
        </div>

        {safeActions.length ? (
          <div className="co-field-operator-actions">
            {safeActions.map((action) => (
              action.href ? (
                <a
                  key={action.id || action.label}
                  className="co-field-operator-link"
                  href={action.href}
                  target={action.target || "_blank"}
                  rel={action.rel || "noreferrer"}
                >
                  {action.label}
                  <Icon name={action.icon || "arrowUpRight"} />
                </a>
              ) : (
                <Button
                  key={action.id || action.label}
                  type="button"
                  variant={action.variant}
                  disabled={action.disabled}
                  onClick={action.onClick}
                >
                  {action.icon ? <Icon name={action.icon} /> : null}
                  {action.label}
                </Button>
              )
            ))}
          </div>
        ) : null}
      </div>

      <FieldFactStrip items={facts} />
    </Card>
  );
}

const FIELD_MOBILE_NAV_ORDER = [
  { id: "jobs", label: "Jobs", icon: "briefcase" },
  { id: "time", label: "Clock", icon: "clock" },
  { id: "uploads", label: "Photos", icon: "upload" },
  { id: "reports", label: "Reports", icon: "document" },
  { id: "prePour", label: "Pre-Pour", icon: "clipboard" },
  { id: "postPour", label: "Post-Pour", icon: "clipboard" },
  { id: "deliveryTickets", label: "Tickets", icon: "clipboard" },
  { id: "ppe", label: "PPE", icon: "hardhat" },
  { id: "incidents", label: "Incidents", icon: "alert" },
  { id: "toolChecklist", label: "Tools", icon: "clipboard" },
  { id: "calculator", label: "Calc", icon: "calculator" },
  { id: "changeOrders", label: "Change", icon: "refresh" },
  { id: "support", label: "Help", icon: "help" },
];

const MOBILE_NAV_COMPACT_LABELS = {
  commandCenter: "Command",
  communications: "Comms",
  uploads: "Photos",
  deliveryTickets: "Tickets",
  jobDraftImports: "Imports",
  changeOrders: "Changes",
  toolbox: "Toolbox",
  toolChecklist: "Tools",
};

export function getFieldMobileNavItems(visibleNavItems) {
  const visibleById = new Map((visibleNavItems || []).map((item) => [item.id, item]));
  const orderedItems = FIELD_MOBILE_NAV_ORDER
    .map((item) => {
      const visible = visibleById.get(item.id);
      return visible ? { ...visible, label: item.label, icon: item.icon || visible.icon } : null;
    })
    .filter(Boolean);
  const orderedIds = new Set(orderedItems.map((item) => item.id));
  return [
    ...orderedItems,
    ...(visibleNavItems || []).filter((item) => !orderedIds.has(item.id)),
  ];
}

export function FieldMobileQuickNav({ items, active, onOpen }) {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const safeItems = items || [];
  const primaryLimit = safeItems.length > 5 ? 4 : 5;
  const primaryItems = safeItems.slice(0, primaryLimit);
  const overflowItems = safeItems.slice(primaryLimit);
  const activeInOverflow = overflowItems.some((item) => item.id === active);

  useEffect(() => {
    setIsMoreOpen(false);
  }, [active, safeItems.length]);

  if (!safeItems.length) return null;

  function handleOpen(itemId) {
    setIsMoreOpen(false);
    onOpen(itemId);
    window.setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 0);
  }

  return (
    <nav className="co-mobile-bottom-nav mobile-nav-safe fixed bottom-0 left-0 right-0 z-40 border-t border-blue-100 bg-white/95 px-2 py-2 backdrop-blur lg:hidden" aria-label="Mobile navigation">
      {overflowItems.length ? (
        <div className="co-mobile-bottom-nav-more-panel" hidden={!isMoreOpen}>
          {overflowItems.map((item) => (
            <button key={item.id} type="button" onClick={() => handleOpen(item.id)}>
              <Icon name={item.icon || "grid"} className="h-4 w-4" />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      ) : null}
      <div className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {primaryItems.map((item) => {
          const isActive = active === item.id;
          const mobileLabel = MOBILE_NAV_COMPACT_LABELS[item.id] || item.label;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleOpen(item.id)}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
              className={`co-mobile-bottom-nav-button flex min-w-[74px] shrink-0 flex-col items-center justify-center rounded-2xl border px-3 py-2 text-[11px] font-black transition ${isActive ? "is-active border-blue-700 bg-blue-700 text-white shadow-panel" : "border-blue-100 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50"}`}
            >
              <Icon name={item.icon || "grid"} className="h-4 w-4" />
              <span className="mt-1 block max-w-[68px] truncate">{mobileLabel}</span>
            </button>
          );
        })}
        {overflowItems.length ? (
          <button
            type="button"
            onClick={() => setIsMoreOpen((current) => !current)}
            aria-expanded={isMoreOpen}
            aria-current={activeInOverflow ? "page" : undefined}
            className={`co-mobile-bottom-nav-button co-mobile-bottom-nav-more-toggle flex min-w-[74px] shrink-0 flex-col items-center justify-center rounded-2xl border px-3 py-2 text-[11px] font-black transition ${isMoreOpen || activeInOverflow ? "is-active border-blue-700 bg-blue-700 text-white shadow-panel" : "border-blue-100 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50"}`}
          >
            <Icon name="grid" className="h-4 w-4" />
            <span className="mt-1 block max-w-[68px] truncate">More</span>
          </button>
        ) : null}
      </div>
    </nav>
  );
}

export function FieldDetailDisclosure({ title, summary, children, defaultOpen = false }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="co-mobile-field-group rounded-2xl border border-blue-100 bg-white">
      <button type="button" className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left" aria-expanded={isOpen} onClick={() => setIsOpen((current) => !current)}>
        <span className="min-w-0">
          <span className="block text-sm font-black text-slate-950">{title}</span>
          {summary ? <span className="mt-1 block break-words text-xs font-bold leading-5 text-slate-500">{summary}</span> : null}
        </span>
        <span className="co-mobile-toggle-pill shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-black text-blue-700">{isOpen ? "Hide ^" : "Show v"}</span>
      </button>
      {isOpen ? <div className="border-t border-blue-100 p-4">
        {children}
      </div> : null}
    </div>
  );
}

export function FieldWorkspaceDisclosure({ title, description, badge, defaultOpen = false, children }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  useEffect(() => {
    if (defaultOpen) setIsOpen(true);
  }, [defaultOpen]);

  return (
    <div className="co-mobile-accordion panel-sheen w-full min-w-0 max-w-full rounded-3xl border border-blue-100 bg-white/95 shadow-panel">
      <button type="button" className="flex w-full cursor-pointer items-start justify-between gap-3 p-5 text-left" aria-expanded={isOpen} onClick={() => setIsOpen((current) => !current)}>
        <span className="min-w-0">
          <span className="block text-base font-black text-slate-950">{title}</span>
          {description ? <span className="mt-1 block break-words text-sm leading-5 text-slate-500">{description}</span> : null}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {badge ? <Badge tone="slate">{badge}</Badge> : null}
          <span className="co-mobile-toggle-pill rounded-full bg-blue-50 px-2.5 py-1 text-xs font-black text-blue-700">{isOpen ? "Hide ^" : "Show v"}</span>
        </span>
      </button>
      {isOpen ? <div className="border-t border-blue-100 p-5">
        {children}
      </div> : null}
    </div>
  );
}

function formatJobScheduleDetail(job) {
  if (!job?.scheduledStart) return "Schedule pending";
  const startLabel = formatDateTime(job.scheduledStart);
  if (!job?.scheduledEnd) {
    return job?.estimatedDuration ? `${startLabel} - ${job.estimatedDuration}` : startLabel;
  }
  return `${startLabel} to ${formatDateTime(job.scheduledEnd)}`;
}

function isTomorrowSchedule(job, now = new Date()) {
  if (!job?.scheduledStart) return false;
  const scheduled = new Date(job.scheduledStart);
  if (Number.isNaN(scheduled.getTime())) return false;
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return scheduled.getFullYear() === tomorrow.getFullYear()
    && scheduled.getMonth() === tomorrow.getMonth()
    && scheduled.getDate() === tomorrow.getDate();
}

function formatDateTime(value) {
  if (!value) return "Not recorded";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Not recorded";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}

function directionsUrl(address = "") {
  const trimmed = String(address || "").trim();
  return trimmed ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trimmed)}` : "";
}

export function FieldJobSummaryCard({ job, selected, onSelect, note = "" }) {
  const crewCount = Array.isArray(job?.crewAssignments) ? job.crewAssignments.length : 0;

  return (
    <button
      type="button"
      onClick={() => onSelect(job.id)}
      className={`co-mobile-record-card co-field-job-summary-card w-full rounded-3xl border p-4 text-left transition ${selected ? "is-selected border-blue-300 bg-blue-50/80 shadow-panel" : "border-blue-100 bg-white hover:border-blue-200 hover:bg-blue-50/50"}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-lg font-black text-slate-950">{jobTitle(job)}</p>
          <p className="mt-1 text-sm font-bold text-slate-500">{job.customer || "Assigned site"}</p>
        </div>
        <StatusBadge status={jobStatusLabel(job.status || job.stage)} />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Schedule</p>
          <p className="mt-1 text-sm font-bold text-slate-700">{formatJobScheduleDetail(job)}</p>
        </div>
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Address</p>
          <p className="mt-1 text-sm font-bold text-slate-700">{job.address || "Address pending"}</p>
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-600">{job.scopeSummary || "Scope summary pending."}</p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {note ? <Badge tone="orange">{note}</Badge> : null}
        <Badge tone="slate">{crewCount} crew</Badge>
        {job.siteContact ? <Badge tone="violet">Site contact ready</Badge> : null}
        <span className="co-field-open-pill">Open details</span>
      </div>
    </button>
  );
}

export function FieldAssignmentNoticePanel({ notices, onSelectJob, onAcknowledge, disabled }) {
  const visibleNotices = Array.isArray(notices) ? notices : [];
  if (visibleNotices.length === 0) return null;

  return (
    <Card className="co-field-assignment-board border-amber-100 bg-amber-50/70 p-5">
      <SectionHeader
        title={visibleNotices.length === 1 ? "New job assignment" : "New job assignments"}
        description="Review where to be, when to arrive, and field notes from the office."
        action={<Badge tone="amber">{visibleNotices.length} notice{visibleNotices.length === 1 ? "" : "s"}</Badge>}
      />
      <div className="co-field-assignment-list">
        {visibleNotices.map((notice) => {
          const job = notice.job;
          const mapUrl = directionsUrl(job?.address);
          return (
            <div key={notice.id} className="co-field-notice-card rounded-3xl border border-amber-100 bg-white p-4">
              <div className="co-field-notice-heading flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-words text-lg font-black text-slate-950">{jobTitle(job)}</p>
                  <p className="mt-1 break-words text-sm font-bold text-slate-600">{job?.customer || "Assigned site"}</p>
                </div>
                <Badge tone="amber">Please acknowledge</Badge>
              </div>
              <div className="co-field-notice-list mt-3">
                <div>
                  <span>When</span>
                  <strong>{formatJobScheduleDetail(job)}</strong>
                </div>
                <div>
                  <span>Where</span>
                  <strong>{job?.address || "Address pending"}</strong>
                  {mapUrl ? (
                    <a className="co-field-notice-link" href={mapUrl} target="_blank" rel="noreferrer">
                      Open directions
                    </a>
                  ) : null}
                </div>
                <div>
                  <span>Foreman</span>
                  <strong>{job?.foremanAssignment?.userName || job?.assignedForemanName || "Unassigned"}</strong>
                </div>
                <div className="co-field-notice-wide">
                  <span>Field notes</span>
                  <strong>{job?.fieldNotes || "No field notes yet."}</strong>
                </div>
              </div>
              <div className="co-field-notice-actions mt-3 flex flex-wrap gap-2">
                <Button type="button" size="sm" className="co-field-touch-target" onClick={() => onAcknowledge(job.id)} disabled={disabled}>
                  <Icon name="check" />
                  Got it
                </Button>
                <Button type="button" size="sm" className="co-field-touch-target" variant="secondary" onClick={() => onSelectJob(job.id)}>
                  View job details
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export function FieldNextJobCard({ job, titleOverride = "", descriptionOverride = "", onSelect, setActive, permissions, activeEntry }) {
  const title = titleOverride || (job && isTomorrowSchedule(job) ? "Tomorrow's job" : "Next assigned job");
  const mapUrl = directionsUrl(job?.address);
  const crewCount = Array.isArray(job?.crewAssignments) ? job.crewAssignments.length : 0;
  const canRoute = typeof setActive === "function";

  return (
    <Card className="co-field-next-job-card p-5">
      <SectionHeader
        title={title}
        description={descriptionOverride || "Primary field assignment with the fastest safe actions for this role."}
        action={job ? <Badge tone="orange">Field-safe</Badge> : null}
      />
      {job ? (
        <div className="co-field-next-job-highlight rounded-3xl border border-blue-100 bg-blue-50/50 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="break-words text-xl font-black text-slate-950">{jobTitle(job)}</p>
              <p className="mt-1 break-words text-sm font-bold text-slate-600">{job.customer || "Assigned site"}</p>
            </div>
            <StatusBadge status={jobStatusLabel(job.status || job.stage)} />
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-blue-100 bg-white p-3">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">When</p>
              <p className="mt-1 text-sm font-bold leading-6 text-slate-700">{formatJobScheduleDetail(job)}</p>
            </div>
            <div className="rounded-2xl border border-blue-100 bg-white p-3">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Where</p>
              <p className="mt-1 break-words text-sm font-bold leading-6 text-slate-700">{job.address || "Address pending"}</p>
              {mapUrl ? (
                <a className="mt-2 inline-flex min-h-[2rem] items-center text-xs font-black uppercase tracking-[0.14em] text-blue-700 hover:text-blue-900" href={mapUrl} target="_blank" rel="noreferrer">
                  Open directions
                </a>
              ) : null}
            </div>
          </div>
          <div className="mt-4">
            <FieldDetailDisclosure title="More job notes" summary="Foreman, crew, field notes, materials, equipment, and safety">
              <div className="grid gap-3 lg:grid-cols-3">
                <div className="rounded-2xl border border-blue-100 bg-white p-3">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Foreman</p>
                  <p className="mt-1 text-sm font-bold leading-6 text-slate-700">{job.foremanAssignment?.userName || job.assignedForemanName || "Unassigned"}</p>
                </div>
                <div className="rounded-2xl border border-blue-100 bg-white p-3">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Crew</p>
                  <p className="mt-1 text-sm font-bold leading-6 text-slate-700">{crewCount} crew assigned</p>
                </div>
                <div className="rounded-2xl border border-blue-100 bg-white p-3">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Field notes</p>
                  <p className="mt-1 text-sm leading-6 text-slate-700">{job.fieldNotes || "No field notes yet."}</p>
                </div>
                <div className="rounded-2xl border border-blue-100 bg-white p-3">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Materials</p>
                  <p className="mt-1 text-sm leading-6 text-slate-700">{job.materialNotes || "No material notes yet."}</p>
                </div>
                <div className="rounded-2xl border border-blue-100 bg-white p-3">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Equipment</p>
                  <p className="mt-1 text-sm leading-6 text-slate-700">{job.equipmentNotes || "No equipment notes yet."}</p>
                </div>
                <div className="rounded-2xl border border-blue-100 bg-white p-3">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Safety</p>
                  <p className="mt-1 text-sm leading-6 text-slate-700">{job.safetyNotes || "No safety notes yet."}</p>
                </div>
              </div>
            </FieldDetailDisclosure>
          </div>
          <div className="co-field-next-job-actions mt-4 flex flex-wrap gap-2">
            {permissions?.time?.canView && canRoute ? (
              <Button type="button" size="sm" onClick={() => setActive("time")}>
                <Icon name="clock" />
                {activeEntry ? "Open time" : "Clock in"}
              </Button>
            ) : null}
            {permissions?.reports?.canView && canRoute ? (
              <Button type="button" size="sm" variant="secondary" onClick={() => setActive("reports")}>
                <Icon name="document" />
                Daily report
              </Button>
            ) : null}
            {permissions?.uploads?.canView && canRoute ? (
              <Button type="button" size="sm" variant="secondary" onClick={() => setActive("uploads")}>
                <Icon name="upload" />
                Photos
              </Button>
            ) : null}
            <Button type="button" size="sm" onClick={() => onSelect(job.id)}>
              View job details
            </Button>
          </div>
        </div>
      ) : (
        <StateCard title="No scheduled assigned job yet" description="When office schedules and assigns a job, the next one will appear here with address and field notes." tone="slate" />
      )}
    </Card>
  );
}
