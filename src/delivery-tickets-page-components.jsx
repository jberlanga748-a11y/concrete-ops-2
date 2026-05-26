import { useEffect, useMemo, useRef, useState } from "react";

import {
  Badge,
  Button,
  Card,
  DesktopCommandDrawer,
  DesktopCommandWorkspaceFrame,
  FilterBar,
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
import { buildDeliveryTicketSupportContext, deliveryTicketTitle, deriveDeliveryTicketCloseoutReadiness, deriveDeliveryTicketListState, filterDeliveryTickets } from "./delivery-ticket-utils";
import { FieldOperatorPanelShell } from "./field-route-components";
import { jobTitle } from "./job-utils";
import { fetchAuthenticatedUploadPreviewUrl } from "./upload-preview-utils";

function formatDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
const INITIAL_DELIVERY_TICKET_FORM = {
  jobId: "",
  reportId: "",
  supplier: "",
  truckNumber: "",
  ticketNumber: "",
  yardsDelivered: "",
  arrivalTime: "",
  dischargeTime: "",
  psi: "",
  slump: "",
  mixNotes: "",
  notes: "",
  ticketUploadId: "",
};

function DeliveryTicketMobileAccordionCard({ title, summary, badge, defaultOpen = false, children }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`co-mobile-accordion rounded-2xl border bg-white/95 shadow-sm md:hidden ${isOpen ? "is-open border-blue-200" : "border-blue-100"}`}>
      <button type="button" className="flex w-full cursor-pointer items-center justify-between gap-3 px-3 py-2.5 text-left" aria-expanded={isOpen} onClick={() => setIsOpen((current) => !current)}>
        <span className="min-w-0">
          <span className="block truncate text-sm font-black text-slate-950">{title}</span>
          {summary ? <span className="mt-0.5 block truncate text-xs font-bold text-slate-500">{summary}</span> : null}
        </span>
        <span className="flex shrink-0 items-center gap-1.5">
          {badge}
          <span className={`co-mobile-toggle-pill inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-black ${isOpen ? "is-active bg-blue-700 text-white" : "bg-blue-50 text-blue-700"}`}>
            {isOpen ? "Hide" : "Show"}
            <span aria-hidden="true">{isOpen ? "^" : "v"}</span>
          </span>
        </span>
      </button>
      {isOpen ? <div className="border-t border-blue-100 p-2.5">
        {children}
      </div> : null}
    </div>
  );
}

function DeliveryTicketMobileFieldGroup({ title, summary, defaultOpen = false, children }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="co-mobile-field-group rounded-2xl border border-blue-100 bg-white">
      <button type="button" className="flex w-full cursor-pointer items-center justify-between gap-3 px-3 py-2.5 text-left" aria-expanded={isOpen} onClick={() => setIsOpen((current) => !current)}>
        <span className="min-w-0">
          <span className="block text-sm font-black text-slate-950">{title}</span>
          {summary ? <span className="mt-0.5 block text-xs font-bold text-slate-500">{summary}</span> : null}
        </span>
        <span className="co-mobile-toggle-pill shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-black text-blue-700">{isOpen ? "Hide ^" : "Show v"}</span>
      </button>
      {isOpen ? <div className="grid gap-3 border-t border-blue-100 p-3">
        {children}
      </div> : null}
    </div>
  );
}

function deliveryTicketYardsLabel(ticket) {
  const yards = Number(ticket?.yardsDelivered || 0);
  if (!Number.isFinite(yards) || yards <= 0) return "0 yd";
  const label = Number.isInteger(yards) ? String(yards) : yards.toFixed(1).replace(/\.0$/, "");
  return `${label} yd`;
}

function deliveryTicketPrimaryTime(ticket) {
  return ticket?.arrivalTime || ticket?.createdAt;
}

function deliveryTicketDateKey(ticket) {
  return dailyReportDateKey(ticket?.createdAt || deliveryTicketPrimaryTime(ticket));
}

function deliveryTicketJobId(ticket) {
  return ticket?.jobId || ticket?.job?.id || "";
}

function DeliveryTicketsTablePolished({ rows, selectedId, onSelect, isFieldDeliveryWorkspace = false }) {
  const [showAllFieldMobile, setShowAllFieldMobile] = useState(false);
  const fieldMobileLimit = 2;
  const fieldMobileRows = showAllFieldMobile ? rows : rows.slice(0, fieldMobileLimit);
  const hiddenFieldMobileCount = Math.max(rows.length - fieldMobileRows.length, 0);

  function handleMobileListToggle(event) {
    const drawer = event.currentTarget;
    if (!drawer.open) return;
    if (!window.matchMedia?.("(max-width: 767px)")?.matches) return;
    window.setTimeout(() => {
      drawer.scrollIntoView?.({ behavior: "smooth", block: "start" });
    }, 0);
  }

  function renderTicketCards(displayRows = rows, { compact = false } = {}) {
    return (
      <div className={`co-delivery-mobile-list grid gap-3 p-3 ${compact ? "is-field-queue" : ""}`.trim()}>
        {displayRows.map((ticket) => {
          const selected = ticket.id === selectedId;

          return (
            <button
              key={ticket.id}
              type="button"
              onClick={() => onSelect(ticket.id)}
              className={`co-delivery-mobile-card co-mobile-record-card w-full rounded-[1.05rem] border p-4 text-left transition ${selected ? "is-selected border-orange-200 bg-orange-50/75" : "border-slate-200 bg-white hover:border-orange-200 hover:bg-orange-50/35"}`}
            >
              <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="break-words text-base font-black text-slate-950">{deliveryTicketTitle(ticket)}</p>
                  <p className="mt-1 break-words text-xs font-bold text-slate-500">{ticket.job?.title || "Assigned job"} / {ticket.supplier || "Supplier pending"}</p>
                </div>
                {ticket.archivedAt ? <Badge tone="slate">Archived</Badge> : <Badge tone={ticket.ticketUploadId ? "green" : "orange"}>{deliveryTicketYardsLabel(ticket)}</Badge>}
              </div>
              <div className="co-delivery-mobile-metrics">
                <span>Truck <strong>{ticket.truckNumber || "Not set"}</strong></span>
                <span>Arrival <strong>{formatDateTime(deliveryTicketPrimaryTime(ticket))}</strong></span>
                <span>Links <strong>{ticket.ticketUploadId ? "Photo" : ticket.reportId ? "Report" : "Needed"}</strong></span>
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <>
      {isFieldDeliveryWorkspace ? (
        <div className="co-delivery-field-mobile-queue md:hidden">
          <div className="co-field-mobile-section-head">
            <span>
              <strong>Ticket queue</strong>
              <em>Top {Math.min(rows.length, fieldMobileLimit)} delivery ticket{Math.min(rows.length, fieldMobileLimit) === 1 ? "" : "s"} for the field</em>
            </span>
            <b>{rows.length}</b>
          </div>
          {renderTicketCards(fieldMobileRows, { compact: true })}
          {rows.length > 3 ? (
            <button type="button" className="co-delivery-field-mobile-more" onClick={() => setShowAllFieldMobile((current) => !current)}>
              {showAllFieldMobile ? `Show top ${fieldMobileLimit}` : `Show ${hiddenFieldMobileCount} more`}
            </button>
          ) : null}
        </div>
      ) : (
        <details className="co-delivery-mobile-list-drawer md:hidden" onToggle={handleMobileListToggle}>
          <summary>
            <span>
              <strong>Tickets in view</strong>
              <em>{rows.length} delivery ticket{rows.length === 1 ? "" : "s"} ready for review</em>
            </span>
            <span>{rows.length}</span>
          </summary>
          {renderTicketCards()}
        </details>
      )}
      <div className="co-delivery-tablet-list-surface hidden md:block lg:hidden">
        <div className="co-field-mobile-section-head">
          <span>
            <strong>Tickets in view</strong>
            <em>{rows.length} delivery ticket{rows.length === 1 ? "" : "s"} ready for review</em>
          </span>
          <b>{rows.length}</b>
        </div>
        {renderTicketCards()}
      </div>
      <div className="co-delivery-list-scroll hidden min-w-0 overflow-auto lg:block">
        <table className="co-delivery-command-table w-full min-w-[900px] text-left">
          <thead>
            <tr>
              <th>Ticket / Job</th>
              <th>Supplier</th>
              <th>Truck</th>
              <th>Yards</th>
              <th>Arrival</th>
              <th>Links</th>
              <th>Open</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((ticket) => {
              const selected = ticket.id === selectedId;

              return (
                <tr key={ticket.id} onClick={() => onSelect(ticket.id)} className={`cursor-pointer transition hover:bg-orange-50/45 ${selected ? "bg-orange-50/70" : ""}`}>
                  <td>
                    <p className="font-black text-slate-950">{deliveryTicketTitle(ticket)}</p>
                    <p className="text-xs font-bold text-slate-500">{ticket.job?.title || "Assigned job"} / {ticket.job?.customer || "Customer pending"}</p>
                  </td>
                  <td className="font-bold text-slate-700">{ticket.supplier || "Supplier pending"}</td>
                  <td className="font-bold text-slate-700">{ticket.truckNumber || "Not set"}</td>
                  <td><Badge tone={Number(ticket.yardsDelivered || 0) > 0 ? "green" : "slate"}>{deliveryTicketYardsLabel(ticket)}</Badge></td>
                  <td className="font-bold text-slate-700">{formatDateTime(deliveryTicketPrimaryTime(ticket))}</td>
                  <td>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge tone={ticket.ticketUploadId ? "green" : "slate"}>{ticket.ticketUploadId ? "Photo" : "No photo"}</Badge>
                      <Badge tone={ticket.reportId ? "orange" : "slate"}>{ticket.reportId ? "Report" : "No report"}</Badge>
                    </div>
                  </td>
                  <td>
                    <button type="button" className="co-delivery-icon-button" onClick={(event) => { event.stopPropagation(); onSelect(ticket.id); }} aria-label={`Open delivery ticket ${ticket.id}`}>
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

function DeliveryTicketCloseoutReadinessCard({ readiness }) {
  if (!readiness) return null;

  return (
    <Card className="co-delivery-rail-card p-4">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-orange-700">Delivery closeout</p>
          <h3 className="mt-2 text-base font-black leading-tight text-slate-950">{readiness.status}</h3>
          <p className="mt-1 text-xs font-bold leading-5 text-slate-600">{readiness.nextAction} before delivery proof is ready for office review.</p>
        </div>
        <Badge tone={readiness.tone}>{readiness.readyTickets} ready</Badge>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-slate-200 bg-white p-2">
          <span className="block text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Active</span>
          <strong className="mt-1 block text-sm font-black text-slate-950">{readiness.activeTickets}</strong>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-2">
          <span className="block text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Gaps</span>
          <strong className="mt-1 block text-sm font-black text-slate-950">{readiness.jobsWithGaps}</strong>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-2">
          <span className="block text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Unlinked</span>
          <strong className="mt-1 block text-sm font-black text-slate-950">{readiness.unlinkedTickets}</strong>
        </div>
      </div>
      <div className="mt-3 grid gap-2">
        {readiness.topJobs.length ? readiness.topJobs.map((job) => (
          <div key={job.jobId} className="rounded-xl border border-slate-200 bg-white p-2.5">
            <div className="flex min-w-0 items-center justify-between gap-2">
              <p className="min-w-0 truncate text-xs font-black text-slate-900">{job.label}</p>
              <Badge tone={job.tone}>{deliveryTicketYardsLabel({ yardsDelivered: job.yards })}</Badge>
            </div>
            <p className="mt-1 text-[11px] font-bold leading-4 text-slate-500">{job.tickets} ticket{job.tickets === 1 ? "" : "s"} / {job.readyTickets} ready</p>
            <p className="mt-1 text-[11px] font-bold leading-4 text-slate-600">{job.blockers.length ? job.blockers.slice(0, 2).join(" / ") : "Truck, ticket, photo, and report links are complete."}</p>
          </div>
        )) : (
          <StateCard title="No active tickets" description="Delivery ticket proof will appear here once field tickets are recorded." tone="slate" />
        )}
      </div>
      <p className="mt-3 text-[11px] font-bold leading-5 text-slate-500">
        Review-only. This does not invoice, bill, contact customers, or change job status.
      </p>
    </Card>
  );
}

function DeliveryTicketsCommandRailPolished({
  ticket,
  closeoutReadiness,
  canCreate,
  canManageAll,
  canEditSelected,
  busy,
  sessionToken,
  linkedUploadError,
  onOpenTool,
  onOpenLinkedUpload,
  onArchive,
}) {
  if (!ticket) {
    return (
      <div className="co-delivery-right-rail space-y-4">
        <Card className="co-delivery-rail-card p-4">
          <SectionHeader title="Ticket Console" description="Select a delivery ticket or create a new field record." />
          <div className="co-delivery-empty-rail">
            <span><Icon name="clipboard" /></span>
            <strong>No ticket selected</strong>
            <p>Choose a row to review truck, supplier, yardage, daily-report link, photo status, and field notes.</p>
          </div>
          {canCreate ? <Button type="button" className="mt-3 w-full" onClick={() => onOpenTool("create")}>New Ticket</Button> : null}
        </Card>
        {canManageAll ? <DeliveryTicketCloseoutReadinessCard readiness={closeoutReadiness} /> : null}
      </div>
    );
  }

  return (
    <div className="co-delivery-right-rail space-y-4">
      <Card className="co-delivery-rail-card p-4">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Selected delivery</p>
            <h3 className="mt-2 break-words text-xl font-black leading-tight text-slate-950">{deliveryTicketTitle(ticket)}</h3>
            <p className="mt-1 break-words text-xs font-black text-slate-500">{ticket.job?.title || "Assigned job"} / {ticket.supplier || "Supplier pending"}</p>
          </div>
          {ticket.archivedAt ? <StatusBadge status="Archived" /> : <Badge tone={ticket.ticketUploadId ? "green" : "orange"}>{deliveryTicketYardsLabel(ticket)}</Badge>}
        </div>

        <div className="co-delivery-selected-metrics">
          <div>
            <span>Truck</span>
            <strong>{ticket.truckNumber || "Not set"}</strong>
          </div>
          <div>
            <span>Arrival</span>
            <strong>{formatDateTime(deliveryTicketPrimaryTime(ticket))}</strong>
          </div>
          <div>
            <span>Mix</span>
            <strong>{ticket.psi ? `${ticket.psi} PSI` : "PSI open"}</strong>
          </div>
          <div>
            <span>Report</span>
            <strong>{ticket.report?.reportDate || "Not linked"}</strong>
          </div>
        </div>

        <div className="co-delivery-note-panel">
          <span>Mix / notes</span>
          <p>{ticket.mixNotes || ticket.notes || "No mix notes recorded yet."}</p>
        </div>

        {ticket.ticketUpload ? (
          <div className="co-delivery-upload-panel">
            <span>Linked photo</span>
            <p>{ticket.ticketUpload.caption || ticket.ticketUpload.fileName}</p>
            <button
              type="button"
              onClick={() => onOpenLinkedUpload(ticket.ticketUpload)}
              disabled={!ticket.ticketUpload.contentUrl || !sessionToken}
            >
              Open linked upload
            </button>
            {linkedUploadError ? <p className="text-red-600">{linkedUploadError}</p> : null}
          </div>
        ) : null}

        <div className="co-delivery-rail-actions mt-3 grid grid-cols-2 gap-2">
          <Button type="button" size="sm" onClick={() => onOpenTool("details")}>{canEditSelected ? "Edit Ticket" : "Review"}</Button>
          {canCreate ? <Button type="button" size="sm" variant="secondary" onClick={() => onOpenTool("create")}>New Ticket</Button> : null}
          {canManageAll ? <Button type="button" size="sm" variant="danger" onClick={() => onArchive(ticket.id)} disabled={busy || ticket.archivedAt}>Archive</Button> : null}
        </div>
      </Card>

      {canManageAll ? <DeliveryTicketCloseoutReadinessCard readiness={closeoutReadiness} /> : null}

      <Card className="co-delivery-rail-card p-4">
        <SectionHeader title="Ticket Readiness" description="Delivery records are strongest when the core field links are complete." />
        <div className="co-delivery-readiness-list">
          <span data-state={ticket.jobId ? "ready" : "needs"}>Job link <strong>{ticket.jobId ? "Set" : "Needed"}</strong></span>
          <span data-state={ticket.ticketNumber || ticket.truckNumber ? "ready" : "needs"}>Ticket info <strong>{ticket.ticketNumber || ticket.truckNumber ? "Set" : "Needed"}</strong></span>
          <span data-state={ticket.yardsDelivered ? "ready" : "needs"}>Yardage <strong>{ticket.yardsDelivered ? "Logged" : "Needed"}</strong></span>
          <span data-state={ticket.ticketUploadId ? "ready" : "needs"}>Photo <strong>{ticket.ticketUploadId ? "Linked" : "Optional"}</strong></span>
        </div>
      </Card>
    </div>
  );
}

function DeliveryTicketsFieldOperatorPanel({
  ticket,
  filteredRows,
  visibleJobs,
  todayCount,
  currentJobTicketCount,
  currentJobLabel,
  missingPhotoCount,
  missingReportCount,
  incompleteBasicsCount,
  deliveryNextAction,
  deliveryNextDetail,
  canCreate,
  canEditSelected,
  onOpenTool,
  onJumpToBoard,
  onOpenMissingPhoto,
  onOpenReportGap,
  onOpenBasicsGap,
}) {
  const hasTicket = Boolean(ticket);
  const summaryItems = [
    { label: "Today", value: todayCount, tone: todayCount ? "orange" : "slate" },
    { label: "Current job", value: currentJobTicketCount, tone: currentJobTicketCount ? "blue" : "slate" },
    { label: "Need photo", value: missingPhotoCount, tone: missingPhotoCount ? "amber" : "green" },
    { label: "Need report", value: missingReportCount, tone: missingReportCount ? "amber" : "green" },
  ];
  const fieldBadges = [
    { label: "Field Tickets", tone: "orange" },
    { label: canCreate ? "Create ready" : "Read only", tone: canCreate ? "green" : "slate" },
    missingPhotoCount ? { label: `${missingPhotoCount} photo gap${missingPhotoCount === 1 ? "" : "s"}`, tone: "amber" } : { label: "Photo clear", tone: "green" },
  ];
  const fieldActions = [
    canCreate
      ? { id: "create", label: "New Ticket", icon: "plus", onClick: () => onOpenTool("create") }
      : hasTicket
        ? { id: "details-primary", label: canEditSelected ? "Edit Ticket" : "Details", icon: "clipboard", onClick: () => onOpenTool("details") }
        : { id: "board-primary", label: "View Board", icon: "layers", onClick: onJumpToBoard },
    { id: "photo", label: "Photo", icon: "upload", variant: "secondary", onClick: missingPhotoCount ? onOpenMissingPhoto : () => onOpenTool("details") },
    { id: "report", label: "Report", icon: "document", variant: "secondary", onClick: missingReportCount ? onOpenReportGap : () => onOpenTool("details") },
    incompleteBasicsCount
      ? { id: "basics", label: "Basics", icon: "alert", variant: "secondary", onClick: onOpenBasicsGap }
      : hasTicket
        ? { id: "details", label: canEditSelected ? "Edit" : "Details", icon: "clipboard", variant: "secondary", onClick: () => onOpenTool("details") }
        : { id: "board", label: "Board", icon: "layers", variant: "secondary", onClick: onJumpToBoard },
  ].filter(Boolean);
  const selectedTicketLine = hasTicket
    ? `${deliveryTicketTitle(ticket)} / ${ticket.job?.title || "Assigned job"} / ${ticket.supplier || "Supplier pending"}`
    : canCreate
      ? `Record truck, supplier, ticket number, and yards for ${currentJobLabel || "an assigned job"}.`
      : "Review assigned ticket records and linked evidence without office-only controls.";

  return (
    <div className="mx-auto w-full max-w-[1520px] min-w-0 px-5 pb-3 sm:px-6 lg:px-6">
      <FieldOperatorPanelShell
        className="co-delivery-field-panel"
        badges={fieldBadges}
        title={deliveryNextAction || (hasTicket ? deliveryTicketTitle(ticket) : "Delivery ticket ready")}
        description={deliveryNextDetail ? `${deliveryNextDetail} ${selectedTicketLine}` : selectedTicketLine}
        meta={hasTicket ? `${ticket.truckNumber || "Truck open"} / ${formatDateTime(deliveryTicketPrimaryTime(ticket))}` : `${visibleJobs.length} assigned job${visibleJobs.length === 1 ? "" : "s"}`}
        metaIcon="clipboard"
        actions={fieldActions}
        facts={summaryItems}
      />
    </div>
  );
}

function DeliveryTicketsMobileFocusPanel({
  ticket,
  latestTicket,
  visibleCount,
  todayCount,
  currentJobTicketCount,
  currentJobLabel,
  missingPhotoCount,
  missingReportCount,
  incompleteBasicsCount,
  canCreate,
  onCreate,
  onOpenBoard,
  onOpenToday,
  onOpenCurrentJob,
  onOpenMissingPhoto,
  onOpenReportGap,
  onOpenBasicsGap,
  onOpenLatest,
}) {
  const focusTicket = ticket || latestTicket;
  const readinessItems = [
    { label: "Today", value: todayCount, tone: todayCount ? "orange" : "slate", onClick: onOpenToday },
    { label: currentJobLabel || "Current job", value: currentJobTicketCount, tone: currentJobTicketCount ? "orange" : "slate", onClick: onOpenCurrentJob },
    { label: "Need photo", value: missingPhotoCount, tone: missingPhotoCount ? "amber" : "green", onClick: onOpenMissingPhoto },
    { label: "Report gaps", value: missingReportCount, tone: missingReportCount ? "orange" : "green", onClick: onOpenReportGap },
    { label: "Basics gaps", value: incompleteBasicsCount, tone: incompleteBasicsCount ? "amber" : "green", onClick: onOpenBasicsGap },
  ];

  return (
    <section className="co-delivery-mobile-focus mx-4 mb-3 md:hidden" aria-label="Delivery ticket mobile focus">
      <div className="co-delivery-mobile-focus-copy">
        <span>Delivery Focus</span>
        <h2>{focusTicket ? deliveryTicketTitle(focusTicket) : "No delivery ticket selected"}</h2>
        <p>{focusTicket ? `${focusTicket.job?.title || "Assigned job"} / ${focusTicket.supplier || "Supplier pending"} / ${deliveryTicketYardsLabel(focusTicket)}` : "Start with the board or create the next ticket for a visible job."}</p>
      </div>

      <div className="co-delivery-mobile-focus-actions">
        {canCreate ? (
          <Button type="button" onClick={onCreate}>
            <Icon name="plus" />
            New Ticket
          </Button>
        ) : null}
        <Button type="button" variant={canCreate ? "secondary" : undefined} onClick={onOpenBoard}>
          <Icon name="layers" />
          View Board
        </Button>
        {focusTicket ? (
          <Button type="button" variant="secondary" onClick={onOpenLatest}>
            <Icon name="arrowUpRight" />
            Open Latest
          </Button>
        ) : null}
      </div>

      <div className="co-delivery-mobile-focus-metrics">
        {readinessItems.map((item) => (
          <button key={item.label} type="button" onClick={item.onClick} data-tone={item.tone}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </button>
        ))}
      </div>
    </section>
  );
}

function DeliveryTicketCreatePanelPolished({
  canCreate,
  visibleJobs,
  createDraft,
  setCreateDraft,
  createReportOptions,
  createUploadOptions,
  singleJobId,
  busy,
  onCreateTicket,
}) {
  if (!canCreate) {
    return (
      <Card className="co-delivery-form-card p-4">
        <StateCard title="Create unavailable" description="This role can review visible delivery tickets but cannot create new ones." tone="slate" />
      </Card>
    );
  }

  const selectedJob = visibleJobs.find((job) => job.id === createDraft.jobId);
  const selectedReport = createReportOptions.find((report) => report.id === createDraft.reportId);
  const selectedUpload = createUploadOptions.find((upload) => upload.id === createDraft.ticketUploadId);
  const deliveryTargetLabel = selectedJob ? jobTitle(selectedJob) : "Select job";
  const supplierLabel = createDraft.supplier || "Supplier pending";
  const ticketLabel = createDraft.ticketNumber || "Ticket number pending";
  const concreteLabel = createDraft.yardsDelivered ? `${createDraft.yardsDelivered} yd${Number(createDraft.yardsDelivered) === 1 ? "" : "s"}` : "Yards pending";
  const basicsReadyCount = [createDraft.jobId, createDraft.supplier, createDraft.ticketNumber].filter(Boolean).length;
  const linksReadyCount = [createDraft.reportId, createDraft.ticketUploadId].filter(Boolean).length;

  return (
    <Card className="co-delivery-form-card co-delivery-create-card overflow-hidden">
      <div className="co-delivery-create-header border-b border-slate-200 bg-white p-4">
        <SectionHeader title="New Delivery Ticket" description="Record truck, ticket, mix, and linked evidence for office closeout." />
      </div>
      <div className="co-delivery-create-shell p-4">
        <div className="co-delivery-create-target">
          <span>Ticket target</span>
          <strong>{deliveryTargetLabel}</strong>
          <p>{supplierLabel} / {ticketLabel}</p>
          <div className="co-delivery-create-target-meta">
            <span>{basicsReadyCount}/3 basics</span>
            <span>{concreteLabel}</span>
            <span>{linksReadyCount ? `${linksReadyCount} link${linksReadyCount === 1 ? "" : "s"}` : "Links optional"}</span>
          </div>
        </div>

        <div className="co-delivery-create-sections">
          <div className="co-delivery-create-section">
            <span>Job and ticket</span>
            <div className="co-delivery-form-grid">
              <SelectField label="Job" value={createDraft.jobId} onChange={(event) => setCreateDraft((current) => ({ ...current, jobId: event.target.value, reportId: "", ticketUploadId: "" }))}>
                <option value="">Select a job</option>
                {visibleJobs.map((job) => <option key={job.id} value={job.id}>{jobTitle(job)}</option>)}
              </SelectField>
              <InputField label="Supplier" value={createDraft.supplier} onChange={(event) => setCreateDraft((current) => ({ ...current, supplier: event.target.value }))} placeholder="Knife River, Cadman, etc." />
              <InputField label="Truck number" value={createDraft.truckNumber} onChange={(event) => setCreateDraft((current) => ({ ...current, truckNumber: event.target.value }))} />
              <InputField label="Ticket number" value={createDraft.ticketNumber} onChange={(event) => setCreateDraft((current) => ({ ...current, ticketNumber: event.target.value }))} />
            </div>
          </div>

          <div className="co-delivery-create-section">
            <span>Concrete and timing</span>
            <div className="co-delivery-form-grid">
              <InputField label="Yards delivered" type="number" min="0" step="0.1" value={createDraft.yardsDelivered} onChange={(event) => setCreateDraft((current) => ({ ...current, yardsDelivered: event.target.value }))} />
              <InputField label="PSI" type="number" min="0" step="1" value={createDraft.psi} onChange={(event) => setCreateDraft((current) => ({ ...current, psi: event.target.value }))} />
              <InputField label="Arrival time" type="datetime-local" value={createDraft.arrivalTime} onChange={(event) => setCreateDraft((current) => ({ ...current, arrivalTime: event.target.value }))} />
              <InputField label="Discharge time" type="datetime-local" value={createDraft.dischargeTime} onChange={(event) => setCreateDraft((current) => ({ ...current, dischargeTime: event.target.value }))} />
              <InputField label="Slump" type="number" min="0" step="0.1" value={createDraft.slump} onChange={(event) => setCreateDraft((current) => ({ ...current, slump: event.target.value }))} />
            </div>
          </div>

          <div className="co-delivery-create-section">
            <span>Evidence links</span>
            <div className="co-delivery-link-grid">
              <SelectField label="Daily report link" value={createDraft.reportId} onChange={(event) => setCreateDraft((current) => ({ ...current, reportId: event.target.value }))}>
                <option value="">No linked report</option>
                {createReportOptions.map((report) => <option key={report.id} value={report.id}>{`${report.job?.title || "Job"} / ${report.reportDate || "No date"}`}</option>)}
              </SelectField>
              <SelectField label="Ticket photo/upload" value={createDraft.ticketUploadId} onChange={(event) => setCreateDraft((current) => ({ ...current, ticketUploadId: event.target.value }))}>
                <option value="">No linked upload</option>
                {createUploadOptions.map((upload) => <option key={upload.id} value={upload.id}>{upload.caption || upload.fileName}</option>)}
              </SelectField>
              <div className="co-delivery-link-summary">
                <span>Report</span>
                <strong>{selectedReport ? `${selectedReport.reportDate || "Report"} linked` : "Optional"}</strong>
              </div>
              <div className="co-delivery-link-summary">
                <span>Photo</span>
                <strong>{selectedUpload ? "Linked" : "Optional"}</strong>
              </div>
            </div>
          </div>

          <div className="co-delivery-create-section">
            <span>Notes</span>
            <div className="co-delivery-form-grid">
              <div className="md:col-span-2">
                <TextAreaField label="Mix notes" value={createDraft.mixNotes} onChange={(event) => setCreateDraft((current) => ({ ...current, mixNotes: event.target.value }))} placeholder="Mix design, pump notes, temperature, additives, or placement details." />
              </div>
              <div className="md:col-span-2">
                <TextAreaField label="Notes" value={createDraft.notes} onChange={(event) => setCreateDraft((current) => ({ ...current, notes: event.target.value }))} placeholder="Any additional field notes for this delivery ticket." />
              </div>
            </div>
          </div>
        </div>

        <div className="co-delivery-create-action-stack">
          <Button
            type="button"
            className="co-delivery-save-cta"
            onClick={async () => {
              const saved = await onCreateTicket(createDraft);
              if (saved) {
                setCreateDraft({ ...INITIAL_DELIVERY_TICKET_FORM, jobId: singleJobId });
              }
            }}
            disabled={busy || !createDraft.jobId}
          >
            Save delivery ticket
          </Button>
          <p>Saves the real delivery ticket for the selected job with truck, mix, timing, report, and photo links.</p>
          <div className="co-delivery-create-checks">
            <span data-state={createDraft.jobId ? "ready" : "needs"}>Job</span>
            <span data-state={createDraft.supplier || createDraft.ticketNumber ? "ready" : "needs"}>Ticket</span>
            <span data-state={createDraft.yardsDelivered ? "ready" : "needs"}>Yards</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

function DeliveryTicketDetailPanelPolished({
  ticket,
  detailDraft,
  setDetailDraft,
  visibleJobs,
  detailReportOptions,
  detailUploadOptions,
  canEditSelected,
  canManageAll,
  busy,
  sessionToken,
  linkedUploadError,
  onOpenLinkedUpload,
  onUpdateTicket,
  onArchiveTicket,
}) {
  if (!ticket) {
    return (
      <Card className="co-delivery-form-card p-4">
        <StateCard title="No delivery ticket selected" description="Choose a ticket from the board to review or edit details." tone="slate" />
      </Card>
    );
  }

  if (!canEditSelected) {
    return (
      <Card className="co-delivery-form-card p-4">
        <SectionHeader
          title={deliveryTicketTitle(ticket)}
          description={`${ticket.job?.title || "Assigned job"} / ${ticket.createdByName || "Creator pending"} / ${formatDateTime(ticket.createdAt)}`}
          action={ticket.archivedAt ? <StatusBadge status="Archived" /> : <Badge tone="orange">{deliveryTicketYardsLabel(ticket)}</Badge>}
        />
        <div className="co-delivery-readonly-grid">
          <div><span>Supplier</span><strong>{ticket.supplier || "Not provided"}</strong></div>
          <div><span>Truck</span><strong>{ticket.truckNumber || "Not provided"}</strong></div>
          <div><span>Ticket</span><strong>{ticket.ticketNumber || "Not provided"}</strong></div>
          <div><span>Yards</span><strong>{deliveryTicketYardsLabel(ticket)}</strong></div>
          <div><span>Arrival</span><strong>{ticket.arrivalTime ? formatDateTime(ticket.arrivalTime) : "Not provided"}</strong></div>
          <div><span>Report</span><strong>{ticket.report?.reportDate || "Not linked"}</strong></div>
        </div>
        <div className="co-delivery-note-panel">
          <span>Mix notes</span>
          <p>{ticket.mixNotes || "No mix notes provided."}</p>
        </div>
        <div className="co-delivery-note-panel">
          <span>Notes</span>
          <p>{ticket.notes || "No notes provided."}</p>
        </div>
        {ticket.ticketUpload ? (
          <div className="co-delivery-upload-panel">
            <span>Linked photo</span>
            <p>{ticket.ticketUpload.caption || ticket.ticketUpload.fileName}</p>
            <button type="button" onClick={() => onOpenLinkedUpload(ticket.ticketUpload)} disabled={!ticket.ticketUpload.contentUrl || !sessionToken}>Open linked upload</button>
            {linkedUploadError ? <p className="text-red-600">{linkedUploadError}</p> : null}
          </div>
        ) : null}
      </Card>
    );
  }

  return (
    <Card className="co-delivery-form-card p-4">
      <SectionHeader
        title={`Edit ${deliveryTicketTitle(ticket)}`}
        description="Update the real ticket record, linked report, photo evidence, truck timing, mix notes, and yardage."
        action={ticket.archivedAt ? <StatusBadge status="Archived" /> : <Badge tone="orange">{deliveryTicketYardsLabel(ticket)}</Badge>}
      />
      <div className="co-delivery-form-grid">
        <SelectField label="Job" value={detailDraft.jobId} onChange={(event) => setDetailDraft((current) => ({ ...current, jobId: event.target.value, reportId: "", ticketUploadId: "" }))}>
          {visibleJobs.map((job) => <option key={job.id} value={job.id}>{jobTitle(job)}</option>)}
        </SelectField>
        <InputField label="Supplier" value={detailDraft.supplier} onChange={(event) => setDetailDraft((current) => ({ ...current, supplier: event.target.value }))} />
        <InputField label="Truck number" value={detailDraft.truckNumber} onChange={(event) => setDetailDraft((current) => ({ ...current, truckNumber: event.target.value }))} />
        <InputField label="Ticket number" value={detailDraft.ticketNumber} onChange={(event) => setDetailDraft((current) => ({ ...current, ticketNumber: event.target.value }))} />
        <InputField label="Yards delivered" type="number" min="0" step="0.1" value={detailDraft.yardsDelivered} onChange={(event) => setDetailDraft((current) => ({ ...current, yardsDelivered: event.target.value }))} />
        <InputField label="PSI" type="number" min="0" step="1" value={detailDraft.psi} onChange={(event) => setDetailDraft((current) => ({ ...current, psi: event.target.value }))} />
        <InputField label="Arrival time" type="datetime-local" value={detailDraft.arrivalTime} onChange={(event) => setDetailDraft((current) => ({ ...current, arrivalTime: event.target.value }))} />
        <InputField label="Discharge time" type="datetime-local" value={detailDraft.dischargeTime} onChange={(event) => setDetailDraft((current) => ({ ...current, dischargeTime: event.target.value }))} />
        <InputField label="Slump" type="number" min="0" step="0.1" value={detailDraft.slump} onChange={(event) => setDetailDraft((current) => ({ ...current, slump: event.target.value }))} />
        <SelectField label="Daily report link" value={detailDraft.reportId} onChange={(event) => setDetailDraft((current) => ({ ...current, reportId: event.target.value }))}>
          <option value="">No linked report</option>
          {detailReportOptions.map((report) => <option key={report.id} value={report.id}>{`${report.job?.title || "Job"} / ${report.reportDate || "No date"}`}</option>)}
        </SelectField>
        <div className="md:col-span-2">
          <SelectField label="Ticket photo/upload" value={detailDraft.ticketUploadId} onChange={(event) => setDetailDraft((current) => ({ ...current, ticketUploadId: event.target.value }))}>
            <option value="">No linked upload</option>
            {detailUploadOptions.map((upload) => <option key={upload.id} value={upload.id}>{upload.caption || upload.fileName}</option>)}
          </SelectField>
        </div>
        <div className="md:col-span-2">
          <TextAreaField label="Mix notes" value={detailDraft.mixNotes} onChange={(event) => setDetailDraft((current) => ({ ...current, mixNotes: event.target.value }))} />
        </div>
        <div className="md:col-span-2">
          <TextAreaField label="Notes" value={detailDraft.notes} onChange={(event) => setDetailDraft((current) => ({ ...current, notes: event.target.value }))} />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" onClick={() => onUpdateTicket(ticket.id, detailDraft)} disabled={busy}>Save ticket</Button>
        {canManageAll ? <Button type="button" variant="danger" onClick={() => onArchiveTicket(ticket.id)} disabled={busy || ticket.archivedAt}>Archive</Button> : null}
      </div>
    </Card>
  );
}

function DeliveryTicketsPagePolished({
  user,
  sessionToken,
  jobs,
  deliveryTickets,
  uploads,
  dailyReports,
  permissions,
  busy,
  onCreateTicket,
  onUpdateTicket,
  onArchiveTicket,
  onOpenSupport,
  assistantDeliveryTicketReviewSeed = null,
  onAssistantDeliveryTicketReviewSeedHandled = () => {},
}) {
  const [jobFilter, setJobFilter] = useState("All jobs");
  const [supplierFilter, setSupplierFilter] = useState("All suppliers");
  const [creatorFilter, setCreatorFilter] = useState("All creators");
  const [dateFilter, setDateFilter] = useState("All dates");
  const [archiveFilter, setArchiveFilter] = useState("Active");
  const [search, setSearch] = useState("");
  const [selectedTicketId, setSelectedTicketId] = useState("");
  const [linkedUploadError, setLinkedUploadError] = useState("");
  const [createDraft, setCreateDraft] = useState(INITIAL_DELIVERY_TICKET_FORM);
  const [detailDraft, setDetailDraft] = useState(INITIAL_DELIVERY_TICKET_FORM);
  const [showTools, setShowTools] = useState(false);
  const [activeTool, setActiveTool] = useState("details");
  const toolsRef = useRef(null);
  const toolsPanelRef = useRef(null);
  const boardRef = useRef(null);

  const visibleJobs = Array.isArray(jobs) ? jobs.filter((job) => !job.archivedAt) : [];
  const ticketRows = Array.isArray(deliveryTickets) ? deliveryTickets : [];
  const filteredRows = useMemo(() => filterDeliveryTickets(ticketRows, {
    job: jobFilter,
    supplier: supplierFilter,
    createdBy: creatorFilter,
    date: dateFilter,
    archived: archiveFilter,
    search,
  }), [archiveFilter, creatorFilter, dateFilter, jobFilter, search, supplierFilter, ticketRows]);
  const deliveryCloseoutReadiness = useMemo(() => deriveDeliveryTicketCloseoutReadiness(filteredRows, visibleJobs), [filteredRows, visibleJobs]);
  const listState = useMemo(() => deriveDeliveryTicketListState(filteredRows, visibleJobs), [filteredRows, visibleJobs]);
  const selectedTicket = filteredRows.find((ticket) => ticket.id === selectedTicketId)
    || filteredRows[0]
    || null;
  const singleJobId = listState.defaultJobId || "";
  const createJobId = createDraft.jobId || singleJobId;
  const canCreate = permissions.deliveryTickets.canCreate || permissions.deliveryTickets.canManageAll;
  const canManageAll = permissions.deliveryTickets.canManageAll;
  const isFieldDeliveryWorkspace = !canManageAll;
  const canEditSelected = Boolean(selectedTicket) && (canManageAll || (permissions.deliveryTickets.canEditOwn && selectedTicket.createdBy === user?.id && !selectedTicket.archivedAt));
  const canOpenDeliverySupport = Boolean(permissions?.deliveryTickets?.canView && permissions?.support?.canView && typeof onOpenSupport === "function");
  const scopedUploads = (Array.isArray(uploads) ? uploads : []).filter((upload) => !upload.archivedAt);
  const scopedReports = (Array.isArray(dailyReports) ? dailyReports : []).filter((report) => !report.archivedAt);
  const createUploadOptions = scopedUploads.filter((upload) => createJobId ? upload.jobId === createJobId : canManageAll);
  const createReportOptions = scopedReports.filter((report) => createJobId ? report.jobId === createJobId : canManageAll);
  const detailUploadOptions = scopedUploads.filter((upload) => detailDraft.jobId ? upload.jobId === detailDraft.jobId : canManageAll);
  const detailReportOptions = scopedReports.filter((report) => detailDraft.jobId ? report.jobId === detailDraft.jobId : canManageAll);
  const missingPhotoCount = filteredRows.filter((ticket) => !ticket.ticketUploadId).length;
  const missingReportCount = filteredRows.filter((ticket) => !ticket.reportId).length;
  const incompleteBasicsCount = filteredRows.filter((ticket) => !ticket.supplier || !ticket.truckNumber || !ticket.ticketNumber || !Number(ticket.yardsDelivered || 0)).length;
  const yardsLogged = filteredRows.reduce((sum, ticket) => sum + Number(ticket.yardsDelivered || 0), 0);
  const linkedReports = filteredRows.filter((ticket) => ticket.reportId).length;
  const archivedCount = filteredRows.filter((ticket) => ticket.archivedAt).length;
  const todayKey = todayDateInputValue();
  const activeTickets = ticketRows.filter((ticket) => !ticket.archivedAt);
  const preferredDeliveryJobId = createDraft.jobId && visibleJobs.some((job) => job.id === createDraft.jobId)
    ? createDraft.jobId
    : deliveryTicketJobId(selectedTicket) || visibleJobs[0]?.id || "";
  const currentDeliveryJob = visibleJobs.find((job) => job.id === preferredDeliveryJobId) || null;
  const currentDeliveryJobLabel = currentDeliveryJob ? jobTitle(currentDeliveryJob) : "Current job";
  const currentDeliveryJobFilter = currentDeliveryJob?.title || "";
  const todayTicketCount = activeTickets.filter((ticket) => deliveryTicketDateKey(ticket) === todayKey).length;
  const currentJobTicketCount = preferredDeliveryJobId
    ? activeTickets.filter((ticket) => deliveryTicketJobId(ticket) === preferredDeliveryJobId).length
    : 0;
  const latestTicket = filteredRows.reduce((latest, ticket) => {
    const currentTime = new Date(deliveryTicketPrimaryTime(ticket) || 0).getTime() || 0;
    const latestTime = new Date(deliveryTicketPrimaryTime(latest) || 0).getTime() || 0;
    return currentTime > latestTime ? ticket : latest;
  }, filteredRows[0] || null);
  const ticketKpis = [
    { label: "Visible Tickets", value: filteredRows.length, helper: "Current delivery board", icon: "clipboard", tone: "orange", actionLabel: "View active", onAction: () => setArchiveFilter("Active") },
    { label: "Missing Photo", value: missingPhotoCount, helper: "Ticket image not linked", icon: "alert", tone: missingPhotoCount ? "amber" : "green" },
    { label: "Yards Logged", value: yardsLogged, helper: "Delivered yards in view", icon: "database", tone: yardsLogged ? "green" : "slate" },
    { label: "Linked Reports", value: linkedReports, helper: "Connected to daily reports", icon: "document", tone: linkedReports ? "orange" : "slate" },
    { label: "Archived", value: archivedCount, helper: "Archived in this view", icon: "box", tone: archivedCount ? "slate" : "green", actionLabel: "View archive", onAction: () => setArchiveFilter("Archived") },
  ];
  const toolTabs = [
    canCreate ? { id: "create", label: "New Ticket", count: 1 } : null,
    { id: "details", label: canEditSelected ? "Edit Selected" : "Review Selected", count: selectedTicket ? 1 : 0 },
  ].filter(Boolean);

  useEffect(() => {
    if (!filteredRows.length) {
      if (selectedTicketId) setSelectedTicketId("");
      return;
    }
    if (!selectedTicketId || !filteredRows.some((ticket) => ticket.id === selectedTicketId)) {
      setSelectedTicketId(filteredRows[0].id);
    }
  }, [filteredRows, selectedTicketId]);

  useEffect(() => {
    if (singleJobId && !createDraft.jobId) {
      setCreateDraft((current) => ({ ...current, jobId: singleJobId }));
    }
  }, [createDraft.jobId, singleJobId]);

  useEffect(() => {
    setDetailDraft({
      jobId: selectedTicket?.jobId || "",
      reportId: selectedTicket?.reportId || "",
      supplier: selectedTicket?.supplier || "",
      truckNumber: selectedTicket?.truckNumber || "",
      ticketNumber: selectedTicket?.ticketNumber || "",
      yardsDelivered: selectedTicket?.yardsDelivered ?? "",
      arrivalTime: selectedTicket?.arrivalTime || "",
      dischargeTime: selectedTicket?.dischargeTime || "",
      psi: selectedTicket?.psi ?? "",
      slump: selectedTicket?.slump ?? "",
      mixNotes: selectedTicket?.mixNotes || "",
      notes: selectedTicket?.notes || "",
      ticketUploadId: selectedTicket?.ticketUploadId || "",
    });
  }, [selectedTicket?.id, selectedTicket?.updatedAt]);

  useEffect(() => {
    setLinkedUploadError("");
  }, [selectedTicket?.id]);

  async function handleOpenLinkedUpload(upload) {
    if (!upload?.contentUrl || !sessionToken) return false;
    setLinkedUploadError("");
    const popup = window.open("", "_blank", "noopener,noreferrer");

    if (popup) {
      popup.document.title = "Loading upload";
      popup.document.body.innerHTML = "<div style='font-family:Arial,sans-serif;padding:24px;color:#0f172a;'>Loading linked upload...</div>";
    }

    try {
      const previewUrl = await fetchAuthenticatedUploadPreviewUrl(upload, sessionToken);
      if (popup) {
        popup.location.href = previewUrl;
        return true;
      }
      const fallbackWindow = window.open(previewUrl, "_blank", "noopener,noreferrer");
      if (!fallbackWindow) {
        throw new Error("Allow pop-ups to open the linked upload.");
      }
      return true;
    } catch (error) {
      if (popup) popup.close();
      setLinkedUploadError(error?.message || "Could not open the linked upload.");
      return false;
    }
  }

  function openTool(toolId = "details") {
    setActiveTool(toolId);
    setShowTools(true);
    scrollToDeliveryTools();
  }

  function selectTool(toolId = "details") {
    setActiveTool(toolId);
    scrollToDeliveryTools();
  }

  function scrollToDeliveryTools() {
    window.setTimeout(() => {
      const usePanelTarget = window.matchMedia?.("(max-width: 767px)")?.matches;
      const target = usePanelTarget ? toolsPanelRef.current : toolsRef.current;
      (target || toolsRef.current)?.scrollIntoView?.({ behavior: "smooth", block: "start" });
    }, 0);
  }

  function jumpToBoard() {
    window.setTimeout(() => boardRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" }), 0);
  }

  function openTodayTickets() {
    setArchiveFilter("Active");
    setSearch("");
    setJobFilter("All jobs");
    setSupplierFilter("All suppliers");
    setCreatorFilter("All creators");
    setDateFilter(todayKey);
    jumpToBoard();
  }

  function openCurrentJobTickets() {
    setArchiveFilter("Active");
    setSearch("");
    setJobFilter(currentDeliveryJobFilter || "All jobs");
    setSupplierFilter("All suppliers");
    setCreatorFilter("All creators");
    setDateFilter("All dates");
    jumpToBoard();
  }

  function openPriorityTicket(matchTicket, options = {}) {
    const targetTicket = filteredRows.find(matchTicket) || ticketRows.find(matchTicket);
    if (options.archiveFilter) setArchiveFilter(options.archiveFilter);
    if (targetTicket?.id) setSelectedTicketId(targetTicket.id);
    openTool(options.tool || "details");
  }

  useEffect(() => {
    const seed = assistantDeliveryTicketReviewSeed;
    if (!seed?.nonce || !canManageAll) return;

    const activeTicketRows = ticketRows.filter((ticket) => !ticket.archivedAt);
    const targetTicketId = seed.ticketId && activeTicketRows.some((ticket) => ticket?.id === seed.ticketId)
      ? seed.ticketId
      : activeTicketRows.find((ticket) => !ticket.supplier || !ticket.truckNumber || !ticket.ticketNumber || !Number(ticket.yardsDelivered || 0))?.id
        || activeTicketRows.find((ticket) => !ticket.ticketUploadId || !ticket.reportId)?.id
        || activeTicketRows[0]?.id
        || "";

    setArchiveFilter("Active");
    setJobFilter("All jobs");
    setSupplierFilter("All suppliers");
    setCreatorFilter("All creators");
    setDateFilter("All dates");
    setSearch("");
    if (targetTicketId) setSelectedTicketId(targetTicketId);
    openTool("details");
    onAssistantDeliveryTicketReviewSeedHandled(seed.nonce);
  }, [assistantDeliveryTicketReviewSeed?.nonce, canManageAll, ticketRows]);

  function clearFilters() {
    setJobFilter("All jobs");
    setSupplierFilter("All suppliers");
    setCreatorFilter("All creators");
    setDateFilter("All dates");
    setArchiveFilter("Active");
    setSearch("");
  }

  function requestDeliveryTicketSupportReview() {
    if (!canOpenDeliverySupport) return;
    onOpenSupport(buildDeliveryTicketSupportContext({
      user,
      permissions,
      visibleRows: filteredRows,
      selectedTicket,
      filters: {
        archived: archiveFilter,
        job: jobFilter,
        supplier: supplierFilter,
        createdBy: creatorFilter,
        date: dateFilter,
        search,
      },
      visibleJobs,
    }));
  }

  const missingPhotoPriorityCard = {
    label: "Need ticket photo",
    value: missingPhotoCount,
    helper: missingPhotoCount ? "Tickets without linked photo evidence need review." : "Visible tickets have linked photo evidence.",
    icon: "upload",
    tone: missingPhotoCount ? "amber" : "green",
    actionLabel: missingPhotoCount ? "Open missing" : "View board",
    onAction: () => openPriorityTicket((ticket) => !ticket.ticketUploadId, { archiveFilter: "Active" }),
  };
  const linkedReportPriorityCard = {
    label: "Link daily report",
    value: missingReportCount,
    helper: missingReportCount ? "Connect delivery tickets to the right daily report when available." : "Visible tickets are linked to reports.",
    icon: "document",
    tone: missingReportCount ? "orange" : "green",
    actionLabel: missingReportCount ? "Open gaps" : "All linked",
    onAction: () => openPriorityTicket((ticket) => !ticket.reportId, { archiveFilter: "Active" }),
  };
  const basicsPriorityCard = {
    label: "Complete basics",
    value: incompleteBasicsCount,
    helper: "Checks supplier, truck, ticket number, and delivered yardage.",
    icon: "alert",
    tone: incompleteBasicsCount ? "amber" : "green",
    actionLabel: incompleteBasicsCount ? "Find gaps" : "Ready",
    onAction: () => openPriorityTicket((ticket) => !ticket.supplier || !ticket.truckNumber || !ticket.ticketNumber || !Number(ticket.yardsDelivered || 0), { archiveFilter: "Active" }),
  };
  const latestPriorityCard = {
    label: "Latest delivery",
    value: latestTicket ? 1 : 0,
    helper: latestTicket ? `${latestTicket.job?.title || "Assigned job"} / ${latestTicket.supplier || "Supplier pending"}` : "No visible delivery ticket selected.",
    icon: "arrowUpRight",
    tone: latestTicket ? "orange" : "slate",
    actionLabel: latestTicket ? "Open latest" : "No ticket",
    onAction: () => openPriorityTicket((ticket) => ticket.id === latestTicket?.id, { archiveFilter: "Active" }),
  };
  const createTicketPriorityCard = {
    label: "New delivery ticket",
    value: canCreate ? 1 : 0,
    helper: canCreate ? "Record a truck ticket for a visible job and link report/photo evidence." : "Ticket creation is not enabled for this role.",
    icon: "plus",
    tone: canCreate ? "orange" : "slate",
    actionLabel: canCreate ? "Start ticket" : "Read only",
    onAction: () => openTool(canCreate ? "create" : "details"),
  };
  const deliveryPriorityCards = isFieldDeliveryWorkspace && canCreate
    ? [createTicketPriorityCard, missingPhotoPriorityCard, linkedReportPriorityCard, basicsPriorityCard]
    : filteredRows.length === 0 && canCreate
    ? [createTicketPriorityCard, missingPhotoPriorityCard, linkedReportPriorityCard, basicsPriorityCard]
    : [missingPhotoPriorityCard, linkedReportPriorityCard, basicsPriorityCard, latestPriorityCard];
  const deliveryCommandItems = [
    {
      label: "Ticket photo",
      value: missingPhotoCount,
      helper: missingPhotoCount ? "Tickets without linked photo evidence" : "Visible tickets have photo evidence",
      tone: missingPhotoCount ? "orange" : "green",
      action: missingPhotoCount ? "Open missing" : "Clear",
      onClick: () => missingPhotoCount ? openPriorityTicket((ticket) => !ticket.ticketUploadId, { archiveFilter: "Active" }) : jumpToBoard(),
    },
    {
      label: "Report link",
      value: missingReportCount,
      helper: missingReportCount ? "Connect tickets to daily reports" : "Report links are set",
      tone: missingReportCount ? "amber" : "green",
      action: missingReportCount ? "Find gaps" : "Clear",
      onClick: () => missingReportCount ? openPriorityTicket((ticket) => !ticket.reportId, { archiveFilter: "Active" }) : jumpToBoard(),
    },
    {
      label: "Basics",
      value: incompleteBasicsCount,
      helper: "Supplier, truck, ticket number, yardage",
      tone: incompleteBasicsCount ? "amber" : "green",
      action: incompleteBasicsCount ? "Complete" : "Ready",
      onClick: () => incompleteBasicsCount ? openPriorityTicket((ticket) => !ticket.supplier || !ticket.truckNumber || !ticket.ticketNumber || !Number(ticket.yardsDelivered || 0), { archiveFilter: "Active" }) : jumpToBoard(),
    },
    {
      label: "Latest delivery",
      value: latestTicket ? deliveryTicketYardsLabel(latestTicket) : "None",
      helper: latestTicket ? `${latestTicket.job?.title || "Assigned job"} / ${latestTicket.supplier || "Supplier pending"}` : "No visible delivery in this view",
      tone: latestTicket ? "orange" : "slate",
      action: latestTicket ? "Open latest" : "No ticket",
      onClick: () => latestTicket ? openPriorityTicket((ticket) => ticket.id === latestTicket.id, { archiveFilter: "Active" }) : jumpToBoard(),
    },
  ];
  const deliveryNextAction = missingPhotoCount
    ? "Attach ticket photo evidence"
    : missingReportCount
      ? "Link delivery to daily report"
      : incompleteBasicsCount
        ? "Complete truck and yardage basics"
        : latestTicket
          ? "Review latest delivery"
          : "Delivery board is clear";
  const deliveryNextDetail = missingPhotoCount
    ? `${missingPhotoCount} ticket${missingPhotoCount === 1 ? "" : "s"} need photo evidence before closeout.`
    : missingReportCount
      ? `${missingReportCount} ticket${missingReportCount === 1 ? "" : "s"} need daily report context.`
      : incompleteBasicsCount
        ? `${incompleteBasicsCount} ticket${incompleteBasicsCount === 1 ? "" : "s"} need supplier, truck, ticket number, or yardage.`
        : latestTicket
          ? `${deliveryTicketTitle(latestTicket)} / ${deliveryTicketYardsLabel(latestTicket)} / ${formatDateTime(deliveryTicketPrimaryTime(latestTicket))}`
          : "No delivery issues in the current view.";
  const adminMobileDeliveryQueue = useMemo(() => {
    const rankedTickets = [...activeTickets].sort((left, right) => {
      const leftScore = (!left.ticketUploadId ? 0 : 20)
        + (!left.reportId ? 1 : 20)
        + ((!left.supplier || !left.truckNumber || !left.ticketNumber || !Number(left.yardsDelivered || 0)) ? 2 : 20);
      const rightScore = (!right.ticketUploadId ? 0 : 20)
        + (!right.reportId ? 1 : 20)
        + ((!right.supplier || !right.truckNumber || !right.ticketNumber || !Number(right.yardsDelivered || 0)) ? 2 : 20);
      if (leftScore !== rightScore) return leftScore - rightScore;
      return new Date(deliveryTicketPrimaryTime(right) || 0).getTime() - new Date(deliveryTicketPrimaryTime(left) || 0).getTime();
    });
    return rankedTickets.slice(0, 3);
  }, [activeTickets]);
  const adminMobileDeliveryFocus = selectedTicket || latestTicket || adminMobileDeliveryQueue[0] || null;
  const adminMobileDeliveryStatusTiles = [
    { label: "Visible", value: filteredRows.length, helper: "active board", tone: filteredRows.length ? "orange" : "slate" },
    { label: "Photos", value: missingPhotoCount, helper: "need proof", tone: missingPhotoCount ? "amber" : "green" },
    { label: "Reports", value: missingReportCount, helper: "need link", tone: missingReportCount ? "red" : "green" },
  ];
  const adminMobileDeliveryBadge = missingPhotoCount
    ? "Photo proof"
    : missingReportCount
      ? "Report link"
      : incompleteBasicsCount
        ? "Basics"
        : "Clear";

  if (!permissions.deliveryTickets.canView) {
    return (
      <div className="co-office-page co-delivery-page">
        <PageHeader eyebrow="Field Tools" title="Delivery Tickets" description="This module is not available for this role." />
        <div className="px-5 sm:px-6 lg:px-8">
          <StateCard title="Delivery ticket access unavailable" description="Only office, foreman, and assigned field users can open delivery tickets in this pass." tone="slate" />
        </div>
      </div>
    );
  }

  return (
    <div className="co-office-page co-delivery-page" data-field-workspace={isFieldDeliveryWorkspace ? "true" : undefined}>
      <PageHeader
        eyebrow={canManageAll ? "Field Ops" : "Field Workspace"}
        title="Delivery Tickets"
        description={canManageAll ? "Review concrete truck and ticket records across every job with field evidence and daily report context." : "Capture field-ready concrete delivery ticket details for visible jobs with job-safe context only."}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => setArchiveFilter("Active")}>{filteredRows.length} visible</Button>
            {canOpenDeliverySupport ? (
              <Button type="button" variant="secondary" onClick={requestDeliveryTicketSupportReview}>
                <Icon name="help" />Ticket Support
              </Button>
            ) : null}
            {canCreate ? <Button type="button" onClick={() => openTool("create")}>New Ticket</Button> : null}
          </div>
        }
      />

      {canManageAll ? (
        <section className="co-admin-mobile-ops-shell co-admin-mobile-delivery-shell" data-admin-mobile-ops-shell="delivery-tickets" aria-label="Admin mobile delivery ticket command">
          <div className="co-admin-mobile-ops-head">
            <span>Field Ops</span>
            <h1>What needs ticket attention?</h1>
            <p>Delivery triage for photo proof, report links, and incomplete truck ticket basics.</p>
          </div>

          <div className="co-admin-mobile-next-card" data-tone={adminMobileDeliveryBadge === "Clear" ? "green" : "amber"}>
            <div className="co-admin-mobile-next-copy">
              <span>Today / Next Action</span>
              <strong>{deliveryNextAction}</strong>
              <p>{adminMobileDeliveryFocus ? `${deliveryTicketTitle(adminMobileDeliveryFocus)} / ${adminMobileDeliveryFocus.job?.title || "Assigned job"} / ${deliveryTicketYardsLabel(adminMobileDeliveryFocus)}` : deliveryNextDetail}</p>
            </div>
            <Badge tone={adminMobileDeliveryBadge === "Clear" ? "green" : "amber"}>{adminMobileDeliveryBadge}</Badge>
            <div className="co-admin-mobile-primary-actions">
              <Button type="button" onClick={() => (missingPhotoCount || missingReportCount || incompleteBasicsCount) ? openPriorityTicket((ticket) => !ticket.ticketUploadId || !ticket.reportId || !ticket.supplier || !ticket.truckNumber || !ticket.ticketNumber || !Number(ticket.yardsDelivered || 0), { archiveFilter: "Active" }) : openPriorityTicket((ticket) => ticket.id === latestTicket?.id, { archiveFilter: "Active" })}>Review Gaps</Button>
              {canOpenDeliverySupport ? <Button type="button" variant="secondary" onClick={requestDeliveryTicketSupportReview}>Ticket Support</Button> : <Button type="button" variant="secondary" onClick={openTodayTickets}>Today</Button>}
            </div>
          </div>

          <div className="co-admin-mobile-status-tiles" aria-label="Delivery ticket status">
            {adminMobileDeliveryStatusTiles.map((item) => (
              <div key={item.label} className="co-admin-mobile-status-tile" data-tone={item.tone}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <em>{item.helper}</em>
              </div>
            ))}
          </div>

          <section className="co-admin-mobile-queue-panel" aria-label="Top delivery ticket queue">
            <div className="co-admin-mobile-panel-head">
              <span>Top 3</span>
              <strong>Ticket queue</strong>
              <em>{adminMobileDeliveryQueue.length ? `${adminMobileDeliveryQueue.length} shown` : "Clear"}</em>
            </div>
            {adminMobileDeliveryQueue.length ? (
              <div className="co-admin-mobile-delivery-queue-list">
                {adminMobileDeliveryQueue.map((ticket) => {
                  const needsPhoto = !ticket.ticketUploadId;
                  const needsReport = !ticket.reportId;
                  const needsBasics = !ticket.supplier || !ticket.truckNumber || !ticket.ticketNumber || !Number(ticket.yardsDelivered || 0);
                  const statusLabel = needsPhoto ? "Needs photo" : needsReport ? "Needs report" : needsBasics ? "Needs basics" : "Ready";
                  const tone = needsPhoto || needsReport || needsBasics ? "amber" : "green";
                  return (
                    <button
                      key={ticket.id}
                      type="button"
                      className={`co-admin-mobile-queue-card ${ticket.id === selectedTicket?.id ? "is-selected" : ""}`}
                      data-tone={tone}
                      onClick={() => setSelectedTicketId(ticket.id)}
                    >
                      <span>{statusLabel}</span>
                      <strong>{deliveryTicketTitle(ticket)}</strong>
                      <em>{[ticket.job?.title, ticket.supplier, deliveryTicketYardsLabel(ticket)].filter(Boolean).join(" / ")}</em>
                      <b>{formatDateTime(deliveryTicketPrimaryTime(ticket))}</b>
                    </button>
                  );
                })}
              </div>
            ) : (
              <StateCard title="Tickets clear" description="Active ticket gaps will appear here when proof, report links, or basics need review." tone="green" />
            )}
          </section>

          <details className="co-admin-mobile-more-drawer">
            <summary>
              <span>More details</span>
              <strong>Yards, today, basics</strong>
              <em>Open only when needed</em>
            </summary>
            <div className="co-admin-mobile-more-grid">
              <span>
                <em>Today</em>
                <strong>{todayTicketCount}</strong>
                <b>tickets</b>
              </span>
              <span>
                <em>Yards</em>
                <strong>{deliveryTicketYardsLabel({ yardsDelivered: yardsLogged })}</strong>
                <b>logged</b>
              </span>
              <span>
                <em>Basics</em>
                <strong>{incompleteBasicsCount}</strong>
                <b>gaps</b>
              </span>
            </div>
          </details>
        </section>
      ) : null}

      {!canManageAll ? (
        <DeliveryTicketsFieldOperatorPanel
          ticket={selectedTicket}
          filteredRows={filteredRows}
          visibleJobs={visibleJobs}
          todayCount={todayTicketCount}
          currentJobTicketCount={currentJobTicketCount}
          currentJobLabel={currentDeliveryJobLabel}
          missingPhotoCount={missingPhotoCount}
          missingReportCount={missingReportCount}
          incompleteBasicsCount={incompleteBasicsCount}
          deliveryNextAction={deliveryNextAction}
          deliveryNextDetail={deliveryNextDetail}
          canCreate={canCreate}
          canEditSelected={canEditSelected}
          onOpenTool={openTool}
          onJumpToBoard={jumpToBoard}
          onOpenMissingPhoto={() => openPriorityTicket((ticket) => !ticket.ticketUploadId, { archiveFilter: "Active" })}
          onOpenReportGap={() => openPriorityTicket((ticket) => !ticket.reportId, { archiveFilter: "Active" })}
          onOpenBasicsGap={() => openPriorityTicket((ticket) => !ticket.supplier || !ticket.truckNumber || !ticket.ticketNumber || !Number(ticket.yardsDelivered || 0), { archiveFilter: "Active" })}
        />
      ) : null}

      {canManageAll ? (
        <DeliveryTicketsMobileFocusPanel
          ticket={selectedTicket}
          latestTicket={latestTicket}
          visibleCount={filteredRows.length}
          todayCount={todayTicketCount}
          currentJobTicketCount={currentJobTicketCount}
          currentJobLabel={currentDeliveryJobLabel}
          missingPhotoCount={missingPhotoCount}
          missingReportCount={missingReportCount}
          incompleteBasicsCount={incompleteBasicsCount}
          canCreate={canCreate}
          onCreate={() => openTool("create")}
          onOpenBoard={jumpToBoard}
          onOpenToday={openTodayTickets}
          onOpenCurrentJob={openCurrentJobTickets}
          onOpenMissingPhoto={() => openPriorityTicket((ticket) => !ticket.ticketUploadId, { archiveFilter: "Active" })}
          onOpenReportGap={() => openPriorityTicket((ticket) => !ticket.reportId, { archiveFilter: "Active" })}
          onOpenBasicsGap={() => openPriorityTicket((ticket) => !ticket.supplier || !ticket.truckNumber || !ticket.ticketNumber || !Number(ticket.yardsDelivered || 0), { archiveFilter: "Active" })}
          onOpenLatest={() => openPriorityTicket((ticket) => ticket.id === latestTicket?.id, { archiveFilter: "Active" })}
        />
      ) : null}

      {canManageAll ? (
        <div className="co-delivery-ops-board mx-auto w-full max-w-[1520px] min-w-0 px-5 pb-3 sm:px-6 lg:px-6">
          <Card className="co-delivery-ops-card overflow-hidden">
            <div className="co-delivery-ops-shell">
              <div className="co-delivery-ops-main">
                <div className="co-delivery-ops-header">
                  <div className="min-w-0">
                    <p className="co-delivery-ops-eyebrow">Delivery command</p>
                    <h2>Truck tickets, photo proof, and report links in one lane</h2>
                    <p>Use this command view to see which deliveries are ready for closeout and which still need field evidence.</p>
                  </div>
                  <div className="co-delivery-ops-actions">
                    <Button type="button" variant="secondary" onClick={openTodayTickets}>Today</Button>
                    <Button type="button" variant="secondary" onClick={() => setArchiveFilter("Active")}>Active tickets</Button>
                    {canCreate ? <Button type="button" onClick={() => openTool("create")}>New ticket</Button> : null}
                  </div>
                </div>
                <div className="co-delivery-ops-metrics">
                  <button type="button" className="co-focus-ring" onClick={() => setArchiveFilter("Active")} data-tone="orange">
                    <span>Visible tickets</span>
                    <strong>{filteredRows.length}</strong>
                    <em>Current delivery board</em>
                  </button>
                  <button type="button" className="co-focus-ring" onClick={openTodayTickets} data-tone={todayTicketCount ? "orange" : "slate"}>
                    <span>Today</span>
                    <strong>{todayTicketCount}</strong>
                    <em>Truck tickets today</em>
                  </button>
                  <button type="button" className="co-focus-ring" onClick={openCurrentJobTickets} data-tone={currentJobTicketCount ? "green" : "slate"}>
                    <span>Current job</span>
                    <strong>{currentJobTicketCount}</strong>
                    <em>{currentDeliveryJobLabel}</em>
                  </button>
                  <button type="button" className="co-focus-ring" onClick={() => { setArchiveFilter("Active"); jumpToBoard(); }} data-tone={yardsLogged ? "green" : "slate"}>
                    <span>Yards logged</span>
                    <strong>{deliveryTicketYardsLabel({ yardsDelivered: yardsLogged })}</strong>
                    <em>Delivered yards in view</em>
                  </button>
                </div>
                <div className="co-delivery-ops-queues">
                  {deliveryCommandItems.slice(0, 3).map((item) => (
                    <button key={item.label} type="button" className="co-focus-ring" data-tone={item.tone} onClick={item.onClick}>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                      <em>{item.helper}</em>
                      <b>{item.action}</b>
                    </button>
                  ))}
                </div>
              </div>
              <aside className="co-delivery-ops-rail" aria-label="Delivery ticket closeout assistant">
                <div className="co-delivery-ops-rail-head">
                  <span><Icon name="clipboard" /></span>
                  <div className="min-w-0">
                    <strong>Delivery Assistant</strong>
                    <p>Manual evidence review</p>
                  </div>
                </div>
                <div className="co-delivery-ops-rail-priority">
                  <span>Next best action</span>
                  <strong>{deliveryNextAction}</strong>
                  <p>{deliveryNextDetail}</p>
                </div>
                <div className="co-delivery-ops-rail-list">
                  {deliveryCommandItems.map((item) => (
                    <button key={item.label} type="button" className="co-focus-ring" data-tone={item.tone} onClick={item.onClick}>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                      <em>{item.helper}</em>
                      <b>{item.action}</b>
                    </button>
                  ))}
                </div>
                <div className="co-delivery-ops-rail-actions">
                  {canCreate ? <button type="button" className="co-focus-ring" onClick={() => openTool("create")}><Icon name="plus" />New ticket</button> : null}
                  <button type="button" className="co-focus-ring" onClick={() => (missingPhotoCount || missingReportCount) ? openPriorityTicket((ticket) => !ticket.ticketUploadId || !ticket.reportId, { archiveFilter: "Active" }) : jumpToBoard()}><Icon name="check" />Review gaps</button>
                </div>
              </aside>
            </div>
          </Card>
        </div>
      ) : null}

      <div className="co-delivery-kpi-grid mx-auto grid w-full max-w-[1520px] min-w-0 grid-cols-1 gap-3 px-5 pb-3 sm:px-6 md:grid-cols-5 lg:px-6">
        {ticketKpis.map((item) => <CommandCenterKpiCard key={item.label} item={item} />)}
      </div>

      {!canManageAll ? (
        <div className="co-delivery-priority-grid mx-auto grid w-full max-w-[1520px] min-w-0 gap-3 px-5 pb-3 sm:px-6 md:grid-cols-2 xl:grid-cols-4 lg:px-6">
          {deliveryPriorityCards.map((card) => (
            <button key={card.label} type="button" className="co-delivery-priority-card co-focus-ring" data-tone={card.tone} data-primary={card === createTicketPriorityCard && canCreate ? "true" : undefined} onClick={card.onAction}>
              <span className="co-delivery-priority-icon"><Icon name={card.icon} className="h-4 w-4" /></span>
              <span className="min-w-0">
                <span className="co-delivery-priority-value">{card.value}</span>
                <span className="co-delivery-priority-label">{card.label}</span>
                <span className="co-delivery-priority-helper">{card.helper}</span>
              </span>
              <span className="co-delivery-priority-action">{card.actionLabel} -&gt;</span>
            </button>
          ))}
        </div>
      ) : null}

      <div className="co-delivery-command-layout mx-auto grid w-full max-w-[1520px] min-w-0 gap-3 px-5 pb-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-6">
        <div ref={boardRef}>
          <Card className="co-delivery-main-board overflow-hidden">
            <div className="co-delivery-board-header border-b border-slate-200 bg-white p-4">
              <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0">
                  <h2 className="text-base font-black uppercase tracking-[0.04em] text-slate-950">{isFieldDeliveryWorkspace ? "Ticket Queue" : "Delivery Board"}</h2>
                  <p className="mt-1 text-sm font-bold leading-5 text-slate-600">{isFieldDeliveryWorkspace ? "Keep the next assigned delivery tickets easy to open without office-only filters." : "Track tickets, loads, suppliers, truck timing, linked reports, and photo evidence in one operational lane."}</p>
                </div>
                <div className="co-delivery-board-actions flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="secondary" onClick={() => setArchiveFilter("Active")}>Active</Button>
                  <Button type="button" size="sm" variant="secondary" onClick={() => setArchiveFilter("Archived")}>Archive</Button>
                  {canCreate ? <Button type="button" size="sm" onClick={() => openTool("create")}>New Ticket</Button> : null}
                </div>
              </div>
            </div>
            <FilterBar filters={["Active", "Archived", "All"]} active={archiveFilter} setActive={setArchiveFilter} search={search} setSearch={setSearch} placeholder="Search supplier, ticket, truck, mix notes, or job..." />
            <details className="co-delivery-advanced-filters border-b border-slate-200 bg-white">
              <summary>
                <span>Advanced filters</span>
                <span>{[jobFilter !== "All jobs" ? jobFilter : "", supplierFilter !== "All suppliers" ? supplierFilter : "", creatorFilter !== "All creators" ? creatorFilter : "", dateFilter !== "All dates" ? dateFilter : ""].filter(Boolean).length || "Job, supplier, creator"}</span>
              </summary>
              <div className="co-office-filter-grid co-delivery-filter-grid grid gap-3 p-3 md:grid-cols-4">
                <SelectField label="Job" value={jobFilter} onChange={(event) => setJobFilter(event.target.value)}>
                  {listState.jobOptions.map((option) => <option key={option}>{option}</option>)}
                </SelectField>
                <SelectField label="Supplier" value={supplierFilter} onChange={(event) => setSupplierFilter(event.target.value)}>
                  {listState.supplierOptions.map((option) => <option key={option}>{option}</option>)}
                </SelectField>
                <SelectField label="Created by" value={creatorFilter} onChange={(event) => setCreatorFilter(event.target.value)}>
                  {listState.creatorOptions.map((option) => <option key={option}>{option}</option>)}
                </SelectField>
                <SelectField label="Date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)}>
                  {listState.dateOptions.map((option) => <option key={option}>{option}</option>)}
                </SelectField>
              </div>
            </details>
            {filteredRows.length === 0 ? (
              <div className="p-5">
                <StateCard
                  title={visibleJobs.length === 0 && !canManageAll ? "No assigned job yet" : "No delivery tickets match these filters"}
                  description={visibleJobs.length === 0 && !canManageAll ? "Contact office if you should be able to record or view deliveries for this job." : "Clear a filter or create a new ticket for a visible job."}
                  tone="slate"
                />
              </div>
            ) : (
              <DeliveryTicketsTablePolished rows={filteredRows} selectedId={selectedTicket?.id} onSelect={setSelectedTicketId} isFieldDeliveryWorkspace={isFieldDeliveryWorkspace} />
            )}
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3">
              <p className="text-sm font-bold text-slate-600">Showing {filteredRows.length} ticket{filteredRows.length === 1 ? "" : "s"}</p>
              <Button type="button" size="sm" variant="secondary" onClick={clearFilters}>Clear filters</Button>
            </div>
          </Card>
        </div>

        <DeliveryTicketsCommandRailPolished
          ticket={selectedTicket}
          closeoutReadiness={deliveryCloseoutReadiness}
          canCreate={canCreate}
          canManageAll={canManageAll}
          canEditSelected={canEditSelected}
          busy={busy}
          sessionToken={sessionToken}
          linkedUploadError={linkedUploadError}
          onOpenTool={openTool}
          onOpenLinkedUpload={handleOpenLinkedUpload}
          onArchive={onArchiveTicket}
        />
      </div>

      <details
        ref={toolsRef}
        className="co-delivery-tools-drawer mx-auto w-full max-w-[1520px] min-w-0 px-5 pb-24 sm:px-6 md:pb-4 lg:px-8"
        open={showTools}
        onToggle={(event) => setShowTools(event.currentTarget.open)}
      >
        <summary>
          <span>
            <strong>Delivery Tools</strong>
            <em>Create tickets, edit selected ticket details, link reports, and attach existing photo evidence below the board.</em>
          </span>
          <span>Open tools</span>
        </summary>
        <div className="co-delivery-tool-tabs mt-3 flex min-w-0 gap-2 overflow-x-auto pb-1">
          {toolTabs.map((tab) => (
            <button key={tab.id} type="button" className={activeTool === tab.id ? "is-active" : ""} onClick={() => selectTool(tab.id)}>
              {tab.label}
              <span>{tab.count}</span>
            </button>
          ))}
        </div>
        <div ref={toolsPanelRef} className="co-delivery-tools-panel mt-3">
          {activeTool === "create" ? (
            <DeliveryTicketCreatePanelPolished
              canCreate={canCreate}
              visibleJobs={visibleJobs}
              createDraft={createDraft}
              setCreateDraft={setCreateDraft}
              createReportOptions={createReportOptions}
              createUploadOptions={createUploadOptions}
              singleJobId={singleJobId}
              busy={busy}
              onCreateTicket={onCreateTicket}
            />
          ) : null}
          {activeTool === "details" ? (
            <DeliveryTicketDetailPanelPolished
              ticket={selectedTicket}
              detailDraft={detailDraft}
              setDetailDraft={setDetailDraft}
              visibleJobs={visibleJobs}
              detailReportOptions={detailReportOptions}
              detailUploadOptions={detailUploadOptions}
              canEditSelected={canEditSelected}
              canManageAll={canManageAll}
              busy={busy}
              sessionToken={sessionToken}
              linkedUploadError={linkedUploadError}
              onOpenLinkedUpload={handleOpenLinkedUpload}
              onUpdateTicket={onUpdateTicket}
              onArchiveTicket={onArchiveTicket}
            />
          ) : null}
        </div>
      </details>
    </div>
  );
}

function DeliveryTicketsPageLegacy({
  user,
  sessionToken,
  jobs,
  deliveryTickets,
  uploads,
  dailyReports,
  permissions,
  busy,
  onCreateTicket,
  onUpdateTicket,
  onArchiveTicket,
}) {
  const [jobFilter, setJobFilter] = useState("All jobs");
  const [supplierFilter, setSupplierFilter] = useState("All suppliers");
  const [creatorFilter, setCreatorFilter] = useState("All creators");
  const [dateFilter, setDateFilter] = useState("All dates");
  const [archiveFilter, setArchiveFilter] = useState("Active");
  const [search, setSearch] = useState("");
  const [selectedTicketId, setSelectedTicketId] = useState("");
  const [linkedUploadError, setLinkedUploadError] = useState("");
  const [createDraft, setCreateDraft] = useState(INITIAL_DELIVERY_TICKET_FORM);
  const [detailDraft, setDetailDraft] = useState(INITIAL_DELIVERY_TICKET_FORM);

  const visibleJobs = Array.isArray(jobs) ? jobs.filter((job) => !job.archivedAt) : [];
  const ticketRows = Array.isArray(deliveryTickets) ? deliveryTickets : [];
  const filteredRows = useMemo(() => filterDeliveryTickets(ticketRows, {
    job: jobFilter,
    supplier: supplierFilter,
    createdBy: creatorFilter,
    date: dateFilter,
    archived: archiveFilter,
    search,
  }), [archiveFilter, creatorFilter, dateFilter, jobFilter, search, supplierFilter, ticketRows]);
  const listState = useMemo(() => deriveDeliveryTicketListState(filteredRows, visibleJobs), [filteredRows, visibleJobs]);
  const selectedTicket = filteredRows.find((ticket) => ticket.id === selectedTicketId)
    || filteredRows[0]
    || ticketRows.find((ticket) => ticket.id === selectedTicketId)
    || null;
  const singleJobId = listState.defaultJobId || "";
  const createJobId = createDraft.jobId || singleJobId;
  const canCreate = permissions.deliveryTickets.canCreate || permissions.deliveryTickets.canManageAll;
  const canManageAll = permissions.deliveryTickets.canManageAll;
  const canEditSelected = Boolean(selectedTicket) && (canManageAll || (permissions.deliveryTickets.canEditOwn && selectedTicket.createdBy === user?.id && !selectedTicket.archivedAt));
  const latestTicket = filteredRows[0] || null;
  const ticketListSummary = `${filteredRows.length} ticket${filteredRows.length === 1 ? "" : "s"}${latestTicket ? ` / Latest ${latestTicket.supplier || latestTicket.job?.title || "delivery"}` : ""}`;
  const createTicketSummary = `${createDraft.supplier || "Supplier"} / ${visibleJobs.find((job) => job.id === createJobId)?.title || "select job"}`;
  const selectedTicketSummary = selectedTicket ? `${selectedTicket.supplier || "Supplier pending"} / ${selectedTicket.job?.title || "Assigned job"}` : "Select a ticket";
  const scopedUploads = (Array.isArray(uploads) ? uploads : []).filter((upload) => !upload.archivedAt);
  const scopedReports = (Array.isArray(dailyReports) ? dailyReports : []).filter((report) => !report.archivedAt);
  const createUploadOptions = scopedUploads.filter((upload) => !createJobId || upload.jobId === createJobId);
  const createReportOptions = scopedReports.filter((report) => !createJobId || report.jobId === createJobId);
  const detailUploadOptions = scopedUploads.filter((upload) => !detailDraft.jobId || upload.jobId === detailDraft.jobId);
  const detailReportOptions = scopedReports.filter((report) => !detailDraft.jobId || report.jobId === detailDraft.jobId);
  const ticketKpis = [
    { label: "Visible Tickets", value: filteredRows.length, helper: "Current delivery board", icon: "clipboard" },
    { label: "Missing Photo", value: filteredRows.filter((ticket) => !ticket.ticketUploadId).length, helper: "Ticket image not linked", icon: "alert" },
    { label: "Yards Logged", value: filteredRows.reduce((sum, ticket) => sum + Number(ticket.yardsDelivered || 0), 0), helper: "Delivered yards in view", icon: "database" },
    { label: "Linked Reports", value: filteredRows.filter((ticket) => ticket.reportId).length, helper: "Connected to daily reports", icon: "document" },
  ];

  useEffect(() => {
    if (!selectedTicketId && filteredRows[0]?.id) {
      setSelectedTicketId(filteredRows[0].id);
    }
  }, [filteredRows, selectedTicketId]);

  useEffect(() => {
    if (singleJobId && !createDraft.jobId) {
      setCreateDraft((current) => ({ ...current, jobId: singleJobId }));
    }
  }, [createDraft.jobId, singleJobId]);

  useEffect(() => {
    setDetailDraft({
      jobId: selectedTicket?.jobId || "",
      reportId: selectedTicket?.reportId || "",
      supplier: selectedTicket?.supplier || "",
      truckNumber: selectedTicket?.truckNumber || "",
      ticketNumber: selectedTicket?.ticketNumber || "",
      yardsDelivered: selectedTicket?.yardsDelivered ?? "",
      arrivalTime: selectedTicket?.arrivalTime || "",
      dischargeTime: selectedTicket?.dischargeTime || "",
      psi: selectedTicket?.psi ?? "",
      slump: selectedTicket?.slump ?? "",
      mixNotes: selectedTicket?.mixNotes || "",
      notes: selectedTicket?.notes || "",
      ticketUploadId: selectedTicket?.ticketUploadId || "",
    });
  }, [selectedTicket?.id, selectedTicket?.updatedAt]);

  useEffect(() => {
    setLinkedUploadError("");
  }, [selectedTicket?.id]);

  async function handleOpenLinkedUpload(upload) {
    if (!upload?.contentUrl || !sessionToken) return false;
    setLinkedUploadError("");
    const popup = window.open("", "_blank", "noopener,noreferrer");

    if (popup) {
      popup.document.title = "Loading upload";
      popup.document.body.innerHTML = "<div style='font-family:Arial,sans-serif;padding:24px;color:#0f172a;'>Loading linked upload...</div>";
    }

    try {
      const previewUrl = await fetchAuthenticatedUploadPreviewUrl(upload, sessionToken);
      if (popup) {
        popup.location.href = previewUrl;
        return true;
      }
      const fallbackWindow = window.open(previewUrl, "_blank", "noopener,noreferrer");
      if (!fallbackWindow) {
        throw new Error("Allow pop-ups to open the linked upload.");
      }
      return true;
    } catch (error) {
      if (popup) popup.close();
      setLinkedUploadError(error?.message || "Could not open the linked upload.");
      return false;
    }
  }

  if (!permissions.deliveryTickets.canView) {
    return (
      <div>
        <PageHeader eyebrow="Field Tools" title="Delivery Tickets" description="This module is not available for this role." />
        <div className="px-5 sm:px-6 lg:px-8">
          <StateCard title="Delivery ticket access unavailable" description="Only office, foreman, and assigned field users can open delivery tickets in this pass." tone="slate" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader eyebrow="Field Tools" title="Delivery Tickets" description={canManageAll ? "Review concrete truck and ticket records across every job without exposing pricing or billing." : "Capture field-ready concrete delivery ticket details for visible jobs without exposing money or payroll data."} />
      <ModuleKpiStrip items={ticketKpis} />
      <div className="grid min-w-0 gap-4 px-5 pb-24 sm:px-6 md:pb-0 lg:grid-cols-[340px_minmax(0,1fr)] lg:px-8">
        <div className="min-w-0 space-y-4">
          <DeliveryTicketMobileAccordionCard title="Ticket list" summary={ticketListSummary} badge={<Badge tone="blue">{filteredRows.length}</Badge>}>
            <div className="grid gap-2.5">
              <DeliveryTicketMobileFieldGroup title="Filters" summary="Job, supplier, creator, date, and archive">
                <SelectField label="Job" value={jobFilter} onChange={(event) => setJobFilter(event.target.value)}>
                  {listState.jobOptions.map((option) => <option key={option}>{option}</option>)}
                </SelectField>
                <SelectField label="Supplier" value={supplierFilter} onChange={(event) => setSupplierFilter(event.target.value)}>
                  {listState.supplierOptions.map((option) => <option key={option}>{option}</option>)}
                </SelectField>
                <SelectField label="Created by" value={creatorFilter} onChange={(event) => setCreatorFilter(event.target.value)}>
                  {listState.creatorOptions.map((option) => <option key={option}>{option}</option>)}
                </SelectField>
                <SelectField label="Date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)}>
                  {listState.dateOptions.map((option) => <option key={option}>{option}</option>)}
                </SelectField>
                <SelectField label="Archived" value={archiveFilter} onChange={(event) => setArchiveFilter(event.target.value)}>
                  {["Active", "Archived", "All"].map((option) => <option key={option}>{option}</option>)}
                </SelectField>
                <InputField label="Search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search supplier, ticket, truck, mix notes, or job..." />
              </DeliveryTicketMobileFieldGroup>
              {filteredRows.length === 0 ? (
                <StateCard
                  title={visibleJobs.length === 0 && !canManageAll ? "No assigned job yet" : "No delivery tickets match these filters"}
                  description={visibleJobs.length === 0 && !canManageAll ? "Contact office if you should be able to record or view deliveries for this job." : "Clear a filter or create a new ticket for a visible job."}
                  tone="slate"
                />
              ) : (
                <div className="space-y-2.5">
                  {filteredRows.map((ticket) => (
                    <button
                      key={ticket.id}
                      type="button"
                      onClick={() => setSelectedTicketId(ticket.id)}
                      className={`co-mobile-record-card w-full rounded-2xl border p-3 text-left transition ${selectedTicket?.id === ticket.id ? "is-selected border-blue-300 bg-blue-50/80 shadow-sm" : "border-blue-100 bg-white hover:border-blue-200 hover:bg-blue-50/50"}`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="break-words text-sm font-black text-slate-950">{deliveryTicketTitle(ticket)}</p>
                          <p className="mt-1 break-words text-xs font-bold text-slate-500">{ticket.job?.title || "Assigned job"} / {ticket.supplier || "Supplier pending"}</p>
                        </div>
                        {ticket.archivedAt ? <Badge tone="slate">Archived</Badge> : <Badge tone="blue">{ticket.yardsDelivered ? `${ticket.yardsDelivered} yd` : "Ticket"}</Badge>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </DeliveryTicketMobileAccordionCard>

          <Card className="hidden p-4 md:block">
            <SectionHeader title="Filters" description="Focus on the deliveries that matter right now." />
            <div className="grid gap-3">
              <SelectField label="Job" value={jobFilter} onChange={(event) => setJobFilter(event.target.value)}>
                {listState.jobOptions.map((option) => <option key={option}>{option}</option>)}
              </SelectField>
              <SelectField label="Supplier" value={supplierFilter} onChange={(event) => setSupplierFilter(event.target.value)}>
                {listState.supplierOptions.map((option) => <option key={option}>{option}</option>)}
              </SelectField>
              <SelectField label="Created by" value={creatorFilter} onChange={(event) => setCreatorFilter(event.target.value)}>
                {listState.creatorOptions.map((option) => <option key={option}>{option}</option>)}
              </SelectField>
              <SelectField label="Date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)}>
                {listState.dateOptions.map((option) => <option key={option}>{option}</option>)}
              </SelectField>
              <SelectField label="Archived" value={archiveFilter} onChange={(event) => setArchiveFilter(event.target.value)}>
                {["Active", "Archived", "All"].map((option) => <option key={option}>{option}</option>)}
              </SelectField>
              <InputField label="Search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search supplier, ticket, truck, mix notes, or job..." />
            </div>
          </Card>

          <Card className="hidden p-4 md:block">
            <SectionHeader title="Ticket list" description={`${filteredRows.length} visible ticket${filteredRows.length === 1 ? "" : "s"}.`} />
            {filteredRows.length === 0 ? (
              <StateCard
                title={visibleJobs.length === 0 && !canManageAll ? "No assigned job yet" : "No delivery tickets match these filters"}
                description={visibleJobs.length === 0 && !canManageAll ? "Contact office if you should be able to record or view deliveries for this job." : "Clear a filter or create a new ticket for a visible job."}
                tone="slate"
              />
            ) : (
              <div className="space-y-3">
                {filteredRows.map((ticket) => (
                  <button
                    key={ticket.id}
                    type="button"
                    onClick={() => setSelectedTicketId(ticket.id)}
                    className={`w-full rounded-3xl border p-4 text-left transition ${selectedTicket?.id === ticket.id ? "border-blue-300 bg-blue-50/80 shadow-panel" : "border-blue-100 bg-white hover:border-blue-200 hover:bg-blue-50/50"}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="break-words text-sm font-black text-slate-950">{deliveryTicketTitle(ticket)}</p>
                        <p className="mt-1 break-words text-xs font-bold text-slate-500">{ticket.job?.title || "Assigned job"} Â· {ticket.supplier || "Supplier pending"}</p>
                      </div>
                      {ticket.archivedAt ? <Badge tone="slate">Archived</Badge> : <Badge tone="blue">{ticket.yardsDelivered ? `${ticket.yardsDelivered} ydÂ³` : "Ticket"}</Badge>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="min-w-0 space-y-4">
          {canCreate ? (
            <>
            <DeliveryTicketMobileAccordionCard title="New delivery ticket" summary={createTicketSummary} badge={<Badge tone="blue">New</Badge>} defaultOpen>
              <div className="grid gap-2.5">
                <DeliveryTicketMobileFieldGroup title="Job / report" summary={createDraft.jobId ? "Job selected" : "Select job"} defaultOpen>
                  <SelectField label="Job" value={createDraft.jobId} onChange={(event) => setCreateDraft((current) => ({ ...current, jobId: event.target.value, reportId: "", ticketUploadId: "" }))}>
                    <option value="">Select a job</option>
                    {visibleJobs.map((job) => <option key={job.id} value={job.id}>{jobTitle(job)}</option>)}
                  </SelectField>
                  <SelectField label="Daily report link" value={createDraft.reportId} onChange={(event) => setCreateDraft((current) => ({ ...current, reportId: event.target.value }))}>
                    <option value="">No linked report</option>
                    {createReportOptions.map((report) => <option key={report.id} value={report.id}>{`${report.job?.title || "Job"} / ${report.reportDate || "No date"}`}</option>)}
                  </SelectField>
                </DeliveryTicketMobileFieldGroup>
                <DeliveryTicketMobileFieldGroup title="Supplier / ticket info" summary={createDraft.supplier || createDraft.ticketNumber || "Supplier and ticket"}>
                  <InputField label="Supplier" value={createDraft.supplier} onChange={(event) => setCreateDraft((current) => ({ ...current, supplier: event.target.value }))} placeholder="Knife River, Cadman, etc." />
                  <InputField label="Ticket number" value={createDraft.ticketNumber} onChange={(event) => setCreateDraft((current) => ({ ...current, ticketNumber: event.target.value }))} />
                </DeliveryTicketMobileFieldGroup>
                <DeliveryTicketMobileFieldGroup title="Truck / timing" summary={createDraft.truckNumber || createDraft.arrivalTime || "Truck and times"}>
                  <InputField label="Truck number" value={createDraft.truckNumber} onChange={(event) => setCreateDraft((current) => ({ ...current, truckNumber: event.target.value }))} />
                  <InputField label="Arrival time" type="datetime-local" value={createDraft.arrivalTime} onChange={(event) => setCreateDraft((current) => ({ ...current, arrivalTime: event.target.value }))} />
                  <InputField label="Discharge time" type="datetime-local" value={createDraft.dischargeTime} onChange={(event) => setCreateDraft((current) => ({ ...current, dischargeTime: event.target.value }))} />
                </DeliveryTicketMobileFieldGroup>
                <DeliveryTicketMobileFieldGroup title="Concrete details" summary={createDraft.yardsDelivered ? `${createDraft.yardsDelivered} yards` : "Yards, PSI, slump"}>
                  <InputField label="Yards delivered" type="number" min="0" step="0.1" value={createDraft.yardsDelivered} onChange={(event) => setCreateDraft((current) => ({ ...current, yardsDelivered: event.target.value }))} />
                  <InputField label="PSI" type="number" min="0" step="1" value={createDraft.psi} onChange={(event) => setCreateDraft((current) => ({ ...current, psi: event.target.value }))} />
                  <InputField label="Slump" type="number" min="0" step="0.1" value={createDraft.slump} onChange={(event) => setCreateDraft((current) => ({ ...current, slump: event.target.value }))} />
                  <TextAreaField label="Mix notes" value={createDraft.mixNotes} onChange={(event) => setCreateDraft((current) => ({ ...current, mixNotes: event.target.value }))} placeholder="Mix design, pump notes, temperature, additives, or placement details." />
                </DeliveryTicketMobileFieldGroup>
                <DeliveryTicketMobileFieldGroup title="Ticket photo / linked upload" summary={createDraft.ticketUploadId ? "Upload linked" : "Optional"}>
                  <SelectField label="Ticket photo/upload" value={createDraft.ticketUploadId} onChange={(event) => setCreateDraft((current) => ({ ...current, ticketUploadId: event.target.value }))}>
                    <option value="">No linked upload</option>
                    {createUploadOptions.map((upload) => <option key={upload.id} value={upload.id}>{upload.caption || upload.fileName}</option>)}
                  </SelectField>
                </DeliveryTicketMobileFieldGroup>
                <DeliveryTicketMobileFieldGroup title="Notes" summary={createDraft.notes ? "Notes added" : "Optional"}>
                  <TextAreaField label="Notes" value={createDraft.notes} onChange={(event) => setCreateDraft((current) => ({ ...current, notes: event.target.value }))} placeholder="Any additional field notes for this delivery ticket." />
                </DeliveryTicketMobileFieldGroup>
                <Button
                  type="button"
                  onClick={async () => {
                    const saved = await onCreateTicket(createDraft);
                    if (saved) {
                      setCreateDraft({ ...INITIAL_DELIVERY_TICKET_FORM, jobId: singleJobId });
                    }
                  }}
                  disabled={busy || !createDraft.jobId}
                >
                  Save delivery ticket
                </Button>
              </div>
            </DeliveryTicketMobileAccordionCard>
            <Card className="hidden p-4 md:block">
              <SectionHeader title="Create ticket" description="Record truck and ticket details from the field without any pricing data." />
              <div className="grid gap-3 md:grid-cols-2">
                <SelectField label="Job" value={createDraft.jobId} onChange={(event) => setCreateDraft((current) => ({ ...current, jobId: event.target.value, reportId: "", ticketUploadId: "" }))}>
                  <option value="">Select a job</option>
                  {visibleJobs.map((job) => <option key={job.id} value={job.id}>{jobTitle(job)}</option>)}
                </SelectField>
                <InputField label="Supplier" value={createDraft.supplier} onChange={(event) => setCreateDraft((current) => ({ ...current, supplier: event.target.value }))} placeholder="Knife River, Cadman, etc." />
                <InputField label="Truck number" value={createDraft.truckNumber} onChange={(event) => setCreateDraft((current) => ({ ...current, truckNumber: event.target.value }))} />
                <InputField label="Ticket number" value={createDraft.ticketNumber} onChange={(event) => setCreateDraft((current) => ({ ...current, ticketNumber: event.target.value }))} />
                <InputField label="Yards delivered" type="number" min="0" step="0.1" value={createDraft.yardsDelivered} onChange={(event) => setCreateDraft((current) => ({ ...current, yardsDelivered: event.target.value }))} />
                <InputField label="PSI" type="number" min="0" step="1" value={createDraft.psi} onChange={(event) => setCreateDraft((current) => ({ ...current, psi: event.target.value }))} />
                <InputField label="Arrival time" type="datetime-local" value={createDraft.arrivalTime} onChange={(event) => setCreateDraft((current) => ({ ...current, arrivalTime: event.target.value }))} />
                <InputField label="Discharge time" type="datetime-local" value={createDraft.dischargeTime} onChange={(event) => setCreateDraft((current) => ({ ...current, dischargeTime: event.target.value }))} />
                <InputField label="Slump" type="number" min="0" step="0.1" value={createDraft.slump} onChange={(event) => setCreateDraft((current) => ({ ...current, slump: event.target.value }))} />
                <SelectField label="Daily report link" value={createDraft.reportId} onChange={(event) => setCreateDraft((current) => ({ ...current, reportId: event.target.value }))}>
                  <option value="">No linked report</option>
                  {createReportOptions.map((report) => <option key={report.id} value={report.id}>{`${report.job?.title || "Job"} Â· ${report.reportDate || "No date"}`}</option>)}
                </SelectField>
                <div className="md:col-span-2">
                  <SelectField label="Ticket photo/upload" value={createDraft.ticketUploadId} onChange={(event) => setCreateDraft((current) => ({ ...current, ticketUploadId: event.target.value }))}>
                    <option value="">No linked upload</option>
                    {createUploadOptions.map((upload) => <option key={upload.id} value={upload.id}>{upload.caption || upload.fileName}</option>)}
                  </SelectField>
                </div>
                <div className="md:col-span-2">
                  <TextAreaField label="Mix notes" value={createDraft.mixNotes} onChange={(event) => setCreateDraft((current) => ({ ...current, mixNotes: event.target.value }))} placeholder="Mix design, pump notes, temperature, additives, or placement details." />
                </div>
                <div className="md:col-span-2">
                  <TextAreaField label="Notes" value={createDraft.notes} onChange={(event) => setCreateDraft((current) => ({ ...current, notes: event.target.value }))} placeholder="Any additional field notes for this delivery ticket." />
                </div>
              </div>
              <div className="mt-4">
                <Button
                  type="button"
                  onClick={async () => {
                    const saved = await onCreateTicket(createDraft);
                    if (saved) {
                      setCreateDraft({ ...INITIAL_DELIVERY_TICKET_FORM, jobId: singleJobId });
                    }
                  }}
                  disabled={busy || !createDraft.jobId}
                >
                  Save delivery ticket
                </Button>
              </div>
            </Card>
            </>
          ) : null}

          {selectedTicket ? (
            <>
            <div className="space-y-3 md:hidden">
              <Card className="co-mobile-detail-card p-3.5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words text-base font-black text-slate-950">{deliveryTicketTitle(selectedTicket)}</p>
                    <p className="mt-1 break-words text-xs font-bold text-slate-500">{selectedTicketSummary}</p>
                  </div>
                  {selectedTicket.archivedAt ? <StatusBadge status="Archived" /> : <Badge tone="blue">{selectedTicket.yardsDelivered ? `${selectedTicket.yardsDelivered} yd` : "Visible"}</Badge>}
                </div>
                {canEditSelected ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant="secondary" onClick={() => onUpdateTicket(selectedTicket.id, detailDraft)} disabled={busy}>Save ticket</Button>
                    {canManageAll ? <Button type="button" size="sm" variant="danger" onClick={() => onArchiveTicket(selectedTicket.id)} disabled={busy || selectedTicket.archivedAt}>Archive</Button> : null}
                  </div>
                ) : null}
              </Card>
              <DeliveryTicketMobileAccordionCard title="Job / report" summary={selectedTicket.job?.title || "Assigned job"} defaultOpen>
                {canEditSelected ? (
                  <>
                    <SelectField label="Job" value={detailDraft.jobId} onChange={(event) => setDetailDraft((current) => ({ ...current, jobId: event.target.value, reportId: "", ticketUploadId: "" }))}>
                      {visibleJobs.map((job) => <option key={job.id} value={job.id}>{jobTitle(job)}</option>)}
                    </SelectField>
                    <SelectField label="Daily report link" value={detailDraft.reportId} onChange={(event) => setDetailDraft((current) => ({ ...current, reportId: event.target.value }))}>
                      <option value="">No linked report</option>
                      {detailReportOptions.map((report) => <option key={report.id} value={report.id}>{`${report.job?.title || "Job"} / ${report.reportDate || "No date"}`}</option>)}
                    </SelectField>
                  </>
                ) : (
                  <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-3 text-sm text-slate-600">
                    <p><span className="font-black text-slate-950">Job:</span> {selectedTicket.job?.title || "Assigned job"}</p>
                    <p className="mt-1"><span className="font-black text-slate-950">Daily report:</span> {selectedTicket.report?.reportDate || "Not linked"}</p>
                  </div>
                )}
              </DeliveryTicketMobileAccordionCard>
              <DeliveryTicketMobileAccordionCard title="Supplier / ticket info" summary={selectedTicket.supplier || selectedTicket.ticketNumber || "Not provided"}>
                {canEditSelected ? (
                  <>
                    <InputField label="Supplier" value={detailDraft.supplier} onChange={(event) => setDetailDraft((current) => ({ ...current, supplier: event.target.value }))} />
                    <InputField label="Ticket number" value={detailDraft.ticketNumber} onChange={(event) => setDetailDraft((current) => ({ ...current, ticketNumber: event.target.value }))} />
                  </>
                ) : (
                  <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-3 text-sm text-slate-600">
                    <p><span className="font-black text-slate-950">Supplier:</span> {selectedTicket.supplier || "Not provided"}</p>
                    <p className="mt-1"><span className="font-black text-slate-950">Ticket:</span> {selectedTicket.ticketNumber || "Not provided"}</p>
                  </div>
                )}
              </DeliveryTicketMobileAccordionCard>
              <DeliveryTicketMobileAccordionCard title="Truck / timing" summary={selectedTicket.truckNumber || selectedTicket.arrivalTime || "Truck and times"}>
                {canEditSelected ? (
                  <>
                    <InputField label="Truck number" value={detailDraft.truckNumber} onChange={(event) => setDetailDraft((current) => ({ ...current, truckNumber: event.target.value }))} />
                    <InputField label="Arrival time" type="datetime-local" value={detailDraft.arrivalTime} onChange={(event) => setDetailDraft((current) => ({ ...current, arrivalTime: event.target.value }))} />
                    <InputField label="Discharge time" type="datetime-local" value={detailDraft.dischargeTime} onChange={(event) => setDetailDraft((current) => ({ ...current, dischargeTime: event.target.value }))} />
                  </>
                ) : (
                  <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-3 text-sm text-slate-600">
                    <p><span className="font-black text-slate-950">Truck:</span> {selectedTicket.truckNumber || "Not provided"}</p>
                    <p className="mt-1"><span className="font-black text-slate-950">Arrival:</span> {selectedTicket.arrivalTime ? formatDateTime(selectedTicket.arrivalTime) : "Not provided"}</p>
                    <p className="mt-1"><span className="font-black text-slate-950">Discharge:</span> {selectedTicket.dischargeTime ? formatDateTime(selectedTicket.dischargeTime) : "Not provided"}</p>
                  </div>
                )}
              </DeliveryTicketMobileAccordionCard>
              <DeliveryTicketMobileAccordionCard title="Concrete details" summary={selectedTicket.yardsDelivered ? `${selectedTicket.yardsDelivered} yards` : "Yards, PSI, slump"}>
                {canEditSelected ? (
                  <>
                    <InputField label="Yards delivered" type="number" min="0" step="0.1" value={detailDraft.yardsDelivered} onChange={(event) => setDetailDraft((current) => ({ ...current, yardsDelivered: event.target.value }))} />
                    <InputField label="PSI" type="number" min="0" step="1" value={detailDraft.psi} onChange={(event) => setDetailDraft((current) => ({ ...current, psi: event.target.value }))} />
                    <InputField label="Slump" type="number" min="0" step="0.1" value={detailDraft.slump} onChange={(event) => setDetailDraft((current) => ({ ...current, slump: event.target.value }))} />
                    <TextAreaField label="Mix notes" value={detailDraft.mixNotes} onChange={(event) => setDetailDraft((current) => ({ ...current, mixNotes: event.target.value }))} />
                  </>
                ) : (
                  <div className="grid gap-2 rounded-2xl border border-blue-100 bg-blue-50/60 p-3 text-sm text-slate-600">
                    <p><span className="font-black text-slate-950">Yards delivered:</span> {selectedTicket.yardsDelivered || "0"}</p>
                    <p><span className="font-black text-slate-950">PSI:</span> {selectedTicket.psi ?? "Not provided"}</p>
                    <p><span className="font-black text-slate-950">Slump:</span> {selectedTicket.slump ?? "Not provided"}</p>
                    <p><span className="font-black text-slate-950">Mix notes:</span> {selectedTicket.mixNotes || "No mix notes provided."}</p>
                  </div>
                )}
              </DeliveryTicketMobileAccordionCard>
              <DeliveryTicketMobileAccordionCard title="Ticket photo / linked upload" summary={selectedTicket.ticketUpload ? "Upload linked" : "Not linked"}>
                {canEditSelected ? (
                  <SelectField label="Ticket photo/upload" value={detailDraft.ticketUploadId} onChange={(event) => setDetailDraft((current) => ({ ...current, ticketUploadId: event.target.value }))}>
                    <option value="">No linked upload</option>
                    {detailUploadOptions.map((upload) => <option key={upload.id} value={upload.id}>{upload.caption || upload.fileName}</option>)}
                  </SelectField>
                ) : null}
                {selectedTicket.ticketUpload ? (
                  <div className="rounded-2xl border border-blue-100 bg-blue-50/30 p-3 text-sm text-slate-700">
                    <p className="font-bold text-slate-900">{selectedTicket.ticketUpload.caption || selectedTicket.ticketUpload.fileName}</p>
                    <button
                      type="button"
                      className="mt-2 inline-flex text-left text-sm font-black text-blue-700 underline-offset-4 hover:underline disabled:text-slate-400"
                      onClick={() => handleOpenLinkedUpload(selectedTicket.ticketUpload)}
                      disabled={!selectedTicket.ticketUpload.contentUrl || !sessionToken}
                    >
                      Open linked upload
                    </button>
                    {linkedUploadError ? <p className="mt-2 text-xs font-bold text-red-600">{linkedUploadError}</p> : null}
                  </div>
                ) : canEditSelected ? null : (
                  <StateCard title="No ticket upload linked" description="A ticket photo can be linked when one is available for this job." tone="slate" />
                )}
              </DeliveryTicketMobileAccordionCard>
              <DeliveryTicketMobileAccordionCard title="Notes" summary={selectedTicket.notes ? "Notes added" : "No notes"}>
                {canEditSelected ? (
                  <TextAreaField label="Notes" value={detailDraft.notes} onChange={(event) => setDetailDraft((current) => ({ ...current, notes: event.target.value }))} />
                ) : (
                  <div className="rounded-2xl border border-blue-100 bg-white p-3 text-sm text-slate-700">
                    <p className="whitespace-pre-wrap">{selectedTicket.notes || "No notes provided."}</p>
                  </div>
                )}
              </DeliveryTicketMobileAccordionCard>
            </div>
            <Card className="hidden p-4 md:block">
              <SectionHeader
                title={deliveryTicketTitle(selectedTicket)}
                description={`${selectedTicket.job?.title || "Assigned job"} Â· ${selectedTicket.createdByName} Â· ${formatDateTime(selectedTicket.createdAt)}`}
                action={selectedTicket.archivedAt ? <StatusBadge status="Archived" /> : <Badge tone="blue">{selectedTicket.yardsDelivered ? `${selectedTicket.yardsDelivered} ydÂ³` : "Visible"}</Badge>}
              />
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-3 text-sm text-slate-600">
                  <p><span className="font-black text-slate-950">Supplier:</span> {selectedTicket.supplier || "Not provided"}</p>
                  <p className="mt-1"><span className="font-black text-slate-950">Truck:</span> {selectedTicket.truckNumber || "Not provided"}</p>
                  <p className="mt-1"><span className="font-black text-slate-950">Ticket:</span> {selectedTicket.ticketNumber || "Not provided"}</p>
                </div>
                <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-3 text-sm text-slate-600">
                  <p><span className="font-black text-slate-950">Yards delivered:</span> {selectedTicket.yardsDelivered || "0"}</p>
                  <p className="mt-1"><span className="font-black text-slate-950">Arrival:</span> {selectedTicket.arrivalTime ? formatDateTime(selectedTicket.arrivalTime) : "Not provided"}</p>
                  <p className="mt-1"><span className="font-black text-slate-950">Discharge:</span> {selectedTicket.dischargeTime ? formatDateTime(selectedTicket.dischargeTime) : "Not provided"}</p>
                </div>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-blue-100 bg-white p-4 text-sm text-slate-700">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Mix notes</p>
                  <p className="mt-2 whitespace-pre-wrap">{selectedTicket.mixNotes || "No mix notes provided."}</p>
                </div>
                <div className="rounded-2xl border border-blue-100 bg-white p-4 text-sm text-slate-700">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Notes</p>
                  <p className="mt-2 whitespace-pre-wrap">{selectedTicket.notes || "No notes provided."}</p>
                </div>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-3 text-sm text-slate-600">
                  <p><span className="font-black text-slate-950">PSI:</span> {selectedTicket.psi ?? "Not provided"}</p>
                </div>
                <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-3 text-sm text-slate-600">
                  <p><span className="font-black text-slate-950">Slump:</span> {selectedTicket.slump ?? "Not provided"}</p>
                </div>
                <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-3 text-sm text-slate-600">
                  <p><span className="font-black text-slate-950">Daily report:</span> {selectedTicket.report?.reportDate || "Not linked"}</p>
                </div>
              </div>
              {selectedTicket.ticketUpload ? (
                <div className="mt-3 rounded-2xl border border-blue-100 bg-blue-50/30 p-4 text-sm text-slate-700">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Linked ticket upload</p>
                  <p className="mt-2 font-bold text-slate-900">{selectedTicket.ticketUpload.caption || selectedTicket.ticketUpload.fileName}</p>
                  <button
                    type="button"
                    className="mt-2 inline-flex text-left text-sm font-black text-blue-700 underline-offset-4 hover:underline disabled:text-slate-400"
                    onClick={() => handleOpenLinkedUpload(selectedTicket.ticketUpload)}
                    disabled={!selectedTicket.ticketUpload.contentUrl || !sessionToken}
                  >
                    Open linked upload
                  </button>
                  {linkedUploadError ? <p className="mt-2 text-xs font-bold text-red-600">{linkedUploadError}</p> : null}
                </div>
              ) : null}
              {canEditSelected ? (
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <SelectField label="Job" value={detailDraft.jobId} onChange={(event) => setDetailDraft((current) => ({ ...current, jobId: event.target.value, reportId: "", ticketUploadId: "" }))}>
                    {visibleJobs.map((job) => <option key={job.id} value={job.id}>{jobTitle(job)}</option>)}
                  </SelectField>
                  <InputField label="Supplier" value={detailDraft.supplier} onChange={(event) => setDetailDraft((current) => ({ ...current, supplier: event.target.value }))} />
                  <InputField label="Truck number" value={detailDraft.truckNumber} onChange={(event) => setDetailDraft((current) => ({ ...current, truckNumber: event.target.value }))} />
                  <InputField label="Ticket number" value={detailDraft.ticketNumber} onChange={(event) => setDetailDraft((current) => ({ ...current, ticketNumber: event.target.value }))} />
                  <InputField label="Yards delivered" type="number" min="0" step="0.1" value={detailDraft.yardsDelivered} onChange={(event) => setDetailDraft((current) => ({ ...current, yardsDelivered: event.target.value }))} />
                  <InputField label="PSI" type="number" min="0" step="1" value={detailDraft.psi} onChange={(event) => setDetailDraft((current) => ({ ...current, psi: event.target.value }))} />
                  <InputField label="Arrival time" type="datetime-local" value={detailDraft.arrivalTime} onChange={(event) => setDetailDraft((current) => ({ ...current, arrivalTime: event.target.value }))} />
                  <InputField label="Discharge time" type="datetime-local" value={detailDraft.dischargeTime} onChange={(event) => setDetailDraft((current) => ({ ...current, dischargeTime: event.target.value }))} />
                  <InputField label="Slump" type="number" min="0" step="0.1" value={detailDraft.slump} onChange={(event) => setDetailDraft((current) => ({ ...current, slump: event.target.value }))} />
                  <SelectField label="Daily report link" value={detailDraft.reportId} onChange={(event) => setDetailDraft((current) => ({ ...current, reportId: event.target.value }))}>
                    <option value="">No linked report</option>
                    {detailReportOptions.map((report) => <option key={report.id} value={report.id}>{`${report.job?.title || "Job"} Â· ${report.reportDate || "No date"}`}</option>)}
                  </SelectField>
                  <div className="md:col-span-2">
                    <SelectField label="Ticket photo/upload" value={detailDraft.ticketUploadId} onChange={(event) => setDetailDraft((current) => ({ ...current, ticketUploadId: event.target.value }))}>
                      <option value="">No linked upload</option>
                      {detailUploadOptions.map((upload) => <option key={upload.id} value={upload.id}>{upload.caption || upload.fileName}</option>)}
                    </SelectField>
                  </div>
                  <div className="md:col-span-2">
                    <TextAreaField label="Mix notes" value={detailDraft.mixNotes} onChange={(event) => setDetailDraft((current) => ({ ...current, mixNotes: event.target.value }))} />
                  </div>
                  <div className="md:col-span-2">
                    <TextAreaField label="Notes" value={detailDraft.notes} onChange={(event) => setDetailDraft((current) => ({ ...current, notes: event.target.value }))} />
                  </div>
                  <div className="md:col-span-2 flex flex-wrap gap-2">
                    <Button type="button" variant="secondary" onClick={() => onUpdateTicket(selectedTicket.id, detailDraft)} disabled={busy}>Save ticket</Button>
                    {canManageAll ? <Button type="button" variant="danger" onClick={() => onArchiveTicket(selectedTicket.id)} disabled={busy || selectedTicket.archivedAt}>Archive</Button> : null}
                  </div>
                </div>
              ) : null}
            </Card>
            </>
          ) : (
            <>
              <DeliveryTicketMobileAccordionCard title="Ticket details" summary="Select a ticket to review details">
                <StateCard title="No delivery ticket selected" description="Choose a delivery ticket from the list or create one for a visible job." tone="slate" />
              </DeliveryTicketMobileAccordionCard>
              <Card className="hidden p-4 md:block">
                <SectionHeader title="Ticket details" description="Select a delivery ticket to review truck, mix, and yardage details." />
                <StateCard title="No delivery ticket selected" description="Choose a delivery ticket from the list or create one for a visible job." tone="slate" />
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function DeliveryTicketsPage(props) {
  return <DeliveryTicketsPagePolished {...props} />;
}
