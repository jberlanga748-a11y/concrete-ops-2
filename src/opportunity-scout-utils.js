import { deriveDailySourceCheckState, leadSourceLocation } from "../shared/leadSources.js";

const CLOSED_LEAD_STATUSES = new Set([
  "approved",
  "converted",
  "won",
  "lost",
  "no thanks",
  "not interested",
  "closed",
  "archived",
]);

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function text(value) {
  return String(value ?? "").trim();
}

function collapseSpaces(value) {
  return text(value).replace(/\s+/g, " ");
}

function normalizeStatus(value) {
  return collapseSpaces(value).toLowerCase().replace(/[_-]/g, " ");
}

function dateKey(value) {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function sameCompany(record = {}, companyId = "") {
  if (!companyId) return true;
  const recordCompanyId = text(record.companyId);
  return !recordCompanyId || recordCompanyId === companyId;
}

function isArchived(record = {}) {
  return Boolean(record.archivedAt || record.deletedAt);
}

function isActiveSource(source = {}) {
  return !isArchived(source) && normalizeStatus(source.status || "Active") === "active";
}

function isOpenLead(lead = {}) {
  return !isArchived(lead) && !CLOSED_LEAD_STATUSES.has(normalizeStatus(lead.status || "New"));
}

function uniqueTexts(values = []) {
  const seen = new Set();
  const result = [];
  values.map(collapseSpaces).filter(Boolean).forEach((value) => {
    const key = value.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    result.push(value);
  });
  return result;
}

function sourceSortValue(source = {}) {
  return source.nextCheckAt || source.lastCheckedAt || source.name || "";
}

function followUpDueBucket(lead = {}, today = dateKey(new Date())) {
  const due = dateKey(lead.followUpDueAt || lead.nextFollowUpDate || lead.nextFollowUpAt);
  if (!due) return "none";
  if (due < today) return "overdue";
  if (due === today) return "today";
  return "later";
}

function sourceUrgency(source = {}) {
  if (source.checkBucket === "overdue") {
    return {
      statusLabel: "Overdue source check",
      tone: "red",
      priority: 1,
      helper: source.nextCheckAt ? `Due ${source.nextCheckAt}` : "Needs source review.",
    };
  }

  if (source.checkBucket === "dueToday") {
    return {
      statusLabel: "Due today",
      tone: "orange",
      priority: 2,
      helper: "Check this source today.",
    };
  }

  return {
    statusLabel: "Active source",
    tone: "blue",
    priority: 3,
    helper: source.nextCheckAt ? `Next check ${source.nextCheckAt}` : "No check date scheduled.",
  };
}

function companySearchContext(companySettings = {}) {
  return uniqueTexts([
    companySettings.serviceArea,
    companySettings.businessAddress,
    companySettings.companyName,
  ]);
}

export function buildOpportunityScoutSearchPhrase(source = {}, companySettings = {}) {
  const locationParts = uniqueTexts([
    source.city && source.state ? `${source.city} ${source.state}` : "",
    source.city,
    source.state,
    source.serviceArea,
    ...companySearchContext(companySettings),
  ]);
  const workParts = uniqueTexts([
    source.tradeFocus,
    source.type,
    "contractor bids",
    "project opportunities",
  ]);
  const sourceName = collapseSpaces(source.name);
  const location = locationParts[0] || "local";
  const work = workParts[0] || "contractor";

  if (/referral|repeat|property manager|builder|developer/i.test(source.type || sourceName)) {
    return uniqueTexts([sourceName, location, work, "follow up opportunities"]).join(" ");
  }

  if (/public|city|county|school|bid|plan room|gc/i.test(source.type || sourceName)) {
    return uniqueTexts([location, work, "RFP bid invite plan room"]).join(" ");
  }

  return uniqueTexts([location, work, sourceName, "new work"]).join(" ");
}

export function buildOpportunityScoutSourceBrief(source = {}, companySettings = {}) {
  const sourceText = [
    source.name,
    source.type,
    source.tradeFocus,
    source.serviceArea,
    source.notes,
  ].map(collapseSpaces).join(" ").toLowerCase();
  const query = buildOpportunityScoutSearchPhrase(source, companySettings);

  if (/public|city|county|school|bid|procurement|plan room|addenda|rfp|gc/i.test(sourceText)) {
    return {
      query,
      headline: source.url
        ? "Open the source, search the brief, then verify any bid dates, addenda, and trade fit."
        : "Use the search brief to manually check the source, then verify bid dates, addenda, and trade fit.",
      checkFor: [
        "Bid date, walk-through, addenda, and plan access",
        "Trade fit, service area, project size, and required scope",
        "Estimator contact, registration, prequal, or required forms",
      ],
      resultPrompt: "Record whether there was a real opportunity, no fit, missing docs, or a follow-up needed.",
      addLeadPrompt: "Add only real opportunities as leads after the office confirms the fit.",
    };
  }

  if (/referral|repeat|property manager|builder|developer|relationship|association|chamber|supplier/i.test(sourceText)) {
    return {
      query,
      headline: "Review the relationship source and look for warm project timing, referral openings, or follow-up reasons.",
      checkFor: [
        "Who should be contacted and why now",
        "Project timing, trade fit, budget signals, and service area",
        "Next human follow-up step, owner, and date",
      ],
      resultPrompt: "Record the relationship status, next follow-up, or why there was no useful opening today.",
      addLeadPrompt: "Add a lead only when there is a real project, request, or qualified relationship opportunity.",
    };
  }

  if (/website|private job|inbound|form|maps|review|social|community|permit/i.test(sourceText)) {
    return {
      query,
      headline: "Review inbound or research signals manually and confirm consent, fit, and missing information before creating work.",
      checkFor: [
        "New request, project signal, or service-area match",
        "Contact details, consent context, and missing qualification info",
        "Trade fit, urgency, and safe owner review path",
      ],
      resultPrompt: "Record what was checked, what was found, and whether a human-reviewed lead should be created.",
      addLeadPrompt: "Create the lead only after confirming it is a real, role-safe opportunity.",
    };
  }

  return {
    query,
    headline: source.url
      ? "Open the saved source and use the search brief to look for real work opportunities."
      : "Use the search brief and source notes to look for real work opportunities.",
    checkFor: [
      "Service-area and trade fit",
      "Decision maker, due date, or follow-up path",
      "Missing information before estimating or routing",
    ],
    resultPrompt: "Record the result clearly so the next office review knows what happened.",
    addLeadPrompt: "Add a lead only when there is a real opportunity to qualify.",
  };
}

function buildSourceQueue(source = {}, companySettings = {}) {
  const urgency = sourceUrgency(source);
  const brief = buildOpportunityScoutSourceBrief(source, companySettings);
  return {
    id: source.id || source.name,
    sourceId: source.id || "",
    name: source.name || "Unnamed source",
    type: source.type || "Lead source",
    location: leadSourceLocation(source),
    url: source.url || "",
    query: brief.query,
    recommendedAction: brief.headline,
    checkFor: brief.checkFor,
    resultPrompt: brief.resultPrompt,
    addLeadPrompt: brief.addLeadPrompt,
    ...urgency,
  };
}

function buildLeadQueue(leads = [], today = dateKey(new Date())) {
  return asArray(leads)
    .filter(isOpenLead)
    .map((lead, index) => {
      const dueBucket = followUpDueBucket(lead, today);
      const fitScore = Number(lead.fitScore || 0);
      const missingCount = Number(lead.missingInfoCount || 0);
      let priority = 50;
      let statusLabel = "Open lead";
      let tone = "blue";

      if (dueBucket === "overdue") {
        priority = 5;
        statusLabel = "Follow-up overdue";
        tone = "red";
      } else if (dueBucket === "today") {
        priority = 10;
        statusLabel = "Follow-up due";
        tone = "orange";
      } else if (missingCount > 0) {
        priority = 20;
        statusLabel = "Missing info";
        tone = "amber";
      } else if (fitScore >= 80 || /strong|good/i.test(lead.fitLabel || "")) {
        priority = 30;
        statusLabel = "Good match";
        tone = "green";
      } else if (normalizeStatus(lead.status) === "new") {
        priority = 40;
        statusLabel = "New lead";
      }

      return {
        id: lead.id || `lead-${index}`,
        leadId: lead.id || "",
        title: lead.customer || "Unnamed lead",
        subtitle: [lead.project, lead.city, lead.source].filter(Boolean).join(" / "),
        statusLabel,
        tone,
        priority,
        fitScore,
        missingCount,
        dueBucket,
      };
    })
    .sort((left, right) => left.priority - right.priority || Number(right.fitScore || 0) - Number(left.fitScore || 0));
}

export function deriveOpportunityScoutState(source = {}, options = {}) {
  const today = dateKey(options.today || new Date());
  const companyId = text(options.companyId || source.currentCompanyId || source.companyId);
  const companySettings = source.companySettings || {};
  const leadSources = asArray(source.leadSources).filter((entry) => sameCompany(entry, companyId));
  const activeSources = leadSources.filter(isActiveSource);
  const dailyCheck = deriveDailySourceCheckState(activeSources, { today });
  const checkQueue = [...dailyCheck.overdueSources, ...dailyCheck.dueTodaySources].map((entry) => buildSourceQueue(entry, companySettings));
  const fallbackSources = activeSources
    .slice()
    .sort((left, right) => sourceSortValue(left).localeCompare(sourceSortValue(right)) || text(left.name).localeCompare(text(right.name)))
    .slice(0, 5)
    .map((entry) => buildSourceQueue(entry, companySettings));
  const sourceQueue = (checkQueue.length ? checkQueue : fallbackSources)
    .sort((left, right) => left.priority - right.priority || left.name.localeCompare(right.name));
  const searchBriefs = sourceQueue.slice(0, 5).map((entry) => ({
    id: `brief-${entry.id}`,
    sourceId: entry.sourceId,
    title: entry.name,
    type: entry.type,
    location: entry.location,
    query: entry.query,
    helper: entry.recommendedAction,
    checkFor: entry.checkFor,
    resultPrompt: entry.resultPrompt,
    addLeadPrompt: entry.addLeadPrompt,
    url: entry.url,
    tone: entry.tone,
  }));
  const leadQueue = buildLeadQueue(asArray(source.leads).filter((entry) => sameCompany(entry, companyId)), today);
  const openLeads = asArray(source.leads).filter((entry) => sameCompany(entry, companyId)).filter(isOpenLead);
  const highFitLeads = openLeads.filter((lead) => Number(lead.fitScore || 0) >= 80 || /strong|good/i.test(lead.fitLabel || ""));
  const missingInfoLeads = openLeads.filter((lead) => Number(lead.missingInfoCount || 0) > 0 || /needs info|missing/i.test(lead.missingInfoStatus || ""));
  const dueLeads = openLeads.filter((lead) => ["overdue", "today"].includes(followUpDueBucket(lead, today)));

  const readiness = activeSources.length === 0
    ? {
        label: "Source setup needed",
        tone: "amber",
        summary: "Add active lead sources before Apex HQ can guide daily opportunity checks.",
        nextAction: "Add Lead Sources",
      }
    : dailyCheck.stats.checksNeeded > 0
      ? {
          label: "Scout checks due",
          tone: dailyCheck.stats.overdue > 0 ? "red" : "orange",
          summary: `${dailyCheck.stats.checksNeeded} lead source check${dailyCheck.stats.checksNeeded === 1 ? "" : "s"} need office review.`,
          nextAction: "Run Daily Source Check",
        }
      : leadQueue.length > 0
        ? {
            label: "Review active matches",
            tone: "blue",
            summary: "Lead sources are current. Work the best open leads and follow-ups next.",
            nextAction: "Review Lead Queue",
          }
        : {
            label: "Ready to scout",
            tone: "green",
            summary: "Lead sources are active and no urgent lead follow-ups are blocking the office.",
            nextAction: "Check Top Sources",
          };

  const actionPlan = [
    {
      id: "source-checks",
      label: readiness.nextAction,
      helper: activeSources.length === 0
        ? "Create or activate the sources Apex HQ should watch."
        : `${dailyCheck.stats.overdue} overdue / ${dailyCheck.stats.dueToday} due today.`,
      tone: readiness.tone,
      moduleId: "leads",
    },
    {
      id: "review-leads",
      label: "Review best open leads",
      helper: `${highFitLeads.length} strong or good fit / ${dueLeads.length} due follow-up.`,
      tone: highFitLeads.length || dueLeads.length ? "orange" : "slate",
      moduleId: "leads",
    },
    {
      id: "missing-info",
      label: "Clear missing info",
      helper: `${missingInfoLeads.length} lead${missingInfoLeads.length === 1 ? "" : "s"} need cleaner qualification.`,
      tone: missingInfoLeads.length ? "amber" : "slate",
      moduleId: "leads",
    },
  ];

  return {
    today,
    readiness,
    sourceQueue,
    searchBriefs,
    leadQueue: leadQueue.slice(0, 6),
    actionPlan,
    stats: {
      activeSources: activeSources.length,
      totalSources: leadSources.length,
      overdueSourceChecks: dailyCheck.stats.overdue,
      dueSourceChecks: dailyCheck.stats.dueToday,
      checksNeeded: dailyCheck.stats.checksNeeded,
      openLeads: openLeads.length,
      highFitLeads: highFitLeads.length,
      missingInfoLeads: missingInfoLeads.length,
      dueLeads: dueLeads.length,
    },
    guardrails: {
      mode: "Rules-first foundation",
      externalSearch: false,
      autoCreateLeads: false,
      autoSendMessages: false,
    },
  };
}
