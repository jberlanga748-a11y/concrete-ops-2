import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("Uploads page route shell is extracted out of App", () => {
  const appSource = fs.readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  const uploadsPageSource = fs.readFileSync(new URL("./uploads-page-components.jsx", import.meta.url), "utf8");

  assert.match(appSource, /const UploadsPage = lazyRouteComponent\(\(\) => import\("\.\/uploads-page-components"\), "UploadsPage"\);/);
  assert.doesNotMatch(appSource, /import \{ UploadsPage \} from "\.\/uploads-page-components";/);
  assert.match(uploadsPageSource, /export function UploadsPagePolished\b/);
  assert.match(uploadsPageSource, /export function UploadsPage\b/);
  assert.match(uploadsPageSource, /function UploadsPageLegacy\b/);
  assert.match(uploadsPageSource, /function FieldMobileUploadsLayout\b/);
  assert.match(uploadsPageSource, /co-field-mobile-uploads-shell/);
  assert.match(uploadsPageSource, /const INITIAL_UPLOAD_FORM = \{/);
  assert.match(uploadsPageSource, /import \{[\s\S]*buildUploadSupportContext[\s\S]*\} from "\.\/upload-utils";/);

  assert.doesNotMatch(appSource, /function UploadsPagePolished\b/);
  assert.doesNotMatch(appSource, /function UploadsPage\b/);
  assert.doesNotMatch(appSource, /function UploadsPageLegacy\b/);
  assert.doesNotMatch(appSource, /function FieldMobileUploadsLayout\b/);
  assert.doesNotMatch(appSource, /const INITIAL_UPLOAD_FORM = \{/);
});
