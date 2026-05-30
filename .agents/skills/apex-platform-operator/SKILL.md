---
name: apex-platform-operator
description: Use for every Apex HQ repo task: planning, audits, frontend/backend implementation, permissions, company scope, integrations, AI Office, PWA/mobile, verification, commit, push, deploy, health checks, and release safety. Use Apex HQ as the product name; treat legacy product names as technical identifiers only unless a dedicated infrastructure rename is requested.
---

# Apex HQ Platform Operator

Use this skill as the always-on Apex HQ coordinator. It keeps work safe, phased, role-protected, and release-ready.

## Product Identity

- User-facing product name: Apex HQ.
- Do not add legacy product branding to visible UI, docs meant for users, page titles, PWA metadata, emails, or reports.
- Technical identifiers may still exist until a dedicated infrastructure rename: repo, package, Fly app, env vars, storage/session keys, import package types, and tests.
- Current repo target: `jberlanga748-a11y/concrete-ops-2`.
- Current local folder: `C:\Users\jberl\Documents\New project`.
- `C:\Users\jberl\Documents\Codex\concrete-ops-2-clean` is a stale archive/reference worktree only.
- Current Fly app: `concrete-ops-2`.
- Current live app: `https://app.apexhq.online/`.
- Health check: `https://app.apexhq.online/api/ready`.

## Default Operating Mode

- Work one phase at a time unless John explicitly says to continue through phases.
- Inspect the repo before changing code.
- Preserve real data, handlers, API calls, routing, state, permissions, and workflows.
- Do not commit, push, or deploy unless explicitly instructed.
- Never expose secrets or add frontend `VITE_` secrets.
- Do not manually alter production data, Fly volumes, env vars, or schema unless the phase explicitly requires it.
- Stop if repo, branch, remote, working tree, permissions, secrets, or production safety look wrong.

## Field Role Protection

Field users must never gain access to:

- leads
- estimates
- pricing
- profit or margin
- internal notes
- company setup
- admin settings
- AI office tools
- billing
- other company data

When touching routes, APIs, navigation, bootstrap payloads, or UI visibility, verify backend permission gates and sanitized payloads. Do not rely only on hidden buttons.

## Company Scope Rules

- Company users should only see their own company/workspace records.
- Operator/admin company switching must remain restricted to allowed operator users.
- Scope leads, lead sources, customers, estimates, jobs, reports, uploads, delivery tickets, users, roles, settings, AI drafts, contact history, and website intake records.
- Treat multi-company hardening as high risk; run company scope and role tests.

## UI Work

- Also use `apex-ui-designer` for UI tasks.
- Preserve the established Apex HQ style: dark charcoal sidebar, orange accents, white/light-gray workspace, rounded cards, command boards, readable dense tables, right rails, and mobile stacked cards.
- For UI polish: inspect current page, inspect polished references, duplicate component first when practical, switch render after verification, capture screenshots when tools are available.

## Backend And API Work

- Keep changes narrow and backward-compatible.
- Add focused tests for new API behavior.
- Prefer existing store/helpers/permission utilities over new patterns.
- Do not change database schema unless the phase requires it; if needed, migrate safely and preserve existing data.
- Keep print/PDF/send behavior unchanged unless the phase explicitly targets it.

## Integrations

- Website forms must call Apex HQ through a trusted backend/serverless route, never with public frontend tokens.
- Import tokens and provider keys stay server-side only.
- Email/SMS phases require consent, opt-out/STOP handling where applicable, safe failure behavior, and no auto-send without approval.
- AI may draft, summarize, score, and recommend; it must not send customer messages, promise price/schedule, approve work, or change risky data without human approval.

## PWA And Mobile

- Keep manifest, icons, splash, and app launch behavior branded Apex HQ.
- Offline/editing/push work is separate from installable foundation; protect data integrity before caching mutable records.
- Mobile changes must preserve bottom nav safety, thumb-friendly primary actions, no overlap, and field-role restrictions.

## Verification Defaults

Run focused checks for the affected module, then the safest applicable baseline:

```powershell
npm.cmd run build
npm.cmd run verify:roles
npm.cmd run verify:server
npm.cmd run verify:backup
git diff --check
```

Common focused checks:

- Leads/integrations/contact history/notifications: `npm.cmd run verify:leads`
- Users/company setup/scope: `npm.cmd run verify:users`
- Jobs/startup/command center: `npm.cmd run verify:jobs`
- Estimates/print/email: `npm.cmd run verify:estimates` and `npm.cmd run verify:print-packets`
- Field modules: `verify:time`, `verify:daily-reports`, `verify:uploads`, `verify:delivery-tickets`, `verify:pre-pour`, `verify:post-pour`, `verify:safety`, `verify:tool-checklist`, `verify:calculator`
- Public intake: `npm.cmd run verify:public-request`

## Commit, Push, Deploy

Only when John asks:

1. Confirm folder, branch, remote, and status.
2. Confirm only intended files changed.
3. Stage explicit file paths only; never use broad staging.
4. Commit with the requested or concise phase message.
5. Push to the intended branch.
6. Deploy to Fly only after verification passes.
7. Health check `/api/ready` and report status/database.

## Reporting

Reports should say:

- what changed
- files changed
- verification run and results
- screenshots, if UI
- commit/push/deploy/health result, if applicable
- what did not change: backend, schema, permissions, secrets, production data, print/PDF/send, field visibility, as relevant
