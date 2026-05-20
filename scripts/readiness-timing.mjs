#!/usr/bin/env node
import { pathToFileURL } from "node:url";
import process from "node:process";

const DEFAULT_BASE_URL = "https://app.apexhq.online/";
const DEFAULT_SAMPLES = 3;
const DEFAULT_DELAY_MS = 500;
const DEFAULT_ENDPOINTS = ["/api/health", "/api/ready"];

function printHelp() {
  console.log(`Apex HQ readiness timing check

Usage:
  node scripts/readiness-timing.mjs --base-url=https://app.apexhq.online --samples=3 --json

Flags:
  --base-url=<url>       Hosted app URL to check. Default: ${DEFAULT_BASE_URL}
  --samples=<count>      Number of samples per endpoint. Default: ${DEFAULT_SAMPLES}
  --delay-ms=<ms>        Delay between samples. Default: ${DEFAULT_DELAY_MS}
  --endpoints=<csv>      Endpoints to check. Default: ${DEFAULT_ENDPOINTS.join(",")}
  --json                 Print JSON only.
  --help                 Print this help.

Safety:
  This script performs GET requests only. It does not authenticate, deploy, mutate data, change Fly config, read secrets, export data, or run cleanup.
`);
}

function parsePositiveInteger(value, label) {
  const parsed = Number.parseInt(String(value || ""), 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`--${label} must be a positive integer.`);
  }
  return parsed;
}

function parseEndpointList(value) {
  return String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      if (!entry.startsWith("/")) {
        throw new Error(`Endpoint must start with "/": ${entry}`);
      }
      if (entry.includes("..") || entry.includes("?") || entry.includes("#")) {
        throw new Error(`Endpoint must be a simple absolute path: ${entry}`);
      }
      return entry;
    });
}

export function parseReadinessTimingArgs(argv = []) {
  const options = {
    baseUrl: DEFAULT_BASE_URL,
    samples: DEFAULT_SAMPLES,
    delayMs: DEFAULT_DELAY_MS,
    endpoints: [...DEFAULT_ENDPOINTS],
    json: false,
    help: false,
  };

  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--json") {
      options.json = true;
    } else if (arg.startsWith("--base-url=")) {
      options.baseUrl = arg.slice("--base-url=".length);
    } else if (arg.startsWith("--samples=")) {
      options.samples = parsePositiveInteger(arg.slice("--samples=".length), "samples");
    } else if (arg.startsWith("--delay-ms=")) {
      options.delayMs = parsePositiveInteger(arg.slice("--delay-ms=".length), "delay-ms");
    } else if (arg.startsWith("--endpoints=")) {
      options.endpoints = parseEndpointList(arg.slice("--endpoints=".length));
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  const parsedUrl = new URL(options.baseUrl);
  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error("--base-url must use http or https.");
  }
  options.baseUrl = parsedUrl.toString();

  if (options.endpoints.length === 0) {
    throw new Error("At least one endpoint is required.");
  }

  return options;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestEndpoint(baseUrl, endpoint) {
  const url = new URL(endpoint, baseUrl);
  const startedAt = performance.now();
  const response = await fetch(url);
  const text = await response.text();
  const durationMs = Math.round(performance.now() - startedAt);
  let payload = null;

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { raw: text.slice(0, 200) };
    }
  }

  return {
    endpoint,
    status: response.status,
    ok: response.ok,
    durationMs,
    readyStatus: payload?.status || null,
    database: payload?.checks?.database || null,
    timestamp: payload?.timestamp || null,
    requestId: payload?.requestId || null,
  };
}

export function summarizeTiming(samples) {
  const durations = samples
    .map((sample) => Number(sample.durationMs))
    .filter((duration) => Number.isFinite(duration))
    .sort((a, b) => a - b);

  const first = samples[0]?.durationMs ?? null;
  const last = samples.at(-1)?.durationMs ?? null;
  const min = durations[0] ?? null;
  const max = durations.at(-1) ?? null;
  const average = durations.length
    ? Math.round(durations.reduce((sum, duration) => sum + duration, 0) / durations.length)
    : null;

  return { first, last, min, max, average };
}

export async function runReadinessTiming(options) {
  const checks = [];

  for (const endpoint of options.endpoints) {
    for (let sample = 1; sample <= options.samples; sample += 1) {
      const result = await requestEndpoint(options.baseUrl, endpoint);
      checks.push({ ...result, sample });
      if (!result.ok) {
        throw new Error(`${endpoint} sample ${sample} returned HTTP ${result.status}.`);
      }
      if (endpoint === "/api/ready" && result.database !== "ok") {
        throw new Error(`${endpoint} sample ${sample} did not report database ok.`);
      }
      if (sample < options.samples) {
        await sleep(options.delayMs);
      }
    }
  }

  const summary = Object.fromEntries(options.endpoints.map((endpoint) => {
    const endpointSamples = checks.filter((check) => check.endpoint === endpoint);
    return [endpoint, summarizeTiming(endpointSamples)];
  }));

  return {
    ok: true,
    baseUrl: options.baseUrl,
    samplesPerEndpoint: options.samples,
    delayMs: options.delayMs,
    checkedAt: new Date().toISOString(),
    checks,
    summary,
  };
}

function printReport(report) {
  console.log(`Apex HQ readiness timing: ${report.baseUrl}`);
  for (const [endpoint, summary] of Object.entries(report.summary)) {
    console.log(`${endpoint}: first ${summary.first}ms, min ${summary.min}ms, max ${summary.max}ms, avg ${summary.average}ms`);
  }
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  try {
    const options = parseReadinessTimingArgs(process.argv.slice(2));
    if (options.help) {
      printHelp();
      process.exit(0);
    }
    const report = await runReadinessTiming(options);
    if (options.json) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      printReport(report);
    }
  } catch (error) {
    console.error(error.message || error);
    process.exitCode = 1;
  }
}
