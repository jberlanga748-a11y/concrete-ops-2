# Apex HQ Canonical Source Of Truth

Last updated: 2026-05-30

This is the first file to read before any Apex HQ work. It is the one-file consolidation of the Apex HQ product direction, the Concrete Ops to Apex HQ transition, the active repo, stale/archive worktrees, local memories, and no-loop rules.

## Executive Truth

- Product name: Apex HQ.
- Active workspace: `C:\Users\jberl\Documents\New project`.
- Active GitHub remote: `https://github.com/jberlanga748-a11y/concrete-ops-2.git`.
- Production domain: `https://app.apexhq.online/`.
- Fly app: `concrete-ops-2`.
- Fly technical URL: `https://concrete-ops-2.fly.dev/`.
- Current local branch/head at audit time: `main` at `c7e1328`.
- Current production evidence from living plan: Fly version `606`, `/api/ready` healthy on `https://app.apexhq.online/api/ready`; Phase 2 production evidence is recorded in the living plan after deploy.
- Phase baseline: Phase 1 Admin Foundation Finish is complete/frozen. Phase 2 Command Center Finish is built and entering production release under standing approval. The next true tool-completion phase is Phase 3 Growth & Sales Finish.

Use **Apex HQ** everywhere users see the product. `Concrete Ops`, `concrete-ops`, and `concrete-ops-2` are legacy technical names only until a dedicated infrastructure rename phase is planned.

## What Was Searched

The computer-wide Apex/Concrete sweep covered:

- `C:\Users\jberl\Documents`
- `C:\Users\jberl\Desktop`
- `C:\Users\jberl\Downloads`
- `C:\Users\jberl\OneDrive`
- `C:\Users\jberl\.codex`

Search terms included:

- `Apex HQ`
- `ApexHQ`
- `app.apexhq`
- `Concrete Ops`
- `ConcreteOps`
- `concrete-ops`
- `concrete_ops`
- rename/switch/legacy Concrete to Apex language

Search results:

- 780 filename hits for Apex/Concrete-related files.
- 6,187 text-content hits before filtering out session noise, temp uploads, generated output, and caches.
- 147 relevant directories.
- 1,452 high-value roadmap/status/code/asset hits.
- 6 relevant Git repos/worktrees/snapshots.

Secret hygiene:

- `.env*` files were not read.
- Secrets, tokens, passwords, and generated credentials were not copied into this file.
- Old prompt files that contain credentials are classified as historical and should not be committed or repeated.

## Active And Archive Repo Map

### Active Repo

`C:\Users\jberl\Documents\New project`

- Branch: `main`
- Head at audit time: `c7e1328`
- Remote: `https://github.com/jberlanga748-a11y/concrete-ops-2.git`
- Role: current source of truth and production worktree.

All new Apex HQ app work should start here unless the user explicitly gives another active repo path.

### Stale Archive / Reference Only

`C:\Users\jberl\Documents\Codex\concrete-ops-2-clean`

- Branch: `main`
- Head at audit time: `ceba113`
- Remote: `https://github.com/jberlanga748-a11y/concrete-ops-2.git`
- Status after fetch: ahead 1, behind 110.
- Dirty/untracked: large.
- Role: archive/reference only.

This folder is not current. It is missing current Phase 1 completion files such as:

- `docs/APEX_HQ_LIVING_FINISH_PLAN.md`
- `docs/APEX_HQ_TOOL_COMPLETION_BLUEPRINT.md`
- `src/admin-foundation-finish-utils.js`
- `verify:admin-foundation`

It does contain useful older extraction work. Inspect it before related phases, but do not build from it and do not copy it wholesale.

Old-only source files that are useful for the app are classified in the one-file app memory below.

## One-File App Memory: Do Not Build Twice

This section exists so future work starts from what already exists somewhere on this computer, not from guessing.

### Active App Has Newer Work Than The Archive

Do not replace active app files with old archive files. The active repo has newer source files that the old `concrete-ops-2-clean` worktree does not have:

- `src/admin-foundation-finish-utils.js`
- `src/agent-external-gate-settings-utils.js`
- `src/apex-agent-operator-utils.js`
- `src/billing-payments-command-utils.js`
- `src/communication-provider-readiness-utils.js`
- `src/core-operations-loop-utils.js`
- `src/customer-portal-command-utils.js`
- `src/estimate-proposal-finish-utils.js`
- `src/field-mode-finish-utils.js`
- `src/growth-command-utils.js`
- `src/integrations-command-utils.js`
- `src/reputation-portfolio-utils.js`
- `src/sales-follow-up-system.js`
- related focused tests
- newer `shared/communicationProviderReadiness.js`
- newer `shared/timeLocationPresence.js`
- newer `server/customer-portal-access-records.test.js`

These are active production-era systems. Treat them as current app truth and extend them only through the assigned finish phase.

### Archive Files That Are Actually Useful

These old-only archive files are useful because they solve app-architecture or workflow organization problems. They should be inspected before building similar work so Apex HQ does not redo the same thinking.

| Archive file | Useful for | How to use it |
| --- | --- | --- |
| `src/workspace-route-dispatcher.jsx` | Extracting route rendering out of giant `App.jsx`. | Use as a reference for a future App.jsx decomposition, route-level lazy loading, and role-safe route dispatch. Do not copy wholesale because active routes are newer. |
| `src/workspace-derived-state.js` | Centralizing dashboard, lead, job, customer, notification, and command-center derived state. | Reuse the pattern when App state starts duplicating calculations. Compare against active `app-state-utils`, `command-center-utils`, lead/job/customer utilities, and newer command layers. |
| `src/workspace-assistant-state.js` | Centralizing Apex Assistant / Agent state with permission-aware context. | Useful before touching Apex Agent, AI Office, Agent OS, action inbox, or assistant context. Preserve current newer operator/growth/portal/billing/integration command layers. |
| `src/workspace-intent-handlers.js` | Turning dashboard/agent/action buttons into real routed workflows with permission checks. | Useful before adding command buttons so new actions open records/tools instead of becoming dead-end cards. |
| `src/workspace-navigation-config.js` | App-wide route/tool inventory. | Use as a checklist so no tool gets forgotten. Reconcile with current navigation, package gates, and field-role restrictions. |
| `src/workspace-print-handlers.js` | Centralizing print packet handlers. | Useful when print actions are duplicated across reports, estimates, jobs, change orders, and proof closeout. Keep field-safe packet boundaries. |
| `src/app-autosave-handlers.js` | Customer/lead/job autosave extraction. | Useful if autosave behavior is duplicated, buggy, or hard to reason about. Verify against current API/state shape before porting. |
| `src/app-route-navigation-handlers.js` | Deep-link navigation and selected record routing. | Useful before changing route paths, selected records, support seeds, public routes, password reset, or imported draft links. |
| `src/app-route-selection-sync.js` | Keeping URL route state and selected records in sync. | Useful for direct links to customers/leads/jobs/reports/imported drafts/users/time entries. |
| `src/app-job-time-handlers.js` | Job assignment, foreman assignment, clock-in/out, breaks, and time correction handlers. | Useful before finishing payroll prep, job assignment, or field time. Preserve current permission checks and no payroll-cost exposure. |
| `src/app-record-field-handlers.js` | Inline lead/customer/job edit handlers with autosave. | Useful if field/edit handlers are duplicated inside App.jsx. Preserve role checks. |
| `src/app-initial-forms.js` | Consolidating initial form/draft objects. | Useful if form defaults drift between pages. Verify against current public request, lead source, setup, and newer app state. |
| `src/command-center-page.jsx` | Older owner/admin command center layout and routing ideas. | Use as design/workflow reference only. Current app has newer command layers. |
| `src/dashboard-page-polished-components.jsx` | Older dashboard composition: focus board, command rail, today coordination, queue, lead detail, jobs table. | Useful for dashboard/workflow clarity, not as a replacement. |
| `src/settings-page-components.jsx` | Older Settings decomposition and app-health/settings focus structure. | Useful if Settings needs decomposition. Active Settings now has newer Admin Foundation, Billing, and Integrations commands. |
| `src/pre-pour-route-components.jsx` | Mobile accordion/workbench structure for pre-pour. | Useful if active pre-pour needs mobile UX or workflow finish work. |
| `src/post-pour-route-components.jsx` | Mobile/workbench structure for post-pour. | Useful if active post-pour needs mobile UX or closeout linkage work. |
| `src/public-route-components.jsx` | Lazy public route components. | Useful if public routes get decomposed. Active public intake is newer. |
| `src/copilot-page-components.jsx` | Older Apex Assistant page component split. | Reference only. Active app has newer Apex Agent Operator and AI Office work. |

### Archive Files That Are Not App-Reusable

The archive does not contain newer hidden backend or data work:

- No unique `server` files missing from active repo.
- No unique `shared` files missing from active repo.
- No unique `scripts` missing from active repo.
- No unique Supabase migrations missing from active repo.

Therefore, do not go looking in `concrete-ops-2-clean` for a finished backend feature to copy. Its value is mostly old frontend decomposition, routing, state, handler, and workflow organization.

### App-Wide Product Ideas Already Captured In Old Notes

These ideas appeared in old Concrete Ops/Apex notes. They are not finished app features unless active code proves otherwise. Keep them in this one file so they do not get forgotten or rediscovered later.

| Idea | Current classification | Build rule |
| --- | --- | --- |
| Warranty / callback tracking | Later | Build after jobs/closeout/proof are stable. |
| Punch list | Later | Likely belongs with job closeout, customer portal, and field proof. |
| Inspection tracking | Later | Could connect to jobs, permits, daily reports, proof, and closeout. |
| Permit tracking | Later | Do not overbuild; provider/city integration is later. |
| Subcontractor/vendor tracking | Later | Keep separate from employee/payroll and supplier/material workflows. |
| Supplier management | Later | Useful for delivery tickets/material prep; no automatic purchasing. |
| Material provider map | Later / provider-dependent | Maps/provider hookup later; no hidden GPS. |
| Job route/map planning | Provider-dependent | Needs maps/location provider and visible consent boundaries. |
| Customer approvals/signatures | Provider-dependent | Tie to proposals, change orders, customer portal, and e-signature provider. |
| Internal vs customer-visible notes | Important | Must be enforced before customer portal/public sharing expands. |
| Production metrics | Later | Needs job lifecycle, time, proof, estimates, and closeout data quality. |
| CSV import/export | Later | Must preserve tenant/role safety and secret redaction. |
| Terms/contract templates | Later | Owner/admin only; no legal overclaiming. |
| Pre-existing damage log | Later | Belongs with proof/photos, job startup, and customer-safe packets. |
| Job closeout packet | Important | Connect proof, reports, tickets, change orders, billing readiness, and customer-safe summaries. |
| Voice-to-text field notes | Provider-dependent | Useful, but requires provider/privacy review and field-visible consent. |
| AI photo tagging | Provider-dependent | Useful, but no fake proof and no hidden metadata exposure. |
| QuickBooks export | Provider-dependent | Provider setup only until account/API/secrets are configured. |
| Certified payroll / payroll prep | Missing as workflow | Time exists; payroll-ready review/export is not payroll processing. Field users never see payroll costs. |
| Device/session management | Later / security | Useful launch hardening; owner/admin only. |
| Required photo rules by job stage | Later | Connect to field proof, pre/post-pour, closeout, and job readiness. |
| Material over/under tracking | Later | Connect estimate, material prep, delivery tickets, and closeout. |
| Crew productivity reports | Later | Needs careful field/payroll/margin safety. |
| Employee certifications/license tracking | Later | Employee/admin workflow; field privacy matters. |
| PWA/offline/app packaging | Later | Offline drafts are later; do not claim offline editing until built. |

### App Tools Already Present Somewhere In Active Apex HQ

These areas exist in the active app or active repo memory. Before building any of them, search active code first and extend existing systems:

- Customers
- Leads
- Lead sources
- Opportunity Scout / Client Finder
- Agent Leads / Daily Job Finder readiness
- Public estimate request / website lead intake
- Sales follow-up
- Communications
- Contact history
- Estimates
- Proposals
- PDF/print packets
- GC packet pieces
- Foreman handoff packets
- Jobs
- Schedule
- Crew/job assignments
- Field Mode
- Time tracking
- Daily reports
- Uploads/photo evidence
- Delivery tickets
- Pre-pour
- Post-pour
- Change orders
- Safety incidents
- Toolbox talks
- PPE
- Tool checklist
- Calculator
- Rate book
- Material prep
- Imported drafts
- Employees/users/roles
- Settings
- App Health
- Support
- Package/entitlement readiness
- Billing/payment provider readiness
- Customer portal preview/share approval readiness
- Integration readiness
- Apex Assistant / AI Office
- Agent OS / action inbox
- Growth Command Center
- Ads spend advisor readiness
- Reputation and portfolio readiness

Build rule: if the tool is on this list, assume it already exists and must be audited in active code before adding a new surface.

### App Areas That Are Not Finished Workflows Yet

These should not be sold or treated as complete just because panels/readiness layers exist:

- live ad publishing or spend
- live SMS/email sending
- live customer portal token redemption/customer sessions
- live payment processing
- live QuickBooks/accounting writes
- live calendar/file/provider writes
- payroll processing
- certified payroll
- automatic purchasing
- automatic bid submission
- hidden GPS or passive location tracking
- public self-serve SaaS launch
- accounting replacement
- guaranteed lead generation

Build rule: create provider-ready states and review packets, but keep live execution locked until provider setup and safe workflow implementation exist.

### Before Building Any Tool

Use this no-duplicate sequence:

1. Search active repo for the tool name, route, utility, server API, shared module, and tests.
2. Check this one-file app memory for whether old archive work exists.
3. If an archive file exists, inspect it for patterns only.
4. Compare against current active code.
5. Port only what still fits.
6. Add/update focused tests.
7. Update this file only if the app truth changes.

### Older Git Worktrees / Historical

These exist and point to old Concrete Ops/Apex work:

- `C:\Users\jberl\Documents\Codex\2026-04-25-github-plugin-github-openai-curated-https\concrete-ops-2`
  - Head `170c4e4`
  - Same `concrete-ops-2` remote
  - Historical only.
- `C:\Users\jberl\Documents\Codex\2026-04-25-import-react-usememo-usestate-from-react`
  - Head `44fbd99`
  - Same `concrete-ops-2` remote
  - Historical only.
- `C:\Users\jberl\Documents\Codex\concrete-ops-repo`
  - Branch `codex/premium-surface-polish`
  - Head `d8371be`
  - Remote `https://github.com/jberlanga748-a11y/concrete-ops.git`
  - Older repo lineage, historical only.
- `C:\Users\jberl\Documents\New project\last-yard-proposal-mockup`
  - Head `482c1eb`
  - Remote `https://github.com/jberlanga748-a11y/last-yard-concrete-proposal-generator.git`
  - Proposal generator side project, not Apex HQ active source.

### Snapshot Folders / Historical

These are release/snapshot/archive folders, not the active repo:

- `C:\Users\jberl\Documents\Codex\concrete-ops-2-prod-deploy-1866fc8`
- `C:\Users\jberl\Documents\Codex\concrete-ops-2-prod-deploy-8e58568`
- `C:\Users\jberl\Documents\Codex\concrete-ops-2-prod-deploy-cee221e`
- `C:\Users\jberl\Documents\Codex\concrete-ops-2-prod-release-60aa665`
- `C:\Users\jberl\Documents\Codex\concrete-ops-2-release-agent-os`
- `C:\Users\jberl\Documents\Codex\concrete-ops-clean-restart`
- `C:\Users\jberl\Documents\Codex\concrete-ops-rebuild`

### Download Archives / Historical

Download archives exist for old starter products and early app versions:

- `concrete-ops-ai-starter.zip`
- `concrete-ops-main.zip`
- `concrete-ops-main (1).zip`
- `concrete-ops-main (2).zip`
- `concrete-ops-main (3).zip`
- `concrete_ops_ai_first_products.zip`
- `pnw-concrete-launch-pack.zip`
- older PNW starter/fix zips

They are useful only as history. The extracted/current repo has moved far beyond them.

## Concrete Ops To Apex HQ Transition

The oldest downloaded planning file, `C:\Users\jberl\Downloads\coccrete ops 2.txt`, shows the original product as **Concrete Ops** in first-pilot mode. It listed:

- repo `jberlanga748-a11y/concrete-ops-2`
- internal/testing, demo, and Last Yard pilot Fly apps
- built modules such as customers, leads, estimates, jobs, crews, users, role permissions, field workspaces, time, daily reports, uploads/photo evidence, safety, toolbox/PPE, tool checklist, calculator, pre/post-pour, change requests, delivery tickets, settings, print packets, demo data, and Last Yard pilot app setup
- early "do not build right now" items such as billing, QuickBooks, SMS, customer portal, payroll/pay rates, global rewrites, and huge new modules before pilot feedback

That file also contains old credentials and pilot details. Do not copy those details into repo docs or prompts.

The modern product is **Apex HQ**. The active app has brand normalization tests in `src/brand-utils.test.js` proving legacy Concrete Ops visible names normalize to Apex HQ names. Current active source search found `Concrete Ops` in code only in brand-normalization tests, not active user-facing app copy.

Rules for the rename:

- Replace visible Concrete Ops copy with Apex HQ when touching screens, docs meant for users, or public-facing copy.
- Keep technical identifiers until an infrastructure rename phase: GitHub repo, Fly app, package name, env vars, test names, import file names, historical docs, and old URLs.
- A full infrastructure rename is its own phase because it touches deployment, env, secrets, DNS, CI, rollback, monitoring, docs, and user access.

## Local Memories Found

### Repo Memories

Current repo memory files:

- `docs/APEX_HQ_LIVING_FINISH_PLAN.md`
- `docs/APEX_HQ_TOOL_COMPLETION_BLUEPRINT.md`
- `docs/APEX_HQ_BUILD_STATUS_AND_PHASES.md`
- `docs/apex-hq-command-binder.md`
- `APEX_HQ_MASTER_ROADMAP.md`
- `APEX_HQ_MASTER_CHECKLIST.md`
- `.agents/APEX_WORKSTREAMS.md`
- `.agents/APEX_STATUS.md`

Important correction: `.agents/APEX_STATUS.md` is stale. It still names `C:\Users\jberl\Documents\Codex\concrete-ops-2-clean` and old Fly version `v483`. Do not use it as current truth without checking this canonical file and the living plan.

### Codex Automation Memories

Found Apex HQ automation memories:

- `C:\Users\jberl\.codex\automations\apex-hq-daily-business-operator\memory.md`
- `C:\Users\jberl\.codex\automations\apex-hq-daily-gtm-prep\memory.md`
- `C:\Users\jberl\.codex\automations\apex-hq-daily-instagram-operator\memory.md`
- `C:\Users\jberl\.codex\automations\apex-hq-daily-email-triage\memory.md`

Memory summary:

- Apex GTM posture is founder-led demos and controlled pilots.
- Current early targets are local/warm contractor prospects, with outreach drafts requiring John approval before sending.
- Instagram/social work is draft-only until exact post language is approved.
- Email triage found no new Apex HQ contractor/customer/pilot inbound needing reply as of 2026-05-29.
- Growth language must avoid guaranteed leads, autopilot claims, payroll/accounting replacement, fake proof, and unsupported public-launch claims.

### Codex Skills

Several installed skills were found hard-coded to the stale `concrete-ops-2-clean` folder. They were corrected on 2026-05-30 to point to:

`C:\Users\jberl\Documents\New project`

Corrected skill files:

- `C:\Users\jberl\.codex\skills\apex-hq-appjsx-decomposer\SKILL.md`
- `C:\Users\jberl\.codex\skills\apex-hq-auth-role-debugger\SKILL.md`
- `C:\Users\jberl\.codex\skills\apex-hq-bundle-surgeon\SKILL.md`
- `C:\Users\jberl\.codex\skills\apex-hq-secret-hygiene\SKILL.md`
- `C:\Users\jberl\.codex\skills\apex-hq-release-stabilizer\SKILL.md`
- `C:\Users\jberl\.codex\skills\apex-hq-test-command-router\SKILL.md`
- `C:\Users\jberl\.codex\skills\apex-idea-creator\references\apex-source-order.md`
- `C:\Users\jberl\.codex\skills\apex-finished-vision\references\build-prompts.md`
- `.agents\skills\apex-platform-operator\SKILL.md`

Remaining mentions of `concrete-ops-2-clean` in skills now mark it as archive/reference only.

## Current Repo Inventory

### Docs

Active repo docs:

- `C:\Users\jberl\Documents\New project\docs` has 197 docs.
- `concrete-ops-2-clean\docs` has 177 docs.
- Old clean has no docs that are absent from the active repo.
- Active repo has 20 docs that old clean lacks.

Active-only docs include:

- `APEX_HQ_CANONICAL_SOURCE_OF_TRUTH.md`
- `APEX_HQ_LIVING_FINISH_PLAN.md`
- `APEX_HQ_TOOL_COMPLETION_BLUEPRINT.md`
- `APEX_HQ_VERTICAL_FINISH_PHASE_PLAN.md`
- `APEX_HQ_PHASE_1_ADMIN_FOUNDATION_PREBUILD_AUDIT.md`
- `APEX_HQ_CHANGE_ORDER_MONEY_STATUS.md`
- `APEX_HQ_COMMUNICATION_PROVIDER_READINESS_STATUS.md`
- `APEX_HQ_CUSTOMER_PORTAL_TOKENIZED_READINESS_STATUS.md`
- `APEX_HQ_EXTERNAL_GATE_READINESS_STATUS.md`
- `APEX_HQ_JOB_COSTING_READINESS_STATUS.md`
- `APEX_HQ_MATERIAL_PURCHASING_PREP_STATUS.md`
- `APEX_HQ_ROADMAP_HARDENING_STATUS.md`
- `APEX_HQ_SCHEDULING_GATE_READINESS_STATUS.md`
- `APEX_AGENT_LEADS_DAILY_REVIEW_WORKFLOW.md`
- `APEX_AGENT_OPERATOR_GUIDE.md`
- `APEX_AGENT_OS_V1_*` release/preservation/monitoring packet docs
- `TIME_TRACKING_LOCATION_EVIDENCE.md`

### Source Files

Active repo `src` compared to `concrete-ops-2-clean`:

- Active `src`: 305 files.
- Old clean `src`: 310 files.
- Active-only `src`: 31 files.
- Old-only `src`: 36 files.

Active-only source files show the production app has newer work that old clean does not:

- `admin-foundation-finish-utils.js`
- `agent-external-gate-settings-utils.js`
- `agent-leads-inbox-ui.test.js`
- `apex-agent-operator-utils.js`
- `billing-payments-command-utils.js`
- `communication-provider-readiness-utils.js`
- `core-operations-loop-utils.js`
- `customer-portal-command-utils.js`
- `estimate-proposal-finish-utils.js`
- `field-mode-finish-utils.js`
- `growth-command-utils.js`
- `integrations-command-utils.js`
- `public-estimate-request-form.test.js`
- `reputation-portfolio-utils.js`
- `sales-follow-up-system.js`
- related focused tests
- `ProposalGenerator.jsx`
- `proposal-utils.js`

Old-only source files show the stale archive has component extraction/refactor attempts not present in active source:

- `command-center-page.jsx`
- `dashboard-page-polished-components.jsx`
- `workspace-route-dispatcher.jsx`
- `workspace-derived-state.js`
- `workspace-assistant-state.js`
- `workspace-intent-handlers.js`
- `workspace-navigation-config.js`
- `workspace-print-handlers.js`
- `settings-page-components.jsx`
- `settings-route-utils.js`
- `copilot-page-components.jsx`
- `public-route-components.jsx`
- `pre-pour-route-components.jsx`
- `post-pour-route-components.jsx`
- `app-*` handler extraction files

Active repo `shared` compared to old clean:

- Active-only shared files:
  - `communicationProviderReadiness.js`
  - `communicationProviderReadiness.test.js`
  - `timeLocationPresence.js`
  - `timeLocationPresence.test.js`
- Old clean has no shared-only files missing from active.

Active repo `server` compared to old clean:

- Active-only server file:
  - `customer-portal-access-records.test.js`
- Old clean has no server-only files missing from active.

## Product State From Current Files

### Built / Frozen

- Admin Foundation Finish.
- Imported Drafts route fix.
- Job draft imports auth helper fix.
- `verify:admin-foundation`.
- Settings Admin Foundation Finish Board.
- Phase 2 Command Center Finish.
- Role-safety baseline.
- Brand normalization from Concrete Ops to Apex HQ.

### Built Or Provider-Ready Command Layers

These exist in active source and living-plan reports. Treat them as built command/readiness layers unless the current phase explicitly finishes the full tool workflow:

- Growth Command Center.
- Website/public estimate request intake.
- Sales Follow-Up System.
- Reputation + Portfolio Engine.
- Estimate Studio proposal finish layer.
- Core Operations Loop.
- Field Mode Finish layer.
- Apex Agent Operator.
- Customer Portal Command and Communications provider readiness.
- Billing / Payments / Packages Command.
- Integrations Command.
- Daily Command Plan for owner/admin Command Center, including routed next actions and provider setup locks.

Important: the user rejected "little slices of everything." Do not treat these command/readiness layers as proof that the whole vertical workflow is permanently finished. The active finish standard is the tool-by-tool blueprint.

### Needs True Tool-Completion Phases

Use `docs/APEX_HQ_TOOL_COMPLETION_BLUEPRINT.md` for the real finish order:

1. Admin Foundation Finish - complete/frozen.
2. Command Center Finish - complete/frozen after production health check.
3. Growth & Sales Finish - next true phase.
4. Estimate & Proposal Finish.
5. Job Operations Finish.
6. Field Execution Finish.
7. Safety & Compliance Finish.
8. Change Order Finish.
9. Closeout & Billing Prep Finish.
10. Payroll Prep Finish.
11. Communications Finish.
12. Assistant Finish.
13. Launch Hardening.

## Source Of Truth Order

When files disagree, use this order:

1. `docs/APEX_HQ_CANONICAL_SOURCE_OF_TRUTH.md`
2. `docs/APEX_HQ_LIVING_FINISH_PLAN.md`
3. `docs/APEX_HQ_TOOL_COMPLETION_BLUEPRINT.md`
4. `AGENTS.md`
5. `README.md`
6. `docs/apex-hq-command-binder.md`
7. `docs/APEX_HQ_BUILD_STATUS_AND_PHASES.md`
8. `APEX_HQ_MASTER_ROADMAP.md`
9. `APEX_HQ_MASTER_CHECKLIST.md`
10. `.agents/APEX_WORKSTREAMS.md`
11. `.agents/APEX_STATUS.md`
12. business, launch, marketing, sales, phase, and historical docs

Older files are allowed to preserve history, but they must not override the canonical file, living plan, or tool-completion blueprint.

## Product North Star

Apex HQ is a contractor growth and operations platform. A finished contractor should be able to open it and clearly use it to:

- find new leads
- decide where to advertise
- follow up with prospects
- create professional proposals
- win jobs
- schedule crews
- guide field work
- collect proof
- handle changes
- prepare billing/payment workflows
- get reviews and referrals
- understand what to do next every day

Core loop:

Find work -> advertise smart -> capture lead -> follow up -> estimate -> propose -> win -> schedule -> run field work -> prove work -> close out -> get paid -> create more trust and leads.

## Operating Rules

- Do not rebuild working systems.
- Do not randomly redesign the app.
- Do not loosen permissions.
- Do not expose secrets or add frontend secrets.
- Do not touch production data.
- Do not send email/SMS automatically.
- Do not publish ads or spend money automatically.
- Do not process payments automatically.
- Do not add hidden GPS tracking.
- Do not mix unrelated work into one phase.
- Build provider-ready states when paid accounts or API keys are missing.
- Finish a whole tool/workflow phase, freeze it, and move on.
- After a phase is finished, touch it only for bugs, security/permission issues, mobile blockers, provider hookups, or approved versioned upgrades.

The user has standing approval for verified app deployments after completed phases. That does not authorize real customer sends, ad spend, payment processing, provider writes, destructive data changes, hidden GPS, or secret/account setup.

## Field Role Protection

Field users must never see:

- leads
- estimates
- pricing
- profit or margins
- payroll costs
- office-only notes
- admin settings
- company setup
- AI office tools
- billing
- package controls
- other company data

Any workflow touching pricing, payroll, margins, billing, customers, leads, growth, ads, settings, integrations, or automation must remain owner/admin safe.

## Provider-Dependent Boundaries

Build the UI, data model, adapter shape, disabled state, setup checklist, health status, tests, and audit trail even when a provider is not connected.

Provider-dependent work includes:

- Stripe or chosen payment provider.
- Twilio / SendGrid / SMS / email sending.
- Gmail / Google Calendar.
- Google Ads / Meta Ads / Local Services Ads reporting or publishing.
- QuickBooks.
- DocuSign or e-signature.
- Google Drive / CompanyCam / maps/weather integrations.
- Payroll providers such as QuickBooks Payroll, Gusto, ADP, or certified-payroll tools.
- Any real ad spend, payment, customer send, bid submission, purchasing, provider write, production data mutation, or hidden location behavior.

## Other Related Local Files

### Desktop Contractor Website File

`C:\Users\jberl\Desktop\live youre future\Company.txt`

This is not Apex HQ source. It describes a separate contractor website/project and mentions future form leads feeding into Concrete Ops. Treat it as future integration/customer-context reference only. Do not copy personal contact details into repo docs.

### Downloads

Downloads contain:

- old screenshots from Fly/Vercel builds
- old job draft JSON imports
- Apex logo image
- Last Yard proposal PDFs and proposal generator material
- old starter zips
- the old `coccrete ops 2.txt` transition/planning file

Use these as history or test/import references only. Do not treat them as current product truth.

## Archive Harvest Rule

Before starting each phase:

1. Read this file.
2. Read the living finish plan.
3. Read the tool completion blueprint.
4. Confirm active repo with `git status --short --branch`.
5. Search the active repo for the tool/workflow.
6. Search archive folders only after the active repo is understood.
7. Compare old archive code to current code.
8. Port only useful pieces.
9. Record what was reused, ignored, and frozen.

This prevents the user from having to discover already-built or previously-attempted work after the fact.

## Command Center Phase 2 Pre-Start Notes

Phase 2 Command Center Finish was built from the active files below, using the archive files only as reference and without rebuilding the app from scratch.

Before future Command Center changes:

- Inspect current active files:
  - `src/command-center-route-components.jsx`
  - `src/command-center-utils.js`
  - `src/dashboard-command-rail-components.jsx`
  - `src/dashboard-focus-board-components.jsx`
  - `src/dashboard-guidance-components.jsx`
  - `src/dashboard-queue-components.jsx`
  - `src/dashboard-route-wrapper-components.jsx`
  - `src/dashboard-today-work-components.jsx`
  - `src/owner-admin-mobile-command-components.jsx`
  - `src/today-command-page-components.jsx`
  - `src/core-operations-loop-utils.js`
- Compare stale archive files:
  - `concrete-ops-2-clean\src\command-center-page.jsx`
  - `concrete-ops-2-clean\src\dashboard-page-polished-components.jsx`
  - `concrete-ops-2-clean\src\workspace-route-dispatcher.jsx`
  - `concrete-ops-2-clean\src\workspace-derived-state.js`
  - `concrete-ops-2-clean\src\workspace-assistant-state.js`
  - `concrete-ops-2-clean\src\workspace-intent-handlers.js`
  - `concrete-ops-2-clean\src\workspace-navigation-config.js`
- Do not rebuild the command center from scratch.
- Preserve the Daily Command Plan as the owner/admin first-screen answer.
- Every command action must continue routing to existing tools or locked provider/setup states.
- Field users must remain assigned-work only and must not see office, growth, billing, provider setup, pricing, margin, payroll, or company setup data.

## Phase Completion Standard

At the end of each phase:

- focused phase tests
- `npm.cmd run verify:roles`
- `npm.cmd run build`
- `git diff --check`
- owner/admin desktop browser QA
- field/mobile browser QA when relevant
- hosted smoke after deploy
- production `/api/ready`
- update `docs/APEX_HQ_LIVING_FINISH_PLAN.md`
- update this file if the canonical truth changed
- commit, push, deploy, and record deploy evidence when the phase is complete

Phase report must include:

- goal
- what was already built
- what was completed now
- provider/account-dependent remaining work
- affected files
- tests run
- browser QA
- permissions impact
- field-user impact
- mobile impact
- deploy version
- health check
- rollback note
- next phase

## Future Chat Startup Prompt

Use this when starting a new chat:

```
You are working on Apex HQ in C:\Users\jberl\Documents\New project.
First read docs/APEX_HQ_CANONICAL_SOURCE_OF_TRUTH.md, docs/APEX_HQ_LIVING_FINISH_PLAN.md, docs/APEX_HQ_TOOL_COMPLETION_BLUEPRINT.md, AGENTS.md, and README.md.
Use Apex skills: apex-master-coordinator, apex-product-architect, apex-feature-builder, apex-permission-safety, apex-qa-engineer, apex-finished-vision. Use growth/sales/ads/reputation skills when the phase touches those areas.
Do not build from C:\Users\jberl\Documents\Codex\concrete-ops-2-clean. That folder is archive/reference only.
Before building, search the active repo for the tool/workflow and inspect archive work only as reference.
Do not rebuild working systems. Finish the next active tool-completion phase, verify it, commit, push, deploy, health-check, update the living plan, and stop with a phase report.
```
