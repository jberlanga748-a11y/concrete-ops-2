import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PACKAGE_IDS, PACKAGE_ORDER } from "../shared/packages.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, "..");
const DEFAULT_DATA_DIR = path.join(rootDir, "data");
const DEFAULT_BACKUP_DIR = path.join(DEFAULT_DATA_DIR, "backups");
const DEFAULT_PORT = 4000;
const DEFAULT_SMOKE_TEST_PORT = 4100;
const DEFAULT_SESSION_TTL_HOURS = 24 * 7;
const ALLOWED_NODE_ENVS = new Set(["development", "test", "production"]);
const ALLOWED_LOG_LEVELS = new Set(["debug", "info", "warn", "error"]);
const ALLOWED_DATA_PROVIDERS = new Set(["sqlite", "postgres"]);
const ALLOWED_POSTGRES_SSL_MODES = new Set(["require", "disable"]);
const DEFAULT_PRODUCTION_CORS_ORIGINS = Object.freeze([
  "https://app.apexhq.online",
  "https://concrete-ops-2.fly.dev",
]);

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

function parseNonNegativeInteger(value, fieldName, fallback) {
  if (value == null || value === "") {
    return fallback;
  }

  const normalized = Number.parseInt(String(value), 10);
  if (!Number.isInteger(normalized) || normalized < 0) {
    throw new Error(`${fieldName} must be a non-negative integer.`);
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

function parseDemoPackageId(value) {
  if (value == null || value === "") {
    return PACKAGE_IDS.PREMIUM;
  }

  const normalized = String(value).trim().toLowerCase();
  if (!PACKAGE_ORDER.includes(normalized)) {
    throw new Error(`DEMO_PACKAGE_ID must be one of: ${PACKAGE_ORDER.join(", ")}.`);
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

function parseOriginList(value, fieldName, fallback = []) {
  if (value == null || value === "") {
    return fallback;
  }

  const origins = String(value)
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  for (const origin of origins) {
    if (origin === "*") {
      throw new Error(`${fieldName} must list explicit origins; wildcard CORS is not allowed.`);
    }
    try {
      const parsed = new URL(origin);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        throw new Error("invalid protocol");
      }
    } catch {
      throw new Error(`${fieldName} contains an invalid origin: ${origin}.`);
    }
  }

  return Object.freeze([...new Set(origins)]);
}

function parsePostgresUrl(value, fieldName) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(`${fieldName} must be a valid postgres connection URL.`);
  }
  if (!["postgres:", "postgresql:"].includes(parsed.protocol)) {
    throw new Error(`${fieldName} must use the postgres:// or postgresql:// protocol.`);
  }
  if (!parsed.hostname) {
    throw new Error(`${fieldName} must include a host.`);
  }
  return raw;
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
  const trustProxyHops = parseNonNegativeInteger(
    env.TRUST_PROXY_HOPS,
    "TRUST_PROXY_HOPS",
    nodeEnv === "production" ? 1 : 0,
  );
  const logLevel = parseChoice(env.LOG_LEVEL, "LOG_LEVEL", ALLOWED_LOG_LEVELS, "info");
  const dataProvider = parseChoice(env.DATA_PROVIDER, "DATA_PROVIDER", ALLOWED_DATA_PROVIDERS, "sqlite");
  const postgresDatabaseUrl = parsePostgresUrl(env.DATABASE_URL || env.POSTGRES_DATABASE_URL, "DATABASE_URL");
  if (dataProvider === "postgres") {
    if (!postgresDatabaseUrl) {
      throw new Error("DATA_PROVIDER=postgres requires DATABASE_URL or POSTGRES_DATABASE_URL.");
    }
  }
  const postgresSslMode = parseChoice(env.POSTGRES_SSL_MODE, "POSTGRES_SSL_MODE", ALLOWED_POSTGRES_SSL_MODES, "require");
  const postgresPoolMax = parseInteger(env.POSTGRES_POOL_MAX, "POSTGRES_POOL_MAX", 5);
  const demoMode = parseBoolean(env.DEMO_MODE, "DEMO_MODE", false);
  const demoPackageId = parseDemoPackageId(env.DEMO_PACKAGE_ID);
  const seedWorkspaceData = nodeEnv !== "production";
  const seedDemoDataRequested = parseBoolean(env.SEED_DEMO_DATA, "SEED_DEMO_DATA", demoMode);
  const seedDemoData = demoMode || (seedDemoDataRequested && nodeEnv !== "production");
  const publicEstimateRequestEnabled = parseBoolean(
    env.PUBLIC_ESTIMATE_REQUEST_ENABLED,
    "PUBLIC_ESTIMATE_REQUEST_ENABLED",
    demoMode,
  );
  const publicSignupEnabled = parseBoolean(
    env.PUBLIC_SIGNUP_ENABLED,
    "PUBLIC_SIGNUP_ENABLED",
    false,
  );
  const bootstrapAdmin = resolveBootstrapAdmin(env);
  const corsAllowedOrigins = parseOriginList(
    env.CORS_ALLOWED_ORIGINS,
    "CORS_ALLOWED_ORIGINS",
    nodeEnv === "production" ? DEFAULT_PRODUCTION_CORS_ORIGINS : [],
  );

  return Object.freeze({
    nodeEnv,
    logLevel,
    port,
    smokeTestPort,
    dataDir: parseDirectory(env.DATA_DIR, DEFAULT_DATA_DIR, "DATA_DIR"),
    backupDir: parseDirectory(env.BACKUP_DIR, DEFAULT_BACKUP_DIR, "BACKUP_DIR"),
    dataProvider,
    postgresDatabaseUrl,
    postgresSslMode,
    postgresPoolMax,
    demoMode,
    demoPackageId,
    seedWorkspaceData,
    seedDemoData,
    seedDemoDataRequested,
    publicEstimateRequestEnabled,
    publicSignupEnabled,
    corsAllowedOrigins,
    bootstrapAdmin,
    sessionTtlHours,
    sessionTtlMs: sessionTtlHours * 60 * 60 * 1000,
    trustProxyHops,
  });
}

export const serverConfig = createServerConfig();
