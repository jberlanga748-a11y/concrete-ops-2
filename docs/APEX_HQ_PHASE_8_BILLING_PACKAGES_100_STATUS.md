# Apex HQ Phase 8 Billing And Packages 100 Status

Date: 2026-05-23
Status: complete for manual package model and billing boundary readiness
Production/payment status: locked unless a separate payment implementation phase is explicitly approved

## Scope

Phase 8 is complete when Apex HQ can safely explain Basic, Premium, and Elite packages, enforce package entitlements, route owner/admin users into a support-led manual upgrade review, and prove field users remain blocked from package, billing, pricing, and office-only upgrade controls.

This phase does not add Stripe, checkout, payment collection, invoices, subscription portals, self-serve plan changes, automatic package changes, billing emails, customer messages, or production package mutation.

## Completed Scope

Built and verified:

- Basic, Premium, and Elite package definitions exist in shared package metadata.
- Security, auth, company isolation, role permissions, demo separation, and health checks remain included for every package.
- Basic includes core contractor operations and keeps Premium/Elite surfaces locked.
- Premium inherits Basic and adds proposal, GC packet, app health, assistant, integration, and advanced reporting foundations.
- Elite inherits Premium and adds Lead Finder, customer portal preview, advanced automation/analytics, and growth partner services.
- Package readiness summaries stay manual-billing-only.
- Settings Plan Readiness explains current package, next upgrade, included features, locked future features, security features, and manual billing boundaries.
- Locked package route explanations point owner/admin users toward Plan Readiness or Support without changing packages.
- Support upgrade handoff is copy-only/manual and includes current package, requested package/feature, role, workspace context, and no secrets.
- Foreman/employee users are blocked from package upgrade review controls and package metadata remains redacted in field bootstrap payloads.
- Entitlement tests cover Basic/Premium/Elite access boundaries and field-user denial even on Elite workspaces.
- Package billing readiness gate now separates:
  - manual package model ready
  - payment implementation ready
- Payment implementation remains blocked until a separate exact approval phrase and future payment phase.

## Verification Evidence

Commands/checks run:

- `npm.cmd run verify:billing-readiness`
- `npm.cmd run verify:packages`
- `npm.cmd run verify:entitlements`
- `npm.cmd run verify:roles`
- `npm.cmd run verify:claims`
- `npm.cmd run launch:package-billing-readiness -- --packages-verified --entitlements-verified --roles-verified --support-handoff-verified --claims-verified --build-verified --manual-billing-boundary-acknowledged --upgrade-audit-trail-planned --payment-plan-documented --json`
- `npm.cmd run build`
- `git diff --check`

Readiness decisions:

- Manual package model: GO
- Payment implementation: NO-GO until a separate payment implementation phase records `PAYMENT_IMPLEMENTATION_SEPARATELY_APPROVED`
- Basic package summary: 18 included features, 16 locked future features
- Premium package summary: 27 included features, 7 locked future features
- Elite package summary: 34 included features, 0 locked future features
- Owner/admin upgrade review visibility: PASS
- Field-user package upgrade visibility: BLOCKED

## What 100 Percent Means Here

Phase 8 is 100% for the manual package model.

It means Apex HQ can safely tell an owner/admin what package they are on, what is included, what is locked, what the next upgrade would add, and how to request a manual review without giving field users access or implying payment automation exists.

It does not mean billing automation is built.

## Remaining Before Payment Collection

These are future gates, not Phase 8 blockers:

1. Choose Stripe or another provider after legal, tax, accounting, and business review.
2. Design a server-side owner/operator-only package-change route.
3. Add durable package-change audit events with previous/new package and actor.
4. Add billing customer/subscription model only after provider approval.
5. Add payment failure/trial/seat/usage states only after billing scope is approved.
6. Add negative tests proving no role can self-upgrade or bypass package gates.
7. Add rollback path for incorrect package assignment.

## Decision

Phase 8 is 100% for manual package and billing-boundary readiness.

Payment collection remains locked unless a separate implementation phase is approved.
