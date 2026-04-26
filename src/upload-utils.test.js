import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveAllowedUploadJobs,
  deriveUploadListState,
  filterUploads,
  gpsStatusLabel,
  validateUploadFile,
} from "./upload-utils.js";

test("deriveAllowedUploadJobs excludes archived jobs", () => {
  const jobs = deriveAllowedUploadJobs([
    { id: "J-1", title: "Active job" },
    { id: "J-2", title: "Archived job", archivedAt: "2026-04-25T12:00:00.000Z" },
  ]);

  assert.deepEqual(jobs.map((job) => job.id), ["J-1"]);
});

test("gpsStatusLabel handles captured, denied, unavailable, and not requested", () => {
  assert.equal(gpsStatusLabel({ latitude: 44.9, longitude: -123.0 }), "Captured");
  assert.equal(gpsStatusLabel({ locationUnavailableReason: "Location permission denied by user." }), "Denied");
  assert.equal(gpsStatusLabel({ locationUnavailableReason: "Location unavailable indoors." }), "Unavailable");
  assert.equal(gpsStatusLabel({}), "Not requested");
});

test("validateUploadFile enforces image types and size", () => {
  assert.equal(validateUploadFile(null), "Choose a photo to upload.");
  assert.equal(validateUploadFile({ type: "application/javascript", size: 100 }), "Only image uploads are supported right now.");
  assert.match(validateUploadFile({ type: "image/png", size: 9 * 1024 * 1024 }), /8MB or smaller/);
  assert.equal(validateUploadFile({ type: "image/png", size: 1024 }), "");
});

test("filterUploads supports gps, archived, job, uploader, and query filters", () => {
  const uploads = [
    {
      id: "UPL-1",
      jobId: "J-1",
      uploadedBy: "U-1",
      uploadedByName: "Ava",
      uploadedAt: "2026-04-25T10:00:00.000Z",
      caption: "Forms ready",
      job: { title: "Driveway", customer: "Carter" },
      latitude: 44.9,
      longitude: -123.0,
    },
    {
      id: "UPL-2",
      jobId: "J-2",
      uploadedBy: "U-2",
      uploadedByName: "Ben",
      uploadedAt: "2026-04-24T10:00:00.000Z",
      caption: "No location",
      job: { title: "Patio", customer: "Nguyen" },
      locationUnavailableReason: "Location denied.",
      archivedAt: "2026-04-25T11:00:00.000Z",
    },
  ];

  assert.deepEqual(filterUploads(uploads, { gps: "Has GPS" }).map((upload) => upload.id), ["UPL-1"]);
  assert.deepEqual(filterUploads(uploads, { gps: "Missing GPS", archived: "All uploads" }).map((upload) => upload.id), ["UPL-2"]);
  assert.deepEqual(filterUploads(uploads, { archived: "Archived only" }).map((upload) => upload.id), ["UPL-2"]);
  assert.deepEqual(filterUploads(uploads, { jobId: "J-1", uploaderId: "U-1", query: "carter" }).map((upload) => upload.id), ["UPL-1"]);
});

test("deriveUploadListState tolerates empty inputs and derives options", () => {
  assert.deepEqual(deriveUploadListState(undefined), {
    jobOptions: [],
    uploaderOptions: [],
    dateOptions: [],
  });

  const state = deriveUploadListState([
    {
      id: "UPL-1",
      jobId: "J-1",
      uploadedBy: "U-1",
      uploadedByName: "Ava",
      uploadedAt: "2026-04-25T10:00:00.000Z",
      job: { title: "Driveway" },
    },
  ]);

  assert.deepEqual(state.jobOptions, [{ value: "J-1", label: "Driveway" }]);
  assert.deepEqual(state.uploaderOptions, [{ value: "U-1", label: "Ava" }]);
  assert.deepEqual(state.dateOptions, ["2026-04-25"]);
});
