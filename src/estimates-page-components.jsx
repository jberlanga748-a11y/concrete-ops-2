import { lazy, useEffect, useMemo, useRef, useState } from "react";

import {
  ApexOfficeCommandShell,
  Badge,
  Button,
  Card,
  EstimateStudioShell,
  InputField,
  PageHeader,
  ProposalTotalCard,
  SectionHeader,
  SelectField,
  StatCard,
  StateCard,
  StatusBadge,
  TextAreaField,
} from "./app-shell-components";
import { DEFAULT_COMPANY_NAME } from "./brand-utils";
import { CommandCenterKpiCard, ModuleKpiStrip } from "./command-center-route-components";
import { createEmptySovRow, deriveEstimateBackup, mergeEstimateBackup } from "./estimate-backup-utils";
import {
  INITIAL_ESTIMATE_FORM,
  createEstimateDraft,
  createEstimateLineItemDraft,
  mergeEstimateRoughNotesIntoDraft,
} from "./estimate-draft-utils";
import { estimateDisplayCustomer, estimateDisplayLead, estimateDisplayTitle, estimateDisplayTotal, estimateRailProfileLine } from "./estimate-display-utils";
import { deriveEstimateGcPacketLite } from "./estimate-gc-packet-utils";
import { estimateRoughNotesHasSuggestions, estimateRoughNotesText } from "./estimate-rough-notes-utils";
import { addEstimateSentSnapshot } from "./estimate-snapshot-utils";
import {
  buildEstimateCopyText,
  buildEstimateCustomerMessage,
  buildEstimateDraftFromLead,
  calculateEstimateLineTotal,
  calculateEstimateOptionTotals,
  calculateEstimateTotals,
  deriveEstimateJobHandoffReadiness,
  deriveEstimateListState,
  deriveEstimateProposalSections,
  estimateCustomerEmail,
  estimateStatusLabel,
  filterEstimates,
  formatEstimateCurrency,
  mergeEstimateProposalSections,
  selectDefaultEstimateForReview,
} from "./estimate-utils";
import { buildEstimateVisualPreviewPacket, canRequestEstimateVisualPreview } from "./estimate-visual-preview-utils";
import { isEstimatorMobilePipelineUser } from "./estimator-mobile-utils";
import { deriveFenceTakeoffReadiness } from "./fence-takeoff-utils";
import { buildEstimateLineItemFromRateBookItem, calculateRateBookUnitPrice, deriveRateBookState } from "./rate-book-utils";
import { normalizeObjectArray } from "./report-utils";
import { CUSTOM_ESTIMATE_PACKET_THEME_ID, DEFAULT_ESTIMATE_PACKET_PRESET_ID, ESTIMATE_PACKET_SECTION_DEFS, getEstimatePacketPreset, resolveEstimatePacketSettings } from "../shared/estimatePacketPresets.js";

function lazyRouteComponent(importer, exportName) {
  return lazy(() => importer().then((module) => ({ default: module[exportName] })));
}

const EstimateBackupEditor = lazyRouteComponent(() => import("./estimates-route-components"), "EstimateBackupEditor");
const EstimateCommandRailPolished = lazyRouteComponent(() => import("./estimates-route-components"), "EstimateCommandRailPolished");
const EstimateGcPacketLiteEditor = lazyRouteComponent(() => import("./estimates-route-components"), "EstimateGcPacketLiteEditor");
const FenceTakeoffLiteEditor = lazyRouteComponent(() => import("./estimates-route-components"), "FenceTakeoffLiteEditor");
const EstimateJobHandoffReadinessCard = lazyRouteComponent(() => import("./estimates-route-components"), "EstimateJobHandoffReadinessCard");
const EstimatePacketSettingsPanel = lazyRouteComponent(() => import("./estimates-route-components"), "EstimatePacketSettingsPanel");
const EstimateRoughNotesHelper = lazyRouteComponent(() => import("./estimates-route-components"), "EstimateRoughNotesHelper");
const EstimateSentHistoryCard = lazyRouteComponent(() => import("./estimates-route-components"), "EstimateSentHistoryCard");
const EstimateProposalSectionsEditor = lazyRouteComponent(() => import("./estimates-route-components"), "EstimateProposalSectionsEditor");
const EstimateProposalWorkbench = lazyRouteComponent(() => import("./estimates-route-components"), "EstimateProposalWorkbench");
const EstimateStarterPanel = lazyRouteComponent(() => import("./estimates-route-components"), "EstimateStarterPanel");
const EstimatesTablePolished = lazyRouteComponent(() => import("./estimates-route-components"), "EstimatesTablePolished");

function useDesktopCommandViewport(minWidth = 1024) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return true;
    return window.matchMedia(`(min-width: ${minWidth}px)`).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return undefined;
    const mediaQuery = window.matchMedia(`(min-width: ${minWidth}px)`);
    const update = () => setMatches(mediaQuery.matches);
    update();
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", update);
      return () => mediaQuery.removeEventListener("change", update);
    }
    mediaQuery.addListener(update);
    return () => mediaQuery.removeListener(update);
  }, [minWidth]);

  return matches;
}

const PACKET_CUSTOMIZATION_STORAGE_PREFIX = "apex-hq-estimate-packet-default";

function packetCustomizationStorageKey(companyName = "") {
  const workspaceKey = String(companyName || "workspace")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "workspace";
  return `${PACKET_CUSTOMIZATION_STORAGE_PREFIX}:${workspaceKey}`;
}

function basePacketCustomization() {
  return {
    themeId: "safety-orange",
    customThemeName: "",
    headerColor: "",
    headerTextColor: "",
    accentColor: "",
    accentDarkColor: "",
    accentSoftColor: "",
    coverTitle: "",
    coverKicker: "",
    tagline: "",
    statementTitle: "",
    statementBody: "",
    reviewNote: "",
  };
}

function loadStoredPacketCustomization(companyName = "") {
  if (typeof window === "undefined" || !window.localStorage) return null;
  try {
    const rawValue = window.localStorage.getItem(packetCustomizationStorageKey(companyName));
    if (!rawValue) return null;
    const parsed = JSON.parse(rawValue);
    if (!parsed || typeof parsed !== "object") return null;
    return {
      presetId: parsed.presetId || "",
      sectionIds: Array.isArray(parsed.sectionIds) ? parsed.sectionIds : [],
      customization: {
        ...basePacketCustomization(),
        ...(parsed.customization || {}),
      },
    };
  } catch {
    return null;
  }
}

function storePacketCustomizationDefault(companyName = "", payload = {}) {
  if (typeof window === "undefined" || !window.localStorage) return false;
  try {
    window.localStorage.setItem(packetCustomizationStorageKey(companyName), JSON.stringify({
      version: 1,
      savedAt: new Date().toISOString(),
      ...payload,
    }));
    return true;
  } catch {
    return false;
  }
}

function companyBrandPacketCustomization(companyName = "", companyProfile = {}) {
  return {
    ...basePacketCustomization(),
    themeId: CUSTOM_ESTIMATE_PACKET_THEME_ID,
    customThemeName: companyName ? `${companyName} Brand` : "Company Brand",
    headerColor: companyProfile?.printPacketHeaderColor || "#07111f",
    headerTextColor: companyProfile?.printPacketHeaderTextColor || "#ffffff",
    accentColor: companyProfile?.printPacketAccentColor || "#f97316",
    accentDarkColor: companyProfile?.printPacketAccentDarkColor || "#9a3412",
    accentSoftColor: companyProfile?.printPacketAccentSoftColor || "#fff7ed",
  };
}

function normalizeEstimateArray(value, fallback = []) {
  return normalizeObjectArray(value, fallback).map((estimate) => ({
    ...estimate,
    items: normalizeObjectArray(estimate?.items),
  }));
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

export function EstimatesPage({
  ...props
}) {
  return <EstimatesPagePolished {...props} />;
}

export function EstimatesPagePolished({
  user,
  customers,
  leads,
  estimates,
  rateBookItems = [],
  permissions,
  busy,
  onCreateEstimate,
  onSaveEstimate,
  onConvertEstimate,
  onPrintEstimate,
  onPrintEstimateForemanHandoff,
  onSendEstimate,
  onGenerateEstimateRoughNotes,
  onSelectLead,
  onSelectCustomer,
  initialSelectedEstimateId = "",
  assistantEstimateDraftSeed = null,
  onAssistantEstimateDraftSeedHandled = () => {},
  assistantEstimatePacketSeed = null,
  onAssistantEstimatePacketSeedHandled = () => {},
  assistantEstimateJobHandoffSeed = null,
  onAssistantEstimateJobHandoffSeedHandled = () => {},
  emailSendingConfigured = false,
  companyName = DEFAULT_COMPANY_NAME,
  companyProfile = {},
  setActive,
  EstimatorMobilePipelineComponent,
}) {
  const MobilePipelinePage = EstimatorMobilePipelineComponent;
  const [statusFilter, setStatusFilter] = useState("All");
  const [customerFilter, setCustomerFilter] = useState("All customers");
  const [leadFilter, setLeadFilter] = useState("All leads");
  const [creatorFilter, setCreatorFilter] = useState("All creators");
  const [archiveFilter, setArchiveFilter] = useState("Active");
  const [search, setSearch] = useState("");
  const [selectedEstimateId, setSelectedEstimateId] = useState("");
  const [estimateViewMode, setEstimateViewMode] = useState("browse");
  const [createDraft, setCreateDraft] = useState(createEstimateDraft(INITIAL_ESTIMATE_FORM));
  const [detailDraft, setDetailDraft] = useState(createEstimateDraft(INITIAL_ESTIMATE_FORM));
  const [copyFeedback, setCopyFeedback] = useState("");
  const [packetPresetId, setPacketPresetId] = useState(DEFAULT_ESTIMATE_PACKET_PRESET_ID);
  const [packetSectionIds, setPacketSectionIds] = useState(() => getEstimatePacketPreset(DEFAULT_ESTIMATE_PACKET_PRESET_ID).sectionIds);
  const [packetCustomization, setPacketCustomization] = useState(() => loadStoredPacketCustomization(companyName)?.customization || companyBrandPacketCustomization(companyName, companyProfile));
  const [packetCustomizationNotice, setPacketCustomizationNotice] = useState("");
  const [showEstimateTools, setShowEstimateTools] = useState(false);
  const [activeEstimateTool, setActiveEstimateTool] = useState("edit");
  const [visibleEstimateRowCap, setVisibleEstimateRowCap] = useState(6);
  const [estimateShellSelectionId, setEstimateShellSelectionId] = useState("");
  const [estimateShellMode, setEstimateShellMode] = useState("overview");
  const [roughNotes, setRoughNotes] = useState("");
  const [roughNotesState, setRoughNotesState] = useState({ loading: false, result: null, error: "" });
  const newEstimateRef = useRef(null);
  const copyFeedbackTimeoutRef = useRef(null);
  const isDesktopCommandViewport = useDesktopCommandViewport(1024);

  useEffect(() => {
    const storedDefault = loadStoredPacketCustomization(companyName);
    if (!storedDefault) {
      setPacketCustomization(companyBrandPacketCustomization(companyName, companyProfile));
      setPacketCustomizationNotice("");
      return;
    }
    const storedPreset = getEstimatePacketPreset(storedDefault.presetId || DEFAULT_ESTIMATE_PACKET_PRESET_ID);
    setPacketPresetId(storedPreset.id);
    setPacketSectionIds(storedDefault.sectionIds.length > 0 ? storedDefault.sectionIds : storedPreset.sectionIds);
    setPacketCustomization(storedDefault.customization);
    setPacketCustomizationNotice("Saved packet brand loaded.");
  }, [companyName]);

  const visibleCustomers = normalizeObjectArray(customers).filter((customer) => !customer.archivedAt);
  const visibleLeads = normalizeObjectArray(leads).filter((lead) => !lead.archivedAt);
  const rows = normalizeEstimateArray(estimates);
  const filteredRows = useMemo(() => filterEstimates(rows, {
    status: statusFilter,
    customer: customerFilter,
    lead: leadFilter,
    createdBy: creatorFilter,
    archived: archiveFilter,
    search,
  }), [archiveFilter, creatorFilter, customerFilter, leadFilter, rows, search, statusFilter]);
  const listState = useMemo(() => deriveEstimateListState(filteredRows, visibleCustomers, visibleLeads), [filteredRows, visibleCustomers, visibleLeads]);
  const defaultEstimateForReview = useMemo(() => selectDefaultEstimateForReview(filteredRows, rows), [filteredRows, rows]);
  const selectedEstimate = estimateViewMode === "create"
    ? null
    : filteredRows.find((estimate) => estimate?.id === selectedEstimateId)
      || defaultEstimateForReview
      || rows.find((estimate) => estimate?.id === selectedEstimateId)
      || null;
  const canManage = Boolean(permissions?.estimates?.canManage);
  const canUseAiRoughNotes = Boolean(permissions?.estimates?.canUseAiRoughNotes);
  const canUseGcPackets = Boolean(permissions?.estimates?.canUseGcPackets);
  const canUseEstimatesCommandShell = Boolean(permissions?.estimates?.canView && isDesktopCommandViewport);
  const companyPrimaryTrade = companyProfile?.primaryTrade || "general-contractor";
  const singleCustomerId = visibleCustomers.length === 1 ? visibleCustomers[0].id : "";
  const singleCustomerName = visibleCustomers.length === 1 ? visibleCustomers[0].name || "" : "";
  const singleCustomerEmail = singleCustomerId ? visibleCustomers.find((customer) => customer.id === singleCustomerId)?.email || "" : "";
  const createTotals = useMemo(() => calculateEstimateTotals(createDraft.items, { taxRate: createDraft.taxRate, feesTotal: createDraft.feesTotal }), [createDraft.feesTotal, createDraft.items, createDraft.taxRate]);
  const detailTotals = useMemo(() => calculateEstimateTotals(detailDraft.items, { taxRate: detailDraft.taxRate, feesTotal: detailDraft.feesTotal }), [detailDraft.feesTotal, detailDraft.items, detailDraft.taxRate]);
  const createOptionTotals = useMemo(() => calculateEstimateOptionTotals(createDraft), [createDraft]);
  const detailOptionTotals = useMemo(() => calculateEstimateOptionTotals(detailDraft), [detailDraft]);
  const activeRateBookDefaults = useMemo(
    () => deriveRateBookState(rateBookItems).activeItems.slice(0, 5),
    [rateBookItems],
  );
  const detailCustomer = useMemo(
    () => visibleCustomers.find((customer) => customer.id === detailDraft.customerId) || selectedEstimate?.customer || null,
    [detailDraft.customerId, selectedEstimate?.customer, visibleCustomers],
  );
  const detailLead = useMemo(
    () => visibleLeads.find((lead) => lead.id === detailDraft.leadId) || selectedEstimate?.lead || null,
    [detailDraft.leadId, selectedEstimate?.lead, visibleLeads],
  );
  const estimatePrimaryTrade = detailDraft.trade || detailLead?.trade || selectedEstimate?.lead?.trade || createDraft.trade || companyPrimaryTrade;
  const detailEstimatePreview = useMemo(() => {
    if (!selectedEstimate) return null;
    return {
      ...selectedEstimate,
      ...detailDraft,
      items: Array.isArray(detailDraft.items) ? detailDraft.items : [],
      customer: detailCustomer || (detailLead?.customer ? { name: detailLead.customer } : null),
      lead: detailLead,
    };
  }, [detailCustomer, detailDraft, detailLead, selectedEstimate]);
  const detailEstimateCustomerEmail = useMemo(() => estimateCustomerEmail(detailEstimatePreview), [detailEstimatePreview]);
  const detailProposalSections = useMemo(
    () => deriveEstimateProposalSections(detailEstimatePreview || detailDraft),
    [detailDraft, detailEstimatePreview],
  );
  const detailEstimateBackup = useMemo(
    () => deriveEstimateBackup(detailEstimatePreview || detailDraft),
    [detailDraft, detailEstimatePreview],
  );
  const detailGcPacketLite = useMemo(
    () => deriveEstimateGcPacketLite(detailEstimatePreview || detailDraft),
    [detailDraft, detailEstimatePreview],
  );
  const detailGcPacketReadyCount = [
    detailGcPacketLite.proposalCoverNote,
    detailGcPacketLite.proposalSummary,
    detailGcPacketLite.qualifications,
    detailGcPacketLite.scheduleNotes,
    detailGcPacketLite.addendaRfiReferences,
    detailGcPacketLite.gcReviewNotes,
    detailGcPacketLite.internalPacketNotes,
  ].filter((value) => String(value || "").trim()).length;
  const detailGcPacketTotalCount = 7;
  const visualPreviewPacket = useMemo(
    () => buildEstimateVisualPreviewPacket({
      estimate: detailEstimatePreview || detailDraft,
      backup: detailEstimateBackup,
      companySettings: companyProfile,
    }),
    [companyProfile, detailDraft, detailEstimateBackup, detailEstimatePreview],
  );
  const detailFenceTakeoffReadiness = useMemo(
    () => deriveFenceTakeoffReadiness(detailEstimateBackup.fenceTakeoff),
    [detailEstimateBackup.fenceTakeoff],
  );
  const detailEstimateHandoffReadiness = useMemo(
    () => deriveEstimateJobHandoffReadiness(detailEstimatePreview || detailDraft),
    [detailDraft, detailEstimatePreview],
  );
  const detailSaveDisabled = busy || (!detailDraft.customerId && !detailDraft.leadId) || !detailDraft.title;
  const canMarkSent = canManage && detailDraft.status === "draft";
  const packetPrintSettings = useMemo(() => resolveEstimatePacketSettings({
    presetId: packetPresetId,
    sectionIds: packetSectionIds,
    customization: packetCustomization,
    allowInternalSections: canManage && canUseGcPackets,
  }), [canManage, canUseGcPackets, packetCustomization, packetPresetId, packetSectionIds]);
  const estimateKpis = [
    { label: "Estimates", value: filteredRows.length, helper: "Matching current filters", icon: "quote", tone: "blue", actionLabel: "View estimates", onAction: () => setStatusFilter("All") },
    { label: "Drafts", value: filteredRows.filter((estimate) => estimate.status === "draft").length, helper: "Need pricing or review", icon: "document", tone: "orange", actionLabel: "View drafts", onAction: () => setStatusFilter("Draft") },
    { label: "Sent", value: filteredRows.filter((estimate) => estimate.status === "sent").length, helper: "Waiting on customer", icon: "arrowUpRight", tone: "amber", actionLabel: "View sent", onAction: () => setStatusFilter("Sent") },
    { label: "Approved", value: filteredRows.filter((estimate) => estimate.status === "approved").length, helper: "Ready to convert", icon: "check", tone: "green", actionLabel: "View approved", onAction: () => setStatusFilter("Approved") },
    { label: "Converted", value: filteredRows.filter((estimate) => estimate.jobId).length, helper: "Moved into jobs", icon: "briefcase", tone: "slate", actionLabel: "Review jobs", onAction: () => setStatusFilter("All") },
  ];
  const estimateToolTabs = [
    { id: "create", label: "New Estimate", count: canManage ? 1 : 0 },
    canUseAiRoughNotes ? { id: "roughNotes", label: "AI Notes", count: estimateRoughNotesHasSuggestions(roughNotesState.result) ? 1 : 0 } : null,
    { id: "edit", label: "Edit / Pricing", count: selectedEstimate ? 1 : 0 },
    canManage ? { id: "fenceTakeoff", label: "Fence Takeoff", count: detailEstimateBackup.fenceTakeoff?.segments?.length || 0 } : null,
    canManage ? { id: "visual", label: "Visual Preview", count: canRequestEstimateVisualPreview(visualPreviewPacket) ? 1 : 0 } : null,
    { id: "sections", label: "Sections", count: detailDraft.items?.length || 0 },
    { id: "backup", label: "SOV / Backup", count: 1 },
    canUseGcPackets ? { id: "packet", label: "Packet", count: packetSectionIds.length } : null,
  ].filter(Boolean);
  const estimateStudioOptionRows = selectedEstimate
    ? [selectedEstimate, ...filteredRows.filter((estimate) => estimate.id !== selectedEstimate.id)].slice(0, 5)
    : filteredRows.slice(0, 5);
  const estimateStudioOptions = estimateStudioOptionRows.map((estimate) => ({
    id: estimate.id,
    title: estimateDisplayTitle(estimate),
    meta: estimateDisplayCustomer(estimate),
    status: formatEstimateCurrency(estimateDisplayTotal(estimate)),
    tone: estimate.status === "approved" || estimate.jobId ? "green" : estimate.status === "sent" ? "blue" : estimate.status === "rejected" ? "red" : "orange",
    actionLabel: estimateStatusLabel(estimate.status),
  }));
  const estimatePacketTiles = [
    { label: "Branded Cover", icon: "document", onClick: () => openEstimateTool("packet"), disabled: !selectedEstimate },
    { label: "Scope", icon: "clipboard", onClick: () => openEstimateTool("sections"), disabled: !selectedEstimate },
    { label: "Line Items", icon: "document", onClick: () => openEstimateTool("edit"), disabled: !selectedEstimate },
    { label: "Fence Takeoff", icon: "layers", onClick: () => openEstimateTool("fenceTakeoff"), disabled: !selectedEstimate || !canManage },
    { label: "Visual Preview", icon: "photo", onClick: () => openEstimateTool("visual"), disabled: !selectedEstimate || !canManage },
    { label: "Exclusions", icon: "alert", onClick: () => openEstimateTool("sections"), disabled: !selectedEstimate },
    { label: "Photo Backup", icon: "clipboard", onClick: () => openEstimateTool("backup"), disabled: !selectedEstimate },
    { label: "Price Summary", icon: "briefcase", onClick: () => openEstimateTool("packet"), disabled: !selectedEstimate },
    { label: "Field Handoff", icon: "users", onClick: () => openEstimateTool("packet"), disabled: !selectedEstimate || !canUseGcPackets },
  ];
  const estimateAssistantActions = [
    canUseAiRoughNotes ? { label: "Turn rough notes into packet", icon: "spark", onClick: () => openEstimateTool("roughNotes") } : null,
    { label: "Build fence takeoff", icon: "layers", onClick: () => openEstimateTool("fenceTakeoff"), disabled: !selectedEstimate || !canManage },
    { label: "Prepare visual preview", icon: "photo", onClick: () => openEstimateTool("visual"), disabled: !selectedEstimate || !canManage },
    { label: "Review missing scope", icon: "clipboard", onClick: () => openEstimateTool("sections"), disabled: !selectedEstimate },
    { label: "Create foreman handoff", icon: "users", onClick: () => openEstimateTool("packet"), disabled: !selectedEstimate || !canUseGcPackets },
  ].filter(Boolean);

  function linkedEstimateCustomerEmail(draft = {}) {
    const customer = visibleCustomers.find((entry) => entry.id === draft.customerId) || null;
    const lead = visibleLeads.find((entry) => entry.id === draft.leadId) || null;
    return estimateCustomerEmail({ customer, lead });
  }

  function updateDraftLinkFields(current, nextLinks) {
    const previousLinkedEmail = linkedEstimateCustomerEmail(current);
    const nextDraft = { ...current, ...nextLinks };
    const nextCustomer = visibleCustomers.find((entry) => entry.id === nextDraft.customerId) || null;
    const nextLead = visibleLeads.find((entry) => entry.id === nextDraft.leadId) || null;
    const nextLinkedEmail = linkedEstimateCustomerEmail(nextDraft);
    const shouldPrefill = !current.customerEmail || current.customerEmail === previousLinkedEmail;
    const nextCustomerName = typeof nextLinks.customerName === "string" ? nextLinks.customerName : current.customerName;
    return {
      ...nextDraft,
      customerEmail: shouldPrefill && nextLinkedEmail ? nextLinkedEmail : current.customerEmail,
      customerName: nextDraft.customerId && nextCustomer
        ? nextCustomer.name || nextCustomerName
        : nextDraft.leadId && nextLead
          ? nextLead.customer || nextCustomerName
          : nextCustomerName,
    };
  }

  function updateDraftLinkEmail(current, nextLinks) {
    return updateDraftLinkFields(current, nextLinks);
  }

  useEffect(() => {
    if (initialSelectedEstimateId && rows.some((estimate) => estimate?.id === initialSelectedEstimateId)) {
      setEstimateViewMode("browse");
      setSelectedEstimateId(initialSelectedEstimateId);
    }
  }, [initialSelectedEstimateId, rows]);

  useEffect(() => {
    const seed = assistantEstimatePacketSeed;
    if (!seed?.nonce || !canUseGcPackets) return;

    const targetEstimateId = seed.estimateId && rows.some((estimate) => estimate?.id === seed.estimateId)
      ? seed.estimateId
      : rows[0]?.id || "";
    setEstimateViewMode("browse");
    if (targetEstimateId) setSelectedEstimateId(targetEstimateId);
    setStatusFilter("All");
    setCustomerFilter("All customers");
    setLeadFilter("All leads");
    setCreatorFilter("All creators");
    setArchiveFilter("Active");
    setSearch("");
    setActiveEstimateTool("packet");
    setShowEstimateTools(true);
    showCopyFeedback(
      targetEstimateId
        ? "Assistant opened GC packet tools for review. Nothing was sent, printed, or approved automatically."
        : "Assistant opened Estimates. Choose an estimate, then review the packet tools manually.",
      7000,
    );
    window.setTimeout(() => newEstimateRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" }), 0);
    onAssistantEstimatePacketSeedHandled(seed.nonce);
  }, [assistantEstimatePacketSeed?.nonce, canUseGcPackets, rows]);

  useEffect(() => {
    const seed = assistantEstimateJobHandoffSeed;
    if (!seed?.nonce || !canManage) return;

    const targetEstimateId = seed.estimateId && rows.some((estimate) => estimate?.id === seed.estimateId)
      ? seed.estimateId
      : rows.find((estimate) => estimate?.status === "approved" && !estimate?.jobId)?.id || rows[0]?.id || "";
    setEstimateViewMode("browse");
    if (targetEstimateId) setSelectedEstimateId(targetEstimateId);
    setStatusFilter(targetEstimateId ? "All" : "Approved");
    setCustomerFilter("All customers");
    setLeadFilter("All leads");
    setCreatorFilter("All creators");
    setArchiveFilter("Active");
    setSearch("");
    setActiveEstimateTool("backup");
    setShowEstimateTools(true);
    showCopyFeedback(
      targetEstimateId
        ? "Assistant opened the estimate-to-job handoff review. No job was created, scheduled, assigned, or messaged automatically."
        : "Assistant opened Estimates. Choose an approved estimate before converting anything to a job.",
      8000,
    );
    window.setTimeout(() => newEstimateRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" }), 0);
    onAssistantEstimateJobHandoffSeedHandled(seed.nonce);
  }, [assistantEstimateJobHandoffSeed?.nonce, canManage, rows]);

  useEffect(() => {
    const seed = assistantEstimateDraftSeed;
    if (!seed?.nonce || !canManage) return;

    const seedLead = seed.leadId ? visibleLeads.find((lead) => lead.id === seed.leadId) || null : null;
    const seedCustomer = seed.customerId ? visibleCustomers.find((customer) => customer.id === seed.customerId) || null : null;
    const leadDraft = seedLead ? buildEstimateDraftFromLead(seedLead, { customers: visibleCustomers }) : {};
    const customerName = estimateRoughNotesText(seed.customerName)
      || estimateRoughNotesText(seedCustomer?.name)
      || estimateRoughNotesText(leadDraft.customerName)
      || "Draft Customer";
    const title = estimateRoughNotesText(seed.projectName)
      || estimateRoughNotesText(leadDraft.title)
      || `${customerName} estimate`;
    const roughNotesText = estimateRoughNotesText(seed.roughNotes) || estimateRoughNotesText(seed.commandText);
    const nextDraft = createEstimateDraft({
      ...INITIAL_ESTIMATE_FORM,
      ...leadDraft,
      customerId: seed.customerId || leadDraft.customerId || seedCustomer?.id || "",
      leadId: seed.leadId || leadDraft.leadId || "",
      customerName,
      customerEmail: seed.customerEmail || leadDraft.customerEmail || seedCustomer?.email || "",
      title,
      status: "draft",
    });

    setCreateDraft(nextDraft);
    setRoughNotes(roughNotesText);
    setRoughNotesState({ loading: false, result: null, error: "" });
    setEstimateViewMode("create");
    setSelectedEstimateId("");
    setStatusFilter("Draft");
    setCustomerFilter("All customers");
    setLeadFilter("All leads");
    setCreatorFilter("All creators");
    setArchiveFilter("Active");
    setSearch("");
    setActiveEstimateTool(canUseAiRoughNotes && roughNotesText ? "roughNotes" : "create");
    setShowEstimateTools(true);
    showCopyFeedback(
      canUseAiRoughNotes && roughNotesText
        ? "Assistant started a clean estimate draft. Review the rough notes, generate suggestions, then create the Draft when ready."
        : "Assistant started a clean estimate draft. Review and save it when ready.",
      8000,
    );
    window.setTimeout(() => newEstimateRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" }), 0);
    onAssistantEstimateDraftSeedHandled(seed.nonce);
  }, [assistantEstimateDraftSeed?.nonce]);

  useEffect(() => {
    if (estimateViewMode !== "browse") return;
    if (!selectedEstimateId && defaultEstimateForReview?.id) {
      setSelectedEstimateId(defaultEstimateForReview.id);
    }
  }, [defaultEstimateForReview?.id, estimateViewMode, selectedEstimateId]);

  useEffect(() => {
    if (singleCustomerId && !createDraft.customerId && !createDraft.leadId && !createDraft.customerName) {
      setCreateDraft((current) => ({
        ...current,
        customerId: singleCustomerId,
        customerName: current.customerName || singleCustomerName,
        customerEmail: current.customerEmail || singleCustomerEmail,
      }));
    }
  }, [createDraft.customerId, createDraft.customerName, createDraft.leadId, singleCustomerEmail, singleCustomerId, singleCustomerName]);

  useEffect(() => {
    setDetailDraft(createEstimateDraft(selectedEstimate || INITIAL_ESTIMATE_FORM));
  }, [selectedEstimate?.id, selectedEstimate?.updatedAt]);

  useEffect(() => () => {
    if (copyFeedbackTimeoutRef.current) {
      window.clearTimeout(copyFeedbackTimeoutRef.current);
    }
  }, []);

  function updateDraftItem(setDraft, index, field, value) {
    setDraft((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item),
    }));
  }

  function appendDraftItem(setDraft) {
    setDraft((current) => ({
      ...current,
      items: [...current.items, createEstimateLineItemDraft()],
    }));
  }

  function removeDraftItem(setDraft, index) {
    setDraft((current) => {
      const nextItems = current.items.filter((_, itemIndex) => itemIndex !== index);
      return {
        ...current,
        items: nextItems.length > 0 ? nextItems : [createEstimateLineItemDraft()],
      };
    });
  }

  function appendRateBookDefaultToDetail(item) {
    const estimateLine = createEstimateLineItemDraft(buildEstimateLineItemFromRateBookItem(item));
    setDetailDraft((current) => ({
      ...current,
      items: [
        ...current.items.filter((lineItem) => lineItem.description || lineItem.unitPrice),
        estimateLine,
      ],
    }));
    showCopyFeedback("Rate book default added locally. Review and save pricing when ready.", 4000);
  }

  function showCopyFeedback(message, duration = 1800) {
    if (copyFeedbackTimeoutRef.current) {
      window.clearTimeout(copyFeedbackTimeoutRef.current);
    }
    setCopyFeedback(message);
    copyFeedbackTimeoutRef.current = window.setTimeout(() => {
      setCopyFeedback("");
      copyFeedbackTimeoutRef.current = null;
    }, duration);
  }

  async function copyEstimateText(buildText, successMessage) {
    const text = buildText();
    if (!text || !navigator?.clipboard?.writeText) {
      showCopyFeedback("Clipboard unavailable on this browser.");
      return false;
    }

    try {
      await navigator.clipboard.writeText(text);
      showCopyFeedback(successMessage);
      return true;
    } catch {
      showCopyFeedback("Clipboard unavailable on this browser.");
      return false;
    }
  }

  function handleApplyCompanyPacketBrand() {
    setPacketCustomization((current) => ({
      ...current,
      ...companyBrandPacketCustomization(companyName, companyProfile),
    }));
    setPacketCustomizationNotice("Company brand applied to this packet.");
  }

  function handleSavePacketCustomizationDefault() {
    const saved = storePacketCustomizationDefault(companyName, {
      presetId: packetPresetId,
      sectionIds: packetSectionIds,
      customization: packetCustomization,
    });
    setPacketCustomizationNotice(saved ? "Packet brand default saved for this workspace." : "Could not save packet brand default in this browser.");
  }

  function handleApplyPacketCustomizationDefault() {
    const storedDefault = loadStoredPacketCustomization(companyName);
    if (!storedDefault) {
      setPacketCustomizationNotice("No saved packet brand default found for this workspace.");
      return;
    }
    const storedPreset = getEstimatePacketPreset(storedDefault.presetId || packetPresetId);
    setPacketPresetId(storedPreset.id);
    setPacketSectionIds(storedDefault.sectionIds.length > 0 ? storedDefault.sectionIds : storedPreset.sectionIds);
    setPacketCustomization(storedDefault.customization);
    setPacketCustomizationNotice("Saved packet brand default applied.");
  }

  function focusNewEstimate() {
    setEstimateViewMode("create");
    setSelectedEstimateId("");
    setCreateDraft(createEstimateDraft({
      ...INITIAL_ESTIMATE_FORM,
      customerId: singleCustomerId,
      customerName: singleCustomerName,
      customerEmail: singleCustomerEmail,
    }));
    setActiveEstimateTool("create");
    setShowEstimateTools(true);
    window.setTimeout(() => newEstimateRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" }), 0);
  }

  function openEstimateTool(toolId = "edit") {
    if (toolId === "roughNotes" && !canUseAiRoughNotes) return;
    if (toolId === "packet" && !canUseGcPackets) return;
    if (toolId !== "create" && estimateViewMode !== "create") {
      setEstimateViewMode("browse");
    }
    setActiveEstimateTool(toolId);
    setShowEstimateTools(true);
    window.setTimeout(() => newEstimateRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" }), 0);
  }

  async function handleGenerateEstimateRoughNotes() {
    if (!canUseAiRoughNotes) return false;
    if (!estimateRoughNotesText(roughNotes) || typeof onGenerateEstimateRoughNotes !== "function") return false;
    setRoughNotesState({ loading: true, result: null, error: "" });
    try {
      const result = await onGenerateEstimateRoughNotes({
        roughNotes,
        estimateId: selectedEstimate?.id || "",
        estimateDraft: selectedEstimate ? (detailEstimatePreview || detailDraft) : createDraft,
      });
      setRoughNotesState({
        loading: false,
        result,
        error: result?.ok === false || result?.configured === false ? result?.message || "AI rough notes suggestions are unavailable right now." : "",
      });
      return Boolean(result?.ok);
    } catch (error) {
      setRoughNotesState({
        loading: false,
        result: null,
        error: error?.message || "AI rough notes suggestions are unavailable right now.",
      });
      return false;
    }
  }

  function applyRoughNotesToSelected(options = {}) {
    if (!selectedEstimate || !estimateRoughNotesHasSuggestions(roughNotesState.result)) return;
    setDetailDraft((current) => mergeEstimateRoughNotesIntoDraft(current, roughNotesState.result, options, roughNotes));
    setActiveEstimateTool(options.includeGcPacket && !options.includeProposal ? "backup" : "sections");
    showCopyFeedback("AI suggestions applied to the selected draft. Review and save when ready.", 4000);
  }

  function buildRoughNotesNewEstimateDraft(options = {}) {
    const sourceDraft = createDraft;
    const baseDraft = createEstimateDraft({
      ...INITIAL_ESTIMATE_FORM,
      customerId: sourceDraft.customerId || singleCustomerId,
      customerName: sourceDraft.customerName || singleCustomerName,
      leadId: sourceDraft.leadId || "",
      customerEmail: sourceDraft.customerEmail || linkedEstimateCustomerEmail(sourceDraft) || singleCustomerEmail,
      status: "draft",
    });
    return mergeEstimateRoughNotesIntoDraft(baseDraft, roughNotesState.result, options, roughNotes);
  }

  function applyRoughNotesToNewEstimate(options = {}) {
    if (!estimateRoughNotesHasSuggestions(roughNotesState.result)) return;
    const nextDraft = buildRoughNotesNewEstimateDraft(options);
    setCreateDraft(nextDraft);
    setEstimateViewMode("create");
    setSelectedEstimateId("");
    setActiveEstimateTool("create");
    setShowEstimateTools(true);
    showCopyFeedback("New Estimate form filled from AI notes. It is not saved yet. Click Create New Estimate to save it.", 6000);
  }

  async function createRoughNotesEstimateDraft(options = {}) {
    if (!estimateRoughNotesHasSuggestions(roughNotesState.result) || typeof onCreateEstimate !== "function") return false;
    const nextDraft = buildRoughNotesNewEstimateDraft(options);
    const fallbackDraft = {
      ...nextDraft,
      customerName: estimateRoughNotesText(nextDraft.customerName) || "Draft Customer",
      title: estimateRoughNotesText(nextDraft.title) || "Draft Estimate",
    };
    if (!nextDraft.customerId && !nextDraft.leadId && !nextDraft.customerName) {
      setCreateDraft(fallbackDraft);
    }
    if (!nextDraft.title) {
      setCreateDraft(fallbackDraft);
    }

    const created = await onCreateEstimate({
      ...fallbackDraft,
      status: "draft",
    });
    if (created) {
      const createdId = typeof created === "object" ? created.id : "";
      const createdTitle = typeof created === "object" ? (created.title || fallbackDraft.title) : fallbackDraft.title;
      setEstimateViewMode("browse");
      setStatusFilter("Draft");
      setCustomerFilter("All customers");
      setLeadFilter("All leads");
      setCreatorFilter("All creators");
      setArchiveFilter("Active");
      setSearch("");
      if (createdId) setSelectedEstimateId(createdId);
      setActiveEstimateTool("edit");
      setShowEstimateTools(true);
      setCreateDraft(createEstimateDraft({
        ...INITIAL_ESTIMATE_FORM,
        customerId: singleCustomerId,
        customerName: singleCustomerName,
        customerEmail: singleCustomerEmail,
      }));
      showCopyFeedback(`Draft created: ${createdTitle}. It is selected in the Estimates list.`, 7000);
    }
    return created;
  }

  async function handleSendEstimate() {
    if (!detailEstimatePreview) return false;
    if (!emailSendingConfigured) {
      return copyEstimateText(
        () => buildEstimateCustomerMessage({ companyName, companyProfile, estimate: detailEstimatePreview }),
        "Manual send mode: customer message copied. Paste it into your email or text app, then mark sent.",
      );
    }
    if (!detailEstimateCustomerEmail) {
      showCopyFeedback("Add a customer email before sending this estimate.");
      return false;
    }
    if (typeof onSendEstimate !== "function") {
      showCopyFeedback("Email sending is not available right now.");
      return false;
    }

    const reviewConfirmed = window.confirm(
      "Send this customer proposal now? Confirm you reviewed the recipient, scope, total, attachments, exclusions, and terms.",
    );
    if (!reviewConfirmed) {
      showCopyFeedback("Send cancelled. No email was sent.");
      return false;
    }

    const result = await onSendEstimate(detailEstimatePreview.id, { reviewConfirmed: true });
    if (result?.sentTo) {
      showCopyFeedback(`Estimate sent to ${result.sentTo}.`);
    }
    return true;
  }

  async function handleRecordSentSnapshot() {
    if (!selectedEstimate?.id || !detailEstimatePreview || typeof onSaveEstimate !== "function") return false;
    const withSnapshot = addEstimateSentSnapshot(detailEstimatePreview, {
      method: "manual",
      status: "sent",
      notes: "Manual office snapshot recorded. No email was sent by this action.",
    });
    const nextDraft = createEstimateDraft({
      ...detailDraft,
      internalNotes: withSnapshot.internalNotes,
    });
    const saved = await onSaveEstimate(selectedEstimate.id, nextDraft);
    if (saved) {
      setDetailDraft(nextDraft);
      showCopyFeedback("Sent snapshot recorded for office history.");
    }
    return saved;
  }

  async function handleConvertApprovedEstimate() {
    if (!selectedEstimate?.id || typeof onConvertEstimate !== "function") return false;
    const converted = await onConvertEstimate(selectedEstimate.id);
    if (converted) {
      showCopyFeedback("Job created. Next step: schedule the job and assign foreman/crew.", 5000);
    }
    return converted;
  }

  function estimateShellReadiness(estimate = {}) {
    const sections = deriveEstimateProposalSections(estimate);
    const backup = deriveEstimateBackup(estimate);
    const gcPacketLite = deriveEstimateGcPacketLite(estimate);
    const totals = calculateEstimateTotals(estimate?.items, {
      taxRate: estimate?.taxRate,
      feesTotal: estimate?.feesTotal,
    });
    const optionTotals = calculateEstimateOptionTotals(estimate);
    const hasLineItems = Array.isArray(estimate?.items) && estimate.items.some((item) => item?.description || item?.unitPrice);
    const hasPricing = hasLineItems && totals.grandTotal > 0;
    const hasScope = Boolean(String(sections.scopeOfWork || estimate?.scopeSummary || "").trim());
    const hasContact = Boolean(estimateCustomerEmail(estimate));
    const hasCustomer = Boolean(estimate?.customer?.name || estimate?.customerName || estimate?.lead?.customer || estimate?.customerId);
    const hasBackup = Boolean(
      String(backup.notes || "").trim()
      || (Array.isArray(backup.sovRows) && backup.sovRows.length)
      || (Array.isArray(backup.takeoffRows) && backup.takeoffRows.length)
      || (Array.isArray(backup.referenceRows) && backup.referenceRows.length)
      || (Array.isArray(backup.fenceTakeoff?.segments) && backup.fenceTakeoff.segments.length)
    );
    const hasPacketNotes = Boolean(
      String(gcPacketLite.proposalSummary || "").trim()
      || String(gcPacketLite.proposalCoverNote || "").trim()
      || String(gcPacketLite.qualifications || "").trim()
      || String(gcPacketLite.scheduleNotes || "").trim()
    );
    const status = String(estimate?.status || "draft").trim().toLowerCase();
    const readyToSend = status === "draft" && hasCustomer && hasContact && hasScope && hasPricing;
    const approvedHandoff = status === "approved" && !estimate?.jobId;
    const packetReady = hasScope && hasPricing && (hasBackup || hasPacketNotes || !canUseGcPackets);
    const missing = [
      hasCustomer ? "" : "customer",
      hasContact ? "" : "contact",
      hasScope ? "" : "scope",
      hasPricing ? "" : "pricing",
      packetReady ? "" : "packet backup",
    ].filter(Boolean);

    return {
      totals,
      optionTotals,
      hasCustomer,
      hasContact,
      hasScope,
      hasPricing,
      hasBackup,
      hasPacketNotes,
      packetReady,
      readyToSend,
      approvedHandoff,
      missing,
    };
  }

  const estimateShellRows = useMemo(() => rows.filter((estimate) => !estimate?.archivedAt), [rows]);
  const estimateShellStateById = useMemo(() => {
    const map = new Map();
    estimateShellRows.forEach((estimate) => {
      if (estimate?.id) map.set(estimate.id, estimateShellReadiness(estimate));
    });
    return map;
  }, [estimateShellRows, canUseGcPackets]);
  const draftToPriceRows = estimateShellRows.filter((estimate) => {
    const status = String(estimate?.status || "draft").trim().toLowerCase();
    return status === "draft" && !estimateShellStateById.get(estimate.id)?.hasPricing;
  });
  const readyToSendRows = estimateShellRows.filter((estimate) => estimateShellStateById.get(estimate.id)?.readyToSend);
  const sentToWinRows = estimateShellRows.filter((estimate) => String(estimate?.status || "").trim().toLowerCase() === "sent" && !estimate?.jobId);
  const approvedHandoffRows = estimateShellRows.filter((estimate) => estimateShellStateById.get(estimate.id)?.approvedHandoff);

  function selectEstimateShellEstimate(estimate, nextMode = "overview") {
    if (!estimate?.id) return;
    setEstimateViewMode("browse");
    setSelectedEstimateId(estimate.id);
    setEstimateShellSelectionId(`estimate-${estimate.id}`);
    setEstimateShellMode(nextMode);
  }

  function openFullEstimateToolsPlaceholder(toolLabel = "full estimate tools") {
    setShowEstimateTools(false);
    showCopyFeedback(`The ${toolLabel} shell mode is read-only in Slice 2A. Use the existing full estimate tools path for real edits; no estimate was changed, sent, priced, or converted.`, 7000);
  }

  const estimateShellKpis = [
    {
      id: "drafts-to-price",
      label: "Drafts To Price",
      value: draftToPriceRows.length,
      helper: `${estimateShellRows.filter((estimate) => String(estimate?.status || "draft").trim().toLowerCase() === "draft").length} open draft${estimateShellRows.filter((estimate) => String(estimate?.status || "draft").trim().toLowerCase() === "draft").length === 1 ? "" : "s"}`,
      icon: "document",
      tone: draftToPriceRows.length ? "orange" : "green",
      onClick: () => selectEstimateShellEstimate(draftToPriceRows[0]),
    },
    {
      id: "ready-to-send",
      label: "Ready To Send",
      value: readyToSendRows.length,
      helper: "Priced drafts with scope and contact",
      icon: "arrowUpRight",
      tone: readyToSendRows.length ? "blue" : "slate",
      onClick: () => selectEstimateShellEstimate(readyToSendRows[0]),
    },
    {
      id: "sent-to-win",
      label: "Sent To Win",
      value: sentToWinRows.length,
      helper: "Customer proposals waiting",
      icon: "quote",
      tone: sentToWinRows.length ? "amber" : "slate",
      onClick: () => selectEstimateShellEstimate(sentToWinRows[0]),
    },
    {
      id: "approved-handoff",
      label: "Approved Handoff",
      value: approvedHandoffRows.length,
      helper: "Approved, not converted",
      icon: "check",
      tone: approvedHandoffRows.length ? "green" : "slate",
      onClick: () => selectEstimateShellEstimate(approvedHandoffRows[0]),
    },
  ];

  function buildEstimateShellItem(estimate, kind = "estimate", priority = 100) {
    if (!estimate?.id) return null;
    const readiness = estimateShellStateById.get(estimate.id) || estimateShellReadiness(estimate);
    const status = String(estimate?.status || "draft").trim().toLowerCase();
    const tone = kind === "approved"
      ? "green"
      : kind === "ready"
        ? "blue"
        : kind === "sent"
          ? "amber"
          : readiness.missing.length
            ? "orange"
            : "slate";
    const kindLabel = kind === "approved"
      ? "Approved handoff"
      : kind === "ready"
        ? "Ready to send"
        : kind === "sent"
          ? "Sent to win"
          : kind === "packet"
            ? "Packet gap"
            : kind === "draft"
              ? "Draft to price"
              : "Estimate";

    return {
      id: `estimate-${estimate.id}`,
      kind,
      priority,
      estimate,
      eyebrow: kindLabel,
      title: estimateDisplayTitle(estimate),
      meta: [estimateDisplayCustomer(estimate), estimateDisplayLead(estimate)].filter(Boolean).join(" / "),
      statusLabel: readiness.missing.length ? `Needs ${readiness.missing.slice(0, 2).join(" / ")}` : estimateStatusLabel(status),
      tone,
      actionLabel: readiness.missing.length ? "Review gaps" : "Review",
      badges: [
        { label: estimateStatusLabel(status), tone: status === "approved" ? "green" : status === "sent" ? "blue" : "slate" },
        { label: readiness.hasPricing ? formatEstimateCurrency(readiness.optionTotals.totalWithSelectedOptions) : "Pricing gap", tone: readiness.hasPricing ? "green" : "amber" },
        { label: readiness.hasContact ? "Contact set" : "Contact gap", tone: readiness.hasContact ? "green" : "amber" },
      ],
    };
  }

  const estimateShellQueue = useMemo(() => {
    const items = [];
    const seenEstimateIds = new Set();

    function addEstimate(estimate, kind, priority) {
      if (!estimate?.id || seenEstimateIds.has(estimate.id)) return;
      const item = buildEstimateShellItem(estimate, kind, priority);
      if (!item) return;
      seenEstimateIds.add(estimate.id);
      items.push(item);
    }

    approvedHandoffRows.forEach((estimate, index) => addEstimate(estimate, "approved", 10 + index));
    readyToSendRows.forEach((estimate, index) => addEstimate(estimate, "ready", 30 + index));
    draftToPriceRows.forEach((estimate, index) => addEstimate(estimate, "draft", 50 + index));
    sentToWinRows.forEach((estimate, index) => addEstimate(estimate, "sent", 70 + index));
    estimateShellRows
      .filter((estimate) => {
        const readiness = estimateShellStateById.get(estimate.id);
        return readiness && !readiness.packetReady && readiness.hasPricing;
      })
      .forEach((estimate, index) => addEstimate(estimate, "packet", 90 + index));
    estimateShellRows.forEach((estimate, index) => addEstimate(estimate, "estimate", 110 + index));

    return items.sort((left, right) => left.priority - right.priority || left.title.localeCompare(right.title)).slice(0, 7);
  }, [approvedHandoffRows, draftToPriceRows, estimateShellRows, estimateShellStateById, readyToSendRows, sentToWinRows]);
  const estimateShellFallbackItem = estimateShellQueue.find((item) => item.id === estimateShellSelectionId)
    || estimateShellQueue.find((item) => item.estimate?.id === selectedEstimate?.id)
    || estimateShellQueue[0]
    || null;
  const selectedEstimateShellItem = estimateShellFallbackItem
    || (selectedEstimate ? buildEstimateShellItem(selectedEstimate, "estimate", 120) : null);
  const estimateShellSelectedId = selectedEstimateShellItem?.id || "";
  const estimateShellAssistantDescription = approvedHandoffRows.length
    ? `${approvedHandoffRows.length} approved estimate${approvedHandoffRows.length === 1 ? "" : "s"} need manual job handoff review.`
    : readyToSendRows.length
      ? `${readyToSendRows.length} priced proposal${readyToSendRows.length === 1 ? "" : "s"} ready for human send review.`
      : draftToPriceRows.length
        ? `${draftToPriceRows.length} draft${draftToPriceRows.length === 1 ? "" : "s"} still need pricing.`
        : "Estimate readiness is clear in the current office view.";
  const estimateShellAssistantActions = [
    { label: "Price Draft", icon: "document", onClick: () => selectEstimateShellEstimate(draftToPriceRows[0], "pricing"), disabled: !draftToPriceRows.length },
    { label: "Review Send", icon: "arrowUpRight", onClick: () => selectEstimateShellEstimate(readyToSendRows[0], "sendReview"), disabled: !readyToSendRows.length },
    { label: "Review Handoff", icon: "check", onClick: () => selectEstimateShellEstimate(approvedHandoffRows[0], "handoff"), disabled: !approvedHandoffRows.length },
  ];
  const estimateShellQuickActions = [
    { id: "new-estimate", label: "New Estimate", icon: "plus", onClick: () => openFullEstimateToolsPlaceholder("New Estimate"), disabled: !canManage },
    { id: "ready-send", label: "Ready Send", icon: "arrowUpRight", onClick: () => selectEstimateShellEstimate(readyToSendRows[0], "sendReview"), disabled: !readyToSendRows.length },
    { id: "handoff", label: "Handoff", icon: "check", onClick: () => selectEstimateShellEstimate(approvedHandoffRows[0], "handoff"), disabled: !approvedHandoffRows.length },
  ];
  const estimateShellModes = [
    { id: "overview", label: "Overview", title: "Overview", manages: "proposal readiness, current totals, contact status, packet readiness, and handoff context." },
    { id: "pricing", label: "Pricing", title: "Pricing Mode", manages: "future line item pricing review, options totals, taxes, fees, and price readiness." },
    { id: "proposal", label: "Proposal", title: "Proposal Mode", manages: "future proposal sections, inclusions, exclusions, assumptions, alternates, and customer-facing scope." },
    { id: "backup", label: "Backup", title: "Backup / SOV Mode", manages: "future internal backup rows, SOV notes, takeoff references, and office-only estimate support." },
    { id: "packet", label: "Packet", title: "Packet Mode", manages: "GC packet settings, print sections, branded customer packet readiness, and internal bid review." },
    { id: "roughNotes", label: "Rough Notes", title: "Rough Notes Mode", manages: "future review-first AI rough notes drafting without automatic pricing, approval, or customer output." },
    { id: "takeoff", label: "Takeoff", title: "Takeoff Mode", manages: "fence takeoff, estimate-grade quantities, local draft quantity review, and office backup context." },
    { id: "visualPreview", label: "Visual Preview", title: "Visual Preview Mode", manages: "review-first customer concept prompt readiness without generation, sends, or estimate mutation." },
    { id: "sendReview", label: "Send Review", title: "Send Review Mode", manages: "explicit human-confirmed customer proposal send review, manual copy fallback, customer-facing print readiness, and sent status." },
    { id: "handoff", label: "Handoff", title: "Handoff Mode", manages: "approved estimate-to-job handoff checks, field-safe print review, and explicit human-confirmed conversion." },
  ];
  const estimateShellModeIds = new Set(estimateShellModes.map((mode) => mode.id));

  useEffect(() => {
    if (!canUseEstimatesCommandShell) return;
    const fallbackId = estimateShellFallbackItem?.id || "";
    if (!estimateShellSelectionId && fallbackId) {
      setEstimateShellSelectionId(fallbackId);
      if (estimateShellFallbackItem?.estimate?.id) setSelectedEstimateId(estimateShellFallbackItem.estimate.id);
      return;
    }
    if (estimateShellSelectionId && fallbackId && !estimateShellQueue.some((item) => item.id === estimateShellSelectionId)) {
      setEstimateShellSelectionId(fallbackId);
      if (estimateShellFallbackItem?.estimate?.id) setSelectedEstimateId(estimateShellFallbackItem.estimate.id);
    }
  }, [canUseEstimatesCommandShell, estimateShellFallbackItem?.estimate?.id, estimateShellFallbackItem?.id, estimateShellQueue, estimateShellSelectionId]);

  useEffect(() => {
    if (!estimateShellModeIds.has(estimateShellMode)) {
      setEstimateShellMode("overview");
    }
  }, [estimateShellMode, estimateShellModeIds]);

  function selectEstimateShellItem(item) {
    if (!item) return;
    setEstimateShellSelectionId(item.id);
    setEstimateShellMode("overview");
    if (item.estimate?.id) {
      setEstimateViewMode("browse");
      setSelectedEstimateId(item.estimate.id);
    }
  }

  function renderEstimateShellDetail(item) {
    const estimate = item?.estimate || selectedEstimate;
    if (!estimate) {
      return <StateCard title="No estimate selected" description="Select a proposal from the priority queue to review readiness, total, contact, packet, and handoff context." tone="slate" />;
    }

    const readiness = estimateShellStateById.get(estimate.id) || estimateShellReadiness(estimate);
    const handoffReadiness = deriveEstimateJobHandoffReadiness(detailEstimatePreview || estimate);
    const status = String(estimate?.status || "draft").trim().toLowerCase();
    const safeActions = [
      { id: "full-tools", label: "Open Full Tools", onClick: () => openFullEstimateToolsPlaceholder("Full estimate tools") },
      { id: "select-send", label: "Review Send Ready", variant: "secondary", onClick: () => selectEstimateShellEstimate(readyToSendRows[0]), disabled: !readyToSendRows.length },
      { id: "select-handoff", label: "Review Handoff", variant: "secondary", onClick: () => selectEstimateShellEstimate(approvedHandoffRows[0]), disabled: !approvedHandoffRows.length },
    ];
    const proposalReadyCount = [
      readiness.hasCustomer,
      readiness.hasContact,
      readiness.hasScope,
      readiness.hasPricing,
    ].filter(Boolean).length;
    const nextSafeAction = readiness.approvedHandoff
      ? "Review approved estimate-to-job handoff in the full workflow before creating any job."
      : readiness.readyToSend
        ? "Open the full send review workflow before any customer email or manual send."
        : readiness.missing.length
          ? `Resolve ${readiness.missing.slice(0, 3).join(", ")} before sending or converting.`
          : "Keep reviewing proposal context before any external action.";
    const activeShellMode = estimateShellModes.find((mode) => mode.id === estimateShellMode) || estimateShellModes[0];
    const isFocusedShellEditMode = ["pricing", "proposal", "backup", "packet", "roughNotes", "takeoff", "visualPreview", "sendReview", "handoff"].includes(activeShellMode.id);
    const visibleEstimateShellModes = isFocusedShellEditMode
      ? estimateShellModes.filter((mode) => mode.id === "overview" || mode.id === activeShellMode.id)
      : estimateShellModes;
    const pricingSaveDisabled = busy || !canManage || !selectedEstimate?.id;
    const proposalSaveDisabled = busy || !canManage || !selectedEstimate?.id;
    const backupSaveDisabled = busy || !canManage || !selectedEstimate?.id;
    const packetSaveDisabled = busy || !canManage || !canUseGcPackets || !selectedEstimate?.id;
    const shellProposalSections = deriveEstimateProposalSections(detailDraft);
    const proposalOptionStatusOptions = ["optional", "included", "excluded", "accepted"];
    const addOnStatusOptions = ["optional", "selected", "included", "accepted", "excluded"];
    const shellGcPacketLite = deriveEstimateGcPacketLite(detailDraft);
    const packetSelectedSections = ESTIMATE_PACKET_SECTION_DEFS.filter((section) => packetPrintSettings.sectionIds.includes(section.id));
    const packetCustomerSections = packetSelectedSections.filter((section) => !section.internalOnly);
    const packetInternalSections = packetSelectedSections.filter((section) => section.internalOnly);
    const shellGcPacketFields = [
      shellGcPacketLite.proposalCoverNote,
      shellGcPacketLite.proposalSummary,
      shellGcPacketLite.qualifications,
      shellGcPacketLite.scheduleNotes,
      shellGcPacketLite.addendaRfiReferences,
      shellGcPacketLite.gcReviewNotes,
      shellGcPacketLite.internalPacketNotes,
    ];
    const shellGcPacketReadyCount = shellGcPacketFields.filter((value) => String(value || "").trim()).length;
    const shellGcPacketTotalCount = shellGcPacketFields.length;
    const packetPrintReady = readiness.hasCustomer && readiness.hasScope && readiness.hasPricing && packetCustomerSections.length > 0;
    const shellFenceTakeoffReadiness = deriveFenceTakeoffReadiness(detailEstimateBackup.fenceTakeoff);
    const takeoffSaveDisabled = busy || !canManage || !selectedEstimate?.id;
    const customerSafePacketSettings = {
      ...packetPrintSettings,
      allowInternalSections: false,
      sectionIds: packetCustomerSections.map((section) => section.id),
    };
    const sendReviewReadyCount = [
      Boolean(detailEstimateCustomerEmail),
      readiness.hasCustomer,
      readiness.hasScope,
      readiness.hasPricing,
      Boolean(detailProposalSections.customerNotes),
    ].filter(Boolean).length;
    const sendReviewCanSend = Boolean(emailSendingConfigured && canManage && detailEstimatePreview && detailEstimateCustomerEmail);
    const canCreateJobsFromShell = Boolean(permissions?.jobs?.canCreate);
    const selectedEstimateStatus = String(selectedEstimate?.status || estimate?.status || "draft").trim().toLowerCase();
    const handoffCanConvert = Boolean(
      selectedEstimate?.id
        && handoffReadiness.readyForJob
        && selectedEstimateStatus === "approved"
        && !selectedEstimate.jobId
        && permissions?.estimates?.canManage
        && canCreateJobsFromShell,
    );
    const handoffPermissionNote = permissions?.estimates?.canManage && !canCreateJobsFromShell
      ? "You can manage estimates, but creating jobs requires job-create permission."
      : "";

    async function handleSaveEstimateShellPricing() {
      if (!selectedEstimate?.id || !canManage || typeof onSaveEstimate !== "function") return false;
      const saved = await onSaveEstimate(selectedEstimate.id, {
        items: detailDraft.items,
        taxRate: detailDraft.taxRate,
        feesTotal: detailDraft.feesTotal,
      });
      if (saved) {
        showCopyFeedback("Pricing saved through the existing estimate save path.", 5000);
      }
      return saved;
    }

    async function handleSaveEstimateShellProposal() {
      if (!selectedEstimate?.id || !canManage || typeof onSaveEstimate !== "function") return false;
      const saved = await onSaveEstimate(selectedEstimate.id, {
        scopeSummary: detailDraft.scopeSummary,
        customerNotes: detailDraft.customerNotes,
      });
      if (saved) {
        showCopyFeedback("Proposal sections saved through the existing estimate save path.", 5000);
      }
      return saved;
    }

    async function handleSaveEstimateShellBackup() {
      if (!selectedEstimate?.id || !canManage || typeof onSaveEstimate !== "function") return false;
      const saved = await onSaveEstimate(selectedEstimate.id, {
        internalNotes: detailDraft.internalNotes,
      });
      if (saved) {
        showCopyFeedback("Backup and SOV review saved through the existing estimate save path.", 5000);
      }
      return saved;
    }

    async function handleSaveEstimateShellPacket() {
      if (!selectedEstimate?.id || !canManage || !canUseGcPackets || typeof onSaveEstimate !== "function") return false;
      const saved = await onSaveEstimate(selectedEstimate.id, {
        internalNotes: detailDraft.internalNotes,
      });
      if (saved) {
        showCopyFeedback("GC packet readiness saved through the existing estimate save path.", 5000);
      }
      return saved;
    }

    async function handleSaveEstimateShellTakeoff() {
      if (!selectedEstimate?.id || !canManage || typeof onSaveEstimate !== "function") return false;
      const saved = await onSaveEstimate(selectedEstimate.id, {
        internalNotes: detailDraft.internalNotes,
        items: detailDraft.items,
        scopeSummary: detailDraft.scopeSummary,
      });
      if (saved) {
        showCopyFeedback("Reviewed takeoff draft saved through the existing estimate save path.", 5000);
      }
      return saved;
    }

    async function handleConvertEstimateShellHandoff() {
      if (!handoffCanConvert || typeof onConvertEstimate !== "function" || !selectedEstimate?.id) return false;
      const confirmed = window.confirm(
        "Create a draft job from this approved estimate? Confirm you reviewed approval, customer/contact, scope, pricing, and field handoff backup. No crew, schedule, billing, customer contact, or field visibility will be automated.",
      );
      if (!confirmed) {
        showCopyFeedback("Job conversion cancelled. No job was created.", 5000);
        return false;
      }
      const converted = await onConvertEstimate(selectedEstimate.id);
      if (converted) {
        showCopyFeedback("Draft job created from approved estimate. Schedule, crew, billing, and field visibility still require manual review.", 7000);
      }
      return converted;
    }

    function updateShellProposalSection(field, value) {
      setDetailDraft((current) => mergeEstimateProposalSections(current, { [field]: value }));
    }

    function updateShellProposalOption(group, index, field, value) {
      const currentOptions = Array.isArray(shellProposalSections[group]) ? shellProposalSections[group] : [];
      const nextOptions = currentOptions.map((option, optionIndex) => optionIndex === index ? { ...option, [field]: value } : option);
      updateShellProposalSection(group, nextOptions);
    }

    function appendShellProposalOption(group) {
      const currentOptions = Array.isArray(shellProposalSections[group]) ? shellProposalSections[group] : [];
      updateShellProposalSection(group, [
        ...currentOptions,
        {
          title: "",
          description: "",
          amount: "",
          status: "optional",
          notes: "",
        },
      ]);
    }

    function removeShellProposalOption(group, index) {
      const currentOptions = Array.isArray(shellProposalSections[group]) ? shellProposalSections[group] : [];
      updateShellProposalSection(group, currentOptions.filter((_, optionIndex) => optionIndex !== index));
    }

    function renderEstimateShellProposalOptions({ group, title, description, addLabel, statusOptions }) {
      const options = Array.isArray(shellProposalSections[group]) ? shellProposalSections[group] : [];
      return (
        <div className="co-estimates-shell-option-group">
          <div className="co-estimates-shell-option-head">
            <div>
              <h4>{title}</h4>
              <p>{description}</p>
            </div>
            <Button type="button" variant="secondary" onClick={() => appendShellProposalOption(group)} disabled={!canManage || busy}>{addLabel}</Button>
          </div>
          {options.length ? (
            <div className="co-estimates-shell-option-list">
              {options.map((option, index) => (
                <div key={`${group}-${index}`} className="co-estimates-shell-option-card">
                  <div className="co-estimates-shell-option-grid">
                    <InputField label={`${title} ${index + 1}`} value={option.title || ""} onChange={(event) => updateShellProposalOption(group, index, "title", event.target.value)} disabled={!canManage || busy} />
                    <InputField label="Amount" value={option.amount || ""} onChange={(event) => updateShellProposalOption(group, index, "amount", event.target.value)} inputMode="decimal" disabled={!canManage || busy} />
                    <SelectField label="Status" value={option.status || "optional"} onChange={(event) => updateShellProposalOption(group, index, "status", event.target.value)} disabled={!canManage || busy}>
                      {statusOptions.map((statusOption) => <option key={statusOption} value={statusOption}>{statusOption}</option>)}
                    </SelectField>
                  </div>
                  <div className="co-estimates-shell-option-copy-grid">
                    <TextAreaField label="Description" value={option.description || ""} onChange={(event) => updateShellProposalOption(group, index, "description", event.target.value)} className="field-input min-h-20 resize-y" disabled={!canManage || busy} />
                    <TextAreaField label="Notes" value={option.notes || ""} onChange={(event) => updateShellProposalOption(group, index, "notes", event.target.value)} className="field-input min-h-20 resize-y" disabled={!canManage || busy} />
                  </div>
                  <div className="co-estimates-shell-option-foot">
                    <span>Optional proposal item only. Base estimate pricing is unchanged here.</span>
                    <button type="button" onClick={() => removeShellProposalOption(group, index)} disabled={!canManage || busy}>Remove</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="co-estimates-shell-empty-note">No {title.toLowerCase()} added yet.</p>
          )}
        </div>
      );
    }

    function renderEstimateShellPricingMode() {
      return (
        <div className="co-estimates-shell-pricing-panel" role="region" aria-label="Estimate pricing editor">
          <div className="co-estimates-shell-pricing-head">
            <div>
              <Badge tone={canManage ? "blue" : "slate"}>{canManage ? "Pricing edit" : "Read only"}</Badge>
              <h3>Pricing</h3>
              <p>Line items, tax, and fees only. Saving here updates pricing data through the existing estimate save path.</p>
            </div>
            <StatusBadge status={estimateStatusLabel(status)} />
          </div>
          <div className="co-estimates-shell-pricing-context">
            <span><em>Estimate</em><strong>{estimateDisplayTitle(estimate)}</strong></span>
            <span><em>Customer</em><strong>{estimateDisplayCustomer(estimate) || "Customer pending"}</strong></span>
            <span><em>Contact</em><strong>{estimateCustomerEmail(estimate) || "Missing"}</strong></span>
          </div>
          {activeRateBookDefaults.length ? (
            <div className="co-estimates-shell-rate-book-defaults" aria-label="Rate book defaults">
              <div className="co-estimates-shell-rate-book-head">
                <div>
                  <h4>Rate book defaults</h4>
                  <p>Owner/admin internal defaults copy customer-safe description, unit, and unit price only.</p>
                </div>
                <Button type="button" size="sm" variant="secondary" onClick={() => setActive?.("rateBook")}>Manage rate book</Button>
              </div>
              <div className="co-estimates-shell-rate-book-list">
                {activeRateBookDefaults.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="co-estimates-shell-rate-book-chip"
                    onClick={() => appendRateBookDefaultToDetail(item)}
                    disabled={!canManage || busy}
                  >
                    <span>{item.title}</span>
                    <strong>{formatEstimateCurrency(calculateRateBookUnitPrice(item))}/{item.unit || "ea"}</strong>
                  </button>
                ))}
              </div>
            </div>
          ) : permissions?.rateBook?.canManage ? (
            <div className="co-estimates-shell-rate-book-empty">
              <span>No rate book defaults yet.</span>
              <Button type="button" size="sm" variant="secondary" onClick={() => setActive?.("rateBook")}>Create rate defaults</Button>
            </div>
          ) : null}
          <div className="co-estimates-shell-pricing-adjustments">
            <InputField label="Tax rate (%)" value={detailDraft.taxRate} onChange={(event) => setDetailDraft((current) => ({ ...current, taxRate: event.target.value }))} inputMode="decimal" disabled={!canManage || busy} />
            <InputField label="Fees total" value={detailDraft.feesTotal} onChange={(event) => setDetailDraft((current) => ({ ...current, feesTotal: event.target.value }))} inputMode="decimal" disabled={!canManage || busy} />
          </div>
          <div className="co-estimates-shell-line-items">
            <div className="co-estimates-shell-line-items-head">
              <div>
                <h4>Line items</h4>
                <p>Pricing uses the existing estimate math and server validation.</p>
              </div>
              <Button type="button" variant="secondary" onClick={() => appendDraftItem(setDetailDraft)} disabled={!canManage || busy}>Add line item</Button>
            </div>
            {detailDraft.items.map((lineItem, index) => (
              <div key={lineItem.id} className="co-estimates-shell-line-card">
                <div className="co-estimates-shell-line-grid">
                  <InputField label={`Description ${index + 1}`} value={lineItem.description} onChange={(event) => updateDraftItem(setDetailDraft, index, "description", event.target.value)} disabled={!canManage || busy} />
                  <InputField label="Qty" value={lineItem.quantity} onChange={(event) => updateDraftItem(setDetailDraft, index, "quantity", event.target.value)} inputMode="decimal" disabled={!canManage || busy} />
                  <InputField label="Unit" value={lineItem.unit} onChange={(event) => updateDraftItem(setDetailDraft, index, "unit", event.target.value)} disabled={!canManage || busy} />
                  <InputField label="Unit price" value={lineItem.unitPrice} onChange={(event) => updateDraftItem(setDetailDraft, index, "unitPrice", event.target.value)} inputMode="decimal" disabled={!canManage || busy} />
                </div>
                <div className="co-estimates-shell-line-foot">
                  <span>Line total: {formatEstimateCurrency(calculateEstimateLineTotal(lineItem))}</span>
                  <button type="button" onClick={() => removeDraftItem(setDetailDraft, index)} disabled={!canManage || busy}>Remove item</button>
                </div>
              </div>
            ))}
          </div>
          <div className="co-estimates-shell-pricing-totals">
            <span><em>Subtotal</em><strong>{formatEstimateCurrency(detailTotals.subtotal)}</strong></span>
            <span><em>Tax</em><strong>{formatEstimateCurrency(detailTotals.taxTotal || 0)}</strong></span>
            <span><em>Fees</em><strong>{formatEstimateCurrency(detailTotals.feesTotal || 0)}</strong></span>
            <span><em>Selected options</em><strong>{formatEstimateCurrency(detailOptionTotals.selectedOptionsTotal)}</strong></span>
            <span><em>Total</em><strong>{formatEstimateCurrency(detailOptionTotals.totalWithSelectedOptions)}</strong></span>
          </div>
          <div className="co-estimates-shell-pricing-actions">
            <Button type="button" onClick={handleSaveEstimateShellPricing} disabled={pricingSaveDisabled}>Save Pricing</Button>
            <Button type="button" variant="secondary" onClick={() => setEstimateShellMode("overview")}>Return to overview</Button>
          </div>
        </div>
      );
    }

    function renderEstimateShellProposalMode() {
      return (
        <div className="co-estimates-shell-workflow-panel co-estimates-shell-proposal-panel" role="region" aria-label="Estimate proposal sections editor">
          <div className="co-estimates-shell-workflow-head">
            <div>
              <Badge tone={canManage ? "blue" : "slate"}>{canManage ? "Proposal edit" : "Read only"}</Badge>
              <h3>Proposal Sections</h3>
              <p>Customer-facing scope, inclusions, exclusions, assumptions, terms, alternates, and add-ons only.</p>
            </div>
            <StatusBadge status={estimateStatusLabel(status)} />
          </div>
          <div className="co-estimates-shell-workflow-context">
            <span><em>Estimate</em><strong>{estimateDisplayTitle(estimate)}</strong></span>
            <span><em>Customer</em><strong>{estimateDisplayCustomer(estimate) || "Customer pending"}</strong></span>
            <span><em>Contact</em><strong>{estimateCustomerEmail(estimate) || "Missing"}</strong></span>
          </div>
          <div className="co-estimates-shell-proposal-fields">
            <TextAreaField label="Scope of Work" value={shellProposalSections.scopeOfWork} onChange={(event) => updateShellProposalSection("scopeOfWork", event.target.value)} disabled={!canManage || busy} />
            <div className="co-estimates-shell-proposal-grid">
              <TextAreaField label="Inclusions" value={shellProposalSections.inclusions} onChange={(event) => updateShellProposalSection("inclusions", event.target.value)} className="field-input min-h-24 resize-y" disabled={!canManage || busy} />
              <TextAreaField label="Exclusions" value={shellProposalSections.exclusions} onChange={(event) => updateShellProposalSection("exclusions", event.target.value)} className="field-input min-h-24 resize-y" disabled={!canManage || busy} />
              <TextAreaField label="Assumptions / Clarifications" value={shellProposalSections.assumptions} onChange={(event) => updateShellProposalSection("assumptions", event.target.value)} className="field-input min-h-24 resize-y" disabled={!canManage || busy} />
            </div>
            {renderEstimateShellProposalOptions({
              group: "alternates",
              title: "Alternates",
              description: "Optional proposal choices that stay separate from base estimate pricing.",
              addLabel: "Add alternate",
              statusOptions: proposalOptionStatusOptions,
            })}
            {renderEstimateShellProposalOptions({
              group: "addOns",
              title: "Optional Add-ons",
              description: "Add-ons can be selected for proposal totals without mutating base line items.",
              addLabel: "Add add-on",
              statusOptions: addOnStatusOptions,
            })}
            <TextAreaField label="Customer Notes / Terms" value={shellProposalSections.customerNotes} onChange={(event) => updateShellProposalSection("customerNotes", event.target.value)} disabled={!canManage || busy} />
          </div>
          <div className="co-estimates-shell-workflow-actions">
            <Button type="button" onClick={handleSaveEstimateShellProposal} disabled={proposalSaveDisabled}>Save Proposal Sections</Button>
            <Button type="button" variant="secondary" onClick={() => setEstimateShellMode("overview")}>Return to overview</Button>
          </div>
        </div>
      );
    }

    function renderEstimateShellBackupMode() {
      const shellBackup = deriveEstimateBackup(detailDraft);
      const shellSovRows = shellBackup.sovRows.length > 0 ? shellBackup.sovRows : [createEmptySovRow()];
      const updateShellBackup = (updates) => {
        setDetailDraft((current) => mergeEstimateBackup(current, {
          ...deriveEstimateBackup(current),
          ...updates,
        }));
      };
      const updateShellSovRow = (index, field, value) => {
        updateShellBackup({
          sovRows: shellSovRows.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value } : row),
        });
      };
      const removeShellSovRow = (index) => {
        updateShellBackup({ sovRows: shellSovRows.filter((_, rowIndex) => rowIndex !== index) });
      };
      return (
        <div className="co-estimates-shell-workflow-panel co-estimates-shell-backup-panel" role="region" aria-label="Estimate backup and SOV editor">
          <div className="co-estimates-shell-workflow-head">
            <div>
              <Badge tone={canManage ? "amber" : "slate"}>{canManage ? "Office backup" : "Read only"}</Badge>
              <h3>Backup / SOV Review</h3>
              <p>Internal SOV rows and estimator backup notes only.</p>
            </div>
            <StatusBadge status={estimateStatusLabel(status)} />
          </div>
          <div className="co-estimates-shell-workflow-context">
            <span><em>Estimate</em><strong>{estimateDisplayTitle(estimate)}</strong></span>
            <span><em>Customer</em><strong>{estimateDisplayCustomer(estimate) || "Customer pending"}</strong></span>
            <span><em>Visibility</em><strong>Office only</strong></span>
          </div>
          <div className="co-estimates-shell-backup-editor">
            <div className="co-estimates-shell-backup-note">
              <strong>SOV backup does not change customer pricing.</strong>
              <span>Use this review mode for internal schedule-of-values backup and estimator notes only.</span>
            </div>
            <div className="co-estimates-shell-sov-list">
              {shellSovRows.map((row, index) => (
                <div key={`shell-sov-${index}`} className="co-estimates-shell-sov-card">
                  <div className="co-estimates-shell-sov-grid">
                    <InputField label={`Section / Item ${index + 1}`} value={row.section || ""} onChange={(event) => updateShellSovRow(index, "section", event.target.value)} disabled={!canManage || busy} />
                    <InputField label="Description" value={row.description || ""} onChange={(event) => updateShellSovRow(index, "description", event.target.value)} disabled={!canManage || busy} />
                    <InputField label="Qty" value={row.quantity || ""} onChange={(event) => updateShellSovRow(index, "quantity", event.target.value)} inputMode="decimal" disabled={!canManage || busy} />
                    <InputField label="Unit" value={row.unit || ""} onChange={(event) => updateShellSovRow(index, "unit", event.target.value)} disabled={!canManage || busy} />
                    <InputField label="Amount" value={row.amount || ""} onChange={(event) => updateShellSovRow(index, "amount", event.target.value)} inputMode="decimal" disabled={!canManage || busy} />
                  </div>
                  <TextAreaField label="SOV notes" value={row.notes || ""} onChange={(event) => updateShellSovRow(index, "notes", event.target.value)} className="field-input min-h-20 resize-y" disabled={!canManage || busy} />
                  <div className="co-estimates-shell-sov-foot">
                    <span>Internal backup row only.</span>
                    <button type="button" onClick={() => removeShellSovRow(index)} disabled={!canManage || busy}>Remove row</button>
                  </div>
                </div>
              ))}
            </div>
            <Button type="button" variant="secondary" onClick={() => updateShellBackup({ sovRows: [...shellSovRows, createEmptySovRow()] })} disabled={!canManage || busy}>Add SOV Row</Button>
            <TextAreaField
              label="Backup notes"
              value={shellBackup.notes || ""}
              onChange={(event) => updateShellBackup({ notes: event.target.value })}
              className="field-input min-h-28 resize-y"
              disabled={!canManage || busy}
            />
          </div>
          <div className="co-estimates-shell-workflow-actions">
            <Button type="button" onClick={handleSaveEstimateShellBackup} disabled={backupSaveDisabled}>Save Backup / SOV</Button>
            <Button type="button" variant="secondary" onClick={() => setEstimateShellMode("overview")}>Return to overview</Button>
          </div>
        </div>
      );
    }

    function renderEstimateShellPacketMode() {
      if (!canUseGcPackets) {
        return (
          <div className="co-estimates-shell-workflow-panel co-estimates-shell-packet-panel" role="region" aria-label="Estimate packet readiness">
            <div className="co-estimates-shell-workflow-head">
              <div>
                <Badge tone="slate">Locked</Badge>
                <h3>Packet Readiness</h3>
                <p>GC packet settings require the proper estimate packet entitlement. This shell keeps packet readiness read-only for this package.</p>
              </div>
              <StatusBadge status={estimateStatusLabel(status)} />
            </div>
            <div className="co-estimates-shell-packet-readiness-grid">
              <span><em>Preset</em><strong>{packetPrintSettings.presetLabel}</strong></span>
              <span><em>Customer Sections</em><strong>{packetCustomerSections.length}</strong></span>
              <span><em>Bid Notes</em><strong>Locked</strong></span>
              <span><em>Print Readiness</em><strong>{packetPrintReady ? "Ready context" : "Needs review"}</strong></span>
            </div>
            <div className="co-estimates-shell-packet-lock">
              <strong>Packet tools unavailable for this package.</strong>
              <span>Customer proposal readiness remains visible, but bid note editing, office-only sections, and packet saves stay blocked.</span>
            </div>
            <div className="co-estimates-shell-workflow-actions">
              <Button type="button" variant="secondary" onClick={() => setEstimateShellMode("overview")}>Return to overview</Button>
            </div>
          </div>
        );
      }

      return (
        <div className="co-estimates-shell-workflow-panel co-estimates-shell-packet-panel" role="region" aria-label="Estimate packet settings and GC packet readiness">
          <div className="co-estimates-shell-workflow-head">
            <div>
              <Badge tone={canManage ? "violet" : "slate"}>{canManage ? "Packet readiness" : "Read only"}</Badge>
              <h3>Packet Settings / Bid Readiness</h3>
              <p>Review the packet preset, included sections, and GC-facing bid notes. This screen does not send, convert, generate AI output, change takeoff, or hand off the job.</p>
            </div>
            <StatusBadge status={estimateStatusLabel(status)} />
          </div>
          <div className="co-estimates-shell-workflow-context">
            <span><em>Estimate</em><strong>{estimateDisplayTitle(estimate)}</strong></span>
            <span><em>Customer</em><strong>{estimateDisplayCustomer(estimate) || "Customer pending"}</strong></span>
            <span><em>Packet</em><strong>{packetPrintSettings.presetLabel}</strong></span>
          </div>
          <div className="co-estimates-shell-packet-readiness-grid">
            <span><em>Selected Preset</em><strong>{packetPrintSettings.presetLabel}</strong></span>
            <span><em>Selected Sections</em><strong>{packetPrintSettings.sectionIds.length}</strong></span>
            <span><em>Bid Note Completeness</em><strong>{shellGcPacketReadyCount} / {shellGcPacketTotalCount}</strong></span>
            <span><em>Internal Exposure</em><strong>{packetPrintSettings.allowInternalSections ? `${packetInternalSections.length} office-only` : "Customer-safe"}</strong></span>
            <span><em>Print Readiness</em><strong>{packetPrintReady ? "Ready context" : "Needs review"}</strong></span>
          </div>
          <div className="co-estimates-shell-packet-section-list" aria-label="Selected packet sections">
            {packetSelectedSections.map((section) => (
              <span key={section.id} data-internal={section.internalOnly ? "true" : "false"}>{section.label}</span>
            ))}
          </div>
          <div className="co-estimates-shell-packet-forms">
            <EstimatePacketSettingsPanel
              presetId={packetPresetId}
              sectionIds={packetSectionIds}
              setPresetId={setPacketPresetId}
              setSectionIds={setPacketSectionIds}
              customization={packetCustomization}
              setCustomization={setPacketCustomization}
              onApplyCompanyBrand={handleApplyCompanyPacketBrand}
              onSaveCustomizationDefault={handleSavePacketCustomizationDefault}
              onApplyCustomizationDefault={handleApplyPacketCustomizationDefault}
              customizationDefaultNotice={packetCustomizationNotice}
              canIncludeInternalSections={canManage && canUseGcPackets}
            />
            <EstimateGcPacketLiteEditor draft={detailDraft} setDraft={setDetailDraft} disabled={!canManage || busy} />
          </div>
          <div className="co-estimates-shell-workflow-actions">
            <Button type="button" onClick={handleSaveEstimateShellPacket} disabled={packetSaveDisabled}>Save GC Packet Readiness</Button>
            <Button type="button" variant="secondary" onClick={() => setEstimateShellMode("overview")}>Return to overview</Button>
          </div>
        </div>
      );
    }

    function renderEstimateShellRoughNotesMode() {
      if (!canUseAiRoughNotes || !canManage) {
        return (
          <div className="co-estimates-shell-workflow-panel co-estimates-shell-rough-notes-panel" role="region" aria-label="Estimate rough notes AI readiness">
            <div className="co-estimates-shell-workflow-head">
              <div>
                <Badge tone="slate">Locked</Badge>
                <h3>Rough Notes AI</h3>
                <p>AI Rough Notes requires proposal tools entitlement and an office role that can manage estimates.</p>
              </div>
              <StatusBadge status={estimateStatusLabel(status)} />
            </div>
            <div className="co-estimates-shell-packet-lock">
              <strong>Review-first AI unavailable.</strong>
              <span>Field users remain blocked from estimates and pricing. No rough notes generation, send, convert, takeoff, handoff, or pricing save runs here.</span>
            </div>
            <div className="co-estimates-shell-workflow-actions">
              <Button type="button" variant="secondary" onClick={() => setEstimateShellMode("overview")}>Return to overview</Button>
            </div>
          </div>
        );
      }

      return (
        <div className="co-estimates-shell-workflow-panel co-estimates-shell-rough-notes-panel" role="region" aria-label="Estimate rough notes AI suggestions">
          <div className="co-estimates-shell-workflow-head">
            <div>
              <Badge tone="orange">Review-first AI</Badge>
              <h3>Rough Notes AI</h3>
              <p>Generate review-only proposal and GC packet suggestions. Applying suggestions fills the selected draft locally; it does not save, send, price, convert, takeoff, or hand off work.</p>
            </div>
            <StatusBadge status={estimateStatusLabel(status)} />
          </div>
          <EstimateRoughNotesHelper
            roughNotes={roughNotes}
            setRoughNotes={setRoughNotes}
            assistant={roughNotesState}
            onGenerate={handleGenerateEstimateRoughNotes}
            onApplyToSelected={applyRoughNotesToSelected}
            canApplySelected={Boolean(selectedEstimate)}
            showNewEstimateActions={false}
            disabled={busy}
          />
          <div className="co-estimates-shell-workflow-actions">
            <Button type="button" variant="secondary" onClick={() => setEstimateShellMode("overview")}>Return to overview</Button>
          </div>
        </div>
      );
    }

    function renderEstimateShellTakeoffMode() {
      if (!canManage) {
        return (
          <div className="co-estimates-shell-workflow-panel co-estimates-shell-takeoff-panel" role="region" aria-label="Estimate takeoff readiness">
            <div className="co-estimates-shell-workflow-head">
              <div>
                <Badge tone="slate">Locked</Badge>
                <h3>Takeoff</h3>
                <p>Takeoff tools require an office role that can manage estimates.</p>
              </div>
              <StatusBadge status={estimateStatusLabel(status)} />
            </div>
            <div className="co-estimates-shell-packet-lock">
              <strong>Estimate takeoff unavailable.</strong>
              <span>Field users remain blocked from estimates and pricing. No takeoff, pricing, send, convert, or handoff action runs here.</span>
            </div>
            <div className="co-estimates-shell-workflow-actions">
              <Button type="button" variant="secondary" onClick={() => setEstimateShellMode("overview")}>Return to overview</Button>
            </div>
          </div>
        );
      }

      return (
        <div className="co-estimates-shell-workflow-panel co-estimates-shell-takeoff-panel" role="region" aria-label="Estimate takeoff editor">
          <div className="co-estimates-shell-workflow-head">
            <div>
              <Badge tone="green">Review-first takeoff</Badge>
              <h3>Takeoff</h3>
              <p>Draw or manually add estimate-grade quantities. Apply Quantities updates the local draft only; Save persists reviewed draft fields through the existing estimate save path.</p>
            </div>
            <StatusBadge status={estimateStatusLabel(status)} />
          </div>
          <div className="co-estimates-shell-workflow-context">
            <span><em>Estimate</em><strong>{estimateDisplayTitle(estimate)}</strong></span>
            <span><em>Customer</em><strong>{estimateDisplayCustomer(estimate) || "Customer pending"}</strong></span>
            <span><em>Confidence</em><strong>{shellFenceTakeoffReadiness.label}</strong></span>
          </div>
          <FenceTakeoffLiteEditor
            draft={detailDraft}
            setDraft={setDetailDraft}
            disabled={busy || !canManage}
            jobsiteAddress={estimateRailProfileLine(detailLead?.location, detailCustomer?.address, companyProfile.serviceArea)}
          />
          <div className="co-estimates-shell-workflow-actions">
            <Button type="button" onClick={handleSaveEstimateShellTakeoff} disabled={takeoffSaveDisabled}>Save Reviewed Takeoff Draft</Button>
            <Button type="button" variant="secondary" onClick={() => setEstimateShellMode("overview")}>Return to overview</Button>
          </div>
        </div>
      );
    }

    function renderEstimateShellVisualPreviewMode() {
      return (
        <div className="co-estimates-shell-workflow-panel co-estimates-shell-visual-preview-panel" role="region" aria-label="Estimate visual preview prep">
          <div className="co-estimates-shell-workflow-head">
            <div>
              <Badge tone={canRequestEstimateVisualPreview(visualPreviewPacket) ? "green" : "amber"}>
                {canRequestEstimateVisualPreview(visualPreviewPacket) ? "Ready context" : "Needs review"}
              </Badge>
              <h3>Visual Preview</h3>
              <p>Review and copy a concept-image prompt only. This mode does not generate images, call an image API, save estimates, send proposals, convert jobs, or change pricing.</p>
            </div>
            <StatusBadge status={estimateStatusLabel(status)} />
          </div>
          <div className="co-estimates-shell-workflow-context">
            <span><em>Trade</em><strong>{visualPreviewPacket.tradeLabel}</strong></span>
            <span><em>References</em><strong>{visualPreviewPacket.referenceCount}</strong></span>
            <span><em>Ready</em><strong>{canRequestEstimateVisualPreview(visualPreviewPacket) ? "Yes" : "Needs review"}</strong></span>
          </div>
          <div className="co-estimates-shell-visual-grid">
            <div className="co-estimates-shell-visual-main">
              <div className="co-estimates-shell-visual-prompt">
                <span>Concept prompt</span>
                <p>{visualPreviewPacket.prompt}</p>
              </div>
              {visualPreviewPacket.missingReviewItems.length ? (
                <div className="co-estimates-shell-visual-warning">
                  <strong>Needed before image generation</strong>
                  <ul>
                    {visualPreviewPacket.missingReviewItems.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>
              ) : (
                <div className="co-estimates-shell-visual-ready">Ready for a human-approved image generation step outside this shell. Nothing generates automatically.</div>
              )}
              <div className="co-estimates-shell-visual-safety">
                <strong>Safety boundaries</strong>
                <ul>
                  {visualPreviewPacket.blockedActions.map((item) => <li key={item}>{item}</li>)}
                </ul>
                <p>{visualPreviewPacket.disclaimer}</p>
              </div>
            </div>
            <aside className="co-estimates-shell-visual-side">
              <div>
                <span>References</span>
                {visualPreviewPacket.references.length ? (
                  <ul>
                    {visualPreviewPacket.references.map((reference, index) => (
                      <li key={`${reference.fileName || reference.source || "reference"}-${index}`}>
                        <strong>{reference.fileName || reference.referenceType || `Reference ${index + 1}`}</strong>
                        <em>{[reference.referenceType, reference.source, reference.hasUrl ? "URL tracked, not exposed in prompt" : ""].filter(Boolean).join(" / ")}</em>
                      </li>
                    ))}
                  </ul>
                ) : <p>No reference rows yet.</p>}
              </div>
              <div>
                <span>Proof photos</span>
                <ul>
                  {(visualPreviewPacket.proofPhotoChecklist.length ? visualPreviewPacket.proofPhotoChecklist.slice(0, 6) : ["Add reference context before requesting proof photos."]).map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
            </aside>
          </div>
          <div className="co-estimates-shell-workflow-actions">
            <Button
              type="button"
              variant="secondary"
              onClick={() => copyEstimateText(
                () => visualPreviewPacket.prompt,
                "Visual preview prompt copied. Review it before using any image generator.",
              )}
            >
              Copy visual prompt
            </Button>
            <Button type="button" variant="secondary" onClick={() => setEstimateShellMode("overview")}>Return to overview</Button>
          </div>
        </div>
      );
    }

    function renderEstimateShellSendReviewMode() {
      return (
        <div className="co-estimates-shell-workflow-panel co-estimates-shell-send-review-panel" role="region" aria-label="Estimate send review">
          <div className="co-estimates-shell-workflow-head">
            <div>
              <Badge tone={emailSendingConfigured ? "blue" : "amber"}>{emailSendingConfigured ? "Email configured" : "Manual copy mode"}</Badge>
              <h3>Send Review</h3>
              <p>Review the customer-facing recipient, packet, message, and totals before any customer output. Email sending still requires the existing confirmation and server review gate.</p>
            </div>
            <StatusBadge status={estimateStatusLabel(status)} />
          </div>
          <div className="co-estimates-shell-workflow-context">
            <span><em>Recipient</em><strong>{detailEstimateCustomerEmail || "Missing email"}</strong></span>
            <span><em>Send Mode</em><strong>{emailSendingConfigured ? "Configured email" : "Manual copy only"}</strong></span>
            <span><em>Sent Status</em><strong>{detailEstimatePreview?.sentAt ? `Sent ${formatDateTime(detailEstimatePreview.sentAt)}` : "Not sent"}</strong></span>
          </div>
          <div className="co-estimates-shell-send-grid">
            <div className="co-estimates-shell-send-main">
              <div className="co-estimates-shell-send-card">
                <span>Customer-facing packet</span>
                <strong>{packetCustomerSections.length} customer section{packetCustomerSections.length === 1 ? "" : "s"}</strong>
                <p>Internal notes, SOV backup, private takeoff backup, sent history, provider IDs, and private file links are excluded from this send review surface.</p>
              </div>
              <div className="co-estimates-shell-send-card">
                <span>Scope and terms readiness</span>
                <strong>{readiness.hasScope ? "Scope ready" : "Scope missing"} / {detailProposalSections.customerNotes ? "Terms ready" : "Terms missing"}</strong>
                <p>Only customer-facing scope summary and customer notes are reviewed here. Pricing, proposal, backup, packet, rough notes, and takeoff saves stay in their own modes.</p>
              </div>
              <div className="co-estimates-shell-send-message">
                <span>Customer message preview</span>
                <p>{buildEstimateCustomerMessage({ companyName, companyProfile, estimate: detailEstimatePreview }) || "Select an estimate to preview the customer message."}</p>
              </div>
            </div>
            <aside className="co-estimates-shell-send-side">
              <div>
                <span>Readiness</span>
                <strong>{sendReviewReadyCount} / 5</strong>
                <p>{sendReviewCanSend ? "Ready for explicit human confirmation." : emailSendingConfigured ? "Needs recipient/readiness before configured send." : "Manual copy mode: no send endpoint call."}</p>
              </div>
              <div>
                <span>Pricing summary</span>
                <strong>{formatEstimateCurrency(detailOptionTotals.totalWithSelectedOptions)}</strong>
                <p>Base {formatEstimateCurrency(detailTotals.grandTotal)} plus selected options {formatEstimateCurrency(detailOptionTotals.selectedOptionsTotal)}.</p>
              </div>
              <div>
                <span>Privacy boundary</span>
                <strong>Customer-facing only</strong>
                <p>No internal notes, backup rows, private file links, convert controls, handoff execution, or AI actions appear in this mode.</p>
              </div>
            </aside>
          </div>
          <div className="co-estimates-shell-workflow-actions">
            <Button
              type="button"
              variant="secondary"
              onClick={() => copyEstimateText(
                () => buildEstimateCustomerMessage({ companyName, companyProfile, estimate: detailEstimatePreview }),
                "Customer message copied for manual review.",
              )}
              disabled={!detailEstimatePreview}
            >
              Copy customer message
            </Button>
            <Button type="button" variant="secondary" onClick={() => onPrintEstimate?.(detailEstimatePreview, customerSafePacketSettings)} disabled={!detailEstimatePreview}>
              Print customer proposal
            </Button>
            {emailSendingConfigured ? (
              <Button type="button" onClick={handleSendEstimate} disabled={!sendReviewCanSend || busy}>
                Send estimate
              </Button>
            ) : null}
          </div>
        </div>
      );
    }

    function renderEstimateShellHandoffMode() {
      const fieldSafePacketSettings = {
        ...packetPrintSettings,
        allowInternalSections: false,
      };
      const handoffReadyFacts = [
        { label: "Approved status", value: selectedEstimateStatus === "approved" ? "Approved" : estimateStatusLabel(selectedEstimateStatus), ready: selectedEstimateStatus === "approved" },
        { label: "Job state", value: selectedEstimate?.jobId ? "Converted" : "Not converted", ready: !selectedEstimate?.jobId },
        { label: "Customer/contact", value: `${readiness.hasCustomer ? "Customer" : "Customer missing"} / ${detailEstimateCustomerEmail ? "Contact" : "Contact missing"}`, ready: readiness.hasCustomer && Boolean(detailEstimateCustomerEmail) },
        { label: "Scope", value: readiness.hasScope ? "Ready" : "Needs scope", ready: readiness.hasScope },
        { label: "Pricing", value: readiness.hasPricing ? formatEstimateCurrency(readiness.optionTotals.totalWithSelectedOptions) : "Needs priced line items", ready: readiness.hasPricing },
        { label: "Field backup", value: handoffReadiness.steps.find((step) => step.id === "field-handoff")?.complete ? "Ready" : "Needs backup", ready: handoffReadiness.steps.find((step) => step.id === "field-handoff")?.complete },
      ];

      return (
        <div className="co-estimates-shell-workflow-panel co-estimates-shell-handoff-panel" role="region" aria-label="Estimate handoff and convert review">
          <div className="co-estimates-shell-workflow-head">
            <div>
              <Badge tone={handoffReadiness.converted || handoffCanConvert ? "green" : selectedEstimateStatus === "approved" ? "amber" : "slate"}>
                {handoffReadiness.converted ? "Converted" : handoffCanConvert ? "Ready to convert" : "Review first"}
              </Badge>
              <h3>Handoff / Convert</h3>
              <p>Review approved estimate-to-job readiness before a human-confirmed draft job is created. No crew, schedule, billing, customer contact, or field visibility is automated here.</p>
            </div>
            <StatusBadge status={estimateStatusLabel(selectedEstimateStatus)} />
          </div>
          <div className="co-estimates-shell-workflow-context">
            <span><em>Customer</em><strong>{estimateDisplayCustomer(estimate) || "Customer pending"}</strong></span>
            <span><em>Contact</em><strong>{detailEstimateCustomerEmail || estimate?.customerPhone || "Missing"}</strong></span>
            <span><em>Job</em><strong>{selectedEstimate?.jobId ? `Linked ${selectedEstimate.jobId}` : "Not converted"}</strong></span>
          </div>
          <div className="co-estimates-shell-handoff-grid">
            <div className="co-estimates-shell-handoff-main">
              <EstimateJobHandoffReadinessCard readiness={handoffReadiness} />
              <div className="co-estimates-shell-handoff-card">
                <span>Field-safe handoff summary</span>
                <strong>{handoffReadiness.readyForJob ? "Ready for draft job setup" : handoffReadiness.status}</strong>
                <p>Foreman handoff output stays field-safe: scope, quantities, references, required reports/photos/tickets, and change-order warnings only. Customer pricing, margin, internal backup rows, and private source URLs stay out of the field packet.</p>
              </div>
              {handoffPermissionNote ? (
                <div className="co-estimates-shell-handoff-note">
                  <strong>Read-only job creation</strong>
                  <span>{handoffPermissionNote} The server convert endpoint still authorizes through estimate management; backend tightening is flagged as a separate follow-up.</span>
                </div>
              ) : null}
            </div>
            <aside className="co-estimates-shell-handoff-side">
              {handoffReadyFacts.map((fact) => (
                <div key={fact.label} data-state={fact.ready ? "ready" : "needs"}>
                  <span>{fact.label}</span>
                  <strong>{fact.value}</strong>
                </div>
              ))}
              <div data-state="manual">
                <span>Automation boundary</span>
                <strong>Manual setup after convert</strong>
                <p>Schedule, crew, billing, customer contact, and field visibility still require separate office review.</p>
              </div>
            </aside>
          </div>
          <div className="co-estimates-shell-workflow-actions">
            <Button
              type="button"
              variant="secondary"
              onClick={() => onPrintEstimateForemanHandoff?.(detailEstimatePreview, fieldSafePacketSettings)}
              disabled={!detailEstimatePreview || !canUseGcPackets}
            >
              Print foreman handoff
            </Button>
            {handoffCanConvert ? (
              <Button type="button" onClick={handleConvertEstimateShellHandoff} disabled={busy}>
                Convert to job
              </Button>
            ) : null}
            <Button type="button" variant="secondary" onClick={() => setEstimateShellMode("overview")}>Return to overview</Button>
          </div>
        </div>
      );
    }

    function renderEstimateShellModePlaceholder() {
      if (activeShellMode.id === "overview") return null;
      if (activeShellMode.id === "pricing") return renderEstimateShellPricingMode();
      if (activeShellMode.id === "proposal") return renderEstimateShellProposalMode();
      if (activeShellMode.id === "backup") return renderEstimateShellBackupMode();
      if (activeShellMode.id === "packet") return renderEstimateShellPacketMode();
      if (activeShellMode.id === "roughNotes") return renderEstimateShellRoughNotesMode();
      if (activeShellMode.id === "takeoff") return renderEstimateShellTakeoffMode();
      if (activeShellMode.id === "visualPreview") return renderEstimateShellVisualPreviewMode();
      if (activeShellMode.id === "sendReview") return renderEstimateShellSendReviewMode();
      if (activeShellMode.id === "handoff") return renderEstimateShellHandoffMode();
      return (
        <div className="co-estimates-shell-mode-placeholder" role="region" aria-label={`${activeShellMode.title} placeholder`}>
          <Badge tone="slate">Full tool migration pending</Badge>
          <h3>{activeShellMode.title}</h3>
          <p>This no-drawer shell mode will manage {activeShellMode.manages}</p>
          <ul>
            <li>No writes or pricing mutations run from this placeholder.</li>
            <li>No customer send, job conversion, or AI generation is triggered.</li>
            <li>Existing full estimate tools remain the safe path for actual work.</li>
          </ul>
          <Button type="button" variant="secondary" onClick={() => setEstimateShellMode("overview")}>Return to overview</Button>
        </div>
      );
    }

    return (
      <div className="co-estimates-shell-detail-scroll">
        <div className="co-apex-selected-record">
          <Badge tone={item?.tone || "blue"}>{item?.eyebrow || "Selected Estimate"}</Badge>
          <h2>{estimateDisplayTitle(estimate)}</h2>
          <p>{[estimateDisplayCustomer(estimate), estimateDisplayLead(estimate)].filter(Boolean).join(" / ") || "Customer or lead pending"}</p>
        </div>
        <div className="co-estimates-shell-mode-tabs" role="tablist" aria-label="Estimate shell detail modes">
          {visibleEstimateShellModes.map((mode) => (
            <button
              key={mode.id}
              type="button"
              role="tab"
              aria-selected={activeShellMode.id === mode.id}
              className={activeShellMode.id === mode.id ? "is-active" : ""}
              onClick={() => setEstimateShellMode(mode.id)}
            >
              {mode.label}
            </button>
          ))}
        </div>
        {renderEstimateShellModePlaceholder()}
        {isFocusedShellEditMode ? null : (
          <>
            <div className="co-apex-selected-facts co-estimates-shell-selected-facts">
              <span><em>Status</em><strong>{estimateStatusLabel(status)}</strong></span>
              <span><em>Total</em><strong>{formatEstimateCurrency(readiness.optionTotals.totalWithSelectedOptions)}</strong></span>
              <span><em>Base</em><strong>{formatEstimateCurrency(readiness.totals.grandTotal)}</strong></span>
              <span><em>Contact</em><strong>{estimateCustomerEmail(estimate) || "Missing"}</strong></span>
              <span><em>Line Items</em><strong>{estimate.items?.length || 0}</strong></span>
              <span><em>Job</em><strong>{estimate.jobId ? "Converted" : "Not converted"}</strong></span>
            </div>
            <div className="co-estimates-shell-readiness-grid">
              <div data-state={readiness.hasPricing ? "ready" : "needs"}>
                <span>Pricing</span>
                <strong>{readiness.hasPricing ? "Ready" : "Needs price"}</strong>
                <p>Uses existing estimate totals only.</p>
              </div>
              <div data-state={proposalReadyCount === 4 ? "ready" : "needs"}>
                <span>Proposal</span>
                <strong>{proposalReadyCount} / 4</strong>
                <p>Customer, contact, scope, and pricing.</p>
              </div>
              <div data-state={readiness.packetReady ? "ready" : "needs"}>
                <span>Packet</span>
                <strong>{readiness.packetReady ? "Ready enough" : "Needs backup"}</strong>
                <p>{canUseGcPackets ? "GC packet remains package-gated." : "GC packet tools unavailable for this package."}</p>
              </div>
              <div data-state={handoffReadiness.readyForJob ? "ready" : "needs"}>
                <span>Handoff</span>
                <strong>{handoffReadiness.readyCount} / {handoffReadiness.totalCount}</strong>
                <p>{handoffReadiness.status}</p>
              </div>
            </div>
            <EstimateJobHandoffReadinessCard readiness={handoffReadiness} />
            <div className="co-apex-selected-next">
              <span>Next safe action</span>
              <strong>{nextSafeAction}</strong>
              <p>The shell keeps estimate work review-first. Send review and convert-to-job remain outside this screen until their dedicated slices.</p>
            </div>
          </>
        )}
        {copyFeedback ? <p className="co-estimates-shell-feedback">{copyFeedback}</p> : null}
        {isFocusedShellEditMode ? null : (
          <div className="co-apex-selected-actions">
            {safeActions.map((action, index) => (
              <Button key={action.id} type="button" variant={action.variant || (index === 0 ? "primary" : "secondary")} onClick={action.onClick} disabled={action.disabled}>
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </div>
    );
  }

  const estimateShellAssistantPrioritiesForMode = estimateShellMode === "pricing"
    ? [
      { value: detailDraft.items?.length || 0, label: "line items", tone: detailDraft.items?.length ? "blue" : "orange" },
      { value: formatEstimateCurrency(detailTotals.subtotal), label: "subtotal", tone: detailTotals.subtotal ? "green" : "slate" },
      { value: formatEstimateCurrency(detailTotals.taxTotal || 0), label: "tax", tone: detailTotals.taxTotal ? "blue" : "slate" },
      { value: formatEstimateCurrency(detailTotals.feesTotal || 0), label: "fees", tone: detailTotals.feesTotal ? "blue" : "slate" },
    ]
    : estimateShellMode === "proposal"
      ? [
        { value: detailProposalSections.scopeOfWork ? 1 : 0, label: "scope", tone: detailProposalSections.scopeOfWork ? "green" : "orange" },
        { value: detailProposalSections.inclusions ? 1 : 0, label: "inclusions", tone: detailProposalSections.inclusions ? "green" : "slate" },
        { value: (detailProposalSections.alternates?.length || 0) + (detailProposalSections.addOns?.length || 0), label: "options", tone: (detailProposalSections.alternates?.length || 0) + (detailProposalSections.addOns?.length || 0) ? "blue" : "slate" },
        { value: detailProposalSections.customerNotes ? 1 : 0, label: "terms", tone: detailProposalSections.customerNotes ? "green" : "slate" },
      ]
      : estimateShellMode === "backup"
        ? [
          { value: detailEstimateBackup.sovRows?.length || 0, label: "SOV rows", tone: detailEstimateBackup.sovRows?.length ? "amber" : "slate" },
          { value: detailEstimateBackup.notes ? 1 : 0, label: "backup notes", tone: detailEstimateBackup.notes ? "amber" : "slate" },
          { value: canManage ? 1 : 0, label: canManage ? "editable" : "read only", tone: canManage ? "blue" : "slate" },
          { value: 0, label: "customer exposure", tone: "green" },
        ]
        : estimateShellMode === "packet"
          ? [
            { value: packetPrintSettings.sectionIds.length, label: "sections", tone: packetPrintSettings.sectionIds.length ? "violet" : "slate" },
            { value: canUseGcPackets ? `${detailGcPacketReadyCount}/${detailGcPacketTotalCount}` : 0, label: "bid notes ready", tone: canUseGcPackets && detailGcPacketReadyCount ? "violet" : "slate" },
            { value: packetPrintSettings.allowInternalSections ? 1 : 0, label: packetPrintSettings.allowInternalSections ? "office packet" : "customer safe", tone: packetPrintSettings.allowInternalSections ? "amber" : "green" },
            { value: canUseGcPackets ? 1 : 0, label: canUseGcPackets ? "entitled" : "locked", tone: canUseGcPackets ? "green" : "slate" },
          ]
          : estimateShellMode === "roughNotes"
            ? [
              { value: estimateRoughNotesText(roughNotes) ? 1 : 0, label: "notes ready", tone: estimateRoughNotesText(roughNotes) ? "orange" : "slate" },
              { value: estimateRoughNotesHasSuggestions(roughNotesState.result) ? 1 : 0, label: "suggestions", tone: estimateRoughNotesHasSuggestions(roughNotesState.result) ? "green" : "slate" },
              { value: canUseAiRoughNotes ? 1 : 0, label: canUseAiRoughNotes ? "entitled" : "locked", tone: canUseAiRoughNotes ? "green" : "slate" },
              { value: 0, label: "auto actions", tone: "green" },
            ]
            : estimateShellMode === "takeoff"
              ? [
                { value: detailEstimateBackup.fenceTakeoff?.segments?.length || 0, label: "segments", tone: detailEstimateBackup.fenceTakeoff?.segments?.length ? "green" : "orange" },
                { value: detailEstimateBackup.fenceTakeoff?.totalLinearFeet || 0, label: "LF", tone: detailEstimateBackup.fenceTakeoff?.totalLinearFeet ? "green" : "slate" },
                { value: detailFenceTakeoffReadiness.manualSegmentCount || 0, label: "manual", tone: detailFenceTakeoffReadiness.manualSegmentCount ? "amber" : "slate" },
                { value: canManage ? 1 : 0, label: canManage ? "editable" : "locked", tone: canManage ? "green" : "slate" },
              ]
              : estimateShellMode === "visualPreview"
                ? [
                  { value: visualPreviewPacket.referenceCount || 0, label: "references", tone: visualPreviewPacket.referenceCount ? "blue" : "orange" },
                  { value: visualPreviewPacket.missingReviewItems.length, label: "review gaps", tone: visualPreviewPacket.missingReviewItems.length ? "amber" : "green" },
                  { value: canRequestEstimateVisualPreview(visualPreviewPacket) ? 1 : 0, label: "ready", tone: canRequestEstimateVisualPreview(visualPreviewPacket) ? "green" : "slate" },
                  { value: 0, label: "writes", tone: "green" },
                ]
                : estimateShellMode === "sendReview"
                  ? [
                    { value: detailEstimateCustomerEmail ? 1 : 0, label: detailEstimateCustomerEmail ? "recipient" : "no recipient", tone: detailEstimateCustomerEmail ? "green" : "orange" },
                    { value: emailSendingConfigured ? 1 : 0, label: emailSendingConfigured ? "email ready" : "manual copy", tone: emailSendingConfigured ? "blue" : "amber" },
                    { value: formatEstimateCurrency(detailOptionTotals.totalWithSelectedOptions), label: "review total", tone: detailOptionTotals.totalWithSelectedOptions ? "green" : "slate" },
                    { value: 0, label: "auto sends", tone: "green" },
                  ]
                  : estimateShellMode === "handoff"
                    ? [
                      { value: detailEstimateHandoffReadiness.readyCount, label: "ready checks", tone: detailEstimateHandoffReadiness.readyForJob || detailEstimateHandoffReadiness.converted ? "green" : "amber" },
                      { value: selectedEstimate?.jobId ? 1 : 0, label: selectedEstimate?.jobId ? "job linked" : "not linked", tone: selectedEstimate?.jobId ? "green" : "slate" },
                      { value: permissions?.jobs?.canCreate ? 1 : 0, label: permissions?.jobs?.canCreate ? "job create" : "read only", tone: permissions?.jobs?.canCreate ? "blue" : "amber" },
                      { value: 0, label: "auto setup", tone: "green" },
                    ]
    : [
      { value: draftToPriceRows.length, label: "drafts to price", tone: draftToPriceRows.length ? "orange" : "green" },
      { value: readyToSendRows.length, label: "ready to send", tone: readyToSendRows.length ? "blue" : "slate" },
      { value: sentToWinRows.length, label: "sent to win", tone: sentToWinRows.length ? "amber" : "slate" },
      { value: approvedHandoffRows.length, label: "handoffs", tone: approvedHandoffRows.length ? "green" : "slate" },
    ];
  const estimateShellAssistantActionsForMode = estimateShellMode === "pricing"
    ? [
      { label: "Review Pricing", icon: "document", onClick: () => setEstimateShellMode("pricing"), disabled: !selectedEstimate },
      { label: "Overview", icon: "briefcase", onClick: () => setEstimateShellMode("overview") },
    ]
    : estimateShellMode === "proposal"
      ? [
        { label: "Edit Proposal", icon: "clipboard", onClick: () => setEstimateShellMode("proposal"), disabled: !selectedEstimate },
        { label: "Overview", icon: "briefcase", onClick: () => setEstimateShellMode("overview") },
      ]
      : estimateShellMode === "backup"
        ? [
          { label: "Review Backup", icon: "clipboard", onClick: () => setEstimateShellMode("backup"), disabled: !selectedEstimate },
          { label: "Overview", icon: "briefcase", onClick: () => setEstimateShellMode("overview") },
        ]
        : estimateShellMode === "packet"
          ? [
            { label: "Review Packet", icon: "clipboard", onClick: () => setEstimateShellMode("packet"), disabled: !selectedEstimate },
            { label: "Overview", icon: "briefcase", onClick: () => setEstimateShellMode("overview") },
          ]
          : estimateShellMode === "roughNotes"
            ? [
              { label: "Rough Notes", icon: "spark", onClick: () => setEstimateShellMode("roughNotes"), disabled: !selectedEstimate },
              { label: "Overview", icon: "briefcase", onClick: () => setEstimateShellMode("overview") },
            ]
            : estimateShellMode === "takeoff"
              ? [
                { label: "Takeoff", icon: "layers", onClick: () => setEstimateShellMode("takeoff"), disabled: !selectedEstimate },
                { label: "Visual Preview", icon: "photo", onClick: () => setEstimateShellMode("visualPreview"), disabled: !selectedEstimate },
                { label: "Overview", icon: "briefcase", onClick: () => setEstimateShellMode("overview") },
              ]
              : estimateShellMode === "visualPreview"
                ? [
                  { label: "Copy Prompt", icon: "photo", onClick: () => copyEstimateText(() => visualPreviewPacket.prompt, "Visual preview prompt copied. Review it before using any image generator."), disabled: !selectedEstimate },
                  { label: "Takeoff", icon: "layers", onClick: () => setEstimateShellMode("takeoff"), disabled: !selectedEstimate },
                  { label: "Overview", icon: "briefcase", onClick: () => setEstimateShellMode("overview") },
                ]
                : estimateShellMode === "sendReview"
                  ? [
                    { label: "Copy Message", icon: "quote", onClick: () => copyEstimateText(() => buildEstimateCustomerMessage({ companyName, companyProfile, estimate: detailEstimatePreview }), "Customer message copied for manual review."), disabled: !selectedEstimate },
                    { label: "Print Proposal", icon: "document", onClick: () => onPrintEstimate?.(detailEstimatePreview, { ...packetPrintSettings, allowInternalSections: false }), disabled: !selectedEstimate },
                    { label: emailSendingConfigured ? "Send Review" : "Manual Mode", icon: "arrowUpRight", onClick: emailSendingConfigured ? handleSendEstimate : () => copyEstimateText(() => buildEstimateCustomerMessage({ companyName, companyProfile, estimate: detailEstimatePreview }), "Manual send mode: customer message copied."), disabled: !selectedEstimate || (emailSendingConfigured && (!canManage || !detailEstimateCustomerEmail || busy)) },
                  ]
                  : estimateShellMode === "handoff"
                    ? [
                      { label: "Print Handoff", icon: "document", onClick: () => onPrintEstimateForemanHandoff?.(detailEstimatePreview, { ...packetPrintSettings, allowInternalSections: false }), disabled: !selectedEstimate || !canUseGcPackets },
                      { label: "Handoff", icon: "check", onClick: () => setEstimateShellMode("handoff"), disabled: !selectedEstimate },
                      { label: "Overview", icon: "briefcase", onClick: () => setEstimateShellMode("overview") },
                    ]
    : estimateShellAssistantActions;
  const estimateShellQuickActionsForMode = estimateShellMode === "pricing"
    ? [
      { id: "pricing-mode", label: "Pricing", icon: "document", onClick: () => setEstimateShellMode("pricing"), disabled: !selectedEstimate },
      { id: "pricing-overview", label: "Overview", icon: "briefcase", onClick: () => setEstimateShellMode("overview") },
    ]
    : estimateShellMode === "proposal"
      ? [
        { id: "proposal-mode", label: "Proposal", icon: "clipboard", onClick: () => setEstimateShellMode("proposal"), disabled: !selectedEstimate },
        { id: "proposal-overview", label: "Overview", icon: "briefcase", onClick: () => setEstimateShellMode("overview") },
      ]
      : estimateShellMode === "backup"
        ? [
          { id: "backup-mode", label: "Backup", icon: "clipboard", onClick: () => setEstimateShellMode("backup"), disabled: !selectedEstimate },
          { id: "backup-overview", label: "Overview", icon: "briefcase", onClick: () => setEstimateShellMode("overview") },
        ]
        : estimateShellMode === "packet"
          ? [
            { id: "packet-mode", label: "Packet", icon: "clipboard", onClick: () => setEstimateShellMode("packet"), disabled: !selectedEstimate },
            { id: "packet-overview", label: "Overview", icon: "briefcase", onClick: () => setEstimateShellMode("overview") },
          ]
          : estimateShellMode === "roughNotes"
            ? [
              { id: "rough-notes-mode", label: "Rough Notes", icon: "spark", onClick: () => setEstimateShellMode("roughNotes"), disabled: !selectedEstimate },
              { id: "rough-notes-overview", label: "Overview", icon: "briefcase", onClick: () => setEstimateShellMode("overview") },
            ]
            : estimateShellMode === "takeoff"
              ? [
                { id: "takeoff-mode", label: "Takeoff", icon: "layers", onClick: () => setEstimateShellMode("takeoff"), disabled: !selectedEstimate },
                { id: "takeoff-visual", label: "Visual", icon: "photo", onClick: () => setEstimateShellMode("visualPreview"), disabled: !selectedEstimate },
                { id: "takeoff-overview", label: "Overview", icon: "briefcase", onClick: () => setEstimateShellMode("overview") },
              ]
              : estimateShellMode === "visualPreview"
                ? [
                  { id: "visual-copy", label: "Copy Prompt", icon: "photo", onClick: () => copyEstimateText(() => visualPreviewPacket.prompt, "Visual preview prompt copied. Review it before using any image generator."), disabled: !selectedEstimate },
                  { id: "visual-takeoff", label: "Takeoff", icon: "layers", onClick: () => setEstimateShellMode("takeoff"), disabled: !selectedEstimate },
                  { id: "visual-overview", label: "Overview", icon: "briefcase", onClick: () => setEstimateShellMode("overview") },
                ]
                : estimateShellMode === "sendReview"
                  ? [
                    { id: "send-copy", label: "Copy", icon: "quote", onClick: () => copyEstimateText(() => buildEstimateCustomerMessage({ companyName, companyProfile, estimate: detailEstimatePreview }), "Customer message copied for manual review."), disabled: !selectedEstimate },
                    { id: "send-print", label: "Print", icon: "document", onClick: () => onPrintEstimate?.(detailEstimatePreview, { ...packetPrintSettings, allowInternalSections: false }), disabled: !selectedEstimate },
                    { id: "send-action", label: emailSendingConfigured ? "Send" : "Manual", icon: "arrowUpRight", onClick: emailSendingConfigured ? handleSendEstimate : () => copyEstimateText(() => buildEstimateCustomerMessage({ companyName, companyProfile, estimate: detailEstimatePreview }), "Manual send mode: customer message copied."), disabled: !selectedEstimate || (emailSendingConfigured && (!canManage || !detailEstimateCustomerEmail || busy)) },
                  ]
                  : estimateShellMode === "handoff"
                    ? [
                      { id: "handoff-print", label: "Print", icon: "document", onClick: () => onPrintEstimateForemanHandoff?.(detailEstimatePreview, { ...packetPrintSettings, allowInternalSections: false }), disabled: !selectedEstimate || !canUseGcPackets },
                      { id: "handoff-review", label: "Handoff", icon: "check", onClick: () => setEstimateShellMode("handoff"), disabled: !selectedEstimate },
                      { id: "handoff-overview", label: "Overview", icon: "briefcase", onClick: () => setEstimateShellMode("overview") },
                    ]
    : estimateShellQuickActions;
  const estimateShellGuardrailsForMode = estimateShellMode === "pricing"
    ? [
      "Pricing fields only",
      "Minimal estimate save payload",
      "Field roles stay blocked from estimates",
    ]
    : estimateShellMode === "proposal"
      ? [
        "Proposal fields only",
        "No send or conversion actions",
        "Field roles stay blocked from estimates",
      ]
      : estimateShellMode === "backup"
        ? [
          "Internal backup only",
          "No customer packet settings",
          "Field roles stay blocked from estimates",
        ]
        : estimateShellMode === "packet"
          ? [
            "Packet readiness only",
            "No send, convert, AI, takeoff, or handoff actions",
            "Field roles stay blocked from estimates",
          ]
          : estimateShellMode === "roughNotes"
            ? [
              "Review-first AI only",
              "No save, send, convert, takeoff, or handoff actions",
              "Field roles stay blocked from estimates",
            ]
            : estimateShellMode === "takeoff"
              ? [
                "Apply Quantities is local only",
                "Save uses reviewed draft payload",
                "Field roles stay blocked from estimates",
              ]
              : estimateShellMode === "visualPreview"
                ? [
                  "Copy prompt only",
                  "No image generation or estimate writes",
                  "Private URLs stay out of prompts",
                ]
                : estimateShellMode === "sendReview"
                  ? [
                    "Explicit human confirmation required for configured sends",
                    "Manual mode copies only and never calls send endpoint",
                    "No convert or handoff controls",
                  ]
                  : estimateShellMode === "handoff"
                    ? [
                      "Approved unconverted estimates only",
                      "Requires estimate manage plus job create permission",
                      "No schedule, crew, billing, customer contact, or field visibility automation",
                    ]
    : [
      "Overview/readiness only",
      "No automatic sends or job conversion",
      "Field roles stay blocked from estimates",
    ];

  if (!permissions?.estimates?.canView) {
    return (
      <div className="co-office-page co-estimates-page">
        <PageHeader eyebrow="Office Sales" title="Estimates" description="Estimates are only available to office and estimator roles." />
        <div className="px-5 sm:px-6 lg:px-8">
          <StateCard title="Estimate access unavailable" description="Field roles are blocked from estimates, proposal totals, and pricing." tone="slate" />
        </div>
      </div>
    );
  }

  const canUseEstimatorMobilePipeline = Boolean(MobilePipelinePage) && isEstimatorMobilePipelineUser(user, permissions);

  if (canUseEstimatesCommandShell) {
    return (
      <>
      {canUseEstimatorMobilePipeline ? (
        <div className="co-sales-mobile-only">
          <MobilePipelinePage
            user={user}
            companyName={companyName}
            leads={leads}
            estimates={estimates}
            customers={customers}
            permissions={permissions}
            setActive={setActive}
            onSelectLead={onSelectLead}
            onSelectCustomer={onSelectCustomer}
            onOpenEstimate={(id) => {
              setEstimateViewMode("browse");
              setSelectedEstimateId(id);
              setActive?.("estimates");
            }}
            activeModule="estimates"
          />
        </div>
      ) : null}
      {canUseEstimatorMobilePipeline ? (
        <div className="co-sales-tablet-only">
          <MobilePipelinePage
            user={user}
            companyName={companyName}
            leads={leads}
            estimates={estimates}
            customers={customers}
            permissions={permissions}
            setActive={setActive}
            onSelectLead={onSelectLead}
            onSelectCustomer={onSelectCustomer}
            onOpenEstimate={(id) => {
              setEstimateViewMode("browse");
              setSelectedEstimateId(id);
              setActive?.("estimates");
            }}
            activeModule="estimates"
          />
        </div>
      ) : null}
      <div className={canUseEstimatorMobilePipeline ? "co-sales-mobile-desktop-content" : ""}>
      <div className="co-office-page co-estimates-page co-estimates-shell-page">
        <ApexOfficeCommandShell
          eyebrow="Office Sales"
          title="Estimates"
          description="Review pricing readiness, send-ready proposals, sent follow-up, and approved handoffs from one no-drawer command view."
          kpis={estimateShellKpis}
          queue={{
            title: "Estimate priority queue",
            description: `${estimateShellQueue.length} proposal item${estimateShellQueue.length === 1 ? "" : "s"} shown from pricing, send, follow-up, and handoff readiness.`,
            items: estimateShellQueue,
            selectedId: estimateShellSelectedId,
            onSelect: selectEstimateShellItem,
            emptyState: <StateCard title="Estimate queue clear" description="Drafts to price, send-ready proposals, sent follow-ups, and approved handoffs appear here when they need review." tone="green" />,
          }}
          detail={{
            title: "Estimate overview",
            item: selectedEstimateShellItem,
            render: renderEstimateShellDetail,
            emptyState: <StateCard title="No estimate selected" description="Select an estimate from the queue to review proposal readiness." tone="slate" />,
          }}
          assistant={{
            title: "Estimates",
            description: estimateShellAssistantDescription,
            priorities: estimateShellAssistantPrioritiesForMode,
            actions: estimateShellAssistantActionsForMode,
            guardrails: estimateShellGuardrailsForMode,
          }}
          quickActions={estimateShellQuickActionsForMode}
          className="co-estimates-command-shell"
        />
      </div>
      </div>
      </>
    );
  }

  return (
    <>
    {canUseEstimatorMobilePipeline ? (
      <div className="co-sales-mobile-only">
        <MobilePipelinePage
          user={user}
          companyName={companyName}
          leads={leads}
          estimates={estimates}
          customers={customers}
          permissions={permissions}
          setActive={setActive}
          onSelectLead={onSelectLead}
          onSelectCustomer={onSelectCustomer}
          onOpenEstimate={(id) => {
            setEstimateViewMode("browse");
            setSelectedEstimateId(id);
            setActive?.("estimates");
          }}
          activeModule="estimates"
        />
      </div>
    ) : null}
    {canUseEstimatorMobilePipeline ? (
      <div className="co-sales-tablet-only">
        <MobilePipelinePage
          user={user}
          companyName={companyName}
          leads={leads}
          estimates={estimates}
          customers={customers}
          permissions={permissions}
          setActive={setActive}
          onSelectLead={onSelectLead}
          onSelectCustomer={onSelectCustomer}
          onOpenEstimate={(id) => {
            setEstimateViewMode("browse");
            setSelectedEstimateId(id);
            setActive?.("estimates");
          }}
          activeModule="estimates"
        />
      </div>
    ) : null}
    <div className={canUseEstimatorMobilePipeline ? "co-sales-mobile-desktop-content" : ""}>
    <div className="co-office-page co-estimates-page">
      <PageHeader
        eyebrow="Office Sales"
        title="Estimate Studio"
        description="Build proposal options, review pricing, assemble packet backup, and move approved work into jobs."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => openEstimateTool("edit")}>{filteredRows.length} visible estimates</Button>
            {canManage ? <Button type="button" onClick={focusNewEstimate}>New Estimate</Button> : null}
          </div>
        }
      />
      <div className="co-estimates-kpi-grid mx-auto grid w-full max-w-[1520px] min-w-0 grid-cols-1 gap-3 px-5 pb-3 sm:px-6 md:grid-cols-5 lg:px-6">
        {estimateKpis.map((item) => <CommandCenterKpiCard key={item.label} item={item} />)}
      </div>

      <EstimateStudioShell
        options={estimateStudioOptions}
        selectedOptionId={selectedEstimate?.id || ""}
        onSelectOption={(id) => {
          setEstimateViewMode("browse");
          setSelectedEstimateId(id);
        }}
        packetTiles={estimatePacketTiles}
        assistantActions={estimateAssistantActions}
        sidebar={(
          <EstimateCommandRailPolished
            estimate={selectedEstimate}
            preview={detailEstimatePreview}
            totals={detailTotals}
            optionTotals={detailOptionTotals}
            companyName={companyName}
            companyProfile={companyProfile}
            canManage={canManage}
            canUseAiRoughNotes={canUseAiRoughNotes}
            canUseGcPackets={canUseGcPackets}
            busy={busy}
            detailSaveDisabled={detailSaveDisabled}
            canMarkSent={canMarkSent}
            copyFeedback={copyFeedback}
            emailSendingConfigured={emailSendingConfigured}
            newDraftMode={estimateViewMode === "create"}
            onSave={() => onSaveEstimate(selectedEstimate.id, detailDraft)}
            onMarkSent={() => onSaveEstimate(selectedEstimate.id, { ...detailDraft, status: "sent" })}
            onMarkApproved={() => onSaveEstimate(selectedEstimate.id, { ...detailDraft, status: "approved" })}
            onConvert={handleConvertApprovedEstimate}
            onPrint={() => onPrintEstimate?.(detailEstimatePreview, packetPrintSettings)}
            onPrintForemanHandoff={() => onPrintEstimateForemanHandoff?.(detailEstimatePreview, packetPrintSettings)}
            onSend={handleSendEstimate}
            onCopyEstimate={() => copyEstimateText(
              () => buildEstimateCopyText({ companyName, companyProfile, estimate: detailEstimatePreview }),
              "Estimate copied.",
            )}
            onCopyCustomerMessage={() => copyEstimateText(
              () => buildEstimateCustomerMessage({ companyName, companyProfile, estimate: detailEstimatePreview }),
              "Customer message copied.",
            )}
            onOpenTool={openEstimateTool}
          />
        )}
      >
          <EstimateProposalWorkbench
            estimate={selectedEstimate}
            preview={detailEstimatePreview}
            totals={detailTotals}
            optionTotals={detailOptionTotals}
            sections={detailProposalSections}
            backup={detailEstimateBackup}
            companyName={companyName}
            companyProfile={companyProfile}
            canManage={canManage}
            filteredRows={filteredRows}
            rows={rows}
            listState={listState}
            statusFilter={statusFilter}
            customerFilter={customerFilter}
            leadFilter={leadFilter}
            creatorFilter={creatorFilter}
            archiveFilter={archiveFilter}
            search={search}
            selectedId={selectedEstimate?.id}
            visibleEstimateRowCap={visibleEstimateRowCap}
            onSelect={(id) => {
              setEstimateViewMode("browse");
              setSelectedEstimateId(id);
            }}
            onOpenTool={openEstimateTool}
            onFocusNewEstimate={focusNewEstimate}
            onStatusFilter={setStatusFilter}
            onSearch={setSearch}
            onCustomerFilter={setCustomerFilter}
            onLeadFilter={setLeadFilter}
            onCreatorFilter={setCreatorFilter}
            onArchiveFilter={setArchiveFilter}
            onShowMore={() => setVisibleEstimateRowCap((current) => current + 6)}
            onShowLess={() => setVisibleEstimateRowCap(6)}
            onClearFilters={() => { setStatusFilter("All"); setCustomerFilter("All customers"); setLeadFilter("All leads"); setCreatorFilter("All creators"); setArchiveFilter("Active"); setSearch(""); setVisibleEstimateRowCap(6); }}
          />
      </EstimateStudioShell>

      <details
        ref={newEstimateRef}
        className="co-estimates-tools-drawer mx-auto w-full max-w-[1520px] min-w-0 px-5 pb-4 sm:px-6 lg:px-8"
        open={showEstimateTools}
        onToggle={(event) => setShowEstimateTools(event.currentTarget.open)}
      >
        <summary>
          <span>
            <strong>Estimate Studio Tools</strong>
            <em>Create, edit, price, packet, and proposal backup tools stay available here.</em>
          </span>
          <span>Open tools</span>
        </summary>
        <div className="co-estimates-tool-tabs mt-3 flex min-w-0 gap-2 overflow-x-auto pb-1">
          {estimateToolTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={activeEstimateTool === tab.id ? "is-active" : ""}
              onClick={() => {
                if (tab.id === "create") {
                  setEstimateViewMode("create");
                  setSelectedEstimateId("");
                } else if (tab.id === "roughNotes" && estimateViewMode === "create") {
                  setSelectedEstimateId("");
                } else {
                  setEstimateViewMode("browse");
                }
                setActiveEstimateTool(tab.id);
              }}
            >
              {tab.label}
              <span>{tab.count}</span>
            </button>
          ))}
        </div>
        <div className="co-estimates-tools-panel mt-3">
          {activeEstimateTool === "create" ? (
            <Card className="p-4">
              <SectionHeader title="New Estimate" description="Create a customer-ready proposal with scope, terms, line items, and a clear total." />
              {canManage ? (
                <>
                  <div className="grid gap-3 md:grid-cols-2">
                    <InputField label="Customer / company name" value={createDraft.customerName} onChange={(event) => setCreateDraft((current) => updateDraftLinkFields(current, { customerName: event.target.value }))} placeholder="Martinez Concrete LLC" />
                    <SelectField label="Customer" value={createDraft.customerId} onChange={(event) => setCreateDraft((current) => updateDraftLinkFields(current, { customerId: event.target.value }))}>
                      <option value="">Select a customer</option>
                      {visibleCustomers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
                    </SelectField>
                    <SelectField label="Lead" value={createDraft.leadId} onChange={(event) => setCreateDraft((current) => updateDraftLinkFields(current, { leadId: event.target.value }))}>
                      <option value="">Optional linked lead</option>
                      {visibleLeads.map((lead) => <option key={lead.id} value={lead.id}>{`${lead.customer} - ${lead.project}`}</option>)}
                    </SelectField>
                    <InputField label="Customer email / Send estimate to" value={createDraft.customerEmail} onChange={(event) => setCreateDraft((current) => ({ ...current, customerEmail: event.target.value }))} placeholder="customer@example.com" />
                    <InputField label="Title" value={createDraft.title} onChange={(event) => setCreateDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Martinez driveway proposal" />
                    <SelectField label="Starting status" value={createDraft.status} onChange={(event) => setCreateDraft((current) => ({ ...current, status: event.target.value }))}>
                      {["draft", "sent", "approved", "rejected"].map((option) => <option key={option} value={option}>{estimateStatusLabel(option)}</option>)}
                    </SelectField>
                    <InputField label="Tax rate (%)" value={createDraft.taxRate} onChange={(event) => setCreateDraft((current) => ({ ...current, taxRate: event.target.value }))} placeholder="Optional" inputMode="decimal" />
                    <InputField label="Fees total" value={createDraft.feesTotal} onChange={(event) => setCreateDraft((current) => ({ ...current, feesTotal: event.target.value }))} placeholder="Optional" inputMode="decimal" />
                  </div>
                  <div className="mt-3">
                    <EstimateStarterPanel setDraft={setCreateDraft} normalizeDraft={createEstimateDraft} disabled={busy} tradeId={estimatePrimaryTrade} />
                  </div>
                  <div className="mt-4 space-y-3">
                    <SectionHeader title="Line items" description="Line totals update automatically from quantity and unit price." />
                    {createDraft.items.map((item, index) => (
                      <div key={item.id} className="co-estimates-line-card rounded-2xl border p-3">
                        <div className="grid gap-3 md:grid-cols-[minmax(0,1.6fr)_110px_110px_130px]">
                          <InputField label={`Description ${index + 1}`} value={item.description} onChange={(event) => updateDraftItem(setCreateDraft, index, "description", event.target.value)} placeholder="Scope, prep, cleanup, or finish work" />
                          <InputField label="Qty" value={item.quantity} onChange={(event) => updateDraftItem(setCreateDraft, index, "quantity", event.target.value)} inputMode="decimal" />
                          <InputField label="Unit" value={item.unit} onChange={(event) => updateDraftItem(setCreateDraft, index, "unit", event.target.value)} />
                          <InputField label="Unit price" value={item.unitPrice} onChange={(event) => updateDraftItem(setCreateDraft, index, "unitPrice", event.target.value)} inputMode="decimal" />
                        </div>
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Line total: {formatEstimateCurrency(calculateEstimateLineTotal(item))}</p>
                          <button type="button" className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 hover:text-slate-950" onClick={() => removeDraftItem(setCreateDraft, index)}>Remove item</button>
                        </div>
                      </div>
                    ))}
                    <Button type="button" variant="secondary" onClick={() => appendDraftItem(setCreateDraft)}>Add line item</Button>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                    <StatCard title="Subtotal" value={formatEstimateCurrency(createTotals.subtotal)} />
                    <StatCard title="Tax" value={formatEstimateCurrency(createTotals.taxTotal || 0)} />
                    <StatCard title="Fees" value={formatEstimateCurrency(createTotals.feesTotal || 0)} />
                    <StatCard title="Selected options" value={formatEstimateCurrency(createOptionTotals.selectedOptionsTotal)} />
                    <StatCard title="Total" value={formatEstimateCurrency(createOptionTotals.totalWithSelectedOptions)} />
                  </div>
                  <details className="co-estimates-tool-disclosure mt-3">
                    <summary>
                      <span>Advanced proposal setup</span>
                      <span>SOV, sections, backup, and GC packet lite</span>
                    </summary>
                    <div className="grid gap-3 p-3">
                      <EstimateBackupEditor draft={createDraft} setDraft={setCreateDraft} disabled={busy} />
                      <EstimateProposalSectionsEditor draft={createDraft} setDraft={setCreateDraft} disabled={busy} />
                      {canUseGcPackets ? <EstimateGcPacketLiteEditor draft={createDraft} setDraft={setCreateDraft} disabled={busy} /> : null}
                    </div>
                  </details>
                  <div className="mt-4">
                  <Button
                    type="button"
                    onClick={async () => {
                      const created = await onCreateEstimate(createDraft);
                      if (created) {
                        setEstimateViewMode("browse");
                        const createdId = typeof created === "object" ? created.id : "";
                        const createdTitle = typeof created === "object" ? (created.title || createDraft.title) : createDraft.title;
                        setStatusFilter("Draft");
                        setCustomerFilter("All customers");
                        setLeadFilter("All leads");
                        setCreatorFilter("All creators");
                        setArchiveFilter("Active");
                        setSearch("");
                        if (createdId) setSelectedEstimateId(createdId);
                        setCreateDraft(createEstimateDraft({
                          ...INITIAL_ESTIMATE_FORM,
                          customerId: singleCustomerId,
                          customerName: singleCustomerName,
                          customerEmail: singleCustomerEmail,
                        }));
                        showCopyFeedback(`Draft created: ${createdTitle}. It is selected in the Estimates list.`, 7000);
                      }
                    }}
                    disabled={busy || (!createDraft.customerId && !createDraft.leadId && !createDraft.customerName) || !createDraft.title}
                  >
                    Create New Estimate
                  </Button>
                  </div>
                </>
              ) : (
                <StateCard title="Estimate creation unavailable" description="This role can review estimates but cannot create new pricing records." tone="slate" />
              )}
            </Card>
          ) : null}

          {activeEstimateTool === "roughNotes" ? (
            <Card className="p-4">
              <SectionHeader title="Rough Notes to Proposal" description="Turn field or estimator notes into clean review-only proposal and GC packet language." />
              {canManage && canUseAiRoughNotes ? (
                <EstimateRoughNotesHelper
                  roughNotes={roughNotes}
                  setRoughNotes={setRoughNotes}
                  assistant={roughNotesState}
                  onGenerate={handleGenerateEstimateRoughNotes}
                  onApplyToSelected={applyRoughNotesToSelected}
                  onApplyToNew={applyRoughNotesToNewEstimate}
                  onCreateNew={createRoughNotesEstimateDraft}
                  canApplySelected={Boolean(selectedEstimate)}
                  canCreateNew={Boolean(estimateRoughNotesHasSuggestions(roughNotesState.result))}
                  disabled={busy}
                />
              ) : (
                <StateCard title="AI rough notes unavailable" description="AI Rough Notes is available in Premium and Elite packages for office roles that can manage estimates." tone="slate" />
              )}
            </Card>
          ) : null}

          {activeEstimateTool === "edit" ? (
            <Card className="p-4">
              <SectionHeader title="Edit Estimate / Pricing" description={selectedEstimate ? "Update customer links, status, pricing fields, and line items." : "Select an estimate before editing pricing."} action={selectedEstimate ? <StatusBadge status={estimateStatusLabel(selectedEstimate.status)} /> : null} />
              {selectedEstimate ? (
                <>
                  <div className="grid gap-3 md:grid-cols-2">
                    <SelectField label="Customer" value={detailDraft.customerId} onChange={(event) => setDetailDraft((current) => updateDraftLinkEmail(current, { customerId: event.target.value }))} disabled={!canManage || busy}>
                      <option value="">Select a customer</option>
                      {visibleCustomers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
                    </SelectField>
                    <SelectField label="Lead" value={detailDraft.leadId} onChange={(event) => setDetailDraft((current) => updateDraftLinkEmail(current, { leadId: event.target.value }))} disabled={!canManage || busy}>
                      <option value="">Optional linked lead</option>
                      {visibleLeads.map((lead) => <option key={lead.id} value={lead.id}>{`${lead.customer} - ${lead.project}`}</option>)}
                    </SelectField>
                    <InputField label="Customer email / Send estimate to" value={detailDraft.customerEmail} onChange={(event) => setDetailDraft((current) => ({ ...current, customerEmail: event.target.value }))} placeholder="customer@example.com" disabled={!canManage || busy} />
                    <InputField label="Title" value={detailDraft.title} onChange={(event) => setDetailDraft((current) => ({ ...current, title: event.target.value }))} disabled={!canManage || busy} />
                    <SelectField label="Workflow status" value={detailDraft.status} onChange={(event) => setDetailDraft((current) => ({ ...current, status: event.target.value }))} disabled={!canManage || busy}>
                      {["draft", "sent", "approved", "rejected", "archived"].map((option) => <option key={option} value={option}>{estimateStatusLabel(option)}</option>)}
                    </SelectField>
                    <InputField label="Tax rate (%)" value={detailDraft.taxRate} onChange={(event) => setDetailDraft((current) => ({ ...current, taxRate: event.target.value }))} inputMode="decimal" disabled={!canManage || busy} />
                    <InputField label="Fees total" value={detailDraft.feesTotal} onChange={(event) => setDetailDraft((current) => ({ ...current, feesTotal: event.target.value }))} inputMode="decimal" disabled={!canManage || busy} />
                  </div>
                  <div className="mt-4 space-y-3">
                    <SectionHeader title="Line items" description="Office pricing stays in estimates and field roles stay blocked." />
                    {detailDraft.items.map((item, index) => (
                      <div key={item.id} className="co-estimates-line-card rounded-2xl border p-3">
                        <div className="grid gap-3 md:grid-cols-[minmax(0,1.6fr)_110px_110px_130px]">
                          <InputField label={`Description ${index + 1}`} value={item.description} onChange={(event) => updateDraftItem(setDetailDraft, index, "description", event.target.value)} disabled={!canManage || busy} />
                          <InputField label="Qty" value={item.quantity} onChange={(event) => updateDraftItem(setDetailDraft, index, "quantity", event.target.value)} inputMode="decimal" disabled={!canManage || busy} />
                          <InputField label="Unit" value={item.unit} onChange={(event) => updateDraftItem(setDetailDraft, index, "unit", event.target.value)} disabled={!canManage || busy} />
                          <InputField label="Unit price" value={item.unitPrice} onChange={(event) => updateDraftItem(setDetailDraft, index, "unitPrice", event.target.value)} inputMode="decimal" disabled={!canManage || busy} />
                        </div>
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Line total: {formatEstimateCurrency(calculateEstimateLineTotal(item))}</p>
                          <button type="button" className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 hover:text-slate-950 disabled:text-slate-300" onClick={() => removeDraftItem(setDetailDraft, index)} disabled={!canManage || busy}>Remove item</button>
                        </div>
                      </div>
                    ))}
                    <Button type="button" variant="secondary" onClick={() => appendDraftItem(setDetailDraft)} disabled={!canManage || busy}>Add line item</Button>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                    <StatCard title="Subtotal" value={formatEstimateCurrency(detailTotals.subtotal)} />
                    <StatCard title="Tax" value={formatEstimateCurrency(detailTotals.taxTotal || 0)} />
                    <StatCard title="Fees" value={formatEstimateCurrency(detailTotals.feesTotal || 0)} />
                    <StatCard title="Selected options" value={formatEstimateCurrency(detailOptionTotals.selectedOptionsTotal)} />
                    <StatCard title="Total" value={formatEstimateCurrency(detailOptionTotals.totalWithSelectedOptions)} />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button type="button" onClick={() => onSaveEstimate(selectedEstimate.id, detailDraft)} disabled={detailSaveDisabled || !canManage}>Save estimate</Button>
                    {canUseGcPackets ? <Button type="button" variant="secondary" onClick={() => setActiveEstimateTool("packet")}>Open packet tools</Button> : null}
                  </div>
                  <div className="mt-4">
                    <EstimateSentHistoryCard estimate={detailEstimatePreview} disabled={detailSaveDisabled || !canManage} onRecordSnapshot={handleRecordSentSnapshot} formatDateTimeValue={formatDateTime} />
                  </div>
                </>
              ) : (
                <StateCard title="No estimate selected" description="Select an estimate from the board before editing." tone="blue" />
              )}
            </Card>
          ) : null}

          {activeEstimateTool === "sections" ? (
            <Card className="p-4">
              <SectionHeader title="Proposal Sections / Starters" description="Use reusable starters and customer-facing proposal sections without changing estimate math." />
              {selectedEstimate ? (
                <div className="grid gap-3">
                  <EstimateStarterPanel setDraft={setDetailDraft} normalizeDraft={createEstimateDraft} disabled={busy || !canManage} tradeId={estimatePrimaryTrade} />
                  <EstimateProposalSectionsEditor draft={detailDraft} setDraft={setDetailDraft} disabled={busy || !canManage} />
                </div>
              ) : (
                <StateCard title="No estimate selected" description="Select an estimate before editing proposal sections." tone="blue" />
              )}
            </Card>
          ) : null}

          {activeEstimateTool === "fenceTakeoff" ? (
            <Card className="p-4">
              <SectionHeader title="Fence Takeoff Studio" description={selectedEstimate ? "Draw satellite fence runs, create draft quantities, and prepare proposal-safe handoff notes." : "Select an estimate before building a fence takeoff."} />
              {selectedEstimate && canManage ? (
                <FenceTakeoffLiteEditor
                  draft={detailDraft}
                  setDraft={setDetailDraft}
                  disabled={busy || !canManage}
                  jobsiteAddress={estimateRailProfileLine(detailLead?.location, detailCustomer?.address, companyProfile.serviceArea)}
                />
              ) : (
                <StateCard title="Fence takeoff unavailable" description="Fence takeoff tools are office-only and hidden from field users." tone="slate" />
              )}
            </Card>
          ) : null}

          {activeEstimateTool === "visual" ? (
            <Card className="p-4">
              <SectionHeader
                title="AI Visual Preview Prep"
                description={selectedEstimate ? "Prepare a review-first concept-image prompt from estimate scope, trade, options, and photo/takeoff evidence." : "Select an estimate before preparing a visual preview packet."}
                action={selectedEstimate ? <Badge tone={canRequestEstimateVisualPreview(visualPreviewPacket) ? "green" : "amber"}>{canRequestEstimateVisualPreview(visualPreviewPacket) ? "Ready" : "Needs review"}</Badge> : null}
              />
              {selectedEstimate && canManage ? (
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
                  <div className="grid gap-3">
                    <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-3">
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-800">Concept prompt</p>
                      <p className="mt-2 text-sm font-bold leading-6 text-slate-700">{visualPreviewPacket.prompt}</p>
                    </div>
                    {visualPreviewPacket.missingReviewItems.length ? (
                      <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-3">
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-800">Needed before image generation</p>
                        <ul className="mt-2 grid gap-1 text-sm font-bold leading-6 text-amber-900">
                          {visualPreviewPacket.missingReviewItems.map((item) => <li key={item}>- {item}</li>)}
                        </ul>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-3 text-sm font-bold leading-6 text-emerald-800">
                        Ready for a human-approved image generation step. This does not create an image or send anything automatically.
                      </div>
                    )}
                    <div className="rounded-2xl border border-slate-200 bg-white p-3">
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Safety boundaries</p>
                      <ul className="mt-2 grid gap-1 text-sm font-bold leading-6 text-slate-600">
                        {visualPreviewPacket.blockedActions.map((item) => <li key={item}>- {item}</li>)}
                      </ul>
                      <p className="mt-2 text-xs font-bold leading-5 text-slate-500">{visualPreviewPacket.disclaimer}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => copyEstimateText(
                          () => visualPreviewPacket.prompt,
                          "Visual preview prompt copied. Review it before using any image generator.",
                        )}
                      >
                        Copy visual prompt
                      </Button>
                      <Button type="button" variant="secondary" onClick={() => setActiveEstimateTool("backup")}>
                        Add photo / reference
                      </Button>
                      <Button type="button" variant="secondary" onClick={() => setActiveEstimateTool("sections")}>
                        Review scope
                      </Button>
                    </div>
                  </div>
                  <aside className="grid h-fit gap-3">
                    <div className="rounded-2xl border border-slate-200 bg-white p-3">
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Detected trade</p>
                      <p className="mt-1 text-xl font-black text-slate-950">{visualPreviewPacket.tradeLabel}</p>
                      <p className="mt-1 text-xs font-bold text-slate-500">{visualPreviewPacket.referenceCount} reference item{visualPreviewPacket.referenceCount === 1 ? "" : "s"} available</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-3">
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Option families</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {visualPreviewPacket.optionFamilies.slice(0, 8).map((item) => <Badge key={item} tone="blue">{item}</Badge>)}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-3">
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Proof photos to request</p>
                      <ul className="mt-2 grid gap-1 text-xs font-bold leading-5 text-slate-600">
                        {visualPreviewPacket.proofPhotoChecklist.slice(0, 6).map((item) => <li key={item}>- {item}</li>)}
                      </ul>
                    </div>
                  </aside>
                </div>
              ) : (
                <StateCard title="Visual preview unavailable" description="Visual preview prep is office-only and hidden from field users. Select an estimate before preparing concept image prompts." tone="slate" />
              )}
            </Card>
          ) : null}

          {activeEstimateTool === "backup" ? (
            <Card className="p-4">
              <SectionHeader title="SOV / Takeoff Backup / GC Packet" description="Office-only backup stays organized without crowding the command board." />
              {selectedEstimate ? (
                <div className="grid gap-3">
                  <EstimateBackupEditor draft={detailDraft} setDraft={setDetailDraft} disabled={busy || !canManage} />
                  {canUseGcPackets ? <EstimateGcPacketLiteEditor draft={detailDraft} setDraft={setDetailDraft} disabled={busy || !canManage} /> : null}
                </div>
              ) : (
                <StateCard title="No estimate selected" description="Select an estimate before editing backup notes." tone="blue" />
              )}
            </Card>
          ) : null}

          {activeEstimateTool === "packet" ? (
            <Card className="p-4">
              <SectionHeader title="Packet / Send / Print" description="Proposal copy, print, email, and packet settings use the existing estimate handlers." />
              {canUseGcPackets ? <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
                  <EstimatePacketSettingsPanel
                    presetId={packetPresetId}
                    sectionIds={packetSectionIds}
                    setPresetId={setPacketPresetId}
                    setSectionIds={setPacketSectionIds}
                    customization={packetCustomization}
                    setCustomization={setPacketCustomization}
                    onApplyCompanyBrand={handleApplyCompanyPacketBrand}
                    onSaveCustomizationDefault={handleSavePacketCustomizationDefault}
                    onApplyCustomizationDefault={handleApplyPacketCustomizationDefault}
                    customizationDefaultNotice={packetCustomizationNotice}
                    canIncludeInternalSections={canManage}
                  />
                <div className="rounded-2xl border border-slate-200 bg-white p-3">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Proposal actions</p>
                  <div className="mt-3 grid gap-2">
                    <Button type="button" variant="secondary" onClick={() => copyEstimateText(() => buildEstimateCopyText({ companyName, companyProfile, estimate: detailEstimatePreview }), "Estimate copied.")} disabled={!detailEstimatePreview}>Copy estimate</Button>
                    <Button type="button" variant="secondary" onClick={() => copyEstimateText(() => buildEstimateCustomerMessage({ companyName, companyProfile, estimate: detailEstimatePreview }), "Customer message copied.")} disabled={!detailEstimatePreview}>Copy customer message</Button>
                    <Button type="button" variant="secondary" onClick={() => onPrintEstimate?.(detailEstimatePreview, packetPrintSettings)} disabled={!detailEstimatePreview}>Print proposal</Button>
                    <Button type="button" variant="secondary" onClick={() => onPrintEstimateForemanHandoff?.(detailEstimatePreview, packetPrintSettings)} disabled={!detailEstimatePreview}>Print foreman handoff</Button>
                    <Button type="button" onClick={handleSendEstimate} disabled={!detailEstimatePreview || busy}>Send estimate</Button>
                  </div>
                  {copyFeedback ? <p className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700">{copyFeedback}</p> : null}
                </div>
              </div> : <StateCard title="Packet tools unavailable" description="Advanced GC packet controls are available in Premium and Elite packages." tone="slate" />}
            </Card>
          ) : null}
        </div>
      </details>
    </div>
  );

  return (
    <div className="co-office-page co-estimates-page">
      <PageHeader
        eyebrow="Office Sales"
        title="Estimates"
        description="Build clean customer proposals, share them, and move approved work into jobs."
        actions={canManage ? <Button type="button" size="lg" onClick={focusNewEstimate}>New Estimate</Button> : null}
      />
      <ModuleKpiStrip items={estimateKpis} />
      <div className="grid min-w-0 gap-4 px-5 sm:px-6 lg:grid-cols-[340px_minmax(0,1fr)] lg:px-8">
        <div className="min-w-0 space-y-4">
          <Card className="p-4">
            <SectionHeader title="Filters" description="Focus on active estimates or pull older proposals back into view." />
            <div className="grid gap-3">
              <SelectField label="Status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                {["All", "Draft", "Sent", "Approved", "Rejected", "Archived"].map((option) => <option key={option}>{option}</option>)}
              </SelectField>
              <SelectField label="Customer" value={customerFilter} onChange={(event) => setCustomerFilter(event.target.value)}>
                {listState.customerOptions.map((option) => <option key={option}>{option}</option>)}
              </SelectField>
              <SelectField label="Lead" value={leadFilter} onChange={(event) => setLeadFilter(event.target.value)}>
                {listState.leadOptions.map((option) => <option key={option}>{option}</option>)}
              </SelectField>
              <SelectField label="Created by" value={creatorFilter} onChange={(event) => setCreatorFilter(event.target.value)}>
                {listState.creatorOptions.map((option) => <option key={option}>{option}</option>)}
              </SelectField>
              <SelectField label="Archive view" value={archiveFilter} onChange={(event) => setArchiveFilter(event.target.value)}>
                {["Active", "Archived", "All"].map((option) => <option key={option}>{option}</option>)}
              </SelectField>
              <InputField label="Search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search title, customer, notes, or line items" />
            </div>
          </Card>

          <Card className="p-4">
            <SectionHeader title="Estimate list" description={`${filteredRows.length} visible estimate${filteredRows.length === 1 ? "" : "s"}.`} />
            {filteredRows.length === 0 ? (
              <StateCard title="No estimates yet" description="Start the first estimate from a customer or lead so you have something ready to send." tone="blue" />
            ) : (
              <div className="space-y-3">
                {filteredRows.map((estimate) => (
                  <button
                    key={estimate.id}
                    type="button"
                    onClick={() => {
                      setEstimateViewMode("browse");
                      setSelectedEstimateId(estimate.id);
                    }}
                    className={`co-office-list-card w-full rounded-3xl border p-4 text-left transition ${selectedEstimate?.id === estimate.id ? "is-selected border-blue-300 bg-blue-50/80 shadow-panel" : "border-blue-100 bg-white hover:border-blue-200 hover:bg-blue-50/50"}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-black text-slate-950">{estimate.title || "Estimate draft"}</p>
                        <p className="mt-1 break-words text-xs font-bold text-slate-500">{estimate.customer?.name || "Customer pending"} - {formatEstimateCurrency(estimate.grandTotal || 0)}</p>
                      </div>
                      <StatusBadge status={estimateStatusLabel(estimate.status)} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {estimate.archivedAt ? <Badge tone="slate">Archived</Badge> : null}
                      {estimate.jobId ? <Badge tone="emerald">Converted to job</Badge> : null}
                      <Badge tone="amber">{estimate.items?.length || 0} items</Badge>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="min-w-0 space-y-4">
          {canManage ? (
            <div ref={newEstimateRef} className="scroll-mt-24">
              <Card className="p-4">
              <SectionHeader
                title="New Estimate"
                description="Create a customer-ready proposal with scope, terms, line items, and a clear total."
                action={estimateViewMode === "create" ? <Badge tone="orange">New draft mode</Badge> : null}
              />
              <div className="grid gap-3 md:grid-cols-2">
                <InputField label="Customer / company name" value={createDraft.customerName} onChange={(event) => setCreateDraft((current) => updateDraftLinkFields(current, { customerName: event.target.value }))} placeholder="Martinez Concrete LLC" />
                <SelectField label="Customer" value={createDraft.customerId} onChange={(event) => setCreateDraft((current) => updateDraftLinkFields(current, { customerId: event.target.value }))}>
                  <option value="">Select a customer</option>
                  {visibleCustomers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
                </SelectField>
                <SelectField label="Lead" value={createDraft.leadId} onChange={(event) => setCreateDraft((current) => updateDraftLinkFields(current, { leadId: event.target.value }))}>
                  <option value="">Optional linked lead</option>
                  {visibleLeads.map((lead) => <option key={lead.id} value={lead.id}>{`${lead.customer} - ${lead.project}`}</option>)}
                </SelectField>
                <InputField label="Customer email / Send estimate to" value={createDraft.customerEmail} onChange={(event) => setCreateDraft((current) => ({ ...current, customerEmail: event.target.value }))} placeholder="customer@example.com" />
                <InputField label="Title" value={createDraft.title} onChange={(event) => setCreateDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Martinez driveway proposal" />
                <SelectField label="Starting status" value={createDraft.status} onChange={(event) => setCreateDraft((current) => ({ ...current, status: event.target.value }))}>
                  {["draft", "sent", "approved", "rejected"].map((option) => <option key={option} value={option}>{estimateStatusLabel(option)}</option>)}
                </SelectField>
                <InputField label="Tax rate (%)" value={createDraft.taxRate} onChange={(event) => setCreateDraft((current) => ({ ...current, taxRate: event.target.value }))} placeholder="Optional" inputMode="decimal" />
                <InputField label="Fees total" value={createDraft.feesTotal} onChange={(event) => setCreateDraft((current) => ({ ...current, feesTotal: event.target.value }))} placeholder="Optional" inputMode="decimal" />
              </div>
              <div className="mt-3 grid gap-3">
                <EstimateStarterPanel setDraft={setCreateDraft} normalizeDraft={createEstimateDraft} disabled={busy} tradeId={estimatePrimaryTrade} />
                <EstimateBackupEditor draft={createDraft} setDraft={setCreateDraft} disabled={busy} />
                <EstimateProposalSectionsEditor draft={createDraft} setDraft={setCreateDraft} disabled={busy} />
                <EstimateGcPacketLiteEditor draft={createDraft} setDraft={setCreateDraft} disabled={busy} />
              </div>
              <div className="mt-4 space-y-3">
                <SectionHeader title="Line items" description="Line totals update automatically from quantity and unit price." />
                {createDraft.items.map((item, index) => (
                  <div key={item.id} className="rounded-2xl border border-blue-100 bg-blue-50/50 p-3">
                    <div className="grid gap-3 md:grid-cols-[minmax(0,1.6fr)_110px_110px_130px]">
                      <InputField label={`Description ${index + 1}`} value={item.description} onChange={(event) => updateDraftItem(setCreateDraft, index, "description", event.target.value)} placeholder="Scope, prep, cleanup, or finish work" />
                      <InputField label="Qty" value={item.quantity} onChange={(event) => updateDraftItem(setCreateDraft, index, "quantity", event.target.value)} inputMode="decimal" />
                      <InputField label="Unit" value={item.unit} onChange={(event) => updateDraftItem(setCreateDraft, index, "unit", event.target.value)} />
                      <InputField label="Unit price" value={item.unitPrice} onChange={(event) => updateDraftItem(setCreateDraft, index, "unitPrice", event.target.value)} inputMode="decimal" />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Line total: {formatEstimateCurrency(calculateEstimateLineTotal(item))}</p>
                      <button type="button" className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 hover:text-slate-950" onClick={() => removeDraftItem(setCreateDraft, index)}>Remove item</button>
                    </div>
                  </div>
                ))}
                <Button type="button" variant="secondary" onClick={() => appendDraftItem(setCreateDraft)}>Add line item</Button>
              </div>
              <div className="mt-4">
                <ProposalTotalCard label="Base Estimate Total" value={formatEstimateCurrency(createTotals.grandTotal)} detail="Saved estimate total from line items, tax, and fees. Optional or excluded options do not change this base total." />
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                <StatCard title="Subtotal" value={formatEstimateCurrency(createTotals.subtotal)} />
                <StatCard title="Tax" value={formatEstimateCurrency(createTotals.taxTotal || 0)} />
                <StatCard title="Fees" value={formatEstimateCurrency(createTotals.feesTotal || 0)} />
                <StatCard title="Selected options" value={formatEstimateCurrency(createOptionTotals.selectedOptionsTotal)} detail="Included, accepted, or selected alternates/add-ons only." />
                <StatCard title="Total with selected options" value={formatEstimateCurrency(createOptionTotals.totalWithSelectedOptions)} detail="Review total only; base estimate total remains separate." />
              </div>
              <div className="mt-4">
                <Button
                  type="button"
                  onClick={async () => {
                    const created = await onCreateEstimate(createDraft);
                    if (created) {
                      setEstimateViewMode("browse");
                      const createdId = typeof created === "object" ? created.id : "";
                      const createdTitle = typeof created === "object" ? (created.title || createDraft.title) : createDraft.title;
                      if (createdId) setSelectedEstimateId(createdId);
                      setCreateDraft(createEstimateDraft({
                        ...INITIAL_ESTIMATE_FORM,
                        customerId: singleCustomerId,
                        customerName: singleCustomerName,
                        customerEmail: singleCustomerEmail,
                      }));
                      showCopyFeedback(`Draft created: ${createdTitle}. It is selected in the Estimates list.`, 7000);
                    }
                  }}
                  disabled={busy || (!createDraft.customerId && !createDraft.leadId && !createDraft.customerName) || !createDraft.title}
                >
                  Create New Estimate
                </Button>
              </div>
              </Card>
            </div>
          ) : null}

          {selectedEstimate ? (
            <Card className="p-4">
              <SectionHeader
                title={selectedEstimate.title || "Estimate detail"}
                description={`${selectedEstimate.customer?.name || "No customer"} - ${selectedEstimate.createdByName || "Unknown creator"}`}
                action={<StatusBadge status={estimateStatusLabel(selectedEstimate.status)} />}
              />
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-3 text-sm text-slate-600">
                  <p><span className="font-black text-slate-950">Customer:</span> {selectedEstimate.customer?.name || "Not linked"}</p>
                  <p className="mt-1"><span className="font-black text-slate-950">Lead:</span> {selectedEstimate.lead?.project || "No linked lead"}</p>
                </div>
                <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-3 text-sm text-slate-600">
                  <p><span className="font-black text-slate-950">Job:</span> {selectedEstimate.job?.title || "Not converted yet"}</p>
                  <p className="mt-1"><span className="font-black text-slate-950">Created:</span> {formatDateTime(selectedEstimate.createdAt)}</p>
                </div>
              </div>
              <div className="mt-4 space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <SelectField label="Customer" value={detailDraft.customerId} onChange={(event) => setDetailDraft((current) => updateDraftLinkEmail(current, { customerId: event.target.value }))}>
                    <option value="">Select a customer</option>
                    {visibleCustomers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
                  </SelectField>
                  <SelectField label="Lead" value={detailDraft.leadId} onChange={(event) => setDetailDraft((current) => updateDraftLinkEmail(current, { leadId: event.target.value }))}>
                    <option value="">Optional linked lead</option>
                    {visibleLeads.map((lead) => <option key={lead.id} value={lead.id}>{`${lead.customer} - ${lead.project}`}</option>)}
                  </SelectField>
                  <InputField label="Customer email / Send estimate to" value={detailDraft.customerEmail} onChange={(event) => setDetailDraft((current) => ({ ...current, customerEmail: event.target.value }))} placeholder="customer@example.com" />
                  <InputField label="Title" value={detailDraft.title} onChange={(event) => setDetailDraft((current) => ({ ...current, title: event.target.value }))} />
                  <SelectField label="Workflow status" value={detailDraft.status} onChange={(event) => setDetailDraft((current) => ({ ...current, status: event.target.value }))}>
                    {["draft", "sent", "approved", "rejected", "archived"].map((option) => <option key={option} value={option}>{estimateStatusLabel(option)}</option>)}
                  </SelectField>
                  <InputField label="Tax rate (%)" value={detailDraft.taxRate} onChange={(event) => setDetailDraft((current) => ({ ...current, taxRate: event.target.value }))} inputMode="decimal" />
                  <InputField label="Fees total" value={detailDraft.feesTotal} onChange={(event) => setDetailDraft((current) => ({ ...current, feesTotal: event.target.value }))} inputMode="decimal" />
                </div>
                <div className="grid gap-3">
                  <EstimateStarterPanel setDraft={setDetailDraft} normalizeDraft={createEstimateDraft} disabled={busy || !canManage} tradeId={estimatePrimaryTrade} />
                  <EstimateBackupEditor draft={detailDraft} setDraft={setDetailDraft} disabled={busy || !canManage} />
                  <EstimateProposalSectionsEditor draft={detailDraft} setDraft={setDetailDraft} disabled={busy || !canManage} />
                  <EstimateGcPacketLiteEditor draft={detailDraft} setDraft={setDetailDraft} disabled={busy || !canManage} />
                </div>
                <div className="space-y-3">
                  <SectionHeader title="Line items" description="Office pricing lives here and is never shipped to field roles." />
                  {detailDraft.items.map((item, index) => (
                    <div key={item.id} className="rounded-2xl border border-blue-100 bg-blue-50/50 p-3">
                      <div className="grid gap-3 md:grid-cols-[minmax(0,1.6fr)_110px_110px_130px]">
                        <InputField label={`Description ${index + 1}`} value={item.description} onChange={(event) => updateDraftItem(setDetailDraft, index, "description", event.target.value)} />
                        <InputField label="Qty" value={item.quantity} onChange={(event) => updateDraftItem(setDetailDraft, index, "quantity", event.target.value)} inputMode="decimal" />
                        <InputField label="Unit" value={item.unit} onChange={(event) => updateDraftItem(setDetailDraft, index, "unit", event.target.value)} />
                        <InputField label="Unit price" value={item.unitPrice} onChange={(event) => updateDraftItem(setDetailDraft, index, "unitPrice", event.target.value)} inputMode="decimal" />
                      </div>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Line total: {formatEstimateCurrency(calculateEstimateLineTotal(item))}</p>
                        <button type="button" className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 hover:text-slate-950" onClick={() => removeDraftItem(setDetailDraft, index)}>Remove item</button>
                      </div>
                    </div>
                  ))}
                  <Button type="button" variant="secondary" onClick={() => appendDraftItem(setDetailDraft)}>Add line item</Button>
                </div>
                <ProposalTotalCard label="Base Estimate Total" value={formatEstimateCurrency(detailTotals.grandTotal)} detail="Saved estimate total from line items, tax, and fees. Optional or excluded options do not change this base total." />
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                  <StatCard title="Subtotal" value={formatEstimateCurrency(detailTotals.subtotal)} />
                  <StatCard title="Tax" value={formatEstimateCurrency(detailTotals.taxTotal || 0)} />
                  <StatCard title="Fees" value={formatEstimateCurrency(detailTotals.feesTotal || 0)} />
                  <StatCard title="Selected options" value={formatEstimateCurrency(detailOptionTotals.selectedOptionsTotal)} detail="Included, accepted, or selected alternates/add-ons only." />
                  <StatCard title="Total with selected options" value={formatEstimateCurrency(detailOptionTotals.totalWithSelectedOptions)} detail="Review total only; base estimate total remains separate." />
                </div>
                <EstimateSentHistoryCard estimate={detailEstimatePreview} disabled={detailSaveDisabled || !canManage} onRecordSnapshot={handleRecordSentSnapshot} formatDateTimeValue={formatDateTime} />
                {copyFeedback ? (
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">
                    {copyFeedback}
                  </div>
                ) : null}
                <div className="grid gap-3 rounded-3xl border border-blue-100 bg-blue-50/60 p-3 md:grid-cols-2">
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Share proposal</p>
                    <div className="mt-3">
                      <EstimatePacketSettingsPanel
                        presetId={packetPresetId}
                        sectionIds={packetSectionIds}
                        setPresetId={setPacketPresetId}
                        setSectionIds={setPacketSectionIds}
                        customization={packetCustomization}
                        setCustomization={setPacketCustomization}
                        onApplyCompanyBrand={handleApplyCompanyPacketBrand}
                        onSaveCustomizationDefault={handleSavePacketCustomizationDefault}
                        onApplyCustomizationDefault={handleApplyPacketCustomizationDefault}
                        customizationDefaultNotice={packetCustomizationNotice}
                        canIncludeInternalSections={canManage}
                      />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => copyEstimateText(
                          () => buildEstimateCopyText({
                            companyName,
                            companyProfile,
                            estimate: detailEstimatePreview,
                          }),
                          "Estimate copied.",
                        )}
                        disabled={!detailEstimatePreview}
                      >
                        Copy estimate
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => copyEstimateText(
                          () => buildEstimateCustomerMessage({
                            companyName,
                            companyProfile,
                            estimate: detailEstimatePreview,
                          }),
                          "Customer message copied.",
                        )}
                        disabled={!detailEstimatePreview}
                      >
                        Copy customer message
                      </Button>
                      <Button type="button" variant="secondary" onClick={() => onPrintEstimate?.(detailEstimatePreview, packetPrintSettings)} disabled={!detailEstimatePreview}>
                        Print proposal
                      </Button>
                      <Button type="button" variant="secondary" onClick={() => onPrintEstimateForemanHandoff?.(detailEstimatePreview, packetPrintSettings)} disabled={!detailEstimatePreview}>
                        Print foreman handoff
                      </Button>
                      <Button type="button" onClick={handleSendEstimate} disabled={!detailEstimatePreview || busy}>
                        Send estimate
                      </Button>
                    </div>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Workflow</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button type="button" onClick={() => onSaveEstimate(selectedEstimate.id, detailDraft)} disabled={detailSaveDisabled}>
                        Save estimate
                      </Button>
                      {canMarkSent ? (
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => onSaveEstimate(selectedEstimate.id, { ...detailDraft, status: "sent" })}
                          disabled={detailSaveDisabled}
                        >
                          Mark sent
                        </Button>
                      ) : null}
                      {canManage && detailDraft.status !== "approved" && !selectedEstimate.jobId ? (
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => onSaveEstimate(selectedEstimate.id, { ...detailDraft, status: "approved" })}
                          disabled={detailSaveDisabled}
                        >
                          Mark approved
                        </Button>
                      ) : null}
                      {selectedEstimate.status === "approved" && !selectedEstimate.jobId ? (
                        <Button type="button" variant="secondary" onClick={handleConvertApprovedEstimate} disabled={busy}>
                          Convert approved estimate to job
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
    </div>
    </>
  );
}
