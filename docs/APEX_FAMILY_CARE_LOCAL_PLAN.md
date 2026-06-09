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
- Add Update
- Care Timeline
- Doctor Summary
- Family Summary
- Notifications / Settings
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

Do later when: notes, summaries, notifications, and family access are useful enough that voice improves an existing workflow instead of blocking the build.

### Phase 5A - Real Notification Delivery

Purpose: connect actual delivery after Phase 5 proves the notification brain and safe-copy rules.

- Choose delivery method: PWA push, device notification, local house device, SMS, or email.
- Require approval before SMS/email/cloud/provider setup or any real sends.
- Keep lock-screen copy generic and private-safe.
- Add opt-in, quiet hours, device trust, and family recipient controls.
- Add tests that sensitive note details never leak into lock-screen or provider payloads.

Do later when: Phase 5 notification decisions and UI are proven safe locally.

### Phase 6A - Household Device Voice And Presence

Purpose: make the kitchen/tablet/Raspberry Pi style experience useful after the basic kitchen mode exists.

- Decide the first real household device.
- Add always-visible mute/stop status.
- Add offline/online health checks for the house device.
- Add local voice only if Phase 4A is ready and safe.
- Avoid camera surveillance, hidden recording, and automatic emergency claims.

Do later when: the family has chosen the house device and the core app flow is already useful without voice.

### Phase 7A - Family Test Week Improvements

Purpose: use real family feedback to simplify instead of piling on features.

- Review whether Dad had to explain less.
- Review whether siblings felt informed without spam.
- Review whether doctor prep got easier.
- Remove or simplify anything that felt like another chore.
- Freeze what worked and write the next versioned improvement list.

Do later when: one real family test week is complete.

## Build Checklist

### Phase 0 - Plan Lock

- [x] Save local source-of-truth plan.
- [x] Use this file as the first-read file for every Apex Family Care build prompt.
- [x] Do not mix Family Care work with Apex core runtime/model/voice Builder threads.
- [x] Add mandatory startup and idea-filter rules for future compacted-context turns.

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

### Phase 5 - Notifications

- [ ] Add notification preference model.
- [ ] Add private-safe notification copy.
- [ ] Add family digest notification decision.
- [ ] Add concern-marked notification decision.
- [ ] Add missing-update notification decision.
- [ ] Add quiet hours / low-noise guard.
- [ ] Add safe notification settings UI.
- [ ] Keep real delivery/provider sends deferred to Phase 5A.
- [ ] Add tests that lock-screen notifications do not expose sensitive details.

Done means: Family Care knows what should be notified, who it matters to, what safe copy should say, and what must wait for quiet hours, without live SMS/email/cloud/push sends yet.

### Phase 6 - Home Device / Kitchen Mode

- [ ] Decide first household device: tablet, old phone, Raspberry Pi, or other local satellite.
- [ ] Add big-button kitchen/tablet mode if needed.
- [ ] Add visible listening/speaking status.
- [ ] Add mute/stop behavior.
- [ ] Add system health checks for device online/offline.

Done means: the house has a simple non-technical way to add updates and hear Apex.

### Phase 7 - Family Test Week

- [ ] Run one real family test week.
- [ ] Measure whether repeated status texts decreased.
- [ ] Measure whether doctor prep improved.
- [ ] Gather Dad/Brother/family friction notes.
- [ ] Remove or simplify anything that feels like extra work.
- [ ] Freeze what works.

Done means: the family confirms it helps.

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
```

## Current Next Step

Next unchecked phase: Phase 5 - Notifications.
