# Apex HQ Phase 10 Public Launch 100 Status

Date: 2026-05-23
Status: complete for public launch readiness gates and fail-closed launch control
Public launch status: locked until production auth smoke passes on the real target

## Scope

Phase 10 is complete when Apex HQ has one clear public launch gate that proves the launch system is ready, shows every remaining human approval blocker, and refuses to treat the app as publicly launched until the real-world gates are complete.

This phase does not deploy production, enable public signup, change secrets, run production auth smoke, create customers, send customer messages, enable billing/payment, change Fly/Vercel/Supabase config, or mutate production data.

## Completed Scope

Built and verified:

- Public launch readiness gate exists as a read-only script.
- Launch gate separates:
  - launch readiness system ready
  - public launch ready
- Controlled pilot readiness is represented as a required gate.
- Support process readiness is represented as a required gate.
- Legal/privacy/terms/public-claims review is represented as a human approval gate.
- Production auth smoke and production release process are represented as required gates.
- Backup, restore, and monitoring evidence are represented as required gates.
- Self-serve launch smoke, signup, users, and build evidence are represented as required gates.
- Billing/payment boundary is represented as manual-launch ready while payment collection stays locked.
- Role, entitlement, field-user, and cross-company isolation checks are represented as required gates.
- Guided pilot completion requires the exact `GUIDED_PILOT_COMPLETION_RECORDED` phrase.
- Guided pilot waiver requires the exact `GUIDED_PILOT_WAIVED_FOR_LAUNCH` phrase.
- Legal/privacy/terms review requires the exact `LEGAL_PRIVACY_TERMS_REVIEW_RECORDED` phrase.
- Public launch requires the exact `PUBLIC_LAUNCH_SEPARATELY_APPROVED` phrase.
- The gate is fail-closed and read-only.

## Verification Evidence

Commands/checks run:

- `npm.cmd run verify:public-launch-readiness`
- `npm.cmd run verify:pilot-readiness`
- `npm.cmd run verify:self-serve-readiness`
- `npm.cmd run verify:billing-readiness`
- `npm.cmd run verify:monitoring`
- `npm.cmd run verify:roles`
- `npm.cmd run verify:users`
- `npm.cmd run verify:signup`
- `npm.cmd run verify:entitlements`
- `npm.cmd run verify:backup`
- `npm.cmd run verify:restore`
- `npm.cmd run verify:claims`
- `npm.cmd run launch:public-readiness -- --pilot-readiness-verified --self-serve-readiness-verified --production-release-process-verified --backup-verified --restore-verified --monitoring-verified --support-process-verified --billing-boundary-verified --claims-verified --roles-verified --users-verified --signup-verified --entitlements-verified --build-verified --no-field-role-leaks-verified --no-cross-company-leaks-verified --json`
- `npm.cmd run build`
- `git diff --check`

## Readiness Decisions

- Launch readiness system: GO with local/read-only evidence
- Launch readiness script result: `launchReadinessSystemReady=true`
- Public launch script result: `publicLaunchReady=false`
- Guided pilot: WAIVED with `GUIDED_PILOT_WAIVED_FOR_LAUNCH`
- Legal/privacy/terms review: recorded with `LEGAL_PRIVACY_TERMS_REVIEW_RECORDED`
- Explicit public launch approval: recorded with `PUBLIC_LAUNCH_SEPARATELY_APPROVED`
- Public launch: NO-GO
- Production auth smoke: NO-GO until `APEX_PRODUCTION_SMOKE_PASSWORD` is configured, the production auth smoke runs, and the smoke passes on the real production target
- Production deploy: NO-GO unless separately approved through the backup-first release checklist
- Public signup enablement: NO-GO unless separately approved
- Billing/payment collection: NO-GO unless separately approved

## What 100 Percent Means Here

Phase 10 is 100% for the public launch readiness system.

It means Apex HQ can now answer whether public launch is ready using one fail-closed gate, and it keeps public launch blocked until pilot, legal, production auth smoke, and explicit launch approvals are real.

It does not mean Apex HQ is publicly launched.

## Remaining Before Actual Public Launch

These are approval/execution gates, not Phase 10 build blockers:

1. Configure `APEX_PRODUCTION_SMOKE_PASSWORD` in GitHub Actions repository secrets without printing it.
2. Run approved production auth smoke on the real production target.
3. Capture a fresh backup and rollback release immediately before production action.
4. Approve public signup enablement on the intended production target.
5. Execute production launch only through the backup-first release checklist.

## Decision

Phase 10 is 100% for public launch readiness gates and launch control.

Guided pilot was explicitly waived and legal/public launch approvals were recorded. Public launch remains locked until production auth smoke passes on the real target and the backup-first release checklist is separately executed.
