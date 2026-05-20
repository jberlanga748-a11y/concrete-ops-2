import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";
import process from "node:process";

export const DEFAULT_VISUAL_AUDIT_STEP_TIMEOUT_MS = 180_000;

export const visualPolishFullAuditCommands = [
  ["run", "audit:visual-polish:chromium"],
  ["run", "audit:visual-polish:tablet"],
];

export function resolveNpmInvocation(args, platform = process.platform) {
  const isWindows = platform === "win32";
  const npmCommand = isWindows ? "npm.cmd" : "npm";
  const command = isWindows ? "cmd.exe" : npmCommand;
  const commandArgs = isWindows
    ? ["/d", "/s", "/c", [npmCommand, ...args].join(" ")]
    : args;

  return { command, commandArgs, npmCommand };
}

function terminateProcessTree(child) {
  if (!child?.pid) return;
  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], { stdio: "ignore", shell: false });
    return;
  }
  child.kill("SIGTERM");
}

export function runVisualPolishCommand(args, { timeoutMs = DEFAULT_VISUAL_AUDIT_STEP_TIMEOUT_MS } = {}) {
  return new Promise((resolve, reject) => {
    const { command, commandArgs, npmCommand } = resolveNpmInvocation(args);
    let settled = false;

    const child = spawn(command, commandArgs, {
      cwd: process.cwd(),
      env: process.env,
      stdio: "inherit",
      shell: false,
    });

    const timeoutId = setTimeout(() => {
      if (settled) return;
      settled = true;
      terminateProcessTree(child);
      reject(new Error(`${npmCommand} ${args.join(" ")} timed out after ${timeoutMs}ms.`));
    }, timeoutMs);

    child.on("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      reject(error);
    });
    child.on("exit", (code, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${npmCommand} ${args.join(" ")} failed${signal ? ` with signal ${signal}` : ` with code ${code}`}.`));
    });
  });
}

export async function runVisualPolishCommandSequence(commands, options = {}) {
  for (const args of commands) {
    await runVisualPolishCommand(args, options);
  }
}

export async function runVisualPolishFullAudit() {
  await runVisualPolishCommandSequence(visualPolishFullAuditCommands, { timeoutMs: 420_000 });
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  await runVisualPolishFullAudit();
}
