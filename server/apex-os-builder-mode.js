import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const OUTPUT_LIMIT = 4200;
const DEFAULT_TIMEOUT_MS = 45000;
const SECRET_LINE_PATTERN = /\b(password|passcode|api[_ -]?key|secret|token|bearer|cookie|session|mfa|captcha|database url|db url|connection string)\b/i;
const FORBIDDEN_FIX_REQUEST_PATTERN = /\b(deploy|production|schema|auth|session|delete|remove\s+file|destroy|drop\s+table|\.env|secret|token|password|api[_ -]?key|cookie|send|email|sms|spend|payment|charge|order|booking|book\s+appointment|permission|role|customer-visible|customer visible|external action|git\s+push|commit)\b/i;
const CONTROLLED_FIX_OUTPUT_LIMIT = 1600;
const CONTROLLED_PATCH_SNIPPET_LIMIT = 520;
const SAFE_FIX_TARGETS = new Set([
  "src/apex-control-room-components.jsx",
  "src/apex-control-room-components-import.test.js",
  "src/apex-control-room-utils.js",
  "src/apex-control-room-utils.test.js",
  "src/index.css",
  "src/app-routing.test.js",
  "src/navigation-utils.test.js",
  "shared/permissions.test.js",
  "server/apex-os-builder-mode.test.js",
]);

const APEX_BUILDER_CODER_MODEL_HINT = Object.freeze({
  provider: "ollama",
  route: "coding-analysis",
  model: "qwen3:14b",
  numCtx: 4096,
  deepModel: "qwen3-coder:30b",
  deepManualOnly: true,
  autoPromoteTo30B: false,
  mode: "local-first",
});

function npmExecutable() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

export const APEX_BUILDER_VALIDATION_COMMANDS = Object.freeze([
  {
    id: "git-diff-check",
    label: "Diff whitespace check",
    command: "git",
    args: ["diff", "--check"],
    timeoutMs: 30000,
    riskTier: "local-read-only",
    detail: "Checks the current local diff for whitespace/conflict-marker issues. It does not edit files.",
  },
  {
    id: "apex-home-focused-tests",
    label: "Apex Home focused tests",
    command: process.execPath,
    args: [
      "--test",
      "src/app-routing.test.js",
      "src/apex-control-room-utils.test.js",
      "src/apex-control-room-components-import.test.js",
      "src/app-navigation-components-import.test.js",
      "src/navigation-utils.test.js",
      "shared/permissions.test.js",
    ],
    timeoutMs: 90000,
    riskTier: "local-validation",
    detail: "Runs focused Apex Home, route, navigation, Control Room, and permission tests.",
  },
  {
    id: "apex-local-intelligence-tests",
    label: "Local intelligence tests",
    command: process.execPath,
    args: [
      "--test",
      "server/apexOllamaProvider.test.js",
      "shared/apexOsLocalFirstProviderPolicy.test.js",
      "shared/apexOsAsk.test.js",
      "shared/apexOsKnowledgeIntelligence.test.js",
    ],
    timeoutMs: 120000,
    riskTier: "local-validation",
    detail: "Runs local-first provider, Ask Apex, and Knowledge Intelligence regression tests.",
  },
  {
    id: "verify-roles",
    label: "Role boundary check",
    command: npmExecutable(),
    args: ["run", "verify:roles"],
    timeoutMs: 120000,
    riskTier: "local-validation",
    detail: "Runs the role and Apex operator permission suite.",
  },
  {
    id: "build",
    label: "Production build",
    command: npmExecutable(),
    args: ["run", "build"],
    timeoutMs: 180000,
    riskTier: "local-build",
    detail: "Runs the local Vite production build. It does not deploy.",
  },
]);

export const APEX_BUILDER_CONTROLLED_FIX_PROFILES = Object.freeze([
  {
    id: "apex-home-copy-polish",
    label: "Apex Home copy polish",
    detail: "Tightens stale Apex Home/Builder copy and then runs focused Apex Home tests.",
    category: "ui-copy",
    scopedFiles: [
      "src/apex-control-room-components.jsx",
      "src/apex-control-room-utils.js",
      "src/apex-control-room-components-import.test.js",
    ],
    validationCommandId: "apex-home-focused-tests",
    modelHint: APEX_BUILDER_CODER_MODEL_HINT,
    triggers: [/\b(copy|text|wording|stale copy|stale wording|builder mode|apex home|ui copy|small ui issue)\b/i],
    patches: [
      {
        file: "src/apex-control-room-components.jsx",
        find: ">Apex Builder Mode v1.1</p>",
        replace: ">Apex Builder Mode v1.2</p>",
        description: "Update the Builder Mode version label in Apex Home.",
      },
      {
        file: "src/apex-control-room-utils.js",
        find: "Apex Builder Mode lets Apex inspect local app state, track private builder work, run controlled local fixes, keep clear fix history, run fixed checks, and report progress without deploys or production changes.",
        replace: "Apex Builder Mode lets Apex inspect local app state, track private builder work, run controlled local fixes, preview exact patches, undo Apex-owned local changes, keep clear fix history, run fixed checks, and report progress without deploys or production changes.",
        description: "Update the Builder Mode capability summary.",
      },
    ],
  },
  {
    id: "control-room-import-repair",
    label: "Control Room import repair",
    detail: "Scopes import/render breakage in the Apex Home and Control Room modules, then runs import-focused checks.",
    category: "import-test",
    scopedFiles: [
      "src/apex-control-room-components.jsx",
      "src/apex-control-room-components-import.test.js",
      "src/apex-control-room-utils.js",
    ],
    validationCommandId: "apex-home-focused-tests",
    modelHint: APEX_BUILDER_CODER_MODEL_HINT,
    triggers: [/\b(import|render|component|control room|apex home|route|routing)\b/i],
    patches: [],
  },
  {
    id: "builder-status-label-repair",
    label: "Builder status label repair",
    detail: "Scopes local status label, badge, and visible state mismatches, then runs focused Apex Home state tests.",
    category: "status-display",
    scopedFiles: [
      "src/apex-control-room-utils.js",
      "src/apex-control-room-utils.test.js",
      "src/apex-control-room-components.jsx",
    ],
    validationCommandId: "apex-home-focused-tests",
    modelHint: APEX_BUILDER_CODER_MODEL_HINT,
    triggers: [/\b(status label|label mismatch|status mismatch|status display|badge|state mismatch|local status|local intelligence status)\b/i],
    patches: [],
  },
  {
    id: "builder-receipt-history-display",
    label: "Fix receipt history display",
    detail: "Scopes missing visible fix receipts, latest fix history, and What Apex Did rows, then runs focused Apex Home checks.",
    category: "receipt-history",
    scopedFiles: [
      "src/apex-control-room-components.jsx",
      "src/apex-control-room-utils.js",
      "src/apex-control-room-utils.test.js",
      "src/apex-control-room-components-import.test.js",
    ],
    validationCommandId: "apex-home-focused-tests",
    modelHint: APEX_BUILDER_CODER_MODEL_HINT,
    triggers: [/\b(fix history|show fix history|what apex did|receipt|activity row|what did apex do|latest fix)\b/i],
    patches: [],
  },
  {
    id: "utility-test-repair",
    label: "Focused utility/test repair",
    detail: "Scopes small helper/test assertion issues and runs the focused Apex Home/local intelligence checks.",
    category: "utility-test",
    scopedFiles: [
      "src/apex-control-room-utils.js",
      "src/apex-control-room-utils.test.js",
      "server/apex-os-builder-mode.js",
      "server/apex-os-builder-mode.test.js",
    ],
    validationCommandId: "apex-home-focused-tests",
    modelHint: APEX_BUILDER_CODER_MODEL_HINT,
    triggers: [/\b(test|assertion|helper|utility|repair|fix local|focused fix)\b/i],
    patches: [],
  },
  {
    id: "layout-overflow-guard",
    label: "Layout overflow guard",
    detail: "Scopes harmless mobile/text overflow fixes in Apex Home layout/CSS and runs focused Apex Home checks.",
    category: "layout-css",
    scopedFiles: [
      "src/apex-control-room-components.jsx",
      "src/apex-control-room-components-import.test.js",
      "src/index.css",
    ],
    validationCommandId: "apex-home-focused-tests",
    modelHint: APEX_BUILDER_CODER_MODEL_HINT,
    triggers: [/\b(layout|overflow|wrap|mobile text|text overflow|small layout|clean up this small layout issue)\b/i],
    patches: [],
  },
]);

const GENERIC_CONTROLLED_FIX_PROFILE = Object.freeze({
  id: "scoped-local-fix",
  label: "Scoped local fix",
  detail: "Scopes a small private/local app issue, records target files, and runs a safe local diff check.",
  category: "scoped-local",
  scopedFiles: ["src/apex-control-room-components.jsx", "src/apex-control-room-utils.js"],
  validationCommandId: "git-diff-check",
  triggers: [],
  patches: [],
});

export function listApexBuilderValidationCommands() {
  return APEX_BUILDER_VALIDATION_COMMANDS.map(({ id, label, detail, riskTier, timeoutMs }) => ({
    id,
    label,
    detail,
    riskTier,
    timeoutMs,
  }));
}

export function findApexBuilderValidationCommand(commandId = "") {
  const normalized = String(commandId || "").trim();
  return APEX_BUILDER_VALIDATION_COMMANDS.find((command) => command.id === normalized) || null;
}

export function listApexBuilderControlledFixProfiles() {
  return APEX_BUILDER_CONTROLLED_FIX_PROFILES.map(({ id, label, detail, category, scopedFiles, validationCommandId, modelHint }) => ({
    id,
    label,
    detail,
    category,
    scopedFiles: [...scopedFiles],
    validationCommandId,
    modelHint: modelHint ? { ...modelHint } : null,
  }));
}

export function findApexBuilderControlledFixProfile(fixId = "") {
  const normalized = String(fixId || "").trim();
  return APEX_BUILDER_CONTROLLED_FIX_PROFILES.find((profile) => profile.id === normalized) || null;
}

export function classifyApexBuilderControlledFixRequest(request = "") {
  const text = String(request || "").trim();
  if (!text) return null;
  return APEX_BUILDER_CONTROLLED_FIX_PROFILES.find((profile) => profile.triggers.some((pattern) => pattern.test(text))) || GENERIC_CONTROLLED_FIX_PROFILE;
}

export function sanitizeApexBuilderValidationOutput(value = "") {
  const lines = String(value || "")
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => (SECRET_LINE_PATTERN.test(line) ? "[redacted sensitive output line]" : line));
  const text = lines.join("\n").trim();
  return text.length > OUTPUT_LIMIT ? `${text.slice(0, OUTPUT_LIMIT - 3)}...` : text;
}

function sanitizeControlledFixText(value = "", limit = CONTROLLED_FIX_OUTPUT_LIMIT) {
  const output = sanitizeApexBuilderValidationOutput(value);
  return output.length > limit ? `${output.slice(0, limit - 3)}...` : output;
}

function normalizeRepoRelativePath(file = "") {
  return String(file || "").replace(/\\/g, "/").replace(/^\/+/, "").trim();
}

function resolveSafeFixTarget(repoRoot = process.cwd(), file = "") {
  const relativeFile = normalizeRepoRelativePath(file);
  if (!SAFE_FIX_TARGETS.has(relativeFile)) {
    throw new Error("Controlled local fixes can only touch allowlisted Apex Builder source/test files.");
  }
  if (relativeFile.includes(".env") || relativeFile.split("/").includes("node_modules")) {
    throw new Error("Controlled local fixes cannot touch env, dependency, or secret-bearing paths.");
  }
  const root = path.resolve(repoRoot);
  const absolute = path.resolve(root, relativeFile);
  const rootPrefix = root.endsWith(path.sep) ? root : `${root}${path.sep}`;
  if (absolute !== root && !absolute.startsWith(rootPrefix)) {
    throw new Error("Controlled local fix target escaped the repo root.");
  }
  return { relativeFile, absolute };
}

function countExactOccurrences(value = "", search = "") {
  const text = String(value || "");
  const needle = String(search || "");
  if (!needle) return 0;
  let count = 0;
  let index = 0;
  while (index <= text.length) {
    const found = text.indexOf(needle, index);
    if (found < 0) break;
    count += 1;
    index = found + needle.length;
  }
  return count;
}

function hashControlledContent(value = "") {
  return createHash("sha256").update(String(value || ""), "utf8").digest("hex");
}

function buildControlledPatchPreview(profile = {}, patch = {}, index = 0) {
  const validationCommand = findApexBuilderValidationCommand(profile?.validationCommandId);
  const relativeFile = normalizeRepoRelativePath(patch.file);
  return {
    id: `${profile?.id || "controlled-fix"}-patch-${index + 1}`,
    targetFile: relativeFile,
    searchSnippet: sanitizeControlledFixText(patch.find || "", CONTROLLED_PATCH_SNIPPET_LIMIT),
    replacementSnippet: sanitizeControlledFixText(patch.replace || "", CONTROLLED_PATCH_SNIPPET_LIMIT),
    explanation: sanitizeControlledFixText(patch.description || "Apex prepared an exact controlled local patch.", 260),
    validationCommand: validationCommand ? {
      id: validationCommand.id,
      label: validationCommand.label,
    } : null,
    expectedResult: validationCommand
      ? `${validationCommand.label} should pass after the patch.`
      : "Apex should record the scoped local patch result.",
    canExecuteExternalActions: false,
    controlledPatchOnly: true,
  };
}

function buildControlledPatchPreviews(profile = {}) {
  return (Array.isArray(profile?.patches) ? profile.patches : []).map((patch, index) => buildControlledPatchPreview(profile, patch, index));
}

function normalizeSelfFixHandoffPatch(patch = {}) {
  return {
    targetFile: normalizeRepoRelativePath(patch.targetFile || patch.file || ""),
    searchSnippet: sanitizeControlledFixText(patch.searchSnippet || patch.search || patch.before || "", CONTROLLED_PATCH_SNIPPET_LIMIT),
    replacementSnippet: sanitizeControlledFixText(patch.replacementSnippet || patch.replacement || patch.after || "", CONTROLLED_PATCH_SNIPPET_LIMIT),
  };
}

function listSelfFixHandoffPatches(selfFixPatchHandoff = null) {
  return (Array.isArray(selfFixPatchHandoff?.patches) ? selfFixPatchHandoff.patches : [])
    .map((patch) => normalizeSelfFixHandoffPatch(patch))
    .filter((patch) => patch.targetFile && patch.searchSnippet && patch.replacementSnippet);
}

function selfFixPatchHandoffContainsSensitiveContent(selfFixPatchHandoff = null) {
  const serialized = JSON.stringify(selfFixPatchHandoff || {});
  return SECRET_LINE_PATTERN.test(serialized) || /\.env\b/i.test(serialized);
}

function selfFixHandoffMatchesProfile(selfFixPatchHandoff = null, profile = null) {
  if (!selfFixPatchHandoff || !profile) return false;
  const handoffPatches = listSelfFixHandoffPatches(selfFixPatchHandoff);
  const controlledPreviews = buildControlledPatchPreviews(profile)
    .map((preview) => normalizeSelfFixHandoffPatch(preview));
  if (!handoffPatches.length || handoffPatches.length !== controlledPreviews.length) return false;
  return handoffPatches.every((handoffPatch) => controlledPreviews.some((controlledPatch) => (
    controlledPatch.targetFile === handoffPatch.targetFile
      && controlledPatch.searchSnippet === handoffPatch.searchSnippet
      && controlledPatch.replacementSnippet === handoffPatch.replacementSnippet
  )));
}

function findApexBuilderProfileForSelfFixHandoff(selfFixPatchHandoff = null) {
  if (!selfFixPatchHandoff) return null;
  return APEX_BUILDER_CONTROLLED_FIX_PROFILES.find((profile) => selfFixHandoffMatchesProfile(selfFixPatchHandoff, profile)) || null;
}

function reviewSelfFixPatchHandoff(selfFixPatchHandoff = null, profile = null) {
  if (!selfFixPatchHandoff) {
    return {
      provided: false,
      ok: true,
      status: "not-provided",
      reason: "",
      patchCount: 0,
    };
  }
  if (selfFixPatchHandoffContainsSensitiveContent(selfFixPatchHandoff)) {
    return {
      provided: true,
      ok: false,
      status: "blocked-sensitive-or-forbidden-content",
      reason: "Self-Fix handoff contained sensitive or forbidden action text.",
      patchCount: 0,
    };
  }
  if (String(selfFixPatchHandoff.version || "") !== "self-fix-v1") {
    return {
      provided: true,
      ok: false,
      status: "blocked-unknown-version",
      reason: "Self-Fix handoff version was not recognized.",
      patchCount: 0,
    };
  }
  if (String(selfFixPatchHandoff.status || "") !== "ready-for-build-thread") {
    return {
      provided: true,
      ok: false,
      status: "blocked-not-ready",
      reason: "Self-Fix handoff was not marked ready for Builder tooling.",
      patchCount: 0,
    };
  }
  const handoffPatches = listSelfFixHandoffPatches(selfFixPatchHandoff);
  if (!handoffPatches.length) {
    return {
      provided: true,
      ok: false,
      status: "blocked-missing-exact-patch",
      reason: "Self-Fix handoff did not include exact patch snippets.",
      patchCount: 0,
    };
  }
  if (!selfFixHandoffMatchesProfile(selfFixPatchHandoff, profile)) {
    return {
      provided: true,
      ok: false,
      status: "blocked-profile-mismatch",
      reason: "Self-Fix handoff did not match a known controlled Builder patch profile.",
      patchCount: handoffPatches.length,
    };
  }
  return {
    provided: true,
    ok: true,
    status: "matched-controlled-builder-profile",
    reason: "Self-Fix handoff matched the controlled Builder patch profile exactly.",
    patchCount: handoffPatches.length,
  };
}

function selfFixShortAnswerForFixRun(fixRun = {}) {
  const validationOk = fixRun?.validationSummary?.ok === true || fixRun?.validationRun?.ok === true;
  const validationLabel = String(fixRun?.validationSummary?.label || fixRun?.validationRun?.label || "").toLowerCase();
  if (fixRun.status === "fixed" && validationOk) {
    return validationLabel.includes("build") ? "Fixed. Build passed." : "Fixed. Focused tests passed.";
  }
  if (fixRun.status === "fixed") return "Fixed. Validation result recorded.";
  if (fixRun.status === "already-fixed") return "Handled. That fix was already in place.";
  if (fixRun.status === "scoped" && validationOk) return "Handled. Focused check passed.";
  if (fixRun.status === "scoped") return "Handled. I scoped it and recorded the result.";
  if (fixRun.status === "reverted") return "Tried it. Validation failed, so I reverted the local patch.";
  if (fixRun.status === "blocked") return "Stopped. That crossed a hard stop.";
  if (fixRun.status === "needs-attention") return "Checked it. It needs attention before I change files.";
  return fixRun.ok ? "Handled. Result recorded." : "I checked it and recorded what needs attention.";
}

function buildSelfFixLearningReceipt({ request = "", profile = null, fixRun = {}, handoffReview = {} } = {}) {
  const validationSummary = fixRun.validationSummary || {};
  const patchStatuses = (Array.isArray(fixRun.patchResults) ? fixRun.patchResults : [])
    .map((patch) => `${patch.file || "file"}:${patch.status || "checked"}`)
    .slice(0, 4);
  const failure = fixRun.status === "blocked"
    ? (fixRun.receipt || handoffReview.reason || "Blocked before local file work.")
    : fixRun.status === "reverted"
      ? "Validation failed after the controlled patch, so Apex reverted its own local changes."
      : fixRun.status === "needs-attention"
        ? "Exact baseline was missing, ambiguous, or validation needs attention before changing files."
        : "";
  return {
    issuePattern: sanitizeControlledFixText(profile?.category || profile?.id || "scoped-local-app-issue", 140),
    patchStrategy: sanitizeControlledFixText(
      profile?.patches?.length
        ? `Use the ${profile.id} exact-match controlled patch profile.`
        : "Classify the request to an allowlisted Builder profile, run the scoped local check, and avoid broad patches.",
      240,
    ),
    validationProof: sanitizeControlledFixText(
      validationSummary.label
        ? `${validationSummary.label}: ${validationSummary.status || (validationSummary.ok ? "passed" : "recorded")}`
        : "No validation proof was produced.",
      220,
    ),
    failure: sanitizeControlledFixText(failure, 260),
    fasterNextTime: sanitizeControlledFixText(
      handoffReview?.provided
        ? "Reuse the matched Self-Fix handoff and controlled Builder profile; skip panel clutter and report the short result first."
        : "Ask for or derive exact screen evidence earlier, then route directly to the narrow controlled Builder profile.",
      260,
    ),
    requestPattern: sanitizeControlledFixText(request, 180),
    patchStatuses,
  };
}

function buildSelfFixAutoDispatchReceipt({
  request = "",
  selfFixPatchHandoff = null,
  profile = null,
  fixRun = {},
  handoffReview = {},
  source = "",
} = {}) {
  const patchPreviews = (Array.isArray(fixRun.patchPreviews) ? fixRun.patchPreviews : []).slice(0, 4).map((patch) => ({
    id: sanitizeControlledFixText(patch.id || "", 80),
    targetFile: sanitizeControlledFixText(patch.targetFile || patch.file || "", 180),
    searchSnippet: sanitizeControlledFixText(patch.searchSnippet || "", CONTROLLED_PATCH_SNIPPET_LIMIT),
    replacementSnippet: sanitizeControlledFixText(patch.replacementSnippet || "", CONTROLLED_PATCH_SNIPPET_LIMIT),
    explanation: sanitizeControlledFixText(patch.explanation || "", 260),
    validationCommand: sanitizeControlledFixText(patch.validationCommand?.label || patch.validationCommand?.id || "", 160),
    expectedResult: sanitizeControlledFixText(patch.expectedResult || "", 180),
  }));
  const validationSummary = fixRun.validationSummary || (fixRun.validationRun ? {
    commandId: fixRun.validationRun.commandId,
    label: fixRun.validationRun.label,
    status: fixRun.validationRun.status,
    ok: fixRun.validationRun.ok,
  } : null);
  const changedDetail = sanitizeControlledFixText(fixRun.whatApexDid || fixRun.receipt || "Apex dispatched Builder and recorded the result.", 420);
  const testedDetail = validationSummary
    ? sanitizeControlledFixText(`${validationSummary.label || validationSummary.commandId || "Validation"} ${validationSummary.status || (validationSummary.ok ? "passed" : "recorded")}.`, 220)
    : "No validation command ran.";
  const learningReceipt = buildSelfFixLearningReceipt({ request, profile, fixRun, handoffReview });
  return {
    id: `self-fix-v2-${fixRun.id || Date.now()}`,
    version: "self-fix-v2",
    source: sanitizeControlledFixText(source || "apex-home-self-fix-v2", 100),
    status: fixRun.status || "recorded",
    ok: Boolean(fixRun.ok),
    shortAnswer: selfFixShortAnswerForFixRun(fixRun),
    builderConsumedHandoff: Boolean(handoffReview?.provided && handoffReview.ok),
    handoffStatus: handoffReview?.status || (selfFixPatchHandoff ? "provided" : "not-provided"),
    builderRunId: sanitizeControlledFixText(fixRun.id || "", 120),
    fixId: sanitizeControlledFixText(fixRun.fixId || profile?.id || "", 120),
    label: sanitizeControlledFixText(fixRun.label || profile?.label || "Self-Fix auto-dispatch", 160),
    filesTouched: Array.isArray(fixRun.filesTouched) ? fixRun.filesTouched.map((file) => sanitizeControlledFixText(file, 180)).slice(0, 8) : [],
    scopedFiles: Array.isArray(fixRun.scopedFiles) ? fixRun.scopedFiles.map((file) => sanitizeControlledFixText(file, 180)).slice(0, 8) : [],
    patchPreviews,
    patchResults: (Array.isArray(fixRun.patchResults) ? fixRun.patchResults : []).slice(0, 6).map((patch) => ({
      file: sanitizeControlledFixText(patch.file || "", 180),
      status: sanitizeControlledFixText(patch.status || "", 80),
      changed: Boolean(patch.changed),
      reverted: Boolean(patch.reverted),
      reason: sanitizeControlledFixText(patch.reason || "", 220),
    })),
    validationSummary,
    changedDetail,
    testedDetail,
    failureDetail: sanitizeControlledFixText(learningReceipt.failure || "", 320),
    learningReceipt,
    receipt: sanitizeControlledFixText(fixRun.receipt || "", 620),
    canEditFilesFromApexUi: false,
    builderToolingOnly: true,
    canRunGitFromApexUi: false,
    canDeploy: false,
    deployBlocked: true,
    productionBlocked: true,
    schemaAuthSessionBlocked: true,
    deletionBlocked: true,
    externalActionsBlocked: true,
    hardStopsKept: [
      "deploy",
      "production",
      "schema/auth/session",
      "secrets",
      "deletion",
      "send/spend/order/book",
      "customer-visible changes",
      "permission weakening",
    ],
    detailPrompts: [
      "Apex, what did you change?",
      "Apex, what did you test?",
      "Apex, what did you learn?",
      "Apex, show me the patch.",
      "Apex, what failed?",
    ],
  };
}

function buildControlledUndoPatch(profile = {}, patch = {}, index = 0) {
  const preview = buildControlledPatchPreview(profile, patch, index);
  return {
    id: preview.id,
    targetFile: preview.targetFile,
    currentSnippet: preview.replacementSnippet,
    restoreSnippet: preview.searchSnippet,
    explanation: preview.explanation,
    validationCommand: preview.validationCommand,
    expectedResult: preview.expectedResult,
    source: "apex-controlled-fix-profile",
  };
}

async function applyControlledFixPatches(profile, {
  repoRoot = process.cwd(),
  readFile = (file) => fs.readFile(file, "utf8"),
  writeFile = (file, content) => fs.writeFile(file, content, "utf8"),
} = {}) {
  const patches = Array.isArray(profile?.patches) ? profile.patches : [];
  const results = [];
  const rollbackEntries = [];
  for (const [index, patch] of patches.entries()) {
    const { relativeFile, absolute } = resolveSafeFixTarget(repoRoot, patch.file);
    const preview = buildControlledPatchPreview(profile, patch, index);
    const before = await readFile(absolute);
    const find = String(patch.find || "");
    const replace = String(patch.replace || "");
    if (!find || SECRET_LINE_PATTERN.test(replace) || /\.env/i.test(replace)) {
      results.push({
        file: relativeFile,
        status: "blocked",
        description: patch.description || "Patch blocked.",
        changed: false,
        reason: "Patch content failed controlled-fix safety checks.",
        preview,
      });
      continue;
    }
    const matchCount = countExactOccurrences(before, find);
    if (before.includes(replace) && matchCount === 0) {
      results.push({
        file: relativeFile,
        status: "already-applied",
        description: patch.description || "Patch already present.",
        changed: false,
        baselineChecked: true,
        searchMatches: 0,
        preview,
      });
      continue;
    }
    if (!matchCount) {
      results.push({
        file: relativeFile,
        status: "not-found",
        description: patch.description || "Patch target not found.",
        changed: false,
        baselineChecked: true,
        searchMatches: 0,
        reason: "Expected exact text was not found; Apex did not guess.",
        preview,
      });
      continue;
    }
    if (matchCount > 1) {
      results.push({
        file: relativeFile,
        status: "baseline-mismatch",
        description: patch.description || "Patch baseline was ambiguous.",
        changed: false,
        baselineChecked: true,
        searchMatches: matchCount,
        reason: "Expected exact text appeared more than once; Apex did not guess which match to change.",
        preview,
      });
      continue;
    }
    const after = before.replace(find, replace);
    await writeFile(absolute, after);
    rollbackEntries.push({ relativeFile, absolute, before, after });
    results.push({
      file: relativeFile,
      status: "applied",
      description: patch.description || "Patch applied.",
      changed: true,
      baselineChecked: true,
      searchMatches: matchCount,
      preview,
      undoPatch: {
        ...buildControlledUndoPatch(profile, patch, index),
        appliedContentHash: hashControlledContent(after),
      },
    });
  }
  return { patchResults: results, rollbackEntries };
}

async function revertControlledFixPatches(rollbackEntries = [], {
  writeFile = (file, content) => fs.writeFile(file, content, "utf8"),
} = {}) {
  const results = [];
  for (const entry of [...rollbackEntries].reverse()) {
    try {
      await writeFile(entry.absolute, entry.before);
      results.push({
        file: entry.relativeFile,
        status: "reverted",
        changed: true,
      });
    } catch (error) {
      results.push({
        file: entry.relativeFile,
        status: "revert-failed",
        changed: false,
        reason: error?.message || "Apex could not revert this patch automatically.",
      });
    }
  }
  return results;
}

function buildControlledFixWhatApexDid({ profile, status, patchResults = [], validationRun = null, revertResults = [] } = {}) {
  if (status === "blocked") return "Apex blocked the request before touching files.";
  if (status === "reverted") {
    return `Apex applied the exact scoped patch, ran validation, then reverted its own patch because ${validationRun?.label || "validation"} failed.`;
  }
  const changedCount = patchResults.filter((patch) => patch.changed).length;
  const filesTouched = patchResults.filter((patch) => patch.changed).map((patch) => patch.file);
  if (changedCount) {
    return `Apex applied ${changedCount} exact scoped patch${changedCount === 1 ? "" : "es"}${filesTouched.length ? ` in ${filesTouched.join(", ")}` : ""} and ${validationRun?.status === "passed" ? "validated it" : "recorded the validation result"}.`;
  }
  if (patchResults.some((patch) => ["not-found", "baseline-mismatch"].includes(patch.status))) {
    return "Apex checked the exact patch baseline, did not guess, and recorded the needed attention.";
  }
  if (patchResults.some((patch) => patch.status === "already-applied")) {
    return "Apex checked the exact patch baseline and found the controlled fix already present.";
  }
  return `Apex scoped ${profile?.label || "the local fix"} to allowlisted files and ran the configured local check.`;
}

function controlledFixReceipt({ profile, status, patchResults = [], validationRun = null, blockedReason = "", revertResults = [] } = {}) {
  if (status === "blocked") {
    return `Blocked controlled local fix: ${blockedReason || "request hit a hard stop"}. No files, deploys, production, schema/auth/session, deletion, sends, spend, orders, booking, or permission changes ran.`;
  }
  const changedCount = patchResults.filter((patch) => patch.changed).length;
  const scopedCount = Array.isArray(profile?.scopedFiles) ? profile.scopedFiles.length : 0;
  const validationText = validationRun?.status ? ` Validation ${validationRun.status}.` : "";
  if (status === "reverted") {
    const revertedCount = revertResults.filter((item) => item.status === "reverted").length;
    return `Apex applied ${changedCount} controlled local fix patch${changedCount === 1 ? "" : "es"} for ${profile.label}, validation failed, and Apex reverted ${revertedCount} of its own patch${revertedCount === 1 ? "" : "es"}. No deploy, production, schema/auth/session, deletion, sends, spend, orders, booking, or permission changes ran.`;
  }
  if (changedCount) {
    return `Apex applied ${changedCount} controlled local fix patch${changedCount === 1 ? "" : "es"} for ${profile.label}, scoped to ${scopedCount} allowlisted file${scopedCount === 1 ? "" : "s"}.${validationText} No deploy, production, schema/auth/session, deletion, sends, spend, orders, booking, or permission changes ran.`;
  }
  return `Apex scoped ${profile.label}, identified allowlisted target files, and recorded the local fix result.${validationText} No deploy, production, schema/auth/session, deletion, sends, spend, orders, booking, or permission changes ran.`;
}

function controlledUndoReceipt({ sourceFix = {}, status = "", undoResults = [], validationRun = null, blockedReason = "" } = {}) {
  if (status === "blocked") {
    return `Blocked local undo: ${blockedReason || "the last fix was not eligible for scoped undo"}. No git reset, checkout, deletion, deploy, production, schema/auth/session, send, spend, order, or booking action ran.`;
  }
  const changedCount = undoResults.filter((item) => item.changed).length;
  const validationText = validationRun?.status ? ` Validation ${validationRun.status}.` : "";
  return `Apex undid ${changedCount} Apex-owned controlled local patch${changedCount === 1 ? "" : "es"} from ${sourceFix.label || sourceFix.fixId || "the last fix"}.${validationText} No git reset, checkout, deletion, deploy, production, schema/auth/session, send, spend, order, or booking action ran.`;
}

function buildControlledUndoWhatApexDid({ sourceFix = {}, status = "", undoResults = [], validationRun = null } = {}) {
  if (status === "blocked") return "Apex checked the undo baseline and blocked the undo before touching files.";
  const filesTouched = undoResults.filter((item) => item.changed).map((item) => item.file);
  const fileText = filesTouched.length ? ` in ${filesTouched.join(", ")}` : "";
  return `Apex reversed its own last successful controlled patch${fileText}, then ${validationRun?.status === "passed" ? "validated the undo" : "recorded the undo validation result"}.`;
}

function safeBlockedUndo({
  sourceFix = {},
  reason = "",
  now = new Date().toISOString(),
  validationRun = null,
  undoResults = [],
} = {}) {
  const status = validationRun?.ok === false ? "needs-attention" : "blocked";
  const whatApexDid = buildControlledUndoWhatApexDid({ sourceFix, status: "blocked", undoResults, validationRun });
  return {
    id: `builder-undo-${Date.now()}`,
    sourceFixId: sourceFix?.id || "",
    fixId: sourceFix?.fixId || "blocked",
    status,
    ok: false,
    label: "Local undo blocked",
    category: "controlled-local-undo",
    undoResults,
    filesTouched: [],
    validationRun,
    validationSummary: validationRun ? {
      commandId: validationRun.commandId,
      label: validationRun.label,
      status: validationRun.status,
      ok: validationRun.ok,
    } : null,
    historyStatus: status,
    whatApexDid,
    receipt: controlledUndoReceipt({ sourceFix, status: "blocked", undoResults, validationRun, blockedReason: reason }),
    reason: sanitizeControlledFixText(reason || "Undo was blocked.", 360),
    undoAvailable: false,
    undoHint: "Apex can only undo its own last successful scoped patch when the file still matches the Apex-applied baseline.",
    canExecuteExternalActions: false,
    canApplyBroadPatches: false,
    controlledPatchOnly: true,
    baselineChecked: true,
    deployBlocked: true,
    productionBlocked: true,
    schemaAuthSessionBlocked: true,
    deletionBlocked: true,
    createdAt: now,
  };
}

function normalizeApexOwnedUndoPatches(sourceFix = {}, profile = {}) {
  if (!sourceFix || typeof sourceFix !== "object") return [];
  const sourcePatches = Array.isArray(sourceFix.undoPatches)
    ? sourceFix.undoPatches
    : listPatchResults(sourceFix).map((patch) => patch.undoPatch).filter(Boolean);
  const profilePatches = Array.isArray(profile?.patches) ? profile.patches : [];
  const allowed = [];
  for (const undoPatch of sourcePatches) {
    const targetFile = normalizeRepoRelativePath(undoPatch?.targetFile || undoPatch?.file);
    const matchIndex = profilePatches.findIndex((profilePatch) => {
      const profileFile = normalizeRepoRelativePath(profilePatch.file);
      return profileFile === targetFile
        && sanitizeControlledFixText(profilePatch.replace || "", CONTROLLED_PATCH_SNIPPET_LIMIT) === String(undoPatch?.currentSnippet || "")
        && sanitizeControlledFixText(profilePatch.find || "", CONTROLLED_PATCH_SNIPPET_LIMIT) === String(undoPatch?.restoreSnippet || "");
    });
    if (matchIndex >= 0) {
      allowed.push({
        ...buildControlledUndoPatch(profile, profilePatches[matchIndex], matchIndex),
        appliedContentHash: String(undoPatch?.appliedContentHash || ""),
        find: String(profilePatches[matchIndex].replace || ""),
        replace: String(profilePatches[matchIndex].find || ""),
      });
    }
  }
  return allowed;
}

function listPatchResults(sourceFix = {}) {
  return Array.isArray(sourceFix?.patchResults) ? sourceFix.patchResults : [];
}

function publicCommand(command = {}) {
  return {
    id: command.id,
    label: command.label,
    detail: command.detail,
    riskTier: command.riskTier,
    timeoutMs: command.timeoutMs,
  };
}

export async function runApexBuilderValidationCommand({
  commandId = "",
  repoRoot = process.cwd(),
  now = new Date().toISOString(),
  runner,
} = {}) {
  const command = findApexBuilderValidationCommand(commandId);
  if (!command) {
    return {
      id: `builder-validation-${Date.now()}`,
      commandId: String(commandId || "").trim() || "unknown",
      status: "blocked",
      ok: false,
      label: "Unknown validation command",
      detail: "Apex Builder Mode only runs fixed local validation commands. Custom shell input is blocked.",
      output: "",
      receipt: "Blocked unknown local validation command. No process was started.",
      canExecuteExternalActions: false,
      deployBlocked: true,
      productionBlocked: true,
      schemaAuthSessionBlocked: true,
      deletionBlocked: true,
      createdAt: now,
    };
  }

  const startedAt = Date.now();
  const run = runner || ((spec) => execFileAsync(spec.command, spec.args, {
    cwd: repoRoot,
    timeout: spec.timeoutMs || DEFAULT_TIMEOUT_MS,
    windowsHide: true,
    maxBuffer: 1024 * 1024 * 4,
  }));

  try {
    const result = await run(command);
    const output = sanitizeApexBuilderValidationOutput([result?.stdout, result?.stderr].filter(Boolean).join("\n"));
    return {
      id: `builder-validation-${startedAt}`,
      commandId: command.id,
      status: "passed",
      ok: true,
      ...publicCommand(command),
      output,
      durationMs: Date.now() - startedAt,
      receipt: `${command.label} passed locally. No deploy, production, schema/auth/session, deletion, send, spend, order, or booking action ran.`,
      canExecuteExternalActions: false,
      deployBlocked: true,
      productionBlocked: true,
      schemaAuthSessionBlocked: true,
      deletionBlocked: true,
      createdAt: now,
    };
  } catch (error) {
    const output = sanitizeApexBuilderValidationOutput([error?.stdout, error?.stderr, error?.message].filter(Boolean).join("\n"));
    return {
      id: `builder-validation-${startedAt}`,
      commandId: command.id,
      status: "failed",
      ok: false,
      ...publicCommand(command),
      output,
      durationMs: Date.now() - startedAt,
      receipt: `${command.label} finished with a local validation issue. Apex did not deploy, mutate production, change schema/auth/session, delete files, send, spend, order, or book anything.`,
      canExecuteExternalActions: false,
      deployBlocked: true,
      productionBlocked: true,
      schemaAuthSessionBlocked: true,
      deletionBlocked: true,
      createdAt: now,
    };
  }
}

export async function runApexBuilderControlledFix({
  request = "",
  fixId = "",
  selfFixPatchHandoff = null,
  source = "",
  applyPatch = true,
  runValidation = true,
  repoRoot = process.cwd(),
  now = new Date().toISOString(),
  runner,
  readFile,
  writeFile,
} = {}) {
  const startedAt = Date.now();
  const normalizedRequest = String(request || "").trim();
  const requestedProfile = findApexBuilderControlledFixProfile(fixId);
  const handoffProfile = findApexBuilderProfileForSelfFixHandoff(selfFixPatchHandoff);
  const profile = requestedProfile || handoffProfile || classifyApexBuilderControlledFixRequest(normalizedRequest);
  const handoffReview = reviewSelfFixPatchHandoff(selfFixPatchHandoff, profile);
  const shouldAttachSelfFixDispatch = Boolean(selfFixPatchHandoff) || /\bself[- ]?fix\b/i.test(String(source || ""));
  const blockedReason = FORBIDDEN_FIX_REQUEST_PATTERN.test(`${normalizedRequest} ${fixId}`)
    ? "This request mentions a consequential or forbidden action."
    : handoffReview.ok === false
      ? handoffReview.reason
    : "";

  if (blockedReason || !profile) {
    const blockedRun = {
      id: `builder-fix-${startedAt}`,
      fixId: String(fixId || "").trim() || "blocked",
      request: blockedReason ? "[blocked hard-stop request omitted]" : sanitizeControlledFixText(normalizedRequest, 360),
      status: "blocked",
      ok: false,
      label: "Controlled local fix blocked",
      category: "blocked",
      scopedFiles: [],
      actionTaken: [],
      patchPreviews: [],
      patchResults: [],
      undoPatches: [],
      validationRun: null,
      receipt: controlledFixReceipt({ status: "blocked", blockedReason }),
      canExecuteExternalActions: false,
      canApplyBroadPatches: false,
      deployBlocked: true,
      productionBlocked: true,
      schemaAuthSessionBlocked: true,
      deletionBlocked: true,
      createdAt: now,
    };
    return shouldAttachSelfFixDispatch
      ? {
        ...blockedRun,
        selfFixAutoDispatch: buildSelfFixAutoDispatchReceipt({
          request: normalizedRequest,
          selfFixPatchHandoff,
          profile,
          fixRun: blockedRun,
          handoffReview,
          source,
        }),
      }
      : blockedRun;
  }

  const patchPreviews = buildControlledPatchPreviews(profile);
  let patchResults = [];
  let rollbackEntries = [];
  let revertResults = [];
  let patchError = "";
  if (applyPatch && Array.isArray(profile.patches) && profile.patches.length) {
    try {
      const patchRun = await applyControlledFixPatches(profile, { repoRoot, readFile, writeFile });
      patchResults = patchRun.patchResults;
      rollbackEntries = patchRun.rollbackEntries;
    } catch (error) {
      patchError = error?.message || "Controlled patch failed.";
      patchResults = [{
        file: "allowlisted-source",
        status: "blocked",
        changed: false,
        reason: patchError,
      }];
    }
  }

  const hasBlockedPatch = patchResults.some((patch) => patch.status === "blocked");
  const changedCount = patchResults.filter((patch) => patch.changed).length;
  const missingPatch = patchResults.some((patch) => ["not-found", "baseline-mismatch"].includes(patch.status));
  let validationRun = null;
  if (runValidation && profile.validationCommandId) {
    validationRun = await runApexBuilderValidationCommand({
      commandId: profile.validationCommandId,
      repoRoot,
      now,
      runner,
    });
  }

  const validationFailed = validationRun && validationRun.ok === false;
  if (validationFailed && changedCount && rollbackEntries.length) {
    revertResults = await revertControlledFixPatches(rollbackEntries, { writeFile });
    patchResults = patchResults.map((patch) => (patch.changed
      ? { ...patch, status: "reverted-after-validation-failed", reverted: true }
      : patch));
  }

  const status = hasBlockedPatch
    ? "blocked"
    : validationFailed && changedCount && rollbackEntries.length
      ? "reverted"
      : validationFailed || missingPatch
      ? "needs-attention"
      : changedCount
        ? "fixed"
        : patchResults.some((patch) => patch.status === "already-applied")
          ? "already-fixed"
          : "scoped";

  const actionTaken = [
    "classified-safe-local-fix",
    "checked-exact-baseline",
    ...(changedCount ? ["applied-controlled-exact-patch"] : []),
    ...(status === "reverted" ? ["reverted-apex-owned-patch-after-validation-failed"] : []),
    ...(patchResults.length && !changedCount ? ["checked-controlled-patch-state"] : []),
    ...(validationRun ? [`ran-${profile.validationCommandId}`] : []),
    "recorded-controlled-fix-receipt",
  ];
  const filesTouched = patchResults.filter((patch) => patch.changed || patch.reverted).map((patch) => patch.file);
  const undoPatches = status === "fixed"
    ? patchResults.filter((patch) => patch.changed && patch.undoPatch).map((patch) => patch.undoPatch)
    : [];
  const historyStatus = status === "fixed"
    ? validationRun?.ok ? "validated" : "applied"
    : status;
  const whatApexDid = buildControlledFixWhatApexDid({ profile, status, patchResults, validationRun, revertResults });

  const fixRun = {
    id: `builder-fix-${startedAt}`,
    fixId: profile.id,
    request: sanitizeControlledFixText(normalizedRequest, 360),
    status,
    ok: ["fixed", "already-fixed", "scoped"].includes(status) && !validationFailed && !hasBlockedPatch,
    label: profile.label,
    detail: profile.detail,
    category: profile.category,
    scopedFiles: [...profile.scopedFiles],
    filesTouched,
    actionTaken,
    patchPreviews,
    patchResults,
    undoPatches,
    revertResults,
    validationRun,
    validationSummary: validationRun ? {
      commandId: validationRun.commandId,
      label: validationRun.label,
      status: validationRun.status,
      ok: validationRun.ok,
    } : null,
    historyStatus,
    whatApexDid,
    undoAvailable: status === "fixed" && changedCount > 0,
    undoHint: status === "reverted"
      ? "Apex already reverted its own patch because validation failed."
      : changedCount > 0
        ? "Undo is available for Apex's own last successful scoped patch if the file still matches the Apex-applied baseline."
        : "No file patch was applied, so there is no local patch to undo.",
    modelHint: profile.modelHint ? { ...profile.modelHint } : null,
    durationMs: Date.now() - startedAt,
    receipt: controlledFixReceipt({ profile, status, patchResults, validationRun, blockedReason: patchError, revertResults }),
    canExecuteExternalActions: false,
    canApplyBroadPatches: false,
    controlledPatchOnly: true,
    baselineChecked: true,
    autoRevertOnValidationFailure: true,
    deployBlocked: true,
    productionBlocked: true,
    schemaAuthSessionBlocked: true,
    deletionBlocked: true,
    createdAt: now,
  };
  return shouldAttachSelfFixDispatch
    ? {
      ...fixRun,
      selfFixAutoDispatch: buildSelfFixAutoDispatchReceipt({
        request: normalizedRequest,
        selfFixPatchHandoff,
        profile,
        fixRun,
        handoffReview,
        source,
      }),
    }
    : fixRun;
}

export async function runApexBuilderUndoLastFix({
  fixRun = null,
  runValidation = true,
  repoRoot = process.cwd(),
  now = new Date().toISOString(),
  runner,
  readFile = (file) => fs.readFile(file, "utf8"),
  writeFile = (file, content) => fs.writeFile(file, content, "utf8"),
} = {}) {
  const startedAt = Date.now();
  const sourceFix = fixRun && typeof fixRun === "object" ? fixRun : null;
  if (!sourceFix) {
    return safeBlockedUndo({ reason: "No Apex fix receipt was provided.", now });
  }
  if (sourceFix.undoAvailable !== true || sourceFix.status !== "fixed" || sourceFix.ok !== true) {
    return safeBlockedUndo({
      sourceFix,
      reason: "Only Apex's own last successful controlled local patch can be undone.",
      now,
    });
  }
  const profile = findApexBuilderControlledFixProfile(sourceFix.fixId);
  if (!profile) {
    return safeBlockedUndo({
      sourceFix,
      reason: "The fix receipt does not match a known controlled fix profile.",
      now,
    });
  }
  const undoPatches = normalizeApexOwnedUndoPatches(sourceFix, profile);
  if (!undoPatches.length) {
    return safeBlockedUndo({
      sourceFix,
      reason: "No Apex-owned undo metadata was found for this fix receipt.",
      now,
    });
  }

  const plannedWrites = [];
  const undoResults = [];
  for (const undoPatch of undoPatches) {
    let target;
    try {
      target = resolveSafeFixTarget(repoRoot, undoPatch.targetFile);
    } catch (error) {
      return safeBlockedUndo({
        sourceFix,
        reason: error?.message || "Undo target was not allowlisted.",
        now,
        undoResults,
      });
    }
    const current = await readFile(target.absolute);
    const currentHash = hashControlledContent(current);
    if (undoPatch.appliedContentHash && currentHash !== undoPatch.appliedContentHash) {
      undoResults.push({
        file: target.relativeFile,
        status: "baseline-mismatch",
        changed: false,
        reason: "File content changed after Apex's patch; Apex blocked undo instead of overwriting later local work.",
        preview: {
          targetFile: target.relativeFile,
          searchSnippet: undoPatch.currentSnippet,
          replacementSnippet: undoPatch.restoreSnippet,
          explanation: undoPatch.explanation,
          validationCommand: undoPatch.validationCommand,
          expectedResult: undoPatch.expectedResult,
        },
      });
      return safeBlockedUndo({
        sourceFix,
        reason: "File changed after Apex's patch.",
        now,
        undoResults,
      });
    }
    const currentMatches = countExactOccurrences(current, undoPatch.find);
    const restoreMatches = countExactOccurrences(current, undoPatch.replace);
    if (currentMatches !== 1 || restoreMatches > 0) {
      undoResults.push({
        file: target.relativeFile,
        status: "baseline-mismatch",
        changed: false,
        reason: currentMatches !== 1
          ? "Apex-applied text was not found exactly once; the file may have changed after Apex's patch."
          : "Restore text is already present; Apex blocked undo instead of guessing.",
        preview: {
          targetFile: target.relativeFile,
          searchSnippet: undoPatch.currentSnippet,
          replacementSnippet: undoPatch.restoreSnippet,
          explanation: undoPatch.explanation,
          validationCommand: undoPatch.validationCommand,
          expectedResult: undoPatch.expectedResult,
        },
      });
      return safeBlockedUndo({
        sourceFix,
        reason: "Undo baseline did not match Apex's last applied patch.",
        now,
        undoResults,
      });
    }
    plannedWrites.push({
      absolute: target.absolute,
      relativeFile: target.relativeFile,
      before: current,
      after: current.replace(undoPatch.find, undoPatch.replace),
      undoPatch,
    });
  }

  for (const write of plannedWrites) {
    await writeFile(write.absolute, write.after);
    undoResults.push({
      file: write.relativeFile,
      status: "undone",
      changed: true,
      baselineChecked: true,
      preview: {
        targetFile: write.relativeFile,
        searchSnippet: write.undoPatch.currentSnippet,
        replacementSnippet: write.undoPatch.restoreSnippet,
        explanation: write.undoPatch.explanation,
        validationCommand: write.undoPatch.validationCommand,
        expectedResult: write.undoPatch.expectedResult,
      },
    });
  }

  let validationRun = null;
  const commandId = sourceFix.validationSummary?.commandId || sourceFix.validationRun?.commandId || profile.validationCommandId;
  if (runValidation && commandId) {
    validationRun = await runApexBuilderValidationCommand({
      commandId,
      repoRoot,
      now,
      runner,
    });
  }
  const validationFailed = validationRun && validationRun.ok === false;
  const status = validationFailed ? "needs-attention" : "undone";
  const filesTouched = undoResults.filter((item) => item.changed).map((item) => item.file);
  const whatApexDid = buildControlledUndoWhatApexDid({ sourceFix, status, undoResults, validationRun });

  return {
    id: `builder-undo-${startedAt}`,
    sourceFixId: sourceFix.id || "",
    fixId: sourceFix.fixId,
    status,
    ok: !validationFailed,
    label: "Local undo",
    detail: "Apex reversed its own last successful controlled local patch after confirming the file still matched the Apex-applied baseline.",
    category: "controlled-local-undo",
    filesTouched,
    actionTaken: [
      "loaded-apex-owned-fix-receipt",
      "checked-undo-baseline",
      "reversed-controlled-exact-patch",
      ...(validationRun ? [`ran-${commandId}`] : []),
      "recorded-local-undo-receipt",
    ],
    undoResults,
    validationRun,
    validationSummary: validationRun ? {
      commandId: validationRun.commandId,
      label: validationRun.label,
      status: validationRun.status,
      ok: validationRun.ok,
    } : null,
    historyStatus: status,
    whatApexDid,
    undoAvailable: false,
    undoHint: validationFailed
      ? "Undo ran, but validation needs attention. Apex did not run a broader rollback."
      : "Apex completed the scoped local undo. No further undo is available from this receipt.",
    modelHint: sourceFix.modelHint ? { ...sourceFix.modelHint } : null,
    durationMs: Date.now() - startedAt,
    receipt: controlledUndoReceipt({ sourceFix, status, undoResults, validationRun }),
    canExecuteExternalActions: false,
    canApplyBroadPatches: false,
    controlledPatchOnly: true,
    baselineChecked: true,
    deployBlocked: true,
    productionBlocked: true,
    schemaAuthSessionBlocked: true,
    deletionBlocked: true,
    createdAt: now,
  };
}
