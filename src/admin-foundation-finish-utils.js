import { getImportedJobDraftStats } from "../shared/jobDraftImports.js";
import { deriveFirstOwnerOnboardingState, deriveManagedCompanySetupState } from "../shared/managedCompanySetup.js";
import { getAllowedModuleIds, normalizeRole } from "../shared/permissions.js";
import { packageReadinessSummary } from "../shared/packages.js";
import { deriveOverallOwnerHealthStatus, healthStatusTone, ownerHealthStatusLabel } from "./owner-health-utils.js";

const ADMIN_ALLOWED_ROLES = new Set(["owner", "administrator", "admin", "operations manager"]);
const FIELD_ROLES = new Set(["foreman", "employee"]);
const SENSITIVE_FIELD_MODULES = Object.freeze([
  "settings",
  "employees",
  "appHealth",
  "jobDraftImports",
  "copilot",
  "leads",
  "estimates",
  "proposals",
  "rateBook",
  "materialPrep",
  "communications",
]);

const ADMIN_FOUNDATION_BLOCKED_ACTIONS = Object.freeze([
  "No field user receives admin setup, company setup, provider, billing, package, imported draft, lead, estimate, pricing, margin, profit, payroll, or AI office context",
  "No live provider write, OAuth token exchange, customer send, payment, ad spend, bid submission, calendar/file mutation, hidden GPS, or destructive data action is performed",
  "Provider/account-dependent systems stay visible as readiness states for owner/admin users without pretending live accounts are configured",
]);

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function text(value = "", maxLength = 240) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function activeUsers(users = []) {
  return asArray(users).filter((user) => (user?.status || "active") !== "inactive");
}

function isAdminRole(role = "") {
  return ADMIN_ALLOWED_ROLES.has(normalizeRole(role));
}

function row({ id, label, status, tone = "", ready = false, helper = "", action = "", required = true, moduleId = "" }) {
  return {
    id,
    label,
    status,
    tone: tone || (ready ? "green" : "amber"),
    ready: Boolean(ready),
    required: Boolean(required),
    helper,
    action,
    moduleId,
  };
}

function providerStatusFromCounts(configured = 0, needsSetup = 0) {
  if (configured > 0) return "Provider-ready";
  if (needsSetup > 0) return "Needs account/API key";
  return "Provider-ready";
}

function deriveAccessReviewRows(companySettings = {}) {
  const roleSamples = [
    { role: "owner", label: "Owner" },
    { role: "administrator", label: "Administrator" },
    { role: "operations manager", label: "Operations Manager" },
    { role: "estimator", label: "Estimator" },
    { role: "foreman", label: "Foreman" },
    { role: "employee", label: "Employee" },
  ];

  return roleSamples.map((sample) => {
    const modules = getAllowedModuleIds({ id: `phase1-${sample.role}`, role: sample.role }, companySettings);
    const visibleSensitiveModules = SENSITIVE_FIELD_MODULES.filter((moduleId) => modules.has(moduleId));
    const fieldRole = FIELD_ROLES.has(sample.role);
    const ready = fieldRole ? visibleSensitiveModules.length === 0 : true;
    return {
      id: sample.role.replace(/\s+/g, "-"),
      label: sample.label,
      role: sample.role,
      fieldRole,
      ready,
      status: fieldRole ? (ready ? "Field-safe" : "Exposure risk") : "Expected access",
      tone: fieldRole ? (ready ? "green" : "red") : "blue",
      defaultModule: fieldRole ? "jobs" : "dashboard",
      visibleSensitiveModules,
      helper: fieldRole
        ? (ready
          ? "Field role routes stay in field work/support and do not include admin, money, provider, lead, estimate, or AI office modules."
          : `Field role can see restricted modules: ${visibleSensitiveModules.join(", ")}.`)
        : "Office role access is expected and still subject to server-side permissions.",
    };
  });
}

function deriveProviderReadinessRows({ packageReadiness = {}, integrationsCommandState = {}, billingCommandState = {} } = {}) {
  const integrationsMetrics = integrationsCommandState.metrics || {};
  const billingProvider = billingCommandState.providerState || {};
  const integrationsVisible = integrationsCommandState.canView !== false;
  const billingVisible = billingCommandState.canView !== false;
  const integrationStatus = integrationsCommandState.integrationsEntitled
    ? providerStatusFromCounts(integrationsMetrics.providerReady || integrationsMetrics.configured, integrationsMetrics.needsSetup)
    : "Provider-ready";

  return [
    row({
      id: "package-plan",
      label: "Package / plan",
      status: packageReadiness?.currentPackage?.label || "Basic",
      tone: "blue",
      ready: true,
      helper: packageReadiness?.billingStatus || "Manual package readiness is visible to owner/admin users.",
      action: "Review plan readiness",
      moduleId: "settings",
    }),
    row({
      id: "integration-providers",
      label: "Integration providers",
      status: integrationStatus,
      tone: integrationStatus === "Needs account/API key" ? "amber" : "blue",
      ready: integrationsVisible,
      helper: integrationsVisible
        ? `${integrationsMetrics.providersTracked || 0} providers tracked; ${integrationsMetrics.needsSetup || 0} need account/API setup. Live writes stay locked.`
        : "Integration provider setup is owner/admin-only.",
      action: "Review integrations",
      moduleId: "settings",
    }),
    row({
      id: "billing-provider",
      label: "Billing / payment provider",
      status: billingProvider.status || "Provider-ready",
      tone: billingProvider.configured ? "blue" : "amber",
      ready: billingVisible,
      helper: billingProvider.nextAction || "Payment provider setup is visible, but live checkout, invoices, payment links, and charges stay locked.",
      action: "Review billing readiness",
      moduleId: "settings",
    }),
  ];
}

export function deriveAdminFoundationFinishState({
  companySettings = {},
  users = [],
  leadSources = [],
  jobs = [],
  importedDrafts = [],
  permissions = {},
  user = {},
  managedSetupState = null,
  firstOwnerOnboarding = null,
  packageReadiness = null,
  integrationsCommandState = {},
  billingCommandState = {},
  ownerHealth = {},
  appHealthAuditState = {},
  importedDraftsRouteReady = true,
} = {}) {
  const role = normalizeRole(user?.role);
  const fieldRole = FIELD_ROLES.has(role);
  const canView = !fieldRole && Boolean(
    permissions?.settings?.canView
    || permissions?.users?.canView
    || permissions?.appHealth?.canView
    || isAdminRole(role),
  );

  const accessReviewRows = deriveAccessReviewRows(companySettings);
  const fieldLockoutReady = accessReviewRows
    .filter((entry) => entry.fieldRole)
    .every((entry) => entry.ready);

  if (!canView) {
    return {
      canView: false,
      title: "Admin Foundation unavailable",
      status: "Locked",
      tone: "slate",
      summary: "Admin setup, provider, package, imported draft, app health, support, and billing readiness are office/admin-only.",
      readinessRows: [],
      providerReadinessRows: [],
      accessReviewRows,
      nextAction: null,
      metrics: {
        totalRows: 0,
        readyRows: 0,
        blockerCount: 0,
        fieldLockoutReady,
      },
      blockedActions: ADMIN_FOUNDATION_BLOCKED_ACTIONS.slice(),
      safetyBoundary: "Field users stay in field-safe work and support. Admin foundation state does not expose setup, provider, billing, package, import, pricing, lead, estimate, payroll, or AI office context.",
    };
  }

  const setupState = managedSetupState || deriveManagedCompanySetupState({
    companySettings,
    users,
    leadSources,
    jobs,
  });
  const firstOwnerState = firstOwnerOnboarding || deriveFirstOwnerOnboardingState({
    companySettings,
    users,
    leadSources,
    jobs,
  });
  const readiness = packageReadiness || packageReadinessSummary(companySettings.packageId);
  const draftStats = getImportedJobDraftStats(importedDrafts);
  const safeUsers = activeUsers(users);
  const officeAdminUsers = safeUsers.filter((entry) => isAdminRole(entry.role));
  const fieldUsers = safeUsers.filter((entry) => FIELD_ROLES.has(normalizeRole(entry.role)));
  const healthStatus = deriveOverallOwnerHealthStatus(ownerHealth);
  const healthLabel = ownerHealthStatusLabel(healthStatus);
  const healthReady = Boolean(permissions?.appHealth?.canView) && healthStatus !== "critical";
  const providerReadinessRows = deriveProviderReadinessRows({
    packageReadiness: readiness,
    integrationsCommandState,
    billingCommandState,
  });

  const readinessRows = [
    row({
      id: "first-owner-setup",
      label: "First owner setup",
      status: firstOwnerState.complete ? "Built" : "Partial",
      tone: firstOwnerState.complete ? "green" : "amber",
      ready: firstOwnerState.complete,
      helper: firstOwnerState.complete ? "Owner onboarding has enough workspace evidence to continue." : text(firstOwnerState.nextStep?.description || "Finish the first owner setup path."),
      action: firstOwnerState.nextStep?.label || "Review setup",
      moduleId: "settings",
    }),
    row({
      id: "managed-company-setup",
      label: "Company setup checklist",
      status: setupState.status || "In Progress",
      tone: setupState.blockerCount ? "amber" : "green",
      ready: setupState.blockerCount === 0,
      helper: `${setupState.completedCount || 0}/${setupState.totalCount || 0} setup items ready; ${setupState.blockerCount || 0} critical blockers.`,
      action: "Review managed setup",
      moduleId: "settings",
    }),
    row({
      id: "users-roles",
      label: "Users / roles",
      status: officeAdminUsers.length ? "Built" : "Missing",
      tone: officeAdminUsers.length && fieldLockoutReady ? "green" : "amber",
      ready: officeAdminUsers.length > 0 && fieldLockoutReady,
      helper: `${safeUsers.length} active users; ${officeAdminUsers.length} admin/manager; ${fieldUsers.length} field users. Field lockout ${fieldLockoutReady ? "passes" : "needs review"}.`,
      action: "Review employees",
      moduleId: "employees",
    }),
    row({
      id: "app-health",
      label: "App health / trust",
      status: healthLabel,
      tone: healthStatusTone(healthStatus),
      ready: healthReady,
      helper: `${appHealthAuditState?.stats?.auditEvents || 0} audit events; ${appHealthAuditState?.stats?.sensitiveAuditEvents || 0} sensitive events tracked.`,
      action: "Open app health",
      moduleId: "appHealth",
    }),
    row({
      id: "support",
      label: "Support packet",
      status: permissions?.support?.canView ? "Built" : "Missing",
      tone: permissions?.support?.canView ? "green" : "amber",
      ready: Boolean(permissions?.support?.canView),
      helper: "Support stays copy-only and role-safe until a support desk provider exists.",
      action: "Open support",
      moduleId: "support",
    }),
    row({
      id: "imported-drafts",
      label: "Imported drafts",
      status: importedDraftsRouteReady && permissions?.jobDraftImports?.canView ? "Built" : "Partial",
      tone: importedDraftsRouteReady && permissions?.jobDraftImports?.canView ? "green" : "amber",
      ready: Boolean(importedDraftsRouteReady && permissions?.jobDraftImports?.canView),
      helper: `${draftStats.total} imported drafts; ${draftStats.needsReview} need review; ${draftStats.readyToCreate} ready to create. Jobs require owner/admin approval.`,
      action: "Open imported drafts",
      moduleId: "jobDraftImports",
    }),
    ...providerReadinessRows,
  ];

  const requiredRows = readinessRows.filter((entry) => entry.required);
  const readyRows = requiredRows.filter((entry) => entry.ready);
  const blockerRows = requiredRows.filter((entry) => !entry.ready);
  const nextAction = blockerRows[0] || readinessRows.find((entry) => entry.moduleId) || null;

  return {
    canView: true,
    title: "Admin Foundation Finish",
    status: blockerRows.length ? "Needs finish pass" : "Ready to freeze",
    tone: blockerRows.length ? "amber" : "green",
    summary: blockerRows.length
      ? `${readyRows.length}/${requiredRows.length} admin foundation areas are ready. Finish ${blockerRows[0].label} next.`
      : "Admin setup, users, field lockout, app health, support, imports, provider readiness, and package readiness are ready for Phase 1 freeze.",
    readinessRows,
    providerReadinessRows,
    accessReviewRows,
    nextAction,
    metrics: {
      totalRows: requiredRows.length,
      readyRows: readyRows.length,
      blockerCount: blockerRows.length,
      activeUsers: safeUsers.length,
      adminUsers: officeAdminUsers.length,
      fieldUsers: fieldUsers.length,
      importedDrafts: draftStats.total,
      importedDraftsNeedingReview: draftStats.needsReview,
      providerRows: providerReadinessRows.length,
      fieldLockoutReady,
      setupPercent: setupState.percentComplete || 0,
    },
    packageReadiness: readiness,
    blockedActions: ADMIN_FOUNDATION_BLOCKED_ACTIONS.slice(),
    safetyBoundary: "Admin Foundation Finish is owner/admin setup only. Field users remain blocked from admin setup, provider setup, package/billing, imported drafts, leads, estimates, pricing, margins, payroll, AI office, and other company data.",
    freezeRule: "After Phase 1 passes tests, browser QA, deploy, and health-check, admin/setup tools become do-not-rebuild except for bugs, provider hookups, security, mobile blockers, or approved versioned upgrades.",
  };
}
