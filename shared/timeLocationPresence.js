import { normalizeTimeLocationEvidencePolicy } from "./permissions.js";

const EARTH_RADIUS_METERS = 6371000;

function toRadians(value) {
  return Number(value) * Math.PI / 180;
}

function coordinatePair(entry = {}, prefix = "") {
  const latitude = entry[`${prefix}Latitude`];
  const longitude = entry[`${prefix}Longitude`];
  if (latitude == null || longitude == null) return null;
  const normalizedLatitude = Number(latitude);
  const normalizedLongitude = Number(longitude);
  if (!Number.isFinite(normalizedLatitude) || !Number.isFinite(normalizedLongitude)) return null;
  return {
    latitude: normalizedLatitude,
    longitude: normalizedLongitude,
  };
}

export function distanceMetersBetweenCoordinates(left = {}, right = {}) {
  const leftLatitude = toRadians(left.latitude);
  const rightLatitude = toRadians(right.latitude);
  const deltaLatitude = toRadians(right.latitude - left.latitude);
  const deltaLongitude = toRadians(right.longitude - left.longitude);
  const haversine = Math.sin(deltaLatitude / 2) ** 2
    + Math.cos(leftLatitude) * Math.cos(rightLatitude) * Math.sin(deltaLongitude / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export function formatPresenceDistance(meters) {
  const normalized = Number(meters || 0);
  if (!Number.isFinite(normalized) || normalized <= 0) return "0 ft";
  const feet = normalized * 3.28084;
  if (feet < 1000) return `${Math.round(feet)} ft`;
  return `${(feet / 5280).toFixed(1)} mi`;
}

export function deriveTimeEntryJobsitePresenceReview(entry = {}, policy = {}) {
  const normalizedPolicy = normalizeTimeLocationEvidencePolicy(policy);
  if (!normalizedPolicy.enabled || !normalizedPolicy.presenceReviewEnabled) {
    return {
      status: "off",
      label: "Presence review off",
      tone: "slate",
      detail: "Review-only jobsite presence checks are disabled for this company.",
      distanceMeters: null,
      radiusMeters: normalizedPolicy.presenceReviewRadiusMeters,
    };
  }

  if ((entry.workCategory || "job") !== "job" || !entry.jobId) {
    return {
      status: "not_applicable",
      label: "Presence not applicable",
      tone: "slate",
      detail: "Presence review only applies to job-linked time entries.",
      distanceMeters: null,
      radiusMeters: normalizedPolicy.presenceReviewRadiusMeters,
    };
  }

  const clockIn = coordinatePair(entry, "clockIn");
  const clockOut = coordinatePair(entry, "clockOut");
  if (!clockIn && !clockOut) {
    return {
      status: "not_enough_evidence",
      label: "No GPS review",
      tone: "slate",
      detail: "No clock-in or clock-out GPS evidence was captured for review.",
      distanceMeters: null,
      radiusMeters: normalizedPolicy.presenceReviewRadiusMeters,
    };
  }
  if (clockIn && !clockOut) {
    return {
      status: "clock_in_only",
      label: "Clock-in GPS only",
      tone: "blue",
      detail: "Clock-in GPS was captured. Clock-out GPS is needed before presence can be compared.",
      distanceMeters: null,
      radiusMeters: normalizedPolicy.presenceReviewRadiusMeters,
    };
  }
  if (!clockIn && clockOut) {
    return {
      status: "clock_out_only",
      label: "Clock-out GPS only",
      tone: "amber",
      detail: "Clock-out GPS was captured without a clock-in GPS anchor. Review manually before drawing conclusions.",
      distanceMeters: null,
      radiusMeters: normalizedPolicy.presenceReviewRadiusMeters,
    };
  }

  const distanceMeters = Math.round(distanceMetersBetweenCoordinates(clockIn, clockOut));
  const radiusMeters = normalizedPolicy.presenceReviewRadiusMeters;
  if (distanceMeters > radiusMeters) {
    return {
      status: "needs_review",
      label: "Presence needs review",
      tone: "amber",
      detail: `Clock-out GPS is about ${formatPresenceDistance(distanceMeters)} from the clock-in review anchor, outside the ${formatPresenceDistance(radiusMeters)} review radius. Review before using this for payroll, discipline, or job status decisions.`,
      distanceMeters,
      radiusMeters,
    };
  }

  return {
    status: "within_review_radius",
    label: "Within review radius",
    tone: "green",
    detail: `Clock-out GPS is about ${formatPresenceDistance(distanceMeters)} from the clock-in review anchor, inside the ${formatPresenceDistance(radiusMeters)} review radius.`,
    distanceMeters,
    radiusMeters,
  };
}
