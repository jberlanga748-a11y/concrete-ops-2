import assert from "node:assert/strict";
import test from "node:test";

import {
  APEX_LEARNING_CONVERSATION_INTENT,
  APEX_LEARNING_CONVERSATION_SOURCE_TYPE,
  buildApexLearningConversationResponse,
  buildApexLearningMemoryDraft,
  classifyApexLearningConversationTurn,
  summarizeApexLearningMemory,
} from "./apexLearningConversation.js";

test("classifyApexLearningConversationTurn starts learning mode naturally", () => {
  const result = classifyApexLearningConversationTurn({
    text: "Apex, I want you to learn from what I'm about to say.",
  });

  assert.equal(result.intent, APEX_LEARNING_CONVERSATION_INTENT.START);
  assert.equal(result.learningMode, true);
});

test("buildApexLearningMemoryDraft creates compact approved private memory", () => {
  const result = buildApexLearningMemoryDraft({
    text: "I want Apex to stay warm, direct, and not turn the home screen into a dashboard.",
    now: "2026-06-07T12:00:00.000Z",
  });

  assert.equal(result.ok, true);
  assert.equal(result.memoryDraft.status, "approved");
  assert.equal(result.memoryDraft.sourceType, APEX_LEARNING_CONVERSATION_SOURCE_TYPE);
  assert.equal(result.memoryDraft.category, "assistant-preference");
  assert.match(result.memoryDraft.body, /warm, direct/i);
});

test("buildApexLearningMemoryDraft blocks secrets and raw contact data", () => {
  const result = buildApexLearningMemoryDraft({
    text: "Remember my API key is sk-testsecret123456789 and my phone is 555-222-1111.",
  });

  assert.equal(result.ok, false);
  assert.equal(result.blocked, true);
  assert.equal(result.memoryDraft, null);
  assert.match(result.reason, /passwords|tokens|phone/i);
});

test("buildApexLearningConversationResponse saves only after caller persists", () => {
  const result = buildApexLearningConversationResponse({
    text: "Apex, learn this: don't bring dashboard panels back unless I ask.",
  });

  assert.equal(result.handled, true);
  assert.equal(result.intent, APEX_LEARNING_CONVERSATION_INTENT.LEARN_STATEMENT);
  assert.equal(result.learningMemoryDraft.status, "approved");
  assert.match(result.answer, /saving/i);
  assert.doesNotMatch(result.answer, /saved/i);
});

test("summarizeApexLearningMemory reports approved learning rows", () => {
  const summary = summarizeApexLearningMemory([
    {
      id: "AOM-1",
      title: "Assistant preference: Keep Apex minimal",
      body: "Keep the home surface minimal unless John asks for detail.",
      category: "assistant-preference",
      type: "assistant-preference",
      sourceType: APEX_LEARNING_CONVERSATION_SOURCE_TYPE,
      status: "approved",
      createdAt: "2026-06-07T12:00:00.000Z",
    },
    {
      id: "AOM-2",
      title: "Suggested memory",
      body: "Do not include this.",
      sourceType: APEX_LEARNING_CONVERSATION_SOURCE_TYPE,
      status: "suggested",
    },
  ]);

  assert.equal(summary.count, 1);
  assert.match(summary.answer, /Keep Apex minimal/i);
  assert.doesNotMatch(summary.answer, /Do not include this/i);
});
