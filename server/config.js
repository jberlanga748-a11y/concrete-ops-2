import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, "..");
const DEFAULT_DATA_DIR = path.join(rootDir, "data");
const DEFAULT_BACKUP_DIR = path.join(DEFAULT_DATA_DIR, "backups");
const DEFAULT_PORT = 4000;
const DEFAULT_SMOKE_TEST_PORT = 4100;
const DEFAULT_SESSION_TTL_HOURS = 24 * 7;
const ALLOWED_NODE_ENVS = new Set(["development", "test", "production"]);
const ALLOWED_LOG_LEVELS = new Set(["debug", "info", "warn", "error"]);

function parseInteger(value, fieldName, fallback) {
  if (value == null || value === "") {
    return fallback;
  }

  const normalized = Number.parseInt(String(value), 10);
  if (!Number.isInteger(normalized) || normalized <= 0) {
    throw new Error(`${fieldName} must be a positive integer.`);
  }

  return normalized;
}

function parseNodeEnv(value) {
  return parseChoice(value, "NODE_ENV", ALLOWED_NODE_ENVS, "development");
}

function parseChoice(value, fieldName, allowedValues, fallback) {
  if (value == null || value === "") {
    return fallback;
  }

  const normalized = String(value).trim();
  if (!allowedValues.has(normalized)) {
    throw new Error(`${fieldName} must be one of: ${Array.from(allowedValues).join(", ")}.`);
  }

  return normalized;
}

function parseDirectory(value, fallback, fieldName) {
  if (value == null || value === "") {
    return fallback;
  }

  const normalized = String(value).trim();
  if (!normalized) {
    throw new Error(`${fieldName} must not be empty.`);
  }

  return path.isAbsolute(normalized) ? normalized : path.join(rootDir, normalized);
}

export function createServerConfig(env = process.env) {
  const nodeEnv = parseNodeEnv(env.NODE_ENV);
  const port = parseInteger(env.PORT, "PORT", DEFAULT_PORT);
  const smokeTestPort = parseInteger(env.SMOKE_TEST_PORT, "SMOKE_TEST_PORT", DEFAULT_SMOKE_TEST_PORT);
  const sessionTtlHours = parseInteger(env.SESSION_TTL_HOURS, "SESSION_TTL_HOURS", DEFAULT_SESSION_TTL_HOURS);
  const logLevel = parseChoice(env.LOG_LEVEL, "LOG_LEVEL", ALLOWED_LOG_LEVELS, "info");

  return Object.freeze({
    nodeEnv,
    logLevel,
    port,
    smokeTestPort,
    dataDir: parseDirectory(env.DATA_DIR, DEFAULT_DATA_DIR, "DATA_DIR"),
    backupDir: parseDirectory(env.BACKUP_DIR, DEFAULT_BACKUP_DIR, "BACKUP_DIR"),
    sessionTtlHours,
    sessionTtlMs: sessionTtlHours * 60 * 60 * 1000,
  });
}

export const serverConfig = createServerConfig();
