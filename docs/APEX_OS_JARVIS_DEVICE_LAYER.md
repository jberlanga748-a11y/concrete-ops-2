# Apex OS Jarvis Device Layer

Status: v0 mock-first foundation plus Home Assistant v1 one-time execution-capable connector. Real Home Assistant control remains blocked unless server config explicitly enables Home Assistant, enables execution, leaves the kill switch off, and John confirms an exact short-lived preview.

## Purpose

Apex OS is John's private Jarvis-style life operator. The Jarvis Device Layer lets Apex understand rooms, devices, aliases, scenes, and safe local-control intent before any real TV, screen, speaker, light, computer, browser, desktop, or music connector exists.

This layer is private and operator-only. It is not a customer-facing Apex HQ feature.

## Current v0 Model

Rooms:

- Bedroom
- Living Room
- Office

Devices:

- TVs
- Second screens and dashboard displays
- Speakers
- Lights
- Computer targets
- Disabled camera and microphone placeholders for explicit blocking

Scenes:

- Work Mode
- Focus Mode
- Night Mode
- Dashboard Mode

Capabilities:

- Power
- Volume
- Input/source
- Cast/open dashboard
- Play media
- Scene mode
- Wake device

Control methods represented for planning:

- Home Assistant
- Roku ECP
- Chromecast
- Apple TV
- HDMI-CEC
- Wake-on-LAN
- IR blaster
- Mock

Only `mock` is active in v0. All real methods are labels for future planning and remain disabled.

## Supported Mock Command Plans

The shared helper can prepare safe, non-executing plans for requests like:

- Turn on bedroom TV
- Put Apex dashboard on bedroom TV
- Start living room work mode
- Play focus music in office
- Show second-screen dashboard

Each plan returns:

- normalized target room/device/scene
- command type
- required capability
- risk level
- future act-by-default eligibility
- privacy firewall summary
- untrusted content firewall summary
- action permission summary
- tool route summary
- optional Level 3 preparation packet for browser, desktop, music, or second-screen plans
- mock receipt proving no real device was touched

All v0 plans force:

- `canExecuteNow: false`
- `canExecuteAfterApproval: false`
- `executionLocked: true`
- `noExecutionTokens: true`
- `realExecutionEnabled: false`
- `mockOnly: true`

## Blocked Device Areas

Cameras, microphones, recording, hidden monitoring, and surveillance commands are blocked in v0.

These are not act-by-default candidates. Any future camera or microphone support would require a separate explicit privacy phase, visible user consent, clear on/off state, audit logging, and no hidden operation.

## Local Network + Remote Access Jarvis Layer Plan

Status: documentation/planning only. No router calls, local-network scans, family-device controls, remote-access tunnel controls, new endpoints, credential reads, schema changes, desktop/browser/music-provider execution, camera/mic access, or background control loops are implemented by this plan.

Goal: Apex OS should eventually let John use Apex anywhere and safely control allowlisted devices connected to his home Wi-Fi through legitimate authenticated control paths. The target experience includes requests like:

- "Apex, who is connected to my Wi-Fi?"
- "Apex, turn off the kid tablet's internet."
- "Apex, pause the tablet."
- "Apex, turn on my bedroom TV."
- "Apex, start work mode in the living room."
- "Apex, I'm away from home, show me what's going on."
- "Apex, put yourself on the second screen."

This layer extends the Jarvis Device Layer beyond smart-home devices into network clients, router controls, family-device management, and secure remote operator access.

### Layer 1: Local Network Device Registry

The registry is the private source of truth for known home devices. It should not be built from arbitrary scanning. It should be seeded from John-approved router, Home Assistant, or device-management sources.

Planned registry fields:

- `deviceId`: Apex OS stable private ID.
- `displayName`: John-friendly name, such as `Kid Tablet` or `Bedroom TV`.
- `roomId`: bedroom, living room, office, garage, outside, or unknown.
- `ownerLabel`: John, kid, guest, household, work, or unknown.
- `deviceType`: phone, tablet, TV, speaker, console, laptop, desktop, light, plug, router, access point, printer, or unknown.
- `connectorType`: home-assistant, router, unifi, omada, openwrt, nest-wifi, apple-mdm, android-management, intune, roku, chromecast, lg-webos, smart-plug, mock, or manual.
- `connectorDeviceId`: provider-side ID stored server-side only.
- `macAddressHash`: optional hashed MAC for matching, not raw UI display by default.
- `ipAddressLastSeen`: optional transient private IP, hidden from normal UI unless John opens technical details.
- `allowedActions`: read-status, pause-internet, unpause-internet, power-on, power-off, set-volume, select-source, cast-dashboard, trigger-scene, wake-device, or no-actions.
- `riskLevel`: read-only, low-local-reversible, household-impact, other-person-impact, high-risk, or forbidden.
- `allowlisted`: explicit John-reviewed status.
- `lastSeenAt`: timestamp from router/Home Assistant/device manager.
- `lastSeenSource`: source that reported the device.
- `notes`: private operator notes, redacted for secrets.

Registry rules:

1. Unknown network devices start as `allowlisted: false` and read-only.
2. A raw MAC, router client ID, private IP, or provider ID is treated as private technical metadata.
3. UI should default to friendly names, owner labels, rooms, type, online/offline, and last seen.
4. Device identity matching should prefer server-side provider IDs and hashed MACs, not user-supplied free-form MAC/IP values.
5. Field/customer/demo users must never see the registry.
6. Cameras, microphones, recording devices, locks, alarms, HVAC, garage/security devices, and unknown devices remain blocked until a separate explicit phase.

### Layer 2: Router / Network Control Adapter

Purpose: answer Wi-Fi/client questions and eventually pause/unpause internet for one allowlisted network client.

Allowed future read behavior:

- Read connected or recently seen devices from an authenticated router/controller/Home Assistant integration.
- Group devices by John-approved room/person labels.
- Show online/offline, last seen, connection type, and safe display names.
- Return unknown devices for John to label, without treating them as controllable.

Allowed future control behavior:

- Preview pause internet for one allowlisted device.
- Preview unpause internet for one allowlisted device.
- Execute one pause/unpause only after a valid preview, single-use guard, and confirmation until a later trusted-local policy exists.
- Return a receipt with target device, action, timestamp, connector, result, and undo hint.

Router adapter rules:

1. Use legitimate router/controller APIs, Home Assistant integrations, or documented local APIs only.
2. Router credentials are server-side only and must never be returned to frontend, traces, logs, receipts, screenshots, or model prompts.
3. No arbitrary subnet scanning, port scanning, packet sniffing, password guessing, brute forcing, exploit behavior, MAC spoofing, deauth attacks, or bypassing router security.
4. Unknown devices cannot be paused by free-form MAC/IP text.
5. Pausing a child/household device affects another person's access, so first implementation should require explicit confirmation. Later act-by-default is possible only after John configures clear household policies.
6. Unpause should always be available as an easy rollback path when the connector supports it.

Preferred router/control paths:

- Home Assistant device tracker/integration first when it already has a legitimate router integration.
- UniFi Network-style controller integration for read-only client presence and, later, configured client controls if supported safely.
- TP-Link Omada, OpenWrt `ubus`, or other router/controller APIs only if John owns/administers that router and the API can be used with least privilege.
- Google/Nest Family Wi-Fi can be treated as a manual/control-reference path unless a safe official automation path is available.

### Layer 3: Family Device Control Adapter

Purpose: document what "pause the tablet" can realistically mean. The safe first version should pause internet at the router, not try to bypass device operating-system controls.

Apple:

- Consumer Screen Time / Family Sharing should be treated as manual-app control unless Apple provides a legitimate API path for John's exact setup.
- Apple MDM can manage enrolled/supervised devices through documented device-management commands and restrictions, but this is a managed-device setup, not an automatic path for ordinary personal devices.
- Apex must not try to bypass Screen Time, device passcodes, Apple ID security, MDM enrollment rules, or a device owner's consent.

Android / Google:

- Consumer Google Family Link should be treated as manual-app control unless a supported official automation path is available.
- Android Management API can issue commands and policies for Android devices enrolled in Android Enterprise management, but that requires a managed-device setup and is not the same as consumer Family Link.
- Apex must not bypass Google account security, device-owner consent, or enrollment requirements.

Windows / local computers:

- Microsoft Intune via Microsoft Graph can manage Intune-enrolled devices when licensed and configured.
- Local Windows controls may be possible only for John's own devices through an approved desktop/local-agent phase.
- Apex must not install hidden agents, capture screens, bypass login, or control another person's computer without explicit approval.

Practical first interpretation:

- "Pause the tablet" means "pause the tablet's internet through the router adapter" once the tablet is identified, named, and allowlisted.
- OS-level app/screen lock remains future managed-device work and should not be promised for consumer family devices.

### Layer 4: Smart Home Adapter

The existing Home Assistant v1 connector remains the first smart-home control path for:

- bedroom TV power/source/volume when represented by an allowlisted Home Assistant `media_player`
- lights, plugs, and switches
- work/focus/dashboard scenes and scripts
- dashboard casting only through an explicit allowlisted scene/script

Future smart-home options:

- LG webOS for LG TVs after pairing and allowlisting.
- Roku ECP for Roku TVs after local allowlisting.
- Chromecast for dashboard/media casting after account/session privacy review.
- Apple TV for Apple ecosystem targets after pairing/account boundary review.
- smart plugs/lights/speakers through Home Assistant whenever possible.

Home Assistant should remain the preferred hub because it can centralize device models, scenes, and local integrations behind one Apex OS server-only connector.

### Layer 5: Remote Access Layer

Purpose: let John use Apex away from home while Apex can still reach approved home devices safely.

Remote access options:

1. **Apex app remote access**: John logs into Apex HQ/Apex OS from anywhere through the normal authenticated app. This gives remote chat/control UI, but home-device control still requires a secure path from the server to home.
2. **Tailscale / WireGuard private network**: put the Apex server or a small future Apex home bridge into John's private tailnet/VPN. A subnet router can expose approved home LAN devices without making them public.
3. **Home Assistant Cloud / Nabu Casa**: useful for secure remote Home Assistant UI/connectivity. Apex should still use server-side credentials and must not expose remote URLs/tokens to the frontend.
4. **Secure tunnel / home bridge**: a future local Apex bridge can maintain an outbound authenticated connection to Apex so the cloud app never exposes a public router/admin endpoint.
5. **Direct public port forwarding**: not recommended for Apex OS control. Avoid unless a separate security review approves exact firewall, TLS, authentication, rate-limit, and audit controls.

Remote access rules:

1. Remote Apex OS remains operator-only behind the existing Apex OS access gate.
2. No public unauthenticated endpoint may expose home status, network devices, router controls, or smart-home controls.
3. Remote control must use the same preview, guard, confirmation, receipt, privacy firewall, prompt-injection firewall, action permission, and kill-switch rules as local control.
4. "Show me what's going on" means status dashboard, last-seen devices, online/offline, Home Assistant states, alerts, and recent receipts. It does not mean camera/mic recording, hidden surveillance, or screen capture.
5. Every remote action receipt must label `remote: true`, connector, target device, risk level, action, result, and rollback hint.

### Safety Boundaries

- Operator-only at route, API, UI, data, and receipt levels.
- No field/customer/demo access.
- No hidden surveillance, hidden GPS, hidden screen capture, hidden recording, or hidden network monitoring.
- No camera/mic recording without a separate future approval phase.
- No password guessing, brute force, exploit behavior, packet sniffing, deauth, or bypassing device-owner security.
- No raw router credentials, Wi-Fi passwords, Home Assistant tokens, VPN keys, OAuth tokens, cookies, or provider sessions in frontend, traces, receipts, docs, screenshots, or model prompts.
- Consequential actions affecting another person's time/access still require confirmation until John configures explicit household policies.
- Local reversible network/device actions can become act-by-default only after allowlisting, receipts, easy undo, kill switch, and repeated validation.

### Local Network + Remote Access Roadmap

v0: Connected-device registry design.

- Documentation/planning only.
- Define registry fields, risk tiers, source types, privacy posture, and no-scan rule.

v1: Read-only connected-device discovery.

- Add server-only read helper for one chosen legitimate source, preferably Home Assistant/router integration.
- Return redacted connected/recent devices.
- No pause/unpause, no control, no scanning, no raw credentials.

v2: Device naming/owner/room assignment.

- Let John label known devices, owner/person, room, type, and allowlisted status.
- Keep unknown devices read-only.
- No control yet.

v3: Router pause/unpause preview.

- Build exact non-executing preview for one allowlisted device.
- Include target, owner/room, connector, action, expected effect, undo path, risk tier, and confirmation phrase.
- No router state-changing call.

v4: One allowlisted pause/unpause action.

- Execute one exact previewed pause/unpause against one allowlisted device through a legitimate router/controller API.
- Require execution flag, kill switch off, single-use guard, confirmation, timeout, receipt, and unpause/rollback path.

v5: Secure remote access design.

- Choose Apex app backend plus Tailscale/VPN, Home Assistant Cloud, or home bridge path.
- Document credential boundary, threat model, audit rules, and emergency stop.
- No remote control implementation yet.

v6: Remote operator-only control.

- Allow John to initiate approved local-network/smart-home commands while away from home.
- Require operator auth, device allowlist, remote receipt, kill switch, and exact preview/guard behavior.

### Official Reference Constraints Checked

- Tailscale documents identity-based private network controls and subnet-router patterns for reaching LAN devices without public exposure.
- Home Assistant/Nabu Casa documents remote UI access for Home Assistant instances.
- Home Assistant's UniFi Network integration documents connected-client presence/last-seen style use.
- Apple documents MDM commands for enrolled managed Apple devices; consumer Screen Time is not treated as a public automation API.
- Google documents Android Management API commands/policies for managed Android devices; consumer Family Link is not treated as a public Apex automation API.
- Microsoft documents Intune/Graph management for licensed/enrolled managed devices.
- OpenWrt documents `ubus` as a local IPC/RPC system with access control; it is a possible router path only for John-administered OpenWrt routers.

## Home Assistant Connector Boundary

Home Assistant should be the preferred first real hub because it can centralize device discovery, scene control, automations, and local-network device adapters behind one auditable control surface.

This is a design boundary only. Apex OS must not call Home Assistant, control devices, add credentials, or add execution endpoints until a later explicitly approved implementation phase.

### Credential Boundary

Credentials are server-only.

Frontend code must never receive:

- Home Assistant URL values
- Home Assistant tokens
- `Authorization` headers
- raw request headers
- Home Assistant cookies/session values
- entity registry dumps that include private identifiers beyond allowlisted labels

Future env names only:

- `APEX_HOME_ASSISTANT_BASE_URL`
- `APEX_HOME_ASSISTANT_TOKEN`
- `APEX_HOME_ASSISTANT_ENABLED`
- `APEX_HOME_ASSISTANT_EXECUTION_ENABLED`
- `APEX_HOME_ASSISTANT_KILL_SWITCH`
- `APEX_HOME_ASSISTANT_LOCAL_NETWORK_ONLY`
- `APEX_HOME_ASSISTANT_ALLOWED_ENTITIES_JSON`
- `APEX_HOME_ASSISTANT_REQUEST_TIMEOUT_MS`
- `APEX_HOME_ASSISTANT_MAX_RETRIES`
- `APEX_HOME_ASSISTANT_ALLOW_DASHBOARD_CAST`

Rules:

1. Env values are never printed, logged, returned to the client, stored in traces, stored in receipts, pasted into docs, or exposed in screenshots.
2. The connector prefers a local-network Home Assistant URL. Remote/cloud URLs require a separate privacy and account-risk review.
3. Server logs must redact URL host details if configured as private, all headers, all bearer tokens, and all request bodies containing secrets.
4. The server helper must fail closed when config is missing, disabled, malformed, remote when local-only is required, or the kill switch is on.
5. Frontend and API responses may show only redacted status labels such as `configured`, `disabled`, `kill-switch-on`, `local-network-required`, or `unconfigured`.

### Device Allowlist

All real control must go through an allowlist. Apex OS can only control Home Assistant entities that are explicitly mapped from Apex device or scene IDs.

Future allowlist shape:

```json
{
  "devices": {
    "bedroom-tv": {
      "roomId": "bedroom",
      "label": "Bedroom TV",
      "domain": "media_player",
      "entityId": "media_player.example_bedroom_tv",
      "allowedServices": [
        "media_player.turn_on",
        "media_player.turn_off",
        "media_player.volume_set",
        "media_player.volume_up",
        "media_player.volume_down",
        "media_player.select_source"
      ],
      "allowDashboardCast": false,
      "riskLevel": "low-local-reversible"
    }
  },
  "scenes": {
    "work-mode": {
      "label": "Work Mode",
      "entityId": "scene.example_work_mode",
      "allowedServices": ["scene.turn_on"],
      "riskLevel": "medium-local-visible"
    }
  }
}
```

The example entity IDs above are placeholders only.

Allowlist rules:

1. Unknown entity IDs are blocked.
2. Requests cannot supply free-form entity IDs directly to execution.
3. The server maps Apex device IDs to allowlisted Home Assistant entity IDs.
4. The server verifies the entity domain matches the allowed command.
5. The server verifies the requested service is in `allowedServices`.
6. Alias resolution from the Jarvis Device Layer can choose an Apex device ID, but cannot invent a Home Assistant entity ID.
7. Allowlisted labels may be returned to UI. Raw Home Assistant config, token, URL, headers, and unallowlisted entity inventory must not.

Blocked-by-default domains and device classes:

- `camera`
- microphone or recording entities
- `lock`
- `alarm_control_panel`
- `climate` / thermostat / HVAC
- garage doors and high-impact `cover` entities
- security systems
- account/security/billing entities
- anything not explicitly allowlisted

### First Command Allowlist

Allowed first commands after a later implementation approval:

- read status for allowlisted entities
- `media_player.turn_on`
- `media_player.turn_off`
- `media_player.volume_set`
- `media_player.volume_up`
- `media_player.volume_down`
- `media_player.select_source`
- `light.turn_on`
- `light.turn_off`
- `switch.turn_on`
- `switch.turn_off`
- `scene.turn_on` for approved scene IDs
- `script.turn_on` for approved script IDs
- open/cast Apex dashboard only through an explicitly configured allowlisted script or scene

Blocked first:

- locks
- alarms
- cameras
- microphones
- recording
- thermostat/HVAC
- garage doors
- payments, orders, bookings, or purchasing
- account, provider, security, auth, session, billing, schema, production, deploy, or deletion actions
- browser/desktop/music external execution outside the allowlisted Home Assistant device command
- any Home Assistant service, entity, scene, script, or dashboard target not allowlisted

### Execution Levels

Home Assistant readiness must progress one level at a time:

| Stage | Behavior | Execution |
| --- | --- | --- |
| Dry-run | Resolve room/device/scene alias, validate allowlist, classify risk, and produce a mock receipt. | No Home Assistant call. |
| Status read | Read state only for allowlisted entities. | Read-only server call in a later phase. |
| Preview | Produce exact command preview with entity label, service, payload, risk, cancellation path, timeout, retry policy, and receipt draft. | No state-changing call. |
| Execution disabled | Server helper exists but execution flag is off or kill switch is on. | Blocks closed. |
| Level 4 first execution | Execute one exact approved preview for one allowlisted low-risk device command. | Requires explicit approval, config flag, kill switch off, fresh state check, timeout, receipt. |
| Later trusted local automation | Narrow low-risk local commands may become act-by-default candidates only after repeated hardening. | Requires a separate policy, caps, observability, and cancel/kill controls. |

Required controls:

- real execution disabled by default
- explicit config flag required
- global kill switch
- per-command receipt
- timeout limit
- retry limit with no retry storm
- no background uncontrolled loops
- no hidden device control
- no camera/microphone/surveillance support
- privacy firewall recheck
- prompt-injection firewall recheck
- Action Permission Matrix recheck
- Tool Router summary
- content-free trace metadata

### Current Helper And API Shape

Current server-only helper:

- `server/apexHomeAssistantConnector.js`

Current helper functions:

- `getHomeAssistantConnectorStatus()`
- `normalizeHomeAssistantAllowlist()`
- `buildHomeAssistantCommandPreview(input)`
- `createHomeAssistantExecutionGuard(preview)`
- `executeHomeAssistantCommandOnce(input)`
- `readHomeAssistantEntityStatus(input)`
- `sanitizeHomeAssistantReceipt(receipt)`

Current operator-only endpoints:

- `GET /api/apex-os/home-assistant/status`
- `POST /api/apex-os/home-assistant/preview`
- `POST /api/apex-os/home-assistant/execute`

Endpoint rules:

1. Every route must use the existing Apex OS operator-only gate.
2. Field, customer, demo, normal-admin, estimator, pilot, and switched-company contexts get no access.
3. Status responses cannot include token, URL, headers, raw Home Assistant errors, or unallowlisted entities.
4. Preview responses never execute service calls.
5. Preview responses can mint a short-lived single-use execution guard only when execution config is enabled, the kill switch is off, and the preview is v1-executable.
6. Execute responses require Level 4 preview hash, approval phrase, config flag, kill switch off, allowlist recheck, payload validation, and safety rechecks.
7. Execute responses return a compact receipt, not raw provider payloads.

### Test Plan

Future tests must cover:

- mock Home Assistant server for all connector tests
- token never appears in logs, receipts, traces, API responses, thrown errors, or snapshots
- unknown entity ID blocked
- free-form entity ID from user input blocked
- disallowed domain blocked
- cameras/mics/recording/surveillance blocked
- locks, alarms, thermostat/HVAC, garage door, account/security/billing actions blocked
- dry-run does not call the mock server
- preview does not call state-changing services
- status read only queries allowlisted entities
- kill switch blocks execution
- execution disabled flag blocks execution
- timeout and retry limits are enforced
- operator-only route tests block field/customer/demo users
- privacy firewall blocks/redacts secrets before connector planning
- prompt-injection firewall blocks untrusted instructions before connector planning
- receipts contain no secrets/raw provider payloads

### Home Assistant Connector v0 Implementation

Home Assistant Connector v0 is the first real connector slice, but it still does not execute device control.

Implemented:

1. Server-only config reader that reports redacted connector status.
2. Allowlist parser for Apex device/scene IDs mapped to Home Assistant entity IDs.
3. Mock Home Assistant test server coverage.
4. Read-only status helper for allowlisted entities only.
5. Command preview helper for allowlisted `media_player`, `light`, `switch`, `scene`, and `script` commands.
6. Operator-only status and preview endpoints:
   - `GET /api/apex-os/home-assistant/status`
   - `POST /api/apex-os/home-assistant/preview`
7. Execute endpoint remains absent.
8. Tests cover token redaction, role blocking, kill switch, unknown entity blocking, disallowed domain blocking, dashboard-cast allowlisting, status timeout/error handling, and no service calls during preview.

Still not implemented:

- Home Assistant service calls
- execute endpoint
- Level 4 execution approval flow
- real device control
- browser/desktop/music external execution
- background device loops

Only after v0 is audited should Apex OS design a one-time Level 4 command execution for a single low-risk reversible command.

### Home Assistant Connector v1 Implementation: One-Time Low-Risk Real Execution

Status: implemented in code, but gated closed by default. The execute route exists only for one exact low-risk allowlisted command and cannot run unless all server-side config, preview, guard, confirmation, allowlist, payload, privacy, prompt-injection, action-permission, timeout, and kill-switch checks pass.

Goal: allow Apex OS to execute exactly one low-risk allowlisted Home Assistant command after John has reviewed the exact preview and confirmed it. This is Level 4 one-time execution, not Level 5 trusted automation and not act-by-default local device control.

Allowed first execution candidates:

- Turn on/off one allowlisted `light`.
- Turn on/off one allowlisted `switch`.
- Turn on/off one allowlisted `media_player`.
- Set volume on one allowlisted `media_player` inside a safe configured range. Default v1 cap should be `0.60` unless the allowlist sets a lower cap; no v1 command may exceed a hard cap of `0.75`.
- Select source on one allowlisted `media_player` from that device's allowlisted sources only.
- Run one allowlisted `scene` or `script` for dashboard, work, focus, or other explicitly named low-risk local mode.

Still blocked:

- Cameras, microphones, recording, surveillance, hidden monitoring, and any sensor/stream capture.
- Locks, alarms, security systems, thermostat/HVAC, garage doors, high-impact covers, and anything safety-critical.
- Unknown entities, user-supplied entity IDs, mismatched domains, and free-form Home Assistant service calls.
- Account, provider, security, billing, auth, session, schema, production, deploy, deletion, spending, ordering, booking, messaging, email, SMS, posting, publishing, browser control, desktop control, and music-provider execution outside the allowlisted Home Assistant local-device command.

#### Preview-To-Execute Flow

1. John asks Apex to control a local device.
2. Apex resolves room/device/scene aliases through the Jarvis Device Layer.
3. The existing preview route produces an exact command preview with Apex device ID, Home Assistant entity ID, service, payload, risk tier, timeout, retry limit, rollback/undo hint, and receipt draft.
4. The server creates a short-lived, one-action execution guard bound to the preview hash, actor/user, current operator workspace, Apex device or scene ID, entity ID, service, payload hash, allowlist hash, readiness level, and expiration time.
5. The UI shows the exact preview and the confirmation phrase: `I approve Apex to execute Home Assistant preview [previewId] one time now`.
6. The execute route accepts only `previewId`, the opaque execution guard identifier/token, the confirmation phrase, and the unchanged preview hash. It must not accept a new free-form entity ID, service, or payload as authority.
7. Immediately before execution, the server re-reads config, verifies execution is enabled, verifies the kill switch is off, revalidates the allowlist, compares the preview/payload hashes, re-runs the Privacy Firewall, Prompt-Injection Firewall, Action Permission Matrix, Tool Router metadata, local-network requirement, timeout/retry policy, and trace hygiene.
8. Dry-run mode returns the same receipt shape with `externalActionExecuted: false` and must not call Home Assistant services.
9. Real execution, when enabled, calls exactly one Home Assistant service endpoint once: `POST /api/services/{domain}/{service}` for the already previewed and allowlisted service.
10. The execution guard is consumed after the first attempt and cannot be replayed, broadened, retried into a storm, or used for any changed target/payload.
11. Apex returns a sanitized receipt and shows it in Apex Activity / What Apex Did.

The preview is the contract. If entity, service, payload, source, volume, scene/script, actor, workspace, allowlist, config posture, approval phrase, expiration, or risk status changes, execution must fail closed and require a new preview.

#### Current API Shape

Existing preview route remains separate:

- `POST /api/apex-os/home-assistant/preview`

Implemented execute route:

- `POST /api/apex-os/home-assistant/execute`

Execute request shape:

```json
{
  "previewId": "ha-prev_...",
  "executionGuard": "opaque-single-use-token-or-id",
  "previewHash": "sha256:...",
  "confirmationPhrase": "I approve Apex to execute Home Assistant preview ha-prev_... one time now",
  "dryRun": false
}
```

Execute response shape:

```json
{
  "receiptId": "ha-rec_...",
  "previewId": "ha-prev_...",
  "readinessLevel": 4,
  "status": "succeeded",
  "externalActionExecuted": true,
  "apexDeviceId": "bedroom-tv",
  "entityId": "media_player.example_bedroom_tv",
  "service": "media_player.turn_on",
  "payloadHash": "sha256:...",
  "startedAt": "2026-06-06T00:00:00.000Z",
  "completedAt": "2026-06-06T00:00:01.000Z",
  "durationMs": 1000,
  "undoAvailable": true,
  "undoHint": "Create a new preview to turn this device off.",
  "secretsExposed": false
}
```

Responses must never include Home Assistant token, base URL, authorization headers, cookies, session values, raw provider errors, unallowlisted entities, raw private prompts, or raw malicious/untrusted content.

#### Execute Route Refusal Cases

The execute route refuses when:

- The current user is not inside the existing Apex OS operator gate.
- The Home Assistant connector is disabled, missing config, malformed, remote when local-only is required, or unavailable.
- `APEX_HOME_ASSISTANT_EXECUTION_ENABLED` is not explicitly enabled.
- `APEX_HOME_ASSISTANT_KILL_SWITCH` is on.
- The preview is missing, expired, already consumed, not Level 4 eligible, or not tied to the current actor/workspace.
- The preview hash, payload hash, entity ID, service, source, volume, scene/script, allowlist hash, or confirmation phrase does not match.
- The entity or service is unknown, not allowlisted, mismatched, blocked-by-domain, blocked-by-device-class, or free-form.
- Volume exceeds the configured cap or source is not in the device source allowlist.
- Privacy Firewall, Prompt-Injection Firewall, Action Permission Matrix, Tool Router, trace hygiene, timeout, retry, or local-network checks fail.
- The request attempts to execute more than one command, schedule a command, create a background loop, or broaden into browser/desktop/music/order/send/spend/deploy behavior.

#### Receipts And Undo Hints

Every execution attempt must return a compact sanitized receipt.

Receipt metadata should include:

- receipt ID, preview ID, execution attempt ID, readiness level, status, actor hash/id, timestamp, duration, Apex device or scene ID, entity ID, service, payload hash, connector version, allowlist hash, risk tier, timeout/retry policy, dry-run flag, external-action-executed flag, and sanitized result code.
- privacy firewall result, prompt-injection firewall result, action permission result, tool route summary, and trace ID with no raw private content.
- undo availability and undo hint.

Undo guidance:

- `light.turn_on`, `switch.turn_on`, and `media_player.turn_on`: suggest a new preview to turn the same entity off.
- `light.turn_off`, `switch.turn_off`, and `media_player.turn_off`: suggest a new preview to turn the same entity on.
- `media_player.volume_set`: show prior volume only if read safely immediately before execution; otherwise say manual adjustment or a new volume preview is needed.
- `media_player.select_source`: show prior source only if read safely immediately before execution; otherwise say manual source selection or a new source preview is needed.
- `scene.turn_on` and `script.turn_on`: do not imply reliable undo. Show a reset/manual fallback scene only if explicitly allowlisted.

#### v1 Test Coverage

Current v1 tests use a mock Home Assistant server and cover:

- operator-only execute route; field/customer/demo users are blocked server-side
- token/base URL/headers never appear in responses, logs, receipts, traces, thrown errors, or snapshots
- execution disabled flag blocks
- kill switch blocks
- missing/malformed/remote config blocks safely
- preview ID and execution guard are required
- expired guard blocks
- consumed guard cannot be replayed
- modified payload, entity, service, source, volume, actor, workspace, or allowlist hash blocks
- unknown/free-form entity IDs block
- blocked domains/classes block cameras, mics, recording, surveillance, locks, alarms, HVAC, garage, security, account, and billing devices
- volume caps are enforced
- selected source must be allowlisted
- scene/script execution is limited to allowlisted dashboard/work/focus modes
- dry-run does not call Home Assistant services
- real execution calls the mock service endpoint exactly once for the exact previewed service
- timeout and retry limits are enforced without retry storms
- privacy firewall, prompt-injection firewall, action permission matrix, tool router, and trace hygiene are rechecked immediately before execution
- receipts are sanitized and include useful undo/reset hints
- existing v0 status/preview tests and Level 2/Level 3 Apex OS tests still pass

Implemented v1 code:

- `server/apexHomeAssistantConnector.js`
- `server/apexHomeAssistantConnector.test.js`
- `POST /api/apex-os/home-assistant/execute`

Implemented v1 behavior:

- preview route can mint a short-lived single-use guard only when execution config is already enabled
- execute route consumes the guard after one real attempt
- execution disabled flag blocks
- kill switch blocks
- modified payload blocks
- expired preview blocks
- replayed preview blocks
- missing/mismatched confirmation phrase blocks
- unknown/free-form entity blocks
- blocked device classes/domains block
- non-v1 preview commands such as volume up/down do not receive execution guards
- allowed light/switch/media-player commands call the mock Home Assistant server exactly once in tests
- receipts redact secrets, headers, base URL, raw provider payloads, raw private prompts, and unsafe content

## Other Future Control Options

Roku ECP:

- Good for local Roku TV/app commands after allowlisting.
- Must avoid hidden navigation or account actions.

Chromecast:

- Useful for casting dashboards or media to supported displays.
- Needs account/session privacy handling.

Apple TV:

- Useful where Apple's ecosystem is already used.
- Needs strict pairing/account boundaries.

HDMI-CEC:

- Useful for low-level TV/display power and input control.
- Needs local hardware validation and clear rollback/manual override.

Wake-on-LAN:

- Useful for waking known computers.
- Should be allowlisted by device identity, not free-form network scan.

IR blaster:

- Useful for older TVs and receivers.
- Needs room/device mapping so Apex does not blast ambiguous commands.

## Next Real Implementation Slice

The safest next step is not broader automation. It is a first local live test plan for one allowlisted low-risk device:

1. Keep the existing server-only credential boundary.
2. Configure only one test light/switch/media player entity in the allowlist.
3. Keep execution disabled until the status and preview routes show the expected redacted posture.
4. Enable execution only for the test session, leave the kill switch off, and run one preview-confirm-execute cycle.
5. Confirm receipt, undo hint, and Home Assistant state manually.
6. Turn execution off or use the kill switch after the test if John does not want ongoing capability.

No browser, desktop, music-provider, order, send, spend, booking, deploy, schema/auth/session, billing, deletion, camera, mic, lock, alarm, HVAC, garage, security, or background automation should be added in this slice.
