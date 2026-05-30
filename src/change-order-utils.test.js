import assert from "node:assert/strict";
import test from "node:test";

import {
  CHANGE_ORDER_MONEY_GUARDRAILS,
  buildChangeOrderMoneyCopyText,
  buildChangeOrderMoneyPacket,
  changeOrderStatusLabel,
  deriveChangeOrderFinishState,
  deriveChangeOrderListState,
  deriveChangeOrderMoneyState,
  filterChangeOrderRequests,
  normalizeChangeOrderBillingHandoffStatus,
  normalizeChangeOrderReviewStatus,
} from "./change-order-utils.js";

test("change order status label stays human friendly", () => {
  assert.equal(changeOrderStatusLabel("under_review"), "Under Review");
  assert.equal(changeOrderStatusLabel("approved_for_pricing"), "Approved for Pricing");
});

test("change order filters support status job requester date archive and search", () => {
  const rows = [
    {
      id: "COR-1",
      status: "requested",
      reason: "Extra sidewalk panel",
      scopeDescription: "Add one more panel near the garage.",
      fieldNotes: "Customer requested at the site.",
      officeNotes: "",
      requestedByName: "Ben Foreman",
      createdAt: "2026-04-25T10:00:00.000Z",
      archivedAt: null,
      job: { title: "Martinez Front Walk", customer: "John Martinez" },
    },
    {
      id: "COR-2",
      status: "archived",
      reason: "Rejected curb extension",
      scopeDescription: "Not moving ahead.",
      fieldNotes: "",
      officeNotes: "Archived after review",
      requestedByName: "Office Ops",
      createdAt: "2026-04-24T09:00:00.000Z",
      archivedAt: "2026-04-24T11:00:00.000Z",
      job: { title: "Taylor Patio", customer: "Mia Taylor" },
    },
  ];

  assert.equal(filterChangeOrderRequests(rows, { status: "Requested" }).length, 1);
  assert.equal(filterChangeOrderRequests(rows, { archived: "Archived" }).length, 1);
  assert.equal(filterChangeOrderRequests(rows, { job: "Martinez Front Walk" }).length, 1);
  assert.equal(filterChangeOrderRequests(rows, { requestedBy: "Ben Foreman" }).length, 1);
  assert.equal(filterChangeOrderRequests(rows, { date: "2026-04-25" }).length, 1);
  assert.equal(filterChangeOrderRequests(rows, { search: "garage" }).length, 1);
});

test("change order list state tolerates sparse inputs", () => {
  const state = deriveChangeOrderListState(
    [{ requestedByName: "Ben Foreman", createdAt: "2026-04-25T10:00:00.000Z", job: { title: "Martinez Front Walk" } }],
    [{ title: "Taylor Patio" }],
  );

  assert.deepEqual(state.jobOptions, ["All jobs", "Martinez Front Walk", "Taylor Patio"]);
  assert.deepEqual(state.requesterOptions, ["All requesters", "Ben Foreman"]);
  assert.deepEqual(state.dateOptions, ["All dates", "2026-04-25"]);
});

test("change order money packet requires price, approval, and manual acceptance before billing handoff", () => {
  const packet = buildChangeOrderMoneyPacket({
    id: "COR-1",
    status: "approved_for_pricing",
    reason: "Extra concrete",
    scopeDescription: "Add driveway apron extension.",
    priceAmount: 1850,
    customerReviewStatus: "accepted_manually",
    officeNotes: "Internal margin note should never leave office.",
    jobId: "J-1",
    job: { title: "Driveway", customer: "Martinez" },
  }, { companyName: "Apex Test" });

  assert.equal(packet.readyForPricing, true);
  assert.equal(packet.priced, true);
  assert.equal(packet.readyForBillingHandoff, true);
  assert.equal(packet.priceLabel, "$1,850.00");
  assert.equal(packet.billingHandoffStatus, "ready_for_manual_billing_handoff");
  assert.deepEqual(packet.blockers, []);
  assert.deepEqual(packet.guardrails, CHANGE_ORDER_MONEY_GUARDRAILS);
  assert.equal(JSON.stringify(packet.customerSafeSummary).includes("margin"), false);
  assert.equal(JSON.stringify(packet.customerSafeSummary).includes("officeNotes"), false);
});

test("change order money packet stays locked without manual acceptance or price", () => {
  const packet = buildChangeOrderMoneyPacket({
    id: "COR-2",
    status: "under_review",
    reason: "Extra base rock",
    scopeDescription: "Add base rock at soft area.",
    jobId: "J-2",
  });

  assert.equal(packet.priced, false);
  assert.equal(packet.readyForBillingHandoff, false);
  assert.equal(packet.billingHandoffStatus, "locked");
  assert.match(packet.blockers.join(" "), /approved for pricing/i);
  assert.match(packet.blockers.join(" "), /Manual price amount/i);
  assert.match(packet.blockers.join(" "), /acceptance/i);
});

test("change order money copy is customer-safe and blocks external actions", () => {
  const copy = buildChangeOrderMoneyCopyText(buildChangeOrderMoneyPacket({
    id: "COR-3",
    status: "approved_for_pricing",
    reason: "Added gate",
    scopeDescription: "Add one pedestrian gate.",
    priceAmount: 950,
    gcReviewStatus: "sent_manually",
    officeNotes: "Cost 500 markup 90%",
    jobId: "J-3",
    job: { title: "Fence", customer: "Customer" },
  }));

  assert.match(copy, /Change Order Money Review/i);
  assert.match(copy, /No customer send, GC submission, invoice, payment collection/i);
  assert.match(copy, /\$950\.00/);
  assert.doesNotMatch(copy, /Cost 500|markup 90|officeNotes/i);
});

test("change order money state summarizes priced revenue and locked handoffs", () => {
  const state = deriveChangeOrderMoneyState([
    {
      id: "COR-1",
      status: "approved_for_pricing",
      reason: "Extra slab",
      scopeDescription: "Add one slab.",
      priceAmount: 1000,
      customerReviewStatus: "accepted_manually",
      jobId: "J-1",
    },
    {
      id: "COR-2",
      status: "approved_for_pricing",
      reason: "Extra demo",
      scopeDescription: "Remove extra concrete.",
      priceAmount: 500,
      customerReviewStatus: "ready_for_manual_review",
      jobId: "J-2",
    },
  ]);

  assert.equal(state.packets.length, 2);
  assert.equal(state.pricedPackets.length, 2);
  assert.equal(state.readyForBillingHandoff.length, 1);
  assert.equal(state.lockedPackets.length, 1);
  assert.equal(state.revenuePendingManualReview, 1500);
});

test("change order finish state tracks manual approval to billing readiness without exposing field money", () => {
  const rows = [
    {
      id: "COR-1",
      status: "approved_for_pricing",
      reason: "Extra slab",
      scopeDescription: "Add one slab.",
      priceAmount: 1200,
      customerReviewStatus: "accepted_manually",
      gcReviewStatus: "not_ready",
      billingHandoffStatus: "ready_for_manual_billing_handoff",
      jobId: "J-1",
      job: { title: "Garage slab", customer: "Martinez" },
    },
    {
      id: "COR-2",
      status: "under_review",
      reason: "Drainage change",
      scopeDescription: "",
      priceAmount: 800,
      customerReviewStatus: "not_ready",
      jobId: "J-2",
      job: { title: "Patio", customer: "Carter" },
    },
  ];

  const officeState = deriveChangeOrderFinishState(rows, { canManage: true });
  assert.equal(officeState.counts.needsOfficeReview, 1);
  assert.equal(officeState.counts.approvedForPricing, 1);
  assert.equal(officeState.counts.acceptedManually, 1);
  assert.equal(officeState.counts.readyForBillingHandoff, 1);
  assert.equal(officeState.counts.jobScopeStatusUpdateReady, 1);
  assert.equal(officeState.revenuePendingManualReview, 2000);
  assert.equal(officeState.readyForBillingHandoff[0].priceAmount, 1200);

  const fieldState = deriveChangeOrderFinishState(rows, { canManage: false });
  assert.equal(fieldState.mode, "field_safe_change_order_finish");
  assert.equal(fieldState.revenuePendingManualReview, 0);
  assert.deepEqual(fieldState.readyForBillingHandoff, []);
  assert.doesNotMatch(JSON.stringify(fieldState), /1200|\$1,200|Martinez/);
});

test("change order review statuses fail closed", () => {
  assert.equal(normalizeChangeOrderReviewStatus("accepted_manually"), "accepted_manually");
  assert.equal(normalizeChangeOrderReviewStatus("auto_sent"), "not_ready");
  assert.equal(normalizeChangeOrderBillingHandoffStatus("handed_off_manually"), "handed_off_manually");
  assert.equal(normalizeChangeOrderBillingHandoffStatus("auto_billed"), "locked");
});
