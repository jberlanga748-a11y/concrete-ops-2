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

- Commit: `4cd51049ac2524df03d643437eb4b1c40623430e`
- Message: `Add Apex HQ watchtower missing work queue`
- Fly release: `v478`
- Image: `registry.fly.io/concrete-ops-2:deployment-01KRTTV1KNKJQQYHVY6KVB5XM9`
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

## Done / Do Not Rebuild

These systems exist and should not be rebuilt from scratch. Future work should extend, tighten, or polish them only when there is a clear workflow reason.

| System | Status | Notes |
| --- | --- | --- |
| Auth/login/logout/session basics | Done | Existing routes in `server/index.js`; session scoping exists. |
| Setup/bootstrap admin | Done | Preserve for private/empty installs. |
| Public signup/company creation | Done and verified | `/api/signup/company` creates company, first owner, default settings, and scoped session. Do not rebuild. |
| First owner onboarding foundation | Done | First owner gets onboarding state and support handoff. Extend later, do not restart. |
| User invite/activation/password reset | Built and verified | Token flow, expiry, single-use behavior, and company-scoped activation exist. Improve UX later only if needed. |
| Company/workspace foundations | Done | `companies`, `company_id`, company scoping helpers, company switching rules exist. Keep hardening route by route. |
| Demo vs real separation | Built and tested | Demo reset protections exist. Preserve. |
| Role permissions | Built and tested | Field users remain blocked from office/admin/pricing. Never loosen. |
| Package entitlement foundation | Done and released | Basic/Premium/Elite feature map, backend checks, frontend nav gates started. |
| Support / Help page | Done and released | Copy-only/manual support handoff exists. |
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
| Watchtower / Missing Work Agent Phase 1 | Built and released | Read-only Command Center missing-work queue exists. Do not turn it into autopilot without explicit Assistant phase controls. |
| Opportunity Scout foundation | Built and package-gated | Elite-only Lead Finder surfaces should stay gated. |
| Operations Command UX Upgrade Phase 1 | Built and released | Operations strip, operating plan, field execution, review/approve, billing readiness, and mobile KPI polish exist. |

## Recently Verified

Recent focused verification:

- `npm.cmd run verify:signup`: passed 36/36.
- `npm.cmd run verify:auth`: passed 24/24.
- `npm.cmd run verify:packages`: passed 11/11.
- `npm.cmd run verify:entitlements`: passed 32/32.
- `npm.cmd run verify:roles`: passed 8/8.
- `npm.cmd run build`: passed before latest release.
- Latest Command Center checks: `npm.cmd run verify:jobs`, `npm.cmd run verify:roles`, `npm.cmd run build`, browser owner/admin mobile/desktop QA, and field role safety QA passed.
- Communication Center release checks: `npm.cmd run build`, `npm.cmd run verify:customers`, `npm.cmd run verify:leads`, `npm.cmd run verify:jobs`, `npm.cmd run verify:roles`, and `git diff --check` passed.
- App Health / Audit Activity release checks: `npm.cmd run verify:server`, `npm.cmd run verify:roles`, `node --test src\owner-health-utils.test.js`, `npm.cmd run build`, and `git diff --check` passed.
- Watchtower / Missing Work Agent release checks: `npm.cmd run verify:jobs`, `npm.cmd run verify:daily-reports`, `npm.cmd run verify:uploads`, `npm.cmd run verify:delivery-tickets`, `npm.cmd run verify:roles`, `npm.cmd run build`, and `git diff --check` passed; release `v478` health-checked ready.

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

If one of those areas comes up, first ask:

1. Is there a bug?
2. Is there a missing test?
3. Is there a narrow UX improvement?
4. Is it already covered and should we move on?

## Current Next Phase

### Apex Assistant Shell Phase 1

Why this is next:

- Watchtower now gives Apex HQ a safe read-only source of operational recommendations.
- Contractors need one persistent assistant surface that can explain what needs attention and route them to existing workflows.
- This should be a shell and command/review surface only, not a full AI autopilot.

Scope:

- Persistent assistant entry point for owner/admin workspaces where permitted.
- Reuse Watchtower recommendations as assistant context.
- Provide safe quick prompts/actions that route to existing modules.
- Clearly label review-only/manual-first behavior.
- No automatic customer contact, schedule changes, job updates, sending, pricing changes, or field data exposure.

Do not include:

- Billing.
- Automatic email sending.
- Automatic SMS sending.
- Customer portal.
- AI autopilot or automatic task completion.
- Full visual redesign.
- Broad notification rebuild.
- Pricing/margin exposure to field users.

Suggested verification:

- `npm.cmd run build`
- `npm.cmd run verify:jobs`
- `npm.cmd run verify:roles`
- `git diff --check`

## Next 10 Build Phases

| Order | Phase | Goal | Risk | User needed? |
| --- | --- | --- | --- | --- |
| 1 | Apex Assistant Shell Phase 1 | Persistent in-app assistant shell with safe commands and review-only mode. | High | Yes. |
| 2 | Customer Success / Guided Setup Phase 2 | Turn first owner onboarding into a clearer guided setup checklist. | Medium | Maybe. |
| 3 | Billing / Plans Readiness Prep | Prepare plan limits/admin controls before Stripe. | High | Yes before any billing. |
| 4 | Public SaaS Signup UX Phase 2 | Tighten signup-to-setup path for real contractors without changing auth foundation. | Medium | Yes for onboarding expectations. |
| 5 | Package Upgrade / Locked State Polish | Make Basic/Premium/Elite boundaries clearer without adding billing. | Medium | Yes for packaging copy. |
| 6 | Advanced Reporting Prep | Define reporting surfaces before job-costing/payroll integrations. | Medium | Yes for KPI priorities. |
| 7 | Enterprise Trust Prep | Prepare audit/export/admin trust surfaces without overbuilding compliance. | Medium | No unless scope expands. |
| 8 | Pilot Browser QA Checkpoint | Run focused live-style owner/field demo QA before broader selling. | Medium | No unless blockers are found. |
| 9 | Mobile Field Trust Polish | Fix only proven mobile field friction found during QA. | Medium | Maybe. |
| 10 | Assistant Command Expansion Phase 2 | Add reviewed command flows after the shell is proven safe. | High | Yes. |

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

Use this when ready to build the next phase:

```text
You are entering:

APEX HQ - APEX ASSISTANT SHELL PHASE 1

Use skills:
- apex-build-router
- apex-product-system
- apex-saas-hardening
- apex-qa-engineer

Repo:
C:\Users\jberl\Documents\Codex\concrete-ops-2-clean

Do NOT redesign the app.
Do NOT rebuild customers, leads, estimates, jobs, notifications, Watchtower, or field workflows.
Do NOT refactor architecture.
Do NOT start billing, customer portal, offline mode, payroll, or AI autopilot.
Do NOT add automatic email or SMS sending.
Do NOT commit, push, or deploy.

Goal:
Create a persistent Apex Assistant shell that helps owners/admins understand what needs attention and route into existing workflows, using Watchtower as read-only context.

Focus only on:
- assistant entry point/shell
- safe prompt suggestions
- Watchtower context summary
- route-to-existing-module actions
- review-only/manual-first language
- role-safe visibility
- no automatic writes or sends

Preserve:
- existing customers/leads/estimates/jobs workflows
- existing permissions and package gates
- existing notifications/reminders
- existing field restrictions
- existing Watchtower derivation

Verify:
- build
- verify:jobs
- verify:roles
- git diff --check

Report:
- root cause/gaps found
- files changed
- exact fix
- verification results
- safe to release yes/no
```
