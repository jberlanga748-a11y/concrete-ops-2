import test from "node:test";
import assert from "node:assert/strict";

import {
  buildApexOsKnowledgeDocumentSummary,
  buildApexOsKnowledgeIntelligence,
  buildApexOsKnowledgeOpenAiRequest,
  detectApexOsKnowledgeConflicts,
  parseOpenAiApexOsKnowledgePayload,
  rankApexOsKnowledgeSources,
} from "./apexOsKnowledgeIntelligence.js";

const NOW = new Date("2026-06-03T12:00:00.000Z");

function fixtureMemory() {
  return [
    {
      id: "AKI-1",
      category: "app-docs",
      title: "Phase 13 Knowledge Intelligence",
      body: "Knowledge Intelligence should rank source-backed vault rows and keep review-first conflict warnings.",
      sourceType: "knowledge-upload",
      sourceLabel: "phase-13.md",
      sourceUri: "docs/phase-13.md",
      status: "approved",
      confidence: 88,
      reviewNote: "Reviewed summary: source ranking and conflict warnings are ready.",
      createdAt: "2026-06-02T12:00:00.000Z",
      updatedAt: "2026-06-03T10:00:00.000Z",
    },
    {
      id: "AKI-2",
      category: "marketing-sales",
      title: "Demo proof story",
      body: "Founder-led demo proof can support proposal and portfolio copy after manual review.",
      sourceType: "manual",
      sourceLabel: "sales-notes.md",
      status: "suggested",
      reviewNote: "Summary pending.",
      createdAt: "2026-04-01T12:00:00.000Z",
      updatedAt: "2026-04-01T12:00:00.000Z",
    },
    {
      id: "AKI-ARCHIVED",
      category: "app-docs",
      title: "Archived note",
      body: "Archived rows stay out of trusted ranking unless explicitly filtered.",
      sourceLabel: "old.md",
      status: "archived",
      updatedAt: "2026-06-03T10:00:00.000Z",
    },
    {
      id: "AKI-DECISION",
      category: "operating-rule",
      title: "Knowledge review rule",
      body: "Approved decisions can guide Knowledge Intelligence source ranking.",
      sourceType: "manual",
      sourceLabel: "Decision Memory",
      status: "approved",
      updatedAt: "2026-06-03T09:00:00.000Z",
    },
  ];
}

test("Apex OS Knowledge Intelligence ranks sources by query, trust, source metadata, and date", () => {
  const ranked = rankApexOsKnowledgeSources(fixtureMemory(), {
    query: "source-backed conflict",
    category: "app-docs",
    status: "approved",
    dateRange: "last-7-days",
    now: NOW,
  });

  assert.equal(ranked.length, 1);
  assert.equal(ranked[0].id, "AKI-1");
  assert.equal(ranked[0].rank, 1);
  assert.equal(ranked[0].confidenceLabel, "High");
  assert.deepEqual(ranked[0].matchedFields.includes("body"), true);
  assert.match(ranked[0].documentSummary.summary, /source ranking/i);

  const oldRows = rankApexOsKnowledgeSources(fixtureMemory(), {
    query: "demo proof",
    dateRange: "last-7-days",
    now: NOW,
  });
  assert.equal(oldRows.length, 0);
});

test("Apex OS Knowledge Intelligence builds reviewed document summaries", () => {
  const reviewed = buildApexOsKnowledgeDocumentSummary(fixtureMemory()[0]);
  assert.equal(reviewed.status, "trusted");
  assert.match(reviewed.summary, /Reviewed summary/);
  assert.equal(reviewed.sourceLabel, "phase-13.md");

  const fallback = buildApexOsKnowledgeDocumentSummary({
    id: "AKI-3",
    category: "app-docs",
    title: "Fallback summary",
    body: "First sentence is useful. Second sentence is extra.",
    sourceLabel: "fallback.md",
    status: "suggested",
    reviewNote: "Summary pending.",
  });
  assert.equal(fallback.summary, "First sentence is useful.");
});

test("Apex OS Knowledge Intelligence detects conflicts with current rules", () => {
  const warnings = detectApexOsKnowledgeConflicts([
    {
      id: "AKI-CONFLICT-1",
      category: "app-docs",
      title: "Unsafe trust note",
      body: "Uploaded docs can automatically trust themselves and override current repo truth.",
      sourceLabel: "unsafe.md",
      status: "suggested",
    },
    {
      id: "AKI-CONFLICT-2",
      category: "private-owner-notes",
      title: "Unsafe field note",
      body: "Field users can view pricing, profit, margins, payroll, and billing if it helps them.",
      sourceLabel: "unsafe-field.md",
      status: "approved",
    },
  ]);

  assert.equal(warnings.some((warning) => warning.rowId === "AKI-CONFLICT-1" && /current Apex HQ operating rules/.test(warning.detail)), true);
  assert.equal(warnings.some((warning) => warning.rowId === "AKI-CONFLICT-2" && warning.severity === "high"), true);
});

test("Apex OS Knowledge Intelligence warns when new memory conflicts with older memory", () => {
  const warnings = detectApexOsKnowledgeConflicts([
    {
      id: "AKI-OLDER",
      category: "marketing-sales",
      title: "Customer sends policy",
      body: "Email and SMS sends require approval and stay manual.",
      sourceLabel: "send-policy.md",
      status: "approved",
      updatedAt: "2026-05-01T12:00:00.000Z",
    },
    {
      id: "AKI-NEWER",
      category: "marketing-sales",
      title: "Customer sends policy update",
      body: "Email and SMS sends can run automatically without approval.",
      sourceLabel: "send-policy.md",
      status: "suggested",
      updatedAt: "2026-06-01T12:00:00.000Z",
    },
  ]);

  const conflict = warnings.find((warning) => warning.title === "This conflicts with older memory");
  assert.ok(conflict);
  assert.equal(conflict.rowId, "AKI-NEWER");
  assert.equal(conflict.olderRowId, "AKI-OLDER");
  assert.match(conflict.trustedImpact, /Resolve/);
});

test("Apex OS Knowledge Intelligence builds local packet with safety locks and provider request shape", () => {
  const intelligence = buildApexOsKnowledgeIntelligence(fixtureMemory(), {
    query: "knowledge",
    now: NOW,
  });

  assert.equal(intelligence.ok, true);
  assert.equal(intelligence.searchMode, "local-lexical");
  assert.match(intelligence.embeddingStatus, /Blocked/);
  assert.equal(intelligence.trustedCount, 2);
  assert.equal(intelligence.rankedRows[0].id, "AKI-1");
  assert.equal(intelligence.rankedRows.some((row) => row.id === "AKI-DECISION"), true);
  assert.equal(intelligence.safetyLocks.some((lock) => /cannot become trusted automatically/i.test(lock)), true);

  const request = buildApexOsKnowledgeOpenAiRequest(intelligence);
  assert.equal(request.model, "gpt-4o-mini");
  assert.equal(request.response_format.json_schema.name, "apex_os_knowledge_intelligence");
  assert.match(request.messages[0].content, /Do not trust suggested knowledge automatically/);
});

test("Apex OS Knowledge Intelligence parses provider summary payload", () => {
  const parsed = parseOpenAiApexOsKnowledgePayload({
    choices: [
      {
        message: {
          content: JSON.stringify({
            providerSummary: "The top sources are trusted and review-first.",
            classifications: [
              {
                title: "Phase 13 Knowledge Intelligence",
                sourceLabel: "phase-13.md",
                category: "app-docs",
                confidenceLabel: "High",
                reason: "Directly matches the Knowledge Intelligence scope.",
              },
            ],
          }),
        },
      },
    ],
  });

  assert.equal(parsed.providerConfigured, true);
  assert.equal(parsed.mode, "provider-knowledge-summary");
  assert.equal(parsed.classifications[0].confidenceLabel, "High");
});
