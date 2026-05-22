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
  agentLearningPreferences = [],
  fieldOpsAgent = null,
} = {}) {
  if (!canUseAiOfficeAgentCommand(permissions)) {
    return {
      canView: false,
      modeLabel: "Blocked",
      headline: "Agent command center unavailable",
      summary: "Field users stay limited to assigned work and cannot open office agent command surfaces.",
      workflowCards: [],
      focusRows: [],
      guardrails: defaultAgentGuardrails(),
    };
  }

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

  const workflowCards = [
    canViewOpportunityScout ? {
      id: "opportunity-scout",
      title: "Opportunity Scout",
      helper: "Run review-first source checks, inspect found work, and keep Create Lead behind office approval.",
      icon: "spark",
      badge: opportunityScout?.readiness?.label || `${countLabel(scoutStats.openFoundOpportunities || 0, "opportunity")} open`,
      tone: opportunityScout?.readiness?.tone || toneForCount(scoutStats.openFoundOpportunities || scoutStats.checksNeeded || 0, { active: "orange" }),
      actionLabel: "Open scout",
      moduleId: "copilot",
    } : null,
    permissions?.leads?.canView ? {
      id: "lead-review",
      title: "Lead Review Agent",
      helper: "Prioritize new, high-fit, and approved leads before creating estimates or jobs.",
      icon: "inbox",
      badge: `${newLeads.length + highPriorityLeads.length} ready`,
      tone: toneForCount(newLeads.length + highPriorityLeads.length, { active: "orange", highAt: 6 }),
      actionLabel: "Open leads",
      moduleId: "leads",
    } : null,
    permissions?.jobs?.canView || permissions?.jobs?.canManageAll ? {
      id: "job-startup",
      title: "Job Startup Agent",
      helper: "Review planned jobs, crew readiness, startup gaps, and imported draft handoffs.",
      icon: "briefcase",
      badge: `${startupWatchJobs.length} watching`,
      tone: toneForCount(startupWatchJobs.length, { active: "amber", highAt: 5 }),
      actionLabel: "Open jobs",
      moduleId: "jobs",
    } : null,
    permissions?.estimates?.canView || permissions?.estimates?.canManage ? {
      id: "estimate-action-agent",
      title: "Estimate Action Agent",
      helper: "Review draft estimates, proposal packets, and approved estimate-to-job handoffs before any human-approved draft prep.",
      icon: "document",
      badge: `${draftEstimateReviews.length + jobHandoffEstimateReviews.length} estimate actions`,
      tone: jobHandoffEstimateReviews.length ? "green" : draftEstimateReviews.length ? "amber" : "slate",
      actionLabel: "Open estimates",
      moduleId: "estimates",
    } : null,
    permissions?.reports?.canView || permissions?.uploads?.canView ? {
      id: "proof-closeout",
      title: "Proof Closeout Agent",
      helper: "Summarize submitted reports, photo gaps, unlinked uploads, active clocks, safety, change orders, and ready-to-bill blockers.",
      icon: "clipboard",
      badge: `${reportsNeedingReview.length + missingUploads + closeoutBlockers} closeout items`,
      tone: toneForCount(reportsNeedingReview.length + missingUploads + closeoutBlockers, { active: "amber", highAt: 5 }),
      actionLabel: "Open reports",
      moduleId: "reports",
    } : null,
    fieldOpsAgent?.canView ? {
      id: "field-ops-agent",
      title: "Field Ops Agent",
      helper: "Review company field risk across missing reports, proof, tickets, checklists, safety, and active clocks without writing records.",
      icon: "hardhat",
      badge: `${countLabel(fieldOpsReviewCount, "field item")} open`,
      tone: fieldOpsStats.critical ? "red" : fieldOpsStats.warning ? "amber" : fieldOpsReviewCount ? "blue" : "green",
      actionLabel: "Open field ops",
      moduleId: "commandCenter",
    } : null,
    permissions?.customers?.canView || permissions?.settings?.canView ? {
      id: "pilot-handoff",
      title: "Pilot Handoff Agent",
      helper: "Check customer, job, setup, support, and manual handoff readiness without creating accounts or invites.",
      icon: "users",
      badge: permissions?.settings?.canView ? "Setup review" : "Customer review",
      tone: readyToBill || approvedLeads.length ? "blue" : "slate",
      actionLabel: permissions?.customers?.canView ? "Open customers" : "Open settings",
      moduleId: permissions?.customers?.canView ? "customers" : "settings",
    } : null,
    permissions?.appHealth?.canView ? {
      id: "release-readiness",
      title: "Release Readiness Agent",
      helper: "Review App Health, audit signals, backup posture, and rollout guardrails before any release decision.",
      icon: "lock",
      badge: "Owner gate",
      tone: blockedQueueItems.length ? "amber" : "green",
      actionLabel: "Open App Health",
      moduleId: "appHealth",
    } : null,
    canManageLearning ? {
      id: "agent-learning",
      title: "Apex Learning Queue",
      helper: "Review contractor preferences suggested from approved work before they become active AI memory.",
      icon: "spark",
      badge: suggestedLearning.length ? `${suggestedLearning.length} suggested` : `${approvedLearning.length} approved`,
      tone: suggestedLearning.length ? "amber" : approvedLearning.length ? "green" : "slate",
      actionLabel: "Review memory",
      moduleId: "copilot",
      recordType: "agentLearning",
    } : null,
  ].filter(Boolean);

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
    ...jobHandoffEstimateReviews.slice(0, 2).map((estimate) => ({
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
    })),
    ...draftEstimateReviews.slice(0, 2).map((estimate) => ({
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
    })),
    ...packetEstimateReviews.filter((estimate) => !draftEstimateReviews.some((draft) => draft.id === estimate.id)).slice(0, 1).map((estimate) => ({
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
    })),
    ...(canViewOpportunityScout ? asArray(opportunityScout.foundOpportunityQueue).slice(0, 3).map((opportunity) => ({
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
    ...reportsNeedingReview.slice(0, 2).map((report) => ({
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
    })),
    ...unlinkedUploads.slice(0, 2).map((upload) => ({
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
    })),
    ...activeClocks.slice(0, 2).map((entry) => ({
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
    })),
    ...closeoutChangeOrders.slice(0, 2).map((changeOrder) => ({
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
    })),
    ...openSafetyIncidents.slice(0, 2).map((incident) => ({
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
    })),
    ...fieldOpsItems.slice(0, 3).map((item) => ({
      id: `field-ops-${item.id}`,
      eyebrow: item.contextLabel || fieldOpsAgent?.roleScope || "Field Ops Agent",
      title: item.title || "Field item needs review",
      description: item.description || "Open the existing field workflow and review before taking action.",
      tone: item.severity === "critical" ? "red" : item.severity === "warning" ? "amber" : "blue",
      icon: item.moduleId === "uploads" ? "upload" : item.moduleId === "time" ? "clock" : item.moduleId === "safety" || item.moduleId === "incidents" ? "alert" : "hardhat",
      actionLabel: item.actionLabel || "Open field item",
      moduleId: item.moduleId || "jobs",
      recordType: "fieldOps",
      record: item,
    })),
    ...newLeads.slice(0, 2).map((lead) => ({
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
    })),
    ...approvedLeads.slice(0, 2).map((lead) => ({
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
    })),
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
  ].slice(0, 12);

  return {
    canView: true,
    modeLabel: "Review-first",
    headline: "Agent Command Center",
    summary: `${workflowCards.length} review lane${workflowCards.length === 1 ? "" : "s"} are available. Every lane routes into an existing Apex HQ workflow and keeps approval, messages, billing, and record changes manual.`,
    workflowCards,
    focusRows,
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
      scoutChecksNeeded: scoutStats.checksNeeded || 0,
      openFoundOpportunities: scoutStats.openFoundOpportunities || 0,
      fieldOpsReview: fieldOpsReviewCount,
    },
    guardrails: defaultAgentGuardrails(),
  };
}

function defaultAgentGuardrails() {
  return [
    { id: "manual-actions", label: "Manual actions", detail: "No auto-send, approvals, invoice creation, package changes, or job status changes." },
    { id: "field-safety", label: "Field role boundary", detail: "Field users remain limited to assigned work and cannot open office agent command queues." },
    { id: "existing-routes", label: "Existing workflows", detail: "Agent lanes route to saved Apex HQ modules instead of bypassing review screens." },
  ];
}
