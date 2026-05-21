# Apex HQ Fencing First Walkthrough Readiness Report

Date: 2026-05-21

Latest evidence refresh: 2026-05-21T09:59:17Z

Target environment: `https://concrete-ops-demo.fly.dev`

Latest demo deployment:

- Fly demo version: `130`
- Fly demo image: `registry.fly.io/concrete-ops-demo:deployment-01KS4Z90RCA1G8RCBKSQQDEE2F`
- Latest pushed commit at refresh: `2a59644`

Status: guided walkthrough GO, controlled pilot GO with supervision, public launch NO-GO.

## What Was Prepared

- Generated the first fencing pilot packet.
- Rehearsed the primary demo chain against the Fly demo app.
- Verified admin desktop routes for the selected workflow.
- Verified admin tablet routes for estimate/job/schedule workbench behavior.
- Verified employee phone field routes and office-route redirects.
- Confirmed role tests still pass.

## Pilot Packet

Committed packet:

- `docs/apex-hq-first-fencing-pilot-packet.md`

The generated `tmp` artifact was copied into the committed packet and cleaned from the working tree. The committed packet is the durable source for walkthrough prep.

## Demo Health

`/api/ready` returned ready with database ok:

```json
{
  "ok": true,
  "status": "ready",
  "checks": {
    "database": "ok"
  }
}
```

## Hosted Smoke

Command:

```powershell
npm.cmd run smoke:hosted -- --base-url=https://concrete-ops-demo.fly.dev --skip-auth --json
```

Result: PASS.

Checked:

- `/api/health`
- `/api/ready`
- `/`
- `/command-center`
- `/jobs`
- `/reports`
- `/uploads`
- `/schedule`
- `/customers`
- `/employees`
- `/estimates`
- `/support`
- field/demo utility routes

Auth smoke was intentionally skipped for this refresh because the preflight ran without `--allow-auth`.

Latest auth-smoke note: local authenticated hosted smoke remains blocked because `APEX_SMOKE_PASSWORD` is not set in the current shell. Skip-auth hosted smoke passed against the demo app after the v130 deploy.

## Browser Evidence

Admin desktop route audit:

- Manifest: `ui-audit/fencing-first-walkthrough/2026-05-21T09-23-09-399Z/manifest.json`
- Routes: `/command-center`, `/leads`, `/estimates`, `/jobs`, `/schedule`, `/reports`, `/uploads`, `/support`
- Result: 8 checked, 0 failures

Admin tablet route audit:

- Manifest: `ui-audit/fencing-first-walkthrough/2026-05-21T09-23-21-902Z/manifest.json`
- Routes: `/estimates`, `/jobs`, `/schedule`
- Result: 3 checked, 0 failures

Employee phone route audit:

- Manifest: `ui-audit/fencing-first-walkthrough/2026-05-21T09-23-28-771Z/manifest.json`
- Routes: `/jobs`, `/reports`, `/uploads`, `/time`, `/estimates`, `/leads`, `/settings`
- Result: 7 checked, 0 failures
- Restricted office routes redirected to field-safe workspace paths.

Screenshot capture:

- Manifest: `ui-audit/fencing-first-walkthrough-screenshots/2026-05-21T07-26-26-201Z/manifest.json`
- Screenshots captured: 18
- Prior screenshot-only Leads row truncation finding was resolved in the focused desktop Leads text polish pass. The current admin desktop route audit passed `/leads`.

## Verification Commands

```powershell
npm.cmd run pilot:fencing-preflight -- --run --json
Invoke-RestMethod https://concrete-ops-demo.fly.dev/api/ready
npm.cmd run pilot:first-user-packet -- --company="First Friendly Fencing Contractor" --trade="fencing" --workflow="lead / opportunity -> estimate -> job -> schedule -> field proof -> report/upload -> ready-to-bill review" --owner="Owner/admin to confirm" --field-lead="First field lead to confirm" --first-record="First active fence lead or estimate" --field-action="Upload one fence jobsite photo and complete one proof item" --success="Owner can see lead, estimate, job, schedule, proof, and next follow-up in one place" --success="One field user can complete one phone action without seeing office pricing or settings" --success="Owner can decide by Day 3 whether the workflow is useful enough for a 14-day founder pilot" --write
npm.cmd run smoke:hosted -- --base-url=https://concrete-ops-demo.fly.dev --skip-auth --json
npm.cmd run audit:visual-polish -- --base-url=https://concrete-ops-demo.fly.dev --browser=chromium --roles=admin --viewports=desktop --routes=/command-center,/leads,/estimates,/jobs,/schedule,/reports,/uploads,/support --output-dir=ui-audit/fencing-first-walkthrough
npm.cmd run audit:visual-polish -- --base-url=https://concrete-ops-demo.fly.dev --browser=chromium --roles=admin --viewports=tablet --routes=/estimates,/jobs,/schedule --output-dir=ui-audit/fencing-first-walkthrough
npm.cmd run audit:visual-polish -- --base-url=https://concrete-ops-demo.fly.dev --browser=chromium --roles=employee --viewports=phone --routes=/jobs,/reports,/uploads,/time,/estimates,/leads,/settings --output-dir=ui-audit/fencing-first-walkthrough
npm.cmd run verify:first-user-pilot-packet
npm.cmd run verify:pilot-readiness
npm.cmd run verify:roles
```

Use the first command as the repeatable one-command preflight before the live walkthrough. The remaining commands are the expanded manual sequence for inspection or troubleshooting.

## Role And Permission Result

Result: PASS.

- Owner/admin demo chain loaded.
- Employee phone field routes loaded.
- Employee direct access to `/estimates`, `/leads`, and `/settings` redirected to field-safe `/jobs`.
- `npm.cmd run verify:roles` passed 12 tests.

## Remaining Gaps Before A Real User

- Confirm actual company name, owner/admin email, field lead email, and first real record.
- Run auth hosted smoke with `APEX_SMOKE_PASSWORD` available and `--allow-auth` explicitly set.
- Confirm pilot terms/customer data expectations before outside login.
- Keep the contractor's current system as backup.
- Do not promise custom fencing features, guaranteed leads, automatic bidding, payments, payroll, or public launch readiness.

## Latest Full Pilot Readiness Gate

Command:

```powershell
npm.cmd run verify:pilot-readiness
```

Result: PASS on 2026-05-21T09:59Z.

Covered:

- docs drift and public claims checks
- customer pilot config safety
- pilot rehearsal helpers
- first-user packet tests
- fencing preflight, intake, check-in, setup approval, and config dry-run tests
- role and permission tests
- backup/export verification
- local restore drill
- production build

Backup/restore artifacts from the latest local readiness run:

- backup verification: `app-data-20260521-095905Z.sqlite` and `app-data-20260521-095905Z.json`
- restore drill: `app-data-20260521-095906Z.sqlite` and `app-data-20260521-095906Z.json`

## Recommendation

Guided walkthrough: GO.

3-5 day friendly validation: GO with supervision after setup info is collected and auth smoke is run.

14-day founder pilot: CONDITIONAL GO after the friendly validation confirms usefulness and support load is manageable.

Public self-serve launch: NO-GO.

Production deploy remains locked unless approved through the backup-first release checklist.
