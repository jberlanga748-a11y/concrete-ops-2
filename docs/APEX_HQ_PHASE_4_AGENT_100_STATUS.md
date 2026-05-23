# Apex HQ Phase 4 Agent 100 Status

Date: 2026-05-23
Status: complete for controlled pilot useful assistant
Production status: locked unless a separate backup-first production release is approved

## Scope

Phase 4 is complete only when Apex HQ has a useful pilot assistant that can inspect visible app state, suggest next actions, prepare review-first packets, create drafts only after explicit human approval, and preserve role, package, tenant, and safety boundaries.

The agent must never send customer messages, submit bids, change billing, change package/role settings, create invoices, schedule crews, convert records, or mutate production data without an explicit approved gate and the normal domain permissions.

## Completed Scope

Apex Agent is 100% for the controlled-pilot useful assistant definition.

Built:

- Shared Agent Action Inbox status derivation for live action packets and read-only audit history.
- AI Office inbox summary with status counts, waiting/blocked/complete summary, queue rows, audit rows, and safety copy.
- Review-first status grammar:
  - suggested
  - ready for review
  - approved for draft
  - draft created
  - blocked
  - dismissed
- Durable server-side generated, blocked, dismissed, rejected, approved-for-draft, and draft-created audit events.
- Lead-to-estimate draft creation only after a generated proposal and explicit human approval.
- Estimate send-review preparation that creates a review packet without emailing, marking sent, or contacting the customer.
- Approved estimate-to-draft-job conversion only after generated and approved audit records.
- Review-first assistant packets for estimates, jobs, reports, uploads, time, change orders, leads, customers, crews, schedule, support, delivery tickets, pre-pour, post-pour, safety, tool checklists, release readiness, material planning, pilot handoff, and closeout readiness.
- Closeout billing review packets without invoice creation, payment behavior, customer messaging, or final profit/loss mutation.
- Agent learning from reviewed estimates and closeouts with company scoping, approval workflow, dedupe, and redaction.
- Opportunity Scout remains review-first and blocks scraping bypass, credentials, auto-contact, bid submission, and field-user access.
- Field-user blocked behavior remains covered by tests and browser smoke.

Not built on purpose:

- Auto-send email or SMS.
- Bid submission.
- Invoice/payment creation.
- Automatic customer contact.
- Automatic schedule/crew assignment.
- Role, package, tenant, billing, or production configuration mutation.
- Production data mutation without a separately approved release path.

## Verification Evidence

Commands/checks run:

- `node.exe --test --test-concurrency=1 server/agent-action-proposals.test.js`
- `node.exe --test --test-concurrency=1 src/agent-action-proposal-utils.test.js src/apex-assistant-shell-utils.test.js shared/agentActionPolicy.test.js`
- `npm.cmd run verify:agent-learning`
- `npm.cmd run verify:opportunity-scout`
- `npm.cmd run verify:estimates`
- `npm.cmd run verify:leads`
- `npm.cmd run verify:roles`
- `npm.cmd run build`
- `git diff --check`
- Admin desktop visual audit for `/ai-office`
- Employee phone visual audit for `/ai-office`

Screenshot/manifests:

- `ui-audit/phase-4-agent-inbox/2026-05-23T05-54-17-956Z/manifest.json`
- `ui-audit/phase-4-agent-inbox/2026-05-23T05-54-22-140Z/manifest.json`
- `ui-audit/phase-4-agent-100/2026-05-23T06-04-20-799Z/manifest.json`
- `ui-audit/phase-4-agent-100/2026-05-23T06-04-20-846Z/manifest.json`

## Remaining After Controlled Pilot 100

These are not required for the current Phase 4 exit definition, but they are the next agent maturity steps.

1. Richer draft payload previews.
   - Show exact proposed field-level changes before approval.
   - Keep create/save/send behind existing domain workflow gates.

2. More trade-specific agent drafting.
   - Fencing, concrete, hardscape, excavation, remodel/small GC language.
   - More precise option/inclusion/exclusion/checklist recommendations.

3. Hosted demo smoke for agent flows.
   - Backup-first Fly demo deploy if needed.
   - Admin AI Office smoke.
   - Employee restricted-route smoke.

4. Production-safe autonomous operator planning.
   - Separate approval required for customer sends, bid submissions, schedule mutations, invoices, payments, or production data mutation.

## Safety Gate For Next Agent Phase

GO for next local implementation only if:

- It does not weaken review-first approvals.
- It does not bypass role, package, tenant, or field-user gates.
- It does not send customer messages, submit bids, create invoices/payments, mutate schedules, or change roles/packages without a new explicit approval gate.
- Tests prove field users remain blocked.
- Tests prove package gates still apply.
- Hosted/demo deploys use backup-first release discipline.

## Decision

Phase 4 is 100% for a controlled-pilot useful assistant.

Current status: 100% for useful pilot assistant; not 100% for production-safe autonomous operator.

Next recommended task: move to Phase 5 trade setup/profile coverage, or run backup-first Fly demo smoke for the agent flow before a guided user walkthrough.
