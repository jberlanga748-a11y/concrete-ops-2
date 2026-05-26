import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  loadNotificationState,
  notificationStateTimestamp,
  upsertNotificationItemMeta,
} from "./notification-state-utils.js";

test("notification timestamps sort missing and invalid dates safely", () => {
  assert.equal(notificationStateTimestamp({ updatedAt: "2026-05-26T10:00:00.000Z" }) > 0, true);
  assert.equal(notificationStateTimestamp({ updatedAt: "not-a-date" }), 0);
  assert.equal(notificationStateTimestamp({}), 0);
});

test("notification item metadata merges new item state without losing existing metadata", () => {
  const timestamp = "2026-05-26T12:00:00.000Z";
  const meta = upsertNotificationItemMeta([
    { id: "n-1", type: "lead", createdAt: "2026-05-25T12:00:00.000Z", read: true },
    { id: "n-2", type: "job", archived: true },
  ], {
    itemMeta: [
      { id: "n-1", type: "old", createdAt: "2026-05-24T12:00:00.000Z", readAt: "2026-05-25T13:00:00.000Z" },
      { id: "stale", type: "kept", createdAt: "2026-05-20T12:00:00.000Z" },
    ],
  }, timestamp);

  assert.deepEqual(meta.find((item) => item.id === "n-1"), {
    id: "n-1",
    type: "lead",
    createdAt: "2026-05-24T12:00:00.000Z",
    readAt: "2026-05-25T13:00:00.000Z",
    archivedAt: "",
    updatedAt: timestamp,
  });
  assert.deepEqual(meta.find((item) => item.id === "n-2"), {
    id: "n-2",
    type: "job",
    createdAt: timestamp,
    readAt: "",
    archivedAt: timestamp,
    updatedAt: timestamp,
  });
  assert.equal(meta.some((item) => item.id === "stale"), true);
});

test("load notification state prefers newer local state and falls back safely", () => {
  const originalWindow = globalThis.window;
  const storage = new Map();
  globalThis.window = {
    localStorage: {
      getItem: (key) => storage.get(key) || null,
    },
  };

  try {
    storage.set("newer", JSON.stringify({ readIds: ["a"], updatedAt: "2026-05-26T12:00:00.000Z" }));
    assert.deepEqual(loadNotificationState("newer", { readIds: ["b"], updatedAt: "2026-05-25T12:00:00.000Z" }).readIds, ["a"]);

    storage.set("older", JSON.stringify({ readIds: ["a"], updatedAt: "2026-05-24T12:00:00.000Z" }));
    assert.deepEqual(loadNotificationState("older", { readIds: ["b"], updatedAt: "2026-05-25T12:00:00.000Z" }).readIds, ["b"]);

    storage.set("invalid", "{not json");
    assert.deepEqual(loadNotificationState("invalid", { readIds: ["fallback"], updatedAt: "2026-05-25T12:00:00.000Z" }).readIds, ["fallback"]);
  } finally {
    if (originalWindow === undefined) {
      delete globalThis.window;
    } else {
      globalThis.window = originalWindow;
    }
  }
});

test("notification state helpers are extracted from App", () => {
  const appSource = fs.readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  const topbarSource = fs.readFileSync(new URL("./app-topbar-components.jsx", import.meta.url), "utf8");
  const utilSource = fs.readFileSync(new URL("./notification-state-utils.js", import.meta.url), "utf8");

  assert.match(topbarSource, /import \{[\s\S]*loadNotificationState,[\s\S]*notificationStateTimestamp,[\s\S]*upsertNotificationItemMeta,[\s\S]*\} from "\.\/notification-state-utils";/);
  assert.match(utilSource, /export function notificationStateTimestamp\b/);
  assert.match(utilSource, /export function upsertNotificationItemMeta\b/);
  assert.match(utilSource, /export function loadNotificationState\b/);
  assert.match(utilSource, /import \{ normalizeNotificationState \} from "\.\/notification-center-utils\.js";/);

  assert.doesNotMatch(appSource, /from "\.\/notification-state-utils"/);
  assert.doesNotMatch(appSource, /function notificationStateTimestamp\b/);
  assert.doesNotMatch(appSource, /function upsertNotificationItemMeta\b/);
  assert.doesNotMatch(appSource, /function loadNotificationState\b/);
});
