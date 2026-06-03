const STATUS_LABELS = Object.freeze({
  "??": "untracked",
  A: "added",
  C: "copied",
  D: "deleted",
  M: "modified",
  R: "renamed",
  T: "type changed",
  U: "unmerged",
});

export const APEX_OS_BUILD_SOURCE_LINKS = Object.freeze([
  {
    id: "repo-contract",
    title: "Repo operating contract",
    path: "AGENTS.md",
    detail: "Project identity, phase gates, field-role protection, approvals, and release report rules.",
  },
  {
    id: "master-plan",
    title: "Apex OS master plan",
    path: "docs/APEX_HQ_APEX_OS_COMMAND_CENTER_MASTER_PLAN.md",
    detail: "Original phase requirements and non-goals for Apex OS.",
  },
  {
    id: "living-plan",
    title: "Living finish plan",
    path: "docs/APEX_HQ_LIVING_FINISH_PLAN.md",
    detail: "Current phase memory, release log, and deploy evidence.",
  },
  {
    id: "hard-roadmap",
    title: "Hard-finish roadmap",
    path: "docs/APEX_HQ_APEX_OS_HARD_FINISH_ROADMAP.md",
    detail: "Phase-by-phase hardening plan and blocked items.",
  },
  {
    id: "control-room-utils",
    title: "Control Room state",
    path: "src/apex-control-room-utils.js",
    detail: "Apex OS derived state, release monitoring, and safe task recommendations.",
  },
  {
    id: "control-room-ui",
    title: "Control Room UI",
    path: "src/apex-control-room-components.jsx",
    detail: "Private operator UI panels and locked controls.",
  },
]);

export const APEX_OS_BUILD_AWARENESS_LOCKS = Object.freeze([
  {
    id: "read-only",
    title: "Read-only build awareness",
    status: "Locked",
    detail: "This endpoint reads git, docs, build artifacts, and runtime metadata only; it cannot edit files or run commands beyond safe status reads.",
    tone: "amber",
  },
  {
    id: "no-execution",
    title: "No UI execution",
    status: "Locked",
    detail: "Apex OS can recommend the next safe task, but Codex/tooling still performs code, test, git, deploy, and rollback work.",
    tone: "amber",
  },
  {
    id: "no-field-data",
    title: "No field data",
    status: "Locked",
    detail: "Build awareness never includes leads, estimates, pricing, payroll, jobs, uploads, customers, or field-private records.",
    tone: "amber",
  },
]);

function cleanText(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function firstMatch(text = "", pattern, fallback = "") {
  const match = String(text || "").match(pattern);
  return cleanText(match?.[1] || fallback);
}

export function sanitizeApexOsFileReference(value = "") {
  const normalized = String(value || "").replace(/\\/g, "/").trim();
  if (!normalized || normalized.includes("\0")) return "";
  if (normalized.startsWith("/") || /^[a-z]:/i.test(normalized)) return "";
  const parts = normalized.split("/").filter(Boolean);
  if (!parts.length || parts.some((part) => part === "." || part === "..")) return "";
  return parts.join("/");
}

function statusLabel(code = "") {
  const normalized = String(code || "").trim();
  if (normalized === "??") return STATUS_LABELS["??"];
  const labels = [...new Set(normalized.split("").map((letter) => STATUS_LABELS[letter]).filter(Boolean))];
  return labels.join(" / ") || "changed";
}

export function parseGitStatusPorcelain(text = "") {
  return String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line) => {
      const code = line.slice(0, 2);
      const rawPath = line.slice(3).trim();
      const targetPath = rawPath.includes(" -> ") ? rawPath.split(" -> ").pop() : rawPath;
      const path = sanitizeApexOsFileReference(targetPath);
      if (!path) return null;
      return {
        id: `${code.trim() || "changed"}:${path}`,
        path,
        statusCode: code.trim() || "changed",
        status: statusLabel(code),
        staged: code[0] && code[0] !== " " && code[0] !== "?",
        worktree: code[1] && code[1] !== " " && code[1] !== "?",
        tracked: code.trim() !== "??",
        sourceLabel: "git status --porcelain",
      };
    })
    .filter(Boolean);
}

export function parseGitLogOneline(text = "") {
  return String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 8)
    .map((line) => {
      const [sha = "", ...messageParts] = line.split(/\s+/);
      return {
        id: sha,
        title: messageParts.join(" ") || "Commit",
        status: sha,
        detail: line,
        tone: "blue",
        sourceLabel: "git log --oneline",
      };
    });
}

export function extractApexOsFrozenPhaseRows(livingPlanText = "") {
  const text = String(livingPlanText || "");
  return Array.from({ length: 11 }, (_, index) => index + 1).map((phase) => {
    const line = firstMatch(text, new RegExp(`(- Apex OS Phase ${phase}[^\\n]+)`, "i"));
    const deployed = /hard-finished and deployed/i.test(line);
    const local = /hard-finished locally|release-ready/i.test(line);
    const implemented = /implemented locally|folded into/i.test(line);
    return {
      id: `phase-${phase}`,
      title: `Phase ${phase}`,
      status: deployed ? "Deployed" : local ? "Release ready" : implemented ? "Local" : "Pending audit",
      detail: line || "No current living-plan completion line found yet.",
      tone: deployed ? "green" : local || implemented ? "blue" : "slate",
      sourceLabel: "docs/APEX_HQ_LIVING_FINISH_PLAN.md",
    };
  });
}

export function extractLatestApexOsDeployEvidence(livingPlanText = "") {
  const text = String(livingPlanText || "");
  const line = firstMatch(text, /(- Apex OS Phase \d+ production release[^\n]+)/i);
  const version = firstMatch(line, /version `?(\d+)`?/i);
  const image = firstMatch(line, /image `([^`]+)`/i);
  const commit = firstMatch(line, /commit `([^`]+)`/i);
  return {
    id: "latest-apex-os-release",
    title: "Latest Apex OS release evidence",
    status: version ? `v${version}` : "Not found",
    detail: line || "No Apex OS production release evidence was parsed from the living finish plan.",
    tone: line ? "green" : "amber",
    commit,
    version,
    image,
    sourceLabel: "docs/APEX_HQ_LIVING_FINISH_PLAN.md",
  };
}

export function buildApexOsBuildAwarenessSnapshot({
  branch = "",
  headSha = "",
  gitAvailable = false,
  gitStatusText = "",
  gitError = "",
  recentCommitsText = "",
  distAssets = [],
  packageScripts = {},
  docs = {},
  runtime = {},
  collectedAt = new Date().toISOString(),
} = {}) {
  const changedFiles = parseGitStatusPorcelain(gitStatusText);
  const recentCommits = parseGitLogOneline(recentCommitsText);
  const frozenPhaseRows = extractApexOsFrozenPhaseRows(docs.livingPlan || "");
  const latestDeploy = extractLatestApexOsDeployEvidence(docs.livingPlan || "");
  const buildScript = packageScripts.build ? "npm.cmd run build" : "Build script missing";
  const testScriptCount = Object.keys(packageScripts).filter((key) => key.startsWith("verify:") || key === "test").length;
  const phaseNineRow = frozenPhaseRows.find((row) => row.id === "phase-9");
  const dirtyCount = changedFiles.length;
  const knownBlockers = [
    dirtyCount ? {
      id: "dirty-worktree",
      title: "Changed files present",
      status: `${dirtyCount} files`,
      detail: "Review the changed files and stage exact paths only before any commit, push, or deploy.",
      tone: "amber",
      sourceLabel: "git status --porcelain",
    } : null,
    !gitAvailable ? {
      id: "git-unavailable",
      title: "Git metadata unavailable",
      status: "Runtime only",
      detail: gitError || "The runtime could not read git metadata. This is expected inside production images that do not include .git.",
      tone: runtime?.environment === "production" ? "blue" : "amber",
      sourceLabel: "server build awareness collector",
    } : null,
    /Production auth smoke\/login was not run/i.test(docs.livingPlan || "") ? {
      id: "production-auth-smoke",
      title: "Production auth smoke",
      status: "Not run",
      detail: "Recent release evidence explicitly says production auth smoke/login was not run; use hosted skip-auth and API safety checks unless credentials are approved.",
      tone: "amber",
      sourceLabel: "docs/APEX_HQ_LIVING_FINISH_PLAN.md",
    } : null,
  ].filter(Boolean);
  const nextSafeTask = dirtyCount
    ? "Review current changed files, keep unrelated files unstaged, run focused tests, then commit exact paths before any deploy."
    : phaseNineRow?.status === "Deployed"
      ? "Move to Phase 10 only after Phase 9 release evidence is committed and pushed."
      : "Finish Phase 9 App Build and Code Awareness, validate it, document it, commit, push, and deploy before Phase 10.";
  const buildArtifactStatus = distAssets.length ? `${distAssets.length} dist assets` : "No dist artifact list";
  return {
    collectedAt,
    status: gitAvailable ? (dirtyCount ? "Local changes present" : "Workspace clean") : "Runtime metadata only",
    tone: gitAvailable ? (dirtyCount ? "amber" : "green") : "blue",
    branch: cleanText(branch) || "Unavailable",
    headSha: cleanText(headSha) || "Unavailable",
    gitAvailable: Boolean(gitAvailable),
    changedFileCount: dirtyCount,
    changedFiles: changedFiles.slice(0, 24),
    recentCommits,
    buildStatus: {
      id: "build-script",
      title: "Build script",
      status: packageScripts.build ? "Available" : "Missing",
      detail: `${buildScript}; ${buildArtifactStatus}.`,
      tone: packageScripts.build ? "green" : "amber",
      sourceLabel: "package.json + dist/",
    },
    testStatus: {
      id: "test-scripts",
      title: "Verification scripts",
      status: `${testScriptCount} scripts`,
      detail: `${testScriptCount} verify/test scripts are declared in package.json; recent phase release evidence remains the source of truth for what actually ran.`,
      tone: testScriptCount ? "green" : "amber",
      sourceLabel: "package.json",
    },
    latestDeploy,
    knownBlockers,
    frozenPhaseRows,
    sourceLinks: APEX_OS_BUILD_SOURCE_LINKS.map((row) => ({ ...row, path: sanitizeApexOsFileReference(row.path) })),
    lockRows: APEX_OS_BUILD_AWARENESS_LOCKS.map((row) => ({ ...row })),
    nextSafeTask: {
      id: "next-safe-task",
      title: "Start next safe task",
      status: dirtyCount ? "Review changes first" : "Ready",
      detail: nextSafeTask,
      tone: dirtyCount ? "amber" : "green",
      sourceLabel: dirtyCount ? "git status --porcelain" : "Apex OS phase rule",
    },
    runtime: {
      environment: cleanText(runtime.environment) || "local",
      flyApp: cleanText(runtime.flyApp),
      flyMachineId: cleanText(runtime.flyMachineId),
      nodeEnv: cleanText(runtime.nodeEnv),
    },
    canExecute: false,
    executionLocked: true,
    fieldDataIncluded: false,
  };
}

export function restrictedApexOsBuildAwarenessSnapshot() {
  return {
    collectedAt: new Date().toISOString(),
    status: "Restricted",
    tone: "slate",
    branch: "Restricted",
    headSha: "Restricted",
    gitAvailable: false,
    changedFileCount: 0,
    changedFiles: [],
    recentCommits: [],
    buildStatus: { id: "restricted", title: "Build awareness", status: "Restricted", detail: "Private operator access is required.", tone: "slate" },
    testStatus: { id: "restricted-tests", title: "Test awareness", status: "Restricted", detail: "Private operator access is required.", tone: "slate" },
    latestDeploy: { id: "restricted-release", title: "Release evidence", status: "Restricted", detail: "Private operator access is required.", tone: "slate" },
    knownBlockers: [],
    frozenPhaseRows: [],
    sourceLinks: [],
    lockRows: APEX_OS_BUILD_AWARENESS_LOCKS.map((row) => ({ ...row })),
    nextSafeTask: { id: "restricted-next", title: "Start next safe task", status: "Restricted", detail: "Private operator access is required.", tone: "slate" },
    runtime: {},
    canExecute: false,
    executionLocked: true,
    fieldDataIncluded: false,
  };
}
