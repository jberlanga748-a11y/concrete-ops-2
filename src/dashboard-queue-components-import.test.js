import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("dashboard queue list lives outside App", () => {
  const appSource = fs.readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  const queueSource = fs.readFileSync(new URL("./dashboard-queue-components.jsx", import.meta.url), "utf8");

  assert.match(appSource, /import \{ QueueList \} from "\.\/dashboard-queue-components"/);
  assert.match(queueSource, /export function QueueList\b/);
  assert.match(queueSource, /from "\.\/app-shell-components"/);
  assert.match(appSource, /formatDateTimeLabel=\{formatDateTime\}/);
  assert.doesNotMatch(appSource, /function QueueList\b/);
});
