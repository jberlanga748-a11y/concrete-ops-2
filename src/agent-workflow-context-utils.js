import { buildConstructionAgentTradeContext } from "../shared/constructionTrades.js";

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

function tradeContextForRecord(record = {}, companySettings = {}) {
  return buildConstructionAgentTradeContext({
    trade: record.trade || record.tradeId || record.projectType || record.lead?.trade || record.job?.trade || "",
    companySettings,
    lead: {
      trade: record.trade || record.lead?.trade || "",
      project: record.project || record.title || record.customer || record.customerName || "",
      notes: record.notes || record.scopeSummary || record.description || "",
    },
    estimate: {
      trade: record.trade || record.estimateTrade || record.projectType || "",
      title: record.title || record.estimateTitle || "",
      scopeSummary: record.scopeSummary || record.description || "",
      internalNotes: record.internalNotes || record.startupNotes || "",
    },
    roughNotes: [
      record.title,
      record.name,
      record.project,
      record.customer,
      record.customerName,
      record.scopeSummary,
      record.description,
      record.notes,
      record.fieldNotes,
      record.startupNotes,
      record.trade,
      record.projectType,
    ].filter(Boolean).join("\n"),
  });
}

function summarizeTradeContext(records = [], companySettings = {}) {
  const contexts = asArray(records)
    .filter((record) => record && typeof record === "object")
    .slice(0, 8)
    .map((record) => tradeContextForRecord(record, companySettings));
  if (!contexts.length) return null;

  const counts = new Map();
  contexts.forEach((context) => {
    const current = counts.get(context.tradeId) || { tradeId: context.tradeId, tradeLabel: context.tradeLabel, count: 0, context };
    current.count += 1;
    counts.set(context.tradeId, current);
  });
  const ranked = Array.from(counts.values()).sort((left, right) => right.count - left.count || left.tradeLabel.localeCompare(right.tradeLabel));
  const primary = ranked[0]?.context;
  if (!primary) return null;

  return {
    primaryTradeId: primary.tradeId,
    primaryTradeLabel: primary.tradeLabel,
    visibleTrades: ranked.map((entry) => ({ tradeId: entry.tradeId, tradeLabel: entry.tradeLabel, count: entry.count })).slice(0, 4),
    optionFamilies: primary.optionFamilies.slice(0, 4),
    lineItemStarters: primary.lineItemStarters.slice(0, 5),
    proposalSections: primary.proposalSections.slice(0, 5),
    fieldHandoffChecklist: primary.fieldHandoffChecklist.slice(0, 4),
    proofPhotoChecklist: primary.proofPhotoChecklist.slice(0, 4),
    changeOrderWatchouts: primary.changeOrderWatchouts.slice(0, 4),
    closeoutChecks: primary.closeoutChecks.slice(0, 4),
    safetyBoundary: primary.safetyBoundary,
  };
}

function moduleSummary({ id, label, moduleId = id, canView = false, count = 0, needsAttention = 0, summary = "", nextActionLabel = "Open", records = [], tradeSummary = null }) {
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
    tradeSummary: canView ? tradeSummary : null,
  };
}

const NEXT_ACTION_RULES = {
  safety: {
    priority: 100,
    title: "Review unresolved safety items",
    reason: "Safety issues should be reviewed before closeout, billing readiness, or crew handoff.",
    reviewLabel: "Open the existing safety workflow and resolve or document the item manually.",
    blockedAutomation: "No incident is closed, assigned, messaged, or escalated automatically.",
    tone: "red",
  },
  proof: {
    priority: 90,
    title: "Close proof gaps before ready-to-bill",
    reason: "Reports, photos, tickets, and checklists are the fastest path from field work to billing confidence.",
    reviewLabel: "Open the proof queue and review missing or submitted field evidence.",
    blockedAutomation: "No report, upload, checklist, ticket, invoice, or billing status is approved automatically.",
    tone: "amber",
  },
  jobs: {
    priority: 82,
    title: "Review active job readiness",
    reason: "Active jobs connect schedule, crews, field proof, safety, and customer closeout.",
    reviewLabel: "Open Jobs and review startup, handoff, proof, and next field action.",
    blockedAutomation: "No crew, schedule, job status, customer message, or field update is changed automatically.",
    tone: "blue",
  },
  estimates: {
    priority: 74,
    title: "Review estimate packet or handoff candidates",
    reason: "Draft, review, and approved estimates may be ready for proposal packet review or job handoff prep.",
    reviewLabel: "Open Estimates and review the proposal, quantities, takeoff, packet, and handoff notes.",
    blockedAutomation: "No proposal is sent, approved, priced, converted, or marked accepted automatically.",
    tone: "orange",
  },
  leads: {
    priority: 68,
    title: "Review lead follow-up and estimate prep",
    reason: "Follow-up-ready leads are the cleanest place for the agent to prepare drafts without contacting anyone.",
    reviewLabel: "Open Leads and review missing info, fit score, and estimate draft readiness.",
    blockedAutomation: "No call, email, text, lead conversion, or estimate draft is created without human approval.",
    tone: "orange",
  },
  changeOrders: {
    priority: 64,
    title: "Review pending change orders",
    reason: "Scope changes need office review before pricing, proposal updates, or billing decisions.",
    reviewLabel: "Open Change Orders and verify scope, photos, customer context, and pricing impact.",
    blockedAutomation: "No change order is priced, approved, rejected, sent, or billed automatically.",
    tone: "amber",
  },
  employees: {
    priority: 58,
    title: "Review crew and time readiness",
    reason: "Crew/time signals can expose active clocks, workload, or readiness issues before dispatch decisions.",
    reviewLabel: "Open Employees or Time and review crew assignment, time, and field readiness manually.",
    blockedAutomation: "No employee record, role, invite, schedule, or time entry is changed automatically.",
    tone: "blue",
  },
  jobDraftImports: {
    priority: 52,
    title: "Review imported draft packages",
    reason: "Imported drafts can become useful job setup context after human matching and review.",
    reviewLabel: "Open Imported Drafts and confirm customer match, scope, and missing details.",
    blockedAutomation: "No job, customer, estimate, or upload is created from an import automatically.",
    tone: "slate",
  },
  customers: {
    priority: 42,
    title: "Review customer account context",
    reason: "Customer records help connect leads, estimates, jobs, proof, and support history before follow-up.",
    reviewLabel: "Open Customers and review linked records before taking account action.",
    blockedAutomation: "No customer message, balance change, package change, or account update happens automatically.",
    tone: "slate",
  },
};

function actionRuleFor(module = {}) {
  return NEXT_ACTION_RULES[module.id] || {
    priority: 30,
    title: `Review ${module.label || "workflow"} context`,
    reason: module.summary || "This workflow has visible context available for human review.",
    reviewLabel: `Open ${module.label || "the workflow"} and review the existing records.`,
    blockedAutomation: "No record is created, updated, approved, sent, or converted automatically.",
    tone: "slate",
  };
}

export function deriveAgentNextBestActions(context = {}, { limit = 5 } = {}) {
  const workflowContext = context?.modules ? context : deriveAgentWorkflowContext(context);
  const visibleModules = asArray(workflowContext.modules).filter((module) => module.canView);
  const ranked = visibleModules
    .filter((module) => Number(module.needsAttention || 0) > 0 || Number(module.count || 0) > 0)
    .map((module) => {
      const rule = actionRuleFor(module);
      const needsAttention = Number(module.needsAttention || 0);
      const count = Number(module.count || 0);
      const score = rule.priority + Math.min(needsAttention * 4, 24) + Math.min(count, 8);
      return {
        id: `next-${module.id}`,
        moduleId: module.moduleId || module.id,
        actionLabel: module.nextActionLabel || `Open ${module.label}`,
        title: rule.title,
        reason: rule.reason,
        reviewLabel: rule.reviewLabel,
        blockedAutomation: rule.blockedAutomation,
        tone: rule.tone,
        score,
        sourceCount: count,
        needsAttention,
        supportingRecords: asArray(module.records).slice(0, 3),
        tradeSummary: module.tradeSummary || null,
      };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, Math.max(1, Number(limit) || 5));

  return {
    mode: "review_first_next_actions",
    generatedAt: new Date().toISOString(),
    summary: ranked.length
      ? `Ranked ${ranked.length} next action${ranked.length === 1 ? "" : "s"} from visible workflow context.`
      : "No visible workflow records are available for next action suggestions.",
    actions: ranked,
    safetyBoundary: "Suggestions only. No customer contact, send, approve, convert, schedule, invoice, payment, role, package, or field update is performed.",
  };
}

export function deriveAgentWorkflowDraftPrep(context = {}, { actionId = "" } = {}) {
  const nextActions = context?.actions && context?.mode === "review_first_next_actions"
    ? context
    : deriveAgentNextBestActions(context, { limit: 5 });
  const selected = asArray(nextActions.actions).find((action) => action.id === actionId)
    || asArray(nextActions.actions)[0]
    || null;

  if (!selected) {
    return {
      mode: "review_first_workflow_draft_prep",
      generatedAt: new Date().toISOString(),
      title: "No workflow draft packet available",
      summary: "No visible workflow records are available for a draft prep packet.",
      target: null,
      items: [],
      blockedActions: [
        "No record creation or update",
        "No customer contact",
        "No approval, conversion, scheduling, invoicing, payment, role, package, or field update",
      ],
      safetyBoundary: "Draft prep only. Nothing is saved or sent.",
    };
  }

  const supportLabels = asArray(selected.supportingRecords)
    .map((record) => text(record.label))
    .filter(Boolean);
  const tradeSummary = selected.tradeSummary || null;

  return {
    mode: "review_first_workflow_draft_prep",
    generatedAt: new Date().toISOString(),
    title: `${selected.title} draft packet`,
    summary: `Prepare review notes for ${selected.actionLabel}. This packet is for human review before opening the normal workflow.`,
    target: {
      id: selected.id,
      moduleId: selected.moduleId,
      actionLabel: selected.actionLabel,
      title: selected.title,
      tone: selected.tone,
    },
    items: [
      {
        id: "context",
        label: "Context to review",
        detail: selected.reason,
      },
      {
        id: "records",
        label: "Visible supporting records",
        detail: supportLabels.length ? supportLabels.join(", ") : "No specific supporting record was selected from the visible workflow context.",
      },
      {
        id: "human-step",
        label: "Human next step",
        detail: selected.reviewLabel,
      },
      tradeSummary ? {
        id: "trade-guidance",
        label: `${tradeSummary.primaryTradeLabel} guidance`,
        detail: [
          tradeSummary.lineItemStarters?.length ? `Estimate starters: ${tradeSummary.lineItemStarters.slice(0, 3).join(", ")}` : "",
          tradeSummary.proposalSections?.length ? `Proposal sections: ${tradeSummary.proposalSections.slice(0, 3).join(", ")}` : "",
          tradeSummary.fieldHandoffChecklist?.length ? `Handoff: ${tradeSummary.fieldHandoffChecklist.slice(0, 3).join(", ")}` : "",
          tradeSummary.proofPhotoChecklist?.length ? `Proof photos: ${tradeSummary.proofPhotoChecklist.slice(0, 3).join(", ")}` : "",
          tradeSummary.changeOrderWatchouts?.length ? `Watchouts: ${tradeSummary.changeOrderWatchouts.slice(0, 3).join(", ")}` : "",
        ].filter(Boolean).join(" | "),
      } : null,
      {
        id: "safe-output",
        label: "Safe assistant output",
        detail: "A review note packet only. Use the existing Apex HQ screen to inspect and decide.",
      },
    ].filter(Boolean),
    blockedActions: [
      selected.blockedAutomation,
      "No customer email, text, call, notification, bid submission, or proposal send",
      "No approval, conversion, scheduling, invoicing, payment, role, package, or field update",
    ],
    safetyBoundary: "Draft prep only. Nothing is saved, sent, approved, converted, scheduled, invoiced, or changed.",
  };
}

export function deriveAgentDailyOpsBrief(context = {}) {
  const workflowContext = context?.modules ? context : deriveAgentWorkflowContext(context);
  const nextActions = deriveAgentNextBestActions(workflowContext, { limit: 5 });
  const visibleModules = asArray(workflowContext.modules).filter((module) => module.canView);
  const attentionModules = visibleModules
    .filter((module) => Number(module.needsAttention || 0) > 0)
    .sort((left, right) => Number(right.needsAttention || 0) - Number(left.needsAttention || 0));
  const quietModules = visibleModules
    .filter((module) => Number(module.needsAttention || 0) <= 0)
    .slice(0, 4);

  return {
    mode: "review_first_daily_ops_brief",
    generatedAt: new Date().toISOString(),
    title: "Daily operations brief",
    summary: workflowContext.summary,
    metrics: [
      { label: "Visible workflow areas", value: visibleModules.length },
      { label: "Areas needing review", value: attentionModules.length },
      { label: "Review signals", value: workflowContext.attentionCount || 0 },
      { label: "Ranked next actions", value: nextActions.actions.length },
    ],
    sections: [
      {
        id: "needs-attention",
        label: "Needs attention",
        items: attentionModules.slice(0, 5).map((module) => ({
          id: module.id,
          label: module.label,
          detail: module.summary,
          moduleId: module.moduleId,
          actionLabel: module.nextActionLabel,
          count: module.needsAttention,
        })),
      },
      {
        id: "next-actions",
        label: "Recommended next actions",
        items: nextActions.actions.slice(0, 5).map((action) => ({
          id: action.id,
          label: action.title,
          detail: action.reason,
          moduleId: action.moduleId,
          actionLabel: action.actionLabel,
          count: action.needsAttention,
        })),
      },
      {
        id: "quiet-areas",
        label: "Visible areas without urgent pressure",
        items: quietModules.map((module) => ({
          id: module.id,
          label: module.label,
          detail: module.summary,
          moduleId: module.moduleId,
          actionLabel: module.nextActionLabel,
          count: module.count,
        })),
      },
    ],
    actions: nextActions.actions.map((action) => ({
      moduleId: action.moduleId,
      actionLabel: action.actionLabel,
      label: action.title,
    })).slice(0, 5),
    safetyBoundary: "Brief only. No records are saved, sent, approved, converted, scheduled, invoiced, billed, assigned, or updated.",
  };
}

export function deriveAgentWorkflowContext(context = {}) {
  const permissions = context.permissions || {};
  const companySettings = context.companySettings || context.settings || context.company || {};
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
      tradeSummary: summarizeTradeContext(leadFollowups.length ? leadFollowups : leads, companySettings),
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
      tradeSummary: summarizeTradeContext(draftEstimates.length ? draftEstimates : estimates, companySettings),
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
      tradeSummary: summarizeTradeContext(activeJobs.length ? activeJobs : jobs, companySettings),
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
      tradeSummary: summarizeTradeContext(proofNeedsReview, companySettings),
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

export function hasAgentNextBestActionsIntent(input = "") {
  return /\b(next best action|next best actions|what should (we|i) do next|what should (we|i) do now|where should (we|i) start|rank(ed)? actions|agent action queue)\b/.test(normalize(input));
}

export function hasAgentWorkflowDraftPrepIntent(input = "") {
  return /\b(prepare|build|draft|make)\b.*\b(next action|next best action|workflow packet|review packet|draft packet|action packet)\b/.test(normalize(input));
}

export function hasAgentDailyOpsBriefIntent(input = "") {
  return /\b(daily ops brief|daily operations brief|operations brief|morning brief|summarize today|today's brief|todays brief|operator brief)\b/.test(normalize(input));
}
