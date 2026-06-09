import {
  buildApexOsActionPermissionSummary,
  classifyApexOsAction,
} from "./apexOsActionPermissions.js";
import {
  APEX_OS_EXTERNAL_PREPARATION_CATEGORY,
  buildApexOsExternalPreparationPacket,
  buildApexOsExternalPreparationPacketSummary,
} from "./apexOsExternalPreparationPackets.js";
import {
  APEX_OS_PRIVACY_ACTION,
  APEX_OS_PRIVACY_CONTEXT,
  buildApexOsPrivacySummary,
  classifyApexOsPrivacy,
  redactApexOsSensitiveText,
} from "./apexOsPrivacyFirewall.js";
import {
  buildApexOsToolRouteSummary,
  planApexOsToolRoute,
} from "./apexOsToolRouter.js";
import {
  APEX_OS_TRACE_EVENT_TYPE,
  APEX_OS_TRACE_SOURCE,
  APEX_OS_TRACE_STATUS,
  createApexOsTraceEntry,
} from "./apexOsTraceLog.js";
import {
  APEX_OS_CONTENT_TRUST_LEVEL,
  APEX_OS_PROMPT_INJECTION_RISK,
  APEX_OS_UNTRUSTED_SOURCE,
  buildApexOsUntrustedContentSummary,
  classifyApexOsUntrustedContent,
  shouldBlockApexOsUntrustedRoute,
} from "./apexOsUntrustedContentFirewall.js";

export const APEX_OS_DEVICE_LAYER_VERSION = "jarvis-device-layer-v0";

export const APEX_OS_DEVICE_TYPE = Object.freeze({
  TV: "tv",
  SCREEN: "screen",
  SPEAKER: "speaker",
  LIGHTS: "lights",
  COMPUTER: "computer",
  DASHBOARD_DISPLAY: "dashboard-display",
  CAMERA: "camera",
  MICROPHONE: "microphone",
});

export const APEX_OS_DEVICE_CAPABILITY = Object.freeze({
  POWER: "power",
  VOLUME: "volume",
  INPUT_SOURCE: "input-source",
  CAST_OPEN_DASHBOARD: "cast-open-dashboard",
  PLAY_MEDIA: "play-media",
  SCENE_MODE: "scene-mode",
  LIGHTING: "lighting",
  WAKE: "wake",
  RECORDING: "recording",
});

export const APEX_OS_DEVICE_CONTROL_METHOD = Object.freeze({
  HOME_ASSISTANT: "home-assistant",
  ROKU_ECP: "roku-ecp",
  CHROMECAST: "chromecast",
  APPLE_TV: "apple-tv",
  HDMI_CEC: "hdmi-cec",
  WAKE_ON_LAN: "wake-on-lan",
  IR_BLASTER: "ir-blaster",
  MOCK: "mock",
});

export const APEX_OS_DEVICE_STATUS = Object.freeze({
  AVAILABLE: "available",
  UNAVAILABLE: "unavailable",
  UNKNOWN: "unknown",
  MOCK_ONLY: "mock-only",
  DISABLED: "disabled",
});

export const APEX_OS_DEVICE_COMMAND_TYPE = Object.freeze({
  POWER_ON: "power-on",
  POWER_OFF: "power-off",
  SET_VOLUME: "set-volume",
  SET_INPUT_SOURCE: "set-input-source",
  SHOW_DASHBOARD: "show-dashboard",
  PLAY_MEDIA: "play-media",
  ACTIVATE_SCENE: "activate-scene",
  WAKE_DEVICE: "wake-device",
  BLOCKED_SURVEILLANCE: "blocked-surveillance",
  UNKNOWN: "unknown",
});

export const APEX_OS_DEVICE_PLAN_STATUS = Object.freeze({
  PLANNED_MOCK: "planned-mock",
  BLOCKED: "blocked",
  NEEDS_INFO: "needs-info",
  NOT_SUPPORTED: "not-supported",
});

export const APEX_OS_DEVICE_RISK_LEVEL = Object.freeze({
  LOW_LOCAL_REVERSIBLE: "low-local-reversible",
  MEDIUM_LOCAL_VISIBLE: "medium-local-visible",
  HIGH_EXTERNAL_ACCOUNT: "high-external-account",
  FORBIDDEN_SURVEILLANCE: "forbidden-surveillance",
});

const TEXT_LIMIT = 1200;
const SHORT_LIMIT = 180;

const SURVEILLANCE_PATTERNS = Object.freeze([
  /\b(camera|webcam|cam|microphone|mic|record|recording|surveillance|monitor me|watch me|spy|listen in)\b/i,
  /\b(hidden|secret|silent|without telling|without asking)\b.{0,80}\b(camera|microphone|mic|record|watch|listen|surveillance)\b/i,
]);

const COMMAND_PATTERNS = Object.freeze({
  [APEX_OS_DEVICE_COMMAND_TYPE.POWER_ON]: [
    /\b(turn|power|switch)\b.{0,35}\b(on|up)\b/i,
    /\bwake\b/i,
  ],
  [APEX_OS_DEVICE_COMMAND_TYPE.POWER_OFF]: [
    /\b(turn|power|switch)\b.{0,35}\b(off|down)\b/i,
    /\bshut\b.{0,20}\boff\b/i,
  ],
  [APEX_OS_DEVICE_COMMAND_TYPE.SHOW_DASHBOARD]: [
    /\b(show|put|open|cast|display|send)\b.{0,80}\b(apex|dashboard|control room|second screen)\b/i,
    /\b(second screen|dashboard mode)\b/i,
  ],
  [APEX_OS_DEVICE_COMMAND_TYPE.PLAY_MEDIA]: [
    /\b(play|start|put on)\b.{0,80}\b(music|playlist|focus music|audio|sound)\b/i,
    /\bfocus music\b/i,
  ],
  [APEX_OS_DEVICE_COMMAND_TYPE.ACTIVATE_SCENE]: [
    /\b(start|activate|turn on|enable|set)\b.{0,60}\b(work mode|focus mode|night mode|dashboard mode|scene)\b/i,
  ],
  [APEX_OS_DEVICE_COMMAND_TYPE.SET_INPUT_SOURCE]: [
    /\b(input|source|hdmi|switch to)\b/i,
  ],
  [APEX_OS_DEVICE_COMMAND_TYPE.SET_VOLUME]: [
    /\b(volume|mute|unmute|louder|quieter)\b/i,
  ],
});

function text(value = "", limit = TEXT_LIMIT) {
  return String(value ?? "").replace(/\s+\n/g, "\n").replace(/\s+/g, " ").trim().slice(0, limit);
}

function lower(value = "") {
  return text(value).toLowerCase();
}

function slug(value = "", fallback = "device") {
  const normalized = lower(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
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

function createdAtIso(value = "", now = new Date()) {
  const parsed = Date.parse(value || "");
  if (Number.isFinite(parsed)) return new Date(parsed).toISOString();
  return new Date(now).toISOString();
}

function safeText(value = "", limit = TEXT_LIMIT) {
  return text(redactApexOsSensitiveText(value).sanitizedText, limit);
}

function safeList(value = [], limit = 12, itemLimit = SHORT_LIMIT) {
  const entries = Array.isArray(value) ? value : [value];
  return entries.map((entry) => safeText(entry, itemLimit)).filter(Boolean).slice(0, limit);
}

function matchesAny(value = "", patterns = []) {
  return patterns.some((pattern) => pattern.test(value));
}

function unique(values = []) {
  return [...new Set((Array.isArray(values) ? values : [values]).filter(Boolean))];
}

function normalizeId(value = "", fallback = "item") {
  return slug(value, fallback);
}

function normalizeAliasList(values = []) {
  return unique(safeList(values, 24, 120).map((entry) => lower(entry)));
}

function normalizeCapabilities(values = []) {
  return unique((Array.isArray(values) ? values : [values])
    .map((entry) => slug(entry, "capability"))
    .filter(Boolean));
}

function normalizeControlMethods(values = []) {
  const fallback = [APEX_OS_DEVICE_CONTROL_METHOD.MOCK];
  return unique((Array.isArray(values) && values.length ? values : fallback)
    .map((entry) => slug(entry, APEX_OS_DEVICE_CONTROL_METHOD.MOCK)));
}

function roomLabel(room = {}) {
  return room.name || room.id || "";
}

function deviceLabel(device = {}) {
  return device.name || device.id || "";
}

function sceneLabel(scene = {}) {
  return scene.name || scene.id || "";
}

function includesPhrase(haystack = "", needle = "") {
  const normalizedHaystack = ` ${lower(haystack).replace(/[^a-z0-9]+/g, " ")} `;
  const normalizedNeedle = ` ${lower(needle).replace(/[^a-z0-9]+/g, " ")} `;
  return normalizedNeedle.trim() ? normalizedHaystack.includes(normalizedNeedle) : false;
}

function scoreAliasMatch(value = "", aliases = []) {
  const normalized = lower(value);
  if (!normalized) return 0;
  let score = 0;
  for (const alias of aliases) {
    if (!alias) continue;
    if (normalized === alias) score = Math.max(score, 100 + alias.length);
    if (includesPhrase(normalized, alias)) score = Math.max(score, 40 + alias.length);
  }
  return score;
}

function deviceMatchesCommand(device = {}, commandType = "") {
  const capabilities = new Set(device.capabilities || []);
  if (commandType === APEX_OS_DEVICE_COMMAND_TYPE.POWER_ON || commandType === APEX_OS_DEVICE_COMMAND_TYPE.POWER_OFF) return capabilities.has(APEX_OS_DEVICE_CAPABILITY.POWER);
  if (commandType === APEX_OS_DEVICE_COMMAND_TYPE.SHOW_DASHBOARD) return capabilities.has(APEX_OS_DEVICE_CAPABILITY.CAST_OPEN_DASHBOARD);
  if (commandType === APEX_OS_DEVICE_COMMAND_TYPE.PLAY_MEDIA) return capabilities.has(APEX_OS_DEVICE_CAPABILITY.PLAY_MEDIA);
  if (commandType === APEX_OS_DEVICE_COMMAND_TYPE.ACTIVATE_SCENE) return capabilities.has(APEX_OS_DEVICE_CAPABILITY.SCENE_MODE);
  if (commandType === APEX_OS_DEVICE_COMMAND_TYPE.SET_VOLUME) return capabilities.has(APEX_OS_DEVICE_CAPABILITY.VOLUME);
  if (commandType === APEX_OS_DEVICE_COMMAND_TYPE.SET_INPUT_SOURCE) return capabilities.has(APEX_OS_DEVICE_CAPABILITY.INPUT_SOURCE);
  if (commandType === APEX_OS_DEVICE_COMMAND_TYPE.WAKE_DEVICE) return capabilities.has(APEX_OS_DEVICE_CAPABILITY.WAKE);
  return true;
}

function detectCommandType(description = "") {
  const normalized = lower(description);
  if (matchesAny(normalized, SURVEILLANCE_PATTERNS)) return APEX_OS_DEVICE_COMMAND_TYPE.BLOCKED_SURVEILLANCE;
  for (const [commandType, patterns] of Object.entries(COMMAND_PATTERNS)) {
    if (matchesAny(normalized, patterns)) return commandType;
  }
  return APEX_OS_DEVICE_COMMAND_TYPE.UNKNOWN;
}

function riskForDeviceCommand(commandType = "", device = {}, scene = null) {
  if (commandType === APEX_OS_DEVICE_COMMAND_TYPE.BLOCKED_SURVEILLANCE) return APEX_OS_DEVICE_RISK_LEVEL.FORBIDDEN_SURVEILLANCE;
  if ([APEX_OS_DEVICE_TYPE.CAMERA, APEX_OS_DEVICE_TYPE.MICROPHONE].includes(device.type)) return APEX_OS_DEVICE_RISK_LEVEL.FORBIDDEN_SURVEILLANCE;
  if (scene?.riskLevel) return scene.riskLevel;
  if (commandType === APEX_OS_DEVICE_COMMAND_TYPE.PLAY_MEDIA) return APEX_OS_DEVICE_RISK_LEVEL.MEDIUM_LOCAL_VISIBLE;
  if (commandType === APEX_OS_DEVICE_COMMAND_TYPE.SHOW_DASHBOARD) return APEX_OS_DEVICE_RISK_LEVEL.MEDIUM_LOCAL_VISIBLE;
  return APEX_OS_DEVICE_RISK_LEVEL.LOW_LOCAL_REVERSIBLE;
}

function statusFromSafety({ commandType = "", riskLevel = "", privacySummary = {}, untrustedSummary = {}, actionPermissionSummary = {}, device = null, scene = null } = {}) {
  if (riskLevel === APEX_OS_DEVICE_RISK_LEVEL.FORBIDDEN_SURVEILLANCE) return APEX_OS_DEVICE_PLAN_STATUS.BLOCKED;
  if (commandType === APEX_OS_DEVICE_COMMAND_TYPE.BLOCKED_SURVEILLANCE) return APEX_OS_DEVICE_PLAN_STATUS.BLOCKED;
  if (actionPermissionSummary.forbidden) return APEX_OS_DEVICE_PLAN_STATUS.BLOCKED;
  if (privacySummary.blockedCount > 0) return APEX_OS_DEVICE_PLAN_STATUS.BLOCKED;
  if (shouldBlockApexOsUntrustedRoute(untrustedSummary)) return APEX_OS_DEVICE_PLAN_STATUS.BLOCKED;
  if (privacySummary.approvalRequiredCount > 0 || untrustedSummary.requiresOperatorReview) return APEX_OS_DEVICE_PLAN_STATUS.NEEDS_INFO;
  if (!device && !scene) return APEX_OS_DEVICE_PLAN_STATUS.NEEDS_INFO;
  if (device && !device.capabilities?.length) return APEX_OS_DEVICE_PLAN_STATUS.NOT_SUPPORTED;
  return APEX_OS_DEVICE_PLAN_STATUS.PLANNED_MOCK;
}

function traceStatusForPlan(status = "") {
  if (status === APEX_OS_DEVICE_PLAN_STATUS.BLOCKED) return APEX_OS_TRACE_STATUS.BLOCKED;
  if (status === APEX_OS_DEVICE_PLAN_STATUS.NEEDS_INFO || status === APEX_OS_DEVICE_PLAN_STATUS.NOT_SUPPORTED) return APEX_OS_TRACE_STATUS.SKIPPED;
  return APEX_OS_TRACE_STATUS.COMPLETED;
}

function level3CategoryForPlan(commandType = "", device = {}, description = "") {
  const normalized = lower(description);
  if (matchesAny(normalized, [/\bbrowser|website|web page|chrome|edge|tab\b/i])) {
    return APEX_OS_EXTERNAL_PREPARATION_CATEGORY.BROWSER_ACTION_PLAN;
  }
  if (matchesAny(normalized, [/\bdesktop|computer|local app|window|keyboard|mouse\b/i]) || device.type === APEX_OS_DEVICE_TYPE.COMPUTER) {
    return APEX_OS_EXTERNAL_PREPARATION_CATEGORY.DESKTOP_ACTION_PLAN;
  }
  if ([APEX_OS_DEVICE_COMMAND_TYPE.SHOW_DASHBOARD, APEX_OS_DEVICE_COMMAND_TYPE.PLAY_MEDIA, APEX_OS_DEVICE_COMMAND_TYPE.ACTIVATE_SCENE].includes(commandType)) {
    return APEX_OS_EXTERNAL_PREPARATION_CATEGORY.MUSIC_SECOND_SCREEN_PLAN;
  }
  return "";
}

function buildPrivacyResult(description = "", input = {}) {
  if (input.privacyFirewallSummary?.actions) {
    return {
      summary: input.privacyFirewallSummary,
      sanitizedDescription: safeText(description, TEXT_LIMIT),
    };
  }
  const result = classifyApexOsPrivacy(description, {
    sourceContext: input.sourceContext || APEX_OS_PRIVACY_CONTEXT.OPERATOR_PRIVATE,
    targetContext: input.targetContext || APEX_OS_PRIVACY_CONTEXT.EXTERNAL_CONNECTOR,
    approved: Boolean(input.privacyApproved),
  });
  return {
    result,
    summary: buildApexOsPrivacySummary([result]),
    sanitizedDescription: result.sanitizedText,
  };
}

function buildUntrustedResult(description = "", input = {}) {
  if (input.untrustedContentFirewallSummary?.highestRiskLevel) {
    return {
      summary: input.untrustedContentFirewallSummary,
      sanitizedDescription: safeText(description, TEXT_LIMIT),
    };
  }
  const sourceText = input.untrustedContent || description;
  const trustLevel = input.sourceTrustLevel || input.trustLevel || (input.untrustedContent
    ? APEX_OS_CONTENT_TRUST_LEVEL.UNTRUSTED_USER_PASTE
    : APEX_OS_CONTENT_TRUST_LEVEL.TRUSTED_OPERATOR);
  const sourceType = input.sourceType || (input.untrustedContent ? APEX_OS_UNTRUSTED_SOURCE.CLIPBOARD_PASTE : APEX_OS_UNTRUSTED_SOURCE.UNKNOWN);
  const result = classifyApexOsUntrustedContent(sourceText, {
    trustLevel,
    sourceType,
    sourceLabel: input.sourceLabel || "Jarvis Device Layer",
    sourceId: input.sourceId || "",
  });
  return {
    result,
    summary: buildApexOsUntrustedContentSummary([result]),
    sanitizedDescription: result.sanitizedText,
  };
}

function actionPermissionForDevice(description = "", input = {}) {
  if (input.actionPermissionSummary?.riskTier) return input.actionPermissionSummary;
  return buildApexOsActionPermissionSummary(classifyApexOsAction({
    description,
    domain: input.actionDomain || "",
  }));
}

function normalizeRoom(room = {}) {
  const id = normalizeId(room.id || room.name, "room");
  const name = safeText(room.name || id, SHORT_LIMIT);
  const aliases = normalizeAliasList([id, name, ...(room.aliases || [])]);
  return Object.freeze({
    id,
    name,
    aliases,
    notes: safeText(room.notes || "", SHORT_LIMIT),
  });
}

function normalizeDevice(device = {}) {
  const id = normalizeId(device.id || device.name, "device");
  const name = safeText(device.name || id, SHORT_LIMIT);
  const roomId = normalizeId(device.roomId || device.room || "", "");
  const type = slug(device.type || APEX_OS_DEVICE_TYPE.SCREEN, APEX_OS_DEVICE_TYPE.SCREEN);
  const aliases = normalizeAliasList([id, name, ...(device.aliases || [])]);
  const capabilities = normalizeCapabilities(device.capabilities || []);
  const controlMethods = normalizeControlMethods(device.controlMethods || []);
  const realControlEnabled = Boolean(device.realControlEnabled) && false;
  return Object.freeze({
    id,
    name,
    type,
    roomId,
    aliases,
    capabilities,
    controlMethods: unique([APEX_OS_DEVICE_CONTROL_METHOD.MOCK, ...controlMethods]),
    status: slug(device.status || APEX_OS_DEVICE_STATUS.MOCK_ONLY, APEX_OS_DEVICE_STATUS.MOCK_ONLY),
    availability: safeText(device.availability || "mock-only", SHORT_LIMIT),
    riskLevel: device.riskLevel || APEX_OS_DEVICE_RISK_LEVEL.LOW_LOCAL_REVERSIBLE,
    realControlEnabled,
    mockOnly: true,
    notes: safeText(device.notes || "", SHORT_LIMIT),
  });
}

function normalizeScene(scene = {}) {
  const id = normalizeId(scene.id || scene.name, "scene");
  const name = safeText(scene.name || id, SHORT_LIMIT);
  const roomId = normalizeId(scene.roomId || scene.room || "", "");
  const aliases = normalizeAliasList([id, name, ...(scene.aliases || [])]);
  return Object.freeze({
    id,
    name,
    roomId,
    aliases,
    commandType: scene.commandType || APEX_OS_DEVICE_COMMAND_TYPE.ACTIVATE_SCENE,
    riskLevel: scene.riskLevel || APEX_OS_DEVICE_RISK_LEVEL.MEDIUM_LOCAL_VISIBLE,
    deviceIds: unique(safeList(scene.deviceIds || [], 12, 120).map((entry) => normalizeId(entry, ""))),
    steps: safeList(scene.steps || [], 12, 220),
    futureActByDefaultCandidate: Boolean(scene.futureActByDefaultCandidate),
  });
}

export function buildDefaultApexOsDeviceRegistry() {
  return normalizeApexOsDeviceRegistry({
    rooms: [
      { id: "bedroom", name: "Bedroom", aliases: ["my room", "john's room", "room", "bedroom"] },
      { id: "living-room", name: "Living Room", aliases: ["living room", "front room", "main room"] },
      { id: "office", name: "Office", aliases: ["office", "work room", "apex office"] },
    ],
    devices: [
      {
        id: "bedroom-tv",
        name: "Bedroom TV",
        roomId: "bedroom",
        type: APEX_OS_DEVICE_TYPE.TV,
        aliases: ["bedroom tv", "tv in my room", "my room tv", "tv in the bedroom", "john's room tv"],
        capabilities: [
          APEX_OS_DEVICE_CAPABILITY.POWER,
          APEX_OS_DEVICE_CAPABILITY.VOLUME,
          APEX_OS_DEVICE_CAPABILITY.INPUT_SOURCE,
          APEX_OS_DEVICE_CAPABILITY.CAST_OPEN_DASHBOARD,
          APEX_OS_DEVICE_CAPABILITY.PLAY_MEDIA,
          APEX_OS_DEVICE_CAPABILITY.SCENE_MODE,
        ],
        controlMethods: [
          APEX_OS_DEVICE_CONTROL_METHOD.MOCK,
          APEX_OS_DEVICE_CONTROL_METHOD.HOME_ASSISTANT,
          APEX_OS_DEVICE_CONTROL_METHOD.ROKU_ECP,
          APEX_OS_DEVICE_CONTROL_METHOD.CHROMECAST,
          APEX_OS_DEVICE_CONTROL_METHOD.APPLE_TV,
          APEX_OS_DEVICE_CONTROL_METHOD.HDMI_CEC,
          APEX_OS_DEVICE_CONTROL_METHOD.IR_BLASTER,
        ],
        riskLevel: APEX_OS_DEVICE_RISK_LEVEL.LOW_LOCAL_REVERSIBLE,
      },
      {
        id: "living-room-tv",
        name: "Living Room TV",
        roomId: "living-room",
        type: APEX_OS_DEVICE_TYPE.TV,
        aliases: ["living room tv", "front room tv", "main tv"],
        capabilities: [
          APEX_OS_DEVICE_CAPABILITY.POWER,
          APEX_OS_DEVICE_CAPABILITY.VOLUME,
          APEX_OS_DEVICE_CAPABILITY.INPUT_SOURCE,
          APEX_OS_DEVICE_CAPABILITY.CAST_OPEN_DASHBOARD,
          APEX_OS_DEVICE_CAPABILITY.PLAY_MEDIA,
          APEX_OS_DEVICE_CAPABILITY.SCENE_MODE,
        ],
        controlMethods: [APEX_OS_DEVICE_CONTROL_METHOD.MOCK, APEX_OS_DEVICE_CONTROL_METHOD.HOME_ASSISTANT, APEX_OS_DEVICE_CONTROL_METHOD.CHROMECAST],
      },
      {
        id: "living-room-office-screen",
        name: "Living Room Office Screen",
        roomId: "living-room",
        type: APEX_OS_DEVICE_TYPE.SCREEN,
        aliases: ["living room office screen", "living room screen", "office screen in living room", "work screen in living room"],
        capabilities: [
          APEX_OS_DEVICE_CAPABILITY.POWER,
          APEX_OS_DEVICE_CAPABILITY.INPUT_SOURCE,
          APEX_OS_DEVICE_CAPABILITY.CAST_OPEN_DASHBOARD,
          APEX_OS_DEVICE_CAPABILITY.SCENE_MODE,
        ],
        controlMethods: [APEX_OS_DEVICE_CONTROL_METHOD.MOCK, APEX_OS_DEVICE_CONTROL_METHOD.HOME_ASSISTANT, APEX_OS_DEVICE_CONTROL_METHOD.HDMI_CEC],
      },
      {
        id: "office-second-screen",
        name: "Office Second Screen",
        roomId: "office",
        type: APEX_OS_DEVICE_TYPE.DASHBOARD_DISPLAY,
        aliases: ["second screen", "office second screen", "second monitor", "dashboard display", "office dashboard"],
        capabilities: [
          APEX_OS_DEVICE_CAPABILITY.POWER,
          APEX_OS_DEVICE_CAPABILITY.INPUT_SOURCE,
          APEX_OS_DEVICE_CAPABILITY.CAST_OPEN_DASHBOARD,
          APEX_OS_DEVICE_CAPABILITY.SCENE_MODE,
        ],
        controlMethods: [APEX_OS_DEVICE_CONTROL_METHOD.MOCK, APEX_OS_DEVICE_CONTROL_METHOD.HOME_ASSISTANT, APEX_OS_DEVICE_CONTROL_METHOD.HDMI_CEC],
      },
      {
        id: "office-speaker",
        name: "Office Speaker",
        roomId: "office",
        type: APEX_OS_DEVICE_TYPE.SPEAKER,
        aliases: ["office speaker", "work speaker", "focus speaker"],
        capabilities: [
          APEX_OS_DEVICE_CAPABILITY.POWER,
          APEX_OS_DEVICE_CAPABILITY.VOLUME,
          APEX_OS_DEVICE_CAPABILITY.PLAY_MEDIA,
          APEX_OS_DEVICE_CAPABILITY.SCENE_MODE,
        ],
        controlMethods: [APEX_OS_DEVICE_CONTROL_METHOD.MOCK, APEX_OS_DEVICE_CONTROL_METHOD.HOME_ASSISTANT, APEX_OS_DEVICE_CONTROL_METHOD.CHROMECAST, APEX_OS_DEVICE_CONTROL_METHOD.APPLE_TV],
      },
      {
        id: "living-room-speaker",
        name: "Living Room Speaker",
        roomId: "living-room",
        type: APEX_OS_DEVICE_TYPE.SPEAKER,
        aliases: ["living room speaker", "front room speaker"],
        capabilities: [
          APEX_OS_DEVICE_CAPABILITY.POWER,
          APEX_OS_DEVICE_CAPABILITY.VOLUME,
          APEX_OS_DEVICE_CAPABILITY.PLAY_MEDIA,
          APEX_OS_DEVICE_CAPABILITY.SCENE_MODE,
        ],
        controlMethods: [APEX_OS_DEVICE_CONTROL_METHOD.MOCK, APEX_OS_DEVICE_CONTROL_METHOD.HOME_ASSISTANT, APEX_OS_DEVICE_CONTROL_METHOD.CHROMECAST],
      },
      {
        id: "office-computer",
        name: "Office Computer",
        roomId: "office",
        type: APEX_OS_DEVICE_TYPE.COMPUTER,
        aliases: ["office computer", "work computer", "apex computer", "desktop"],
        capabilities: [
          APEX_OS_DEVICE_CAPABILITY.POWER,
          APEX_OS_DEVICE_CAPABILITY.WAKE,
          APEX_OS_DEVICE_CAPABILITY.CAST_OPEN_DASHBOARD,
          APEX_OS_DEVICE_CAPABILITY.SCENE_MODE,
        ],
        controlMethods: [APEX_OS_DEVICE_CONTROL_METHOD.MOCK, APEX_OS_DEVICE_CONTROL_METHOD.WAKE_ON_LAN, APEX_OS_DEVICE_CONTROL_METHOD.HOME_ASSISTANT],
      },
      {
        id: "bedroom-lights",
        name: "Bedroom Lights",
        roomId: "bedroom",
        type: APEX_OS_DEVICE_TYPE.LIGHTS,
        aliases: ["bedroom lights", "my room lights"],
        capabilities: [APEX_OS_DEVICE_CAPABILITY.POWER, APEX_OS_DEVICE_CAPABILITY.LIGHTING, APEX_OS_DEVICE_CAPABILITY.SCENE_MODE],
        controlMethods: [APEX_OS_DEVICE_CONTROL_METHOD.MOCK, APEX_OS_DEVICE_CONTROL_METHOD.HOME_ASSISTANT],
      },
      {
        id: "office-camera",
        name: "Office Camera",
        roomId: "office",
        type: APEX_OS_DEVICE_TYPE.CAMERA,
        aliases: ["office camera", "webcam", "camera"],
        capabilities: [APEX_OS_DEVICE_CAPABILITY.RECORDING],
        controlMethods: [APEX_OS_DEVICE_CONTROL_METHOD.MOCK],
        status: APEX_OS_DEVICE_STATUS.DISABLED,
        riskLevel: APEX_OS_DEVICE_RISK_LEVEL.FORBIDDEN_SURVEILLANCE,
      },
      {
        id: "office-microphone",
        name: "Office Microphone",
        roomId: "office",
        type: APEX_OS_DEVICE_TYPE.MICROPHONE,
        aliases: ["office microphone", "mic", "microphone"],
        capabilities: [APEX_OS_DEVICE_CAPABILITY.RECORDING],
        controlMethods: [APEX_OS_DEVICE_CONTROL_METHOD.MOCK],
        status: APEX_OS_DEVICE_STATUS.DISABLED,
        riskLevel: APEX_OS_DEVICE_RISK_LEVEL.FORBIDDEN_SURVEILLANCE,
      },
    ],
    scenes: [
      {
        id: "work-mode",
        name: "Work Mode",
        roomId: "living-room",
        aliases: ["work mode", "start work mode", "living room work mode"],
        deviceIds: ["living-room-office-screen", "living-room-speaker"],
        steps: [
          "Power on the living room office screen in mock mode.",
          "Prepare Apex dashboard display on the screen.",
          "Prepare optional focus audio on the living room speaker.",
        ],
        futureActByDefaultCandidate: true,
      },
      {
        id: "focus-mode",
        name: "Focus Mode",
        roomId: "office",
        aliases: ["focus mode", "office focus mode"],
        deviceIds: ["office-second-screen", "office-speaker"],
        steps: [
          "Prepare Apex dashboard on the office second screen.",
          "Prepare focus music on the office speaker.",
        ],
        futureActByDefaultCandidate: true,
      },
      {
        id: "night-mode",
        name: "Night Mode",
        roomId: "bedroom",
        aliases: ["night mode", "bedroom night mode"],
        deviceIds: ["bedroom-tv", "bedroom-lights"],
        steps: [
          "Prepare bedroom TV off state.",
          "Prepare low-light bedroom scene.",
        ],
        futureActByDefaultCandidate: true,
      },
      {
        id: "dashboard-mode",
        name: "Dashboard Mode",
        roomId: "office",
        aliases: ["dashboard mode", "show dashboard mode", "second screen dashboard mode"],
        deviceIds: ["office-second-screen"],
        steps: [
          "Prepare Apex dashboard display on the preferred second screen.",
        ],
        futureActByDefaultCandidate: true,
      },
    ],
  });
}

export function normalizeApexOsDeviceRegistry(registry = {}) {
  const rooms = (Array.isArray(registry.rooms) ? registry.rooms : []).map(normalizeRoom);
  const devices = (Array.isArray(registry.devices) ? registry.devices : []).map(normalizeDevice);
  const scenes = (Array.isArray(registry.scenes) ? registry.scenes : []).map(normalizeScene);
  return Object.freeze({
    version: APEX_OS_DEVICE_LAYER_VERSION,
    operatorOnly: true,
    canExecuteNow: false,
    realExecutionEnabled: false,
    mockOnly: true,
    rooms,
    devices,
    scenes,
  });
}

function resolveRegistry(registry = null) {
  if (registry?.rooms && registry?.devices && registry?.scenes) return normalizeApexOsDeviceRegistry(registry);
  return buildDefaultApexOsDeviceRegistry();
}

export function resolveApexOsRoomAlias(value = "", registry = null) {
  const resolvedRegistry = resolveRegistry(registry);
  const normalized = lower(value);
  let best = null;
  let bestScore = 0;
  for (const room of resolvedRegistry.rooms) {
    const score = scoreAliasMatch(normalized, room.aliases);
    if (score > bestScore) {
      best = room;
      bestScore = score;
    }
  }
  return best ? Object.freeze({ room: best, score: bestScore }) : null;
}

export function resolveApexOsSceneAlias(value = "", registry = null) {
  const resolvedRegistry = resolveRegistry(registry);
  const normalized = lower(value);
  let best = null;
  let bestScore = 0;
  for (const scene of resolvedRegistry.scenes) {
    const score = scoreAliasMatch(normalized, scene.aliases);
    if (score > bestScore) {
      best = scene;
      bestScore = score;
    }
  }
  if (!best) return null;
  const room = resolvedRegistry.rooms.find((entry) => entry.id === best.roomId) || null;
  const devices = best.deviceIds
    .map((deviceId) => resolvedRegistry.devices.find((entry) => entry.id === deviceId))
    .filter(Boolean);
  return Object.freeze({ scene: best, room, devices, score: bestScore });
}

export function resolveApexOsDeviceAlias(value = "", registry = null, options = {}) {
  const resolvedRegistry = resolveRegistry(registry);
  const normalized = lower(value);
  const commandType = options.commandType || detectCommandType(normalized);
  const roomMatch = options.roomId
    ? { room: resolvedRegistry.rooms.find((entry) => entry.id === options.roomId) || null, score: 80 }
    : resolveApexOsRoomAlias(normalized, resolvedRegistry);
  let best = null;
  let bestScore = 0;
  for (const device of resolvedRegistry.devices) {
    let score = scoreAliasMatch(normalized, device.aliases);
    if (roomMatch?.room?.id && device.roomId === roomMatch.room.id) score += 20 + roomMatch.score;
    if (deviceMatchesCommand(device, commandType)) score += 12;
    if (commandType === APEX_OS_DEVICE_COMMAND_TYPE.PLAY_MEDIA && device.type === APEX_OS_DEVICE_TYPE.SPEAKER) score += 35;
    if (commandType === APEX_OS_DEVICE_COMMAND_TYPE.SHOW_DASHBOARD && [APEX_OS_DEVICE_TYPE.TV, APEX_OS_DEVICE_TYPE.SCREEN, APEX_OS_DEVICE_TYPE.DASHBOARD_DISPLAY].includes(device.type)) score += 35;
    if (commandType === APEX_OS_DEVICE_COMMAND_TYPE.POWER_ON && [APEX_OS_DEVICE_TYPE.TV, APEX_OS_DEVICE_TYPE.SCREEN, APEX_OS_DEVICE_TYPE.COMPUTER].includes(device.type)) score += 18;
    if (score > bestScore) {
      best = device;
      bestScore = score;
    }
  }
  if (!best || bestScore <= 0) return null;
  const room = resolvedRegistry.rooms.find((entry) => entry.id === best.roomId) || null;
  return Object.freeze({ device: best, room, score: bestScore });
}

function planStepsForCommand(commandType = "", device = null, scene = null) {
  if (scene) return scene.steps;
  if (commandType === APEX_OS_DEVICE_COMMAND_TYPE.POWER_ON) return [`Prepare mock power-on for ${deviceLabel(device)}.`];
  if (commandType === APEX_OS_DEVICE_COMMAND_TYPE.POWER_OFF) return [`Prepare mock power-off for ${deviceLabel(device)}.`];
  if (commandType === APEX_OS_DEVICE_COMMAND_TYPE.SHOW_DASHBOARD) return [`Prepare Apex dashboard display plan for ${deviceLabel(device)}.`];
  if (commandType === APEX_OS_DEVICE_COMMAND_TYPE.PLAY_MEDIA) return [`Prepare focus-media plan for ${deviceLabel(device)}.`];
  if (commandType === APEX_OS_DEVICE_COMMAND_TYPE.SET_INPUT_SOURCE) return [`Prepare input/source change plan for ${deviceLabel(device)}.`];
  if (commandType === APEX_OS_DEVICE_COMMAND_TYPE.SET_VOLUME) return [`Prepare volume change plan for ${deviceLabel(device)}.`];
  return [`Prepare mock device command plan for ${deviceLabel(device) || sceneLabel(scene) || "the requested target"}.`];
}

function buildTraceMetadata({
  planId = "",
  commandType = "",
  status = "",
  riskLevel = "",
  device = null,
  scene = null,
  toolRouteSummary = {},
  actionPermissionSummary = {},
  now = new Date(),
} = {}) {
  return createApexOsTraceEntry({
    id: `trace-device-${stableHash(`${planId}:${commandType}:${status}`)}`,
    eventType: status === APEX_OS_DEVICE_PLAN_STATUS.BLOCKED
      ? APEX_OS_TRACE_EVENT_TYPE.FORBIDDEN_ACTION
      : APEX_OS_TRACE_EVENT_TYPE.TOOL_ROUTE,
    source: APEX_OS_TRACE_SOURCE.TOOL_ROUTER,
    status: traceStatusForPlan(status),
    route: toolRouteSummary.routeId || "jarvis-device-layer",
    actionDomain: actionPermissionSummary.domain || "desktop",
    riskTier: actionPermissionSummary.riskTier || riskLevel,
    approvalRequired: Boolean(actionPermissionSummary.requiresApproval || status === APEX_OS_DEVICE_PLAN_STATUS.NEEDS_INFO),
    forbidden: status === APEX_OS_DEVICE_PLAN_STATUS.BLOCKED,
    canExecuteNow: false,
    skillId: "jarvis-device-layer",
    reasonCode: status === APEX_OS_DEVICE_PLAN_STATUS.BLOCKED ? "device-layer-blocked" : "device-layer-mock-plan",
    safeMessage: status === APEX_OS_DEVICE_PLAN_STATUS.BLOCKED
      ? "Jarvis Device Layer blocked the request without touching any real device."
      : `Jarvis Device Layer prepared a mock ${commandType} plan for ${device?.type || scene?.id || "device"}.`,
    createdAt: now,
  }, { now });
}

function buildLevel3Packet({
  commandType = "",
  category = "",
  description = "",
  sanitizedDescription = "",
  device = null,
  room = null,
  scene = null,
  status = "",
  privacySummary = {},
  untrustedSummary = {},
  actionPermissionSummary = {},
  toolRouteSummary = {},
  steps = [],
  now = new Date(),
} = {}) {
  if (!category || status === APEX_OS_DEVICE_PLAN_STATUS.BLOCKED) return null;
  return buildApexOsExternalPreparationPacket({
    category,
    request: sanitizedDescription || description,
    previewTitle: `Prepare ${commandType} for ${deviceLabel(device) || sceneLabel(scene) || "device target"}`,
    target: {
      service: "Jarvis Device Layer mock adapter",
      vendor: deviceLabel(device) || sceneLabel(scene),
      accountContext: "local/mock only; no real device account or credential",
      contextInvolved: [roomLabel(room), device?.type || scene?.id].filter(Boolean).join(" / "),
    },
    dataThatWouldBeSent: [
      `target=${deviceLabel(device) || sceneLabel(scene) || "unknown"}`,
      `room=${roomLabel(room) || "unknown"}`,
      `command=${commandType}`,
      "adapter=mock only",
    ],
    steps,
    fallbackManualSteps: [
      "Use the real TV, speaker, screen, or Home Assistant app manually.",
      "Keep Apex OS in planning mode until a real connector is explicitly designed and approved.",
      "Cancel by doing nothing; no connector call or device command has been issued.",
    ],
    cancellationPath: "Cancel by ignoring the mock plan. No device command, playback, browser, desktop, or display control has been executed.",
    privacyFirewallSummary: privacySummary,
    untrustedContentFirewallSummary: untrustedSummary,
    actionPermissionSummary,
    toolRouteSummary,
    now,
  }, { now });
}

export function buildApexOsDeviceCommandReceipt(plan = {}, options = {}) {
  const now = options.now || plan.createdAt || new Date();
  const createdAt = createdAtIso("", now);
  const status = plan.status === APEX_OS_DEVICE_PLAN_STATUS.PLANNED_MOCK ? "mocked" : "blocked";
  return Object.freeze({
    receiptId: options.receiptId || `DLR-${createdAt.slice(0, 10).replace(/-/g, "")}-${stableHash(`${plan.planId}:${status}`)}`,
    planId: safeText(plan.planId || "", SHORT_LIMIT),
    status,
    adapter: APEX_OS_DEVICE_CONTROL_METHOD.MOCK,
    mockAdapterUsed: true,
    mockPerformed: plan.status === APEX_OS_DEVICE_PLAN_STATUS.PLANNED_MOCK,
    performed: false,
    realDeviceTouched: false,
    externalActionExecuted: false,
    customerVisible: false,
    canExecuteNow: false,
    executionLocked: true,
    affectedRoomId: safeText(plan.room?.id || "", SHORT_LIMIT),
    affectedDeviceId: safeText(plan.device?.id || "", SHORT_LIMIT),
    affectedSceneId: safeText(plan.scene?.id || "", SHORT_LIMIT),
    commandType: safeText(plan.commandType || "", SHORT_LIMIT),
    summary: safeText(plan.status === APEX_OS_DEVICE_PLAN_STATUS.PLANNED_MOCK
      ? `Mock receipt only: prepared ${plan.commandType} for ${deviceLabel(plan.device) || sceneLabel(plan.scene)}. No real device was touched.`
      : `Device request did not run. Status=${plan.status || "blocked"}; no real device was touched.`,
    420),
    undoAvailable: false,
    undoHint: "No undo is needed because v0 did not execute any real device command. Future real connectors must provide a visible cancel or manual reversal path.",
    createdAt,
  });
}

export function executeApexOsMockDeviceCommandPlan(plan = {}, options = {}) {
  return buildApexOsDeviceCommandReceipt(plan, options);
}

export function buildApexOsDeviceCommandPlan(input = {}, options = {}) {
  const now = options.now || input.now || new Date();
  const createdAt = createdAtIso(input.createdAt, now);
  const description = text(input.request || input.description || input.question || input.prompt || input.action || input.title || "", TEXT_LIMIT);
  const privacy = buildPrivacyResult(description, input);
  const untrusted = buildUntrustedResult(description, input);
  const sanitizedDescription = text(
    privacy.summary.blockedCount > 0
      ? privacy.sanitizedDescription
      : (untrusted.summary.blocked || untrusted.summary.requiresOperatorReview)
        ? untrusted.sanitizedDescription
        : privacy.sanitizedDescription,
    TEXT_LIMIT,
  );
  const actionPermissionSummary = actionPermissionForDevice(description || sanitizedDescription, input);
  const registry = resolveRegistry(input.registry || options.registry);
  const commandType = input.commandType || detectCommandType(description || sanitizedDescription);
  const sceneMatch = commandType === APEX_OS_DEVICE_COMMAND_TYPE.ACTIVATE_SCENE || /mode|scene/i.test(description)
    ? resolveApexOsSceneAlias(description || sanitizedDescription, registry)
    : null;
  const deviceMatch = sceneMatch
    ? null
    : resolveApexOsDeviceAlias(description || sanitizedDescription, registry, { commandType, roomId: input.roomId || "" });
  const scene = sceneMatch?.scene || null;
  const device = deviceMatch?.device || sceneMatch?.devices?.[0] || null;
  const room = sceneMatch?.room || deviceMatch?.room || registry.rooms.find((entry) => entry.id === input.roomId) || null;
  const riskLevel = riskForDeviceCommand(commandType, device || {}, scene);
  const toolRoutePlan = planApexOsToolRoute({
    description: sanitizedDescription || description || `device command ${commandType}`,
    actionPermissionSummary,
    privacyFirewallSummary: privacy.summary,
    untrustedContentFirewallSummary: untrusted.summary,
  });
  const toolRouteSummary = buildApexOsToolRouteSummary(toolRoutePlan);
  const status = statusFromSafety({
    commandType,
    riskLevel,
    privacySummary: privacy.summary,
    untrustedSummary: untrusted.summary,
    actionPermissionSummary,
    device,
    scene,
  });
  const steps = planStepsForCommand(commandType, device, scene);
  const level3Category = level3CategoryForPlan(commandType, device || {}, sanitizedDescription || description);
  const level3PreparationPacket = buildLevel3Packet({
    commandType,
    category: level3Category,
    description,
    sanitizedDescription,
    device,
    room,
    scene,
    status,
    privacySummary: privacy.summary,
    untrustedSummary: untrusted.summary,
    actionPermissionSummary,
    toolRouteSummary,
    steps,
    now,
  });
  const planId = input.planId || `DLP-${createdAt.slice(0, 10).replace(/-/g, "")}-${stableHash(`${description}:${commandType}:${device?.id || scene?.id || "unknown"}`)}`;
  const traceMetadata = buildTraceMetadata({
    planId,
    commandType,
    status,
    riskLevel,
    device,
    scene,
    toolRouteSummary,
    actionPermissionSummary,
    now,
  });
  const futureActByDefaultCandidate = status === APEX_OS_DEVICE_PLAN_STATUS.PLANNED_MOCK
    && [APEX_OS_DEVICE_RISK_LEVEL.LOW_LOCAL_REVERSIBLE, APEX_OS_DEVICE_RISK_LEVEL.MEDIUM_LOCAL_VISIBLE].includes(riskLevel)
    && !actionPermissionSummary.forbidden
    && privacy.summary.blockedCount === 0
    && !shouldBlockApexOsUntrustedRoute(untrusted.summary)
    && commandType !== APEX_OS_DEVICE_COMMAND_TYPE.BLOCKED_SURVEILLANCE;

  const plan = Object.freeze({
    planId,
    layerVersion: APEX_OS_DEVICE_LAYER_VERSION,
    readinessLevel: 3,
    operatorOnly: true,
    status,
    commandType,
    requestedAction: sanitizedDescription,
    room,
    device,
    scene,
    sceneDevices: sceneMatch?.devices || [],
    targetLabel: safeText([roomLabel(room), deviceLabel(device) || sceneLabel(scene)].filter(Boolean).join(" / "), SHORT_LIMIT),
    riskLevel,
    capabilitiesRequired: commandType === APEX_OS_DEVICE_COMMAND_TYPE.SHOW_DASHBOARD
      ? [APEX_OS_DEVICE_CAPABILITY.CAST_OPEN_DASHBOARD]
      : commandType === APEX_OS_DEVICE_COMMAND_TYPE.PLAY_MEDIA
        ? [APEX_OS_DEVICE_CAPABILITY.PLAY_MEDIA]
        : commandType === APEX_OS_DEVICE_COMMAND_TYPE.POWER_ON || commandType === APEX_OS_DEVICE_COMMAND_TYPE.POWER_OFF
          ? [APEX_OS_DEVICE_CAPABILITY.POWER]
          : [],
    controlMethod: APEX_OS_DEVICE_CONTROL_METHOD.MOCK,
    supportedControlMethods: device?.controlMethods || [APEX_OS_DEVICE_CONTROL_METHOD.MOCK],
    realExecutionEnabled: false,
    mockOnly: true,
    canExecuteNow: false,
    canExecuteAfterApproval: false,
    executionLocked: true,
    noExecutionTokens: true,
    externalActionExecuted: false,
    realDeviceTouched: false,
    futureActByDefaultCandidate,
    privacySummary: privacy.summary,
    promptInjectionSummary: untrusted.summary,
    actionPermissionSummary,
    toolRouteSummary,
    level3PreparationCategory: level3Category,
    level3PreparationPacket,
    level3PreparationPacketSummary: buildApexOsExternalPreparationPacketSummary(level3PreparationPacket),
    traceMetadata,
    steps,
    reason: safeText(status === APEX_OS_DEVICE_PLAN_STATUS.BLOCKED
      ? "Device command blocked by device-layer safety, privacy, prompt-injection, or action-permission policy."
      : status === APEX_OS_DEVICE_PLAN_STATUS.NEEDS_INFO
        ? "Device command needs review or more information before any future connector planning."
        : "Device command prepared as a mock-only plan. No real device control exists in v0.",
    420),
    receiptDraft: buildApexOsDeviceCommandReceipt({
      planId,
      status,
      commandType,
      room,
      device,
      scene,
      createdAt,
    }, { now }),
    createdAt,
  });

  return plan;
}

export function buildApexOsDeviceLayerSummary(plan = {}) {
  if (!plan?.planId) return null;
  return Object.freeze({
    planId: safeText(plan.planId, SHORT_LIMIT),
    status: safeText(plan.status, SHORT_LIMIT),
    commandType: safeText(plan.commandType, SHORT_LIMIT),
    roomId: safeText(plan.room?.id || "", SHORT_LIMIT),
    deviceId: safeText(plan.device?.id || "", SHORT_LIMIT),
    sceneId: safeText(plan.scene?.id || "", SHORT_LIMIT),
    riskLevel: safeText(plan.riskLevel, SHORT_LIMIT),
    futureActByDefaultCandidate: Boolean(plan.futureActByDefaultCandidate),
    canExecuteNow: false,
    executionLocked: true,
    mockOnly: true,
    realExecutionEnabled: false,
    level3PreparationCategory: safeText(plan.level3PreparationCategory || "", SHORT_LIMIT),
    summaryText: safeText(`Jarvis Device Layer v0 ${plan.status}; command=${plan.commandType}; target=${plan.targetLabel || "unknown"}; risk=${plan.riskLevel}; mockOnly=true; canExecuteNow=false; realExecutionEnabled=false.`, 520),
  });
}
