export const USER_ROLE_OPTIONS = ["Owner", "Administrator", "Operations Manager", "Estimator", "Foreman", "Employee"];
export const USER_STATUS_OPTIONS = ["active", "inactive"];

export function isActiveUser(user) {
  return String(user?.status || "active").trim().toLowerCase() === "active";
}

export function filterUsers(users, {
  query = "",
  role = "All roles",
  status = "All statuses",
} = {}) {
  const normalizedQuery = String(query || "").trim().toLowerCase();

  return users.filter((user) => {
    const matchesRole = role === "All roles" ? true : user.role === role;
    const matchesStatus = status === "All statuses" ? true : String(user.status || "active").toLowerCase() === status;
    const haystack = [user.name, user.email, user.phone, user.role].filter(Boolean).join(" ").toLowerCase();
    const matchesQuery = normalizedQuery ? haystack.includes(normalizedQuery) : true;
    return matchesRole && matchesStatus && matchesQuery;
  });
}

export function deriveUserListState(users, filters = {}) {
  return {
    filteredUsers: filterUsers(users, filters),
    roleOptions: USER_ROLE_OPTIONS,
    statusOptions: USER_STATUS_OPTIONS,
  };
}

export function getForemanAssignmentOptions(users) {
  return users.filter((user) => isActiveUser(user) && user.role === "Foreman");
}

export function getCrewAssignmentOptions(users) {
  return users.filter((user) => isActiveUser(user) && (user.role === "Employee" || user.role === "Foreman"));
}
