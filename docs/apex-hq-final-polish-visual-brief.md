# Apex HQ Builder Final Polish Visual Brief

Use the reference image at:

`C:\Users\jberl\Downloads\Generateimage 1.png`

This image is the visual north star for Apex HQ final polish. It shows the target product quality: dark command shell, crisp white operational canvases, orange Apex action language, dense but readable dashboards, field-first mobile UI, professional estimate studio, and practical AI assistant panels.

This file is meant to be copied into Builder. It tells Builder how to inspect every real Apex HQ page, extrapolate from the strongest existing screens, and polish the whole app into one consistent product family.

## Copy-Paste Builder Prompt

```text
Use $apex-build-router as the operating system for this task.

Required routing:
- $codex-mastery-system for master engineering workflow and anti-drift discipline.
- $apex-hq-operating-standards for Apex contractor SaaS workflow decisions.
- $codex-ui-design-systems for design tokens, hierarchy, interaction states, and consistency.
- $codex-ui-polish-saas-quality for premium SaaS polish, spacing, density, visual QA, and screenshot review.
- $codex-react-frontend-mastery for React/Next implementation.
- $codex-component-architecture for shared layout/component decisions.
- $codex-mobile-optimization for field-first phone/tablet behavior.
- $codex-browser-automation or Browser for real browser screenshots, console checks, and interaction QA.
- $apex-qa-engineer for release-quality QA, mobile QA, dashboard QA, estimate QA, and go/no-go checks.
- $apex-permission-safety only if role, protected route, RLS, tenant isolation, or authorization behavior is touched.

Reference image:
C:\Users\jberl\Downloads\Generateimage 1.png

Primary goal:
Take every Apex HQ app page/route and visually polish it toward the reference image style.

Important context:
The app may only currently have strong visual direction for Command Center, Estimates/Estimate Studio, and Field Work. Treat those three product areas plus the reference image as canonical. Extrapolate that visual system across every other Apex HQ page without turning Apex into generic SaaS.

Do not start with code immediately.

First produce:
1. A route/page inventory of the whole app.
2. A list of pages already close to the reference.
3. A list of pages that are unfinished, inconsistent, generic, or visually behind.
4. The shared layout/components/tokens that should be reused.
5. A page-by-page final-polish plan.
6. The verification plan: desktop, tablet, mobile, console, network, text overflow, role-aware nav, and screenshots.

Then implement the polish in scoped changes.

If the app is large enough to justify parallel work, use agents with clear ownership:
- Manager: route inventory, visual system decisions, integration.
- UI worker: shared shell, tokens, cards, tables, nav, assistant components.
- Page worker: operational pages such as leads, jobs, reports, crews, equipment, money.
- Mobile worker: Field Mode, bottom nav, tablet behavior, touch targets, safe areas.
- QA reviewer: browser screenshots, console/network, text overflow, go/no-go findings.

Do not allow agents to edit the same files without coordination. Integrate the final result as one product.
```

## Visual North Star

Apex HQ should feel like a premium contractor operations command center, not a generic CRM and not a startup landing page.

Target feeling:
- Serious enough for owners.
- Fast enough for office admins.
- Clear enough for foremen.
- Simple enough for employees in the field.
- Premium enough to sell to contractors in demos.
- Operational enough that every screen answers "what needs attention right now?"

The reference image has three canonical patterns:

1. Command Center: desktop operational density, dark shell, light main canvas, KPI cards, work queues, assistant rail.
2. Estimate Studio: tablet/workbench layout, option rail, proposal details, photos/takeoff, branded sidebar, packet preview.
3. Field Mode: phone-first bottom nav, job card, clock state, large task actions, required items, assistant strip.

Every other page should inherit from one of those three patterns.

## Non-Negotiables

- Do not make a landing page.
- Do not use generic SaaS filler.
- Do not add decorative gradient blobs, orbs, bokeh, or abstract hero art.
- Do not make the app one-note purple, blue, beige, brown, or orange.
- Do not use oversized marketing cards for operational workflows.
- Do not hide broken workflow structure behind surface-level color changes.
- Do not change business logic, database schema, permissions, production config, or RLS unless explicitly required and approved.
- Do not treat UI role hiding as authorization.
- Do not call mobile done from desktop screenshots.
- Do not ship field-facing workflows with tiny tap targets, hover-only controls, or clipped sticky bars.
- Do not leave text overlapping, clipped, or overflowing in buttons/cards.

## Apex Visual DNA

Use this as the product-wide visual language:

- Shell: dark navy/black application chrome, left rail, top command bar.
- Canvas: white or near-white operational workspace.
- Accent: Apex orange for primary actions, active navigation, key CTA, attention highlight.
- Status color: green for complete/ready/paid/on-site, blue for in-progress/scheduled, amber/orange for warning/review, red for blockers/incidents/overdue.
- Surfaces: crisp white cards with subtle border and restrained shadow.
- Radius: 8px or less for cards and controls unless the existing design system uses a stricter standard.
- Icons: use lucide icons or the repo's existing icon set. Prefer icons inside icon buttons when the action is familiar.
- Density: compact but readable. This is an operations product, not a marketing site.
- Copy: direct contractor language. Use jobs, crews, estimates, proposals, field reports, photos, tickets, ready to bill, safety, incidents, deliveries.
- Hierarchy: every page should quickly reveal the main status, priority work, owner, next action, and blockers.

## Layout System

Desktop shell:
- Dark left sidebar with Apex HQ logo, grouped nav, active orange state, role-aware sections, user/workspace control at bottom.
- Dark top command bar with company/workspace selector, date or context selector, global search, notifications, assistant access, and primary quick action.
- Main workspace on a light canvas.
- Content grids should be operational: KPI row, primary work table/list, review queue, secondary panels, assistant rail where useful.

Tablet shell:
- Preserve the dark top bar.
- Use split workbench layouts for estimates, proposals, document review, and schedule planning.
- Side panels should collapse intelligently without hiding core actions.
- Avoid desktop tables that shrink into unreadable columns.

Phone shell:
- Field-facing pages use Field Mode pattern.
- Bottom nav for high-frequency field actions.
- Sticky clock/status card only when it helps the workflow.
- Large action tiles for photos, daily report, delivery ticket, checklists, safety, and pre/post work.
- 44px minimum touch targets.
- Safe-area padding at bottom and top.
- No hover-only interactions.

Assistant system:
- Assistant panels use dark card/drawer styling from the reference.
- Assistant gives prioritized, workflow-specific actions.
- Assistant should not dominate the page.
- Desktop can use a right rail or floating panel.
- Tablet can use a bottom dock or side drawer.
- Mobile can use a compact assistant strip/drawer.

## Shared Component Targets

Builder should look for existing components first. If components are missing or inconsistent, create or refactor shared components only when it reduces duplication across pages.

Recommended shared patterns:
- `AppShell` or equivalent dark shell.
- `TopCommandBar`.
- `SidebarNav`.
- `MetricCard`.
- `StatusChip`.
- `WorkQueueCard`.
- `ReviewQueue`.
- `AssistantPanel`.
- `ActionTile`.
- `OperationalTable`.
- `MobileFieldShell`.
- `EstimateStudioShell`.
- `EmptyState`.
- `LoadingState`.
- `ErrorState`.
- `PageHeader`.
- `FilterBar`.

Rules for shared components:
- Keep props practical and concrete.
- Avoid over-generic abstractions.
- Preserve route/data boundaries.
- Do not refactor unrelated logic just to make components prettier.
- Use realistic mock/demo data only where the app already uses mock/demo data.

## Page Inventory Requirement

Before editing, Builder must inventory routes/pages from the actual repo. Use the framework-specific route structure. For Next.js, inspect `app`, `pages`, `src/app`, route groups, layouts, nav config, and protected routes.

Output an inventory table like this before implementation:

| Page/Route | Current Visual State | Canonical Pattern | Main User | Polish Needed | Risk |
| --- | --- | --- | --- | --- | --- |
| `/command` | close/partial/far | Command Center | owner/admin | KPI density, assistant rail | low |
| `/estimates` | close/partial/far | Estimate Studio | owner/admin | option rail, packet preview | medium |
| `/field` | close/partial/far | Field Mode | foreman/employee | bottom nav, touch targets | high |

Do not invent pages. Inventory real routes first, then map them into the categories below.

## Page-By-Page Polish Standards

### 1. Operations Command / Dashboard

Canonical pattern: Command Center.

Purpose:
- Give owners/admins a same-day operating picture.
- Answer what is late, what is blocked, what needs review, what is ready, and where money is waiting.

Required polish:
- KPI row: active jobs, crews working, reports submitted, photos uploaded, money ready.
- Today's operating plan: job, location, crew, time, city, status.
- Review and approve queue: missing reports, missing photos, delivery tickets, incomplete checklists, incidents, estimates ready, billings ready.
- Crew plan summary.
- Jobs needing proof.
- Money ready.
- Next best actions.
- Recent activity.
- Apex Assistant rail.

Visual rules:
- Dense grid, clear section titles, compact tables, small status chips.
- Keep the main page mostly light with dark shell.
- Use orange for active nav and primary next actions.

Mobile behavior:
- Owner/admin mobile dashboard becomes stacked priority cards.
- Field users should not get the full owner command center unless their role allows it.

### 2. Schedule / Today's Work

Canonical pattern: Command Center plus Field Mode.

Purpose:
- Show who is going where, when, and what might stop the day.

Required polish:
- Schedule list/calendar with crew, job, address, time, status, blockers, field readiness.
- Filters for date, crew, status, city/job type if present.
- Drag/reassign only if already supported.
- Show missing assignment, missing report, missing photos, and safety blocker states.

Mobile behavior:
- Foreman/employee sees today's assigned jobs first.
- Office schedule controls should not crowd the field view.

### 3. Leads

Canonical pattern: Command Center queue.

Purpose:
- Move leads toward estimate, proposal, job, or closed/lost with no missed follow-up.

Required polish:
- Pipeline/table with lead source, owner, status, next follow-up, estimate status, value if available, stale warning.
- Clear next action buttons: call, schedule estimate, send follow-up, convert.
- Empty state should tell the user what to do next without sounding like marketing copy.

Visual rules:
- Status chips and stale indicators matter more than decoration.
- Highlight overdue follow-up and no-response states.

### 4. Customers

Canonical pattern: Command Center record view.

Purpose:
- Give the office a contractor-specific customer record.

Required polish:
- Customer detail header with contact, location, active status, next action.
- Active jobs, estimates, proposals, invoices/payments if present, documents, communication/activity.
- Customer list should be scan-friendly with status and current work.

Visual rules:
- Avoid generic CRM feel.
- Tie customer records to jobs, estimates, billing, and follow-ups.

### 5. Estimates / Estimate Studio

Canonical pattern: Estimate Studio.

Purpose:
- Turn rough job notes/photos/takeoff into clear estimate options and customer-safe proposals.

Required polish:
- Estimate Studio shell with dark top bar.
- Tabs: overview, scope, line items, options, exclusions, assumptions, attachments, preview if present.
- Left option rail: standard/premium/high-end or configured options.
- Main card: option title, total, jobsite photos/takeoff, scope of work, inclusions, exclusions.
- Right rail: company branding, customer, project, estimate total.
- GC packet preview tiles: cover page, scope, line items, exclusions, assumptions, pricing summary, field handoff.
- Assistant estimate dock with useful actions.

Visual rules:
- Totals must be prominent and trustworthy.
- Exclusions must be clear and not hidden.
- Internal notes must not look customer-facing.

Mobile/tablet behavior:
- Tablet should feel excellent.
- Phone can support review and status actions; heavy editing can be simplified but must not break.

### 6. Proposals

Canonical pattern: Estimate Studio.

Purpose:
- Review, package, send, and track customer-facing proposal outputs.

Required polish:
- Proposal status, version, customer, total, sent/accepted/expired state.
- Preview area with customer-safe copy.
- Clear separation between internal estimate and customer proposal.
- Send/export buttons must be intentional and confirmation-aware if already supported.

QA risk:
- Do not accidentally expose internal notes, margin, or private assumptions.

### 7. Jobs

Canonical pattern: Command Center record plus Field Mode handoff.

Purpose:
- Connect approved work to schedule, crew, field progress, proof, safety, and billing.

Required polish:
- Job list: customer, location, crew, date, status, proof needed, safety flags, billing readiness.
- Job detail: overview, scope, crew, schedule, field notes, photos/reports, checklists, deliveries, billing.
- Clear bridge from estimate/proposal to field handoff.

Mobile behavior:
- Foreman sees assigned job detail with today's needs, site notes, safety, crew, upload/report actions.

### 8. Daily Reports

Canonical pattern: Field Mode plus review queue.

Purpose:
- Let field teams submit proof and office teams review it.

Required polish:
- Submitted/missing/draft/needs review states.
- Crew, job, photos, notes, blockers, time, weather if present.
- Office review queue with approve/request changes.

Mobile behavior:
- Report creation must be thumb-friendly.
- Long notes, camera upload, and save states must be reliable.

### 9. Time Tracking

Canonical pattern: Field Mode for entry, Command Center for approval.

Purpose:
- Keep clock status and time exceptions visible.

Required polish:
- Employee, job, clock-in/out, total time, exception flags, approval status.
- Green clocked-in state like the phone reference.
- Office review queue for exceptions.

Mobile behavior:
- Clock in/out is obvious and reachable.
- State must be unmistakable: clocked in, clocked out, pending sync if supported.

### 10. Deliveries

Canonical pattern: Field Mode action plus office review.

Purpose:
- Track delivery tickets, materials, proof, and review.

Required polish:
- Delivery list with job, material/vendor, status, ticket/photo proof, reviewer.
- Mobile tile for Delivery Ticket.
- Missing proof state.

### 11. Crew / Employees

Canonical pattern: Command Center operations.

Purpose:
- Manage who is available, assigned, and qualified.

Required polish:
- Roster with role, crew, active assignment, availability, contact, status.
- Crew detail with assigned jobs and capacity.
- Certifications/safety fields if present.

Visual rules:
- Avoid HR software blandness.
- Make assignments and work readiness visible.

### 12. Equipment

Canonical pattern: Command Center operations.

Purpose:
- Track equipment availability, job assignment, maintenance, and issues.

Required polish:
- Equipment list with status, assigned job, location, issue flag, maintenance date if present.
- Filters for available/in use/maintenance/problem.

### 13. Checklists

Canonical pattern: Field Mode plus review queue.

Purpose:
- Make required job checks visible before work is missed.

Required polish:
- Complete/missing/blocked states.
- Checklist templates if present.
- Field cards with large check controls.
- Office queue for incomplete or overdue items.

Mobile behavior:
- Each row/control should be tap-friendly.
- Sticky submit/save controls must not cover checklist items.

### 14. Safety / Incidents

Canonical pattern: Safety-sensitive command page.

Purpose:
- Surface incidents and safety tasks clearly, with severity and follow-up.

Required polish:
- Severity, job, crew, status, owner, documentation, follow-up.
- Red/amber severity language without visual chaos.
- Incident detail must be clean and auditable.

Non-negotiable:
- Do not bury safety actions.

### 15. Invoices / Payments / Ready To Bill

Canonical pattern: Money Ready panel expanded into workflow pages.

Purpose:
- Make billing readiness and cash status clear.

Required polish:
- Ready-to-bill queue.
- Estimates ready, billing ready, payments received.
- Blockers: missing report, missing photos, unapproved delivery, customer issue.
- Totals should be prominent and consistent.

Visual rules:
- Money pages must look trustworthy and calm.
- Avoid clutter that makes totals ambiguous.

### 16. Documents / Reports

Canonical pattern: command document center.

Purpose:
- Make files, reports, and exports easy to find.

Required polish:
- File/report cards or table with type, job/customer, owner, date, status.
- Recent documents.
- Export/download/share actions if supported.
- Empty state for no documents yet.

### 17. Settings

Canonical pattern: quiet admin utility.

Purpose:
- Manage company, users, roles, templates, notifications, integrations.

Required polish:
- Dark shell remains, but content is quieter and utilitarian.
- Permission-sensitive settings should be visibly controlled.
- Use clear destructive-action zones if already present.

Safety:
- If roles, permissions, tenant access, or protected routes are touched, invoke $apex-permission-safety and stop before risky changes.

### 18. Apex Assistant

Canonical pattern: dark assistant panel.

Purpose:
- Help users act faster inside the current workflow.

Required polish:
- Top priorities.
- Page-specific suggested actions.
- Small task buttons.
- Collapsed and expanded states.
- Does not cover critical content.

Examples:
- Command Center: missing reports, jobs needing photos, revenue ready to bill.
- Estimate Studio: review missing scope, create foreman handoff, turn notes into packet.
- Field Mode: upload photos, start report, flag safety, call office.

### 19. Mobile Field Mode

Canonical pattern: phone reference.

Purpose:
- Let foremen/employees run today's work from a phone.

Required polish:
- Dark mobile top bar.
- Today's job card.
- Clock state card.
- Large action grid: upload photos, daily report, delivery ticket, checklists, pre/post work, safety/incidents.
- Required items list with missing/draft/complete states.
- Assistant mini panel.
- Bottom nav: home, jobs, time, notifications, more or equivalent.

Mobile QA:
- Test 375x667, 390x844, and 768x1024.
- Check safe areas, sticky bars, keyboard behavior, long names, addresses, and note text.

## State Coverage

Every major page should have designed states:

- Loaded with real/realistic operational content.
- Empty state.
- Loading state.
- Error state.
- No permission/role-restricted state if applicable.
- Search/filter no results.
- Long names/addresses/notes.
- Missing required data.
- Review needed.
- Overdue/blocker.

Empty states should be useful, not cute. Tell the user the next action.

## Responsive Rules

Desktop:
- Prioritize scan speed and operational density.
- Keep sidebar and top bar stable.
- Use tables where they help comparison.

Tablet:
- Use workbench/split layouts.
- Estimate Studio should shine here.
- Avoid cramped desktop columns.

Phone:
- Use Field Mode for field roles.
- Stack cards.
- Replace dense tables with progressive cards.
- Use bottom nav and sticky primary actions carefully.
- Never require hover.
- Never make primary controls smaller than 44px.

## Implementation Sequence

1. Inspect repo and route structure.
2. Inventory pages and current visual maturity.
3. Identify existing design tokens/components.
4. Decide the smallest shared shell/component changes.
5. Polish canonical pages first only if they are not already strong.
6. Extend the same visual language to every remaining route.
7. Add/repair empty, loading, error, and restricted states.
8. Run build/typecheck/lint/tests that exist in the repo.
9. Use Browser to verify desktop, tablet, and mobile.
10. Fix visual regressions and rerun the failing checks.
11. Produce final report with screenshots/evidence.

## Command And Browser Verification

Use the repo's scripts first. Typical checks:

```powershell
git status --short
git diff --stat
git diff --check
npm run typecheck
npm run lint
npm test
npm run build
npx playwright test
npx playwright test --project=mobile
```

Use Browser or Playwright for:

- Desktop command center.
- Tablet estimate studio.
- Mobile field mode.
- Leads.
- Customers.
- Jobs.
- Daily reports.
- Schedule/today's work.
- Money pages.
- Settings.
- Role-restricted page if available.

Check after every critical route:

- Console errors.
- Failed network requests.
- Horizontal scroll.
- Text overflow.
- Button/card clipping.
- Sticky header/bottom-nav overlap.
- Broken empty/loading/error states.
- Touch target size.
- Assistant panel covering important content.

## Final Builder Report Format

When done, report:

1. Selected skills and why.
2. Pages/routes inventoried.
3. Pages polished.
4. Shared components/layouts/tokens changed.
5. Commands run and results.
6. Browser screenshots or detailed browser verification summary.
7. Mobile/tablet/desktop checks completed.
8. Remaining visual gaps.
9. Any pages intentionally left unchanged and why.
10. Permission/database/production risks touched, or explicitly say none were touched.
11. Next polish pass recommendation.

## Acceptance Criteria

Builder should not call final polish complete unless:

- Every major page feels like the same product family as the reference.
- Command Center, Estimate Studio, and Field Mode still match or improve on the reference direction.
- Other pages do not look like leftover templates.
- Mobile field workflows are usable on phone width.
- Tablet estimate workflow remains strong.
- Desktop owner/admin workflows are dense, clean, and fast to scan.
- Empty/loading/error states look intentionally designed.
- No obvious console/network errors are left uninvestigated.
- No text overlap, clipped controls, or unreadable tables remain in checked viewports.
- The final report includes verification evidence, not just a claim that it looks better.
```

## Short Version To Paste If Builder Needs A Smaller Prompt

```text
Use $apex-build-router. Route through $codex-mastery-system, $apex-hq-operating-standards, $codex-ui-polish-saas-quality, $codex-ui-design-systems, $codex-react-frontend-mastery, $codex-component-architecture, $codex-mobile-optimization, $codex-browser-automation, and $apex-qa-engineer. Use $apex-permission-safety only if roles/permissions/RLS/protected routes are touched.

Use C:\Users\jberl\Downloads\Generateimage 1.png as the Apex HQ visual north star. Inventory every real route first. Treat Command Center, Estimate Studio, and Field Mode as canonical. Then polish every page so the whole app shares the same premium contractor SaaS style: dark shell, light operational canvas, Apex orange actions, crisp 8px cards, dense command-center hierarchy, field-first mobile UI, professional estimate workbench, and useful dark assistant panels.

Do not make it generic SaaS. Do not add decorative gradient blobs/orbs. Do not change database, permissions, production config, or business logic unless explicitly required and approved. Verify with build/typecheck/lint/tests that exist, then Browser screenshots/checks across desktop, tablet, and mobile. Final report must include pages inventoried, pages polished, files changed, commands run, screenshot/browser evidence, remaining gaps, and any risk touched.
```
