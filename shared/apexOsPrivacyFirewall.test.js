import assert from "node:assert/strict";
import test from "node:test";

import {
  APEX_OS_PRIVACY_ACTION,
  APEX_OS_PRIVACY_CONTEXT,
  APEX_OS_PRIVACY_SENSITIVITY_CATEGORY,
  APEX_OS_PRIVACY_TRUSTED_CONTEXTS,
  APEX_OS_PRIVACY_UNTRUSTED_CONTEXTS,
  buildApexOsPrivacySafeMetadata,
  buildApexOsPrivacySummary,
  classifyApexOsPrivacy,
  detectApexOsSensitiveContent,
  isApexOsPrivacyTrustedContext,
  isApexOsPrivacyUntrustedContext,
  normalizeApexOsPrivacyAction,
  normalizeApexOsPrivacyContext,
  normalizeApexOsPrivacySensitivityCategory,
  redactApexOsSensitiveText,
  sanitizeApexOsPrivacyPayload,
  shouldSendApexOsContentToCloud,
} from "./apexOsPrivacyFirewall.js";

test("Apex OS privacy firewall exposes Phase 4.7 constants and normalization", () => {
  assert.equal(APEX_OS_PRIVACY_SENSITIVITY_CATEGORY.API_KEY, "api-key");
  assert.equal(APEX_OS_PRIVACY_SENSITIVITY_CATEGORY.UNKNOWN_SENSITIVE, "unknown-sensitive");
  assert.equal(APEX_OS_PRIVACY_ACTION.SUMMARIZE_ONLY, "summarize-only");
  assert.equal(APEX_OS_PRIVACY_CONTEXT.CLOUD_MODEL, "cloud-model");
  assert.equal(APEX_OS_PRIVACY_TRUSTED_CONTEXTS.includes("operator-private"), true);
  assert.equal(APEX_OS_PRIVACY_UNTRUSTED_CONTEXTS.includes("external-connector"), true);
  assert.equal(normalizeApexOsPrivacySensitivityCategory("not-real"), "unknown-sensitive");
  assert.equal(normalizeApexOsPrivacyAction("not-real"), "approval-required");
  assert.equal(normalizeApexOsPrivacyContext("not-real"), "unknown");
  assert.equal(isApexOsPrivacyTrustedContext("local-only"), true);
  assert.equal(isApexOsPrivacyUntrustedContext("cloud-model"), true);
});

test("Apex OS privacy firewall detects and blocks API keys before cloud", () => {
  const raw = "Use api key: sk-123456789abcdefghijklmnop for this request.";
  const result = classifyApexOsPrivacy(raw, { targetContext: "cloud-model" });

  assert.equal(result.action, "block");
  assert.equal(result.blocked, true);
  assert.equal(result.allowed, false);
  assert.equal(result.categories.includes("api-key"), true);
  assert.doesNotMatch(result.sanitizedText, /sk-123456789/i);
  assert.doesNotMatch(JSON.stringify(result.metadata), /sk-123456789/i);
  assert.equal(result.metadata.storesOriginalSensitiveValue, false);
});

test("Apex OS privacy firewall detects tokens cookies headers and database URLs", () => {
  const raw = [
    "Authorization: Bearer abcdefghijklmno",
    "cookie: sessionid=very-secret",
    "token: abcdefghijklmno",
    "[REDACTED]: inheritedsecretvalue",
    "postgres://user:pass@example.com:5432/app",
  ].join(" ");
  const detection = detectApexOsSensitiveContent(raw);
  const redacted = redactApexOsSensitiveText(raw);

  assert.equal(detection.categories.includes("authorization-header"), true);
  assert.equal(detection.categories.includes("cookie"), true);
  assert.equal(detection.categories.includes("token"), true);
  assert.equal(detection.categories.includes("db-url"), true);
  assert.doesNotMatch(redacted.sanitizedText, /Bearer abcdef|sessionid=very-secret|inheritedsecretvalue|postgres:\/\//i);
  assert.match(redacted.sanitizedText, /\[REDACTED:authorization-header\]/);
  assert.match(redacted.sanitizedText, /\[REDACTED:db-url\]/);
});

test("Apex OS privacy firewall redacts email phone and address for cloud context", () => {
  const raw = "Call Jane at 503-555-0199, email jane@example.com, and visit 123 Main Street.";
  const result = classifyApexOsPrivacy(raw, { targetContext: "cloud-model" });

  assert.equal(result.action, "redact");
  assert.equal(result.allowed, true);
  assert.equal(result.categories.includes("phone"), true);
  assert.equal(result.categories.includes("email"), true);
  assert.equal(result.categories.includes("address"), true);
  assert.doesNotMatch(result.sanitizedText, /503-555-0199|jane@example\.com|123 Main Street/i);
  assert.match(result.sanitizedText, /\[REDACTED:phone\]/);
  assert.match(result.sanitizedText, /\[REDACTED:email\]/);
  assert.match(result.sanitizedText, /\[REDACTED:address\]/);
});

test("Apex OS privacy firewall requires approval for payment and SSN values", () => {
  const raw = "Card number 4242 4242 4242 4242 and SSN 123-45-6789.";
  const result = classifyApexOsPrivacy(raw, { targetContext: "external-connector" });

  assert.equal(result.action, "approval-required");
  assert.equal(result.requiresApproval, true);
  assert.equal(result.allowed, false);
  assert.equal(result.categories.includes("payment"), true);
  assert.equal(result.categories.includes("ssn"), true);
  assert.doesNotMatch(result.sanitizedText, /4242 4242|123-45-6789/);
});

test("Apex OS privacy firewall labels financial legal medical and private personal content as summary-only", () => {
  const raw = "Private personal family issue with legal advice, medical diagnosis, and profit margins.";
  const result = classifyApexOsPrivacy(raw, { targetContext: "cloud-model" });

  assert.equal(result.action, "summarize-only");
  assert.equal(result.allowed, true);
  assert.equal(result.categories.includes("private-personal"), true);
  assert.equal(result.categories.includes("legal"), true);
  assert.equal(result.categories.includes("medical"), true);
  assert.equal(result.categories.includes("financial"), true);
});

test("Apex OS privacy firewall blocks private Apex OS content from field customer and demo contexts", () => {
  for (const targetContext of ["field-user", "customer-user", "demo-user"]) {
    const result = classifyApexOsPrivacy("Apex OS private operator plan", {
      sourceContext: "operator-private",
      targetContext,
    });

    assert.equal(result.action, "block");
    assert.equal(result.blocked, true);
    assert.equal(result.allowed, false);
    assert.match(result.reason, /cannot be sent/i);
  }
});

test("Apex OS privacy firewall catches field-restricted company content", () => {
  const result = classifyApexOsPrivacy("Show leads, estimates, pricing, profit margins, payroll costs, office-only notes, admin settings, company setup, AI office tools, and billing.", {
    sourceContext: "apex-os-internal",
    targetContext: "field-user",
  });

  assert.equal(result.action, "block");
  assert.equal(result.categories.includes("field-restricted"), true);
  assert.equal(result.categories.includes("financial"), true);
  assert.equal(result.blocked, true);
});

test("Apex OS privacy firewall defaults unknown-sensitive content to approval-required", () => {
  const result = classifyApexOsPrivacy("Confidential: do not share the sensitive private data about this.", {
    targetContext: "cloud-model",
  });

  assert.equal(result.action, "approval-required");
  assert.equal(result.requiresApproval, true);
  assert.equal(result.allowed, false);
  assert.equal(result.categories.includes("unknown-sensitive"), true);
  assert.doesNotMatch(result.sanitizedText, /do not share the sensitive private data/i);
});

test("Apex OS cloud-send decision rejects blocked or approval-required content", () => {
  const blocked = shouldSendApexOsContentToCloud("secret: abcdefghijk");
  const approval = shouldSendApexOsContentToCloud("Confidential: private owner data");
  const allowed = shouldSendApexOsContentToCloud("Plan tomorrow's safe internal work.");

  assert.equal(blocked.allowed, false);
  assert.equal(blocked.blocked, true);
  assert.equal(approval.allowed, false);
  assert.equal(approval.requiresApproval, true);
  assert.equal(allowed.allowed, true);
  assert.equal(allowed.action, "allow");
});

test("Apex OS privacy safe metadata and summary never contain original sensitive values", () => {
  const result = classifyApexOsPrivacy("password: hunter2 and jane@example.com", { targetContext: "cloud-model" });
  const metadata = buildApexOsPrivacySafeMetadata(result);
  const summary = buildApexOsPrivacySummary([result]);

  assert.equal(metadata.storesOriginalSensitiveValue, false);
  assert.equal(summary.storesOriginalSensitiveValue, false);
  assert.doesNotMatch(JSON.stringify(metadata), /hunter2|jane@example\.com/);
  assert.doesNotMatch(JSON.stringify(summary), /hunter2|jane@example\.com/);
  assert.equal(summary.categories.includes("credential"), true);
});

test("Apex OS privacy payload sanitizer recursively redacts strings without leaking originals", () => {
  const payload = {
    question: "Use token: abcdefghijklmno for jane@example.com",
    nested: {
      rows: [
        { body: "postgres://user:pass@example/db" },
        { note: "No sensitive content here." },
      ],
    },
  };
  const sanitized = sanitizeApexOsPrivacyPayload(payload, { targetContext: "cloud-model" });

  const serialized = JSON.stringify(sanitized.sanitizedValue);
  assert.doesNotMatch(serialized, /abcdefghijklmno|jane@example\.com|postgres:\/\//);
  assert.match(serialized, /BLOCKED_BY_PRIVACY_FIREWALL/);
  assert.match(serialized, /\[token\]/);
  assert.match(serialized, /\[email\]/);
  assert.match(serialized, /\[db-url\]/);
  assert.match(serialized, /No sensitive content here/);
  assert.equal(sanitized.results.some((result) => result.categories.includes("token")), true);
});
