import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveOverallOwnerHealthStatus,
  formatBytes,
  healthStatusTone,
  ownerHealthStatusLabel,
  ownerHealthWarnings,
} from "./owner-health-utils.js";

test("owner health status helpers format labels and tones", () => {
  assert.equal(ownerHealthStatusLabel("ok"), "OK");
  assert.equal(ownerHealthStatusLabel("not_configured"), "Not configured");
  assert.equal(healthStatusTone("configured"), "green");
  assert.equal(healthStatusTone("warning"), "amber");
  assert.equal(healthStatusTone("critical"), "red");
  assert.equal(healthStatusTone("something-new"), "slate");
});

test("formatBytes handles useful sizes and missing values", () => {
  assert.equal(formatBytes(null), "Unavailable");
  assert.equal(formatBytes(-1), "Unavailable");
  assert.equal(formatBytes(0), "0 B");
  assert.equal(formatBytes(512), "512 B");
  assert.equal(formatBytes(1024), "1.0 KB");
  assert.equal(formatBytes(1024 * 1024 * 5), "5.0 MB");
  assert.equal(formatBytes(1024 * 1024 * 1024 * 2), "2.0 GB");
});

test("deriveOverallOwnerHealthStatus handles warning and critical payloads", () => {
  assert.equal(deriveOverallOwnerHealthStatus({}), "unknown");
  assert.equal(deriveOverallOwnerHealthStatus({
    app: { status: "ok" },
    database: { status: "ok" },
    storage: { status: "ok" },
    warnings: [],
  }), "ok");
  assert.equal(deriveOverallOwnerHealthStatus({
    app: { status: "ok" },
    database: { status: "ok" },
    storage: { status: "warning" },
    warnings: [{ id: "storage-high", severity: "warning" }],
  }), "warning");
  assert.equal(deriveOverallOwnerHealthStatus({
    app: { status: "ok" },
    database: { status: "warning" },
    storage: { status: "ok" },
    warnings: [],
  }), "critical");
  assert.equal(deriveOverallOwnerHealthStatus({
    warnings: [{ id: "storage-low", severity: "critical" }],
  }), "critical");
});

test("ownerHealthWarnings normalizes missing warning fields safely", () => {
  assert.deepEqual(ownerHealthWarnings({}), []);
  assert.deepEqual(ownerHealthWarnings({
    warnings: [
      { id: "ai", severity: "info", title: "AI not configured", message: "Drafts unavailable." },
      {},
    ],
  }), [
    { id: "ai", severity: "info", title: "AI not configured", message: "Drafts unavailable." },
    { id: "warning-2", severity: "warning", title: "Health warning", message: "Review this workspace health item." },
  ]);
});

