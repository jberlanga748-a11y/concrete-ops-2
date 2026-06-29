import fs from "node:fs/promises";
import path from "node:path";

import {
  buildApexLocalAgentBenchmarkHistorySummary,
} from "../shared/apexLocalAgentSpeed.js";

export const APEX_LOCAL_AGENT_SPEED_HISTORY_DIRS = Object.freeze([
  "apex-local-agent-speed-v1-3",
  "apex-local-agent-speed-v1-2",
  "apex-local-agent-speed-v1-1",
]);

function text(value = "", limit = 240) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, limit);
}

function safeOutputRoot(value = "") {
  const root = path.resolve(value || path.join(process.cwd(), "outputs"));
  return root;
}

async function readJsonFile(file) {
  const content = await fs.readFile(file, "utf8");
  return JSON.parse(content);
}

async function listReceiptFiles(root) {
  const files = [];
  for (const dirName of APEX_LOCAL_AGENT_SPEED_HISTORY_DIRS) {
    const dir = path.join(root, dirName);
    let children = [];
    try {
      children = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const child of children) {
      if (!child.isDirectory()) continue;
      const folder = path.join(dir, child.name);
      const receiptFile = path.join(folder, "receipts.json");
      try {
        const stat = await fs.stat(receiptFile);
        files.push(Object.freeze({
          file: receiptFile,
          mtimeMs: stat.mtimeMs,
        }));
      } catch {
        // Ignore incomplete benchmark output folders.
      }
    }
  }
  return files.sort((left, right) => right.mtimeMs - left.mtimeMs);
}

export async function readApexLocalAgentSpeedBenchmarkHistory(input = {}) {
  const outputRoot = safeOutputRoot(input.outputRoot);
  const maxFiles = Math.max(1, Math.min(12, Math.round(Number(input.maxFiles || 4) || 4)));
  const maxReceipts = Math.max(1, Math.min(120, Math.round(Number(input.maxReceipts || 50) || 50)));
  const files = await listReceiptFiles(outputRoot);
  const receipts = [];
  const sources = [];

  for (const row of files.slice(0, maxFiles)) {
    try {
      const payload = await readJsonFile(row.file);
      const rows = Array.isArray(payload?.receipts) ? payload.receipts : Array.isArray(payload) ? payload : [];
      receipts.push(...rows);
      sources.push(text(path.relative(outputRoot, row.file).replace(/\\/g, "/"), 240));
    } catch {
      // A corrupt local benchmark receipt should not break Apex status.
    }
    if (receipts.length >= maxReceipts) break;
  }

  const summary = buildApexLocalAgentBenchmarkHistorySummary({
    receipts: receipts.slice(-maxReceipts),
  });
  return Object.freeze({
    ...summary,
    sourceCount: sources.length,
    sources: Object.freeze(sources.slice(0, maxFiles)),
    outputRootExposed: false,
    localOnly: true,
    benchmarksRunAutomatically: false,
  });
}
