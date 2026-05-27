import { redactAgentConversationText } from "./agentConversations.js";
import {
  deriveAgentDailyOpsBrief,
  deriveAgentNextBestActions,
  deriveAgentWorkflowContext,
} from "./agentWorkflowContext.js";

export const CONTRACTOR_ADVISOR_DEFAULT_MODEL = "gpt-4o-mini";
export const CONTRACTOR_ADVISOR_OPENAI_URL = "https://api.openai.com/v1/chat/completions";

const TEXT_LIMIT = 3600;
const SHORT_TEXT_LIMIT = 500;
const LIST_LIMIT = 8;

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function text(value = "", limit = TEXT_LIMIT) {
  return redactAgentConversationText(String(value ?? ""), { maxLength: limit });
}

function normalize(value = "") {
  return text(value, SHORT_TEXT_LIMIT).toLowerCase().replace(/\s+/g, " ");
}

function numberValue(value = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function amountValue(record = {}) {
  return numberValue(
    record.total
      ?? record.totalAmount
      ?? record.amount
      ?? record.estimateTotal
      ?? record.price
      ?? record.value
      ?? (numberValue(record.totalCents) / 100),
  );
}

function statusOf(record = {}) {
  return normalize(record.status || record.stage || record.reviewStatus || record.state || "");
}

function activeRecord(record = {}) {
  return !record?.archivedAt && !record?.deletedAt;
}

function titleOf(record = {}, fallback = "Record") {
  return text(record.title || record.name || record.project || record.customer || record.customerName || record.jobName || record.label || record.id || fallback, 180);
}

function countBy(records = [], pick = () => "") {
  const counts = new Map();
  asArray(records).forEach((record) => {
    const key = text(pick(record) || "Unknown", 80);
    if (!key) return;
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label))
    .slice(0, LIST_LIMIT);
}

function topRecords(records = [], fallback = "Record") {
  return asArray(records)
    .filter(activeRecord)
    .slice(0, 5)
    .map((record) => ({
      id: text(record.id || titleOf(record, fallback), 80),
      label: titleOf(record, fallback),
      status: text(record.status || record.stage || record.reviewStatus || "Review", 80),
    }));
}

function classifyQuestion(question = "") {
  const normalized = normalize(question);
  if (/\b(marketing|market|advertis|ads?|website|seo|lead source|lead gen|more work|more leads|referral|reviews?)\b/.test(normalized)) return "marketing";
  if (/\b(losing money|lose money|profit|margin|leak|waste|cost|unbilled|billing|cash|expense|overrun|change order)\b/.test(normalized)) return "profit_leak";
  if (/\b(estimate|proposal|bid|price|pricing|quote)\b/.test(normalized)) return "estimates";
  if (/\b(follow up|follow-up|lead|close rate|pipeline)\b/.test(normalized)) return "pipeline";
  if (/\b(crew|schedule|dispatch|job|field|production|operations)\b/.test(normalized)) return "operations";
  return "general";
}

function summarizeWorkspace(workspace = {}) {
  const leads = asArray(workspace.leads).filter(activeRecord);
  const leadSources = asArray(workspace.leadSources).filter(activeRecord);
  const estimates = asArray(workspace.estimates).filter(activeRecord);
  const jobs = asArray(workspace.jobs).filter(activeRecord);
  const reports = asArray(workspace.dailyReports).filter(activeRecord);
  const uploads = asArray(workspace.uploads).filter(activeRecord);
  const timeEntries = asArray(workspace.timeEntries).filter(activeRecord);
  const changeOrders = asArray(workspace.changeOrderRequests).filter(activeRecord);
  const deliveryTickets = asArray(workspace.deliveryTickets).filter(activeRecord);
  const prePour = asArray(workspace.prePourChecklists).filter(activeRecord);
  const postPour = asArray(workspace.postPourChecklists).filter(activeRecord);

  const staleLeadStatuses = new Set(["new", "open", "contacted", "qualified", "follow_up", "follow-up"]);
  const openLeads = leads.filter((lead) => {
    const status = statusOf(lead);
    return !["won", "lost", "converted", "rejected", "archived"].includes(status);
  });
  const staleLeads = openLeads.filter((lead) => staleLeadStatuses.has(statusOf(lead)) || lead.followUpDueAt || lead.nextFollowUpDate);
  const draftEstimates = estimates.filter((estimate) => ["draft", "needs_review", "review"].includes(statusOf(estimate)));
  const sentEstimates = estimates.filter((estimate) => ["sent", "submitted", "pending"].includes(statusOf(estimate)));
  const approvedEstimates = estimates.filter((estimate) => ["approved", "accepted", "won"].includes(statusOf(estimate)));
  const activeJobs = jobs.filter((job) => ["in_progress", "active", "started"].includes(statusOf(job)));
  const scheduledJobs = jobs.filter((job) => ["scheduled", "ready", "planned"].includes(statusOf(job)));
  const pendingReports = reports.filter((report) => ["submitted", "needs_review", "pending"].includes(statusOf(report)));
  const activeClocks = timeEntries.filter((entry) => !entry.clockOutAt && ["active", "clocked_in", "in_progress", ""].includes(statusOf(entry)));
  const pendingChangeOrders = changeOrders.filter((request) => !["approved", "rejected", "closed", "billed"].includes(statusOf(request)));
  const pendingTickets = deliveryTickets.filter((ticket) => ["submitted", "pending", "needs_review", ""].includes(statusOf(ticket)));
  const pendingChecklists = [...prePour, ...postPour].filter((checklist) => ["submitted", "pending", "needs_review", ""].includes(statusOf(checklist)));

  return {
    company: {
      name: text(workspace.companySettings?.companyName || workspace.currentCompany?.name || "Company", 160),
      packageId: text(workspace.companyPackage?.id || workspace.currentCompany?.packageId || "", 80),
      serviceArea: text(workspace.companySettings?.serviceArea || "", 180),
      primaryTrade: text(workspace.companySettings?.primaryTrade || workspace.companySettings?.trade || "", 120),
    },
    user: {
      id: text(workspace.user?.id || "", 80),
      role: text(workspace.user?.role || "", 80),
      name: text(workspace.user?.name || "", 120),
    },
    leads: {
      total: leads.length,
      open: openLeads.length,
      staleFollowUps: staleLeads.length,
      byStatus: countBy(leads, (lead) => lead.status || "Open"),
      bySource: countBy(leads, (lead) => lead.source || lead.leadSource || "Unknown"),
      visibleSources: topRecords(leadSources, "Lead source"),
      examples: topRecords(openLeads, "Lead"),
    },
    estimates: {
      total: estimates.length,
      draft: draftEstimates.length,
      sent: sentEstimates.length,
      approved: approvedEstimates.length,
      visibleValue: estimates.reduce((sum, estimate) => sum + amountValue(estimate), 0),
      examples: topRecords(estimates, "Estimate"),
    },
    jobs: {
      total: jobs.length,
      active: activeJobs.length,
      scheduled: scheduledJobs.length,
      examples: topRecords(jobs, "Job"),
    },
    fieldProof: {
      reports: reports.length,
      pendingReports: pendingReports.length,
      uploads: uploads.length,
      pendingDeliveryTickets: pendingTickets.length,
      pendingChecklists: pendingChecklists.length,
    },
    moneySignals: {
      pendingChangeOrders: pendingChangeOrders.length,
      activeClocks: activeClocks.length,
      draftEstimates: draftEstimates.length,
      approvedEstimates,
      approvedEstimateCount: approvedEstimates.length,
      sentEstimateCount: sentEstimates.length,
    },
    records: {
      pendingChangeOrders: topRecords(pendingChangeOrders, "Change order"),
      activeClocks: topRecords(activeClocks, "Time entry"),
      pendingReports: topRecords(pendingReports, "Daily report"),
    },
  };
}

function recommendation(id, label, reason, moduleId, actionLabel = "Open workflow") {
  return {
    id,
    label: text(label, 140),
    reason: text(reason, 260),
    moduleId,
    actionLabel,
  };
}

function localRecommendations(category, summary = {}, nextActions = []) {
  const ranked = [];
  if (category === "marketing") {
    ranked.push(recommendation(
      "marketing-lead-sources",
      "Rank lead sources by jobs won, not just lead count",
      `${summary.leads.open} open lead(s) and ${summary.leads.staleFollowUps} follow-up signal(s) are visible. Use this to find which sources deserve more attention.`,
      "leads",
      "Open Leads",
    ));
    ranked.push(recommendation(
      "marketing-estimate-followup",
      "Tighten estimate follow-up before buying more attention",
      `${summary.estimates.sent} sent/pending estimate(s) can turn into revenue faster than a new campaign if follow-up is loose.`,
      "estimates",
      "Open Estimates",
    ));
  } else if (category === "profit_leak") {
    ranked.push(recommendation(
      "money-change-orders",
      "Audit unpriced or unresolved change orders",
      `${summary.moneySignals.pendingChangeOrders} change order item(s) are still open. This is the first place scope creep usually hides.`,
      "changeOrders",
      "Open Change Orders",
    ));
    ranked.push(recommendation(
      "money-proof",
      "Close proof gaps before billing review",
      `${summary.fieldProof.pendingReports + summary.fieldProof.pendingDeliveryTickets + summary.fieldProof.pendingChecklists} proof item(s) appear to need review before clean billing handoff.`,
      "reports",
      "Open Proof Review",
    ));
    ranked.push(recommendation(
      "money-time",
      "Check active clocks and time corrections",
      `${summary.moneySignals.activeClocks} active clock/time signal(s) are visible. Loose time is a quiet margin leak.`,
      "time",
      "Open Time",
    ));
  } else if (category === "estimates") {
    ranked.push(recommendation(
      "estimate-draft-queue",
      "Turn draft estimates into review-ready packets",
      `${summary.estimates.draft} draft estimate(s) are visible. Push the closest ones to proposal review before starting more bids.`,
      "estimates",
      "Open Estimates",
    ));
  } else {
    ranked.push(...asArray(nextActions).slice(0, 3).map((action, index) => recommendation(
      `next-${index + 1}`,
      action.title || action.actionLabel || "Review next action",
      action.reason || action.reviewLabel || "Visible Apex HQ context shows this should be reviewed.",
      action.moduleId || "commandCenter",
      action.actionLabel || "Open workflow",
    )));
  }

  return ranked.filter((item, index, list) => (
    item.label && list.findIndex((candidate) => candidate.label === item.label) === index
  )).slice(0, 5);
}

function localAnswerForCategory(category, summary = {}) {
  if (category === "marketing") {
    return [
      `Start by improving conversion before spending more. You have ${summary.leads.open} open lead(s), ${summary.leads.staleFollowUps} follow-up signal(s), and ${summary.estimates.sent} sent/pending estimate(s) visible.`,
      "The fastest marketing win is usually tighter source tracking, faster follow-up, cleaner estimate packets, and asking happy completed customers for reviews or referrals after value is real.",
    ].join(" ");
  }
  if (category === "profit_leak") {
    return [
      `The likely leaks are unresolved scope, weak proof-to-billing handoff, and loose time. I see ${summary.moneySignals.pendingChangeOrders} pending change order item(s), ${summary.fieldProof.pendingReports} submitted/pending report(s), ${summary.fieldProof.pendingDeliveryTickets} delivery ticket review item(s), and ${summary.moneySignals.activeClocks} active clock/time signal(s).`,
      "Work those before assuming the problem is only pricing. Margin often disappears between field change, documentation, and invoice readiness.",
    ].join(" ");
  }
  if (category === "estimates") {
    return `Focus on the estimate queue. I see ${summary.estimates.draft} draft estimate(s), ${summary.estimates.sent} sent/pending estimate(s), and ${summary.estimates.approved} approved/accepted estimate(s). Clean the highest-value draft first, then follow up on sent estimates before starting cold work.`;
  }
  if (category === "pipeline") {
    return `Your pipeline has ${summary.leads.open} open lead(s) and ${summary.leads.staleFollowUps} follow-up signal(s). The next move is to separate hot estimate-ready leads from low-fit leads, then draft the follow-up or estimate handoff for the best match.`;
  }
  if (category === "operations") {
    return `Operationally, I see ${summary.jobs.active} active job(s), ${summary.jobs.scheduled} scheduled job(s), and ${summary.fieldProof.pendingReports + summary.fieldProof.pendingChecklists} proof/checklist item(s) needing review. Tighten job handoff and closeout proof before adding new work to the board.`;
  }
  return "I can answer like a contractor operator using the Apex HQ context I can safely see: leads, estimates, jobs, proof, time, change orders, and next best actions. Ask me about marketing, profit leaks, estimate follow-up, job readiness, crew/time, or closeout.";
}

function outputDefaults(configured = true) {
  return {
    ok: true,
    configured,
    mode: "contractor_chatgpt",
    category: "general",
    answer: "",
    diagnosis: [],
    recommendedActions: [],
    followUpQuestions: [],
    sourceSummary: [],
    blockedActions: [
      "No customer email, SMS, bid submission, invoice, payment, schedule change, role/package change, or production action was performed.",
    ],
    confidence: "medium",
  };
}

export function sanitizeContractorAdvisorResponse(payload = {}) {
  return {
    ...outputDefaults(payload.configured !== false),
    ok: payload.ok !== false,
    configured: payload.configured !== false,
    category: text(payload.category || "general", 80),
    answer: text(payload.answer, 1800),
    diagnosis: asArray(payload.diagnosis).map((item) => text(item, 300)).filter(Boolean).slice(0, LIST_LIMIT),
    recommendedActions: asArray(payload.recommendedActions).map((action, index) => ({
      id: text(action?.id || `action-${index + 1}`, 80),
      label: text(action?.label || action?.title, 180),
      reason: text(action?.reason || action?.helper, 320),
      moduleId: text(action?.moduleId || "commandCenter", 80),
      actionLabel: text(action?.actionLabel || "Open workflow", 120),
    })).filter((action) => action.label).slice(0, 5),
    followUpQuestions: asArray(payload.followUpQuestions).map((item) => text(item, 240)).filter(Boolean).slice(0, 4),
    sourceSummary: asArray(payload.sourceSummary).map((item) => text(item, 220)).filter(Boolean).slice(0, 6),
    blockedActions: asArray(payload.blockedActions).map((item) => text(item, 220)).filter(Boolean).slice(0, 6),
    confidence: ["low", "medium", "high"].includes(normalize(payload.confidence)) ? normalize(payload.confidence) : "medium",
    message: text(payload.message || payload.answer, 1800),
  };
}

export function buildContractorAdvisorContext({ question = "", workspace = {} } = {}) {
  const workflowContext = deriveAgentWorkflowContext(workspace);
  const nextActions = deriveAgentNextBestActions(workflowContext, { limit: 5 });
  const dailyBrief = deriveAgentDailyOpsBrief(workflowContext);
  const category = classifyQuestion(question);
  const summary = summarizeWorkspace(workspace);

  return {
    question: text(question, 900),
    category,
    summary,
    workflowContext: {
      summary: text(workflowContext.summary || "", 600),
      visibleModuleCount: numberValue(workflowContext.visibleModuleCount),
      attentionCount: numberValue(workflowContext.attentionCount),
      modules: asArray(workflowContext.modules).filter((module) => module.canView).slice(0, 8).map((module) => ({
        id: text(module.id, 80),
        label: text(module.label, 120),
        count: numberValue(module.count),
        needsAttention: numberValue(module.needsAttention),
        summary: text(module.summary, 280),
      })),
    },
    nextActions: asArray(nextActions.actions).slice(0, 5).map((action) => ({
      id: text(action.id, 80),
      moduleId: text(action.moduleId, 80),
      title: text(action.title, 180),
      reason: text(action.reason, 320),
      actionLabel: text(action.actionLabel, 120),
    })),
    dailyBrief: {
      summary: text(dailyBrief.summary || "", 500),
      metrics: asArray(dailyBrief.metrics).slice(0, 6).map((metric) => ({
        label: text(metric.label, 120),
        value: numberValue(metric.value),
      })),
    },
    safetyBoundary: "Answer and recommend internal next steps only. Do not send messages, submit bids, collect payments, invoice, schedule crews, approve records, change roles/packages, deploy, or mutate production data.",
  };
}

export function buildLocalContractorAdvisorAnswer(context = {}) {
  const category = context.category || classifyQuestion(context.question);
  const summary = context.summary || {};
  const recommendations = localRecommendations(category, summary, context.nextActions);
  const sourceSummary = [
    `${summary.leads?.open ?? 0} open lead(s), ${summary.estimates?.total ?? 0} estimate(s), ${summary.jobs?.total ?? 0} job(s).`,
    `${summary.moneySignals?.pendingChangeOrders ?? 0} pending change order(s), ${summary.fieldProof?.pendingReports ?? 0} report(s) needing review, ${summary.moneySignals?.activeClocks ?? 0} active clock signal(s).`,
  ];
  return sanitizeContractorAdvisorResponse({
    configured: false,
    category,
    answer: localAnswerForCategory(category, summary),
    diagnosis: recommendations.map((action) => action.reason),
    recommendedActions: recommendations,
    followUpQuestions: [
      "Which jobs had the most unplanned labor or material this week?",
      "Which lead source produced the last profitable booked job?",
      "Which sent estimates have not had a follow-up yet?",
    ],
    sourceSummary,
    confidence: "medium",
    message: localAnswerForCategory(category, summary),
  });
}

export const CONTRACTOR_ADVISOR_RESPONSE_SCHEMA = {
  name: "apex_contractor_advisor_answer",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      category: { type: "string" },
      answer: { type: "string" },
      diagnosis: { type: "array", items: { type: "string" } },
      recommendedActions: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            id: { type: "string" },
            label: { type: "string" },
            reason: { type: "string" },
            moduleId: { type: "string" },
            actionLabel: { type: "string" },
          },
          required: ["id", "label", "reason", "moduleId", "actionLabel"],
        },
      },
      followUpQuestions: { type: "array", items: { type: "string" } },
      sourceSummary: { type: "array", items: { type: "string" } },
      blockedActions: { type: "array", items: { type: "string" } },
      confidence: { type: "string" },
    },
    required: ["category", "answer", "diagnosis", "recommendedActions", "followUpQuestions", "sourceSummary", "blockedActions", "confidence"],
  },
};

export function buildContractorAdvisorOpenAiRequest(context, model = CONTRACTOR_ADVISOR_DEFAULT_MODEL) {
  return {
    model,
    temperature: 0.2,
    response_format: {
      type: "json_schema",
      json_schema: CONTRACTOR_ADVISOR_RESPONSE_SCHEMA,
    },
    messages: [
      {
        role: "system",
        content: [
          "You are Apex Agent, a contractor business operator inside Apex HQ.",
          "Answer broad contractor questions using only the provided Apex HQ context.",
          "Be practical: diagnose marketing, profit leaks, estimates, jobs, proof, time, change orders, follow-up, and operations.",
          "Recommend internal next steps that map to Apex HQ modules.",
          "Do not claim you sent emails, submitted bids, collected payments, scheduled crews, approved records, changed roles, changed packages, deployed software, or touched production data.",
          "Do not invent facts, prices, totals, customer promises, legal claims, or guaranteed lead results.",
          "Return only JSON matching the schema.",
        ].join(" "),
      },
      {
        role: "user",
        content: JSON.stringify({
          instruction: "Answer this contractor like a sharp operator. Use concrete counts and visible signals from context. If the data is incomplete, say what to inspect next instead of guessing.",
          context,
        }),
      },
    ],
  };
}

export function parseOpenAiContractorAdvisorPayload(payload = {}) {
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error("OpenAI response did not include assistant JSON.");
  }
  return JSON.parse(content);
}

export function notConfiguredContractorAdvisorResponse(context = {}) {
  return {
    ...buildLocalContractorAdvisorAnswer(context),
    configured: false,
  };
}

export function unavailableContractorAdvisorResponse(context = {}, message = "Apex Agent could not reach the AI advisor. Using local workspace signals instead.") {
  return {
    ...buildLocalContractorAdvisorAnswer(context),
    ok: false,
    configured: true,
    message: text(message, 400),
  };
}

export async function generateContractorAdvisorAnswer({
  context,
  apiKey,
  fetchImpl = globalThis.fetch,
  endpoint = CONTRACTOR_ADVISOR_OPENAI_URL,
  model = CONTRACTOR_ADVISOR_DEFAULT_MODEL,
  timeoutMs = 20000,
} = {}) {
  if (!text(apiKey, 200)) {
    return notConfiguredContractorAdvisorResponse(context);
  }
  if (typeof fetchImpl !== "function") {
    return unavailableContractorAdvisorResponse(context, "Apex Agent cannot run the AI advisor because fetch is unavailable.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildContractorAdvisorOpenAiRequest(context, model)),
      signal: controller.signal,
    });

    if (!response.ok) {
      return unavailableContractorAdvisorResponse(context);
    }

    const payload = await response.json();
    return sanitizeContractorAdvisorResponse({
      ...parseOpenAiContractorAdvisorPayload(payload),
      configured: true,
      ok: true,
    });
  } catch {
    return unavailableContractorAdvisorResponse(context, "Apex Agent could not read the AI advisor response. Using local workspace signals instead.");
  } finally {
    clearTimeout(timeout);
  }
}
