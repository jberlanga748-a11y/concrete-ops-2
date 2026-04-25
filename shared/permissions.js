export const DEFAULT_COMPANY_SETTINGS = {
  toolChecklistEnabled: true,
};

export function normalizeRole(role) {
  return String(role || "").trim().toLowerCase();
}

export function isOwner(user) {
  return normalizeRole(user?.role) === "owner";
}

export function isAdministrator(user) {
  return normalizeRole(user?.role) === "administrator";
}

export function isOperationsManager(user) {
  return normalizeRole(user?.role) === "operations manager";
}

export function isEstimator(user) {
  return normalizeRole(user?.role) === "estimator";
}

export function isForeman(user) {
  return normalizeRole(user?.role) === "foreman";
}

export function isEmployee(user) {
  return normalizeRole(user?.role) === "employee";
}

export function isOfficeManager(user) {
  return isOwner(user) || isAdministrator(user) || isOperationsManager(user);
}

export function canViewUsers(user) {
  return isOfficeManager(user);
}

export function canManageUsers(user) {
  return isOfficeManager(user);
}

export function canViewLeads(user) {
  return isOfficeManager(user) || isEstimator(user);
}

export function canManageLeads(user) {
  return isOfficeManager(user) || isEstimator(user);
}

export function canViewCustomers(user) {
  return isOfficeManager(user) || isEstimator(user);
}

export function canManageCustomers(user) {
  return isOfficeManager(user) || isEstimator(user);
}

export function canViewEstimates(user) {
  return isOfficeManager(user) || isEstimator(user);
}

export function canManageEstimates(user) {
  return isOwner(user) || isAdministrator(user) || isEstimator(user);
}

export function canViewChangeOrders(user) {
  return isOfficeManager(user) || isEstimator(user) || isForeman(user);
}

export function canManageChangeOrders(user) {
  return isOfficeManager(user) || isEstimator(user);
}

export function canRequestChangeOrders(user) {
  return isForeman(user);
}

export function canViewAllJobs(user) {
  return isOfficeManager(user);
}

export function canCreateJobs(user) {
  return isOfficeManager(user);
}

export function canArchiveJobs(user) {
  return isOfficeManager(user);
}

export function canDeleteJobs(user) {
  return isOfficeManager(user);
}

export function canViewJobMoney(user) {
  return isOfficeManager(user) || isEstimator(user);
}

function hasJobAssignment(job, userId, roleOnJob = null) {
  if (!job || !userId) return false;
  const assignments = Array.isArray(job.assignments) ? job.assignments.filter((assignment) => !assignment.removedAt) : [];
  if (roleOnJob) {
    return assignments.some((assignment) => assignment.userId === userId && assignment.roleOnJob === roleOnJob);
  }
  if (assignments.length > 0) {
    return assignments.some((assignment) => assignment.userId === userId);
  }

  if (roleOnJob === "foreman") {
    return job.assignedForemanId === userId;
  }

  return job.assignedUserId === userId || job.assignedForemanId === userId;
}

function isFutureScheduledJob(job) {
  if (!job?.scheduledStart) return false;
  const parsed = new Date(job.scheduledStart);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.getTime() > Date.now();
}

export function canViewJob(job, user) {
  if (!user || !job) return false;
  if (canViewAllJobs(user) || isEstimator(user)) return true;
  if (isForeman(user)) {
    return hasJobAssignment(job, user.id)
      || ((Boolean(job.fieldPlanningVisible) || Boolean(job.visibleToForeman)) && isFutureScheduledJob(job));
  }
  if (isEmployee(user)) {
    return hasJobAssignment(job, user.id);
  }
  return false;
}

export function canManageJob(user, job) {
  if (!user || !job) return false;
  if (canViewAllJobs(user)) return true;
  if (isForeman(user)) {
    return hasJobAssignment(job, user.id, "foreman");
  }
  return false;
}

export function canManageJobFieldUpdates(user, job) {
  return isForeman(user) && canManageJob(user, job);
}

export function canUseCalculator(user) {
  return Boolean(user);
}

export function canViewSafety(user) {
  return Boolean(user);
}

export function canManageSafety(user) {
  return isOfficeManager(user);
}

export function canUseToolChecklist(user, companySettings = DEFAULT_COMPANY_SETTINGS) {
  if (!companySettings.toolChecklistEnabled) return false;
  return isOfficeManager(user) || isForeman(user) || isEmployee(user);
}

export function canManageToolChecklist(user, companySettings = DEFAULT_COMPANY_SETTINGS) {
  if (!companySettings.toolChecklistEnabled) return false;
  return isOfficeManager(user) || isForeman(user);
}

export function canViewSettings(user) {
  return isOfficeManager(user);
}

export function canExportData(user) {
  return isOwner(user);
}

export function canViewAudit(user) {
  return isOfficeManager(user);
}

export function getAllowedModuleIds(user, companySettings = DEFAULT_COMPANY_SETTINGS) {
  const modules = new Set();

  if (isOwner(user) || isAdministrator(user) || isOperationsManager(user)) {
    ["dashboard", "leads", "customers", "estimates", "jobs", "time", "reports", "uploads", "changeOrders", "employees", "incidents", "toolbox", "ppe", "calculator", "settings", "copilot"].forEach((moduleId) => modules.add(moduleId));
  } else if (isEstimator(user)) {
    ["dashboard", "leads", "customers", "estimates", "jobs", "calculator"].forEach((moduleId) => modules.add(moduleId));
  } else if (isForeman(user)) {
    ["jobs", "reports", "uploads", "changeOrders", "incidents", "toolbox", "ppe", "calculator"].forEach((moduleId) => modules.add(moduleId));
  } else if (isEmployee(user)) {
    ["jobs", "time", "reports", "uploads", "incidents", "toolbox", "ppe", "calculator"].forEach((moduleId) => modules.add(moduleId));
  }

  if (canUseToolChecklist(user, companySettings)) {
    modules.add("toolChecklist");
  }

  return modules;
}

export function canAccessModule(moduleId, user, companySettings = DEFAULT_COMPANY_SETTINGS) {
  return getAllowedModuleIds(user, companySettings).has(moduleId);
}

export function getDefaultModuleId(user) {
  if (isOwner(user) || isAdministrator(user) || isOperationsManager(user) || isEstimator(user)) {
    return "dashboard";
  }

  return "jobs";
}
