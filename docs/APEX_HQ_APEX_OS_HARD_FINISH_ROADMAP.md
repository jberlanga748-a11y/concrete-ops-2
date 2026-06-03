# Apex HQ Apex OS Hard-Finish Roadmap

Last updated: 2026-06-03

Canonical owner: John Berlanga

## Purpose

This roadmap turns the Apex OS phase plan into a strict hard-finish sequence.

The operating rule is:

- Work one phase at a time.
- Do not bounce between phases.
- Do not start the next phase until the current phase has been audited, hardened, validated, documented, committed, and pushed.
- Do not rebuild working systems.
- Remove the "future pile" wherever the work is now approved and safe.

## Current Approval Posture

Approved now:

- Private Apex OS schema/storage when needed.
- Private Apex OS file/document storage when needed.
- Server-side provider/API integration when credentials are configured or John explicitly provides setup approval.
- OpenAI-backed Ask Apex, summaries, embeddings, knowledge intelligence, and voice if implemented server-side without frontend secrets.
- Production deploy after full validation and release evidence.
- Agent execution when John explicitly asks for a scoped task.
- Local/private code edits, docs, tests, browser QA, monitoring reads, release packets, approval packets, and rollback plans.

Not approved right now:

- Email/SMS sends.
- Ad publishing or ad spend.
- Billing/payment actions.
- Customer-visible publishing, portal sharing, notifications, or sends.
- Autonomous unrequested agent execution or unmanaged background loops.
- Irreversible external actions without a fresh explicit approval packet.
- Deleting files, records, users, uploads, or historical evidence unless John explicitly asks.

Provider note:

- Apex OS AI work should use server-side `OPENAI_API_KEY`.
- If the key is absent or invalid, build provider-ready behavior and keep local fallback mode until the key is configured.
- No frontend provider secrets are allowed.

## Global Definition Of 100 Percent Done

A phase is 100 percent done only when all of this is true:

- Original master-plan requirements are satisfied.
- Safe hard-finish upgrades for that phase are complete.
- Any blocked work is blocked only because it enters the "not approved right now" list above.
- Route/API/UI permissions are verified.
- Field users and normal admins remain blocked from Apex OS.
- Mobile and desktop browser QA passed.
- Focused tests and relevant role/route/build checks passed.
- Docs record goal, affected files, validation, permissions, mobile impact, field impact, rollback, and next phase.
- A commit is pushed.
- The next phase has not been started.

## Phase Sequence

### Phase 1: Private Access And Identity

Status:

- Hard-finished locally on 2026-06-03.
- Frozen access model: normal Apex HQ login, private `operator_access` / `operatorAccess` flag, office-level role, default Apex HQ operating workspace, and server bootstrap `permissions.apexOs.canView`.
- Customer/company workspaces stay blocked even for an operator after company switching; the operator must be in the default Apex HQ operating workspace for Apex OS route/nav/API access.
- Validation passed with focused access, route, navigation, bootstrap, API, and company-scope tests; `npm.cmd run verify:roles`; `npm.cmd run build`; `git diff --check`; and desktop/mobile browser QA for operator access, normal-admin blocking, employee blocking, and switched-company blocking.

Hard-finish package:

- Audit route, nav, API, bootstrap permission, operator access, and direct-route behavior.
- Add stronger operator access evidence in UI/API where useful.
- Add or tighten tests for owner/operator, normal admin, estimator, foreman, employee, demo user, and cross-company blocking.
- Add production-ready release evidence if deploy is approved after validation.
- Document exact access model and freeze it.

Blocked right now:

- Customer-visible access model changes.
- Auth/session redesign unless separately approved as the active Phase 1 task.

### Phase 2: Apex-Branded Control Room Shell

Hard-finish package:

- Polish desktop/mobile Control Room layout.
- Ensure Apex HQ branding, owner language, density, navigation, and first-viewport signal are final.
- Remove stale placeholder/read-only copy that no longer matches completed capabilities.
- Browser QA desktop/mobile for overlap, overflow, legibility, and normal-admin blocking.

Blocked right now:

- None beyond normal production deploy gate after validation.

### Phase 3: Apex OS State Aggregator

Status:

- Hard-finished locally on 2026-06-03. The Control Room now has a read-only Phase 3 State Packet, source/confidence/read-only metadata for derived state, branch/build/test evidence slots, phase status, blockers/approvals, agents, release desk, launch/business queues, and blocked-role empty state coverage.

Hard-finish package:

- Complete: expand state aggregation to cover current branch, build/test state, phase status, blockers, approvals, agents, release desk, launch/business queues, and evidence.
- Complete: add source links and confidence labels for derived state.
- Complete: add tests proving no blocked role receives Apex OS state.
- Complete: ensure state remains read-only unless a later approved execution phase owns mutation.

Blocked right now:

- Autonomous live production mutations.
- External provider monitoring writes or alerts that send notifications.

### Phase 4: Decision Memory And Operating Rules

Hard-finish package:

- Move from minimal durable memory to a complete private decision system if needed: richer source browsing, review history, category coverage, duplicate checks, export, and stronger audit display.
- Add schema-backed private decision storage if the audit shows company settings is too limited.
- Add server-side AI extraction only for private reviewed sources if `OPENAI_API_KEY` is configured.
- Keep manual approve/archive before trusted memory.

Blocked right now:

- Hidden automatic memory for risky topics.
- Storing secrets or credentials.

### Phase 5: Knowledge Upload Vault

Status:

- Hard-finished locally on 2026-06-03 with text/PDF intake, source metadata, review status, summary status, search/filter, duplicate-source guard, and manual trust review.

Optional hard-finish upgrade if Phase 5 is reopened by explicit request:

- Add private binary original-file storage.
- Add schema-backed document records.
- Add server-side parsing.
- Add embeddings/vector search.
- Add AI summaries/classification.

Blocked right now:

- Customer upload mixing.
- Public publishing.
- External sends.

### Phase 6: Ask Apex Chat

Hard-finish package:

- Replace first UI with complete Ask Apex chat using server-side OpenAI when configured.
- Add durable private chat transcripts if needed.
- Add source/evidence drawer.
- Add save-as-decision draft flow.
- Add create-task/approval-packet draft flow.
- Add citation and source-rank tests.
- Keep every write as draft/review unless John explicitly asks execution.

Blocked right now:

- Customer-visible answers.
- External actions from chat.
- Frontend API keys.

### Phase 7: Agent Control Plane

Hard-finish package:

- Build complete agent dashboard: roles, status, current task, last update, next action, reports, handoffs.
- Allow explicit John-requested scoped agent execution.
- Add pause/resume request flow with audit trail.
- Add run history and safety locks.
- Ensure no unmanaged background loops.

Blocked right now:

- Autonomous unrequested execution.
- External sends/spend/billing/customer-visible actions.

### Phase 8: Approval Command Center

Hard-finish package:

- Finish approval packet workflow with templates, risk scoring, exact approval phrase, validation, rollback, affected files/data, and source evidence.
- Add approve/reject/defer states where safe.
- Add audit history and browser QA.
- Keep execution separate from approval unless the specific action is also approved.

Blocked right now:

- One-click irreversible execution without explicit approval.
- Sends, spend, billing, customer-visible actions.

### Phase 9: App Build And Code Awareness

Hard-finish package:

- Add real local git branch/status, changed files, last tests, build state, known blockers, frozen phase map, and source links.
- Add source-backed "start next safe task" recommendation.
- Add tests for parser/state helpers and no-field exposure.

Blocked right now:

- Live CI/GitHub writes unless John asks for that exact execution.

### Phase 10: Business Operating Center

Hard-finish package:

- Finish private business command queues for launch, revenue, pricing, offer, marketing, sales, customer success, and founder-demo work.
- Add task drafts and approval packets.
- Add source-backed business memory from approved vault/decision rows.

Blocked right now:

- Sending outreach.
- Publishing ads/content.
- Billing/payment changes.
- Customer-visible actions.

### Phase 11: Monitoring And Daily Briefings

Hard-finish package:

- Add durable daily briefing history.
- Add local/read-only monitoring summaries.
- Add stalled agent and failed build/test indicators.
- Add manual refresh and source evidence.
- Add production health reads after deploy approval.

Blocked right now:

- External alerts/notifications.
- Autonomous scheduled sends.

### Phase 12: Voice Interface

Hard-finish package:

- Add provider-backed speech-to-text and text-to-speech through server-side OpenAI if key is configured.
- Keep push-to-talk only.
- Add transcript confirmation before any command.
- Add voice answer playback.
- Add voice safety tests and browser QA.

Blocked right now:

- Always-listening mode.
- Hidden microphone capture.
- Voice-triggered external actions.

### Phase 13: Knowledge Intelligence

Hard-finish package:

- Add source-backed knowledge intelligence over approved decisions and vault items.
- Add AI summaries/classification if server-side provider is configured.
- Add embeddings/vector search if private storage/schema is implemented.
- Add evidence drawer and confidence labels.

Blocked right now:

- Unreviewed knowledge becoming trusted automatically.
- Customer/public knowledge mixing.

### Phase 14: Action Execution Layer

Hard-finish package:

- Allow John-requested scoped execution for local/private tasks.
- Create execution contracts with objective, allowed actions, blocked actions, validation, rollback, and result report.
- Support code/doc/test/browser execution when John asks.
- Require approval packets for production, provider, schema, deploy, or irreversible operations.

Blocked right now:

- Email/SMS, ads, billing/payment, customer-visible changes, and autonomous unrequested agent execution.

### Phase 15: Production Preview And Release Desk

Hard-finish package:

- Finish release desk with build/test/deploy readiness, backup/restore evidence, rollback plan, current branch, commit, and production health reads.
- Deploy only after validation and explicit release approval.
- Record release evidence in docs.

Blocked right now:

- Deploy without validation and approval.
- Production data mutation unrelated to the approved release.

### Phase 16: Personal Operating Layer

Hard-finish package:

- Add John's private preferences, working cadence, recurring priorities, decision style, and personal operating rules.
- Tie preferences to approved decision memory.
- Add review/edit/archive controls.

Blocked right now:

- Sensitive personal data capture without explicit instruction.
- Hidden tracking.

### Phase 17: Full Apex OS QA And Security Hardening

Hard-finish package:

- Run full role/access/security QA.
- Validate source citations, upload privacy, approval gates, agent execution boundaries, mobile/desktop UI, no secrets, no bypass actions, and docs drift.
- Add hardening report, rollback notes, and final blocked-action proof.

Blocked right now:

- External customer/money/send actions.
- Destructive tests against production data.

### Phase 18: Finished Apex OS

Hard-finish package:

- Assemble all completed phases into one day-to-day Apex OS cockpit.
- Prove John can run Apex HQ from Apex OS: ask, decide, upload, approve, brief, monitor, plan, execute scoped tasks, prepare releases, and manage agents.
- Run final production-preview QA after approved deploy.
- Freeze Apex OS completion state.

Blocked right now:

- Anything in the not-approved list: email/SMS sends, ads/spend, billing/payment, customer-visible publishing, autonomous unrequested agents, and irreversible external actions.

## Required Work Loop For Every Phase

For each phase:

1. Read the original phase requirements.
2. Audit current implementation.
3. Write the phase-specific gap list.
4. Implement only that phase.
5. Validate with focused tests, role/access tests, build, browser desktop/mobile QA, and blocked-user checks.
6. Update master/living docs.
7. Commit and push.
8. Stop before the next phase.

## Next Step

After the Phase 1 hard-finish commit is pushed, start Phase 2: Apex-Branded Control Room Shell.

Do not begin Phase 2 until Phase 1 is committed and pushed.
