export const DEFAULT_COMPANY_ID = "COMPANY-DEFAULT";
export const DEFAULT_WORKSPACE_ID = DEFAULT_COMPANY_ID;

function text(value, limit = 200) {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

export function normalizeCompanyId(value, fallback = DEFAULT_COMPANY_ID) {
  const normalized = text(value, 80);
  return normalized || fallback;
}

export function buildDefaultCompany(companySettings = {}, now = new Date().toISOString()) {
  return {
    id: DEFAULT_COMPANY_ID,
    workspaceId: DEFAULT_WORKSPACE_ID,
    name: text(companySettings.companyName, 120) || "Concrete Ops Workspace",
    status: "active",
    createdAt: now,
    updatedAt: now,
  };
}

export function normalizeCompanyRecord(company = {}, companySettings = {}, now = new Date().toISOString()) {
  const fallback = buildDefaultCompany(companySettings, now);
  const id = normalizeCompanyId(company.id, fallback.id);
  return {
    id,
    workspaceId: normalizeCompanyId(company.workspaceId || company.id, id),
    name: text(company.name, 120) || (id === DEFAULT_COMPANY_ID ? fallback.name : "Contractor Workspace"),
    status: text(company.status, 40).toLowerCase() === "inactive" ? "inactive" : "active",
    createdAt: text(company.createdAt, 40) || now,
    updatedAt: text(company.updatedAt, 40) || text(company.createdAt, 40) || now,
  };
}

export function normalizeCompanies(companies = [], companySettings = {}, now = new Date().toISOString()) {
  const rows = Array.isArray(companies) ? companies : [];
  const normalized = rows.map((company) => normalizeCompanyRecord(company, companySettings, now));
  const byId = new Map(normalized.map((company) => [company.id, company]));
  const defaultCompany = buildDefaultCompany(companySettings, now);

  if (!byId.has(DEFAULT_COMPANY_ID)) {
    byId.set(DEFAULT_COMPANY_ID, defaultCompany);
  } else {
    const existing = byId.get(DEFAULT_COMPANY_ID);
    byId.set(DEFAULT_COMPANY_ID, {
      ...existing,
      workspaceId: DEFAULT_WORKSPACE_ID,
      name: text(companySettings.companyName, 120) || existing.name || defaultCompany.name,
      status: "active",
    });
  }

  return Array.from(byId.values()).sort((left, right) => {
    if (left.id === DEFAULT_COMPANY_ID) return -1;
    if (right.id === DEFAULT_COMPANY_ID) return 1;
    return left.name.localeCompare(right.name);
  });
}

export function withDefaultCompanyId(record = {}, defaultCompanyId = DEFAULT_COMPANY_ID) {
  return {
    ...record,
    companyId: normalizeCompanyId(record.companyId, defaultCompanyId),
  };
}

export function currentCompanyIdForUser(user = {}, state = {}) {
  const companies = normalizeCompanies(state.companies, state.companySettings);
  const fallbackCompanyId = companies[0]?.id || DEFAULT_COMPANY_ID;
  const userCompanyId = normalizeCompanyId(user?.companyId, fallbackCompanyId);
  return companies.some((company) => company.id === userCompanyId) ? userCompanyId : fallbackCompanyId;
}

export function recordBelongsToCompany(record = {}, companyId = DEFAULT_COMPANY_ID) {
  return normalizeCompanyId(record?.companyId) === normalizeCompanyId(companyId);
}

export function visibleRecordsForCompany(records = [], user = {}, state = {}) {
  const companyId = currentCompanyIdForUser(user, state);
  return (Array.isArray(records) ? records : []).filter((record) => recordBelongsToCompany(record, companyId));
}
