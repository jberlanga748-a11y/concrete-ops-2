import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  compactCurrency,
  currency,
  formatDateTime,
  formatFileSize,
  todayDateInputValue,
  toDateTimeInputValue,
} from "./app-format-utils.js";

test("app currency formatters keep dashboard values compact and stable", () => {
  assert.equal(currency(1234.49), "$1,234");
  assert.equal(currency("bad"), "$0");
  assert.equal(compactCurrency(999), "$999");
  assert.equal(compactCurrency(1200), "$1k");
  assert.equal(compactCurrency(1250000), "$1.3M");
});

test("app date formatters keep invalid values safe", () => {
  assert.equal(formatDateTime(""), "Not recorded");
  assert.equal(formatDateTime("not-a-date"), "Not recorded");
  assert.match(formatDateTime("2026-05-26T10:30:00.000Z"), /May 26/);
  assert.match(todayDateInputValue(), /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(toDateTimeInputValue(""), "");
  assert.equal(toDateTimeInputValue("not-a-date"), "");
  assert.match(toDateTimeInputValue("2026-05-26T10:30:00.000Z"), /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
});

test("app file size formatter preserves existing byte labels", () => {
  assert.equal(formatFileSize(0), "0 B");
  assert.equal(formatFileSize(900), "900 B");
  assert.equal(formatFileSize(2048), "2 KB");
  assert.equal(formatFileSize(1536 * 1024), "1.5 MB");
});

test("app format helpers are extracted from App", () => {
  const appSource = fs.readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  const utilSource = fs.readFileSync(new URL("./app-format-utils.js", import.meta.url), "utf8");

  assert.match(appSource, /import \{ compactCurrency, currency, formatDateTime, todayDateInputValue, toDateTimeInputValue \} from "\.\/app-format-utils";/);
  for (const name of [
    "currency",
    "compactCurrency",
    "formatDateTime",
    "todayDateInputValue",
    "toDateTimeInputValue",
    "formatFileSize",
  ]) {
    assert.match(utilSource, new RegExp(`export function ${name}\\b`));
    assert.doesNotMatch(appSource, new RegExp(`function ${name}\\b`));
  }
});
