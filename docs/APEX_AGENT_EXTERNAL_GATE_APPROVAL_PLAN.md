# Apex Agent External Gate Approval Plan

Last updated: 2026-05-27

Purpose: define the exact approval packet required before Apex Agent may perform any customer-facing, financial, scheduling, bid, portal, or integration write action.

## Current State

The owner approved the external action boundaries on 2026-05-27. That approval means Apex Agent may now implement human-confirmed gate surfaces and server-side decision packets for these boundaries. It does not mean Apex Agent may auto-send, auto-submit, charge, schedule, write to a customer portal, write to an integration, change production config, expose secrets, or mutate production data without the normal domain adapter, per-company opt-in, confirmation UI, idempotency, audit, rollback, role/package, and tenant checks.

The contractor advisor to Agent OS queue endpoint is not an external gate. It only creates internal Agent OS task/run audit records for supported safe draft/prep recommendations with visible company-scoped targets.

Latest implementation status:

- External gate boundaries are represented as `boundary_approved`.
- Every company defaults each external gate to disabled.
- Company policy can opt into `email_send` only for the `estimate_send` workflow in `human_confirmed` mode.
- `POST /api/agent-action-proposals/execute-estimate-send` reuses the normal estimate email workflow after generated proposal audit, send-ready audit, company opt-in, email provider configuration, and explicit human confirmations.
- Email execution writes `agent.proposal.email_sent`, `agent.os.external.email_send.executed`, and estimate send audit events.
- Build 8A adds locked communication provider readiness and outbound approval queue evidence for broader email/SMS workflows. It records consent source, opt-out, do-not-contact, template review, delivery-history readiness, idempotency, audit, rollback, and provider-readiness checks, but the new execution route is hard-denied and does not send email/SMS or store provider secrets.
- Build 8B adds locked suppression evidence and delivery-attempt contracts for broader email/SMS workflows. It records suppression reasons, delivery-attempt failure classes, idempotency, audit, rollback, and provider-readiness references, but it still does not prepare provider requests, call unsubscribe endpoints, send email/SMS, store raw provider responses, or store provider secrets.
- Build 8C exposes the locked readiness packet inside the Communications screen and lets office users record selected-record suppression evidence. The UI still does not prepare provider requests, call unsubscribe endpoints, send email/SMS, store raw provider responses, or store provider secrets.
- SMS, payment collection, customer portal writes, scheduling mutation, bid submission, and integration writes remain planned only until their adapters and tests are built.

## Approved Boundary Packet

Every external gate has approval for implementation only inside this packet shape:

- approved gate id and exact action boundary
- target domain endpoint and server authorization path
- role/package/tenant gates
- normal human confirmation UI
- sandbox or test-recipient strategy
- idempotency key and retry behavior
- audit event name and redacted audit payload
- rollback or compensating action
- negative tests for field users and wrong-package users
- production status: local only, preview/demo, staging, or production
- live execution status: disabled until configured

## Gate Plans

### Email Sending

- Gate id: `email_send`
- Approved boundary: reviewed draft handed to the normal email workflow after explicit human confirmation, recipient verification, suppression/opt-out checks, provider configuration, and a test-recipient or sandbox strategy.
- Still blocked: arbitrary Agent-composed email and background auto-send.
- Current workflow: human-confirmed estimate email send only, after `agent.proposal.send_ready_for_human`.
- Required tests: server authorization, tenant scoping, recipient verification, idempotency, audit event, negative field-role test.
- Rollback: disable the gate, stop worker execution, and continue using manual send workflow.

### SMS Sending

- Gate id: `sms_send`
- Approved boundary: reviewed SMS sent only after explicit human confirmation, verified consent source, sender number configuration, opt-out enforcement, and a test-recipient strategy.
- Still blocked: arbitrary auto-texting or SMS without consent/opt-out enforcement.
- Required tests: consent enforcement, server authorization, tenant scoping, idempotency, audit event, negative field-role test.
- Rollback: disable SMS gate, keep manual contact workflow, and preserve opt-out state.

### Payment Collection

- Gate id: `payment_collection`
- Approved boundary: reviewed payment collection step after explicit human confirmation, server-read amount integrity, sandbox strategy, provider/KYC configuration, and reconciliation path.
- Still blocked: autonomous charge, capture, mark-paid, refund, or accounting mutation.
- Required tests: sandbox-only payment test, server authorization, amount integrity, idempotency, audit event, negative role test.
- Rollback: disable collection gate and continue manual invoice/payment handling.

### Customer Portal Writes

- Gate id: `customer_portal_action`
- Approved boundary: customer portal write only after preview, explicit human confirmation, tenant-scoped target validation, customer-visible diff review, and audit copy.
- Still blocked: hidden portal publish, approval, customer notification, or token lifecycle change.
- Required tests: preview before write, server authorization, tenant scoping, audit event, rollback or compensating action, negative role test.
- Rollback: disable portal-write gate and manually correct customer-visible content.

### Scheduling Mutation

- Gate id: `scheduling`
- Approved boundary: schedule change only after server-side conflict detection, explicit human confirmation, current schedule re-read, crew/customer notification policy review, and audit capture.
- Still blocked: automatic crew assignment, customer notification, or field visibility change.
- Required tests: conflict detection, server authorization, tenant scoping, idempotency, audit event, negative field-role test.
- Rollback: disable schedule gate and restore previous schedule fields from audit/history.

### Bid Submission

- Gate id: `bid_submission`
- Approved boundary: bid submission only after destination verification, pre-submit packet preview, explicit human confirmation, deadline review, and audit capture.
- Still blocked: browser automation bypasses, credential storage, CAPTCHA/MFA handling, blind portal submission, or unreviewed packet changes.
- Required tests: preview packet test, server authorization, destination verification, idempotency, audit event, negative role test.
- Rollback: disable submission gate and document manual withdrawal/correction path for the destination.

### Integration Writes

- Gate id: `integration_write`
- Approved boundary: integration write only after sandbox/test account verification, explicit human confirmation, tenant-scoped field mapping, retry/idempotency controls, and reconciliation view.
- Still blocked: hidden live sync, credential changes, or provider writes without per-company opt-in.
- Required tests: sandbox integration test, server authorization, tenant scoping, idempotency, audit event, negative role test.
- Rollback: disable integration write gate and use provider-specific rollback or manual reconciliation.

## Execution Non-Approval

This approval does not unlock live execution. The next implementation may expose decision packets and human-confirmed gate surfaces, but every live external action remains disabled until the matching adapter/domain workflow, company opt-in, test strategy, idempotency, audit, rollback, role/package, and tenant checks are implemented and verified.

## Implementation Order

1. Email send: implemented for human-confirmed estimate email only.
2. Scheduling mutation: next adapter should add conflict checks, schedule restore audit, and notification policy review.
3. Customer portal action: next adapter should add preview/diff, token lifecycle rules, and compensating correction path.
4. Integration write: next adapter should add provider sandbox, field map, retry/idempotency, and reconciliation.
5. SMS send: next adapter should add consent source, opt-out enforcement, sender configuration, and test recipient.
6. Payment collection: next adapter should add sandbox provider, amount integrity, KYC/provider status, and reconciliation.
7. Bid submission: final adapter should be destination-specific and must not use credential/CAPTCHA/MFA bypass automation.
