import assert from "node:assert/strict";
import test from "node:test";

import {
  APEX_OS_TASK_CATEGORIES,
  APEX_OS_TASK_PRIORITIES,
  APEX_OS_TASK_STATUSES,
  APEX_OS_TASK_TYPES,
  createApexOsTaskRecord,
  detectApexOsTaskSafetyIssues,
  filterApexOsTasksByType,
  normalizeApexOsTaskRecord,
  normalizeApexOsTasks,
  redactApexOsTaskText,
  summarizeApexOsTasks,
  updateApexOsTaskRecord,
} from "./apexOsTasks.js";

test("Apex OS task constants expose the internal-only shape", () => {
  assert.deepEqual(APEX_OS_TASK_TYPES, ["task", "reminder"]);
  assert.equal(APEX_OS_TASK_CATEGORIES.includes("apex-hq"), true);
  assert.equal(APEX_OS_TASK_STATUSES.includes("in-progress"), true);
  assert.equal(APEX_OS_TASK_PRIORITIES.includes("critical"), true);
});

test("Apex OS task creation normalizes defaults and trims text", () => {
  const now = "2026-06-06T12:00:00.000Z";
  const task = createApexOsTaskRecord({
    title: "  Make a task for the assistant brain layer  ",
    notes: "  Keep it private.  ",
  }, {
    id: "AOT-1",
    now,
    createdBy: "U-JOHN",
  });

  assert.equal(task.id, "AOT-1");
  assert.equal(task.type, "task");
  assert.equal(task.title, "Make a task for the assistant brain layer");
  assert.equal(task.notes, "Keep it private.");
  assert.equal(task.category, "general");
  assert.equal(task.status, "open");
  assert.equal(task.priority, "normal");
  assert.equal(task.source, "manual");
  assert.equal(task.createdBy, "U-JOHN");
  assert.equal(task.createdAt, now);
  assert.equal(task.updatedAt, now);
});

test("Apex OS task normalization falls back from invalid values safely", () => {
  const task = normalizeApexOsTaskRecord({
    id: "AOT-INVALID",
    type: "execute",
    title: "Valid title",
    category: "unknown-area",
    status: "queued",
    priority: "urgent-now",
    source: "plugin",
    dueAt: "tomorrow-ish",
  });

  assert.equal(task.type, "task");
  assert.equal(task.category, "general");
  assert.equal(task.status, "open");
  assert.equal(task.priority, "normal");
  assert.equal(task.source, "manual");
  assert.equal(task.dueAt, "");
});

test("Apex OS task title is required by normalized list and text is capped", () => {
  const longTitle = "A".repeat(240);
  const longNotes = "B".repeat(2200);
  const rows = normalizeApexOsTasks([
    { id: "AOT-NO-TITLE", title: "   " },
    { id: "AOT-LONG", title: longTitle, notes: longNotes },
  ]);

  assert.equal(rows.length, 1);
  assert.equal(rows[0].title.length, 140);
  assert.equal(rows[0].notes.length, 1800);
});

test("Apex OS tasks flag and redact emails and credentials", () => {
  const unsafe = "Call mike@example.test with password: super-secret and API key sk-test-123456789abc.";
  const task = createApexOsTaskRecord({
    title: "Unsafe credential",
    notes: unsafe,
  }, {
    id: "AOT-UNSAFE",
  });

  assert.equal(detectApexOsTaskSafetyIssues(unsafe).length >= 2, true);
  assert.match(redactApexOsTaskText(unsafe), /\[REDACTED\]/);
  assert.equal(task.safetyFlags.some((flag) => /cannot store email/i.test(flag)), true);
  assert.equal(task.safetyFlags.some((flag) => /cannot store passwords/i.test(flag)), true);
});

test("Apex OS task update preserves immutable fields", () => {
  const existing = createApexOsTaskRecord({
    type: "reminder",
    title: "Call Mike",
    source: "voice",
  }, {
    id: "AOR-1",
    now: "2026-06-06T12:00:00.000Z",
    createdBy: "U-JOHN",
  });
  const updated = updateApexOsTaskRecord(existing, {
    id: "AOT-OTHER",
    type: "task",
    title: "Call Mike after lunch",
    status: "in-progress",
    priority: "high",
    source: "manual",
  }, {
    now: "2026-06-06T13:00:00.000Z",
  });

  assert.equal(updated.id, "AOR-1");
  assert.equal(updated.type, "reminder");
  assert.equal(updated.source, "voice");
  assert.equal(updated.createdBy, "U-JOHN");
  assert.equal(updated.createdAt, "2026-06-06T12:00:00.000Z");
  assert.equal(updated.title, "Call Mike after lunch");
  assert.equal(updated.status, "in-progress");
  assert.equal(updated.priority, "high");
  assert.equal(updated.updatedAt, "2026-06-06T13:00:00.000Z");
});

test("Apex OS task summary stays compact for Ask Apex context", () => {
  const rows = [
    createApexOsTaskRecord({
      type: "task",
      title: "Finish assistant brain layer",
      category: "apex-hq",
      priority: "critical",
      dueAt: "2026-06-07T09:00:00.000Z",
    }, { id: "AOT-1" }),
    createApexOsTaskRecord({
      type: "reminder",
      title: "Call Mike",
      category: "business",
      priority: "high",
      dueText: "tomorrow morning",
    }, { id: "AOR-1" }),
    createApexOsTaskRecord({
      type: "task",
      title: "Archived item",
      status: "archived",
    }, { id: "AOT-ARCHIVED" }),
  ];
  const summary = summarizeApexOsTasks(rows, {
    now: "2026-06-06T12:00:00.000Z",
    limit: 2,
  });

  assert.equal(summary.openTaskCount, 1);
  assert.equal(summary.openReminderCount, 1);
  assert.equal(summary.archivedCount, 1);
  assert.equal(summary.highestPriorityItems.length, 2);
  assert.equal(summary.highestPriorityItems[0].title, "Finish assistant brain layer");
  assert.equal(summary.dueSoonItems[0].id, "AOT-1");
  assert.match(summary.summaryText, /1 open task, 1 open reminder/);
  assert.deepEqual(filterApexOsTasksByType(rows, "reminder").map((row) => row.id), ["AOR-1"]);
});
