# Customer Portal Planning Checkpoint

Status: planning complete / implementation requires approval

## Decision

Do not build a customer portal yet.

The next safe customer-facing step should be an internal owner/admin planning and preview path first, with all customer-visible content manually approved before anything can be shared. Customer login, public customer authentication, self-serve approvals, payments, invoices, automatic notifications, and live job tracking remain out of scope until later checkpoints.

Customer portal capability remains an Elite-level future feature. Planning can happen now, but implementation must preserve package gates and should not expose customer-facing controls to Basic or Premium workspaces unless a later approved phase deliberately changes the package model.

## Why

Customer-facing access changes the trust boundary. Apex HQ already has customer-safe proposal/GC packet output and office/field separation, but a portal would add new risks:

- customers seeing draft estimates, internal notes, margin/pricing details, or AI recommendations
- field users or customers seeing owner/admin-only settings, package, billing, or support context
- public links exposing another customer, job, proposal, photo, or company workspace
- customer actions becoming accidental approvals, job changes, or payment expectations
- support having no audit trail for what was shared

The safe move is to define the boundary before building the surface.

## Future Phase 1 Shape

When implementation is approved later, the first build should be a manual approval preview, not a full portal.

Allowed first surface:

- owner/admin-only internal preview of a customer-facing packet
- approved estimate/proposal summary
- approved scope, options, exclusions, schedule notes, and customer-facing totals
- curated job progress summary written for the customer
- selected photos or closeout proof only after owner/admin approval
- change order summary only after office review
- clear "not sent yet" and "approved to share" states

Not allowed in Phase 1:

- customer login
- public customer dashboard
- self-serve approval buttons
- payment, invoices, checkout, Stripe, or billing portal
- automatic email/SMS sending
- automatic proposal approval
- automatic job status publishing from field updates
- automatic change order acceptance
- live crew location, hidden GPS, or employee monitoring
- customer-visible AI recommendations or internal assistant output

## Role Boundary

| Role | Future Portal Planning Access | Must Stay Blocked |
| --- | --- | --- |
| Owner | May review, approve, and mark customer-facing content as share-ready in a future phase. | Cross-company data, unreviewed AI output, destructive publish without confirmation. |
| Admin | May prepare customer-facing preview and request owner/admin review if granted. | Owner-only settings, billing/package controls, internal margins unless already allowed. |
| Estimator | May contribute proposal content if existing role rules allow estimate access. | Publishing without owner/admin approval, customer auth controls. |
| Foreman | No portal planning/admin access. May contribute field data that office can later curate. | Customer portal controls, pricing, proposals, internal notes, company settings. |
| Employee | No portal planning/admin access. May contribute assigned-work photos/notes only through existing field flows. | Customer portal controls, unrelated jobs, pricing, proposals, internal notes. |
| Customer | No access in this checkpoint. Future access requires separate auth/share-link design. | Internal workspace data, other customer data, drafts, margins, AI notes, field user data. |
| Support | No implicit impersonation. Future support access must be explicit, scoped, and audited. | Silent customer/company access or mutation. |

## Package Boundary

Customer portal remains mapped to the Elite package feature `customer.portal`.

Planning and docs can exist globally, but runtime access in any later implementation should:

- hide portal controls from Basic and Premium workspaces
- keep Basic and Premium package-locked explanations manual and support-led
- keep all portal controls hidden from field users even in Elite workspaces
- fail closed when package or role context is missing

## Customer-Visible Content Rules

Allowed later, after owner/admin approval:

- company identity and approved contact information
- approved proposal or estimate snapshot
- approved scope and exclusions
- approved option labels and selected totals
- approved schedule expectations or next-step language
- selected job photos, delivery tickets, change order summaries, and closeout records

Never customer-visible by default:

- internal estimate notes
- cost, margin, markup logic, or profitability
- AI rough notes, assistant reasoning, or confidence flags
- lead scoring, opportunity scout data, or marketing notes
- employee personal information beyond intentional site contact details
- field safety incident details unless explicitly prepared for the customer
- app health, audit, release, support, billing, package, or settings data

## Data And Authorization Requirements

Before implementation, the design must specify:

- tenant/company scoping for every portal object
- customer/project scoping for every shareable packet
- server-side authorization for owner/admin preparation and approval
- signed-link or customer-auth model, if any
- expiration, revocation, and access logging for share links
- audit events for preview generation, approval, share, revoke, and customer view
- tests proving one customer cannot view another customer, job, estimate, upload, or packet

No client-provided `companyId`, `customerId`, `jobId`, or role may be trusted without server-side validation.

## Support And Audit Requirements

Support must be able to understand what was shared without gaining broad customer access.

Required later:

- share status visible to owner/admin
- last approved by, approved at, shared at, revoked at
- safe support handoff context
- no support impersonation unless a separate audited support-access design exists

## Implementation Prerequisites

Do not begin implementation until these are true:

- Customer-facing packet scope is approved.
- Auth/share-link model is approved.
- Package gate behavior is approved.
- Role matrix has negative tests planned.
- Audit events are designed.
- Revocation path is designed.
- Support handoff is designed.
- Browser/mobile QA plan exists for owner/admin preview and customer read-only view.

## First Implementation Prompt

Use only after this checkpoint is approved:

```text
APEX HQ - CUSTOMER PORTAL PHASE 1 MANUAL APPROVAL PREVIEW

Goal:
Build an owner/admin-only internal preview for customer-facing proposal/progress content. Do not add customer login, public share links, self-serve approvals, payments, invoices, Stripe, automatic sending, or customer portal navigation.

Focus:
- Elite-gated owner/admin internal preview only
- approved/safe customer-facing fields
- no field-user access
- no customer access yet
- audit-ready status fields or planning stubs only if needed
- tests proving Basic/Premium/field users remain blocked
```

## Verification For This Checkpoint

Planning checkpoint verification:

```powershell
npm.cmd run verify:packages
npm.cmd run verify:entitlements
npm.cmd run verify:roles
git diff --check
```
