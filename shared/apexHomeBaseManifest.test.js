import assert from "node:assert/strict";
import test from "node:test";

import {
  buildApexHomeBaseManifest,
  summarizeApexHomeBaseManifest,
} from "./apexHomeBaseManifest.js";

test("Apex Home Base v1 declares this PC as Apex dedicated local home", () => {
  const manifest = buildApexHomeBaseManifest({
    workspaceRoot: "C:\\Users\\jberl\\Documents\\New project",
    generatedAt: "2026-06-09T00:00:00.000Z",
    activeBuilderAreas: ["family-care"],
  });

  assert.equal(manifest.mode, "apex-home-base-v1");
  assert.equal(manifest.identity.operatingRule, "This PC is Apex's dedicated home.");
  assert.equal(manifest.identity.pcRole, "apex-dedicated-home");
  assert.equal(manifest.identity.localFirst, true);
  assert.equal(manifest.identity.cloudOperatingPath, false);
  assert.equal(manifest.identity.githubRequiredToRun, false);
  assert.equal(manifest.identity.deployRequiredToRun, false);
  assert.equal(manifest.workspace.root, "C:\\Users\\jberl\\Documents\\New project");
  assert.equal(manifest.workspace.repoIsApexHomeBase, true);
  assert.equal(manifest.launch.primaryCommand, "npm.cmd run apex:local");
  assert.equal(manifest.launch.shortcutCommand, "npm.cmd run apex:local -- --shortcuts-only");
  assert.equal(manifest.launch.userShouldSeeLocalhost, false);
  assert.equal(manifest.launch.localhostIsInternalPlumbing, true);
  assert.equal(manifest.runtime.brain.provider, "llama.cpp");
  assert.equal(manifest.runtime.brain.model, "gpt-oss:20b");
  assert.equal(manifest.runtime.legacyFallback.defaultUse, false);
  assert.equal(manifest.selfEditLoop.activeBuilderAreas.includes("family-care"), true);
  assert.equal(manifest.selfEditLoop.commitLocally, true);
  assert.equal(manifest.selfEditLoop.pushDefault, false);
  assert.equal(manifest.safety.openAiUsedByDefault, false);
  assert.equal(manifest.safety.deployAdded, false);
  assert.equal(manifest.safety.permissionsLoosened, false);
});

test("Apex Home Base v1 summary stays local and conversational", () => {
  const manifest = buildApexHomeBaseManifest({
    workspaceRoot: "C:\\Users\\jberl\\Documents\\New project",
    generatedAt: "2026-06-09T00:00:00.000Z",
  });
  const summary = summarizeApexHomeBaseManifest(manifest);

  assert.match(summary, /This PC is Apex's dedicated home/i);
  assert.match(summary, /npm\.cmd run apex:local/i);
  assert.match(summary, /llama\.cpp \/ gpt-oss:20b/i);
  assert.match(summary, /cloud audio default is off/i);
  assert.doesNotMatch(summary, /github required|deploy required/i);
});
