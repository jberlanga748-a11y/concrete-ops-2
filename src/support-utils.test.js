import assert from "node:assert/strict";
import test from "node:test";

import { buildSupportPacket, createSupportDraft, SUPPORT_BLOCKER_OPTIONS, SUPPORT_WORKFLOW_OPTIONS } from "./support-utils.js";

test("support draft starts as a copy-only general support request", () => {
  const draft = createSupportDraft();

  assert.equal(draft.workflow, "General workspace");
  assert.equal(draft.blockerLevel, "Not a blocker");
  assert.equal(draft.summary, "");
  assert.equal(draft.followUpNeeded, "");
  assert.equal(SUPPORT_BLOCKER_OPTIONS.includes(draft.blockerLevel), true);
  assert.equal(SUPPORT_WORKFLOW_OPTIONS.includes(draft.workflow), true);
  assert.equal(SUPPORT_WORKFLOW_OPTIONS.includes("Setup / onboarding"), true);
});

test("support draft can start with a setup workflow context", () => {
  const draft = createSupportDraft({ workflow: "Setup / onboarding" });

  assert.equal(draft.workflow, "Setup / onboarding");
  assert.equal(draft.blockerLevel, "Not a blocker");
});

test("support packet captures role-safe issue context without sending anything", () => {
  const packet = buildSupportPacket({
    draft: {
      workflow: "Photos / uploads",
      blockerLevel: "Blocking field work",
      summary: "Upload button does not respond on the jobsite.",
      expected: "Photo picker should open.",
      workaround: "Foreman texted the picture.",
      followUpNeeded: "Today before 3 PM",
    },
    user: {
      name: "Sam Field",
      email: "sam@example.test",
      role: "Foreman",
      token: "secret-session-token",
    },
    companyName: "ABC Builders",
    currentCompanyId: "COMPANY-ABC",
    activeModule: "uploads",
    path: "/uploads",
    generatedAt: "2026-05-17T10:00:00.000Z",
  });

  assert.match(packet, /Apex HQ Support Request/);
  assert.match(packet, /Workspace: ABC Builders/);
  assert.match(packet, /Role: Foreman/);
  assert.match(packet, /Workflow: Photos \/ uploads/);
  assert.match(packet, /Blocking field work/);
  assert.match(packet, /Follow-up needed: Today before 3 PM/);
  assert.match(packet, /Upload button does not respond/);
  assert.match(packet, /copy-only/);
  assert.equal(packet.includes("secret-session-token"), false);
});
