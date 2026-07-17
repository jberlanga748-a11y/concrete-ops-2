import { SIMPLE_FENCE_HIDDEN_MODULE_IDS } from "./navigation-utils.js";

export const OWNER_ADMIN_MOBILE_NAV_ORDER = [
  { id: "dashboard", label: "Today", icon: "grid" },
  { id: "fieldWorkspace", label: "Field", icon: "briefcase" },
  { id: "communications", label: "Office", icon: "inbox" },
  { id: "estimates", label: "Money", icon: "quote" },
];

export const OWNER_ADMIN_MOBILE_MORE_ORDER = [
  { id: "jobs", label: "Jobs", icon: "briefcase" },
  { id: "schedule", label: "Schedule", icon: "calendar" },
  { id: "reports", label: "Reports", icon: "document" },
  { id: "uploads", label: "Photos", icon: "upload" },
  { id: "leads", label: "Leads", icon: "inbox" },
  { id: "customers", label: "Customers", icon: "users" },
  { id: "employees", label: "Team", icon: "users" },
  { id: "deliveryTickets", label: "Tickets", icon: "document" },
  { id: "calculator", label: "Calc", icon: "calculator" },
  { id: "support", label: "Help", icon: "help" },
  { id: "copilot", label: "Assistant", icon: "spark" },
  { id: "settings", label: "Setup", icon: "settings" },
];

export const ESTIMATOR_MOBILE_NAV_ORDER = [
  { id: "leads", label: "Pipeline", icon: "grid" },
  { id: "estimates", label: "Estimates", icon: "quote" },
  { id: "customers", label: "Contacts", icon: "users" },
  { id: "communications", label: "Messages", icon: "quote" },
];

export const ESTIMATOR_MOBILE_NAV_ROUTES = new Set(["leads", "estimates", "customers", "communications"]);

export function getOwnerAdminMobileNavItems(visibleNavItems = [], { simpleFenceMode = false } = {}) {
  const allowsItem = (item) => !simpleFenceMode || !SIMPLE_FENCE_HIDDEN_MODULE_IDS.has(item.id);
  const visibleById = new Map((visibleNavItems || []).map((item) => [item.id, item]));
  const ordered = OWNER_ADMIN_MOBILE_NAV_ORDER
    .filter(allowsItem)
    .map((item) => {
      const visible = visibleById.get(item.id);
      return visible ? { ...visible, label: item.label, icon: item.icon || visible.icon } : null;
    })
    .filter(Boolean);
  const orderedIds = new Set(ordered.map((item) => item.id));
  const overflow = OWNER_ADMIN_MOBILE_MORE_ORDER
    .filter(allowsItem)
    .map((item) => {
      if (orderedIds.has(item.id)) return null;
      const visible = visibleById.get(item.id);
      return visible ? { ...visible, label: item.label, icon: item.icon || visible.icon } : null;
    })
    .filter(Boolean);
  return [
    ...ordered,
    ...overflow,
  ];
}

export function getEstimatorMobileNavItems(visibleNavItems = []) {
  const visibleById = new Map((visibleNavItems || []).map((item) => [item.id, item]));
  const ordered = ESTIMATOR_MOBILE_NAV_ORDER
    .map((item) => {
      const visible = visibleById.get(item.id);
      return visible ? { ...visible, label: item.label, icon: item.icon || visible.icon } : null;
    })
    .filter(Boolean);
  const orderedIds = new Set(ordered.map((item) => item.id));
  return [
    ...ordered,
    ...(visibleNavItems || []).filter((item) => !orderedIds.has(item.id)),
  ];
}
