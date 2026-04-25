import assert from "node:assert/strict";
import test from "node:test";

import { deriveLeadListState, filterLeads, relatedLeadActivity } from "./lead-utils.js";

const LEADS = [
  { id: "L-1", customerId: "C-1", customer: "Megan Carter", city: "Albany", project: "Driveway", status: "New", priority: "High", owner: "Jordan Berl", source: "Website", followUpDueAt: "2026-04-25", nextStep: "Call", notes: "Fast lead", archivedAt: null },
  { id: "L-2", customerId: "C-2", customer: "Alicia Nguyen", city: "Corvallis", project: "Walkway", status: "Site Visit", priority: "Normal", owner: "Ray", source: "Referral", followUpDueAt: "2026-04-23", nextStep: "Measure", notes: "Needs estimate", archivedAt: null },
  { id: "L-3", customerId: "C-3", customer: "Harris Auto", city: "Lebanon", project: "Shop slab", status: "Approved", priority: "High", owner: "Jordan Berl", source: "Repeat Customer", followUpDueAt: "", nextStep: "Convert", notes: "Commercial", archivedAt: "2026-04-24T12:00:00.000Z" },
];

test("lead filtering supports status, owner, source, due bucket, archive state, and search", () => {
  assert.deepEqual(filterLeads(LEADS, { status: "New" }).map((lead) => lead.id), ["L-1"]);
  assert.deepEqual(filterLeads(LEADS, { owner: "Ray" }).map((lead) => lead.id), ["L-2"]);
  assert.deepEqual(filterLeads(LEADS, { source: "Website" }).map((lead) => lead.id), ["L-1"]);
  assert.deepEqual(filterLeads(LEADS, { due: "Due today", today: "2026-04-25" }).map((lead) => lead.id), ["L-1"]);
  assert.deepEqual(filterLeads(LEADS, { due: "Overdue", today: "2026-04-25" }).map((lead) => lead.id), ["L-2"]);
  assert.deepEqual(filterLeads(LEADS, { due: "No due date", today: "2026-04-25" }).map((lead) => lead.id), []);
  assert.deepEqual(filterLeads(LEADS, { status: "Archived", query: "harris" }).map((lead) => lead.id), ["L-3"]);
  assert.deepEqual(filterLeads(LEADS, { status: "Site Visit", owner: "Ray", query: "estimate", today: "2026-04-25" }).map((lead) => lead.id), ["L-2"]);
});

test("derived lead state exposes filtered rows plus owner and source options", () => {
  const derived = deriveLeadListState(LEADS, { status: "All", owner: "Jordan Berl", today: "2026-04-25" });

  assert.deepEqual(derived.filteredLeads.map((lead) => lead.id), ["L-1"]);
  assert.deepEqual(derived.ownerOptions, ["Jordan Berl", "Ray"]);
  assert.deepEqual(derived.sourceOptions, ["Referral", "Repeat Customer", "Website"]);
});

test("related lead data returns customer, activity, and status history", () => {
  const related = relatedLeadActivity(
    LEADS[0],
    [{ id: "C-1", name: "Megan Carter", status: "Prospect" }],
    [
      { id: "A-1", title: "Lead created", detail: "Megan Carter entered for Driveway." },
      { id: "A-2", title: "Other activity", detail: "Unrelated item." },
    ],
    [
      { id: "H-1", leadId: "L-1", fromStatus: null, toStatus: "New", note: "Lead created." },
      { id: "H-2", leadId: "L-2", fromStatus: "New", toStatus: "Site Visit", note: "Moved." },
    ],
  );

  assert.equal(related.customer?.id, "C-1");
  assert.deepEqual(related.activity.map((item) => item.id), ["A-1"]);
  assert.deepEqual(related.statusHistory.map((item) => item.id), ["H-1"]);
});
