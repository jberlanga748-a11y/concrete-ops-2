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

## Active Queue

| Priority | Task | Status | Why It Matters | Safe Scope | Verification | Stop / Approval Gate |
| --- | --- | --- | --- | --- | --- | --- |
| P2 | Demo auth smoke preflight docs sync | Ready | Makes the difference between local missing `APEX_SMOKE_PASSWORD` and GitHub configured auth smoke clearer | Docs/scripts only; no secrets | docs check, hosted smoke skip-auth | Stop before reading/setting secret values |
| P2 | CI launch-gate summary refresh | Ready | Keeps GitHub evidence easy to read for pilot/demo gates | GitHub workflow/docs helper only | workflow/script tests | Stop before changing production auth smoke behavior |
| P3 | Fencing demo screenshot manifest refresh | Ready | Captures current screenshots after pilot scripts so walkthrough evidence is up to date | Browser evidence only; no app changes | visual audit command | Stop if UI failure suggests app code change |
| P4 | First-pilot support severity quick card | Ready | Gives support triage a one-page reference during the friendly pilot | Docs only | docs check | Stop before making SLA/legal claims |

## Blocked / Needs Human Input

| Priority | Task | Blocker |
| --- | --- | --- |
| P1 | Real fencing pilot intake run | Needs actual company, owner/admin, field user, first record, support channel, and acknowledgements. Do not commit real emails. |
| P1 | Outside login creation | Requires completed intake gate, support owner confirmation, approved setup path, and explicit approval. |
| P1 | Customer-specific pilot app/workspace | Requires approved customer slug/config, backup/rollback owner, terms/data boundary, and explicit Fly customer-pilot approval. |
| P0 | Production auth smoke | Requires approved synthetic production smoke users, production-safety approval, and configured production smoke secret. |
| P0 | Production deploy | Requires explicit backup-first production release approval. |

## Next Recommended Task

Sync the demo auth smoke preflight docs so local, GitHub, Vercel preview, Fly demo, and production-safe auth smoke expectations are clear.
