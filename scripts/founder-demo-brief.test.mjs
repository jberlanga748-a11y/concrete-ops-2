import assert from "node:assert/strict";
import test from "node:test";

import {
  buildFounderDemoBrief,
  formatFounderDemoBrief,
  parseTrackerRows,
} from "./founder-demo-brief.mjs";

const trackerFixture = `
| # | Company | Contact | Channel | Status | Last Touch | Next Touch | Pain/Angle | Objection | Demo Date | Pilot Fit | Follow-Up Needed | Notes |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Alpha Concrete | Phone: 555-0101 | SMS + email | Ready for Outreach |  | 2026-05-18 | estimates scattered |  |  | High | first SMS/email |  |
| 2 | Beta Excavation |  | Email + call | Ready for Outreach |  | Day 1 | job handoff |  |  | Medium | first email/call |  |
| 3 | Closed Contractor |  | Email | Do Not Contact | 2026-05-17 |  | no fit | no |  | Low |  | asked not to contact |
| 4 | Gamma Hardscape |  | Call | Demo Scheduled | 2026-05-17 | 2026-05-19 | photos and reports |  | 2026-05-19 | High | prep demo |  |
| 5 | Delta Flatwork |  | SMS | Contacted - SMS | 2026-05-17 | 2026-05-18 | follow-up |  |  | High | check reply |  |
`;

test("parseTrackerRows reads tracker table cells", () => {
  const rows = parseTrackerRows(trackerFixture);
  assert.equal(rows.length, 5);
  assert.equal(rows[0].company, "Alpha Concrete");
  assert.equal(rows[0].contact, "Phone: 555-0101");
  assert.equal(rows[0].pilotFit, "High");
});

test("buildFounderDemoBrief prioritizes due manual outreach and excludes closed rows", () => {
  const brief = buildFounderDemoBrief({ trackerContent: trackerFixture, today: "2026-05-18", limit: 3 });

  assert.equal(brief.counts.trackerRows, 5);
  assert.equal(brief.counts.readyForOutreach, 2);
  assert.equal(brief.counts.dueToday, 1);
  assert.deepEqual(brief.topManualOutreach.map((row) => row.company), ["Alpha Concrete", "Beta Excavation"]);
  assert.equal(brief.topManualOutreach.some((row) => row.company === "Closed Contractor"), false);
  assert.deepEqual(brief.scheduledDemos.map((row) => row.company), ["Gamma Hardscape"]);
  assert.deepEqual(brief.followUps.map((row) => row.company), ["Delta Flatwork", "Gamma Hardscape"]);
});

test("formatFounderDemoBrief preserves manual-only guardrails", () => {
  const brief = buildFounderDemoBrief({ trackerContent: trackerFixture, today: "2026-05-18", limit: 2 });
  const output = formatFounderDemoBrief(brief);

  assert.match(output, /Manual only/i);
  assert.match(output, /Do not send or publish/i);
  assert.match(output, /lead\/estimate -> job setup -> field handoff/i);
  assert.match(output, /Alpha Concrete/);
});
