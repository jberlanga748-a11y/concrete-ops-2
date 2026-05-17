# Premium Demo Workspace Prep

Status: Phase 1 prepared locally.

## Decision

Use the separate demo Fly app and demo SQLite volume as the controlled Premium demo workspace. The demo package is selected by config, not by payment or self-serve billing.

Recommended demo environment:

```text
DEMO_MODE=true
SEED_DEMO_DATA=true
DEMO_PACKAGE_ID=premium
```

## Why

The Basic demo proves package locks, but the main sales demo needs to show Premium-only value without moving into Elite growth surfaces. Premium is the right package for AI Rough Notes, GC packets, App Health, Watchtower/Field Ops foundations, and advanced reporting.

## Boundaries

- No Stripe.
- No checkout.
- No payment collection.
- No invoices.
- No self-serve plan changes.
- No real customer data mutation.
- No field-user access to plan, pricing, billing, package, or owner/admin settings data.
- No broad demo data rewrite.

## Basic Lock Demo

Use `DEMO_PACKAGE_ID=basic` on a throwaway demo volume or separate Basic demo environment when the sales story needs to show locked Premium routes. Do not downgrade or mutate a real pilot workspace to create lock-state evidence.

## Existing Data Safety

Demo backfill remains additive. If an existing database already has company settings, non-empty settings are not overwritten by demo seeding, including `packageId`. This keeps real/default workspaces from being silently upgraded when demo mode is used against an existing database.

## QA Gate

Before release, run:

```powershell
npm.cmd run verify:demo
npm.cmd run verify:packages
npm.cmd run verify:entitlements
npm.cmd run verify:roles
npm.cmd run build
git diff --check
```

## Rollback

This phase has no migration. Roll back by reverting the app code/config or setting `DEMO_PACKAGE_ID=basic` on a demo-only environment. Never reset a real customer volume for demo cleanup.
