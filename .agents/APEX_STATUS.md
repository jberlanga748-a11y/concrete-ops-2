# Apex HQ Status

## Current Phase

Jobs UI touch-up: office Jobs board density, field Jobs mobile/desktop polish, and field-safe job workflow clarity.

## Current State

- Jobs phase is committed, pushed, and deployed.
- Jobs route `/jobs` is the only app page intentionally changed.
- Current intended changed app files:
  - `src/App.jsx`
  - `src/index.css`
- Project coordination file updated:
  - `.agents/APEX_STATUS.md`

## Latest Audit

- Jobs audit captured office/admin, foreman, and employee views at desktop and mobile sizes.
- No horizontal overflow detected in the latest Jobs screenshot metrics.
- Latest Jobs screenshots:
  - `output/playwright/jobs-final-audit/2026-05-14T01-34-04-896Z`
  - `output/playwright/jobs-final-audit/manual-2026-05-14T01-40-54-225Z`
  - `output/playwright/jobs-overseer-adjusted/2026-05-14T01-49-47-764Z`
  - `output/playwright/jobs-mobile-nav-final/2026-05-14T01-58-42-940Z`

## Verification

- `npm.cmd run build` passed.
- `npm.cmd run build` passed during Jobs implementation.
- `npm.cmd run verify:roles` passed.
- `npm.cmd run verify:jobs` passed.
- `npm.cmd run verify:field-workspaces` passed.
- Focused routing/navigation/design token tests passed.
- `git diff --check` passed with LF/CRLF warnings only.

## Release Status

- Not committed.
- Not pushed.
- Not deployed.

## Remaining Notes

- Apex Overseer approved Jobs for release.
- Generated screenshots should remain untracked under `output/`.
- Commit: `53ca9e3` (`Polish jobs field command workspace`)
- Fly image: `registry.fly.io/concrete-ops-2:deployment-01KRJ3PVRTY4QNJ3WADD7DJ5D0`
- Health check passed: HTTP 200, `ok: true`, `status: ready`, database `ok`.
- Next recommended phase: Time / Clock command page polish.
