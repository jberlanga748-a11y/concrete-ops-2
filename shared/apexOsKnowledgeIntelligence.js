import {
  APEX_OS_KNOWLEDGE_CATEGORY_VALUES,
  isApexOsDecisionCategory,
  isApexOsKnowledgeCategory,
  normalizeApexOsMemory,
} from "./apexOsMemory.js";

export const APEX_OS_KNOWLEDGE_INTELLIGENCE_MODEL = "gpt-4o-mini";
export const APEX_OS_KNOWLEDGE_DATE_RANGE_VALUES = Object.freeze([
  "all",
  "last-7-days",
  "last-30-days",
  "last-90-days",
  "missing-date",
]);

const TEXT_LIMIT = 1800;
const SHORT_LIMIT = 180;
const QUERY_LIMIT = 260;

function text(value = "", limit = TEXT_LIMIT) {
  return String(value ?? "").replace(/\s+\n/g, "\n").replace(/\s+/g, " ").trim().slice(0, limit);
}

function normalizeDateRange(value = "all") {
  const normalized = text(value, 40).toLowerCase();
  return APEX_OS_KNOWLEDGE_DATE_RANGE_VALUES.includes(normalized) ? normalized : "all";
}

function normalizeCategory(value = "all") {
  const normalized = text(value, 80).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return normalized === "all" || APEX_OS_KNOWLEDGE_CATEGORY_VALUES.includes(normalized) ? normalized : "all";
}

function normalizeStatus(value = "all") {
  const normalized = text(value, 40).toLowerCase();
  return ["all", "suggested", "approved", "archived"].includes(normalized) ? normalized : "all";
}

function rowTimestamp(row = {}) {
  const raw = row.updatedAt || row.approvedAt || row.createdAt || "";
  const timestamp = Date.parse(raw);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function dateRangeStart(dateRange = "all", now = new Date()) {
  const normalized = normalizeDateRange(dateRange);
  if (normalized === "last-7-days") return now.getTime() - 7 * 24 * 60 * 60 * 1000;
  if (normalized === "last-30-days") return now.getTime() - 30 * 24 * 60 * 60 * 1000;
  if (normalized === "last-90-days") return now.getTime() - 90 * 24 * 60 * 60 * 1000;
  return 0;
}

function matchesDateRange(row = {}, dateRange = "all", now = new Date()) {
  const normalized = normalizeDateRange(dateRange);
  const timestamp = rowTimestamp(row);
  if (normalized === "missing-date") return !timestamp;
  if (normalized === "all") return true;
  return timestamp >= dateRangeStart(normalized, now);
}

function tokenize(value = "") {
  return [...new Set(text(value, QUERY_LIMIT).toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length >= 3))];
}

function fieldMatches(row = {}, tokens = []) {
  const fields = {
    title: row.title,
    body: row.body,
    sourceLabel: row.sourceLabel,
    sourceUri: row.sourceUri,
    reviewNote: row.reviewNote,
    category: row.category,
  };
  return Object.entries(fields)
    .map(([field, value]) => ({
      field,
      hits: tokens.filter((token) => text(value, TEXT_LIMIT).toLowerCase().includes(token)).length,
    }))
    .filter((entry) => entry.hits > 0);
}

function confidenceLabel(score = 0) {
  if (score >= 80) return "High";
  if (score >= 55) return "Medium";
  return "Low";
}

export function buildApexOsKnowledgeDocumentSummary(row = {}) {
  const body = text(row.body, 900);
  const reviewNote = text(row.reviewNote, 300);
  const firstSentence = body.split(/(?<=[.!?])\s+/).find(Boolean) || body;
  const summary = reviewNote && !/summary pending/i.test(reviewNote)
    ? reviewNote
    : firstSentence || "No reviewed summary is available yet.";
  return {
    id: row.id || "",
    title: text(row.title || row.sourceLabel || "Knowledge row", SHORT_LIMIT),
    summary: text(summary, 360),
    status: row.status === "approved" ? "trusted" : row.status || "suggested",
    category: row.category || "app-docs",
    sourceLabel: text(row.sourceLabel || "Missing source", SHORT_LIMIT),
    sourceUri: text(row.sourceUri || "", 260),
    updatedAt: row.updatedAt || row.createdAt || "",
  };
}

export function rankApexOsKnowledgeSources(value = [], {
  query = "",
  category = "all",
  source = "all",
  status = "all",
  dateRange = "all",
  limit = 8,
  now = new Date(),
} = {}) {
  const memory = normalizeApexOsMemory(value).filter((entry) => isApexOsKnowledgeCategory(entry.category) || (entry.status === "approved" && isApexOsDecisionCategory(entry.category)));
  const normalizedCategory = normalizeCategory(category);
  const normalizedStatus = normalizeStatus(status);
  const normalizedSource = text(source, SHORT_LIMIT).toLowerCase();
  const normalizedQuery = text(query, QUERY_LIMIT);
  const tokens = tokenize(normalizedQuery);

  return memory
    .filter((row) => normalizedCategory === "all" || row.category === normalizedCategory)
    .filter((row) => normalizedStatus === "all" || row.status === normalizedStatus)
    .filter((row) => source === "all" || [row.sourceLabel, row.sourceType, row.sourceUri].some((value) => text(value, 260).toLowerCase().includes(normalizedSource)))
    .filter((row) => matchesDateRange(row, dateRange, now))
    .map((row) => {
      const matches = fieldMatches(row, tokens);
      const hasQuery = tokens.length > 0;
      const queryScore = hasQuery
        ? matches.reduce((total, entry) => total + entry.hits * (entry.field === "title" ? 22 : entry.field === "body" ? 14 : 9), 0)
        : 16;
      const trustBoost = row.status === "approved" ? 26 : row.status === "suggested" ? 10 : -12;
      const sourceBoost = row.sourceLabel && row.sourceUri ? 10 : row.sourceLabel ? 6 : 0;
      const summaryBoost = row.reviewNote && !/summary pending/i.test(row.reviewNote) ? 8 : 0;
      const ageMs = rowTimestamp(row) ? Math.max(0, now.getTime() - rowTimestamp(row)) : 999 * 24 * 60 * 60 * 1000;
      const recencyBoost = ageMs <= 30 * 24 * 60 * 60 * 1000 ? 12 : ageMs <= 90 * 24 * 60 * 60 * 1000 ? 6 : 0;
      const relevanceScore = Math.max(0, Math.min(100, queryScore + trustBoost + sourceBoost + summaryBoost + recencyBoost));
      return {
        rank: 0,
        id: row.id,
        title: row.title,
        category: row.category,
        status: row.status,
        sourceLabel: row.sourceLabel,
        sourceUri: row.sourceUri,
        updatedAt: row.updatedAt || row.createdAt || "",
        relevanceScore,
        confidenceLabel: confidenceLabel(relevanceScore),
        matchedFields: matches.map((entry) => entry.field),
        documentSummary: buildApexOsKnowledgeDocumentSummary(row),
        entry: row,
      };
    })
    .filter((row) => !tokens.length || row.matchedFields.length)
    .sort((left, right) => right.relevanceScore - left.relevanceScore || rowTimestamp(right.entry) - rowTimestamp(left.entry))
    .slice(0, Math.max(1, Math.min(16, Number(limit) || 8)))
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

const CURRENT_TRUTH_CONFLICT_RULES = Object.freeze([
  {
    id: "manual-review-before-trust",
    title: "Unreviewed knowledge cannot become trusted automatically",
    pattern: /\b(auto(?:matically)?[- ]?(?:approve|trust)|trusted automatically|skip review|override current repo truth)\b/i,
    detail: "No uploaded document silently overrides current repo truth; suggested knowledge needs manual approval first.",
    sourceLabel: "Phase 13 non-goal",
  },
  {
    id: "field-private-boundary",
    title: "Field users cannot see office-private data",
    pattern: /\b(field users?|foremen|employees).{0,80}\b(see|view|access|open).{0,80}\b(leads?|estimates?|pricing|profit|margins?|payroll|billing|admin settings|ai office)\b/i,
    detail: "Field users remain blocked from leads, estimates, pricing, profit/margins, payroll, billing, admin settings, AI office tools, and other company data.",
    sourceLabel: "AGENTS.md field-role protection",
  },
  {
    id: "external-action-boundary",
    title: "External actions require approval",
    pattern: /\b(auto(?:matically)?|without approval|silently).{0,80}\b(send|email|sms|text|publish|ad spend|charge|invoice|payment|deploy|rollback|delete|provider write)\b/i,
    detail: "Sends, publishing, ad spend, payments, deploys, provider writes, deletion, and customer-visible actions require explicit approval gates.",
    sourceLabel: "Apex HQ operating rules",
  },
  {
    id: "secret-storage-boundary",
    title: "Knowledge cannot store secrets",
    pattern: /\b(store|save|remember).{0,80}\b(passwords?|api keys?|tokens?|session cookies?|mfa|credentials?)\b/i,
    detail: "Apex OS memory rejects secrets, tokens, passwords, provider keys, and customer emails.",
    sourceLabel: "Apex OS memory safety rules",
  },
]);

function conflictTopic(value = "") {
  const normalized = text(value, TEXT_LIMIT).toLowerCase();
  const topics = [];
  if (/\bemail|sms|text|send|publish|ad spend|ads?\b/.test(normalized)) topics.push("sends-publishing");
  if (/\bpayment|billing|invoice|charge|checkout\b/.test(normalized)) topics.push("billing-payment");
  if (/\bdeploy|rollback|production|release\b/.test(normalized)) topics.push("production-release");
  if (/\bfield|foreman|employee|pricing|profit|margin|payroll\b/.test(normalized)) topics.push("field-private-data");
  if (/\bknowledge|memory|trust|approve|review|source\b/.test(normalized)) topics.push("knowledge-trust");
  if (/\balways listening|microphone|voice|speech\b/.test(normalized)) topics.push("voice-privacy");
  return topics;
}

function policyPolarity(value = "") {
  const normalized = text(value, TEXT_LIMIT).toLowerCase();
  const blocked = /\b(no|never|blocked|locked|manual|review[- ]first|requires approval|do not|don't|cannot|can't|must not)\b/.test(normalized);
  const allowed = /\b(can|allow|enabled|automatic|automatically|without approval|skip review|always)\b/.test(normalized);
  if (blocked && !allowed) return "blocked";
  if (allowed && !blocked) return "allowed";
  if (blocked && allowed) return "mixed";
  return "neutral";
}

function rowsAreRelated(left = {}, right = {}) {
  if (left.category !== right.category) return false;
  const leftTopics = new Set(conflictTopic(`${left.title} ${left.body} ${left.reviewNote}`));
  const rightTopics = new Set(conflictTopic(`${right.title} ${right.body} ${right.reviewNote}`));
  const sharedTopic = [...leftTopics].some((topic) => rightTopics.has(topic));
  const sharedSource = left.sourceLabel && right.sourceLabel && text(left.sourceLabel).toLowerCase() === text(right.sourceLabel).toLowerCase();
  const sharedTitleTerm = tokenize(left.title).some((token) => tokenize(right.title).includes(token));
  return sharedTopic && (sharedSource || sharedTitleTerm);
}

export function detectApexOsKnowledgeConflicts(value = []) {
  const rows = normalizeApexOsMemory(value)
    .filter((entry) => isApexOsKnowledgeCategory(entry.category) || isApexOsDecisionCategory(entry.category))
    .filter((entry) => entry.status !== "archived");
  const warnings = [];

  for (const row of rows) {
    const haystack = `${row.title} ${row.body} ${row.reviewNote}`;
    for (const rule of CURRENT_TRUTH_CONFLICT_RULES) {
      if (rule.pattern.test(haystack)) {
        warnings.push({
          id: `${rule.id}-${row.id}`,
          severity: row.status === "approved" ? "high" : "medium",
          title: rule.title,
          detail: `This conflicts with current Apex HQ operating rules: ${rule.detail}`,
          sourceLabel: rule.sourceLabel,
          rowId: row.id,
          rowTitle: row.title,
          rowStatus: row.status,
          trustedImpact: row.status === "approved" ? "Review and archive or correct this trusted row." : "Suggested row is not trusted and should be corrected or archived before approval.",
        });
      }
    }
  }

  const sorted = rows
    .slice()
    .sort((left, right) => rowTimestamp(right) - rowTimestamp(left));
  for (let index = 0; index < sorted.length; index += 1) {
    const current = sorted[index];
    const currentPolarity = policyPolarity(`${current.title} ${current.body} ${current.reviewNote}`);
    if (!["allowed", "blocked"].includes(currentPolarity)) continue;
    const older = sorted.slice(index + 1).find((candidate) => {
      const olderPolarity = policyPolarity(`${candidate.title} ${candidate.body} ${candidate.reviewNote}`);
      return ["allowed", "blocked"].includes(olderPolarity) && olderPolarity !== currentPolarity && rowsAreRelated(current, candidate);
    });
    if (older) {
      warnings.push({
        id: `older-memory-conflict-${current.id}-${older.id}`,
        severity: "medium",
        title: "This conflicts with older memory",
        detail: `${current.title} conflicts with older ${older.status === "approved" ? "trusted" : older.status} memory: ${older.title}. Review both source labels before treating either as operational truth.`,
        sourceLabel: current.sourceLabel || older.sourceLabel || "Apex OS memory",
        rowId: current.id,
        rowTitle: current.title,
        rowStatus: current.status,
        olderRowId: older.id,
        olderRowTitle: older.title,
        trustedImpact: "Resolve the older/newer memory conflict before approving or relying on this knowledge.",
      });
    }
  }

  return warnings.slice(0, 10);
}

export function buildApexOsKnowledgeIntelligence(value = [], options = {}) {
  const allRows = normalizeApexOsMemory(value).filter((entry) => isApexOsKnowledgeCategory(entry.category) || (entry.status === "approved" && isApexOsDecisionCategory(entry.category)));
  const rankedRows = rankApexOsKnowledgeSources(value, options);
  const conflictWarnings = detectApexOsKnowledgeConflicts(value)
    .filter((warning) => rankedRows.length ? rankedRows.some((row) => row.id === warning.rowId) || warning.severity === "high" : true)
    .slice(0, 8);
  const summaryRows = rankedRows.slice(0, 6).map((row) => row.documentSummary);
  const trustedCount = allRows.filter((row) => row.status === "approved").length;
  const suggestedCount = allRows.filter((row) => row.status === "suggested").length;

  return {
    ok: true,
    status: trustedCount ? "Source-ranked" : "Needs trusted sources",
    searchMode: "local-lexical",
    embeddingStatus: "Blocked until private vector storage/schema is approved.",
    totalRows: allRows.length,
    trustedCount,
    suggestedCount,
    rankedRows,
    summaryRows,
    conflictWarnings,
    confidenceRows: rankedRows.slice(0, 4).map((row) => ({
      id: row.id,
      title: row.title,
      confidence: row.relevanceScore,
      confidenceLabel: row.confidenceLabel,
      sourceLabel: row.sourceLabel,
    })),
    safetyLocks: [
      "Suggested knowledge cannot become trusted automatically.",
      "Customer/public knowledge does not mix into Apex OS.",
      "No embeddings/vector index is created without schema/provider approval.",
      "No uploaded document overrides current repo truth without review.",
    ],
  };
}

export const APEX_OS_KNOWLEDGE_RESPONSE_SCHEMA = {
  name: "apex_os_knowledge_intelligence",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      providerSummary: { type: "string" },
      classifications: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            title: { type: "string" },
            sourceLabel: { type: "string" },
            category: { type: "string" },
            confidenceLabel: { type: "string" },
            reason: { type: "string" },
          },
          required: ["title", "sourceLabel", "category", "confidenceLabel", "reason"],
        },
      },
    },
    required: ["providerSummary", "classifications"],
  },
};

export function buildApexOsKnowledgeOpenAiRequest(intelligence = {}, model = APEX_OS_KNOWLEDGE_INTELLIGENCE_MODEL) {
  const rows = (Array.isArray(intelligence.rankedRows) ? intelligence.rankedRows : []).slice(0, 6).map((row) => ({
    title: row.title,
    category: row.category,
    status: row.status,
    sourceLabel: row.sourceLabel,
    summary: row.documentSummary?.summary || "",
    confidenceLabel: row.confidenceLabel,
  }));
  return {
    model,
    temperature: 0.2,
    response_format: {
      type: "json_schema",
      json_schema: APEX_OS_KNOWLEDGE_RESPONSE_SCHEMA,
    },
    messages: [
      {
        role: "system",
        content: [
          "You summarize Apex OS private knowledge intelligence.",
          "Use only the provided ranked source rows.",
          "Do not trust suggested knowledge automatically.",
          "Do not recommend customer-visible, provider, send, spend, billing, production, schema, auth, deletion, or irreversible actions.",
          "Return only JSON matching the schema.",
        ].join(" "),
      },
      {
        role: "user",
        content: JSON.stringify({
          instruction: "Summarize the trusted source posture and classify the ranked rows.",
          rows,
          conflictWarnings: (intelligence.conflictWarnings || []).map((warning) => ({
            title: warning.title,
            detail: warning.detail,
            rowTitle: warning.rowTitle,
          })),
        }),
      },
    ],
  };
}

export function parseOpenAiApexOsKnowledgePayload(payload = {}) {
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error("OpenAI response did not include Apex OS knowledge JSON.");
  }
  const parsed = JSON.parse(content);
  return {
    ok: true,
    providerConfigured: true,
    mode: "provider-knowledge-summary",
    providerSummary: text(parsed.providerSummary, 900),
    classifications: (Array.isArray(parsed.classifications) ? parsed.classifications : []).map((row) => ({
      title: text(row.title, SHORT_LIMIT),
      sourceLabel: text(row.sourceLabel, SHORT_LIMIT),
      category: text(row.category, 80),
      confidenceLabel: text(row.confidenceLabel, 40),
      reason: text(row.reason, 260),
    })).filter((row) => row.title).slice(0, 8),
  };
}
