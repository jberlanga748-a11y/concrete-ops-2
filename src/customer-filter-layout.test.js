import assert from "node:assert/strict";
import test from "node:test";

import { getCustomerFilterLayoutClasses } from "./customer-filter-layout.js";

test("customer filters live in a separate non-scrolling header above the table scroller", () => {
  const classes = getCustomerFilterLayoutClasses();

  assert.doesNotMatch(classes.header, /\boverflow-x-auto\b/);
  assert.match(classes.pillsRow, /\bflex-wrap\b/);
  assert.match(classes.searchInput, /\bw-full\b/);
  assert.match(classes.tableScroller, /\boverflow-x-auto\b/);
});
