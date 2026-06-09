# Apex Family Care Local Plan

Last updated: 2026-06-09

Status: local source-of-truth plan. This is Apex private life-operator work, not Apex HQ customer/product work.

## North Star

Apex Family Care exists to make Grandma's care easier on the family, especially Dad and Brother, without turning care into another chore.

The system must reduce repeated "what is going on?" texts, help Dad prepare for doctor appointments, keep adult kids calmly informed, and protect Grandma's dignity and independence.

If a feature makes the family type more, manage more, or feel watched instead of helped, it is off track.

## One-Sentence Product Shape

Apex Family Care is a private family-only PWA and voice-first care domain that Apex can operate: it captures quick spoken/tapped updates, organizes care memory, prepares doctor summaries, creates family digests, and watches the care loop for missing or concerning patterns.

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
- Voice-first note capture when available.
- Notifications that are calm, useful, and private.

The first interaction should feel like:

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

## Build Checklist

### Phase 0 - Plan Lock

- [x] Save local source-of-truth plan.
- [x] Use this file as the first-read file for every Apex Family Care build prompt.
- [x] Do not mix Family Care work with Apex core runtime/model/voice Builder threads.

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

- [ ] Add Apex internal interface for Family Care.
- [ ] Support `logCareNote`.
- [ ] Support `getTodayCareStatus`.
- [ ] Support `buildDoctorSummary`.
- [ ] Support `buildFamilyDigest`.
- [ ] Support `listOpenConcerns`.
- [ ] Support `markMedicationConfirmed` only as confirmation, not medication control.
- [ ] Add Apex receipts with no raw prompt/response/audio storage.

Done means: Apex can operate the Family Care domain through a clean internal interface.

### Phase 4 - Voice-First Entry

- [ ] Add voice note flow from Apex.
- [ ] Add one-follow-up limit for unclear notes.
- [ ] Add push-to-talk or visible listening mode for household device/tablet.
- [ ] Add fallback typed/tap entry.
- [ ] Add no-hidden-recording tests/receipts.

Done means: Dad/Brother/Grandma can speak short updates and Apex turns them into structured notes.

### Phase 5 - Notifications

- [ ] Add notification preference model.
- [ ] Add private-safe notification copy.
- [ ] Add family digest notification.
- [ ] Add concern-marked notification.
- [ ] Add missing-update notification.
- [ ] Add quiet hours / low-noise guard.
- [ ] Add tests that lock-screen notifications do not expose sensitive details.

Done means: family gets useful updates without spam or sensitive lock-screen content.

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

## First Build Prompt

Use this when starting the dedicated Builder thread:

```text
Start Apex Family Care v0.

This is Apex private life-operator work only, not Apex HQ customer/product work.

First read:
1. AGENTS.md
2. .agents/skills/apex-codex-operator/SKILL.md
3. docs/APEX_HQ_CANONICAL_SOURCE_OF_TRUTH.md
4. docs/APEX_LOCAL_OPERATOR_RUNTIME_PLAN.md
5. docs/APEX_OS_LOCAL_FIRST_INTELLIGENCE_MODE.md
6. docs/APEX_FAMILY_CARE_LOCAL_PLAN.md

Goal:
Build Phase 1 from docs/APEX_FAMILY_CARE_LOCAL_PLAN.md without mixing it into Apex core runtime/model/voice work.

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

Build only the next unchecked phase and update docs/APEX_FAMILY_CARE_LOCAL_PLAN.md when items are completed.
```

## Current Next Step

Next unchecked phase: Phase 3 - Apex Care Brain Integration.
