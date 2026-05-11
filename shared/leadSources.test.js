import assert from "node:assert/strict";
import test from "node:test";

import {
  createLeadSourceDraftFromStarter,
  deriveLeadSourceListState,
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

test("lead source starters are generic editable drafts", () => {
  const draft = createLeadSourceDraftFromStarter("plan-room");
  assert.equal(draft.name, "Plan room");
  assert.equal(draft.type, "Plan room");
  assert.equal(draft.url, "");
  assert.match(draft.notes, /Add the plan room link/i);
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
