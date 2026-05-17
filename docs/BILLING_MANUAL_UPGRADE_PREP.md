# Apex HQ Billing / Manual Upgrade Prep

Status: planning complete / implementation requires approval
Owner: Apex HQ Master Coordinator
Last updated: 2026-05-17
Use with: `docs/APEX_HQ_BUILD_STATUS_AND_PHASES.md`

## Purpose

Define the safest path for Apex HQ to explain Basic, Premium, and Elite packages before Stripe, checkout, invoices, payment collection, or public self-serve plan changes are built.

This phase is not billing automation. It is the support-led upgrade foundation so owners/admins understand what is included, what is locked, how to ask about an upgrade, and what Apex HQ should not promise yet.

## Current Evidence From Repo

| Area | Evidence | Current behavior |
| --- | --- | --- |
| Package definitions | `shared/packages.js` | Basic, Premium, and Elite package IDs, feature keys, feature details, security features, and `packageReadinessSummary()` exist. Billing mode is currently manual. |
| Entitlements | `shared/packageEntitlements.js` | Estimates, imports, AI Office, App Health, Watchtower, Field Ops, Reporting, Opportunity Scout, and Support are resolved from shared package feature checks. |
| Server package gates | `server/index.js` `companyHasFeature()`, `assertCompanyFeature()`, bootstrap permissions payload | Server derives package access from company settings and current user. Security features are always included. |
| Frontend plan readiness | `src/App.jsx` `PlanReadinessPanel` and Settings plan section | Owner/admin Settings shows current package, manual billing status, included features, next upgrade, security features, and locked features. |
| Package lock UX | `src/navigation-utils.js`, `src/App.jsx` protected route handling | Package-locked routes show manual upgrade notes and route owner/admin users toward plan readiness without exposing field users. |
| Support handoff | `src/support-utils.js`, Support page in `src/App.jsx` | Support requests are copy-only/manual. No emails, SMS, tickets, or external sending are automatic. |
| Business package docs | `docs/PRICING_PACKAGE_STRATEGY.md`, `docs/FOUNDER_PILOT_ONBOARDING_PACKET.md` | Founder pilot pricing direction exists, but it is not a launched public self-serve billing system. |
| Verification scripts | `package.json` | `verify:packages`, `verify:entitlements`, `verify:roles`, and build checks exist. |

## Product Promise

Manual upgrade prep should let an owner/admin answer:

- What package am I on?
- What do I already have?
- What would Premium or Elite add?
- Why is this feature locked?
- How do I ask about upgrading?
- What is not automated yet?

It should not make Apex HQ feel like payments or self-serve billing are live before they are actually built.

## Non-Negotiable Rules

- Do not add Stripe.
- Do not add checkout.
- Do not collect payments.
- Do not create invoices.
- Do not add public self-serve plan changes.
- Do not let users change their own package from the UI.
- Do not expose plan/pricing/upgrade controls to foremen or employees.
- Do not make security, auth, company isolation, role permissions, demo separation, or health checks premium-only.
- Do not show fake usage limits, fake invoices, fake payment methods, or fake subscription status.
- Do not promise guaranteed leads, AI autopilot, accounting replacement, payroll replacement, or enterprise compliance.
- Package access must require both company package entitlement and user role permission.

## Existing Systems To Extend

Extend these instead of creating a parallel billing system:

- `shared/packages.js`
- `shared/packageEntitlements.js`
- `src/navigation-utils.js`
- Settings `PlanReadinessPanel` in `src/App.jsx`
- Support page and `src/support-utils.js`
- Company settings package ID handling
- Existing package, entitlement, and role tests
- Existing audit/activity foundations when a future owner/operator package-change flow is built

## Phase 1 Allowed Scope

Billing / Manual Upgrade Prep Phase 1 should be copy-only and support-led.

Allowed:

- Clearer owner/admin package explanation.
- A support-led "Request upgrade review" handoff.
- Package comparison copy for Basic, Premium, and Elite.
- Manual upgrade notes that explain package changes are founder/operator-approved for now.
- Locked-feature explanations that route owner/admin users to Support or Plan Readiness.
- Tests proving field users do not see billing/upgrade controls.
- Tests proving package gates still block direct access.

Not allowed:

- Stripe keys, products, prices, subscriptions, checkout sessions, portals, webhooks, or invoices.
- Client-side package switching.
- Automatic plan changes.
- Payment status claims.
- Billing emails, SMS, or push messages.
- Usage-based billing or seat billing.
- Customer portal.
- Accounting integrations.

## Package Messaging

| Package | Positioning | Safe live wording | Avoid |
| --- | --- | --- | --- |
| Basic | Core contractor operations | "Basic keeps leads, customers, jobs, crews, reports, uploads, schedule, notifications, simple estimates, and support organized." | "Unlimited everything", "fully automated business system" |
| Premium | Main package for growing contractors | "Premium adds proposal tools, GC packet direction, App Health, Watchtower, Field Ops Agent, advanced reporting, and verified assistant workflows where enabled." | "AI runs your company", "guaranteed more jobs" |
| Elite | Hands-on growth and advanced tools | "Elite is for contractors that need growth partner services, Lead Finder, website/ad assistant direction, customer portal planning, and advanced automation as those systems are verified." | "Done-for-you guaranteed leads", "automatic ads", "enterprise-ready by default" |

## Role Visibility

| Role | Package/billing visibility | Boundaries |
| --- | --- | --- |
| Owner | Can view package readiness, locked-feature explanations, and support-led upgrade handoff. | Cannot self-change package until billing is intentionally built. |
| Administrator | Can view package readiness and ask owner/support about upgrades if current permissions already allow Settings/support. | Should not override owner-only billing decisions unless explicitly allowed later. |
| Operations manager | May see workflow availability if already allowed, but no billing controls by default. | No payment, plan, or company billing controls. |
| Estimator | May see feature-locked estimate/proposal states where relevant. | No package management, billing, or company settings controls. |
| Foreman | Field workflow only. | No plan, pricing, locked premium sales copy, billing, estimates/pricing, or office/admin controls. |
| Employee | Personal assigned work only. | No plan, pricing, locked premium sales copy, billing, estimates/pricing, or office/admin controls. |

## Manual Upgrade Flow

Recommended Phase 1 flow:

1. Owner/admin hits a locked Premium or Elite feature.
2. UI explains the feature is not included in the current package.
3. UI routes to Settings Plan Readiness or Support.
4. Plan Readiness explains:
   - current package
   - included now
   - next upgrade adds
   - locked future features
   - security stays included
   - manual billing only
5. Support handoff creates a copy-only request with:
   - company/workspace
   - current package
   - requested package or feature
   - reason/use case
   - current user role
   - no secrets
6. Founder/operator reviews manually and changes package only through an approved admin/operator path.

## Future Package Change Requirements

Before any real package-change UI or billing automation is built, Apex HQ needs:

- Server-side owner/operator-only package-change route.
- Audit log event for package changes.
- Clear previous package and new package record.
- Company-scoped package update.
- Negative tests proving field/admin roles cannot self-upgrade.
- Rollback path for incorrect package assignment.
- Support/admin process for manual changes.
- Stripe/customer/subscription model only after manual flow is proven.

## Data Model Notes

Current Phase 1 should not require schema changes.

Known existing state:

- Company package is derived from company settings.
- Package ID is redacted from field users in bootstrap where appropriate.
- Security features are always available through `SECURITY_FEATURES`.

Future billing automation will likely require new durable data for:

- billing customer ID
- subscription ID
- plan history
- seat or usage limits
- billing status
- trial status
- payment failure state

Do not add those until Stripe/customer billing is explicitly approved.

## QA Plan For First Build Slice

When implementation is approved, run focused verification:

- `npm.cmd run verify:packages`
- `npm.cmd run verify:entitlements`
- `npm.cmd run verify:roles`
- `npm.cmd run build`
- `git diff --check`

Browser QA:

- Owner/admin desktop Settings Plan Readiness.
- Owner/admin locked Premium and Elite feature states.
- Owner/admin Support handoff from upgrade context.
- Foreman/employee direct route checks for Settings, plan readiness, estimates, App Health, AI Office, Opportunity Scout, and advanced reporting.
- Mobile layout for locked state and Support handoff.
- No horizontal overflow.
- No console errors.
- No failed API requests.

## Approval Decisions Needed

Recommended answers:

| Decision | Recommendation |
| --- | --- |
| Build support-led upgrade request UX now? | Yes, as copy-only/manual. |
| Add Stripe now? | No. |
| Let owners self-change packages now? | No. |
| Show package comparison to owner/admin? | Yes. |
| Show pricing to field users? | No. |
| Add audit event for future package changes? | Yes, when a package-change route exists. |
| Keep founder pilot pricing in business docs only? | Yes, until sales positioning is approved for app UI. |
| Make Premium the main sales path? | Yes, based on current business docs, but do not force in app logic. |

## Next Builder Prompt

Use this only after approving the above boundaries:

```text
You are entering:

APEX HQ - BILLING / MANUAL UPGRADE PREP PHASE 1

Use skills:
- apex-build-router
- apex-product-system
- apex-permission-safety
- apex-qa-engineer

Repo:
C:\Users\jberl\Documents\Codex\concrete-ops-2-clean

Do NOT add Stripe.
Do NOT add checkout.
Do NOT add payment collection.
Do NOT add invoices.
Do NOT add self-serve plan changes.
Do NOT redesign Settings or Support.
Do NOT expose billing, pricing, or package controls to field users.
Do NOT commit, push, or deploy.

Goal:
Tighten the support-led Basic/Premium/Elite upgrade path so owner/admin users understand their package, locked features, next upgrade, and how to request a manual upgrade review.

Focus only on:
- Settings Plan Readiness copy and actions
- package-locked route explanation
- Support handoff context for upgrade requests
- role-safe owner/admin visibility
- tests proving field users remain blocked

Preserve:
- existing package entitlement helpers
- existing route protections
- existing support copy-only/manual behavior
- existing company settings package source
- existing role and field protections

Expected behavior:
- Owner/admin can see current package and next upgrade clearly.
- Owner/admin can open a copy-only support request for a manual upgrade review.
- Locked Premium/Elite feature states explain what is locked without feeling broken.
- Foreman/employee users do not see billing, package management, pricing, or office-only upgrade controls.
- No automatic sending, billing, package changing, or payment behavior is added.

Run:
- npm.cmd run verify:packages
- npm.cmd run verify:entitlements
- npm.cmd run verify:roles
- npm.cmd run build
- git diff --check

Report:
- files changed
- exact UX/permission changes
- verification results
- safe to release yes/no
```

## Rollback Plan

Because the first implementation slice should be UI/support-copy only, rollback should be a normal code revert of the Settings/support/locked-state changes. No data migration, payment provider, secret, or production data rollback should be involved.
