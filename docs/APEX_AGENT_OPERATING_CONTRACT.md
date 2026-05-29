# Apex Agent Operating Contract

Status: active local contract for the one Apex Agent. This does not approve production deploys, customer sends, bid submissions, billing actions, schedule mutations, role/package changes, or production data changes.

## Product Boundary

Apex HQ has one product-facing Apex Agent.

The Apex Agent may:

- inspect visible, permission-scoped app context
- answer broad contractor operator questions from safe Apex HQ context
- rank next best actions
- prepare review-first workflow packets
- prepare trade-aware draft guidance
- record redacted proposal/audit events where current role/package gates allow it
- route a reviewed user into the normal Apex HQ workflow
- execute internal draft actions through existing Apex HQ domain permissions when the contractor gives a direct command and the target record is matched

The Apex Agent must not:

- send email, SMS, calls, notifications, bids, or proposals automatically
- approve estimates, reports, change orders, safety items, payments, invoices, jobs, or packages
- create or mutate workflow records without the existing domain endpoint and explicit human approval
- bypass role, package, tenant, field-user, or audit gates
- touch production data, deploy, change secrets, or alter Fly/Supabase config

## Current Surface Map

- Assistant shell: `src/apex-assistant-shell-components.jsx`
- Assistant command resolver: `src/apex-assistant-shell-utils.js`
- AI Office command center: `src/ai-office-utils.js`
- Action proposal packets, review queue, inbox, audit normalization: `src/agent-action-proposal-utils.js`
- App-scoped assistant derived state: `src/workspace-assistant-state.js`
- Workflow context and next action drafting: `src/agent-workflow-context-utils.js`
- Shared server/context equivalent: `shared/agentWorkflowContext.js`
- Agent policy gates: `shared/agentActionPolicy.js`
- Agent OS action registry, run/task model, learning signals, and external gates: `shared/agentOperatingSystem.js`
- Contractor automation policy controls: `shared/apexAgentAutomationPolicy.js`
- Agent OS v1 release packet: `docs/APEX_AGENT_OS_V1_RELEASE_PACKET.md`
- Agent OS v1 preservation checklist: `docs/APEX_AGENT_OS_V1_PRESERVATION_CHECKLIST.md`
- Agent OS v1 release notes: `docs/APEX_AGENT_OS_V1_RELEASE_NOTES.md`
- Server audit and draft approval tests: `server/agent-action-proposals.test.js`
- Contractor advisor brain and ask endpoint: `shared/contractorAdvisorAi.js`, `POST /api/agent/ask`
- Agent OS summary/task/run endpoints: `GET /api/agent/os`, `POST /api/agent/os/tasks`, `POST /api/agent/os/runs/:id/status`
- Contractor advisor to Agent OS queue endpoint: `POST /api/agent/os/advisor-tasks`
- Agent OS internal execution endpoint: `POST /api/agent/os/runs/:id/execute`
- Hosted Agent smoke: `npm.cmd run smoke:hosted-agent -- --base-url=<demo-url> --allow-auth --json` when explicit demo smoke credentials are available
- External gate approval plan: `docs/APEX_AGENT_EXTERNAL_GATE_APPROVAL_PLAN.md`
- First candidate external gate decision packet: `docs/APEX_AGENT_EMAIL_SEND_GATE_DECISION_PACKET.md`
- Agent worktree review map: `docs/APEX_AGENT_WORKTREE_REVIEW_MAP.md`
- Production operator gate: `docs/APEX_AGENT_PRODUCTION_OPERATOR_GATE.md`

## Completed Local Slice

The first useful Apex Agent workflow is not a new standalone agent. It is the existing review-first Agent pipeline:

1. Permission-scoped context becomes next-action and workflow packet candidates.
2. The Assistant/AI Office wraps them as review-first proposals.
3. The proposal packet shows blocked actions, checklist review, context proof, and draft prep.
4. Human approval remains separate from any domain action.
5. Domain actions continue through the normal Apex HQ workflows and server permissions.

The newest slice adds richer trade-aware drafting to the review packet. When a visible workflow has a trade summary, Apex Agent packets can now carry:

- trade-specific estimate starter categories
- proposal section prompts
- handoff checklist prompts
- proof photo prompts
- change-order watchouts
- closeout checks

These prompts are preview-only. They do not save line items, create proposal copy, update field checklists, send anything, or change records.

## Next Non-Duplicate Agent Work

Do not rebuild the audit/proposal/review-gate foundation unless a test proves it regressed.

The next useful slices are:

- autonomy readiness visibility for owner/admin users
- deeper trade-specific copy previews by workflow type
- production-safe autonomous-operator planning docs only, with separate approval gates for any customer send, bid submission, schedule mutation, invoice, payment, or production data mutation

Latest local addition:

- `docs/APEX_AGENT_AUTONOMY_READINESS.md` defines L0-L5 Agent autonomy levels.
- AI Office now derives and displays an Apex Agent autonomy readiness summary from policy, visible review lanes, queue items, trade guidance, audit/memory readiness, and field-role boundary status.
- The readiness model is deliberately locked to autonomous prep only. It never marks customer contact, bid submission, scheduling, billing, package/role changes, deploys, or production data mutation as approved.
- The Assistant command resolver now recognizes lead-to-estimate operator commands. A command such as "Turn ABC Builders lead into an estimate and send it" becomes an internal draft action plan for the matched lead while leaving the requested customer send as a later autonomy gate.
- The Assistant fallback now routes broad contractor questions through `POST /api/agent/ask`. Questions like "How do we market better?" and "Where am I losing money?" get a contractor-operator answer from role-scoped leads, estimates, jobs, proof, time, change orders, workflow context, and next actions.
- The ask endpoint is AI Office package/role gated, redacts secret-like text, uses OpenAI only server-side when configured, and falls back to deterministic local workspace signals when no `OPENAI_API_KEY` is present. It does not save conversations or mutate records.

Latest Agent OS v1 foundation:

- `shared/agentOperatingSystem.js` defines the one-Agent action registry, including required inputs, touched module, role/package gate labels, audit event name, rollback behavior, idempotency key fields, and external gate status.
- Safe internal/draft task types are registered for lead follow-up draft, estimate packet draft, change order draft, invoice/payment prep, material list prep, and job costing review.
- External/customer-contact gate boundaries are now approved for human-confirmed implementation for email, SMS, payment collection, customer portal action, scheduling, bid submission, and integration writes, but live execution remains disabled until the normal domain adapter, per-company opt-in, confirmation UI, idempotency, audit, rollback, role/package, and tenant checks are present.
- The first live external gate is implemented for `email_send` only: a company can opt into human-confirmed estimate email sends, after generated proposal audit, send-ready audit, email provider configuration, and explicit customer-contact confirmation. It reuses the normal estimate email workflow and writes Agent-specific audit events.
- Apex Agent automation policy now includes per-workflow settings: `draft_only`, `approval_required`, or `locked`. These settings do not unlock external gates.
- Agent OS task/run records have queue, running, retry, dead-letter, cancellation, kill-switch, and log shapes. Server task/run endpoints persist those records as redacted `agentOsRun` audit events rather than adding schema churn.
- Queued safe internal tasks can execute into review-first agent proposal packets through `POST /api/agent/os/runs/:id/execute`. This writes audit-backed run/proposal records only; it does not mutate normal domain records or perform external actions.
- AI Office exposes the per-workflow settings, an audit-backed Agent OS run ledger, and internal-only queue/run controls for owner/admin review.
- Run controls cover safe internal draft/prep execution, retry, cancel, and dead-letter. `succeeded` runs must come from the internal execute endpoint, not a manual status toggle.
- Run detail visibility shows target, attempts, output mode, blocked actions, safety boundary, and recent logs without exposing secrets.
- Visible Apex Agent recommendations can be queued into matching safe internal Agent OS tasks when they map to a visible lead, estimate, or job target.
- Selected contractor advisor recommendations can be queued server-side into matching safe internal Agent OS tasks. This is not a generic "do anything" bridge: only known recommendation ids map to safe internal actions, and the target must be visible in the current company scope.
- Premium AI Office access includes Agent OS controls without requiring Elite Opportunity Scout access; Opportunity Scout itself remains hidden unless entitled.
- External gates now have boundary-approved decision packets and production operator gates; they still do not execute live external actions until configured and verified through the normal domain workflow.
- Learning signal coverage now explicitly spans accepted edits, rejected drafts, won/lost estimates, closeout outcomes, follow-up outcomes, and contractor preferences. Signals are company-scoped and review-first.
- The internal action registry now covers the next contractor operations batch: warranty follow-up draft, permit checklist prep, crew handoff prep, daily report review, photo evidence review, delivery ticket review, safety incident summary, pre-pour review, and post-pour review.
- Each expanded action has explicit required inputs, module ownership, permission/package gate labels, audit event, rollback behavior, and idempotency key fields.
- The Agent OS summary now includes an operator control panel with open-run status, retry/dead-letter/cancel review rows, rollback/idempotency rows, external gate locks, and redacted company-scoped learning signal visibility.
- The AI Office console now hardens that panel with action filters, selected run details, learning review rows, production evidence rows, and an explicit `aiOffice.canView` render gate so field-style permissions cannot expose Agent OS controls.
- `npm.cmd run verify:agent-os-console` now runs local-only console smoke coverage with temp demo data: admin must see Agent OS controls, employee must not see the console, employee API access must be denied, and the production gate includes this check as release evidence.
- These additions are internal draft/review packets only. They do not complete checklists, approve reports, resolve safety incidents, assign crews, file permits, contact customers/agencies/vendors, change schedules, mutate costs, send messages, collect payment, submit bids, store credentials, deploy, or touch production data.

Latest exit-item slice:

- `POST /api/agent/os/advisor-tasks` queues a supported contractor advisor recommendation into the existing Agent OS queue/run audit model.
- Current supported advisor recommendation ids are `marketing-lead-sources`, `marketing-estimate-followup`, `estimate-draft-queue`, `money-change-orders`, `money-proof`, and `money-time`.
- The endpoint rejects unsupported/external recommendations, invisible targets, wrong target types, wrong-package users, and field users.
- Hosted Agent smoke coverage now includes `/ai-office` route checks and an optional GET-only Agent OS API flow. It does not queue tasks, execute runs, reset data, export data, send messages, or deploy.
