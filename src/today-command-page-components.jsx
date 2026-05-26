import { useEffect, useMemo, useState } from "react";

import { ApexOfficeCommandShell, Badge, Button } from "./app-shell-components";
import { deriveCommandCenterState } from "./command-center-utils";
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
  currentCompanyId,
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
  permissions,
  setActive,
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
    { id: "open-jobs", label: "Open Jobs", icon: "briefcase", onClick: () => openModule("jobs") },
    commandRouteMode
      ? { id: "open-leads", label: "Open Leads", icon: "users", onClick: () => openModule("leads"), disabled: !permissions?.leads?.canView }
      : { id: "open-estimates", label: "Open Estimates", icon: "quote", onClick: () => openModule("estimates"), disabled: !canViewEstimates },
    { id: "open-reports", label: "Open Reports", icon: "document", onClick: () => openModule("reports"), disabled: !permissions?.reports?.canView },
  ];

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
            </>
          ) : null,
        }}
        quickActions={quickActions}
      />
    </div>
  );
}
