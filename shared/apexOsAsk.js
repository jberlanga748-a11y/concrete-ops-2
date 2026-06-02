import { buildApexOsMemoryContext } from "./apexOsMemory.js";

export const APEX_OS_ASK_DEFAULT_MODEL = "gpt-4o-mini";
export const APEX_OS_ASK_OPENAI_URL = "https://api.openai.com/v1/chat/completions";

const TEXT_LIMIT = 2400;
const QUESTION_LIMIT = 1000;

function text(value = "", limit = TEXT_LIMIT) {
  return String(value ?? "").replace(/\s+\n/g, "\n").replace(/\s+/g, " ").trim().slice(0, limit);
}

function riskyWarnings(question = "") {
  const normalized = text(question, QUESTION_LIMIT).toLowerCase();
  const warnings = [];
  if (/\bdeploy|rollback|production|release\b/.test(normalized)) warnings.push("Production/release action requires an approval packet and release gate.");
  if (/\bschema|auth|session|database|migration|provider|api key|openai|speech|voice provider\b/.test(normalized)) warnings.push("Schema, auth/session, provider, API, and speech work require scoped approval.");
  if (/\bemail|sms|text|send|publish|ad spend|ads?|payment|billing|invoice|charge|delete|remove\b/.test(normalized)) warnings.push("Money, sends, publishing, billing, deletion, and customer-visible actions require exact approval before execution.");
  return [...new Set(warnings)];
}

function defaultSources() {
  return [
    {
      id: "apex-os-master-plan",
      title: "Apex OS master plan",
      sourceLabel: "docs/APEX_HQ_APEX_OS_COMMAND_CENTER_MASTER_PLAN.md",
    },
    {
      id: "living-finish-plan",
      title: "Apex HQ living finish plan",
      sourceLabel: "docs/APEX_HQ_LIVING_FINISH_PLAN.md",
    },
    {
      id: "repo-contract",
      title: "Repo operating contract",
      sourceLabel: "AGENTS.md",
    },
  ];
}

export function buildApexOsAskContext({ question = "", companySettings = {}, user = {} } = {}) {
  const memory = buildApexOsMemoryContext(companySettings.apexOsMemory || [], { limit: 10 });
  const sources = [
    ...memory.map((entry, index) => ({
      id: `memory-${index + 1}`,
      title: entry.title,
      sourceLabel: entry.sourceLabel || "Approved Apex OS memory",
      sourceUri: entry.sourceUri || "",
    })),
    ...defaultSources(),
  ];
  return {
    question: text(question, QUESTION_LIMIT),
    operator: {
      id: text(user.id, 80),
      name: text(user.name, 120),
      role: text(user.role, 80),
    },
    memory,
    sources: sources.slice(0, 14),
    approvalWarnings: riskyWarnings(question),
    operatingBoundary: "Answer only. Do not execute deploys, sends, payments, provider changes, schema/auth changes, customer-visible actions, deletion, or production mutations.",
  };
}

export function buildLocalApexOsAnswer(context = {}) {
  const question = text(context.question, QUESTION_LIMIT);
  const memory = Array.isArray(context.memory) ? context.memory : [];
  const memoryLine = memory.length
    ? `I found ${memory.length} approved Apex OS memory item${memory.length === 1 ? "" : "s"} that can guide this.`
    : "I do not have approved durable Apex OS memory for this yet, so I am using the saved Apex OS plan and repo operating contract.";
  const sourceLabels = (Array.isArray(context.sources) ? context.sources : [])
    .map((source) => source.sourceLabel || source.title)
    .filter(Boolean)
    .slice(0, 5);
  const warnings = Array.isArray(context.approvalWarnings) ? context.approvalWarnings : [];

  return {
    ok: true,
    providerConfigured: false,
    answer: [
      memoryLine,
      question
        ? `For "${question}", the safe next step is to prepare or review the work inside Apex OS, keep it source-backed, and stop before any external or irreversible action.`
        : "Ask a specific Apex HQ operating question and I will answer from approved memory and source rows.",
      warnings.length ? `Approval boundary: ${warnings.join(" ")}` : "Approval boundary: no risky action was requested.",
    ].join(" "),
    sourceLabels,
    approvalWarnings: warnings,
    nextAction: warnings.length ? "Prepare approval packet" : "Review source-backed answer",
    mode: "local-source-backed",
  };
}

export const APEX_OS_ASK_RESPONSE_SCHEMA = {
  name: "apex_os_answer",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      answer: { type: "string" },
      sourceLabels: {
        type: "array",
        items: { type: "string" },
      },
      approvalWarnings: {
        type: "array",
        items: { type: "string" },
      },
      nextAction: { type: "string" },
    },
    required: ["answer", "sourceLabels", "approvalWarnings", "nextAction"],
  },
};

export function buildApexOsAskOpenAiRequest(context, model = APEX_OS_ASK_DEFAULT_MODEL) {
  return {
    model,
    temperature: 0.2,
    response_format: {
      type: "json_schema",
      json_schema: APEX_OS_ASK_RESPONSE_SCHEMA,
    },
    messages: [
      {
        role: "system",
        content: [
          "You are Apex OS, John Berlanga's private operating system inside Apex HQ.",
          "Answer from provided sources and approved memory only.",
          "If the request involves deploys, providers, schema/auth, production, money, sends, customer-visible actions, deletion, or irreversible work, label the approval boundary and do not execute anything.",
          "Return only JSON matching the schema.",
        ].join(" "),
      },
      {
        role: "user",
        content: JSON.stringify({ instruction: "Answer this Apex HQ operating question with source labels and approval warnings.", context }),
      },
    ],
  };
}

export function parseOpenAiApexOsAskPayload(payload = {}) {
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error("OpenAI response did not include Apex OS JSON.");
  }
  const parsed = JSON.parse(content);
  return {
    ok: true,
    providerConfigured: true,
    answer: text(parsed.answer, TEXT_LIMIT),
    sourceLabels: (Array.isArray(parsed.sourceLabels) ? parsed.sourceLabels : []).map((entry) => text(entry, 180)).filter(Boolean).slice(0, 8),
    approvalWarnings: (Array.isArray(parsed.approvalWarnings) ? parsed.approvalWarnings : []).map((entry) => text(entry, 260)).filter(Boolean).slice(0, 8),
    nextAction: text(parsed.nextAction, 240),
    mode: "provider-source-backed",
  };
}
