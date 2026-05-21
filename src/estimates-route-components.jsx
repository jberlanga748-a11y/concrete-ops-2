import { useState } from "react";

import { Badge, Button, Card, FilterBar, Icon, InputField, SectionHeader, SelectField, StateCard, StatusBadge, TextAreaField } from "./app-shell-components";
import { DEFAULT_COMPANY_NAME, resolveWorkspaceLogoInitials } from "./brand-utils";
import { createEmptyReferenceAttachmentRow, createEmptySovRow, createEmptyTakeoffRow, deriveEstimateBackup, mergeEstimateBackup } from "./estimate-backup-utils";
import { deriveEstimateGcPacketLite } from "./estimate-gc-packet-utils";
import { mergeEstimateGcPacketLite } from "./estimate-snapshot-utils";
import { calculateEstimateLineTotal, deriveEstimateJobHandoffReadiness, estimateCustomerEmail, estimateStatusLabel, formatEstimateCurrency } from "./estimate-utils";
import { ESTIMATE_LINE_ITEM_STARTERS, ESTIMATE_TEMPLATE_STARTERS, addEstimateLineItemStarter, applyEstimateTemplateStarter } from "./estimate-template-utils";

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

function estimateStudioListItems(value, fallback = []) {
  const rawItems = Array.isArray(value) ? value : String(value || "").split(/\n|;|,/);
  const items = rawItems
    .map((item) => String(item || "").replace(/^[-*]\s*/, "").trim())
    .filter(Boolean);
  return items.length > 0 ? items : fallback;
}

function estimateStudioTakeoffCards(backup = {}, estimate = {}) {
  const references = Array.isArray(backup.referenceRows) ? backup.referenceRows : [];
  const takeoffs = Array.isArray(backup.takeoffRows) ? backup.takeoffRows : [];
  const cards = [
    ...references.slice(0, 2).map((row, index) => ({
      id: `reference-${index}`,
      type: row.referenceType || "Reference",
      title: row.fileName || row.source || "Jobsite reference",
      meta: row.source || row.notes || "Office review",
      tone: "photo",
    })),
    ...takeoffs.slice(0, 2).map((row, index) => ({
      id: `takeoff-${index}`,
      type: row.unit ? `${row.quantity || ""} ${row.unit}`.trim() : "Takeoff",
      title: row.item || "Takeoff item",
      meta: row.source || row.estimatorNote || "Estimator backup",
      tone: "takeoff",
    })),
  ];

  if (cards.length > 0) return cards.slice(0, 3);

  return [
    {
      id: "site-photo-placeholder",
      type: "Site photo",
      title: estimate?.lead?.project || estimate?.title || "Jobsite photo",
      meta: "Demo preview",
      tone: "photo",
    },
    {
      id: "takeoff-placeholder",
      type: "Takeoff",
      title: "Plan / measured scope",
      meta: estimate?.scopeSummary ? "Scope linked" : "Add takeoff backup",
      tone: "takeoff",
    },
    {
      id: "add-photo-placeholder",
      type: "Add photo",
      title: "Upload reference",
      meta: "Use SOV / Backup",
      tone: "empty",
    },
  ];
}

export function EstimateProposalWorkbench({
  estimate,
  preview,
  totals,
  optionTotals,
  sections,
  backup,
  companyName = DEFAULT_COMPANY_NAME,
  companyProfile = {},
  canManage,
  filteredRows = [],
  rows = [],
  listState = {},
  statusFilter = "All",
  customerFilter = "All customers",
  leadFilter = "All leads",
  creatorFilter = "All creators",
  archiveFilter = "Active",
  search = "",
  selectedId = "",
  visibleEstimateRowCap = 6,
  onSelect,
  onOpenTool,
  onFocusNewEstimate,
  onStatusFilter,
  onSearch,
  onCustomerFilter,
  onLeadFilter,
  onCreatorFilter,
  onArchiveFilter,
  onShowMore,
  onShowLess,
  onClearFilters,
}) {
  if (!estimate || !preview) {
    return (
      <Card className="co-estimate-proposal-workbench co-estimate-proposal-workbench--empty">
        <div className="co-estimate-proposal-empty">
          <Icon name="quote" className="h-6 w-6" />
          <h2>Select an estimate option</h2>
          <p>Choose a proposal from the option rail to review scope, takeoff, inclusions, exclusions, packet sections, and send-ready actions.</p>
          {canManage ? <Button type="button" onClick={onFocusNewEstimate}>Create Estimate</Button> : null}
        </div>
      </Card>
    );
  }

  const scopeFallback = [
    preview.scopeSummary || "Scope is pending office review.",
  ];
  const inclusionItems = estimateStudioListItems(sections?.inclusions, [
    "Crew labor, materials, and standard equipment",
    "Layout, installation, finish work, and cleanup",
    "Office-reviewed customer proposal",
  ]);
  const exclusionItems = estimateStudioListItems(sections?.exclusions, [
    "Permits and inspection fees",
    "Engineering, design, or utility relocation",
    "Hidden conditions outside reviewed scope",
  ]);
  const scopeItems = estimateStudioListItems(sections?.scopeOfWork, scopeFallback).slice(0, 3);
  const photoTakeoffCards = estimateStudioTakeoffCards(backup, preview);
  const topLineItems = Array.isArray(preview.items) ? preview.items.filter((item) => item?.description || item?.name).slice(0, 3) : [];
  const customerLabel = estimateDisplayCustomer(preview);
  const totalLabel = formatEstimateCurrency(optionTotals?.totalWithSelectedOptions ?? totals?.grandTotal ?? estimateDisplayTotal(preview));
  const logoInitials = resolveWorkspaceLogoInitials({ companySettings: companyProfile, companyName });
  const contractorContact = [
    estimateRailProfileLine(companyProfile.businessPhone),
    estimateRailProfileLine(companyProfile.businessEmail),
    estimateRailProfileLine(companyProfile.website),
  ].filter(Boolean);
  const serviceLine = estimateRailProfileLine(companyProfile.serviceArea, companyProfile.businessAddress);
  const licenseLine = estimateRailProfileLine(companyProfile.licenseText, "License / insurance details pending");
  const validityLine = estimateRailProfileLine(companyProfile.printPacketFooter, "Valid for 30 days unless noted in proposal terms.");
  const proposalDate = preview?.createdAt ? new Date(preview.createdAt).toLocaleDateString("en-US") : "Review date pending";

  return (
    <Card className="co-estimate-proposal-workbench">
      <div className="co-estimate-proposal-head">
        <div className="min-w-0">
          <p className="co-estimate-proposal-eyebrow">Selected Proposal</p>
          <div className="co-estimate-proposal-title-row">
            <h2>{estimateDisplayTitle(preview)}</h2>
            <StatusBadge status={estimateStatusLabel(preview.status)} />
          </div>
          <p>{customerLabel} / {preview.jobId ? "Converted job" : estimateDisplayLead(preview)}</p>
        </div>
        <div className="co-estimate-proposal-total">
          <span>Proposal Total</span>
          <strong>{totalLabel}</strong>
          <em>Base {formatEstimateCurrency(totals?.grandTotal || 0)}</em>
        </div>
      </div>

      <div className="co-estimate-proposal-brand-strip" aria-label="Proposal identity">
        <div className="co-estimate-proposal-brand-main">
          <span>{logoInitials}</span>
          <div>
            <em>Prepared by</em>
            <strong>{companyName || DEFAULT_COMPANY_NAME}</strong>
            <p>{contractorContact.length > 0 ? contractorContact.join(" / ") : "Add phone, email, or website in Settings branding."}</p>
          </div>
        </div>
        <div>
          <em>Service Area</em>
          <strong>{serviceLine || "Confirm service area"}</strong>
        </div>
        <div>
          <em>License / Insurance</em>
          <strong>{licenseLine}</strong>
        </div>
        <div>
          <em>Proposal Date</em>
          <strong>{proposalDate}</strong>
        </div>
        <div>
          <em>Terms</em>
          <strong>{validityLine}</strong>
        </div>
      </div>

      <div className="co-estimate-proposal-media" aria-label="Jobsite photos and takeoff preview">
        <div className="co-estimate-proposal-media-head">
          <span>Jobsite Photos & Takeoff</span>
          <button type="button" onClick={() => onOpenTool?.("backup")}>Open backup</button>
        </div>
        <div className="co-estimate-proposal-media-grid">
          {photoTakeoffCards.map((card) => (
            <button key={card.id} type="button" className={`co-estimate-proposal-thumb co-estimate-proposal-thumb--${card.tone}`} onClick={() => onOpenTool?.("backup")}>
              <span>{card.type}</span>
              <strong>{card.title}</strong>
              <em>{card.meta}</em>
            </button>
          ))}
        </div>
      </div>

      <div className="co-estimate-proposal-scope">
        <div className="co-estimate-proposal-section-head">
          <span>Scope of Work</span>
          <button type="button" onClick={() => onOpenTool?.("sections")}>Edit sections</button>
        </div>
        <div className="co-estimate-proposal-scope-copy">
          {scopeItems.map((item) => <p key={item}>{item}</p>)}
        </div>
        {topLineItems.length > 0 ? (
          <div className="co-estimate-proposal-line-items">
            {topLineItems.map((item, index) => (
              <div key={`${item.id || item.description || item.name}-${index}`}>
                <span>{item.description || item.name}</span>
                <strong>{formatEstimateCurrency(calculateEstimateLineTotal(item))}</strong>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="co-estimate-proposal-inclusions-grid">
        <section>
          <div className="co-estimate-proposal-section-head">
            <span>Inclusions</span>
          </div>
          <ul className="co-estimate-proposal-check-list">
            {inclusionItems.slice(0, 5).map((item) => (
              <li key={item}><Icon name="check" /> <span>{item}</span></li>
            ))}
          </ul>
        </section>
        <section>
          <div className="co-estimate-proposal-section-head">
            <span>Exclusions</span>
          </div>
          <ul className="co-estimate-proposal-warning-list">
            {exclusionItems.slice(0, 5).map((item) => (
              <li key={item}><Icon name="alert" /> <span>{item}</span></li>
            ))}
          </ul>
        </section>
      </div>

      <details className="co-estimate-proposal-browse">
        <summary>
          <span>Browse all estimates</span>
          <em>{filteredRows.length} matching</em>
        </summary>
        <FilterBar filters={["All", "Draft", "Sent", "Approved", "Rejected", "Archived"]} active={statusFilter} setActive={onStatusFilter} search={search} setSearch={onSearch} placeholder="Search title, customer, notes, or line items..." />
        <details className="co-estimates-advanced-filters border-b border-slate-200 bg-white">
          <summary>
            <span>Advanced filters</span>
            <span>{[customerFilter !== "All customers" ? customerFilter : "", leadFilter !== "All leads" ? leadFilter : "", creatorFilter !== "All creators" ? creatorFilter : "", archiveFilter !== "Active" ? archiveFilter : ""].filter(Boolean).length || "Customer, lead, creator, archive"}</span>
          </summary>
          <div className="co-office-filter-grid co-estimates-filter-grid grid gap-3 p-3 md:grid-cols-4">
            <SelectField label="Customer" value={customerFilter} onChange={(event) => onCustomerFilter?.(event.target.value)}>
              {(listState.customerOptions || []).map((option) => <option key={option}>{option}</option>)}
            </SelectField>
            <SelectField label="Lead" value={leadFilter} onChange={(event) => onLeadFilter?.(event.target.value)}>
              {(listState.leadOptions || []).map((option) => <option key={option}>{option}</option>)}
            </SelectField>
            <SelectField label="Created by" value={creatorFilter} onChange={(event) => onCreatorFilter?.(event.target.value)}>
              {(listState.creatorOptions || []).map((option) => <option key={option}>{option}</option>)}
            </SelectField>
            <SelectField label="Archive view" value={archiveFilter} onChange={(event) => onArchiveFilter?.(event.target.value)}>
              {["Active", "Archived", "All"].map((option) => <option key={option}>{option}</option>)}
            </SelectField>
          </div>
        </details>
        <div className="co-estimates-board-header border-b border-slate-200 bg-white p-4">
          <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <h3 className="text-sm font-black uppercase tracking-[0.04em] text-slate-950">Proposal Queue</h3>
              <p className="mt-1 text-sm font-bold leading-5 text-slate-600">Use this list when you need the full estimate board.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="secondary" onClick={() => onStatusFilter?.("All")}>All estimates</Button>
              <Button type="button" size="sm" variant="secondary" onClick={() => onStatusFilter?.("Draft")}>Drafts</Button>
              {canManage ? <Button type="button" size="sm" onClick={onFocusNewEstimate}>Create Estimate</Button> : null}
            </div>
          </div>
        </div>
        {filteredRows.length === 0 ? (
          <div className="p-5">
            <StateCard title="No estimates match this view" description="Create a proposal from a customer or lead, or clear filters to bring older work back into view." tone="blue" />
          </div>
        ) : (
          <EstimatesTablePolished
            rows={filteredRows}
            selectedId={selectedId}
            onSelect={onSelect}
            maxRows={visibleEstimateRowCap}
          />
        )}
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3">
          <p className="text-sm font-bold text-slate-600">Showing {Math.min(filteredRows.length, visibleEstimateRowCap)} of {rows.length} estimates</p>
          <div className="co-estimates-board-footer-actions">
            {filteredRows.length > visibleEstimateRowCap ? (
              <Button type="button" size="sm" variant="secondary" onClick={onShowMore}>Show more</Button>
            ) : null}
            {visibleEstimateRowCap > 6 ? (
              <Button type="button" size="sm" variant="secondary" onClick={onShowLess}>Show less</Button>
            ) : null}
            <Button type="button" size="sm" variant="secondary" onClick={onClearFilters}>Clear filters</Button>
          </div>
        </div>
      </details>
    </Card>
  );
}

export const ESTIMATE_ALTERNATE_STATUS_OPTIONS = ["optional", "included", "excluded", "accepted"];
export const ESTIMATE_ADD_ON_STATUS_OPTIONS = ["optional", "selected", "included", "accepted", "excluded"];

function estimateOptionStatusLabel(status = "optional") {
  const labels = {
    optional: "Optional",
    included: "Included",
    excluded: "Excluded",
    accepted: "Accepted",
    selected: "Selected",
  };
  return labels[String(status || "optional").trim().toLowerCase()] || "Optional";
}

export function EstimateOptionsEditor({
  title,
  description,
  options = [],
  onChange,
  addLabel,
  nameLabel = "Title",
  defaultTitle,
  statusOptions = ESTIMATE_ALTERNATE_STATUS_OPTIONS,
  disabled = false,
}) {
  const rows = Array.isArray(options) ? options : [];
  const updateOption = (index, field, value) => {
    onChange(rows.map((option, optionIndex) => optionIndex === index ? { ...option, [field]: value } : option));
  };
  const addOption = () => {
    onChange([
      ...rows,
      { title: defaultTitle, description: "", amount: "", status: statusOptions[0] || "optional", notes: "" },
    ]);
  };
  const removeOption = (index) => {
    onChange(rows.filter((_, optionIndex) => optionIndex !== index));
  };

  return (
    <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-3">
      <SectionHeader title={title} description={description} />
      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-blue-200 bg-white/70 px-3 py-4 text-sm font-bold text-slate-500">No {title.toLowerCase()} added yet.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((option, index) => (
            <div key={`${title}-${index}`} className="rounded-2xl border border-blue-100 bg-white p-3">
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_130px_160px]">
                <InputField label={`${nameLabel} ${index + 1}`} value={option.title || ""} onChange={(event) => updateOption(index, "title", event.target.value)} disabled={disabled} />
                <InputField label="Amount" value={option.amount ?? ""} onChange={(event) => updateOption(index, "amount", event.target.value)} inputMode="decimal" disabled={disabled} />
                <SelectField label="Status" value={option.status || "optional"} onChange={(event) => updateOption(index, "status", event.target.value)} disabled={disabled}>
                  {statusOptions.map((status) => <option key={status} value={status}>{estimateOptionStatusLabel(status)}</option>)}
                </SelectField>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <TextAreaField label="Description" value={option.description || ""} onChange={(event) => updateOption(index, "description", event.target.value)} className="field-input min-h-20 resize-y" disabled={disabled} />
                <TextAreaField label="Notes" value={option.notes || ""} onChange={(event) => updateOption(index, "notes", event.target.value)} className="field-input min-h-20 resize-y" disabled={disabled} />
              </div>
              <div className="mt-3 flex justify-end">
                <button type="button" className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 hover:text-slate-950 disabled:cursor-not-allowed disabled:text-slate-300" onClick={() => removeOption(index)} disabled={disabled}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="mt-3">
        <Button type="button" variant="secondary" size="sm" onClick={addOption} disabled={disabled}>{addLabel}</Button>
      </div>
    </div>
  );
}

export function EstimateStarterPanel({ setDraft, normalizeDraft = (draft) => draft, disabled = false }) {
  const [templateId, setTemplateId] = useState(ESTIMATE_TEMPLATE_STARTERS[0]?.id || "");
  const [lineItemStarterId, setLineItemStarterId] = useState(ESTIMATE_LINE_ITEM_STARTERS[0]?.id || "");
  const selectedTemplate = ESTIMATE_TEMPLATE_STARTERS.find((template) => template.id === templateId) || ESTIMATE_TEMPLATE_STARTERS[0];
  const selectedLineItem = ESTIMATE_LINE_ITEM_STARTERS.find((starter) => starter.id === lineItemStarterId) || ESTIMATE_LINE_ITEM_STARTERS[0];

  function handleApplyTemplate() {
    if (!selectedTemplate) return;
    setDraft((current) => normalizeDraft(applyEstimateTemplateStarter(current, selectedTemplate.id)));
  }

  function handleAddLineItemStarter() {
    if (!selectedLineItem) return;
    setDraft((current) => normalizeDraft(addEstimateLineItemStarter(current, selectedLineItem.id)));
  }

  return (
    <div className="rounded-3xl border border-emerald-100 bg-emerald-50/60 p-4 shadow-sm shadow-emerald-100/50">
      <SectionHeader
        title="Estimate starters"
        description="Templates are starters only. Review scope, pricing, exclusions, and totals before sending."
        action={<Badge tone="emerald">Editable</Badge>}
      />
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="rounded-2xl border border-emerald-100 bg-white/80 p-3">
          <SelectField label="Start From Template" value={templateId} onChange={(event) => setTemplateId(event.target.value)} disabled={disabled}>
            {ESTIMATE_TEMPLATE_STARTERS.map((template) => <option key={template.id} value={template.id}>{template.title}</option>)}
          </SelectField>
          <p className="mt-2 text-sm font-bold leading-5 text-slate-600">{selectedTemplate?.description || "Choose a reusable estimate starter."}</p>
          <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">
            Adds {selectedTemplate?.lineItems?.length || 0} editable line item starter{selectedTemplate?.lineItems?.length === 1 ? "" : "s"} with blank pricing.
          </p>
          <div className="mt-3">
            <Button type="button" variant="secondary" size="sm" onClick={handleApplyTemplate} disabled={disabled || !selectedTemplate}>
              Start From Template
            </Button>
          </div>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-white/80 p-3">
          <SelectField label="Add Line Item From Library" value={lineItemStarterId} onChange={(event) => setLineItemStarterId(event.target.value)} disabled={disabled}>
            {ESTIMATE_LINE_ITEM_STARTERS.map((starter) => <option key={starter.id} value={starter.id}>{starter.title}</option>)}
          </SelectField>
          <p className="mt-2 text-sm font-bold leading-5 text-slate-600">{selectedLineItem?.description || "Choose a reusable line item starter."}</p>
          <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">Pricing stays blank until office fills it in.</p>
          <div className="mt-3">
            <Button type="button" variant="secondary" size="sm" onClick={handleAddLineItemStarter} disabled={disabled || !selectedLineItem}>
              Add Line Item From Library
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function EstimateBackupEditor({ draft, setDraft, disabled = false }) {
  const backup = deriveEstimateBackup(draft);
  const sovRows = backup.sovRows.length > 0 ? backup.sovRows : [createEmptySovRow()];
  const takeoffRows = backup.takeoffRows.length > 0 ? backup.takeoffRows : [createEmptyTakeoffRow()];
  const referenceRows = backup.referenceRows.length > 0 ? backup.referenceRows : [createEmptyReferenceAttachmentRow()];
  const commitBackup = (updates) => {
    setDraft((current) => mergeEstimateBackup(current, {
      ...deriveEstimateBackup(current),
      ...updates,
    }));
  };
  const updateSovRow = (index, field, value) => {
    const nextRows = sovRows.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value } : row);
    commitBackup({ sovRows: nextRows });
  };
  const updateTakeoffRow = (index, field, value) => {
    const nextRows = takeoffRows.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value } : row);
    commitBackup({ takeoffRows: nextRows });
  };
  const updateReferenceRow = (index, field, value) => {
    const nextRows = referenceRows.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value } : row);
    commitBackup({ referenceRows: nextRows });
  };
  const removeSovRow = (index) => {
    const nextRows = sovRows.filter((_, rowIndex) => rowIndex !== index);
    commitBackup({ sovRows: nextRows.length > 0 ? nextRows : [] });
  };
  const removeTakeoffRow = (index) => {
    const nextRows = takeoffRows.filter((_, rowIndex) => rowIndex !== index);
    commitBackup({ takeoffRows: nextRows.length > 0 ? nextRows : [] });
  };
  const removeReferenceRow = (index) => {
    const nextRows = referenceRows.filter((_, rowIndex) => rowIndex !== index);
    commitBackup({ referenceRows: nextRows.length > 0 ? nextRows : [] });
  };

  return (
    <div className="rounded-3xl border border-amber-100 bg-amber-50/60 p-4 shadow-sm shadow-amber-100/50">
      <SectionHeader
        title="Estimate Backup / SOV"
        description="Use this section for office estimate backup. Review customer-facing proposal output before sending."
        action={<Badge tone="amber">Office only</Badge>}
      />
      <div className="rounded-2xl border border-amber-100 bg-white/80 px-3 py-2 text-sm font-bold text-amber-800">
        Backup rows do not change the estimate total unless added to line items.
      </div>
      <div className="mt-3 space-y-4">
        <div>
          <SectionHeader title="Schedule of Values" description="Simple office backup rows only. This is not billing or payment scheduling yet." />
          <div className="space-y-3">
            {sovRows.map((row, index) => (
              <div key={`sov-${index}`} className="rounded-2xl border border-amber-100 bg-white p-3">
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.5fr)_90px_90px_120px]">
                  <InputField label={`Section / Item ${index + 1}`} value={row.section || ""} onChange={(event) => updateSovRow(index, "section", event.target.value)} disabled={disabled} placeholder="Mobilization" />
                  <InputField label="Description" value={row.description || ""} onChange={(event) => updateSovRow(index, "description", event.target.value)} disabled={disabled} placeholder="Office SOV description" />
                  <InputField label="Qty" value={row.quantity || ""} onChange={(event) => updateSovRow(index, "quantity", event.target.value)} disabled={disabled} inputMode="decimal" />
                  <InputField label="Unit" value={row.unit || ""} onChange={(event) => updateSovRow(index, "unit", event.target.value)} disabled={disabled} placeholder="LS" />
                  <InputField label="Amount" value={row.amount || ""} onChange={(event) => updateSovRow(index, "amount", event.target.value)} disabled={disabled} inputMode="decimal" />
                </div>
                <div className="mt-3">
                  <TextAreaField label="SOV notes" value={row.notes || ""} onChange={(event) => updateSovRow(index, "notes", event.target.value)} disabled={disabled} className="field-input min-h-20 resize-y" placeholder="Estimator backup note for this SOV row." />
                </div>
                <div className="mt-3 flex justify-end">
                  <button type="button" className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 hover:text-slate-950 disabled:cursor-not-allowed disabled:text-slate-300" onClick={() => removeSovRow(index)} disabled={disabled}>Remove SOV row</button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3">
            <Button type="button" variant="secondary" size="sm" onClick={() => commitBackup({ sovRows: [...sovRows, createEmptySovRow()] })} disabled={disabled}>Add SOV Row</Button>
          </div>
        </div>
        <div>
          <SectionHeader title="Takeoff backup" description="Keep quantity backup, sheet/source notes, and estimator assumptions out of the customer proposal." />
          <div className="space-y-3">
            {takeoffRows.map((row, index) => (
              <div key={`takeoff-${index}`} className="rounded-2xl border border-amber-100 bg-white p-3">
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_90px_90px_minmax(0,1.2fr)]">
                  <InputField label={`Takeoff item ${index + 1}`} value={row.item || ""} onChange={(event) => updateTakeoffRow(index, "item", event.target.value)} disabled={disabled} placeholder={'4" sidewalk'} />
                  <InputField label="Qty" value={row.quantity || ""} onChange={(event) => updateTakeoffRow(index, "quantity", event.target.value)} disabled={disabled} inputMode="decimal" />
                  <InputField label="Unit" value={row.unit || ""} onChange={(event) => updateTakeoffRow(index, "unit", event.target.value)} disabled={disabled} placeholder="SF" />
                  <InputField label="Source / sheet / note" value={row.source || ""} onChange={(event) => updateTakeoffRow(index, "source", event.target.value)} disabled={disabled} placeholder="A1.1, field measure, sketch" />
                </div>
                <div className="mt-3">
                  <TextAreaField label="Estimator note" value={row.estimatorNote || ""} onChange={(event) => updateTakeoffRow(index, "estimatorNote", event.target.value)} disabled={disabled} className="field-input min-h-20 resize-y" placeholder="Backup assumption, waste note, or measurement context." />
                </div>
                <div className="mt-3 flex justify-end">
                  <button type="button" className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 hover:text-slate-950 disabled:cursor-not-allowed disabled:text-slate-300" onClick={() => removeTakeoffRow(index)} disabled={disabled}>Remove takeoff row</button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3">
            <Button type="button" variant="secondary" size="sm" onClick={() => commitBackup({ takeoffRows: [...takeoffRows, createEmptyTakeoffRow()] })} disabled={disabled}>Add Takeoff Row</Button>
          </div>
        </div>
        <div>
          <SectionHeader title="Reference attachments" description="Track Bluebeam screenshots, plan PDFs, takeoff photos, or reference links for office review. Storage upload comes later." />
          <div className="space-y-3">
            {referenceRows.map((row, index) => (
              <div key={`reference-${index}`} className="rounded-2xl border border-amber-100 bg-white p-3">
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_150px_minmax(0,1.2fr)]">
                  <InputField label={`File / reference ${index + 1}`} value={row.fileName || ""} onChange={(event) => updateReferenceRow(index, "fileName", event.target.value)} disabled={disabled} placeholder="A1.1 slab takeoff screenshot" />
                  <InputField label="Type" value={row.referenceType || ""} onChange={(event) => updateReferenceRow(index, "referenceType", event.target.value)} disabled={disabled} placeholder="Bluebeam, PDF, photo" />
                  <InputField label="Source / sheet" value={row.source || ""} onChange={(event) => updateReferenceRow(index, "source", event.target.value)} disabled={disabled} placeholder="A1.1, field photo, takeoff set" />
                </div>
                <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                  <InputField label="Reference URL / path" value={row.url || ""} onChange={(event) => updateReferenceRow(index, "url", event.target.value)} disabled={disabled} placeholder="Optional link or file path" />
                  <TextAreaField label="Reference notes" value={row.notes || ""} onChange={(event) => updateReferenceRow(index, "notes", event.target.value)} disabled={disabled} className="field-input min-h-20 resize-y" placeholder="What this reference proves, quantity context, or review notes." />
                </div>
                <div className="mt-3 flex justify-end">
                  <button type="button" className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 hover:text-slate-950 disabled:cursor-not-allowed disabled:text-slate-300" onClick={() => removeReferenceRow(index)} disabled={disabled}>Remove reference</button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3">
            <Button type="button" variant="secondary" size="sm" onClick={() => commitBackup({ referenceRows: [...referenceRows, createEmptyReferenceAttachmentRow()] })} disabled={disabled}>Add Reference</Button>
          </div>
        </div>
        <TextAreaField
          label="Backup notes"
          value={backup.notes || ""}
          onChange={(event) => commitBackup({ notes: event.target.value })}
          disabled={disabled}
          placeholder="Estimator backup notes, quantity assumptions, SOV review notes, or pricing reminders."
        />
      </div>
    </div>
  );
}

export function EstimateGcPacketLiteEditor({ draft, setDraft, disabled = false }) {
  const gcPacketLite = deriveEstimateGcPacketLite(draft);
  const updateGcPacketLite = (field, value) => {
    setDraft((current) => mergeEstimateGcPacketLite(current, {
      ...deriveEstimateGcPacketLite(current),
      [field]: value,
    }));
  };

  return (
    <div className="rounded-3xl border border-indigo-100 bg-indigo-50/50 p-4 shadow-sm shadow-indigo-100/50">
      <SectionHeader
        title="GC Packet Lite"
        description="Use this for commercial GC-facing proposal notes. Review customer-facing sections before sending."
        action={<Badge tone="violet">GC Lite</Badge>}
      />
      <div className="rounded-2xl border border-indigo-100 bg-white/85 px-3 py-2 text-sm font-bold text-indigo-800">
        Captured here for future GC packet output. Current estimate print/PDF stays unchanged in this phase.
      </div>
      <div className="mt-3 grid gap-3">
        <div className="grid gap-3 lg:grid-cols-2">
          <TextAreaField
            label="Proposal Cover Note"
            value={gcPacketLite.proposalCoverNote}
            onChange={(event) => updateGcPacketLite("proposalCoverNote", event.target.value)}
            disabled={disabled}
            placeholder="Short GC-facing cover note or bid response introduction."
          />
          <TextAreaField
            label="Proposal Summary"
            value={gcPacketLite.proposalSummary}
            onChange={(event) => updateGcPacketLite("proposalSummary", event.target.value)}
            disabled={disabled}
            placeholder="High-level commercial proposal summary for GC review."
          />
        </div>
        <div className="grid gap-3 lg:grid-cols-3">
          <TextAreaField
            label="Qualifications"
            value={gcPacketLite.qualifications}
            onChange={(event) => updateGcPacketLite("qualifications", event.target.value)}
            disabled={disabled}
            className="field-input min-h-24 resize-y"
            placeholder="Qualifications, bid conditions, or GC-facing clarifications."
          />
          <TextAreaField
            label="Schedule Notes"
            value={gcPacketLite.scheduleNotes}
            onChange={(event) => updateGcPacketLite("scheduleNotes", event.target.value)}
            disabled={disabled}
            className="field-input min-h-24 resize-y"
            placeholder="Schedule assumptions, sequencing, access, or notice requirements."
          />
          <TextAreaField
            label="Addenda / RFI References"
            value={gcPacketLite.addendaRfiReferences}
            onChange={(event) => updateGcPacketLite("addendaRfiReferences", event.target.value)}
            disabled={disabled}
            className="field-input min-h-24 resize-y"
            placeholder="Addenda reviewed, RFI references, plan dates, or bid clarifications."
          />
        </div>
        <div className="rounded-2xl border border-amber-100 bg-amber-50/80 p-3">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700">Office-only packet notes</p>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <TextAreaField
              label="GC Review Notes - Office Only"
              value={gcPacketLite.gcReviewNotes}
              onChange={(event) => updateGcPacketLite("gcReviewNotes", event.target.value)}
              disabled={disabled}
              placeholder="Internal GC review reminders, bid strategy, or follow-up context."
            />
            <TextAreaField
              label="Internal Packet Notes - Office Only"
              value={gcPacketLite.internalPacketNotes}
              onChange={(event) => updateGcPacketLite("internalPacketNotes", event.target.value)}
              disabled={disabled}
              placeholder="Internal packet assembly notes, missing items, or review checklist reminders."
            />
          </div>
          <p className="mt-2 text-xs font-bold leading-5 text-amber-700">Office-only notes do not print for customers.</p>
        </div>
      </div>
    </div>
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
