# Apex HQ Build Status And Phase Tracker

Last updated: 2026-05-17

Purpose: this is the master build-status file for Apex HQ. Use it to prevent loops, avoid rebuilding completed systems, and choose the next phase.

## Current Verdict

Apex HQ is a strong guided-pilot contractor operations platform. It is not yet ready for wide public self-serve SaaS launch, but the core SaaS safety foundation is much stronger than the roadmap originally assumed.

Current state:

- Pilot/demo readiness: good for guided demos and founder-led pilots.
- Public signup foundation: built and tested.
- Multi-company safety: built and heavily tested, but still needs periodic route sweeps as new workflows are added.
- Package entitlement foundation: built, tested, released.
- First owner onboarding/support handoff: built, tested, released.
- Premium finished SaaS polish: still in progress.

## Latest Released App State

Latest release tracked in this file:

- Commit: `daedd6f`
- Message: `Refresh Apex HQ demo field dates`
- Fly release: `v490`
- Image: `registry.fly.io/concrete-ops-2:deployment-01KRV7C14286DXFHDRB0R16797`
- Health checks: `https://app.apexhq.online/api/ready` and `https://concrete-ops-2.fly.dev/api/ready` returned `200`, ready, database ok.

Known working tree note:

- Existing uncommitted docs/agent/skill files may be present.
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
| Billing / Plans Readiness Prep | Done and released | Read-only Settings plan readiness, manual billing guardrails, feature labels, and field-safe bootstrap package redaction. |
| Support / Help page | Done and released | Copy-only/manual support handoff exists. |
| Customer Success / Guided Setup Phase 2 | Done and released | First-owner guided setup path now groups profile, team, first work, and rollout readiness. |
| Communication Center Phase 1 | Done and released | Manual-first owner/admin communication log exists. Extend only for workflow-specific communication needs. |
| Dashboard / Command Center foundation | Done/frozen | Only bug fixes, usability fixes, and planned command-center upgrades. |
| Leads | Done/frozen | Do not redesign; only planned improvements or bugs. |
| Customers | Done/frozen | Do not redesign. |
| Estimates / AI Rough Notes foundation | Built | Rough notes assistant and draft flow exist. Do not rebuild. |
| Company branding / proposal identity | Built and released | Company/proposal identity exists for estimates and packets. Extend only for bugs or specific packet needs. |
| Estimate options / attachments / takeoff inputs | Built and released | Multiple options, reference attachments, and takeoff input foundations exist. Automated takeoff remains deferred. |
| GC packet / foreman handoff packet split | Built and released | GC/customer-facing packet and foreman field handoff packet are separated. |
| Jobs / crew assignments | Done/frozen | Extend only for planned workflows. |
| Today Work / Schedule coordination | Built and released | Practical coordination board exists. |
| Notifications / reminders foundation | Built and released | Operational reminders exist. |
| Daily reports | Tightened | Preserve workflow. |
| Uploads/photo evidence | Tightened | Preserve workflow. |
| Delivery tickets | Tightened | Preserve workflow. |
| Pre-pour/post-pour | Tightened | Preserve workflow. |
| Safety/incidents/PPE/toolbox/tool checklist | Tightened | Preserve workflow. |
| App health / owner health foundations | Built | Includes audit activity review panel. Expand later into trust/observability only with a scoped phase. |
| Enterprise Trust Prep | Built and released | Owner/admin trust readiness panel summarizes audit activity, owner export, Owner Health, support handoff, and release safety without adding compliance claims or new backend systems. |
| Guided Demo Launch Readiness | Rehearsed | Live v487 owner/admin and field browser rehearsal passed with no P0/P1 blockers, no console/API failures, no horizontal overflow, and role-safe field routes. |
| Watchtower / Missing Work Agent Phase 1 | Built and released | Read-only Command Center missing-work queue exists. Do not turn it into autopilot without explicit Assistant phase controls. |
| Apex Assistant Shell Phase 1 | Built and released | Persistent review-only shell routes office users to existing workflows. Do not add autonomous writes without explicit Assistant command expansion phase controls. |
| Assistant Command Expansion Phase 2 Scope Lock | Prepared | `docs/ASSISTANT_COMMAND_EXPANSION_SCOPE.md` defines allowed/later/never commands, role/package gates, first slice, and builder prompt. |
| Assistant Command Expansion Phase 2A | Built and released | Lead/customer/rough-notes commands now hand off to clean reviewed estimate draft mode while preserving role/package gates and blocking unsafe automation. |
| Assistant Missing Proof Summary | Built and released | Apex Assistant now summarizes read-only missing proof for visible office jobs and routes users to existing reports, uploads, ticket, checklist, safety, and tool workflows. |
| Mobile Field Trust Polish | Built and released | Demo field job dates now freshen for demo users so mobile foreman/employee views feel current without mutating real company data. |
| Field Ops Agent Planning Checkpoint | Prepared | `docs/FIELD_OPS_AGENT_PLANNING_CHECKPOINT.md` defines read-only phase 1 scope, GPS/location consent boundaries, role visibility, package policy, QA plan, and a builder prompt. Implementation requires approval. |
| Opportunity Scout foundation | Built and package-gated | Elite-only Lead Finder surfaces should stay gated. |
| Operations Command UX Upgrade Phase 1 | Built and released | Operations strip, operating plan, field execution, review/approve, billing readiness, and mobile KPI polish exist. |

## Recently Verified

Recent focused verification:

- `npm.cmd run verify:signup`: passed 36/36.
- `npm.cmd run verify:auth`: passed 24/24.
- `npm.cmd run verify:packages`: passed 12/12.
- `npm.cmd run verify:entitlements`: passed 33/33.
- `npm.cmd run verify:roles`: passed 8/8.
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
- Customer Success / Guided Setup Phase 2.
- Billing / Plans Readiness Prep.
- Public SaaS Signup UX Phase 2.
- Package Upgrade / Locked State Polish.
- Advanced Reporting Prep.
- Enterprise Trust Prep.
- Demo pilot data cleanup.

If one of those areas comes up, first ask:

1. Is there a bug?
2. Is there a missing test?
3. Is there a narrow UX improvement?
4. Is it already covered and should we move on?

## Current Next Phase

### Field Ops Agent Phase 1 Read-Only Risk Summary - Awaiting Approval

Why this is next:

- Field Ops Agent Planning Checkpoint is documented in `docs/FIELD_OPS_AGENT_PLANNING_CHECKPOINT.md`.
- The approved-safe first build slice is read-only field execution risk visibility.
- This still touches employee accountability, so implementation should start only after the user approves the boundaries in the planning checkpoint.

Scope:

- Owner/admin company-level field execution risk summary.
- Foreman assigned-job reminders only.
- Employee personal assigned-task reminders only.
- Links to existing workflows.
- Existing upload GPS evidence status labels only, with no distance or location judgment.

Do not include:

- Billing.
- Customer portal.
- AI autopilot or automatic task completion.
- Automatic email/SMS sending.
- Automatic pricing approval.
- Automatic crew assignment without owner/admin review.
- Automatic material ordering.
- Direct customer communication.
- Job conversion.
- Enterprise SSO/MFA/SCIM.
- SOC 2 paperwork or public compliance claims.
- New analytics warehouse or schema rewrite.
- Field access to office/admin/pricing/trust controls.
- Broad redesigns of Command Center, Leads, Customers, Estimates, or Jobs.
- Autonomous field actions.
- Hidden GPS tracking.
- Automatic discipline, payroll, HR, legal, or punitive monitoring.
- Automatic employee messages or warnings.
- GPS distance flags before consent/settings/audit trail are approved and built.

Suggested verification:

- No-code planning checkpoint first.
- If approved later: `npm.cmd run verify:roles`, `npm.cmd run verify:time`, `npm.cmd run verify:jobs`, `npm.cmd run verify:daily-reports`, `npm.cmd run verify:uploads`, `npm.cmd run verify:safety`, mobile browser QA, and `git diff --check`.

## Next 10 Build Phases

| Order | Phase | Goal | Risk | User needed? |
| --- | --- | --- | --- | --- |
| 1 | Field Ops Agent Phase 1 read-only risk summary | Build only the approved read-only field-risk assistant slice. | High | Yes. |
| 2 | Advanced Reporting Prep Phase 2 | Expand only after KPI priorities are confirmed. | Medium | Yes. |
| 3 | Enterprise Trust Phase 2 | Continue trust work after audit/export/admin foundations are proven. | Medium | Maybe. |
| 4 | Billing / Manual Upgrade Prep | Plan Stripe/customer billing only after package UX and trust gates are clearer. | High | Yes. |
| 5 | Customer Portal Planning Checkpoint | Scope customer-facing approval/progress surfaces after reporting and trust are clearer. | High | Yes. |
| 6 | Assistant Material Planning Prep | Plan reviewed material calculations without autonomous pricing or ordering. | High | Yes. |
| 7 | Assistant Job Conversion Planning | Scope reviewed estimate-to-job assistant handoff without auto-assigning crews or ordering materials. | High | Yes. |
| 8 | Premium Demo Workspace Prep | Prepare a controlled Premium demo workspace if AI Rough Notes assistant commands need to be shown live. | Medium | Maybe. |
| 9 | Public Website / Sales Funnel Planning | Plan public marketing site and demo booking flow with no product auth/billing changes yet. | Medium | Yes. |
| 10 | Pilot Feedback Capture Phase 1 | Add structured pilot feedback capture after demos begin, without changing core workflows. | Medium | Maybe. |

## Later / Do Not Build Yet

Do not build these until the above phases are stronger:

- Payroll.
- Offline mode.
- Full customer portal.
- Stripe billing.
- Google Calendar/Gmail/QuickBooks/Twilio integrations.
- Automatic AI sending.
- AI ad publishing or spend.
- Hidden GPS tracking.
- Full website builder.
- Full automated PDF takeoff from blueprints.

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

Use this when ready to build the next product slice:

```text
You are entering:

APEX HQ - ASSISTANT COMMAND EXPANSION PHASE 2A

Use skills:
- apex-build-router
- apex-product-system
- apex-qa-engineer
- apex-estimate-proposal-system

Repo:
C:\Users\jberl\Documents\Codex\concrete-ops-2-clean

Do NOT redesign the app.
Do NOT rebuild the assistant shell, estimates, leads, jobs, field workflows, permissions, packages, or navigation.
Do NOT refactor architecture.
Do NOT add automatic email/SMS sending.
Do NOT add autonomous job creation, autonomous pricing approval, automatic crew assignment, material ordering, billing, Stripe, customer portal, offline mode, payroll, or AI autopilot.
Do NOT commit, push, or deploy.

Goal:
Build the first reviewed assistant command: lead/customer/rough-notes to clean estimate draft handoff.

Focus only on:
- assistant command parsing for lead/customer/estimate-draft intent
- visible lead/customer match handling
- review-before-save behavior
- existing AI Rough Notes handoff
- clean Estimates new-draft mode
- role/package safety

Preserve:
- existing Assistant Shell Phase 1
- existing lead/estimate/job workflows
- existing permissions and package gates
- existing field restrictions
- existing manual-send behavior

Verify:
- npm.cmd run build
- npm.cmd run verify:estimates
- npm.cmd run verify:leads
- verify:roles
- npm.cmd run verify:packages
- git diff --check

Report:
- root cause/gap addressed
- files changed
- exact behavior added
- role/package safety
- verification results
- safe to release yes/no
```
