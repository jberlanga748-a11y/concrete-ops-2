#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const RESERVED_APPS = new Set(["concrete-ops-2", "concrete-ops-demo"]);
const RESERVED_VOLUMES = new Set(["concrete_ops_data", "concrete_ops_demo_data"]);

function printHelp() {
  console.log(`Apex HQ customer pilot Fly config verifier

Usage:
  node scripts/verify-pilot-config.mjs --config=fly.customer-acme.toml
  node scripts/verify-pilot-config.mjs --all

Checks:
  - app is present and is not production/demo
  - mounted volume is present and is not production/demo
  - SEED_DEMO_DATA is false
  - DEMO_MODE is absent or false
  - DEMO_PACKAGE_ID is absent
  - DATA_DIR is /app/data
  - readiness check path is /api/ready

This verifier is local and read-only. It does not create Fly apps, create volumes, deploy, set secrets, or touch production.
`);
}

export function parseArgs(argv) {
  const options = {
    all: false,
    config: "",
    json: false,
    help: false,
  };

  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--all") {
      options.all = true;
    } else if (arg === "--json") {
      options.json = true;
    } else if (arg.startsWith("--config=")) {
      options.config = arg.slice("--config=".length).trim();
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function stripTomlComment(line) {
  let inQuote = false;
  let escaped = false;
  let output = "";
  for (const char of line) {
    if (escaped) {
      output += char;
      escaped = false;
      continue;
    }
    if (char === "\\") {
      output += char;
      escaped = true;
      continue;
    }
    if (char === "\"") {
      inQuote = !inQuote;
      output += char;
      continue;
    }
    if (char === "#" && !inQuote) {
      break;
    }
    output += char;
  }
  return output.trim();
}

function parseTomlValue(rawValue) {
  const value = rawValue.trim();
  if (value.startsWith("\"") && value.endsWith("\"")) {
    return value.slice(1, -1);
  }
  if (value === "true") return true;
  if (value === "false") return false;
  return value;
}

export function parsePilotConfig(content) {
  const result = {
    app: "",
    primaryRegion: "",
    env: {},
    mounts: [],
    checks: [],
  };
  let section = "";
  let currentMount = null;
  let currentCheck = null;

  for (const rawLine of content.split(/\r?\n/)) {
    const line = stripTomlComment(rawLine);
    if (!line) continue;

    const arrayTableMatch = line.match(/^\[\[(.+)]]$/);
    if (arrayTableMatch) {
      section = arrayTableMatch[1].trim();
      if (section === "mounts") {
        currentMount = {};
        result.mounts.push(currentMount);
      } else if (section === "http_service.checks") {
        currentCheck = {};
        result.checks.push(currentCheck);
      } else {
        currentMount = null;
        currentCheck = null;
      }
      continue;
    }

    const tableMatch = line.match(/^\[(.+)]$/);
    if (tableMatch) {
      section = tableMatch[1].trim();
      currentMount = null;
      currentCheck = null;
      continue;
    }

    const assignment = line.match(/^([A-Za-z0-9_.-]+)\s*=\s*(.+)$/);
    if (!assignment) continue;

    const key = assignment[1];
    const value = parseTomlValue(assignment[2]);
    if (!section && key === "app") {
      result.app = String(value);
    } else if (!section && key === "primary_region") {
      result.primaryRegion = String(value);
    } else if (section === "env") {
      result.env[key] = String(value);
    } else if (section === "mounts" && currentMount) {
      currentMount[key] = String(value);
    } else if (section === "http_service.checks" && currentCheck) {
      currentCheck[key] = String(value);
    }
  }

  return result;
}

export function verifyPilotConfig(parsed, { configPath = "" } = {}) {
  const errors = [];
  const warnings = [];
  const app = parsed.app || "";
  const volumeSources = parsed.mounts.map((mount) => mount.source).filter(Boolean);
  const readyPaths = parsed.checks.map((check) => check.path).filter(Boolean);

  if (!app) {
    errors.push("Missing top-level app name.");
  } else if (RESERVED_APPS.has(app)) {
    errors.push(`Pilot app must not use reserved app "${app}".`);
  } else if (!/^apex-hq-[a-z0-9-]+-pilot$/.test(app)) {
    warnings.push("Pilot app should follow the apex-hq-<customer>-pilot naming pattern.");
  }

  if (volumeSources.length === 0) {
    errors.push("Missing [[mounts]] source volume.");
  }
  for (const source of volumeSources) {
    if (RESERVED_VOLUMES.has(source)) {
      errors.push(`Pilot volume must not use reserved volume "${source}".`);
    } else if (!/^apex_hq_[a-z0-9_]+_pilot_data$/.test(source)) {
      warnings.push(`Volume "${source}" should follow the apex_hq_<customer>_pilot_data naming pattern.`);
    }
  }

  if (parsed.env.SEED_DEMO_DATA !== "false") {
    errors.push("SEED_DEMO_DATA must be set to \"false\".");
  }
  if (parsed.env.DEMO_MODE && parsed.env.DEMO_MODE !== "false") {
    errors.push("DEMO_MODE must be absent or set to \"false\".");
  }
  if (parsed.env.DEMO_PACKAGE_ID) {
    errors.push("DEMO_PACKAGE_ID must not be set for customer pilot configs.");
  }
  if (parsed.env.DATA_DIR !== "/app/data") {
    errors.push("DATA_DIR must be set to \"/app/data\".");
  }
  if (!readyPaths.includes("/api/ready")) {
    errors.push("At least one http_service check must target /api/ready.");
  }
  if (configPath && path.basename(configPath) === "fly.toml") {
    errors.push("Do not use production fly.toml as a customer pilot config.");
  }
  if (configPath && path.basename(configPath) === "fly.demo.toml") {
    errors.push("Do not use demo fly.demo.toml as a customer pilot config.");
  }

  return {
    ok: errors.length === 0,
    app,
    volumeSources,
    primaryRegion: parsed.primaryRegion || "",
    errors,
    warnings,
  };
}

export function isPilotConfigFile(fileName) {
  return /^fly\.customer.+\.toml$/i.test(fileName) || /^fly\.pilot.+\.toml$/i.test(fileName);
}

export async function findPilotConfigFiles(rootDir = process.cwd()) {
  const entries = await fs.readdir(rootDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && isPilotConfigFile(entry.name))
    .map((entry) => path.join(rootDir, entry.name))
    .sort();
}

async function verifyConfigFile(configPath) {
  const resolvedConfigPath = path.resolve(configPath);
  const content = await fs.readFile(resolvedConfigPath, "utf8");
  return {
    configPath: resolvedConfigPath,
    ...verifyPilotConfig(parsePilotConfig(content), { configPath: resolvedConfigPath }),
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }
  if (options.all && options.config) {
    throw new Error("Use either --all or --config=<path>, not both.");
  }
  if (!options.config && !options.all) {
    throw new Error("Missing --config=<path> or --all.");
  }

  if (options.all) {
    const configs = [];
    for (const configPath of await findPilotConfigFiles()) {
      configs.push(await verifyConfigFile(configPath));
    }
    const report = {
      ok: configs.every((entry) => entry.ok),
      checked: configs.length,
      configs,
    };
    if (options.json) {
      console.log(JSON.stringify(report, null, 2));
    } else if (report.ok) {
      console.log(`Pilot config scan passed: ${configs.length} config(s) checked.`);
    } else {
      console.error("Pilot config scan failed.");
      for (const entry of configs.filter((item) => !item.ok)) {
        console.error(`\n${entry.configPath}`);
        for (const error of entry.errors) console.error(`- ${error}`);
      }
    }
    if (!report.ok) {
      process.exitCode = 1;
    }
    return;
  }

  const report = await verifyConfigFile(options.config);

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else if (report.ok) {
    console.log(`Pilot config passed: ${options.config}`);
    if (report.warnings.length > 0) {
      console.log("Warnings:");
      for (const warning of report.warnings) console.log(`- ${warning}`);
    }
  } else {
    console.error(`Pilot config failed: ${options.config}`);
    for (const error of report.errors) console.error(`- ${error}`);
    if (report.warnings.length > 0) {
      console.error("Warnings:");
      for (const warning of report.warnings) console.error(`- ${warning}`);
    }
  }

  if (!report.ok) {
    process.exitCode = 1;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
