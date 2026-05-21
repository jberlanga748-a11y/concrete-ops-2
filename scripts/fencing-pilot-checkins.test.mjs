import assert from "node:assert/strict";
import test from "node:test";

import {
  buildFencingPilotCheckinPacket,
  formatFencingPilotCheckinMarkdown,
} from "./fencing-pilot-checkins.mjs";

const validInput = {
  company: "Friendly Fence Co",
  owner: "Riley Owner",
  fieldLead: "Sam Foreman",
  workflow: "lead / opportunity -> estimate -> job -> schedule -> field proof",
  firstRecord: "Cedar fence replacement estimate",
  fieldAction: "Upload one fence jobsite photo",
  startDate: "2026-06-01",
  successCriteria: [
    "Owner can find proof without text search",
    "Field user uploads one photo from phone",
  ],
};

test("fencing pilot check-in packet builds day 3 and day 10 dates", () => {
  const report = buildFencingPilotCheckinPacket(validInput);

  assert.equal(report.ok, true);
  assert.equal(report.packet.day3Date, "2026-06-04");
  assert.equal(report.packet.day10Date, "2026-06-11");
  assert.equal(report.decisions.day3Checkin, "READY");
  assert.equal(report.decisions.publicLaunch, "NO-GO");
});

test("fencing pilot check-in packet requires concrete pilot inputs", () => {
  const report = buildFencingPilotCheckinPacket({
    company: "Friendly Fence Co",
    successCriteria: ["too few"],
  });

  assert.equal(report.ok, false);
  assert.ok(report.blockers.includes("Owner/admin contact is required."));
  assert.ok(report.blockers.includes("Exact pilot workflow is required."));
  assert.ok(report.blockers.includes("First real record is required."));
  assert.ok(report.blockers.includes("First field action is required."));
  assert.ok(report.blockers.includes("Provide 2 or 3 success criteria."));
});

test("fencing pilot check-in packet rejects risky promises", () => {
  const report = buildFencingPilotCheckinPacket({
    ...validInput,
    successCriteria: [
      "AI automatically bids jobs",
      "Guaranteed leads arrive",
    ],
  });

  assert.equal(report.ok, false);
  assert.ok(report.blockers.includes("Remove guaranteed-result, AI autopilot, auto-bidding, replacement, enterprise/compliance, or custom-build promises."));
});

test("fencing pilot check-in packet rejects secret-like text", () => {
  const report = buildFencingPilotCheckinPacket({
    ...validInput,
    firstRecord: "password: hunter2",
  });

  assert.equal(report.ok, false);
  assert.ok(report.blockers.includes("Remove passwords, tokens, API keys, or secrets from the check-in packet."));
});

test("fencing pilot check-in markdown renders scorecard and boundaries", () => {
  const report = buildFencingPilotCheckinPacket(validInput);
  const markdown = formatFencingPilotCheckinMarkdown(report);

  assert.match(markdown, /Day 3 Questions/);
  assert.match(markdown, /Day 10 Scorecard/);
  assert.match(markdown, /Continue \/ Adjust \/ Narrow \/ Stop/);
  assert.match(markdown, /no custom build promise/);
  assert.match(markdown, /Production deploy: NO-GO/);
});
