import crypto from "node:crypto";

import {
  buildApexOsActionPermissionSummary,
  classifyApexOsAction,
} from "../shared/apexOsActionPermissions.js";
import {
  APEX_OS_DEVICE_COMMAND_TYPE,
} from "../shared/apexOsDeviceLayer.js";
import {
  APEX_OS_PRIVACY_CONTEXT,
  buildApexOsPrivacySummary,
  classifyApexOsPrivacy,
  redactApexOsSensitiveText,
} from "../shared/apexOsPrivacyFirewall.js";
import {
  buildApexOsToolRouteSummary,
  planApexOsToolRoute,
} from "../shared/apexOsToolRouter.js";
import {
  APEX_OS_CONTENT_TRUST_LEVEL,
  APEX_OS_UNTRUSTED_SOURCE,
  buildApexOsUntrustedContentSummary,
  classifyApexOsUntrustedContent,
  shouldBlockApexOsUntrustedRoute,
} from "../shared/apexOsUntrustedContentFirewall.js";

export const APEX_HOME_ASSISTANT_ENV = Object.freeze({
  BASE_URL: "APEX_HOME_ASSISTANT_BASE_URL",
  TOKEN: "APEX_HOME_ASSISTANT_TOKEN",
  ENABLED: "APEX_HOME_ASSISTANT_ENABLED",
  EXECUTION_ENABLED: "APEX_HOME_ASSISTANT_EXECUTION_ENABLED",
  KILL_SWITCH: "APEX_HOME_ASSISTANT_KILL_SWITCH",
  LOCAL_NETWORK_ONLY: "APEX_HOME_ASSISTANT_LOCAL_NETWORK_ONLY",
  ALLOWED_ENTITIES_JSON: "APEX_HOME_ASSISTANT_ALLOWED_ENTITIES_JSON",
  REQUEST_TIMEOUT_MS: "APEX_HOME_ASSISTANT_REQUEST_TIMEOUT_MS",
  MAX_RETRIES: "APEX_HOME_ASSISTANT_MAX_RETRIES",
  ALLOW_DASHBOARD_CAST: "APEX_HOME_ASSISTANT_ALLOW_DASHBOARD_CAST",
});

export const HOME_ASSISTANT_CONNECTOR_STATUS = Object.freeze({
  ENABLED: "enabled",
  DISABLED: "disabled",
  BLOCKED: "blocked",
  ERROR: "error",
});

export const HOME_ASSISTANT_PREVIEW_STATUS = Object.freeze({
  PREPARED: "prepared",
  DISABLED: "disabled",
  BLOCKED: "blocked",
  NEEDS_INFO: "needs-info",
});

export const HOME_ASSISTANT_STATUS_READ_STATUS = Object.freeze({
  OK: "ok",
  DISABLED: "disabled",
  BLOCKED: "blocked",
  ERROR: "error",
});

export const HOME_ASSISTANT_EXECUTION_STATUS = Object.freeze({
  SUCCEEDED: "succeeded",
  DRY_RUN: "dry-run",
  DISABLED: "disabled",
  BLOCKED: "blocked",
  EXPIRED: "expired",
  REPLAYED: "replayed",
  ERROR: "error",
});

const PRIVATE_CONFIG = Symbol("homeAssistantPrivateConfig");
const TEXT_LIMIT = 1200;
const SHORT_LIMIT = 180;
const DEFAULT_EXECUTION_GUARD_TTL_MS = 5 * 60 * 1000;
const MAX_EXECUTION_GUARDS = 100;
const DEFAULT_MAX_VOLUME_LEVEL = 0.6;
const HARD_MAX_VOLUME_LEVEL = 0.75;

const ALLOWED_DOMAINS = Object.freeze(new Set(["media_player", "light", "switch", "scene", "script"]));
const BLOCKED_DOMAINS = Object.freeze(new Set([
  "camera",
  "lock",
  "alarm_control_panel",
  "climate",
  "cover",
  "fan",
  "humidifier",
  "lawn_mower",
  "remote",
  "siren",
  "stt",
  "tts",
  "vacuum",
]));

const BLOCKED_TARGET_PATTERNS = Object.freeze([
  /\b(camera|webcam|microphone|mic|record|recording|surveillance|monitor|watch|spy|listen)\b/i,
  /\b(lock|alarm|security|thermostat|hvac|climate|garage|garage door|door opener)\b/i,
]);

const DOMAIN_SERVICES = Object.freeze({
  media_player: Object.freeze([
    "media_player.turn_on",
    "media_player.turn_off",
    "media_player.volume_set",
    "media_player.volume_up",
    "media_player.volume_down",
    "media_player.select_source",
  ]),
  light: Object.freeze(["light.turn_on", "light.turn_off"]),
  switch: Object.freeze(["switch.turn_on", "switch.turn_off"]),
  scene: Object.freeze(["scene.turn_on"]),
  script: Object.freeze(["script.turn_on"]),
});

const V1_EXECUTABLE_SERVICES = Object.freeze(new Set([
  "media_player.turn_on",
  "media_player.turn_off",
  "media_player.volume_set",
  "media_player.select_source",
  "light.turn_on",
  "light.turn_off",
  "switch.turn_on",
  "switch.turn_off",
  "scene.turn_on",
  "script.turn_on",
]));

const COMMAND_ALIASES = Object.freeze({
  "turn-on": ["turn-on", "turn_on", "power-on", "power_on", "on", "turn on", APEX_OS_DEVICE_COMMAND_TYPE.POWER_ON],
  "turn-off": ["turn-off", "turn_off", "power-off", "power_off", "off", "turn off", APEX_OS_DEVICE_COMMAND_TYPE.POWER_OFF],
  "volume-set": ["volume-set", "volume_set", "set-volume", "set volume", APEX_OS_DEVICE_COMMAND_TYPE.SET_VOLUME],
  "volume-up": ["volume-up", "volume_up", "louder", "volume up"],
  "volume-down": ["volume-down", "volume_down", "quieter", "volume down"],
  "select-source": ["select-source", "select_source", "set-input-source", "input-source", "source", APEX_OS_DEVICE_COMMAND_TYPE.SET_INPUT_SOURCE],
  "trigger-scene": ["trigger-scene", "trigger_scene", "activate-scene", "scene", APEX_OS_DEVICE_COMMAND_TYPE.ACTIVATE_SCENE],
  "dashboard-cast": ["dashboard-cast", "dashboard_cast", "open-dashboard", "show-dashboard", "cast-dashboard", APEX_OS_DEVICE_COMMAND_TYPE.SHOW_DASHBOARD],
});

function text(value = "", limit = TEXT_LIMIT) {
  return String(value ?? "").replace(/\s+\n/g, "\n").replace(/\s+/g, " ").trim().slice(0, limit);
}

function lower(value = "") {
  return text(value).toLowerCase();
}

function safeText(value = "", limit = TEXT_LIMIT) {
  return text(redactApexOsSensitiveText(value).sanitizedText, limit);
}

function slug(value = "", fallback = "") {
  const normalized = lower(value)
    .replace(/[^a-z0-9_.-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
  return normalized || fallback;
}

function stableHash(value = "") {
  const input = text(value, 4000);
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36).padStart(7, "0").slice(0, 10);
}

function sortForJson(value) {
  if (Array.isArray(value)) return value.map(sortForJson);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, sortForJson(entry)]),
    );
  }
  return value;
}

function canonicalJson(value = {}) {
  return JSON.stringify(sortForJson(value));
}

function sha256(value = "") {
  return `sha256:${crypto.createHash("sha256").update(String(value)).digest("hex")}`;
}

function hashObject(value = {}) {
  return sha256(canonicalJson(value));
}

function safeNowMs(value = null) {
  if (value instanceof Date) return value.getTime();
  const parsed = Date.parse(value || "");
  return Number.isFinite(parsed) ? parsed : Date.now();
}

function randomToken(bytes = 24, options = {}) {
  const randomBytes = typeof options.randomBytes === "function"
    ? options.randomBytes(bytes)
    : crypto.randomBytes(bytes);
  return Buffer.from(randomBytes).toString("base64url");
}

function createdAtIso(value = "", now = new Date()) {
  const parsed = Date.parse(value || "");
  if (Number.isFinite(parsed)) return new Date(parsed).toISOString();
  return new Date(now).toISOString();
}

function parseBoolean(value, fallback = false) {
  if (value == null || value === "") return fallback;
  const normalized = lower(value);
  if (["true", "1", "yes", "on"].includes(normalized)) return true;
  if (["false", "0", "no", "off"].includes(normalized)) return false;
  return fallback;
}

function boundedInteger(value, fallback = 3000, min = 100, max = 15000) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function boundedRetries(value, fallback = 0) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.min(2, parsed));
}

function boundedNumber(value, fallback = 0, min = 0, max = 1) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function envValue(env = {}, name = "") {
  return String(env?.[name] ?? "").trim();
}

function isLocalNetworkHostname(hostname = "") {
  const host = lower(hostname).replace(/^\[|\]$/g, "");
  if (!host) return false;
  if (["localhost", "::1"].includes(host)) return true;
  if (host.endsWith(".local")) return true;
  if (/^127\./.test(host)) return true;
  if (/^10\./.test(host)) return true;
  if (/^192\.168\./.test(host)) return true;
  const private172 = host.match(/^172\.(\d{1,2})\./);
  if (private172) {
    const second = Number(private172[1]);
    return second >= 16 && second <= 31;
  }
  return false;
}

function parseBaseUrl(value = "") {
  const raw = text(value, 2000);
  if (!raw) {
    return {
      configured: false,
      ok: false,
      localNetwork: false,
      reason: "missing-base-url",
      normalizedUrl: "",
    };
  }

  try {
    const parsed = new URL(raw);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return {
        configured: true,
        ok: false,
        localNetwork: false,
        reason: "unsupported-url-protocol",
        normalizedUrl: "",
      };
    }
    if (parsed.username || parsed.password) {
      return {
        configured: true,
        ok: false,
        localNetwork: false,
        reason: "url-credentials-not-allowed",
        normalizedUrl: "",
      };
    }
    parsed.pathname = parsed.pathname.replace(/\/+$/, "");
    parsed.search = "";
    parsed.hash = "";
    return {
      configured: true,
      ok: true,
      localNetwork: isLocalNetworkHostname(parsed.hostname),
      reason: "",
      normalizedUrl: parsed.toString().replace(/\/+$/, ""),
    };
  } catch {
    return {
      configured: true,
      ok: false,
      localNetwork: false,
      reason: "invalid-base-url",
      normalizedUrl: "",
    };
  }
}

function domainFromEntityId(entityId = "") {
  const [domain] = lower(entityId).split(".");
  return domain || "";
}

function isBlockedTargetText(value = "") {
  return BLOCKED_TARGET_PATTERNS.some((pattern) => pattern.test(value));
}

function normalizeEntityId(value = "") {
  const normalized = lower(value);
  return /^[a-z0-9_]+\.[a-z0-9_]+$/.test(normalized) ? normalized : "";
}

function normalizeAllowedServices(domain = "", services = []) {
  const allowedForDomain = DOMAIN_SERVICES[domain] || [];
  const requested = Array.isArray(services) ? services : [services];
  const normalizedRequested = requested
    .map((entry) => lower(entry).replace(/\s+/g, "_"))
    .filter(Boolean);
  const source = normalizedRequested.length ? normalizedRequested : allowedForDomain;
  return [...new Set(source.filter((service) => allowedForDomain.includes(service)))];
}

function normalizeAllowedSources(value = []) {
  const requested = Array.isArray(value) ? value : [value];
  return Object.freeze([...new Set(requested
    .map((entry) => safeText(entry, 80))
    .filter(Boolean))]);
}

function normalizeMaxVolumeLevel(value = null) {
  if (value == null || value === "") return DEFAULT_MAX_VOLUME_LEVEL;
  const parsed = Number(value);
  const normalized = Number.isFinite(parsed) ? (parsed > 1 ? parsed / 100 : parsed) : DEFAULT_MAX_VOLUME_LEVEL;
  return Number(Math.max(0, Math.min(HARD_MAX_VOLUME_LEVEL, normalized)).toFixed(2));
}

function parseAllowlistInput(value = "") {
  if (!value) return { value: null, errors: ["missing-allowlist"] };
  if (typeof value === "object") return { value, errors: [] };
  try {
    return { value: JSON.parse(String(value)), errors: [] };
  } catch {
    return { value: null, errors: ["invalid-allowlist-json"] };
  }
}

function entriesForSection(section = {}) {
  if (Array.isArray(section)) {
    return section.map((entry) => [entry?.apexDeviceId || entry?.sceneId || entry?.id || entry?.label || "", entry]);
  }
  if (section && typeof section === "object") return Object.entries(section);
  return [];
}

function normalizeAllowlistEntry(entryKey = "", entry = {}, type = "device") {
  const errors = [];
  const apexId = slug(entry?.apexDeviceId || entry?.sceneId || entry?.id || entryKey, "");
  const label = safeText(entry?.label || entry?.name || apexId, SHORT_LIMIT);
  const entityId = normalizeEntityId(entry?.entityId || entry?.entity_id || "");
  const entityDomain = domainFromEntityId(entityId);
  const requestedDomain = lower(entry?.domain || "");
  const domain = requestedDomain || entityDomain;
  const blockedText = `${apexId} ${label} ${entityId} ${domain}`;

  if (!apexId) errors.push(`${type}-missing-apex-id`);
  if (!entityId) errors.push(`${apexId || type}-missing-or-invalid-entity-id`);
  if (requestedDomain && entityDomain && requestedDomain !== entityDomain) errors.push(`${apexId || type}-domain-entity-mismatch`);
  if (!domain || !ALLOWED_DOMAINS.has(domain)) errors.push(`${apexId || type}-disallowed-domain`);
  if (BLOCKED_DOMAINS.has(domain) || isBlockedTargetText(blockedText)) errors.push(`${apexId || type}-blocked-device-class`);

  const allowedServices = normalizeAllowedServices(domain, entry?.allowedServices || entry?.allowed_services || []);
  if (!allowedServices.length) errors.push(`${apexId || type}-no-allowed-services`);
  const allowedSources = normalizeAllowedSources(
    entry?.allowedSources
      || entry?.allowed_sources
      || entry?.sourceAllowlist
      || entry?.source_allowlist
      || entry?.sources
      || [],
  );
  const maxVolumeLevel = domain === "media_player"
    ? normalizeMaxVolumeLevel(entry?.maxVolumeLevel ?? entry?.max_volume_level ?? entry?.volumeMax ?? entry?.volume_max)
    : null;

  if (errors.length) {
    return {
      ok: false,
      errors,
      entry: null,
    };
  }

  const dashboardRequested = parseBoolean(entry?.allowDashboardCast ?? entry?.allow_dashboard_cast, false);
  const allowDashboardCast = dashboardRequested && ["scene", "script"].includes(domain);

  return {
    ok: true,
    errors: [],
    entry: Object.freeze({
      apexId,
      type,
      label,
      roomId: slug(entry?.roomId || entry?.room_id || "", ""),
      domain,
      entityId,
      allowedServices,
      allowedSources,
      maxVolumeLevel,
      allowDashboardCast,
      riskLevel: safeText(entry?.riskLevel || entry?.risk_level || "low-local-reversible", SHORT_LIMIT),
    }),
  };
}

export function normalizeHomeAssistantAllowlist(input = "") {
  const parsed = parseAllowlistInput(input);
  const devices = {};
  const scenes = {};
  const errors = [...parsed.errors];
  const blockedEntries = [];
  const source = parsed.value || {};

  for (const [key, entry] of entriesForSection(source.devices || {})) {
    const normalized = normalizeAllowlistEntry(key, entry, "device");
    if (normalized.ok) {
      devices[normalized.entry.apexId] = normalized.entry;
    } else {
      errors.push(...normalized.errors);
      blockedEntries.push(safeText(key, SHORT_LIMIT));
    }
  }

  for (const [key, entry] of entriesForSection(source.scenes || {})) {
    const normalized = normalizeAllowlistEntry(key, entry, "scene");
    if (normalized.ok) {
      scenes[normalized.entry.apexId] = normalized.entry;
    } else {
      errors.push(...normalized.errors);
      blockedEntries.push(safeText(key, SHORT_LIMIT));
    }
  }

  return Object.freeze({
    ok: errors.length === 0,
    devices: Object.freeze(devices),
    scenes: Object.freeze(scenes),
    allowlistHash: hashObject({
      devices: Object.values(devices).map((entry) => ({
        apexId: entry.apexId,
        domain: entry.domain,
        entityId: entry.entityId,
        allowedServices: entry.allowedServices,
        allowedSources: entry.allowedSources,
        maxVolumeLevel: entry.maxVolumeLevel,
        allowDashboardCast: entry.allowDashboardCast,
      })),
      scenes: Object.values(scenes).map((entry) => ({
        apexId: entry.apexId,
        domain: entry.domain,
        entityId: entry.entityId,
        allowedServices: entry.allowedServices,
        allowDashboardCast: entry.allowDashboardCast,
      })),
    }),
    deviceCount: Object.keys(devices).length,
    sceneCount: Object.keys(scenes).length,
    blockedEntryCount: blockedEntries.length,
    blockedEntries: Object.freeze(blockedEntries.slice(0, 20)),
    errors: Object.freeze(errors.slice(0, 30)),
    configured: Boolean(parsed.value) && (Object.keys(devices).length > 0 || Object.keys(scenes).length > 0),
  });
}

export function readHomeAssistantConnectorConfig(input = {}) {
  const env = input.env || process.env;
  const enabledRequested = parseBoolean(input.enabled ?? envValue(env, APEX_HOME_ASSISTANT_ENV.ENABLED), false);
  const killSwitch = parseBoolean(input.killSwitch ?? envValue(env, APEX_HOME_ASSISTANT_ENV.KILL_SWITCH), false);
  const localNetworkOnly = parseBoolean(input.localNetworkOnly ?? envValue(env, APEX_HOME_ASSISTANT_ENV.LOCAL_NETWORK_ONLY), true);
  const executionEnabledRequested = parseBoolean(input.executionEnabled ?? envValue(env, APEX_HOME_ASSISTANT_ENV.EXECUTION_ENABLED), false);
  const allowDashboardCast = parseBoolean(input.allowDashboardCast ?? envValue(env, APEX_HOME_ASSISTANT_ENV.ALLOW_DASHBOARD_CAST), false);
  const requestTimeoutMs = boundedInteger(input.requestTimeoutMs ?? envValue(env, APEX_HOME_ASSISTANT_ENV.REQUEST_TIMEOUT_MS), 3000, 100, 15000);
  const maxRetries = boundedRetries(input.maxRetries ?? envValue(env, APEX_HOME_ASSISTANT_ENV.MAX_RETRIES), 0);
  const baseUrlResult = parseBaseUrl(input.baseUrl ?? envValue(env, APEX_HOME_ASSISTANT_ENV.BASE_URL));
  const token = text(input.token ?? envValue(env, APEX_HOME_ASSISTANT_ENV.TOKEN), 4000);
  const allowlist = normalizeHomeAssistantAllowlist(input.allowlist ?? input.allowedEntitiesJson ?? envValue(env, APEX_HOME_ASSISTANT_ENV.ALLOWED_ENTITIES_JSON));

  const disabledReasons = [];
  if (!enabledRequested) disabledReasons.push("enabled-flag-off");
  if (!baseUrlResult.configured) disabledReasons.push("missing-base-url");
  if (baseUrlResult.configured && !baseUrlResult.ok) disabledReasons.push(baseUrlResult.reason || "invalid-base-url");
  if (!token) disabledReasons.push("missing-token");
  if (!allowlist.configured) disabledReasons.push("missing-allowlist");
  if (allowlist.errors.length) disabledReasons.push("allowlist-invalid");
  if (localNetworkOnly && baseUrlResult.ok && !baseUrlResult.localNetwork) disabledReasons.push("local-network-required");

  const configured = Boolean(baseUrlResult.ok && token && allowlist.configured && allowlist.errors.length === 0);
  const enabled = Boolean(enabledRequested && configured && (!localNetworkOnly || baseUrlResult.localNetwork));
  const executionEnabled = Boolean(enabled && executionEnabledRequested && !killSwitch);
  const status = killSwitch
    ? HOME_ASSISTANT_CONNECTOR_STATUS.BLOCKED
    : enabled
      ? HOME_ASSISTANT_CONNECTOR_STATUS.ENABLED
      : HOME_ASSISTANT_CONNECTOR_STATUS.DISABLED;

  return Object.freeze({
    connector: "home-assistant",
    status,
    configured,
    enabled,
    enabledRequested,
    killSwitch,
    localNetworkOnly,
    baseUrlConfigured: baseUrlResult.configured,
    baseUrlValid: baseUrlResult.ok,
    baseUrlLocalNetwork: baseUrlResult.localNetwork,
    tokenConfigured: Boolean(token),
    allowlistConfigured: allowlist.configured,
    allowlistHash: allowlist.allowlistHash,
    allowlistDeviceCount: allowlist.deviceCount,
    allowlistSceneCount: allowlist.sceneCount,
    allowlistBlockedEntryCount: allowlist.blockedEntryCount,
    allowlistErrors: allowlist.errors,
    disabledReasons: Object.freeze([...new Set(disabledReasons)].slice(0, 20)),
    executionEnabledRequested,
    executionEnabled,
    executionFlagIgnored: false,
    executionAvailable: executionEnabled,
    allowDashboardCast,
    requestTimeoutMs,
    maxRetries,
    canExecuteNow: false,
    canExecuteAfterApproval: executionEnabled,
    executionLocked: !executionEnabled,
    noExecutionTokens: !executionEnabled,
    tokenExposed: false,
    baseUrlExposed: false,
    [PRIVATE_CONFIG]: Object.freeze({
      baseUrl: baseUrlResult.normalizedUrl,
      token,
      allowlist,
    }),
  });
}

export function getHomeAssistantConnectorStatus(input = {}) {
  const config = input.connectorConfig?.connector ? input.connectorConfig : readHomeAssistantConnectorConfig(input);
  return Object.freeze({
    connector: "home-assistant",
    status: config.status,
    configured: config.configured,
    enabled: config.enabled,
    enabledRequested: config.enabledRequested,
    killSwitch: config.killSwitch,
    localNetworkOnly: config.localNetworkOnly,
    baseUrlConfigured: config.baseUrlConfigured,
    baseUrlValid: config.baseUrlValid,
    baseUrlLocalNetwork: config.baseUrlLocalNetwork,
    tokenConfigured: config.tokenConfigured,
    allowlistConfigured: config.allowlistConfigured,
    allowlistDeviceCount: config.allowlistDeviceCount,
    allowlistSceneCount: config.allowlistSceneCount,
    allowlistBlockedEntryCount: config.allowlistBlockedEntryCount,
    allowlistErrors: config.allowlistErrors,
    disabledReasons: config.disabledReasons,
    executionEnabledRequested: config.executionEnabledRequested,
    executionEnabled: config.executionEnabled,
    executionFlagIgnored: config.executionFlagIgnored,
    executionAvailable: config.executionAvailable,
    canExecuteNow: false,
    canExecuteAfterApproval: config.canExecuteAfterApproval,
    executionLocked: config.executionLocked,
    noExecutionTokens: config.noExecutionTokens,
    tokenExposed: false,
    baseUrlExposed: false,
  });
}

function commandFromInput(input = {}) {
  const raw = lower(input.command || input.commandType || input.action || input.intent || "");
  if (!raw && lower(input.request || input.description).includes("dashboard")) return "dashboard-cast";
  for (const [command, aliases] of Object.entries(COMMAND_ALIASES)) {
    if (aliases.map(lower).includes(raw)) return command;
  }
  if (/\b(turn|power|switch)\b.{0,25}\bon\b/.test(raw)) return "turn-on";
  if (/\b(turn|power|switch)\b.{0,25}\boff\b/.test(raw)) return "turn-off";
  if (/volume/.test(raw) && /\bset\b/.test(raw)) return "volume-set";
  if (/volume/.test(raw) && /\b(up|louder)\b/.test(raw)) return "volume-up";
  if (/volume/.test(raw) && /\b(down|quieter)\b/.test(raw)) return "volume-down";
  if (/\b(source|input|hdmi)\b/.test(raw)) return "select-source";
  if (/\b(scene|script|mode)\b/.test(raw)) return "trigger-scene";
  if (/\b(dashboard|cast|display|show)\b/.test(raw)) return "dashboard-cast";
  return raw || "unknown";
}

function resolveAllowlistedTarget(input = {}, config = readHomeAssistantConnectorConfig()) {
  const allowlist = config[PRIVATE_CONFIG]?.allowlist || normalizeHomeAssistantAllowlist();
  const apexDeviceId = slug(input.apexDeviceId || input.deviceId || "", "");
  const sceneId = slug(input.sceneId || "", "");
  const suppliedEntityId = normalizeEntityId(input.entityId || input.entity_id || "");

  if (suppliedEntityId && !apexDeviceId && !sceneId) {
    return {
      ok: false,
      reason: "free-form-entity-id-blocked",
      target: null,
    };
  }

  if (apexDeviceId) {
    const target = allowlist.devices[apexDeviceId] || null;
    if (!target) return { ok: false, reason: "unknown-apex-device-id", target: null };
    if (suppliedEntityId && suppliedEntityId !== target.entityId) return { ok: false, reason: "entity-id-mismatch", target: null };
    return { ok: true, reason: "", target };
  }

  if (sceneId) {
    const target = allowlist.scenes[sceneId] || null;
    if (!target) return { ok: false, reason: "unknown-scene-id", target: null };
    if (suppliedEntityId && suppliedEntityId !== target.entityId) return { ok: false, reason: "entity-id-mismatch", target: null };
    return { ok: true, reason: "", target };
  }

  return {
    ok: false,
    reason: "missing-apex-device-or-scene-id",
    target: null,
  };
}

function serviceForCommand(command = "", target = {}, input = {}) {
  const domain = target.domain || "";
  if (command === "turn-on" && ["media_player", "light", "switch"].includes(domain)) return `${domain}.turn_on`;
  if (command === "turn-off" && ["media_player", "light", "switch"].includes(domain)) return `${domain}.turn_off`;
  if (command === "volume-set" && domain === "media_player") return "media_player.volume_set";
  if (command === "volume-up" && domain === "media_player") return "media_player.volume_up";
  if (command === "volume-down" && domain === "media_player") return "media_player.volume_down";
  if (command === "select-source" && domain === "media_player") return "media_player.select_source";
  if (command === "trigger-scene" && ["scene", "script"].includes(domain)) return `${domain}.turn_on`;
  if (command === "dashboard-cast" && target.allowDashboardCast && ["scene", "script"].includes(domain)) return `${domain}.turn_on`;
  if (input.service && target.allowedServices?.includes(lower(input.service))) return lower(input.service);
  return "";
}

function normalizePayloadVolume(input = {}, target = {}) {
  const rawInput = input.volumeLevel ?? input.volume_level ?? input.value;
  if (rawInput == null || rawInput === "") {
    return { ok: false, reason: "missing-volume-level", value: null };
  }
  const rawVolume = Number(rawInput);
  if (!Number.isFinite(rawVolume)) {
    return { ok: false, reason: "invalid-volume-level", value: null };
  }
  const normalized = rawVolume > 1 ? rawVolume / 100 : rawVolume;
  const maxVolumeLevel = boundedNumber(target.maxVolumeLevel ?? DEFAULT_MAX_VOLUME_LEVEL, DEFAULT_MAX_VOLUME_LEVEL, 0, HARD_MAX_VOLUME_LEVEL);
  if (normalized < 0 || normalized > maxVolumeLevel) {
    return { ok: false, reason: "volume-level-outside-safe-range", value: null };
  }
  return { ok: true, reason: "", value: Number(normalized.toFixed(2)) };
}

function normalizePayloadSource(input = {}, target = {}) {
  const source = safeText(input.source || input.inputSource || input.input_source || "", 80);
  if (!source) return { ok: false, reason: "missing-source", value: "" };
  const allowedSources = Array.isArray(target.allowedSources) ? target.allowedSources : [];
  if (!allowedSources.length) return { ok: false, reason: "source-allowlist-required", value: "" };
  const matchedSource = allowedSources.find((entry) => lower(entry) === lower(source));
  if (!matchedSource) return { ok: false, reason: "source-not-allowlisted", value: "" };
  return { ok: true, reason: "", value: matchedSource };
}

function buildPayloadForCommand(command = "", target = {}, input = {}) {
  const payload = { entity_id: target.entityId };
  if (command === "volume-set") {
    const volume = normalizePayloadVolume(input, target);
    if (!volume.ok) return { ok: false, reason: volume.reason, payload: null };
    payload.volume_level = volume.value;
  }
  if (command === "select-source") {
    const source = normalizePayloadSource(input, target);
    if (!source.ok) return { ok: false, reason: source.reason, payload: null };
    payload.source = source.value;
  }
  return { ok: true, reason: "", payload: Object.freeze(payload) };
}

function validatePayloadForCommand(command = "", target = {}, payload = {}) {
  const allowedKeysByCommand = {
    "turn-on": ["entity_id"],
    "turn-off": ["entity_id"],
    "volume-set": ["entity_id", "volume_level"],
    "select-source": ["entity_id", "source"],
    "trigger-scene": ["entity_id"],
    "dashboard-cast": ["entity_id"],
  };
  const allowedKeys = allowedKeysByCommand[command] || [];
  const payloadKeys = Object.keys(payload || {});
  if (!allowedKeys.length || payloadKeys.some((key) => !allowedKeys.includes(key))) {
    return { ok: false, reason: "free-form-payload-blocked" };
  }
  if (normalizeEntityId(payload.entity_id || "") !== target.entityId) {
    return { ok: false, reason: "payload-entity-mismatch" };
  }
  if (command === "volume-set") {
    const maxVolumeLevel = boundedNumber(target.maxVolumeLevel ?? DEFAULT_MAX_VOLUME_LEVEL, DEFAULT_MAX_VOLUME_LEVEL, 0, HARD_MAX_VOLUME_LEVEL);
    const volume = Number(payload.volume_level);
    if (!Number.isFinite(volume) || volume < 0 || volume > maxVolumeLevel) {
      return { ok: false, reason: "volume-level-outside-safe-range" };
    }
  }
  if (command === "select-source") {
    const source = safeText(payload.source || "", 80);
    const allowedSources = Array.isArray(target.allowedSources) ? target.allowedSources : [];
    if (!source || !allowedSources.some((entry) => lower(entry) === lower(source))) {
      return { ok: false, reason: "source-not-allowlisted" };
    }
  }
  return { ok: true, reason: "" };
}

function buildSafetySummaries(input = {}, requestDescription = "") {
  const privacyResult = classifyApexOsPrivacy(requestDescription, {
    sourceContext: APEX_OS_PRIVACY_CONTEXT.OPERATOR_PRIVATE,
    targetContext: APEX_OS_PRIVACY_CONTEXT.EXTERNAL_CONNECTOR,
    approved: false,
  });
  const privacySummary = buildApexOsPrivacySummary([privacyResult]);
  const untrustedResult = classifyApexOsUntrustedContent(input.untrustedContent || requestDescription, {
    trustLevel: input.untrustedContent
      ? APEX_OS_CONTENT_TRUST_LEVEL.UNTRUSTED_USER_PASTE
      : APEX_OS_CONTENT_TRUST_LEVEL.TRUSTED_OPERATOR,
    sourceType: input.untrustedContent ? APEX_OS_UNTRUSTED_SOURCE.CLIPBOARD_PASTE : APEX_OS_UNTRUSTED_SOURCE.UNKNOWN,
    sourceLabel: input.sourceLabel || "Home Assistant connector preview",
  });
  const untrustedContentFirewallSummary = buildApexOsUntrustedContentSummary([untrustedResult]);
  const sanitizedDescription = privacySummary.blockedCount > 0
    ? privacyResult.sanitizedText
    : (untrustedContentFirewallSummary.blocked || untrustedContentFirewallSummary.requiresOperatorReview)
      ? untrustedResult.sanitizedText
      : privacyResult.sanitizedText;
  const actionPermissionSummary = buildApexOsActionPermissionSummary(classifyApexOsAction({
    description: sanitizedDescription || requestDescription,
  }));
  const toolRouteSummary = buildApexOsToolRouteSummary(planApexOsToolRoute({
    description: sanitizedDescription || requestDescription,
    actionPermissionSummary,
    privacyFirewallSummary: privacySummary,
    untrustedContentFirewallSummary,
  }));

  return {
    sanitizedDescription,
    privacySummary,
    untrustedContentFirewallSummary,
    actionPermissionSummary,
    toolRouteSummary,
  };
}

function lockedExecution() {
  return Object.freeze({
    canExecuteNow: false,
    canExecuteAfterApproval: false,
    executionLocked: true,
    noExecutionTokens: true,
    serviceCallExecuted: false,
    realDeviceTouched: false,
    externalActionExecuted: false,
  });
}

function blockedPreview(reason = "", config = null, extra = {}) {
  return Object.freeze({
    connector: "home-assistant",
    readinessLevel: 3,
    operatorOnly: true,
    status: extra.status || HOME_ASSISTANT_PREVIEW_STATUS.BLOCKED,
    reason: safeText(reason || "home-assistant-preview-blocked", SHORT_LIMIT),
    configStatus: config ? getHomeAssistantConnectorStatus({ connectorConfig: config }) : null,
    previewId: "",
    service: "",
    entityId: "",
    payload: null,
    target: null,
    receiptDraft: Object.freeze({
      summary: "Home Assistant preview blocked. No service call executed.",
      externalActionExecuted: false,
      realDeviceTouched: false,
      serviceCallExecuted: false,
    }),
    ...lockedExecution(),
    ...extra,
  });
}

export function buildHomeAssistantCommandPreview(input = {}, options = {}) {
  const config = options.connectorConfig?.connector ? options.connectorConfig : readHomeAssistantConnectorConfig({
    ...(options || {}),
    env: options.env || input.env,
  });
  const requestDescription = text([
    input.request,
    input.description,
    input.command,
    input.commandType,
    input.action,
    input.apexDeviceId,
    input.sceneId,
    input.source,
  ].filter(Boolean).join(" "), TEXT_LIMIT);
  const safety = buildSafetySummaries(input, requestDescription || "Home Assistant command preview");

  if (config.killSwitch) return blockedPreview("home-assistant-kill-switch-on", config, { status: HOME_ASSISTANT_PREVIEW_STATUS.BLOCKED, ...safety });
  if (!config.enabled) return blockedPreview("home-assistant-connector-disabled", config, { status: HOME_ASSISTANT_PREVIEW_STATUS.DISABLED, ...safety });
  if (safety.privacySummary.blockedCount > 0) return blockedPreview("privacy-firewall-blocked", config, safety);
  if (safety.privacySummary.approvalRequiredCount > 0) return blockedPreview("privacy-approval-required", config, { status: HOME_ASSISTANT_PREVIEW_STATUS.NEEDS_INFO, ...safety });
  if (shouldBlockApexOsUntrustedRoute(safety.untrustedContentFirewallSummary)) return blockedPreview("prompt-injection-firewall-blocked", config, safety);
  if (safety.actionPermissionSummary.forbidden) return blockedPreview("action-permission-forbidden", config, safety);

  const targetResolution = resolveAllowlistedTarget(input, config);
  if (!targetResolution.ok) return blockedPreview(targetResolution.reason, config, safety);

  const command = commandFromInput(input);
  const service = serviceForCommand(command, targetResolution.target, input);
  if (!service) return blockedPreview("command-not-allowed-for-target", config, safety);
  if (!targetResolution.target.allowedServices.includes(service)) return blockedPreview("service-not-allowlisted", config, safety);

  const payloadResult = buildPayloadForCommand(command, targetResolution.target, input);
  if (!payloadResult.ok) return blockedPreview(payloadResult.reason, config, safety);
  const payload = payloadResult.payload;
  const now = options.now || input.now || new Date();
  const createdAt = createdAtIso("", now);
  const previewContract = {
    command,
    service,
    entityId: targetResolution.target.entityId,
    payload,
  };
  const previewHash = hashObject(previewContract);
  const shortPreviewHash = stableHash(previewHash);
  const payloadHash = hashObject(payload);
  const previewId = `HA-PV-${createdAt.slice(0, 10).replace(/-/g, "")}-${shortPreviewHash}`;

  return Object.freeze({
    connector: "home-assistant",
    readinessLevel: 3,
    operatorOnly: true,
    status: HOME_ASSISTANT_PREVIEW_STATUS.PREPARED,
    previewId,
    previewHash,
    payloadHash,
    command,
    service,
    entityId: targetResolution.target.entityId,
    payload,
    target: Object.freeze({
      type: targetResolution.target.type,
      apexId: targetResolution.target.apexId,
      label: targetResolution.target.label,
      roomId: targetResolution.target.roomId,
      domain: targetResolution.target.domain,
      entityId: targetResolution.target.entityId,
      riskLevel: targetResolution.target.riskLevel,
      allowedSources: targetResolution.target.allowedSources,
      maxVolumeLevel: targetResolution.target.maxVolumeLevel,
    }),
    configStatus: getHomeAssistantConnectorStatus({ connectorConfig: config }),
    requestSummary: safeText(safety.sanitizedDescription, SHORT_LIMIT),
    privacySummary: safety.privacySummary,
    promptInjectionSummary: safety.untrustedContentFirewallSummary,
    actionPermissionSummary: safety.actionPermissionSummary,
    toolRouteSummary: safety.toolRouteSummary,
    timeoutMs: config.requestTimeoutMs,
    maxRetries: config.maxRetries,
    receiptDraft: Object.freeze({
      summary: `Prepared Home Assistant ${service} preview for ${targetResolution.target.label}. No service call executed.`,
      externalActionExecuted: false,
      realDeviceTouched: false,
      serviceCallExecuted: false,
      previewId,
    }),
    futureLevel4ApprovalPhrase: `I approve Apex to execute Home Assistant preview ${previewId} one time now`,
    cancellationPath: "Cancel by doing nothing. No Home Assistant service call has been made.",
    ...lockedExecution(),
    createdAt,
  });
}

const homeAssistantExecutionGuards = new Map();

function guardActorKey(options = {}) {
  return safeText(options.actorId || options.userId || "apex-os-operator", SHORT_LIMIT);
}

function guardWorkspaceKey(options = {}) {
  return safeText(options.workspaceId || options.companyId || "apex-hq-default", SHORT_LIMIT);
}

function pruneHomeAssistantExecutionGuards(nowMs = Date.now()) {
  for (const [guardId, record] of homeAssistantExecutionGuards.entries()) {
    if (record.expiresAtMs <= nowMs || record.consumed) {
      homeAssistantExecutionGuards.delete(guardId);
    }
  }
  while (homeAssistantExecutionGuards.size > MAX_EXECUTION_GUARDS) {
    const [oldestGuardId] = homeAssistantExecutionGuards.keys();
    homeAssistantExecutionGuards.delete(oldestGuardId);
  }
}

function isV1ExecutablePreview(preview = {}) {
  return preview?.status === HOME_ASSISTANT_PREVIEW_STATUS.PREPARED
    && preview.readinessLevel === 3
    && V1_EXECUTABLE_SERVICES.has(preview.service)
    && preview.target?.entityId
    && preview.payload?.entity_id === preview.target.entityId;
}

function guardedTargetInput(record = {}) {
  return record.targetType === "scene"
    ? { sceneId: record.targetApexId }
    : { apexDeviceId: record.targetApexId };
}

function buildConfirmationPhrase(previewId = "") {
  return `I approve Apex to execute Home Assistant preview ${previewId} one time now`;
}

function unavailableExecutionGuard(reason = "", config = null, extra = {}) {
  return Object.freeze({
    connector: "home-assistant",
    status: extra.status || HOME_ASSISTANT_EXECUTION_STATUS.BLOCKED,
    reason: safeText(reason || "home-assistant-execution-guard-unavailable", SHORT_LIMIT),
    executionGuard: "",
    guardId: "",
    previewId: safeText(extra.previewId || "", SHORT_LIMIT),
    previewHash: safeText(extra.previewHash || "", SHORT_LIMIT),
    expiresAt: "",
    confirmationPhrase: "",
    configStatus: config ? getHomeAssistantConnectorStatus({ connectorConfig: config }) : null,
    canExecuteNow: false,
    canExecuteAfterApproval: false,
    executionLocked: true,
    noExecutionTokens: true,
    tokenExposed: false,
    baseUrlExposed: false,
  });
}

export function createHomeAssistantExecutionGuard(preview = {}, options = {}) {
  const config = options.connectorConfig?.connector ? options.connectorConfig : readHomeAssistantConnectorConfig({
    ...(options || {}),
    env: options.env,
  });
  const nowMs = safeNowMs(options.now);
  pruneHomeAssistantExecutionGuards(nowMs);

  if (!isV1ExecutablePreview(preview)) {
    return unavailableExecutionGuard("preview-not-v1-executable", config, {
      previewId: preview?.previewId,
      previewHash: preview?.previewHash,
    });
  }
  if (config.killSwitch) {
    return unavailableExecutionGuard("home-assistant-kill-switch-on", config, {
      status: HOME_ASSISTANT_EXECUTION_STATUS.BLOCKED,
      previewId: preview.previewId,
      previewHash: preview.previewHash,
    });
  }
  if (!config.enabled) {
    return unavailableExecutionGuard("home-assistant-connector-disabled", config, {
      status: HOME_ASSISTANT_EXECUTION_STATUS.DISABLED,
      previewId: preview.previewId,
      previewHash: preview.previewHash,
    });
  }
  if (!config.executionEnabled) {
    return unavailableExecutionGuard("home-assistant-execution-disabled", config, {
      status: HOME_ASSISTANT_EXECUTION_STATUS.DISABLED,
      previewId: preview.previewId,
      previewHash: preview.previewHash,
    });
  }

  const guardId = `HA-EG-${new Date(nowMs).toISOString().slice(0, 10).replace(/-/g, "")}-${stableHash(`${preview.previewId}:${nowMs}:${homeAssistantExecutionGuards.size}`)}`;
  const token = randomToken(24, options);
  const executionGuard = `${guardId}.${token}`;
  const tokenHash = sha256(token);
  const ttlMs = boundedInteger(options.ttlMs, DEFAULT_EXECUTION_GUARD_TTL_MS, 1000, DEFAULT_EXECUTION_GUARD_TTL_MS);
  const expiresAtMs = nowMs + ttlMs;
  const confirmationPhrase = buildConfirmationPhrase(preview.previewId);
  const record = Object.freeze({
    guardId,
    tokenHash,
    previewId: preview.previewId,
    previewHash: preview.previewHash || hashObject({
      command: preview.command,
      service: preview.service,
      entityId: preview.entityId,
      payload: preview.payload,
    }),
    payloadHash: preview.payloadHash || hashObject(preview.payload || {}),
    command: preview.command,
    service: preview.service,
    entityId: preview.entityId,
    payload: preview.payload,
    targetType: preview.target?.type || "device",
    targetApexId: preview.target?.apexId || "",
    targetLabel: preview.target?.label || "",
    requestSummary: preview.requestSummary || "",
    actorKey: guardActorKey(options),
    workspaceKey: guardWorkspaceKey(options),
    allowlistHash: config.allowlistHash,
    createdAtMs: nowMs,
    expiresAtMs,
    confirmationPhrase,
    consumed: false,
  });
  homeAssistantExecutionGuards.set(guardId, record);

  return Object.freeze({
    connector: "home-assistant",
    status: "created",
    reason: "home-assistant-execution-guard-created",
    executionGuard,
    guardId,
    previewId: preview.previewId,
    previewHash: record.previewHash,
    expiresAt: new Date(expiresAtMs).toISOString(),
    confirmationPhrase,
    canExecuteNow: false,
    canExecuteAfterApproval: true,
    executionLocked: false,
    noExecutionTokens: false,
    tokenExposed: false,
    baseUrlExposed: false,
  });
}

function lookupExecutionGuard(value = "") {
  const raw = safeText(value, 600);
  const [guardId, token] = raw.split(".");
  if (!guardId || !token) return { ok: false, reason: "missing-execution-guard", record: null };
  const record = homeAssistantExecutionGuards.get(guardId);
  if (!record) return { ok: false, reason: "unknown-execution-guard", record: null };
  if (record.tokenHash !== sha256(token)) return { ok: false, reason: "invalid-execution-guard", record: null };
  return { ok: true, reason: "", record };
}

function replaceExecutionGuardRecord(record = {}, updates = {}) {
  const updated = Object.freeze({
    ...record,
    ...updates,
  });
  homeAssistantExecutionGuards.set(record.guardId, updated);
  return updated;
}

export function resetHomeAssistantExecutionGuardsForTest() {
  homeAssistantExecutionGuards.clear();
}

function undoHintForHomeAssistantCommand(command = "", service = "", label = "device") {
  if (service.endsWith(".turn_on")) return `Create a new preview to turn ${label} off.`;
  if (service.endsWith(".turn_off")) return `Create a new preview to turn ${label} on.`;
  if (command === "volume-set") return `Create a new preview to adjust ${label} volume again.`;
  if (command === "select-source") return `Create a new preview to change ${label} source again.`;
  if (service === "scene.turn_on" || service === "script.turn_on") return "Scenes/scripts may not have a reliable undo. Use an allowlisted reset scene or manual device controls if needed.";
  return "Use a new allowlisted preview for any follow-up change.";
}

function buildExecutionReceipt(input = {}) {
  const startedAt = input.startedAt || new Date().toISOString();
  const completedAt = input.completedAt || startedAt;
  return Object.freeze({
    connector: "home-assistant",
    receiptId: input.receiptId || `HA-REC-${stableHash(`${input.previewId || ""}:${completedAt}:${input.status || ""}`)}`,
    executionAttemptId: input.executionAttemptId || `HA-EX-${stableHash(`${input.previewId || ""}:${startedAt}`)}`,
    readinessLevel: 4,
    status: input.status || HOME_ASSISTANT_EXECUTION_STATUS.BLOCKED,
    reason: safeText(input.reason || "", SHORT_LIMIT),
    previewId: safeText(input.previewId || "", SHORT_LIMIT),
    previewHash: safeText(input.previewHash || "", 100),
    entityId: normalizeEntityId(input.entityId || ""),
    service: safeText(input.service || "", SHORT_LIMIT),
    target: input.target ? Object.freeze({
      type: safeText(input.target.type || "", SHORT_LIMIT),
      apexId: safeText(input.target.apexId || "", SHORT_LIMIT),
      label: safeText(input.target.label || "", SHORT_LIMIT),
      domain: safeText(input.target.domain || "", SHORT_LIMIT),
      entityId: normalizeEntityId(input.target.entityId || ""),
    }) : null,
    payloadHash: safeText(input.payloadHash || "", 100),
    summary: safeText(input.summary || "Home Assistant execution receipt.", 420),
    startedAt,
    completedAt,
    durationMs: Math.max(0, Number(input.durationMs || 0) || 0),
    timeoutMs: Math.max(0, Number(input.timeoutMs || 0) || 0),
    maxRetries: Math.max(0, Number(input.maxRetries || 0) || 0),
    httpStatus: Number(input.httpStatus || 0) || 0,
    resultCode: safeText(input.resultCode || "", SHORT_LIMIT),
    dryRun: Boolean(input.dryRun),
    serviceCallAttempted: Boolean(input.serviceCallAttempted),
    serviceCallExecuted: Boolean(input.serviceCallExecuted),
    realDeviceTouched: Boolean(input.realDeviceTouched),
    externalActionExecuted: Boolean(input.externalActionExecuted),
    undoAvailable: Boolean(input.undoAvailable),
    undoHint: safeText(input.undoHint || "", 320),
    privacySummary: input.privacySummary || null,
    promptInjectionSummary: input.promptInjectionSummary || null,
    actionPermissionSummary: input.actionPermissionSummary || null,
    toolRouteSummary: input.toolRouteSummary || null,
    tokenExposed: false,
    baseUrlExposed: false,
    headersExposed: false,
    rawProviderPayloadExposed: false,
    rawPrivatePromptExposed: false,
    unsafeContentExposed: false,
    canExecuteNow: false,
    canExecuteAfterApproval: false,
    executionLocked: true,
    noExecutionTokens: true,
  });
}

function blockedExecutionReceipt(reason = "", config = null, extra = {}) {
  const now = createdAtIso("", extra.now || new Date());
  return buildExecutionReceipt({
    status: extra.status || HOME_ASSISTANT_EXECUTION_STATUS.BLOCKED,
    reason,
    summary: extra.summary || `Home Assistant execution blocked: ${reason}.`,
    configStatus: config ? getHomeAssistantConnectorStatus({ connectorConfig: config }) : null,
    startedAt: extra.startedAt || now,
    completedAt: extra.completedAt || now,
    ...extra,
  });
}

function requestPayloadWasModified(input = {}, record = {}) {
  if (input.service && lower(input.service) !== record.service) return true;
  if ((input.entityId || input.entity_id) && normalizeEntityId(input.entityId || input.entity_id) !== record.entityId) return true;
  if (input.payload != null && hashObject(input.payload) !== record.payloadHash) return true;
  if (input.previewHash && safeText(input.previewHash, 100) !== record.previewHash) return true;
  return false;
}

async function callHomeAssistantServiceOnce(record = {}, config = {}, options = {}) {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    return { ok: false, status: HOME_ASSISTANT_EXECUTION_STATUS.ERROR, reason: "fetch-unavailable", httpStatus: 0 };
  }
  const privateConfig = config[PRIVATE_CONFIG] || {};
  const [domain, serviceName] = String(record.service || "").split(".");
  const url = `${privateConfig.baseUrl}/api/services/${encodeURIComponent(domain)}/${encodeURIComponent(serviceName)}`;
  const body = JSON.stringify(record.payload || {});
  let lastHttpStatus = 0;

  for (let attempt = 0; attempt <= config.maxRetries; attempt += 1) {
    try {
      const response = await fetchWithTimeout(fetchImpl, url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${privateConfig.token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body,
      }, config.requestTimeoutMs);
      lastHttpStatus = Number(response?.status || 0) || 0;
      if (response?.ok) {
        return { ok: true, status: HOME_ASSISTANT_EXECUTION_STATUS.SUCCEEDED, reason: "home-assistant-service-call-succeeded", httpStatus: lastHttpStatus };
      }
      if (attempt >= config.maxRetries) {
        return { ok: false, status: HOME_ASSISTANT_EXECUTION_STATUS.ERROR, reason: "home-assistant-service-call-failed", httpStatus: lastHttpStatus };
      }
    } catch {
      if (attempt >= config.maxRetries) {
        return { ok: false, status: HOME_ASSISTANT_EXECUTION_STATUS.ERROR, reason: "home-assistant-service-call-error", httpStatus: lastHttpStatus };
      }
    }
  }

  return { ok: false, status: HOME_ASSISTANT_EXECUTION_STATUS.ERROR, reason: "home-assistant-service-call-error", httpStatus: lastHttpStatus };
}

export async function executeHomeAssistantCommandOnce(input = {}, options = {}) {
  const startedAtMs = safeNowMs(options.now || input.now);
  const startedAt = new Date(startedAtMs).toISOString();
  const config = options.connectorConfig?.connector ? options.connectorConfig : readHomeAssistantConnectorConfig({
    ...(options || {}),
    env: options.env || input.env,
  });

  const block = (reason, extra = {}) => blockedExecutionReceipt(reason, config, {
    startedAt,
    completedAt: new Date(safeNowMs(extra.now || options.now || input.now)).toISOString(),
    timeoutMs: config.requestTimeoutMs,
    maxRetries: config.maxRetries,
    ...extra,
  });

  if (config.killSwitch) return block("home-assistant-kill-switch-on", { status: HOME_ASSISTANT_EXECUTION_STATUS.BLOCKED });
  if (!config.enabled) return block("home-assistant-connector-disabled", { status: HOME_ASSISTANT_EXECUTION_STATUS.DISABLED });
  if (!config.executionEnabled) return block("home-assistant-execution-disabled", { status: HOME_ASSISTANT_EXECUTION_STATUS.DISABLED });

  const previewId = safeText(input.previewId || input.preview_id || "", SHORT_LIMIT);
  if (!previewId) return block("missing-preview-id");
  const guardLookup = lookupExecutionGuard(input.executionGuard || input.execution_guard || "");
  if (!guardLookup.ok) return block(guardLookup.reason, { previewId });
  let record = guardLookup.record;

  if (record.previewId !== previewId) return block("preview-id-mismatch", { previewId, previewHash: record.previewHash });
  if (record.actorKey !== guardActorKey(options)) return block("execution-actor-mismatch", { previewId, previewHash: record.previewHash });
  if (record.workspaceKey !== guardWorkspaceKey(options)) return block("execution-workspace-mismatch", { previewId, previewHash: record.previewHash });
  if (record.consumed) return block("execution-guard-already-consumed", { status: HOME_ASSISTANT_EXECUTION_STATUS.REPLAYED, previewId, previewHash: record.previewHash });
  if (record.expiresAtMs <= startedAtMs) {
    homeAssistantExecutionGuards.delete(record.guardId);
    return block("execution-guard-expired", { status: HOME_ASSISTANT_EXECUTION_STATUS.EXPIRED, previewId, previewHash: record.previewHash });
  }
  if (requestPayloadWasModified(input, record)) {
    return block("modified-preview-payload-rejected", { previewId, previewHash: record.previewHash });
  }
  const confirmationPhrase = text(input.confirmationPhrase || input.confirmation || input.approvalPhrase || input.approval_phrase || "", 500);
  if (!confirmationPhrase) return block("missing-confirmation-phrase", { previewId, previewHash: record.previewHash });
  if (confirmationPhrase !== record.confirmationPhrase) return block("confirmation-phrase-mismatch", { previewId, previewHash: record.previewHash });
  if (!V1_EXECUTABLE_SERVICES.has(record.service)) return block("service-not-v1-executable", { previewId, previewHash: record.previewHash });
  if (config.allowlistHash !== record.allowlistHash) return block("allowlist-changed-after-preview", { previewId, previewHash: record.previewHash });

  const targetResolution = resolveAllowlistedTarget(guardedTargetInput(record), config);
  if (!targetResolution.ok) return block(targetResolution.reason, { previewId, previewHash: record.previewHash });
  const target = targetResolution.target;
  if (target.entityId !== record.entityId) return block("entity-changed-after-preview", { previewId, previewHash: record.previewHash });
  if (!target.allowedServices.includes(record.service)) return block("service-not-allowlisted", { previewId, previewHash: record.previewHash });
  const payloadValidation = validatePayloadForCommand(record.command, target, record.payload);
  if (!payloadValidation.ok) return block(payloadValidation.reason, { previewId, previewHash: record.previewHash });

  const safety = buildSafetySummaries({
    request: record.requestSummary || `${record.service} ${target.label}`,
  }, record.requestSummary || `${record.service} ${target.label}`);
  if (safety.privacySummary.blockedCount > 0) return block("privacy-firewall-blocked", { previewId, previewHash: record.previewHash, privacySummary: safety.privacySummary });
  if (shouldBlockApexOsUntrustedRoute(safety.untrustedContentFirewallSummary)) {
    return block("prompt-injection-firewall-blocked", { previewId, previewHash: record.previewHash, promptInjectionSummary: safety.untrustedContentFirewallSummary });
  }
  if (safety.actionPermissionSummary.forbidden) return block("action-permission-forbidden", { previewId, previewHash: record.previewHash, actionPermissionSummary: safety.actionPermissionSummary });

  const completedDryRunAt = new Date(safeNowMs(options.now || input.now)).toISOString();
  const commonReceipt = {
    previewId: record.previewId,
    previewHash: record.previewHash,
    entityId: record.entityId,
    service: record.service,
    target,
    payloadHash: record.payloadHash,
    startedAt,
    timeoutMs: config.requestTimeoutMs,
    maxRetries: config.maxRetries,
    undoAvailable: true,
    undoHint: undoHintForHomeAssistantCommand(record.command, record.service, target.label),
    privacySummary: safety.privacySummary,
    promptInjectionSummary: safety.untrustedContentFirewallSummary,
    actionPermissionSummary: safety.actionPermissionSummary,
    toolRouteSummary: safety.toolRouteSummary,
  };

  if (input.dryRun === true) {
    return buildExecutionReceipt({
      ...commonReceipt,
      status: HOME_ASSISTANT_EXECUTION_STATUS.DRY_RUN,
      reason: "home-assistant-execution-dry-run",
      summary: `Dry run: Apex would call ${record.service} for ${target.label}. No Home Assistant service call was made.`,
      completedAt: completedDryRunAt,
      dryRun: true,
    });
  }

  record = replaceExecutionGuardRecord(record, { consumed: true });
  const serviceResult = await callHomeAssistantServiceOnce(record, config, options);
  const completedAtMs = Date.now();
  const completedAt = new Date(completedAtMs).toISOString();
  const succeeded = serviceResult.ok;

  return buildExecutionReceipt({
    ...commonReceipt,
    status: serviceResult.status,
    reason: serviceResult.reason,
    summary: succeeded
      ? `Apex executed ${record.service} for ${target.label} one time.`
      : `Apex attempted ${record.service} for ${target.label}, but Home Assistant did not confirm success.`,
    completedAt,
    durationMs: completedAtMs - startedAtMs,
    httpStatus: serviceResult.httpStatus,
    resultCode: serviceResult.reason,
    serviceCallAttempted: true,
    serviceCallExecuted: succeeded,
    realDeviceTouched: succeeded,
    externalActionExecuted: succeeded,
  });
}

function sanitizeHomeAssistantAttributes(attributes = {}) {
  const volume = Number(attributes.volume_level);
  return Object.freeze({
    friendlyName: safeText(attributes.friendly_name || "", SHORT_LIMIT),
    source: safeText(attributes.source || "", SHORT_LIMIT),
    volumeLevel: Number.isFinite(volume) ? Math.max(0, Math.min(1, Number(volume.toFixed(2)))) : null,
    isVolumeMuted: typeof attributes.is_volume_muted === "boolean" ? attributes.is_volume_muted : null,
  });
}

function sanitizeHomeAssistantStatePayload(payload = {}, target = {}) {
  return Object.freeze({
    entityId: target.entityId,
    label: target.label,
    domain: target.domain,
    state: safeText(payload.state || "unknown", SHORT_LIMIT),
    attributes: sanitizeHomeAssistantAttributes(payload.attributes || {}),
    lastChanged: safeText(payload.last_changed || "", SHORT_LIMIT),
    lastUpdated: safeText(payload.last_updated || "", SHORT_LIMIT),
  });
}

function disabledStatusRead(reason = "", config = null, extra = {}) {
  return Object.freeze({
    connector: "home-assistant",
    status: extra.status || HOME_ASSISTANT_STATUS_READ_STATUS.BLOCKED,
    reason: safeText(reason || "home-assistant-status-read-blocked", SHORT_LIMIT),
    configStatus: config ? getHomeAssistantConnectorStatus({ connectorConfig: config }) : null,
    entityStatus: null,
    tokenExposed: false,
    baseUrlExposed: false,
    ...lockedExecution(),
    ...extra,
  });
}

async function fetchWithTimeout(fetchImpl, url, options = {}, timeoutMs = 3000) {
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timeout = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    return await fetchImpl(url, {
      ...options,
      signal: controller?.signal,
    });
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export async function readHomeAssistantEntityStatus(input = {}, options = {}) {
  const config = options.connectorConfig?.connector ? options.connectorConfig : readHomeAssistantConnectorConfig({
    ...(options || {}),
    env: options.env || input.env,
  });

  if (config.killSwitch) return disabledStatusRead("home-assistant-kill-switch-on", config, { status: HOME_ASSISTANT_STATUS_READ_STATUS.BLOCKED });
  if (!config.enabled) return disabledStatusRead("home-assistant-connector-disabled", config, { status: HOME_ASSISTANT_STATUS_READ_STATUS.DISABLED });

  const targetResolution = resolveAllowlistedTarget(input, config);
  if (!targetResolution.ok) return disabledStatusRead(targetResolution.reason, config, { status: HOME_ASSISTANT_STATUS_READ_STATUS.BLOCKED });

  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    return disabledStatusRead("fetch-unavailable", config, { status: HOME_ASSISTANT_STATUS_READ_STATUS.ERROR });
  }

  const privateConfig = config[PRIVATE_CONFIG] || {};
  const url = `${privateConfig.baseUrl}/api/states/${encodeURIComponent(targetResolution.target.entityId)}`;

  try {
    const response = await fetchWithTimeout(fetchImpl, url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${privateConfig.token}`,
        Accept: "application/json",
      },
    }, config.requestTimeoutMs);

    if (!response?.ok) {
      return disabledStatusRead("home-assistant-status-read-failed", config, {
        status: HOME_ASSISTANT_STATUS_READ_STATUS.ERROR,
        httpStatus: Number(response?.status || 0) || 0,
      });
    }

    const payload = await response.json();
    return Object.freeze({
      connector: "home-assistant",
      status: HOME_ASSISTANT_STATUS_READ_STATUS.OK,
      reason: "home-assistant-status-read-ok",
      configStatus: getHomeAssistantConnectorStatus({ connectorConfig: config }),
      target: Object.freeze({
        type: targetResolution.target.type,
        apexId: targetResolution.target.apexId,
        label: targetResolution.target.label,
        roomId: targetResolution.target.roomId,
        domain: targetResolution.target.domain,
        entityId: targetResolution.target.entityId,
      }),
      entityStatus: sanitizeHomeAssistantStatePayload(payload, targetResolution.target),
      tokenExposed: false,
      baseUrlExposed: false,
      ...lockedExecution(),
      readOnly: true,
    });
  } catch {
    return disabledStatusRead("home-assistant-status-read-error", config, {
      status: HOME_ASSISTANT_STATUS_READ_STATUS.ERROR,
    });
  }
}

export function sanitizeHomeAssistantReceipt(receipt = {}) {
  return Object.freeze({
    connector: "home-assistant",
    status: safeText(receipt.status || "", SHORT_LIMIT),
    reason: safeText(receipt.reason || "", SHORT_LIMIT),
    receiptId: safeText(receipt.receiptId || "", SHORT_LIMIT),
    executionAttemptId: safeText(receipt.executionAttemptId || "", SHORT_LIMIT),
    readinessLevel: Number(receipt.readinessLevel || 0) || 0,
    previewId: safeText(receipt.previewId || "", SHORT_LIMIT),
    previewHash: safeText(receipt.previewHash || "", 100),
    entityId: normalizeEntityId(receipt.entityId || ""),
    service: safeText(receipt.service || "", SHORT_LIMIT),
    target: receipt.target ? Object.freeze({
      type: safeText(receipt.target.type || "", SHORT_LIMIT),
      apexId: safeText(receipt.target.apexId || "", SHORT_LIMIT),
      label: safeText(receipt.target.label || "", SHORT_LIMIT),
      domain: safeText(receipt.target.domain || "", SHORT_LIMIT),
      entityId: normalizeEntityId(receipt.target.entityId || ""),
    }) : null,
    payloadHash: safeText(receipt.payloadHash || "", 100),
    summary: safeText(receipt.summary || "Home Assistant receipt sanitized.", 420),
    startedAt: safeText(receipt.startedAt || "", SHORT_LIMIT),
    completedAt: safeText(receipt.completedAt || "", SHORT_LIMIT),
    durationMs: Math.max(0, Number(receipt.durationMs || 0) || 0),
    timeoutMs: Math.max(0, Number(receipt.timeoutMs || 0) || 0),
    maxRetries: Math.max(0, Number(receipt.maxRetries || 0) || 0),
    httpStatus: Number(receipt.httpStatus || 0) || 0,
    resultCode: safeText(receipt.resultCode || "", SHORT_LIMIT),
    dryRun: Boolean(receipt.dryRun),
    serviceCallAttempted: Boolean(receipt.serviceCallAttempted),
    serviceCallExecuted: Boolean(receipt.serviceCallExecuted),
    realDeviceTouched: Boolean(receipt.realDeviceTouched),
    externalActionExecuted: Boolean(receipt.externalActionExecuted),
    undoAvailable: Boolean(receipt.undoAvailable),
    undoHint: safeText(receipt.undoHint || "", 320),
    tokenExposed: false,
    baseUrlExposed: false,
    headersExposed: false,
    rawProviderPayloadExposed: false,
    rawPrivatePromptExposed: false,
    unsafeContentExposed: false,
    canExecuteNow: false,
    canExecuteAfterApproval: false,
    executionLocked: true,
    noExecutionTokens: true,
  });
}
