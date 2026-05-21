# Apex HQ Pilot Route Audit P3 Backlog

Status: scoped follow-up backlog from the fencing walkthrough screenshot pass

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

The main visual route audit passed `/leads`, so this is not a guided walkthrough blocker.

## Recommended Fix Scope

Do later as a focused UI pass:

- inspect `/leads` desktop row/card cells with real long fencing copy
- allow lead names and follow-up notes to wrap or clamp intentionally
- keep dense command-board layout
- preserve mobile card layout
- preserve field-user redirects and office-only lead access
- rerun admin desktop `/leads` screenshot audit
- rerun employee phone restricted-route check for `/leads`

## Do Not Combine With

- role/permission changes
- Opportunity Scout logic
- lead conversion logic
- package gates
- production deploy
- customer data entry
- broad North Star redesign

## Acceptance Criteria

- admin desktop `/leads` has no obvious clipped long lead/follow-up text in the screenshot pass
- main visual audit still passes `/leads`
- employee phone `/leads` remains field-safe and redirects/blocks correctly
- `npm.cmd run verify:roles` passes if any route guard or nav path is touched
- no horizontal overflow

## Priority

Keep as P3 until:

- the real pilot candidate says the lead queue is hard to read, or
- a new current screenshot audit shows the issue affects the first guided walkthrough narrative.

Production deploy remains locked unless approved through the backup-first release checklist.
