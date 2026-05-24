# Apex HQ Postgres/Supabase Migration Runbook

Last updated: 2026-05-24

## Status

The repository now has a production Postgres/Supabase schema foundation, but SQLite remains the active runtime store. This is intentional. A data-platform cutover is high-risk and must not happen until staging parity, RLS tests, backup/restore, and rollback are proven.

Live dry run project created on 2026-05-24: `apex-hq-data-platform` (`cmjpsmnemvlqzlwizbdg`) in `us-west-1`. Do not paste service role keys into this repo.

## Prerequisites

- A disposable Supabase/Postgres project for dry runs.
- A staging app environment separate from production.
- A current SQLite backup and JSON export from `npm run verify:backup`.
- No production deploy, database mutation, or secret change without explicit approval.

## Environment Variables For The Future Cutover

These variables are for the Postgres runtime adapter phase. Keep SQLite as the default until staging parity is proven:

```env
DATA_PROVIDER=postgres
DATABASE_URL=postgresql://...
POSTGRES_DATABASE_URL=postgresql://...
POSTGRES_SSL_MODE=require
POSTGRES_POOL_MAX=5
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_STORAGE_BUCKET=apex-hq-uploads
```

Never paste production secrets into docs, tests, issue comments, or screenshots.

## Dry Run Sequence

1. Create a disposable Supabase/Postgres database.
2. Apply every migration in `supabase/migrations/` in filename order.
   - Apply the foreign-key index migration before importing production-sized data.
3. Export the current SQLite data:

```powershell
npm.cmd run verify:backup
```

4. Transform rows for Postgres with the checked-in import planner:

```powershell
npm.cmd run postgres:import-plan -- --prune-orphan-company-settings --json
```

The planner validates the SQLite source against the Postgres DDL, converts JSON string columns to `jsonb`, integer booleans to `boolean`, empty optional timestamps to `null`, and runs a local foreign-key preflight. Active `sessions` rows are excluded by default so users re-authenticate after cutover. Only pass `--include-sessions` after an explicit security review.

The current local SQLite data has stale `company_settings` rows for an old `demo-company` tenant with no matching `companies` row and no tenant records. Use `--prune-orphan-company-settings` for import bundles so the Postgres target stays referentially valid without mutating the SQLite source.

To create an ignored SQL bundle for manual review or `psql` execution:

```powershell
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
npm.cmd run postgres:import-plan -- --prune-orphan-company-settings --out "data/backups/postgres-import-$stamp.sql"
```

5. Load rows in dependency order:

`companies`, `company_settings`, `users`, `sessions`, CRM tables, jobs, estimates, field tables, checklists, audit/activity.

For direct local execution against a Supabase/Postgres connection string, use the guarded apply worker:

```powershell
$env:DATABASE_URL = "postgresql://..."
npm.cmd run postgres:import-apply -- --prune-orphan-company-settings --yes --json
```

The apply worker refuses destructive replace mode unless `--yes` is present, runs the import in a transaction, and verifies target table counts against the dry-run plan.

If a direct Postgres connection string is not available, use the temporary Edge Function importer only against a disposable Supabase project:

1. Deploy a one-time importer function with a high-entropy `x-apex-import-token`.
2. Run the chunked local sender:

```powershell
$env:SUPABASE_IMPORT_FUNCTION_URL = "https://PROJECT_REF.supabase.co/functions/v1/apex-hq-one-time-import"
$env:SUPABASE_IMPORT_TOKEN = "..."
npm.cmd run postgres:import-edge -- --prune-orphan-company-settings --yes --json
```

3. Immediately redeploy that function as disabled with `verify_jwt=true`.
4. Confirm the endpoint rejects unauthenticated requests before leaving the project.

The importer normalizes SQLite drift before sending rows:

- `NULL` values for Postgres `not null default ...` columns are replaced with their declared default.
- Empty optional foreign-key strings are sent as `null`.
- JSON text columns are parsed into JSON payloads.
- SQLite integer booleans are converted to Postgres booleans.

6. Run RLS negative tests as a restricted role.
   - Confirm `authenticated` can only see rows matching `app.current_company_id`.
   - Confirm an empty or mismatched company context returns no tenant rows.
   - Confirm `sessions` and `app_meta` remain unreadable from client roles.
7. Run API parity tests against the Postgres adapter once it exists:

```powershell
npm.cmd run verify:auth
npm.cmd run verify:server
npm.cmd run verify:customers
npm.cmd run verify:jobs
npm.cmd run verify:uploads
npm.cmd run verify:signup
```

8. Run the Postgres runtime smoke with a disposable or staging database URL:

```powershell
$env:POSTGRES_DATABASE_URL = "postgresql://..."
$env:POSTGRES_SSL_MODE = "require"
npm.cmd run postgres:runtime-smoke
```

The smoke imports the server store with `DATA_PROVIDER=postgres`, verifies full-state read, user auth lookup, session create/read/touch/update/delete, and an audit-event insert with cleanup.

9. Run browser smoke on staging for owner/admin/foreman/employee.

10. Run the production cutover rehearsal gate before any Fly production provider switch:

```powershell
npm.cmd run launch:postgres-cutover-readiness -- --env-file=.env.local --check-fly --postgres-runtime-smoke-verified --data-platform-verified --postgres-transfer-verified --server-verified --auth-verified --build-verified --backup-verified --restore-verified --support-owner="John" --rollback-owner="John" --rollback-release=v581 --backup-artifact="app-data-YYYY.sqlite" --upload-backup-artifact="uploads-YYYY" --incident-destination=github-issues --json
```

The gate is read-only and intentionally keeps `DATA_PROVIDER=postgres` blocked until hosted smoke, production auth smoke, and the explicit `POSTGRES_PRODUCTION_CUTOVER_APPROVED` phrase are recorded. See `docs/deploy/postgres-production-cutover.md`.

## Rollback Plan

Before production cutover:

- Keep the SQLite volume untouched and backed up.
- Deploy the Postgres adapter behind an explicit provider flag.
- Make rollback a config-only provider switch back to SQLite.
- Do not run destructive SQLite cleanup during the first Postgres production window.

Rollback trigger examples:

- Any cross-company data exposure.
- Auth/session failure.
- Missing customer/job/upload records after import.
- RLS policy failure.
- Unacceptable latency or connection pool exhaustion.

## Acceptance Criteria For Calling Item 2 Fully Runtime-Complete

- Migration applies cleanly to disposable Postgres.
- RLS negative tests are automated.
- SQLite-to-Postgres import plan passes with no foreign-key errors.
- Direct import apply passes table-count parity in a disposable Supabase/Postgres target.
- If the Edge Function fallback is used, the importer is redeployed disabled and rejects unauthenticated requests.
- `DATA_PROVIDER=postgres` boots with `DATABASE_URL` or `POSTGRES_DATABASE_URL`.
- `postgres:runtime-smoke` passes against the disposable Supabase/Postgres target.
- A Postgres store adapter passes the existing server/API test suite.
- Backup and restore runbooks cover both SQLite source and Postgres target.
- Staging browser smoke passes for every role.
- Rollback is tested without deleting or mutating production SQLite data.
- Production cutover rehearsal passes with the Fly target, Vercel API proxy, staged Fly secret names, backup artifacts, rollback release, support owner, and incident destination recorded.
