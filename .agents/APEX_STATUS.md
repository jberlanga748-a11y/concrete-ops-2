# Apex HQ Status

Last updated: 2026-05-17

This is the short agent handoff board. The full phase source of truth is `docs/APEX_HQ_BUILD_STATUS_AND_PHASES.md`.

## Current Baseline

- Current repo: `jberlanga748-a11y/concrete-ops-2`
- Current local folder: `C:\Users\jberl\Documents\Codex\concrete-ops-2-clean`
- Branch: `main`
- Latest shipped app commit: `5b6426ffa55f75f488a4ac7476a13f0cda7c13de`
- Latest shipped message: `Polish Apex HQ command center mobile KPIs`
- Latest Fly release: `v475`
- Latest image: `registry.fly.io/concrete-ops-2:deployment-01KRTR56RQNC8CZC3JKTHP4ACM`
- Latest health checks: `https://app.apexhq.online/api/ready` and `https://concrete-ops-2.fly.dev/api/ready` returned ready with database ok.

## Current Product State

Apex HQ is guided-pilot ready for controlled demos and founder-led onboarding.

Do not position it as wide public self-serve SaaS yet, even though public signup foundations exist. Public launch still needs stronger onboarding, branding/proposal identity, customer success process, and continued route/package hardening discipline.

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

## Current Verified Checks

- `npm.cmd run verify:signup`: passed 36/36.
- `npm.cmd run verify:auth`: passed 24/24.
- `npm.cmd run verify:packages`: passed 11/11.
- `npm.cmd run verify:entitlements`: passed 32/32.
- `npm.cmd run verify:roles`: passed 8/8.
- Latest Command Center release checks: `npm.cmd run build`, `npm.cmd run verify:jobs`, `npm.cmd run verify:roles`, and `git diff --check` passed.

## Next Recommended Phase

Communication Center Phase 1.

Goal:

- add a manual-first communication log for customers, leads, jobs, and estimates
- preserve existing contact history patterns where possible
- keep notes/comments role-safe and company-scoped
- support owner/admin review without adding SMS/email automation

Do not include:

- billing
- payroll
- customer portal
- offline mode
- AI autopilot
- automatic email sending
- automatic SMS/email sending
- public customer messaging

## Next Phase After That

App Health / Audit Activity Phase 1.

Goal:

- improve operational trust with clearer app health, audit/activity visibility, and support diagnostics
- keep owner/operator visibility separate from field workflows
- avoid overbuilding SOC 2/compliance paperwork before the core trust layer is in place

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
