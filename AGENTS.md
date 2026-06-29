# Apex HQ Agent System

This file is the repo-level operating guide for Codex and agent work on Apex HQ.

## Product Identity

Apex HQ is a contractor one-stop growth and operations platform. It helps contractors get more work, win more work, run work better, reduce risk, prove the work, and get paid faster.

Use **Apex HQ** for all user-facing product language. Legacy technical names may remain only as repo, package, deployment, env, or test identifiers until a dedicated infrastructure rename is planned.

## Source Of Truth Order

Read these before starting major work:

1. `AGENTS.md` - mandatory repo operating contract for every Apex HQ chat.
2. `.agents/skills/apex-codex-operator/SKILL.md` - Codex behavior contract for how to work with John on this project.
3. `docs/APEX_HQ_CANONICAL_SOURCE_OF_TRUTH.md` - first-read workspace, transition, archive, and no-loop file.
4. `README.md` - current app/deploy/runtime overview.
5. `docs/APEX_HQ_LIVING_FINISH_PLAN.md` - current user-request memory, deploy log, and phase memory.
6. `docs/APEX_HQ_TOOL_COMPLETION_BLUEPRINT.md` - active tool-by-tool finish plan.
7. `docs/APEX_HQ_BUILD_STATUS_AND_PHASES.md` - historical done/next/do-not-rebuild inventory; verify against the living plan.
8. `APEX_HQ_MASTER_ROADMAP.md` - detailed technical/product backlog.
9. `APEX_HQ_MASTER_CHECKLIST.md` - historical pilot status and day-one checklist.
10. `.agents/APEX_WORKSTREAMS.md` - existing workstream split.
11. `.agents/APEX_STATUS.md` - legacy handoff board; stale until refreshed against the canonical file.
12. `docs/APEX_HQ_ROADMAP.md` - organized master coordinator roadmap.
13. `docs/AGENT_OPERATING_MODEL.md` - agent roles and rules.
14. Codex skills under `C:\Users\jberl\.codex\skills`, especially `apex-finished-vision`.

## Codex Working Contract

Every Apex HQ chat must start from this contract without John having to restate it. Apex HQ is one active project in `C:\Users\jberl\Documents\New project`; archive/reference folders are not active build targets unless explicitly named.

Codex must:

- read this `AGENTS.md` before acting in the repo
- use `.agents/skills/apex-codex-operator` first for work style, then route to the Apex skill that matches the task
- treat Apex skills as working roles, not decorative labels
- answer direct questions directly before taking action
- do no file, browser, test, git, deploy, or production work when John only asks a question
- act decisively when John clearly asks for work: inspect the real app/files, implement the needed fix, validate it, and report
- stay on the requested workflow, phase, or page; do not broaden into unrelated checklists
- preserve frozen phases and avoid rebuilding working systems
- inspect the real UI visually when asked about UI/UX, not only import tests or text assertions
- inspect generated PDFs visually when asked about PDF quality, not only PDF text tests
- distinguish clearly between what was actually verified and what was not
- keep company separation, auth/account safety, field-private data boundaries, and no accidental live irreversible external actions
- remove unnecessary friction only inside those baseline protections
- never touch another active phase/thread's files unless John explicitly asks
- stop and ask only when the next step is impossible or risky without approval

Interpret John's wording this way:

- "Can you..." or "why..." is a question unless it clearly asks for action.
- "Go through", "fix", "build", "audit", "click around", "make sure", or "do what needs to be done" is action.
- "Next" means continue the current documented Apex HQ phase from the canonical/living plan using the proper Apex skills.
- If John says a previous response missed the point, acknowledge it, correct course, and do the exact requested thing without defending the old path.

When acting, Codex should follow this execution loop:

1. Load the required repo instructions and relevant Apex skills.
2. Inspect the current active code/app state first.
3. Make the smallest complete change that solves the real issue.
4. Validate with focused tests, role checks, build, browser/mobile/PDF visual checks as relevant.
5. Report affected files, results, risks, permissions impact, rollback path, and next recommended phase when phase work was requested.

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
