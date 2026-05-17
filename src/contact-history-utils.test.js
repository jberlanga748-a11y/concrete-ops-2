import assert from "node:assert/strict";
import test from "node:test";

import {
  contactFieldsFromEntity,
  contactHistoryTimeline,
  createContactHistoryDraft,
  deriveCommunicationCenterState,
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

test("communication center state links manual records to office context", () => {
  const state = deriveCommunicationCenterState({
    leads: [{ id: "L-1", customer: "ABC Builders", project: "Warehouse slab", city: "Salem", status: "New" }],
    customers: [{ id: "C-1", name: "ABC Builders", city: "Salem", status: "Active" }],
    estimates: [{ id: "E-1", title: "Warehouse slab proposal", customerName: "ABC Builders", status: "Draft" }],
    jobs: [{ id: "J-1", title: "Salem warehouse slab", customer: "ABC Builders", status: "Scheduled" }],
    contactHistory: [
      {
        id: "CH-1",
        entityType: "lead",
        entityId: "L-1",
        method: "Email",
        outcome: "Waiting on Response",
        subject: "Proposal follow-up",
        messageDraft: "Following up on the warehouse slab.",
        nextFollowUpDate: "2026-05-17",
        contactedAt: "2026-05-16T12:00:00.000Z",
      },
    ],
  }, { today: new Date("2026-05-17T12:00:00.000Z"), query: "warehouse" });

  assert.equal(state.options.length, 4);
  assert.equal(state.stats.dueToday, 1);
  assert.equal(state.stats.waiting, 1);
  assert.equal(state.stats.manualDrafts, 1);
  assert.equal(state.filteredRecords.length, 1);
  assert.equal(state.filteredRecords[0].entity.label, "ABC Builders");
});
