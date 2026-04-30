function cleanNoticePart(value) {
  return String(value ?? "").trim();
}

function activeAssignments(job = {}) {
  if (Array.isArray(job.assignments) && job.assignments.length > 0) {
    return job.assignments.filter((assignment) => !assignment?.removedAt);
  }

  const synthesized = [];
  if (job.assignedForemanId) {
    synthesized.push({
      id: `JA-LEGACY-${job.id || "job"}-foreman`,
      jobId: job.id || "",
      userId: job.assignedForemanId,
      roleOnJob: "foreman",
      assignedAt: job.updatedAt || job.createdAt || "",
    });
  }
  if (job.assignedUserId) {
    synthesized.push({
      id: `JA-LEGACY-${job.id || "job"}-crew`,
      jobId: job.id || "",
      userId: job.assignedUserId,
      roleOnJob: "crew",
      assignedAt: job.updatedAt || job.createdAt || "",
    });
  }
  return synthesized;
}

export function buildJobAssignmentNoticeKey(job = {}, assignment = {}) {
  return [
    assignment.id,
    assignment.userId,
    assignment.roleOnJob,
    assignment.assignedAt,
    job.id,
    job.scheduledStart,
    job.scheduledEnd,
    job.address,
  ].map(cleanNoticePart).join("|");
}

export function isJobAssignmentNoticeAcknowledged(job = {}, assignment = {}) {
  const noticeKey = buildJobAssignmentNoticeKey(job, assignment);
  return Boolean(noticeKey && assignment.noticeAcknowledgedAt && assignment.noticeAcknowledgedKey === noticeKey);
}

export function assignmentForUser(job = {}, userId = "") {
  const normalizedUserId = cleanNoticePart(userId);
  if (!normalizedUserId) return null;
  return activeAssignments(job).find((assignment) => assignment?.userId === normalizedUserId) || null;
}

export function buildJobAssignmentNotice(job = {}, userId = "") {
  const assignment = assignmentForUser(job, userId);
  if (!assignment) return null;
  const noticeKey = buildJobAssignmentNoticeKey(job, assignment);
  const acknowledged = isJobAssignmentNoticeAcknowledged(job, assignment);
  return {
    id: `${job.id || "job"}:${assignment.id || assignment.userId}:${noticeKey}`,
    noticeKey,
    acknowledged,
    assignment,
    job,
  };
}

export function deriveJobAssignmentNotices(jobs = [], userId = "") {
  const safeJobs = Array.isArray(jobs) ? jobs : [];
  return safeJobs
    .map((job) => buildJobAssignmentNotice(job, userId))
    .filter((notice) => notice && !notice.acknowledged);
}
