export const ESTIMATE_ROUGH_NOTES_DEFAULT_MODEL = "gpt-4o-mini";
export const ESTIMATE_ROUGH_NOTES_OPENAI_URL = "https://api.openai.com/v1/chat/completions";

const AI_TEXT_LIMIT = 5000;
const AI_SHORT_TEXT_LIMIT = 700;
const AI_LIST_LIMIT = 10;

function text(value, limit = AI_TEXT_LIMIT) {
  return String(value ?? "").replace(/\s+\n/g, "\n").trim().slice(0, limit);
}

function arrayText(values, limit = AI_LIST_LIMIT) {
  if (!Array.isArray(values)) return [];
  return values.map((value) => text(value, AI_SHORT_TEXT_LIMIT)).filter(Boolean).slice(0, limit);
}

function outputDefaults(configured = true) {
  return {
    ok: true,
    configured,
    suggestedTitle: "",
    scopeOfWork: "",
    inclusions: [],
    exclusions: [],
    assumptions: [],
    scheduleNotes: "",
    clarificationNotes: [],
    customerNotes: "",
    gcProposalSummary: "",
    gcCoverNote: "",
    gcQualifications: "",
    internalReviewNotes: "",
    reviewWarnings: [],
  };
}

export function notConfiguredEstimateRoughNotesResponse() {
  return {
    ...outputDefaults(false),
    message: "AI Rough Notes Helper is not configured. Set OPENAI_API_KEY on the server to enable review-only estimate drafts.",
  };
}

export function unavailableEstimateRoughNotesResponse(message = "AI Rough Notes Helper is temporarily unavailable. Try again later.") {
  return {
    ...outputDefaults(true),
    ok: false,
    message,
  };
}

export function sanitizeEstimateRoughNotesResponse(payload = {}) {
  return {
    ...outputDefaults(true),
    suggestedTitle: text(payload.suggestedTitle, 180),
    scopeOfWork: text(payload.scopeOfWork, 2200),
    inclusions: arrayText(payload.inclusions),
    exclusions: arrayText(payload.exclusions),
    assumptions: arrayText(payload.assumptions),
    scheduleNotes: text(payload.scheduleNotes, 800),
    clarificationNotes: arrayText(payload.clarificationNotes),
    customerNotes: text(payload.customerNotes, 1800),
    gcProposalSummary: text(payload.gcProposalSummary, 1800),
    gcCoverNote: text(payload.gcCoverNote, 1200),
    gcQualifications: text(payload.gcQualifications, 1800),
    internalReviewNotes: text(payload.internalReviewNotes, 1500),
    reviewWarnings: arrayText(payload.reviewWarnings),
  };
}

export function buildEstimateRoughNotesContext({
  roughNotes = "",
  estimate = {},
  companySettings = {},
} = {}) {
  const items = Array.isArray(estimate?.items) ? estimate.items : [];
  return {
    roughNotes: text(roughNotes, AI_TEXT_LIMIT),
    estimate: {
      id: text(estimate?.id, 80),
      title: text(estimate?.title, 220),
      status: text(estimate?.status, 80),
      scopeSummary: text(estimate?.scopeSummary, 1800),
      customerNotes: text(estimate?.customerNotes, 1800),
      lineItems: items.map((item) => ({
        description: text(item?.description, 260),
        quantity: text(item?.quantity, 80),
        unit: text(item?.unit, 80),
      })).filter((item) => item.description || item.quantity || item.unit).slice(0, AI_LIST_LIMIT),
      customer: {
        name: text(estimate?.customer?.name || estimate?.customerName, 220),
        city: text(estimate?.customer?.city || estimate?.city, 120),
      },
      lead: {
        customer: text(estimate?.lead?.customer, 220),
        project: text(estimate?.lead?.project, 500),
        status: text(estimate?.lead?.status, 80),
      },
    },
    company: {
      name: text(companySettings.companyName, 180),
      businessPhone: text(companySettings.businessPhone, 80),
      businessEmail: text(companySettings.businessEmail, 180),
      website: text(companySettings.website, 220),
      serviceArea: text(companySettings.serviceArea, 220),
      licenseText: text(companySettings.licenseText, 220),
    },
  };
}

export const ESTIMATE_ROUGH_NOTES_RESPONSE_SCHEMA = {
  name: "estimate_rough_notes_drafts",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      suggestedTitle: { type: "string" },
      scopeOfWork: { type: "string" },
      inclusions: {
        type: "array",
        items: { type: "string" },
      },
      exclusions: {
        type: "array",
        items: { type: "string" },
      },
      assumptions: {
        type: "array",
        items: { type: "string" },
      },
      scheduleNotes: { type: "string" },
      clarificationNotes: {
        type: "array",
        items: { type: "string" },
      },
      customerNotes: { type: "string" },
      gcProposalSummary: { type: "string" },
      gcCoverNote: { type: "string" },
      gcQualifications: { type: "string" },
      internalReviewNotes: { type: "string" },
      reviewWarnings: {
        type: "array",
        items: { type: "string" },
      },
    },
    required: [
      "suggestedTitle",
      "scopeOfWork",
      "inclusions",
      "exclusions",
      "assumptions",
      "scheduleNotes",
      "clarificationNotes",
      "customerNotes",
      "gcProposalSummary",
      "gcCoverNote",
      "gcQualifications",
      "internalReviewNotes",
      "reviewWarnings",
    ],
  },
};

export function buildEstimateRoughNotesOpenAiRequest(context, model = ESTIMATE_ROUGH_NOTES_DEFAULT_MODEL) {
  return {
    model,
    temperature: 0.2,
    response_format: {
      type: "json_schema",
      json_schema: ESTIMATE_ROUGH_NOTES_RESPONSE_SCHEMA,
    },
    messages: [
      {
        role: "system",
        content: [
          "You are an office-only estimate and GC packet assistant for Apex HQ.",
          "Generate review-only contractor proposal language from rough notes.",
          "Do not send messages, approve estimates, invent pricing, invent quantities, promise schedule, promise warranty, or make legal claims.",
          "Use practical contractor language: clear scope, inclusions, exclusions, assumptions, clarifications, and GC-ready wording.",
          "Return only JSON matching the provided schema.",
        ].join(" "),
      },
      {
        role: "user",
        content: JSON.stringify({
          instruction: "Turn rough contractor notes into clean estimate and GC packet suggestions. Keep wording professional, concise, and practical. If information is missing or risky, put it in clarificationNotes or reviewWarnings instead of inventing it.",
          context,
        }),
      },
    ],
  };
}

export function parseOpenAiEstimateRoughNotesPayload(payload = {}) {
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error("OpenAI response did not include assistant JSON.");
  }
  return JSON.parse(content);
}

export async function generateEstimateRoughNotesDrafts({
  context,
  apiKey,
  fetchImpl = globalThis.fetch,
  endpoint = ESTIMATE_ROUGH_NOTES_OPENAI_URL,
  model = ESTIMATE_ROUGH_NOTES_DEFAULT_MODEL,
  timeoutMs = 20000,
} = {}) {
  if (!text(apiKey, 200)) {
    return notConfiguredEstimateRoughNotesResponse();
  }
  if (typeof fetchImpl !== "function") {
    return unavailableEstimateRoughNotesResponse("AI Rough Notes Helper cannot run because fetch is unavailable.");
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
      body: JSON.stringify(buildEstimateRoughNotesOpenAiRequest(context, model)),
      signal: controller.signal,
    });

    if (!response.ok) {
      return unavailableEstimateRoughNotesResponse("AI Rough Notes Helper could not generate estimate suggestions right now.");
    }

    const payload = await response.json();
    return sanitizeEstimateRoughNotesResponse(parseOpenAiEstimateRoughNotesPayload(payload));
  } catch {
    return unavailableEstimateRoughNotesResponse("AI Rough Notes Helper could not read the draft response. Try again.");
  } finally {
    clearTimeout(timeout);
  }
}
