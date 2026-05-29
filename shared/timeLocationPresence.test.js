import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveTimeEntryJobsitePresenceReview,
  distanceMetersBetweenCoordinates,
  formatPresenceDistance,
} from "./timeLocationPresence.js";

const REVIEW_POLICY = {
  enabled: true,
  presenceReviewEnabled: true,
  presenceReviewRadiusMeters: 100,
};

test("derives review-only jobsite presence from captured clock evidence", () => {
  const withinReview = deriveTimeEntryJobsitePresenceReview({
    jobId: "J-1",
    workCategory: "job",
    clockInLatitude: 44.95621,
    clockInLongitude: -123.03481,
    clockOutLatitude: 44.9565,
    clockOutLongitude: -123.03481,
  }, REVIEW_POLICY);

  assert.equal(withinReview.status, "within_review_radius");
  assert.equal(withinReview.tone, "green");

  const needsReview = deriveTimeEntryJobsitePresenceReview({
    jobId: "J-1",
    workCategory: "job",
    clockInLatitude: 44.95621,
    clockInLongitude: -123.03481,
    clockOutLatitude: 44.9605,
    clockOutLongitude: -123.03481,
  }, REVIEW_POLICY);

  assert.equal(needsReview.status, "needs_review");
  assert.equal(needsReview.tone, "amber");
  assert.match(needsReview.detail, /Review before using this for payroll, discipline, or job status decisions/);
});

test("presence review fails soft without policy, job scope, or enough evidence", () => {
  assert.equal(deriveTimeEntryJobsitePresenceReview({ jobId: "J-1" }).status, "off");
  assert.equal(deriveTimeEntryJobsitePresenceReview({ workCategory: "office_admin" }, REVIEW_POLICY).status, "not_applicable");
  assert.equal(deriveTimeEntryJobsitePresenceReview({ jobId: "J-1", workCategory: "job" }, REVIEW_POLICY).status, "not_enough_evidence");
  assert.equal(deriveTimeEntryJobsitePresenceReview({
    jobId: "J-1",
    workCategory: "job",
    clockInLatitude: 44.95621,
    clockInLongitude: -123.03481,
  }, REVIEW_POLICY).status, "clock_in_only");
});

test("distance helpers format review values for field UI", () => {
  const distance = distanceMetersBetweenCoordinates(
    { latitude: 44.95621, longitude: -123.03481 },
    { latitude: 44.9605, longitude: -123.03481 },
  );
  assert.ok(distance > 400);
  assert.equal(formatPresenceDistance(100), "328 ft");
});
