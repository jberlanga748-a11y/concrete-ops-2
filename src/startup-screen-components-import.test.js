import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("startup screens live outside App", () => {
  const appSource = fs.readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  const startupSource = fs.readFileSync(new URL("./startup-screen-components.jsx", import.meta.url), "utf8");

  assert.match(appSource, /import \{ BrandIntroScreen, LoadingScreen, ModuleLoadingFallback, SplashScreen, StartupFallbackScreen \} from "\.\/startup-screen-components"/);
  for (const componentName of ["BrandIntroScreen", "SplashScreen", "LoadingScreen", "ModuleLoadingFallback", "StartupFallbackScreen"]) {
    assert.match(startupSource, new RegExp(`export function ${componentName}\\b`));
    assert.doesNotMatch(appSource, new RegExp(`function ${componentName}\\b`));
  }
  assert.match(startupSource, /from "\.\/app-shell-components"/);
  assert.match(startupSource, /from "\.\/brand-utils"/);
});
