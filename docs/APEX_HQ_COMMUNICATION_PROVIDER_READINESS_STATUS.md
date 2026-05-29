# Apex HQ Communication Provider Readiness Status

Status: complete for Build 8A locked communication provider readiness and outbound approval queue scope.

## What Is Now Complete

- Apex HQ now has a communication provider readiness contract for email and SMS.
- The readiness contract tracks provider configuration, per-company external gate opt-in, consent model, opt-out enforcement, do-not-contact review, template review, delivery history capture, and outbound approval queue readiness.
- Owner/admin and other office roles with communication access can view readiness; field users remain blocked by server authorization.
- Office users can queue locked outbound approval records for visible leads, customers, estimates, and jobs.
- Outbound approval records capture channel, reviewed recipient, consent source, opt-out/do-not-contact state, template review, human review, idempotency key, audit event, rollback behavior, and customer-visible message preview with email redaction.
- Idempotent replay returns the existing locked approval instead of creating duplicate approval records.
- A hard-deny execution route returns locked status so approval queue evidence cannot send email, SMS, portal notifications, bids, invoices, payment links, or provider writes.
- Unsafe payloads containing secrets, provider tokens, bypass flags, payment links, or auto-send instructions are rejected.

## Safety Boundary

Build 8A does not:

- send email
- send SMS
- send portal notifications
- submit bids
- create invoices
- collect payment
- store provider secrets, raw provider responses, API keys, OAuth tokens, cookies, or sessions
- change provider configuration
- change Fly, Supabase, Vercel, or production configuration
- deploy
- mutate production data

Existing human-confirmed estimate email execution remains governed by the already-approved `email_send` gate and normal estimate send workflow. Build 8A only adds readiness and approval queue evidence for broader communication provider workflows.

## Verification

Run locally from the repo root:

```powershell
node --test --test-concurrency=1 shared/communicationProviderReadiness.test.js server/agent-os.test.js
npm.cmd run verify:agent-os
npm.cmd run verify:roles
npm.cmd run verify:auth
npm.cmd run verify:server
npm.cmd run build
git diff --check
```
