import assert from "node:assert/strict";
import test from "node:test";

import { deliveryTicketTitle, deriveDeliveryTicketListState, filterDeliveryTickets } from "./delivery-ticket-utils.js";

const TICKETS = [
  {
    id: "DTK-1",
    supplier: "Knife River",
    truckNumber: "T-17",
    ticketNumber: "KR-1001",
    mixNotes: "3500 PSI driveway mix",
    notes: "First truck on site.",
    createdByName: "Crew Foreman",
    createdAt: "2026-04-25T14:30:00.000Z",
    archivedAt: null,
    job: { title: "Martinez Front Walk", customer: "Martinez Residence" },
  },
  {
    id: "DTK-2",
    supplier: "Knife River",
    truckNumber: "T-22",
    ticketNumber: "KR-1002",
    mixNotes: "Pump mix",
    notes: "",
    createdByName: "Ops Admin",
    createdAt: "2026-04-24T12:00:00.000Z",
    archivedAt: "2026-04-25T16:00:00.000Z",
    job: { title: "Salem Patio", customer: "Nguyen Patio" },
  },
];

test("delivery ticket title prefers ticket number then truck then supplier", () => {
  assert.equal(deliveryTicketTitle(TICKETS[0]), "KR-1001");
  assert.equal(deliveryTicketTitle({ truckNumber: "Truck 6" }), "Truck 6");
  assert.equal(deliveryTicketTitle({ supplier: "Knife River" }), "Knife River");
  assert.equal(deliveryTicketTitle(null), "Delivery ticket");
});

test("delivery ticket filters support job supplier creator date archive and search", () => {
  assert.equal(filterDeliveryTickets(TICKETS, { archived: "Active" }).length, 1);
  assert.equal(filterDeliveryTickets(TICKETS, { archived: "Archived" }).length, 1);
  assert.equal(filterDeliveryTickets(TICKETS, { job: "Martinez Front Walk", archived: "All" }).length, 1);
  assert.equal(filterDeliveryTickets(TICKETS, { supplier: "Knife River", archived: "All" }).length, 2);
  assert.equal(filterDeliveryTickets(TICKETS, { createdBy: "Crew Foreman", archived: "All" }).length, 1);
  assert.equal(filterDeliveryTickets(TICKETS, { date: "2026-04-25", archived: "All" }).length, 1);
  assert.equal(filterDeliveryTickets(TICKETS, { search: "driveway", archived: "All" }).length, 1);
});

test("delivery ticket list state tolerates sparse jobs and derives options", () => {
  const state = deriveDeliveryTicketListState(TICKETS, [{ id: "J-2201", title: "Martinez Front Walk" }]);
  assert.deepEqual(state.jobOptions, ["All jobs", "Martinez Front Walk", "Salem Patio"]);
  assert.deepEqual(state.supplierOptions, ["All suppliers", "Knife River"]);
  assert.deepEqual(state.creatorOptions, ["All creators", "Crew Foreman", "Ops Admin"]);
  assert.equal(state.defaultJobId, "J-2201");

  const emptyState = deriveDeliveryTicketListState(null, null);
  assert.deepEqual(emptyState.jobOptions, ["All jobs"]);
  assert.deepEqual(emptyState.supplierOptions, ["All suppliers"]);
  assert.deepEqual(emptyState.creatorOptions, ["All creators"]);
  assert.deepEqual(emptyState.dateOptions, ["All dates"]);
});
