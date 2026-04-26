import { DEFAULT_COMPANY_SETTINGS, canAccessModule, getAllowedModuleIds, getDefaultModuleId } from "../shared/permissions.js";

export { canAccessModule, getDefaultModuleId };

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

export function getVisibleNavGroups(navGroups, user, companySettings = DEFAULT_COMPANY_SETTINGS) {
  const allowedModules = getAllowedModuleIds(user, companySettings);

  return navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => allowedModules.has(item.id)),
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
