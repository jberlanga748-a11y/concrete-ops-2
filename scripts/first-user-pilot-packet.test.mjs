import assert from "node:assert/strict";
import test from "node:test";

import {
  buildFirstUserPilotPacket,
  formatFirstUserPilotPacketMarkdown,
} from "./first-user-pilot-packet.mjs";

test("first user pilot packet combines candidate, walkthrough, support, and rehearsal sections", () => {
  const packet = buildFirstUserPilotPacket({
    company: "Friendly Fence Co",
    trade: "fencing",
    workflow: "lead -> estimate -> job -> field proof",
    owner: "Riley Owner",
    fieldLead: "Sam Foreman",
    firstRecord: "Cedar fence replacement lead",
    fieldAction: "Upload one progress photo",
    startDate: "2026-06-01",
    successCriteria: [
      "Owner can review proof without text search",
      "Field user uploads one photo from phone",
    ],
  });

  assert.equal(packet.ok, true);
  assert.equal(packet.goNoGo.guidedDemo, "GO");
  assert.equal(packet.goNoGo.publicLaunch, "NO-GO");
  assert.equal(packet.rehearsal.day3Date, "2026-06-04");
  assert.equal(packet.rehearsal.day10Date, "2026-06-11");
  assert.ok(packet.requiredDocs.includes("docs/apex-hq-first-guided-user-walkthrough-script.md"));
  assert.ok(packet.walkthroughSteps.some((step) => /Estimate Studio/i.test(step)));
  assert.ok(packet.supportFields.includes("severity P0/P1/P2/P3"));
});

test("first user pilot packet stays no-go until trade and rehearsal inputs are complete", () => {
  const packet = buildFirstUserPilotPacket({
    company: "Friendly Fence Co",
    owner: "Riley Owner",
    firstRecord: "First lead",
    fieldAction: "Upload one photo",
    successCriteria: ["Too few"],
  });

  assert.equal(packet.ok, false);
  assert.equal(packet.goNoGo.guidedDemo, "NO-GO");
  assert.ok(packet.blockers.includes("Trade is required so the first-user packet can stay specific."));
  assert.ok(packet.blockers.includes("Select one exact workflow for the pilot."));
  assert.ok(packet.blockers.includes("Provide 2 or 3 plain-language success criteria."));
});

test("first user pilot packet markdown includes safety boundaries and first message", () => {
  const packet = buildFirstUserPilotPacket({
    company: "Friendly Fence Co",
    trade: "fencing",
    workflow: "estimate -> job -> field proof",
    owner: "Riley Owner",
    firstRecord: "Gate rebuild estimate",
    fieldAction: "Upload one gate alignment photo",
    successCriteria: [
      "Owner can find the photo",
      "Field user completes one action",
    ],
  });
  const markdown = formatFirstUserPilotPacketMarkdown(packet);

  assert.match(markdown, /First Message/i);
  assert.match(markdown, /guided fencing pilot/i);
  assert.match(markdown, /Walkthrough Run Of Show/i);
  assert.match(markdown, /Support Intake Fields/i);
  assert.match(markdown, /Public launch: NO-GO/i);
  assert.match(markdown, /Production deploy remains locked/i);
});
