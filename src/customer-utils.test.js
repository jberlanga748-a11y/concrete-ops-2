import assert from "node:assert/strict";
import test from "node:test";

import { filterCustomers, relatedCustomerRecords } from "./customer-utils.js";

const CUSTOMERS = [
  {
    id: "C-1001",
    name: "Megan Carter",
    company: "",
    phone: "503-555-0101",
    email: "megan@example.com",
    city: "Albany",
    serviceArea: "Mid-Valley",
    status: "Active",
    archivedAt: null,
  },
  {
    id: "C-1003",
    name: "Alicia Nguyen",
    company: "",
    phone: "503-555-0103",
    email: "alicia@example.com",
    city: "Corvallis",
    serviceArea: "Benton County",
    status: "Prospect",
    archivedAt: null,
  },
  {
    id: "C-1002",
    name: "Harris Auto",
    company: "Harris Auto",
    phone: "503-555-0102",
    email: "shop@example.com",
    city: "Lebanon",
    serviceArea: "Santiam Corridor",
    status: "Inactive",
    archivedAt: "2026-04-24T12:00:00.000Z",
  },
  {
    id: "C-1004",
    name: "Northside Storage",
    company: "Northside Storage",
    phone: "503-555-0104",
    email: "ops@northside.example.com",
    city: "Keizer",
    serviceArea: "North Salem",
    status: "Inactive",
    archivedAt: null,
  },
];

test("customer filtering matches contact, geography, and status", () => {
  assert.deepEqual(filterCustomers(CUSTOMERS, { query: "mid-valley" }).map((customer) => customer.id), ["C-1001"]);
  assert.deepEqual(filterCustomers(CUSTOMERS, { query: "503-555-0101" }).map((customer) => customer.id), ["C-1001"]);
  assert.deepEqual(filterCustomers(CUSTOMERS, { query: "shop@example.com", status: "Archived" }).map((customer) => customer.id), ["C-1002"]);
  assert.deepEqual(filterCustomers(CUSTOMERS, { status: "Active" }).map((customer) => customer.id), ["C-1001"]);
});

test("customer filtering supports each status tab and combined search", () => {
  assert.deepEqual(filterCustomers(CUSTOMERS, { status: "Prospect" }).map((customer) => customer.id), ["C-1003"]);
  assert.deepEqual(filterCustomers(CUSTOMERS, { status: "Active" }).map((customer) => customer.id), ["C-1001"]);
  assert.deepEqual(filterCustomers(CUSTOMERS, { status: "Inactive" }).map((customer) => customer.id), ["C-1004"]);
  assert.deepEqual(filterCustomers(CUSTOMERS, { status: "Archived" }).map((customer) => customer.id), ["C-1002"]);
  assert.deepEqual(filterCustomers(CUSTOMERS, { status: "Prospect", query: "corvallis" }).map((customer) => customer.id), ["C-1003"]);
  assert.deepEqual(filterCustomers(CUSTOMERS, { status: "Inactive", query: "northside" }).map((customer) => customer.id), ["C-1004"]);
  assert.deepEqual(filterCustomers(CUSTOMERS, { status: "Archived", query: "harris" }).map((customer) => customer.id), ["C-1002"]);
});

test("related customer records include linked leads, jobs, and activity mentions", () => {
  const related = relatedCustomerRecords(
    CUSTOMERS[0],
    [
      { id: "L-1", customerId: "C-1001", customer: "Megan Carter", project: "Driveway", city: "Albany", status: "New" },
      { id: "L-2", customerId: "", customer: "Someone Else", project: "Patio", city: "Salem", status: "New" },
    ],
    [
      { id: "J-1", customerId: "C-1001", customer: "Megan Carter", job: "Carter Driveway", next: "Pour", stage: "Scheduled" },
      { id: "J-2", customerId: "", customer: "Other", job: "Other Job", next: "Call", stage: "Waiting" },
    ],
    [
      { id: "A-1", title: "Photos uploaded", detail: "Megan Carter progress photos uploaded." },
      { id: "A-2", title: "Estimate sent", detail: "Harris Auto estimate emailed." },
    ],
  );

  assert.deepEqual(related.leads.map((lead) => lead.id), ["L-1"]);
  assert.deepEqual(related.jobs.map((job) => job.id), ["J-1"]);
  assert.deepEqual(related.activity.map((entry) => entry.id), ["A-1"]);
});
