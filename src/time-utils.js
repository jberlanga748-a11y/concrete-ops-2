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
  return String(entry.workCategory || "other")
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

export function deriveTimeWorkspace(entries, jobs, userId, allowedCategories = []) {
  const sortedEntries = sortTimeEntries(entries);
  const ownEntries = sortedEntries.filter((entry) => entry.userId === userId);
  const activeEntry = findActiveTimeEntry(sortedEntries, userId);
  const availableJobs = (jobs || []).filter((job) => !job.archivedAt);
  const allowJobCategory = allowedCategories.includes("job");

  return {
    sortedEntries,
    ownEntries,
    activeEntry,
    availableJobs: allowJobCategory ? availableJobs : [],
    allowedCategories,
    weeklySummary: deriveWeeklySummary(ownEntries, { activeEntry }),
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
