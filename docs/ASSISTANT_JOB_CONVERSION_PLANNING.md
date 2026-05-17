# Assistant Job Conversion Planning

Status: planning complete / implementation requires approval

## Decision

Do not build automatic assistant job conversion yet.

The safe future direction is a reviewed estimate-to-job handoff assistant that prepares an internal draft packet for owner/admin/estimator review. It may summarize approved estimate context, customer details, scope, exclusions, options, startup checklist needs, and field handoff notes. It must not create a job, schedule work, assign crews, order materials, send customer messages, approve pricing, or mutate records unless an authorized office user explicitly saves through an existing reviewed flow.

Assistant job conversion should be Premium-and-up when implemented because it depends on assistant foundations, estimate/proposal context, job startup readiness, and office review. Basic workspaces should stay locked behind the manual support-led upgrade path. Field roles must not receive conversion controls or office-only estimate/proposal data.

## Why

Estimate-to-job handoff is a core contractor workflow, but it is also one of the easiest places to create expensive mistakes:

- an estimate may not be approved
- customer notes may not be current
- internal pricing or margin notes can leak into field/customer context
- scope, exclusions, and selected options can be misread
- schedule and crew capacity may not be ready
- materials, tickets, permits, safety, and access details may still need review

The assistant should reduce handoff friction, not become an autopilot.

## Existing Product Baseline

Apex HQ already has manual estimate conversion and imported job draft flows. Future assistant work should wrap those patterns, not replace them.

Preserve:

- only approved estimates can become jobs
- existing server-side role and company scoping
- existing audit/activity events for conversion
- internal pricing notes staying out of field/customer handoffs
- startup checklist readiness fields
- field visibility controls
- job assignment and schedule review as separate manual work

## Allowed Future Source Data

Use existing data only, scoped to the authenticated user's company and role:

- approved estimate summary, title, customer, lead, scope, customer notes, exclusions, and selected options
- proposal/customer-facing sections that are already safe for review
- estimate backup and takeoff references for office-only review
- linked customer/contact/site details
- linked lead/project history
- job startup checklist defaults and readiness fields
- field handoff packet sections
- delivery-ticket/material planning signals only as review context
- upload/photo references only when already visible to the requesting office role
- change order context only after office review

Do not use:

- unapproved estimates as conversion-ready source
- internal margins, profitability, or pricing strategy in field/customer output
- AI rough-note reasoning or unreviewed assistant guesses as truth
- vendor credentials or purchasing data
- customer portal data
- cross-company records
- field-user hidden personal data

## Future Phase 1 Shape

When implementation is approved later, the first build should be a reviewed job conversion packet, not an automatic converter.

Allowed Phase 1 output:

- internal handoff summary for one approved estimate
- customer/site/context checklist
- proposed job title and scope summary
- field handoff notes drafted from approved customer-facing and office-reviewed content
- startup checklist prefill suggestions
- missing review warnings for schedule, crew, materials, safety, access, permits, or attachments
- "review required" state
- copyable notes for an authorized office user

Not allowed in Phase 1:

- automatic job creation
- automatic schedule dates
- automatic crew or foreman assignment
- material ordering or purchase orders
- customer emails, SMS, portal updates, or approval messages
- estimate total changes
- pricing approval
- proposal approval
- direct field visibility changes
- mutation of existing jobs, estimates, customers, leads, uploads, or reports without explicit authorized save

## Role Boundary

| Role | Future Job Conversion Planning Access | Must Stay Blocked |
| --- | --- | --- |
| Owner | May generate and review handoff packets for approved estimates in the company. | Automatic job creation, hidden pricing approval, unconfirmed scheduling or crew assignment. |
| Admin | May generate and review if package and estimate/job permissions allow. | Owner-only settings, billing/package controls, autonomous conversion. |
| Estimator | May prepare packets for estimates they can already access. | Creating jobs unless existing permissions allow, crew assignment, scheduling, purchasing. |
| Operations Manager | May review job startup implications if existing job permissions allow. | Estimate pricing/margins unless role already allows, package/billing controls. |
| Foreman | No assistant conversion controls. May later receive reviewed field handoff only after office approval. | Estimates, pricing, margins, proposal internals, job creation, company-wide data. |
| Employee | No assistant conversion controls. May later receive assigned-work context only after office approval. | Estimates, pricing, margins, job creation, unrelated jobs. |
| Support | No implicit access. Future support context must be explicit, scoped, and audited. | Silent impersonation, cross-company conversion context, mutation. |

## Package Boundary

Future assistant job conversion planning should be Premium-and-up:

- Basic: locked explanation and manual support upgrade path only.
- Premium: reviewed handoff packet can be considered in a future implementation phase.
- Elite: inherits Premium handoff planning; no automatic conversion powers by default.

Implementation must fail closed when role, company, estimate, or package context is missing.

## Review And Audit Requirements

Required before implementation:

- handoff packet generated event
- source estimate id, customer id, lead id, and company scope
- actor id and role
- included source sections
- review status: draft, needs review, approved for internal use, archived
- explicit human save when a job draft/job record is created or changed
- no customer-facing output unless separately approved by customer portal planning
- support handoff context that excludes margins, hidden pricing, and private notes

Do not log:

- passwords or secrets
- vendor credentials
- payment details
- raw private customer data beyond scoped record references
- full assistant prompts if they include sensitive notes

## Negative Tests Required Later

Any implementation needs tests proving:

- Basic owner/admin cannot access assistant job-conversion controls.
- Premium/Elite owner/admin can access only company-scoped approved estimate handoff packets.
- Estimator access follows existing estimate permission rules.
- Foreman and employee cannot access conversion controls by navigation or direct route.
- Field users cannot see estimate totals, margins, proposal internal notes, or office-only takeoff backup.
- Unapproved estimates cannot be treated as conversion-ready.
- A forged company/customer/lead/job/estimate id cannot read another tenant's conversion context.
- The assistant packet does not create jobs, assign crews, set dates, order materials, send messages, or change estimate totals.
- Missing role/package/company context fails closed.

## Future Implementation Prompt

Use only after this checkpoint is approved:

```text
APEX HQ - ASSISTANT JOB CONVERSION PHASE 1 REVIEW PACKET

Goal:
Build a Premium-and-up owner/admin/estimator internal handoff packet for one approved estimate using existing scoped data only.

Do not add automatic job creation, scheduling, crew assignment, material ordering, vendor purchasing, customer messaging, customer portal updates, pricing approval, estimate total changes, or field-user conversion controls.

Focus:
- reviewed estimate-to-job handoff summary
- source citations from approved estimate, customer, lead, proposal sections, startup checklist, and field handoff packet
- missing review and conflict warnings
- no automatic writes unless explicitly saved by an authorized office user through an existing reviewed flow
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
