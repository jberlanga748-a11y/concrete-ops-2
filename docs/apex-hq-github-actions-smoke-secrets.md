# Apex HQ GitHub Actions Smoke Secrets

Status: Phase 1 demo smoke secret runbook

Purpose: safely enable scheduled hosted auth smoke checks without storing demo credentials in the repo, docs, logs, or chat.

## Scope

This runbook covers only the GitHub Actions secret used by demo hosted smoke:

- secret name: `APEX_SMOKE_PASSWORD`
- workflow: `.github/workflows/demo-hosted-smoke.yml`
- target: `https://concrete-ops-demo.fly.dev`
- account set: seeded demo admin and employee users

This does not enable production auth smoke. Production auth smoke requires a separate production-safety approval because it creates login/session/audit side effects against production.

## What The Secret Does

When `APEX_SMOKE_PASSWORD` is configured, the scheduled demo hosted smoke workflow runs:

```powershell
npm run smoke:hosted -- --base-url=https://concrete-ops-demo.fly.dev --allow-auth --json
```

That verifies:

- demo admin login
- demo employee login
- `/api/bootstrap` latency budget
- employee restricted API checks
- role-safe office route behavior where covered by the hosted smoke script

If the secret is missing, the workflow still runs non-auth route and readiness smoke, then safely skips auth smoke.

## Safety Rules

Do not:

- commit the smoke password
- paste the smoke password into docs, issues, chat, or incident notes
- store the password in `.env` committed to git
- use a production customer password
- use an owner/operator personal password
- reuse the password for anything outside the demo smoke users
- configure production auth smoke without explicit production-safety approval

Allowed:

- store the value as a GitHub Actions repository secret
- keep the local value in the operator's shell only when manually running smoke
- rotate the demo smoke password if it appears in logs or chat

## Set Or Update The GitHub Secret

From the repo root, use GitHub CLI:

```powershell
gh auth status
gh secret set APEX_SMOKE_PASSWORD --repo jberlanga748-a11y/concrete-ops-2
```

Paste the demo smoke password only into the GitHub CLI secret prompt. Do not echo it into the terminal.

If the password is already in a local environment variable for the current shell:

```powershell
gh secret set APEX_SMOKE_PASSWORD --repo jberlanga748-a11y/concrete-ops-2 --body $env:APEX_SMOKE_PASSWORD
```

Use this only when the shell is trusted and not being recorded.

## Verify The Secret Is Present

GitHub does not show secret values. It can show that a secret exists:

```powershell
gh secret list --repo jberlanga748-a11y/concrete-ops-2
```

Expected:

```text
APEX_SMOKE_PASSWORD
```

## Run A Manual Workflow Check

After setting the secret:

```powershell
gh workflow run "Apex HQ Demo Hosted Smoke" --repo jberlanga748-a11y/concrete-ops-2 --ref main
gh run list --repo jberlanga748-a11y/concrete-ops-2 --workflow "Apex HQ Demo Hosted Smoke" --limit 3
```

Open or inspect the latest run:

```powershell
gh run view <run-id> --repo jberlanga748-a11y/concrete-ops-2 --log
```

Pass criteria:

- non-auth smoke passes
- auth smoke does not print "APEX_SMOKE_PASSWORD is not configured"
- admin login/bootstrap checks pass
- employee login/bootstrap checks pass
- employee restricted API checks return expected denials
- `/api/ready`, login, and bootstrap stay under the hosted smoke latency budgets

## Rotation

Rotate the demo smoke password when:

- the value is pasted into chat, docs, an issue, or logs
- a team member with access leaves
- demo users are reseeded
- a pilot switches from demo-only walkthroughs to customer-specific data

Rotation steps:

1. Change the demo smoke user password through the approved demo user/password process.
2. Update the GitHub Actions secret with `gh secret set APEX_SMOKE_PASSWORD`.
3. Run the manual workflow check.
4. Run local hosted auth smoke if the new value is available in the shell.

Local check:

```powershell
$env:APEX_SMOKE_PASSWORD="<new demo smoke password>"
npm.cmd run smoke:hosted -- --base-url=https://concrete-ops-demo.fly.dev --allow-auth --json
```

Do not write the real password into this document.

## Failure Handling

If scheduled auth smoke fails:

1. Confirm demo readiness:

```powershell
Invoke-RestMethod https://concrete-ops-demo.fly.dev/api/ready
fly checks list -a concrete-ops-demo
```

2. Confirm the secret exists:

```powershell
gh secret list --repo jberlanga748-a11y/concrete-ops-2
```

3. Run local skip-auth smoke:

```powershell
npm.cmd run smoke:hosted -- --base-url=https://concrete-ops-demo.fly.dev --skip-auth --json
```

4. If skip-auth passes but auth fails, treat it as a demo auth/bootstrap issue or stale smoke password.

5. If login/bootstrap latency exceeds budget, do not only raise timeouts. Inspect session writes, SQLite locking, bootstrap payload size, Fly health checks, and demo logs.

## Production Boundary

Do not add a production smoke password, production login user, or production auth workflow from this runbook.

Production auth smoke needs:

- explicit approval
- dedicated smoke user
- defined audit/session side effects
- backup/rollback awareness
- production incident response owner
- documented go/no-go gate
