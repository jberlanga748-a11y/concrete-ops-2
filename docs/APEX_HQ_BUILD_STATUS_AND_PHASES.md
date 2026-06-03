# Apex HQ Build Status And Phase Tracker

Last updated: 2026-06-03

Status: historical build-status tracker. Read `docs/APEX_HQ_CANONICAL_SOURCE_OF_TRUTH.md`, `docs/APEX_HQ_LIVING_FINISH_PLAN.md`, and `docs/APEX_HQ_TOOL_COMPLETION_BLUEPRINT.md` before using this file.

Purpose: this file preserves historical build status for Apex HQ. Use it to prevent loops and avoid rebuilding completed systems, but do not let older phase text override the canonical file or living finish plan.

## Current Verdict

Apex HQ is a strong guided-pilot contractor operations platform. It is not yet ready for wide public self-serve SaaS launch, but the core SaaS safety foundation is much stronger than the roadmap originally assumed.

Current state:

- Phase 8-14 finish batch: built, verified, pushed, deployed, and health-checked on production release `v616` with active commit `e904e5a`. This includes Change Orders, Payroll Prep, Closeout & Billing Prep, Reputation & Portfolio, Communications & Customer Portal, Assistant, and Launch readiness gates.
- Apex OS Phase 8 Approval Command Center: hard-finished, pushed, deployed, and health-checked on 2026-06-03 as Fly release `v640` from commit `be2dccb`, with durable approval packet templates, risk scoring, exact approval phrase enforcement, approve/reject/defer decision records, operator-only endpoints, audit/activity history, and locked execution/no irreversible action path.
- Apex OS Phase 9 App Build And Code Awareness: hard-finished, pushed, deployed, and health-checked on 2026-06-03 as Fly release `v641` from commit `6368845`, with a read-only operator-only build-awareness endpoint, sanitized git changed-file map, branch/head/recent-commit status, build/test script status, deploy evidence parsing, known blockers, frozen phase map, source links, next-safe-task recommendation, no field-data exposure, and locked no-execution/no-UI-file-edit boundaries.
- Apex OS Phase 10 Business Operating Center: hard-finished, pushed, deployed, and health-checked on 2026-06-03 as Fly release `v642` from commit `ee851f7`, with private business command queues, source-backed approved business memory rows, launch/founder-demo status, business task drafts, business approval packet draft rows, and manual-only send/publish/ad/billing/customer-visible/claims gates. No live sends, ad spend, billing/payment, customer-visible actions, provider setup, schema/auth/session change, production mutation, or unsupported claims were added.
- Production release evidence: `v614` failed because the runtime image missed `/app/src/time-utils.js`, production was rolled back to healthy `v615`, the Docker packaging gap was fixed in `e904e5a`, and `v616` passed `/api/ready`, hosted smoke, production auth smoke run `26686917811`, and unauthenticated desktop/mobile visual shell checks.
- Pilot/demo readiness: good for guided demos and founder-led pilots.
- Public signup foundation: built and tested.
- Multi-company safety: built and heavily tested, but still needs periodic route sweeps as new workflows are added.
- Package entitlement foundation: built, tested, released.
- First owner onboarding/support handoff: built, tested, released.
- Field Ops Agent Phase 1 read-only summary: built, verified, released, and health-checked.
- Advanced Reporting Prep Phase 2: built, verified, released, and health-checked.
- Enterprise Trust Phase 2: built, verified, released, and health-checked.
- Billing / Manual Upgrade Prep Phase 1: built, verified, released, and health-checked.
- Pilot Feedback Capture Phase 1: built, verified, released, and health-checked.
- Customer Portal Phase 1 Manual Approval Preview: built, verified, released, and health-checked.
- Invite / Activation UX Polish: built, verified, released, and health-checked.
- Guided Demo Rehearsal Refresh: completed against the current live app after the latest product batch; separate demo app credentials were repaired by refreshing `concrete-ops-demo` to Fly `v71`.
- Pilot terms/support and customer data handling drafts: prepared for founder-led pilots; legal review still required before wider paid launch.
- Founder-led demo execution runbook: prepared so demos produce real objection and pilot-fit evidence before more app builds.
- Demo recap and pilot-fit templates: prepared so post-demo follow-up stays manual, claim-safe, and tied to a clear pilot decision.
- Pilot kickoff and check-in templates: prepared so strong-fit demos can convert into controlled 14-day pilots with explicit kickoff, day-3, day-10, support, and continue/adjust/stop criteria.
- Public Website / Sales Funnel Phase 2: built, verified, released, and health-checked so `/founder-pilot` saves guided walkthrough interest as a manual review lead plus one owner/admin office queue cue with explicit consent and spam controls; no signup, checkout, billing, package controls, customer portal, account/workspace creation, customer/job/estimate creation, or automatic email/SMS was added.
- Founder-Led Demo Execution Support: built, verified, released, and health-checked so the demo packet, tracker state, manual-only boundaries, and live production/demo readiness can be checked before a walkthrough.
- Estimate Studio branding and PDF proposal header polish: built, pushed, and Fly-demo checked so the in-app proposal workbench and customer-facing PDF header now carry stronger company/customer/project identity without changing estimate math, package gates, send behavior, or field-user restrictions.
- Demo/pilot monitoring baseline: documented and verified with `github-actions` plus GitHub issues as the current demo/pilot monitoring path; production log drains, paid providers, production auth smoke, and production monitoring changes remain blocked without explicit production-safety approval.
- Latest full visual route sweep: passed locally on May 21, 2026 across admin desktop/phone/tablet plus foreman/employee phone/tablet with zero final failures.
- Daily Reports Support Handoff Phase 1: built, verified, released, and health-checked.
- Photo Evidence Support Handoff Phase 1: built, verified, released, and health-checked.
- Delivery Tickets Support Handoff Phase 1: built, verified, released, and health-checked.
- Pre-Pour Support Handoff Phase 1: built, verified, released, and health-checked.
- Post-Pour Support Handoff Phase 1: built, verified, released, and health-checked.
- Premium Finished SaaS Polish Phase 1: built, verified, released, and health-checked for Operations Command/app shell polish.
- Premium Finished SaaS Polish Phase 2: built, verified, released, and health-checked for Field Mode mobile polish.
- Premium Finished SaaS Polish Phase 3: built, verified, released, and health-checked for Estimate Studio polish.
- Premium Finished SaaS Polish Phase 4: built, verified, released, and health-checked for Apex Assistant shell and assistant entry-point polish.
- Safety / Incidents Support Handoff Phase 1: built, verified, released, and health-checked with field-safe incident scope preserved.
- Targeted Customers text wrapping polish: built, verified, released, and health-checked so long customer emails/service areas wrap cleanly without horizontal overflow.
- Targeted Tool Checklist text wrapping polish: built, verified, released, and health-checked so long checklist titles, notes, job labels, and foreman context wrap cleanly without horizontal overflow.
- Targeted Toolbox / PPE text wrapping polish: built, verified, released, and health-checked so long safety guidance and PPE descriptions wrap cleanly without horizontal overflow.
- Targeted Daily Reports text wrapping polish: built, verified, released, and health-checked so long field notes, weather, proof, concrete summaries, and report IDs wrap cleanly without horizontal overflow.
- Targeted Photo Evidence text wrapping polish: built, verified, released, and health-checked so long evidence labels, job/customer labels, and upload notes wrap cleanly without horizontal overflow.
- Targeted Delivery Tickets text wrapping polish: built, verified, released, and health-checked so long ticket, job, and customer labels wrap cleanly without horizontal overflow.
- Targeted Safety / Incidents text wrapping polish: built, verified, released, and health-checked so long incident and job labels wrap cleanly without horizontal overflow.
- Targeted Jobs text wrapping polish: built, verified, released, and health-checked so long job IDs, job names, and crew-count context wrap cleanly without horizontal overflow.
- Targeted Time Entries text wrapping polish: built, verified, released, and health-checked so long job/work labels wrap cleanly without horizontal overflow.
- Targeted Estimate Studio text wrapping polish: built, verified, released, and health-checked so long estimate, customer, lead, and job labels wrap cleanly without horizontal overflow.
- Targeted Pre/Post-Pour action header polish: built, verified, released, and health-checked so the shared checklist table action column no longer clips on desktop while mobile card layouts and field-safe views remain intact.
- Targeted Leads follow-up header polish: built, verified, released, and health-checked so the Leads command table `Follow-Up` header no longer clips on desktop while mobile cards and field-role redirects remain intact.
- Targeted Jobs progress header polish: built, verified, released, and health-checked so the Jobs command table `Progress` header no longer clips on desktop while mobile cards and field-role Field Mode behavior remain intact.
- Targeted Dashboard status badge clipping polish: built, verified, released, and health-checked so dense Dashboard cockpit status badges no longer shrink into clipped text while owner/admin desktop/mobile and field-role redirects remain intact.
- Targeted Schedule job card readability polish: built, verified, released, and health-checked so compact Schedule coordination cards keep job titles, location context, and status badges readable without broken word wrapping while mobile and field-role redirects remain intact.
- Targeted Communications mobile nav label polish: built, verified, released, and health-checked so the office mobile bottom nav shows `Comms` instead of clipping `Communications` while preserving the full accessible label and field-role redirects.
- Targeted tablet mobile nav label polish: built, verified, released, and health-checked so long office module labels use compact tablet/mobile bar text without clipping while preserving full accessible labels and field-safe routing.
- Targeted Settings account text wrapping polish: built, verified, released, and health-checked so the App Health/Settings account panel wraps long signed-in email text without horizontal clipping while field-role redirects remain intact.
- Targeted command KPI card height polish: built, verified, released, and health-checked so Leads, Jobs, Customers, Estimate Studio, and Settings KPI cards show their helper/action text without vertical clipping while field-role redirects remain intact.
- Targeted Dashboard today-work row fit polish: built, verified, released, and health-checked so the desktop Today Work Coordination rows fit inside the Dashboard card without hidden horizontal clipping while tablet/mobile and field-role redirects remain intact.
- Targeted Communication Center compact follow-up filter polish: built, verified, released, and health-checked so the owner/admin compact follow-up filter drawer stacks safely inside its card without clipping while the full queue layout, tablet/mobile, and field-role redirects remain intact.
- Targeted Employees priority action polish: built, verified, released, and health-checked so the owner/admin Employees Priority Moves rail uses a readable vertical action queue with unclipped helper copy while tablet/mobile and field-role redirects remain intact.
- Targeted Command Center metric helper polish: built, verified, released, and health-checked so the owner/admin Operations Command header metric helper copy wraps inside KPI cards instead of clipping on phone-width layouts while field-role redirects remain intact.
- Targeted Apex Assistant launcher overlap polish: built, verified, released, and health-checked so the collapsed assistant launcher no longer covers Toolbox/PPE right-rail action buttons while the assistant panel, safety field scope, and office-route redirects remain intact.
- Targeted Delivery Tickets assistant clearance polish: built, verified, released, and health-checked so the collapsed assistant launcher no longer touches the owner/admin Delivery Tickets right-rail action row while field-role delivery scope remains intact.
- Visual polish route audit tooling: built, verified, and pushed so the repo has a repeatable local Playwright sweep for desktop, tablet, mobile, console/network, overflow, assistant overlap, clipped content, and field-role exposure checks. The stable Chromium shortcut now runs desktop/phone coverage as bounded role/viewport slices. This was not deployed because it is local verification tooling only.
- Demo desktop screenshot audit hardening: built, verified, and pushed so field-mode demo headings match the current app and required screenshot capture failures no longer pass silently. This was not deployed because it is local verification tooling only.
- Demo desktop local audit shortcut: built so local 1440px demo walkthrough screenshots can be captured with `npm.cmd run audit:demo-desktop:local` instead of repeating the local base URL and viewport flags. This was not deployed because it is local verification tooling only.
- Visual polish field-role redirect hardening: built so direct-route field-role redirects do not fail the visual audit on benign top-level document `net::ERR_ABORTED` navigation aborts while real failed requests, console issues, overflow, clipped content, assistant overlap, and forbidden field-role text still fail the sweep. This was not deployed because it is local verification tooling only.
- Opportunity Scout hosted demo smoke hardening: built, verified, pushed, and Fly-demo checked. The repo now has guarded scripts for hosted Opportunity Scout acceptance, demo-only package toggling, smoke artifact cleanup, and a backup-first Fly demo orchestrator that wakes the demo app, backs up, temporarily sets Elite, runs acceptance, cleans smoke records, rolls back to Premium, and runs final hosted smoke.
- Hosted smoke latency budgets: built, verified, pushed, and Fly-demo checked. `smoke:hosted` now records `/api/ready`, login, and bootstrap durations and fails when configured budgets are exceeded so the previous auth/bootstrap latency regression is caught automatically.
- Manual pilot smoke runbook and ops docs sync: prepared and pushed. `docs/MANUAL_PILOT_SMOKE_TEST.md`, release/rollback, monitoring, and pilot readiness docs now reference the current hosted smoke, Fly demo Opportunity Scout orchestrator, demo package rollback, cleanup, and latency gates.
- Phase 1 monitoring hardening: built, verified, pushed, and Fly-demo checked. GitHub Actions now has a production readiness monitor, demo hosted smoke monitor, Node 24-native workflow actions, Docker `/api/ready` healthcheck alignment, an incident-notes log, and a monthly restore-drill cadence. Fly demo `v85` is healthy on `/api/ready`; production was not deployed.
- Local restore drill verifier: built, verified, pushed, and added to CI. `npm.cmd run verify:restore` now creates a temporary backup, boots Apex HQ from the restored SQLite copy on a throwaway local port, checks `/api/ready` and `/api/setup/status`, and cleans up temporary data.
- Targeted route sweep / visual QA refresh: completed with no blockers found. `npm.cmd run audit:visual-polish:full` passed against a local demo server, covering admin desktop/phone/tablet plus foreman/employee phone/tablet route behavior with console/network, overflow, clipping, assistant overlap, and field-role exposure checks.
- GitHub Actions demo smoke secret runbook: prepared, pushed, and CI-verified. `docs/apex-hq-github-actions-smoke-secrets.md` now defines how to configure, verify, rotate, and troubleshoot `APEX_SMOKE_PASSWORD` without storing secrets in repo/docs/chat. The repository secret is configured as of May 20, 2026, and scheduled demo auth smoke now runs instead of skipping.
- Monitoring upgrade plan: prepared and pushed. `docs/apex-hq-monitoring-upgrade-plan.md` now defines the approval-ready path for log drains, dedicated uptime monitoring, alert routing, provider requirements, Fly log commands, thresholds, and production-safety gates before scaling beyond founder-led pilots.
- Monitoring upgrade readiness helper: `npm.cmd run monitor:upgrade-readiness` validates the monitoring provider, environment, alert destination, retention, access owner, redaction posture, request-ID search, error/readiness alerts, demo-first rollout, and production approval posture before any log-drain or provider change. It does not create log drains, set secrets, configure providers, deploy, touch Fly, or send production logs anywhere.
- Launch gate status helper: `npm.cmd run launch:gate-status` and the manual `Apex HQ Launch Gate Status` GitHub Actions workflow combine the claims scan, production auth smoke readiness, monitoring upgrade readiness, and pilot rehearsal validation into one read-only GO/NO-GO view. They do not deploy, authenticate, create sessions, create users, set secrets, create Fly resources, configure providers, write customer data, or mutate production. Manual GitHub Actions dispatch `26147302014` passed on May 20, 2026 at commit `7c68b1f`; the default run reported guided demo readiness `GO`, customer pilot handoff `NO-GO` until a real company/workflow/success criteria are provided, production auth smoke `NO-GO`, monitoring upgrade `NO-GO`, and wider paid launch `NO-GO`.
- M2 Mini launch gate proof run: manual GitHub Actions dispatch `26148685278` passed on May 20, 2026 at commit `687d6c0` with the M2 Mini rehearsal context. It reported guided demo readiness `GO`, customer pilot handoff readiness `GO`, production monitoring upgrade readiness `GO`, production auth smoke readiness `NO-GO`, and wider paid launch readiness `NO-GO`. The run was read-only and did not deploy, authenticate, create sessions, set secrets, create users, touch Fly, or mutate production/customer data.
- Production auth smoke workflow: prepared, pushed, and CI-verified as a manual, fail-closed GitHub Actions workflow. `.github/workflows/production-auth-smoke.yml` requires the exact `PRODUCTION_AUTH_SMOKE_APPROVED` confirmation phrase, an approved production URL, and the production-only `APEX_PRODUCTION_SMOKE_PASSWORD` secret before running login/bootstrap smoke with `--allow-production-auth`. It does not schedule itself, deploy, mutate app data, toggle packages, run Opportunity Scout, create users, set secrets, change auth, or touch production config. CI run `26144408317` passed on `main` at commit `3f66bd2`; GitHub workflow listing shows `Apex HQ Production Auth Smoke` active/manual, and `APEX_PRODUCTION_SMOKE_PASSWORD` is not configured as of May 20, 2026.
- Production auth smoke fail-closed verification: manual dispatch `26144638565` on `main` at commit `9bc5eac` stopped at the approval gate because `APEX_PRODUCTION_SMOKE_PASSWORD` is not configured. Production health smoke and production auth smoke steps did not run, and no `Apex HQ production auth smoke failed` issue was opened.
- Production auth smoke readiness helper: `npm.cmd run verify:production-auth-smoke-readiness` checks the workflow guardrails and GitHub production smoke secret presence by name only, with optional read-only `/api/ready` confirmation via `-- --check-live`. It does not run login, create sessions, dispatch the workflow, write secrets, create users, deploy, touch Fly, or mutate production data.
- Production auth smoke approval-aware readiness: the readiness helper now stays fail-closed by default but can record completed external gates with `--smoke-users-approved`, `--production-safety-approved`, and `--dispatch-confirmation=PRODUCTION_AUTH_SMOKE_APPROVED`. Final production auth readiness still requires GitHub secret presence to be checked by name; `--skip-gh` cannot produce a green production auth gate.
- Production cold-start decision note and timing helper: prepared, pushed, and verified without changing production config. `docs/apex-hq-production-cold-start-decision.md` records the current `min_machines_running = 0` posture, read-only Fly status evidence, cold/warm `/api/ready` timing, and the gate for moving production or a pilot app to one always-on machine. `npm.cmd run monitor:readiness` performs read-only `/api/health` and `/api/ready` timing checks; the May 20, 2026 follow-up warm production check measured `/api/ready` at 31-43ms with Fly status started and 1 passing service check.
- Legal review prep checklist: prepared as non-legal founder/lawyer review scaffolding. `docs/apex-hq-legal-review-prep-checklist.md` organizes terms, privacy/data, public claims, testimonials/social proof, AI claims, billing/payment, support, and incident-review questions before wider paid launch. It does not approve legal language, public launch, billing, or production commitments.
- Public claims verification guardrail: `npm.cmd run verify:claims` scans curated public/source copy for unsupported positive claims around guaranteed results, AI autopilot, accounting/payroll replacement, enterprise/compliance readiness, public self-serve positioning, live billing, no-setup promises, and customer proof. It allows explicit "do not say" and boundary sections, and it does not replace formal legal review before wider publishing or paid launch.
- Customer pilot config verifier: built so customer-specific Fly pilot configs can be checked locally before app/volume creation or deploy. `npm run pilot:verify-config -- --config=<customer-fly.toml>` rejects production/demo app names, production/demo volumes, demo seeding, demo package settings, missing `/api/ready` checks, and unsafe data-dir settings without touching Fly or production. CI also scans committed `fly.customer*.toml` and `fly.pilot*.toml` files through `npm run verify:pilot-config`.
- Customer pilot config generator: built so `npm run pilot:create-config -- --slug=<customer-slug>` creates a verified customer-specific Fly config with safe app/volume naming, `SEED_DEMO_DATA=false`, no demo mode, no demo package, `/api/ready` checks, and no Fly side effects.
- Customer pilot setup plan helper: built so `npm run pilot:setup-plan -- --config=<customer-fly.toml> --company=<name> --owner=<owner>` validates a customer pilot config and prints the approval gate, Fly app/volume/deploy commands, skip-auth smoke, rollback commands, and stop conditions without creating Fly resources, setting secrets, creating users, deploying, authenticating, touching production, or mutating customer data. `verify:pilot-config` now includes this helper's tests.
- M2 Mini pilot setup artifacts: `docs/M2_MINI_PILOT_REHEARSAL_PLAN.md` and `fly.customer-m2-mini.toml` are committed and CI-verified. The config targets `apex-hq-m2-mini-pilot` with volume `apex_hq_m2_mini_pilot_data`, `SEED_DEMO_DATA=false`, no demo mode/package, `DATA_DIR=/app/data`, and `/api/ready` checks. It does not create the Fly app or volume and does not authorize customer handoff without explicit setup approval.
- Pilot rehearsal helper: built so `npm run pilot:rehearsal -- --company=<name> --workflow=<one workflow> --owner=<owner> --first-record=<record> --field-action=<action> --success=<criterion> --success=<criterion> --write` can generate a local Day 0/3/10 rehearsal packet without creating apps, users, records, Fly resources, outreach, or deployments.
- First-user pilot packet and fencing walkthrough preflight: built so `npm run pilot:first-user-packet` can generate a founder-review pilot packet, and `npm run pilot:fencing-preflight -- --run --json` can run the current Fly demo readiness, hosted route smoke, admin desktop walkthrough routes, admin tablet estimate/job/schedule routes, employee phone field/restricted routes, and role tests in one non-production pass. Latest local run passed on May 21, 2026 against `https://concrete-ops-demo.fly.dev`; production was not touched.
- Fencing pilot intake gate: built so `npm run pilot:fencing-intake -- --json` can fail closed before any outside login if company, owner/admin, field user, first record, field action, current tools, lost-info pain, support channel, backup confirmation, written pilot expectations, data-boundary acknowledgement, or success criteria are missing. It rejects risky promises and secret-like text, does not create users, send outreach, deploy, touch production, change packages, or mutate customer data, and is included in `npm run verify:pilot-readiness`.
- Customer pilot readiness preflight: built so `npm run verify:pilot-readiness` runs the local non-deploying pilot gate: docs drift, pilot config safety, pilot rehearsal helper tests, role gates, backup/export, restore drill, and frontend build.
- Latest customer pilot readiness preflight: `npm.cmd run verify:pilot-readiness` passed locally on May 21, 2026 after the Leads verifier reliability fix and latest fencing walkthrough evidence refresh. Backup verification produced `app-data-20260521-092512Z.sqlite` / `.json`; restore drill reused that backup set, booted the restored SQLite copy, and confirmed `/api/ready` ready/database ok.
- Latest autonomous pilot/demo evidence refresh: Fly demo `concrete-ops-demo` reached v130 with image `registry.fly.io/concrete-ops-demo:deployment-01KS4Z90RCA1G8RCBKSQQDEE2F` after a backup-first demo deploy. Hosted skip-auth smoke passed, `/api/ready` returned ready/database ok, `npm.cmd run verify:pilot-readiness` passed on May 21, 2026, and authenticated local hosted smoke remained blocked only because `APEX_SMOKE_PASSWORD` is not set in the local shell.
- Demo/pilot monitoring baseline validation: `npm.cmd run monitor:upgrade-readiness -- --provider=github-actions --environment=demo --alert-destination=github-issues --retention-days=30 --access-owner=John --redaction-confirmed --request-id-search --error-alerts --demo-first --json` returned `GO` for demo/pilot monitoring only. No provider setup, log drain, secret change, deploy, Fly change, or production log export was performed.
- Deployment docs readiness cleanup: `DEPLOYMENT.md` and `docs/apex-hq-release-rollback-checklist.md` now match the current Fly/Docker posture: production may auto-stop when idle, and both Docker health checks and Fly readiness checks target `/api/ready`.
- Demo hosted smoke timeout hardening: `.github/workflows/demo-hosted-smoke.yml` now has step-level timeouts for dependency install, non-auth smoke, auth smoke, failure issue reporting, and recovery issue closeout so a hosted smoke hang fails quickly inside the 10-minute job window.
- Demo hosted smoke timeout verification: manual GitHub Actions dispatch `26142669993` passed on `main` after the timeout update. The updated workflow completed in 37 seconds with non-auth smoke and auth/bootstrap smoke enabled.
- Demo hosted smoke current-head verification: manual GitHub Actions dispatch `26143505567` passed on `main` at commit `518212b` in 21 seconds with non-auth smoke and auth/bootstrap smoke enabled. Admin login/bootstrap were 352ms/127ms; employee login/bootstrap were 93ms/40ms; employee restricted-route checks ran.
- Launch readiness and customer pilot setup docs: reconciled and pushed. `docs/LAUNCH_READINESS.md` now reflects current guided-demo/controlled-pilot readiness, built ops gates, and remaining launch blockers; `CUSTOMER_PILOT_SETUP.md` now stays infrastructure-focused while linking to Day 0/3/10 pilot gates, manual smoke, rollback, restore, support, and monitoring boundaries.
- Manual pilot smoke duplicate cleanup: root `MANUAL_PILOT_SMOKE_TEST.md` now points to canonical `docs/MANUAL_PILOT_SMOKE_TEST.md`, and the pilot readiness checklist marks the stale-doc cleanup targets as completed.
- Master checklist cleanup: root `APEX_HQ_MASTER_CHECKLIST.md` now acts as a historical pointer to current source-of-truth runbooks instead of carrying stale pilot, demo-video, and credential details.
- Guided demo launch readiness cleanup: `docs/GUIDED_DEMO_LAUNCH_READINESS.md` now points to the current build tracker, manual pilot smoke, Day 0/3/10 pilot gates, release/rollback, restore, support, and monitoring runbooks instead of treating old Fly release evidence as the current state.
- Demo launch packet cleanup: `docs/DEMO_LAUNCH_PACKET.md` now requires current tracker and manual smoke confirmation before demos instead of declaring readiness from hard-coded historical Fly releases.
- Command binder cleanup: `docs/apex-hq-command-binder.md` now points future build/release work at this tracker, current smoke runbooks, and Fly/git verification instead of hard-coded old release and source-control commit references.
- Demo-ready checklist cleanup: `docs/DEMO_READY_CHECKLIST.md` now bases pass/fail state on current tracker, smoke, role, and visual evidence instead of old v486/v487 release notes.
- Demo password docs cleanup: root `README.md` and `DEMO.md` no longer store the old shared demo password; they point to the approved private secret path / `APEX_SMOKE_PASSWORD`.
- Docs drift guardrail: `npm run verify:docs` now scans root/demo docs and `docs/` for the old shared demo password, stale hard-coded readiness/release phrases, stale Fly always-running claims, and stale Docker `/api/health` healthcheck alignment wording; CI runs it with public intake and demo safety checks.
- Latest Fly demo smoke: `https://concrete-ops-demo.fly.dev/api/ready` returned ready/database ok, and GitHub Actions demo hosted smoke run `26143505567` passed on `main` at commit `518212b` with non-auth route smoke plus auth/bootstrap smoke. Admin login/bootstrap were 352ms/127ms; employee login/bootstrap were 93ms/40ms; employee restricted-route checks ran.
- Live demo smoke refresh: `https://concrete-ops-demo.fly.dev/api/ready` returned ready/database ok, and the latest scheduled/manual hosted smoke evidence confirms both skip-auth route checks and auth/bootstrap checks are passing against `https://concrete-ops-demo.fly.dev`.
- Latest local visual route sweep: `npm.cmd run build` and `npm.cmd run audit:visual-polish:full` passed with 0 failures after starting the local app on port 4000. Evidence manifests: `ui-audit/visual-polish/2026-05-20T05-26-22-661Z/manifest.json`, `ui-audit/visual-polish/2026-05-20T05-26-48-363Z/manifest.json`, `ui-audit/visual-polish/2026-05-20T05-27-14-127Z/manifest.json`, `ui-audit/visual-polish/2026-05-20T05-27-39-853Z/manifest.json`, and `ui-audit/visual-polish/2026-05-20T05-28-05-760Z/manifest.json`. Do not run desktop/phone and tablet sweeps in parallel against the same local demo session; a prior parallel run caused transient admin-tablet 401 console noise that cleared when tablet was rerun alone.
- Visual route sweep script cleanup: `npm run audit:visual-polish:full` now runs a Node wrapper that invokes `npm.cmd` on Windows and `npm` elsewhere, then runs the stable Chromium desktop/phone sweep and tablet sweep sequentially to avoid local demo-session collisions during full visual QA.
- Full visual route sweep wrapper verification: `npm.cmd run audit:visual-polish:full` passed end-to-end with 0 failures and no Node shell-argument warning after starting the local app on port 4000. Evidence manifests: `ui-audit/visual-polish/2026-05-19T21-34-57-365Z/manifest.json`, `ui-audit/visual-polish/2026-05-19T21-35-22-633Z/manifest.json`, `ui-audit/visual-polish/2026-05-19T21-35-47-976Z/manifest.json`, and `ui-audit/visual-polish/2026-05-19T21-36-13-322Z/manifest.json`.
- Full visual route sweep refresh: `npm.cmd run build`, `npm.cmd run verify:roles`, `npm.cmd run verify:demo`, and `npm.cmd run audit:visual-polish:full` passed with 0 visual failures across admin desktop, admin phone, employee phone, admin tablet, and employee tablet route coverage. Evidence manifests: `ui-audit/visual-polish/2026-05-19T23-41-54-079Z/manifest.json`, `ui-audit/visual-polish/2026-05-19T23-42-19-517Z/manifest.json`, `ui-audit/visual-polish/2026-05-19T23-42-45-192Z/manifest.json`, and `ui-audit/visual-polish/2026-05-19T23-43-10-645Z/manifest.json`.
- Focused demo walkthrough audit: `npm.cmd run build`, `npm.cmd run verify:roles`, `npm.cmd run smoke:hosted -- --base-url=https://concrete-ops-demo.fly.dev --skip-auth --json`, and local `npm.cmd run audit:demo-desktop:local -- --roles=admin,foreman,employee --viewports=1440x900` passed. The first local run exposed stale audit grammar expecting `Dashboard` for the admin landing page; the audit now accepts the current `Operations Command` heading. Evidence manifest: `ui-audit/demo-desktop/2026-05-20T01-46-48-460Z/manifest.json`.
- Full visual route sweep wrapper regression coverage: `scripts/visual-polish-full-audit.test.mjs` now verifies the sequential audit order and Windows `cmd.exe` / non-Windows `npm` invocation behavior, and it runs through `npm run verify:demo`.
- Visual route sweep field-leadership coverage: `npm.cmd run audit:visual-polish:chromium` now runs through a bounded Node sequencer and includes admin desktop, admin phone, foreman phone, and employee phone slices. The route audit logs in once per role/viewport, recycles browser sessions in small route batches, and retries retryable Playwright transport timeouts once without hiding real visual, console/network, overflow, clipping, assistant-overlap, or field-role exposure failures. `npm.cmd run audit:visual-polish:full` passed with 0 final failures across admin desktop/phone/tablet, foreman phone/tablet, and employee phone/tablet after starting the local app on port 4000. Evidence manifests: `ui-audit/visual-polish/2026-05-20T03-38-51-617Z/manifest.json`, `ui-audit/visual-polish/2026-05-20T03-39-18-253Z/manifest.json`, `ui-audit/visual-polish/2026-05-20T03-40-04-781Z/manifest.json`, `ui-audit/visual-polish/2026-05-20T03-40-31-150Z/manifest.json`, and `ui-audit/visual-polish/2026-05-20T03-40-56-924Z/manifest.json`.
- CI verification timeout hardening: `.github/workflows/ci.yml` now gives each broad verification step its own timeout so runner hangs in auth/signup, role/package, public/demo, server/backup/restore, or build checks fail quickly instead of consuming the full 30-minute job window. This was added after a docs-only push exposed a transient runner hang in the public/demo safety step; rerunning the same commit passed.
- CI timeout hardening verification: CI run `26141583462` passed on `main` at commit `4eb18a7` in about 2 minutes after the step-level timeout update. The scheduled demo hosted smoke run `26141558156` also passed with auth/bootstrap enabled.
- Auth security test cleanup hardening: CI run `26143547201` exposed an auth/signup timeout after `server/auth-security.test.js` completed assertions but did not exit. `server/auth-security.test.js` now stops spawned test servers with bounded SIGTERM/SIGKILL cleanup, and CI run `26143913352` passed on `main` at commit `80fe6d2`.
- Backup and restore drill refresh: `npm.cmd run verify:backup` and `npm.cmd run verify:restore` passed locally on May 20, 2026. The restore drill created SQLite and JSON backup artifacts, booted Apex HQ from the restored SQLite copy on a throwaway local port, confirmed `/api/ready` returned ready/database ok, confirmed setup status, and cleaned up temporary data.
- Readiness monitor refresh: direct checks to `https://app.apexhq.online/api/ready`, `https://concrete-ops-2.fly.dev/api/ready`, and `https://concrete-ops-demo.fly.dev/api/ready` returned ready/database ok on May 20, 2026. Manual GitHub Actions dispatch `26141723994` for `Apex HQ Readiness Monitor` passed on `main` in 9 seconds.
- Demo hosted smoke reporting: `.github/workflows/demo-hosted-smoke.yml` now writes a GitHub Actions step summary when auth smoke is skipped because `APEX_SMOKE_PASSWORD` is missing, and writes a success summary when auth/bootstrap smoke runs.
- Demo hosted smoke reporting verification: manual GitHub Actions dispatch `26127793170` passed on `main`; logs confirmed the non-auth hosted smoke ran and the auth smoke path reported `APEX_SMOKE_PASSWORD is not configured; skipping auth hosted smoke.`
- Demo hosted smoke summary helper: `scripts/hosted-smoke-summary.mjs` now converts hosted smoke JSON output into a GitHub Actions step-summary table for the non-auth route/health smoke, and regression coverage runs through `npm run verify:demo`.
- Demo hosted smoke summary helper verification: manual GitHub Actions dispatch `26128701406` passed on `main`; logs confirmed `scripts/hosted-smoke-summary.mjs` ran after the non-auth hosted smoke and auth smoke remained skipped because `APEX_SMOKE_PASSWORD` is not configured.
- Demo auth smoke summary alignment: the auth hosted smoke success branch now pipes JSON output through `scripts/hosted-smoke-summary.mjs` too, so auth/login/bootstrap/restricted-route checks get the same readable GitHub Actions summary table when `APEX_SMOKE_PASSWORD` is configured.
- Demo auth smoke summary alignment verification: manual GitHub Actions dispatch `26129110653` passed on `main`; logs confirmed the non-auth summary helper ran and the auth branch still skipped safely because `APEX_SMOKE_PASSWORD` is not configured.
- Demo hosted smoke issue reporting: `.github/workflows/demo-hosted-smoke.yml` now opens or updates a GitHub issue when scheduled/manual demo hosted smoke fails, includes immediate Fly/demo triage commands, and closes the issue after a recovered successful run. This changes workflow alerting only; no production config, app code, secrets, or deploy behavior changed.
- Demo hosted smoke issue reporting verification: manual GitHub Actions dispatch `26130655785` passed on `main`; logs confirmed the non-auth summary helper ran, auth smoke skipped safely without `APEX_SMOKE_PASSWORD`, and the recovered-issue close step ran without finding an open failure issue.
- Monitoring plan sync: `docs/apex-hq-monitoring-alerting-plan.md` now documents demo hosted smoke summary output plus the `Apex HQ demo hosted smoke failed` issue open/update/recovery behavior.
- Demo hosted smoke current-head verification: manual GitHub Actions dispatch `26133699849` passed on `main` at commit `93619f5`; logs confirmed non-auth health/route smoke ran against `https://concrete-ops-demo.fly.dev`, auth smoke skipped safely because `APEX_SMOKE_PASSWORD` is not configured, and recovered-issue close handling ran.
- Demo hosted auth smoke enabled verification: after configuring the GitHub `APEX_SMOKE_PASSWORD` secret, manual GitHub Actions dispatch `26140455523` passed on `main` at commit `74aa236`. The first configured-secret run exposed a stale secret with `401 invalid_credentials`; the secret was rotated from the approved demo seed source without printing the value, the rerun passed auth/bootstrap and employee restricted-route checks, and issue `#68 Apex HQ demo hosted smoke failed` closed automatically.
- GitHub Actions Node 24 compatibility cleanup: CI, readiness monitor, and demo hosted smoke now use Node 24-native GitHub actions (`actions/checkout@v5`, `actions/setup-node@v5`, `actions/github-script@v8`) without relying on `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24`.
- GitHub Actions Node 24 cleanup verification: CI run `26134555824`, readiness monitor dispatch `26134634807`, and demo hosted smoke dispatch `26134635511` passed on `main`; logs no longer show the prior Node.js 20 forced-runtime deprecation warning. A non-blocking `punycode` deprecation still appears from `actions/setup-node@v5`.
- Readiness monitor reporting: `.github/workflows/readiness-monitor.yml` now writes a GitHub Actions step summary table with endpoint, attempt, HTTP status, duration, and ready/error state for each production readiness check without changing endpoint targets, issue behavior, production config, or secrets.
- Readiness monitor reporting verification: manual GitHub Actions dispatch `26128221109` passed on `main`; logs confirmed both production readiness endpoints passed after the summary-writing workflow update.
- Readiness monitor current-head verification: scheduled GitHub Actions run `26133125331` passed on `main` at commit `93619f5`; logs confirmed both production readiness endpoints passed without opening a failure issue.

## Latest Released App State

Latest release tracked in this file:

- Commit: `d0801e3`
- Message: `Polish delivery assistant clearance`
- Fly release: `v534`
- Image: `registry.fly.io/concrete-ops-2:deployment-01KRX53FTHRP3B0W2FSZVWN08A`
- Health checks: `https://app.apexhq.online/api/ready` and `https://concrete-ops-2.fly.dev/api/ready` returned `200`, ready, database ok.

Latest source-control tooling state:

- Commit: `c7231a3`
- Message: `Update queue after visual route sweep`
- State: Opportunity Scout hosted demo smoke automation, demo-only package setter, smoke cleanup, Fly demo acceptance orchestrator, hosted smoke latency budgets, scheduled readiness monitoring, scheduled demo hosted smoke, demo hosted smoke step timeouts, Docker `/api/ready` healthcheck alignment, incident notes, monthly restore-drill cadence, local restore drill verification, latest visual route sweep evidence, demo smoke secret setup runbook, monitoring upgrade plan, launch readiness reconciliation, customer pilot setup gates, customer pilot config verification, canonical manual pilot smoke pointer, historical master-checklist pointer, guided demo readiness cleanup, demo launch packet cleanup, command binder cleanup, demo-ready checklist cleanup, demo password docs cleanup, docs drift guardrail, Estimate Studio/PDF branding evidence, v130 Fly demo evidence, current launch gate snapshot, demo/pilot monitoring baseline decision, and latest full visual route sweep evidence are tracked in source.
- Deployment: Estimate Studio/PDF branding changes were deployed to Fly demo only as `v130`; production was not touched. Workflow/docs-only commits were pushed without app deploy.
- Verification: `npm.cmd run build`, `npm.cmd run verify:roles`, `npm.cmd run verify:backup`, `npm.cmd run verify:restore`, `npm.cmd run verify:docs`, `npm.cmd run verify:pilot-config`, `npm.cmd run verify:pilot-readiness`, `npm.cmd run verify:demo`, `npm.cmd run verify:monitoring`, `node --test --test-concurrency=1 scripts/fly-demo-opportunity-scout-smoke.test.mjs`, `npm.cmd run smoke:opportunity-scout:fly-demo -- --json`, `npm.cmd run smoke:hosted -- --base-url=https://concrete-ops-demo.fly.dev --skip-auth --json`, `npm.cmd run audit:visual-polish:full`, `git diff --check`, `gh secret list --repo jberlanga748-a11y/concrete-ops-2`, manual GitHub Actions dispatch for `Apex HQ Demo Hosted Smoke`, manual GitHub Actions dispatch for `Apex HQ Readiness Monitor`, and GitHub Actions `CI` passed for the current monitoring/demo smoke lane. Fly demo reached `v130` with `/api/ready` healthy and service checks passing.

Known working tree note:

- Working tree was clean after runtime release `v534` before this source-of-truth docs sync.
- Post-release tooling commits `56a81f0`, `decdcc8`, `9e9eb92`, `ad0da7e`, `41622e2`, `2e90585`, `09f02c7`, `20e55e1`, and `c071cbe` added visual/demo/public audit coverage, canonical demo route handling, local demo audit shortcuts, and redirect-safe bounded visual audit handling; they do not change shipped app runtime behavior.
- Current demo smoke, monitoring, restore, pilot-doc, and CI hardening work added Opportunity Scout hosted demo smoke automation, demo package/cleanup safety scripts, Fly demo orchestration, latency budgets, pilot smoke runbooks, production readiness monitoring, scheduled demo hosted smoke, Docker readiness health checks, incident notes, restore-drill cadence, CI-covered local restore drill verification, demo smoke secret setup docs, monitoring upgrade planning, launch readiness reconciliation, customer pilot setup gates, production auth smoke design, production cold-start decision notes, customer pilot config verification/generation, local customer pilot readiness preflight, canonical manual smoke runbook cleanup, CI step-level timeout hardening, demo hosted smoke step-level timeout hardening, and stale-readiness docs drift guardrails. Production remains locked unless a separate backup-first production release is approved.
- Do not stage unrelated docs/skills during app releases unless the user explicitly asks.
- Use explicit file paths for staging.

Recent shipped phase stack:

| Commit | Release | Phase |
| --- | --- | --- |
| `4b4ada7` | `v471` | Company branding / proposal identity |
| `afe62f9` | `v472` | Estimate reference attachments and takeoff input foundation |
| `fd43d40` | `v473` | Foreman handoff packet split |
| `b6959b3` | `v474` | Operations Command UX Upgrade Phase 1 |
| `5b6426f` | `v475` | Command Center mobile KPI polish |
| `931938b` | `v476` | Communication Center Phase 1 |
| `e77e9ca` | `v477` | App Health / Audit Activity Phase 1 |
| `4cd5104` | `v478` | Watchtower / Missing Work Agent Phase 1 |
| `f15262d` | `v479` | Apex Assistant Shell Phase 1 |
| `a925b41` | `v480` | Customer Success / Guided Setup Phase 2 and Billing / Plans Readiness Prep |
| `d6153ae` | `v481` | Public SaaS Signup UX Phase 2 |
| `d5f064b` | `v482` | Package Upgrade / Locked State Polish |
| `cfc7323` | `v483` | Advanced Reporting Prep |
| `575be23` | `v484` | Enterprise Trust Prep |
| `7276412` | `v485` | Demo pilot data cleanup |
| `9cd3ac9` | `v486` | Remaining demo record cleanup |
| `cc6e59a` | `v487` | Assistant estimate draft commands |
| `925f157` | `v488` | Guided demo rehearsal record |
| `9a5872d` | `v489` | Assistant missing proof summary |
| `daedd6f` | `v490` | Mobile field demo date trust polish |
| `666a2a6` | `v491` | Field Ops Agent Phase 1 read-only assistant |
| `4648e70` | `v492` | Advanced Reporting Prep Phase 2 |
| `0da4e5e` | `v493` | Enterprise Trust Phase 2 |
| `f604949` | `v494` | Billing / Manual Upgrade Prep Phase 1 |
| `c1e66f0` | `v495` | Pilot readiness preview batch |
| `19d7fd2` | `v496` | Invite / Activation UX Polish |
| `8bc8f6e` | `v497` | Founder pilot funnel and demo readiness |
| `ab49234` | `v498` | Managed Setup and Time Tracking support handoffs |
| `c7ce11c` | `v499` | Daily Reports support handoff |
| `9d4ef4d` | `v500` | Photo Evidence support handoff |
| `0909491` | `v501` | Delivery Tickets support handoff |
| `bed845e` | `v502` | Pre-Pour support handoff |
| `464eb14` | `v503` | Post-Pour support handoff |
| `6e0746c` | `v504` | Premium Finished SaaS Polish Phase 1 |
| `5337465` | `v505` | Premium Finished SaaS Polish Phase 2 |
| `9cf753a` | `v506` | Premium Finished SaaS Polish Phase 3 |
| `8c4c9e4` | `v507` | Premium Finished SaaS final visual system sync |
| `b2395a1` | `v508` | Premium Finished SaaS Polish Phase 4 |
| `0494eb8` | `v509` | Safety / Incidents support handoff |
| `3c7a23f` | `v510` | Customers text wrapping polish |
| `7d10ce1` | `v511` | Tool Checklist text wrapping polish |
| `7773dc8` | `v512` | Toolbox / PPE text wrapping polish |
| `cc57505` | `v513` | Daily Reports text wrapping polish |
| `2f9699d` | `v514` | Photo Evidence text wrapping polish |
| `81f9558` | `v515` | Delivery Tickets text wrapping polish |
| `f0491d4` | `v516` | Safety / Incidents text wrapping polish |
| `b84a226` | `v517` | Jobs text wrapping polish |
| `dc8a90d` | `v518` | Time Entries text wrapping polish |
| `428cdb5` | `v519` | Estimate Studio text wrapping polish |
| `dc95b66` | `v520` | Pre/Post-Pour action header polish |
| `6b431d6` | `v521` | Leads follow-up header polish |
| `5b2383e` | `v522` | Jobs progress header polish |
| `fb22557` | `v523` | Dashboard status badge clipping polish |
| `6ebdcf1` | `v524` | Schedule job card readability polish |
| `117d040` | `v525` | Communications mobile nav label polish |
| `0d7817c` | `v526` | Tablet mobile nav label polish |
| `f527995` | `v527` | Settings account text wrapping polish |
| `649c8e6` | `v528` | Command KPI card height polish |
| `603e06b` | `v529` | Dashboard today-work row fit polish |
| `2b07176` | `v530` | Communication follow-up filter polish |
| `05a1031` | `v531` | Employees priority action polish |
| `5f31e01` | `v532` | Command metric helper polish |
| `ead5500` | `v533` | Assistant launcher overlap polish |
| `d0801e3` | `v534` | Delivery assistant clearance polish |

## Done / Do Not Rebuild

These systems exist and should not be rebuilt from scratch. Future work should extend, tighten, or polish them only when there is a clear workflow reason.

| System | Status | Notes |
| --- | --- | --- |
| Auth/login/logout/session basics | Done | Existing routes in `server/index.js`; session scoping exists. |
| Setup/bootstrap admin | Done | Preserve for private/empty installs. |
| Public signup/company creation | Done and verified | `/api/signup/company` creates company, first owner, default settings, and scoped session. Do not rebuild. |
| Public SaaS Signup UX Phase 2 | Done and released | Signup surface clarifies first-owner setup, safe role rollout, setup handoff, and password requirements without changing auth. |
| First owner onboarding foundation | Done | First owner gets onboarding state and support handoff. Extend later, do not restart. |
| User invite/activation/password reset | Built and verified | Token flow, expiry, single-use behavior, and company-scoped activation exist. Improve UX later only if needed. |
| Company/workspace foundations | Done | `companies`, `company_id`, company scoping helpers, company switching rules exist. Keep hardening route by route. |
| Demo vs real separation | Built and tested | Demo reset protections exist. Preserve. |
| Demo pilot data cleanup | Done and released | Known rough/test records are filtered from demo-visible lead/job/schedule paths. Do not restart demo cleanup unless browser QA finds new visible junk. |
| Role permissions | Built and tested | Field users remain blocked from office/admin/pricing. Never loosen. |
| Package entitlement foundation | Done and released | Basic/Premium/Elite feature map, backend checks, frontend nav gates started. |
| Package Upgrade / Locked State Polish | Done and released | Package-locked routes now explain manual upgrades and route owner/admin users to Plan Readiness without exposing field roles. |
| Advanced Reporting Prep | Done and released | Premium owner/admin report prep panel and pure summary helper exist. Field users and Basic package workspaces do not see the advanced reporting panel. |
| Advanced Reporting Prep Phase 2 | Built and released | Existing Premium owner/admin reporting panel now includes closeout readiness, owner review queue, delay/safety signals, and concrete yard reporting from current daily report data only. Field users and Basic package workspaces remain blocked. |
| Billing / Plans Readiness Prep | Done and released | Read-only Settings plan readiness, manual billing guardrails, feature labels, and field-safe bootstrap package redaction. |
| Billing / Manual Upgrade Prep Planning | Done and released | `docs/BILLING_MANUAL_UPGRADE_PREP.md` defined the support-led Basic/Premium/Elite upgrade path, no-Stripe boundaries, owner/admin visibility, and field-role restrictions. |
| Billing / Manual Upgrade Prep Phase 1 | Built and released | Owner/admin Plan Readiness and package-locked states now route to copy-only manual upgrade review context in Support. Foremen/employees remain blocked from billing, package management, pricing, Settings, estimates, AI Office, App Health, and office modules. No Stripe, checkout, invoices, payment collection, or self-serve plan changes were added. |
| Pilot Feedback Capture Phase 1 | Built and released | Owner/admin Support now includes a copy-only pilot feedback packet for founder-led demos and controlled pilots, capturing pain, objections, workflow fit, field/admin friction, next action, follow-up, proof permission, and private notes. Field users do not see the feedback workflow. No surveys, outreach, testimonials, customer data changes, or automation were added. |
| Customer Portal Phase 1 Manual Approval Preview | Built and released | Elite owner/admin Settings now includes an internal manual preview of customer-facing proposal/progress content using existing approved estimates, related jobs, proof counts, progress counts, and reviewed change order counts. Basic/Premium owners see only a locked manual-review explanation. Field users remain blocked from Settings and portal preview. No customer login, share links, self-serve approvals, public portal, payments, invoices, customer notifications, or customer data mutation were added. |
| Premium Demo Workspace Prep Phase 1 | Built and released | Demo package selection is config-controlled with Premium as the main demo profile, Basic as a lock-state fallback, and additive-only existing database behavior. `fly.demo.toml` now explicitly enables demo mode and Premium demo package config. |
| Pilot Terms / Support Policy and Customer Data Policy Drafts | Prepared | `docs/PILOT_TERMS_AND_SUPPORT_POLICY.md` and `docs/CUSTOMER_DATA_POLICY_DRAFT.md` now define founder-led pilot boundaries, support priorities, data handling expectations, demo/screenshot permission, AI/data claims, and legal-review gaps. These are business-risk drafts, not legal advice. |
| Founder-Led Demo Execution Runbook | Prepared | `docs/FOUNDER_LED_DEMO_EXECUTION_RUNBOOK.md` defines the pre-demo readiness check, 15/30-minute demo flow, after-demo logging, objection capture, pilot-offer criteria, daily execution loop, and build-trigger rules. No outreach was sent. |
| Demo Recap And Pilot Fit Templates | Prepared | `docs/DEMO_RECAP_AND_PILOT_FIT_TEMPLATES.md` defines internal demo recap, pilot-fit scoring, strong/medium/not-fit follow-ups, price-question response, objection-bank updates, and product-build trigger notes. No outreach was sent. |
| Pilot Kickoff And Check-In Templates | Prepared | `docs/PILOT_KICKOFF_AND_CHECKIN_TEMPLATES.md` defines kickoff intake, first workflow setup, day-1/day-2 checks, day-3 check-in, day-10 value review, support issue capture, referral/testimonial timing, and build-trigger rules for controlled 14-day pilots. No outreach was sent. |
| Customer Portal Planning Checkpoint | Prepared and released | `docs/CUSTOMER_PORTAL_PLANNING_CHECKPOINT.md` defines the no-build decision, Elite package boundary, owner/admin manual approval preview direction, field/customer/support restrictions, customer-visible content rules, auth/data/audit requirements, and a future implementation prompt. |
| Assistant Material Planning Prep | Prepared and released | `docs/ASSISTANT_MATERIAL_PLANNING_PREP.md` defines the reviewed material planning assistant boundary, Premium-and-up package policy, allowed source data, role restrictions, negative tests, and no-ordering/no-pricing/no-job-conversion rules. |
| Assistant Job Conversion Planning | Prepared and released | `docs/ASSISTANT_JOB_CONVERSION_PLANNING.md` defines the reviewed estimate-to-job assistant handoff boundary, Premium-and-up package policy, approved-estimate source rules, role restrictions, negative tests, and no-automatic-job-creation/scheduling/crew-assignment rules. |
| Public Website / Sales Funnel Phase 1 | Built and released | `/founder-pilot` provides claims-safe public Apex HQ positioning, founder-pilot workflow sections, manual walkthrough request copy, live manual review submission, and login handoff. It does not create accounts/workspaces, collect payments, expose package controls, add customer portal access, or send email/SMS automatically. |
| Public Website / Sales Funnel Phase 2 | Built and released | `POST /api/public/demo-interest` saves guided walkthrough interest as an owner/admin manual review lead in the Apex HQ default company only and adds one owner/admin office queue cue for first-time captures. Explicit consent, honeypot, rate limiting, duplicate retry handling, secret redaction, audit activity, and field-role denial tests are in place. Duplicate retries do not add another lead or queue item. It does not create customers, jobs, estimates, users, workspaces, package changes, billing, customer portal access, or automatic email/SMS. |
| Founder-Led Demo Execution Support | Built and released | `npm.cmd run verify:founder-demo` checks the demo execution docs, outreach tracker consistency, manual-only guardrails, live production/demo readiness endpoints, and the read-only founder demo brief generator before guided walkthroughs. `npm.cmd run brief:founder-demo` prints the manual action queue without sending outreach, mutating customer data, creating accounts, or deploying. |
| Invite / Activation UX Polish | Built and released | Owner/admin Employees now clarifies manual activation handoff, one-time invite links, expiry/reissue expectations, and field-safe role boundaries. Activation setup explains missing/expired/used invite links without changing token, session, password, role, or company-scope behavior. |
| Support / Help page | Done and released | Copy-only/manual support handoff exists. |
| Customer Success / Guided Setup Phase 2 | Done and released | First-owner guided setup path now groups profile, team, first work, and rollout readiness. |
| Managed Setup Support Handoff Phase 1 | Built and released | Owner/admin Settings Managed Setup can open Support with copy-only setup readiness context: status, progress, critical blockers, next action, and setup notes. Support only includes that managed setup context for office/admin-capable users, and field users remain blocked from Settings and setup data. No package changes, billing, payments, invoices, field permission widening, auto-send, or rollout automation were added. |
| Communication Center Phase 1 | Done and released | Manual-first owner/admin communication log exists. Extend only for workflow-specific communication needs. |
| Communications mobile nav label polish | Built and released | Owner/admin mobile Communication Center bottom nav now shows `Comms` in the compact bar so the active label does not clip; the button keeps `Communications` as its accessible label and field roles remain redirected to Field Mode. |
| Communication follow-up filter polish | Built and released | Communication Center compact follow-up filter drawer now stacks its search/type/status controls inside the owner/admin card instead of clipping on desktop. The full queue layout, tablet/mobile rendering, and field-role redirects were preserved. |
| Employees priority action polish | Built and released | Employees Priority Moves now uses a vertical action queue with wrapping helper copy so owner/admin users can read each access task without clipped text. Tablet/mobile rendering and field-role redirects were preserved. |
| Command metric helper polish | Built and released | Operations Command header metric helper text now wraps inside KPI cards instead of clipping on narrow cards, including phone-width owner/admin views. Field-role direct-route redirects were preserved. |
| Assistant launcher overlap polish | Built and released | The collapsed Apex Assistant launcher is now compact and Toolbox/PPE right-rail actions reserve a desktop gutter, so the launcher no longer covers Acknowledge/Edit/Report actions. Assistant open behavior, safety field scope, and office-route redirects were preserved. |
| Delivery assistant clearance polish | Built and released | Delivery Tickets selected-ticket right-rail actions now reserve a desktop assistant gutter so `Edit Ticket`, `New Ticket`, and `Archive` stay clear of the collapsed assistant launcher. Tablet/mobile delivery layouts and field-role delivery scope were preserved. |
| Tablet mobile nav label polish | Built and released | Owner/admin tablet/mobile bottom navigation now uses compact labels for Operations Command, Photo Evidence, Delivery Tickets, Imported Drafts, Change Orders, Toolbox Talks, and Tool Checklist in the primary bar while preserving full accessible labels and unchanged route behavior. |
| Settings account text wrapping polish | Built and released | App Health/Settings account panel now lets signed-in user email text wrap inside the card instead of clipping on narrow desktop account columns. Field roles remain redirected to Field Mode. |
| Command KPI card height polish | Built and released | Shared office command KPI cards now size to their real helper/action text for Leads, Jobs, Customers, Estimate Studio, and Settings, removing hidden bottom action copy while preserving compact grids and field-role redirects. |
| Dashboard today-work row fit polish | Built and released | Dashboard Today Work Coordination rows now use tighter desktop grid minimums so job, proof, and action columns fit inside the card without hidden horizontal clipping. Tablet/mobile layouts and field-role redirects were preserved. |
| Dashboard / Command Center foundation | Done/frozen | Only bug fixes, usability fixes, and planned command-center upgrades. |
| Premium Finished SaaS Polish Phase 1 | Built and released | Operations Command now matches the finished-visual direction more closely with the Operations Command label, dark premium top bar, owner/admin metric strip, tighter command cockpit/cards, responsive mobile rendering, and field-role denial preserved. No new billing, package controls, checkout, invoices, payment collection, support workflow, customer portal, automation, or permission widening was added. |
| Premium Finished SaaS Polish Phase 2 | Built and released | Field Mode mobile now aligns more closely with the finished visual: dark premium Field Mode header, dark/orange operator hero, compact required-item rows, tighter action tiles, and field-safe direct-route behavior preserved. Foremen/employees still do not see Operations Command, Settings, billing, pricing, package controls, or office-only upgrade surfaces. No backend records, checkout, billing, support handoff, automation, or permission widening was added. |
| Premium Finished SaaS Polish Phase 3 | Built and released | Estimate Studio now carries the finished-visual direction with the Estimate Studio label, dark premium header, selected-estimate total spotlight, tighter rail cards, darker tools drawer, denser mobile estimate cards, and field-role direct-route denial preserved. No estimate math, send behavior, pricing access, package gates, backend records, checkout, billing, support handoff, automation, or permission widening was added. |
| Premium Finished SaaS Polish Phase 4 | Built and released | Apex Assistant now carries the finished-visual direction with the Apex Assistant label, darker review-only assistant shell, denser prompt/action cards, sticky mobile input above bottom nav, and assistant route entry copy tightened around manual approval and field-role blocking. Existing review-first assistant behavior, route-only command handling, role gates, and package gates were preserved. No backend records, checkout, billing, support handoff, automation, sending, approving, pricing, scheduling, job conversion, crew assignment, or customer messaging was added. |
| Leads | Done/frozen | Do not redesign; only planned improvements or bugs. |
| Customers | Done/frozen | Do not redesign. |
| Customers text wrapping polish | Built and released | Long customer emails, service areas, and notes now wrap inside the fixed command table instead of clipping narrow desktop cells; mobile customer cards and role gates were preserved. |
| Estimates / AI Rough Notes foundation | Built | Rough notes assistant and draft flow exist. Do not rebuild. |
| Company branding / proposal identity | Built and released | Company/proposal identity exists for estimates and packets. Extend only for bugs or specific packet needs. |
| Estimate options / attachments / takeoff inputs | Built and released | Multiple options, reference attachments, and takeoff input foundations exist. Automated takeoff remains deferred. |
| GC packet / foreman handoff packet split | Built and released | GC/customer-facing packet and foreman field handoff packet are separated. |
| Jobs / crew assignments | Done/frozen | Extend only for planned workflows. |
| Today Work / Schedule coordination | Built and released | Practical coordination board exists. |
| Schedule job card readability polish | Built and released | Compact Schedule coordination cards now keep job titles, customer/location context, and status badges readable without broken word wrapping on desktop; mobile and field-role redirects were preserved. |
| Notifications / reminders foundation | Built and released | Operational reminders exist. |
| Time Tracking Support Handoff Phase 1 | Built and released | Time Tracking can open Support with a role-scoped copy-only time support request. Owner/admin context summarizes all visible company time; foreman context summarizes assigned crew time; employee context stays limited to own visible time. The packet excludes payroll rates, gross pay, pricing, margin, and hidden users. No payroll, accounting, billing, automatic messages, clock automation, or permission widening was added. |
| Daily Reports Support Handoff Phase 1 | Built and released | Daily Reports can open Support with a role-scoped copy-only report support request. Owner/admin context summarizes all visible company reports; foreman context stays limited to assigned field-visible reports; employees remain blocked from Daily Reports and are redirected to field-safe Jobs. The packet excludes payroll rates, gross pay, pricing, margin values, internal cost fields, hidden users, unrelated jobs, automatic messages, and customer data mutation. |
| Daily Reports text wrapping polish | Built and released | Long field notes, weather, proof summaries, concrete summaries, and report IDs now wrap inside fixed command-table cells instead of clipping; mobile report cards and role gates were preserved. |
| Daily reports | Tightened | Preserve workflow; extend only with scoped role-safe fixes. |
| Photo Evidence Support Handoff Phase 1 | Built and released | Photo Evidence can open Support with a copy-only support request for owner/admin users with Support access. The packet summarizes visible upload counts, selected evidence label, GPS status, filter state, and caption/GPS review gaps without exposing file contents, storage paths, content URLs, GPS coordinates, pricing, margin values, payroll, hidden users, unrelated jobs, automatic messages, or customer data mutation. Field upload routes remain scoped to assigned jobs and do not gain new Support access when the role does not already have it. |
| Photo Evidence text wrapping polish | Built and released | Long evidence labels, job/customer labels, and upload notes now wrap inside fixed command-table cells instead of clipping; mobile upload cards and role gates were preserved. |
| Uploads/photo evidence | Tightened | Preserve workflow; extend only with scoped role-safe fixes. |
| Delivery Tickets Support Handoff Phase 1 | Built and released | Delivery Tickets can open Support with a copy-only support request when the current role/package already has Support access. The packet summarizes visible ticket counts, selected ticket label, supplier/time references, linked photo/report status, filter state, yardage totals, and missing basics/photo/report review gaps without exposing linked upload file contents, storage paths, content URLs, GPS coordinates, pricing, margin values, payroll, hidden users, unrelated jobs, automatic messages, or customer data mutation. Field ticket routes remain scoped to assigned/visible jobs and do not gain new Support access when the role/package does not already have it. |
| Delivery Tickets text wrapping polish | Built and released | Long ticket, job, and customer labels now wrap inside fixed command-table cells instead of clipping; mobile ticket cards and role gates were preserved. |
| Delivery tickets | Tightened | Preserve workflow; extend only with scoped role-safe fixes. |
| Pre-Pour Support Handoff Phase 1 | Built and released | Pre-Pour can open Support with a copy-only support request when the current role/package already has Support access. The packet summarizes visible checklist counts, selected checklist status, owner/date references, item readiness counts, filter state, and completed/open/reopened review gaps without exposing estimate pricing, margins, payroll, internal job notes, hidden users, unrelated jobs, GPS coordinates, customer notifications, automatic messages, or customer data mutation. Field Pre-Pour rows remain scoped to assigned/visible jobs, and Support access is not created where the role/package does not already have it. |
| Post-Pour Support Handoff Phase 1 | Built and released | Post-Pour can open Support with a copy-only support request when the current role/package already has Support access. The packet summarizes visible checklist counts, selected checklist status, owner/date references, closeout item counts, filter state, and completed/open/reopened closeout review gaps without exposing estimate pricing, margins, payroll, internal job notes, hidden users, unrelated jobs, GPS coordinates, customer notifications, automatic messages, or customer data mutation. Field Post-Pour rows remain scoped to assigned/visible jobs, and Support access is not created where the role/package does not already have it. |
| Safety / Incidents Support Handoff Phase 1 | Built and released | Safety / Incidents can open Support with a copy-only support request when the current role/package already has Support access. The packet summarizes visible incident counts, selected incident context, current filters, high/open/reviewed/resolved counts, missing immediate-action status, and manual review queue without exposing pricing, margins, payroll, office-only job notes, hidden users, unrelated jobs, customer notifications, automation, billing, checkout, invoices, or package controls. Field incident rows remain scoped to assigned/submitted visible incidents. |
| Safety / Incidents text wrapping polish | Built and released | Long incident and job labels now wrap inside fixed command-table cells instead of clipping; mobile incident cards, field-safe safety scope, and role gates were preserved. |
| Pre-pour/post-pour | Tightened | Preserve workflow; extend only with scoped role-safe fixes. |
| Safety/incidents/PPE/toolbox/tool checklist | Tightened | Preserve workflow. |
| Toolbox / PPE text wrapping polish | Built and released | Long toolbox talk guidance and PPE descriptions now wrap inside fixed command cells instead of clipping; mobile card layouts, field-safe safety scope, and role gates were preserved. |
| Tool Checklist text wrapping polish | Built and released | Long checklist labels, notes, job/foreman context, and table supporting copy now wrap inside fixed command cells instead of clipping; mobile layout and role gates were preserved. |
| App health / owner health foundations | Built | Includes audit activity review panel. Expand later into trust/observability only with a scoped phase. |
| Enterprise Trust Prep | Built and released | Owner/admin trust readiness panel summarizes audit activity, owner export, Owner Health, support handoff, and release safety without adding compliance claims or new backend systems. |
| Enterprise Trust Phase 2 | Built and released | Owner/admin trust readiness now includes a copy-only pilot trust review packet, next trust actions, and explicit claims guardrails using existing audit/export/health/support data only. Field users remain blocked. |
| Guided Demo Launch Readiness | Rehearsed and refreshed | Live v496 owner/admin and field browser rehearsal passed with no P0/P1 blockers, no console/API failures, no horizontal overflow, and role-safe field routes. Separate demo app `concrete-ops-demo` was refreshed to Fly `v71` so documented demo users authenticate again. |
| Watchtower / Missing Work Agent Phase 1 | Built and released | Read-only Command Center missing-work queue exists. Do not turn it into autopilot without explicit Assistant phase controls. |
| Apex Assistant Shell Phase 1 | Built and released | Persistent review-only shell routes office users to existing workflows. Do not add autonomous writes without explicit Assistant command expansion phase controls. |
| Assistant Command Expansion Phase 2 Scope Lock | Prepared | `docs/ASSISTANT_COMMAND_EXPANSION_SCOPE.md` defines allowed/later/never commands, role/package gates, first slice, and builder prompt. |
| Assistant Command Expansion Phase 2A | Built and released | Lead/customer/rough-notes commands now hand off to clean reviewed estimate draft mode while preserving role/package gates and blocking unsafe automation. |
| Assistant Missing Proof Summary | Built and released | Apex Assistant now summarizes read-only missing proof for visible office jobs and routes users to existing reports, uploads, ticket, checklist, safety, and tool workflows. |
| Mobile Field Trust Polish | Built and released | Demo field job dates now freshen for demo users so mobile foreman/employee views feel current without mutating real company data. |
| Field Ops Agent Planning Checkpoint | Prepared | `docs/FIELD_OPS_AGENT_PLANNING_CHECKPOINT.md` defines read-only phase 1 scope, GPS/location consent boundaries, role visibility, package policy, QA plan, and a builder prompt. Implementation requires approval. |
| Field Ops Agent Phase 1 read-only summary | Built and released | Premium owner/admin users see company-wide read-only field accountability; Premium/Elite foremen/employees see assigned-scope reminders only. No hidden GPS tracking, no automatic messages, no payroll, discipline, or autonomous actions. |
| Opportunity Scout foundation | Built and package-gated | Elite-only Lead Finder surfaces should stay gated. |
| Operations Command UX Upgrade Phase 1 | Built and released | Operations strip, operating plan, field execution, review/approve, billing readiness, and mobile KPI polish exist. |
| Jobs text wrapping polish | Built and released | Long job IDs, job names, and assigned/needed crew counts now wrap inside fixed command-table cells instead of clipping; mobile job cards and field-role Field Mode behavior were preserved. |
| Time Entries text wrapping polish | Built and released | Long job/work labels now wrap inside fixed Time command-table work cells instead of clipping; mobile time cards and field-role My Time behavior were preserved. |
| Estimate Studio text wrapping polish | Built and released | Long estimate titles, customer names, lead labels, and converted job IDs now wrap inside fixed Estimate Studio command-table cells instead of clipping; mobile estimate cards and field-role estimate denial were preserved. |

## Recently Verified

Recent focused verification:

- `npm.cmd run verify:signup`: passed 36/36.
- `npm.cmd run verify:auth`: passed 24/24.
- `npm.cmd run verify:packages`: passed 12/12.
- `npm.cmd run verify:entitlements`: passed 33/33.
- `npm.cmd run verify:roles`: passed 10/10.
- Public SaaS Signup UX release checks: `npm.cmd run verify:signup`, `npm.cmd run verify:users`, `npm.cmd run verify:roles`, `npm.cmd run build`, browser desktop/mobile signup QA, and `git diff --check` passed; release `v481` health-checked ready.
- Package Upgrade / Locked State Polish checks: `npm.cmd run verify:packages`, `npm.cmd run verify:entitlements`, `npm.cmd run verify:roles`, `npm.cmd run build`, browser owner desktop/mobile package lock QA, field role safety check, and `git diff --check` passed; release `v482` health-checked ready.
- Advanced Reporting Prep checks: `npm.cmd run verify:packages`, `npm.cmd run verify:daily-reports`, `npm.cmd run verify:entitlements`, `npm.cmd run verify:roles`, `npm.cmd run verify:jobs`, `npm.cmd run verify:uploads`, `npm.cmd run build`, browser owner desktop/mobile reporting prep QA, field role safety check, and `git diff --check` passed; release `v483` health-checked ready.
- Enterprise Trust Prep checks: `npm.cmd run build`, focused trust/roles verification, release `v484`, and live health checks passed.
- Demo pilot data cleanup checks: `npm.cmd run verify:demo`, `npm.cmd run verify:roles`, `npm.cmd run build`, and `git diff --check` passed; releases `v485` and `v486` health-checked ready.
- Live v486 demo confirmation: Playwright checked `https://app.apexhq.online` as demo ops across Command Center, Leads, Jobs, and Schedule. No known junk/test terms were visible, no horizontal overflow was detected, and no console/API failures were observed. Screenshot evidence was saved under `C:\Users\jberl\AppData\Local\Temp\apex-v486-demo-confirm-1779024520548`.
- Customer Success / Guided Setup and Plans Readiness checks: `npm.cmd run verify:users`, `npm.cmd run verify:packages`, `npm.cmd run verify:entitlements`, `npm.cmd run verify:roles`, `npm.cmd run build`, and `git diff --check` passed; release `v480` health-checked ready.
- `npm.cmd run build`: passed before latest release.
- Latest Command Center checks: `npm.cmd run verify:jobs`, `npm.cmd run verify:roles`, `npm.cmd run build`, browser owner/admin mobile/desktop QA, and field role safety QA passed.
- Communication Center release checks: `npm.cmd run build`, `npm.cmd run verify:customers`, `npm.cmd run verify:leads`, `npm.cmd run verify:jobs`, `npm.cmd run verify:roles`, and `git diff --check` passed.
- App Health / Audit Activity release checks: `npm.cmd run verify:server`, `npm.cmd run verify:roles`, `node --test src\owner-health-utils.test.js`, `npm.cmd run build`, and `git diff --check` passed.
- Watchtower / Missing Work Agent release checks: `npm.cmd run verify:jobs`, `npm.cmd run verify:daily-reports`, `npm.cmd run verify:uploads`, `npm.cmd run verify:delivery-tickets`, `npm.cmd run verify:roles`, `npm.cmd run build`, and `git diff --check` passed; release `v478` health-checked ready.
- Apex Assistant Shell release checks: `npm.cmd run build`, `npm.cmd run verify:jobs`, `npm.cmd run verify:roles`, browser owner desktop/mobile sanity QA, field role safety check, and `git diff --check` passed; release `v479` health-checked ready.
- Assistant Command Expansion Phase 2A checks: `npm.cmd run build`, `npm.cmd run verify:estimates`, `npm.cmd run verify:jobs`, `npm.cmd run verify:roles`, `npm.cmd run verify:packages`, and `git diff --check` passed. Local browser check confirmed the Basic demo workspace safely blocks Premium AI Rough Notes assistant commands without console/API failures. Released as Fly `v487`; both live ready endpoints returned `200`, ready, database ok.
- Guided Demo Launch Readiness rehearsal: live browser QA checked owner/admin desktop Command Center, Schedule, Leads, Estimates, Jobs, Support; owner mobile Command Center; foreman mobile Dashboard, Jobs, Reports, Uploads, direct Estimates denial; employee mobile Dashboard, direct Command Center denial, and direct Estimates denial. Assistant shell opened and showed a safe Premium AI Rough Notes gate in the current Basic demo workspace. No P0/P1 blockers, no console/API failures, no horizontal overflow. Screenshot/report evidence: `C:\Users\jberl\AppData\Local\Temp\apex-guided-demo-rehearsal-1779028554230` and assistant screenshot `C:\Users\jberl\AppData\Local\Temp\apex-assistant-live-check-1779028718708.png`. `npm.cmd run verify:demo`, `npm.cmd run verify:roles`, and `git diff --check` passed.
- Assistant Missing Proof Summary checks: `npm.cmd run build`, `npm.cmd run verify:jobs`, `npm.cmd run verify:daily-reports`, `npm.cmd run verify:uploads`, `npm.cmd run verify:delivery-tickets`, `npm.cmd run verify:roles`, and `git diff --check` passed. Browser sanity check confirmed owner/admin assistant missing-proof summary renders, action buttons route to existing workflows, no console/API failures, and no mobile horizontal overflow. Screenshot evidence: `C:\Users\jberl\AppData\Local\Temp\apex-missing-proof-assistant-1779029399936`. Released as Fly `v489`; both live ready endpoints returned `200`, ready, database ok.
- Mobile Field Trust Polish checks: `npm.cmd run verify:demo`, `npm.cmd run verify:roles`, `npm.cmd run verify:jobs`, `npm.cmd run verify:daily-reports`, `npm.cmd run verify:uploads`, `npm.cmd run verify:delivery-tickets`, `npm.cmd run verify:safety`, `npm.cmd run verify:tool-checklist`, `npm.cmd run verify:time`, `npm.cmd run build`, and `git diff --check` passed. Local and live mobile browser checks confirmed foreman field jobs show May 17 instead of stale April dates, no horizontal overflow, and no console/API failures. Screenshot evidence: `C:\Users\jberl\AppData\Local\Temp\apex-v490-live-field-date-1779030359039`. Released as Fly `v490`; both live ready endpoints returned `200`, ready, database ok.
- Field Ops Agent Phase 1 checks: `npm.cmd run verify:packages`, `npm.cmd run verify:entitlements`, `npm.cmd run verify:jobs`, `npm.cmd run verify:roles`, `npm.cmd run verify:time`, `npm.cmd run verify:daily-reports`, `npm.cmd run verify:uploads`, `npm.cmd run verify:delivery-tickets`, `npm.cmd run verify:safety`, `npm.cmd run verify:tool-checklist`, `npm.cmd run build`, focused browser owner/foreman desktop/mobile QA, and `git diff --check` passed. Browser screenshot evidence: `C:\Users\jberl\AppData\Local\Temp\apex-field-ops-shots-r3tygX`. Released as Fly `v491`; both live ready endpoints returned `200`, ready, database ok.
- Advanced Reporting Prep Phase 2 checks: `npm.cmd run verify:daily-reports`, `npm.cmd run verify:packages`, `npm.cmd run verify:entitlements`, `npm.cmd run verify:roles`, `npm.cmd run verify:jobs`, `npm.cmd run verify:uploads`, `npm.cmd run build`, and `git diff --check` passed. Released as Fly `v492`; both live ready endpoints returned `200`, ready, database ok. Deploy emitted a transient listening-address warning, but Fly status showed the machine started with `1 passing` check.
- Enterprise Trust Phase 2 checks: `npm.cmd run verify:server`, `npm.cmd run verify:roles`, `npm.cmd run verify:users`, `npm.cmd run verify:exports`, `npm.cmd run build`, and `git diff --check` passed. Released as Fly `v493`; both live ready endpoints returned `200`, ready, database ok. The first local `verify:roles` run reported a shared permissions test-process failure without an assertion; rerunning `verify:roles` and `node --test --test-concurrency=1 shared\permissions.test.js` passed. Focused owner browser QA was not completed because the current local demo package gates App Health off.
- Billing / Manual Upgrade Prep Phase 1 checks: `npm.cmd run verify:packages`, `npm.cmd run verify:entitlements`, `npm.cmd run verify:roles`, `npm.cmd run build`, and `git diff --check` passed. Released as Fly `v494`; both live ready endpoints returned `200`, ready, database ok. Deploy emitted a listening-address warning, but Fly status showed the machine started with `1 passing` check.
- Pilot Feedback Capture Phase 1 local checks: `node --test --test-concurrency=1 src\support-utils.test.js shared\permissions.test.js`, `npm.cmd run verify:packages`, `npm.cmd run verify:entitlements`, `npm.cmd run verify:roles`, `npm.cmd run build`, and `git diff --check` passed. Not released.
- Customer Portal Phase 1 Manual Approval Preview local checks: `node --test --test-concurrency=1 src\customer-portal-preview-utils.test.js shared\packageEntitlements.test.js shared\permissions.test.js`, `node --test --test-concurrency=1 server\package-entitlements.test.js`, `npm.cmd run verify:packages`, `npm.cmd run verify:entitlements`, `npm.cmd run verify:roles`, `npm.cmd run build`, and `git diff --check` passed. The first `verify:packages` attempt exited with a Windows test-process crash and no assertion output; rerun passed 12/12. Not released.
- Pilot readiness preview batch release checks: `npm.cmd run verify:demo`, focused support/customer-portal/permissions/package tests, `npm.cmd run verify:packages`, `npm.cmd run verify:entitlements`, `npm.cmd run verify:roles`, `npm.cmd run build`, and `git diff --check` passed. Released as Fly `v495`; both live ready endpoints returned `200`, ready, database ok. Deploy emitted the usual listening-address warning, but Fly status showed the machine started with `1 passing` check.
- Invite / Activation UX Polish release checks: `npm.cmd run verify:users`, `npm.cmd run verify:auth`, `npm.cmd run verify:roles`, `npm.cmd run build`, and `git diff --check` passed. Released as Fly `v496`; both live ready endpoints returned `200`, ready, database ok. Deploy emitted the usual listening-address warning, but Fly status showed the machine started with `1 passing` check.
- Guided Demo Rehearsal Refresh after v496: live browser QA checked admin desktop dashboard/leads/jobs/reports/uploads/settings, admin mobile support and command center sanity paths, foreman mobile dashboard/jobs/reports/uploads plus direct office-route denial, employee mobile dashboard/jobs/uploads plus direct office-route denial, and public invite activation missing-token copy. `npm.cmd run verify:roles`, `npm.cmd run verify:demo`, and `git diff --check` passed. Evidence: `C:\Users\jberl\AppData\Local\Temp\apex-guided-demo-v496-live-desktop\2026-05-17T22-46-05-531Z\manifest.json` and `C:\Users\jberl\AppData\Local\Temp\apex-guided-demo-v496-live-focused\2026-05-17T22-47-30-393Z\focused-results.json`.
- Separate demo app credential repair: `concrete-ops-demo` was released to Fly `v71` with image `registry.fly.io/concrete-ops-demo:deployment-01KRW2EYBXXKG9S72PM3SVH1XN`. `DEMO_MODE=true`, `SEED_DEMO_DATA=true`, and `DEMO_PACKAGE_ID=premium` were confirmed. `/api/ready` returned ready/database ok, and `demo.ops@apexhq.app`, `demo.admin@apexhq.app`, `demo.foreman@apexhq.app`, and `demo.employee@apexhq.app` authenticated with the documented demo password.
- Public Website / Sales Funnel Phase 1 local checks: `node --test --test-concurrency=1 src\public-website-utils.test.js`, `npm.cmd run verify:public-request`, `npm.cmd run verify:packages`, `npm.cmd run verify:entitlements`, `npm.cmd run verify:roles`, `npm.cmd run build`, `npm.cmd run audit:public-site`, and `git diff --check` passed. Browser QA checked `/founder-pilot` desktop and mobile with no horizontal overflow, no console errors, no failed network requests, no forbidden public claims, a working login handoff, and manual-only prepared walkthrough request copy. Screenshot evidence: `C:\Users\jberl\Documents\Codex\concrete-ops-2-clean\ui-audit\public-site\2026-05-17T23-37-24-005Z\founder-pilot-1440x1000.png` and `C:\Users\jberl\Documents\Codex\concrete-ops-2-clean\ui-audit\public-site\2026-05-17T23-37-24-005Z\founder-pilot-390x844.png`.
- Founder-Led Demo Execution Support local checks: `npm.cmd run verify:founder-demo` and `git diff --check` passed. The readiness gate confirmed required demo/pilot/trust docs, outreach tracker consistency, manual-only boundaries, and live production/demo `/api/ready` database checks.
- Public Website / Sales Funnel Phase 2 focused local checks: `node --test --test-concurrency=1 server\public-demo-interest.test.js src\public-website-utils.test.js` and syntax checks for `server\index.js`, `src\api.js`, and `scripts\public-site-ui-audit.mjs` passed. Superseded by the full `v497` release checks below.
- Founder pilot funnel and demo readiness release checks: `npm.cmd run verify:public-request`, `node --test --test-concurrency=1 src\public-website-utils.test.js`, `npm.cmd run verify:founder-demo`, `npm.cmd run verify:roles`, `npm.cmd run verify:packages`, `npm.cmd run verify:entitlements`, `npm.cmd run verify:server`, `npm.cmd run verify:backup`, `npm.cmd run verify:auth`, `npm.cmd run verify:demo`, `npm.cmd run verify:users`, `npm.cmd run build`, `npm.cmd run audit:public-site -- --base-url=http://localhost:4027/`, and `git diff --check` passed. Local public-site audit evidence: `C:\Users\jberl\Documents\Codex\concrete-ops-2-clean\ui-audit\public-site\2026-05-18T00-12-24-146Z\public-site-audit.json`. Released as Fly `v497`; both live ready endpoints returned `200`, ready, database ok. Live non-mutating browser QA confirmed `/founder-pilot` desktop/mobile H1, manual copy, submit button, no horizontal overflow, no console errors, and no failed requests.
- Managed Setup Support Handoff Phase 1 local checks: `node --test --test-concurrency=1 shared\managedCompanySetup.test.js src\support-utils.test.js`, `npm.cmd run verify:users`, `npm.cmd run verify:roles`, `npm.cmd run build`, local Playwright/MS Edge Settings-to-Support sanity check, and `git diff --check` passed. The first `npm.cmd run verify:users` attempt exited non-zero without useful runner output; running the exact test file list passed 52/52, and rerunning `npm.cmd run verify:users` passed 52/52. The bundled Playwright Chromium failed to launch on Windows, so the browser sanity check used the installed MS Edge channel.
- Time Tracking Support Handoff Phase 1 local checks: `node --test --test-concurrency=1 src\time-utils.test.js src\support-utils.test.js`, `npm.cmd run verify:time`, `npm.cmd run verify:roles`, `npm.cmd run build`, local Playwright/MS Edge Time-to-Support sanity check, and `git diff --check` passed. The support preview was verified to carry `Workflow: Time tracking` and role-scoped time summary without `payRate` or `grossPay`.
- Managed Setup and Time Tracking support handoffs release checks: `npm.cmd run verify:users`, `npm.cmd run verify:time`, `npm.cmd run verify:roles`, `node --test --test-concurrency=1 server\role-permissions.test.js`, `npm.cmd run verify:server`, `npm.cmd run verify:backup`, `npm.cmd run build`, and `git diff --check` passed. The first `verify:roles` attempt reported a no-detail `server\role-permissions.test.js` process failure; rerunning `verify:roles` and the exact server role test passed. Released as Fly `v498` with image `registry.fly.io/concrete-ops-2:deployment-01KRW8VRRQ350WRM2ZR5NZ2DE2`; Fly status showed machine `148e06e2b53d68` started with `1 passing` check, and both live ready endpoints returned `200`, ready, database ok.
- Daily Reports Support Handoff Phase 1 release checks: `node --test --test-concurrency=1 src\report-utils.test.js src\support-utils.test.js`, `npm.cmd run verify:daily-reports`, `npm.cmd run verify:roles`, `npm.cmd run build`, Playwright/MS Edge browser QA for owner/admin Reports-to-Support, employee `/reports` redirect with no Report Support control, and foreman mobile assigned-scope Reports-to-Support, plus `git diff --check` passed. Released as Fly `v499` with image `registry.fly.io/concrete-ops-2:deployment-01KRW9JPWX9Z7VSATAT2M7DHXS`; Fly status showed machine `148e06e2b53d68` started with `1 passing` check, and both live ready endpoints returned `200`, ready, database ok.
- Photo Evidence Support Handoff Phase 1 release checks: `node --test --test-concurrency=1 src\upload-utils.test.js src\support-utils.test.js`, `npm.cmd run verify:uploads`, `npm.cmd run verify:roles`, `npm.cmd run build`, Playwright/MS Edge browser QA for owner/admin Uploads-to-Support, employee mobile Uploads without Support action, and foreman mobile upload field scope/no overflow, plus `git diff --check` passed. Released as Fly `v500` with image `registry.fly.io/concrete-ops-2:deployment-01KRWA6MPKT22EBEAWXKJRRGTB`; Fly status showed machine `148e06e2b53d68` started with `1 passing` check, and both live ready endpoints returned `200`, ready, database ok.
- Delivery Tickets Support Handoff Phase 1 release checks: `node --test --test-concurrency=1 src\delivery-ticket-utils.test.js src\support-utils.test.js`, `npm.cmd run verify:delivery-tickets`, `npm.cmd run verify:roles`, `npm.cmd run build`, Playwright/MS Edge browser QA for owner/admin Delivery Tickets-to-Support plus foreman/employee mobile Delivery Tickets without Support action in the current package state, and `git diff --check` passed. Released as Fly `v501` with image `registry.fly.io/concrete-ops-2:deployment-01KRWASQSYCF3QWNG7A3709KTR`; Fly status showed machine `148e06e2b53d68` started with `1 passing` check, and both live ready endpoints returned `200`, ready, database ok.
- Pre-Pour Support Handoff Phase 1 release checks: `node --test --test-concurrency=1 src\pre-pour-utils.test.js src\support-utils.test.js`, `npm.cmd run verify:pre-pour`, `npm.cmd run verify:roles`, `npm.cmd run build`, Playwright/MS Edge browser QA for owner/admin, foreman mobile, and employee mobile Pre-Pour-to-Support context with role-scoped summaries, and `git diff --check` passed. Released as Fly `v502` with image `registry.fly.io/concrete-ops-2:deployment-01KRWB90V2TAPG46T258PGC65M`; Fly status showed machine `148e06e2b53d68` started with `1 passing` check, and both live ready endpoints returned `200`, ready, database ok.
- Post-Pour Support Handoff Phase 1 release checks: `node --test --test-concurrency=1 src\post-pour-utils.test.js src\support-utils.test.js`, `npm.cmd run verify:post-pour`, `npm.cmd run verify:roles`, `npm.cmd run verify:packages`, `npm.cmd run verify:entitlements`, `npm.cmd run build`, Playwright/MS Edge browser QA for owner/admin, foreman mobile, and employee mobile Post-Pour-to-Support context with role-scoped summaries, and `git diff --check` passed. Released as Fly `v503` with image `registry.fly.io/concrete-ops-2:deployment-01KRWBTSNK9NWPFDSEECGHJAY0`; Fly status showed machine `148e06e2b53d68` started with `1 passing` check, and both live ready endpoints returned `200`, ready, database ok.
- Premium Finished SaaS Polish Phase 1 release checks: `node --test --test-concurrency=1 src\design-tokens.test.js src\command-center-utils.test.js`, `npm.cmd run verify:jobs`, `npm.cmd run verify:roles`, `npm.cmd run verify:packages`, `npm.cmd run verify:entitlements`, `npm.cmd run build`, browser owner/admin desktop and mobile Operations Command QA, employee mobile direct `/command-center` denial QA, and `git diff --check` passed. Released as Fly `v504` with image `registry.fly.io/concrete-ops-2:deployment-01KRWD13TN5BF1QRARY5MZM4EK`; Fly status showed machine `148e06e2b53d68` started with `1 passing` check, and both live ready endpoints returned `200`, ready, database ok.
- Premium Finished SaaS Polish Phase 2 release checks: `node --test --test-concurrency=1 src\design-tokens.test.js src\field-workspace-utils.test.js src\navigation-utils.test.js`, `npm.cmd run verify:roles`, `npm.cmd run verify:jobs`, `npm.cmd run verify:packages`, `npm.cmd run verify:entitlements`, `npm.cmd run build`, Playwright browser QA for employee mobile Field Mode, foreman mobile Field Mode, and employee direct `/command-center` denial with no billing/pricing/package controls, no horizontal overflow, no console errors, no failed requests, dark Field Mode header, and dark operator hero; `git diff --check` passed with only LF-to-CRLF working-copy warnings. Released as Fly `v505` with image `registry.fly.io/concrete-ops-2:deployment-01KRWDXMDEHKNC5C6ZDHDE343C`; Fly status showed machine `148e06e2b53d68` started with `1 passing` check, and both live ready endpoints returned `200`, ready, database ok.
- Premium Finished SaaS Polish Phase 3 release checks: focused estimate/design/navigation tests, `npm.cmd run verify:roles`, `npm.cmd run verify:estimates`, `npm.cmd run build`, Playwright browser QA for admin desktop/mobile `/estimates` plus foreman/employee direct `/estimates` denial with no estimate/pricing copy, no horizontal overflow, no console errors, no failed requests, dark Estimate Studio header, and dark selected-total spotlight; `git diff --check` passed with only LF-to-CRLF working-copy warnings. Released as Fly `v506` with image `registry.fly.io/concrete-ops-2:deployment-01KRWEK79KNPT6R3VD2ZM8H8W7`; Fly status showed machine `148e06e2b53d68` started with `1 passing` check, and both live ready endpoints returned `200`, ready, database ok.
- Premium Finished SaaS final visual system sync release checks: final-polish brief was copied into `docs/apex-hq-final-polish-visual-brief.md`, reread against the current app pass, verified, committed, pushed, released as Fly `v507` with image `registry.fly.io/concrete-ops-2:deployment-01KRWGZ0VMSTM14GBKRMN0KY5C`, and both live ready endpoints returned `200`, ready, database ok.
- Premium Finished SaaS Polish Phase 4 release checks: `npm.cmd run verify:roles`, `npm.cmd run verify:jobs`, `npm.cmd run verify:entitlements`, `node --test src\apex-assistant-shell-utils.test.js src\navigation-utils.test.js`, `npm.cmd run build`, Playwright browser QA for desktop/tablet/mobile assistant shell with no assistant overflow, no console/network errors, no mobile bottom-nav overlap, and `git diff --check` passed with only LF-to-CRLF working-copy warnings. Released as Fly `v508` with image `registry.fly.io/concrete-ops-2:deployment-01KRWK4D314QFNF3QZSYKEQ7YR`; Fly status showed machine `148e06e2b53d68` started with `1 passing` check, and both live ready endpoints returned `200`, ready, database ok.
- Safety / Incidents Support Handoff Phase 1 release checks: `node --test --test-concurrency=1 src\safety-utils.test.js src\support-utils.test.js`, `npm.cmd run verify:roles`, `npm.cmd run verify:safety`, `npm.cmd run build`, Playwright/MS Edge browser QA for admin desktop Safety-to-Support, employee mobile Safety-to-Support, and employee direct `/settings` denial with no upgrade/billing context, no console errors, no failed requests, plus `git diff --check` passed with only LF-to-CRLF working-copy warnings. Released as Fly `v509` with image `registry.fly.io/concrete-ops-2:deployment-01KRWNFDS918W7G17XTGC87V1N`; Fly status showed machine `148e06e2b53d68` started with `1 passing` check, and both live ready endpoints returned `200`, ready, database ok.
- Customers text wrapping polish release checks: targeted route sweep found desktop Customers long email/service-area text overflow in fixed table cells. `npm.cmd run verify:customers`, `npm.cmd run verify:roles`, `npm.cmd run build`, `git diff --check`, and Playwright/MS Edge desktop/mobile `/customers` browser QA passed. Browser QA confirmed no horizontal overflow, no console errors, no failed requests, and long customer emails/service areas wrapping with `overflow-wrap:anywhere`. Released as Fly `v510` with image `registry.fly.io/concrete-ops-2:deployment-01KRWPAD1JJ8PFPFW11T9Q7J1Z`; Fly status showed machine `148e06e2b53d68` started with `1 passing` check, and both live ready endpoints returned `200`, ready, database ok.
- Tool Checklist text wrapping polish release checks: targeted route sweep found desktop Tool Checklist long checklist titles, notes, and job/foreman context clipping in fixed command table cells. `npm.cmd run verify:tool-checklist`, `npm.cmd run verify:roles`, `npm.cmd run build`, `git diff --check`, and Playwright/MS Edge desktop/mobile `/tool-checklist` browser QA passed. Browser QA confirmed no horizontal overflow, no console errors, no failed requests, and long checklist text wrapping with `overflow-wrap:anywhere`. Released as Fly `v511` with image `registry.fly.io/concrete-ops-2:deployment-01KRWPVD5DCT2YBX2QKKRNCEKA`; Fly status showed machine `148e06e2b53d68` started with `1 passing` check, and both live ready endpoints returned `200`, ready, database ok.
- Toolbox / PPE text wrapping polish release checks: targeted route sweep found desktop `/toolbox-talks` and `/ppe` long safety guidance clipping in the shared toolbox command table. `npm.cmd run verify:safety`, `npm.cmd run verify:roles`, `npm.cmd run build`, `git diff --check`, and Playwright/MS Edge desktop/mobile browser QA for `/toolbox-talks` and `/ppe` passed. Browser QA confirmed no horizontal overflow, no console errors, no failed requests, desktop first-column guidance wrapping with `overflow-wrap:anywhere`, and mobile card layouts still replacing the table. Released as Fly `v512` with image `registry.fly.io/concrete-ops-2:deployment-01KRWQANHDRDKWE9HH67NKFK11`; Fly status showed machine `148e06e2b53d68` started with `1 passing` check, and both live ready endpoints returned `200`, ready, database ok.
- Daily Reports text wrapping polish release checks: targeted route sweep found desktop `/reports` long field notes, weather, proof, concrete summary, and report ID text clipping in fixed command-table cells. `npm.cmd run verify:daily-reports`, `npm.cmd run verify:roles`, `npm.cmd run build`, `git diff --check`, and Playwright/MS Edge desktop/mobile `/reports` browser QA passed. Browser QA confirmed no horizontal overflow, no console errors, no failed requests, desktop report context wrapping with `overflow-wrap:anywhere`, and mobile report cards still replacing the table. Released as Fly `v513` with image `registry.fly.io/concrete-ops-2:deployment-01KRWQPRQCG9ATSC226MFVEHQE`; Fly status showed machine `148e06e2b53d68` started with `1 passing` check, and both live ready endpoints returned `200`, ready, database ok. Deploy emitted the known listening-address warning, but post-deploy status and ready checks passed.
- Photo Evidence text wrapping polish release checks: targeted route sweep found desktop `/uploads` long evidence labels, job/customer labels, and upload notes clipping in fixed command-table cells. `npm.cmd run verify:uploads`, `npm.cmd run verify:roles`, `npm.cmd run build`, `git diff --check`, and Playwright/MS Edge desktop/mobile `/uploads` browser QA passed. Browser QA confirmed no horizontal overflow, no console errors, no failed requests, desktop upload context wrapping with `overflow-wrap:anywhere`, and mobile upload cards still replacing the table. Released as Fly `v514` with image `registry.fly.io/concrete-ops-2:deployment-01KRWRCK7PY5EXFBQRAJSS12WX`; Fly status showed machine `148e06e2b53d68` started with `1 passing` check, and both live ready endpoints returned `200`, ready, database ok.
- Delivery Tickets text wrapping polish release checks: targeted route sweep found desktop `/delivery-tickets` long ticket, job, and customer labels clipping in fixed command-table cells. `npm.cmd run verify:delivery-tickets`, `npm.cmd run verify:roles`, `npm.cmd run build`, `git diff --check`, and Playwright/MS Edge desktop/mobile `/delivery-tickets` browser QA passed. Browser QA confirmed no horizontal overflow, no console errors, no failed requests, desktop ticket context wrapping with `overflow-wrap:anywhere`, and mobile ticket cards still replacing the table. Released as Fly `v515` with image `registry.fly.io/concrete-ops-2:deployment-01KRWRQRPQZB2M0N1DVBY2G0K4`; Fly status showed machine `148e06e2b53d68` started with `1 passing` check, and both live ready endpoints returned `200`, ready, database ok. Deploy emitted the known listening-address warning, but post-deploy status and ready checks passed.
- Safety / Incidents text wrapping polish release checks: targeted route sweep found desktop `/incidents` long incident and job labels clipping in fixed command-table cells. `npm.cmd run verify:safety`, `npm.cmd run verify:roles`, `npm.cmd run build`, `git diff --check`, and Playwright/MS Edge desktop/mobile `/incidents` browser QA passed. Browser QA confirmed no horizontal overflow, no console errors, no failed requests, desktop incident context wrapping with `overflow-wrap:anywhere`, and mobile incident cards still replacing the table. Released as Fly `v516` with image `registry.fly.io/concrete-ops-2:deployment-01KRWS5937ZWQX48FXTQ2R5B5H`; Fly status showed machine `148e06e2b53d68` started with `1 passing` check, and both live ready endpoints returned `200`, ready, database ok.
- Jobs text wrapping polish release checks: targeted route sweep found desktop `/jobs` long job IDs, job names, and assigned/needed crew-count context clipping in fixed command-table cells. `npm.cmd run verify:jobs`, `npm.cmd run verify:roles`, `npm.cmd run build`, `git diff --check`, and Playwright/MS Edge desktop/mobile `/jobs` browser QA passed. Browser QA confirmed no horizontal overflow, no console errors, no failed requests, desktop job identity and crew context wrapping with `overflow-wrap:anywhere`, mobile job cards still replacing the table, and employee mobile `/jobs` still rendering Field Mode without office, settings, upgrade, or pricing signals. Released as Fly `v517` with image `registry.fly.io/concrete-ops-2:deployment-01KRWSWXYDW6DJF2PNG4Y9NXWV`; Fly status showed machine `148e06e2b53d68` started with `1 passing` check, and both live ready endpoints returned `200`, ready, database ok.
- Time Entries text wrapping polish release checks: targeted route sweep found desktop `/time` long job/work labels clipping in fixed command-table work cells. `npm.cmd run verify:time`, `npm.cmd run verify:roles`, `npm.cmd run build`, `git diff --check`, and Playwright/MS Edge desktop/mobile `/time` browser QA passed. Browser QA confirmed no horizontal overflow, no console errors, no failed requests, desktop time work labels wrapping with `overflow-wrap:anywhere`, mobile time cards still replacing the table, and employee mobile `/time` still rendering My Time without office, settings, upgrade, pricing, or admin signals. Released as Fly `v518` with image `registry.fly.io/concrete-ops-2:deployment-01KRWT99KMMXW5YA75QCRE99TT`; Fly status showed machine `148e06e2b53d68` started with `1 passing` check, and both live ready endpoints returned `200`, ready, database ok. Deploy emitted the known listening-address warning, but post-deploy status and ready checks passed.
- Estimate Studio text wrapping polish release checks: targeted route sweep found desktop `/estimates` long proposal titles clipping in fixed command-table cells. `npm.cmd run verify:estimates`, `npm.cmd run verify:roles`, `npm.cmd run build`, `git diff --check`, and Playwright/MS Edge desktop/mobile `/estimates` browser QA passed. Browser QA confirmed no horizontal overflow, no console errors, no failed requests, desktop estimate/customer and lead/job context wrapping with `overflow-wrap:anywhere`, mobile estimate cards still replacing the table, and employee mobile direct `/estimates` still landing in Field Mode without estimate studio, pricing, proposal, or total signals. Released as Fly `v519` with image `registry.fly.io/concrete-ops-2:deployment-01KRWTRD5KPD7N5H8AB0CPGDZY`; Fly status showed machine `148e06e2b53d68` started with `1 passing` check, and both live ready endpoints returned `200`, ready, database ok.
- Pre/Post-Pour action header polish release checks: targeted route sweep found desktop `/pre-pour` and `/post-pour` shared checklist table `Actions` headers clipping in the fixed action column. `npm.cmd run verify:pre-pour`, `npm.cmd run verify:post-pour`, `npm.cmd run verify:roles`, `npm.cmd run build`, `git diff --check`, and Playwright/MS Edge owner desktop, owner mobile, and employee mobile direct browser QA for `/pre-pour` and `/post-pour` passed. Browser QA confirmed no horizontal overflow, no console errors, no failed requests, desktop `Actions` headers no longer clipped, mobile card layouts still replacing the table, and employee mobile direct views stayed field-safe without office, settings, upgrade, pricing, or billing signals. Released as Fly `v520` with image `registry.fly.io/concrete-ops-2:deployment-01KRWV8BX4HKXW6WHV9102C18Q`; Fly status showed machine `148e06e2b53d68` started with `1 passing` check, and both live ready endpoints returned `200`, ready, database ok.
- Leads follow-up header polish release checks: targeted route sweep found desktop `/leads` `Follow-Up` header clipping in the fixed Leads command table. `npm.cmd run verify:leads`, `npm.cmd run verify:roles`, `npm.cmd run build`, `git diff --check`, and Playwright/MS Edge owner desktop, owner mobile, and employee mobile direct browser QA for `/leads` passed. Browser QA confirmed no horizontal overflow, no console errors, no failed requests, desktop `Follow-Up` header no longer clipped, owner mobile lead cards still replacing the table, and employee mobile direct `/leads` redirected to Field Mode without leads, office, settings, upgrade, pricing, billing, or AI Office signals. Released as Fly `v521` with image `registry.fly.io/concrete-ops-2:deployment-01KRWVNB5NVTYPMPVBSBQK9P3Y`; Fly status showed machine `148e06e2b53d68` started with `1 passing` check, and both live ready endpoints returned `200`, ready, database ok. Deploy emitted the known listening-address warning, but post-deploy status and ready checks passed.
- Jobs progress header polish release checks: targeted route sweep found desktop `/jobs` `Progress` header clipping in the fixed Jobs command table. `npm.cmd run verify:jobs`, `npm.cmd run verify:roles`, `npm.cmd run build`, `git diff --check`, and Playwright/MS Edge owner desktop, owner mobile, and employee mobile direct browser QA for `/jobs` passed. Browser QA confirmed no horizontal overflow, no console errors, no failed requests, desktop `Progress` header no longer clipped, owner mobile job cards still replacing the table, and employee mobile direct `/jobs` stayed in Field Mode without office, settings, upgrade, pricing, billing, AI Office, or App Health signals. Released as Fly `v522` with image `registry.fly.io/concrete-ops-2:deployment-01KRWW3SXWMFVASPYTM2NR10T4`; Fly status settled to machine `148e06e2b53d68` started with `1 passing` check, and both live ready endpoints returned `200`, ready, database ok.
- Dashboard status badge clipping polish release checks: targeted route sweep found desktop `/dashboard` dense cockpit buttons with status badges shrinking narrower than their badge text. `npm.cmd run verify:jobs`, `npm.cmd run verify:roles`, `npm.cmd run build`, `git diff --check`, and Playwright/MS Edge owner desktop, owner mobile, and employee mobile direct browser QA for `/dashboard` passed. Browser QA confirmed no horizontal overflow, no console errors, no failed requests, Dashboard cockpit buttons no longer measured wider than their containers, no table header clipping, and employee mobile direct `/dashboard` redirected to Field Mode without office, leads, estimates, settings, upgrade, pricing, billing, AI Office, or App Health signals. Released as Fly `v523` with image `registry.fly.io/concrete-ops-2:deployment-01KRWWPGG33PNEZ2313FH6JZ9B`; Fly status settled to machine `148e06e2b53d68` started with `1 passing` check, and both live ready endpoints returned `200`, ready, database ok.
- Schedule job card readability polish release checks: north-star route sweep found compact `/schedule` desktop cards squeezing job titles and status badges into the same narrow row, causing broken job-name wrapping in the operating plan. CSS-only patch keeps compact schedule card title/location context full-width and moves badges below for scan speed. `npm.cmd run verify:jobs`, `npm.cmd run verify:roles`, `npm.cmd run build`, `git diff --check`, and Playwright/MS Edge owner desktop/mobile plus employee mobile direct-route QA passed. Browser QA confirmed `/schedule` had no horizontal overflow, no console errors, no failed requests, no clipped schedule job title/location/badge text after rebuild, and employee direct `/schedule`, `/leads`, `/estimates`, and `/settings` redirected to Field Mode without office nav. Released as Fly `v524` with image `registry.fly.io/concrete-ops-2:deployment-01KRWXG4WGKNH243AHZRDM2SBM`; Fly status settled to machine `148e06e2b53d68` started with `1 passing` check, and both live ready endpoints returned `200`, ready, database ok.
- Communications mobile nav label polish release checks: browser QA found owner/admin mobile `/communications` bottom nav clipping the active `Communications` label in the compact phone bar. Runtime change displays `Comms` only in the primary mobile nav label while preserving `aria-label="Communications"` and full route behavior. `npm.cmd run verify:leads`, `npm.cmd run verify:roles`, `npm.cmd run build`, `git diff --check`, and Playwright/MS Edge owner/admin mobile plus employee mobile direct-route QA passed. Browser QA confirmed `/communications` had no horizontal overflow, no console errors, no failed requests, no clipped primary bottom-nav labels, the full accessible label remained `Communications`, and employee direct `/communications` redirected to Field Mode without office nav. Released as Fly `v525` with image `registry.fly.io/concrete-ops-2:deployment-01KRWY41N2PVVR1XBV59WJZAN6`; Fly status showed machine `148e06e2b53d68` started with `1 passing` check, and both live ready endpoints returned `200`, ready, database ok. Deploy emitted the known listening-address warning, but post-deploy status and ready checks passed.
- Tablet mobile nav label polish release checks: browser QA found owner/admin tablet bottom nav clipping long active labels for `/command-center`, `/uploads`, `/delivery-tickets`, `/imported-drafts`, `/change-orders`, `/toolbox-talks`, and `/tool-checklist`. Runtime change displays compact primary-bar labels `Command`, `Photos`, `Tickets`, `Imports`, `Changes`, `Toolbox`, and `Tools` while preserving each full `aria-label` and full route behavior. `npm.cmd run verify:roles`, `npm.cmd run build`, `git diff --check`, and Playwright/MS Edge owner tablet plus employee mobile direct-route QA passed. Browser QA confirmed the affected routes had no horizontal overflow, no console errors, no failed requests, no clipped primary bottom-nav labels, and employee mobile direct `/command-center` redirected to Field Mode. Released as Fly `v526` with image `registry.fly.io/concrete-ops-2:deployment-01KRWYSEDENAHXS2VYKHG7K7AC`; Fly status settled to machine `148e06e2b53d68` started with `1 passing` check, and both live ready endpoints returned `200`, ready, database ok.
- Settings account text wrapping polish release checks: browser QA found desktop `/app-health` account panel clipping the signed-in email in the narrow Settings account card. CSS-only patch lets account panel grid children shrink safely and wraps secondary account text with `overflow-wrap:anywhere`. `npm.cmd run verify:server`, `npm.cmd run verify:roles`, `npm.cmd run build`, `git diff --check`, and Playwright/MS Edge owner desktop/tablet/phone plus employee mobile direct-route QA passed. Browser QA confirmed `/app-health` and `/settings` had no horizontal overflow, no account-panel text clipping, no console errors, no failed requests, and employee direct `/app-health` and `/settings` redirected to Field Mode. Released as Fly `v527` with image `registry.fly.io/concrete-ops-2:deployment-01KRWZ7FBZ206KRW66K616KCY2`; Fly status settled to machine `148e06e2b53d68` started with `1 passing` check, and both live ready endpoints returned `200`, ready, database ok.
- Command KPI card height polish release checks: browser QA found shared office KPI cards clipping bottom helper/action text on `/leads`, `/jobs`, `/customers`, `/estimates`, and `/settings` across desktop/tablet/phone. CSS-only patch removes the forced short height for those office KPI grids while keeping compact responsive columns. `npm.cmd run verify:leads`, `npm.cmd run verify:jobs`, `npm.cmd run verify:customers`, `npm.cmd run verify:estimates`, `npm.cmd run verify:roles`, `npm.cmd run verify:server`, `npm.cmd run build`, `git diff --check`, and Playwright/MS Edge owner desktop/tablet/phone plus employee mobile direct-route QA passed. Browser QA confirmed no KPI text clipping, no horizontal overflow, no console errors, no failed requests, and employee direct office routes redirected to Field Mode without office KPI grids. Released as Fly `v528` with image `registry.fly.io/concrete-ops-2:deployment-01KRWZTXPT5RQ7MB0KW6F6MT6R`; Fly status settled to machine `148e06e2b53d68` started with `1 passing` check, and both live ready endpoints returned `200`, ready, database ok.
- Dashboard today-work row fit polish release checks: browser QA found desktop Dashboard Today Work Coordination rows measuring wider than the card because the three-column row grid minimums exceeded the available card width. CSS-only patch tightens the desktop row grid minimums while preserving the existing tablet/mobile stack. `npm.cmd run verify:jobs`, `npm.cmd run verify:roles`, `npm.cmd run build`, `git diff --check`, and Playwright/MS Edge owner desktop/tablet/phone plus employee mobile direct-route QA passed. Browser QA confirmed the Dashboard today-work board, list, and rows had no horizontal clipping, no page overflow, no console errors, no failed requests, and employee direct `/` still redirected to Field Mode. Released as Fly `v529` with image `registry.fly.io/concrete-ops-2:deployment-01KRX0GPCRSZD9VK15QDY9ACAW`; Fly status settled to machine `148e06e2b53d68` started with `1 passing` check, and both live ready endpoints returned `200`, ready, database ok.
- Communication follow-up filter polish release checks: browser QA found the owner/admin desktop Communication Center compact follow-up filter drawer using three fixed columns inside a narrow card, which clipped the filter controls. Scoped CSS stacks only the compact drawer filters while preserving the full follow-up board filter grid. `npm.cmd run verify:leads`, `npm.cmd run verify:roles`, `npm.cmd run build`, `git diff --check`, and Playwright/MS Edge owner desktop/tablet/phone plus employee mobile direct-route QA passed. Browser QA confirmed the compact filter grid no longer clips, `/communications` has no page-level horizontal overflow, no console errors, no failed requests, and employee direct `/communications` redirects to `/jobs` Field Mode without office nav. Released as Fly `v530` with image `registry.fly.io/concrete-ops-2:deployment-01KRX15XZ2X0B1VSPG16WQZV3W`; Fly status settled to machine `148e06e2b53d68` started with `1 passing` check, and both live ready endpoints returned `200`, ready, database ok.
- Employees priority action polish release checks: browser QA found desktop `/employees` Priority Moves helper copy clipped because the rail forced four long action helpers into a narrow two-column grid with `nowrap` text. CSS-only patch converts that rail to a vertical action queue and lets helper copy wrap. `npm.cmd run verify:users`, `npm.cmd run verify:roles`, `npm.cmd run build`, `git diff --check`, and Playwright/MS Edge owner desktop/tablet/phone plus employee mobile direct-route QA passed. Browser QA confirmed Employees priority helper copy no longer clips, `/employees` has no page-level horizontal overflow, no console errors, no failed requests, and employee direct `/employees` redirects to `/jobs` Field Mode without office nav. Released as Fly `v531` with image `registry.fly.io/concrete-ops-2:deployment-01KRX1XH02QRA5ND5PR7KM8K62`; Fly status settled to machine `148e06e2b53d68` started with `1 passing` check, and both live ready endpoints returned `200`, ready, database ok.
- Command metric helper polish release checks: browser QA found phone-width `/command-center` header metric helper copy clipping `Jobs or estimates ready` inside the Operations Command KPI cards. CSS-only patch lets only the command header metric helper copy wrap while leaving dense command rows untouched. `npm.cmd run verify:jobs`, `npm.cmd run verify:roles`, `npm.cmd run build`, `git diff --check`, and Playwright/MS Edge owner desktop/tablet/phone plus employee mobile direct-route QA passed. Browser QA confirmed all command header metric helpers no longer clip, `/command-center` has no page-level horizontal overflow, no console errors, no failed requests, and employee direct `/command-center` redirects to `/jobs` Field Mode without office nav. Released as Fly `v532` with image `registry.fly.io/concrete-ops-2:deployment-01KRX2DV9AKD08J0YVEKKA1SJ8`; Fly status settled to machine `148e06e2b53d68` started with `1 passing` check, and both live ready endpoints returned `200`, ready, database ok.
- Assistant launcher overlap polish release checks: browser QA found the collapsed Apex Assistant pill overlapping Toolbox/PPE right-rail action buttons in the first desktop viewport. Runtime patch makes the closed launcher compact and reserves a desktop-only right gutter for Toolbox/PPE rail actions. `npm.cmd run verify:safety`, `npm.cmd run verify:roles`, `npm.cmd run build`, `git diff --check`, Playwright/MS Edge desktop screenshots for `/toolbox-talks` and `/ppe`, and custom Playwright desktop/tablet/phone overlap checks passed. Browser QA confirmed no assistant/action overlap, no horizontal overflow, no console errors, no failed requests, the assistant still opens from the compact launcher, employee safety routes do not show office nav or management controls, and employee direct `/command-center` redirects to `/jobs`. Released as Fly `v533` with image `registry.fly.io/concrete-ops-2:deployment-01KRX3Y6ZS2S3DPGB2VNC7TQ63`; Fly status settled to machine `148e06e2b53d68` started with `1 passing` check, and both live ready endpoints returned `200`, ready, database ok.
- Delivery assistant clearance polish release checks: browser QA found desktop `/delivery-tickets` selected-ticket right-rail `New Ticket` action touching the collapsed Apex Assistant launcher. Scoped patch adds a delivery rail action wrapper and desktop-only assistant gutter. `npm.cmd run verify:delivery-tickets`, `npm.cmd run verify:roles`, `npm.cmd run build`, `git diff --check`, Playwright/MS Edge desktop screenshot capture, and custom desktop/tablet/phone overlap checks passed. Browser QA confirmed no delivery assistant/action overlap, no horizontal overflow, no console errors, no failed requests, and employee mobile `/delivery-tickets` does not show office nav or delivery management buttons. Released as Fly `v534` with image `registry.fly.io/concrete-ops-2:deployment-01KRX53FTHRP3B0W2FSZVWN08A`; Fly status settled to machine `148e06e2b53d68` started with `1 passing` check, and both live ready endpoints returned `200`, ready, database ok.

## Current Loop Prevention Rules

Do not start these phases again as if they are missing:

- Public signup/workspace creation.
- First owner creation/session scope.
- Basic package entitlement foundation.
- Support/onboarding handoff.
- Invite/password reset foundation.
- Demo-vs-real basic separation.
- Field operations tightening pages.
- Company branding/proposal identity.
- Estimate options/reference attachments/takeoff input foundation.
- GC packet/foreman handoff packet split.
- Operations Command UX Phase 1 and mobile KPI polish.
- Communication Center Phase 1.
- App Health / Audit Activity Phase 1.
- Watchtower / Missing Work Agent Phase 1.
- Apex Assistant Shell Phase 1.
- Assistant Missing Proof Summary.
- Mobile Field Trust Polish.
- Field Ops Agent Planning Checkpoint.
- Field Ops Agent Phase 1 read-only summary.
- Customer Success / Guided Setup Phase 2.
- Managed Setup Support Handoff Phase 1.
- Time Tracking Support Handoff Phase 1.
- Daily Reports Support Handoff Phase 1.
- Photo Evidence Support Handoff Phase 1.
- Delivery Tickets Support Handoff Phase 1.
- Pre-Pour Support Handoff Phase 1.
- Post-Pour Support Handoff Phase 1.
- Premium Finished SaaS Polish Phase 1.
- Premium Finished SaaS Polish Phase 2.
- Premium Finished SaaS Polish Phase 3.
- Premium Finished SaaS Polish Phase 4.
- Safety / Incidents Support Handoff Phase 1.
- Customers text wrapping polish.
- Tool Checklist text wrapping polish.
- Toolbox / PPE text wrapping polish.
- Daily Reports text wrapping polish.
- Photo Evidence text wrapping polish.
- Delivery Tickets text wrapping polish.
- Safety / Incidents text wrapping polish.
- Jobs text wrapping polish.
- Time Entries text wrapping polish.
- Estimate Studio text wrapping polish.
- Pre/Post-Pour action header polish.
- Leads follow-up header polish.
- Jobs progress header polish.
- Dashboard status badge clipping polish.
- Billing / Plans Readiness Prep.
- Public SaaS Signup UX Phase 2.
- Package Upgrade / Locked State Polish.
- Advanced Reporting Prep.
- Advanced Reporting Prep Phase 2.
- Enterprise Trust Prep.
- Enterprise Trust Phase 2.
- Billing / Manual Upgrade Prep Planning.
- Billing / Manual Upgrade Prep Phase 1.
- Pilot Feedback Capture Phase 1.
- Customer Portal Phase 1 Manual Approval Preview.
- Demo pilot data cleanup.

If one of those areas comes up, first ask:

1. Is there a bug?
2. Is there a missing test?
3. Is there a narrow UX improvement?
4. Is it already covered and should we move on?

## Current Next Phase

### Targeted Visual / Workflow Polish Triage

Why this is current:

- Premium Finished SaaS Polish Phases 1-4 are built, verified, released, and health-checked for the canonical Operations Command, Field Mode, Estimate Studio, and Apex Assistant surfaces.
- The current support-handoff set is complete through Safety / Incidents and should not be restarted as missing.
- The Phase 8-14 finish batch is complete and should not be restarted as missing. Future work should target confirmed live/demo/pilot blockers only.
- Founder-Led Demo Execution Support is already built and released; real outreach/demo decisions need user/customer input before more demo-support code is justified.
- The next buildable product work should be a narrow visual or workflow polish item only when it fixes a visible demo blocker, an unfinished non-frozen route, or a role-safe usability issue found in browser QA.

Scope:

- Inspect the current route/page inventory against `docs/apex-hq-final-polish-visual-brief.md`.
- Pick one non-frozen page or workflow with a visible issue; do not re-polish canonical pages without a concrete defect.
- Keep shared visual language aligned with the dark shell, light operational canvas, Apex orange actions, dense contractor cards/tables, and field-first mobile behavior.
- Preserve existing role/package gates and direct-route denials.
- Verify desktop, tablet/mobile where relevant, console/network, text overflow, and role-aware navigation for the touched route.

Do not include:

- Stripe/payment processing.
- Self-serve checkout.
- Billing automation.
- Invoice/payment collection.
- SOC 2 claims, enterprise SSO/MFA/SCIM.
- Public customer portal implementation.
- Public customer authentication.
- Customer self-serve approvals.
- Share links.
- Customer login.
- Autonomous material ordering.
- Vendor checkout, purchasing, payment, or purchase orders.
- Autonomous pricing, bid approval, job conversion, scheduling, crew assignment, or customer messaging.
- Public self-serve signup or billing.
- Public pricing checkout or package management.
- Unsupported AI, compliance, portal, integration, or automation claims.
- Automatic survey sending.
- Public testimonial publishing.
- NPS/review automation.
- Automatic customer notifications.
- Real customer data mutation.
- Broad demo data rewrites.
- Broad app feature work without demo/pilot evidence.
- Field access to owner/admin plans, pricing, export, billing, or settings data.
- Auth/session rewrites.
- Public signup changes.
- Invite email automation.
- New roles or permission broadening.
- Sending outreach, email, SMS, DMs, ads, or public posts without explicit approval.
- Whole-app redesign.
- Rebuilding Settings, Support, Safety, Leads, Customers, Jobs, or core field workflows from scratch.
- Broad final-polish loops without a specific visible route/workflow problem.

Suggested verification:

- Focused tests for the page/workflow touched.
- `npm.cmd run verify:roles` if route visibility, navigation, package gates, or field-safe behavior are touched.
- The matching workflow verify script for the touched route.
- `npm.cmd run build`
- `git diff --check`
- Browser QA for the touched route across the relevant desktop/tablet/mobile viewport and role matrix.
- For route-wide final-polish regression, use `npm.cmd run audit:visual-polish` locally. Use `npm.cmd run audit:visual-polish:chromium` for the stable Chromium sweep and `npm.cmd run audit:visual-polish:tablet` for tablet-specific coverage. Use `npm.cmd run audit:public-site` when public `/founder-pilot` copy or UI is touched; it covers desktop, tablet, and phone. Use `npm.cmd run audit:demo-desktop` when live demo walkthrough screenshot evidence is needed, or `npm.cmd run audit:demo-desktop:local` when validating local demo walkthrough UI at 1440px before release.

## Next Build Phases

| Order | Phase | Goal | Risk | User needed? |
| --- | --- | --- | --- | --- |
| 1 | Next targeted visual/workflow polish | Pick one non-frozen page only if browser QA or demo review shows a visible workflow problem, unfinished state, or role-safe usability blocker. | Medium | Maybe, if the target page is unclear. |
| 2 | Founder-led demo blocker follow-up | After real demos/pilots, build only the narrow blockers proven by recorded objections or pilot-fit notes. | Medium | Yes, needs demo/pilot evidence. |
| 3 | Route sweep / visual QA refresh | Periodic route sweep for text overflow, mobile issues, console/network failures, and stale tracker drift. Fix only confirmed issues. | Low | No. |

## Later / Do Not Build Yet

Do not build these until the above phases are stronger:

- Live payroll processing, paychecks, direct deposit, tax withholding, certified payroll processing, and payroll provider writes. Payroll prep/export is already built and frozen.
- Offline mode.
- Public customer portal token redemption, customer sessions, public customer actions, and share-link serving. Manual-safe customer portal review workflow is already built and frozen.
- Stripe billing, live invoices, payment links, checkout, payment collection, receipts, taxes, and accounting sync. Billing prep/readiness is already built and frozen.
- Google Calendar/Gmail/QuickBooks/Twilio integrations.
- Automatic AI sending.
- AI ad publishing or spend.
- Hidden GPS tracking.
- Full website builder.
- Full automated PDF takeoff from blueprints. Apex Takeoff Studio may begin with manual/review-first takeoff and later AI assistance, but automated blueprint quantity detection remains a separately reviewed advanced phase.

## Package Direction

Security is never paid. Every package gets auth safety, company isolation, role protection, demo safety, and safe sessions.

Basic:

- Core operations.
- Leads/customers/jobs/crews.
- Time/reports/uploads.
- Safety/checklists.
- Simple estimates.
- Basic schedule/reminders.
- Company branding basics.

Premium:

- Everything in Basic.
- AI Rough Notes.
- Proposal/GC packet tools.
- Advanced estimate presentation.
- App health.
- Watchtower and operational assistant foundations.
- Advanced reporting and integrations when built.

Elite:

- Everything in Premium.
- Lead/Job Finder.
- Website Builder Agent.
- Ad Assistant Agent.
- Customer portal when built.
- Advanced automation/analytics.
- Growth partner workflows.

## Release Discipline

Before each release:

- Confirm changed files.
- Run focused verification only.
- Do not stage unrelated docs/skills/app files.
- Do not deploy if verification fails.
- Report commit hash, release/version, live URLs, health checks, and warnings.

## Recommended Next Prompt

Use this when ready for the next product/QA slice:

```text
You are entering:

APEX HQ - TARGETED ROUTE SWEEP / VISUAL QA REFRESH

Use skills:
- apex-build-router
- codex-mastery-system
- apex-hq-operating-standards
- apex-permission-safety
- apex-qa-engineer
- codex-react-frontend-mastery
- codex-ui-polish-saas-quality
- codex-browser-automation

Repo:
C:\Users\jberl\Documents\New project

Archive/reference only:
C:\Users\jberl\Documents\Codex\concrete-ops-2-clean

Do NOT add Stripe.
Do NOT add checkout.
Do NOT add payment collection.
Do NOT add invoices.
Do NOT add self-serve package changes.
Do NOT expose billing, pricing, package management, or upgrade controls to field users.
Do NOT do broad polish loops.
Do NOT redesign frozen canonical pages without a concrete defect.
Do NOT touch unrelated files.

Goal:
Run a focused route sweep for visible demo blockers, text overflow, mobile/desktop breakage, console/network errors, and role-safe route behavior. Implement only the smallest confirmed fix if the sweep finds a real issue.

Focus only on:
- routes or components with confirmed QA evidence
- visible workflow breakage, clipped text, layout overflow, or broken empty states
- role-safe navigation and field-user blocking
- existing shared Apex HQ visual/workflow patterns

Preserve:
- existing app behavior and data
- existing auth/session/package/role logic
- existing Support, Safety, Jobs, Reports, Uploads, Estimates, and Field Mode workflows unless a confirmed defect requires a narrow touch
- no backend records, automation, payments, checkout, invoices, or package controls
- no automatic sending, approving, resolving, customer notifications, pricing, scheduling, job conversion, crew assignment, or customer messaging

Verify:
- npm.cmd run audit:visual-polish:chromium
- npm.cmd run audit:visual-polish:tablet if tablet layout is touched
- focused tests for the touched route/workflow
- npm.cmd run verify:roles
- npm.cmd run build
- git diff --check
- browser QA screenshots for the fixed route and relevant role/device matrix

Report:
- files changed
- QA finding fixed
- exact UX/permission behavior
- verification results
- release details if released
- whether to move on or keep fixing the same route
```
