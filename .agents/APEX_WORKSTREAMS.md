# Apex HQ Workstreams

This file is the operating board for building Apex HQ quickly without mixing unrelated risk.

Status note, 2026-05-17:
Use `docs/APEX_HQ_BUILD_STATUS_AND_PHASES.md` for the active phase queue. The lists below are workstream reference material and may include older completed UI priorities.

## Track A - Premium UI Passes

Purpose: make the app look and feel like a premium contractor SaaS command center.

Typical files:

- `src/App.jsx`
- `src/index.css`
- focused frontend utility files only when required

Rules:

- Work one page or one shared shell system at a time.
- Preserve real handlers, data, routes, permissions, and workflows.
- Use canonical skills first: `apex-build-router`, `apex-product-system`, `apex-ui-designer`, `apex-qa-engineer`, and `apex-release-manager` when releasing.
- Treat `apex-elite-app-builder`, `apex-platform-operator`, and `apex-overseer` as legacy/reference skills unless an older prompt explicitly requires them.
- Use Spark review before commit/push/deploy.
- Capture desktop and mobile screenshots.
- Audit desktop and mobile before commit.

Current queue:

1. Only fix proven mobile/desktop friction found during pilot or phase QA.
2. Preserve the released Operations Command north-star direction.
3. Do not restart frozen page redesigns unless a workflow is broken.

## Track B - Product Feature Phases

Purpose: add valuable Apex HQ product capability without destabilizing UI work.

Examples:

- AI Office Agent Phase 1: Daily Brief + Suggested Actions
- AI Pending Actions / Approval Queue
- Daily Job Finder expansion
- Notifications
- Payroll planning
- PWA install/offline phases
- Website lead intake
- Contact history expansion
- Company setup and multi-company hardening

Rules:

- Keep feature phases separate from pure UI polish.
- Add or update focused tests.
- Keep API keys server-side only.
- No `VITE_` secrets.
- AI suggests and drafts; risky actions need human approval.
- Field roles stay blocked from office/admin/pricing/internal data.

Current product queue:

1. Public SaaS Signup UX Phase 2 - onboarding polish without rebuilding auth.
2. Package Upgrade / Locked State Polish - clear upgrade/locked states before billing.
3. Advanced Reporting Prep - define reporting surfaces before job-costing/payroll integrations.
4. Enterprise Trust Prep - audit/export/admin trust surfaces without overbuilding compliance.
5. Assistant Command Expansion Phase 2 - reviewed command flows after shell usage is proven.

## Track C - Safety, QA, Release Hardening

Purpose: keep Apex HQ safe enough for real contractors.

Typical work:

- permission tests
- company-scope tests
- field forbidden-word checks
- screenshot/audit scripts
- backup and restore drills
- deploy health checks
- rollback notes
- route-loading regression checks

Current queue:

1. Keep release/rollback/health notes current after every release.
2. Add reusable mobile bottom-nav overlap audit when mobile QA shows recurring risk.
3. Add responsive table overflow audit for desktop 1366px when UI work resumes.
4. Continue role/company/package checks for every feature phase.
5. Keep demo vs real workspace boundaries visible in tests and docs.

## Parallel Rules

- Track A and Track B can run in parallel only when they do not touch the same files.
- Track C can review either track, but safety fixes get priority over visual polish.
- Do not combine backend/schema/API changes with a visual-only page polish commit.
- Do not combine permission changes with unrelated CSS cleanup.
- If a change affects permissions, company scope, auth, routes, or field visibility, run role tests before screenshots.

## Standard UI Phase Loop

1. Confirm clean repo, branch, remote, and latest main.
2. Read Apex skills.
3. Inspect current page and reference pages.
4. Implement the full-page pass.
5. Run focused tests and baseline checks.
6. Capture desktop/mobile screenshots.
7. Run automated visual audit where practical.
8. Send evidence to Spark reviewer.
9. Fix until Spark approves.
10. Stage explicit files only.
11. Commit, push, deploy if app UI changed.
12. Health check live app.
13. Update `.agents/APEX_STATUS.md`.

## Standard Product Feature Loop

1. Confirm phase scope and risk.
2. Inspect existing data/API/permissions patterns.
3. Implement narrow backend/frontend changes.
4. Add focused tests.
5. Run role/company-scope checks when relevant.
6. Verify build/server/backup.
7. Commit explicit files only.
8. Push/deploy/health check when verified.
9. Update `.agents/APEX_STATUS.md`.
