export const ALLOWED_UPLOAD_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "image/gif"];
export const MAX_UPLOAD_SIZE_BYTES = 8 * 1024 * 1024;

export function deriveAllowedUploadJobs(jobs) {
  return (Array.isArray(jobs) ? jobs : []).filter((job) => !job?.archivedAt);
}

export function gpsStatusLabel(item) {
  if (!item) return "Not requested";
  if (item.latitude != null && item.longitude != null) return "Location captured";
  const reason = String(item.locationUnavailableReason || "").trim().toLowerCase();
  if (reason.includes("denied")) return "Location denied";
  if (reason) return "Location unavailable";
  return "Not requested";
}

export function deriveSelectedPhotoTakenAt(selectedAt = new Date()) {
  const normalized = selectedAt instanceof Date ? selectedAt : new Date(selectedAt);
  if (!Number.isNaN(normalized.getTime())) {
    return normalized.toISOString();
  }
  return new Date().toISOString();
}

export function deriveUploadDraftFromSelection(currentDraft, file, dataUrl, selectedAt = new Date()) {
  return {
    ...(currentDraft && typeof currentDraft === "object" ? currentDraft : {}),
    fileName: file?.name || "",
    fileType: file?.type || "",
    fileSize: Number(file?.size || 0),
    dataUrl: typeof dataUrl === "string" ? dataUrl : "",
    takenAtIso: deriveSelectedPhotoTakenAt(selectedAt),
  };
}

export function validateUploadFile(file) {
  if (!file) return "Choose a photo to upload.";
  if (!ALLOWED_UPLOAD_TYPES.includes(String(file.type || "").toLowerCase())) {
    return "Only image uploads are supported right now.";
  }
  if (Number(file.size || 0) > MAX_UPLOAD_SIZE_BYTES) {
    return `Images must be ${Math.round(MAX_UPLOAD_SIZE_BYTES / (1024 * 1024))}MB or smaller.`;
  }
  return "";
}

export function filterUploads(uploads, {
  jobId = "All jobs",
  uploaderId = "All uploaders",
  date = "All dates",
  gps = "All locations",
  archived = "Active only",
  query = "",
} = {}) {
  const normalizedQuery = String(query || "").trim().toLowerCase();

  return (Array.isArray(uploads) ? uploads : []).filter((upload) => {
    const hasGps = upload?.latitude != null && upload?.longitude != null;
    const uploadedDate = String(upload?.uploadedAt || upload?.createdAt || "").slice(0, 10);
    const matchesJob = jobId === "All jobs" ? true : upload?.jobId === jobId;
    const matchesUploader = uploaderId === "All uploaders" ? true : upload?.uploadedBy === uploaderId;
    const matchesDate = date === "All dates" ? true : uploadedDate === date;
    const matchesGps = gps === "All locations"
      ? true
      : gps === "Has GPS"
        ? hasGps
        : !hasGps;
    const matchesArchived = archived === "All uploads"
      ? true
      : archived === "Archived only"
        ? Boolean(upload?.archivedAt)
        : !upload?.archivedAt;
    const haystack = [
      upload?.fileName,
      upload?.caption,
      upload?.notes,
      upload?.uploadedByName,
      upload?.job?.title,
      upload?.job?.customer,
    ].filter(Boolean).join(" ").toLowerCase();
    const matchesQuery = normalizedQuery ? haystack.includes(normalizedQuery) : true;

    return matchesJob && matchesUploader && matchesDate && matchesGps && matchesArchived && matchesQuery;
  });
}

export function deriveUploadListState(uploads) {
  const safeUploads = Array.isArray(uploads) ? uploads : [];
  const jobOptions = Array.from(new Map(
    safeUploads
      .filter((upload) => !upload?.archivedAt)
      .map((upload) => [upload.jobId, { value: upload.jobId, label: upload?.job?.title || upload.jobId }]),
  ).values()).sort((left, right) => left.label.localeCompare(right.label));

  const uploaderOptions = Array.from(new Map(
    safeUploads.map((upload) => [upload.uploadedBy, { value: upload.uploadedBy, label: upload.uploadedByName || upload.uploadedBy }]),
  ).values()).sort((left, right) => left.label.localeCompare(right.label));

  const dateOptions = Array.from(new Set(
    safeUploads.map((upload) => String(upload?.uploadedAt || upload?.createdAt || "").slice(0, 10)).filter(Boolean),
  )).sort().reverse();

  return {
    jobOptions,
    uploaderOptions,
    dateOptions,
  };
}
