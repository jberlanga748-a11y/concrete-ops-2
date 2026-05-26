import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { useDesktopCommandViewport } from "./viewport-utils.js";

test("desktop command viewport hook is shared from viewport utils", () => {
  const appSource = fs.readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  const wrapperSource = fs.readFileSync(new URL("./dashboard-route-wrapper-components.jsx", import.meta.url), "utf8");
  const viewportSource = fs.readFileSync(new URL("./viewport-utils.js", import.meta.url), "utf8");

  assert.equal(typeof useDesktopCommandViewport, "function");
  assert.match(viewportSource, /export function useDesktopCommandViewport\(minWidth = 1024\)/);
  assert.match(viewportSource, /window\.matchMedia\(`\(min-width: \$\{minWidth\}px\)`\)/);
  assert.match(viewportSource, /addEventListener\("change", update\)/);
  assert.match(viewportSource, /addListener\(update\)/);

  assert.match(appSource, /import \{ useDesktopCommandViewport \} from "\.\/viewport-utils";/);
  assert.match(wrapperSource, /import \{ useDesktopCommandViewport \} from "\.\/viewport-utils";/);
  assert.match(appSource, /useDesktopCommandViewport\(1180\)/);
  assert.match(appSource, /useDesktopCommandViewport\(1024\)/);
  assert.match(wrapperSource, /useDesktopCommandViewport\(1180\)/);
  assert.match(wrapperSource, /useDesktopCommandViewport\(768\)/);

  assert.doesNotMatch(appSource, /function useDesktopCommandViewport\b/);
  assert.doesNotMatch(wrapperSource, /function useDesktopCommandViewport\b/);
});
