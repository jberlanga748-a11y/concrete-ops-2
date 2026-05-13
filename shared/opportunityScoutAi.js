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
      keywords: arrayText(searchProfile.keywords),
      excludedKeywords: arrayText(searchProfile.excludedKeywords),
      cadence: text(searchProfile.cadence, 80),
      notes: text(searchProfile.notes, 1000),
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
} = {}) {
  return {
    searchProfile: {
      id: text(searchProfile.id, 80),
      name: text(searchProfile.name, 220),
      trades: arrayText(searchProfile.trades),
      serviceAreas: arrayText(searchProfile.serviceAreas),
      sourceTypes: arrayText(searchProfile.sourceTypes),
      keywords: arrayText(searchProfile.keywords),
      excludedKeywords: arrayText(searchProfile.excludedKeywords),
      cadence: text(searchProfile.cadence, 80),
      notes: text(searchProfile.notes, 1200),
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
    return notConfiguredOpportunitySearchPlanResponse();
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
