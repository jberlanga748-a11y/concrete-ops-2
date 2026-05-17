import assert from "node:assert/strict";
import test from "node:test";

import { buildSupportPacket, createSupportDraft, SUPPORT_BLOCKER_OPTIONS, SUPPORT_WORKFLOW_OPTIONS } from "./support-utils.js";

test("support draft starts as a copy-only general support request", () => {
  const draft = createSupportDraft();

  assert.equal(draft.workflow, "General workspace");
  assert.equal(draft.blockerLevel, "Not a blocker");
  assert.equal(draft.summary, "");
  assert.equal(draft.followUpNeeded, "");
  assert.equal(draft.currentPackage, "");
  assert.equal(draft.requestedPackage, "");
  assert.equal(SUPPORT_BLOCKER_OPTIONS.includes(draft.blockerLevel), true);
  assert.equal(SUPPORT_WORKFLOW_OPTIONS.includes(draft.workflow), true);
  assert.equal(SUPPORT_WORKFLOW_OPTIONS.includes("Upgrade / package review"), true);
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

test("support packet can carry manual upgrade review context without changing billing", () => {
  const packet = buildSupportPacket({
    draft: createSupportDraft({
      workflow: "Upgrade / package review",
      currentPackage: "Basic",
      requestedPackage: "Premium",
      requestedFeature: "App Health",
      upgradeReason: "Owner wants release safety and Watchtower review before adding another crew.",
      summary: "Please review whether Premium is the right next package.",
      expected: "Founder/operator reviews manually before any package change.",
    }),
    user: {
      name: "Owner Ops",
      role: "Owner",
      token: "secret-session-token",
    },
    companyName: "ABC Builders",
    currentCompanyId: "COMPANY-ABC",
    activeModule: "settings",
    path: "/settings",
    generatedAt: "2026-05-17T10:30:00.000Z",
  });

  assert.match(packet, /Manual upgrade review context/);
  assert.match(packet, /Current package: Basic/);
  assert.match(packet, /Requested package: Premium/);
  assert.match(packet, /Requested feature: App Health/);
  assert.match(packet, /did not change the package/);
  assert.match(packet, /collect payment/);
  assert.match(packet, /create an invoice/);
  assert.match(packet, /start checkout/);
  assert.equal(packet.includes("secret-session-token"), false);
});
