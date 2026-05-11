import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import { DatabaseSync } from "node:sqlite";

function waitForExit(childProcess) {
  return new Promise((resolve) => {
    childProcess.once("exit", resolve);
  });
}

async function run() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "concrete-ops-backup-"));
  const tempDataDir = path.join(tempRoot, "data");
  const tempBackupDir = path.join(tempRoot, "backups");
  const backupProcess = spawn(process.execPath, ["server/backup-export.js"], {
    stdio: "inherit",
    env: {
      ...process.env,
      DATA_DIR: tempDataDir,
      BACKUP_DIR: tempBackupDir,
      LOG_LEVEL: "warn",
    },
  });

  try {
    const exitCode = await waitForExit(backupProcess);
    if (exitCode !== 0) {
      throw new Error(`Backup command failed with exit code ${exitCode}.`);
    }

    const backupFiles = await fs.readdir(tempBackupDir);
    const sqliteBackupName = backupFiles.find((file) => file.endsWith(".sqlite"));
    const jsonExportName = backupFiles.find((file) => file.endsWith(".json"));

    if (!sqliteBackupName || !jsonExportName) {
      throw new Error("Expected both SQLite and JSON backup artifacts to be created.");
    }

    const sqliteBackupFile = path.join(tempBackupDir, sqliteBackupName);
    const jsonExportFile = path.join(tempBackupDir, jsonExportName);
    const exportPayload = JSON.parse(await fs.readFile(jsonExportFile, "utf8"));

    if (!Array.isArray(exportPayload.state?.leads) || exportPayload.state.leads.length < 5) {
      throw new Error("Expected JSON export to contain the seeded lead rows.");
    }

    if (!Array.isArray(exportPayload.state?.leadSources)) {
      throw new Error("Expected JSON export to include lead source records.");
    }

    if (!Array.isArray(exportPayload.state?.companySettings?.managedSetupChecklist)) {
      throw new Error("Expected JSON export to include managed setup company settings.");
    }

    const exportedJob = exportPayload.state.jobs?.[0];
    if (!exportedJob || !Array.isArray(exportedJob.startupChecklist) || !exportedJob.startupStatus) {
      throw new Error("Expected JSON export to include job startup checklist fields.");
    }

    const database = new DatabaseSync(sqliteBackupFile);
    try {
      const leadCount = database.prepare("SELECT COUNT(*) AS count FROM leads").get().count;
      if (leadCount !== exportPayload.state.leads.length) {
        throw new Error("Expected SQLite backup and JSON export to contain the same lead count.");
      }

      const leadSourceCount = database.prepare("SELECT COUNT(*) AS count FROM lead_sources").get().count;
      if (leadSourceCount !== exportPayload.state.leadSources.length) {
        throw new Error("Expected SQLite backup and JSON export to contain the same lead source count.");
      }

      const startupColumn = database.prepare("SELECT startup_status AS startupStatus FROM jobs LIMIT 1").get();
      if (!startupColumn?.startupStatus) {
        throw new Error("Expected SQLite backup to include the jobs.startup_status column.");
      }
    } finally {
      database.close();
    }

    console.log(`Backup verification passed: ${sqliteBackupName} and ${jsonExportName}`);
  } finally {
    backupProcess.kill("SIGTERM");
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
