import { useEffect, useMemo, useRef, useState } from "react";
import "mapbox-gl/dist/mapbox-gl.css";

import { Badge, Button, Card, FilterBar, Icon, InputField, SectionHeader, SelectField, StatCard, StateCard, StatusBadge, TextAreaField } from "./app-shell-components";
import { DEFAULT_COMPANY_NAME, resolveWorkspaceLogoInitials } from "./brand-utils";
import { createEmptyReferenceAttachmentRow, createEmptySovRow, createEmptyTakeoffRow, deriveEstimateBackup, mergeEstimateBackup } from "./estimate-backup-utils";
import { deriveEstimateGcPacketLite } from "./estimate-gc-packet-utils";
import { estimateRoughNotesHasSuggestions, estimateRoughNotesText } from "./estimate-rough-notes-utils";
import { deriveEstimateSentSnapshots, getEstimateVisibleInternalNotes, mergeEstimateGcPacketLite, mergeEstimateOfficeInternalNotes } from "./estimate-snapshot-utils";
import { calculateEstimateLineTotal, calculateEstimateOptionTotals, calculateEstimateTotals, deriveEstimateJobHandoffReadiness, deriveEstimateProposalSections, estimateCustomerEmail, estimateStatusLabel, formatEstimateCurrency, mergeEstimateProposalSections } from "./estimate-utils";
import { addEstimateLineItemStarter, applyEstimateTemplateStarter, buildEstimateLineItemsFromRoughNotes, getEstimateLineItemStartersForTrade, getEstimateStarterTradeSummary, getEstimateTemplateStartersForTrade } from "./estimate-template-utils";
import { estimateDisplayCustomer, estimateDisplayLead, estimateDisplayTitle, estimateDisplayTotal, estimateRailProfileLine } from "./estimate-display-utils";
import { buildFenceTakeoffBackupRows, buildFenceTakeoffDraftLineItems, buildFenceTakeoffFieldHandoff, buildFenceTakeoffProofPhotoChecklist, buildFenceTakeoffProposalSummary, deriveFenceTakeoffReadiness, mergeFenceTakeoffIntoDraft, normalizeFenceTakeoff, summarizeFenceTakeoffByAssembly } from "./fence-takeoff-utils";
import { applyTakeoffStudioAssistantSuggestion, applyTakeoffStudioSheetCalibrationToItems, buildTakeoffStudioAssistantQueue, buildTakeoffStudioBackupRows, buildTakeoffStudioCsvExport, buildTakeoffStudioEstimateLineItems, buildTakeoffStudioFieldHandoff, buildTakeoffStudioGcPacketProofSummary, buildTakeoffStudioMeasurementLegend, buildTakeoffStudioPackageExport, buildTakeoffStudioProposalProofRows, buildTakeoffStudioProofSnapshot, buildTakeoffStudioRevisionComparison, buildTakeoffStudioRevisionRegister, buildTakeoffStudioSheetWorkspace, createEmptyTakeoffStudioItem, createEmptyTakeoffStudioMarkupComment, createEmptyTakeoffStudioSheet, deriveTakeoffStudioCalibrationState, deriveTakeoffStudioReadiness, formatTakeoffPointsText, getTakeoffStudioAssemblyOptions, getTakeoffStudioToolSetOptions, mergeTakeoffStudioAssistantSuggestionState, mergeTakeoffStudioCsvImport, mergeTakeoffStudioIntoDraft, normalizeTakeoffStudio, normalizeTakeoffStudioItem, parseTakeoffPointsText } from "./takeoff-studio-utils";
import { CUSTOM_ESTIMATE_PACKET_THEME_ID, ESTIMATE_PACKET_COPY_TEMPLATE_OPTIONS, ESTIMATE_PACKET_PRESETS, ESTIMATE_PACKET_SECTION_DEFS, ESTIMATE_PACKET_THEME_OPTIONS, INTERNAL_REVIEW_PACKET_PRESET_ID, getEstimatePacketPreset, resolveEstimatePacketSettings } from "../shared/estimatePacketPresets.js";

export { estimateDisplayCustomer, estimateDisplayLead, estimateDisplayTitle, estimateDisplayTotal, estimateRailProfileLine } from "./estimate-display-utils";

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

      <div className="co-estimates-shell-packet-readiness-grid" aria-label="Professional packet preview">
        <span><em>Estimate Sheet</em><strong>Branded / priced</strong></span>
        <span><em>Proposal Packet</em><strong>Scope / options / terms</strong></span>
        <span><em>Residential Packet</em><strong>Payment / warranty / approval</strong></span>
        <span><em>Commercial Sub Packet</em><strong>Qualifications / billing</strong></span>
        <span><em>GC Bid Packet</em><strong>Qualifications / schedule</strong></span>
        <span><em>GC / Prime Packet</em><strong>Addenda / alternates</strong></span>
        <span><em>Foreman Handoff</em><strong>Field-safe quantities</strong></span>
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

export function EstimateStarterPanel({ setDraft, normalizeDraft = (draft) => draft, disabled = false, tradeId = "general-contractor" }) {
  const templateOptions = useMemo(() => getEstimateTemplateStartersForTrade(tradeId), [tradeId]);
  const lineItemOptions = useMemo(() => getEstimateLineItemStartersForTrade(tradeId), [tradeId]);
  const starterSummary = useMemo(() => getEstimateStarterTradeSummary(tradeId), [tradeId]);
  const [templateId, setTemplateId] = useState(templateOptions[0]?.id || "");
  const [lineItemStarterId, setLineItemStarterId] = useState(lineItemOptions[0]?.id || "");
  const selectedTemplate = templateOptions.find((template) => template.id === templateId) || templateOptions[0];
  const selectedLineItem = lineItemOptions.find((starter) => starter.id === lineItemStarterId) || lineItemOptions[0];

  useEffect(() => {
    if (templateOptions.some((template) => template.id === templateId)) return;
    setTemplateId(templateOptions[0]?.id || "");
  }, [templateId, templateOptions]);

  useEffect(() => {
    if (lineItemOptions.some((starter) => starter.id === lineItemStarterId)) return;
    setLineItemStarterId(lineItemOptions[0]?.id || "");
  }, [lineItemOptions, lineItemStarterId]);

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
        title={`Estimate starters - ${starterSummary.tradeLabel}`}
        description={`${starterSummary.helper} Templates are starters only. Review scope, pricing, exclusions, and totals before sending.`}
        action={<Badge tone="emerald">{starterSummary.isFocused ? "Trade focused" : "Full library"}</Badge>}
      />
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="rounded-2xl border border-emerald-100 bg-white/80 p-3">
          <SelectField label="Start From Template" value={templateId} onChange={(event) => setTemplateId(event.target.value)} disabled={disabled}>
            {templateOptions.map((template) => <option key={template.id} value={template.id}>{template.title}</option>)}
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
            {lineItemOptions.map((starter) => <option key={starter.id} value={starter.id}>{starter.title}</option>)}
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

export function EstimatePacketSettingsPanel({
  presetId,
  sectionIds,
  setPresetId,
  setSectionIds,
  customization = {},
  setCustomization,
  onApplyCompanyBrand,
  onSaveCustomizationDefault,
  onApplyCustomizationDefault,
  customizationDefaultNotice = "",
  canIncludeInternalSections = false,
}) {
  const resolvedSettings = resolveEstimatePacketSettings({
    presetId,
    sectionIds,
    customization,
    allowInternalSections: canIncludeInternalSections,
  });
  const selectedPreset = getEstimatePacketPreset(resolvedSettings.presetId);
  const customerSectionDefs = ESTIMATE_PACKET_SECTION_DEFS.filter((section) => !section.internalOnly);
  const internalSectionDefs = ESTIMATE_PACKET_SECTION_DEFS.filter((section) => section.internalOnly);
  const showInternalSections = canIncludeInternalSections && resolvedSettings.presetId === INTERNAL_REVIEW_PACKET_PRESET_ID;
  const customizationPresetIds = new Set(["customerProposalPacket", "residentialProposalPacket", "gcPrimeProposalPacket", "commercialSubcontractorPacket", INTERNAL_REVIEW_PACKET_PRESET_ID]);
  const showCustomization = customizationPresetIds.has(resolvedSettings.presetId);
  const normalizedCustomization = resolvedSettings.customization || {};
  const activeTheme = normalizedCustomization.theme || {};
  const selectedThemeId = customization.themeId || normalizedCustomization.themeId || "safety-orange";
  const showCustomTheme = selectedThemeId === CUSTOM_ESTIMATE_PACKET_THEME_ID;
  const customHeaderColor = customization.headerColor || normalizedCustomization.headerColor || activeTheme.headerColor || "#07111f";
  const customHeaderTextColor = customization.headerTextColor || normalizedCustomization.headerTextColor || activeTheme.headerTextColor || "#ffffff";
  const customAccentColor = customization.accentColor || normalizedCustomization.accentColor || activeTheme.accentColor || "#f97316";
  const copyTemplates = ESTIMATE_PACKET_COPY_TEMPLATE_OPTIONS.filter((template) => template.presetIds.includes(resolvedSettings.presetId));

  function applyPreset(nextPresetId) {
    const nextPreset = getEstimatePacketPreset(nextPresetId);
    setPresetId(nextPreset.id);
    setSectionIds(nextPreset.sectionIds);
  }

  function toggleSection(sectionId) {
    setSectionIds((current) => {
      const currentIds = new Set(Array.isArray(current) ? current : []);
      if (currentIds.has(sectionId)) {
        currentIds.delete(sectionId);
      } else {
        currentIds.add(sectionId);
      }
      return Array.from(currentIds);
    });
  }

  function updateCustomization(field, value) {
    if (typeof setCustomization !== "function") return;
    setCustomization((current) => ({
      ...(current || {}),
      [field]: value,
    }));
  }

  function updateCustomThemeColor(field, value) {
    if (typeof setCustomization !== "function") return;
    setCustomization((current) => ({
      ...(current || {}),
      themeId: CUSTOM_ESTIMATE_PACKET_THEME_ID,
      [field]: value,
    }));
  }

  function applyCopyTemplate(templateId) {
    const template = ESTIMATE_PACKET_COPY_TEMPLATE_OPTIONS.find((candidate) => candidate.id === templateId);
    if (!template || typeof setCustomization !== "function") return;
    setCustomization((current) => ({
      ...(current || {}),
      ...template.customization,
    }));
  }

  return (
    <div className="rounded-3xl border border-indigo-100 bg-indigo-50/50 p-4 shadow-sm shadow-indigo-100/50">
      <SectionHeader
        title="Packet Preset"
        description="Choose the packet format and confirm which estimate, proposal, and bid sections appear in the printed document."
        action={<Badge tone={showInternalSections ? "amber" : "violet"}>{showInternalSections ? "Office only" : "External packet"}</Badge>}
      />
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
        <div className="rounded-2xl border border-indigo-100 bg-white/85 p-3">
          <SelectField label="Packet preset" value={resolvedSettings.presetId} onChange={(event) => applyPreset(event.target.value)}>
            {ESTIMATE_PACKET_PRESETS.map((preset) => <option key={preset.id} value={preset.id}>{preset.label}</option>)}
          </SelectField>
          <p className="mt-2 text-sm font-bold leading-5 text-slate-600">{selectedPreset.description}</p>
          <p className="mt-2 text-xs font-bold uppercase tracking-[0.14em] text-indigo-700">
            These settings prepare the current print packet preview; estimate pricing and scope stay unchanged.
          </p>
          {showCustomization ? (
            <div className="mt-3 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-700">Packet customization</p>
                  <p className="mt-1 text-xs font-bold leading-4 text-slate-500">Reusable contractor branding and packet copy for this document.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {typeof onApplyCompanyBrand === "function" ? (
                    <Button type="button" variant="secondary" onClick={onApplyCompanyBrand}>Use company brand</Button>
                  ) : null}
                  {typeof onApplyCustomizationDefault === "function" ? (
                    <Button type="button" variant="secondary" onClick={onApplyCustomizationDefault}>Use saved</Button>
                  ) : null}
                  {typeof onSaveCustomizationDefault === "function" ? (
                    <Button type="button" onClick={onSaveCustomizationDefault}>Save default</Button>
                  ) : null}
                </div>
              </div>
              {customizationDefaultNotice ? <p className="mt-2 text-xs font-bold text-indigo-700">{customizationDefaultNotice}</p> : null}
              <div className="mt-3 grid gap-3">
                {copyTemplates.length > 0 ? (
                  <SelectField label="Copy template" value="" onChange={(event) => applyCopyTemplate(event.target.value)}>
                    <option value="">Choose a packet copy starter</option>
                    {copyTemplates.map((template) => <option key={template.id} value={template.id}>{template.label}</option>)}
                  </SelectField>
                ) : null}
                <SelectField label="Theme" value={selectedThemeId} onChange={(event) => updateCustomization("themeId", event.target.value)}>
                  {ESTIMATE_PACKET_THEME_OPTIONS.map((theme) => <option key={theme.id} value={theme.id}>{theme.label}</option>)}
                </SelectField>
                {showCustomTheme ? (
                  <div className="grid gap-3 rounded-2xl border border-indigo-100 bg-white/80 p-3 sm:grid-cols-2">
                    <InputField label="Theme name" value={customization.customThemeName || ""} onChange={(event) => updateCustomization("customThemeName", event.target.value)} placeholder="Company brand" />
                    <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-2">
                      <InputField label="Header" type="color" value={customHeaderColor} onChange={(event) => updateCustomThemeColor("headerColor", event.target.value)} aria-label="Header color picker" />
                      <InputField label="Header hex" value={customization.headerColor || normalizedCustomization.headerColor || ""} onChange={(event) => updateCustomThemeColor("headerColor", event.target.value)} placeholder="#07111f" />
                    </div>
                    <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-2">
                      <InputField label="Accent" type="color" value={customAccentColor} onChange={(event) => updateCustomThemeColor("accentColor", event.target.value)} aria-label="Accent color picker" />
                      <InputField label="Accent hex" value={customization.accentColor || normalizedCustomization.accentColor || ""} onChange={(event) => updateCustomThemeColor("accentColor", event.target.value)} placeholder="#f97316" />
                    </div>
                    <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-2">
                      <InputField label="Text" type="color" value={customHeaderTextColor} onChange={(event) => updateCustomThemeColor("headerTextColor", event.target.value)} aria-label="Header text color picker" />
                      <InputField label="Text hex" value={customization.headerTextColor || normalizedCustomization.headerTextColor || ""} onChange={(event) => updateCustomThemeColor("headerTextColor", event.target.value)} placeholder="#ffffff" />
                    </div>
                  </div>
                ) : null}
                <InputField label="Cover title" value={customization.coverTitle || ""} onChange={(event) => updateCustomization("coverTitle", event.target.value)} placeholder="GC / Prime Proposal" />
                <InputField label="Cover kicker" value={customization.coverKicker || ""} onChange={(event) => updateCustomization("coverKicker", event.target.value)} placeholder="Concrete Proposal" />
                <InputField label="Tagline" value={customization.tagline || ""} onChange={(event) => updateCustomization("tagline", event.target.value)} placeholder="Clear scope. Professional terms. Ready for review." />
                <InputField label="Statement headline" value={customization.statementTitle || ""} onChange={(event) => updateCustomization("statementTitle", event.target.value)} placeholder="Ready for approval." />
                <TextAreaField label="Statement body" value={customization.statementBody || ""} onChange={(event) => updateCustomization("statementBody", event.target.value)} className="field-input min-h-20 resize-y" placeholder="Describe what makes this packet ready for GC review." />
                <InputField label="Review note" value={customization.reviewNote || ""} onChange={(event) => updateCustomization("reviewNote", event.target.value)} placeholder="Review scope, exclusions, and terms before approval." />
              </div>
            </div>
          ) : null}
        </div>
        <div className="rounded-2xl border border-indigo-100 bg-white/85 p-3">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Packet sections</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {customerSectionDefs.map((section) => (
              <label key={section.id} className="flex min-w-0 items-start gap-2 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-3 text-sm font-bold text-slate-700">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-indigo-200 text-indigo-700"
                  checked={resolvedSettings.sectionIds.includes(section.id)}
                  onChange={() => toggleSection(section.id)}
                />
                <span className="min-w-0">
                  <span className="block text-slate-950">{section.label}</span>
                  <span className="mt-1 block text-xs leading-4 text-slate-500">{section.description}</span>
                </span>
              </label>
            ))}
          </div>
          {showInternalSections ? (
            <div className="mt-3 rounded-2xl border border-amber-100 bg-amber-50/80 p-3">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">Office-only sections</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {internalSectionDefs.map((section) => (
                  <label key={section.id} className="flex min-w-0 items-start gap-2 rounded-2xl border border-amber-100 bg-white/80 p-3 text-sm font-bold text-slate-700">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-amber-200 text-amber-700"
                      checked={resolvedSettings.sectionIds.includes(section.id)}
                      onChange={() => toggleSection(section.id)}
                    />
                    <span className="min-w-0">
                      <span className="block text-slate-950">{section.label}</span>
                      <span className="mt-1 block text-xs leading-4 text-slate-500">{section.description}</span>
                    </span>
                  </label>
                ))}
              </div>
              <p className="mt-2 text-xs font-bold leading-5 text-amber-700">
                Internal Review Packet is office-only. Field roles still cannot access estimates, pricing, packet settings, or internal notes.
              </p>
            </div>
          ) : (
            <p className="mt-3 rounded-2xl border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs font-bold leading-5 text-indigo-700">
              External packet presets automatically exclude SOV backup, takeoff backup, internal notes, and sent proposal history.
            </p>
          )}
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

const TAKEOFF_MEASUREMENT_OPTIONS = [
  { value: "area", label: "Area (SF)" },
  { value: "length", label: "Length (LF)" },
  { value: "count", label: "Count (EA)" },
  { value: "volume", label: "Volume (CY)" },
];

function takeoffUnitForType(type = "area") {
  if (type === "length") return "LF";
  if (type === "count") return "EA";
  if (type === "volume") return "CY";
  return "SF";
}

function appendUniqueTextBlock(existing = "", next = "") {
  const currentText = String(existing ?? "").trim();
  const nextText = String(next ?? "").trim();
  if (!nextText || currentText.includes(nextText)) return currentText;
  return [currentText, nextText].filter(Boolean).join("\n\n");
}

export function TakeoffStudioManualEditor({ draft, setDraft, disabled = false }) {
  const [csvImportText, setCsvImportText] = useState("");
  const backup = deriveEstimateBackup(draft);
  const takeoff = normalizeTakeoffStudio(backup.takeoffStudio);
  const readiness = deriveTakeoffStudioReadiness(takeoff);
  const sheets = takeoff.sheets.length ? takeoff.sheets : [createEmptyTakeoffStudioSheet(0)];
  const items = takeoff.items.length ? takeoff.items : [createEmptyTakeoffStudioItem(0)];
  const markupComments = takeoff.markupComments.length ? takeoff.markupComments : [createEmptyTakeoffStudioMarkupComment(0)];
  const editingTakeoff = { ...takeoff, sheets, items, markupComments };
  const reviewedRows = buildTakeoffStudioBackupRows({ ...takeoff, items: takeoff.items.filter((item) => item.reviewStatus === "reviewed") });
  const assemblyOptions = getTakeoffStudioAssemblyOptions();
  const toolSetOptions = getTakeoffStudioToolSetOptions();
  const reviewedLineItems = buildTakeoffStudioEstimateLineItems(takeoff);
  const proposalProofRows = buildTakeoffStudioProposalProofRows(takeoff);
  const gcPacketProof = buildTakeoffStudioGcPacketProofSummary(takeoff);
  const assistantQueue = buildTakeoffStudioAssistantQueue(takeoff);
  const revisionRegister = buildTakeoffStudioRevisionRegister(takeoff);
  const fieldHandoff = buildTakeoffStudioFieldHandoff(takeoff);
  const proofSnapshot = buildTakeoffStudioProofSnapshot(takeoff);
  const measurementLegend = buildTakeoffStudioMeasurementLegend(takeoff);
  const revisionComparison = buildTakeoffStudioRevisionComparison(takeoff);
  const csvExport = buildTakeoffStudioCsvExport(takeoff);
  const packageExport = buildTakeoffStudioPackageExport(takeoff);
  const sheetWorkspace = buildTakeoffStudioSheetWorkspace(editingTakeoff);
  const calibrationState = deriveTakeoffStudioCalibrationState(editingTakeoff);
  const selectedSheet = sheetWorkspace.selectedSheet || sheets[0];

  function commitTakeoff(nextTakeoff) {
    const normalized = normalizeTakeoffStudio({
      ...nextTakeoff,
      updatedAt: new Date().toISOString(),
    });
    setDraft((current) => mergeEstimateBackup(current, {
      ...deriveEstimateBackup(current),
      takeoffStudio: normalized,
    }));
  }

  function updateSheet(index, field, value) {
    const nextSheets = sheets.map((sheet, sheetIndex) => sheetIndex === index ? { ...sheet, [field]: value } : sheet);
    commitTakeoff({ ...takeoff, sheets: nextSheets, items });
  }

  function updateSelectedSheet(sheetId) {
    commitTakeoff({ ...takeoff, selectedSheetId: sheetId, sheets, items });
  }

  function updateSheetScale(index, field, value) {
    const nextSheets = sheets.map((sheet, sheetIndex) => sheetIndex === index
      ? { ...sheet, scale: { ...sheet.scale, [field]: value } }
      : sheet);
    commitTakeoff({ ...takeoff, sheets: nextSheets, items });
  }

  function addSheet() {
    commitTakeoff({ ...takeoff, sheets: [...sheets, createEmptyTakeoffStudioSheet(sheets.length)], items });
  }

  function removeSheet(index) {
    commitTakeoff({ ...takeoff, sheets: sheets.filter((_, sheetIndex) => sheetIndex !== index), items });
  }

  function updateItem(index, field, value) {
    const nextItems = items.map((item, itemIndex) => {
      if (itemIndex !== index) return item;
      const nextItem = { ...item, [field]: value };
      if (field === "measurementType") {
        nextItem.unit = takeoffUnitForType(value);
      }
      if (field === "customerVisible") {
        nextItem.customerVisible = value === true || value === "true";
      }
      if (field === "fieldVisible") {
        nextItem.fieldVisible = value === true || value === "true";
      }
      if (field === "sheetId") {
        const selectedSheet = sheets.find((sheet) => sheet.id === value);
        nextItem.sheetId = selectedSheet?.id || "";
        nextItem.sheetName = selectedSheet?.name || "";
        nextItem.revision = selectedSheet?.revision || "";
      }
      return normalizeTakeoffStudioItem(nextItem, index);
    });
    commitTakeoff({ ...takeoff, sheets, items: nextItems });
  }

  function updateItemScale(index, field, value) {
    const nextItems = items.map((item, itemIndex) => itemIndex === index
      ? normalizeTakeoffStudioItem({ ...item, scale: { ...item.scale, [field]: value } }, index)
      : item);
    commitTakeoff({ ...takeoff, sheets, items: nextItems });
  }

  function updateItemDepth(index, field, value) {
    const nextItems = items.map((item, itemIndex) => itemIndex === index
      ? normalizeTakeoffStudioItem({ ...item, depth: { ...item.depth, [field]: value } }, index)
      : item);
    commitTakeoff({ ...takeoff, sheets, items: nextItems });
  }

  function updateItemPoints(index, value) {
    const points = parseTakeoffPointsText(value);
    const nextItems = items.map((item, itemIndex) => itemIndex === index
      ? normalizeTakeoffStudioItem({ ...item, points }, index)
      : item);
    commitTakeoff({ ...takeoff, sheets, items: nextItems });
  }

  function addItem() {
    commitTakeoff({ ...takeoff, sheets, items: [...items, createEmptyTakeoffStudioItem(items.length)] });
  }

  function removeItem(index) {
    commitTakeoff({ ...takeoff, sheets, items: items.filter((_, itemIndex) => itemIndex !== index) });
  }

  function updateMarkupComment(index, field, value) {
    const nextComments = markupComments.map((comment, commentIndex) => commentIndex === index ? { ...comment, [field]: value } : comment);
    commitTakeoff({ ...takeoff, sheets, items, markupComments: nextComments });
  }

  function addMarkupComment() {
    commitTakeoff({ ...takeoff, sheets, items, markupComments: [...markupComments, createEmptyTakeoffStudioMarkupComment(markupComments.length)] });
  }

  function removeMarkupComment(index) {
    commitTakeoff({ ...takeoff, sheets, items, markupComments: markupComments.filter((_, commentIndex) => commentIndex !== index) });
  }

  function importCsvRows() {
    if (!csvImportText.trim()) return;
    commitTakeoff(mergeTakeoffStudioCsvImport({ ...takeoff, sheets, items }, csvImportText));
    setCsvImportText("");
  }

  function applySelectedSheetScale() {
    if (!selectedSheet?.id) return;
    commitTakeoff(applyTakeoffStudioSheetCalibrationToItems({ ...takeoff, sheets, items }, selectedSheet.id));
  }

  function syncReviewedRowsToBackup() {
    setDraft((current) => {
      const currentBackup = deriveEstimateBackup(current);
      const nonStudioRows = (currentBackup.takeoffRows || []).filter((row) => !String(row?.source || "").includes("Apex Takeoff Studio"));
      return mergeEstimateBackup(current, {
        ...currentBackup,
        takeoffStudio: takeoff,
        takeoffRows: [...nonStudioRows, ...reviewedRows],
      });
    });
  }

  function applyReviewedRowsToEstimateLines() {
    setDraft((current) => {
      const currentBackup = deriveEstimateBackup(current);
      const nonStudioRows = (currentBackup.takeoffRows || []).filter((row) => !String(row?.source || "").includes("Apex Takeoff Studio"));
      const withDraftItems = mergeTakeoffStudioIntoDraft(current, takeoff);
      return mergeEstimateBackup(withDraftItems, {
        ...currentBackup,
        takeoffStudio: takeoff,
        takeoffRows: [...nonStudioRows, ...reviewedRows],
      });
    });
  }

  function prepareGcPacketTakeoffProof() {
    setDraft((current) => {
      const currentPacket = deriveEstimateGcPacketLite(current);
      return mergeEstimateGcPacketLite(current, {
        ...currentPacket,
        proposalSummary: appendUniqueTextBlock(currentPacket.proposalSummary, gcPacketProof.proposalSummary),
        qualifications: appendUniqueTextBlock(currentPacket.qualifications, gcPacketProof.qualifications),
        addendaRfiReferences: appendUniqueTextBlock(currentPacket.addendaRfiReferences, gcPacketProof.addendaRfiReferences),
        internalPacketNotes: appendUniqueTextBlock(currentPacket.internalPacketNotes, gcPacketProof.internalPacketNotes),
      });
    });
  }

  function applyAssistantSuggestion(suggestion) {
    const actionType = suggestion?.apply?.type;
    if (actionType === "mark_reviewed" || actionType === "mark_customer_safe") {
      commitTakeoff(applyTakeoffStudioAssistantSuggestion(takeoff, suggestion));
      return;
    }
    if (actionType === "apply_estimate_lines") {
      setDraft((current) => {
        const currentBackup = deriveEstimateBackup(current);
        const nonStudioRows = (currentBackup.takeoffRows || []).filter((row) => !String(row?.source || "").includes("Apex Takeoff Studio"));
        const takeoffWithState = mergeTakeoffStudioAssistantSuggestionState(takeoff, suggestion.id, "applied");
        const withDraftItems = mergeTakeoffStudioIntoDraft(current, takeoff);
        return mergeEstimateBackup(withDraftItems, {
          ...currentBackup,
          takeoffStudio: takeoffWithState,
          takeoffRows: [...nonStudioRows, ...reviewedRows],
        });
      });
      return;
    }
    if (actionType === "prepare_gc_summary") {
      setDraft((current) => {
        const currentPacket = deriveEstimateGcPacketLite(current);
        const takeoffWithState = mergeTakeoffStudioAssistantSuggestionState(takeoff, suggestion.id, "applied");
        const withPacket = mergeEstimateGcPacketLite(current, {
          ...currentPacket,
          proposalSummary: appendUniqueTextBlock(currentPacket.proposalSummary, gcPacketProof.proposalSummary),
          qualifications: appendUniqueTextBlock(currentPacket.qualifications, gcPacketProof.qualifications),
          addendaRfiReferences: appendUniqueTextBlock(currentPacket.addendaRfiReferences, gcPacketProof.addendaRfiReferences),
          internalPacketNotes: appendUniqueTextBlock(currentPacket.internalPacketNotes, gcPacketProof.internalPacketNotes),
        });
        return mergeEstimateBackup(withPacket, {
          ...deriveEstimateBackup(withPacket),
          takeoffStudio: takeoffWithState,
        });
      });
      return;
    }
    commitTakeoff(mergeTakeoffStudioAssistantSuggestionState(takeoff, suggestion.id, "applied"));
  }

  function dismissAssistantSuggestion(suggestion) {
    commitTakeoff(mergeTakeoffStudioAssistantSuggestionState(takeoff, suggestion.id, "dismissed"));
  }

  return (
    <div className="rounded-3xl border border-blue-100 bg-blue-50/50 p-4 shadow-sm shadow-blue-100/50">
      <SectionHeader
        title="Apex Takeoff Studio"
        description="Manual plan-sheet quantities for estimate backup. Review quantities before they are used in estimate lines or proposal proof."
        action={<Badge tone={readiness.tone}>{readiness.label}</Badge>}
      />
      <div className="grid gap-3 md:grid-cols-3">
        <StatCard title="Items" value={`${readiness.itemCount}`} />
        <StatCard title="Reviewed" value={`${readiness.reviewedItems}`} />
        <StatCard title="Draft Lines" value={`${reviewedLineItems.length}`} />
      </div>
      <div className="mt-3 rounded-2xl border border-blue-100 bg-white/85 px-3 py-2 text-sm font-bold leading-6 text-blue-900">
        {readiness.summary}
      </div>
      <div className="mt-3 rounded-2xl border border-sky-100 bg-white/95 p-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-700">Plan viewer + calibration</p>
            <p className="mt-1 text-sm font-bold leading-6 text-slate-600">{sheetWorkspace.summary}</p>
          </div>
          <Badge tone={calibrationState.ready ? "green" : "amber"}>{calibrationState.calibratedSheets}/{calibrationState.sheetCount || 0} calibrated</Badge>
        </div>
        <div className="mt-3 grid gap-3 xl:grid-cols-[240px_minmax(0,1fr)_260px]">
          <div className="grid gap-2">
            {sheetWorkspace.thumbnails.length ? sheetWorkspace.thumbnails.map((thumbnail) => (
              <button
                key={thumbnail.id}
                type="button"
                onClick={() => updateSelectedSheet(thumbnail.id)}
                disabled={disabled}
                className={`rounded-2xl border p-3 text-left transition ${thumbnail.selected ? "border-sky-300 bg-sky-50" : "border-slate-100 bg-slate-50 hover:border-sky-200 hover:bg-white"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-black text-slate-950">{thumbnail.label}</p>
                    <p className="mt-1 break-words text-xs font-bold text-slate-500">{thumbnail.subtitle || "No source recorded"}</p>
                  </div>
                  <Badge tone={thumbnail.calibrated ? "green" : "amber"}>{thumbnail.calibrated ? "Scale" : "No scale"}</Badge>
                </div>
                <p className="mt-2 text-xs font-bold text-slate-500">{thumbnail.itemCount} measurement{thumbnail.itemCount === 1 ? "" : "s"} / {thumbnail.status}</p>
              </button>
            )) : <p className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-900">Add a sheet to start.</p>}
          </div>
          <div className="min-w-0 rounded-2xl border border-slate-100 bg-slate-950 p-3 text-white">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-200">{selectedSheet?.name || "No sheet"}</p>
                <p className="mt-1 text-xs font-bold text-slate-300">{selectedSheet?.sourceFileName || selectedSheet?.sourcePreviewUrl || "Recorded plan preview appears here after a source is added."}</p>
              </div>
              <Badge tone={selectedSheet?.status === "superseded" ? "amber" : "blue"}>{selectedSheet?.previewKind || "placeholder"}</Badge>
            </div>
            <div className="mt-3 aspect-[11/8.5] overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
              {selectedSheet?.sourcePreviewUrl && selectedSheet.previewKind === "image" ? (
                <img src={selectedSheet.sourcePreviewUrl} alt={`${selectedSheet.name} plan preview`} className="h-full w-full object-contain" />
              ) : selectedSheet?.sourcePreviewUrl ? (
                <iframe title={`${selectedSheet.name} plan preview`} src={selectedSheet.sourcePreviewUrl} className="h-full w-full bg-white" />
              ) : (
                <svg viewBox={`0 0 ${sheetWorkspace.bounds.width} ${sheetWorkspace.bounds.height}`} className="h-full w-full" role="img" aria-label="Plan sheet measurement workspace">
                  <rect x="0" y="0" width={sheetWorkspace.bounds.width} height={sheetWorkspace.bounds.height} fill="#f8fafc" />
                  {Array.from({ length: 9 }).map((_, gridIndex) => {
                    const x = (sheetWorkspace.bounds.width / 8) * gridIndex;
                    const y = (sheetWorkspace.bounds.height / 8) * gridIndex;
                    return (
                      <g key={`plan-grid-${gridIndex}`}>
                        <line x1={x} y1="0" x2={x} y2={sheetWorkspace.bounds.height} stroke="#e2e8f0" strokeWidth="2" />
                        <line x1="0" y1={y} x2={sheetWorkspace.bounds.width} y2={y} stroke="#e2e8f0" strokeWidth="2" />
                      </g>
                    );
                  })}
                  <text x="32" y="48" fill="#334155" fontSize="28" fontWeight="800">{selectedSheet?.name || "Plan sheet"}</text>
                  {sheetWorkspace.overlays.map((overlay, overlayIndex) => {
                    const pointList = overlay.points.map((point) => `${point.x},${point.y}`).join(" ");
                    const color = overlay.reviewStatus === "reviewed" ? "#059669" : "#f59e0b";
                    return (
                      <g key={overlay.id || `overlay-${overlayIndex}`}>
                        {overlay.points.length === 1 ? <circle cx={overlay.points[0].x} cy={overlay.points[0].y} r="10" fill={color} /> : null}
                        {overlay.points.length > 1 && overlay.closed ? <polygon points={pointList} fill={`${color}33`} stroke={color} strokeWidth="6" /> : null}
                        {overlay.points.length > 1 && !overlay.closed ? <polyline points={pointList} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" /> : null}
                        {overlay.points[0] ? <text x={overlay.points[0].x + 14} y={overlay.points[0].y - 14} fill="#0f172a" fontSize="24" fontWeight="800">{overlay.label}</text> : null}
                      </g>
                    );
                  })}
                </svg>
              )}
            </div>
            <p className="mt-2 text-xs font-bold leading-5 text-slate-300">{sheetWorkspace.safetyBoundary}</p>
          </div>
          <div className="grid content-start gap-3">
            <StatCard title="Sheets" value={`${sheetWorkspace.metrics.sheetCount}`} />
            <StatCard title="Sources" value={`${sheetWorkspace.metrics.sourceSheetCount}`} />
            <StatCard title="Active sheets" value={`${sheetWorkspace.metrics.activeSheetCount}`} />
            <div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-3">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-800">Calibration review</p>
              <p className="mt-1 text-sm font-bold leading-6 text-slate-700">{calibrationState.summary}</p>
              <div className="mt-3">
                <Button type="button" size="sm" onClick={applySelectedSheetScale} disabled={disabled || !selectedSheet?.scale?.calibrated || calibrationState.itemsUsingSheetScale.length === 0}>Use Sheet Scale On Measurements</Button>
              </div>
              {sheetWorkspace.warnings.length ? (
                <div className="mt-3 grid gap-2">
                  {sheetWorkspace.warnings.map((warning) => <p key={warning} className="rounded-xl border border-amber-100 bg-white px-3 py-2 text-xs font-bold text-amber-900">{warning}</p>)}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
      <div className="mt-3 rounded-2xl border border-violet-100 bg-white/90 p-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-700">Takeoff Assistant</p>
            <p className="mt-1 text-sm font-bold leading-6 text-slate-600">Review-first suggestions only. No pricing, approval, send, bid submission, provider write, or customer action happens automatically.</p>
          </div>
          <Badge tone={assistantQueue.length ? "amber" : "green"}>{assistantQueue.length} suggestion{assistantQueue.length === 1 ? "" : "s"}</Badge>
        </div>
        <div className="mt-3 grid gap-2">
          {assistantQueue.length ? assistantQueue.slice(0, 5).map((suggestion) => (
            <div key={suggestion.id} className="rounded-xl border border-violet-100 bg-violet-50/60 p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-violet-700">{suggestion.category.replace(/_/g, " ")}</p>
                  <p className="mt-1 text-sm font-black text-slate-950">{suggestion.title}</p>
                  <p className="mt-1 text-sm font-bold leading-6 text-slate-600">{suggestion.detail}</p>
                  <p className="mt-2 text-xs font-bold text-slate-500">{suggestion.safetyBoundary}</p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {suggestion.apply?.type ? <Button type="button" size="sm" onClick={() => applyAssistantSuggestion(suggestion)} disabled={disabled}>{suggestion.actionLabel}</Button> : null}
                  <Button type="button" variant="secondary" size="sm" onClick={() => dismissAssistantSuggestion(suggestion)} disabled={disabled}>Dismiss</Button>
                </div>
              </div>
            </div>
          )) : <p className="rounded-xl border border-emerald-100 bg-emerald-50/70 px-3 py-2 text-sm font-bold text-emerald-800">No active assistant suggestions. Reviewed quantities and proof choices look ready for estimator review.</p>}
        </div>
      </div>
      <div className="mt-3 rounded-2xl border border-slate-200 bg-white/95 p-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-700">Advanced takeoff package</p>
            <p className="mt-1 text-sm font-bold leading-6 text-slate-600">Tool sets, measurement legend, CSV exchange, revision comparison, and markup comments stay inside office review.</p>
          </div>
          <Badge tone="blue">{measurementLegend.toolSet.label}</Badge>
        </div>
        <div className="mt-3 grid gap-3 xl:grid-cols-[220px_minmax(0,1fr)]">
          <SelectField label="Tool set" value={takeoff.toolSetId || "concrete-flatwork"} onChange={(event) => commitTakeoff({ ...takeoff, sheets, items, toolSetId: event.target.value })} disabled={disabled}>
            {toolSetOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
          </SelectField>
          <div className="grid gap-2 md:grid-cols-3">
            <StatCard title="Legend groups" value={`${measurementLegend.rows.length}`} />
            <StatCard title="Revision comparisons" value={`${revisionComparison.rows.length}`} />
            <StatCard title="Package rows" value={`${packageExport.itemCount}`} />
          </div>
        </div>
        <div className="mt-3 grid gap-3 xl:grid-cols-2">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-600">Measurement legend</p>
            <div className="mt-2 grid gap-2">
              {measurementLegend.rows.length ? measurementLegend.rows.slice(0, 6).map((row) => (
                <div key={`${row.measurementType}-${row.unit}-${row.reviewStatus}-${row.revisionStatus}`} className="rounded-xl border border-slate-100 bg-white px-3 py-2 text-sm font-bold text-slate-700">
                  <span>{row.measurementType} / {row.unit}</span>
                  <p className="mt-1 text-xs text-slate-500">{row.quantity} total / {row.count} item{row.count === 1 ? "" : "s"} / {row.reviewStatus} / {row.revisionStatus}</p>
                </div>
              )) : <p className="text-sm font-bold text-slate-500">{measurementLegend.summary}</p>}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-600">Revision comparison</p>
            <div className="mt-2 grid gap-2">
              {revisionComparison.rows.length ? revisionComparison.rows.slice(0, 6).map((row) => (
                <div key={`${row.title}-${row.previousQuantity}-${row.revisedQuantity}`} className="rounded-xl border border-slate-100 bg-white px-3 py-2 text-sm font-bold text-slate-700">
                  <span>{row.title}</span>
                  <p className="mt-1 text-xs text-slate-500">{row.previousQuantity} to {row.revisedQuantity}{row.source ? ` / ${row.source}` : ""}</p>
                </div>
              )) : <p className="text-sm font-bold text-slate-500">{revisionComparison.summary}</p>}
            </div>
          </div>
        </div>
        <div className="mt-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-600">Markup comments</p>
            <Button type="button" variant="secondary" size="sm" onClick={addMarkupComment} disabled={disabled}>Add Comment</Button>
          </div>
          <div className="mt-2 grid gap-2">
            {markupComments.map((comment, index) => (
              <div key={`takeoff-comment-${comment.id}-${index}`} className="rounded-xl border border-slate-100 bg-white p-3">
                <div className="grid gap-3 md:grid-cols-[140px_140px_140px_minmax(0,1fr)]">
                  <SelectField label="Type" value={comment.type || "note"} onChange={(event) => updateMarkupComment(index, "type", event.target.value)} disabled={disabled}>
                    <option value="note">Note</option>
                    <option value="rfi">RFI</option>
                    <option value="scope">Scope</option>
                    <option value="risk">Risk</option>
                  </SelectField>
                  <SelectField label="Status" value={comment.status || "open"} onChange={(event) => updateMarkupComment(index, "status", event.target.value)} disabled={disabled}>
                    <option value="open">Open</option>
                    <option value="resolved">Resolved</option>
                  </SelectField>
                  <SelectField label="Visibility" value={comment.visibility || "office"} onChange={(event) => updateMarkupComment(index, "visibility", event.target.value)} disabled={disabled}>
                    <option value="office">Office</option>
                    <option value="proposal">Proposal</option>
                    <option value="field">Field</option>
                  </SelectField>
                  <InputField label="Comment" value={comment.text || ""} onChange={(event) => updateMarkupComment(index, "text", event.target.value)} disabled={disabled} placeholder="Add reviewed markup note" />
                </div>
                <div className="mt-2 flex justify-end">
                  <button type="button" onClick={() => removeMarkupComment(index)} disabled={disabled} className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 hover:text-slate-950 disabled:cursor-not-allowed disabled:text-slate-300">Remove comment</button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-3 grid gap-3 xl:grid-cols-2">
          <div>
            <TextAreaField label="CSV import" value={csvImportText} onChange={(event) => setCsvImportText(event.target.value)} disabled={disabled} className="field-input min-h-28 resize-y font-mono text-xs" placeholder="label,measurementType,quantity,unit,sheetName,revision" />
            <div className="mt-2">
              <Button type="button" size="sm" onClick={importCsvRows} disabled={disabled || !csvImportText.trim()}>Import CSV Rows</Button>
            </div>
          </div>
          <TextAreaField label="CSV export" value={csvExport} onChange={() => {}} disabled className="field-input min-h-28 resize-y font-mono text-xs" />
        </div>
        <div className="mt-3">
          <TextAreaField label="Takeoff package export" value={JSON.stringify(packageExport, null, 2)} onChange={() => {}} disabled className="field-input min-h-36 resize-y font-mono text-xs" />
        </div>
      </div>

      <div className="mt-4 grid gap-4">
        <div>
          <SectionHeader title="Plan sheets" description="Track sheet names, revisions, and source files before measuring." />
          <div className="grid gap-3">
            {sheets.map((sheet, index) => (
              <div key={`takeoff-sheet-${sheet.id}-${index}`} className="rounded-2xl border border-blue-100 bg-white p-3">
                <div className="grid gap-3 md:grid-cols-[minmax(0,1.2fr)_120px_150px_minmax(0,1fr)]">
                  <InputField label={`Sheet ${index + 1}`} value={sheet.name || ""} onChange={(event) => updateSheet(index, "name", event.target.value)} disabled={disabled} placeholder="C2.1 Site Plan" />
                  <InputField label="Revision" value={sheet.revision || ""} onChange={(event) => updateSheet(index, "revision", event.target.value)} disabled={disabled} placeholder="Rev A" />
                  <SelectField label="Status" value={sheet.status || "active"} onChange={(event) => updateSheet(index, "status", event.target.value)} disabled={disabled}>
                    <option value="active">Active</option>
                    <option value="superseded">Superseded</option>
                  </SelectField>
                  <InputField label="Source file" value={sheet.sourceFileName || ""} onChange={(event) => updateSheet(index, "sourceFileName", event.target.value)} disabled={disabled} placeholder="plan-set.pdf" />
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1.4fr)_90px_110px_110px_110px]">
                  <InputField label="Preview URL" value={sheet.sourcePreviewUrl || ""} onChange={(event) => updateSheet(index, "sourcePreviewUrl", event.target.value)} disabled={disabled} placeholder="/uploads/plan-page.png or reviewed PDF URL" />
                  <InputField label="Page" value={sheet.pageNumber || ""} onChange={(event) => updateSheet(index, "pageNumber", event.target.value)} disabled={disabled} inputMode="numeric" placeholder="1" />
                  <InputField label="Canvas width" value={sheet.pageWidth || ""} onChange={(event) => updateSheet(index, "pageWidth", event.target.value)} disabled={disabled} inputMode="numeric" placeholder="1100" />
                  <InputField label="Canvas height" value={sheet.pageHeight || ""} onChange={(event) => updateSheet(index, "pageHeight", event.target.value)} disabled={disabled} inputMode="numeric" placeholder="850" />
                  <SelectField label="Rotation" value={String(sheet.rotation || 0)} onChange={(event) => updateSheet(index, "rotation", event.target.value)} disabled={disabled}>
                    <option value="0">0</option>
                    <option value="90">90</option>
                    <option value="180">180</option>
                    <option value="270">270</option>
                  </SelectField>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <InputField label="Sheet scale pixels" value={sheet.scale?.pixels || ""} onChange={(event) => updateSheetScale(index, "pixels", event.target.value)} disabled={disabled} inputMode="decimal" placeholder="100" />
                  <InputField label="Sheet real length" value={sheet.scale?.realWorldLength || ""} onChange={(event) => updateSheetScale(index, "realWorldLength", event.target.value)} disabled={disabled} inputMode="decimal" placeholder="10" />
                  <InputField label="Sheet scale unit" value={sheet.scale?.realWorldUnit || "FT"} onChange={(event) => updateSheetScale(index, "realWorldUnit", event.target.value)} disabled={disabled} placeholder="FT" />
                </div>
                <div className="mt-3 flex justify-end">
                  <button type="button" onClick={() => removeSheet(index)} disabled={disabled} className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 hover:text-slate-950 disabled:cursor-not-allowed disabled:text-slate-300">Remove sheet</button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3">
            <Button type="button" variant="secondary" size="sm" onClick={addSheet} disabled={disabled}>Add Sheet</Button>
          </div>
        </div>

        <div>
          <SectionHeader title="Manual measurements" description="Enter points as x,y pairs from a plan screenshot or PDF canvas. Scale converts those pixels into reviewed quantities." />
          <div className="grid gap-3">
            {items.map((item, index) => (
              <div key={`takeoff-studio-item-${item.id}-${index}`} className="rounded-2xl border border-blue-100 bg-white p-3">
                <div className="grid gap-3 xl:grid-cols-[minmax(0,1.2fr)_160px_160px_160px_110px]">
                  <InputField label={`Item ${index + 1}`} value={item.label || ""} onChange={(event) => updateItem(index, "label", event.target.value)} disabled={disabled} placeholder="Driveway slab" />
                  <SelectField label="Type" value={item.measurementType || "area"} onChange={(event) => updateItem(index, "measurementType", event.target.value)} disabled={disabled}>
                    {TAKEOFF_MEASUREMENT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </SelectField>
                  <SelectField label="Sheet" value={item.sheetId || ""} onChange={(event) => updateItem(index, "sheetId", event.target.value)} disabled={disabled}>
                    <option value="">Manual / no sheet</option>
                    {sheets.filter((sheet) => sheet.name).map((sheet) => <option key={sheet.id} value={sheet.id}>{sheet.name}</option>)}
                  </SelectField>
                  <SelectField label="Assembly" value={item.assemblyId || "direct"} onChange={(event) => updateItem(index, "assemblyId", event.target.value)} disabled={disabled}>
                    {assemblyOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                  </SelectField>
                  <SelectField label="Proposal proof" value={item.customerVisible ? "true" : "false"} onChange={(event) => updateItem(index, "customerVisible", event.target.value)} disabled={disabled}>
                    <option value="false">Office only</option>
                    <option value="true">Customer safe</option>
                  </SelectField>
                  <SelectField label="Review" value={item.reviewStatus || "needs_review"} onChange={(event) => updateItem(index, "reviewStatus", event.target.value)} disabled={disabled}>
                    <option value="needs_review">Needs review</option>
                    <option value="reviewed">Reviewed</option>
                  </SelectField>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_160px_160px]">
                  <SelectField label="Field handoff" value={item.fieldVisible ? "true" : "false"} onChange={(event) => updateItem(index, "fieldVisible", event.target.value)} disabled={disabled}>
                    <option value="false">Office only</option>
                    <option value="true">Field safe</option>
                  </SelectField>
                  <SelectField label="Revision state" value={item.revisionStatus || "active"} onChange={(event) => updateItem(index, "revisionStatus", event.target.value)} disabled={disabled}>
                    <option value="active">Active</option>
                    <option value="revised">Revised</option>
                    <option value="superseded">Superseded</option>
                  </SelectField>
                  <InputField label="Manual quantity fallback" value={item.quantity || ""} onChange={(event) => updateItem(index, "quantity", event.target.value)} disabled={disabled} inputMode="decimal" placeholder="Used if no points" />
                </div>
                <div className="mt-3 grid gap-3 xl:grid-cols-[120px_120px_120px_120px]">
                  <InputField label="Unit" value={item.unit || ""} onChange={(event) => updateItem(index, "unit", event.target.value)} disabled={disabled} placeholder={takeoffUnitForType(item.measurementType)} />
                  <InputField label="Scale pixels" value={item.scale.pixels || ""} onChange={(event) => updateItemScale(index, "pixels", event.target.value)} disabled={disabled} inputMode="decimal" placeholder="100" />
                  <InputField label="Real length" value={item.scale.realWorldLength || ""} onChange={(event) => updateItemScale(index, "realWorldLength", event.target.value)} disabled={disabled} inputMode="decimal" placeholder="10" />
                  <InputField label="Scale unit" value={item.scale.realWorldUnit || "FT"} onChange={(event) => updateItemScale(index, "realWorldUnit", event.target.value)} disabled={disabled} placeholder="FT" />
                </div>
                {item.measurementType === "volume" ? (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <InputField label="Depth" value={item.depth.value || ""} onChange={(event) => updateItemDepth(index, "value", event.target.value)} disabled={disabled} inputMode="decimal" placeholder="4" />
                    <InputField label="Depth unit" value={item.depth.unit || "IN"} onChange={(event) => updateItemDepth(index, "unit", event.target.value)} disabled={disabled} placeholder="IN" />
                  </div>
                ) : null}
                <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
                  <TextAreaField label="Geometry points" value={formatTakeoffPointsText(item.points)} onChange={(event) => updateItemPoints(index, event.target.value)} disabled={disabled} className="field-input min-h-28 resize-y" placeholder={"0, 0\n100, 0\n100, 100\n0, 100"} />
                  <TextAreaField label="Estimator note" value={item.estimatorNote || ""} onChange={(event) => updateItem(index, "estimatorNote", event.target.value)} disabled={disabled} className="field-input min-h-28 resize-y" placeholder="Waste, phase, addenda, or field verification note." />
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-100 bg-blue-50/70 px-3 py-2">
                  <div className="text-sm font-black text-blue-950">
                    Reviewed quantity: {item.quantity || 0} {item.unit || takeoffUnitForType(item.measurementType)}
                  </div>
                  <button type="button" onClick={() => removeItem(index)} disabled={disabled} className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 hover:text-slate-950 disabled:cursor-not-allowed disabled:text-slate-300">Remove item</button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={addItem} disabled={disabled}>Add Measurement</Button>
            <Button type="button" size="sm" onClick={syncReviewedRowsToBackup} disabled={disabled || reviewedRows.length === 0}>Sync Reviewed Rows To Backup</Button>
            <Button type="button" size="sm" onClick={applyReviewedRowsToEstimateLines} disabled={disabled || reviewedLineItems.length === 0}>Apply Reviewed To Estimate Lines</Button>
            <Button type="button" variant="secondary" size="sm" onClick={prepareGcPacketTakeoffProof} disabled={disabled || (!gcPacketProof.proposalSummary && !gcPacketProof.internalPacketNotes)}>Prepare GC Proof Summary</Button>
          </div>
          <div className="mt-3 rounded-2xl border border-blue-100 bg-white/85 p-3">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">Estimate line preview</p>
            <div className="mt-2 grid gap-2">
              {reviewedLineItems.length ? reviewedLineItems.slice(0, 5).map((lineItem) => (
                <div key={lineItem.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700">
                  <span>{lineItem.description}</span>
                  <span>{lineItem.quantity} {lineItem.unit} - pricing blank</span>
                </div>
              )) : <p className="text-sm font-bold text-slate-500">Review measurements to preview estimate line quantities. Prices stay blank for office review.</p>}
              {reviewedLineItems.length > 5 ? <p className="text-xs font-bold text-slate-500">+{reviewedLineItems.length - 5} more draft line item{reviewedLineItems.length - 5 === 1 ? "" : "s"}.</p> : null}
            </div>
          </div>
          <div className="mt-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-3">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">Proposal proof preview</p>
            <div className="mt-2 grid gap-2">
              {proposalProofRows.length ? proposalProofRows.slice(0, 5).map((row) => (
                <div key={`${row.title}-${row.summary}`} className="rounded-xl border border-emerald-100 bg-white px-3 py-2 text-sm font-bold text-slate-700">
                  <span>{row.title}</span>
                  <p className="mt-1 text-xs text-slate-500">{row.summary}</p>
                </div>
              )) : <p className="text-sm font-bold text-slate-500">Set reviewed measurements to Customer safe before they can appear as proposal proof.</p>}
              {proposalProofRows.length > 5 ? <p className="text-xs font-bold text-slate-500">+{proposalProofRows.length - 5} more proof item{proposalProofRows.length - 5 === 1 ? "" : "s"}.</p> : null}
            </div>
          </div>
          <div className="mt-3 rounded-2xl border border-cyan-100 bg-cyan-50/70 p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-800">Revision + field handoff</p>
                <p className="mt-1 text-sm font-bold leading-6 text-slate-600">{fieldHandoff.summary}</p>
              </div>
              <Badge tone={fieldHandoff.ready ? "green" : "amber"}>{proofSnapshot.revisionSummary}</Badge>
            </div>
            <div className="mt-3 grid gap-2">
              {fieldHandoff.rows.length ? fieldHandoff.rows.slice(0, 5).map((row) => (
                <div key={`field-handoff-${row.id}`} className="rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm font-bold text-slate-700">
                  <span>{row.title}</span>
                  <p className="mt-1 text-xs text-slate-500">{row.quantity} {row.unit}{row.source ? ` / ${row.source}` : ""}</p>
                </div>
              )) : <p className="rounded-xl border border-amber-100 bg-amber-50/80 px-3 py-2 text-sm font-bold text-amber-900">Mark reviewed quantities as Field safe before they can appear in foreman handoff context.</p>}
              {revisionRegister.warnings.slice(0, 4).map((warning) => (
                <p key={warning} className="rounded-xl border border-orange-100 bg-white px-3 py-2 text-xs font-bold text-orange-800">{warning}</p>
              ))}
              <p className="text-xs font-bold text-slate-500">{fieldHandoff.safetyBoundary}</p>
            </div>
          </div>
        </div>

        <TextAreaField
          label="Takeoff notes"
          value={takeoff.notes || ""}
          onChange={(event) => commitTakeoff({ ...takeoff, sheets, items, notes: event.target.value })}
          disabled={disabled}
          className="field-input min-h-24 resize-y"
          placeholder="Plan set assumptions, calibration notes, or review reminders."
        />
      </div>
    </div>
  );
}

const DEFAULT_MAPBOX_TOKEN = import.meta.env?.VITE_MAPBOX_TOKEN || "";

function formatFenceFeet(value) {
  const parsed = Number.parseFloat(String(value ?? ""));
  if (!Number.isFinite(parsed)) return "0 LF";
  return `${parsed.toLocaleString("en-US", { maximumFractionDigits: 1 })} LF`;
}

function buildFenceSegmentsFromFeatures(features = [], previousSegments = []) {
  return features.map((feature, index) => {
    const previous = previousSegments[index] || {};
    return {
      ...previous,
      id: previous.id || feature.id || `fence-segment-${index + 1}`,
      label: previous.label || `Segment ${index + 1}`,
      fenceType: previous.fenceType || "Fence run",
      height: previous.height || "6 ft",
      material: previous.material || "Cedar",
      gates: previous.gates ?? 0,
      geojson: {
        type: "Feature",
        properties: {},
        geometry: feature.geometry,
      },
    };
  });
}

function FenceSatelliteTakeoffMap({ token = DEFAULT_MAPBOX_TOKEN, takeoff, disabled, onChange }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const latestTakeoffRef = useRef(takeoff);
  const onChangeRef = useRef(onChange);
  const drawingRef = useRef(false);
  const draftPointsRef = useRef([]);
  const [mapReady, setMapReady] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [draftPoints, setDraftPoints] = useState([]);
  const [mapStatus, setMapStatus] = useState(token ? "Loading satellite map..." : "Add VITE_MAPBOX_TOKEN to enable the satellite drawing map.");
  const [addressInput, setAddressInput] = useState(takeoff.address || "");
  const [searchBusy, setSearchBusy] = useState(false);

  const segmentFeatures = useMemo(() => normalizeFenceTakeoff(takeoff).segments
    .map((segment) => segment.geojson)
    .filter((feature) => feature?.geometry?.type === "LineString"), [takeoff]);

  const draftFeature = useMemo(() => ({
    type: "FeatureCollection",
    features: draftPoints.length >= 2 ? [{
      type: "Feature",
      properties: {},
      geometry: { type: "LineString", coordinates: draftPoints },
    }] : [],
  }), [draftPoints]);

  useEffect(() => {
    latestTakeoffRef.current = takeoff;
  }, [takeoff]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    setAddressInput(takeoff.address || "");
  }, [takeoff.address]);

  useEffect(() => {
    drawingRef.current = isDrawing;
    const canvas = mapRef.current?.getCanvas?.();
    if (canvas) canvas.style.cursor = isDrawing ? "crosshair" : "";
  }, [isDrawing]);

  useEffect(() => {
    draftPointsRef.current = draftPoints;
  }, [draftPoints]);

  function upsertMapSourceData(sourceId, featureCollection) {
    const source = mapRef.current?.getSource?.(sourceId);
    if (source?.setData) source.setData(featureCollection);
  }

  function syncMapData() {
    if (!mapRef.current || !mapReady) return;
    upsertMapSourceData("apex-fence-segments", { type: "FeatureCollection", features: segmentFeatures });
    upsertMapSourceData("apex-fence-draft", draftFeature);
  }

  useEffect(() => {
    syncMapData();
  }, [draftFeature, mapReady, segmentFeatures]);

  useEffect(() => {
    if (!token || disabled || !containerRef.current || mapRef.current) return undefined;
    let cancelled = false;
    let cleanup = () => {};

    async function loadMap() {
      try {
        const { default: mapboxgl } = await import("mapbox-gl");
        if (cancelled || !containerRef.current) return;

        mapboxgl.accessToken = token;
        const normalized = normalizeFenceTakeoff(latestTakeoffRef.current);
        const map = new mapboxgl.Map({
          container: containerRef.current,
          style: "mapbox://styles/mapbox/satellite-streets-v12",
          center: normalized.center.length === 2 ? normalized.center : [-123.0351, 44.9429],
          zoom: normalized.zoom || 18,
          attributionControl: false,
        });

        mapRef.current = map;
        map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
        map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-right");

        map.on("load", () => {
          if (!map.getSource("apex-fence-segments")) {
            map.addSource("apex-fence-segments", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
          }
          if (!map.getSource("apex-fence-draft")) {
            map.addSource("apex-fence-draft", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
          }
          if (!map.getLayer("apex-fence-segments-line")) {
            map.addLayer({
              id: "apex-fence-segments-line",
              type: "line",
              source: "apex-fence-segments",
              paint: { "line-color": "#f97316", "line-width": 4, "line-opacity": 0.96 },
            });
          }
          if (!map.getLayer("apex-fence-draft-line")) {
            map.addLayer({
              id: "apex-fence-draft-line",
              type: "line",
              source: "apex-fence-draft",
              paint: { "line-color": "#10b981", "line-width": 4, "line-dasharray": [1.4, 1.1] },
            });
          }
          setMapReady(true);
          setMapStatus("Click Start Drawing, then click fence points on the satellite map. Finish Segment saves the run.");
        });
        map.on("click", (event) => {
          if (!drawingRef.current || disabled) return;
          const nextPoints = [...draftPointsRef.current, [event.lngLat.lng, event.lngLat.lat]];
          setDraftPoints(nextPoints);
          setMapStatus(nextPoints.length >= 2 ? "Fence run in progress. Click more points or Finish Segment." : "First point set. Click the next fence corner.");
        });
        map.on("moveend", () => {
          const center = map.getCenter();
          onChangeRef.current({
            ...latestTakeoffRef.current,
            center: [center.lng, center.lat],
            zoom: map.getZoom(),
          });
        });

        cleanup = () => {
          map.remove();
          mapRef.current = null;
          setMapReady(false);
        };
      } catch (error) {
        setMapStatus(error?.message || "Satellite map could not load. Check the Mapbox token and network.");
      }
    }

    loadMap();
    return () => {
      cancelled = true;
      cleanup();
    };
  }, [disabled, token]);

  function startDrawing() {
    if (disabled || !token || !mapRef.current) return;
    setDraftPoints([]);
    setIsDrawing(true);
    setMapStatus("Drawing mode active. Click the first fence corner on the satellite map.");
  }

  function undoPoint() {
    const nextPoints = draftPoints.slice(0, -1);
    setDraftPoints(nextPoints);
    setMapStatus(nextPoints.length ? "Point removed. Continue drawing or finish the segment." : "No draft points left. Click the first fence corner.");
  }

  function cancelDrawing() {
    setDraftPoints([]);
    setIsDrawing(false);
    setMapStatus("Drawing cancelled. Start Drawing when ready.");
  }

  function finishSegment() {
    if (draftPoints.length < 2) {
      setMapStatus("Add at least two points before finishing a segment.");
      return;
    }
    const previous = normalizeFenceTakeoff(latestTakeoffRef.current).segments;
    const nextFeature = {
      type: "Feature",
      properties: {},
      geometry: { type: "LineString", coordinates: draftPoints },
    };
    const nextSegments = buildFenceSegmentsFromFeatures([nextFeature], []).map((segment) => ({
      ...segment,
      id: `fence-segment-${previous.length + 1}`,
      label: `Segment ${previous.length + 1}`,
    }));
    const center = mapRef.current?.getCenter?.();
    onChangeRef.current({
      ...latestTakeoffRef.current,
      center: center ? [center.lng, center.lat] : latestTakeoffRef.current.center,
      zoom: mapRef.current?.getZoom?.() || latestTakeoffRef.current.zoom,
      segments: [...previous, ...nextSegments],
      updatedAt: new Date().toISOString(),
    });
    setDraftPoints([]);
    setIsDrawing(false);
    setMapStatus("Fence segment saved. Label it below or draw another run.");
  }

  async function searchAddress() {
    const query = addressInput.trim();
    if (!query || !token || !mapRef.current) return;
    setSearchBusy(true);
    try {
      const response = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?limit=1&access_token=${encodeURIComponent(token)}`);
      const payload = await response.json();
      const center = payload?.features?.[0]?.center;
      if (Array.isArray(center) && center.length === 2) {
        mapRef.current.flyTo({ center, zoom: 19, essential: true });
        onChangeRef.current({ ...latestTakeoffRef.current, address: query, center, zoom: 19, updatedAt: new Date().toISOString() });
        setMapStatus("Address centered. Draw each fence run on the satellite image.");
      } else {
        setMapStatus("No Mapbox result found. Check the address and try again.");
      }
    } catch (error) {
      setMapStatus(error?.message || "Address search failed.");
    } finally {
      setSearchBusy(false);
    }
  }

  return (
    <div className="co-fence-takeoff-map-shell">
      <div className="co-fence-takeoff-search">
        <InputField
          label="Address / jobsite search"
          value={addressInput}
          onChange={(event) => setAddressInput(event.target.value)}
          placeholder="Enter project address"
          disabled={disabled}
        />
        <Button type="button" variant="secondary" onClick={searchAddress} disabled={disabled || !token || searchBusy || !addressInput.trim()}>
          {searchBusy ? "Searching" : "Search Map"}
        </Button>
      </div>
      {token ? (
        <div className="co-fence-takeoff-draw-actions">
          <Button type="button" size="sm" onClick={startDrawing} disabled={disabled || !mapReady || isDrawing}>Start Drawing</Button>
          <Button type="button" size="sm" variant="secondary" onClick={finishSegment} disabled={disabled || !isDrawing || draftPoints.length < 2}>Finish Segment</Button>
          <Button type="button" size="sm" variant="secondary" onClick={undoPoint} disabled={disabled || !isDrawing || draftPoints.length === 0}>Undo Point</Button>
          <Button type="button" size="sm" variant="secondary" onClick={cancelDrawing} disabled={disabled || !isDrawing}>Cancel</Button>
          <span>{draftPoints.length} point{draftPoints.length === 1 ? "" : "s"}</span>
        </div>
      ) : null}
      {token ? (
        <div ref={containerRef} className="co-fence-takeoff-map" aria-label="Satellite fence takeoff map" />
      ) : (
        <div className="co-fence-takeoff-map co-fence-takeoff-map--empty">
          <Icon name="lock" />
          <strong>Mapbox token needed</strong>
          <p>Add <code>VITE_MAPBOX_TOKEN</code> to local/demo env to enable satellite search and drawing. Existing takeoff rows and labels remain editable.</p>
        </div>
      )}
      <p className="co-fence-takeoff-map-status">{mapStatus}</p>
    </div>
  );
}

export function FenceTakeoffLiteEditor({ draft, setDraft, disabled = false, token = DEFAULT_MAPBOX_TOKEN, jobsiteAddress = "" }) {
  const backup = deriveEstimateBackup(draft);
  const takeoff = useMemo(() => normalizeFenceTakeoff({
    address: backup.fenceTakeoff?.address || jobsiteAddress,
    ...backup.fenceTakeoff,
  }), [backup.fenceTakeoff, jobsiteAddress]);
  const assemblies = summarizeFenceTakeoffByAssembly(takeoff);
  const proposalSummary = buildFenceTakeoffProposalSummary(takeoff);
  const fieldHandoff = buildFenceTakeoffFieldHandoff(takeoff);
  const proofPhotoChecklist = buildFenceTakeoffProofPhotoChecklist(takeoff);
  const readiness = deriveFenceTakeoffReadiness(takeoff);
  const draftLineItems = buildFenceTakeoffDraftLineItems(takeoff);

  const commitTakeoff = (nextTakeoff) => {
    setDraft((current) => mergeEstimateBackup(current, {
      ...deriveEstimateBackup(current),
      fenceTakeoff: normalizeFenceTakeoff(nextTakeoff),
    }));
  };

  const updateSegment = (index, field, value) => {
    const nextSegments = takeoff.segments.map((segment, segmentIndex) => (
      segmentIndex === index ? { ...segment, [field]: value } : segment
    ));
    commitTakeoff({ ...takeoff, segments: nextSegments, updatedAt: new Date().toISOString() });
  };

  const addManualSegment = () => {
    commitTakeoff({
      ...takeoff,
      segments: [
        ...takeoff.segments,
        {
          id: `manual-fence-segment-${takeoff.segments.length + 1}`,
          label: `Manual segment ${takeoff.segments.length + 1}`,
          fenceType: "Fence run",
          height: "6 ft",
          material: "Cedar",
          gates: 0,
          linearFeet: 100,
          notes: "Manual estimate-grade segment. Replace with satellite drawing when Mapbox token is configured.",
        },
      ],
      adjustmentNotes: takeoff.adjustmentNotes || "Manual LF added before satellite drawing. Field verify before material order.",
      updatedAt: new Date().toISOString(),
    });
  };

  const removeSegment = (index) => {
    commitTakeoff({
      ...takeoff,
      segments: takeoff.segments.filter((_, segmentIndex) => segmentIndex !== index),
      updatedAt: new Date().toISOString(),
    });
  };

  const applyTakeoffToDraft = () => {
    setDraft((current) => {
      const currentBackup = deriveEstimateBackup(current);
      const nextBackupRows = [
        ...currentBackup.takeoffRows.filter((row) => row.source !== "Satellite Fence Takeoff Lite"),
        ...buildFenceTakeoffBackupRows(takeoff),
      ];
      const withDraftItems = mergeFenceTakeoffIntoDraft(current, takeoff);
      return mergeEstimateBackup(withDraftItems, {
        ...currentBackup,
        takeoffRows: nextBackupRows,
        fenceTakeoff: takeoff,
      });
    });
  };

  return (
    <div className="co-fence-takeoff-lite rounded-3xl border border-emerald-100 bg-emerald-50/60 p-4 shadow-sm shadow-emerald-100/50">
      <SectionHeader
        title="Satellite Fence Takeoff Lite"
        description="Draw estimate-grade fence runs, label segment assemblies, create draft quantities, and prepare proposal/field handoff notes."
        action={<Badge tone="green">Office only</Badge>}
      />
      <div className="co-fence-takeoff-disclaimer">
        Estimate-grade only. Field verify fence line, gates, slope, utility locates, access, and property boundaries before final pricing or install. This is not survey-grade.
      </div>
      <div className="co-fence-readiness-card" data-tone={readiness.tone}>
        <div>
          <p>Quantity Confidence</p>
          <strong>{readiness.label}</strong>
          <span>{readiness.summary}</span>
        </div>
        <div className="co-fence-readiness-metrics">
          <span>{readiness.mapSegmentCount} map</span>
          <span>{readiness.manualSegmentCount} manual</span>
          <span>{formatFenceFeet(readiness.totalLinearFeet)}</span>
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)]">
        <FenceSatelliteTakeoffMap token={token} takeoff={takeoff} disabled={disabled} onChange={commitTakeoff} />
        <div className="co-fence-takeoff-summary">
          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <StatCard title="Linear feet" value={formatFenceFeet(takeoff.totalLinearFeet)} detail={`${takeoff.segments.length} segment${takeoff.segments.length === 1 ? "" : "s"}`} />
            <StatCard title="Gates" value={String(takeoff.gateCount)} detail="Openings marked for review" />
            <StatCard title="Draft rows" value={String(draftLineItems.length)} detail="Quantity rows ready to price" />
          </div>
          <div className="mt-3 grid gap-2">
            <Button type="button" onClick={applyTakeoffToDraft} disabled={disabled || takeoff.segments.length === 0}>
              Apply Quantities to Estimate
            </Button>
            <Button type="button" variant="secondary" onClick={addManualSegment} disabled={disabled}>
              Add Manual Segment
            </Button>
          </div>
        </div>
      </div>

      <div className="co-fence-adjustment-card">
        <TextAreaField
          label="Manual adjustment notes"
          value={takeoff.adjustmentNotes}
          onChange={(event) => commitTakeoff({ ...takeoff, adjustmentNotes: event.target.value, updatedAt: new Date().toISOString() })}
          disabled={disabled}
          placeholder="Explain manual LF adjustments, slopes, gate assumptions, inaccessible runs, or field-verification notes."
        />
        <p>Included in proposal-safe takeoff summary and field handoff. Do not put margin, private cost, or customer-sensitive notes here.</p>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <div className="co-fence-segment-list">
          <SectionHeader title="Fence segments" description="Label each drawn run by type, height, material, gates, and estimator notes." />
          {takeoff.segments.length ? (
            <div className="grid gap-3">
              {takeoff.segments.map((segment, index) => (
                <div key={segment.id || index} className="co-fence-segment-card">
                  <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_140px_150px_150px_90px]">
                    <InputField label={`Segment ${index + 1}`} value={segment.label} onChange={(event) => updateSegment(index, "label", event.target.value)} disabled={disabled} />
                    <InputField label="Type" value={segment.fenceType} onChange={(event) => updateSegment(index, "fenceType", event.target.value)} disabled={disabled} placeholder="Privacy" />
                    <InputField label="Height" value={segment.height} onChange={(event) => updateSegment(index, "height", event.target.value)} disabled={disabled} placeholder="6 ft" />
                    <InputField label="Material" value={segment.material} onChange={(event) => updateSegment(index, "material", event.target.value)} disabled={disabled} placeholder="Cedar" />
                    <InputField label="Gates" value={segment.gates} onChange={(event) => updateSegment(index, "gates", event.target.value)} disabled={disabled} inputMode="numeric" />
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-[120px_minmax(0,1fr)]">
                    <InputField label="Linear feet" value={segment.linearFeet} onChange={(event) => updateSegment(index, "linearFeet", event.target.value)} disabled={disabled || Boolean(segment.geojson)} inputMode="decimal" />
                    <TextAreaField label="Estimator note" value={segment.notes} onChange={(event) => updateSegment(index, "notes", event.target.value)} disabled={disabled} placeholder="Slope, removal, access, gate swing, utility, or install assumption." />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <Badge tone={segment.geojson ? "green" : "amber"}>{segment.geojson ? "Map measured" : "Manual LF"}</Badge>
                    <button type="button" className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 hover:text-slate-950 disabled:text-slate-300" onClick={() => removeSegment(index)} disabled={disabled}>Remove segment</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <StateCard title="No fence segments yet" description="Add a Mapbox token to draw on satellite imagery, or add a manual segment for estimate-grade quantity planning." tone="slate" />
          )}
        </div>

        <div className="co-fence-output-panel">
          <SectionHeader title="Proposal and handoff output" description="Review-safe copy generated from the takeoff. No bid, send, or job action happens automatically." />
          <div className="co-fence-output-card">
            <p className="co-fence-output-label">Assemblies</p>
            {assemblies.length ? assemblies.map((group) => (
              <div key={group.key} className="co-fence-output-row">
                <span>{group.height} {group.material} {group.fenceType}</span>
                <strong>{formatFenceFeet(group.linearFeet)}</strong>
              </div>
            )) : <p className="co-fence-output-empty">Draw or add segments to build quantity groups.</p>}
          </div>
          <div className="co-fence-output-card">
            <p className="co-fence-output-label">Proposal-safe summary</p>
            <p>{proposalSummary || "No proposal summary yet."}</p>
          </div>
          <div className="co-fence-output-card">
            <p className="co-fence-output-label">Field handoff checklist</p>
            <ul>
              {(fieldHandoff.length ? fieldHandoff : ["Add takeoff segments before generating a field checklist."]).map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
          <div className="co-fence-output-card">
            <p className="co-fence-output-label">Proof photos required</p>
            <ul>
              {(proofPhotoChecklist.length ? proofPhotoChecklist : ["Add takeoff segments before generating proof photo requirements."]).map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
        </div>
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
        title="GC Bid Packet Notes"
        description="Use these notes for commercial GC-facing proposal details. Review external sections before sending."
        action={<Badge tone="violet">Bid notes</Badge>}
      />
      <div className="rounded-2xl border border-indigo-100 bg-white/85 px-3 py-2 text-sm font-bold text-indigo-800">
        Captured for the GC proposal packet. Current estimate pricing and scope stay unchanged until saved.
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

export function EstimateProposalSectionsEditor({ draft, setDraft, disabled = false }) {
  const sections = deriveEstimateProposalSections(draft);
  const updateSection = (field, value) => {
    setDraft((current) => mergeEstimateProposalSections(current, { [field]: value }));
  };
  const updateInternalNotes = (value) => {
    setDraft((current) => mergeEstimateOfficeInternalNotes(current, value));
  };
  const visibleInternalNotes = getEstimateVisibleInternalNotes(sections.internalNotes);

  return (
    <div className="rounded-3xl border border-blue-100 bg-white p-4 shadow-sm shadow-blue-100/40">
      <SectionHeader
        title="Proposal sections"
        description="Use these sections to build a cleaner customer-facing estimate. Review pricing and scope before sending."
        action={<Badge tone="blue">Customer proposal</Badge>}
      />
      <div className="grid gap-3">
        <TextAreaField
          label="Scope of Work"
          value={sections.scopeOfWork}
          onChange={(event) => updateSection("scopeOfWork", event.target.value)}
          placeholder="Describe the work being proposed in plain customer-facing language."
          disabled={disabled}
        />
        <div className="grid gap-3 lg:grid-cols-3">
          <TextAreaField
            label="Inclusions"
            value={sections.inclusions}
            onChange={(event) => updateSection("inclusions", event.target.value)}
            placeholder="Included prep, placement, finish, cleanup, or coordination."
            className="field-input min-h-24 resize-y"
            disabled={disabled}
          />
          <TextAreaField
            label="Exclusions"
            value={sections.exclusions}
            onChange={(event) => updateSection("exclusions", event.target.value)}
            placeholder="Items not included unless added later."
            className="field-input min-h-24 resize-y"
            disabled={disabled}
          />
          <TextAreaField
            label="Assumptions / Clarifications"
            value={sections.assumptions}
            onChange={(event) => updateSection("assumptions", event.target.value)}
            placeholder="Access, weather, base conditions, schedule, or other assumptions."
            className="field-input min-h-24 resize-y"
            disabled={disabled}
          />
        </div>
        <div className="grid gap-3 xl:grid-cols-2">
          <EstimateOptionsEditor
            title="Alternates"
            description="Optional proposal choices. Optional or excluded alternates do not change the base estimate total."
            options={sections.alternates}
            onChange={(nextOptions) => updateSection("alternates", nextOptions)}
            addLabel="Add alternate"
            defaultTitle="New alternate"
            statusOptions={ESTIMATE_ALTERNATE_STATUS_OPTIONS}
            disabled={disabled}
          />
          <EstimateOptionsEditor
            title="Optional Add-ons"
            description="Add-ons can be tracked as optional, selected, included, accepted, or excluded without changing base line items."
            options={sections.addOns}
            onChange={(nextOptions) => updateSection("addOns", nextOptions)}
            addLabel="Add add-on"
            nameLabel="Name"
            defaultTitle="New add-on"
            statusOptions={ESTIMATE_ADD_ON_STATUS_OPTIONS}
            disabled={disabled}
          />
        </div>
        <TextAreaField
          label="Customer Notes / Terms"
          value={sections.customerNotes}
          onChange={(event) => updateSection("customerNotes", event.target.value)}
          placeholder="Customer-facing terms, proposal validity, payment terms, or scheduling notes."
          disabled={disabled}
        />
        <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-3">
          <TextAreaField
            label="Internal Notes (office only)"
            value={visibleInternalNotes}
            onChange={(event) => updateInternalNotes(event.target.value)}
            placeholder="Office-only sales notes. Not included in customer copy, email, or print output."
            disabled={disabled}
          />
          <p className="mt-2 text-xs font-bold leading-5 text-amber-700">Internal notes are for office use only and should not print for the customer.</p>
        </div>
      </div>
    </div>
  );
}

function EstimateRoughNotesPreviewBlock({ title, value, items }) {
  const textValue = estimateRoughNotesText(value);
  const listItems = Array.isArray(items) ? items.map((item) => estimateRoughNotesText(item)).filter(Boolean) : [];
  if (!textValue && listItems.length === 0) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">{title}</p>
      {textValue ? <p className="mt-2 whitespace-pre-line text-sm font-bold leading-6 text-slate-700">{textValue}</p> : null}
      {listItems.length > 0 ? (
        <ul className="mt-2 space-y-1 text-sm font-bold leading-6 text-slate-700">
          {listItems.map((item, index) => <li key={`${title}-${index}-${item}`}>- {item}</li>)}
        </ul>
      ) : null}
    </div>
  );
}

export function EstimateRoughNotesHelper({
  roughNotes,
  setRoughNotes,
  assistant,
  onGenerate,
  onApplyToSelected,
  onApplyToNew,
  onCreateNew,
  canApplySelected = false,
  canCreateNew = false,
  showNewEstimateActions = true,
  disabled = false,
}) {
  const loading = Boolean(assistant?.loading);
  const result = assistant?.result || null;
  const hasSuggestions = estimateRoughNotesHasSuggestions(result);
  const suggestedLineItems = hasSuggestions ? buildEstimateLineItemsFromRoughNotes(roughNotes, result) : [];
  const messageTone = result?.configured === false || assistant?.error ? "amber" : "emerald";
  const message = assistant?.error || result?.message || "";

  return (
    <div className="rounded-3xl border border-orange-100 bg-orange-50/40 p-4 shadow-sm shadow-orange-100/40">
      <SectionHeader
        title="AI Rough Notes Helper"
        description="Paste contractor notes, generate review-only proposal language, then choose what to apply to the draft. Type a new customer/company name if you do not want to pick an existing customer."
        action={<Badge tone="orange">Review only</Badge>}
      />
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
        <TextAreaField
          label="Rough contractor notes"
          value={roughNotes}
          onChange={(event) => setRoughNotes(event.target.value)}
          disabled={disabled || loading}
          className="field-input min-h-48 resize-y"
          placeholder="Example: demo old sidewalk, pour 4 inch broom finish, 300 sf, include base rock, exclude permits."
        />
        <div className="rounded-2xl border border-orange-100 bg-white p-3">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Safe assistant rules</p>
          <div className="mt-3 space-y-2 text-sm font-bold leading-6 text-slate-600">
            <p>Nothing sends, prices, or approves automatically.</p>
            <p>{showNewEstimateActions ? "Apply actions fill draft fields. Create draft now saves a new Draft estimate." : "Apply actions only fill the selected draft locally for human review."}</p>
            {showNewEstimateActions ? <p>If the estimate is brand new, enter a customer/company name instead of selecting an existing customer.</p> : null}
            <p>Pricing, final scope, and customer terms still need office review.</p>
          </div>
          <Button type="button" className="mt-4 w-full" onClick={onGenerate} disabled={disabled || loading || !estimateRoughNotesText(roughNotes)}>
            {loading ? "Generating..." : hasSuggestions ? "Regenerate Suggestions" : "Generate Suggestions"}
          </Button>
          {message ? (
            <p className={`mt-3 rounded-xl border px-3 py-2 text-xs font-black ${messageTone === "amber" ? "border-amber-100 bg-amber-50 text-amber-800" : "border-emerald-100 bg-emerald-50 text-emerald-700"}`}>
              {message}
            </p>
          ) : null}
        </div>
      </div>

      {hasSuggestions ? (
        <div className="mt-4 space-y-3">
          <div className="grid gap-3 lg:grid-cols-2">
            <EstimateRoughNotesPreviewBlock title="Suggested title" value={result.suggestedTitle} />
            <EstimateRoughNotesPreviewBlock title="Customer / company name" value={result.customerName} />
            <EstimateRoughNotesPreviewBlock title="Contact name" value={result.contactName} />
            <EstimateRoughNotesPreviewBlock title="Customer email" value={result.customerEmail} />
            <EstimateRoughNotesPreviewBlock title="Project name" value={result.projectName} />
            <EstimateRoughNotesPreviewBlock title="Job location" value={result.jobLocation} />
            <EstimateRoughNotesPreviewBlock title="Scope of work" value={result.scopeOfWork} />
            <EstimateRoughNotesPreviewBlock title="Inclusions" items={result.inclusions} />
            <EstimateRoughNotesPreviewBlock title="Exclusions" items={result.exclusions} />
            <EstimateRoughNotesPreviewBlock title="Assumptions" items={result.assumptions} />
            <EstimateRoughNotesPreviewBlock title="Schedule notes" value={result.scheduleNotes} />
            <EstimateRoughNotesPreviewBlock title="Clarifications to verify" items={result.clarificationNotes} />
            <EstimateRoughNotesPreviewBlock title="Customer notes / terms" value={result.customerNotes} />
            <EstimateRoughNotesPreviewBlock title="GC packet summary" value={result.gcProposalSummary} />
            <EstimateRoughNotesPreviewBlock title="GC cover note" value={result.gcCoverNote} />
            <EstimateRoughNotesPreviewBlock title="GC qualifications" value={result.gcQualifications} />
            <EstimateRoughNotesPreviewBlock title="Office review warnings" items={result.reviewWarnings} />
          </div>
          {suggestedLineItems.length > 0 ? (
            <div className="rounded-2xl border border-orange-100 bg-white p-3">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Suggested editable line items</p>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {suggestedLineItems.map((item, index) => (
                  <div key={`${item.description || "line"}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-sm font-black text-slate-900">{item.description || `Line item ${index + 1}`}</p>
                    <p className="mt-1 text-xs font-bold text-slate-500">{[item.quantity, item.unit].filter(Boolean).join(" ") || "Review quantity/unit"} - pricing stays blank for office review</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          {result.internalReviewNotes ? (
            <div className="rounded-2xl border border-amber-100 bg-amber-50/80 p-3">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-700">Office-only review notes</p>
              <p className="mt-2 whitespace-pre-line text-sm font-bold leading-6 text-amber-800">{result.internalReviewNotes}</p>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => onApplyToSelected?.({ includeProposal: true, includeGcPacket: true, includeReviewNotes: true })} disabled={disabled || !canApplySelected}>Apply all to selected draft</Button>
            <Button type="button" variant="secondary" onClick={() => onApplyToSelected?.({ includeProposal: true, includeGcPacket: false, includeReviewNotes: true })} disabled={disabled || !canApplySelected}>Apply proposal only</Button>
            <Button type="button" variant="secondary" onClick={() => onApplyToSelected?.({ includeProposal: false, includeGcPacket: true, includeReviewNotes: true })} disabled={disabled || !canApplySelected}>Apply GC packet only</Button>
            {showNewEstimateActions ? <Button type="button" variant="secondary" onClick={() => onApplyToNew?.({ includeProposal: true, includeGcPacket: true, includeReviewNotes: true })} disabled={disabled}>Fill New Estimate form</Button> : null}
            {showNewEstimateActions ? <Button type="button" onClick={() => onCreateNew?.({ includeProposal: true, includeGcPacket: true, includeReviewNotes: true })} disabled={disabled || !canCreateNew}>Create draft now</Button> : null}
          </div>
          <p className="text-xs font-bold leading-5 text-slate-500">
            {showNewEstimateActions
              ? "Fill New Estimate form does not save. Create draft now saves a Draft estimate, opens it, and keeps it visible in the list."
              : "Shell Rough Notes only applies suggestions to the selected draft locally. Review and save in the dedicated estimate modes."}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function sentSnapshotStatusLabel(status = "sent") {
  const labels = {
    sent: "Sent",
    printed: "Printed",
    failed: "Failed",
    draft: "Draft",
  };
  return labels[String(status || "sent").trim().toLowerCase()] || "Sent";
}

function sentSnapshotMethodLabel(method = "manual") {
  const labels = {
    email: "Email",
    print: "Print",
    manual: "Manual",
  };
  return labels[String(method || "manual").trim().toLowerCase()] || "Manual";
}

export function EstimateSentHistoryCard({ estimate, disabled = false, onRecordSnapshot, formatDateTimeValue = (value) => String(value || "") }) {
  const snapshots = deriveEstimateSentSnapshots(estimate);
  const latestSnapshot = snapshots[0] || null;
  const latestSentAt = latestSnapshot?.sentAt || latestSnapshot?.createdAt || estimate?.sentAt || "";
  const latestRecipient = latestSnapshot?.customerEmail || estimate?.sentTo || estimateCustomerEmail(estimate) || "Recipient not recorded";
  const latestMethod = latestSnapshot?.method || (estimate?.sentAt ? "email" : "manual");
  const latestStatus = latestSnapshot?.status || (estimate?.sentAt ? "sent" : "draft");
  const latestBaseTotal = latestSnapshot ? latestSnapshot.baseTotal : calculateEstimateTotals(estimate?.items, {
    taxRate: estimate?.taxRate,
    feesTotal: estimate?.feesTotal,
  }).grandTotal;
  const latestSelectedOptionsTotal = latestSnapshot ? latestSnapshot.selectedOptionsTotal : calculateEstimateOptionTotals(estimate).selectedOptionsTotal;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-100/70">
      <SectionHeader
        title="Sent Proposal History"
        description="Office-only sent records show what was shared, when, and to whom."
        action={<Badge tone="slate">Office only</Badge>}
      />
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-600">
        Sent records are office-only and do not replace the customer-facing PDF archive.
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-4">
        <StatCard title="Last sent / recorded" value={latestSentAt ? formatDateTimeValue(latestSentAt) : "Not recorded"} />
        <StatCard title="Recipient" value={latestRecipient} />
        <StatCard title="Method / status" value={`${sentSnapshotStatusLabel(latestStatus)} via ${sentSnapshotMethodLabel(latestMethod)}`} />
        <StatCard title="Base total at send" value={formatEstimateCurrency(latestBaseTotal || 0)} detail={latestSelectedOptionsTotal > 0 ? `Selected options: ${formatEstimateCurrency(latestSelectedOptionsTotal)}` : "No selected options recorded."} />
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-bold leading-5 text-slate-500">
          Use a manual snapshot when an estimate was shared outside the email button, such as printed, forwarded, or reviewed by phone.
        </p>
        <Button type="button" variant="secondary" onClick={onRecordSnapshot} disabled={disabled || typeof onRecordSnapshot !== "function"}>
          Record Sent Snapshot
        </Button>
      </div>
      {snapshots.length > 0 ? (
        <div className="mt-3 space-y-2">
          {snapshots.slice(0, 5).map((snapshot) => (
            <div key={snapshot.snapshotId || `${snapshot.createdAt}-${snapshot.customerEmail}`} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3 text-sm text-slate-600">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-black text-slate-950">{snapshot.estimateTitle || estimate?.title || "Estimate snapshot"}</p>
                  <p className="mt-1 break-words text-xs font-bold text-slate-500">
                    {snapshot.customerEmail || "Recipient not recorded"} - {snapshot.sentAt || snapshot.createdAt ? formatDateTimeValue(snapshot.sentAt || snapshot.createdAt) : "Date not recorded"}
                  </p>
                </div>
                <Badge tone={snapshot.status === "failed" ? "red" : "green"}>{sentSnapshotStatusLabel(snapshot.status)} / {sentSnapshotMethodLabel(snapshot.method)}</Badge>
              </div>
              <div className="mt-2 grid gap-2 text-xs font-bold text-slate-500 md:grid-cols-3">
                <span>Base: {formatEstimateCurrency(snapshot.baseTotal || 0)}</span>
                <span>Selected options: {formatEstimateCurrency(snapshot.selectedOptionsTotal || 0)}</span>
                <span>Status then: {estimateStatusLabel(snapshot.estimateStatusAtSend || "draft")}</span>
              </div>
              {snapshot.notes ? <p className="mt-2 text-xs font-bold text-slate-500">{snapshot.notes}</p> : null}
            </div>
          ))}
        </div>
      ) : (
        <StateCard title="No sent snapshots recorded yet" description="The latest send status is still tracked on the estimate. Use Record Sent Snapshot when office wants a simple history entry." tone="slate" />
      )}
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
          {canManage ? <Button type="button" size="sm" variant="secondary" onClick={() => onOpenTool("fenceTakeoff")}>Fence Takeoff</Button> : null}
          {canManage ? <Button type="button" size="sm" variant="secondary" onClick={() => onOpenTool("visual")}>Visual Prep</Button> : null}
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
