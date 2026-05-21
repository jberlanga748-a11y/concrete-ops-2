import { Badge, Button, Card, Icon, SectionHeader, StatusBadge } from "./app-shell-components";
import { DEFAULT_COMPANY_NAME, resolveWorkspaceLogoInitials } from "./brand-utils";
import { deriveEstimateJobHandoffReadiness, estimateCustomerEmail, estimateStatusLabel, formatEstimateCurrency } from "./estimate-utils";

export function estimateDisplayTitle(estimate) {
  return estimate?.title || "Estimate draft";
}

export function estimateDisplayCustomer(estimate) {
  return estimate?.customer?.name || estimate?.customerName || estimate?.lead?.customer || "Customer pending";
}

export function estimateDisplayLead(estimate) {
  return estimate?.lead?.project || estimate?.lead?.customer || "No linked lead";
}

export function estimateDisplayTotal(estimate) {
  return Number(estimate?.grandTotal ?? estimate?.total ?? 0) || 0;
}

export function estimateRailProfileLine(...values) {
  return values.map((value) => String(value ?? "").trim()).find(Boolean) || "";
}

function formatEstimateUpdatedAt(value) {
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

export function EstimatesTablePolished({ rows, selectedId, onSelect, maxRows = 6 }) {
  const visibleRows = rows.slice(0, maxRows);

  return (
    <>
      <div className="co-estimates-mobile-list grid gap-3 p-3 md:hidden">
        {visibleRows.map((estimate) => {
          const selected = estimate.id === selectedId;
          return (
            <button
              key={estimate.id}
              type="button"
              onClick={() => onSelect(estimate.id)}
              className={`co-estimates-mobile-card co-mobile-record-card co-office-list-card w-full rounded-[1.15rem] border p-4 text-left transition ${selected ? "is-selected border-orange-200 bg-orange-50/70" : "border-slate-200 bg-white hover:border-orange-200 hover:bg-orange-50/30"}`}
            >
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-words text-base font-black text-slate-950">{estimateDisplayTitle(estimate)}</p>
                  <p className="mt-1 break-words text-xs font-bold text-slate-500">{estimateDisplayCustomer(estimate)}</p>
                </div>
                <StatusBadge status={estimateStatusLabel(estimate.status)} />
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Total</p>
                  <p className="mt-1 break-words text-sm font-black text-slate-800">{formatEstimateCurrency(estimateDisplayTotal(estimate))}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Line items</p>
                  <p className="mt-1 break-words text-sm font-bold text-slate-700">{estimate.items?.length || 0} item{estimate.items?.length === 1 ? "" : "s"}</p>
                </div>
                <div className="min-w-0 sm:col-span-2">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Lead / job</p>
                  <p className="mt-1 break-words text-sm font-bold text-slate-700">{estimate.jobId ? "Converted to job" : estimateDisplayLead(estimate)}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between gap-2">
                {selected ? <Badge tone="blue">Selected</Badge> : <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Review</span>}
                <span className="co-leads-row-action">
                  Open
                  <Icon name="arrowUpRight" />
                </span>
              </div>
            </button>
          );
        })}
      </div>
      <div className="hidden md:block">
        <div className="table-shell">
          <table className="co-estimates-command-table w-full min-w-[780px] text-left">
            <thead>
              <tr>
                <th>Estimate / Customer</th>
                <th>Status</th>
                <th>Total</th>
                <th>Line Items</th>
                <th>Lead / Job</th>
                <th>Updated</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((estimate) => {
                const selected = estimate.id === selectedId;
                return (
                  <tr key={estimate.id} onClick={() => onSelect(estimate.id)} className={`cursor-pointer transition hover:bg-orange-50/45 ${selected ? "bg-orange-50/70" : ""}`}>
                    <td>
                      <p className="font-black text-slate-950">{estimateDisplayTitle(estimate)}</p>
                      <p className="text-xs font-bold text-slate-500">{estimateDisplayCustomer(estimate)}</p>
                    </td>
                    <td><StatusBadge status={estimateStatusLabel(estimate.status)} /></td>
                    <td className="font-black text-slate-900">{formatEstimateCurrency(estimateDisplayTotal(estimate))}</td>
                    <td className="font-bold text-slate-700">{estimate.items?.length || 0} item{estimate.items?.length === 1 ? "" : "s"}</td>
                    <td>
                      <p className="font-bold text-slate-700">{estimate.jobId ? "Converted" : estimateDisplayLead(estimate)}</p>
                      <p className="text-xs font-bold text-slate-500">{estimate.jobId || estimate.leadId || "No linked record"}</p>
                    </td>
                    <td className="font-bold text-slate-700">{formatEstimateUpdatedAt(estimate.updatedAt || estimate.createdAt)}</td>
                    <td>
                      <div className="flex justify-end gap-2">
                        <button type="button" className="co-leads-icon-button" onClick={(event) => { event.stopPropagation(); onSelect(estimate.id); }} aria-label={`Review ${estimateDisplayTitle(estimate)}`}>
                          <Icon name="document" />
                        </button>
                        <button type="button" className="co-leads-icon-button" onClick={(event) => { event.stopPropagation(); onSelect(estimate.id); }} aria-label={`Open ${estimateDisplayTitle(estimate)}`}>
                          <Icon name="arrowUpRight" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export function EstimateCommandRailPolished({
  estimate,
  preview,
  totals,
  optionTotals,
  companyName = DEFAULT_COMPANY_NAME,
  companyProfile = {},
  canManage,
  canUseAiRoughNotes = false,
  canUseGcPackets = false,
  busy,
  detailSaveDisabled,
  canMarkSent,
  copyFeedback,
  emailSendingConfigured,
  newDraftMode = false,
  onSave,
  onMarkSent,
  onMarkApproved,
  onConvert,
  onPrint,
  onSend,
  onCopyEstimate,
  onCopyCustomerMessage,
  onOpenTool,
}) {
  if (!estimate) {
    return (
      <div className="co-estimates-right-rail space-y-4">
        <Card className="co-estimates-rail-card co-estimates-empty-card p-4">
          <SectionHeader
            title="Estimate Studio Summary"
            description={newDraftMode
              ? "AI Rough Notes is building a new draft. No saved estimate is selected yet."
              : "Choose an estimate from the board to review proposal totals, workflow, and tools."}
          />
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-sm font-bold text-slate-500">
            {newDraftMode ? "New draft in progress." : "No estimate selected."}
          </div>
        </Card>
      </div>
    );
  }

  const jobHandoffReadiness = deriveEstimateJobHandoffReadiness(preview || estimate);
  const logoInitials = resolveWorkspaceLogoInitials({ companySettings: companyProfile, companyName });
  const profileContact = [
    estimateRailProfileLine(companyProfile.businessPhone),
    estimateRailProfileLine(companyProfile.businessEmail),
    estimateRailProfileLine(companyProfile.website),
  ].filter(Boolean);
  const projectLocation = estimateRailProfileLine(preview?.lead?.location, preview?.customer?.address, companyProfile.serviceArea, companyProfile.businessAddress);
  const proposalValidity = estimateRailProfileLine(companyProfile.printPacketFooter, "Valid for 30 days unless noted in proposal terms.");

  return (
    <div className="co-estimates-right-rail space-y-4">
      <Card className="co-estimates-rail-card co-estimates-branding-card p-4">
        <div className="co-estimates-branding-head">
          <span className="co-estimates-branding-logo">{logoInitials}</span>
          <span className="min-w-0">
            <p>Company Branding</p>
            <strong>{companyName || DEFAULT_COMPANY_NAME}</strong>
          </span>
        </div>
        <div className="co-estimates-branding-grid">
          <span>
            <em>Customer</em>
            <strong>{estimateDisplayCustomer(preview || estimate)}</strong>
          </span>
          <span>
            <em>Project</em>
            <strong>{estimateDisplayLead(preview || estimate)}</strong>
          </span>
          <span>
            <em>Location</em>
            <strong>{projectLocation || "Confirm jobsite before send"}</strong>
          </span>
          <span>
            <em>Proposal terms</em>
            <strong>{proposalValidity}</strong>
          </span>
        </div>
        {profileContact.length > 0 ? (
          <div className="co-estimates-branding-contact">
            {profileContact.map((line) => <span key={line}>{line}</span>)}
          </div>
        ) : null}
      </Card>

      <Card className="co-estimates-rail-card co-estimates-selected-card p-4">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Proposal Summary</p>
            <h3 className="mt-2 break-words text-xl font-black text-slate-950">{estimateDisplayTitle(estimate)}</h3>
            <p className="mt-1 break-words text-xs font-bold text-slate-500">{estimateDisplayCustomer(estimate)}</p>
          </div>
          <StatusBadge status={estimateStatusLabel(estimate.status)} />
        </div>
        <div className="co-estimates-total-spotlight">
          <p>Estimate total</p>
          <strong>{formatEstimateCurrency(optionTotals.totalWithSelectedOptions)}</strong>
          <span>Base {formatEstimateCurrency(totals.grandTotal)} + selected options {formatEstimateCurrency(optionTotals.selectedOptionsTotal)}. Review before manual send.</span>
        </div>
        <div className="co-estimates-summary-facts mt-4 grid gap-2 text-sm font-bold text-slate-700">
          <p><span className="text-slate-400">Base total:</span> {formatEstimateCurrency(totals.grandTotal)}</p>
          <p><span className="text-slate-400">Selected options:</span> {formatEstimateCurrency(optionTotals.selectedOptionsTotal)}</p>
          <p><span className="text-slate-400">Customer email:</span> {estimateCustomerEmail(preview) || "Not set"}</p>
          <p><span className="text-slate-400">Lead:</span> {estimateDisplayLead(estimate)}</p>
          <p><span className="text-slate-400">Job:</span> {estimate.jobId ? "Converted" : "Not converted yet"}</p>
        </div>
        <EstimateJobHandoffReadinessCard readiness={jobHandoffReadiness} />
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button type="button" size="sm" onClick={onSave} disabled={!canManage || detailSaveDisabled}>Save</Button>
          <Button type="button" size="sm" variant="secondary" onClick={() => onOpenTool("edit")}>Edit</Button>
          <Button type="button" size="sm" variant="secondary" onClick={onPrint} disabled={!preview}>Print</Button>
          <Button type="button" size="sm" onClick={onSend} disabled={!preview || busy}>{emailSendingConfigured ? "Send" : "Copy to send"}</Button>
        </div>
        {copyFeedback ? <p className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700">{copyFeedback}</p> : null}
      </Card>

      <Card className="co-estimates-rail-card co-estimates-actions-card p-4">
        <SectionHeader title="Proposal actions" description={emailSendingConfigured ? "Email sending is configured." : "Manual send mode: copy or print the customer-ready message, then record the send in Apex HQ."} />
        <div className="grid gap-2">
          <button type="button" className="co-estimates-action-row" onClick={onCopyEstimate} disabled={!preview}>
            <span>Copy estimate</span>
            <Icon name="document" />
          </button>
          <button type="button" className="co-estimates-action-row" onClick={onCopyCustomerMessage} disabled={!preview}>
            <span>Copy customer message</span>
            <Icon name="quote" />
          </button>
          {canMarkSent ? (
            <button type="button" className="co-estimates-action-row" onClick={onMarkSent} disabled={detailSaveDisabled}>
              <span>Mark sent</span>
              <Icon name="check" />
            </button>
          ) : null}
          {canManage && estimate.status !== "approved" && !estimate.jobId ? (
            <button type="button" className="co-estimates-action-row" onClick={onMarkApproved} disabled={detailSaveDisabled}>
              <span>Mark approved</span>
              <Icon name="check" />
            </button>
          ) : null}
          {estimate.status === "approved" && !estimate.jobId ? (
            <button type="button" className="co-estimates-action-row" onClick={onConvert} disabled={busy}>
              <span>Convert to job</span>
              <Icon name="briefcase" />
            </button>
          ) : null}
        </div>
      </Card>

      <Card className="co-estimates-rail-card co-estimates-tools-card p-4">
        <SectionHeader title="Estimate tools" description="Pricing, line items, AI notes, proposal sections, SOV, and packet settings stay in the tools drawer." />
        <div className="grid grid-cols-2 gap-2">
          {canManage && canUseAiRoughNotes ? <Button type="button" size="sm" variant="secondary" onClick={() => onOpenTool("roughNotes")}>AI notes</Button> : null}
          <Button type="button" size="sm" variant="secondary" onClick={() => onOpenTool("edit")}>Edit pricing</Button>
          <Button type="button" size="sm" variant="secondary" onClick={() => onOpenTool("sections")}>Sections</Button>
          <Button type="button" size="sm" variant="secondary" onClick={() => onOpenTool("backup")}>SOV / Backup</Button>
          {canUseGcPackets ? <Button type="button" size="sm" variant="secondary" onClick={() => onOpenTool("packet")}>Packet</Button> : null}
        </div>
      </Card>
    </div>
  );
}

export function EstimateJobHandoffReadinessCard({ readiness }) {
  if (!readiness) return null;

  return (
    <div className="mt-4 rounded-2xl border border-orange-100 bg-orange-50/70 p-3">
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-orange-700">Estimate to job handoff</p>
          <p className="mt-1 text-sm font-black text-slate-950">{readiness.status}</p>
          <p className="mt-1 text-xs font-bold leading-5 text-slate-600">{readiness.summary}</p>
        </div>
        <Badge tone={readiness.tone}>{readiness.readyCount} / {readiness.totalCount}</Badge>
      </div>
      <div className="mt-3 grid gap-1.5">
        {readiness.steps.map((step) => (
          <div key={step.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-xl border border-orange-100 bg-white px-2.5 py-2">
            <span className="min-w-0">
              <span className="block truncate text-xs font-black text-slate-900">{step.label}</span>
              <span className="block text-[11px] font-bold leading-4 text-slate-500">{step.helper}</span>
            </span>
            <Badge tone={step.complete ? "green" : "amber"}>{step.complete ? "Ready" : "Needed"}</Badge>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] font-bold leading-5 text-slate-500">
        Review-only. This card does not create jobs, send proposals, assign crews, or change pricing.
      </p>
    </div>
  );
}
