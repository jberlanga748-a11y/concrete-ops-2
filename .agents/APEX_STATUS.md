# Apex HQ Status

## Current Phase

Opportunity Scout / AI daily job finder command layer is approved for release.

## Current State

- Latest app-code commit: `355109f` (`Polish mobile command board controls`).
- Latest Fly release: `v324`.
- Latest image: `registry.fly.io/concrete-ops-2:deployment-01KRKBS2PSD08ZYJ47YAHV04B5`.
- Live health check passed: `ok: true`, `status: ready`, database `ok`.
- Working tree was clean after the v324 deploy.
- Current local changes add a review-only Daily Job Finder layer to AI Office / Opportunity Scout.
- Epicurus approved commit/push/deploy after local audit and verification.

## Recent Shipped UI Phases

- Dashboard mobile command flow: commit `e92cdba`, Fly `v322`.
- Toolbox Talks mobile filters: commit `9db7969`, Fly `v323`.
- Shared mobile command-board controls: commit `355109f`, Fly `v324`.

## Latest Audits

- Local Daily Job Finder final audit: `output/playwright/ai-job-finder-final-audit/2026-05-14T14-16-35-400Z`
  - 3 passes across desktop `1536x864`, desktop `1280x800`, and mobile `390x844`.
  - Flagged issues: 0.
- Field AI Office block check:
  - Foreman redirected to `/jobs`; AI Office and Daily Job Finder not visible.
  - Employee redirected to `/jobs`; AI Office and Daily Job Finder not visible.
- Full local post-release sweep: `output/playwright/cross-page-sweep-after-mobile-controls/2026-05-14T13-48-26-711Z`
  - 108 route/role/viewport checks.
  - Flagged issues: 0.
- Live v324 visual smoke: `output/playwright/live-v324-visual-smoke/2026-05-14T13-54-07-644Z`
  - 20 deployed route/role/viewport screenshots.
  - Flagged issues: 0.

## Verification Snapshot

- `npm.cmd run build` passed.
- `npm.cmd run verify:roles` passed.
- `npm.cmd run verify:leads` passed.
- `npm.cmd run verify:customers` passed.
- `npm.cmd run verify:estimates` passed.
- `npm.cmd run verify:jobs` passed.
- `npm.cmd run verify:safety` passed for Toolbox Talks work.
- `npm.cmd run verify:field-workspaces` passed.
- `npm.cmd run verify:server` passed.
- `npm.cmd run verify:backup` passed.
- `npm.cmd run verify:demo` passed.
- Focused routing/navigation/design-token tests passed.
- `git diff --check` passed with LF/CRLF warnings only.

## Next Recommended Phase

After this phase ships, continue Opportunity Scout toward a real daily job-finding system:

- Keep it review-only first.
- Do not auto-send messages or auto-create customer commitments.
- Keep all AI provider keys server-side only.
- Keep field roles blocked from leads, estimates, pricing, AI office, and admin data.
- Preserve current lead/source/opportunity workflows while adding daily job-finding guidance.
