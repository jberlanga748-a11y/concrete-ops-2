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
- Field Ops Agent Phase 1 read-only summary: built, verified, released, and health-checked.
- Advanced Reporting Prep Phase 2: built, verified, released, and health-checked.
- Enterprise Trust Phase 2: built, verified, released, and health-checked.
- Billing / Manual Upgrade Prep Phase 1: built, verified, released, and health-checked.
- Pilot Feedback Capture Phase 1: built, verified, released, and health-checked.
- Customer Portal Phase 1 Manual Approval Preview: built, verified, released, and health-checked.
- Invite / Activation UX Polish: built locally, not released.
- Premium finished SaaS polish: still in progress.

## Latest Released App State

Latest release tracked in this file:

- Commit: `c1e66f0`
- Message: `Add pilot readiness preview batch`
- Fly release: `v495`
- Image: `registry.fly.io/concrete-ops-2:deployment-01KRVS86NP8K4J3QNT3XCN8RPF`
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
| `666a2a6` | `v491` | Field Ops Agent Phase 1 read-only assistant |
| `4648e70` | `v492` | Advanced Reporting Prep Phase 2 |
| `0da4e5e` | `v493` | Enterprise Trust Phase 2 |
| `f604949` | `v494` | Billing / Manual Upgrade Prep Phase 1 |
| `c1e66f0` | `v495` | Pilot readiness preview batch |

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
| Customer Portal Planning Checkpoint | Prepared and released | `docs/CUSTOMER_PORTAL_PLANNING_CHECKPOINT.md` defines the no-build decision, Elite package boundary, owner/admin manual approval preview direction, field/customer/support restrictions, customer-visible content rules, auth/data/audit requirements, and a future implementation prompt. |
| Assistant Material Planning Prep | Prepared and released | `docs/ASSISTANT_MATERIAL_PLANNING_PREP.md` defines the reviewed material planning assistant boundary, Premium-and-up package policy, allowed source data, role restrictions, negative tests, and no-ordering/no-pricing/no-job-conversion rules. |
| Assistant Job Conversion Planning | Prepared and released | `docs/ASSISTANT_JOB_CONVERSION_PLANNING.md` defines the reviewed estimate-to-job assistant handoff boundary, Premium-and-up package policy, approved-estimate source rules, role restrictions, negative tests, and no-automatic-job-creation/scheduling/crew-assignment rules. |
| Public Website / Sales Funnel Planning | Prepared and released | `docs/PUBLIC_WEBSITE_SALES_FUNNEL_PLANNING.md` defines the claims-safe public website and founder-led demo funnel boundary, manual demo-interest capture, no-self-serve signup/billing/package-management rules, auth separation, follow-up limits, and future implementation prompt. |
| Invite / Activation UX Polish | Built locally, not released | Owner/admin Employees now clarifies manual activation handoff, one-time invite links, expiry/reissue expectations, and field-safe role boundaries. Activation setup explains missing/expired/used invite links without changing token, session, password, role, or company-scope behavior. |
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
| Enterprise Trust Phase 2 | Built and released | Owner/admin trust readiness now includes a copy-only pilot trust review packet, next trust actions, and explicit claims guardrails using existing audit/export/health/support data only. Field users remain blocked. |
| Guided Demo Launch Readiness | Rehearsed | Live v487 owner/admin and field browser rehearsal passed with no P0/P1 blockers, no console/API failures, no horizontal overflow, and role-safe field routes. |
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
- Invite / Activation UX Polish local focused checks: `node --test --test-concurrency=1 server\users-management.test.js src\navigation-utils.test.js` passed. Not released.

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

### Invite / Activation UX Polish - Built Locally, Release Pending

Why this is current:

- Premium Demo Workspace Prep Phase 1, Pilot Feedback Capture Phase 1, Customer Portal Phase 1 Manual Approval Preview, and related planning docs were released in Fly `v495`.
- Invite / Activation UX Polish is now built locally and should be verified fully before release.
- The next app phase after release is a guided demo rehearsal refresh.

Scope completed locally:

- Improved invite/activation copy, empty states, and handoff clarity.
- Preserved existing invite, activation, password reset, role, and company-scope logic.
- Kept owner/admin user-management visibility role-safe.
- Added direct API tests for field-user restrictions on user-management and invite actions.

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
- Field access to owner/admin plans, pricing, export, billing, or settings data.
- Auth/session rewrites.
- Public signup changes.
- Invite email automation.
- New roles or permission broadening.

Suggested verification:

- `npm.cmd run build`
- `npm.cmd run verify:users`
- `npm.cmd run verify:auth`
- `npm.cmd run verify:roles`
- `git diff --check`

## Next Build Phases

| Order | Phase | Goal | Risk | User needed? |
| --- | --- | --- | --- | --- |
| 1 | Invite / Activation UX Polish release | Release the built local invite/activation polish after full verification. | Medium | Yes, release approval. |
| 2 | Guided Demo Rehearsal Refresh | Re-run a focused owner/field demo walkthrough after the next product batch. | Low | Maybe. |

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

## Recommended Release Prompt

Use this when ready to release the built local invite/activation polish:

```text
release
```

After this release is health-checked, the next product prompt should be:

```text
You are entering:

APEX HQ - GUIDED DEMO REHEARSAL REFRESH

Use skills:
- apex-build-router
- apex-product-system
- apex-permission-safety
- apex-qa-engineer

Repo:
C:\Users\jberl\Documents\Codex\concrete-ops-2-clean

Do NOT commit, push, or deploy.

Goal:
Rehearse the current guided demo path after the latest product batch and invite/activation polish.

Focus only on:
- owner/admin desktop guided demo path
- owner mobile sanity path
- foreman and employee mobile role-safety checks
- estimates/proposals, support/trust, package upgrade, and invite activation handoff checks
- console/network/horizontal-overflow review

Preserve:
- existing app behavior and data
- existing auth/session/package/role logic
- no production data mutation

Verify:
- npm.cmd run verify:roles
- npm.cmd run verify:demo
- git diff --check

Report:
- demo paths checked
- role-safety result
- console/network/overflow result
- blockers
- release/no-release recommendation
```
