import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveManagedCompanySetupState,
  managedSetupSettingsFromPayload,
  normalizeManagedSetupChecklist,
  normalizeManagedSetupSettings,
} from "./managedCompanySetup.js";

test("managed setup derives profile, user, source, and feature readiness", () => {
  const state = deriveManagedCompanySetupState({
    companySettings: {
      companyName: "Pacific Concrete",
      businessPhone: "503-555-0100",
      businessEmail: "office@example.test",
      serviceArea: "Salem and Portland",
      toolChecklistEnabled: true,
    },
    users: [
      { role: "Owner", status: "active" },
      { role: "Foreman", status: "active" },
      { role: "Employee", status: "active" },
    ],
    leadSources: [
      { name: "County bids", status: "Active", checkCadence: "Weekly", tradeFocus: "Concrete flatwork" },
    ],
    jobs: [{ status: "completed" }],
  });

  assert.equal(state.items.find((item) => item.key === "company_name")?.completed, true);
  assert.equal(state.items.find((item) => item.key === "lead_source_added")?.completed, true);
  assert.equal(state.items.find((item) => item.key === "lead_scoring_available")?.completed, true);
  assert.equal(state.items.find((item) => item.key === "field_permissions_safe")?.completed, true);
  assert.ok(state.completedCount > 0);
});

test("manual checklist overrides can complete or reopen derived setup items", () => {
  const state = deriveManagedCompanySetupState({
    companySettings: {
      companyName: "Pacific Concrete",
      businessPhone: "503-555-0100",
      businessEmail: "office@example.test",
      serviceArea: "Salem",
      managedSetupChecklist: [
        { key: "roles_reviewed", completed: true, note: "Reviewed with John." },
        { key: "company_name", completed: false },
      ],
    },
    users: [{ role: "Owner", status: "active" }],
    leadSources: [],
    jobs: [],
  });

  const rolesReviewed = state.items.find((item) => item.key === "roles_reviewed");
  const companyName = state.items.find((item) => item.key === "company_name");

  assert.equal(rolesReviewed.completed, true);
  assert.equal(rolesReviewed.source, "manual");
  assert.equal(rolesReviewed.note, "Reviewed with John.");
  assert.equal(companyName.completed, false);
  assert.equal(companyName.derivedCompleted, true);
});

test("managed setup payload validates checklist keys and computes readiness status", () => {
  const now = "2026-05-11T10:00:00.000Z";
  const nextSettings = managedSetupSettingsFromPayload({
    managedSetupChecklist: [
      { key: "roles_reviewed", completed: true },
      { key: "not_a_real_item", completed: true },
    ],
    managedSetupNotes: " Ready for an office walkthrough. ",
  }, {
    companyName: "Pacific Concrete",
    businessPhone: "503-555-0100",
    businessEmail: "office@example.test",
    serviceArea: "Salem",
  }, {
    users: [{ role: "Owner", status: "active" }],
    leadSources: [{ status: "Active", checkCadence: "Weekly" }],
    jobs: [],
  }, now);

  assert.equal(nextSettings.managedSetupChecklist.length, 1);
  assert.equal(nextSettings.managedSetupChecklist[0].key, "roles_reviewed");
  assert.equal(nextSettings.managedSetupChecklist[0].updatedAt, now);
  assert.equal(nextSettings.managedSetupNotes, "Ready for an office walkthrough.");
  assert.equal(["In Progress", "Ready for Managed Use"].includes(nextSettings.managedSetupStatus), true);
});

test("managed setup settings normalize stored JSON checklist safely", () => {
  const normalized = normalizeManagedSetupSettings({
    managedSetupStatus: "Ready for Managed Use",
    managedSetupChecklist: JSON.stringify([
      { key: "roles_reviewed", completed: true, note: "Done" },
      { key: "unknown", completed: true },
    ]),
    managedSetupNotes: "Notes",
  });

  assert.equal(normalized.managedSetupStatus, "Ready for Managed Use");
  assert.deepEqual(normalized.managedSetupChecklist, [
    { key: "roles_reviewed", completed: true, note: "Done", updatedAt: "" },
  ]);
  assert.equal(normalized.managedSetupNotes, "Notes");
});

test("checklist normalization accepts object form and drops duplicate items", () => {
  const rows = normalizeManagedSetupChecklist({
    roles_reviewed: { completed: true, note: "Checked" },
    field_permissions_safe: true,
  });

  assert.deepEqual(rows, [
    { key: "roles_reviewed", completed: true, note: "Checked", updatedAt: "" },
    { key: "field_permissions_safe", completed: true, note: "", updatedAt: "" },
  ]);
});
