# Customer Pilot Setup

Use this guide to create a brand-new contractor pilot workspace on Fly.io without reusing the demo app, the live production app, or any internal testing data.

This guide assumes:
- the real production app is separate
- the demo app is separate
- each customer pilot gets its own Fly app and its own Fly volume

## Pilot Safety Checklist

Before you hand a pilot to a contractor, confirm all of these are true:

- the app name is unique
- the volume name is unique
- `DEMO_MODE` is off
- `SEED_DEMO_DATA` is `false`
- `GET /api/setup/status` shows `demoMode: false`
- `GET /api/setup/status` shows no existing users before the first admin is created
- the setup screen shows a new workspace, not an old demo or production estimate context
- the pilot app is not sharing storage with demo or production

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

Copy the standard production Fly config to a customer-specific file.

Example:

```bash
cp fly.toml fly.customer-acme.toml
```

Update these values in `fly.customer-acme.toml`:

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

## 10. What Not To Do

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

## 11. Safe Separation Rules

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

## 12. Recommended Minimal Handoff Notes

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

## 13. Quick Command Summary

```bash
fly apps create apex-hq-acme-pilot
fly volumes create apex_hq_acme_pilot_data --size 1 --region sjc --app apex-hq-acme-pilot
cp fly.toml fly.customer-acme.toml
fly deploy --config fly.customer-acme.toml
curl https://apex-hq-acme-pilot.fly.dev/api/ready
curl https://apex-hq-acme-pilot.fly.dev/api/setup/status
```

## Final Rule

If you are ever unsure whether a Fly app or volume is safe to use for a customer pilot, stop and create a brand-new app and brand-new volume.

That is safer than trying to reuse anything from:
- the demo app
- the real production app
- an internal testing environment
