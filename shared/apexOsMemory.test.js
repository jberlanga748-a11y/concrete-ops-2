import assert from "node:assert/strict";
import test from "node:test";

import {
  buildApexOsMemoryContext,
  detectApexOsMemorySafetyIssues,
  normalizeApexOsMemory,
  normalizeApexOsMemoryEntry,
  summarizeApexOsMemory,
} from "./apexOsMemory.js";

test("Apex OS memory normalizes source-backed private memory", () => {
  const entry = normalizeApexOsMemoryEntry({
    id: "AOM-1",
    category: "decision",
    title: "John owns Apex HQ",
    body: "Apex OS is the private operating center for Apex HQ.",
    sourceLabel: "Apex OS master plan",
    sourceUri: "docs/APEX_HQ_APEX_OS_COMMAND_CENTER_MASTER_PLAN.md",
    status: "approved",
    confidence: 95,
  }, { now: "2026-06-02T00:00:00.000Z" });

  assert.equal(entry.category, "decision");
  assert.equal(entry.status, "approved");
  assert.equal(entry.sourceLabel, "Apex OS master plan");
  assert.equal(entry.confidence, 95);
  assert.deepEqual(entry.blockedReasons, []);
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
