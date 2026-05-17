import assert from "node:assert/strict";
import test from "node:test";

import { createServerConfig } from "./config.js";
import { PACKAGE_IDS } from "../shared/packages.js";

function baseEnv(overrides = {}) {
  return {
    PORT: "4000",
    SMOKE_TEST_PORT: "4100",
    SESSION_TTL_HOURS: "168",
    LOG_LEVEL: "info",
    DATA_DIR: "./data",
    BACKUP_DIR: "./data/backups",
    ...overrides,
  };
}

test("development config stays local-friendly without trusting forwarded IPs", () => {
  const config = createServerConfig(baseEnv({ NODE_ENV: "development" }));

  assert.equal(config.nodeEnv, "development");
  assert.equal(config.trustProxyHops, 0);
  assert.deepEqual(config.corsAllowedOrigins, []);
});

test("production config defaults to Apex origins and one trusted proxy hop", () => {
  const config = createServerConfig(baseEnv({ NODE_ENV: "production" }));

  assert.equal(config.nodeEnv, "production");
  assert.equal(config.trustProxyHops, 1);
  assert.deepEqual(config.corsAllowedOrigins, [
    "https://app.apexhq.online",
    "https://concrete-ops-2.fly.dev",
  ]);
});

test("explicit CORS origins are trimmed, validated, and deduplicated", () => {
  const config = createServerConfig(baseEnv({
    NODE_ENV: "production",
    CORS_ALLOWED_ORIGINS: " https://app.apexhq.online,https://custom.apexhq.online,https://app.apexhq.online ",
  }));

  assert.deepEqual(config.corsAllowedOrigins, [
    "https://app.apexhq.online",
    "https://custom.apexhq.online",
  ]);
});

test("CORS origin config fails closed for wildcard and invalid origins", () => {
  assert.throws(
    () => createServerConfig(baseEnv({ CORS_ALLOWED_ORIGINS: "*" })),
    /wildcard CORS is not allowed/i,
  );

  assert.throws(
    () => createServerConfig(baseEnv({ CORS_ALLOWED_ORIGINS: "javascript:alert(1)" })),
    /invalid origin/i,
  );

  assert.throws(
    () => createServerConfig(baseEnv({ CORS_ALLOWED_ORIGINS: "not-a-url" })),
    /invalid origin/i,
  );
});

test("trusted proxy hop config is explicit and non-negative", () => {
  assert.equal(createServerConfig(baseEnv({
    NODE_ENV: "production",
    TRUST_PROXY_HOPS: "0",
  })).trustProxyHops, 0);
  assert.equal(createServerConfig(baseEnv({
    NODE_ENV: "test",
    TRUST_PROXY_HOPS: "2",
  })).trustProxyHops, 2);

  assert.throws(
    () => createServerConfig(baseEnv({ TRUST_PROXY_HOPS: "-1" })),
    /non-negative integer/i,
  );
  assert.throws(
    () => createServerConfig(baseEnv({ TRUST_PROXY_HOPS: "abc" })),
    /non-negative integer/i,
  );
});

test("demo package config defaults to Premium and validates package ids", () => {
  assert.equal(createServerConfig(baseEnv()).demoPackageId, PACKAGE_IDS.PREMIUM);
  assert.equal(createServerConfig(baseEnv({
    NODE_ENV: "production",
    DEMO_MODE: "true",
  })).demoPackageId, PACKAGE_IDS.PREMIUM);
  assert.equal(createServerConfig(baseEnv({ DEMO_PACKAGE_ID: "basic" })).demoPackageId, PACKAGE_IDS.BASIC);
  assert.equal(createServerConfig(baseEnv({ DEMO_PACKAGE_ID: "Elite" })).demoPackageId, PACKAGE_IDS.ELITE);

  assert.throws(
    () => createServerConfig(baseEnv({ DEMO_PACKAGE_ID: "enterprise" })),
    /DEMO_PACKAGE_ID must be one of/i,
  );
});
