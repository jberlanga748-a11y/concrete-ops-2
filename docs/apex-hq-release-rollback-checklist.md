# Apex HQ Release And Rollback Checklist

Status: Phase 1 production-safety checklist

Purpose: keep Apex HQ releases small, reversible, and explicit about preview, demo, pilot, and production targets.

## Deployment Targets

Production:

- Provider: Fly.io
- Fly app: `concrete-ops-2`
- Public URL: `https://app.apexhq.online/`
- Fly URL: `https://concrete-ops-2.fly.dev/`
- Config: `fly.toml`
- Region: `sjc`
- Runtime data path: `/app/data`
- Mounted production volume: `concrete_ops_data`
- Readiness endpoint: `/api/ready`
- Production must keep `SEED_DEMO_DATA=false`
- Production must keep `DEMO_MODE` off

Demo:

- Provider: Fly.io
- Fly app: `concrete-ops-demo`
- Config: `fly.demo.toml`
- Mounted demo volume: `concrete_ops_demo_data`
- Demo intentionally uses `DEMO_MODE=true`
- Demo intentionally uses `SEED_DEMO_DATA=true`

Vercel:

- Preview-only static frontend
- Builds `dist` with `npm run build`
- SPA fallback routes to `/index.html`
- `/api/*` rewrites to the demo Fly backend
- Vercel is not the production backend

## Pre-Release Checklist

Before any production deploy:

- Confirm the repo path is `C:\Users\jberl\Documents\Codex\concrete-ops-2-clean`.
- Confirm the current branch.
- Confirm the latest commit.
- Confirm `git status --short`.
- Resolve or intentionally exclude unrelated dirty files.
- Confirm the target is Fly production, not Vercel preview.
- Confirm `fly.toml` still targets `concrete-ops-2`.
- Confirm production volume `concrete_ops_data` exists.
- Confirm `SEED_DEMO_DATA=false`.
- Confirm `DEMO_MODE` is not enabled.
- Confirm no database migrations, secrets, auth, permission, billing, or customer-data changes are hidden in the diff.

Minimum local checks:

```powershell
npm.cmd run build
npm.cmd run verify:roles
npm.cmd run verify:demo
npm.cmd run verify:server
npm.cmd run verify:backup
npm.cmd run verify:restore
git diff --check
```

Add focused checks based on the change:

- Auth or setup: `npm.cmd run verify:auth`, `npm.cmd run verify:signup`
- Users/company scope: `npm.cmd run verify:users`
- Packages/entitlements: `npm.cmd run verify:packages`, `npm.cmd run verify:entitlements`
- Jobs/field: `npm.cmd run verify:jobs`, `npm.cmd run verify:field-workspaces`
- Reports/uploads/time/safety: matching `verify:*` script
- UI/mobile: visual audit scripts

## Preview Checklist

Use Vercel preview for frontend smoke and direct-route checks.

Preview expectations:

- `/` returns app shell
- direct app routes return the SPA, not 404
- `/api/*` calls proxy to the Fly demo API
- preview data is demo data, not production data

Do not treat Vercel preview as production backend proof.

## Fly Demo Deploy Checklist

Use Fly demo for founder walkthroughs, synthetic Opportunity Scout acceptance, and demo-only package checks.

Before demo deploy:

```powershell
git status --short
git rev-parse HEAD
npm.cmd run build
npm.cmd run verify:roles
npm.cmd run verify:demo
npm.cmd run verify:restore
Invoke-RestMethod https://concrete-ops-demo.fly.dev/api/ready
fly status -a concrete-ops-demo
fly checks list -a concrete-ops-demo
fly machine exec 784192dc275318 -a concrete-ops-demo --timeout 120 "sh -lc 'cd /app && node server/backup-export.js'"
```

Deploy demo only:

```powershell
fly deploy --config fly.demo.toml --app concrete-ops-demo
```

After demo deploy:

```powershell
Invoke-RestMethod https://concrete-ops-demo.fly.dev/api/ready
npm.cmd run smoke:hosted -- --base-url=https://concrete-ops-demo.fly.dev --allow-auth --json
```

For Opportunity Scout demo acceptance:

```powershell
$env:APEX_SMOKE_PASSWORD="<demo smoke password>"
npm.cmd run smoke:opportunity-scout:fly-demo -- --json
```

The Opportunity Scout demo orchestrator must:

- wake the demo app before Fly machine exec
- take a demo backup before package mutation
- temporarily set only `COMPANY-DEFAULT` to Elite
- run hosted Opportunity Scout acceptance
- clean smoke artifacts
- roll the demo package back to Premium
- run final hosted smoke with latency budgets

Do not use `fly.toml` for demo deploys. Do not run demo package or smoke cleanup scripts against production.

## Production Deploy Checklist

Only deploy production after approval.

Before deploy:

```powershell
fly status -a concrete-ops-2
fly checks list -a concrete-ops-2
```

Deploy:

```powershell
fly deploy --config fly.toml
```

After deploy:

```powershell
Invoke-RestMethod https://app.apexhq.online/api/ready
Invoke-RestMethod https://concrete-ops-2.fly.dev/api/ready
fly logs -a concrete-ops-2
```

Required post-deploy checks:

- `/api/ready` returns HTTP `200`
- readiness payload shows database `ok`
- app login screen loads
- owner/admin can log in
- employee/field user remains restricted from office/admin routes
- Owner Health/App Health surface is clean
- no repeated 5xx errors in Fly logs
- setup status is live mode, not demo mode

## Rollback Triggers

Stop and rollback or mitigate if any of these happen:

- `/api/ready` fails
- database readiness fails
- production login fails
- owner/admin cannot load the workspace
- field users can see office/admin/pricing/package/billing surfaces
- production data appears missing, mixed, or reseeded
- Fly logs show repeated SQLite, startup, auth, or API errors
- deployment target or volume is discovered to be wrong

## Rollback Checklist

Before rollback:

- capture failing URL
- capture `/api/ready` payload
- capture Fly release ID/image
- capture relevant logs
- capture timestamp
- identify last known-good release

Review releases:

```powershell
fly releases -a concrete-ops-2
```

Rollback rules:

- roll back only to a known-good release/image
- do not delete Fly volumes
- do not destroy machines as a rollback tactic
- do not run `reset`
- do not enable demo mode in production
- do not set `SEED_DEMO_DATA=true`
- do not overwrite production SQLite without explicit restore approval

After rollback:

- verify `/api/ready`
- verify login
- verify setup status
- verify owner/admin route
- verify employee restricted routes
- inspect Fly logs
- write an incident note with cause, mitigation, and prevention

## Known Phase 1 Risks

- `DEPLOYMENT.md` examples mention an older volume naming pattern; use `fly.toml` and live Fly state as the source of truth before release.
- `min_machines_running = 0` allows cold starts. Consider `min_machines_running = 1` if production availability matters more than minimum cost.
- Docker health checks use `/api/health`, while Fly readiness checks use `/api/ready`. Aligning Docker to readiness is a later hardening task.
- Vercel previews use shared demo backend data. They are useful but not isolated customer-pilot environments.
