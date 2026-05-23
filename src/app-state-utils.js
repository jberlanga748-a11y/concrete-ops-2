export const DEFAULT_APP_PERMISSIONS = {
  users: {
    canView: false,
    canManage: false,
  },
  customers: {
    canView: false,
    canManage: false,
  },
  leads: {
    canView: false,
    canManage: false,
  },
  opportunityScout: {
    canView: false,
    canManage: false,
  },
  customerPortal: {
    canPreview: false,
  },
  contactHistory: {
    canView: false,
    canManage: false,
  },
  estimates: {
    canView: false,
    canManage: false,
    canUseAiRoughNotes: false,
    canUseGcPackets: false,
  },
  rateBook: {
    canView: false,
    canManage: false,
  },
  jobDraftImports: {
    canView: false,
    canManage: false,
    canCreateJob: false,
  },
  aiOffice: {
    canView: false,
    canUseLeadAssistant: false,
  },
  jobs: {
    canView: false,
    canCreate: false,
    canManageAll: false,
    canManageField: false,
    canManageAssignments: false,
    canViewMoney: false,
  },
  reports: {
    canView: false,
    canCreate: false,
    canManageAll: false,
    canReview: false,
    canViewAdvanced: false,
  },
  prePour: {
    canView: false,
    canManage: false,
    canManageAll: false,
    canComplete: false,
    canReview: false,
  },
  postPour: {
    canView: false,
    canManage: false,
    canManageAll: false,
    canComplete: false,
    canReview: false,
  },
  uploads: {
    canView: false,
    canCreate: false,
    canManageAll: false,
  },
  time: {
    canView: false,
    canManageOwn: false,
    canViewCrew: false,
    canViewAll: false,
    canCorrect: false,
    allowedCategories: [],
  },
  safety: {
    canView: false,
    canManage: false,
    canAcknowledge: false,
    canSubmitIncidents: false,
    canReviewIncidents: false,
  },
  calculator: {
    canUse: false,
  },
  toolChecklist: {
    canUse: false,
    canManage: false,
    canManageAll: false,
    canManageJob: false,
    canContribute: false,
    canReview: false,
    canToggle: false,
  },
  settings: {
    canView: false,
    canManageUsers: false,
    canExport: false,
  },
  appHealth: {
    canView: false,
  },
  support: {
    canView: false,
  },
  watchtower: {
    canView: false,
  },
  fieldOps: {
    canView: false,
    canViewCompanyWide: false,
  },
  companies: {
    canSwitch: false,
    canViewAll: false,
  },
  changeOrders: {
    canView: false,
    canManage: false,
    canRequest: false,
  },
  deliveryTickets: {
    canView: false,
    canCreate: false,
    canManageAll: false,
    canEditOwn: false,
  },
  audit: {
    canView: false,
  },
};

export function mergePermissionScope(defaults, incoming) {
  return {
    ...defaults,
    ...(incoming || {}),
  };
}

export function normalizeAppPermissions(sourcePermissions = {}, fallbackPermissions = {}) {
  const source = sourcePermissions || {};
  const fallback = fallbackPermissions || {};
  const permissionKeys = new Set([
    ...Object.keys(DEFAULT_APP_PERMISSIONS),
    ...Object.keys(fallback),
    ...Object.keys(source),
  ]);

  return Object.fromEntries(
    [...permissionKeys].map((key) => [
      key,
      mergePermissionScope(
        DEFAULT_APP_PERMISSIONS[key] || {},
        Object.hasOwn(source, key) ? source[key] : fallback[key],
      ),
    ]),
  );
}

export function shouldRenderCommandCenterForDashboard({ permissions = {}, firstOwnerOnboarding = null } = {}) {
  const isOfficeWorkspace = Boolean(permissions?.jobs?.canManageAll || permissions?.leads?.canView);
  const firstOwnerSetupIncomplete = Boolean(firstOwnerOnboarding && firstOwnerOnboarding.complete === false);

  return isOfficeWorkspace && !firstOwnerSetupIncomplete;
}
