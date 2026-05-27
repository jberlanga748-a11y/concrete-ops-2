# Apex Agent External Gate Approval Plan

Last updated: 2026-05-27

Purpose: define the exact approval packet required before Apex Agent may perform any customer-facing, financial, scheduling, bid, portal, or integration write action.

## Current State

All external gates are locked. Apex Agent OS may prepare internal review packets, but it may not send, submit, charge, schedule, write to a customer portal, write to an integration, change production config, expose secrets, or mutate production data.

The contractor advisor to Agent OS queue endpoint is not an external gate. It only creates internal Agent OS task/run audit records for supported safe draft/prep recommendations with visible company-scoped targets.

## Required Approval Packet

Every external gate must have a written approval packet before implementation:

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

## Gate Plans

### Email Sending

- Gate id: `email_send`
- Boundary to approve: specific template, recipient class, sender identity, domain workflow, suppression behavior, and test recipient or sandbox path.
- Required tests: server authorization, tenant scoping, recipient verification, idempotency, audit event, negative field-role test.
- Rollback: disable the gate, stop worker execution, and continue using manual send workflow.

### SMS Sending

- Gate id: `sms_send`
- Boundary to approve: specific SMS template, consent source, recipient class, sender number, opt-out behavior, and test recipient.
- Required tests: consent enforcement, server authorization, tenant scoping, idempotency, audit event, negative field-role test.
- Rollback: disable SMS gate, keep manual contact workflow, and preserve opt-out state.

### Payment Collection

- Gate id: `payment_collection`
- Boundary to approve: specific invoice/payment-link provider, amount source, customer confirmation screen, sandbox payment strategy, and reconciliation path.
- Required tests: sandbox-only payment test, server authorization, amount integrity, idempotency, audit event, negative role test.
- Rollback: disable collection gate and continue manual invoice/payment handling.

### Customer Portal Writes

- Gate id: `customer_portal_action`
- Boundary to approve: specific portal action, customer-visible fields, preview/confirm UI, tenant scope, and audit copy.
- Required tests: preview before write, server authorization, tenant scoping, audit event, rollback or compensating action, negative role test.
- Rollback: disable portal-write gate and manually correct customer-visible content.

### Scheduling Mutation

- Gate id: `scheduling`
- Boundary to approve: specific schedule field, affected job state, crew visibility impact, notification policy, and conflict handling.
- Required tests: conflict detection, server authorization, tenant scoping, idempotency, audit event, negative field-role test.
- Rollback: disable schedule gate and restore previous schedule fields from audit/history.

### Bid Submission

- Gate id: `bid_submission`
- Boundary to approve: specific destination, packet contents, deadline workflow, customer/public recipient class, and pre-submit preview.
- Required tests: preview packet test, server authorization, destination verification, idempotency, audit event, negative role test.
- Rollback: disable submission gate and document manual withdrawal/correction path for the destination.

### Integration Writes

- Gate id: `integration_write`
- Boundary to approve: specific integration, object type, field map, sandbox or test account, retry/idempotency behavior, and reconciliation view.
- Required tests: sandbox integration test, server authorization, tenant scoping, idempotency, audit event, negative role test.
- Rollback: disable integration write gate and use provider-specific rollback or manual reconciliation.

## Explicit Non-Approval

This document is not approval to implement or unlock any external gate. It is the checklist that must be satisfied before asking for approval.
