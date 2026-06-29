import assert from "node:assert/strict";
import test from "node:test";

import {
  APEX_OS_TRACE_EVENT_TYPE,
  APEX_OS_TRACE_SOURCE,
  APEX_OS_TRACE_STATUS,
  buildApexOsTraceSummary,
  collectUnsafeApexOsTraceFields,
  createApexOsTraceEntry,
  hasUnsafeApexOsTraceFields,
  isUnsafeApexOsTraceFieldName,
  normalizeApexOsTraceEventType,
  normalizeApexOsTraceSource,
  normalizeApexOsTraceStatus,
  pruneApexOsTraceLog,
  redactUnsafeApexOsTraceValue,
  rejectUnsafeApexOsTraceMetadata,
  sanitizeApexOsTraceMetadata,
  stripUnsafeApexOsTraceFields,
} from "./apexOsTraceLog.js";

const NOW = new Date("2026-06-06T12:00:00.000Z");

test("Apex OS trace constants include Phase 4.6 event, status, and source values", () => {
  assert.equal(APEX_OS_TRACE_EVENT_TYPE.ASK_REQUEST, "ask-request");
  assert.equal(APEX_OS_TRACE_EVENT_TYPE.MODEL_ROUTE, "model-route");
  assert.equal(APEX_OS_TRACE_EVENT_TYPE.AFFECTIVE_STATE, "affective-state");
  assert.equal(APEX_OS_TRACE_EVENT_TYPE.ACTION_PERMISSION_CLASSIFICATION, "action-permission-classification");
  assert.equal(APEX_OS_TRACE_EVENT_TYPE.KNOWLEDGE_SUMMARY, "knowledge-summary");
  assert.equal(APEX_OS_TRACE_EVENT_TYPE.TOOL_ROUTE, "tool-route");
  assert.equal(APEX_OS_TRACE_EVENT_TYPE.UNTRUSTED_CONTENT_FIREWALL, "untrusted-content-firewall");
  assert.equal(APEX_OS_TRACE_EVENT_TYPE.ERROR, "error");
  assert.equal(APEX_OS_TRACE_STATUS.APPROVAL_REQUIRED, "approval-required");
  assert.equal(APEX_OS_TRACE_STATUS.FORBIDDEN, "forbidden");
  assert.equal(APEX_OS_TRACE_SOURCE.ASK_APEX, "ask-apex");
  assert.equal(APEX_OS_TRACE_SOURCE.KNOWLEDGE_INTELLIGENCE, "knowledge-intelligence");
  assert.equal(APEX_OS_TRACE_SOURCE.AFFECTIVE_STATE, "affective-state");
  assert.equal(APEX_OS_TRACE_SOURCE.TOOL_ROUTER, "tool-router");
  assert.equal(APEX_OS_TRACE_SOURCE.UNTRUSTED_CONTENT_FIREWALL, "untrusted-content-firewall");
});

test("Apex OS trace normalization falls back to safe defaults", () => {
  assert.equal(normalizeApexOsTraceEventType("unknown-event"), "error");
  assert.equal(normalizeApexOsTraceStatus("unknown-status"), "skipped");
  assert.equal(normalizeApexOsTraceSource("unknown-source"), "system");
  assert.equal(normalizeApexOsTraceEventType("MODEL-ROUTE"), "model-route");
  assert.equal(normalizeApexOsTraceStatus("COMPLETED"), "completed");
  assert.equal(normalizeApexOsTraceSource("ASK-APEX"), "ask-apex");
});

test("Apex OS trace entry creation keeps compact metadata only", () => {
  const entry = createApexOsTraceEntry({
    eventType: "model-route",
    source: "model-router",
    status: "completed",
    route: "risk-review",
    modelTier: "flagship",
    modelAlias: "gpt-4o",
    budgetLevel: "normal",
    maxOutputTokens: 1300,
    canExecuteNow: true,
    prompt: "raw prompt should not survive",
    messages: [{ content: "raw message should not survive" }],
    safeMessage: "Model route selected without retaining raw text.",
  }, { now: NOW });

  assert.equal(entry.eventType, "model-route");
  assert.equal(entry.source, "model-router");
  assert.equal(entry.status, "completed");
  assert.equal(entry.route, "risk-review");
  assert.equal(entry.modelAlias, "gpt-4o");
  assert.equal(entry.maxOutputTokens, 1300);
  assert.equal(entry.canExecuteNow, false);
  assert.equal(Object.hasOwn(entry, "prompt"), false);
  assert.equal(Object.hasOwn(entry, "messages"), false);
  assert.equal(Object.hasOwn(entry, "response"), false);
  assert.equal(Object.hasOwn(entry, "content"), false);
  assert.equal(entry.createdAt, "2026-06-06T12:00:00.000Z");
});

test("Apex OS trace strips unsafe raw prompt response secret and credential fields", () => {
  const raw = {
    route: "normal-chat",
    maxOutputTokens: 900,
    prompt: "private user prompt",
    messages: [{ role: "user", content: "private message body" }],
    response: "assistant response body",
    completion: "provider completion",
    headers: { authorization: "Bearer abcdefghijk" },
    cookies: "session=secret",
    token: "token: abcdefghijk",
    apiKey: "sk-123456789abc",
    password: "password: hunter2",
    credential: "credential: portal-login",
    secret: "secret: abc",
    dbUrl: "postgres://user:pass@example/db",
    nested: {
      safeCount: 2,
      rawContent: "private nested text",
    },
  };

  assert.equal(isUnsafeApexOsTraceFieldName("prompt"), true);
  assert.equal(isUnsafeApexOsTraceFieldName("maxOutputTokens"), false);
  assert.equal(hasUnsafeApexOsTraceFields(raw), true);
  assert.deepEqual(collectUnsafeApexOsTraceFields(raw).includes("prompt"), true);

  const stripped = stripUnsafeApexOsTraceFields(raw);
  const serialized = JSON.stringify(stripped);

  assert.equal(stripped.route, "normal-chat");
  assert.equal(stripped.maxOutputTokens, 900);
  assert.equal(stripped.nested.safeCount, 2);
  assert.equal(Object.hasOwn(stripped, "prompt"), false);
  assert.equal(Object.hasOwn(stripped, "messages"), false);
  assert.equal(Object.hasOwn(stripped, "response"), false);
  assert.equal(Object.hasOwn(stripped, "headers"), false);
  assert.equal(Object.hasOwn(stripped, "cookies"), false);
  assert.doesNotMatch(serialized, /private user prompt|assistant response|Bearer|hunter2|postgres:\/\//i);
});

test("Apex OS trace sanitizer and reject helper return safe metadata without raw content", () => {
  const result = rejectUnsafeApexOsTraceMetadata({
    source: "ask-apex",
    question: "private question",
    safeCount: 3,
    safeNote: "No raw content retained.",
    nested: {
      token: "token: abcdefghijk",
      count: 1,
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.unsafeFields.some((field) => field === "question"), true);
  assert.equal(result.safeMetadata.safecount, 3);
  assert.equal(result.safeMetadata.safenote, "No raw content retained.");
  assert.equal(result.safeMetadata.nested.count, 1);
  assert.equal(Object.hasOwn(result.safeMetadata, "question"), false);
  assert.equal(Object.hasOwn(result.safeMetadata.nested, "token"), false);

  const sanitized = sanitizeApexOsTraceMetadata({ safeMessage: "secret: abcdefghijk", durationMs: 12 });
  assert.equal(sanitized.safemessage, "[REDACTED]");
  assert.equal(sanitized.durationms, 12);
});

test("Apex OS trace value redaction removes credential-looking strings", () => {
  assert.equal(redactUnsafeApexOsTraceValue("Bearer abcdefghijklmno"), "[REDACTED]");
  assert.equal(redactUnsafeApexOsTraceValue("db postgres://user:pass@example/db ready"), "db [REDACTED] ready");
  assert.equal(redactUnsafeApexOsTraceValue("normal metadata"), "normal metadata");
});

test("Apex OS trace pruning bounds and age-limits in-memory metadata", () => {
  const entries = [
    createApexOsTraceEntry({ id: "old", eventType: "ask-request", source: "ask-apex", status: "completed", createdAt: "2026-05-01T12:00:00.000Z" }),
    createApexOsTraceEntry({ id: "newer", eventType: "model-route", source: "model-router", status: "completed", createdAt: "2026-06-06T11:00:00.000Z" }),
    createApexOsTraceEntry({ id: "newest", eventType: "error", source: "system", status: "error", createdAt: "2026-06-06T11:30:00.000Z" }),
  ];

  const pruned = pruneApexOsTraceLog(entries, { limit: 2, maxAgeDays: 7, now: NOW });

  assert.equal(pruned.length, 2);
  assert.equal(pruned[0].id, "newest");
  assert.equal(pruned[1].id, "newer");
  assert.equal(pruned.some((entry) => entry.id === "old"), false);
});

test("Apex OS trace summary is compact and content-free", () => {
  const entries = [
    createApexOsTraceEntry({ eventType: "ask-request", source: "ask-apex", status: "completed", createdAt: NOW }),
    createApexOsTraceEntry({ eventType: "action-permission-classification", source: "action-permission-matrix", status: "approval-required", approvalRequired: true, createdAt: NOW }),
    createApexOsTraceEntry({ eventType: "forbidden-action", source: "approval-gate", status: "forbidden", forbidden: true, createdAt: NOW }),
  ];

  const summary = buildApexOsTraceSummary(entries);

  assert.equal(summary.totalCount, 3);
  assert.equal(summary.approvalRequiredCount, 1);
  assert.equal(summary.forbiddenCount, 1);
  assert.equal(summary.eventTypes["ask-request"], 1);
  assert.equal(summary.statuses["approval-required"], 1);
  assert.equal(summary.sourceCount["ask-apex"], 1);
  assert.equal(summary.storesRawPrompt, false);
  assert.equal(summary.storesRawResponse, false);
  assert.equal(summary.storesRawMessages, false);
  assert.equal(summary.recentEntries.length, 3);
  assert.match(summary.summaryText, /safe metadata trace events/i);
});
