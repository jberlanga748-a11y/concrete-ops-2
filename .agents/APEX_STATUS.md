# Apex HQ Status

## Current Baseline

- Current repo: `jberlanga748-a11y/concrete-ops-2`
- Current local folder: `C:\Users\jberl\Documents\Codex\concrete-ops-2-clean`
- Branch: `main`
- Latest shipped app commit: `e0e05f2` (`Polish command center operator layout`)
- Latest Fly release: `v352`
- Latest image: `registry.fly.io/concrete-ops-2:deployment-01KRN5BMVSDBCFGDCRBDPEJHWJ`
- Live health check after v352: `ok: true`, `status: ready`, database `ok`
- Current workstream setup phase: organize parallel UI, product, and safety/QA tracks.

## Active Skills

Use these for Apex HQ work:

- `apex-platform-operator`
- `apex-elite-app-builder`
- `apex-ui-designer`
- `apex-overseer`
- `playwright` when screenshots/browser QA are needed

Use Spark reviewer agents for page releases and audit gates.

## Latest Full UI Audit

Builder screenshot/audit sweep:

- `output/playwright/full-ui-audit-builder-2026-05-15T06-56-43-397Z`
- 161 route/role/viewport checks
- 44 flags
- Main recurring issues:
  - mobile bottom-nav overlap on action-heavy pages
  - 1366px desktop table/right-rail squeeze on major command boards
  - field-safe wording review for internal `pricing` language
  - `/design`, `/settings`, and mobile `/ai-office` need route/permission/loading inspection

Spark audit splits completed:

- Office pages: `Aquinas`
- Field/mobile pages: `Nash`
- System/auth/app shell: `Hypatia`

Detailed work order lives in `.agents/APEX_UI_AUDIT_2026-05-15.md`.

## Parallel Workstreams

Detailed operating rules live in `.agents/APEX_WORKSTREAMS.md`.

Summary:

- Track A: Premium UI page passes
- Track B: Product feature phases
- Track C: Safety, permissions, QA, release hardening

Keep commits narrow. Do not mix risky backend/data changes into visual polish commits.

## Next Recommended Fix Order

1. System/permission alignment for `/design`, `/settings`, and `/ai-office` loading issues.
2. Change Orders field-safe copy/permission review for internal `pricing` terminology.
3. Global mobile bottom-nav safe-space pattern.
4. Time page structural redesign.
5. Pre-Pour and Post-Pour field-safe checklist pass.
6. Jobs, Estimates, Leads, Customers command-board desktop/table/mobile passes.
7. Uploads, Delivery Tickets, Reports mobile action-safe cleanup.
8. Employees mobile clipping cleanup.
9. Login semantic heading touch-up and public request visual capture.

## Release Rules

- Use explicit file paths when staging.
- Never use broad `git add .`.
- Run focused checks plus baseline checks for each phase.
- Use Spark review before commit/push/deploy for UI pages.
- Deploy only after verification passes and the phase touches shipped app behavior/UI.
