# Apex HQ Pilot Route Audit P3 Backlog

Status: resolved by focused desktop Leads row polish

Purpose: keep visual follow-ups explicit and small so Apex HQ does not drift back into random polish while preparing for a first friendly pilot.

## Current Finding

Severity: P3

Route: `/leads`

Role / viewport: admin desktop

Evidence:

- manifest: `ui-audit/fencing-first-walkthrough-screenshots/2026-05-21T07-26-26-201Z/manifest.json`
- screenshot: `ui-audit/fencing-first-walkthrough-screenshots/2026-05-21T07-26-26-201Z/admin/desktop/leads.png`

The screenshot-only checker flagged possible clipped text in longer fencing lead titles and follow-up notes:

- `Cedar fence replacement estimate`
- `Finalize fence line, post layout, and install schedule`
- `Confirm gate width, hinge side, latch style, and post condition`
- `Confirm phased fence section sequence with the maintenance team`
- `Coordinate install window and patient access with the office manager`

The main visual route audit passed `/leads`, so this was not a guided walkthrough blocker.

## Completed Fix Scope

Completed as a focused UI pass:

- inspected `/leads` desktop row cells with real long fencing copy
- allowed lead names, project text, source labels, and next-step notes to wrap intentionally in the dense command table
- kept the dense command-board layout
- preserved mobile card layout
- preserved field-user redirects and office-only lead access
- reran admin desktop `/leads` visual route audit
- reran employee phone restricted-route check for `/leads`

## Do Not Combine With

- role/permission changes
- Opportunity Scout logic
- lead conversion logic
- package gates
- production deploy
- customer data entry
- broad North Star redesign

## Acceptance Criteria

- admin desktop `/leads` has no obvious clipped long lead/follow-up text in the screenshot pass: passed
- main visual audit still passes `/leads`: passed
- employee phone `/leads` remains field-safe and redirects/blocks correctly: passed
- `npm.cmd run verify:roles` passes: passed
- no horizontal overflow in checked routes: passed

## Verification Evidence

- admin desktop manifest: `ui-audit/leads-long-text-polish-admin/2026-05-21T09-07-28-492Z/manifest.json`
- employee phone restricted-route manifest: `ui-audit/leads-long-text-polish/2026-05-21T09-07-07-864Z/manifest.json`
- `npm.cmd run build`
- `npm.cmd run verify:roles`
- targeted `verify:leads` test groups passed after the aggregate command hung without output in the local shell
- `git diff --check`

## Priority

Keep as P3 until:

- the real pilot candidate says the lead queue is hard to read, or
- a new current screenshot audit shows the issue affects the first guided walkthrough narrative.

Production deploy remains locked unless approved through the backup-first release checklist.
