# Apex Agent Operator Guide

This guide is for owner/admin operators reviewing Apex Agent OS work in production. Apex is one product-facing Agent. The console is an internal operator surface, not a second customer-visible agent.

## What Apex Agent Can Do Now

Apex Agent can queue and run internal draft/prep work for visible company records:

- Lead follow-up draft
- Opportunity search prep
- Estimate packet draft
- Change order draft
- Invoice/payment prep
- Material list prep
- Job costing review
- Warranty follow-up draft
- Permit checklist prep
- Crew handoff prep
- Daily report review
- Upload/photo review
- Delivery ticket review
- Safety incident summary
- Pre-pour review
- Post-pour review

These actions create review packets, summaries, prep notes, or internal recommendations. They do not send messages, collect payment, submit bids, write portals, mutate schedules, change integrations, complete checklists, or contact customers.

## What Stays Locked

External/customer-visible actions stay locked unless a normal domain workflow is explicitly configured and reviewed for the exact company and exact gate:

- Email sending
- SMS sending
- Payment collection
- Customer portal writes
- Scheduling mutation
- Bid submission
- Integration writes
- Provider credential handling or private-source login automation
- Cold calls or autonomous customer contact

An external gate decision packet is planning evidence only. It does not execute.

## Daily Operator Flow

1. Open the Apex Agent OS Console from AI Office.
2. Review the status badge, operator checklist, and external lock count.
3. Queue only internal draft/prep actions that have visible target records.
4. Open Recent Runs to review queued, running, failed, dead-lettered, or completed work.
5. Use Execute only for internal packet execution. Use Retry for failed/dead-lettered internal runs after checking the run detail.
6. Use Dead-letter when a run should stop until an operator reviews the cause.
7. Use Cancel when the work is no longer needed.

## Run Review Rules

Every run should show:

- Action id and status
- Target entity and company-scoped context
- Audit event or audit-backed run record
- Rollback behavior
- Idempotency fields
- Output mode and blocked external actions
- Recent logs

If a run is missing target context, audit detail, rollback text, or idempotency fields, dead-letter it and investigate before retrying.

## Learning Review

Learning signals stay company-scoped and redacted before reuse. Review learning rows for:

- Accepted edits
- Rejected drafts
- Won/lost estimates
- Closeout outcomes
- Follow-up outcomes
- Contractor preferences

Signals with scope warnings should not be reused until reviewed.

## External Gate Approval Checklist

Before any external gate can move beyond planning, record evidence for:

- Normal domain adapter or endpoint
- Per-company opt-in for the exact gate
- Human confirmation that names the visible effect
- Idempotency key and retry/dead-letter behavior
- Redacted audit event
- Rollback or compensating action
- Tenant, role, and package negative tests
- Provider sandbox, test-recipient, or test-account strategy

Even with this evidence, the Agent OS packet itself does not send, collect payment, write portal/schedule/integration data, submit bids, store credentials, or enable autonomous execution.

## Release And Support Checks

For production release support:

- Confirm the latest post-deploy monitoring note in `docs/APEX_AGENT_OS_V1_POST_DEPLOY_MONITORING.md`.
- Confirm hosted health/readiness smoke passed.
- Confirm production auth smoke passed if that gate was approved for the release.
- Confirm rollback target and release id are known.
- Keep secrets out of docs, logs, screenshots, and support notes.
- Do not change Fly, Supabase, secrets, or production data without explicit approval.
