# Apex HQ Phase 7 Production And Monitoring 100 Status

Date: 2026-05-23
Status: complete for production-readiness process and controlled release gates
Production status: locked unless a separate backup-first production release is explicitly approved

## Scope

Phase 7 is complete when Apex HQ has a boring, observable, reversible, and supportable production release process.

This phase does not deploy production, create production smoke users, set secrets, configure paid monitoring, create log drains, change Fly production config, enable public signup, or mutate customer data.

## Completed Scope

Built and verified:

- `/api/ready` and `/api/health` are the release health anchors.
- Backup export verification exists.
- Local restore drill verification exists.
- Release and rollback checklist identifies production app, config, volume, readiness checks, rollback triggers, and rollback commands.
- Fly demo and Fly production are documented as separate paths.
- Vercel remains preview-only and not the production backend.
- Production auth smoke has a manual fail-closed GitHub workflow.
- Production auth smoke readiness helper verifies:
  - manual dispatch only
  - no schedule
  - production-only secret name
  - no demo smoke secret reuse
  - approved production URLs only
  - explicit production-auth opt-in
  - dedicated synthetic production smoke emails
  - no deploy or mutation-capable scripts
- Monitoring upgrade readiness helper verifies provider, alert destination, retention, access owner, redaction, request-ID search, error alerts, and demo-first rollout.
- Launch gate status combines claims, production auth readiness, monitoring readiness, and pilot handoff posture.
- Production release gate now separates:
  - release process ready
  - production deploy ready
- Production release gate requires build, roles, server, backup, restore, monitoring, production-auth readiness, target app/config, backup artifact, rollback release, rollback owner, support owner, and incident destination before the process can go green.
- Production deploy remains blocked until hosted smoke, approved production auth smoke, and exact backup-first production release approval are recorded.

## Verification Evidence

Commands/checks run:

- `npm.cmd run verify:monitoring`
- `npm.cmd run verify:production-auth-smoke-readiness`
- `npm.cmd run launch:production-release-gate -- --build-verified --roles-verified --server-verified --backup-verified --restore-verified --monitoring-verified --production-auth-readiness-verified --target-app=concrete-ops-2 --fly-config=fly.toml --support-owner="Apex HQ pilot operator" --rollback-owner="Apex HQ pilot operator" --backup-artifact="verified-local-backup-artifact" --rollback-release="last-known-good-release-required-before-deploy" --incident-destination=github-issues --json`
- `npm.cmd run verify:server`
- `npm.cmd run verify:roles`
- `npm.cmd run verify:backup`
- `npm.cmd run verify:restore`
- `npm.cmd run build`
- `git diff --check`

Readiness decisions:

- Production auth smoke workflow guardrails: PASS
- Production auth smoke readiness: NO-GO until `APEX_PRODUCTION_SMOKE_PASSWORD`, synthetic smoke users/workspace, production-safety approval, and manual dispatch confirmation are approved
- Production release process: GO with local evidence
- Production deploy: NO-GO until hosted smoke, approved production auth smoke, and exact backup-first production release approval are recorded

## What 100 Percent Means Here

Phase 7 is 100% for the production-readiness process.

It means Apex HQ has a tested gate that can tell the operator whether the release process is ready and whether production deploy is still locked. It also means monitoring, auth smoke, backup, restore, support owner, rollback owner, target app/config, and incident path are all represented in local fail-closed checks.

It does not mean production was deployed or that public production launch is approved.

## Remaining Before Actual Production Deploy

These are approval/execution gates, not Phase 7 build blockers:

1. Capture a real production backup artifact immediately before the approved deploy.
2. Identify the real last known-good Fly release/image immediately before deploy.
3. Confirm production health and Fly checks immediately before deploy.
4. Approve or create dedicated synthetic production smoke workspace/users.
5. Store `APEX_PRODUCTION_SMOKE_PASSWORD` in GitHub Actions repository secrets without printing it.
6. Run approved production auth smoke.
7. Record exact `BACKUP_FIRST_PRODUCTION_RELEASE_APPROVED` approval.
8. Execute Fly production deploy only after a separate explicit approval.

## Decision

Phase 7 is 100% for production and monitoring readiness architecture.

Production deploy remains locked unless approved through the backup-first release checklist.
