# Apex HQ Living Finish Plan

Last updated: 2026-06-04

Canonical first-read file: `docs/APEX_HQ_CANONICAL_SOURCE_OF_TRUTH.md`.

This living plan tracks active phase memory, deploy evidence, user requests, and phase reports. The canonical file owns workspace truth, Concrete Ops to Apex HQ transition rules, stale archive rules, and source-of-truth order.

## Current Public Self-Serve Readiness Note

Current live read-only check: `https://app.apexhq.online/api/setup/status` reports `publicSignupEnabled: false`, `demoMode: false`, and `needsSetup: false`.

Decision state:

- Apex HQ remains guided-demo and controlled-pilot ready.
- Production public signup has been contained on Fly release `v619` by setting `PUBLIC_SIGNUP_ENABLED=false`.
- Public self-serve launch is not considered complete until signup is formally approved with the full self-serve/public-launch evidence bundle and explicitly re-enabled.
- The current status and exact next steps live in `docs/APEX_HQ_PUBLIC_SELF_SERVE_CURRENT_READINESS.md`.

Containment evidence:

- Pre-change production backup: `postgres-app-data-20260531-055430Z.json` plus `uploads-20260531-055430Z.manifest.json`.
- Fly production release: `v619`, machine `148e06e2b53d68`, one passing service check.
- `/api/ready` returned ready/database ok.
- Direct `POST /api/signup/company` returned `404 Not Found`.
- Hosted skip-auth smoke passed.
- Self-serve readiness gate now reports controlled self-serve pilot GO and public self-serve launch NO-GO.

Immediate next recommendation:

- Prepare the public-launch approval packet: legal/privacy/terms/public-claims review, guided pilot completion or launch waiver, explicit public launch approval, and explicit approval to re-enable production public signup.

## Active Product Goal: Apex OS / Apex HQ Command Center

Goal recorded on 2026-06-02: build **Apex OS**, Apex HQ's private John-only operating center inside the main Apex HQ app.

Plan file: `docs/APEX_HQ_APEX_OS_COMMAND_CENTER_MASTER_PLAN.md`.

Hard-finish roadmap file: `docs/APEX_HQ_APEX_OS_HARD_FINISH_ROADMAP.md`.

Current decision memory:

- John Berlanga owns Apex HQ.
- The fake/smoke business remains testing/demo data only.
- Apex OS is the real Apex HQ operating center, not a contractor customer workspace.
- Apex OS should use the real Apex HQ logo, brand identity, and private owner/operator language.
- Apex OS should use the normal Apex HQ login with a stricter private operator access gate.
- Customers, demo users, field users, estimators, normal company admins, pilots, and customer companies must not see the Apex OS nav item, route, agents, build status, business tasks, internal decisions, or approval controls.
- Apex OS should eventually support chat, voice, knowledge uploads, durable decision memory, source-backed answers, app/build awareness, agent control, approval queues, launch/revenue/business queues, monitoring, daily briefings, and a kill switch.
- Apex OS should have maximum freedom to plan, organize, draft, analyze, prioritize, recommend, design, code locally when asked, test locally, summarize, and prepare work. It needs John's approval before anything external, irreversible, customer-visible, private-data-sensitive, production-affecting, permission-affecting, provider-connected, or money-related.
- Current hard-finish approval posture: private Apex OS schema/storage, private file/document storage, server-side provider/API integration, production deploy after validation, and John-requested scoped agent execution are approved for phase work. Email/SMS sends, ad publishing/spend, billing/payment actions, customer-visible publishing/sends/shares, autonomous unrequested agent execution, and irreversible external actions remain not approved right now.
- Josh's operating contract memory recorded on 2026-06-04: every Apex HQ work turn must start from `AGENTS.md`, `.agents/skills/apex-codex-operator/SKILL.md`, the canonical/living source-of-truth docs, and the active goal/phase before touching code. Codex must answer questions directly when Josh only asks a question; when Josh asks for work, inspect the real app/files, make the smallest complete change, validate with tests and browser/mobile/PDF QA where relevant, update memory/docs, commit, push, deploy only after approval, run production smoke, report rollback/permissions/mobile/field impact, and avoid drifting into unrelated phases or rebuilding working systems.
- Jarvis completion memory recorded on 2026-06-04: Apex is past a cool AI screen and into the early Jarvis operating-system foundation, but it is not a complete Jarvis yet. The current foundation is roughly 60-70% of the command-center base and roughly 30-40% of true Jarvis behavior. The biggest remaining gap is making Apex actually do tracked work, talk naturally, monitor proactively, and report back like an operator instead of feeling like a screen with tools.
- The next approved north-star lane is **Apex Live Operator Mode**: body-first desktop command room, reliable always-open voice where browser/PWA limits allow it, natural back-and-forth with interruption/barge-in, real saved autonomous execution runs, proactive monitoring/status, and long-term run memory. This must stay review-first and private: no live customer sends, billing/payment, ad spend, customer-visible publishing, provider credential handling, production mutation, schema/auth/session change, deletion, or irreversible external action without a specific approval gate.
- Active finish-goal memory recorded on 2026-06-04: do not drift into another dashboard, scattered phase list, or cosmetic-only Apex screen. The active goal stays **complete Apex Live Operator Mode** until Apex feels like a private Jarvis-style operator: the Apex body remains the center of the command room, voice stays wake-gated but open where the browser/PWA allows, Apex can speak/listen in natural turns with interruption, operator-requested autonomous work is saved as real runs, status checks are proactive, useful work/results can become reviewed long-term memory, and every finished slice is validated, documented, committed, pushed, deployed, and production-smoked before moving on. This approval covers commit/push/deploy after successful validation for this active goal; it does not approve email/SMS sends, ad spend, billing/payment, customer-visible publishing/sends/shares, provider credential changes, hidden/background microphone capture, production data mutation, schema/auth/session changes, deletion, or irreversible external actions.
- Complete Apex memory lock recorded on 2026-06-04: when Josh asks where Apex is against a complete Jarvis-style finish, treat the answer as a working gap list, not a reason to drift. Keep building toward one private operator that can hear, speak, interrupt, reason from trusted Apex HQ context, save real runs, show progress/evidence, report back, remember reviewed outcomes, monitor proactively, and prepare autonomous work for approval. Commit, push, deploy, and smoke each finished slice after validation under the standing approval for this active goal. Do not use this memory to approve live customer messages, SMS/email sends, ad spend, billing/payment, provider credential changes, hidden/background microphone capture, production data mutation, schema/auth/session changes, deletion, or irreversible external execution.
- Goal confirmation memory recorded on 2026-06-04: keep one active finish goal for Apex Live Operator Mode instead of creating parallel goals or bouncing phases. Save each completed slice here, validate it, commit it, push it, deploy it under Josh's standing release approval, production-smoke it, and then continue toward the same finished Apex operator. The approval still excludes live customer messages, SMS/email sends, ad spend, billing/payment, customer-visible publishing, provider credential changes, hidden/background microphone capture, production data mutation, schema/auth/session changes, deletion, and irreversible external execution.
- No-drift work memory recorded on 2026-06-04: Josh explicitly asked to save the operating contract to memory so Apex HQ work does not get off track, keep the single active Apex Live Operator Mode finish goal, and commit, push, and deploy completed verified slices. Future turns must read this memory before creating new goals, avoid parallel finish tracks, preserve unrelated dirty files, update this living plan after each slice, and continue only inside the same safety exclusions: no live customer messages, SMS/email sends, ad spend, billing/payment, customer-visible publishing/sends/shares, provider credential changes, hidden/background microphone capture, production data mutation, schema/auth/session changes, deletion, or irreversible external execution.
- Apex Live Operator Mode first production slice is implemented, pushed, deployed, and production-checked as of 2026-06-04: the private Apex body screen now has a Live Operator Mode readiness panel, a body-side Live Run action that creates durable private autonomy runs plus internal draft handoffs, and desktop focus-mode layout fixes so the command room stays body-first instead of turning into one long crowded page. Production release `v664` from commit `1f42fde` passed Fly checks, ready/health/setup checks, hosted skip-auth health/routes smoke, readiness timing, Control Room asset verification, and unauthenticated Apex OS endpoint 401 checks. No schema, auth/session, provider setup, production data mutation, customer-visible action, external send, ad spend, billing/payment, deploy/rollback execution from the UI, deletion, or irreversible action path was added.
- Apex Live Operator Mode proactive pulse pass is complete as of 2026-06-04: the Apex body page now auto-checks read-only build awareness, daily briefing, and autonomy-run status every minute while open, has a manual Check Now pulse, updates Live Run saved/active counts without a full page reload, and raises the visible live-operator posture to 80% command foundation and 52-56% live operator behavior. The remaining no-go lines stay locked: no customer-visible send, billing/payment, ad spend, provider credential handling, production mutation, schema/auth/session change, deletion, or irreversible external action without a separate approval gate.
- Apex Live Operator Mode proactive pulse production release was approved, pushed, deployed, and production-checked on 2026-06-04 from commit `2545ce6` to Fly app `concrete-ops-2`, machine `148e06e2b53d68`, version `665`, image `registry.fly.io/concrete-ops-2:deployment-01KTA4697PAKCR763R2X348NQT`; rollback target is version `664`, image `registry.fly.io/concrete-ops-2:deployment-01KTA2XB5719AMT87JNQY4XNMN`. Production backup before deploy produced `postgres-app-data-20260604-201039Z.json`, `uploads-20260604-201039Z`, and `uploads-20260604-201039Z.manifest.json` with 5 uploaded files. Predeploy checks passed: focused Apex Live Operator tests, autonomy-run API tests, `npm.cmd run build`, `npm.cmd run verify:roles`, `npm.cmd run verify:server`, `npm.cmd run verify:backup`, `npm.cmd run verify:docs`, `git diff --check` with CRLF warnings only, and desktop/mobile browser QA with no horizontal overflow. Post-deploy checks passed: both production `/api/ready` endpoints returned ready/database ok, `https://concrete-ops-2.fly.dev/api/health` returned healthy, Fly status showed v665 started with 1 passing check, hosted skip-auth health/routes smoke passed on `https://app.apexhq.online/`, readiness timing passed, `/apex-control-room` served `index-DnsrwM68.js`, `app-domain-BfKJuQb9.js`, and `app-domain-D6rVajIf.css` on both production hosts, unauthenticated `/api/apex-os/build-awareness`, `/api/apex-os/memory`, `/api/apex-os/autonomy-runs`, and `/api/apex-os/ask` returned 401, and `/api/setup/status` showed setup complete, demo mode off, demo user absent, and public signup disabled. Production auth smoke/login was not run because the production smoke password environment variables were not configured in the shell.
- Apex Live Operator Mode open voice recovery pass is complete locally as of 2026-06-04: the Apex body voice loop now starts browser speech-caption fallback after the visible Wake Apex action, keeps server transcription as backup, recovers between voice turns, routes browser captions through the same review-first Ask Apex path, and surfaces caption status in the Voice card, Live Conversation metrics, and Proactive Pulse. The visible posture is now 84% command foundation and 60-64% live operator behavior. This is not hidden or background listening: the browser still requires a visible permission/wake event, the page shows voice/caption state, no audio or transcripts are stored, and external/customer-visible/production/billing/ad/provider actions remain locked behind separate approval gates.
- Apex Live Operator Mode open voice recovery production release was approved, pushed, deployed, and production-checked on 2026-06-04 from commit `af808ba` to Fly app `concrete-ops-2`, machine `148e06e2b53d68`, version `667`, image `registry.fly.io/concrete-ops-2:deployment-01KTA611FC850KQT18J7X5PDCD`; rollback target is version `666`, image `registry.fly.io/concrete-ops-2:deployment-01KTA4N93MTWJTF37VRJ4CBDVP`. Production backup before deploy produced `postgres-app-data-20260604-204154Z.json`, `uploads-20260604-204154Z`, and `uploads-20260604-204154Z.manifest.json` with 5 uploaded files. Predeploy checks passed: focused Apex Live Operator voice tests, autonomy-run tests, `npm.cmd run build`, `npm.cmd run verify:roles`, `npm.cmd run verify:server`, `npm.cmd run verify:backup`, `npm.cmd run verify:docs`, `git diff --check` with CRLF warnings only, and desktop/mobile browser QA with injected local speech-recognition and no horizontal overflow. Post-deploy checks passed: both production `/api/ready` endpoints returned ready/database ok, `https://concrete-ops-2.fly.dev/api/health` returned healthy, Fly status showed v667 started with 1 passing check, hosted skip-auth health/routes smoke passed on `https://app.apexhq.online/`, readiness timing passed, `/apex-control-room` served `index-BsV6B_Sp.js`, `app-domain-BUH3u645.js`, and `app-domain-YllHYJsf.css` on both production hosts, unauthenticated `/api/apex-os/build-awareness`, `/api/apex-os/memory`, `/api/apex-os/autonomy-runs`, `/api/apex-os/ask`, `/api/apex-os/voice/speech`, and `/api/apex-os/voice/transcribe` returned 401, and `/api/setup/status` showed setup complete, demo mode off, demo user absent, and public signup disabled. Production auth smoke/login was not run because the production smoke password environment variables were not configured in the shell.
- Apex Live Operator Mode no-drift memory recorded on 2026-06-04: the current goal is a complete private Apex Live Operator Mode, not another contractor dashboard. The target stays body-first around the Apex figure, with reliable wake-gated open voice where browser/PWA limits allow it, natural back-and-forth, interruption/barge-in, real saved autonomous execution runs, proactive monitoring/status, long-term run memory, and production release proof after each completed slice. The next local slice adds interruption memory so manual, caption, and voice barge-in events stop Apex speaking, keep listening, and carry the interruption into the next source-backed answer context.
- Apex Live Operator Mode interruption memory pass is complete locally as of 2026-06-04: the Apex body voice loop now records manual/caption/voice interruptions in the command stream, marks interrupted questions as `interruption-reading`, injects the interruption context into the Ask Apex envelope, shows caught barge-ins in Live Conversation and Proactive Pulse, and raises the visible posture to 86% command foundation and 64-68% live operator behavior. Local desktop/mobile browser QA passed against the built production bundle with a temp operator database, injected speech-recognition/mic permissions, no horizontal overflow, visible Apex body/Live Operator Mode/Barge-in/Interrupt controls, and unauthenticated Apex OS API checks returning 401. This remains review-first and visible: no hidden/background listening, no audio/transcript storage, no customer-visible send, no billing/payment, no ad spend, no provider credential handling, no schema/auth/session change, no production data mutation, no deletion, and no irreversible external action path was added.
- Apex Live Operator Mode interruption memory production release was approved, pushed, deployed, and production-checked on 2026-06-04 from commit `ef821a0` to Fly app `concrete-ops-2`, machine `148e06e2b53d68`, version `669`, image `registry.fly.io/concrete-ops-2:deployment-01KTA7V08D6GQ1GEGN4HPJGCXV`; rollback target is version `668`, image `registry.fly.io/concrete-ops-2:deployment-01KTA6F5ZTGAPJBV01B6NXKS8P`. Production backup before deploy produced `postgres-app-data-20260604-211437Z.json`, `uploads-20260604-211437Z`, and `uploads-20260604-211437Z.manifest.json` with 5 uploaded files. Predeploy checks passed: focused Apex Live Operator interruption/voice tests, autonomy-run tests, `npm.cmd run build`, `npm.cmd run verify:roles`, `npm.cmd run verify:server`, `npm.cmd run verify:backup`, `npm.cmd run verify:docs`, `git diff --check` with CRLF warnings only, and desktop/mobile browser QA with injected local speech-recognition/mic access and no horizontal overflow. Post-deploy checks passed: both production `/api/ready` endpoints returned ready/database ok, `https://concrete-ops-2.fly.dev/api/health` returned healthy, Fly status showed v669 started with 1 passing check, hosted skip-auth health/routes smoke passed on `https://app.apexhq.online/`, readiness timing passed, `/apex-control-room` served `index-DGQxHc5A.js`, `app-domain-C6IKpeXT.js`, and `app-domain-YllHYJsf.css` on both production hosts, unauthenticated `/api/apex-os/build-awareness`, `/api/apex-os/memory`, `/api/apex-os/autonomy-runs`, `/api/apex-os/ask`, `/api/apex-os/voice/speech`, and `/api/apex-os/voice/transcribe` returned 401, and `/api/setup/status` showed setup complete, demo mode off, demo user absent, and public signup disabled. Production auth login smoke was not run in this pass because it creates login/session/audit side effects and no dedicated production smoke env was used.
- Apex Live Operator Mode live-turn memory pass is complete locally as of 2026-06-04: the Apex body can now draft a suggested memory from the latest source-backed live turn using a visible `Remember` action in the focus drawer and live console; the draft is redacted before save, stored as `apex-live-operator-turn`, remains `suggested`, and must be manually reviewed before becoming trusted context. The visible posture is now 88% command foundation and 70-74% live operator behavior. Validation passed: focused Apex Control Room/memory/autonomy tests, `npm.cmd run build`, `npm.cmd run verify:roles`, `npm.cmd run verify:server`, `npm.cmd run verify:backup`, `npm.cmd run verify:docs`, `git diff --check` with CRLF warnings only, and desktop/mobile browser QA against the built bundle with screenshots in `outputs/apex-live-memory-qa/`; QA verified Apex body/Live Operator Mode/Remember/Barge-in visibility, no horizontal overflow, successful suggested live-turn memory creation, and unauthenticated Apex OS GET/POST endpoints returning 401. This remains review-first: no hidden/background listening, no audio/transcript storage, no automatic trusted memory, no customer-visible send, no billing/payment, no ad spend, no provider credential handling, no schema/auth/session change, no production data mutation, no deletion, and no irreversible external action path was added.
- Apex Live Operator Mode live-turn memory production release was approved, pushed, deployed, and production-checked on 2026-06-04 from commit `a9e025c` to Fly app `concrete-ops-2`, machine `148e06e2b53d68`, version `670`, image `registry.fly.io/concrete-ops-2:deployment-01KTA9NJFJ5F600EDJ734FTMQ1`; rollback target is version `669`, image `registry.fly.io/concrete-ops-2:deployment-01KTA7V08D6GQ1GEGN4HPJGCXV`. Production backup before deploy produced `postgres-app-data-20260604-214639Z.json`, `uploads-20260604-214639Z`, and `uploads-20260604-214639Z.manifest.json` with 5 uploaded files. Predeploy checks passed: focused Apex Control Room/memory/autonomy tests, `npm.cmd run build`, `npm.cmd run verify:roles`, `npm.cmd run verify:server`, `npm.cmd run verify:backup`, `npm.cmd run verify:docs`, `git diff --check` with CRLF warnings only, and desktop/mobile browser QA against the built bundle with screenshots in `outputs/apex-live-memory-qa/`. Post-deploy checks passed: both production `/api/ready` endpoints returned ready/database ok, `https://concrete-ops-2.fly.dev/api/health` returned healthy, Fly status showed v670 started with 1 passing check, hosted skip-auth health/routes smoke passed on `https://app.apexhq.online/`, readiness timing averaged 108ms for `/api/health` and 32ms for `/api/ready`, `/apex-control-room` served `index-nm4KoZ3R.js`, `app-domain-BDNSAC1w.js`, and `app-domain-DkvFhYCX.css` on both production hosts, unauthenticated `/api/apex-os/build-awareness`, `/api/apex-os/memory`, `/api/apex-os/autonomy-runs`, `/api/apex-os/ask`, `/api/apex-os/voice/speech`, and `/api/apex-os/voice/transcribe` returned 401, and `/api/setup/status` showed setup complete, demo mode off, demo user absent, public signup disabled, and public estimate requests enabled. Production auth login smoke was not run in this pass because it creates login/session/audit side effects and no dedicated production smoke env was used.
- Apex Live Operator Mode active-run session pass is complete locally as of 2026-06-04: the Apex body now shows an Active Run Session with saved-run progress, current completion state, evidence/link counts, linked handoff/request context, and body-side Draft, Validate, Approval, Report Done, and Block controls backed by the existing private operator-only autonomy-run API. Live Run now selects the created run, drafts internal handoff/request records, and report-back status writes a result report while execution remains locked. Completed runs show `Run reported complete` instead of an unfinished current step. Visible posture is now 90% command foundation and 74-78% live operator behavior depending on whether a run is active. Validation passed: focused Apex Control Room/autonomy tests, `npm.cmd run build`, `npm.cmd run verify:roles`, `npm.cmd run verify:server`, `npm.cmd run verify:backup`, `npm.cmd run verify:docs`, desktop/mobile browser QA against the built bundle with screenshots in `outputs/apex-live-run-session-qa/`, and unauthenticated Apex OS build-awareness, memory, autonomy-runs, Ask, speech, and transcribe endpoints returning 401. QA verified a live run saved 7 steps, linked internal handoff and agent-control request records, moved through validating, waiting-approval, and done, saved a result report, stayed `canExecute: false`, `executionLocked: true`, and `externalActionsLocked: true`, and had no horizontal overflow on 1440x900 desktop or 390x844 mobile. This remains review-first: no hidden/background listening, no audio/transcript storage, no customer-visible send, no billing/payment, no ad spend, no provider credential handling, no schema/auth/session change, no production data mutation, no deletion, and no irreversible external action path was added.
- Apex Live Operator Mode active-run session production release was approved, pushed, deployed, and production-checked on 2026-06-04 from commit `e9646d7` to Fly app `concrete-ops-2`, machine `148e06e2b53d68`, version `671`, image `registry.fly.io/concrete-ops-2:deployment-01KTABFPMBFJ1JY3PA5MKKT1X8`; rollback target is version `670`, image `registry.fly.io/concrete-ops-2:deployment-01KTA9NJFJ5F600EDJ734FTMQ1`. Production backup before deploy produced and confirmed `postgres-app-data-20260604-221724Z.json`, `uploads-20260604-221724Z`, and `uploads-20260604-221724Z.manifest.json` with 5 uploaded files. Predeploy checks passed: focused Apex Control Room/autonomy tests, `npm.cmd run build`, `npm.cmd run verify:roles`, `npm.cmd run verify:server`, `npm.cmd run verify:backup`, `npm.cmd run verify:docs`, `git diff --check` with CRLF warnings only, and desktop/mobile browser QA against the built bundle with screenshots in `outputs/apex-live-run-session-qa/`. Post-deploy checks passed: both production `/api/ready` endpoints returned ready/database ok, `https://concrete-ops-2.fly.dev/api/health` returned healthy, Fly status showed v671 started with 1 passing check, hosted skip-auth health/routes smoke passed on `https://app.apexhq.online/`, readiness timing averaged 86ms for `/api/health` and 33ms for `/api/ready`, `/apex-control-room` served `index-C994Ma1x.js`, `app-domain-DPhHR82U.js`, and `app-domain-DvXUS9Z-.css` on both production hosts, unauthenticated `/api/apex-os/build-awareness`, `/api/apex-os/memory`, `/api/apex-os/autonomy-runs`, `/api/apex-os/ask`, `/api/apex-os/voice/speech`, and `/api/apex-os/voice/transcribe` returned 401, and `/api/setup/status` showed setup complete, demo mode off, demo user absent, public signup disabled, and public estimate requests enabled. Production auth login smoke was not run in this pass because it creates login/session/audit side effects and no dedicated production smoke env was used.
- Apex Live Operator Mode private Auto Prep pass is complete locally as of 2026-06-04: the Active Run Session now has a visible `Auto Prep` control that can draft missing internal work, advance private run prep through request capture, routing, planning, and internal draft linkage, persist evidence and next-safe-action state, set linked runs to validation-ready, and stop at the approval gate before any external or irreversible behavior. Visible posture is now 92% command foundation and 76-82% live operator behavior depending on whether a run is active. Validation passed: focused Apex Control Room/autonomy tests, `npm.cmd run build`, `npm.cmd run verify:roles`, `npm.cmd run verify:server`, `npm.cmd run verify:backup`, `npm.cmd run verify:docs`, desktop/mobile browser QA against the built bundle with screenshots in `outputs/apex-live-private-prep-qa/`, and unauthenticated Apex OS build-awareness, memory, autonomy-runs, Ask, speech, and transcribe endpoints returning 401. QA verified Auto Prep creates/links internal handoff and agent-control drafts, advances route and plan to done, sets draft linkage to drafted, sets validation evidence to ready, marks approval gate as waiting-approval, keeps `canExecute: false`, `executionLocked: true`, and `externalActionsLocked: true`, and has no horizontal overflow on 1440x900 desktop or 390x844 mobile. This remains review-first: no hidden/background listening, no audio/transcript storage, no customer-visible send, no billing/payment, no ad spend, no provider credential handling, no queue/run/execute/deploy/rollback path from the UI, no schema/auth/session change, no production data mutation, no deletion, and no irreversible external action path was added.
- Apex Live Operator Mode private Auto Prep production release was approved, pushed, deployed, and production-checked on 2026-06-04 from commit `221adef` to Fly app `concrete-ops-2`, machine `148e06e2b53d68`, version `672`, image `registry.fly.io/concrete-ops-2:deployment-01KTACV0V4N581WP68RQBQVN9W`; rollback target is version `671`, image `registry.fly.io/concrete-ops-2:deployment-01KTABFPMBFJ1JY3PA5MKKT1X8`. Production backup before deploy produced and confirmed `postgres-app-data-20260604-224151Z.json`, `uploads-20260604-224151Z`, and `uploads-20260604-224151Z.manifest.json` with 5 uploaded files. Predeploy checks passed: focused Apex Control Room/autonomy tests, `npm.cmd run build`, `npm.cmd run verify:roles`, `npm.cmd run verify:server`, `npm.cmd run verify:backup`, `npm.cmd run verify:docs`, `git diff --check` with CRLF warnings only, and desktop/mobile browser QA against the built bundle with screenshots in `outputs/apex-live-private-prep-qa/`. Post-deploy checks passed: both production `/api/ready` endpoints returned ready/database ok, `https://concrete-ops-2.fly.dev/api/health` returned healthy, Fly status showed v672 started with 1 passing check, hosted skip-auth health/routes smoke passed on `https://app.apexhq.online/`, readiness timing averaged 91ms for `/api/health` and 33ms for `/api/ready`, `/apex-control-room` served `index-CqHJbxun.js`, `app-domain-Cuw1grnq.js`, and `app-domain-DvXUS9Z-.css` on both production hosts, unauthenticated `/api/apex-os/build-awareness`, `/api/apex-os/memory`, `/api/apex-os/autonomy-runs`, `/api/apex-os/ask`, `/api/apex-os/voice/speech`, and `/api/apex-os/voice/transcribe` returned 401, and `/api/setup/status` showed setup complete, demo mode off, demo user absent, public signup disabled, and public estimate requests enabled. Production auth login smoke was not run in this pass because it creates login/session/audit side effects and no dedicated production smoke env was used.
- Apex Live Operator Mode private Proof Check pass is complete locally as of 2026-06-04: the Active Run Session now has a visible `Proof` control that can draft missing internal work, auto-prep route/plan/draft links, privately verify linked agent-control and execution-handoff drafts, route and plan evidence, validation readiness, and approval-stop posture, then save proof evidence and move the run to `waiting-approval` while execution remains locked. Visible posture is now 93% command foundation and 78-86% live operator behavior depending on whether a run is active. Validation passed: focused Apex Control Room/autonomy tests, `npm.cmd run build`, `npm.cmd run verify:roles`, `npm.cmd run verify:server`, `npm.cmd run verify:backup`, `npm.cmd run verify:docs`, desktop/mobile browser QA against the built bundle with screenshots in `outputs/apex-live-proof-check-qa/`, and unauthenticated Apex OS build-awareness, memory, autonomy-runs, Ask, speech, and transcribe endpoints returning 401. QA verified Proof creates/links internal drafts when missing, completes route and plan evidence, marks validation evidence done, holds the approval gate at waiting approval, keeps `canExecute: false`, `executionLocked: true`, and `externalActionsLocked: true`, and has no horizontal overflow on 1440x900 desktop or 390x844 mobile. This remains review-first: no hidden/background listening, no audio/transcript storage, no customer-visible send, no billing/payment, no ad spend, no provider credential handling, no queue/run/execute/deploy/rollback path from the UI, no schema/auth/session change, no production data mutation, no deletion, and no irreversible external action path was added.
- Apex Live Operator Mode private Proof Check production release was approved, pushed, deployed, and production-checked on 2026-06-04 from commit `61df135` to Fly app `concrete-ops-2`, machine `148e06e2b53d68`, version `673`, image `registry.fly.io/concrete-ops-2:deployment-01KTAEHQ8AS9QNGTZSR8KVG027`; rollback target is version `672`, image `registry.fly.io/concrete-ops-2:deployment-01KTACV0V4N581WP68RQBQVN9W`. Production backup before deploy produced and confirmed `postgres-app-data-20260604-231140Z.json`, `uploads-20260604-231140Z`, and `uploads-20260604-231140Z.manifest.json` with 5 uploaded files. Predeploy checks passed: focused Apex Control Room/autonomy tests, `npm.cmd run build`, `npm.cmd run verify:roles`, `npm.cmd run verify:server`, `npm.cmd run verify:backup`, `npm.cmd run verify:docs`, `git diff --check` with CRLF warnings only, and desktop/mobile browser QA against the built bundle with screenshots in `outputs/apex-live-proof-check-qa/`. Post-deploy checks passed: both production `/api/ready` endpoints returned ready/database ok, `https://concrete-ops-2.fly.dev/api/health` returned healthy, Fly status showed v673 started with 1 passing check, hosted skip-auth health/routes smoke passed on `https://app.apexhq.online/`, readiness timing averaged 132ms for `/api/health` and 32ms for `/api/ready`, `/apex-control-room` served `index-D9Dp3Igs.js`, `app-domain-CDh1F5va.js`, and `app-domain-DZe9RELX.css` on both production hosts, unauthenticated `/api/apex-os/build-awareness`, `/api/apex-os/memory`, `/api/apex-os/autonomy-runs`, `/api/apex-os/ask`, `/api/apex-os/voice/speech`, and `/api/apex-os/voice/transcribe` returned 401, and `/api/setup/status` showed setup complete, demo mode off, demo user absent, public signup disabled, and public estimate requests enabled. Production auth login smoke was not run in this pass because it creates login/session/audit side effects and no dedicated production smoke env was used.
- Apex Live Operator Mode private Operator Cycle pass is complete locally as of 2026-06-04: the Active Run Session now has a visible `Cycle` control that drafts missing internal work, auto-preps route and plan evidence, privately proof-checks linked agent-control and execution-handoff drafts, sets report-memory review to ready, and pauses at `waiting-approval` for manual review. Visible posture is now 94% command foundation and 80-88% live operator behavior depending on whether a run is active. Validation passed: 25 focused Apex Control Room/autonomy tests, `npm.cmd run build`, `npm.cmd run verify:roles`, `npm.cmd run verify:server`, `npm.cmd run verify:backup`, `npm.cmd run verify:docs`, `git diff --check` with CRLF warnings only, desktop/mobile browser QA against a temp operator database with screenshots in `outputs/apex-live-operator-cycle-qa/`, and unauthenticated Apex OS build-awareness, memory, autonomy-runs, Ask, speech, and transcribe endpoints returning 401. QA verified Cycle creates/links internal drafts when missing, completes route and plan evidence, marks validation evidence done, holds approval at waiting approval, marks `report-memory` ready, keeps `canExecute: false`, `executionLocked: true`, and `externalActionsLocked: true`, and has no horizontal overflow on 1440x900 desktop or 390x844 mobile. This remains review-first: no hidden/background listening, no audio/transcript storage, no automatic trusted memory, no customer-visible send, no billing/payment, no ad spend, no provider credential handling, no queue/run/execute/deploy/rollback path from the UI, no schema/auth/session change, no production data mutation, no deletion, and no irreversible external action path was added.
- Apex Live Operator Mode private Operator Cycle production release was approved, pushed, deployed, and production-checked on 2026-06-04 from commit `b410af4` to Fly app `concrete-ops-2`, machine `148e06e2b53d68`, version `674`, image `registry.fly.io/concrete-ops-2:deployment-01KTAFVP0VGJ4MHF8Q73CDA406`; rollback target is version `673`, image `registry.fly.io/concrete-ops-2:deployment-01KTAEHQ8AS9QNGTZSR8KVG027`. Production backup before deploy produced and confirmed `postgres-app-data-20260604-233431Z.json`, `uploads-20260604-233431Z`, and `uploads-20260604-233431Z.manifest.json` with 5 uploaded files. Predeploy checks passed: 25 focused Apex Control Room/autonomy tests, `npm.cmd run build`, `npm.cmd run verify:roles`, `npm.cmd run verify:server`, `npm.cmd run verify:backup`, `npm.cmd run verify:docs`, `git diff --check` with CRLF warnings only, and desktop/mobile browser QA against the built bundle with screenshots in `outputs/apex-live-operator-cycle-qa/`. Post-deploy checks passed: both production `/api/ready` endpoints returned ready/database ok, `https://concrete-ops-2.fly.dev/api/health` returned healthy, Fly status showed v674 started with 1 passing check after manual machine start, hosted skip-auth health/routes smoke passed on `https://app.apexhq.online/`, readiness timing averaged 92ms for `/api/health` and 32ms for `/api/ready`, `/apex-control-room` served `index-BSnqMF7L.js`, `app-domain-D6yiWcje.js`, and `app-domain-DOBJTOUH.css` on both production hosts, unauthenticated `/api/apex-os/build-awareness`, `/api/apex-os/memory`, `/api/apex-os/autonomy-runs`, `/api/apex-os/ask`, `/api/apex-os/voice/speech`, and `/api/apex-os/voice/transcribe` returned 401, and `/api/setup/status` showed setup complete, demo mode off, demo user absent, public signup disabled, and public estimate requests enabled. Production auth login smoke was not run in this pass because it creates login/session/audit side effects and no dedicated production smoke env was used.

Recommended first implementation:

- Build only the private access boundary and Apex-branded Control Room shell first if no schema change is needed.
- Use the existing operator-access direction where possible.
- Validate route/nav/API blocking for non-John users before adding chat, voice, knowledge, or agent controls.

Current implementation status:

- Apex OS Phase 1 / Slice 1 is hard-finished locally as of 2026-06-03: `/apex-control-room` route, `apexControlRoom` module, `apexOs` bootstrap permission, private operator nav visibility, and direct-route/API blocking are frozen to the normal Apex HQ login plus private `operatorAccess`, an office-level role, the default Apex HQ operating workspace, and server bootstrap permission. Customer/company workspaces stay blocked even after operator company switching.
- Apex OS Phase 2 / Apex-Branded Control Room Shell is hard-finished and deployed as of 2026-06-03: the private shell uses Apex HQ branding, private operator identity, dark sidebar/orange active state, white command-board panels, the required top KPI row (`App Build Status`, `Active Agents`, `Launch Blockers`, `Approvals`), and the required main panels (`Apex Briefing`, `Priority Queue`, `Agents`, `Approvals`, `Memory / Decisions`). The KPI row no longer shows contractor/customer dashboard counts, and local browser QA used an empty private Apex HQ workspace payload to verify no demo/customer Today content leaks into the shell.
- Apex OS Phase 3 / Apex OS State Aggregator is hard-finished and deployed as of 2026-06-03: the Control Room now uses a read-only state packet that covers current branch/build/test evidence when supplied, phase status, blockers, approvals, agents, release desk, launch/business queues, recent evidence, source labels, confidence labels, and read-only boundaries while blocked users receive no Apex OS state.
- Apex OS Phase 4 / Slice 3 is hard-finished and deployed as of 2026-06-03: the Control Room now shows Decision Memory and Operating Rules sourced from the Apex OS master plan plus durable Apex OS memory, including John/Apex HQ identity, private operator-only access, approval boundaries, local/private autonomy, build order, source order, field boundaries, no-secrets memory, build-freeze discipline, business-goal memory, personal-preference memory, decision-only browsing, review history, duplicate checks, and private decision export.
- Apex OS Slice 4 is implemented locally: the Control Room now shows a read-only Agent Work Queue, Agent Run Ledger, Agent Safety Locks, and Locked Agent Tasks using existing Agent OS task/run helpers. It shows what can be planned or reviewed, not anything that runs agents.
- Apex OS Phase 5 / Knowledge Upload Vault is hard-finished and deployed as of 2026-06-03: the private Control Room now has classified manual/text/PDF knowledge intake for the original 8 Phase 5 categories, source metadata, review status, summary status, search/filter by category/source/status/text, category-scoped duplicate-source guarding, vault review history, private knowledge export, and manual approve/archive review before uploaded knowledge becomes trusted Apex OS memory.
- Apex OS Phase 6 / Ask Apex Chat is hard-finished and deployed as of 2026-06-03: the private Control Room now has selectable context scopes, operator-only source-backed Ask Apex answers, server-side OpenAI provider readiness when `OPENAI_API_KEY` is configured, local source-backed fallback, ranked evidence drawer, source labels, approval warnings, save-as-decision suggested memory drafts, create-task approval packet drafts, and needs-approval packet drafts. No frontend provider secrets, customer-visible answers, production mutation, send, spend, billing/payment, schema change, or irreversible execution path was added.
- Apex OS Phase 7 / Agent Control Plane is hard-finished and deployed as of 2026-06-03: the private Control Room now has the complete seven-role agent roster for build, QA, release, marketing, sales, customer success, and monitoring; derived running/paused/blocked/done/needs-approval status; current task, last update, next action, report history, and handoff/request counts; durable operator-only pause, resume, and scoped-run requests in `apexOsAgentControlRequests`; request/load/mark-ready/block/close/archive UI; audit/activity history; readiness validation; source-label requirements; secret/email rejection; and locked execution/background-loop/external-action controls. No queue/run endpoint, unmanaged background loop, autonomous unrequested execution, deploy action, send, spend, billing/payment, provider setup, customer-visible action, production mutation, schema change, deletion, or irreversible action path was added.
- Apex OS Phase 8 / Approval Command Center is hard-finished and deployed as of 2026-06-03: the private Control Room now has risky-action approval categories, packet templates, risk scoring, exact approval phrase entry, durable draft/ready/approved/rejected/deferred/blocked/archived approval packet records in `apexOsApprovalPackets`, operator-only list/create/update endpoints, source-label and readiness-field requirements, secret/email rejection, decision actor/timestamp fields, audit/activity logging, and Control Room drafting/loading/mark-ready/block/archive/reject/defer/approval-record UI. Approval decisions are review records only; no execution, queue/run endpoint, deploy action, production mutation, provider setup, customer-visible action, send, spend, billing/payment, schema/auth/session change, deletion, or irreversible action path was added.
- Apex OS Phase 9 / App Build And Code Awareness is hard-finished and deployed as of 2026-06-03: the private Control Room now has a read-only App Build Awareness panel with current branch/head, changed-file map, build/test script status, recent deploy evidence, known blockers, frozen phase map, safe source links, recent commits, and source-backed next-safe-task recommendation. Operator-only `/api/apex-os/build-awareness` reads git/status/docs/package/dist/runtime metadata when available and degrades honestly to runtime metadata only in images without `.git`. File references are sanitized, field data is excluded, and execution stays locked: no UI code edits, test runs, commits, pushes, deploys, rollbacks, CI/GitHub writes, provider setup, production mutation, customer-visible action, sends, spend, billing/payment, schema/auth/session change, deletion, or irreversible action path was added.
- Apex OS Phase 12 / Voice Interface is hard-finished and deployed as of 2026-06-03: the private Control Room now supports click-to-record push-to-talk, Stop & transcribe, manual transcript fallback, transcript confirmation, command review for the original Phase 12 commands, safe Ask Apex question handoff, and Speak answer / Stop voice playback. It remains review-first and execution-locked: no always-listening, hidden microphone capture, audio storage, transcript persistence, frontend provider secret, autonomous command execution, schema/auth/session change, customer-visible action, live send, ad spend, billing/payment, deploy/rollback execution from the UI, or production/customer mutation was added.
- Apex OS Phase 13 / Knowledge Intelligence is hard-finished, pushed, deployed, and production-checked as of 2026-06-03: the private Control Room now has source-backed Knowledge Intelligence over approved decisions and Knowledge Vault rows, with local source ranking, reviewed summaries, trusted/suggested/archived status, source/category/status/text/date filters, confidence labels, current-rule conflict warnings, older-memory conflict warnings, operator-only provider-ready summary/classification endpoint, and locked vector-search/embedding state. No unreviewed upload trust, customer/public knowledge mixing, embeddings/schema/storage, frontend provider secret, external action, send, spend, billing/payment, deploy/rollback execution from the UI, or production/customer mutation was added.
- Apex OS Phase 14 / Action Execution Layer is hard-finished, pushed, deployed, and production-checked as of 2026-06-03: Ask Apex can create safe task handoff drafts from chat, execution handoffs now carry locked work contracts with role/skill, work type, workstream status, allowed/blocked actions, validation, rollback, result report, source chat, approval packet link, and suggested decision-memory update evidence, and finished handoffs require validation results plus result reports before suggested memory can be drafted. No queue/run endpoint, autonomous unrequested agent execution, production action, customer-visible action, external send, ad spend, billing/payment, provider setup, schema/auth/session change, deletion, or irreversible action path was added.
- Apex OS Phase 15 / Production Preview And Release Desk is hard-finished, pushed, deployed, and production-checked as of 2026-06-03: the Release Desk now shows read-only Production Preview Status, Release Readiness Packet, Deploy History, Deploy Approved Flow, and Release Safety Summary sections; build awareness parses the living-plan deploy log so current production version, commit, image, health evidence, backup evidence, hosted smoke evidence, and recent Apex OS deploy history are visible; and the deploy-approved path is visible but locked. No deploy button, rollback execution, provider setup, production mutation, customer-visible action, live send, ad spend, billing/payment, schema/auth/session change, deletion, or irreversible action path was added.
- Apex OS Phase 16 / Personal Operating Layer is hard-finished, pushed, deployed, and production-checked as of 2026-06-03: the private Control Room now maps John preferences, work style memory, communication preferences, daily focus, interruption rules, background-vs-check-in rules, preference review, and privacy locks through existing operator-only Apex OS memory category `personal-preference`. Preferences start suggested, require source labels, reject secrets, and become operating guidance only after manual approval; privacy locks keep hidden tracking, sensitive personal tracking, background execution, external sends, production/customer mutation, schema/auth/session changes, provider setup, billing/payment, ad spend, and customer-visible actions locked. Production release `v648` from commit `c2f99d4` passed Fly checks, ready/health/setup checks, unauthenticated Apex OS endpoint 401 checks, Control Room asset verification, and hosted skip-auth smoke.
- Apex OS Phase 17 / Full Apex OS QA And Security Hardening is hard-finished, pushed, deployed, and production-checked as of 2026-06-03: the private Control Room now has final hardening proof rows for role/field restrictions, customer/company isolation, direct-route blocking, source-backed answers, upload privacy, approval gates, build/test/release safety, desktop/mobile QA, production-preview smoke proof path, docs/memory drift, no secrets, risky-action bypass blocking, and the Apex OS access kill switch. Local validation passed focused tests, broad security/company-scope regression coverage after a transient company-scope server-start rerun, role verification, production build, diff check, and isolated desktop/mobile/admin-blocked browser QA. Production release `v649` from commit `52a3cf4` passed Fly checks, ready/health/setup checks, unauthenticated Apex OS endpoint 401 checks, Control Room asset verification, and hosted skip-auth smoke. No schema, auth/session, provider setup, production data mutation, customer-visible action, external send, ad spend, billing/payment, deploy/rollback execution from the UI, deletion, or irreversible action path was added.
- Apex OS Phase 18 / Finished Apex OS is hard-finished, pushed, deployed, and production-checked as of 2026-06-03: the private Control Room now assembles all completed Apex OS capabilities into a Finished Apex OS cockpit with capability proof rows, day-to-day run-loop rows, completion-freeze rows, and blocked-action proof rows. It proves John can run Apex HQ day to day by asking, deciding, uploading/reviewing knowledge, approving packets, briefing, monitoring, planning, preparing scoped task handoffs, preparing releases, and managing agents while email/SMS/voice sends, ads/spend, billing/payment, customer-visible publishing, autonomous unrequested agents, and irreversible external actions stay blocked. Local validation passed focused tests, broad Apex OS regression, role verification, production build, desktop/mobile/operator/admin browser QA, direct-route blocking, protected API blocking, and visual screenshots. Production release `v650` from commit `67aea87` passed Fly checks, ready/health/setup checks, unauthenticated Apex OS endpoint 401 checks, Control Room asset verification, and hosted skip-auth smoke. No schema, auth/session, provider setup, production data mutation, customer-visible action, live send, ad spend, billing/payment, autonomous unrequested execution, deploy/rollback execution from the UI, deletion, or irreversible action path was added.
- Apex OS Slice 8 is folded into Phase 8 completion: the Approval Command Center first UI now has safe durable review decisions while execution remains locked.
- Apex OS Phase 11 / Monitoring And Daily Briefings is hard-finished and deployed as of 2026-06-03: the private Control Room now has source-backed Release Monitoring refresh for production readiness, demo app readiness, GitHub Actions/smoke status, failed test/build signals, stalled-agent signals, daily briefing manual refresh/save, durable private briefing history, changed-since-last-saved rows, locks, source labels, and John-action alerts. External alerts/notifications, autonomous schedules, deploy/rollback execution from the UI, provider monitoring changes, production/customer data mutation, schema/auth/session changes, live sends, ad spend, billing/payment, public publishing, and customer-visible actions remain locked.
- Apex OS Phase 10 / Business Operating Center is hard-finished and deployed as of 2026-06-03: the private Control Room now has business command queues for launch, demo/pilot, marketing, sales/outreach, customer success, and revenue/pricing/offer work; launch/founder-demo rows; business briefing rows; approved source-backed business memory rows; private business task drafts; and business approval draft rows for manual sends, ads/publishing, billing/offers, customer-visible work, and business operations. Live sends, ad spend, billing/payment, public publishing, provider setup, production data, schema/storage, auth/session change, customer-visible actions, and unsupported claims remain approval-locked.
- Apex OS Slice 11 is implemented locally: the Control Room now shows a private QA / Security Hardening surface with final evidence rows, hardening locks, completion audit rows, and security proof sources for John-only access, company/customer isolation, direct-route blocking, field-user blocking, source-backed answers, upload privacy, approval gates, desktop/mobile quality, build/test/release safety, no secrets, and no bypass actions.
- Apex OS Slice 12 is implemented locally and has been folded into Phase 4 completion: Apex OS now has a durable source-backed decision memory API stored through existing company settings as `apexOsMemory`, with private operator-only access, suggested/approved/archived states, source-label requirements, source/timestamp tracking, secret/email rejection, audit/activity logging, and a private "What Did I Decide?" view with manual draft/load/approve/archive controls in the Control Room.
- Apex OS Slice 13 is folded into Phase 6 completion: Ask Apex has an operator-only `/api/apex-os/ask` endpoint that answers from approved Apex OS memory and source rows by selected context scope, returns source labels, ranked evidence rows, approval warnings, local source-backed fallback, and server-side OpenAI provider readiness when `OPENAI_API_KEY` is configured. No action execution, sends, deploys, production mutation, or frontend secret exposure was added.
- Apex OS Slice 14 is folded into Phase 6 completion: the private Control Room Ask Apex panel submits context-scoped questions to `/api/apex-os/ask`, renders source-backed answers, source labels, approval warnings, ranked evidence drawer, provider/local mode status, and review-only Save as decision, Create task draft, and Needs approval draft actions while keeping execution, sends, deploys, spend, billing/payment, customer-visible actions, and all external actions locked.
- Apex OS Slice 15 is folded into Phase 12 completion: manual transcript confirmation now works alongside click-to-record push-to-talk, server-only speech/transcription provider readiness, safe browser speech fallback, voice command review, and read-only Ask Apex handoff. It still does not store audio/transcripts, enable always-listening, execute voice commands, write approvals/decisions automatically, deploy, send, spend, publish, bill, or mutate production/customer data.
- Apex OS Slice 16 is folded into Phase 11 completion: the private Daily Briefing can refresh from operator-only `/api/apex-os/daily-briefing`, save sanitized private snapshots through operator-only `POST /api/apex-os/daily-briefing/history`, compare what changed since the last saved briefing, and show briefing history from existing company settings as `apexOsDailyBriefingHistory`. It does not send alerts, call providers, execute agents, deploy, mutate production/customer data, change schema/auth/session, or create customer-visible actions.
- Apex OS Slice 17 is folded into Phase 8 completion: the private Approval Command Center now has durable approval packet drafts and safe approval/rejection/deferral decision records stored through existing company settings as `apexOsApprovalPackets`, with exact approval phrase enforcement, operator-only endpoints, source-label and readiness-field requirements, secret/email rejection, and audit/activity logging. This slice does not add executed/running/queued states, one-click execution, deploy, sends, spend, provider setup, production mutation, customer-visible changes, schema changes, deletion, or irreversible actions.
- Apex OS Slice 18 is implemented locally: the private Agent Work Queue now has durable safe agent handoff drafts stored through existing company settings as `apexOsExecutionHandoffs`, with operator-only list/create/update endpoints, draft/ready/blocked/archived states only, source-label and readiness-field requirements, secret/email rejection, audit/activity logging, and Control Room UI for drafting, loading, marking ready/blocked, and archiving handoffs. This slice prepares scoped work packages only; it does not approve, queue, run, execute, deploy, send, spend, publish, configure providers, mutate production, make customer-visible changes, change schema, or perform irreversible actions.
- Access uses the existing local/private `operatorAccess` flag plus office-level role checks, the default Apex HQ operating workspace, and the server bootstrap `apexOs` permission. Normal admins without operator access, estimators, field users, employees, demo users without the flag, customer/company users, and switched customer-company workspaces do not get the route/nav/API permission.
- Apex OS production operator shell and route behavior is complete locally as of 2026-06-03: private operator bootstrap now defaults `/` and blocked contractor direct routes to `/apex-control-room`, hides contractor Today/Field/Office/Money nav inside the Apex HQ operating workspace, shows private operator shell/topbar/mobile nav language, preserves contractor routing after switching into a customer company, and removes hard-coded owner-name approval copy from user-facing Apex OS panels.
- Apex OS production operator shell release was approved and deployed on 2026-06-03 from commit `89d48db` to Fly app `concrete-ops-2`, machine `148e06e2b53d68`, version `633`, image `concrete-ops-2:deployment-01KT5Q7T38PVKCT8C1J21KXJNN`. Post-deploy health returned ready/database ok, route-only hosted smoke passed for production, `/apex-control-room` served the new `index-DCWJ00_W.js` bundle, and unauthenticated `/api/apex-os/memory` returned 401. No production auth smoke/login was run because production auth smoke credentials/workflow remain separately gated.
- Apex OS Phase 4 production release was approved in chat and deployed on 2026-06-03 from commit `cc52afb` to Fly app `concrete-ops-2`, machine `148e06e2b53d68`, version `636`, image `registry.fly.io/concrete-ops-2:deployment-01KT5W3M9Y6YAJ6KFBWW35Y7XS`; rollback target is version `635`, image `registry.fly.io/concrete-ops-2:deployment-01KT5TJ888A2QCGXEQNH5R6CW1`. Predeploy checks passed: focused Phase 4 suite, broader Apex OS route/nav/bootstrap suite, `npm.cmd run build`, `npm.cmd run verify:backup`, and `npm.cmd run verify:restore`. Production backup produced `postgres-app-data-20260603-043200Z.json` and uploaded-file backup `uploads-20260603-043200Z`. Post-deploy checks passed: both production `/api/ready` endpoints returned ready/database ok, Fly status showed v636 started with 1 passing check, hosted skip-auth smoke passed, `/apex-control-room` served `index-J7sgvvtN.js` and `app-domain-V2ebLBKf.js`, unauthenticated `/api/apex-os/memory` returned 401, `/api/setup/status` showed demo mode off and public signup disabled, and logs showed the startup health check recovering quickly before route/ready checks passed. Production auth smoke/login was not run, and the read-only release-gate helper remained not fully green because it requires the exact internal approval phrase plus production auth smoke evidence.
- Apex OS Phase 5 production release was approved in chat and deployed on 2026-06-03 from commit `6c2b601` to Fly app `concrete-ops-2`, machine `148e06e2b53d68`, version `637`, image `registry.fly.io/concrete-ops-2:deployment-01KT5XKN0KJ36YSXNV3Y0AJGRA`; rollback target is version `636`, image `registry.fly.io/concrete-ops-2:deployment-01KT5W3M9Y6YAJ6KFBWW35Y7XS`. The deploy was run from a clean temporary git worktree at commit `6c2b601` so unrelated local brief/output files were not part of the release decision. Predeploy checks passed: focused Phase 5 suite, broader Apex OS route/nav/permission suite, `npm.cmd run verify:roles`, `npm.cmd run verify:server`, `npm.cmd run verify:backup`, `npm.cmd run verify:restore`, `npm.cmd run build`, and `git diff --check` with CRLF warnings only. Post-deploy checks passed: both production `/api/ready` endpoints returned ready/database ok, Fly status showed v637 started with 1 passing check, hosted skip-auth health/routes smoke passed on `https://app.apexhq.online/`, unauthenticated `/api/apex-os/memory` returned 401, `/api/setup/status` showed setup complete, demo mode off, and public signup disabled, and logs showed the startup health check recovering quickly before ready checks passed. Production auth smoke/login was not run.
- Apex OS Phase 6 production release was approved in chat and deployed on 2026-06-03 from commit `94a6f69` to Fly app `concrete-ops-2`, machine `148e06e2b53d68`, version `638`, image `registry.fly.io/concrete-ops-2:deployment-01KT5Z6DBGHPW3T48S88FAG8AZ`; rollback target is version `637`, image `registry.fly.io/concrete-ops-2:deployment-01KT5XKN0KJ36YSXNV3Y0AJGRA`. The deploy was run from a clean temporary git worktree at commit `94a6f69` so unrelated local brief/output files were not part of the release decision. Predeploy checks passed: focused Phase 6 suite, broader Apex OS route/nav/permission suite, `npm.cmd run verify:roles`, `npm.cmd run verify:server`, `npm.cmd run verify:backup`, `npm.cmd run verify:restore`, `npm.cmd run build`, and `git diff --check`. Post-deploy checks passed: both production `/api/ready` endpoints returned ready/database ok, `https://concrete-ops-2.fly.dev/api/health` returned healthy, Fly status showed v638 started with 1 passing check, hosted skip-auth health/routes smoke passed on `https://app.apexhq.online/`, `/apex-control-room` served `index-edxz1AWA.js` and `app-domain-Dmnfvp72.js`, unauthenticated `/api/apex-os/ask` returned 401, `/api/setup/status` showed setup complete, demo mode off, demo user absent, and public signup disabled, and logs showed startup health recovering quickly before route/ready checks passed. Production auth smoke/login was not run.
- Apex OS Phase 7 production release was approved in chat and deployed on 2026-06-03 from commit `0aef694` to Fly app `concrete-ops-2`, machine `148e06e2b53d68`, version `639`, image `registry.fly.io/concrete-ops-2:deployment-01KT60X0SWR6QZWJKQC407W4VC`; rollback target is version `638`, image `registry.fly.io/concrete-ops-2:deployment-01KT5Z6DBGHPW3T48S88FAG8AZ`. The deploy was run from a clean temporary git worktree at commit `0aef694` so unrelated local brief/output files were not part of the release decision. Production backup before deploy produced `postgres-app-data-20260603-055635Z.json`, `uploads-20260603-055635Z`, and `uploads-20260603-055635Z.manifest.json`. Predeploy checks passed: focused Phase 7 shared/API/UI tests, broader Apex OS route/nav/permission suite, `npm.cmd run build`, `git diff --check` with CRLF warnings only, and desktop/mobile browser QA. Post-deploy checks passed: both production `/api/ready` endpoints returned ready/database ok, `https://concrete-ops-2.fly.dev/api/health` returned healthy, Fly status showed v639 started with 1 passing check, hosted skip-auth health/routes smoke passed on `https://app.apexhq.online/`, `/apex-control-room` served, unauthenticated `/api/apex-os/agent-control` returned 401, `/api/setup/status` showed setup complete, demo mode off, demo user absent, and public signup disabled. Production auth smoke/login was not run.
- Apex OS Phase 8 production release was approved in chat and deployed on 2026-06-03 from commit `be2dccb` to Fly app `concrete-ops-2`, machine `148e06e2b53d68`, version `640`, image `registry.fly.io/concrete-ops-2:deployment-01KT63SPFM2EM1SVEHK24148G8`; rollback target is version `639`, image `registry.fly.io/concrete-ops-2:deployment-01KT60X0SWR6QZWJKQC407W4VC`. The deploy was run from a clean temporary git worktree at commit `be2dccb` so unrelated local brief/output files were not part of the release decision. Production backup before deploy produced `postgres-app-data-20260603-064657Z.json`, `uploads-20260603-064657Z`, and `uploads-20260603-064657Z.manifest.json`. Predeploy checks passed: focused Phase 8 shared/API/UI tests, broader 77-test Apex OS route/nav/permission suite, `npm.cmd run build`, `git diff --check` with CRLF warnings only, active-local-DB cleanup verification, and desktop/mobile browser QA screenshots in `ui-audit/apex-control-room-phase8/`. Post-deploy checks passed: both production `/api/ready` endpoints returned ready/database ok, `https://concrete-ops-2.fly.dev/api/health` returned healthy, Fly status showed v640 started with 1 passing check, hosted skip-auth health/routes smoke passed on `https://app.apexhq.online/`, `/apex-control-room` served `index-CbknD5jw.js` and `app-domain-EKFHwEPQ.js` on both production hosts, unauthenticated `/api/apex-os/approval-packets` returned 401, `/api/setup/status` showed setup complete, demo mode off, demo user absent, and public signup disabled, and logs showed startup health recovering quickly before route/ready checks passed. Production auth smoke/login was not run.
- Apex OS Phase 9 production release was approved in chat and deployed on 2026-06-03 from commit `6368845` to Fly app `concrete-ops-2`, machine `148e06e2b53d68`, version `641`, image `registry.fly.io/concrete-ops-2:deployment-01KT65V9K2KK4G0V1R6QRXR9QG`; rollback target is version `640`, image `registry.fly.io/concrete-ops-2:deployment-01KT63SPFM2EM1SVEHK24148G8`. The deploy was run from a clean temporary git worktree at commit `6368845` so unrelated local brief/output files were not part of the release decision. Production backup before deploy produced `postgres-app-data-20260603-072250Z.json`, `uploads-20260603-072250Z`, and `uploads-20260603-072250Z.manifest.json` with 5 uploaded files. Predeploy checks passed: focused Phase 9 shared/API/UI tests, broader 81-test Apex OS route/nav/permission suite, `npm.cmd run build`, `git diff --check` with CRLF warnings only, and desktop/mobile browser QA screenshots in `ui-audit/apex-control-room-phase9/`. Post-deploy checks passed: both production `/api/ready` endpoints returned ready/database ok, `https://concrete-ops-2.fly.dev/api/health` returned healthy, Fly status showed v641 started with 1 passing check, hosted skip-auth health/routes smoke passed on `https://app.apexhq.online/`, `/apex-control-room` served `index-Damj_cyI.js` and `app-domain-VWYbc_UL.js` on both production hosts, unauthenticated `/api/apex-os/build-awareness` returned 401, `/api/setup/status` showed setup complete, demo mode off, demo user absent, and public signup disabled, and logs showed startup health recovering quickly before route/ready checks passed. Production auth smoke/login was not run.
- Apex OS Phase 10 production release was approved in chat and deployed on 2026-06-03 from commit `ee851f7` to Fly app `concrete-ops-2`, machine `148e06e2b53d68`, version `642`, image `registry.fly.io/concrete-ops-2:deployment-01KT67FMHMMHQH69R1ZFX5Y0VR`; rollback target is version `641`, image `registry.fly.io/concrete-ops-2:deployment-01KT65V9K2KK4G0V1R6QRXR9QG`. The deploy was run from a clean temporary git worktree at commit `ee851f7` so unrelated local brief/output files were not part of the release decision. Production backup before deploy produced `postgres-app-data-20260603-075124Z.json`, `uploads-20260603-075124Z`, and `uploads-20260603-075124Z.manifest.json` with 5 uploaded files. Predeploy checks passed: focused Phase 10 utility/import tests, broader 82-test Apex OS route/nav/permission suite, `npm.cmd run build`, `git diff --check` with CRLF warnings only, and desktop/mobile browser QA screenshots in `ui-audit/apex-control-room-phase10/`. Post-deploy checks passed: both production `/api/ready` endpoints returned ready/database ok, `https://concrete-ops-2.fly.dev/api/health` returned healthy, Fly status showed v642 started with 1 passing check, hosted skip-auth health/routes smoke passed on `https://app.apexhq.online/`, `/apex-control-room` served `index-DaDMI41p.js` and `app-domain-Ds8onq2Y.js` on both production hosts, unauthenticated `/api/apex-os/approval-packets` and `/api/apex-os/memory` returned 401, `/api/setup/status` showed setup complete, demo mode off, demo user absent, and public signup disabled, and logs showed startup health recovering quickly before route/ready checks passed. Production auth smoke/login was not run.
- The current shell is safe: no auth/session change, no binary upload storage, no embeddings/vector index, no streaming, no hidden microphone capture, no background microphone capture, no audio/transcript storage, no approval execution controls, no agent queue/run execution controls, no deploy, no rollback execution, no production monitoring provider changes, no external alerts, no production data mutation, no live sends, no ad spend, no billing/payment, no public publishing, no customer-visible send/publish/spend/delete behavior, no UI code-edit/test/git/deploy execution path, and no irreversible action path. Durable Apex OS memory, knowledge upload drafts, approval packet drafts/decision records, execution handoff drafts, agent control requests, and daily briefing history use the existing company settings persistence path instead of a new table. Ask Apex draft actions write only suggested decision memory or review-only approval packet drafts. Agent control requests record pause/resume/scoped-run intent only and do not start agents. Build awareness reads safe repo/runtime metadata only and excludes field/customer/private contractor data. PDF text extraction happens client-side only and stores reviewed text/source metadata, not the binary PDF. Ask Apex provider mode uses server-side `OPENAI_API_KEY` only when configured; local validation currently shows the key is missing, so local Ask Apex runs in source-backed fallback mode. The original Phase 12 Voice Interface remains click-to-record push-to-talk, while the Apex body Live Operator screen now uses a visible wake-gated open voice loop with server transcription, browser speech-caption fallback, safe browser speech playback fallback, and review-first Ask Apex handoff. Daily Briefing refresh and history save are private Apex OS briefing actions only.
- Visual QA artifacts: `ui-audit/apex-control-room-local/desktop-apex-control-room.png`, `ui-audit/apex-control-room-local/mobile-apex-control-room.png`, `ui-audit/apex-control-room-local/desktop-admin-blocked.png`, `ui-audit/apex-control-room-local/desktop-apex-control-room-qa-security.png`, `ui-audit/apex-control-room-local/mobile-apex-control-room-qa-security.png`, `ui-audit/apex-control-room-local/desktop-admin-blocked-qa-security.png`, `ui-audit/apex-control-room-local/desktop-apex-control-room-ask-apex-live.png`, `ui-audit/apex-control-room-local/desktop-admin-blocked-ask-apex-live.png`, `ui-audit/apex-control-room-local/desktop-apex-control-room-voice-transcript-ask.png`, `ui-audit/apex-control-room-local/desktop-apex-control-room-daily-briefing-refresh.png`, `ui-audit/apex-control-room-local/desktop-admin-blocked-daily-briefing-refresh.png`, `ui-audit/apex-os-phase-1-access-hard-finish/operator-desktop-access.png`, `ui-audit/apex-os-phase-1-access-hard-finish/operator-mobile-access.png`, `ui-audit/apex-os-phase-1-access-hard-finish/normal-admin-blocked.png`, `ui-audit/apex-os-phase-1-access-hard-finish/employee-mobile-blocked.png`, `ui-audit/apex-os-phase-1-access-hard-finish/operator-switched-company-blocked.png`, `ui-audit/apex-os-phase-5-knowledge-vault-desktop.png`, `ui-audit/apex-os-phase-5-knowledge-vault-mobile.png`, `ui-audit/apex-os-phase-5-knowledge-vault-desktop-focused.png`, `ui-audit/apex-os-phase-5-knowledge-vault-mobile-focused.png`, `ui-audit/apex-os-phase-5-knowledge-vault-pdf-duplicate-desktop.png`, and `ui-audit/apex-os-phase-5-knowledge-vault-pdf-mobile.png`.

## Apex OS Phase 1: Private Access And Identity Hard-Finish Report

Goal:

- Finish Phase 1 from the original Apex OS master plan before starting Phase 2: make Apex OS private to John/operator access and prove route, nav, API, bootstrap, direct-route, and company-workspace boundaries.

What was already built:

- `/apex-control-room` route, `apexControlRoom` module, `permissions.apexOs` bootstrap scope, private operator nav visibility, Control Room shell, and operator-only Apex OS APIs already existed.
- Existing access used `operatorAccess` plus office-level role checks.

What was completed now:

- Tightened Apex OS access so it also requires the default Apex HQ operating workspace.
- Kept company switching available for operators, but blocked Apex OS route/nav/API access after an operator switches into a customer/company workspace.
- Added clearer private access evidence in the Control Room: default Apex HQ workspace, `operatorAccess` flag, office role, and server bootstrap permission must all pass.
- Tightened tests for owner/operator, operator admin, normal owner/admin, estimator, foreman, employee, demo-user flag behavior, API denial, and switched-company blocking.
- Updated Phase 1 docs and roadmap status.

Risk level:

- Low. This is a permission hardening change only. No schema change, auth/session redesign, provider setup, production data mutation, deploy, customer-visible action, send, spend, billing/payment, deletion, or Phase 2 shell work was added.

Validation plan/results:

- Focused Phase 1 validation passed locally: `node --test --test-concurrency=1 shared/permissions.test.js shared/companyScope.test.js src/app-routing.test.js src/navigation-utils.test.js src/app-state-utils.test.js src/apex-control-room-utils.test.js src/app-navigation-components-import.test.js src/apex-control-room-components-import.test.js server/role-permissions.test.js server/company-scope.test.js server/apex-os-memory.test.js` with 99 passing tests.
- `npm.cmd run verify:roles` passed with 15 passing tests.
- `npm.cmd run build` passed with the existing large-chunk warnings.
- `git diff --check` passed with CRLF warnings only.
- Browser QA passed locally on `http://127.0.0.1:5173`: private operator desktop and mobile could access Apex Control Room and saw the access-proof text with no horizontal overflow; normal admin direct route redirected to `/`, showed no Apex OS nav/private surface, and `/api/apex-os/memory` returned 403; employee mobile direct route redirected to `/jobs`, showed no office/private Apex OS text, and `/api/apex-os/memory` returned 403; operator switched into a temporary customer workspace lost Apex OS bootstrap permission, route/nav/private surface, and API access returned 403.
- Browser QA artifacts: `ui-audit/apex-os-phase-1-access-hard-finish/operator-desktop-access.png`, `ui-audit/apex-os-phase-1-access-hard-finish/operator-mobile-access.png`, `ui-audit/apex-os-phase-1-access-hard-finish/normal-admin-blocked.png`, `ui-audit/apex-os-phase-1-access-hard-finish/employee-mobile-blocked.png`, and `ui-audit/apex-os-phase-1-access-hard-finish/operator-switched-company-blocked.png`.
- Local QA cleanup completed: `demo.ops@apexhq.app`, `demo.admin@apexhq.app`, `demo.foreman@apexhq.app`, and `demo.employee@apexhq.app` `operator_access` flags were restored to `0`, and the temporary `COMPANY-PHASE1-QA` company was removed.

Permissions impact:

- Permission hardening only. Apex OS now requires private operator access, an office role, default Apex HQ operating workspace, and server bootstrap permission. Normal admins, estimators, field users, employees, demo users without the flag, customer/company users, and switched customer-company workspaces remain blocked.

Mobile impact:

- Private operator mobile access was verified with no horizontal overflow. Employee mobile direct-route blocking was verified.

Field-user impact:

- Field users remain blocked from Apex OS, AI office tools, leads, estimates, pricing, profit/margins, payroll, office-only notes, admin settings, company setup, billing, and other company data.

Rollback plan:

- Revert the Phase 1 hard-finish commit to restore the previous `canAccessApexOs` role-plus-operator-only behavior and remove the added tests, access-proof text, and doc updates. No database migration or production data rollback is required.

Next recommended phase:

- After committing and pushing Phase 1, start Phase 2: Apex-Branded Control Room Shell. Do not start Phase 2 in the Phase 1 commit.

## Apex OS Phase 2: Apex-Branded Control Room Shell Hard-Finish Report

Goal:

- Finish Phase 2 from the original Apex OS master plan before hardening any later phase: make the private Apex Control Room shell match the required Apex HQ brand, KPI row, command-board panels, desktop/mobile layout, and field-user boundary.

What was already built:

- The private Apex Control Room route, Apex HQ logo/sidebar shell, operator topbar language, mobile nav order, and route behavior were already present.
- The page already had several later Apex OS panels, including Decision Memory, Agent Work Queue, Approval Command Center, Release Monitoring, and QA/Security Hardening.

What was completed now:

- Replaced the generic top KPI row with the original Phase 2 KPI requirements: `App Build Status`, `Active Agents`, `Launch Blockers`, and `Approvals`.
- Added an explicit first-screen command board with the original Phase 2 panels: `Apex Briefing`, `Priority Queue`, `Agents`, `Approvals`, and `Memory / Decisions`.
- Removed contractor/customer dashboard counts from the top KPI row so the private shell no longer presents jobs/leads/estimates as the primary Apex OS shell metrics.
- Hardened the mobile layout by stacking KPI cards on narrow screens, adding Control Room bottom spacing, and making the Apex OS mobile nav opaque on this page so content does not visually bleed through it.
- Added focused tests so the required Phase 2 KPI and command-board labels cannot regress silently.

Risk level:

- Low. This is shell/UI/state hardening only. No schema change, auth/session change, provider setup, production data mutation, customer-visible action, send, spend, billing/payment, deletion, or external execution path was added.

Validation plan/results:

- Focused Phase 2 tests passed locally: `node --test --test-concurrency=1 src/apex-control-room-utils.test.js src/apex-control-room-components-import.test.js src/navigation-utils.test.js src/mobile-nav-utils.test.js src/app-navigation-components-import.test.js src/app-topbar-components-import.test.js` with 32 passing tests.
- `npm.cmd run verify:roles` passed with 15 passing tests.
- `npm.cmd run build` passed with the existing large-chunk warnings.
- Browser QA passed locally on `http://127.0.0.1:5173` with a mocked private Apex HQ operator bootstrap that contained no customer/demo records: desktop `/apex-control-room` showed the required KPIs and panels, no horizontal overflow, and no contractor Today content; mobile `/jobs` redirected to `/apex-control-room`, showed the required KPIs, no horizontal overflow, no contractor Today content, opaque Apex OS bottom nav, and zero actionable overlap; field mobile direct route to `/apex-control-room` redirected to `/jobs` with no Apex Control Room or Apex OS nav exposure.
- Production release was approved and deployed on 2026-06-03 from commit `eb6595f` to Fly app `concrete-ops-2`, machine `148e06e2b53d68`, version `634`, image `registry.fly.io/concrete-ops-2:deployment-01KT5SASRM9Z1ZTW1RY0S39Y3A`; rollback target is version `633`, image `registry.fly.io/concrete-ops-2:deployment-01KT5Q7T38PVKCT8C1J21KXJNN`.
- Post-deploy checks passed: `https://app.apexhq.online/api/ready` and `https://concrete-ops-2.fly.dev/api/ready` returned `ready` with `database: ok`; `https://concrete-ops-2.fly.dev/api/health` returned `healthy`; hosted skip-auth smoke against `https://app.apexhq.online/` passed health and route checks; `/apex-control-room` served the new `index-CMX1-HtE.js` and `app-domain-k09aT8xJ.js` bundles on both production hosts; unauthenticated `/api/apex-os/memory` returned 401; Fly status showed version `634` started with 1 passing check; logs showed normal API startup, health passing, and successful `/api/ready`, `/api/health`, `/apex-control-room`, and route-smoke requests.
- Production auth smoke/login was not run in this release pass; this was a skip-auth health/route/bundle/API-denial production check only.

Permissions impact:

- No permission loosening. Apex OS remains private operator-only through the existing access gate and default Apex HQ operating workspace boundary.

Mobile impact:

- Mobile KPI cards now stack at narrow widths, the Control Room page has mobile bottom-nav clearance, and the Apex OS mobile nav is opaque on the Control Room page.

Field-user impact:

- Field users remain blocked from Apex OS, AI office tools, leads, estimates, pricing, profit/margins, payroll, office notes, admin settings, billing, customer data, and private Apex HQ knowledge.

Rollback plan:

- Revert the Phase 2 hard-finish commit to restore the prior generic KPI row, remove the first-screen Phase 2 command board, remove the Control Room mobile spacing/nav-opacity CSS hook, and remove the new focused assertions. No database migration or production data rollback is required.

Next recommended phase:

- Phase 2 is hard-finished, deployed, and ready to freeze. Continue phase-by-phase with Phase 3 hardening; do not start Phase 4/5 rework inside the Phase 3 pass.

## Apex OS Phase 3: Apex OS State Aggregator Hard-Finish Report

Goal:

- Finish Phase 3 from the original Apex OS master plan before hardening any later phase: make Apex OS derive read-only operating state from existing Apex HQ systems, show where the state came from, and prove blocked roles receive no Apex OS state.

What was already built:

- `deriveApexControlRoomState` already aggregated Agent OS task/run helpers, launch readiness, release safety, enterprise trust/audit readiness, queue state, visible workspace records, approval gates, and recent evidence.
- The private Control Room already showed Operating Signals, Next Best Actions, Launch Readiness, Release Desk, Agent Control, Approval Gates, and Recent Evidence.

What was completed now:

- Added a first-class Phase 3 State Packet covering current branch evidence when supplied, build/test evidence, phase status, launch blockers, blocked approval packets, approval gates, agents, release packet rows, business queues, source groups, confidence labels, and the read-only mutation boundary.
- Added source/confidence/read-only metadata to derived state rows so the Control Room shows the origin and confidence of operating signals, next actions, and agent/release/business state.
- Added tests proving blocked users receive no Phase 3 aggregator rows and private operators receive the branch/build/test/phase/blocker/read-only packet.
- Kept missing branch/build/test evidence honest: the runtime does not invent git state; it shows `Evidence required` until private build evidence or audit rows are supplied.

Risk level:

- Low. This is read-only state/UI/test hardening only. No schema change, auth/session change, provider setup, production data mutation, customer-visible action, send, spend, billing/payment, deletion, deploy, external execution path, or Phase 4/5 rebuild was added.

Validation plan/results:

- Focused Phase 3 tests passed locally: `node --test --test-concurrency=1 src/apex-control-room-utils.test.js src/apex-control-room-components-import.test.js`.
- Phase 3 access/routing suite passed locally: `node --test --test-concurrency=1 src/apex-control-room-utils.test.js src/apex-control-room-components-import.test.js src/navigation-utils.test.js src/mobile-nav-utils.test.js src/app-routing.test.js server/role-permissions.test.js server/company-scope.test.js` with 74 passing tests.
- `npm.cmd run verify:roles` passed with 15 passing tests.
- `npm.cmd run build` passed with the existing large-chunk warnings.
- `git diff --check` passed with CRLF warnings only.
- Browser QA passed locally on `http://127.0.0.1:4313` with mocked private operator and field bootstrap payloads: desktop and mobile `/apex-control-room` showed `Phase 3 State Packet`, `Current branch`, `Confidence:`, and `Read-only` with no horizontal overflow, no console errors, and no failed requests; field mobile direct route to `/apex-control-room` redirected to `/jobs` and exposed no Apex OS text.
- Browser QA artifacts: `ui-audit/apex-os-phase-3-state-hard-finish/operator-desktop-phase3.png`, `ui-audit/apex-os-phase-3-state-hard-finish/operator-mobile-phase3.png`, and `ui-audit/apex-os-phase-3-state-hard-finish/field-mobile-blocked.png`.
- Production release was approved and deployed on 2026-06-03 from commit `0685fdf` to Fly app `concrete-ops-2`, machine `148e06e2b53d68`, version `635`, image `registry.fly.io/concrete-ops-2:deployment-01KT5TJ888A2QCGXEQNH5R6CW1`; rollback target is version `634`, image `registry.fly.io/concrete-ops-2:deployment-01KT5SASRM9Z1ZTW1RY0S39Y3A`.
- Post-deploy checks passed: `https://app.apexhq.online/api/ready` and `https://concrete-ops-2.fly.dev/api/ready` returned `ready` with `database: ok`; `https://concrete-ops-2.fly.dev/api/health` returned `healthy`; Fly status showed version `635` started with 1 passing check; hosted skip-auth smoke against `https://app.apexhq.online/` passed health and route checks; `/apex-control-room` served the new `index-B_CmgdAl.js` and `app-domain-Dp8nvj_S.js` bundles on both production hosts; unauthenticated `/api/apex-os/memory` returned 401; `/api/setup/status` showed production demo mode off and public signup disabled; production logs showed normal startup, `/api/ready`, `/api/health`, `/apex-control-room`, and route-smoke requests passing.
- A production `/.env` probe returned the app HTML shell with no environment assignments. Production auth smoke/login was not run in this release pass; this was a skip-auth health/route/bundle/API-denial production check only.

Permissions impact:

- No permission loosening. Apex OS state remains private operator-only, and blocked users receive an empty restricted `phase3Aggregator` state.

Mobile impact:

- Mobile Control Room renders the Phase 3 State Packet in the existing responsive stack with no horizontal overflow.

Field-user impact:

- Field users remain blocked from Apex OS, AI office tools, leads, estimates, pricing, profit/margins, payroll, office notes, admin settings, billing, customer data, and private Apex HQ state.

Rollback plan:

- Revert the Phase 3 hard-finish commit to remove the Phase 3 State Packet, derived-state source/confidence labels, and focused assertions. No database migration, provider rollback, production data rollback, or auth/session rollback is required.

Next recommended phase:

- Phase 3 is hard-finished, deployed, and ready to freeze. Continue phase-by-phase with Phase 4 hardening/completion audit; do not start Phase 5 work inside the Phase 4 pass.

## Apex OS Phase 4: Decision Memory And Operating Rules Completion Report

Goal:

- Finish Phase 4 from the original Apex OS master plan before starting Phase 5.

What was already built:

- Read-only seeded Decision Memory and Operating Rules were already visible in the private Apex Control Room.
- Operator-only `/api/apex-os/memory` endpoints already persisted `apexOsMemory` in existing company settings, required source labels, rejected secrets/customer emails, supported suggested/approved/archived states, and logged audit/activity rows.

What was completed now:

- Added the original Phase 4 category model: product identity, safety rule, roadmap decision, build freeze, business goal, provider/account decision, and personal preference.
- Added build-freeze and business-goal seeded memory rows.
- Moved durable memory into the Decision Memory state instead of only the Knowledge Vault summary.
- Added a private "What Did I Decide?" Control Room view with draft, load, manual approve, and archive controls.
- Kept newly drafted memory suggested by default so it does not become operating context until explicitly approved.
- Updated focused tests and docs to mark Phase 4 complete.

Hard-finish completed now:

- Separated Phase 4 decision-memory rows from Phase 5 knowledge-vault rows so uploaded knowledge no longer appears as a decision in the "What Did I Decide?" view.
- Added decision-memory source/category/status/text browsing, active source/title duplicate blocking in the UI, server-side active duplicate rejection through `/api/apex-os/memory`, review-history display, and a copyable private JSON export for matching decisions.
- Added decision-memory utility coverage for source summaries, review history, filters, duplicate detection, and category separation.

Risk level:

- Low. This uses existing company settings persistence and existing operator-only Apex OS API guards. No schema, auth/session, provider, production, customer-visible, billing/payment, send, spend, deletion, or Phase 5 upload/parser work was added.

Validation plan/results:

- Focused Phase 4 validation passed locally: `node --test --test-concurrency=1 shared/apexOsMemory.test.js server/apex-os-memory.test.js src/apex-control-room-utils.test.js src/apex-control-room-components-import.test.js shared/permissions.test.js server/role-permissions.test.js` with 30 passing tests.
- Broader Apex OS route/nav/bootstrap validation passed locally: `node --test --test-concurrency=1 shared/permissions.test.js src/app-routing.test.js src/navigation-utils.test.js src/app-navigation-components-import.test.js src/apex-control-room-utils.test.js src/apex-control-room-components-import.test.js server/role-permissions.test.js server/apex-os-memory.test.js` with 68 passing tests.
- `npm.cmd run build` passed with the existing large-chunk warnings.
- Browser QA passed locally on `http://127.0.0.1:5173/apex-control-room`: private operator desktop drafted a local-only decision memory row, saw active duplicate blocking, searched/filtered it, manually approved it, archived it, and confirmed it appeared in the private export; private operator desktop and mobile showed no horizontal overflow; normal admin direct-route QA exposed no Apex Control Room, Decision Memory, or "What Did I Decide?" content and `/api/apex-os/memory` returned 403.
- QA screenshots: `ui-audit/apex-control-room-local/desktop-apex-control-room-phase-4-hard-finish.png`, `ui-audit/apex-control-room-local/mobile-apex-control-room-phase-4-hard-finish.png`, and `ui-audit/apex-control-room-local/desktop-admin-blocked-phase-4-hard-finish.png`.
- The browser-created QA memory row was removed from local data after validation, and `demo.ops@apexhq.app` / `demo.admin@apexhq.app` `operator_access` flags were restored to `0`.

Permissions impact:

- No permission loosening. Memory APIs and UI remain private operator-only through the Apex OS access gate.

Mobile impact:

- The new memory panel uses existing responsive Control Room card/form patterns. Private operator mobile browser QA passed with no horizontal overflow.

Field-user impact:

- None. Field users remain blocked from Apex OS, AI office tools, leads, estimates, pricing, profit/margins, payroll, office notes, admin settings, billing, and other company data.

Rollback plan:

- Revert the Phase 4 completion commit to remove the added decision categories, "What Did I Decide?" UI, API client helpers, test updates, and doc updates. No database migration or production data rollback is required.

Next recommended phase:

- Stop after committing and pushing Phase 4. Do not start Phase 5 in this pass.

## Apex OS Phase 5: Knowledge Upload Vault Completion Report

Goal:

- Finish Phase 5 from the original Apex OS master plan only: let John upload what Apex needs to know without starting Phase 6.

What was already built:

- The Control Room already mapped the 8 Phase 5 vault categories, source candidates, and vault safety gates.
- Durable private Apex OS memory already existed through existing company settings as `apexOsMemory`, with suggested/approved/archived states, source-label requirements, secret/email rejection, operator-only API access, and audit/activity logging.

What was completed now:

- Added a private Knowledge Upload Vault panel inside the Apex Control Room.
- Added manual note and local text-file intake for the original Phase 5 categories: Apex HQ app docs, business strategy, marketing/sales, customer research, legal/risk review notes, brand/design assets, product ideas, and private owner notes.
- Added source metadata, review status, and summary status through source label, source URI, suggested/approved/archived status, and review note fields.
- Added client-side PDF text extraction for private PDF intake without storing binary PDFs.
- Added search plus category/source/review-state filters for saved vault rows.
- Hardened duplicate-source guarding so an active source URI or source label/title cannot be silently saved twice inside the same vault category from the vault panel.
- Added vault review-history display and copyable private knowledge export for matching vault rows.
- Added manual approve/archive controls so suggested upload knowledge does not become trusted Apex context until reviewed.
- Added server-side protection that forces `knowledge-upload` entries in Phase 5 knowledge categories to start as `suggested`, even if a client sends `approved`.
- Added shared vault classification, summary, review-history, filter, and duplicate-safety helpers plus focused tests.

Risk level:

- Low. Phase 5 reused the existing private Apex OS memory setting and operator-only API guards. No schema change, auth/session change, binary file storage, server parser service, embeddings/vector index, provider setup, model call, production data mutation, deploy, customer-visible action, public publishing, send, spend, billing/payment, or deletion was added.

Validation plan/results:

- Focused Phase 5 validation passed locally: `node --test --test-concurrency=1 shared/apexOsMemory.test.js src/apex-control-room-utils.test.js src/apex-control-room-components-import.test.js server/apex-os-memory.test.js shared/permissions.test.js server/role-permissions.test.js`.
- Broader Apex OS route/nav/permission validation passed locally: `node --test --test-concurrency=1 shared/permissions.test.js src/app-routing.test.js src/navigation-utils.test.js src/app-navigation-components-import.test.js src/apex-control-room-utils.test.js src/apex-control-room-components-import.test.js server/role-permissions.test.js server/apex-os-memory.test.js` with 68 passing tests.
- `npm.cmd run build` passed with existing large-chunk warnings.
- `git diff --check` passed with CRLF warnings only.
- Browser QA passed locally on `http://127.0.0.1:5173/apex-control-room`: private operator desktop loaded the vault, drafted local text knowledge as suggested, verified category-scoped duplicate blocking, verified vault review history and private export, searched/filtered it, approved it into trusted memory, archived it, and showed no horizontal overflow; private operator mobile showed the vault with no horizontal overflow; normal admin direct-route QA exposed no Knowledge Upload Vault and `/api/apex-os/memory` returned 403.
- PDF hardening browser QA passed locally: private operator desktop extracted text from a PDF into the review body, stored PDF extraction metadata in the summary-status field, blocked a duplicate active source, approved the PDF-derived knowledge into trusted memory, and preserved no horizontal overflow; private operator mobile still showed the vault with no horizontal overflow; normal admin direct-route QA still redirected to `/` with no Knowledge Upload Vault exposed.
- Browser-created QA memory rows were removed from local data after validation, and `demo.ops@apexhq.app` / `demo.admin@apexhq.app` `operator_access` flags were restored to `0`.

Permissions impact:

- No permission loosening. Vault UI and memory APIs remain private operator-only through the existing Apex OS access gate.

Mobile impact:

- The vault uses existing responsive Control Room form/card patterns. Private operator mobile browser QA passed with no horizontal overflow.

Field-user impact:

- None. Field users remain blocked from Apex OS, AI office tools, leads, estimates, pricing, profit/margins, payroll, office notes, admin settings, billing, customer data, and private Apex HQ knowledge.

Rollback plan:

- Revert the Phase 5 completion commit to remove the Knowledge Upload Vault UI, vault helpers/tests, and server-side knowledge-upload suggested-state guard. No database migration or production data rollback is required.

Next recommended phase:

- Stop after committing and pushing Phase 5. Do not start Phase 6 until John asks for it after Phase 5 is verified.

Validation:

- `node --test --test-concurrency=1 shared/permissions.test.js src/app-routing.test.js src/navigation-utils.test.js src/app-state-utils.test.js src/mobile-nav-utils.test.js src/app-navigation-components-import.test.js src/apex-control-room-utils.test.js src/apex-control-room-components-import.test.js server/role-permissions.test.js` passed with 77 tests.
- `npm.cmd run build` passed.
- `git diff --check` passed with CRLF warnings only.
- Browser QA passed for private operator desktop, private operator mobile with no horizontal overflow, and normal admin blocked/redirected away from Apex OS.
- Final hardening browser QA passed for private operator desktop/mobile hardening panels with no horizontal overflow; normal admin direct-route check redirected to `/` and exposed no Apex Control Room or QA / Security Hardening content.
- The local `demo.ops@apexhq.app` `operator_access` flag was temporarily set to `1` only for browser QA and restored to `0` after screenshots.

## Apex OS Phase 6: Ask Apex Chat Hard-Finish Report

Goal:

- Finish Phase 6 from the original Apex OS master plan before starting Phase 7: give John a private Ask Apex text chat for app/code, docs/memory, business, launch, agents, and all-context questions with source-backed answers and review-only follow-up actions.

What was already built:

- The private Control Room already had first-pass Ask Apex UI lanes, an operator-only `/api/apex-os/ask` endpoint, local source-backed fallback, server-side OpenAI provider readiness, and basic answer rendering.

What was completed now:

- Added real selectable context scopes and passed the selected scope through `/api/apex-os/ask`.
- Filtered approved Apex OS memory and source rows by scope, and returned ranked `evidenceUsed` rows from the API.
- Added an "Evidence used" drawer with ranked source rows on the Apex answer card.
- Added review-only Save as decision, Create task draft, and Needs approval actions.
- Save as decision creates suggested decision memory only; Create task draft and Needs approval create review-only approval packet drafts only.
- Kept execution locked: no approve/run/deploy/send/spend/publish/customer-visible action, production mutation, schema change, frontend provider secret, billing/payment action, or irreversible action path was added.

Affected files:

- `shared/apexOsAsk.js`
- `shared/apexOsAsk.test.js`
- `server/index.js`
- `server/apex-os-memory.test.js`
- `src/apex-control-room-components.jsx`
- `src/apex-control-room-components-import.test.js`
- `src/apex-control-room-utils.js`
- `src/apex-control-room-utils.test.js`
- `docs/APEX_HQ_APEX_OS_COMMAND_CENTER_MASTER_PLAN.md`
- `docs/APEX_HQ_APEX_OS_HARD_FINISH_ROADMAP.md`
- `docs/APEX_HQ_LIVING_FINISH_PLAN.md`

Risk level:

- Low to medium. The change adds private operator-only draft writes to existing Apex OS memory and approval-packet storage, but does not add schema, auth/session, provider secrets, production mutation, external execution, or customer-visible behavior.

Validation:

- Focused Phase 6 tests passed: `node --test --test-concurrency=1 shared/apexOsAsk.test.js shared/apexOsMemory.test.js shared/apexOsApprovalPackets.test.js server/apex-os-memory.test.js src/apex-control-room-utils.test.js src/apex-control-room-components-import.test.js shared/permissions.test.js server/role-permissions.test.js` with 39 tests.
- Broader Apex OS route/nav/permission validation passed: `node --test --test-concurrency=1 shared/permissions.test.js src/app-routing.test.js src/navigation-utils.test.js src/app-navigation-components-import.test.js src/apex-control-room-utils.test.js src/apex-control-room-components-import.test.js server/role-permissions.test.js server/apex-os-memory.test.js` with 68 tests.
- `npm.cmd run build` passed with the existing large-chunk warnings only.
- Browser QA passed locally on `http://127.0.0.1:5173/apex-control-room`: private operator desktop selected Launch context, asked a production-release question, received an Apex answer with ranked evidence, approval warnings, and draft action controls, then saved a suggested decision draft, created a task draft, and created a needs-approval packet draft.
- Private operator mobile browser QA passed at 390px wide with Ask Apex visible and no horizontal overflow.
- Normal admin direct-route browser QA exposed no Ask Apex content, and admin `POST /api/apex-os/ask` returned 403.
- Temporary local Ask Apex QA memory/approval rows were removed after browser QA, and `demo.ops@apexhq.app` / `demo.admin@apexhq.app` `operator_access` flags were restored to `0`.

Production release state:

- Production release was approved in chat and deployed on 2026-06-03 from clean commit `94a6f69` to Fly app `concrete-ops-2`, machine `148e06e2b53d68`, version `638`, image `registry.fly.io/concrete-ops-2:deployment-01KT5Z6DBGHPW3T48S88FAG8AZ`.
- Rollback target is version `637`, image `registry.fly.io/concrete-ops-2:deployment-01KT5XKN0KJ36YSXNV3Y0AJGRA`.
- Predeploy checks passed from the clean release worktree: focused Phase 6 suite, broader Apex OS route/nav/permission suite, `npm.cmd run verify:roles`, `npm.cmd run verify:server`, `npm.cmd run verify:backup`, `npm.cmd run verify:restore`, `npm.cmd run build`, and `git diff --check`.
- Post-deploy checks passed: both production `/api/ready` endpoints returned ready/database ok, `https://concrete-ops-2.fly.dev/api/health` returned healthy, Fly status showed v638 started with 1 passing check, hosted skip-auth health/routes smoke passed, `/apex-control-room` served the new bundle, unauthenticated `/api/apex-os/ask` returned 401, `/api/setup/status` showed demo mode off and public signup disabled, and logs showed startup health recovering quickly before route/ready checks passed.
- Production auth smoke/login was not run.

Permissions impact:

- Private operator-only access remains required through existing Apex OS route/API gates.
- Normal admins, estimators, field users, customer/company users, and switched customer-company workspaces remain blocked from Ask Apex and `/api/apex-os/ask`.
- Draft actions stay review-only and do not grant execution, approval, external-send, deploy, provider, billing, or production-data permission.

Mobile impact:

- Ask Apex remains inside the responsive Control Room layout. Mobile browser QA passed with no horizontal overflow.

Field-user impact:

- None. Field users remain blocked from Apex OS, Ask Apex, AI office tools, leads, estimates, pricing, profit/margins, payroll, office notes, admin settings, billing, provider context, and private Apex HQ memory.

Rollback plan:

- Revert the Phase 6 completion commit to remove context-scoped Ask Apex responses, ranked evidence rows, and review-only draft actions. No database migration or production data rollback is required because only existing private company-settings storage is used and local QA draft rows were cleaned up.

Next recommended phase:

- Stop after committing and pushing Phase 6. Do not start Phase 7 until John asks for it after Phase 6 is verified.

## Apex OS Phase 7: Agent Control Plane Hard-Finish Report

Goal:

- Finish Phase 7 from the original Apex OS master plan before starting Phase 8: let John see and control Apex agents from Apex OS with roster status, current task, last update, next action, pause/resume request flow, report history, handoff summaries, and safety locks.

What was already built:

- The private Control Room already had read-only Agent Work Queue, Agent Run Ledger, Agent Safety Locks, Locked Agent Tasks, and durable safe execution handoff drafts.
- Existing handoffs prepared scoped work packages only and did not approve, queue, run, deploy, send, spend, publish, configure providers, mutate production, change schema, delete, or perform irreversible actions.

What was completed now:

- Added a full seven-role Agent Control Plane roster for build, QA, release, marketing, sales, customer success, and monitoring.
- Derived running, paused, blocked, done, and needs-approval states from Agent OS run rows, execution handoffs, and durable control requests.
- Added current task, last update, next action, report count, handoff count, and request count to each agent row.
- Added durable operator-only pause, resume, and scoped-run request storage through existing company settings as `apexOsAgentControlRequests`.
- Added operator-only `/api/apex-os/agent-control`, `POST /api/apex-os/agent-control/requests`, and `PATCH /api/apex-os/agent-control/requests/:id`.
- Added requested/ready/blocked/closed/archived states only, readiness-field requirements, source-label requirements, secret/email rejection, audit/activity logging, and Control Room request/load/mark-ready/block/close/archive UI.
- Kept queue/run/execute/background-loop controls locked.

Affected files:

- `shared/apexOsAgentControl.js`
- `shared/apexOsAgentControl.test.js`
- `shared/permissions.js`
- `server/store.js`
- `server/index.js`
- `server/apex-os-memory.test.js`
- `src/api.js`
- `src/apex-control-room-utils.js`
- `src/apex-control-room-utils.test.js`
- `src/apex-control-room-components.jsx`
- `src/apex-control-room-components-import.test.js`
- `docs/APEX_HQ_APEX_OS_COMMAND_CENTER_MASTER_PLAN.md`
- `docs/APEX_HQ_APEX_OS_HARD_FINISH_ROADMAP.md`
- `docs/APEX_HQ_LIVING_FINISH_PLAN.md`

Risk level:

- Low to medium. The change adds private operator-only durable request writes to existing company-settings storage, but does not add schema, auth/session, provider secrets, production mutation, customer-visible behavior, external execution, or a queue/run endpoint.

Validation:

- Focused Phase 7 utility tests passed: `node --test shared/apexOsAgentControl.test.js` with 4 tests.
- Focused Phase 7 UI/API suite passed: `node --test --test-concurrency=1 src/apex-control-room-utils.test.js src/apex-control-room-components-import.test.js server/apex-os-memory.test.js` with 9 tests.
- Broader Apex OS route/nav/permission validation passed: `node --test --test-concurrency=1 shared/apexOsAgentControl.test.js shared/permissions.test.js src/app-routing.test.js src/navigation-utils.test.js src/app-navigation-components-import.test.js src/apex-control-room-utils.test.js src/apex-control-room-components-import.test.js server/role-permissions.test.js server/apex-os-memory.test.js` with 73 tests.
- `npm.cmd run build` passed with the existing large-chunk warnings only.
- `git diff --check` passed for Phase 7 files with CRLF warnings only.
- Browser QA passed on an isolated temporary local database: operator login, `/apex-control-room`, Agent Control Plane visible, scoped control request creation, mark-ready flow, locked execution labels, and no horizontal overflow at 1440px desktop or 390px mobile.

Production release state:

- Phase 7 was committed as `0aef694` and pushed to `origin/codex/apex-os-command-center`.
- Production release was approved in chat and deployed on 2026-06-03 from clean commit `0aef694` to Fly app `concrete-ops-2`, machine `148e06e2b53d68`, version `639`, image `registry.fly.io/concrete-ops-2:deployment-01KT60X0SWR6QZWJKQC407W4VC`.
- Rollback target is version `638`, image `registry.fly.io/concrete-ops-2:deployment-01KT5Z6DBGHPW3T48S88FAG8AZ`.
- Predeploy backup produced `postgres-app-data-20260603-055635Z.json`, `uploads-20260603-055635Z`, and `uploads-20260603-055635Z.manifest.json`.
- Post-deploy checks passed: both production `/api/ready` endpoints returned ready/database ok, `https://concrete-ops-2.fly.dev/api/health` returned healthy, Fly status showed v639 started with 1 passing check, hosted skip-auth health/routes smoke passed, `/apex-control-room` served, unauthenticated `/api/apex-os/agent-control` returned 401, and `/api/setup/status` showed setup complete, demo mode off, demo user absent, and public signup disabled.
- Production auth smoke/login was not run.

Permissions impact:

- Private operator-only access remains required through existing Apex OS route/API gates.
- Normal admins, estimators, field users, customer/company users, switched customer-company workspaces, and unauthenticated visitors remain blocked from Agent Control Plane APIs.
- Control requests do not grant execution, approval, external-send, deploy, provider, billing, money, customer-visible, deletion, or production-data permissions.

Mobile impact:

- The Agent Control Plane lives inside the responsive Control Room layout. Mobile browser QA passed at 390px with no horizontal overflow.

Field-user impact:

- None. Field users remain blocked from Apex OS, agents, AI office tools, leads, estimates, pricing, profit/margins, payroll, office notes, admin settings, billing, provider context, and private Apex HQ memory.

Rollback plan:

- Roll back Fly to version `638` if hosted health fails. In code, revert commit `0aef694` to remove the Agent Control Plane utility, API endpoints, UI, tests, and docs updates.
- No database migration rollback is required because Phase 7 uses existing company-settings persistence. Existing `apexOsAgentControlRequests` values are inert private operator records and can be ignored or archived.

Next recommended phase:

- Start Phase 8 only after Phase 7 release evidence is committed and pushed.

## Apex OS Phase 8: Approval Command Center Hard-Finish Report

Goal:

- Finish Phase 8 from the original Apex OS master plan before starting Phase 9: centralize every risky action that needs owner approval, require complete approval packets, allow approve/reject/defer review decisions where safe, and keep irreversible execution separate and locked.

What was already built:

- The private Control Room already had approval categories, packet requirement copy, source rows, and durable approval packet drafts in `apexOsApprovalPackets`.
- Existing packets were draft/ready/blocked/archived records only and did not support durable approval/rejection/deferral decisions, exact phrase enforcement, packet templates, or risk scoring.

What was completed now:

- Added approval packet templates for deploy, schema/auth/session, email/SMS, billing/payment, and provider/API setup, with required evidence and exact approval phrases.
- Added packet risk scoring and bands from category, declared risk level, and missing readiness fields.
- Added durable `approved`, `rejected`, and `deferred` decision states with actor/timestamp fields, exact approval phrase enforcement, and audit/activity history.
- Added server-side rejection for executed/running/queued states, unsafe packet text, incomplete ready/approved packets, and approval attempts without exact phrase confirmation.
- Updated the Control Room Approval Command Center with packet templates, risk scoring, exact phrase entry, record approval, reject, defer, and execute-locked UI.
- Kept execution, deploy, production mutation, provider setup, send, spend, billing/payment, customer-visible actions, deletion, schema/auth/session change, and irreversible actions locked.

Affected files:

- `shared/apexOsApprovalPackets.js`
- `shared/apexOsApprovalPackets.test.js`
- `server/index.js`
- `server/apex-os-memory.test.js`
- `src/apex-control-room-utils.js`
- `src/apex-control-room-utils.test.js`
- `src/apex-control-room-components.jsx`
- `src/apex-control-room-components-import.test.js`
- `docs/APEX_HQ_APEX_OS_COMMAND_CENTER_MASTER_PLAN.md`
- `docs/APEX_HQ_APEX_OS_HARD_FINISH_ROADMAP.md`
- `docs/APEX_HQ_BUILD_STATUS_AND_PHASES.md`
- `docs/APEX_HQ_LIVING_FINISH_PLAN.md`

Risk level:

- Low to medium. The change adds private operator-only approval decision records through existing company-settings storage, but does not add schema, auth/session changes, provider secrets, production mutation, customer-visible behavior, external execution, queue/run endpoints, or money movement.

Validation:

- Focused Phase 8 suite passed: `node --test --test-concurrency=1 shared/apexOsApprovalPackets.test.js server/apex-os-memory.test.js src/apex-control-room-utils.test.js src/apex-control-room-components-import.test.js` with 13 tests.
- Broader Apex OS route/nav/permission validation passed: `node --test --test-concurrency=1 shared/apexOsApprovalPackets.test.js shared/apexOsAgentControl.test.js shared/permissions.test.js src/app-routing.test.js src/navigation-utils.test.js src/app-navigation-components-import.test.js src/apex-control-room-utils.test.js src/apex-control-room-components-import.test.js server/role-permissions.test.js server/apex-os-memory.test.js` with 77 tests.
- `npm.cmd run build` passed with the existing large-chunk warnings only.
- `git diff --check` passed for Phase 8 files with CRLF warnings only.
- Browser QA passed on an isolated temporary local database at 1440px desktop and 390px mobile: Approval Command Center visible, approval packet drafting/ready/approval/reject/defer controls worked, execution stayed disabled, no horizontal overflow, and final screenshot evidence was saved under `ui-audit/apex-control-room-phase8/`.
- Active local database cleanup verification passed: `demo.ops@apexhq.app` operator access is `0`, and no temporary Phase 8 QA packets remain.

Production release state:

- Phase 8 was committed as `be2dccb` and pushed to `origin/codex/apex-os-command-center`.
- Production release was approved in chat and deployed on 2026-06-03 from clean commit `be2dccb` to Fly app `concrete-ops-2`, machine `148e06e2b53d68`, version `640`, image `registry.fly.io/concrete-ops-2:deployment-01KT63SPFM2EM1SVEHK24148G8`.
- Rollback target is version `639`, image `registry.fly.io/concrete-ops-2:deployment-01KT60X0SWR6QZWJKQC407W4VC`.
- Predeploy backup produced `postgres-app-data-20260603-064657Z.json`, `uploads-20260603-064657Z`, and `uploads-20260603-064657Z.manifest.json`.
- Post-deploy checks passed: both production `/api/ready` endpoints returned ready/database ok, `https://concrete-ops-2.fly.dev/api/health` returned healthy, Fly status showed v640 started with 1 passing check, hosted skip-auth health/routes smoke passed, `/apex-control-room` served the new `index-CbknD5jw.js` and `app-domain-EKFHwEPQ.js` bundles on both production hosts, unauthenticated `/api/apex-os/approval-packets` returned 401, `/api/setup/status` showed setup complete, demo mode off, demo user absent, and public signup disabled, and logs showed startup health recovering quickly before route/ready checks passed.
- Production auth smoke/login was not run.

Permissions impact:

- Private operator-only access remains required through existing Apex OS route/API gates.
- Normal admins, estimators, field users, customer/company users, switched customer-company workspaces, and unauthenticated visitors remain blocked from Approval Command Center APIs.
- Approval decision records do not grant execution, agent queue/run, external-send, deploy, provider, billing, money, customer-visible, deletion, auth/session, schema, or production-data permissions.

Mobile impact:

- The Approval Command Center lives inside the responsive Control Room layout. Mobile browser QA passed at 390px with no horizontal overflow, stacked packet summary cards, and locked execution visible.

Field-user impact:

- None. Field users remain blocked from Apex OS, approval packets, agents, AI office tools, leads, estimates, pricing, profit/margins, payroll, office notes, admin settings, billing, provider context, and private Apex HQ memory.

Rollback plan:

- Roll back Fly to version `639` if hosted health fails. In code, revert commit `be2dccb` to remove the approval templates, risk scoring, decision states, exact phrase enforcement, UI changes, tests, and docs updates.
- No database migration rollback is required because Phase 8 uses existing company-settings persistence. Existing `apexOsApprovalPackets` values are inert private operator records and can be ignored, rejected, deferred, or archived.

Next recommended phase:

- Start Phase 9 only after Phase 8 release evidence is committed and pushed.

## Apex OS Phase 9: App Build And Code Awareness Hard-Finish Report

Goal:

- Finish Phase 9 from the original Apex OS master plan before starting Phase 10: give Apex OS real source-backed knowledge of the current app/build state while keeping all code, test, git, deploy, CI, and production actions outside the UI.

What was already built:

- The Phase 3 state aggregator had placeholder build/status slots and could show branch/build/test evidence if those values were manually supplied.
- Release Desk and Monitoring panels already displayed read-only release rows, daily briefing rows, and locked deploy/rollback controls.
- No real server-side build-awareness collector, git/status parser, source-link sanitizer, or operator-only build awareness endpoint existed yet.

What was completed now:

- Added a shared read-only build-awareness snapshot covering current branch, head SHA, git availability, sanitized changed files, recent commits, build script status, verification-script status, latest deploy evidence, known blockers, frozen phase rows, source links, safety locks, and source-backed next-safe-task recommendation.
- Added safe file reference handling that rejects absolute paths, drive-letter paths, parent traversal, null bytes, and invalid references before anything is shown in Apex OS.
- Added operator-only `GET /api/apex-os/build-awareness`, protected by the existing private Apex OS management gate.
- Added a server collector that reads local git branch/status/head/recent commits, `package.json` scripts, `dist/assets`, Apex OS source docs, and runtime metadata. It degrades honestly to runtime metadata when git/docs are unavailable in production images.
- Added the private Control Room App Build Awareness panel with changed file map, known blockers, frozen phase map, source links, recent commits, read-only/no-UI-file-edit locks, and manual refresh.
- Threaded build awareness into the top App Build Status KPI and priority queue so the shell can recommend the next safe phase task from real source evidence.
- Kept every action locked: no UI code editing, no test execution, no commit, no push, no deploy, no rollback, no CI/GitHub write, no provider setup, no production mutation, no field/customer data exposure, and no irreversible action path.

Affected files:

- `shared/apexOsBuildAwareness.js`
- `shared/apexOsBuildAwareness.test.js`
- `server/apex-os-build-awareness.js`
- `server/index.js`
- `server/apex-os-memory.test.js`
- `src/api.js`
- `src/apex-control-room-utils.js`
- `src/apex-control-room-utils.test.js`
- `src/apex-control-room-components.jsx`
- `src/apex-control-room-components-import.test.js`
- `docs/APEX_HQ_APEX_OS_COMMAND_CENTER_MASTER_PLAN.md`
- `docs/APEX_HQ_APEX_OS_HARD_FINISH_ROADMAP.md`
- `docs/APEX_HQ_BUILD_STATUS_AND_PHASES.md`
- `docs/APEX_HQ_LIVING_FINISH_PLAN.md`

Risk level:

- Low. This is private operator-only read-only build awareness. It adds no schema change, auth/session change, provider secret, production data mutation, customer-visible behavior, external execution, queue/run endpoint, CI/GitHub write, deploy action, send, spend, billing/payment, or irreversible action.

Validation:

- Focused Phase 9 suite passed: `node --test --test-concurrency=1 shared/apexOsBuildAwareness.test.js src/apex-control-room-utils.test.js src/apex-control-room-components-import.test.js server/apex-os-memory.test.js` with 13 tests.
- Broader Apex OS route/nav/permission validation passed: `node --test --test-concurrency=1 shared/apexOsBuildAwareness.test.js shared/apexOsApprovalPackets.test.js shared/apexOsAgentControl.test.js shared/permissions.test.js src/app-routing.test.js src/navigation-utils.test.js src/app-navigation-components-import.test.js src/apex-control-room-utils.test.js src/apex-control-room-components-import.test.js server/role-permissions.test.js server/apex-os-memory.test.js` with 81 tests.
- `npm.cmd run build` passed with the existing large-chunk warning only.
- Browser QA passed against an isolated temporary local database with a temporary backend and Vite proxy: operator login succeeded, `/api/apex-os/build-awareness` returned a read-only execution-locked snapshot, Build Awareness refresh succeeded, required panel markers rendered, and desktop/mobile had no horizontal overflow at 1440px and 390px.
- Browser QA screenshots were saved at `ui-audit/apex-control-room-phase9/desktop-build-awareness.png` and `ui-audit/apex-control-room-phase9/mobile-build-awareness.png`.

Production release state:

- Phase 9 was committed as `6368845` and pushed to `origin/codex/apex-os-command-center`.
- Production release was approved in chat and deployed on 2026-06-03 from clean commit `6368845` to Fly app `concrete-ops-2`, machine `148e06e2b53d68`, version `641`, image `registry.fly.io/concrete-ops-2:deployment-01KT65V9K2KK4G0V1R6QRXR9QG`.
- Rollback target is version `640`, image `registry.fly.io/concrete-ops-2:deployment-01KT63SPFM2EM1SVEHK24148G8`.
- Predeploy backup produced `postgres-app-data-20260603-072250Z.json`, `uploads-20260603-072250Z`, and `uploads-20260603-072250Z.manifest.json` with 5 uploaded files.
- Post-deploy checks passed: both production `/api/ready` endpoints returned ready/database ok, `https://concrete-ops-2.fly.dev/api/health` returned healthy, Fly status showed v641 started with 1 passing check, hosted skip-auth health/routes smoke passed, `/apex-control-room` served the new `index-Damj_cyI.js` and `app-domain-VWYbc_UL.js` bundles on both production hosts, unauthenticated `/api/apex-os/build-awareness` returned 401, `/api/setup/status` showed setup complete, demo mode off, demo user absent, and public signup disabled, and logs showed startup health recovering quickly before route/ready checks passed.
- Production auth smoke/login was not run.

Permissions impact:

- Private operator-only access remains required through the existing Apex OS route/API gates.
- Normal admins, estimators, field users, customer/company users, switched customer-company workspaces, and unauthenticated visitors remain blocked from the build-awareness endpoint and UI.
- Build awareness records do not grant execution, file edit, test run, git, deploy, rollback, provider, billing, money, customer-visible, deletion, auth/session, schema, production-data, or CI/GitHub permissions.

Mobile impact:

- The App Build Awareness panel lives inside the responsive Control Room layout. Mobile browser QA passed at 390px with no horizontal overflow.

Field-user impact:

- None. Field users remain blocked from Apex OS, build awareness, agents, AI office tools, leads, estimates, pricing, profit/margins, payroll, office notes, admin settings, billing, provider context, customer data, and private Apex HQ memory.

Rollback plan:

- If local release validation fails before deploy, revert the Phase 9 hard-finish commit to remove the build-awareness shared helper, server collector/endpoint, UI/API wiring, tests, and docs.
- If hosted health fails after deploy, roll back Fly to version `640` and image `registry.fly.io/concrete-ops-2:deployment-01KT63SPFM2EM1SVEHK24148G8`.
- No database migration rollback is required because Phase 9 adds no schema or persisted production records.

Next recommended phase:

- Start Phase 10 only after Phase 9 release evidence is committed and pushed.

## Apex OS Phase 10: Business Operating Center Hard-Finish Report

Goal:

- Finish Phase 10 from the original Apex OS master plan before starting Phase 11: make Apex OS run Apex HQ as a business operating center, not only an app/build tracker, while keeping all sends, publishing, spend, billing, customer-visible actions, and unsupported claims locked.

What was already built:

- The Control Room already had a first UI for launch, demo/pilot, marketing, sales/outreach, customer success, revenue/pricing/offer queues, launch/founder-demo rows, business briefing rows, and manual-send/spend/billing/claims gates.
- Durable Apex OS memory, approval packet drafts, and execution handoff drafts already existed through private operator-only company-settings storage.

What was completed now:

- Added source-backed business memory rows for approved Apex OS memory categories: business goals, business strategy, marketing/sales, customer research, legal/risk, and private owner notes.
- Added six private business task draft rows covering launch readiness, founder demo, marketing proof, sales follow-up, customer success, and revenue/offer work.
- Added five business approval draft rows covering business operations, manual sends, ads/publishing, billing/offers, and customer-visible work.
- Threaded Phase 10 into the Business Command Center status, briefing, launch/founder-demo, and knowledge-source rows so approved business memory changes the business state from mapped to source-backed.
- Kept business task drafts pointed at existing Agent Handoffs as `business-draft` work only; no queue/run/execution action was added.
- Kept approval draft rows as review packets only; no send, publish, spend, billing/payment, customer-visible, provider, production-data, schema, auth/session, or irreversible action path was added.

Affected files:

- `src/apex-control-room-utils.js`
- `src/apex-control-room-utils.test.js`
- `src/apex-control-room-components.jsx`
- `src/apex-control-room-components-import.test.js`
- `docs/APEX_HQ_APEX_OS_COMMAND_CENTER_MASTER_PLAN.md`
- `docs/APEX_HQ_APEX_OS_HARD_FINISH_ROADMAP.md`
- `docs/APEX_HQ_BUILD_STATUS_AND_PHASES.md`
- `docs/APEX_HQ_LIVING_FINISH_PLAN.md`

Risk level:

- Low. This is private operator-only state/UI/test/doc hardening. It uses existing Apex OS memory/approval/handoff concepts and adds no schema change, auth/session change, provider setup, production data mutation, customer-visible action, live send, ad spend, billing/payment, public publishing, package change, deletion, queue/run endpoint, or irreversible execution path.

Validation:

- Focused Phase 10 tests passed: `node --test --test-concurrency=1 src/apex-control-room-utils.test.js src/apex-control-room-components-import.test.js` with 9 tests.
- Broader Apex OS regression passed: `node --test --test-concurrency=1 shared/apexOsBuildAwareness.test.js shared/apexOsApprovalPackets.test.js shared/apexOsAgentControl.test.js shared/permissions.test.js src/app-routing.test.js src/navigation-utils.test.js src/app-navigation-components-import.test.js src/apex-control-room-utils.test.js src/apex-control-room-components-import.test.js server/role-permissions.test.js server/apex-os-memory.test.js` with 82 tests.
- `npm.cmd run build` passed with the existing large-chunk warning only.
- Browser QA passed against an isolated temporary backend and Vite proxy with real UI login, temporary operator access, and two approved business memory seed rows. Desktop 1440px and mobile 390px showed Business Command Center, Business Source Memory, Business Task Drafts, Business Approval Drafts, manual-send/spend/billing/claims gates, and no horizontal overflow.
- Browser QA artifacts: `ui-audit/apex-control-room-phase10/desktop-business-command-center.png`, `ui-audit/apex-control-room-phase10/mobile-business-command-center.png`, `ui-audit/apex-control-room-phase10/desktop-business-queues-target.png`, `ui-audit/apex-control-room-phase10/desktop-business-memory-drafts-target.png`, `ui-audit/apex-control-room-phase10/mobile-business-queues-target.png`, and `ui-audit/apex-control-room-phase10/mobile-business-memory-drafts-target.png`.

Permissions impact:

- No permission loosening. Phase 10 remains private Apex OS operator-only through the existing Control Room route/API gate.
- Normal admins, estimators, field users, customer/company users, switched customer-company workspaces, and unauthenticated visitors remain blocked from Apex OS business memory, task drafts, approval drafts, and internal business planning.

Mobile impact:

- Mobile browser QA passed at 390px with no horizontal overflow. The Phase 10 business sections stack in the existing Control Room mobile layout with the existing fixed Apex OS bottom nav.

Field-user impact:

- None. Field users remain blocked from Apex OS, business queues, marketing/sales planning, pricing/offer planning, approval drafts, source-backed owner notes, AI office tools, leads, estimates, pricing, profit/margins, payroll, office notes, admin settings, billing, provider context, customer data, and private Apex HQ memory.

Rollback plan:

- If local release validation fails before deploy, revert the Phase 10 hard-finish commit to remove the business memory/task/approval rows, Control Room Phase 10 sections, focused assertions, and doc updates.
- If hosted health fails after deploy, roll back Fly to the previous healthy Phase 9 release, version `641`, image `registry.fly.io/concrete-ops-2:deployment-01KT65V9K2KK4G0V1R6QRXR9QG`.
- No database migration rollback is required because Phase 10 adds no schema and mutates no production data.

Production release state:

- Phase 10 was committed as `ee851f7` and pushed to `origin/codex/apex-os-command-center`.
- Production release was approved in chat and deployed on 2026-06-03 from clean commit `ee851f7` to Fly app `concrete-ops-2`, machine `148e06e2b53d68`, version `642`, image `registry.fly.io/concrete-ops-2:deployment-01KT67FMHMMHQH69R1ZFX5Y0VR`.
- Rollback target is version `641`, image `registry.fly.io/concrete-ops-2:deployment-01KT65V9K2KK4G0V1R6QRXR9QG`.
- Predeploy backup produced `postgres-app-data-20260603-075124Z.json`, `uploads-20260603-075124Z`, and `uploads-20260603-075124Z.manifest.json` with 5 uploaded files.
- Post-deploy checks passed: both production `/api/ready` endpoints returned ready/database ok, `https://concrete-ops-2.fly.dev/api/health` returned healthy, Fly status showed v642 started with 1 passing check, hosted skip-auth health/routes smoke passed, `/apex-control-room` served `index-DaDMI41p.js` and `app-domain-Ds8onq2Y.js` on both production hosts, unauthenticated `/api/apex-os/approval-packets` and `/api/apex-os/memory` returned 401 Authentication required, `/api/setup/status` showed setup complete, demo mode off, demo user absent, and public signup disabled, and logs showed startup health recovering quickly before route/ready checks passed.
- Production auth smoke/login was not run.

Next recommended phase:

- Start Phase 11: Monitoring And Daily Briefings only after this Phase 10 release evidence commit is pushed.

## Apex OS Phase 11: Monitoring And Daily Briefings Hard-Finish Report

Goal:

- Finish Phase 11 from the original Apex OS master plan before starting Phase 12: let Apex OS brief John and watch Apex HQ with private, read-only monitoring and daily briefing evidence.

What was already built:

- A read-only Release Desk / Monitoring first UI existed with release checks, daily briefing rows, release readiness packet rows, and monitoring locks.
- Operator-only `/api/apex-os/daily-briefing` already returned a read-only briefing packet from local workspace state, durable memory, release posture, evidence pulse, source labels, locks, and next actions.
- Operator-only `/api/apex-os/build-awareness` already read safe repo/runtime metadata for branch, commits, changed files, scripts, docs, dist assets, and deploy evidence.

What was completed now:

- Added durable daily briefing history through existing company settings as `apexOsDailyBriefingHistory`, with sanitized private snapshots and a 30-snapshot retention cap.
- Added operator-only `POST /api/apex-os/daily-briefing/history` for manual briefing snapshot save, audit/activity history, and updated briefing/history response.
- Added changed-since-last-saved briefing rows and briefing history rows to the Daily Briefing panel.
- Added source-backed Release Monitoring refresh rows for production readiness, demo app readiness, GitHub Actions/smoke status, failed test/build signals, and stalled-agent signals.
- Tightened build-awareness evidence extraction so GitHub Actions/smoke status comes from actual workflow/readiness evidence instead of generic CI text.
- Preserved all external-action locks: no alerts are sent, no schedules are created, no agents are executed, no deploy/rollback is executed from the UI, and no provider monitoring changes are made.

Affected files:

- `shared/apexOsDailyBriefing.js`
- `shared/apexOsDailyBriefing.test.js`
- `shared/apexOsBuildAwareness.js`
- `shared/apexOsBuildAwareness.test.js`
- `shared/permissions.js`
- `server/index.js`
- `server/store.js`
- `server/apex-os-memory.test.js`
- `src/api.js`
- `src/apex-control-room-utils.js`
- `src/apex-control-room-utils.test.js`
- `src/apex-control-room-components.jsx`
- `src/apex-control-room-components-import.test.js`
- `docs/APEX_HQ_APEX_OS_COMMAND_CENTER_MASTER_PLAN.md`
- `docs/APEX_HQ_APEX_OS_HARD_FINISH_ROADMAP.md`
- `docs/APEX_HQ_LIVING_FINISH_PLAN.md`
- `docs/APEX_HQ_BUILD_STATUS_AND_PHASES.md`

Risk level:

- Medium-low. Phase 11 adds a private operator-only write for Apex OS briefing snapshots through the existing company settings persistence path, plus read-only monitoring UI refresh. It adds no schema, auth/session change, provider setup, external send, production/customer mutation, billing/payment, ad spend, public publishing, deletion, or customer-visible action.

Validation results:

- Focused Phase 11 tests passed: `node --test --test-concurrency=1 shared\apexOsDailyBriefing.test.js shared\apexOsBuildAwareness.test.js src\apex-control-room-utils.test.js src\apex-control-room-components-import.test.js`.
- Server focused tests passed: `node --test --test-concurrency=1 server\apex-os-memory.test.js`.
- Broader Apex OS regression passed: `node --test --test-concurrency=1 shared\apexOsBuildAwareness.test.js shared\apexOsDailyBriefing.test.js shared\apexOsApprovalPackets.test.js shared\apexOsAgentControl.test.js shared\apexOsExecutionHandoffs.test.js shared\apexOsMemory.test.js shared\permissions.test.js src\apex-control-room-utils.test.js src\apex-control-room-components-import.test.js src\app-routing.test.js src\navigation-utils.test.js src\app-navigation-components-import.test.js server\apex-os-memory.test.js server\role-permissions.test.js`.
- Role verification passed: `npm.cmd run verify:roles`.
- Production build passed: `npm.cmd run build`.
- Diff hygiene passed: `git diff --check` with CRLF warnings only.
- Browser QA passed locally on `/apex-control-room` for desktop and mobile: Release Monitoring refresh and Daily Briefing refresh/save/history worked, production/demo/GitHub smoke evidence appeared, no console errors, no failed requests, and no horizontal overflow were found.

Permissions impact:

- Private operator-only access remains required for Apex OS route/nav/API behavior.
- The new briefing history endpoint requires the same Apex OS operator access as existing private endpoints.
- Normal admins without operator access, estimators, field users, employees, demo users without the flag, customer/company users, and switched customer-company workspaces remain blocked.

Mobile impact:

- Desktop and mobile QA confirmed the Release Monitoring and Daily Briefing panels stack without horizontal overflow.
- Existing fixed mobile navigation remains unchanged.

Field-user impact:

- None. Field users remain blocked from Apex OS, Release Monitoring, Daily Briefing history, build awareness, approval packets, agent controls, business queues, leads, estimates, pricing, profit/margins, payroll, office notes, admin settings, billing, provider context, customer data, and private Apex HQ memory.

Rollback plan:

- If local validation fails before deploy, revert the Phase 11 hard-finish commit to remove briefing history persistence, the new history endpoint, Release Monitoring refresh rows, UI changes, focused assertions, and doc updates.
- If hosted health fails after deploy, roll back Fly to the previous healthy Phase 10 release, version `642`, image `registry.fly.io/concrete-ops-2:deployment-01KT67FMHMMHQH69R1ZFX5Y0VR`.
- No database migration rollback is required because Phase 11 adds no schema and uses the existing company settings persistence path.

Production release state:

- Phase 11 was committed as `10232dd` and pushed to `origin/codex/apex-os-command-center`.
- Production release was approved in chat and deployed on 2026-06-03 from clean commit `10232dd` to Fly app `concrete-ops-2`, machine `148e06e2b53d68`, version `643`, image `registry.fly.io/concrete-ops-2:deployment-01KT69XEJKX0VH6X0G063WKVPV`.
- Rollback target is version `642`, image `registry.fly.io/concrete-ops-2:deployment-01KT67FMHMMHQH69R1ZFX5Y0VR`.
- Predeploy backup produced `postgres-app-data-20260603-083353Z.json`, `uploads-20260603-083353Z`, and `uploads-20260603-083353Z.manifest.json` with 5 uploaded files.
- Post-deploy checks passed: both production `/api/ready` endpoints returned ready/database ok, `https://concrete-ops-2.fly.dev/api/health` returned healthy, Fly machine `148e06e2b53d68` was started on the Phase 11 image with 1 passing check, hosted skip-auth health/routes smoke passed, `/apex-control-room` served `index-DgMWRcA4.js` and `app-domain-CIbawYP-.js` on both production hosts, unauthenticated `/api/apex-os/daily-briefing`, `POST /api/apex-os/daily-briefing/history`, and `/api/apex-os/build-awareness` returned 401 Authentication required, `/api/setup/status` showed setup complete, demo mode off, demo user absent, and public signup disabled.
- Production auth smoke/login was not run.

Next recommended phase:

- Phase 11 is complete after this release evidence commit is pushed. Do not start Phase 12 unless Josh explicitly starts the next Apex OS phase.

## Apex OS Phase 12: Voice Interface Hard-Finish Report

Goal:

- Finish Phase 12 from the original Apex OS master plan before starting Phase 13: add the "talk to Apex and Apex talks back" experience while keeping every voice path review-first and safe.

What was already built:

- A private Voice Interface first UI existed with manual transcript confirmation and a safe copy-to-Ask-Apex path.
- Ask Apex already had private operator-only source-backed answers and server-side `OPENAI_API_KEY` provider readiness.

What was completed now:

- Added click-to-record push-to-talk with explicit Stop & transcribe; microphone access is requested only after the operator clicks the push-to-talk control.
- Added server-only speech-to-text and text-to-speech endpoints: `POST /api/apex-os/voice/transcribe` and `POST /api/apex-os/voice/speech`.
- Added OpenAI provider readiness through the server-side `OPENAI_API_KEY` only. No provider key or voice secret is sent to the browser.
- Added safe fallbacks: manual transcript remains available when transcription is not configured, and browser speech playback is used when server speech is unavailable.
- Added voice command parser/review for the original Phase 12 commands: approvals, pause agents, summarize today, show blockers, save decision, and start next safe task.
- Kept every detected voice command execution-locked. Voice can prepare a safe Ask Apex question, but it cannot pause agents, start tasks, write decisions, approve packets, send, spend, deploy, bill, mutate production/customer data, or execute external actions.
- Added Speak answer and Stop voice controls for Ask Apex answers with AI-generated-answer disclosure.
- Confirmed no audio storage, transcript persistence, always-listening mode, hidden microphone capture, schema/storage change, auth/session change, provider setup mutation, customer-visible action, deletion, or irreversible action path was added.

Affected files:

- `shared/apexOsVoice.js`
- `shared/apexOsVoice.test.js`
- `server/index.js`
- `server/apex-os-memory.test.js`
- `src/api.js`
- `src/apex-control-room-utils.js`
- `src/apex-control-room-utils.test.js`
- `src/apex-control-room-components.jsx`
- `src/apex-control-room-components-import.test.js`
- `docs/APEX_HQ_APEX_OS_COMMAND_CENTER_MASTER_PLAN.md`
- `docs/APEX_HQ_APEX_OS_HARD_FINISH_ROADMAP.md`
- `docs/APEX_HQ_LIVING_FINISH_PLAN.md`
- `docs/APEX_HQ_BUILD_STATUS_AND_PHASES.md`

Risk level:

- Medium-low. Phase 12 adds private operator-only voice provider endpoints and browser microphone use only after an explicit click. It adds no schema, auth/session change, audio storage, transcript persistence, provider secret exposure, live send, ad spend, billing/payment, customer-visible action, production/customer mutation, deletion, or irreversible execution path.

Validation results:

- Focused voice/Ask Apex/control-room tests passed: `node --test --test-concurrency=1 shared\apexOsVoice.test.js shared\apexOsAsk.test.js src\apex-control-room-utils.test.js src\apex-control-room-components-import.test.js`.
- Server focused tests passed: `node --test --test-concurrency=1 server\apex-os-memory.test.js`.
- Broader Apex OS regression passed: `node --test --test-concurrency=1 shared\apexOsVoice.test.js shared\apexOsAsk.test.js shared\apexOsDailyBriefing.test.js shared\apexOsBuildAwareness.test.js shared\apexOsApprovalPackets.test.js shared\apexOsAgentControl.test.js shared\apexOsExecutionHandoffs.test.js shared\apexOsMemory.test.js shared\permissions.test.js src\apex-control-room-utils.test.js src\apex-control-room-components-import.test.js src\app-routing.test.js src\navigation-utils.test.js src\app-navigation-components-import.test.js server\apex-os-memory.test.js server\role-permissions.test.js`.
- Role verification passed: `npm.cmd run verify:roles`.
- Production build passed: `npm.cmd run build`.
- Desktop and mobile browser QA passed locally on `/apex-control-room`: manual transcript confirmation, voice command review, safe Ask Apex handoff, Ask Apex answer, Speak answer control, Push to talk, Stop & transcribe, Execute locked, no failed requests, and no horizontal overflow were verified.
- Headless browser QA verified the speech endpoint fallback payload when `OPENAI_API_KEY` was absent; real audible playback is browser/runtime dependent and server OpenAI audio requires the key to be configured.

Permissions impact:

- Private operator-only access remains required for the route, nav, and all Apex OS voice APIs.
- Normal admins without operator access, estimators, field users, employees, demo users without the flag, customer/company users, and switched customer-company workspaces remain blocked.
- The voice APIs use the same Apex OS operator gate as Ask Apex and memory.

Mobile impact:

- Desktop and mobile QA confirmed the Voice Interface and Ask Apex action row stack without horizontal overflow.
- Mobile push-to-talk remains click-driven; no background microphone or always-listening behavior exists.

Field-user impact:

- None. Field users remain blocked from Apex OS, Voice Interface, Ask Apex, approvals, agents, business queues, leads, estimates, pricing, profit/margins, payroll, office notes, admin settings, billing, provider context, customer data, and private Apex HQ memory.

Rollback plan:

- If local validation fails before deploy, revert the Phase 12 hard-finish commit to remove the voice helper, voice endpoints, push-to-talk UI, speech playback controls, focused assertions, and doc updates.
- If hosted health fails after deploy, roll back Fly to the previous healthy Phase 11 release, version `643`, image `registry.fly.io/concrete-ops-2:deployment-01KT69XEJKX0VH6X0G063WKVPV`.
- No database migration rollback is required because Phase 12 adds no schema and stores no audio/transcripts.

Production release state:

- Phase 12 was committed as `301a852` and pushed to `origin/codex/apex-os-command-center`.
- Production release was deployed on 2026-06-03 from clean commit `301a852` to Fly app `concrete-ops-2`, machine `148e06e2b53d68`, version `644`, image `registry.fly.io/concrete-ops-2:deployment-01KT6BZ28V8HTPBNCWZEA27DXY`.
- Rollback target is version `643`, image `registry.fly.io/concrete-ops-2:deployment-01KT69XEJKX0VH6X0G063WKVPV`.
- Predeploy backup produced `postgres-app-data-20260603-090951Z.json`, `uploads-20260603-090951Z`, and `uploads-20260603-090951Z.manifest.json` with 5 uploaded files.
- Post-deploy checks passed: both production `/api/ready` endpoints returned ready/database ok, `https://concrete-ops-2.fly.dev/api/health` returned healthy, Fly status showed version `644` complete and machine `148e06e2b53d68` started with 1 passing check, hosted skip-auth health/routes smoke passed, `/apex-control-room` served `index-2kSpyfRN.js` and `app-domain-DXZHV5Al.js` on both production hosts, unauthenticated `POST /api/apex-os/voice/speech`, `POST /api/apex-os/voice/transcribe`, and `POST /api/apex-os/ask` returned 401 Authentication required, `/api/setup/status` showed setup complete, demo mode off, demo user absent, and public signup disabled, and logs showed startup health recovering quickly before route/ready checks passed.
- Production auth smoke/login was not run.

Next recommended phase:

- Start Phase 13: Knowledge Intelligence only after Phase 12 release evidence is committed and pushed.

## Apex OS Phase 13: Knowledge Intelligence Hard-Finish Report

Goal:

- Finish Phase 13 from the original Apex OS master plan before starting Phase 14: make uploaded knowledge searchable, source-backed, useful, conflict-aware, and safe.

What was already built:

- Phase 5 Knowledge Upload Vault already had classified manual/text/PDF intake, source metadata, suggested/trusted/archive review states, search/filter by category/source/status/text, duplicate guards, review history, private export, and manual approval before trust.
- Phase 6 Ask Apex already answered from approved source rows and showed source labels, ranked evidence, and approval warnings.

What was completed now:

- Added a shared Knowledge Intelligence engine over approved decision memory and Knowledge Vault rows.
- Added local lexical source ranking, reviewed document summaries, trusted/suggested/archived status, source/category/status/text/date filters, confidence labels, ranked evidence rows, and safety locks.
- Added current-rule conflict detection for automatic trust, field access to pricing/private data, external actions without approval, and secret storage.
- Added older-memory conflict detection with "This conflicts with older memory" warnings when active memory rows disagree.
- Added operator-only `POST /api/apex-os/knowledge-intelligence`, which returns local intelligence without a provider and uses server-side `OPENAI_API_KEY` for optional summary/classification only when configured.
- Added Knowledge Intelligence UI inside the private Knowledge Vault: Refresh intelligence, Conflict warnings, Ranked Evidence, Confidence Labels, Local fallback / Server provider status, date filter, and vector-search lock.
- Preserved the Phase 13 non-goal: no unreviewed uploaded document silently overrides current repo truth.

Provider/account-dependent remaining work:

- Durable embeddings/vector index remains blocked until private vector storage/schema/provider approval exists.
- Provider-backed AI summaries/classifications require `OPENAI_API_KEY` to be configured server-side; local QA verified the no-key fallback path.

Affected files:

- `shared/apexOsKnowledgeIntelligence.js`
- `shared/apexOsKnowledgeIntelligence.test.js`
- `shared/apexOsMemory.js`
- `server/index.js`
- `server/apex-os-memory.test.js`
- `src/api.js`
- `src/apex-control-room-utils.js`
- `src/apex-control-room-utils.test.js`
- `src/apex-control-room-components.jsx`
- `src/apex-control-room-components-import.test.js`
- `docs/APEX_HQ_APEX_OS_COMMAND_CENTER_MASTER_PLAN.md`
- `docs/APEX_HQ_APEX_OS_HARD_FINISH_ROADMAP.md`
- `docs/APEX_HQ_LIVING_FINISH_PLAN.md`
- `docs/APEX_HQ_BUILD_STATUS_AND_PHASES.md`

Risk level:

- Medium-low. Phase 13 adds private operator-only intelligence and an optional provider summary path, but no schema, vector storage, auth/session change, frontend secret, customer/public knowledge mixing, automatic trust, external action, send, spend, billing/payment, deploy/rollback execution from the UI, production/customer mutation, deletion, or irreversible action path.

Validation results:

- Focused Phase 13 tests passed: `node --test --test-concurrency=1 shared\apexOsKnowledgeIntelligence.test.js shared\apexOsMemory.test.js shared\apexOsAsk.test.js src\apex-control-room-utils.test.js src\apex-control-room-components-import.test.js server\apex-os-memory.test.js`.
- Broader Apex OS regression passed with 114 tests: `node --test --test-concurrency=1 shared\apexOsKnowledgeIntelligence.test.js shared\apexOsVoice.test.js shared\apexOsAsk.test.js shared\apexOsDailyBriefing.test.js shared\apexOsBuildAwareness.test.js shared\apexOsApprovalPackets.test.js shared\apexOsAgentControl.test.js shared\apexOsExecutionHandoffs.test.js shared\apexOsMemory.test.js shared\permissions.test.js src\apex-control-room-utils.test.js src\apex-control-room-components-import.test.js src\app-routing.test.js src\navigation-utils.test.js src\app-navigation-components-import.test.js server\apex-os-memory.test.js server\role-permissions.test.js`.
- Role verification passed: `npm.cmd run verify:roles`.
- Production build passed: `npm.cmd run build`.
- Diff hygiene passed: `git diff --check` with CRLF warnings only.
- Desktop and mobile browser QA passed locally on `/apex-control-room`: Knowledge Intelligence refreshed, ranked evidence appeared, conflict warnings appeared, date filter appeared, vector search stayed locked, no horizontal overflow was found, and no failed post-login requests were recorded. The only browser noise was the expected pre-login unauthenticated `/api/bootstrap` probe/redirect.
- Browser QA screenshots: `ui-audit/apex-control-room-phase13/desktop-knowledge-intelligence.png` and `ui-audit/apex-control-room-phase13/mobile-knowledge-intelligence.png`.

Permissions impact:

- Private operator-only Apex OS access remains required for the route, UI, and `/api/apex-os/knowledge-intelligence`.
- The endpoint uses the same Apex OS operator gate as memory, Ask Apex, voice, approvals, agents, handoffs, monitoring, and briefing.
- Normal admins without operator access, estimators, field users, employees, demo users without the flag, customer/company users, and switched customer-company workspaces remain blocked.

Mobile impact:

- Desktop and mobile QA confirmed the Knowledge Intelligence panel, filters, ranked evidence, conflict warnings, and confidence rows stack without horizontal overflow.

Field-user impact:

- None. Field users remain blocked from Apex OS, Knowledge Vault, Knowledge Intelligence, Ask Apex, approvals, agents, business queues, leads, estimates, pricing, profit/margins, payroll, office notes, admin settings, billing, provider context, customer data, and private Apex HQ memory.

Rollback plan:

- If local validation fails before deploy, revert the Phase 13 hard-finish commit to remove the knowledge-intelligence helper, endpoint, UI panel, date filter, focused assertions, memory timestamp preservation change, and doc updates.
- If hosted health fails after deploy, roll back Fly to the previous healthy Phase 12 release, version `644`, image `registry.fly.io/concrete-ops-2:deployment-01KT6BZ28V8HTPBNCWZEA27DXY`.
- No database migration rollback is required because Phase 13 adds no schema and creates no vector/embedding storage.

Production release state:

- Phase 13 was committed as `f8193ad`, pushed to `origin/codex/apex-os-command-center`, deployed on 2026-06-03 to Fly app `concrete-ops-2` as version `645`, image `registry.fly.io/concrete-ops-2:deployment-01KT6DWEVTQ5CBC5V8TX7TX5CZ`.
- Predeploy production backup artifacts: `postgres-app-data-20260603-094325Z.json`, `uploads-20260603-094325Z`, and `uploads-20260603-094325Z.manifest.json`.
- Rollback target: Fly version `644`, image `registry.fly.io/concrete-ops-2:deployment-01KT6BZ28V8HTPBNCWZEA27DXY`.
- Post-deploy checks passed: both production `/api/ready` endpoints returned ready/database ok, `https://concrete-ops-2.fly.dev/api/health` returned healthy, Fly checks/machine health passed on machine `148e06e2b53d68`, hosted skip-auth health/routes smoke passed on `https://app.apexhq.online/`, `/apex-control-room` served `index-9Ub5wvmX.js` and `app-domain-DwwCEagD.js`, unauthenticated `/api/apex-os/knowledge-intelligence`, `/api/apex-os/memory`, and `/api/apex-os/ask` returned 401, and `/api/setup/status` showed demo mode off, demo user absent, and public signup disabled.
- Production auth smoke/login was not run.

Next recommended phase:

- Start Phase 14: Action Execution Layer after this Phase 13 release evidence commit is pushed.

## Apex OS Phase 14: Action Execution Layer Hard-Finish Report

Goal:

- Finish Phase 14 from the original Apex OS master plan before starting Phase 15: let Apex OS prepare real work and safely hand it to Codex/agents while preserving approval gates and no uncontrolled autonomous changes.

What was already built:

- Apex OS already had Ask Apex, Approval Command Center packets, Agent Control Plane request records, and durable execution handoff drafts through existing company settings as `apexOsExecutionHandoffs`.
- The earlier handoff layer could draft/load/mark-ready/block/archive safe agent work packages, but it did not yet close the original Phase 14 loop for chat-created task packets, validation/result capture, workstream status tracking, approval enforcement on risky allowed scope, or decision-memory update drafting after finished work.

What was completed now:

- Added `buildApexOsAskExecutionHandoffDraft` so Ask Apex can create task handoff drafts from chat with source request ID, source question, selected role/work type, allowed actions, blocked actions, validation plan, rollback plan, and locked execution controls.
- Expanded execution handoffs with workstream statuses for planned, ready-for-agent, in-progress, validating, finished, blocked, and archived work.
- Added locked execution contracts that expose objective, assigned role/skill, work type, allowed/blocked actions, validation plan/results, rollback plan, result report, source evidence, approval packet link, source chat request, decision-memory link, and `executionLocked` / no-queue / no-run / no-execute flags.
- Added approval enforcement so risky allowed actions mentioning production, provider setup, schema/auth/session, deployment, customer-visible changes, sends, spend, billing/payment, deletion, or irreversible work require a source approval packet reference.
- Added completion enforcement so finished workstreams must include validation results and a result report before they can be saved.
- Added suggested decision-memory drafting after finished handoffs that include `decisionMemoryUpdate`; duplicates are linked instead of creating another row, and memory stays `suggested` for manual review.
- Updated the Control Room handoff UI so operators can draft from Ask Apex, load/edit handoffs, set workstream status, save validation results/result reports/decision-memory updates, view suggested memory evidence, and see queue/run execution controls remain locked.

Affected files:

- `shared/apexOsExecutionHandoffs.js`
- `shared/apexOsExecutionHandoffs.test.js`
- `shared/apexOsAsk.js`
- `shared/apexOsAsk.test.js`
- `server/index.js`
- `server/apex-os-memory.test.js`
- `src/apex-control-room-components.jsx`
- `src/apex-control-room-components-import.test.js`
- `src/apex-control-room-utils.js`
- `src/apex-control-room-utils.test.js`
- `docs/APEX_HQ_APEX_OS_COMMAND_CENTER_MASTER_PLAN.md`
- `docs/APEX_HQ_APEX_OS_HARD_FINISH_ROADMAP.md`
- `docs/APEX_HQ_LIVING_FINISH_PLAN.md`
- `docs/APEX_HQ_BUILD_STATUS_AND_PHASES.md`

Risk level:

- Medium-low. Phase 14 prepares and records scoped work packages and suggested memory, but it does not add a queue/run endpoint, unmanaged background loop, deploy button, production mutation, customer-visible mutation, external send, ad spend, billing/payment, provider setup, schema/auth/session change, deletion, or irreversible execution path.

Validation plan/results:

- Focused Phase 14 tests passed: `node --test --test-concurrency=1 shared\apexOsAsk.test.js shared\apexOsExecutionHandoffs.test.js server\apex-os-memory.test.js` with 11 passing tests.
- Full Apex OS regression passed: `node --test --test-concurrency=1 shared\apexOsKnowledgeIntelligence.test.js shared\apexOsVoice.test.js shared\apexOsAsk.test.js shared\apexOsDailyBriefing.test.js shared\apexOsBuildAwareness.test.js shared\apexOsApprovalPackets.test.js shared\apexOsAgentControl.test.js shared\apexOsExecutionHandoffs.test.js shared\apexOsMemory.test.js shared\permissions.test.js src\apex-control-room-utils.test.js src\apex-control-room-components-import.test.js src\app-routing.test.js src\navigation-utils.test.js src\app-navigation-components-import.test.js server\apex-os-memory.test.js server\role-permissions.test.js` with 117 passing tests.
- `npm.cmd run verify:roles` passed with 15 passing tests.
- `npm.cmd run build` passed with the existing large-chunk warning and produced local Phase 14 bundles `assets/index-D5EnyN4J.js`, `assets/app-domain-BX7hVNVK.js`, and `assets/app-domain-BG7wb0Ah.css`.
- `git diff --check` passed for the changed code/test files with CRLF warnings only.
- Desktop browser QA passed on isolated local data at `http://127.0.0.1:4214`: private operator login, Ask Apex question, Create task draft, Load handoff, set `finished`, save validation results/result report/decision-memory update, suggested memory creation, queue/run locks visible, and `overflowX` 0. Screenshot: `ui-audit/apex-control-room-phase14/desktop-action-execution-handoff.png`.
- Mobile browser QA passed on isolated local data at `http://127.0.0.1:4214`: private operator Load handoffs, suggested memory visible/API-confirmed, queue/run locks visible, and `overflowX` 0. Screenshot: `ui-audit/apex-control-room-phase14/mobile-action-execution-handoff.png`.
- Browser noise was limited to expected pre-login unauthenticated `/api/bootstrap` 401 and one aborted bootstrap request; no post-login functional failure was found.

Permissions impact:

- Operator-only Apex OS boundaries are preserved. Handoff endpoints remain private Apex OS APIs behind the existing `operatorAccess`, office-role, default Apex HQ workspace, and server bootstrap permission checks.
- Approval enforcement was tightened for risky allowed scope. Approval packets remain review records only and still do not execute the underlying action.

Mobile impact:

- Mobile Control Room handoff loading, suggested memory evidence, locked queue/run controls, and no-horizontal-overflow state were verified.

Field-user impact:

- Field users remain blocked from Apex OS, agent handoffs, Ask Apex private answers, approval packets, decision memory, leads, estimates, pricing, profit/margins, payroll, office-only notes, billing, company setup, and other company data.

Rollback plan:

- If local validation fails before deploy, revert the Phase 14 hard-finish commit to remove the Ask Apex handoff draft builder, execution-contract/workstream/result enforcement changes, suggested memory drafting from finished handoffs, Control Room handoff editing/status/result UI, focused tests, and doc updates.
- If hosted health fails after deploy, roll back Fly to the previous healthy Phase 13 release, version `645`, image `registry.fly.io/concrete-ops-2:deployment-01KT6DWEVTQ5CBC5V8TX7TX5CZ`.
- No database migration rollback is required because Phase 14 uses the existing company settings persistence path and adds no schema.

Production release state:

- Phase 14 was committed as `ab1a656`, pushed to `origin/codex/apex-os-command-center`, deployed on 2026-06-03 to Fly app `concrete-ops-2` as version `646`, image `registry.fly.io/concrete-ops-2:deployment-01KT6G2KC3ZZ5HS4Q3GT0VHHAP`.
- The deploy was run from clean temporary git worktree `%TEMP%\apex-phase14-release-ab1a656` at commit `ab1a656` so unrelated local brief/output files were not part of the release decision.
- Predeploy production backup artifacts: `postgres-app-data-20260603-102138Z.json`, `uploads-20260603-102138Z`, and `uploads-20260603-102138Z.manifest.json` with 5 uploaded files. The backup command logged successful backup/export creation before Fly's Windows SSH wrapper reported a handle warning.
- Rollback target: Fly version `645`, image `registry.fly.io/concrete-ops-2:deployment-01KT6DWEVTQ5CBC5V8TX7TX5CZ`.
- Post-deploy checks passed: both production `/api/ready` endpoints returned ready/database ok, `https://concrete-ops-2.fly.dev/api/health` returned healthy, Fly checks/machine health passed on machine `148e06e2b53d68`, hosted skip-auth health/routes smoke passed on `https://app.apexhq.online/`, `/apex-control-room` served `index-D5EnyN4J.js`, `app-domain-BX7hVNVK.js`, and `app-domain-BG7wb0Ah.css`, unauthenticated `/api/apex-os/execution-handoffs`, `/api/apex-os/memory`, and `/api/apex-os/ask` returned 401, and `/api/setup/status` showed demo mode off, demo user absent, and public signup disabled.
- Production auth smoke/login was not run.

Next recommended phase:

- Start Phase 15: Production Preview And Release Desk only after this Phase 14 release evidence commit is pushed.

## Apex OS Phase 15: Production Preview And Release Desk Hard-Finish Report

Goal:

- Finish Phase 15 from the original Apex OS master plan before starting Phase 16: make Apex OS the release desk for Apex HQ with production preview, release readiness, deploy history, rollback evidence, current production version/evidence, and a deploy-approved flow that only works after validation gates and explicit release approval.

What was already built:

- Apex OS already had release safety summary rows, Release Monitoring, App Build Awareness, Daily Briefing, approval packet templates for deploys, and locked deploy/non-execution language.
- Build awareness already read safe git/runtime/docs/package metadata and parsed some release evidence, but it did not yet parse the living-plan deploy log as deploy history.
- The Control Room already showed a thin Release Desk summary plus Release Readiness Packet and Monitoring Locks, but the original Phase 15 production-preview/release-desk workflow was not fully represented.

What was completed now:

- Added deploy-log parsing to build awareness so Apex OS can read recent Apex OS deploy history rows from `docs/APEX_HQ_LIVING_FINISH_PLAN.md`.
- Updated latest deploy evidence to use deploy-log rows first, so current production version, commit, image, and health text do not depend on older release bullets.
- Expanded the Release Desk into read-only `Production Preview Status`, `Release Readiness Packet`, `Deploy History`, `Deploy Approved Flow`, and `Release Safety Summary` sections.
- Added release-desk rows for current production version, production preview status, live health evidence, local build/test status, backup/restore evidence, rollback target, hosted smoke evidence, exact deploy approval phrase, validation-before-approval, manual deploy handoff, and post-deploy release evidence.
- Added a disabled `Deploy approved locked` control so the approval path is visible without creating a deploy, rollback, queue, run, provider, production mutation, or irreversible action path.
- Updated Control Room Release Desk refresh so it can pull current read-only build awareness evidence from `/api/apex-os/build-awareness` and show production `v646` evidence after refresh.

Affected files:

- `shared/apexOsBuildAwareness.js`
- `shared/apexOsBuildAwareness.test.js`
- `src/apex-control-room-utils.js`
- `src/apex-control-room-utils.test.js`
- `src/apex-control-room-components.jsx`
- `src/apex-control-room-components-import.test.js`
- `docs/APEX_HQ_APEX_OS_COMMAND_CENTER_MASTER_PLAN.md`
- `docs/APEX_HQ_APEX_OS_HARD_FINISH_ROADMAP.md`
- `docs/APEX_HQ_LIVING_FINISH_PLAN.md`
- `docs/APEX_HQ_BUILD_STATUS_AND_PHASES.md`

Risk level:

- Low-medium. Phase 15 improves read-only release visibility and release approval gating. It does not add a deploy button, rollback execution, queue/run endpoint, production config change, production data mutation, provider setup, customer-visible action, live send, ad spend, billing/payment, schema/auth/session change, deletion, or irreversible action path.

Validation plan/results:

- Focused Phase 15 tests passed: `node --test --test-concurrency=1 shared\apexOsBuildAwareness.test.js src\apex-control-room-utils.test.js src\apex-control-room-components-import.test.js` with 16 passing tests.
- Full Apex OS regression passed: `node --test --test-concurrency=1 shared\apexOsKnowledgeIntelligence.test.js shared\apexOsVoice.test.js shared\apexOsAsk.test.js shared\apexOsDailyBriefing.test.js shared\apexOsBuildAwareness.test.js shared\apexOsApprovalPackets.test.js shared\apexOsAgentControl.test.js shared\apexOsExecutionHandoffs.test.js shared\apexOsMemory.test.js shared\permissions.test.js src\apex-control-room-utils.test.js src\apex-control-room-components-import.test.js src\app-routing.test.js src\navigation-utils.test.js src\app-navigation-components-import.test.js server\apex-os-memory.test.js server\role-permissions.test.js` with 118 passing tests.
- `npm.cmd run verify:roles` passed with 15 passing tests.
- `npm.cmd run build` passed with the existing large-chunk warning and produced local Phase 15 bundles `assets/index-CU7dSODG.js`, `assets/app-domain-C4RXp6QQ.js`, and `assets/app-domain-BG7wb0Ah.css`.
- `git diff --check` passed for the changed code/test files with CRLF warnings only.
- Desktop browser QA passed on isolated local data at `http://127.0.0.1:4215`: private operator login, Release Desk refresh, production `v646` evidence, deploy history, backup evidence, hosted smoke evidence, disabled `Deploy approved locked` control, and `overflowX` 0. Screenshot: `ui-audit/apex-control-room-phase15/desktop-release-desk.png`.
- Mobile browser QA passed on isolated local data at `http://127.0.0.1:4215`: Release Desk refresh showed production `v646`, deploy history, locked deploy-approved control, and `overflowX` 0. Screenshot: `ui-audit/apex-control-room-phase15/mobile-release-desk.png`.
- Browser noise was limited to expected pre-login unauthenticated `/api/bootstrap` 401 and one aborted bootstrap request; no post-login functional failure was found.

Permissions impact:

- Operator-only Apex OS boundaries are preserved. Release Desk rows are private Control Room UI only and the build-awareness endpoint remains behind Apex OS operator access.
- Approval packets and deploy approvals remain review records only; no UI execution path was added.

Mobile impact:

- Mobile Release Desk refresh, deploy-history visibility, disabled deploy-approved lock, and no-horizontal-overflow state were verified.

Field-user impact:

- Field users remain blocked from Apex OS, release desk, deploy history, build awareness, approval packets, decision memory, leads, estimates, pricing, profit/margins, payroll, office-only notes, billing, company setup, and other company data.

Rollback plan:

- If local validation fails before deploy, revert the Phase 15 hard-finish commit to remove deploy-log parsing, the expanded release desk state, the Release Desk refresh panel, focused assertions, and doc updates.
- If hosted health fails after deploy, roll back Fly to the previous healthy Phase 14 release, version `646`, image `registry.fly.io/concrete-ops-2:deployment-01KT6G2KC3ZZ5HS4Q3GT0VHHAP`.
- No database migration rollback is required because Phase 15 adds no schema and writes no production data.

Production release state:

- Phase 15 was committed and pushed as `e86b88e`, then deployed on 2026-06-03 to Fly app `concrete-ops-2` as release `v647`, image `registry.fly.io/concrete-ops-2:deployment-01KT6H78S4DEYNQ1S72N63TTXS`.
- Predeploy production backup logged success with `postgres-app-data-20260603-104153Z.json`, `uploads-20260603-104153Z`, and `uploads-20260603-104153Z.manifest.json`; the Fly Windows SSH wrapper returned the known post-success `Error: The handle is invalid.` warning after the backup output.
- Rollback target is the previous healthy Phase 14 release `v646`, image `registry.fly.io/concrete-ops-2:deployment-01KT6G2KC3ZZ5HS4Q3GT0VHHAP`.
- Post-deploy checks passed: Fly machine `148e06e2b53d68` is started on version `647` with 1 passing service check; `https://app.apexhq.online/api/ready` and `https://concrete-ops-2.fly.dev/api/ready` returned ready/database ok; `https://concrete-ops-2.fly.dev/api/health` returned healthy; hosted skip-auth health/routes smoke passed on `https://app.apexhq.online/`; `/apex-control-room` served `index-CU7dSODG.js`, `app-domain-C4RXp6QQ.js`, and `app-domain-BG7wb0Ah.css`; unauthenticated `/api/apex-os/build-awareness`, `/api/apex-os/memory`, and `/api/apex-os/ask` returned 401; and `/api/setup/status` showed setup complete, demo mode off, demo user absent, and public signup disabled.
- Production auth smoke/login was not run in this release pass.

Next recommended phase:

- Start Phase 16: Personal Operating Layer only after Phase 15 is committed, pushed, deployed, production-checked, and the release evidence commit is pushed.

## Apex OS Phase 16: Personal Operating Layer Hard-Finish Report

Date: 2026-06-03

Goal:

- Finish Phase 16 from the original Apex OS master plan before starting Phase 17: let Apex OS adapt to how John works while keeping personal preference memory explicit, sourced, review-first, private, and free of hidden/sensitive tracking.

What was already built before this pass:

- Earlier Apex OS phases already provided private operator-only Control Room access, durable Apex OS memory through existing company settings, decision memory review controls, Ask Apex source-backed answers, approval gates, agent control/handoff records, release monitoring, and release desk evidence.

What was completed in this pass:

- Added a derived Personal Operating Layer state packet with preference rows, work-style rows, communication rows, daily focus rows, interruption rules, background-vs-check-in rules, preference review rows, source options, review counts, and explicit privacy flags.
- Added a Control Room Personal Operating Layer panel with KPI rows, preference drafting, memory loading, manual approve/archive review controls, owner preference cards, work-style cards, communication preference cards, daily-focus cards, interruption rules, background/check-in rows, and privacy locks.
- Reused existing operator-only Apex OS memory category `personal-preference`; no schema migration, auth/session change, provider setup, production config change, or new storage layer was added.
- Kept all preference writes as suggested memory until manual approval. Source label/title/body are required, duplicate active preference rows are blocked, existing memory API secret/email rejection remains in force, and approval/archive are review states only.
- Added privacy lock evidence for explicit preferences only, no sensitive personal tracking, operator-only preference memory, no background execution, no hidden location/microphone/behavioral tracking, and no off-app personal data capture.

Affected files:

- `src/apex-control-room-utils.js`
- `src/apex-control-room-utils.test.js`
- `src/apex-control-room-components.jsx`
- `src/apex-control-room-components-import.test.js`
- `docs/APEX_HQ_APEX_OS_COMMAND_CENTER_MASTER_PLAN.md`
- `docs/APEX_HQ_APEX_OS_HARD_FINISH_ROADMAP.md`
- `docs/APEX_HQ_LIVING_FINISH_PLAN.md`
- `docs/APEX_HQ_BUILD_STATUS_AND_PHASES.md`

Risk level:

- Low-medium. Phase 16 adds private operator UI/state over existing memory storage. It does not add schema, auth/session changes, provider setup, background jobs, agent execution, production data mutation, customer-visible actions, live sends, ad spend, billing/payment, deletion, or irreversible actions.

Validation results:

- Focused Phase 16 tests passed: `node --test --test-concurrency=1 src\apex-control-room-utils.test.js src\apex-control-room-components-import.test.js` with 11 passing tests.
- Full Apex OS regression passed: `node --test --test-concurrency=1 shared\apexOsKnowledgeIntelligence.test.js shared\apexOsVoice.test.js shared\apexOsAsk.test.js shared\apexOsDailyBriefing.test.js shared\apexOsBuildAwareness.test.js shared\apexOsApprovalPackets.test.js shared\apexOsAgentControl.test.js shared\apexOsExecutionHandoffs.test.js shared\apexOsMemory.test.js shared\permissions.test.js src\apex-control-room-utils.test.js src\apex-control-room-components-import.test.js src\app-routing.test.js src\navigation-utils.test.js src\app-navigation-components-import.test.js server\apex-os-memory.test.js server\role-permissions.test.js` with 119 passing tests.
- Role verification passed: `npm.cmd run verify:roles` with 15 passing tests.
- Production build passed: `npm.cmd run build` with the existing large-chunk warning and produced local Phase 16 bundles `assets/index-DY-46gkK.js`, `assets/app-domain-DKCxfotm.js`, and `assets/app-domain-BG7wb0Ah.css`.
- Isolated local browser QA passed on `http://127.0.0.1:4216/apex-control-room` using a temp SQLite/DATA_DIR setup and operator-enabled test user. Desktop and mobile verified the Personal Operating Layer, preference load, preference draft, manual approval, privacy locks, and zero horizontal overflow.
- Browser screenshots were saved locally under ignored `ui-audit/apex-control-room-phase16/`, including exact desktop/mobile Personal Operating Layer section captures.
- Browser console showed only the expected pre-login unauthenticated 401 resource warning; no page errors or failed requests were captured after login.

Permissions impact:

- Operator-only. Restricted users receive an empty Personal Operating Layer state and cannot see or manage preference memory.
- Field users, demo users, customers, pilots, and normal company users remain blocked from Apex OS state and controls.

Mobile impact:

- Desktop and mobile browser QA passed with no horizontal overflow. The Phase 16 panel stacks into a long mobile section but remains readable and usable.

Field-user impact:

- None. No field route/nav/API capability was added, and field-private boundaries remain unchanged.

Rollback plan:

- If local validation fails before deploy, revert the Phase 16 hard-finish commit to remove the Personal Operating Layer state, UI panel, focused tests, and docs.
- If production release fails after deploy, roll back Fly to the previous healthy release and revert the Phase 16 commit if the UI/state change is implicated.
- No database migration rollback is required because Phase 16 adds no schema and reuses existing Apex OS memory.

Production release state:

- Phase 16 was committed and pushed as `c2f99d4`, then deployed on 2026-06-03 to Fly app `concrete-ops-2` as release `v648`, image `registry.fly.io/concrete-ops-2:deployment-01KT6K0MDP5471S3TZBB3HHGHT`.
- The first backup attempt ran while the Fly VM was starting and returned "no started VMs"; after the machine reached started/passing, the predeploy production backup logged success with `postgres-app-data-20260603-111313Z.json`, `uploads-20260603-111313Z`, and `uploads-20260603-111313Z.manifest.json`. The Fly Windows SSH wrapper returned the known post-success `Error: The handle is invalid.` warning after the backup output.
- Rollback target is the previous healthy Phase 15 release `v647`, image `registry.fly.io/concrete-ops-2:deployment-01KT6H78S4DEYNQ1S72N63TTXS`.
- Post-deploy checks passed: Fly machine `148e06e2b53d68` is started on version `648` with 1 passing service check; `https://app.apexhq.online/api/ready` and `https://concrete-ops-2.fly.dev/api/ready` returned ready/database ok; `https://concrete-ops-2.fly.dev/api/health` returned healthy; hosted skip-auth health/routes smoke passed on `https://app.apexhq.online/`; `/apex-control-room` served `index-DY-46gkK.js`, `app-domain-DKCxfotm.js`, and `app-domain-BG7wb0Ah.css`; unauthenticated `/api/apex-os/build-awareness`, `/api/apex-os/memory`, and `/api/apex-os/ask` returned 401; and `/api/setup/status` showed setup complete, demo mode off, demo user absent, public signup disabled, and public estimate requests enabled.
- Production auth smoke/login was not run in this release pass.

Next recommended phase:

- Start Phase 17: Full Apex OS QA And Security Hardening only after this Phase 16 release evidence commit is pushed.

## Apex OS Phase 17: Full Apex OS QA And Security Hardening Hard-Finish Report

Date: 2026-06-03

Goal:

- Finish Phase 17 from the original Apex OS master plan before starting Phase 18: prove Apex OS is safe before treating it as complete, with role, company, direct-route, citation, upload privacy, approval-gate, build/release, visual, production-preview, docs-drift, no-secrets, no-bypass, and kill-switch evidence.

What was already built before this pass:

- Earlier Apex OS phases already provided private operator-only access, source-backed Ask Apex answers, Knowledge Vault intake, approval packets, agent handoff locks, build awareness, monitoring, release desk evidence, and personal operating memory.
- A first QA / Security Hardening UI existed from the earlier Apex OS slice, but it still needed final proof rows for production-preview smoke, docs/memory drift, and the access kill switch before the original Phase 17 exit criteria could be called complete.

What was completed in this pass:

- Added final QA / Security Hardening proof rows for production-preview smoke, docs/memory drift, and Apex OS access kill switch.
- Upgraded Phase 17 proof statuses so John-only private access, customer/company isolation, direct-route blocking, field-user blocking, approval gates, desktop/mobile visual quality, build/test/release safety, and risky-action bypass blocking show verified evidence instead of placeholder evidence-required rows.
- Connected build-awareness and release-desk state into the Phase 17 hardening packet so docs/source links, changed-file signals, deploy-history evidence, protected endpoint expectations, setup status, backup evidence, asset evidence, and rollback evidence can be reflected in the proof rows.
- Updated the Completion Audit copy to separate local hardening evidence from production/provider boundaries and keep deploys, rollbacks, provider setup, live sends, customer-visible changes, and production mutations approval-locked outside the UI.

Affected files:

- `src/apex-control-room-utils.js`
- `src/apex-control-room-utils.test.js`
- `src/apex-control-room-components.jsx`
- `src/apex-control-room-components-import.test.js`
- `docs/APEX_HQ_APEX_OS_COMMAND_CENTER_MASTER_PLAN.md`
- `docs/APEX_HQ_APEX_OS_HARD_FINISH_ROADMAP.md`
- `docs/APEX_HQ_LIVING_FINISH_PLAN.md`
- `docs/APEX_HQ_BUILD_STATUS_AND_PHASES.md`

Risk level:

- Low-medium. Phase 17 changes private operator UI/state evidence and tests only. It does not add schema, auth/session changes, provider setup, background jobs, agent execution, production data mutation, customer-visible actions, live sends, ad spend, billing/payment, deletion, or irreversible actions.

Validation results:

- Focused Phase 17 tests passed: `node --test --test-concurrency=1 src\apex-control-room-utils.test.js src\apex-control-room-components-import.test.js` with 11 passing tests.
- Broad Apex OS security regression was run with Ask Apex, voice, daily briefing, build awareness, approval packets, agent control, execution handoffs, memory, permissions, routing/navigation imports, role permissions, and company-scope tests. The first broad run had one transient `server\company-scope.test.js` server-start readiness miss; rerunning `node --test --test-concurrency=1 server\company-scope.test.js` passed all 15 tests.
- Role verification passed: `npm.cmd run verify:roles` with 15 passing tests.
- Production build passed: `npm.cmd run build` with the existing large-chunk warning and produced local Phase 17 bundles `assets/index-Da5InDXb.js`, `assets/app-domain-DsA5cCGr.js`, and `assets/app-domain-BG7wb0Ah.css`.
- `git diff --check` passed with line-ending warnings only.
- Isolated local browser QA passed on `http://127.0.0.1:4217/apex-control-room` using a temp SQLite/DATA_DIR setup and operator-enabled test user. Desktop and mobile verified the QA / Security Hardening surface, production-preview smoke proof path, docs/memory drift, access kill switch, bypass blocking, no horizontal overflow, and no page errors.
- Admin-blocked browser QA passed: `demo.admin@apexhq.app` direct route redirected to `/`, Apex OS hardening content was absent, `/api/apex-os/memory` returned 403, and admin view had no horizontal overflow.
- Browser screenshots were saved locally under ignored `ui-audit/apex-control-room-phase17/`, including `desktop-qa-security-hardening-final.png`, `mobile-qa-security-hardening-final.png`, and `desktop-completion-audit-final.png`.

Permissions impact:

- Operator-only. Restricted users receive no Apex OS hardening state and cannot see Apex OS panels.
- The access kill switch is access removal: `operatorAccess=false`, a non-office role, or switching out of the default Apex HQ workspace removes nav/bootstrap access and blocks Apex OS API/state.
- Field users, demo users, customers, pilots, and normal company users remain blocked from Apex OS state and controls.

Mobile impact:

- Desktop and mobile browser QA passed with no horizontal overflow. The hardening proof rows stack into a long mobile review surface and remain usable with the existing mobile bottom navigation.

Field-user impact:

- None. No field route/nav/API capability was added, and field-private boundaries remain unchanged. Field users still cannot see leads, estimates, pricing, margins, payroll, billing, office-only notes, AI office tools, admin setup, company setup, or other company data through Apex OS.

Rollback plan:

- If local validation fails before deploy, revert the Phase 17 hard-finish commit to remove the final hardening evidence rows, updated proof status derivation, Completion Audit copy, focused assertions, and docs.
- If production release fails after deploy, roll back Fly to the previous healthy release and revert the Phase 17 commit if the UI/state change is implicated.
- No database migration rollback is required because Phase 17 adds no schema and reuses existing Apex OS state.

Production release state:

- Phase 17 was committed and pushed as `52a3cf4`, then deployed on 2026-06-03 to Fly app `concrete-ops-2` as release `v649`, image `registry.fly.io/concrete-ops-2:deployment-01KT6MMM45QFCTYRQVCF7ABG07`.
- The predeploy production backup logged success with `postgres-app-data-20260603-114137Z.json`, `uploads-20260603-114137Z`, and `uploads-20260603-114137Z.manifest.json`. The Fly Windows SSH wrapper returned the known post-success `Error: The handle is invalid.` warning after the backup output.
- Rollback target is the previous healthy Phase 16 release `v648`, image `registry.fly.io/concrete-ops-2:deployment-01KT6K0MDP5471S3TZBB3HHGHT`.
- Post-deploy checks passed: Fly machine `148e06e2b53d68` is started on version `649` with 1 passing service check; `https://app.apexhq.online/api/ready` and `https://concrete-ops-2.fly.dev/api/ready` returned ready/database ok; `https://concrete-ops-2.fly.dev/api/health` returned healthy; hosted skip-auth health/routes smoke passed on `https://app.apexhq.online/`; `/apex-control-room` served `index-Da5InDXb.js`, `app-domain-DsA5cCGr.js`, and `app-domain-BG7wb0Ah.css`; unauthenticated `/api/apex-os/build-awareness`, `/api/apex-os/memory`, and `/api/apex-os/ask` returned 401; and `/api/setup/status` showed setup complete, demo mode off, demo user absent, public signup disabled, and public estimate requests enabled.
- Production auth smoke/login was not run in this release pass.

Next recommended phase:

- Start Phase 18: Finished Apex OS only after this Phase 17 release evidence commit is pushed.

## Apex OS Phase 18: Finished Apex OS Hard-Finish Report

Date: 2026-06-03

Goal:

- Finish Phase 18 from the original Apex OS master plan: make Apex OS complete enough to run Apex HQ day to day, prove the final owner run loop, and freeze the Apex OS completion state while keeping not-approved external/provider/customer-visible actions locked.

What was already built before this pass:

- Phases 1-17 already provided private operator access, branded command shell, state aggregation, decision memory, Knowledge Vault, Ask Apex, agent control, approvals, build awareness, business queues, monitoring/daily briefings, voice, knowledge intelligence, execution handoffs, release desk, personal operating layer, and final QA/security hardening.

What was completed in this pass:

- Added a Finished Apex OS state packet that assembles the original Phase 18 finished capabilities into one private proof map: John-only command center, text chat, voice input/output, reviewed knowledge and memory, decision log, source-backed answers, app/build awareness, agent control, approval center, launch/business queues, monitoring/daily briefings, kill switch, safe task execution handoff, release desk, and mobile owner cockpit.
- Added day-to-day run-loop rows for ask, decide, upload, approve, brief, monitor, plan, execute scoped tasks through handoffs, prepare releases, and manage agents.
- Added completion-freeze rows for phase freeze, completion state, final production-preview QA, blocked-action proof, and no next-phase jump.
- Added blocked-action proof rows for email/SMS/voice sends, ads/spend, billing/payment, customer-visible publishing, autonomous unrequested agents, and irreversible external actions.
- Rendered the Finished Apex OS cockpit near the top of the private Control Room so the final operating layer is visible before the older detailed phase surfaces.

Affected files:

- `src/apex-control-room-utils.js`
- `src/apex-control-room-utils.test.js`
- `src/apex-control-room-components.jsx`
- `src/apex-control-room-components-import.test.js`
- `docs/APEX_HQ_APEX_OS_COMMAND_CENTER_MASTER_PLAN.md`
- `docs/APEX_HQ_APEX_OS_HARD_FINISH_ROADMAP.md`
- `docs/APEX_HQ_LIVING_FINISH_PLAN.md`
- `docs/APEX_HQ_BUILD_STATUS_AND_PHASES.md`

Risk level:

- Low-medium. Phase 18 adds private operator UI/state evidence and tests over completed Apex OS systems. It does not add schema, auth/session changes, provider setup, background jobs, live agent execution, production data mutation, customer-visible actions, live sends, ad spend, billing/payment, deletion, or irreversible actions.

Validation results:

- Focused Phase 18 tests passed: `node --test --test-concurrency=1 src\apex-control-room-utils.test.js src\apex-control-room-components-import.test.js` with 11 passing tests.
- Role verification passed: `npm.cmd run verify:roles` with 15 passing tests.
- Production build passed on rerun: `npm.cmd run build` with the existing large-chunk warning and produced local Phase 18 bundles `assets/index-CzJhawJV.js`, `assets/app-domain-D96Adw9i.js`, and `assets/app-domain-BG7wb0Ah.css`. The first parallel build attempt hit a transient esbuild `write EPIPE`; the standalone rerun passed.
- Broad Apex OS regression passed cleanly on rerun: `node --test --test-concurrency=1 shared\apexOsKnowledgeIntelligence.test.js shared\apexOsVoice.test.js shared\apexOsAsk.test.js shared\apexOsDailyBriefing.test.js shared\apexOsBuildAwareness.test.js shared\apexOsApprovalPackets.test.js shared\apexOsAgentControl.test.js shared\apexOsExecutionHandoffs.test.js shared\apexOsMemory.test.js shared\permissions.test.js src\apex-control-room-utils.test.js src\apex-control-room-components-import.test.js src\app-routing.test.js src\navigation-utils.test.js src\app-navigation-components-import.test.js server\apex-os-memory.test.js server\role-permissions.test.js server\company-scope.test.js` with 134 passing tests. The first broad run had one transient import-file failure; rerunning that file passed, then the full broad rerun passed.
- Isolated local browser QA passed on `http://127.0.0.1:4218/apex-control-room` using a temp SQLite/DATA_DIR setup. Operator QA verified Finished Apex OS, Day-to-Day Run Loop, Completion Freeze, Still Blocked, source-backed proof rows, blocked external action rows, and zero horizontal overflow on desktop and mobile.
- Admin-blocked browser QA passed: `demo.admin@apexhq.app` direct route redirected to `/`, Finished Apex OS content was absent, `/api/apex-os/memory` returned 403, and admin view had no horizontal overflow.
- Browser screenshots were saved locally under ignored `ui-audit/apex-control-room-phase18/`, including `desktop-finished-apex-os.png`, `desktop-still-blocked.png`, `mobile-finished-apex-os-section.png`, `mobile-still-blocked.png`, and `admin-blocked-phase18.png`.
- `git diff --check` passed with line-ending warnings only.

Permissions impact:

- Operator-only. Restricted users receive empty Finished Apex OS rows and cannot see the Phase 18 cockpit.
- Field users, demo users, customers, pilots, and normal company users remain blocked from Apex OS state and controls.

Mobile impact:

- Desktop and mobile browser QA passed with no horizontal overflow. The Finished Apex OS cockpit stacks into mobile cards and remains usable with the existing mobile bottom navigation.

Field-user impact:

- None. No field route/nav/API capability was added, and field-private boundaries remain unchanged. Field users still cannot see Apex OS, leads, estimates, pricing, margins, payroll, billing, office-only notes, AI office tools, admin setup, company setup, or other company data through this surface.

Rollback plan:

- If local validation fails before deploy, revert the Phase 18 hard-finish commit to remove the Finished Apex OS state, cockpit UI section, focused assertions, and docs.
- If production release fails after deploy, roll back Fly to the previous healthy release and revert the Phase 18 commit if the UI/state change is implicated.
- No database migration rollback is required because Phase 18 adds no schema and reuses existing Apex OS state.

Production release state:

- Phase 18 was committed and pushed as `67aea87`, then deployed on 2026-06-03 to Fly app `concrete-ops-2` as release `v650`, image `registry.fly.io/concrete-ops-2:deployment-01KT6NZDJQGVF9G4PJ2P7FW7Y9`.
- The predeploy production backup logged success with `postgres-app-data-20260603-120459Z.json`, `uploads-20260603-120459Z`, and `uploads-20260603-120459Z.manifest.json`. The Fly Windows SSH wrapper returned the known post-success `Error: The handle is invalid.` warning after the backup output.
- Rollback target is the previous healthy Phase 17 release `v649`, image `registry.fly.io/concrete-ops-2:deployment-01KT6MMM45QFCTYRQVCF7ABG07`.
- Post-deploy checks passed: Fly machine `148e06e2b53d68` is started on version `650` with 1 passing service check; `https://app.apexhq.online/api/ready` and `https://concrete-ops-2.fly.dev/api/ready` returned ready/database ok; `https://concrete-ops-2.fly.dev/api/health` returned healthy; hosted skip-auth health/routes smoke passed on `https://app.apexhq.online/`; `/apex-control-room` served `index-CzJhawJV.js`, `app-domain-D96Adw9i.js`, and `app-domain-BG7wb0Ah.css`; unauthenticated `/api/apex-os/build-awareness`, `/api/apex-os/memory`, and `/api/apex-os/ask` returned 401; and `/api/setup/status` showed setup complete, demo mode off, demo user absent, public signup disabled, and public estimate requests enabled.
- Production auth smoke/login was not run in this release pass.

Next recommended phase:

- This Phase 18 release evidence commit freezes Apex OS completion. There is no Phase 19 in the Apex OS master plan; remaining blocked work is limited to separately approved external/provider/customer-visible actions.

Packaging and release state:

- Apex OS read-only Control Room package committed locally on branch `codex/apex-os-command-center` as `2fa3bd3`.
- Branch pushed to GitHub and PR opened: `https://github.com/jberlanga748-a11y/concrete-ops-2/pull/112`.
- Release validation rerun on packaging branch: `npm.cmd run verify:roles`, `npm.cmd run verify:server`, `npm.cmd run verify:backup`, `npm.cmd run verify:restore`, and `npm.cmd run verify:monitoring` passed.
- Durable memory focused validation passed: `node --test --test-concurrency=1 shared/apexOsMemory.test.js server/apex-os-memory.test.js src/apex-control-room-utils.test.js src/apex-control-room-components-import.test.js`.
- Ask Apex focused validation passed: `node --test --test-concurrency=1 shared/apexOsAsk.test.js shared/apexOsMemory.test.js server/apex-os-memory.test.js src/apex-control-room-utils.test.js src/apex-control-room-components-import.test.js`.
- Ask Apex UI wiring focused validation passed: `node --test --test-concurrency=1 shared/apexOsAsk.test.js shared/apexOsMemory.test.js server/apex-os-memory.test.js src/apex-control-room-utils.test.js src/apex-control-room-components-import.test.js`.
- Voice transcript confirmation focused validation passed: `node --test --test-concurrency=1 src/apex-control-room-utils.test.js src/apex-control-room-components-import.test.js`.
- Daily Briefing refresh focused validation passed: `node --test --test-concurrency=1 shared/apexOsDailyBriefing.test.js server/apex-os-memory.test.js src/apex-control-room-components-import.test.js`.
- Approval packet persistence focused validation passed: `node --test --test-concurrency=1 shared/apexOsApprovalPackets.test.js shared/apexOsMemory.test.js shared/apexOsAsk.test.js shared/apexOsDailyBriefing.test.js src/apex-control-room-utils.test.js src/apex-control-room-components-import.test.js` and `node --test --test-concurrency=1 server/apex-os-memory.test.js`.
- Execution handoff persistence focused validation passed: `node --test --test-concurrency=1 shared/apexOsExecutionHandoffs.test.js shared/apexOsApprovalPackets.test.js src/apex-control-room-utils.test.js src/apex-control-room-components-import.test.js` and `node --test --test-concurrency=1 server/apex-os-memory.test.js`.
- Approval packet persistence broader validation passed: `npm.cmd run verify:server`, `npm.cmd run verify:roles` after one transient role-test server startup timeout rerun, `npm.cmd run build`, and `git diff --check` with CRLF warnings only.
- Ask Apex UI browser QA passed locally on `http://localhost:5173/apex-control-room`: private operator submitted a deploy/SMS question and saw an Apex answer with source labels, local/provider mode, deploy warning, send/money warning, No execution control, and 0 horizontal overflow; normal admin direct route redirected away with no Apex Control Room or Ask Apex content and 0 horizontal overflow. Pre-login 401 console entries were expected unauthenticated bootstrap probes; no failed Ask Apex request was recorded.
- Voice transcript browser QA passed locally on `http://localhost:5173/apex-control-room`: private operator typed a manual transcript, confirmed it, copied it into Ask Apex, submitted it, received an Apex answer, kept Mic locked and Speech locked visible, and had 0 horizontal overflow. Pre-login 401 console entries were expected unauthenticated bootstrap probes; one aborted lazy route import came from navigation and did not affect the voice/Ask flow.
- Daily Briefing browser QA passed locally on `http://localhost:5173/apex-control-room`: private operator refreshed the briefing and saw current workspace pulse, briefing locks, no-autonomous-execution lock, source labels, and 0 horizontal overflow; normal admin direct route redirected away with no Apex Control Room or Daily Briefing content and 0 horizontal overflow. Pre-login 401 console entries were expected unauthenticated bootstrap probes; aborted lazy route imports came from navigation and did not affect the briefing refresh.
- Approval packet browser QA passed locally on `http://localhost:5173/apex-control-room`: private operator created a local-only approval packet draft, saw the draft, no-execution notice, Approve locked, Execute locked, and 0 horizontal overflow; normal admin direct route redirected to `/` with no Apex Control Room, Approval Packet Drafts, or Action title content and 0 horizontal overflow. The browser-created packet was removed from local data after QA, and `demo.ops@apexhq.app` / `demo.admin@apexhq.app` `operator_access` flags were restored to `0`. Screenshot: `ui-audit/apex-control-room-local/desktop-apex-control-room-approval-packets.png`.
- Fresh local backup/restore artifacts for the release packet: `app-data-20260602-222101Z.sqlite`, `app-data-20260602-222101Z.json`, `uploads-20260602-222101Z.manifest.json`, and `uploads-20260602-222101Z`.
- Historical packaging gate note: this early Control Room package gate predates the explicit Apex OS per-phase production approvals above. Production auth smoke/login still remains separately gated and was not run for Phase 11.

Audit/build-plan note:

- Existing Apex HQ systems audit is saved in `docs/APEX_HQ_APEX_OS_COMMAND_CENTER_MASTER_PLAN.md` under "Existing Systems Audit - 2026-06-02" and "Implementation Plan V1".
- Reuse existing route/nav permissions, operator access, AI Office, Agent OS, action inbox, learning memory, app health, launch readiness, and release safety systems before building any new Apex OS machinery.
- The next recommended Apex OS step is to clear the production-auth-smoke/deploy gate for the Control Room package when the exact production approvals are available, or continue locally with safe task-execution handoff design that still cannot execute deploys, sends, spend, provider setup, production mutation, customer-visible changes, or irreversible actions.

Risk/approval memory:

- Ask before schema, auth/session, provider/API secret, AI/speech/vector provider, production deploy, live automation, email/SMS, billing/payment, ad spend, production data, file deletion, or major refactor work.

## Active Product Goal: Apex Takeoff Studio

Goal recorded on 2026-05-31: build all planned Apex Takeoff Studio phases for Bluebeam-like takeoffs and AI-assisted estimating inside Apex HQ.

Plan file: `docs/APEX_HQ_TAKEOFF_STUDIO_PHASE_PLAN.md`.

Current status:

- The full takeoff/AI estimating system is approved as a product goal.
- Phase 1 Manual Takeoff Foundation is implemented and validated as a manual editor checkpoint.
- Phase 2 Estimate Integration checkpoints are implemented locally: reviewed takeoff quantities can create blank-priced estimate line drafts through safe assembly choices, selected reviewed rows can become customer-safe proposal proof, and GC/internal takeoff proof summaries can be prepared for review.
- Phase 3 Takeoff Assistant first checkpoint is implemented, validated, pushed, and frozen: deterministic review-first suggestions can flag calibration, depth, review, proof, assembly, line-prep, and GC-summary needs with apply/dismiss state.
- Phase 4 Proof/Revisions/Field Handoff first checkpoint is implemented and validated locally: active/superseded sheet state, item revision state, explicit field-safe handoff approval, revision warnings, proof snapshots, and foreman packet filtering now keep Takeoff Studio handoff context separate from office-only backup.
- Phase 5 Advanced Takeoff Power first checkpoint is implemented, validated, pushed, and frozen: tool sets, measurement legends, CSV import/export, revision comparisons, markup comments, and takeoff package export are available without schema, provider writes, automatic plan detection, customer sends, or field data exposure.
- Phase 6/7 Plan Viewer + Calibration first checkpoint is implemented, validated, pushed, and frozen: selected sheet workspace, safe preview URL support, image/PDF/embedded preview handling, sheet thumbnails, page metadata, visual measurement overlays, sheet-level calibration, and a review-first apply-scale helper now exist inside the current estimate backup structure.
- Phase 8 Manual Drawing Tools first checkpoint is implemented, validated, pushed, and frozen: owner/admin users can draw area, length, count, and volume draft measurements over the selected plan workspace with undo/clear/finish controls, while finished rows remain needs-review and office-only by default.
- Phase 9 Snapping System first checkpoint is implemented, validated, pushed, and frozen: selected-sheet drawing can snap to endpoints, segment projections, segment midpoints, intersections, and 45/90-degree angle increments with configurable tolerance and visible snap status.
- Phase 10 Markups + Review Layer first checkpoint is implemented, validated, pushed, and frozen: owner/admin users can switch the plan workspace into markup mode, pin notes/RFIs/scope/risk markers on the selected sheet, and review open/resolved plus office/proposal/field visibility counts.
- Phase 11 AI Plan Assist first checkpoint is implemented, validated, pushed, and frozen: owner/admin users can paste reviewed plan text/OCR notes and get local review-first suggestions for calibration, revisions/addenda, scope categories, counts, open RFIs, and draft/review gaps without external AI calls or automatic measurement.
- Phase 12 Auto-Measure Beta first checkpoint is implemented, validated, pushed, and frozen: reviewed plan text can create draft-only area, length, and count suggestions with confidence/rationale and owner/admin add-to-draft review controls.
- Phase 13 Production Hardening first checkpoint is implemented, validated, pushed, and included in current production code ancestry: Takeoff Studio now flags source gaps, calibration gaps, draft rows, unsafe customer/field review gates, large geometry risk, and local readiness counts in the owner/admin workspace.
- Phase 14 Real Plan File Handling first checkpoint is implemented, validated, pushed, and included in current production code ancestry: Takeoff Studio now registers safe PDF/image plan file candidates from existing upload records, reviewed estimate reference rows, and sheet source metadata, then attaches reviewed sources to selected sheets without schema, provider, OCR, auto-measure, send, or field-permission changes.
- Phase 15 PDF Page Rendering first checkpoint is implemented, validated, pushed, and included in current production code ancestry: Takeoff Studio now creates page-specific native PDF viewer URLs, shows selected-sheet PDF render readiness, and can add page-specific sheet records from reviewed PDF plan files without parsing, OCR, provider writes, schema changes, or field exposure.
- Phase 16 OCR / Plan Text Extraction Readiness first checkpoint is implemented, validated, pushed, and included in current production code ancestry: Takeoff Studio now tracks manual/review-first plan text source rows tied to registered files/sheets, folds reviewed pasted text into local Plan Assist and Auto-Measure Beta context, and keeps OCR/file parsing/external AI/provider writes/schema changes out of scope.
- Phase 17 Vision Auto-Measure Beta first checkpoint is implemented, validated, pushed, and included in current production code ancestry: Takeoff Studio now prepares source-aware draft measurement suggestions from reviewed extracted text plus registered plan-file and calibrated sheet context, without pixel inspection, OCR, external AI, certified quantities, provider writes, schema changes, or field exposure.
- Phase 18 Trade-Specific Auto-Takeoff Packs first checkpoint is implemented, validated, pushed, and included in current production code ancestry: Takeoff Studio now maps source-aware beta suggestions into concrete flatwork, sitework/demo, fence/linear, and general draft packs with safe assembly IDs, blank pricing, needs-review status, and office-only visibility.
- Phase 19 Production Pilot Hardening Gate first checkpoint is implemented, validated, pushed, and included in current production code ancestry: Takeoff Studio now has a local readiness gate over plan sources, reviewed text, calibration, draft isolation, beta safety, private-data terms, and browser geometry/source risk without production mutation, provider writes, schema changes, or field exposure.
- Phase 20 Final Freeze and Audit is implemented, validated, pushed, and included in current production code ancestry: Takeoff Studio Phases 14-19 are documented as a frozen code checkpoint with provider-backed OCR/vision, telemetry, durable audit trails, and deeper trade libraries deferred to later approved work.
- Estimate Studio, Proposals, Jobs, Uploads, AI Office, and field workflows must be extended, not rebuilt.
- AI must stay review-first and must not auto-measure as final truth, approve pricing, submit bids, send proposals, or mutate risky customer-facing records.
- Field users remain blocked from Estimate Studio, Takeoff Studio, pricing, margin, profit, payroll, billing, office notes, and AI Office controls.

Current next action:

- Takeoff Studio Phases 14-20 are complete for the approved review-first checkpoint and are included in the current production code ancestry through the Apex OS Phase 18 release line. Next recommended action is a controlled owner/admin demo with real sample plans before approving any provider-backed OCR/vision or production telemetry work.

## Production Patch: Estimate Proposal Type + Print Preview

Goal: make Estimate Studio let owner/admin users start the right proposal/estimate packet up front and immediately see/print a customer-safe packet preview.

What changed:

- Added New Estimate choices for Residential, Commercial, and GC / Prime proposal estimates.
- Residential, Commercial, and GC choices prefill customer-facing scope, inclusions, exclusions, assumptions, terms, and packet defaults.
- GC / Prime can also prefill GC Packet Lite sections when GC packet tools are available.
- Added a visible PDF / print preview card in New Estimate before save, with a Print / save PDF action.
- Persisted the selected proposal packet type through the estimate API/store as `proposal_packet_type`.
- Kept customer packet output separate from internal notes, margin, payroll, profit, and private backup.
- Kept field users redirected away from Estimates.

Validation:

- `npm.cmd run verify:estimates` passed.
- `npm.cmd run verify:roles` passed.
- `npm.cmd run build` passed.
- Desktop `/estimates` visual audit passed.
- Admin phone visual audit passed.
- Browser QA confirmed Residential/Commercial/GC chooser, GC selection, visible PDF/print preview, enabled print action, and employee restricted-route safety.
- `git diff --check` passed with CRLF warnings only.

Rollback note:

- Revert the production patch commit to remove proposal type selection, print preview wiring, and the `proposal_packet_type` store column. The migration adds a defaulted metadata column and does not mutate existing estimate pricing, customer data, field work, sends, payments, or provider state.

Next recommended phase:

- Continue Phase 7 Safety & Compliance Finish after this production patch is confirmed healthy.

## Current Phase

Post-launch verification and cleanup are current after the Phase 8-14 finish batch. Phases 1-14 are built, validated, pushed, deployed, and health-checked on production release `v616` for Fly app `concrete-ops-2`. The active production commit is `e904e5a`; the completed feature batch landed in `583b4a1`, and `e904e5a` fixed the production runtime packaging gap by copying/asserting `src/time-utils.js` in the Docker image.

The `v614` deploy from the finish batch failed at runtime because `/app/src/time-utils.js` was missing from the production image. Production was immediately rolled back to prior healthy release `v615`, the Docker packaging regression was fixed and tested, and production was redeployed successfully as `v616` with image `registry.fly.io/concrete-ops-2:deployment-01KSWP2150N1VYY9JMW6VDC3J6`.

Current production evidence:

- `https://app.apexhq.online/api/ready` returned `ok: true`, `status: ready`, database `ok`.
- Hosted smoke with `--skip-auth` passed `/api/health`, `/api/ready`, and the protected route shell checks.
- Production auth smoke GitHub Actions run `26686917811` completed successfully against `e904e5a`.
- Public unauthenticated visual QA passed for the production login shell on desktop and mobile, unauthenticated `/app-health` desktop, and unauthenticated `/jobs` mobile with no app-shell leak, no error text, and no horizontal overflow.
- Local production smoke password was not present in the shell, so interactive authenticated browser QA was not rerun locally; the GitHub production auth smoke is the authenticated production evidence for this pass.

Phase 8-14 status:

- Phase 8 Change Order Finish: built, verified, and deployed. Change requests, office review/pricing, approval/rejection tracking, job scope/status updates, and billing-readiness linkage remain manual/review-first with field-safe assigned-job context.
- Phase 9 Payroll Prep Finish: built, verified, and deployed. Owner/admin users can review pay periods, time exceptions, payroll-ready hours, and CSV export over the existing Time system. This is payroll prep only, not payroll processing.
- Phase 10 Closeout & Billing Prep Finish: built, verified, and deployed. Closeout composes jobs, reports, uploads/photos, tickets, checklists, time summaries, approved changes, and billing/package readiness without creating invoices or payment links.
- Phase 11 Reputation & Portfolio Finish: built, verified, and deployed. Completed work can become review asks, referral asks, project stories, portfolio proof, and proposal proof blocks without fake claims, live sends, or publishing.
- Phase 12 Communications & Customer Portal Finish: built, verified, and deployed. Manual-safe Communication Center and Customer Portal review workflows remain locked against email/SMS sends, portal token redemption, public customer actions, invoices, payments, and production-provider changes.
- Phase 13 Assistant Finish: built, verified, and deployed. Apex Assistant / AI Office / Agent OS / Action Inbox remains a review-first helper layer over existing workflows and does not execute risky external actions.
- Phase 14 Launch Finish: built, verified, and deployed. Launch-readiness gates and evidence surfaces are in place while public signup, pricing/package changes, billing/payment collection, production auth/secrets/DNS/monitoring/backups/deploy config, and production data changes remain approval-gated.

Next recommended phase:

- Post-launch route/workflow QA refresh and cleanup triage only. Do not start another broad product build unless live QA, demo, pilot, or customer evidence identifies a specific blocker.

Completed historical phase note:

Phase 7 Safety & Compliance Finish is built, validated, pushed, deployed, and health-checked. Owner/admin Safety, Toolbox Talks, PPE, and Tool Checklist workflows now keep office review control, field-safe submission/acknowledgment, job readiness blockers, reopen lifecycle paths, and audit/activity evidence aligned without schema, auth/session, billing, provider, GPS, or production-data changes. Phase 1 Admin Foundation, Phase 2 Command Center, Phase 3 Growth & Sales, Phase 4 Estimate & Proposal, Phase 5 Job Operations, and Phase 6 Field Execution remain complete/frozen.

Phase 1 blockers are fixed in production: `/imported-drafts` renders for owner/admin users, `npm.cmd run verify:job-draft-imports` is green, and owner/admin setup now has a single Admin Foundation Finish board in Settings.

Slice 1 status: Admin Foundation state utility and tests are built, pushed, deployed to production, and health-checked. `npm.cmd run verify:admin-foundation` passes with the new utility coverage.

Slice 2 status: Admin Foundation Finish Board is built, pushed, deployed to Fly version `606`, and health-checked. Owner/admin Settings now summarizes setup, users/roles, field lockout, app health, support, imported drafts, provider readiness, and package/billing readiness from one board. Final local browser QA passed for owner/admin Settings, Employees, App Health, Support, and Imported Drafts; employee mobile direct routes to Settings, Employees, App Health, and Imported Drafts redirected to Jobs, while Support stayed role-safe.

Phase 2 status: Command Center Finish is built and validated locally. Owner/admin Command Center now opens with a Daily Command Plan covering today attention, job/crew status, proof/report gaps, sales follow-up, billing-ready work, growth/client-finder actions, blockers, provider setup, and exact next actions routed to existing tools or locked setup states. Field users remain redirected to assigned field work.

Phase 3 status: Growth & Sales Finish is built, validated, and deployed. Owner/admin Growth Command lanes now route directly to existing AI Office, Opportunity Scout, Sales Follow-Up, Ads Spend Advisor, and Reputation/Portfolio surfaces or clear setup states. Leads now support Won, Lost, and Not Interested outcomes so closed opportunities leave the active review queue while source quality and conversion health remain visible. Field users remain redirected to assigned field work and cannot access growth, lead, estimate, pricing, ads, reputation, or AI Office controls.

Phase 4 status: Estimate & Proposal Finish is built, validated, deployed, and health-checked. Owner/admin Estimate Studio now covers create-from-lead/customer/rough-notes flow, final proposal packet readiness, customer-safe/internal packet separation, GC Packet Lite review, PDF/print/manual send readiness, rate book defaults, calculator/takeoff adjacency, and estimate-to-job handoff readiness. The legacy Last Yard proposal generator surface has been rebranded to Apex HQ-neutral proposal defaults and guarded by tests so estimate/proposal surfaces do not expose retired pilot brand copy. Field users remain redirected to assigned field work and cannot access estimates, proposals, pricing, customer packet controls, internal notes, margin/profit/payroll, or office-only proposal data.

Phase 5 status: Job Operations Finish is built, validated, deployed, and health-checked. Owner/admin Jobs now has a Job Operations Finish panel that composes approved handoff/source state, schedule, crew assignment, startup checklist, field visibility, material prep, tool readiness, safety/proof, and completion readiness into one routed review layer. Field users remain redirected to assigned field work and cannot access job operations finish, pricing, margins, payroll, billing, estimate packet context, office notes, customer sends, vendor orders, provider writes, or other company data.

Phase 6 status: Field Execution Finish is built, validated, deployed, and health-checked. Employee and foreman field workspaces now have one field-safe command layer from assigned work through arrival/start, proof capture, daily reports, delivery tickets, checklists, safety, change request handoff, end-of-day closeout, and honest install/offline readiness. Field users remain assigned-job scoped and cannot access leads, estimates, pricing, profit/margins, payroll, office notes, admin setup, AI office tools, billing, provider context, estimate packet context, hidden GPS, automatic sends, vendor orders, or production data mutations.

Phase 7 status: Safety & Compliance Finish is built and validated. Owner/admin users can manage safety incidents, toolbox guidance, PPE requirements, acknowledgments, and tool checklist review from the existing safety/tool surfaces. Office users can reopen reviewed/resolved incidents and submitted/reviewed tool checklists for correction, with audit/activity events and lifecycle guards. Field users remain assigned-scope only: they can submit visible safety concerns, acknowledge field-safe PPE/toolbox guidance, update assigned tool loadouts, and submit allowed field checklists without seeing leads, estimates, pricing, profit/margins, payroll, office-only notes, admin settings, AI office tools, billing, or other company data.

Phase 7 release evidence:

- Commit `02992d9` pushed to `main`.
- Fly app `concrete-ops-2` deployed as machine version `613`.
- Image: `concrete-ops-2:deployment-01KSWDKJYGJGAG3Q5EVV9Z7VF8`.
- `https://app.apexhq.online/api/ready` returned `ok: true`, `status: ready`, database `ok`.
- `https://concrete-ops-2.fly.dev/api/ready` returned `ok: true`, `status: ready`, database `ok`.
- `fly status --app concrete-ops-2` showed machine `148e06e2b53d68` started with `1 passing` check.

Phase 7 validation:

- `npm.cmd run verify:safety` passed.
- `npm.cmd run verify:tool-checklist` passed.
- `npm.cmd run verify:jobs` passed.
- `npm.cmd run verify:roles` passed.
- `npm.cmd run build` passed with existing large-chunk warnings only.
- `git diff --check` passed with CRLF warnings only.
- Safety/compliance visual audit passed for admin, foreman, and employee across desktop/phone on `/incidents`, `/toolbox-talks`, `/ppe`, and `/tool-checklist`: `ui-audit/phase7-safety-compliance/2026-05-30T12-19-17-864Z-31568-ahrqqz/manifest.json`.
- Field restricted-route visual audit passed for foreman and employee phone on `/leads`, `/estimates`, `/settings`, `/app-health`, and `/billing`: `ui-audit/phase7-field-restricted-checks/2026-05-30T12-23-02-600Z-28976-iw5goa/manifest.json`.
- Manual screenshot review covered owner/admin desktop incidents and tool checklist plus foreman/employee phone PPE/tool checklist views under `ui-audit/phase7-safety-compliance/manual-screens/`.

Phase 7 permissions impact:

- No permission loosening.
- Field safety/tool access remains scoped to visible jobs and existing field permissions.
- Reopen endpoints require office review permissions and reject archived or already-open/active records.

Phase 7 mobile impact:

- Admin, foreman, and employee phone route audits passed for the safety/tool cluster.
- Field phone restricted-route checks passed for office-only routes.

Phase 7 rollback:

- Revert the Phase 7 commit to remove the safety incident/tool checklist reopen API methods, UI buttons, and tests. Existing incident, PPE, toolbox, and tool checklist records remain compatible because no schema migration was added.

Historical next recommendation:

- Phase 8 Change Order Finish was the next phase after Phase 7 and is now complete, verified, and deployed.

## Product North Star

Apex HQ is a finished contractor growth and operations platform. It helps contractors find work, advertise wisely, capture and follow up with leads, estimate and win work, schedule and run jobs, guide crews, prove work, handle changes, prepare billing, collect reviews/referrals, and know what to do next every day.

Core loop:

Find work -> advertise smart -> capture lead -> follow up -> estimate -> propose -> win -> schedule -> run field work -> prove work -> close out -> get paid -> create more trust and leads.

## Operating Rules

- Finish one whole phase, then stop and review it.
- A phase means one complete business workflow, not a small slice or readiness panel.
- After a phase is finished, freeze it and do not revisit it except for bugs, security/permission issues, mobile blockers, provider hookups, or approved versioned upgrades.
- Do not rebuild working systems.
- Use existing code first.
- Build provider-ready states when paid accounts or API keys are not configured yet.
- Standing production release approval is granted for completed, verified phases. Deploy after validation, push, hosted health check, and deploy-log update without asking again.
- Production readiness checks are release evidence and rollback inputs, not phase-blocking approval gates, unless the deploy command fails or the work would touch secrets, paid spend, live sends, billing/payment processing, destructive data, hidden GPS/privacy, auth/session control, or known incident risk.
- No autonomous ad spend, customer sends, payment processing, bid submission, purchasing, destructive data action, hidden GPS, or production data change.
- Field users must not see leads, estimates, pricing, profit/margins, payroll costs, office notes, admin settings, company setup, AI office tools, billing, or other company data.
- Every new request goes into this file as Now, Next, Later, or Provider-dependent.

## Built / Partial / Missing Inventory

| Area | Status | Notes |
| --- | --- | --- |
| Opportunity Scout / Client Finder | Built | Search profiles, lead sources, found opportunities, source checks, review-first conversion to leads, Agent Leads readiness layers. |
| Daily Job Finder / Agent Leads | Partial | Review-first infrastructure and source readiness are built. Live provider accounts, real source credentials, and production runs remain provider/account-dependent. |
| Source adapters and source health | Partial | Public/private source posture, provider setup, evidence packets, and source health exist. Live external connectors depend on approved providers/accounts. |
| Website/public request intake | Built / Partial | Public estimate/demo request foundations exist. Public estimate request now captures service type, project type, timing, budget, referral source, attribution, consent, thank-you state, and creates a manual office lead/review task. Website builder and SEO/service-page drafts remain later. |
| Sales follow-up | Built | Owner/admin Sales Follow-Up System now combines daily queue, stale estimate reminders, manual scripts, won/lost learning, source quality, referral/review asks, and manual won/lost logging. Provider sends stay locked until configured and reviewed. |
| Ads / Marketing Spend Advisor | Partial | Growth Command Center now exposes provider-ready spend guardrails, channel recommendations, stop-loss rules, and draft planning. Live ad publishing/spend is locked. |
| Reputation + Portfolio Engine | Built / Frozen after Phase 11 release | Owner/admin Growth Command Center now turns existing jobs, reports, uploads, and estimates into project story candidates, before/after selection guidance, review/referral drafts, proposal proof blocks, social/website drafts, and proof blockers. Sends and publishing remain manual/provider-ready only. |
| Estimate Studio / proposals | Built / Frozen after Phase 4 release | Estimate Studio, packets, PDF, options, customer-safe/internal packet separation, GC Packet Lite, send-review gate, field-safe handoff, final proposal packet review, and Apex HQ-neutral proposal generator defaults are built. Live email send still depends on configured provider and human confirmation. |
| Core operations loop | Built | Owner/admin Operations Command now ties lead follow-up, estimates/proposals, approved-job handoff, schedule/crew setup, field proof, material prep, change orders, closeout, job costing, and billing readiness into one review-first next-action loop. |
| Job operations | Built / Frozen after Phase 5 release | Owner/admin Jobs now ties approved source/handoff, scheduling, crew assignment, startup readiness, field visibility, material prep, tools, safety/proof, and completion readiness into one review-first finish layer. Field users remain assigned-work only. |
| Command Center Finish | Built | Owner/admin Command Center now opens with a Daily Command Plan that routes today's attention, jobs/crew, proof gaps, sales follow-up, billing-ready work, growth/client-finder work, blockers, and provider setup to real existing tools or locked setup states. |
| Field Mode | Built / Frozen after Phase 6 release | Field-safe mobile workflows now include the Field Execution Finish command layer for today's assigned job, arrival/start readiness, clock/time, photos/proof, daily reports, delivery tickets, checklists, safety/PPE, change requests, end-of-day handoff, PWA install readiness, and honest offline-draft planning. |
| Change orders | Built / Frozen after Phase 8 release | Existing Change Orders workflow now covers field request, office review/pricing, manual customer/GC approval tracking, job scope/status update, and billing-readiness linkage. No public approval links, sends, e-sign, payment, or accounting writes were added. |
| Time / Payroll prep | Built / Frozen after Phase 9 release | Existing Time workflow now supports owner/admin pay-period review, exception review, payroll-ready hour approval, and payroll-ready CSV export. Live payroll processing, paychecks, direct deposit, tax withholding, provider writes, and payroll costs remain locked out of scope. |
| Closeout / Billing prep | Built / Frozen after Phase 10 release | Owner/admin closeout/billing-prep readiness composes existing job proof, reports, uploads/photos, delivery tickets, checklists, time summaries, approved change orders, and package/billing readiness. It does not create invoices, payment links, receipts, taxes, provider writes, or payment collection. |
| Apex Agent Operator | Built / Frozen after Phase 13 release | Owner/admin AI Office now has one Apex Agent Operator command layer across new work, ads, follow-up, estimates, proposals, handoffs, closeout, billing readiness, reviews/referrals, Agent OS, action inbox, audit-backed review packets, learning, and external-action locks. |
| Customer portal + communications | Built / Provider-ready / Frozen after Phase 12 release | Owner/admin Communication Center now includes Customer Portal Command for customer-safe proposal/proof/change-order packet review, expiring/revocable access records, share approval decisions, customer comment capture, locked preflight/execution contracts, and human-reviewed email/SMS readiness. Live customer portal serving, token redemption, and provider sends remain provider/account-dependent. |
| Billing/payments/packages | Built / Provider-ready | Owner/admin Billing / Payments / Packages Command now covers package state, payment provider readiness, checkout/manual invoice lanes, billing candidates, package/billing audit, receipts, failed-payment states, and blocked live-money actions. Stripe or chosen provider remains unconfigured for live processing. |
| Integrations | Built / Provider-ready | Owner/admin Integrations Command now maps QuickBooks, Gmail, Google Calendar, Google Drive, Twilio, Maps/weather, CompanyCam, DocuSign/e-signature, and Google/Meta Ads with settings UI, server-adapter readiness, provider health, disabled/not-configured states, no frontend secrets, audit trail, disconnect/disable controls, package gate, and locked integration writes. Live provider accounts/API keys remain provider-dependent. |
| Scale/public launch | Launch-readiness gates built / public self-serve locked | Phase 14 launch-readiness gates and evidence surfaces are built and deployed. Wide public self-serve launch, public signup, pricing/package behavior changes, billing/payment collection, production auth/secrets/DNS/monitoring/backups/deploy config changes, and production data actions remain approval-gated. |

## User Request Inbox

### Now

- Preserve `docs/APEX_HQ_APEX_OS_COMMAND_CENTER_MASTER_PLAN.md` as the master memory for the private Apex OS / Apex HQ Command Center vision.
- Treat Apex OS as Apex HQ's real internal operating center for John Berlanga, not as a fake/demo contractor company workspace.
- Keep Apex OS private to John/operator access; customers, field users, demo users, and normal company workspaces must not see it.
- Give Apex OS broad autonomy for local/private planning, drafting, analysis, design, code preparation, testing, summaries, task creation, and recommendations; require John's approval for external, irreversible, customer-visible, private-data-sensitive, production, permission, provider, or money-related actions.
- Keep building the finished roadmap, not only pilot slices.
- No looped rebuilds.
- Use `docs/APEX_HQ_TOOL_COMPLETION_BLUEPRINT.md` as the active tool-by-tool finish source of truth.
- Break every tool into complete start-to-finish phases, finish the assigned tool cluster, then freeze those tools.
- Owner/admin must be able to see how Apex HQ helps find new clients.
- Add ads planning so Apex Agent helps contractors decide where to spend and what limits to use.
- Keep provider/account-dependent systems visible and buildable, but do not allow real spend/sends/payments without provider setup and explicit owner action inside that workflow.
- Finish whole phases before stopping for review.
- Deploy completed verified phases to production under standing approval; do not pause only because launch-gate scripts classify unpaid/pilot/public-launch items as NO-GO.
- Start Phase 1 with skills, code review, browser review, roadmap/memory review, and an exact work package before implementation.
- Do not freeze any phase while a route crashes, a focused verification command is red, or field/admin boundaries are unproven.

### Next

- Review and package the local Apex OS Command Center implementation before any provider-backed knowledge search, speech, durable memory/storage, production deploy, or agent-control execution.
- Run post-launch route/workflow QA refresh and cleanup triage.
- Archive or delete untracked temp/demo/security-support artifacts only after explicit cleanup approval.
- Keep future build work narrow and evidence-driven: fix confirmed live/demo/pilot blockers, not broad new phases.

### Later

- Offline field drafts.
- Website builder and SEO/service page drafts.
- Public launch signup and package/pricing site polish.

### Provider-dependent

- Live ad account reporting or publishing.
- Stripe or payment provider.
- Tokenized customer portal sends.
- Twilio/SMS, email provider, Gmail/Calendar, QuickBooks, Google Drive, CompanyCam, DocuSign/e-signature, Maps/weather, Google/Meta Ads APIs.

## Completed Phase Checklist: Growth Foundation

- [x] Create living finish plan.
- [x] Inventory Client Finder / Opportunity Scout / Agent Leads.
- [x] Add provider-ready Ads / Marketing Spend Advisor logic.
- [x] Add Reputation + Portfolio Engine planning signals.
- [x] Build owner-facing Growth Command Center around new work, source review, ads, follow-up, and reviews/referrals.
- [x] Verify phase tests and build.
- [x] Browser QA owner/admin desktop and field mobile safety.
- [x] Commit and push phase.
- [x] Standing production release approval recorded; deploy after validation and hosted health-check.
- [x] Update this file with final phase report.

## Completed Phase Checklist: Website + Lead Intake Funnel

- [x] Keep existing public estimate request route and review-first lead workflow.
- [x] Add trade/service-specific intake fields.
- [x] Capture timeline, budget range, referral source, photo/document notes, and consent.
- [x] Capture source attribution from page URL, referrer, and UTM values.
- [x] Ensure public form can safely target the single active workspace without exposing field data.
- [x] Keep honeypot, rate limiting, required contact channel, explicit target company, and secret redaction.
- [x] Create only manual office lead and due-today review task; no estimate, job, message, invoice, payment, or portal access.
- [x] Add thank-you/next-step state.
- [x] Add owner/admin setup checklist notes in Settings.
- [x] Verify phase tests, build, browser QA, and field safety.
- [x] Commit and push phase.
- [x] Standing production release approval recorded; deploy after validation and hosted health-check.

## Completed Phase Checklist: Sales Follow-Up System

- [x] Keep existing lead, contact history, and follow-up queue systems.
- [x] Add owner/admin Sales Follow-Up System command layer.
- [x] Show daily follow-up work, due/overdue/not-contacted/waiting leads, and manual action prompts.
- [x] Add stale estimate reminders for sent proposals with overdue, missing, or stale follow-up.
- [x] Add call, voicemail, email, text, referral ask, and review ask scripts as manual copy only.
- [x] Add won/lost learning and source-quality summaries.
- [x] Add manual won/lost logging hooks without sending messages or changing ad spend.
- [x] Keep field users blocked from lead, estimate, source, script, and sales command surfaces.
- [x] Verify phase tests, build, browser QA, and field safety.
- [x] Commit, push, deploy, hosted health-check, and record production deploy.

## Completed Phase Checklist: Reputation + Portfolio Engine

- [x] Reuse existing jobs, reports, uploads, estimates, and Growth Command Center.
- [x] Add owner/admin project story candidates from real field proof.
- [x] Add before/after photo selection guidance without exposing GPS coordinates or private details.
- [x] Add manual review request and referral ask drafts.
- [x] Add proposal proof blocks for future customer/GC packets.
- [x] Add social and website draft copy with manual publish boundaries.
- [x] Add proof blockers for completed jobs that lack uploads or reviewed reports.
- [x] Keep field users blocked from reputation, referral, review, social, website proof, lead, estimate, pricing, and AI office growth controls.
- [x] Verify phase tests, build, browser QA, and field safety.
- [x] Commit, push, deploy, hosted health-check, and record production deploy.

## Completed Phase Checklist: Estimate Studio + Proposal Packets

- [x] Reuse existing Estimate Studio, estimate math, packet presets, PDF print model, GC packet lite, backup/SOV, sent snapshots, and handoff readiness.
- [x] Add final proposal packet readiness state for customer packet, option comparison, terms/exclusions/assumptions, proof/takeoff backup, GC packet, send mode, and foreman handoff.
- [x] Keep customer-facing packet review separate from internal review packet content, private URLs, margins, profit, payroll, and office-only notes.
- [x] Add owner/admin Estimate Studio command panel for Final Proposal Packet Review.
- [x] Add packet-mode final review summary without sending, converting, scheduling, billing, or changing field visibility.
- [x] Remove retired Last Yard pilot branding from active estimate/proposal surfaces and add a proposal brand guard test.
- [x] Keep field users blocked from estimates, packets, pricing, customer send controls, and office-only proposal work.
- [x] Verify phase tests, build, browser QA, and field safety locally.
- [x] Commit, push, deploy, hosted health-check, and record production deploy.

## Completed Phase Checklist: Core Operations Loop

- [x] Reuse existing command center, leads, estimates, jobs, schedule, daily reports, uploads, delivery tickets, safety, tool checklist, time, change orders, material prep, and closeout billing review systems.
- [x] Add owner/admin Core Operations Loop state layer for lead intake, estimate/proposal, approved job handoff, schedule/crew, field proof, material prep, change orders, and closeout/billing readiness.
- [x] Add Operations Command panel with stage readiness, next action, workflow shortcuts, and money/closeout/material/costing metrics.
- [x] Keep the loop review-first only: no record mutation, sends, ordering, invoicing, billing, payments, purchasing, customer/GC/vendor/provider actions, job status changes, or field visibility changes from the panel.
- [x] Block field-only users from the loop and keep them out of leads, estimates, pricing, billing, margins, profit, payroll, office notes, AI office controls, and company setup.
- [x] Verify focused tests, jobs verification, role verification, build, diff check, and browser QA.
- [x] Commit, push, deploy, hosted health-check, and record production deploy.

## Completed Phase Checklist: Field Mode Finish

- [x] Reuse existing Field Mode, mobile jobs, time, uploads, daily reports, delivery tickets, tool checklists, safety, change request, assignment notice, and PWA foundations.
- [x] Add a field-safe Field Day Finish state layer.
- [x] Add a mobile-first Field Day Finish panel for today's job, clock/time, assignment notice, photos/proof, daily report, delivery tickets, checklists, safety/PPE, change request, and install/offline readiness.
- [x] Keep employee users out of foreman-only daily report and change request controls.
- [x] Keep field users blocked from leads, estimates, pricing, billing, margins, profit, payroll, office notes, AI office controls, company setup, and other company data.
- [x] Keep GPS optional and user-tapped only; no hidden location tracking.
- [x] Keep PWA install-ready without claiming offline editing or hidden API caching. Offline drafts remain a later item.
- [x] Verify focused field/mobile tests, jobs verification, role verification, PWA guardrail test, build, diff check, and browser QA.
- [x] Commit, push, deploy, hosted health-check, and record production deploy.

## Completed Phase Checklist: Apex Agent Operator

- [x] Reuse existing AI Office, Apex Assistant shell, Agent OS console, Agent Action Inbox, Growth Command Center, Estimate Studio, Core Operations Loop, Field Ops Agent, closeout billing review, and Reputation + Portfolio Engine.
- [x] Add one owner/admin Apex Agent Operator command layer across find new work, plan ads, follow up, draft estimates, prepare proposals, prep job handoffs, review closeout, prepare billing readiness, and request reviews/referrals.
- [x] Route every command into existing Apex HQ workflows instead of bypassing review screens.
- [x] Keep provider-ready boundaries visible for ads, customer sends, billing/payments, portal shares, bids, schedules, integrations, and other external actions.
- [x] Keep no autonomous ad spend, customer contact, bid submission, invoice/payment, provider write, schedule mutation, crew notification, production data, secret, package, billing provider, hidden GPS, or field visibility action from this operator layer.
- [x] Keep field users blocked from Apex Agent Operator, AI Office, office commands, growth, estimates, money, settings, and other private office controls.
- [x] Add mobile-safe command layout for admin/owner AI Office without overflow.
- [x] Verify focused operator tests, Agent OS console smoke, jobs verification, role verification, build, diff check, and browser QA.
- [x] Commit, push, deploy, hosted health-check, and record production deploy.

## Completed Phase Checklist: Customer Portal + Communications

- [x] Reuse existing customer portal preview, access record, share approval, public route contract, outbound approval, suppression, delivery-attempt, and communication center systems.
- [x] Add owner/admin Customer Portal Command inside Communication Center.
- [x] Show customer-safe proposal/proof/progress/change-order packet candidate and readiness.
- [x] Prepare expiring/revocable internal access records without public links, raw tokens, customer sessions, messages, invoices, or payments.
- [x] Queue and review customer portal share approval decisions.
- [x] Prepare locked external gate preflight and execution-contract evidence without enabling customer-facing execution.
- [x] Capture customer portal comments/approval/rejection notes as internal contact history.
- [x] Keep human-reviewed email/SMS approval, suppression, and delivery-attempt contracts visible in the same workflow.
- [x] Keep field users blocked from communications, portal command, estimates, pricing, and office/customer-send controls.
- [x] Verify focused portal/communications tests, customer portal readiness, role verification, build, diff check, and browser QA.

## Completed Phase Checklist: Billing / Payments / Packages

- [x] Reuse existing package definitions, entitlements, Plan Readiness, support upgrade review, audit events, and closeout billing review foundations.
- [x] Add owner/admin Billing / Payments / Packages Command inside Settings.
- [x] Show package/subscription state, current/next package, provider readiness, checkout lane, manual invoice lane, receipts, failed-payment states, and payment-link prep.
- [x] Show billing-ready job candidates and estimate/change-order review totals without creating invoices, checkout sessions, payment links, charges, receipts, or package mutations.
- [x] Show package/billing audit history when available.
- [x] Keep Stripe/chosen provider provider-ready until account/API keys/webhooks/tax/legal/audit controls are configured.
- [x] Keep no frontend secrets and no live payment processing.
- [x] Keep field and non-owner/admin users blocked from billing, package, payment, invoice, receipt, margin, profit, payroll, and provider context.
- [x] Verify focused billing tests, billing readiness, role verification, build, diff check, and browser QA.

## Completed Phase Checklist: Integrations

- [x] Reuse existing inbound integration contracts, imported job drafts, public lead intake, package entitlements, Settings, audit events, and Agent OS external gate boundaries.
- [x] Add owner/admin Integrations Command inside Settings.
- [x] Track QuickBooks, Gmail, Google Calendar, Google Drive, Twilio, Maps/weather, CompanyCam, DocuSign/e-signature, and Google/Meta Ads readiness.
- [x] Show settings UI, server adapter readiness, provider health, disabled/not-configured state, tests, no frontend secrets, audit trail, and disconnect/disable control for every provider.
- [x] Add built inbound contract review for website lead intake, imported job drafts, proposal app handoff, and the locked Agent integration write gate.
- [x] Add package-gated `integrations` entitlement and server/client permission shape with `canWrite: false`.
- [x] Keep live provider writes, OAuth exchange, customer sends, invoices/payments, ad publishing/spend, calendar/file mutations, hidden GPS, secrets, and field-user integration context blocked.
- [x] Verify focused integration tests, role verification, build, diff check, and browser QA.

## Completed Phase Checklist: Job Operations Finish

- [x] Reuse existing Jobs, Schedule, Material Prep, Startup Checklist, proof/uploads, daily reports, delivery tickets, safety, tools, and role permission boundaries.
- [x] Add owner/admin Job Operations Finish state utility and Jobs panel.
- [x] Tie approved source/handoff, schedule, crew, scope/jobsite, startup, field visibility, materials, tools, safety, proof, and completion readiness into one routed review layer.
- [x] Keep the workflow review-first: no customer sends, vendor orders, provider writes, billing actions, payroll actions, field notifications, schema changes, or production data mutations.
- [x] Keep field users blocked from Job Operations Finish and any pricing, margin, payroll, billing, estimate packet, office note, provider, or other-company context.
- [x] Verify focused job operations tests, `verify:jobs`, `verify:roles`, build, diff check, desktop owner/admin browser QA, and mobile field-route browser QA.

## Completed Phase Checklist: Field Execution Finish

- [x] Reuse existing field workspace, assigned jobs, time, uploads/proof, daily reports, delivery tickets, pre-pour/post-pour/tool checklists, safety, toolbox/PPE, change orders, PWA, and role permission boundaries.
- [x] Add a field-safe Field Execution Finish command layer for employee and foreman mobile workflows.
- [x] Tie assigned work, arrival/start readiness, proof reminders, daily report completion, delivery tickets, checklists, safety capture, change request handoff, end-of-day closeout, and install/offline readiness into one routed workflow.
- [x] Keep all actions review-first or field-local: no schema/auth/session/billing/GPS changes, hidden GPS, live sends, invoices, payments, vendor orders, provider writes, customer sends, or production data mutations.
- [x] Keep field users blocked from leads, estimates, pricing, profit/margins, payroll, office notes, admin setup, AI office tools, billing, provider context, estimate packet context, and other company data.
- [x] Verify focused field execution tests, `verify:jobs`, `verify:roles`, daily reports, uploads, time, delivery tickets, tool checklist, safety, pre-pour, post-pour, change orders, build, diff check, mobile field browser QA, and restricted route browser QA.

## Active Phase Checklist: Phase 1 Admin Foundation Finish

- [x] Read repo memory, roadmaps, operating model, and active blueprint.
- [x] Use Apex skills for coordinator, product, build, permissions, QA, and finished-vision review.
- [x] Code review existing signup/setup, users, settings, app health, support, imported drafts, integrations, package/billing readiness, and field permission boundaries.
- [x] Run focused verification for auth, users, support, app health, roles, entitlements, billing readiness, job-draft imports, and build.
- [x] Browser QA owner/admin desktop and employee mobile admin/setup routes.
- [x] Record pre-build audit and exact implementation package.
- [x] Fix Imported Drafts route crash.
- [x] Fix `verify:job-draft-imports`.
- [x] Add Admin Foundation state utility and focused tests.
- [x] Add `verify:admin-foundation`.
- [x] Commit, push, deploy, and health-check Slice 1.
- [x] Add Admin Foundation Finish Board.
- [x] Browser QA final Phase 1 routes.
- [x] Commit, push, deploy, health-check, and record Phase 1 report.

## Completed / Frozen Systems

- Demo auth and role permissions.
- Opportunity Scout review-first contracts.
- Agent Leads provider readiness boundaries.
- Package/entitlement readiness model.
- Customer portal/communication readiness contracts.
- Estimate PDF and branded packet foundations.
- Field-safe mobile workflow boundaries.
- Public estimate request manual lead intake funnel.
- Sales Follow-Up System command layer and manual outreach/won-lost learning.
- Reputation + Portfolio Engine project-story, review/referral, proposal proof, and manual social/website draft command layer.
- Estimate Studio final proposal packet review, customer/internal packet separation, option comparison readiness, provider-ready send review, and field-safe handoff readiness.
- Core Operations Loop review-first command layer tying lead-to-closeout workflows together without mutating records or exposing field users to office/money data.
- Field Execution Finish mobile command layer that helps crews run the day from assigned work through end-of-day handoff using existing field tools without exposing office/money/growth/provider data or hidden GPS.
- Apex Agent Operator command layer that unifies the one product-facing Apex Agent across growth, sales, estimating, proposals, handoffs, closeout, billing readiness, reputation, Agent OS, and external-action locks.
- Customer Portal + Communications command layer that ties customer-safe packet review, expiring/revocable access evidence, share approval decisions, comments, and human-reviewed email/SMS readiness into the existing Communication Center.
- Billing / Payments / Packages command layer that ties package state, provider readiness, checkout/manual invoice lanes, billing candidates, receipts/failures, payment-link prep, and blocked money actions into Settings without live payment processing.
- Integrations Command layer that ties provider setup, health, disabled states, audit, disconnect planning, built inbound contracts, package gates, and locked integration-write boundaries into Settings without live provider writes or frontend secrets.
- Admin Foundation Finish: signup/first-owner setup evidence, invite/password readiness, Employees/users/roles, Settings finish board, App Health, Support, Imported Drafts, Integrations setup board, and package/billing readiness are frozen except for bugs, security/permission fixes, provider hookups, or approved versioned upgrades.
- Job Operations Finish: owner/admin Jobs finish layer for schedule, crew, startup, field visibility, material prep, tool readiness, safety/proof, and completion readiness is frozen except for bugs, security/permission fixes, provider hookups, or approved versioned upgrades.
- Field Execution Finish: employee/foreman assigned-work command layer for arrival/start, time, proof, daily reports, delivery tickets, checklists, safety, change request handoff, end-of-day closeout, and install/offline readiness is frozen except for bugs, security/permission fixes, approved offline/provider hookups, or approved versioned upgrades.

## Do-Not-Rebuild List

- Do not rebuild Opportunity Scout.
- Do not rebuild Agent Leads provider readiness layers.
- Do not rebuild existing lead/source/found opportunity models.
- Do not rebuild Estimate Studio or PDF packets.
- Do not rebuild Core Operations Loop orchestration; extend the existing command center, jobs, proof, material prep, change order, and closeout review systems.
- Do not rebuild Field Mode or Field Execution Finish; extend the existing field workspace, jobs, time, proof, report, ticket, checklist, safety, change request, and PWA surfaces.
- Do not rebuild Apex Agent/AI Office/Agent OS; extend the existing operator command layer, action inbox, assistant shell, and locked external gates.
- Do not rebuild Customer Portal + Communications; extend the existing Communication Center, customer portal preview/access/share approval contracts, public route lock, outbound approval, suppression, and delivery-attempt systems.
- Do not rebuild package/entitlement readiness, support upgrade review, or Billing / Payments / Packages Command; extend the existing Settings command layer and server-side provider adapters when payment accounts are configured.
- Do not rebuild Integrations Command; extend the existing Settings command layer, inbound integration contracts, package entitlement, server adapter, and Agent OS locked external gate when provider accounts/API keys are configured.
- Do not rebuild Job Operations Finish; extend the existing Jobs shell, Schedule, Material Prep, Startup Checklist, proof, safety, tool, and report surfaces.
- Do not rebuild role/permission models.
- Do not replace existing AI Office; extend it.

## Provider / Account Dependencies

| Dependency | Status | Boundary |
| --- | --- | --- |
| Google Ads / Local Services Ads | Needs account/API key | Planning, copy, budgets, and stop-loss are allowed. No spend or publishing. |
| Meta Ads | Needs account/API key | Draft creative and channel recommendations only. |
| Nextdoor/Yelp/Angi/HomeAdvisor-style marketplaces | Needs account/provider agreement | Track lead quality and marketplace fit manually until configured. |
| Email/SMS provider | Needs account/API key | Drafts and approval queues only. No autonomous sends. |
| Stripe/payment provider | Needs account/API key | Billing / Payments / Packages Command is built provider-ready. No live checkout, payment links, invoices, receipts, failed-payment notices, self-serve package changes, or payment processing until provider setup, secrets, webhooks, tax/legal review, audit controls, and owner-controlled execution are finished. |
| Customer portal live serving/link delivery | Needs tokenized route/provider | Internal command, packet preview, access records, share approvals, comments, preflight, and execution contracts are built. Public data serving, token redemption, customer actions, link delivery, and live email/SMS remain locked/provider-dependent. |
| QuickBooks | Needs account/API key | Integrations Command is built provider-ready. No accounting/customer/invoice/job-costing write until OAuth/secrets, sandbox, mapping, audit, disconnect, and owner/admin execution controls are finished. |
| Gmail / Google Calendar / Google Drive | Needs account/API key | Provider rows, readiness controls, and no-frontend-secret boundaries are built. No email send/read sync, calendar write, or Drive file mutation until OAuth scopes, sandbox, tenant mapping, audit, and disconnect controls are configured. |
| Twilio | Needs account/API key/compliance | Provider row is built. No SMS/voice send until sender compliance, suppression/opt-out, delivery audit, provider health, and human-reviewed communication workflow are finished. |
| Maps/weather | Needs account/API key | Provider row is built. No hidden GPS or worker tracking; any location use must be visible, consent-based, and server-key protected. |
| CompanyCam / DocuSign or e-signature | Needs account/API key | Provider rows are built. No photo sync, envelope send, signature request, or public share until provider sandbox, mapping, audit, and disconnect controls are finished. |

## Deploy Log

| Date | Phase | Version/Commit | Environment | Health |
| --- | --- | --- | --- | --- |
| 2026-06-04 | Apex Live Operator Mode private Operator Cycle | `b410af4`; Fly release `v674`; image `registry.fly.io/concrete-ops-2:deployment-01KTAFVP0VGJ4MHF8Q73CDA406` | Production Fly app `concrete-ops-2`; `https://app.apexhq.online/` and `https://concrete-ops-2.fly.dev/` | Predeploy backup `postgres-app-data-20260604-233431Z.json` plus `uploads-20260604-233431Z` and `uploads-20260604-233431Z.manifest.json`; rollback target `v673`, image `registry.fly.io/concrete-ops-2:deployment-01KTAEHQ8AS9QNGTZSR8KVG027`; both `/api/ready` endpoints database OK; `https://concrete-ops-2.fly.dev/api/health` healthy; Fly machine/checks passing on `148e06e2b53d68` after manual machine start; hosted skip-auth health/routes smoke passed on `https://app.apexhq.online/`; readiness timing averaged 92ms for `/api/health` and 32ms for `/api/ready`; `/apex-control-room` served `index-BSnqMF7L.js`, `app-domain-D6yiWcje.js`, and `app-domain-DOBJTOUH.css` on both production hosts; unauthenticated `/api/apex-os/build-awareness`, `/api/apex-os/memory`, `/api/apex-os/autonomy-runs`, `/api/apex-os/ask`, `/api/apex-os/voice/speech`, and `/api/apex-os/voice/transcribe` returned 401; setup status complete/demo off/demo user absent/public signup disabled/public estimate requests enabled. Production auth login smoke was not run because no dedicated production smoke env was used. |
| 2026-06-04 | Apex Live Operator Mode private Proof Check | `61df135`; Fly release `v673`; image `registry.fly.io/concrete-ops-2:deployment-01KTAEHQ8AS9QNGTZSR8KVG027` | Production Fly app `concrete-ops-2`; `https://app.apexhq.online/` and `https://concrete-ops-2.fly.dev/` | Predeploy backup `postgres-app-data-20260604-231140Z.json` plus `uploads-20260604-231140Z` and `uploads-20260604-231140Z.manifest.json`; rollback target `v672`, image `registry.fly.io/concrete-ops-2:deployment-01KTACV0V4N581WP68RQBQVN9W`; both `/api/ready` endpoints database OK; `https://concrete-ops-2.fly.dev/api/health` healthy; Fly machine/checks passing on `148e06e2b53d68`; hosted skip-auth health/routes smoke passed on `https://app.apexhq.online/`; readiness timing averaged 132ms for `/api/health` and 32ms for `/api/ready`; `/apex-control-room` served `index-D9Dp3Igs.js`, `app-domain-CDh1F5va.js`, and `app-domain-DZe9RELX.css` on both production hosts; unauthenticated `/api/apex-os/build-awareness`, `/api/apex-os/memory`, `/api/apex-os/autonomy-runs`, `/api/apex-os/ask`, `/api/apex-os/voice/speech`, and `/api/apex-os/voice/transcribe` returned 401; setup status complete/demo off/demo user absent/public signup disabled/public estimate requests enabled. Production auth login smoke was not run because no dedicated production smoke env was used. |
| 2026-06-04 | Apex Live Operator Mode private Auto Prep | `221adef`; Fly release `v672`; image `registry.fly.io/concrete-ops-2:deployment-01KTACV0V4N581WP68RQBQVN9W` | Production Fly app `concrete-ops-2`; `https://app.apexhq.online/` and `https://concrete-ops-2.fly.dev/` | Predeploy backup `postgres-app-data-20260604-224151Z.json` plus `uploads-20260604-224151Z` and `uploads-20260604-224151Z.manifest.json`; rollback target `v671`, image `registry.fly.io/concrete-ops-2:deployment-01KTABFPMBFJ1JY3PA5MKKT1X8`; both `/api/ready` endpoints database OK; `https://concrete-ops-2.fly.dev/api/health` healthy; Fly machine/checks passing on `148e06e2b53d68`; hosted skip-auth health/routes smoke passed on `https://app.apexhq.online/`; readiness timing averaged 91ms for `/api/health` and 33ms for `/api/ready`; `/apex-control-room` served `index-CqHJbxun.js`, `app-domain-Cuw1grnq.js`, and `app-domain-DvXUS9Z-.css` on both production hosts; unauthenticated `/api/apex-os/build-awareness`, `/api/apex-os/memory`, `/api/apex-os/autonomy-runs`, `/api/apex-os/ask`, `/api/apex-os/voice/speech`, and `/api/apex-os/voice/transcribe` returned 401; setup status complete/demo off/demo user absent/public signup disabled/public estimate requests enabled. Production auth login smoke was not run because no dedicated production smoke env was used. |
| 2026-06-04 | Apex Live Operator Mode active-run session | `e9646d7`; Fly release `v671`; image `registry.fly.io/concrete-ops-2:deployment-01KTABFPMBFJ1JY3PA5MKKT1X8` | Production Fly app `concrete-ops-2`; `https://app.apexhq.online/` and `https://concrete-ops-2.fly.dev/` | Predeploy backup `postgres-app-data-20260604-221724Z.json` plus `uploads-20260604-221724Z` and `uploads-20260604-221724Z.manifest.json`; rollback target `v670`, image `registry.fly.io/concrete-ops-2:deployment-01KTA9NJFJ5F600EDJ734FTMQ1`; both `/api/ready` endpoints database OK; `https://concrete-ops-2.fly.dev/api/health` healthy; Fly machine/checks passing on `148e06e2b53d68`; hosted skip-auth health/routes smoke passed on `https://app.apexhq.online/`; readiness timing averaged 86ms for `/api/health` and 33ms for `/api/ready`; `/apex-control-room` served `index-C994Ma1x.js`, `app-domain-DPhHR82U.js`, and `app-domain-DvXUS9Z-.css` on both production hosts; unauthenticated `/api/apex-os/build-awareness`, `/api/apex-os/memory`, `/api/apex-os/autonomy-runs`, `/api/apex-os/ask`, `/api/apex-os/voice/speech`, and `/api/apex-os/voice/transcribe` returned 401; setup status complete/demo off/demo user absent/public signup disabled/public estimate requests enabled. Production auth login smoke was not run because no dedicated production smoke env was used. |
| 2026-06-04 | Apex Live Operator Mode live-turn memory | `a9e025c`; Fly release `v670`; image `registry.fly.io/concrete-ops-2:deployment-01KTA9NJFJ5F600EDJ734FTMQ1` | Production Fly app `concrete-ops-2`; `https://app.apexhq.online/` and `https://concrete-ops-2.fly.dev/` | Predeploy backup `postgres-app-data-20260604-214639Z.json` plus `uploads-20260604-214639Z` and `uploads-20260604-214639Z.manifest.json`; rollback target `v669`, image `registry.fly.io/concrete-ops-2:deployment-01KTA7V08D6GQ1GEGN4HPJGCXV`; both `/api/ready` endpoints database OK; `https://concrete-ops-2.fly.dev/api/health` healthy; Fly machine/checks passing on `148e06e2b53d68`; hosted skip-auth health/routes smoke passed on `https://app.apexhq.online/`; readiness timing averaged 108ms for `/api/health` and 32ms for `/api/ready`; `/apex-control-room` served `index-nm4KoZ3R.js`, `app-domain-BDNSAC1w.js`, and `app-domain-DkvFhYCX.css` on both production hosts; unauthenticated `/api/apex-os/build-awareness`, `/api/apex-os/memory`, `/api/apex-os/autonomy-runs`, `/api/apex-os/ask`, `/api/apex-os/voice/speech`, and `/api/apex-os/voice/transcribe` returned 401; setup status complete/demo off/demo user absent/public signup disabled/public estimate requests enabled. Production auth login smoke was not run because no dedicated production smoke env was used. |
| 2026-06-04 | Apex Live Operator Mode interruption memory | `ef821a0`; Fly release `v669`; image `registry.fly.io/concrete-ops-2:deployment-01KTA7V08D6GQ1GEGN4HPJGCXV` | Production Fly app `concrete-ops-2`; `https://app.apexhq.online/` and `https://concrete-ops-2.fly.dev/` | Predeploy backup `postgres-app-data-20260604-211437Z.json` plus `uploads-20260604-211437Z` and `uploads-20260604-211437Z.manifest.json`; rollback target `v668`, image `registry.fly.io/concrete-ops-2:deployment-01KTA6F5ZTGAPJBV01B6NXKS8P`; both `/api/ready` endpoints database OK; `https://concrete-ops-2.fly.dev/api/health` healthy; Fly machine/checks passing on `148e06e2b53d68`; hosted skip-auth health/routes smoke passed on `https://app.apexhq.online/`; readiness timing averaged 93ms for `/api/health` and 32ms for `/api/ready`; `/apex-control-room` served `index-DGQxHc5A.js`, `app-domain-C6IKpeXT.js`, and `app-domain-YllHYJsf.css` on both production hosts; unauthenticated `/api/apex-os/build-awareness`, `/api/apex-os/memory`, `/api/apex-os/autonomy-runs`, `/api/apex-os/ask`, `/api/apex-os/voice/speech`, and `/api/apex-os/voice/transcribe` returned 401; setup status complete/demo off/demo user absent/public signup disabled/public estimate requests enabled. Production auth login smoke was not run because no dedicated production smoke env was used. |
| 2026-06-04 | Apex Live Operator Mode open voice recovery | `af808ba`; Fly release `v667`; image `registry.fly.io/concrete-ops-2:deployment-01KTA611FC850KQT18J7X5PDCD` | Production Fly app `concrete-ops-2`; `https://app.apexhq.online/` and `https://concrete-ops-2.fly.dev/` | Predeploy backup `postgres-app-data-20260604-204154Z.json` plus `uploads-20260604-204154Z` and `uploads-20260604-204154Z.manifest.json`; rollback target `v666`, image `registry.fly.io/concrete-ops-2:deployment-01KTA4N93MTWJTF37VRJ4CBDVP`; both `/api/ready` endpoints database OK; `https://concrete-ops-2.fly.dev/api/health` healthy; Fly machine/checks passing on `148e06e2b53d68`; hosted skip-auth health/routes smoke passed on `https://app.apexhq.online/`; readiness timing averaged 87ms for `/api/health` and 32ms for `/api/ready`; `/apex-control-room` served `index-BsV6B_Sp.js`, `app-domain-BUH3u645.js`, and `app-domain-YllHYJsf.css` on both production hosts; unauthenticated `/api/apex-os/build-awareness`, `/api/apex-os/memory`, `/api/apex-os/autonomy-runs`, `/api/apex-os/ask`, `/api/apex-os/voice/speech`, and `/api/apex-os/voice/transcribe` returned 401; setup status complete/demo off/demo user absent/public signup disabled/public estimate requests enabled. Production auth smoke/login was not run because production smoke password env vars were not present in the shell. |
| 2026-06-04 | Apex Live Operator Mode first production slice | `1f42fde`; Fly release `v664`; image `registry.fly.io/concrete-ops-2:deployment-01KTA2XB5719AMT87JNQY4XNMN` | Production Fly app `concrete-ops-2`; `https://app.apexhq.online/` and `https://concrete-ops-2.fly.dev/` | Predeploy backup `postgres-app-data-20260604-194802Z.json` plus `uploads-20260604-194802Z` and `uploads-20260604-194802Z.manifest.json`; rollback target `v663`, image `registry.fly.io/concrete-ops-2:deployment-01KTA0SCAE01QWJ6PK410P9EHJ`; both `/api/ready` endpoints database OK; `https://concrete-ops-2.fly.dev/api/health` healthy; Fly machine/checks passing on `148e06e2b53d68`; hosted skip-auth health/routes smoke passed on `https://app.apexhq.online/`; readiness timing averaged 105ms for `/api/health` and 34ms for `/api/ready`; `/apex-control-room` served `index-Bz7mvdZr.js`, `app-domain-CPTJqx-e.js`, and `app-domain-C02KxZIt.css` on both production hosts; unauthenticated `/api/apex-os/build-awareness`, `/api/apex-os/memory`, `/api/apex-os/autonomy-runs`, and `/api/apex-os/ask` returned 401; setup status complete/demo off/demo user absent/public signup disabled/public estimate requests enabled. Production auth smoke/login was not run because `APEX_PRODUCTION_SMOKE_PASSWORD` and `APEX_SMOKE_PASSWORD` were not present in the shell environment. |
| 2026-06-03 | Apex OS Phase 18 Finished Apex OS | `67aea87`; Fly release `v650`; image `registry.fly.io/concrete-ops-2:deployment-01KT6NZDJQGVF9G4PJ2P7FW7Y9` | Production Fly app `concrete-ops-2`; `https://app.apexhq.online/` and `https://concrete-ops-2.fly.dev/` | Predeploy backup `postgres-app-data-20260603-120459Z.json` plus `uploads-20260603-120459Z`; rollback target `v649`; both `/api/ready` endpoints database OK; `https://concrete-ops-2.fly.dev/api/health` healthy; Fly machine/checks passing on `148e06e2b53d68`; hosted skip-auth health/routes smoke passed; `/apex-control-room` served `index-CzJhawJV.js`, `app-domain-D96Adw9i.js`, and `app-domain-BG7wb0Ah.css`; unauthenticated `/api/apex-os/build-awareness`, `/api/apex-os/memory`, and `/api/apex-os/ask` returned 401; setup status complete/demo off/demo user absent/public signup disabled/public estimate requests enabled. Production auth smoke/login was not run. |
| 2026-06-03 | Apex OS Phase 17 Full Apex OS QA And Security Hardening | `52a3cf4`; Fly release `v649`; image `registry.fly.io/concrete-ops-2:deployment-01KT6MMM45QFCTYRQVCF7ABG07` | Production Fly app `concrete-ops-2`; `https://app.apexhq.online/` and `https://concrete-ops-2.fly.dev/` | Predeploy backup `postgres-app-data-20260603-114137Z.json` plus `uploads-20260603-114137Z`; rollback target `v648`; both `/api/ready` endpoints database OK; `https://concrete-ops-2.fly.dev/api/health` healthy; Fly machine/checks passing on `148e06e2b53d68`; hosted skip-auth health/routes smoke passed; `/apex-control-room` served `index-Da5InDXb.js`, `app-domain-DsA5cCGr.js`, and `app-domain-BG7wb0Ah.css`; unauthenticated `/api/apex-os/build-awareness`, `/api/apex-os/memory`, and `/api/apex-os/ask` returned 401; setup status complete/demo off/demo user absent/public signup disabled/public estimate requests enabled. Production auth smoke/login was not run. |
| 2026-06-03 | Apex OS Phase 16 Personal Operating Layer | `c2f99d4`; Fly release `v648`; image `registry.fly.io/concrete-ops-2:deployment-01KT6K0MDP5471S3TZBB3HHGHT` | Production Fly app `concrete-ops-2`; `https://app.apexhq.online/` and `https://concrete-ops-2.fly.dev/` | Predeploy backup `postgres-app-data-20260603-111313Z.json` plus `uploads-20260603-111313Z` after initial VM-starting retry; rollback target `v647`; both `/api/ready` endpoints database OK; `https://concrete-ops-2.fly.dev/api/health` healthy; Fly machine/checks passing on `148e06e2b53d68`; hosted skip-auth health/routes smoke passed; `/apex-control-room` served `index-DY-46gkK.js`, `app-domain-DKCxfotm.js`, and `app-domain-BG7wb0Ah.css`; unauthenticated `/api/apex-os/build-awareness`, `/api/apex-os/memory`, and `/api/apex-os/ask` returned 401; setup status complete/demo off/demo user absent/public signup disabled/public estimate requests enabled. Production auth smoke/login was not run. |
| 2026-06-03 | Apex OS Phase 15 Production Preview And Release Desk | `e86b88e`; Fly release `v647`; image `registry.fly.io/concrete-ops-2:deployment-01KT6H78S4DEYNQ1S72N63TTXS` | Production Fly app `concrete-ops-2`; `https://app.apexhq.online/` and `https://concrete-ops-2.fly.dev/` | Predeploy backup `postgres-app-data-20260603-104153Z.json` plus `uploads-20260603-104153Z`; both `/api/ready` endpoints database OK; `https://concrete-ops-2.fly.dev/api/health` healthy; Fly machine/checks passing on `148e06e2b53d68`; hosted skip-auth health/routes smoke passed; `/apex-control-room` served `index-CU7dSODG.js`, `app-domain-C4RXp6QQ.js`, and `app-domain-BG7wb0Ah.css`; unauthenticated `/api/apex-os/build-awareness`, `/api/apex-os/memory`, and `/api/apex-os/ask` returned 401; setup status demo off/demo user absent/public signup disabled. Production auth smoke/login was not run. |
| 2026-06-03 | Apex OS Phase 14 Action Execution Layer | `ab1a656`; Fly release `v646`; image `registry.fly.io/concrete-ops-2:deployment-01KT6G2KC3ZZ5HS4Q3GT0VHHAP` | Production Fly app `concrete-ops-2`; `https://app.apexhq.online/` and `https://concrete-ops-2.fly.dev/` | Predeploy backup `postgres-app-data-20260603-102138Z.json` plus `uploads-20260603-102138Z`; both `/api/ready` endpoints database OK; Fly machine/checks passing on `148e06e2b53d68`; hosted skip-auth health/routes smoke passed; `/apex-control-room` served `index-D5EnyN4J.js`, `app-domain-BX7hVNVK.js`, and `app-domain-BG7wb0Ah.css`; unauthenticated `/api/apex-os/execution-handoffs`, `/api/apex-os/memory`, and `/api/apex-os/ask` returned 401; setup status demo off/demo user absent/public signup disabled. Production auth smoke/login was not run. |
| 2026-06-03 | Apex OS Phase 13 Knowledge Intelligence | `f8193ad`; Fly release `v645`; image `registry.fly.io/concrete-ops-2:deployment-01KT6DWEVTQ5CBC5V8TX7TX5CZ` | Production Fly app `concrete-ops-2`; `https://app.apexhq.online/` and `https://concrete-ops-2.fly.dev/` | Predeploy backup `postgres-app-data-20260603-094325Z.json` plus `uploads-20260603-094325Z`; both `/api/ready` endpoints database OK; Fly machine/checks passing on `148e06e2b53d68`; hosted skip-auth health/routes smoke passed; `/apex-control-room` served `index-9Ub5wvmX.js` and `app-domain-DwwCEagD.js`; unauthenticated `/api/apex-os/knowledge-intelligence`, `/api/apex-os/memory`, and `/api/apex-os/ask` returned 401; setup status demo off/demo user absent/public signup disabled. Production auth smoke/login was not run. |
| 2026-06-03 | Apex OS Phase 10 Business Operating Center | `ee851f7`; Fly release `v642`; image `registry.fly.io/concrete-ops-2:deployment-01KT67FMHMMHQH69R1ZFX5Y0VR` | Production Fly app `concrete-ops-2`; `https://app.apexhq.online/` and `https://concrete-ops-2.fly.dev/` | Predeploy backup `postgres-app-data-20260603-075124Z.json` plus `uploads-20260603-075124Z`; both `/api/ready` endpoints database OK; Fly status/checks passing on machine `148e06e2b53d68`; hosted skip-auth health/routes smoke passed; `/apex-control-room` served `index-DaDMI41p.js` and `app-domain-Ds8onq2Y.js`; unauthenticated `/api/apex-os/approval-packets` and `/api/apex-os/memory` returned 401; setup status demo off/public signup disabled. |
| 2026-06-03 | Apex OS Phase 9 App Build And Code Awareness | `6368845`; Fly release `v641`; image `registry.fly.io/concrete-ops-2:deployment-01KT65V9K2KK4G0V1R6QRXR9QG` | Production Fly app `concrete-ops-2`; `https://app.apexhq.online/` and `https://concrete-ops-2.fly.dev/` | Predeploy backup `postgres-app-data-20260603-072250Z.json` plus `uploads-20260603-072250Z`; both `/api/ready` endpoints database OK; Fly status/checks passing on machine `148e06e2b53d68`; hosted skip-auth health/routes smoke passed; `/apex-control-room` served `index-Damj_cyI.js` and `app-domain-VWYbc_UL.js`; unauthenticated `/api/apex-os/build-awareness` returned 401; setup status demo off/public signup disabled. |
| 2026-06-03 | Apex OS Phase 8 Approval Command Center | `be2dccb`; Fly release `v640`; image `registry.fly.io/concrete-ops-2:deployment-01KT63SPFM2EM1SVEHK24148G8` | Production Fly app `concrete-ops-2`; `https://app.apexhq.online/` and `https://concrete-ops-2.fly.dev/` | Predeploy backup `postgres-app-data-20260603-064657Z.json` plus `uploads-20260603-064657Z`; both `/api/ready` endpoints database OK; Fly status/checks passing on machine `148e06e2b53d68`; hosted skip-auth health/routes smoke passed; `/apex-control-room` served; unauthenticated `/api/apex-os/approval-packets` returned 401; setup status demo off/public signup disabled. |
| 2026-05-30 | Phase 8-14 finish batch + runtime packaging fix | `583b4a1` feature batch, `e904e5a` active production commit | Production Fly app `concrete-ops-2`; release `v616`; image `registry.fly.io/concrete-ops-2:deployment-01KSWP2150N1VYY9JMW6VDC3J6`; `https://app.apexhq.online/` | `v614` initially failed because `/app/src/time-utils.js` was missing from the runtime image; production rolled back to healthy `v615`, Docker packaging was fixed/tested in `e904e5a`, and `v616` passed Fly health, `/api/ready` database OK, hosted skip-auth smoke, production auth smoke run `26686917811`, and unauthenticated desktop/mobile visual shell checks. |
| 2026-05-29 | Growth Foundation | `692b474` pushed to `main` | Local QA at `http://127.0.0.1:4100` | `/api/ready` OK; launch gate says guided demo GO and production/pilot/public launch NO-GO. |
| 2026-05-30 | Website + Lead Intake Funnel | `efb5d4a` and `dda3a36` pushed to `main` | Local QA at `http://127.0.0.1:4102` | `/api/ready` OK; launch gate says guided demo GO and production/pilot/public launch NO-GO. |
| 2026-05-30 | Website + Lead Intake Funnel + standing release approval | `1ac46a6` deployed from `main` | Production Fly app `concrete-ops-2`; `https://app.apexhq.online/` and `https://concrete-ops-2.fly.dev/` | Fly machine `148e06e2b53d68` started in `sjc`; 1 check passing; `/api/ready` OK on both domains with database OK. |
| 2026-05-30 | Sales Follow-Up System | `46a5a30` pushed to `main` | Local QA at `http://127.0.0.1:4115` | Owner desktop `/leads` passed; employee mobile `/leads` stayed sales-hidden; local browser errors `[]`. |
| 2026-05-30 | Sales Follow-Up System | `46a5a30` deployed from `main` | Production Fly app `concrete-ops-2`; `https://app.apexhq.online/` and `https://concrete-ops-2.fly.dev/` | Fly machine `148e06e2b53d68` version `594` started in `sjc`; 1 check passing; `/api/ready` OK on both domains with database OK. |
| 2026-05-30 | Reputation + Portfolio Engine | `bc7aff2` pushed to `main` | Local QA at `http://127.0.0.1:4127` | Owner desktop `/ai-office` passed; employee mobile `/ai-office` redirected to `/jobs`; local browser errors `[]`. |
| 2026-05-30 | Reputation + Portfolio Engine | `bc7aff2` deployed from `main` | Production Fly app `concrete-ops-2`; `https://app.apexhq.online/` and `https://concrete-ops-2.fly.dev/` | Fly machine `148e06e2b53d68` version `595` started in `sjc`; 1 check passing; `/api/ready` OK on both domains with database OK. |
| 2026-05-30 | Estimate Studio + Proposal Packets | `3ff622b` pushed to `main` | Local QA at `http://127.0.0.1:4130` | Owner desktop `/estimates` passed Final Proposal Packet Review; employee mobile `/estimates` redirected to `/jobs`; local browser errors `[]`. |
| 2026-05-30 | Estimate Studio + Proposal Packets | `bb1a796` deployed from `main` | Production Fly app `concrete-ops-2`; `https://app.apexhq.online/` and `https://concrete-ops-2.fly.dev/` | Fly machine `148e06e2b53d68` version `597` started in `sjc`; 1 check passing; `/api/ready` OK on both domains with database OK. |
| 2026-05-30 | Core Operations Loop | `08a4864` pushed to `main` | Local QA at `http://127.0.0.1:4135` | Owner desktop `/command-center` passed Core Operations Loop; employee mobile `/command-center` redirected to `/jobs`; local browser errors `[]`. |
| 2026-05-30 | Core Operations Loop | `08a4864` deployed from `main` | Production Fly app `concrete-ops-2`; `https://app.apexhq.online/` and `https://concrete-ops-2.fly.dev/` | Fly machine `148e06e2b53d68` version `598` started in `sjc`; 1 check passing; `/api/ready` OK on both domains with database OK. |
| 2026-05-30 | Field Mode Finish | `27a2725` pushed to `main` | Local QA at `http://127.0.0.1:4142` | Employee mobile `/field` passed Field Day Finish with no office/money/growth terms; foreman mobile `/field` passed daily report/change request; employee direct `/command-center` redirected to `/jobs`; local browser errors `[]`. |
| 2026-05-30 | Field Mode Finish | `27a2725` deployed from `main` | Production Fly app `concrete-ops-2`; `https://app.apexhq.online/` and `https://concrete-ops-2.fly.dev/` | Fly machine `148e06e2b53d68` version `599` started in `sjc`; 1 check passing; `/api/ready` OK on both domains with database OK. |
| 2026-05-30 | Apex Agent Operator | `cd38676` pushed to `main` | Local QA at `http://127.0.0.1:4148` | Owner/admin desktop `/ai-office` passed all 9 Apex Agent Operator commands; admin mobile `/ai-office` passed compact operator layout with no overflow; employee mobile `/ai-office` redirected to `/jobs` with operator/ads/billing text hidden; local browser errors `[]`. |
| 2026-05-30 | Apex Agent Operator | `cd38676` deployed from `main` | Production Fly app `concrete-ops-2`; `https://app.apexhq.online/` and `https://concrete-ops-2.fly.dev/` | Fly machine `148e06e2b53d68` version `600` started in `sjc`; 1 check passing; `/api/ready` OK on both domains with database OK. |
| 2026-05-30 | Customer Portal + Communications | `9b9ea0c` pushed to `main` | Local QA at `http://127.0.0.1:4156` | Admin desktop `/communications` passed Customer Portal Command, Prepare access record, Provider readiness, and Locked outbound approval; employee mobile `/communications` redirected to `/jobs` with portal/communications/pricing hidden; local browser errors `[]`. |
| 2026-05-30 | Customer Portal + Communications | `9b9ea0c` deployed from `main` | Production Fly app `concrete-ops-2`; `https://app.apexhq.online/` and `https://concrete-ops-2.fly.dev/` | Fly machine `148e06e2b53d68` version `601` started in `sjc`; service check passing; `/api/ready` OK on both domains with database OK. |
| 2026-05-30 | Billing / Payments / Packages | `5169b4d` pushed to `main` | Local QA at `http://127.0.0.1:4162` | Admin desktop `/settings` passed Billing / Payments / Packages Command, provider readiness, blocked money actions, receipt/failure states, and no overflow/errors; employee mobile `/settings` redirected to `/jobs` with billing/payment/package command text hidden. |
| 2026-05-30 | Billing / Payments / Packages | `5169b4d` deployed from `main` | Production Fly app `concrete-ops-2`; `https://app.apexhq.online/` and `https://concrete-ops-2.fly.dev/` | Fly machine `148e06e2b53d68` version `603` started in `sjc`; service check passing; `/api/ready` OK on both domains with database OK. |
| 2026-05-30 | Integrations | `c10a273` pushed to `main` | Local QA at `http://127.0.0.1:4168` | Admin desktop `/settings` passed Integrations Command, provider board, QuickBooks/Gmail/Calendar/Twilio readiness, no frontend secrets, locked writes, built inbound contracts, and no overflow/errors; employee mobile `/settings` redirected to `/jobs` with integration/provider text hidden. |
| 2026-05-30 | Integrations | `c10a273` deployed from `main` | Production Fly app `concrete-ops-2`; `https://app.apexhq.online/` and `https://concrete-ops-2.fly.dev/` | Fly machine `148e06e2b53d68` version `604` started in `sjc`; service check passing; `/api/ready` OK on both domains with database OK. |
| 2026-05-30 | Phase 1 Admin Foundation Pre-Build Audit | Docs-only audit pending commit | Local QA at `http://127.0.0.1:4174` | `/api/ready` OK. Owner desktop Settings, Employees, App Health, Support passed. Owner desktop Imported Drafts failed with `useEffect is not defined`. Employee mobile admin/setup direct routes redirected to Field Mode and Support stayed role-safe. |
| 2026-05-30 | Phase 1 Admin Foundation Slice 1: state utility | `2bbbf3f` pushed to `main` and deployed | Production Fly app `concrete-ops-2`; `https://app.apexhq.online/` and `https://concrete-ops-2.fly.dev/` | Fly machine `148e06e2b53d68` version `605` started in `sjc`; service check passing; `/api/ready` OK on both domains with database OK. |
| 2026-05-30 | Phase 1 Admin Foundation Finish Board | `9ccc1ac` pushed to `main` | Local QA at `http://127.0.0.1:4179` | Owner/admin Settings, Employees, App Health, Support, and Imported Drafts passed with no overflow/errors. Employee mobile direct routes to Settings, Employees, App Health, and Imported Drafts redirected to Jobs; Support stayed role-safe; no admin foundation text leaked. |
| 2026-05-30 | Phase 1 Admin Foundation Finish | `9ccc1ac` deployed from `main` | Production Fly app `concrete-ops-2`; `https://app.apexhq.online/` and `https://concrete-ops-2.fly.dev/` | Fly machine `148e06e2b53d68` version `606` started in `sjc`; image `concrete-ops-2:deployment-01KSVWJYBKFP2HCVY40J69FEJE`; service check passing; `/api/ready` OK on both domains with database OK. |
| 2026-05-30 | Phase 2 Command Center Finish | `7529739` pushed to `main` and deployed | Local QA at `http://127.0.0.1:4186`; production Fly app `concrete-ops-2`; `https://app.apexhq.online/` and `https://concrete-ops-2.fly.dev/` | Owner desktop `/command-center` passed Daily Command Plan first-screen visibility, routed next action to `/leads`, provider setup locks, no overflow/errors; employee mobile `/command-center` redirected to `/jobs` with office/growth/billing/setup text hidden. Fly machine `148e06e2b53d68` version `607`; image `concrete-ops-2:deployment-01KSW0DXH4NAM1D3R8RT57D8X1`; `/api/ready` OK on both domains with database OK. |
| 2026-05-30 | Phase 3 Growth & Sales Finish | `5b73ef1` pushed to `main` and deployed | Local QA at `http://127.0.0.1:4103`; production Fly app `concrete-ops-2`; `https://app.apexhq.online/` and `https://concrete-ops-2.fly.dev/` | Owner desktop `/ai-office` passed Growth Command routes to setup/source, follow-up, ads, and proof surfaces; owner desktop `/leads` passed Sales Follow-Up System, stale estimates, Won/Lost/Not Interested outcomes, and no overflow/errors; employee mobile `/ai-office` and `/leads` redirected to `/jobs` with growth/sales/estimate/ads/reputation text hidden. Fly machine `148e06e2b53d68` version `608`; image `concrete-ops-2:deployment-01KSW1RN44SHA22WYXKDGB53NA`; `/api/ready` OK on both domains with database OK. |
| 2026-05-30 | Phase 4 Estimate & Proposal Finish | `8868452` pushed to `main` and deployed | Local QA at `http://127.0.0.1:4134` with isolated demo data; production Fly app `concrete-ops-2`; `https://app.apexhq.online/` and `https://concrete-ops-2.fly.dev/` | Admin desktop `/estimates` passed Estimate Studio, Final Proposal Packet Review, Customer Packet, GC Packet, Foreman Handoff, Send Review, no overflow/errors, and no Last Yard/LYC proposal copy. Admin desktop `/proposals` passed Apex HQ Proposal Workspace, Proposal Generator, AHQ proposal numbering, no overflow/errors, and no Last Yard/LYC copy. Employee mobile `/estimates` and `/proposals` redirected to `/jobs` with estimate/proposal/pricing text hidden. Fly machine `148e06e2b53d68` version `609`; image `concrete-ops-2:deployment-01KSW2V5SJQREE2HRVCEGZDXBY`; `/api/ready` OK on both domains with database OK. |
| 2026-05-30 | Phase 5 Job Operations Finish | `72e1c99` pushed to `main` and deployed | Local QA at `http://127.0.0.1:4000` with isolated demo data; production Fly app `concrete-ops-2`; `https://app.apexhq.online/` and `https://concrete-ops-2.fly.dev/` | Owner/admin desktop `/jobs` passed Job Operations Finish visibility, schedule/startup/crew/material/proof/completion checkpoints, no overflow/errors, and no failed requests. Employee mobile `/jobs` kept Job Operations Finish and office/money/provider text hidden. Employee mobile direct `/estimates` redirected to `/jobs` with estimate/pricing text hidden. Fly machine `148e06e2b53d68` version `610`; image `concrete-ops-2:deployment-01KSW4378XPSFE5AZ5NKRAKE94`; service check passing; `/api/ready` OK on both domains with database OK. |
| 2026-05-30 | Phase 6 Field Execution Finish | `8a250af` pushed to `main` and deployed | Local QA at `http://127.0.0.1:4147` with isolated demo data; production Fly app `concrete-ops-2`; `https://app.apexhq.online/` and `https://concrete-ops-2.fly.dev/` | Employee mobile `/field` passed Field Execution Finish clicks for Arrival/start, Photos/proof, End-of-day handoff, and Install/offline; foreman mobile `/field` passed clicks for Arrival/start, Daily report, Delivery tickets, Change request, and End-of-day handoff. Employee/foreman direct `/command-center` redirected to `/jobs` with office/money/provider text hidden. Owner/admin desktop `/field` passed field leader view. No horizontal overflow, console errors, or failed requests in final browser QA. Fly machine `148e06e2b53d68` version `611`; image `concrete-ops-2:deployment-01KSW5YE7BC4BDDGKJV3ZR6V6C`; service check passing; `/api/ready` OK on both domains with database OK. |

## Roadmap Queue

1. Phase 1 Admin Foundation Finish - completed/frozen.
2. Phase 2 Command Center Finish - completed/frozen after production health check.
3. Phase 3 Growth & Sales Finish - completed/frozen after production health check.
4. Phase 4 Estimate & Proposal Finish - completed/frozen after production health check.
5. Phase 5 Job Operations Finish - completed/frozen after production health check.
6. Phase 6 Field Execution Finish - completed/frozen after production health check.
7. Phase 7 Safety & Compliance Finish - completed/frozen after production health check.
8. Phase 8 Change Order Finish - completed/frozen after production health check.
9. Phase 9 Payroll Prep Finish - completed/frozen after production health check; payroll processing remains out of scope.
10. Phase 10 Closeout & Billing Prep Finish - completed/frozen after production health check; live billing remains out of scope.
11. Phase 11 Reputation & Portfolio Finish - completed/frozen after production health check; live sends/publishing remain out of scope.
12. Phase 12 Communications & Customer Portal Finish - completed/frozen after production health check; public portal/customer sends remain locked.
13. Phase 13 Assistant Finish - completed/frozen after production health check; risky external actions remain locked.
14. Phase 14 Launch Finish - completed/frozen after production health check; public self-serve launch remains approval-gated.

## Next Phase

Use `docs/APEX_HQ_TOOL_COMPLETION_BLUEPRINT.md` as historical phase evidence, not an instruction to restart completed phases. The next phase is post-launch route/workflow QA refresh and cleanup triage. Build work should stay narrow and evidence-driven unless Josh explicitly approves a new roadmap phase. Live payroll processing, live billing/payment collection, public customer portal access, public self-serve signup, and risky external provider actions remain out of scope.

## Decision Log

| Date | Decision | Reason | Impact |
| --- | --- | --- | --- |
| 2026-05-29 | Use AI Office as the Growth Command Center home. | Opportunity Scout, Agent Leads, follow-up, and agent controls already live there. | Avoids rebuilding and makes the growth loop visible to owner/admin users. |
| 2026-05-29 | Ads are provider-ready planning only. | No pilot/provider/account or ad-spend approval exists. | Contractors can plan budgets, channels, copy, and guardrails without risk of live spend. |
| 2026-05-29 | Reputation/portfolio starts from existing jobs, uploads, reports, and closeout proof. | Proof assets already exist in operations workflows. | Avoids duplicating media/work history while making proof reuse part of growth. |
| 2026-05-29 | Growth Command Center is visible to owner/admin AI Office users even when the deeper Lead Finder package gate is off. | Owners still need to see how Apex HQ helps find clients. | The high-level growth plan is visible; deeper Opportunity Scout management remains behind existing package/permission gates. |
| 2026-05-30 | Public estimate requests stay manual-first. | Public website demand should become owner/admin review work, not automated sends or jobs. | The funnel creates a lead and review task only; estimates, jobs, messages, invoices, payments, and portal links remain locked. |
| 2026-05-30 | Public setup status exposes a target company id only when exactly one active company exists. | The API requires an explicit target company for external writes, and the public form needs a safe way to submit to the right workspace. | Single-company public form works; multi-company public target remains explicit and guarded. |
| 2026-05-30 | Standing production release approval is granted for completed verified phases. | The owner wants finished phases pushed to production without repeated NO-GO approval loops. | After validation and push, deploy to production and health-check; keep hard stops only for secrets, paid spend, live sends, billing/payment processing, destructive data, hidden GPS/privacy, auth/session control, or known incident risk. |
| 2026-05-30 | Sales follow-up stays manual-first but becomes a finished command system. | Contractors need to win existing leads, not only collect them. | Apex HQ now shows due work, stale estimates, source quality, scripts, won/lost learning, and review/referral asks while keeping sends and spend locked. |
| 2026-05-30 | Reputation and portfolio reuse starts from real job proof only. | Reviews, referrals, and public proof are powerful only when they are true, permissioned, and tied to completed or proof-backed work. | Apex HQ now drafts stories, review/referral asks, proposal proof blocks, and social/website copy while blocking live sends, publishing, fake proof, GPS exposure, and field access. |
| 2026-05-30 | Estimate Studio finish work extends the existing packet and print system instead of rebuilding it. | Estimate math, PDF packets, GC packet lite, backup/SOV, sent snapshots, and handoff readiness already exist. | Apex HQ now gives owner/admin users a final proposal packet review that ties customer packet readiness, options, proof, GC notes, send mode, and field-safe handoff together without exposing office-only content or triggering external actions. |
| 2026-05-30 | Retired pilot proposal branding must not appear in active estimate/proposal surfaces. | The owner explicitly said estimates/proposals should have nothing about Last Yard Concrete. | The standalone proposal generator now uses Apex HQ-neutral defaults, AHQ proposal numbering, generic contractor copy, and a source guard test included in `verify:estimates`. |
| 2026-05-30 | Core Operations Loop composes existing modules instead of creating a new workflow engine. | Leads, estimates, jobs, schedule, proof, tickets, reports, change orders, material prep, and closeout review already existed. | Apex HQ now gives owner/admin users one next-action operations loop while preserving module ownership, tests, permissions, and review-first boundaries. |
| 2026-05-30 | Field Mode Finish is a command/checklist layer over existing field tools, not a new field app or offline cache. | Field jobs, time, uploads, reports, tickets, checklists, safety, change requests, and PWA foundations already existed. | Crews now get a mobile Field Day Finish panel without exposing office/money/growth data, hidden GPS, or pretending offline drafts are done. |
| 2026-05-30 | Apex Agent Operator is one command layer over existing AI Office and Agent OS, not a second assistant product. | Agent OS, Action Inbox, Growth Command Center, Estimate Studio, Operations Loop, closeout review, and Reputation Engine already existed. | Owner/admin users now see the finished Apex Agent loop while external actions remain locked/provider-ready and field users remain blocked. |
| 2026-05-30 | Customer Portal + Communications lives in Communication Center instead of a separate app. | Contact history, provider readiness, suppressions, delivery-attempt contracts, and portal access/share approvals already existed there or adjacent to it. | Owner/admin users can review portal packets, approval decisions, comments, and send-readiness from one workflow while field users remain blocked and live portal/customer sends stay provider-dependent. |
| 2026-05-30 | Billing / Payments / Packages lives in Settings Plan Readiness instead of a separate billing route. | Package readiness, support upgrade review, audit activity, and owner/admin setup already lived in Settings. | Owner/admin users get one billing command surface while field users remain blocked and live payment processing stays provider-dependent. |
| 2026-05-30 | Integrations lives in Settings with the Agent OS integration write gate still locked. | Provider/account setup, API keys, OAuth, health, disabled states, audit, and disconnect controls are owner/admin setup work; existing inbound contracts and Agent OS already provide the safe boundaries. | Owner/admin users get a provider-ready Integrations Command while live provider writes, secrets, sends, ads, payments, calendar/file mutations, hidden GPS, and field-user exposure remain blocked. |
| 2026-05-30 | Job Operations Finish composes existing job modules instead of creating a new workflow engine. | Jobs, Schedule, Material Prep, Startup Checklist, proof, reports, tickets, safety, tools, and role-scoped field work already existed. | Owner/admin users get one routed job operations finish layer while field users remain assigned-work only and no sends, orders, provider writes, payroll, billing, schema, or production data changes are introduced. |
| 2026-05-30 | Field Execution Finish extends the existing field workspace instead of building a second field app. | Assigned jobs, field workspace, time, uploads/proof, daily reports, delivery tickets, pre-pour/post-pour/tool checklists, safety, change requests, and PWA install surfaces already existed. | Employee and foreman users now get one field-safe routed execution layer from arrival through end-of-day handoff while office/money/provider data, hidden GPS, external sends, vendor orders, billing, schema/auth/session changes, and production mutations stay blocked. |
| 2026-05-30 | Replace slice-based roadmap execution with tool-by-tool completion blueprint. | The owner wants employee-owned product completion: every app tool inventoried, finish line defined, assigned to a phase, then frozen. The prior vertical plan was still too phase-order-first. | `docs/APEX_HQ_TOOL_COMPLETION_BLUEPRINT.md` is the active plan. `docs/APEX_HQ_VERTICAL_FINISH_PHASE_PLAN.md` is superseded/historical. |
| 2026-05-30 | Phase 1 starts with a pre-build audit before implementation. | The owner explicitly required skills, browser review, code review, memory/roadmap review, and a direct plan before starting Phase 1. | `docs/APEX_HQ_PHASE_1_ADMIN_FOUNDATION_PREBUILD_AUDIT.md` records what is built, what is broken, what must be added, and the exact implementation package. |
| 2026-05-30 | Imported Drafts crash and job-draft verification failure block Phase 1 freeze. | `/imported-drafts` is a Phase 1 owner/admin tool and cannot render; `verify:job-draft-imports` is red. | Phase 1 implementation starts by fixing the route crash and the stale auth test helper before adding the finish board. |
| 2026-05-30 | Owner/admin setup should stay visible unless an unpaid provider/live action is actually required. | The owner wants no locks except unpaid providers and safety boundaries. | Package/provider readiness can label limits, but Phase 1 setup visibility should not disappear behind package gates. Field/security/live-money locks remain hard. |
| 2026-05-30 | Slice 1 creates a pure Admin Foundation state utility before UI. | The finish board needs one tested source of readiness truth before rendering. | `src/admin-foundation-finish-utils.js` now derives setup, user, field lockout, app health, support, imported draft, provider, and package readiness for the upcoming board. |
| 2026-05-30 | Slice 2 wires the Admin Foundation Finish Board into Settings as the owner/admin Phase 1 control point. | Phase 1 needed one visible finish line instead of scattered setup surfaces. | Settings now defaults to `settings-admin-foundation`, renders `AdminFoundationFinishPanel`, and keeps app-health mode separate. Browser QA proved owner/admin access across Settings, Employees, App Health, Support, and Imported Drafts, with employee mobile direct-route safety. |
| 2026-05-30 | Phase 1 Admin Foundation is frozen after Fly version `606`. | The focused verifier, final browser QA, production deploy, hosted readiness checks, and Fly service check all passed. | Future changes to signup/setup, users/roles, Settings admin foundation, App Health, Support, Imported Drafts, package/provider setup, and admin permission boundaries should be bug, security/permission, provider hookup, or approved versioned upgrades only. |
| 2026-05-30 | Phase 2 Command Center composes existing command/workflow surfaces instead of rebuilding them. | The active app already had Today Command, Operations Command, Core Operations Loop, Growth Command, billing readiness, provider setup, queue, dashboard, and mobile command surfaces. | Owner/admin users now get one daily Command Plan with exact routes to real modules or setup locks; field users stay assigned-work only. |
| 2026-05-30 | Phase 3 Growth & Sales Finish closes the loop through existing Growth Command, Leads, Sales Follow-Up, Ads Advisor, and Reputation/Portfolio systems. | The active app already had the right surfaces; the missing finish work was routed actions, closed lead outcomes, source-quality clarity, and proof that field users stay locked out. | Owner/admin users can move from growth lanes to real tools/setup states, review won/lost outcomes and stale estimates, and plan ads/reputation actions without live spend or sends. |

## Phase 3 Growth & Sales Finish Report

Goal: finish the Growth & Sales workflow end to end so an owner/admin can find and review opportunities, manage lead sources/client-finder actions, follow up on leads and customers, review stale estimates and sales next steps, use manual scripts/templates, understand source quality/conversion health, plan ad spend without live spend, create review/referral/portfolio actions from completed work, and route every action to a real existing tool or setup state.

What was already built:

- Growth Command Center, AI Office, Opportunity Scout / Client Finder, lead sources, found opportunities, Sales Follow-Up System, Leads, Customers, Estimates, Reputation + Portfolio Engine, Ads Spend Advisor, Command Center routing, provider readiness, and role gates.

What was completed now:

- Added explicit module/target/action metadata to Growth Command lanes so client finder, ad planning, follow-up, and reputation/proof actions open existing Apex HQ tools or setup states.
- Wired Growth Command lane buttons in AI Office to those real routes.
- Added Won, Lost, and Not Interested lead outcomes in owner/admin lead intake, detail, rail, filters, and server validation.
- Closed won/lost/not-interested leads now leave the active review inbox, while won leads still count as ready for the job/proof path and lost leads stay out of estimate/job-proof readiness.
- Expanded `verify:leads` to include server lead workflow, lead utility, growth command, and sales follow-up coverage.

Provider/account-dependent remaining:

- Live lead-source provider runs, private-source credentials, ad publishing/spend, customer email/SMS sends, review/referral sends, website/social publishing, bid submission, and external provider writes remain provider/account-dependent and locked.

Affected files:

- `docs/APEX_HQ_CANONICAL_SOURCE_OF_TRUTH.md`
- `docs/APEX_HQ_LIVING_FINISH_PLAN.md`
- `package.json`
- `server/index.js`
- `src/App.jsx`
- `src/growth-command-utils.js`
- `src/growth-command-utils.test.js`
- `src/lead-detail-panel-components.jsx`
- `src/lead-route-components.jsx`
- `src/lead-utils.js`
- `src/lead-utils.test.js`
- `src/leads-page-components.jsx`

Validation results:

- Focused Phase 3 tests passed: `src/growth-command-utils.test.js`, `src/lead-utils.test.js`, `src/sales-follow-up-system.test.js`, lead component import tests.
- Opportunity/reputation focused tests passed: `src/opportunity-scout-utils.test.js`, `src/reputation-portfolio-utils.test.js`.
- `npm.cmd run verify:leads` passed.
- `npm.cmd run verify:opportunity-scout` passed.
- `npm.cmd run verify:roles` passed.
- `npm.cmd run build` passed with existing large chunk warnings only.
- `git diff --check` passed with CRLF warnings only.

Browser QA:

- Owner/admin desktop `/ai-office`: Growth Command Center was visible; growth lanes opened real setup/source, follow-up, ads, and proof surfaces; no live send/spend/payment commands; no horizontal overflow; no console or failed-request errors in authenticated-context QA.
- Owner/admin desktop `/leads`: Sales Follow-Up System, Stale Estimates, Won, Lost, and Not Interested outcomes were present; no horizontal overflow; no console or failed-request errors.
- Employee mobile `/ai-office` and `/leads`: both redirected to `/jobs`; Growth Command Center, Sales Follow-Up System, Ads Spend Advisor, Reputation + Portfolio Engine, Estimate Sent, and Plan Ad Spend text stayed hidden; no horizontal overflow; no console or failed-request errors.

Permissions impact:

- No permission loosening.
- Owner/admin users get growth and sales routing through existing office permissions.
- Field users remain blocked from leads, estimates, pricing, profit/margins, payroll costs, office notes, admin settings, company setup, AI office tools, billing, ads, source management, reputation/portfolio controls, provider setup, and other company data.

Field-user impact:

- No field workflow changes. Field direct-route safety to `/ai-office` and `/leads` was verified on mobile and redirects to assigned job work.

Mobile impact:

- Owner/admin desktop was the primary growth/sales finish surface.
- Field mobile route safety and no-overflow checks passed for restricted growth/sales routes.

Deploy version:

- `5b73ef1` deployed to Fly machine `148e06e2b53d68` version `608`, image `concrete-ops-2:deployment-01KSW1RN44SHA22WYXKDGB53NA`.

Health check:

- Local `/api/ready` passed at `http://127.0.0.1:4103/api/ready`.
- `https://app.apexhq.online/api/ready` OK with database OK.
- `https://concrete-ops-2.fly.dev/api/ready` OK with database OK.

Rollback note:

- Revert `5b73ef1` to remove Growth Command lane routing, Won/Lost/Not Interested lead outcomes, closed-lead review filtering, lead verifier expansion, and tests. No schema changes, auth/session changes, billing/payment processing, provider writes, live sends, ad spend, hidden GPS, destructive data changes, or production data migrations were introduced.

Next recommended phase:

- Phase 4 Estimate & Proposal Finish.

## Phase 2 Command Center Finish Report

Goal: finish the owner/admin daily Command Center so a contractor opens Apex HQ and immediately knows what needs attention today, job and crew status, proof/report gaps, sales/follow-up work, billing-ready work, growth/client-finder actions, blockers, provider setup needs, and exact next actions that route to real tools.

What was already built:

- Today Command, Operations Command, Core Operations Loop, Growth Command, Billing / Payments / Packages Command, Integrations Command, queue/notification surfaces, dashboard command rail/focus boards, owner/admin mobile command, Field Mode, and role gates.

What was completed now:

- Added `deriveCommandCenterFinishState` as the shared owner/admin daily command truth for attention today, jobs/crew, proof/report gaps, sales follow-up, billing-ready work, growth/client-finder, blockers, provider setup, routed next actions, and manual/provider guardrails.
- Added `CommandCenterDailyPlanCard` and surfaced it first-screen on desktop Command Center, inside Today command context, and in owner/admin mobile command.
- Routed Command Center actions to existing modules only, including Leads, Jobs, Estimates, Reports, Uploads, Schedule, Change Orders, Communications, and Settings setup sections.
- Kept provider-dependent actions locked to setup/review states for communications, billing/payment, ad/source, and integration providers.
- Added field-only fail-closed state and focused coverage proving field users do not receive office command actions.

Provider/account-dependent remaining:

- Live email/SMS sends, ad publishing/spend, billing/payment processing, provider writes, external integration mutations, and customer portal sends remain provider/account-dependent and locked.

Affected files:

- `docs/APEX_HQ_CANONICAL_SOURCE_OF_TRUTH.md`
- `docs/APEX_HQ_LIVING_FINISH_PLAN.md`
- `src/App.jsx`
- `src/app-shell-components.jsx`
- `src/command-center-route-components.jsx`
- `src/command-center-utils.js`
- `src/command-center-utils.test.js`
- `src/command-today-page-shell.test.js`
- `src/index.css`
- `src/owner-admin-mobile-command-components.jsx`
- `src/owner-admin-mobile-command-components-import.test.js`
- `src/today-command-page-components.jsx`
- `src/today-command-page-components-import.test.js`

Validation results:

- Focused Phase 2 tests passed.
- `npm.cmd run verify:jobs` passed after one local server-readiness rerun; the isolated failing server test passed immediately and the full suite passed on rerun.
- `npm.cmd run verify:roles` passed.
- `npm.cmd run build` passed with existing large chunk warnings only.
- `git diff --check` passed with CRLF warnings only.

Browser QA:

- Owner/admin desktop `/command-center`: Daily Command Plan visible at the top of the first screen; Today, Jobs / crew, Proof gaps, Sales follow-up, Billing-ready, Growth / client finder, Blockers, and Provider setup lanes visible; first routed action opened `/leads`; no horizontal overflow, console errors, page errors, or failed requests.
- Employee mobile `/command-center`: redirected to `/jobs`; Daily Command Plan, growth/client-finder, billing-ready, provider setup, sales follow-up, leads, estimates, pricing, profit, margins, payroll, AI office tools, and company setup text stayed hidden; no horizontal overflow, console errors, page errors, or failed requests.

Permissions impact:

- No permission loosening.
- Owner/admin users receive office command visibility based on existing job/lead/estimate/settings permissions.
- Field users remain blocked from leads, estimates, pricing, profit/margins, payroll costs, office notes, admin settings, company setup, AI office tools, billing, provider setup, and other company data.

Field-user impact:

- No field workflow changes. Field direct-route safety to `/command-center` was verified on mobile and redirects to assigned job work.

Mobile impact:

- Owner/admin mobile command now includes the daily command plan and routed next actions.
- Employee mobile route safety and no-overflow checks passed.

Deploy version:

- `7529739` deployed to Fly machine `148e06e2b53d68` version `607`, image `concrete-ops-2:deployment-01KSW0DXH4NAM1D3R8RT57D8X1`.

Health check:

- Local `/api/ready` passed at `http://127.0.0.1:4186/api/ready`.
- `https://app.apexhq.online/api/ready` OK with database OK.
- `https://concrete-ops-2.fly.dev/api/ready` OK with database OK.

Rollback note:

- Revert the affected Phase 2 files listed above to remove the Daily Command Plan, shared finish-state utility, Command Center route wiring, owner/admin mobile command plan, shell overview slot, and tests. No schema changes, auth/session changes, billing/payment processing, provider writes, live sends, ad spend, hidden GPS, destructive data changes, or production data migrations were introduced.

Next recommended phase:

- Phase 3 Growth & Sales Finish.

## Phase 1 Admin Foundation Finish Report

Goal: finish and freeze the owner/admin base for company setup, users/roles, provider/package status, app health, support context, imported drafts, and field/admin boundaries.

What was already built:

- Signup/first-owner setup, invite activation, password reset, Employees, Settings, App Health, Support, Imported Drafts, Integrations Command, and package/billing readiness foundations.

What was completed now:

- Fixed the owner/admin Imported Drafts route crash by restoring the missing `useEffect` import.
- Fixed the stale `verify:job-draft-imports` auth helper so it matches the cookie-first/bearer-mode pattern used by passing auth tests.
- Added `deriveAdminFoundationFinishState` as the single readiness model for setup, users/roles, field lockout, app health, support, imported drafts, providers, and package/billing readiness.
- Added the Admin Foundation Finish Board to Settings and made it the default owner/admin Settings command item.
- Added Settings import coverage to `verify:admin-foundation`.
- Updated the living plan, deploy log, freeze note, and next-phase pointer.

Provider/account-dependent remaining:

- Email invite/password reset provider sends, live billing/payment provider, live integration providers, monitoring/log provider, and any future live customer send/provider write remain provider/account-dependent and locked.

Affected files:

- `docs/APEX_HQ_LIVING_FINISH_PLAN.md`
- `package.json`
- `src/App.jsx`
- `src/admin-foundation-finish-utils.js`
- `src/admin-foundation-finish-utils.test.js`
- `src/imported-job-drafts-page-components.jsx`
- `src/settings-route-components.jsx`
- `src/settings-route-components-import.test.js`
- `server/job-draft-imports.test.js`

Validation results:

- `node --test --test-concurrency=1 src/admin-foundation-finish-utils.test.js src/settings-route-components-import.test.js` passed.
- `npm.cmd run verify:admin-foundation` passed, including `verify:auth`, `verify:users`, `verify:support`, `verify:app-health`, `verify:job-draft-imports`, `verify:entitlements`, `verify:billing-readiness`, `verify:roles`, and `npm run build`.
- `git diff --check` passed with CRLF warnings only.

Browser QA:

- Owner/admin desktop `/settings`: Admin Foundation Finish, Phase 1 Readiness, Provider / Package Readiness, and Access Review passed with no overflow, console errors, or failed requests.
- Owner/admin desktop `/employees`, `/app-health`, `/support`, and `/imported-drafts` passed with no overflow, console errors, or failed requests.
- Employee mobile direct `/settings`, `/employees`, `/app-health`, and `/imported-drafts` redirected to `/jobs` with no admin foundation text leaked.
- Employee mobile `/support` stayed role-safe with no admin foundation text leaked.

Permissions impact:

- No permission loosening.
- Field users remain blocked from admin setup, provider setup, package/billing, imported drafts, leads, estimates, pricing, margins, profit, payroll, AI office, company setup, and other company data.
- Provider-ready states are visible to owner/admin users only and do not execute live provider writes.

Field-user impact:

- No field workflow changes. Field direct-route protection was verified on mobile.

Mobile impact:

- Employee mobile admin/setup direct-route safety passed with no horizontal overflow.

Deploy version:

- `9ccc1ac` deployed to Fly machine `148e06e2b53d68` version `606`.

Health check:

- `https://app.apexhq.online/api/ready` OK with database OK.
- `https://concrete-ops-2.fly.dev/api/ready` OK with database OK.
- Fly service check passing.

Rollback note:

- Revert `9ccc1ac` to remove the Settings Admin Foundation Finish Board and verifier update. Keep earlier blocker fixes unless the rollback explicitly targets Phase 1 Slice 1. No schema changes, migrations, provider changes, secrets, live sends, live payments, ad spend, hidden GPS, or production data changes were introduced.

Next recommended phase:

- Phase 2 Command Center Finish.

## Billing / Payments / Packages Phase Report

Goal: make packages, billing readiness, payment provider setup, checkout/manual invoice prep, receipts, failed-payment states, and contractor payment workflows visible to owner/admin users without enabling live money movement.

What was already built:

- Package definitions, package hierarchy, package entitlements, Plan Readiness panel, support upgrade review packet, audit events, and closeout billing review/job costing prep.

What was completed now:

- Added `deriveBillingPaymentsCommandState` for owner/admin billing command state.
- Added Billing / Payments / Packages Command to Settings Plan Readiness.
- Added provider-ready lanes for package/subscription, payment provider health, checkout, manual invoice workflow, receipts, and failed payments.
- Added billing-ready job candidate review with estimate plus recognized change-order totals.
- Added package/billing audit review, receipt/failure states, and blocked money action list.
- Updated package readiness to provider-ready language while keeping live processing and self-serve package changes disabled.

Provider/account-dependent remaining:

- Stripe or chosen payment provider account/API keys, webhook signing secret, tax/legal/accounting review, live checkout, customer/subscription model, real invoices/receipts, payment links, payment failure handling, and self-serve package changes.

Affected files:

- `docs/APEX_HQ_LIVING_FINISH_PLAN.md`
- `scripts/package-billing-readiness.mjs`
- `shared/packages.js`
- `shared/packages.test.js`
- `src/App.jsx`
- `src/billing-payments-command-utils.js`
- `src/billing-payments-command-utils.test.js`
- `src/settings-route-components.jsx`

Validation results:

- `node --test --test-concurrency=1 src/billing-payments-command-utils.test.js shared/packages.test.js scripts/package-billing-readiness.test.mjs src/settings-route-components-import.test.js` passed.
- `npm.cmd run verify:billing-readiness` passed.
- `npm.cmd run verify:roles` passed.
- `npm.cmd run build` passed with existing large chunk warnings.
- `git diff --check` passed.

Browser QA:

- Admin desktop `/settings`: Billing / Payments / Packages Command, provider readiness, blocked money actions, receipt/failure states, and no-overflow/no-error checks passed.
- Employee mobile `/settings`: redirected to `/jobs`; billing/payment/package command text hidden; no overflow/errors.

Permissions impact:

- No permission loosening.
- Billing command requires owner/admin role plus Settings visibility.
- No frontend secrets, package mutations, checkout sessions, invoices, payment links, charges, receipts, failed-payment notices, or self-serve plan changes were added.

Field-user impact:

- Field users remain blocked from billing, packages, payment providers, invoices, payment links, receipts, failed payments, margins, profit, payroll, and admin settings.

Mobile impact:

- Employee mobile restricted-route behavior verified. Owner/admin desktop command layer verified.

Deploy version:

- `5169b4d` deployed to Fly machine `148e06e2b53d68` version `603`.

Health check:

- `https://app.apexhq.online/api/ready` OK.
- `https://concrete-ops-2.fly.dev/api/ready` OK.
- Fly service check `servicecheck-00-http-4000` passing.

Rollback note:

- Revert the affected files above to remove the Billing / Payments / Packages Command and restore prior manual package readiness language without schema changes or payment-provider data changes.

Next recommended phase:

- Integrations.

## Integrations Phase Report

Goal: give owner/admin users a finished provider-ready Integrations Command that shows exactly what needs to be configured for contractor tools without exposing secrets, enabling live provider writes, or showing field users integration context.

What was already built:

- Imported job draft review queue, website lead intake, proposal app handoff contracts, package entitlements for platform integrations, audit activity, Settings setup shell, and Agent OS locked `integration_write` external gate.

What was completed now:

- Added `deriveIntegrationsCommandState` for owner/admin provider readiness.
- Added Integrations Command inside Settings.
- Added provider rows for QuickBooks, Gmail, Google Calendar, Google Drive, Twilio, Maps/weather, CompanyCam, DocuSign/e-signature, and Google/Meta Ads.
- Added readiness controls for settings UI, server adapter, provider health, disabled/not-configured state, focused tests, no frontend secrets, audit trail, and disconnect/disable control.
- Added built inbound contract review for website lead intake, imported job drafts, proposal app handoff, and the locked Agent integration write gate.
- Added top-level `integrations` package entitlement and server/client permission scope with live writes locked as `canWrite: false`.

Provider/account-dependent remaining:

- QuickBooks, Gmail, Google Calendar, Google Drive, Twilio, Maps/weather, CompanyCam, DocuSign/e-signature, and Google/Meta Ads accounts/API keys/OAuth scopes/secrets/sandbox verification/mapping/audit/disconnect controls remain provider-dependent.
- Live provider writes, live sends, ad publishing/spend, accounting writes, calendar/file mutations, signature requests, payment/billing actions, and hidden GPS remain blocked.

Affected files:

- `docs/APEX_HQ_LIVING_FINISH_PLAN.md`
- `server/index.js`
- `shared/packageEntitlements.js`
- `shared/packageEntitlements.test.js`
- `src/App.jsx`
- `src/app-state-utils.js`
- `src/integrations-command-utils.js`
- `src/integrations-command-utils.test.js`
- `src/settings-route-components.jsx`
- `src/settings-route-components-import.test.js`

Validation results:

- `node --test --test-concurrency=1 src/integrations-command-utils.test.js src/settings-route-components-import.test.js shared/packageEntitlements.test.js` passed.
- `npm.cmd run verify:roles` passed.
- `npm.cmd run build` passed with existing large chunk warnings.
- `git diff --check` passed with CRLF warnings only.

Browser QA:

- Admin desktop `/settings`: Integrations Command, provider readiness board, QuickBooks, Gmail, Google Calendar, Twilio, no frontend secrets, writes locked, built inbound contracts, and no-overflow/no-error checks passed.
- Employee mobile `/settings`: redirected to `/jobs`; Integrations Command, QuickBooks, Gmail, Twilio, no frontend secrets, and writes locked text hidden; no overflow/errors.

Permissions impact:

- No permission loosening.
- Added package-gated `integrations` permission scope for owner/admin visibility and explicit `canWrite: false`.
- Agent OS integration write gate remains locked.
- No frontend secrets, OAuth token exchange, provider calls, external writes, ads, sends, payments, calendar/file mutations, or hidden GPS were added.

Field-user impact:

- Field users remain blocked from integrations, provider setup, API/OAuth context, leads, estimates, pricing, billing, margins, profit, payroll, admin settings, and AI office tools.

Mobile impact:

- Employee mobile restricted-route behavior verified. Owner/admin desktop command layer verified.

Deploy version:

- `c10a273` deployed to Fly machine `148e06e2b53d68` version `604`.

Health check:

- `https://app.apexhq.online/api/ready` OK.
- `https://concrete-ops-2.fly.dev/api/ready` OK.
- Fly service check `servicecheck-00-http-4000` passing.

Rollback note:

- Revert the affected files above to remove the Integrations Command and top-level integrations permission/entitlement scope without schema changes, provider changes, secret changes, or production data rollback.

Next recommended phase:

- Scale + Public Launch.

## Growth Foundation Phase Report

Goal: make Apex HQ visibly help owner/admin users find new clients, plan ad spend safely, keep follow-up moving, and turn proof into reviews/referrals without rebuilding the existing Opportunity Scout/Agent Leads systems.

What was already built:

- Opportunity Scout search profiles, lead sources, found opportunities, source checks, review-first lead conversion, Agent Leads provider readiness, source coverage/health/readiness layers.
- Lead follow-up, contact history, website lead intake foundations, estimate/job/proof/closeout records, and AI Office review queues.

What was completed now:

- Added this living finish plan as the active no-loop memory file.
- Added Growth Command Center state derivation with Client Finder, Ads Spend Advisor, Follow-Up, and Reputation/Portfolio lanes.
- Added owner/admin Growth Command Center in AI Office.
- Added provider-ready ads planning: daily/monthly guardrails, owner max spend display, target CPL, channel fit, stop-loss, and no autonomous ad spend/publishing boundary.
- Added source coverage checklist for public bids, GCs, plan rooms, HOAs, builders, property managers, past customers, referrals, website, and social/manual sources.
- Kept deeper Daily Job Finder/Opportunity Scout controls behind existing package/permission gates while showing the high-level growth command layer to owner/admin AI Office users.

Provider/account-dependent remaining:

- Live ad account reporting/publishing, marketplace integrations, email/SMS sends, payment processing, and production provider runs.

Affected files:

- `docs/APEX_HQ_LIVING_FINISH_PLAN.md`
- `src/App.jsx`
- `src/growth-command-utils.js`
- `src/growth-command-utils.test.js`

Validation results:

- `node --test --test-concurrency=1 src/growth-command-utils.test.js` passed.
- `npm.cmd run verify:opportunity-scout` passed.
- `npm.cmd run verify:leads` passed.
- `npm.cmd run verify:roles` passed.
- `npm.cmd run build` passed with existing large chunk warnings.
- `git diff --check` passed.
- Local `/api/ready` returned OK.
- `npm.cmd run launch:gate-status -- --json` reported guided demo GO, but customer pilot handoff, production auth smoke, monitoring upgrade, and wider paid launch NO-GO.

Browser QA:

- Owner desktop `/ai-office`: Growth Command Center, Ads Spend Advisor, Best Places To Spend, and Source Coverage Board visible.
- Employee mobile `/ai-office`: redirected to `/jobs`; Growth Command Center and owner growth/ad/source text not visible.

Permissions impact:

- No permission loosening for field users.
- Owner/admin AI Office users can see the high-level growth command layer.
- Deeper Opportunity Scout management remains controlled by existing package/permission gates.

Field-user impact:

- Field users still do not see leads, estimates, pricing, ads, AI Office growth controls, billing, or company setup.

Mobile impact:

- Employee mobile restricted-route behavior verified.
- Owner/admin mobile-specific polish is still a later UI pass.

Rollback note:

- Revert `src/App.jsx`, `src/growth-command-utils.js`, `src/growth-command-utils.test.js`, and this living plan update to remove the Growth Command Center without touching existing Opportunity Scout data or schemas.

Next recommended phase:

- Website + Lead Intake Funnel, then Sales Follow-Up System.

## Website + Lead Intake Funnel Phase Report

Goal: make the public request flow capture real contractor demand and route it safely into owner/admin lead review.

What was already built:

- Public estimate request route, public demo interest route, honeypot/rate limiting, required contact channel, lead/customer creation, queue cue, audit activity, field-role denial tests, and website lead integration package contracts.

What was completed now:

- Added service type, timeline, budget range, referral source, photos/documents note, and contact consent to the public estimate request form.
- Added source attribution capture for page URL, referrer, UTM source, UTM medium, UTM campaign, source app, and source submission id.
- Added a thank-you/next-step state that explains office review, manual follow-up, and project fit confirmation.
- Updated the server route to store enriched safe notes, mark urgent timelines high priority, set follow-up due today, and create a manual "Review website request" queue task.
- Exposed a public estimate request target company id only when one active company exists so the browser form can satisfy the explicit-target API gate.
- Added owner/admin Settings setup checklist notes for public intake.
- Expanded `verify:public-request` to include the new public form tests.

Provider/account-dependent remaining:

- Website embed on an external contractor site, branded service pages, SEO/service page drafts, file/photo upload provider, and any automated email/SMS follow-up.

Affected files:

- `docs/APEX_HQ_LIVING_FINISH_PLAN.md`
- `package.json`
- `server/index.js`
- `server/public-request.test.js`
- `src/App.jsx`
- `src/public-estimate-request-form.js`
- `src/public-estimate-request-form.test.js`
- `src/public-estimate-request-page-components.jsx`
- `src/public-estimate-request-page-components-import.test.js`

Validation results:

- `npm.cmd run verify:public-request` passed.
- `npm.cmd run verify:leads` passed.
- `npm.cmd run verify:roles` passed.
- `npm.cmd run build` passed with existing large chunk warnings.
- `git diff --check` passed.
- `npm.cmd run launch:gate-status -- --json` reported guided demo GO, but customer pilot handoff, production auth smoke, monitoring upgrade, and wider paid launch NO-GO.

Browser QA:

- Public mobile `/request-estimate`: submitted a request and reached the thank-you state with manual follow-up and project-fit next steps.
- Owner desktop `/leads`: created website request lead visible with review task.
- Employee mobile `/leads`: redirected to `/jobs`; website lead and lead workspace text not visible.

Permissions impact:

- No field permissions were loosened.
- Public requests create owner/admin review work only.
- External write target remains explicit; browser target is exposed only for single active company public intake.

Field-user impact:

- Field users still cannot see public leads, lead pipeline, estimates, pricing, AI office, billing, or settings.

Mobile impact:

- Public mobile request flow and employee mobile restricted-route behavior were browser-tested.

Rollback note:

- Revert the listed files to return to the prior basic public estimate request form and server notes without schema changes or data migration.

Next recommended phase:

- Sales Follow-Up System.

## Sales Follow-Up System Phase Report

Goal: help contractors win more of the leads and estimates they already have before buying more leads or ads.

What was already built:

- Lead states, lead filtering, contact history, manual follow-up queue, communication center, copy-only outreach drafts, lead source checks, estimate follow-up notifications, role-gated Leads route, and field-user denial.

What was completed now:

- Added a Sales Follow-Up System command layer on the owner/admin Leads page.
- Added daily follow-up queue summary for due, overdue, not-contacted, waiting, follow-up-needed, and unscheduled work.
- Added stale estimate reminders for sent/proposal/pending estimates with overdue, missing, or stale follow-up.
- Added source-quality rows by lead source with open, due, waiting, won, lost, and win-rate signals.
- Added won/lost learning rows from lead status and contact-history outcomes.
- Added call, voicemail, email, text, referral ask, and review ask script library as manual copy only.
- Added manual Log Won and Log Lost actions to the draft/copy panel so outcomes can feed source learning.

Provider/account-dependent remaining:

- Live email/SMS/DM sending, communication provider delivery, CRM sync, ad-platform reporting, and automatic review/referral sends remain provider-dependent and locked.

Affected files:

- `docs/APEX_HQ_LIVING_FINISH_PLAN.md`
- `scripts/verify-leads.mjs`
- `scripts/verify-leads.test.mjs`
- `src/leads-page-components.jsx`
- `src/leads-page-components-import.test.js`
- `src/manual-outreach-drafts.js`
- `src/manual-outreach-drafts.test.js`
- `src/manual-outreach-panel-components.jsx`
- `src/sales-follow-up-system.js`
- `src/sales-follow-up-system.test.js`

Validation results:

- `node --test --test-concurrency=1 src/sales-follow-up-system.test.js src/manual-outreach-drafts.test.js src/leads-page-components-import.test.js` passed.
- `npm.cmd run verify:leads` passed.
- `npm.cmd run verify:roles` passed.
- `npm.cmd run build` passed with existing large chunk warnings.
- `git diff --check` passed.

Browser QA:

- Owner desktop `/leads`: Sales Follow-Up System, Stale Estimate Reminders, Lead Quality By Source, Scripts/Reviews/Referrals, Won/Lost Reasons, and manual boundary visible.
- Employee mobile `/leads`: Sales Follow-Up System, Lead Quality By Source, and lead workspace text hidden.
- Browser errors after ignoring expected unauthenticated bootstrap probe: none.

Permissions impact:

- No permission loosening.
- Sales follow-up command layer is under the existing Leads route and contact-history permissions.
- Field users remain blocked from leads, estimates, source quality, scripts, won/lost learning, and office sales controls.

Field-user impact:

- No field workflow changes. Employee mobile route remains sales-hidden.

Mobile impact:

- Employee mobile restricted-route behavior verified. Owner/admin desktop command layer verified; owner/admin mobile polish can be handled in a later UI pass if needed.

Rollback note:

- Revert the affected files listed above to remove the Sales Follow-Up System command layer and won/lost quick actions without schema changes or data migration.

Next recommended phase:

- Reputation + Portfolio Engine.

## Reputation + Portfolio Engine Phase Report

Goal: turn completed and proof-backed contractor work into trust assets that help win future work without inventing proof, sending messages, publishing posts, or exposing field-private data.

What was already built:

- Jobs, uploads, daily reports, closeout proof, proposal proof foundations, Growth Command Center, owner/admin AI Office, and role-gated field boundaries.

What was completed now:

- Added a review-first Reputation + Portfolio Engine state layer.
- Added owner/admin Growth Command Center panel for project story candidates, before/after guidance, review/referral drafts, proposal proof blocks, social/website drafts, and proof blockers.
- Added manual-only safety boundaries for review requests, referral asks, social posts, website gallery items, customer names/logos/quotes/photos, GPS coordinates, and fake proof.
- Added focused tests for proof-ready stories, proof blockers, field-role blocking, and anti-fake-proof boundaries.
- Added the new reputation utility test to `verify:jobs`.

Provider/account-dependent remaining:

- Live review requests, referral emails/texts/DMs, Google Business Profile prompts, social publishing, website gallery publishing, and any external customer communication remain provider/account-dependent and manual-send locked.

Affected files:

- `docs/APEX_HQ_LIVING_FINISH_PLAN.md`
- `package.json`
- `src/App.jsx`
- `src/reputation-portfolio-utils.js`
- `src/reputation-portfolio-utils.test.js`

Validation results:

- `node --test --test-concurrency=1 src/reputation-portfolio-utils.test.js src/growth-command-utils.test.js` passed.
- `npm.cmd run verify:jobs` passed.
- `npm.cmd run verify:roles` passed.
- `npm.cmd run build` passed with existing large chunk warnings.
- `git diff --check` passed.

Browser QA:

- Owner desktop `/ai-office`: Growth Command Center, Reputation + Portfolio Engine, Project Story Builder, Review / Referral Queue, Proposal Proof Blocks, and Manual publish only boundary visible.
- Employee mobile `/ai-office`: redirected to `/jobs`; Growth Command Center, Reputation + Portfolio Engine, and Project Story Builder hidden.
- Browser errors: none after ignoring expected unauthenticated bootstrap probe.

Permissions impact:

- No permission loosening.
- Reputation/portfolio proof is owner/admin/office review context only.
- Field users stay blocked from reputation, referral, review, social, website proof, lead, estimate, pricing, AI office growth controls, and GPS/private proof details.

Field-user impact:

- No field workflow changes. Employee mobile restricted-route behavior remains field-safe.

Mobile impact:

- Employee mobile restricted-route behavior verified. Owner/admin desktop command layer verified.

Rollback note:

- Revert the affected files listed above to remove the Reputation + Portfolio Engine panel and utility without schema changes or data migration.

Next recommended phase:

- Estimate Studio + Proposal Packets.

## Phase 6 Field Execution Finish Report

Goal: finish the field execution workflow for crews and foremen from assigned-job arrival through daily execution, proof capture, daily reports, delivery tickets, checklists, safety notes, change request capture, and end-of-day handoff without creating a second field app or exposing office-only data.

What was already built:

- Field workspace, assigned jobs, foreman/employee mobile shells, time/PWA surfaces, uploads/proof, daily reports, delivery tickets, pre-pour/post-pour/tool checklists, safety/PPE/toolbox surfaces, change orders, and server-side field job redaction.

What was completed now:

- Upgraded `deriveFieldModeFinishState` into the Field Execution Finish command layer with arrival/start readiness, proof reminders, daily report submitted-vs-draft state, tickets/checklists/safety capture, change request handoff status, end-of-day closeout readiness, and honest install/offline wording.
- Passed field change request context into the existing foreman and employee field workspace pages.
- Added focused tests for employee field-only visibility, foreman field-safe workflow, end-of-day handoff readiness, no office/money/provider leakage, no hidden GPS claims, and no automatic external actions.

Provider/account-dependent remaining:

- True offline draft/sync, external messaging, provider integrations, customer sends, vendor ordering, invoices, payment actions, and live GPS/location policies remain unbuilt or locked until a dedicated approved phase.

Affected files:

- `docs/APEX_HQ_CANONICAL_SOURCE_OF_TRUTH.md`
- `docs/APEX_HQ_LIVING_FINISH_PLAN.md`
- `src/field-mode-finish-utils.js`
- `src/field-mode-finish-utils.test.js`
- `src/field-workspace-page-components.jsx`
- `src/field-workspace-leader-page-components.jsx`

Validation results:

- `node --test --test-concurrency=1 src/field-mode-finish-utils.test.js src/field-workspace-page-components-import.test.js src/field-workspace-utils.test.js src/field-jobs-route-module.test.js src/field-mobile-layout-css.test.js` passed with 17 tests.
- `npm.cmd run verify:jobs` passed with 231 tests.
- `npm.cmd run verify:roles` passed with 13 tests.
- `npm.cmd run verify:daily-reports`, `verify:uploads`, `verify:time`, `verify:delivery-tickets`, `verify:tool-checklist`, `verify:safety`, `verify:pre-pour`, `verify:post-pour`, and `verify:change-orders` passed.
- `npm.cmd run build` passed with existing large chunk warnings only.
- `git diff --check` passed with CRLF warnings only.

Browser QA:

- Employee mobile `/field`: Field Execution Finish was visible; clicked Arrival/start -> `/jobs`, Photos/proof -> `/uploads`, End-of-day handoff -> `/pre-pour`, and Install/offline -> `/support`; no horizontal overflow, console errors, failed requests, or office/money/provider text.
- Foreman mobile `/field`: Field Execution Finish was visible; clicked Arrival/start -> `/jobs`, Daily report -> `/reports`, Delivery tickets -> `/delivery-tickets`, Change request -> `/change-orders`, and End-of-day handoff -> `/time`; no horizontal overflow, console errors, failed requests, or office/money/provider text.
- Employee and foreman mobile direct `/command-center`: redirected to `/jobs`; command/growth/billing/office text stayed hidden.
- Owner/admin desktop `/field`: field leader view loaded with no horizontal overflow, console errors, or failed requests.

Permissions impact:

- No permission loosening.
- Employee users remain field-only with assigned job, proof, time, checklist/safety, and support routes only.
- Foremen get field-safe daily report and change request handoff routing only where existing permissions allow it.
- Leads, estimates, pricing, profit/margins, payroll, office notes, admin setup, AI office tools, billing, provider context, estimate packet context, and other company data remain hidden from field users.

Field-user impact:

- Crews get a clearer next-action sequence for arrival/start, proof, reports, tickets/checklists/safety, change requests, and closeout without new exposed business data or automatic external actions.

Mobile impact:

- Employee and foreman mobile click-through QA passed with no page-level horizontal overflow. Offline/PWA status is explicit: install-ready, but live records still need connection and offline drafts remain planned.

Deploy version:

- `8a250af` deployed to Fly machine `148e06e2b53d68` version `611`, image `concrete-ops-2:deployment-01KSW5YE7BC4BDDGKJV3ZR6V6C`.

Health check:

- `https://app.apexhq.online/api/ready` OK with database OK.
- `https://concrete-ops-2.fly.dev/api/ready` OK with database OK.

Rollback note:

- Revert `8a250af` to remove the Field Execution Finish utility updates, field workspace change-request prop flow, and focused tests. No schema changes, auth/session changes, billing/payment processing, provider writes, live sends, vendor orders, payroll actions, hidden GPS, destructive data changes, or production data migrations were introduced.

Next recommended phase:

- Phase 7 Safety & Compliance Finish.

## Phase 5 Job Operations Finish Report

Goal: finish the owner/admin job operations workflow so a contractor can review one job from approved source/handoff through schedule, startup, crew, field visibility, materials, tools, safety/proof, and completion readiness without leaving the existing Jobs workflow.

What was already built:

- Jobs, Schedule, Material Prep, Startup Checklist, field visibility, crew assignment, uploads/proof, daily reports, delivery tickets, safety incidents, tool checklists, closeout/billing review, and role-scoped field payloads.

What was completed now:

- Added `deriveJobOperationsFinishState` as a pure owner/admin state layer across approved source/handoff, schedule, crew, scope/jobsite, startup, field visibility, material prep, tools, safety, proof, and completion readiness.
- Added a Job Operations Finish panel inside the existing Jobs shell with routed next actions to Jobs, Schedule, Material Prep, Tool Checklist, Safety, Uploads, and existing local job modes.
- Added focused tests proving the finish state ties job setup together, highlights blockers, avoids mutation, excludes money/office-only fields, and locks field role permissions.
- Added the new test file to `verify:jobs`.

Provider/account-dependent remaining:

- Live customer sends, vendor purchasing/orders, provider writes, field notifications, billing/payment actions, payroll actions, and external integrations remain locked/provider-dependent.

Affected files:

- `docs/APEX_HQ_CANONICAL_SOURCE_OF_TRUTH.md`
- `docs/APEX_HQ_LIVING_FINISH_PLAN.md`
- `package.json`
- `src/job-operations-finish-utils.js`
- `src/job-operations-finish-utils.test.js`
- `src/jobs-page-components.jsx`

Validation results:

- `node --test --test-concurrency=1 src/job-operations-finish-utils.test.js src/job-utils.test.js src/material-prep-utils.test.js` passed.
- `node --test --test-concurrency=1 src/jobs-page-components-import.test.js src/job-route-components-import.test.js` passed.
- `npm.cmd run verify:jobs` passed with 230 tests.
- `npm.cmd run verify:roles` passed with 13 tests.
- `npm.cmd run build` passed with existing large chunk warnings only.
- `git diff --check` passed with CRLF warnings only.

Browser QA:

- Owner/admin desktop `/jobs`: Job Operations Finish was visible, checkpoint actions were present, no horizontal overflow, no console errors, and no failed requests.
- Employee mobile `/jobs`: Job Operations Finish stayed hidden, office/money/provider text stayed hidden, no horizontal overflow, no console errors, and no failed requests.
- Employee mobile direct `/estimates`: redirected to `/jobs`; estimate/pricing text stayed hidden.

Permissions impact:

- No permission loosening.
- Owner/admin users get the finish layer under existing Jobs permissions.
- Field users remain blocked from Job Operations Finish, leads, estimates, pricing, margins, profit, payroll, office notes, admin settings, company setup, AI office tools, billing, provider setup, estimate packet context, and other company data.

Field-user impact:

- No new field data exposure. Field users stay assigned-work only and do not receive office finish state.

Mobile impact:

- Employee mobile restricted-route safety and no-overflow checks passed. Owner/admin desktop is the primary Phase 5 finish surface.

Deploy version:

- `72e1c99` deployed to Fly machine `148e06e2b53d68` version `610`, image `concrete-ops-2:deployment-01KSW4378XPSFE5AZ5NKRAKE94`.

Health check:

- `https://app.apexhq.online/api/ready` OK with database OK.
- `https://concrete-ops-2.fly.dev/api/ready` OK with database OK.

Rollback note:

- Revert `72e1c99` to remove the Job Operations Finish utility, Jobs panel, verifier inclusion, and tests. No schema changes, auth/session changes, billing/payment processing, provider writes, live sends, vendor orders, payroll actions, hidden GPS, destructive data changes, or production data migrations were introduced.

Next recommended phase:

- Phase 6 Field Execution Finish.

## Estimate Studio + Proposal Packets Phase Report

Goal: finish the contractor proposal workflow so owner/admin users can see whether an estimate is customer-ready, GC-ready, send-review-ready, and field-handoff-ready from one Estimate Studio command view.

What was already built:

- Estimate math, line items, branded PDF packets, packet presets, customer/internal packet separation, proposal sections, options/add-ons, GC Packet Lite, backup/SOV/takeoff references, sent snapshots, provider-not-configured send states, and estimate-to-job handoff readiness.

What was completed now:

- Added a final proposal packet readiness utility across customer/contact, scope, pricing, option comparison, terms/exclusions/assumptions, proof/takeoff backup, GC packet, customer-safe output, send mode, and foreman handoff.
- Added an owner/admin Final Proposal Packet Review panel inside Estimate Studio.
- Added packet-mode final review summary while keeping packet editing on the existing GC packet/settings path.
- Updated Estimate Studio command language so this phase is visible as the proposal finish workflow.
- Added focused tests for finished packet readiness, email-provider boundaries, missing polish blockers, field-role blocking, and customer/internal isolation.
- Added the new estimate finish test to `verify:estimates`.

Provider/account-dependent remaining:

- Live estimate email delivery remains provider-dependent and still requires human confirmation. No customer portal send, SMS, payment, billing, schedule, crew assignment, or field visibility automation was added.

Affected files:

- `docs/APEX_HQ_LIVING_FINISH_PLAN.md`
- `package.json`
- `src/estimate-proposal-finish-utils.js`
- `src/estimate-proposal-finish-utils.test.js`
- `src/estimates-page-components.jsx`

Validation results:

- `node --test --test-concurrency=1 src/estimate-proposal-finish-utils.test.js src/estimate-utils.test.js shared/estimatePrint.test.js` passed.
- `npm.cmd run verify:estimates` passed.
- `npm.cmd run verify:roles` passed.
- `npm.cmd run build` passed with existing large chunk warnings.
- `git diff --check` passed with existing CRLF warnings only.

Browser QA:

- Owner/admin desktop `/estimates`: Estimate Studio, Final Proposal Packet Review, Customer Packet, Option Comparison, Proof / Takeoff Backup, GC Packet, Foreman Handoff, Send Review, and Manual/provider-ready only boundary visible.
- Employee mobile `/estimates`: redirected to `/jobs`; estimate/proposal packet/send review text hidden.
- Browser errors: none after ignoring expected unauthenticated bootstrap probe.

Permissions impact:

- No permission loosening.
- Final packet review is under the existing Estimates route and office estimate permissions.
- Field users remain blocked from estimates, proposal packets, pricing, customer sends, office-only notes, margins, profit, payroll, billing, and AI office controls.

Field-user impact:

- No field workflow changes. Field handoff readiness stays pricing-free and review-first.

Mobile impact:

- Employee mobile restricted-route behavior verified. Owner/admin desktop command layer verified.

Rollback note:

- Revert the affected files listed above to remove the Final Proposal Packet Review layer without schema changes, estimate data migration, or PDF packet rollback.

Next recommended phase:

- Core Operations Loop.

## Core Operations Loop Phase Report

Goal: make the contractor operating workflow obvious from one owner/admin command surface: lead -> estimate -> proposal -> approved job -> schedule -> field proof -> change orders -> closeout -> billing readiness.

What was already built:

- Leads, follow-up, lead sources, estimates/proposals, approved estimate handoff readiness, jobs, schedule, startup checklist, daily reports, uploads, delivery tickets, safety, tool checklists, time, change orders, material prep, job costing review, and closeout billing review.
- Operations Command already surfaced today work, money-ready signals, proof gaps, field blockers, and office review queues.

What was completed now:

- Added a Core Operations Loop utility that composes existing modules into eight stage statuses and a single next action.
- Added owner/admin Operations Command panel with workflow stages, core loop label, metrics, shortcuts, and the next module to open.
- Added metrics for stages clear, blockers, money-ready items, closeout jobs, material prep packets, and job costing warnings.
- Added review-first blocked actions so the loop cannot mutate records, send customers, order materials, invoice, collect payment, submit bills, change schedules, change crews, or expose field users to office-only data.
- Added focused tests and included the new test in `verify:jobs`.

Provider/account-dependent remaining:

- Live customer/GC/vendor/accounting/payment/provider actions remain outside this panel and depend on configured providers, human review, and the dedicated future phases.

Affected files:

- `docs/APEX_HQ_LIVING_FINISH_PLAN.md`
- `package.json`
- `src/core-operations-loop-utils.js`
- `src/core-operations-loop-utils.test.js`
- `src/today-command-page-components.jsx`

Validation results:

- `node --test --test-concurrency=1 src/core-operations-loop-utils.test.js src/today-command-page-components-import.test.js src/command-today-page-shell.test.js src/command-center-utils.test.js src/job-closeout-billing-utils.test.js src/material-prep-utils.test.js src/change-order-utils.test.js` passed.
- `npm.cmd run verify:jobs` passed.
- `npm.cmd run verify:roles` passed.
- `npm.cmd run build` passed with existing large chunk warnings.
- `git diff --check` passed with CRLF warnings only.

Browser QA:

- Owner/admin desktop `/command-center`: Core Operations Loop, stage label, field proof, closeout/billing readiness, and no-auto-actions boundary visible.
- Employee mobile `/command-center`: redirected to `/jobs`; Core Operations Loop, lead/estimate, and closeout/billing readiness text hidden.
- Browser errors: none.

Permissions impact:

- No permission loosening.
- Core Operations Loop is office-only and uses existing module permissions.
- Field users remain blocked from leads, estimates, pricing, billing, margins, profit, payroll, office-only notes, AI office controls, company setup, and cross-company data.

Field-user impact:

- No new field exposure. Employee mobile remains in assigned field work.

Mobile impact:

- Employee mobile restricted-route behavior verified. Owner/admin desktop command surface verified; field mobile finish is the next phase.

Rollback note:

- Revert the affected files listed above to remove the Core Operations Loop panel and state utility without schema changes or data migration.

Next recommended phase:

- Field Mode Finish.

## Field Mode Finish Phase Report

Goal: finish the crew-facing mobile day workflow so foremen and employees can open Apex HQ on a phone and clearly run today's assigned field work without seeing office, money, growth, or private company data.

What was already built:

- Field workspace role pages, mobile job queue, assigned job cards, time/clock workspace, uploads/photos, daily reports, delivery tickets, tool checklists, safety incidents, change request foundations, assignment notices, route guards, and PWA install foundations.

What was completed now:

- Added a field-safe Field Day Finish utility that derives crew-ready status from existing field records.
- Added a mobile-first Field Day Finish panel to the field workspace.
- Covered today's job, clock/time, assignment notice, photos/proof, daily reports for foremen, delivery tickets, checklists, safety/PPE, change request for foremen, PWA install readiness, and offline-draft planning.
- Added field-safe next actions that route to existing field tools instead of creating a second field app.
- Kept PWA language install-ready only; offline editing and offline draft sync remain later.
- Added focused tests and included the new field-mode finish test in `verify:jobs`.

Provider/account-dependent remaining:

- No provider is required for this phase. Offline field drafts remain a later build item and must not claim hidden sync/API caching until implemented.

Affected files:

- `docs/APEX_HQ_LIVING_FINISH_PLAN.md`
- `package.json`
- `src/field-mode-finish-utils.js`
- `src/field-mode-finish-utils.test.js`
- `src/field-workspace-page-components.jsx`
- `src/field-workspace-page-components-import.test.js`
- `src/field-mobile-layout-css.test.js`
- `src/index.css`

Validation results:

- `node --test --test-concurrency=1 src/field-mode-finish-utils.test.js src/field-workspace-utils.test.js src/field-workspace-page-components-import.test.js src/field-mobile-layout-css.test.js src/field-jobs-route-module.test.js src/mobile-nav-utils.test.js src/app-routing.test.js` passed.
- `npm.cmd run verify:jobs` passed.
- `npm.cmd run verify:roles` passed.
- `node --test --test-concurrency=1 src/pwa-config.test.js` passed.
- `npm.cmd run build` passed with existing large chunk warnings.
- `git diff --check` passed with CRLF warnings only.
- After browser QA caught field-safety wording, `src/field-mode-finish-utils.test.js`, `npm.cmd run verify:jobs`, and `npm.cmd run build` passed again.

Browser QA:

- Employee mobile `/field`: Field Day Finish, Clock / time, Photos / proof, Install / offline, and visible optional GPS boundary passed; leads, estimates, pricing, billing, margins, payroll, and AI Office text hidden.
- Foreman mobile `/field`: Field Day Finish, Daily report, Change request, Delivery tickets, and Install / offline passed; office/money/growth terms hidden.
- Employee direct `/command-center`: redirected to `/jobs`; Core Operations Loop, Lead -> estimate, and closeout/billing readiness text hidden.
- Browser errors and failed requests: none.
- Mobile overflow: none detected.

Permissions impact:

- No permission loosening.
- Field Mode Finish uses existing field route/role context and existing field tool boundaries.
- Daily report and change request actions stay foreman-only.
- No hidden GPS tracking was added; GPS remains optional and user-tapped.

Field-user impact:

- Field users get a clearer day checklist and next action surface.
- Field users still do not see leads, estimates, pricing, billing, margins, profit, payroll, office notes, AI office controls, company setup, growth controls, or other company data.

Mobile impact:

- Mobile field workflow is the primary target. The panel uses compact header text, fixed card sizing, horizontal scrolling, touch-friendly actions, and verified no-overflow behavior.

Rollback note:

- Revert the affected files listed above to remove the Field Day Finish panel and utility without schema changes, data migration, provider changes, or production data rollback.

Next recommended phase:

- Apex Agent Operator.

## Apex Agent Operator Phase Report

Goal: make the one product-facing Apex Agent feel finished for owner/admin users by coordinating the full contractor loop from AI Office without bypassing existing workflows or unlocking external actions.

What was already built:

- Apex Assistant shell, AI Office, Agent OS console, Agent Action Inbox, audit-backed proposal/action packets, contractor advisor, Agent Leads/Daily Job Finder readiness, Growth Command Center, Estimate Studio packet prep, Core Operations Loop, closeout billing review, Field Ops Agent, and Reputation + Portfolio Engine.

What was completed now:

- Added an Apex Agent Operator state layer with nine fixed contractor commands: find new work, plan ads, follow up, draft estimates, prepare proposals, prep job handoffs, review closeout, prepare billing readiness, and request reviews/referrals.
- Added owner/admin AI Office operator panel that shows the next command, all nine commands, provider-ready states, and external-action boundaries.
- Added mobile-safe admin/owner AI Office operator layout with compact visible commands and horizontal-safe cards.
- Added focused tests for owner/admin command coverage, field-role blocking, quiet-day provider-ready behavior, and mobile CSS guardrails.
- Added the new operator utility test to `verify:agent-os-console`.

Provider/account-dependent remaining:

- Live ad account reporting/publishing, email/SMS sends, customer portal link delivery, payment processing, bid submission, schedule/crew external sends, and integration writes remain locked/provider-ready until their dedicated phases and configured providers exist.

Affected files:

- `docs/APEX_HQ_LIVING_FINISH_PLAN.md`
- `package.json`
- `src/App.jsx`
- `src/apex-agent-operator-utils.js`
- `src/apex-agent-operator-utils.test.js`
- `src/index.css`
- `src/utility-mobile-shell.test.js`

Validation results:

- `node --test --test-concurrency=1 src/apex-agent-operator-utils.test.js src/ai-office-utils.test.js src/utility-mobile-shell.test.js src/apex-assistant-shell-utils.test.js src/agent-action-proposal-utils.test.js` passed.
- `npm.cmd run verify:agent-os-console` passed, including local Agent OS console smoke and employee denial.
- `npm.cmd run verify:jobs` passed.
- `npm.cmd run verify:roles` passed.
- `npm.cmd run build` passed with existing large chunk warnings.
- `git diff --check` passed with CRLF warnings only.

Browser QA:

- Owner/admin desktop `/ai-office`: Apex Agent Operator, all nine operator commands, next command, external-action boundary, Agent Command Center, 9 operator cards, 4 boundary rows, no horizontal overflow, no console errors, and no failed requests.
- Admin mobile `/ai-office`: Apex Agent Operator visible with compact first 4 commands, hidden after fourth for short mobile surface, no horizontal overflow, no console errors, and no failed requests.
- Employee mobile `/ai-office`: redirected to `/jobs`; Apex Agent Operator, Plan ads, Prepare billing readiness, and AI Office text hidden; no horizontal overflow.

Permissions impact:

- No permission loosening.
- Operator layer is office-only and uses existing AI Office/office module route boundaries.
- Field users remain blocked from operator commands, growth, estimates, money, settings, AI Office, and private office controls.

Field-user impact:

- No field workflow changes. Employee direct-route behavior remains field-safe.

Mobile impact:

- Admin/owner AI Office gets a compact operator command surface. Field mobile remains restricted to field work.

Rollback note:

- Revert the affected files listed above to remove the Apex Agent Operator panel and state utility without schema changes, data migration, provider changes, or production data rollback.

Next recommended phase:

- Customer Portal + Communications.

## Customer Portal + Communications Phase Report

Goal: finish the owner/admin customer portal and communications workflow so reviewed proposal/proof/progress/change-order packets, comments, approval decisions, and human-reviewed email/SMS readiness are usable from one safe command surface.

What was already built:

- Customer portal manual preview utilities, locked public route contract, internal access records, expiring/revocable lifecycle, packet builder, share approval queue/review, external gate preflight, external execution contracts, communication provider readiness, outbound approval queue, suppression records, and delivery-attempt contracts.
- Communication Center, contact history, role-gated office route access, package entitlements, and field-user restrictions.

What was completed now:

- Added owner/admin Customer Portal Command inside Communication Center.
- Added customer-safe packet summary and readiness for proposal, proof photos, progress updates, and reviewed change orders.
- Added UI flow to prepare expiring access records, load internal packets, queue share review, record ready/changes/rejected decisions, revoke access records, run locked preflight, and prepare locked execution-contract evidence.
- Added customer comment/approval/rejection capture as internal contact history on the proposal/job.
- Added customer portal command state utility and focused tests.
- Connected App API clients/handlers for the existing portal access, packet, share approval, preflight, and execution contract endpoints.
- Kept human-reviewed email/SMS approval, suppression, provider-readiness, and delivery-attempt contracts visible in the same Communications workflow.

Provider/account-dependent remaining:

- Live public portal data serving, token redemption, customer sessions, customer comments from a public route, customer approvals/rejections from a public route, customer portal link delivery, live email/SMS sends, invoices, payment links, and payment collection remain provider/account-dependent and locked until dedicated provider setup and implementation are done.

Affected files:

- `docs/APEX_HQ_LIVING_FINISH_PLAN.md`
- `src/App.jsx`
- `src/api.js`
- `src/communications-route-components.jsx`
- `src/communications-page-shell.test.js`
- `src/customer-portal-command-utils.js`
- `src/customer-portal-command-utils.test.js`

Validation results:

- `node --test --test-concurrency=1 src/customer-portal-command-utils.test.js src/communications-page-shell.test.js src/customer-portal-preview-utils.test.js shared/communicationProviderReadiness.test.js` passed.
- `node --test --test-concurrency=1 server/customer-portal-access-records.test.js src/customer-portal-command-utils.test.js src/communications-page-shell.test.js src/customer-portal-preview-utils.test.js shared/communicationProviderReadiness.test.js` passed.
- `npm.cmd run verify:customer-portal-readiness` passed.
- `npm.cmd run verify:roles` passed.
- `npm.cmd run build` passed with existing large chunk warnings.
- `git diff --check` passed with CRLF warnings only.

Browser QA:

- Admin desktop `/communications`: Communication Center, Customer Portal Command, Prepare access record, Provider readiness, Locked outbound approval, customer-safe packet candidate, and no horizontal overflow passed with no console errors or failed requests.
- Employee mobile direct `/communications`: redirected to `/jobs`; Customer Portal Command, Communication Center, and pricing text hidden; no horizontal overflow.
- Browser QA initially caught an app-level missing `customerPortalPreviewState` definition; fixed and re-ran successfully.

Permissions impact:

- No permission loosening.
- Customer Portal Command uses existing `customerPortal.canPreview`, Elite/package gates, and owner/admin portal API restrictions.
- Communication provider controls stay under contact-history permissions.
- Field users remain blocked from communications, portal command, estimates, pricing, customer-send controls, office notes, billing, margins, profit, AI office controls, settings, and cross-company data.

Field-user impact:

- No field workflow changes. Field users stay in field-safe job workflows and cannot access portal/communications office controls.

Mobile impact:

- Employee mobile restricted-route behavior verified. Admin desktop command workflow verified; owner/admin mobile remains protected by the existing compact Communications fallback.

Deploy version:

- `9b9ea0c` deployed to Fly machine `148e06e2b53d68` version `601`.

Health check:

- `https://app.apexhq.online/api/ready` OK.
- `https://concrete-ops-2.fly.dev/api/ready` OK.
- Fly service check `servicecheck-00-http-4000` passing.

Rollback note:

- Revert the affected files listed above to remove the Communication Center Customer Portal Command and API client wiring without schema changes, data migration, provider changes, public route changes, or production data rollback.

Next recommended phase:

- Billing / Payments / Packages.
