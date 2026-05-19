import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";
import process from "node:process";

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

function runCommand(args) {
  return new Promise((resolve, reject) => {
    const { command, commandArgs, npmCommand } = resolveNpmInvocation(args);

    const child = spawn(command, commandArgs, {
      cwd: process.cwd(),
      env: process.env,
      stdio: "inherit",
      shell: false,
    });

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${npmCommand} ${args.join(" ")} failed${signal ? ` with signal ${signal}` : ` with code ${code}`}.`));
    });
  });
}

export async function runVisualPolishFullAudit() {
  for (const args of visualPolishFullAuditCommands) {
    await runCommand(args);
  }
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  await runVisualPolishFullAudit();
}
