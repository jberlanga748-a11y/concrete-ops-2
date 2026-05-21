import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPilotRehearsalPlan,
  formatPilotRehearsalMarkdown,
  validatePilotRehearsalPlan,
} from "./pilot-rehearsal.mjs";

test("pilot rehearsal plan builds day 0, day 3, and day 10 dates", () => {
  const plan = buildPilotRehearsalPlan({
    company: "Acme Concrete",
    workflow: "estimate -> job -> field proof",
    owner: "Riley Owner",
    fieldLead: "Sam Foreman",
    firstRecord: "Maple Ridge driveway estimate",
    fieldAction: "Upload one pour photo",
    startDate: "2026-06-01",
    successCriteria: [
      "Owner can find the proof without text search",
      "Field user uploads one photo",
    ],
  });

  assert.equal(plan.day3Date, "2026-06-04");
  assert.equal(plan.day10Date, "2026-06-11");
  assert.ok(plan.referenceDocs.includes("docs/apex-hq-first-guided-user-walkthrough-script.md"));
  assert.ok(plan.referenceDocs.includes("docs/apex-hq-pilot-feedback-intake-form.md"));
  assert.ok(plan.guidedWalkthroughRoutes.includes("/estimates"));
  assert.ok(plan.guidedWalkthroughRoutes.includes("/support"));
  assert.equal(validatePilotRehearsalPlan(plan).ok, true);
});

test("pilot rehearsal validation requires exact workflow and two or three success criteria", () => {
  const plan = buildPilotRehearsalPlan({
    company: "Acme Concrete",
    owner: "Riley Owner",
    firstRecord: "First job",
    fieldAction: "Upload one photo",
    successCriteria: ["Too few"],
  });
  const validation = validatePilotRehearsalPlan(plan);

  assert.equal(validation.ok, false);
  assert.ok(validation.issues.includes("Select one exact workflow for the pilot."));
  assert.ok(validation.issues.includes("Provide 2 or 3 plain-language success criteria."));
});

test("pilot rehearsal validation rejects risky pilot promises", () => {
  const plan = buildPilotRehearsalPlan({
    company: "Acme Concrete",
    workflow: "lead follow-up",
    owner: "Riley Owner",
    firstRecord: "First lead",
    fieldAction: "Owner reviews lead",
    successCriteria: [
      "Guarantees leads",
      "AI sends messages automatically",
    ],
  });

  const validation = validatePilotRehearsalPlan(plan);
  assert.equal(validation.ok, false);
  assert.ok(validation.issues.some((issue) => /Remove custom-build/i.test(issue)));
});

test("pilot rehearsal markdown preserves safety boundaries", () => {
  const plan = buildPilotRehearsalPlan({
    company: "Acme Concrete",
    workflow: "job -> field report -> owner review",
    owner: "Riley Owner",
    firstRecord: "Sunset slab",
    fieldAction: "Submit one daily report",
    successCriteria: [
      "Owner sees the report",
      "Field user submits without help",
    ],
  });
  const markdown = formatPilotRehearsalMarkdown(plan);

  assert.match(markdown, /Boundary: this plan does not create apps/i);
  assert.match(markdown, /Guided Walkthrough Routes/i);
  assert.match(markdown, /\/command-center/i);
  assert.match(markdown, /Required Reference Docs/i);
  assert.match(markdown, /apex-hq-first-guided-user-walkthrough-script\.md/i);
  assert.match(markdown, /no guaranteed leads/i);
  assert.match(markdown, /Day 3/i);
  assert.match(markdown, /Day 10/i);
});
