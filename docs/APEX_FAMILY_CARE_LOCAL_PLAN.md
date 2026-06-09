# Apex Family Care Local Plan

Last updated: 2026-06-09

Status: local source-of-truth plan. This is Apex private life-operator work, not Apex HQ customer/product work.

## Mandatory Family Care Startup Rule

Every Apex Family Care build turn must start by reading this file before planning or editing. This file is the local memory that survives context compaction.

The builder must confirm:

- the Boundary Rule
- the North Star
- the current `Current Next Step`
- completed/frozen phases
- the Continuation Rule
- the Foundation Follow-Up Roadmap
- privacy/safety rules
- what deferred work belongs later instead of in the current phase

The builder must not start random work just because an idea sounds useful. If John does not explicitly override the plan, work starts from `Current Next Step`.

Before closing any phase, the builder must update this file with:

- completed checklist items
- validation evidence or receipt
- any new deferred follow-up work
- the next unchecked phase

This rule exists so future Family Care work does not depend on chat memory, compacted context, or a builder trying to remember the plan from a previous turn.

## Active Build Loop Goal

Family Care is now a planned build loop, not a one-off feature pass.

The builder should continue in this order:

1. Read this file at the start of each Family Care turn.
2. Build the phase named in `Current Next Step`.
3. Validate the phase with focused tests and any relevant browser checks.
4. Update this plan with completed checklist items, receipt evidence, deferred follow-up work, and the next unchecked phase.
5. Commit only Family Care-owned files for that completed phase.
6. Move to the next unchecked foundation phase.
7. After Phase 7 is completed, cycle back through the follow-up roadmap phases, starting with the earliest useful follow-up such as Phase 1A, 2A, 3A, 3.5A, 4A, 5A, 6A, or 7A.
8. Continue this loop until the Family Care plan has no remaining unchecked work, or until a safety/approval blocker requires John.

The builder must not treat this loop as permission to broaden scope, rebuild frozen work, touch Apex HQ product/customer work, change schema/auth/session, deploy, expose secrets, send SMS/email/push messages, add cloud fallback, or add hidden recording.

If the builder discovers a better idea while building, it must pass the Idea Filter, then either fit inside the current phase or be added to the Foundation Follow-Up Roadmap for later. Do not silently change the phase order.

John override (2026-06-09): do not keep the active builder trapped trying to finish Phase 7 before continuing the foundation. Phase 7's real family test week stays open as a validation track, but active building loops back through Phase 1A, 2A, 3A, 3.5A, 4A, 5A, 6A, and 7A in small slices. Each slice still updates this plan, validates, and commits only Family Care-owned files.

## Loop-Back Rule

Phase 7 is not the finish line. Phase 7 closes only the first real-world validation lap after one real family test week is run and reviewed.

The active build loop must now cycle through the earliest useful follow-up slices instead of stopping or getting stuck polishing Phase 7 forever:

1. Phase 1A - Family Access And Install Hardening.
2. Phase 2A - Care Review And Doctor-Prep Polish.
3. Phase 3A - Apex Care Coordinator Loop.
4. Phase 3.5A - Standalone Boundary Release Prep.
5. Phase 4A - Real Local Voice Input, only when the workflow is ready.
6. Phase 5A - Real Notification Delivery, only after approval for real sends/providers.
7. Phase 6A - Household Device Voice And Presence.
8. Phase 7A - Family Test Week Improvements.

When that follow-up lap reaches the end, the builder must loop again through any remaining or newly added versioned slices, such as Phase 1B, 2B, 3B, and so on. Each slice must still be small, validated, committed, and aligned with the North Star. Better and better is the point; random broader building is not.

The builder must not mark Phase 7 complete without the real family test week evidence. That evidence track remains open while infrastructure slices continue.

## Boundary Rule

Apex Family Care is its own private family PWA. It is Apex-powered, but it is not Apex HQ, not a contractor app module, and not a page family members should reach through John's business app or private Apex cockpit.

Apex is the behind-the-scenes intelligence that can operate Family Care, just like Apex can operate Apex HQ. The apps stay separate.

Family Care must have:

- its own direct PWA entry
- its own PWA metadata/manifest
- family-facing copy
- no Apex HQ contractor/customer/field navigation
- no Apex private operator cockpit dependency for family use

The current repo may reuse shared code, helpers, tests, and build tooling, but the user-facing Family Care app boundary is separate.

## North Star

Apex Family Care exists to make Grandma's care easier on the family, especially Dad and Brother, without turning care into another chore.

The system must reduce repeated "what is going on?" texts, help Dad prepare for doctor appointments, keep adult kids calmly informed, and protect Grandma's dignity and independence.

If a feature makes the family type more, manage more, or feel watched instead of helped, it is off track.

## Idea Filter

New ideas are welcome, but they only belong in the active plan when they make Family Care easier, calmer, safer, or more useful for the real family care loop.

An idea should move forward only if it helps at least one of these:

- Dad has less explaining to do.
- Brother can log or check care status faster.
- Grandma stays respected and not watched.
- Adult kids can understand what matters without a text-message pileup.
- Doctor prep gets clearer.
- Apex notices useful gaps without nagging or panicking.

An idea should be deferred or rejected if it adds chores, exposes private details, creates surveillance, mixes in Apex HQ/business data, sends messages without approval, or tries to solve live voice before the app workflow is ready.

## One-Sentence Product Shape

Apex Family Care is a private family-only PWA and care domain that Apex can operate: it captures quick tapped/typed updates now, stays ready for voice later, organizes care memory, prepares doctor summaries, creates family digests, and watches the care loop for missing or concerning patterns.

## What This Is Not

- Not Apex HQ contractor/customer-facing product work.
- Not a medical diagnosis tool.
- Not an emergency-care replacement.
- Not surveillance.
- Not hidden recording.
- Not a generic group chat.
- Not another place Dad has to manually write long updates.

## Success Test

After one real family test week, the answer should be yes to most of these:

- Did Dad have to explain less?
- Did siblings feel more informed?
- Did doctor prep get easier?
- Did Grandma still feel respected?
- Did Dad/Brother add updates in under 10 seconds?
- Did Apex notice useful missing items or patterns without spamming everyone?

If not, simplify the system until it helps.

## Core Experience

Dad, Brother, Grandma, or a family member should be able to interact with Apex Family Care through:

- An installable PWA on phones.
- A simple tablet or old phone at the house.
- Big buttons for common updates.
- Voice-ready note capture later, after the app workflows are useful.
- Notifications that are calm, useful, and private.

The eventual voice interaction should feel like:

```text
Apex, log that Grandma's knee hurt after lunch.
```

or:

```text
Tap: Pain
Tap: Medium
Tap: Add to doctor summary
```

## Apex's Job

Apex is the care coordinator behind the scenes. Apex should:

- turn voice/tap updates into clean care notes
- ask at most one useful follow-up when needed
- prepare doctor summaries
- prepare family summaries
- notice missing updates
- notice repeated patterns
- keep sensitive details out of lock-screen notifications
- report system health issues
- keep this domain separate from Apex HQ and other Apex private domains

## Family Access Rule

Family Care is family-only. Everyone approved by John/family can see the family care context according to the chosen family visibility rules, but nobody outside the family gets access.

Initial access should be simple for non-technical family:

- installable PWA
- invite/family code or simple family login
- big-button interface
- minimal setup burden

Future access can add stronger pairing or device trust, but it must not make Dad/Brother/Grandma fight technology.

## Privacy And Safety Rules

- No hidden microphone capture.
- No raw audio storage by default.
- No raw transcript oversharing by default.
- No medical diagnosis or treatment instructions.
- No emergency replacement claims.
- No camera surveillance.
- No public/demo/customer/field access.
- No Apex HQ business data mixed into family care data.
- No secrets in frontend code, receipts, logs, summaries, or notifications.
- Notifications should avoid sensitive medical details on lock screens.
- Doctor summaries are practical family notes, not clinical conclusions.

## Data To Capture

Keep data structured and useful:

- note category: pain, meds, food, sleep, mood, mobility, appointment, concern, general
- timestamp
- reporter
- subject: Grandma
- short summary
- optional severity: mild, medium, severe, unknown
- optional body area
- optional medication/appetite/sleep/mobility tags
- add-to-doctor-summary flag
- family-visible flag
- urgent/concern flag

Do not store raw audio. Do not store private rambling when a compact care note is enough.

## Core Screens

- Today
- Kitchen Mode
- Add Update
- Care Timeline
- Doctor Summary
- Family Summary
- Notifications / Settings
- Family Test Week
- Family Access
- Apex System Health

## Core Buttons

- Good / Normal
- Concern
- Pain
- Meds
- Food / Appetite
- Sleep
- Mood
- Mobility
- Appointment Note
- Add To Doctor Summary

## Notification Standard

Notifications should be low-noise and useful.

Good notification examples:

- New Grandma update.
- Doctor summary is ready.
- Concern was marked.
- No update today. Check when convenient.

Avoid:

- notification for every small note
- sensitive medical detail on lock screens
- panic language unless a family member marks an urgent concern

## Continuation Rule

When a phase intentionally defers part of the idea, the deferred work must be written into this plan before the phase is considered closed. Future builders should not have to remember chat context or guess what comes later.

Completed phases stay frozen. Follow-up phases extend the foundation; they do not rebuild completed work unless there is a bug, safety issue, privacy issue, or John explicitly starts a versioned improvement.

## Foundation Follow-Up Roadmap

These are the already-known later steps from the foundation work completed so far. They are not current work unless `Current Next Step` points at them.

### Phase 1A - Family Access And Install Hardening

Purpose: turn the local standalone PWA foundation into a simple family-only entry that non-technical family members can actually open and trust.

- Add a simple family access model: family code, invite, or trusted-device pairing.
- Add a direct install/open flow for phones and a house tablet/old phone.
- Decide local-only, private LAN, or private remote access before any real family rollout.
- Keep Family Care separate from Apex HQ routes, nav, permissions, and cockpit access.
- Add tests proving family access does not expose Apex HQ, Apex private operator, customer, field, demo, or business data.

Do later when: the app is ready for real family testing beyond John's local machine. Any auth/session/production exposure requires explicit approval first.

### Phase 2A - Care Review And Doctor-Prep Polish

Purpose: make the existing care notes and summaries easier to review before a real doctor appointment or family update.

- Add edit/archive/review states for mistaken notes.
- Add timeline filters by category, reporter, concern, and doctor-summary flag.
- Add doctor-summary copy/print/export flow with practical family-note language only.
- Add a doctor-visit prep checklist so Dad can walk in with useful context.
- Keep diagnosis, treatment advice, emergency claims, and raw transcript/audio storage blocked.

Do later when: basic notes and summaries are being used enough that cleanup, review, and appointment prep matter.

### Phase 3A - Apex Care Coordinator Loop

Purpose: let Apex operate the Family Care domain more usefully after the data model proves itself.

- Add a daily care status review packet.
- Add open-concern prompts that suggest what to check next without sending messages automatically.
- Add missing-detail prompts for doctor prep, with human review.
- Add medication-confirmation review only; never medication control, dosing, or treatment instructions.
- Keep receipts metadata-only with no raw prompts, raw responses, secrets, raw audio, or raw transcripts.

Do later when: Family Care has enough real notes for Apex's care coordinator behavior to be useful.

### Phase 3.5A - Standalone Boundary Release Prep

Purpose: decide how the standalone Family Care PWA should be made available without drifting back into Apex HQ.

- Keep `family-care.html`, the Family Care manifest, and the direct PWA entry separate.
- Decide whether production should continue to 404 Family Care or whether a private family-only release path is approved.
- Add deployment/hosting/access notes only after the family access model is approved.
- Keep Apex HQ business app navigation and permissions free of Family Care.

Do later when: John is ready to move from local-only proof to a private family-access release path.

### Phase 4A - Real Local Voice Input

Purpose: add real spoken input only after the Family Care app itself works and has a clear place for voice updates to land.

- Connect a visible, user-started local STT path only after the app workflows are useful.
- Use push-to-talk or an obvious listening state; no hidden/background microphone capture.
- Store no raw audio and do not store raw transcript receipts.
- Keep one-follow-up behavior from Phase 4.
- Add visible stop/mute/recover controls for household use.
- Keep cloud STT, browser SpeechRecognition, OpenAI/Groq fallback, and auto-listening blocked unless John explicitly starts a later approved voice phase.

Status: Phase 4A local session control is complete. The actual Family Care-specific local STT endpoint stays approval-gated and moves to Phase 4B.

### Phase 4B - Approved Family Local STT Bridge

Purpose: connect the Family Care voice screen to an approved local STT bridge without adding hidden capture or Apex HQ dependency.

- Choose the Family Care-specific local STT bridge and endpoint boundary.
- Keep start/stop/mute/recover visible during every voice state.
- Require explicit user start for each listening session.
- Keep raw audio storage/upload, raw transcript receipts, cloud STT, browser SpeechRecognition, OpenAI/Groq, and auto-listening blocked.
- Add local endpoint tests only after John approves the bridge.

Do later when: John approves the local STT bridge boundary for Family Care specifically.

### Phase 5A - Real Notification Delivery

Purpose: connect actual delivery after Phase 5 proves the notification brain and safe-copy rules.

- Choose delivery method: PWA push, device notification, local house device, SMS, or email.
- Require approval before SMS/email/cloud/provider setup or any real sends.
- Keep lock-screen copy generic and private-safe.
- Add opt-in, quiet hours, device trust, and family recipient controls.
- Add tests that sensitive note details never leak into lock-screen or provider payloads.

Status: Phase 5A local house-device in-app delivery is complete. External push/device/SMS/email/provider delivery stays approval-gated and moves to Phase 5B.

### Phase 5B - Approved External Notification Delivery

Purpose: add real external notification delivery only after John approves the channel, recipients, provider, and family access model.

- Choose the approved external delivery channel: PWA push, device notification, SMS, or email.
- Add exact provider/device setup only after approval.
- Keep opt-in, quiet hours, device trust, and family recipient controls.
- Keep lock-screen/provider payload copy generic and private-safe.
- Add provider payload tests before any live sends.
- Keep raw note text, sensitive medical detail, raw audio, raw transcripts, secrets, cloud fallback, schema/auth/session changes, public/customer/field exposure, and deploys blocked unless explicitly approved.

Do later when: John approves the exact external channel and provider/device boundary.

### Phase 6A - Household Device Voice And Presence

Purpose: make the kitchen/tablet/Raspberry Pi style experience useful after the basic kitchen mode exists.

- Decide the first real household device.
- Add always-visible mute/stop status.
- Add offline/online health checks for the house device.
- Add local voice only if Phase 4A is ready and safe.
- Avoid camera surveillance, hidden recording, and automatic emergency claims.

Status: Phase 6A household device presence and voice-readiness is complete. Actual Raspberry Pi/local satellite/approved local STT bridge/device integration moves to Phase 6B.

### Phase 6B - Approved Household Device Integration

Purpose: connect a real household device beyond the standalone PWA only after the family approves the device path and the app has proven useful.

- Choose whether the house tablet/old phone PWA is enough or whether a Raspberry Pi/local satellite is actually needed.
- Add only the approved local device bridge after John approves the device boundary.
- Keep visible mute, stop/recover, and explicit voice start on every household device path.
- Keep the local STT bridge approval-gated by Phase 4B until John approves it.
- Keep hidden recording, camera surveillance, network scanning, device OS control, raw audio/transcript storage, cloud, sends, schema/auth/session changes, deploys, and Apex HQ exposure blocked.

Do later when: John approves a real household device bridge beyond the current tablet/old phone PWA presence lane.

### Phase 7A - Family Test Week Improvements

Purpose: use real family feedback to simplify instead of piling on features.

- Review whether Dad had to explain less.
- Review whether siblings felt informed without spam.
- Review whether doctor prep got easier.
- Remove or simplify anything that felt like another chore.
- Freeze what worked and write the next versioned improvement list.

Status: gated. Do not build Phase 7A improvements until one real family test week is complete and reviewed. Per John's loop-back override, continue the active foundation loop through the next useful non-approval slice instead of guessing test-week improvements.

## Build Checklist

### Phase 0 - Plan Lock

- [x] Save local source-of-truth plan.
- [x] Use this file as the first-read file for every Apex Family Care build prompt.
- [x] Do not mix Family Care work with Apex core runtime/model/voice Builder threads.
- [x] Add mandatory startup and idea-filter rules for future compacted-context turns.
- [x] Add active build-loop goal so foundation and follow-up phases keep moving without chat-memory guessing.

Done means: this plan exists locally and future work starts here.

### Phase 1 - PWA Foundation

- [x] Create private family care domain/module.
- [x] Add installable PWA route/shell.
- [x] Add Today screen.
- [x] Add Add Update screen.
- [x] Add Care Timeline screen.
- [x] Add Doctor Summary screen.
- [x] Add Family Summary screen.
- [x] Add family-only access gate plan or implementation.
- [x] Add tests for import/routing/access boundaries.

Done means: family can open/install the PWA and enter simple updates without Apex voice.

Phase 1 receipt (2026-06-09): added the private `familyCare` route at `/family-care`, local care-note domain helpers, Today/Add Update/Timeline/Doctor Summary/Family Summary/Settings/Family Access/Apex Health screens, private Apex OS route gating, mobile Apex operator nav entry, and focused import/routing/access tests. Focused validation: `node --test --test-concurrency=1 shared/apexFamilyCare.test.js shared/permissions.test.js src/app-routing.test.js src/navigation-utils.test.js src/mobile-nav-utils.test.js src/app-navigation-components-import.test.js src/apex-family-care-components-import.test.js` passed 73/73. Repo validation: `npm.cmd run verify:roles` passed 15/15, `npm.cmd run verify:server` passed 41/41, `npm.cmd run verify:docs` passed, `npm.cmd run build` passed with existing large chunk warnings, and `git diff --check` passed with existing CRLF warnings. Browser check: `/family-care` is protected when logged out, renders for the local private operator session, saves a local update without Apex voice, and fits desktop/mobile Apex operator shell navigation.

### Phase 2 - Care Data And Summaries

- [x] Add care note data model.
- [x] Add care note create/list/update helpers.
- [x] Add doctor-summary builder.
- [x] Add family-summary builder.
- [x] Add missing-update detector.
- [x] Add pattern detector for repeated concerns.
- [x] Add focused tests for all care summary helpers.

Done means: notes become useful doctor/family summaries without raw audio or medical claims.

Phase 2 receipt (2026-06-09): added an explicit compact care-note model, create/list/add/update helpers, richer doctor and family summary builders, private-safe missing-update detection, repeated concern pattern detection, and Today/Doctor/Family/Health UI surfaces for those signals. This phase stays local-only and stores no raw audio, raw transcripts, prompts, secrets, customer data, diagnosis, treatment instructions, emergency claims, schema changes, auth/session changes, deploys, cloud fallback, or Apex HQ customer-facing exposure. Focused validation: `node --test --test-concurrency=1 shared/apexFamilyCare.test.js src/apex-family-care-components-import.test.js shared/permissions.test.js src/app-routing.test.js src/navigation-utils.test.js src/mobile-nav-utils.test.js src/app-navigation-components-import.test.js` passed 78/78. Repo validation: `npm.cmd run verify:roles` passed 15/15, `npm.cmd run verify:server` passed 41/41, and `npm.cmd run build` passed with existing large chunk warnings. Browser check: `/family-care` renders Care Signals on desktop and mobile in the private operator session, with the Family Care mobile nav still visible.

### Phase 3 - Apex Care Brain Integration

- [x] Add Apex internal interface for Family Care.
- [x] Support `logCareNote`.
- [x] Support `getTodayCareStatus`.
- [x] Support `buildDoctorSummary`.
- [x] Support `buildFamilyDigest`.
- [x] Support `listOpenConcerns`.
- [x] Support `markMedicationConfirmed` only as confirmation, not medication control.
- [x] Add Apex receipts with no raw prompt/response/audio storage.

Done means: Apex can operate the Family Care domain through a clean internal interface.

Phase 3 receipt (2026-06-09): added the local-only Apex Family Care brain interface with `logCareNote`, `getTodayCareStatus`, `buildDoctorSummary`, `buildFamilyDigest`, `listOpenConcerns`, and medication-confirmation-only `markMedicationConfirmed`. Receipts stay compact and metadata-only with no raw prompts, raw responses, raw audio, raw transcripts, secrets, customer data, cloud use, diagnosis, emergency replacement claims, or medication-control behavior. The existing Apex System Health screen now surfaces a compact brain-ready signal and medication-control-off guard without adding a dashboard, voice capture, server route, schema, auth/session, deploy, or Apex HQ customer/product exposure. Focused validation: `node --test --test-concurrency=1 shared/apexFamilyCare.test.js shared/apexFamilyCareBrain.test.js src/apex-family-care-components-import.test.js shared/permissions.test.js src/app-routing.test.js src/navigation-utils.test.js src/mobile-nav-utils.test.js src/app-navigation-components-import.test.js` passed 85/85.

### Phase 3.5 - Family Care PWA Boundary Split

- [x] Add explicit boundary rule: Family Care is its own PWA, not Apex HQ.
- [x] Add standalone Family Care HTML entry.
- [x] Add separate Family Care PWA manifest/metadata.
- [x] Mount Family Care without booting the Apex HQ app shell.
- [x] Remove Family Care from Apex HQ/App workspace navigation.
- [x] Remove Family Care from Apex OS/private operator mobile navigation.
- [x] Remove Family Care from Apex HQ module permissions/routing.
- [x] Keep Apex brain/domain helpers reusable behind the app.
- [x] Keep standalone route local-only until family access is explicitly designed.
- [x] Add tests that prevent Family Care from drifting back into Apex HQ.

Done means: family can open/install Family Care directly as its own local PWA boundary, while Apex remains the behind-the-scenes brain and Apex HQ remains separate.

Phase 3.5 receipt (2026-06-09): corrected the Family Care boundary so it is Apex-powered but not an Apex HQ/customer/contractor module and not a page family members reach through John's business app or private Apex cockpit. Added standalone `family-care.html`, `src/family-care-main.jsx`, and `public/family-care.webmanifest`; removed Family Care from Apex HQ/App routing, desktop navigation, mobile operator navigation, and module permissions; kept the care-note, summary, and Apex brain helpers reusable behind the standalone app; and made the server serve Family Care only outside production while production explicitly 404s the Family Care route/manifest. Focused validation passed 90/90. Repo validation: `npm.cmd run verify:roles` passed 15/15, `npm.cmd run verify:server` passed 42/42, `npm.cmd run verify:docs` passed, `npm.cmd run build` passed and emitted `dist/family-care.html`, and `git diff --check` passed with CRLF warnings only.

### Phase 4 - Voice-First Entry

- [x] Add voice note flow from Apex.
- [x] Add one-follow-up limit for unclear notes.
- [x] Add push-to-talk or visible listening mode for household device/tablet.
- [x] Add fallback typed/tap entry.
- [x] Add no-hidden-recording tests/receipts.

Done means: Dad/Brother/Grandma can speak short updates and Apex turns them into structured notes.

Phase 4 receipt (2026-06-09): added a standalone Family Care Voice Update screen and Today shortcut. The flow starts quiet, requires a visible user action, accepts recognized spoken words or typed fallback text, turns the update into a compact structured care note, asks at most one follow-up for unclear notes, and saves metadata-only voice receipts. This is voice-ready structure, not live mic/STT capture; real local voice input is deferred to Phase 4A after the app workflows are useful. No browser microphone auto-start, hidden/background recording, raw audio storage, raw transcript receipts, cloud STT, browser SpeechRecognition, fetch path, schema/auth/session change, deploy, customer/field/demo exposure, medical diagnosis, emergency replacement claim, or Apex HQ route/nav reintegration was added. Focused validation: `node --test --test-concurrency=1 shared/apexFamilyCare.test.js shared/apexFamilyCareBrain.test.js shared/apexFamilyCareVoice.test.js src/apex-family-care-components-import.test.js src/pwa-config.test.js shared/permissions.test.js src/app-routing.test.js src/navigation-utils.test.js src/mobile-nav-utils.test.js src/app-navigation-components-import.test.js` passed 95/95.

### Phase 4A - Real Local Voice Input

- [x] Add visible local-STT input session contract.
- [x] Require explicit user start before any listening state.
- [x] Add visible stop, mute, recover, and done controls.
- [x] Keep the Family Care local STT endpoint disabled and approval-required.
- [x] Keep typed/visible-transcript fallback available.
- [x] Keep raw audio storage/upload, raw transcript receipts, hidden/background recording, cloud STT, browser SpeechRecognition, OpenAI/Groq, and auto-listening blocked.

Done means: Family Care has the safe visible local voice session boundary ready, but no hidden mic capture or approved local STT endpoint is turned on yet.

Phase 4A receipt (2026-06-09): added a Family Care local voice input policy/session helper, explicit-start session controls, and metadata-only local voice session receipts. The Voice Update screen now shows Local STT Bridge status, endpoint approval-required state, visible Stop Listening, Mute Voice Input, Recover To Quiet, and Done Talking / Review controls, while the Health view shows Family local STT, Family voice auto-listen, and Family voice controls. The actual Family Care local STT endpoint remains disabled until Phase 4B approval. No browser microphone API, hidden/background recording, raw audio storage/upload, raw transcript receipts, cloud STT, browser SpeechRecognition, OpenAI/Groq, schema/auth/session change, deploy, customer/field/demo exposure, medical diagnosis, emergency replacement behavior, or Apex HQ route/nav reintegration was added.

### Phase 5 - Notifications

- [x] Add notification preference model.
- [x] Add private-safe notification copy.
- [x] Add family digest notification decision.
- [x] Add concern-marked notification decision.
- [x] Add missing-update notification decision.
- [x] Add quiet hours / low-noise guard.
- [x] Add safe notification settings UI.
- [x] Keep real delivery/provider sends deferred to Phase 5A.
- [x] Add tests that lock-screen notifications do not expose sensitive details.

Done means: Family Care knows what should be notified, who it matters to, what safe copy should say, and what must wait for quiet hours, without live SMS/email/cloud/push sends yet.

Phase 5 receipt (2026-06-09): added the local-only Family Care notification decision brain with safe lock-screen copy, normalized notification preferences, family digest/concern/missing-update/doctor-summary/repeated-pattern decisions, quiet-hours and low-noise holds, and metadata-only notification receipts. The standalone Settings screen now previews decisions and stores only non-sensitive local preferences; the side status and Health view show notification decision counts, quiet-hours holds, live-send off, provider-send off, and lock-screen safety. Real push/SMS/email/provider delivery remains deferred to Phase 5A and requires approval before any sends or provider setup. No raw audio, raw transcript, raw prompts, raw responses, raw note text, secrets, customer data, Apex HQ product exposure, schema/auth/session changes, deploys, cloud fallback, medical diagnosis, or emergency replacement behavior was added. Focused validation: `node --test --test-concurrency=1 shared/apexFamilyCare.test.js shared/apexFamilyCareBrain.test.js shared/apexFamilyCareVoice.test.js shared/apexFamilyCareNotifications.test.js src/apex-family-care-components-import.test.js src/pwa-config.test.js shared/permissions.test.js src/app-routing.test.js src/navigation-utils.test.js src/mobile-nav-utils.test.js src/app-navigation-components-import.test.js` passed 100/100.

### Phase 5A - Real Notification Delivery

- [x] Choose the first delivery method: local house-device in-app notices.
- [x] Keep SMS, email, PWA push, browser/device notifications, cloud/provider setup, and external sends approval-gated.
- [x] Add opt-in, quiet hours, device trust, and family recipient controls.
- [x] Keep lock-screen and house-screen copy generic and private-safe.
- [x] Add tests proving sensitive note details do not leak into receipts/provider payloads and provider methods stay blocked.

Done means: Family Care can show local house-screen notice readiness inside the standalone PWA without external sends, provider payloads, browser notification APIs, SMS, email, or cloud.

Phase 5A receipt (2026-06-09): added `APEX_FAMILY_CARE_NOTIFICATION_DELIVERY_POLICY` and a local house-device delivery lane that turns notification decisions into in-app house-screen notice readiness only when local delivery is opted in, the house screen is trusted, the house device is ready, quiet hours allow it, and family recipient controls select at least one recipient. The Settings screen now shows Delivery lane, Trust this house screen, Family recipients, and Local House Notices; the Health/side status show local delivery count, house-screen trust, and external-send approval state. SMS, email, PWA push, browser/device notifications, service worker push, provider sends, provider payload storage, cloud use, raw note text, raw audio, raw transcripts, secrets, medical diagnosis, emergency replacement behavior, schema/auth/session changes, deploys, customer/field/demo exposure, and Apex HQ product exposure remain blocked. Focused validation: `node --test --test-concurrency=1 shared/apexFamilyCare.test.js shared/apexFamilyCareBrain.test.js shared/apexFamilyCareVoice.test.js shared/apexFamilyCareNotifications.test.js shared/apexFamilyCareKitchen.test.js shared/apexFamilyCareTestWeek.test.js src/apex-family-care-components-import.test.js src/pwa-config.test.js shared/permissions.test.js src/app-routing.test.js src/navigation-utils.test.js src/mobile-nav-utils.test.js src/app-navigation-components-import.test.js` passed 124/124.

### Phase 6 - Home Device / Kitchen Mode

- [x] Decide first household device: tablet, old phone, Raspberry Pi, or other local satellite.
- [x] Add big-button kitchen/tablet mode if needed.
- [x] Add visible listening/speaking status.
- [x] Add mute/stop behavior.
- [x] Add system health checks for device online/offline.

Done means: the house has a simple non-technical way to add updates and hear Apex.

Phase 6 receipt (2026-06-09): chose the first household device path as a house tablet or old phone running the standalone Family Care PWA, with Raspberry Pi/local satellite hardware deferred to Phase 6A. Added a Kitchen Mode screen with one-tap care-update buttons, visible listening/speaking/muted/ready status, mute/resume/stop controls, and local PWA heartbeat health. Added shared kitchen-mode policy/status/receipt helpers that keep live mic capture off, hidden/background recording off, camera surveillance off, network scanning off, device control off, cloud off, diagnosis off, and emergency replacement off. Kitchen receipts store compact metadata only and no raw audio, raw transcripts, prompts, responses, secrets, production data, or customer data. No schema/auth/session/deploy/provider changes were made. Focused validation: `node --test --test-concurrency=1 shared/apexFamilyCare.test.js shared/apexFamilyCareBrain.test.js shared/apexFamilyCareVoice.test.js shared/apexFamilyCareNotifications.test.js shared/apexFamilyCareKitchen.test.js src/apex-family-care-components-import.test.js src/pwa-config.test.js shared/permissions.test.js src/app-routing.test.js src/navigation-utils.test.js src/mobile-nav-utils.test.js src/app-navigation-components-import.test.js` passed 105/105.

### Phase 6A - Household Device Voice And Presence

- [x] Confirm first real household device remains a house tablet or old phone running the standalone PWA.
- [x] Add household device presence packet with heartbeat-only readiness.
- [x] Add always-visible mute, stop/recover, and visible voice-entry status.
- [x] Add voice-readiness status that stays visible-session-only until the local STT bridge is approved.
- [x] Keep Raspberry Pi/local satellite, camera surveillance, hidden recording, network scanning, device control, live mic capture, raw audio/transcript storage, cloud, sends, diagnosis, emergency replacement, schema/auth/session changes, deploys, and Apex HQ exposure blocked.

Done means: Family Care can tell whether the house screen is ready, what voice mode is safe, and whether mute/stop/recover controls are visible, without adding hidden capture or device control.

Phase 6A receipt (2026-06-09): added a household device presence policy and packet for the standalone Family Care PWA. The first household device remains a house tablet PWA with old-phone PWA as backup; Raspberry Pi/local satellite hardware is deferred to Phase 6B. Kitchen Mode now shows Household Device Presence with heartbeat-only readiness, visible voice status, mute/stop/recover control visibility, tablet-or-old-phone-first status, no camera, no network scan, no device control, and local STT bridge pending until approved. Apex Health and side status now include household presence/voice/control safety. Receipts remain compact metadata only and store no raw audio, transcripts, prompts, responses, secrets, customer data, or production data. No schema/auth/session/backend/provider/deploy/cloud behavior was added. Focused validation: `node --test --test-concurrency=1 shared/apexFamilyCare.test.js shared/apexFamilyCareBrain.test.js shared/apexFamilyCareVoice.test.js shared/apexFamilyCareNotifications.test.js shared/apexFamilyCareKitchen.test.js shared/apexFamilyCareTestWeek.test.js src/apex-family-care-components-import.test.js src/pwa-config.test.js shared/permissions.test.js src/app-routing.test.js src/navigation-utils.test.js src/mobile-nav-utils.test.js src/app-navigation-components-import.test.js` passed 126/126.

### Phase 7 - Family Test Week

- [ ] Run one real family test week.
- [ ] Measure whether repeated status texts decreased.
- [ ] Measure whether doctor prep improved.
- [ ] Gather Dad/Brother/family friction notes.
- [ ] Remove or simplify anything that feels like extra work.
- [ ] Freeze what works.

Done means: the family confirms it helps.

Phase 7 readiness receipt (2026-06-09): added a local Family Test Week evidence tracker so the real week can be measured instead of guessed from memory. The standalone PWA now has a Test Week screen for starting the real week, recording before/after repeated-status-text counts, doctor-prep ratings, family-informed ratings, Dad explanation-burden ratings, Grandma dignity rating, under-10-second update evidence, and friction/useful notes that identify what to simplify or freeze. Added shared test-week policy/summary/receipt helpers that explicitly require a real family week, prevent auto-completing Phase 7, require human review before closure, and keep receipts metadata-only with no raw friction text, raw audio, raw transcripts, prompts, responses, cloud use, SMS/email/push sends, diagnosis, emergency replacement, schema/auth/session changes, deploys, or Apex HQ customer/product exposure. The original Phase 7 checklist remains unchecked until the real family week is actually run and reviewed. Focused validation: `node --test --test-concurrency=1 shared/apexFamilyCare.test.js shared/apexFamilyCareBrain.test.js shared/apexFamilyCareVoice.test.js shared/apexFamilyCareNotifications.test.js shared/apexFamilyCareKitchen.test.js shared/apexFamilyCareTestWeek.test.js src/apex-family-care-components-import.test.js src/pwa-config.test.js shared/permissions.test.js src/app-routing.test.js src/navigation-utils.test.js src/mobile-nav-utils.test.js src/app-navigation-components-import.test.js` passed 109/109.

Phase 7 run-guide receipt (2026-06-09): added a local run-week guide and review packet so the family knows how to run the real test without the builder guessing later. The Test Week screen now shows setup, baseline text count, daily fast update, doctor-prep check, friction note, and end-week review steps, plus review prompts for Dad burden, family informed, doctor prep, Grandma dignity, simplify, and freeze decisions. The run packet does not auto-close Phase 7, does not send messages or notifications, does not add voice capture, does not give medical advice, and keeps receipts metadata-only with no raw feedback text, raw audio, transcripts, prompts, responses, secrets, cloud use, or Apex HQ customer/product exposure. The original Phase 7 checklist remains unchecked until the real family week is actually run and reviewed.

Phase 7 evidence-honesty receipt (2026-06-09): tightened the run-week guide so the house-screen setup step is not counted automatically. The Test Week screen now shows a House Screen readiness status and a visible Mark House Screen Ready control; the run packet only marks that setup step done after explicit local user action. This keeps Phase 7 evidence honest while preserving the no-auto-close, no-send, no-hidden-recording, no-medical-advice, metadata-only receipt rules. The original Phase 7 checklist remains unchecked until the real family week is actually run and reviewed.

Phase 7 daily-check-in receipt (2026-06-09): added a seven-day local check-in tracker so the family can mark each day Family Care was actually used during the real test week. The Test Week screen now shows Used Days and Daily Check-Ins, and the summary/receipts require full-week usage evidence from either seven daily check-ins or seven note days before Phase 7 can become review-ready. This does not auto-close Phase 7, does not send notifications or messages, does not add hidden recording, and stores only compact local metadata in receipts. The original Phase 7 checklist remains unchecked until the real family week is actually run and reviewed.

Phase 7 check-in-gating receipt (2026-06-09): tightened daily check-in evidence so review-ready status also requires the house screen to be explicitly marked ready, and the Test Week UI disables daily day buttons until the house screen is ready and the real week has started. This prevents prep clicks from looking like real use evidence while keeping all receipt data compact/local and preserving the no-auto-close, no-send, no-hidden-recording, and no-medical-advice rules. The original Phase 7 checklist remains unchecked until the real family week is actually run and reviewed.

## Follow-Up Loop Checklist

### Phase 1A - Family Access And Install Hardening

- [x] Add a local-only access readiness policy and compact metadata receipt.
- [x] Show access mode, install path, and boundary checks in the Family Access screen.
- [x] Confirm this slice makes no auth/session/schema, remote access, provider, send, deploy, or Apex HQ navigation changes.
- [x] Add tests proving the access-readiness receipt is metadata-only and that Family Care still does not expose Apex HQ, customer, field, or private operator routes.
- [ ] Choose the real family access model: family code, invite, trusted-device pairing, private LAN, or private remote access.
- [ ] Add the approved real phone/house-device install flow after the access model is chosen.
- [ ] Add any needed auth/session or remote access implementation only after explicit approval.

Phase 1A slice receipt (2026-06-09): looped the active builder back from Phase 7 into the first foundation follow-up slice per John's override. Added `buildApexFamilyCareAccessReadiness` with local-only access mode, direct PWA checks, install-target steps, remote-access approval gate, no Apex HQ navigation requirement, no private cockpit requirement, no auth/session/schema changes, no sends, no cloud, no public/customer/field exposure, no raw audio/transcript storage, no diagnosis, and metadata-only receipt data. The standalone Family Access screen now shows Access Mode, Install Path, Boundary Checks, and explicit No auth change / No schema change / No Apex HQ nav / No sends badges. Phase 1A is not fully closed because the real family access model and any approved remote/auth work remain later decisions.

### Phase 2A - Care Review And Doctor-Prep Polish

- [x] Add local review/archive note states without deleting notes.
- [x] Keep active summaries and doctor prep from relying on archived or needs-review notes by default.
- [x] Add timeline filters by status, category, reporter, concern, and doctor-summary flag.
- [x] Add a doctor-prep checklist and copy-safe doctor visit brief preview.
- [x] Confirm receipts stay metadata-only and no raw audio/transcript/prompt/response/secrets/cloud/sends/diagnosis/emergency claims are added.

Phase 2A slice receipt (2026-06-09): added the first care-review polish slice. Family Care now preserves active / needs-review / archived note states locally, keeps needs-review and archived notes out of default summaries, shows timeline filters for status/category/reporter/concern/doctor-prep, and gives each timeline note local controls to mark Needs Review, Restore Active, or Archive. Doctor Summary now includes a practical prep checklist and a manual copy-only Doctor Visit Brief preview using family-note language. No schema/auth/session/backend/deploy/provider/sending/cloud behavior was added; receipts remain compact metadata only.

### Phase 2B - Next Care Review Follow-Up

- [x] Add a true edit/revise flow for mistaken note text, category, reporter, timestamp, doctor-summary flag, family-visible flag, and concern flag.
- [x] Add a reviewed/confirmed state separate from active when the family verifies a note.
- [ ] Add a print/export path for the doctor visit brief only after the brief format is proven useful.
- [x] Add doctor-visit sections for "questions to ask", "changes since last visit", and "family concerns" without diagnosis or treatment advice.
- [x] Keep raw audio, raw transcripts, medical diagnosis, emergency replacement, real sends, cloud fallback, schema/auth/session changes, and Apex HQ exposure blocked unless explicitly approved.

Phase 2B slice receipt (2026-06-09): Phase 7A remains gated until one real family test week is complete, so the active loop advanced to the next useful local care-review slice instead of guessing feedback. Added a confirmed note status separate from active, note revision metadata, metadata-only revision receipts, and a Timeline Revise Note flow that can correct summary, category, reporter, timestamp, severity, body area, doctor-summary flag, family-visible flag, concern flag, and review status without deleting notes. Doctor Summary now includes practical appointment sections for questions to ask, changes since last visit, and family concerns while keeping family-note language only. Print/export remains deferred to Phase 2C until the brief format is proven useful. No raw audio, raw transcripts, raw prompts, raw responses, secrets, medical diagnosis, emergency replacement, real sends, cloud fallback, schema/auth/session changes, deploys, or Apex HQ exposure were added. Focused validation: `node --test --test-concurrency=1 shared/apexFamilyCare.test.js src/apex-family-care-components-import.test.js` passed 17/17.

### Phase 2C - Doctor Brief Print And Export Polish

- [ ] Add print/export only after the current doctor brief format is proven useful in family review.
- [ ] Keep export copy family-note-only with no diagnosis, treatment advice, emergency claims, raw audio, raw transcripts, real sends, cloud fallback, schema/auth/session changes, or Apex HQ exposure.

### Phase 3A - Apex Care Coordinator Loop

- [x] Add a daily care status review packet.
- [x] Add open-concern prompts that suggest what to check next without sending messages automatically.
- [x] Add missing-detail prompts for doctor prep, with human review.
- [x] Add medication-confirmation review only; never medication control, dosing, or treatment instructions.
- [x] Keep receipts metadata-only with no raw prompts, raw responses, secrets, raw audio, raw transcripts, or raw note text.

Phase 3A slice receipt (2026-06-09): added `buildApexFamilyCareCoordinatorPacket` and the Apex brain `buildCareCoordinatorPacket` action. The packet combines daily care-loop status, open concern prompts, doctor-prep missing-detail prompts, medication-confirmation review prompts, and needs-review note prompts. The standalone Apex Health screen now shows a compact Apex Care Coordinator card with prompt counts and explicit Human review / No sends / No medication control / Metadata-only receipt guardrails. This slice made no auth/session/schema/backend/deploy/provider changes, no real sends, no cloud fallback, no Apex HQ product exposure, no hidden recording, no medical diagnosis, and no medication control.

### Phase 3B - Next Care Coordinator Follow-Up

- [x] Add human-reviewed prompt resolution state so family can mark coordinator prompts handled, deferred, or not useful.
- [ ] Connect the coordinator packet into Apex's private operator command path only after the Family Care app flow proves useful.
- [x] Add a daily digest review workflow that drafts what Dad/family should see without sending it automatically.
- [x] Add prompt usefulness/friction tracking so Apex can ask fewer, better questions.
- [x] Keep medication review confirmation-only and keep dosing, treatment, diagnosis, emergency, raw transcript/audio storage, real sends, cloud fallback, schema/auth/session changes, and Apex HQ exposure blocked unless explicitly approved.

Phase 3B slice receipt (2026-06-09): added a local coordinator review packet and UI controls so family can mark Apex coordinator prompts handled, deferred, not useful, or reopened. Apex Health now shows a draft-only Daily Digest Review, prompt feedback counts, coordinator command-path status, provider-payload status, and raw-friction-text guardrails. The Apex brain can build metadata-only coordinator review receipts without enabling the operator command path, sends, provider payloads, cloud fallback, medication control, diagnosis, emergency replacement, raw audio, raw transcripts, raw prompts, raw responses, raw note text, schema/auth/session changes, deploys, or Apex HQ customer/product exposure. The operator command path remains deferred to Phase 3C after the Family Care flow proves useful. Focused validation: `node --test --test-concurrency=1 shared/apexFamilyCare.test.js shared/apexFamilyCareBrain.test.js shared/apexFamilyCareVoice.test.js shared/apexFamilyCareNotifications.test.js shared/apexFamilyCareKitchen.test.js shared/apexFamilyCareTestWeek.test.js src/apex-family-care-components-import.test.js src/pwa-config.test.js shared/permissions.test.js src/app-routing.test.js src/navigation-utils.test.js src/mobile-nav-utils.test.js src/app-navigation-components-import.test.js` passed 129/129.

### Phase 3C - Apex Operator Command Path For Family Care

- [ ] Connect the coordinator review packet into Apex's private operator command path only after family review proves the flow is useful.
- [ ] Keep the command path operator-only and Family Care-only, with no Apex HQ customer/product exposure.
- [ ] Keep receipts metadata-only with no raw note text, raw prompts, raw responses, raw audio, raw transcripts, secrets, customer data, or provider payloads.
- [ ] Keep real sends, cloud fallback, medication control, diagnosis, emergency replacement, schema/auth/session changes, deploys, and production exposure blocked unless explicitly approved.

### Phase 3.5A - Standalone Boundary Release Prep

- [x] Add a local release-boundary readiness packet for the standalone Family Care PWA.
- [x] Show local preview readiness, production blocked status, family access approval status, and Apex HQ drift checks in Family Access.
- [x] Confirm production release remains blocked/local-only until John approves the real family access model.
- [x] Confirm this slice makes no deploy, hosting, auth/session, schema, provider, remote access, send, cloud, or Apex HQ navigation changes.
- [x] Add tests proving the prep receipt is metadata-only and production exposure remains false.

Phase 3.5A slice receipt (2026-06-09): added `buildApexFamilyCareBoundaryReleasePrep` with a local-only release-prep policy for the standalone Family Care PWA. The Family Access screen now shows a Standalone Release Boundary card with Local Preview ready, Production blocked, Family Access needed, Apex HQ Drift blocked, and explicit No deploy / No hosting change / No auth change / No provider setup badges. Apex Health now reports local family preview, production family route, and family release approval status. Production remains blocked/local-only until a real family access model is approved; no deploy, hosting, provider, auth/session, schema, remote access, real sends, cloud fallback, hidden recording, medical diagnosis, or Apex HQ product exposure was added.

### Phase 3.5B - Next Standalone Boundary Follow-Up

- [ ] After John chooses the family access model, design the exact private release path: local LAN, trusted-device pairing, family code, invite, or private remote access.
- [ ] Add a real phone/house-device install checklist for the chosen path without adding auth/session, provider, deploy, or remote-access implementation until approved.
- [ ] Add human-run release smoke steps for local/house-device testing before any production or remote release.
- [ ] Keep production 404/local-only behavior until explicit approval changes the release posture.
- [ ] Keep Apex HQ business navigation, customer/field access, private cockpit dependency, raw audio/transcripts, sends, cloud fallback, schema/auth/session changes, and provider setup blocked unless explicitly approved.

## Done And Frozen Rule

When a checklist item is completed:

1. Mark it `[x]`.
2. Add validation evidence or a short receipt note.
3. Do not rebuild it unless there is a bug, safety issue, privacy issue, or John explicitly starts a versioned improvement.

When an entire phase is completed:

1. Mark the phase outcome as done.
2. Record affected files and validation.
3. Freeze that phase.
4. Move to the next unchecked phase.

## Family Care Builder Startup Prompt

Use this when starting or resuming a dedicated Family Care Builder thread:

```text
Start or continue Apex Family Care.

This is Apex private life-operator work only, not Apex HQ customer/product work.

First read:
1. AGENTS.md
2. .agents/skills/apex-codex-operator/SKILL.md
3. docs/APEX_HQ_CANONICAL_SOURCE_OF_TRUTH.md
4. docs/APEX_LOCAL_OPERATOR_RUNTIME_PLAN.md
5. docs/APEX_OS_LOCAL_FIRST_INTELLIGENCE_MODE.md
6. docs/APEX_FAMILY_CARE_LOCAL_PLAN.md

Goal:
Read docs/APEX_FAMILY_CARE_LOCAL_PLAN.md, confirm the Current Next Step, and build only that next unchecked Family Care phase unless John explicitly overrides the plan.

Hard rules:
- family-only
- no Apex HQ customer/product exposure
- no medical diagnosis
- no emergency replacement
- no hidden recording
- no raw audio storage
- no schema/auth/session/deploy changes unless explicitly approved
- no secrets
- no production data
- no broad refactor

Before closing the phase:
- update checklist items
- add validation evidence or a receipt
- add any deferred follow-up work to the Foundation Follow-Up Roadmap
- update Current Next Step
- commit only Family Care-owned files

Standing build-loop goal:
Complete the Current Next Step, advance the plan, then continue through foundation phases and follow-up roadmap phases until no unchecked Family Care work remains or a safety/approval blocker requires John.
```

## Current Next Step

Next active build slice: Phase 3.5B - Next Standalone Boundary Follow-Up.

Open validation track: Phase 7 - Family Test Week remains incomplete until one real family test week is run and reviewed. Do not mark Phase 7 complete from synthetic data or builder prep work.

Open approval-gated Phase 1A work: choose and approve the real family access model before adding real remote access, auth/session changes, provider setup, or family-device rollout.

Open Phase 2C work: add print/export doctor-brief polish only after the current doctor brief format is proven useful in family review.

Open Phase 3C work: connect the coordinator review packet into Apex's private operator command path only after Family Care flow proves useful.

Open approval-gated Phase 3.5B work: choose the real family access/release path and add human-run install/smoke steps only after approval.

Open Phase 4B work: choose and approve the Family Care-specific local STT bridge before connecting real speech recognition.

Open Phase 5B work: choose and approve the exact external notification channel/provider/device boundary before adding real SMS, email, PWA push, browser/device notifications, service worker push, provider payloads, or live sends.

Open Phase 6B work: choose and approve any real household device bridge beyond the tablet/old-phone PWA before adding Raspberry Pi/local satellite integration, local STT bridge wiring, device OS control, camera, network scanning, cloud, sends, schema/auth/session changes, or deploys.
