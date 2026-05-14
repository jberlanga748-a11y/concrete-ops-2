# Apex HQ Status

## Current Phase

Uploads / Photo Evidence command page polish is next.

## Current State

- Reports phase is committed, pushed, deployed, and health-checked.
- Reports route `/reports` was the only app page intentionally changed.
- Latest Reports app files changed:
  - `src/App.jsx`
  - `src/index.css`
- Project coordination file updated:
  - `.agents/APEX_STATUS.md`

## Latest Audit

- Reports audit captured admin, foreman, and employee views at desktop and mobile sizes.
- No horizontal overflow detected in the latest Reports screenshot metrics.
- Mobile Start Report open state clears the bottom nav.
- Latest Reports screenshots:
  - `output/playwright/reports-final-polish/2026-05-14T03-07-24-976Z`
  - `output/playwright/reports-overseer-fixes/2026-05-14T03-14-08-652Z`

## Verification

- `npm.cmd run build` passed.
- `npm.cmd run verify:roles` passed.
- `npm.cmd run verify:daily-reports` passed.
- `npm.cmd run verify:field-workspaces` passed.
- `npm.cmd run verify:server` passed.
- Focused routing/navigation/design token tests passed.
- `git diff --check` passed with LF/CRLF warnings only.

## Release Status

- Reports released to `origin/main` and Fly app `concrete-ops-2`.

## Remaining Notes

- Apex Overseer approved Reports for release.
- Generated screenshots should remain untracked under `output/`.
- Commit: `3d51dc5` (`Polish daily reports command page`)
- Fly image: `registry.fly.io/concrete-ops-2:deployment-01KRJ7WRQKN7072G67ZBZ0ECKY`
- Health check passed: HTTP 200, `ok: true`, `status: ready`, database `ok`.
- Next recommended phase: Uploads / Photo Evidence command page polish.
