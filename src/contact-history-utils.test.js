import assert from "node:assert/strict";
import test from "node:test";

import {
  contactFieldsFromEntity,
  contactHistoryTimeline,
  createContactHistoryDraft,
  deriveContactHistoryPanelState,
} from "./contact-history-utils.js";

test("contact fields are derived from customer records", () => {
  const fields = contactFieldsFromEntity({
    name: "Dana Martinez",
    email: "dana@example.com",
    phone: "503-555-0199",
  }, "customer");

  assert.deepEqual(fields, {
    contactName: "Dana Martinez",
    contactEmail: "dana@example.com",
    contactPhone: "503-555-0199",
  });
});

test("lead draft stores manual outreach only and pre-fills safe context", () => {
  const draft = createContactHistoryDraft({
    id: "L-1",
    customer: "Taylor Mason",
    notes: "Email: taylor@example.com Phone: 503-555-0101",
  }, "lead", "Text");

  assert.equal(draft.entityType, "lead");
  assert.equal(draft.entityId, "L-1");
  assert.equal(draft.contactName, "Taylor Mason");
  assert.equal(draft.contactEmail, "taylor@example.com");
  assert.match(draft.contactPhone, /503/);
  assert.equal(draft.method, "Text");
  assert.equal(draft.outcome, "Sent");
});

test("panel state and timeline include archived records only where requested", () => {
  const records = [
    { id: "CH-1", entityType: "lead", entityId: "L-1", contactedAt: "2026-05-11T08:00:00.000Z" },
    { id: "CH-2", entityType: "lead", entityId: "L-1", contactedAt: "2026-05-10T08:00:00.000Z", archivedAt: "2026-05-11T09:00:00.000Z" },
  ];

  const panelState = deriveContactHistoryPanelState(records, "lead", "L-1");
  assert.equal(panelState.records.length, 1);
  assert.equal(panelState.archivedRecords.length, 1);
  assert.equal(contactHistoryTimeline(records, "lead", "L-1").length, 2);
});
