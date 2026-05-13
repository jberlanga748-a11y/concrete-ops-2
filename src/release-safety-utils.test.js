import assert from "node:assert/strict";
import test from "node:test";

import {
  RELEASE_DANGEROUS_WARNINGS,
  RELEASE_SAFE_COMMANDS,
  RELEASE_SAFETY_CHECKLISTS,
  RELEASE_SAFETY_TARGETS,
  RELEASE_STORAGE_WARNINGS,
  getReleaseSafetyCommandGroups,
  getReleaseSafetySections,
  isDangerousReleaseCommand,
  releaseSafetyStatusTone,
} from "./release-safety-utils.js";

function allCommandText() {
  return getReleaseSafetyCommandGroups().map((group) => group.text).join("\n");
}

test("release safety targets point to the correct Apex HQ app", () => {
  assert.equal(RELEASE_SAFETY_TARGETS.repo, "jberlanga748-a11y/concrete-ops-2");
  assert.equal(RELEASE_SAFETY_TARGETS.localFolder, "C:\\Users\\jberl\\Documents\\Codex\\concrete-ops-2-clean");
  assert.equal(RELEASE_SAFETY_TARGETS.flyApp, "concrete-ops-2");
  assert.equal(RELEASE_SAFETY_TARGETS.liveApp, "https://app.apexhq.online/");
  assert.equal(RELEASE_SAFETY_TARGETS.healthCheck, "https://app.apexhq.online/api/ready");
});

test("pre and post deploy checklists include folder, repo, build, diff, and health checks", () => {
  const preDeploy = RELEASE_SAFETY_CHECKLISTS.preDeploy.join("\n");
  const postDeploy = RELEASE_SAFETY_CHECKLISTS.postDeploy.join("\n");

  assert.match(preDeploy, /correct Apex HQ project folder/i);
  assert.match(preDeploy, /Git remote is jberlanga748-a11y\/concrete-ops-2/i);
  assert.match(preDeploy, /npm\.cmd run build/i);
  assert.match(preDeploy, /git diff --check/i);
  assert.match(preDeploy, /Commit only relevant files using explicit paths/i);
  assert.match(postDeploy, /\/api\/ready returns ok true, status ready, and database ok/i);
  assert.match(postDeploy, /Owner Health Status/i);
  assert.match(postDeploy, /field roles remain restricted/i);
});

test("safe command groups include deploy, health, machine, and volume references", () => {
  const commands = allCommandText();

  assert.match(commands, /cd "C:\\Users\\jberl\\Documents\\Codex\\concrete-ops-2-clean"/);
  assert.match(commands, /git remote -v/);
  assert.match(commands, /git status --short/);
  assert.match(commands, /git branch --show-current/);
  assert.match(commands, /fly deploy -a concrete-ops-2/);
  assert.match(commands, /Invoke-RestMethod https:\/\/app\.apexhq\.online\/api\/ready/);
  assert.match(commands, /fly machine list -a concrete-ops-2/);
  assert.match(commands, /fly volumes list -a concrete-ops-2/);
  assert.match(commands, /fly volumes extend VOLUME_ID --size 20 -a concrete-ops-2/);
});

test("dangerous warnings include broad staging, risky push, secrets, wrong folder, and volume deletion cautions", () => {
  const warnings = RELEASE_DANGEROUS_WARNINGS.join("\n");

  assert.ok(warnings.includes("git add" + " ."));
  assert.ok(warnings.toLowerCase().includes("force" + " push"));
  assert.match(warnings, /delete or destroy Fly volumes/i);
  assert.match(warnings, /paste secrets/i);
  assert.match(warnings, /frontend OpenAI key/i);
  assert.match(warnings, /wrong folder/i);
  assert.match(warnings, /unrelated modified files/i);
});

test("storage warnings mention volume IDs and protect production data", () => {
  const storageWarnings = RELEASE_STORAGE_WARNINGS.join("\n");

  assert.match(storageWarnings, /Owner Health Status/i);
  assert.match(storageWarnings, /volume ID/i);
  assert.match(storageWarnings, /Never delete the production data volume/i);
});

test("command blocks do not contain secrets, placeholders for secret pasting, or destructive volume deletes", () => {
  const commands = allCommandText();

  assert.equal(commands.includes("OPENAI" + "_API_KEY"), false);
  assert.equal(commands.includes("CONCRETE" + "_OPS_IMPORT_TOKEN"), false);
  assert.equal(commands.includes("VITE" + "_OPENAI_API_KEY"), false);
  assert.equal(/password|secret|token/i.test(commands), false);
  assert.equal(new RegExp("\\bfly\\s+(volume|volumes)\\s+(delete|" + "destroy)\\b", "i").test(commands), false);
  assert.equal(new RegExp("\\bfly\\s+machine\\s+(delete|" + "destroy)\\b", "i").test(commands), false);
});

test("rollback guidance is conservative and does not provide destructive action commands", () => {
  const rollbackText = RELEASE_SAFETY_CHECKLISTS.rollback.join("\n");
  const commandText = allCommandText();

  assert.match(rollbackText, /known good release/i);
  assert.match(rollbackText, /stop and ask/i);
  assert.match(rollbackText, /Do not delete volumes or machines/i);
  assert.equal(commandText.includes("fly deploy " + "-i"), false);
  assert.equal(commandText.includes("fly " + "rollback"), false);
});

test("dangerous command detector catches risky release commands without flagging safe checks", () => {
  assert.equal(isDangerousReleaseCommand("git add" + " ."), true);
  assert.equal(isDangerousReleaseCommand("git push origin main --" + "force"), true);
  assert.equal(isDangerousReleaseCommand("fly volumes " + "delete vol_123"), true);
  assert.equal(isDangerousReleaseCommand("fly machine " + "destroy abc123"), true);
  assert.equal(isDangerousReleaseCommand("git status --short"), false);
  assert.equal(isDangerousReleaseCommand("fly deploy -a concrete-ops-2"), false);
});

test("release safety sections and tones normalize for the Settings panel", () => {
  const sections = getReleaseSafetySections();
  assert.deepEqual(sections.map((section) => section.id), ["targets", "preDeploy", "postDeploy", "dangerous", "rollback", "storage"]);
  assert.equal(getReleaseSafetyCommandGroups().every((group) => group.text === group.commands.join("\n")), true);
  assert.equal(releaseSafetyStatusTone("safe"), "green");
  assert.equal(releaseSafetyStatusTone("danger"), "red");
  assert.equal(releaseSafetyStatusTone("review"), "amber");
  assert.equal(releaseSafetyStatusTone("other"), "slate");
});
