function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function text(value = "") {
  return String(value ?? "").trim();
}

function normalize(value = "") {
  return text(value).toLowerCase().replace(/[_-]/g, " ").replace(/\s+/g, " ");
}

function isArchived(record = {}) {
  return Boolean(record?.archivedAt || record?.deletedAt);
}

function statusOf(record = {}, fallback = "") {
  return normalize(record.status || record.statusLabel || record.stage || fallback);
}

function titleOf(record = {}, fallback = "Record") {
  return text(record.title || record.project || record.name || record.customer || record.customerName || record.id || fallback);
}

function dateValue(record = {}, keys = []) {
  for (const key of keys) {
    const value = text(record?.[key]);
    if (!value) continue;
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return null;
}

function daysBetween(start, end) {
  if (!(start instanceof Date) || Number.isNaN(start.getTime())) return 0;
  const ms = end.getTime() - start.getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}

function money(value) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount <= 0) return "";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);
}

function estimateAmount(estimate = {}) {
  return Number(estimate.total || estimate.value || estimate.amount || estimate.grandTotal || estimate.estimateTotal || 0) || 0;
}

function customerLabel(record = {}) {
  return text(record.customer || record.customerName || record.customer?.name || record.company || "Customer");
}

function sourceLabel(record = {}) {
  return text(record.sourceName || record.leadSourceName || record.source || record.leadSource || record.channel || record.origin);
}

function canViewGrowthAgent(permissions = {}) {
  if (permissions?.jobs?.canManageField && !permissions?.jobs?.canManageAll) return false;
  return Boolean(
    (permissions?.leads?.canView || permissions?.estimates?.canView)
      && (permissions?.jobs?.canManageAll || permissions?.aiOffice?.canView || permissions?.leads?.canManage || permissions?.estimates?.canManage),
  );
}

function buildEstimateFollowUpDraft(estimate = {}, { staleDays = 0 } = {}) {
  const customer = customerLabel(estimate);
  const title = titleOf(estimate, "Estimate");
  const amount = money(estimateAmount(estimate));
  const subject = `Follow-up on ${title}`;
  const body = [
    `Hi ${customer},`,
    "",
    `I wanted to follow up on ${title}${amount ? ` (${amount})` : ""}.`,
    "If the scope still looks right, the office can review the proposal packet and next steps with you.",
    staleDays >= 7 ? `This has been waiting about ${staleDays} days, so it is worth confirming timing before the crew schedule fills up.` : "",
    "",
    "Thanks,",
    "Apex HQ workspace",
  ].filter((line) => line !== "").join("\n");

  return {
    id: `growth-estimate-${text(estimate.id || title)}`,
    type: "estimate_follow_up",
    sourceId: text(estimate.id),
    sourceModule: "estimates",
    title: `Follow up ${title}`,
    customer,
    status: text(estimate.status || "sent"),
    urgency: staleDays >= 14 ? "high" : staleDays >= 7 ? "medium" : "normal",
    reason: staleDays ? `Estimate has been waiting ${staleDays} day${staleDays === 1 ? "" : "s"}.` : "Estimate is open and has no linked job yet.",
    draft: {
      channel: "copy_only",
      subject,
      body,
    },
    requiredReview: [
      "Confirm customer contact details before any message is sent manually.",
      "Review scope, options, price, and proposal packet before follow-up.",
      "Use the normal approved communication workflow outside this draft helper.",
    ],
    blockedActions: [
      "No email, SMS, call, or customer notification is sent.",
      "No estimate status, approval, job conversion, invoice, or payment action is changed.",
      "No bid is submitted and no external portal is contacted.",
    ],
  };
}

function buildLeadFollowUpDraft(lead = {}, { overdueDays = 0 } = {}) {
  const customer = customerLabel(lead);
  const project = titleOf(lead, "Lead");
  const subject = `Checking in on ${project}`;
  const body = [
    `Hi ${customer},`,
    "",
    `I wanted to check in on ${project}.`,
    "If you are still looking at this work, the office can confirm the scope, timing, and next estimate step.",
    overdueDays > 0 ? `This follow-up is ${overdueDays} day${overdueDays === 1 ? "" : "s"} past the planned date.` : "",
    "",
    "Thanks,",
    "Apex HQ workspace",
  ].filter((line) => line !== "").join("\n");

  return {
    id: `growth-lead-${text(lead.id || project)}`,
    type: "lead_follow_up",
    sourceId: text(lead.id),
    sourceModule: "leads",
    title: `Follow up ${project}`,
    customer,
    status: text(lead.status || "New"),
    urgency: overdueDays >= 3 ? "high" : overdueDays > 0 ? "medium" : "normal",
    reason: overdueDays > 0 ? `Lead follow-up is overdue by ${overdueDays} day${overdueDays === 1 ? "" : "s"}.` : "Lead looks open and ready for office follow-up.",
    draft: {
      channel: "copy_only",
      subject,
      body,
    },
    requiredReview: [
      "Confirm consent and contact details before contacting the lead manually.",
      "Review missing info, fit score, scope, and estimate readiness first.",
      "Use the normal lead workflow before changing status or creating an estimate.",
    ],
    blockedActions: [
      "No email, SMS, call, or customer notification is sent.",
      "No lead status, estimate draft, job, invoice, or payment action is changed.",
      "No external outreach or bid submission happens from this draft.",
    ],
  };
}

function buildReviewRequestDraft(job = {}, { completedDays = 0 } = {}) {
  const customer = customerLabel(job);
  const title = titleOf(job, "Completed job");
  const subject = `Feedback on ${title}`;
  const body = [
    `Hi ${customer},`,
    "",
    `Thanks again for trusting us with ${title}.`,
    "If everything looks complete on your end, the office would appreciate any quick feedback on how the project went.",
    "If there is anything that still needs attention, please reply with the details so the team can review it before any public review or testimonial ask.",
    "",
    "Thanks,",
    "Apex HQ workspace",
  ].join("\n");

  return {
    id: `growth-review-${text(job.id || title)}`,
    type: "review_request",
    sourceId: text(job.id),
    sourceModule: "jobs",
    title: `Review feedback for ${title}`,
    customer,
    status: text(job.status || job.stage || "completed"),
    urgency: completedDays <= 14 ? "high" : completedDays <= 30 ? "medium" : "normal",
    reason: completedDays
      ? `Job was completed about ${completedDays} day${completedDays === 1 ? "" : "s"} ago.`
      : "Job appears complete and ready for a manual customer feedback review.",
    draft: {
      channel: "copy_only",
      subject,
      body,
    },
    requiredReview: [
      "Confirm the job is truly complete and any punch, warranty, safety, or billing review items are handled first.",
      "Confirm the customer gave permission before using any quote, logo, photo, or testimonial publicly.",
      "Use the normal approved communication workflow outside this draft helper.",
    ],
    blockedActions: [
      "No email, SMS, survey, review request, testimonial request, or customer notification is sent.",
      "No testimonial, case study, public review, logo, photo, or customer proof is published.",
      "No job status, invoice, payment, customer record, or outreach tracker is changed.",
    ],
  };
}

function buildSourceInsight(source, group = {}) {
  const conversionRate = group.leads ? Math.round((group.convertedLeads / group.leads) * 100) : 0;
  const openValue = group.openEstimateValue || 0;
  const title = group.leads >= 2 && conversionRate >= 50
    ? `Protect ${source} momentum`
    : group.overdueLeads || group.staleEstimates
      ? `Review ${source} follow-up`
      : `Track ${source} quality`;
  const detailParts = [
    `${group.leads} lead${group.leads === 1 ? "" : "s"}`,
    `${conversionRate}% converted`,
    openValue ? `${money(openValue)} open estimate value` : "",
    group.overdueLeads ? `${group.overdueLeads} overdue lead follow-up${group.overdueLeads === 1 ? "" : "s"}` : "",
    group.staleEstimates ? `${group.staleEstimates} stale estimate${group.staleEstimates === 1 ? "" : "s"}` : "",
  ].filter(Boolean);

  return {
    id: `lead-source-${normalize(source).replace(/\s+/g, "-")}`,
    source,
    title,
    detail: `${detailParts.join(" / ")}. Use this as a manual review signal before adding spend, outreach, or new source work.`,
    leads: group.leads || 0,
    convertedLeads: group.convertedLeads || 0,
    openLeads: group.openLeads || 0,
    overdueLeads: group.overdueLeads || 0,
    openEstimates: group.openEstimates || 0,
    staleEstimates: group.staleEstimates || 0,
    openEstimateValue: openValue,
    conversionRate,
    tone: group.overdueLeads || group.staleEstimates ? "amber" : conversionRate >= 50 && group.leads >= 2 ? "green" : "blue",
    requiredReview: [
      "Confirm the source, lead quality, and latest customer context before acting.",
      "Use normal lead and estimate workflows for any follow-up or status changes.",
      "Treat small sample sizes as signals, not proof of channel performance.",
    ],
    blockedActions: [
      "No outreach, ads, source contact, customer contact, bid submission, or spend is triggered.",
      "No lead, estimate, package, invoice, payment, or job record is changed.",
    ],
  };
}

export function deriveGrowthAgentState({
  permissions = {},
  leads = [],
  estimates = [],
  jobs = [],
  now = new Date(),
} = {}) {
  if (!canViewGrowthAgent(permissions)) {
    return {
      canView: false,
      mode: "blocked",
      summary: "Growth Agent is blocked for this role. Field users cannot access lead, estimate, pricing, or customer follow-up drafts.",
      scorecard: {},
      followUpDrafts: [],
      reviewRequestDrafts: [],
      sourceInsights: [],
      recommendations: [],
      safetyBoundary: "Blocked for this role.",
    };
  }

  const currentDate = now instanceof Date && !Number.isNaN(now.getTime()) ? now : new Date();
  const activeLeads = asArray(leads).filter((lead) => !isArchived(lead));
  const activeEstimates = asArray(estimates).filter((estimate) => !isArchived(estimate));
  const activeJobs = asArray(jobs).filter((job) => !isArchived(job));
  const openEstimateStatuses = new Set(["sent", "draft", "review", "pending", "new"]);
  const wonStatuses = new Set(["approved", "accepted", "won"]);
  const lostStatuses = new Set(["rejected", "declined", "lost", "archived"]);
  const openLeadStatuses = new Set(["new", "contacted", "site visit", "estimate sent", "open", "warm", "hot"]);
  const completedJobStatuses = new Set(["field complete", "field completed", "complete", "completed", "closed", "done", "billing ready"]);

  const openEstimates = activeEstimates.filter((estimate) => openEstimateStatuses.has(statusOf(estimate, "draft")) && !estimate.jobId);
  const wonEstimates = activeEstimates.filter((estimate) => wonStatuses.has(statusOf(estimate)));
  const lostEstimates = activeEstimates.filter((estimate) => lostStatuses.has(statusOf(estimate)));
  const convertedEstimates = activeEstimates.filter((estimate) => estimate.jobId || activeJobs.some((job) => job.estimateId === estimate.id));
  const openLeads = activeLeads.filter((lead) => openLeadStatuses.has(statusOf(lead, "new")));
  const convertedLeads = activeLeads.filter((lead) => ["approved", "converted", "won"].includes(statusOf(lead)));
  const reviewCandidateJobs = activeJobs.filter((job) => (
    completedJobStatuses.has(statusOf(job))
    && !text(job.reviewRequestedAt || job.reviewRequestSentAt || job.testimonialRequestedAt)
  ));
  const totalEstimateValue = activeEstimates.reduce((sum, estimate) => sum + estimateAmount(estimate), 0);
  const openEstimateValue = openEstimates.reduce((sum, estimate) => sum + estimateAmount(estimate), 0);
  const leadsById = new Map(activeLeads.map((lead) => [text(lead.id), lead]));

  const estimateDrafts = openEstimates
    .map((estimate) => {
      const anchor = dateValue(estimate, ["sentAt", "updatedAt", "createdAt"]);
      const staleDays = anchor ? daysBetween(anchor, currentDate) : 0;
      return { estimate, staleDays };
    })
    .filter(({ estimate, staleDays }) => statusOf(estimate) === "sent" || staleDays >= 5)
    .sort((left, right) => right.staleDays - left.staleDays || estimateAmount(right.estimate) - estimateAmount(left.estimate))
    .slice(0, 3)
    .map(({ estimate, staleDays }) => buildEstimateFollowUpDraft(estimate, { staleDays }));

  const leadDrafts = openLeads
    .map((lead) => {
      const due = dateValue(lead, ["followUpDueAt", "nextFollowUpAt"]);
      const overdueDays = due ? daysBetween(due, currentDate) : 0;
      return { lead, overdueDays };
    })
    .filter(({ lead, overdueDays }) => overdueDays > 0 || ["high", "hot"].includes(normalize(lead.priority || lead.temperature)))
    .sort((left, right) => right.overdueDays - left.overdueDays)
    .slice(0, 3)
    .map(({ lead, overdueDays }) => buildLeadFollowUpDraft(lead, { overdueDays }));

  const reviewRequestDrafts = reviewCandidateJobs
    .map((job) => {
      const completedAt = dateValue(job, ["completedAt", "closedAt", "fieldCompletedAt", "updatedAt"]);
      const completedDays = completedAt ? daysBetween(completedAt, currentDate) : 0;
      return { job, completedDays };
    })
    .sort((left, right) => left.completedDays - right.completedDays || titleOf(left.job).localeCompare(titleOf(right.job)))
    .slice(0, 3)
    .map(({ job, completedDays }) => buildReviewRequestDraft(job, { completedDays }));

  const followUpDrafts = [...estimateDrafts, ...leadDrafts].slice(0, 5);
  const closeRate = activeEstimates.length ? Math.round((wonEstimates.length / activeEstimates.length) * 100) : 0;
  const conversionRate = activeLeads.length ? Math.round((convertedLeads.length / activeLeads.length) * 100) : 0;
  const sourceGroups = new Map();
  const ensureSourceGroup = (source) => {
    const label = text(source);
    if (!label) return null;
    const key = normalize(label);
    if (!sourceGroups.has(key)) {
      sourceGroups.set(key, {
        source: label,
        leads: 0,
        convertedLeads: 0,
        openLeads: 0,
        overdueLeads: 0,
        openEstimates: 0,
        staleEstimates: 0,
        openEstimateValue: 0,
      });
    }
    return sourceGroups.get(key);
  };

  activeLeads.forEach((lead) => {
    const group = ensureSourceGroup(sourceLabel(lead));
    if (!group) return;
    const leadStatus = statusOf(lead, "new");
    const due = dateValue(lead, ["followUpDueAt", "nextFollowUpAt"]);
    group.leads += 1;
    if (["approved", "converted", "won"].includes(leadStatus)) group.convertedLeads += 1;
    if (openLeadStatuses.has(leadStatus)) group.openLeads += 1;
    if (due && daysBetween(due, currentDate) > 0) group.overdueLeads += 1;
  });

  openEstimates.forEach((estimate) => {
    const linkedLead = leadsById.get(text(estimate.leadId));
    const group = ensureSourceGroup(sourceLabel(estimate) || sourceLabel(linkedLead));
    if (!group) return;
    const anchor = dateValue(estimate, ["sentAt", "updatedAt", "createdAt"]);
    const staleDays = anchor ? daysBetween(anchor, currentDate) : 0;
    group.openEstimates += 1;
    group.openEstimateValue += estimateAmount(estimate);
    if (statusOf(estimate) === "sent" || staleDays >= 5) group.staleEstimates += 1;
  });

  const sourceInsights = Array.from(sourceGroups.values())
    .filter((group) => group.leads || group.openEstimates)
    .map((group) => buildSourceInsight(group.source, group))
    .sort((left, right) => (
      right.overdueLeads - left.overdueLeads
      || right.staleEstimates - left.staleEstimates
      || right.openEstimateValue - left.openEstimateValue
      || right.leads - left.leads
      || left.source.localeCompare(right.source)
    ))
    .slice(0, 3);

  const recommendations = [
    followUpDrafts.length ? {
      id: "review-follow-up-drafts",
      title: "Review follow-up drafts",
      detail: `${followUpDrafts.length} copy-only follow-up draft${followUpDrafts.length === 1 ? "" : "s"} are ready for human review.`,
      tone: "orange",
    } : null,
    openEstimateValue > 0 ? {
      id: "open-estimate-value",
      title: "Protect open estimate value",
      detail: `${money(openEstimateValue)} is still open in estimates without a linked job.`,
      tone: openEstimateValue >= 50_000 ? "amber" : "blue",
    } : null,
    sourceInsights.length ? {
      id: "lead-source-intelligence",
      title: "Review lead source quality",
      detail: `${sourceInsights[0].source}: ${sourceInsights[0].detail}`,
      tone: sourceInsights[0].tone,
    } : null,
    reviewRequestDrafts.length ? {
      id: "review-request-drafts",
      title: "Review customer feedback drafts",
      detail: `${reviewRequestDrafts.length} copy-only review request draft${reviewRequestDrafts.length === 1 ? "" : "s"} are ready for completed jobs.`,
      tone: "blue",
    } : null,
    activeLeads.length && conversionRate < 35 ? {
      id: "lead-conversion-review",
      title: "Review lead conversion",
      detail: `Lead conversion is ${conversionRate}%. Check stale leads, missing info, and estimate readiness before adding more sources.`,
      tone: "amber",
    } : null,
  ].filter(Boolean);

  return {
    canView: true,
    mode: "review_first_growth_agent",
    summary: followUpDrafts.length
      ? `${followUpDrafts.length} follow-up draft${followUpDrafts.length === 1 ? "" : "s"} need human review. Nothing is sent or changed by Apex.`
      : reviewRequestDrafts.length
        ? `${reviewRequestDrafts.length} customer feedback draft${reviewRequestDrafts.length === 1 ? "" : "s"} need human review. Nothing is sent or published by Apex.`
        : "No stale estimate, lead follow-up, or review request draft is currently recommended from visible records.",
    scorecard: {
      leads: activeLeads.length,
      openLeads: openLeads.length,
      convertedLeads: convertedLeads.length,
      leadConversionRate: conversionRate,
      estimates: activeEstimates.length,
      openEstimates: openEstimates.length,
      wonEstimates: wonEstimates.length,
      lostEstimates: lostEstimates.length,
      estimateCloseRate: closeRate,
      convertedEstimates: convertedEstimates.length,
      totalEstimateValue,
      openEstimateValue,
      leadSourcesTracked: sourceInsights.length,
      reviewCandidateJobs: reviewCandidateJobs.length,
    },
    followUpDrafts,
    reviewRequestDrafts,
    sourceInsights,
    recommendations,
    safetyBoundary: "Review-only growth intelligence. No customer contact, auto-send, status change, estimate conversion, bid submission, invoice, payment, package change, ad publishing, or external action is performed.",
  };
}
