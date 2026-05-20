# Apex HQ Monitoring And Alerting Plan

Status: Phase 1 minimum monitoring plan

Purpose: define the smallest production-safe monitoring loop around Apex HQ readiness before broader pilot or production expansion.

## Health Endpoint Semantics

`GET /api/health`

- process liveness
- unauthenticated
- returns service, environment, uptime, timestamp, and request ID
- does not verify SQLite readiness

`GET /api/ready`

- production readiness
- unauthenticated
- calls `ensureDb()`
- returns database `ok` when SQLite initializes successfully
- returns HTTP `503` when readiness fails
- logs `Readiness check failed` with request ID and serialized error

Production monitoring should treat `/api/ready` as the source of truth.

## Hosted Smoke Latency Budgets

`npm.cmd run smoke:hosted` records timing for:

- `/api/health`
- `/api/ready`
- `/api/auth/login`
- `/api/bootstrap`

Default budgets:

- `/api/ready`: `10000ms`
- `/api/auth/login`: `15000ms`
- `/api/bootstrap`: `15000ms`

Run demo auth smoke:

```powershell
$env:APEX_SMOKE_PASSWORD="<demo smoke password>"
npm.cmd run smoke:hosted -- --base-url=https://concrete-ops-demo.fly.dev --allow-auth --json
```

The budgets are intentionally loose enough for Fly cold starts but tight enough to catch the previous auth/bootstrap regression where login and bootstrap took tens of seconds. Do not mask a slow path by only raising these budgets; inspect session writes, SQLite locking, bootstrap payload size, and Fly health flapping first.

## Scheduled Demo Smoke

GitHub Actions runs `.github/workflows/demo-hosted-smoke.yml` every hour against `https://concrete-ops-demo.fly.dev`.

The scheduled smoke:

- always runs non-auth health and route checks
- runs auth/bootstrap and restricted-route checks only when the repository secret `APEX_SMOKE_PASSWORD` is configured
- uses the same hosted smoke latency budgets described above
- writes GitHub Actions summary tables for non-auth checks and auth checks when auth smoke runs
- opens or updates a GitHub issue when demo hosted smoke fails
- comments on and closes the open demo smoke issue when a later run recovers
- is demo-only and does not target production

Issue title:

```text
Apex HQ demo hosted smoke failed
```

Secret setup, verification, rotation, and failure handling are defined in `docs/apex-hq-github-actions-smoke-secrets.md`.

## Existing Platform Checks

Fly production already checks:

- path: `/api/ready`
- interval: `15s`
- timeout: `5s`
- grace period: `20s`

Docker image health now checks `/api/ready` so container health and Fly routing checks agree. This prevents process liveness from masking SQLite readiness failures.

## Minimum External Monitor

Use one external check outside Fly so readiness failures are not visible only inside the platform.

Recommended no-required-paid option:

- GitHub Actions scheduled workflow
- checks `https://app.apexhq.online/api/ready`
- checks `https://concrete-ops-2.fly.dev/api/ready`
- runs every 5 to 10 minutes
- creates or updates a GitHub issue when two checks fail in a row

Implementation:

- workflow: `.github/workflows/readiness-monitor.yml`
- cadence: every 10 minutes plus manual dispatch
- retry behavior: each endpoint is checked twice in one run before an issue is opened or updated
- recovery behavior: an open readiness issue is commented on and closed after both production readiness endpoints recover

Issue title:

```text
Apex HQ production readiness check failed
```

Issue body should include:

- timestamp
- URL checked
- HTTP status
- response body
- workflow run URL
- last known successful check if available
- immediate triage commands

This is not pager-grade monitoring. It is enough for Phase 1 pilot-readiness until a dedicated uptime service or on-call process exists.

The Phase 2 upgrade path for log drains, dedicated uptime monitoring, alert routing, and approval gates lives in `docs/apex-hq-monitoring-upgrade-plan.md`.

## Alert Thresholds

Create an incident note in `docs/apex-hq-incident-notes-log.md` when:

- `/api/ready` returns non-200 twice in a row over 2 to 5 minutes
- `/api/health` is healthy but `/api/ready` fails
- repeated 5xx errors appear in logs
- Fly reports failed service checks after grace period
- SQLite, volume, migration, or startup errors appear in logs
- production login or bootstrap fails during a smoke test
- role leakage or cross-company data exposure is suspected

## First Triage Commands

```powershell
Invoke-RestMethod https://app.apexhq.online/api/ready
Invoke-RestMethod https://app.apexhq.online/api/health
fly checks list -a concrete-ops-2
fly status -a concrete-ops-2
fly logs -a concrete-ops-2
```

For demo:

```powershell
Invoke-RestMethod https://concrete-ops-demo.fly.dev/api/ready
fly checks list -a concrete-ops-demo
fly logs -a concrete-ops-demo
```

## Logging Behavior

Apex HQ emits structured JSON logs with:

- timestamp
- level
- message
- service
- request ID
- method
- path
- status code
- duration
- error details where applicable

`warn` and `error` logs go to stderr. `info` and `debug` logs go to stdout.

Every response includes `X-Request-Id`. API error payloads include the same request ID.

Do not put secrets or tokens in query strings. Request logging records the original URL path, including query strings.

## Incident Severity

P0:

- company data exposure
- role leakage
- production login down for all users
- production database readiness down
- suspected data loss

P1:

- selected pilot workflow blocked
- owner/admin cannot use core workspace
- field workflow blocked during active pilot
- readiness flapping after deploy

P2:

- important workflow friction with workaround
- repeated non-critical API errors
- demo or preview instability

P3:

- documentation, polish, training, or non-blocking warnings

## Phase 1 Follow-Ups

- Watch the scheduled GitHub Actions readiness monitor for false positives during Fly cold starts. Latest current-head manual dispatch: `26141723994` passed on May 20, 2026.
- Decide whether production should keep at least one Fly machine running.
- Watch Docker `/api/ready` health checks during the next demo deploy for false positives during cold start.
- Use `docs/apex-hq-incident-notes-log.md` for Phase 1 incident notes until a dedicated tracker exists.
- Run the next scheduled local restore drill on Monday, June 1, 2026. Latest local backup/restore drill refresh passed on May 20, 2026.
- Use `docs/apex-hq-monitoring-upgrade-plan.md` before adding a log drain or dedicated uptime monitoring.
- Keep the `APEX_SMOKE_PASSWORD` GitHub Actions secret rotated through `docs/apex-hq-github-actions-smoke-secrets.md`; scheduled demo smoke now includes auth/bootstrap timing.
- Consider scheduled production auth smoke only after explicit production-safety approval.
