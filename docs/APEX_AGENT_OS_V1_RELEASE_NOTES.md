# Apex Agent OS v1 Release Notes

Internal release note: Apex Agent OS v1 is locally complete for the review-first product boundary.

## Summary

- Apex HQ now has a durable operating layer for the one product-facing Apex Agent.
- Agent OS v1 supports internal draft/prep work, audit-backed task/run records, operator controls, learning signals, and local console smoke coverage.
- Agent OS v1 does not approve production autonomy or external/customer-contact actions.

## Included

- Action registry with required inputs, module ownership, permission/package gates, audit events, rollback behavior, and idempotency fields.
- Autonomy policy settings for draft-only, approval-required, and locked workflows.
- Task/run queue records with retries, dead-letter, cancellation, kill-switch shape, logs, and status controls.
- Safe internal execution into review-first packets only.
- AI Office console with filters, run detail, rollback/idempotency evidence, learning review, production evidence, and external locks.
- Local-only console smoke through `npm.cmd run verify:agent-os-console`.
- Focused preservation command through `npm.cmd run verify:agent-os`.

## Locked

- Email/SMS sending.
- Customer/source contact.
- Payment collection.
- Customer portal writes.
- Scheduling mutation.
- Bid submission.
- Integration writes.
- Credential storage.
- Production config, deploys, and production data changes.

## Preservation

Future Agent OS work should start from:

- `docs/APEX_AGENT_OS_V1_RELEASE_PACKET.md`
- `docs/APEX_AGENT_OS_V1_PRESERVATION_CHECKLIST.md`

## Latest Local Verification

Completed on 2026-05-29:

- `npm.cmd run verify:agent-os`
- `npm.cmd run verify:leads`
- `npm.cmd run verify:estimates`
- `npm.cmd run verify:server`
- `npm.cmd run build`
- `git diff --check`

No production data, deploys, Fly/Supabase config changes, or secrets were touched.

Run before handoff:

```powershell
npm.cmd run verify:agent-os
git diff --check
```
