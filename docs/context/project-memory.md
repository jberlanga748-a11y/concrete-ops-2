# Apex HQ Project Memory

Last updated: 2026-05-26

Read this file first before any Apex HQ UI/UX page-shell work. Its job is to prevent loops, protect completed work, and keep the next page decision tied to evidence instead of memory.

For launch sequencing, release gates, pilot readiness, and what not to build yet, read `docs/context/launch-memory.md` before choosing new app work.

## North Star Goal

Make Apex HQ feel like a complete, professional contractor SaaS: desktop, tablet, and mobile each get their own best layout, with shared standards but no forced cross-device dragging. Desktop office pages should use the shared command shell pattern when appropriate: left work queue, selected detail, compact KPIs, clear primary actions, no duplicate assistant rail, no horizontal overflow, and no bottom cut-off at normal desktop sizes.

## Standing Rules

- Do not touch Supabase, env files, billing, git, or production config during UI/UX polish unless the user explicitly asks.
- Keep desktop desktop, tablet tablet, and mobile mobile. Desktop command shells should not leak into tablet/mobile; use `1180px` or a similarly intentional desktop gate when needed.
- No Apex Assistant right rail on desktop shell pages. Apex Assistant must remain available from one global top/app bar button, not a duplicate page rail or bottom floating bubble.
- Preserve the mobile account/logout sheet and admin mobile bottom nav unless the user asks to change them.
- Treat completed pages as locked unless new Chrome evidence or a user request proves they need another pass.
- Before proposing the next page, check the completed list below so we do not redo Customers, Leads, Settings, Employees, or other finished work by accident.

## Completed UI/UX Shell Work

| Page or area | Status | Evidence | Notes |
| --- | --- | --- | --- |
| Leads | Complete | `src/leads-page-components-import.test.js`; screenshots under `output/browser/leads-*2026-05-25` | Shared shell leader page; duplicate Lead Tools issue addressed; bottom cut-off pass completed. |
| Customers | Complete | `src/customers-page-components-import.test.js`; screenshots under `output/browser/customers-*2026-05-25` | Do not propose Customers as the next target again without new evidence. The page is extracted/lazy-loaded and no old customer rail is expected. |
| Estimates | Complete | `src/estimates-page-components-import.test.js`; screenshots under `output/browser/estimates-page-extraction-2026-05-25` | Extracted/lazy-loaded shell work completed. |
| Reports | Complete | `src/reports-page-components-import.test.js`; screenshots under `output/browser/reports-page-extraction-2026-05-25` | Extracted/lazy-loaded shell work completed. |
| Uploads / Proof | Complete | `src/uploads-page-components-import.test.js`; screenshots under `output/browser/uploads-page-extraction-2026-05-25` | Extracted/lazy-loaded shell work completed. |
| Jobs | Complete for current pass | `src/jobs-page-components-import.test.js`; screenshots under `output/browser/jobs-page-extraction-2026-05-25` | Admin jobs shell and mobile field Jobs cleanup were worked earlier. Reopen only with new evidence. |
| Time | Complete | `src/time-route-components-import.test.js`; screenshots under `output/browser/time-desktop-shell-2026-05-25` | Shared shell evidence exists. |
| Schedule | Complete | `src/schedule-page-shell.test.js`; screenshots under `output/browser/schedule-desktop-shell-2026-05-25` | Desktop shell is gated at `1180px`; dead assistant prop removed; global floating assistant launcher hidden on the desktop shell. |
| Command / Today | Complete | `src/command-today-page-shell.test.js`; screenshots under `output/browser/command-today-desktop-shell-2026-05-25` | Desktop `/command-center` now routes through the shared Today command shell at `1180px+`; phone keeps the mobile command experience; tablet is not pulled into the desktop shell. Assistant launcher hidden on the desktop work surface. |
| Apex Assistant global access | Complete | `src/apex-assistant-access.test.js`; screenshots under `output/browser/apex-assistant-global-entry-2026-05-25` | One top/app bar button opens the existing assistant panel on desktop and mobile. Floating closed launcher is disabled in the app shell; page-level assistant rails remain disallowed. |
| Settings | Complete | `src/settings-route-components-import.test.js`; screenshot `output/browser/settings-desktop-shell-2026-05-25/settings-after.png` | Metrics from last pass: body scroll 0, horizontal overflow false, visible assistant launcher 0, 4 shell KPIs, 5 queue cards. |
| Employees / Team | Complete | `src/employees-page-shell.test.js`; screenshot `output/browser/employees-desktop-shell-2026-05-25/employees-after.png` | Desktop shell gated at `1180px`; old right rail removed from shell detail; visible floating assistant launcher 0; detail scroll 0. |
| Communications | Complete | `src/communications-page-shell.test.js`; screenshots under `output/browser/communications-desktop-after-2026-05-25` | Desktop shell gated at `1180px`; selected detail is compact; visible queue capped at 5; no page-level assistant rail; topbar assistant remains reachable. |
| Rate Book | Complete | `src/rate-book-page-shell.test.js`; screenshots under `output/browser/rate-book-desktop-after-2026-05-25` | Desktop shell gated at `1180px`; queue capped at 6; duplicate queue actions hidden; no page-level assistant rail; Create/Clear visible at desktop. Tablet is intentionally no longer pulled into the desktop shell and should get its own pass later. |
| Calculator | Complete | `src/calculator-page-shell.test.js`; screenshots under `output/browser/calculator-desktop-after-2026-05-25` | Desktop shell gated at `1180px`; custom desktop toolbox converted to shared office command shell; page-level Apex Assistant rail removed; body length reduced to one screen with no bottom cutoff. Tablet is intentionally left on its own existing layout for a later tablet pass. |
| Support | Complete for current pass | `src/support-page-shell.test.js`; screenshots under `output/browser/support-desktop-after-2026-05-26` | Existing Support command frame kept as a documented exception because it has a copy-only request tools drawer; duplicate Apex Assistant rail removed from DOM; global topbar assistant and logout remain reachable; `npm.cmd run verify:support` and build pass. |
| App shell guard | Complete | `src/app-shell-components.test.js` | Guards shared command shells against duplicate right assistant rails. |
| App Health | Complete | `src/app-health-route-components-import.test.js`; `src/app-health-page-shell.test.js`; screenshots under `output/browser/app-health-desktop-after-2026-05-26` | Desktop `/app-health` now uses the shared command shell at `1180px+`; old settings right rail is removed; no page-level Apex Assistant rail; global topbar assistant and logout remain reachable. `npm.cmd run verify:app-health` and build pass. |

## Mobile UI/UX Work

Broad phone audit evidence lives under `output/browser/mobile-route-audit-2026-05-26`. It covered admin, foreman, and employee mobile routes with scroll length, touch target, overflow, assistant overlap, and logout/account visibility metrics.

| Mobile page or area | Status | Evidence | Notes |
| --- | --- | --- | --- |
| Admin Mobile Schedule | Complete | `src/schedule-page-shell.test.js`; `src/admin-mobile-ops-shell-spacing.test.js`; screenshots and metrics under `output/browser/admin-schedule-mobile-ops-shell-2026-05-26` and `output/browser/admin-mobile-ops-shell-spacing-2026-05-26` | Admin phone `/schedule` is now the Admin Mobile Ops Shell leader. Chrome phone metrics: 4.31 -> 1.11 screens after removing duplicate global bottom spacer/workspace padding on admin ops-shell pages, 60 -> 17 visible buttons, 48 -> 9 visible card-like surfaces, zero horizontal overflow, zero visible tables, zero small touch targets, zero clipped content, zero assistant rails, zero assistant overlap. Admin, foreman, and employee mobile logout verified. Desktop `1180px+` command shell and tablet fallback remain separated. |
| Admin Mobile Delivery Tickets | Complete | `src/delivery-tickets-mobile-shell.test.js`; `src/admin-mobile-ops-shell-spacing.test.js`; screenshots and metrics under `output/browser/admin-delivery-tickets-mobile-ops-shell-2026-05-26` and `output/browser/admin-mobile-ops-shell-spacing-2026-05-26` | Admin phone `/delivery-tickets` now uses the Admin Mobile Ops Shell pattern. Chrome phone metrics: 4.59 -> 1.13 screens after shared admin ops-shell spacing cleanup, 19 -> 14 visible buttons, duplicate "New ticket"/"Today" actions removed, zero horizontal overflow, zero visible tables, zero small touch targets, zero clipped content, zero assistant rails, zero assistant overlap. Foreman and employee phone `/delivery-tickets` remain field-workspace views at 1.32 screens. Admin, foreman, and employee mobile logout verified. Desktop/tablet delivery workbench remains separated. |
| Admin Mobile Pre-Pour | Complete | `src/pre-pour-mobile-shell.test.js`; `src/admin-mobile-ops-shell-spacing.test.js`; screenshots and metrics under `output/browser/admin-pre-pour-mobile-ops-shell-2026-05-26`, `output/browser/admin-pre-pour-bottom-nav-gap-check-2026-05-26`, and `output/browser/admin-mobile-ops-shell-spacing-2026-05-26` | Admin phone `/pre-pour` now uses the Admin Mobile Ops Shell pattern. Chrome phone metrics: 4.71 -> 1.03 screens after removing duplicate global bottom spacer/workspace padding on admin ops-shell pages, 19 -> 12 visible buttons, duplicate "Start checklist" actions removed, zero horizontal overflow, zero visible tables, zero small touch targets, zero clipped content, zero assistant rails, zero assistant overlap. Foreman and employee phone `/pre-pour` remain field-workspace views at 1.48 screens. Admin, foreman, and employee mobile logout verified. Desktop/tablet Pre-Pour workbench remains separated. |
| Admin Mobile PPE | Complete | `src/ppe-mobile-shell.test.js`; `src/admin-mobile-ops-shell-spacing.test.js`; screenshots and metrics under `output/browser/admin-ppe-mobile-ops-shell-2026-05-26`, `output/browser/admin-ppe-bottom-nav-gap-check-2026-05-26`, and `output/browser/admin-mobile-ops-shell-spacing-2026-05-26` | Admin phone `/ppe` now uses the Admin Mobile Ops Shell pattern. Chrome phone metrics: 4.61 -> 1.07 screens after removing duplicate global bottom spacer/workspace padding on admin ops-shell pages, 20 -> 13 visible buttons, zero horizontal overflow, zero visible tables, zero small touch targets, zero clipped content, zero assistant rails, zero assistant overlap. Foreman and employee phone `/ppe` remain field-workspace views at 1.76 screens. Admin, foreman, and employee mobile logout verified. Desktop duplicate PPE Apex Assistant rail removed; tablet/desktop mobile shell remains hidden. |
| Admin Mobile Tool Checklist | Complete | `src/tool-checklist-mobile-shell.test.js`; `src/admin-mobile-ops-shell-spacing.test.js`; screenshots and metrics under `output/browser/admin-tool-checklist-mobile-ops-shell-2026-05-26` and `output/browser/admin-mobile-ops-shell-spacing-2026-05-26` | Admin phone `/tool-checklist` now uses the Admin Mobile Ops Shell pattern. Chrome phone metrics: 4.29 -> 1.03 screens, 23 -> 12 visible buttons, zero horizontal overflow, zero visible tables, zero small touch targets, zero assistant rails, zero assistant overlap, spacer hidden and workspace bottom padding removed for admin ops-shell pages. Foreman and employee phone `/tool-checklist` remain field-workspace views at 1.75 screens. Admin, foreman, and employee mobile logout verified. Desktop duplicate Tool Checklist Apex Assistant rail removed; tablet/desktop mobile shell remains hidden. |
| Admin Mobile Incidents | Complete | `src/incidents-mobile-shell.test.js`; `src/admin-mobile-ops-shell-spacing.test.js`; screenshots and metrics under `output/browser/admin-incidents-mobile-ops-shell-2026-05-26` | Admin phone `/incidents` now uses the Admin Mobile Ops Shell pattern. Chrome phone metrics: 4.57 -> 1.17 screens, 48 -> 17 visible buttons, 8 -> 6 visible card-like surfaces, zero horizontal overflow, zero visible tables, zero small touch targets, zero assistant rails, spacer hidden and workspace bottom padding removed for the admin ops shell. Foreman phone `/incidents` is 1.80 screens and employee phone `/incidents` is 1.49 screens with their field workspace preserved. Admin, foreman, and employee mobile logout verified. Desktop duplicate Incidents Apex Assistant card removed; tablet/desktop mobile shell remains hidden. |
| Field Calculator | Complete | `src/calculator-page-shell.test.js`; screenshots and metrics under `output/browser/field-calculator-mobile-after-2026-05-26` | Foreman and employee phone views are 1.69 screens, no horizontal overflow, no tables, no small touch targets, no assistant overlap. Pour-shape tabs now measure 78x52. Admin, foreman, and employee mobile logout were verified functional. |
| Admin Leads | Complete | `src/leads-page-components-import.test.js`; screenshots and metrics under `output/browser/admin-core-mobile-lockin-2026-05-26` | Admin phone `/leads` is 1.63 screens, no horizontal overflow, no tables, no small touch targets, no assistant overlap, admin logout verified. |
| Admin Customers | Complete | `src/customers-page-components-import.test.js`; screenshots and metrics under `output/browser/admin-core-mobile-lockin-2026-05-26` | Admin phone `/customers` is 1.72 screens, no horizontal overflow, no tables, no small touch targets, no assistant overlap, admin logout verified. |
| Admin Estimates | Complete | `src/estimates-page-components-import.test.js`; screenshots and metrics under `output/browser/admin-core-mobile-lockin-2026-05-26` | Admin phone `/estimates` is 1.81 screens, no horizontal overflow, no tables, no small touch targets, no assistant overlap, admin logout verified. |
| Field Safety / Workflow | Complete | `src/field-safety-mobile-shell.test.js`; screenshots and metrics under `output/browser/field-safety-mobile-after-2026-05-26` | Foreman and employee phone `/pre-pour`, `/ppe`, `/incidents`, `/tool-checklist`, and `/change-orders` audited. Zero horizontal overflow, zero visible desktop tables, zero small touch targets, zero clipped content, and zero assistant overlap. Employee `/change-orders` correctly redirects to `/jobs`. Admin, foreman, and employee mobile account-sheet logout verified. Foreman `/incidents` is 2.10 screens by design after preserving full incident date/details; the rest are under 2 screens. |
| Mobile Utility / Admin Pages | Complete | `src/utility-mobile-shell.test.js`; screenshots and metrics under `output/browser/utility-mobile-after-2026-05-26-final2` | Chrome phone pass: admin Support 1.48, Settings 1.88, Employees 1.31, Time 1.97, Communications 1.69, AI Office 1.99, App Health 1.87 screens. Foreman/employee Support 1.48, Time 1.31, restricted Communications/AI Office/App Health redirect to `/jobs` at 1.68-1.80 screens. All checked routes have zero horizontal overflow, zero small touch targets, zero assistant overlap, zero visible tables. Admin, foreman, and employee logout verified. |

### Mobile Next Queue

1. Admin safety cluster P0 is complete: `/schedule`, `/delivery-tickets`, `/pre-pour`, `/ppe`, `/tool-checklist`, and `/incidents`.
2. P1 mobile queue after P0: admin `/jobs`, `/reports`, `/uploads`, `/material-prep`, `/calculator`, `/rate-book`, `/change-orders`.
3. Keep tablet work paused until the mobile queue is intentionally finished or the user redirects.

## Next Targets

1. Mobile-specific polish queue is active before tablet work. Do not resume tablet Rate Book or Calculator until the user asks or the mobile queue above is complete.
2. Tablet-specific polish queue after mobile: Rate Book and Calculator tablets are now separate from their desktop shells, but still need focused tablet passes before calling tablet complete.
3. Desktop breadth check: after the mobile/tablet queue, inspect any remaining admin/office desktop routes not represented above before starting a new redesign pass.

## Done Definition For A Desktop Page

- Uses the shared `ApexOfficeCommandShell` pattern or has a documented exception.
- Desktop shell is desktop-only and does not replace tablet/mobile layouts.
- No Apex Assistant right rail and no duplicate assistant surface; verify the global top/app bar assistant button is still reachable.
- No body scroll or horizontal overflow at common desktop verification sizes unless the page intentionally uses an internal scroll region.
- Primary actions are visible without hunting; secondary tools are compact, not duplicated.
- Selected detail area is not cut off at the bottom.
- Targeted guard test exists in `src/*test.js`.
- Chrome screenshot and metrics are saved under `output/browser/<page>-desktop-shell-2026-05-25`.
- `npm.cmd run build` passes; existing large chunk warnings are known and not a blocker by themselves.

## Verification Commands

Use targeted tests for the page plus the shared shell guard. Current broad shell guard command:

```powershell
node --test --test-concurrency=1 src\app-shell-components.test.js src\apex-assistant-access.test.js src\support-page-shell.test.js src\calculator-page-shell.test.js src\rate-book-page-shell.test.js src\communications-page-shell.test.js src\employees-page-shell.test.js src\settings-route-components-import.test.js src\leads-page-components-import.test.js src\customers-page-components-import.test.js src\estimates-page-components-import.test.js src\reports-page-components-import.test.js src\uploads-page-components-import.test.js src\jobs-page-components-import.test.js src\time-route-components-import.test.js
```

App Health focused guard command:

```powershell
npm.cmd run verify:app-health
```

Build command:

```powershell
npm.cmd run build
```

## Current Working Memory

- We are standardizing every desktop page the office/admin user sees, without looping back through already completed pages.
- The shared desktop leader pattern is the Apex office command shell: concise KPIs, prioritized queue, selected detail, and compact action tools.
- Customers is already done.
- Settings, Employees, Schedule, Command / Today, Apex Assistant global access, Communications, Rate Book, Calculator, Support, and App Health were the most recent completed areas.
- The user redirected to mobile before tablet. Admin Mobile Schedule, Admin Mobile Delivery Tickets, Admin Mobile Pre-Pour, Admin Mobile PPE, Admin Mobile Tool Checklist, Admin Mobile Incidents, Field Calculator mobile, admin phone Leads/Customers/Estimates, field safety/workflow phone pages, and mobile utility/admin pages are complete; next useful move is the P1 admin mobile queue before tablet.
