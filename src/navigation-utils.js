import { DEFAULT_COMPANY_SETTINGS, canAccessModule, getAllowedModuleIds, getDefaultModuleId } from "../shared/permissions.js";

export { canAccessModule, getDefaultModuleId };

function permissionFlag(permissions, path) {
  if (!permissions || !path) return null;
  return path.split(".").reduce((value, key) => value?.[key], permissions);
}

function packageAllowsModule(moduleId, permissions = null) {
  if (!permissions) return true;

  if (moduleId === "jobDraftImports") {
    return Boolean(permissionFlag(permissions, "jobDraftImports.canView"));
  }

  if (moduleId === "copilot") {
    return Boolean(permissionFlag(permissions, "aiOffice.canView"));
  }

  if (moduleId === "appHealth") {
    return Boolean(permissionFlag(permissions, "appHealth.canView"));
  }

  return true;
}

export function canAccessWorkspaceModule(moduleId, user, companySettings = DEFAULT_COMPANY_SETTINGS, permissions = null) {
  return canAccessModule(moduleId, user, companySettings) && packageAllowsModule(moduleId, permissions);
}

const PACKAGE_LOCKED_MODULES = {
  jobDraftImports: {
    eyebrow: "Package Protected",
    title: "Imported Drafts are not included",
    description: "Imported job draft review is available in Premium and Elite packages. Your current workspace can keep using core jobs, crews, reports, uploads, and schedules.",
    badge: "Premium",
    actionTitle: "Keep working in core operations",
    actionDescription: "Open your default workspace and continue with the tools included for this company.",
  },
  copilot: {
    eyebrow: "Package Protected",
    title: "AI Office Preview is not included",
    description: "Assistant and growth-agent tools are available in Premium and Elite packages. Core office and field workflows stay available without exposing AI-only data.",
    badge: "Premium",
    actionTitle: "Open your operating workspace",
    actionDescription: "Continue with the role-safe Apex HQ tools included for this company.",
  },
  appHealth: {
    eyebrow: "Package Protected",
    title: "App Health is not included",
    description: "Owner app health, release safety, and operational readiness checks are available in Premium and Elite packages. Core contractor workflows stay available for this company.",
    badge: "Premium",
    actionTitle: "Open your operating workspace",
    actionDescription: "Continue with the role-safe Apex HQ tools included for this company.",
  },
};

export function getWorkspaceModuleLock(moduleId, user, companySettings = DEFAULT_COMPANY_SETTINGS, permissions = null) {
  if (!canAccessModule(moduleId, user, companySettings)) return null;
  if (packageAllowsModule(moduleId, permissions)) return null;

  return PACKAGE_LOCKED_MODULES[moduleId] || {
    eyebrow: "Package Protected",
    title: "This workspace is not included",
    description: "This feature is not included in the current Apex HQ package for this company.",
    badge: "Locked",
    actionTitle: "Open your allowed workspace",
    actionDescription: "Use the workspace assigned to your role and package to continue.",
  };
}

const DASHBOARD_SHORTCUTS = {
  today: {
    id: "today",
    label: "Today",
    description: "Jump to the live jobs section in the daily workspace.",
    moduleId: "dashboard",
    focusTarget: "jobs",
    ariaLabel: "Open the today dashboard workspace",
  },
  thisWeek: {
    id: "thisWeek",
    label: "This Week",
    description: "Open jobs filtered to this week's scheduled and active work.",
    moduleId: "jobs",
    filters: {
      status: "All",
      date: "This Week",
      customer: "All customers",
      foremanId: "All foremen",
      query: "",
    },
    ariaLabel: "Open jobs filtered to this week",
  },
  needsAction: {
    id: "needsAction",
    label: "Needs Action",
    description: "Jump to the queue items that still need attention.",
    moduleId: "dashboard",
    focusTarget: "queue",
    ariaLabel: "Open the dashboard action queue",
  },
  readyToBill: {
    id: "readyToBill",
    label: "Ready to Bill",
    description: "Open jobs filtered to billing-ready work.",
    moduleId: "jobs",
    filters: {
      status: "Billing Ready",
      date: "All dates",
      customer: "All customers",
      foremanId: "All foremen",
      query: "",
    },
    ariaLabel: "Open billing-ready jobs",
  },
};

export function getVisibleNavGroups(navGroups, user, companySettings = DEFAULT_COMPANY_SETTINGS, permissions = null) {
  const allowedModules = getAllowedModuleIds(user, companySettings);

  return navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => allowedModules.has(item.id) && packageAllowsModule(item.id, permissions)),
    }))
    .filter((group) => group.items.length > 0);
}

export function getDashboardShortcuts(user, companySettings = DEFAULT_COMPANY_SETTINGS) {
  const canUseDashboard = canAccessModule("dashboard", user, companySettings);
  const canUseJobs = canAccessModule("jobs", user, companySettings);

  return Object.values(DASHBOARD_SHORTCUTS).filter((shortcut) => {
    if (shortcut.id === "readyToBill") {
      return canUseDashboard && canUseJobs;
    }
    if (shortcut.id === "needsAction" || shortcut.id === "today") {
      return canUseDashboard;
    }
    if (shortcut.id === "thisWeek") {
      return canUseJobs;
    }
    return false;
  });
}

export function resolveDashboardShortcut(shortcutId, user, companySettings = DEFAULT_COMPANY_SETTINGS) {
  const shortcut = DASHBOARD_SHORTCUTS[shortcutId];
  if (!shortcut) return null;

  return getDashboardShortcuts(user, companySettings).find((entry) => entry.id === shortcutId) || null;
}
