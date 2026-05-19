#!/usr/bin/env node
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import process from "node:process";

function waitForExit(childProcess) {
  return new Promise((resolve) => {
    childProcess.once("exit", resolve);
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function findAvailablePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => resolve(String(address.port)));
    });
  });
}

async function waitForReady(baseUrl) {
  let lastError = null;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/ready`);
      const payload = await response.json();
      if (response.ok && payload?.status === "ready" && payload?.checks?.database === "ok") {
        return payload;
      }
      lastError = new Error(`/api/ready returned HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await sleep(500);
  }

  throw new Error(`Restored server did not become ready: ${lastError?.message || "unknown error"}`);
}

async function requestJson(url) {
  const response = await fetch(url);
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(`${url} returned HTTP ${response.status}`);
  }
  return payload;
}

function newestFile(files, suffix) {
  return files
    .filter((file) => file.endsWith(suffix))
    .sort()
    .at(-1);
}

async function run() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "apex-restore-drill-"));
  const sourceDataDir = path.join(tempRoot, "source-data");
  const backupDir = path.join(tempRoot, "backups");
  const restoreDataDir = path.join(tempRoot, "restore-data");
  const port = process.env.APEX_RESTORE_DRILL_PORT || await findAvailablePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  let restoredServer = null;

  try {
    await fs.mkdir(sourceDataDir, { recursive: true });
    await fs.mkdir(backupDir, { recursive: true });
    await fs.mkdir(restoreDataDir, { recursive: true });

    const backupProcess = spawn(process.execPath, ["server/backup-export.js"], {
      stdio: "inherit",
      env: {
        ...process.env,
        DATA_DIR: sourceDataDir,
        BACKUP_DIR: backupDir,
        LOG_LEVEL: "warn",
      },
    });
    const backupExit = await waitForExit(backupProcess);
    if (backupExit !== 0) {
      throw new Error(`Backup command failed with exit code ${backupExit}.`);
    }

    const backupFiles = await fs.readdir(backupDir);
    const sqliteBackupName = newestFile(backupFiles, ".sqlite");
    const jsonExportName = newestFile(backupFiles, ".json");
    if (!sqliteBackupName || !jsonExportName) {
      throw new Error("Restore drill expected both SQLite and JSON backup artifacts.");
    }

    const sqliteBackupFile = path.join(backupDir, sqliteBackupName);
    const restoredDatabaseFile = path.join(restoreDataDir, "app-data.sqlite");
    await fs.copyFile(sqliteBackupFile, restoredDatabaseFile);

    restoredServer = spawn(process.execPath, ["server/index.js"], {
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        NODE_ENV: "development",
        PORT: port,
        DATA_DIR: restoreDataDir,
        SEED_DEMO_DATA: "false",
        LOG_LEVEL: "warn",
      },
    });

    let serverOutput = "";
    restoredServer.stdout.on("data", (chunk) => {
      serverOutput += chunk.toString();
    });
    restoredServer.stderr.on("data", (chunk) => {
      serverOutput += chunk.toString();
    });

    const ready = await waitForReady(baseUrl);
    const setupStatus = await requestJson(`${baseUrl}/api/setup/status`);
    if (setupStatus?.needsSetup !== false || setupStatus?.hasUsers !== true) {
      throw new Error("Restored database did not boot with expected existing workspace/user state.");
    }

    console.log(JSON.stringify({
      ok: true,
      status: "restore_drill_passed",
      sqliteBackup: sqliteBackupName,
      jsonExport: jsonExportName,
      ready: {
        status: ready.status,
        database: ready.checks?.database,
      },
      setup: {
        needsSetup: setupStatus.needsSetup,
        hasUsers: setupStatus.hasUsers,
        demoMode: setupStatus.demoMode,
      },
    }, null, 2));

    if (serverOutput.includes(sourceDataDir) || serverOutput.includes(restoreDataDir)) {
      throw new Error("Restore drill server output exposed a temporary filesystem path.");
    }
  } finally {
    if (restoredServer && !restoredServer.killed) {
      restoredServer.kill("SIGTERM");
      await Promise.race([waitForExit(restoredServer), sleep(2000)]);
    }
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
