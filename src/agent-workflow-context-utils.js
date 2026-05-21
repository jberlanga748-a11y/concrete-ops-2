function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function text(value = "") {
  return String(value ?? "").trim();
}

function normalize(value = "") {
  return text(value).toLowerCase().replace(/\s+/g, " ");
}

function isArchived(record = {}) {
  return Boolean(record?.archivedAt || record?.deletedAt);
}

function statusOf(record = {}, fallback = "") {
  return normalize(record.status || record.reviewStatus || record.state || fallback);
}

function titleOf(record = {}, fallback = "Record") {
  return text(record.title || record.name || record.project || record.customer || record.customerName || record.label || record.id || fallback);
}

function visibleRecords(context = {}, key = "", permission = false) {
  return permission ? asArray(context[key]).filter((record) => !isArchived(record)) : [];
}

function topRecords(records = [], fallback = "Record") {
  return asArray(records)
    .filter((record) => !isArchived(record))
    .slice(0, 3)
    .map((record) => ({
      id: text(record.id || titleOf(record, fallback)),
      label: titleOf(record, fallback),
      status: text(record.status || record.reviewStatus || record.state || "Review"),
    }));
}

function moduleSummary({ id, label, moduleId = id, canView = false, count = 0, needsAttention = 0, summary = "", nextActionLabel = "Open", records = [] }) {
  return {
    id,
    label,
    moduleId,
    canView: Boolean(canView),
    count,
    needsAttention,
    tone: !canView ? "slate" : needsAttention > 0 ? "amber" : count > 0 ? "green" : "slate",
    summary: canView ? summary : `${label} is outside this user's current role/package visibility.`,
    nextActionLabel,
    records: canView ? topRecords(records, label) : [],
  };
}

export function deriveAgentWorkflowContext(context = {}) {
  const permissions = context.permissions || {};
  const leads = visibleRecords(context, "leads", Boolean(permissions?.leads?.canView));
  const estimates = visibleRecords(context, "estimates", Boolean(permissions?.estimates?.canView));
  const jobs = visibleRecords(context, "jobs", Boolean(permissions?.jobs?.canView || permissions?.jobs?.canManageAll));
  const reports = visibleRecords(context, "dailyReports", Boolean(permissions?.reports?.canView));
  const uploads = visibleRecords(context, "uploads", Boolean(permissions?.uploads?.canView));
  const customers = visibleRecords(context, "customers", Boolean(permissions?.customers?.canView));
  const users = visibleRecords(context, "users", Boolean(permissions?.users?.canView));
  const timeEntries = visibleRecords(context, "timeEntries", Boolean(permissions?.time?.canView));
  const safetyIncidents = visibleRecords(context, "safetyIncidents", Boolean(permissions?.safety?.canView));
  const changeOrders = visibleRecords(context, "changeOrderRequests", Boolean(permissions?.changeOrders?.canView));
  const deliveryTickets = visibleRecords(context, "deliveryTickets", Boolean(permissions?.deliveryTickets?.canView));
  const prePour = visibleRecords(context, "prePourChecklists", Boolean(permissions?.prePour?.canView));
  const postPour = visibleRecords(context, "postPourChecklists", Boolean(permissions?.postPour?.canView));
  const toolChecklists = visibleRecords(context, "toolChecklists", Boolean(permissions?.toolChecklist?.canUse));
  const jobDraftImports = visibleRecords(context, "jobDraftImports", Boolean(permissions?.jobDraftImports?.canView));

  const activeJobs = jobs.filter((job) => !["complete", "completed", "cancelled", "archived"].includes(statusOf(job)));
  const leadFollowups = leads.filter((lead) => /new|follow|proposal|waiting|open|hot|warm/.test(statusOf(lead, "open")));
  const draftEstimates = estimates.filter((estimate) => /draft|new|pending|review/.test(statusOf(estimate, "draft")));
  const approvedEstimates = estimates.filter((estimate) => /approved/.test(statusOf(estimate)));
  const proofNeedsReview = [
    ...reports.filter((record) => /submitted|needs|review|missing|draft/.test(statusOf(record))),
    ...uploads.filter((record) => /missing|needs|review|pending|blocked/.test(statusOf(record))),
    ...deliveryTickets.filter((record) => /missing|needs|review|pending|blocked/.test(statusOf(record))),
    ...prePour.filter((record) => /missing|needs|review|pending|blocked|draft/.test(statusOf(record))),
    ...postPour.filter((record) => /missing|needs|review|pending|blocked|draft/.test(statusOf(record))),
    ...toolChecklists.filter((record) => /missing|needs|review|pending|blocked|draft/.test(statusOf(record))),
  ];
  const unresolvedSafety = safetyIncidents.filter((incident) => !/resolved|closed|complete/.test(statusOf(incident, "open")));
  const activeClocks = timeEntries.filter((entry) => /clocked|active|in progress|break/.test(statusOf(entry)) || (entry.clockIn && !entry.clockOut));
  const pendingChangeOrders = changeOrders.filter((change) => /new|pending|review|submitted|draft/.test(statusOf(change, "pending")));
  const importedDraftsReady = jobDraftImports.filter((draft) => /ready|review|new|pending/.test(statusOf(draft, "review")));

  const modules = [
    moduleSummary({
      id: "leads",
      label: "Leads",
      canView: Boolean(permissions?.leads?.canView),
      count: leads.length,
      needsAttention: leadFollowups.length,
      summary: `${leadFollowups.length} lead${leadFollowups.length === 1 ? "" : "s"} look ready for follow-up or estimate prep.`,
      nextActionLabel: "Open leads",
      records: leadFollowups.length ? leadFollowups : leads,
    }),
    moduleSummary({
      id: "estimates",
      label: "Estimates",
      canView: Boolean(permissions?.estimates?.canView),
      count: estimates.length,
      needsAttention: draftEstimates.length + approvedEstimates.length,
      summary: `${draftEstimates.length} draft/review estimate${draftEstimates.length === 1 ? "" : "s"} and ${approvedEstimates.length} approved estimate${approvedEstimates.length === 1 ? "" : "s"} visible for packet or handoff review.`,
      nextActionLabel: "Open estimates",
      records: draftEstimates.length ? draftEstimates : estimates,
    }),
    moduleSummary({
      id: "jobs",
      label: "Jobs",
      canView: Boolean(permissions?.jobs?.canView || permissions?.jobs?.canManageAll),
      count: jobs.length,
      needsAttention: activeJobs.length,
      summary: `${activeJobs.length} active job${activeJobs.length === 1 ? "" : "s"} visible for schedule, field handoff, proof, and closeout context.`,
      nextActionLabel: "Open jobs",
      records: activeJobs.length ? activeJobs : jobs,
    }),
    moduleSummary({
      id: "proof",
      label: "Proof Engine",
      moduleId: permissions?.reports?.canView ? "reports" : "uploads",
      canView: Boolean(permissions?.reports?.canView || permissions?.uploads?.canView || permissions?.deliveryTickets?.canView || permissions?.toolChecklist?.canUse),
      count: reports.length + uploads.length + deliveryTickets.length + prePour.length + postPour.length + toolChecklists.length,
      needsAttention: proofNeedsReview.length,
      summary: `${proofNeedsReview.length} proof/report/ticket/checklist item${proofNeedsReview.length === 1 ? "" : "s"} may need review before ready-to-bill.`,
      nextActionLabel: permissions?.reports?.canView ? "Open reports" : "Open uploads",
      records: proofNeedsReview,
    }),
    moduleSummary({
      id: "customers",
      label: "Customers",
      canView: Boolean(permissions?.customers?.canView),
      count: customers.length,
      needsAttention: customers.length,
      summary: `${customers.length} customer account${customers.length === 1 ? "" : "s"} visible for linked leads, jobs, estimates, and support context.`,
      nextActionLabel: "Open customers",
      records: customers,
    }),
    moduleSummary({
      id: "employees",
      label: "Employees",
      moduleId: "employees",
      canView: Boolean(permissions?.users?.canView),
      count: users.length,
      needsAttention: activeClocks.length,
      summary: `${users.length} employee/crew record${users.length === 1 ? "" : "s"} visible; ${activeClocks.length} active time entr${activeClocks.length === 1 ? "y" : "ies"} need time review.`,
      nextActionLabel: "Open employees",
      records: users,
    }),
    moduleSummary({
      id: "safety",
      label: "Safety",
      moduleId: "incidents",
      canView: Boolean(permissions?.safety?.canView),
      count: safetyIncidents.length,
      needsAttention: unresolvedSafety.length,
      summary: `${unresolvedSafety.length} unresolved safety item${unresolvedSafety.length === 1 ? "" : "s"} visible.`,
      nextActionLabel: "Open safety",
      records: unresolvedSafety,
    }),
    moduleSummary({
      id: "changeOrders",
      label: "Change Orders",
      moduleId: "changeOrders",
      canView: Boolean(permissions?.changeOrders?.canView),
      count: changeOrders.length,
      needsAttention: pendingChangeOrders.length,
      summary: `${pendingChangeOrders.length} change order${pendingChangeOrders.length === 1 ? "" : "s"} may need review before pricing, approval, or billing readiness.`,
      nextActionLabel: "Open change orders",
      records: pendingChangeOrders,
    }),
    moduleSummary({
      id: "jobDraftImports",
      label: "Imported Drafts",
      moduleId: "jobDraftImports",
      canView: Boolean(permissions?.jobDraftImports?.canView),
      count: jobDraftImports.length,
      needsAttention: importedDraftsReady.length,
      summary: `${importedDraftsReady.length} imported draft${importedDraftsReady.length === 1 ? "" : "s"} may be ready for human review before any job creation.`,
      nextActionLabel: "Open imported drafts",
      records: importedDraftsReady,
    }),
  ];

  const visibleModules = modules.filter((module) => module.canView);
  const attentionModules = visibleModules
    .filter((module) => module.needsAttention > 0)
    .sort((left, right) => right.needsAttention - left.needsAttention);
  const topActions = attentionModules.slice(0, 4).map((module) => ({
    moduleId: module.moduleId,
    actionLabel: module.nextActionLabel,
    label: module.label,
    count: module.needsAttention,
  }));

  return {
    generatedAt: new Date().toISOString(),
    mode: "read_only_review_first",
    userRole: text(context.user?.role || "Unknown"),
    visibleModuleCount: visibleModules.length,
    attentionCount: attentionModules.reduce((total, module) => total + module.needsAttention, 0),
    summary: attentionModules.length
      ? `${attentionModules.length} workflow area${attentionModules.length === 1 ? "" : "s"} need review. Start with ${attentionModules[0].label}.`
      : visibleModules.length
        ? "No visible workflow area is showing urgent review pressure in this context."
        : "This user has no office workflow context visible to the assistant.",
    modules,
    topActions,
    safetyBoundary: "Read-only context. No customer contact, send, approve, convert, schedule, invoice, payment, or field update is performed.",
  };
}

export function hasAgentWorkflowContextIntent(input = "") {
  return /\b(workflow context|agent context|what can you see|what do you see|summarize app|summarize workflow|daily operations|daily ops|what needs attention|what should (we|i) do|next best action|next best actions|run the app|help run)\b/.test(normalize(input));
}
