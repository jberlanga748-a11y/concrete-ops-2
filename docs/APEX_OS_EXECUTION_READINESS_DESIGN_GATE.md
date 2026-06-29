# Apex OS Execution-Readiness Design Gate

Last updated: 2026-06-06

Status: design gate plus current Level 2 control reference, Level 3 external-preparation reference, and Home Assistant v1 one-time execution gate. The first narrow Level 2 internal action implementation lives in code. Level 3 remains preparation-only. Home Assistant v1 now has a config-gated one-time execute route for low-risk allowlisted local device commands only. This document does not authorize or add desktop/browser/music-provider control, ordering, booking, sending, spending, deploys, production changes, schema/auth/session changes, customer-visible behavior, or any execution beyond the documented Home Assistant v1 slice.

Purpose: define the Jarvis-style execution philosophy and what must be true before Apex OS is allowed to execute live or consequential actions for John. Apex OS now has a narrow Level 2 act-by-default path for private, local, reversible, low-risk internal state, then reports what it did and preserves undo/archive/edit/reset guidance. Apex OS should interrupt John for consequential actions.

## Current Boundary

- Apex OS is John's private operator-only layer.
- Apex OS remains hidden from field, customer, demo, estimator, normal-admin, pilot, and switched-company contexts.
- Current Apex OS approval packets are review records only. Approval packet status does not execute an action.
- Current browser, desktop, music, ordering, booking, messaging, email, calendar, connector, agent, code, test, git, deploy, production, schema/auth/session, and payment surfaces are non-executing plans only.
- Current private internal records are limited to existing operator-only UI/API flows. This design gate does not unlock autonomous writes, external actions, or tool execution.
- Current Level 3 external action preparation is non-executing. It may create preparation packets and exact-action previews, but it must not create execution tokens, call connectors, control browser/desktop/music, or perform external-action execution.
- Current Home Assistant v1 can expose operator-only redacted status, non-executing command previews, short-lived preview-bound execution guards, and one-time execution for allowed low-risk local device commands only when execution config is explicitly enabled and the kill switch is off.
- Execution readiness must be introduced one level at a time. No level can skip the design, tests, permission review, visual QA, audit review, and rollback requirements for its risk class.

## Jarvis-Style Operating Model

Apex OS should be designed around this operator loop:

1. Understand John's request and the current context.
2. Decide the right capability, skill, model tier, or tool route.
3. Act when the action is private, local, reversible, internal, and low-risk.
4. Report what it did with a compact receipt and undo/archive/edit path when available.
5. Learn safe preferences and outcomes from the result.
6. Interrupt only when the next action is consequential, irreversible, external, expensive, public, account-changing, customer-visible, or affects another person's time, money, privacy, or data.

The target is not an approval-packet machine. Approval gates exist to protect John from real-world consequences, not to slow down private organization, planning, memory, or local internal state.

## Act-By-Default Private Scope

Once an explicit execution phase implements the needed server-side controls, Apex OS may act by default for:

- Memory updates and preference updates that are private, sourced, reversible/editable, and not sensitive psychological profiling.
- Task and reminder updates inside Apex OS private state.
- Private planning notes, daily plans, evening reviews, and active-priority organization.
- Local research notes and saved source summaries that do not browse, publish, send, or expose private data without the relevant future capability.
- Organizing internal Apex OS state such as run notes, handoffs, draft labels, safe summaries, and reviewed knowledge indexes.
- Low-risk local Apex OS UI or environment preferences when that implementation exists and provides a visible undo/reset path.

Act-by-default does not mean hidden. Private actions need operator-only access, safe logging metadata, a result receipt, clear state labels, and a practical undo, archive, edit, or reset path where the domain supports it.

## Interrupt-Only Scope

Apex OS must stop and ask for fresh confirmation before:

- Spending money, changing billing/payment, creating subscriptions, or increasing costs.
- Ordering products, food, materials, travel, services, or anything that changes money/logistics.
- Booking appointments, reservations, meetings, services, or anything involving another person's schedule.
- Sending SMS, email, chat, DMs, calls, comments, public posts, ads, customer/vendor/employee/court/government/bank/insurer messages, or external notifications.
- Posting, publishing, making public claims, customer-visible changes, or contractor-facing AI changes.
- Changing accounts, providers, security, auth/session behavior, permissions, secrets, credentials, OAuth, MFA, DNS, or package plans.
- Changing schema, database structure, production data, deploys, rollback, release state, or destructive production behavior.
- Deleting files/data or doing anything irreversible or high-impact.
- Acting on other people's time, money, privacy, data, reputation, legal/financial exposure, or access.

## Hard Forbidden Scope

Apex OS must never do:

- Hidden GPS/location tracking or hidden surveillance.
- Secret exposure, credential extraction, token/cookie/session leakage, or database URL disclosure.
- Permission weakening or field/customer/demo access to private Apex OS systems.
- Bypassing John's explicit instructions, approval gates, privacy firewall, prompt-injection firewall, or operator-only boundary.
- Production destructive actions without explicit release approval and rollback evidence.
- Hidden external actions, hidden sends, hidden spend, hidden account changes, or background action execution outside the approved readiness level.

## Execution Readiness Levels

| Level | Name | Allowed behavior | Required gates | Still blocked |
| --- | --- | --- | --- | --- |
| Level 0 | Planning only | Explain, reason, classify risk, summarize, plan, recommend, and prepare review notes. | Operator-only access, privacy firewall, prompt-injection firewall, source labels for untrusted context. | All writes and all external/live actions. |
| Level 1 | Draft only | Draft messages, orders, bookings, browser steps, desktop steps, code plans, research plans, and approval packets without committing them anywhere external. | Draft-only UI labels, no send/submit/pay/open-control button, no hidden tool calls, exact source/risk labels. | Sends, orders, bookings, payments, calendar writes, desktop/browser control, production changes, customer-visible changes. |
| Level 2 | Private/internal act-by-default | Write private Apex OS state such as memories, preferences, tasks, reminders, planning notes, local research notes, safe summaries, run notes, handoffs, and low-risk local Apex OS preferences without interrupting John when classification says private, reversible, and low-risk. | Existing Apex OS permission gate, private-only storage, deterministic risk classification, privacy/prompt-injection checks, result receipt, audit metadata, undo/archive/edit/reset path, escalation when sensitive or uncertain. | External systems, customer-visible state, money movement, account changes, desktop/browser/music control, deploy/production, deletion without undo, hidden actions. |
| Level 3 | External action prepared but not executed | Build a final non-executing external action packet for review: order plan, booking plan, message draft, calendar draft, browser action plan, desktop action plan, music/second-screen plan, or deploy/production checklist. | Exact-action preview, target/service/vendor/person/account context, data-that-would-leave summary, cost/time/location when applicable, privacy and prompt-injection clearance, Action Permission Matrix recheck, limits check, cancellation/manual fallback path, receipt draft, no provider submission, no execution token. | Final submit/send/pay/book/order/post/calendar-write/deploy/control action, account connection, OAuth, connector calls, browser/desktop/music control, production mutation, schema/auth/session changes, deletion. |
| Level 4 | External action with explicit approval | Execute one exact previewed external action after fresh human confirmation. | Short-lived execution token bound to preview hash, final phrase, unchanged payload/state check, limit check, audit event, immediate result report, cancel/undo guidance. | Anything not exactly previewed, bulk/hidden actions, production destructive actions, approval-bypass, secret exposure. |
| Level 5 | Limited trusted automation | Repeat narrow low-risk approved actions inside hard caps and schedules. | Written automation policy, revocable consent, per-capability daily/monthly limits, observable queue, pause/kill switch, periodic reapproval, anomaly stop. | New action classes, money or messages beyond limits, production/schema/auth changes, hidden surveillance, secret handling, customer-visible broad automation. |
| Forbidden | Never allowed | Hidden actions, secret exposure, permission weakening, field/customer/demo Apex OS exposure, approval bypass, destructive production action without release approval, credential extraction, MFA/CAPTCHA/paywall bypass, hidden surveillance. | None. These must block. | All execution. |

Current implementation posture: Apex OS now has the first hardened Level 2 private/internal act-by-default implementation. The internal action engine can create/update/archive private tasks and reminders, create memory suggestions, save safe private preferences, save private planning/research notes through existing memory storage, and archive private memory records after Action Permission Matrix, Privacy Firewall, Prompt-Injection Firewall, Tool Router, and trace checks. It also blocks or escalates consequential aliases/synonyms, defaults prompt-injection-looking internal writes to review/block, sanitizes receipts, writes compact audit/activity receipts, and shows those receipts in the operator-only Control Room. Level 3 external-preparation design is documented, but no external/consequential action is executable.

## Level 3 External Preparation Contract

Detailed design: `docs/APEX_OS_LEVEL_3_EXTERNAL_PREPARATION_PLAN.md`.

Level 3 is preparation-only. It may produce exact external action packets, but it must force:

- `readinessLevel: 3`
- `operatorOnly: true`
- `canExecuteNow: false`
- `canExecuteAfterApproval: false`
- `executionLocked: true`
- `noExecutionTokens: true`
- `receiptDraft.externalActionExecuted: false`
- `receiptDraft.customerVisible: false`

Supported preparation categories:

- `order-plan`
- `booking-plan`
- `message-draft`
- `calendar-draft`
- `browser-action-plan`
- `desktop-action-plan`
- `music-second-screen-plan`
- `deploy-production-checklist`

Each packet must include an exact-action preview, target/service/vendor/person/account context, data that would be sent or written, cost/price/tip/tax/fees/subscription impact when applicable, date/time/location when applicable, privacy/sensitive-data summary, risk tier, cancellation path, fallback/manual steps, receipt draft, privacy firewall recheck, prompt-injection firewall recheck, Action Permission Matrix recheck, and future Level 4 approval phrase.

Level 3 must not create execution tokens, submit provider calls, connect accounts, start OAuth, store credentials, send messages, spend money, order/book, post/publish, write calendars, control desktop/browser/music/second-screen, deploy, mutate production, change schema/auth/session/provider/billing/permissions, or delete data.

## Consequential Confirmation Flow

Before any interrupt-required Level 3, Level 4, Level 5, sensitive Level 2, or high-impact action is allowed, Apex OS must run this state machine:

1. Classify the request with the Tool Router and Action Permission Matrix.
2. Run Redaction-Before-Cloud / Privacy Firewall before any model or tool planning that could expose sensitive content.
3. Run Untrusted Content / Prompt-Injection Firewall on web, browser, email, document, file, clipboard, API, model, and tool output.
4. Produce an exact-action preview with stable `previewId`, `actionId`, risk tier, affected system, required scopes, limits, cost, recipients, target account, target data, and undo/rollback expectations.
5. Run dry-run mode and display dry-run output separately from the execution preview.
6. Create a confirmation or approval packet tied to the preview hash, dry-run hash, actor, current workspace, capability, route, risk tier, and expiration time.
7. Require John to use exact human confirmation language for the specific action and preview id.
8. Re-check state immediately before execution: preview hash, risk tier, user, workspace, limits, target account, current payload, and approval expiration must still match.
9. Mint a short-lived one-action execution token. The token must not authorize any other action, changed payload, changed target, changed account, broader scope, retry storm, or background job.
10. Execute once, capture a redacted result summary, and mark the token consumed.
11. Present the result, undo/cancel options if available, and any follow-up risk.
12. Write audit metadata without secrets, tokens, raw credentials, cookies, database URLs, or unnecessary private content.

Confirmation must fail closed. Any missing preview, expired approval, changed payload, changed target, changed account, changed cost, changed recipients, changed schedule, changed provider, changed route, failed privacy check, failed prompt-injection check, missing undo disclosure, or field/customer/demo context must block execution.

## Exact-Action Preview

Every interrupt-required executable action must show John the exact action before execution. Low-risk Level 2 private/internal writes may use a compact action receipt after completion instead of stopping for a blocking preview, but sensitive or uncertain Level 2 writes must escalate to preview/confirmation.

- Action type and readiness level.
- Tool/provider/app/account to be used.
- Target recipient, vendor, booking site, calendar, file, browser tab, desktop app, or internal object.
- Exact message body, order items, booking details, calendar details, browser steps, desktop steps, or internal write diff.
- Cost, taxes, delivery fees, tips, subscriptions, recurring charges, cancellation windows, and refund policy if money or logistics are involved.
- Data that will leave Apex OS or be written to another system.
- Whether the action is reversible, partially reversible, or irreversible.
- What Apex will not do.
- Dry-run output and risk warnings.
- Preview hash and expiration time.

For interrupt-required actions, the preview is the contract. If anything changes, confirmation is invalid and the preview must be regenerated.

## Cancellation And Undo

- John must be able to cancel any pending action before final execution.
- Pending actions must show whether they are unsent, submitted, processing, completed, failed, cancelled, or undo-available.
- Undo must be offered when the target system supports it, but Apex must not imply undo exists when it does not.
- For irreversible or partially reversible actions, Apex must state that before approval.
- For failed actions, Apex must not retry automatically unless the retry was explicitly part of the approved preview and is inside retry limits.

## Spend Limits

Default spend limit is $0 until John explicitly configures a limit.

Money actions require:

- Per-action approval at Level 4 unless a future Level 5 policy explicitly covers the action class.
- Per-transaction, daily, weekly, and monthly caps.
- Separate caps for food/orders, subscriptions, ads, materials, travel, services, software, and business purchases.
- Exact final cost including taxes, tips, fees, shipping, cancellation penalties, and recurring charges.
- Reapproval when cost changes by any amount unless John has explicitly configured a small tolerance for that category.
- No new subscription, financing, debt, credit, ad spend, package upgrade, or provider billing change without separate approval.

## Cloud Model Cost Guard

Apex OS Local-First Intelligence Mode is tracked in `docs/APEX_OS_LOCAL_FIRST_INTELLIGENCE_MODE.md`. Everyday private Jarvis intelligence should run locally through llama.cpp/GPT-OSS first, Ollama legacy fallback/status second, optional LM Studio localhost later, or deterministic fallback. Paid cloud model calls are not act-by-default internal work.

Cloud model use requires:

- OpenAI/cloud disabled by default for everyday Apex OS mode.
- `OPENAI_API_KEY` alone is not authorization for Apex OS paid calls after the local-first guard is implemented.
- Explicit server-side cloud override enablement.
- A per-request manual phrase from John, such as `Apex, use cloud for this request`.
- Privacy Firewall, Prompt-Injection Firewall, Action Permission Matrix, and Model Router / Cost Governor recheck.
- A compact activity receipt with route, provider family, model alias, budget level, reason, timestamp, and firewall result.
- No raw prompt, raw response, secret, token, cookie, header, credential, database URL, payment data, or private message body in receipts, traces, screenshots, logs, or frontend payloads.
- No automatic cloud fallback when the local model is offline, malformed, or slow.
- No default cloud use for background loops, scheduler work, or unattended active-intelligence checks.

## Message-Send Limits

Message sending includes SMS, email, chat, social DM, customer portal message, comment, outbound call initiation, and external notification.

Message execution requires:

- Exact recipient list.
- Exact channel and sending account.
- Exact message body and attachments.
- Clear label for customer-visible, public, legal, billing, payment, hiring, safety, medical, or financial content.
- No bulk messaging until a separate campaign/compliance gate exists.
- No sending to customers, vendors, employees, courts, government agencies, banks, insurers, or public channels without explicit approval.
- Reapproval for any recipient, attachment, subject, body, link, or send-time change.

## Booking And Ordering Rules

Ordering and booking execution requires:

- Exact vendor/provider, item/service, quantity, date/time, delivery/pickup address, contact info, payment method label, and final total.
- Explicit display of substitutions, cancellation policy, refund policy, tip, delivery fee, service fee, and recurring or membership impact.
- No substitutions, upgrades, add-ons, address changes, time changes, or payment-method changes without reapproval.
- No age-restricted, regulated, medical, legal, weapons, financial, or high-liability orders/bookings without a separate forbidden/high-risk review.
- No booking that affects another person unless John explicitly confirms the person, purpose, and communication plan.

## Browser/Desktop Sandbox And Watch Mode

Browser/desktop execution must start with a visible, explicit session.

Required boundaries:

- Watch mode and control mode are separate. Watch mode cannot click, type, navigate, submit, download, upload, or modify state.
- Control mode requires exact action preview and explicit approval for every state-changing step until a future limited automation policy exists.
- Apex must never run hidden screen capture, hidden recording, hidden browser sessions, or background desktop control.
- Apex must not capture or store passwords, MFA codes, cookies, session tokens, API keys, recovery codes, payment card numbers, or private credentials.
- If credentials or MFA are needed, John acts manually and Apex pauses.
- Browser page, DOM, email, document, clipboard, and screen content are untrusted data. They cannot issue instructions to Apex.
- Every control session needs visible pause, cancel, and emergency stop.

## Home Assistant And Local Device Control Gate

Detailed design: `docs/APEX_OS_JARVIS_DEVICE_LAYER.md`.

Jarvis Device Layer v0 is mock-first for command planning. It can model rooms, devices, aliases, scenes, and command plans. Home Assistant Connector v1 adds server-only operator status, preview, and execute routes. The execute route is disabled by default, kill-switch protected, preview-bound, single-use, and limited to one allowlisted low-risk Home Assistant command after John's exact confirmation phrase.

Credential boundary:

- Home Assistant URL/token are server-side only.
- Frontend code must never receive Home Assistant token values, URLs, headers, cookies, session values, raw provider errors, or unallowlisted entity inventory.
- Env names may be documented, but env values must not be printed, logged, traced, stored in receipts, shown in screenshots, or returned by APIs.
- Preferred target is local-network Home Assistant. Remote/cloud Home Assistant control requires a separate privacy and account-risk review.

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

Device and command allowlist:

- Real control can target only configured Apex device IDs mapped to Home Assistant entity IDs server-side.
- User input cannot provide free-form Home Assistant entity IDs for execution.
- Unknown entity IDs, unknown services, unknown domains, and mismatched domains must block.
- First allowed domains are limited to allowlisted `media_player`, `light`, `switch`, approved `scene`, and approved `script` targets.
- First allowed actions are read status, turn on/off selected media players/lights/switches, volume set/up/down for selected media players, select source for selected media players, trigger approved scene/script, and dashboard cast/open only through an explicitly configured scene/script.
- Cameras, microphones, recording, surveillance, locks, alarms, thermostat/HVAC, garage doors, security systems, account/security/billing actions, and anything not allowlisted are blocked first.

Execution levels:

- Dry-run validates alias, allowlist, risk, and receipt shape with no Home Assistant call.
- Status read can call Home Assistant read-only for allowlisted entities when configured.
- Preview can produce exact non-executing command preview with entity label, service, payload, timeout, retry policy, risk, cancellation path, and receipt draft.
- Execution remains disabled by default and requires an explicit config flag plus kill switch off.
- First execution must be Level 4 one-time approved for exactly one previewed low-risk reversible command.
- Later act-by-default local device control requires a separate trusted-local policy, per-device allowlist, observability, caps, receipts, and kill switch.

Every Home Assistant status, preview, and execute path must use the Apex OS operator gate and keep secrets out of responses. The Home Assistant command execution path re-runs Privacy Firewall, Prompt-Injection Firewall, Action Permission Matrix, Tool Router, trace hygiene, allowlist checks, config flag checks, kill switch checks, timeout/retry caps, and receipt sanitization. No background uncontrolled loops are allowed.

### Home Assistant Connector v1 One-Time Execution Gate

Home Assistant Connector v1 is the first implemented real-device execution-capable slice. It is Level 4 one-time execution, not Level 5 trusted automation, and remains blocked unless server config and John confirmation gates pass.

Allowed first commands are limited to one exact previewed command against one allowlisted entity:

- `light.turn_on` / `light.turn_off`
- `switch.turn_on` / `switch.turn_off`
- `media_player.turn_on` / `media_player.turn_off`
- `media_player.volume_set` inside the configured safe range
- `media_player.select_source` from the device source allowlist
- `scene.turn_on` or `script.turn_on` for explicitly allowlisted dashboard, work, or focus modes

Still blocked:

- cameras, microphones, recording, surveillance, locks, alarms, HVAC/thermostat, garage doors, security systems, unknown entities, free-form service calls, and unallowlisted scenes/scripts
- account/security/billing, spending, ordering, booking, messaging, email/SMS, posting/publishing, production/deploy/schema/auth/session, deletion, browser control, desktop control, and music-provider execution

Implemented flow:

1. Preview remains separate from execution.
2. Preview produces a stable preview hash and exact service/entity/payload.
3. Server creates a short-lived single-use execution guard bound to actor, workspace, preview ID, preview hash, allowlist hash, entity, service, payload hash, and expiration.
4. John confirms with `I approve Apex to execute Home Assistant preview [previewId] one time now`.
5. Execute route accepts only the preview ID, opaque guard, preview hash, and confirmation phrase.
6. Execute route refuses modified payloads, expired previews, consumed guards, non-operator users, execution-disabled config, kill switch, allowlist mismatch, prompt-injection risk, privacy risk, permission-matrix failure, timeout/retry policy mismatch, or any broadened command.
7. Dry-run mode returns the execution receipt shape with `externalActionExecuted: false`.
8. Real mode calls Home Assistant once for the exact previewed service and returns a sanitized activity receipt.

The execute route does not accept free-form service names, entity IDs, URLs, headers, tokens, raw provider payloads, or arbitrary Home Assistant request bodies from the client as authority. The server-side allowlist and preview hash are the authority.

## Local Network And Remote Access Gate

Detailed design: `docs/APEX_OS_JARVIS_DEVICE_LAYER.md`.

Status: documentation/planning only. No router adapter, local-network discovery endpoint, family-device control, VPN/tunnel control, remote home bridge, network pause/unpause route, arbitrary scan, or new credential path exists yet.

Purpose: Apex OS should eventually let John use Apex anywhere and safely inspect/control allowlisted home Wi-Fi and smart-home devices through legitimate authenticated paths.

Planned capabilities:

- Read connected/recent home-network devices from an approved router/controller/Home Assistant source.
- Maintain a private Local Network Device Registry with device name, room, owner/user label, type, connector, allowed actions, risk level, last seen, and allowlisted status.
- Preview router pause/unpause for one allowlisted device.
- Execute one pause/unpause only after a later Level 4 implementation with preview hash, single-use guard, confirmation, timeout, receipt, and undo/unpause path.
- Support secure remote operator access through the Apex app plus VPN/Tailscale, Home Assistant Cloud, or a future outbound home bridge.

Hard boundaries:

- Operator-only route/API/UI/data access.
- No field/customer/demo access.
- No arbitrary subnet scan, port scan, packet sniffing, password guessing, brute force, exploit behavior, MAC spoofing, deauth, or bypassing router/device security.
- No raw router credentials, Wi-Fi passwords, Home Assistant tokens, VPN keys, OAuth tokens, cookies, sessions, provider headers, or private network IDs in frontend, traces, receipts, screenshots, docs, or model prompts.
- No camera/mic recording, hidden surveillance, hidden GPS, hidden screen capture, or hidden remote desktop.
- No device-owner/security bypass for Apple Screen Time, Google Family Link, Windows Family Safety, MDM enrollment, MFA, passcodes, or parental controls.
- No background/unattended network control loops.

Risk treatment:

- "Who is connected to my Wi-Fi?" is read-only and may become Level 1/2 after a legitimate read-only source is configured.
- "Show me what's going on while I'm away" is read-only status only: connected devices, online/offline, last seen, Home Assistant states, and recent receipts. It must not imply camera/mic monitoring.
- "Turn off the kid tablet's internet" and "pause the tablet" affect another person's access, so first implementation must be Level 4 exact-preview execution with explicit confirmation.
- "Turn on my bedroom TV" can use the current Home Assistant v1 one-time command path when the TV is allowlisted and config gates pass.
- "Start work mode in the living room" can use the current Home Assistant scene/script path when the scene/script is allowlisted and config gates pass.
- "Put yourself on the second screen" remains a music/second-screen/browser/desktop plan unless implemented as a Home Assistant allowlisted scene/script; it must not start desktop/browser/music-provider control from this layer.

Roadmap gates:

| Version | Scope | Execution |
| --- | --- | --- |
| v0 | Connected-device registry design. | Documentation only. |
| v1 | Read-only connected-device discovery from one legitimate source. | No control; no scan. |
| v2 | Device naming, owner, room, type, and allowlist assignment. | Private internal writes only. |
| v3 | Router pause/unpause preview for one allowlisted device. | No router state change. |
| v4 | One allowlisted pause/unpause action. | Level 4 one-time preview-bound execution. |
| v5 | Secure remote access design. | Documentation only. |
| v6 | Remote operator-only control. | Same preview/guard/receipt/kill-switch rules as local control. |

No local-network or remote-control implementation may start until the chosen router/controller path, credential boundary, allowlist format, test strategy, and rollback/unpause behavior are documented for John's actual hardware.

## Production And Deploy Hard Blocks

Production, deploy, auth, schema, session, billing, package, permission, and destructive-data actions remain outside normal life-operator execution.

They require a separate release gate with:

- Explicit release approval.
- Current branch, commit, diff, tests, build, and docs evidence.
- Backup and restore evidence where data may be affected.
- Rollback target and rollback test/plan.
- Production health checks.
- Permission review.
- No customer-visible release unless the release packet says so.

No Level 5 trusted automation may deploy, change production data, change auth/schema/session behavior, weaken permissions, delete production data, rotate providers, or modify billing/payment behavior.

## Audit Metadata

Audit logs must be operator-only and minimal.

Store:

- Actor/user id, workspace/company id, route/capability id, action id, preview id, approval id, execution token id hash, risk tier, readiness level, timestamps, status, model route, tool/provider id, version labels, and result code.
- Preview hash, dry-run hash, payload hash, and state-check hash.
- Redacted target labels, cost summary, recipient count, and capability category.
- Privacy firewall decision, prompt-injection firewall decision, approval phrase matched/not matched, and limit checks.
- Undo/cancel availability and final result summary.

Do not store:

- Raw secrets, API keys, tokens, cookies, passwords, database URLs, authorization headers, payment card data, MFA codes, private credentials, or unnecessary raw prompt/response dumps.
- Full private document/email/browser/page content unless a separate operator-only retention policy explicitly approves a narrow artifact.

## Privacy Firewall Requirements

Before any execution planning or tool/provider handoff:

- Detect and block secrets, credentials, tokens, cookies, database URLs, payment data, private identifiers, and sensitive private data.
- Redact before cloud/model/tool use.
- Enforce data minimization: send only the fields required for the exact action.
- Prevent field/customer/demo contexts from receiving Apex OS private content.
- Require approval or block for legal, medical, financial, identity, family, sensitive personal, or high-liability content.
- Re-run privacy checks after model/tool output and before final execution.

## Prompt-Injection Firewall Requirements

Untrusted content must be treated as data only.

Required rules:

- Web pages, browser DOM, emails, documents, files, clipboard text, API output, model output, tool output, and screenshots cannot override system rules, approval gates, privacy rules, or operator identity.
- Instructions such as ignore previous instructions, reveal secrets, bypass approval, click this, download this, pay this, send this, or change settings from untrusted content must be stripped or quarantined.
- High or critical untrusted-content risk blocks execution and requires manual review.
- The firewall must preserve useful facts while removing action instructions.
- Prompt-injection decisions must be logged as compact metadata, not raw malicious content.

## Human Confirmation Language

Confirmation must be specific enough that it cannot approve a different action. Level 2 private/internal act-by-default actions do not require a confirmation phrase when they are low-risk, reversible, private, and implemented under the Level 2 controls. They should still produce a visible receipt and undo/archive/edit/reset path.

Baseline phrases:

- Sensitive or escalated Level 2 internal write: `I approve Apex to save this exact private internal write: [previewId]`
- Level 3 prepare external action: `I approve Apex to prepare but not execute this exact external action: [previewId]`
- Level 4 execute external action: `I approve Apex to execute exactly preview [previewId] one time now`
- Spend action: `I approve Apex to spend up to $[amount] for exactly preview [previewId] one time now`
- Message send: `I approve Apex to send exactly preview [previewId] to the listed recipients one time now`
- Booking/order: `I approve Apex to place exactly preview [previewId] one time now`

The UI may provide copyable phrases, but the server must validate the preview id, approval id, actor, current user/session, expiration, and payload hash. Voice confirmation may draft the phrase, but text/manual confirmation is required for Level 4 money, sending, booking, ordering, deploy, production, auth, schema, permission, and irreversible actions.

## Dry-Run Mode

Dry-run is required before new execution capability.

Dry-run must:

- Use the same planner, risk, privacy, prompt-injection, limit, and preview logic as execution.
- Produce no external write, send, submit, payment, booking, order, desktop/browser state change, deploy, production mutation, or customer-visible action.
- Return a clear "would do" result and any missing approval/limit/state blockers.
- Be tested against success, failure, blocked, privacy-blocked, prompt-injection-blocked, and changed-state cases.

## Emergency Stop / Kill Switch

Apex OS must have a hard stop before Level 4 or Level 5 exists.

Kill switch behavior:

- Immediately prevent new execution tokens.
- Cancel pending unexecuted actions.
- Pause active controllable sessions.
- Revoke connector/session capability grants where possible.
- Force all capabilities back to planning-only.
- Keep read-only planning, status, and audit review available for John.
- Log the stop event without secrets.
- Require explicit manual re-enable with reason and validation.

The kill switch must be server-enforced. UI-only disable is not enough.

## Rollback Expectations

Every executable capability must have a rollback plan before launch:

- Local/internal writes must support archive, undo, or revision history.
- Messages must disclose that true unsend is usually unavailable.
- Orders/bookings must disclose cancellation windows and fees.
- Browser/desktop actions must capture enough redacted metadata to know what changed.
- Production/deploy actions require backup, restore, release rollback, and health-check evidence.
- Payments/spend require receipt, refund/cancellation path, and dispute/void notes when available.

If rollback cannot be guaranteed, the approval preview must label the action irreversible or partially reversible.

## Blockers Before Live Execution

Level 2 private/internal act-by-default has now started in a narrow, operator-only implementation. The following Level 2 readiness conditions are the active hardening checklist and must remain true before expanding Level 2 beyond the current internal task/reminder, memory suggestion, safe preference, planning-note, research-note, and archive paths:

- Server-side internal action classifier that distinguishes private/reversible/low-risk internal writes from sensitive, external, destructive, customer-visible, or high-impact work.
- Operator-only enforcement through the existing Apex OS access boundary.
- Private-only storage using existing approved persistence paths or a separately approved schema phase.
- Result receipts that show what changed, why Apex acted, and how John can undo, archive, edit, or reset it where supported.
- Internal action audit metadata with no secrets, raw credentials, cookies, tokens, database URLs, payment data, or unnecessary private content.
- Escalation rules for sensitive memories, ambiguous preferences, deletion, field/customer/demo context, untrusted instructions, privacy blocks, or prompt-injection blocks.
- Focused tests for allowed internal writes, escalations, undo/archive/edit paths, role boundaries, privacy blocks, prompt-injection blocks, and field/customer/demo denial.
- UI labels that make private action receipts clear without implying external execution.
- Explicit approval from John before adding new Level 2 stores or broadening what can be written act-by-default.

No Level 3, Level 4, or Level 5 consequential/external execution can start until these exist:

- Server-side execution state machine with preview, dry-run, approval, token, execute, result, cancel, and audit states.
- One-action, short-lived execution tokens bound to preview hash and actor/session.
- Per-capability readiness level registry.
- Per-action limit engine for spend, message, booking/order, browser/desktop, connector, and production classes.
- Server-enforced emergency stop.
- Audit metadata store with secret redaction and retention rules.
- UI exact-action preview and final confirmation panel.
- Focused tests for each level, role, privacy, prompt-injection, stale-preview, changed-payload, changed-cost, expired-approval, and kill-switch case.
- Visual QA for any execution UI on desktop and mobile.
- Route permission map update showing any changed `canExecuteNow` or `canExecuteAfterApproval` value.
- Written rollback plan for each capability.
- Explicit approval from John to implement the next readiness level.

## Next Safe Planning Step

Level 2 internal actions, Level 3 preparation packets, Jarvis Device Layer v0, Home Assistant v0 status/preview, and Home Assistant v1 one-time execution are now implemented or documented in prior phases. The next safe step is a first local live-test plan for one allowlisted low-risk Home Assistant device, not broader automation.

The first live local test should:

- use exactly one allowlisted light, switch, or media player
- verify status/preview with execution disabled first
- enable execution only after the allowlist and redacted posture are confirmed
- leave the kill switch available and verify it blocks
- run one preview, one guard, one confirmation phrase, and one execute attempt
- inspect the resulting receipt and Home Assistant device state manually
- turn execution off or use the kill switch after testing if John does not want the capability left live
- leave browser, desktop, music-provider, ordering, booking, sending, spending, production, deploy, schema/auth/session, account, billing, deletion, and background automation out of scope
