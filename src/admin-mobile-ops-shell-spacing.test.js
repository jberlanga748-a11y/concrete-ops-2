import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("Admin mobile ops shells do not stack the global bottom spacer", () => {
  const cssSource = fs.readFileSync(new URL("./index.css", import.meta.url), "utf8");

  assert.match(
    cssSource,
    /@media \(max-width: 767px\)[\s\S]*body:has\(\.co-admin-mobile-ops-shell\) \.co-mobile-bottom-spacer \{[\s\S]*display: none !important;[\s\S]*height: 0 !important;/
  );
  assert.match(
    cssSource,
    /@media \(max-width: 767px\)[\s\S]*body:has\(\.co-admin-mobile-ops-shell\) \.co-workspace-shell \{[\s\S]*padding-bottom: 0 !important;/
  );
});
