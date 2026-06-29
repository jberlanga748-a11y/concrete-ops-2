import assert from "node:assert/strict";
import test from "node:test";

import {
  APEX_OS_ASSISTANT_MODE_IDS,
  APEX_OS_ASSISTANT_MODES,
  DEFAULT_APEX_OS_ASSISTANT_MODE_ID,
  buildApexOsAssistantModePrompt,
  getApexOsAssistantMode,
  inferApexOsAssistantMode,
  normalizeApexOsAssistantModeId,
} from "./apexOsAssistantModes.js";

test("Apex OS assistant modes expose the required first-phase modes", () => {
  assert.deepEqual(APEX_OS_ASSISTANT_MODE_IDS, [
    "general",
    "apex-operator",
    "business-advisor",
    "life-planner",
    "memory-task-helper",
    "tools-preview",
  ]);
  assert.equal(DEFAULT_APEX_OS_ASSISTANT_MODE_ID, "general");
  assert.equal(APEX_OS_ASSISTANT_MODES.every((mode) => mode.promptGuidance && mode.approvalBoundary), true);
});

test("Apex OS assistant mode normalization is safe by default", () => {
  assert.equal(normalizeApexOsAssistantModeId("general"), "general");
  assert.equal(normalizeApexOsAssistantModeId("apex operator"), "apex-operator");
  assert.equal(normalizeApexOsAssistantModeId("operator"), "apex-operator");
  assert.equal(normalizeApexOsAssistantModeId("not-a-mode"), "general");
  assert.equal(normalizeApexOsAssistantModeId(""), "general");
});

test("Apex OS assistant mode lookup and prompt include safety boundaries", () => {
  const mode = getApexOsAssistantMode("business-advisor");
  const prompt = buildApexOsAssistantModePrompt("business-advisor");

  assert.equal(mode.id, "business-advisor");
  assert.match(mode.description, /Business strategy/i);
  assert.match(prompt, /Assistant mode: Business Advisor/i);
  assert.match(prompt, /Blocked actions:/i);
  assert.match(prompt, /Approval boundary:/i);
  assert.match(prompt, /No email, SMS/i);
});

test("Apex OS assistant mode inference routes future tools to planning-only preview", () => {
  assert.equal(inferApexOsAssistantMode("play music"), "tools-preview");
  assert.equal(inferApexOsAssistantMode("put my schedule on the second screen"), "tools-preview");
  assert.equal(inferApexOsAssistantMode("open app and move window"), "tools-preview");
});

test("Apex OS assistant mode inference recognizes life, memory, business, and Apex operator requests", () => {
  assert.equal(inferApexOsAssistantMode("remind me tomorrow to call Mike"), "life-planner");
  assert.equal(inferApexOsAssistantMode("remember that I like short answers"), "memory-task-helper");
  assert.equal(inferApexOsAssistantMode("help me grow Apex HQ"), "business-advisor");
  assert.equal(inferApexOsAssistantMode("what is blocking Apex HQ"), "apex-operator");
  assert.equal(inferApexOsAssistantMode("deploy to production"), "apex-operator");
});
