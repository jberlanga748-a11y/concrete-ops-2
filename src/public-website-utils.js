export const PUBLIC_DEMO_WORKFLOW_OPTIONS = [
  "Lead and estimate follow-up",
  "Estimate to job handoff",
  "Job setup and crew handoff",
  "Field photos and daily reports",
  "Owner review and follow-up",
  "Not sure yet",
];

const FORBIDDEN_PUBLIC_CLAIMS = [
  /guarantee(?:d|s)?\s+(?:leads|jobs|revenue|growth)/i,
  /replaces?\s+(?:quickbooks|payroll|accounting)/i,
  /ai\s+(?:runs|prices|bids|approves|sends)/i,
  /enterprise[-\s]?ready/i,
  /soc\s*2/i,
  /checkout|stripe|invoice|payment collection/i,
  /public self[-\s]?serve saas/i,
];

export function createPublicDemoInterestDraft(overrides = {}) {
  return {
    name: "",
    company: "",
    email: "",
    phone: "",
    trade: "",
    location: "",
    workflow: PUBLIC_DEMO_WORKFLOW_OPTIONS[0],
    message: "",
    consentToManualFollowUp: false,
    honeypot: "",
    ...overrides,
  };
}

export function validatePublicDemoInterestDraft(draft = {}) {
  const errors = [];
  const name = safeText(draft.name);
  const company = safeText(draft.company);
  const email = safeText(draft.email);
  const phone = safeText(draft.phone);
  const consentToManualFollowUp = Boolean(draft.consentToManualFollowUp);

  if (safeText(draft.honeypot)) {
    return { ok: true, ignored: true, errors: [] };
  }
  if (!name) errors.push("Name is required.");
  if (!company) errors.push("Company is required.");
  if (!email && !phone) errors.push("Phone or email is required.");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("Email must look valid.");
  if (!consentToManualFollowUp) errors.push("Confirm manual founder follow-up before preparing the request.");

  return {
    ok: errors.length === 0,
    ignored: false,
    errors,
  };
}

export function buildPublicDemoInterestSummary(draft = {}) {
  const workflow = PUBLIC_DEMO_WORKFLOW_OPTIONS.includes(draft.workflow)
    ? draft.workflow
    : PUBLIC_DEMO_WORKFLOW_OPTIONS[0];
  const lines = [
    "Apex HQ guided walkthrough request",
    "",
    `Name: ${safeText(draft.name) || "[name]"}`,
    `Company: ${safeText(draft.company) || "[company]"}`,
    `Email: ${safeText(draft.email) || "[email]"}`,
    `Phone: ${safeText(draft.phone) || "[phone]"}`,
    `Trade/type of work: ${safeText(draft.trade) || "[trade]"}`,
    `Location/service area: ${safeText(draft.location) || "[location]"}`,
    `Workflow to clean up: ${workflow}`,
    "",
    "Message:",
    safeText(draft.message, 1200) || "[what is scattered today]",
    "",
    "Consent: manual founder follow-up only. No automatic email or SMS requested from Apex HQ.",
  ];

  return lines.join("\n");
}

export function buildPublicDemoInterestPayload(draft = {}) {
  const workflow = PUBLIC_DEMO_WORKFLOW_OPTIONS.includes(draft.workflow)
    ? draft.workflow
    : PUBLIC_DEMO_WORKFLOW_OPTIONS[0];

  return {
    name: safeText(draft.name),
    company: safeText(draft.company),
    email: safeText(draft.email),
    phone: safeText(draft.phone),
    trade: safeText(draft.trade),
    location: safeText(draft.location),
    workflow,
    message: safeText(draft.message, 1200),
    consentToManualFollowUp: Boolean(draft.consentToManualFollowUp),
    honeypot: safeText(draft.honeypot),
  };
}

export function buildPublicDemoMailtoHref(draft = {}) {
  const subject = encodeURIComponent(`Apex HQ walkthrough request - ${safeText(draft.company) || "contractor"}`);
  const body = encodeURIComponent(buildPublicDemoInterestSummary(draft));
  return `mailto:john@apexhq.online?subject=${subject}&body=${body}`;
}

export function assertClaimsSafePublicWebsiteCopy(copy = "") {
  const text = Array.isArray(copy) ? copy.join("\n") : String(copy || "");
  const found = FORBIDDEN_PUBLIC_CLAIMS.find((pattern) => pattern.test(text));
  if (found) {
    throw new Error(`Public website copy includes a forbidden claim: ${found}`);
  }
  return true;
}

function safeText(value = "", limit = 500) {
  if (value === null || value === undefined) return "";
  return String(value).trim().replace(/\s+/g, " ").slice(0, limit);
}
