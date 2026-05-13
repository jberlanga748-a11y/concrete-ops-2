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

function statusLabel(value, fallback = "New") {
  const normalized = collapseSpaces(value || fallback).replace(/[_-]/g, " ");
  if (!normalized) return fallback;
  return normalized.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusTone(value) {
  const normalized = normalizeStatus(value);
  if (["archived", "skipped"].includes(normalized)) return "slate";
  if (["converted to lead", "converted"].includes(normalized)) return "green";
  if (["bidding", "reviewing", "new"].includes(normalized)) return "orange";
  if (["watching"].includes(normalized)) return "blue";
  if (["paused"].includes(normalized)) return "amber";
  if (["active"].includes(normalized)) return "green";
  return "slate";
}

function dateBucket(value, today = dateKey(new Date())) {
  const due = dateKey(value);
  if (!due) return "none";
  if (due < today) return "overdue";
  if (due === today) return "today";
  return "future";
}

function dateSortValue(value) {
  return dateKey(value) || "9999-99-99";
}

function isActiveSearchProfile(profile = {}) {
  return !isArchived(profile) && normalizeStatus(profile.status || "active") === "active";
}

function profileNeedsRun(profile = {}, today = dateKey(new Date())) {
  if (!isActiveSearchProfile(profile)) return false;
  if (normalizeStatus(profile.cadence) === "manual") return false;
  if (!profile.lastRunAt) return true;
  const nextRun = dateKey(profile.nextRunAt);
  return Boolean(nextRun && nextRun <= today);
}

function isOpenFoundOpportunity(opportunity = {}) {
  if (isArchived(opportunity)) return false;
  return !["skipped", "converted to lead", "converted", "archived"].includes(normalizeStatus(opportunity.status || "new"));
}

function opportunityPriority(opportunity = {}, today = dateKey(new Date())) {
  const status = normalizeStatus(opportunity.status || "new");
  const bidBucket = dateBucket(opportunity.bidDueAt, today);
  if (bidBucket === "overdue") return 1;
  if (bidBucket === "today") return 2;
  if (status === "bidding") return 3;
  if (status === "reviewing" || status === "new") return 4;
  if (Number(opportunity.fitScore || 0) >= 75) return 5;
  return 9;
}

function buildOpportunityScoutProfileBrief(profile = {}, companySettings = {}) {
  const areas = uniqueTexts([
    ...(Array.isArray(profile.serviceAreas) ? profile.serviceAreas : []),
    companySettings.serviceArea,
  ]);
  const trades = uniqueTexts(Array.isArray(profile.trades) ? profile.trades : []);
  const keywords = uniqueTexts(Array.isArray(profile.keywords) ? profile.keywords : []);
  const sourceTypes = uniqueTexts(Array.isArray(profile.sourceTypes) ? profile.sourceTypes : []);
  const area = areas[0] || "local";
  const trade = trades[0] || "contractor";
  const sourceType = sourceTypes[0] || "public bid portals";
  const keyword = keywords[0] || "project opportunities";

  return {
    query: uniqueTexts([area, trade, sourceType, keyword, "RFP bid invite"]).join(" "),
    headline: "Run this saved profile manually across the approved sources, then save only real found opportunities for review.",
    checkFor: [
      "Bid due date, walk-through, addenda, and plan access",
      "Trade fit, service area, required forms, and decision path",
      "Reason to bid, reason to skip, risks, and missing info",
    ],
    resultPrompt: "Save real matches as found opportunities; mark the profile reviewed when today's search is complete.",
    addLeadPrompt: "Do not create leads until the office confirms the opportunity is real and qualified.",
  };
}

function buildSearchProfileQueue(profile = {}, companySettings = {}, today = dateKey(new Date())) {
  const brief = buildOpportunityScoutProfileBrief(profile, companySettings);
  const needsRun = profileNeedsRun(profile, today);
  const runBucket = dateBucket(profile.nextRunAt, today);
  const tone = statusTone(profile.status || "active");
  return {
    id: profile.id || profile.name,
    profileId: profile.id || "",
    name: profile.name || "Unnamed profile",
    status: profile.status || "active",
    statusLabel: needsRun ? (runBucket === "overdue" ? "Search overdue" : "Search due") : statusLabel(profile.status || "active"),
    cadence: profile.cadence || "daily",
    trades: Array.isArray(profile.trades) ? profile.trades : [],
    serviceAreas: Array.isArray(profile.serviceAreas) ? profile.serviceAreas : [],
    sourceTypes: Array.isArray(profile.sourceTypes) ? profile.sourceTypes : [],
    keywords: Array.isArray(profile.keywords) ? profile.keywords : [],
    nextRunAt: profile.nextRunAt || "",
    lastRunAt: profile.lastRunAt || "",
    query: brief.query,
    recommendedAction: brief.headline,
    checkFor: brief.checkFor,
    resultPrompt: brief.resultPrompt,
    addLeadPrompt: brief.addLeadPrompt,
    needsRun,
    tone: needsRun ? (runBucket === "overdue" ? "red" : "orange") : tone,
    priority: needsRun ? (runBucket === "overdue" ? 1 : 2) : normalizeStatus(profile.status) === "active" ? 5 : 8,
  };
}

function buildFoundOpportunityQueue(opportunity = {}, today = dateKey(new Date())) {
  const bidBucket = dateBucket(opportunity.bidDueAt, today);
  const priority = opportunityPriority(opportunity, today);
  const fitScore = Number(opportunity.fitScore || 0);
  const tone = bidBucket === "overdue"
    ? "red"
    : bidBucket === "today" || ["new", "reviewing", "bidding"].includes(normalizeStatus(opportunity.status || "new"))
      ? "orange"
      : fitScore >= 75
        ? "green"
        : statusTone(opportunity.status || "new");

  return {
    id: opportunity.id || opportunity.title,
    opportunityId: opportunity.id || "",
    title: opportunity.title || "Untitled opportunity",
    agency: opportunity.agency || opportunity.sourceName || "Source not recorded",
    sourceUrl: opportunity.sourceUrl || opportunity.planUrl || "",
    status: opportunity.status || "new",
    statusLabel: statusLabel(opportunity.status || "new"),
    bidDueAt: opportunity.bidDueAt || "",
    bidBucket,
    location: uniqueTexts([opportunity.city, opportunity.state]).join(", "),
    trade: opportunity.trade || opportunity.projectType || "Trade not set",
    fitScore,
    reasonToBid: opportunity.reasonToBid || opportunity.scopeSummary || opportunity.notes || "",
    riskFlags: Array.isArray(opportunity.riskFlags) ? opportunity.riskFlags : [],
    missingInfoItems: Array.isArray(opportunity.missingInfoItems) ? opportunity.missingInfoItems : [],
    assignedEstimatorId: opportunity.assignedEstimatorId || "",
    convertedLeadId: opportunity.convertedLeadId || "",
    tone,
    priority,
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

function buildDailyScoutRunSteps({
  dueProfiles = [],
  dailyCheck = {},
  foundOpportunityQueue = [],
  dueBidOpportunities = [],
  highFitOpportunities = [],
  dueLeads = [],
  missingInfoLeads = [],
} = {}) {
  const sourceChecksNeeded = Number(dailyCheck?.stats?.checksNeeded || 0);
  const overdueChecks = Number(dailyCheck?.stats?.overdue || 0) + dueProfiles.filter((profile) => profile.tone === "red").length;
  const dueProfileCount = dueProfiles.length;
  const foundCount = foundOpportunityQueue.length;
  const leadCount = dueLeads.length + missingInfoLeads.length;

  return [
    {
      id: "run-profiles",
      label: "Run scout profiles",
      value: dueProfileCount,
      helper: dueProfileCount ? `${dueProfileCount} saved profile${dueProfileCount === 1 ? "" : "s"} need review.` : "Saved profiles are current.",
      tone: overdueChecks ? "red" : dueProfileCount ? "orange" : "green",
      actionLabel: dueProfileCount ? "Review profiles" : "Profiles current",
      moduleId: "copilot",
    },
    {
      id: "check-sources",
      label: "Check lead sources",
      value: sourceChecksNeeded,
      helper: sourceChecksNeeded ? `${sourceChecksNeeded} source check${sourceChecksNeeded === 1 ? "" : "s"} due today.` : "Lead sources are not due.",
      tone: Number(dailyCheck?.stats?.overdue || 0) ? "red" : sourceChecksNeeded ? "orange" : "green",
      actionLabel: "Open sources",
      moduleId: "leads",
    },
    {
      id: "review-found-work",
      label: "Review found work",
      value: foundCount,
      helper: foundCount ? `${dueBidOpportunities.length} due now / ${highFitOpportunities.length} high-fit.` : "No saved found work waiting.",
      tone: dueBidOpportunities.length ? "red" : foundCount ? "orange" : "slate",
      actionLabel: "Review found work",
      moduleId: "copilot",
    },
    {
      id: "work-lead-followups",
      label: "Work lead follow-ups",
      value: leadCount,
      helper: leadCount ? `${dueLeads.length} due / ${missingInfoLeads.length} missing info.` : "No urgent lead cleanup.",
      tone: dueLeads.length ? "orange" : missingInfoLeads.length ? "amber" : "green",
      actionLabel: "Open leads",
      moduleId: "leads",
    },
  ];
}

export function deriveOpportunityScoutState(source = {}, options = {}) {
  const today = dateKey(options.today || new Date());
  const companyId = text(options.companyId || source.currentCompanyId || source.companyId);
  const companySettings = source.companySettings || {};
  const leadSources = asArray(source.leadSources).filter((entry) => sameCompany(entry, companyId));
  const activeSources = leadSources.filter(isActiveSource);
  const searchProfiles = asArray(source.opportunitySearchProfiles).filter((entry) => sameCompany(entry, companyId) && !isArchived(entry));
  const activeProfiles = searchProfiles.filter(isActiveSearchProfile);
  const foundOpportunities = asArray(source.foundOpportunities).filter((entry) => sameCompany(entry, companyId) && !isArchived(entry));
  const openFoundOpportunities = foundOpportunities.filter(isOpenFoundOpportunity);
  const dailyCheck = deriveDailySourceCheckState(activeSources, { today });
  const profileQueue = searchProfiles
    .map((entry) => buildSearchProfileQueue(entry, companySettings, today))
    .sort((left, right) => left.priority - right.priority || dateSortValue(left.nextRunAt).localeCompare(dateSortValue(right.nextRunAt)) || left.name.localeCompare(right.name));
  const foundOpportunityQueue = openFoundOpportunities
    .map((entry) => buildFoundOpportunityQueue(entry, today))
    .sort((left, right) => left.priority - right.priority || dateSortValue(left.bidDueAt).localeCompare(dateSortValue(right.bidDueAt)) || Number(right.fitScore || 0) - Number(left.fitScore || 0));
  const checkQueue = [...dailyCheck.overdueSources, ...dailyCheck.dueTodaySources].map((entry) => buildSourceQueue(entry, companySettings));
  const fallbackSources = activeSources
    .slice()
    .sort((left, right) => sourceSortValue(left).localeCompare(sourceSortValue(right)) || text(left.name).localeCompare(text(right.name)))
    .slice(0, 5)
    .map((entry) => buildSourceQueue(entry, companySettings));
  const sourceQueue = (checkQueue.length ? checkQueue : fallbackSources)
    .sort((left, right) => left.priority - right.priority || left.name.localeCompare(right.name));
  const profileBriefs = profileQueue.filter((entry) => normalizeStatus(entry.status) === "active").slice(0, 4).map((entry) => ({
    id: `profile-brief-${entry.id}`,
    profileId: entry.profileId,
    title: entry.name,
    type: "Search profile",
    location: entry.serviceAreas.join(", ") || companySettings.serviceArea || "Service area not set",
    query: entry.query,
    helper: entry.recommendedAction,
    checkFor: entry.checkFor,
    resultPrompt: entry.resultPrompt,
    addLeadPrompt: entry.addLeadPrompt,
    url: "",
    tone: entry.tone,
  }));
  const sourceBriefs = sourceQueue.slice(0, 5).map((entry) => ({
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
  const searchBriefs = [...profileBriefs, ...sourceBriefs].slice(0, 6);
  const leadQueue = buildLeadQueue(asArray(source.leads).filter((entry) => sameCompany(entry, companyId)), today);
  const openLeads = asArray(source.leads).filter((entry) => sameCompany(entry, companyId)).filter(isOpenLead);
  const highFitLeads = openLeads.filter((lead) => Number(lead.fitScore || 0) >= 80 || /strong|good/i.test(lead.fitLabel || ""));
  const missingInfoLeads = openLeads.filter((lead) => Number(lead.missingInfoCount || 0) > 0 || /needs info|missing/i.test(lead.missingInfoStatus || ""));
  const dueLeads = openLeads.filter((lead) => ["overdue", "today"].includes(followUpDueBucket(lead, today)));
  const dueProfiles = profileQueue.filter((profile) => profile.needsRun);
  const highFitOpportunities = openFoundOpportunities.filter((opportunity) => Number(opportunity.fitScore || 0) >= 75);
  const dueBidOpportunities = openFoundOpportunities.filter((opportunity) => ["overdue", "today"].includes(dateBucket(opportunity.bidDueAt, today)));
  const newFoundOpportunities = openFoundOpportunities.filter((opportunity) => normalizeStatus(opportunity.status || "new") === "new");
  const reviewingOpportunities = openFoundOpportunities.filter((opportunity) => normalizeStatus(opportunity.status || "new") === "reviewing");
  const biddingOpportunities = openFoundOpportunities.filter((opportunity) => normalizeStatus(opportunity.status || "new") === "bidding");

  const scoutTargetCount = activeSources.length + activeProfiles.length;
  const readiness = scoutTargetCount === 0
    ? {
        label: "Source setup needed",
        tone: "amber",
        summary: "Add lead sources or search profiles before Apex HQ can guide daily opportunity checks.",
        nextAction: "Add Search Profile",
      }
    : foundOpportunityQueue.length > 0
      ? {
          label: "Found work needs review",
          tone: dueBidOpportunities.length ? "red" : "orange",
          summary: `${foundOpportunityQueue.length} found opportunit${foundOpportunityQueue.length === 1 ? "y" : "ies"} need office review before anyone bids or converts work.`,
          nextAction: "Review Found Work",
        }
    : dailyCheck.stats.checksNeeded > 0 || dueProfiles.length > 0
      ? {
          label: "Scout checks due",
          tone: dailyCheck.stats.overdue > 0 || dueProfiles.some((profile) => profile.tone === "red") ? "red" : "orange",
          summary: `${dailyCheck.stats.checksNeeded + dueProfiles.length} source/profile check${dailyCheck.stats.checksNeeded + dueProfiles.length === 1 ? "" : "s"} need office review.`,
          nextAction: "Run Daily Scout",
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
      helper: scoutTargetCount === 0
        ? "Create the profiles and sources Apex HQ should watch."
        : `${dailyCheck.stats.overdue + dueProfiles.filter((profile) => profile.tone === "red").length} overdue / ${dailyCheck.stats.dueToday + dueProfiles.filter((profile) => profile.tone !== "red" && profile.needsRun).length} due today.`,
      tone: readiness.tone,
      moduleId: "copilot",
    },
    {
      id: "found-work",
      label: "Review found opportunities",
      helper: `${foundOpportunityQueue.length} open found / ${biddingOpportunities.length} bidding / ${dueBidOpportunities.length} due now.`,
      tone: foundOpportunityQueue.length ? "orange" : "slate",
      moduleId: "copilot",
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
  const dailyRunSteps = buildDailyScoutRunSteps({
    dueProfiles,
    dailyCheck,
    foundOpportunityQueue,
    dueBidOpportunities,
    highFitOpportunities,
    dueLeads,
    missingInfoLeads,
  });

  return {
    today,
    readiness,
    dailyRunSteps,
    profileQueue: profileQueue.slice(0, 6),
    foundOpportunityQueue: foundOpportunityQueue.slice(0, 8),
    sourceQueue,
    searchBriefs,
    leadQueue: leadQueue.slice(0, 6),
    actionPlan,
    stats: {
      activeSources: activeSources.length,
      totalSources: leadSources.length,
      activeProfiles: activeProfiles.length,
      totalProfiles: searchProfiles.length,
      profilesDue: dueProfiles.length,
      foundOpportunities: foundOpportunities.length,
      openFoundOpportunities: openFoundOpportunities.length,
      newFoundOpportunities: newFoundOpportunities.length,
      reviewingOpportunities: reviewingOpportunities.length,
      biddingOpportunities: biddingOpportunities.length,
      highFitOpportunities: highFitOpportunities.length,
      dueBidOpportunities: dueBidOpportunities.length,
      overdueSourceChecks: dailyCheck.stats.overdue,
      dueSourceChecks: dailyCheck.stats.dueToday,
      checksNeeded: dailyCheck.stats.checksNeeded + dueProfiles.length,
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
