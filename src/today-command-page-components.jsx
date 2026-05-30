import { useEffect, useMemo, useState } from "react";

import { ApexOfficeCommandShell, Badge, Button } from "./app-shell-components";
import { deriveCommandCenterFinishState, deriveCommandCenterState } from "./command-center-utils";
import { CommandCenterDailyPlanCard } from "./command-center-route-components";
import { deriveCoreOperationsLoopState } from "./core-operations-loop-utils";
import { estimateDisplayCustomer, estimateDisplayTitle, estimateDisplayTotal } from "./estimate-display-utils";
import { estimateStatusLabel } from "./estimate-utils";
import { jobScheduleLabel, jobStatusLabel, jobTitle } from "./job-utils";

function normalizeObjectArray(value, fallback = []) {
  if (Array.isArray(value)) {
    return value.filter((item) => item && typeof item === "object");
  }
  if (Array.isArray(fallback)) {
    return fallback.filter((item) => item && typeof item === "object");
  }
  return [];
}

function normalizeTodayStatus(value) {
  return String(value || "").trim().toLowerCase();
}

function todayRecordJobId(record = {}) {
  return record.jobId || record.linkedJobId || record.job?.id || "";
}

export function buildTodayCommandQueue(commandCenter = {}, { jobs = [], estimates = [], permissions = {}, limit = 3 } = {}) {
  const rows = [];
  const canViewEstimates = Boolean(permissions?.estimates?.canView);
  const liveJobs = normalizeObjectArray(jobs).filter((job) => !job.archivedAt);
  const visibleEstimates = canViewEstimates ? normalizeObjectArray(estimates).filter((estimate) => !estimate.archivedAt) : [];
  const billingReadyJobs = liveJobs.filter((job) => normalizeTodayStatus(job.status || job.stage) === "billing ready");
  const approvedEstimates = visibleEstimates.filter((estimate) => normalizeTodayStatus(estimate.status) === "approved" && !todayRecordJobId(estimate));
  const sentEstimates = visibleEstimates.filter((estimate) => normalizeTodayStatus(estimate.status) === "sent");
  const draftEstimates = visibleEstimates.filter((estimate) => normalizeTodayStatus(estimate.status) === "draft");

  function addRow(row) {
    if (!row?.id || !row?.title) return;
    rows.push(row);
  }

  billingReadyJobs.slice(0, 4).forEach((job, index) => addRow({
    id: `money-job-${job.id}`,
    priority: 10 + index,
    kind: "job",
    moduleId: "jobs",
    recordId: job.id,
    record: job,
    eyebrow: "Money Ready",
    title: jobTitle(job),
    description: [job.customer, job.address].filter(Boolean).join(" / ") || "Billing-ready job needs owner review.",
    detail: "Review proof and closeout context before any billing action.",
    statusLabel: jobStatusLabel(job.status || job.stage),
    actionLabel: "Review job",
    tone: "green",
    badges: [{ label: "Manual billing review", tone: "green" }],
  }));

  approvedEstimates.slice(0, 3).forEach((estimate, index) => addRow({
    id: `money-estimate-${estimate.id}`,
    priority: 18 + index,
    kind: "estimate",
    moduleId: "estimates",
    recordId: estimate.id,
    record: estimate,
    eyebrow: "Money Ready",
    title: estimateDisplayTitle(estimate),
    description: estimateDisplayCustomer(estimate) || "Approved estimate is ready for manual job handoff review.",
    detail: `${estimateDisplayTotal(estimate)} approved. Human review is still required before conversion.`,
    statusLabel: estimateStatusLabel(estimate.status),
    actionLabel: "Open estimate",
    tone: "green",
    badges: [{ label: "Approved", tone: "green" }],
  }));

  normalizeObjectArray(commandCenter.schedule?.scheduledTodayJobs).slice(0, 5).forEach((job, index) => addRow({
    id: `today-job-${job.id}`,
    priority: 30 + index,
    kind: "job",
    moduleId: "jobs",
    recordId: job.id,
    record: job,
    eyebrow: "Jobs Today",
    title: jobTitle(job),
    description: [job.customer, job.address].filter(Boolean).join(" / ") || jobScheduleLabel(job),
    detail: jobScheduleLabel(job),
    statusLabel: jobStatusLabel(job.status || job.stage),
    actionLabel: "Open job",
    tone: "blue",
    badges: [{ label: "Scheduled today", tone: "blue" }],
  }));

  sentEstimates.slice(0, 4).forEach((estimate, index) => addRow({
    id: `win-sent-${estimate.id}`,
    priority: 45 + index,
    kind: "estimate",
    moduleId: "estimates",
    recordId: estimate.id,
    record: estimate,
    eyebrow: "Estimate To Win",
    title: estimateDisplayTitle(estimate),
    description: estimateDisplayCustomer(estimate) || "Sent estimate waiting on customer decision.",
    detail: `${estimateDisplayTotal(estimate)} sent estimate. Follow-up remains manual.`,
    statusLabel: estimateStatusLabel(estimate.status),
    actionLabel: "Review estimate",
    tone: "orange",
    badges: [{ label: "Manual follow-up", tone: "orange" }],
  }));

  draftEstimates.slice(0, 2).forEach((estimate, index) => addRow({
    id: `win-draft-${estimate.id}`,
    priority: 55 + index,
    kind: "estimate",
    moduleId: "estimates",
    recordId: estimate.id,
    record: estimate,
    eyebrow: "Estimate To Win",
    title: estimateDisplayTitle(estimate),
    description: estimateDisplayCustomer(estimate) || "Draft estimate needs office review.",
    detail: `${estimateDisplayTotal(estimate)} draft. No send happens from Today.`,
    statusLabel: estimateStatusLabel(estimate.status),
    actionLabel: "Open draft",
    tone: "amber",
    badges: [{ label: "Draft", tone: "amber" }],
  }));

  normalizeObjectArray(commandCenter.watchtowerQueue).slice(0, 7).forEach((item, index) => addRow({
    ...item,
    id: `problem-${item.id}`,
    priority: Number(item.priority || 80) + index,
    kind: "problem",
    statusLabel: item.sourceLabel || "Needs review",
    detail: item.description,
    badges: [{ label: item.sourceLabel || "Problem", tone: item.tone || "amber" }],
  }));

  return rows
    .sort((left, right) => Number(left.priority || 99) - Number(right.priority || 99) || left.title.localeCompare(right.title))
    .slice(0, limit);
}

export function TodayCommandPage({
  user,
  currentCompanyId,
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
  rateBookItems,
  permissions,
  setActive,
  onOpenSettingsSection,
  onSelectJob,
  onOpenEstimate,
  onSelectReport,
  commandRouteMode = false,
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
  const coreOperationsLoop = useMemo(() => deriveCoreOperationsLoopState({
    commandCenter,
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
    rateBookItems,
    permissions,
    currentCompanyId,
  }, { companyId: currentCompanyId }), [changeOrderRequests, commandCenter, contactHistory, currentCompanyId, customers, dailyReports, deliveryTickets, estimates, jobDraftImports, jobs, leadSources, leads, permissions, postPourChecklists, prePourChecklists, rateBookItems, safetyIncidents, timeEntries, toolChecklists, uploads]);
  const todayQueue = useMemo(() => buildTodayCommandQueue(commandCenter, { jobs, estimates, permissions }), [commandCenter, estimates, jobs, permissions]);
  const [selectedTodayId, setSelectedTodayId] = useState("");
  const selectedTodayItem = todayQueue.find((item) => item.id === selectedTodayId) || todayQueue[0] || null;
  const canViewEstimates = Boolean(permissions?.estimates?.canView);

  useEffect(() => {
    if (selectedTodayItem && selectedTodayItem.id !== selectedTodayId) {
      setSelectedTodayId(selectedTodayItem.id);
    }
  }, [selectedTodayId, selectedTodayItem]);

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

  function openTodayItem(item = selectedTodayItem) {
    if (!item) return;
    if (item.kind === "job" && item.recordId) {
      onSelectJob?.(item.recordId);
      return;
    }
    if (item.kind === "estimate" && item.recordId) {
      if (typeof onOpenEstimate === "function") {
        onOpenEstimate(item.recordId);
      } else {
        openModule("estimates");
      }
      return;
    }
    if (item.moduleId === "reports" && item.recordId) {
      onSelectReport?.(item.recordId);
      return;
    }
    openModule(item.moduleId || "jobs");
  }

  const moneyReadyCount = Number(commandCenter.stats.moneyReadyItems || 0);
  const jobsTodayCount = Number(commandCenter.stats.scheduledTodayJobs || 0);
  const estimatesToWinCount = canViewEstimates
    ? Number(commandCenter.stats.sentEstimatesWaiting || 0) + Number(commandCenter.stats.draftEstimates || 0)
    : 0;
  const problemsCount = Number(commandCenter.proofChainSummary?.blockerCount || 0) + Number(commandCenter.stats.openChangeOrders || 0);
  const hiddenQueueCount = Math.max(0, Number(commandCenter.watchtowerQueue?.length || 0) + moneyReadyCount + jobsTodayCount + estimatesToWinCount - todayQueue.length);

  const kpis = [
    { id: "money-ready", label: "Money Ready", value: moneyReadyCount, helper: `${commandCenter.stats.jobsReadyToBill || 0} jobs / ${commandCenter.stats.approvedEstimatesReadyToConvert || 0} estimates`, icon: "check", tone: moneyReadyCount ? "green" : "slate", onClick: () => openModule(commandCenter.stats.jobsReadyToBill ? "jobs" : "estimates") },
    { id: "jobs-today", label: "Jobs Today", value: jobsTodayCount, helper: `${commandCenter.stats.scheduledTomorrowJobs || 0} tomorrow / ${commandCenter.stats.jobsMissingCrew || 0} missing crew`, icon: "briefcase", tone: jobsTodayCount ? "blue" : "slate", onClick: () => openModule("jobs") },
    { id: "estimates-to-win", label: "Estimates To Win", value: estimatesToWinCount, helper: canViewEstimates ? `${commandCenter.stats.sentEstimatesWaiting || 0} sent / ${commandCenter.stats.draftEstimates || 0} drafts` : "Estimate access unavailable", icon: "quote", tone: estimatesToWinCount ? "orange" : "slate", onClick: () => canViewEstimates && openModule("estimates") },
    { id: "problems", label: "Problems", value: problemsCount, helper: `${commandCenter.proofChainSummary?.blockerCount || 0} blockers / ${commandCenter.stats.openChangeOrders || 0} changes`, icon: "alert", tone: problemsCount ? "amber" : "green", onClick: () => openModule(commandCenter.proofChainSummary?.nextModuleId || "reports") },
  ];
  const quickActions = [
    commandFinish.nextActions?.[0] ? { id: "command-next", label: commandFinish.nextActions[0].actionLabel || "Open next", icon: "grid", onClick: () => openCommandAction(commandFinish.nextActions[0]) } : null,
    { id: "open-jobs", label: "Open Jobs", icon: "briefcase", onClick: () => openModule("jobs") },
    commandRouteMode
      ? { id: "open-leads", label: "Open Leads", icon: "users", onClick: () => openModule("leads"), disabled: !permissions?.leads?.canView }
      : { id: "open-estimates", label: "Open Estimates", icon: "quote", onClick: () => openModule("estimates"), disabled: !canViewEstimates },
    { id: "open-reports", label: "Open Reports", icon: "document", onClick: () => openModule("reports"), disabled: !permissions?.reports?.canView },
  ].filter(Boolean);
  const coreLoopMetrics = [
    { label: "Stages clear", value: `${coreOperationsLoop.metrics?.stagesReady || 0} / ${coreOperationsLoop.metrics?.totalStages || 0}` },
    { label: "Blockers", value: coreOperationsLoop.metrics?.blockerCount || 0 },
    { label: "Money ready", value: coreOperationsLoop.metrics?.readyMoneyItems || 0 },
    { label: "Closeout jobs", value: coreOperationsLoop.metrics?.closeoutCandidates || 0 },
    { label: "Material prep", value: coreOperationsLoop.metrics?.materialReadyPackets || 0 },
    { label: "Job costing warnings", value: coreOperationsLoop.metrics?.jobCostingWarnings || 0 },
  ];
  const visibleCoreLoopStages = coreOperationsLoop.canView ? coreOperationsLoop.stages : [];

  return (
    <div className={`co-office-page co-today-page${commandRouteMode ? " co-command-route-page co-command-center-shell-page" : ""}`}>
      <ApexOfficeCommandShell
        eyebrow="Apex HQ"
        title={commandRouteMode ? "Operations Command" : "Today"}
        description={commandRouteMode
          ? "Run today's office command from one queue: money ready, jobs today, estimates to win, and problems."
          : "Start with money ready, jobs today, estimates to win, and problems. Everything here is review-first and manual."}
        kpis={kpis}
        queue={{
          title: "Main priority queue",
          description: hiddenQueueCount ? `${hiddenQueueCount} more item${hiddenQueueCount === 1 ? "" : "s"} live in full modules.` : "Showing the top mixed priorities for this workspace.",
          items: todayQueue,
          selectedId: selectedTodayItem?.id,
          onSelect: (item) => setSelectedTodayId(item.id),
        }}
        detail={{
          title: selectedTodayItem?.eyebrow || "Selected detail",
          item: selectedTodayItem,
          render: (item) => item ? (
            <>
              <div className="co-apex-selected-record">
                <Badge tone={item.tone || "slate"}>{item.eyebrow || item.sourceLabel || "Today"}</Badge>
                <h2>{item.title}</h2>
                <p>{item.description || item.detail || "Review this item in the full module before taking action."}</p>
              </div>
              <div className="co-apex-selected-facts">
                <span><em>Status</em><strong>{item.statusLabel || item.status || "Needs review"}</strong></span>
                <span><em>Route</em><strong>{item.moduleId || "jobs"}</strong></span>
                <span><em>Safety</em><strong>Manual only</strong></span>
              </div>
              <div className="co-apex-selected-next">
                <span>Next safe action</span>
                <strong>{item.actionLabel || "Open module"}</strong>
                <p>{item.detail || "Open the full route to handle the work without a drawer, automatic send, bid submission, or billing action."}</p>
              </div>
              <div className="co-apex-selected-actions">
                <Button type="button" onClick={() => openTodayItem(item)}>{item.actionLabel || "Open module"}</Button>
                <Button type="button" variant="secondary" onClick={() => openModule(item.moduleId || "jobs")}>Full module</Button>
              </div>
              {coreOperationsLoop.canView ? (
                <div className="co-estimates-shell-workflow-panel co-core-operations-loop-panel" role="region" aria-label="Core Operations Loop">
                  <div className="co-estimates-shell-workflow-head">
                    <div>
                      <Badge tone={coreOperationsLoop.tone || "blue"}>{coreOperationsLoop.status}</Badge>
                      <h3>Core Operations Loop</h3>
                      <p>{coreOperationsLoop.summary}</p>
                    </div>
                    <Badge tone="slate">Review-first</Badge>
                  </div>
                  <div className="co-estimates-shell-packet-lock">
                    <strong>{coreOperationsLoop.coreLoopLabel}</strong>
                    <span>{coreOperationsLoop.safetyBoundary}</span>
                  </div>
                  <div className="co-estimates-shell-packet-readiness-grid">
                    {coreLoopMetrics.map((metric) => (
                      <span key={metric.label}><em>{metric.label}</em><strong>{metric.value}</strong></span>
                    ))}
                  </div>
                  <div className="co-estimates-shell-readiness-grid">
                    {visibleCoreLoopStages.map((stage) => (
                      <div key={stage.id} data-state={stage.ready ? "ready" : "needs"}>
                        <span>{stage.label}</span>
                        <strong>{stage.status}</strong>
                        <p>{stage.helper}</p>
                      </div>
                    ))}
                  </div>
                  <div className="co-estimates-shell-packet-section-list" aria-label="Core operations connected workflows">
                    <span>Lead -&gt; estimate</span>
                    <span>Proposal -&gt; approved job</span>
                    <span>Schedule / crew</span>
                    <span>Field proof</span>
                    <span>Tickets / reports</span>
                    <span>Change orders</span>
                    <span>Closeout / billing readiness</span>
                    <span data-internal="true">No auto actions</span>
                  </div>
                  <div className="co-apex-selected-next">
                    <span>Core loop next action</span>
                    <strong>{coreOperationsLoop.nextAction?.label || "Review operations"}</strong>
                    <p>{coreOperationsLoop.nextAction?.helper || "Open the full module for the selected workflow before changing records."}</p>
                  </div>
                  <div className="co-apex-selected-actions">
                    <Button type="button" onClick={() => openModule(coreOperationsLoop.nextAction?.moduleId || "jobs")}>{coreOperationsLoop.nextAction?.actionLabel || "Open next module"}</Button>
                    <Button type="button" variant="secondary" onClick={() => openModule("schedule")}>Schedule</Button>
                    <Button type="button" variant="secondary" onClick={() => openModule("changeOrders")}>Change Orders</Button>
                    <Button type="button" variant="secondary" onClick={() => openModule("materialPrep")} disabled={!permissions?.materialPrep?.canView}>Material Prep</Button>
                  </div>
                </div>
              ) : null}
            </>
          ) : null,
        }}
        quickActions={quickActions}
        overview={commandRouteMode ? <CommandCenterDailyPlanCard state={commandFinish} onOpenAction={openCommandAction} /> : null}
      />
    </div>
  );
}
