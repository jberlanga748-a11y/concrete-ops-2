function text(value, limit = 500) {
  return String(value ?? "").trim().slice(0, limit);
}

function firstNonEmpty(...values) {
  return values.map((value) => text(value)).find(Boolean) || "";
}

function dateOnly(value) {
  const normalized = text(value, 40);
  if (!normalized) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(normalized)) return normalized.slice(0, 10);
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
}

function addDays(value, days) {
  const base = dateOnly(value) || new Date().toISOString().slice(0, 10);
  const parsed = new Date(`${base}T00:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

function shortName(name) {
  const normalized = text(name, 120);
  if (!normalized) return "";
  return normalized.split(/\s+/)[0] || normalized;
}

function projectLabel(record = {}) {
  return firstNonEmpty(record.project, record.projectTitle, record.title, record.subtitle, record.reason, "your project");
}

function compactSentence(value) {
  return text(value, 220).replace(/\s+/g, " ");
}

export function normalizeManualOutreachChannel(value) {
  const normalized = text(value, 40).toLowerCase().replace(/[\s_-]+/g, "-");
  if (["email", "mail"].includes(normalized)) return "email";
  if (["sms", "text", "text-message"].includes(normalized)) return "text";
  if (["call", "phone"].includes(normalized)) return "call";
  if (["voicemail", "voice-mail"].includes(normalized)) return "voicemail";
  return "other";
}

export function getManualOutreachDisplayName(record = {}) {
  return firstNonEmpty(
    record.contactName,
    record.customer,
    record.customerName,
    record.name,
    record.title,
    "there",
  );
}

export function buildManualOutreachDrafts(record = {}, options = {}) {
  const displayName = getManualOutreachDisplayName(record);
  const greetingName = shortName(displayName);
  const greeting = greetingName && greetingName.toLowerCase() !== "there" ? `Hi ${greetingName},` : "Hi,";
  const project = projectLabel(record);
  const companyName = firstNonEmpty(options.companyName, record.companyName, "our office");
  const senderName = firstNonEmpty(options.senderName, options.userName, companyName);
  const nextDate = dateOnly(record.nextFollowUpDate || record.followUpDueAt);
  const lastContact = record.lastContactedAt
    ? `Last contact: ${dateOnly(record.lastContactedAt) || record.lastContactedAt}${record.lastContactMethod ? ` by ${record.lastContactMethod}` : ""}${record.outcome ? ` (${record.outcome})` : ""}.`
    : "No prior contact is logged in Apex HQ.";
  const nextStep = compactSentence(firstNonEmpty(record.nextStep, record.missingInfoNextStep, record.reason, "confirm the next step"));
  const riskOrInfo = compactSentence(firstNonEmpty(record.fitReason, record.missingInfoStatus, record.notesPreview));
  const followUpLine = nextDate ? `I had this marked for follow-up on ${nextDate}.` : "I wanted to check in and keep the next step moving.";

  const emailSubject = `Following up on ${project}`;
  const emailBody = [
    greeting,
    "",
    `I’m following up on ${project}. ${followUpLine}`,
    "I wanted to check whether you had any questions or if there is anything else you need from us.",
    "",
    "Thanks,",
    senderName,
  ].join("\n");

  const smsBody = `${greetingName && greetingName.toLowerCase() !== "there" ? `Hi ${greetingName}, ` : ""}this is ${senderName}. I’m following up on ${project}. Let me know if you have any questions or want us to take the next step.`;

  const callScript = [
    `Ask for: ${displayName}.`,
    `Reason for call: follow up on ${project}.`,
    `Quick context: ${lastContact}`,
    `Talking points: ask whether they have questions, confirm what they need next, and avoid promising pricing, scope, schedule, or approval without office review.`,
    `Next-step reminder: ${nextStep}.`,
    "After the call: log the outcome in Apex HQ contact history.",
    riskOrInfo ? `Office context: ${riskOrInfo}.` : "",
  ].filter(Boolean).join("\n");

  const voicemailScript = [
    greetingName && greetingName.toLowerCase() !== "there" ? `Hi ${greetingName},` : "Hi,",
    `this is ${senderName} calling about ${project}.`,
    "I’m checking in to see if you have any questions or want us to take the next step.",
    "Please call us back when you have a chance. Thank you.",
  ].join(" ");

  return {
    emailSubject,
    emailBody,
    smsBody: smsBody.slice(0, 320),
    callScript,
    voicemailScript,
    manualOnlyNotice: "Manual copy only — Apex HQ does not send this message.",
  };
}

export function buildManualOutreachContactPayload(queueItem = {}, action = "log-call", options = {}) {
  if (!["lead", "customer", "estimate", "job"].includes(queueItem.type) || !queueItem.recordId) return null;
  const now = text(options.now) || new Date().toISOString();
  const today = dateOnly(options.today || now);
  const drafts = options.drafts || buildManualOutreachDrafts(queueItem, options);
  const contactedAt = now.slice(0, 16);
  const base = {
    entityType: queueItem.type,
    entityId: queueItem.recordId,
    contactName: firstNonEmpty(queueItem.contactName, queueItem.title),
    contactEmail: text(queueItem.contactEmail, 160).toLowerCase(),
    contactPhone: text(queueItem.contactPhone, 80),
    direction: "outbound",
    contactedAt,
  };

  const payloads = {
    "mark-email-sent": {
      method: "Email",
      outcome: "Sent",
      subject: drafts.emailSubject || "Manual email follow-up",
      messageDraft: drafts.emailBody || "",
      notes: "Manual email draft copied/sent outside Apex HQ. Apex HQ did not send this email.",
    },
    "mark-text-sent": {
      method: "Text",
      outcome: "Sent",
      subject: "Manual text follow-up",
      messageDraft: drafts.smsBody || "",
      notes: "Manual text draft copied/sent outside Apex HQ. Apex HQ did not send this text.",
    },
    "log-call": {
      method: "Call",
      outcome: "Follow-Up Needed",
      subject: "Manual call attempt logged from Follow-Up Queue",
      messageDraft: drafts.callScript || "",
      notes: "Manual call attempt logged from Follow-Up Queue. Apex HQ did not place this call.",
    },
    "mark-waiting": {
      method: "Other",
      outcome: "Waiting on Response",
      subject: "Waiting on customer response",
      notes: "Marked waiting on response from the manual draft/copy workflow. No message was sent from Apex HQ.",
    },
    "follow-up-tomorrow": {
      method: "Other",
      outcome: "Follow-Up Needed",
      subject: "Manual follow-up scheduled",
      notes: "Follow-up moved to tomorrow from the manual draft/copy workflow. No message was sent from Apex HQ.",
      nextFollowUpDate: addDays(today, 1),
    },
    "follow-up-two-days": {
      method: "Other",
      outcome: "Follow-Up Needed",
      subject: "Manual follow-up scheduled",
      notes: "Follow-up moved out two days from the manual draft/copy workflow. No message was sent from Apex HQ.",
      nextFollowUpDate: addDays(today, 2),
    },
    "mark-won": {
      method: "Other",
      outcome: "Won",
      subject: "Won reason logged",
      notes: "Marked won from the manual follow-up workflow. Add the real reason in contact history notes before changing source or ad spend.",
    },
    "mark-lost": {
      method: "Other",
      outcome: "Lost",
      subject: "Lost reason logged",
      notes: "Marked lost from the manual follow-up workflow. Add the real objection or reason in contact history notes before changing source or ad spend.",
    },
  };

  const patch = payloads[action];
  return patch ? { ...base, ...patch } : null;
}
