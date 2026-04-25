export const MODULE_PATHS = {
  dashboard: "/",
  leads: "/leads",
  jobs: "/jobs",
  time: "/time",
  reports: "/reports",
  uploads: "/uploads",
  customers: "/customers",
  estimates: "/estimates",
  changeOrders: "/changeOrders",
  incidents: "/incidents",
  toolbox: "/toolbox",
  ppe: "/ppe",
  calculator: "/calculator",
  copilot: "/copilot",
  design: "/design",
  settings: "/settings",
};

export function normalizePathname(pathname = "/") {
  const prefixed = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return prefixed.length > 1 && prefixed.endsWith("/") ? prefixed.slice(0, -1) : prefixed;
}

export function getModulePath(active) {
  return MODULE_PATHS[active] || `/${active}`;
}

export function buildLeadPath(id) {
  return `/leads/${encodeURIComponent(id)}`;
}

export function buildJobPath(id) {
  return `/jobs/${encodeURIComponent(id)}`;
}

export function buildCustomerPath(id) {
  return `/customers/${encodeURIComponent(id)}`;
}

export function parseAppPath(pathname) {
  const normalized = normalizePathname(pathname);
  const segments = normalized.split("/").filter(Boolean);

  if (segments[0] === "leads" && segments[1]) {
    return { active: "leads", leadId: decodeURIComponent(segments[1]), jobId: "", customerId: "" };
  }

  if (segments[0] === "jobs" && segments[1]) {
    return { active: "jobs", leadId: "", jobId: decodeURIComponent(segments[1]), customerId: "" };
  }

  if (segments[0] === "customers" && segments[1]) {
    return { active: "customers", leadId: "", jobId: "", customerId: decodeURIComponent(segments[1]) };
  }

  const exactMatch = Object.entries(MODULE_PATHS).find(([, path]) => path === normalized);
  return {
    active: exactMatch?.[0] || "dashboard",
    leadId: "",
    jobId: "",
    customerId: "",
  };
}
