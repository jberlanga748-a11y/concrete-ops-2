# Apex HQ Agent System

This file is the repo-level operating guide for Codex and agent work on Apex HQ.

## Product Identity

Apex HQ is a contractor one-stop growth and operations platform. It helps contractors get more work, win more work, run work better, reduce risk, prove the work, and get paid faster.

Use **Apex HQ** for all user-facing product language. Legacy technical names may remain only as repo, package, deployment, env, or test identifiers until a dedicated infrastructure rename is planned.

## Source Of Truth Order

Read these before starting major work:

1. `README.md` - current app/deploy/runtime overview.
2. `docs/APEX_HQ_BUILD_STATUS_AND_PHASES.md` - current done/next/do-not-rebuild source of truth.
3. `APEX_HQ_MASTER_ROADMAP.md` - detailed technical/product backlog.
4. `APEX_HQ_MASTER_CHECKLIST.md` - pilot status and day-one checklist.
5. `.agents/APEX_WORKSTREAMS.md` - existing workstream split.
6. `.agents/APEX_STATUS.md` - legacy handoff board; may be stale, verify against the build-status file.
7. `docs/APEX_HQ_ROADMAP.md` - organized master coordinator roadmap.
8. `docs/AGENT_OPERATING_MODEL.md` - agent roles and rules.
9. Codex skills under `C:\Users\jberl\.codex\skills`, especially `apex-finished-vision`.

## Master Coordinator Rule

The Master Coordinator Agent owns phase control. It must:

- preserve existing direction
- prevent random feature building
- keep work one phase at a time
- keep a decision log
- route work to the right agent type
- require validation and rollback notes for each phase
- stop before risky work that needs approval
- check `docs/APEX_HQ_BUILD_STATUS_AND_PHASES.md` before starting any phase so completed systems are not rebuilt

## Agent Roles

Canonical repo skills live under `.agents/skills/`.

Core build agents:

- Product Architect Agent
- UI/UX Agent
- Feature Builder Agent
- Permission/Safety Agent
- QA Agent
- Release Agent

Business/growth agents:

- Marketing Master Coordinator
- Market Research Agent
- Offer / Positioning Agent
- Outreach / Sales Agent
- Portfolio / Proposal Agent
- Spreadsheet / Risk Agent
- Customer Success / Launch Agent

Legacy support skills that may still be referenced by older prompts:

- `apex-platform-operator`
- `apex-overseer`
- `apex-elite-app-builder`

Use the canonical skills for new work. Use legacy support skills only when an older prompt explicitly asks for them or when checking past UI/release workflow notes.

## Non-Negotiable Rules

- Do not rebuild working systems.
- Do not randomly redesign the app.
- Do not expose secrets or add frontend secrets.
- Do not touch production data.
- Do not deploy without release approval.
- Do not send email/SMS automatically.
- Do not publish ads or spend money automatically.
- Do not add hidden GPS tracking.
- Do not loosen permissions.
- Do not mix unrelated backend, frontend, docs, and release work in one phase.

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
- other company data

## Approval Required Before

Ask for approval before:

- schema changes
- auth/session changes
- billing/payment changes
- GPS/location tracking changes
- SMS/email automation
- production data changes
- deploys
- major refactors
- deleting files
- ad publishing or spend

## Phase Report Requirements

Every phase report must include:

- goal
- affected files
- risk level
- validation plan/results
- permissions impact
- mobile impact
- field-user impact
- rollback plan
- next recommended phase
