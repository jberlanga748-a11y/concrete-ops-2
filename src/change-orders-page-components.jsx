import { useEffect, useMemo, useRef, useState } from "react";

import {
  ApexOfficeCommandShell,
  Badge,
  Button,
  Card,
  DesktopCommandDrawer,
  DesktopCommandWorkspaceFrame,
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
import {
  buildChangeOrderMoneyPacket,
  changeOrderReviewStatusLabel,
  changeOrderStatusLabel,
  deriveChangeOrderFinishState,
  deriveChangeOrderListState,
  filterChangeOrderRequests,
} from "./change-order-utils";
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
const INITIAL_CHANGE_ORDER_REQUEST_FORM = {
  jobId: "",
  reason: "",
  scopeDescription: "",
  fieldNotes: "",
};

function changeOrderStatusTone(status) {
  const normalized = String(status || "").trim().toLowerCase();
  if (normalized === "approved_for_pricing" || normalized === "approved for pricing") return "green";
  if (normalized === "under_review" || normalized === "under review") return "blue";
  if (normalized === "rejected") return "red";
  if (normalized === "archived") return "slate";
  return "amber";
}

function changeOrderJobLabel(request) {
  return request?.job?.title || request?.jobTitle || "Assigned job";
}

function changeOrderCustomerLabel(request, canShowCustomer = true) {
  if (!canShowCustomer) return "Assigned job";
  return request?.job?.customer || request?.customerName || "Customer pending";
}

function changeOrderDisplayStatusLabel(status, canManage = true) {
  const normalized = String(status || "").trim().toLowerCase();
  if (normalized === "approved_for_pricing") return "Approved";
  return changeOrderStatusLabel(status);
}

function changeOrderDisplayFilterLabel(filter, canManage = true) {
  if (filter === "Approved for Pricing") return "Approved";
  return filter;
}

function changeOrderRequestDate(request) {
  return request?.createdAt || request?.updatedAt || request?.reviewedAt;
}

function ChangeOrdersTablePolished({
  rows,
  selectedId,
  onSelect,
  canManage,
  mobileMaxRows = null,
  mobileExpanded = false,
  onToggleMobileRows,
}) {
  const mobileRows = mobileMaxRows ? rows.slice(0, mobileMaxRows) : rows;

  return (
    <>
      <div className="co-change-orders-mobile-list grid gap-3 p-3 md:hidden">
        {mobileRows.map((request) => {
          const selected = request.id === selectedId;
          const statusLabel = changeOrderDisplayStatusLabel(request.status, canManage);

          return (
            <button
              key={request.id}
              type="button"
              onClick={() => onSelect(request.id)}
              className={`co-change-orders-mobile-card co-mobile-record-card w-full rounded-[1.05rem] border p-4 text-left transition ${selected ? "is-selected border-orange-200 bg-orange-50/75" : "border-slate-200 bg-white hover:border-orange-200 hover:bg-orange-50/35"}`}
            >
              <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="break-words text-base font-black text-slate-950">{changeOrderJobLabel(request)}</p>
                  <p className="mt-1 break-words text-xs font-bold text-slate-500">{request.requestedByName || "Requester pending"} / {request.reason || "Reason pending"}</p>
                </div>
                <Badge tone={changeOrderStatusTone(request.status)}>{statusLabel}</Badge>
              </div>
              <div className="co-change-orders-mobile-metrics">
                <span>{canManage ? "Customer" : "Job"} <strong>{changeOrderCustomerLabel(request, canManage)}</strong></span>
                <span>Created <strong>{formatDateTime(changeOrderRequestDate(request)) || "Not set"}</strong></span>
                <span>Review <strong>{request.reviewedByName || (request.status === "requested" ? "Pending" : "Office")}</strong></span>
              </div>
            </button>
          );
        })}
        {rows.length > 1 ? (
          <button type="button" className="co-change-orders-mobile-list-toggle" onClick={onToggleMobileRows}>
            {mobileExpanded ? "Show priority request" : `Show all ${rows.length} requests`}
          </button>
        ) : null}
      </div>
      <div className="co-change-orders-list-scroll hidden min-w-0 overflow-auto md:block">
        <table className="co-change-orders-command-table w-full min-w-[920px] text-left">
          <thead>
            <tr>
              <th>Job / Reason</th>
              <th>Status</th>
              <th>{canManage ? "Customer" : "Job"}</th>
              <th>Requested By</th>
              <th>Created</th>
              <th>Review</th>
              <th>Open</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((request) => {
              const selected = request.id === selectedId;
              const statusLabel = changeOrderDisplayStatusLabel(request.status, canManage);

              return (
                <tr key={request.id} onClick={() => onSelect(request.id)} className={`cursor-pointer transition hover:bg-orange-50/45 ${selected ? "bg-orange-50/70" : ""}`}>
                  <td>
                    <p className="font-black text-slate-950">{changeOrderJobLabel(request)}</p>
                    <p className="text-xs font-bold text-slate-500">{request.reason || "Reason pending"}</p>
                  </td>
                  <td><Badge tone={changeOrderStatusTone(request.status)}>{statusLabel}</Badge></td>
                  <td className="font-bold text-slate-700">{changeOrderCustomerLabel(request, canManage)}</td>
                  <td className="font-bold text-slate-700">{request.requestedByName || "Requester pending"}</td>
                  <td className="font-bold text-slate-700">{formatDateTime(changeOrderRequestDate(request))}</td>
                  <td className="font-bold text-slate-700">{request.reviewedByName || "Pending"}</td>
                  <td>
                    <button type="button" className="co-change-orders-icon-button" onClick={(event) => { event.stopPropagation(); onSelect(request.id); }} aria-label={`Open change order request ${request.id}`}>
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

function ChangeOrdersMobileFocusPanel({
  filteredCount,
  requestedCount,
  underReviewCount,
  approvedCount,
  canCreate,
  canManage,
  onCreate,
  onOpenBoard,
  onOpenRequested,
  onOpenUnderReview,
  onOpenApproved,
}) {
  return (
    <section className="co-change-orders-mobile-focus mx-4 mb-3 md:hidden" aria-label="Change orders mobile focus">
      <div className="co-change-orders-mobile-focus-copy">
        <span>Change Console</span>
        <h2>{requestedCount ? "Review field scope changes" : "Ready for the next request"}</h2>
        <p>{requestedCount ? `${requestedCount} request${requestedCount === 1 ? "" : "s"} need office triage.` : canManage ? "Capture field scope changes before office cost review." : "Capture field scope changes with job, reason, scope, and notes only."}</p>
      </div>
      <div className="co-change-orders-mobile-focus-actions">
        {canCreate ? (
          <Button type="button" onClick={onCreate}>
            <Icon name="plus" />
            New Request
          </Button>
        ) : null}
        <Button type="button" variant={canCreate ? "secondary" : undefined} onClick={onOpenBoard}>
          <Icon name="refresh" />
          View Board
        </Button>
      </div>
      <div className="co-change-orders-mobile-focus-metrics">
        <button type="button" onClick={onOpenBoard} data-tone={filteredCount ? "orange" : "slate"}>
          <span>Visible</span>
          <strong>{filteredCount}</strong>
        </button>
        <button type="button" onClick={onOpenRequested} data-tone={requestedCount ? "amber" : "green"}>
          <span>Review</span>
          <strong>{requestedCount}</strong>
        </button>
        <button type="button" onClick={onOpenUnderReview} data-tone={underReviewCount ? "blue" : "slate"}>
          <span>Office</span>
          <strong>{underReviewCount}</strong>
        </button>
        <button type="button" onClick={onOpenApproved} data-tone={approvedCount ? "green" : "slate"}>
          <span>Approved</span>
          <strong>{approvedCount}</strong>
        </button>
      </div>
    </section>
  );
}

function ChangeOrdersCommandRailPolished({ request, detailDraft = {}, canCreate, canManage, busy, onOpenTool, onArchive }) {
  if (!request) {
    return (
      <div className="co-change-orders-right-rail co-change-orders-command-assistant space-y-4">
        <div className="co-change-orders-rail-card co-change-orders-assistant-card p-4">
          <SectionHeader title="Change Console" description="Select a request or capture a field scope change for office review." />
          <div className="co-change-orders-empty-rail">
            <span><Icon name="refresh" /></span>
            <strong>No request selected</strong>
            <p>{canManage ? "Change orders stay organized here: scope, reason, job, status, and office review before cost decisions." : "Change orders stay field-safe here: scope, reason, job, status, and office review only."}</p>
          </div>
          {canCreate ? <Button type="button" className="mt-3 w-full" onClick={() => onOpenTool("create")}>New Request</Button> : null}
        </div>
      </div>
    );
  }

  const statusLabel = changeOrderDisplayStatusLabel(request.status, canManage);
  const moneyPacket = canManage ? buildChangeOrderMoneyPacket({ ...request, ...detailDraft }) : null;
  const needsOfficeReview = request.status === "requested" || request.status === "under_review";

  return (
    <div className="co-change-orders-right-rail co-change-orders-command-assistant space-y-4">
      <div className="co-change-orders-rail-card co-change-orders-assistant-card p-4">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Selected change</p>
            <h3 className="mt-2 break-words text-xl font-black leading-tight text-slate-950">{changeOrderJobLabel(request)}</h3>
            <p className="mt-1 break-words text-xs font-black text-slate-500">{changeOrderCustomerLabel(request, canManage)} / {request.requestedByName || "Requester pending"}</p>
          </div>
          <Badge tone={changeOrderStatusTone(request.status)}>{statusLabel}</Badge>
        </div>

        <div className="co-change-orders-selected-metrics">
          <div>
            <span>Status</span>
            <strong>{statusLabel}</strong>
          </div>
          <div>
            <span>Created</span>
            <strong>{formatDateTime(changeOrderRequestDate(request)) || "Not set"}</strong>
          </div>
          <div>
            <span>Requester</span>
            <strong>{request.requestedByName || "Pending"}</strong>
          </div>
          <div>
            <span>Review</span>
            <strong>{request.reviewedByName || "Pending"}</strong>
          </div>
        </div>

        <div className="co-change-orders-note-panel">
          <span>Reason</span>
          <p>{request.reason || "No reason recorded yet."}</p>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button type="button" size="sm" onClick={() => onOpenTool("review")}>{canManage ? "Review" : "Details"}</Button>
          {canCreate ? <Button type="button" size="sm" variant="secondary" onClick={() => onOpenTool("create")}>New Request</Button> : null}
          {canManage ? <Button type="button" size="sm" variant="danger" onClick={() => onArchive(request.id)} disabled={busy || request.archivedAt}>Archive</Button> : null}
        </div>
      </div>

      <div className="co-change-orders-rail-card co-change-orders-assistant-card p-4">
        <SectionHeader title="Readiness" description={canManage ? "Track what the office needs before costing, approving, or rejecting the change." : "Track what the office needs before approving or rejecting the change."} />
        <div className="co-change-orders-readiness-list">
          <span data-state={request.jobId ? "ready" : "needs"}>Job link <strong>{request.jobId ? "Set" : "Needed"}</strong></span>
          <span data-state={request.reason ? "ready" : "needs"}>Reason <strong>{request.reason ? "Set" : "Needed"}</strong></span>
          <span data-state={request.scopeDescription ? "ready" : "needs"}>Scope <strong>{request.scopeDescription ? "Written" : "Needed"}</strong></span>
          <span data-state={needsOfficeReview ? "needs" : "ready"}>Office <strong>{needsOfficeReview ? "Review" : statusLabel}</strong></span>
          {canManage ? <span data-state={moneyPacket?.priced ? "ready" : "needs"}>Pricing <strong>{moneyPacket?.priced ? "Set" : "Needed"}</strong></span> : null}
          {canManage ? <span data-state={moneyPacket?.readyForBillingHandoff ? "ready" : "needs"}>Billing prep <strong>{moneyPacket?.readyForBillingHandoff ? "Manual ready" : "Locked"}</strong></span> : null}
        </div>
      </div>
    </div>
  );
}

function ChangeOrderCreatePanelPolished({
  canCreate,
  canManage,
  visibleJobs,
  createDraft,
  setCreateDraft,
  singleJobId,
  busy,
  onCreateRequest,
}) {
  if (!canCreate) {
    return (
      <Card className="co-change-orders-form-card p-4">
        <StateCard title="Create unavailable" description={visibleJobs.length ? "This role can review visible change orders but cannot create new requests." : "No assigned job is available for a field change request yet."} tone="slate" />
      </Card>
    );
  }

  return (
    <Card className="co-change-orders-form-card p-4">
      <SectionHeader title="New Change Order Request" description={canManage ? "Capture field scope changes for office review before any cost or billing decision." : "Capture field scope changes for office review with job, reason, scope, and notes only."} />
      <div className="co-change-orders-form-grid">
        <SelectField label="Job" value={createDraft.jobId} onChange={(event) => setCreateDraft((current) => ({ ...current, jobId: event.target.value }))}>
          <option value="">Select a job</option>
          {visibleJobs.map((job) => <option key={job.id} value={job.id}>{jobTitle(job)}</option>)}
        </SelectField>
        <InputField label="Reason" value={createDraft.reason} onChange={(event) => setCreateDraft((current) => ({ ...current, reason: event.target.value }))} placeholder="Why does this change need review?" />
        <div className="md:col-span-2">
          <TextAreaField label="Scope description" value={createDraft.scopeDescription} onChange={(event) => setCreateDraft((current) => ({ ...current, scopeDescription: event.target.value }))} placeholder="Describe the requested scope change clearly." />
        </div>
        <div className="md:col-span-2">
          <TextAreaField label="Field notes" value={createDraft.fieldNotes} onChange={(event) => setCreateDraft((current) => ({ ...current, fieldNotes: event.target.value }))} placeholder="Optional site notes for the office team." />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={async () => {
            const saved = await onCreateRequest(createDraft);
            if (saved) {
              setCreateDraft({ ...INITIAL_CHANGE_ORDER_REQUEST_FORM, jobId: singleJobId });
            }
          }}
          disabled={busy || !createDraft.jobId || !createDraft.reason || !createDraft.scopeDescription}
        >
          Submit request
        </Button>
      </div>
    </Card>
  );
}

function ChangeOrderDetailPanelPolished({
  request,
  detailDraft,
  setDetailDraft,
  canManage,
  busy,
  onUpdateRequest,
  onArchiveRequest,
}) {
  if (!request) {
    return (
      <Card className="co-change-orders-form-card p-4">
        <StateCard title="No request selected" description="Choose a change order from the board to review scope, notes, and office status." tone="slate" />
      </Card>
    );
  }

  const statusLabel = changeOrderDisplayStatusLabel(request.status, canManage);
  const moneyPacket = canManage ? buildChangeOrderMoneyPacket({ ...request, ...detailDraft }) : null;

  return (
    <Card className="co-change-orders-form-card p-4">
      <SectionHeader
        title={changeOrderJobLabel(request)}
        description={`${request.requestedByName || "Requester pending"} / ${formatDateTime(changeOrderRequestDate(request)) || "Date pending"}`}
        action={<Badge tone={changeOrderStatusTone(request.status)}>{statusLabel}</Badge>}
      />
      <div className="co-change-orders-readonly-grid">
        <div><span>Reason</span><strong>{request.reason || "Not provided"}</strong></div>
        <div><span>Requested By</span><strong>{request.requestedByName || "Not provided"}</strong></div>
        <div><span>Status</span><strong>{statusLabel}</strong></div>
        <div><span>Reviewed By</span><strong>{request.reviewedByName || "Not reviewed"}</strong></div>
      </div>
      <div className="co-change-orders-note-panel">
        <span>Scope description</span>
        <p>{request.scopeDescription || "No scope description provided."}</p>
      </div>
      <div className="co-change-orders-note-panel">
        <span>Field notes</span>
        <p>{request.fieldNotes || "No field notes provided."}</p>
      </div>

      {canManage ? (
        <div className="mt-4 space-y-3">
          <Card className="co-change-orders-form-card p-4">
            <SectionHeader
              title="Money review"
              description="Manual change-order pricing, customer/GC review, and billing handoff prep. No invoice, payment, send, or job status change happens here."
              action={<Badge tone={moneyPacket?.readyForBillingHandoff ? "green" : "amber"}>{moneyPacket?.readyForBillingHandoff ? "Manual handoff ready" : "Locked"}</Badge>}
            />
            <div className="co-change-orders-readonly-grid">
              <div><span>Amount</span><strong>{moneyPacket?.priceLabel || "Manual pricing required"}</strong></div>
              <div><span>Customer review</span><strong>{changeOrderReviewStatusLabel(detailDraft.customerReviewStatus)}</strong></div>
              <div><span>GC review</span><strong>{changeOrderReviewStatusLabel(detailDraft.gcReviewStatus)}</strong></div>
              <div><span>Billing handoff</span><strong>{moneyPacket?.readyForBillingHandoff ? "Ready for manual prep" : "Locked"}</strong></div>
            </div>
            {moneyPacket?.blockers?.length ? (
              <ul className="co-change-orders-readiness-list mt-3">
                {moneyPacket.blockers.map((blocker) => (
                  <li key={blocker} data-state="needs">{blocker}</li>
                ))}
              </ul>
            ) : null}
          </Card>
          <SelectField label="Status" value={detailDraft.status} onChange={(event) => setDetailDraft((current) => ({ ...current, status: event.target.value }))}>
            <option value="requested">Requested</option>
            <option value="under_review">Under Review</option>
            <option value="approved_for_pricing">Approved for Pricing</option>
            <option value="rejected">Rejected</option>
          </SelectField>
          <InputField label="Manual change amount" type="number" min="0" step="0.01" value={detailDraft.priceAmount} onChange={(event) => setDetailDraft((current) => ({ ...current, priceAmount: event.target.value }))} placeholder="0.00" />
          <SelectField label="Customer review status" value={detailDraft.customerReviewStatus} onChange={(event) => setDetailDraft((current) => ({ ...current, customerReviewStatus: event.target.value }))}>
            <option value="not_ready">Not Ready</option>
            <option value="ready_for_manual_review">Ready For Manual Review</option>
            <option value="sent_manually">Sent Manually</option>
            <option value="accepted_manually">Accepted Manually</option>
            <option value="rejected_manually">Rejected Manually</option>
          </SelectField>
          <SelectField label="GC review status" value={detailDraft.gcReviewStatus} onChange={(event) => setDetailDraft((current) => ({ ...current, gcReviewStatus: event.target.value }))}>
            <option value="not_ready">Not Ready</option>
            <option value="ready_for_manual_review">Ready For Manual Review</option>
            <option value="sent_manually">Sent Manually</option>
            <option value="accepted_manually">Accepted Manually</option>
            <option value="rejected_manually">Rejected Manually</option>
          </SelectField>
          <SelectField label="Billing handoff" value={detailDraft.billingHandoffStatus} onChange={(event) => setDetailDraft((current) => ({ ...current, billingHandoffStatus: event.target.value }))}>
            <option value="locked">Locked</option>
            <option value="ready_for_manual_billing_handoff">Ready For Manual Billing Handoff</option>
            <option value="handed_off_manually">Handed Off Manually</option>
          </SelectField>
          <TextAreaField label="Office notes" value={detailDraft.officeNotes} onChange={(event) => setDetailDraft((current) => ({ ...current, officeNotes: event.target.value }))} placeholder="Internal office notes only." />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => onUpdateRequest(request.id, detailDraft)} disabled={busy}>Save review</Button>
            <Button type="button" variant="danger" onClick={() => onArchiveRequest(request.id)} disabled={busy || request.archivedAt}>Archive</Button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}

function ChangeOrdersPagePolished({
  user,
  jobs,
  changeOrderRequests,
  permissions,
  busy,
  onCreateRequest,
  onUpdateRequest,
  onArchiveRequest,
  assistantChangeOrderReviewSeed = null,
  onAssistantChangeOrderReviewSeedHandled = () => {},
}) {
  const [statusFilter, setStatusFilter] = useState("All");
  const [jobFilter, setJobFilter] = useState("All jobs");
  const [requesterFilter, setRequesterFilter] = useState("All requesters");
  const [dateFilter, setDateFilter] = useState("All dates");
  const [archiveFilter, setArchiveFilter] = useState("Active");
  const [search, setSearch] = useState("");
  const [selectedRequestId, setSelectedRequestId] = useState("");
  const [createDraft, setCreateDraft] = useState(INITIAL_CHANGE_ORDER_REQUEST_FORM);
  const [detailDraft, setDetailDraft] = useState({ status: "requested", officeNotes: "", priceAmount: "", customerReviewStatus: "not_ready", gcReviewStatus: "not_ready", billingHandoffStatus: "locked" });
  const [showTools, setShowTools] = useState(false);
  const [toolTab, setToolTab] = useState("create");
  const [changeOrderShellSelectionId, setChangeOrderShellSelectionId] = useState("");
  const [changeOrderShellMode, setChangeOrderShellMode] = useState("detail");
  const [showAllMobileRows, setShowAllMobileRows] = useState(false);
  const toolsRef = useRef(null);
  const boardRef = useRef(null);

  const visibleJobs = Array.isArray(jobs) ? jobs.filter((job) => !job.archivedAt) : [];
  const canManage = Boolean(permissions.changeOrders.canManage);
  const baseCanCreate = Boolean(permissions.changeOrders.canRequest || permissions.changeOrders.canManage);
  const canCreate = baseCanCreate && (canManage || visibleJobs.length > 0);
  const visibleJobIds = useMemo(() => new Set(visibleJobs.map((job) => job.id).filter(Boolean)), [visibleJobs]);
  const rows = useMemo(() => {
    const sourceRows = Array.isArray(changeOrderRequests) ? changeOrderRequests : [];
    if (canManage) return sourceRows;
    return sourceRows.filter((request) => visibleJobIds.has(request.jobId || request.job?.id));
  }, [canManage, changeOrderRequests, visibleJobIds]);
  const filteredRows = useMemo(() => filterChangeOrderRequests(rows, {
    status: statusFilter,
    job: jobFilter,
    requestedBy: requesterFilter,
    date: dateFilter,
    archived: archiveFilter,
    search,
  }), [archiveFilter, dateFilter, jobFilter, requesterFilter, rows, search, statusFilter]);
  const listState = useMemo(() => deriveChangeOrderListState(filteredRows, visibleJobs), [filteredRows, visibleJobs]);
  const selectedRequest = filteredRows.find((request) => request.id === selectedRequestId)
    || rows.find((request) => request.id === selectedRequestId)
    || filteredRows[0]
    || null;
  const singleJobId = visibleJobs.length === 1 ? visibleJobs[0].id : "";
  const totalOpen = rows.filter((request) => !request.archivedAt && !["approved_for_pricing", "rejected", "archived"].includes(String(request.status || ""))).length;
  const activeChangeRows = rows.filter((request) => !request.archivedAt && !["approved_for_pricing", "rejected", "archived"].includes(String(request.status || "")));
  const requestedRows = activeChangeRows.filter((request) => request.status === "requested");
  const underReviewRows = activeChangeRows.filter((request) => request.status === "under_review");
  const missingDetailRows = activeChangeRows.filter((request) => !request.jobId || !request.reason || !request.scopeDescription);
  const finishState = useMemo(() => deriveChangeOrderFinishState(rows, { canManage }), [canManage, rows]);
  const changeOrderKpis = [
    { label: "Needs Review", value: filteredRows.filter((request) => request.status === "requested").length, helper: "Waiting for office review", icon: "alert", tone: "amber", actionLabel: "Review", onAction: () => setStatusFilter("Requested") },
    { label: "Under Review", value: filteredRows.filter((request) => request.status === "under_review").length, helper: "Being reviewed now", icon: "clock", tone: "blue", actionLabel: "Open", onAction: () => setStatusFilter("Under Review") },
    { label: "Approved", value: finishState.counts.approvedForPricing, helper: canManage ? "Manual pricing or review tracked" : "Accepted by the office", icon: "check", tone: "green", actionLabel: "Approved", onAction: () => setStatusFilter("Approved for Pricing") },
    { label: "Needs Details", value: missingDetailRows.length, helper: "Missing job, reason, or scope context", icon: "clipboard", tone: missingDetailRows.length ? "orange" : "green", actionLabel: missingDetailRows.length ? "Fix details" : "Ready", onAction: () => openPriorityRequest((request) => missingDetailRows.some((entry) => entry.id === request.id), { statusFilter: "All", archiveFilter: "Active", search: "", toolTab: missingDetailRows.length ? "review" : "" }) },
  ];
  const statusFilterOptions = ["All", "Requested", "Under Review", "Approved for Pricing", "Rejected"].map((filter) => ({
    value: filter,
    label: changeOrderDisplayFilterLabel(filter, canManage),
  }));
  const canUseChangeOrdersCommandShell = Boolean(canManage);

  useEffect(() => {
    if (!filteredRows.length) {
      if (selectedRequestId) setSelectedRequestId("");
      return;
    }
    if (!selectedRequestId || !filteredRows.some((request) => request.id === selectedRequestId)) {
      setSelectedRequestId(filteredRows[0].id);
    }
  }, [filteredRows, selectedRequestId]);

  useEffect(() => {
    if (singleJobId && !createDraft.jobId) {
      setCreateDraft((current) => ({ ...current, jobId: singleJobId }));
    }
  }, [createDraft.jobId, singleJobId]);

  useEffect(() => {
    setDetailDraft({
      status: selectedRequest?.status || "requested",
      officeNotes: selectedRequest?.officeNotes || "",
      priceAmount: selectedRequest?.priceAmount || "",
      customerReviewStatus: selectedRequest?.customerReviewStatus || "not_ready",
      gcReviewStatus: selectedRequest?.gcReviewStatus || "not_ready",
      billingHandoffStatus: selectedRequest?.billingHandoffStatus || "locked",
    });
  }, [selectedRequest?.id, selectedRequest?.status, selectedRequest?.officeNotes, selectedRequest?.priceAmount, selectedRequest?.customerReviewStatus, selectedRequest?.gcReviewStatus, selectedRequest?.billingHandoffStatus]);

  function clearFilters() {
    setStatusFilter("All");
    setJobFilter("All jobs");
    setRequesterFilter("All requesters");
    setDateFilter("All dates");
    setArchiveFilter("Active");
    setSearch("");
  }

  function openTools(nextTab = "create") {
    if (canUseChangeOrdersCommandShell) {
      setToolTab(nextTab);
      setShowTools(false);
      if (nextTab === "create" && canCreate) {
        setChangeOrderShellMode("create");
        setChangeOrderShellSelectionId("create-change-order");
      } else {
        setChangeOrderShellMode("detail");
      }
      return;
    }
    setToolTab(nextTab);
    setShowTools(true);
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 1179px)").matches) {
      window.setTimeout(() => toolsRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" }), 0);
    }
  }

  function jumpToBoard() {
    window.setTimeout(() => boardRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" }), 0);
  }

  function toggleMobileRows() {
    setShowAllMobileRows((current) => {
      const next = !current;
      if (next) {
        window.setTimeout(() => window.scrollBy?.({ top: 130, left: 0, behavior: "smooth" }), 0);
      }
      return next;
    });
  }

  function openPriorityRequest(matchRequest, options = {}) {
    const targetRequest = filteredRows.find(matchRequest) || rows.find(matchRequest);
    if (options.statusFilter) setStatusFilter(options.statusFilter);
    if (options.archiveFilter) setArchiveFilter(options.archiveFilter);
    if (options.search !== undefined) setSearch(options.search);
    if (targetRequest?.id) setSelectedRequestId(targetRequest.id);
    if (options.toolTab) openTools(options.toolTab);
  }

  useEffect(() => {
    const seed = assistantChangeOrderReviewSeed;
    if (!seed?.nonce || !canManage) return;

    const targetRequest = seed.changeOrderRequestId
      ? rows.find((request) => request?.id === seed.changeOrderRequestId)
      : requestedRows[0] || underReviewRows[0] || activeChangeRows[0] || rows.find((request) => !request?.archivedAt) || null;

    setStatusFilter("All");
    setJobFilter("All jobs");
    setRequesterFilter("All requesters");
    setDateFilter("All dates");
    setArchiveFilter(targetRequest?.archivedAt ? "All" : "Active");
    setSearch("");
    if (targetRequest?.id) setSelectedRequestId(targetRequest.id);
    openTools("review");
    onAssistantChangeOrderReviewSeedHandled(seed.nonce);
  }, [assistantChangeOrderReviewSeed?.nonce, activeChangeRows, canManage, onAssistantChangeOrderReviewSeedHandled, requestedRows, rows, underReviewRows]);

  const needsReviewPriorityCard = {
    label: "Needs review",
    value: requestedRows.length,
    helper: requestedRows.length ? "Field scope changes are waiting for office triage." : "No requested change orders need first review.",
    icon: "alert",
    tone: requestedRows.length ? "amber" : "green",
    actionLabel: requestedRows.length ? "Review" : "All clear",
    onAction: () => openPriorityRequest((request) => request.status === "requested" && !request.archivedAt, { statusFilter: requestedRows.length ? "Requested" : "All", archiveFilter: "Active", search: "", toolTab: requestedRows.length ? "review" : "" }),
  };
  const officeReviewPriorityCard = {
    label: "In office review",
    value: underReviewRows.length,
    helper: underReviewRows.length ? "Requests are already being reviewed by the office." : "Nothing is currently marked under review.",
    icon: "clock",
    tone: underReviewRows.length ? "blue" : "slate",
    actionLabel: underReviewRows.length ? "Open" : "None",
    onAction: () => openPriorityRequest((request) => request.status === "under_review" && !request.archivedAt, { statusFilter: underReviewRows.length ? "Under Review" : "All", archiveFilter: "Active", search: "", toolTab: underReviewRows.length ? "review" : "" }),
  };
  const detailsPriorityCard = {
    label: "Needs details",
    value: missingDetailRows.length,
    helper: missingDetailRows.length ? "Job, reason, or scope context is incomplete." : "Open change requests have their core details.",
    icon: "clipboard",
    tone: missingDetailRows.length ? "orange" : "green",
    actionLabel: missingDetailRows.length ? "Fix details" : "Ready",
    onAction: () => openPriorityRequest((request) => missingDetailRows.some((entry) => entry.id === request.id), { statusFilter: "All", archiveFilter: "Active", search: "", toolTab: missingDetailRows.length ? "review" : "" }),
  };
  const newRequestPriorityCard = {
    label: "New request",
    value: canCreate ? "Ready" : "Locked",
    helper: canCreate ? canManage ? "Capture a field scope change before office cost work." : "Capture a field scope change with job, scope, and notes only." : "This role can review visible requests only.",
    icon: "plus",
    tone: canCreate ? "orange" : "slate",
    actionLabel: canCreate ? "Create" : "View only",
    onAction: () => canCreate ? openTools("create") : openPriorityRequest((request) => request.id === selectedRequest?.id),
  };
  const changeOrderPriorityCards = filteredRows.length === 0 && canCreate
    ? [newRequestPriorityCard, needsReviewPriorityCard, officeReviewPriorityCard, detailsPriorityCard]
    : [needsReviewPriorityCard, officeReviewPriorityCard, detailsPriorityCard, newRequestPriorityCard];
  const fieldTabletChangeOrderRows = useMemo(() => {
    const items = [];
    const seen = new Set();

    function addRequest(request, priorityLabel) {
      if (!request?.id || seen.has(request.id)) return;
      seen.add(request.id);
      items.push({
        id: request.id,
        request,
        title: changeOrderJobLabel(request),
        meta: [request.reason || "Reason needed", request.scopeDescription ? "Scope ready" : "Needs scope"].join(" / "),
        statusLabel: changeOrderDisplayStatusLabel(request.status, canManage),
        statusTone: changeOrderStatusTone(request.status),
        priorityLabel,
      });
    }

    requestedRows.forEach((request) => addRequest(request, "Review"));
    underReviewRows.forEach((request) => addRequest(request, "Tracking"));
    missingDetailRows.forEach((request) => addRequest(request, "Context"));
    filteredRows.filter((request) => !request.archivedAt).forEach((request) => addRequest(request, "Request"));
    rows.forEach((request) => addRequest(request, "History"));

    return items.slice(0, 5);
  }, [canManage, filteredRows, missingDetailRows, requestedRows, rows, underReviewRows]);
  const selectedFieldTabletChangeOrder = fieldTabletChangeOrderRows.find((item) => item.id === selectedRequest?.id)?.request
    || selectedRequest
    || fieldTabletChangeOrderRows[0]?.request
    || null;
  const fieldTabletChangeOrderKpis = [
    { label: "Request Change", value: canCreate ? "Ready" : "View", helper: canCreate ? "Job, scope, notes" : "No request access", tone: canCreate ? "orange" : "slate" },
    { label: "Track Requests", value: activeChangeRows.length, helper: "Open field requests", tone: activeChangeRows.length ? "amber" : "green" },
    { label: "Needs Context", value: missingDetailRows.length, helper: "Proof or scope gaps", tone: missingDetailRows.length ? "orange" : "green" },
    { label: "Office Review", value: underReviewRows.length, helper: "In review now", tone: underReviewRows.length ? "blue" : "slate" },
  ];

  const changeOrderShellKpis = [
    {
      id: "needs-review",
      label: "Needs Review",
      value: requestedRows.length,
      helper: "Waiting for office triage",
      icon: "alert",
      tone: requestedRows.length ? "amber" : "green",
      onClick: () => openFirstChangeOrderShellItem((request) => request.status === "requested" && !request.archivedAt),
    },
    {
      id: "in-office-review",
      label: "In Office Review",
      value: underReviewRows.length,
      helper: "Being reviewed now",
      icon: "clock",
      tone: underReviewRows.length ? "blue" : "slate",
      onClick: () => openFirstChangeOrderShellItem((request) => request.status === "under_review" && !request.archivedAt),
    },
    {
      id: "approved",
      label: "Approved",
      value: finishState.counts.approvedForPricing,
      helper: "Pricing and manual review lane",
      icon: "check",
      tone: filteredRows.some((request) => request.status === "approved_for_pricing") ? "green" : "slate",
      onClick: () => openFirstChangeOrderShellItem((request) => request.status === "approved_for_pricing" && !request.archivedAt),
    },
    {
      id: "billing-ready",
      label: "Billing Ready",
      value: finishState.counts.readyForBillingHandoff,
      helper: "Manual billing handoff only",
      icon: "clipboard",
      tone: finishState.counts.readyForBillingHandoff ? "green" : "slate",
      onClick: () => openFirstChangeOrderShellItem((request) => finishState.readyForBillingHandoff.some((packet) => packet.id === request.id)),
    },
    {
      id: "needs-details",
      label: "Needs Details",
      value: missingDetailRows.length,
      helper: "Missing job, reason, or scope",
      icon: "clipboard",
      tone: missingDetailRows.length ? "orange" : "green",
      onClick: () => openFirstChangeOrderShellItem((request) => missingDetailRows.some((entry) => entry.id === request.id)),
    },
  ];
  const changeOrderShellQueue = useMemo(() => {
    const items = [];
    const seenIds = new Set();

    function addRequest(request, kind, priority) {
      if (!request?.id || seenIds.has(request.id)) return;
      seenIds.add(request.id);
      const statusLabel = changeOrderDisplayStatusLabel(request.status, canManage);
      const createdLabel = formatDateTime(changeOrderRequestDate(request)) || "Date pending";
      const scopeReady = Boolean(request.scopeDescription);
      const reasonReady = Boolean(request.reason);
      const eyebrow = kind === "requested"
        ? "Needs review"
        : kind === "under-review"
          ? "In office review"
          : kind === "missing-details"
            ? "Needs details"
            : kind === "approved"
              ? "Approved"
              : "Active change";

      items.push({
        id: `change-${request.id}`,
        kind,
        request,
        requestId: request.id,
        priority,
        eyebrow,
        title: changeOrderJobLabel(request),
        meta: [changeOrderCustomerLabel(request, canManage), request.requestedByName || "Requester pending"].filter(Boolean).join(" / "),
        statusLabel,
        tone: changeOrderStatusTone(request.status),
        actionLabel: "Review change",
        badges: [
          { label: request.reason || "Reason needed", tone: reasonReady ? "slate" : "amber" },
          { label: scopeReady ? "Scope ready" : "Needs scope", tone: scopeReady ? "green" : "orange" },
          { label: createdLabel, tone: "slate" },
        ],
      });
    }

    requestedRows.forEach((request, index) => addRequest(request, "requested", 10 + index));
    underReviewRows.forEach((request, index) => addRequest(request, "under-review", 30 + index));
    missingDetailRows.forEach((request, index) => addRequest(request, "missing-details", 50 + index));
    filteredRows
      .filter((request) => request.status === "approved_for_pricing" && !request.archivedAt)
      .forEach((request, index) => addRequest(request, "approved", 70 + index));
    activeChangeRows.forEach((request, index) => addRequest(request, "active", 90 + index));

    return items.sort((left, right) => left.priority - right.priority).slice(0, 7);
  }, [activeChangeRows, canManage, filteredRows, missingDetailRows, requestedRows, underReviewRows]);
  const createChangeOrderShellItem = {
    id: "create-change-order",
    kind: "create",
    title: "New change order request",
    meta: canCreate ? "Capture job, reason, scope, and field notes" : "Creation unavailable for this role",
    statusLabel: canCreate ? "Ready" : "Locked",
    tone: canCreate ? "orange" : "slate",
  };
  const changeOrderShellFallbackItem = changeOrderShellQueue.find((item) => item.requestId === selectedRequest?.id)
    || changeOrderShellQueue[0]
    || null;
  const selectedChangeOrderShellItem = changeOrderShellMode === "create" && changeOrderShellSelectionId === createChangeOrderShellItem.id
    ? createChangeOrderShellItem
    : changeOrderShellQueue.find((item) => item.id === changeOrderShellSelectionId) || changeOrderShellFallbackItem;
  const selectedChangeOrderShellId = selectedChangeOrderShellItem?.id || "";
  const changeOrderShellAssistantDescription = requestedRows.length
    ? `${requestedRows.length} change order request${requestedRows.length === 1 ? "" : "s"} need first office review.`
    : underReviewRows.length
      ? `${underReviewRows.length} request${underReviewRows.length === 1 ? "" : "s"} are already in office review.`
      : finishState.counts.readyForBillingHandoff
        ? `${finishState.counts.readyForBillingHandoff} change order${finishState.counts.readyForBillingHandoff === 1 ? "" : "s"} are ready for manual billing handoff.`
        : "Change-order review is clear in the current office queue.";

  useEffect(() => {
    if (!canUseChangeOrdersCommandShell) return;
    if (changeOrderShellMode === "create") return;
    const fallbackId = changeOrderShellFallbackItem?.id || "";
    if (!changeOrderShellSelectionId && fallbackId) {
      setChangeOrderShellSelectionId(fallbackId);
      return;
    }
    if (changeOrderShellSelectionId && !changeOrderShellQueue.some((item) => item.id === changeOrderShellSelectionId)) {
      setChangeOrderShellSelectionId(fallbackId);
    }
  }, [canUseChangeOrdersCommandShell, changeOrderShellFallbackItem?.id, changeOrderShellMode, changeOrderShellQueue, changeOrderShellSelectionId]);

  function selectChangeOrderShellItem(item) {
    if (!item) return;
    setChangeOrderShellSelectionId(item.id);
    setChangeOrderShellMode(item.kind === "create" ? "create" : "detail");
    if (item.requestId) setSelectedRequestId(item.requestId);
  }

  function startChangeOrderInShell() {
    if (!canCreate) return;
    setToolTab("create");
    setShowTools(false);
    setChangeOrderShellMode("create");
    setChangeOrderShellSelectionId(createChangeOrderShellItem.id);
  }

  function openFirstChangeOrderShellItem(matchRequest) {
    const targetRequest = filteredRows.find(matchRequest) || rows.find(matchRequest);
    if (!targetRequest?.id) return;
    const targetItem = changeOrderShellQueue.find((item) => item.requestId === targetRequest.id);
    setChangeOrderShellMode("detail");
    setChangeOrderShellSelectionId(targetItem?.id || `change-${targetRequest.id}`);
    setSelectedRequestId(targetRequest.id);
  }

  function renderChangeOrderShellDetail(item) {
    if (item?.kind === "create") {
      return (
        <div className="co-change-orders-shell-detail-scroll">
          <ChangeOrderCreatePanelPolished
            canCreate={canCreate}
            canManage={canManage}
            visibleJobs={visibleJobs}
            createDraft={createDraft}
            setCreateDraft={setCreateDraft}
            singleJobId={singleJobId}
            busy={busy}
            onCreateRequest={onCreateRequest}
          />
        </div>
      );
    }

    const detailRequest = item?.request || selectedRequest;
    return (
      <div className="co-change-orders-shell-detail-scroll">
        <ChangeOrderDetailPanelPolished
          request={detailRequest}
          detailDraft={detailDraft}
          setDetailDraft={setDetailDraft}
          canManage={canManage}
          busy={busy}
          onUpdateRequest={onUpdateRequest}
          onArchiveRequest={onArchiveRequest}
        />
      </div>
    );
  }

  if (!permissions.changeOrders.canView) {
    return (
      <div className="co-office-page co-change-orders-page">
        <PageHeader eyebrow="Field Tools" title="Change Order Requests" description="This module is not available for this role." />
        <div className="px-5 sm:px-6 lg:px-8">
          <StateCard title="Change order access unavailable" description="Only office roles and foremen can open change order requests in this first pass." tone="slate" />
        </div>
      </div>
    );
  }

  if (canUseChangeOrdersCommandShell) {
    return (
      <div className="co-office-page co-change-orders-page co-change-orders-shell-page">
        <ApexOfficeCommandShell
          eyebrow="Field Tools"
          title="Change Orders"
          description="Review field scope-change requests, office status, missing details, and approved changes without drawers."
          kpis={changeOrderShellKpis}
          queue={{
            title: "Change order queue",
            description: `${changeOrderShellQueue.length} priority item${changeOrderShellQueue.length === 1 ? "" : "s"} shown from review, office review, details, and approved work.`,
            items: changeOrderShellQueue,
            selectedId: selectedChangeOrderShellId,
            onSelect: selectChangeOrderShellItem,
            emptyState: <StateCard title="Change order queue clear" description="Field scope changes appear here when they need office review, detail cleanup, or pricing approval." tone="green" />,
          }}
          detail={{
            title: selectedChangeOrderShellItem?.kind === "create" ? "New change order request" : "Selected change order",
            item: selectedChangeOrderShellItem,
            render: renderChangeOrderShellDetail,
            emptyState: <StateCard title="No change order selected" description="Select a request from the queue or start a new request." tone="slate" />,
          }}
          assistant={{
            title: "Change Orders",
            description: changeOrderShellAssistantDescription,
            priorities: [
              { value: requestedRows.length, label: "Needs review", tone: requestedRows.length ? "amber" : "green" },
              { value: underReviewRows.length, label: "Office review", tone: underReviewRows.length ? "blue" : "slate" },
              { value: finishState.counts.manualReviewTracked, label: "Customer/GC", tone: finishState.counts.manualReviewTracked ? "blue" : "slate" },
              { value: finishState.counts.readyForBillingHandoff, label: "Billing ready", tone: finishState.counts.readyForBillingHandoff ? "green" : "slate" },
              { value: missingDetailRows.length, label: "Needs details", tone: missingDetailRows.length ? "orange" : "green" },
            ],
            actions: [
              { label: "Review Requests", icon: "alert", onClick: () => openFirstChangeOrderShellItem((request) => request.status === "requested" && !request.archivedAt), disabled: !requestedRows.length },
              { label: "New Request", icon: "plus", onClick: startChangeOrderInShell, disabled: !canCreate },
              { label: "Needs Details", icon: "clipboard", onClick: () => openFirstChangeOrderShellItem((request) => missingDetailRows.some((entry) => entry.id === request.id)), disabled: !missingDetailRows.length },
            ],
            guardrails: [
              "Manual review only",
              "No automatic billing or external sends",
              "No job status mutation",
              "Role and company scope unchanged",
            ],
          }}
          quickActions={[
            { id: "new-request", label: "New Request", icon: "plus", onClick: startChangeOrderInShell, disabled: !canCreate },
            { id: "needs-review", label: "Needs Review", icon: "alert", onClick: () => openFirstChangeOrderShellItem((request) => request.status === "requested" && !request.archivedAt), disabled: !requestedRows.length },
            { id: "office-review", label: "Office Review", icon: "clock", onClick: () => openFirstChangeOrderShellItem((request) => request.status === "under_review" && !request.archivedAt), disabled: !underReviewRows.length },
          ]}
          className="co-change-orders-command-shell"
        />
      </div>
    );
  }

  return (
    <div className="co-office-page co-change-orders-page" data-field-workspace={!canManage ? "true" : "false"}>
      <PageHeader
        eyebrow="Field Tools"
        title="Change Orders"
        description={canManage ? "Review field scope-change requests across every job while keeping cost decisions on the office side." : "Request a scope change from the field with job, reason, scope, and notes only."}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => setArchiveFilter("Active")}>{filteredRows.length} visible</Button>
            {canCreate ? <Button type="button" onClick={() => openTools("create")}>New Request</Button> : null}
          </div>
        }
      />

      {!canManage ? (
        <section className="co-field-tablet-command co-change-orders-tablet-command mx-auto w-full max-w-[1520px] min-w-0 px-4 pb-4 sm:px-5" aria-label="Tablet change order command">
          <div className="co-field-tablet-shell">
            <div className="co-field-tablet-head">
              <div>
                <p>Field command</p>
                <h2>Change orders</h2>
                <span>Request changes, track office review, and keep proof/context attached while office cost and management controls stay hidden.</span>
              </div>
              <Badge tone={canCreate ? "orange" : "slate"}>{canCreate ? "Request ready" : "View only"}</Badge>
            </div>
            <div className="co-field-tablet-kpis" aria-label="Change order field status">
              {fieldTabletChangeOrderKpis.map((item) => (
                <div key={item.label} className="co-field-tablet-kpi" data-tone={item.tone}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                  <em>{item.helper}</em>
                </div>
              ))}
            </div>
            <div className="co-field-tablet-grid">
              <section className="co-field-tablet-actions" aria-label="Request change">
                <div className="co-field-tablet-section-head">
                  <div>
                    <strong>Request change</strong>
                    <span>Job, reason, scope, and field notes only.</span>
                  </div>
                  <Badge tone={canCreate ? "orange" : "slate"}>{canCreate ? "Open" : "Locked"}</Badge>
                </div>
                <div className="co-field-tablet-scroll">
                  <ChangeOrderCreatePanelPolished
                    canCreate={canCreate}
                    canManage={canManage}
                    visibleJobs={visibleJobs}
                    createDraft={createDraft}
                    setCreateDraft={setCreateDraft}
                    singleJobId={singleJobId}
                    busy={busy}
                    onCreateRequest={onCreateRequest}
                  />
                </div>
              </section>

              <section className="co-field-tablet-queue" aria-label="Track change requests">
                <div className="co-field-tablet-section-head">
                  <div>
                    <strong>Track requests</strong>
                    <span>Top {fieldTabletChangeOrderRows.length || 0} visible requests.</span>
                  </div>
                  <Badge tone="slate">{rows.length} visible</Badge>
                </div>
                <div className="co-field-tablet-list">
                  {fieldTabletChangeOrderRows.length ? fieldTabletChangeOrderRows.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`co-field-tablet-row co-focus-ring ${selectedFieldTabletChangeOrder?.id === item.id ? "is-selected" : ""}`}
                      onClick={() => setSelectedRequestId(item.id)}
                    >
                      <span>
                        <strong>{item.title}</strong>
                        <em>{item.meta}</em>
                      </span>
                      <b>{item.priorityLabel}</b>
                    </button>
                  )) : (
                    <StateCard title="No change requests yet" description={visibleJobs.length ? "Start a request when scope changes need office review." : "No assigned job is available for change requests."} tone="slate" />
                  )}
                </div>
              </section>

              <section className="co-field-tablet-selected" aria-label="Selected change request">
                <div className="co-field-tablet-section-head">
                  <div>
                    <strong>Selected detail</strong>
                    <span>Field-safe status, scope, notes, and next action.</span>
                  </div>
                  <Badge tone={selectedFieldTabletChangeOrder ? changeOrderStatusTone(selectedFieldTabletChangeOrder.status) : "slate"}>
                    {selectedFieldTabletChangeOrder ? changeOrderDisplayStatusLabel(selectedFieldTabletChangeOrder.status, canManage) : "None"}
                  </Badge>
                </div>
                <div className="co-field-tablet-detail-scroll">
                  <ChangeOrderDetailPanelPolished
                    request={selectedFieldTabletChangeOrder}
                    detailDraft={detailDraft}
                    setDetailDraft={setDetailDraft}
                    canManage={false}
                    busy={busy}
                    onUpdateRequest={onUpdateRequest}
                    onArchiveRequest={onArchiveRequest}
                  />
                </div>
              </section>

              <section className="co-field-tablet-summary" aria-label="Change order field guardrails">
                <strong>Field-safe change requests</strong>
                <span>Use this tablet view to request a change, track status, and add proof/context in field notes. Office costing, private review text, sales work, and management controls stay hidden.</span>
                <em>No mutation happens from viewing or selecting requests; submit only creates an explicit field request.</em>
              </section>
            </div>
          </div>
        </section>
      ) : null}

      <ChangeOrdersMobileFocusPanel
        filteredCount={filteredRows.length}
        requestedCount={requestedRows.length}
        underReviewCount={underReviewRows.length}
        approvedCount={filteredRows.filter((request) => request.status === "approved_for_pricing").length}
        canCreate={canCreate}
        canManage={canManage}
        onCreate={() => openTools("create")}
        onOpenBoard={jumpToBoard}
        onOpenRequested={() => openPriorityRequest((request) => request.status === "requested" && !request.archivedAt, { statusFilter: requestedRows.length ? "Requested" : "All", archiveFilter: "Active", search: "", toolTab: requestedRows.length ? "review" : "" })}
        onOpenUnderReview={() => openPriorityRequest((request) => request.status === "under_review" && !request.archivedAt, { statusFilter: underReviewRows.length ? "Under Review" : "All", archiveFilter: "Active", search: "", toolTab: underReviewRows.length ? "review" : "" })}
        onOpenApproved={() => openPriorityRequest((request) => request.status === "approved_for_pricing" && !request.archivedAt, { statusFilter: "Approved for Pricing", archiveFilter: "Active", search: "", toolTab: "review" })}
      />

      <DesktopCommandWorkspaceFrame className="co-change-orders-desktop-workspace-frame">
        <div className="co-change-orders-kpi-grid mx-auto grid w-full max-w-[1520px] min-w-0 grid-cols-1 gap-3 px-5 pb-3 sm:px-6 md:grid-cols-4 lg:px-6">
          {changeOrderKpis.map((item) => <CommandCenterKpiCard key={item.label} item={item} />)}
        </div>

        <div className="co-change-orders-command-layout mx-auto grid w-full max-w-[1520px] min-w-0 gap-3 px-5 pb-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-6">
          <div ref={boardRef}>
            <Card className="co-change-orders-main-board overflow-hidden">
              <div className="co-change-orders-board-header border-b border-slate-200 bg-white p-4">
                <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0">
                    <h2 className="text-base font-black uppercase tracking-[0.04em] text-slate-950">Change Order Board</h2>
                    <p className="mt-1 text-sm font-bold leading-5 text-slate-600">{canManage ? "Track scope-change requests, field notes, status, requester, and office review before cost decisions." : "Track scope-change requests, field notes, status, requester, and office review in a field-safe view."}</p>
                  </div>
                </div>
              </div>
              <div className="co-filter-bar flex min-w-0 max-w-full flex-col gap-3 overflow-hidden border-b border-slate-200 bg-slate-50/80 p-3 md:flex-row md:items-center md:justify-between">
                <div className="scrollbar-none -mx-1 flex min-w-0 max-w-full gap-2 overflow-x-auto overflow-y-hidden px-1 pb-1">
                  {statusFilterOptions.map((filter) => (
                    <button
                      key={filter.value}
                      type="button"
                      onClick={() => setStatusFilter(filter.value)}
                      className={`shrink-0 rounded-lg px-3 py-2 text-xs font-black ${statusFilter === filter.value ? "bg-blue-700 text-white shadow-sm shadow-blue-700/20" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-orange-50 hover:text-orange-700 hover:ring-orange-200"}`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
                <div className="min-w-0 w-full md:w-72">
                  <input className="field-input w-full" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search reason, scope, notes, requester, job..." />
                </div>
              </div>
              <details className="co-change-orders-advanced-filters border-b border-slate-200 bg-white">
                <summary>
                  <span>Advanced filters</span>
                  <span>{[jobFilter !== "All jobs" ? jobFilter : "", requesterFilter !== "All requesters" ? requesterFilter : "", dateFilter !== "All dates" ? dateFilter : "", archiveFilter !== "Active" ? archiveFilter : ""].filter(Boolean).length || "Job, requester, date"}</span>
                </summary>
                <div className="co-office-filter-grid co-change-orders-filter-grid grid gap-3 p-3 md:grid-cols-4">
                  <SelectField label="Job" value={jobFilter} onChange={(event) => setJobFilter(event.target.value)}>
                    {listState.jobOptions.map((option) => <option key={option}>{option}</option>)}
                  </SelectField>
                  <SelectField label="Requested by" value={requesterFilter} onChange={(event) => setRequesterFilter(event.target.value)}>
                    {listState.requesterOptions.map((option) => <option key={option}>{option}</option>)}
                  </SelectField>
                  <SelectField label="Date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)}>
                    {listState.dateOptions.map((option) => <option key={option}>{option}</option>)}
                  </SelectField>
                  <SelectField label="Archived" value={archiveFilter} onChange={(event) => setArchiveFilter(event.target.value)}>
                    {["Active", "Archived", "All"].map((option) => <option key={option}>{option}</option>)}
                  </SelectField>
                </div>
              </details>
              {filteredRows.length === 0 ? (
                <div className="p-5">
                  <StateCard title={visibleJobs.length === 0 && !canManage ? "No assigned job yet" : rows.length === 0 ? "No change order requests yet" : "No change order requests match these filters"} description={visibleJobs.length === 0 && !canManage ? "Contact office if you should be able to request a scope change for this job." : rows.length === 0 ? "Create a new request when a field scope change needs office review." : "Clear a filter or create a new request for a visible job."} tone="slate" />
                </div>
              ) : (
                <ChangeOrdersTablePolished
                  rows={filteredRows}
                  selectedId={selectedRequest?.id}
                  onSelect={setSelectedRequestId}
                  canManage={canManage}
                  mobileMaxRows={showAllMobileRows ? null : 1}
                  mobileExpanded={showAllMobileRows}
                  onToggleMobileRows={toggleMobileRows}
                />
              )}
              <div className="co-change-orders-board-footer flex min-w-0 flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3">
                <p className="text-sm font-bold text-slate-600">Showing {filteredRows.length} change order request{filteredRows.length === 1 ? "" : "s"} / {totalOpen} open active</p>
                <Button type="button" size="sm" variant="secondary" onClick={clearFilters}>Clear filters</Button>
              </div>
            </Card>
          </div>

          <ChangeOrdersCommandRailPolished request={selectedRequest} detailDraft={detailDraft} canCreate={canCreate} canManage={canManage} busy={busy} onOpenTool={openTools} onArchive={onArchiveRequest} />
        </div>

        <DesktopCommandDrawer
          className="co-change-orders-secondary-drawer mx-auto w-full max-w-[1520px] min-w-0 px-5 sm:px-6 lg:px-6"
          title="Review shortcuts"
          description="Needs review, office review, missing details, and new-request actions stay inside the review board."
          summaryLabel="Open shortcuts"
          variant="bottom"
        >
          <div className="co-toolbox-priority-grid co-change-orders-secondary-actions grid w-full min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {changeOrderPriorityCards.map((card) => (
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
        </DesktopCommandDrawer>

        <DesktopCommandDrawer
          drawerRef={toolsRef}
          className="co-change-orders-tools-drawer mx-auto w-full max-w-[1520px] min-w-0 px-5 pb-24 sm:px-6 md:pb-4 lg:px-6"
          open={showTools}
          onToggle={(event) => setShowTools(event.currentTarget.open)}
          title="Change Order Tools"
          description={canManage ? "Create a field request or review the selected change order before cost or billing work." : "Create a field request or review the selected change order with field-safe details."}
          summaryLabel="Open tools"
          variant="right"
        >
          <div className="co-change-orders-tool-tabs mt-3 flex min-w-0 gap-2 overflow-x-auto pb-1">
            {canCreate ? <button type="button" className={toolTab === "create" ? "is-active" : ""} onClick={() => setToolTab("create")}><Icon name="plus" />New Request</button> : null}
            <button type="button" className={toolTab === "review" ? "is-active" : ""} onClick={() => setToolTab("review")}><Icon name="clipboard" />Review</button>
          </div>
          <div className="co-change-orders-tools-panel mt-3">
            {toolTab === "create" ? (
              <ChangeOrderCreatePanelPolished canCreate={canCreate} canManage={canManage} visibleJobs={visibleJobs} createDraft={createDraft} setCreateDraft={setCreateDraft} singleJobId={singleJobId} busy={busy} onCreateRequest={onCreateRequest} />
            ) : (
              <ChangeOrderDetailPanelPolished request={selectedRequest} detailDraft={detailDraft} setDetailDraft={setDetailDraft} canManage={canManage} busy={busy} onUpdateRequest={onUpdateRequest} onArchiveRequest={onArchiveRequest} />
            )}
          </div>
        </DesktopCommandDrawer>
      </DesktopCommandWorkspaceFrame>
      {!canManage ? (
        <div className="co-field-mobile-tool-surface co-change-orders-mobile-tool-surface mx-4 mb-24 md:hidden">
          <div className="co-field-mobile-section-head">
            <span>
              <strong>Change request tools</strong>
              <em>Create or review a field scope request without opening a drawer.</em>
            </span>
          </div>
          <div className="co-field-mobile-tool-tabs" role="tablist" aria-label="Change order tools">
            {canCreate ? <button type="button" className={toolTab === "create" ? "is-active" : ""} onClick={() => setToolTab("create")}><Icon name="plus" />New Request</button> : null}
            <button type="button" className={toolTab === "review" ? "is-active" : ""} onClick={() => setToolTab("review")}><Icon name="clipboard" />Review</button>
          </div>
          <div className="co-field-mobile-tool-body">
            {toolTab === "create" ? (
              <ChangeOrderCreatePanelPolished canCreate={canCreate} canManage={canManage} visibleJobs={visibleJobs} createDraft={createDraft} setCreateDraft={setCreateDraft} singleJobId={singleJobId} busy={busy} onCreateRequest={onCreateRequest} />
            ) : (
              <ChangeOrderDetailPanelPolished request={selectedRequest} detailDraft={detailDraft} setDetailDraft={setDetailDraft} canManage={canManage} busy={busy} onUpdateRequest={onUpdateRequest} onArchiveRequest={onArchiveRequest} />
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function ChangeOrdersPage(props) {
  return <ChangeOrdersPagePolished {...props} />;
}

function ChangeOrdersPageLegacy({
  user,
  jobs,
  changeOrderRequests,
  permissions,
  busy,
  onCreateRequest,
  onUpdateRequest,
  onArchiveRequest,
}) {
  const [statusFilter, setStatusFilter] = useState("All");
  const [jobFilter, setJobFilter] = useState("All jobs");
  const [requesterFilter, setRequesterFilter] = useState("All requesters");
  const [dateFilter, setDateFilter] = useState("All dates");
  const [archiveFilter, setArchiveFilter] = useState("Active");
  const [search, setSearch] = useState("");
  const [selectedRequestId, setSelectedRequestId] = useState("");
  const [createDraft, setCreateDraft] = useState(INITIAL_CHANGE_ORDER_REQUEST_FORM);
  const [detailDraft, setDetailDraft] = useState({ status: "requested", officeNotes: "" });

  const visibleJobs = Array.isArray(jobs) ? jobs.filter((job) => !job.archivedAt) : [];
  const rows = Array.isArray(changeOrderRequests) ? changeOrderRequests : [];
  const filteredRows = useMemo(() => filterChangeOrderRequests(rows, {
    status: statusFilter,
    job: jobFilter,
    requestedBy: requesterFilter,
    date: dateFilter,
    archived: archiveFilter,
    search,
  }), [archiveFilter, dateFilter, jobFilter, requesterFilter, rows, search, statusFilter]);
  const listState = useMemo(() => deriveChangeOrderListState(filteredRows, visibleJobs), [filteredRows, visibleJobs]);
  const selectedRequest = filteredRows.find((request) => request.id === selectedRequestId)
    || filteredRows[0]
    || rows.find((request) => request.id === selectedRequestId)
    || null;
  const singleJobId = visibleJobs.length === 1 ? visibleJobs[0].id : "";
  const canCreate = permissions.changeOrders.canRequest || permissions.changeOrders.canManage;
  const canManage = permissions.changeOrders.canManage;
  const changeOrderKpis = [
    { label: "Visible Requests", value: filteredRows.length, helper: "Current change-order board", icon: "refresh" },
    { label: "Requested", value: filteredRows.filter((request) => request.status === "requested").length, helper: "Waiting for office review", icon: "alert" },
    { label: "Under Review", value: filteredRows.filter((request) => request.status === "under_review").length, helper: "Being reviewed now", icon: "clock" },
    { label: "Approved", value: filteredRows.filter((request) => request.status === "approved_for_pricing").length, helper: "Ready for pricing", icon: "check" },
  ];

  useEffect(() => {
    if (!selectedRequestId && filteredRows[0]?.id) {
      setSelectedRequestId(filteredRows[0].id);
    }
  }, [filteredRows, selectedRequestId]);

  useEffect(() => {
    if (singleJobId && !createDraft.jobId) {
      setCreateDraft((current) => ({ ...current, jobId: singleJobId }));
    }
  }, [createDraft.jobId, singleJobId]);

  useEffect(() => {
    setDetailDraft({
      status: selectedRequest?.status || "requested",
      officeNotes: selectedRequest?.officeNotes || "",
    });
  }, [selectedRequest?.id, selectedRequest?.status, selectedRequest?.officeNotes]);

  if (!permissions.changeOrders.canView) {
    return (
      <div>
        <PageHeader eyebrow="Field Tools" title="Change Order Requests" description="This module is not available for this role." />
        <div className="px-5 sm:px-6 lg:px-8">
          <StateCard title="Change order access unavailable" description="Only office roles and foremen can open change order requests in this first pass." tone="slate" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader eyebrow="Field Tools" title="Change Order Requests" description={canManage ? "Review field scope-change requests across every job and keep pricing decisions on the office side." : "Request a scope change from the field without exposing pricing, billing, or profit data."} />
      <ModuleKpiStrip items={changeOrderKpis} />
      <div className="grid min-w-0 gap-4 px-5 sm:px-6 lg:grid-cols-[340px_minmax(0,1fr)] lg:px-8">
        <div className="min-w-0 space-y-4">
          <Card className="p-4">
            <SectionHeader title="Filters" description="Focus on the requests that need action." />
            <div className="grid gap-3">
              <SelectField label="Status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                {["All", "Requested", "Under Review", "Approved for Pricing", "Rejected", "Archived"].map((option) => <option key={option}>{option}</option>)}
              </SelectField>
              <SelectField label="Job" value={jobFilter} onChange={(event) => setJobFilter(event.target.value)}>
                {listState.jobOptions.map((option) => <option key={option}>{option}</option>)}
              </SelectField>
              <SelectField label="Requested by" value={requesterFilter} onChange={(event) => setRequesterFilter(event.target.value)}>
                {listState.requesterOptions.map((option) => <option key={option}>{option}</option>)}
              </SelectField>
              <SelectField label="Date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)}>
                {listState.dateOptions.map((option) => <option key={option}>{option}</option>)}
              </SelectField>
              <SelectField label="Archived" value={archiveFilter} onChange={(event) => setArchiveFilter(event.target.value)}>
                {["Active", "Archived", "All"].map((option) => <option key={option}>{option}</option>)}
              </SelectField>
              <InputField label="Search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search reasons, scope, notes, or jobs..." />
            </div>
          </Card>

          <Card className="p-4">
            <SectionHeader title="Request list" description={`${filteredRows.length} visible request${filteredRows.length === 1 ? "" : "s"}.`} />
            {filteredRows.length === 0 ? (
              <StateCard title={visibleJobs.length === 0 && !canManage ? "No assigned job yet" : "No change order requests match these filters"} description={visibleJobs.length === 0 && !canManage ? "Contact office if you should be able to request a scope change for this job." : "Clear a filter or create a new request for a visible job."} tone="slate" />
            ) : (
              <div className="space-y-3">
                {filteredRows.map((request) => (
                  <button
                    key={request.id}
                    type="button"
                    onClick={() => setSelectedRequestId(request.id)}
                    className={`w-full rounded-3xl border p-4 text-left transition ${selectedRequest?.id === request.id ? "border-blue-300 bg-blue-50/80 shadow-panel" : "border-blue-100 bg-white hover:border-blue-200 hover:bg-blue-50/50"}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-black text-slate-950">{request.job?.title || "Change order request"}</p>
                        <p className="mt-1 break-words text-xs font-bold text-slate-500">{request.requestedByName} Â· {request.reason}</p>
                      </div>
                      <StatusBadge status={changeOrderStatusLabel(request.status)} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {request.archivedAt ? <Badge tone="slate">Archived</Badge> : null}
                      <Badge tone="amber">{request.job?.customer || "Assigned site"}</Badge>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="min-w-0 space-y-4">
          {canCreate ? (
            <Card className="p-4">
              <SectionHeader title="Create request" description="Capture field scope changes for office review without adding pricing." />
              <div className="grid gap-3">
                <SelectField label="Job" value={createDraft.jobId} onChange={(event) => setCreateDraft((current) => ({ ...current, jobId: event.target.value }))}>
                  <option value="">Select a job</option>
                  {visibleJobs.map((job) => <option key={job.id} value={job.id}>{jobTitle(job)}</option>)}
                </SelectField>
                <InputField label="Reason" value={createDraft.reason} onChange={(event) => setCreateDraft((current) => ({ ...current, reason: event.target.value }))} placeholder="Why does this change need review?" />
                <TextAreaField label="Scope description" value={createDraft.scopeDescription} onChange={(event) => setCreateDraft((current) => ({ ...current, scopeDescription: event.target.value }))} placeholder="Describe the requested scope change clearly." />
                <TextAreaField label="Field notes" value={createDraft.fieldNotes} onChange={(event) => setCreateDraft((current) => ({ ...current, fieldNotes: event.target.value }))} placeholder="Optional site notes for the office team." />
              </div>
              <div className="mt-4">
                <Button
                  type="button"
                  onClick={() => {
                    onCreateRequest(createDraft);
                    setCreateDraft({ ...INITIAL_CHANGE_ORDER_REQUEST_FORM, jobId: singleJobId });
                  }}
                  disabled={busy || !createDraft.jobId || !createDraft.reason || !createDraft.scopeDescription}
                >
                  Submit request
                </Button>
              </div>
            </Card>
          ) : null}

          {selectedRequest ? (
            <Card className="p-4">
              <SectionHeader
                title={selectedRequest.job?.title || "Change order request"}
                description={`${selectedRequest.requestedByName} Â· ${formatDateTime(selectedRequest.createdAt)}`}
                action={<StatusBadge status={changeOrderStatusLabel(selectedRequest.status)} />}
              />
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-3 text-sm text-slate-600">
                  <p><span className="font-black text-slate-950">Reason:</span> {selectedRequest.reason || "Not provided"}</p>
                  <p className="mt-1"><span className="font-black text-slate-950">Requested by:</span> {selectedRequest.requestedByName}</p>
                </div>
                <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-3 text-sm text-slate-600">
                  <p><span className="font-black text-slate-950">Status:</span> {selectedRequest.statusLabel}</p>
                  <p className="mt-1"><span className="font-black text-slate-950">Reviewed by:</span> {selectedRequest.reviewedByName || "Not reviewed"}</p>
                </div>
              </div>
              <div className="mt-3 space-y-3">
                <div className="rounded-2xl border border-blue-100 bg-white p-4 text-sm text-slate-700">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Scope description</p>
                  <p className="mt-2 whitespace-pre-wrap">{selectedRequest.scopeDescription || "No scope description provided."}</p>
                </div>
                <div className="rounded-2xl border border-blue-100 bg-white p-4 text-sm text-slate-700">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Field notes</p>
                  <p className="mt-2 whitespace-pre-wrap">{selectedRequest.fieldNotes || "No field notes provided."}</p>
                </div>
              </div>
              {canManage ? (
                <div className="mt-4 space-y-3">
                  <SelectField label="Status" value={detailDraft.status} onChange={(event) => setDetailDraft((current) => ({ ...current, status: event.target.value }))}>
                    <option value="requested">Requested</option>
                    <option value="under_review">Under Review</option>
                    <option value="approved_for_pricing">Approved for Pricing</option>
                    <option value="rejected">Rejected</option>
                    <option value="archived">Archived</option>
                  </SelectField>
                  <TextAreaField label="Office notes" value={detailDraft.officeNotes} onChange={(event) => setDetailDraft((current) => ({ ...current, officeNotes: event.target.value }))} placeholder="Internal office notes only." />
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="secondary" onClick={() => onUpdateRequest(selectedRequest.id, detailDraft)} disabled={busy}>Save review</Button>
                    <Button type="button" variant="danger" onClick={() => onArchiveRequest(selectedRequest.id)} disabled={busy || selectedRequest.archivedAt}>Archive</Button>
                  </div>
                </div>
              ) : selectedRequest.officeNotes ? null : null}
            </Card>
          ) : (
            <Card className="p-4">
              <SectionHeader title="Request details" description="Select a request to review the field description and office status." />
              <StateCard title="No request selected" description="Choose a change order request from the list or create a new request for a visible job." tone="slate" />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
