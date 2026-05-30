function asBool(value) {
  return Boolean(value);
}

function text(value, fallback = "") {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
}

function gate(id, label, ready, detail, blockers = [], evidence = []) {
  const normalizedBlockers = blockers.map((item) => text(item)).filter(Boolean);
  const normalizedEvidence = evidence.map((item) => text(item)).filter(Boolean);
  return {
    id,
    label,
    ready: asBool(ready) && normalizedBlockers.length === 0,
    status: asBool(ready) && normalizedBlockers.length === 0 ? "Ready" : "Blocked",
    tone: asBool(ready) && normalizedBlockers.length === 0 ? "green" : "amber",
    detail: text(detail, "Review launch readiness evidence before continuing."),
    blockers: normalizedBlockers,
    evidence: normalizedEvidence,
  };
}

export function deriveLaunchReadinessEvidenceState(input = {}) {
  const launchGate = input.launchGate || {};
  const publicLaunch = input.publicLaunch || {};
  const productionRelease = input.productionRelease || {};
  const productionAuth = input.productionAuth || {};
  const monitoring = input.monitoring || {};
  const support = input.support || {};
  const legal = input.legal || {};
  const backup = input.backup || {};

  const gates = [
    gate(
      "guided-demo",
      "Guided demo / controlled pilot",
      launchGate.guidedDemoReady,
      "Guided demos can continue when claims are clean and pilot handoff stays supervised.",
      launchGate.guidedDemoReady ? [] : ["Run launch:gate-status and resolve guided-demo blockers."],
      ["launch:gate-status", "verify:claims", "pilot:rehearsal"],
    ),
    gate(
      "backup-restore",
      "Backup / restore evidence",
      backup.backupVerified && backup.restoreVerified,
      "Launch evidence needs both backup creation and local restore drill proof.",
      [
        backup.backupVerified ? "" : "Run npm.cmd run verify:backup.",
        backup.restoreVerified ? "" : "Run npm.cmd run verify:restore.",
      ],
      ["verify:backup", "verify:restore", "docs/apex-hq-restore-runbook.md"],
    ),
    gate(
      "release-process",
      "Production release process",
      productionRelease.releaseProcessReady,
      "Production release gate must be backup-first, rollback-owned, and target-checked before deploy.",
      productionRelease.releaseProcessReady ? [] : ["Run launch:production-release-gate with verified local evidence and named owners before any production deploy."],
      ["launch:production-release-gate", "docs/apex-hq-release-rollback-checklist.md"],
    ),
    gate(
      "production-auth",
      "Production auth smoke readiness",
      productionAuth.workflowGuarded && !productionAuth.enabled,
      "Production auth smoke stays manual, fail-closed, and disabled until smoke users, secret, and approval exist.",
      productionAuth.workflowGuarded ? ["Production auth smoke is intentionally not enabled until approval."] : ["Run verify:production-auth-smoke-readiness and fix workflow guardrails."],
      ["verify:production-auth-smoke-readiness", "docs/apex-hq-production-auth-smoke-design.md"],
    ),
    gate(
      "monitoring",
      "Monitoring / alerting baseline",
      monitoring.baselineReady,
      "Monitoring evidence should prove /api/ready coverage, alert owner, and no sensitive payload capture.",
      monitoring.baselineReady ? [] : ["Run verify:monitoring and monitor:upgrade-readiness for the selected baseline."],
      ["verify:monitoring", "monitor:upgrade-readiness", "docs/apex-hq-monitoring-alerting-plan.md"],
    ),
    gate(
      "support",
      "Support / incident process",
      support.processReady,
      "Pilot launch needs support intake, severity, owner, workaround, and escalation boundaries.",
      support.processReady ? [] : ["Review support owner, severity matrix, and incident escalation path."],
      ["docs/apex-hq-support-intake-process.md", "Support Command Center"],
    ),
    gate(
      "legal-claims",
      "Legal / claims guardrails",
      legal.claimsVerified && !legal.legalApproved,
      "Claims can be scanned locally, but wider paid launch remains blocked until formal legal/privacy review.",
      [
        legal.claimsVerified ? "" : "Run npm.cmd run verify:claims.",
        legal.legalApproved ? "" : "Formal legal/privacy/public-claims review is still required before wider paid launch.",
      ],
      ["verify:claims", "docs/apex-hq-legal-review-prep-checklist.md"],
    ),
    gate(
      "public-launch",
      "Public self-serve launch",
      false,
      "Public signup/package/billing launch remains intentionally locked until separate approval.",
      [
        publicLaunch.publicLaunchApproved ? "" : "Do not enable broad public launch without PUBLIC_LAUNCH_SEPARATELY_APPROVED.",
        publicLaunch.selfServeReady ? "" : "Run public/self-serve readiness gates before any public launch decision.",
      ],
      ["launch:public-readiness", "launch:self-serve-readiness"],
    ),
  ];

  const readyCount = gates.filter((item) => item.ready).length;
  const blockedCount = gates.length - readyCount;
  const highestPriority = gates.find((item) => !item.ready) || gates[0];

  return {
    status: blockedCount ? "Launch locked" : "Launch evidence ready",
    tone: blockedCount ? "amber" : "green",
    readyCount,
    blockedCount,
    totalCount: gates.length,
    highestPriority,
    gates,
    hardLocks: [
      "No public signup enablement from this surface.",
      "No production auth smoke execution.",
      "No deploy, Fly config, secret, DNS, monitoring provider, backup restore, or production data mutation.",
      "No checkout, invoices, payment collection, or self-serve package changes.",
      "No wider paid launch claims until legal/privacy/public-claims review is recorded.",
    ],
  };
}

export function buildLaunchReadinessEvidencePacket(state = {}, options = {}) {
  const gates = Array.isArray(state.gates) ? state.gates : [];
  const hardLocks = Array.isArray(state.hardLocks) ? state.hardLocks : [];
  const lines = [
    "Apex HQ Launch Readiness Evidence Packet",
    "",
    `Workspace: ${text(options.companyName, "Apex HQ Workspace")}`,
    `Generated by: ${text(options.userName, "Owner/admin")}`,
    `Generated at: ${text(options.generatedAt, new Date().toISOString())}`,
    `Status: ${text(state.status, "Launch locked")}`,
    `Ready gates: ${Number(state.readyCount || 0)} of ${Number(state.totalCount || gates.length || 0)}`,
    "",
    "Gate evidence:",
    ...(gates.length
      ? gates.map((item) => {
          const blockers = item.blockers?.length ? ` Blockers: ${item.blockers.join(" | ")}` : "";
          const evidence = item.evidence?.length ? ` Evidence: ${item.evidence.join(", ")}` : "";
          return `- ${item.label}: ${item.status}. ${item.detail}${blockers}${evidence}`;
        })
      : ["- No launch gates available."]),
    "",
    "Hard locks:",
    ...(hardLocks.length ? hardLocks.map((item) => `- ${item}`) : ["- Keep launch review manual and approval-gated."]),
    "",
    "Manual note:",
    "This packet is copy-only. Apex HQ did not deploy, enable public signup, run production auth smoke, set secrets, configure providers, restore data, create billing, or mutate production.",
  ];

  return lines.join("\n");
}
