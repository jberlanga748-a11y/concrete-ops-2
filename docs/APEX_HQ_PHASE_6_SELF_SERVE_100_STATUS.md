# Apex HQ Phase 6 Self-Serve 100 Status

Date: 2026-05-23
Status: complete for controlled non-production self-serve readiness
Production status: public signup remains locked unless a separate backup-first production release is approved

## Scope

Phase 6 is complete when Apex HQ can prove that a real contractor-style company can sign up, create the first owner workspace, invite or manage users safely, complete onboarding signals, and start the first controlled workflow without leaking demo data, weakening roles, or enabling public production signup.

This phase does not enable public production self-serve, checkout, invoices, payment collection, self-serve plan changes, outbound emails/texts, customer messaging, or production database changes.

## Completed Scope

Built and verified:

- Public signup creates a new company, owner user, default settings, and scoped session when explicitly enabled.
- Signup remains fail-closed when public signup is disabled.
- Duplicate emails, weak passwords, and signup rate limits are covered by tests.
- New signup companies stay separated from demo/default workspace data.
- Demo reset cannot wipe real signup workspaces.
- Real signup users cannot switch into the default/demo workspace.
- Owner/admin onboarding signals include company profile, branding, trade/services, users, lead, estimate, job, and field proof readiness.
- Invite activation and password reset tokens are company-scoped, single-use, expiring, and safe-error oriented.
- Field users remain blocked from office/admin estimate and settings surfaces.
- Fake-company local sandbox can create a full disposable company workflow through public APIs.
- Local self-serve smoke can create a disposable contractor company, lead, estimate, job, report/proof/time context, and field-safety checks.
- Self-serve readiness gate now distinguishes:
  - controlled non-production readiness, which may use local disposable self-serve smoke evidence
  - public launch readiness, which still requires hosted smoke and explicit production/legal/signup approvals
- Manual billing boundary remains explicit: no checkout, invoices, payment collection, or self-serve plan changes.

## Verification Evidence

Commands/checks run:

- `node.exe --test --test-concurrency=1 scripts/self-serve-readiness.test.mjs scripts/self-serve-local-smoke.test.mjs scripts/fake-company-sandbox.test.mjs`
- `npm.cmd run verify:self-serve-readiness`
- `npm.cmd run verify:self-serve-local-smoke`
- `npm.cmd run verify:signup`
- `npm.cmd run verify:users`
- `npm.cmd run verify:roles`
- `npm.cmd run verify:backup`
- `npm.cmd run verify:restore`
- `npm.cmd run verify:claims`
- `npm.cmd run build`
- `git diff --check`
- `npm.cmd run launch:self-serve-readiness -- --signup-verified --users-verified --roles-verified --backup-verified --restore-verified --build-verified --claims-verified --local-self-serve-smoke-verified --support-owner="Apex HQ pilot operator" --monitoring-destination="Apex readiness/support runbook" --manual-billing-boundary-acknowledged --json`

Browser QA:

- Admin desktop `/settings`
- Employee phone `/settings`

Screenshot/manifests:

- `ui-audit/phase-6-self-serve/2026-05-23T06-22-17-512Z/manifest.json`
- `ui-audit/phase-6-self-serve/2026-05-23T06-21-31-328Z/manifest.json`

## What 100 Percent Means Here

Phase 6 is 100% for controlled non-production self-serve readiness.

It means Apex HQ has a tested path for enabling public signup on a safe local or approved non-production target, creating a new company workspace, onboarding the first owner, protecting demo-vs-real boundaries, and proving field-user restrictions.

It does not mean broad public production signup is enabled. Public production self-serve still requires hosted smoke, legal/privacy/public-claims review, support/monitoring readiness, backup-first production approval, and explicit signup enablement approval.

## Remaining After Controlled Non-Production 100

These are future production launch gates, not Phase 6 blockers:

1. Run hosted self-serve smoke on an approved non-production deployment after the next deploy.
2. Configure production synthetic auth/self-serve smoke credentials without real customer mutation.
3. Complete legal/privacy/terms review for public signup positioning.
4. Approve backup-first production release and explicit `PUBLIC_SIGNUP_ENABLED` production enablement.
5. Add production monitoring alerts around signup, login, bootstrap, setup status, and readiness.

## Decision

Phase 6 is 100% for controlled non-production self-serve SaaS readiness.

Next recommended phase: Phase 7 production and monitoring readiness, unless the immediate priority is committing and hosted demo-smoking the accumulated Phase 2-6 work.
