const FIELD_NAV_IDS = new Set([
  "jobs",
  "time",
  "reports",
  "uploads",
  "incidents",
  "toolbox",
  "ppe",
  "calculator",
  "copilot",
  "settings",
]);

function normalizeRole(role) {
  return String(role || "").trim().toLowerCase();
}

export function isOfficeUser(user) {
  return new Set(["owner", "administrator", "operations manager"]).has(normalizeRole(user?.role));
}

export function getDefaultModuleId(user) {
  return isOfficeUser(user) ? "dashboard" : "jobs";
}

export function canAccessModule(moduleId, user) {
  return isOfficeUser(user) || FIELD_NAV_IDS.has(moduleId);
}

export function getVisibleNavGroups(navGroups, user) {
  if (isOfficeUser(user)) {
    return navGroups;
  }

  return navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => FIELD_NAV_IDS.has(item.id)),
    }))
    .filter((group) => group.items.length > 0);
}
