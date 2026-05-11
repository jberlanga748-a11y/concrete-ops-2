import assert from "node:assert/strict";
import test from "node:test";

import {
  leadScoreLabelForScore,
  leadScoreResultToFields,
  normalizeLeadScoreFields,
  scoreLeadRuleBased,
} from "./leadScoring.js";

test("lead score labels follow configured score bands", () => {
  assert.equal(leadScoreLabelForScore(95), "Strong Fit");
  assert.equal(leadScoreLabelForScore(84), "Good Fit");
  assert.equal(leadScoreLabelForScore(62), "Review Needed");
  assert.equal(leadScoreLabelForScore(20), "Poor Fit");
});

test("strong contractor fit lead scores high with clear source and scope context", () => {
  const result = scoreLeadRuleBased({
    customer: "Benton County Facilities",
    city: "Albany",
    project: "Commercial sidewalk and ADA ramp concrete replacement",
    status: "New",
    priority: "High",
    value: 48000,
    source: "Albany bid page",
    nextStep: "Call facilities contact and prepare site visit",
    notes: "Email: facilities@example.test\nPhone: 541-555-0100\nLead source: Albany bid page\nPublic bid invite with concrete flatwork scope.",
  }, {
    now: "2026-05-11T12:00:00.000Z",
    leadSources: [
      {
        name: "Albany bid page",
        serviceArea: "Albany and Linn County",
        tradeFocus: "Concrete sidewalks, ADA ramps, curb work",
      },
    ],
  });

  assert.equal(result.label, "Strong Fit");
  assert.equal(result.scoreSource, "rule_based");
  assert.equal(result.scoredAt, "2026-05-11T12:00:00.000Z");
  assert.match(result.reason, /customer or company is named/i);
  assert.deepEqual(result.risks, []);
  assert.match(result.nextStep, /estimate/i);
});

test("missing-info lead stays review needed with useful risks", () => {
  const result = scoreLeadRuleBased({
    customer: "Unknown Caller",
    city: "",
    project: "",
    status: "New",
    source: "",
    nextStep: "",
    notes: "Asked about work.",
  }, { now: "2026-05-11T12:00:00.000Z" });

  assert.equal(result.label, "Review Needed");
  assert.ok(result.score >= 50 && result.score <= 69);
  assert.ok(result.risks.some((risk) => /phone or email/i.test(risk)));
  assert.ok(result.risks.some((risk) => /project/i.test(risk)));
  assert.match(result.nextStep, /Fill missing/i);
});

test("inactive or risky lead scores lower", () => {
  const result = scoreLeadRuleBased({
    customer: "Spam Bot",
    city: "Salem",
    project: "Concrete driveway",
    status: "Lost",
    source: "Website",
    nextStep: "Do not contact",
    notes: "Spam request. No thanks, unsubscribe.",
    archivedAt: "2026-05-11T12:00:00.000Z",
  }, { now: "2026-05-11T12:00:00.000Z" });

  assert.equal(result.label, "Poor Fit");
  assert.ok(result.risks.some((risk) => /inactive|archived|lost/i.test(risk)));
  assert.ok(result.risks.some((risk) => /Risk terms/i.test(risk)));
});

test("score result maps to persistent lead fields safely", () => {
  const result = leadScoreResultToFields({
    score: 88.4,
    label: "Strong Fit",
    reason: "Looks good.",
    risks: ["Missing email.", "", null],
    nextStep: "Call now.",
    scoreSource: "rule_based",
    scoredAt: "2026-05-11T12:00:00.000Z",
  });

  assert.deepEqual(result, {
    fitScore: 88,
    fitLabel: "Strong Fit",
    fitReason: "Looks good.",
    fitRisks: ["Missing email."],
    fitNextStep: "Call now.",
    scoreSource: "rule_based",
    scoredAt: "2026-05-11T12:00:00.000Z",
  });
});

test("legacy leads without score fields normalize safely", () => {
  assert.deepEqual(normalizeLeadScoreFields({}), {
    fitScore: 0,
    fitLabel: "",
    fitReason: "",
    fitRisks: [],
    fitNextStep: "",
    scoreSource: "",
    scoredAt: "",
  });
});
