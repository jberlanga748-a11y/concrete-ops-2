# Apex HQ Agent Action Proposal Audit Plan

Status: planning only. Do not implement persistence, API writes, schema changes, or production behavior from this document without a separate production-safety review.

## Goal

Give Apex HQ a safe audit trail for assistant-generated action proposals before the assistant is allowed to prepare or execute broader workflow drafts. The audit layer should prove what the assistant suggested, what it refused, what the user reviewed, and which human-approved action created a draft.

This is not an autonomous execution system. It is a review-first accountability layer.

## Current Repo Findings

- The UI now builds review-first `Agent Action Proposal` packets in `src/agent-action-proposal-utils.js`.
- The assistant card in `src/App.jsx` can show blocked actions, required approval checks, and draft-only prep details.
- Existing server audit infrastructure already exists through `state.auditEvents`, `appendAuditEvent(...)`, SQLite `audit_events`, and bootstrap visibility filtering in `server/index.js` and `server/store.js`.
- Existing audit events are scoped by company and filtered for visible records before bootstrap.
- There is no durable server record yet for assistant proposal text, proposed action type, prompt source, draft-prep fields, refusal category, or approval state.
- There is no server-side proposal approval API yet.

## Safety Rules

- Field users must not see office/admin proposal controls unless the existing role/package gates allow that workflow.
- Assistant proposals must never bypass package gates, route gates, tenant scoping, or server-side permission checks.
- Server persistence must redact secrets, credentials, cookies, bearer tokens, MFA codes, CAPTCHA text, and private portal content before storage.
- No proposal may send email/text, contact customers, submit bids, change pricing, convert records, create invoices, or mutate production workflow records without a separate explicit human approval action.
- Audit records must be append-only from the UI perspective. Users may dismiss UI cards, but the audit history should retain proposal and approval decisions once persisted.

## Proposed Event Model

Use the existing `auditEvents` table first if the payload can fit safely. Add a dedicated table only if the event shape becomes too large or query-heavy.

Recommended event types:

- `agent.proposal.generated`
- `agent.proposal.blocked`
- `agent.proposal.reviewed`
- `agent.proposal.approved_for_draft`
- `agent.proposal.draft_created`
- `agent.proposal.dismissed`
- `agent.proposal.rejected`

Recommended fields:

- `companyId`
- `actorUserId`
- `actorRole`
- `sourceRoute`
- `sourceModule`
- `proposalId`
- `proposalType`
- `riskLevel`
- `status`
- `summary`
- `redactedPromptPreview`
- `redactedResponsePreview`
- `requiredApprovals`
- `blockedReasons`
- `draftPrepSummary`
- `targetEntityType`
- `targetEntityId`
- `createdDraftEntityType`
- `createdDraftEntityId`
- `createdAt`

Do not store raw model prompts or raw pasted customer/private content unless a separate redaction and retention policy is approved.

## Server API Shape

Phase 1 should be read/write audit only, not workflow mutation:

- `POST /api/agent-action-proposals/audit`
  - Stores a generated, blocked, dismissed, or rejected proposal event.
  - Requires authenticated owner/admin/estimator-level access for office workflows.
  - Accepts only normalized proposal metadata, not raw secrets.

- `GET /api/agent-action-proposals/audit?entityType=&entityId=`
  - Returns visible proposal audit history for a route/entity.
  - Uses existing tenant and role filtering.

Phase 2 can add draft approval endpoints only after Phase 1 is verified:

- `POST /api/agent-action-proposals/:id/approve-draft`
  - Records human approval to create a draft.
  - Does not create the workflow record unless the existing domain endpoint also authorizes it.

## UI Flow

1. Assistant generates a local proposal packet.
2. UI renders review requirements and draft-only prep.
3. If audit persistence is enabled, UI records a redacted `generated` or `blocked` event.
4. User reviews the packet.
5. User can dismiss, reject, or approve for draft.
6. A domain-specific draft action remains separate and goes through existing API permission checks.
7. UI displays audit history on the relevant route only if the user can view that workflow.

## Permission Boundaries

- Owner/admin: can view and manage office assistant proposals.
- Estimator: can view/manage estimate and lead proposal drafts if current roles support that level.
- Foreman/employee: blocked from pricing, estimate, package, Opportunity Scout, and office/admin proposal controls unless a specific field-safe assistant workflow is added later.
- Support/admin-sensitive workflows: planning only until support impersonation and access boundaries are reviewed separately.

## Redaction Requirements

Reject or redact before persistence:

- passwords
- API keys
- bearer/session tokens
- cookies
- MFA/CAPTCHA codes
- private portal instructions
- payment card/banking data
- Social Security numbers
- unapproved customer contact instructions
- bid submission instructions

The same unsafe payload classes already tested for Opportunity Scout should be reused for agent proposal audit tests.

## Verification Plan

Before implementation:

- Review current `auditEvents` payload size and SQLite migration behavior.
- Confirm role/package selectors for assistant, estimates, leads, jobs, support, and Opportunity Scout.
- Define retention expectations for pilot data.

For implementation:

- `npm.cmd run build`
- `npm.cmd run verify:roles`
- `npm.cmd run verify:leads` when lead or Opportunity Scout proposals are touched
- targeted server tests for audit event creation and tenant filtering
- targeted frontend utility tests for proposal redaction/normalization
- browser smoke for admin seeing audit history
- employee browser/API smoke proving field users are blocked
- `git diff --check`

Hosted demo verification:

- backup-first Fly demo deploy only
- `/api/ready`
- hosted skip-auth smoke
- hosted auth smoke when the demo auth secret is available
- browser smoke for one generated proposal, one blocked proposal, and employee denial

## Implementation Phases

1. Planning only: this document.
2. Utility hardening: shared redaction and proposal event normalization tests, no server writes.
3. Server audit event endpoint: append-only proposal audit using existing `auditEvents` if safe.
4. UI audit history: read-only timeline on the assistant card or AI Office page.
5. Approval-for-draft endpoint: only records approval; domain draft creation remains a separate existing endpoint.
6. Workflow-specific draft helpers: estimate draft, lead follow-up, job handoff, proof review, support intake.

## GO / NO-GO

GO for planning and utility-only test work.

NO-GO for schema changes, persistent audit endpoints, approval APIs, or workflow draft creation until a Phase 1 safety report confirms:

- exact data persisted
- redaction behavior
- tenant filtering
- role/package gates
- backup and rollback path
- hosted demo smoke plan
