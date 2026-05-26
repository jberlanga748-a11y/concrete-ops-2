import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const LAZY_UPLOAD_COMPONENTS = [
  "UploadCreateCard",
  "UploadDetailPanel",
  "UploadListCard",
  "UploadMobileAccordionCard",
  "UploadMobileFieldGroup",
  "UploadsCommandRailPolished",
  "UploadsFieldOperatorPanel",
  "UploadsMobileFocusPanel",
  "UploadsProofWorkbench",
  "UploadsTablePolished",
];

test("Uploads page lazy-loads extracted upload route UI and preview fetching stays in the utility module", () => {
  const appSource = fs.readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  const uploadsPageSource = fs.readFileSync(new URL("./uploads-page-components.jsx", import.meta.url), "utf8");
  const routeComponentsSource = fs.readFileSync(new URL("./upload-route-components.jsx", import.meta.url), "utf8");
  const previewUtilsSource = fs.readFileSync(new URL("./upload-preview-utils.js", import.meta.url), "utf8");

  assert.match(previewUtilsSource, /export async function fetchAuthenticatedUploadPreviewUrl\b/);
  assert.match(routeComponentsSource, /export \{ fetchAuthenticatedUploadPreviewUrl \} from "\.\/upload-preview-utils"/);
  assert.match(appSource, /import \{ fetchAuthenticatedUploadPreviewUrl \} from "\.\/upload-preview-utils"/);
  assert.doesNotMatch(appSource, /async function fetchAuthenticatedUploadPreviewUrl\(/);

  for (const componentName of ["AuthenticatedUploadPreview", ...LAZY_UPLOAD_COMPONENTS]) {
    assert.match(routeComponentsSource, new RegExp(`export function ${componentName}\\b`));
    assert.doesNotMatch(appSource, new RegExp(`function ${componentName}\\(`));
  }

  for (const componentName of LAZY_UPLOAD_COMPONENTS) {
    assert.match(uploadsPageSource, new RegExp(`const ${componentName} = lazyRouteComponent\\(\\(\\) => import\\("\\./upload-route-components"\\), "${componentName}"\\);`));
    assert.doesNotMatch(appSource, new RegExp(`const ${componentName} = lazyRouteComponent\\(`));
  }
});
