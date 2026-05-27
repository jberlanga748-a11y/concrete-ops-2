import { deriveGrowthAgentState } from "./growth-agent-utils.js";
import { deriveOwnerBusinessIntelligenceState } from "./owner-bi-utils.js";
import {
  agentAutomationCapabilityEnabled,
  deriveApexAgentAutonomyReadiness,
  deriveApexAgentAutomationPolicyControls,
} from "../shared/apexAgentAutomationPolicy.js";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function text(value) {
  return String(value ?? "").trim();
}

function normalizeStatus(value) {
  return text(value).toLowerCase().replace(/[_-]/g, " ").replace(/\s+/g, " ");
}

function activeRecords(records = []) {
  return asArray(records).filter((record) => !record?.archivedAt);
}

function countLabel(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function jobName(job = {}) {
  return text(job.title || job.name || job.projectName || job.customer || "Job");
}

function estimateName(estimate = {}) {
  return text(estimate.title || estimate.project || estimate.customerName || estimate.customer?.name || "Estimate");
}

function uploadName(upload = {}) {
  return text(upload.fileName || upload.title || upload.name || "Photo evidence");
}

function changeOrderName(changeOrder = {}) {
  return text(changeOrder.title || changeOrder.scopeSummary || changeOrder.description || "Change order request");
}

function safetyName(incident = {}) {
  return text(incident.title || incident.summary || incident.description || "Safety incident");
}

function isReportNeedingOfficeReview(report = {}) {
  const status = normalizeStatus(report.status || report.reviewStatus);
  return ["submitted", "needs review", "needs_review"].includes(status);
}

function isEstimateDraftReview(estimate = {}) {
  const status = normalizeStatus(estimate.status || "draft");
  return status === "draft" && !estimate.archivedAt;
}

function isEstimatePacketReview(estimate = {}) {
  const status = normalizeStatus(estimate.status || "draft");
  return ["draft", "sent"].includes(status) && !estimate.archivedAt && !estimate.jobId;
}

function isEstimateJobHandoffReady(estimate = {}) {
  return normalizeStatus(estimate.status) === "approved" && !estimate.jobId && !estimate.archivedAt;
}

function isStartupWatchJob(job = {}) {
  const startupStatus = normalizeStatus(job.startupStatus || "not started");
  const status = normalizeStatus(job.status || job.stage);
  return ["not started", "in progress", "needs review"].includes(startupStatus)
    || ["planned", "scheduled"].includes(status);
}

function isActiveClockEntry(entry = {}) {
  return Boolean(entry.clockInAt && !entry.clockOutAt && !entry.archivedAt);
}

function isChangeOrderBlockingCloseout(changeOrder = {}) {
  const status = normalizeStatus(changeOrder.status || changeOrder.reviewStatus);
  return !["approved", "rejected", "closed", "void", "archived"].includes(status);
}

function isOpenSafetyIncident(incident = {}) {
  const status = normalizeStatus(incident.status || incident.reviewStatus);
  return !["resolved", "closed", "archived"].includes(status);
}

function isFieldOnlyScope(permissions = {}) {
  return Boolean(
    permissions?.jobs?.canManageField
    && !permissions?.jobs?.canManageAll
    && !permissions?.leads?.canView
    && !permissions?.aiOffice?.canView
    && !permissions?.opportunityScout?.canView,
  );
}

function canUseAiOfficeAgentCommand(permissions = {}) {
  if (isFieldOnlyScope(permissions)) return false;
  return Boolean(
    permissions?.aiOffice?.canView
    || permissions?.opportunityScout?.canView
    || permissions?.leads?.canView
    || permissions?.jobs?.canManageAll
    || permissions?.reports?.canReview
    || permissions?.uploads?.canManageAll,
  );
}

function toneForCount(count, { empty = "green", active = "amber", high = "red", highAt = 4 } = {}) {
  if (!count) return empty;
  return count >= highAt ? high : active;
}

function moduleTradeSummary(workflowContext = {}, moduleId = "") {
  const normalizedModuleId = text(moduleId);
  if (!normalizedModuleId) return null;
  const module = asArray(workflowContext?.modules).find((entry) => (
    entry?.id === normalizedModuleId || entry?.moduleId === normalizedModuleId
  ));
  if (!module?.canView) return null;
  return module.tradeSummary || null;
}

function tradeGuidanceFor(summary = null, target = {}) {
  if (!summary?.primaryTradeLabel) return null;
  const recordType = text(target.recordType || target.moduleId || target.id).toLowerCase();
  const proofItems = asArray(summary.proofPhotoChecklist).slice(0, 2);
  const handoffItems = asArray(summary.fieldHandoffChecklist).slice(0, 2);
  const watchoutItems = asArray(summary.changeOrderWatchouts).slice(0, 2);
  const details = /proof|report|upload|closeout/.test(recordType)
    ? proofItems
    : /change/.test(recordType)
      ? watchoutItems
      : [...handoffItems, ...proofItems].slice(0, 2);

  return {
    label: summary.primaryTradeLabel,
    detail: details.length ? details.join(" / ") : summary.safetyBoundary || "Use trade-specific review prompts.",
  };
}

export function deriveAiOfficeAgentCommandCenter({
  permissions = {},
  stats = {},
  opportunityScout = {},
  leads = [],
  jobs = [],
  queueItems = [],
  jobDraftImports = [],
  dailyReports = [],
  uploads = [],
  estimates = [],
  timeEntries = [],
  changeOrderRequests = [],
  safetyIncidents = [],
  deliveryTickets = [],
  prePourChecklists = [],
  postPourChecklists = [],
  toolChecklists = [],
  proofStateByReportId = new Map(),
  agentLearningPreferences = [],
  fieldOpsAgent = null,
  agentWorkflowContext = null,
  apexAgentAutomationPolicy = {},
} = {}) {
  const automationPolicy = deriveApexAgentAutomationPolicyControls(apexAgentAutomationPolicy);
  if (!canUseAiOfficeAgentCommand(permissions)) {
    return {
      canView: false,
      modeLabel: "Blocked",
      headline: "Agent command center unavailable",
      summary: "Field users stay limited to assigned work and cannot open office agent command surfaces.",
      workflowCards: [],
      focusRows: [],
      tradeGuidance: [],
      automationPolicy,
      autonomyReadiness: deriveApexAgentAutonomyReadiness({
        controls: automationPolicy,
        fieldRoleBlocked: true,
      }),
      guardrails: defaultAgentGuardrails(),
    };
  }
  if (automationPolicy.agentPaused) {
    return {
      canView: true,
      modeLabel: "Off",
      headline: "Apex Agent Command Center",
      summary: "Apex Agent review surfaces are paused by this contractor's automation policy. No customer sends, record changes, schedule changes, billing, or drafts can start from this surface.",
      workflowCards: [],
      focusRows: [],
      tradeGuidance: [],
      counts: {},
      automationPolicy,
      autonomyReadiness: deriveApexAgentAutonomyReadiness({
        controls: automationPolicy,
        fieldRoleBlocked: true,
      }),
      guardrails: defaultAgentGuardrails(automationPolicy),
    };
  }
  const capabilityEnabled = (capabilityId) => agentAutomationCapabilityEnabled(automationPolicy.policy, capabilityId);

  const visibleLeads = activeRecords(leads);
  const visibleJobs = activeRecords(jobs);
  const visibleQueueItems = activeRecords(queueItems).filter((item) => !item.done);
  const visibleDrafts = activeRecords(jobDraftImports);
  const visibleReports = activeRecords(dailyReports);
  const visibleUploads = activeRecords(uploads);
  const visibleEstimates = activeRecords(estimates);
  const visibleTimeEntries = activeRecords(timeEntries);
  const visibleChangeOrders = activeRecords(changeOrderRequests);
  const visibleSafetyIncidents = activeRecords(safetyIncidents);
  const visibleLearning = activeRecords(agentLearningPreferences);
  const growthAgent = deriveGrowthAgentState({
    permissions,
    leads: visibleLeads,
    estimates: visibleEstimates,
    jobs: visibleJobs,
  });
  const ownerBusinessIntelligence = deriveOwnerBusinessIntelligenceState({
    permissions,
    leads: visibleLeads,
    estimates: visibleEstimates,
    jobs: visibleJobs,
    dailyReports: visibleReports,
    uploads: visibleUploads,
    timeEntries: visibleTimeEntries,
    changeOrderRequests: visibleChangeOrders,
    safetyIncidents: visibleSafetyIncidents,
    deliveryTickets,
    prePourChecklists,
    postPourChecklists,
    toolChecklists,
    proofStateByReportId,
  });
  const scoutStats = opportunityScout?.stats || {};
  const canViewOpportunityScout = Boolean(permissions?.opportunityScout?.canView);
  const canManageLearning = Boolean(permissions?.aiOffice?.canManageLearning);
  const newLeads = visibleLeads.filter((lead) => normalizeStatus(lead.status || "new") === "new");
  const highPriorityLeads = visibleLeads.filter((lead) => normalizeStatus(lead.priority) === "high");
  const approvedLeads = visibleLeads.filter((lead) => ["approved", "converted"].includes(normalizeStatus(lead.status)));
  const blockedQueueItems = visibleQueueItems.filter((item) => normalizeStatus(item.status) === "blocked");
  const dueQueueItems = visibleQueueItems.filter((item) => normalizeStatus(item.status) === "due today");
  const startupWatchJobs = visibleJobs.filter(isStartupWatchJob);
  const reportsNeedingReview = visibleReports.filter(isReportNeedingOfficeReview);
  const draftEstimateReviews = visibleEstimates.filter(isEstimateDraftReview);
  const packetEstimateReviews = visibleEstimates.filter(isEstimatePacketReview);
  const jobHandoffEstimateReviews = visibleEstimates.filter(isEstimateJobHandoffReady);
  const unlinkedUploads = visibleUploads.filter((upload) => !upload.jobId && !upload.reportId);
  const activeClocks = visibleTimeEntries.filter(isActiveClockEntry);
  const closeoutChangeOrders = visibleChangeOrders.filter(isChangeOrderBlockingCloseout);
  const openSafetyIncidents = visibleSafetyIncidents.filter(isOpenSafetyIncident);
  const closeoutBlockers = activeClocks.length + closeoutChangeOrders.length + openSafetyIncidents.length;
  const missingUploads = Number(stats.fieldProofGaps || 0) || unlinkedUploads.length;
  const readyDrafts = visibleDrafts.filter((draft) => ["ready", "needs review", "imported"].includes(normalizeStatus(draft.status || draft.importStatus || "imported")));
  const readyToBill = visibleJobs.filter((job) => normalizeStatus(job.status || job.stage) === "billing ready").length
    || Number(stats.jobsReadyToBill || stats.moneyReadyItems || 0);
  const suggestedLearning = visibleLearning.filter((entry) => normalizeStatus(entry.status) === "suggested");
  const approvedLearning = visibleLearning.filter((entry) => normalizeStatus(entry.status) === "approved");
  const fieldOpsStats = fieldOpsAgent?.stats || {};
  const fieldOpsItems = fieldOpsAgent?.canView ? asArray(fieldOpsAgent.items) : [];
  const fieldOpsReviewCount = Number(fieldOpsStats.total || fieldOpsItems.length || 0);
  const tradeSummaries = {
    leads: moduleTradeSummary(agentWorkflowContext, "leads"),
    estimates: moduleTradeSummary(agentWorkflowContext, "estimates"),
    jobs: moduleTradeSummary(agentWorkflowContext, "jobs"),
    proof: moduleTradeSummary(agentWorkflowContext, "proof"),
  };
  const tradeSummaryForTarget = (target = {}) => {
    if (target.tradeSummary) return target.tradeSummary;
    if (target.moduleId === "leads" || target.recordType === "lead") return tradeSummaries.leads;
    if (target.moduleId === "estimates" || target.recordType === "estimate") return tradeSummaries.estimates;
    if (target.moduleId === "jobs" || target.recordType === "job") return tradeSummaries.jobs;
    if (["reports", "uploads", "deliveryTickets", "prePour", "postPour", "toolChecklist"].includes(target.moduleId)
      || ["dailyCloseout", "report", "upload"].includes(target.recordType)) {
      return tradeSummaries.proof;
    }
    if (target.id === "field-ops-agent" || target.recordType === "fieldOps") return tradeSummaries.proof || tradeSummaries.jobs;
    return null;
  };
  const attachTradeGuidance = (target = {}) => {
    const tradeSummary = tradeSummaryForTarget(target);
    if (!tradeSummary) return target;
    return {
      ...target,
      tradeSummary,
      tradeGuidance: tradeGuidanceFor(tradeSummary, target),
    };
  };

  const workflowCards = [
    canViewOpportunityScout && capabilityEnabled("opportunityScoutReview") ? {
      id: "opportunity-scout",
      title: "Opportunity review",
      helper: "Run review-first source checks, inspect found work, and keep Create Lead behind office approval.",
      icon: "spark",
      badge: opportunityScout?.readiness?.label || `${countLabel(scoutStats.openFoundOpportunities || 0, "opportunity")} open`,
      tone: opportunityScout?.readiness?.tone || toneForCount(scoutStats.openFoundOpportunities || scoutStats.checksNeeded || 0, { active: "orange" }),
      actionLabel: "Open scout",
      moduleId: "copilot",
    } : null,
    permissions?.leads?.canView && capabilityEnabled("leadReview") ? {
      id: "lead-review",
      title: "Lead review",
      helper: "Prioritize new, high-fit, and approved leads before creating estimates or jobs.",
      icon: "inbox",
      badge: `${newLeads.length + highPriorityLeads.length} ready`,
      tone: toneForCount(newLeads.length + highPriorityLeads.length, { active: "orange", highAt: 6 }),
      actionLabel: "Open leads",
      moduleId: "leads",
    } : null,
    growthAgent.canView && capabilityEnabled("leadReview") ? {
      id: "growth-agent",
      title: "Growth follow-up",
      helper: "Prepare copy-only stale estimate and lead follow-up drafts for human review. Nothing sends or changes records.",
      icon: "spark",
      badge: growthAgent.followUpDrafts.length ? `${growthAgent.followUpDrafts.length} drafts` : `${growthAgent.scorecard?.estimateCloseRate || 0}% close rate`,
      tone: growthAgent.followUpDrafts.some((draft) => draft.urgency === "high") ? "amber" : growthAgent.followUpDrafts.length ? "orange" : "slate",
      actionLabel: "Review growth",
      moduleId: "copilot",
      recordType: "growthAgent",
    } : null,
    ownerBusinessIntelligence.canView && capabilityEnabled("ownerBiReview") ? {
      id: "owner-bi",
      title: "Owner BI",
      helper: "Review lead source, close rate, labor/production, and profit/loss prep scorecards without accounting, payroll, billing, or record changes.",
      icon: "grid",
      badge: `${ownerBusinessIntelligence.metrics?.ownerScorecards || 0} scorecards`,
      tone: ownerBusinessIntelligence.metrics?.biTrustBlockers ? "amber" : "green",
      actionLabel: "Review BI",
      moduleId: "copilot",
      recordType: "ownerBusinessIntelligence",
    } : null,
    permissions?.jobs?.canView || permissions?.jobs?.canManageAll ? {
      id: "job-startup",
      title: "Job startup",
      helper: "Review planned jobs, crew readiness, startup gaps, and imported draft handoffs.",
      icon: "briefcase",
      badge: `${startupWatchJobs.length} watching`,
      tone: toneForCount(startupWatchJobs.length, { active: "amber", highAt: 5 }),
      actionLabel: "Open jobs",
      moduleId: "jobs",
    } : null,
    (permissions?.estimates?.canView || permissions?.estimates?.canManage) && capabilityEnabled("estimateDrafts") ? {
      id: "estimate-action-agent",
      title: "Estimate actions",
      helper: "Review draft estimates, proposal packets, and approved estimate-to-job handoffs before any human-approved draft prep.",
      icon: "document",
      badge: `${draftEstimateReviews.length + jobHandoffEstimateReviews.length} estimate actions`,
      tone: jobHandoffEstimateReviews.length ? "green" : draftEstimateReviews.length ? "amber" : "slate",
      actionLabel: "Open estimates",
      moduleId: "estimates",
    } : null,
    (permissions?.reports?.canView || permissions?.uploads?.canView) && capabilityEnabled("closeoutReview") ? {
      id: "proof-closeout",
      title: "Proof and closeout",
      helper: "Summarize submitted reports, photo gaps, unlinked uploads, active clocks, safety, change orders, and ready-to-bill blockers.",
      icon: "clipboard",
      badge: `${reportsNeedingReview.length + missingUploads + closeoutBlockers} closeout items`,
      tone: toneForCount(reportsNeedingReview.length + missingUploads + closeoutBlockers, { active: "amber", highAt: 5 }),
      actionLabel: "Review closeout",
      moduleId: "reports",
      recordType: "dailyCloseout",
    } : null,
    fieldOpsAgent?.canView && capabilityEnabled("closeoutReview") ? {
      id: "field-ops-agent",
      title: "Field ops",
      helper: "Review company field risk across missing reports, proof, tickets, checklists, safety, and active clocks without writing records.",
      icon: "hardhat",
      badge: `${countLabel(fieldOpsReviewCount, "field item")} open`,
      tone: fieldOpsStats.critical ? "red" : fieldOpsStats.warning ? "amber" : fieldOpsReviewCount ? "blue" : "green",
      actionLabel: "Open field ops",
      moduleId: "commandCenter",
    } : null,
    permissions?.customers?.canView || permissions?.settings?.canView ? {
      id: "pilot-handoff",
      title: "Pilot handoff",
      helper: "Check customer, job, setup, support, and manual handoff readiness without creating accounts or invites.",
      icon: "users",
      badge: permissions?.settings?.canView ? "Setup review" : "Customer review",
      tone: readyToBill || approvedLeads.length ? "blue" : "slate",
      actionLabel: permissions?.customers?.canView ? "Open customers" : "Open settings",
      moduleId: permissions?.customers?.canView ? "customers" : "settings",
    } : null,
    permissions?.appHealth?.canView ? {
      id: "release-readiness",
      title: "Release readiness",
      helper: "Review App Health, audit signals, backup posture, and rollout guardrails before any release decision.",
      icon: "lock",
      badge: "Owner gate",
      tone: blockedQueueItems.length ? "amber" : "green",
      actionLabel: "Open App Health",
      moduleId: "appHealth",
    } : null,
    canManageLearning ? {
      id: "agent-learning",
      title: "Apex memory",
      helper: "Review contractor preferences suggested from approved work before they become active AI memory.",
      icon: "spark",
      badge: suggestedLearning.length ? `${suggestedLearning.length} suggested` : `${approvedLearning.length} approved`,
      tone: suggestedLearning.length ? "amber" : approvedLearning.length ? "green" : "slate",
      actionLabel: "Review memory",
      moduleId: "copilot",
      recordType: "agentLearning",
    } : null,
  ].filter(Boolean).map(attachTradeGuidance);

  const focusRows = [
    ...suggestedLearning.slice(0, 3).map((entry) => ({
      id: `learning-${entry.id}`,
      eyebrow: "Learning approval",
      title: entry.title || "Apex memory suggestion",
      description: entry.preference || "Review this contractor preference before Apex uses it in future drafts.",
      tone: "amber",
      icon: "spark",
      actionLabel: "Review memory",
      moduleId: "copilot",
      recordType: "agentLearning",
      record: entry,
    })),
    ...blockedQueueItems.slice(0, 2).map((item) => ({
      id: `queue-${item.id}`,
      eyebrow: "Blocked office queue",
      title: item.title || "Queue item",
      description: item.meta || item.status || "Blocked item needs owner review.",
      tone: "red",
      icon: "alert",
      actionLabel: "Open Command Center",
      moduleId: "commandCenter",
      recordType: "queue",
      record: item,
    })),
    ...(capabilityEnabled("leadReview") ? asArray(growthAgent.followUpDrafts).slice(0, 3).map((draft) => ({
      id: draft.id,
      eyebrow: draft.type === "estimate_follow_up" ? "Stale estimate follow-up" : "Lead follow-up draft",
      title: draft.title,
      description: `${draft.reason} Draft is copy-only and requires human review before any contact.`,
      tone: draft.urgency === "high" ? "amber" : "orange",
      icon: "spark",
      actionLabel: draft.sourceModule === "estimates" ? "Open estimate" : "Open lead",
      moduleId: draft.sourceModule,
      recordType: "growthFollowUpDraft",
      record: draft,
    })) : []),
    ...(capabilityEnabled("leadReview") ? asArray(growthAgent.reviewRequestDrafts).slice(0, 2).map((draft) => ({
      id: draft.id,
      eyebrow: "Review request draft",
      title: draft.title,
      description: `${draft.reason} Draft is copy-only and requires human review before any customer contact or public proof use.`,
      tone: draft.urgency === "high" ? "blue" : "slate",
      icon: "spark",
      actionLabel: "Open job",
      moduleId: "jobs",
      recordType: "growthReviewRequestDraft",
      record: draft,
    })) : []),
    ...(capabilityEnabled("leadReview") ? asArray(growthAgent.sourceInsights).slice(0, 2).map((insight) => ({
      id: `growth-source-${insight.id}`,
      eyebrow: "Lead source intelligence",
      title: insight.title,
      description: insight.detail,
      tone: insight.tone || "blue",
      icon: "spark",
      actionLabel: "Review leads",
      moduleId: "leads",
      recordType: "growthSourceInsight",
      record: insight,
    })) : []),
    ...(capabilityEnabled("estimateDrafts") ? jobHandoffEstimateReviews.slice(0, 2).map((estimate) => ({
      id: `estimate-handoff-${estimate.id}`,
      eyebrow: "Estimate to job handoff",
      title: estimateName(estimate),
      description: "Approved estimate is ready for reviewed draft job prep. No schedule, crew, field visibility, send, invoice, or billing action happens here.",
      tone: "green",
      icon: "briefcase",
      actionLabel: "Review handoff",
      moduleId: "estimates",
      recordType: "estimate",
      actionMode: "jobHandoff",
      record: estimate,
    })) : []),
    ...(capabilityEnabled("estimateDrafts") ? draftEstimateReviews.slice(0, 2).map((estimate) => ({
      id: `estimate-draft-${estimate.id}`,
      eyebrow: "Draft estimate review",
      title: estimateName(estimate),
      description: "Draft estimate needs scope, options, packet, takeoff, or pricing review before it is sent.",
      tone: "amber",
      icon: "document",
      actionLabel: "Open estimate",
      moduleId: "estimates",
      recordType: "estimate",
      actionMode: "packet",
      record: estimate,
    })) : []),
    ...(capabilityEnabled("estimateDrafts") ? packetEstimateReviews.filter((estimate) => !draftEstimateReviews.some((draft) => draft.id === estimate.id)).slice(0, 1).map((estimate) => ({
      id: `estimate-packet-${estimate.id}`,
      eyebrow: "Proposal packet review",
      title: estimateName(estimate),
      description: "Review proposal packet content, attachments, and customer-facing summary before any manual send.",
      tone: "blue",
      icon: "document",
      actionLabel: "Review packet",
      moduleId: "estimates",
      recordType: "estimate",
      actionMode: "packet",
      record: estimate,
    })) : []),
    ...(canViewOpportunityScout && capabilityEnabled("opportunityScoutReview") ? asArray(opportunityScout.foundOpportunityQueue).slice(0, 3).map((opportunity) => ({
      id: `found-${opportunity.id || opportunity.opportunityId}`,
      eyebrow: opportunity.statusLabel || "Found work",
      title: opportunity.title || "Found opportunity",
      description: [opportunity.agency, opportunity.trade, opportunity.bidDueAt ? `Bid due ${opportunity.bidDueAt}` : ""].filter(Boolean).join(" / "),
      tone: opportunity.tone || "orange",
      icon: "spark",
      actionLabel: "Review scout",
      moduleId: "copilot",
      recordType: "opportunity",
      record: opportunity,
    })) : []),
    ...(capabilityEnabled("closeoutReview") ? reportsNeedingReview.slice(0, 2).map((report) => ({
      id: `report-${report.id}`,
      eyebrow: "Report review",
      title: report.job?.title || report.jobTitle || "Submitted daily report",
      description: report.workPerformed || report.crewSummary || "Office signoff needed before closeout.",
      tone: "blue",
      icon: "clipboard",
      actionLabel: "Open report",
      moduleId: "reports",
      recordType: "report",
      record: report,
    })) : []),
    ...(capabilityEnabled("closeoutReview") ? unlinkedUploads.slice(0, 2).map((upload) => ({
      id: `upload-${upload.id}`,
      eyebrow: "Unlinked proof",
      title: uploadName(upload),
      description: "Photo or file evidence needs job/report linking before closeout can be trusted.",
      tone: "amber",
      icon: "upload",
      actionLabel: "Review upload",
      moduleId: "uploads",
      recordType: "upload",
      record: upload,
    })) : []),
    ...(capabilityEnabled("closeoutReview") ? activeClocks.slice(0, 2).map((entry) => ({
      id: `time-${entry.id}`,
      eyebrow: "Active time clock",
      title: entry.userName || entry.employeeName || "Crew time entry",
      description: "Open clock needs review before final labor cost and closeout math can be trusted.",
      tone: "amber",
      icon: "clock",
      actionLabel: "Review time",
      moduleId: "time",
      recordType: "timeEntry",
      record: entry,
    })) : []),
    ...(capabilityEnabled("closeoutReview") ? closeoutChangeOrders.slice(0, 2).map((changeOrder) => ({
      id: `change-order-${changeOrder.id}`,
      eyebrow: "Change order blocker",
      title: changeOrderName(changeOrder),
      description: "Change request must be reviewed before ready-to-bill or closeout summary.",
      tone: "red",
      icon: "alert",
      actionLabel: "Review change order",
      moduleId: "changeOrders",
      recordType: "changeOrder",
      record: changeOrder,
    })) : []),
    ...(capabilityEnabled("closeoutReview") ? openSafetyIncidents.slice(0, 2).map((incident) => ({
      id: `safety-${incident.id}`,
      eyebrow: "Safety blocker",
      title: safetyName(incident),
      description: "Open safety item must be reviewed before closeout readiness.",
      tone: "red",
      icon: "alert",
      actionLabel: "Review safety",
      moduleId: "incidents",
      recordType: "safetyIncident",
      record: incident,
    })) : []),
    ...(capabilityEnabled("closeoutReview") ? fieldOpsItems.slice(0, 3).map((item) => ({
      id: `field-ops-${item.id}`,
      eyebrow: item.contextLabel || fieldOpsAgent?.roleScope || "Field ops",
      title: item.title || "Field item needs review",
      description: item.description || "Open the existing field workflow and review before taking action.",
      tone: item.severity === "critical" ? "red" : item.severity === "warning" ? "amber" : "blue",
      icon: item.moduleId === "uploads" ? "upload" : item.moduleId === "time" ? "clock" : item.moduleId === "safety" || item.moduleId === "incidents" ? "alert" : "hardhat",
      actionLabel: item.actionLabel || "Open field item",
      moduleId: item.moduleId || "jobs",
      recordType: "fieldOps",
      record: item,
    })) : []),
    ...(capabilityEnabled("ownerBiReview") ? asArray(ownerBusinessIntelligence.reviewRows).slice(0, 3).map((row) => ({
      id: row.id,
      eyebrow: row.source || "Owner BI",
      title: row.title,
      description: `${row.description} Review-only: no accounting, payroll, billing, customer contact, or record change happens here.`,
      tone: row.tone || "blue",
      icon: row.type === "lead_source_reporting" ? "spark" : row.type === "report_review" ? "clipboard" : "grid",
      actionLabel: row.actionLabel || "Review BI",
      moduleId: row.moduleId || "copilot",
      recordType: "ownerBusinessIntelligence",
      record: row,
    })) : []),
    ...(capabilityEnabled("leadReview") ? newLeads.slice(0, 2).map((lead) => ({
      id: `lead-${lead.id}`,
      eyebrow: lead.priority === "High" ? "High-priority lead" : "New lead",
      title: lead.customer || lead.project || "Unnamed lead",
      description: lead.project || lead.nextStep || "Needs first office response.",
      tone: lead.priority === "High" ? "amber" : "blue",
      icon: "inbox",
      actionLabel: "Open lead",
      moduleId: "leads",
      recordType: "lead",
      record: lead,
    })) : []),
    ...(capabilityEnabled("leadReview") ? approvedLeads.slice(0, 2).map((lead) => ({
      id: `approved-${lead.id}`,
      eyebrow: "Approved lead",
      title: lead.customer || lead.project || "Approved lead",
      description: "Ready for estimate or job workflow after office review.",
      tone: "green",
      icon: "check",
      actionLabel: "Open lead",
      moduleId: "leads",
      recordType: "lead",
      record: lead,
    })) : []),
    ...startupWatchJobs.slice(0, 2).map((job) => ({
      id: `job-${job.id}`,
      eyebrow: "Startup watch",
      title: jobName(job),
      description: job.nextStep || job.startupStatus || "Startup readiness needs office review.",
      tone: "amber",
      icon: "briefcase",
      actionLabel: "Open job",
      moduleId: "jobs",
      recordType: "job",
      record: job,
    })),
    ...readyDrafts.slice(0, 1).map((draft) => ({
      id: `draft-${draft.id}`,
      eyebrow: "Imported draft",
      title: draft.customerName || draft.jobName || "Imported job draft",
      description: draft.customerMatchReason || "Review imported package before manual job creation.",
      tone: "blue",
      icon: "database",
      actionLabel: "Open draft",
      moduleId: "jobDraftImports",
      recordType: "draft",
      record: draft,
    })),
  ].map(attachTradeGuidance).slice(0, 12);
  const tradeGuidance = [
    { id: "leads", label: "Lead trade focus", summary: tradeSummaries.leads },
    { id: "estimates", label: "Estimate packet focus", summary: tradeSummaries.estimates },
    { id: "jobs", label: "Field handoff focus", summary: tradeSummaries.jobs },
    { id: "proof", label: "Proof closeout focus", summary: tradeSummaries.proof },
  ]
    .filter((item) => item.summary)
    .map((item) => ({
      ...item,
      guidance: tradeGuidanceFor(item.summary, { moduleId: item.id }),
    }));

  return {
    canView: true,
    modeLabel: automationPolicy.modeLabel,
    headline: "Apex Agent Command Center",
    summary: `${workflowCards.length} ${workflowCards.length === 1 ? "review capability is" : "review capabilities are"} available. Every capability routes into an existing Apex HQ workflow and keeps approval, messages, billing, and record changes manual.`,
    workflowCards,
    focusRows,
    tradeGuidance,
    counts: {
      blockedQueue: blockedQueueItems.length,
      dueQueue: dueQueueItems.length,
      newLeads: newLeads.length,
      highPriorityLeads: highPriorityLeads.length,
      approvedLeads: approvedLeads.length,
      startupWatchJobs: startupWatchJobs.length,
      reportsNeedingReview: reportsNeedingReview.length,
      draftEstimateReviews: draftEstimateReviews.length,
      packetEstimateReviews: packetEstimateReviews.length,
      jobHandoffEstimateReviews: jobHandoffEstimateReviews.length,
      unlinkedUploads: unlinkedUploads.length,
      activeClocks: activeClocks.length,
      closeoutChangeOrders: closeoutChangeOrders.length,
      openSafetyIncidents: openSafetyIncidents.length,
      closeoutBlockers,
      proofCloseoutReview: reportsNeedingReview.length + missingUploads + closeoutBlockers,
      missingUploads,
      readyDrafts: readyDrafts.length,
      readyToBill,
      suggestedLearning: suggestedLearning.length,
      approvedLearning: approvedLearning.length,
      growthFollowUpDrafts: growthAgent.followUpDrafts.length,
      growthReviewRequestDrafts: growthAgent.reviewRequestDrafts?.length || 0,
      estimateCloseRate: growthAgent.scorecard?.estimateCloseRate || 0,
      leadConversionRate: growthAgent.scorecard?.leadConversionRate || 0,
      openEstimateValue: growthAgent.scorecard?.openEstimateValue || 0,
      growthSourceInsights: growthAgent.sourceInsights?.length || 0,
      ownerBiScorecards: ownerBusinessIntelligence.metrics?.ownerScorecards || 0,
      ownerBiReviewRows: ownerBusinessIntelligence.metrics?.reviewRows || 0,
      ownerBiTrustBlockers: ownerBusinessIntelligence.metrics?.biTrustBlockers || 0,
      ownerBiCloseoutReady: ownerBusinessIntelligence.metrics?.readyForBillingReview || 0,
      scoutChecksNeeded: scoutStats.checksNeeded || 0,
      openFoundOpportunities: scoutStats.openFoundOpportunities || 0,
      fieldOpsReview: fieldOpsReviewCount,
    },
    automationPolicy,
    autonomyReadiness: deriveApexAgentAutonomyReadiness({
      controls: automationPolicy,
      visibleReviewCapabilities: workflowCards.length,
      visibleReviewItems: focusRows.length,
      tradeGuidanceCount: tradeGuidance.length,
      hasLearningReview: canManageLearning,
      hasAuditTrail: true,
      fieldRoleBlocked: true,
    }),
    guardrails: defaultAgentGuardrails(automationPolicy),
  };
}

function defaultAgentGuardrails(automationPolicy = deriveApexAgentAutomationPolicyControls()) {
  return [
    { id: "automation-policy", label: "Automation policy", detail: `${automationPolicy.modeLabel || "Review-first"} mode. ${automationPolicy.safetyCopy || "Human review remains required."}` },
    { id: "manual-actions", label: "Manual actions", detail: "No auto-send, approvals, invoice creation, package changes, or job status changes." },
    { id: "field-safety", label: "Field role boundary", detail: "Field users remain limited to assigned work and cannot open office agent command queues." },
    { id: "existing-routes", label: "Existing workflows", detail: "Apex Agent routes to saved Apex HQ modules instead of bypassing review screens." },
  ];
}
