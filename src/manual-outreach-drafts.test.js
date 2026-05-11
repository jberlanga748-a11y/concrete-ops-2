import assert from "node:assert/strict";
import test from "node:test";

import {
  buildManualOutreachContactPayload,
  buildManualOutreachDrafts,
  getManualOutreachDisplayName,
  normalizeManualOutreachChannel,
} from "./manual-outreach-drafts.js";

const QUEUE_ITEM = {
  type: "lead",
  recordId: "L-1",
  title: "Patio replacement",
  subtitle: "Back patio / Albany / Website",
  contactName: "Megan Carter",
  contactEmail: "megan@example.com",
  contactPhone: "555-555-0100",
  nextFollowUpDate: "2026-05-12",
  lastContactedAt: "2026-05-10T12:00:00.000Z",
  lastContactMethod: "Call",
  outcome: "Left Message",
  status: "Contacted",
  reason: "Follow-up is due today.",
  nextStep: "Confirm site visit time",
  fitReason: "Has contact and project context.",
};

test("manual outreach drafts build email, SMS, and scripts from existing queue context", () => {
  const drafts = buildManualOutreachDrafts(QUEUE_ITEM, {
    senderName: "Jordan",
    companyName: "Concrete Ops Test",
  });

  assert.equal(drafts.emailSubject, "Following up on Patio replacement");
  assert.match(drafts.emailBody, /Hi Megan/);
  assert.match(drafts.emailBody, /Patio replacement/);
  assert.match(drafts.emailBody, /Thanks,\nJordan/);
  assert.match(drafts.smsBody, /this is Jordan/);
  assert.match(drafts.callScript, /Ask for: Megan Carter/);
  assert.match(drafts.callScript, /log the outcome/i);
  assert.match(drafts.voicemailScript, /calling about Patio replacement/);
  assert.match(drafts.manualOnlyNotice, /does not send/i);
});

test("manual outreach drafts use safe fallbacks without inventing pricing or scope", () => {
  const drafts = buildManualOutreachDrafts({ type: "customer", recordId: "C-1" }, {
    companyName: "Last Yard",
  });
  const combined = `${drafts.emailSubject}\n${drafts.emailBody}\n${drafts.smsBody}\n${drafts.callScript}`;

  assert.match(drafts.emailBody, /^Hi,/);
  assert.match(combined, /your project/);
  assert.doesNotMatch(combined, /\$\d/);
  assert.doesNotMatch(combined, /\b(approved|guaranteed|scheduled for|final price)\b/i);
});

test("manual outreach display names and channels normalize safely", () => {
  assert.equal(getManualOutreachDisplayName({ contactName: "Alicia Nguyen", title: "Deck" }), "Alicia Nguyen");
  assert.equal(getManualOutreachDisplayName({ title: "Deck" }), "Deck");
  assert.equal(getManualOutreachDisplayName({}), "there");
  assert.equal(normalizeManualOutreachChannel("Text Message"), "text");
  assert.equal(normalizeManualOutreachChannel("voice-mail"), "voicemail");
  assert.equal(normalizeManualOutreachChannel("unknown"), "other");
});

test("manual outreach contact payloads store copy-only email, text, and call notes", () => {
  const drafts = buildManualOutreachDrafts(QUEUE_ITEM, { senderName: "Jordan" });
  const email = buildManualOutreachContactPayload(QUEUE_ITEM, "mark-email-sent", {
    drafts,
    now: "2026-05-11T15:30:00.000Z",
    today: "2026-05-11",
  });
  const text = buildManualOutreachContactPayload(QUEUE_ITEM, "mark-text-sent", {
    drafts,
    now: "2026-05-11T15:30:00.000Z",
    today: "2026-05-11",
  });
  const call = buildManualOutreachContactPayload(QUEUE_ITEM, "log-call", {
    drafts,
    now: "2026-05-11T15:30:00.000Z",
    today: "2026-05-11",
  });

  assert.equal(email.method, "Email");
  assert.equal(email.outcome, "Sent");
  assert.match(email.notes, /outside Concrete Ops/);
  assert.match(email.notes, /did not send this email/);
  assert.equal(email.messageDraft, drafts.emailBody);
  assert.equal(text.method, "Text");
  assert.match(text.notes, /did not send this text/);
  assert.equal(text.messageDraft, drafts.smsBody);
  assert.equal(call.method, "Call");
  assert.match(call.notes, /did not place this call/);
  assert.equal(call.messageDraft, drafts.callScript);
});

test("manual outreach queue actions create waiting and follow-up payloads without sending", () => {
  const waiting = buildManualOutreachContactPayload(QUEUE_ITEM, "mark-waiting", {
    now: "2026-05-11T15:30:00.000Z",
    today: "2026-05-11",
  });
  const tomorrow = buildManualOutreachContactPayload(QUEUE_ITEM, "follow-up-tomorrow", {
    now: "2026-05-11T15:30:00.000Z",
    today: "2026-05-11",
  });
  const twoDays = buildManualOutreachContactPayload(QUEUE_ITEM, "follow-up-two-days", {
    now: "2026-05-11T15:30:00.000Z",
    today: "2026-05-11",
  });

  assert.equal(waiting.outcome, "Waiting on Response");
  assert.match(waiting.notes, /No message was sent/);
  assert.equal(tomorrow.nextFollowUpDate, "2026-05-12");
  assert.match(tomorrow.notes, /No message was sent/);
  assert.equal(twoDays.nextFollowUpDate, "2026-05-13");
  assert.match(twoDays.notes, /No message was sent/);
});

test("manual outreach payloads ignore unsupported lead-source draft actions", () => {
  assert.equal(buildManualOutreachContactPayload({ type: "leadSource", recordId: "LS-1" }, "mark-email-sent"), null);
});
