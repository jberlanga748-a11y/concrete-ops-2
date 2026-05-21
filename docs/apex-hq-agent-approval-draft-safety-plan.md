# Apex HQ Agent Approval For Draft Safety Plan

Status: Phase 1 safety plan only. Do not implement approval endpoints, draft creation, workflow mutation, schema changes, production deploys, or customer-facing automation from this document without a separate approved implementation pass.

## Objective

Define the next safe boundary after manual agent proposal audit recording. Apex Assistant may suggest review-first packets and the user may manually record those packets to the audit trail, but the assistant still must not create drafts, approve actions, send messages, submit bids, convert records, schedule crews, update field records, or mutate customer data.

The next candidate capability is "approve for draft prep", meaning a human can explicitly approve a recorded proposal to prepare a draft payload for an existing workflow. That approval must remain separate from the domain action that saves or sends anything.

## Repository Findings

- Current branch: `main`.
- Current agent proposal commits:
  - `5f5275d` manual proposal audit recording in Apex Assistant.
  - `6d52506` read-only proposal audit history in Apex Assistant.
  - `53c12a0` append-only agent proposal audit endpoint.
- Current persistent endpoint:
  - `POST /api/agent-action-proposals/audit`
  - Location: `server/index.js`
  - Tests: `server/agent-action-proposals.test.js`
- Current frontend proposal/audit utilities:
  - `src/agent-action-proposal-utils.js`
  - `src/agent-action-proposal-utils.test.js`
- Current UI surface:
  - `src/App.jsx` `ApexAssistantShell`
  - Explicit `Record audit` button only.
  - Read-only proposal audit history.
- Current API client:
  - `src/api.js` `recordAgentActionProposalAudit(...)`
- Current role/package enforcement:
  - Shared role predicates in `shared/permissions.js`.
  - Bootstrap permissions in `server/index.js`.
  - Agent audit creation currently requires AI Office entitlement and office lead visibility through `assertCanCreateAgentProposalAudit(...)`.
- Current server event types are limited to:
  - `agent.proposal.generated`
  - `agent.proposal.blocked`
  - `agent.proposal.dismissed`
  - `agent.proposal.rejected`
- Existing docs already reserve future event types:
  - `agent.proposal.reviewed`
  - `agent.proposal.approved_for_draft`
  - `agent.proposal.draft_created`

## Existing Domain Mutation Endpoints

Any future agent draft flow must route through these existing domain permissions instead of inventing privileged agent permissions:

| Workflow | Existing client call | Existing domain gate to preserve |
| --- | --- | --- |
| Lead draft/create | `createLead(...)`, `updateLead(...)`, `convertLead(...)`, `convertLeadToCustomer(...)` | `canManageLeads` and lead/company scoping |
| Opportunity Scout lead conversion | `convertFoundOpportunityToLead(...)` | Opportunity Scout package gate, lead manage gate, human review status |
| Estimate draft/create | `createEstimate(...)`, `updateEstimate(...)` | `canManageEstimates`, estimate package gates where applicable |
| Estimate send | `sendEstimate(...)` | Must remain manual; agent approval must not send |
| Estimate to job | `convertEstimateToJob(...)` | `canManageEstimates`, `canCreateJobs`, approved estimate readiness |
| Job draft import | `importJobDraftPackage(...)`, `createJobFromImportedDraft(...)` | Job draft import package gate and `canCreateJobs` |
| Job setup | `createJob(...)`, `updateJob(...)` | `canCreateJobs`, job visibility, company scoping |
| Reports/proof | `createDailyReport(...)`, `reviewDailyReport(...)`, `createUpload(...)` | Report/upload role gates and job visibility |
| Support/contact notes | `createContactHistory(...)`, support copy helpers | Contact history/support gates; no outbound send |

## Proposed Safe Architecture

### Phase 2A: Approval Audit Only

Add a server-side event path for `agent.proposal.approved_for_draft` that records a human approval decision, but does not create a draft.

Minimum behavior:

- Requires auth.
- Requires same company scope as the current session.
- Requires AI Office entitlement.
- Requires office role with the domain permission needed by the proposal type.
- Requires an existing prior `agent.proposal.generated` audit event for the same `proposalId`.
- Rejects field-only users.
- Rejects package-blocked or blocked proposal statuses.
- Stores redacted metadata only.
- Writes to existing `audit_events` append-only history.
- Returns only the approval audit event.
- Does not call any domain create/update/convert/send endpoint.

### Phase 2B: Client Draft Payload Preview

After approval-audit-only is verified, the UI can show a copyable or prefilled draft payload preview. It should be generated from the already-visible proposal packet and existing visible record data.

Minimum behavior:

- The preview is not saved automatically.
- The user must still click the normal existing workflow save/create button.
- Existing domain forms and API endpoints remain the source of truth.
- Field users do not see office/pricing/proposal draft previews.
- Sensitive values stay redacted before display or persistence.

### Phase 2C: Domain Draft Creation

Only after a separate implementation review, add workflow-specific draft helpers. Each helper must call the normal domain endpoint with the same permission checks as a manual user action.

Allowed candidates later:

- Estimate draft from a lead/customer.
- Lead follow-up contact-history draft, copy-only or internal note only.
- Job handoff draft only after approved estimate readiness checks.
- Support handoff internal note draft.

Still blocked:

- Sending proposals or customer messages.
- Submitting bids.
- Approving estimates/change orders/reports.
- Converting estimates to jobs without the normal domain endpoint and explicit user click.
- Creating invoices, payments, package changes, or billing actions.
- Crew scheduling or assignment from the assistant.
- Any production data mutation without the normal app action and permission gate.

## Role And Package Matrix

| User type | Can view proposal packets | Can record proposal audit | Can approve for draft in future | Notes |
| --- | --- | --- | --- | --- |
| Owner | Yes when package allows AI Office | Yes | Candidate, domain-permission dependent | Must still use normal save/create/send controls |
| Administrator | Yes when package allows AI Office | Yes | Candidate, domain-permission dependent | No production/deploy/customer-data shortcut |
| Estimator | Yes for estimate/lead surfaces where current roles allow | Candidate if package and domain gates allow | Candidate for estimate/lead drafts only | Must not gain settings, billing, jobs, or support privileges |
| Foreman | Field-safe assistant only | No for office proposals | No | Keep blocked from pricing, estimates, leads, package controls |
| Employee | Field-safe assistant only | No | No | Employee API writes must remain 403 |

Package gates:

- Basic: locked or limited assistant surfaces only.
- Premium: current AI Office/proposal review surfaces where enabled.
- Elite: Opportunity Scout and higher automation surfaces where enabled.
- Future approval-for-draft must never weaken package gates globally.

## Risk Matrix

| Risk Surface | Level | Why It Matters | Mitigation |
| :--- | :--- | :--- | :--- |
| Auth/session | Medium | Approval records would become durable user actions | Require auth, current bearer session, existing request user |
| Roles/permissions | High | Draft approval can look like workflow permission | Check proposal type against domain permission before approval |
| Tenant/company data | High | Agent proposals may refer to leads, estimates, jobs, or customers | Require existing visible target entity and current company scoping |
| Database/migration | Low for Phase 2A, Medium later | Existing audit table can carry approval audit; dedicated table may be needed later | Use `audit_events` first; no schema in first approval audit slice |
| Production/deploy | Medium | Demo can prove safely; production needs backup-first approval | Demo-only deploy after backup; production locked |
| Performance | Low | One append-only audit write per explicit user action | No auto-write loops; duplicate/idempotency guard by proposal ID |
| UX/mobile | Medium | Buttons could imply the assistant is taking action | Label as "Approve draft prep" only; show "No record was changed" copy |
| AI auto-action | High | Biggest risk is crossing from draft prep into mutation | Phase-gate approval audit, preview, and domain creation separately |

## Required Server Checks Before Implementation

- Add event types only as needed:
  - `agent.proposal.approved_for_draft`
  - maybe `agent.proposal.reviewed`
- Implement or reuse a helper that maps proposal type to required domain gate:
  - `estimate-draft-review` -> `canManageEstimates(user)`.
  - `estimate-packet-review` -> `canViewEstimates(user)` plus GC packet package gate if packet-specific.
  - `estimate-job-handoff-review` -> `canManageEstimates(user)` and `canCreateJobs(user)`.
  - `lead-follow-up` -> `canManageLeads(user)`.
  - `support-workflow-review` -> support entitlement and role gates.
  - proof/report/upload/time/safety/checklist review -> matching domain gates.
- Reject blocked/package-blocked proposals.
- Reject missing prior generated audit event.
- Reject client-provided `companyId`, `actorUserId`, `actorRole`, or approval timestamp as authority.
- Redact all summaries/previews again server-side.
- Persist append-only audit event only.

## Required Client Checks Before Implementation

- Do not show approval controls to field-only users.
- Do not show approval controls for blocked/package-blocked proposals.
- Do not show approval controls before `Record audit` succeeded.
- Use separate button copy:
  - "Approve draft prep"
  - Never "Approve", "Create", "Send", or "Convert" by itself.
- After approval audit, display:
  - "Draft prep approved. No Apex HQ record was changed."
- Keep domain creation in normal workflow screens.

## Test Plan For Future Implementation

Server:

- Owner/admin can record `agent.proposal.approved_for_draft` only after a generated event.
- Estimator can approve only estimate/lead draft prep where current role permissions allow.
- Employee/foreman get 403.
- Basic/package-blocked workspace gets 403.
- Cross-company proposal ID or target entity gets 404/403.
- Missing prior generated event gets 409.
- Approval false or non-review-first payload gets 400.
- Secret/token/customer-contact/bid instructions are redacted or rejected.
- Approval audit does not create leads, estimates, jobs, contact history, reports, uploads, invoices, or sends.

Frontend:

- Approval button hidden/disabled until audit record exists.
- Approval button hidden for blocked/package-locked proposals.
- Success state says no record changed.
- Proposal history shows generated and approved-for-draft events as read-only.
- Field mobile view does not expose approval controls.

Verification commands:

```powershell
node --test --test-concurrency=1 server/agent-action-proposals.test.js
node --test --test-concurrency=1 src/agent-action-proposal-utils.test.js src/apex-assistant-shell-utils.test.js
npm.cmd run verify:roles
npm.cmd run verify:leads
npm.cmd run verify:estimates
npm.cmd run build
git diff --check
```

Hosted demo verification:

```powershell
fly machine exec 784192dc275318 -a concrete-ops-demo --timeout 120 "sh -lc 'cd /app && node server/backup-export.js'"
fly deploy --config fly.demo.toml --app concrete-ops-demo
Invoke-RestMethod https://concrete-ops-demo.fly.dev/api/ready
npm.cmd run smoke:hosted -- --base-url=https://concrete-ops-demo.fly.dev --skip-auth --json
npm.cmd run smoke:hosted -- --base-url=https://concrete-ops-demo.fly.dev --allow-auth --json
```

## GO / NO-GO

GO:

- Planning and test design.
- A future Phase 2A endpoint that records approval-for-draft audit only.
- No schema change if existing `audit_events` remains sufficient.
- Demo-only hosted smoke after backup.

NO-GO:

- Any endpoint that creates, updates, converts, sends, approves, schedules, invoices, or contacts.
- Any automatic assistant approval.
- Any client-only permission decision.
- Any field-user access to office/pricing/proposal approval controls.
- Any production deploy without backup-first production approval.

## Recommended Next Slice

Implement Phase 2A only:

1. Extend allowed audit event types to include `agent.proposal.approved_for_draft`.
2. Add server validation that prior generated event exists for `proposalId`.
3. Add server proposal-type-to-domain-permission guard.
4. Add tests proving owner/admin allowed, field users blocked, package gates enforced, and no domain records are created.
5. Add a UI button only after manual audit recording exists.
6. Keep all domain draft creation out of scope.
