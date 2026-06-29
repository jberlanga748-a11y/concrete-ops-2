import {
  normalizeApexOsMemory,
  normalizeApexOsMemoryType,
} from "./apexOsMemory.js";

export const APEX_MEMORY_RETRIEVAL_PHASE = "Memory Retrieval + Compaction v0";
export const APEX_MEMORY_RETRIEVAL_ENGINE_ID = "apex-memory-retrieval-compaction-v0";

const TEXT_LIMIT = 1800;
const SHORT_LIMIT = 180;
const SUMMARY_LIMIT = 700;
const SNIPPET_LIMIT = 320;

const CONTEXT_SCOPE_VALUES = new Set(["app-code", "docs-memory", "business", "launch", "agents", "all"]);
const STOP_WORDS = new Set([
  "about",
  "after",
  "again",
  "apex",
  "are",
  "because",
  "before",
  "can",
  "could",
  "did",
  "does",
  "for",
  "from",
  "have",
  "how",
  "into",
  "just",
  "like",
  "need",
  "next",
  "that",
  "the",
  "this",
  "what",
  "when",
  "where",
  "with",
  "you",
  "your",
]);

function text(value = "", limit = TEXT_LIMIT) {
  return String(value ?? "").replace(/\s+\n/g, "\n").replace(/\s+/g, " ").trim().slice(0, limit);
}

function normalizeContextScope(value = "all") {
  const normalized = text(value, 40).toLowerCase();
  return CONTEXT_SCOPE_VALUES.has(normalized) ? normalized : "all";
}

function tokenize(value = "") {
  return [...new Set(text(value, TEXT_LIMIT)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token)))]
    .slice(0, 24);
}

function memoryScopes(category = "") {
  const normalized = text(category, 80).toLowerCase();
  if (["app-docs"].includes(normalized)) return ["app-code", "docs-memory"];
  if (["business-strategy", "marketing-sales", "customer-research", "brand-design", "product-ideas", "private-owner-notes"].includes(normalized)) return ["business"];
  if (["legal-risk"].includes(normalized)) return ["business", "docs-memory"];
  if (["john-business", "business-goal", "people-context"].includes(normalized)) return ["business", "docs-memory"];
  if (["john-personal", "assistant-preference", "life-routine", "active-priority", "saved-idea", "do-not-do"].includes(normalized)) return ["docs-memory", "business"];
  if (["apex-project"].includes(normalized)) return ["docs-memory", "app-code", "agents", "launch"];
  if (["roadmap-decision", "operating-rule", "build-freeze", "product-identity", "safety-rule", "decision", "general"].includes(normalized)) return ["docs-memory", "agents"];
  return ["docs-memory"];
}

function sourceMatchesScope(row = {}, contextScope = "all") {
  const normalizedScope = normalizeContextScope(contextScope);
  if (normalizedScope === "all") return true;
  return memoryScopes(row.category || row.type).includes(normalizedScope);
}

function timestampMs(row = {}) {
  const raw = row.approvedAt || row.updatedAt || row.createdAt || "";
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function inferDesiredTypes(query = "") {
  const normalized = text(query, 1000).toLowerCase();
  const types = [];
  if (/\b(preference|style|voice|talk|answer|respond|short|direct|tone)\b/.test(normalized)) types.push("assistant-preference");
  if (/\b(priority|focus|tonight|today|next|urgent|important)\b/.test(normalized)) types.push("active-priority");
  if (/\b(goal|growth|business|revenue|lead|sales|customer)\b/.test(normalized)) types.push("john-business", "business-goal");
  if (/\b(routine|morning|daily|habit|schedule)\b/.test(normalized)) types.push("life-routine");
  if (/\b(idea|maybe|save)\b/.test(normalized)) types.push("saved-idea");
  if (/\b(don't|dont|do not|never|avoid|stop)\b/.test(normalized)) types.push("do-not-do");
  if (/\b(apex hq|apex os|builder|code|app|local|voice|ollama|qwen|jarvis|memory|learn)\b/.test(normalized)) types.push("apex-project");
  return [...new Set(types)];
}

function rowText(row = {}) {
  return [
    row.title,
    row.body,
    row.category,
    row.type,
    row.sourceLabel,
    row.reviewNote,
  ].map((value) => text(value, TEXT_LIMIT).toLowerCase()).join(" ");
}

function fieldHits(row = {}, tokens = []) {
  const fields = {
    title: row.title,
    body: row.body,
    category: row.category,
    type: row.type,
    sourceLabel: row.sourceLabel,
    reviewNote: row.reviewNote,
  };
  return Object.entries(fields)
    .map(([field, value]) => ({
      field,
      hits: tokens.filter((token) => text(value, TEXT_LIMIT).toLowerCase().includes(token)).length,
    }))
    .filter((entry) => entry.hits > 0);
}

function scoreMemoryRow(row = {}, { tokens = [], desiredTypes = [], now = new Date() } = {}) {
  const hits = fieldHits(row, tokens);
  const queryScore = tokens.length
    ? hits.reduce((total, hit) => total + hit.hits * (hit.field === "title" ? 24 : hit.field === "body" ? 14 : 8), 0)
    : 8;
  const normalizedType = normalizeApexOsMemoryType(row.type || row.category);
  const typeBoost = desiredTypes.includes(normalizedType) ? 18 : 0;
  const approvedBoost = row.status === "approved" ? 20 : 0;
  const ageMs = timestampMs(row) ? Math.max(0, new Date(now).getTime() - timestampMs(row)) : 999 * 24 * 60 * 60 * 1000;
  const recencyBoost = ageMs <= 7 * 24 * 60 * 60 * 1000 ? 10 : ageMs <= 45 * 24 * 60 * 60 * 1000 ? 5 : 0;
  return {
    score: Math.max(0, Math.min(100, queryScore + typeBoost + approvedBoost + recencyBoost)),
    matchReasons: [
      ...hits.map((hit) => `${hit.field}:${hit.hits}`),
      typeBoost ? `type:${normalizedType}` : "",
      recencyBoost ? "recent" : "",
    ].filter(Boolean).slice(0, 6),
  };
}

function compactMemoryRow(row = {}, score = {}) {
  return {
    id: text(row.id, 90),
    title: text(row.title || "Apex memory", SHORT_LIMIT),
    body: text(row.body, SNIPPET_LIMIT),
    category: text(row.category || "general", 80),
    type: normalizeApexOsMemoryType(row.type || row.category),
    sourceType: text(row.sourceType, SHORT_LIMIT),
    sourceLabel: text(row.sourceLabel || "Apex OS memory", SHORT_LIMIT),
    sourceUri: text(row.sourceUri || "", 260),
    status: row.status,
    confidence: Math.max(0, Math.min(100, Number(row.confidence) || 0)),
    relevanceScore: score.score || 0,
    matchReasons: score.matchReasons || [],
    updatedAt: text(row.updatedAt || row.approvedAt || row.createdAt || "", SHORT_LIMIT),
  };
}

function summarizeLiveContext(value = "", { limit = SUMMARY_LIMIT } = {}) {
  const raw = text(value, 2600);
  if (!raw) {
    return {
      available: false,
      mode: "none",
      rawCharacterCount: 0,
      compactCharacterCount: 0,
      compressionRatio: 0,
      summaryText: "No recent turn context was needed for this request.",
      storesRawConversation: false,
    };
  }
  const lines = raw
    .split(/(?:\n|(?<=[.!?])\s+)/)
    .map((line) => text(line, 240))
    .filter(Boolean);
  const priorityLines = lines.filter((line) => /\b(last operator request|last apex answer|active private run|route|trusted memory|interrupted|retry|turn)\b/i.test(line));
  const selected = (priorityLines.length ? priorityLines : lines).slice(-7);
  const summaryText = text(selected.join(" "), limit);
  const rawCount = raw.length;
  const compactCount = summaryText.length;
  return {
    available: true,
    mode: "turn-envelope-summary",
    rawCharacterCount: rawCount,
    compactCharacterCount: compactCount,
    compressionRatio: rawCount ? Number((compactCount / rawCount).toFixed(2)) : 0,
    summaryText,
    storesRawConversation: false,
  };
}

export function retrieveApexOsMemoryRows(memoryRows = [], {
  query = "",
  contextScope = "all",
  limit = 6,
  now = new Date(),
} = {}) {
  const tokens = tokenize(query);
  const desiredTypes = inferDesiredTypes(query);
  const rowLimit = Math.max(1, Math.min(12, Number(limit) || 6));
  const approvedRows = normalizeApexOsMemory(memoryRows)
    .filter((row) => row.status === "approved")
    .filter((row) => sourceMatchesScope(row, contextScope));
  const scoredRows = approvedRows
    .map((row) => {
      const score = scoreMemoryRow(row, { tokens, desiredTypes, now });
      return {
        row,
        ...score,
      };
    })
    .filter((entry) => !tokens.length || entry.score >= 22 || desiredTypes.includes(normalizeApexOsMemoryType(entry.row.type || entry.row.category)) || rowText(entry.row).includes(tokens[0] || ""))
    .sort((left, right) => right.score - left.score || timestampMs(right.row) - timestampMs(left.row))
    .slice(0, rowLimit)
    .map((entry) => compactMemoryRow(entry.row, entry));

  return {
    tokens,
    desiredTypes,
    rows: scoredRows,
    approvedScopedCount: approvedRows.length,
  };
}

export function buildApexOsMemoryRetrievalAndCompaction({
  question = "",
  memoryRows = [],
  contextScope = "all",
  liveConversationContext = "",
  limit = 6,
  now = new Date(),
} = {}) {
  const normalizedScope = normalizeContextScope(contextScope);
  const memory = normalizeApexOsMemory(memoryRows);
  const retrieval = retrieveApexOsMemoryRows(memory, {
    query: question,
    contextScope: normalizedScope,
    limit,
    now,
  });
  const compaction = summarizeLiveContext(liveConversationContext);
  const sourceLabels = [...new Set(retrieval.rows.map((row) => row.sourceLabel).filter(Boolean))].slice(0, 8);
  const summaryText = retrieval.rows.length
    ? `Retrieved ${retrieval.rows.length} approved memory row${retrieval.rows.length === 1 ? "" : "s"} for ${normalizedScope} and compacted recent turn context to ${compaction.compactCharacterCount} characters.`
    : `No matching approved memory rows were retrieved for ${normalizedScope}; recent turn context compacted to ${compaction.compactCharacterCount} characters.`;

  return Object.freeze({
    ok: true,
    phase: APEX_MEMORY_RETRIEVAL_PHASE,
    engineId: APEX_MEMORY_RETRIEVAL_ENGINE_ID,
    operatorOnly: true,
    localOnly: true,
    retrievalEnabled: true,
    retrievalMode: "local-lexical-approved-memory",
    compactionEnabled: true,
    compactionMode: compaction.mode,
    vectorStoreStatus: "not-created",
    embeddingStatus: "not-created",
    cloudRequired: false,
    persistenceEnabled: false,
    storesRawPrompt: false,
    storesRawResponse: false,
    storesRawConversation: false,
    storesRawMemoryDump: false,
    canExecuteNow: false,
    executionLocked: true,
    contextScope: normalizedScope,
    approvedMemoryCount: memory.filter((row) => row.status === "approved").length,
    suggestedMemoryCount: memory.filter((row) => row.status === "suggested").length,
    archivedMemoryCount: memory.filter((row) => row.status === "archived").length,
    approvedScopedCount: retrieval.approvedScopedCount,
    retrievedCount: retrieval.rows.length,
    queryTokenCount: retrieval.tokens.length,
    desiredTypes: retrieval.desiredTypes,
    rankedRows: retrieval.rows,
    compaction,
    sourceLabels,
    summaryText,
    safeSummary: summaryText,
    safetyLocks: Object.freeze([
      "Approved memory only is retrieved as durable context.",
      "Suggested memory remains pending review and is not used as truth.",
      "Recent turn context is compacted for this request and not persisted by this helper.",
      "No vector store, embedding index, schema change, or cloud call is created in v0.",
    ]),
  });
}

export function buildApexOsMemoryRetrievalPromptContext(summary = {}) {
  return Object.freeze({
    phase: summary.phase || APEX_MEMORY_RETRIEVAL_PHASE,
    engineId: summary.engineId || APEX_MEMORY_RETRIEVAL_ENGINE_ID,
    operatorOnly: true,
    retrievalMode: summary.retrievalMode || "local-lexical-approved-memory",
    compactionMode: summary.compactionMode || "turn-envelope-summary",
    vectorStoreStatus: summary.vectorStoreStatus || "not-created",
    embeddingStatus: summary.embeddingStatus || "not-created",
    persistenceEnabled: false,
    storesRawConversation: false,
    storesRawPrompt: false,
    storesRawResponse: false,
    canExecuteNow: false,
    executionLocked: true,
    retrievedCount: Math.max(0, Number(summary.retrievedCount) || 0),
    approvedMemoryCount: Math.max(0, Number(summary.approvedMemoryCount) || 0),
    suggestedMemoryCount: Math.max(0, Number(summary.suggestedMemoryCount) || 0),
    compactedTurnCharacters: Math.max(0, Number(summary.compaction?.compactCharacterCount) || 0),
    compressionRatio: Math.max(0, Number(summary.compaction?.compressionRatio) || 0),
    rankedRows: (Array.isArray(summary.rankedRows) ? summary.rankedRows : []).slice(0, 6).map((row) => ({
      id: row.id,
      title: row.title,
      body: row.body,
      category: row.category,
      type: row.type,
      sourceLabel: row.sourceLabel,
      relevanceScore: row.relevanceScore,
      matchReasons: row.matchReasons,
    })),
    recentTurnSummary: text(summary.compaction?.summaryText || "", SUMMARY_LIMIT),
    safeSummary: text(summary.safeSummary || summary.summaryText || "", 520),
  });
}
