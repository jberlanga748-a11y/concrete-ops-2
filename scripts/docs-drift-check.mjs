import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const repoRoot = process.cwd();

const scanRoots = [
  repoRoot,
  path.join(repoRoot, "docs"),
];

const forbidden = [
  {
    pattern: /apexdemo123/i,
    message: "Do not store the shared demo password in repository docs.",
  },
  {
    pattern: /Status:\s*guided-demo ready after live v\d+/i,
    message: "Do not hard-code historical Fly release readiness in active demo docs.",
  },
  {
    pattern: /Demo readiness is live-confirmed through production v\d+/i,
    message: "Use the current tracker and smoke runbooks instead of historical release readiness claims.",
  },
  {
    pattern: /Latest runtime release tracked:/i,
    message: "Use the command binder current-state guidance and build tracker instead of stale embedded release labels.",
  },
  {
    pattern: /Latest source-control tooling commit tracked:/i,
    message: "Use git/GitHub HEAD for source-control-only state instead of self-staling commit labels.",
  },
  {
    pattern: /^\s*-\s*Machine is running\s*$/i,
    message: "Production Fly machines may auto-stop when idle; do not claim the machine is always running.",
  },
  {
    pattern: /Docker health checks use `\/api\/health`|Docker health checks use \/api\/health|Aligning Docker to readiness is a later hardening task/i,
    message: "Docker health checks now target /api/ready; do not reintroduce stale healthcheck alignment wording.",
  },
];

const allowedRootFiles = new Set([
  "README.md",
  "DEMO.md",
  "CUSTOMER_PILOT_SETUP.md",
  "MANUAL_PILOT_SMOKE_TEST.md",
  "APEX_HQ_MASTER_CHECKLIST.md",
]);

async function listMarkdownFiles(root) {
  const entries = await fs.readdir(root, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(root, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === "docs") {
        continue;
      }
      if (root === repoRoot) {
        continue;
      }
      files.push(...await listMarkdownFiles(fullPath));
      continue;
    }

    if (!entry.isFile() || !entry.name.endsWith(".md")) {
      continue;
    }

    if (root === repoRoot && !allowedRootFiles.has(entry.name)) {
      continue;
    }

    files.push(fullPath);
  }

  return files;
}

function relativePath(file) {
  return path.relative(repoRoot, file).replaceAll(path.sep, "/");
}

const files = [];
for (const root of scanRoots) {
  files.push(...await listMarkdownFiles(root));
}

const findings = [];

for (const file of files) {
  const content = await fs.readFile(file, "utf8");
  const lines = content.split(/\r?\n/);

  for (const rule of forbidden) {
    lines.forEach((line, index) => {
      if (rule.pattern.test(line)) {
        findings.push(`${relativePath(file)}:${index + 1}: ${rule.message}`);
      }
    });
  }
}

if (findings.length) {
  console.error("Docs drift check failed:");
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
  process.exit(1);
}

console.log(`Docs drift check passed (${files.length} markdown files scanned).`);
