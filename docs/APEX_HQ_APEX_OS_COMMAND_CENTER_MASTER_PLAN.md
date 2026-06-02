# Apex HQ Apex OS Command Center Master Plan

Last updated: 2026-06-02

Canonical owner: John Berlanga

## Purpose

This file is the saved memory for building **Apex HQ's private operating center**. It captures the full plan, not only the foundation, so future Codex/agent work does not lose the direction or rebuild the wrong thing.

The goal is to create **Apex OS** inside Apex HQ: a private, John-only command center that feels like an operating system for running the Apex HQ app, agents, launch work, business growth, decisions, approvals, and knowledge.

This is **not** a fake contractor company, demo workspace, or customer-facing dashboard. It is Apex HQ's own command center, branded with the real Apex HQ logo and identity.

## Core Decision Memory

- John Berlanga owns Apex HQ.
- The fake/smoke business stays testing/demo data only.
- Apex OS is the real Apex HQ operating center.
- Apex OS should live inside the main Apex HQ app behind the normal login, not as a separate public login.
- Apex OS must be visible only to John's private operator account unless John later approves more internal users.
- Customer companies, demo users, field users, estimators, normal admins, and pilots must not see Apex OS, its route, its nav item, its agents, its business tasks, its build status, or its internal decisions.
- Apex OS should use Apex HQ branding, logo, and real product identity.
- Apex OS should eventually allow John to talk to Apex, hear Apex respond, upload knowledge, approve work, inspect agents, and understand the app/business from one place.

## Product Definition

**Apex OS** is the private operating system layer for Apex HQ.

It combines:

- command center UI
- chat with Apex
- voice input and voice response
- knowledge uploads
- long-term decision memory
- app/build awareness
- agent control
- approval gates
- launch/revenue/business queues
- production-preview status
- monitoring and daily briefings
- source-backed answers
- kill switch and safety controls

## What Apex OS Must Feel Like

The target experience is:

- John logs into Apex HQ normally.
- If John's account has private operator access, a private **Apex Control Room** or **Apex OS** nav item appears.
- John opens it and sees the state of Apex HQ itself, not a customer/company workspace.
- John can ask: "What should we work on next?", "What changed today?", "What is blocking launch?", "Are agents running?", "What needs my approval?", "What did I already decide?"
- Apex answers from real sources: docs, code, uploads, tests, logs, agent reports, production health, and saved decisions.
- Apex can prepare work, drafts, reports, recommendations, and code plans, but risky actions stay locked until John approves.

## Non-Negotiable Safety Rules

Apex OS should not be over-restricted in low-risk work. The intended operating posture is:

**Apex has maximum freedom to plan, organize, draft, analyze, prioritize, recommend, design, code locally, test locally, summarize, and prepare work. Apex needs John's approval before anything external, irreversible, customer-visible, private-data-sensitive, production-affecting, permission-affecting, provider-connected, or money-related.**

Apex OS must not:

- expose itself to customers or contractor workspaces
- loosen field/user permissions
- mutate production data without explicit approval
- deploy without approval and validation
- send email/SMS automatically
- publish ads or spend money automatically
- process billing/payments automatically
- delete files automatically
- hide GPS/location tracking
- store secrets in frontend code
- treat uploaded knowledge as truth without source and review status
- make final legal, financial, medical, or compliance claims without human review

## Autonomy Posture

Allowed without extra approval when it stays local/private and does not create external impact:

- planning
- roadmaps
- task sorting
- drafting
- research summaries
- design mockups
- local code edits after John asks for implementation
- local tests and visual checks
- internal recommendations
- agent work packages
- decision proposals
- approval packet preparation
- private business/launch analysis

Requires John's explicit approval:

- money, billing, payments, invoices, checkout, subscriptions, ad spend, purchasing, or paid provider actions
- production deploys or production config changes
- production data changes
- customer-visible changes, sends, portal shares, public publishing, or customer notifications
- email/SMS/voice outreach automation
- auth, session, password, role, permission, or operator-access changes
- schema/database migrations
- provider/API credential setup or live provider execution
- GPS/location/privacy changes
- deleting files, records, uploads, users, or historical evidence
- legal/privacy/terms/public claim commitments
- anything irreversible or hard to roll back

## Source Of Truth Order For Apex OS

When Apex OS answers or acts, source priority is:

1. John's newest direct instruction.
2. Active production/app state when verified.
3. Active repo docs and source code.
4. Saved Apex OS decision memory.
5. Uploaded knowledge with source metadata.
6. Agent reports and automation logs.
7. External/current research when explicitly needed.
8. Model inference only when clearly labeled as inference.

## Access Model

Recommended access design:

- Use the existing Apex HQ login.
- Add or reuse a private server-side access flag such as `operator_access`.
- Gate Apex OS route, nav, API, and data server-side.
- The default allowed user is John Berlanga only.
- Customer/company admins do not get access by role alone.
- Field users remain blocked.
- Direct route access redirects or shows restricted access.
- Apex OS can later support a separate internal admin team only after John approves the role model.

## Target Route And Naming

Candidate route:

- `/apex-control-room`

Candidate user-facing names:

- Apex OS
- Apex Control Room
- Apex HQ Command Center

Preferred initial label:

- **Apex Control Room**

Preferred system name:

- **Apex OS**

## Completion Roadmap

### Phase 0: Memory And Roadmap Lock

Goal:

- Save this plan and make future chats treat it as a current Apex HQ product goal.

Build:

- Master plan doc.
- Living finish plan reference.
- Decision log seed.
- Non-goals and safety gates.

Validation:

- Docs are present.
- Future work can start from this file.

Status:

- Saved in this file and referenced by the living finish plan.

### Phase 1: Private Access And Identity

Goal:

- Make Apex OS private to John/operator access.

Build:

- Server-side private operator access helper.
- Route guard for `/apex-control-room`.
- Nav visibility gate.
- Direct-route restriction behavior.
- Tests proving customer/company/field/demo users cannot see or access Apex OS.

Non-goals:

- No public login split.
- No customer workspace exposure.
- No schema change unless existing access flag is insufficient and John approves.

Validation:

- `npm.cmd run verify:roles`
- focused navigation/route tests
- browser check for John/operator visible
- browser check for field/customer hidden

Status:

- Implemented locally on 2026-06-02 as part of Apex OS Slice 1.

### Phase 2: Apex-Branded Control Room Shell

Goal:

- Build the real private Apex HQ command center shell using the current app design language.

Build:

- Apex logo/brand header.
- Private John/Apex HQ identity.
- Current app-style dark sidebar, orange active state, white command-board panels.
- Desktop and mobile layouts.
- Top KPI row: App Build Status, Active Agents, Launch Blockers, Approvals.
- Main panels: Apex Briefing, Priority Queue, Agents, Approvals, Memory/Decisions.

Non-goals:

- No fake data in production.
- No customer/company dashboard content.

Validation:

- `npm.cmd run build`
- visual desktop/mobile browser screenshots
- field restricted-route checks

Status:

- Implemented locally on 2026-06-02 as part of Apex OS Slice 1.

### Phase 3: Apex OS State Aggregator

Goal:

- Create the data model that tells Apex OS what is happening.

Build:

- Local derived state for:
  - build status
  - active tasks
  - paused/running agents
  - approval queue
  - current launch blockers
  - recent decisions
  - recent test/deploy evidence
  - business/growth queues
- Reuse existing Agent OS, action inbox, monitoring, launch readiness, and app health systems where possible.

Non-goals:

- No new database schema until the frontend/state shape proves useful.

Validation:

- focused utility tests
- import tests for new page/components
- no field exposure

Status:

- Implemented locally on 2026-06-02 as Apex OS Slice 2.
- Added a read-only `deriveApexControlRoomState` aggregator that reuses existing Agent OS task/run helpers, launch readiness, release safety, enterprise trust/audit readiness, queue state, visible workspace records, approval gates, and recent evidence.
- The Apex Control Room now shows Operating Signals, Next Best Actions, Launch Readiness, Release Desk, Agent Control, Approval Gates, and Recent Evidence without adding schema, provider setup, chat/voice, production deploy, production data mutation, customer-visible sends, payments, ads, or deletion.
- Validation passed with focused Apex OS tests, the 77-test permission/routing/bootstrap suite, `npm.cmd run build`, `git diff --check` with CRLF warnings only, and desktop/mobile browser QA with no horizontal overflow and normal admin blocked/redirected away from Apex OS.

### Phase 4: Decision Memory And Operating Rules

Goal:

- Let Apex OS remember durable decisions and operating rules.

Build:

- Decision log model.
- Decision categories:
  - product identity
  - safety rule
  - roadmap decision
  - build freeze
  - business goal
  - provider/account decision
  - personal preference
- Source and timestamp tracking.
- Manual approve/archive flow.
- "What did I decide?" view.

Non-goals:

- No hidden automatic memory changes for risky subjects.
- No secrets stored as memory.

Validation:

- memory utility tests
- permission tests
- restricted-route tests

Status:

- Implemented locally on 2026-06-02 as Apex OS Slice 3.
- Added read-only Decision Memory and Operating Rules to the private Apex Control Room.
- Current memory is seeded from this master plan and includes source/status metadata for John/Apex HQ identity, private operator-only access, approval boundaries, local/private autonomy, safe build order, no-secrets memory, source order, no hidden risky memory, field boundaries, and external-impact approval rules.
- This is not yet an editable database-backed memory system. Manual approve/archive, hidden-memory prevention workflows, and any writable storage remain deferred until John explicitly approves the storage/schema slice.
- Validation passed with focused Apex OS utility/import tests, the 77-test permission/routing/bootstrap suite, `npm.cmd run build`, `git diff --check` with CRLF warnings only, and desktop/mobile browser QA with no horizontal overflow and normal admin blocked/redirected away from Apex OS.

### Phase 5: Knowledge Upload Vault

Goal:

- Let John upload what Apex needs to know.

Build:

- Private Apex OS upload area.
- Upload categories:
  - Apex HQ app docs
  - business strategy
  - marketing/sales
  - customer research
  - legal/risk review notes
  - brand/design assets
  - product ideas
  - private owner notes
- Source metadata, review status, and summary status.
- Manual review before knowledge becomes trusted memory.
- Search/filter by category and source.

Non-goals:

- No customer upload mixing.
- No secrets or credentials accepted as normal knowledge.
- No automatic public publishing.

Validation:

- upload classification tests
- role/access tests
- visual check

Status:

- Read-only first UI implemented locally on 2026-06-02 as Apex OS Slice 5.
- The Control Room now maps 8 private knowledge categories, 4 source candidates, vault safety gates, and intake status before any upload/storage approval.
- Durable source-backed Apex OS memory was implemented locally on 2026-06-02 as Apex OS Slice 12 using existing company settings persistence as `apexOsMemory`, with suggested/approved/archived status, source-label requirements, secret/email rejection, operator-only API access, and audit/activity logging.
- No real uploads, parsing, provider setup, embeddings, vector index, model calls, customer upload mixing, or production deployment were added.
- Validation passed with focused Apex OS utility/import tests, the 77-test permission/routing/bootstrap suite, `npm.cmd run build`, `git diff --check` with CRLF warnings only, and desktop/mobile browser QA with no horizontal overflow and normal admin blocked/redirected away from Apex OS.

### Phase 6: Ask Apex Chat

Goal:

- Add a private chat interface where John can ask Apex about the app, business, agents, and roadmap.

Build:

- Text chat panel.
- Context selector:
  - app/code
  - docs/memory
  - business
  - launch
  - agents
  - all
- Source-backed answer cards.
- "Evidence used" drawer.
- "Save as decision" action.
- "Create task" action.
- "Needs approval" action.

Provider-dependent:

- OpenAI/API provider integration and production secret setup.

Non-goals:

- No autonomous risky actions from chat.
- No final answers without source labels where source matters.

Validation:

- chat utility tests
- API permission tests
- source citation tests
- field blocked tests

Status:

- Read-only first UI implemented locally on 2026-06-02 as Apex OS Slice 6.
- The Control Room now shows Ask Apex context lanes, a disabled prompt surface, source/evidence rows, source-backed answer rules, and locked chat actions.
- No model call, streaming response, provider secret, external API request, durable chat storage, save-as-decision write, create-task write, approval mutation, schema change, storage change, or deploy was added.
- Validation passed with focused Apex OS utility/import tests, the 77-test permission/routing/bootstrap suite, `npm.cmd run build`, desktop/mobile browser QA with no horizontal overflow and disabled chat controls, and normal admin blocked/redirected away from Apex OS.

### Phase 7: Agent Control Plane

Goal:

- Let John see and control Apex agents from Apex OS.

Build:

- Agent list: build, QA, release, marketing, sales, customer success, monitoring.
- Status: running, paused, blocked, done, needs approval.
- Current task, last update, next action.
- Pause/resume request flow.
- Agent report history.
- Agent handoff summaries.

Non-goals:

- Agents cannot deploy/send/spend/delete without approval.
- No unmanaged background loops.

Validation:

- agent status utilities
- automation status checks
- approval-gate tests

Status:

- Read-only first slice implemented locally on 2026-06-02 as Apex OS Slice 4.
- Added Agent Work Queue, Agent Run Ledger, Agent Safety Locks, and Locked Agent Tasks panels to the private Apex Control Room.
- Reuses existing Agent OS internal task option and run ledger helpers. It shows available review-only task types, visible targets, recent audit-backed run rows, locked/no-target tasks, and safety boundaries.
- This slice does not run agents, resume/pause background loops, mutate records, deploy, send, spend, delete, configure providers, or change schema.
- Validation passed with focused Apex OS utility/import tests, the 77-test permission/routing/bootstrap suite, `npm.cmd run build`, `git diff --check` with CRLF warnings only, and desktop/mobile browser QA with no horizontal overflow and normal admin blocked/redirected away from Apex OS.

### Phase 8: Approval Command Center

Goal:

- Centralize every risky action that needs John's approval.

Build:

- Approval queue with categories:
  - deploy
  - production data
  - schema/auth/session
  - email/SMS
  - billing/payment
  - ad spend/publishing
  - file deletion
  - provider connection
  - customer-visible change
- Approval packet:
  - what action
  - why
  - affected files/data
  - risk
  - validation
  - rollback
  - exact approval phrase/action
- Reject/defer/approve controls.

Non-goals:

- No one-click irreversible action without packet and review.

Validation:

- approval-policy tests
- role tests
- release-safety tests

Status:

- Read-only first UI implemented locally on 2026-06-02 as Apex OS Slice 8.
- The Control Room now centralizes approval categories, approval packet requirements, locked approve/reject/defer/execute controls, and source rows from Release Desk, Ask Apex Chat, and Voice Interface.
- No approval write, durable audit record, execution path, schema change, storage change, deploy, production mutation, provider setup, customer-visible action, money action, send, publish, or deletion was added.
- Validation passed with focused Apex OS utility/import tests, the 77-test permission/routing/bootstrap suite, `npm.cmd run build`, desktop/mobile browser QA with no horizontal overflow and disabled approval controls, and normal admin blocked/redirected away from Apex OS.

### Phase 9: App Build And Code Awareness

Goal:

- Give Apex OS real knowledge of the current app/build state.

Build:

- Current branch/status summary.
- Last test results.
- Build status.
- Recent deploy evidence.
- Known blockers.
- Frozen phases and do-not-rebuild reminders.
- Link to relevant docs/files.
- "Start next safe task" recommendation.

Non-goals:

- No blind code changes from UI without Codex/tooling workflow and approvals.

Validation:

- smoke summary parsing
- docs/source status utility tests
- safe file reference handling

### Phase 10: Business Operating Center

Goal:

- Make Apex OS run Apex HQ as a business, not only an app build.

Build:

- Launch queue.
- Demo/pilot queue.
- Marketing queue.
- Sales/outreach queue.
- Customer success queue.
- Revenue/pricing/offer queue.
- Public launch readiness.
- Founder-led demo packet status.
- Manual-only send/publish gates.

Non-goals:

- No automatic ad spend.
- No automatic email/SMS outreach.
- No unsupported revenue claims.

Validation:

- business queue utilities
- claims guardrails
- manual-send gates

Status:

- Read-only first UI implemented locally on 2026-06-02 as Apex OS Slice 10.
- The Control Room now shows launch, demo/pilot, marketing, sales/outreach, customer success, revenue/pricing/offer queues, launch/founder-demo rows, business briefing rows, and manual-send/spend/billing/claims gates.
- No live send, email/SMS, ad spend, public publishing, billing/payment, package change, provider setup, customer-visible action, production data mutation, schema/storage change, or unsupported revenue/lead claim was added.
- Validation passed with focused Apex OS utility/import tests, the 77-test permission/routing/bootstrap suite, `npm.cmd run build`, desktop/mobile browser QA with no horizontal overflow, and normal admin blocked/redirected away from Apex OS.

### Phase 11: Monitoring And Daily Briefings

Goal:

- Let Apex OS proactively brief John and watch the app.

Build:

- Production readiness status.
- Demo app readiness status.
- GitHub Actions smoke status.
- Failed test/build monitor.
- Agent stalled monitor.
- Daily executive brief inside Apex OS.
- "What changed since yesterday?" summary.
- Alerts that require John action.

Non-goals:

- No production monitoring provider changes without approval.

Validation:

- monitoring helper tests
- read-only health checks
- heartbeat/automation review

Status:

- Read-only first UI implemented locally on 2026-06-02 as Apex OS Slice 9.
- The Control Room now shows release/monitoring checks, daily briefing rows, release readiness packet rows, and monitoring locks for John-only review.
- No deploy, rollback execution, production monitoring provider setup, external alert/notification, production data mutation, schema/storage change, provider config, or production configuration change was added.
- Validation passed with focused Apex OS utility/import tests, the 77-test permission/routing/bootstrap suite, `npm.cmd run build`, desktop/mobile browser QA with no horizontal overflow, and normal admin blocked/redirected away from Apex OS.

### Phase 12: Voice Interface

Goal:

- Add the "talk to Apex and Apex talks back" experience.

Build:

- Push-to-talk first.
- Voice transcript review before command execution.
- Text-to-speech response.
- Voice commands:
  - "What needs my approval?"
  - "Pause agents."
  - "Summarize today."
  - "Show blockers."
  - "Save this as a decision."
  - "Start the next safe task."
- Voice confirmation for risky commands.

Provider-dependent:

- Speech-to-text and text-to-speech provider/API approval and secrets.

Non-goals:

- No always-listening mode until privacy, consent, and local/device behavior are approved.

Validation:

- voice command parser tests
- transcript confirmation tests
- browser mobile voice UI check

### Phase 13: Knowledge Intelligence

Goal:

- Make uploaded knowledge searchable, source-backed, and useful.

Build:

- Document summaries.
- Trusted/untrusted knowledge status.
- Search by source/category/date.
- Conflict detection against current docs/code.
- "This conflicts with older memory" warnings.
- RAG/vector search if approved and needed.

Provider/schema-dependent:

- Durable embeddings/vector index may require schema/provider approval.

Non-goals:

- No unreviewed uploaded document silently overrides current repo truth.

Validation:

- source-ranking tests
- conflict tests
- privacy/access tests

### Phase 14: Action Execution Layer

Goal:

- Let Apex OS prepare real work and safely hand it to Codex/agents.

Build:

- Create task from chat.
- Create agent work package.
- Assign skill/role.
- Track workstream status.
- Capture validation results.
- Return approval packets.
- Update decision memory after finished work.

Non-goals:

- No uncontrolled autonomous changes.
- No production action without gates.

Validation:

- task packet tests
- agent handoff tests
- approval enforcement tests

### Phase 15: Production Preview And Release Desk

Goal:

- Make Apex OS the release desk for Apex HQ.

Build:

- Production-preview status.
- Release readiness packet.
- Local/build/test status.
- Deploy history.
- Rollback plan.
- Current production version/evidence.
- "Deploy approved" flow only after validation gates pass.

Non-goals:

- No surprise deploys.
- No secret exposure.

Validation:

- release-safety tests
- build
- roles
- hosted smoke
- rollback notes

Status:

- Release Desk first summary was implemented earlier in Apex OS Slice 2; fuller Release Desk / Monitoring first UI was implemented locally on 2026-06-02 as Apex OS Slice 9.
- The Control Room now shows release readiness packet rows, daily briefing rows, monitoring checks, and monitoring locks.
- Real production deploy, hosted smoke, rollback execution, production monitoring provider setup, external alerts, production data changes, schema/storage changes, provider config, and production configuration changes remain approval-locked.

### Phase 16: Personal Operating Layer

Goal:

- Let Apex OS adapt to how John works.

Build:

- John preferences.
- Work style memory.
- Communication preferences.
- Daily focus.
- "Do not distract me unless..." rules.
- What Apex should handle in background vs what requires check-in.

Non-goals:

- No sensitive personal tracking beyond explicit approved preferences.

Validation:

- preference memory tests
- privacy review

### Phase 17: Full Apex OS QA And Security Hardening

Goal:

- Prove Apex OS is safe before treating it as complete.

Build/validate:

- role and field restrictions
- customer/company isolation
- direct route blocking
- source citation checks
- upload privacy checks
- approval gate checks
- build/test/release safety
- desktop/mobile visual audits
- production-preview smoke
- docs/memory drift checks

Exit criteria:

- John-only route verified.
- Customers cannot see or access Apex OS.
- No secrets exposed.
- Risky actions cannot bypass approvals.
- Apex OS answers cite sources when required.
- Kill switch works.

Status:

- Read-only QA / Security Hardening first UI implemented locally on 2026-06-02 as Apex OS Slice 11.
- The private Control Room now shows hardening evidence rows, hardening locks, completion audit rows, and security proof sources for John-only access, customer/company isolation, direct-route blocking, field-user blocking, source-backed answers, upload privacy, approval gates, desktop/mobile quality, build/test/release safety, no secrets, and no bypass actions.
- Focused Apex OS tests, the 77-test permission/routing/bootstrap suite, `npm.cmd run build`, `git diff --check`, and desktop/mobile/admin-blocked browser QA passed locally.
- Normal admin direct-route QA redirected to `/` and exposed no Apex Control Room or QA / Security Hardening content.
- Production-preview smoke, production deploy, provider monitoring, external alerting, durable kill switch storage/execution, provider/API setup, durable memory/storage, voice provider work, and live action execution remain separate approval-locked later decisions.

### Phase 18: Finished Apex OS

Goal:

- Apex OS is complete enough to run Apex HQ day to day.

Finished capabilities:

- John-only branded command center.
- Text chat with Apex.
- Voice input/output.
- Knowledge upload and reviewed memory.
- Decision log.
- Source-backed answers.
- App/build awareness.
- Agent control.
- Approval center.
- Launch/business queues.
- Monitoring and daily briefings.
- Kill switch.
- Safe task execution handoff.
- Release desk.
- Mobile owner cockpit.

## Capability Matrix

| Capability | MVP | Complete |
| --- | --- | --- |
| Private John access | Yes | Server/API/nav/route fully hardened |
| Apex-branded command UI | Yes | Desktop/mobile polished |
| Chat with Apex | Text first | Text + voice + source-backed answers |
| Knowledge upload | Private uploads | Classified, reviewed, searchable knowledge |
| Memory | Decision log | Durable source-ranked operating memory |
| Agent status | Read-only cards | Pause/resume/control/report history |
| Approvals | Basic queue | Full approval packet workflow |
| App awareness | Build/test/deploy summaries | Live status, blockers, source links |
| Business ops | Launch/revenue queue | Marketing/sales/customer success workflows |
| Monitoring | Daily brief | Proactive health and stalled-agent alerts |
| Voice | Deferred | Push-to-talk, TTS, command confirmation |
| Execution | Manual tasks | Safe agent handoff with validation/rollback |

## Existing Systems Audit - 2026-06-02

This audit confirms Apex HQ already has several systems that should be reused instead of rebuilt.

Reusable systems already present:

- Routing and module parsing in `src/app-routing.js`.
- Workspace nav filtering and package-aware module locks in `src/navigation-utils.js`.
- Role/module permissions in `shared/permissions.js`.
- Existing `operatorAccess` / `operator_access` support for private operator company switching in `shared/companyScope.js`, `server/store.js`, and company-scope tests.
- Bootstrap permission payload generation in `server/index.js`.
- Command Center page components and KPI/card patterns in `src/command-center-route-components.jsx`.
- AI Office state derivation in `src/ai-office-utils.js`.
- Apex Agent Operator state derivation in `src/apex-agent-operator-utils.js`.
- Agent OS internal task, run ledger, and operator console utilities in `src/agent-os-ui-utils.js`.
- Agent OS server guards and endpoints in `server/index.js`.
- Agent action inbox and review-first approval patterns in `src/agent-action-proposal-utils.js`.
- Agent learning preferences and reviewed memory patterns in `shared/agentLearningPreferences.js`.
- Owner health, audit, trust readiness, launch readiness, and release safety utilities in `src/owner-health-utils.js`, `src/launch-readiness-utils.js`, and `src/release-safety-utils.js`.
- Existing role, navigation, company isolation, Agent OS, and agent learning tests that can be extended.

Confirmed gaps:

- No Apex OS / Apex Control Room module id exists yet.
- No private `/apex-control-room` route exists yet.
- No Apex OS nav item exists yet.
- No dedicated `apexOs` permission exists in the bootstrap payload yet.
- Existing `operatorAccess` is currently a company-switching capability, so Apex OS needs an explicit helper/gate rather than relying on role alone.
- No Apex OS page/component exists yet.
- No Apex OS state aggregator exists yet.
- No Apex OS-specific decision memory, knowledge vault, chat, voice, or source-backed answer system exists yet.
- AI Office and Agent OS are company/workflow scoped; Apex OS should reuse their signals but remain John's private Apex HQ operating center.

Implementation principle:

- Build Apex OS as a thin private command layer first.
- Reuse existing permissions, Agent OS, AI Office, action inbox, learning, health, launch, and release systems.
- Do not move risky behavior into Apex OS until the access boundary, approval queue, and source-backed memory are proven.
- Do not add schema, provider secrets, chat, voice, deploy, or customer-visible behavior in the first slice.

## Implementation Plan V1

### Slice 1: Private Route, Nav, And Shell

Goal:

- Put a real Apex Control Room inside Apex HQ that only John/private operator access can see.

Likely files:

- `shared/permissions.js`
- `shared/permissions.test.js`
- `src/app-routing.js`
- `src/app-routing.test.js`
- `src/navigation-utils.js`
- `src/navigation-utils.test.js`
- `src/app-navigation-components.jsx`
- `src/app-navigation-components-import.test.js`
- `src/apex-control-room-utils.js`
- `src/apex-control-room-utils.test.js`
- `src/apex-control-room-components.jsx`
- `src/App.jsx`
- `server/index.js`
- `server/role-permissions.test.js`

Build:

- Add module id such as `apexControlRoom`.
- Add route `/apex-control-room`.
- Add server-side/bootstrap permission such as `permissions.apexOs`.
- Add explicit access helper for John/private operator access.
- Add hidden nav group/item only when the helper allows it.
- Add private Apex-branded shell page with safe derived cards.
- Show restricted access on direct route for all blocked users.

Non-goals:

- No schema migration.
- No provider/API setup.
- No chat or voice.
- No deploy.
- No production data mutation.
- No customer-visible behavior.

Validation:

- `node --test --test-concurrency=1 shared/permissions.test.js src/app-routing.test.js src/navigation-utils.test.js src/app-navigation-components-import.test.js server/role-permissions.test.js`
- `npm.cmd run build`
- Browser visual check of `/apex-control-room` for an allowed private operator user.
- Browser direct-route check proving customer/admin/estimator/field/demo users are blocked.
- Mobile visual check proving the private shell fits without exposing customer/company data.

### Slice 2: Apex OS State Aggregator

Goal:

- Make the shell show real local/private app state instead of static placeholders.

Build:

- Create a derived Apex OS state utility.
- Pull read-only signals from Agent OS, AI Office, owner health, release safety, launch readiness, audit events, docs status, and active task memory.
- Produce stable panels for App Status, Agent Status, Launch Blockers, Approvals, Decision Memory, and Next Safe Task.

Non-goals:

- No new database schema until the state shape proves useful.
- No automatic execution.

Validation:

- Utility tests for state derivation.
- Import tests for components.
- Role tests proving blocked users receive no Apex OS state.

Status:

- Implemented locally on 2026-06-02.
- Current outputs: operating signals, next best actions, launch gate summary, release desk summary, agent task availability, approval gates, and recent audit evidence.
- Still intentionally read-only. It does not start agents, deploy, send, spend, mutate records, configure providers, change schema, or expose itself to normal admins/field users.

### Slice 3: Agent Status And Work Queue

Goal:

- Let John see what agents are paused/running/blocked/ready without letting them perform risky work automatically.

Build:

- Reuse Agent OS run ledger and operator console utilities.
- Show safe internal task queues.
- Show paused/running/blocked/done status.
- Add work-package summaries that Codex can use later.

Non-goals:

- No unmanaged background loops.
- No deploy/send/spend/delete controls.

Validation:

- Agent OS console tests.
- Role tests.
- Visual checks.

### Slice 4: Approval Center

Goal:

- Centralize risky actions that require John's approval.

Build:

- Reuse action proposal inbox patterns.
- Add approval packet cards for deploy, schema/auth/session, production data, customer-visible changes, email/SMS, billing/payment, provider setup, ad spend, and deletion.
- Require explicit approval language or button flow before execution.

Non-goals:

- No one-click irreversible action without a packet.

Validation:

- Approval policy tests.
- Role tests.
- Release safety tests.

Status:

- Read-only first UI implemented locally on 2026-06-02 as Apex OS Slice 8.
- Approval categories, packet fields, locked approve/reject/defer/execute controls, and source rows are visible inside the private Control Room.
- Real approval writes, durable audit records, execution, schema/storage changes, deploy, provider setup, production data mutation, sends, money actions, customer-visible changes, and deletion remain approval-locked.

### Slice 5: Decision Memory

Goal:

- Give Apex OS durable memory of John's operating decisions.

Build:

- Start with docs/file-backed decision memory and audited local state.
- Add categories, source, timestamp, confidence, and review status.
- Add approve/archive workflow.

Schema note:

- Database-backed memory can come later only after John approves the schema change.

Validation:

- Memory utility tests.
- Permission tests.
- No secret acceptance tests.

### Slice 6: Knowledge Upload Vault

Goal:

- Let John upload material Apex needs to know.

Build:

- Private upload surface.
- Source metadata and category classification.
- Trusted/untrusted/reviewed states.
- Search and summary.

Approval needed:

- Schema/storage/provider approval may be required.

Status:

- Read-only first UI implemented locally on 2026-06-02 as Apex OS Slice 5.
- Categories, source candidates, safety gates, and intake status are visible inside the private Control Room.
- Durable source-backed Apex OS memory was implemented locally on 2026-06-02 as Apex OS Slice 12 through existing company settings storage, with private operator-only API access, source-label requirements, review states, secret/email rejection, and audit evidence.
- Real uploads, parsing, embeddings/vector search, provider setup, and model calls remain locked behind later approval.

### Slice 7: Ask Apex Chat

Goal:

- Let John ask Apex about the app, roadmap, agents, decisions, business, and launch state.

Build:

- Private text chat.
- Source selector.
- Evidence drawer.
- Save-as-decision and create-task actions.

Approval needed:

- AI provider/API secrets and production config.

Status:

- Read-only first UI implemented locally on 2026-06-02 as Apex OS Slice 6.
- Ask Apex shows private context lanes, source/evidence planning, disabled prompt/actions, and answer safety rules inside the private Control Room.
- Real model calls, streaming, provider/API setup, durable chat storage, save-as-decision writes, create-task writes, approval mutations, schema changes, and deploy remain locked behind later approval.

### Slice 8: Voice Interface

Goal:

- Add the talk/listen experience.

Build:

- Push-to-talk first.
- Transcript confirmation.
- Text-to-speech answer.
- Voice confirmation for risky commands.

Approval needed:

- Speech provider/API secrets.
- Privacy review before any always-listening mode.

Status:

- Read-only first UI implemented locally on 2026-06-02 as Apex OS Slice 7.
- The Control Room now shows a private Voice Interface with disabled push-to-talk, transcript confirmation preview, spoken-answer preview, voice modes, voice safety gates, and voice approval boundaries.
- No microphone permission request, audio capture, always-listening behavior, speech-to-text, text-to-speech, model voice, provider/API setup, transcript storage, voice execution, schema change, storage change, or deploy was added.
- Validation passed with focused Apex OS utility/import tests, the 77-test permission/routing/bootstrap suite, `npm.cmd run build`, desktop/mobile browser QA with no horizontal overflow and disabled voice controls, and normal admin blocked/redirected away from Apex OS.

### Slice 9: Release Desk And Monitoring

Goal:

- Make Apex OS the place John checks readiness, deploy packets, rollback plans, and daily briefings.

Build:

- Current branch/build/test status.
- Launch gate status.
- Deploy readiness packet.
- Rollback plan.
- Failed test/build/stalled-agent alerts.

Approval needed:

- Production deploys and provider monitoring changes.

Status:

- Read-only first UI implemented locally on 2026-06-02 as Apex OS Slice 9.
- Current branch/build/test status, launch gate status, deploy readiness packet, rollback evidence, failed test/build monitor, stalled-agent watch, and daily briefing placeholders are visible inside the private Control Room.
- Deploys, rollback execution, production monitoring provider setup, production data changes, schema/storage changes, and external notifications remain approval-locked.

### Slice 10: Full Security And QA Hardening

Goal:

- Prove Apex OS is safe enough to run Apex HQ day to day.

Validate:

- John-only access.
- Customer/company isolation.
- Direct-route blocking.
- Field-user blocking.
- Source-backed answers.
- Upload privacy.
- Approval gate enforcement.
- Desktop/mobile visual quality.
- Build/test/release safety.

Status:

- Read-only first UI implemented locally on 2026-06-02 as Apex OS Slice 11.
- The Control Room now maps the final hardening checklist and lock rows without adding schema changes, auth/session changes, provider/API calls, production data mutation, deploys, sends, spend, billing/payment actions, customer-visible publishing, or irreversible actions.
- Validation passed with focused Apex OS utility/import tests, full permission/routing/bootstrap tests, production-style build, diff check, and browser QA screenshots for private desktop, private mobile, and normal-admin direct-route blocking.

## First Build Recommendation

The first implementation phase should be:

**Phase 1 + Phase 2 combined only if no schema change is needed.**

This means:

- private route
- operator-only access gate
- hidden nav for everyone else
- Apex-branded Control Room shell
- static/derived safe panels
- no chat/provider/voice yet
- no production deploy until validation passes

Reason:

- It gives John a real place in the app immediately.
- It does not require risky AI/provider/schema work.
- It establishes the private boundary before adding powerful features.

## Approval Needed Before Later Phases

Ask John before:

- schema changes for durable memory/knowledge
- provider/API secrets for AI, speech, vector search, or monitoring
- production deploys
- any live agent automation
- email/SMS sends
- ad spend/publishing
- billing/payment actions
- production data mutation
- deleting files

## Open Design Decisions

- Final route: `/apex-control-room` vs `/apex-os`.
- Final nav label: Apex Control Room vs Apex OS.
- Whether operator access stays John-only forever or later supports internal Apex HQ staff.
- Whether memory is initially docs/file-backed, database-backed, or both.
- Whether voice starts browser-only or supports a separate desktop/mobile mode.
- Which AI/speech providers are approved for production.
- Whether Apex OS should appear inside the normal sidebar or behind a smaller private switcher.

## Current Visual Reference

Mockup artifacts created from the live app style:

- `ui-audit/john-command-center-reference/2026-06-02T19-59-05-250Z/`
- `ui-audit/john-command-center-mockups/apex-control-room-desktop.png`
- `ui-audit/john-command-center-mockups/apex-control-room-mobile.png`

These are reference artifacts only. They are not production app changes.

## Do Not Lose This

Future Apex HQ work should treat this file as the master plan for Apex OS until John replaces it.

Before building any Apex OS phase, read:

1. `AGENTS.md`
2. `.agents/skills/apex-codex-operator/SKILL.md`
3. `docs/APEX_HQ_CANONICAL_SOURCE_OF_TRUTH.md`
4. `docs/APEX_HQ_LIVING_FINISH_PLAN.md`
5. this file
6. `docs/AGENT_OPERATING_MODEL.md`
7. existing Agent OS / Apex Assistant / operator access code and tests
