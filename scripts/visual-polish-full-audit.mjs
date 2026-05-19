import { spawn } from "node:child_process";
import process from "node:process";

const isWindows = process.platform === "win32";
const npmCommand = isWindows ? "npm.cmd" : "npm";

const commands = [
  ["run", "audit:visual-polish:chromium"],
  ["run", "audit:visual-polish:tablet"],
];

function runCommand(args) {
  return new Promise((resolve, reject) => {
    const command = isWindows ? "cmd.exe" : npmCommand;
    const commandArgs = isWindows
      ? ["/d", "/s", "/c", [npmCommand, ...args].join(" ")]
      : args;

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

for (const args of commands) {
  await runCommand(args);
}
