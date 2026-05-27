# Apex Agent Production Operator Gate

Last updated: 2026-05-27

Purpose: define the production-safe path from review-first Apex Agent OS to any future autonomous operator behavior.

## Current Verdict

No production autonomous operator is approved.

Apex Agent OS v1 is approved locally for:

- internal task queue/run records
- safe internal draft/prep execution into review packets
- per-workflow autonomy settings for internal draft/prep behavior
- learning signals that are company-scoped and review-first
- locked external gate planning

It is not approved for:

- customer contact
- payment collection
- customer portal mutation
- scheduling mutation
- bid submission
- integration writes
- production config changes
- secret access
- production data mutation outside existing normal workflows

## Current Implemented Boundary

The only new operator-adjacent boundary in this slice is internal queueing from selected contractor advisor recommendations:

- Endpoint: `POST /api/agent/os/advisor-tasks`
- Level: L2 internal draft/prep queueing only
- Allowed result: audit-backed Agent OS task/run record for a known safe internal action
- Required target: visible company-scoped lead, estimate, or job record matching the supported recommendation mapping
- Explicitly blocked: customer contact, proposal/bid send, payment, invoice, scheduling, portal write, integration write, production config, secrets, and production data mutation

This boundary does not approve L3 domain mutation, L4 external action, or L5 autonomy.

## Operator Gate Checklist

Before any L3 or higher autonomous operator action:

1. Name the exact domain action.
2. Name the normal Apex HQ endpoint or workflow it will use.
3. Prove server authorization, role gates, package gates, and tenant scoping.
4. Define idempotency and retry behavior.
5. Define the audit event and redacted payload.
6. Define rollback or compensating action.
7. Add negative tests for employee/field users and wrong-package users.
8. Add positive tests for owner/admin with the required package.
9. Add browser smoke for the human confirmation UI.
10. State the target environment and production status.
11. Get explicit user approval for that exact boundary.

## Execution Levels

- L0: off.
- L1: read-only context and recommendations.
- L2: internal draft/prep packet creation. Current safe lane.
- L3: approved internal domain action after human confirmation. Requires exact-boundary approval.
- L4: approved external/customer-facing action after human confirmation. Requires exact-boundary approval and sandbox/test recipient evidence.
- L5: autonomous external action. Not approved for Apex HQ.

## Hosted Demo Smoke Boundary

Hosted Agent smoke may check:

- `/api/health` and `/api/ready`
- app route responses including `/ai-office`
- optional login/bootstrap when `--allow-auth` is supplied
- optional GET-only `agent` flow: admin `GET /api/agent/os` succeeds and employee `GET /api/agent/os` is denied

Hosted Agent smoke must not queue tasks, execute runs, reset data, export company data, send customer messages, submit bids, schedule work, collect payment, alter configs, deploy, or touch production data.

## Rollback Standard

Every operator action must fail closed. If authorization, package status, idempotency, audit write, external provider status, or rollback readiness is unknown, Apex Agent must stop and create a review packet instead.

## Verification Standard

Minimum verification for an approved operator slice:

```powershell
node --test --test-concurrency=1 <focused server tests> <focused shared tests> <focused frontend tests>
npm.cmd run verify:roles
npm.cmd run verify:auth
npm.cmd run verify:server
npm.cmd run build
git diff --check
```

For customer-facing or payment/scheduling work, add browser evidence for owner/admin approval and employee denial before any deploy request.
