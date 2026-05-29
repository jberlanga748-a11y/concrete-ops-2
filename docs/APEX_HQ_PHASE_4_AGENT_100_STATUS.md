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

Completed after the original Phase 4 exit:

- Local Agent browser smoke.
  - Admin `/ai-office` smoke confirmed Agent/Assistant policy, Assistant Action Queue handoff, review-first copy, locked autonomous actions, queue filters, copy-only draft rows, and no visible unsafe action buttons.
  - Employee `/ai-office` smoke redirects away from AI Office and exposes no Assistant action queue or approval controls.
- Richer draft payload previews.
  - Agent draft prep now shows current/proposed field-level preview rows before approval.
  - Estimate draft, estimate send review, estimate-to-job handoff, lead follow-up, workflow draft prep, support handoff, and closeout billing review packets stay review-first.
  - Preview summaries are redacted again before agent proposal audit persistence.
  - Create/save/send/convert/schedule/bill actions remain behind existing human and domain workflow gates.
- More trade-specific agent drafting.
  - Agent workflow context now carries trade-specific estimate starters, proposal sections, handoff prompts, proof prompts, change-order watchouts, and closeout checks.
  - Agent proposal packets now surface trade estimate starter, proposal section, and proof prompt preview rows.
  - These stay preview-only; no line items, proposal copy, checklist changes, sends, saves, pricing, approvals, or field updates happen from the Agent packet.
- Autonomy readiness visibility.
  - Agent policy controls now derive L0-L2 autonomy readiness, knowledge-domain coverage, visible review lane count, queue item count, trade guidance readiness, audit/memory readiness, and the locked next approval gate.
  - AI Office displays the readiness summary for owner/admin review while keeping autonomous mutation explicitly locked.
- First local operator-mode command slice.
  - Assistant commands can now recognize lead-to-estimate operator intent.
  - Matched lead commands produce an L3 internal draft action plan and use the existing Agent estimate draft creation path.
  - External sends requested in the same command are retained as the next autonomy gate instead of blocking the internal draft step.
- Contractor ChatGPT ask-anything slice.
  - Assistant fallback questions now call `POST /api/agent/ask`.
  - Apex Agent can answer broad contractor questions like marketing improvement and money-leak diagnosis from permission-scoped Apex HQ context.
  - The shared advisor supports OpenAI structured JSON server-side when configured and deterministic local answers when no API key is present.
  - AI Office package/role gates, field-user denial, secret redaction, and no-mutation behavior are covered by focused tests.
- Agent OS v1 foundation slice.
  - Shared registry defines exactly which internal actions Apex Agent can prepare, required inputs, touched module, role/package gate labels, audit event, rollback behavior, idempotency fields, and external gate status.
  - Safe internal task types now cover lead follow-up draft, estimate packet draft, change order draft, invoice/payment prep, material list prep, and job costing review.
  - Per-workflow autonomy settings are normalized as draft-only, approval-required, or locked while external/customer-contact actions stay locked.
  - Server endpoints expose the Agent OS summary and persist task/run queue records, run statuses, retries, dead-letter state, cancellation/kill-switch shape, and run logs through existing audit events.
  - Learning signal coverage includes accepted edits, rejected drafts, won/lost estimates, closeout outcomes, follow-up outcomes, and contractor preferences with company scoping and redaction requirements.
- Owner/admin Agent OS visibility slice.
  - AI Office now renders per-workflow Agent OS autonomy rows so internal draft/prep workflows can be set to draft-only, approval-required, or locked.
  - True external gates stay visibly locked in the same policy surface.
  - AI Office now shows a read-only Agent OS run ledger derived from audit-backed task/run events.
- Agent OS internal execution slice.
  - Queued internal draft/prep runs can now execute into review-first agent proposal packets while appending audit-backed run/proposal records.
  - The execution path covers lead follow-up draft, estimate packet draft, change order draft, invoice/payment prep, material list prep, and job costing review.
  - It does not send, submit, charge, schedule, convert, update field visibility, write integrations, mutate normal domain records, or touch production config/data.
- Agent OS admin controls slice.
  - AI Office now lets owner/admin users queue safe internal Agent OS draft/prep tasks, execute them into human-review packets, retry failed/dead-lettered runs, cancel runs, and dead-letter runs for manual review.
  - Manual `succeeded` status changes are blocked; successful completion must come from the safe internal execute endpoint.
- Agent OS operational polish slice.
  - Run rows now expose detail visibility for target, output, blocked actions, safety boundary, attempts, and recent logs.
  - AI Office Agent OS console now includes action filters, selected run details, learning review rows, production gate evidence rows, and an explicit `aiOffice.canView` render gate.
  - Visible Apex Agent recommendations can queue matching safe internal Agent OS tasks when the recommendation maps to a visible lead, estimate, or job target.
  - Premium AI Office access now reaches Agent OS controls without requiring Elite Opportunity Scout access; Scout-specific controls stay package-gated.
  - `docs/APEX_AGENT_WORKTREE_REVIEW_MAP.md` separates Agent OS review scope from route decomposition and estimate/proposal packet work.
- External gate/operator planning slice.
  - `docs/APEX_AGENT_EXTERNAL_GATE_APPROVAL_PLAN.md` records the approval packet required for email, SMS, payment, portal, scheduling, bid submission, and integration gates.
  - `docs/APEX_AGENT_EMAIL_SEND_GATE_DECISION_PACKET.md` records the first candidate email-send boundary for future review while keeping email sending locked.
  - `docs/APEX_AGENT_PRODUCTION_OPERATOR_GATE.md` records the L3+ production-safe operator checklist and keeps L5 autonomous external action unapproved.
- Agent OS exit-item slice.
  - Selected contractor advisor recommendations can queue existing safe internal Agent OS task/run records through `POST /api/agent/os/advisor-tasks` when the recommendation id is supported and the target is visible in the current company scope.
  - The advisor queue endpoint is role/package gated, rejects unsupported/external recommendations, and remains internal draft/prep only.
  - Hosted Agent smoke tooling now covers `/ai-office` route checks and an optional GET-only Agent OS API flow for admin access plus employee denial.
  - `npm.cmd run verify:agent-os-console` now runs a local-only temp-demo Playwright smoke: admin sees Agent OS console controls, employee does not, employee API access is denied, and this check appears in the Agent Leads production evidence gate.
  - The worktree review map now separates Agent foundation, UI/access, contractor advisor queueing, smoke/docs, route decomposition, and Estimate/Proposal Professional Packet work.

Agent OS v1 local/review-first completion status:

- Complete for the current review-first product boundary: one product-facing Apex Agent, durable Agent OS registry/run/task/audit/learning/operator console surfaces, internal draft/prep execution, local console smoke, and production evidence requirements.
- `docs/APEX_AGENT_OS_V1_RELEASE_PACKET.md` is the final local release packet for this boundary, and `npm.cmd run verify:agent-os` is the focused preservation command.
- External/customer-contact actions remain locked unless a normal domain gate, per-company opt-in, explicit human confirmation, idempotency, audit, rollback, role/package, tenant checks, and verification evidence are present.

Still remaining outside Agent OS v1:

1. Production-safe autonomous operator execution gate implementation.
   - Separate approval required for customer sends, bid submissions, schedule mutations, invoices, payments, or production data mutation.

2. Live hosted Agent auth smoke with real demo credentials.
   - The script is ready, but auth smoke requires explicit demo smoke credentials in `APEX_SMOKE_PASSWORD`.
   - Production auth smoke remains blocked unless `--allow-production-auth` is explicitly provided for an approved production target.

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
