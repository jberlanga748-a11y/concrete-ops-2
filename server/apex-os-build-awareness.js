import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import { buildApexOsBuildAwarenessSnapshot } from "../shared/apexOsBuildAwareness.js";

const execFileAsync = promisify(execFile);
const GIT_TIMEOUT_MS = 4000;

async function readTextIfExists(filePath) {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return "";
  }
}

async function readPackageScripts(repoRoot) {
  const text = await readTextIfExists(path.join(repoRoot, "package.json"));
  if (!text) return {};
  try {
    const parsed = JSON.parse(text);
    return parsed.scripts && typeof parsed.scripts === "object" ? parsed.scripts : {};
  } catch {
    return {};
  }
}

async function listDistAssets(repoRoot) {
  try {
    return (await fs.readdir(path.join(repoRoot, "dist", "assets"))).slice(0, 80);
  } catch {
    return [];
  }
}

async function runGit(repoRoot, args) {
  try {
    const result = await execFileAsync("git", args, {
      cwd: repoRoot,
      timeout: GIT_TIMEOUT_MS,
      windowsHide: true,
      maxBuffer: 1024 * 1024,
    });
    return { ok: true, stdout: result.stdout || "" };
  } catch (error) {
    return { ok: false, stdout: "", error: error?.message || "git command failed" };
  }
}

export async function collectApexOsBuildAwareness({ repoRoot = process.cwd(), now = new Date().toISOString() } = {}) {
  const root = path.resolve(repoRoot || process.cwd());
  const [branchResult, headResult, statusResult, logResult, packageScripts, distAssets, livingPlan, masterPlan, hardRoadmap, buildStatus] = await Promise.all([
    runGit(root, ["branch", "--show-current"]),
    runGit(root, ["rev-parse", "--short", "HEAD"]),
    runGit(root, ["status", "--porcelain=v1"]),
    runGit(root, ["log", "-5", "--oneline"]),
    readPackageScripts(root),
    listDistAssets(root),
    readTextIfExists(path.join(root, "docs", "APEX_HQ_LIVING_FINISH_PLAN.md")),
    readTextIfExists(path.join(root, "docs", "APEX_HQ_APEX_OS_COMMAND_CENTER_MASTER_PLAN.md")),
    readTextIfExists(path.join(root, "docs", "APEX_HQ_APEX_OS_HARD_FINISH_ROADMAP.md")),
    readTextIfExists(path.join(root, "docs", "APEX_HQ_BUILD_STATUS_AND_PHASES.md")),
  ]);

  const gitAvailable = Boolean(branchResult.ok && headResult.ok && statusResult.ok);
  const gitError = [branchResult, headResult, statusResult]
    .find((result) => !result.ok)?.error || "";

  return buildApexOsBuildAwarenessSnapshot({
    branch: branchResult.stdout,
    headSha: headResult.stdout,
    gitAvailable,
    gitStatusText: statusResult.stdout,
    gitError,
    recentCommitsText: logResult.stdout,
    packageScripts,
    distAssets,
    docs: {
      livingPlan,
      masterPlan,
      hardRoadmap,
      buildStatus,
    },
    runtime: {
      environment: process.env.NODE_ENV || "",
      nodeEnv: process.env.NODE_ENV || "",
      flyApp: process.env.FLY_APP_NAME || "",
      flyMachineId: process.env.FLY_MACHINE_ID || "",
    },
    collectedAt: now,
  });
}
