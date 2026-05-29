# Apex Agent OS v1 Preservation Checklist

Use this before any future Agent OS change. The goal is to preserve the completed review-first v1 boundary instead of reopening finished core work.

## Preserve

- One product-facing Apex Agent.
- Review-first internal draft/prep execution only.
- Audit-backed task/run ledger, status transitions, logs, retries, dead-letter, and cancellation shape.
- Company-scoped, redacted learning signals.
- Owner/admin-only AI Office Agent OS console.
- Field-role denial in UI and API.
- External gates visible as planned/locked unless explicitly configured through a normal domain workflow.

## Do Not Reopen Without A New Approved Scope

- Rebuilding the core action registry model.
- Adding another customer-visible agent.
- Replacing the audit-backed run ledger with schema churn.
- Auto-creating leads from found opportunities.
- Auto-sending email/SMS, submitting bids, collecting payment, changing schedules, writing portals/integrations, or storing credentials.
- Touching production data, deploy settings, Fly/Supabase config, or secrets.

## Required Before Any Agent OS Change

1. Confirm the change fits one product-facing Apex Agent.
2. Confirm whether it is internal draft/prep, human-confirmed external gate, or locked.
3. Add/keep server-side role, package, and tenant checks.
4. Add a negative field-role or locked-gate test when the boundary changes.
5. Keep rollback/idempotency/audit behavior explicit.
6. Run:

```powershell
npm.cmd run verify:agent-os
git diff --check
```

## Escalate Before Work

Pause for explicit approval if the request involves:

- Production deploys or config.
- Secrets, credentials, OAuth tokens, passwords, or provider keys.
- Customer/source contact.
- Payment collection.
- Bid submission.
- Scheduling mutation.
- Portal or integration writes.
- Production data reads/writes outside local verification.
