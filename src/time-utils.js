function startOfWeek(date) {
  const local = new Date(date);
  const day = local.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  local.setHours(0, 0, 0, 0);
  local.setDate(local.getDate() + offset);
  return local;
}

function endOfWeek(date) {
  const start = startOfWeek(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

function isWithinRange(value, start, end) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.getTime() >= start.getTime() && parsed.getTime() <= end.getTime();
}

function labelForEntry(entry) {
  if (entry.jobTitle) return entry.jobTitle;
  return timeWorkCategoryLabel(entry.workCategory);
}

function timeWorkCategoryLabel(category) {
  return String(category || "other")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function sortTimeEntries(entries) {
  return [...(entries || [])].sort((left, right) => new Date(right.clockInAt).getTime() - new Date(left.clockInAt).getTime());
}

export function findActiveTimeEntry(entries, userId) {
  if (!userId) return null;
  return sortTimeEntries(entries).find((entry) => entry.userId === userId && entry.status !== "completed") || null;
}

export function deriveWeeklySummary(entries, {
  now = new Date(),
  activeEntry = null,
} = {}) {
  const weekStart = startOfWeek(now);
  const weekEnd = endOfWeek(now);
  const weekEntries = sortTimeEntries(entries).filter((entry) => isWithinRange(entry.clockInAt, weekStart, weekEnd));
  const totalMinutes = weekEntries.reduce((sum, entry) => sum + Number(entry.totalMinutes || 0), 0);
  const breakMinutes = weekEntries.reduce((sum, entry) => sum + Number(entry.breakMinutes || 0), 0);

  const dailyMap = new Map();
  const groupMap = new Map();

  weekEntries.forEach((entry) => {
    const date = new Date(entry.clockInAt);
    const dayKey = date.toLocaleDateString("en-US", { weekday: "short" });
    dailyMap.set(dayKey, (dailyMap.get(dayKey) || 0) + Number(entry.totalMinutes || 0));

    const key = labelForEntry(entry);
    groupMap.set(key, (groupMap.get(key) || 0) + Number(entry.totalMinutes || 0));
  });

  const orderedDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label) => ({
    label,
    minutes: dailyMap.get(label) || 0,
  }));

  const grouped = [...groupMap.entries()]
    .map(([label, minutes]) => ({ label, minutes }))
    .sort((left, right) => right.minutes - left.minutes);

  return {
    weekStart,
    weekEnd,
    entries: weekEntries,
    totalMinutes,
    breakMinutes,
    activeEntry,
    dayBreakdown: orderedDays,
    groupedBreakdown: grouped,
  };
}

export function deriveTimeWorkspace(entries, jobs, userId, allowedCategories = [], { now = new Date() } = {}) {
  const safeAllowedCategories = Array.isArray(allowedCategories) ? allowedCategories : [];
  const sortedEntries = sortTimeEntries(entries);
  const ownEntries = sortedEntries.filter((entry) => entry.userId === userId);
  const activeEntry = findActiveTimeEntry(sortedEntries, userId);
  const availableJobs = (jobs || []).filter((job) => !job.archivedAt);
  const allowJobCategory = safeAllowedCategories.includes("job");

  return {
    sortedEntries,
    ownEntries,
    activeEntry,
    availableJobs: allowJobCategory ? availableJobs : [],
    allowedCategories: safeAllowedCategories,
    weeklySummary: deriveWeeklySummary(ownEntries, { activeEntry, now }),
  };
}

export function deriveCrewWeeklySummary(entries, {
  excludeUserId = "",
  now = new Date(),
} = {}) {
  const relevantEntries = (entries || []).filter((entry) => entry.userId !== excludeUserId);
  const weekly = deriveWeeklySummary(relevantEntries, { now });
  const activeUsers = new Set(relevantEntries.filter((entry) => entry.status !== "completed").map((entry) => entry.userId));

  return {
    ...weekly,
    activeUserCount: activeUsers.size,
  };
}

export function buildTimeTrackingSupportContext({
  user = {},
  permissions = {},
  workspace = {},
  boardRows = [],
  boardSummary = {},
} = {}) {
  const safeRows = Array.isArray(boardRows) ? boardRows : [];
  const safeWorkspace = workspace || {};
  const activeRows = safeRows.filter((entry) => entry.status !== "completed");
  const onBreakRows = safeRows.filter((entry) => entry.status === "on_break");
  const ownActiveEntry = safeWorkspace.activeEntry || null;
  const allowedCategories = Array.isArray(safeWorkspace.allowedCategories) ? safeWorkspace.allowedCategories : [];
  const availableJobs = Array.isArray(safeWorkspace.availableJobs) ? safeWorkspace.availableJobs : [];
  const canViewAll = Boolean(permissions?.time?.canViewAll);
  const canViewCrew = Boolean(permissions?.time?.canViewCrew && !canViewAll);
  const scopeLabel = canViewAll ? "all visible company time" : canViewCrew ? "assigned crew time" : "my own time";
  const totalMinutes = Number(boardSummary?.totalMinutes || 0);
  const breakMinutes = Number(boardSummary?.breakMinutes || 0);
  const allowedCategoryLabel = allowedCategories.length ? allowedCategories.map(timeWorkCategoryLabel).join(", ") : "No self clock categories";
  const activeLabel = ownActiveEntry
    ? `${ownActiveEntry.jobTitle || timeWorkCategoryLabel(ownActiveEntry.workCategory)} (${ownActiveEntry.status || "active"})`
    : "No active personal clock";

  return {
    workflow: "Time tracking",
    blockerLevel: ownActiveEntry ? "Slowing work down" : "Not a blocker",
    followUpNeeded: ownActiveEntry ? "Review active clock if help is needed" : "Manual time tracking review",
    summary: [
      `Time tracking support request for ${String(user?.name || user?.email || "workspace user").trim() || "workspace user"}.`,
      `Scope: ${scopeLabel}.`,
      `Visible entries: ${safeRows.length}. Active visible clocks: ${activeRows.length}. On break: ${onBreakRows.length}.`,
      `Week total: ${formatMinutes(totalMinutes)} worked with ${formatMinutes(breakMinutes)} breaks.`,
      `My active clock: ${activeLabel}.`,
    ].join(" "),
    expected: "Keep the time entry accurate without exposing payroll rates, pricing, margin, or other users outside this role scope.",
    workaround: `Allowed self clock categories: ${allowedCategoryLabel}. Available job options: ${availableJobs.length}. If the right job is missing, contact the office instead of clocking into unrelated work.`,
  };
}

export function formatMinutes(totalMinutes) {
  const normalized = Math.max(0, Number(totalMinutes || 0));
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

export function timeStatusTone(status) {
  if (status === "completed") return "green";
  if (status === "on_break") return "amber";
  return "blue";
}
