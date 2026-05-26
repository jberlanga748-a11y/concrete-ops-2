const UPLOAD_PREVIEW_CACHE_LIMIT = 24;
const SESSION_ACTIVE_MARKER = "cookie-session";
const uploadPreviewCache = new Map();

export function getUploadPreviewCacheKey(upload) {
  if (!upload?.id) return "";
  return `${upload.id}:${upload.updatedAt || upload.uploadedAt || ""}`;
}

export function getCachedUploadPreviewUrl(cacheKey) {
  if (!cacheKey) return "";
  const cachedEntry = uploadPreviewCache.get(cacheKey);
  if (!cachedEntry?.url) return "";
  uploadPreviewCache.delete(cacheKey);
  uploadPreviewCache.set(cacheKey, cachedEntry);
  return cachedEntry.url;
}

function storeUploadPreviewUrl(cacheKey, previewUrl) {
  if (!cacheKey || !previewUrl) return;
  const previousEntry = uploadPreviewCache.get(cacheKey);
  if (previousEntry?.url && previousEntry.url !== previewUrl) {
    URL.revokeObjectURL(previousEntry.url);
  }
  uploadPreviewCache.delete(cacheKey);
  uploadPreviewCache.set(cacheKey, { url: previewUrl });

  while (uploadPreviewCache.size > UPLOAD_PREVIEW_CACHE_LIMIT) {
    const oldestKey = uploadPreviewCache.keys().next().value;
    const oldestEntry = uploadPreviewCache.get(oldestKey);
    if (oldestEntry?.url) {
      URL.revokeObjectURL(oldestEntry.url);
    }
    uploadPreviewCache.delete(oldestKey);
  }
}

export async function fetchAuthenticatedUploadPreviewUrl(upload, token) {
  if (!upload?.contentUrl || !token) {
    throw new Error("Could not load the upload preview.");
  }

  const cacheKey = getUploadPreviewCacheKey(upload);
  const cachedPreviewUrl = getCachedUploadPreviewUrl(cacheKey);
  if (cachedPreviewUrl) return cachedPreviewUrl;

  const bearerToken = String(token || "").trim();
  const response = await fetch(upload.contentUrl, {
    credentials: "include",
    headers: bearerToken && bearerToken !== SESSION_ACTIVE_MARKER
      ? { Authorization: `Bearer ${bearerToken}` }
      : {},
  });

  if (!response.ok) {
    throw new Error("Could not load the upload preview.");
  }

  const blob = await response.blob();
  const previewUrl = URL.createObjectURL(blob);
  storeUploadPreviewUrl(cacheKey, previewUrl);
  return previewUrl;
}
