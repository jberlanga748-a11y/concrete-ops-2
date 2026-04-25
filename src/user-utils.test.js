import assert from "node:assert/strict";
import test from "node:test";

import { deriveUserListState, getCrewAssignmentOptions, getForemanAssignmentOptions } from "./user-utils.js";

const USERS = [
  { id: "U-1", name: "Olivia Owner", email: "owner@test", phone: "503", role: "Owner", status: "active" },
  { id: "U-2", name: "Fiona Foreman", email: "foreman@test", phone: "971", role: "Foreman", status: "active" },
  { id: "U-3", name: "Eli Employee", email: "employee@test", phone: "541", role: "Employee", status: "active" },
  { id: "U-4", name: "Ian Inactive", email: "inactive@test", phone: "458", role: "Employee", status: "inactive" },
];

test("user list filtering supports search, role, and status", () => {
  const filtered = deriveUserListState(USERS, {
    query: "fiona",
    role: "Foreman",
    status: "active",
  }).filteredUsers;

  assert.deepEqual(filtered.map((user) => user.id), ["U-2"]);
});

test("foreman assignment options only include active foremen", () => {
  assert.deepEqual(getForemanAssignmentOptions(USERS).map((user) => user.id), ["U-2"]);
});

test("crew assignment options include active field users and exclude inactive users", () => {
  assert.deepEqual(getCrewAssignmentOptions(USERS).map((user) => user.id), ["U-2", "U-3"]);
});
