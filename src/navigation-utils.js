import { DEFAULT_COMPANY_SETTINGS, canAccessModule, getAllowedModuleIds, getDefaultModuleId } from "../shared/permissions.js";

export { canAccessModule, getDefaultModuleId };

export function getVisibleNavGroups(navGroups, user, companySettings = DEFAULT_COMPANY_SETTINGS) {
  const allowedModules = getAllowedModuleIds(user, companySettings);

  return navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => allowedModules.has(item.id)),
    }))
    .filter((group) => group.items.length > 0);
}
