# Apex Agent OS v1 Release Packet

Status: local/review-first complete for the current Apex Agent product boundary.

Related handoff docs:

- `docs/APEX_AGENT_OS_V1_PRESERVATION_CHECKLIST.md`
- `docs/APEX_AGENT_OS_V1_RELEASE_NOTES.md`

## Product Boundary

Apex HQ exposes one product-facing Apex Agent. Agent OS v1 is the operating layer behind that Agent: action registry, autonomy policy, queue/run records, internal draft/prep execution, learning signals, operator console evidence, and external gate locks.

Internal build/coordinator agents are not customer-visible agents.

## What v1 Does

- Defines exactly which internal actions Apex Agent may prepare, including required inputs, module ownership, permission/package gates, audit events, rollback behavior, and idempotency fields.
- Stores durable task/run records through audit-backed Agent OS run events, including queued/running/retrying/failed/dead-lettered/cancelled/succeeded states and recent logs.
- Lets owner/admin AI Office users queue safe internal draft/prep work from visible records.
- Executes safe internal runs into review-first packets only.
- Shows an AI Office Agent OS console with action filters, run detail, rollback/idempotency evidence, learning review rows, production gate evidence, and external locks.
- Captures learning signals from accepted edits, rejected drafts, won/lost estimates, closeout outcomes, follow-up outcomes, and contractor preferences with redaction and company scope.
- Supports Agent Leads daily job-finder prep and public/private source planning in review-first mode.

## What v1 Refuses

Agent OS v1 does not:

- Send email or SMS automatically.
- Make cold calls.
- Contact customers, agencies, vendors, providers, or source owners.
- Collect payment, create payment links, charge cards, refund, or mark paid.
- Submit bids or proposals.
- Change schedules, assign crews, file permits, or request inspections.
- Complete checklists, approve reports, resolve safety incidents, mutate job costs, or close jobs.
- Create leads automatically from found opportunities.
- Store raw credentials, passwords, OAuth tokens, or provider secrets in app records.
- Scrape private/login-gated sources or bypass source terms.
- Deploy, change production config, alter Fly/Supabase settings, or touch production data.

## External Gates

External gate boundaries are approved for human-confirmed implementation planning only:

- Email sending.
- SMS sending.
- Payment collection.
- Customer portal actions.
- Scheduling mutation.
- Bid submission.
- Integration writes.

Live execution stays locked until the normal domain adapter, per-company opt-in, explicit human confirmation UI, idempotency, audit, rollback, role/package checks, tenant checks, and release evidence are present.

## Required Preservation Checks

Latest local evidence recorded on 2026-05-29:

- `npm.cmd run verify:agent-os`
- `npm.cmd run verify:leads`
- `npm.cmd run verify:estimates`
- `npm.cmd run verify:server`
- `npm.cmd run build`
- `git diff --check`

Focused Agent OS rollup:

```powershell
npm.cmd run verify:agent-os
```

Release-adjacent checks:

```powershell
npm.cmd run verify:leads
npm.cmd run verify:estimates
npm.cmd run verify:server
npm.cmd run build
git diff --check
```

`verify:agent-os` includes:

- Shared Agent OS registry/policy/run/learning tests.
- Server Agent OS queue/run/advisor/external-gate tests.
- Local-only Agent OS console smoke with temp demo data.
- Agent learning verification.
- Role and auth verification.

## Production Evidence

The Agent Leads production readiness gate includes `verify_agent_os_console`, which maps to:

```powershell
npm.cmd run verify:agent-os-console
```

That smoke is local-only and verifies:

- Admin can see the Agent OS console.
- Action filters render.
- Queue, recent runs, run detail, learning review, production evidence, and external locks render.
- Employee cannot see Agent OS console controls.
- Employee API access to Agent OS is denied.
- No browser warning/error logs are emitted during the smoke.

## Remaining Outside v1

- Production-safe implementation of each external gate.
- Hosted auth smoke using explicitly configured demo/production smoke credentials.
- Real pilot evidence from one contractor workflow.
- Wider public-launch gates: monitoring, support, claims/legal review, backup/restore confidence, production auth smoke, and onboarding proof.
