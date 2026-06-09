import assert from "node:assert/strict";
import test from "node:test";

import {
  APEX_MEMORY_RETRIEVAL_ENGINE_ID,
  buildApexOsMemoryRetrievalAndCompaction,
  buildApexOsMemoryRetrievalPromptContext,
  retrieveApexOsMemoryRows,
} from "./apexOsMemoryRetrieval.js";

const MEMORY_ROWS = [
  {
    id: "AOM-VOICE",
    category: "assistant-preference",
    type: "assistant-preference",
    title: "Voice-first Apex",
    body: "John wants Apex voice-first, conversational, fast, and not dashboard-heavy.",
    sourceLabel: "Apex learning conversation",
    sourceUri: "ask-apex:voice",
    status: "approved",
    updatedAt: "2026-06-07T10:00:00.000Z",
  },
  {
    id: "AOM-BUILD",
    category: "apex-project",
    type: "apex-project",
    title: "Apex private operator",
    body: "Apex should feel like John's private Jarvis-style operator and Apex HQ is one domain underneath it.",
    sourceLabel: "Canonical Apex North Star",
    sourceUri: "docs/APEX_HQ_CANONICAL_SOURCE_OF_TRUTH.md",
    status: "approved",
    updatedAt: "2026-06-07T08:00:00.000Z",
  },
  {
    id: "AOM-SUGGESTED",
    category: "assistant-preference",
    type: "assistant-preference",
    title: "Pending style",
    body: "Suggested rows must not become durable truth automatically.",
    sourceLabel: "Untrusted chat",
    status: "suggested",
    updatedAt: "2026-06-07T11:00:00.000Z",
  },
  {
    id: "AOM-ARCHIVED",
    category: "do-not-do",
    type: "do-not-do",
    title: "Old memory",
    body: "Archived memory should not be retrieved.",
    sourceLabel: "Old plan",
    status: "archived",
    updatedAt: "2026-06-06T11:00:00.000Z",
  },
];

test("retrieves approved scoped memory without suggested or archived rows", () => {
  const result = retrieveApexOsMemoryRows(MEMORY_ROWS, {
    query: "Apex voice should be fast and conversational",
    contextScope: "all",
    now: new Date("2026-06-07T12:00:00.000Z"),
  });

  assert.equal(result.rows.length, 2);
  assert.equal(result.rows[0].id, "AOM-VOICE");
  assert.equal(result.rows.some((row) => row.id === "AOM-SUGGESTED"), false);
  assert.equal(result.rows.some((row) => row.id === "AOM-ARCHIVED"), false);
  assert.equal(result.rows[0].matchReasons.some((reason) => /title|body|type/.test(reason)), true);
});

test("filters retrieval by Ask Apex context scope", () => {
  const result = retrieveApexOsMemoryRows(MEMORY_ROWS, {
    query: "What supports the app and builder?",
    contextScope: "app-code",
    now: new Date("2026-06-07T12:00:00.000Z"),
  });

  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].id, "AOM-BUILD");
  assert.equal(result.rows[0].category, "apex-project");
});

test("builds compact retrieval and turn-compaction receipt without creating vector storage", () => {
  const summary = buildApexOsMemoryRetrievalAndCompaction({
    question: "What should Apex remember about voice speed?",
    memoryRows: MEMORY_ROWS,
    liveConversationContext: [
      "Live conversation continuity: hidden prompt envelope.",
      "Last operator request: make Apex faster and stop loops.",
      "Last Apex answer summary: voice delay came from browser capture and STT.",
      "Trusted memory count visible: 2.",
    ].join(" "),
    now: new Date("2026-06-07T12:00:00.000Z"),
  });

  assert.equal(summary.engineId, APEX_MEMORY_RETRIEVAL_ENGINE_ID);
  assert.equal(summary.operatorOnly, true);
  assert.equal(summary.localOnly, true);
  assert.equal(summary.vectorStoreStatus, "not-created");
  assert.equal(summary.embeddingStatus, "not-created");
  assert.equal(summary.persistenceEnabled, false);
  assert.equal(summary.canExecuteNow, false);
  assert.equal(summary.executionLocked, true);
  assert.equal(summary.approvedMemoryCount, 2);
  assert.equal(summary.suggestedMemoryCount, 1);
  assert.equal(summary.archivedMemoryCount, 1);
  assert.equal(summary.retrievedCount >= 1, true);
  assert.equal(summary.rankedRows.some((row) => row.id === "AOM-SUGGESTED"), false);
  assert.equal(summary.compaction.available, true);
  assert.equal(summary.compaction.storesRawConversation, false);
  assert.match(summary.compaction.summaryText, /Last operator request|Last Apex answer summary/i);
  assert.match(summary.safeSummary, /Retrieved/i);
});

test("prompt context stays compact and explicit about non-persistence", () => {
  const summary = buildApexOsMemoryRetrievalAndCompaction({
    question: "what do you know about my Apex direction?",
    memoryRows: MEMORY_ROWS,
    liveConversationContext: "Last operator request: explain Apex direction. Last Apex answer summary: private operator.",
  });
  const promptContext = buildApexOsMemoryRetrievalPromptContext(summary);

  assert.equal(promptContext.engineId, APEX_MEMORY_RETRIEVAL_ENGINE_ID);
  assert.equal(promptContext.persistenceEnabled, false);
  assert.equal(promptContext.storesRawConversation, false);
  assert.equal(promptContext.canExecuteNow, false);
  assert.equal(promptContext.executionLocked, true);
  assert.equal(promptContext.rankedRows.length, summary.rankedRows.length);
  assert.equal(Object.hasOwn(promptContext, "memoryRows"), false);
  assert.match(promptContext.safeSummary, /Retrieved|No matching approved/i);
});
