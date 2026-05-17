# Apex HQ Status

Last updated: 2026-05-17

This is the short agent handoff board. The full phase source of truth is `docs/APEX_HQ_BUILD_STATUS_AND_PHASES.md`.

## Current Baseline

- Current repo: `jberlanga748-a11y/concrete-ops-2`
- Current local folder: `C:\Users\jberl\Documents\Codex\concrete-ops-2-clean`
- Branch: `main`
- Latest shipped app commit: `e77e9cadbc9ea8bce5f45979f354399b93bb08ad`
- Latest shipped message: `Add Apex HQ app health audit review`
- Latest Fly release: `v477`
- Latest image: `registry.fly.io/concrete-ops-2:deployment-01KRTSY9VB0D61E2SKT6G3W0D9`
- Latest health checks: `https://app.apexhq.online/api/ready` and `https://concrete-ops-2.fly.dev/api/ready` returned ready with database ok.

## Current Product State

Apex HQ is guided-pilot ready for controlled demos and founder-led onboarding.

Do not position it as wide public self-serve SaaS yet, even though public signup foundations exist. Public launch still needs stronger onboarding, customer success process, and continued route/package hardening discipline.

## Completed / Do Not Rebuild

- Public signup/company creation.
- First owner creation and scoped session.
- First owner onboarding/support handoff.
- Invite activation/password reset foundation.
- Company isolation foundation and tests.
- Demo-vs-real separation safeguards.
- Basic/Premium/Elite package entitlement foundation.
- Support/help page and package gate.
- Core field operations tightening phases.
- Schedule/today work coordination.
- Notifications/reminders foundation.
- Estimate AI Rough Notes foundation.
- Company branding / proposal identity.
- Estimate options, reference attachments, and takeoff input foundations.
- GC/customer packet and foreman handoff packet split.
- Operations Command UX Upgrade Phase 1.
- Command Center mobile KPI polish.
- Communication Center Phase 1.
- App Health / Audit Activity Phase 1.

## Current Verified Checks

- `npm.cmd run verify:signup`: passed 36/36.
- `npm.cmd run verify:auth`: passed 24/24.
- `npm.cmd run verify:packages`: passed 11/11.
- `npm.cmd run verify:entitlements`: passed 32/32.
- `npm.cmd run verify:roles`: passed 8/8.
- Latest Command Center release checks: `npm.cmd run build`, `npm.cmd run verify:jobs`, `npm.cmd run verify:roles`, and `git diff --check` passed.
- Communication Center release checks: `npm.cmd run build`, `npm.cmd run verify:customers`, `npm.cmd run verify:leads`, `npm.cmd run verify:jobs`, `npm.cmd run verify:roles`, and `git diff --check` passed.
- App Health / Audit Activity release checks: `npm.cmd run verify:server`, `npm.cmd run verify:roles`, `node --test src\owner-health-utils.test.js`, `npm.cmd run build`, and `git diff --check` passed.
- Watchtower / Missing Work Agent Phase 1 local checks: `npm.cmd run verify:jobs`, `npm.cmd run verify:daily-reports`, `npm.cmd run verify:uploads`, `npm.cmd run verify:delivery-tickets`, `npm.cmd run verify:roles`, `npm.cmd run build`, and `git diff --check` passed.

## Next Recommended Phase

Release Watchtower / Missing Work Agent Phase 1.

Goal:

- commit, push, deploy, and health-check the verified Watchtower work
- preserve the docs/status changes in the same release if approved
- do not start Apex Assistant Shell until this verified phase is shipped

Do not include:

- billing
- payroll
- customer portal
- offline mode
- AI autopilot
- automatic email sending
- automatic SMS/email sending
- public customer messaging
- AI autopilot or automatic task completion

## Next Phase After That

Apex Assistant Shell Phase 1.

Goal:

- add a persistent in-app assistant shell with safe, review-only command paths
- preserve all human approval gates before send, schedule, pricing, job, crew, or customer actions
- reuse Watchtower recommendations instead of inventing separate assistant state

## Active Skills

Use these for Apex HQ work:

- `apex-build-router`
- `apex-product-system`
- `apex-saas-hardening`
- `apex-estimate-proposal-system`
- `apex-qa-engineer`
- `apex-release-manager` only for commit/push/deploy/health-check work
- `apex-finished-vision` for premium SaaS north-star UX

## Release Rules

- Use explicit file paths when staging.
- Never use broad `git add .`.
- Do not stage unrelated docs/skills during app releases.
- Run focused checks for the phase.
- Deploy only after verification passes and the user approves release.
