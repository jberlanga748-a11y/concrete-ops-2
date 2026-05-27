import { agentAutomationCapabilityEnabled } from "../shared/apexAgentAutomationPolicy.js";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function text(value, fallback = "") {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
}

function normalize(value = "") {
  return text(value).toLowerCase().replace(/[_-]/g, " ").replace(/\s+/g, " ");
}

function active(records = []) {
  return asArray(records).filter((record) => !record?.archivedAt);
}

function fieldOnlyPermissions(permissions = {}) {
  return Boolean(
    permissions?.jobs?.canManageField
    && !permissions?.jobs?.canManageAll
    && !permissions?.leads?.canView
    && !permissions?.aiOffice?.canView
    && !permissions?.opportunityScout?.canView,
  );
}

function customerName(record = {}) {
  return text(record.customer?.name, text(record.customerName, text(record.customer, text(record.name, "Customer"))));
}

function estimateTitle(estimate = {}) {
  return text(estimate.title, text(estimate.project, text(estimate.projectName, "Proposal")));
}

function jobTitle(job = {}) {
  return text(job.title, text(job.name, text(job.projectName, "Project")));
}

function sameCustomer(left = {}, right = {}) {
  const leftId = text(left.customerId || left.customer?.id);
  const rightId = text(right.customerId || right.customer?.id);
  if (leftId && rightId && leftId === rightId) return true;
  const leftName = customerName(left).toLowerCase();
  const rightName = customerName(right).toLowerCase();
  return leftName !== "customer" && rightName !== "customer" && leftName === rightName;
}

function choosePrimaryEstimate(estimates = []) {
  const visible = active(estimates);
  return visible.find((estimate) => normalize(estimate.status) === "approved")
    || visible.find((estimate) => ["sent", "draft"].includes(normalize(estimate.status)))
    || visible[0]
    || null;
}

function findRelatedJob(estimate = null, jobs = []) {
  const visibleJobs = active(jobs);
  if (!estimate) return visibleJobs[0] || null;
  if (estimate.jobId) {
    const linked = visibleJobs.find((job) => job.id === estimate.jobId);
    if (linked) return linked;
  }
  return visibleJobs.find((job) => sameCustomer(estimate, job)) || visibleJobs[0] || null;
}

function relatedToJob(record = {}, job = {}) {
  return Boolean(job?.id && (record.jobId === job.id || record.job?.id === job.id));
}

function estimateScope(estimate = {}) {
  return text(
    estimate.scopeSummary,
    text(estimate.scope, text(estimate.description, text(estimate.notes, "Approved scope is not ready to quote back without office review."))),
  );
}

function publicJobStatus(job = {}) {
  const status = normalize(job.status || job.stage || "pending");
  const labels = {
    draft: "draft",
    planned: "planned",
    scheduled: "scheduled",
    in_progress: "in progress",
    "in progress": "in progress",
    "field complete": "field complete",
    completed: "completed",
    "billing ready": "billing ready",
    closed: "closed",
  };
  return labels[status] || text(job.status || job.stage, "pending");
}

function scheduleSummary(job = {}) {
  return text(job.scheduledStart || job.startDate || job.startAt || job.scheduleDate, "the office has not confirmed a customer-facing schedule yet");
}

function buildContext({
  companySettings = {},
  customers = [],
  leads = [],
  jobs = [],
  estimates = [],
  uploads = [],
  dailyReports = [],
  changeOrderRequests = [],
} = {}) {
  const primaryEstimate = choosePrimaryEstimate(estimates);
  const relatedJob = findRelatedJob(primaryEstimate, jobs);
  const fallbackCustomer = active(customers)[0] || active(leads)[0] || {};
  const contextCustomer = primaryEstimate || relatedJob || fallbackCustomer;
  const proofPhotos = relatedJob ? active(uploads).filter((upload) => relatedToJob(upload, relatedJob)) : [];
  const progressReports = relatedJob ? active(dailyReports).filter((report) => relatedToJob(report, relatedJob)) : [];
  const reviewedChangeOrders = relatedJob
    ? active(changeOrderRequests).filter((request) => relatedToJob(request, relatedJob) && ["approved", "closed", "completed"].includes(normalize(request.status)))
    : [];

  return {
    workspaceName: text(companySettings.companyName, "this contractor"),
    companyContact: text(companySettings.businessEmail || companySettings.businessPhone, "the office"),
    customerName: customerName(contextCustomer),
    estimateId: text(primaryEstimate?.id),
    estimateTitle: primaryEstimate ? estimateTitle(primaryEstimate) : "proposal pending",
    estimateStatus: normalize(primaryEstimate?.status || "pending") || "pending",
    scopeSummary: primaryEstimate ? estimateScope(primaryEstimate) : "scope is pending office review",
    jobId: text(relatedJob?.id),
    jobTitle: relatedJob ? jobTitle(relatedJob) : "project pending",
    jobStatus: relatedJob ? publicJobStatus(relatedJob) : "pending",
    scheduleSummary: relatedJob ? scheduleSummary(relatedJob) : "the office has not confirmed a customer-facing schedule yet",
    nextStep: text(relatedJob?.nextStep || relatedJob?.next, primaryEstimate ? "the office should review the proposal before promising the next step" : "the office should confirm the next step"),
    proofPhotoCount: proofPhotos.length,
    progressReportCount: progressReports.length,
    reviewedChangeOrderCount: reviewedChangeOrders.length,
  };
}

export function deriveApexAgentCustomerConversationPreview({
  permissions = {},
  companySettings = {},
  customers = [],
  leads = [],
  jobs = [],
  estimates = [],
  uploads = [],
  dailyReports = [],
  changeOrderRequests = [],
} = {}) {
  const canView = Boolean(permissions?.aiOffice?.canView && !fieldOnlyPermissions(permissions));
  const policyAllowsPreview = agentAutomationCapabilityEnabled(companySettings?.apexAgentAutomationPolicy, "customerConversationPreview");
  const context = buildContext({ companySettings, customers, leads, jobs, estimates, uploads, dailyReports, changeOrderRequests });
  if (!canView || !policyAllowsPreview) {
    return {
      canView: false,
      mode: "blocked",
      modeLabel: !policyAllowsPreview ? "Off by policy" : "Locked",
      headline: "Apex Agent customer conversation preview",
      context,
      summary: !policyAllowsPreview
        ? "Customer conversation preview is paused by this contractor's Apex Agent automation policy."
        : "Customer conversation preview is locked for this role or package.",
      starterPrompts: [],
      boundaries: customerConversationBoundaries(),
      blockedActions: customerConversationBlockedActions(),
    };
  }

  return {
    canView: true,
    mode: "internal_customer_conversation_preview",
    modeLabel: "Internal preview",
    headline: "Apex Agent customer conversation preview",
    context,
    summary: `Apex Agent can simulate a customer conversation for ${context.customerName} using approved workspace context. Nothing is sent outside Apex HQ.`,
    starterPrompts: [
      "Can I get an update on my project?",
      "When is the crew coming?",
      "Can you add more work to the scope?",
      "Can I approve the estimate here?",
      "Do you have proof photos?",
    ],
    boundaries: customerConversationBoundaries(),
    blockedActions: customerConversationBlockedActions(),
  };
}

export function customerConversationBoundaries() {
  return [
    "Internal owner/admin preview only.",
    "Apex Agent must identify itself as an AI assistant, not a human employee.",
    "No customer message, SMS, email, call, portal login, share link, approval, invoice, payment, schedule change, crew assignment, or scope change is created.",
    "Price, schedule, scope, payment, legal, complaint, and approval requests become owner/admin review cards.",
  ];
}

function classifyCustomerIntent(input = "") {
  const normalized = normalize(input);
  if (/\b(price|cost|discount|cheaper|refund|payment|pay|invoice|bill|billing|deposit|card|financing)\b/.test(normalized)) return "money";
  if (/\b(when|schedule|date|time|arrival|arrive|crew|start|tomorrow|today|delay)\b/.test(normalized)) return "schedule";
  if (/\b(add|change|extra|upgrade|scope|remove|different|change order|more work)\b/.test(normalized)) return "scope_change";
  if (/\b(approve|approved|accept|sign|go ahead|authorize)\b/.test(normalized)) return "approval";
  if (/\b(photo|photos|proof|picture|progress|update|done|completed|status)\b/.test(normalized)) return "progress";
  if (/\b(problem|complaint|upset|angry|damage|broken|wrong|issue|unsafe|injury)\b/.test(normalized)) return "support_risk";
  return "general";
}

function replyForIntent(intent, context = {}) {
  if (intent === "money") {
    return {
      message: `I can help gather the proposal and billing context for ${context.estimateTitle}, but pricing, discounts, invoices, and payments need the office to confirm. I can flag this for ${context.workspaceName} to review.`,
      tone: "amber",
      needsHumanReview: true,
      reviewReason: "Customer asked about price, billing, payment, or discount.",
    };
  }
  if (intent === "schedule") {
    return {
      message: `The current project schedule note I can see is: ${context.scheduleSummary}. I do not want to overpromise crew timing, so I would have the office confirm before treating that as final.`,
      tone: "amber",
      needsHumanReview: true,
      reviewReason: "Customer asked for schedule or crew timing confirmation.",
    };
  }
  if (intent === "scope_change") {
    return {
      message: `I can note the requested scope change for ${context.jobTitle}. The approved scope I can see is: ${context.scopeSummary}. The office should review the change before price, schedule, or crew plans are updated.`,
      tone: "amber",
      needsHumanReview: true,
      reviewReason: "Customer requested a scope change or extra work.",
    };
  }
  if (intent === "approval") {
    return {
      message: `I can record that the customer wants to move forward for office review, but I cannot accept, sign, or approve ${context.estimateTitle} in this conversation preview. The office must use the normal Apex HQ approval workflow.`,
      tone: "red",
      needsHumanReview: true,
      reviewReason: "Customer attempted approval or authorization through the agent.",
    };
  }
  if (intent === "progress") {
    return {
      message: `${context.jobTitle} is currently marked ${context.jobStatus}. I can see ${context.proofPhotoCount} proof photo record(s), ${context.progressReportCount} progress update(s), and ${context.reviewedChangeOrderCount} reviewed change order(s) available for office curation before anything customer-facing is sent.`,
      tone: "blue",
      needsHumanReview: false,
      reviewReason: "",
    };
  }
  if (intent === "support_risk") {
    return {
      message: `I am sorry this needs attention. I can flag this for the office with the project context I can see, but a person at ${context.workspaceName} should review it before any promise, repair plan, safety response, or customer follow-up is made.`,
      tone: "red",
      needsHumanReview: true,
      reviewReason: "Customer raised complaint, damage, safety, or support risk.",
    };
  }
  return {
    message: `I am Apex Agent, the AI assistant for ${context.workspaceName}. I can help with project status, proposal context, proof updates, and next-step questions. Anything involving price, schedule, scope, approval, payment, or a commitment goes to the office for review.`,
    tone: "blue",
    needsHumanReview: false,
    reviewReason: "",
  };
}

export function resolveApexAgentCustomerConversationMessage(input = "", preview = {}) {
  const prompt = text(input);
  const context = preview.context || {};
  if (!preview.canView) {
    return {
      id: `agent-${Date.now()}-blocked`,
      role: "agent",
      author: "Apex Agent",
      tone: "red",
      message: "Customer conversation preview is not available for this role or package.",
      intent: "blocked",
      needsHumanReview: false,
      reviewCard: null,
      blockedActions: customerConversationBlockedActions(),
      contextChips: [],
    };
  }
  if (!prompt) {
    return {
      id: `agent-${Date.now()}-empty`,
      role: "agent",
      author: "Apex Agent",
      tone: "slate",
      message: "Ask a customer-style question to preview how Apex Agent would respond.",
      intent: "empty",
      needsHumanReview: false,
      reviewCard: null,
      blockedActions: customerConversationBlockedActions(),
      contextChips: [],
    };
  }

  const intent = classifyCustomerIntent(prompt);
  const reply = replyForIntent(intent, context);
  return {
    id: `agent-${Date.now()}-${intent}`,
    role: "agent",
    author: "Apex Agent",
    tone: reply.tone,
    message: reply.message,
    intent,
    needsHumanReview: reply.needsHumanReview,
    reviewCard: reply.needsHumanReview ? {
      title: "Owner review needed",
      reason: reply.reviewReason,
      customer: context.customerName,
      project: context.jobTitle || context.estimateTitle,
      safeNextStep: "Review the transcript, open the normal Apex HQ workflow, and respond manually.",
    } : null,
    blockedActions: customerConversationBlockedActions(),
    contextChips: [
      context.customerName ? `Customer: ${context.customerName}` : "",
      context.jobTitle ? `Project: ${context.jobTitle}` : "",
      context.estimateStatus ? `Estimate: ${context.estimateStatus}` : "",
    ].filter(Boolean),
  };
}

export function customerConversationBlockedActions() {
  return [
    "No pretending to be a human employee",
    "No customer send, SMS, email, call, or notification",
    "No price, discount, schedule, scope, approval, invoice, payment, or legal commitment",
    "No job status, crew assignment, field visibility, package, role, or billing change",
  ];
}
