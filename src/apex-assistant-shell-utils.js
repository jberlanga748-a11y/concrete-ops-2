const ROUTE_COMMANDS = [
  {
    id: "reports",
    moduleId: "reports",
    actionLabel: "Open reports",
    keywords: ["report", "daily", "proof", "submitted", "review"],
    message: "Open Daily Reports and review the proof-of-work queue before closing the day.",
  },
  {
    id: "uploads",
    moduleId: "uploads",
    actionLabel: "Open uploads",
    keywords: ["upload", "photo", "picture", "evidence"],
    message: "Open Uploads / Photos to review or add proof-of-work evidence.",
  },
  {
    id: "jobs",
    moduleId: "jobs",
    actionLabel: "Open jobs",
    keywords: ["job", "crew", "assignment", "startup", "start date", "blocker"],
    message: "Open Jobs to review crew assignment, startup readiness, and active work.",
  },
  {
    id: "schedule",
    moduleId: "schedule",
    actionLabel: "Open schedule",
    keywords: ["schedule", "today", "tomorrow", "where"],
    message: "Open Schedule to see who is going where today and tomorrow.",
  },
  {
    id: "leads",
    moduleId: "leads",
    actionLabel: "Open leads",
    keywords: ["lead", "follow up", "follow-up", "customer call", "pipeline"],
    message: "Open Leads to review follow-ups, stale leads, and customer next steps.",
  },
  {
    id: "estimates",
    moduleId: "estimates",
    actionLabel: "Open estimates",
    keywords: ["estimate", "proposal", "gc packet", "packet", "rough notes"],
    message: "Open Estimates to create or review proposals, packets, and rough notes drafts.",
  },
  {
    id: "deliveryTickets",
    moduleId: "deliveryTickets",
    actionLabel: "Open tickets",
    keywords: ["ticket", "delivery", "concrete ticket", "material"],
    message: "Open Delivery Tickets to review material proof tied to the job and day.",
  },
  {
    id: "incidents",
    moduleId: "incidents",
    actionLabel: "Open safety",
    keywords: ["safety", "incident", "injury", "hazard"],
    message: "Open Safety / Incidents to review unresolved field risk before closeout.",
  },
  {
    id: "toolChecklist",
    moduleId: "toolChecklist",
    actionLabel: "Open tools",
    keywords: ["tool", "ppe", "toolbox", "checklist"],
    message: "Open Tool Checklist / PPE work to verify field accountability items.",
  },
  {
    id: "copilot",
    moduleId: "copilot",
    actionLabel: "Open Apex Assistant",
    keywords: ["assistant", "ai office", "copilot", "help me"],
    message: "Open Apex Assistant for review-only assistant tools and workspace guidance.",
  },
];

const DEFAULT_PROMPTS = [
  "What needs attention?",
  "Summarize missing proof",
  "Start estimate from rough notes",
  "Open reports needing review",
  "Show job blockers",
];

const BLOCKED_ACTIONS = [
  {
    pattern: /\b(send|email|text|sms|message|notify)\b/i,
    message: "I can help prepare the estimate or proposal, but I will not send customer messages automatically. Open Estimates and use manual send after review.",
  },
  {
    pattern: /\b(approve|mark approved|accept|sign)\b/i,
    message: "I will not approve estimates, proposals, change orders, or job actions automatically. Open the existing workflow and approve it yourself after review.",
  },
  {
    pattern: /\b(assign|schedule)\b.*\b(crew|foreman|employee|team)\b/i,
    message: "I will not assign crews automatically. Open Jobs or Schedule and confirm assignments manually.",
  },
  {
    pattern: /\b(order|buy|purchase)\b.*\b(material|concrete|supplies|rock|rebar)\b/i,
    message: "I will not order materials. I can help organize notes and calculations in a later reviewed phase.",
  },
  {
    pattern: /\b(publish|launch|run)\b.*\b(ad|campaign|website)\b/i,
    message: "I will not publish ads, campaigns, or websites automatically. Those actions require a separate review workflow.",
  },
];

export function deriveApexAssistantShellState({ permissions = {}, commandCenter = {} } = {}) {
  const canView = Boolean(permissions?.aiOffice?.canView || permissions?.jobs?.canManageAll || permissions?.leads?.canView);
  const watchtowerQueue = canView ? asArray(commandCenter.watchtowerQueue).slice(0, 4) : [];
  const watchtowerActions = canView ? asArray(commandCenter.watchtowerActions).slice(0, 4) : [];
  const stats = commandCenter.stats || {};
  const totalNeedsAttention = watchtowerQueue.length
    || Number(stats.fieldProofGaps || 0)
    + Number(stats.reviewQueueItems || 0)
    + Number(stats.moneyReadyItems || 0);

  return {
    canView,
    modeLabel: "Review-only",
    statusLabel: totalNeedsAttention > 0 ? `${totalNeedsAttention} need attention` : "Operations clear",
    summary: totalNeedsAttention > 0
      ? "I can point you to the work that needs review. I will not send messages, change records, or approve anything automatically."
      : "No major Watchtower items are blocking the office right now. I can still route you to existing workflows.",
    watchtowerQueue,
    watchtowerActions,
    prompts: DEFAULT_PROMPTS,
  };
}

export function resolveApexAssistantCommand(input = "", state = {}) {
  const text = normalizeText(input);
  const firstAction = asArray(state.watchtowerActions)[0] || asArray(state.watchtowerQueue)[0] || null;

  const blocked = resolveBlockedActionCommand(input);
  if (blocked) return blocked;

  if (!text || text === normalizeText(DEFAULT_PROMPTS[0])) {
    if (firstAction) {
      return {
        type: "watchtower",
        moduleId: firstAction.moduleId || "commandCenter",
        actionLabel: firstAction.actionLabel || "Open review",
        message: `${firstAction.title || "Start with Watchtower"}. ${firstAction.description || "Open the existing workflow and review before taking action."}`,
      };
    }
    return {
      type: "status",
      moduleId: "commandCenter",
      actionLabel: "Open Command Center",
      message: "Watchtower is clear. Open Command Center for the operating plan and next best actions.",
    };
  }

  const missingProofCommand = resolveAssistantMissingProofCommand(input, state.commandContext || {});
  if (missingProofCommand) return missingProofCommand;

  const estimateDraftCommand = resolveAssistantEstimateDraftCommand(input, state.commandContext || {});
  if (estimateDraftCommand) return estimateDraftCommand;

  const match = ROUTE_COMMANDS.find((command) => command.keywords.some((keyword) => text.includes(keyword)));
  if (match) {
    return {
      type: "route",
      moduleId: match.moduleId,
      actionLabel: match.actionLabel,
      message: match.message,
    };
  }

  return {
    type: "safe-fallback",
    moduleId: "commandCenter",
    actionLabel: "Open Command Center",
    message: "I can route you to Apex HQ workflows and summarize Watchtower items. I will not create, send, approve, or edit records automatically in this phase.",
  };
}

export function resolveAssistantMissingProofCommand(input = "", context = {}) {
  const rawText = String(input || "").trim();
  const text = normalizeText(rawText);
  if (!hasMissingProofIntent(text)) return null;

  const permissions = context.permissions || {};
  if (!canUseMissingProofSummary(permissions)) {
    return {
      type: "blocked-command",
      moduleId: "commandCenter",
      actionLabel: "Open Command Center",
      message: "Missing proof summaries are office review tools. Field users stay limited to assigned job workflows, uploads, reports, tickets, and checklists.",
    };
  }

  const commandCenter = context.commandCenter || {};
  const jobs = collectProofJobs(context, commandCenter);
  if (!jobs.length) {
    return {
      type: "missing-proof-summary",
      moduleId: "jobs",
      actionLabel: "Open jobs",
      message: "I do not see any active jobs in the visible workspace to summarize right now.",
      job: null,
      items: [],
      actions: [{ moduleId: "jobs", actionLabel: "Open jobs" }],
    };
  }

  const targetQuery = extractMissingProofTargetQuery(rawText);
  const targetJob = findProofTargetJob(jobs, targetQuery) || chooseMostActionableProofJob(jobs, commandCenter);
  const items = deriveMissingProofItemsForJob(targetJob, commandCenter);
  const clear = items.every((item) => item.status === "complete");
  const jobName = jobTitle(targetJob);
  const issueCount = items.filter((item) => item.status === "missing" || item.status === "needs-review").length;
  const actions = dedupeProofActions(items
    .filter((item) => item.status !== "complete")
    .map((item) => ({ moduleId: item.moduleId, actionLabel: item.actionLabel })));

  return {
    type: "missing-proof-summary",
    moduleId: actions[0]?.moduleId || "jobs",
    actionLabel: actions[0]?.actionLabel || "Open job",
    message: clear
      ? `${jobName} does not show missing proof in the current Watchtower data. Review the job if you need deeper detail.`
      : `${jobName} has ${issueCount} proof item${issueCount === 1 ? "" : "s"} needing attention. Open the existing workflows below to fix them.`,
    job: {
      id: targetJob?.id || "",
      title: jobName,
    },
    items,
    actions: actions.length ? actions : [{ moduleId: "jobs", actionLabel: "Open job" }],
  };
}

export function resolveAssistantEstimateDraftCommand(input = "", context = {}) {
  const rawText = String(input || "").trim();
  const text = normalizeText(rawText);
  if (!hasEstimateDraftIntent(text)) return null;

  const permissions = context.permissions || {};
  if (!permissions?.estimates?.canManage) {
    return {
      type: "blocked-command",
      moduleId: "commandCenter",
      actionLabel: "Open Command Center",
      message: "Estimate draft commands require an office or estimator role with estimate access. Field roles stay blocked from leads, pricing, and proposals.",
    };
  }

  const roughNotes = extractRoughNotesFromCommand(rawText);
  const hasRoughNotes = Boolean(normalizeText(roughNotes));
  if (hasRoughNotes && !permissions?.estimates?.canUseAiRoughNotes) {
    return {
      type: "package-blocked",
      moduleId: "estimates",
      actionLabel: "Open Estimates",
      message: "Assistant rough-note estimate drafts require the Premium AI Rough Notes feature. You can still open Estimates and create a basic draft manually.",
    };
  }

  const query = extractEstimateTargetQuery(rawText);
  const matches = findAssistantEstimateMatches(query, context);
  const customerName = query || extractCustomerNameFromNotes(roughNotes);
  const fallback = {
    id: "assistant-new-draft",
    type: "new",
    label: customerName ? `New draft for ${customerName}` : "New estimate draft",
    helper: hasRoughNotes ? "No exact lead/customer match found. Start a clean draft from the rough notes." : "Start a clean estimate draft.",
    customerName,
    roughNotes,
  };

  return {
    type: "estimate-draft-review",
    moduleId: "estimates",
    actionLabel: matches.length === 1 ? "Review draft in Estimates" : matches.length > 1 ? "Choose record" : "Start new draft",
    message: matches.length === 1
      ? `I found ${matches[0].label}. Review before creating a Draft estimate.`
      : matches.length > 1
        ? "I found multiple possible lead/customer matches. Choose the right one before opening Estimates."
        : "I did not find an exact lead or customer match. You can still start a clean Draft estimate from the rough notes.",
    commandText: rawText,
    query,
    roughNotes,
    matches,
    fallback,
  };
}

function resolveBlockedActionCommand(input = "") {
  const rawText = String(input || "").trim();
  if (!rawText) return null;
  const blocked = BLOCKED_ACTIONS.find((item) => item.pattern.test(rawText));
  if (!blocked) return null;
  return {
    type: "blocked-command",
    moduleId: "commandCenter",
    actionLabel: "Open Command Center",
    message: blocked.message,
  };
}

function hasEstimateDraftIntent(text = "") {
  return /\b(start|create|build|make|draft|prepare|open)\b/.test(text)
    && /\b(estimate|proposal|quote|bid|gc packet)\b/.test(text);
}

function hasMissingProofIntent(text = "") {
  const mentionsProof = /\b(proof|evidence|documentation|documented|closeout)\b/.test(text);
  const asksForSummary = /\b(missing|needed|need|summarize|summary|show|what|review)\b/.test(text);
  const mentionsFieldRecord = /\b(photo|photos|report|reports|ticket|tickets|checklist|checklists)\b/.test(text);
  return (mentionsProof && asksForSummary) || (/\b(missing|needed|need)\b/.test(text) && mentionsFieldRecord);
}

function canUseMissingProofSummary(permissions = {}) {
  return Boolean(
    permissions?.jobs?.canManageAll
    || permissions?.reports?.canManageAll
    || permissions?.reports?.canReview
    || permissions?.uploads?.canManageAll
    || permissions?.deliveryTickets?.canManageAll
    || permissions?.safety?.canReviewIncidents
    || permissions?.toolChecklist?.canReview
    || permissions?.aiOffice?.canView,
  );
}

function collectProofJobs(context = {}, commandCenter = {}) {
  const jobs = []
    .concat(asArray(context.jobs))
    .concat(asArray(commandCenter.jobsNeedingStartupReview))
    .concat(asArray(commandCenter.jobsReadyForField))
    .concat(asArray(commandCenter.jobsMissingCrewOrStartDate))
    .concat(asArray(commandCenter.dailyReports?.activeJobsMissingTodayReport))
    .concat(asArray(commandCenter.uploads?.jobsMissingPhotos));
  return dedupeById(jobs.filter((job) => job?.id));
}

function extractMissingProofTargetQuery(input = "") {
  const rawText = String(input || "").trim();
  const forMatch = rawText.match(/\b(?:for|on|at)\s+(.+?)(?:\s+\b(?:job|project|today|please|now)\b|$)/i);
  if (forMatch?.[1]) return cleanTargetQuery(forMatch[1]);
  return "";
}

function findProofTargetJob(jobs = [], query = "") {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return null;
  const words = normalizedQuery.split(" ").filter((word) => word.length > 1);
  return jobs.find((job) => targetMatchesWords(normalizeText([
    jobTitle(job),
    job.customer,
    job.customerName,
    job.address,
    job.location,
    job.city,
    job.status,
  ].filter(Boolean).join(" ")), words)) || null;
}

function chooseMostActionableProofJob(jobs = [], commandCenter = {}) {
  return jobs
    .map((job) => ({ job, issueCount: deriveMissingProofItemsForJob(job, commandCenter).filter((item) => item.status !== "complete").length }))
    .sort((left, right) => right.issueCount - left.issueCount || jobTitle(left.job).localeCompare(jobTitle(right.job)))[0]?.job || jobs[0] || null;
}

function deriveMissingProofItemsForJob(job = {}, commandCenter = {}) {
  const jobId = job?.id || "";
  const missingReport = asArray(commandCenter.dailyReports?.activeJobsMissingTodayReport).some((record) => record?.id === jobId);
  const reportNeedsReview = asArray(commandCenter.dailyReports?.dailyReportsNeedingReview).some((record) => recordJobId(record) === jobId);
  const missingPhotos = asArray(commandCenter.uploads?.jobsMissingPhotos).some((record) => record?.id === jobId);
  const pendingTickets = asArray(commandCenter.fieldRecords?.pendingDeliveryTickets).filter((record) => recordJobId(record) === jobId);
  const pendingPrePour = asArray(commandCenter.fieldRecords?.pendingPrePour).filter((record) => recordJobId(record) === jobId);
  const pendingPostPour = asArray(commandCenter.fieldRecords?.pendingPostPour).filter((record) => recordJobId(record) === jobId);
  const openSafety = asArray(commandCenter.fieldRecords?.openSafetyIncidents).filter((record) => recordJobId(record) === jobId);
  const openTools = asArray(commandCenter.fieldRecords?.openToolChecklists).filter((record) => recordJobId(record) === jobId);

  return [
    {
      id: "daily-report",
      label: "Daily report",
      status: missingReport ? "missing" : reportNeedsReview ? "needs-review" : "complete",
      detail: missingReport ? "Today's daily report is missing." : reportNeedsReview ? "A submitted report needs office review." : "No missing report is showing for this job.",
      moduleId: "reports",
      actionLabel: missingReport ? "Open reports" : "Review report",
    },
    {
      id: "photo-proof",
      label: "Photo proof",
      status: missingPhotos ? "missing" : "complete",
      detail: missingPhotos ? "No photo evidence is attached to this active job." : "Photo evidence is present in the current workspace data.",
      moduleId: "uploads",
      actionLabel: "Open uploads",
    },
    {
      id: "delivery-tickets",
      label: "Delivery tickets",
      status: pendingTickets.length ? "needs-review" : "complete",
      detail: pendingTickets.length ? `${pendingTickets.length} delivery ticket${pendingTickets.length === 1 ? "" : "s"} pending review or completion.` : "No pending delivery tickets are showing for this job.",
      moduleId: "deliveryTickets",
      actionLabel: "Open tickets",
    },
    {
      id: "pre-pour",
      label: "Pre-pour",
      status: pendingPrePour.length ? "needs-review" : "complete",
      detail: pendingPrePour.length ? `${pendingPrePour.length} pre-pour checklist${pendingPrePour.length === 1 ? "" : "s"} incomplete.` : "No open pre-pour checklist is showing for this job.",
      moduleId: "prePour",
      actionLabel: "Open pre-pour",
    },
    {
      id: "post-pour",
      label: "Post-pour",
      status: pendingPostPour.length ? "needs-review" : "complete",
      detail: pendingPostPour.length ? `${pendingPostPour.length} post-pour checklist${pendingPostPour.length === 1 ? "" : "s"} incomplete.` : "No open post-pour checklist is showing for this job.",
      moduleId: "postPour",
      actionLabel: "Open post-pour",
    },
    {
      id: "safety",
      label: "Safety",
      status: openSafety.length ? "needs-review" : "complete",
      detail: openSafety.length ? `${openSafety.length} safety item${openSafety.length === 1 ? "" : "s"} unresolved.` : "No unresolved safety items are showing for this job.",
      moduleId: "incidents",
      actionLabel: "Open safety",
    },
    {
      id: "tools",
      label: "Tools",
      status: openTools.length ? "needs-review" : "complete",
      detail: openTools.length ? `${openTools.length} tool checklist item${openTools.length === 1 ? "" : "s"} need attention.` : "No open tool checklist issues are showing for this job.",
      moduleId: "toolChecklist",
      actionLabel: "Open tools",
    },
  ];
}

function recordJobId(record = {}) {
  return record.jobId || record.linkedJobId || record.job?.id || "";
}

function jobTitle(job = {}) {
  return job.title || job.name || job.projectName || job.customer || job.customerName || job.address || job.id || "Job";
}

function dedupeProofActions(actions = []) {
  return dedupeById(actions.filter((action) => action?.moduleId).map((action) => ({
    id: action.moduleId,
    moduleId: action.moduleId,
    actionLabel: action.actionLabel || "Open workflow",
  })));
}

function extractRoughNotesFromCommand(input = "") {
  const rawText = String(input || "").trim();
  const markerMatch = rawText.match(/\b(?:rough\s+notes?|notes?|scope|details?)\s*:\s*([\s\S]+)$/i);
  if (markerMatch?.[1]) return markerMatch[1].trim();

  const withMatch = rawText.match(/\bwith\s+(?:these\s+)?(?:rough\s+)?notes?\s+([\s\S]+)$/i);
  if (withMatch?.[1]) return withMatch[1].trim();

  const forMatch = rawText.match(/\b(?:estimate|proposal|quote|bid)\b[\s\S]*?\b(?:for|from)\b[\s\S]*?\b(?:to|and)\b\s+([\s\S]+)$/i);
  if (forMatch?.[1] && roughNoteLooksLikeScope(forMatch[1])) return forMatch[1].trim();

  return "";
}

function roughNoteLooksLikeScope(value = "") {
  return /\b(demo|pour|prep|install|remove|finish|exclude|include|sf|lf|cy|slab|sidewalk|driveway|base|cleanup)\b/i.test(String(value || ""));
}

function extractEstimateTargetQuery(input = "") {
  const rawText = String(input || "").trim();
  const beforeAction = rawText.split(/\b(?:and\s+)?(?:start|create|build|make|draft|prepare)\b.*\b(?:estimate|proposal|quote|bid|gc packet)\b/i)[0] || "";
  const cleanedBeforeAction = cleanTargetQuery(beforeAction.replace(/\b(open|pull up|find|lead|customer|company|for|from|this|the)\b/gi, " "));
  if (cleanedBeforeAction) return cleanedBeforeAction;

  const forMatch = rawText.match(/\b(?:estimate|proposal|quote|bid|gc packet)\b\s+(?:for|from)\s+(.+?)(?:\s+\b(?:with|using|rough notes?|notes?|scope|details?)\b|$)/i);
  if (forMatch?.[1]) return cleanTargetQuery(forMatch[1]);

  return "";
}

function cleanTargetQuery(value = "") {
  return String(value || "")
    .replace(/[:.,;]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function findAssistantEstimateMatches(query = "", context = {}) {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return [];
  const words = normalizedQuery.split(" ").filter((word) => word.length > 1);
  if (words.length === 0) return [];

  const leads = asArray(context.leads).filter((lead) => !lead?.archivedAt);
  const customers = asArray(context.customers).filter((customer) => !customer?.archivedAt);
  const matches = [];

  leads.forEach((lead) => {
    const haystack = normalizeText([
      lead.customer,
      lead.project,
      lead.city,
      lead.status,
      lead.source,
      lead.notes,
    ].filter(Boolean).join(" "));
    if (targetMatchesWords(haystack, words)) {
      matches.push({
        id: `lead:${lead.id}`,
        type: "lead",
        leadId: lead.id,
        customerId: lead.customerId || "",
        customerName: lead.customer || "",
        projectName: lead.project || "",
        customerEmail: lead.customerEmail || lead.email || lead.contactEmail || "",
        label: [lead.customer || "Lead", lead.project].filter(Boolean).join(" - "),
        helper: [lead.city, lead.status, lead.source].filter(Boolean).join(" - "),
      });
    }
  });

  customers.forEach((customer) => {
    const haystack = normalizeText([
      customer.name,
      customer.company,
      customer.city,
      customer.serviceArea,
      customer.email,
      customer.phone,
    ].filter(Boolean).join(" "));
    if (targetMatchesWords(haystack, words)) {
      matches.push({
        id: `customer:${customer.id}`,
        type: "customer",
        customerId: customer.id,
        customerName: customer.name || customer.company || "",
        customerEmail: customer.email || "",
        label: customer.name || customer.company || "Customer",
        helper: [customer.city, customer.status, customer.email].filter(Boolean).join(" - "),
      });
    }
  });

  return dedupeAssistantMatches(matches).slice(0, 4);
}

function targetMatchesWords(haystack = "", words = []) {
  if (!haystack) return false;
  return words.every((word) => haystack.includes(word));
}

function dedupeAssistantMatches(matches = []) {
  const seen = new Set();
  return matches.filter((match) => {
    const key = [match.type, match.leadId || "", match.customerId || "", normalizeText(match.label)].join(":");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function extractCustomerNameFromNotes(roughNotes = "") {
  const customerMatch = String(roughNotes || "").match(/\b(?:customer|company|client)\s*:\s*([^\n,;.]+)/i);
  return cleanTargetQuery(customerMatch?.[1] || "");
}

function dedupeById(records = []) {
  const seen = new Set();
  return records.filter((record) => {
    const key = record?.id || "";
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeText(value = "") {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}
