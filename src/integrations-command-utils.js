import { packageReadinessSummary } from "../shared/packages.js";

const OWNER_ADMIN_ROLES = new Set(["owner", "administrator", "admin"]);

const PROVIDER_DEFINITIONS = Object.freeze([
  {
    id: "quickbooks",
    label: "QuickBooks",
    category: "Accounting",
    direction: "Two-way later",
    summary: "Invoices, customers, job costing exports, and reconciliation should stay server-side and audit-backed.",
    nextAction: "Connect only after accounting scope, sandbox, and disconnect/rollback rules are approved.",
  },
  {
    id: "gmail",
    label: "Gmail",
    category: "Email",
    direction: "Send/read later",
    summary: "Email drafts and customer sends require OAuth, suppression, delivery history, and human review.",
    nextAction: "Configure OAuth scopes and keep customer sends behind the existing approval queue.",
  },
  {
    id: "google_calendar",
    label: "Google Calendar",
    category: "Scheduling",
    direction: "Read/write later",
    summary: "Calendar sync can help schedule crews and site visits after tenant mapping and conflict review.",
    nextAction: "Map calendars per company and keep schedule writes locked until sandbox verification passes.",
  },
  {
    id: "google_drive",
    label: "Google Drive",
    category: "Files",
    direction: "Read/write later",
    summary: "Drive can store proposal, proof, and packet artifacts after folder mapping and access review.",
    nextAction: "Prepare folder mapping, file naming, retention, and disconnect behavior before uploads.",
  },
  {
    id: "twilio",
    label: "Twilio",
    category: "SMS / Voice",
    direction: "Send later",
    summary: "Text and voice actions need sender setup, opt-out handling, templates, and delivery audit.",
    nextAction: "Finish sender compliance and suppression checks before any customer message is sent.",
  },
  {
    id: "maps_weather",
    label: "Maps / Weather",
    category: "Field intelligence",
    direction: "Read-only first",
    summary: "Maps and weather can support route/site context without hidden GPS or worker tracking.",
    nextAction: "Use visible, consent-based location only and keep provider keys server-side.",
  },
  {
    id: "companycam",
    label: "CompanyCam",
    category: "Photo proof",
    direction: "Read/write later",
    summary: "Photo proof sync needs project mapping, permission review, and clear customer-safe sharing rules.",
    nextAction: "Map projects and proof albums before any automatic import or upload is enabled.",
  },
  {
    id: "docusign",
    label: "DocuSign / e-signature",
    category: "Approvals",
    direction: "Send later",
    summary: "Proposal and change-order signatures need envelope prep, recipient review, and audit receipts.",
    nextAction: "Build sandbox envelope templates before any signature request can be sent.",
  },
  {
    id: "ads",
    label: "Google / Meta Ads",
    category: "Marketing",
    direction: "Read/report first",
    summary: "Ad reporting can support spend advice. Publishing and spend remain owner-controlled and locked.",
    nextAction: "Connect reporting before any publishing workflow; never create live spend from Apex Agent.",
  },
]);

const BUILT_ADAPTERS = Object.freeze([
  {
    id: "website_lead_intake",
    label: "Website lead intake",
    status: "Built",
    tone: "green",
    detail: "Public request intake creates manual office review leads with attribution and spam controls.",
  },
  {
    id: "job_draft_imports",
    label: "Imported job drafts",
    status: "Built",
    tone: "green",
    detail: "JSON import packages enter an owner/admin review queue before any job is created.",
  },
  {
    id: "proposal_app_import",
    label: "Proposal app handoff",
    status: "Built",
    tone: "green",
    detail: "Inbound handoff contracts normalize draft job packages without exposing field users.",
  },
  {
    id: "agent_integration_gate",
    label: "Agent integration write gate",
    status: "Locked",
    tone: "amber",
    detail: "Agent OS keeps integration writes behind provider readiness, sandbox proof, role/package gates, and human confirmation.",
  },
]);

const REQUIRED_CONTROLS = Object.freeze([
  "Settings UI",
  "Server adapter",
  "Provider health",
  "Disabled/not-configured state",
  "Focused tests",
  "No frontend secrets",
  "Audit trail",
  "Disconnect/disable control",
]);

const BLOCKED_ACTIONS = Object.freeze([
  "No frontend secrets are exposed",
  "No OAuth token exchange is performed",
  "No live provider write is executed",
  "No customer email/SMS is sent",
  "No invoice, payment, bid, ad, calendar, or file is published",
  "No hidden GPS or worker tracking is enabled",
  "No field user receives integration setup, provider, lead, estimate, billing, margin, payroll, or admin context",
]);

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function text(value = "", maxLength = 240) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function normalize(value = "") {
  return text(value).toLowerCase().replace(/[\s-]+/g, "_");
}

function hasIntegrationsCommandAccess({ user = {}, permissions = {} } = {}) {
  const role = normalize(user?.role);
  return OWNER_ADMIN_ROLES.has(role) && Boolean(permissions?.settings?.canView);
}

function integrationProviderSettings(companySettings = {}) {
  return {
    ...(companySettings.integrations || {}),
    ...(companySettings.integrationProviderSettings || {}),
    ...(companySettings.providerIntegrations || {}),
  };
}

function providerConfigFor(providerId = "", settings = {}) {
  const normalizedId = normalize(providerId);
  return settings[normalizedId]
    || settings[providerId]
    || settings[normalizedId.replace(/_/g, "-")]
    || {};
}

function safeReference(config = {}) {
  return text(
    config.accountReference
    || config.accountLabel
    || config.connectionLabel
    || config.providerAccount
    || config.credentialRef
    || config.credentialReference
    || config.mode
    || "",
    120,
  );
}

function providerConfigured(config = {}) {
  return Boolean(
    config.configured
    || config.connected
    || config.enabled
    || config.accountConnected
    || config.connectionId
    || safeReference(config),
  );
}

function providerStatus({ definition, config = {}, integrationsEntitled = false } = {}) {
  if (!integrationsEntitled) {
    return {
      status: "Package-dependent",
      tone: "slate",
      configured: false,
      health: "Locked by package",
      nextAction: "Upgrade to a package with platform integrations before connecting this provider.",
    };
  }

  const configured = providerConfigured(config);
  const disabled = config.disabled === true || normalize(config.status) === "disabled";
  if (disabled) {
    return {
      status: "Disabled",
      tone: "slate",
      configured: false,
      health: "Disabled",
      nextAction: "Reconnect only after owner/admin reviews scope, credentials, and audit requirements.",
    };
  }

  if (configured) {
    return {
      status: "Provider-ready",
      tone: "blue",
      configured: true,
      health: text(config.health || config.healthStatus || "Needs sandbox check"),
      nextAction: text(config.nextAction || definition.nextAction),
    };
  }

  return {
    status: "Needs account/API key",
    tone: "amber",
    configured: false,
    health: "Not configured",
    nextAction: definition.nextAction,
  };
}

function deriveProviderRows({ companySettings = {}, integrationsEntitled = false } = {}) {
  const settings = integrationProviderSettings(companySettings);

  return PROVIDER_DEFINITIONS.map((definition) => {
    const config = providerConfigFor(definition.id, settings);
    const status = providerStatus({ definition, config, integrationsEntitled });
    return {
      id: definition.id,
      label: definition.label,
      category: definition.category,
      direction: definition.direction,
      summary: definition.summary,
      status: status.status,
      tone: status.tone,
      configured: status.configured,
      providerHealth: status.health,
      credentialReference: status.configured ? safeReference(config) || "Credential reference present" : "",
      settingsUi: true,
      serverAdapter: status.configured ? "Provider-ready" : "Planned",
      disabledState: true,
      auditTrail: true,
      disconnectControl: true,
      noFrontendSecrets: true,
      liveWriteLocked: true,
      nextAction: status.nextAction,
    };
  });
}

function deriveAuditTrail(auditEvents = []) {
  return asArray(auditEvents)
    .filter((event) => /integration|provider|oauth|quickbooks|gmail|calendar|drive|twilio|companycam|docusign|maps|weather|ads|meta|google/i.test([
      event.type,
      event.action,
      event.summary,
      event.detail,
      event.workflow,
    ].filter(Boolean).join(" ")))
    .slice(0, 8)
    .map((event, index) => ({
      id: text(event.id || `integration-audit-${index + 1}`),
      label: text(event.summary || event.action || event.type || "Integration activity"),
      actor: text(event.actorName || event.userName || event.actorEmail || event.userEmail || ""),
      at: text(event.createdAt || event.updatedAt || event.timestamp || event.at || ""),
      type: text(event.type || event.action || "integration"),
    }));
}

export function deriveIntegrationsCommandState({
  companySettings = {},
  packageReadiness = null,
  auditEvents = [],
  permissions = {},
  user = {},
} = {}) {
  const canView = hasIntegrationsCommandAccess({ user, permissions });
  if (!canView) {
    return {
      canView: false,
      title: "Integrations Command unavailable",
      summary: "Provider setup, OAuth, API keys, server adapters, audit trails, disconnect controls, and external writes are owner/admin-only.",
      metrics: {},
      providerRows: [],
      builtAdapters: [],
      readinessControls: [],
      integrationAuditTrail: [],
      blockedActions: BLOCKED_ACTIONS.slice(),
      safetyBoundary: "Field and non-owner/admin users cannot access integration provider context.",
    };
  }

  const readiness = packageReadiness || packageReadinessSummary(companySettings.packageId);
  const integrationsEntitled = Boolean(permissions?.integrations?.canUse ?? permissions?.jobDraftImports?.canView);
  const providerRows = deriveProviderRows({ companySettings, integrationsEntitled });
  const configuredCount = providerRows.filter((row) => row.configured).length;
  const needsSetupCount = providerRows.filter((row) => row.status === "Needs account/API key").length;
  const auditTrail = deriveAuditTrail(auditEvents);

  return {
    canView: true,
    title: "Integrations Command",
    summary: integrationsEntitled
      ? "Provider-ready integrations are organized for owner/admin setup with settings, server adapters, health, disabled states, audit, disconnect controls, and locked external writes."
      : `${readiness.currentPackage?.label || "Basic"} does not include live platform integrations yet, but the setup plan stays visible so the workspace can upgrade without rebuilding.`,
    currentPackage: readiness.currentPackage,
    integrationsEntitled,
    providerRows,
    builtAdapters: BUILT_ADAPTERS.slice(),
    readinessControls: REQUIRED_CONTROLS.map((label) => ({ label, ready: true })),
    integrationAuditTrail: auditTrail,
    metrics: {
      providersTracked: providerRows.length,
      providerReady: providerRows.filter((row) => row.status === "Provider-ready").length,
      needsSetup: needsSetupCount,
      builtAdapters: BUILT_ADAPTERS.filter((adapter) => adapter.status === "Built").length,
      auditEvents: auditTrail.length,
      liveWriteLocked: 1,
      configured: configuredCount,
    },
    blockedActions: BLOCKED_ACTIONS.slice(),
    safetyBoundary: "Review-first integrations command. Apex HQ does not expose secrets, exchange OAuth tokens, call live providers, write integrations, send customer messages, publish ads, create invoices/payments, mutate calendars/files, or enable hidden GPS from this phase.",
  };
}
