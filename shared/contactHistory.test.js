import assert from "node:assert/strict";
import test from "node:test";

import {
  contactHistoryPayloadToRecord,
  deriveContactHistorySummary,
  filterContactHistoryForEntity,
  normalizeContactHistoryRecord,
  validateContactHistoryPayload,
} from "./contactHistory.js";

test("contact history records normalize safely with defaults", () => {
  const record = normalizeContactHistoryRecord({
    id: "CH-1",
    companyId: "COMPANY-DEFAULT",
    entityType: "lead",
    entityId: "L-1",
    contactEmail: " OWNER@EXAMPLE.COM ",
    method: "email",
    direction: "inbound",
    outcome: "replied",
    nextFollowUpDate: "2026-05-14T09:00:00.000Z",
  }, { now: "2026-05-11T10:00:00.000Z" });

  assert.equal(record.contactEmail, "owner@example.com");
  assert.equal(record.method, "Email");
  assert.equal(record.direction, "inbound");
  assert.equal(record.outcome, "Replied");
  assert.equal(record.contactedAt, "2026-05-11T10:00:00.000Z");
  assert.equal(record.nextFollowUpDate, "2026-05-14");
});

test("contact history payload validation rejects missing entity details", () => {
  const errors = validateContactHistoryPayload({ method: "Carrier pigeon" });
  assert.ok(errors.some((error) => /valid contact history record type/i.test(error)));
  assert.ok(errors.some((error) => /lead, customer, estimate, or job/i.test(error)));
  assert.ok(errors.some((error) => /valid contact method/i.test(error)));
});

test("contact history payload creates actor-owned records", () => {
  const record = contactHistoryPayloadToRecord({
    entityType: "customer",
    entityId: "C-1",
    method: "Call",
    outcome: "Follow-Up Needed",
  }, {
    id: "CH-2",
    companyId: "COMPANY-DEFAULT",
    actor: { id: "U-1", name: "Office User" },
    now: "2026-05-11T11:00:00.000Z",
  });

  assert.equal(record.id, "CH-2");
  assert.equal(record.companyId, "COMPANY-DEFAULT");
  assert.equal(record.createdBy, "U-1");
  assert.equal(record.createdByName, "Office User");
});

test("contact history filters and summarizes active records by entity", () => {
  const records = [
    { id: "CH-1", entityType: "lead", entityId: "L-1", contactedAt: "2026-05-10T08:00:00.000Z", nextFollowUpDate: "2026-05-12" },
    { id: "CH-2", entityType: "lead", entityId: "L-1", contactedAt: "2026-05-11T08:00:00.000Z", nextFollowUpDate: "2026-05-11", messageDraft: "Checking in." },
    { id: "CH-3", entityType: "lead", entityId: "L-1", archivedAt: "2026-05-11T09:00:00.000Z" },
    { id: "CH-4", entityType: "customer", entityId: "C-1" },
  ];

  const filtered = filterContactHistoryForEntity(records, "lead", "L-1");
  assert.deepEqual(filtered.map((record) => record.id), ["CH-2", "CH-1"]);

  const summary = deriveContactHistorySummary(records, "lead", "L-1", { today: new Date("2026-05-11T12:00:00.000Z") });
  assert.equal(summary.latestContact.id, "CH-2");
  assert.equal(summary.nextFollowUp.id, "CH-2");
  assert.equal(summary.dueTodayFollowUps.length, 1);
  assert.equal(summary.archivedRecords.length, 1);
  assert.equal(summary.hasDrafts, true);
});
