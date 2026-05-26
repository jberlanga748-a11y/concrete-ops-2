import { normalizeNotificationState } from "./notification-center-utils.js";

export function notificationStateTimestamp(state = {}) {
  const parsed = new Date(state?.updatedAt || "").getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function upsertNotificationItemMeta(items = [], state = {}, timestamp = "") {
  const existingMetaById = new Map((Array.isArray(state?.itemMeta) ? state.itemMeta : []).map((item) => [item.id, item]));
  const mergedMeta = new Map(existingMetaById);

  for (const item of items) {
    const existing = existingMetaById.get(item.id) || {};
    mergedMeta.set(item.id, {
      id: item.id,
      type: item.type || existing.type || "",
      createdAt: existing.createdAt || item.createdAt || timestamp,
      readAt: existing.readAt || (item.read ? timestamp : ""),
      archivedAt: existing.archivedAt || (item.archived ? timestamp : ""),
      updatedAt: timestamp,
    });
  }

  return Array.from(mergedMeta.values());
}

export function loadNotificationState(storageKey, fallbackState = {}) {
  const fallback = normalizeNotificationState(fallbackState);
  try {
    const localState = normalizeNotificationState(window.localStorage.getItem(storageKey));
    return notificationStateTimestamp(localState) >= notificationStateTimestamp(fallback) ? localState : fallback;
  } catch {
    return fallback;
  }
}
