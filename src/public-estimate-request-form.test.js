import assert from "node:assert/strict";
import test from "node:test";

import {
  INITIAL_PUBLIC_ESTIMATE_REQUEST_FORM,
  PUBLIC_REQUEST_BUDGET_RANGES,
  PUBLIC_REQUEST_SERVICE_TYPES,
  PUBLIC_REQUEST_TIMELINES,
  buildPublicEstimateRequestPayload,
} from "./public-estimate-request-form.js";

test("public estimate request payload adds target company and safe attribution", () => {
  const payload = buildPublicEstimateRequestPayload({
    ...INITIAL_PUBLIC_ESTIMATE_REQUEST_FORM,
    name: "Pat Customer",
  }, {
    setupStatus: {
      publicEstimateRequestTargetCompanyId: "COMPANY-DEFAULT",
    },
    locationHref: "https://app.apexhq.online/request-estimate?utm_source=google&utm_medium=cpc&utm_campaign=spring",
    referrer: "https://example.test/fencing",
    sourceSubmissionId: "public-request-1",
  });

  assert.equal(payload.targetCompanyId, "COMPANY-DEFAULT");
  assert.equal(payload.sourceSubmissionId, "public-request-1");
  assert.equal(payload.utmSource, "google");
  assert.equal(payload.utmMedium, "cpc");
  assert.equal(payload.utmCampaign, "spring");
  assert.equal(payload.referrer, "https://example.test/fencing");
  assert.equal(payload.serviceType, "Residential service");
  assert.equal(payload.consentToContact, true);
});

test("public estimate request form exposes service, timeline, and budget choices", () => {
  assert.equal(PUBLIC_REQUEST_SERVICE_TYPES.includes("GC / builder invite"), true);
  assert.equal(PUBLIC_REQUEST_TIMELINES.includes("ASAP"), true);
  assert.equal(PUBLIC_REQUEST_BUDGET_RANGES.includes("Need contractor guidance"), true);
});
