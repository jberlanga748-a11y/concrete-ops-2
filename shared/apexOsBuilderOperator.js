import {
  APEX_OS_ACTION_DOMAIN,
  APEX_OS_ACTION_RISK_TIER,
  buildApexOsActionPermissionSummary,
  classifyApexOsAction,
} from "./apexOsActionPermissions.js";
import {
  APEX_OS_PRIVACY_ACTION,
  APEX_OS_PRIVACY_CONTEXT,
  buildApexOsPrivacySummary,
  classifyApexOsPrivacy,
} from "./apexOsPrivacyFirewall.js";
import {
  APEX_OS_PROMPT_INJECTION_RISK,
  buildApexOsUntrustedContentSummary,
  normalizeApexOsPromptInjectionRisk,
  shouldBlockApexOsUntrustedRoute,
} from "./apexOsUntrustedContentFirewall.js";
import {
  APEX_OS_TRACE_EVENT_TYPE,
  APEX_OS_TRACE_SOURCE,
  APEX_OS_TRACE_STATUS,
  createApexOsTraceEntry,
} from "./apexOsTraceLog.js";

export const APEX_OS_BUILDER_OPERATOR_PHASE = "Phase 10";

export const APEX_OS_BUILDER_OPERATOR_PLAN_STATE = Object.freeze({
  NOT_REQUESTED: "not-requested",
  PLANNED: "planned",
  APPROVAL_REQUIRED: "approval-required",
  BLOCKED_BY_PRIVACY: "blocked-by-privacy",
  BLOCKED_BY_UNTRUSTED_CONTENT: "blocked-by-untrusted-content",
  FORBIDDEN: "forbidden",
});

export const APEX_OS_BUILDER_OPERATOR_PLAN_STATES = Object.freeze(Object.values(APEX_OS_BUILDER_OPERATOR_PLAN_STATE));

export const APEX_OS_BUILDER_OPERATOR_INTENT = Object.freeze({
  NOT_REQUESTED: "not-requested",
  BUILD_PHASE_PLAN: "build-phase-plan",
  BUG_TRIAGE_PLAN: "bug-triage-plan",
  CODE_REVIEW_PLAN: "code-review-plan",
  IMPLEMENTATION_WORK_PACKAGE: "implementation-work-package",
  QA_VALIDATION_PLAN: "qa-validation-plan",
  RELEASE_READINESS_PLAN: "release-readiness-plan",
  SCHEMA_AUTH_SAFETY_PLAN: "schema-auth-safety-plan",
  PRODUCTION_DEPLOY_PLAN: "production-deploy-plan",
  CUSTOMER_VISIBLE_SAFETY_PLAN: "customer-visible-safety-plan",
  MULTI_WORKSTREAM_PLAN: "multi-workstream-plan",
  FORBIDDEN: "forbidden",
});

export const APEX_OS_BUILDER_OPERATOR_INTENTS = Object.freeze(Object.values(APEX_OS_BUILDER_OPERATOR_INTENT));

export const APEX_OS_BUILDER_OPERATOR_RISK_TIER = Object.freeze({
  SOURCE_BACKED_PLAN: "source-backed-plan",
  BUG_TRIAGE_PLAN: "bug-triage-plan",
  IMPLEMENTATION_PLAN: "implementation-plan",
  QA_TEST_PLAN: "qa-test-plan",
  RELEASE_PLAN: "release-plan",
  CUSTOMER_VISIBLE_PLAN: "customer-visible-plan",
  SCHEMA_AUTH_PLAN: "schema-auth-plan",
  PRODUCTION_DEPLOY_PLAN: "production-deploy-plan",
  FORBIDDEN: "forbidden",
});

export const APEX_OS_BUILDER_OPERATOR_RISK_TIERS = Object.freeze(Object.values(APEX_OS_BUILDER_OPERATOR_RISK_TIER));

export const APEX_OS_BUILDER_OPERATOR_SURFACE = Object.freeze({
  NONE: "none",
  APEX_HQ: "apex-hq",
  SOURCE_CONTEXT: "source-context",
  FRONTEND_UI: "frontend-ui",
  BACKEND_API: "backend-api",
  PERMISSIONS: "permissions",
  QA_TESTS: "qa-tests",
  RELEASE: "release",
  DOCS_ROADMAP: "docs-roadmap",
  MULTI: "multi",
});

const TEXT_LIMIT = 1000;
const SUMMARY_LIMIT = 620;

const REQUIRED_PRECONDITIONS = Object.freeze([
  "operator-confirms-apex-hq-scope",
  "source-of-truth-docs-reviewed",
  "frozen-workflows-identified",
  "permission-and-field-boundary-reviewed",
  "privacy-firewall-cleared-or-redacted",
  "untrusted-content-firewall-cleared",
  "validation-and-rollback-plan-drafted",
  "approval-boundary-reviewed",
  "stop-before-agent-code-test-git-deploy-or-production-execution",
]);

const PLAN_STEP_IDS = Object.freeze([
  "classify-builder-operator-intent",
  "map-source-backed-workstream",
  "identify-risk-and-approval-boundary",
  "draft-smallest-safe-work-package",
  "list-validation-and-role-checks",
  "draft-rollback-plan",
  "prepare-approval-packet-if-needed",
  "stop-before-execution",
]);

const BLOCKED_ACTION_IDS = Object.freeze([
  "execute-agent-or-subagent",
  "edit-code-files-or-generated-assets",
  "run-tests-builds-browser-qa-or-shell-commands",
  "git-branch-commit-push-stash-or-checkout",
  "open-browser-desktop-or-control-apps",
  "deploy-rollback-release-or-touch-production",
  "change-schema-auth-session-permissions-or-providers",
  "read-or-print-env-secrets-tokens-cookies-or-credentials",
  "mutate-production-data-or-customer-visible-state",
  "send-email-sms-message-or-notification",
  "spend-money-order-book-or-write-calendar",
  "run-connectors-plugins-tools-or-webhooks",
  "expose-apex-os-to-field-customer-demo-users",
]);

function text(value = "", limit = TEXT_LIMIT) {
  return String(value ?? "").replace(/\s+\n/g, "\n").replace(/\s+/g, " ").trim().slice(0, limit);
}

function lower(value = "") {
  return text(value).toLowerCase();
}

function normalizeEnum(value = "", allowed = [], fallback = "") {
  const normalized = lower(value);
  return allowed.includes(normalized) ? normalized : fallback;
}

function matchesAny(value = "", patterns = []) {
  return patterns.some((pattern) => pattern.test(value));
}

function actionPermissionSummaryFromInput(description = "", input = {}) {
  if (input.actionPermissionSummary?.riskTier) return input.actionPermissionSummary;
  if (input.actionPermission?.riskTier) return buildApexOsActionPermissionSummary(input.actionPermission);
  return buildApexOsActionPermissionSummary(classifyApexOsAction({ description }));
}

function privacySummaryFromInput(description = "", input = {}) {
  if (input.privacyFirewallSummary?.actions) return input.privacyFirewallSummary;
  if (input.privacyResult?.metadata) return buildApexOsPrivacySummary([input.privacyResult]);
  const privacyResult = classifyApexOsPrivacy(description, {
    sourceContext: input.sourceContext || APEX_OS_PRIVACY_CONTEXT.OPERATOR_PRIVATE,
    targetContext: input.targetContext || APEX_OS_PRIVACY_CONTEXT.APEX_HQ_PROJECT,
  });
  return buildApexOsPrivacySummary([privacyResult]);
}

function untrustedContentSummaryFromInput(input = {}) {
  if (input.untrustedContentFirewallSummary?.highestRiskLevel) return input.untrustedContentFirewallSummary;
  if (input.untrustedContentResult?.metadata) return buildApexOsUntrustedContentSummary([input.untrustedContentResult]);
  return buildApexOsUntrustedContentSummary([]);
}

function normalizeApexOsBuilderOperatorPlanState(value = APEX_OS_BUILDER_OPERATOR_PLAN_STATE.NOT_REQUESTED) {
  return normalizeEnum(value, APEX_OS_BUILDER_OPERATOR_PLAN_STATES, APEX_OS_BUILDER_OPERATOR_PLAN_STATE.NOT_REQUESTED);
}

function normalizeApexOsBuilderOperatorIntent(value = APEX_OS_BUILDER_OPERATOR_INTENT.NOT_REQUESTED) {
  return normalizeEnum(value, APEX_OS_BUILDER_OPERATOR_INTENTS, APEX_OS_BUILDER_OPERATOR_INTENT.NOT_REQUESTED);
}

function normalizeApexOsBuilderOperatorRiskTier(value = APEX_OS_BUILDER_OPERATOR_RISK_TIER.SOURCE_BACKED_PLAN) {
  return normalizeEnum(value, APEX_OS_BUILDER_OPERATOR_RISK_TIERS, APEX_OS_BUILDER_OPERATOR_RISK_TIER.SOURCE_BACKED_PLAN);
}

function builderSignals(description = "") {
  const normalized = lower(description);
  const apexContext = matchesAny(normalized, [/\b(apex hq|apex os|control room|ask apex|apex assistant|jarvis|private operator)\b/]);
  const repoContext = matchesAny(normalized, [/\b(repo|repository|source|codebase|files?|shared\/|server\/|src\/|docs\/|component|route|endpoint|api|frontend|backend|ui|ux|database|store)\b/]);
  const buildPhase = matchesAny(normalized, [/\b(build phase|next phase|roadmap phase|phase \d+[a-z]?|finish plan|living plan|canonical source|master plan|checkpoint|implementation plan)\b/]);
  const bug = matchesAny(normalized, [/\b(bug|error|broken|failing|failure|regression|not working|fix|debug|issue|problem|blocker|blocked)\b/]);
  const review = matchesAny(normalized, [/\b(review|audit|inspect|go through|permission review|code review|risk review|qa review|source-backed)\b/]);
  const implementation = matchesAny(normalized, [/\b(implement|build|change|edit|modify|patch|wire|add|create|update|refactor|feature|handler|helper|utility|component)\b/]);
  const frontend = matchesAny(normalized, [/\b(frontend|front end|ui|ux|component|components|jsx|css|layout|mobile|desktop layout|visual|control room)\b/]);
  const backend = matchesAny(normalized, [/\b(backend|back end|server|route|endpoint|api|handler|store|shared helper|utility|node)\b/]);
  const qa = matchesAny(normalized, [/\b(test|tests|validation|validate|qa|browser qa|mobile qa|desktop qa|visual check|build passes|npm|playwright|role check|regression)\b/]);
  const release = matchesAny(normalized, [/\b(release|deploy|deployment|rollback|production|prod|fly|vercel|health check|smoke test|commit|push|branch|stash|checkpoint)\b/]);
  const schemaAuth = matchesAny(normalized, [/\b(schema|migration|database migration|auth|session|role|permission|operator-only|access gate|provider)\b/]);
  const customerVisible = matchesAny(normalized, [/\b(customer-visible|customer facing|public|field user|field users|demo user|demo users|contractor-facing|customer access|field access)\b/]);
  const docs = matchesAny(normalized, [/\b(docs?|documentation|roadmap|canonical|living finish plan|agents\.md|source of truth|readme)\b/]);
  const planningOnly = matchesAny(normalized, [/\b(plan|draft|design|requirements?|readiness|architecture|checklist|what would|how would|prepare|future|review package|work package|safe next)\b/]);
  const negatedExecution = matchesAny(normalized, [/\b(do not|don't|dont|never|no|without)\b.{0,100}\b(edit|change|modify|run|test|build|commit|push|deploy|rollback|execute|open|click|type|control|touch production|send|spend|order|book)\b/]);
  const executionRequest = matchesAny(normalized, [
    /\b(run|execute|start|launch)\b.{0,80}\b(agent|subagent|tool|plugin|script|test|tests|build|browser|qa|workflow)\b/,
    /\b(edit|change|modify|patch|write|create|delete)\b.{0,80}\b(file|code|source|component|route|endpoint|handler|schema|auth|session|database)\b/,
    /\b(commit|push|branch|stash|checkout|merge|pull request|pr)\b/,
  ]);
  const productionExecution = matchesAny(normalized, [/\b(deploy|rollback|release to production|ship to prod|touch production|production data|prod data)\b/]);
  const forbidden = matchesAny(normalized, [
    /\b(hidden|silent|secret|without (?:telling|asking|consent|approval|permission)|don't tell|do not tell)\b/,
    /\b(bypass|skip|circumvent|disable|remove|weaken|loosen)\b.{0,70}\b(approval|permission|operator-only|auth|session|role|security|gate|guardrail)\b/,
    /\b(open|read|print|show|display|reveal|expose|copy|save|store)\b.{0,80}\b(\.env|env file|api[_ -]?key|secret|token|cookie|session|database url|db url|credential|password|private key)\b/,
    /\bmake\b.{0,80}\b(apex os|private assistant|jarvis)\b.{0,80}\b(field|customer|demo|contractor|public)\b/,
  ]);
  const requested = (apexContext && (buildPhase || bug || review || implementation || qa || release || schemaAuth || customerVisible || docs))
    || (repoContext && (buildPhase || bug || review || implementation || qa || release || schemaAuth || customerVisible || docs))
    || /\b(apex hq builder|builder operator|builder\/operator|apex hq operator agent|app builder|code awareness|source-backed build)\b/i.test(normalized);

  return Object.freeze({
    requested,
    apexContext,
    repoContext,
    buildPhase,
    bug,
    review,
    implementation,
    frontend,
    backend,
    qa,
    release,
    schemaAuth,
    customerVisible,
    docs,
    planningOnly,
    negatedExecution,
    executionRequest,
    productionExecution,
    forbidden,
  });
}

function workstreamTagsForSignals(signals = {}) {
  return [
    signals.buildPhase ? "roadmap-phase" : "",
    signals.bug ? "bug-triage" : "",
    signals.review ? "review" : "",
    signals.implementation ? "implementation" : "",
    signals.qa ? "qa-validation" : "",
    signals.release ? "release-readiness" : "",
    signals.schemaAuth ? "schema-auth-permissions" : "",
    signals.customerVisible ? "customer-visible-safety" : "",
    signals.docs ? "docs-roadmap" : "",
  ].filter(Boolean).slice(0, 9);
}

function surfaceForSignals(signals = {}) {
  const surfaces = [
    signals.apexContext ? APEX_OS_BUILDER_OPERATOR_SURFACE.APEX_HQ : "",
    signals.repoContext ? APEX_OS_BUILDER_OPERATOR_SURFACE.SOURCE_CONTEXT : "",
    signals.frontend ? APEX_OS_BUILDER_OPERATOR_SURFACE.FRONTEND_UI : "",
    signals.backend ? APEX_OS_BUILDER_OPERATOR_SURFACE.BACKEND_API : "",
    signals.schemaAuth ? APEX_OS_BUILDER_OPERATOR_SURFACE.PERMISSIONS : "",
    signals.qa ? APEX_OS_BUILDER_OPERATOR_SURFACE.QA_TESTS : "",
    signals.release ? APEX_OS_BUILDER_OPERATOR_SURFACE.RELEASE : "",
    signals.docs ? APEX_OS_BUILDER_OPERATOR_SURFACE.DOCS_ROADMAP : "",
  ].filter(Boolean);
  const unique = [...new Set(surfaces)];
  if (!signals.requested) return APEX_OS_BUILDER_OPERATOR_SURFACE.NONE;
  if (unique.length > 1) return APEX_OS_BUILDER_OPERATOR_SURFACE.MULTI;
  return unique[0] || APEX_OS_BUILDER_OPERATOR_SURFACE.APEX_HQ;
}

export function detectApexOsBuilderOperatorIntent(description = "") {
  const signals = builderSignals(description);
  const workstreamTags = workstreamTagsForSignals(signals);
  let intent = APEX_OS_BUILDER_OPERATOR_INTENT.NOT_REQUESTED;
  let riskTier = APEX_OS_BUILDER_OPERATOR_RISK_TIER.SOURCE_BACKED_PLAN;
  const surface = surfaceForSignals(signals);

  if (!signals.requested) {
    return Object.freeze({
      requested: false,
      intent,
      riskTier,
      surface,
      workstreamTags,
      signals,
    });
  }

  if (signals.forbidden) {
    intent = APEX_OS_BUILDER_OPERATOR_INTENT.FORBIDDEN;
    riskTier = APEX_OS_BUILDER_OPERATOR_RISK_TIER.FORBIDDEN;
  } else if (signals.productionExecution) {
    intent = APEX_OS_BUILDER_OPERATOR_INTENT.PRODUCTION_DEPLOY_PLAN;
    riskTier = APEX_OS_BUILDER_OPERATOR_RISK_TIER.PRODUCTION_DEPLOY_PLAN;
  } else if (signals.schemaAuth) {
    intent = APEX_OS_BUILDER_OPERATOR_INTENT.SCHEMA_AUTH_SAFETY_PLAN;
    riskTier = APEX_OS_BUILDER_OPERATOR_RISK_TIER.SCHEMA_AUTH_PLAN;
  } else if (signals.customerVisible) {
    intent = APEX_OS_BUILDER_OPERATOR_INTENT.CUSTOMER_VISIBLE_SAFETY_PLAN;
    riskTier = APEX_OS_BUILDER_OPERATOR_RISK_TIER.CUSTOMER_VISIBLE_PLAN;
  } else if (signals.release) {
    intent = APEX_OS_BUILDER_OPERATOR_INTENT.RELEASE_READINESS_PLAN;
    riskTier = APEX_OS_BUILDER_OPERATOR_RISK_TIER.RELEASE_PLAN;
  } else if (signals.qa) {
    intent = APEX_OS_BUILDER_OPERATOR_INTENT.QA_VALIDATION_PLAN;
    riskTier = APEX_OS_BUILDER_OPERATOR_RISK_TIER.QA_TEST_PLAN;
  } else if (signals.bug) {
    intent = APEX_OS_BUILDER_OPERATOR_INTENT.BUG_TRIAGE_PLAN;
    riskTier = APEX_OS_BUILDER_OPERATOR_RISK_TIER.BUG_TRIAGE_PLAN;
  } else if (signals.review) {
    intent = APEX_OS_BUILDER_OPERATOR_INTENT.CODE_REVIEW_PLAN;
    riskTier = APEX_OS_BUILDER_OPERATOR_RISK_TIER.SOURCE_BACKED_PLAN;
  } else if (signals.implementation) {
    intent = APEX_OS_BUILDER_OPERATOR_INTENT.IMPLEMENTATION_WORK_PACKAGE;
    riskTier = APEX_OS_BUILDER_OPERATOR_RISK_TIER.IMPLEMENTATION_PLAN;
  } else if (workstreamTags.length > 1) {
    intent = APEX_OS_BUILDER_OPERATOR_INTENT.MULTI_WORKSTREAM_PLAN;
    riskTier = APEX_OS_BUILDER_OPERATOR_RISK_TIER.IMPLEMENTATION_PLAN;
  } else {
    intent = APEX_OS_BUILDER_OPERATOR_INTENT.BUILD_PHASE_PLAN;
    riskTier = APEX_OS_BUILDER_OPERATOR_RISK_TIER.SOURCE_BACKED_PLAN;
  }

  return Object.freeze({
    requested: true,
    intent,
    riskTier,
    surface,
    workstreamTags,
    signals,
  });
}

function riskNeedsApproval(riskTier = APEX_OS_BUILDER_OPERATOR_RISK_TIER.SOURCE_BACKED_PLAN) {
  return [
    APEX_OS_BUILDER_OPERATOR_RISK_TIER.IMPLEMENTATION_PLAN,
    APEX_OS_BUILDER_OPERATOR_RISK_TIER.QA_TEST_PLAN,
    APEX_OS_BUILDER_OPERATOR_RISK_TIER.RELEASE_PLAN,
    APEX_OS_BUILDER_OPERATOR_RISK_TIER.CUSTOMER_VISIBLE_PLAN,
    APEX_OS_BUILDER_OPERATOR_RISK_TIER.SCHEMA_AUTH_PLAN,
    APEX_OS_BUILDER_OPERATOR_RISK_TIER.PRODUCTION_DEPLOY_PLAN,
  ].includes(riskTier);
}

function planStateFromSafety({ intent = {}, actionPermissionSummary = {}, privacyFirewallSummary = {}, untrustedContentFirewallSummary = {} } = {}) {
  const untrustedRiskLevel = normalizeApexOsPromptInjectionRisk(untrustedContentFirewallSummary.highestRiskLevel || APEX_OS_PROMPT_INJECTION_RISK.NONE);
  const untrustedBlocked = shouldBlockApexOsUntrustedRoute({
    ...untrustedContentFirewallSummary,
    highestRiskLevel: untrustedRiskLevel,
  });

  if (!intent.requested) return APEX_OS_BUILDER_OPERATOR_PLAN_STATE.NOT_REQUESTED;
  if (intent.riskTier === APEX_OS_BUILDER_OPERATOR_RISK_TIER.FORBIDDEN || actionPermissionSummary.forbidden) return APEX_OS_BUILDER_OPERATOR_PLAN_STATE.FORBIDDEN;
  if (privacyFirewallSummary.blockedCount > 0 || privacyFirewallSummary.actions?.includes(APEX_OS_PRIVACY_ACTION.BLOCK)) return APEX_OS_BUILDER_OPERATOR_PLAN_STATE.BLOCKED_BY_PRIVACY;
  if (privacyFirewallSummary.approvalRequiredCount > 0 || privacyFirewallSummary.actions?.includes(APEX_OS_PRIVACY_ACTION.APPROVAL_REQUIRED)) return APEX_OS_BUILDER_OPERATOR_PLAN_STATE.BLOCKED_BY_PRIVACY;
  if (untrustedBlocked) return APEX_OS_BUILDER_OPERATOR_PLAN_STATE.BLOCKED_BY_UNTRUSTED_CONTENT;
  const safePlanningOnly = intent.signals?.planningOnly
    && (intent.signals?.negatedExecution || !intent.signals?.executionRequest)
    && !intent.signals?.productionExecution;
  if (
    (riskNeedsApproval(intent.riskTier) && !safePlanningOnly)
    || (actionPermissionSummary.requiresApproval && !safePlanningOnly)
    || ([
      APEX_OS_ACTION_RISK_TIER.APPROVAL_REQUIRED,
      APEX_OS_ACTION_RISK_TIER.EXTERNAL_ACTION,
      APEX_OS_ACTION_RISK_TIER.HIGH_RISK,
    ].includes(actionPermissionSummary.riskTier) && !safePlanningOnly)
    || ([
      APEX_OS_ACTION_DOMAIN.FILES,
      APEX_OS_ACTION_DOMAIN.DESKTOP,
      APEX_OS_ACTION_DOMAIN.BROWSER,
      APEX_OS_ACTION_DOMAIN.PRODUCTION,
      APEX_OS_ACTION_DOMAIN.DEPLOYMENT,
      APEX_OS_ACTION_DOMAIN.AUTH,
      APEX_OS_ACTION_DOMAIN.SCHEMA,
      APEX_OS_ACTION_DOMAIN.BILLING,
      APEX_OS_ACTION_DOMAIN.MESSAGING,
      APEX_OS_ACTION_DOMAIN.EMAIL,
      APEX_OS_ACTION_DOMAIN.CALENDAR,
      APEX_OS_ACTION_DOMAIN.ORDERING,
      APEX_OS_ACTION_DOMAIN.BOOKING,
    ].includes(actionPermissionSummary.domain) && !safePlanningOnly)
  ) {
    return APEX_OS_BUILDER_OPERATOR_PLAN_STATE.APPROVAL_REQUIRED;
  }
  return APEX_OS_BUILDER_OPERATOR_PLAN_STATE.PLANNED;
}

function traceStatusForPlanState(planState = APEX_OS_BUILDER_OPERATOR_PLAN_STATE.NOT_REQUESTED) {
  if (planState === APEX_OS_BUILDER_OPERATOR_PLAN_STATE.NOT_REQUESTED) return APEX_OS_TRACE_STATUS.SKIPPED;
  if (planState === APEX_OS_BUILDER_OPERATOR_PLAN_STATE.FORBIDDEN) return APEX_OS_TRACE_STATUS.FORBIDDEN;
  if ([APEX_OS_BUILDER_OPERATOR_PLAN_STATE.BLOCKED_BY_PRIVACY, APEX_OS_BUILDER_OPERATOR_PLAN_STATE.BLOCKED_BY_UNTRUSTED_CONTENT].includes(planState)) return APEX_OS_TRACE_STATUS.BLOCKED;
  if (planState === APEX_OS_BUILDER_OPERATOR_PLAN_STATE.APPROVAL_REQUIRED) return APEX_OS_TRACE_STATUS.APPROVAL_REQUIRED;
  return APEX_OS_TRACE_STATUS.COMPLETED;
}

function actionDomainForIntent(intent = {}) {
  if (intent.riskTier === APEX_OS_BUILDER_OPERATOR_RISK_TIER.PRODUCTION_DEPLOY_PLAN) return APEX_OS_ACTION_DOMAIN.DEPLOYMENT;
  if (intent.riskTier === APEX_OS_BUILDER_OPERATOR_RISK_TIER.SCHEMA_AUTH_PLAN) return APEX_OS_ACTION_DOMAIN.AUTH;
  if (intent.riskTier === APEX_OS_BUILDER_OPERATOR_RISK_TIER.QA_TEST_PLAN) return APEX_OS_ACTION_DOMAIN.APEX_HQ;
  if (intent.riskTier === APEX_OS_BUILDER_OPERATOR_RISK_TIER.IMPLEMENTATION_PLAN) return APEX_OS_ACTION_DOMAIN.FILES;
  return APEX_OS_ACTION_DOMAIN.APEX_HQ;
}

export function planApexOsBuilderOperator(input = {}) {
  const description = text(input.description || input.question || input.request || "", TEXT_LIMIT);
  const intent = detectApexOsBuilderOperatorIntent(description);
  const actionPermissionSummary = actionPermissionSummaryFromInput(description, input);
  const privacyFirewallSummary = privacySummaryFromInput(description, input);
  const untrustedContentFirewallSummary = untrustedContentSummaryFromInput(input);
  const planState = normalizeApexOsBuilderOperatorPlanState(planStateFromSafety({
    intent,
    actionPermissionSummary,
    privacyFirewallSummary,
    untrustedContentFirewallSummary,
  }));
  const approvalRequired = planState === APEX_OS_BUILDER_OPERATOR_PLAN_STATE.APPROVAL_REQUIRED;
  const blocked = [
    APEX_OS_BUILDER_OPERATOR_PLAN_STATE.BLOCKED_BY_PRIVACY,
    APEX_OS_BUILDER_OPERATOR_PLAN_STATE.BLOCKED_BY_UNTRUSTED_CONTENT,
  ].includes(planState);
  const forbidden = planState === APEX_OS_BUILDER_OPERATOR_PLAN_STATE.FORBIDDEN;
  const traceMetadata = createApexOsTraceEntry({
    eventType: APEX_OS_TRACE_EVENT_TYPE.TOOL_ROUTE,
    source: APEX_OS_TRACE_SOURCE.TOOL_ROUTER,
    status: traceStatusForPlanState(planState),
    route: "apex-hq-builder-operator-planning",
    modelTier: "deterministic",
    actionDomain: actionDomainForIntent(intent),
    riskTier: intent.riskTier,
    approvalRequired,
    forbidden,
    canExecuteNow: false,
    skillId: "apex-hq-builder-operator-agent",
    reasonCode: `builder-operator-${planState}`,
    safeMessage: "Phase 10 Apex HQ builder/operator plan created as content-free metadata; no agent execution, file edit, test run, git action, browser/desktop action, deploy, production mutation, or external action path was created.",
  });

  return Object.freeze({
    phase: APEX_OS_BUILDER_OPERATOR_PHASE,
    plannerId: "apex-os-builder-operator-planning",
    requested: Boolean(intent.requested),
    planState,
    intent: normalizeApexOsBuilderOperatorIntent(intent.intent),
    riskTier: normalizeApexOsBuilderOperatorRiskTier(intent.riskTier),
    surface: text(intent.surface || APEX_OS_BUILDER_OPERATOR_SURFACE.NONE, 60),
    workstreamTags: (intent.workstreamTags || []).map((entry) => text(entry, 50)).filter(Boolean).slice(0, 9),
    operatorOnly: true,
    planningOnly: true,
    reviewFirst: true,
    sourceBackedRequired: true,
    canPlanNow: [APEX_OS_BUILDER_OPERATOR_PLAN_STATE.PLANNED, APEX_OS_BUILDER_OPERATOR_PLAN_STATE.APPROVAL_REQUIRED].includes(planState),
    canPrepareWorkPackage: [APEX_OS_BUILDER_OPERATOR_PLAN_STATE.PLANNED, APEX_OS_BUILDER_OPERATOR_PLAN_STATE.APPROVAL_REQUIRED].includes(planState),
    agentExecutionEnabled: false,
    codeEditEnabled: false,
    fileWriteEnabled: false,
    testRunEnabled: false,
    buildCommandEnabled: false,
    gitOperationEnabled: false,
    browserQaEnabled: false,
    desktopControlEnabled: false,
    deployEnabled: false,
    productionMutationEnabled: false,
    schemaAuthChangeEnabled: false,
    providerChangeEnabled: false,
    customerVisibleChangeEnabled: false,
    connectorExecutionEnabled: false,
    endpointEnabled: false,
    uiActivationEnabled: false,
    canExecuteNow: false,
    executionLocked: true,
    approvalRequired,
    blocked,
    forbidden,
    privacyFirewallRequired: true,
    untrustedContentFirewallRequired: true,
    requiredPreconditions: REQUIRED_PRECONDITIONS,
    planStepIds: PLAN_STEP_IDS,
    blockedActionIds: BLOCKED_ACTION_IDS,
    safeAlternative: text(approvalRequired
      ? "I can prepare a private source-backed work package, validation checklist, rollback plan, and approval packet, then wait before any agent execution, code edit, test run, git action, browser/desktop action, deploy, production mutation, schema/auth change, or customer-visible change."
      : "I can draft the next Apex HQ builder/operator work package and stop before code, tests, git, browser/desktop, deploy, production, schema/auth, customer-visible, connector, or tool execution.",
    SUMMARY_LIMIT),
    traceMetadata,
  });
}

export function buildApexOsBuilderOperatorSummary(value = {}, options = {}) {
  const plan = value?.plannerId ? value : planApexOsBuilderOperator(value);
  const includeLists = Boolean(options.includeLists);
  const requested = Boolean(plan.requested);
  const planState = normalizeApexOsBuilderOperatorPlanState(plan.planState);
  const intent = normalizeApexOsBuilderOperatorIntent(plan.intent);
  const riskTier = normalizeApexOsBuilderOperatorRiskTier(plan.riskTier);
  const workstreamTags = (Array.isArray(plan.workstreamTags) ? plan.workstreamTags : []).map((entry) => text(entry, 50)).filter(Boolean).slice(0, 9);
  const summaryText = requested
    ? `${planState}; intent=${intent}; risk=${riskTier}; surface=${plan.surface}; workstreams=${workstreamTags.join("|") || "none"}; agentExecutionEnabled=false; codeEditEnabled=false; testRunEnabled=false; gitOperationEnabled=false; deployEnabled=false; canExecuteNow=false; executionLocked=true`
    : "not-requested; agentExecutionEnabled=false; codeEditEnabled=false; testRunEnabled=false; gitOperationEnabled=false; deployEnabled=false; canExecuteNow=false; executionLocked=true";

  return Object.freeze({
    phase: APEX_OS_BUILDER_OPERATOR_PHASE,
    plannerId: "apex-os-builder-operator-planning",
    requested,
    planState,
    intent,
    riskTier,
    surface: text(plan.surface || APEX_OS_BUILDER_OPERATOR_SURFACE.NONE, 60),
    workstreamTags,
    operatorOnly: true,
    planningOnly: true,
    reviewFirst: true,
    sourceBackedRequired: true,
    canPlanNow: Boolean(plan.canPlanNow),
    canPrepareWorkPackage: Boolean(plan.canPrepareWorkPackage),
    agentExecutionEnabled: false,
    codeEditEnabled: false,
    fileWriteEnabled: false,
    testRunEnabled: false,
    buildCommandEnabled: false,
    gitOperationEnabled: false,
    browserQaEnabled: false,
    desktopControlEnabled: false,
    deployEnabled: false,
    productionMutationEnabled: false,
    schemaAuthChangeEnabled: false,
    providerChangeEnabled: false,
    customerVisibleChangeEnabled: false,
    connectorExecutionEnabled: false,
    endpointEnabled: false,
    uiActivationEnabled: false,
    approvalRequired: Boolean(plan.approvalRequired),
    blocked: Boolean(plan.blocked),
    forbidden: Boolean(plan.forbidden),
    canExecuteNow: false,
    executionLocked: true,
    privacyFirewallRequired: true,
    untrustedContentFirewallRequired: true,
    storesRawPrompt: false,
    storesRawResponse: false,
    storesRawMessages: false,
    storesRawSource: false,
    storesSecrets: false,
    storesEnvValues: false,
    storesProductionData: false,
    ...(includeLists ? {
      requiredPreconditions: plan.requiredPreconditions || REQUIRED_PRECONDITIONS,
      planStepIds: plan.planStepIds || PLAN_STEP_IDS,
      blockedActionIds: plan.blockedActionIds || BLOCKED_ACTION_IDS,
    } : {}),
    safeSummary: text(requested
      ? `Phase 10 Apex HQ builder/operator request classified as ${planState}/${intent}. It is operator-only, source-backed, review-first, and non-executing; no agent execution, code edit, file write, test run, git operation, browser/desktop action, deploy, production mutation, schema/auth change, customer-visible change, connector, tool, or plugin execution is enabled.`
      : "Phase 10 Apex HQ builder/operator planning is available for private source-backed work packages only; no agent execution, code edit, test run, git operation, deploy, production mutation, schema/auth change, customer-visible change, connector, tool, or plugin execution is enabled.",
    SUMMARY_LIMIT),
    summaryText: text(summaryText, SUMMARY_LIMIT),
  });
}
