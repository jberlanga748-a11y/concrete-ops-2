# Apex Agent Leads Daily Review Workflow

Status: local product workflow for contractor review. This does not approve production deploys, customer/source contact, bid submission, private-login automation, payment collection, scheduling mutation, integration writes, or production data work.

## What It Does

Agent Leads can prepare a daily public-source review run, persist review-only inbox rows, let an owner/admin save rows as Found Opportunity drafts, and then record the contractor's reviewed decision:

- approve the found opportunity for lead creation
- reject it as no fit
- create a lead through the normal Opportunity Scout conversion gate

Each decision writes redacted, company-scoped Agent OS learning evidence so future review rows can rank sources better.

## Product Boundary

Allowed:

- public no-login source review rows
- contractor review inbox rows with match reasons, risks, missing info, duplicate warnings, and source evidence
- Found Opportunity drafts saved only after human acknowledgement
- lead creation only after the Found Opportunity is approved and passes existing source/terms gates
- redacted company-scoped learning signals for approve, reject, and create-lead decisions

Locked:

- no cold calls, cold texts, cold emails, DMs, comments, or posts
- no automatic customer/source contact
- no bid submission
- no private portal/social scraping
- no CAPTCHA, MFA, paywall, or login bypass
- no contractor portal/social password storage
- no payment collection
- no production data, deploy, or Fly/Supabase/Vercel config change

## Endpoints

- `POST /api/agent/os/provider/review-queue-draft-opportunity`
  Saves a reviewed provider row as a Found Opportunity draft. It does not create a lead.

- `POST /api/agent/os/provider/daily-review-inbox-decisions`
  Records `approve_for_lead`, `reject`, or `create_lead` for a reviewed inbox row. `create_lead` reuses the existing Found Opportunity conversion path and remains blocked until normal approval/source gates pass.

## Verification

Focused coverage:

```powershell
node --test --test-concurrency=1 shared/agentOperatingSystem.test.js server/agent-os.test.js src/agent-os-ui-utils.test.js src/opportunity-scout-utils.test.js
npm.cmd run verify:agent-os
npm.cmd run verify:leads
npm.cmd run verify:agent-learning
npm.cmd run verify:server
npm.cmd run build
git diff --check
```
