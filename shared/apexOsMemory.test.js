import assert from "node:assert/strict";
import test from "node:test";

import {
  buildApexOsMemorySuggestion,
  buildApexOsMemorySummary,
  buildApexOsMemoryContext,
  buildApexOsLiveOperatorMemoryContext,
  detectApexOsMemorySafetyIssues,
  detectApexOsMemorySuggestionFromTurn,
  filterApexOsDecisionMemory,
  filterApexOsKnowledgeVault,
  findApexOsMemoryDuplicate,
  getApexOsMemoryType,
  isApexOsDecisionCategory,
  isApexOsKnowledgeCategory,
  normalizeApexOsMemoryType,
  normalizeApexOsMemory,
  normalizeApexOsMemoryEntry,
  summarizeApexOsDecisionMemory,
  summarizeApexOsLiveOperatorMemory,
  summarizeApexOsKnowledgeVault,
  summarizeApexOsMemory,
} from "./apexOsMemory.js";

test("Apex OS memory normalizes source-backed private memory", () => {
  const entry = normalizeApexOsMemoryEntry({
    id: "AOM-1",
    category: "Product identity",
    title: "John owns Apex HQ",
    body: "Apex OS is the private operating center for Apex HQ.",
    sourceLabel: "Apex OS master plan",
    sourceUri: "docs/APEX_HQ_APEX_OS_COMMAND_CENTER_MASTER_PLAN.md",
    status: "approved",
    confidence: 95,
  }, { now: "2026-06-02T00:00:00.000Z" });

  assert.equal(entry.category, "product-identity");
  assert.equal(entry.status, "approved");
  assert.equal(entry.sourceLabel, "Apex OS master plan");
  assert.equal(entry.confidence, 95);
  assert.deepEqual(entry.blockedReasons, []);
});

test("Apex OS memory accepts the original Phase 4 decision categories", () => {
  const categories = [
    "product identity",
    "safety rule",
    "roadmap decision",
    "build freeze",
    "business goal",
    "provider/account decision",
    "personal preference",
  ];

  const memory = normalizeApexOsMemory(categories.map((category, index) => ({
    id: `AOM-CAT-${index}`,
    category,
    title: `${category} decision`,
    body: `Source-backed ${category} memory.`,
    sourceLabel: "Phase 4 requirement",
    status: "suggested",
  })));

  assert.deepEqual(memory.map((entry) => entry.category), [
    "product-identity",
    "safety-rule",
    "roadmap-decision",
    "build-freeze",
    "business-goal",
    "provider-account-decision",
    "personal-preference",
  ]);
  assert.equal(memory.every((entry) => isApexOsDecisionCategory(entry.category)), true);
});

test("Apex OS memory normalizes Phase 3 types while preserving old categories", () => {
  assert.equal(normalizeApexOsMemoryType("personal-preference"), "assistant-preference");
  assert.equal(normalizeApexOsMemoryType("private owner notes"), "john-personal");
  assert.equal(normalizeApexOsMemoryType("remembered idea"), "saved-idea");
  assert.equal(getApexOsMemoryType("do not do").label, "Do-not-do");

  const memory = normalizeApexOsMemory([
    {
      id: "AOM-P3-OLD",
      category: "personal-preference",
      title: "Short answers",
      body: "John prefers short answers.",
      sourceLabel: "John instruction",
      status: "approved",
    },
    {
      id: "AOM-P3-NEW",
      category: "saved-idea",
      title: "Work mode",
      body: "Idea: Apex OS should support work mode.",
      sourceLabel: "John instruction",
      status: "suggested",
    },
  ]);

  assert.equal(memory[0].category, "personal-preference");
  assert.equal(memory[0].type, "assistant-preference");
  assert.equal(memory[1].category, "saved-idea");
  assert.equal(memory[1].type, "saved-idea");
  assert.equal(memory.every((entry) => isApexOsDecisionCategory(entry.category)), true);
});

test("Apex OS memory rejects secrets and customer emails", () => {
  const issues = detectApexOsMemorySafetyIssues("Remember password secret123, phone 555-222-1212, and email customer@example.test.");

  assert.equal(issues.some((issue) => /email/i.test(issue)), true);
  assert.equal(issues.some((issue) => /phone|contact/i.test(issue)), true);
  assert.equal(issues.some((issue) => /passwords|tokens|credential/i.test(issue)), true);
});

test("Apex OS builds suggested memory drafts without approving them", () => {
  const suggestion = buildApexOsMemorySuggestion({
    type: "assistant-preference",
    text: "John prefers concise, practical answers unless he asks for detail.",
    reason: "John stated a response preference.",
    source: { sourceLabel: "Apex OS chat", sourceUri: "ask-apex:test" },
  });

  assert.equal(suggestion.category, "assistant-preference");
  assert.equal(suggestion.type, "assistant-preference");
  assert.equal(suggestion.status, "suggested");
  assert.equal(suggestion.approvedBy, "");
  assert.match(suggestion.reviewNote, /response preference/i);
});

test("Apex OS memory suggestion helper flags sensitive values for rejection", () => {
  const suggestion = buildApexOsMemorySuggestion({
    type: "people-context",
    text: "Remember customer Sarah email sarah@example.test and phone 555-111-2222.",
  });

  assert.match(suggestion.body, /\[REDACTED\]/);
  assert.equal(suggestion.blockedReasons.some((reason) => /email/i.test(reason)), true);
  assert.equal(suggestion.blockedReasons.some((reason) => /phone|contact/i.test(reason)), true);
});

test("Apex OS detects common review-first memory suggestions from turns", () => {
  const shortAnswers = detectApexOsMemorySuggestionFromTurn({
    userText: "Don't give me long answers unless I ask.",
    assistantMode: "General",
  });
  assert.equal(shortAnswers.type, "assistant-preference");
  assert.match(shortAnswers.body, /concise, practical answers/i);

  const businessLife = detectApexOsMemorySuggestionFromTurn({
    userText: "I want Apex OS to help with business and life too.",
    assistantMode: "General",
  });
  assert.equal(businessLife.type, "assistant-preference");
  assert.match(businessLife.body, /business and life/i);

  const savedIdea = detectApexOsMemorySuggestionFromTurn({
    userText: "Remember this idea: Apex should have work mode.",
    assistantMode: "Memory",
  });
  assert.equal(savedIdea.type, "saved-idea");
  assert.match(savedIdea.body, /work mode/i);

  const doNotDo = detectApexOsMemorySuggestionFromTurn({
    userText: "Never send messages without asking me first.",
    assistantMode: "Memory",
  });
  assert.equal(doNotDo.type, "do-not-do");
  assert.match(doNotDo.body, /explicit approval/i);
});

test("Apex OS memory suggestions dedupe against active reviewed or pending memory", () => {
  const existing = normalizeApexOsMemory([
    {
      id: "AOM-EXISTING",
      category: "assistant-preference",
      title: "John prefers concise, practical answers unless he asks for detail",
      body: "John prefers concise, practical answers unless he asks for detail.",
      sourceLabel: "John instruction",
      status: "suggested",
    },
  ]);

  assert.equal(detectApexOsMemorySuggestionFromTurn({
    userText: "Don't give me long answers unless I ask.",
    existingMemory: existing,
  }), null);
});

test("Apex OS memory summary separates approved lanes from suggested memory", () => {
  const memory = normalizeApexOsMemory([
    {
      id: "AOM-APPROVED-PREF",
      category: "assistant-preference",
      title: "Short answers",
      body: "John prefers concise answers.",
      sourceLabel: "John instruction",
      status: "approved",
    },
    {
      id: "AOM-APPROVED-IDEA",
      category: "saved-idea",
      title: "Work mode",
      body: "Idea: Apex OS should support work mode.",
      sourceLabel: "John instruction",
      status: "approved",
    },
    {
      id: "AOM-SUGGESTED",
      category: "do-not-do",
      title: "Unreviewed external boundary",
      body: "Suggested only.",
      sourceLabel: "Apex OS chat",
      status: "suggested",
    },
  ]);
  const summary = buildApexOsMemorySummary(memory);

  assert.equal(summary.approvedCount, 2);
  assert.equal(summary.suggestedCount, 1);
  assert.equal(summary.sections.personalBusinessAssistant.some((entry) => entry.title === "Short answers"), true);
  assert.equal(summary.sections.savedIdeas.some((entry) => entry.title === "Work mode"), true);
  assert.equal(summary.sections.doNotDo.some((entry) => entry.title === "Unreviewed external boundary"), false);
  assert.equal(summary.pendingSuggestions[0].title, "Unreviewed external boundary");
});

test("Apex OS memory summarizes and builds approved context only", () => {
  const memory = normalizeApexOsMemory([
    {
      id: "AOM-1",
      category: "private-owner-notes",
      title: "Daily focus",
      body: "Prioritize command center work before provider integrations.",
      sourceLabel: "John instruction",
      status: "approved",
    },
    {
      id: "AOM-2",
      category: "business-strategy",
      title: "Launch note",
      body: "Keep public launch gated until proof is ready.",
      sourceLabel: "Living plan",
      status: "suggested",
      updatedAt: "2026-06-03T00:30:00.000Z",
    },
  ]);

  assert.deepEqual(summarizeApexOsMemory(memory), {
    total: 2,
    approved: 1,
    suggested: 1,
    archived: 0,
  });
  assert.deepEqual(buildApexOsMemoryContext(memory).map((entry) => entry.title), ["Daily focus"]);
});

test("Apex OS live operator memory summarizes trusted run history only", () => {
  const memory = normalizeApexOsMemory([
    {
      id: "AOM-LIVE-1",
      category: "private-owner-notes",
      title: "Apex remembered the blocked release",
      body: "The last proactive check-in found the release blocked on browser QA.",
      sourceType: "apex-live-operator-proactive-check-in",
      sourceLabel: "Apex Proactive Check-In",
      sourceUri: "apex-live-operator:proactive:1",
      status: "approved",
      approvedAt: "2026-06-05T01:00:00.000Z",
    },
    {
      id: "AOM-LIVE-2",
      category: "private-owner-notes",
      title: "Suggested run result",
      body: "Apex drafted this run outcome, but it still needs review.",
      sourceType: "apex-live-operator-run",
      sourceLabel: "Apex Live Operator Mode",
      sourceUri: "apex-live-operator:run:2",
      status: "suggested",
      updatedAt: "2026-06-05T01:05:00.000Z",
    },
    {
      id: "AOM-LIVE-3",
      category: "private-owner-notes",
      title: "Archived turn",
      body: "This live turn is no longer trusted.",
      sourceType: "apex-live-operator-turn",
      sourceLabel: "Apex Live Operator Mode",
      sourceUri: "apex-live-operator:turn:3",
      status: "archived",
    },
    {
      id: "AOM-OTHER",
      category: "business-strategy",
      title: "Normal memory",
      body: "This approved memory is not live-run history.",
      sourceLabel: "Business memo",
      status: "approved",
    },
  ]);

  const summary = summarizeApexOsLiveOperatorMemory(memory);
  assert.equal(summary.total, 3);
  assert.equal(summary.approved, 1);
  assert.equal(summary.suggested, 1);
  assert.equal(summary.archived, 1);
  assert.equal(summary.proactiveCheckInCount, 1);
  assert.equal(summary.runCount, 1);
  assert.equal(summary.turnCount, 1);
  assert.equal(summary.trustedRows[0].title, "Apex remembered the blocked release");
  assert.equal(summary.pendingRows[0].title, "Suggested run result");

  const context = buildApexOsLiveOperatorMemoryContext(memory);
  assert.deepEqual(context.map((entry) => entry.title), ["Apex remembered the blocked release"]);
  assert.equal(context[0].sourceType, "apex-live-operator-proactive-check-in");
  assert.equal(context.some((entry) => entry.title === "Suggested run result"), false);
});

test("Apex OS decision memory summarizes filters and detects active duplicates", () => {
  const memory = normalizeApexOsMemory([
    {
      id: "AOM-D-1",
      category: "roadmap-decision",
      title: "Phase discipline",
      body: "Work one phase at a time.",
      sourceLabel: "John instruction",
      sourceUri: "docs/phase-four.md",
      status: "approved",
      reviewNote: "Trusted.",
      updatedAt: "2026-06-03T01:00:00.000Z",
    },
    {
      id: "AOM-D-2",
      category: "business-goal",
      title: "Production shell",
      body: "Keep Apex OS private to the owner.",
      sourceLabel: "Living plan",
      status: "suggested",
      updatedAt: "2026-06-03T00:30:00.000Z",
    },
    {
      id: "AOM-KV-1",
      category: "app-docs",
      title: "Knowledge upload",
      body: "This belongs to the vault, not the decision view.",
      sourceLabel: "Vault upload",
      status: "approved",
    },
  ]);

  const summary = summarizeApexOsDecisionMemory(memory);
  assert.equal(summary.total, 2);
  assert.equal(summary.approved, 1);
  assert.equal(summary.suggested, 1);
  assert.equal(summary.sourceCount, 2);
  assert.equal(summary.byCategory["roadmap-decision"], 1);
  assert.equal(summary.reviewHistory[0].title, "Phase discipline");
  assert.deepEqual(filterApexOsDecisionMemory(memory, { source: "john", status: "approved" }).map((entry) => entry.title), ["Phase discipline"]);
  assert.deepEqual(filterApexOsDecisionMemory(memory, { query: "private to the owner" }).map((entry) => entry.title), ["Production shell"]);
  assert.equal(findApexOsMemoryDuplicate({
    category: "roadmap decision",
    title: "Phase discipline",
    body: "Duplicate.",
    sourceLabel: "John instruction",
  }, memory)?.id, "AOM-D-1");
  assert.equal(findApexOsMemoryDuplicate({
    category: "roadmap decision",
    title: "New decision",
    body: "Duplicate source URI.",
    sourceLabel: "Different",
    sourceUri: "docs/phase-four.md",
  }, memory)?.id, "AOM-D-1");
});

test("Apex OS knowledge vault classifies the original Phase 5 upload categories", () => {
  const categories = [
    "Apex HQ app docs",
    "business strategy",
    "marketing/sales",
    "customer research",
    "legal/risk review notes",
    "brand/design assets",
    "product ideas",
    "private owner notes",
  ];

  const memory = normalizeApexOsMemory(categories.map((category, index) => ({
    id: `AOM-KV-${index}`,
    category,
    title: `${category} upload`,
    body: `Reviewed ${category} knowledge draft.`,
    sourceType: "knowledge-upload",
    sourceLabel: `phase-5-${index}.md`,
    sourceUri: `local-upload:phase-5-${index}.md`,
    status: "suggested",
    reviewNote: "Summary pending - manual review required.",
  })));

  assert.equal(memory.every((entry) => isApexOsKnowledgeCategory(entry.category)), true);
  assert.deepEqual(memory.map((entry) => entry.category), [
    "app-docs",
    "business-strategy",
    "marketing-sales",
    "customer-research",
    "legal-risk",
    "brand-design",
    "product-ideas",
    "private-owner-notes",
  ]);
});

test("Apex OS knowledge vault summarizes and filters by category, source, status, and search", () => {
  const memory = normalizeApexOsMemory([
    {
      id: "AOM-KV-1",
      category: "app-docs",
      title: "Phase 5 master plan",
      body: "Knowledge Upload Vault needs private reviewed intake.",
      sourceType: "knowledge-upload",
      sourceLabel: "phase-5.md",
      sourceUri: "local-upload:phase-5.md",
      status: "suggested",
      reviewNote: "Summary pending.",
    },
    {
      id: "AOM-KV-2",
      category: "marketing-sales",
      title: "Demo script",
      body: "Founder-led demo proof narrative.",
      sourceType: "manual",
      sourceLabel: "Sales notes",
      status: "approved",
      reviewNote: "Trusted.",
    },
    {
      id: "AOM-D-1",
      category: "roadmap-decision",
      title: "Phase decision",
      body: "This is not a vault upload.",
      sourceLabel: "Decision memory",
      status: "approved",
    },
  ]);

  const summary = summarizeApexOsKnowledgeVault(memory);
  assert.equal(summary.total, 2);
  assert.equal(summary.trusted, 1);
  assert.equal(summary.suggested, 1);
  assert.equal(summary.archived, 0);
  assert.equal(summary.sourceCount, 2);
  assert.deepEqual(summary.sourceLabels, ["phase-5.md", "Sales notes"]);
  assert.deepEqual(summary.byCategory, {
    "app-docs": 1,
    "business-strategy": 0,
    "marketing-sales": 1,
    "customer-research": 0,
    "legal-risk": 0,
    "brand-design": 0,
    "product-ideas": 0,
    "private-owner-notes": 0,
  });
  assert.equal(summary.reviewHistory.length, 2);
  assert.equal(summary.reviewHistory.some((entry) => entry.title === "Phase 5 master plan" && entry.sourceUri === "local-upload:phase-5.md"), true);
  assert.deepEqual(filterApexOsKnowledgeVault(memory, { category: "app-docs" }).map((entry) => entry.title), ["Phase 5 master plan"]);
  assert.deepEqual(filterApexOsKnowledgeVault(memory, { source: "sales", status: "approved" }).map((entry) => entry.title), ["Demo script"]);
  assert.deepEqual(filterApexOsKnowledgeVault(memory, { query: "reviewed intake" }).map((entry) => entry.title), ["Phase 5 master plan"]);
});

test("Apex OS knowledge vault duplicate guard is category and active source scoped", () => {
  const memory = normalizeApexOsMemory([
    {
      id: "AOM-KV-1",
      category: "app-docs",
      title: "Phase 5 master plan",
      body: "Knowledge Upload Vault needs private reviewed intake.",
      sourceType: "knowledge-upload",
      sourceLabel: "phase-5.md",
      sourceUri: "local-upload:phase-5.md",
      status: "suggested",
    },
    {
      id: "AOM-KV-2",
      category: "marketing-sales",
      title: "Phase 5 master plan",
      body: "Same title in a different category is not a duplicate without a matching source.",
      sourceType: "knowledge-upload",
      sourceLabel: "phase-5.md",
      sourceUri: "local-upload:phase-5-marketing.md",
      status: "suggested",
    },
    {
      id: "AOM-KV-3",
      category: "app-docs",
      title: "Archived duplicate",
      body: "Archived rows should not block new intake.",
      sourceType: "knowledge-upload",
      sourceLabel: "old-app-doc.md",
      sourceUri: "local-upload:old-app-doc.md",
      status: "archived",
    },
  ]);

  assert.equal(findApexOsMemoryDuplicate({
    category: "app-docs",
    title: "New app docs title",
    body: "Same source URI should be blocked.",
    sourceType: "knowledge-upload",
    sourceLabel: "different.md",
    sourceUri: "local-upload:phase-5.md",
  }, memory)?.id, "AOM-KV-1");
  assert.equal(findApexOsMemoryDuplicate({
    category: "app-docs",
    title: "Phase 5 master plan",
    body: "Same source label and title should be blocked.",
    sourceType: "knowledge-upload",
    sourceLabel: "phase-5.md",
  }, memory)?.id, "AOM-KV-1");
  assert.equal(findApexOsMemoryDuplicate({
    category: "customer-research",
    title: "Phase 5 master plan",
    body: "Same title and source label in another category is allowed.",
    sourceType: "knowledge-upload",
    sourceLabel: "phase-5.md",
  }, memory), null);
  assert.equal(findApexOsMemoryDuplicate({
    category: "app-docs",
    title: "Replacement archived source",
    body: "Archived duplicate source should not block.",
    sourceType: "knowledge-upload",
    sourceLabel: "old-app-doc.md",
    sourceUri: "local-upload:old-app-doc.md",
  }, memory), null);
});
