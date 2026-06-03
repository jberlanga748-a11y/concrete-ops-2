# Apex HQ Apex OS Command Center Master Plan

Last updated: 2026-06-03

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

- Hard-finished, pushed, deployed, and production-checked on 2026-06-03.
- Access is frozen to the existing Apex HQ login plus the private `operator_access` / `operatorAccess` flag, an office-level role, the default Apex HQ operating workspace, and the server bootstrap `permissions.apexOs.canView` gate.
- Operator access no longer follows an operator into a selected customer/company workspace. Operators can still switch companies, but Apex OS route/nav/API access is hidden and returns 403 until the default Apex HQ operating workspace is selected again.
- Normal admins without operator access, estimators, foremen, employees, demo users without the flag, customer/company users, and switched customer-company workspaces cannot see the Apex OS nav item or access Apex OS APIs.
- The private Control Room access KPI now shows proof that the default Apex HQ workspace, `operatorAccess` flag, office role, and server bootstrap permission all passed.
- Production operator shell route behavior was tightened on 2026-06-03: the private Apex HQ operating workspace now defaults `/` and blocked contractor direct routes to `/apex-control-room`, filters the desktop/mobile shell down to Apex OS/System operator tools, hides contractor Today/Field/Office/Money navigation, and preserves normal contractor routing only after the operator switches into a customer company.
- Production release approved and deployed on 2026-06-03 from commit `89d48db` to Fly app `concrete-ops-2`, machine `148e06e2b53d68`, version `633`, image `concrete-ops-2:deployment-01KT5Q7T38PVKCT8C1J21KXJNN`; post-deploy health, route-only hosted smoke, `/apex-control-room` bundle check, and unauthenticated Apex OS API denial passed.
- No schema change, auth/session redesign, customer-visible access model change, provider setup, production data mutation, deploy, customer-visible action, send, spend, billing/payment, deletion, or Phase 2 shell polish was added in this hard-finish pass.
- Validation passed on 2026-06-03 with focused route/nav/API/bootstrap/company-scope tests, `npm.cmd run verify:roles`, `npm.cmd run build`, `git diff --check` with CRLF warnings only, and desktop/mobile browser QA for operator access, normal-admin blocking, employee blocking, and switched-company blocking.

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

- Hard-finished and deployed on 2026-06-03.
- The private shell uses Apex HQ logo/branding, private operator identity, dark sidebar/orange active state, white command-board panels, desktop/mobile layouts, and the production operator shell route behavior already deployed in Phase 1/operator-shell hardening.
- The required top KPI row is now explicit: `App Build Status`, `Active Agents`, `Launch Blockers`, and `Approvals`.
- The required main panels are now explicit near the top of the Control Room: `Apex Briefing`, `Priority Queue`, `Agents`, `Approvals`, and `Memory / Decisions`.
- The top KPI row no longer uses contractor/customer dashboard counts such as jobs/leads/estimates as Apex OS shell metrics.
- Mobile shell hardening stacks KPI cards on narrow screens, gives the Control Room bottom-nav clearance, and makes the Apex OS mobile nav opaque on the Control Room page.
- Validation passed on 2026-06-03 with focused Control Room/route/mobile/import tests, `npm.cmd run verify:roles`, `npm.cmd run build`, and local desktop/mobile browser QA proving required KPI/panel visibility, no horizontal overflow, no contractor Today content in the private shell, mobile `/jobs` redirecting to `/apex-control-room`, and field direct-route blocking back to `/jobs`.
- Production release approved and deployed on 2026-06-03 from commit `eb6595f` to Fly app `concrete-ops-2`, machine `148e06e2b53d68`, version `634`, image `registry.fly.io/concrete-ops-2:deployment-01KT5SASRM9Z1ZTW1RY0S39Y3A`; rollback target is version `633`, image `registry.fly.io/concrete-ops-2:deployment-01KT5Q7T38PVKCT8C1J21KXJNN`.
- Post-deploy health, hosted skip-auth route smoke, `/apex-control-room` bundle checks on both production hosts, unauthenticated Apex OS API denial, Fly machine check, and production log snapshot passed. Production auth smoke/login was not run in this release pass.
- No schema change, auth/session change, provider setup, production data mutation, customer-visible action, send, spend, billing/payment, deletion, or external execution path was added in this Phase 2 hard-finish and approved release pass.

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

- Hard-finished and deployed on 2026-06-03.
- Added a read-only `deriveApexControlRoomState` aggregator that reuses existing Agent OS task/run helpers, launch readiness, release safety, enterprise trust/audit readiness, queue state, visible workspace records, approval gates, and recent evidence.
- Added a first-class Phase 3 State Packet that covers current branch evidence when supplied, build/test evidence, phase status, launch blockers, blocked approval packets, approval gates, agents, release packet rows, business queues, source groups, confidence labels, and the read-only mutation boundary.
- Added source, confidence, and read-only metadata to derived operating signals, next actions, launch gates, and agent/release/business rows so Apex OS shows where state came from instead of presenting unsupported claims.
- The Apex Control Room now shows Operating Signals, Next Best Actions, Launch Readiness, Release Desk, Agent Control, Approval Gates, Recent Evidence, and the Phase 3 State Packet without adding schema, provider setup, chat/voice rebuilds, production deploy, production data mutation, customer-visible sends, payments, ads, or deletion.
- Validation passed on 2026-06-03 with focused Phase 3 tests, the 74-test access/routing/company-scope suite, `npm.cmd run verify:roles`, `npm.cmd run build`, `git diff --check` with CRLF warnings only, and desktop/mobile browser QA proving Phase 3 packet visibility for the private operator, source/confidence/read-only metadata, no horizontal overflow, and field direct-route blocking back to `/jobs`.
- Production release approved and deployed on 2026-06-03 from commit `0685fdf` to Fly app `concrete-ops-2`, machine `148e06e2b53d68`, version `635`, image `registry.fly.io/concrete-ops-2:deployment-01KT5TJ888A2QCGXEQNH5R6CW1`; rollback target is version `634`, image `registry.fly.io/concrete-ops-2:deployment-01KT5SASRM9Z1ZTW1RY0S39Y3A`.
- Post-deploy health, hosted skip-auth route smoke, `/apex-control-room` bundle checks on both production hosts, unauthenticated Apex OS API denial, setup-status check, Fly machine check, `/.env` HTML-shell/no-env-assignment check, and production log snapshot passed. Production auth smoke/login was not run in this release pass.
- No schema change, auth/session change, provider setup, production data mutation, customer-visible action, send, spend, billing/payment, deletion, external execution path, or later-phase rebuild was added in this Phase 3 hard-finish and approved release pass.

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

- Completed locally to 100% on 2026-06-03.
- Decision Memory and Operating Rules now include the original Phase 4 decision categories: product identity, safety rule, roadmap decision, build freeze, business goal, provider/account decision, and personal preference.
- The private Apex Control Room now has a "What Did I Decide?" view backed by durable Apex OS memory in existing company settings as `apexOsMemory`.
- Source and timestamp tracking are shown for seeded plan decisions and durable memory rows.
- Manual draft, load, approve, and archive controls are available only to the private Apex OS operator account through existing operator-only `/api/apex-os/memory` endpoints.
- Suggested memory does not become approved Apex OS context until manually approved; archived memory no longer feeds approved context.
- Decision-memory source/category/status/text browsing, review-history display, active duplicate blocking, server-side duplicate rejection, and private JSON export are now included in the "What Did I Decide?" view.
- Secret/customer-email rejection, source-label requirements, audit/activity logging, restricted-route/API protection, and no-hidden-memory boundaries are enforced.
- No schema change, auth/session change, provider setup, production data mutation, deploy, customer-visible action, send, spend, billing/payment, file deletion, or Phase 5 upload/storage/parser work was added in this completion pass.
- Hard-finish validation passed on 2026-06-03 with focused memory utility/API/UI import tests, role permission tests, broader route/nav/bootstrap validation, `npm.cmd run build`, and browser QA recorded in the living finish plan.

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

- Completed locally to 100% on 2026-06-03.
- The private Apex Control Room now has a Knowledge Upload Vault where John can classify manual notes or local text-file uploads into the original 8 Phase 5 categories: Apex HQ app docs, business strategy, marketing/sales, customer research, legal/risk review notes, brand/design assets, product ideas, and private owner notes.
- Vault intake stores only reviewed text/source metadata through existing private Apex OS memory as `apexOsMemory`; no binary file storage, schema change, parser service, embeddings, vector index, model call, provider setup, production deployment, customer upload mixing, or public publishing path was added.
- Source metadata, review status, and summary status are visible for each vault row through source label, source URI, suggested/approved/archived state, and review note.
- New uploaded knowledge is forced to `suggested` when created through the knowledge-upload source type, even if a client tries to create it as approved. It becomes trusted Apex OS context only after a separate manual approve action.
- The vault supports search plus category, source, and review-status filtering inside the private operator-only Control Room.
- Phase 5 hardening added client-side PDF text extraction, category-scoped duplicate-source guarding, vault review history, and private knowledge export on 2026-06-03, so John can intake PDFs without binary storage, avoid saving repeated active knowledge sources, and audit/export reviewed private vault rows.
- Secret/customer-email rejection, source-label requirements, operator-only API access, audit/activity logging, normal-admin/field-user blocking, and no-customer-mixing boundaries remain enforced.
- Validation passed on 2026-06-03 with upload classification tests, role/access tests, focused Apex OS API/UI tests, broader route/nav/permission regression tests, `npm.cmd run build`, `git diff --check` with CRLF warnings only, desktop/mobile browser QA with no horizontal overflow, PDF intake/duplicate-guard browser QA, private export/review-history browser QA, and normal admin blocked from Apex OS/API access.

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

- Completed locally to 100% on 2026-06-03.
- The private Control Room now has a complete Ask Apex chat surface with selectable context scopes for app/code, docs/memory, business, launch, agents, and all.
- Operator-only `/api/apex-os/ask` accepts the selected context scope, answers from approved Apex OS memory and source rows, returns ranked evidence, source labels, approval warnings, provider/local mode status, and falls back to local source-backed answers when `OPENAI_API_KEY` is not configured.
- The Apex answer card includes source-backed answer text, source labels, approval warnings, provider/local mode, and an "Evidence used" drawer with ranked source rows.
- Save as decision now writes a suggested Apex OS memory draft only; the decision does not become trusted context until separately approved in Decision Memory.
- Create task and Needs approval now create review-only approval packet drafts; they do not approve, queue, run, deploy, send, spend, publish, mutate production, or trigger customer-visible actions.
- The Execute control remains locked, and no frontend provider secret, external action, customer-visible answer path, production mutation, schema change, deploy, send, spend, billing/payment, or irreversible execution path was added.
- Validation passed on 2026-06-03 with focused Ask Apex utility/API/UI tests, broader Apex OS route/nav/permission regression tests, `npm.cmd run build`, desktop/mobile browser QA with no horizontal overflow, ranked evidence/draft-action browser QA, normal admin UI/API blocking, and cleanup of the temporary local QA memory/approval rows.
- Production release was approved and deployed on 2026-06-03 from commit `94a6f69` to Fly app `concrete-ops-2` as version `638`, with production ready/health checks, hosted route smoke, `/apex-control-room` bundle verification, and unauthenticated Ask Apex API blocking verified after deploy.

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

- Completed locally to 100% on 2026-06-03.
- The private Control Room now has a complete Agent Control Plane with a seven-role roster for build, QA, release, marketing, sales, customer success, and monitoring agents.
- Each roster row derives status, current task, last update, next action, report counts, handoff counts, and request counts from Agent OS run history, execution handoffs, and durable control requests. Supported status states include running, paused, blocked, done, and needs approval.
- Durable pause, resume, and scoped-run control requests now use existing company settings storage as `apexOsAgentControlRequests`, with operator-only list/create/update endpoints, requested/ready/blocked/closed/archived states, source-label and readiness-field requirements, secret/email rejection, audit/activity logging, and Control Room request/load/mark-ready/block/close/archive UI.
- Agent Work Queue, Agent Run Ledger, Agent Safety Locks, Locked Agent Tasks, and safe execution handoff drafts remain in the Phase 7 surface. Handoffs continue to prepare scoped work packages through `apexOsExecutionHandoffs`.
- Phase 7 allows John-requested scoped agent work records and handoff preparation only. It does not add an agent runner, background loop, queue endpoint, run endpoint, approval execution, deploy, send, spend, publish, provider setup, customer-visible action, production mutation, schema change, deletion, or irreversible action path.
- Validation passed on 2026-06-03 with focused Agent Control Plane shared/API/UI tests, the 73-test Apex OS permission/routing/bootstrap suite, `npm.cmd run build`, and desktop/mobile Playwright browser QA proving operator login, request creation, mark-ready flow, locked execution labels, and no horizontal overflow at 1440px or 390px.
- Production release was approved and deployed on 2026-06-03 from commit `0aef694` to Fly app `concrete-ops-2` as version `639`, image `registry.fly.io/concrete-ops-2:deployment-01KT60X0SWR6QZWJKQC407W4VC`, with predeploy production backup `postgres-app-data-20260603-055635Z.json` and upload snapshot `uploads-20260603-055635Z`.
- Post-deploy checks passed on 2026-06-03: both production `/api/ready` endpoints returned ready/database ok, `https://concrete-ops-2.fly.dev/api/health` returned healthy, Fly status showed machine `148e06e2b53d68` on version `639` with 1 passing check, hosted skip-auth health/routes smoke passed on `https://app.apexhq.online/`, `/apex-control-room` served, unauthenticated `/api/apex-os/agent-control` returned 401, `/api/setup/status` showed demo mode off and public signup disabled. Production auth smoke/login was not run.

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

- Hard-finished and deployed on 2026-06-03.
- The Control Room now centralizes approval categories, approval packet requirements, packet templates, risk scoring, exact approval phrase entry, approve/reject/defer decision records, execution-locked controls, and source rows from Release Desk, Ask Apex Chat, and Voice Interface.
- Durable approval packets use existing company settings storage as `apexOsApprovalPackets`, with operator-only list/create/update endpoints, draft/ready/approved/rejected/deferred/blocked/archived states, source-label and readiness-field requirements, secret/email rejection, exact phrase enforcement before approval, decision actor/timestamp fields, audit/activity logging, and Control Room drafting/loading/mark-ready/block/archive/reject/defer/approval-record UI.
- Approval decisions are review records only. No executed/running/queued state, one-click irreversible action, queue/run endpoint, deploy action, production mutation, provider setup, customer-visible action, money action, send, publish, deletion, schema change, auth/session change, or irreversible execution path was added.
- Validation passed on 2026-06-03 with focused approval packet shared/API/UI tests, the 77-test Apex OS permission/routing/bootstrap suite, `npm.cmd run build`, `git diff --check`, desktop/mobile browser QA with no horizontal overflow and disabled execution controls, final screenshot evidence at `ui-audit/apex-control-room-phase8/`, and active-local-DB cleanup verification proving no temporary Phase 8 QA packets remain.
- Production release was approved and deployed on 2026-06-03 from commit `be2dccb` to Fly app `concrete-ops-2` as version `640`, image `registry.fly.io/concrete-ops-2:deployment-01KT63SPFM2EM1SVEHK24148G8`, with predeploy production backup `postgres-app-data-20260603-064657Z.json` and upload snapshot `uploads-20260603-064657Z`.
- Post-deploy checks passed on 2026-06-03: both production `/api/ready` endpoints returned ready/database ok, `https://concrete-ops-2.fly.dev/api/health` returned healthy, Fly status showed machine `148e06e2b53d68` on version `640` with 1 passing check, hosted skip-auth health/routes smoke passed on `https://app.apexhq.online/`, `/apex-control-room` served the new bundle, unauthenticated `/api/apex-os/approval-packets` returned 401, and `/api/setup/status` showed demo mode off and public signup disabled. Production auth smoke/login was not run.

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

Status:

- Hard-finished and deployed on 2026-06-03.
- Apex OS now has a private App Build Awareness panel in the Control Room with current branch, head SHA, changed-file count, build script status, verification-script status, recent deploy evidence, known blockers, frozen phase map, safe source links, recent commits, and "Start next safe task" recommendation.
- Operator-only `/api/apex-os/build-awareness` collects local git status, recent commits, declared package scripts, dist artifact names, Apex OS docs, and runtime metadata where available. Production/runtime images that do not include `.git` degrade honestly to runtime metadata only instead of inventing git state.
- File references are sanitized before display; absolute paths, drive-letter paths, parent traversal, and null-byte paths are rejected.
- Build awareness is read-only and execution-locked. It cannot edit files, run tests, commit, push, deploy, roll back, mutate production data, expose field records, send messages, spend money, process billing, configure providers, or perform customer-visible actions.
- Normal admins, field users, customer/company users, switched customer-company workspaces, and unauthenticated users remain blocked from the build-awareness endpoint and UI.
- Local validation passed with focused parser/API/UI tests, the 81-test Apex OS permission/routing/bootstrap regression suite, `npm.cmd run build`, and desktop/mobile browser QA against an isolated temporary database with no horizontal overflow and screenshots under `ui-audit/apex-control-room-phase9/`.
- Production release was approved and deployed on 2026-06-03 from commit `6368845` to Fly app `concrete-ops-2` as version `641`, image `registry.fly.io/concrete-ops-2:deployment-01KT65V9K2KK4G0V1R6QRXR9QG`, with predeploy production backup `postgres-app-data-20260603-072250Z.json` and upload snapshot `uploads-20260603-072250Z`.
- Post-deploy checks passed on 2026-06-03: both production `/api/ready` endpoints returned ready/database ok, `https://concrete-ops-2.fly.dev/api/health` returned healthy, Fly status showed machine `148e06e2b53d68` on version `641` with 1 passing check, hosted skip-auth health/routes smoke passed on `https://app.apexhq.online/`, `/apex-control-room` served the new `index-Damj_cyI.js` and `app-domain-VWYbc_UL.js` bundles on both production hosts, unauthenticated `/api/apex-os/build-awareness` returned 401, and `/api/setup/status` showed demo mode off and public signup disabled. Production auth smoke/login was not run.
- No schema change, auth/session change, provider setup, production data mutation, customer-visible action, send, spend, billing/payment, deletion, deploy execution control, GitHub write, CI write, or blind UI code-change path was added.

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

- Hard-finished and deployed on 2026-06-03.
- The Control Room now shows launch, demo/pilot, marketing, sales/outreach, customer success, revenue/pricing/offer queues, launch/founder-demo rows, business briefing rows, and manual-send/spend/billing/claims gates.
- Phase 10 now adds source-backed business memory rows from approved Apex OS memory categories, private business task draft rows for launch/founder demo/marketing/sales/customer success/revenue work, and business approval draft rows for manual sends, ads/publishing, billing/offers, customer-visible work, and business operations.
- Business task drafts point to existing Agent Handoffs as `business-draft` work, but no queue/run/execution action exists.
- Business approval drafts are review packets only; manual send/publish/billing/customer-visible gates remain locked until separately approved.
- No live send, email/SMS, ad spend, public publishing, billing/payment, package change, provider setup, customer-visible action, production data mutation, schema/storage change, auth/session change, or unsupported revenue/lead claim was added.
- Local validation passed with focused Phase 10 Apex OS utility/import tests, the 82-test Apex OS route/nav/permission regression suite, `npm.cmd run build`, and isolated desktop/mobile browser QA using approved business memory seed rows with no horizontal overflow and screenshots under `ui-audit/apex-control-room-phase10/`.
- Production release was approved and deployed on 2026-06-03 from commit `ee851f7` to Fly app `concrete-ops-2` as version `642`, image `registry.fly.io/concrete-ops-2:deployment-01KT67FMHMMHQH69R1ZFX5Y0VR`, with predeploy production backup `postgres-app-data-20260603-075124Z.json` and upload snapshot `uploads-20260603-075124Z`.
- Post-deploy checks passed on 2026-06-03: both production `/api/ready` endpoints returned ready/database ok, `https://concrete-ops-2.fly.dev/api/health` returned healthy, Fly status showed machine `148e06e2b53d68` on version `642` with 1 passing check, hosted skip-auth health/routes smoke passed on `https://app.apexhq.online/`, `/apex-control-room` served `index-DaDMI41p.js` and `app-domain-Ds8onq2Y.js` on both production hosts, unauthenticated `/api/apex-os/approval-packets` and `/api/apex-os/memory` returned 401, and `/api/setup/status` showed demo mode off and public signup disabled. Production auth smoke/login was not run.

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

- Hard-finished locally on 2026-06-03.
- The Control Room now has source-backed Release Monitoring refresh for production readiness, demo app readiness, GitHub Actions/smoke status, failed test/build signals, and stalled-agent signals using operator-only read-only build awareness.
- The Daily Briefing now supports operator-only manual refresh, manual private snapshot save through existing company settings as `apexOsDailyBriefingHistory`, changed-since-last-saved briefing comparison, briefing history rows, source labels, locks, and next actions.
- Operator-only `POST /api/apex-os/daily-briefing/history` saves sanitized briefing snapshots with audit/activity history only.
- No external alert/notification, autonomous schedule, agent execution, deploy/rollback execution, production monitoring provider setup, provider call, production/customer mutation, schema/storage change, auth/session change, email/SMS send, ad spend, billing/payment, deletion, public publishing, or customer-visible action was added.
- Validation passed with focused daily briefing/build awareness/control room/server tests, the 98-test Apex OS route/nav/permission regression suite, `npm.cmd run verify:roles`, `npm.cmd run build`, `git diff --check`, and desktop/mobile browser QA on `/apex-control-room` with monitoring refresh plus briefing save/history, no console errors, failed requests, or horizontal overflow.
- Production release was approved and deployed on 2026-06-03 from commit `10232dd` to Fly app `concrete-ops-2` as version `643`, image `registry.fly.io/concrete-ops-2:deployment-01KT69XEJKX0VH6X0G063WKVPV`, with predeploy production backup `postgres-app-data-20260603-083353Z.json` and upload snapshot `uploads-20260603-083353Z`.
- Post-deploy checks passed on 2026-06-03: both production `/api/ready` endpoints returned ready/database ok, `https://concrete-ops-2.fly.dev/api/health` returned healthy, Fly machine `148e06e2b53d68` was started on the Phase 11 image with 1 passing check, hosted skip-auth health/routes smoke passed on `https://app.apexhq.online/`, `/apex-control-room` served `index-DgMWRcA4.js` and `app-domain-CIbawYP-.js` on both production hosts, unauthenticated Apex OS daily briefing/history/build-awareness endpoints returned 401, and `/api/setup/status` showed demo mode off and public signup disabled. Production auth smoke/login was not run.

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

Status:

- Hard-finished locally on 2026-06-03.
- The private Control Room Voice Interface now supports click-to-record push-to-talk, Stop & transcribe, manual transcript entry, transcript confirmation, command review for the original Phase 12 commands, safe Ask Apex question handoff, and Speak answer / Stop voice playback.
- Operator-only `POST /api/apex-os/voice/speech` and `POST /api/apex-os/voice/transcribe` are server-side only. They use `OPENAI_API_KEY` when configured; no provider key or voice secret is exposed to the frontend. Without a key, speech returns a safe browser-playback fallback and transcription stays manual/reviewed.
- Voice remains review-first: transcripts create an execution-locked command review and optional Ask Apex question. They do not pause agents, start tasks, write decisions, approve packets, send messages, deploy, spend money, bill, mutate production/customer data, or run external actions.
- No always-listening mode, hidden microphone capture, audio storage, transcript persistence, schema/storage change, auth/session change, provider setup, customer-visible action, deletion, or irreversible action path was added.
- Validation passed with focused voice parser/safety tests, broader Apex OS route/nav/permission regression, `npm.cmd run verify:roles`, `npm.cmd run build`, and desktop/mobile browser QA on `/apex-control-room` for transcript confirmation, safe Ask Apex handoff, speech fallback request, no failed requests, and no horizontal overflow.
- Production release was deployed on 2026-06-03 from commit `301a852` to Fly app `concrete-ops-2` as version `644`, image `registry.fly.io/concrete-ops-2:deployment-01KT6BZ28V8HTPBNCWZEA27DXY`, with predeploy production backup `postgres-app-data-20260603-090951Z.json` and upload snapshot `uploads-20260603-090951Z`.
- Post-deploy checks passed on 2026-06-03: both production `/api/ready` endpoints returned ready/database ok, `https://concrete-ops-2.fly.dev/api/health` returned healthy, Fly machine `148e06e2b53d68` was started on the Phase 12 image with 1 passing check, hosted skip-auth health/routes smoke passed on `https://app.apexhq.online/`, `/apex-control-room` served `index-2kSpyfRN.js` and `app-domain-DXZHV5Al.js` on both production hosts, unauthenticated Apex OS voice speech/transcribe and Ask Apex endpoints returned 401, and `/api/setup/status` showed demo mode off and public signup disabled. Production auth smoke/login was not run.

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

Status:

- Hard-finished locally on 2026-06-03.
- Apex OS now has source-backed Knowledge Intelligence over approved decision memory and Knowledge Vault rows, including local lexical source ranking, reviewed document summaries, trusted/suggested/archived status, category/source/status/text/date filtering, confidence labels, ranked evidence rows, and conflict warnings against current Apex HQ operating rules.
- Operator-only `POST /api/apex-os/knowledge-intelligence` returns private ranking, summaries, confidence labels, conflict warnings, safety locks, and provider insight. It uses server-side `OPENAI_API_KEY` for optional AI summary/classification only when configured; without a key it returns local source-backed intelligence.
- The Knowledge Vault UI now shows Knowledge Intelligence, Refresh intelligence, Conflict warnings, Ranked Evidence, Confidence Labels, Local fallback / Server provider status, and locked vector-search state.
- Conflict detection flags current-rule conflicts such as automatic trust, field access to pricing/private data, external actions without approval, and secret storage; it also flags "This conflicts with older memory" when active memory rows disagree.
- No unreviewed uploaded document becomes trusted automatically, no customer/public knowledge is mixed into Apex OS, no embeddings/vector index/schema/storage was added, no frontend provider secret was added, and no provider write, production/customer mutation, send, spend, billing/payment, deploy/rollback execution, deletion, or irreversible action path was added.
- Validation passed with focused source-ranking/conflict/provider-payload tests, Apex OS privacy/access server tests, the 114-test Apex OS route/nav/permission regression suite, `npm.cmd run verify:roles`, `npm.cmd run build`, `git diff --check`, and desktop/mobile browser QA on `/apex-control-room` for Knowledge Intelligence refresh, ranked evidence, conflict warnings, date filter, vector-search lock, no failed post-login requests, and no horizontal overflow.
- Production release was deployed on 2026-06-03 from commit `f8193ad` to Fly app `concrete-ops-2` as version `645`, image `registry.fly.io/concrete-ops-2:deployment-01KT6DWEVTQ5CBC5V8TX7TX5CZ`, with predeploy production backup `postgres-app-data-20260603-094325Z.json` and upload snapshot `uploads-20260603-094325Z`.
- Post-deploy checks passed on 2026-06-03: both production `/api/ready` endpoints returned ready/database ok, `https://concrete-ops-2.fly.dev/api/health` returned healthy, Fly machine `148e06e2b53d68` was on version `645` with 1 passing check, hosted skip-auth health/routes smoke passed on `https://app.apexhq.online/`, `/apex-control-room` served `index-9Ub5wvmX.js` and `app-domain-DwwCEagD.js`, unauthenticated Apex OS knowledge-intelligence, memory, and Ask Apex endpoints returned 401, and `/api/setup/status` showed demo mode off, demo user absent, and public signup disabled. Production auth smoke/login was not run.

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

Status:

- Hard-finished locally on 2026-06-03.
- Ask Apex can now create safe execution handoff drafts from chat without creating approval decisions, queueing work, running agents, deploying, sending, spending, billing, or mutating production/customer data.
- Agent handoffs now include an execution contract with objective, assigned role/skill, work type, source chat request, allowed actions, blocked actions, validation plan, rollback plan, result report, approval packet reference, decision memory reference, and locked execution flags.
- Workstream status now supports planned, ready-for-agent, in-progress, validating, finished, blocked, and archived states. Finished workstreams must include validation results and a result report before they can be saved.
- Finished handoffs with a decision-memory update create only a suggested Apex OS decision memory row for manual review; they do not approve decisions automatically.
- Risky allowed actions that mention production, provider setup, schema/auth/session, deployment, customer-visible changes, sends, spend, billing/payment, deletion, or irreversible work require an approval packet reference and remain execution-locked.
- The Control Room now supports drafting, loading, editing, marking ready/validating/finished/blocked/archive, viewing validation/result/memory evidence, and seeing Queue/Run locked controls for action execution handoffs.
- No queue/run endpoint, uncontrolled autonomous change path, production action, customer-visible action, external send, ad spend, billing/payment, provider setup, schema/auth/session change, deletion, or irreversible action path was added.
- Validation passed with focused Ask Apex, execution handoff, server memory, Control Room import/utility tests; the 117-test Apex OS route/nav/permission regression suite; `npm.cmd run verify:roles`; `npm.cmd run build`; `git diff --check` with CRLF warnings only; and desktop/mobile browser QA on `/apex-control-room` for chat-created handoff drafting, finished handoff save, suggested memory creation, locked queue/run controls, and no horizontal overflow.
- Production release was deployed on 2026-06-03 from commit `ab1a656` to Fly app `concrete-ops-2` as version `646`, image `registry.fly.io/concrete-ops-2:deployment-01KT6G2KC3ZZ5HS4Q3GT0VHHAP`, with predeploy backup `postgres-app-data-20260603-102138Z.json`, upload snapshot `uploads-20260603-102138Z`, and rollback target version `645`.
- Post-deploy checks passed on 2026-06-03: both production `/api/ready` endpoints returned ready/database ok, `https://concrete-ops-2.fly.dev/api/health` returned healthy, Fly machine `148e06e2b53d68` was on version `646` with 1 passing check, hosted skip-auth health/routes smoke passed on `https://app.apexhq.online/`, `/apex-control-room` served `index-D5EnyN4J.js`, `app-domain-BX7hVNVK.js`, and `app-domain-BG7wb0Ah.css`, unauthenticated Apex OS execution-handoffs, memory, and Ask Apex endpoints returned 401, and `/api/setup/status` showed demo mode off, demo user absent, and public signup disabled. Production auth smoke/login was not run.

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
- Hard-finished locally on 2026-06-03.
- The Release Desk now shows the original Phase 15 production-preview and release controls as explicit read-only rows: Production Preview Status, Release Readiness Packet, Deploy History, Deploy Approved Flow, and Release Safety Summary.
- Build awareness now parses the living-plan deploy log so the Release Desk can show the current production version, commit, image, health evidence, backup evidence, hosted smoke evidence, and recent Apex OS deploy history instead of relying on stale release bullets.
- The "Deploy approved" flow is visible but locked: validation gates, exact approval phrase, manual deploy handoff, and post-deploy evidence rows are shown, while the disabled `Deploy approved locked` control confirms there is no UI execution path.
- No surprise deploy, rollback execution, queue/run endpoint, provider setup, production data mutation, customer-visible action, live send, ad spend, billing/payment, schema/auth/session change, deletion, or irreversible action path was added.
- Validation passed with focused build-awareness/release-desk/component tests, the 118-test Apex OS route/nav/permission regression suite, `npm.cmd run verify:roles`, `npm.cmd run build`, `git diff --check` with CRLF warnings only, and desktop/mobile browser QA on `/apex-control-room` for Release Desk refresh, production `v646` evidence, deploy history, backup/smoke evidence, disabled deploy-approved lock, and no horizontal overflow.
- Production release is pending commit, push, clean-worktree deploy, hosted smoke, protected-endpoint checks, setup-status check, and release evidence commit.

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

Status:

- Read-only Agent Work Queue and Run Ledger implemented locally on 2026-06-02 as Apex OS Slice 4.
- Durable safe agent handoff drafts implemented locally on 2026-06-02 as Apex OS Slice 18 using existing company settings storage as `apexOsExecutionHandoffs`.
- Handoffs can be drafted, readied, blocked, and archived from the private Control Room with source evidence, allowed actions, blocked actions, validation plan, rollback plan, and handoff prompt.
- Queueing, running, approving, executing, deploys, sends, spend, provider setup, production mutation, customer-visible changes, schema changes, deletion, and irreversible actions remain locked.

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

- Folded into Phase 8 completion and hard-finished locally on 2026-06-03.
- Approval categories, packet fields, templates, risk scoring, exact phrase approval entry, approve/reject/defer decision records, execution-locked controls, and source rows are visible inside the private Control Room.
- Durable approval packets use existing company settings storage as `apexOsApprovalPackets`, with operator-only list/create/update endpoints, draft/ready/approved/rejected/deferred/blocked/archived states, source-label and readiness-field requirements, secret/email rejection, exact phrase enforcement before approval, audit/activity logging, and Control Room drafting/loading/mark-ready/block/archive/reject/defer/approval-record UI.
- Durable execution handoff drafts remain a Phase 7 work-package path through `apexOsExecutionHandoffs`; Phase 8 approval decisions do not call Agent OS queue/run endpoints.
- External execution, schema/storage migrations, deploy, provider setup, production data mutation, sends, money actions, customer-visible changes, deletion, and irreversible actions remain execution-locked behind a separate release/operator workflow.

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

- Completed locally to 100% on 2026-06-03 as Apex OS Phase 6.
- Ask Apex shows private selectable context scopes, source-backed questions, source-ranked answer cards, approval warnings, provider/local mode, and an "Evidence used" drawer inside the private Control Room.
- Operator-only `/api/apex-os/ask` now receives the selected context scope, filters approved Apex OS memory/source rows by scope, returns ranked evidence rows, and remains server-side provider-ready when `OPENAI_API_KEY` is configured.
- Save-as-decision creates suggested decision memory only, and create-task / needs-approval create review-only approval packet drafts only.
- No streaming, durable chat transcript storage, frontend provider secret, approval execution, deploy, production action, send, money movement, customer-visible action, or irreversible action path was added.
- Focused Ask Apex tests, broader route/nav/permission tests, production build, desktop/mobile browser QA, and normal-admin UI/API blocking all passed on 2026-06-03.

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
- Manual transcript confirmation implemented locally on 2026-06-02 as Apex OS Slice 15.
- Folded into the Phase 12 hard-finish on 2026-06-03.
- The Control Room now shows a private Voice Interface where the operator can click to record, stop and transcribe through the server-only provider path when configured, type a manual transcript when needed, confirm the transcript, review the detected voice command, copy the safe read-only Ask Apex question, and play/stop Apex's spoken answer.
- No always-listening behavior, hidden microphone capture, audio storage, transcript persistence, frontend provider secret, voice-triggered execution, schema change, storage change, approval execution, send, spend, customer-visible action, production mutation, or deploy was added in this slice.
- Validation passed with focused Apex OS voice parser/safety tests, broader Apex OS route/nav/permission tests, production-style build, and desktop/mobile browser QA for the private voice + Ask Apex flow with no failed requests and no horizontal overflow.

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

- Read-only first UI implemented locally on 2026-06-02 as Apex OS Slice 9 and hard-finished with Phase 11 on 2026-06-03.
- Current branch/build/test status, launch gate status, deploy readiness packet, rollback evidence, production readiness evidence, demo app readiness evidence, GitHub Actions/smoke evidence, failed test/build monitor, stalled-agent watch, and daily briefing history are visible inside the private Control Room.
- Operator-only Daily Briefing refresh was implemented locally on 2026-06-02 as Apex OS Slice 16, then extended on 2026-06-03 with manual private snapshot save, changed-since-last-saved comparison, and durable `apexOsDailyBriefingHistory`.
- `/api/apex-os/daily-briefing` returns a read-only briefing packet from current local workspace state, durable Apex OS memory summary, release/approval locks, source labels, and next actions; `POST /api/apex-os/daily-briefing/history` stores a sanitized private snapshot only.
- Deploys, rollback execution, production monitoring provider setup, provider calls, production/customer data changes, schema/storage changes, auth/session changes, external notifications, live sends, spend, billing/payment, public publishing, and customer-visible actions remain locked.

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
