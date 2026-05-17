# Assistant Material Planning Prep

Status: planning complete / implementation requires approval

## Decision

Do not build material ordering or autonomous material planning yet.

The safe future direction is a reviewed material planning assistant that helps owner/admin/estimator users organize quantities, material notes, delivery-ticket gaps, and field context for human review. It must not order materials, create purchase orders, contact vendors, approve pricing, convert estimates into jobs, or change job records automatically.

Material planning should be Premium-and-up when implemented because it depends on assistant foundations, estimate/job context, reporting, and office review. Basic workspaces should see package-locked explanations only. Field roles can contribute source data through existing assigned-job workflows, but they must not receive office material-planning controls or pricing context.

## Why

Material planning is useful for contractors, but it is a high-risk workflow because wrong quantities, wrong mix notes, or accidental ordering can cost real money and damage customer trust.

The assistant should start as a review aid:

- summarize existing estimate takeoff backup and job material notes
- identify missing material/delivery proof
- highlight conflicts between estimate scope, job notes, daily reports, and delivery tickets
- prepare a human-reviewed material planning draft
- require owner/admin/estimator confirmation before any operational use

It should not behave like purchasing automation.

## Allowed Future Source Data

Use existing data only:

- approved or draft estimates when the role can already view estimates
- estimate backup rows and takeoff references
- job `materialNotes`, `scopeSummary`, startup checklist, and field planning notes
- daily report material notes, yards poured, equipment used, delays, and submitted/reviewed status
- delivery tickets, ticket photos, supplier/truck/ticket number, quantity, and linked report/job
- uploads already visible to the requesting office role
- change order request summaries after office review
- calculator/takeoff results already scoped to the company and visible to the requesting role

Do not use:

- vendor account credentials
- live vendor pricing feeds
- private supplier portals
- payment data
- invoice data
- customer portal data
- field-user hidden personal data
- cross-company records

## Future Phase 1 Shape

When implementation is approved later, the first build should be an owner/admin/estimator material review packet, not an ordering workflow.

Allowed Phase 1 output:

- material planning summary for one estimate or job
- quantity/source checklist with citations to existing records
- missing proof list for delivery tickets, uploads, or daily reports
- review warnings for conflicts, stale notes, or missing takeoff backup
- "human review required" status
- copyable internal planning notes

Not allowed in Phase 1:

- creating purchase orders
- vendor checkout or purchasing
- sending supplier emails/texts/calls
- committing delivery dates
- approving pricing
- changing estimate totals
- creating or converting jobs
- assigning crews
- updating job material notes without explicit human save
- customer-visible material promises

## Role Boundary

| Role | Future Material Planning Access | Must Stay Blocked |
| --- | --- | --- |
| Owner | May generate and review material planning packets for company jobs/estimates. | Automatic ordering, vendor payments, unreviewed pricing or job changes. |
| Admin | May generate and review if package and estimate/job permissions allow. | Owner-only settings, package/billing controls, automatic vendor commitments. |
| Estimator | May generate for estimates they can already access. | Job conversion, crew assignment, purchasing, owner-only settings. |
| Foreman | May contribute assigned-job material notes, daily report notes, uploads, and delivery tickets through existing workflows. | Material planning controls, estimates, pricing, margins, vendor purchasing, company-wide planning. |
| Employee | May contribute assigned-work notes/photos only through existing workflows. | Material planning controls, estimates, pricing, unrelated jobs, vendor purchasing. |
| Support | No implicit access. Future support context must be explicit, scoped, and audited. | Silent impersonation, cross-company material data, mutation. |

## Package Boundary

Future material planning should be Premium-and-up:

- Basic: locked explanation and manual support upgrade path only.
- Premium: owner/admin/estimator reviewed material planning can be considered in a future implementation phase.
- Elite: inherits Premium material planning; no extra autonomous ordering powers by default.

Implementation must fail closed when role or package context is missing.

## Review And Audit Requirements

Required before implementation:

- material packet generated event
- source records included in packet
- actor role and company scope
- review status: draft, needs review, approved for internal use, archived
- explicit human save when any job/estimate note is changed
- no customer-facing output unless separately approved by customer portal planning
- support handoff context that excludes vendor credentials and private pricing

Do not log:

- passwords or vendor credentials
- payment details
- raw private customer data beyond the scoped record references
- full assistant prompts if they contain sensitive notes

## Negative Tests Required Later

Any implementation needs tests proving:

- Basic owner/admin cannot access material planning controls.
- Premium/Elite owner/admin can access only company-scoped material planning.
- Estimator access follows existing estimate permission rules.
- Foreman and employee cannot access material planning controls by navigation or direct route.
- Field users cannot see estimate totals, margins, pricing, or office-only takeoff backup.
- A forged company/customer/job/estimate id cannot read another tenant's material data.
- Material planning does not create purchase orders, send vendor messages, change estimate totals, or convert jobs.
- Missing role/package context fails closed.

## Future Implementation Prompt

Use only after this checkpoint is approved:

```text
APEX HQ - ASSISTANT MATERIAL PLANNING PHASE 1 REVIEW PACKET

Goal:
Build a Premium-and-up owner/admin/estimator material review packet for one estimate or job using existing scoped data only.

Do not add material ordering, vendor checkout, purchase orders, supplier messaging, pricing approval, estimate total changes, job conversion, crew assignment, customer-visible promises, or field-user planning controls.

Focus:
- reviewed material summary
- source citations from estimates/jobs/takeoffs/delivery tickets/daily reports/uploads
- missing proof and conflict warnings
- no automatic writes unless explicitly saved by an authorized office user
- Basic and field-role lock tests
```

## Verification For This Checkpoint

Planning checkpoint verification:

```powershell
npm.cmd run verify:packages
npm.cmd run verify:entitlements
npm.cmd run verify:roles
git diff --check
```
