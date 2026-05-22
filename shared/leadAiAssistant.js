import { buildConstructionAgentTradeContext } from "./constructionTrades.js";
import { buildAgentLearningContext } from "./agentLearningPreferences.js";

export const LEAD_ASSISTANT_DEFAULT_MODEL = "gpt-4o-mini";
export const LEAD_ASSISTANT_OPENAI_URL = "https://api.openai.com/v1/chat/completions";

const AI_TEXT_LIMIT = 4000;
const AI_SHORT_TEXT_LIMIT = 500;
const AI_LIST_LIMIT = 8;

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
    leadSummary: "",
    recommendedNextStep: "",
    missingInfoQuestions: [],
    followUpEmailDraft: "",
    followUpSmsDraft: "",
    callScript: "",
    estimatingHandoffNotes: "",
    riskNotes: [],
    suggestedStatus: "",
    suggestedFollowUpTiming: "",
  };
}

export function notConfiguredLeadAssistantResponse() {
  return {
    ...outputDefaults(false),
    message: "AI Lead Assistant is not configured. Set OPENAI_API_KEY on the server to enable review-only drafts.",
  };
}

export function unavailableLeadAssistantResponse(message = "AI Lead Assistant is temporarily unavailable. Try again later.") {
  return {
    ...outputDefaults(true),
    ok: false,
    message,
  };
}

export function sanitizeLeadAssistantResponse(payload = {}) {
  return {
    ...outputDefaults(true),
    leadSummary: text(payload.leadSummary, 900),
    recommendedNextStep: text(payload.recommendedNextStep, 700),
    missingInfoQuestions: arrayText(payload.missingInfoQuestions),
    followUpEmailDraft: text(payload.followUpEmailDraft, 2200),
    followUpSmsDraft: text(payload.followUpSmsDraft, 600),
    callScript: text(payload.callScript, 1600),
    estimatingHandoffNotes: text(payload.estimatingHandoffNotes, 1800),
    riskNotes: arrayText(payload.riskNotes),
    suggestedStatus: text(payload.suggestedStatus, 80),
    suggestedFollowUpTiming: text(payload.suggestedFollowUpTiming, 180),
  };
}

function safeLeadSourceContext(lead = {}, leadSources = []) {
  const sourceName = text(lead.source, 180).toLowerCase();
  const notes = text(lead.notes, AI_TEXT_LIMIT).toLowerCase();
  const source = (Array.isArray(leadSources) ? leadSources : []).find((entry) => {
    const name = text(entry?.name, 180).toLowerCase();
    return name && (sourceName.includes(name) || notes.includes(name));
  });
  if (!source) return null;
  return {
    name: text(source.name, 180),
    type: text(source.type, 120),
    city: text(source.city, 120),
    state: text(source.state, 60),
    serviceArea: text(source.serviceArea, 220),
    tradeFocus: text(source.tradeFocus, 220),
    notes: text(source.notes, 900),
  };
}

export function buildLeadAssistantContext({ lead = {}, leadSources = [], companySettings = {} } = {}) {
  const leadSource = safeLeadSourceContext(lead, leadSources);
  return {
    lead: {
      id: text(lead.id, 80),
      customer: text(lead.customer || lead.company || lead.contactName, 220),
      trade: text(lead.trade || lead.projectType, 120),
      project: text(lead.project || lead.description, 600),
      city: text(lead.city, 120),
      status: text(lead.status, 80),
      priority: text(lead.priority, 80),
      source: text(lead.source, 180),
      followUpDueAt: text(lead.followUpDueAt, 80),
      nextStep: text(lead.nextStep, 600),
      notes: text(lead.notes, AI_TEXT_LIMIT),
      value: Number(lead.value || 0),
    },
    leadScore: {
      fitScore: Number(lead.fitScore || 0),
      fitLabel: text(lead.fitLabel, 80),
      fitReason: text(lead.fitReason, 700),
      fitRisks: arrayText(lead.fitRisks),
      fitNextStep: text(lead.fitNextStep, 700),
      scoreSource: text(lead.scoreSource, 80),
      scoredAt: text(lead.scoredAt, 80),
    },
    missingInfo: {
      status: text(lead.missingInfoStatus, 80),
      count: Number(lead.missingInfoCount || 0),
      items: Array.isArray(lead.missingInfoItems)
        ? lead.missingInfoItems.map((item) => ({
          label: text(item?.label, 180),
          severity: text(item?.severity, 40),
          reason: text(item?.reason, 400),
        })).filter((item) => item.label).slice(0, AI_LIST_LIMIT)
        : [],
      nextStep: text(lead.missingInfoNextStep, 700),
      checkedAt: text(lead.missingInfoCheckedAt, 80),
    },
    leadSource,
    constructionTrade: buildConstructionAgentTradeContext({
      trade: lead.trade || lead.projectType,
      companySettings,
      lead,
      source: leadSource || {},
    }),
    company: {
      name: text(companySettings.companyName, 180),
      businessPhone: text(companySettings.businessPhone, 80),
      businessEmail: text(companySettings.businessEmail, 180),
      website: text(companySettings.website, 220),
      serviceArea: text(companySettings.serviceArea, 220),
      licenseText: text(companySettings.licenseText, 220),
    },
    agentLearning: buildAgentLearningContext(companySettings.agentLearningPreferences),
  };
}

export const LEAD_ASSISTANT_RESPONSE_SCHEMA = {
  name: "lead_assistant_drafts",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      leadSummary: { type: "string" },
      recommendedNextStep: { type: "string" },
      missingInfoQuestions: {
        type: "array",
        items: { type: "string" },
      },
      followUpEmailDraft: { type: "string" },
      followUpSmsDraft: { type: "string" },
      callScript: { type: "string" },
      estimatingHandoffNotes: { type: "string" },
      riskNotes: {
        type: "array",
        items: { type: "string" },
      },
      suggestedStatus: { type: "string" },
      suggestedFollowUpTiming: { type: "string" },
    },
    required: [
      "leadSummary",
      "recommendedNextStep",
      "missingInfoQuestions",
      "followUpEmailDraft",
      "followUpSmsDraft",
      "callScript",
      "estimatingHandoffNotes",
      "riskNotes",
      "suggestedStatus",
      "suggestedFollowUpTiming",
    ],
  },
};

export function buildLeadAssistantOpenAiRequest(context, model = LEAD_ASSISTANT_DEFAULT_MODEL) {
  return {
    model,
    temperature: 0.2,
    response_format: {
      type: "json_schema",
      json_schema: LEAD_ASSISTANT_RESPONSE_SCHEMA,
    },
    messages: [
      {
        role: "system",
        content: [
          "You are an office-only lead assistant for a contractor operations platform.",
          "Generate review-only drafts. Do not claim an appointment was scheduled, do not send messages, and do not promise pricing.",
          "Use the provided constructionTrade context to adapt missing-info questions, estimate handoff notes, scope language, proof-photo needs, and change-order watchouts to the detected trade.",
          "Keep the tone professional, practical, and concise for a contractor office admin.",
          "Return only JSON matching the provided schema.",
        ].join(" "),
      },
      {
        role: "user",
        content: JSON.stringify({
          instruction: "Draft lead review help from this app context. Ask for missing info clearly. Keep SMS short and non-spammy. Include opt-out language only as draft copy, not as a sent message.",
          context,
        }),
      },
    ],
  };
}

export function parseOpenAiLeadAssistantPayload(payload = {}) {
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error("OpenAI response did not include assistant JSON.");
  }
  return JSON.parse(content);
}

export async function generateLeadAssistantDrafts({
  context,
  apiKey,
  fetchImpl = globalThis.fetch,
  endpoint = LEAD_ASSISTANT_OPENAI_URL,
  model = LEAD_ASSISTANT_DEFAULT_MODEL,
  timeoutMs = 20000,
} = {}) {
  if (!text(apiKey, 200)) {
    return notConfiguredLeadAssistantResponse();
  }
  if (typeof fetchImpl !== "function") {
    return unavailableLeadAssistantResponse("AI Lead Assistant cannot run because fetch is unavailable.");
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
      body: JSON.stringify(buildLeadAssistantOpenAiRequest(context, model)),
      signal: controller.signal,
    });

    if (!response.ok) {
      return unavailableLeadAssistantResponse("AI Lead Assistant could not generate drafts right now.");
    }

    const payload = await response.json();
    return sanitizeLeadAssistantResponse(parseOpenAiLeadAssistantPayload(payload));
  } catch {
    return unavailableLeadAssistantResponse("AI Lead Assistant could not read the draft response. Try again.");
  } finally {
    clearTimeout(timeout);
  }
}
