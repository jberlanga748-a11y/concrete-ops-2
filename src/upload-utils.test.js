import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveAllowedUploadJobs,
  deriveSelectedPhotoTakenAt,
  deriveUploadDraftFromSelection,
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
  assert.equal(gpsStatusLabel({ latitude: 44.9, longitude: -123.0 }), "Location captured");
  assert.equal(gpsStatusLabel({ locationUnavailableReason: "Location permission denied by user." }), "Location denied");
  assert.equal(gpsStatusLabel({ locationUnavailableReason: "Location unavailable indoors." }), "Location unavailable");
  assert.equal(gpsStatusLabel({}), "Not requested");
});

test("deriveSelectedPhotoTakenAt uses the selection time when no EXIF time is available", () => {
  assert.equal(
    deriveSelectedPhotoTakenAt(new Date("2026-04-25T18:45:00.000Z")),
    "2026-04-25T18:45:00.000Z",
  );
});

test("deriveUploadDraftFromSelection preserves draft state and sets file metadata plus takenAt", () => {
  const nextDraft = deriveUploadDraftFromSelection(
    {
      jobId: "J-100",
      caption: "Before pour",
      notes: "North edge formwork",
      latitude: 44.94,
      longitude: -123.03,
    },
    {
      name: "pour-photo.jpg",
      type: "image/jpeg",
      size: 2048,
    },
    "data:image/jpeg;base64,abc123",
    "2026-04-25T19:15:00.000Z",
  );

  assert.equal(nextDraft.jobId, "J-100");
  assert.equal(nextDraft.caption, "Before pour");
  assert.equal(nextDraft.notes, "North edge formwork");
  assert.equal(nextDraft.latitude, 44.94);
  assert.equal(nextDraft.longitude, -123.03);
  assert.equal(nextDraft.fileName, "pour-photo.jpg");
  assert.equal(nextDraft.fileType, "image/jpeg");
  assert.equal(nextDraft.fileSize, 2048);
  assert.equal(nextDraft.dataUrl, "data:image/jpeg;base64,abc123");
  assert.equal(nextDraft.takenAtIso, "2026-04-25T19:15:00.000Z");
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
