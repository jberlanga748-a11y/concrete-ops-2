function activeAssignments(job) {
  if (Array.isArray(job?.assignments) && job.assignments.length > 0) {
    return job.assignments.filter((assignment) => !assignment.removedAt);
  }

  const synthesized = [];
  if (job?.assignedForemanId) {
    synthesized.push({ userId: job.assignedForemanId, roleOnJob: "foreman" });
  }
  if (job?.assignedUserId) {
    synthesized.push({ userId: job.assignedUserId, roleOnJob: "crew" });
  }
  return synthesized;
}

function isFutureScheduled(job, now = new Date()) {
  if (!job?.scheduledStart) return false;
  const scheduled = new Date(job.scheduledStart);
  if (Number.isNaN(scheduled.getTime())) return false;
  return scheduled.getTime() > now.getTime();
}

function isAssignedForeman(job, userId) {
  if (!job || !userId) return false;
  if (job.foremanAssignment?.userId === userId) return true;
  if (job.assignedForemanId === userId) return true;
  return activeAssignments(job).some((assignment) => assignment.userId === userId && assignment.roleOnJob === "foreman");
}

function isAssignedCrew(job, userId) {
  if (!job || !userId) return false;
  if (job.assignedUserId === userId) return true;
  if (Array.isArray(job.crewAssignments) && job.crewAssignments.some((assignment) => assignment.userId === userId && !assignment.removedAt)) {
    return true;
  }
  return activeAssignments(job).some((assignment) => assignment.userId === userId);
}

export function deriveForemanWorkspace(jobs, userId, now = new Date()) {
  const safeJobs = Array.isArray(jobs) ? jobs : [];
  const assignedJobs = safeJobs.filter((job) => !job.archivedAt && isAssignedForeman(job, userId));
  const upcomingJobs = safeJobs.filter((job) => (
    !job.archivedAt
    && !isAssignedForeman(job, userId)
    && (Boolean(job.fieldPlanningVisible) || Boolean(job.visibleToForeman))
    && isFutureScheduled(job, now)
  ));

  return {
    assignedJobs,
    upcomingJobs,
    primaryJob: assignedJobs[0] || upcomingJobs[0] || null,
  };
}

export function deriveEmployeeWorkspace(jobs, userId) {
  const safeJobs = Array.isArray(jobs) ? jobs : [];
  const assignedJobs = safeJobs.filter((job) => !job.archivedAt && isAssignedCrew(job, userId));

  return {
    assignedJobs,
    primaryJob: assignedJobs[0] || null,
  };
}
