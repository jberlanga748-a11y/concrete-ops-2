import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  checkPaidPilotCloseReadiness,
  REQUIRED_CLOSE_PACKET_PATTERNS,
  REQUIRED_PILOT_CLOSE_FILES,
} from "./paid-pilot-close-readiness.mjs";

test("paid pilot close packet covers Build 1A required gates", () => {
  const result = checkPaidPilotCloseReadiness();

  assert.equal(result.ok, true, result.failures.join("\n"));
  assert.deepEqual(result.files, REQUIRED_PILOT_CLOSE_FILES);
  assert.ok(REQUIRED_CLOSE_PACKET_PATTERNS.length >= 10);
});

test("paid pilot close readiness fails closed when the close packet is missing", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "apex-pilot-close-"));

  for (const filePath of REQUIRED_PILOT_CLOSE_FILES.filter((file) => file !== "docs/BUILD_1A_PAID_PILOT_CLOSE_PACKET.md")) {
    const absolutePath = path.join(repoRoot, filePath);
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, "placeholder", "utf8");
  }

  const result = checkPaidPilotCloseReadiness({ repoRoot });

  assert.equal(result.ok, false);
  assert.ok(result.failures.some((failure) => /Missing required pilot close file/i.test(failure)));
});

test("paid pilot close readiness catches unsupported positive overclaims", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "apex-pilot-close-"));

  for (const filePath of REQUIRED_PILOT_CLOSE_FILES) {
    const absolutePath = path.join(repoRoot, filePath);
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, "placeholder", "utf8");
  }

  fs.writeFileSync(
    path.join(repoRoot, "docs/BUILD_1A_PAID_PILOT_CLOSE_PACKET.md"),
    [
      "Pilot Order Form Outline",
      "Manual Payment Path",
      "Support owner: John",
      "Day 0 kickoff",
      "Day 3 Check-In",
      "Day 10 Value Review",
      "Success Criteria Menu",
      "Claims To Avoid",
      "Approval Checklist",
      "No automatic billing",
      "automatic emails, texts, bid submissions",
      "separate approval",
      "Neutral setup note 1",
      "Neutral setup note 2",
      "Neutral setup note 3",
      "Neutral setup note 4",
      "Neutral setup note 5",
      "Neutral setup note 6",
      "Neutral setup note 7",
      "Neutral setup note 8",
      "Neutral setup note 9",
      "Apex HQ guarantees leads.",
    ].join("\n"),
    "utf8",
  );

  const result = checkPaidPilotCloseReadiness({ repoRoot });

  assert.equal(result.ok, false);
  assert.ok(result.failures.some((failure) => /unsupported pilot claim/i.test(failure)));
});
