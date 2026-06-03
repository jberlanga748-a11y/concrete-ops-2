import { buildApexOsMemoryContext } from "./apexOsMemory.js";

export const APEX_OS_ASK_DEFAULT_MODEL = "gpt-4o-mini";
export const APEX_OS_ASK_OPENAI_URL = "https://api.openai.com/v1/chat/completions";
export const APEX_OS_ASK_CONTEXT_SCOPE_VALUES = Object.freeze([
  "app-code",
  "docs-memory",
  "business",
  "launch",
  "agents",
  "all",
]);

const TEXT_LIMIT = 2400;
const QUESTION_LIMIT = 1000;
const TITLE_LIMIT = 140;
const SHORT_LIMIT = 180;

function text(value = "", limit = TEXT_LIMIT) {
  return String(value ?? "").replace(/\s+\n/g, "\n").replace(/\s+/g, " ").trim().slice(0, limit);
}

function normalizeContextScope(value = "all") {
  const normalized = text(value, 40).toLowerCase();
  return APEX_OS_ASK_CONTEXT_SCOPE_VALUES.includes(normalized) ? normalized : "all";
}

function riskyWarnings(question = "") {
  const normalized = text(question, QUESTION_LIMIT).toLowerCase();
  const warnings = [];
  if (/\bdeploy|rollback|production|release\b/.test(normalized)) warnings.push("Production/release action requires an approval packet and release gate.");
  if (/\bschema|auth|session|database|migration|provider|api key|openai|speech|voice provider\b/.test(normalized)) warnings.push("Schema, auth/session, provider, API, and speech work require scoped approval.");
  if (/\bemail|sms|text|send|publish|ad spend|ads?|payment|billing|invoice|charge|delete|remove\b/.test(normalized)) warnings.push("Money, sends, publishing, billing, deletion, and customer-visible actions require exact approval before execution.");
  return [...new Set(warnings)];
}

function memoryScopes(category = "") {
  const normalized = text(category, 80).toLowerCase();
  if (["app-docs"].includes(normalized)) return ["app-code", "docs-memory"];
  if (["business-strategy", "marketing-sales", "customer-research", "brand-design", "product-ideas", "private-owner-notes"].includes(normalized)) return ["business"];
  if (["legal-risk"].includes(normalized)) return ["business", "docs-memory"];
  if (["agent-instruction"].includes(normalized)) return ["agents", "docs-memory"];
  if (["approval-boundary"].includes(normalized)) return ["launch", "docs-memory"];
  if (["roadmap-decision", "operating-rule", "build-freeze", "personal-preference", "business-goal", "decision"].includes(normalized)) return ["docs-memory"];
  return ["docs-memory"];
}

function sourceMatchesScope(source = {}, contextScope = "all") {
  if (contextScope === "all") return true;
  return (source.scopes || []).includes(contextScope);
}

function defaultSources(contextScope = "all") {
  const sources = [
    {
      id: "apex-os-code",
      title: "Apex Control Room implementation",
      sourceLabel: "src/apex-control-room-components.jsx",
      sourceUri: "src/apex-control-room-components.jsx",
      scopes: ["app-code"],
    },
    {
      id: "apex-os-server",
      title: "Apex OS private API routes",
      sourceLabel: "server/index.js",
      sourceUri: "server/index.js",
      scopes: ["app-code"],
    },
    {
      id: "apex-os-master-plan",
      title: "Apex OS master plan",
      sourceLabel: "docs/APEX_HQ_APEX_OS_COMMAND_CENTER_MASTER_PLAN.md",
      sourceUri: "docs/APEX_HQ_APEX_OS_COMMAND_CENTER_MASTER_PLAN.md",
      scopes: ["docs-memory", "business", "launch", "agents"],
    },
    {
      id: "living-finish-plan",
      title: "Apex HQ living finish plan",
      sourceLabel: "docs/APEX_HQ_LIVING_FINISH_PLAN.md",
      sourceUri: "docs/APEX_HQ_LIVING_FINISH_PLAN.md",
      scopes: ["docs-memory", "business", "launch"],
    },
    {
      id: "repo-contract",
      title: "Repo operating contract",
      sourceLabel: "AGENTS.md",
      sourceUri: "AGENTS.md",
      scopes: ["docs-memory", "app-code"],
    },
    {
      id: "agent-os-state",
      title: "Agent OS task and safety state",
      sourceLabel: "shared/agentOperatingSystem.js",
      sourceUri: "shared/agentOperatingSystem.js",
      scopes: ["agents"],
    },
    {
      id: "release-safety",
      title: "Release safety rules",
      sourceLabel: "src/release-safety-utils.js",
      sourceUri: "src/release-safety-utils.js",
      scopes: ["launch", "app-code"],
    },
  ];
  const scoped = sources.filter((source) => sourceMatchesScope(source, contextScope));
  return scoped.length ? scoped : sources.filter((source) => source.scopes.includes("docs-memory"));
}

export function buildApexOsAskEvidenceRows(context = {}) {
  return (Array.isArray(context.sources) ? context.sources : [])
    .map((source, index) => ({
      rank: index + 1,
      id: source.id || `source-${index + 1}`,
      title: text(source.title || source.sourceLabel || `Source ${index + 1}`, SHORT_LIMIT),
      sourceLabel: text(source.sourceLabel || source.title || "", SHORT_LIMIT),
      sourceUri: text(source.sourceUri || "", 260),
      contextScope: context.contextScope || "all",
    }))
    .slice(0, 10);
}

export function buildApexOsAskContext({ question = "", contextScope = "all", companySettings = {}, user = {} } = {}) {
  const normalizedScope = normalizeContextScope(contextScope);
  const memory = buildApexOsMemoryContext(companySettings.apexOsMemory || [], { limit: 16 })
    .map((entry, index) => ({
      ...entry,
      id: entry.id || `memory-${index + 1}`,
      scopes: memoryScopes(entry.category),
    }))
    .filter((entry) => sourceMatchesScope(entry, normalizedScope))
    .slice(0, 10);
  const sources = [
    ...memory.map((entry, index) => ({
      id: `memory-${index + 1}`,
      title: entry.title,
      sourceLabel: entry.sourceLabel || "Approved Apex OS memory",
      sourceUri: entry.sourceUri || "",
      scopes: entry.scopes || ["docs-memory"],
    })),
    ...defaultSources(normalizedScope),
  ].map((source, index) => ({ ...source, rank: index + 1 }));
  return {
    question: text(question, QUESTION_LIMIT),
    contextScope: normalizedScope,
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

function askTitle(prefix = "Ask Apex", question = "") {
  const normalized = text(question, 90).replace(/[.!?]+$/g, "");
  return text(`${prefix}: ${normalized || "Source-backed answer"}`, TITLE_LIMIT);
}

function askSourceUri(requestId = "", suffix = "answer") {
  const id = text(requestId, 90) || "manual";
  return `ask-apex:${id}:${suffix}`;
}

function answerText(answer = {}) {
  if (typeof answer === "string") return text(answer, 1600);
  return text(answer.answer || "", 1600);
}

export function inferApexOsAskApprovalCategory(answer = {}) {
  const haystack = [
    answer?.answer,
    answer?.nextAction,
    ...(Array.isArray(answer?.approvalWarnings) ? answer.approvalWarnings : []),
  ].join(" ").toLowerCase();
  if (/\bdeploy|rollback|release|production\b/.test(haystack)) return "deploy";
  if (/\bschema|auth|session|database|migration\b/.test(haystack)) return "schema-auth-session";
  if (/\bemail|sms|text|send\b/.test(haystack)) return "email-sms";
  if (/\bbilling|payment|invoice|charge\b/.test(haystack)) return "billing-payment";
  if (/\bad spend|ads?|publish\b/.test(haystack)) return "ad-spend-publishing";
  if (/\bprovider|openai|speech|voice\b/.test(haystack)) return "provider-connection";
  if (/\bdelete|remove\b/.test(haystack)) return "file-deletion";
  if (/\bcustomer-visible|customer facing|public\b/.test(haystack)) return "customer-visible";
  return "general";
}

export function buildApexOsAskDecisionDraft({ question = "", answer = {}, requestId = "" } = {}) {
  return {
    category: "decision",
    title: askTitle("Ask Apex decision", question),
    body: text(`Question: ${text(question, 700)} Answer: ${answerText(answer)}`, 1800),
    sourceType: "ask-apex-chat",
    sourceLabel: "Ask Apex chat",
    sourceUri: askSourceUri(requestId, "decision"),
    status: "suggested",
    reviewNote: "Suggested from Ask Apex answer; manual review required before trusted memory.",
    confidence: 70,
  };
}

export function buildApexOsAskTaskPacketDraft({ question = "", answer = {}, requestId = "" } = {}) {
  const responseText = answerText(answer);
  return {
    title: askTitle("Ask Apex task", question),
    requestedActionCategory: "business-operations",
    riskLevel: "medium",
    action: text(`Review this source-backed Ask Apex task draft: ${responseText}`, 1800),
    reason: "John asked Ask Apex for operating guidance and may want to track the next manual work item.",
    affectedScope: "Apex OS planning only. This draft does not run agents, change production, contact customers, or modify external systems.",
    validationPlan: "Review the source labels and decide whether this belongs in the next phase plan.",
    rollbackPlan: "Archive this draft packet if it is not useful.",
    exactApprovalPhrase: "",
    sourceLabel: "Ask Apex chat",
    sourceUri: askSourceUri(requestId, "task"),
    status: "draft",
    operatorNote: text(`Original question: ${question}`, 420),
  };
}

export function buildApexOsAskApprovalPacketDraft({ question = "", answer = {}, requestId = "" } = {}) {
  const warnings = Array.isArray(answer?.approvalWarnings) ? answer.approvalWarnings : [];
  return {
    title: askTitle("Ask Apex approval", question),
    requestedActionCategory: inferApexOsAskApprovalCategory(answer),
    riskLevel: warnings.length ? "high" : "medium",
    action: text(`Review approval need from Ask Apex answer: ${answerText(answer)}`, 1800),
    reason: warnings.length ? warnings.join(" ") : "Ask Apex marked this answer for manual approval review.",
    affectedScope: "Approval review only. No deploy, send, spend, billing, provider, customer-visible, deletion, or production mutation is executed.",
    validationPlan: "Confirm source labels, affected scope, rollback path, and exact approval wording before any later action.",
    rollbackPlan: "Archive this draft packet if approval is not needed.",
    exactApprovalPhrase: "",
    sourceLabel: "Ask Apex chat",
    sourceUri: askSourceUri(requestId, "approval"),
    status: "draft",
    operatorNote: text(`Original question: ${question}`, 420),
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
