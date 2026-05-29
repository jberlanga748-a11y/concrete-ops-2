# Apex HQ External Gate Readiness Status

Status: complete for Build 9B locked Agent OS external-gate readiness deck, generic preflight endpoint scope, locked execution contract deck, and hard-deny execute route scope.

## What Is Now Complete

- Apex Agent OS summary includes `externalGateReadinessDeck` for the approved external gates.
- The AI Office Agent OS console shows the locked preflight deck with blocker counts, evidence counts, endpoints, safety boundaries, and blocked actions.
- Generic readiness preflight is available at `POST /api/agent/os/external-gates/:gateId/readiness` for email, SMS, payment collection, customer portal action, bid submission, and integration write gates.
- Scheduling keeps its specific visible-job preflight at `POST /api/agent/os/external-gates/scheduling/readiness`.
- Server role/package gates stay closed for field users and enforce the relevant package features for portal, scheduling, and integrations.
- Readiness packets reject unsafe intent by surfacing blockers when payloads include credentials, bypass flags, immediate send/charge/write/submit/sync instructions, or secret-shaped fields.
- These preflights return locked evidence only and do not write readiness audit events or mutate domain records.
- Agent OS summary includes `externalGateExecutionDeck` for non-scheduling external gates.
- Generic locked execution contracts are available at `POST /api/agent/os/external-gates/:gateId/execution-contract` for email, SMS, payment collection, customer portal action, bid submission, and integration write gates.
- Generic execute routes exist at `POST /api/agent/os/external-gates/:gateId/execute` and return locked status instead of executing.
- Locked execution contracts are idempotent by gate and idempotency key and write redacted audit evidence only.
- Customer portal keeps its deeper domain-specific locked execution contract flow for reviewed share approvals, and communication workflows keep their locked outbound approval/delivery-attempt contracts.

## Safety Boundary

Build 9B does not:

- send email or SMS
- prepare provider requests
- collect, charge, capture, refund, or mark payment state
- create customer portal sessions, links, tokens, messages, approvals, or actions
- mutate schedules or assign crews
- submit bids or upload packets
- write to integrations, webhooks, calendars, accounting systems, or external providers
- store credentials or provider secrets
- enable live execution from readiness or execution-contract evidence
- change Fly, Supabase, Vercel, or production configuration
- deploy
- mutate production data

## Verification

Run locally from the repo root:

```powershell
node --test --test-concurrency=1 shared/agentOperatingSystem.test.js server/agent-os.test.js src/agent-os-ui-utils.test.js
npm.cmd run verify:agent-os
npm.cmd run verify:jobs
npm.cmd run verify:docs
npm.cmd run verify:server
npm.cmd run build
git diff --check
```
