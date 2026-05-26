export function isOwnerAdminMobileCommandUser(user = {}, permissions = {}) {
  const role = String(user?.role || "").trim().toLowerCase();
  return ["owner", "administrator"].includes(role) && Boolean(permissions?.jobs?.canManageAll && permissions?.leads?.canView);
}
