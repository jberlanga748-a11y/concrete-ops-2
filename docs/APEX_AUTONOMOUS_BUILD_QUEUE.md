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

## Active Queue

| Priority | Task | Status | Why It Matters | Safe Scope | Verification | Stop / Approval Gate |
| --- | --- | --- | --- | --- | --- | --- |
| P1 | Customer pilot config approval dry-run for the fencing candidate | Ready | Prepares the next approval-only step before any customer-specific app or volume is created | Plan/docs/script only; no Fly resources, no secrets, no customer data | pilot config checks, docs check | Stop before creating Fly app/volume or setting secrets |
| P2 | Fly demo auth-smoke readiness check | Ready | Confirms whether demo auth smoke can run from the current environment without printing secrets | Read-only presence check and skip-auth fallback only | hosted smoke skip-auth, docs check | Stop before reading or setting secret values |

## Blocked / Needs Human Input

| Priority | Task | Blocker |
| --- | --- | --- |
| P1 | Real fencing pilot intake run | Needs actual company, owner/admin, field user, first record, support channel, and acknowledgements. Do not commit real emails. |
| P1 | Outside login creation | Requires completed intake gate, support owner confirmation, approved setup path, and explicit approval. |
| P1 | Customer-specific pilot app/workspace | Requires approved customer slug/config, backup/rollback owner, terms/data boundary, and explicit Fly customer-pilot approval. |
| P0 | Production auth smoke | Requires approved synthetic production smoke users, production-safety approval, and configured production smoke secret. |
| P0 | Production deploy | Requires explicit backup-first production release approval. |

## Next Recommended Task

Prepare the customer pilot config approval dry-run next, but stop before any Fly app, volume, secret, outside login, or customer data mutation.
