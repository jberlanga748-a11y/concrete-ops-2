import assert from "node:assert/strict";
import test from "node:test";

import {
  buildApexOsMemoryContext,
  detectApexOsMemorySafetyIssues,
  filterApexOsDecisionMemory,
  filterApexOsKnowledgeVault,
  findApexOsMemoryDuplicate,
  isApexOsDecisionCategory,
  isApexOsKnowledgeCategory,
  normalizeApexOsMemory,
  normalizeApexOsMemoryEntry,
  summarizeApexOsDecisionMemory,
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

test("Apex OS memory rejects secrets and customer emails", () => {
  const issues = detectApexOsMemorySafetyIssues("Remember password secret123 and email customer@example.test.");

  assert.equal(issues.some((issue) => /email/i.test(issue)), true);
  assert.equal(issues.some((issue) => /passwords|tokens|credential/i.test(issue)), true);
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

test("Apex OS decision memory summarizes filters and detects active duplicates", () => {
  const memory = normalizeApexOsMemory([
    {
      id: "AOM-D-1",
      category: "roadmap-decision",
      title: "Phase discipline",
      body: "Work one phase at a time.",
      sourceLabel: "Josh instruction",
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
  assert.deepEqual(filterApexOsDecisionMemory(memory, { source: "josh", status: "approved" }).map((entry) => entry.title), ["Phase discipline"]);
  assert.deepEqual(filterApexOsDecisionMemory(memory, { query: "private to the owner" }).map((entry) => entry.title), ["Production shell"]);
  assert.equal(findApexOsMemoryDuplicate({
    category: "roadmap decision",
    title: "Phase discipline",
    body: "Duplicate.",
    sourceLabel: "Josh instruction",
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
