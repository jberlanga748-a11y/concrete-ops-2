# Apex HQ Full UI Audit - 2026-05-15

Evidence folder:

- `output/playwright/full-ui-audit-builder-2026-05-15T06-56-43-397Z`

Spark reviewers:

- Office: `Aquinas`
- Field/mobile: `Nash`
- System/auth/shell: `Hypatia`

## Global Findings

- Mobile bottom navigation overlaps content/actions on multiple pages.
- Major command boards are squeezed at 1366px when right rails and fixed-width tables compete.
- Some field-visible copy uses internal `pricing` terminology even though backend money access appears protected.
- `/design`, `/settings`, and mobile `/ai-office` need permission/loading inspection before deeper UI polish.
- Most core modules have the right direction, but premium quality requires full-page passes, not tiny CSS nudges.

## Office Pages

| Page | Route | Verdict | Main Issue |
| --- | --- | --- | --- |
| Dashboard | `/` | Touch-up | Mobile bottom nav overlap |
| Command Center | `/command-center` | Touch-up | Mobile clipped action control |
| Leads | `/leads` | Touch-up | 1366/1536 table overflow, mobile overlap |
| Customers | `/customers` | Touch-up | 1366 table overflow, mobile overlap |
| Estimates | `/estimates` | Touch-up | 1366 table overflow, mobile overlap/clipping |
| Jobs | `/jobs` | Touch-up | 1366 table overflow, mobile overlap/clipping |
| Imported Drafts | `/imported-drafts` | Pass | Monitor only |
| Change Orders | `/change-orders` | Permission review | Field-visible `pricing` terminology |
| Employees | `/employees` | Touch-up | Mobile KPI/control clipping |

Office priority:

1. Change Orders field-safe copy/permission review.
2. Jobs, Estimates, Leads.
3. Customers.
4. Employees.
5. Command Center.
6. Dashboard.
7. Imported Drafts monitor only.

## Field And Safety Pages

| Page | Route | Verdict | Main Issue |
| --- | --- | --- | --- |
| Field Jobs | `/jobs` | Full page pass | Current field view is acceptable |
| Time | `/time` | Structural redesign | Desktop table overflow, mobile overlap, field-safe copy review |
| Daily Reports | `/reports` | Touch-up | Foreman mobile overlap |
| Uploads | `/uploads` | Touch-up | Mobile card/action overlap |
| Delivery Tickets | `/delivery-tickets` | Touch-up | Mobile card/action overlap |
| Pre-Pour | `/pre-pour` | Structural redesign | Field-safe terminology and mobile overlap |
| Post-Pour | `/post-pour` | Permission review | Field-safe terminology |
| Incidents | `/incidents` | Full page pass | Monitor only |
| Toolbox Talks | `/toolbox-talks` | Full page pass | Monitor only |
| PPE | `/ppe` | Full page pass | Monitor only |
| Tool Checklist | `/tool-checklist` | Full page pass | Monitor only |
| Calculator | `/calculator` | Full page pass | Monitor only |

Field priority:

1. Time.
2. Pre-Pour.
3. Post-Pour.
4. Uploads and Delivery Tickets.
5. Reports.

## System, Auth, And Shell

| Area | Route | Verdict | Main Issue |
| --- | --- | --- | --- |
| Login | auth screen | Touch-up | Add semantic `h1`; visual brand is otherwise aligned |
| Public Request | `/request-estimate` | Pass pending visual capture | Code route looks correct |
| AI Office | `/ai-office` | Touch-up | Mobile capture showed missing heading/console errors |
| Design System | `/design` | Permission review | Route exists but permission model appears inconsistent |
| Settings | `/settings` | Permission review | Route/loading/auth mismatch needs inspection |
| App Shell | global | Pass with notes | Bottom nav overlap is the main global issue |

System priority:

1. Align `/design`, `/settings`, and `/ai-office` permission/loading behavior.
2. Add authorized-loading fallback so pages never render blank without a heading.
3. Add global mobile bottom-nav safe-space pattern.
4. Capture `/request-estimate` visuals.

## Recommended First Three Phases

1. **Safety Phase 1 - System route and permission alignment**
   - Inspect `/design`, `/settings`, `/ai-office`.
   - Fix permission/loading mismatch and 401 source if confirmed.
   - Verify roles/users/server/routing.

2. **Safety/UI Phase 2 - Field-safe terminology and mobile bottom-nav foundation**
   - Remove or role-gate internal `pricing` wording from field-visible screens.
   - Add reusable mobile safe-space so bottom nav stops covering controls.

3. **UI Phase 3 - Time structural redesign**
   - Large field-first clock action.
   - Desktop table/card layout without overflow.
   - Mobile thumb-safe work cards.
   - Preserve payroll/rate secrecy.
