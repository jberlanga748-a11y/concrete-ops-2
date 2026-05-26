# Apex HQ Mobile CSS Audit

Date: 2026-05-26

Scope: `src/index.css` mobile layout rules, with focus on field phone routes, fixed bottom navigation, Field Mode, and field Photo Evidence.

## Current State

- `src/index.css` is 54,024 lines.
- It contains 52 `@media (max-width: 767px)` blocks and 32 `@media (max-width: 1023px)` blocks.
- It contains 202 `co-mobile-bottom-nav` references, 16 `co-mobile-bottom-spacer` references, 76 `--co-mobile-bottom-nav-height` references, and 19 `--co-mobile-bottom-nav-clearance` references.
- It contains 321 `body:has(...)` selectors and 4,297 `!important` declarations.
- The current working tree has an uncommitted late mobile override block at the end of `src/index.css` plus the visual audit auth-readiness patch in `scripts/visual-polish-route-audit.mjs`.

## Main Blockers

1. Bottom navigation clearance is not owned by one system.

   The nav height starts as global variables near the top of `src/index.css`, is reset in later mobile blocks, and is reset again by route-specific overrides. This means a route can visually pass at one point and regress when a later selector changes either the nav, content padding, or spacer height.

   Relevant regions:
   - Base variables: `src/index.css:43`
   - Shared mobile nav system: `src/index.css:38843`
   - North Star mobile/tablet translation block: `src/index.css:48142`
   - Latest uncommitted field override: `src/index.css:53843`

2. Field routes are patched in multiple unrelated regions.

   `.co-field-workspace-page` appears across base route styling, early field mobile styling, global shell overrides, later North Star overrides, and the current final override. There is no single route layout contract for the jobs phone page.

   Relevant regions:
   - Field base styling: `src/index.css:10718`
   - Field mobile layout: `src/index.css:12218`
   - Global bottom nav/content safe area: `src/index.css:38843`
   - Field topbar/body overrides: `src/index.css:41053`
   - North Star field overrides: `src/index.css:48142`
   - Latest uncommitted override: `src/index.css:53843`

3. Field Photo Evidence is especially fragmented.

   `.co-uploads-page[data-field-workspace="true"]` is affected by tablet command rules, upload route rules, field mobile tool rules, North Star overrides, and the current end-of-file override. These rules hide/show major route sections, alter command layout padding, hide filters/drawers, resize field panels, and change bottom spacing from several places.

   Relevant regions:
   - Tablet command hide/show rules: `src/index.css:14076`
   - Upload route field rules: `src/index.css:24159`
   - Upload phone field rules: `src/index.css:24952`
   - North Star mobile route rules: `src/index.css:48142`
   - Field mobile tool rules: `src/index.css:49721`
   - Latest uncommitted override: `src/index.css:53843`

4. Global `body:has(...)` route overrides make ownership hard to reason about.

   Route identity is inferred from descendants, then used to alter topbar, nav, spacers, assistant launcher, touch targets, and layout padding. This allows far-away route content changes to unexpectedly trigger global shell behavior.

5. Many fixes rely on `!important`.

   The high count of `!important` declarations means later ordering has become a main control mechanism. This makes small route fixes brittle because the winning rule depends more on location than on component ownership.

6. The visual audit did not encode the actual layout contract.

   Previous audits proved routes rendered and avoided broad failures, but did not fail on these field-specific problems:
   - fixed bottom nav covering the first actionable queue card
   - large empty viewport gaps inside field panels
   - route scroll height being driven by artificial `min-height` or extra spacer math

## Recommended Direction

Do not keep adding final CSS overrides as the main strategy.

Instead:

1. Create a field mobile page layout contract in React.
   - Own topbar/header/content/bottom-nav spacing through one wrapper.
   - Prefer explicit page classes/data attributes over broad `body:has(...)` where practical.
   - Make bottom-nav clearance a single value passed through the route shell.

2. Extract field mobile CSS into a bounded section or file.
   - Start with Jobs, Uploads, and Reports field-phone routes.
   - Preserve existing technical identifiers during the move.
   - Delete duplicated rules only after screenshot and route checks prove the replacement.

3. Add mobile layout regression checks.
   - Fail when bottom nav intersects the first primary route card.
   - Fail when field panel empty space exceeds an agreed threshold.
   - Capture role-specific phone screenshots for employee and foreman on `/jobs`, `/uploads`, and `/reports`.

4. Treat the current uncommitted end-of-file CSS block as temporary stabilization only.
   - It should not become the permanent architecture.
   - Before any final launch pass, either replace it with the field mobile layout contract or reduce it into the new bounded field mobile CSS owner.

## Safer Next Slice

The next safe engineering move is not more visual patching. It is:

1. Add a focused mobile layout audit script that measures nav/content intersection and dead-space thresholds.
2. Run it against employee and foreman phone routes.
3. Use those measurements to extract a dedicated field mobile layout wrapper and CSS owner.
4. Then remove the temporary override block once the wrapper owns the spacing.

## Audit Script Added

Added `scripts/mobile-layout-audit.mjs` and `npm run audit:mobile-layout`.

Default scope:
- Roles: `foreman`, `employee`
- Routes: `/jobs`, `/uploads`, `/reports`
- Viewport: `390x844` phone

The script logs in with local demo accounts, keeps one authenticated browser context per role, measures the mobile bottom nav against route content, writes a manifest under `output/playwright/mobile-layout-audit`, and saves failure screenshots.

Latest local command:

```powershell
npm.cmd run audit:mobile-layout -- --base-url=http://localhost:5173/ --browser=chromium --roles=foreman,employee --routes=/jobs,/uploads,/reports --output-dir=output/playwright/mobile-layout-audit
```

Latest local result:
- `foreman /jobs`: passed after introducing the field mobile jobs shell and horizontal queue contract.
- `foreman /uploads`: passed after introducing the field mobile uploads shell and proof panel height contract.
- `foreman /reports`: passed after introducing the field mobile reports shell and closeout panel height contract.
- `employee /jobs`: passed after introducing the field mobile jobs shell and horizontal queue contract.
- `employee /uploads`: passed after introducing the field mobile uploads shell and proof panel height contract.
- `employee /reports`: passed as an expected protected-route redirect to `/jobs`; employee daily report access remains denied by server permissions.

This confirms the launch blocker is systemic mobile layout ownership, not a single route typo.

## Jobs Shell Checkpoint

Added `FieldMobileJobsLayout` in `src/field-workspace-page-components.jsx` to give `/jobs` a route-owned mobile class: `.co-field-mobile-jobs-shell`.

The Jobs phone queue now uses a horizontal snap list under that shell. This preserves the queue actions while keeping them out from under the fixed bottom nav on first load.

Verification command:

```powershell
npm.cmd run audit:mobile-layout -- --base-url=http://localhost:5173/ --browser=chromium --roles=foreman,employee --routes=/jobs --output-dir=output/playwright/mobile-layout-audit-jobs
```

Result:
- `foreman /jobs`: passed.
- `employee /jobs`: passed.

## Uploads Shell Checkpoint

Added `FieldMobileUploadsLayout` in `src/uploads-page-components.jsx` to give field `/uploads` a route-owned mobile class: `.co-field-mobile-uploads-shell`.

The field Photo Evidence proof panel now owns its phone height inside that shell, anchors its fact strip to the bottom of the panel, and removes the generic route bottom padding/spacer that was creating scroll tail after the content.

Verification commands:

```powershell
npm.cmd run audit:mobile-layout -- --base-url=http://localhost:5173/ --browser=chromium --roles=foreman,employee --routes=/uploads --output-dir=output/playwright/mobile-layout-audit-uploads
npm.cmd run audit:mobile-layout -- --base-url=http://localhost:5173/ --browser=chromium --roles=foreman,employee --routes=/jobs,/uploads --output-dir=output/playwright/mobile-layout-audit-jobs-uploads
```

Result:
- `foreman /uploads`: passed.
- `employee /uploads`: passed.
- `foreman /jobs`: still passed.
- `employee /jobs`: still passed.

Remaining mobile layout failures at the Uploads checkpoint:
- `foreman /reports`
- `employee /reports`

## Reports Shell Checkpoint

Added `FieldMobileReportsLayout` in `src/reports-page-components.jsx` to give field `/reports` a route-owned mobile class: `.co-field-mobile-reports-shell`.

The foreman Daily Reports phone view now uses the field closeout card as the initial auditable panel, anchors the proof checklist at the bottom of that panel, and only opens the mobile report tool surface after a field user requests report tools. Employee `/reports` remains permission-protected and redirects back to `/jobs`; the mobile audit now treats that redirect as expected instead of reporting a false Reports layout failure.

Verification command:

```powershell
npm.cmd run audit:mobile-layout -- --base-url=http://localhost:5173/ --browser=chromium --roles=foreman,employee --routes=/jobs,/uploads,/reports --output-dir=output/playwright/mobile-layout-audit
```

Result:
- `foreman /jobs`: passed.
- `foreman /uploads`: passed.
- `foreman /reports`: passed.
- `employee /jobs`: passed.
- `employee /uploads`: passed.
- `employee /reports`: passed as expected redirect to `/jobs`.

Remaining mobile layout failures:
- None in the current Jobs / Uploads / Reports field phone audit.

## Final CSS Polish Checkpoint

Tightened the field Uploads and Reports mobile panel CSS without changing route logic or permissions.

The final CSS pass keeps the route-owned field shells, removes the decorative middle placeholder from the Uploads and Reports cards, and uses a viewport-aware panel height so the cards stay clear of the fixed bottom nav without returning to the earlier oversized blank panel.

Verification commands:

```powershell
node --test --test-concurrency=1 src\field-mobile-layout-css.test.js
npm.cmd run audit:mobile-layout -- --base-url=http://localhost:5173/ --browser=chromium --roles=foreman,employee --routes=/jobs,/uploads,/reports --output-dir=output/playwright/mobile-layout-audit-css-final
npm.cmd run verify:uploads
npm.cmd run verify:daily-reports
npm.cmd run verify:jobs
```

Result:
- Field mobile CSS focused test: passed.
- Mobile layout audit for `/jobs`, `/uploads`, and `/reports`: passed for foreman and employee.
- `verify:uploads`: passed.
- `verify:daily-reports`: passed.
- `verify:jobs`: passed on rerun after one transient isolated import-test runner failure; the isolated import test also passed.

Latest screenshots:
- `output/playwright/mobile-layout-css-final-screens/foreman-uploads-phone.png`
- `output/playwright/mobile-layout-css-final-screens/foreman-reports-phone.png`
- `output/playwright/mobile-layout-css-final-screens/employee-uploads-phone.png`
- `output/playwright/mobile-layout-css-final-screens/employee-reports-phone.png`
