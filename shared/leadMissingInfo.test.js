import assert from "node:assert/strict";
import test from "node:test";

import {
  checkLeadMissingInfo,
  missingInfoResultToFields,
  normalizeMissingInfoFields,
} from "./leadMissingInfo.js";

test("complete lead passes missing info check with no missing items", () => {
  const result = checkLeadMissingInfo({
    customer: "Benton County Facilities",
    city: "Albany",
    project: "Commercial concrete sidewalk replacement",
    status: "New",
    source: "Lead Finder",
    followUpDueAt: "2026-05-12",
    value: 42000,
    nextStep: "Call facilities contact and schedule site walk",
    notes: [
      "Email: facilities@example.test",
      "Phone: 541-555-0100",
      "Service type: concrete flatwork",
      "Timeline: summer bid package",
      "Project address: 123 Main St, Albany, OR",
      "Preferred contact method: email",
      "Source URL: https://example.test/bids/123",
      "Photos and plans attached in portal.",
    ].join("\n"),
  }, { now: "2026-05-11T12:00:00.000Z" });

  assert.equal(result.status, "Complete");
  assert.equal(result.missingCount, 0);
  assert.deepEqual(result.missingItems, []);
  assert.match(result.nextStep, /core info/i);
});

test("missing contact is required and produces actionable next step", () => {
  const result = checkLeadMissingInfo({
    customer: "Taylor Mason",
    city: "Salem",
    project: "Patio repair",
    source: "Referral",
    followUpDueAt: "2026-05-12",
    nextStep: "Call when contact info is found",
    notes: "Timeline: ASAP. Service type: exterior repair.",
  }, { now: "2026-05-11T12:00:00.000Z" });

  assert.equal(result.status, "Needs Info");
  assert.ok(result.missingItems.some((item) => item.key === "contact_path" && item.severity === "required"));
  assert.match(result.nextStep, /Phone or email/i);
});

test("missing project, location, source, and next step are required", () => {
  const result = checkLeadMissingInfo({
    customer: "Unknown GC",
    city: "",
    project: "",
    source: "",
    nextStep: "",
    notes: "Email: gc@example.test",
  }, { now: "2026-05-11T12:00:00.000Z" });

  const requiredKeys = result.missingItems.filter((item) => item.severity === "required").map((item) => item.key);
  assert.deepEqual(requiredKeys, ["project_description", "location", "source", "next_step"]);
  assert.equal(result.status, "Needs Info");
});

test("severity grouping includes recommended and optional contractor details", () => {
  const result = checkLeadMissingInfo({
    customer: "Megan Carter",
    city: "Keizer",
    project: "Driveway approach",
    source: "Website",
    nextStep: "Call",
    notes: "Phone: 503-555-0188",
  }, { now: "2026-05-11T12:00:00.000Z" });

  assert.ok(result.missingItems.some((item) => item.key === "follow_up_due" && item.severity === "recommended"));
  assert.ok(result.missingItems.some((item) => item.key === "photos_docs" && item.severity === "optional"));
  assert.ok(result.completedItems.includes("Phone or email"));
});

test("missing info result maps to persistent fields safely", () => {
  const result = missingInfoResultToFields({
    status: "Needs Info",
    missingCount: 2,
    missingItems: [
      { key: "contact_path", label: "Phone or email", severity: "required", reason: "Add contact." },
      { key: "notes", label: "Notes", severity: "surprise", reason: "" },
      { key: "", label: "Broken", severity: "required", reason: "Ignore." },
    ],
    nextStep: "Add contact.",
    checkedAt: "2026-05-11T12:00:00.000Z",
  });

  assert.deepEqual(result, {
    missingInfoStatus: "Needs Info",
    missingInfoCount: 2,
    missingInfoItems: [
      { key: "contact_path", label: "Phone or email", severity: "required", reason: "Add contact." },
      { key: "notes", label: "Notes", severity: "recommended", reason: "" },
    ],
    missingInfoNextStep: "Add contact.",
    missingInfoCheckedAt: "2026-05-11T12:00:00.000Z",
  });
});

test("legacy leads without missing info fields normalize safely", () => {
  assert.deepEqual(normalizeMissingInfoFields({}), {
    missingInfoStatus: "",
    missingInfoCount: 0,
    missingInfoItems: [],
    missingInfoNextStep: "",
    missingInfoCheckedAt: "",
  });
});
