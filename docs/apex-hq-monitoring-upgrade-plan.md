# Apex HQ Monitoring Upgrade Plan

Status: Phase 2 monitoring plan, not yet enabled

Purpose: define the next monitoring step after Phase 1 GitHub Actions readiness checks and demo hosted smoke, without committing Apex HQ to a paid vendor or changing production config prematurely.

## Current Monitoring Baseline

Already in place:

- Fly service checks hit `/api/ready`
- Docker health checks hit `/api/ready`
- GitHub Actions production readiness monitor checks:
  - `https://app.apexhq.online/api/ready`
  - `https://concrete-ops-2.fly.dev/api/ready`
- GitHub Actions demo hosted smoke checks `https://concrete-ops-demo.fly.dev`
- `npm.cmd run smoke:hosted` records `/api/ready`, login, and bootstrap timing
- `docs/apex-hq-incident-notes-log.md` stores Phase 1 incident notes
- `docs/apex-hq-github-actions-smoke-secrets.md` defines demo auth smoke secret setup

This is enough for founder-led demos and controlled early pilots. It is not enough for many customers, formal uptime commitments, or hands-off production operations.

## Upgrade Triggers

Move beyond the Phase 1 baseline when any of these become true:

- more than one active pilot workspace exists
- customer work depends on Apex HQ during active jobs
- support response must happen when the founder is unavailable
- production auth smoke is approved
- production has repeated cold-start, readiness, login, or bootstrap alerts
- users upload enough files/photos that storage or backup visibility matters
- a paid customer expects an uptime or support commitment

## What To Monitor Next

Minimum Phase 2 checks:

- `/api/ready` uptime
- `/api/health` process liveness
- login success rate for a dedicated smoke user, if approved
- `/api/bootstrap` latency
- repeated 4xx/5xx rate
- request duration spikes over 10 seconds
- SQLite readiness or lock errors
- Fly service check failures
- deployment health after release
- storage/volume free space if available through platform tooling
- backup/export success
- restore drill pass/fail

Do not monitor private customer payloads, passwords, tokens, estimate contents, uploads, or sensitive field notes.

## Log Drain Requirements

Any log drain or observability vendor must support:

- structured JSON log ingestion
- timestamp, level, message, service, request ID, method, path, status, and duration fields
- search by request ID
- alerting on `level:error`
- alerting on repeated 5xx responses
- alerting on readiness failures
- retention appropriate for pilots without over-collecting sensitive data
- access control so only the operator/support owner can inspect production logs

Do not enable a log drain that:

- stores logs in an unmanaged personal inbox
- exposes logs publicly
- requires customer secrets or payment data
- captures full request bodies by default
- cannot redact tokens or sensitive URLs

## Provider-Neutral Options

Acceptable Phase 2 options:

- managed uptime monitor plus existing Fly logs
- Fly log drain to a dedicated log provider
- lightweight open-source log collector controlled by the operator
- GitHub Actions scheduled smoke plus a dedicated incident channel

Defer until later:

- enterprise APM
- customer-facing status page
- formal SLA dashboard
- real-time on-call rotation
- production auth smoke without a dedicated smoke user and approval

## Fly Log Commands

Manual log checks:

```powershell
fly logs -a concrete-ops-2 --no-tail
fly logs -a concrete-ops-2 --json --no-tail
fly logs -a concrete-ops-demo --no-tail
fly logs -a concrete-ops-demo --json --no-tail
```

During an incident:

```powershell
fly status -a concrete-ops-2
fly checks list -a concrete-ops-2
fly logs -a concrete-ops-2
```

For demo:

```powershell
fly status -a concrete-ops-demo
fly checks list -a concrete-ops-demo
fly logs -a concrete-ops-demo
```

## Alert Routing

Phase 2 alerts should go to one operational place, not scattered chats.

Recommended order:

1. GitHub issue for readiness/workflow failures.
2. Dedicated incident notes in `docs/apex-hq-incident-notes-log.md` for confirmed incidents.
3. A dedicated support/ops channel only after the team has one.

Every alert should include:

- environment
- route or endpoint
- HTTP status
- request ID if available
- duration
- first failed timestamp
- last failed timestamp
- direct triage commands
- whether production or demo is affected

## Alert Thresholds

Suggested starting thresholds:

- `/api/ready` fails twice within 5 minutes: P1 for production, P2 for demo
- login or bootstrap exceeds hosted smoke budget twice in a row: P1 for active pilot, P2 otherwise
- repeated 5xx over 5 minutes: P1 if production, P2 if demo
- SQLite readiness or locking errors: P1
- backup/export failure: P1 before deploy, P2 otherwise
- restore drill failure: P1 before production release, P2 during routine drill

## Approval Gates

Require explicit approval before:

- adding a paid monitoring vendor
- creating a log drain for production
- sending production logs outside Fly/GitHub
- adding production auth smoke
- creating a production smoke user
- changing production machine count, scale, region, volume, secrets, or deploy config
- changing log payload shape in app code

No approval needed for:

- local docs updates
- local non-mutating smoke scripts
- demo-only smoke checks
- GitHub Actions non-auth readiness checks
- manual `fly logs --no-tail` inspection during a release check

## Rollout Plan

Phase 2A:

- choose a single alert destination
- keep GitHub readiness issue workflow active
- configure `APEX_SMOKE_PASSWORD` for demo auth smoke
- review two weeks of scheduled demo smoke and readiness-monitor noise

Phase 2B:

- choose log drain or uptime provider
- document provider access control
- test with demo first
- confirm no secrets or request bodies are captured
- create rollback/removal steps

Phase 2C:

- after approval, add production log drain or dedicated uptime provider
- run readiness and smoke checks for 24 to 48 hours
- document false positives and threshold changes

## Production Boundary

This plan does not authorize a production deploy, production log drain, paid monitoring account, or production auth smoke. It only defines the approval-ready path.
