# Apex HQ Fencing First Walkthrough Readiness Report

Date: 2026-05-21

Target environment: `https://concrete-ops-demo.fly.dev`

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

Auth smoke was not run because `APEX_SMOKE_PASSWORD` was not present in the local shell.

## Browser Evidence

Admin desktop route audit:

- Manifest: `ui-audit/fencing-first-walkthrough/2026-05-21T07-23-54-425Z/manifest.json`
- Routes: `/command-center`, `/leads`, `/estimates`, `/jobs`, `/schedule`, `/reports`, `/uploads`, `/support`
- Result: 8 checked, 0 failures

Admin tablet route audit:

- Manifest: `ui-audit/fencing-first-walkthrough/2026-05-21T07-24-22-113Z/manifest.json`
- Routes: `/estimates`, `/jobs`, `/schedule`
- Result: 3 checked, 0 failures

Employee phone route audit:

- Manifest: `ui-audit/fencing-first-walkthrough/2026-05-21T07-24-37-244Z/manifest.json`
- Routes: `/jobs`, `/reports`, `/uploads`, `/time`, `/estimates`, `/leads`, `/settings`
- Result: 7 checked, 0 failures
- Restricted office routes redirected to field-safe workspace paths.

Screenshot capture:

- Manifest: `ui-audit/fencing-first-walkthrough-screenshots/2026-05-21T07-26-26-201Z/manifest.json`
- Screenshots captured: 18
- Noted issue: the screenshot-only checker flagged long text truncation on desktop Leads rows. The main visual audit passed the route. Treat as P3 follow-up, not a walkthrough blocker.

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
- Run auth hosted smoke with `APEX_SMOKE_PASSWORD` available.
- Confirm pilot terms/customer data expectations before outside login.
- Keep the contractor's current system as backup.
- Do not promise custom fencing features, guaranteed leads, automatic bidding, payments, payroll, or public launch readiness.

## Recommendation

Guided walkthrough: GO.

3-5 day friendly validation: GO with supervision after setup info is collected and auth smoke is run.

14-day founder pilot: CONDITIONAL GO after the friendly validation confirms usefulness and support load is manageable.

Public self-serve launch: NO-GO.

Production deploy remains locked unless approved through the backup-first release checklist.
