import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("App imports extracted upload route mobile primitives", () => {
  const appSource = fs.readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  const routeComponentsSource = fs.readFileSync(new URL("./upload-route-components.jsx", import.meta.url), "utf8");

  assert.match(routeComponentsSource, /export async function fetchAuthenticatedUploadPreviewUrl\b/);
  assert.match(appSource, /import \{[^}]*fetchAuthenticatedUploadPreviewUrl[^}]*\} from "\.\/upload-route-components"/s);
  assert.doesNotMatch(appSource, /async function fetchAuthenticatedUploadPreviewUrl\(/);

  for (const name of ["AuthenticatedUploadPreview", "UploadCreateCard", "UploadDetailPanel", "UploadListCard", "UploadMobileAccordionCard", "UploadMobileFieldGroup"]) {
    assert.match(routeComponentsSource, new RegExp(`export function ${name}\\b`));
    assert.match(appSource, new RegExp(`import \\{[^}]*${name}[^}]*\\} from "\\./upload-route-components"`, "s"));
    assert.doesNotMatch(appSource, new RegExp(`function ${name}\\(`));
  }
});
