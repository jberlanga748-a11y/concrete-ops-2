# Apex HQ Communication Provider Readiness Status

Status: complete for Build 8B locked communication provider readiness, outbound approval queue, suppression, and delivery-attempt contract scope.

## What Is Now Complete

- Apex HQ now has a communication provider readiness contract for email and SMS.
- The readiness contract tracks provider configuration, per-company external gate opt-in, consent model, opt-out enforcement, do-not-contact review, template review, delivery history capture, and outbound approval queue readiness.
- Owner/admin and other office roles with communication access can view readiness; field users remain blocked by server authorization.
- Office users can queue locked outbound approval records for visible leads, customers, estimates, and jobs.
- Outbound approval records capture channel, reviewed recipient, consent source, opt-out/do-not-contact state, template review, human review, idempotency key, audit event, rollback behavior, and customer-visible message preview with email redaction.
- Idempotent replay returns the existing locked approval instead of creating duplicate approval records.
- A hard-deny execution route returns locked status so approval queue evidence cannot send email, SMS, portal notifications, bids, invoices, payment links, or provider writes.
- Unsafe payloads containing secrets, provider tokens, bypass flags, payment links, or auto-send instructions are rejected.
- Owner/admin office users can record locked communication suppression evidence for email, SMS, or all communication channels.
- Suppression records capture recipient, normalized recipient key, reason, optional visible target record, source, redacted note, idempotency key, audit event, rollback behavior, and locked send state.
- Provider readiness now reports active suppression counts and locked delivery-attempt contract counts by channel.
- Owner/admin office users can prepare a locked delivery-attempt contract from a queued outbound approval.
- Delivery-attempt contracts check suppression evidence and provider readiness, classify provider/suppression/lock failures, and explicitly keep provider request preparation, provider sends, provider responses, and customer contact disabled.
- Suppression and delivery-attempt contract replays are idempotent and audit backed.

## Safety Boundary

Build 8B does not:

- send email
- send SMS
- send portal notifications
- prepare provider requests
- call provider unsubscribe endpoints
- submit bids
- create invoices
- collect payment
- store provider secrets, raw provider responses, API keys, OAuth tokens, cookies, or sessions
- change provider configuration
- change Fly, Supabase, Vercel, or production configuration
- deploy
- mutate production data

Existing human-confirmed estimate email execution remains governed by the already-approved `email_send` gate and normal estimate send workflow. Build 8B only adds readiness, approval queue, suppression, and locked delivery-attempt evidence for broader communication provider workflows.

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
