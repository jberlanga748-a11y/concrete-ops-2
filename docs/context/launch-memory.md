# Apex HQ Launch Memory

Last updated: 2026-05-26

Purpose: prevent launch loops. Read this before deciding what to build, polish, test, ship, sell, or defer for Apex HQ.

## Current Launch Verdict

Apex HQ should launch in stages:

1. Guided founder-led demos.
2. Controlled pilot with one real contractor workflow.
3. Paid founder-supported pilot.
4. Wider paid launch only after auth, monitoring, support, legal, onboarding, and claims gates are green.
5. Public self-serve SaaS later, not now.

Do not reposition Apex HQ as a broad public self-serve SaaS, enterprise platform, accounting/payroll replacement, guaranteed lead generator, or AI autopilot until the required gates are truly complete.

## Immediate Next Move

Guided demo evidence is locked. The real pilot gate is intentionally paused until the user is ready with a real company/workflow.

Current technical next move: continue the bundle/App.jsx decomposition one route at a time, or return to the first pilot gate when real pilot details are available.

Resolved on 2026-05-26:

- `npm.cmd run verify:roles` was failing in `server/role-permissions.test.js` with `Session expired`.
- The local test helper used `authHeaders(ownerLogin.token)` without requesting bearer mode / `returnToken`.
- The test setup now requests bearer mode and `returnToken`; production auth behavior was not weakened.

Latest local stabilization pass:

```powershell
npm.cmd run verify:roles
npm.cmd run verify:auth
npm.cmd run verify:server
npm.cmd run build
git diff --check
```

All passed on 2026-05-26 after the Calculator, Support, Material Prep, Rate Book, and Communication Center route extractions. `git diff --check` reported only CRLF working-tree warnings.

Latest guided demo checks:

```powershell
npm.cmd run verify:demo
npm.cmd run smoke:hosted -- --base-url=https://concrete-ops-demo.fly.dev --skip-auth --json
npm.cmd run audit:demo-desktop:local -- --roles=admin,foreman,employee --viewports=1440x900
```

All passed on 2026-05-26. Hosted demo route/health smoke returned 200s for the expected walkthrough routes. Local demo desktop audit captured admin, foreman, and employee walkthrough screenshots with 0 required capture failures at `ui-audit/demo-desktop/2026-05-26T07-12-47-871Z/manifest.json`.

Known non-blocker:

- `npm.cmd run build` passes but warns about large chunks, especially `mapbox-gl` and the main `index` chunk. Do bundle surgery after auth/role release health is green.

## Launch Work Order

### 0. Stabilize The Current Working Tree

Goal: make the repo trustworthy before launch decisions.

- Understand the dirty working tree before staging or committing.
- Fix `verify:roles`.
- Run the release baseline.
- Do not deploy while verification is red.
- Do not rename technical identifiers during this launch phase.

Done when:

- `npm.cmd run verify:roles` passes.
- `npm.cmd run verify:auth` passes.
- `npm.cmd run verify:server` passes.
- `npm.cmd run build` passes.
- `git diff --check` passes.

### 1. Lock The Guided Demo

Goal: one clean walkthrough that shows the business loop without overpromising.

Demo story:

`lead or estimate -> job setup -> crew handoff -> field proof -> owner review -> follow-up`

Must confirm:

- Demo app is healthy and separate from production.
- Demo data is clean, realistic, and not mixed with real customer data.
- Admin/owner path works on desktop.
- Field path works on phone.
- Field roles cannot see office-only data, pricing, margins, settings, or company management.
- Known limitations are stated plainly.

Useful commands:

```powershell
npm.cmd run verify:demo
npm.cmd run smoke:hosted -- --base-url=https://concrete-ops-demo.fly.dev --skip-auth --json
npm.cmd run audit:demo-desktop:local -- --roles=admin,foreman,employee --viewports=1440x900
```

### 2. Run The First Real Pilot Gate

Goal: decide whether one contractor is safe to onboard.

Current status from 2026-05-26:

- `npm.cmd run launch:gate-status` reports `Guided demo readiness: GO`.
- `npm.cmd run launch:gate-status` reports `Customer pilot handoff readiness: NO-GO` until a real company, owner/admin contact, exact workflow, first real record, first field/proof action, and 2-3 success criteria are provided.
- `npm.cmd run pilot:rehearsal` is read-only and currently fails closed for those same missing real-pilot inputs.

Before any real pilot:

- Pick one company and one workflow.
- Define success criteria.
- Confirm owner/admin user, field lead, support contact, and Day 0 / Day 3 / Day 10 cadence.
- Use an isolated pilot workspace/app when required.
- Confirm backup and restore path.
- Confirm no demo data, fake company data, or unrelated customer data is in the pilot environment.
- Review pilot terms and data handling docs with appropriate legal/business review before wider paid use.

Useful commands:

```powershell
npm.cmd run pilot:rehearsal
npm.cmd run verify:pilot-readiness
npm.cmd run verify:backup
npm.cmd run verify:restore
```

### 3. Tighten Production Launch Gates

Goal: be confident the live app can support founder-led paid use.

Required before wider paid launch:

- Production auth smoke approved, configured, and passing.
- Production monitoring/log drain decision made and implemented safely.
- Production cold-start / min-machine decision made.
- Support intake process ready and used.
- Incident notes and rollback paths known.
- Public claims scan passing.
- Legal review of public claims, pilot terms, customer data handling, billing claims, and AI claims.

Useful commands:

```powershell
npm.cmd run launch:gate-status
npm.cmd run verify:production-auth-smoke-readiness
npm.cmd run verify:monitoring
npm.cmd run verify:claims
```

### 4. Product Build Queue After Stabilization

Only build after release health is green.

Recommended order:

1. Settings / Managed Setup.
2. Time Tracking.
3. Daily Reports.
4. Uploads / Photo Evidence.
5. Delivery Tickets.
6. Pre-Pour.
7. Post-Pour.
8. Safety / Incidents.
9. Tool Checklist.

Frozen or near-frozen areas:

- Command Center.
- Leads.
- Customers.
- Estimates.
- Jobs.

Allowed changes on frozen areas:

- Bug fixes.
- Spacing/responsive fixes.
- Workflow clarity improvements.
- Permission or safety fixes.

Do not redesign frozen pages without evidence of a real workflow problem.

### 5. Bundle / Performance Pass

Do this after auth and launch gates are stable.

Current status from 2026-05-26:

- First conservative Vite manual chunk pass completed.
- Entry JS chunk dropped from about `2,007 kB` minified to about `991 kB` minified.
- Calculator route extracted from `src/App.jsx` into lazy `src/calculator-route-components.jsx`.
- Calculator route now builds as its own async chunk at about `34 kB` minified / `9 kB` gzip.
- Support route extracted from `src/App.jsx` into lazy `src/support-route-components.jsx`.
- Support route now builds as its own async chunk at about `27 kB` minified / `8 kB` gzip.
- Material Prep route extracted from `src/App.jsx` into lazy `src/material-prep-route-components.jsx`.
- Material Prep route now builds as its own async chunk at about `13 kB` minified / `4 kB` gzip.
- Rate Book route extracted from `src/App.jsx` into lazy `src/rate-book-route-components.jsx`.
- Rate Book route now builds as its own async chunk at about `10 kB` minified / `3 kB` gzip.
- Communication Center route extracted from `src/App.jsx` into lazy `src/communications-route-components.jsx`.
- Communication Center route now builds as its own async chunk at about `18 kB` minified / `5 kB` gzip.
- Entry JS after calculator, support, material prep, rate book, and communication center extraction is about `913 kB` minified / `201 kB` gzip.
- `mapbox-gl` remains isolated at about `1,803 kB` minified / `499 kB` gzip.
- `app-domain` remains large at about `1,285 kB` minified / `319 kB` gzip because shared source modules are still broad.
- Main CSS remains large at about `1,109 kB` minified / `143 kB` gzip.
- `npm.cmd run build` still warns about chunks over 500 kB; this is expected until deeper App.jsx/CSS extraction work is approved.
- `npm.cmd run build` no longer reports the temporary calculator/app-domain circular chunk warning from the first calculator split attempt.
- `npm.cmd run verify:calculator` passed after the extraction.
- Support-focused tests passed after the extraction: `src/support-utils.test.js`, `src/support-page-shell.test.js`, `src/app-routing.test.js`, and `src/app-shell-components.test.js`.
- Material Prep-focused tests passed after the extraction: `src/material-prep-utils.test.js`, `src/material-prep-page-shell.test.js`, `src/app-routing.test.js`, and `src/app-shell-components.test.js`.
- `npm.cmd run verify:rate-book` passed after the Rate Book extraction.
- Communication Center-focused tests passed after the extraction: `src/contact-history-utils.test.js`, `src/communications-page-shell.test.js`, `src/contact-history-route-components-import.test.js`, `src/app-routing.test.js`, and `src/app-shell-components.test.js`.
- Route/import regression checks passed for app routing, shell guard, and extracted route modules.

Targets:

- Split more route/component code out of `src/App.jsx`.
- Lazy-load heavier surfaces.
- Keep Mapbox isolated or manually chunked.
- Preserve route guards, role visibility, estimate math, job workflows, field visibility, and state ownership.

Useful command:

```powershell
npm.cmd run build
```

### 6. Wider Public Launch Later

Do not start this until the pilot loop produces proof and the launch gates are green.

Wider launch needs:

- Clear onboarding.
- Support capacity.
- Billing/package workflow.
- Public claims/legal approval.
- Production monitoring.
- Production auth smoke.
- Backup/restore confidence.
- Customer data policy.
- No unsupported claims.
- A real sales/demo feedback loop.

## Do Not Build Yet

- Full public self-serve SaaS positioning.
- Stripe billing or automatic plan upgrades.
- Full customer portal.
- Offline mode.
- Payroll/accounting replacement.
- Enterprise SSO/MFA/SCIM/SLA commitments.
- Automatic AI sending, bidding, pricing, crew assignment, material ordering, or approvals.
- Hidden GPS tracking.
- Automated outbound SMS/email/ads.
- Fully automated PDF/blueprint takeoff.

## Verification Router

Use the smallest command set that proves the touched area:

- Auth or roles: `npm.cmd run verify:roles`, `npm.cmd run verify:auth`
- Users or company scope: `npm.cmd run verify:users`, `npm.cmd run verify:signup`
- Jobs: `npm.cmd run verify:jobs`
- Estimates: `npm.cmd run verify:estimates`, `npm.cmd run verify:print-packets`
- Leads: `npm.cmd run verify:leads`
- Time: `npm.cmd run verify:time`
- Daily reports: `npm.cmd run verify:daily-reports`
- Uploads: `npm.cmd run verify:uploads`
- Delivery tickets: `npm.cmd run verify:delivery-tickets`
- Pre-pour: `npm.cmd run verify:pre-pour`
- Post-pour: `npm.cmd run verify:post-pour`
- Safety: `npm.cmd run verify:safety`
- Tool checklist: `npm.cmd run verify:tool-checklist`

Release baseline:

```powershell
npm.cmd run build
npm.cmd run verify:server
npm.cmd run verify:roles
git diff --check
```

## Naming And Safety Rules

- User-facing product name is `Apex HQ`.
- `Concrete Ops`, `concrete-ops`, and `concrete-ops-2-clean` are technical identifiers only.
- Do not rename repo folders, package names, Fly apps, env vars, database keys, storage keys, session keys, tests, or technical identifiers without an explicit dedicated rename phase.
- Do not commit, push, deploy, change secrets, alter production data, or change Fly/Supabase config unless the user explicitly asks.
- Never print or store plaintext passwords, tokens, API keys, or production secrets in docs, logs, tests, or chat.
