import assert from "node:assert/strict";
import test from "node:test";

import { changeOrderStatusLabel, deriveChangeOrderListState, filterChangeOrderRequests } from "./change-order-utils.js";

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
