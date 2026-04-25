export function sortTimeEntries(entries) {
  return [...(entries || [])].sort((left, right) => new Date(right.clockInAt).getTime() - new Date(left.clockInAt).getTime());
}

export function findActiveTimeEntry(entries, userId) {
  if (!userId) return null;
  return sortTimeEntries(entries).find((entry) => entry.userId === userId && entry.status !== "completed") || null;
}

export function deriveTimeWorkspace(entries, jobs, userId) {
  const sortedEntries = sortTimeEntries(entries);
  const activeEntry = findActiveTimeEntry(sortedEntries, userId);
  const availableJobs = (jobs || []).filter((job) => !job.archivedAt);

  return {
    sortedEntries,
    activeEntry,
    availableJobs,
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
