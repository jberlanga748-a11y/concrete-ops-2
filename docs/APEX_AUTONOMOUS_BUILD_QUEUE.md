# Apex HQ Autonomous Build Queue

Last updated: 2026-05-21

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
| 2026-05-21 | P3 | Estimate route component architecture extraction | Done; estimate display helpers, polished estimate table, and job handoff readiness card moved out of `App.jsx` with build, role, estimate, route, and browser audits passing | pending |

## Active Queue

| Priority | Task | Status | Why It Matters | Safe Scope | Verification | Stop / Approval Gate |
| --- | --- | --- | --- | --- | --- | --- |
| P3 | Continue estimate route module extraction | Ready | `App.jsx` is still a monolith; the next safe architecture gain is moving one more presentational estimate panel without route state or business logic | Extract only presentational components with existing props; no auth, package, data, or action changes | build, estimate verification, route tests, browser `/estimates` audit | Stop if state/action wiring or permission gates must move |
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

Next safe build action is continuing the `/estimates` route module extraction by moving another presentational panel out of `App.jsx` without changing route state, permissions, package gates, data flow, or business logic. Human-input tasks remain blocked until real pilot details or smoke secrets are provided.
