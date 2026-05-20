# Apex HQ Production Cold Start Decision

Status: approval-ready decision note, no config change

Purpose: document the current Fly production cold-start posture, the pilot tradeoff, and the approval path before changing production machine scale.

## Current Production Setting

Production config:

```toml
[http_service]
  auto_start_machines = true
  auto_stop_machines = "stop"
  min_machines_running = 0
```

Source of truth:

- `fly.toml`
- Fly app: `concrete-ops-2`
- primary region: `sjc`
- mounted production volume: `concrete_ops_data`
- readiness endpoint: `/api/ready`

The demo app intentionally uses the same stop/start cost-saving posture in `fly.demo.toml`.

## Read-Only Check Evidence

May 20, 2026 read-only production check:

- `fly status -a concrete-ops-2` showed machine `148e06e2b53d68`, version `579`, stopped with service-check warning because the machine had not started.
- First production `/api/ready` checks woke the machine and completed in about `5900ms`.
- After wake, `fly checks list -a concrete-ops-2` reported the service check passing with ready/database ok.
- Warm production `/api/ready` checks completed in about `386ms` to `459ms`.

May 20, 2026 follow-up warm production check:

- `fly status -a concrete-ops-2` showed machine `148e06e2b53d68`, version `579`, started with `1 total, 1 passing` check.
- `fly checks list -a concrete-ops-2` reported `/api/ready` passing with ready/database ok.
- `npm.cmd run monitor:readiness -- --base-url=https://app.apexhq.online --samples=3 --delay-ms=500 --json` returned:
  - `/api/health`: first `549ms`, min `29ms`, max `549ms`, average `204ms`
  - `/api/ready`: first `43ms`, min `31ms`, max `43ms`, average `36ms`

This is acceptable for founder-led demos and low-traffic controlled pilots when the operator expects occasional cold starts. It is not a good default once customers rely on Apex HQ during active jobs.

## Repeatable Read-Only Check

Use the local timing helper before deciding whether cold starts are causing customer-facing friction:

```powershell
npm.cmd run monitor:readiness -- --base-url=https://app.apexhq.online --samples=3 --delay-ms=500 --json
fly status -a concrete-ops-2
fly checks list -a concrete-ops-2
```

This check only performs GET requests against `/api/health` and `/api/ready`; it does not log in, deploy, change Fly scale, touch secrets, mutate data, export records, or run cleanup.

## Decision Options

### Option A: Keep `min_machines_running = 0`

Best when:

- traffic is low
- founder-led demos are scheduled
- production cost should stay minimal
- no active customer depends on immediate login during jobsite work

Pros:

- lowest cost
- existing config already works
- readiness monitor tolerates cold starts with retry behavior

Cons:

- first request after idle can take several seconds
- Fly checks show warnings while stopped
- user-perceived login or bootstrap may feel slow after idle
- support confusion is possible during a pilot if users hit a cold app

### Option B: Set `min_machines_running = 1`

Best when:

- a real pilot has active users
- field users depend on Apex HQ during work hours
- demo reliability matters more than minimum cost
- login/bootstrap cold-start friction becomes a repeated issue

Pros:

- avoids most cold-start delay
- service checks stay passing while traffic is idle
- improves trust during live pilots and demos

Cons:

- higher Fly cost
- production config change requires explicit approval
- still needs backup-first deploy discipline

## Recommended Gate

Keep `min_machines_running = 0` until one of these happens:

- a real contractor pilot starts
- a scheduled demo requires no cold-start risk
- production readiness monitor opens repeated cold-start/noise issues
- login/bootstrap latency exceeds smoke budgets twice in a row
- the operator wants production to feel always-on despite added cost

Before a real pilot with field users, prefer approving `min_machines_running = 1` for production or the dedicated pilot app.

## Approval Checklist

Before changing production scale:

- confirm target app is `concrete-ops-2`
- confirm no unrelated dirty files are staged
- confirm latest CI is green
- confirm backup/export path is known
- confirm rollback path is known
- update `fly.toml` only if production is the approved target
- run `npm.cmd run build`
- run `npm.cmd run verify:roles`
- run `npm.cmd run verify:backup`
- run `npm.cmd run verify:restore`
- deploy production only after explicit approval
- verify `/api/ready`, `fly status`, and `fly checks list`

## Rollback

Rollback is a config revert:

```toml
min_machines_running = 0
```

Then deploy after the same production approval and verification gate.

## Production Boundary

This document does not authorize a production deploy, Fly scale change, secret change, volume change, migration, restore, or app-code change. It only records the current posture and the decision gate.
