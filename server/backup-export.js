import process from "node:process";

import { createBackupArtifacts } from "./store.js";
import { logger, serializeError } from "./logger.js";

try {
  const result = await createBackupArtifacts();
  logger.info("Database backup/export created", result);
} catch (error) {
  logger.error("Database backup/export failed", {
    error: serializeError(error),
  });
  process.exitCode = 1;
}
