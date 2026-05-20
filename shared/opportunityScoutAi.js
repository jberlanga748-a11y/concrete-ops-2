import { parseOpportunityScoutSourceCheckOutcomes, redactOpportunityScoutText } from "./opportunityScout.js";

export const OPPORTUNITY_ASSISTANT_DEFAULT_MODEL = "gpt-4o-mini";
export const OPPORTUNITY_ASSISTANT_OPENAI_URL = "https://api.openai.com/v1/chat/completions";

const TEXT_LIMIT = 4000;
const SHORT_TEXT_LIMIT = 500;
const LIST_LIMIT = 8;

function text(value, limit = TEXT_LIMIT) {
  return String(value ?? "").replace(/\s+\n/g, "\n").trim().slice(0, limit);
}

function arrayText(values, limit = LIST_LIMIT) {
  if (!Array.isArray(values)) return [];
  return values.map((value) => text(value, SHORT_TEXT_LIMIT)).filter(Boolean).slice(0, limit);
}

function outputDefaults(configured = true) {
  return {
    ok: true,
    configured,
    opportunitySummary: "",
    bidNoBidRecommendation: "",
    recommendedNextStep: "",
    missingInfoQuestions: [],
    riskNotes: [],
    estimatorHandoffNotes: "",
    suggestedLeadNextStep: "",
    suggestedFollowUpTiming: "",
  };
}

export function notConfiguredOpportunityAssistantResponse() {
  return {
    ...outputDefaults(false),
    message: "Opportunity Scout AI is not configured. Set OPENAI_API_KEY on the server to enable review-only recommendations.",
  };
}

export function unavailableOpportunityAssistantResponse(message = "Opportunity Scout AI is temporarily unavailable. Try again later.") {
  return {
    ...outputDefaults(true),
    ok: false,
    message,
  };
}

export function sanitizeOpportunityAssistantResponse(payload = {}) {
  return {
    ...outputDefaults(true),
    opportunitySummary: text(payload.opportunitySummary, 900),
    bidNoBidRecommendation: text(payload.bidNoBidRecommendation, 400),
    recommendedNextStep: text(payload.recommendedNextStep, 700),
    missingInfoQuestions: arrayText(payload.missingInfoQuestions),
    riskNotes: arrayText(payload.riskNotes),
    estimatorHandoffNotes: text(payload.estimatorHandoffNotes, 1800),
    suggestedLeadNextStep: text(payload.suggestedLeadNextStep, 700),
    suggestedFollowUpTiming: text(payload.suggestedFollowUpTiming, 180),
  };
}

export function buildOpportunityAssistantContext({
  opportunity = {},
  searchProfile = null,
  leadSource = null,
  companySettings = {},
} = {}) {
  return {
    opportunity: {
      id: text(opportunity.id, 80),
      title: text(opportunity.title, 260),
      agency: text(opportunity.agency || opportunity.sourceName, 220),
      sourceName: text(opportunity.sourceName, 220),
      city: text(opportunity.city, 120),
      state: text(opportunity.state, 80),
      trade: text(opportunity.trade, 140),
      projectType: text(opportunity.projectType, 180),
      status: text(opportunity.status, 80),
      fitScore: Number(opportunity.fitScore || 0),
      urgencyScore: Number(opportunity.urgencyScore || 0),
      distanceScore: Number(opportunity.distanceScore || 0),
      tradeMatchScore: Number(opportunity.tradeMatchScore || 0),
      bidDueAt: text(opportunity.bidDueAt, 100),
      jobWalkAt: text(opportunity.jobWalkAt, 100),
      estimatedValue: Number(opportunity.estimatedValue || 0),
      sourceUrl: text(opportunity.sourceUrl, 400),
      planUrl: text(opportunity.planUrl, 400),
      scopeSummary: text(opportunity.scopeSummary, 1200),
      reasonToBid: text(opportunity.reasonToBid, 900),
      reasonToSkip: text(opportunity.reasonToSkip, 900),
      riskFlags: arrayText(opportunity.riskFlags),
      missingInfoItems: arrayText(opportunity.missingInfoItems),
      notes: text(opportunity.notes, 1400),
    },
    searchProfile: searchProfile ? {
      name: text(searchProfile.name, 220),
      trades: arrayText(searchProfile.trades),
      serviceAreas: arrayText(searchProfile.serviceAreas),
      sourceTypes: arrayText(searchProfile.sourceTypes),
      sourceAdapterId: text(searchProfile.sourceAdapterId, 100),
      sourceAccessStatus: text(searchProfile.sourceAccessStatus, 100),
      sourceTermsStatus: text(searchProfile.sourceTermsStatus, 100),
      sourcePolicyNote: text(redactOpportunityScoutText(searchProfile.sourcePolicyNote || ""), 700),
      keywords: arrayText(searchProfile.keywords),
      excludedKeywords: arrayText(searchProfile.excludedKeywords),
      cadence: text(searchProfile.cadence, 80),
      notes: text(redactOpportunityScoutText(searchProfile.notes || ""), 1000),
    } : null,
    leadSource: leadSource ? {
      name: text(leadSource.name, 220),
      type: text(leadSource.type, 140),
      serviceArea: text(leadSource.serviceArea, 260),
      tradeFocus: text(leadSource.tradeFocus, 260),
      notes: text(leadSource.notes, 1000),
    } : null,
    company: {
      name: text(companySettings.companyName, 180),
      serviceArea: text(companySettings.serviceArea, 260),
      licenseText: text(companySettings.licenseText, 220),
      website: text(companySettings.website, 220),
    },
  };
}

export const OPPORTUNITY_ASSISTANT_RESPONSE_SCHEMA = {
  name: "opportunity_scout_review",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      opportunitySummary: { type: "string" },
      bidNoBidRecommendation: { type: "string" },
      recommendedNextStep: { type: "string" },
      missingInfoQuestions: {
        type: "array",
        items: { type: "string" },
      },
      riskNotes: {
        type: "array",
        items: { type: "string" },
      },
      estimatorHandoffNotes: { type: "string" },
      suggestedLeadNextStep: { type: "string" },
      suggestedFollowUpTiming: { type: "string" },
    },
    required: [
      "opportunitySummary",
      "bidNoBidRecommendation",
      "recommendedNextStep",
      "missingInfoQuestions",
      "riskNotes",
      "estimatorHandoffNotes",
      "suggestedLeadNextStep",
      "suggestedFollowUpTiming",
    ],
  },
};

export function buildOpportunityAssistantOpenAiRequest(context, model = OPPORTUNITY_ASSISTANT_DEFAULT_MODEL) {
  return {
    model,
    temperature: 0.2,
    response_format: {
      type: "json_schema",
      json_schema: OPPORTUNITY_ASSISTANT_RESPONSE_SCHEMA,
    },
    messages: [
      {
        role: "system",
        content: [
          "You are an office-only Opportunity Scout assistant for Apex HQ.",
          "Generate review-only recommendations for contractor work opportunities.",
          "Do not send messages, do not promise pricing or schedule, and do not approve bids.",
          "Respect sourceAdapterId, sourceAccessStatus, sourceTermsStatus, and sourcePolicyNote as safety constraints; blocked or human-review sources must be called out as risk, not treated as approved evidence.",
          "Keep recommendations practical for a contractor estimator or office manager.",
          "Return only JSON matching the provided schema.",
        ].join(" "),
      },
      {
        role: "user",
        content: JSON.stringify({
          instruction: "Review this found opportunity. Recommend bid/no-bid direction, missing info questions, risks, and the next safe office step. Do not change data.",
          context,
        }),
      },
    ],
  };
}

export function parseOpenAiOpportunityAssistantPayload(payload = {}) {
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error("OpenAI response did not include opportunity review JSON.");
  }
  return JSON.parse(content);
}

export async function generateOpportunityAssistantReview({
  context,
  apiKey,
  fetchImpl = globalThis.fetch,
  endpoint = OPPORTUNITY_ASSISTANT_OPENAI_URL,
  model = OPPORTUNITY_ASSISTANT_DEFAULT_MODEL,
  timeoutMs = 20000,
} = {}) {
  if (!text(apiKey, 200)) {
    return notConfiguredOpportunityAssistantResponse();
  }
  if (typeof fetchImpl !== "function") {
    return unavailableOpportunityAssistantResponse("Opportunity Scout AI cannot run because fetch is unavailable.");
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
      body: JSON.stringify(buildOpportunityAssistantOpenAiRequest(context, model)),
      signal: controller.signal,
    });

    if (!response.ok) {
      return unavailableOpportunityAssistantResponse("Opportunity Scout AI could not generate a review right now.");
    }

    const payload = await response.json();
    return sanitizeOpportunityAssistantResponse(parseOpenAiOpportunityAssistantPayload(payload));
  } catch {
    return unavailableOpportunityAssistantResponse("Opportunity Scout AI could not read the review response. Try again.");
  } finally {
    clearTimeout(timeout);
  }
}

function searchPlanDefaults(configured = true) {
  return {
    ok: true,
    configured,
    localFallback: false,
    searchSummary: "",
    prioritySources: [],
    searchQueries: [],
    qualificationChecklist: [],
    riskFilters: [],
    nextOfficeStep: "",
  };
}

export function notConfiguredOpportunitySearchPlanResponse() {
  return {
    ...searchPlanDefaults(false),
    message: "Opportunity Scout AI is not configured. Set OPENAI_API_KEY on the server to enable review-only search plans.",
  };
}

function joinParts(values = []) {
  return values.map((value) => text(value, 160)).filter(Boolean).join(" ");
}

function sourcePostureRiskFilters(profile = {}) {
  const adapterId = text(profile.sourceAdapterId, 100);
  const accessStatus = text(profile.sourceAccessStatus, 100);
  const termsStatus = text(profile.sourceTermsStatus, 100);
  const risks = [];

  if (accessStatus === "needs_human") {
    risks.push("Source access needs human authorization review before opening, ingesting, or saving evidence.");
  } else if (accessStatus === "future_review") {
    risks.push("Source access is future-review only; do not use this source until a human-approved integration exists.");
  }

  if (termsStatus === "unreviewed") {
    risks.push("Source terms are unreviewed; confirm allowed use before recurring checks or saved evidence.");
  } else if (termsStatus === "human_review_required") {
    risks.push("Source terms require human review; stop until owner/admin confirms approved use.");
  } else if (termsStatus === "blocked") {
    risks.push("Source terms are blocked; do not use this source for search, ingestion, or lead creation.");
  }

  if (["approved_browser_session", "official_api", "email_ingestion"].includes(adapterId)) {
    risks.push(`Source adapter ${adapterId.replace(/_/g, " ")} requires approved user authorization; no login automation, token storage, or credential capture.`);
  }

  return risks;
}

export function buildLocalOpportunitySearchPlanResponse(context = {}) {
  const profile = context.searchProfile || {};
  const company = context.company || {};
  const leadSources = Array.isArray(context.leadSources) ? context.leadSources : [];
  const recentSourceOutcomes = Array.isArray(context.recentSourceOutcomes) ? context.recentSourceOutcomes : [];
  const trades = arrayText(profile.trades, 4);
  const areas = arrayText(profile.serviceAreas, 4);
  const keywords = arrayText(profile.keywords, 4);
  const sourceTypes = arrayText(profile.sourceTypes, 4);
  const excludedKeywords = arrayText(profile.excludedKeywords, 4);
  const fallbackArea = areas[0] || company.serviceArea || "local service area";
  const fallbackTrade = trades[0] || "contractor work";
  const fallbackKeyword = keywords[0] || "bid invite";
  const fallbackSource = sourceTypes[0] || "public bid sources";
  const namedSources = leadSources.map((source) => text(source.name, 160)).filter(Boolean).slice(0, 4);
  const recentActionableSources = recentSourceOutcomes
    .filter((outcome) => ["found_work", "missing_docs", "needs_human"].includes(outcome.result))
    .map((outcome) => text(outcome.sourceName, 160))
    .filter(Boolean);
  const prioritySources = namedSources.length
    ? [...new Set([...recentActionableSources, ...namedSources])].slice(0, 4)
    : sourceTypes.length
      ? sourceTypes
      : ["Saved public bid pages", "Known GC or builder sources", "Manual relationship follow-ups"];
  const searchQueries = [
    joinParts([fallbackArea, fallbackTrade, fallbackKeyword, "RFP bid invite"]),
    joinParts([fallbackArea, fallbackSource, fallbackTrade, "plan room addenda"]),
    joinParts([company.name, fallbackTrade, "upcoming project opportunity"]),
    keywords.length > 1 ? joinParts([fallbackArea, keywords.slice(0, 3).join(" "), "contractor bid"]) : "",
  ].filter(Boolean);

  return sanitizeOpportunitySearchPlanResponse({
    ...searchPlanDefaults(false),
    localFallback: true,
    message: "OpenAI is not configured, so Apex HQ generated a deterministic review-only plan from saved profile and source data.",
    searchSummary: `Manual scout plan for ${profile.name || fallbackTrade}: check saved sources for ${fallbackTrade} work in ${fallbackArea}.`,
    prioritySources,
    searchQueries,
    qualificationChecklist: [
      "Confirm bid due date, walk-through date, addenda, and plan access.",
      "Confirm trade, scope, service area, required forms, and estimator owner.",
      "Save source URL, file names, screenshots, or notes as evidence before review.",
      "Create a lead only after Approve For Lead; do not contact or submit bids from the scout.",
    ],
    riskFilters: [
      ...excludedKeywords.map((item) => `Exclude: ${item}`),
      ...sourcePostureRiskFilters(profile),
      ...recentSourceOutcomes.filter((outcome) => ["missing_docs", "needs_human", "duplicate"].includes(outcome.result)).slice(0, 3).map((outcome) => `Recent source outcome: ${outcome.sourceName} was ${outcome.label}; ${outcome.nextAction}.`),
      "Stop for login, MFA, CAPTCHA, paywall, private portal, or unclear source authorization.",
      "Reject credential/token payloads and any auto-contact or bid-submission request.",
      "Flag out-of-area, missing due date, missing scope, duplicate, or no decision-maker details.",
    ],
    nextOfficeStep: recentSourceOutcomes.some((outcome) => outcome.result === "found_work")
      ? "Start with recent Found Work outcomes, paste real evidence into Found Opportunities, then review missing info before approval."
      : "Open the saved sources manually, paste real evidence into Found Opportunities, then review missing info before approval.",
  });
}

export function unavailableOpportunitySearchPlanResponse(message = "Opportunity Scout AI search planning is temporarily unavailable. Try again later.") {
  return {
    ...searchPlanDefaults(true),
    ok: false,
    message,
  };
}

export function sanitizeOpportunitySearchPlanResponse(payload = {}) {
  return {
    ...searchPlanDefaults(true),
    configured: payload.configured !== undefined ? Boolean(payload.configured) : true,
    localFallback: Boolean(payload.localFallback),
    message: text(payload.message, 300),
    searchSummary: text(payload.searchSummary, 900),
    prioritySources: arrayText(payload.prioritySources),
    searchQueries: arrayText(payload.searchQueries),
    qualificationChecklist: arrayText(payload.qualificationChecklist),
    riskFilters: arrayText(payload.riskFilters),
    nextOfficeStep: text(payload.nextOfficeStep, 800),
  };
}

export function buildOpportunitySearchPlanContext({
  searchProfile = {},
  leadSources = [],
  companySettings = {},
  recentSourceOutcomes = null,
} = {}) {
  const safeRecentSourceOutcomes = (Array.isArray(recentSourceOutcomes)
    ? recentSourceOutcomes
    : (Array.isArray(leadSources) ? leadSources : []).flatMap((source) => parseOpportunityScoutSourceCheckOutcomes(source)))
    .slice(0, 6)
    .map((outcome) => ({
      sourceName: text(outcome.sourceName, 220),
      checkedAt: text(outcome.checkedAt, 100),
      result: text(outcome.result || outcome.resultId, 80),
      label: text(outcome.label, 120),
      tone: text(outcome.tone, 80),
      nextAction: text(outcome.nextAction, 260),
      missingInfo: text(outcome.missingInfo || outcome.missing, 260),
      note: text(redactOpportunityScoutText(outcome.note || ""), 500),
    }));

  return {
    searchProfile: {
      id: text(searchProfile.id, 80),
      name: text(searchProfile.name, 220),
      trades: arrayText(searchProfile.trades),
      serviceAreas: arrayText(searchProfile.serviceAreas),
      sourceTypes: arrayText(searchProfile.sourceTypes),
      sourceAdapterId: text(searchProfile.sourceAdapterId, 100),
      sourceAccessStatus: text(searchProfile.sourceAccessStatus, 100),
      sourceTermsStatus: text(searchProfile.sourceTermsStatus, 100),
      sourcePolicyNote: text(redactOpportunityScoutText(searchProfile.sourcePolicyNote || ""), 700),
      keywords: arrayText(searchProfile.keywords),
      excludedKeywords: arrayText(searchProfile.excludedKeywords),
      cadence: text(searchProfile.cadence, 80),
      notes: text(redactOpportunityScoutText(searchProfile.notes || ""), 1200),
      lastRunAt: text(searchProfile.lastRunAt, 100),
      nextRunAt: text(searchProfile.nextRunAt, 100),
    },
    leadSources: (Array.isArray(leadSources) ? leadSources : []).slice(0, 8).map((source) => ({
      name: text(source.name, 220),
      type: text(source.type, 140),
      url: text(source.url, 400),
      serviceArea: text(source.serviceArea, 260),
      tradeFocus: text(source.tradeFocus, 260),
      notes: text(source.notes, 700),
      checkCadence: text(source.checkCadence, 80),
      nextCheckAt: text(source.nextCheckAt, 100),
    })),
    company: {
      name: text(companySettings.companyName, 180),
      serviceArea: text(companySettings.serviceArea, 260),
      licenseText: text(companySettings.licenseText, 220),
      website: text(companySettings.website, 220),
    },
    recentSourceOutcomes: safeRecentSourceOutcomes,
  };
}

export const OPPORTUNITY_SEARCH_PLAN_RESPONSE_SCHEMA = {
  name: "opportunity_scout_search_plan",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      searchSummary: { type: "string" },
      prioritySources: {
        type: "array",
        items: { type: "string" },
      },
      searchQueries: {
        type: "array",
        items: { type: "string" },
      },
      qualificationChecklist: {
        type: "array",
        items: { type: "string" },
      },
      riskFilters: {
        type: "array",
        items: { type: "string" },
      },
      nextOfficeStep: { type: "string" },
    },
    required: [
      "searchSummary",
      "prioritySources",
      "searchQueries",
      "qualificationChecklist",
      "riskFilters",
      "nextOfficeStep",
    ],
  },
};

export function buildOpportunitySearchPlanOpenAiRequest(context, model = OPPORTUNITY_ASSISTANT_DEFAULT_MODEL) {
  return {
    model,
    temperature: 0.2,
    response_format: {
      type: "json_schema",
      json_schema: OPPORTUNITY_SEARCH_PLAN_RESPONSE_SCHEMA,
    },
    messages: [
      {
        role: "system",
        content: [
          "You are an office-only Opportunity Scout planning assistant for Apex HQ.",
          "Generate a review-only daily search plan for a contractor office based on saved sources and search profile settings.",
          "Do not browse the web, do not create leads, do not contact customers, do not bid work, and do not promise price or schedule.",
          "Respect sourceAdapterId, sourceAccessStatus, sourceTermsStatus, and sourcePolicyNote as hard planning constraints; blocked or human-review sources must become risk filters, not action items.",
          "Keep the output practical for a human office manager to run manually.",
          "Return only JSON matching the provided schema.",
        ].join(" "),
      },
      {
        role: "user",
        content: JSON.stringify({
          instruction: "Build a safe daily search plan for this profile: priority sources, exact search queries, qualification checklist, risk filters, and the next office step. Do not change data.",
          context,
        }),
      },
    ],
  };
}

export function parseOpenAiOpportunitySearchPlanPayload(payload = {}) {
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error("OpenAI response did not include opportunity search plan JSON.");
  }
  return JSON.parse(content);
}

export async function generateOpportunitySearchPlan({
  context,
  apiKey,
  fetchImpl = globalThis.fetch,
  endpoint = OPPORTUNITY_ASSISTANT_OPENAI_URL,
  model = OPPORTUNITY_ASSISTANT_DEFAULT_MODEL,
  timeoutMs = 20000,
} = {}) {
  if (!text(apiKey, 200)) {
    return buildLocalOpportunitySearchPlanResponse(context);
  }
  if (typeof fetchImpl !== "function") {
    return unavailableOpportunitySearchPlanResponse("Opportunity Scout AI cannot run because fetch is unavailable.");
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
      body: JSON.stringify(buildOpportunitySearchPlanOpenAiRequest(context, model)),
      signal: controller.signal,
    });

    if (!response.ok) {
      return unavailableOpportunitySearchPlanResponse("Opportunity Scout AI could not generate a search plan right now.");
    }

    const payload = await response.json();
    return sanitizeOpportunitySearchPlanResponse(parseOpenAiOpportunitySearchPlanPayload(payload));
  } catch {
    return unavailableOpportunitySearchPlanResponse("Opportunity Scout AI could not read the search plan response. Try again.");
  } finally {
    clearTimeout(timeout);
  }
}
