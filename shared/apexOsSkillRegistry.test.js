import assert from "node:assert/strict";
import test from "node:test";

import {
  APEX_OS_SKILL_CATEGORIES,
  APEX_OS_SKILL_RISKS,
  APEX_OS_SKILL_STATUSES,
  buildApexOsSkillRegistrySummary,
  buildDefaultApexOsSkillRegistry,
  filterApexOsSkillRegistry,
  getApexOsAvailableSkills,
  getApexOsPlannedSkills,
  isApexOsSkillAvailable,
  isApexOsSkillExecutable,
  isApexOsSkillPlanned,
  normalizeApexOsSkillCategory,
  normalizeApexOsSkillRecord,
  normalizeApexOsSkillRegistry,
  normalizeApexOsSkillRisk,
  normalizeApexOsSkillStatus,
} from "./apexOsSkillRegistry.js";

test("Apex OS skill registry constants expose Phase 4 catalog values", () => {
  assert.deepEqual(APEX_OS_SKILL_STATUSES, ["available", "planned", "disabled", "blocked", "deprecated"]);
  assert.equal(APEX_OS_SKILL_CATEGORIES.includes("knowledge"), true);
  assert.equal(APEX_OS_SKILL_CATEGORIES.includes("environment"), true);
  assert.equal(APEX_OS_SKILL_RISKS.includes("external-action"), true);
  assert.equal(APEX_OS_SKILL_RISKS.includes("forbidden"), true);
});

test("Apex OS skill registry builder returns operator-only non-executing records", () => {
  const registry = buildDefaultApexOsSkillRegistry();
  const ids = registry.map((entry) => entry.id);

  assert.equal(ids.includes("memory"), true);
  assert.equal(ids.includes("memory-suggestions"), true);
  assert.equal(ids.includes("tasks"), true);
  assert.equal(ids.includes("reminders"), true);
  assert.equal(ids.includes("research-knowledge-engine"), true);
  assert.equal(ids.includes("desktop-browser-control"), true);
  assert.equal(ids.includes("life-automation-connectors"), true);
  assert.equal(ids.includes("apex-hq-builder-operator-agent"), true);
  assert.equal(ids.includes("production-deploy-admin-actions"), true);
  assert.equal(registry.every((entry) => entry.operatorOnly === true), true);
  assert.equal(registry.every((entry) => entry.canExecute === false), true);
  assert.equal(registry.every((entry) => isApexOsSkillExecutable(entry) === false), true);
});

test("Apex OS skill normalization falls back from unknown values safely", () => {
  const normalized = normalizeApexOsSkillRecord({
    id: "Bad ID With Spaces!",
    name: "  Risky custom skill  ",
    description: "A".repeat(500),
    category: "unsafe-category",
    status: "running",
    risk: "execute-now",
    operatorOnly: false,
    canExecute: true,
    requiresApproval: false,
  });

  assert.equal(normalized.id, "bad-id-with-spaces");
  assert.equal(normalized.name, "Risky custom skill");
  assert.equal(normalized.description.length, 320);
  assert.equal(normalized.category, "system");
  assert.equal(normalized.status, "disabled");
  assert.equal(normalized.risk, "forbidden");
  assert.equal(normalized.operatorOnly, true);
  assert.equal(normalized.canExecute, false);
  assert.equal(normalizeApexOsSkillStatus("not-real"), "disabled");
  assert.equal(normalizeApexOsSkillCategory("not-real"), "system");
  assert.equal(normalizeApexOsSkillRisk("not-real"), "forbidden");
});

test("Apex OS skill registry filters available and planned capabilities", () => {
  const registry = buildDefaultApexOsSkillRegistry();
  const available = getApexOsAvailableSkills(registry);
  const planned = getApexOsPlannedSkills(registry);
  const knowledge = filterApexOsSkillRegistry(registry, { category: "knowledge" });

  assert.equal(available.some((entry) => entry.id === "memory"), true);
  assert.equal(available.some((entry) => entry.id === "desktop-browser-control"), false);
  assert.equal(planned.some((entry) => entry.id === "desktop-browser-control"), true);
  assert.equal(planned.every((entry) => isApexOsSkillPlanned(entry)), true);
  assert.equal(knowledge.some((entry) => entry.id === "docs-file-knowledge"), true);
});

test("Apex OS planned disabled and blocked skills are never executable", () => {
  const registry = buildDefaultApexOsSkillRegistry();
  const planned = registry.find((entry) => entry.id === "ordering-booking");
  const disabled = registry.find((entry) => entry.id === "plugin-execution");
  const blocked = registry.find((entry) => entry.id === "production-deploy-admin-actions");

  assert.equal(isApexOsSkillAvailable(planned), false);
  assert.equal(isApexOsSkillExecutable(planned), false);
  assert.equal(isApexOsSkillExecutable(disabled), false);
  assert.equal(isApexOsSkillExecutable(blocked), false);
  assert.equal(blocked.status, "blocked");
  assert.equal(blocked.risk, "forbidden");
});

test("Apex OS skill registry summary stays compact for Ask Apex context", () => {
  const summary = buildApexOsSkillRegistrySummary(buildDefaultApexOsSkillRegistry(), { limit: 4 });

  assert.equal(summary.operatorOnly, true);
  assert.equal(summary.executionLocked, true);
  assert.equal(summary.canExecute, false);
  assert.equal(summary.executableCount, 0);
  assert.equal(summary.availableCount >= 6, true);
  assert.equal(summary.plannedCount >= 6, true);
  assert.equal(summary.disabledBlockedCount >= 2, true);
  assert.equal(summary.topAvailableSkillNames.length <= 4, true);
  assert.equal(summary.plannedFutureCapabilityNames.length <= 4, true);
  assert.equal(summary.availableSkills.every((entry) => entry.canExecute === false), true);
  assert.match(summary.summaryText, /0 executable in Phase 4/);
});

test("Apex OS skill registry normalization drops invalid records and duplicate ids", () => {
  const rows = normalizeApexOsSkillRegistry([
    { id: "", name: "Missing id" },
    { id: "duplicate", name: "First duplicate", status: "available", category: "memory", risk: "safe-read" },
    { id: "duplicate", name: "Second duplicate", status: "planned", category: "system", risk: "safe-read" },
    { id: "valid-skill", name: "Valid skill", status: "available", category: "planning", risk: "safe-read" },
  ]);

  assert.deepEqual(rows.map((entry) => entry.id), ["duplicate", "valid-skill"]);
  assert.equal(rows[0].name, "First duplicate");
});
