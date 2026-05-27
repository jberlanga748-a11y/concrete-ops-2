# Apex Agent Autonomy Readiness

Status: local implementation guide for the one Apex Agent.

This is not approval for production deploys, customer sends, bid submissions, schedule changes, crew changes, invoices, payments, package or role changes, or production data mutation.

## Autonomy Levels

| Level | Current Meaning | Status |
| --- | --- | --- |
| L0 off | Agent review surfaces are paused by contractor policy. | Built |
| L1 review-first | Apex Agent ranks visible work, explains context, and routes humans into existing workflows. | Built |
| L2 draft assist | Apex Agent prepares internal draft packets after review gates. No sends or mutations. | Built |
| L3 approved domain actions | A contractor command may call an existing internal domain action with server authorization and audit events. | Started locally |
| L4 limited internal autonomy | Apex Agent may execute low-risk internal maintenance without customer contact or record mutation. | Not approved |
| L5 external or production autonomy | Customer contact, bid submission, scheduling, billing, role/package changes, deploys, or production data mutation. | Locked |

## Operator North Star

Apex Agent is intended to become an operator, not just a reviewer. The target workflow is:

1. Contractor tells Apex Agent what to do.
2. Apex Agent turns the command into a structured action plan.
3. Apex Agent executes the approved internal step through existing Apex HQ permissions.
4. Apex Agent learns from the contractor's edits and outcomes.
5. Contractor enables workflow-specific autonomy for sends, follow-ups, billing, scheduling, or payments only after those gates exist.

The first local operator slice is lead-to-estimate internal drafting:

- "Turn this lead into an estimate" resolves to an L3 internal draft action.
- A matched lead can create a draft estimate through the existing Agent estimate draft endpoint.
- If the contractor also asks to send/email the estimate, Apex Agent still executes only the internal draft step and records customer send as the next autonomy gate.

The next local knowledge slice is contractor ChatGPT:

- Broad questions that are not deterministic workflow commands route to `POST /api/agent/ask`.
- Apex Agent builds a compact, permission-scoped contractor advisor context from leads, lead sources, estimates, jobs, daily reports, uploads, time entries, change orders, delivery tickets, checklists, workflow context, next actions, and daily brief signals.
- Questions like "How do we market better?" classify into a marketing readout with lead source, open lead, sent estimate, and follow-up actions.
- Questions like "Where am I losing money?" classify into a profit leak readout with change order, proof, time, estimate, and billing-readiness actions.
- The endpoint is read-only and does not persist conversations, send messages, collect payments, schedule crews, approve records, or mutate production data.

## Knowledge Domains

The Agent must prove these before any higher autonomy:

- permission-scoped workspace context
- trade guidance and proof prompts
- review packet and audit history
- approved contractor memory
- contractor advisor context and broad business question classification
- existing workflow routing
- field-role denial
- locked external action policy
- production safety gate awareness

The local AI Office now exposes an autonomy readiness summary so owner/admin users can see which knowledge domains are ready and which actions remain locked. It also renders Agent OS workflow-policy rows and a read-only audit-backed run ledger for queued internal draft/prep work.

## Per-Workflow Autonomy Policy

Agent OS v1 adds contractor-scoped workflow settings to the existing Apex Agent automation policy:

- `draft_only`: Apex Agent may prepare an internal draft/review packet, but cannot execute a record mutation.
- `approval_required`: Apex Agent may call an approved internal domain action only after human approval and server authorization.
- `locked`: Apex Agent may not prepare or execute that workflow action.

Current internal workflows:

- lead follow-up draft
- estimate packet draft
- change order draft
- invoice/payment prep
- material list prep
- job costing review

Current external workflows are locked regardless of selected mode:

- email send
- SMS send
- payment collection
- customer portal action
- scheduling
- bid submission
- integration write

Unlocking any external workflow still requires explicit approval of the exact boundary, test recipient or sandbox strategy, idempotency behavior, audit event, rollback path, and normal domain workflow.

The exact approval checklist is recorded in `docs/APEX_AGENT_EXTERNAL_GATE_APPROVAL_PLAN.md`. The production operator checklist is recorded in `docs/APEX_AGENT_PRODUCTION_OPERATOR_GATE.md`.

## Hard Gate

The current GO lane is autonomous prep only.

The current NO-GO lane is autonomous mutation. Before any L3-L5 work, create a Phase 1 safety report and get explicit approval for the exact boundary. That report must name the target domain action, server authorization path, audit event, idempotency behavior, negative role tests, rollback path, and production status.

## Next Safe Slices

1. Add deeper copy-only draft previews by workflow type.
2. Expand read-only Agent context coverage where a module is already role-safe.
3. Add approval packet tests for any candidate L3 domain action before implementation.
4. Keep browser smoke proving admin visibility and employee denial.

Do not build auto-send, bid submission, billing, schedule mutation, or production mutation as part of these safe slices.
