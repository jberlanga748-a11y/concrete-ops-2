import assert from "node:assert/strict";
import test from "node:test";

import { createServerConfig } from "./config.js";

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
