import assert from "node:assert/strict";
import test from "node:test";

import {
  buildLeadSourceCheckedPatch,
  calculateNextLeadSourceCheckDate,
  createLeadSourceDraftFromStarter,
  deriveDailySourceCheckState,
  deriveLeadSourceListState,
  LEAD_SOURCE_STARTERS,
  normalizeLeadSourcePayload,
  normalizeLeadSourceUrl,
  validateLeadSourcePayload,
} from "./leadSources.js";

test("lead source validation requires a name but not a URL", () => {
  assert.deepEqual(validateLeadSourcePayload({ name: "" }), ["Source name is required."]);
  assert.deepEqual(validateLeadSourcePayload({ name: "Referral list", url: "" }), []);
});

test("lead source URLs normalize safely and reject unsupported protocols", () => {
  assert.equal(normalizeLeadSourceUrl("example.com/bids"), "https://example.com/bids");
  assert.equal(normalizeLeadSourceUrl("https://example.com/bids"), "https://example.com/bids");
  assert.equal(normalizeLeadSourceUrl("ftp://example.com/private"), "");
  assert.deepEqual(validateLeadSourcePayload({ name: "Portal", url: "nota url" }), ["Enter a valid http/https URL or leave the URL blank."]);
});

test("lead source payload normalizes options, casing, and timestamps", () => {
  const normalized = normalizeLeadSourcePayload({
    name: "  GC   Invite  Portal ",
    type: "gc bid invites",
    url: "gc.example.com",
    city: " albany ",
    state: " or ",
    status: "inactive",
    checkCadence: "weekly",
  }, { now: "2026-05-11T12:00:00.000Z" });

  assert.equal(normalized.name, "GC Invite Portal");
  assert.equal(normalized.type, "GC bid invites");
  assert.equal(normalized.url, "https://gc.example.com/");
  assert.equal(normalized.city, "albany");
  assert.equal(normalized.state, "OR");
  assert.equal(normalized.status, "Inactive");
  assert.equal(normalized.checkCadence, "Weekly");
  assert.equal(normalized.createdAt, "2026-05-11T12:00:00.000Z");
  assert.equal(normalized.updatedAt, "2026-05-11T12:00:00.000Z");
});

test("lead source starters are generic editable opportunity scout drafts", () => {
  const draft = createLeadSourceDraftFromStarter("regional-plan-rooms");
  assert.equal(draft.name, "Regional plan rooms");
  assert.equal(draft.type, "Plan room");
  assert.equal(draft.url, "");
  assert.match(draft.notes, /Add the plan room link/i);
});

test("lead source starters cover public, commercial, relationship, inbound, research, and market channels", () => {
  const groups = new Set(LEAD_SOURCE_STARTERS.map((starter) => starter.group));

  assert.equal(LEAD_SOURCE_STARTERS.length >= 10, true);
  assert.deepEqual([...groups].sort(), ["Commercial", "Inbound", "Market", "Public work", "Relationships", "Research"]);
  assert.equal(LEAD_SOURCE_STARTERS.some((starter) => starter.id === "private-job-network"), true);
  assert.equal(LEAD_SOURCE_STARTERS.every((starter) => starter.description && starter.source?.notes), true);
});

test("lead source list state filters inactive rows and tracks due checks", () => {
  const state = deriveLeadSourceListState([
    { id: "LS1", name: "Active due", status: "Active", nextCheckAt: "2026-05-01" },
    { id: "LS2", name: "Inactive", status: "Inactive", nextCheckAt: "2026-05-01" },
    { id: "LS3", name: "Active later", status: "Active", nextCheckAt: "2099-01-01" },
  ]);

  assert.deepEqual(state.sources.map((source) => source.id), ["LS1", "LS3"]);
  assert.equal(state.stats.total, 3);
  assert.equal(state.stats.active, 2);
  assert.equal(state.stats.inactive, 1);
  assert.equal(state.stats.dueForCheck, 1);
});

test("daily source check state groups overdue, due today, upcoming, and recent checks", () => {
  const state = deriveDailySourceCheckState([
    { id: "LS1", name: "Overdue portal", status: "Active", nextCheckAt: "2026-05-10", lastCheckedAt: "2026-05-01" },
    { id: "LS2", name: "Today portal", status: "Active", nextCheckAt: "2026-05-11" },
    { id: "LS3", name: "Upcoming portal", status: "Active", nextCheckAt: "2026-05-15", lastCheckedAt: "2026-05-09" },
    { id: "LS4", name: "Inactive portal", status: "Inactive", nextCheckAt: "2026-05-01", lastCheckedAt: "2026-05-10" },
    { id: "LS5", name: "Manual relationship", status: "Active", checkCadence: "Manual" },
  ], { today: "2026-05-11" });

  assert.deepEqual(state.overdueSources.map((source) => source.id), ["LS1"]);
  assert.deepEqual(state.dueTodaySources.map((source) => source.id), ["LS2"]);
  assert.deepEqual(state.upcomingSources.map((source) => source.id), ["LS3"]);
  assert.deepEqual(state.recentlyCheckedSources.map((source) => source.id), ["LS3", "LS1"]);
  assert.deepEqual(state.checksNeeded.map((source) => source.id), ["LS1", "LS2"]);
  assert.equal(state.stats.checksNeeded, 2);
});

test("next check date calculation follows cadence and leaves manual cadences blank", () => {
  assert.equal(calculateNextLeadSourceCheckDate("Daily", "2026-05-11"), "2026-05-12");
  assert.equal(calculateNextLeadSourceCheckDate("Weekly", "2026-05-11"), "2026-05-18");
  assert.equal(calculateNextLeadSourceCheckDate("Biweekly", "2026-05-11"), "2026-05-25");
  assert.equal(calculateNextLeadSourceCheckDate("Monthly", "2026-01-31"), "2026-02-28");
  assert.equal(calculateNextLeadSourceCheckDate("Quarterly", "2026-05-11"), "2026-08-11");
  assert.equal(calculateNextLeadSourceCheckDate("Manual", "2026-05-11"), "");
  assert.equal(calculateNextLeadSourceCheckDate("As needed", "2026-05-11"), "");
});

test("checked patch stamps last check, calculates next check, and appends office note", () => {
  const patch = buildLeadSourceCheckedPatch({
    checkCadence: "Weekly",
    notes: "Existing source note.",
  }, {
    checkedAt: "2026-05-11",
    checkNote: "No matching concrete bids today.",
  });

  assert.equal(patch.lastCheckedAt, "2026-05-11");
  assert.equal(patch.nextCheckAt, "2026-05-18");
  assert.match(patch.notes, /^\[2026-05-11 source check\] No matching concrete bids today\./);
  assert.match(patch.notes, /Existing source note\./);
});

test("checked patch accepts manual next check date override", () => {
  const patch = buildLeadSourceCheckedPatch({ checkCadence: "Daily" }, {
    checkedAt: "2026-05-11",
    nextCheckAt: "2026-05-30",
  });

  assert.equal(patch.lastCheckedAt, "2026-05-11");
  assert.equal(patch.nextCheckAt, "2026-05-30");
});
