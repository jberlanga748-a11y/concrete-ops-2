# Apex HQ Production Auth Smoke Design

Status: manual workflow added, not scheduled, approved for manual production smoke with dedicated admin, foreman, and employee smoke users

Purpose: define how Apex HQ can add production login/bootstrap smoke safely when the business is ready, without weakening auth, roles, package gates, tenant isolation, or production data boundaries.

## Current Boundary

Production auth smoke is enabled only as an approval-gated manual GitHub Actions workflow. It is not scheduled and must keep using dedicated smoke users plus the separate `APEX_PRODUCTION_SMOKE_PASSWORD` secret.

Current safe coverage:

- GitHub Actions readiness monitor checks production `/api/ready`.
- Fly service checks hit production `/api/ready`.
- Hosted smoke can check production health and routes with `--skip-auth`.
- The approved manual production auth smoke checks admin, foreman, and employee login/bootstrap plus field-role restricted API denials.
- Demo hosted smoke runs auth/bootstrap checks against `https://concrete-ops-demo.fly.dev` using the GitHub Actions `APEX_SMOKE_PASSWORD` secret.
- `scripts/hosted-smoke.mjs` refuses production auth unless `--allow-production-auth` is passed.

This design does not authorize a production deploy, scheduled workflow, monitoring vendor, customer data mutation, or non-smoke user access.

## Why Production Auth Smoke Is Risky

Production auth smoke creates real production side effects:

- login sessions
- auth audit events
- request logs
- possible rate-limit or account-lockout noise
- support confusion if the smoke account resembles a real customer user

It must never use:

- an owner/operator personal account
- a customer account
- a demo user in production
- a shared password pasted into docs, chat, issues, or logs
- a field user with broader access than the role being tested

## Required Smoke User Model

Create dedicated production smoke users only after approval.

Recommended users:

| User | Role | Purpose | Required restrictions |
| --- | --- | --- | --- |
| `smoke.admin@apexhq.app` | admin | prove production login/bootstrap and office shell load | no real customer ownership, no destructive workflow use |
| `smoke.foreman@apexhq.app` | foreman | prove field-lead login/bootstrap and restricted API denial | assigned only to safe synthetic work, no office/admin access |
| `smoke.employee@apexhq.app` | employee | prove field login/bootstrap and restricted API denial | assigned only to safe synthetic work, no office/admin access |

Recommended workspace:

- a dedicated synthetic smoke workspace or company
- no real customer records
- no production pilot records
- no billing/payment data
- no active job commitments
- clearly named as smoke-only in admin records

Do not attach smoke users to a real pilot company unless a production-safety review explicitly approves that tradeoff.

## Secret Model

Use a separate GitHub Actions secret for production smoke:

```text
APEX_PRODUCTION_SMOKE_PASSWORD
```

Do not reuse the demo `APEX_SMOKE_PASSWORD` secret.

Secret rules:

- store only in GitHub Actions repository secrets or an approved secrets manager
- rotate after any exposure or smoke-user reseed
- never print, echo, commit, or paste the value
- never put the value in `.env` files committed to git
- never use the value for customer or operator accounts

## Proposed Command

Manual, approval-only production auth smoke:

```powershell
$env:APEX_PRODUCTION_SMOKE_PASSWORD="<production smoke password>"
npm.cmd run smoke:hosted -- --base-url=https://app.apexhq.online --allow-auth --allow-production-auth --password-env=APEX_PRODUCTION_SMOKE_PASSWORD --roles=admin,foreman,employee --admin-email=smoke.admin@apexhq.app --foreman-email=smoke.foreman@apexhq.app --employee-email=smoke.employee@apexhq.app --json
```

Production health/route-only smoke remains allowed without auth:

```powershell
npm.cmd run smoke:hosted -- --base-url=https://app.apexhq.online --skip-auth --json
```

## Pass Criteria

Production auth smoke passes only when:

- `/api/health` returns `200`
- `/api/ready` returns `200` and database `ok`
- admin smoke login succeeds
- admin bootstrap succeeds within the hosted smoke budget
- foreman smoke login succeeds
- foreman bootstrap succeeds within the hosted smoke budget
- foreman restricted API checks return `403`
- employee smoke login succeeds
- employee bootstrap succeeds within the hosted smoke budget
- employee restricted API checks return `403`
- no customer data is created, changed, exported, messaged, or deleted
- Fly logs show no repeated auth, SQLite, bootstrap, or 5xx errors during the smoke window

## Stop Conditions

Stop and do not schedule production auth smoke when:

- no dedicated smoke workspace exists
- smoke users share a password with demo, operator, or customer users
- smoke users are tied to live customer data
- login/bootstrap exceeds latency budgets twice in a row
- employee restricted APIs do not return `403`
- production readiness is flapping
- backup/rollback path is unknown before a release
- the smoke workflow would run against production without explicit approval

## Suggested Workflow Shape

The production auth smoke workflow is separate from demo smoke:

```text
.github/workflows/production-auth-smoke.yml
```

Current behavior:

- manual dispatch only
- no schedule
- requires the exact `PRODUCTION_AUTH_SMOKE_APPROVED` confirmation phrase
- only allows `https://app.apexhq.online` or `https://concrete-ops-2.fly.dev`
- requires `APEX_PRODUCTION_SMOKE_PASSWORD`
- uses production smoke emails explicitly
- passes `--allow-production-auth`
- writes a GitHub Actions summary
- opens or updates a GitHub issue on failure
- closes the issue after recovery
- does not deploy, mutate app data, toggle packages, or clean records

The workflow is fail-closed. It stops before auth smoke when the confirmation phrase, approved production URL, or production-only secret is missing. As of May 30, 2026, `APEX_PRODUCTION_SMOKE_PASSWORD` is configured for this repository and the dedicated production smoke users are approved.

Do not run mutation-capable Opportunity Scout, package toggles, cleanup, public intake, upload, invite, password reset, or export scripts against production from this workflow.

## Approval Checklist

Before enabling:

- run the local read-only readiness check:

```powershell
npm.cmd run verify:production-auth-smoke-readiness
```

For a read-only production `/api/ready` confirmation in the same report:

```powershell
npm.cmd run verify:production-auth-smoke-readiness -- --check-live
```

- After the smoke workspace/users, production-safety approval, and manual dispatch approval are recorded, the read-only readiness check can be run in its final gate form:

```powershell
npm.cmd run verify:production-auth-smoke-readiness -- --check-live --smoke-users-approved --production-safety-approved --dispatch-confirmation=PRODUCTION_AUTH_SMOKE_APPROVED
```

The approval flags only record that the operator has completed those external gates. They do not create users, set secrets, dispatch the workflow, authenticate, deploy, or mutate production.

Do not use `--skip-gh` for the final approval gate. Production auth readiness must verify that `APEX_PRODUCTION_SMOKE_PASSWORD` exists by name before the manual workflow is dispatched.

- production smoke workspace/company approved
- admin, foreman, and employee smoke users approved
- role restrictions verified locally or in a one-time manual production check
- `APEX_PRODUCTION_SMOKE_PASSWORD` stored as a GitHub Actions secret
- incident owner named
- failure issue title and triage commands agreed
- rollback and backup path known for the current production release
- production-safety approval recorded in the release notes or build tracker

## Rollback / Disable Plan

If production auth smoke causes noise or risk:

1. Disable the scheduled workflow or remove the secret.
2. Confirm no active workflow run is in progress.
3. Rotate the production smoke password if exposure is suspected.
4. Review audit/session records created by the smoke account.
5. Record the incident or decision in `docs/apex-hq-incident-notes-log.md`.

## Production Boundary

This document is a design and approval checklist only. It does not create smoke users, set secrets, enable production auth smoke, change auth logic, change packages, change roles, deploy production, or authorize production monitoring expansion.

The readiness helper is also read-only. It checks workflow guardrails, optional GitHub secret presence by name only, optional `/api/ready`, approved URL posture, and remaining approval blockers. It does not run login, create sessions, dispatch the workflow, write secrets, create users, deploy, touch Fly, or mutate production data.
