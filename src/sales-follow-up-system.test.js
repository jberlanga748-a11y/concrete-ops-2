import assert from "node:assert/strict";
import test from "node:test";

import {
  buildSalesFollowUpScriptLibrary,
  deriveLeadSourcePerformance,
  deriveSalesFollowUpSystemState,
  deriveStaleEstimateReminders,
  deriveWonLostLearning,
} from "./sales-follow-up-system.js";

const TODAY = "2026-05-30";

test("sales follow-up system combines daily queue, stale estimates, source performance, and scripts", () => {
  const state = deriveSalesFollowUpSystemState({
    leads: [
      { id: "L-1", companyId: "COMPANY-A", customer: "Overdue Lead", project: "Patio", status: "New", source: "Website", followUpDueAt: "2026-05-28" },
      { id: "L-2", companyId: "COMPANY-A", customer: "Fresh Lead", project: "Driveway", status: "New", source: "Referral" },
      { id: "L-3", companyId: "COMPANY-A", customer: "Won Lead", project: "Walkway", status: "Won", source: "Referral" },
    ],
    estimates: [
      { id: "E-1", companyId: "COMPANY-A", title: "Driveway estimate", customerName: "Megan", status: "Estimate Sent", sentAt: "2026-05-20" },
    ],
    contactHistory: [
      { id: "CH-1", companyId: "COMPANY-A", entityType: "lead", entityId: "L-3", outcome: "Won", method: "Call", notes: "Won because referral trusted us.", contactedAt: "2026-05-29T12:00:00.000Z" },
    ],
  }, { today: TODAY, companyId: "COMPANY-A", companyName: "Apex HQ Test", senderName: "Jordan" });

  assert.equal(state.stats.overdue, 1);
  assert.equal(state.stats.notContacted, 1);
  assert.equal(state.stats.staleEstimates, 1);
  assert.equal(state.stats.sourcesTracked, 2);
  assert.ok(state.dailyQueue.some((item) => item.recordId === "L-1"));
  assert.ok(state.staleEstimates.some((item) => item.id === "E-1" && /no next follow-up|No logged estimate touch/i.test(item.reason)));
  assert.ok(state.sourcePerformance.some((row) => row.source === "Referral" && row.won === 1));
  assert.ok(state.scripts.some((script) => script.id === "referral"));
  assert.ok(state.nextActions.some((action) => /overdue/.test(action)));
});

test("stale estimate reminders flag sent estimates with missing or overdue follow-up", () => {
  const reminders = deriveStaleEstimateReminders([
    { id: "E-1", companyId: "COMPANY-A", title: "No follow-up", status: "Sent", sentAt: "2026-05-20" },
    { id: "E-2", companyId: "COMPANY-A", title: "Overdue", status: "Proposal Sent", followUpDueAt: "2026-05-27" },
    { id: "E-3", companyId: "COMPANY-A", title: "Won", status: "Approved", followUpDueAt: "2026-05-27" },
  ], [], { today: TODAY, companyId: "COMPANY-A" });

  assert.deepEqual(reminders.map((row) => row.id), ["E-2", "E-1"]);
  assert.equal(reminders[0].tone, "red");
  assert.match(reminders[1].reason, /no next follow-up|No logged estimate touch/i);
});

test("source performance tracks won, lost, due, waiting, and open leads by source", () => {
  const rows = deriveLeadSourcePerformance([
    { id: "L-1", companyId: "COMPANY-A", customer: "A", status: "Won", source: "Website" },
    { id: "L-2", companyId: "COMPANY-A", customer: "B", status: "Lost", source: "Website" },
    { id: "L-3", companyId: "COMPANY-A", customer: "C", status: "Contacted", source: "Website", followUpDueAt: TODAY, nextStep: "Prepare estimate" },
    { id: "L-4", companyId: "COMPANY-B", customer: "Hidden", status: "Won", source: "Website" },
  ], [
    { id: "CH-1", companyId: "COMPANY-A", entityType: "lead", entityId: "L-3", outcome: "Waiting on Response", contactedAt: "2026-05-29T12:00:00.000Z" },
  ], { today: TODAY, companyId: "COMPANY-A" });

  assert.equal(rows.length, 1);
  assert.equal(rows[0].source, "Website");
  assert.equal(rows[0].won, 1);
  assert.equal(rows[0].lost, 1);
  assert.equal(rows[0].open, 1);
  assert.equal(rows[0].due, 1);
  assert.equal(rows[0].waiting, 1);
  assert.equal(rows[0].estimateReady, 1);
});

test("won lost learning keeps owner-safe reasons without exposing other companies", () => {
  const learning = deriveWonLostLearning([
    { id: "L-1", companyId: "COMPANY-A", customer: "Won Customer", project: "Patio", status: "Won", source: "Referral" },
    { id: "L-2", companyId: "COMPANY-A", customer: "Lost Customer", project: "Driveway", status: "Lost", source: "Website", notes: "Too expensive." },
    { id: "L-3", companyId: "COMPANY-B", customer: "Hidden", project: "Shop", status: "Won", source: "Referral" },
  ], [
    { id: "CH-1", companyId: "COMPANY-A", entityType: "lead", entityId: "L-1", outcome: "Won", notes: "Fast callback won it.", contactedAt: "2026-05-29T12:00:00.000Z" },
  ], { today: TODAY, companyId: "COMPANY-A" });

  assert.equal(learning.stats.won, 1);
  assert.equal(learning.stats.lost, 1);
  assert.equal(learning.rows.some((row) => row.customer === "Hidden"), false);
  assert.match(learning.rows.find((row) => row.outcome === "Won").reason, /Fast callback/);
});

test("script library includes follow-up, referral, and review asks without sending language", () => {
  const scripts = buildSalesFollowUpScriptLibrary({
    type: "lead",
    recordId: "L-1",
    title: "Patio",
    contactName: "Megan Carter",
  }, { senderName: "Jordan" });

  assert.deepEqual(scripts.map((script) => script.id), ["call", "voicemail", "email", "text", "referral", "review"]);
  assert.match(scripts.find((script) => script.id === "call").body, /Ask for: Megan Carter/);
  assert.match(scripts.find((script) => script.id === "referral").body, /referral/i);
  assert.doesNotMatch(scripts.map((script) => script.body).join("\n"), /Apex HQ sent/i);
});
