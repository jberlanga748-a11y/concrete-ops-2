import assert from "node:assert/strict";
import test from "node:test";

import {
  parseReadinessTimingArgs,
  summarizeTiming,
} from "./readiness-timing.mjs";

test("readiness timing defaults to production ready and health endpoints", () => {
  const options = parseReadinessTimingArgs([]);

  assert.equal(options.baseUrl, "https://app.apexhq.online/");
  assert.equal(options.samples, 3);
  assert.deepEqual(options.endpoints, ["/api/health", "/api/ready"]);
});

test("readiness timing parses safe hosted options", () => {
  const options = parseReadinessTimingArgs([
    "--base-url=https://concrete-ops-demo.fly.dev",
    "--samples=2",
    "--delay-ms=10",
    "--endpoints=/api/ready",
    "--json",
  ]);

  assert.equal(options.baseUrl, "https://concrete-ops-demo.fly.dev/");
  assert.equal(options.samples, 2);
  assert.equal(options.delayMs, 10);
  assert.deepEqual(options.endpoints, ["/api/ready"]);
  assert.equal(options.json, true);
});

test("readiness timing rejects non-http urls and unsafe endpoint strings", () => {
  assert.throws(() => parseReadinessTimingArgs(["--base-url=file:///tmp/app"]), /http or https/);
  assert.throws(() => parseReadinessTimingArgs(["--endpoints=api/ready"]), /start with/);
  assert.throws(() => parseReadinessTimingArgs(["--endpoints=/api/ready?x=1"]), /simple absolute path/);
});

test("readiness timing summarizes durations", () => {
  assert.deepEqual(summarizeTiming([
    { durationMs: 300 },
    { durationMs: 100 },
    { durationMs: 200 },
  ]), {
    first: 300,
    last: 200,
    min: 100,
    max: 300,
    average: 200,
  });
});
