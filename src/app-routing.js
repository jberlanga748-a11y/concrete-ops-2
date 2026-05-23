export const MODULE_PATHS = {
  dashboard: "/",
  commandCenter: "/command-center",
  communications: "/communications",
  leads: "/leads",
  jobs: "/jobs",
  schedule: "/schedule",
  time: "/time",
  reports: "/reports",
  uploads: "/uploads",
  deliveryTickets: "/delivery-tickets",
  customers: "/customers",
  employees: "/employees",
  estimates: "/estimates",
  rateBook: "/rate-book",
  materialPrep: "/material-prep",
  jobDraftImports: "/imported-drafts",
  changeOrders: "/change-orders",
  incidents: "/incidents",
  toolbox: "/toolbox-talks",
  ppe: "/ppe",
  prePour: "/pre-pour",
  postPour: "/post-pour",
  toolChecklist: "/tool-checklist",
  calculator: "/calculator",
  appHealth: "/app-health",
  copilot: "/ai-office",
  support: "/support",
  design: "/design",
  settings: "/settings",
};

const LEGACY_MODULE_PATHS = {
  "/copilot": "copilot",
  "/job-draft-imports": "jobDraftImports",
  "/toolbox": "toolbox",
  "/deliveryTickets": "deliveryTickets",
  "/changeOrders": "changeOrders",
  "/prePour": "prePour",
  "/postPour": "postPour",
  "/toolChecklist": "toolChecklist",
  "/communication-center": "communications",
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

export function buildReportPath(id) {
  return `/reports/${encodeURIComponent(id)}`;
}

export function buildImportedJobDraftPath(id) {
  return `/imported-drafts/${encodeURIComponent(id)}`;
}

export function parseAppPath(pathname) {
  const normalized = normalizePathname(pathname);
  const segments = normalized.split("/").filter(Boolean);

  if (segments[0] === "leads" && segments[1]) {
    return { active: "leads", leadId: decodeURIComponent(segments[1]), jobId: "", customerId: "", reportId: "", importedDraftId: "" };
  }

  if (segments[0] === "jobs" && segments[1]) {
    return { active: "jobs", leadId: "", jobId: decodeURIComponent(segments[1]), customerId: "", reportId: "", importedDraftId: "" };
  }

  if (segments[0] === "customers" && segments[1]) {
    return { active: "customers", leadId: "", jobId: "", customerId: decodeURIComponent(segments[1]), reportId: "", importedDraftId: "" };
  }

  if (segments[0] === "reports" && segments[1]) {
    return { active: "reports", leadId: "", jobId: "", customerId: "", reportId: decodeURIComponent(segments[1]), importedDraftId: "" };
  }

  if ((segments[0] === "imported-drafts" || segments[0] === "job-draft-imports") && segments[1]) {
    return { active: "jobDraftImports", leadId: "", jobId: "", customerId: "", reportId: "", importedDraftId: decodeURIComponent(segments[1]) };
  }

  const legacyMatch = LEGACY_MODULE_PATHS[normalized];
  const exactMatch = Object.entries(MODULE_PATHS).find(([, path]) => path === normalized);
  return {
    active: legacyMatch || exactMatch?.[0] || "dashboard",
    leadId: "",
    jobId: "",
    customerId: "",
    reportId: "",
    importedDraftId: "",
  };
}
