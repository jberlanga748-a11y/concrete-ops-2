import { deriveContactHistorySummary } from "../shared/contactHistory.js";
import { deriveFollowUpQueueState } from "./follow-up-queue-utils.js";
import { buildManualOutreachDrafts } from "./manual-outreach-drafts.js";

const CLOSED_STATUSES = new Set(["approved", "converted", "won", "lost", "no thanks", "not interested", "closed", "archived"]);
const SENT_ESTIMATE_STATUSES = new Set(["sent", "estimate sent", "proposal sent", "pending", "waiting", "waiting on customer", "review"]);
const WON_OUTCOMES = new Set(["Won", "Interested"]);
const LOST_OUTCOMES = new Set(["Lost", "Not Interested"]);

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function text(value) {
  return String(value ?? "").trim();
}

function normalizeStatus(value) {
  return text(value).toLowerCase().replace(/[_-]/g, " ");
}

function dateKey(value) {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function daysBetween(left, right) {
  const leftKey = dateKey(left);
  const rightKey = dateKey(right);
  if (!leftKey || !rightKey) return null;
  return Math.round((new Date(`${rightKey}T00:00:00Z`).getTime() - new Date(`${leftKey}T00:00:00Z`).getTime()) / 86400000);
}

function sameCompany(record = {}, companyId = "") {
  if (!companyId) return true;
  const recordCompanyId = text(record.companyId);
  return !recordCompanyId || recordCompanyId === companyId;
}

function activeRecords(records = [], companyId = "") {
  return asArray(records).filter((record) => sameCompany(record, companyId) && !record.archivedAt && !record.deletedAt);
}

function latestContact(records = [], entityType, entityId, todayKey) {
  return deriveContactHistorySummary(records, entityType, entityId, {
    today: new Date(`${todayKey}T00:00:00Z`),
  }).latestContact;
}

function leadWon(lead = {}, latest = null) {
  const status = normalizeStatus(lead.status);
  return ["approved", "converted", "won"].includes(status) || WON_OUTCOMES.has(latest?.outcome);
}

function leadLost(lead = {}, latest = null) {
  const status = normalizeStatus(lead.status);
  return ["lost", "no thanks", "not interested"].includes(status) || LOST_OUTCOMES.has(latest?.outcome);
}

function leadOpen(lead = {}, latest = null) {
  return !CLOSED_STATUSES.has(normalizeStatus(lead.status)) && !leadWon(lead, latest) && !leadLost(lead, latest);
}

function sourceLabel(value) {
  return text(value) || "Untracked Source";
}

function estimateTitle(estimate = {}) {
  return text(estimate.title || estimate.project || estimate.customerName || estimate.customer || "Estimate");
}

export function deriveStaleEstimateReminders(estimates = [], contactHistory = [], {
  today = new Date(),
  companyId = "",
  staleAfterDays = 7,
} = {}) {
  const todayKey = dateKey(today);
  const contacts = activeRecords(contactHistory, companyId);

  return activeRecords(estimates, companyId)
    .map((estimate) => {
      const latest = latestContact(contacts, "estimate", estimate.id, todayKey);
      const status = normalizeStatus(estimate.status);
      const followUpDate = dateKey(estimate.followUpDueAt || estimate.nextFollowUpDate || latest?.nextFollowUpDate);
      const sentDate = dateKey(estimate.sentAt || estimate.updatedAt || estimate.createdAt);
      const lastContactDate = dateKey(latest?.contactedAt || latest?.createdAt || sentDate);
      const daysSinceLastTouch = daysBetween(lastContactDate || sentDate, todayKey);
      const overdue = Boolean(followUpDate && followUpDate < todayKey);
      const dueToday = followUpDate === todayKey;
      const noFollowUp = !followUpDate;
      const stale = daysSinceLastTouch != null && daysSinceLastTouch >= staleAfterDays;

      return {
        id: estimate.id,
        estimate,
        title: estimateTitle(estimate),
        customer: text(estimate.customerName || estimate.customer || estimate.customer?.name),
        status: text(estimate.status || "Estimate"),
        followUpDate,
        lastContactDate,
        daysSinceLastTouch,
        reason: overdue
          ? `Estimate follow-up was due ${followUpDate}.`
          : dueToday
            ? "Estimate follow-up is due today."
            : noFollowUp
              ? "Estimate has no next follow-up date."
              : stale
                ? `No logged estimate touch in ${daysSinceLastTouch} days.`
                : "Estimate follow-up is current.",
        tone: overdue ? "red" : dueToday || noFollowUp || stale ? "amber" : "green",
        needsReminder: SENT_ESTIMATE_STATUSES.has(status) && (overdue || dueToday || noFollowUp || stale),
      };
    })
    .filter((row) => row.needsReminder)
    .sort((left, right) => (
      (left.followUpDate || "9999-99-99").localeCompare(right.followUpDate || "9999-99-99")
      || Number(right.daysSinceLastTouch || 0) - Number(left.daysSinceLastTouch || 0)
      || left.title.localeCompare(right.title)
    ));
}

export function deriveLeadSourcePerformance(leads = [], contactHistory = [], { companyId = "", today = new Date() } = {}) {
  const todayKey = dateKey(today);
  const contacts = activeRecords(contactHistory, companyId);
  const rows = new Map();

  activeRecords(leads, companyId).forEach((lead) => {
    const source = sourceLabel(lead.source);
    if (!rows.has(source)) {
      rows.set(source, {
        source,
        total: 0,
        open: 0,
        won: 0,
        lost: 0,
        due: 0,
        waiting: 0,
        estimateReady: 0,
        latestReason: "",
      });
    }

    const row = rows.get(source);
    const latest = latestContact(contacts, "lead", lead.id, todayKey);
    const status = normalizeStatus(lead.status);
    const dueDate = dateKey(lead.followUpDueAt || latest?.nextFollowUpDate);
    const haystack = [lead.status, lead.nextStep, lead.notes, lead.project].map(text).join(" ").toLowerCase();

    row.total += 1;
    if (leadWon(lead, latest)) row.won += 1;
    else if (leadLost(lead, latest)) row.lost += 1;
    else if (leadOpen(lead, latest)) row.open += 1;
    if (dueDate && dueDate <= todayKey) row.due += 1;
    if (latest?.outcome === "Waiting on Response" || /\b(waiting|reply|response)\b/.test(haystack)) row.waiting += 1;
    if (["site visit", "contacted"].includes(status) || /\b(estimate|proposal|quote|bid)\b/.test(haystack)) row.estimateReady += 1;
    row.latestReason = latest?.notes || latest?.subject || lead.nextStep || row.latestReason;
  });

  return Array.from(rows.values())
    .map((row) => {
      const winRate = row.total ? Math.round((row.won / row.total) * 100) : 0;
      const quality = row.total >= 3 && winRate >= 35
        ? "Strong"
        : row.due || row.waiting
          ? "Needs follow-up"
          : row.total >= 2 && row.won === 0
            ? "Watch"
            : "Learning";
      return {
        ...row,
        winRate,
        quality,
        tone: quality === "Strong" ? "green" : quality === "Needs follow-up" ? "amber" : quality === "Watch" ? "orange" : "slate",
      };
    })
    .sort((left, right) => (
      right.due - left.due
      || right.open - left.open
      || right.won - left.won
      || right.total - left.total
      || left.source.localeCompare(right.source)
    ));
}

export function deriveWonLostLearning(leads = [], contactHistory = [], { companyId = "", today = new Date() } = {}) {
  const todayKey = dateKey(today);
  const contacts = activeRecords(contactHistory, companyId);
  const rows = activeRecords(leads, companyId)
    .map((lead) => {
      const latest = latestContact(contacts, "lead", lead.id, todayKey);
      const outcome = leadWon(lead, latest) ? "Won" : leadLost(lead, latest) ? "Lost" : "";
      if (!outcome) return null;
      return {
        id: lead.id,
        customer: text(lead.customer || "Unnamed lead"),
        project: text(lead.project || "Project"),
        source: sourceLabel(lead.source),
        outcome,
        reason: text(latest?.notes || latest?.subject || lead.fitReason || lead.notes || "No reason logged yet."),
        tone: outcome === "Won" ? "green" : "red",
      };
    })
    .filter(Boolean);

  return {
    rows: rows.slice(0, 8),
    stats: {
      won: rows.filter((row) => row.outcome === "Won").length,
      lost: rows.filter((row) => row.outcome === "Lost").length,
      withReason: rows.filter((row) => row.reason && row.reason !== "No reason logged yet.").length,
    },
  };
}

export function buildSalesFollowUpScriptLibrary(sampleItem = {}, options = {}) {
  const drafts = buildManualOutreachDrafts(sampleItem, options);
  return [
    {
      id: "call",
      label: "Call",
      helper: "Use for due, overdue, or high-value leads.",
      body: drafts.callScript,
    },
    {
      id: "voicemail",
      label: "Voicemail",
      helper: "Leave a short manual voicemail after a no-answer call.",
      body: drafts.voicemailScript,
    },
    {
      id: "email",
      label: "Email",
      helper: "Manual copy for estimate questions, photos, or next-step confirmation.",
      body: drafts.emailBody,
    },
    {
      id: "text",
      label: "Text",
      helper: "Short manual SMS copy. Apex HQ does not send it.",
      body: drafts.smsBody,
    },
    {
      id: "referral",
      label: "Referral Ask",
      helper: "Use after a positive closeout or happy customer conversation.",
      body: "Thanks again for trusting us with the work. If you know anyone who needs similar help, we would appreciate the referral. We will take good care of them.",
    },
    {
      id: "review",
      label: "Review Ask",
      helper: "Use after job closeout when the owner approves the customer ask.",
      body: "Thanks again for working with us. If you are happy with the result, a short review would help other local customers know what to expect.",
    },
  ];
}

export function deriveSalesFollowUpSystemState(source = {}, options = {}) {
  const todayKey = dateKey(options.today || new Date());
  const companyId = text(options.companyId);
  const followUpQueue = deriveFollowUpQueueState(source, { today: todayKey, companyId });
  const dailyQueue = followUpQueue.items
    .filter((item) => ["overdue", "dueToday", "notContacted", "waiting", "followUpNeeded", "noFollowUpScheduled"].some((group) => item.groups?.includes(group)))
    .slice(0, 12);
  const staleEstimates = deriveStaleEstimateReminders(source.estimates, source.contactHistory, { today: todayKey, companyId });
  const sourcePerformance = deriveLeadSourcePerformance(source.leads, source.contactHistory, { today: todayKey, companyId });
  const wonLostLearning = deriveWonLostLearning(source.leads, source.contactHistory, { today: todayKey, companyId });
  const sampleItem = dailyQueue.find((item) => item.type !== "leadSource") || sourcePerformance[0] || {};
  const scripts = buildSalesFollowUpScriptLibrary(sampleItem, options);
  const nextActions = [
    followUpQueue.stats.overdue ? `${followUpQueue.stats.overdue} overdue follow-up${followUpQueue.stats.overdue === 1 ? "" : "s"} need a manual touch.` : "",
    followUpQueue.stats.notContacted ? `${followUpQueue.stats.notContacted} new lead${followUpQueue.stats.notContacted === 1 ? "" : "s"} have not been contacted.` : "",
    staleEstimates.length ? `${staleEstimates.length} sent estimate${staleEstimates.length === 1 ? "" : "s"} need follow-up review.` : "",
    sourcePerformance.some((row) => row.due) ? "Lead sources with due work should be worked before buying more leads." : "",
    wonLostLearning.stats.won || wonLostLearning.stats.lost ? "Review won/lost reasons before changing ad or source spend." : "",
  ].filter(Boolean);

  return {
    generatedForDate: todayKey,
    followUpQueue,
    dailyQueue,
    staleEstimates,
    sourcePerformance,
    wonLostLearning,
    scripts,
    nextActions,
    stats: {
      dueToday: followUpQueue.stats.dueToday,
      overdue: followUpQueue.stats.overdue,
      notContacted: followUpQueue.stats.notContacted,
      waiting: followUpQueue.stats.waiting,
      staleEstimates: staleEstimates.length,
      sourcesTracked: sourcePerformance.length,
      won: wonLostLearning.stats.won,
      lost: wonLostLearning.stats.lost,
    },
  };
}
