import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveAgentConversationInbox,
  normalizeAgentConversationThread,
  redactAgentConversationText,
} from "./agentConversations.js";

test("agent conversation text redacts secrets and emails", () => {
  const redacted = redactAgentConversationText("email bob@example.com password=supersecret token: abc123456789");

  assert.doesNotMatch(redacted, /bob@example\.com|supersecret|abc123456789/i);
  assert.match(redacted, /\[REDACTED\]/);
});

test("agent conversation thread normalizes review-needed customer messages", () => {
  const thread = normalizeAgentConversationThread({
    customerName: "Newco Builders",
    projectTitle: "Sidewalk replacement",
    messages: [
      { role: "customer", author: "Newco", message: "When is the crew coming?", createdAt: "2026-05-26T10:00:00.000Z" },
      { role: "agent", author: "Apex Agent", message: "The office should confirm crew timing.", needsHumanReview: true },
    ],
    reviewCards: [{ reason: "Customer asked for schedule confirmation." }],
  }, {
    id: "AGCONV-1",
    companyId: "COMPANY-1",
    actor: { id: "U-1", name: "Owner" },
    now: "2026-05-26T10:05:00.000Z",
  });

  assert.equal(thread.id, "AGCONV-1");
  assert.equal(thread.companyId, "COMPANY-1");
  assert.equal(thread.status, "needs_review");
  assert.equal(thread.riskLevel, "medium");
  assert.equal(thread.messages.length, 2);
  assert.equal(thread.reviewCards.length, 1);
  assert.equal(thread.createdBy, "U-1");
});

test("agent conversation inbox sorts saved threads and counts review work", () => {
  const inbox = deriveAgentConversationInbox([
    { id: "old", companyId: "COMPANY-1", title: "Old", status: "reviewed", messages: [{ message: "old" }], updatedAt: "2026-05-25T10:00:00.000Z" },
    { id: "new", companyId: "COMPANY-1", title: "New", status: "needs_review", messages: [{ message: "new", needsHumanReview: true }], updatedAt: "2026-05-26T10:00:00.000Z" },
  ]);

  assert.equal(inbox.total, 2);
  assert.equal(inbox.needsReview, 1);
  assert.equal(inbox.threads[0].id, "new");
});
