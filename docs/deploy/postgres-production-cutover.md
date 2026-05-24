# Apex HQ Postgres Production Cutover

Last updated: 2026-05-24

## Current State

- Production app: `concrete-ops-2` on Fly.io.
- Public production URL: `https://app.apexhq.online/`.
- Production rollback source remains the existing Fly release plus the untouched SQLite volume at `/app/data`.
- Supabase/Postgres runtime has passed local live smoke against project `cmjpsmnemvlqzlwizbdg`.
- Vercel static frontend config must proxy `/api/*` to `https://concrete-ops-2.fly.dev/api/:path*`, not the demo backend.
- `DATA_PROVIDER=postgres` is active in production as of 2026-05-24.
- Current production release after cutover: Fly release `v583`, image `registry.fly.io/concrete-ops-2:deployment-01KSCG1ZYRTSD4X1JQH8QGQW10`.
- Rollback release/image: `v581` / `registry.fly.io/concrete-ops-2:deployment-01KS9WM4AMZ3H4A5Q5B7G0G6XN`.

## Step 4 Evidence

- Production auth smoke readiness passed on 2026-05-24.
- GitHub Actions run `26355707714` passed on 2026-05-24.
- Production health smoke after auth smoke passed against `https://app.apexhq.online/`.
- Cutover gate state after auth smoke: `rehearsalReady=true`, `productionCutoverReady=false`.
- Remaining activation blocker: record the exact `POSTGRES_PRODUCTION_CUTOVER_APPROVED` phrase before setting `DATA_PROVIDER=postgres`.

## Final Cutover Evidence

- Approval phrase received on 2026-05-24: `POSTGRES_PRODUCTION_CUTOVER_APPROVED`.
- `DATA_PROVIDER=postgres` deployed to Fly release `v583`.
- `/api/ready` passed after activation with `database=ok`.
- Fly machine `148e06e2b53d68` is started in `sjc`; Fly service check is passing.
- Dedicated production smoke users were created/rotated in Postgres for `smoke.admin@apexhq.app` and `smoke.employee@apexhq.app`; the matching GitHub Actions secret was rotated without recording the value.
- Local hosted production auth smoke passed against `https://app.apexhq.online/` with admin and employee login/bootstrap plus employee restricted-route `403` checks.
- GitHub Actions production auth smoke run `26356110535` passed on 2026-05-24.
- Final cutover gate passed with `rehearsalReady=true` and `productionCutoverReady=true`.

## Safe Step 3 Rehearsal

Run these from the repo root:

```powershell
npm.cmd run postgres:runtime-smoke
npm.cmd run verify:data-platform
npm.cmd run verify:postgres-transfer
npm.cmd run verify:postgres-cutover-readiness
npm.cmd run verify:server
npm.cmd run verify:auth
npm.cmd run build
```

For a full read-only cutover gate:

```powershell
npm.cmd run launch:postgres-cutover-readiness -- --env-file=.env.local --check-fly --postgres-runtime-smoke-verified --data-platform-verified --postgres-transfer-verified --server-verified --auth-verified --build-verified --backup-verified --restore-verified --support-owner="John" --rollback-owner="John" --rollback-release=v581 --backup-artifact="app-data-YYYY.sqlite" --upload-backup-artifact="uploads-YYYY" --incident-destination=github-issues --json
```

The command is read-only. It does not deploy, set secrets, switch `DATA_PROVIDER`, create sessions, mutate data, or touch production machines.

## Fly Secret Staging

The low-risk production wiring step is to stage the Postgres connection secrets without activating the provider:

```powershell
# Values must come from .env.local or a secure password manager. Do not paste them into chat or docs.
fly secrets import --stage -a concrete-ops-2
```

Required staged names:

- `POSTGRES_DATABASE_URL`
- `POSTGRES_SSL_MODE`
- `POSTGRES_POOL_MAX`

Do not stage or deploy `DATA_PROVIDER=postgres` until the approval gate is green.

## Final Activation Gate

Production activation requires all of the following:

- `postgres:runtime-smoke` passed against Supabase/Postgres.
- `verify:data-platform`, `verify:postgres-transfer`, `verify:server`, `verify:auth`, and `npm run build` passed.
- `verify:backup` and `verify:restore` passed, including uploaded-file artifacts.
- Current known-good rollback release recorded.
- Support owner, rollback owner, and incident destination recorded.
- Hosted production health smoke passed.
- Approved production auth smoke passed.
- Exact approval phrase recorded: `POSTGRES_PRODUCTION_CUTOVER_APPROVED`.

Only after those are true should production activate `DATA_PROVIDER=postgres`.

## Rollback

Rollback must be a config/provider reversal first:

1. Switch runtime provider back to SQLite.
2. Confirm `/api/ready` returns `database: ok`.
3. Confirm owner login and `/api/bootstrap`.
4. Preserve Supabase/Postgres evidence for investigation.
5. Do not delete Fly machines, Fly volumes, or Supabase data during first response.
