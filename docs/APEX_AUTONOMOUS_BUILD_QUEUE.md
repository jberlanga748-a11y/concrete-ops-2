# Apex HQ Autonomous Build Queue

Last updated: 2026-05-22

Purpose: keep Apex HQ autonomous build work focused on pilot-ready SaaS outcomes without looping, touching unrelated dirty docs, or drifting into production-risk work.

## Operating Rules

- Pick the highest-priority safe task that is not blocked.
- Complete one focused task at a time.
- Verify before commit.
- Commit only focused related files.
- Push after tests pass.
- Deploy only to approved non-production targets when useful.
- Use Fly demo only with `fly.demo.toml`; never use `fly.toml` without explicit production approval.
- Stop for approval before production deploys, secrets/env changes, destructive database work, billing/payment changes, customer data mutation, live Supabase/RLS migration, or outbound email/text/outreach.

## Current State

- Repo branch: `main`
- Production path: Fly app `concrete-ops-2`, locked unless backup-first production release is explicitly approved.
- Demo path: Fly app `concrete-ops-demo`, approved for backup-first demo deploy/smoke only.
- Vercel: preview/frontend smoke only.
- Current pilot focus: first friendly fencing pilot.
- Current safe demo command: `npm.cmd run pilot:fencing-preflight -- --run --json`
- Current pre-login intake gate: `npm.cmd run pilot:fencing-intake -- --json`

## Priority Legend

- P0: build/auth/roles/data safety
- P1: pilot blockers
- P2: hosted smoke/demo reliability
- P3: UX/mobile polish
- P4: docs/support/business ops

## Completed Autonomous Tasks

| Date | Priority | Task | Result | Commit |
| --- | --- | --- | --- | --- |
| 2026-05-22 | P3 | Support desktop assistant overlap polish | Done; support request drawer summary now reserves desktop space for the floating Apex Assistant trigger so the first viewport action row stays readable while support workflow behavior remains unchanged | This commit |
| 2026-05-22 | P3 | Estimate Studio tablet rail polish | Done; tablet Estimate Studio now keeps the option rail, selected proposal workbench, and branded customer/proposal rail visible together at 1024px with no horizontal overflow while phone stacking and field blocking remain safe | `b008654` |
| 2026-05-22 | P3 | Estimate proposal first-viewport polish | Done; selected proposal is promoted in the option rail and Estimate Studio proposal density/branding is tightened for a stronger branded first viewport while estimate/role/build/browser checks remain clean | `f91e412` |
| 2026-05-22 | P3 | Field next job card extraction | Done; next assigned job mobile card moved into `src/field-route-components.jsx` with import-boundary coverage, field/role/build checks, and browser audits passing for employee mobile field routes | `cfe0bd7` |
| 2026-05-22 | P3 | Field assignment summary extraction | Done; field job summary cards and assignment notice panel moved into `src/field-route-components.jsx` with import-boundary coverage, field/role/build checks, and browser audits passing for employee mobile field routes | `f1024f5` |
| 2026-05-22 | P3 | Field mobile disclosure extraction | Done; mobile field detail/workspace disclosure wrappers moved into `src/field-route-components.jsx` with import-boundary coverage, field/role/build checks, and browser audits passing for employee mobile field routes | `d1798d8` |
| 2026-05-22 | P3 | Field mobile shell helper extraction | Done; field action grid, mobile nav ordering, and bottom quick nav moved into `src/field-route-components.jsx` with import-boundary coverage, field/role/build checks, and browser audits passing for employee mobile field routes | `987a930` |
| 2026-05-22 | P3 | Job startup/calculation card extraction | Done; job startup checklist and internal calculation cards moved into `src/job-route-components.jsx` with import-boundary coverage, job/role/build checks, and browser audits passing for admin and employee `/jobs` access | `ae93f6e` |
| 2026-05-22 | P3 | Job planner route component extraction | Done; job planner/create-job form moved into `src/job-route-components.jsx` with import-boundary coverage, job/role/build checks, and browser audits passing for admin and employee `/jobs` access | `9fce277` |
| 2026-05-22 | P3 | Lead intake route component extraction | Done; lead intake form and shared lead source options moved into `src/lead-route-components.jsx` with import-boundary coverage, lead/role/build checks, and browser audits passing for admin and employee `/leads` access | `23d49dc` |
| 2026-05-22 | P2 | Sunday pilot evidence refresh after Fly demo v166 | Done; backup-first Fly demo v166 deploy passed hosted smoke, admin desktop, admin tablet, employee phone field/restricted audits, mobile assistant regression, roles, and local Sunday app rehearsal while real-company outside access remains intake-gated | `e05e1c4` |
| 2026-05-22 | P3 | Mobile assistant trigger overlap fix | Done; closed Apex Assistant trigger now flows below mobile content instead of floating over command tiles, while the opened assistant remains a fixed drawer and employee phone redirects stay safe | `df55b49` |
| 2026-05-22 | P3 | App Health desktop KPI clipping fix | Done; `/app-health` desktop KPI tiles now keep helper/action content inside the card without visual-audit clipping, while employee routes still redirect to Field Mode | `794f459` |
| 2026-05-22 | P3 | Office activity panel extraction | Done; generic recent activity and audit trail panels moved out of `App.jsx` into `src/office-activity-route-components.jsx` with import-boundary coverage, roles/build/customer checks, and focused browser audits passing for command center and settings | `d11f4c0` |
| 2026-05-22 | P3 | Contact history route component extraction | Done; shared contact history UI moved out of `App.jsx` into `src/contact-history-route-components.jsx` with import-boundary coverage, customer/lead/role/build checks, and browser audits passing for leads, customers, and communications | `ffc9ead` |
| 2026-05-22 | P2 | Sunday pilot evidence refresh after estimate polish | Done; local Sunday app rehearsal checks passed, Fly demo v164 walkthrough preflight passed, current desktop/tablet/employee route manifests recorded, and real-company outside access remains gated until intake details are supplied | `f9234fc` |
| 2026-05-22 | P3 | Estimate Studio tablet layout tightening | Done; `/estimates` tablet composition now gives the proposal workbench more width, converts the branded rail into an internal-scroll tablet rail, compacts the assistant dock, and keeps field users blocked | `2024550` |
| 2026-05-22 | P1 | Estimate Studio branded proposal first viewport | Done; `/estimates` now defaults to a meaningful priced branded proposal instead of a zero-dollar draft, and the proposal brand strip is readable in the workbench while field users remain blocked | `c9d27cf` |
| 2026-05-22 | P4 | PWA pilot install walkthrough | Done; Sunday pilot guide explains iPhone/iPad, Android, and desktop install, role-safe first-launch checks, support notes, and clear no-offline-editing language | `9a6dfde` |
| 2026-05-22 | P3 | PWA installability hardening | Done; manifest now has stable app identity, dark shell install theme, tablet-safe orientation, role-safe field shortcuts, and tests that keep private-data/offline caching out of the pilot PWA path | `c663ea4` |
| 2026-05-22 | P3 | Lead readiness assistant card extraction | Done; lead scoring, missing-info, and AI draft cards moved into the lead route component module with import-boundary coverage, full leads/roles/build checks, and Fly demo v160 hosted smoke passing | `ad7e9d8` |
| 2026-05-22 | P3 | Command Center KPI primitive extraction | Done; shared Command Center KPI, section, item, and module strip primitives moved into the route component module with import-boundary coverage, build/role/browser checks, and Fly demo v159 hosted smoke passing | `4d57c1c` |
| 2026-05-22 | P3 | Command Center presentation card extraction | Done; Command Center presentation cards moved into a route component module with import-boundary coverage, local build/role/browser checks, and Fly demo v158 hosted smoke passing | `895f809` |
| 2026-05-22 | P3 | Settings command rail extraction | Done; Settings right rail/mobile rail moved into the settings route component module with import-boundary coverage, local build/role/entitlement/browser checks, and Fly demo v157 hosted smoke passing | `0dcb572` |
| 2026-05-22 | P3 | Owner health status panel extraction | Done; Owner Health Status moved into the App Health route component module with import-boundary coverage, owner-health API/utility tests, build/server/role/browser checks, and Fly demo v156 hosted smoke passing | `89c219a` |
| 2026-05-22 | P3 | Settings plan readiness panel extraction | Done; Plan Readiness moved into a settings route component module with import-boundary coverage, local build/role/entitlement/browser checks, and Fly demo v155 hosted smoke passing | `58b88ff` |
| 2026-05-22 | P3 | Customer portal manual preview panel extraction | Done; Settings customer portal manual preview moved into the App Health route component module with import-boundary coverage, preview packet tests, local build/role/entitlement/browser checks, and Fly demo v154 hosted smoke passing | `9fdc6da` |
| 2026-05-22 | P3 | App Health install/style panel extraction | Done; PWA install guidance and UI style foundation panels moved into the App Health route component module with design/PWA tests, local build/role/browser checks, and Fly demo v153 hosted smoke passing | `2ffb0e4` |
| 2026-05-22 | P3 | App Health release safety panel extraction | Done; Release Safety / Rollback panel moved into the App Health route component module with release-safety tests, local build/role/browser checks, and Fly demo v152 hosted smoke passing | `057246c` |
| 2026-05-22 | P3 | App Health trust readiness panel extraction | Done; Enterprise Trust Readiness panel moved into the App Health route component module with import-boundary coverage, local build/role/browser checks, and Fly demo v151 hosted smoke passing | `77b8cf5` |
| 2026-05-22 | P3 | App Health audit activity panel extraction | Done; App Health audit/activity trust panel moved into a route component module with import-boundary coverage, local build/role/browser checks, and Fly demo v150 hosted smoke passing | `c04a94a` |
| 2026-05-22 | P1 | Agent server context action hydration | Done; assistant action proposals now show read-only server/local context proof, visible area counts, review signals, matched module summary, and context confirmation checklist while preserving review-first safety and field-user blocking | `54a5cbb` |
| 2026-05-21 | P1 | Agent Context API client integration | Done; Apex Assistant can now sync the authenticated read-only server agent context, use it for workflow-summary prompts when available, and fall back to local visible state without creating or changing records | This commit |
| 2026-05-21 | P1 | Agent Context API v1 | Done; authenticated office users now have a compact read-only `/api/agent/context` payload derived from existing tenant/package/role-scoped bootstrap data, while Basic packages and field roles are denied and no audit/write side effects occur | This commit |
| 2026-05-21 | P1 | Agent Context API Planning v1 | Done; Phase 1 plan defines a future read-only server Agent Context API using existing auth, package, tenant, and visible-record gates, with payload minimization and no-mutation rules before implementation | This commit |
| 2026-05-21 | P1 | Agent Brief Audit Record v1 | Done; generated daily operations briefs are now first-class review packets in the existing manual audit-record path, with redacted audit metadata and no workflow mutation | This commit |
| 2026-05-21 | P1 | Agent Daily Ops Brief v1 | Done; Apex Assistant can generate a review-only daily operations brief with metrics, attention sections, next actions, and route buttons without saving, sending, approving, converting, scheduling, invoicing, assigning, or updating records | This commit |
| 2026-05-21 | P1 | Agent Workflow Draft Prep v1 | Done; Apex Assistant can prepare a review-only draft packet from the top next-best action using the existing Agent Action Proposal UI, with no saved records, sends, approvals, conversions, scheduling, invoices, package changes, or field updates | This commit |
| 2026-05-21 | P1 | Agent Next Best Action Queue v1 | Done; Apex Assistant now turns visible workflow context into ranked, review-first next action suggestions with route buttons and explicit blocked automation boundaries | This commit |
| 2026-05-21 | P1 | Agent Workflow Context v1 | Done; Apex Assistant now has a permission-scoped read-only workflow context summary across visible leads, estimates, jobs, proof, customers, employees, safety, change orders, and imports with no mutation or customer-contact behavior | This commit |
| 2026-05-21 | P3 | Customer related records card extraction | Done; customer linked leads/jobs/activity/contact-history card wrapper now lives in the customer route component module without changing record selection, rendering callbacks, permissions, or data flow | This commit |
| 2026-05-21 | P3 | Customer intake card component extraction | Done; customer create/read-only intake card now lives in the customer route component module without changing customer creation permissions, form state, or API behavior | This commit |
| 2026-05-21 | P3 | Customer table component extraction | Done; Customers page now uses the customer route component module for the polished records table without changing customer state, permissions, filters, forms, or API behavior | This commit |
| 2026-05-21 | P3 | Support command workbench component extraction | Done; Support command workbench now lives in a route component module and the existing Support page calls it without changing state, permissions, support copy, or API behavior | This commit |
| 2026-05-21 | P1 | Agent proposal send execution gate safety plan | Done; Phase 1 plan defines the future human-send execution boundary, required server gates, negative tests, and explicit NO-GO lines before any outbound customer contact | This commit |
| 2026-05-21 | P1 | Agent proposal send review framework | Done; assistant can prepare an audit-only estimate send review packet for human send, with no email, bid submission, sent status, contact history, invoice, job conversion, or field update | This commit |
| 2026-05-21 | P1 | Agent lead-to-estimate draft creation | Done; server action and assistant UI create a real Draft estimate from a lead only after a human approval click, with no send/contact/job conversion and field-user blocking | This commit |
| 2026-05-21 | P1 | Agent approval-for-draft audit-only endpoint | Done; existing proposal audit endpoint now records `approved_for_draft` only after a prior generated proposal exists, with domain permission gates, field-user blocking, and tests proving no leads, estimates, jobs, reports, uploads, or contact history are created | This commit |
| 2026-05-21 | P1 | Agent approval-for-draft safety plan | Done; Phase 1 plan defines the role/package/domain-permission gates, non-mutating approval audit boundary, tests, demo verification, and NO-GO lines before any draft approval implementation | This commit |
| 2026-05-21 | P1 | Agent proposal manual audit record | Done; Apex Assistant proposal packets now have an explicit manual audit-record button that writes through the existing redacted append-only endpoint without approving, drafting, sending, converting, or changing workflow records | This commit |
| 2026-05-21 | P1 | Agent proposal audit UI history surface | Done; Apex Assistant now shows a read-only proposal audit history for audit-permitted office users with no approval or mutation controls | This commit |
| 2026-05-21 | P1 | Agent proposal audit API Phase 1 | Done; append-only `/api/agent-action-proposals/audit` records redacted review-first proposal audit events using existing `audit_events` with package/role gates and field-user denial | This commit |
| 2026-05-21 | P1 | Agent proposal audit utility hardening | Done; shared utilities now redact secret-like proposal audit text and normalize review-first audit event metadata without server writes | This commit |
| 2026-05-21 | P1 | Agent proposal server-side audit log planning | Done; proposal audit plan defines append-only event types, redaction boundaries, permission gates, API phases, and approval stops before any persistence work | This commit |
| 2026-05-21 | P1 | Agent Action Proposal draft-prep slice | Done; review packets now show draft-only prep context for estimate drafts, packets, handoffs, lead follow-up, and support handoff without saving or sending | This commit |
| 2026-05-21 | P1 | Agent Action Proposal framework slice | Done; Apex Assistant responses now render review-first action proposal packets with approval-required checklist and blocked-action boundaries | This commit |
| 2026-05-21 | P1 | Fencing pilot walkthrough packet | Done; first-user packet and readiness report created | `fa7f86d` |
| 2026-05-21 | P2 | Fencing walkthrough preflight | Done; one-command demo health, route, browser, field-role, and role-test preflight | `2c3759e` |
| 2026-05-21 | P4 | Fencing preflight source-of-truth sync | Done; tracker and launch readiness updated | `1980a9e` |
| 2026-05-21 | P1 | Fencing pilot intake gate | Done; fail-closed pre-login setup gate with risky-promise and secret-like text rejection | `467c173` |
| 2026-05-21 | P4 | Autonomous build queue | Done; priority queue and stop gates created | `92f09ff` |
| 2026-05-21 | P1 | Day 3 / Day 10 fencing pilot check-in packet | Done; read-only check-in generator, scorecard, safety boundaries, and tests | `2886d93` |
| 2026-05-21 | P1 | Fencing customer pilot setup approval packet | Done; fail-closed approval packet before outside login or customer pilot resource setup | `f2f4074` |
| 2026-05-21 | P2 | Demo auth smoke preflight docs sync | Done; local/GitHub/Vercel/Fly-demo/production auth-smoke boundaries documented | `6e66a1c` |
| 2026-05-21 | P2 | CI launch-gate summary refresh | Done; summary now shows GO/NO-GO counts, blocker counts, first blockers, and warning counts | `f156548` |
| 2026-05-21 | P3 | Fencing demo screenshot manifest refresh | Done; Fly demo preflight, admin desktop/tablet audits, employee phone audit, hosted smoke, and roles passed | `bf56464` |
| 2026-05-21 | P4 | First-pilot support severity quick card | Done; P0-P3 pilot triage card added without SLA/legal/security/pricing claims | `f91e3e2` |
| 2026-05-21 | P1 | Customer pilot config approval dry-run | Done; in-memory customer pilot config verification and approval-only setup plan added | `7b91e90` |
| 2026-05-21 | P2 | Fly demo auth-smoke readiness check | Done; Fly demo readiness and skip-auth smoke passed; local auth smoke blocked by missing local `APEX_SMOKE_PASSWORD` | `f807df7` |
| 2026-05-21 | P4 | Fencing pilot artifact index | Done; pilot gates, docs, scripts, evidence, and hard stops mapped in one source | `e46c2af` |
| 2026-05-21 | P2 | GitHub Actions demo smoke evidence pointer refresh | Done; latest scheduled demo smoke runs recorded and artifact index linked | `19d080a` |
| 2026-05-21 | P3 | Pilot route audit P3 backlog extraction | Done; desktop `/leads` long-text screenshot finding captured as scoped non-blocking backlog | `56c999a` |
| 2026-05-21 | P3 | Desktop Leads long-text row polish | Done; desktop `/leads` long fencing copy wraps intentionally and employee phone redirect still passes | `d438f94` |
| 2026-05-21 | P2 | Leads verifier reliability | Done; `verify:leads` now runs focused server/shared/frontend groups instead of one aggregate command that stalled locally | `c4f2083` |
| 2026-05-21 | P2 | Fencing walkthrough preflight refresh | Done; latest Fly demo preflight, hosted skip-auth smoke, admin desktop/tablet audits, employee phone audits, and roles passed | `cf60e07` |
| 2026-05-21 | P2 | Full pilot readiness gate refresh | Done; local `verify:pilot-readiness` passed docs, pilot gates, roles, backup, restore, and build | `162a35f` |
| 2026-05-21 | P2 | Demo smoke automation verification | Done; local `verify:demo` passed Fly demo smoke planner, cleanup, package setter, visual audit, and production-auth workflow tests | `b38bdaf` |
| 2026-05-21 | P1 | Estimate Studio proposal branding strip | Done; selected `/estimates` workbench now shows company identity, contact, service area, license/insurance, date, and terms from existing settings | `7d0bd05` |
| 2026-05-21 | P2 | Fly demo Estimate Studio branding deploy | Done; backup-first demo deploy to `concrete-ops-demo` v129 plus hosted smoke and deployed `/estimates` audits passed | `878dc7e` |
| 2026-05-21 | P1 | Estimate PDF proposal header polish | Done; customer-facing PDF intro now shows prepared-for, project, status, proposal date, and valid-through fields while internal notes stay hidden | `dac22c7` |
| 2026-05-21 | P2 | Fly demo Estimate PDF header deploy | Done; backup-first demo deploy to `concrete-ops-demo` v130 plus `/api/ready` and hosted skip-auth smoke passed | `405ff68` |
| 2026-05-21 | P4 | Guided walkthrough script cleanup | Done; first-user walkthrough script is ASCII-clean and now points to the onboarding, feedback, setup-approval, and artifact-index handoff docs | `8ae1b14` |
| 2026-05-21 | P2 | Pilot readiness evidence refresh after v130 | Done; current readiness report and artifact index now reference v130 demo deploy, hosted skip-auth smoke, and latest full `verify:pilot-readiness` pass | `f443546` |
| 2026-05-21 | P2 | Launch gate snapshot refresh | Done; artifact index records current guided-demo GO plus customer-pilot, production-auth, monitoring, and paid-launch NO-GO blockers | `9dd9b3f` |
| 2026-05-21 | P2 | Demo/pilot monitoring baseline decision | Done; GitHub Actions plus GitHub issues documented as the current demo/pilot monitoring baseline with production log drains and paid providers still blocked | `55ba741` |
| 2026-05-21 | P3 | Full visual route sweep refresh | Done; local build, role tests, and full visual route audit passed across admin desktop/phone/tablet plus foreman/employee phone/tablet with zero final failures | `b571a1c` |
| 2026-05-21 | P4 | Master build tracker sync | Done; master phase tracker now reflects v130 demo evidence, monitoring baseline decision, latest pilot readiness, and full visual route sweep | `b0ec339` |
| 2026-05-21 | P2 | Founder demo readiness refresh | Done; founder-demo readiness and manual-only brief passed with production/demo readiness endpoints healthy and no outreach or data mutation | `1dbee17` |
| 2026-05-21 | P2 | Demo smoke refresh | Done; local demo verifier, Fly demo status/checks, `/api/ready`, and hosted skip-auth route smoke passed on v130 | `f24852b` |
| 2026-05-21 | P2 | Opportunity Scout safety verification refresh | Done; 69 local tests passed for review-first intake, redaction, dedupe, approval gates, package/role blocking, and no auto-contact/bid/credential behavior | `408a53e` |
| 2026-05-21 | P2 | Core workflow verification refresh | Done; Leads, Jobs, Daily Reports, Uploads, and Estimates verification passed after rerunning Leads alone to clear a parallel test-server readiness timeout | `852e971` |
| 2026-05-21 | P2 | Field/support verification refresh | Done; Time, Safety, Tool Checklist, Delivery Tickets, Pre/Post-Pour, Change Orders, Customers, and Users verification passed after rerunning Tool Checklist alone | `edfacbb` |
| 2026-05-21 | P2 | SaaS safety verification refresh | Done; Packages, Entitlements, Auth, Exports, Backup, Restore, Server, and Build verification passed | `e988548` |
| 2026-05-21 | P2 | Pilot readiness gate refresh after safety baseline | Done; full `verify:pilot-readiness` passed after latest SaaS safety, workflow, and field/support verification refreshes | `da6ca3d` |
| 2026-05-21 | P2 | Launch gate snapshot refresh after readiness baseline | Done; guided demo and demo/pilot monitoring baseline are GO, while customer pilot, production auth smoke, and wider paid launch remain NO-GO | `dda56d4` |
| 2026-05-21 | P2 | Fencing walkthrough preflight refresh after readiness baseline | Done; Fly demo ready, hosted skip-auth smoke, admin desktop/tablet audits, employee phone audit, and roles passed | `181dd00` |
| 2026-05-21 | P2 | GitHub CI evidence refresh after autonomous pushes | Done; latest CI on `5ad848c` passed whitespace, auth/signup, tenant/role/package, public/demo, server/backup/export, and build checks | `e83f48e` |
| 2026-05-21 | P2 | Latest GitHub CI closeout | Done; latest CI on `028abc3` passed after the final queue/evidence push | `abe535a` |
| 2026-05-21 | P3 | App shell component architecture extraction | Done; shared Icon, WorkQueueCard, AssistantRail, CommandPageFrame, and EstimateStudioShell moved out of the App.jsx monolith with build, role, estimate, and browser audits passing | `ef035ce` |
| 2026-05-21 | P3 | Shared UI primitive architecture extraction | Done; Button, Badge, StatusBadge, Card, PageHeader, SectionHeader, StatCard, and ProposalTotalCard moved into the shared shell module with build, role, route, design-token, and browser audits passing | `85473d6` |
| 2026-05-21 | P3 | Estimate route component architecture extraction | Done; estimate display helpers, polished estimate table, and job handoff readiness card moved out of `App.jsx` with build, role, estimate, route, and browser audits passing | `1eeefee` |
| 2026-05-21 | P3 | Estimate command rail architecture extraction | Done; the branded proposal/action/tools rail moved into the estimate route component module with build, role, estimate, route, and browser audits passing | `d92a5bd` |
| 2026-05-21 | P3 | Shared brand utility architecture extraction | Done; Apex brand constants, visible-name normalization, and logo-initial helpers moved into `src/brand-utils.js` with tests, build, role, estimate, route, and browser audits passing | `ff3f0dd` |
| 2026-05-21 | P3 | Shared form primitive architecture extraction | Done; FilterBar, SelectField, and StateCard moved into the shared shell module with build, role, estimate, route, and browser audits passing | `4ddda8d` |
| 2026-05-21 | P3 | Estimate proposal workbench architecture extraction | Done; proposal workbench and its private list/takeoff helpers moved into the estimate route component module with build, role, estimate, route, and browser audits passing | `3c21729` |
| 2026-05-21 | P3 | Shared input primitive architecture extraction | Done; InputField and TextAreaField moved into the shared shell module with build, role, estimate, route, and browser audits passing | `a0ec218` |
| 2026-05-21 | P3 | Estimate option editor architecture extraction | Done; option editor and option status constants moved into the estimate route component module with build, role, estimate, route, and browser audits passing | `c58159c` |
| 2026-05-21 | P3 | Estimate starter panel architecture extraction | Done; estimate starter panel moved into the estimate route component module with build, role, estimate, route, and browser audits passing | `88997df` |
| 2026-05-21 | P3 | Estimate backup editor architecture extraction | Done; estimate backup/SOV/takeoff/reference editor moved into the estimate route component module with build, role, estimate, route, and browser audits passing | `bc99525` |
| 2026-05-21 | P3 | Estimate GC packet editor architecture extraction | Done; GC Packet Lite editor moved into the estimate route component module with build, role, estimate, route, and browser audits passing | `1d480ec` |
| 2026-05-21 | P3 | Estimate proposal sections editor architecture extraction | Done; proposal sections and option-section composition moved into the estimate route component module with build, role, estimate, route, and browser audits passing | `4f450ba` |
| 2026-05-21 | P3 | Estimate rough notes helper architecture extraction | Done; rough-notes UI moved into the estimate route component module and shared rough-notes helpers moved into a tested utility module with build, role, estimate, route, and browser audits passing | `2f726e8` |
| 2026-05-21 | P3 | Estimate sent history card architecture extraction | Done; sent proposal history card moved into the estimate route component module with build, role, estimate, route, and browser audits passing | `d9254d2` |
| 2026-05-21 | P3 | Estimate packet settings panel architecture extraction | Done; packet settings panel moved into the estimate route component module with build, role, estimate, route, and browser audits passing | `f801eeb` |
| 2026-05-21 | P3 | Customer filter header architecture extraction | Done; customer filter header moved into a customer route component module with build, role, customer, route, and browser audits passing | `b63367b` |
| 2026-05-21 | P3 | Leads table architecture extraction | Done; lead table, score/missing-info badges, and lead display helpers moved into a lead route component module with build, role, lead, route, and browser audits passing | `a1a1108` |
| 2026-05-21 | P3 | Lead readiness card architecture extraction | Done; pilot workflow readiness card moved into the lead route component module with build, role, lead, route, and browser audits passing | `483b464` |

## Active Queue

| Priority | Task | Status | Why It Matters | Safe Scope | Verification | Stop / Approval Gate |
| --- | --- | --- | --- | --- | --- | --- |
| P1 | Agent proposal send execution gate implementation | Blocked | Send review packets can now be prepared without outbound contact, but execution would contact a customer and mark records sent | Requires explicit approval for the customer-contact boundary, safe test recipient strategy, idempotency plan, audit events, and backup-first demo smoke | estimate/proposal tests, roles, email-provider tests, browser QA, hosted demo smoke with approved test recipient | Stop before any autonomous outbound email/text/bid submission or production customer contact |
| P3 | Continue route module extraction | Ready | `App.jsx` is still a monolith; shared primitives are now separated enough to move feature route chunks more safely | Extract one presentational route chunk with existing props; no auth, package, data, or action changes | build, targeted verifier, route tests, browser audit | Stop if state/action wiring or permission gates must move |
| P2 | Local demo auth smoke rerun when secret is available | Blocked | Would prove login/bootstrap from the local operator shell | Run only; no docs unless evidence changes | hosted auth smoke | Blocked until `APEX_SMOKE_PASSWORD` is present locally |

## Blocked / Needs Human Input

| Priority | Task | Blocker |
| --- | --- | --- |
| P1 | Real fencing pilot intake run | Needs actual company, owner/admin, field user, first record, support channel, and acknowledgements. Do not commit real emails. |
| P1 | Outside login creation | Requires completed intake gate, support owner confirmation, approved setup path, and explicit approval. |
| P1 | Customer-specific pilot app/workspace | Requires approved customer slug/config, backup/rollback owner, terms/data boundary, and explicit Fly customer-pilot approval. |
| P0 | Production auth smoke | Requires approved synthetic production smoke users, production-safety approval, and configured production smoke secret. |
| P0 | Production deploy | Requires explicit backup-first production release approval. |

## Next Recommended Task

Next safe build action is Continue route module extraction or another low-risk Sunday pilot polish item, preserving all permissions, package gates, data flow, and browser behavior. Human-input tasks remain blocked until real pilot details, outbound-contact approval, or smoke secrets are provided.
