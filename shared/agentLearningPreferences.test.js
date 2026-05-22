import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAgentLearningContext,
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
