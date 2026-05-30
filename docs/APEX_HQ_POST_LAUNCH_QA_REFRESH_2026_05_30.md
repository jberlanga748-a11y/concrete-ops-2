# Apex HQ Post-Launch QA Refresh - 2026-05-30

## Goal

Verify the live Apex HQ production app after the Phase 8-14 launch batch and post-launch cleanup. This pass looked for production health issues, login/auth regressions, protected-route leaks, mobile shell problems, and field-user permission regressions without building new features or changing production data beyond the approved production auth smoke login/session checks.

## Production Target

- URL: `https://app.apexhq.online`
- Fly app: `concrete-ops-2`
- Production release: `v616`
- Image: `concrete-ops-2:deployment-01KSWP2150N1VYY9JMW6VDC3J6`
- Repo commit during QA: `8106a49`

## Results

| Area | Result | Evidence |
| --- | --- | --- |
| Fly status | Pass | Machine `148e06e2b53d68` in `sjc` was `started`; checks showed `1 total, 1 passing`. |
| Readiness | Pass | `https://app.apexhq.online/api/ready` returned `ok: true`, `status: ready`, database `ok`. |
| Hosted health/routes smoke | Pass | `npm.cmd run smoke:hosted -- --base-url=https://app.apexhq.online --skip-auth --json` returned 200 for `/api/health`, `/api/ready`, and the checked app routes. |
| Production auth smoke | Pass | GitHub Actions run `26690508547` completed successfully against commit `8106a49`. |
| Admin auth/bootstrap | Pass | Production auth smoke logged `smoke.admin@apexhq.app` as `Administrator`; login 227 ms, bootstrap 712 ms. |
| Employee auth/bootstrap | Pass | Production auth smoke logged `smoke.employee@apexhq.app` as `Employee`; login 180 ms, bootstrap 422 ms. |
| Employee restricted APIs | Pass | Production auth smoke confirmed 403 for `/api/customers`, `/api/users`, `/api/estimates`, `/api/export/company`, and `/api/owner-health`. |
| Public desktop/mobile shell | Pass | Playwright checked `/`, `/command-center`, `/jobs`, `/field`, `/time`, `/change-orders`, `/billing`, `/communications`, and `/ai-office` on desktop and mobile. Each route returned the Apex HQ login shell, no setup screen, no protected app text, and no horizontal overflow. |

## Browser Evidence

Local Playwright screenshot evidence was written outside the active repo to:

`C:\Users\jberl\Documents\Apex HQ QA evidence\2026-05-30-production-public-shell-refined`

The report file is:

`C:\Users\jberl\Documents\Apex HQ QA evidence\2026-05-30-production-public-shell-refined\report.json`

The expected unauthenticated `/api/bootstrap` 401 was seen on each public shell route. That is the correct behavior for logged-out protected app routes and was not treated as a blocker.

## Known Coverage Gap

Authenticated foreman production browser QA was not completed in this local pass. The current shell does not have `APEX_PRODUCTION_SMOKE_PASSWORD`, and the existing GitHub production auth smoke workflow covers admin and employee smoke users only. Foreman-specific authenticated production visual QA should be added to the production smoke path or run locally once an approved foreman smoke credential path exists.

## Issues Found

No P0/P1 production blockers were found in this pass.

## Permissions Impact

No permission changes were made. Employee restricted API checks passed. Public unauthenticated routes did not expose office, billing, payroll, AI Office, or protected workflow content.

## Mobile Impact

Mobile public-shell checks passed for the main target routes with no horizontal overflow and no protected shell leakage. Authenticated mobile visual QA remains limited by the missing local production smoke credential.

## Field-User Impact

Employee authenticated smoke passed and office-only API restrictions returned 403. Foreman-specific authenticated production coverage remains a follow-up gap.

## Rollback Plan

No app changes were made. If this QA note needs to be removed, revert the commit that adds this document. Production rollback remains the standard Fly release rollback path documented in the launch runbooks.

## Next Recommended Action

Add foreman coverage to the approved production auth smoke workflow or run a local authenticated foreman mobile browser QA pass after an approved production smoke credential is available in the shell.
