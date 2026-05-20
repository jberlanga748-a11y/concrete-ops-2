# Customer Pilot Setup

Status note, 2026-05-19:
This file is the infrastructure setup guide for a customer-specific pilot app. Pair it with `docs/apex-hq-pilot-readiness-checklist.md` for Day 0, Day 3, and Day 10 operating gates, and with `docs/MANUAL_PILOT_SMOKE_TEST.md` for non-destructive workflow smoke.

Use this guide to create a brand-new contractor pilot workspace on Fly.io without reusing the demo app, the live production app, or any internal testing data.

This guide assumes:
- the real production app is separate
- the demo app is separate
- each customer pilot gets its own Fly app and its own Fly volume

## Pilot Safety Checklist

Before you hand a pilot to a contractor, confirm all of these are true:

- the selected pilot workflow is written down
- Day 0 kickoff, Day 3 check-in, and Day 10 value review are scheduled
- the app name is unique
- the volume name is unique
- `DEMO_MODE` is off
- `SEED_DEMO_DATA` is `false`
- `GET /api/setup/status` shows `demoMode: false`
- `GET /api/setup/status` shows no existing users before the first admin is created
- the setup screen shows a new workspace, not an old demo or production estimate context
- the pilot app is not sharing storage with demo or production
- a backup/export plan is known
- a rollback path is known
- support severity owner is known
- manual pilot smoke has passed before real customer workflow use

Run the local pilot readiness preflight before creating or handing off a customer pilot:

```bash
npm run verify:pilot-readiness
```

This is local-only. It checks docs drift, pilot config safety, role gates, backup/export, restore drill, and frontend build. It does not create Fly apps, create volumes, deploy, set secrets, or touch production.

## Goal

Create a clean customer-specific workspace that:
- starts with no demo data
- starts with no existing users
- uses its own SQLite volume
- lets the contractor create or receive a first admin account safely

## Do Not Use These Existing Apps

Do not deploy a customer pilot into:
- the Apex HQ demo app
- the Apex HQ production app
- any internal testing Fly app you already use

Do not reuse these existing volumes:
- the Apex HQ demo data volume
- the Apex HQ production data volume
- any internal testing volume with existing records

Each pilot must have:
- a unique Fly app name
- a unique Fly volume name
- its own isolated database

## Recommended Naming

Example customer slug:
- `acme-contracting`

Recommended app name:
- `apex-hq-acme-pilot`

Recommended volume name:
- `apex_hq_acme_pilot_data`

Recommended config file:
- `fly.customer-acme.toml`

## 1. Create a New Fly App

Create a dedicated Fly app for the customer pilot.

```bash
fly apps create apex-hq-acme-pilot
```

If you prefer, you can also create the app during a no-deploy launch flow, but the important rule is the same:
- use a brand-new Fly app name
- do not point the pilot at an existing app

## 2. Create a Separate Fly Volume

Create a brand-new SQLite volume for this customer pilot.

Use the same region the repo already expects unless you intentionally want another region.

Current repo default:
- region: `sjc`

Example:

```bash
fly volumes create apex_hq_acme_pilot_data --size 1 --region sjc --app apex-hq-acme-pilot
```

Important:
- do not attach the pilot app to the Apex HQ demo data volume
- do not attach the pilot app to the Apex HQ production data volume
- do not reuse an internal testing volume

## 3. Create a Customer-Specific Fly Config

Preferred: generate a customer-specific Fly config locally.

Example:

```bash
npm run pilot:create-config -- --slug=acme-contracting
```

This creates `fly.customer-acme-contracting.toml`, verifies the generated file, and prints the app and volume names. It does not create a Fly app, create a volume, deploy, set secrets, or touch production.

Manual fallback: copy the standard production Fly config to a customer-specific file, then update these values in `fly.customer-acme.toml`:

```toml
app = "apex-hq-acme-pilot"
primary_region = "sjc"

[build]
  dockerfile = "Dockerfile"

[env]
  NODE_ENV = "production"
  PORT = "4000"
  DATA_DIR = "/app/data"
  LOG_LEVEL = "info"
  SEED_DEMO_DATA = "false"

[http_service]
  internal_port = 4000
  force_https = true
  auto_start_machines = true
  auto_stop_machines = "stop"
  min_machines_running = 0

  [http_service.concurrency]
    type = "requests"
    soft_limit = 100
    hard_limit = 150

[[http_service.checks]]
  interval = "15s"
  timeout = "5s"
  grace_period = "20s"
  method = "GET"
  path = "/api/ready"
  protocol = "http"
  [http_service.checks.headers]
    X-Forwarded-Proto = "https"

[[mounts]]
  source = "apex_hq_acme_pilot_data"
  destination = "/app/data"
  initial_size = "1gb"
```

Before creating or deploying the pilot app, run the local pilot config verifier:

```bash
npm run pilot:verify-config -- --config=fly.customer-acme.toml
```

The verifier rejects production/demo app names, production/demo volumes, demo seeding, demo package settings, missing `/api/ready` checks, and unsafe data-dir settings. It does not create apps, create volumes, deploy, set secrets, or touch production.

CI also scans committed `fly.customer*.toml` and `fly.pilot*.toml` files through `npm run verify:pilot-config`, so unsafe pilot configs should not land unnoticed.

## 4. Keep Demo Seeding Off

For a customer pilot workspace:
- keep `SEED_DEMO_DATA = "false"`
- do not enable `DEMO_MODE`

That means:
- no demo user seeding
- no demo data seeding
- no demo reset behavior

Safe rule:
- customer pilot = clean production-style workspace
- demo app = fake/demo-only workspace

## 5. Deploy the Customer Pilot

Deploy using the customer-specific config file.

```bash
fly deploy --config fly.customer-acme.toml
```

After deploy, verify the app is healthy:

```bash
curl https://apex-hq-acme-pilot.fly.dev/api/ready
```

Expected result:
- HTTP `200`
- readiness payload shows the database is healthy

Do not deploy a customer pilot without confirming the current release/rollback checklist in `docs/apex-hq-release-rollback-checklist.md`.

## 6. Verify `/api/setup/status`

Before creating the first admin, check setup status:

```bash
curl https://apex-hq-acme-pilot.fly.dev/api/setup/status
```

On a clean pilot workspace, you want the important fields to look like this:

```json
{
  "needsSetup": true,
  "hasUsers": false,
  "demoMode": false,
  "demoUserExists": false
}
```

If you see:
- `demoMode: true`
- `demoUserExists: true`
- `hasUsers: true` before setup

stop and fix the workspace before handing it to the customer.

That usually means:
- wrong Fly config
- wrong app
- wrong volume
- wrong environment settings

## 7. Create the First Admin

Preferred approach:
- open the pilot URL in the browser
- use the built-in setup screen
- create the first admin interactively

Example pilot URL:
- `https://apex-hq-acme-pilot.fly.dev/`

The login/setup screen should show a first-admin setup flow when:
- `needsSetup = true`
- `hasUsers = false`

Recommended first user:
- customer workspace admin

Recommended role:
- `Owner`

After saving the first admin, verify setup status again:

```bash
curl https://apex-hq-acme-pilot.fly.dev/api/setup/status
```

Expected result now:

```json
{
  "needsSetup": false,
  "hasUsers": true,
  "demoMode": false
}
```

## 8. Add Support Admin, Contractor Admin, Foreman, and Employee

After the first admin logs in:
- open the `Employees` module
- add the remaining pilot users

Recommended user setup:

### Support admin

Recommended role:
- `Administrator`

Use this only if you need internal support access during the pilot.

Why:
- full office access
- can help with setup and troubleshooting
- does not require using the customer's primary account

### Contractor admin

Recommended role:
- `Owner`

Why:
- gives the contractor's primary admin full workspace control
- matches the expected top-level customer administrator role

### Foreman

Recommended role:
- `Foreman`

Why:
- field-safe access
- jobs, reports, uploads, safety, calculator, checklists, change orders, delivery tickets
- no leads, full customers, estimates, pricing, payroll, profit, or margin

### Employee

Recommended role:
- `Employee`

Why:
- assigned-work-only field access
- time, uploads, safety, calculator, read-only or limited field workflows where allowed
- no office data exposure

## 9. Suggested Pilot Checklist After User Creation

After the pilot users are added, verify:

### As office/admin
- Dashboard loads
- Jobs load
- Employees load
- Settings load

### As foreman
- field workspace loads
- assigned jobs show correctly
- no leads, customers, estimates, or pricing appear

### As employee
- field workspace loads
- only assigned job data appears
- no office modules appear

Use `docs/MANUAL_PILOT_SMOKE_TEST.md` for the full non-destructive pilot workflow check before using real customer data.

## 10. Day 0 / Day 3 / Day 10 Operating Gates

This infrastructure guide only creates a safe pilot environment. The pilot is not ready just because the app deploys.

Before kickoff:

- follow `docs/apex-hq-pilot-readiness-checklist.md`
- run the manual pilot smoke
- confirm support/severity process
- confirm restore drill cadence
- confirm no custom feature promises

Day 3:

- confirm owner/admin and field usage happened
- classify issues as training, workaround, product blocker, or poor fit
- keep the workflow narrow

Day 10:

- score value signals
- decide continue, adjust, or stop
- do not expand scope if the pilot workflow is not proving value

## 11. What Not To Do

Do not:
- deploy a customer pilot into the Apex HQ demo app
- deploy a customer pilot into the Apex HQ production app
- reuse the demo volume
- reuse the production volume
- reuse an internal testing volume
- set `SEED_DEMO_DATA=true`
- set `DEMO_MODE=true`
- create the first customer admin in the demo app
- test customer data inside the demo workspace
- mix customer records with demo or internal test records

## 12. Safe Separation Rules

Use these rules every time:

### Demo app
- fake users
- fake data
- demo mode only

### Real production app
- your real company workspace only
- no demo mode

### Customer pilot app
- customer-specific workspace only
- separate Fly app
- separate Fly volume
- `SEED_DEMO_DATA=false`
- `DEMO_MODE` off

## 13. Recommended Minimal Handoff Notes

When handing the pilot to a contractor, provide:
- pilot URL
- contractor admin email
- temporary password shared privately
- foreman email and temporary password
- employee email and temporary password
- short reminder that this is their isolated pilot workspace

Do not send:
- demo login emails
- demo app URL
- your internal test app URL
- your personal/admin credentials

## 14. Monitoring And Support Before Handoff

Before handoff, confirm:

- `https://<pilot-app>.fly.dev/api/ready` returns ready/database ok
- `fly checks list -a <pilot-app>` is passing
- support intake process is known from `docs/apex-hq-support-intake-process.md`
- incident notes location is known from `docs/apex-hq-incident-notes-log.md`
- monitoring upgrade boundaries are known from `docs/apex-hq-monitoring-upgrade-plan.md`

Do not add production log drains, paid monitoring, production auth smoke, or production machine scaling as part of a pilot setup without explicit approval.

## 15. Quick Command Summary

```bash
fly apps create apex-hq-acme-pilot
fly volumes create apex_hq_acme_pilot_data --size 1 --region sjc --app apex-hq-acme-pilot
npm run pilot:create-config -- --slug=acme
npm run pilot:verify-config -- --config=fly.customer-acme.toml
fly deploy --config fly.customer-acme.toml
curl https://apex-hq-acme-pilot.fly.dev/api/ready
curl https://apex-hq-acme-pilot.fly.dev/api/setup/status
```

Then run:

```bash
npm run verify:pilot-readiness
```

After the local preflight passes, run the manual pilot smoke from `docs/MANUAL_PILOT_SMOKE_TEST.md`.

## Final Rule

If you are ever unsure whether a Fly app or volume is safe to use for a customer pilot, stop and create a brand-new app and brand-new volume.

That is safer than trying to reuse anything from:
- the demo app
- the real production app
- an internal testing environment
