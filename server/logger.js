import process from "node:process";
import { serverConfig } from "./config.js";

const LEVEL_PRIORITY = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function shouldLog(level) {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[serverConfig.logLevel];
}

function writeLog(level, message, meta = {}) {
  if (!shouldLog(level)) {
    return;
  }

  const payload = {
    timestamp: new Date().toISOString(),
    level,
    message,
    service: "concrete-ops-api",
    ...meta,
  };

  const stream = level === "warn" || level === "error" ? process.stderr : process.stdout;
  stream.write(`${JSON.stringify(payload)}\n`);
}

export function serializeError(error) {
  if (!(error instanceof Error)) {
    return { message: String(error) };
  }

  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
  };
}

export const logger = {
  debug(message, meta) {
    writeLog("debug", message, meta);
  },
  info(message, meta) {
    writeLog("info", message, meta);
  },
  warn(message, meta) {
    writeLog("warn", message, meta);
  },
  error(message, meta) {
    writeLog("error", message, meta);
  },
};
