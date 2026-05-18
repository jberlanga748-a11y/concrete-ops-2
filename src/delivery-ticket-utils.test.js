import assert from "node:assert/strict";
import test from "node:test";

import { buildDeliveryTicketSupportContext, deliveryTicketTitle, deriveDeliveryTicketListState, filterDeliveryTickets } from "./delivery-ticket-utils.js";

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

test("delivery ticket support context summarizes visible office tickets without linked file or financial data", () => {
  const context = buildDeliveryTicketSupportContext({
    user: { name: "Ops Owner", role: "Owner" },
    permissions: { deliveryTickets: { canManageAll: true } },
    visibleRows: [
      {
        ...TICKETS[0],
        yardsDelivered: 8.5,
        reportId: "R-1",
        ticketUploadId: "",
        ticketUpload: {
          contentUrl: "/api/uploads/secret-preview",
          storagePath: "company-one/uploads/ticket-photo.png",
          dataUrl: "data:image/png;base64,abc",
          latitude: 44.9,
          longitude: -123.0,
        },
        estimateTotal: 12000,
        internalCost: 7200,
        payRate: 44,
      },
      {
        ...TICKETS[1],
        yardsDelivered: 0,
        reportId: "",
        ticketUploadId: "UP-2",
        ticketUpload: { contentUrl: "/api/uploads/hidden-preview" },
      },
    ],
    selectedTicket: {
      ...TICKETS[0],
      yardsDelivered: 8.5,
      reportId: "R-1",
      ticketUploadId: "",
      ticketUpload: {
        contentUrl: "/api/uploads/secret-preview",
        storagePath: "company-one/uploads/ticket-photo.png",
        dataUrl: "data:image/png;base64,abc",
        latitude: 44.9,
        longitude: -123.0,
      },
    },
    filters: {
      archived: "All",
      job: "Martinez Front Walk",
      supplier: "Knife River",
      createdBy: "All creators",
      date: "2026-04-25",
      search: "driveway",
    },
    visibleJobs: [{ id: "J-2201" }, { id: "J-2202" }],
  });

  assert.equal(context.workflow, "Tickets / checklists");
  assert.match(context.summary, /Scope: all visible company delivery tickets/);
  assert.match(context.summary, /Visible tickets: 2; active: 1; linked photos: 1; linked daily reports: 1; missing photos: 1; missing reports: 1; incomplete basics: 1; archived in view: 1; yards logged: 8.5/);
  assert.match(context.summary, /Selected ticket: KR-1001 for Martinez Front Walk/);
  assert.match(context.workaround, /Visible job options: 2 jobs/);
  const serialized = JSON.stringify(context);
  assert.doesNotMatch(serialized, /storagePath|contentUrl|data:image|secret-preview|hidden-preview/);
  assert.doesNotMatch(serialized, /44\.9|-123|estimateTotal|internalCost|payRate|12000|7200/);
});

test("delivery ticket support context stays limited to field-visible tickets", () => {
  const context = buildDeliveryTicketSupportContext({
    user: { id: "U-FIELD", name: "Crew Foreman", role: "Foreman" },
    permissions: { deliveryTickets: { canView: true, canCreate: true, canEditOwn: true, canManageAll: false } },
    visibleRows: [
      {
        id: "DTK-FIELD",
        supplier: "Cadman",
        truckNumber: "Truck 4",
        ticketNumber: "CD-400",
        yardsDelivered: 5,
        createdBy: "U-FIELD",
        createdByName: "Crew Foreman",
        createdAt: "2026-04-26T10:00:00.000Z",
        jobId: "J-FIELD",
        job: { title: "Assigned Patio", customer: "Visible Customer" },
        ticketUploadId: "",
        reportId: "",
      },
    ],
    selectedTicket: {
      id: "DTK-FIELD",
      supplier: "Cadman",
      truckNumber: "Truck 4",
      ticketNumber: "CD-400",
      yardsDelivered: 5,
      createdBy: "U-FIELD",
      createdByName: "Crew Foreman",
      createdAt: "2026-04-26T10:00:00.000Z",
      jobId: "J-FIELD",
      job: { title: "Assigned Patio", customer: "Visible Customer" },
      ticketUploadId: "",
      reportId: "",
    },
    visibleJobs: [{ id: "J-FIELD" }],
  });

  assert.match(context.summary, /Scope: assigned job delivery tickets/);
  assert.match(context.summary, /Visible tickets: 1/);
  assert.match(context.summary, /Selected ticket: CD-400 for Assigned Patio/);
  assert.doesNotMatch(context.summary, /Office Supplier|Unrelated Commercial Pour|Hidden Customer|pricing|payroll|margin|grossPay/);
  assert.match(context.workaround, /CD-400: Photo evidence not linked/);
});
