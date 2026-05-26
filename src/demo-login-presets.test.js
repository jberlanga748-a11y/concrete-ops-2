import assert from "node:assert/strict";
import test from "node:test";

import { DEMO_LOGIN_PRESETS } from "./demo-login-presets.js";

test("demo login presets expose the guided demo roles without passwords", () => {
  assert.deepEqual(
    DEMO_LOGIN_PRESETS.map((preset) => preset.email),
    [
      "demo.ops@apexhq.app",
      "demo.admin@apexhq.app",
      "demo.foreman@apexhq.app",
      "demo.employee@apexhq.app",
    ],
  );

  assert.deepEqual(
    DEMO_LOGIN_PRESETS.map((preset) => preset.role),
    ["Owner / Ops", "Admin", "Foreman", "Employee"],
  );

  for (const preset of DEMO_LOGIN_PRESETS) {
    assert.equal(Object.hasOwn(preset, "password"), false);
    assert.equal(typeof preset.helper, "string");
    assert.equal(typeof preset.startsAt, "string");
  }
});
