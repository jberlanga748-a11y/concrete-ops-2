function formatFieldDateTime(value) {
  if (!value) return "Not recorded";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Not recorded";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}

export function formatJobScheduleDetail(job) {
  if (!job?.scheduledStart) return "Schedule pending";
  const startLabel = formatFieldDateTime(job.scheduledStart);
  if (!job?.scheduledEnd) {
    return job?.estimatedDuration ? `${startLabel} - ${job.estimatedDuration}` : startLabel;
  }
  return `${startLabel} to ${formatFieldDateTime(job.scheduledEnd)}`;
}

export function directionsUrl(address = "") {
  const trimmed = String(address || "").trim();
  return trimmed ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trimmed)}` : "";
}

export function humanizeAssignmentRole(roleOnJob = "") {
  const normalized = String(roleOnJob || "").replaceAll("_", " ").trim().toLowerCase();
  if (!normalized) return "Crew";
  return normalized.replace(/\b\w/g, (character) => character.toUpperCase());
}

export function fieldChecklistNeedsAction(checklist) {
  if (!checklist) return true;
  const label = String(checklist.statusLabel || checklist.status || "").toLowerCase();
  if (!label) return true;
  return !/(complete|completed|reviewed|approved)/i.test(label);
}

export function fieldChecklistSummary(checklist, fallback = "Not started") {
  return checklist?.statusLabel || checklist?.status || fallback;
}
