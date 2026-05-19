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
    return Boolean(permissionFlag(permissions, "aiOffice.canView") && permissionFlag(permissions, "opportunityScout.canView"));
  }

  if (moduleId === "appHealth") {
    return Boolean(permissionFlag(permissions, "appHealth.canView"));
  }

  if (moduleId === "support") {
    return Boolean(permissionFlag(permissions, "support.canView"));
  }

  return true;
}

export function canAccessWorkspaceModule(moduleId, user, companySettings = DEFAULT_COMPANY_SETTINGS, permissions = null) {
  return canAccessModule(moduleId, user, companySettings) && packageAllowsModule(moduleId, permissions);
}

const PACKAGE_LOCKED_MODULES = {
  jobDraftImports: {
    eyebrow: "Package Locked",
    title: "Imported Drafts are not included",
    description: "Imported job draft review is available in Premium and Elite packages. This is a package boundary, not a broken page.",
    badge: "Premium package",
    requiredPackage: "Premium",
    requestedFeature: "Imported Drafts",
    actionTitle: "Keep working in core operations",
    actionDescription: "Open your default workspace or send a manual upgrade review request with the current package context.",
    reviewActionLabel: "Review plan readiness",
    supportActionLabel: "Request upgrade review",
    manualUpgradeNote: "Imported Drafts stay locked until a founder/operator approves a Premium or Elite package change. Core jobs, crews, reports, uploads, and schedules remain available.",
  },
  copilot: {
    eyebrow: "Package Locked",
    title: "Opportunity Scout is not included",
    description: "Opportunity Scout review-first intake is available in Elite. This workspace can keep using core office and field workflows.",
    badge: "Elite package",
    requiredPackage: "Elite",
    requestedFeature: "Opportunity Scout",
    actionTitle: "Open your operating workspace",
    actionDescription: "Continue with the role-safe Apex HQ tools included for this company, or request a manual Elite review.",
    reviewActionLabel: "Review plan readiness",
    supportActionLabel: "Request upgrade review",
    manualUpgradeNote: "Opportunity Scout upgrades are reviewed manually for now. Apex HQ does not enable automation, package changes, checkout, or billing collection from this page.",
  },
  appHealth: {
    eyebrow: "Package Locked",
    title: "App Health is not included",
    description: "Owner app health, release safety, and operational readiness checks are available in Premium and Elite packages.",
    badge: "Premium package",
    requiredPackage: "Premium",
    requestedFeature: "App Health",
    actionTitle: "Open your operating workspace",
    actionDescription: "Continue with the role-safe Apex HQ tools included for this company, or request a manual Premium review.",
    reviewActionLabel: "Review plan readiness",
    supportActionLabel: "Request upgrade review",
    manualUpgradeNote: "App Health stays locked until a manual Premium or Elite review is approved. Security, company isolation, and role protection stay included in every package.",
  },
  support: {
    eyebrow: "Package Locked",
    title: "Support is not included",
    description: "Help and support handoff tools require the workspace support entitlement. Core route protection still keeps this page role-safe.",
    badge: "Support",
    requiredPackage: "Basic",
    requestedFeature: "Support",
    actionTitle: "Open your operating workspace",
    actionDescription: "Continue with the role-safe Apex HQ tools included for this company.",
    reviewActionLabel: "Review plan readiness",
    supportActionLabel: "Request support review",
    manualUpgradeNote: "Support access follows package entitlement and role protection. Package changes remain manual; this page cannot start billing or change plans.",
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
    reviewActionLabel: "Review plan readiness",
    supportActionLabel: "Request upgrade review",
    manualUpgradeNote: "Package changes are reviewed manually for now. Core operations remain available, and this page cannot start checkout, billing, or package changes.",
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
