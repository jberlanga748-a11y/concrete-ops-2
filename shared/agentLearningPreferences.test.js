import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAgentLearningContext,
  buildAgentLearningSuggestionsFromCloseoutContext,
  buildAgentLearningSuggestionsFromEstimates,
  detectAgentLearningSafetyIssues,
  normalizeAgentLearningPreference,
  normalizeAgentLearningPreferences,
  redactAgentLearningText,
  summarizeAgentLearningPreferences,
} from "./agentLearningPreferences.js";

test("agent learning preferences normalize contractor memory safely", () => {
  const preference = normalizeAgentLearningPreference({
    id: "MEM-1",
    category: "estimate-style",
    title: "Broom finish default",
    preference: "Use broom finish as the base concrete option unless the customer asks for stamped.",
    appliesTo: ["concrete", "driveways"],
    status: "approved",
    confidence: 92,
  });

  assert.equal(preference.category, "estimate-style");
  assert.equal(preference.status, "approved");
  assert.deepEqual(preference.appliesTo, ["concrete", "driveways"]);
  assert.equal(preference.confidence, 92);
  assert.deepEqual(preference.blockedReasons, []);
});

test("agent learning context only exposes approved memory", () => {
  const context = buildAgentLearningContext([
    {
      id: "MEM-APPROVED",
      title: "Fence gates",
      preference: "Always ask for gate width before pricing fence jobs.",
      category: "trade-defaults",
      status: "approved",
    },
    {
      id: "MEM-SUGGESTED",
      title: "Unapproved",
      preference: "This should stay out of AI context.",
      status: "suggested",
    },
  ]);

  assert.equal(context.length, 1);
  assert.equal(context[0].title, "Fence gates");
  assert.equal(Object.hasOwn(context[0], "createdBy"), false);
});

test("agent learning rejects or redacts secrets, customer emails, and portal instructions", () => {
  const raw = "Remember customer bob@example.test and portal password secret123 with MFA bypass.";
  const issues = detectAgentLearningSafetyIssues(raw);
  const redacted = redactAgentLearningText(raw);

  assert.ok(issues.length >= 2);
  assert.doesNotMatch(redacted, /bob@example\.test|password|MFA/i);
  assert.match(redacted, /\[REDACTED\]/);
});

test("agent learning parses stored JSON and summarizes statuses", () => {
  const stored = JSON.stringify([
    { id: "A", title: "Approved", preference: "Use company proposal tone.", status: "approved" },
    { id: "S", title: "Suggested", preference: "Confirm disposal fees.", status: "suggested" },
    { id: "X", title: "Archived", preference: "Old preference.", status: "archived" },
  ]);

  const preferences = normalizeAgentLearningPreferences(stored);
  const summary = summarizeAgentLearningPreferences(preferences);

  assert.equal(preferences.length, 3);
  assert.deepEqual(summary, {
    total: 3,
    approved: 1,
    suggested: 1,
    archived: 1,
  });
});

test("agent learning suggests review-first memory from approved estimates", () => {
  const suggestions = buildAgentLearningSuggestionsFromEstimates([
    {
      id: "EST-FENCE-1",
      title: "Cedar fence proposal",
      status: "approved",
      scopeSummary: "Build 6 ft cedar privacy fence with two gates and cleanup.",
      customerNotes: "Includes post layout, cedar panels, gate hardware, and final haul off.",
      estimateItems: [
        { description: "Demo and haul off existing fence" },
        { description: "Set cedar posts in concrete" },
        { description: "Build 6 ft cedar privacy fence" },
      ],
    },
    {
      id: "EST-DRAFT",
      title: "Draft patio",
      status: "draft",
      scopeSummary: "This should not train Apex yet.",
    },
  ], []);

  assert.ok(suggestions.length >= 2);
  assert.equal(suggestions.every((entry) => entry.status === "suggested"), true);
  assert.equal(suggestions.every((entry) => entry.sourceType === "approved-estimate-pattern"), true);
  assert.ok(suggestions.some((entry) => entry.category === "estimate-style" && entry.appliesTo.includes("fence")));
  assert.ok(suggestions.some((entry) => entry.category === "proposal-language"));
});

test("agent learning estimate suggestions dedupe against existing memory", () => {
  const existing = [{
    id: "EXISTING",
    category: "estimate-style",
    title: "Fence estimate structure",
    preference: "For fence estimates, use this reviewed structure as a starting point: Demo; Posts. Keep prices and final scope human-reviewed.",
    status: "suggested",
  }];
  const suggestions = buildAgentLearningSuggestionsFromEstimates([
    {
      id: "EST-FENCE-1",
      title: "Fence proposal",
      status: "approved",
      scopeSummary: "Fence scope.",
      estimateItems: [{ description: "Demo" }, { description: "Posts" }],
    },
  ], existing);

  assert.equal(suggestions.some((entry) => entry.title === "Fence estimate structure"), false);
});

test("agent learning suggests review-first memory from reviewed closeouts", () => {
  const suggestions = buildAgentLearningSuggestionsFromCloseoutContext({
    jobs: [
      { id: "JOB-FENCE-1", title: "Cedar fence install", status: "billing_ready" },
      { id: "JOB-DRAFT", title: "Draft patio", status: "scheduled" },
    ],
    estimates: [{ id: "EST-1", jobId: "JOB-FENCE-1", scopeSummary: "6 ft cedar fence and gate", grandTotal: 12000 }],
    dailyReports: [{ id: "DR-1", jobId: "JOB-FENCE-1", status: "reviewed" }],
    uploads: [{ id: "UP-1", jobId: "JOB-FENCE-1", caption: "Final gate alignment" }],
    timeEntries: [{ id: "TE-1", jobId: "JOB-FENCE-1", status: "completed", totalMinutes: 420 }],
    changeOrderRequests: [{ id: "CO-1", jobId: "JOB-FENCE-1", status: "approved", amount: 400 }],
  }, []);

  assert.ok(suggestions.length >= 2);
  assert.equal(suggestions.every((entry) => entry.status === "suggested"), true);
  assert.equal(suggestions.every((entry) => entry.sourceType === "reviewed-closeout-pattern"), true);
  assert.ok(suggestions.some((entry) => entry.category === "closeout" && /manual ready-to-bill signoff/i.test(entry.preference)));
  assert.ok(suggestions.some((entry) => entry.category === "proof" && /office finalizes margin manually/i.test(entry.preference)));
  assert.equal(suggestions.every((entry) => entry.appliesTo.includes("fence")), true);
});

test("agent learning closeout suggestions dedupe against existing memory", () => {
  const existing = [{
    id: "EXISTING",
    category: "closeout",
    title: "Fence closeout proof standard",
    preference: "For fence closeout, require reviewed daily report proof, final photo evidence, clean time review, safety/change-order review, and manual ready-to-bill signoff before billing work. Never let Apex finalize invoices or profit/loss automatically.",
    status: "suggested",
  }];
  const suggestions = buildAgentLearningSuggestionsFromCloseoutContext({
    jobs: [{ id: "JOB-FENCE-1", title: "Fence closeout", status: "billing_ready" }],
    estimates: [{ id: "EST-1", jobId: "JOB-FENCE-1", scopeSummary: "Fence" }],
    dailyReports: [{ id: "DR-1", jobId: "JOB-FENCE-1", status: "reviewed" }],
    uploads: [{ id: "UP-1", jobId: "JOB-FENCE-1" }],
  }, existing);

  assert.equal(suggestions.some((entry) => entry.title === "Fence closeout proof standard"), false);
});
