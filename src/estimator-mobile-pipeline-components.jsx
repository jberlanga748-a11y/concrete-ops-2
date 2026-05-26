import { useEffect, useMemo, useState } from "react";

import {
  ApexMobileActionQueue,
  ApexMobileContactActionBar,
  ApexMobileKpiGrid,
  ApexMobileRoleShell,
  Badge,
  Button,
  StateCard,
  StatusBadge,
} from "./app-shell-components";
import { DEFAULT_COMPANY_NAME } from "./brand-utils";
import { estimateDisplayCustomer, estimateDisplayTitle } from "./estimate-display-utils";
import { estimateStatusLabel } from "./estimate-utils";
import { formatLeadFollowUpDate, isLeadFollowUpDue, isLeadReadyForEstimate, leadHasMissingInfoCheck } from "./lead-route-components";
import { buildOwnerMobileContactDirectory, ownerMobileRecordContact, ownerMobileSafeContactDraft } from "./owner-mobile-contact-utils";

function normalizeObjectArray(value, fallback = []) {
  if (Array.isArray(value)) {
    return value.filter((item) => item && typeof item === "object");
  }
  if (Array.isArray(fallback)) {
    return fallback.filter((item) => item && typeof item === "object");
  }
  return [];
}

function todayDateInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function normalizePipelineStatus(value) {
  return String(value || "").trim().toLowerCase();
}

export function leadNeedsMobileFollowUp(lead = {}, today = todayDateInputValue()) {
  const status = normalizePipelineStatus(lead.status);
  const due = String(lead.followUpDueAt || "").slice(0, 10);
  return status === "new" || isLeadFollowUpDue(lead, today) || Boolean(due && due <= today);
}

export function leadMissingMobileInfo(lead = {}) {
  const missingItems = Array.isArray(lead.missingInfoItems) ? lead.missingInfoItems : [];
  const missingCount = Number(lead.missingInfoCount || 0);
  const missingStatus = String(lead.missingInfoStatus || "").toLowerCase();
  return missingItems.length > 0 || missingCount > 0 || missingStatus.includes("missing") || !leadHasMissingInfoCheck(lead);
}

export function buildEstimatorMobilePipelineQueue({ leads = [], estimates = [], customers = [], companyName = DEFAULT_COMPANY_NAME } = {}) {
  const today = todayDateInputValue();
  const visibleLeads = normalizeObjectArray(leads).filter((lead) => !lead.archivedAt);
  const visibleEstimates = normalizeObjectArray(estimates).filter((estimate) => !estimate.archivedAt);
  const contactDirectory = buildOwnerMobileContactDirectory({ customers, leads: visibleLeads, jobs: [] });
  const rows = [];

  function addRow(row, record = {}) {
    if (!row?.id || !row?.title) return;
    const contact = ownerMobileRecordContact(record, contactDirectory);
    const drafts = ownerMobileSafeContactDraft({ ...row, contact }, companyName);
    rows.push({ ...row, record, contact, ...drafts });
  }

  visibleLeads
    .filter((lead) => leadNeedsMobileFollowUp(lead, today))
    .slice(0, 4)
    .forEach((lead, index) => addRow({
      id: `pipeline-followup-${lead.id}`,
      priority: 10 + index,
      kind: "lead",
      moduleId: "leads",
      recordId: lead.id,
      eyebrow: "Follow-up due",
      title: lead.customer || lead.project || "Lead follow-up",
      description: lead.project || lead.nextStep || "Lead needs a manual follow-up.",
      publicSummary: "I wanted to follow up on your project and confirm the next step",
      statusLabel: formatLeadFollowUpDate(lead.followUpDueAt) || lead.status || "Due",
      actionLabel: "Open lead",
      tone: "orange",
      nextSafeAction: lead.nextStep || "Review the lead before contacting the customer.",
    }, lead));

  visibleLeads
    .filter(isLeadReadyForEstimate)
    .slice(0, 3)
    .forEach((lead, index) => addRow({
      id: `pipeline-ready-${lead.id}`,
      priority: 20 + index,
      kind: "lead",
      moduleId: "leads",
      recordId: lead.id,
      eyebrow: "Estimate ready",
      title: lead.customer || lead.project || "Estimate-ready lead",
      description: lead.project || "Enough info is ready for an estimate draft.",
      publicSummary: "we have enough project information to review the estimate path",
      statusLabel: lead.status || "Ready",
      actionLabel: "Create estimate",
      tone: "green",
      nextSafeAction: "Open the lead and create an estimate only after review.",
    }, lead));

  visibleEstimates
    .filter((estimate) => normalizePipelineStatus(estimate.status) === "sent")
    .slice(0, 4)
    .forEach((estimate, index) => addRow({
      id: `pipeline-sent-${estimate.id}`,
      priority: 30 + index,
      kind: "estimate",
      moduleId: "estimates",
      recordId: estimate.id,
      eyebrow: "Sent to win",
      title: estimateDisplayTitle(estimate),
      description: estimateDisplayCustomer(estimate) || "Sent proposal waiting on a manual response.",
      publicSummary: "I wanted to check whether you had any questions about the proposal",
      statusLabel: estimateStatusLabel(estimate.status),
      actionLabel: "Open estimate",
      tone: "blue",
      nextSafeAction: "Open the estimate for review-first follow-up. No send happens here.",
    }, estimate));

  visibleLeads
    .filter(leadMissingMobileInfo)
    .slice(0, 4)
    .forEach((lead, index) => addRow({
      id: `pipeline-missing-${lead.id}`,
      priority: 40 + index,
      kind: "lead",
      moduleId: "leads",
      recordId: lead.id,
      eyebrow: "Missing info",
      title: lead.customer || lead.project || "Lead needs info",
      description: lead.project || lead.nextStep || "Missing details are blocking estimate readiness.",
      publicSummary: "we are confirming a few project details before the estimate can move forward",
      statusLabel: "Needs info",
      actionLabel: "Review info",
      tone: "amber",
      nextSafeAction: "Review missing info. Drafts stay customer-safe and manual.",
    }, lead));

  visibleEstimates
    .filter((estimate) => normalizePipelineStatus(estimate.status) === "draft")
    .slice(0, 3)
    .forEach((estimate, index) => addRow({
      id: `pipeline-draft-${estimate.id}`,
      priority: 50 + index,
      kind: "estimate",
      moduleId: "estimates",
      recordId: estimate.id,
      eyebrow: "Draft estimate",
      title: estimateDisplayTitle(estimate),
      description: estimateDisplayCustomer(estimate) || "Draft proposal needs review.",
      publicSummary: "your proposal is still in review and we will confirm the next step manually",
      statusLabel: estimateStatusLabel(estimate.status),
      actionLabel: "Open draft",
      tone: "orange",
      nextSafeAction: "Open estimate tools; no send or conversion happens from mobile pipeline.",
    }, estimate));

  return rows
    .sort((left, right) => Number(left.priority || 99) - Number(right.priority || 99) || left.title.localeCompare(right.title))
    .filter((row, index, list) => list.findIndex((candidate) => candidate.id === row.id) === index)
    .slice(0, 5);
}

export function EstimatorMobilePipelinePage({
  user,
  companyName = DEFAULT_COMPANY_NAME,
  leads = [],
  estimates = [],
  customers = [],
  permissions = {},
  setActive,
  onSelectLead,
  onOpenEstimate,
  onSelectCustomer,
  activeModule = "leads",
}) {
  void permissions;

  const today = todayDateInputValue();
  const visibleLeads = normalizeObjectArray(leads).filter((lead) => !lead.archivedAt);
  const visibleEstimates = normalizeObjectArray(estimates).filter((estimate) => !estimate.archivedAt);
  const queueItems = useMemo(() => buildEstimatorMobilePipelineQueue({ leads: visibleLeads, estimates: visibleEstimates, customers, companyName }), [companyName, customers, visibleEstimates, visibleLeads]);
  const isEstimateRoute = activeModule === "estimates";
  const estimateRouteQueueItems = useMemo(() => {
    if (activeModule !== "estimates") return [];
    const contactDirectory = buildOwnerMobileContactDirectory({ customers, leads: visibleLeads, jobs: [] });
    return visibleEstimates
      .map((estimate, index) => {
        const status = normalizePipelineStatus(estimate.status);
        const isSent = status === "sent";
        const isDraft = status === "draft";
        const isApproved = status === "approved";
        const contact = ownerMobileRecordContact(estimate, contactDirectory);
        const row = {
          id: `estimate-tablet-${estimate.id}`,
          priority: isSent ? 10 + index : isDraft ? 20 + index : isApproved ? 30 + index : 40 + index,
          kind: "estimate",
          moduleId: "estimates",
          recordId: estimate.id,
          record: estimate,
          eyebrow: isSent ? "Sent to win" : isDraft ? "Draft readiness" : isApproved ? "Approved handoff" : "Estimate review",
          title: estimateDisplayTitle(estimate),
          description: estimateDisplayCustomer(estimate) || "Estimate needs review.",
          publicSummary: isSent
            ? "I wanted to check whether you had any questions about the proposal"
            : "your proposal is still in review and we will confirm the next step manually",
          statusLabel: estimateStatusLabel(estimate.status),
          actionLabel: "Open estimate",
          tone: isSent ? "blue" : isDraft ? "orange" : isApproved ? "green" : "slate",
          nextSafeAction: isApproved
            ? "Open the estimate handoff review. Job conversion still requires job-create permission."
            : "Open the estimate for review-first work. No send or conversion happens from tablet.",
        };
        const drafts = ownerMobileSafeContactDraft({ ...row, contact }, companyName);
        return { ...row, contact, ...drafts };
      })
      .sort((left, right) => Number(left.priority || 99) - Number(right.priority || 99) || left.title.localeCompare(right.title))
      .slice(0, 5);
  }, [activeModule, companyName, customers, visibleEstimates, visibleLeads]);
  const displayQueueItems = useMemo(() => {
    if (activeModule !== "estimates") return queueItems;
    return [
      ...estimateRouteQueueItems,
      ...queueItems.filter((item) => item.kind !== "estimate"),
    ].filter((item, index, list) => list.findIndex((candidate) => candidate.id === item.id || (candidate.kind === item.kind && candidate.recordId === item.recordId)) === index).slice(0, 5);
  }, [activeModule, estimateRouteQueueItems, queueItems]);
  const mobileQueueItems = useMemo(() => displayQueueItems.slice(0, isEstimateRoute ? 5 : 3), [displayQueueItems, isEstimateRoute]);
  const [selectedPipelineId, setSelectedPipelineId] = useState("");
  const firstContactableItem = displayQueueItems.find((item) => item.contact?.phone || item.contact?.email);
  const selectedItem = displayQueueItems.find((item) => item.id === selectedPipelineId) || firstContactableItem || displayQueueItems[0] || null;
  const followUpsDue = visibleLeads.filter((lead) => leadNeedsMobileFollowUp(lead, today)).length;
  const estimateReady = visibleLeads.filter(isLeadReadyForEstimate).length;
  const sentToWin = visibleEstimates.filter((estimate) => normalizePipelineStatus(estimate.status) === "sent").length;
  const missingInfo = visibleLeads.filter(leadMissingMobileInfo).length;

  useEffect(() => {
    if (selectedItem && selectedItem.id !== selectedPipelineId) {
      setSelectedPipelineId(selectedItem.id);
    }
  }, [selectedItem, selectedPipelineId]);

  function openModule(moduleId) {
    if (moduleId) setActive?.(moduleId);
  }

  function openPipelineItem(item = selectedItem) {
    if (!item) return;
    if (item.kind === "lead" && item.recordId) {
      onSelectLead?.(item.recordId);
      return;
    }
    if (item.kind === "estimate" && item.recordId) {
      onOpenEstimate?.(item.recordId);
      return;
    }
    openModule(item.moduleId || "leads");
  }

  function openPipelineContact(item = selectedItem) {
    if (item?.contact?.moduleId === "customers" && item.contact.recordId && typeof onSelectCustomer === "function") {
      onSelectCustomer(item.contact.recordId);
      return;
    }
    if (item?.contact?.moduleId === "leads" && item.contact.recordId && typeof onSelectLead === "function") {
      onSelectLead(item.contact.recordId);
      return;
    }
    openPipelineItem(item);
  }

  const kpis = [
    { id: "follow-ups-due", label: "Follow-Ups Due", value: followUpsDue, helper: "Manual lead follow-ups", icon: "clock", tone: followUpsDue ? "orange" : "green", onClick: () => openModule("leads") },
    { id: "estimate-ready", label: "Estimate Ready Leads", value: estimateReady, helper: "Ready for estimate review", icon: "check", tone: estimateReady ? "green" : "slate", onClick: () => openModule("leads") },
    { id: "sent-to-win", label: "Sent To Win", value: sentToWin, helper: "Sent proposals to follow up", icon: "quote", tone: sentToWin ? "blue" : "slate", onClick: () => openModule("estimates") },
    { id: "missing-info", label: "Missing Info", value: missingInfo, helper: "Lead details to confirm", icon: "alert", tone: missingInfo ? "amber" : "green", onClick: () => openModule("leads") },
  ];

  return (
    <ApexMobileRoleShell
      eyebrow={companyName || DEFAULT_COMPANY_NAME}
      title={isEstimateRoute ? "Estimates" : "Pipeline"}
      description={isEstimateRoute
        ? `${user?.name || "Estimator"} estimate command: sent proposals, draft readiness, follow-ups, and missing info.`
        : `${user?.name || "Estimator"} sales command: lead follow-ups, estimate-ready work, sent proposals, and missing info.`}
      className="co-estimator-mobile-pipeline"
    >
      <ApexMobileKpiGrid items={kpis} />
      <ApexMobileActionQueue
        title={isEstimateRoute ? "Top estimate queue" : "Top 3 pipeline"}
        items={mobileQueueItems}
        selectedId={selectedItem?.id}
        onSelect={(item) => setSelectedPipelineId(item.id)}
      />
      <section className="co-apex-mobile-selected-card" data-tone={selectedItem?.tone || "slate"}>
        {selectedItem ? (
          <>
            <div className="co-apex-mobile-selected-head">
              <Badge tone={selectedItem.tone || "slate"}>{selectedItem.eyebrow || "Pipeline"}</Badge>
              <StatusBadge status={selectedItem.statusLabel || "Review"} />
            </div>
            <h2>{selectedItem.title}</h2>
            <p>{selectedItem.description || "Review this sales item before taking action."}</p>
            <div className="co-apex-mobile-selected-summary">
              <span>
                <em>Next safe action</em>
                <strong>{selectedItem.nextSafeAction || selectedItem.actionLabel || "Open full route"}</strong>
              </span>
              <span>
                <em>Contact</em>
                <strong>{selectedItem.contact?.phone || selectedItem.contact?.email || "Not set"}</strong>
              </span>
            </div>
            <ApexMobileContactActionBar
              phone={selectedItem.contact?.phone}
              email={selectedItem.contact?.email}
              subject={selectedItem.subject}
              textDraft={selectedItem.textDraft}
              emailBody={selectedItem.emailBody}
              onOpenContact={() => openPipelineContact(selectedItem)}
            />
            <div className="co-apex-mobile-selected-actions">
              <Button type="button" onClick={() => openPipelineItem(selectedItem)}>{selectedItem.actionLabel || "Open"}</Button>
              <Button type="button" variant="secondary" onClick={() => openModule(selectedItem.moduleId || activeModule || "leads")}>Full route</Button>
            </div>
            <p className="co-apex-mobile-guardrail">Manual only: text and email open drafts only. No sends, internal notes, backup/SOV, private URLs, pricing details, or job conversion from this card.</p>
          </>
        ) : (
          <StateCard title="Pipeline clear" description="Lead follow-ups, estimate-ready work, sent proposals, and missing-info items will appear here." tone="green" />
        )}
      </section>
    </ApexMobileRoleShell>
  );
}
