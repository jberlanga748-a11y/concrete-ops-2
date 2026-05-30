import { useEffect, useMemo, useState } from "react";

import {
  ApexOfficeCommandShell,
  Badge,
  Button,
  Card,
  CommandPageFrame,
  InputField,
  PageHeader,
  SectionHeader,
  SelectField,
  StateCard,
  TextAreaField,
} from "./app-shell-components";
import { deriveCommunicationProviderReadinessUiState } from "./communication-provider-readiness-utils";
import { buildCustomerPortalCommentDraft, CUSTOMER_PORTAL_REVIEW_DECISIONS, deriveCustomerPortalCommandState } from "./customer-portal-command-utils";
import { contactHistoryBadgeTone, createContactHistoryDraft, deriveCommunicationCenterState } from "./contact-history-utils";
import { CONTACT_HISTORY_DIRECTIONS, CONTACT_HISTORY_METHODS, CONTACT_HISTORY_OUTCOMES } from "../shared/contactHistory.js";

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

function formatDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function todayDateInputValue() {
  return new Date().toISOString().slice(0, 10);
}

export function CommunicationCenterPage({
  leads = [],
  customers = [],
  estimates = [],
  jobs = [],
  leadSources = [],
  contactHistory = [],
  permissions,
  companyName,
  user,
  canViewCustomerPortalPreview = false,
  customerPortalPreviewState = {},
  busy = false,
  onCreateContactHistory = async () => false,
  onUpdateContactHistory = async () => false,
  onArchiveContactHistory = async () => false,
  onRestoreContactHistory = async () => false,
  onGetCommunicationProviderReadiness = async () => null,
  onCreateCommunicationSuppression = async () => null,
  onCreateOutboundCommunicationApproval = async () => null,
  onPrepareCommunicationDeliveryAttemptContract = async () => null,
  onGetCustomerPortalAccessRecords = async () => null,
  onCreateCustomerPortalAccessRecord = async () => null,
  onRevokeCustomerPortalAccessRecord = async () => null,
  onGetCustomerPortalAccessPacket = async () => null,
  onGetCustomerPortalShareApprovals = async () => null,
  onCreateCustomerPortalShareApproval = async () => null,
  onReviewCustomerPortalShareApproval = async () => null,
  onPreflightCustomerPortalShareApproval = async () => null,
  onPrepareCustomerPortalExecutionContract = async () => null,
  onSelectLead = () => {},
  onSelectCustomer = () => {},
  onSelectJob = () => {},
  onOpenEstimate = () => {},
  AccessRestrictedComponent,
  FollowUpQueuePanelComponent,
}) {
  const canView = Boolean(permissions?.contactHistory?.canView);
  const canManage = Boolean(permissions?.contactHistory?.canManage);
  const [entityTypeFilter, setEntityTypeFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [selectedKey, setSelectedKey] = useState("");
  const [draft, setDraft] = useState(() => createContactHistoryDraft({}, "lead", "Call"));
  const [suppressionDraft, setSuppressionDraft] = useState({ channel: "all", reason: "do_not_contact", recipient: "", note: "" });
  const [approvalDraft, setApprovalDraft] = useState({
    channel: "email",
    recipient: "",
    consentConfirmed: "false",
    templateReviewed: "false",
    humanReviewConfirmed: "false",
    messagePreview: "",
  });
  const [message, setMessage] = useState("");
  const [providerReadinessPayload, setProviderReadinessPayload] = useState(null);
  const [providerReadinessStatus, setProviderReadinessStatus] = useState({ status: "idle", message: "" });
  const [portalPayload, setPortalPayload] = useState({ accessRecords: [], shareApprovalRequests: [], executionContracts: [] });
  const [portalStatus, setPortalStatus] = useState({ status: "idle", message: "" });
  const [portalAccessDraft, setPortalAccessDraft] = useState(() => ({
    estimateId: "",
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    approvalId: "OWNER-PORTAL-REVIEW",
  }));
  const [portalReviewNote, setPortalReviewNote] = useState("Customer portal packet reviewed for proposal, proof, progress, and change order visibility.");
  const [portalDecision, setPortalDecision] = useState("comment");
  const [portalComment, setPortalComment] = useState("");
  const [portalPacketPreview, setPortalPacketPreview] = useState("");
  const isDesktopCommandViewport = useDesktopCommandViewport(1180);
  const centerState = useMemo(() => deriveCommunicationCenterState({
    leads,
    customers,
    estimates,
    jobs,
    contactHistory,
  }, { entityType: entityTypeFilter, query }), [contactHistory, customers, entityTypeFilter, estimates, jobs, leads, query]);
  const optionKeys = useMemo(() => centerState.options.map((option) => option.key).join("|"), [centerState.options]);
  const selectedOption = useMemo(() => centerState.options.find((option) => option.key === selectedKey) || centerState.options[0] || null, [centerState.options, selectedKey]);
  const todayKey = todayDateInputValue();
  const communicationShellQueue = useMemo(() => {
    const recordsByEntityKey = new Map();
    centerState.records.forEach((record) => {
      const key = `${record.entityType}:${record.entityId}`;
      if (!recordsByEntityKey.has(key)) recordsByEntityKey.set(key, []);
      recordsByEntityKey.get(key).push(record);
    });

    return centerState.options.map((option) => {
      const relatedRecords = recordsByEntityKey.get(option.key) || [];
      const latest = relatedRecords[0] || null;
      const overdue = relatedRecords.some((record) => record.nextFollowUpDate && record.nextFollowUpDate < todayKey);
      const dueToday = relatedRecords.some((record) => record.nextFollowUpDate === todayKey);
      const waiting = relatedRecords.some((record) => record.outcome === "Waiting on Response");
      const needsFirstTouch = relatedRecords.length === 0;
      const priorityScore = overdue ? 50 : dueToday ? 40 : waiting ? 30 : needsFirstTouch ? 20 : 10;
      const statusLabel = overdue ? "Overdue" : dueToday ? "Due Today" : waiting ? "Waiting" : needsFirstTouch ? "No Touch" : `${relatedRecords.length} Logged`;
      const tone = overdue ? "red" : dueToday ? "amber" : waiting ? "orange" : needsFirstTouch ? "blue" : "slate";

      return {
        id: option.key,
        option,
        title: option.label,
        meta: option.subtitle || `${option.type} communication context`,
        sourceLabel: option.type,
        status: statusLabel,
        statusLabel,
        tone,
        actionLabel: "",
        priorityScore,
        relatedRecords,
        badges: [
          { label: option.type, tone: "slate" },
          latest ? { label: latest.method || "Logged", tone: contactHistoryBadgeTone(latest.method, "method") } : { label: "New", tone: "blue" },
        ],
      };
    }).sort((left, right) => (
      right.priorityScore - left.priorityScore ||
      right.relatedRecords.length - left.relatedRecords.length ||
      left.title.localeCompare(right.title)
    ));
  }, [centerState.options, centerState.records, todayKey]);
  const selectedCommunicationShellItem = useMemo(() => (
    communicationShellQueue.find((item) => item.id === selectedOption?.key) ||
    communicationShellQueue[0] ||
    null
  ), [communicationShellQueue, selectedOption?.key]);
  const selectedRelatedRecords = useMemo(() => (
    selectedOption
      ? centerState.records.filter((record) => record.entityType === selectedOption.type && record.entityId === selectedOption.id)
      : []
  ), [centerState.records, selectedOption]);
  const providerReadinessState = useMemo(() => deriveCommunicationProviderReadinessUiState(providerReadinessPayload || {}), [providerReadinessPayload]);
  const approvedEstimateOptions = useMemo(() => (
    (Array.isArray(estimates) ? estimates : [])
      .filter((estimate) => String(estimate?.status || "").toLowerCase() === "approved")
      .map((estimate) => ({
        id: estimate.id,
        label: estimate.title || estimate.projectName || estimate.id,
        customer: estimate.customer?.name || estimate.customerName || estimate.customer || "",
      }))
  ), [estimates]);
  const portalCommandState = useMemo(() => deriveCustomerPortalCommandState({
    previewState: customerPortalPreviewState,
    accessRecords: portalPayload.accessRecords,
    shareApprovalRequests: portalPayload.shareApprovalRequests,
    executionContracts: portalPayload.executionContracts,
    providerReadiness: providerReadinessPayload || {},
    canPreview: canViewCustomerPortalPreview,
  }), [canViewCustomerPortalPreview, customerPortalPreviewState, portalPayload, providerReadinessPayload]);

  useEffect(() => {
    if (!centerState.options.length) {
      setSelectedKey("");
      return;
    }
    if (!selectedKey || !centerState.options.some((option) => option.key === selectedKey)) {
      setSelectedKey(centerState.options[0].key);
    }
  }, [centerState.options, optionKeys, selectedKey]);

  useEffect(() => {
    if (!selectedOption) {
      setDraft(createContactHistoryDraft({}, "lead", "Call"));
      return;
    }
    const nextDraft = createContactHistoryDraft(selectedOption.record, selectedOption.type, "Call");
    setDraft(nextDraft);
    setSuppressionDraft((current) => ({
      ...current,
      recipient: nextDraft.contactEmail || nextDraft.contactPhone || current.recipient,
      note: "",
    }));
    setApprovalDraft((current) => ({
      ...current,
      recipient: current.channel === "sms" ? (nextDraft.contactPhone || current.recipient) : (nextDraft.contactEmail || current.recipient),
      messagePreview: nextDraft.messageDraft || current.messagePreview,
    }));
    setMessage("");
  }, [selectedOption?.key]);

  useEffect(() => {
    if (!canView) return;
    loadCommunicationProviderReadiness();
  }, [canView]);

  useEffect(() => {
    if (!canView || !canViewCustomerPortalPreview) return;
    loadCustomerPortalCommandCenter();
  }, [canView, canViewCustomerPortalPreview]);

  useEffect(() => {
    const defaultEstimateId = customerPortalPreviewState?.preview?.estimateId || approvedEstimateOptions[0]?.id || "";
    if (!defaultEstimateId) return;
    setPortalAccessDraft((current) => current.estimateId ? current : { ...current, estimateId: defaultEstimateId });
  }, [approvedEstimateOptions, customerPortalPreviewState?.preview?.estimateId]);

  if (!canView) {
    return AccessRestrictedComponent ? <AccessRestrictedComponent active="communications" user={user} permissions={permissions} setActive={() => {}} /> : <CommandPageFrame><StateCard title="Communications unavailable" description="This route is protected for your role." tone="amber" /></CommandPageFrame>;
  }

  const stats = [
    { id: "logged", label: "Logged", value: centerState.stats.total, tone: "blue", helper: "Manual records", icon: "quote" },
    { id: "due-today", label: "Due Today", value: centerState.stats.dueToday, tone: centerState.stats.dueToday ? "amber" : "green", helper: "Follow-ups", icon: "clock" },
    { id: "overdue", label: "Overdue", value: centerState.stats.overdue, tone: centerState.stats.overdue ? "red" : "green", helper: "Needs action", icon: "alert" },
    { id: "waiting", label: "Waiting", value: centerState.stats.waiting, tone: centerState.stats.waiting ? "amber" : "slate", helper: "Customer replies", icon: "inbox" },
  ];

  function openRecord(record) {
    const type = record?.entityType || record?.type;
    const id = record?.entityId || record?.id;
    if (!id) return;
    if (type === "lead") onSelectLead(id);
    else if (type === "customer") onSelectCustomer(id);
    else if (type === "job") onSelectJob(id);
    else if (type === "estimate") onOpenEstimate(id);
  }

  function setQuickMethod(method) {
    setDraft((current) => ({
      ...current,
      method,
      outcome: method === "Email" || method === "Text" ? "Sent" : "Follow-Up Needed",
    }));
  }

  async function loadCommunicationProviderReadiness() {
    if (!canView || !onGetCommunicationProviderReadiness) return null;
    setProviderReadinessStatus({ status: "loading", message: "Loading locked communication readiness..." });
    const result = await onGetCommunicationProviderReadiness();
    if (result?.communicationProviderReadiness) {
      setProviderReadinessPayload(result);
      setProviderReadinessStatus({ status: "ready", message: "Locked communication readiness loaded." });
      return result;
    }
    setProviderReadinessStatus({ status: "error", message: "Communication readiness could not be loaded." });
    return null;
  }

  async function loadCustomerPortalCommandCenter() {
    if (!canView || !canViewCustomerPortalPreview) return null;
    setPortalStatus({ status: "loading", message: "Loading customer portal review workflow..." });
    const [accessResult, shareResult] = await Promise.all([
      onGetCustomerPortalAccessRecords(),
      onGetCustomerPortalShareApprovals(),
    ]);
    if (accessResult?.accessRecords || shareResult?.shareApprovalRequests) {
      setPortalPayload((current) => ({
        ...current,
        accessRecords: accessResult?.accessRecords || [],
        shareApprovalRequests: shareResult?.shareApprovalRequests || [],
      }));
      setPortalStatus({ status: "ready", message: "Customer portal review workflow loaded." });
      return { accessResult, shareResult };
    }
    setPortalStatus({ status: "error", message: "Customer portal workflow is locked or unavailable for this package/role." });
    return null;
  }

  async function preparePortalAccessRecord(event) {
    event.preventDefault();
    if (!canManage || !canViewCustomerPortalPreview || !portalAccessDraft.estimateId) return;
    const result = await onCreateCustomerPortalAccessRecord({
      estimateId: portalAccessDraft.estimateId,
      expiresAt: portalAccessDraft.expiresAt,
      approvalId: portalAccessDraft.approvalId || "OWNER-PORTAL-REVIEW",
    });
    if (result?.accessRecord) {
      setPortalPayload((current) => ({
        ...current,
        accessRecords: result.accessRecords || [result.accessRecord, ...(current.accessRecords || [])],
      }));
      setPortalStatus({ status: "ready", message: "Locked customer portal access record prepared. No public link, token, message, invoice, or payment was created." });
    } else {
      setPortalStatus({ status: "error", message: "Customer portal access record could not be prepared." });
    }
  }

  async function revokePortalAccessRecord(accessRecordId) {
    if (!canManage || !accessRecordId) return;
    const result = await onRevokeCustomerPortalAccessRecord(accessRecordId, {
      reason: "Owner/admin revoked this locked customer portal access record from Communication Center.",
    });
    if (result?.accessRecord) {
      setPortalPayload((current) => ({
        ...current,
        accessRecords: result.accessRecords || current.accessRecords,
      }));
      setPortalStatus({ status: "ready", message: "Locked access record revoked. No customer-facing action was created." });
    } else {
      setPortalStatus({ status: "error", message: "Access record could not be revoked." });
    }
  }

  async function previewPortalPacket(accessRecordId) {
    if (!accessRecordId) return;
    const result = await onGetCustomerPortalAccessPacket(accessRecordId);
    if (result?.packet) {
      setPortalPacketPreview(result.packet.packet || "");
      setPortalStatus({ status: "ready", message: "Internal customer-safe packet loaded for owner/admin review." });
    } else {
      setPortalStatus({ status: "error", message: "Packet could not be loaded." });
    }
  }

  async function requestPortalShareApproval(accessRecordId) {
    if (!canManage || !accessRecordId) return;
    const result = await onCreateCustomerPortalShareApproval(accessRecordId, {
      note: portalReviewNote || "Owner/admin requested customer portal share review.",
    });
    if (result?.shareApprovalRequest) {
      setPortalPayload((current) => ({
        ...current,
        shareApprovalRequests: result.shareApprovalRequests || [result.shareApprovalRequest, ...(current.shareApprovalRequests || [])],
      }));
      setPortalPacketPreview(result.packet?.packet || portalPacketPreview);
      setPortalStatus({ status: "ready", message: "Share approval queued as locked evidence. No public link or customer message was sent." });
    } else {
      setPortalStatus({ status: "error", message: "Share approval could not be queued." });
    }
  }

  async function reviewPortalShareApproval(shareApprovalId, decision) {
    if (!canManage || !shareApprovalId) return;
    const result = await onReviewCustomerPortalShareApproval(shareApprovalId, {
      decision,
      note: portalReviewNote || "Owner/admin reviewed the customer portal packet.",
    });
    if (result?.shareApprovalRequest) {
      setPortalPayload((current) => ({
        ...current,
        shareApprovalRequests: result.shareApprovalRequests || current.shareApprovalRequests,
      }));
      setPortalStatus({ status: "ready", message: "Share approval decision recorded. External portal execution remains provider-ready and locked." });
    } else {
      setPortalStatus({ status: "error", message: "Share approval decision could not be recorded." });
    }
  }

  async function preflightPortalShareApproval(shareApprovalId) {
    if (!canManage || !shareApprovalId) return;
    const result = await onPreflightCustomerPortalShareApproval(shareApprovalId, {
      approvalPhrase: "TOKENIZED_CUSTOMER_PORTAL_SEPARATELY_APPROVED",
    });
    if (result?.preflight) {
      setPortalStatus({ status: "ready", message: `${result.preflight.prerequisitesReady ? "Preflight evidence ready" : "Preflight still blocked"}. No customer portal action was enabled.` });
    } else {
      setPortalStatus({ status: "error", message: "External gate preflight could not be prepared." });
    }
  }

  async function preparePortalExecutionContract(shareApprovalId) {
    if (!canManage || !shareApprovalId) return;
    const result = await onPrepareCustomerPortalExecutionContract(shareApprovalId, {
      approvalPhrase: "TOKENIZED_CUSTOMER_PORTAL_SEPARATELY_APPROVED",
      portalAction: "proposal_review",
      approvedPortalBoundary: "Reviewed customer-visible proposal, proof, progress, and change-order packet only.",
      customerVisibleFields: ["scope", "total", "proof summary", "progress summary", "reviewed change orders"],
      idempotencyKey: `portal-contract:${shareApprovalId}:proposal_review`,
    });
    if (result?.executionContract) {
      setPortalPayload((current) => ({
        ...current,
        executionContracts: result.executionContracts || [result.executionContract, ...(current.executionContracts || [])],
      }));
      setPortalStatus({ status: "ready", message: "Locked external execution contract recorded. No public route, token redemption, customer action, message, invoice, or payment was enabled." });
    } else {
      setPortalStatus({ status: "error", message: "Execution contract could not be prepared." });
    }
  }

  async function recordPortalCustomerComment(event) {
    event.preventDefault();
    if (!canManage || !portalComment.trim()) return;
    const target = portalCommandState.customerCommentTarget;
    if (!target.entityType || !target.entityId) {
      setPortalStatus({ status: "error", message: "Create or approve a proposal before recording portal customer comments." });
      return;
    }
    const draftComment = buildCustomerPortalCommentDraft({
      comment: portalComment,
      decision: portalDecision,
      preview: portalCommandState.preview,
      user,
    });
    const didSave = await onCreateContactHistory({
      ...draftComment,
      entityType: target.entityType,
      entityId: target.entityId,
    });
    if (didSave) {
      setPortalComment("");
      setPortalDecision("comment");
      setPortalStatus({ status: "ready", message: "Customer portal comment recorded internally for owner/admin follow-up. Nothing was sent." });
    }
  }

  async function submitCommunication(event) {
    event.preventDefault();
    if (!canManage || !selectedOption) return;
    const didSave = await onCreateContactHistory({
      ...draft,
      entityType: selectedOption.type,
      entityId: selectedOption.id,
    });
    if (didSave) {
      setMessage(`Communication logged for ${selectedOption.label}. No email or text was sent.`);
      setDraft(createContactHistoryDraft(selectedOption.record, selectedOption.type, draft.method || "Call"));
    }
  }

  async function submitSuppression(event) {
    event.preventDefault();
    if (!canManage || !selectedOption || !suppressionDraft.recipient) return;
    const result = await onCreateCommunicationSuppression({
      ...suppressionDraft,
      targetEntityType: selectedOption.type,
      targetEntityId: selectedOption.id,
      source: "manual",
    });
    if (result?.suppressionRecord) {
      setProviderReadinessPayload({
        communicationProviderReadiness: result.communicationProviderReadiness,
        suppressions: result.suppressions,
        outboundApprovals: providerReadinessPayload?.outboundApprovals || [],
        deliveryAttemptContracts: providerReadinessPayload?.deliveryAttemptContracts || [],
        boundary: result.boundary,
      });
      setProviderReadinessStatus({ status: "ready", message: "Suppression recorded as locked evidence. No provider call or customer message was sent." });
      setSuppressionDraft((current) => ({ ...current, note: "" }));
    } else {
      setProviderReadinessStatus({ status: "error", message: "Suppression could not be recorded." });
    }
  }

  async function submitOutboundApproval(event) {
    event.preventDefault();
    if (!canManage || !selectedOption || !approvalDraft.recipient) return;
    const result = await onCreateOutboundCommunicationApproval({
      channel: approvalDraft.channel,
      targetEntityType: selectedOption.type,
      targetEntityId: selectedOption.id,
      recipient: approvalDraft.recipient,
      consentSource: `Manual ${approvalDraft.channel.toUpperCase()} review in Communications Center`,
      consentConfirmed: approvalDraft.consentConfirmed === "true",
      templateReviewed: approvalDraft.templateReviewed === "true",
      humanReviewConfirmed: approvalDraft.humanReviewConfirmed === "true",
      messagePreview: approvalDraft.messagePreview || draft.messageDraft || draft.subject,
      templateId: `${approvalDraft.channel}-communications-review`,
      idempotencyKey: `${approvalDraft.channel}:${selectedOption.type}:${selectedOption.id}:communications-review`,
    });
    if (result?.outboundApproval) {
      setProviderReadinessPayload({
        communicationProviderReadiness: result.communicationProviderReadiness,
        suppressions: providerReadinessPayload?.suppressions || [],
        outboundApprovals: result.outboundApprovals,
        deliveryAttemptContracts: providerReadinessPayload?.deliveryAttemptContracts || [],
        boundary: result.boundary,
      });
      setProviderReadinessStatus({ status: "ready", message: `${result.outboundApproval.status === "queued_locked" ? "Approval queued" : "Approval blocked"} as locked evidence. No customer message was sent.` });
    } else {
      setProviderReadinessStatus({ status: "error", message: "Outbound approval could not be queued." });
    }
  }

  async function prepareDeliveryAttemptContract(approvalId) {
    if (!canManage || !approvalId) return;
    const result = await onPrepareCommunicationDeliveryAttemptContract(approvalId, { humanReviewConfirmed: true });
    if (result?.deliveryAttemptContract) {
      setProviderReadinessPayload({
        communicationProviderReadiness: result.communicationProviderReadiness,
        suppressions: result.suppressions || providerReadinessPayload?.suppressions || [],
        outboundApprovals: providerReadinessPayload?.outboundApprovals || [],
        deliveryAttemptContracts: result.deliveryAttemptContracts,
        boundary: result.boundary,
      });
      setProviderReadinessStatus({ status: "ready", message: "Locked delivery-attempt contract prepared. No provider request was prepared or sent." });
    } else {
      setProviderReadinessStatus({ status: "error", message: "Delivery-attempt contract could not be prepared." });
    }
  }

  function selectCommunicationShellItem(item) {
    if (!item) return;
    setSelectedKey(item.option?.key || item.id);
  }

  function openFirstCommunicationShellItem(predicate) {
    const nextItem = communicationShellQueue.find(predicate);
    if (nextItem) selectCommunicationShellItem(nextItem);
  }

  function renderCommunicationRecord(record, { compact = false } = {}) {
    return (
      <div key={record.id} className={`co-communications-log-row grid gap-3 ${compact ? "p-3" : "p-4"} lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start`}>
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <Badge tone={contactHistoryBadgeTone(record.method, "method")}>{record.method}</Badge>
            <Badge tone={contactHistoryBadgeTone(record.outcome)}>{record.outcome}</Badge>
            <Badge tone="slate">{record.entityType}</Badge>
            {record.nextFollowUpDate ? <Badge tone={record.nextFollowUpDate <= todayKey ? "amber" : "blue"}>Next {record.nextFollowUpDate}</Badge> : null}
          </div>
          <p className="mt-2 break-words text-sm font-black text-slate-950">{record.subject || record.entity?.label || "Manual communication"}</p>
          <p className="mt-1 text-xs font-bold text-slate-500">{record.entity?.label || record.contactName || "Unlinked context"} {record.entity?.subtitle ? `- ${record.entity.subtitle}` : ""}</p>
          <p className="mt-1 text-xs font-bold text-slate-500">{formatDateTime(record.contactedAt || record.createdAt)} by {record.createdByName || "Office"}</p>
          {record.messageDraft ? <p className="co-communications-log-draft mt-3 line-clamp-3 whitespace-pre-wrap rounded-2xl bg-blue-50/60 p-3 text-sm leading-6 text-slate-700">{record.messageDraft}</p> : null}
          {record.notes ? <p className="co-communications-log-notes mt-3 line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{record.notes}</p> : null}
        </div>
        <div className="co-communications-log-actions flex flex-wrap gap-2 lg:justify-end">
          <Button type="button" size="sm" variant="secondary" onClick={() => openRecord(record)}>Open Context</Button>
          {canManage && record.outcome !== "Waiting on Response" ? <Button type="button" size="sm" variant="ghost" onClick={() => onUpdateContactHistory(record.id, { outcome: "Waiting on Response" })} disabled={busy}>Mark waiting</Button> : null}
          {canManage ? <Button type="button" size="sm" variant="ghost" onClick={() => onArchiveContactHistory(record.id)} disabled={busy}>Archive</Button> : null}
        </div>
      </div>
    );
  }

  function renderProviderReadinessCard({ compact = false } = {}) {
    const readinessRows = providerReadinessState.rows;
    const approvalRows = providerReadinessState.outboundApprovals;
    const deliveryRows = providerReadinessState.deliveryAttemptContracts;
    return (
      <Card className="co-communications-rules-card p-4">
        <SectionHeader
          title="Provider readiness"
          description="Locked email/SMS evidence, suppression controls, and delivery-attempt contracts."
          action={<Button type="button" size="sm" variant="secondary" onClick={loadCommunicationProviderReadiness} disabled={busy || providerReadinessStatus.status === "loading"}>Refresh</Button>}
        />
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {providerReadinessState.summaryCards.map((card) => (
            <div key={card.id} className="co-ai-boundary-row" data-state={card.tone === "green" ? "safe" : card.tone === "amber" ? "manual" : "locked"}>
              <span>{card.label}</span>
              <strong>{card.value}</strong>
            </div>
          ))}
        </div>
        <div className="mt-3 grid gap-2">
          <div className="co-ai-boundary-row" data-state="locked"><span>Execution</span><strong>{providerReadinessState.lockedLabel}</strong></div>
          <div className="co-ai-boundary-row" data-state={providerReadinessState.statusTone === "green" ? "safe" : "manual"}><span>Adapter evidence</span><strong>{providerReadinessState.statusLabel}</strong></div>
        </div>
        {providerReadinessStatus.message ? <p className="mt-3 text-xs font-bold text-slate-500">{providerReadinessStatus.message}</p> : null}
        {readinessRows.length ? (
          <div className={`mt-3 grid gap-2 ${compact ? "" : "lg:grid-cols-2"}`}>
            {readinessRows.map((row) => (
              <div key={row.channel} className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-black text-slate-950">{row.channelLabel}</p>
                  <Badge tone={row.tone}>{row.statusLabel}</Badge>
                </div>
                <p className="mt-2 text-xs font-bold text-slate-500">Missing: {row.missingLabel}</p>
                <p className="mt-1 text-xs font-bold text-slate-500">{row.queuedApprovalCount || 0} approvals / {row.activeSuppressionCount || 0} suppressions / {row.deliveryAttemptContractCount || 0} delivery contracts</p>
              </div>
            ))}
          </div>
        ) : null}
        {canManage && selectedOption ? (
          <div className="mt-3 grid gap-3">
            <form className="grid gap-3 border-t border-slate-200 pt-3" onSubmit={submitOutboundApproval}>
              <p className="text-xs font-black uppercase text-slate-500">Locked outbound approval</p>
              <div className="grid gap-3 sm:grid-cols-[120px_minmax(0,1fr)]">
                <SelectField label="Channel" value={approvalDraft.channel} onChange={(event) => setApprovalDraft((current) => ({ ...current, channel: event.target.value, recipient: event.target.value === "sms" ? draft.contactPhone : draft.contactEmail }))} disabled={busy}>
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                </SelectField>
                <InputField label="Recipient" value={approvalDraft.recipient} onChange={(event) => setApprovalDraft((current) => ({ ...current, recipient: event.target.value }))} disabled={busy} placeholder="Reviewed email or phone" />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <SelectField label="Consent" value={approvalDraft.consentConfirmed} onChange={(event) => setApprovalDraft((current) => ({ ...current, consentConfirmed: event.target.value }))} disabled={busy}>
                  <option value="false">Not confirmed</option>
                  <option value="true">Confirmed</option>
                </SelectField>
                <SelectField label="Template" value={approvalDraft.templateReviewed} onChange={(event) => setApprovalDraft((current) => ({ ...current, templateReviewed: event.target.value }))} disabled={busy}>
                  <option value="false">Needs review</option>
                  <option value="true">Reviewed</option>
                </SelectField>
                <SelectField label="Human review" value={approvalDraft.humanReviewConfirmed} onChange={(event) => setApprovalDraft((current) => ({ ...current, humanReviewConfirmed: event.target.value }))} disabled={busy}>
                  <option value="false">Required</option>
                  <option value="true">Confirmed</option>
                </SelectField>
              </div>
              <TextAreaField label="Message preview" value={approvalDraft.messagePreview} onChange={(event) => setApprovalDraft((current) => ({ ...current, messagePreview: event.target.value }))} disabled={busy} placeholder="Customer-visible copy for review. This is not sent." />
              <div className="co-communications-submit-row flex flex-wrap items-center gap-3">
                <Button type="submit" size="sm" disabled={busy || !approvalDraft.recipient}>Queue locked approval</Button>
                <p className="text-xs font-bold text-slate-500">Approval queue only; no email, SMS, provider request, or portal notification is sent.</p>
              </div>
            </form>
            <form className="grid gap-3 border-t border-slate-200 pt-3" onSubmit={submitSuppression}>
              <p className="text-xs font-black uppercase text-slate-500">Locked suppression evidence</p>
              <div className="grid gap-3 sm:grid-cols-[120px_160px_minmax(0,1fr)]">
                <SelectField label="Channel" value={suppressionDraft.channel} onChange={(event) => setSuppressionDraft((current) => ({ ...current, channel: event.target.value }))} disabled={busy}>
                  <option value="all">All</option>
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                </SelectField>
                <SelectField label="Reason" value={suppressionDraft.reason} onChange={(event) => setSuppressionDraft((current) => ({ ...current, reason: event.target.value }))} disabled={busy}>
                  <option value="do_not_contact">Do not contact</option>
                  <option value="opt_out">Opt out</option>
                  <option value="bounce">Bounce</option>
                  <option value="complaint">Complaint</option>
                  <option value="manual_hold">Manual hold</option>
                </SelectField>
                <InputField label="Recipient" value={suppressionDraft.recipient} onChange={(event) => setSuppressionDraft((current) => ({ ...current, recipient: event.target.value }))} disabled={busy} placeholder="Email or phone" />
              </div>
              <TextAreaField label="Suppression note" value={suppressionDraft.note} onChange={(event) => setSuppressionDraft((current) => ({ ...current, note: event.target.value }))} disabled={busy} placeholder="Internal evidence only. No provider unsubscribe or customer message is sent." />
              <div className="co-communications-submit-row flex flex-wrap items-center gap-3">
                <Button type="submit" size="sm" disabled={busy || !suppressionDraft.recipient}>Record suppression</Button>
                <p className="text-xs font-bold text-slate-500">Locked evidence only; no email, SMS, provider request, or unsubscribe call is executed.</p>
              </div>
            </form>
          </div>
        ) : null}
        {approvalRows.length ? (
          <div className="mt-3 grid gap-2">
            <p className="text-xs font-black uppercase text-slate-500">Locked approval queue</p>
            {approvalRows.slice(0, compact ? 2 : 4).map((item) => (
              <div key={item.id} className="co-communications-log-row grid gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-2">
                    <Badge tone={item.statusTone}>{item.statusLabel}</Badge>
                    <Badge tone="slate">{item.channelLabel}</Badge>
                  </div>
                  <p className="mt-2 break-words text-sm font-black text-slate-950">{item.recipient}</p>
                  <p className="mt-1 text-xs font-bold text-slate-500">{item.blockerLabel}</p>
                </div>
                {canManage ? <Button type="button" size="sm" variant="secondary" onClick={() => prepareDeliveryAttemptContract(item.id)} disabled={busy}>Prepare contract</Button> : null}
              </div>
            ))}
          </div>
        ) : null}
        {deliveryRows.length ? (
          <div className="mt-3 grid gap-2">
            <p className="text-xs font-black uppercase text-slate-500">Locked delivery contracts</p>
            {deliveryRows.slice(0, compact ? 2 : 4).map((item) => (
              <div key={item.id} className="co-communications-log-row p-3">
                <div className="flex flex-wrap gap-2">
                  <Badge tone={item.statusTone}>{item.statusLabel}</Badge>
                  <Badge tone="slate">{item.channelLabel}</Badge>
                </div>
                <p className="mt-2 break-words text-sm font-black text-slate-950">{item.recipient}</p>
                <p className="mt-1 text-xs font-bold text-slate-500">Failures: {item.failureLabel}</p>
                <p className="mt-1 text-xs font-bold text-slate-500">Provider request prepared: No / sent: No</p>
              </div>
            ))}
          </div>
        ) : null}
        {providerReadinessState.suppressions.length ? (
          <div className="mt-3 grid gap-2">
            {providerReadinessState.suppressions.slice(0, compact ? 2 : 4).map((item) => (
              <div key={item.id} className="co-communications-log-row p-3">
                <div className="flex flex-wrap gap-2">
                  <Badge tone="amber">{item.reasonLabel}</Badge>
                  <Badge tone="slate">{item.channelLabel}</Badge>
                </div>
                <p className="mt-2 break-words text-sm font-black text-slate-950">{item.recipient}</p>
                <p className="mt-1 text-xs font-bold text-slate-500">{formatDateTime(item.recordedAt || item.auditCreatedAt)} by {item.requestedByName || item.actorName || "Office"}</p>
              </div>
            ))}
          </div>
        ) : null}
      </Card>
    );
  }

  function renderCustomerPortalCommandCard({ compact = false } = {}) {
    if (!canViewCustomerPortalPreview) {
      return (
        <Card className="co-communications-rules-card p-4">
          <SectionHeader
            title="Customer Portal Command"
            description="Provider-ready portal workflow is available for owner/admin Elite workspaces."
            action={<Badge tone="amber">Needs package</Badge>}
          />
          <div className="mb-3 grid gap-2">
            <div className="co-ai-boundary-row" data-state="locked"><span>Preview/share workflow</span><strong>Package gated</strong></div>
            <div className="co-ai-boundary-row" data-state="manual"><span>Customer decisions</span><strong>Internal review only</strong></div>
            <div className="co-ai-boundary-row" data-state="locked"><span>External portal execution</span><strong>Locked</strong></div>
          </div>
          <StateCard
            title="Customer portal is package-gated"
            description="Proposal packets, proof, comments, approvals, and send evidence stay internal until the workspace has the required package/provider setup."
            tone="slate"
          />
        </Card>
      );
    }

    return (
      <Card className="co-communications-rules-card p-4">
        <SectionHeader
          title="Customer Portal Command"
          description="Owner/admin workflow for proposal proof packets, expiring access records, share review, comments, and locked communication handoff."
          action={<Button type="button" size="sm" variant="secondary" onClick={loadCustomerPortalCommandCenter} disabled={busy || portalStatus.status === "loading"}>Refresh</Button>}
        />
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {portalCommandState.summaryCards.slice(0, compact ? 4 : 5).map((card) => (
            <div key={card.id} className="co-ai-boundary-row" data-state={card.tone === "green" ? "safe" : card.tone === "amber" ? "manual" : "locked"}>
              <span>{card.label}</span>
              <strong>{card.value}</strong>
            </div>
          ))}
        </div>
        <div className="mt-3 grid gap-2">
          {portalCommandState.boundaryRows.map((row) => (
            <div key={row.label} className="co-ai-boundary-row" data-state={row.state}>
              <span>{row.label}</span>
              <strong>{row.value}</strong>
            </div>
          ))}
        </div>
        {portalStatus.message ? <p className="mt-3 text-xs font-bold text-slate-500">{portalStatus.message}</p> : null}

        <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
          <p className="text-xs font-black uppercase text-slate-500">Customer-safe packet candidate</p>
          <p className="mt-2 break-words text-sm font-black text-slate-950">{portalCommandState.preview.estimateTitle || "Approved proposal pending"}</p>
          <p className="mt-1 text-xs font-bold text-slate-500">{portalCommandState.preview.customer || "Customer pending"} / {portalCommandState.preview.estimateTotal || "$0"} / {portalCommandState.preview.jobStatus || "Job pending"}</p>
          <div className="mt-3 grid gap-2">
            {portalCommandState.readiness.slice(0, compact ? 3 : 4).map((item) => (
              <div key={item.id} className="co-ai-boundary-row" data-state={item.ready ? "safe" : "manual"}>
                <span>{item.label}</span>
                <strong>{item.ready ? "Ready" : "Review"}</strong>
              </div>
            ))}
          </div>
        </div>

        {canManage ? (
          <form className="mt-3 grid gap-3 border-t border-slate-200 pt-3" onSubmit={preparePortalAccessRecord}>
            <p className="text-xs font-black uppercase text-slate-500">Prepare expiring access record</p>
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <SelectField label="Approved proposal" value={portalAccessDraft.estimateId} onChange={(event) => setPortalAccessDraft((current) => ({ ...current, estimateId: event.target.value }))} disabled={busy || !approvedEstimateOptions.length}>
                <option value="">Choose approved estimate</option>
                {approvedEstimateOptions.map((estimate) => (
                  <option key={estimate.id} value={estimate.id}>{estimate.label}{estimate.customer ? ` - ${estimate.customer}` : ""}</option>
                ))}
              </SelectField>
              <InputField label="Expires at" value={portalAccessDraft.expiresAt} onChange={(event) => setPortalAccessDraft((current) => ({ ...current, expiresAt: event.target.value }))} disabled={busy} />
            </div>
            <InputField label="Approval reference" value={portalAccessDraft.approvalId} onChange={(event) => setPortalAccessDraft((current) => ({ ...current, approvalId: event.target.value }))} disabled={busy} />
            <div className="co-communications-submit-row flex flex-wrap items-center gap-3">
              <Button type="submit" size="sm" disabled={busy || !portalAccessDraft.estimateId || !portalAccessDraft.expiresAt}>Prepare access record</Button>
              <p className="text-xs font-bold text-slate-500">Creates locked audit evidence only; no customer link, token, login, approval, message, invoice, or payment.</p>
            </div>
          </form>
        ) : null}

        {portalCommandState.accessRecords.length ? (
          <div className="mt-3 grid gap-2">
            <p className="text-xs font-black uppercase text-slate-500">Expiring access records</p>
            {portalCommandState.accessRecords.slice(0, compact ? 2 : 4).map((record) => (
              <div key={record.id} className="co-communications-log-row grid gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-2">
                    <Badge tone={record.tone}>{record.statusLabel}</Badge>
                    <Badge tone="slate">{record.id}</Badge>
                  </div>
                  <p className="mt-2 break-words text-sm font-black text-slate-950">{record.customer || "Customer pending"}</p>
                  <p className="mt-1 text-xs font-bold text-slate-500">Estimate {record.estimateId || "pending"} / expires {record.expiresLabel}</p>
                </div>
                <div className="co-communications-log-actions flex flex-wrap gap-2 lg:justify-end">
                  <Button type="button" size="sm" variant="secondary" onClick={() => previewPortalPacket(record.id)} disabled={busy}>Packet</Button>
                  {record.status === "prepared_locked" && canManage ? <Button type="button" size="sm" variant="secondary" onClick={() => requestPortalShareApproval(record.id)} disabled={busy}>Queue review</Button> : null}
                  {record.status === "prepared_locked" && canManage ? <Button type="button" size="sm" variant="ghost" onClick={() => revokePortalAccessRecord(record.id)} disabled={busy}>Revoke</Button> : null}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        <div className="mt-3 grid gap-3 border-t border-slate-200 pt-3">
          <TextAreaField label="Owner/admin review note" value={portalReviewNote} onChange={(event) => setPortalReviewNote(event.target.value)} disabled={busy || !canManage} />
          {portalCommandState.shareApprovalRequests.length ? (
            <div className="grid gap-2">
              <p className="text-xs font-black uppercase text-slate-500">Share approval queue</p>
              {portalCommandState.shareApprovalRequests.slice(0, compact ? 2 : 4).map((request) => (
                <div key={request.id} className="co-communications-log-row grid gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-2">
                      <Badge tone={request.tone}>{request.statusLabel}</Badge>
                      <Badge tone="slate">{request.id}</Badge>
                    </div>
                    <p className="mt-2 break-words text-sm font-black text-slate-950">{request.customerLabel}</p>
                    <p className="mt-1 text-xs font-bold text-slate-500">{request.requestNote || "Portal packet review requested."}</p>
                  </div>
                  {canManage ? (
                    <div className="co-communications-log-actions flex flex-wrap gap-2 lg:justify-end">
                      {request.status === "requested_locked" ? <Button type="button" size="sm" variant="secondary" onClick={() => reviewPortalShareApproval(request.id, "ready_for_external_gate_review_locked")} disabled={busy}>Ready</Button> : null}
                      {request.status === "requested_locked" ? <Button type="button" size="sm" variant="ghost" onClick={() => reviewPortalShareApproval(request.id, "changes_requested_locked")} disabled={busy}>Changes</Button> : null}
                      {request.status === "requested_locked" ? <Button type="button" size="sm" variant="ghost" onClick={() => reviewPortalShareApproval(request.id, "rejected_locked")} disabled={busy}>Reject</Button> : null}
                      {request.status === "ready_for_external_gate_review_locked" ? <Button type="button" size="sm" variant="secondary" onClick={() => preflightPortalShareApproval(request.id)} disabled={busy}>Preflight</Button> : null}
                      {request.status === "ready_for_external_gate_review_locked" ? <Button type="button" size="sm" variant="secondary" onClick={() => preparePortalExecutionContract(request.id)} disabled={busy}>Contract</Button> : null}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <form className="mt-3 grid gap-3 border-t border-slate-200 pt-3" onSubmit={recordPortalCustomerComment}>
          <p className="text-xs font-black uppercase text-slate-500">Customer comment / approval review</p>
          <SelectField label="Customer decision" value={portalDecision} onChange={(event) => setPortalDecision(event.target.value)} disabled={busy || !canManage}>
            {CUSTOMER_PORTAL_REVIEW_DECISIONS.map((decision) => (
              <option key={decision.id} value={decision.id}>{decision.label}</option>
            ))}
          </SelectField>
          <TextAreaField label="Customer comment" value={portalComment} onChange={(event) => setPortalComment(event.target.value)} disabled={busy || !canManage} placeholder="Paste a customer comment, approval note, rejection reason, or change-order question for internal follow-up." />
          <div className="co-communications-submit-row flex flex-wrap items-center gap-3">
            <Button type="submit" size="sm" disabled={busy || !canManage || !portalComment.trim()}>Record review</Button>
            <p className="text-xs font-bold text-slate-500">Stored as internal contact history on the proposal/job; no portal action or message is sent.</p>
          </div>
        </form>

        {portalPacketPreview ? (
          <details className="mt-3">
            <summary className="cursor-pointer text-sm font-black text-slate-700">Internal packet preview</summary>
            <pre className="mt-3 max-h-72 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-700">{portalPacketPreview}</pre>
          </details>
        ) : null}
      </Card>
    );
  }

  function renderCommunicationShellDetail(item) {
    const option = item?.option || selectedOption;
    const relatedRecords = item?.relatedRecords || selectedRelatedRecords;

    if (!option) {
      return <StateCard title="No communication context" description="Create a lead, customer, estimate, or job before logging communication." tone="slate" />;
    }

    return (
      <div className="co-communications-shell-detail-scroll">
        <div className="co-communications-selected-context">
          <span>Selected context</span>
          <strong>{option.label}</strong>
          {option.subtitle ? <em>{option.subtitle}</em> : null}
          <Badge tone="slate">{option.type}</Badge>
        </div>

        <form className="co-communications-form grid gap-3" onSubmit={submitCommunication}>
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <SelectField label="Link communication to" value={selectedOption?.key || ""} onChange={(event) => setSelectedKey(event.target.value)} disabled={busy || !canManage}>
              {centerState.options.map((communicationOption) => (
                <option key={communicationOption.key} value={communicationOption.key}>{communicationOption.label} - {communicationOption.type}</option>
              ))}
            </SelectField>
            <Button type="button" variant="secondary" onClick={() => openRecord(option)}>Open Context</Button>
          </div>
          <div className="co-communications-method-row flex flex-wrap gap-2">
            {["Call", "Email", "Text", "In Person", "Other"].map((method) => (
              <Button key={method} type="button" size="sm" variant={draft.method === method ? "primary" : "secondary"} onClick={() => setQuickMethod(method)} disabled={busy || !canManage}>
                {method}
              </Button>
            ))}
          </div>
          <div className="co-communications-compact-fields grid gap-3 md:grid-cols-3">
            <SelectField label="Direction" value={draft.direction} onChange={(event) => setDraft((current) => ({ ...current, direction: event.target.value }))} disabled={busy || !canManage}>
              {CONTACT_HISTORY_DIRECTIONS.map((direction) => <option key={direction} value={direction}>{direction === "outbound" ? "Outbound" : "Inbound"}</option>)}
            </SelectField>
            <SelectField label="Outcome" value={draft.outcome} onChange={(event) => setDraft((current) => ({ ...current, outcome: event.target.value }))} disabled={busy || !canManage}>
              {CONTACT_HISTORY_OUTCOMES.map((outcome) => <option key={outcome}>{outcome}</option>)}
            </SelectField>
            <InputField label="Next follow-up" type="date" value={draft.nextFollowUpDate} onChange={(event) => setDraft((current) => ({ ...current, nextFollowUpDate: event.target.value }))} disabled={busy || !canManage} />
          </div>
          <InputField label="Subject / short title" value={draft.subject} onChange={(event) => setDraft((current) => ({ ...current, subject: event.target.value }))} disabled={busy || !canManage} placeholder="Estimate follow-up, site visit, approval call" />
          <div className="co-communications-note-grid grid gap-3 lg:grid-cols-2">
            <TextAreaField label="Draft / script" value={draft.messageDraft} onChange={(event) => setDraft((current) => ({ ...current, messageDraft: event.target.value }))} disabled={busy || !canManage} placeholder="Manual email/SMS/call script. Stored only; Apex HQ does not send it." />
            <TextAreaField label="Outcome notes" value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} disabled={busy || !canManage} placeholder="What happened and what needs to happen next." />
          </div>
          <div className="co-communications-submit-row flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={busy || !canManage || !selectedOption}>Save communication</Button>
            <p className="text-sm font-bold text-slate-500">{message || "Manual-only: no email, text, or phone call is sent."}</p>
          </div>
        </form>

        <section className="co-communications-detail-section">
          <SectionHeader
            title="Selected timeline"
            description="Manual outreach history for this selected lead, customer, estimate, or job."
            action={<Badge tone={relatedRecords.length ? "blue" : "slate"}>{relatedRecords.length} logged</Badge>}
          />
          <div className="co-communications-log-stack divide-y divide-slate-100">
            {relatedRecords.length ? relatedRecords.slice(0, 4).map((record) => renderCommunicationRecord(record, { compact: true })) : (
              <StateCard title="No touches logged" description="Save the first manual communication note when the next call, text draft, or email draft is ready." tone="slate" />
            )}
          </div>
        </section>
        <section className="co-communications-detail-section">
          {renderCustomerPortalCommandCard({ compact: true })}
        </section>
        <section className="co-communications-detail-section">
          {renderProviderReadinessCard({ compact: true })}
        </section>
      </div>
    );
  }

  function renderCommunicationFallbackPage() {
    return (
      <div className="co-office-page co-communications-page">
        <PageHeader
          eyebrow="Office"
          title="Communication Center"
          description="Manual-first customer, lead, estimate, and job communication context. Nothing is emailed, texted, or called automatically."
          actions={<Badge tone="blue">Manual Log</Badge>}
        />

        <div className="co-communications-shell grid min-w-0 gap-3 px-5 pb-6 sm:px-6 lg:px-8">
          <div className="co-communications-kpi-grid grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
              <Card key={stat.label} className="co-communications-kpi-card p-4" data-tone={stat.tone}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{stat.label}</p>
                    <p className="mt-2 text-3xl font-black text-slate-950">{stat.value}</p>
                    <p className="mt-1 text-xs font-bold text-slate-500">{stat.helper}</p>
                  </div>
                  <Badge tone={stat.tone}>{stat.label}</Badge>
                </div>
              </Card>
            ))}
          </div>

          <div className="co-communications-command-layout grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_380px]">
            <div className="co-communications-left-stack grid min-w-0 gap-3">
              <Card className="co-communications-main-board overflow-hidden">
                <div className="co-communications-board-header border-b border-slate-200 bg-white p-4">
                  <SectionHeader
                    title="Manual Outreach Command"
                    description="Log calls, copied email/text drafts, meeting notes, and next follow-up dates against the right record."
                    action={<Badge tone={canManage ? "green" : "slate"}>{canManage ? "Can edit" : "Read only"}</Badge>}
                  />
                </div>
                {!centerState.options.length ? (
                  <div className="p-4"><StateCard title="No records available" description="Create a lead, customer, estimate, or job before logging communication." tone="slate" /></div>
                ) : (
                  <form className="co-communications-form grid gap-3 p-4" onSubmit={submitCommunication}>
                    <SelectField label="Link communication to" value={selectedOption?.key || ""} onChange={(event) => setSelectedKey(event.target.value)} disabled={busy || !canManage}>
                      {centerState.options.map((option) => (
                        <option key={option.key} value={option.key}>{option.label} - {option.type}</option>
                      ))}
                    </SelectField>
                    {selectedOption ? (
                      <div className="co-communications-selected-context">
                        <span>Selected context</span>
                        <strong>{selectedOption.label}</strong>
                        {selectedOption.subtitle ? <em>{selectedOption.subtitle}</em> : null}
                        <Badge tone="slate">{selectedOption.type}</Badge>
                      </div>
                    ) : null}
                    <div className="co-communications-method-row flex flex-wrap gap-2">
                      {["Call", "Email", "Text", "In Person", "Other"].map((method) => (
                        <Button key={method} type="button" size="sm" variant={draft.method === method ? "primary" : "secondary"} onClick={() => setQuickMethod(method)} disabled={busy || !canManage}>
                          {method}
                        </Button>
                      ))}
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                      <InputField label="Contact name" value={draft.contactName} onChange={(event) => setDraft((current) => ({ ...current, contactName: event.target.value }))} disabled={busy || !canManage} />
                      <InputField label="Email" value={draft.contactEmail} onChange={(event) => setDraft((current) => ({ ...current, contactEmail: event.target.value }))} disabled={busy || !canManage} />
                      <InputField label="Phone" value={draft.contactPhone} onChange={(event) => setDraft((current) => ({ ...current, contactPhone: event.target.value }))} disabled={busy || !canManage} />
                    </div>
                    <div className="grid gap-3 md:grid-cols-4">
                      <SelectField label="Method" value={draft.method} onChange={(event) => setDraft((current) => ({ ...current, method: event.target.value }))} disabled={busy || !canManage}>
                        {CONTACT_HISTORY_METHODS.map((method) => <option key={method}>{method}</option>)}
                      </SelectField>
                      <SelectField label="Direction" value={draft.direction} onChange={(event) => setDraft((current) => ({ ...current, direction: event.target.value }))} disabled={busy || !canManage}>
                        {CONTACT_HISTORY_DIRECTIONS.map((direction) => <option key={direction} value={direction}>{direction === "outbound" ? "Outbound" : "Inbound"}</option>)}
                      </SelectField>
                      <SelectField label="Outcome" value={draft.outcome} onChange={(event) => setDraft((current) => ({ ...current, outcome: event.target.value }))} disabled={busy || !canManage}>
                        {CONTACT_HISTORY_OUTCOMES.map((outcome) => <option key={outcome}>{outcome}</option>)}
                      </SelectField>
                      <InputField label="Next follow-up" type="date" value={draft.nextFollowUpDate} onChange={(event) => setDraft((current) => ({ ...current, nextFollowUpDate: event.target.value }))} disabled={busy || !canManage} />
                    </div>
                    <InputField label="Subject / short title" value={draft.subject} onChange={(event) => setDraft((current) => ({ ...current, subject: event.target.value }))} disabled={busy || !canManage} placeholder="Estimate follow-up, site visit, approval call" />
                    <TextAreaField label="Draft message / script" value={draft.messageDraft} onChange={(event) => setDraft((current) => ({ ...current, messageDraft: event.target.value }))} disabled={busy || !canManage} placeholder="Manual email/SMS/call script. Stored only; Apex HQ does not send it." />
                    <TextAreaField label="Outcome notes" value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} disabled={busy || !canManage} placeholder="What happened, what the customer said, and what needs to happen next." />
                    <div className="co-communications-submit-row flex flex-wrap items-center gap-3">
                      <Button type="submit" disabled={busy || !canManage || !selectedOption}>Save communication</Button>
                      <p className="text-sm font-bold text-slate-500">{message || "Manual-only: no email, text, or phone call is sent."}</p>
                    </div>
                  </form>
                )}
              </Card>

              <Card className="co-communications-log-card overflow-hidden">
                <div className="co-communications-log-header border-b border-slate-200 p-4">
                  <SectionHeader title="Communication log" description="Search recent manual notes, drafts, follow-ups, and customer responses across office records." />
                  <div className="mt-3 grid gap-3 md:grid-cols-[220px_minmax(0,1fr)]">
                    <SelectField label="Type" value={entityTypeFilter} onChange={(event) => setEntityTypeFilter(event.target.value)}>
                      <option value="all">All records</option>
                      <option value="lead">Leads</option>
                      <option value="customer">Customers</option>
                      <option value="estimate">Estimates</option>
                      <option value="job">Jobs</option>
                    </SelectField>
                    <InputField label="Search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Customer, project, subject, outcome, or notes" />
                  </div>
                </div>
                <div className="divide-y divide-slate-100">
                  {centerState.filteredRecords.slice(0, 18).map((record) => renderCommunicationRecord(record))}
                  {!centerState.filteredRecords.length ? (
                    <div className="p-5"><StateCard title="No communication matches" description="Clear the filter or log the next manual customer touch." tone="slate" /></div>
                  ) : null}
                </div>
              </Card>
            </div>

            <aside className="co-communications-rail grid min-w-0 gap-3 content-start">
              {FollowUpQueuePanelComponent ? <FollowUpQueuePanelComponent
                leads={leads}
                customers={customers}
                estimates={estimates}
                leadSources={leadSources}
                contactHistory={contactHistory}
                permissions={permissions}
                companyName={companyName}
                user={user}
                disabled={busy}
                onOpenLead={onSelectLead}
                onOpenCustomer={onSelectCustomer}
                onOpenEstimate={onOpenEstimate}
                onOpenLeads={() => onSelectLead(leads[0]?.id || "")}
                onCreateContactHistory={onCreateContactHistory}
                compact
                maxItems={8}
              /> : null}
              {renderCustomerPortalCommandCard()}
              {renderProviderReadinessCard()}
              <Card className="co-communications-rules-card p-4">
                <SectionHeader title="Manual communication rules" description="This phase is visibility and logging only." />
                <div className="grid gap-2">
                  <div className="co-ai-boundary-row" data-state="manual"><span>Email/SMS</span><strong>Manual only</strong></div>
                  <div className="co-ai-boundary-row" data-state="safe"><span>Office data</span><strong>Role protected</strong></div>
                  <div className="co-ai-boundary-row" data-state="safe"><span>Company data</span><strong>Scoped server-side</strong></div>
                  <div className="co-ai-boundary-row" data-state="manual"><span>Automation</span><strong>Not included</strong></div>
                </div>
              </Card>
            </aside>
          </div>
        </div>
      </div>
    );
  }

  if (!isDesktopCommandViewport) {
    return renderCommunicationFallbackPage();
  }

  return (
    <div className="co-office-page co-communications-page co-communications-shell-page">
      <ApexOfficeCommandShell
        eyebrow="Office"
        title="Communication Center"
        description="Manual-first customer, lead, estimate, and job communication context. Nothing is emailed, texted, or called automatically."
        kpis={stats}
        queue={{
          title: "Communication queue",
          description: `${communicationShellQueue.length} lead, customer, estimate, and job context${communicationShellQueue.length === 1 ? "" : "s"} ready for manual outreach.`,
          items: communicationShellQueue,
          selectedId: selectedCommunicationShellItem?.id,
          onSelect: selectCommunicationShellItem,
          limit: 5,
          emptyState: <StateCard title="No records available" description="Create a lead, customer, estimate, or job before logging communication." tone="slate" />,
        }}
        detail={{
          title: "Manual outreach detail",
          item: selectedCommunicationShellItem,
          render: renderCommunicationShellDetail,
          emptyState: <StateCard title="No communication selected" description="Select a lead, customer, estimate, or job to log the next safe manual touch." tone="slate" />,
        }}
        quickActions={[
          { id: "due-follow-up", label: "Due Follow-Up", icon: "clock", onClick: () => openFirstCommunicationShellItem((item) => ["Overdue", "Due Today"].includes(item.statusLabel)), disabled: !communicationShellQueue.some((item) => ["Overdue", "Due Today"].includes(item.statusLabel)) },
          { id: "waiting-replies", label: "Waiting Replies", icon: "inbox", onClick: () => openFirstCommunicationShellItem((item) => item.statusLabel === "Waiting"), disabled: !communicationShellQueue.some((item) => item.statusLabel === "Waiting") },
          { id: "first-touch", label: "First Touch", icon: "plus", onClick: () => openFirstCommunicationShellItem((item) => item.statusLabel === "No Touch"), disabled: !communicationShellQueue.some((item) => item.statusLabel === "No Touch") },
        ]}
        className="co-communications-command-shell"
      />
    </div>
  );
}
