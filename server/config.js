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

function parseBoolean(value, fieldName, fallback) {
  if (value == null || value === "") {
    return fallback;
  }

  const normalized = String(value).trim().toLowerCase();
  if (["true", "1", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["false", "0", "no", "off"].includes(normalized)) {
    return false;
  }

  throw new Error(`${fieldName} must be true or false.`);
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

function resolveBootstrapAdmin(env) {
  const email = String(env.BOOTSTRAP_ADMIN_EMAIL || "").trim().toLowerCase();
  const password = String(env.BOOTSTRAP_ADMIN_PASSWORD || "").trim();

  if (!email && !password) {
    return null;
  }

  if (!email || !password) {
    throw new Error("BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD must be provided together.");
  }

  if (password.length < 8) {
    throw new Error("BOOTSTRAP_ADMIN_PASSWORD must be at least 8 characters.");
  }

  return Object.freeze({
    email,
    password,
    name: String(env.BOOTSTRAP_ADMIN_NAME || "Operations Admin").trim() || "Operations Admin",
    role: String(env.BOOTSTRAP_ADMIN_ROLE || "Administrator").trim() || "Administrator",
  });
}

export function createServerConfig(env = process.env) {
  const nodeEnv = parseNodeEnv(env.NODE_ENV);
  const port = parseInteger(env.PORT, "PORT", DEFAULT_PORT);
  const smokeTestPort = parseInteger(env.SMOKE_TEST_PORT, "SMOKE_TEST_PORT", DEFAULT_SMOKE_TEST_PORT);
  const sessionTtlHours = parseInteger(env.SESSION_TTL_HOURS, "SESSION_TTL_HOURS", DEFAULT_SESSION_TTL_HOURS);
  const logLevel = parseChoice(env.LOG_LEVEL, "LOG_LEVEL", ALLOWED_LOG_LEVELS, "info");
  const seedDemoData = parseBoolean(env.SEED_DEMO_DATA, "SEED_DEMO_DATA", nodeEnv !== "production");
  const bootstrapAdmin = resolveBootstrapAdmin(env);

  return Object.freeze({
    nodeEnv,
    logLevel,
    port,
    smokeTestPort,
    dataDir: parseDirectory(env.DATA_DIR, DEFAULT_DATA_DIR, "DATA_DIR"),
    backupDir: parseDirectory(env.BACKUP_DIR, DEFAULT_BACKUP_DIR, "BACKUP_DIR"),
    seedDemoData,
    bootstrapAdmin,
    sessionTtlHours,
    sessionTtlMs: sessionTtlHours * 60 * 60 * 1000,
  });
}

export const serverConfig = createServerConfig();
