# Apex HQ Phase 1 Admin Foundation Pre-Build Audit

Last updated: 2026-05-30

Status: ready to implement, not ready to freeze.

## Straight Verdict

Phase 1 is not empty. Apex HQ already has most of the Admin Foundation parts in place.

Phase 1 is not finished because the owner/admin setup workflow is still scattered across Settings, Employees, App Health, Support, Imported Drafts, billing readiness, and integrations readiness. A contractor should not have to guess where setup is finished.

The hard blocker found in browser QA is `/imported-drafts`: the route crashes for owner/admin users with `useEffect is not defined`.

The hard verification blocker is `npm.cmd run verify:job-draft-imports`: it is red because the server test helper logs in with cookie-first auth, then tries to use an undefined bearer token for `/api/bootstrap`.

Field-role protection is currently holding: employee mobile direct routes to Settings, Employees, App Health, and Imported Drafts redirect to Field Mode, and Support opens without admin/provider/billing/price text.

## Skills Used

- `apex-master-coordinator`: phase control, no-loop source of truth, decision log.
- `apex-product-architect`: complete contractor workflow definition.
- `apex-feature-builder`: inspect existing systems before building.
- `apex-permission-safety`: field/admin boundary, secrets, provider and money safety.
- `apex-qa-engineer`: tests, browser QA, role/mobile evidence.
- `apex-finished-vision`: finished contractor-first product standard.

## Repo Memory Reviewed

- `README.md`
- `docs/APEX_HQ_BUILD_STATUS_AND_PHASES.md`
- `APEX_HQ_MASTER_ROADMAP.md`
- `APEX_HQ_MASTER_CHECKLIST.md`
- `.agents/APEX_WORKSTREAMS.md`
- `.agents/APEX_STATUS.md`
- `docs/APEX_HQ_ROADMAP.md`
- `docs/AGENT_OPERATING_MODEL.md`
- `docs/APEX_HQ_LIVING_FINISH_PLAN.md`
- `docs/APEX_HQ_TOOL_COMPLETION_BLUEPRINT.md`

Active source of truth: `docs/APEX_HQ_TOOL_COMPLETION_BLUEPRINT.md`.

## Phase 1 Tool Inventory

| Tool | Current Status | Evidence | Finish Gap |
| --- | --- | --- | --- |
| Login / Demo Access | Built | Auth, bootstrap, demo role tests pass. | Freeze after Phase 1 browser/route evidence is clean. |
| Signup / First Owner Setup | Partial | `/api/setup/status`, `/api/setup/bootstrap-admin`, `/api/signup/company`, first-owner onboarding, managed setup state exist. | One guided finish path from company create -> profile -> users -> provider/package status -> app health -> support packet. |
| Invite Activation / Password Reset | Built / Provider-ready | Expiring invite and reset endpoints exist; user tests pass. | Email provider-not-configured state must be explicit; no automatic email send. |
| Employees | Partial | Owner/admin Employees page exists with create/edit/reissue invite, role grouping, server-side user management. | Add access review and Phase 1 freeze evidence: field-safe roles, inactive users, invites, owner/admin status, payroll boundary. |
| Settings | Partial | Managed setup, profile/branding, admin controls, plan readiness, integrations command, owner health drawer exist. | Add one Admin Foundation Finish command surface; remove dead ends and duplicated half-panels. |
| App Health | Partial | Owner Health, Enterprise Trust, audit, release/rollback, PWA, support packet surfaces exist. | Tie health evidence into the Phase 1 finish board and freeze checklist. |
| Support | Built / Light Finish | Support Command Center is copy-only and role-safe. | Add support packet readiness to Phase 1 finish evidence. |
| Imported Drafts | Server built, UI broken | Server API and inbound contracts exist; route currently crashes in browser. | Fix `useEffect` import, add route/render coverage, make verification pass. |
| Integrations setup board | Partial / Provider-ready | Settings integrations board maps providers, readiness, disabled state, no frontend secrets, and locked writes. | Ensure owner/admin can see setup even when provider/account is unpaid/unconfigured; keep live writes locked. |
| Package/billing readiness setup | Readiness layer | Billing/package readiness panel exists and tests pass. | Keep provider/payment setup visible to owner/admin; do not enable live checkout, invoices, payment links, charges, or package mutation. |

## Code Review Findings

Server foundations already exist in `server/index.js` for setup status, first admin bootstrap, signup, invite activation, password reset, login/bootstrap, company settings, owner health, users, imported job drafts, and provider/import readiness endpoints.

Role foundations already exist in `shared/permissions.js`. Office roles can open admin/setup surfaces; field roles are excluded from settings, employees, app health, imported drafts, billing/package, provider setup, leads, estimates, AI office, and other office data.

Bootstrap data is role-filtered before it reaches the client. Field users receive a field-safe company settings subset, not full package/provider/company setup context.

The main product gap is not missing raw parts. The gap is an owner/admin Admin Foundation Finish Board that proves the phase is complete across setup, users, roles, package/provider status, app health, support, imported drafts, integrations, and field access protection.

The direct code bug is in `src/imported-job-drafts-page-components.jsx`: the component imports `useMemo`, `useRef`, and `useState`, but it also calls `useEffect`.

The current package model still creates product locks. Phase 1 should follow the owner's rule: security and field-role locks stay hard; unpaid provider/live-money locks stay hard; owner/admin setup and provider-readiness surfaces should stay visible instead of disappearing behind package locks.

## Browser Review

Local app:

- URL: `http://127.0.0.1:4174`
- Isolated local data directory.
- Screenshot evidence: `ui-audit/phase1-prebuild/2026-05-30T06-52-11-237Z/`

Owner desktop:

| Route | Result |
| --- | --- |
| `/settings` | Pass. No console errors, no failed requests, no horizontal overflow. Shows Settings, Managed Setup, Billing readiness. |
| `/employees` | Pass. No console errors, no failed requests, no horizontal overflow. Shows Employees and New User. |
| `/app-health` | Pass. No console errors, no failed requests, no horizontal overflow. Shows App Health, Owner Health, Enterprise/trust context. |
| `/support` | Pass. No console errors, no failed requests, no horizontal overflow. Shows Support Command Center and copy workflow. |
| `/imported-drafts` | Fail. Runtime crash: `useEffect is not defined`. Page renders startup error instead of Imported Drafts workflow. |

Employee mobile:

| Route | Result |
| --- | --- |
| `/settings` | Pass. Redirects to `/jobs` Field Mode. No forbidden admin/money/provider text found. |
| `/employees` | Pass. Redirects to `/jobs` Field Mode. No forbidden admin/money/provider text found. |
| `/app-health` | Pass. Redirects to `/jobs` Field Mode. No forbidden admin/money/provider text found. |
| `/imported-drafts` | Pass. Redirects to `/jobs` Field Mode. No forbidden admin/money/provider text found. |
| `/support` | Pass. Opens role-safe Support Command Center. No forbidden admin/money/provider text found. |

## Verification Run

Passed:

- `npm.cmd run verify:auth`
- `npm.cmd run verify:users`
- `npm.cmd run verify:support`
- `npm.cmd run verify:app-health`
- `npm.cmd run verify:entitlements`
- `npm.cmd run verify:billing-readiness`
- `npm.cmd run verify:roles`
- `npm.cmd run build`

Failed:

- `npm.cmd run verify:job-draft-imports`

Failure reason:

- `server/job-draft-imports.test.js` logs in without requesting a bearer token, then calls `/api/bootstrap` with `Authorization: Bearer ${ownerLogin.token}`.
- `ownerLogin.token` is undefined under the current cookie-first login response unless the request asks for bearer mode or `returnToken`.
- Result: `/api/bootstrap` returns session expired and 9 tests fail.

## Blockers Before Phase 1 Can Freeze

1. Fix `/imported-drafts` runtime crash by importing `useEffect`.
2. Add route/render test coverage that catches the imported drafts crash before browser QA.
3. Fix the job-draft-imports test helper to request bearer mode or use cookie auth consistently.
4. Add `verify:admin-foundation` as the Phase 1 command that covers auth, users, roles, support, app health, imported drafts, billing readiness, entitlement safety, and route render coverage.
5. Build the Admin Foundation Finish Board in the owner/admin setup surface.
6. Add a field access review card proving field users are blocked from admin/setup/provider/billing/imported-draft surfaces.
7. Keep package/provider readiness visible to owner/admin even when live providers or paid accounts are not configured.
8. Keep hard locks for live provider writes, paid spend, email/SMS sends, payment processing, hidden GPS/privacy risk, destructive data, secrets, production data mutation, and field-user data exposure.
9. Update `docs/APEX_HQ_LIVING_FINISH_PLAN.md` and `docs/APEX_HQ_TOOL_COMPLETION_BLUEPRINT.md` after implementation with freeze evidence, deploy log, and next phase.

## Exact Phase 1 Implementation Package

Build this as one complete phase, then stop for review.

1. Add an Admin Foundation Finish state utility, likely `src/admin-foundation-finish-utils.js`.
2. Derive readiness from existing data only: first-owner onboarding, managed setup, company profile, users, permissions, package readiness, integrations readiness, owner health, support packet readiness, imported drafts readiness, and field access boundary.
3. Add an Admin Foundation Finish panel to Settings/App Health command surfaces without redesigning the app.
4. Add access-review rows for owner/admin, office manager, estimator, foreman, employee, inactive users, open invites, and field-only restrictions.
5. Add provider/package rows that say `Provider-ready`, `Needs account/API key`, `Needs paid provider`, or `Live action locked`.
6. Fix Imported Drafts route crash and verification.
7. Add route/render tests for the Phase 1 pages.
8. Add `npm.cmd run verify:admin-foundation`.
9. Browser QA owner/admin desktop across `/settings`, `/employees`, `/app-health`, `/support`, `/imported-drafts`.
10. Browser QA employee mobile direct routes for admin/setup pages and support.
11. Update living plan, blueprint, completed/frozen systems, decision log, deploy log, and phase report.
12. Commit, push, deploy, health-check, then stop and review.

## Out Of Scope For Phase 1

- Payroll Prep.
- Growth/Sales/Client Finder.
- Command Center rebuild.
- Live email/SMS sends.
- Live billing/payment processing.
- Stripe/QuickBooks/Twilio/Gmail/Calendar/Drive/CompanyCam/DocuSign OAuth or live writes.
- Production data mutation.
- Schema changes unless a proven Phase 1 bug requires it.
- Auth/session model changes beyond test-helper alignment.
- Hidden GPS or worker tracking.

## Decision Log

| Date | Decision | Reason | Impact |
| --- | --- | --- | --- |
| 2026-05-30 | Phase 1 begins with a pre-build audit. | The owner asked for code, browser, memory, roadmap, and skill review before implementation. | Phase 1 work starts from evidence, not guessing. |
| 2026-05-30 | Active plan is the tool-completion blueprint. | Older roadmap/status docs conflict or are stale in places. | Phase 1 is Admin Foundation Finish, not another growth/payroll slice. |
| 2026-05-30 | Imported Drafts crash blocks Phase 1 freeze. | A Phase 1 owner/admin route cannot render. | Fix route and add coverage before release. |
| 2026-05-30 | Field admin/setup protection is currently working in browser QA. | Employee mobile direct routes redirect to Field Mode and support is role-safe. | Preserve existing permission model while building the finish board. |
| 2026-05-30 | Owner/admin setup should not be hidden behind package locks. | The owner wants no locks except unpaid providers/live actions and safety boundaries. | Phase 1 should show provider-ready setup while keeping field/security/live-money locks. |

## Next Build Instruction

Implement Phase 1 Admin Foundation Finish in one work package. Start by fixing the Imported Drafts crash and red verification, then build the Admin Foundation Finish Board and final verification command.
