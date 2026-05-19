# Apex HQ Manual Pilot Smoke Test

Status: Phase 1 controlled-pilot gate

Purpose: prove a narrow Apex HQ pilot environment is safe enough for a guided contractor pilot before any real customer data, field users, or workflow commitments are introduced.

This is a non-destructive readiness test. It does not send messages, submit bids, collect payments, change packages, create production workspaces, or mutate production data.

## When To Run

Run this smoke test:

- before a Day 0 pilot kickoff
- after any deploy to a pilot environment
- after auth, role, package, backup, restore, or data-scope changes
- before adding a real field user
- before importing or entering a real job, estimate, customer, or proof workflow

Do not run this as a substitute for a backup, restore drill, or production release review.

## Environment Rules

Confirm the target before starting.

Demo:

- Fly app: `concrete-ops-demo`
- URL: `https://concrete-ops-demo.fly.dev`
- config: `fly.demo.toml`
- demo data is allowed
- package may be temporarily set to Elite for Opportunity Scout acceptance, then rolled back to Premium

Pilot:

- each real pilot should use an approved isolated pilot workspace or app
- `DEMO_MODE` must be off unless the environment is intentionally synthetic
- `SEED_DEMO_DATA=false`
- no customer pilot should reuse the demo volume
- no production app or production volume should be used for rehearsal data

Production:

- do not run mutation-capable demo smoke scripts against production
- production deploys require separate approval, backup, release checklist, and rollback plan

## Required Inputs

Before a pilot smoke, confirm:

- owner/admin login exists
- field login exists if field work is in scope
- target workflow is selected
- selected workflow has one test record or safe synthetic record
- support/severity owner is known
- rollback path is known for the environment
- secrets are available through the environment, not pasted into docs or chat

For hosted demo smoke with auth:

```powershell
$env:APEX_SMOKE_PASSWORD="<demo smoke password>"
```

Do not commit passwords, tokens, cookies, MFA codes, session IDs, or API keys.

## Automated Non-Destructive Hosted Smoke

Use this first for demo or preview route/auth checks:

```powershell
npm.cmd run smoke:hosted -- --base-url=https://concrete-ops-demo.fly.dev --allow-auth --json
```

This checks:

- `/api/health`
- `/api/ready`
- direct app routes
- admin login/bootstrap
- employee login/bootstrap
- employee restricted API responses
- login/bootstrap latency budgets

Expected result:

- `/api/ready` returns `200`
- database check is `ok`
- main routes return app responses
- admin and employee bootstrap succeed
- employee restricted APIs return `403`
- login/bootstrap durations stay inside script budgets

If auth is not available, run:

```powershell
npm.cmd run smoke:hosted -- --base-url=https://concrete-ops-demo.fly.dev --skip-auth --json
```

Mark auth, field, and restricted-route checks as unverified if skipped.

## Opportunity Scout Demo Acceptance

For the Fly demo only, use the guarded orchestrator:

```powershell
$env:APEX_SMOKE_PASSWORD="<demo smoke password>"
npm.cmd run smoke:opportunity-scout:fly-demo -- --json
```

This script:

- wakes the demo app
- checks Fly status and health checks
- takes a demo backup
- temporarily sets `COMPANY-DEFAULT` to Elite
- runs Opportunity Scout hosted acceptance
- rejects unsafe auto-contact and bid-submission payloads
- confirms employee users remain blocked
- creates one smoke opportunity
- confirms lead conversion is blocked before approval
- approves for lead
- converts to lead
- confirms the converted lead is visible
- cleans smoke records
- rolls the demo package back to Premium
- verifies cleanup is empty
- runs final hosted smoke

Expected result:

- backup path is printed
- admin package becomes Elite only during the test
- employee Opportunity Scout access remains blocked
- unsafe payloads return `400`
- conversion before approval returns `409`
- approved conversion returns `201`
- cleanup reports zero remaining smoke artifacts
- package rollback reports Premium
- final hosted smoke passes

Stop and investigate if:

- backup fails
- rollback fails
- cleanup leaves smoke artifacts
- employee can access Opportunity Scout
- unsafe payloads are accepted
- login/bootstrap exceeds latency budgets

## Manual Browser Smoke

Use a real browser for the pilot workflow the contractor will actually use.

Owner/admin:

- log in
- open `/command-center`
- confirm the app shell loads without console errors
- open the selected workflow route
- confirm owner/admin sees the expected record or empty state
- confirm Support is available for manual help
- confirm Settings does not expose checkout, Stripe, invoices, or self-serve plan changes

Field user:

- log in on phone width or a real phone
- confirm Field Mode loads
- open assigned job/field route
- confirm only assigned or field-safe work is visible
- confirm office/admin routes redirect or block
- confirm pricing, package, billing, owner settings, and admin controls are not visible

Pilot workflow:

- confirm the first lead, estimate, job, or field action is selected
- confirm the next action is obvious
- confirm proof/report/upload/ticket/checklist paths match the pilot scope
- confirm no automatic customer communication is triggered
- confirm no AI action submits work externally

## Manual API Safety Checks

Use an employee token only in a safe dev/demo/pilot environment. The employee should receive `403` for office/admin APIs.

Minimum restricted endpoints:

```text
/api/customers
/api/users
/api/estimates
/api/export/company
/api/owner-health
```

Do not test destructive endpoints against production.

## Pass Criteria

Pilot smoke passes when:

- target environment is confirmed
- `/api/ready` is healthy
- backup exists if the environment has persistent data
- owner/admin login works
- field login works if field workflow is in scope
- field users are blocked from office/admin/money/package surfaces
- selected workflow route loads
- no console/network errors block the selected workflow
- no obvious mobile layout break blocks the field action
- support/severity process is known
- no custom feature promise is needed to start the pilot

## Fail Criteria

Do not start or continue pilot setup when:

- readiness fails
- backup fails or is missing for persistent data
- login/bootstrap is slow or failing
- employee sees office/admin/package/billing controls
- selected workflow cannot be opened
- data from the wrong company/workspace appears
- demo data appears in a real pilot environment
- smoke scripts leave test records behind
- support owner or escalation path is unclear
- the pilot requires an unbuilt product promise

## Evidence To Save

For each pilot smoke, record:

- date/time
- environment URL
- commit hash
- Fly release or preview URL
- backup path, if applicable
- smoke commands run
- pass/fail result
- field restricted-route result
- selected pilot workflow
- unresolved risks
- go/no-go decision

Keep evidence in the pilot notes or internal tracker. Do not store secrets in docs.

## Day 0 Decision

Go:

- all pass criteria are met
- pilot is one narrow workflow
- support and rollback paths are known

Conditional go:

- only minor UI/copy issues remain
- workaround is clear
- owner accepts the limitation

No-go:

- any fail criterion is present
- data isolation, role safety, backup, login, or readiness is uncertain

