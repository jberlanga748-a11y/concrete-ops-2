#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { parsePilotConfig, verifyPilotConfig } from "./verify-pilot-config.mjs";

function printHelp() {
  console.log(`Apex HQ customer pilot Fly config generator

Usage:
  node scripts/create-pilot-config.mjs --slug=acme-contracting
  node scripts/create-pilot-config.mjs --slug=acme-contracting --min-machines-running=1

Options:
  --slug=<customer-slug>        Lowercase customer slug used in app and volume names.
  --region=<region>            Fly region. Default: sjc.
  --output=<path>              Output path. Default: fly.customer-<slug>.toml.
  --min-machines-running=<0|1>  Default: 0. Use 1 only after the cold-start decision gate.
  --force                      Overwrite an existing output file.
  --json                       Print JSON summary.
  --help                       Print this help.

Safety:
  This only writes a local config file and verifies it.
  It does not create Fly apps, create volumes, deploy, set secrets, or touch production.
`);
}

export function normalizePilotSlug(input) {
  const slug = String(input || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
  if (!slug || slug.length < 2) {
    throw new Error("Pilot slug must contain at least two alphanumeric characters.");
  }
  if (slug === "demo" || slug === "prod" || slug === "production") {
    throw new Error(`Pilot slug "${slug}" is reserved.`);
  }
  return slug;
}

function parseArgs(argv) {
  const options = {
    slug: "",
    region: "sjc",
    output: "",
    minMachinesRunning: 0,
    force: false,
    json: false,
    help: false,
  };

  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--force") {
      options.force = true;
    } else if (arg === "--json") {
      options.json = true;
    } else if (arg.startsWith("--slug=")) {
      options.slug = arg.slice("--slug=".length);
    } else if (arg.startsWith("--region=")) {
      options.region = arg.slice("--region=".length).trim();
    } else if (arg.startsWith("--output=")) {
      options.output = arg.slice("--output=".length).trim();
    } else if (arg.startsWith("--min-machines-running=")) {
      const value = Number.parseInt(arg.slice("--min-machines-running=".length), 10);
      if (![0, 1].includes(value)) {
        throw new Error("--min-machines-running must be 0 or 1.");
      }
      options.minMachinesRunning = value;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

export function buildPilotConfig({ slug, region = "sjc", minMachinesRunning = 0 }) {
  const normalizedSlug = normalizePilotSlug(slug);
  const volumeSlug = normalizedSlug.replaceAll("-", "_");
  const appName = `apex-hq-${normalizedSlug}-pilot`;
  const volumeName = `apex_hq_${volumeSlug}_pilot_data`;

  return {
    appName,
    volumeName,
    fileName: `fly.customer-${normalizedSlug}.toml`,
    content: `# Customer pilot app only. Do not use for demo or production.
app = "${appName}"
primary_region = "${region}"

[build]
  dockerfile = "Dockerfile"

[env]
  NODE_ENV = "production"
  PORT = "4000"
  DATA_DIR = "/app/data"
  LOG_LEVEL = "info"
  SEED_DEMO_DATA = "false"

[http_service]
  internal_port = 4000
  force_https = true
  auto_start_machines = true
  auto_stop_machines = "stop"
  min_machines_running = ${minMachinesRunning}

  [http_service.concurrency]
    type = "requests"
    soft_limit = 100
    hard_limit = 150

[[http_service.checks]]
  interval = "15s"
  timeout = "5s"
  grace_period = "20s"
  method = "GET"
  path = "/api/ready"
  protocol = "http"
  [http_service.checks.headers]
    X-Forwarded-Proto = "https"

[[mounts]]
  source = "${volumeName}"
  destination = "/app/data"
  initial_size = "1gb"
`,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const config = buildPilotConfig(options);
  const outputPath = path.resolve(options.output || config.fileName);
  if (!options.force) {
    try {
      await fs.stat(outputPath);
      throw new Error(`Refusing to overwrite existing file: ${outputPath}. Use --force to replace it.`);
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }

  const report = verifyPilotConfig(parsePilotConfig(config.content), { configPath: outputPath });
  if (!report.ok) {
    throw new Error(`Generated pilot config did not pass verification: ${report.errors.join("; ")}`);
  }

  await fs.writeFile(outputPath, config.content, "utf8");
  const result = {
    ok: true,
    outputPath,
    appName: config.appName,
    volumeName: config.volumeName,
    minMachinesRunning: options.minMachinesRunning,
    verification: report,
  };

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`Created ${outputPath}`);
    console.log(`App: ${config.appName}`);
    console.log(`Volume: ${config.volumeName}`);
    console.log("Next: create the Fly app and volume only after the pilot setup checklist is approved.");
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
