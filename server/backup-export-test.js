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
  const uploadFixtureDir = path.join(tempDataDir, "uploads");
  const uploadFixtureName = "build-zero-proof.txt";
  const uploadFixtureBody = "uploaded file backup fixture";
  await fs.mkdir(uploadFixtureDir, { recursive: true });
  await fs.writeFile(path.join(uploadFixtureDir, uploadFixtureName), uploadFixtureBody, "utf8");

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
    const sqliteBackupName = backupFiles.find((file) => file.startsWith("app-data-") && file.endsWith(".sqlite"));
    const jsonExportName = backupFiles.find((file) => file.startsWith("app-data-") && file.endsWith(".json"));
    const uploadManifestName = backupFiles.find((file) => file.endsWith(".manifest.json"));
    const uploadBackupName = backupFiles.find((file) => file.startsWith("uploads-") && !file.endsWith(".json"));

    if (!sqliteBackupName || !jsonExportName || !uploadManifestName || !uploadBackupName) {
      throw new Error("Expected SQLite, JSON, upload manifest, and uploaded-file backup artifacts to be created.");
    }

    const sqliteBackupFile = path.join(tempBackupDir, sqliteBackupName);
    const jsonExportFile = path.join(tempBackupDir, jsonExportName);
    const uploadManifestFile = path.join(tempBackupDir, uploadManifestName);
    const uploadedFileBackup = path.join(tempBackupDir, uploadBackupName, uploadFixtureName);
    const exportPayload = JSON.parse(await fs.readFile(jsonExportFile, "utf8"));
    const uploadManifest = JSON.parse(await fs.readFile(uploadManifestFile, "utf8"));

    if (!Array.isArray(exportPayload.state?.leads) || exportPayload.state.leads.length < 5) {
      throw new Error("Expected JSON export to contain the seeded lead rows.");
    }

    if (exportPayload.uploadBackup?.fileCount !== 1 || uploadManifest.fileCount !== 1) {
      throw new Error("Expected backup metadata to include uploaded file coverage.");
    }

    if (!uploadManifest.files.some((file) => file.path === uploadFixtureName && file.size === uploadFixtureBody.length)) {
      throw new Error("Expected upload manifest to include the uploaded fixture file.");
    }

    if (await fs.readFile(uploadedFileBackup, "utf8") !== uploadFixtureBody) {
      throw new Error("Expected uploaded file artifact to preserve file contents.");
    }

    if (!Array.isArray(exportPayload.state?.leadSources)) {
      throw new Error("Expected JSON export to include lead source records.");
    }

    if (!Array.isArray(exportPayload.state?.contactHistory)) {
      throw new Error("Expected JSON export to include contact history records.");
    }

    if (!Array.isArray(exportPayload.state?.companies) || !exportPayload.state.companies.some((company) => company.id === "COMPANY-DEFAULT")) {
      throw new Error("Expected JSON export to include the default company workspace.");
    }

    if (exportPayload.state?.currentCompanyId !== "COMPANY-DEFAULT") {
      throw new Error("Expected JSON export to include the current default company workspace id.");
    }

    if (!exportPayload.state.leads.every((lead) => lead.companyId === "COMPANY-DEFAULT")) {
      throw new Error("Expected exported lead rows to include a default company id.");
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

      const contactHistoryCount = database.prepare("SELECT COUNT(*) AS count FROM contact_history").get().count;
      if (contactHistoryCount !== exportPayload.state.contactHistory.length) {
        throw new Error("Expected SQLite backup and JSON export to contain the same contact history count.");
      }

      const companyCount = database.prepare("SELECT COUNT(*) AS count FROM companies").get().count;
      if (companyCount !== exportPayload.state.companies.length) {
        throw new Error("Expected SQLite backup and JSON export to contain the same company count.");
      }

      const leadCompany = database.prepare("SELECT company_id AS companyId FROM leads LIMIT 1").get();
      if (leadCompany?.companyId !== "COMPANY-DEFAULT") {
        throw new Error("Expected SQLite backup to include default lead company ownership.");
      }

      const startupColumn = database.prepare("SELECT startup_status AS startupStatus FROM jobs LIMIT 1").get();
      if (!startupColumn?.startupStatus) {
        throw new Error("Expected SQLite backup to include the jobs.startup_status column.");
      }
    } finally {
      database.close();
    }

    console.log(`Backup verification passed: ${sqliteBackupName}, ${jsonExportName}, ${uploadManifestName}, and ${uploadBackupName}`);
  } finally {
    backupProcess.kill("SIGTERM");
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
