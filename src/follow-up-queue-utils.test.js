import assert from "node:assert/strict";
import test from "node:test";

import {
  buildManualFollowUpContactPayload,
  deriveFollowUpQueueState,
  filterFollowUpQueueItems,
} from "./follow-up-queue-utils.js";

const TODAY = "2026-05-11";

test("follow-up queue groups due today, overdue, waiting, and not contacted leads", () => {
  const state = deriveFollowUpQueueState({
    leads: [
      { id: "L-1", companyId: "COMPANY-A", customer: "Due Today", project: "Fence", status: "New", followUpDueAt: TODAY },
      { id: "L-2", companyId: "COMPANY-A", customer: "Overdue Lead", project: "Deck", status: "Contacted", followUpDueAt: "2026-05-09" },
      { id: "L-3", companyId: "COMPANY-A", customer: "Waiting Lead", project: "Siding", status: "Contacted" },
      { id: "L-4", companyId: "COMPANY-A", customer: "Fresh Lead", project: "Walkway", status: "New" },
    ],
    contactHistory: [
      { id: "CH-1", companyId: "COMPANY-A", entityType: "lead", entityId: "L-3", outcome: "Waiting on Response", method: "Email", contactedAt: "2026-05-10T12:00:00.000Z" },
    ],
  }, { today: TODAY, companyId: "COMPANY-A" });

  assert.deepEqual(state.groups.dueToday.map((item) => item.recordId), ["L-1"]);
  assert.deepEqual(state.groups.overdue.map((item) => item.recordId), ["L-2"]);
  assert.deepEqual(state.groups.waiting.map((item) => item.recordId), ["L-3"]);
  assert.deepEqual(state.groups.notContacted.map((item) => item.recordId), ["L-4"]);
});

test("follow-up queue groups recent contacts and missing scheduled follow-ups", () => {
  const state = deriveFollowUpQueueState({
    leads: [
      { id: "L-1", companyId: "COMPANY-A", customer: "Recent Scheduled", status: "Contacted" },
      { id: "L-2", companyId: "COMPANY-A", customer: "No Schedule", status: "Contacted" },
    ],
    customers: [
      { id: "C-1", companyId: "COMPANY-A", name: "Customer Due", status: "Active" },
    ],
    contactHistory: [
      { id: "CH-1", companyId: "COMPANY-A", entityType: "lead", entityId: "L-1", outcome: "Sent", method: "Text", contactedAt: "2026-05-10T12:00:00.000Z", nextFollowUpDate: "2026-05-13" },
      { id: "CH-2", companyId: "COMPANY-A", entityType: "lead", entityId: "L-2", outcome: "Sent", method: "Email", contactedAt: "2026-05-10T12:00:00.000Z" },
      { id: "CH-3", companyId: "COMPANY-A", entityType: "customer", entityId: "C-1", outcome: "Follow-Up Needed", method: "Call", contactedAt: "2026-05-08T12:00:00.000Z", nextFollowUpDate: TODAY },
    ],
  }, { today: TODAY, companyId: "COMPANY-A" });

  assert.deepEqual(state.groups.recentlyContacted.map((item) => item.recordId), ["L-1", "C-1"]);
  assert.deepEqual(state.groups.noFollowUpScheduled.map((item) => item.recordId), ["L-2"]);
  assert.deepEqual(state.groups.dueToday.map((item) => item.recordId), ["C-1"]);
});

test("closed records are excluded and company scoping is respected", () => {
  const state = deriveFollowUpQueueState({
    leads: [
      { id: "L-1", companyId: "COMPANY-A", customer: "Open Lead", status: "New" },
      { id: "L-2", companyId: "COMPANY-A", customer: "Closed Lead", status: "No Thanks", followUpDueAt: TODAY },
      { id: "L-3", companyId: "COMPANY-B", customer: "Other Company", status: "New" },
    ],
    contactHistory: [
      { id: "CH-OTHER", companyId: "COMPANY-B", entityType: "lead", entityId: "L-3", outcome: "Follow-Up Needed", nextFollowUpDate: TODAY },
    ],
  }, { today: TODAY, companyId: "COMPANY-A" });

  assert.deepEqual(state.items.map((item) => item.recordId), ["L-1"]);
});

test("lead source checks can appear in due and overdue queue buckets", () => {
  const state = deriveFollowUpQueueState({
    leadSources: [
      { id: "LS-1", companyId: "COMPANY-A", name: "Overdue Portal", status: "Active", nextCheckAt: "2026-05-09" },
      { id: "LS-2", companyId: "COMPANY-A", name: "Today Portal", status: "Active", nextCheckAt: TODAY },
    ],
  }, { today: TODAY, companyId: "COMPANY-A" });

  assert.deepEqual(state.groups.overdue.map((item) => item.id), ["leadSource:LS-1"]);
  assert.deepEqual(state.groups.dueToday.map((item) => item.id), ["leadSource:LS-2"]);
});

test("queue filtering supports group, type, and search", () => {
  const state = deriveFollowUpQueueState({
    leads: [
      { id: "L-1", customer: "Albany Fence", project: "Fence", status: "New", followUpDueAt: TODAY },
      { id: "L-2", customer: "Deck Customer", project: "Deck", status: "New" },
    ],
  }, { today: TODAY });

  assert.deepEqual(filterFollowUpQueueItems(state.items, { group: "dueToday" }).map((item) => item.recordId), ["L-1"]);
  assert.deepEqual(filterFollowUpQueueItems(state.items, { type: "lead", query: "deck" }).map((item) => item.recordId), ["L-2"]);
});

test("manual quick actions create contact history payloads without sending messages", () => {
  const item = {
    type: "lead",
    recordId: "L-1",
    title: "Albany Fence",
    contactName: "Alex",
    contactEmail: "alex@example.com",
    contactPhone: "555-555-0100",
  };

  const tomorrow = buildManualFollowUpContactPayload(item, "follow-up-tomorrow", { today: TODAY, now: "2026-05-11T15:30:00.000Z" });
  assert.equal(tomorrow.entityType, "lead");
  assert.equal(tomorrow.entityId, "L-1");
  assert.equal(tomorrow.method, "Other");
  assert.equal(tomorrow.outcome, "Follow-Up Needed");
  assert.equal(tomorrow.nextFollowUpDate, "2026-05-12");
  assert.match(tomorrow.notes, /manual/i);

  const textPayload = buildManualFollowUpContactPayload(item, "log-text", { today: TODAY, now: "2026-05-11T15:30:00.000Z" });
  assert.equal(textPayload.method, "Text");
  assert.equal(textPayload.outcome, "Sent");
  assert.match(textPayload.notes, /did not send this text/i);
});
