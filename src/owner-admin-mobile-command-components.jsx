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
import { deriveCommandCenterFinishState, deriveCommandCenterState } from "./command-center-utils";
import { estimateDisplayCustomer, estimateDisplayTitle } from "./estimate-display-utils";
import { estimateStatusLabel } from "./estimate-utils";
import { jobStatusLabel, jobTitle } from "./job-utils";
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

function normalizeMobileCommandStatus(value) {
  return String(value || "").trim().toLowerCase();
}

export function buildOwnerAdminMobileCommandQueue(commandCenter = {}, { jobs = [], estimates = [], dailyReports = [], changeOrderRequests = [], customers = [], leads = [], companyName = DEFAULT_COMPANY_NAME, permissions = {} } = {}) {
  const canViewEstimates = Boolean(permissions?.estimates?.canView);
  const liveJobs = normalizeObjectArray(jobs).filter((job) => !job.archivedAt);
  const visibleEstimates = canViewEstimates ? normalizeObjectArray(estimates).filter((estimate) => !estimate.archivedAt) : [];
  const reportRows = normalizeObjectArray(dailyReports).filter((report) => !report.archivedAt);
  const contactDirectory = buildOwnerMobileContactDirectory({ customers, leads, jobs });
  const openChangeOrders = normalizeObjectArray(commandCenter.changeOrders?.openChangeOrders).length
    ? normalizeObjectArray(commandCenter.changeOrders.openChangeOrders)
    : normalizeObjectArray(changeOrderRequests).filter((request) => !request.archivedAt && !["approved", "rejected", "declined", "closed", "completed", "archived"].includes(normalizeMobileCommandStatus(request.status)));
  const rows = [];

  function attachContact(row, record = {}) {
    const contact = ownerMobileRecordContact(record, contactDirectory);
    const drafts = ownerMobileSafeContactDraft({ ...row, contact }, companyName);
    return { ...row, contact, ...drafts };
  }

  function addRow(row, record) {
    if (!row?.id || !row?.title) return;
    rows.push(attachContact(row, record || row.record || {}));
  }

  liveJobs
    .filter((job) => normalizeMobileCommandStatus(job.status || job.stage) === "billing ready")
    .slice(0, 2)
    .forEach((job, index) => addRow({
      id: `mobile-ready-bill-${job.id}`,
      priority: 10 + index,
      kind: "job",
      moduleId: "jobs",
      recordId: job.id,
      record: job,
      eyebrow: "Ready to bill",
      title: jobTitle(job),
      description: [job.customer, job.address].filter(Boolean).join(" / ") || "Billing-ready job needs closeout review.",
      publicSummary: "the job is ready for closeout review before any billing step",
      statusLabel: jobStatusLabel(job.status || job.stage),
      actionLabel: "Review job",
      tone: "green",
      nextSafeAction: "Review proof and closeout in Jobs. No billing is triggered here.",
    }, job));

  normalizeObjectArray(commandCenter.uploads?.jobsMissingPhotos)
    .slice(0, 2)
    .forEach((job, index) => addRow({
      id: `mobile-proof-gap-${job.id}`,
      priority: 20 + index,
      kind: "job",
      moduleId: "uploads",
      recordId: job.id,
      record: job,
      eyebrow: "Job missing proof",
      title: jobTitle(job),
      description: [job.customer, job.address].filter(Boolean).join(" / ") || "Photo proof is missing.",
      publicSummary: "we need to confirm jobsite proof before office closeout",
      statusLabel: "Proof gap",
      actionLabel: "Open proof",
      tone: "amber",
      nextSafeAction: "Open Photos or the job proof chain. Contact draft stays customer-safe.",
    }, job));

  visibleEstimates
    .filter((estimate) => normalizeMobileCommandStatus(estimate.status) === "sent")
    .slice(0, 2)
    .forEach((estimate, index) => addRow({
      id: `mobile-estimate-followup-${estimate.id}`,
      priority: 30 + index,
      kind: "estimate",
      moduleId: "estimates",
      recordId: estimate.id,
      record: estimate,
      eyebrow: "Estimate needs follow-up",
      title: estimateDisplayTitle(estimate),
      description: estimateDisplayCustomer(estimate) || "Sent estimate waiting on a manual follow-up.",
      publicSummary: "I wanted to check whether you had any questions about the proposal",
      statusLabel: estimateStatusLabel(estimate.status),
      actionLabel: "Review estimate",
      tone: "orange",
      nextSafeAction: "Open Estimates for review-first follow-up. No send happens here.",
    }, estimate));

  openChangeOrders.slice(0, 2).forEach((request, index) => addRow({
    id: `mobile-change-review-${request.id}`,
    priority: 40 + index,
    kind: "changeOrder",
    moduleId: "changeOrders",
    recordId: request.id,
    record: request,
    eyebrow: "Change order needs review",
    title: request.title || request.scope || request.reason || "Change order request",
    description: [request.customer, request.jobTitle, request.status].filter(Boolean).join(" / ") || "Change order needs office review.",
    publicSummary: "there is a change request that needs office review before work moves forward",
    statusLabel: request.status || "Needs review",
    actionLabel: "Open change",
    tone: "red",
    nextSafeAction: "Review the change order in its full route. No approval is automated.",
  }, request));

  normalizeObjectArray(commandCenter.dailyReports?.activeJobsMissingTodayReport)
    .slice(0, 2)
    .forEach((job, index) => addRow({
      id: `mobile-report-overdue-${job.id}`,
      priority: 50 + index,
      kind: "report",
      moduleId: "reports",
      recordId: job.id,
      record: job,
      eyebrow: "Report overdue",
      title: jobTitle(job),
      description: [job.customer, job.address].filter(Boolean).join(" / ") || "Daily report is missing for active work.",
      publicSummary: "we are checking the daily job update before closeout",
      statusLabel: "Report missing",
      actionLabel: "Open reports",
      tone: "amber",
      nextSafeAction: "Open Reports and request field-safe completion if needed.",
    }, job));

  if (!rows.length) {
    reportRows.slice(0, 1).forEach((report) => addRow({
      id: `mobile-report-review-${report.id}`,
      priority: 60,
      kind: "report",
      moduleId: "reports",
      recordId: report.id,
      record: report,
      eyebrow: "Report review",
      title: report.title || report.jobTitle || "Daily report",
      description: report.status || "Review the latest field report.",
      publicSummary: "we are reviewing the latest job update",
      statusLabel: report.status || "Review",
      actionLabel: "Open report",
      tone: "blue",
      nextSafeAction: "Open Reports for the full review workflow.",
    }, report));
  }

  return rows
    .sort((left, right) => Number(left.priority || 99) - Number(right.priority || 99) || left.title.localeCompare(right.title))
    .slice(0, 5);
}

export function OwnerAdminMobileCommandPage({
  user,
  currentCompanyId,
  companyName = DEFAULT_COMPANY_NAME,
  companySettings,
  emailSendingConfigured,
  leads,
  customers,
  estimates,
  foundOpportunities,
  opportunitySearchProfiles,
  contactHistory,
  jobs,
  leadSources,
  jobDraftImports,
  dailyReports,
  uploads,
  prePourChecklists,
  postPourChecklists,
  deliveryTickets,
  safetyIncidents,
  toolChecklists,
  timeEntries,
  changeOrderRequests,
  permissions,
  setActive,
  onOpenSettingsSection,
  onSelectJob,
  onSelectLead,
  onSelectCustomer,
}) {
  const commandCenter = useMemo(() => deriveCommandCenterState({
    leads,
    customers,
    estimates,
    contactHistory,
    jobs,
    leadSources,
    jobDraftImports,
    dailyReports,
    uploads,
    prePourChecklists,
    postPourChecklists,
    deliveryTickets,
    safetyIncidents,
    toolChecklists,
    timeEntries,
    changeOrderRequests,
    currentCompanyId,
  }, { companyId: currentCompanyId }), [changeOrderRequests, contactHistory, currentCompanyId, customers, dailyReports, deliveryTickets, estimates, jobDraftImports, jobs, leadSources, leads, postPourChecklists, prePourChecklists, safetyIncidents, timeEntries, toolChecklists, uploads]);
  const commandFinish = useMemo(() => deriveCommandCenterFinishState({
    commandCenter,
    user,
    permissions,
    companySettings,
    emailSendingConfigured,
    leads,
    customers,
    estimates,
    foundOpportunities,
    opportunitySearchProfiles,
    contactHistory,
    jobs,
    leadSources,
    jobDraftImports,
    dailyReports,
    uploads,
    prePourChecklists,
    postPourChecklists,
    deliveryTickets,
    safetyIncidents,
    toolChecklists,
    timeEntries,
    changeOrderRequests,
    currentCompanyId,
  }, { companyId: currentCompanyId }), [changeOrderRequests, commandCenter, companySettings, contactHistory, currentCompanyId, customers, dailyReports, deliveryTickets, emailSendingConfigured, estimates, foundOpportunities, jobDraftImports, jobs, leadSources, leads, opportunitySearchProfiles, permissions, postPourChecklists, prePourChecklists, safetyIncidents, timeEntries, toolChecklists, uploads, user]);
  const canViewEstimates = Boolean(permissions?.estimates?.canView);
  const moneyReadyCount = Number(commandCenter.stats.moneyReadyItems || 0);
  const jobsTodayCount = Number(commandCenter.stats.scheduledTodayJobs || 0);
  const estimatesToWinCount = canViewEstimates
    ? Number(commandCenter.stats.sentEstimatesWaiting || 0) + Number(commandCenter.stats.draftEstimates || 0)
    : 0;
  const problemsCount = Number(commandCenter.proofChainSummary?.blockerCount || 0) + Number(commandCenter.stats.openChangeOrders || 0);
  const queueItems = useMemo(() => buildOwnerAdminMobileCommandQueue(commandCenter, {
    jobs,
    estimates,
    dailyReports,
    changeOrderRequests,
    customers,
    leads,
    companyName,
    permissions,
  }), [changeOrderRequests, commandCenter, companyName, customers, dailyReports, estimates, jobs, leads, permissions]);
  const [selectedMobileCommandId, setSelectedMobileCommandId] = useState("");
  const firstContactableItem = queueItems.find((item) => item.contact?.phone || item.contact?.email);
  const selectedItem = queueItems.find((item) => item.id === selectedMobileCommandId) || firstContactableItem || queueItems[0] || null;

  useEffect(() => {
    if (selectedItem && selectedItem.id !== selectedMobileCommandId) {
      setSelectedMobileCommandId(selectedItem.id);
    }
  }, [selectedItem, selectedMobileCommandId]);

  function openModule(moduleId) {
    if (moduleId) setActive?.(moduleId);
  }

  function openCommandAction(action = {}) {
    if (action.moduleId === "settings" && action.settingsSectionId && typeof onOpenSettingsSection === "function") {
      onOpenSettingsSection(action.settingsSectionId);
      return;
    }
    openModule(action.moduleId || "jobs");
  }

  function openMobileCommandItem(item = selectedItem) {
    if (!item) return;
    if (item.kind === "job" && item.recordId) {
      onSelectJob?.(item.recordId);
      return;
    }
    openModule(item.moduleId || "jobs");
  }

  function openMobileContact(item = selectedItem) {
    if (!item?.contact) {
      openMobileCommandItem(item);
      return;
    }
    if (item.contact.moduleId === "customers" && item.contact.recordId && typeof onSelectCustomer === "function") {
      onSelectCustomer(item.contact.recordId);
      return;
    }
    if (item.contact.moduleId === "leads" && item.contact.recordId && typeof onSelectLead === "function") {
      onSelectLead(item.contact.recordId);
      return;
    }
    openMobileCommandItem(item);
  }

  const kpis = [
    { id: "money-ready", label: "Money Ready", value: moneyReadyCount, helper: `${commandCenter.stats.jobsReadyToBill || 0} jobs / ${commandCenter.stats.approvedEstimatesReadyToConvert || 0} estimates`, icon: "check", tone: moneyReadyCount ? "green" : "slate", onClick: () => openModule(commandCenter.stats.jobsReadyToBill ? "jobs" : "estimates") },
    { id: "jobs-today", label: "Jobs Today", value: jobsTodayCount, helper: `${commandCenter.stats.jobsMissingCrew || 0} crew gaps`, icon: "briefcase", tone: jobsTodayCount ? "blue" : "slate", onClick: () => openModule("jobs") },
    { id: "estimates-to-win", label: "Estimates To Win", value: estimatesToWinCount, helper: canViewEstimates ? `${commandCenter.stats.sentEstimatesWaiting || 0} sent / ${commandCenter.stats.draftEstimates || 0} drafts` : "Locked", icon: "quote", tone: estimatesToWinCount ? "orange" : "slate", onClick: () => canViewEstimates && openModule("estimates") },
    { id: "problems", label: "Problems", value: problemsCount, helper: `${commandCenter.proofChainSummary?.blockerCount || 0} blockers / ${commandCenter.stats.openChangeOrders || 0} changes`, icon: "alert", tone: problemsCount ? "amber" : "green", onClick: () => openModule(commandCenter.proofChainSummary?.nextModuleId || "reports") },
  ];

  return (
    <ApexMobileRoleShell
      eyebrow={companyName || DEFAULT_COMPANY_NAME}
      title="Today"
      description={`Owner mobile command for ${user?.name || "the office"}: money, jobs, estimates, and problems only.`}
      className="co-owner-mobile-command"
    >
      <ApexMobileKpiGrid items={kpis} />
      <ApexMobileActionQueue
        title="Top action queue"
        items={queueItems}
        selectedId={selectedItem?.id}
        onSelect={(item) => setSelectedMobileCommandId(item.id)}
      />
      <section className="co-apex-mobile-selected-card" data-tone={selectedItem?.tone || "slate"}>
        {selectedItem ? (
          <>
            <div className="co-apex-mobile-selected-head">
              <Badge tone={selectedItem.tone || "slate"}>{selectedItem.eyebrow || "Today"}</Badge>
              <StatusBadge status={selectedItem.statusLabel || "Review"} />
            </div>
            <h2>{selectedItem.title}</h2>
            <p>{selectedItem.description || "Review this item before taking action."}</p>
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
              onOpenContact={() => openMobileContact(selectedItem)}
            />
            <div className="co-apex-mobile-selected-actions">
              <Button type="button" onClick={() => openMobileCommandItem(selectedItem)}>{selectedItem.actionLabel || "Open"}</Button>
              <Button type="button" variant="secondary" onClick={() => openModule(selectedItem.moduleId || "jobs")}>Full route</Button>
            </div>
            <p className="co-apex-mobile-guardrail">Manual only: text and email open drafts only. No calls, texts, emails, billing, bids, or conversions are sent from this card.</p>
          </>
        ) : (
          <StateCard title="No mobile command actions" description="Money, job, estimate, and problem items will appear here when owner review is needed." tone="green" />
        )}
      </section>
      <section className="co-apex-mobile-selected-card" data-tone={commandFinish.tone || "slate"} aria-label="Owner daily command plan">
        <div className="co-apex-mobile-selected-head">
          <Badge tone={commandFinish.tone || "slate"}>{commandFinish.status || "Command"}</Badge>
          <StatusBadge status={`${commandFinish.metrics?.routeableActionCount || 0} routed`} />
        </div>
        <h2>{commandFinish.headline || "Daily command plan"}</h2>
        <p>{commandFinish.summary || "Open the next routed tool to keep the day moving."}</p>
        <div className="co-apex-mobile-selected-summary">
          {(commandFinish.lanes || []).slice(0, 4).map((lane) => (
            <button key={lane.id} type="button" onClick={() => openCommandAction(lane)}>
              <em>{lane.label}</em>
              <strong>{lane.value}</strong>
            </button>
          ))}
        </div>
        <div className="co-apex-mobile-selected-actions">
          {(commandFinish.nextActions || []).slice(0, 2).map((action, index) => (
            <Button key={action.id} type="button" variant={index === 0 ? "primary" : "secondary"} onClick={() => openCommandAction(action)}>
              {action.actionLabel}
            </Button>
          ))}
        </div>
        <p className="co-apex-mobile-guardrail">Provider setup opens locked setup/review states only. No sends, spend, payments, provider writes, or record changes run from mobile command.</p>
      </section>
    </ApexMobileRoleShell>
  );
}
